import assert from 'node:assert/strict';
import {test} from 'node:test';
let e;try{e=await import('../lib/engine/shared.ts');}catch{}
test('新エンジンの共通関数は固定シードを再現し、選択肢に重複を作らない',()=>{
 assert.equal(typeof e?.context,'function');
 const a=e.context('test',10,73),b=e.context('test',10,73);
 assert.deepEqual(Array.from({length:30},()=>a.int(1,99)),Array.from({length:30},()=>b.int(1,99)));
 const p=a.numeric(12,{type:'text',text:'12'});assert.equal(new Set(p.options).size,p.options.length);assert.equal(p.options[p.solution],12);
});
test('格子の境界を越えず、幅優先探索で最短の解を返す',()=>{
 assert.equal(typeof e?.search,'function');
 assert.deepEqual(e.adjacent(3,4),[2,7]);
 const route=e.search(0,s=>[s+1,s+2].filter(n=>n<=8),s=>s===8);
 assert.deepEqual(route,[0,2,4,6,8]);
});
