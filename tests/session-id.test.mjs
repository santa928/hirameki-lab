import assert from 'node:assert/strict';
import {test} from 'node:test';
let sessionId;try{({sessionId}=await import('../lib/session-id.ts'));}catch{}
test('randomUUIDのないブラウザでも保存用UUIDを生成する',()=>{
 assert.equal(typeof sessionId,'function');
 const source={getRandomValues:globalThis.crypto.getRandomValues.bind(globalThis.crypto)};
 const ids=Array.from({length:30},()=>sessionId(source));
 assert.equal(new Set(ids).size,30);
 for(const id of ids)assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
