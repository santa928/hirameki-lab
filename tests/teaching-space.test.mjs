import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generate,foldNet} from '../lib/puzzles.ts';
import * as space from '../lib/engine/space.ts';
import * as teaching from '../lib/teaching/space-steps.ts';
const clean=value=>JSON.parse(JSON.stringify(value));
const puzzle=(id,data)=>({id,level:1,seed:1,kind:'visual-choice',data,solution:0,hint:'',options:[]});
test('hinge keeps pivot and prefix fixed and rotates only the tail with signed axes',()=>{
 assert.equal(typeof space.applyHingeTurn,'function');
 const points=[[0,0,0],[2,0,0],[2,2,0]];
 assert.deepEqual(space.applyHingeTurn(points,{pivot:1,axis:0,q:1}),[[0,0,0],[2,0,0],[2,0,2]]);
 assert.deepEqual(space.applyHingeTurn(points,{pivot:1,axis:0,q:3}),[[0,0,0],[2,0,0],[2,0,-2]]);
 assert.deepEqual(points,[[0,0,0],[2,0,0],[2,2,0]]);
});
test('drop uses one offset and preserves the unsupported air gap',()=>{
 assert.equal(typeof space.dropPlacement,'function');
 const d=space.dropPlacement(2,[3,0,0,0],[[0,0,0],[1,0,0],[1,0,1]]);
 assert.equal(d.offset,3);assert.deepEqual(d.result,[4,5,0,0]);
 assert.deepEqual(d.supports,[0]);assert.deepEqual(d.gaps,[{at:1,from:0,to:3}]);
 assert.deepEqual(d.placed,[[0,0,3],[1,0,3],[1,0,4]]);
});
test('tilt settles the foremost ball first, stopping later balls at the settled ball',()=>{
 assert.equal(typeof space.tiltTrace,'function');
 const trace=space.tiltTrace([0,1],3,[],1);
 assert.deepEqual(trace.balls,[1,2]);assert.deepEqual(trace.order,[1,0]);
 assert.deepEqual(trace.steps.map(s=>({from:s.from,to:s.to,reason:s.reason,blocker:s.blocker})),[
 {from:1,to:2,reason:'edge',blocker:3},{from:0,to:1,reason:'ball',blocker:2}]);
 const blocked=space.tiltTrace([0],3,[2],1);
 assert.deepEqual(blocked.steps[0].path,[0,1]);assert.equal(blocked.steps[0].reason,'wall');
});
test('surface teaching exposes local and world heading across every face boundary',()=>{
 assert.equal(typeof teaching?.spaceTeaching,'function');
 for(let face=0;face<6;face++)for(let heading=0;heading<4;heading++){
 const start={face,x:[1,2,1,0][heading],y:[0,1,2,1][heading],heading};
 const p=puzzle('surfacewalk',{n:3,start,commands:['F','R','F']});
 const steps=teaching.spaceTeaching(p),moved=steps.find(s=>s.phase==='transform');
 assert.deepEqual(moved.scene.state,space.surfaceStep(start,3));
 assert.equal(moved.scene.crossed,true);assert.notEqual(moved.scene.state.face,face);
 const f=space.FRAMES[moved.scene.state.face],dx=[0,1,0,-1][moved.scene.state.heading],dy=[-1,0,1,0][moved.scene.state.heading];
 assert.deepEqual(moved.scene.worldHeading,clean(f.u.map((v,i)=>v*dx+f.v[i]*dy)));
 assert.deepEqual(moved.scene.worldHeading,clean(space.FRAMES[face].n.map(v=>-v)));
 }
});
test('space teaching gives actual derived geometry before comparison without mutating the source',()=>{
 assert.equal(typeof teaching?.spaceTeaching,'function');
 for(const id of ['surfacewalk','hinge3d','gravitytray','drop3d','nets'])for(const level of [1,5,9,13,17,20]){
 const p=generate(id,level,73021),before=JSON.stringify(p),steps=teaching.spaceTeaching(p);
 assert.ok(steps.some(s=>s.phase==='transform'||s.phase==='calculate'),id+'/'+level);
 assert.equal(steps[0].phase,'observe');assert.equal(steps.at(-1).phase,'compare');
 assert.equal(JSON.stringify(p),before);
 const last=steps.at(-1).scene;
 if(id==='surfacewalk')assert.equal(last.state.face+1,p.options[p.solution]);
 if(id==='hinge3d')assert.deepEqual(last.points,p.options[p.solution].points);
 if(id==='gravitytray')assert.deepEqual(last.balls,p.options[p.solution].values.flatMap((value,at)=>value==='●'?[at]:[]));
 if(id==='drop3d')assert.deepEqual(last.result,p.options[p.solution].values);
 if(id==='nets')assert.equal(last.resolved,p.solution);
 }
});
test('nets opposite and side retain folded face correspondence instead of highlighting a candidate',()=>{
 assert.equal(typeof teaching?.spaceTeaching,'function');
 for(const level of [1,5,7,9,13,20]){
 const p=generate('nets',level,3),steps=teaching.spaceTeaching(p);
 assert.deepEqual(steps[0].scene.normals,clean(foldNet(p.data.cells)));
 assert.equal(steps.at(-1).scene.resolved,p.solution);
 assert.equal(steps[0].scene.task,p.data.moves?'roll':p.data.pose?'side':'opposite');
 }
});
test('spaceTeaching returns null for an unrelated game',()=>{assert.equal(typeof teaching?.spaceTeaching,'function');assert.equal(teaching.spaceTeaching(puzzle('count',{})),null);});

