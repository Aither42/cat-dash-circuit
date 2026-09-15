import { DurableObject } from "cloudflare:workers";
import type { Env } from "./env";
import * as logic from "./logic.js";
type Member={id:string;token:string;name:string;cat:number;ready:boolean;online:boolean;last:number;voice:boolean;speaking:boolean};
type Saved={code:string;generation:string;host:string;members:Member[];race:any;lastTick:number;lastTouch:number};
type Attachment={id?:string;count:number;window:number};
export class Room extends DurableObject<Env>{
 constructor(ctx:DurableObjectState,env:Env){super(ctx,env);ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("__ping","__pong"));}
 private sockets(){return this.ctx.getWebSockets();}
 private send(ws:WebSocket,x:unknown){try{ws.send(JSON.stringify(x));}catch{}}
 private async get(){return this.ctx.storage.get<Saved>("room");}
 private async put(r:Saved){await this.ctx.storage.put("room",r);}
 private broadcast(r:Saved){for(const ws of this.sockets()){const a=ws.deserializeAttachment() as Attachment;if(a?.id)this.send(ws,{type:"state",you:a.id,code:r.code,host:r.host,members:r.members.map(({token,...m})=>m),race:r.race?logic.viewFor(r.race,a.id):null,serverTime:Date.now()});}}
 override async fetch(req:Request):Promise<Response>{
 const u=new URL(req.url),now=Date.now();
 if(u.pathname==="/allocate"){
 return this.ctx.storage.transaction(async tx=>{
 const slots=(await tx.get<Record<string,{code:string;generation:string;expires:number}>>("slots"))||{};
 const start=crypto.getRandomValues(new Uint32Array(1))[0]!%100;
 for(let i=0;i<100;i++){const code=String((start+i)%100).padStart(2,"0");if(!slots[code]||slots[code]!.expires<now){const entry={code,generation:crypto.randomUUID(),expires:now+120000};slots[code]=entry;await tx.put("slots",slots);return Response.json(entry);}}
 return Response.json({error:"All 100 rooms are occupied. Try again shortly."},{status:503});
 });}
 if(u.pathname==="/lookup"){const slots=await this.ctx.storage.get<Record<string,{code:string;generation:string;expires:number}>>("slots");const e=slots?.[u.searchParams.get("code")||""];return e&&e.expires>now?Response.json(e):Response.json({error:"Room not found"},{status:404});}
 if(u.pathname==="/touch"){const b=await req.json() as {code:string;generation:string};await this.ctx.storage.transaction(async tx=>{const slots=await tx.get<Record<string,{code:string;generation:string;expires:number}>>("slots")||{};if(slots[b.code]?.generation===b.generation){slots[b.code]!.expires=now+120000;await tx.put("slots",slots);}});return new Response("ok");}
 if(u.pathname==="/voice"){
 let b:any;try{b=await req.json();}catch{return new Response("Invalid",{status:400});}
 const r=await this.get();const member=r?.members.find(p=>p.token===b.token&&p.online);if(!member)return new Response("Forbidden",{status:403});
 const servers:any[]=[{urls:"stun:stun.l.google.com:19302"}];
 if(this.env.TURN_URL&&this.env.TURN_SECRET){const username=Math.floor(now/1000+3600)+":"+member.id;const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(this.env.TURN_SECRET),{name:"HMAC",hash:"SHA-1"},false,["sign"]);const sig=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(username)));const credential=btoa(String.fromCharCode(...sig));servers.push({urls:this.env.TURN_URL.split(","),username,credential});}
 return Response.json({iceServers:servers,relayConfigured:servers.length>1});
 }
 if(req.headers.get("Upgrade")!=="websocket")return new Response("Not found",{status:404});
 const pair=new WebSocketPair();if(this.sockets().length>=16)return new Response("Room busy",{status:429});
 this.ctx.acceptWebSocket(pair[1]);pair[1].serializeAttachment({count:0,window:now});
 if(!await this.get())await this.put({code:req.headers.get("X-Room-Code")!,generation:req.headers.get("X-Room-Generation")!,host:"",members:[],race:null,lastTick:now,lastTouch:0});
 if(!await this.ctx.storage.getAlarm())await this.ctx.storage.setAlarm(now+1000);
 return new Response(null,{status:101,webSocket:pair[0]});
 }
 override async webSocketMessage(ws:WebSocket,raw:string|ArrayBuffer):Promise<void>{
 if(typeof raw!=="string"||raw.length>24000)return;
 let m:any;try{m=JSON.parse(raw);}catch{return;}if(!m||typeof m!=="object")return;
 const now=Date.now(),a=(ws.deserializeAttachment()||{count:0,window:now}) as Attachment;
 if(now-a.window>1000){a.window=now;a.count=0;}a.count++;ws.serializeAttachment(a);if(a.count>80){this.send(ws,{type:"error",error:"Too many messages"});return;}
 const r=await this.get();if(!r)return;
 if(m.type==="join"){
 if(a.id)return;
 let p=typeof m.token==="string"?r.members.find(p=>p.token===m.token):undefined;
 if(p&&!p.online&&now-p.last>30000){this.send(ws,{type:"error",error:"Reconnection window expired"});return;}
 if(!p){if(m.token){this.send(ws,{type:"error",error:"Session expired"});return;}
 if(r.race&&r.race.phase!=="results"){this.send(ws,{type:"error",error:"Race in progress"});return;}
 r.members=r.members.filter(p=>p.online||now-p.last<30000);
 if(r.members.length>=8){this.send(ws,{type:"error",error:"Room full"});return;}
 p={id:crypto.randomUUID(),token:crypto.randomUUID()+crypto.randomUUID(),name:typeof m.name==="string"?m.name.trim().slice(0,18)||"Cat":"Cat",cat:Number.isInteger(m.cat)&&m.cat>=0&&m.cat<6?m.cat:0,ready:false,online:true,last:now,voice:false,speaking:false};r.members.push(p);
 }
 for(const other of this.sockets())if(other!==ws&&(other.deserializeAttachment() as Attachment)?.id===p.id){other.serializeAttachment({count:0,window:now});other.close(1000,"Session resumed elsewhere");}
 p.online=true;p.last=now;a.id=p.id;ws.serializeAttachment(a);
 if(!r.host||!r.members.some(p=>p.id===r.host&&p.online))r.host=p.id;
 await this.put(r);this.send(ws,{type:"welcome",you:p.id,token:p.token});this.broadcast(r);await this.ctx.storage.setAlarm(now+50);return;
 }
 const p=r.members.find(p=>p.id===a.id);if(!p)return;p.last=now;
 if(m.type==="signal"){
 if(typeof m.to!=="string"||!m.data||!["offer","answer","candidate"].includes(m.data.type))return;
 const target=r.members.find(q=>q.id===m.to&&q.online);if(!target)return;
 for(const s of this.sockets())if((s.deserializeAttachment() as Attachment)?.id===target.id)this.send(s,{type:"signal",from:p.id,data:m.data});return;
 }
 if(m.type==="voice"){p.voice=m.enabled===true;p.speaking=p.voice&&m.speaking===true;}
 else if(m.type==="select"&&(!r.race||r.race.phase==="results")&&Number.isInteger(m.cat)&&m.cat>=0&&m.cat<6){p.cat=m.cat;p.ready=false;}
 else if(m.type==="ready"&&!r.race)p.ready=!p.ready;
 else if(m.type==="start"&&!r.race&&p.id===r.host){
 const humans=r.members.filter(q=>q.online);if(!humans.every(q=>q.ready)){this.send(ws,{type:"error",error:"Everyone must be ready"});return;}
 const racers:any[]=humans.map(q=>({id:q.id,name:q.name,cat:q.cat,ai:false}));while(racers.length<8){const i=racers.length;racers.push({id:"bot"+i,name:["Pepper","Nori","Miso","Sesame","Bean","Tofu","Wasabi","Dango"][i],cat:i%6,ai:true});}
 r.race=logic.setup(racers);r.lastTick=now;
 }else if(m.type==="lobby"&&r.race?.phase==="results"&&p.id===r.host){r.race=null;r.members=r.members.filter(q=>q.online);r.members.forEach(q=>q.ready=false);}
 else if((m.type==="input"||m.type==="respawn")&&r.race){if(logic.validateAction(r.race,p.id,m).ok)r.race=logic.applyAction(r.race,p.id,m);else return;}
 else if(m.type==="leave"){p.online=false;p.last=0;p.voice=false;p.speaking=false;ws.serializeAttachment({count:0,window:now});ws.close(1000,"Left room");if(p.id===r.host)r.host=r.members.find(q=>q.online)?.id||"";}
 else if(m.type!=="voice")return;
 await this.put(r);if(m.type!=="input")this.broadcast(r);
 }
 override async webSocketClose(ws:WebSocket):Promise<void>{const id=(ws.deserializeAttachment() as Attachment)?.id;const r=await this.get();if(!r||!id)return;const p=r.members.find(p=>p.id===id);if(p){p.online=false;p.last=Date.now();p.voice=false;p.speaking=false;}if(r.host===id)r.host=r.members.find(q=>q.online)?.id||"";await this.put(r);this.broadcast(r);}
 override async webSocketError(ws:WebSocket):Promise<void>{await this.webSocketClose(ws);}
 override async alarm():Promise<void>{
 const r=await this.get();if(!r)return;const now=Date.now();
 for(const ws of this.sockets()){const a=ws.deserializeAttachment() as Attachment;if(!a?.id&&now-a.window>10000)ws.close(1008,"Join timeout");}
 if(!r.members.some(p=>p.online||now-p.last<30000))return;
 if(r.race&&r.race.phase!=="results"){
 for(const p of r.members){const racer=r.race.racers.find((q:any)=>q.id===p.id);if(racer&&(!p.online||now-p.last>500))racer.input={steer:0,brake:false,drift:false,jump:false,use:false};if(racer&&!p.online&&now-p.last>30000)racer.ai=true;}
 const steps=Math.min(20,Math.max(1,Math.floor((now-r.lastTick)/50)));r.race=logic.applyAction(r.race,"@server",{type:"tick",steps});r.lastTick=now-r.lastTick>1000?now:r.lastTick+steps*50;
 }
 const touch=now-r.lastTouch>20000;if(touch)r.lastTouch=now;
 await this.put(r);this.broadcast(r);await this.ctx.storage.setAlarm(now+(r.race&&r.race.phase!=="results"?50:500));
 if(touch)this.ctx.waitUntil(this.env.ROOMS.get(this.env.ROOMS.idFromName("@directory")).fetch(new Request("https://internal/touch",{method:"POST",body:JSON.stringify({code:r.code,generation:r.generation})})).then(()=>{}));
 }
}
