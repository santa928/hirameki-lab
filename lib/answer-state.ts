import type {Puzzle} from './engine/shared.ts';
export type AnswerCompletion={supported:boolean;complete:boolean;remaining:number};
/** Completeness is presentation state only. The existing judge decides validity. */
export function answerCompletion(p:Pick<Puzzle,'kind'|'data'>,answer:any):AnswerCompletion {
 const d=p.data,kind=p.kind;
 let required:number,filled:(value:any)=>boolean;
 if(kind==='arrange'){required=d.values.length;filled=()=>true;}
 else if(kind==='sudoku'){required=d.n*d.n;filled=v=>Number.isInteger(v)&&v>0;}
 else if(kind==='assignment'){required=d.n;filled=v=>Number.isInteger(v)&&v>=0;}
 else if(kind==='district'){required=d.n*d.rows;filled=v=>Number.isInteger(v)&&v>=0;}
 else if(kind==='region-color'){required=d.k;filled=v=>Number.isInteger(v)&&v>=0;}
 else return {supported:false,complete:false,remaining:0};
 const count=Array.isArray(answer)?answer.filter(filled).length:0;
 return {supported:true,complete:Array.isArray(answer)&&answer.length===required&&count===required,remaining:Math.max(0,required-count)};
}
