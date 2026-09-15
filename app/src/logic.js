// Deterministic authoritative simulation. Clients supply controls, never transforms.
const controlPoints=[[0,0],[0,150],[70,235],[200,220],[245,120],[180,35],[250,-65],[170,-185],[20,-180],[-95,-100],[-65,-15]];
function buildTrack(){
 const out=[];let length=0;
 for(let i=0;i<512;i++){
  const t=i/512*controlPoints.length,k=Math.floor(t),f=t-k,n=controlPoints.length;
  const a=controlPoints[(k+n-1)%n],b=controlPoints[k%n],c=controlPoints[(k+1)%n],d=controlPoints[(k+2)%n];
  const v=j=>.5*((2*b[j])+(-a[j]+c[j])*f+(2*a[j]-5*b[j]+4*c[j]-d[j])*f*f+(-a[j]+3*b[j]-3*c[j]+d[j])*f*f*f);
  const p={x:v(0),z:v(1),s:0};if(i)length+=Math.hypot(p.x-out[i-1].x,p.z-out[i-1].z);p.s=length;out.push(p);
 }
 length+=Math.hypot(out[0].x-out[511].x,out[0].z-out[511].z);return {points:out,length};
}
const track=buildTrack();
export const meta={game:"Cat Dash Circuit",minPlayers:1,maxPlayers:8,track,dt:.05,laps:3};
function rand(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function wrap(s){return ((s%track.length)+track.length)%track.length;}
function angleAt(s){s=wrap(s);let i=0;while(i<511&&track.points[i+1].s<s)i++;const a=track.points[i],b=track.points[(i+1)%512];return Math.atan2(b.x-a.x,b.z-a.z);}
function diff(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b));}
function racer(p,i){return {id:typeof p==="string"?p:p.id,name:typeof p==="string"?p:p.name,cat:typeof p==="string"?i%6:p.cat,ai:typeof p==="string"?false:!!p.ai,s:0,lane:(i%4-1.5)*1.9,heading:0,speed:0,y:0,vy:0,lap:1,checkpoint:0,nextGate:track.length/12,charge:0,drifting:false,boost:0,boostLevel:0,shield:false,frenzy:0,stun:0,item:null,pickup:-100,lastLap:0,bestLap:null,finished:null,input:{steer:0,brake:false,drift:false,jump:false,use:false},jumpLock:false,useLock:false,event:"idle",route:0,routeUntil:0,respawnAt:-10};}
export function setup(players){return {tick:0,time:0,phase:"countdown",countdown:60,racers:players.map(racer),projectiles:[],boxes:Array(12).fill(0),seed:543210,firstFinish:null};}
export function validateAction(state,id,a){
 if(a?.type==="respawn"){const p=state.racers.find(p=>p.id===id&&!p.ai);return {ok:!!p&&state.phase==="race"&&p.finished===null&&state.time-p.respawnAt>=3&&Object.keys(a).length===1};}
 if(!a||typeof a!=="object"||a.type!=="input")return {ok:false,error:"Invalid action"};
 if(!state.racers.some(p=>p.id===id&&!p.ai))return {ok:false,error:"Not a racer"};
 if(state.phase!=="race"&&state.phase!=="countdown")return {ok:false,error:"Race not active"};
 if(!Number.isFinite(a.steer)||Math.abs(a.steer)>1||!["brake","drift","jump","use"].every(k=>typeof a[k]==="boolean"))return {ok:false,error:"Invalid controls"};
 if(Object.keys(a).some(k=>!["type","steer","brake","drift","jump","use"].includes(k)))return {ok:false,error:"Unknown control"};
 return {ok:true};
}
function hit(p,kind){if(p.shield){p.shield=false;p.event="blocked";return;}if(p.frenzy>0)return;p.stun=kind==="cucumber"?12:22;p.speed*=.4;p.event=kind==="cucumber"?"startled":"spin";if(kind==="cucumber"){p.vy=6;p.lane=Math.max(-7,Math.min(7,p.lane+2));}}
function useItem(s,p){
 const item=p.item;if(!item)return;p.item=null;p.event="item";
 if(item==="tuna"){p.boost=45;p.boostLevel=3;}
 if(item==="shield")p.shield=true;
 if(item==="catnip"){p.frenzy=90;p.boost=65;p.boostLevel=2;}
 if(["yarn","fish","cucumber"].includes(item)){
 const ahead=s.racers.filter(q=>q.id!==p.id&&q.s>p.s&&q.finished===null).sort((a,b)=>a.s-b.s)[0];
 s.projectiles.push({id:s.tick+"-"+p.id,kind:item,owner:p.id,s:p.s+(item==="cucumber"?-4:3),lane:p.lane,target:ahead?.id||null,ttl:item==="cucumber"?300:90});
 }
}
function tickOnce(s){
 s.tick++;if(s.phase==="results")return;
 if(s.countdown>0){s.countdown--;if(!s.countdown)s.phase="race";return;}
 s.time+=.05;s.boxes=s.boxes.map(x=>Math.max(0,x-1));
 const ranked=[...s.racers].sort((a,b)=>b.s-a.s);
 for(let i=0;i<s.racers.length;i++){
 const p=s.racers[i];if(p.finished!==null)continue;
 const old=p.s,frac=wrap(p.s)/track.length;
 const curv=diff(angleAt(p.s+4),angleAt(p.s))/4;
 if(p.ai){
  const desired=Math.sin(s.time*.35+i*1.7)*3.6;
  p.input={steer:Math.max(-1,Math.min(1,curv*p.speed/1.4+(desired-p.lane)*.11-p.heading*1.9)),brake:false,drift:Math.abs(curv)>.009&&(s.tick+i*17)%95<65,jump:(frac>.28&&frac<.3)||(frac>.6&&frac<.62),use:p.item!==null&&s.tick%31===i};
 }
 const c=p.input;
 if(c.use&&!p.useLock)useItem(s,p);p.useLock=c.use;
 if(c.jump&&!p.jumpLock&&p.y===0){p.vy=7;p.event="jump";}p.jumpLock=c.jump;
 if(p.boost>0)p.boost--;if(p.frenzy>0)p.frenzy--;if(p.stun>0)p.stun--;
 const drifting=c.drift&&Math.abs(c.steer)>.12&&p.y===0&&p.speed>7&&p.stun===0;
 if(drifting)p.charge=Math.min(65,p.charge+1);
 if(p.drifting&&!drifting){const l=p.charge>=55?3:p.charge>=32?2:p.charge>=12?1:0;if(l){p.boost=12+l*12;p.boostLevel=l;p.event="boost";}p.charge=0;}
 p.drifting=drifting;
 const max=p.stun>0?6:c.brake?8:p.boost>0?24+p.boostLevel*2:19;
 p.speed+=(max-p.speed)*.13;
 p.heading+=((c.steer*(drifting?2.0:1.4))-curv*p.speed)*.05;
 p.heading*=.975;p.heading=Math.max(-1.1,Math.min(1.1,p.heading));
 p.lane+=Math.sin(p.heading)*p.speed*.05;
 const boundary=frac>.8&&frac<.87?3.7:7.5;
 if(Math.abs(p.lane)>boundary){p.lane=Math.sign(p.lane)*boundary;p.heading*=-.25;p.speed*=.72;p.event="collision";}
 if(p.y>0||p.vy>0){p.vy-=18*.05;p.y+=p.vy*.05;if(p.y<=0){p.y=0;p.vy=0;p.event="land";}}
 // Two optional precision lanes preserve the same ordered gates.
 if(!p.route&&p.y>.5&&p.lane<-3&&((frac>.285&&frac<.305)||(frac>.605&&frac<.625))){p.route=frac<.5?1:2;p.routeUntil=p.s+track.length*.09;}
 if(p.route&&p.s>=p.routeUntil)p.route=0;
 p.s+=Math.max(0,Math.cos(p.heading)*p.speed*.05)*(p.route?1.15:1);
 // Jump lip launches everyone on the main bridge.
 if(Math.floor(old/track.length)!==Math.floor(p.s/track.length))p.event="lap";
 if(frac>.445&&frac<.448&&p.y===0){p.vy=9;p.event="jump";}
 // Readable vacuum and puddle: same deterministic obstacle state for every client.
 const vacuumS=track.length*.17,delta=Math.abs(wrap(p.s)-vacuumS),vacLane=Math.sin(s.time*1.3)*5;
 if(delta<1.5&&Math.abs(p.lane-vacLane)<1.3&&p.y<.8&&p.stun===0)hit(p,"vacuum");
 if(frac>.73&&frac<.75&&p.lane>1&&p.y===0){p.speed*=.986;p.heading+=.006;}
 // 12 ordered gates: s is server-integrated and never accepted from the client.
 while(p.s>=p.nextGate&&p.finished===null){
 p.checkpoint++;p.nextGate+=track.length/12;
 if(p.checkpoint%12===0){const lapTime=s.time-p.lastLap;p.bestLap=p.bestLap===null?lapTime:Math.min(p.bestLap,lapTime);p.lastLap=s.time;p.lap++;
 if(p.lap>3){p.finished=s.time;p.event="victory";if(s.firstFinish===null)s.firstFinish=s.time;}}
 }
 for(let b=0;b<12;b++){const at=(b+.45)*track.length/12;
 if(!p.item&&!s.boxes[b]&&Math.abs(wrap(p.s)-at)<1.6&&Math.abs(p.lane-(b%2?3:-3))<1.8){
 const back=ranked.indexOf(p)>=4;const pool=back?["tuna","fish","catnip","yarn","tuna","shield"]:["yarn","shield","cucumber","tuna","shield","fish"];
 p.item=pool[Math.floor(rand(s)*pool.length)];s.boxes[b]=100;p.event="pickup";break;
 }}
 }
 for(const o of s.projectiles){
 o.ttl--;if(o.kind!=="cucumber")o.s+=1.7;
 if(o.kind==="fish"){const target=s.racers.find(p=>p.id===o.target);if(target)o.lane+=(target.lane-o.lane)*.12;}
 for(const p of s.racers)if(p.id!==o.owner&&p.finished===null&&Math.abs(wrap(p.s)-wrap(o.s))<2&&Math.abs(p.lane-o.lane)<1.5&&p.y<1.2){hit(p,o.kind);o.ttl=0;break;}
 }
 s.projectiles=s.projectiles.filter(o=>o.ttl>0);
 // Small, bounded cat-to-cat bumps; no positional teleport.
 for(let i=0;i<s.racers.length;i++)for(let j=i+1;j<s.racers.length;j++){
 const a=s.racers[i],b=s.racers[j];if(Math.abs(a.s-b.s)<1.2&&Math.abs(a.lane-b.lane)<.9&&Math.abs(a.y-b.y)<.8){const d=a.lane<=b.lane?-.08:.08;a.lane+=d;b.lane-=d;}
 }
 if(s.racers.every(p=>p.finished!==null)||(s.firstFinish!==null&&s.time-s.firstFinish>30)||s.time>360)s.phase="results";
}
export function applyAction(state,id,a){
 const s=JSON.parse(JSON.stringify(state));
 // Reserved identity is never issued to a socket; transport never accepts tick actions.
 if(id==="@server"&&a.type==="tick"){for(let i=0;i<Math.max(1,Math.min(20,a.steps||1));i++)tickOnce(s);return s;}
 const p=s.racers.find(p=>p.id===id);if(p&&a.type==="respawn"){p.s=p.checkpoint*track.length/12;p.lane=0;p.heading=0;p.speed=0;p.y=0;p.vy=0;p.boost=0;p.charge=0;p.drifting=false;p.route=0;p.respawnAt=s.time;p.event="respawn";return s;}if(p)p.input={steer:a.steer,brake:a.brake,drift:a.drift,jump:a.jump,use:a.use};
 return s;
}
export function isGameOver(s){return {over:s.phase==="results",winner:[...s.racers].filter(p=>p.finished!==null).sort((a,b)=>a.finished-b.finished)[0]?.id||null};}
export function viewFor(s,id){return {...s,you:id,seed:undefined,racers:s.racers.map(p=>({...p,input:undefined}))};}
