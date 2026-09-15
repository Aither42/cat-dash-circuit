import {cats,setSelected,setScreen,updateState,setReduced} from '/render.js';
import {Voice} from '/voice.js';
const $=id=>document.getElementById(id),portraitsData=cats.map((_,i)=>"/cat-"+i+".png"),keys={},screenIds=['menu','online','characters','lobby','hud','results','settings'];
let current='menu',previous='menu',characterReturn='menu',chosen=Number(localStorage.getItem('cat-choice')||0)%6,ws=null,room=null,you=null,state=null,session=null,intentional=false,reconnectAt=0,retry=0,toastTimer,lastEvent='',voiceSignature='',audioCtx=null,audioGain=null;
if(!Number.isInteger(chosen)||chosen<0)chosen=0;
function show(name){screenIds.forEach(id=>$(id).classList.toggle('hidden',id!==name));current=name;setScreen(name);$('voicebar').classList.toggle('hidden',!room);$('touch').classList.toggle('hidden',name!=='hud'||!matchMedia('(pointer:coarse)').matches);}
function toast(text){$('toast').textContent=text;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',4500);}
function send(m){if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(m));}
const voice=new Voice(send,()=>you,toast);
function selectCat(i){chosen=i;localStorage.setItem('cat-choice',i);setSelected(i);$('heroName').textContent=cats[i].name;$('heroPersonality').textContent=cats[i].personality;document.querySelectorAll('.catcard').forEach((b,j)=>b.classList.toggle('selected',i===j));}
cats.forEach((c,i)=>{const b=document.createElement('button');b.className='catcard';const im=document.createElement('img');im.src=portraitsData[i];im.alt=c.name;const n=document.createElement('b');n.textContent=c.name;const desc=document.createElement('small');desc.textContent=c.personality;b.append(im,n,desc);b.onclick=()=>selectCat(i);$('catCards').append(b);});
selectCat(chosen);$('name').value=localStorage.getItem('cat-name')||'';
$('play').onclick=()=>show('online');$('choose').onclick=()=>{characterReturn='menu';show('characters');};
$('nextCat').onclick=()=>selectCat((chosen+1)%6);
document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>show(b.dataset.back));
$('characterBack').onclick=()=>show(characterReturn);$('confirmCat').onclick=()=>{if(room)send({type:'select',cat:chosen});show(characterReturn);};
$('settingsOpen').onclick=()=>{previous=current;show('settings');};$('settingsBack').onclick=()=>show(previous);
$('lobbyCat').onclick=()=>{characterReturn='lobby';show('characters');};
$('code').oninput=()=>{$('code').value=$('code').value.replace(/\D/g,'').slice(0,2);};
$('create').onclick=()=>enter(true);$('join').onclick=()=>enter(false);
$('code').onkeydown=e=>{if(e.code==='Enter')enter(false);};
async function enter(create){
 const name=$('name').value.trim()||'Cat person';localStorage.setItem('cat-name',name);
 if(!create&&!/^\d{2}$/.test($('code').value)){toast('Enter exactly two digits');return;}
 $('create').disabled=$('join').disabled=true;
 try{const r=await fetch(create?'/api/create':'/api/join/'+$('code').value,{method:create?'POST':'GET'});const data=await r.json();if(!r.ok)throw Error(data.error||'Connection failed');
 room=data;session=null;you=null;state=null;intentional=false;reconnectAt=0;retry=0;connect(name);
 }catch(e){toast(e.message);}finally{$('create').disabled=$('join').disabled=false;}
}
function connect(name){
 const scheme=location.protocol==='https:'?'wss:':'ws:';
 ws=new WebSocket(scheme+'//'+location.host+'/ws/'+room.code+'?generation='+encodeURIComponent(room.generation));
 const socket=ws;
 const timeout=setTimeout(()=>{if(socket.readyState!==WebSocket.OPEN)socket.close();},8000);
 socket.onopen=()=>{clearTimeout(timeout);send({type:'join',name:name||localStorage.getItem('cat-name')||'Cat person',cat:chosen,token:session?.token});};
 socket.onmessage=e=>{if(socket!==ws)return;if(e.data==='__pong')return;let m;try{m=JSON.parse(e.data);}catch{return;}
 if(m.type==='welcome'){you=m.you;session={token:m.token};sessionStorage.setItem('cat-session',JSON.stringify({room,session}));$('connection').classList.add('hidden');reconnectAt=0;retry=0;show('lobby');voice.announce();fetch('/api/voice/'+room.code,{method:'POST',body:JSON.stringify({token:session.token})}).then(r=>r.json()).then(c=>{if(c.iceServers){voice.config={iceServers:c.iceServers};for(const p of voice.peers.values())p.pc.setConfiguration(voice.config);}}).catch(()=>{});return;}
 if(m.type==='error'){toast(m.error);if(/expired|full|progress/.test(m.error)){leave();}return;}
 if(m.type==='signal'){voice.signal(m.from,m.data);return;}
 if(m.type==='state'){state=m;you=m.you;voice.sync(m.members);updateState(m.race,you);updateUI(m);}
 };
 socket.onclose=()=>{clearTimeout(timeout);if(intentional||socket!==ws)return;voice.disconnectPeers();
 if(!reconnectAt)reconnectAt=Date.now();if(Date.now()-reconnectAt>30000){toast('Connection lost. Please join again.');leave();return;}
 $('connection').classList.remove('hidden');setTimeout(()=>{if(!intentional&&room)connect();},Math.min(4000,500*2**retry++));};
 socket.onerror=()=>{};
}
function leave(){intentional=true;send({type:'leave'});ws?.close();ws=null;voice.close();room=null;session=null;state=null;you=null;sessionStorage.removeItem('cat-session');$('connection').classList.add('hidden');updateState(null,null);show('menu');}
$('leave').onclick=$('raceExit').onclick=leave;
$('ready').onclick=()=>send({type:'ready'});$('start').onclick=()=>send({type:'start'});$('returnLobby').onclick=()=>send({type:'lobby'});
function time(n){if(n===null||n===undefined)return '—';return Math.floor(n/60)+':'+(n%60).toFixed(2).padStart(5,'0');}
function updateUI(m){
 $('roomCode').textContent=m.code;const me=m.members.find(p=>p.id===you),host=m.host===you;
 if(!m.race){if(!['characters','settings'].includes(current))show('lobby');$('members').replaceChildren();
 for(let i=0;i<8;i++){const p=m.members[i],row=document.createElement('div');row.className='member';const img=document.createElement('img');img.src=portraitsData[p?.cat??i%6];img.alt='';const n=document.createElement('span');n.className='name';n.textContent=p?p.name+' · '+cats[p.cat].name:'AI racer · joins at start';const status=document.createElement('span');status.className='badge';status.textContent=p?(p.speaking?'◉ ':p.voice?'◌ ':'')+(p.online?(p.ready?'READY':'CHOOSING'):'RECONNECTING')+(p.id===m.host?' · HOST':''):'AI';row.append(img,n,status);$('members').append(row);}
 $('ready').textContent=me?.ready?'Ready ✓':'I’m ready';$('start').disabled=!host||!m.members.filter(p=>p.online).every(p=>p.ready);$('start').textContent=host?'Start race →':'Waiting for host';$('lobbyHelp').textContent=host?'All connected players must be ready.':'Your host will start when everyone is ready.';
 }else{
 const race=m.race;
 if(race.phase==='results'){
 if(current!=='settings')show('results');const sorted=[...race.racers].sort((a,b)=>(a.finished??9999)-(b.finished??9999)||b.s-a.s);$('standings').replaceChildren();
 sorted.forEach((p,i)=>{const row=document.createElement('div');row.className='standing';const rank=document.createElement('b');rank.textContent=i+1;const name=document.createElement('span');name.textContent=p.name+(p.id===you?' (you)':'')+(p.ai?' · AI':'');const result=document.createElement('small');result.textContent=p.finished===null?'DNF':time(p.finished);row.append(rank,name,result);$('standings').append(row);});$('returnLobby').disabled=!host;$('resultsHelp').textContent=host?'Your room and voice chat stay together.':'Waiting for the host to return everyone to the lobby.';
 }else{
 if(current!=='settings')show('hud');const p=race.racers.find(p=>p.id===you);if(p){
 const sorted=[...race.racers].sort((a,b)=>(a.finished??9999)-(b.finished??9999)||b.s-a.s);$('position').textContent=sorted.findIndex(x=>x.id===you)+1;$('lap').textContent=Math.min(3,p.lap)+' / 3';$('timer').textContent=time(race.time);$('best').textContent=time(p.bestLap);$('charge').style.width=p.charge/65*100+'%';$('driftLevel').textContent=p.boost>0?'BOOST '+p.boostLevel:p.charge>=55?'LEVEL 3':p.charge>=32?'LEVEL 2':p.charge>=12?'LEVEL 1':'HOLD SHIFT + STEER';$('speed').replaceChildren(document.createTextNode(Math.round(p.speed)+' '));const small=document.createElement('small');small.textContent='PAWS / SEC';$('speed').append(small);
 $('itemLabel').textContent=({tuna:'🐟 Tuna Boost',yarn:'🧶 Yarn Ball',fish:'🐠 Fish Missile',shield:'📦 Cardboard Shield',catnip:'🌿 Catnip Frenzy',cucumber:'🥒 Cucumber Trap'})[p.item]||'Empty paws';
 $('countdown').textContent=race.countdown>0?Math.ceil(race.countdown/20):race.time<1?'GO!':p.finished!==null?'FINISHED!':'';
 if(p.event!==lastEvent){if(['pickup','boost','jump','land','collision','spin','startled','lap'].includes(p.event))sound(p.event);lastEvent=p.event;}
 }
 }
 }
 const signature=m.members.map(p=>p.id+':'+p.online).join('|');if(!$('voicePeople').classList.contains('hidden')&&signature!==voiceSignature){voiceSignature=signature;voiceUI();}voice.onChange();
}
function voiceUI(){
 $('voicePeople').replaceChildren();for(const m of state?.members||[]){if(m.id===you)continue;const p=voice.peers.get(m.id),row=document.createElement('div');row.className='voiceperson';const n=document.createElement('span');n.textContent=(m.speaking?'◉ ':'')+m.name;n.title=p?.status||'Disconnected';
 const slider=document.createElement('input');slider.type='range';slider.min=0;slider.max=1;slider.step=.01;slider.value=p?.volume??1;slider.setAttribute('aria-label',m.name+' voice volume');slider.oninput=()=>{if(p){p.volume=+slider.value;voice.volumes();}};
 const mute=document.createElement('button');mute.textContent=p?.muted?'Unmute':'Mute';mute.onclick=()=>{if(p){p.muted=!p.muted;voice.volumes();voiceUI();}};row.append(n,slider,mute);$('voicePeople').append(row);}
}
voice.onChange=()=>{$('mic').textContent=voice.stream?'Mic On':'Mic Off';$('muteSelf').textContent=voice.muted?'Unmute Self':'Mute Self';const failed=[...voice.peers.values()].some(p=>p.pc.connectionState==='failed');$('voiceStatus').textContent=failed?'Voice failed — race continues':voice.activity?'◉ Speaking':(state?.members||[]).filter(p=>p.id!==you&&p.speaking).slice(0,3).map(p=>'◉ '+p.name).join(' · ');};
$('mic').onclick=async()=>{await voice.enable();for(const p of voice.peers.values())p.audio.play().catch(()=>{});};
$('muteSelf').onclick=()=>{voice.muted=!voice.muted;voice.applyMute();};
$('voiceExpand').onclick=()=>{$('voicePeople').classList.toggle('hidden');voiceUI();};
$('voiceVolume').oninput=()=>{voice.master=+$('voiceVolume').value;voice.volumes();};
$('ptt').onchange=()=>{voice.ptt=$('ptt').checked;voice.applyMute();};$('reduced').onchange=()=>setReduced($('reduced').checked);
function neutral(){Object.keys(keys).forEach(k=>keys[k]=false);voice.held=false;voice.applyMute();}
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;if(['Space','ArrowLeft','ArrowRight','ArrowDown'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==='KeyR'&&current==='hud'&&!e.repeat)send({type:'respawn'});if(e.code==='KeyV'){voice.held=true;voice.applyMute();}if(e.code==='Escape'&&current==='hud'){previous='hud';show('settings');}});
window.addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='KeyV'){voice.held=false;voice.applyMute();}});window.addEventListener('blur',neutral);document.addEventListener('visibilitychange',()=>{if(document.hidden)neutral();});
document.querySelectorAll('#touch button').forEach(b=>{b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);keys[b.dataset.key]=true;};b.onpointerup=b.onpointercancel=()=>keys[b.dataset.key]=false;});
$('respawn').onclick=()=>send({type:'respawn'});
$('itemUse').onclick=()=>{keys.KeyE=true;setTimeout(()=>keys.KeyE=false,110);};
setInterval(()=>{if(!state?.race||current!=='hud')return;const pad=navigator.getGamepads?.()[0];let steer=(keys.ArrowLeft||keys.KeyA?1:0)-(keys.ArrowRight||keys.KeyD?1:0);if(pad&&Math.abs(pad.axes[0])>.15)steer=-pad.axes[0];
 send({type:'input',steer,brake:!!(keys.KeyS||keys.ArrowDown||pad?.buttons[6]?.pressed),drift:!!(keys.ShiftLeft||keys.ShiftRight||pad?.buttons[7]?.pressed),jump:!!(keys.Space||pad?.buttons[0]?.pressed),use:!!(keys.KeyE||pad?.buttons[2]?.pressed)});},50);
