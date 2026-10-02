import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generatePlane} from '../lib/engine/plane.ts';

// Catches a deterministic shortcut: the sole grid-intersection candidate was always correct.
test('circle-center candidates share coordinate granularity',()=>{
 for(const level of [13,17,20])for(let seed=0;seed<60;seed++){
  const p=generatePlane('circlecenter',level,seed),d=p.data;
  assert.ok(d.candidates.every(c=>c.every(Number.isInteger)),`${level}/${seed}: all candidates use the visible grid`);
 }
});

test('circle-center varies location while retaining one in-bounds equidistant center',()=>{
 for(const level of [1,5,9,13,17,20]){
  const centers=new Set();
  for(let seed=0;seed<60;seed++){
   const p=generatePlane('circlecenter',level,seed),d=p.data;
   assert.equal(d.candidates.length,4,`${level}/${seed}: every offered answer has a displayed candidate`);
   const correct=d.candidates[p.options[p.solution].charCodeAt(0)-65];centers.add(JSON.stringify(correct));
   assert.ok([...d.points,...d.candidates].every(v=>v.every(x=>x>=0&&x<=d.scene.n)),`${level}/${seed} bounds`);
   const equidistant=d.candidates.filter(c=>new Set(d.points.map(v=>(v[0]-c[0])**2+(v[1]-c[1])**2)).size===1);
   assert.deepEqual(equidistant,[correct],`${level}/${seed} unique center`);
  }
  assert.ok(centers.size>10,`${level}: only ${centers.size} centers`);
 }
});

// Validates the actual generated angle granularity, not the superseded 15-degree curriculum.
test('angle choices use the same unit as the known sector boundaries',()=>{
 for(let level=1;level<=20;level++)for(let seed=0;seed<60;seed++){
  const p=generatePlane('angles',level,seed),unit=level<=4?[15,10,5,5][level-1]:level<=12?10:5;
  assert.ok(p.data.parts.every(v=>v>0&&v%unit===0));
  assert.ok(p.options.every(v=>v>0&&v<p.data.total&&v%unit===0));
  assert.equal(p.options[p.solution],p.data.parts[p.data.missing]);
 }
});

// Catches the second theme consuming every two-given body needed by the third theme.
test('angle supplements precede combining two known angles',()=>{
 for(let seed=0;seed<60;seed++)for(const level of [5,6,7,8,9,10,11,12]){
  const p=generatePlane('angles',level,seed);
  assert.equal(p.data.parts.length-1,level<=8?1:2,`${level}/${seed}`);
 }
});
