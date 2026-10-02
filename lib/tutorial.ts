import{generate,check,neighbors,slideMove,lightToggle,type Puzzle}from'./puzzles.ts';
import{initialExtended}from'./engine/extended.ts';
import{range,equal,search}from'./engine/shared.ts';
import{replayTrial,trialStep,trialGoal,codeFeedback}from'./engine/trial.ts';
export type TutorialFrame={answer:any;caption:string};
const copy=(v:any)=>JSON.parse(JSON.stringify(v));
export function makeTutorial(id:string){
 const p=generate(id,1,73021),frames:TutorialFrame[]=[];const add=(answer:any,caption='ここを タッチ')=>frames.push({answer:copy(answer),caption});
 if(id==='codebreak'){const secret=p.data.secret,first=[...secret.slice(1),secret[0]],second=[secret[1],secret[0],...secret.slice(2)];p.solution=[first,second,secret];add([],'ためして、◎と△を くらべよう');for(let i=0;i<3;i++){const result=codeFeedback(secret,p.solution[i]);add(p.solution.slice(0,i+1),`◎${result.exact}こ、△${result.near}こ。${i?'ばしょを かえると どうなる？':'しるしは あっているけれど、ばしょが ちがうね。'}`);}}
 else if(p.kind==='trial'){let state=copy(p.data.initial),end=p.solution.length;for(let i=0;i<p.solution.length;i++){state=trialStep(p,state,p.solution[i]);if(trialGoal(p,state)){end=i+1;break;}}const all=p.solution.slice(0,end),cut=Math.max(0,all.length-5);if(cut)p.data.initial=replayTrial(p,all.slice(0,cut));p.solution=all.slice(cut);add([],'うごきを みてみよう');p.solution.forEach((a:any,i:number)=>add(p.solution.slice(0,i+1),actionWords(p,a)));}
 else if(p.kind==='visual-choice'||p.options){add([],p.hint);add(p.solution,'これが あてはまるよ');}
 else if(p.kind==='ice'){add(p.data.start,'やじるしで かべまで すべるよ');p.data.route.slice(1).forEach((at:number)=>add(at,'かべで とまるよ'));}
 else if(p.kind==='slide'){const path=search(p.data.initial,(s:number[])=>neighbors(s.indexOf(0),p.data.n).map(i=>slideMove(s,i,p.data.n)),s=>equal(s,p.solution),15000);if(!path)throw Error('tutorial slide');const tail=path.slice(-5);p.data.initial=tail[0];tail.forEach((s,i)=>add(s,i?'あいた マスへ うごかそう':'からの マスの となりを タッチ'));}
 else if(p.kind==='lights'){let a=[...p.data.initial];add(a,'おすと となりも かわるよ');for(const at of p.data.moves){a=lightToggle(a,at,p.data.n);add(a,`${at%p.data.n+1}れつめを タッチ`);}}
 else if(p.kind==='rails'){const a=[...p.solution],positions=p.data.path.slice(0,3);positions.forEach((at:number)=>a[at]=(a[at]+3)%4);p.data.initial=[...a];add(a,'レールを タッチすると まわるよ');positions.forEach((at:number)=>{a[at]=(a[at]+1)%4;add(a,'つぎの レールへ つなごう');});}
 else if(p.kind==='domino-chain'){add({order:[],flips:[]},'おなじ すうじを つなぐよ');for(let i=0;i<p.solution.order.length;i++)add({order:p.solution.order.slice(0,i+1),flips:p.solution.flips.slice(0,i+1)},'ひつようなら まわして つなごう');}
 else if(p.kind==='jigsaw'){const a=copy(p.data.initial);a.turns=[...p.solution.turns];p.data.initial=copy(a);add(a,'そとの へんは 0だよ');p.solution.slots.forEach((v:number,i:number)=>{a.slots[i]=v;add(a,'おなじ すうじの ＋と−を つなごう');});}
 else if(p.kind==='pairpaths'){const a=copy(p.data.initial);add(a,'おなじ ばんごうを つなぐよ');p.solution.forEach((path:number[],i:number)=>{path.slice(1).forEach(at=>{a[i].push(at);add(a,`${i+1}ばんの みちを なぞろう`);});});}
 else if(p.kind==='coins'){const a=initialExtended(p);add(a,'コインを タッチして あつめよう');p.solution.forEach((count:number,i:number)=>{for(let j=0;j<count;j++){a[i]++;add(a,`${p.data.denoms[i]}えんを 1まい`);}});}
 else if(['binary-grid','fold-grid','district','region-color','switches','assignment','operators','coins','sudoku','paint'].includes(p.kind)){let a=p.data.extended?initialExtended(p):p.data.initial?[...p.data.initial]:range(p.solution.length).map(()=>0);const diffs=range(p.solution.length).filter(i=>a[i]!==p.solution[i]);if(diffs.length>6){diffs.slice(0,-6).forEach(i=>a[i]=p.solution[i]);if(p.data.extended){p.data.initial=copy(a);if(p.data.given)diffs.slice(0,-6).forEach(i=>p.data.given[i]=p.solution[i]);}else p.data.initial=copy(a);}add(a,'あいている ところを うめよう');diffs.slice(-6).forEach(i=>{a[i]=p.solution[i];add(a,p.kind==='operators'?'しるしを かえよう':p.kind==='coins'?'コインを えらぼう':'ここを タッチ');});}
 else if(p.kind==='edge-grid'){const a=[...p.data.initial];add(a,'せんを タッチして つなぐよ');p.solution.forEach((v:number,i:number)=>{for(let j=0;j<v;j++){a[i]++;add(a,'すうじを たしかめよう');}});}
 else if(p.kind==='mirrors'){const a=[...p.data.initial];add(a,'かがみを タッチして まわそう');p.solution.forEach((v:number,i:number)=>{if(a[i]!==v){a[i]=v;add(a,'ひかりの みちが かわるよ');}});}
 else if(Array.isArray(p.solution)){const start=p.kind==='path'?[p.data.start]:[];add(start,p.kind==='path'?'まるから みちを なぞろう':'ひとつずつ えらぼう');for(let i=start.length;i<p.solution.length;i++)add(p.solution.slice(0,i+1),p.kind==='tiling'?'ピースを えらんで おこう':p.kind==='extract'?'ぶつからない ピースを ぬこう':'つぎを えらぼう');}
 else{add([],p.hint);add(p.solution,'ここに あった！');}
 if(!frames.length||!check(p,frames.at(-1)!.answer))throw Error(`Incomplete tutorial: ${id}`);
 frames[frames.length-1].caption='できた！ '+p.hint;
 return{p,frames};
}
function actionWords(p:Puzzle,a:any){if(typeof a==='number')return p.id==='pancake'?`うえから ${a}まいを うらがえす`:['sokoban','keydoors','twobots'].includes(p.id)?['うえへ ↑','みぎへ →','したへ ↓','ひだりへ ←'][a]:'ここを タッチ';if(typeof a==='string')return a==='L'?'ひだりへ むきを かえる ↶':a==='R'?'みぎへ むきを かえる ↷':'まえへ すすむ ↑';if(a.riders)return `${a.riders.map((i:number)=>String.fromCharCode(65+i)).join('・')||'ふねだけ'}で わたる`;if(a.from!==undefined&&a.to!==undefined)return `${typeof a.from==='number'?a.from+1:a.from} → ${typeof a.to==='number'?a.to+1:a.to}`;if(a.guess!==undefined)return `${a.guess+1}ばんに しぼれた！`;if(a.left)return 'さゆうを はかって くらべよう';return 'うごきを みてみよう';}
