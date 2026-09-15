import {describe,it,expect} from "vitest";
import * as l from "../src/logic.js";
const input={type:"input",steer:0,brake:false,drift:false,jump:false,use:false};
describe("Authoritative simulation",()=>{
it("has eight equal-stat racers and deterministic replay",()=>{const ids=Array.from({length:8},(_,i)=>"p"+i);const a=l.setup(ids),b=l.setup(ids);expect(a.racers.map((p:any)=>p.speed)).toEqual(Array(8).fill(0));expect(l.applyAction(a,"@server",{type:"tick",steps:20})).toEqual(l.applyAction(b,"@server",{type:"tick",steps:20}));expect(a.tick).toBe(0);});
it("rejects teleport, tick, impossible input and unknown players",()=>{const s=l.setup(["p"]);for(const action of [{type:"tick",steps:20},{...input,s:9999},{...input,steer:9},{...input,steer:NaN},{...input,jump:1}])expect(l.validateAction(s,"p",action).ok).toBe(false);expect(l.validateAction(s,"stranger",input).ok).toBe(false);});
it("requires all ordered gates before lap completion",()=>{let s=l.setup(["p"]);s.countdown=0;s.phase="race";s.racers[0].s=l.meta.track.length-1;s.racers[0].nextGate=l.meta.track.length;s.racers[0].checkpoint=11;s.racers[0].speed=19;s=l.applyAction(s,"@server",{type:"tick",steps:2});expect(s.racers[0].lap).toBe(2);expect(s.racers[0].checkpoint).toBe(12);expect(s.racers[0].finished).toBeNull();});
it("consumes items once and shields one hit",()=>{let s=l.setup(["p"]);s.racers[0].item="shield";s.countdown=0;s.phase="race";s=l.applyAction(s,"p",{...input,use:true});s=l.applyAction(s,"@server",{type:"tick",steps:1});expect(s.racers[0].item).toBeNull();expect(s.racers[0].shield).toBe(true);s=l.applyAction(s,"@server",{type:"tick",steps:20});expect(s.racers[0].shield).toBe(true);});
it("releasing charged drift awards level three boost",()=>{let s=l.setup(["p"]);s.countdown=0;s.phase="race";s.racers[0].speed=19;s.racers[0].drifting=true;s.racers[0].charge=60;s=l.applyAction(s,"@server",{type:"tick",steps:1});expect(s.racers[0].boostLevel).toBe(3);expect(s.racers[0].boost).toBeGreaterThan(0);});
it("AI completes three laps within target envelope",()=>{let s=l.setup(Array.from({length:8},(_,i)=>({id:"ai"+i,name:"AI",cat:i%6,ai:true})));for(let i=0;i<720&&s.phase!=="results";i++)s=l.applyAction(s,"@server",{type:"tick",steps:20});expect(s.phase).toBe("results");expect(s.racers.filter((p:any)=>p.finished!==null).length).toBeGreaterThan(0);expect(s.racers[0].bestLap).toBeGreaterThan(45);expect(s.racers[0].bestLap).toBeLessThan(110);});
});


it("respawn preserves the last validated gate and cannot be spammed",()=>{
 let s=l.setup(["p"]);s.phase="race";s.countdown=0;s.time=10;s.racers[0].checkpoint=2;s.racers[0].s=300;
 expect(l.validateAction(s,"p",{type:"respawn"}).ok).toBe(true);
 s=l.applyAction(s,"p",{type:"respawn"});expect(s.racers[0].s).toBeCloseTo(l.meta.track.length/6);expect(s.racers[0].checkpoint).toBe(2);expect(s.racers[0].lap).toBe(1);
 expect(l.validateAction(s,"p",{type:"respawn"}).ok).toBe(false);
});
