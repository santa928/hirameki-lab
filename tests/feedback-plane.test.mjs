import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generate,check,optionAnswer} from '../lib/puzzles.ts';
import * as mod from '../lib/feedback/plane.ts';
const puzzle=(id,data,options=[],kind='visual-choice')=>({id,level:1,seed:0,kind,data,options,solution:0,hint:''});
/** Call the real adapter, requiring a specific supported rule instead of fallback text. */
function explain(p,answer,options={accepted:false,submitted:true}){assert.equal(typeof mod?.explainPlaneAnswer,'function');return mod.explainPlaneAnswer(p,answer,options);}
const L=[[0,0],[1,0],[0,1]],ring=Array.from({length:9},(_,i)=>[i%3,Math.floor(i/3)]).filter(([x,y])=>x!==1||y!==1);
const cases=[
 ['rotate',puzzle('rotate',{shape:L,optionType:'shape'},[[[0,0],[0,1],[0,2]]], 'choice'),0,'features'],
 ['mirror',puzzle('mirror',{shape:L,optionType:'shape'},[L], 'choice'),0,'reflection'],
 ['fit',puzzle('fit',{parts:[[[2,1],[3,1]],[[3,1],[3,2]]],optionType:'shape'},[[[0,0],[1,0]]], 'choice'),0,'missing-cells'],
 ['scale',puzzle('scale',{cells:L,factor:2},[{type:'shape',cells:[[0,0],[1,0],[2,0],[3,0],[0,1],[1,1]]}]),0,'multiplier'],
 ['translate',puzzle('translate',{scene:{cells:[[1,1]],moves:[1,0]},moves:[1,0]},[{type:'shape',cells:[[1,0]]}]),0,'position'],
 ['area',puzzle('area',{shape:ring,optionType:'number'},[8,9], 'choice'),9,'count'],
 ['perimeter',puzzle('perimeter',{cells:ring},[12,16]),0,'boundary'],
 ['square',puzzle('square',{n:4,dots:[0,2,4,6]},[], 'select'),[0,2,4,6],'sides'],
 ['angles',puzzle('angles',{parts:[30,70,80],total:180,missing:1},[80,70]),0,'remainder'],
 ['circlecenter',puzzle('circlecenter',{points:[[1,0],[0,1],[-1,0]],candidates:[[0,0],[1,1]]},['B','A']),0,'distances'],
 ['triangulate',puzzle('triangulate',{n:5,banned:[]},[], 'chords'),[[0,2],[1,3]],'crossing'],
 ['inside',puzzle('inside',{points:[[1,1],[3,1]],poly:[[0,0],[2,0],[2,2],[0,2]]},[],'point-select'),[1],'outside'],
 ['jigsaw',puzzle('jigsaw',{n:1,tiles:[[1,0,0,0]]},[],'jigsaw'),{slots:[0],turns:[0]},'border'],
 ['separator',puzzle('separator',{anchors:[[0,0],[2,0]],points:[[0,1],[1,1]],groups:[0,1]},[],'separator'),[0,1],'mixed'],
 ['hull',puzzle('hull',{points:[[0,0],[2,0],[2,2],[0,2],[1,1]]},[],'point-select'),[0,1,2,3,4],'interior'],
 ['parallel',puzzle('parallel',{vector:[1,2],cards:[{vector:[2,1]}]},[],'card-select'),[0],'direction'],
 ['coinparking',puzzle('coinparking',{n:4,radius:1,k:1,points:[[0,2]]},[],'parking'),[0],'boundary'],
 ['equalparts',puzzle('equalparts',{n:3,rows:2,k:2,homes:[0,2]},[],'district'),[0,0,1,1,1,1],'size'],
];
for(const [id,p,answer,reason] of cases)test(`${id}: derives a specific geometric reason from the selected answer`,()=>{
 const before=JSON.stringify({p,answer}),f=explain(p,answer);
 assert.equal(f.code,`plane.${id}.${reason}`);assert.ok(f.message.length>8);
 assert.equal(f.phase,'invalid');assert.equal(JSON.stringify({p,answer}),before);
 assert.ok(f.targets.every(t=>Number.isInteger(t.index)&&t.index>=0));
});

