'use client';
import React,{useState,useRef,useEffect} from 'react';
import {RotateCcw,Undo2,ArrowDown,ArrowLeft,ArrowRight,ArrowUp,Check,Star,Lightbulb} from 'lucide-react';
import {Puzzle,check,optionAnswer,neighbors,lightToggle,slideMove,iceMove,railOpen,railPath} from '@/lib/puzzles';
import {MiniGrid,CubeLayers} from './scene';
import {ExtendedPuzzleView} from './extended-puzzle';
import {answerCompletion} from '@/lib/answer-state';
import {explainAnswer,type Feedback} from '@/lib/feedback';
import {OperationGuide} from './operation-guide';
import {FeedbackNotice,feedbackTargetProps} from './feedback-notice';
import {Cubes,Shape,Glyph,Polygon,SliceArt,DotGroup,PALETTE} from './puzzle-art';

export function initialAnswer(p:Puzzle):any{if(['slide','lights','sudoku'].includes(p.kind))return [...p.data.initial];if(p.kind==='rails')return [...p.data.initial];if(p.kind==='path')return[p.data.start];if(p.kind==='ice')return p.data.start;if(p.kind==='paint')return Array(p.solution.length).fill(0);return[];}
export function PuzzleView(props:{p:Puzzle;onAnswer?:(a:any)=>void;locked?:boolean;hint?:boolean;demo?:boolean;playbackAnswer?:any;answerFeedback?:Feedback|null;onEdit?:()=>void}){const key=`${props.p.id}:${props.p.level}:${props.p.seed}`;return props.p.data.extended?<ExtendedPuzzleView key={key} {...props}/>:<OriginalPuzzleView key={key} {...props}/>;}
function OriginalPuzzleView({p,onAnswer,locked=false,hint=false,demo=false,playbackAnswer,answerFeedback=null,onEdit}:{p:Puzzle;onAnswer?:(a:any)=>void;locked?:boolean;hint?:boolean;demo?:boolean;playbackAnswer?:any;answerFeedback?:Feedback|null;onEdit?:()=>void}){
 const [answer,setAnswer]=useState<any>(()=>playbackAnswer??initialAnswer(p)),[rotation,setRotation]=useState(0),[layers,setLayers]=useState(false),[focus,setFocus]=useState(-1),[history,setHistory]=useState<any[]>([]),[incorrect,setIncorrect]=useState<number[]>([]),[operationNotice,setOperationNotice]=useState('');
 const answerRef=useRef(answer),drag=useRef(false),gridRef=useRef<HTMLDivElement>(null),submitted=useRef(false);
 useEffect(()=>{const a=initialAnswer(p);setAnswer(a);answerRef.current=a;setRotation(0);setFocus(-1);setHistory([]);setIncorrect([]);setOperationNotice('');submitted.current=false;},[p]);
 useEffect(()=>{if(playbackAnswer!==undefined){setAnswer(playbackAnswer);answerRef.current=playbackAnswer;}},[playbackAnswer]);
 const {id,kind,data:d}=p;
 const completion=answerCompletion(p,answer),localFeedback=kind==='sudoku'&&!demo?explainAnswer(p,answer,{accepted:check(p,answer),submitted:completion.complete,incomplete:!completion.complete}):null;
 const currentFeedback=answerFeedback??localFeedback,currentNoticeId=answerFeedback?'answer-feedback':'editing-feedback';
 function update(a:any,auto=true){if(locked||submitted.current||demo)return;onEdit?.();setOperationNotice('');setHistory(h=>[...h.slice(-200),answerRef.current]);answerRef.current=a;setAnswer(a);if(auto&&check(p,a)){submitted.current=true;onAnswer?.(a);}}
 function submit(a=answer){if(locked||submitted.current||demo)return;const good=check(p,a);if(good)submitted.current=true;onAnswer?.(a);}
 function reset(){if(locked)return;onEdit?.();setOperationNotice('');submitted.current=false;setAnswer(initialAnswer(p));answerRef.current=initialAnswer(p);setHistory([]);setIncorrect([]);}
 function undo(){if(locked||!history.length)return;onEdit?.();setOperationNotice('');submitted.current=false;const a=history[history.length-1];setAnswer(a);answerRef.current=a;setHistory(history.slice(0,-1));}
 function cell(at:number){if(locked||submitted.current||demo)return;const current=answerRef.current;
  if(kind==='path'){const last=current[current.length-1];if(at===last)return;if(current.length>1&&at===current[current.length-2])return update(current.slice(0,-1),false);if(neighbors(last,d.n).includes(at)&&!current.includes(at)&&!d.blocked?.includes(at)&&(!d.allowed||d.allowed.includes(at)))update([...current,at]);else if(id==='stroke'){onEdit?.();setOperationNotice(current.includes(at)?'その丸は もう通ったよ。ひとつ戻るなら、直前の丸を タッチしよう。':'上下左右の 隣の丸だけに 進めるよ。ひとつ戻るなら、直前の丸を タッチしよう。');}}
  else if(kind==='slide')update(slideMove(current,at,d.n));
  else if(kind==='lights')update(lightToggle(current,at,d.n));
  else if(kind==='rails'){const next=[...current];next[at]=(next[at]+1)%4;update(next);}
  else if(kind==='sudoku'){if(!d.initial[at])setFocus(at);}
  else if(kind==='paint'){const a=[...current];a[at]=1-a[at];update(a);}
  else if(id==='square'||id==='sum'){const a=current.includes(at)?current.filter((i:number)=>i!==at):[...current,at];if(id==='square'&&a.length>4)return;update(a,false);if(id==='square'&&a.length===4)submit(a);}
  else if(kind==='numberpath'){if(d.values[at]===current.length+1)update([...current,at]);else{onAnswer?.(current);setIncorrect([at]);setTimeout(()=>setIncorrect([]),350);}}
  else if(kind==='order'){if(current.includes(at))update(current.filter((v:number)=>v!==at),false);else if(current.length<d.n){const a=[...current,at];update(a,false);if(a.length===d.n)submit(a);}}
  else if(kind==='odd')submit(at);
 }
 const gridStyle={gridTemplateColumns:`repeat(${d.n||4},1fr)`};
 const candidate=(opt:any,i:number)=>{const isShape=d.optionType==='shape',isCubes=d.optionType==='cubes';const val=optionAnswer(p,i);return <button type="button" key={i} className={`answer-option ${locked?'locked':''} ${hint&&check(p,val)?'hint-answer':''} ${playbackAnswer!==undefined&&answer===val?'demo-focus':''}`} disabled={locked||demo} onClick={()=>submit(val)} {...feedbackTargetProps(currentFeedback,'card',i,currentNoticeId)} aria-label={isShape||isCubes?`こたえ ${i+1}`:`こたえ ${opt}`} data-answer={String(val)}>{isShape?<Shape cells={opt}/>:isCubes?<><Cubes cells={opt}/>{layers&&<CubeLayers cells={opt}/>}</>:d.optionType==='glyph'?<Glyph value={opt} size={48}/>:id==='slice'?<><Polygon n={opt}/><span>{opt}かくけい</span></>:<span className={typeof opt==='number'?'number-answer':''}>{opt}</span>}{(isShape||isCubes)&&<span className="option-letter">{['A','B','C','D'][i]}</span>}</button>;};
 const pointer=(e:React.PointerEvent)=>{if(!drag.current||!gridRef.current)return;const b=gridRef.current.getBoundingClientRect(),x=Math.floor((e.clientX-b.left)/b.width*d.n),y=Math.floor((e.clientY-b.top)/b.height*d.n);if(x>=0&&y>=0&&x<d.n&&y<d.n)cell(y*d.n+x);};
 function grid(){const path=kind==='path'?answer:[],solHint=hint&&kind==='path'?p.solution:[];return <div className={`puzzle-grid ${kind} ${id}`} style={gridStyle} ref={gridRef} onPointerDown={kind==='path'?(e)=>{drag.current=true;e.currentTarget.setPointerCapture(e.pointerId);pointer(e);}:undefined} onPointerMove={kind==='path'?pointer:undefined} onPointerUp={()=>{drag.current=false;}} onPointerCancel={()=>{drag.current=false;}}>
  {kind==='path'&&<svg viewBox={`0 0 ${d.n*100} ${d.n*100}`} className="path-lines" aria-hidden="true">{hint&&<polyline points={solHint.map((i:number)=>`${(i%d.n)*100+50},${Math.floor(i/d.n)*100+50}`).join(' ')} fill="none" stroke="#f1b527" strokeWidth="15" strokeDasharray="12 12"/>}<polyline points={path.map((i:number)=>`${(i%d.n)*100+50},${Math.floor(i/d.n)*100+50}`).join(' ')} fill="none" stroke="#079d90" strokeWidth="19" strokeLinecap="round" strokeLinejoin="round"/></svg>}
  {Array.from({length:d.n*d.n},(_,at)=>{const block=d.blocked?.includes(at)||id==='stroke'&&!d.allowed.includes(at)||id==='square'&&!d.dots.includes(at),selected=(['path','numberpath'].includes(kind)||id==='square')&&answer.includes(at);let content:React.ReactNode=null;let cls='';
   if(id==='maze'||id==='ice'){content=at===d.end?<Star fill="#ffd052"/>:at===(kind==='ice'?answer:path[path.length-1])?<span className="player-dot"/>:null;}
   if(id==='stroke')content=block?null:<span className={`light-dot ${selected?'on':''}`}>{at===d.start?<span className="start-dot"/>:null}</span>;
   if(id==='square')content=block?null:<span className={`square-dot ${selected?'on':''}`}/>;
   if(kind==='slide')content=answer[at]||null;
   if(kind==='lights')content=<Lightbulb fill={answer[at]?'#ffd85e':'none'} color={answer[at]?'#bd8b11':'#8d9cab'}/>;
   if(kind==='rails'){const open=railOpen(d.types[at],answer[at]),coord=[[50,0],[100,50],[50,100],[0,50]];content=<svg viewBox="0 0 100 100" aria-hidden="true"><path d={`M${coord[open[0]].join(' ')} L50 50 L${coord[open[1]].join(' ')}`} fill="none" stroke={hint&&p.data.path.includes(at)?'#ecab25':'#3f8199'} strokeWidth="23" strokeLinecap="round" strokeLinejoin="round"/><path d={`M${coord[open[0]].join(' ')} L50 50 L${coord[open[1]].join(' ')}`} fill="none" stroke="#e1f7f2" strokeWidth="7" strokeDasharray="5 7"/>{at===d.start&&<circle cx="50" cy="8" r="9" fill="#faad3c"/>}{at===d.end&&<path d="M40 88H62L51 99Z" fill="#f07c59"/>}</svg>;}
   if(kind==='sudoku'){content=answer[at]||'';cls=`${d.initial[at]?'given':'editable'} ${focus===at?'focused':''}`;}
   if(kind==='numberpath')content=selected?<Check/>:d.values[at];
   if(kind==='odd'){const different=at===d.odd;content=<span style={{transform:`rotate(${d.variant==='direction'&&different?90:0}deg)`}}><Glyph value={d.base+(d.variant==='shape'&&different?1:0)} size={demo?28:42}/>{d.variant==='direction'&&<i className="direction-notch"/>}</span>;}
   const hintCell=hint&&(id==='square'&&p.solution.includes(at)||kind==='odd'&&at===p.solution),targetProps=feedbackTargetProps(currentFeedback,'cell',at,currentNoticeId);
   return <button type="button" key={at} className={`grid-cell ${block?'blocked':''} ${selected?'selected':''} ${cls} ${kind==='lights'&&answer[at]?'lit':''} ${hintCell?'hint-cell':''} ${incorrect.includes(at)?'wrong-cell':''} ${kind==='slide'&&!answer[at]?'empty-tile':''}`} {...targetProps} disabled={block||locked||demo||(kind==='sudoku'&&!!d.initial[at])} onClick={()=>cell(at)} aria-label={kind==='rails'?`レール ${at+1}`:kind==='slide'?`タイル ${answer[at]||'あき'}`:kind==='sudoku'?`マス ${at+1} ${answer[at]||'から'}`:kind==='numberpath'?`すうじ ${d.values[at]}`:`マス ${at+1}`} style={kind==='sudoku'?{...targetProps.style,borderRightWidth:(at%d.n+1)%d.bw===0&&at%d.n!==d.n-1?3:1,borderBottomWidth:(Math.floor(at/d.n)+1)%(d.n/d.bw)===0&&Math.floor(at/d.n)!==d.n-1?3:1}:targetProps.style}>{content}</button>;
  })}</div>;}
 const isGrid=['path','rails','slide','lights','ice','sudoku','odd','numberpath'].includes(kind)||id==='square';
 return <div className={`puzzle-view ${demo?'demo':''} ${layers?'layers-open':''} game-${id}`}>
  {!demo&&<OperationGuide p={p}/>}
  <div className={`problem-surface ${['cubes','top','shadow','rotate3d'].includes(id)?'spatial-source':''}`}>
   {['cubes','shadow','top','rotate3d'].includes(id)&&<div className="spatial-problem"><Cubes cells={d.cubes} rotation={id==='cubes'?rotation:0} front={id==='shadow'}/>{!demo&&id==='cubes'&&<div className="rotate-controls"><button aria-label="ひだりにまわす" onClick={()=>setRotation((rotation+3)%4)}><RotateCcw size={20}/></button><span>まわして みよう</span><button aria-label="みぎにまわす" onClick={()=>setRotation((rotation+1)%4)}><RotateCcw size={20} style={{transform:'scaleX(-1)'}}/></button></div>}{id==='top'&&!demo&&<span className="view-badge"><ArrowDown size={16}/>まうえから</span>}</div>}
   {['cubes','top','shadow','rotate3d'].includes(id)&&!demo&&<><button type="button" className="text-action" onClick={()=>setLayers(v=>!v)}>{layers?'だんの ずを とじる':'だんべつに みる'}</button>{layers&&<div className="layer-panels">{Array.from({length:Math.max(...d.cubes.map((c:number[])=>c[2]))+1},(_,z)=>{const n=Math.max(...d.cubes.flatMap((c:number[])=>c.slice(0,2)))+1;return <div key={z}><small>{z+1}だんめ</small><MiniGrid n={n} values={Array.from({length:n*n},(_,i)=>d.cubes.some(([x,y,zz]:number[])=>x===i%n&&y===Math.floor(i/n)&&zz===z)?'■':'')}/></div>;})}</div>}</>}
   {id==='nets'&&<div className="net-problem"><div className="net-grid" style={{gridTemplateColumns:`repeat(${Math.max(...d.cells.map((c:number[])=>c[0]))+1},var(--net-cell))`,gridTemplateRows:`repeat(${Math.max(...d.cells.map((c:number[])=>c[1]))+1},var(--net-cell))`}}>{d.cells.map(([x,y]:number[],i:number)=><div key={i} style={{gridColumn:x+1,gridRow:y+1,background:PALETTE[d.labels[i]-1]}}>{d.labels[i]}</div>)}</div>{!d.netPrompt&&<p><b className="target-face">{d.target}</b> の うらは？</p>}{d.moves&&<div className="move-sequence">{d.moves.map((v:number,i:number)=><span key={i}>{['↑','→','↓','←'][v]}</span>)}</div>}</div>}
   {id==='slice'&&<SliceArt poly={d.poly} cutPoints={d.cutPoints} planeQuad={d.planeQuad} mode={d.sectionMode} reveal={hint}/>}
   {['rotate','mirror','area'].includes(id)&&<div className="single-shape"><Shape cells={d.shape} color={id==='area'?'#ad86d8':'#b189d9'} grid={id==='area'}/>{id==='mirror'&&<span className="mirror-axis"/>}</div>}
   {id==='fit'&&<div className="shape-equation"><Shape cells={d.parts[0]} extent={Math.max(...d.shape.flat())+1}/><b>＋</b><Shape cells={d.parts[1]} extent={Math.max(...d.shape.flat())+1} color="#44b5ad"/><b>＝ ?</b></div>}
   {isGrid&&grid()}
   {kind==='paint'&&(()=>{
 const generalized=Array.isArray(d.sourceIndices)&&Array.isArray(d.targetIndices),axis=d.axis||'vertical',line=axis==='vertical'?[50,0,50,100]:axis==='horizontal'?[0,50,100,50]:axis==='diagonal'?[0,0,100,100]:[100,0,0,100];
 return <div className="symmetry-board-wrap"><div className="symmetry-grid" style={{gridTemplateColumns:`repeat(${d.n},1fr)`}}>{Array.from({length:d.n*d.n},(_,at)=>{
  const x=at%d.n,y=Math.floor(at/d.n),source=generalized?d.sourceIndices.indexOf(at):(x<d.n/2?y*d.n/2+x:-1),target=generalized?d.targetIndices.indexOf(at):(x>=d.n/2?y*d.n/2+x%(d.n/2):-1),axisCell=source<0&&target<0,painted=source>=0?d.left[source]:target>=0?answer[target]:false;
  return <button key={at} disabled={source>=0||axisCell||locked||demo} onClick={()=>target>=0&&cell(target)} aria-label={`${source>=0?'おてほん':axisCell?'おりめ':'ぬる'} ${Math.floor(at/d.n)+1}ぎょう ${at%d.n+1}れつ`} className={`paint-cell ${painted?'painted':''} ${axisCell?'axis-cell':''} ${hint&&target>=0&&p.solution[target]?'hint-paint':''}`}/>;
 })}</div><svg className="symmetry-axis-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1={line[0]} y1={line[1]} x2={line[2]} y2={line[3]} stroke="#d7a429" strokeWidth="1" strokeDasharray="3 2"/></svg></div>;
})()}
   {id==='pattern'&&<div className="pattern-sequence">{d.seq.map((v:number,i:number)=><Glyph key={i} value={v} size={demo?26:38}/>)}<span className="mystery">?</span></div>}
   {id==='matrix'&&<div className="matrix-grid" style={gridStyle}>{[...d.values,'?'].map((v:any,i:number)=><span key={i} className={v==='?'?'mystery':''}>{v}</span>)}</div>}
   {kind==='order'&&<div className="order-problem"><div className="clue-list">{d.clues.map(([a,b]:number[],i:number)=><div key={i}><Glyph value={a} size={34}/><ArrowRight size={20}/><Glyph value={b} size={34}/></div>)}</div><div className="order-slots">{Array.from({length:d.n},(_,i)=><button key={i} onClick={()=>answer[i]!==undefined&&cell(answer[i])} disabled={locked||demo}>{answer[i]===undefined?<span>{i+1}</span>:<Glyph value={answer[i]} size={36}/>}</button>)}</div></div>}
   {id==='balance'&&<div className="balance-problem"><div>{Array.from({length:d.ca},(_,i)=><Glyph key={i} value={0} size={34}/>)}<b>= {d.aTotal}</b></div><div><Glyph value={0} size={34}/><span>＋</span><Glyph value={1} size={34}/><b>= {d.second}</b></div><div className="balance-target">{Array.from({length:d.targetShape===0?1:d.cb},(_,i)=><Glyph key={i} value={d.targetShape} size={34}/>)}<b>= ?</b></div></div>}
   {id==='count'&&<DotGroup count={d.count} positions={d.positions}/>}
   {id==='compare'&&<div className="compare-problem"><div><DotGroup count={d.a} small/><span>ひだり</span></div><div><DotGroup count={d.b} small/><span>みぎ</span></div></div>}
   {id==='sum'&&<div className="sum-problem"><div className="sum-target">{answer.reduce((s:number,i:number)=>s+d.values[i],0)} <span>/</span> <b>{d.target}</b></div><span>あわせて <b>{d.target}</b> に しよう</span><div className="sum-values">{d.values.map((v:number,i:number)=><button key={i} onClick={()=>cell(i)} disabled={locked||demo} className={answer.includes(i)?'selected':''}>{v}</button>)}</div></div>}
   {id==='missing'&&<div className="math-equation"><b>{d.a}</b><span>{d.op}</span><b className="mystery">?</b><span>=</span><b>{d.total}</b></div>}
   {id==='groups'&&<div className="groups-problem">{Array.from({length:d.groups},(_,i)=><div key={i}><DotGroup count={d.each} small/></div>)}</div>}
  </div>
  {!demo&&<>
   {p.options&&<div className={`answer-options ${d.optionType==='shape'?'shape-options':''} ${d.optionType==='cubes'?'three-options':''} ${p.options.length===5?'five-options':''} ${p.options.length===6?'six-options':''}`}>{p.options.map(candidate)}</div>}
   {kind==='order'&&<div className="order-options">{Array.from({length:d.n},(_,i)=><button key={i} disabled={answer.includes(i)||locked} onClick={()=>cell(i)} aria-label={`カード ${i+1}`}><Glyph value={i} size={40}/></button>)}</div>}
   {kind==='sudoku'&&<div className="sudoku-keypad">{Array.from({length:d.n},(_,i)=><button key={i} disabled={focus<0||locked} onClick={()=>{const a=[...answer];a[focus]=i+1;update(a);}}>{i+1}</button>)}<button disabled={focus<0||locked} onClick={()=>{const a=[...answer];a[focus]=0;update(a,false);}}>消す</button></div>}
   {kind==='ice'&&<div className="direction-controls">{[ArrowLeft,ArrowUp,ArrowDown,ArrowRight].map((Icon,i)=><button key={i} aria-label={['ひだり','うえ','した','みぎ'][i]} disabled={locked} onClick={()=>update(iceMove(answer,[3,0,2,1][i],d.n,d.blocked))}><Icon/></button>)}</div>}
   {!p.options&&kind!=='odd'&&<div className="board-actions"><button onClick={undo} disabled={locked||!history.length} aria-label="ひとつもどす"><Undo2 size={18}/>もどす</button><button onClick={reset} disabled={locked}><RotateCcw size={18}/>やりなおす</button>{id==='sum'&&<button className="confirm-answer" onClick={()=>submit()} disabled={locked||!answer.length}><Check size={18}/>できた</button>}{id==='square'&&answer.length===4&&<button className="confirm-answer" onClick={()=>submit()} disabled={locked}>できた</button>}</div>}
  </>}
  {id==='stroke'&&!demo&&<div className="puzzle-notice" role="status" aria-live="polite">{operationNotice}</div>}
  <FeedbackNotice feedback={localFeedback} id="editing-feedback"/>
 </div>;
}
