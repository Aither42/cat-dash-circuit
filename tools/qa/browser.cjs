// Run: NODE_PATH=<playwright install>/node_modules node tools/qa/browser.cjs <game URL> [count]
const {chromium}=require('playwright');
(async()=>{
 const url=process.argv[2]||'http://localhost:8787',count=Number(process.argv[3]||6);
 const options={headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']};
 if(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE)options.executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
 const b=await chromium.launch(options),pages=[],errors=[];let code;
 try{
 for(let i=0;i<count;i++){
  const c=await b.newContext({viewport:{width:800,height:600},permissions:['microphone']});
  await c.addInitScript(()=>{window.qaPeers=[];const Peer=window.RTCPeerConnection;window.RTCPeerConnection=class extends Peer{constructor(...args){super(...args);window.qaPeers.push(this);}};});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(url,{waitUntil:'domcontentloaded'});await p.click('#play');await p.fill('#name','QA Browser '+i);
  if(i===0)await p.click('#create');else{await p.fill('#code',code);await p.click('#join');}
  await p.waitForSelector('#lobby:not(.hidden)');
  if(i===0)code=await p.locator('#roomCode').textContent();
  await p.click('#mic');pages.push(p);console.log('joined browser '+(i+1));
 }
 await pages[0].waitForTimeout(5000);
 for(const p of pages)await p.click('#ready');
 await pages[0].waitForFunction(()=>!document.getElementById('start').disabled);
 await pages[0].click('#start');await pages[0].waitForSelector('#hud:not(.hidden)');
 await pages[0].waitForTimeout(7000);
 const results=[];
 for(const p of pages)results.push(await p.evaluate(async()=>{
  let packets=0;const states=[],perPeerPackets=[];
  for(const peer of window.qaPeers){if(peer.connectionState==='closed')continue;states.push(peer.connectionState);if(peer.connectionState!=='connected')console.warn('Peer state',peer.signalingState,peer.iceConnectionState,peer.localDescription?.type,peer.remoteDescription?.type);const stats=await peer.getStats();let received=0;for(const s of stats.values())if(s.type==='inbound-rtp'&&s.kind==='audio')received+=s.packetsReceived||0;packets+=received;perPeerPackets.push(received);}
  return {perPeerPackets,media:window.qaPeers.filter(p=>p.connectionState!=='closed').map(p=>p.getTransceivers().map(t=>({direction:t.currentDirection,sender:t.sender.track?.readyState,enabled:t.sender.track?.enabled,receiver:t.receiver.track?.readyState}))),peers:states,packets,lap:document.getElementById('lap').textContent,time:document.getElementById('timer').textContent,mic:document.getElementById('mic').textContent};
 }));
 const report={clients:count,errors,results};
 console.log(JSON.stringify(report));
 if(errors.length||results.some(r=>r.peers.length!==count-1||r.peers.some(s=>s!=='connected')||r.packets<1||r.perPeerPackets.some(p=>p<1)||r.mic!=='Mic On'))throw Error('Browser/voice acceptance failed');
 await pages[0].screenshot({path:'/tmp/cat-dash-race.png'});
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1);});

