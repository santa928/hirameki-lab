import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generateStage} from '../lib/stages.ts';
import {check} from '../lib/puzzles.ts';
import {project,projectRequire,loadSource} from './helpers/tsx-source.mjs';
import {hookHarness,findElement,elements} from './helpers/ui-hook-harness.mjs';

const {renderToStaticMarkup}=projectRequire('react-dom/server');
const {PuzzleView}=loadSource(project+'/components/puzzle-view.tsx');
const {TrialBoard}=loadSource(project+'/components/trial-board.tsx');
const findClass=(tree,name)=>findElement(tree,n=>n.props?.className===name);
const actions=tree=>findClass(tree,'extended-actions').props.children;
const passengers=tree=>elements(findClass(tree,'river-banks')).filter(n=>n.type==='button');
const passenger=(tree,letter)=>passengers(tree).find(n=>n.props.children[0].props.children===letter);
const primary=tree=>findClass(tree,'primary-action');
const html=tree=>renderToStaticMarkup(tree);
function river(seed=1){
 const p=generateStage('river',1,0);
 return {...p,seed,data:{...p.data,n:2,capacity:1,conflicts:[[0,1]],initial:{banks:[0,0],boat:0},minimum:3},solution:[{riders:[0]},{riders:[]},{riders:[1]}]};
}

// 親子の実コンポーネントを接続し、Reactのkey変更時だけ子のhook状態を作り直す。
function trialHarness(props,options={}){
 let parent,parentProps,parentKey,child,childProps,childKey;
 return {render(){
  const view=PuzzleView(props);
  if(!parent||parentKey!==view.key){parentProps={...view.props};parent=hookHarness(view.type,parentProps,options);parentKey=view.key;child=null;}
  else Object.assign(parentProps,view.props);
  const outer=parent.render(),element=findElement(outer,n=>n.type===TrialBoard);
  if(!child||childKey!==element.key){childProps={...element.props};child=hookHarness(element.type,childProps,options);childKey=element.key;}
  else Object.assign(childProps,element.props);
  return {outer,board:child.render(),element,state:element.props.state,moves:element.props.actions};
 }};
}

for(const deferStateUpdates of [false,true])test(`riverの選択だけのresetは枠と乗船者を解除し、無選択操作でAを運ばない（deferred=${deferStateUpdates}）`,()=>{
 const p=river(),before=JSON.stringify(p),calls=[],h=trialHarness({p,onAnswer:a=>calls.push(a)},{deferStateUpdates});
 let tree=h.render();passenger(tree.board,'A').props.onClick();tree=h.render();assert.equal(passenger(tree.board,'A').props.className,'selected');assert.deepEqual(tree.moves,[]);
 actions(tree.outer)[1].props.onClick();tree=h.render();assert.ok(passengers(tree.board).every(n=>n.props.className!== 'selected'));
 assert.equal(actions(tree.outer)[0].props.disabled,true);primary(tree.board).props.onClick();tree=h.render();
 assert.deepEqual(tree.state,{banks:[0,0],boat:0});assert.deepEqual(tree.moves,[]);assert.deepEqual(calls,[]);assert.equal(JSON.stringify(p),before);
});

test('riverの移動後resetも初期配置と履歴を戻し、選び直した解答は自動受理される',()=>{
 const p=river(),calls=[],h=trialHarness({p,onAnswer:a=>calls.push(a)});
 passenger(h.render().board,'A').props.onClick();primary(h.render().board).props.onClick();let tree=h.render();assert.deepEqual(tree.state,{banks:[1,0],boat:1});
 passenger(tree.board,'A').props.onClick();tree=h.render();actions(tree.outer)[1].props.onClick();tree=h.render();
 assert.deepEqual(tree.state,p.data.initial);assert.deepEqual(tree.moves,[]);assert.equal(actions(tree.outer)[0].props.disabled,true);assert.ok(passengers(tree.board).every(n=>n.props.className!== 'selected'));
 for(const action of p.solution){for(const rider of action.riders)passenger(h.render().board,String.fromCharCode(65+rider)).props.onClick();primary(h.render().board).props.onClick();h.render();}
 assert.equal(check(p,calls[0]),true);assert.deepEqual(calls,[p.solution]);
});

