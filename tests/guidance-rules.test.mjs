import assert from 'node:assert/strict';
import {test} from 'node:test';
import {GAMES} from '../lib/catalog.ts';
import {generateStage,stageCount} from '../lib/stages.ts';
const help=id=>GAMES.find(g=>g.id===id).help;

test('概要は現在の条件・印・線と後半の追加規則を案内する',()=>{
 assert.match(help('matrix'),/行|よこ/);assert.doesNotMatch(help('matrix'),/増え方/);
 assert.match(help('order'),/位置|前後/);assert.doesNotMatch(help('order'),/すぐ右/);
 assert.match(help('binary'),/○/);assert.match(help('binary'),/●/);
 assert.match(help('familytree'),/線/);assert.match(help('familytree'),/共通|本数/);assert.doesNotMatch(help('familytree'),/矢印/);
 assert.match(help('cipher'),/三|3/);assert.match(help('gears'),/クロス/);
 assert.match(help('nets'),/転が|ころが/);
});

test('初級なかまはずれは実際の形の違いをヒントにする',()=>{
 const p=generateStage('odd',1,0);assert.equal(p.data.variant,'shape');assert.match(p.hint,/かたち/);assert.doesNotMatch(p.hint,/むきが ちがう/);
});

test('暗号は1つの表しかない問題で次の表を案内しない',()=>{
 for(const stage of [1,Math.ceil(stageCount('cipher')/2),stageCount('cipher')]){
  const p=generateStage('cipher',stage,0);
  if(p.data.maps.length===1)assert.doesNotMatch(p.hint,/つぎの カギ/);
  else if(!p.data.reverse)assert.match(p.hint,/つぎの カギ/);
  if(p.data.reverse)assert.match(p.hint,/ぎゃく/);
 }
});

test('暗号探りのヒントは初期の実際の履歴行数を参照する',()=>{
 for(const stage of [1,Math.ceil(stageCount('codebreak')/2),stageCount('codebreak')]){
  const p=generateStage('codebreak',stage,0),n=p.data.initial.history.length;
  assert.match(p.hint,new RegExp(`${n}ぎょう`));
  assert.match(p.hint,/ふえ|ため/);
 }
});
