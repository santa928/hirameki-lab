import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generateStage} from '../lib/stages.ts';
import {project,projectRequire,loadSource} from './helpers/tsx-source.mjs';
import {hookHarness,findElement} from './helpers/ui-hook-harness.mjs';
const {renderToStaticMarkup}=projectRequire('react-dom/server');
const {ExtendedPuzzleView,TouchBoard}=loadSource(project+'/components/extended-puzzle.tsx');
const {TrialBoard}=loadSource(project+'/components/trial-board.tsx');
const actions=tree=>findElement(tree,n=>n.props?.className==='extended-actions').props.children;
const board=tree=>findElement(tree,n=>n.type===TrialBoard);

for(const deferStateUpdates of [false,true])test(`frogs jump undo restores the previous board (deferred=${deferStateUpdates})`,()=>{
 const p=generateStage('frogs',1,0),before=JSON.stringify(p),calls=[],h=hookHarness(ExtendedPuzzleView,{p,onAnswer:a=>calls.push(a)},{deferStateUpdates});
 let tree=h.render();assert.deepEqual(board(tree).props.state,[0,1,-1]);assert.equal(actions(tree)[0].props.disabled,true);
 board(tree).props.onMove(2);tree=h.render();assert.deepEqual(board(tree).props.state,[-1,1,0]);assert.equal(actions(tree)[0].props.disabled,false);
 actions(tree)[0].props.onClick();tree=h.render();assert.deepEqual(board(tree).props.state,[0,1,-1]);assert.equal(actions(tree)[0].props.disabled,true);assert.deepEqual(calls,[]);
 // A rejected move must not add an undo entry; reset must clear it.
 board(tree).props.onMove(1);tree=h.render();assert.equal(actions(tree)[0].props.disabled,true);
 board(tree).props.onMove(2);tree=h.render();actions(tree)[1].props.onClick();tree=h.render();assert.deepEqual(board(tree).props.state,[0,1,-1]);assert.equal(actions(tree)[0].props.disabled,true);
 // Undo after completion clears the submission guard so the move can be retried.
 for(const move of p.solution){board(tree).props.onMove(move);tree=h.render();}assert.equal(calls.length,1);
 actions(tree)[0].props.onClick();tree=h.render();assert.deepEqual(board(tree).props.state,[-1,1,0]);
 board(tree).props.onMove(p.solution.at(-1));h.render();assert.equal(calls.length,2);assert.equal(JSON.stringify(p),before);
});

test('deferred multi-step trial edits undo in reverse order',()=>{
 const p=generateStage('hanoi',1,0),h=hookHarness(ExtendedPuzzleView,{p},{deferStateUpdates:true}),states=[];
 let tree=h.render();states.push(board(tree).props.state);
 for(const move of p.solution.slice(0,3)){board(tree).props.onMove(move);tree=h.render();states.push(board(tree).props.state);}
 for(const previous of states.slice(0,-1).reverse()){actions(tree)[0].props.onClick();tree=h.render();assert.deepEqual(board(tree).props.state,previous);}
 assert.equal(actions(tree)[0].props.disabled,true);
});

test('trial moves queued before render retain both undo snapshots',()=>{
 const p=generateStage('frogs',1,0),calls=[],h=hookHarness(ExtendedPuzzleView,{p,onAnswer:a=>calls.push(a)},{deferStateUpdates:true});
 const move=board(h.render()).props.onMove;move(2);move(1);let tree=h.render();assert.equal(calls.length,1);
 actions(tree)[0].props.onClick();tree=h.render();assert.deepEqual(board(tree).props.state,[-1,1,0]);
 actions(tree)[0].props.onClick();tree=h.render();assert.deepEqual(board(tree).props.state,[0,1,-1]);assert.equal(actions(tree)[0].props.disabled,true);
});

for(const id of ['numberpath','circuit','binary','foldpunch','zebra'])test(`${id} shared update keeps the initial answer in deferred history`,()=>{
 const p=generateStage(id,1,0),before=JSON.stringify(p),calls=[],h=hookHarness(ExtendedPuzzleView,{p,onAnswer:a=>calls.push(a)},{deferStateUpdates:true});
 let tree=h.render();const initial=renderToStaticMarkup(tree);
 if(id==='numberpath')findElement(tree,n=>n.props?.className==='number-cards').props.children[0].props.onClick();
 else if(id==='circuit')findElement(tree,n=>n.props?.className==='switch-inputs').props.children[0].props.onClick();
 else if(id==='zebra')findElement(tree,n=>n.props?.className==='assignment-rows').props.children[0].props.children[1][p.data.allowed[0][0]].props.onClick();
 else {const at=id==='binary'?p.data.given.findIndex(v=>v<0):0;findElement(tree,n=>n.type===TouchBoard).props.onCell(at);}
 tree=h.render();assert.notEqual(renderToStaticMarkup(tree),initial);assert.equal(actions(tree)[0].props.disabled,false);
 actions(tree)[0].props.onClick();tree=h.render();assert.equal(renderToStaticMarkup(tree),initial);assert.deepEqual(calls,[]);assert.equal(JSON.stringify(p),before);
});
