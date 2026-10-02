import {roll} from '../engine/space.ts';
/** Face order matches engine roll: top, bottom, north/back, south/front, east/right, west/left. */
export type CubeFaces = readonly [number,number,number,number,number,number];
export type RollDirection = 0|1|2|3;
export type CubePose = {readonly top:number;readonly bottom:number;readonly north:number;readonly south:number;readonly east:number;readonly west:number};
export type RollState = {readonly step:number;readonly move:RollDirection|null;readonly faces:CubeFaces;readonly pose:CubePose};
function freeze<T>(value:T):T{
 if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}
 return value;
}
function state(faces:number[],step:number,move:RollDirection|null):RollState {
 const [top,bottom,north,south,east,west]=faces;
 return {step,move,faces:[top,bottom,north,south,east,west],pose:{top,bottom,north,south,east,west}};
}
/** ↑ north, → east, ↓ south, ← west. All six faces are retained after each move. */
export function rollTrace(faces:readonly number[],moves:readonly number[]){
 if(faces.length!==6||faces.some(v=>!Number.isFinite(v)))throw new Error('Invalid cube faces');
 if(moves.some(v=>!Number.isInteger(v)||v<0||v>3))throw new Error('Invalid roll move');
 let current=[...faces];
 const states:RollState[]=[state(current,0,null)];
 for(const [i,move] of moves.entries()){
  current=roll(current,move);
  states.push(state(current,i+1,move as RollDirection));
 }
 return freeze({states,end:[...current] as unknown as CubeFaces});
}
