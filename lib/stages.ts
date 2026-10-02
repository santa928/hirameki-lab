import seeds from './stage-seeds.json' with {type:'json'};
import outlines from './stage-outline.json' with {type:'json'};
import {generate,type Puzzle} from './puzzles.ts';

// JSON imports infer numeric arrays; the offline builder and replay audit validate every pair.
const schedule=seeds as unknown as Record<string,[number,number][][]>;
export type CoursePhase={theme:number;start:number;end:number;goal:string};
const courses=outlines as Record<string,{totalStages:number;phases:CoursePhase[]}>;
export function stageCount(id:string){return courses[id]?.totalStages||0;}
export function coursePhases(id:string){return courses[id]?.phases||[];}
export function stageInfo(id:string,stage:number){
 const course=courses[id];
 if(!course||!Number.isInteger(stage)||stage<1||stage>course.totalStages)throw Error(`Invalid stage: ${id}/${stage}`);
 const phase=course.phases.find(p=>stage>=p.start&&stage<=p.end)!;
 const position=stage-phase.start+1,total=phase.end-phase.start+1;
 return {stage,theme:phase.theme,position,total,level:schedule[id][stage-1][0][0],mission:`${position} / ${total}`,goal:phase.goal};
}
export function generateStage(id:string,stage:number,index:number):Puzzle{
 stageInfo(id,stage);
 if(!Number.isInteger(index)||index<0||index>=10)throw Error('Invalid stage question');
 const question=schedule[id]?.[stage-1]?.[index];
 if(!question)throw Error(`Missing stage question: ${id}/${stage}/${index}`);
 return generate(id,question[0],question[1]);
}

export function courseIsComplete(id:string,records:Record<string,number>){const total=stageCount(id);return total>0&&Array.from({length:total},(_,i)=>i+1).every(stage=>(records[stage]||0)>0);}
