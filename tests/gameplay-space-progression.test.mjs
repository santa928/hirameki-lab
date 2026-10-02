import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generate,foldNet,stageSeed} from '../lib/puzzles.ts';
import {SPACE_META,canExtract} from '../lib/engine/space.ts';
import {spaceMetrics} from '../lib/engine/space-metrics.ts';
import {loadSource,project,projectRequire} from './helpers/tsx-source.mjs';
const React=projectRequire('react'),{renderToStaticMarkup}=projectRequire('react-dom/server');
const key=JSON.stringify,eq=(a,b)=>key(a)===key(b),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const projection=(cells,axis)=>new Set(cells.map(p=>key(axis===0?[p[0],p[2]]:[p[1],p[2]])));
test('space progression enforces reasoning constraints in every actual stage question',()=>{
 for(const[id]of SPACE_META)for(let stage=1;stage<=80;stage++)for(let q=0;q<10;q++){
  const L=Math.floor((stage-1)/4)+1,phase=Math.floor((L-1)/4),p=generate(id,L,stageSeed(id,stage,q)),d=p.data,{features:f,score}=spaceMetrics(p),at=`${id}/${stage}/${q}`;
  assert.ok(Number.isFinite(score),at);assert.ok(d.objective,at);
  if(id==='rollcube'){assert.ok(d.moves.every((v,i)=>!i||v!==(d.moves[i-1]+2)%4),at);assert.notDeepEqual(d.faces,d.end,at);}
  if(id==='viewbuild'){assert.ok(f.height>=2&&f.distinctHeights>=2,at);if(L>=6)assert.equal(f.requiredViews,3,at);}
  if(id==='pack3d'){const volume=d.hole.length;assert.ok(p.options.every(o=>o.cells.length===volume),at);if(phase)assert.ok(f.holeLayers>=2,at);if(phase>=3)assert.equal(f.holeLayers,3,at);}
  if(id==='extract3d'){assert.ok(f.dependencyDepth>=2+Math.min(phase,3),at);const removed=[];for(const chosen of p.solution){assert.ok(canExtract(d.pieces,removed,chosen),at);removed.push(chosen);}assert.equal(removed.length,d.pieces.length,at);}
  if(id==='drop3d'&&L>1)assert.ok(f.gapColumns>=1,at);
  if(id==='ropeends')assert.ok(f.targetCrossings>=1+Math.floor((L+1)/3),at);
  if(id==='contact3d'&&phase)assert.ok(f.verticalContacts>=1,at);
  if(id==='voxelcoords'){for(let axis=0;axis<3;axis++){const counts={};p.options.forEach(v=>{const value=v.split('・')[axis];counts[value]=(counts[value]||0)+1;});assert.ok(Object.values(counts).every(n=>n===2||n===4),at);}const expected=[...d.target];for(const move of d.moves)expected[move.axis]+=d.reverseTask?-move.amount:move.amount;assert.deepEqual(expected,d.result,at);assert.equal(p.options[p.solution],expected.map(v=>v+1).join('・'),at);}
  if(id==='surfacewalk')assert.ok(f.edgeCrossings>=1+Math.floor(phase/2),at);
  if(id==='tunnelpass'&&phase){const pass=p.options.map(o=>d.views.map((view,axis)=>{const hole=new Set(view.map(key));return[...projection(o.cells,axis)].every(v=>hole.has(v));}));assert.equal(pass.filter(v=>v.every(Boolean)).length,1,at);assert.ok(pass.some((v,i)=>i!==p.solution&&v[0]&&!v[1]),at);assert.ok(pass.some((v,i)=>i!==p.solution&&!v[0]&&v[1]),at);}
  if(id==='hinge3d')assert.equal(f.returnsToStart,false,at);
  if(id==='handedness'&&d.exactReflection){const reflected=d.points.map(p=>p.map((v,i)=>i===d.reflectionAxis?-v:v));assert.ok(eq(p.options[p.solution].points,reflected),at);assert.equal(p.options.filter(o=>eq(o.points,reflected)).length,1,at);assert.equal(p.options.length,4,at);}
  if(id==='balancefoot'){const result=[...d.heights];if(d.move){result[d.move.from]--;result[d.move.to]++;}if(d.swap)[result[d.swap.from],result[d.swap.to]]=[result[d.swap.to],result[d.swap.from]];const center=a=>a.reduce((sum,v,i)=>sum+v*(i+.5),0)/a.reduce((sum,v)=>sum+v,0);assert.deepEqual(result,d.resultHeights,at);assert.equal(p.options[p.solution],Math.floor(center(result))+1,at);if(phase>=3)assert.notEqual(Math.floor(center(d.heights)),Math.floor(center(result)),at);}
  if(id==='gravitytray'){assert.ok(f.indispensableMoves>=Math.min(d.moves.length,1+Math.floor(phase/2)),at);if(phase>=2)assert.ok(f.ballCollisionEvents>=1,at);}
  if(id==='viewpoint'&&phase>=2){assert.equal(f.singleCuePositions,0,at);assert.ok(f.occludedTowers>=1,at);}
  if(id==='skewer'){const tokens=d.path.map(([x,y,z])=>d.values[z*d.n*d.n+y*d.n+x]).filter(Boolean);assert.equal(p.options[p.solution],tokens.join(' '),at);assert.ok(new Set(tokens).size>=2,at);if(phase>=2)assert.ok(f.holes>=1,at);if(phase)assert.equal(f.pathHighlighted,false,at);}
 }
});
test('net orientation and rolls recompute from spatial vectors, not the stored solution',()=>{
 for(let L=1;L<=20;L++)for(let seed=0;seed<80;seed++){
  const p=generate('nets',L,seed),d=p.data,faces=foldNet(d.cells);assert.ok(faces);
  const index=v=>d.labels.indexOf(v);
  if(!d.pose){assert.equal(dot(faces[index(d.target)],faces[index(p.solution)]),-1);continue;}
  const t=faces[index(d.pose.top)],front=faces[index(d.pose.front)],right=cross(t,front);
  if(!d.moves){const wanted=d.side==='left'?right.map(v=>-v):right;assert.ok(eq(faces[index(p.solution)],wanted));continue;}
  const vectors=d.labels.map((label,i)=>({label,v:[dot(faces[i],right),-dot(faces[i],front),dot(faces[i],t)]}));
  for(const move of d.moves)for(const token of vectors){const[x,y,z]=token.v;token.v=move===0?[x,z,-y]:move===1?[z,y,-x]:move===2?[x,-z,y]:[-z,y,x];}
  assert.equal(p.solution,vectors.find(token=>eq(token.v,[0,0,1])).label);
 }
});
test('three cut points independently determine all section sides, with no rendered answer polygon in upper lessons',()=>{
 const{SliceArt}=loadSource(`${project}/components/puzzle-art.tsx`),corners=Array.from({length:8},(_,i)=>[i&1,(i>>1)&1,(i>>2)&1]);
 for(const L of[9,13,17,20])for(let seed=0;seed<80;seed++){
  const p=generate('slice',L,seed),d=p.data,[a,b,c]=d.cutPoints,n=cross(b.map((v,i)=>v-a[i]),c.map((v,i)=>v-a[i])),distance=dot(n,a);let count=0;
  for(let i=0;i<8;i++)for(let j=i+1;j<8;j++)if([1,2,4].includes(i^j)){const x=dot(n,corners[i])-distance,y=dot(n,corners[j])-distance;if(x*y<0)count++;}
  assert.equal(count,p.solution);const html=renderToStaticMarkup(React.createElement(SliceArt,{poly:d.poly,cutPoints:d.cutPoints,planeQuad:d.planeQuad,mode:d.sectionMode}));assert.equal((html.match(/<circle /g)||[]).length,3);assert.equal((html.match(/<polygon /g)||[]).length,d.sectionMode==='plane'?2:1);
 }
});
test('gear variants and silhouette photos have their intended visible data',()=>{
 const{SceneView}=loadSource(`${project}/components/scene.tsx`);
 for(const L of[9,13,17,20])for(let seed=0;seed<20;seed++){
  const gears=generate('gears',L,seed),d=gears.data,end=d.links.reduce((state,type)=>type==='belt'?state:1-state,d.start);assert.equal(end,d.end);const html=renderToStaticMarkup(React.createElement(SceneView,{s:d.scene}));if(L>=9&&L<13)assert.match(html,/クロス/);if(d.unknown==='start')assert.match(html,/？/);if(d.missingLink!==undefined)assert.match(html,/つなぎかた/);
  const p=generate('viewpoint',L,seed);const photo=renderToStaticMarkup(React.createElement(SceneView,{s:p.data.scene}));assert.match(photo,/かげが のこる/);assert.equal(p.data.scene.photo.filter(v=>v.label).length,0);
 }
});
