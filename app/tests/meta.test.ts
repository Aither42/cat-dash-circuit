import {describe,it,expect} from "vitest";
import * as l from "../src/logic.js";
describe("Race contract",()=>{it("supports 1–8 racers",()=>{expect(l.meta.minPlayers).toBe(1);expect(l.meta.maxPlayers).toBe(8);expect(l.meta.laps).toBe(3);});it("never sends a session credential in simulation",()=>{const v=l.viewFor(l.setup(["p"]),"p");expect(JSON.stringify(v)).not.toContain("token");});});

