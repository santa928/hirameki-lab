import assert from 'node:assert/strict';
import { test } from 'node:test';
let engine;
try { engine = await import('../lib/puzzles.ts'); } catch {}
test('全ゲームの問題エンジンが存在する',()=>assert.equal(typeof engine?.generate,'function'));
test('選択肢の見た目と送信する回答が全ゲームで一致する',()=>{
 assert.equal(typeof engine?.optionAnswer,'function');
 for(const id of engine.IDS)for(const level of [1,10,20]){const p=engine.generate(id,level,2);if(p.options){const valid=p.options.map((_,i)=>engine.check(p,engine.optionAnswer(p,i)));assert.equal(valid.filter(Boolean).length,1,id);}}
});
test('120種類・20段階で解があり、同じシードは同じ問題になる',()=>{
 assert.ok(engine);
 for(const id of engine.IDS) for(const level of [1,5,10,15,20]) for(let seed=1;seed<=25;seed++){
  const p=engine.generate(id,level,seed);
  assert.ok(p.solution!==undefined,`${id}/${level}/${seed} missing solution`);
  assert.ok(engine.check(p,p.solution),`${id}/${level}/${seed} invalid solution`);
  assert.deepEqual(p,engine.generate(id,level,seed));
  if(p.options){assert.equal(new Set(p.options.map(x=>JSON.stringify(x))).size,p.options.length,`${id} duplicate options`);assert.ok(p.options.length>=2);}
 }
 assert.equal(engine.IDS.length,120);
});
test('展開図は6面が重ならず、正しい向かい側を持つ',()=>{
 assert.equal(typeof engine.foldNet,'function');
 assert.equal(engine.foldNet([[0,0],[1,0],[2,0],[3,0],[4,0],[5,0]]),null);
 for(let level=1;level<=20;level++)for(let seed=0;seed<30;seed++){
  const p=engine.generate('nets',level,seed),fold=engine.foldNet(p.data.cells);
  assert.ok(fold);assert.equal(new Set(fold.map(v=>v.join(','))).size,6);
  const a=p.data.labels.indexOf(p.data.target),b=p.data.labels.indexOf(p.solution);
  if(!p.data.pose)assert.equal(fold[a].reduce((s,v,i)=>s+v*fold[b][i],0),-1);
 }
 const forms=new Set(Array.from({length:30},(_,i)=>JSON.stringify(engine.generate('nets',20,i).data.cells)));
 assert.ok(forms.size>5,'上級は複数の展開図を出す');
});
test('上級レールは異なる道筋になり、初期状態は未解決で解ける',()=>{
 const routes=new Set();for(let seed=0;seed<60;seed++){
  const p=engine.generate('rails',20,seed);routes.add(JSON.stringify(p.data.path));
  assert.equal(engine.check(p,p.data.initial),false);assert.equal(engine.check(p,p.solution),true);
  for(let i=1;i<p.data.path.length;i++)assert.ok(engine.neighbors(p.data.path[i-1],p.data.n).includes(p.data.path[i]));
 }
 assert.ok(routes.size>10,'いつも同じ蛇行路にしない');
});
