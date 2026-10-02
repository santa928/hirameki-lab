import{generate,check,optionAnswer,neighbors,slideMove,lightToggle,type Puzzle}from'./puzzles.ts';
import{initialExtended}from'./engine/extended.ts';
import{range,equal,search}from'./engine/shared.ts';
import{trialStep,trialGoal,codeFeedback}from'./engine/trial.ts';
import{generateStage}from'./stages.ts';
import{planeTeaching}from'./teaching/plane-steps.ts';
import{spaceTeaching}from'./teaching/space-steps.ts';
import{foldTrace}from'./teaching/fold.ts';
import{rollTrace}from'./teaching/roll.ts';
import{skewerTrace}from'./teaching/skewer.ts';
export type TutorialContext={mode:'stage'|'timed'|'free';stage?:number;level?:number;source?:Puzzle};
export type TutorialFrame={answer:any;caption:string;scene?:any;phase?:string;focus?:{selectors:string[];resultOnly?:boolean}};
/** Generate a different example in the same concept; never mutate the live puzzle. */
function example(id:string,context?:TutorialContext):Puzzle{
 if(!context)return generate(id,1,73021);
 const source=context.source??(context.mode==='stage'?generateStage(id,context.stage??1,0):undefined),level=source?.level??context.level??1;
 const keys=['concept','task','variant','sectionMode','mode','taskMode','ruleFamily','inverse','reverse'];
 const family=(p:Puzzle)=>p.id==='nets'?(p.data.moves?'roll':p.data.pose?'side':'opposite'):p.id==='matrix'?JSON.stringify([p.data.n,p.data.ruleFamily,p.data.missing]):p.id==='cipher'?JSON.stringify([p.data.maps?.length,p.data.reverse]):null;
 for(let attempt=0;attempt<96;attempt++){const p=generate(id,level,73021+(source?.seed??0)+7919*(attempt+1));
  if(source&&(family(p)!==family(source)||p.seed===source.seed||JSON.stringify(p.data)===JSON.stringify(source.data)||keys.some(k=>source.data[k]!==undefined&&JSON.stringify(p.data[k])!==JSON.stringify(source.data[k]))))continue;
  return p;
 }
 throw Error('No separate tutorial example for '+id);
}
const copy=(v:any)=>JSON.parse(JSON.stringify(v));
/** Build a replay independent from game records and the current answer. */
export function makeTutorial(id:string,context?:TutorialContext){
 const p=example(id,context),frames:TutorialFrame[]=[];const add=(answer:any,caption='ここを タッチ')=>frames.push({answer:copy(answer),caption,focus:focusFor(p,answer)});
 const teaching=planeTeaching(p)??spaceTeaching(p)??specificTeaching(p);
 if(teaching){teaching.forEach((step,i)=>frames.push({...step,answer:i===teaching.length-1?copy(p.solution):[],focus:{selectors:[step.scene.type==='net-state'&&step.scene.faces?'.teaching-net .teaching-exact':'[data-tutorial-diagram]']}}));}
 else if(id==='codebreak'){const secret=p.data.secret,first=[...secret.slice(1),secret[0]],second=[secret[1],secret[0],...secret.slice(2)];p.solution=[first,second,secret];add([],'ためして、◎と△を くらべよう');for(let i=0;i<3;i++){const result=codeFeedback(secret,p.solution[i]);add(p.solution.slice(0,i+1),`◎${result.exact}こ、△${result.near}こ。${i?'ばしょを かえると どうなる？':'しるしは あっているけれど、ばしょが ちがうね。'}`);}}
 else if(p.kind==='trial'){let state=copy(p.data.initial);add([],'はじめの ばしょから、1てずつ みよう');for(let i=0;i<p.solution.length;i++){const a=p.solution[i],next=trialStep(p,state,a);if(next===null)throw Error('Invalid tutorial move '+id);add(p.solution.slice(0,i+1),actionWords(p,a,state,next));state=next;if(trialGoal(p,state)){p.solution=p.solution.slice(0,i+1);break;}}}
 else if(p.kind==='visual-choice'||p.options){add([],p.hint);add(p.solution,'これが あてはまるよ');}
 else if(p.kind==='ice'){add(p.data.start,'やじるしで かべまで すべるよ');p.data.route.slice(1).forEach((at:number)=>add(at,'かべで とまるよ'));}
 else if(p.kind==='slide'){let path:number[][]|null;
 if(p.data.n===4){const reverse=[copy(p.solution)];let previous=-1;for(let i=0;i<5;i++){const state=reverse.at(-1)!,empty=state.indexOf(0),choices=neighbors(empty,4).filter(v=>v!==previous),to=choices[Math.abs(p.seed+i*7)%choices.length];reverse.push(slideMove(state,to,4));previous=empty;}path=reverse.reverse();}
 else path=search(p.data.initial,(s:number[])=>neighbors(s.indexOf(0),p.data.n).map(i=>slideMove(s,i,p.data.n)),s=>equal(s,p.solution),15000);
 if(!path)throw Error('tutorial slide');const tail=path.slice(-6);p.data.initial=tail[0];tail.forEach((s,i)=>add(s,i?'空きと となりのタイルを 入れかえる':p.data.n===4?'同じ4×4の 完成の近くから5手。空きの隣を 動かす':'完成の近くから。空きの隣を 動かす'));}
 else if(p.kind==='lights'){let a=[...p.data.initial];add(a,'おすと となりも かわるよ');for(const at of p.data.moves){a=lightToggle(a,at,p.data.n);add(a,`${at%p.data.n+1}れつめを タッチ`);}}
 else if(p.kind==='rails'){const a=[...p.solution],positions=p.data.path.slice(0,3);positions.forEach((at:number)=>a[at]=(a[at]+3)%4);p.data.initial=[...a];add(a,'レールを タッチすると まわるよ');positions.forEach((at:number)=>{a[at]=(a[at]+1)%4;add(a,'つぎの レールへ つなごう');});}
 else if(p.kind==='domino-chain'){add({order:[],flips:[]},'おなじ すうじを つなぐよ');for(let i=0;i<p.solution.order.length;i++)add({order:p.solution.order.slice(0,i+1),flips:p.solution.flips.slice(0,i+1)},'ひつようなら まわして つなごう');}
 else if(p.kind==='jigsaw'){const a=copy(p.data.initial);a.turns=[...p.solution.turns];p.data.initial=copy(a);add(a,'そとの へんは 0だよ');p.solution.slots.forEach((v:number,i:number)=>{a.slots[i]=v;add(a,'おなじ すうじの ＋と−を つなごう');});}
 else if(p.kind==='pairpaths'){const a=copy(p.data.initial);add(a,'おなじ ばんごうを つなぐよ');p.solution.forEach((path:number[],i:number)=>{path.slice(1).forEach(at=>{a[i].push(at);add(a,`${i+1}ばんの みちを なぞろう`);});});}
 else if(p.kind==='coins'){const a=initialExtended(p);add(a,'今の金額と枚数から、最少の組合せへ');p.solution.forEach((count:number,i:number)=>{while(a[i]!==count){const increase=a[i]<count;a[i]+=increase?1:-1;add(a,`${p.data.denoms[i]}えんを 1まい${increase?'ふやす':'へらす'}。今は ${a.reduce((sum:number,n:number,j:number)=>sum+n*p.data.denoms[j],0)}えん`);}});}
 else if(['binary-grid','fold-grid','district','region-color','switches','assignment','operators','coins','sudoku','paint'].includes(p.kind)){let a=p.data.extended?initialExtended(p):p.data.initial?[...p.data.initial]:range(p.solution.length).map(()=>0);const diffs=range(p.solution.length).filter(i=>a[i]!==p.solution[i]);if(diffs.length>6){diffs.slice(0,-6).forEach(i=>a[i]=p.solution[i]);if(p.data.extended){p.data.initial=copy(a);if(p.data.given)diffs.slice(0,-6).forEach(i=>p.data.given[i]=p.solution[i]);}else p.data.initial=copy(a);}add(a,'あいている ところを うめよう');diffs.slice(-6).forEach(i=>{a[i]=p.solution[i];add(a,p.kind==='operators'?'しるしを かえよう':p.kind==='coins'?'コインを えらぼう':'ここを タッチ');});}
 else if(p.kind==='edge-grid'){const a=[...p.data.initial];add(a,'せんを タッチして つなぐよ');p.solution.forEach((v:number,i:number)=>{for(let j=0;j<v;j++){a[i]++;add(a,'すうじを たしかめよう');}});}
 else if(p.kind==='mirrors'){const a=[...p.data.initial];add(a,'かがみを タッチして まわそう');p.solution.forEach((v:number,i:number)=>{if(a[i]!==v){a[i]=v;add(a,'ひかりの みちが かわるよ');}});}
 else if(Array.isArray(p.solution)){const start=p.kind==='path'?[p.data.start]:[];add(start,p.kind==='path'?'まるから みちを なぞろう':'ひとつずつ えらぼう');for(let i=start.length;i<p.solution.length;i++)add(p.solution.slice(0,i+1),p.kind==='tiling'?'ピースを えらんで おこう':p.kind==='extract'?'ぶつからない ピースを ぬこう':'つぎを えらぼう');}
 else{add([],p.hint);add(p.solution,'ここに あった！');}
 if(!frames.length||!check(p,frames.at(-1)!.answer))throw Error(`Incomplete tutorial: ${id}`);
 frames[frames.length-1].caption='できた！ '+frames[frames.length-1].caption+' '+p.hint;
 if(p.options)frames[frames.length-1].focus!.resultOnly=true;
 return{p,frames};
}
/** Name the real source, destination and result of a replayed action. */
function actionWords(p:Puzzle,a:any,before:any,after:any){
 if(p.id==='frogs'){const to=before.indexOf(0);return `${a+1}ばんの マスから ${to+1}ばんへ、${Math.abs(to-a)===2?'1ぴき とびこす':'1マス すすむ'}`;}
 if(p.id==='flood'){const count=(mask:number)=>p.data.regions.filter((r:number)=>mask&(1<<r)).length;return `色${a+1}に かえる。左上の しまが ${count(before.mask)}マスから ${count(after.mask)}マスへ ひろがる`;}
 if(p.id==='trainyard'){const name=(v:any)=>v==='in'?'いりぐち':v==='out'?'しゅっぱつ':`たいひ ${v+1}`;const car=a.from==='in'?before.input[0]:before.sidings[a.from].at(-1);return `れっしゃ${car}を ${name(a.from)}から ${name(a.to)}へ。${a.to==='out'?'順番どおりに 出発':'さいごに 入れた車両から 出せる'}`;}
 if(typeof a==='number')return p.id==='pancake'?`うえから ${a}まいを うらがえす`:['sokoban','keydoors','twobots'].includes(p.id)?['うえへ ↑','みぎへ →','したへ ↓','ひだりへ ←'][a]:'ここを タッチ';if(typeof a==='string')return a==='L'?'ひだりへ むきを かえる ↶':a==='R'?'みぎへ むきを かえる ↷':'まえへ すすむ ↑';if(a.riders)return `${a.riders.map((i:number)=>String.fromCharCode(65+i)).join('・')||'ふねだけ'}で わたる`;if(a.from!==undefined&&a.to!==undefined)return `${typeof a.from==='number'?a.from+1:a.from} → ${typeof a.to==='number'?a.to+1:a.to}`;if(a.guess!==undefined)return `${a.guess+1}ばんに しぼれた！`;if(a.left)return 'さゆうを はかって くらべよう';return 'うごきを みてみよう';}

