import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generateNumber} from '../lib/engine/number.ts';
import {generate} from '../lib/puzzles.ts';
import {makeTutorial} from '../lib/tutorial.ts';
import {generateStage,stageCount} from '../lib/stages.ts';

/** Read the visible scene nodes without relying on the row arrangement. */
function sceneNodes(scene){
 return [scene,...(scene.items??[]).flatMap(sceneNodes)];
}

/** A learner must know the requested event before choosing its fraction. */
function assertTriangleEvent(p,label){
 const nodes=sceneNodes(p.data.scene);
 assert.ok(nodes.some(s=>s.type==='text'&&/△.*出る.*割合/.test(s.text)),`${label}: △が出る割合の条件が表示される`);
 const cards=nodes.find(s=>s.type==='balls');
 assert.ok(cards,`${label}: 対象を数える札が表示される`);
 assert.equal(p.options[p.solution],`${cards.a}/${cards.b}`,`${label}: 条件と札の割合が一致する`);
}

// Removing the tier-0 event prompt must fail before the learner sees an answer.
test('初級確率の各レベルで△を求める条件と札の割合が一致する',()=>{
 for(let level=1;level<=4;level++)for(let seed=0;seed<25;seed++){
  assertTriangleEvent(generateNumber('probability',level,seed),`level ${level}, seed ${seed}`);
 }
});

// Preview and tutorial must consume the same complete event as actual questions.
test('確率のpreviewにも答える対象事象が届く',()=>{
 assertTriangleEvent(generate('probability',1,14),'preview');
});

test('確率の基本demoにも答える対象事象が届く',()=>{
 assertTriangleEvent(makeTutorial('probability').p,'基本demo');
});

test('公開中の確率初級ステージ全問に対象条件がある',()=>{
 let initialQuestions=0;
 for(let stage=1;stage<=stageCount('probability');stage++)for(let index=0;index<10;index++){
  const p=generateStage('probability',stage,index);
  if(p.level>4)continue;
  initialQuestions++;
  assertTriangleEvent(p,`stage ${stage}, question ${index+1}`);
 }
 assert.ok(initialQuestions>0);
});