test('surface top edge changes local heading while preserving travel around the cube',()=>{
 const p=puzzle('surfacewalk',{n:3,start:{face:0,x:1,y:0,heading:0},commands:['F']});
 const moved=teaching.spaceTeaching(p).find(s=>s.phase==='transform').scene;
 assert.deepEqual(moved.state,{face:3,x:1,y:0,heading:2});
 assert.deepEqual(moved.worldHeading,[0,0,-1]);
});
test('hinge quarter turns obey each signed axis with a non-origin pivot',()=>{
 const points=[[3,4,5],[4,6,8]],pivot=points[0];
 const expected=[[[4,1,7],[4,7,3]],[[6,6,4],[0,6,6]],[[1,5,8],[5,3,8]]];
 for(let axis=0;axis<3;axis++)for(const [i,q] of [1,3].entries()){
  const actual=space.applyHingeTurn(points,{pivot:0,axis,q});
  assert.deepEqual(actual,[pivot,expected[axis][i]]);
 }
});
test('drop teaching represents support and air gap before comparing final heights',()=>{
 const p=puzzle('drop3d',{n:2,heights:[3,0,0,0],piece:[[0,0,0],[1,0,0],[1,0,1]]});
 const steps=teaching.spaceTeaching(p),contact=steps.find(s=>s.phase==='transform').scene;
 assert.deepEqual(contact.placed,[[0,0,3],[1,0,3],[1,0,4]]);
 assert.deepEqual(contact.supports,[0]);assert.deepEqual(contact.gaps,[{at:1,from:0,to:3}]);
 assert.equal(steps.filter(s=>s.scene.gap).length,1);
 assert.deepEqual(steps.at(-1).scene.result,[4,5,0,0]);
});
test('tilt teaching displays the settled ball blocking the next one',()=>{
 const p=puzzle('gravitytray',{n:3,walls:[],balls:[0,1],moves:[1]});
 const moved=teaching.spaceTeaching(p).filter(s=>s.phase==='transform');
 assert.deepEqual(moved.map(s=>s.scene.balls),[[2,0],[2,1]]);
 assert.equal(moved[1].scene.stop.reason,'ball');
 assert.deepEqual(moved[1].scene.stop.path,[0,1]);
 assert.deepEqual(teaching.spaceTeaching(p).at(-1).scene.balls,[1,2]);
});
test('source and answer poisoning cannot replace a derived teaching state',()=>{
 for(const id of ['surfacewalk','hinge3d','gravitytray','drop3d','nets']){
  const p=generate(id,13,81021),correct=teaching.spaceTeaching(p);
  const bad={...p,solution:'POISON',options:[]};
  assert.deepEqual(teaching.spaceTeaching(bad),correct);
  correct[0].scene.type='mutated';
  assert.notEqual(teaching.spaceTeaching(p)[0].scene.type,'mutated');
 }
});
