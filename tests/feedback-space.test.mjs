import assert from 'node:assert/strict';import {test}from'node:test';
import{explainSpaceAnswer,SPACE_FEEDBACK_IDS}from'../lib/feedback/space.ts';
import{generate,optionAnswer}from'../lib/puzzles.ts';
const p=(id,data,options,kind='visual-choice')=>({id,data,options,kind,solution:0,level:1,seed:0,hint:''});
test('hand fixtures identify physical rules, not selected solution indices',()=>{
 const cases=[
 [p('cubes',{cubes:[[0,0,0],[0,0,1]]},[1,2],'choice'),1,'count'],
 [p('contact3d',{target:[0,0,0],cells:[[0,0,0],[1,0,0],[1,1,0]]},[2,1]),0,'contact'],
 [p('viewbuild',{views:[[[0,0]],[[0,0]],[[0,0]]]},[{type:'cubes',cells:[[0,0,0],[0,0,1]]}]),0,'projection'],
 [p('gears',{links:['crossed','belt'],start:1,end:0},['↻','↺']),0,'gears'],
 [p('gravitytray',{n:3,walls:[],balls:[0,1],moves:[1]},[{type:'grid',values:['','','●','','','','','','●']}]),0,'stop'],
 [p('hinge3d',{points:[[0,0,0],[1,0,0],[2,0,0]],turns:[{pivot:1,axis:2,q:1}]},[{type:'wire3d',points:[[0,0,0],[0,1,0],[0,2,0]]}]),0,'hinge'],
 [p('depthorder',{positions:[[0,0],[1,1],[2,2]],dir:0,observedDirection:0,rank:1,sideRank:2,reasoningSteps:3,scene:{type:'spatialmap',n:3}},[1,2,3]),0,'depth'],
 ];
 for(const [puzzle,answer,part]of cases){const f=explainSpaceAnswer(puzzle,answer,{accepted:false,submitted:true});assert.equal(f.phase,'invalid');assert.ok(f.code.includes(part),f.code);assert.ok(f.targets.length);const other=structuredClone(puzzle);other.solution=99;assert.deepEqual(explainSpaceAnswer(other,answer,{accepted:false,submitted:true}),f);}
});
test('accepted override, unfinished editing, and unknown coverage stay distinct',()=>{
 const puzzle=p('cubes',{cubes:[[0,0,0]]},[1,2],'choice');
 assert.equal(explainSpaceAnswer(puzzle,999,{accepted:true}),null);
 assert.equal(explainSpaceAnswer(puzzle,[],{accepted:false}).phase,'incomplete');
 assert.equal(explainSpaceAnswer(puzzle,2,{accepted:false,submitted:false}).phase,'editing');
 assert.equal(explainSpaceAnswer({...puzzle,id:'unknown'},2,{accepted:false}),null);
});
test('all manifested IDs / concept levels derive wrong reasons without mutation',()=>{
 assert.equal(SPACE_FEEDBACK_IDS.length,21);
 for(const id of SPACE_FEEDBACK_IDS)for(const level of [1,5,9,13,17,20])for(const seed of [14,73021]){
  const puzzle=generate(id,level,seed),before=JSON.stringify(puzzle);const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}};freeze(puzzle);
  const valid=optionAnswer(puzzle,puzzle.options.findIndex((_,i)=>puzzle.kind==='visual-choice'||['shape','cubes'].includes(puzzle.data.optionType)?i===puzzle.solution:puzzle.options[i]===puzzle.solution));
  assert.equal(explainSpaceAnswer(puzzle,valid,{accepted:true}),null,id);
  for(let wrongIndex=0;wrongIndex<puzzle.options.length;wrongIndex++){const answer=optionAnswer(puzzle,wrongIndex);if(answer===valid)continue;
  const reason=explainSpaceAnswer(puzzle,answer,{accepted:false,submitted:true});
  assert.ok(reason,id+':'+level);assert.equal(reason.phase,'invalid',id+':'+level);assert.ok(reason.targets.length,id);
  assert.ok(!reason.message.includes('候補が違う'),id);
  assert.equal(JSON.stringify(puzzle),before,id);}
 }
});

test('depth reference conditions explain the visible relative rule, not hidden rank',()=>{
 const puzzle=p('depthorder',{positions:[[0,0],[1,1],[2,2],[3,3]],dir:0,observedDirection:0,rank:3,reasoningSteps:2,prompt:'Bより おくで、いちばん てまえは？',scene:{type:'spatialmap',n:4}},['A','B','C','D']);
 for(const [answer,relation] of [[0,'手前'],[1,'同じ塔'],[3,'間には1個']]){
  const f=explainSpaceAnswer(puzzle,answer,{accepted:false,submitted:true});
  assert.ok(f.message.includes('B'),f.message);assert.ok(f.message.includes(relation),f.message);
  assert.ok(f.message.includes('すぐ奥'),f.message);assert.ok(!f.message.includes('問題の3番目'),f.message);
 }
 assert.equal(explainSpaceAnswer(puzzle,2,{accepted:false,submitted:true}),null);
 const generated=generate('depthorder',13,14);
 assert.equal(generated.data.prompt,'Dより おくで、いちばん てまえは？');
 const same=generated.options.indexOf('D'),f=explainSpaceAnswer(generated,same,{accepted:false,submitted:true});
 assert.ok(f.message.includes('同じ塔'),f.message);assert.ok(!f.message.includes('問題の3番目'),f.message);
});
