import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generate} from '../lib/puzzles.ts';
import {generateStage,stageCount} from '../lib/stages.ts';
import {makeTutorial} from '../lib/tutorial.ts';
import {planeTeaching as builder} from '../lib/teaching/plane-steps.ts';

/** Runs the real recipe; missing teaching remains an explicit failed contract. */
function steps(p){assert.equal(typeof builder,'function');const frames=builder(p);assert.ok(frames?.length>=3);return frames;}
const puzzle=(id,data,options,solution,kind='choice')=>({id,level:1,seed:0,kind,data,options,solution,hint:''});
const ring=Array.from({length:9},(_,i)=>[i%3,Math.floor(i/3)]).filter(([x,y])=>x!==1||y!==1);

// A static winning option cannot replace the actual transformation around a pivot.
test('rotation follows quarter turns and reflection keeps one common axis',()=>{
 const source=[[0,0],[1,0],[0,1]],target=[[0,0],[1,0],[1,1]];
 const rotated=steps(puzzle('rotate',{shape:source,optionType:'shape'},[target],0));
 assert.deepEqual(rotated.find(f=>f.phase==='transform').scene.panels[0].cells,[[-1,0],[-1,1],[-2,0]]);
 assert.deepEqual(rotated.at(-1).scene.result,target);
 const mirrored=steps(puzzle('mirror',{shape:[[1,0],[2,0],[2,1]],optionType:'shape'},[[[0,0],[0,1],[1,0]]],0));
 assert.ok(mirrored.every(f=>f.scene.axis.x===0));
 assert.deepEqual(mirrored.at(-1).scene.panels[1].cells,[[-2,0],[-3,0],[-3,1]]);
});

// Independent normalization would move either sheet and create the wrong union.
test('fit overlays original sheet coordinates and counts shared cells only once',()=>{
 const p=puzzle('fit',{shape:[[2,1],[3,1],[3,2]],parts:[[[2,1],[3,1]],[[3,1],[3,2]]],optionType:'shape'},[[[0,0],[1,0],[1,1]]],0);
 const frames=steps(p),final=frames.at(-1).scene;
 assert.deepEqual(frames[0].scene.panels.map(v=>v.cells),p.data.parts);
 assert.deepEqual(final.result,[[2,1],[3,1],[3,2]]);
 assert.deepEqual(frames[1].scene.panels[0].markedCells,[[3,1]]);
});

// Omitting hole edges or counting the empty square would break these literals.
test('area excludes a hole while perimeter counts its four exposed inner edges',()=>{
 const area=steps(puzzle('area',{shape:ring,optionType:'number'},[8,9,10],8));
 assert.equal(area.at(-1).scene.result,8);
 assert.equal(area.at(-1).scene.panels[0].markedCells.length,8);
 const perimeter=steps(puzzle('perimeter',{cells:ring},[12,16,20],1,'visual-choice'));
 assert.equal(perimeter.at(-1).scene.result,16);
 assert.equal(perimeter.at(-1).scene.panels[0].edges.length,16);
 assert.ok(perimeter.at(-1).scene.panels[0].edges.some(e=>JSON.stringify(e.from)==='[1,1]'&&JSON.stringify(e.to)==='[2,1]'));
});

test('translation applies each arrow with an unchanged board origin',()=>{
 const initial=[[1,2],[2,2]],moves=[1,0,3],p=puzzle('translate',{scene:{type:'translation',cells:initial,n:6,moves},moves},[{type:'shape',cells:[[1,1],[2,1]]}],0,'visual-choice');
 const frames=steps(p),trace=frames.filter(f=>f.phase==='transform');
 assert.deepEqual(trace.map(f=>f.scene.panels[0].cells),[[[2,2],[3,2]],[[2,1],[3,1]],[[1,1],[2,1]]]);
 assert.ok(frames.every(f=>JSON.stringify(f.scene.bounds)===JSON.stringify(frames[0].scene.bounds)));
});

test('angles sum the known sectors and subtract them from the complete angle',()=>{
 const frames=steps(puzzle('angles',{parts:[30,70,80],total:180,missing:1},[60,70,80],1,'visual-choice'));
 assert.equal(frames.at(-1).scene.result,70);
 assert.equal(frames.at(-1).scene.formula,'180 − (30 + 80) = 70°');
 assert.deepEqual(frames.filter(f=>f.phase==='calculate').map(f=>f.scene.angles.knownIndices),[[0],[0,2]]);
});

