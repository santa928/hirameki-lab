import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generate,check,hash,neighbors} from '../lib/puzzles.ts';
// A regression to straight entry-level rail routes must fail, not merely their witness validation.
test('rails require changing direction from the first stage and vary entry/exit columns',()=>{
 for(const L of [1,2,4,5,10,20]){const pairs=new Set();for(let seed=0;seed<80;seed++){
  const p=generate('rails',L,seed),d=p.data;pairs.add(`${d.start%d.n}/${d.end%d.n}`);
  assert.notEqual(d.start%d.n,d.end%d.n,`straight endpoints ${L}/${seed}`);
  assert.ok(d.path.some(i=>d.types[i]===1));
  assert.equal(check(p,d.initial),false);assert.equal(check(p,p.solution),true);
 }assert.ok(pairs.size>=4);}
});
test('maze always offers a real route decision, with more decisions at higher levels',()=>{
 for(const L of [1,6,13,20])for(let seed=0;seed<40;seed++){
  const p=generate('maze',L,seed),d=p.data;
  const choices=p.solution.filter(at=>neighbors(at,d.n).filter(j=>!d.blocked.includes(j)).length>=3).length;
  assert.ok(choices>=(L<6?1:L<13?2:3),`maze no decisions ${L}/${seed}: ${choices}`);
 }
});
test('ice shortest routes cannot collapse to one-move advanced puzzles',()=>{
 for(const L of [1,6,13,20])for(let seed=0;seed<80;seed++){
  const p=generate('ice',L,seed),d=p.data;
  const min=L<6?2:L<13?4:L<18?6:8;
  assert.ok(d.route.length-1>=min,`ice ${L}/${seed}: ${d.route.length-1}`);
 }
});
test('every possible rail route meets the level floor, including unintended shortcuts',()=>{
 for(const L of [1,5,10,15,20])for(let seed=0;seed<100;seed++){
  const d=generate('rails',L,seed).data;let found=0;
  function visit(at,enter,seen,turns){if(seen.includes(at))return;const path=[...seen,at],t=turns+d.types[at];
   const exits=d.types[at]?[0,1,2,3].filter(v=>v!==enter&&v!==(enter+2)%4):[(enter+2)%4];
   for(const dir of exits){if(at===d.end&&dir===2){found++;assert.ok(path.length>=d.n+Math.floor(L/3),`${L}/${seed} length ${path.length}`);assert.ok(t>=2+Math.floor(L/5),`${L}/${seed} turns ${t}`);continue;}
    const x=at%d.n+[0,1,0,-1][dir],y=Math.floor(at/d.n)+[-1,0,1,0][dir];if(x>=0&&y>=0&&x<d.n&&y<d.n)visit(y*d.n+x,(dir+2)%4,path,t);
   }
  }visit(d.start,0,[],0);assert.ok(found);
 }
});
test('slide scramble has a meaningful distance from the goal at every level',()=>{
 for(const L of [1,5,10,15,20])for(let seed=0;seed<100;seed++){
  const {n,initial}=generate('slide',L,seed).data;
  const bound=initial.reduce((s,v,i)=>v?s+Math.abs(i%n-(v-1)%n)+Math.abs(Math.floor(i/n)-Math.floor((v-1)/n)):s,0);
  assert.ok(bound>=2+Math.floor(L/2),`${L}/${seed}: ${bound}`);
 }
});