test('area and perimeter distinguish eight painted cells from sixteen exposed edges',()=>{
 assert.match(explain(cases[5][1],9).message,/8/);assert.match(explain(cases[6][1],0).message,/16/);
});
test('circle diagnostics report the three hand-computed squared distances',()=>{
 assert.match(explain(cases[9][1],0).message,/1.*1.*5/);
});
test('parking permits touching and explains overlap separately from board boundary',()=>{
 const p=puzzle('coinparking',{n:6,radius:1,k:2,points:[[1,1],[3,1],[2,1]]},[],'parking');
 assert.equal(explain(p,[0,2]).code,'plane.coinparking.overlap');
 assert.equal(explain(p,[0,1],{accepted:true}).phase,'correct');
});
test('district incomplete paint, two homes and disconnected plots are separate reasons',()=>{
 const p=puzzle('equalparts',{n:2,rows:2,k:2,homes:[0,1]},[],'district');
 assert.equal(explain(p,[0,-1,1,1]).phase,'incomplete');
 assert.equal(explain(p,[0,0,1,1]).code,'plane.equalparts.homes');
 assert.equal(explain(p,[0,1,1,0]).code,'plane.equalparts.connection');
});
test('triangulation distinguishes polygon sides, prohibited edges and crossing chords',()=>{
 const p=puzzle('triangulate',{n:5,banned:[[0,2]]},[],'chords');
 assert.equal(explain(p,[[0,1]]).code,'plane.triangulate.side');
 assert.equal(explain(p,[[0,2]]).code,'plane.triangulate.banned');
});
test('accepted alternate triangulations are never contradicted by stored solution',()=>{
 const p=puzzle('triangulate',{n:5,banned:[],extended:true},[],'chords');p.solution=[[0,2],[0,3]];
 const answer=[[1,3],[1,4]];assert.equal(check(p,answer),true);
 assert.equal(explain(p,answer,{accepted:true}).phase,'correct');
});
test('editing and submitted invalidity differ without changing the diagnosis',()=>{
 const p=cases[6][1];assert.equal(explain(p,0,{accepted:false,submitted:false}).phase,'editing');
 assert.equal(explain(p,null).phase,'incomplete');
});

/** Freeze nested inputs to detect any derived diagnostic that modifies the puzzle. */
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
test('all nineteen IDs cover concept bands with authoritative accepted answers and immutable inputs',()=>{
 assert.equal(mod?.PLANE_FEEDBACK_IDS?.length,19);
 for(const id of mod.PLANE_FEEDBACK_IDS)for(const level of [1,5,9,13,17,20])for(const seed of [0,42]){
  const p=freeze(generate(id,level,seed)),answer=freeze(structuredClone(p.solution));
  assert.equal(check(p,answer),true,`${id} ${level}`);
  assert.equal(explain(p,answer,{accepted:true}).phase,'correct');
  assert.ok(explain(p,null,{accepted:false}));
  if(p.options){const index=p.options.findIndex((_,i)=>!check(p,optionAnswer(p,i)));assert.ok(explain(p,optionAnswer(p,index),{accepted:false,submitted:true}));}
 }
 assert.equal(explain(puzzle('unrelated',{}),null),null);
});

test('map coloring treats an unpainted region differently from a colored neighbor conflict and clears edits',()=>{
 const p=puzzle('mapcolor',{k:3,colors:3,edges:[[0,1],[1,2]],initial:[-1,-1,-1]},[],'region-color');
 const empty=explain(p,[-1,-1,-1]);assert.equal(empty?.code,'plane.mapcolor.incomplete');assert.equal(empty.phase,'incomplete');
 const conflict=explain(p,[0,0,-1],{accepted:false,submitted:false});assert.equal(conflict.code,'plane.mapcolor.neighbors');assert.equal(conflict.phase,'editing');assert.deepEqual(conflict.targets,[{type:'cell',index:0},{type:'cell',index:1}]);
 const fixed=explain(p,[0,1,-1],{accepted:false,submitted:false});assert.equal(fixed.phase,'incomplete');assert.notEqual(fixed.code,conflict.code);
 assert.equal(explain(p,[0,1,1],{accepted:false,submitted:true}).phase,'invalid');
 assert.equal(explain(p,[0,1,0],{accepted:true}).phase,'correct');
});
test('triangulation identifies repeated diagonals rather than silently counting them twice',()=>{
 const p=puzzle('triangulate',{n:5,banned:[]},[],'chords');assert.equal(explain(p,[[0,2],[0,2]]).code,'plane.triangulate.duplicate');
});

