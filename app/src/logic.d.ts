export const meta:any;
export function setup(players:any[]):any;
export function validateAction(state:any,playerId:string,action:any):{ok:boolean;error?:string};
export function applyAction(state:any,playerId:string,action:any):any;
export function isGameOver(state:any):any;
export function viewFor(state:any,playerId:string):any;
