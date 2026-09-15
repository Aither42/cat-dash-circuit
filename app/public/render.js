import * as THREE from '/vendor/three.module.js';
import {meta} from '/simulation.js';
export const cats=[
{name:"Ember",personality:"Proud. Dramatic. Unreasonably fluffy.",color:0x36221e,accent:0x604236,eye:0xeab64b,scale:[1.2,1.1,1.05],tail:1.6},
{name:"Mochi",personality:"A tiny calico with very big opinions.",color:0xeecda9,accent:0xbd6635,eye:0xdbaf55,scale:[1.2,.85,.9],tail:1},
{name:"Bolt",personality:"All ears. All spots. All business.",color:0xc88c49,accent:0x37231c,eye:0xaed49b,scale:[.87,.98,1.18],tail:.65},
{name:"Pip",personality:"White socks. Black belt in mischief.",color:0x25242a,accent:0xf2e5d5,eye:0xd5bd6b,scale:[.95,1,1],tail:.8},
{name:"Nimbus",personality:"Cloud-shaped. Suspiciously competitive.",color:0x8995ad,accent:0x69788c,eye:0xe2bb6d,scale:[1.23,.94,1],tail:1.1},
{name:"Suki",personality:"Perfect posture. Terrible sportsmanship.",color:0xe5cdb0,accent:0x685247,eye:0x8cd6ec,scale:[.86,1.05,1.15],tail:.7}
];
const canvas=document.getElementById('world');
export const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x292342);scene.fog=new THREE.FogExp2(0x302542,.0065);
const camera=new THREE.PerspectiveCamera(53,innerWidth/innerHeight,.1,650);
scene.add(new THREE.HemisphereLight(0xc9bbff,0xa77971,2.1));const sun=new THREE.DirectionalLight(0xffc39e,3);sun.position.set(70,150,70);scene.add(sun);const fill=new THREE.DirectionalLight(0x9edbff,1.7);fill.position.set(-30,30,-50);scene.add(fill);
const sphere=new THREE.SphereGeometry(1,14,10),box=new THREE.BoxGeometry(1,1,1),cone=new THREE.ConeGeometry(1,1,3),cylinder=new THREE.CylinderGeometry(1,1,1,12);
const mats=new Map();
function mat(color,glow=false){const key=color+':'+glow;if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness:.7,emissive:glow?color:0,emissiveIntensity:glow?.9:0}));return mats.get(key);}
function mesh(parent,geo,color,x,y,z,sx=1,sy=1,sz=1,glow=false){const m=new THREE.Mesh(geo,mat(color,glow));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
export function catModel(index){
 const c=cats[index],g=new THREE.Group(),body=new THREE.Group();g.add(body);
 const torso=mesh(body,sphere,c.color,0,1.1,0,.7*c.scale[0],.72*c.scale[1],1.05*c.scale[2]);
 const head=new THREE.Group();head.position.set(0,1.63,.8);body.add(head);
 mesh(head,sphere,c.color,0,0,0,.82*c.scale[0],.75,.69);
 if(index===0){for(let i=0;i<9;i++){const a=i/9*Math.PI*2;mesh(head,sphere,c.accent,Math.cos(a)*.65,Math.sin(a)*.55,-.12,.32,.31,.3);}mesh(body,sphere,c.accent,0,1.3,.45,.84,.7,.72);}
 if(index===3){mesh(body,sphere,c.accent,0,1.3,.7,.5,.55,.44);mesh(head,sphere,c.accent,0,-.3,.49,.53,.35,.23);mesh(head,sphere,c.accent,0,.18,.58,.13,.45,.1);}
 if(index===1){mesh(head,sphere,c.accent,-.4,.22,.3,.49,.53,.44);mesh(head,sphere,0x4b342c,.44,.28,.28,.35,.47,.4);mesh(body,sphere,c.accent,.39,1.38,-.25,.45,.6,.76);mesh(body,sphere,0x514039,-.44,1.45,-.3,.29,.44,.62);}
 if(index===5)mesh(head,sphere,c.accent,0,-.02,.49,.59,.49,.3);
 for(const side of [-1,1]){
 const ear=mesh(head,cone,c.color,side*.58,.75,-.07,.38,index===2?.85:.66,.32);ear.rotation.z=-side*.3;mesh(ear,cone,0xc88482,0,.08,.37,.63,.65,.35);
 const eye=mesh(head,sphere,c.eye,side*.33,.02,.6,.245,.285,.12);mesh(eye,sphere,0x151322,0,0,.8,.44,.82,.32);mesh(eye,sphere,0xffffff,-.23,.3,1.05,.2,.18,.12);
 mesh(head,sphere,index===0?c.accent:0xf3ddc3,side*.17,-.3,.64,.23,.19,.17);
 }
 mesh(head,cone,0xd28a89,0,-.24,.84,.12,.11,.1).rotation.z=Math.PI;
 const legs=[];for(let i=0;i<4;i++){const leg=new THREE.Group();leg.position.set(i%2? .48:-.48,.78,i<2?.68:-.64);body.add(leg);mesh(leg,sphere,c.color,0,-.2,0,.22,.45,.25);mesh(leg,sphere,index===3||index===1?0xf4e5cc:c.color,0,-.62,.12,.29,.19,.36);legs.push(leg);}
 const tail=new THREE.Group();tail.position.set(0,1.1,-.85);body.add(tail);for(let i=0;i<5;i++)mesh(tail,sphere,i%2===0&&index===2?c.accent:c.color,Math.sin(i*.55)*.22,i*.25,-i*.26,.23*c.tail*(1-i*.07),.26*c.tail,.35*c.tail);
 if(index===2){for(let i=0;i<20;i++){const side=i%2?1:-1;mesh(body,sphere,c.accent,side*.58,1.15+Math.sin(i*5)*.35,Math.cos(i*2.3)*.72,.065,.105,.12);}}
 g.userData={body,head,torso,legs,tail,index};return g;
}
function animateCat(g,p,t){
 const d=g.userData,run=p&&p.speed>1,phase=t*(run?9+p.speed*.4:2)+d.index;
 d.body.position.y=run?Math.abs(Math.sin(phase))*.085:Math.sin(phase)*.035;
 d.body.rotation.z=p?.drifting?-.18*Math.sign(p.heading||1):0;
 d.body.scale.y=p?.drifting?.78:1;d.body.scale.z=p?.boost>0?1.12:1;
 d.head.rotation.z=Math.sin(t*1.2+d.index)*.06;
 d.tail.rotation.z=Math.sin(phase*.4)*.3+(p?.heading||0)*.6;
 d.tail.rotation.x=Math.sin(t*3+d.index)*.12;
 d.legs.forEach((leg,i)=>{leg.rotation.x=run?Math.sin(phase+(i===0||i===3?0:Math.PI))*.8:0;if(p?.y>.3)leg.rotation.x=i<2?-1:.8;});
 if(p?.stun>0)d.body.rotation.y=t*15;else if(p?.finished!==null&&p?.finished!==undefined){d.body.position.y=Math.abs(Math.sin(t*5+d.index))*.5;d.head.rotation.z=Math.sin(t*4)*.2;}else d.body.rotation.y=p?.drifting?(p.heading<0?-.3:.3):0;
}
export const L=meta.track.length,points=meta.track.points;
export function trackAt(s,lane=0,route=0){
 const w=((s%L)+L)%L;let lo=0,hi=511;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(points[mid].s<=w)lo=mid;else hi=mid-1;}
 const a=points[lo],b=points[(lo+1)%512],len=lo===511?L-a.s:b.s-a.s,t=(w-a.s)/len;
 const angle=Math.atan2(b.x-a.x,b.z-a.z),frac=w/L;
 const elevation=frac>.34&&frac<.49?Math.sin((frac-.34)/.15*Math.PI)*9:0;
 let extra=0;if(route===1&&frac>.285&&frac<.4)extra=Math.sin(Math.min(1,(frac-.285)/.1)*Math.PI)*5;
 return {x:a.x+(b.x-a.x)*t+Math.cos(angle)*lane,z:a.z+(b.z-a.z)*t-Math.sin(angle)*lane,y:elevation+extra,angle};
}
const environment=new THREE.Group();scene.add(environment);
mesh(environment,box,0x332e45,50,-1.5,0,1000,2,1000);
function ribbon(offset,width,color,begin=0,end=1,route=0){
 const vertices=[],indices=[];let n=0;
 for(let i=Math.floor(begin*512);i<=Math.ceil(end*512);i++){const s=i/512*L;for(const side of [-1,1]){const p=trackAt(s,(offset+side*width/2)*(begin===0&&end===1&&i/512>.8&&i/512<.87?.5:1),route);vertices.push(p.x,p.y+.015,p.z);}if(n){let j=n*2;indices.push(j-2,j-1,j,j-1,j+1,j);}n++;}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness:.9,side:THREE.DoubleSide}));environment.add(m);
}
ribbon(0,16,0x756372);ribbon(-8.15,.3,0xff9570);ribbon(8.15,.3,0x9bd4c8);
ribbon(-4.7,3,0xb88965,.285,.4,1);
const blocks=[];
function instanced(positions,color,geo=box){if(!positions.length)return;const im=new THREE.InstancedMesh(geo,mat(color),positions.length),dummy=new THREE.Object3D();positions.forEach((a,i)=>{dummy.position.set(a[0],a[1],a[2]);dummy.rotation.set(0,a[6]||0,0);dummy.scale.set(a[3],a[4],a[5]);dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);});environment.add(im);}
const rails=[],post=[],lights=[],wood=[],roofs=[];
for(let i=0;i<100;i++){
 const s=i/100*L;
 for(const side of [-1,1]){
 const p=trackAt(s,side*(i/100>.8&&i/100<.87?4.1:8.5));
 rails.push([p.x,p.y+.25,p.z,.25,.5,L/100*.8,p.angle]);post.push([p.x,p.y+1.2,p.z,.24,2.5,.24]);
 if(i%3===0){const q=trackAt(s,side*12);wood.push([q.x,q.y+2.5,q.z,.32,5,.32]);lights.push([q.x,q.y+5,q.z,.65,.95,.65]);}
 }
 if(i%2===0){const p=trackAt(s,(i%4===0?1:-1)*18);const h=6+(i%5)*1.7;
 blocks.push([p.x,p.y+h/2,p.z,10,h,9,p.angle]);roofs.push([p.x,p.y+h+.35,p.z,11,.7,10,p.angle]);}
}
instanced(rails,0xb8968e);instanced(post,0x45384a);instanced(wood,0x6c4153);instanced(blocks,0x48364f);instanced(roofs,0x293143);
const lanternMesh=new THREE.InstancedMesh(sphere,mat(0xff977b,true),lights.length),dummy=new THREE.Object3D();lights.forEach((a,i)=>{dummy.position.set(a[0],a[1],a[2]);dummy.scale.set(a[3],a[4],a[5]);dummy.updateMatrix();lanternMesh.setMatrixAt(i,dummy.matrix);});environment.add(lanternMesh);
function sign(text,color){const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');x.fillStyle='#30223e';x.fillRect(0,0,256,128);x.strokeStyle=color;x.lineWidth=5;x.strokeRect(5,5,246,118);x.fillStyle=color;x.font='bold 34px sans-serif';x.textAlign='center';x.fillText(text,128,77);const tex=new THREE.CanvasTexture(c);return new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide});}
const signs=['FISH CLUB','PAW MART','RAMEN','MEOW','夜市','CATNIP'];
for(let i=0;i<24;i++){
 const p=trackAt(i/24*L,(i%2?1:-1)*12),stall=new THREE.Group();stall.position.set(p.x,p.y,p.z);stall.rotation.y=p.angle;environment.add(stall);
 mesh(stall,box,0x866057,0,2.2,0,5,.4,3);mesh(stall,box,i%2?0xe98273:0x72b9b3,0,4.7,0,6,.5,4);
 for(const side of [-1,1])mesh(stall,box,0x523b48,side*2.3,2.4,0,.2,4.8,.2);
 const label=new THREE.Mesh(new THREE.PlaneGeometry(3.2,1.4),sign(signs[i%6],i%2?'#ffba83':'#a4ebd0'));label.position.set(0,3.7,1.55);stall.add(label);
 for(let j=0;j<3;j++)mesh(stall,sphere,i%3===0?0x92bbcd:0xdba774,j-1,2.65,.3,.38,.2,.65);
}
// Finish gate and oversized banners.
const gate=new THREE.Group();const start=trackAt(0);gate.position.set(start.x,0,start.z);gate.rotation.y=start.angle;environment.add(gate);
for(const side of [-1,1])mesh(gate,box,0xb66473,side*9,4,0,.7,8,.7);
const finish=new THREE.Mesh(new THREE.PlaneGeometry(17,2.7),sign('CAT DASH','#fff1d4'));finish.position.set(0,7,0);gate.add(finish);
for(let x=-7;x<8;x++)for(let z=0;z<2;z++)mesh(gate,box,(x+z)%2?0xf4dbbd:0x29283c,x,.05,z,1,.04,1);
// Pipe tunnel, shop shortcut, roof bridge labels.
for(const [f,title] of [[.29,'ROOFTOP ↗'],[.61,'SHOP CUT ↗'],[.44,'BIG LEAP'],[.8,'NARROW ALLEY']]){
 const p=trackAt(L*f,-8),g=new THREE.Group();g.position.set(p.x,p.y+3,p.z);g.rotation.y=p.angle;environment.add(g);const m=new THREE.Mesh(new THREE.PlaneGeometry(5,2),sign(title,'#b8ead1'));g.add(m);
}
const tun=trackAt(.82*L);const tube=new THREE.Mesh(new THREE.CylinderGeometry(9,9,22,16,1,true,.0,Math.PI),new THREE.MeshStandardMaterial({color:0x507a82,side:THREE.DoubleSide,roughness:.8}));tube.rotation.set(Math.PI/2,0,-tun.angle);tube.position.set(tun.x,tun.y,tun.z);environment.add(tube);
const itemMeshes=[];for(let i=0;i<12;i++){const p=trackAt((i+.45)*L/12,i%2?3:-3);const g=new THREE.Group();g.position.set(p.x,p.y+1.3,p.z);mesh(g,box,0xade3cf,0,0,0,1.3,1.3,1.3,true);for(const side of [-1,1])mesh(g,sphere,0xf8e9b9,side*.23,.05,.68,.13,.15,.05);environment.add(g);itemMeshes.push(g);}
const vacuum=new THREE.Group();mesh(vacuum,cylinder,0xc4bbcd,0,.35,0,1.2,.6,1.2);mesh(vacuum,cylinder,0x59466a,0,.67,0,.6,.05,.6);mesh(vacuum,sphere,0xff7c67,0,.75,.6,.12,.08,.1,true);environment.add(vacuum);
const puddle=trackAt(.74*L,4);mesh(environment,sphere,0x81b8d2,puddle.x,.03,puddle.z,3,.025,9);
const homeCats=cats.map((_,i)=>{const g=catModel(i);scene.add(g);g.position.set(i*4,0,0);return g;});
const racers=new Map(),projectiles=new Map();
let chosen=0,state=null,you=null,screen='menu',reduce=false,previousTime=0,packetAt=0;
const camPos=new THREE.Vector3(),look=new THREE.Vector3(),targetLook=new THREE.Vector3(),v=new THREE.Vector3();
export function setSelected(i){chosen=i;}
export function setScreen(s){screen=s;}
export function setReduced(r){reduce=r;}
export function updateState(s,id){state=s;you=id;packetAt=performance.now();}
export function portraits(){
 const out=[],ps=new THREE.Scene();ps.background=new THREE.Color(0x343049);ps.add(new THREE.HemisphereLight(0xffffff,0x8471a7,3));const light=new THREE.DirectionalLight(0xffd8a8,4);light.position.set(4,6,4);ps.add(light);
 const cam=new THREE.PerspectiveCamera(38,1.6,.1,20);cam.position.set(2.8,2.5,4.5);cam.lookAt(0,1.3,0);
 const r=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});r.setSize(256,160);r.outputColorSpace=THREE.SRGBColorSpace;
 for(let i=0;i<6;i++){const g=catModel(i);ps.add(g);r.render(ps,cam);out.push(r.domElement.toDataURL());ps.remove(g);}r.dispose();return out;
}
const dust=new THREE.InstancedMesh(sphere,new THREE.MeshBasicMaterial({color:0xffbe7c,transparent:true,opacity:.65}),64);dust.count=0;scene.add(dust);const dustDummy=new THREE.Object3D();
const map=document.getElementById('map').getContext('2d');
function minimap(){map.clearRect(0,0,160,140);map.strokeStyle='#8d809a';map.lineWidth=5;map.beginPath();for(let i=0;i<512;i++){const p=points[i],x=(p.x+110)*.39+8,y=(p.z+205)*.27+9;i?map.lineTo(x,y):map.moveTo(x,y);}map.closePath();map.stroke();for(const p of state.racers){const q=trackAt(p.s),x=(q.x+110)*.39+8,y=(q.z+205)*.27+9;map.fillStyle=p.id===you?'#ff886f':'#c4dfce';map.beginPath();map.arc(x,y,p.id===you?4:2,0,7);map.fill();}}
export function draw(now){
 requestAnimationFrame(draw);const t=now/1000,dt=Math.min(.05,(now-previousTime)/1000||.016);previousTime=now;
 const racing=state&&['hud','results'].includes(screen);homeCats.forEach((g,i)=>{g.visible=!racing&&i===chosen;g.position.set(0,0,0);g.rotation.y=.2+Math.sin(t*.23)*.15;g.scale.setScalar(2.25);if(g.visible)animateCat(g,null,t);});
 if(racing){
 dust.count=0;
 for(const p of state.racers){
 let g=racers.get(p.id);if(g&&g.userData.index!==p.cat){scene.remove(g);racers.delete(p.id);g=null;}if(!g){g=catModel(p.cat);racers.set(p.id,g);scene.add(g);g.userData.fresh=true;}
 g.visible=true;
 // Extrapolate at most 100ms, then interpolate correction. No extrapolation through disconnect.
 const extrap=state.phase==='race'?Math.min(.1,(now-packetAt)/1000):0;
 const q=trackAt(p.s+p.speed*extrap*Math.cos(p.heading),p.lane,p.route);
 v.set(q.x,q.y+p.y,q.z);if(g.userData.fresh){g.position.copy(v);g.userData.fresh=false;}else g.position.lerp(v,1-Math.exp(-dt*18));
 g.rotation.y=q.angle+p.heading;animateCat(g,p,t);
 if(p.drifting||p.boost>0){for(let j=0;j<7;j++){const back=(j+((t*6)%1))*.45;dustDummy.position.set(q.x-Math.sin(q.angle)*back+Math.cos(q.angle)*(j%2?.5:-.5),q.y+.12+j*.05,q.z-Math.cos(q.angle)*back-Math.sin(q.angle)*(j%2?.5:-.5));dustDummy.scale.setScalar(.08+j*.025);dustDummy.updateMatrix();dust.setMatrixAt(dust.count++,dustDummy.matrix);}}
 dust.instanceMatrix.needsUpdate=true;
 if(p.id===you){
 const dist=reduce?10:9+p.speed*.14;camPos.set(q.x-Math.sin(q.angle)*dist,q.y+5+p.y*.25,q.z-Math.cos(q.angle)*dist);
 camera.position.lerp(camPos,1-Math.exp(-dt*7));
 targetLook.set(q.x+Math.sin(q.angle)*9,q.y+1.7+p.y*.3,q.z+Math.cos(q.angle)*9);look.lerp(targetLook,1-Math.exp(-dt*9));camera.lookAt(look);camera.fov=reduce?58:56+p.speed*.22;camera.updateProjectionMatrix();
 }
 }
 for(const [id,g] of racers)if(!state.racers.some(p=>p.id===id))g.visible=false;
 for(const o of state.projectiles){let g=projectiles.get(o.id);if(!g){g=new THREE.Group();mesh(g,o.kind==='cucumber'?cylinder:sphere,o.kind==='yarn'?0xec99bc:o.kind==='fish'?0x98d5e6:0x85bd6a,0,0,0,.45,o.kind==='cucumber'?1.5:.45,.45,true);scene.add(g);projectiles.set(o.id,g);}const q=trackAt(o.s,o.lane);g.position.set(q.x,q.y+.65,q.z);g.rotation.y=t*4;}
 for(const [id,g] of projectiles)if(!state.projectiles.some(o=>o.id===id)){scene.remove(g);projectiles.delete(id);}
 minimap();
 }else{
 dust.count=0;
 racers.forEach(g=>g.visible=false);projectiles.forEach(g=>g.visible=false);
 camPos.set(11,7.5,15);camera.position.lerp(camPos,.045);look.set(-5,2.2,0);camera.lookAt(look);camera.fov=53;camera.updateProjectionMatrix();
 }
 itemMeshes.forEach((g,i)=>{g.rotation.y=t;g.visible=!state||!state.boxes[i];});
 const vp=trackAt(.17*L,Math.sin((state?.time||t)*1.3)*5);vacuum.position.set(vp.x,vp.y,vp.z);
 renderer.render(scene,camera);
}
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
requestAnimationFrame(draw);

