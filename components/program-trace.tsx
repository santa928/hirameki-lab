import React from 'react';
import type {ProgramTrace} from '../lib/feedback/program';
import {FeedbackNotice,feedbackTargetProps} from './feedback-notice';
import type {Feedback} from '../lib/feedback';

/** Controlled viewer: editing/undo/reset must discard trace and reset frameIndex in the caller. */
export function ProgramTraceView({trace,n,walls,target,frameIndex=0,onFrameChange}:{trace:ProgramTrace|null;n:number;walls:readonly number[];target:{pos:number;dir:number};frameIndex?:number;onFrameChange?:(index:number)=>void}) {
 if(!trace?.frames.length)return null;
 const index=Math.max(0,Math.min(trace.frames.length-1,Number.isInteger(frameIndex)?frameIndex:0)),frame=trace.frames[index],arrows=['↑','→','↓','←'];
 const failure=trace.failure,notice:Feedback|null=failure?{code:failure.code,message:failure.message,phase:'editing',targets:[{type:'command',index:failure.commandIndex},...(failure.at===null?[]:[{type:'cell' as const,index:failure.at}])]}:null;
 const command=frame.commandIndex===null?'はじめの位置':`${frame.commandIndex+1}ばんめの命令${frame.repetition===null?'':`、${frame.repetition+1}かいめ`}`;
 return <section aria-label="ロボットの実行経過" style={{width:'100%',maxWidth:360,display:'grid',gap:10}}>
  <strong>{command} {frame.commandIndex===null?'':frame.completed?'（命令の完了）':'（途中の確認・答案には保存しない）'}</strong>
  <div style={{display:'grid',gridTemplateColumns:`repeat(${n},minmax(0,1fr))`,gap:3}}>{Array.from({length:n*n},(_,at)=>{
   const robot=at===frame.state.pos,wall=walls.includes(at),goal=at===target.pos;
   return <span key={at} role="img" aria-label={`${Math.floor(at/n)+1}ぎょう ${at%n+1}れつ${robot?`、ロボット ${arrows[frame.state.dir]}`:wall?'、壁':goal?`、星 ${arrows[target.dir]}`:''}`} {...feedbackTargetProps(notice,'cell',at,'program-trace-feedback')} style={{aspectRatio:1,display:'grid',placeItems:'center',border:'1px solid #aebfca',background:wall?'#d9e2e8':'#f4f9fa',fontSize:22,fontWeight:800,...feedbackTargetProps(notice,'cell',at).style}}>{robot?arrows[frame.state.dir]:wall?'■':goal?'☆':'·'}</span>;
  })}</div>
  <small>使った命令 {frame.state.used}こ。星では {arrows[target.dir]}を向いて止まる。</small>
  <div style={{display:'flex',justifyContent:'center',gap:8}}><button type="button" disabled={index===0||!onFrameChange} onClick={()=>onFrameChange?.(0)}>最初</button><button type="button" disabled={index===0||!onFrameChange} onClick={()=>onFrameChange?.(index-1)}>前</button><span>{index+1} / {trace.frames.length}</span><button type="button" disabled={index===trace.frames.length-1||!onFrameChange} onClick={()=>onFrameChange?.(index+1)}>次</button></div>
  {failure&&<small>止まった命令：{failure.commandIndex+1}ばんめ{failure.repetition===null?'':`、${failure.repetition+1}かいめ`}</small>}
  <FeedbackNotice feedback={notice} id="program-trace-feedback"/>
 </section>;
}
