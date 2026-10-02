import React from 'react';
import type {Feedback,FeedbackTarget} from '../lib/feedback';

export function hasFeedbackTarget(feedback:Feedback|null|undefined,type:FeedbackTarget['type'],index:number):boolean {
 return !!feedback&&(feedback.phase==='editing'||feedback.phase==='invalid')&&feedback.targets.some(target=>target.type===type&&target.index===index);
}
/** Attach to the existing interactive element; never changes its event or disabled state. */
export function feedbackTargetProps(feedback:Feedback|null|undefined,type:FeedbackTarget['type'],index:number,noticeId='answer-feedback') {
 if(!hasFeedbackTarget(feedback,type,index))return {};
 return {'data-feedback-target':`${type}:${index}`,'aria-describedby':noticeId,style:{outline:'3px dashed #9a6520',outlineOffset:2}};
}
export function FeedbackMarker({feedback,type,index}:{feedback:Feedback|null|undefined;type:FeedbackTarget['type'];index:number}) {
 return hasFeedbackTarget(feedback,type,index)?<span aria-hidden="true" style={{fontWeight:900,marginInlineStart:4}}>!</span>:null;
}
/** Keep mounted so a new message updates one polite live region. No score or answer side effect. */
export function FeedbackNotice({feedback,id='answer-feedback',targetLabels}:{feedback:Feedback|null;id?:string;targetLabels?:(target:FeedbackTarget)=>string}) {
 const labels=feedback&&targetLabels?[...new Set(feedback.targets.map(targetLabels).filter(Boolean))]:[];
 return <div id={id} role="status" aria-live="polite" aria-atomic="true" className="feedback-notice" style={{width:'100%',fontSize:14,lineHeight:1.8,textAlign:'center',color:'#765321'}}>{feedback&&<><strong>{feedback.phase==='incomplete'?'まだ途中':feedback.phase==='editing'?'編集中':feedback.phase==='correct'?'確認できた':'見直そう'}：</strong>{feedback.message}{labels.length>0&&<small style={{display:'block'}}>場所：{labels.join('、')}</small>}</>}</div>;
}