/** Adapt mathematically checked traces to static, reversible teaching frames. */
function specificTeaching(p:Puzzle):{scene:any;caption:string;phase:string}[]|null{
 const d=p.data;
 if(p.id==='foldpunch'){const t=foldTrace(d.n,d.folds,d.holes),frames:any[]=[];
  for(const step of t.foldSteps){frames.push({scene:{type:'paper-state',size:step.before,creases:[...step.creasesBefore,...step.crease],holes:[],fold:step},caption:`${step.order}かいめ。${step.axis==='x'?'みぎ半分を ひだりへ':'下半分を 上へ'}おる。破線が おる線`,phase:'transform'});frames.push({scene:{type:'paper-state',size:step.after,creases:step.creasesAfter,holes:[]},caption:`${step.order}かい おった紙。よこ${step.after.width}・たて${step.after.height}。まだ穴は ない`,phase:'transform'});}
  frames.push({scene:{type:'paper-state',size:t.folded,creases:t.folded.creases,holes:t.folded.holes},caption:'おった紙に あなを あける',phase:'observe'});
  for(const step of t.unfoldSteps)frames.push({scene:{type:'paper-state',size:step.after,creases:step.creases,holes:step.holes},caption:`${step.order}かいめの折りを ひらく。あなは 折り線の両側に うつる`,phase:'transform'});
  return frames;
 }
 if(p.id==='rollcube'){
  const directions=['奥 ↑','右 →','手前 ↓','左 ←'],intro:{scene:any;caption:string;phase:string}[]=[];
  for(let direction=0;direction<4;direction++){
   const single=rollTrace(d.faces,[direction]);
   intro.push({scene:{type:'cube-pose',pose:single.states[0].pose,move:null},caption:`はじめの6面から${directions[direction]}へ1手の例。まず はじめの配置`,phase:'observe'});
   intro.push({scene:{type:'cube-pose',pose:single.states[1].pose,move:direction},caption:`はじめの6面から${directions[direction]}へ1回ころがす。うえは${single.states[1].pose.top}`,phase:'transform'});
  }
  const actual=rollTrace(d.faces,d.moves);
  return [...intro,...actual.states.map(s=>({scene:{type:'cube-pose',pose:s.pose,move:s.move},caption:s.move===null?'はじめの6面に戻す。ここから この例の矢印を 順にたどる':`${directions[s.move]}へ 1かいころがす。うえは${s.pose.top}`,phase:s.move===null?'observe':'transform'}))];
 }
 if(p.id==='skewer'){const t=skewerTrace(d);return [{scene:{...d.scene,type:'skewer-state',n:d.n,h:d.h,values:d.values,axis:d.axis,fixed:d.fixed,sign:d.sign,entry:t.entry,tokens:[]},caption:'やじるしの外から おなじ列を まっすぐ見る',phase:'observe'},...t.steps.map(step=>({scene:{type:'skewer-state',n:d.n,h:d.h,values:d.values,axis:d.axis,fixed:d.fixed,sign:d.sign,entry:t.entry,current:step,tokens:step.tokens},caption:`位置(${step.displayCoordinate.join(',')})。${step.skipped?'空きは 通りぬけ、数えない':step.value+'を 読む'}。順番は ${step.tokens.join(' → ')||'まだなし'}`,phase:'transform'}))];}
 return null;
}

