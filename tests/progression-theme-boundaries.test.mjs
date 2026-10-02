import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generate,check,project,optionAnswer} from '../lib/puzzles.ts';

test('shadow final theme requires internal silhouette gaps without an option-only cue',()=>{
 for(let L=17;L<=20;L++)for(let seed=0;seed<60;seed++){
  const p=generate('shadow',L,seed),correct=project(p.data.cubes,'front');
  const holes=a=>{const w=Math.max(...a.map(v=>v[0]))+1,h=Math.max(...a.map(v=>v[1]))+1;return w*h-a.length;};
  assert.ok(holes(correct)>0);assert.equal(p.options.length,4);
  assert.ok(p.options.every(a=>holes(a)===holes(correct)&&a.length===correct.length));
  assert.equal(p.options.filter((_,i)=>check(p,optionAnswer(p,i))).length,1);
 }
});
test('net themes introduce orientation, one-axis rolls and multi-axis rolls',()=>{
 for(let seed=0;seed<60;seed++){
  assert.equal(!!generate('nets',4,seed).data.pose,false);
  const orientation=generate('nets',8,seed).data;assert.ok(orientation.pose);assert.equal(orientation.moves,undefined);
  const single=generate('nets',12,seed).data.moves;assert.ok(single.length>=1);assert.equal(new Set(single.map(v=>v%2)).size,1);
  const mixed=generate('nets',16,seed).data.moves;assert.equal(new Set(mixed.map(v=>v%2)).size,2);
  const long=generate('nets',20,seed).data;assert.ok(long.moves.length>mixed.length);assert.notEqual(long.end[0],long.initial[0]);
 }
});
test('late logic never reduces to a cancelled machine, unchanged cipher or short family path',()=>{
 for(let L=17;L<=20;L++)for(let seed=0;seed<80;seed++){
  const m=generate('rulemachine',L,seed);assert.ok(['shape','color','count'].filter(k=>(m.data.shift[k]+m.data.shift2[k])%3!==0).length>=2);
  const c=generate('cipher',L,seed);assert.notEqual(c.options[c.solution],c.data.message.map(v=>v+1).join(' '));
  assert.ok(generate('familytree',L,seed).data.reasoningHops>=3);
 }
});
