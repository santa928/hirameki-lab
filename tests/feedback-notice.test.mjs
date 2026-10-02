import assert from 'node:assert/strict';import {test} from 'node:test';import fs from 'node:fs';
import {project,projectRequire,loadSource} from './helpers/tsx-source.mjs';
const R=projectRequire('react'),{renderToStaticMarkup}=projectRequire('react-dom/server');
function module(name){const path=project+'/components/'+name+'.tsx';assert.ok(fs.existsSync(path),'new feedback display component exists');return loadSource(path);}
const f={code:'private-code',message:'1ぎょうの星が多いよ。',phase:'editing',targets:[{type:'cell',index:2},{type:'edge',index:2}]};
test('notice keeps one polite atomic status and hides internal codes',()=>{
 const {FeedbackNotice}=module('feedback-notice'),html=renderToStaticMarkup(R.createElement(FeedbackNotice,{feedback:f}));assert.match(html,/role="status"/);assert.match(html,/aria-live="polite"/);assert.match(html,/aria-atomic="true"/);assert.ok(html.includes(f.message));assert.ok(html.includes('編集中'));assert.ok(!html.includes(f.code));
 const empty=renderToStaticMarkup(R.createElement(FeedbackNotice,{feedback:null}));assert.match(empty,/role="status"/);assert.ok(!empty.includes(f.message));
});
test('target emphasis links only matching types and indices without changing input controls',()=>{
 const {feedbackTargetProps,FeedbackMarker}=module('feedback-notice'),props=feedbackTargetProps(f,'cell',2);assert.equal(props['aria-describedby'],'answer-feedback');assert.match(props.style.outline,/dashed/);assert.equal(props.disabled,undefined);assert.equal(props.onClick,undefined);assert.deepEqual(feedbackTargetProps(f,'card',2),{});
 assert.match(renderToStaticMarkup(R.createElement(FeedbackMarker,{feedback:f,type:'cell',index:2})),/!/);assert.equal(renderToStaticMarkup(R.createElement(FeedbackMarker,{feedback:f,type:'cell',index:1})), '');
});
test('initial incomplete guidance never outlines untouched answer slots',()=>{
 const {feedbackTargetProps,FeedbackMarker}=module('feedback-notice'),missing={...f,phase:'incomplete'};
 assert.deepEqual(feedbackTargetProps(missing,'cell',2),{});
 assert.equal(renderToStaticMarkup(R.createElement(FeedbackMarker,{feedback:missing,type:'cell',index:2})), '');
});
test('trace display distinguishes a preview substep from an accepted command frame',()=>{
 const {ProgramTraceView}=module('program-trace'),trace={frames:[{state:{pos:0,dir:1,used:0},commandIndex:null,repetition:null,completed:true},{state:{pos:1,dir:1,used:0},commandIndex:0,repetition:0,completed:false}],finalState:null,accepted:false,goal:null,failure:{code:'wall',commandIndex:0,repetition:1,before:{pos:1,dir:1,used:0},at:2,message:'1ばんめの2かいめは壁だよ。'}};
 const before=JSON.stringify(trace),html=renderToStaticMarkup(R.createElement(ProgramTraceView,{trace,n:3,walls:[2],target:{pos:8,dir:2},frameIndex:1,onFrameChange:()=>{}}));assert.ok(html.includes('途中の確認'));assert.ok(html.includes(trace.failure.message));assert.ok(html.includes('2かいめ'));assert.ok(html.includes('aria-label="1ぎょう 2れつ、ロボット →"'));assert.ok(html.includes('data-feedback-target="cell:2"'));assert.equal(JSON.stringify(trace),before);
});
test('null trace displays no previous robot or failure',()=>{const {ProgramTraceView}=module('program-trace');assert.equal(renderToStaticMarkup(R.createElement(ProgramTraceView,{trace:null,n:3,walls:[],target:{pos:8,dir:2},frameIndex:0})), '');});
test('initial trace is not called an executed command and cells expose readable state names',()=>{
 const {ProgramTraceView}=module('program-trace'),trace={frames:[{state:{pos:0,dir:1,used:0},commandIndex:null,repetition:null,completed:true}],finalState:{pos:0,dir:1,used:0},accepted:false,goal:{position:false,direction:false,withinBudget:true,withinActionLimit:true},failure:null};
 const html=renderToStaticMarkup(R.createElement(ProgramTraceView,{trace,n:2,walls:[1],target:{pos:3,dir:2}}));assert.ok(html.includes('はじめの位置'));assert.ok(!html.includes('命令の完了'));assert.ok(html.includes('role="img" aria-label="1ぎょう 1れつ、ロボット →"'));assert.ok(html.includes('role="img" aria-label="1ぎょう 2れつ、壁"'));
});