test('Undoは子の選択を勝手に初期化せず、問題切替は既存のkeyで初期化する',()=>{
 const props={p:river()},h=trialHarness(props);
 passenger(h.render().board,'A').props.onClick();primary(h.render().board).props.onClick();let tree=h.render();
 passenger(tree.board,'A').props.onClick();tree=h.render();const childKey=tree.element.key;actions(tree.outer)[0].props.onClick();tree=h.render();
 assert.equal(tree.element.key,childKey);assert.deepEqual(tree.state,{banks:[0,0],boat:0});assert.equal(passenger(tree.board,'A').props.className,'selected');
 props.p=river(2);tree=h.render();assert.ok(passengers(tree.board).every(n=>n.props.className!== 'selected'));assert.deepEqual(tree.moves,[]);
});

test('lockedのresetは選択と履歴を変更せず、demo・playbackは再生状態を保つ',()=>{
 const p=river(),props={p,locked:false},h=trialHarness(props);passenger(h.render().board,'A').props.onClick();h.render();props.locked=true;
 let tree=h.render(),childKey=tree.element.key;assert.equal(actions(tree.outer)[1].props.disabled,true);actions(tree.outer)[1].props.onClick();tree=h.render();
 assert.equal(tree.element.key,childKey);assert.equal(passenger(tree.board,'A').props.className,'selected');assert.deepEqual(tree.state,p.data.initial);
 props.locked=false;actions(h.render().outer)[1].props.onClick();assert.ok(passengers(h.render().board).every(n=>n.props.className!== 'selected'));
 for(const flags of [{locked:true},{demo:true}]){
  const playback=[{riders:[0]}],preview=trialHarness({p,...flags,playbackAnswer:playback}),frame=preview.render();
  assert.equal(findElement(frame.outer,n=>n.type==='fieldset').props.disabled,true);assert.deepEqual(frame.state,{banks:[1,0],boat:1});assert.deepEqual(frame.moves,playback);
  if(flags.demo)assert.equal(findClass(frame.outer,'extended-actions'),undefined);
  else{actions(frame.outer)[1].props.onClick();assert.deepEqual(preview.render().state,{banks:[1,0],boat:1});}
 }
});

const temporaryCases=[
 ['bridge',tree=>passengers(tree)[0].props.onClick()],
 ['hanoi',tree=>findClass(tree,'hanoi-pegs').props.children[0].props.onClick()],
 ['jugs',tree=>elements(tree).find(n=>n.type==='button'&&n.props.className?.startsWith('jug ')).props.onClick()],
 ['colorsort',tree=>findClass(tree,'bottle-rack').props.children[0].props.onClick()],
 ['programbot',tree=>findClass(tree,'control-row').props.children[0][0].props.onClick()],
 ['ballweigh',tree=>{findClass(tree,'ball-rack').props.children[0].props.onClick();elements(tree).find(n=>n.type==='button'&&n.props.children==='こたえを えらぶ').props.onClick();}],
 ['codebreak',tree=>findClass(tree,'code-palette').props.children[1].props.onClick()],
];
for(const [id,select] of temporaryCases)test(`${id}の未送信の一時入力もresetで初期表示へ戻る`,()=>{
 const p=generateStage(id,1,0),before=JSON.stringify(p),calls=[],h=trialHarness({p,onAnswer:a=>calls.push(a)});
 let tree=h.render();const initial=html(tree.board);select(tree.board);tree=h.render();assert.notEqual(html(tree.board),initial);
 actions(tree.outer)[1].props.onClick();tree=h.render();assert.equal(html(tree.board),initial);assert.deepEqual(tree.state,p.data.initial);assert.deepEqual(tree.moves,[]);assert.deepEqual(calls,[]);assert.equal(JSON.stringify(p),before);
});
