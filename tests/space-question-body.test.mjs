import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generate} from '../lib/puzzles.ts';
import {spaceQuestionBody} from '../lib/engine/space-metrics.ts';

test('fresh question keys ignore changed distractors when the source fixes the task',()=>{
 for(const id of ['pack3d','drop3d','contact3d','voxelcoords','surfacewalk','balancefoot','hinge3d','gravitytray','skewer']){
  const p=generate(id,8,21),q=structuredClone(p),other=generate(id,8,22);
  q.options=other.options;
  assert.equal(spaceQuestionBody(p),spaceQuestionBody(q),id);
 }
});

test('introductory rolling tasks count moves, not renamed faces or sampled wrong faces',()=>{
 const bodies=new Set();
 for(let level=1;level<=4;level++)for(let seed=0;seed<200;seed++)bodies.add(spaceQuestionBody(generate('rollcube',level,seed)));
 // Lengths 1..3, four directions, and no immediate reversal: 4 + 12 + 36.
 assert.equal(bodies.size,52);
});

test('the first hinge theme can supply ten different source and turn tasks',()=>{
 const bodies=new Set();
 for(let level=1;level<=4;level++)for(let seed=0;seed<100;seed++)bodies.add(spaceQuestionBody(generate('hinge3d',level,seed)));
 assert.ok(bodies.size>=10,`Only ${bodies.size} different hinge tasks`);
});

test('net body keys remove arbitrary face names but retain enough distinct first-theme tasks',()=>{
 const bodies=new Set();
 for(let level=1;level<=20;level++)for(let seed=0;seed<40;seed++){
  const p=generate('nets',level,seed),q=structuredClone(p),rename=v=>7-v;
  q.data.labels=q.data.labels.map(rename);q.data.target=rename(q.data.target);
  if(q.data.pose)q.data.pose={top:rename(q.data.pose.top),front:rename(q.data.pose.front)};
  q.options=q.options.map(rename).reverse();q.solution=rename(q.solution);
  assert.equal(spaceQuestionBody(p),spaceQuestionBody(q));
  if(level<=4)bodies.add(spaceQuestionBody(p));
 }
 assert.ok(bodies.size>=10);
});

test('hidden gear links and unordered tray walls do not create new question bodies',()=>{
 const gears=generate('gears',20,11),changed=structuredClone(gears),at=changed.data.missingLink;
 changed.data.links[at]=changed.data.links[at]==='gear'?'crossed':'gear';
 changed.data.scene.links=[...changed.data.links];
 assert.equal(spaceQuestionBody(gears),spaceQuestionBody(changed));
 const tray=generate('gravitytray',20,12),reordered=structuredClone(tray);
 reordered.data.scene.walls.reverse();reordered.data.scene.balls.reverse();
 assert.equal(spaceQuestionBody(tray),spaceQuestionBody(reordered));
});

test('skewer keys ignore unused ray coordinate and consistent symbol renaming',()=>{
 const p=generate('skewer',8,21),q=structuredClone(p),rename=v=>v?5-v:0;
 q.data.fixed[q.data.axis]=(q.data.fixed[q.data.axis]+1)%q.data.n;
 q.data.values=q.data.values.map(rename);
 q.data.scene.ray.fixed=[...q.data.fixed];
 q.data.scene.values=q.data.values.map(v=>v?String(v):'');
 q.options=q.options.map(v=>v.split(' ').map(x=>rename(Number(x))).join(' '));
 assert.equal(spaceQuestionBody(p),spaceQuestionBody(q));
});
