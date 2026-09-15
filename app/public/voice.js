export class Voice{
 constructor(send,getId,toast){this.send=send;this.getId=getId;this.toast=toast;this.peers=new Map();this.stream=null;this.master=1;this.muted=false;this.ptt=false;this.held=false;this.config={iceServers:[{urls:'stun:stun.l.google.com:19302'}]};this.onChange=()=>{};this.activity=false;this.context=null;this.lastActivity=false;}
 async enable(){
 try{if(this.context?.state==='suspended')await this.context.resume();
 if(this.stream){this.stream.getTracks().forEach(t=>t.stop());this.stream=null;this.activity=false;for(const p of this.peers.values())if(p.sender)await p.sender.replaceTrack(null);this.announce();return false;}
 this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
 this.context=this.context||new AudioContext();await this.context.resume();const source=this.context.createMediaStreamSource(this.stream);this.analyser=this.context.createAnalyser();this.analyser.fftSize=256;source.connect(this.analyser);this.data=new Uint8Array(256);
 this.applyMute();for(const p of this.peers.values())if(p.sender)await p.sender.replaceTrack(this.stream.getAudioTracks()[0]);this.announce();return true;
 }catch(e){this.toast(e.name==='NotAllowedError'?'Microphone disabled':'Microphone unavailable');return false;}
 }
 applyMute(){const enabled=!this.muted&&(!this.ptt||this.held);this.stream?.getAudioTracks().forEach(t=>t.enabled=enabled);this.announce();}
 announce(){this.send({type:'voice',enabled:!!this.stream&&!this.muted&&(!this.ptt||this.held),speaking:this.activity});this.onChange();}
 ensure(id){
 if(this.peers.has(id))return this.peers.get(id);
 const pc=new RTCPeerConnection(this.config),audio=document.createElement('audio');audio.autoplay=true;audio.playsInline=true;document.body.append(audio);
 const trans=this.getId()<id?pc.addTransceiver('audio',{direction:'sendrecv'}):null,p={pc,audio,sender:trans?.sender||null,volume:1,muted:false,making:false,ignore:false,queue:[],status:'Connecting'};
 this.peers.set(id,p);
 if(this.stream&&p.sender)p.sender.replaceTrack(this.stream.getAudioTracks()[0]);
 pc.onicecandidate=e=>{if(e.candidate)this.send({type:'signal',to:id,data:{type:'candidate',candidate:e.candidate.toJSON()}});};
 pc.ontrack=e=>{audio.srcObject=new MediaStream([e.track]);audio.volume=this.master*p.volume;audio.play().catch(()=>{p.status='Click Mic to enable audio';this.onChange();});};
 pc.onnegotiationneeded=async()=>{if(this.getId()>id||p.making||pc.signalingState!=='stable')return;try{p.making=true;await pc.setLocalDescription();this.send({type:'signal',to:id,data:{type:pc.localDescription.type,sdp:pc.localDescription.sdp}});}catch{p.status='Voice unavailable';}finally{p.making=false;}};
 pc.onconnectionstatechange=()=>{p.status=pc.connectionState==='connected'?'Connected':pc.connectionState==='failed'?'Voice failed — race continues':pc.connectionState;this.onChange();if(pc.connectionState==='failed')pc.restartIce();};
 return p;
 }
 async signal(from,data){
 const p=this.ensure(from),pc=p.pc;
 try{if(data.type==='candidate'){if(!pc.remoteDescription)p.queue.push(data.candidate);else if(!p.ignore)await pc.addIceCandidate(data.candidate);return;}
 const offer=data.type==='offer',collision=offer&&(p.making||pc.signalingState!=='stable'),polite=this.getId()>from;
 p.ignore=!polite&&collision;if(p.ignore)return;
 await pc.setRemoteDescription({type:data.type,sdp:data.sdp});
 for(const c of p.queue)await pc.addIceCandidate(c);p.queue=[];
 if(offer){const trans=pc.getTransceivers().find(t=>t.receiver.track.kind==='audio');if(trans){trans.direction='sendrecv';p.sender=trans.sender;await p.sender.replaceTrack(this.stream?.getAudioTracks()[0]||null);}await pc.setLocalDescription();this.send({type:'signal',to:from,data:{type:pc.localDescription.type,sdp:pc.localDescription.sdp}});}
 }catch{p.status='Voice unavailable';this.onChange();}
 }
 sync(members){const id=this.getId();for(const m of members)if(m.id!==id&&m.online)this.ensure(m.id);for(const [other,p] of this.peers)if(!members.some(m=>m.id===other&&m.online)){p.pc.close();p.audio.remove();this.peers.delete(other);}}
 volumes(){for(const p of this.peers.values()){p.audio.volume=this.master*p.volume;p.audio.muted=p.muted;}}
 sample(){if(this.analyser&&this.stream){this.analyser.getByteTimeDomainData(this.data);let sum=0;for(const n of this.data)sum+=(n-128)**2;this.activity=Math.sqrt(sum/this.data.length)>5&&!this.muted&&(!this.ptt||this.held);}else this.activity=false;if(this.activity!==this.lastActivity){this.lastActivity=this.activity;this.announce();}}
 disconnectPeers(){for(const p of this.peers.values()){p.pc.close();p.audio.remove();}this.peers.clear();}
 close(){for(const p of this.peers.values()){p.pc.close();p.audio.remove();}this.peers.clear();this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.context?.close();this.context=null;this.onChange();}
}

