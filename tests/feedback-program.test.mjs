import assert from 'node:assert/strict';
import {test} from 'node:test';
import {traceProgram} from '../lib/feedback/program.ts';
import {generate} from '../lib/puzzles.ts';
import {replayTrial,checkTrial} from '../lib/engine/trial.ts';

const puzzle=(extra={})=>({id:'programbot',kind:'trial',level:1,seed:0,hint:'',solution:[],data:{n:3,walls:[],initial:{pos:6,dir:1,used:0},target:{pos:8,dir:1},budget:4,allowed:['F','L','R','F2','F3'],...extra}});

test('empty execution has an independent initial frame and an unmet position goal',()=>{
 const p=puzzle(),trace=traceProgram(p,[]);
 assert.deepEqual(trace.finalState,p.data.initial);
 assert.equal(trace.frames.length,1);
 assert.equal(trace.frames[0].commandIndex,null);
 assert.equal(trace.failure,null);
 assert.deepEqual(trace.goal,{position:false,direction:true,withinBudget:true,withinActionLimit:true});
 assert.equal(trace.accepted,false);
 assert.notEqual(trace.frames[0].state,p.data.initial);
 assert.notEqual(trace.finalState,p.data.initial);
});
test('legal F2 records each advance and spends one command, with replay parity',()=>{
 const p=puzzle(),trace=traceProgram(p,['F2']);
 assert.deepEqual(trace.frames.map(f=>[f.state.pos,f.state.used,f.commandIndex,f.repetition,f.completed]),[
  [6,0,null,null,true],[7,0,0,0,false],[8,1,0,1,true],
 ]);
 assert.deepEqual(trace.finalState,replayTrial(p,['F2']));
 assert.equal(trace.accepted,true);
 assert.equal(trace.accepted,checkTrial(p,['F2']));
});
test('F3 can be successful and reports three advances as one command',()=>{
 const p=puzzle({n:4,initial:{pos:12,dir:1,used:0},target:{pos:15,dir:1}}),trace=traceProgram(p,['F3']);
 assert.deepEqual(trace.frames.map(f=>f.state.pos),[12,13,14,15]);
 assert.equal(trace.finalState.used,1);
 assert.equal(trace.frames.at(-1).repetition,2);
 assert.equal(trace.accepted,true);
});
test('F2 wall on second advance exposes a preview, never a committed partial answer',()=>{
 const p=puzzle({walls:[8]}),actions=['F2'],before=JSON.stringify({p,actions}),trace=traceProgram(p,actions);
 assert.equal(trace.failure.code,'wall');
 assert.equal(trace.failure.commandIndex,0);
 assert.equal(trace.failure.repetition,1);
 assert.equal(trace.failure.at,8);
 assert.deepEqual(trace.failure.before,{pos:7,dir:1,used:0});
 assert.match(trace.failure.message,/1ばんめ.*2かいめ.*かべ/);
 assert.equal(trace.frames.at(-1).completed,false);
 assert.equal(trace.frames.at(-1).state.pos,7);
 assert.equal(trace.finalState,null);
 assert.equal(trace.goal,null);
 assert.equal(trace.accepted,false);
 assert.equal(replayTrial(p,actions),null);
 assert.equal(JSON.stringify({p,actions}),before);
});
test('F3 boundary on third advance reports the correct substep and last on-board position',()=>{
 const trace=traceProgram(puzzle(),['F3']);
 assert.equal(trace.failure.code,'boundary');
 assert.equal(trace.failure.repetition,2);
 assert.equal(trace.failure.at,null);
 assert.equal(trace.failure.before.pos,8);
 assert.equal(trace.failure.before.used,0);
 assert.equal(trace.finalState,null);
});
test('later command collision preserves earlier complete frames and ignores the suffix',()=>{
 const p=puzzle({walls:[8]}),trace=traceProgram(p,['F','F','L']);
 assert.equal(trace.failure.commandIndex,1);
 assert.equal(trace.failure.repetition,0);
 assert.deepEqual(trace.failure.before,{pos:7,dir:1,used:1});
 assert.deepEqual(trace.frames.map(f=>f.commandIndex),[null,0]);
 assert.equal(trace.frames.at(-1).completed,true);
 assert.equal(trace.finalState,null);
});
test('invalid command, allowed-but-over-budget command and wall are different failures',()=>{
 for(const action of ['NO',null,{},'F2']){
  const trace=traceProgram(puzzle({allowed:['F','L','R']}),[action]);
  assert.equal(trace.failure.code,'command');
  assert.equal(trace.failure.repetition,null);
  assert.equal(trace.finalState,null);
 }
 const p=puzzle({budget:1}),trace=traceProgram(p,['L','R']);
 assert.equal(trace.failure.code,'budget');
 assert.equal(trace.failure.commandIndex,1);
 assert.equal(trace.failure.repetition,null);
 assert.equal(trace.failure.before.used,1);
 assert.match(trace.failure.message,/1こまで/);
 assert.equal(trace.finalState,null);
});
test('turn frames keep position and report position/direction deficits separately',()=>{
 const cases=[
 [[],false,true],
 [['F2','L'],true,false],
 [['L'],false,false],
 [['F2','L','R'],true,true],
 ];
 for(const [actions,position,direction] of cases){
  const p=puzzle(),trace=traceProgram(p,actions);
  assert.equal(trace.goal.position,position);
  assert.equal(trace.goal.direction,direction);
  assert.equal(trace.accepted,position&&direction);
  assert.deepEqual(trace.finalState,replayTrial(p,actions));
 }
 const turns=traceProgram(puzzle(),['L','R']);
 assert.deepEqual(turns.frames.map(f=>[f.state.pos,f.state.dir,f.repetition]),[[6,1,null],[6,0,null],[6,1,null]]);
});
test('checkTrial history length guard remains separate from legal replay',()=>{
 const p=puzzle({budget:2100,target:{pos:6,dir:1}}),actions=Array(2004).fill('L'),trace=traceProgram(p,actions);
 assert.equal(trace.failure,null);
 assert.deepEqual(trace.finalState,replayTrial(p,actions));
 assert.equal(trace.goal.position,true);
 assert.equal(trace.goal.direction,true);
 assert.equal(trace.goal.withinActionLimit,false);
 assert.equal(trace.accepted,checkTrial(p,actions));
 assert.equal(trace.accepted,false);
});
test('already at the goal and unsupported games do not acquire false failures',()=>{
 const p=puzzle({target:{pos:6,dir:1}});
 assert.equal(traceProgram(p,[]).accepted,checkTrial(p,[]));
 assert.equal(traceProgram({id:'sokoban',data:{}},[]),null);
});
test('input snapshots remain immutable and output frames do not alias each other',()=>{
 const p=puzzle(),actions=['F2','L'],before=JSON.stringify({p,actions});
 Object.freeze(p.data.initial);Object.freeze(p.data.target);Object.freeze(p.data.walls);Object.freeze(p.data.allowed);Object.freeze(actions);
 const trace=traceProgram(p,actions);
 assert.equal(JSON.stringify({p,actions}),before);
 trace.frames[1].state.pos=0;
 assert.equal(p.data.initial.pos,6);
 assert.equal(trace.frames[2].state.pos,8);
 assert.equal(trace.finalState.pos,8);
});
test('generated prefixes and appended commands match replay and check without changing input',()=>{
 for(const level of [1,10,20])for(const seed of [0,42,73021]){
  const p=generate('programbot',level,seed),before=JSON.stringify(p);
  for(let count=0;count<=p.solution.length;count++)for(const suffix of [[],['F'],['F2'],['F3'],['L'],['R'],['NO']]){
   const actions=[...p.solution.slice(0,count),...suffix],trace=traceProgram(p,actions);
   assert.deepEqual(trace.finalState,replayTrial(p,actions),`${level}/${seed}/${count}/${suffix}`);
   assert.equal(trace.accepted,checkTrial(p,actions));
   assert.equal(trace.failure===null,trace.finalState!==null);
   if(trace.failure)assert.ok(trace.failure.commandIndex<actions.length);
  }
  assert.equal(JSON.stringify(p),before);
 }
});
