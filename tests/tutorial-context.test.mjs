import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generate,check} from '../lib/puzzles.ts';
import {generateStage,stageCount} from '../lib/stages.ts';
import {makeTutorial} from '../lib/tutorial.ts';
test('お手本は現在のstage概念と難度を保ち別問題を使う',()=>{for(const id of ['translate','foldpunch','rollcube','skewer','perimeter','surfacewalk']){const stage=stageCount(id),source=generateStage(id,stage,0),before=JSON.stringify(source),t=makeTutorial(id,{mode:'stage',stage,source});assert.equal(t.p.level,source.level,id);assert.notEqual(t.p.seed,source.seed,id);assert.notDeepEqual(t.p.data,source.data,id);assert.equal(t.p.data.concept,source.data.concept,id);assert.ok(check(t.p,t.frames.at(-1).answer),id);assert.equal(JSON.stringify(source),before,id);}});
test('時限とじっくりも現在levelを維持する',()=>{for(const mode of ['timed','free']){const source=generate('rotate',17,391);const t=makeTutorial('rotate',{mode,level:17,source});assert.equal(t.p.level,17);assert.notEqual(t.p.seed,source.seed);assert.ok(check(t.p,t.frames.at(-1).answer));}});
test('trialお手本は先頭を切り捨てず全操作を保持する',()=>{for(const id of ['frogs','flood','trainyard']){const t=makeTutorial(id,{mode:'free',level:5});assert.deepEqual(t.frames[1].answer,t.p.solution.slice(0,1),id);assert.deepEqual(t.frames.at(-1).answer,t.p.solution,id);assert.equal(t.frames.length,t.p.solution.length+1,id);assert.match(t.frames[1].caption,id==='frogs'?/マス/:id==='flood'?/色|いろ/:/いりぐち|たいひ|しゅっぱつ/,id);}});
test('推理対象は途中の計算図を表示し答えだけの例へ戻らない',()=>{for(const id of ['rotate','mirror','fit','area','perimeter','translate','angles','circlecenter','scale','foldpunch','rollcube','skewer']){const {frames}=makeTutorial(id);assert.ok(frames.some(f=>f.scene&&['transform','calculate'].includes(f.phase)),id);assert.ok(frames.every(f=>f.scene),id);}});
test('空間5対象は移動/支持計算の途中図を保持する',()=>{for(const id of ['surfacewalk','hinge3d','gravitytray','drop3d','nets']){const {frames}=makeTutorial(id);assert.ok(frames.every(f=>f.scene),id);assert.ok(frames.some(f=>['transform','calculate'].includes(f.phase)),id);}});
test('コインのお手本は現在の初期枚数から増減して最少解へ進む',()=>{for(const stage of [1,29,57]){const source=generateStage('mincoins',stage,0),t=makeTutorial('mincoins',{mode:'stage',stage,source});assert.deepEqual(t.frames[0].answer,t.p.data.initial);assert.ok(check(t.p,t.frames.at(-1).answer));for(let i=1;i<t.frames.length;i++)assert.equal(t.frames[i].answer.reduce((n,v,j)=>n+Math.abs(v-t.frames[i-1].answer[j]),0),1);}});
test('4×4スライドは別の合法5手導入を明示し全状態を再生する',()=>{const source=generateStage('slide',stageCount('slide'),0),before=JSON.stringify(source),t=makeTutorial('slide',{mode:'stage',stage:stageCount('slide'),source});assert.equal(t.p.data.n,4);assert.equal(t.p.level,source.level);assert.equal(t.frames.length,6);assert.match(t.frames[0].caption,/4×4.*5手/);for(let i=1;i<t.frames.length;i++){const a=t.frames[i-1].answer,b=t.frames[i].answer,changes=a.flatMap((v,j)=>v===b[j]?[]:[j]);assert.equal(changes.length,2);assert.ok(changes.includes(a.indexOf(0)));assert.equal(Math.abs(changes[0]%4-changes[1]%4)+Math.abs(Math.floor(changes[0]/4)-Math.floor(changes[1]/4)),1);}assert.ok(check(t.p,t.frames.at(-1).answer));assert.equal(JSON.stringify(source),before);});

test('折り結果と穴あけを別の状態にし、折った寸法を先に見せる',()=>{const {p,frames}=makeTutorial('foldpunch');assert.ok(frames.some(f=>f.scene?.size.width===p.data.w&&f.scene?.size.height===p.data.h&&f.scene.holes.length===0));assert.ok(frames.some(f=>f.scene.holes.length>0));});


test('立方体は同じ初期6面から4方向を独立に1手ずつ示し実際の例へ戻る',async()=>{
 const {rollTrace}=await import('../lib/teaching/roll.ts');
 const labels=['奥 ↑','右 →','手前 ↓','左 ←'];
 for(const stage of [1,Math.ceil(stageCount('rollcube')/2),stageCount('rollcube')]){
  const source=generateStage('rollcube',stage,0),before=JSON.stringify(source),{p,frames}=makeTutorial('rollcube',{mode:'stage',stage,source});
  const actual=rollTrace(p.data.faces,p.data.moves),initial=actual.states[0].pose;
  assert.equal(frames.length,8+actual.states.length);
  for(let direction=0;direction<4;direction++){
   const start=frames[direction*2],end=frames[direction*2+1],single=rollTrace(p.data.faces,[direction]);
   assert.deepEqual(start.scene.pose,initial);assert.equal(start.scene.move,null);
   assert.deepEqual(end.scene.pose,single.states[1].pose);assert.equal(end.scene.move,direction);
   for(const frame of [start,end]){assert.ok(frame.caption.includes('はじめの6面から'+labels[direction]));assert.deepEqual(frame.answer,[]);}
  }
  assert.deepEqual(frames[8].scene.pose,initial);assert.match(frames[8].caption,/はじめの6面に戻す/);
  for(let i=0;i<actual.states.length;i++)assert.deepEqual(frames[8+i].scene.pose,actual.states[i].pose);
  assert.deepEqual(frames.at(-1).answer,p.solution);assert.ok(check(p,frames.at(-1).answer));assert.equal(JSON.stringify(source),before);
 }
});


test('列車の操作字幕は実画面のいりぐち・たいひ・しゅっぱつと一致する',()=>{
 const name=v=>v==='in'?'いりぐち':v==='out'?'しゅっぱつ':'たいひ '+(v+1);
 const observed=new Set();
 for(const stage of [1,Math.ceil(stageCount('trainyard')/2),stageCount('trainyard')]){
  const source=generateStage('trainyard',stage,0),before=JSON.stringify(source),{p,frames}=makeTutorial('trainyard',{mode:'stage',stage,source});
  assert.equal(frames.length,p.solution.length+1);
  for(let i=0;i<p.solution.length;i++){
   const action=p.solution[i],caption=frames[i+1].caption;
   assert.ok(caption.includes(name(action.from)+'から '+name(action.to)+'へ'),stage+':'+i+':'+caption);
   assert.doesNotMatch(caption,/入口|出口|待避線/);
   observed.add(typeof action.from==='number'?'siding':action.from);observed.add(typeof action.to==='number'?'siding':action.to);
   assert.deepEqual(frames[i+1].answer,p.solution.slice(0,i+1));
  }
  assert.ok(check(p,frames.at(-1).answer));assert.equal(JSON.stringify(source),before);
 }
 assert.deepEqual([...observed].sort(),['in','out','siding']);
});
