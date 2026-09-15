import type { Env } from "./env";
export { Room } from "./room";
export default {
 async fetch(request:Request,env:Env):Promise<Response>{
 const u=new URL(request.url),registry=env.ROOMS.get(env.ROOMS.idFromName("@directory"));
 const origin=request.headers.get("Origin");
 if(origin&&origin!==u.origin)return new Response("Origin rejected",{status:403});
 if(u.pathname==="/api/create"&&request.method==="POST")return registry.fetch(new Request("https://internal/allocate",{method:"POST"}));
 const m=u.pathname.match(/^\/(api\/join|api\/voice|ws)\/(\d{2})$/);
 if(m){const r=await registry.fetch("https://internal/lookup?code="+m[2]);if(!r.ok)return r;
 const entry=await r.json() as {code:string;generation:string};
 if(m[1]==="api/voice"&&request.method==="POST")return env.ROOMS.get(env.ROOMS.idFromName(entry.generation)).fetch(new Request("https://internal/voice",{method:"POST",body:await request.text()}));
 if(m[1]==="api/join")return Response.json({code:entry.code,generation:entry.generation});
 if(request.headers.get("Upgrade")!=="websocket")return new Response("WebSocket required",{status:426});
 // Generation prevents a reconnect from entering a later room that reuses the code.
 if(u.searchParams.get("generation")!==entry.generation)return Response.json({error:"Room expired"},{status:410});
 const headers=new Headers(request.headers);headers.set("X-Room-Code",entry.code);headers.set("X-Room-Generation",entry.generation);
 return env.ROOMS.get(env.ROOMS.idFromName(entry.generation)).fetch(new Request(request,{headers}));
 }
 if(u.pathname==="/health")return Response.json({ok:true,game:"Cat Dash Circuit"});
 return env.ASSETS.fetch(request);
 }
} satisfies ExportedHandler<Env>;
