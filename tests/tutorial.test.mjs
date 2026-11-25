import assert from'node:assert/strict';import{test}from'node:test';import{IDS,check}from'../lib/puzzles.ts';import{makeTutorial}from'../lib/tutorial.ts';
test('120種類のお手本は最後に正しい解へ到達する',()=>{assert.equal(IDS.length,120);for(const id of IDS){const{p,frames}=makeTutorial(id);assert.ok(frames.length>1,id);assert.ok(check(p,frames.at(-1).answer),id);assert.equal(check(p,frames[0].answer),false,id);}});

test('ぶんすうの みちの初級は全体と星までの区間を順に数える',()=>{
 for(let level=1;level<=4;level++){
  const {p,frames}=makeTutorial('fractionline',{mode:'free',level});
  const {steps,at}=p.data.scene;
  assert.deepEqual(frames.map(f=>f.scene?.countedIntervals),[steps,at,at]);
  assert.match(frames[0].caption,new RegExp(steps+'こ.*下の数（分母）'));
  assert.match(frames[1].caption,new RegExp(at+'こ.*上の数（分子）'));
  assert.equal(frames.at(-1).scene.fraction.join('/'),p.options[p.solution]);
  assert.ok(check(p,frames.at(-1).answer));
 }
 for(const level of [5,9,13,17]){
  const {frames}=makeTutorial('fractionline',{mode:'free',level});
  assert.ok(frames.every(f=>f.scene?.countedIntervals===undefined));
 }
});
