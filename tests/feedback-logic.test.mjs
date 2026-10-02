import assert from 'node:assert/strict';
import {test} from 'node:test';
import {explainLogicAnswer,LOGIC_FEEDBACK_IDS,LOGIC_FEEDBACK_COVERAGE} from '../lib/feedback/logic.ts';
import {generate,check} from '../lib/puzzles.ts';
import {checkLogic} from '../lib/engine/logic.ts';
import {generateStage} from '../lib/stages.ts';

const puzzle=(id,kind,data,options)=>({id,kind,data,options,level:1,seed:1,solution:null,hint:''});
const cell=index=>({type:'cell',index});
const edge=index=>({type:'edge',index});
const card=index=>({type:'card',index});
const constraint=index=>({type:'constraint',index});
const inspect=(p,a,submitted=true)=>explainLogicAnswer(p,a,{accepted:false,submitted});
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
const cases=[
 ['nonogram runs',puzzle('nonogram','binary-grid',{n:2,given:[-1,-1,-1,-1],rows:[[2],[0]],cols:[[1],[1]]}),[1,0,0,0],'runs',[constraint(0),cell(0),cell(1)]],
 ['minestars eight neighbors',puzzle('minestars','binary-grid',{n:2,given:[0,-1,-1,-1],counts:[0,0,0,0]}),[0,1,0,0],'neighbors',[cell(0),cell(1)]],
 ['binary triplet',puzzle('binary','binary-grid',{n:4,given:Array(16).fill(-1)}),[1,1,1,0,0,1,0,1,1,0,1,0,0,1,0,1],'triple',[cell(0),cell(1),cell(2)]],
 ['binary same count',puzzle('binary','binary-grid',{n:4,given:Array(16).fill(-1)}),[1,1,0,1,0,1,0,1,1,0,1,0,0,1,0,1],'balance',[constraint(0),cell(0),cell(1),cell(2),cell(3)]],
 ['binary identical rows',puzzle('binary','binary-grid',{n:4,given:Array(16).fill(-1)}),[0,1,0,1,0,1,0,1,1,0,1,0,1,0,1,0],'duplicate-lines',null],
 ['islands 2x2 sea',puzzle('islands','binary-grid',{n:3,given:Array(9).fill(-1),clues:{8:1}}),[1,1,1,1,1,1,1,1,0],'sea-square',[cell(0),cell(1),cell(3),cell(4)]],
 ['islands split sea',puzzle('islands','binary-grid',{n:2,given:Array(4).fill(-1),clues:{1:1,2:1}}),[1,0,0,1],'sea-connected',null],
 ['islands size',puzzle('islands','binary-grid',{n:2,given:[0,-1,-1,-1],clues:{0:1}}),[0,0,1,1],'island-size',null],
 ['islands number count',puzzle('islands','binary-grid',{n:2,given:[0,0,-1,-1],clues:{0:1,1:1}}),[0,0,1,1],'island-clues',null],
 ['tents touching',puzzle('tents','binary-grid',{n:3,given:Array(9).fill(-1),trees:[0,8],rows:[0,2,0],cols:[0,1,1]}),[0,0,0,0,1,1,0,0,0],'touching',[cell(4),cell(5)]],
 ['tents row count',puzzle('tents','binary-grid',{n:2,given:Array(4).fill(-1),trees:[0],rows:[0,1],cols:[0,1]}),[0,1,0,0],'row-count',null],
 ['bridges degree',puzzle('bridges','edge-grid',{nodes:[[0,0],[1,0]],edges:[[0,1]],degrees:[2,2],max:2}),[1],'degree',[constraint(0),edge(0)]],
 ['bridges disconnected',puzzle('bridges','edge-grid',{nodes:[0,1,2,3],edges:[[0,1],[2,3]],degrees:[1,1,1,1],max:2}),[1,1],'connected',null],
 ['loop clue',puzzle('loopclues','edge-grid',{nodes:[0,1],edges:[[0,1]],clues:[0],cellEdges:[[0]],max:1}),[1],'clue',[cell(0),edge(0)]],
 ['loop open end',puzzle('loopclues','edge-grid',{nodes:[0,1],edges:[[0,1]],clues:[null],cellEdges:[[0]],max:1}),[1],'vertex',null],
 ['mintree disconnected',puzzle('mintree','edge-grid',{nodes:[0,1,2],edges:[[0,1],[1,2]],weights:[1,2],minimum:3,max:1}),[1,0],'connected',null],
 ['mintree excess weight',puzzle('mintree','edge-grid',{nodes:[0,1,2],edges:[[0,1],[1,2],[0,2]],weights:[1,2,4],minimum:3,max:1}),[1,0,1],'weight',null],
 ['order before',puzzle('order','arrange',{values:['A','B','C'],clues:[],orderRules:[{op:'before',a:0,b:1}]}),[1,0,2],'before',[constraint(0),card(0),card(1)]],
 ['schedule precedence',puzzle('schedule','arrange',{values:['A','B','C'],clues:[[0,1]]}),[1,0,2],'before',[constraint(0),card(0),card(1)]],
 ['domino interior',puzzle('domino','domino-chain',{tiles:[[1,2],[3,4]],start:1,end:4}),{order:[0,1],flips:[false,false]},'joint',[card(0),card(1)]],
 ['set attribute',puzzle('settriple','card-select',{cards:[{shape:0,color:0,count:1},{shape:0,color:1,count:2},{shape:1,color:2,count:3}]}),[0,1,2],'shape',[card(0),card(1),card(2)]],
 ['venn excess',puzzle('venn','card-select',{cards:[{shape:0},{shape:1}],rule:{attr:'shape',value:0}}),[1],'extra',[card(1),constraint(0)]],
 ['odd good card',puzzle('odd','card-select',{cards:[{shape:0},{shape:1}],rule:{attr:'shape',value:0}}),[0],'fits-rule',[card(0),constraint(0)]],
 ['matrix row',puzzle('matrix','visual-choice',{n:3,values:[2,1,3,8,1,9,6,3,'？'],ruleFamily:'add'}),0,'row',[constraint(2),card(0)]],
 ['liar truth count',puzzle('liar','visual-choice',{people:['A','B','C'],trueCount:1,statements:[{members:[0],is:true},{members:[1],is:false}]} ,['A','B','C']),0,'truth-count',null],
 ['cipher forward',puzzle('cipher','visual-choice',{maps:[[1,2,0]],message:[0],reverse:false},['1','2']),0,'mapping',null],
 ['rulemachine shape',puzzle('rulemachine','visual-choice',{shift:{shape:1,color:0,count:0},target:{shape:0,color:0,count:1}},[{shape:0,color:0,count:1}]),0,'shape',null],
 ['family ancestor',puzzle('familytree','visual-choice',{parents:[-1,0,1],target:2,steps:1,relation:'ancestor',scene:{labels:['3','1','2']}},['3','1']),0,'ancestor',null],
 ['pattern periodic',puzzle('pattern','visual-choice',{period:2,scene:{items:[{type:'symbol',shape:0,color:0,count:1},{type:'symbol',shape:1,color:0,count:1},{type:'symbol',shape:0,color:0,count:1},{type:'symbol',shape:1,color:0,count:1},{type:'text',text:'？'}]}},[{shape:1,color:0,count:1}]),0,'shape',null],
 ['balance equation',puzzle('balance','visual-choice',{equations:['○○ ＝ 8','○ ＝ ？']},[5]),0,'equation',null],
 ['zebra duplicate',puzzle('zebra','assignment',{n:3,allowed:[[0,1,2],[0,1,2],[0,1,2]],relations:[]}),[0,0,2],'duplicate',[card(0),card(1)]],
 ['zebra displayed sum',puzzle('zebra','assignment',{n:3,allowed:[[0,1,2],[0,1,2],[0,1,2]],relations:[{op:'sum',a:0,b:1,value:5}]}),[0,1,2],'sum',[constraint(0),card(0),card(1)]],
 ['sudoku column',puzzle('sudoku','sudoku',{n:4,bw:2,initial:Array(16).fill(0)}),[1,2,3,4,1,3,4,2,3,4,2,1,4,1,2,3],'column',[cell(0),cell(4)]],
];
cases.find(c=>c[0]==='matrix row')[1].options=[8,9];
for(const [name,p,a,code,targets] of cases)test(name,()=>{
 const before=JSON.stringify({p,a});freeze(p);freeze(a);
 const result=inspect(p,a);
 assert.equal(result?.code,`logic.${p.id}.${code}`);
 assert.equal(result?.phase,'invalid');assert.ok(result.message.length>10);
 assert.ok(result.targets.length>0);if(targets)assert.deepEqual(result.targets,targets);
 assert.ok(result.targets.every(t=>LOGIC_FEEDBACK_COVERAGE[p.id].targets.includes(t.type)));
 assert.equal(JSON.stringify({p,a}),before);
 assert.equal(explainLogicAnswer(p,a,{accepted:true,submitted:true}),null,'existing acceptance always clears diagnosis');
});

