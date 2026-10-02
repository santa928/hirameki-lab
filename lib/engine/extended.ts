import{ORIGINAL_NUMBER_IDS,generateOriginalNumber,checkOriginalNumber}from'./original-number.ts';
import{SPACE_META,generateSpace,checkSpace}from'./space.ts';
import{PLANE_META,generatePlane,checkPlane}from'./plane.ts';
import{TRIAL_META,generateTrial,checkTrial}from'./trial.ts';
import{LOGIC_META,generateLogic,checkLogic}from'./logic.ts';
import{NUMBER_META,generateNumber,checkNumber}from'./number.ts';
import type{Puzzle}from'./shared.ts';
export const EXTENDED_META=[...SPACE_META,...PLANE_META,...TRIAL_META,...LOGIC_META,...NUMBER_META];
const domains=[{meta:SPACE_META,generate:generateSpace,check:checkSpace},{meta:PLANE_META,generate:generatePlane,check:checkPlane},{meta:TRIAL_META,generate:generateTrial,check:checkTrial},{meta:LOGIC_META,generate:generateLogic,check:checkLogic},{meta:NUMBER_META,generate:generateNumber,check:checkNumber}];
const byId=new Map(domains.flatMap(d=>d.meta.map(m=>[m[0],d] as const)));
export function generateExtended(id:string,level:number,seed:number){return generateOriginalNumber(id,level,seed)||byId.get(id)?.generate(id,level,seed);}
export function checkExtended(p:Puzzle,answer:any){if(p.data.logicCurriculum)return checkLogic(p,answer);if(ORIGINAL_NUMBER_IDS.includes(p.id))return checkOriginalNumber(p,answer);return byId.get(p.id)?.check(p,answer)??false;}
export function initialExtended(p:Puzzle){return p.kind==='trial'||p.data.initial===undefined?[]:JSON.parse(JSON.stringify(p.data.initial));}
