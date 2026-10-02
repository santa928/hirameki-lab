import type {Puzzle} from '../engine/shared.ts';
import {trialStep,trialGoal} from '../engine/trial.ts';
import {diagnoseTrialAction,TRIAL_FEEDBACK_IDS} from './trial.ts';
import type {AnswerStatus,Feedback,FeedbackTarget} from '../feedback.ts';
export const TRIAL_ANSWER_FEEDBACK_IDS=TRIAL_FEEDBACK_IDS;
/** Diagnose a replay, never commit a move or send an answer/score. */
export function explainTrialAnswer(p:Puzzle,answer:any,status:AnswerStatus):Feedback|null {
 if(status.accepted||!(TRIAL_ANSWER_FEEDBACK_IDS as readonly string[]).includes(p.id)||!Array.isArray(answer))return null;
 const d=p.data,{id}=p;
 const reason=(code:string,message:string,targets:FeedbackTarget[]=[],phase:Feedback['phase']='incomplete'):Feedback=>({code:`trial.${id}.${code}`,message,targets,phase});
 if(answer.length>2000)return reason('action-limit','操作の履歴は2000こまで。「やりなおす」で短い手順を考えよう。',[],status.submitted?'invalid':'editing');
 let state=structuredClone(d.initial);
 for(let i=0;i<answer.length;i++){
  const next=trialStep(p,state,answer[i]);
  if(next===null){const rejected=diagnoseTrialAction(p,state,answer[i]);return rejected?{...rejected,targets:[...rejected.targets,{type:'command',index:i}]}:null;}
  state=next;
 }
 if(trialGoal(p,state))return null;
 if(id==='bridge'){
  if(state.time>d.budget)return reason('time',`ここまで ${state.time}分。制限の ${d.budget}分を超えているよ。「もどす」で渡る組を考えよう。`,[{type:'constraint',index:0}],status.submitted?'invalid':'editing');
  const remaining=state.banks.flatMap((v:number,i:number)=>v===0?[{type:'piece' as const,index:i}]:[]);return reason('bank',`まだ ${remaining.length}人がこちら岸にいるよ。あかりと一緒に全員を向こう岸へ。`,remaining);
 }
 if(id==='ballweigh'){
  if(state.candidates.length===1)return reason('guess-needed','結果に合う候補は1こになったよ。その玉を答えに選ぼう。',state.candidates.map((index:number)=>({type:'card',index})));
  const remaining=d.budget-state.observations.length;
  return reason(remaining>0?'ambiguous':'exhausted',remaining>0?`候補は ${state.candidates.length}こ。あと ${remaining}回、同じ数ずつ比べて候補を分けよう。`:`候補が ${state.candidates.length}こ残り、計量回数は0回だよ。「もどす」か「やりなおす」で分け方を考えよう。`,[{type:'constraint',index:0}]);
 }
 if(id==='sokoban'){const missing=d.goals.filter((at:number)=>!state.boxes.includes(at));return reason('goals',`まだ ${missing.length}この目印に箱がないよ。箱を押して目印へ合わせよう。`,missing.map((index:number)=>({type:'cell',index})));}
 if(id==='pegs')return reason('remaining',`丸が ${state.length}こ残っているよ。縦横の丸を飛び越して、最後は1こにしよう。`,state.map((index:number)=>({type:'cell',index})));
 if(id==='frogs'){const wrong=state.flatMap((v:number,i:number)=>v!==d.target[i]?[{type:'cell' as const,index:i}]:[]);return reason('positions','まだ左右のカエルが全部入れ替わっていないよ。矢印の向きと空き場所を見て動かそう。',wrong);}
 if(id==='traffic'){const remaining=d.n-d.cars[0].len-state[0];return reason('exit',`目印の車は出口まであと ${remaining}マス。進路の車を動かして右へ出そう。`,[{type:'piece',index:0}]);}
 if(id==='keydoors')return reason('goal',`まだ星の ${Math.floor(d.goal/d.n)+1}ぎょう ${d.goal%d.n+1}れつに着いていないよ。鍵と同じ番号の扉を通ろう。`,[{type:'cell',index:d.goal}]);
 if(id==='twobots'){const wrong=state.positions.flatMap((v:number,i:number)=>v!==d.target[i]?[{type:'piece' as const,index:i},{type:'cell' as const,index:d.target[i]}]:[]);return reason('goals','まだふたりが自分の星に着いていないよ。片方が壁で止まる動きも使って合わせよう。',wrong);}
 if(id==='jugs'){const wrong=state.flatMap((v:number,i:number)=>v!==d.target[i]?[i]:[]);return reason('amount',wrong.map((i:number)=>`${String.fromCharCode(65+i)}は今 ${state[i]}、目標は ${d.target[i]}`).join('。')+'。満たす・空にする・注ぐで目標へ合わせよう。',wrong.map((index:number)=>({type:'piece',index})));}
 const remaining=state.banks.flatMap((v:number,i:number)=>v===0?[{type:'piece' as const,index:i}]:[]);
 return reason('bank',`まだ ${remaining.length}人がこちら岸にいるよ。けんかする組を船頭なしで残さず、全員を向こう岸へ。`,remaining);
}
