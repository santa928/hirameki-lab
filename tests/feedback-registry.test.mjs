import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as registry from '../lib/feedback.ts';
import {generate,check,optionAnswer} from '../lib/puzzles.ts';
const p=(id,kind,data)=>({id,kind,data,level:1,seed:0,solution:null,hint:''});
function explain(p,a,status){assert.equal(typeof registry.explainAnswer,'function');return registry.explainAnswer(p,a,status);}
test('accepted caller verdict bypasses every domain, even a contradictory local answer',()=>{
 for(const id of ['mirror','cubes','zebra','programbot','ballweigh','count'])assert.equal(explain(p(id,'choice',{}),null,{accepted:true,submitted:true}),null);
});
test('unsupported IDs never receive generic completion or rejection',()=>{for(const id of ['unknown','toString','constructor','__proto__'])assert.equal(explain(p(id,'choice',{}),4,{accepted:false,submitted:true}),null);});
test('shared window normalizes editing and submitted violation without judging anew',()=>{
 const puzzle=p('sudoku','sudoku',{n:4,bw:2,initial:Array(16).fill(0)}),a=[1,1,3,4,3,4,1,2,2,3,4,1,4,2,2,3],before=JSON.stringify({puzzle,a});
 assert.equal(explain(puzzle,a,{accepted:false}).phase,'editing');
 assert.equal(explain(puzzle,a,{accepted:false,submitted:true}).phase,'invalid');
 assert.equal(explain(puzzle,a,{accepted:false,submitted:true,incomplete:true}).phase,'editing');
 assert.equal(JSON.stringify({puzzle,a}),before);
});
test('unfinished domains remain incomplete and partial conflicts stay editing',()=>{
 const sudoku=p('sudoku','sudoku',{n:4,bw:2,initial:Array(16).fill(0)});
 assert.equal(explain(sudoku,Array(16).fill(0),{accepted:false,submitted:true}).phase,'incomplete');
 assert.equal(explain(sudoku,[1,1,...Array(14).fill(0)],{accepted:false,submitted:true}).phase,'editing');
});
test('count explanation derives displayed circles and gap capacity, not a stored answer',()=>{
 const puzzle=p('count','choice',{positions:[0,1,2,6,7,8],layout:'gaps',capacity:12,count:99});
 const f=explain(puzzle,8,{accepted:false,submitted:true});assert.equal(f.code,'number.count.over');assert.match(f.message,/12.*6.*6/);assert.match(f.message,/8/);assert.equal(f.phase,'invalid');
 assert.equal(explain(puzzle,6,{accepted:false,submitted:true}),null);
 assert.equal(explain(puzzle,undefined,{accepted:false,submitted:true}).phase,'incomplete');
});
test('count grouped stages and legacy data give quantity-specific reasons',()=>{
 for(const layout of ['dice','fives','tens','clusters']){const f=explain(p('count','choice',{positions:[0,1,2,6,7,8],layout}),4,{accepted:false});assert.equal(f.code,'number.count.under');assert.match(f.message,/4.*6|6.*4/);assert.equal(f.phase,'editing');}
 for(const level of [1,5,9,13,17]){const q=generate('count',level,39),before=JSON.stringify(q);for(let i=0;i<q.options.length;i++){const a=optionAnswer(q,i);const f=explain(q,a,{accepted:check(q,a),submitted:true});assert.equal(f===null,check(q,a));}assert.equal(JSON.stringify(q),before);}
});
test('program executes partial F3 only for explanation and reports the exact failure command',()=>{
 const q=p('programbot','trial',{n:3,initial:{pos:0,dir:1,used:0},target:{pos:8,dir:2},walls:[2],budget:4,allowed:['F','F3','R']});
 const a=['F3'],before=JSON.stringify({q,a}),f=explain(q,a,{accepted:false,submitted:true});assert.equal(f.code,'program.wall');assert.deepEqual(f.targets,[{type:'command',index:0,repetition:1},{type:'cell',index:2}]);assert.equal(JSON.stringify({q,a}),before);
});
test('legal program distinguishes goal position and direction instead of generic failure',()=>{
 const d={n:3,initial:{pos:0,dir:1,used:0},target:{pos:1,dir:2},walls:[],budget:4,allowed:['F','R']},q=p('programbot','trial',d);
 assert.equal(explain(q,['F'],{accepted:false,submitted:true}).code,'program.goal-direction');
 assert.equal(explain(q,['R'],{accepted:false,submitted:true}).code,'program.goal-position');
 assert.equal(explain(q,[],{accepted:false,submitted:true}).phase,'incomplete');
});
test('trial answer explains current goal shortfall and submitted budget separately',()=>{
 const q=p('bridge','trial',{n:2,times:[2,3],budget:2,initial:{banks:[0,0],boat:0,time:0}});
 const f=explain(q,[{riders:[0,1]}],{accepted:false,submitted:true});assert.equal(f.code,'trial.bridge.time');assert.match(f.message,/3.*2/);assert.equal(f.phase,'invalid');
 assert.equal(explain(q,[],{accepted:false}).phase,'incomplete');
});
test('sole ball candidate needs a guess and a wrong eliminated ball names its observation',()=>{
 const q=p('ballweigh','trial',{n:3,culprit:0,budget:1,initial:{candidates:[0,1,2],observations:[],guess:null}}),a=[{left:[0],right:[1]}];
 const f=explain(q,a,{accepted:false,submitted:true});assert.equal(f.code,'trial.ballweigh.guess-needed');assert.doesNotMatch(f.message,/はかって|さらに/);
 const bad=registry.explainRejectedAction(q,{candidates:[0],observations:[{left:[0],right:[1],result:-1}],guess:null},{guess:1});assert.equal(bad.code,'trial.ballweigh.eliminated');assert.deepEqual(bad.targets,[{type:'card',index:1},{type:'observation',index:0}]);assert.doesNotMatch(bad.message,/はかって|さらに/);
});
test('all rejected-move trial domains explain their current goal state without mutating history',()=>{
 const fixtures=[
 ['sokoban',{n:3,walls:[],goals:[8],initial:{pos:0,boxes:[1]}},'goals','cell'],
 ['pegs',{n:3,initial:[0,1]},'remaining','cell'],
 ['frogs',{initial:[1,0,-1],target:[-1,0,1]},'positions','cell'],
 ['traffic',{n:5,cars:[{axis:'h',lane:0,len:2}],initial:[0]},'exit','piece'],
 ['keydoors',{n:3,walls:[],doors:[],goal:8,initial:{pos:0,keys:0}},'goal','cell'],
 ['twobots',{n:3,walls:[],target:[6,7],initial:{positions:[0,1]}},'goals','piece'],
 ['jugs',{caps:[3,5],target:[0,4],initial:[0,0]},'amount','piece'],
 ['river',{n:2,capacity:1,conflicts:[],initial:{banks:[0,0],boat:0}},'bank','piece'],
 ];
 for(const [id,data,code,type] of fixtures){const q=p(id,'trial',data),a=[],before=JSON.stringify({q,a}),f=explain(q,a,{accepted:false,submitted:true});assert.equal(f.code,`trial.${id}.${code}`);assert.equal(f.phase,'incomplete');assert.ok(f.targets.some(t=>t.type===type));assert.equal(JSON.stringify({q,a}),before);}
});

