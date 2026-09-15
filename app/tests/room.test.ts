import {SELF,env,runInDurableObject} from "cloudflare:test";
import {describe,it,expect} from "vitest";
async function create(){const r=await SELF.fetch("https://game.test/api/create",{method:"POST"});expect(r.status).toBe(200);return r.json() as Promise<any>;}
async function open(room:any,token?:string){const res=await SELF.fetch("https://game.test/ws/"+room.code+"?generation="+room.generation,{headers:{Upgrade:"websocket"}});expect(res.status).toBe(101);const ws=res.webSocket!;ws.accept();const frames:any[]=[];ws.addEventListener("message",(e:MessageEvent)=>{try{frames.push(JSON.parse(String(e.data)));}catch{}});
const send=(m:any)=>ws.send(JSON.stringify(m));const wait=async(fn:(m:any)=>boolean)=>{for(let i=0;i<300;i++){const r=frames.find(fn);if(r)return r;await scheduler.wait(10);}throw Error("Frame timeout");};send({type:"join",name:"Tester",cat:0,token});return {ws,frames,send,wait};}
describe("Live room protocol",()=>{
for(const count of [2,4,6,8])it(count+" concurrent clients share one room, readiness and race",async()=>{
 const r=await create(),clients=[];for(let i=0;i<count;i++){const c=await open(r);await c.wait(m=>m.type==="welcome");clients.push(c);}
 for(const c of clients)await c.wait(m=>m.type==="state"&&m.members.length===count);
 for(const c of clients)c.send({type:"ready"});
 await clients[0]!.wait(m=>m.type==="state"&&m.members.filter((p:any)=>p.ready).length===count);
 clients[0]!.send({type:"start"});
 for(const c of clients){const s=await c.wait(m=>m.type==="state"&&m.race);expect(s.race.racers).toHaveLength(8);expect(s.race.racers.filter((p:any)=>!p.ai)).toHaveLength(count);expect(s.members.some((p:any)=>p.token)).toBe(false);}
 for(const c of clients)c.ws.close();
},15000);
it("allocates different codes, rejects absent room and stale generation",async()=>{const a=await create(),b=await create();expect(a.code).toMatch(/^\d{2}$/);expect(a.code).not.toBe(b.code);const bad=await SELF.fetch("https://game.test/ws/"+a.code+"?generation=wrong",{headers:{Upgrade:"websocket"}});expect(bad.status).toBe(410);const malformed=await SELF.fetch("https://game.test/api/join/abc");expect(malformed.status).not.toBe(200);});
it("migrates lobby host and authenticates reconnect",async()=>{const r=await create(),a=await open(r),wa=await a.wait(m=>m.type==="welcome"),b=await open(r),wb=await b.wait(m=>m.type==="welcome");a.ws.close();await b.wait(m=>m.type==="state"&&m.host===wb.you);const resumed=await open(r,wa.token),wr=await resumed.wait(m=>m.type==="welcome");expect(wr.you).toBe(wa.you);const bad=await open(r,"forged");await bad.wait(m=>m.type==="error");b.ws.close();resumed.ws.close();bad.ws.close();});
it("routes voice signaling only to members of the same room",async()=>{const r=await create(),other=await create(),a=await open(r),b=await open(r),c=await open(other);await a.wait(m=>m.type==="welcome");const wb=await b.wait(m=>m.type==="welcome"),wc=await c.wait(m=>m.type==="welcome");a.send({type:"signal",to:wb.you,data:{type:"offer",sdp:"test"}});await b.wait(m=>m.type==="signal");a.send({type:"signal",to:wc.you,data:{type:"offer",sdp:"must-not-cross"}});await scheduler.wait(80);expect(c.frames.filter(m=>m.type==="signal")).toHaveLength(0);a.ws.close();b.ws.close();c.ws.close();});
it("returns to lobby without dropping sockets and can start another match",async()=>{
 const r=await create(),a=await open(r);await a.wait(m=>m.type==="welcome");a.send({type:"ready"});await a.wait(m=>m.type==="state"&&m.members[0].ready);a.send({type:"start"});await a.wait(m=>m.type==="state"&&m.race);
 const stub=(env as unknown as {ROOMS:DurableObjectNamespace}).ROOMS.get((env as unknown as {ROOMS:DurableObjectNamespace}).ROOMS.idFromName(r.generation));await runInDurableObject(stub,async(_instance,ctx)=>{const s=await ctx.storage.get<any>("room");s.race.phase="results";await ctx.storage.put("room",s);});
 a.send({type:"lobby"});await a.wait(m=>m.type==="state"&&!m.race&&!m.members[0].ready);a.send({type:"ready"});await scheduler.wait(30);a.send({type:"start"});await scheduler.wait(100);expect(a.frames.filter(m=>m.type==="state"&&m.race).length).toBeGreaterThan(1);a.ws.close();
});
});


it("all 100 concurrent reservations are unique and the 101st fails",async()=>{
 const namespace=(env as unknown as {ROOMS:DurableObjectNamespace}).ROOMS;
 const stub=namespace.get(namespace.idFromName("capacity-test"));
 const results=await Promise.all(Array.from({length:100},()=>stub.fetch(new Request("https://internal/allocate",{method:"POST"}))));
 const entries=await Promise.all(results.map(r=>r.json() as Promise<any>));
 expect(new Set(entries.map(e=>e.code)).size).toBe(100);
 expect(entries.every(e=>/^\d{2}$/.test(e.code))).toBe(true);
 const full=await stub.fetch(new Request("https://internal/allocate",{method:"POST"}));expect(full.status).toBe(503);
},15000);

it("retains fractional tick time instead of slowing the race on every alarm",async()=>{
 const namespace=(env as unknown as {ROOMS:DurableObjectNamespace}).ROOMS;
 const stub=namespace.get(namespace.idFromName("clock-remainder-test"));
 await runInDurableObject(stub,async(instance,ctx)=>{
  const start=Date.now()-75;const logic=await import("../src/logic.js");const race=logic.setup(["p"]);race.phase="race";race.countdown=0;
  await ctx.storage.put("room",{code:"00",generation:"test",host:"p",members:[{id:"p",online:true,last:Date.now()}],race,lastTick:start,lastTouch:Date.now()});
  await (instance as unknown as {alarm():Promise<void>}).alarm();
  const next=await ctx.storage.get<any>("room");expect(next.lastTick-start).toBeGreaterThanOrEqual(50);expect((next.lastTick-start)%50).toBe(0);
  await ctx.storage.deleteAlarm();
 });
});