test('scale with matching dimensions still identifies the actual misplaced hole cells',()=>{
 const source=[[0,0],[1,0],[0,1]],correct=[[0,0],[1,0],[0,1],[1,1],[2,0],[3,0],[2,1],[3,1],[0,2],[1,2],[0,3],[1,3]],chosen=correct.filter(c=>JSON.stringify(c)!=='[0,2]').concat([[3,2]]);
 const p=puzzle('scale',{cells:source,factor:2},[{type:'shape',cells:chosen}]);
 const f=explain(p,0);assert.equal(f.code,'plane.scale.features');assert.match(f.message,/足りない位置.*1.*余分.*1/);
});

for(const id of mod.PLANE_FEEDBACK_IDS)test(`${id}: no negative diagnostic when all local rules pass despite accepted=false`,()=>{
 for(const level of [1,5,9,13,17,20])for(const seed of [0,42]){
  const p=freeze(generate(id,level,seed)),answer=freeze(structuredClone(p.solution));
  assert.equal(check(p,answer),true,`${id}/${level}/${seed}`);
  for(const submitted of [false,true])assert.equal(explain(p,answer,{accepted:false,submitted}),null,`${id}/${level}/${seed}: no concrete violated rule`);
 }
});
test('locally valid alternate triangulation and touching circles also return no negative reason',()=>{
 const triangulation=puzzle('triangulate',{n:5,banned:[],extended:true},[],'chords');
 triangulation.solution=[[0,2],[0,3]];
 const alternate=[[1,3],[1,4]];assert.equal(check(triangulation,alternate),true);
 assert.equal(explain(triangulation,alternate),null);
 const parking=puzzle('coinparking',{n:6,radius:1,k:2,points:[[1,1],[3,1]]},[],'parking');
 assert.equal(explain(parking,[0,1]),null);
});
test('equalparts seed 14 labels the required house and the different house actually inside the garden',()=>{
 const p=freeze(generate('equalparts',1,14)),answer=freeze(p.solution.map(v=>1-v));
 assert.deepEqual(p.data.homes,[2,4]);assert.equal(check(p,answer),false);
 const f=explain(p,answer);
 assert.equal(f.code,'plane.equalparts.homes');assert.equal(f.phase,'invalid');
 assert.match(f.message,/1番の家/);assert.match(f.message,/2番の家/);
 assert.match(f.message,/別の庭|2番の庭/);
 assert.ok(f.targets.some(t=>t.type==='cell'&&t.index===2),'required home is highlighted');
 assert.ok(f.targets.some(t=>t.type==='cell'&&t.index===4),'current different home is highlighted');
});

test('equalparts seed 14 diagnoses an already oversized garden during editing before unpainted cells',()=>{
 const p=freeze(generate('equalparts',1,14)),answer=freeze([0,0,0,0,1,-1]);
 assert.equal(check(p,answer),false);
 for(const submitted of [false,true]){
  const f=explain(p,answer,{accepted:false,submitted});
  assert.equal(f.code,'plane.equalparts.size');assert.equal(f.phase,'editing');
  assert.match(f.message,/4マス/);assert.match(f.message,/3マス/);
  assert.deepEqual(f.targets.filter(t=>t.type==='cell').map(t=>t.index),[0,1,2,3]);
 }
 assert.equal(explain(p,[0,0,0,-1,1,-1],{accepted:false,submitted:false}).phase,'incomplete');
 assert.equal(explain(p,[0,0,0,1,1,1],{accepted:false,submitted:false}),null,'oversize warning clears after repaint');
});