test('count visual choices resolve submitted indices to displayed quantities and exact card targets',()=>{
 const q={...p('count','visual-choice',{positions:[0,1,2,6,7,8],layout:'clusters'}),options:[9,6,4],solution:1};
 for(const [a,code] of [[0,'over'],[2,'under']]){const f=explain(q,a,{accepted:false,submitted:true});assert.equal(f.code,`number.count.${code}`);assert.match(f.message,new RegExp(`選んだ ${q.options[a]}こ`));assert.deepEqual(f.targets[0],{type:'card',index:a});}
 assert.equal(explain(q,1,{accepted:false,submitted:true}),null);
 const direct={...q,kind:'choice'};assert.equal(explain(direct,9,{accepted:false,submitted:true}).code,'number.count.over');assert.deepEqual(explain(direct,9,{accepted:false,submitted:true}).targets[0],{type:'card',index:0});
 for(const a of [-1,3,1.5,'0']){const f=explain(q,a,{accepted:false,submitted:true});assert.equal(f.code,'number.count.number');assert.ok(!f.targets.some(t=>t.type==='card'));}
 assert.equal(explain(q,0,{accepted:true,submitted:true}),null);
});
test('count every stage Q1 obeys actual optionAnswer/check boundary without mutating source',async()=>{
 const {generateStage,stageCount}=await import('../lib/stages.ts');
 for(let stage=1;stage<=stageCount('count');stage++){
  const q=generateStage('count',stage,0),before=JSON.stringify(q);
  for(let index=0;index<q.options.length;index++){
   const a=optionAnswer(q,index),accepted=check(q,a),f=explain(q,a,{accepted,submitted:true});
   assert.equal(f===null,accepted,`stage${stage}/card${index}`);
   if(f){assert.match(f.message,new RegExp(`選んだ ${q.options[index]}こ`));assert.deepEqual(f.targets[0],{type:'card',index});}
  }
  assert.equal(JSON.stringify(q),before,`stage${stage}: immutable`);
 }
});