test('sentinel incompleteness and partial contradictions are not failed attempts',()=>{
 const p=puzzle('zebra','assignment',{n:3,allowed:[[0,1,2],[0,1,2],[0,1,2]],relations:[]});
 assert.equal(inspect(p,[0,-1,-1]).phase,'incomplete');
 assert.equal(inspect(p,[0,0,-1]).phase,'editing');
 assert.equal(inspect(p,[0,0,2]).phase,'invalid');
 assert.equal(inspect(p,[0,1,2]),null,'local conditions passing must not invent a success or generic rejection');
 const s=puzzle('sudoku','sudoku',{n:4,bw:2,initial:Array(16).fill(0)});
 assert.equal(inspect(s,[1,1,...Array(14).fill(0)]).phase,'editing');
 assert.equal(inspect(s,Array(16).fill(0)).phase,'incomplete');
 const b=puzzle('binary','binary-grid',{n:4,given:Array(16).fill(-1)});
 assert.equal(inspect(b,[1,1,1,-1,...Array(12).fill(-1)]).phase,'editing');
 assert.equal(inspect(b,Array(16).fill(-1)).phase,'incomplete');
});

test('zero is a filled white answer for nonogram, minestars, islands and tents',()=>{
 for(const id of ['nonogram','minestars','islands','tents']){
  const p=generate(id,1,14),a=Array(p.data.n**2).fill(0),accepted=check(p,a);
  const result=explainLogicAnswer(p,a,{accepted,submitted:true});
  if(!accepted)assert.equal(result?.phase,'invalid',id);else assert.equal(result,null);
 }
});

