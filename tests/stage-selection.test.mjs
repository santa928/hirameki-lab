import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectStageCandidates,taskFingerprint} from '../lib/stage-selection.ts';

test('a learning step uses distinct tasks in four increasingly demanding missions',()=>{
 const pool=Array.from({length:80},(_,i)=>({seed:i,score:i,body:`task${i}`}));
 const stages=selectStageCandidates([...pool].reverse());
 assert.equal(stages.length,4);assert.ok(stages.every(s=>s.length===10));
 assert.equal(new Set(stages.flat().map(c=>c.body)).size,40);
 for(let i=1;i<4;i++)assert.ok(Math.max(...stages[i-1].map(c=>c.score))<=Math.min(...stages[i].map(c=>c.score)));
 assert.ok(stages[0][0].score<10&&stages[3].at(-1).score>70,'cover both ends of the actual demand range');
});
test('option order and stored witnesses cannot disguise a repeated question',()=>{
 const p={id:'rails',kind:'rails',level:1,seed:1,data:{n:3,types:[1,0,1],initial:[0,1,2],start:0,end:8,path:[0,3,6,7,8]},solution:[1,2,3]};
 const q={...p,seed:456,data:{...p.data,path:[0,1,4,7,8]},solution:[3,2,1]};
 assert.equal(taskFingerprint(p),taskFingerprint(q));
 assert.notEqual(taskFingerprint(p),taskFingerprint({...q,data:{...q.data,initial:[1,1,2]}}));
 const pool=Array.from({length:50},(_,i)=>({seed:i,score:i,body:`body${i%40}`}));
 assert.equal(new Set(selectStageCandidates(pool).flat().map(c=>c.body)).size,40);
});
test('finite pools reject padded courses and accept a shorter complete stage',()=>{
 const pool=Array.from({length:15},(_,i)=>({seed:i,score:i,body:`body${i}`}));
 assert.throws(()=>selectStageCandidates(pool),/distinct/);
 assert.equal(selectStageCandidates(pool,10).length,1);
 assert.throws(()=>selectStageCandidates(pool.slice(0,9),10),/distinct/);
});
import {reserveThemeBodies} from '../lib/stage-selection.ts';
test('earlier practice cannot consume the only questions available to a later theme',()=>{
 const task=i=>({body:String(i),seed:i,score:i}),pools=[Array.from({length:30},(_,i)=>task(i)),Array.from({length:10},(_,i)=>task(i))];
 const reserved=reserveThemeBodies(pools);assert.equal(reserved[0].size,10);assert.equal(reserved[1].size,10);
 assert.equal([...reserved[0]].filter(b=>reserved[1].has(b)).length,0);
 assert.throws(()=>reserveThemeBodies([pools[1],pools[1]]));
});
