import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generateNumber} from '../lib/engine/number.ts';
import {check} from '../lib/puzzles.ts';
import {project,projectRequire,loadSource} from './helpers/tsx-source.mjs';
import {hookHarness,findElement,elements} from './helpers/ui-hook-harness.mjs';

const {renderToStaticMarkup}=projectRequire('react-dom/server');
const {ExtendedPuzzleView}=loadSource(project+'/components/extended-puzzle.tsx');
const html=tree=>renderToStaticMarkup(tree);
function control(tree,value,add){
 const label=`${value}えんを 1まい ${add?'ふやす':'へらす'}`,button=findElement(tree,n=>n.type==='button'&&n.props['aria-label']===label);
 assert.ok(button,`コイン操作が表示される：${label}`);return button;
}
const counts=tree=>elements(tree).filter(n=>n.type==='output').map(n=>Number(n.props.children[0]));
const actions=tree=>findElement(tree,n=>n.props?.className==='extended-actions').props.children;
function fixture(initial=[0,0],extra={}){
 const p=generateNumber('mincoins',1,0);
 return {...p,solution:[1,1],data:{...p.data,denoms:[1,5],target:6,minimum:2,initial,scene:{type:'row',items:[{type:'coins',target:6,denoms:[1,5]},{type:'text',text:'最少の枚数で作ろう'}]},...extra}};
}

test('コインはお題・額面ごとの枚数と増減操作・現在合計を表示する',()=>{
 const h=hookHarness(ExtendedPuzzleView,{p:fixture([2,1])}),tree=h.render(),markup=html(tree);
 assert.match(markup,/6えん/);
 assert.match(markup,/最少の枚数で作ろう/);
 assert.deepEqual(counts(tree),[2,1]);
 for(const value of [1,5])for(const add of [false,true])assert.ok(control(tree,value,add),`${value}えん ${add?'追加':'除去'}`);
 assert.match(markup,/いま：7えん・3まい/);
 assert.match(markup,/aria-label="5えんの コインの まいすう"/);
});

for(const deferStateUpdates of [false,true])test(`増減は0未満にせず、連続操作・Undo・resetで初期枚数と履歴を保つ（deferred=${deferStateUpdates}）`,()=>{
 const p=fixture([2,0]),before=JSON.stringify(p),calls=[],h=hookHarness(ExtendedPuzzleView,{p,onAnswer:a=>calls.push(a)},{deferStateUpdates});
 let tree=h.render();assert.equal(control(tree,5,false).props.disabled,true);
 control(tree,5,false).props.onClick();tree=h.render();assert.deepEqual(counts(tree),[2,0]);assert.equal(actions(tree)[0].props.disabled,true);
 const add=control(tree,1,true).props.onClick;add();add();tree=h.render();assert.deepEqual(counts(tree),[4,0]);
 assert.match(html(tree),/いま：4えん・4まい/);
 actions(tree)[0].props.onClick();tree=h.render();assert.deepEqual(counts(tree),[3,0]);
 actions(tree)[0].props.onClick();tree=h.render();assert.deepEqual(counts(tree),[2,0]);assert.equal(actions(tree)[0].props.disabled,true);
 control(tree,1,false).props.onClick();tree=h.render();assert.deepEqual(counts(tree),[1,0]);
 actions(tree)[1].props.onClick();tree=h.render();assert.deepEqual(counts(tree),[2,0]);assert.equal(actions(tree)[0].props.disabled,true);
 assert.deepEqual(calls,[]);assert.equal(JSON.stringify(p),before);
});

