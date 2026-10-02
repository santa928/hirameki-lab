import assert from'node:assert/strict';import{test}from'node:test';import{IDS,check}from'../lib/puzzles.ts';import{makeTutorial}from'../lib/tutorial.ts';
test('120種類のお手本は最後に正しい解へ到達する',()=>{assert.equal(IDS.length,120);for(const id of IDS){const{p,frames}=makeTutorial(id);assert.ok(frames.length>1,id);assert.ok(check(p,frames.at(-1).answer),id);assert.equal(check(p,frames[0].answer),false,id);}});
