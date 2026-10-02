import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generate} from '../lib/puzzles.ts';
import {trialStep,checkTrial} from '../lib/engine/trial.ts';

test('late key puzzles make later keys depend on earlier doors',()=>{
 for(let seed=0;seed<24;seed++){
  const p=generate('keydoors',20,seed),d=p.data;
  for(let k=1;k<d.keys.length;k++){
   const walls=new Set([...d.walls,d.doors[k-1]]),q=[d.initial.pos],seen=new Set(q);
   for(let i=0;i<q.length;i++)for(const dir of[0,1,2,3]){const x=q[i]%d.n+[0,1,0,-1][dir],y=Math.floor(q[i]/d.n)+[-1,0,1,0][dir],to=y*d.n+x;if(x<0||y<0||x>=d.n||y>=d.n||walls.has(to)||seen.has(to))continue;seen.add(to);q.push(to);}
   assert.ok(!seen.has(d.keys[k]),`key ${k+1} already reachable before door ${k}: seed ${seed}`);
  }
  assert.ok(checkTrial(p,p.solution));
 }
});
test('later program puzzles require navigating an obstacle, beyond open-board distance',()=>{
 for(let seed=0;seed<24;seed++){
  const p=generate('programbot',12,seed),d=p.data,plain={id:p.id,data:{...d,walls:[],budget:100}},q=[{s:d.initial,z:0}],seen=new Set();let minimum;
  for(let i=0;i<q.length;i++){const{s,z}=q[i];if(s.pos===d.target.pos&&s.dir===d.target.dir){minimum=z;break;}for(const a of d.allowed){const t=trialStep(plain,s,a);if(!t)continue;const k=JSON.stringify([t.pos,t.dir]);if(!seen.has(k)){seen.add(k);q.push({s:t,z:z+1});}}}
  assert.ok(p.solution.length>minimum,`${seed}: obstacle irrelevant`);
 }
});
test('sort depth records the shortest solve rather than the reverse scramble',()=>{
 for(const L of[1,5,10,15,20])for(let seed=0;seed<12;seed++){
  const p=generate('colorsort',L,seed);assert.ok(Number.isInteger(p.data.minimum));assert.equal(p.solution.length,p.data.minimum);assert.ok(checkTrial(p,p.solution));
 }
});
test('weighing and code tasks include truthful prior evidence beyond the introductory band',()=>{
 for(let seed=0;seed<16;seed++){
  const w=generate('ballweigh',12,seed),c=generate('codebreak',1,seed);
  assert.ok(w.data.initial.observations.length>=1);assert.ok(w.data.initial.candidates.length>1);
  assert.ok(c.data.initial.history.length>=1);assert.ok(c.data.candidateCount>1);
  assert.ok(checkTrial(w,w.solution));assert.ok(checkTrial(c,c.solution));
 }
});

test('middle Lights levels require six actual taps, including equivalent tap patterns',()=>{
 for(let seed=0;seed<8;seed++){
  const p=generate('lights',12,seed),d=p.data,n=d.n,N=n*n,target=d.initial.reduce((s,v,i)=>s|(v<<i),0);
  assert.equal(n,4);
  const toggles=Array.from({length:N},(_,i)=>[i,i%n?i-1:-1,i%n<n-1?i+1:-1,i>=n?i-n:-1,i<N-n?i+n:-1].filter(v=>v>=0).reduce((m,j)=>m|(1<<j),0));
  const effects=new Uint32Array(1<<N);let minimum=Infinity;
  for(let mask=1;mask<(1<<N);mask++){const low=mask&-mask,i=31-Math.clz32(low);effects[mask]=effects[mask^low]^toggles[i];if(effects[mask]===target){let bits=mask,cost=0;while(bits){bits&=bits-1;cost++;}minimum=Math.min(minimum,cost);}}
  assert.ok(minimum>=6,`${seed}: ${minimum} actual taps`);
 }
});
