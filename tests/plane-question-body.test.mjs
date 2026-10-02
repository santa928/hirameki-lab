import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generatePlane,PLANE_META} from '../lib/engine/plane.ts';
import {generateOriginalPlane} from '../lib/engine/plane-original.ts';
import {planeQuestionBody} from '../scripts/stage-audit/profiles/plane.ts';

// Catches accidentally counting label renaming as new jigsaw content.
test('jigsaw body ignores edge-number renaming and tile tray order',()=>{
 const p=generatePlane('jigsaw',13,73),q=structuredClone(p);
 const renamed=new Map([[1,8],[2,3],[3,7],[4,2]]);
 q.data.tiles=q.data.tiles.map(t=>t.map(v=>v===0?0:Math.sign(v)*renamed.get(Math.abs(v)))).reverse();
 assert.deepEqual(planeQuestionBody(p),planeQuestionBody(q));
});

// Catches destructive canonicalization that erases repeated-label constraints.
test('jigsaw body keeps different edge matching constraints distinct',()=>{
 const p={id:'jigsaw',data:{n:2,tiles:[[0,1,2,0],[0,0,3,-1],[-2,4,0,0],[-3,0,0,-4]]}};
 const q={id:'jigsaw',data:{n:2,tiles:[[0,1,2,0],[0,0,3,-1],[-2,3,0,0],[-3,0,0,-3]]}};
 assert.notDeepEqual(planeQuestionBody(p),planeQuestionBody(q));
});

// Displayed orientation remains part of the physical assembly task.
test('jigsaw body preserves displayed tile orientations and sign relations',()=>{
 const p={id:'jigsaw',data:{n:2,tiles:[[0,1,2,0],[0,0,3,-1],[-2,4,0,0],[-3,0,0,-4]]}};
 const rotated=structuredClone(p),flipped=structuredClone(p);
 rotated.data.tiles[0]=[0,0,1,2];
 flipped.data.tiles[0][1]=-1;flipped.data.tiles[1][3]=1;
 assert.notDeepEqual(planeQuestionBody(p),planeQuestionBody(rotated));
 assert.notDeepEqual(planeQuestionBody(p),planeQuestionBody(flipped));
});

test('all 24 plane bodies ignore curriculum and explanatory metadata',()=>{
 for(const id of ['rotate','mirror','fit','square','symmetry','area',...PLANE_META.map(v=>v[0])]){
  const p=generateOriginalPlane(id,17,42)??generatePlane(id,17,42),q=structuredClone(p);
  q.seed+=1;q.level=1;q.hint='changed';Object.assign(q.data,{concept:99,difficulty:999,prompt:'changed',help:'changed',_audit:'changed'});
  assert.deepEqual(planeQuestionBody(p),planeQuestionBody(q),id);
 }
});

test('fold order commutes while punch location remains meaningful',()=>{
 const p=generatePlane('foldpunch',17,42),q=structuredClone(p);q.data.folds.reverse();q.data.holes.reverse();
 assert.deepEqual(planeQuestionBody(p),planeQuestionBody(q));
 const r=structuredClone(p);r.data.holes=[0,1];const s=structuredClone(p);s.data.holes=[0,2];
 assert.notDeepEqual(planeQuestionBody(r),planeQuestionBody(s));
});

test('parallel ignores line lengths, offsets and direction signs but keeps slopes',()=>{
 const p=generatePlane('parallel',17,42),q=structuredClone(p);
 q.data.vector=q.data.vector.map(v=>-3*v);q.data.cards=q.data.cards.map(c=>({...c,vector:c.vector.map(v=>-2*v),length:99,offset:[50,50]})).reverse();
 assert.deepEqual(planeQuestionBody(p),planeQuestionBody(q));
 q.data.cards[0].vector=[99,1];assert.notDeepEqual(planeQuestionBody(p),planeQuestionBody(q));
});

test('map-color ignores region and palette labels but keeps clue locations',()=>{
 const p=generatePlane('mapcolor',13,42),q=structuredClone(p),k=p.data.k;
 q.data.regions=q.data.regions.map(v=>k-1-v);q.data.initial=q.data.initial.map(v=>v<0?v:(v+1)%p.data.colors).reverse();
 assert.deepEqual(planeQuestionBody(p),planeQuestionBody(q));
 const r=structuredClone(p);r.data.initial=Array.from({length:k},()=>-1);assert.notDeepEqual(planeQuestionBody(p),planeQuestionBody(r));
});

test('angles ignore known-sector order but retain multiplicity and total',()=>{
 const p={id:'angles',data:{total:180,parts:[20,40,120],missing:2}},q={id:'angles',data:{total:180,parts:[40,120,20],missing:1}},r={id:'angles',data:{total:180,parts:[30,30,120],missing:2}};
 assert.deepEqual(planeQuestionBody(p),planeQuestionBody(q));assert.notDeepEqual(planeQuestionBody(p),planeQuestionBody(r));
 const s=structuredClone(q);s.data.total=360;assert.notDeepEqual(planeQuestionBody(p),planeQuestionBody(s));
});

test('translation order and mirror starting orientations are retained',()=>{
 const p=generatePlane('translate',17,42),q=structuredClone(p);q.data.moves=[...q.data.moves.slice(1),q.data.moves[0]];
 assert.notDeepEqual(planeQuestionBody(p),planeQuestionBody(q));
 const r=generatePlane('mirrorbeam',13,42),s=structuredClone(r);s.data.initial[0]^=1;assert.notDeepEqual(planeQuestionBody(r),planeQuestionBody(s));
});

test('circle-center ignores common translation while preserving candidate relationships',()=>{
 const p=generatePlane('circlecenter',1,42),q=structuredClone(p);
 q.data.points=q.data.points.map(([x,y])=>[x+7,y+3]);q.data.candidates=q.data.candidates.map(([x,y])=>[x+7,y+3]);
 assert.deepEqual(planeQuestionBody(p),planeQuestionBody(q));
 q.data.candidates[0][0]+=1;assert.notDeepEqual(planeQuestionBody(p),planeQuestionBody(q));
});