test('同額でも枚数過多は受理せず、最少枚数は自動で一度だけ受理する',()=>{
 const p=fixture([6,0]),calls=[],h=hookHarness(ExtendedPuzzleView,{p,onAnswer:a=>calls.push(a)});
 assert.equal(check(p,[6,0]),false);actions(h.render())[2].props.onClick();assert.deepEqual(calls,[[6,0]]);
 for(let i=0;i<5;i++)control(h.render(),1,false).props.onClick();
 assert.equal(calls.length,1);control(h.render(),5,true).props.onClick();assert.deepEqual(calls,[[6,0],[1,1]]);
 control(h.render(),5,true).props.onClick();actions(h.render())[2].props.onClick();assert.deepEqual(counts(h.render()),[1,1]);assert.equal(calls.length,2);
 actions(h.render())[0].props.onClick();assert.deepEqual(counts(h.render()),[1,0]);
 control(h.render(),5,true).props.onClick();assert.equal(calls.length,3);assert.deepEqual(calls.at(-1),[1,1]);
 actions(h.render())[1].props.onClick();assert.deepEqual(counts(h.render()),[6,0]);
});

test('5種の課題で初期枚数と特殊額面を示し、必要な追加と除去で受理へ到達する',()=>{
 const cases=[[1,'build'],[2,'exchange'],[3,'remove-surplus'],[4,'repair'],[13,'improve-greedy'],[20,'improve-greedy']];
 for(const [level,mode] of cases){
  const p=generateNumber('mincoins',level,41),before=JSON.stringify(p),calls=[],h=hookHarness(ExtendedPuzzleView,{p,onAnswer:a=>calls.push(a)});
  assert.equal(p.data.taskMode,mode);assert.deepEqual(counts(h.render()),p.data.initial);
  for(const value of p.data.denoms)assert.ok(control(h.render(),value,true));
  for(const add of [false,true])for(let i=0;i<p.data.denoms.length;i++){
   const difference=p.solution[i]-p.data.initial[i];if((difference>0)!==add)continue;
   for(let j=0;j<Math.abs(difference);j++)control(h.render(),p.data.denoms[i],add).props.onClick();
  }
  assert.deepEqual(calls,[p.solution],mode);assert.equal(check(p,calls[0]),true);assert.equal(JSON.stringify(p),before);
  actions(h.render())[1].props.onClick();assert.deepEqual(counts(h.render()),p.data.initial);
 }
});

test('locked・demoとお手本は表示枚数を保ち、コールバックを直接呼んでも編集しない',()=>{
 for(const flags of [{locked:true},{demo:true}]){
  const calls=[],edits=[],p=fixture(),h=hookHarness(ExtendedPuzzleView,{p,...flags,playbackAnswer:[3,2],onAnswer:a=>calls.push(a),onEdit:()=>edits.push(1)});
  let tree=h.render();assert.equal(findElement(tree,n=>n.type==='fieldset').props.disabled,true);assert.deepEqual(counts(tree),[3,2]);assert.match(html(tree),/いま：13えん・5まい/);
  control(tree,1,true).props.onClick();control(tree,5,false).props.onClick();
  if(!flags.demo)for(const action of actions(tree))action.props.onClick();
  tree=h.render();assert.deepEqual(counts(tree),[3,2]);assert.deepEqual(calls,[]);assert.deepEqual(edits,[]);
 }
});

test('表示は解答・最少枚数を読まず、判定は既存の金額と枚数の条件に任せる',()=>{
 const p=fixture([0,1]);
 Object.defineProperty(p,'solution',{get(){throw Error('解答を表示から読んではいけない');}});
 Object.defineProperty(p.data,'minimum',{get(){throw Error('最少枚数を表示から読んではいけない');}});
 const tree=hookHarness(ExtendedPuzzleView,{p}).render();assert.deepEqual(counts(tree),[0,1]);assert.match(html(tree),/いま：5えん・1まい/);
 const changed=fixture([0,0],{minimum:3}),calls=[],h=hookHarness(ExtendedPuzzleView,{p:changed,onAnswer:a=>calls.push(a)});
 control(h.render(),1,true).props.onClick();control(h.render(),5,true).props.onClick();assert.deepEqual(calls,[]);
 assert.equal(check(changed,[1,1]),false);actions(h.render())[2].props.onClick();assert.deepEqual(calls,[[1,1]]);
});
