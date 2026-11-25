import assert from 'node:assert/strict';
import {test} from 'node:test';
import {GAMES} from '../lib/catalog.ts';
import {generateStage,stageCount} from '../lib/stages.ts';
import {generate,check} from '../lib/puzzles.ts';
import {readWithBoardClues} from '../lib/question-reading.ts';
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

test('matrixの2×2 additive-crossは各行の加算を先に示し、増分や答えで案内を変えない',()=>{
 const puzzles=[1,2].flatMap(level=>[0,1,2,19,42].map(seed=>generate('matrix',level,seed)));
 const prompts=new Set(),helps=new Set(),increments=new Set(),answers=new Set();let unequalDirections=false;
 for(const p of puzzles){
  const d=p.data;assert.equal(d.n,2);assert.equal(d.ruleFamily,'additive-cross');
  assert.match(d.prompt,/どの.*ぎょう.*おなじ.*た/);assert.match(d.help,/各行.*左.*同じ数を足.*右/);
  assert.doesNotMatch(`${d.prompt} ${d.help}`,/縦横|たてと.*よこ|縦と.*横/);
  const [a,b,c]=d.values;increments.add(b-a);answers.add(p.options[p.solution]);unequalDirections||=b-a!==c-a;
  prompts.add(d.prompt);helps.add(d.help);assert.equal(check(p,p.solution),true);
 }
 assert.ok(increments.size>1);assert.ok(answers.size>1);assert.ok(unequalDirections,'縦と横の増分が異なる問題も含む');
 assert.equal(prompts.size,1,'具体的な増分を案内に埋め込まない');assert.equal(helps.size,1,'具体的な答えを案内に埋め込まない');
});

test('matrixの3×3は加減乗算・複合・逆算でも既存の計算種を限定しない案内を保つ',()=>{
 const samples=[[3,'add',false],[5,'subtract',false],[7,'subtract',true],[9,'multiply',false],[11,'multiply',true],[13,'multiply-plus',false],[15,'multiply-plus',true],[17,'pair-product-offset',false],[19,'pair-product-offset',true]];
 for(const [level,family,inverse] of samples){
  const p=generate('matrix',level,42);assert.equal(p.data.n,3);assert.equal(p.data.ruleFamily,family);assert.equal(p.data.inverse,inverse);
  assert.equal(p.data.prompt,'よこの きまりで くうらんを みつけよう');
  assert.equal(p.data.help,'例の行と同じ計算の関係を使い、空欄の数を求めます。');
  assert.equal(check(p,p.solution),true);
 }
});


test('数字カードの読み上げには今回の大小・末尾条件を表示どおり含める',()=>{
 for(const [level,goal] of [[1,'いちばん おおきく'],[9,'いちばん ちいさく'],[17,'偶数で いちばん おおきく'],[18,'奇数で いちばん ちいさく'],[19,'5で割り切れて いちばん おおきく'],[20,'5で割り切れて いちばん ちいさく']]){
  const p=generate('digitorder',level,42);
  assert.equal(p.data.scene.text,goal);
  const intro=GAMES.find(g=>g.id===p.id).prompt;
  assert.equal(readWithBoardClues(p,intro),[intro,goal,p.data.scene.sub,''].join('。'));
 }
});

test('ならびの推理は問題ごとの全条件を表示順に読み、別の盤面は元の発話を保つ',()=>{
 for(const level of [1,7,11,15,20]){
  const p=generate('order',level,42);
  const expected=p.data.scene.items.map(item=>item.text+'。').join('');
  assert.ok(expected.length>0);
  assert.equal(readWithBoardClues(p,p.data.prompt),p.data.prompt+'。'+expected);
  assert.equal(readWithBoardClues(p,p.data.help),p.data.help+expected);
 }
 const matrix=generateStage('matrix',1,0);
 assert.equal(readWithBoardClues(matrix,matrix.data.prompt),matrix.data.prompt);
});
