import type {Puzzle} from './engine/shared.ts';
import {diagnoseTrialAction} from './feedback/trial.ts';
import {explainLogicAnswer,LOGIC_FEEDBACK_IDS} from './feedback/logic.ts';
import {explainPlaneAnswer,PLANE_FEEDBACK_IDS} from './feedback/plane.ts';
import {explainSpaceAnswer,SPACE_FEEDBACK_IDS} from './feedback/space.ts';
import {explainTrialAnswer,TRIAL_ANSWER_FEEDBACK_IDS} from './feedback/trial-answer.ts';
import {explainProgramAnswer,PROGRAM_FEEDBACK_IDS} from './feedback/program-answer.ts';
import {explainNumberAnswer,NUMBER_FEEDBACK_IDS} from './feedback/number.ts';

export type FeedbackTarget = {
 type:'cell'|'edge'|'card'|'constraint'|'command'|'observation'|'piece';index:number;repetition?:number;
};
export type Feedback = {code:string;message:string;targets:FeedbackTarget[];phase:'incomplete'|'editing'|'invalid'|'correct'};
export type AnswerStatus = {accepted:boolean;submitted?:boolean;incomplete?:boolean};
type Adapter=(p:Puzzle,answer:any,status:AnswerStatus)=>Feedback|null;
const adapters:Record<string,Adapter>={
 ...Object.fromEntries(LOGIC_FEEDBACK_IDS.map(id=>[id,explainLogicAnswer])),
 ...Object.fromEntries(PLANE_FEEDBACK_IDS.map(id=>[id,explainPlaneAnswer])),
 ...Object.fromEntries(SPACE_FEEDBACK_IDS.map(id=>[id,explainSpaceAnswer])),
 ...Object.fromEntries(TRIAL_ANSWER_FEEDBACK_IDS.map(id=>[id,explainTrialAnswer])),
 ...Object.fromEntries(PROGRAM_FEEDBACK_IDS.map(id=>[id,explainProgramAnswer])),
 ...Object.fromEntries(NUMBER_FEEDBACK_IDS.map(id=>[id,explainNumberAnswer])),
};
/** Registered adapters only; this list does not claim every data variant or UI is verified. */
export const ANSWER_FEEDBACK_IDS:readonly string[]=Object.freeze(Object.keys(adapters));
/** Caller acceptance is authoritative. null is accepted, unsupported, or no derived violation. */
export function explainAnswer(p:Puzzle,answer:any,status:AnswerStatus):Feedback|null {
 if(status.accepted)return null;
 if(!Object.hasOwn(adapters,p.id))return null;
 const adapter=adapters[p.id];
 const options={...status,submitted:status.submitted===true};
 const feedback=adapter(p,answer,options);if(!feedback)return null;
 if(feedback.phase==='incomplete')return feedback;
 return {...feedback,phase:status.incomplete||!options.submitted||feedback.phase==='editing'?'editing':'invalid'};
}
/** A null result means legal or not yet supported, never a new acceptance rule. */
export function explainRejectedAction(p:Pick<Puzzle,'id'|'data'>,state:any,action:any):Feedback|null {
 return diagnoseTrialAction(p,state,action);
}