/** Stable selectors identify the replay result, not an arbitrary selected control. */
function focusFor(p:Puzzle,answer:any):{selectors:string[];resultOnly?:boolean}{
 if(p.options)return{selectors:['.problem-surface','.scene','[data-tutorial-diagram]']};
 if(p.kind==='edge-grid')return{selectors:['.edge-board','[data-tutorial-diagram]']};
 if(p.kind==='domino-chain')return{selectors:['.domino-chain','[data-tutorial-diagram]']};
 if(p.id==='circuit')return{selectors:['.scene-circuit','[data-tutorial-diagram]']};
 if(p.id==='ballweigh')return{selectors:[answer.length?'.weigh-history>div:last-child':'.ball-rack','[data-tutorial-diagram]']};
 if(['point-select','separator','parking','chords'].includes(p.kind))return{selectors:['.geometry-art','[data-tutorial-diagram]']};
 if(p.kind==='card-select')return{selectors:['.symbol-options','[data-tutorial-diagram]']};
 if(p.kind==='extract')return{selectors:['.voxel-pieces','.empty-pieces','[data-tutorial-diagram]']};
 const boards:Record<string,string>={sokoban:'.diagram-grid',keydoors:'.diagram-grid',twobots:'.diagram-grid',programbot:'.diagram-grid',matchsticks:'.match-equation',bridge:'.river-banks',river:'.river-banks',jugs:'.jugs',hanoi:'.hanoi-pegs',traffic:'.traffic-board',colorsort:'.bottle-rack',pancake:'.pancake-stack'};
 if(boards[p.id])return{selectors:[boards[p.id],'[data-tutorial-diagram]']};
 if(p.id==='codebreak')return{selectors:[answer.length?'.code-history>div:first-child':'.code-slots','[data-tutorial-diagram]']};
 if(p.id==='trainyard'){const a=answer.at(-1);return{selectors:[!a?'.train-input':a.to==='out'?'.train-output':`.train-sidings>button:nth-child(${a.to+1})`,'[data-tutorial-diagram]']};}
 if(p.id==='frogs')return{selectors:['.frog-row','[data-tutorial-diagram]']};
 if(p.id==='flood')return{selectors:['.diagram-grid','[data-tutorial-diagram]']};
 if(p.kind==='pairpaths')return{selectors:['.touch-board','[data-tutorial-diagram]']};
 return{selectors:['.demo-focus','.arranged-slots','.touch-board','.puzzle-grid','[data-tutorial-diagram]']};
}
/** Translate a checked answer into its visible option, never expose an internal choice index. */
export function tutorialResultScene(p:Puzzle,answer:any):any{
 const index=p.options?.findIndex((_,i)=>JSON.stringify(optionAnswer(p,i))===JSON.stringify(answer))??-1;
 const result=index>=0?p.options![index]:answer;
 if(Array.isArray(result)&&['shape','cubes'].includes(p.data.optionType))return{type:p.data.optionType,cells:copy(result)};
 if(result&&typeof result==='object')return copy(result);
 if(p.data.optionType==='glyph')return{type:'glyph',value:result};
 return{type:'text',text:p.id==='slice'?String(result)+'かくけい':String(result)};
}
/** Fit the teaching section without moving page scroll or changing diagram units. */
export function tutorialViewportFit(section:{top:number;bottom:number},viewport:{top:number;bottom:number},surfaceHeight:number){
 const available=Math.max(0,viewport.bottom-viewport.top),excess=Math.max(0,section.bottom-section.top-available),height=Math.max(96,surfaceHeight-excess),surface=Math.min(surfaceHeight,height),bottom=section.bottom-(surfaceHeight-surface);
 const scrollDelta=bottom>viewport.bottom?bottom-viewport.bottom:section.top<viewport.top?section.top-viewport.top:0;
 return{surfaceHeight:surface,scrollDelta};
}

/** Actual target bounds must fit both its surface and the visible dialog/window. */
export function tutorialFocusVisible(target:{top:number;bottom:number;left:number;right:number},surface:{top:number;bottom:number;left:number;right:number},viewport:{top:number;bottom:number;left:number;right:number}){
 return[target,surface,viewport].every(r=>Object.values(r).every(Number.isFinite))&&target.top>=Math.max(surface.top,viewport.top)-1&&target.bottom<=Math.min(surface.bottom,viewport.bottom)+1&&target.left>=Math.max(surface.left,viewport.left)-1&&target.right<=Math.min(surface.right,viewport.right)+1;
}
