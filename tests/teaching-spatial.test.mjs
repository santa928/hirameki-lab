import assert from 'node:assert/strict';
import {test} from 'node:test';
import {foldTrace} from '../lib/teaching/fold.ts';
import {rollTrace} from '../lib/teaching/roll.ts';
import {skewerTrace} from '../lib/teaching/skewer.ts';
import {generate} from '../lib/puzzles.ts';
import {roll} from '../lib/engine/space.ts';

const selected = mask => mask.flatMap((v,i)=>v?[i]:[]);
test('fold independent one/two/repeated/four-fold fixtures',()=>{
 assert.deepEqual(selected(foldTrace(4,['y'],[7]).mask),[7,11]);
 assert.deepEqual(selected(foldTrace(8,['x','y'],[15]).mask),[27,28,35,36]);
 assert.deepEqual(selected(foldTrace(8,['x','x'],[1]).mask),[1,2,5,6]);
 assert.equal(selected(foldTrace(8,['x','x','y','y'],[2,3]).mask).length,32);
 const t=foldTrace(8,['x','x'],[1]);
 assert.deepEqual(t.foldSteps.map(s=>[s.before.width,s.after.width]),[[8,4],[4,2]]);
 assert.equal(t.unfoldSteps[0].after.width,4);
 const full=t.unfoldSteps.at(-1).creases;
 assert.deepEqual([...new Set(full.filter(c=>c.order===1).map(c=>c.from[0]))],[4]);
 assert.deepEqual([...new Set(full.filter(c=>c.order===2).map(c=>c.from[0]))].sort((a,b)=>a-b),[2,6]);
});
test('fold all valid axis sequences: independent forward map versus reverse trace',()=>{
 for(const n of [4,8])for(let count=1;count<=4;count++)for(let bits=0;bits<2**count;bits++){
  const folds=Array.from({length:count},(_,i)=>bits&(1<<i)?'x':'y');
  if(folds.filter(x=>x==='x').length>Math.log2(n)||folds.filter(x=>x==='y').length>Math.log2(n))continue;
  const w=n/2**folds.filter(x=>x==='x').length,h=n/2**folds.filter(x=>x==='y').length;
  const holes=[0,w*h-1],t=foldTrace(n,folds,holes);
  const expected=Array.from({length:n*n},(_,at)=>{
   let x=at%n,y=Math.floor(at/n),W=n,H=n;
   for(const axis of folds){if(axis==='x'){if(x>=W/2)x=W-1-x;W/=2;}else{if(y>=H/2)y=H-1-y;H/=2;}}
   return +holes.includes(y*w+x);
  });
  assert.deepEqual(t.mask,expected,n+':'+folds.join(''));
  assert.equal(t.foldSteps.length,count);
  assert.equal(t.unfoldSteps.length,count);
  assert.equal(t.unfoldSteps.at(-1).after.width,n);
  assert.equal(t.unfoldSteps.at(-1).after.height,n);
  for(const [u,s] of t.unfoldSteps.entries()){
   for(const p of s.holes){assert.ok(p[0]>=0&&p[0]<s.after.width);assert.ok(p[1]>=0&&p[1]<s.after.height);}
   const remaining=folds.slice(0,count-u-1),currentHoles=new Set(s.holes.map(p=>p.join(',')));
   const restored=Array.from({length:n*n},(_,at)=>{
    let x=at%n,y=Math.floor(at/n),W=n,H=n;
    for(const axis of remaining){if(axis==='x'){if(x>=W/2)x=W-1-x;W/=2;}else{if(y>=H/2)y=H-1-y;H/=2;}}
    return +currentHoles.has([x,y].join(','));
   });
   assert.deepEqual(restored,t.mask,n+':'+folds.join('')+':unfold'+s.order);
   for(const c of s.creases)for(const p of [c.from,c.to]){assert.ok(p[0]>=0&&p[0]<=s.after.width);assert.ok(p[1]>=0&&p[1]<=s.after.height);}
  }
 }
});
test('fold generated engine solution parity at all levels',()=>{
 for(let level=1;level<=20;level++)for(const seed of [14,73021,101]){
  const p=generate('foldpunch',level,seed),d=p.data;
  assert.deepEqual(foldTrace(d.n,d.folds,d.holes).mask,p.solution,level+':'+seed);
 }
});
test('roll all directions preserve complete six-face poses',()=>{
 const faces=[1,2,3,4,5,6],expected=[[4,3,1,2,5,6],[6,5,3,4,1,2],[3,4,2,1,5,6],[5,6,3,4,2,1]];
 for(let move=0;move<4;move++){
  assert.deepEqual(rollTrace(faces,[move]).end,expected[move]);
  assert.deepEqual(rollTrace(faces,[move,(move+2)%4]).end,faces);
  assert.deepEqual(rollTrace(faces,[move,move,move,move]).end,faces);
 }
 const t=rollTrace(faces,[0,1,2,3]);
 assert.deepEqual(t.states.map(s=>s.faces),[faces,...[0,1,2,3].map((_,i)=>[0,1,2,3].slice(0,i+1).reduce(roll,faces))]);
 assert.deepEqual(t.states[0].pose,{top:1,bottom:2,north:3,south:4,east:5,west:6});
});
test('skewer all axes/signs, numeric coordinates, entry, skipped holes',()=>{
 const values=Array.from({length:12},(_,i)=>i+1);values[10]=0;
 const t=skewerTrace({n:2,h:3,axis:2,fixed:[0,1,0],sign:1,values});
 assert.deepEqual(t.steps.map(s=>s.index),[2,6,10]);
 assert.deepEqual(t.steps.map(s=>s.displayCoordinate),[[1,2,1],[1,2,2],[1,2,3]]);
 assert.deepEqual(t.tokens,[3,7]);
 assert.equal(t.answer,'3 7');
 assert.equal(t.steps[2].skipped,true);
 assert.deepEqual(t.entry.coordinate,[0,1,0]);
 assert.deepEqual(t.entry.outside,[0,1,-1]);
 const backwards=skewerTrace({n:2,h:3,axis:2,fixed:[0,1,0],sign:-1,values});
 assert.deepEqual(backwards.tokens,[7,3]);assert.equal(backwards.steps[0].skipped,true);
 for(const axis of [0,1,2])for(const sign of [-1,1]){
  const d={n:2,h:3,axis,fixed:[1,1,2],sign,values},r=skewerTrace(d),length=[2,2,3][axis];
  assert.equal(r.steps.length,length);
  for(let k=0;k<length;k++){const p=[...d.fixed];p[axis]=sign===1?k:length-1-k;assert.deepEqual(r.steps[k].coordinate,p);}
 }
});
test('roll/skewer generated engine parity',()=>{
 for(let level=1;level<=20;level++){
  const r=generate('rollcube',level,73021);assert.deepEqual(rollTrace(r.data.faces,r.data.moves).end,r.data.end);
  const p=generate('skewer',level,73021),d=p.data,t=skewerTrace(d);
  assert.deepEqual(t.steps.map(s=>s.coordinate),d.path);
  assert.equal(t.answer,p.options[p.solution]);
 }
});
test('traces neither mutate inputs nor permit snapshot mutation',()=>{
 const folds=['x','y'],holes=[0],faces=[1,2,3,4,5,6],moves=[0,1],d={n:2,h:2,axis:0,fixed:[0,1,1],sign:1,values:[1,2,3,4,5,6,0,8]};
 const before=JSON.stringify({folds,holes,faces,moves,d});
 const f=foldTrace(4,folds,holes),r=rollTrace(faces,moves),s=skewerTrace(d);
 assert.equal(JSON.stringify({folds,holes,faces,moves,d}),before);
 assert.throws(()=>f.unfoldSteps[0].holes[0][0]=99,TypeError);
 assert.throws(()=>r.states[0].faces[0]=99,TypeError);
 assert.throws(()=>s.steps[0].tokens.push(99),TypeError);
});
test('invalid trace requests fail before producing misleading geometry',()=>{
 assert.throws(()=>foldTrace(4,['x','x','x'],[0]),/fold/i);
 assert.throws(()=>foldTrace(4,['x'],[8]),/hole/i);
 assert.throws(()=>rollTrace([1,2],[0]),/faces/i);
 assert.throws(()=>rollTrace([1,2,3,4,5,6],[4]),/move/i);
 assert.throws(()=>skewerTrace({n:2,h:2,axis:3,fixed:[0,0,0],sign:1,values:Array(8).fill(1)}),/axis/i);
});
