import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as S from '../lib/engine/space.ts';
import * as P from '../lib/engine/plane.ts';
import * as L from '../lib/engine/logic.ts';
import * as T from '../lib/engine/trial.ts';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),neg=a=>a.map(v=>-v);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const add=(a,b)=>a.map((v,i)=>v+b[i]);
// The physical replay uses Cartesian centers/normals, never surfaceStep or p.solution.
function physicalFace(p){const {n,start,commands}=p.data;let face=start.face,f=S.FRAMES[face],h=add(f.u.map(v=>v*[0,1,0,-1][start.heading]),f.v.map(v=>v*[-1,0,1,0][start.heading])),pos=f.n.map((v,i)=>v*n+f.u[i]*(2*start.x+1-n)+f.v[i]*(2*start.y+1-n));for(const cmd of commands){if(cmd==='L')h=cross(f.n,h);else if(cmd==='R')h=cross(h,f.n);else{const next=add(pos,h.map(v=>2*v));if(next.every(v=>Math.abs(v)<=n))pos=next;else{pos=add(add(pos,h),neg(f.n));face=S.FRAMES.findIndex(g=>same(g.n,h));h=neg(f.n);f=S.FRAMES[face];}}}return face+1;}
function fits(cells,views){const sets=views.map(v=>new Set(v.map(p=>p.join(','))));for(let z=-6;z<=6;z++)for(let x=-6;x<=6;x++)for(let y=-6;y<=6;y++)if(cells.every(([a,b,c])=>sets[0].has([a+x,c+z].join(','))&&sets[1].has([b+y,c+z].join(','))))return true;return false;}
function rayExit(d,values){let x=-1,y=d.row,dx=1,dy=0;const seen=new Set();for(let k=0;k<4*d.n*d.n+1;k++){x+=dx;y+=dy;if(x<0||y<0||x>=d.n||y>=d.n)return{side:y<0?0:x>=d.n?1:y>=d.n?2:3,index:y<0||y>=d.n?x:y};const key=[x,y,dx,dy].join(',');if(seen.has(key))return null;seen.add(key);const i=d.mirrors.indexOf(y*d.n+x);if(i>=0)[dx,dy]=values[i]===0?[-dy,-dx]:[dy,dx];}return null;}
function publicStarsValid(d,a){if(d.given.some((v,i)=>v>=0&&a[i]!==v))return false;return d.given.every((v,i)=>v!==0||a.reduce((sum,on,j)=>sum+(j!==i&&Math.abs(j%d.n-i%d.n)<=1&&Math.abs(Math.floor(j/d.n)-Math.floor(i/d.n))<=1?on:0),0)===d.counts[i]);}
function botStep(d,positions,dir){const next=positions.map(at=>{const x=at%d.n+[0,1,0,-1][dir],y=Math.floor(at/d.n)+[-1,0,1,0][dir],i=y*d.n+x;return x<0||y<0||x>=d.n||y>=d.n||d.walls.includes(i)?at:i;});return next[0]===next[1]||next[0]===positions[1]&&next[1]===positions[0]?positions:next;}

test('surfacewalk L5 seed0: physical turns and the selected face agree',()=>{
 for(const f of S.FRAMES)assert.deepEqual(cross(f.u,f.v).map(v=>v||0),neg(f.n).map(v=>v||0));
 const p=S.generateSpace('surfacewalk',5,0),face=physicalFace(p),index=p.options.indexOf(face);assert.ok(index>=0);assert.equal(S.checkSpace(p,index),true);assert.equal(p.options.filter(v=>v===face).length,1);
});
test('tunnelpass L1 seed5: exactly one option fits both openings',()=>{
 const p=S.generateSpace('tunnelpass',1,5),indices=p.options.flatMap((v,i)=>fits(v.cells,p.data.views)?[i]:[]);assert.equal(indices.length,1);assert.equal(S.checkSpace(p,indices[0]),true);
});
test('twobots L8 seed19: start has a reachable, distinct target',()=>{
 const p=T.generateTrial('twobots',8,19),d=p.data;assert.notDeepEqual(d.initial.positions,d.target);assert.equal(T.checkTrial(p,[]),false);
 const q=[d.initial.positions],seen=new Set(q.map(JSON.stringify));for(let i=0;i<q.length;i++)for(let dir=0;dir<4;dir++){const v=botStep(d,q[i],dir),k=JSON.stringify(v);if(!seen.has(k)){seen.add(k);q.push(v);}}assert.ok(seen.has(JSON.stringify(d.target)));assert.ok(q.length>1);
});
test('parallel L6 seed10: at least one actual parallel vector exists',()=>{
 const p=P.generatePlane('parallel',6,10),[x,y]=p.data.vector,correct=p.data.cards.flatMap((v,i)=>v.vector[0]*y-v.vector[1]*x===0?[i]:[]);assert.ok(correct.length>0);assert.equal(P.checkPlane(p,correct),true);assert.equal(P.checkPlane(p,[]),false);
});
test('mirrorbeam L6 seed78 and L10 seed159: initial ray misses target',()=>{
 for(const[level,seed]of[[6,78],[10,159]]){const p=P.generatePlane('mirrorbeam',level,seed);assert.notDeepEqual(rayExit(p.data,p.data.initial),p.data.target);assert.equal(P.checkPlane(p,p.data.initial),false);assert.deepEqual(rayExit(p.data,p.solution),p.data.target);}
});
test('minestars L4 seed14: solving still requires changing an unresolved cell',()=>{
 const p=L.generateLogic('minestars',4,14),d=p.data;assert.equal(publicStarsValid(d,d.initial),false);assert.equal(L.checkLogic(p,d.initial),false);
 const answers=[];for(let mask=0;mask<2**(d.n*d.n);mask++){const a=Array.from({length:d.n*d.n},(_,i)=>(mask>>i)&1);if(publicStarsValid(d,a))answers.push(a);}assert.ok(answers.length>0);for(const answer of answers)assert.equal(L.checkLogic(p,answer),true);
});
test('programbot L1 seed1: disallowed repeat commands are rejected',()=>{
 const p=T.generateTrial('programbot',1,1);assert.deepEqual(p.data.allowed,['F','L','R']);assert.equal(T.trialStep(p,p.data.initial,'F2'),null);assert.equal(T.trialStep(p,p.data.initial,'F3'),null);assert.equal(T.checkTrial(p,['F2']),false);assert.equal(T.checkTrial(p,p.solution),true);
 const q={...p,data:{n:4,walls:[],allowed:['F','L','R'],initial:{pos:0,dir:1,used:0},target:{pos:2,dir:1},budget:2}};assert.equal(T.checkTrial(q,['F2']),false);assert.equal(T.checkTrial(q,['F','F']),true);
});
