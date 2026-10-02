import assert from 'node:assert/strict';
import {test} from 'node:test';
import {explainRejectedAction} from '../lib/feedback.ts';
import {TRIAL_FEEDBACK_IDS} from '../lib/feedback/trial.ts';
import {generate} from '../lib/puzzles.ts';
import {trialStep} from '../lib/engine/trial.ts';

const puzzle=(id,data)=>({id,data});
const grid=puzzle('sokoban',{n:3,walls:[1]});
const cases=[
 ['sokoban boundary',grid,{pos:0,boxes:[]},0,'sokoban.boundary',[]],
 ['sokoban wall',grid,{pos:0,boxes:[]},1,'sokoban.wall',[{type:'cell',index:1}]],
 ['sokoban box boundary',puzzle('sokoban',{n:3,walls:[]}),{pos:1,boxes:[2]},1,'sokoban.box-boundary',[{type:'cell',index:2}]],
 ['sokoban box wall',puzzle('sokoban',{n:3,walls:[2]}),{pos:0,boxes:[1]},1,'sokoban.box-wall',[{type:'cell',index:2}]],
 ['sokoban second box',puzzle('sokoban',{n:3,walls:[]}),{pos:0,boxes:[1,2]},1,'sokoban.box-blocked',[{type:'cell',index:2}]],
 ['pegs distance',puzzle('pegs',{n:3}),[0,1],{from:0,to:4},'pegs.distance',[]],
 ['pegs missing middle',puzzle('pegs',{n:3}),[0],{from:0,to:2},'pegs.middle',[{type:'cell',index:1}]],
 ['pegs occupied',puzzle('pegs',{n:3}),[0,1,2],{from:0,to:2},'pegs.occupied',[{type:'cell',index:2}]],
 ['frogs backwards',puzzle('frogs',{}),[0,1,-1],1,'frogs.backwards',[{type:'cell',index:1}]],
 ['frogs too far',puzzle('frogs',{}),[1,-1,-1,0],0,'frogs.distance',[{type:'cell',index:0}]],
 ['frogs same team',puzzle('frogs',{}),[1,1,0],0,'frogs.jump',[{type:'cell',index:1}]],
 ['traffic boundary',puzzle('traffic',{n:3,cars:[{axis:'h',lane:0,len:2}]}),[0],{car:0,delta:-1},'traffic.boundary',[]],
 ['traffic collision',puzzle('traffic',{n:3,cars:[{axis:'h',lane:0,len:2},{axis:'v',lane:2,len:2}]}),[0,0],{car:0,delta:1},'traffic.collision',[{type:'piece',index:1},{type:'cell',index:2}]],
 ['keydoors missing key',puzzle('keydoors',{n:3,walls:[],keys:[5],doors:[1]}),{pos:0,keys:0},1,'keydoors.key',[{type:'cell',index:1}]],
 ['keydoors wall',puzzle('keydoors',{n:3,walls:[1],keys:[],doors:[]}),{pos:0,keys:0},1,'keydoors.wall',[{type:'cell',index:1}]],
 ['twobots collide',puzzle('twobots',{n:3,walls:[2]}),{positions:[0,1]},1,'twobots.collision',[{type:'cell',index:1}]],
 ['twobots both stopped',puzzle('twobots',{n:3,walls:[]}),{positions:[0,1]},0,'twobots.stopped',[{type:'cell',index:0},{type:'cell',index:1}]],
 ['bridge no riders',puzzle('bridge',{n:2,times:[1,2]}),{banks:[0,0],boat:0,time:0},{riders:[]},'bridge.empty',[]],
 ['river capacity',puzzle('river',{n:3,capacity:1,conflicts:[]}),{banks:[0,0,0],boat:0},{riders:[0,1]},'river.capacity',[]],
 ['river wrong bank',puzzle('river',{n:2,capacity:1,conflicts:[]}),{banks:[0,1],boat:0},{riders:[1]},'river.bank',[{type:'piece',index:1}]],
 ['river unsafe empty crossing',puzzle('river',{n:2,capacity:1,conflicts:[[0,1]]}),{banks:[0,0],boat:0},{riders:[]},'river.conflict',[{type:'piece',index:0},{type:'piece',index:1}]],
 ['jugs already full',puzzle('jugs',{caps:[3,5]}),[3,2],{type:'fill',from:0},'jugs.full',[{type:'piece',index:0}]],
 ['jugs already empty',puzzle('jugs',{caps:[3,5]}),[0,2],{type:'empty',from:0},'jugs.empty',[{type:'piece',index:0}]],
 ['jugs pour from empty',puzzle('jugs',{caps:[3,5]}),[0,2],{type:'pour',from:0,to:1},'jugs.source-empty',[{type:'piece',index:0}]],
 ['jugs pour into full',puzzle('jugs',{caps:[3,5]}),[2,5],{type:'pour',from:0,to:1},'jugs.destination-full',[{type:'piece',index:1}]],
 ['jugs same container',puzzle('jugs',{caps:[3,5]}),[2,2],{type:'pour',from:0,to:0},'jugs.same',[{type:'piece',index:0}]],
];
for(const [name,p,state,action,code,targets] of cases)test(name,()=>{
 const before=JSON.stringify({p,state,action});
 assert.equal(trialStep(p,state,action),null,'fixture must be rejected by the existing rule');
 const result=explainRejectedAction(p,state,action);
 assert.equal(result?.code,`trial.${code}`);
 assert.deepEqual(result.targets,targets);
 assert.equal(result.phase,'invalid');
 assert.ok(result.message.length>5);
 assert.equal(JSON.stringify({p,state,action}),before);
});