setInterval(()=>voice.sample(),180);setInterval(()=>{if(ws?.readyState===1)ws.send('__ping');},10000);
function audio(){if(!audioCtx){audioCtx=new AudioContext();audioGain=audioCtx.createGain();audioGain.gain.value=+$('gameVolume').value;audioGain.connect(audioCtx.destination);}if(audioCtx.state==='suspended')audioCtx.resume();}
document.addEventListener('pointerdown',audio,{once:true});$('gameVolume').oninput=()=>{audio();audioGain.gain.value=+$('gameVolume').value;};
function tone(freq,duration,type='sine',vol=.08){if(!audioCtx)return;const osc=audioCtx.createOscillator(),g=audioCtx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audioCtx.currentTime);osc.frequency.exponentialRampToValueAtTime(freq*.65,audioCtx.currentTime+duration);g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);osc.connect(g);g.connect(audioGain);osc.start();osc.stop(audioCtx.currentTime+duration);}
function sound(event){tone(({pickup:950,boost:370,jump:600,land:100,collision:80,spin:150,startled:1100,lap:800})[event]||220,.18,event==='collision'?'triangle':'sine',.22);}
let beat=0;setInterval(()=>{if($('music').checked){audio();const notes=[261.63,329.63,392,523.25,440,392,329.63,293.66];tone(notes[beat++%8],.12,'triangle',.09);}if(current==='hud'&&state?.race?.phase==='race')tone(80+(beat%2)*15,.025,'triangle',.015);},225);
try{const saved=JSON.parse(sessionStorage.getItem('cat-session')||'null');if(saved?.room&&saved?.session){room=saved.room;session=saved.session;connect();}}catch{}