test('circle-center tests all three distances for every candidate without assuming a diameter',()=>{
 const p=puzzle('circlecenter',{points:[[1,0],[0,1],[-1,0]],candidates:[[0,0],[1,1]],scene:{n:4}},['A','B'],0,'visual-choice');
 const frames=steps(p),checks=frames.filter(f=>f.phase==='calculate');
 assert.deepEqual(checks.map(f=>f.scene.panels[0].distances),[[1,1,1],[1,1,5]]);
 assert.equal(frames.at(-1).scene.result,'A');
});

test('scale expands each source cell in both dimensions and compares a wrong multiplier',()=>{
 const p=puzzle('scale',{cells:[[0,0],[1,0]],factor:2,scene:{n:2}},[{type:'shape',cells:[[0,0],[1,0],[0,1],[1,1],[2,0],[3,0],[2,1],[3,1]]}],0,'visual-choice');
 const frames=steps(p),final=frames.at(-1).scene;
 assert.equal(final.result.length,8);
 assert.deepEqual(final.result,[[0,0],[1,0],[0,1],[1,1],[2,0],[3,0],[2,1],[3,1]]);
 assert.ok(frames.some(f=>f.phase==='compare'&&f.scene.panels.some(v=>v.label.includes('横だけ'))));
});

/** Freeze all nested inputs so accidental in-place transforms throw immediately. */
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}

test('nine supported plane games explain every concept band without mutating puzzles',()=>{
 for(const id of ['rotate','mirror','fit','area','perimeter','translate','angles','circlecenter','scale'])for(const level of [1,5,9,13,17,20])for(const seed of [0,42,73021]){
  const p=freeze(generate(id,level,seed)),before=JSON.stringify(p),frames=steps(p);
  assert.ok(frames.some(f=>['transform','calculate'].includes(f.phase)),`${id}/${level}/${seed}`);
  assert.ok(frames.every(f=>f.scene.type==='teaching-plane'&&f.caption.length>0));
  assert.ok(frames.every(f=>JSON.stringify(f.scene.bounds)===JSON.stringify(frames[0].scene.bounds)),`${id}: fixed coordinates`);
  assert.notEqual(frames.at(-1).scene.result,undefined);
  assert.equal(JSON.stringify(p),before);
 }
 assert.equal(builder(puzzle('unrelated',{},[],0)),null);
});


/** Unit-square corners, marked cells, points and edges must fit the same extent. */
function assertContained(frames,label){
 const common=frames[0].scene.bounds;
 for(const [index,{scene}] of frames.entries()){
  assert.deepEqual(scene.bounds,common,`${label}/frame${index}: fixed extent`);
  const {minX,minY,maxX,maxY}=common;
  const point=(p,unit=false)=>assert.ok(p[0]>=minX&&p[1]>=minY&&p[0]+(unit?1:0)<=maxX&&p[1]+(unit?1:0)<=maxY,`${label}/frame${index}: ${p} outside ${JSON.stringify(common)}`);
  for(const panel of scene.panels){
   for(const c of [...(panel.cells??[]),...(panel.markedCells??[])])point(c,true);
   for(const p of panel.points??[])point(p);
   if(panel.candidate)point(panel.candidate);
   for(const edge of panel.edges??[]){point(edge.from);point(edge.to);}
  }
 }
}
test('all rotation stage Q1 tutorial contexts contain the normalized conclusion in their common bounds',()=>{
 for(let stage=1;stage<=stageCount('rotate');stage++){
  const source=freeze(generateStage('rotate',stage,0)),before=JSON.stringify(source);
  const tutorial=makeTutorial('rotate',{mode:'stage',stage,source});
  assertContained(tutorial.frames,`rotate/stage${stage}/Q1`);
  assert.equal(JSON.stringify(source),before);
 }
});
test('all nine recipes keep every displayed primitive inside common bounds across concept bands',()=>{
 for(const id of ['rotate','mirror','fit','area','perimeter','translate','angles','circlecenter','scale'])for(const level of [1,5,9,13,17,20])for(const seed of [0,42,73021]){
  assertContained(steps(freeze(generate(id,level,seed))),`${id}/${level}/${seed}`);
 }
});
