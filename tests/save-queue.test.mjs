import assert from 'node:assert/strict';
import {test} from 'node:test';
let createSaveQueue;
try{({createSaveQueue}=await import('../lib/save-queue.ts'));}catch{}
test('別セッションの保存完了で失敗表示を上書きしない',async()=>{
 assert.equal(typeof createSaveQueue,'function');
 let releaseA;const gate=new Promise(r=>releaseA=r),states={};
 const save=createSaveQueue(async s=>{if(s.id==='A')await gate;else throw Error('offline');},(id,status)=>states[id]=status);
 const a=save({id:'A'});await save({id:'B'});
 assert.equal(states.B,'failed');releaseA();await a;
 assert.deepEqual(states,{A:'saved',B:'failed'});
});
test('保存中の再試行をまとめ、失敗した記録は再試行できる',async()=>{
 assert.equal(typeof createSaveQueue,'function');
 let release,calls=0;const gate=new Promise(r=>release=r),states=[];
 const save=createSaveQueue(async()=>{calls++;if(calls===1){await gate;throw Error('offline');}},(_,s)=>states.push(s));
 const a=save({id:'A'}),b=save({id:'A'});assert.equal(calls,1);
 release();await Promise.all([a,b]);await save({id:'A'});
 assert.equal(calls,2);assert.deepEqual(states,['saving','failed','saving','saved']);
});
