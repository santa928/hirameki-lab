import assert from 'node:assert/strict';import{test}from'node:test';
let mod;try{mod=await import('../lib/engine/number.ts');}catch{}
test('数の18ゲームが難易度別に正しい問題を作る',()=>{
 assert.equal(typeof mod?.generateNumber,'function');assert.equal(mod.NUMBER_META.length,18);
 for(const [id]of mod.NUMBER_META)for(const level of[1,5,10,15,20])for(let seed=0;seed<25;seed++){
  const p=mod.generateNumber(id,level,seed);assert.ok(p,id);assert.equal(mod.checkNumber(p,p.solution),true,`${id}/${level}/${seed}`);
  if(p.options){assert.equal(new Set(p.options.map(x=>JSON.stringify(x))).size,p.options.length);assert.ok(p.options.length>=3);}
  assert.equal(mod.checkNumber(p,null),false);
 }
});
test('分数比較は見た目でなく正確な比率で、演算は別解も認める',()=>{
 assert.equal(typeof mod?.generateNumber,'function');
 for(let seed=0;seed<80;seed++){
  const p=mod.generateNumber('fractions',20,seed);const values=p.options.map(s=>s.a/s.b);
  assert.equal(values[p.solution],Math.max(...values));assert.equal(new Set(values).size,values.length);
  const e=mod.generateNumber('expressions',20,seed);assert.equal(mod.calculate(e.data.values,e.solution),e.data.target);
 }
 assert.equal(mod.calculate([3,4,2],['+','×']),14);
});
