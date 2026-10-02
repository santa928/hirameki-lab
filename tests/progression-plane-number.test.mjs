import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generate,check,optionAnswer} from '../lib/puzzles.ts';
import {normalize} from '../lib/engine/shared.ts';

test('reflection always changes the source and later overlays require handling overlaps',()=>{
 for(const level of [1,5,9,13,17,20])for(let seed=0;seed<40;seed++){
  const p=generate('mirror',level,seed),d=p.data;
  assert.notDeepEqual(normalize(d.shape),normalize(d.shape.map(([x,y])=>[-x,y])),`identity reflection ${level}/${seed}`);
  if(level>=9){const q=generate('fit',level,seed);assert.ok(q.data.parts[0].some(v=>q.data.parts[1].some(w=>String(v)===String(w))),'later overlay must overlap');}
 }
});
test('symmetry teaches different axes and translations are not identity tasks',()=>{
 assert.deepEqual([1,5,9,13].map(l=>generate('symmetry',l,42).data.axis),['vertical','horizontal','diagonal','antidiagonal']);
 for(let l=1;l<=20;l++)for(let seed=0;seed<20;seed++){const p=generate('translate',l,seed);assert.notDeepEqual(p.data.pos,p.data.start,`zero move ${l}/${seed}`);}
});
test('place value cannot be solved by matching only one digit column',()=>{
 for(let level=1;level<=20;level++)for(let seed=0;seed<20;seed++){
  const p=generate('placevalue',level,seed),correct=String(p.options[p.solution]);
  for(let column=0;column<correct.length;column++)assert.ok(p.options.filter(v=>String(v).padStart(correct.length,'0')[column]===correct[column]).length>=2,`${level}/${seed}/column${column}`);
 }
});
test('number originals introduce new operations and retain valid interactive answers',()=>{
 const phases=[1,5,9,13,17].map(l=>generate('groups',l,42));
 assert.ok(phases[2].data.loose>0&&phases[3].data.missing>0&&phases[4].data.secondaryGroups>0,'later groups require residual, subtraction and heterogeneous groups');
 const paths=[1,5,9,13,17].map(l=>generate('numberpath',l,42));
 assert.ok(paths[2].data.step>1&&paths[3].data.step<0,'number paths advance beyond1..N');
 for(const id of ['count','compare','sum','missing','groups','numberpath'])for(const l of [1,5,9,13,17,20]){const p=generate(id,l,42);assert.ok(check(p,p.solution),id);if(p.options)assert.equal(p.options.filter((_,i)=>check(p,optionAnswer(p,i))).length,1,id);}
});