test('coverage is explicit and every current domain has a concrete rejected fixture',()=>{
 assert.equal(new Set(LOGIC_FEEDBACK_IDS).size,23);
 for(const id of LOGIC_FEEDBACK_IDS){assert.ok(cases.some(c=>c[1].id===id),id);assert.ok(LOGIC_FEEDBACK_COVERAGE[id].supported.length);}
});

test('generated answers and accepted alternative arrangements are never negated',()=>{
 for(const id of LOGIC_FEEDBACK_IDS){const p=generate(id,1,14);assert.equal(check(p,p.solution),true,id);assert.equal(explainLogicAnswer(p,p.solution,{accepted:true}),null,id);}
 const p=puzzle('schedule','arrange',{extended:true,values:['A','B','C'],clues:[[0,2]]});
 p.solution=[0,1,2];assert.equal(check(p,[1,0,2]),true);
 assert.equal(explainLogicAnswer(p,[1,0,2],{accepted:true}),null);
});

test('unsupported and malformed shapes remain null without exceptions or new correct rules',()=>{
 for(const a of [null,undefined,{},'bad',[-9],NaN])for(const id of LOGIC_FEEDBACK_IDS){
  const p=generate(id,1,14);assert.doesNotThrow(()=>explainLogicAnswer(p,a,{accepted:false}));
 }
 assert.equal(inspect(puzzle('unknown','visual-choice',{},[1]),0),null);
 assert.equal(inspect(puzzle('matrix','visual-choice',{n:7},[1]),0),null);
 assert.equal(inspect(puzzle('order','arrange',{values:['A','B'],orderRules:[{op:'unsupported',a:0,b:1}]}),[0,1]),null);
 assert.equal(inspect(puzzle('venn','card-select',{cards:[{shape:0}],rule:{op:'unsupported'}}),[0]),null);
 assert.equal(inspect(puzzle('familytree','visual-choice',{parents:[-1,0],target:1,steps:1,relation:'unsupported',scene:{labels:['A','B']}},['B']),0),null);
});

