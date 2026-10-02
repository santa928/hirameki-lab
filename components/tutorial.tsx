'use client';
import React,{useMemo,useState,useEffect,useLayoutEffect,useRef}from'react';
import{Play,Pause,RotateCcw,ChevronRight,ChevronLeft,Check}from'lucide-react';
import{makeTutorial,tutorialResultScene,tutorialViewportFit,tutorialFocusVisible,type TutorialContext}from'@/lib/tutorial';
import{PuzzleView}from'./puzzle-view';
import{TeachingScene}from'./teaching-scene';
import './tutorial.css';
/** Keep playback, back/reset and focus on one immutable frame index. */
export function Tutorial({id,context}:{id:string;context?:TutorialContext}){
 const tutorial=useMemo(()=>makeTutorial(id,context),[id,context?.mode,context?.stage,context?.level,context?.source]),{p,frames}=tutorial;
 const [at,setAt]=useState(0),[playing,setPlaying]=useState(false),[reduced,setReduced]=useState(false),surface=useRef<HTMLDivElement>(null),diagram=useRef<HTMLDivElement>(null),section=useRef<HTMLElement>(null);
 const index=Math.min(at,frames.length-1),frame=frames[index],done=index===frames.length-1;
 useEffect(()=>{setAt(0);setPlaying(false);},[tutorial]);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)'),update=()=>{setReduced(media.matches);if(media.matches)setPlaying(false);};update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 useEffect(()=>{if(!playing||reduced)return;const t=setTimeout(()=>{if(index>=frames.length-1)setPlaying(false);else setAt(v=>v+1);},index===0?1100:1000);return()=>clearTimeout(t);},[playing,reduced,index,frames.length]);
 useLayoutEffect(()=>{const box=surface.current,content=diagram.current,root=section.current;if(!box||!content||!root)return;
  const dialog=root.closest<HTMLElement>('[role="dialog"]');let pending=0;
  // Child playback views update after this layout effect. Re-query once settled;
  // only dialog/surface scroll move, and no keyboard or page focus is changed.
  const fit=(resetLimit=false)=>{
   if(resetLimit)box.style.maxHeight='';
   let viewport={top:0,bottom:window.innerHeight,left:0,right:window.innerWidth};
   if(dialog){
    const rect=dialog.getBoundingClientRect();viewport={top:Math.max(8,rect.top+8),bottom:Math.min(window.innerHeight-8,rect.bottom-8),left:Math.max(0,rect.left),right:Math.min(window.innerWidth,rect.right)};
    const size=tutorialViewportFit(root.getBoundingClientRect(),viewport,box.getBoundingClientRect().height);
    if(size.surfaceHeight<box.getBoundingClientRect().height-1)box.style.maxHeight=size.surfaceHeight+'px';
    const delta=tutorialViewportFit(root.getBoundingClientRect(),viewport,box.getBoundingClientRect().height).scrollDelta;
    if(Math.abs(delta)>1)dialog.scrollTo({top:Math.max(0,dialog.scrollTop+delta),behavior:'instant'});
   }
   const candidates=frame.focus?.selectors??[],target=candidates.map(sel=>content.querySelector<HTMLElement>(sel)).find(Boolean)??content;
   content.removeAttribute('data-tutorial-focus');content.querySelectorAll('[data-tutorial-focus]').forEach(el=>el.removeAttribute('data-tutorial-focus'));target.setAttribute('data-tutorial-focus','true');
   const r=target.getBoundingClientRect(),b=box.getBoundingClientRect();box.scrollTo({top:Math.max(0,box.scrollTop+r.top-b.top-8),left:0,behavior:'instant'});
   box.dataset.focusVisible=String(tutorialFocusVisible(target.getBoundingClientRect(),box.getBoundingClientRect(),viewport));
  };
  const schedule=()=>{if(!pending)pending=requestAnimationFrame(()=>{pending=0;fit();});};
  fit(true);
  const observer=new ResizeObserver(schedule);observer.observe(content);observer.observe(root);
  // Exclude attributes: our own focus markers and maxHeight must not create a loop.
  const mutations=new MutationObserver(schedule);mutations.observe(content,{childList:true,characterData:true,subtree:true});
  const resize=()=>{fit(true);schedule();};window.addEventListener('resize',resize);dialog?.addEventListener('animationend',schedule);
  return()=>{observer.disconnect();mutations.disconnect();if(pending)cancelAnimationFrame(pending);window.removeEventListener('resize',resize);dialog?.removeEventListener('animationend',schedule);};
 },[tutorial,index,frame]);
 const finalScene=tutorialResultScene(p,frame.answer);
 return <section ref={section} className="tutorial tutorial-context" data-game={id} data-step={index} data-reduced-motion={reduced?'true':'false'}><div className="tutorial-label"><span>おてほん</span><small>べつの問題 ・ 同じ考え方</small></div><div className="tutorial-step-label">{index+1} / {frames.length} ステップ{frame.phase&&<span> ・ {({observe:'たしかめる',transform:'うごかす',calculate:'かぞえる',compare:'くらべる'} as Record<string,string>)[frame.phase]??frame.phase}</span>}</div><div className="tutorial-surface" ref={surface}><div ref={diagram} data-tutorial-diagram>{frame.scene?<TeachingScene scene={frame.scene}/>:frame.focus?.resultOnly?<div className="tutorial-result"><strong>結果</strong><TeachingScene scene={finalScene}/></div>:<PuzzleView p={p} locked playbackAnswer={frame.answer}/>}</div></div><p className={`tutorial-caption ${done?'finished':''}`} aria-live="polite">{done&&<Check size={20}/>} {frame.caption}</p><div className="tutorial-controls"><button type="button" disabled={index===0} onClick={()=>{setPlaying(false);setAt(v=>Math.max(0,v-1));}}><ChevronLeft size={18}/>まえへ</button><button type="button" onClick={()=>{if(reduced){setAt(done?0:index+1);setPlaying(false);}else{if(done)setAt(0);setPlaying(v=>!v);}}}>{playing?<Pause size={18}/>:<Play size={18}/>} {playing?'とめる':reduced?'1てずつ':done?'もういちど':'うごきを みる'}</button><button type="button" aria-label="おてほんを はじめから" onClick={()=>{setAt(0);setPlaying(false);}}><RotateCcw size={18}/></button><button type="button" disabled={done} onClick={()=>{setPlaying(false);setAt(v=>Math.min(frames.length-1,v+1));}}>ひとつ すすむ <ChevronRight size={18}/></button></div><div className="tutorial-progress" aria-label={`${index} / ${frames.length-1}て`}><span style={{width:`${index/Math.max(1,frames.length-1)*100}%`}}/></div></section>;
}
