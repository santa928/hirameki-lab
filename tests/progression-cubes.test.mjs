import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generate,project,check} from '../lib/puzzles.ts';
import {cubeSignature} from '../lib/engine/space.ts';

// Replacing supported 3D structures with flat random dots must fail this test.
test('cube courses start with height and varied supported columns',()=>{
 for(let L=1;L<=20;L++)for(let seed=0;seed<40;seed++){
  const p=generate('cubes',L,seed),cells=p.data.cubes,heights=new Map();
  for(const [x,y,z] of cells){heights.set(`${x},${y}`,Math.max(heights.get(`${x},${y}`)||0,z+1));if(z)assert.ok(cells.some(c=>c[0]===x&&c[1]===y&&c[2]===z-1),'floating block');}
  assert.ok(Math.max(...heights.values())>=2,`flat ${L}/${seed}`);
  assert.ok(new Set(heights.values()).size>=2,`same height ${L}/${seed}`);
  assert.equal(p.solution,cells.length);
  assert.equal(project(cells,'top').length,heights.size);
 }
});
test('advanced rotation cannot be solved by bounding box size and includes a mirror trap',()=>{
 const bounds=c=>[0,1,2].map(j=>Math.max(...c.map(p=>p[j]))-Math.min(...c.map(p=>p[j]))+1).sort().join(',');
 for(let seed=0;seed<40;seed++){
  const p=generate('rotate3d',20,seed),source=p.data.cubes,mirror=source.map(([x,y,z])=>[-x,y,z]);
  assert.ok(p.options.every(c=>bounds(c)===bounds(source)),'bounding box shortcut');
  assert.notEqual(cubeSignature(source),cubeSignature(mirror),'advanced source is mirror symmetric');
  assert.ok(p.options.some(c=>cubeSignature(c)===cubeSignature(mirror)),'no mirrored distractor');
 }
});
test('later cube courses require layer and depth reasoning',()=>{
 for(const L of [5,9,13,17,20])for(let seed=0;seed<40;seed++){
  const cells=generate('cubes',L,seed).data.cubes;
  assert.ok(new Set(cells.map(c=>c[0])).size>=2&&new Set(cells.map(c=>c[1])).size>=2,'one dimensional footprint');
  assert.ok(cells.length>project(cells,'front').length+2,'no meaningful occlusion');
  assert.ok(Math.max(...cells.map(c=>c[2]))+1>=(L>=17?5:L>=9?4:3),'height progression');
 }
});
test('projection games do not inherit a constant rectangle from the box-counting curriculum',()=>{
 for(const L of [5,9,13,16,20]){
  const silhouettes=new Set(),footprints=new Set();
  for(let seed=0;seed<60;seed++){
   const top=generate('top',L,seed),front=generate('shadow',L,seed);
   const t=project(top.data.cubes,'top'),f=project(front.data.cubes,'front');
   footprints.add(JSON.stringify(t));silhouettes.add(JSON.stringify(f));
   const width=Math.max(...t.map(p=>p[0]))+1,depth=Math.max(...t.map(p=>p[1]))+1;
   assert.ok(t.length<width*depth,`top has no gap ${L}/${seed}`);
   const heights=[...new Set(front.data.cubes.map(p=>p[0]))].map(x=>Math.max(...front.data.cubes.filter(p=>p[0]===x).map(p=>p[2]+1)));
   if(L<17)assert.ok(new Set(heights).size>=2,`flat shadow ${L}/${seed}`);else assert.ok(f.length<(Math.max(...f.map(v=>v[0]))+1)*(Math.max(...f.map(v=>v[1]))+1),'late shadow needs a window');
  }
  assert.ok(footprints.size>20&&silhouettes.size>10,`fixed projection family ${L}`);
 }
});

test('thin middle-course solids regenerate when their box has too few distinct distractors',()=>{
 for(const [level,seed]of [[9,2823311214],[10,2629932836],[11,37535454]]){
  const p=generate('rotate3d',level,seed);assert.ok(check(p,p.solution));assert.equal(p.options.length,3);
  assert.ok(p.options.every(a=>a.length===p.data.cubes.length));
 }
});
