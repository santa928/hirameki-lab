import assert from 'node:assert/strict';
import {test} from 'node:test';
import {explainRejectedAction,explainAnswer} from '../lib/feedback.ts';
import {trialStep} from '../lib/engine/trial.ts';
import {generate} from '../lib/puzzles.ts';
import {project,projectRequire,loadSource} from './helpers/tsx-source.mjs';
import {hookHarness,findElement} from './helpers/ui-hook-harness.mjs';

const {renderToStaticMarkup}=projectRequire('react-dom/server');
const {ExtendedPuzzleView}=loadSource(project+'/components/extended-puzzle.tsx');
const {TrialBoard}=loadSource(project+'/components/trial-board.tsx');
const {FeedbackNotice}=loadSource(project+'/components/feedback-notice.tsx');
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function yard(capacity,initial){return {id:'trainyard',kind:'trial',level:1,seed:0,hint:'',solution:[],data:{extended:true,n:initial.input.length+initial.sidings.flat().length+initial.output.length,capacity,initial}};}

test('入口と別待避線から満員へ送る拒否は、実際の待避先番号と容量を説明する',()=>{
 const samples=[
  [3,{input:[1],sidings:[[],[2,3,4]],output:[]},{from:'in',to:1}],
  [3,{input:[],sidings:[[1],[2,3,4]],output:[]},{from:0,to:1}],
  [2,{input:[1],sidings:[[2,3],[]],output:[]},{from:'in',to:0}],
  [4,{input:[],sidings:[[1],[2,3,4,5]],output:[]},{from:0,to:1}],
 ];
 for(const [capacity,state,action] of samples){
  const p=freeze(yard(capacity,state));freeze(action);const before=JSON.stringify({p,state,action});
  assert.equal(trialStep(p,state,action),null);const f=explainRejectedAction(p,state,action);
  assert.equal(f?.code,'trial.trainyard.capacity');assert.equal(f.phase,'invalid');assert.deepEqual(f.targets,[]);
  assert.match(f.message,new RegExp(`${action.to+1}ばん.*たいひ.*${capacity} / ${capacity}りょう.*いっぱい`));
  assert.equal(JSON.stringify({p,state,action}),before);
 }
});

test('空き待避線・満員の移動元・正しい出口を使う合法操作には拒否理由を返さない',()=>{
 const samples=[
  [2,{input:[1],sidings:[[2,3],[]],output:[]},{from:'in',to:1},{input:[],sidings:[[2,3],[1]],output:[]}],
  [3,{input:[],sidings:[[3,2,1],[]],output:[]},{from:0,to:1},{input:[],sidings:[[3,2],[1]],output:[]}],
  [3,{input:[],sidings:[[3,2,1],[]],output:[]},{from:0,to:'out'},{input:[],sidings:[[3,2],[]],output:[1]}],
  [2,{input:[1,2],sidings:[[],[3]],output:[]},{from:'in',to:'out'},{input:[2],sidings:[[],[3]],output:[1]}],
 ];
 for(const [capacity,state,action,want] of samples){
  const p=freeze(yard(capacity,state)),before=JSON.stringify({p,state,action});freeze(action);
  assert.deepEqual(trialStep(p,state,action),want);assert.equal(explainRejectedAction(p,state,action),null);
  assert.equal(JSON.stringify({p,state,action}),before);
 }
 for(const level of [1,10,20])for(const seed of [0,42]){
  const p=freeze(generate('trainyard',level,seed));let state=p.data.initial;
  for(const action of p.solution){const next=trialStep(p,state,action);assert.notEqual(next,null);assert.equal(explainRejectedAction(p,state,action),null);state=next;}
 }
});

test('空・同じ待避線・不正な選択・出口順の拒否を容量不足と誤診しない',()=>{
 const state=freeze({input:[2],sidings:[[],[1,3,4]],output:[]}),p=freeze(yard(3,state));
 const actions=[null,undefined,{},false,true,0,'invalid',[],{from:'in'},...[-1,2,.5,'0','out',null,undefined].map(from=>({from,to:1})),{from:0,to:1},{from:1,to:1},...[-1,2,.5,'1','in','other',null,undefined].map(to=>({from:'in',to})),{from:'in',to:'out'},{from:1,to:'out'}];
 for(const action of actions){
  freeze(action);const before=JSON.stringify({p,state,action});assert.equal(trialStep(p,state,action),null);
  assert.equal(explainRejectedAction(p,state,action),null);assert.equal(JSON.stringify({p,state,action}),before);
 }
 const empty=freeze({input:[],sidings:[[],[1,2,3]],output:[]}),emptyPuzzle=freeze(yard(3,empty));
 assert.equal(trialStep(emptyPuzzle,empty,{from:'in',to:1}),null);assert.equal(explainRejectedAction(emptyPuzzle,empty,{from:'in',to:1}),null);
});

test('容量理由は操作の診断だけに出し、既存の答案全体診断を拡張しない',()=>{
 const state=freeze({input:[1],sidings:[[],[2,3,4]],output:[]}),p=freeze(yard(3,state)),action=freeze({from:'in',to:1});
 assert.equal(explainRejectedAction(p,state,action)?.code,'trial.trainyard.capacity');
 for(const answer of [[],[action],Array(2001).fill(action)])for(const accepted of [false,true])assert.equal(explainAnswer(p,answer,{accepted,submitted:true}),null);
});

test('実際の盤面は容量理由を表示し、拒否で履歴を増やさず合法移動・Undo・resetで回復する',()=>{
 const initial={input:[2],sidings:[[],[1,3,4]],output:[]},base=generate('trainyard',1,42),p=freeze({...base,data:{...base.data,n:4,capacity:3,initial}}),calls=[];
 const h=hookHarness(ExtendedPuzzleView,{p,onAnswer:a=>calls.push(a)}),board=()=>findElement(h.render(),n=>n.type===TrialBoard),actions=()=>findElement(h.render(),n=>n.props?.className==='extended-actions').props.children;
 const notice=()=>findElement(h.render(),n=>n.type===FeedbackNotice&&n.props.id==='move-feedback'),generic=()=>renderToStaticMarkup(findElement(h.render(),n=>n.props?.className==='puzzle-notice'));
 board().props.onMove({from:'in',to:1});assert.equal(notice().props.feedback?.code,'trial.trainyard.capacity');assert.match(renderToStaticMarkup(notice()),/2ばん.*3 \/ 3りょう.*いっぱい/);
 assert.deepEqual(board().props.state,initial);assert.deepEqual(board().props.actions,[]);assert.equal(actions()[0].props.disabled,true);assert.doesNotMatch(generic(),/せんとう|でぐち/);
 board().props.onMove({from:'in',to:'out'});assert.equal(notice().props.feedback,null);assert.match(generic(),/せんとう|でぐち/);
 board().props.onMove({from:'in',to:0});assert.equal(notice().props.feedback,null);assert.doesNotMatch(generic(),/せんとう|でぐち/);
 assert.deepEqual(board().props.state,{input:[],sidings:[[2],[1,3,4]],output:[]});assert.deepEqual(board().props.actions,[{from:'in',to:0}]);
 actions()[0].props.onClick();assert.deepEqual(board().props.state,initial);assert.deepEqual(board().props.actions,[]);
 board().props.onMove({from:'in',to:1});actions()[1].props.onClick();assert.equal(notice().props.feedback,null);assert.deepEqual(board().props.state,initial);assert.deepEqual(calls,[]);
});
