import type {Puzzle} from '../engine/shared.ts';
import type {AnswerStatus,Feedback,FeedbackTarget} from '../feedback.ts';
import {traceProgram} from './program.ts';
export const PROGRAM_FEEDBACK_IDS=['programbot'] as const;
export function explainProgramAnswer(p:Puzzle,answer:any,status:AnswerStatus):Feedback|null {
 if(p.id!=='programbot'||status.accepted||!Array.isArray(answer))return null;
 const reason=(code:string,message:string,targets:FeedbackTarget[]=[],phase:Feedback['phase']=status.submitted?'invalid':'editing'):Feedback=>({code:`program.${code}`,message,targets,phase});
 if(!answer.length)return reason('incomplete','命令を並べて、ロボットの位置と向きを確かめよう。',[],'incomplete');
 const trace=traceProgram(p,answer);if(!trace)return null;
 if(trace.failure){const f=trace.failure;return reason(f.code,f.message,[{type:'command',index:f.commandIndex,...(f.repetition!==null?{repetition:f.repetition}:{})},...(f.at!==null?[{type:'cell' as const,index:f.at}]:[])]);}
 if(trace.accepted)return null;
 const state=trace.finalState!,goal=trace.goal!,d=p.data;
 if(!goal.withinActionLimit)return reason('action-limit','命令の履歴は2000こまで。命令を減らしてやり直そう。');
 if(!goal.withinBudget)return reason('budget',`命令は ${d.budget}こまで。今は ${state.used}こ使っているよ。`);
 const position=`今は ${Math.floor(state.pos/d.n)+1}ぎょう ${state.pos%d.n+1}れつ。星の ${Math.floor(d.target.pos/d.n)+1}ぎょう ${d.target.pos%d.n+1}れつまで動こう。`;
 const direction=`今の向きは ${['↑','→','↓','←'][state.dir]}。星では ${['↑','→','↓','←'][d.target.dir]}を向いて止まろう。`;
 return reason(!goal.position?'goal-position':'goal-direction',!goal.position?position+(goal.direction?'':direction):direction,[{type:'cell',index:state.pos},{type:'cell',index:d.target.pos}]);
}