test('one remaining ball explains the eliminating observation, with no extra weighing instruction',()=>{
 const p=puzzle('ballweigh',{n:3,budget:1,culprit:1});
 const state={candidates:[1],observations:[{left:[0],right:[1],result:1}]};
 const before=JSON.stringify({p,state});
 const result=explainRejectedAction(p,state,{guess:0});
 assert.equal(result?.code,'trial.ballweigh.eliminated');
 assert.deepEqual(result.targets,[{type:'card',index:0},{type:'observation',index:0}]);
 assert.match(result.message,/1かいめ.*みぎ.*かるい/);
 assert.doesNotMatch(result.message,/ほかの.*こうほ|はかって|もういちど はか|さらに/);
 assert.equal(explainRejectedAction(p,state,{guess:1}),null);
 assert.equal(JSON.stringify({p,state}),before);
});
test('remaining candidates and weighing budget give different instructions',()=>{
 const p=puzzle('ballweigh',{n:5,budget:1,culprit:2});
 const open=explainRejectedAction(p,{candidates:[0,1,2,3,4],observations:[]},{guess:0});
 assert.equal(open?.code,'trial.ballweigh.ambiguous');
 assert.match(open.message,/こうほ.*5/);
 assert.match(open.message,/はか/);
 const exhaustedState=trialStep(p,{candidates:[0,1,2,3,4],observations:[]},{left:[0],right:[1]});
 const exhausted=explainRejectedAction(p,exhaustedState,{guess:2});
 assert.equal(exhausted?.code,'trial.ballweigh.exhausted');
 assert.doesNotMatch(exhausted.message,/はかって|もういちど はか|さらに/);
 assert.match(exhausted.message,/もどす|やりなおす/);
});
test('weighing rejects unequal sides, duplicate balls, empty side and exhausted attempts separately',()=>{
 const p=puzzle('ballweigh',{n:4,budget:1,culprit:1}),state={candidates:[0,1,2,3],observations:[]};
 for(const [action,code] of [[{left:[],right:[]},'empty'],[{left:[0],right:[1,2]},'unequal'],[{left:[0],right:[0]},'duplicate']]){
  assert.equal(explainRejectedAction(p,state,action)?.code,`trial.ballweigh.${code}`);
 }
 assert.equal(explainRejectedAction(p,{...state,observations:[{}]},{left:[0],right:[1]})?.code,'trial.ballweigh.no-weighings');
});
test('a blocked bot, an empty river crossing and over-budget bridge time can be legal',()=>{
 const examples=[
 [puzzle('twobots',{n:3,walls:[2]}),{positions:[1,3]},1],
 [puzzle('river',{n:2,capacity:1,conflicts:[[0,1]]}),{banks:[0,1],boat:0},{riders:[]}],
 [puzzle('bridge',{n:2,times:[1,4],budget:1}),{banks:[0,0],boat:0,time:0},{riders:[1]}],
 ];
 for(const [p,state,action] of examples){assert.notEqual(trialStep(p,state,action),null);assert.equal(explainRejectedAction(p,state,action),null);}
});
test('unsupported games do not claim a generic diagnosis',()=>{
 assert.equal(explainRejectedAction(puzzle('programbot',{}),{},'F'),null);
 assert.equal(explainRejectedAction(puzzle('unknown',{}),{},null),null);
});
test('legal generated solution trajectories never receive rejection feedback and remain immutable',()=>{
 for(const id of TRIAL_FEEDBACK_IDS)for(const level of [1,10,20])for(const seed of [0,42]){
  const p=generate(id,level,seed),pBefore=JSON.stringify(p);
  let state=structuredClone(p.data.initial);
  for(const action of p.solution){
   const before=JSON.stringify({state,action});
   const next=trialStep(p,state,action);
   assert.notEqual(next,null,`${id}/${level}/${seed} legal fixture`);
   assert.equal(explainRejectedAction(p,state,action),null,`${id}/${level}/${seed}`);
   assert.equal(JSON.stringify({state,action}),before);
   state=next;
  }
  assert.equal(JSON.stringify(p),pBefore);
 }
});