test('tents matching rejects a Hall conflict despite a neighbor for every tree',()=>{
 const p=puzzle('tents','binary-grid',{n:4,trees:[0,2,15],given:Array(16).fill(-1),rows:[1,0,1,1],cols:[1,1,1,0]});
 const a=Array(16).fill(0);[1,8,14].forEach(i=>a[i]=1);
 assert.equal(checkLogic(p,a),false);
 const f=inspect(p,a);assert.equal(f.code,'logic.tents.matching');assert.match(f.message,/2くみ/);
 assert.deepEqual(f.targets,[0,2,15,1,8,14].map(cell));
});

test('loop constraints distinguish branching and disconnected closed loops',()=>{
 const p=puzzle('loopclues','edge-grid',{nodes:[0,1,2,3,4,5],edges:[[0,1],[1,2],[2,0],[3,4],[4,5],[5,3]],clues:[],cellEdges:[],max:1});
 assert.equal(checkLogic(p,[1,1,1,1,1,1]),false);
 assert.equal(inspect(p,[1,1,1,1,1,1]).code,'logic.loopclues.multiple-loops');
 const branch=puzzle('loopclues','edge-grid',{nodes:[0,1,2,3],edges:[[0,1],[0,2],[0,3]],clues:[],cellEdges:[],max:1});
 assert.equal(inspect(branch,[1,1,1]).code,'logic.loopclues.vertex');
 assert.deepEqual(inspect(branch,[1,1,1]).targets,[0,1,2].map(edge));
});

test('six by six sudoku uses width3 height2 blocks and clears a corrected collision',()=>{
 const p=puzzle('sudoku','sudoku',{n:6,bw:3,initial:Array(36).fill(0)});
 const latin=Array.from({length:36},(_,i)=>(Math.floor(i/6)+i%6)%6+1);
 assert.equal(inspect(p,latin).code,'logic.sudoku.block');
 const partial=Array(36).fill(0);partial[0]=1;partial[7]=1;
 assert.equal(inspect(p,partial).code,'logic.sudoku.block');assert.equal(inspect(p,partial).phase,'editing');
 partial[7]=2;assert.equal(inspect(p,partial).phase,'incomplete');
 assert.equal(explainLogicAnswer(p,partial,{accepted:true}),null);
});

test('zebra difference/before use displayed one-based numbers, and skip unassigned people',()=>{
 const p=puzzle('zebra','assignment',{n:3,allowed:[[0,1,2],[0,1,2],[0,1,2]],relations:[{op:'difference',a:0,b:1,value:1}]});
 assert.equal(inspect(p,[0,2,1]).code,'logic.zebra.difference');assert.match(inspect(p,[0,2,1]).message,/さは 2/);
 p.data.relations=[{op:'before',a:0,b:1}];assert.equal(inspect(p,[2,0,1]).code,'logic.zebra.before');
 assert.match(inspect(p,[2,0,1]).message,/3.*1/);
 assert.equal(inspect(p,[-1,0,1]).phase,'incomplete');
});

