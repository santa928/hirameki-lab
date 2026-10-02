import type {Puzzle} from '../engine/shared.ts';
import {trialStep,checkTrial,directed} from '../engine/trial.ts';

export type ProgramState = {pos:number;dir:number;used:number};
export type ProgramFrame = {
  state:ProgramState;
  commandIndex:number|null;
  repetition:number|null;
  /** A complete command, or the initial frame. False substeps are preview only. */
  completed:boolean;
};
export type ProgramFailure = {
  code:'wall'|'boundary'|'command'|'budget';
  commandIndex:number;
  repetition:number|null;
  before:ProgramState;
  /** Wall cell index; null for an off-board move or a command validation error. */
  at:number|null;
  message:string;
};
export type ProgramGoal = {
  position:boolean;
  direction:boolean;
  withinBudget:boolean;
  withinActionLimit:boolean;
};
export type ProgramTrace = {
  frames:ProgramFrame[];
  /** Exactly the legal full replay, never a partial result of a failed command. */
  finalState:ProgramState|null;
  accepted:boolean;
  failure:ProgramFailure|null;
  /** Only evaluated when every command completed legally. */
  goal:ProgramGoal|null;
};
const snapshot=(state:ProgramState):ProgramState=>({...state});

/**
 * Explain a program from its original initial state without changing its puzzle,
 * actions, answer or history. Inputs use the existing programbot data schema.
 * A caller editing a command must discard the previous trace and recompute it.
 * Unsupported games return null. The existing engine remains authoritative.
 */
export function traceProgram(p:Pick<Puzzle,'id'|'data'>,actions:readonly unknown[]):ProgramTrace|null {
  if(p.id!=='programbot')return null;
  const d=p.data;
  let state:ProgramState=snapshot(d.initial);
  const frames:ProgramFrame[]=[{state:snapshot(state),commandIndex:null,repetition:null,completed:true}];
  const failed=(code:ProgramFailure['code'],commandIndex:number,repetition:number|null,before:ProgramState,at:number|null,message:string):ProgramTrace=>({
    frames,finalState:null,accepted:false,goal:null,
    failure:{code,commandIndex,repetition,before:snapshot(before),at,message},
  });
  for(let index=0;index<actions.length;index++) {
    const action=actions[index],next:ProgramState|null=trialStep(p,state,action);
    if(next===null) {
      if(!(d.allowed??['F','L','R','F2','F3']).includes(action))return failed('command',index,null,state,null,`${index+1}ばんめの めいれいは、この もんだいでは つかえないよ。`);
      if(state.used>=d.budget)return failed('budget',index,null,state,null,`めいれいは ${d.budget}こまでだよ。${index+1}ばんめを みなおそう。`);
    }

    if(typeof action==='string'&&action.startsWith('F')) {
      // Match the existing engine's F/F2/F3 count, without committing substeps.
      const count=action==='F'?1:Number(action[1]);
      let preview=snapshot(state);
      for(let repetition=0;repetition<count;repetition++) {
        const destination=directed(preview.pos,preview.dir,d.n);
        const prefix=`${index+1}ばんめの めいれいの ${repetition+1}かいめ`;
        if(destination<0)return failed('boundary',index,repetition,preview,null,`${prefix}は ばんの そとへ でてしまうよ。`);
        if(d.walls.includes(destination))return failed('wall',index,repetition,preview,destination,`${prefix}は ${Math.floor(destination/d.n)+1}ぎょう ${destination%d.n+1}れつの かべに あたるよ。`);
        preview={...preview,pos:destination};
        const completed=repetition===count-1;
        // Only a successful whole command spends one unit, as trialStep does.
        frames.push({state:snapshot(completed&&next!==null?next:preview),commandIndex:index,repetition,completed:completed&&next!==null});
      }
    } else if(next!==null) {
      frames.push({state:snapshot(next),commandIndex:index,repetition:null,completed:true});
    }
    // Normal programbot schemas fail only in the four explicit paths above.
    if(next===null)return failed('command',index,null,state,null,`${index+1}ばんめの めいれいを みなおそう。`);
    state=snapshot(next);
  }
  const goal:ProgramGoal={
    position:state.pos===d.target.pos,
    direction:state.dir===d.target.dir,
    withinBudget:state.used<=d.budget,
    withinActionLimit:actions.length<=2000,
  };
  return {
    frames,finalState:snapshot(state),failure:null,goal,
    // checkTrial reads only id/data and is also the authoritative history guard.
    accepted:checkTrial(p as Puzzle,Array.from(actions)),
  };
}
