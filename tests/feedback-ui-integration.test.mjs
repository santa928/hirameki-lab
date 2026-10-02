import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {project,projectRequire,loadSource} from './helpers/tsx-source.mjs';
import {hookHarness,elements,findElement} from './helpers/ui-hook-harness.mjs';
import {generateStage} from '../lib/stages.ts';
import {check,optionAnswer} from '../lib/puzzles.ts';
import {GAMES} from '../lib/catalog.ts';
import {explainAnswer,explainRejectedAction} from '../lib/feedback.ts';
import {replayTrial,trialStep} from '../lib/engine/trial.ts';
import {traceProgram} from '../lib/feedback/program.ts';
const React=projectRequire('react'),{renderToStaticMarkup}=projectRequire('react-dom/server');
const {PuzzleView}=loadSource(project+'/components/puzzle-view.tsx'),{ExtendedPuzzleView,TouchBoard}=loadSource(project+'/components/extended-puzzle.tsx'),{TrialBoard}=loadSource(project+'/components/trial-board.tsx'),{FeedbackNotice}=loadSource(project+'/components/feedback-notice.tsx'),{ProgramTraceView}=loadSource(project+'/components/program-trace.tsx');
const html=node=>renderToStaticMarkup(node);
function sessionComponent(){const file=project+'/app/page.tsx',source=fs.readFileSync(file,'utf8').replace('import.meta.env.BASE_URL','"/"'),ts=projectRequire('typescript'),compiled=ts.transpileModule(source,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,mod={exports:{}};const req=specifier=>specifier==='@/components/tutorial'?{Tutorial:()=>null}:specifier.startsWith('@/')?loadSource(path.join(project,specifier.slice(2))+(/\.tsx?$/.test(specifier)?'':fs.existsSync(path.join(project,specifier.slice(2))+'.tsx')?'.tsx':'.ts')):projectRequire(specifier);vm.runInThisContext('(function(require,module,exports){'+compiled+'\nmodule.exports.TestSession=Session;})',{filename:file})(req,mod,mod.exports);return mod.exports.TestSession;}
test('App authoritative result produces a specific reason and clears it on edit/success',()=>{
 const Session=sessionComponent(),h=hookHarness(Session,{game:GAMES.find(g=>g.id==='count'),mode:'stage',stage:1,startLevel:1,profile:1,soundOn:false,onFinish:()=>{},onHome:()=>{}});let tree=h.render(),view=findElement(tree,n=>n.type===PuzzleView),p=view.props.p,wrong=p.options.map((_,i)=>optionAnswer(p,i)).find(a=>!check(p,a));view.props.onAnswer(wrong);tree=h.render();view=findElement(tree,n=>n.type===PuzzleView);assert.equal(view.props.answerFeedback?.code,explainAnswer(p,wrong,{accepted:false,submitted:true}).code);assert.ok(findElement(tree,n=>n.type===FeedbackNotice)?.props.feedback);view.props.onEdit();assert.equal(findElement(h.render(),n=>n.type===PuzzleView).props.answerFeedback,null);view=findElement(h.render(),n=>n.type===PuzzleView);view.props.onAnswer(p.solution);assert.equal(findElement(h.render(),n=>n.type===PuzzleView).props.answerFeedback,null);
});
test('submitted reason marks actual choice and geometry cells or edges',()=>{
 for(const [id,answer] of [['circlecenter',0],['coinparking',[0,2]],['bridges',[]]]){const p=generateStage(id,1,0),a=id==='circlecenter'?p.options.findIndex((_,i)=>!check(p,i)):id==='bridges'?p.data.initial.map(()=>0):answer,feedback=explainAnswer(p,a,{accepted:false,submitted:true});assert.ok(feedback,id);const markup=html(React.createElement(PuzzleView,{p,playbackAnswer:a,answerFeedback:feedback,onAnswer:()=>{}}));assert.match(markup,/data-feedback-target=/,id);assert.match(markup,/aria-describedby="answer-feedback"/,id);}
});
test('editing, undo and reset signal stale submitted feedback removal',()=>{
 const p=generateStage('coinparking',1,0),edits=[],h=hookHarness(ExtendedPuzzleView,{p,onAnswer:()=>{},onEdit:()=>edits.push(1)});let tree=h.render();findElement(tree,n=>n.props?.className==='point-buttons').props.children[0].props.onClick();assert.equal(edits.length,1);tree=h.render();findElement(tree,n=>n.props?.className==='extended-actions').props.children[0].props.onClick();assert.equal(edits.length,2);findElement(h.render(),n=>n.props?.className==='extended-actions').props.children[1].props.onClick();assert.equal(edits.length,3);
});
test('trial rejected action reports pre-state reason without answer/history mutation',()=>{
 const p=generateStage('ballweigh',1,0),calls=[],h=hookHarness(ExtendedPuzzleView,{p,onAnswer:a=>calls.push(a)});let board=findElement(h.render(),n=>n.type===TrialBoard);board.props.onMove({left:[0],right:[1]});board=findElement(h.render(),n=>n.type===TrialBoard);const before=JSON.stringify(board.props.actions),state=replayTrial(p,board.props.actions),wrong=Array.from({length:p.data.n},(_,i)=>i).find(i=>!state.candidates.includes(i));assert.equal(state.candidates.length,1);const action={guess:wrong},expected=explainRejectedAction(p,state,action);assert.ok(expected);board.props.onMove(action);const tree=h.render();assert.ok(html(tree).includes(expected.message));assert.equal(JSON.stringify(findElement(tree,n=>n.type===TrialBoard).props.actions),before);assert.equal(calls.length,0);assert.doesNotMatch(html(tree),/まだ ほかの こうほ/);
});
test('program wall trace and legal unmet goal are displayed without committing partial commands',()=>{
 for(const stage of [1,80]){const p=generateStage('programbot',stage,0),calls=[],h=hookHarness(ExtendedPuzzleView,{p,onAnswer:a=>calls.push(a)}),program=['F'],trace=traceProgram(p,program);assert.ok(trace);findElement(h.render(),n=>n.type===TrialBoard).props.onProgram(program);const tree=h.render(),viewer=findElement(tree,n=>n.type===ProgramTraceView);assert.ok(viewer,stage+' trace UI');assert.deepEqual(viewer.props.trace,trace);if(trace.failure){assert.equal(calls.length,0);assert.deepEqual(findElement(tree,n=>n.type===TrialBoard).props.actions,[]);}else{assert.equal(check(p,program),false);assert.match(html(tree),/今は|向き|星/);}findElement(tree,n=>n.type===TrialBoard).props.onProgramEdit();assert.equal(findElement(h.render(),n=>n.type===ProgramTraceView)?.props.trace,null);}
});
test('operation guide is visible for original and extended first-use controls, absent in demo',()=>{
 for(const id of ['stroke','slide','square','equalparts','jigsaw','separator','parallel','triangulate']){const p=generateStage(id,1,0),markup=html(React.createElement(PuzzleView,{p,onAnswer:()=>{}}));assert.match(markup,/このばんの あそびかた/,id);assert.doesNotMatch(html(React.createElement(PuzzleView,{p,demo:true})),/このばんの あそびかた/);}
});

test('program failed command and rejected trial positions mark their actual controls',()=>{
 const p=generateStage('programbot',80,0),actions=['F'],feedback=explainAnswer(p,actions,{accepted:false,submitted:false}),markup=html(React.createElement(TrialBoard,{p,state:p.data.initial,actions,playback:true,feedback,noticeId:'move-feedback',onMove:()=>{},onProgram:()=>{}}));assert.match(markup,/data-feedback-target="command:0"/);assert.match(markup,/data-feedback-target="cell:/);assert.match(markup,/aria-describedby="move-feedback"/);
 const ball=generateStage('ballweigh',1,0),state=trialStep(ball,ball.data.initial,{left:[0],right:[1]}),wrong=Array.from({length:ball.data.n},(_,i)=>i).find(i=>!state.candidates.includes(i)),rejected=explainRejectedAction(ball,state,{guess:wrong}),ballHTML=html(React.createElement(TrialBoard,{p:ball,state,feedback:rejected,noticeId:'move-feedback',onMove:()=>{},onProgram:()=>{}}));assert.match(ballHTML,/data-feedback-target="card:/);assert.match(ballHTML,/data-feedback-target="observation:/);
});

test('question change drops a submitted reason while retaining authoritative gameplay',()=>{
 const Session=sessionComponent(),h=hookHarness(Session,{game:GAMES.find(g=>g.id==='count'),mode:'stage',stage:1,startLevel:1,profile:1,soundOn:false,onFinish:()=>{},onHome:()=>{}});let view=findElement(h.render(),n=>n.type===PuzzleView),first=view.props.p;view.props.onAnswer(first.options.map((_,i)=>optionAnswer(first,i)).find(a=>!check(first,a)));assert.ok(findElement(h.render(),n=>n.type===PuzzleView).props.answerFeedback);findElement(h.render(),n=>n.props?.className==='play-tools').props.children[2].props.onClick();view=findElement(h.render(),n=>n.type===PuzzleView);assert.notEqual(view.props.p.seed,first.seed);assert.equal(view.props.answerFeedback,null);
});
test('real selected cards and binary row conditions carry the derived target markers',()=>{
 for(const [id,answer] of [['settriple',[0,1,2]],['tents',null],['inside',[5]]]){const p=generateStage(id,1,0),a=id==='tents'?p.data.initial.map((v,i)=>i===0?1:v):answer,feedback=explainAnswer(p,a,{accepted:false,submitted:true});assert.ok(feedback,id);const markup=html(React.createElement(PuzzleView,{p,playbackAnswer:a,answerFeedback:feedback,onAnswer:()=>{}}));for(const target of feedback.targets.filter(v=>v.type==='card'||v.type==='cell'))assert.ok(markup.includes('data-feedback-target="'+target.type+':'+target.index+'"'),id+'/'+target.type+'/'+target.index);if(id==='tents')assert.match(markup,/data-feedback-target="constraint:/);}
});
test('actual command edit controls discard previous program trace',()=>{
 const p=generateStage('programbot',80,0),parent=hookHarness(ExtendedPuzzleView,{p,onAnswer:()=>{}}),getBoard=()=>findElement(parent.render(),n=>n.type===TrialBoard);getBoard().props.onProgram(['F']);assert.ok(findElement(parent.render(),n=>n.type===ProgramTraceView).props.trace);const board=getBoard(),child=hookHarness(TrialBoard,board.props),button=elements(child.render()).find(n=>n.type==='button'&&!n.props.disabled&&n.props.children==='↶');assert.ok(button);button.props.onClick();assert.equal(findElement(parent.render(),n=>n.type===ProgramTraceView).props.trace,null);
});


test('separator violation marks its actual internal point without marking the unrelated endpoint',()=>{
 const p=generateStage('separator',1,0),answer=[0,1],feedback=explainAnswer(p,answer,{accepted:false,submitted:true}),h=hookHarness(ExtendedPuzzleView,{p,playbackAnswer:answer,answerFeedback:feedback,onAnswer:()=>{}}),tree=h.render();assert.equal(feedback.code,'plane.separator.mixed');assert.ok(feedback.targets.some(t=>t.type==='cell'&&t.index===2));
 const marked=elements(tree).filter(n=>n.props?.['data-feedback-target']==='cell:2');assert.equal(marked.length,1);assert.equal(marked[0].props['data-internal-point'],2);assert.equal(marked[0].props.role,'img');assert.match(marked[0].props['aria-label'],/内部3.*星/);assert.equal(marked[0].props['aria-describedby'],'answer-feedback');assert.ok(elements(marked[0]).some(n=>n.type==='circle'&&n.props.strokeDasharray));assert.ok(elements(marked[0]).some(n=>n.type==='text'&&n.props.children==='!'));
 const endpoints=elements(tree).filter(n=>n.type==='g'&&n.props.role==='button');assert.equal(endpoints.length,p.data.anchors.length);assert.ok(endpoints.every(n=>!n.props['data-feedback-target']));const bank=findElement(tree,n=>n.props?.className==='point-buttons');assert.doesNotMatch(html(bank),/feedback-marker|aria-hidden="true">!/);
 assert.match(html(tree),/内3/);assert.equal(JSON.stringify(p.data.points),JSON.stringify([[5.5,4.5],[5.5,5.5],[1.5,.5],[.5,.5]]));
});
test('separator internal markers clear on reset and correct state without changing point geometry',()=>{
 const p=generateStage('separator',1,0),props={p,playbackAnswer:[0,1],answerFeedback:explainAnswer(p,[0,1],{accepted:false,submitted:true}),onAnswer:()=>{},onEdit:()=>{props.answerFeedback=null;}},h=hookHarness(ExtendedPuzzleView,props),before=JSON.stringify(p),tree=h.render();assert.match(html(tree),/data-feedback-target="cell:2"/);findElement(tree,n=>n.props?.className==='extended-actions').props.children[1].props.onClick();assert.doesNotMatch(html(h.render()),/data-feedback-target="cell:/);const good=html(React.createElement(PuzzleView,{p,playbackAnswer:p.solution,answerFeedback:explainAnswer(p,p.solution,{accepted:true,submitted:true}),onAnswer:()=>{}}));assert.doesNotMatch(good,/data-feedback-target="cell:/);assert.match(good,/内1/);assert.equal(JSON.stringify(p),before);
});