test('all order relation families identify the actual constraint, not the stored solution',()=>{
 const cases=[
  [{op:'adjacent',a:0,b:1},[0,2,1,3]],
  [{op:'notAdjacent',a:0,b:1},[0,1,2,3]],
  [{op:'gap',a:0,b:1,gap:3},[0,2,1,3]],
  [{op:'position',a:0,position:2},[0,1,2,3]],
  [{op:'end',a:0},[1,0,2,3]],
  [{op:'between',a:0,b:1,c:2},[1,0,2,3]],
 ];
 for(const [rule,a] of cases){const p=puzzle('order','arrange',{values:['A','B','C','D'],clues:[],orderRules:[rule]});assert.equal(checkLogic(p,a),false);assert.equal(inspect(p,a).code,`logic.order.${rule.op}`);}
});

test('domino start/end and remaining cards have distinct reasons',()=>{
 const p=puzzle('domino','domino-chain',{tiles:[[1,2],[2,3]],start:1,end:3});
 assert.equal(inspect(p,{order:[0],flips:[true]}).code,'logic.domino.start');
 assert.equal(inspect(p,{order:[0],flips:[false]}).phase,'incomplete');
 p.data.end=4;assert.equal(inspect(p,{order:[0,1],flips:[false,false]}).code,'logic.domino.end');
});

test('selection deficits, too many cards and different set attributes are distinguished',()=>{
 for(const attr of ['color','count']){
  const cards=[0,1,2].map(v=>({shape:v,color:v,count:v+1}));cards[1][attr]=cards[0][attr];
  const p=puzzle('settriple','card-select',{cards});assert.equal(inspect(p,[0,1,2]).code,`logic.settriple.${attr}`);
  assert.equal(inspect(p,[0,1]).phase,'incomplete');
 }
 const p=puzzle('venn','card-select',{cards:[{shape:0},{shape:1}],rule:{attr:'shape',value:0}});
 assert.equal(inspect(p,[],false).phase,'incomplete');assert.equal(inspect(p,[],true).phase,'invalid');
 assert.equal(inspect(p,[0]),null,'corrected local condition clears the old reason');
});

test('cipher reverse and composed tables diagnose the actual message position',()=>{
 const p=puzzle('cipher','visual-choice',{maps:[[1,2,0],[2,0,1]],message:[0,1],reverse:true},['2 2','1 2']);
 assert.equal(inspect(p,0).code,'logic.cipher.mapping');assert.match(inspect(p,0).message,/さいご.*ぎゃく/);
 assert.deepEqual(inspect(p,0).targets,[card(0),{type:'observation',index:0},constraint(0),constraint(1)]);
 assert.equal(inspect(p,1),null);
});

test('family common ancestor and path length are independent relation diagnostics',()=>{
 const p=puzzle('familytree','visual-choice',{parents:[-1,0,0,1,2],target:3,otherTarget:4,relation:'common-ancestor',scene:{labels:['5','4','3','2','1']}},['4','5']);
 assert.equal(inspect(p,0).code,'logic.familytree.common-ancestor');assert.equal(inspect(p,1),null);
 p.data.relation='path-distance';p.options=['3','4'];assert.equal(inspect(p,0).code,'logic.familytree.path-distance');assert.equal(inspect(p,1),null);
});

test('generated middle/final choices derive a reason for every rejected option',()=>{
 for(const id of ['pattern','matrix','balance','liar','rulemachine','familytree','cipher'])for(const level of [1,4,6,8,10,12,14,16,18,20]){
  const p=generate(id,level,928),before=JSON.stringify(p);freeze(p);
  for(let a=0;a<p.options.length;a++){
   const accepted=check(p,a),result=explainLogicAnswer(p,a,{accepted,submitted:true});
   if(accepted)assert.equal(result,null,`${id}/${level}/${a}`);
   else {assert.equal(result?.phase,'invalid',`${id}/${level}/${a}`);assert.ok(result.targets.some(t=>t.type==='card'&&t.index===a));}
  }assert.equal(JSON.stringify(p),before);
 }
});