test('all sampled UI actions match existing legality at every generated solution state',()=>{
 function actions(p,state){
  const d=p.data;
  if(['sokoban','keydoors','twobots'].includes(p.id))return [0,1,2,3];
  if(p.id==='frogs')return state.map((_,i)=>i);
  if(p.id==='pegs')return state.flatMap(from=>Array.from({length:d.n*d.n},(_,to)=>({from,to})));
  if(p.id==='traffic')return d.cars.flatMap((_,car)=>[-1,1].map(delta=>({car,delta})));
  if(['river','bridge'].includes(p.id))return Array.from({length:2**d.n},(_,mask)=>({riders:Array.from({length:d.n},(_,i)=>i).filter(i=>mask&(1<<i))}));
  if(p.id==='jugs')return state.flatMap((_,from)=>[{type:'fill',from},{type:'empty',from},...state.map((_,to)=>({type:'pour',from,to}))]);
  if(p.id==='ballweigh')return Array.from({length:d.n},(_,guess)=>({guess})).concat(Array.from({length:Math.min(d.n,8)},(_,i)=>({left:[i],right:[(i+1)%d.n]})));
  return [];
 }
 for(const id of TRIAL_FEEDBACK_IDS)for(const level of [1,20]){
  const p=generate(id,level,42);let state=structuredClone(p.data.initial);
  for(const nextAction of [null,...p.solution]){
   if(nextAction!==null)state=trialStep(p,state,nextAction);
   for(const action of actions(p,state)){
    const before=JSON.stringify({p,state,action}),next=trialStep(p,state,action),feedback=explainRejectedAction(p,state,action);
    assert.equal(feedback===null,next!==null,`${id}/${level}: ${JSON.stringify(action)}`);
    if(feedback){assert.equal(feedback.phase,'invalid');assert.ok(feedback.message.length>5);}
    assert.equal(JSON.stringify({p,state,action}),before);
   }
  }
 }
});

test('null attempts are safely diagnosed for supported games',()=>{
 for(const id of TRIAL_FEEDBACK_IDS){const p=generate(id,1,42);assert.ok(explainRejectedAction(p,p.data.initial,null)?.message);}
});