test('audit zebra/sudoku completed invalid states clear on the existing accepted correction',()=>{
 const z=generateStage('zebra',33,0),za=[0,0,1,1,0];
 assert.equal(check(z,za),false);assert.equal(inspect(z,za).phase,'invalid');
 assert.match(inspect(z,za).message,/A.*B/);
 assert.equal(explainLogicAnswer(z,z.solution,{accepted:check(z,z.solution)}),null);
 const s=generateStage('sudoku',1,0),sa=[...s.data.initial];[5,7,11].forEach(i=>sa[i]=1);
 assert.equal(check(s,sa),false);assert.equal(inspect(s,sa).phase,'invalid');
 assert.equal(explainLogicAnswer(s,s.solution,{accepted:check(s,s.solution)}),null);
});

test('accepted different SET triple is preserved by the authoritative existing predicate',()=>{
 const cards=[0,1,2].flatMap(color=>[0,1,2].map(shape=>({shape,color,count:color+1})));
 const p=puzzle('settriple','card-select',{extended:true,cards});p.solution=[0,1,2];
 const alternative=[3,4,5];assert.equal(check(p,alternative),true);
 assert.equal(explainLogicAnswer(p,alternative,{accepted:true,submitted:true}),null);
});

test('weight observations must determine the queried weight before diagnosing a choice',()=>{
 const p=puzzle('balance','visual-choice',{equations:['○△ ＝ 8','○ ＝ ？']},[5]);
 assert.equal(inspect(p,0),null,'one combined observation does not determine an individual weight');
 p.data.equations[1]='○△ ＝ ？';
 assert.equal(inspect(p,0).code,'logic.balance.equation','the same combined weight is determined');
 p.options=[8];assert.equal(inspect(p,0),null);
});

test('generated completed grid/edge/order mutations agree with existing rule rejection',()=>{
 for(const id of ['nonogram','minestars','binary','islands','tents','bridges','loopclues','mintree','order','schedule','domino','settriple','venn','odd','zebra','sudoku'])for(const level of [1,10,20]){
  const p=generate(id,level,928),solution=p.solution;
  let candidates=[];
  if(p.kind==='binary-grid'||p.kind==='sudoku')candidates=solution.flatMap((v,i)=>{
   if(p.data.given?.[i]>=0||p.data.initial?.[i])return [];
   const a=[...solution];a[i]=p.kind==='sudoku'?v%p.data.n+1:1-v;return [a];
  });
  else if(p.kind==='edge-grid')candidates=solution.map((v,i)=>{const a=[...solution];a[i]=(v+1)%(p.data.max+1);return a;});
  else if(p.kind==='arrange'||p.kind==='assignment')candidates=[...solution].flatMap((_,i)=>{if(i===0)return [];const a=[...solution];[a[0],a[i]]=[a[i],a[0]];return [a];});
  else if(p.kind==='domino-chain')candidates=solution.flips.map((_,i)=>{const a={order:[...solution.order],flips:[...solution.flips]};a.flips[i]=!a.flips[i];return a;});
  else if(p.kind==='card-select'){
   if(id==='settriple')for(let i=0;i<p.data.cards.length;i++)for(let j=i+1;j<p.data.cards.length;j++)for(let k=j+1;k<p.data.cards.length;k++)candidates.push([i,j,k]);
   else candidates=p.data.cards.map((_,i)=>[i]);
  }
  else if(p.kind==='odd')candidates=Array.from({length:p.data.n**2},(_,i)=>i);
  const a=candidates.find(a=>!check(p,a));
  if(a===undefined)continue;
  freeze(p);freeze(a);const result=inspect(p,a);
  assert.equal(result?.phase,'invalid',`${id}/${level}`);
  assert.ok(result.targets.length,`${id}/${level}`);
 }
});
