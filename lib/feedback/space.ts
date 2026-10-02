import type {Puzzle} from '../engine/shared.ts';
import type {Feedback,FeedbackTarget} from '../feedback.ts';
import {equal,normalize,key} from '../engine/shared.ts';
import {contacts,cubeSignature,cubeRotations,surfaceStep,applyHingeTurn,tiltTrace,dropPlacement} from '../engine/space.ts';
import {project,foldNet,cutCube} from '../puzzles.ts';
import {rollTrace} from '../teaching/roll.ts';

export const SPACE_FEEDBACK_IDS:readonly string[]=Object.freeze([
 'cubes','shadow','top','rotate3d','nets','slice','viewbuild','pack3d','drop3d','ropeends','contact3d',
 'depthorder','voxelcoords','surfacewalk','balancefoot','tunnelpass','hinge3d','handedness','gears','gravitytray','viewpoint'
]);
export type SpaceAnswerStatus={accepted:boolean;submitted?:boolean};
const directions=['うえ','みぎ','した','ひだり'],axes=['横','奥','高さ'];
const dot=(a:number[],b:number[])=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a:number[],b:number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const cells=(v:any):number[][]|null=>Array.isArray(v)?v:Array.isArray(v?.cells)?v.cells:null;
function findScene(s:any,type:string):any {
 if(!s)return null;if(s.type===type)return s;
 for(const child of s.items||[]){const result=findScene(child,type);if(result)return result;}
 return null;
}
const views=(a:number[][])=>[
 normalize([...new Map(a.map(([x,,z])=>[key([x,z]),[x,z]])).values()]),
 normalize([...new Map(a.map(([,y,z])=>[key([y,z]),[y,z]])).values()]),
 normalize([...new Map(a.map(([x,y])=>[key([x,y]),[x,y]])).values()])
];
function mismatch(a:number[][],b:number[][]):{point:number[];missing:boolean}|null {
 const expected=new Set(a.map(key)),actual=new Set(b.map(key));
 const missing=a.find(v=>!actual.has(key(v)));if(missing)return{point:missing,missing:true};
 const extra=b.find(v=>!expected.has(key(v)));return extra?{point:extra,missing:false}:null;
}
const sign=(v:number)=>v<0?-1:v>0?1:0;
function branchData(points:number[][]){
 const vectors=points.slice(1).map(p=>p.map((v,i)=>v-points[0][i]));
 return{vectors,hand:sign(dot(vectors[0],cross(vectors[1],vectors[2]))),gram:vectors.map(a=>vectors.map(b=>dot(a,b)))};
}
/** Explain observed physical-rule differences without changing or repeating acceptance.
 * An accepted answer always wins, including externally accepted alternatives.
 * null also means unsupported source structure, not a new correctness result.
 */
export function explainSpaceAnswer(p:Puzzle,answer:any,status:SpaceAnswerStatus):Feedback|null {
 if(status.accepted||!SPACE_FEEDBACK_IDS.includes(p.id))return null;
 const d=p.data;if(!d)return null;
 const basePhase:Feedback['phase']=status.submitted===false?'editing':'invalid';
 const chosenByIndex=p.kind==='visual-choice'||['shape','cubes'].includes(d.optionType);
 const selectedIndex=chosenByIndex?answer:(p.options||[]).findIndex(v=>equal(v,answer));
 const reason=(rule:string,message:string,index=0,type:FeedbackTarget['type']='observation'):Feedback=>({
  code:'space-'+rule,message,phase:basePhase,
  targets:[...(Number.isInteger(selectedIndex)&&selectedIndex>=0?[{type:'card' as const,index:selectedIndex}]:[]),{type,index}]
 });
 if(answer===undefined||answer===null||Array.isArray(answer)&&!answer.length)return{code:'space-incomplete',message:'まだ答えを選んでいないよ。図を確かめて、カードを1つ選ぼう。',phase:'incomplete',targets:[{type:'constraint',index:0}]};
 if(Array.isArray(answer))return{code:'space-editing',message:'この問題はカードを1つ選ぶよ。図と照らして、選ぶカードを確かめよう。',phase:'editing',targets:[{type:'constraint',index:0}]};
 if(chosenByIndex&&(!Number.isInteger(answer)||answer<0||answer>=(p.options?.length||0)))return reason('choice-input','表示されている答えカードを1つ選ぼう。',0,'constraint');
 const value=chosenByIndex?p.options![answer]:answer;
 if(p.id==='cubes'){
  if(!Array.isArray(d.cubes)||typeof value!=='number')return null;
  if(value===d.cubes.length)return null;
  return reason('count',value<d.cubes.length?'選んだ数では積み木が足りないよ。上の積み木を支える、奥や下に隠れた積み木も柱ごとに数えよう。':'選んだ数は積み木より多いよ。同じ積み木を二度数えず、柱や段ごとに分けよう。');
 }
 if(p.id==='shadow'||p.id==='top'){
  const candidate=cells(value);if(!candidate||!Array.isArray(d.cubes))return null;
  const expected=project(d.cubes,p.id==='top'?'top':'front'),diff=mismatch(expected,normalize(candidate));if(!diff)return null;
  return reason('projection',`${p.id==='top'?'上':'前'}から見ると、同じ列の積み木は重なるよ。選んだ図の${diff.point[0]+1}列${diff.point[1]+1}行は、${diff.missing?'必要な影のマスが抜けている':'影にならない場所まで塗られている'}よ。`);
 }
 if(p.id==='rotate3d'){
  const candidate=cells(value);if(!candidate||!Array.isArray(d.cubes))return null;
  if(candidate.length!==d.cubes.length)return reason('rotation-volume','回しても積み木の個数は変わらないよ。候補の個数を元の立体と比べよう。');
  const sourceSignature=cubeSignature(d.cubes);if(cubeSignature(candidate)===sourceSignature)return null;
  const reflected=d.cubes.map(([x,y,z]:number[])=>[-x,y,z]);
  if(cubeSignature(candidate)===cubeSignature(reflected))return reason('rotation-reflection','この候補は鏡に映したつながりだよ。回すだけでは枝の左右の順番は裏返らないよ。');
  const actual=normalize(candidate),actualKeys=new Set(actual.map(key));
  const closest=cubeRotations(d.cubes).sort((a,b)=>b.filter(v=>actualKeys.has(key(v))).length-a.filter(v=>actualKeys.has(key(v))).length)[0],diff=mismatch(closest,actual)!;
  return reason('rotation-connection',`回しても面でつながる枝は変わらないよ。候補の横${diff.point[0]+1}・奥${diff.point[1]+1}・高さ${diff.point[2]+1}付近の出っ張りとつながりを見直そう。`);
 }
 if(p.id==='viewbuild'||p.id==='tunnelpass'){
  const candidate=cells(value);if(!candidate||!Array.isArray(d.views))return null;
  const actual=views(candidate);
  for(let axis=0;axis<d.views.length;axis++){
   const expected=normalize(d.views[axis]),diff=p.id==='tunnelpass'?actual[axis].find(v=>!expected.some(w=>equal(v,w))):mismatch(expected,actual[axis])?.point;
   if(diff)return reason('projection',p.id==='tunnelpass'?`${['前','右'][axis]}の穴には、横${diff[0]+1}・高さ${diff[1]+1}の出っ張りが通らないよ。もう一方の穴に通っても、両方を確かめよう。`:`${['前','右','上'][axis]}から見た図が合わないよ。横${diff[0]+1}・${axis===2?'奥':'高さ'}${diff[1]+1}の重なる列を確かめよう。`,axis);
  }return null;
 }
 if(p.id==='pack3d'){
  const candidate=cells(value);if(!candidate||!Array.isArray(d.hole))return null;
  const diff=mismatch(normalize(d.hole),normalize(candidate));if(!diff)return null;
  return reason('packing',`${diff.point[2]+1}段目の穴と候補を比べよう。横${diff.point[0]+1}・奥${diff.point[1]+1}で${diff.missing?'穴を埋める積み木が足りない':'穴の外へ積み木が出る'}よ。向きはそのままで重ねるよ。`);
 }
 if(p.id==='drop3d'){
  if(!Array.isArray(value?.values)||!Array.isArray(d.piece)||!Array.isArray(d.heights))return null;
  const result=dropPlacement(d.n,d.heights,d.piece),at=result.result.findIndex((v,i)=>value.values[i]!==v);if(at<0)return null;
  return reason('drop-support',`${Math.floor(at/d.n)+1}行${at%d.n+1}列の高さが合わないよ。最初に当たる高い柱がピース全体を支えるので、低い柱の上には隙間が残ることがあるよ。`,at,'cell');
 }
 if(p.id==='ropeends'){
  if(!Array.isArray(d.swaps)||typeof d.start!=='number')return null;
  let at=d.start,first=-1;d.swaps.forEach((s:number,i:number)=>{if(at===s){at++;if(first<0)first=i;}else if(at===s+1){at--;if(first<0)first=i;}});
  if(Number(value)===at+1)return null;
  let from=Number(value)-1;for(const swap of [...d.swaps].reverse()){if(from===swap)from++;else if(from===swap+1)from--;}
  return reason('rope-crossing',`選んだ出口${String(value)}の紐は入口${from+1}から始まり、印の入口${d.start+1}の紐とは違うよ。交差しても別の紐へ乗り換えず、同じ線を追おう。`,Math.max(0,first),'observation');
 }
 if(p.id==='contact3d'){
  if(!Array.isArray(d.cells)||!Array.isArray(d.target))return null;
  const count=contacts(d.cells,d.target);if(Number(value)===count)return null;
  return reason('contact',Number(value)>count?'辺や角だけで触れる積み木は数えないよ。赤い積み木の6つの面に接する相手だけを確かめよう。':'接する面を数え落としているよ。横と奥だけでなく、赤い積み木の上と下も確かめよう。');
 }
 if(p.id==='depthorder'){
  if(!Array.isArray(d.positions))return null;
  const n=findScene(d.scene,'spatialmap')?.n||d.positions.length,dir=d.observedDirection??d.dir;
  const order=(direction:number)=>d.positions.map((v:number[],i:number)=>({i,distance:[v[1],n-1-v[0],n-1-v[1],v[0]][direction]})).sort((a:any,b:any)=>a.distance-b.distance).map((x:any)=>x.i);
  const front=order(dir);
  if(d.sideRank!==undefined){
   const object=order((d.dir+1)%4)[d.sideRank-1],rank=front.indexOf(object)+1;if(Number(value)===rank)return null;
   return reason('depth-rank',`まず左から${d.sideRank}番目の塔を特定しよう。選んだ順位では、その塔より手前にある塔の個数と合わないよ。左からの順と手前からの順を分けて数えよう。`,object);
  }
  if(d.reasoningSteps===3)return null; // Older source omitted the side-rank rule.
  const object=typeof value==='string'?value.charCodeAt(0)-65:-1,rank=front.indexOf(object)+1;
  const relative=typeof d.prompt==='string'?d.prompt.match(/([A-Z])より\s*おくで/):null;
  if(relative){
   const reference=relative[1].charCodeAt(0)-65,referenceRank=front.indexOf(reference)+1;
   if(referenceRank<1||object<0)return null;
   if(object===front[referenceRank])return null;
   const relation=object===reference?`基準の${relative[1]}と同じ塔だよ。`:rank<referenceRank?`${relative[1]}より手前だよ。`:`${relative[1]}との間には${rank-referenceRank-1}個の塔があるよ。`;
   return reason('depth-relative',`選んだ${String(value)}は、${relation}${relative[1]}より奥にある塔だけを並べ、${relative[1]}のすぐ奥を選ぼう。`,object);
  }
  if(rank===d.rank)return null;
  return reason('depth-rank',`選んだ${String(value)}は、この向きから手前に${Math.max(0,rank-1)}個の塔があるよ。問題の${d.rank}番目という条件と、見る向きを照らし合わせよう。`,object>=0?object:0);
 }
 if(p.id==='voxelcoords'){
  if(!Array.isArray(d.target)||!Array.isArray(d.moves))return null;
  const expected=[...d.target];for(const move of d.moves)expected[move.axis]+=move.amount*(d.reverseTask?-1:1);
  const candidate=String(value).split(/[・, ]+/).map(Number),axis=expected.findIndex((v,i)=>candidate[i]!==v+1);if(axis<0)return null;
  return reason('coordinate-axis',`${axes[axis]}の番号が合わないよ。左上から1で数え、${d.reverseTask?'着いた位置から命令を逆向きに戻して':'命令にある軸だけを動かして'}、横・奥・高さの順に答えよう。`,axis,'constraint');
 }
 if(p.id==='surfacewalk'){
  if(!d.start||!Array.isArray(d.commands))return null;
  let state={...d.start},crossing:any=null;
  d.commands.forEach((cmd:string,i:number)=>{const from={...state};state=cmd==='F'?surfaceStep(state,d.n):{...state,heading:(state.heading+(cmd==='R'?1:3))%4};if(from.face!==state.face&&!crossing)crossing={i,from,state:{...state}};});
  if(Number(value)===state.face+1)return null;
  return reason('surface-heading',crossing?`${crossing.i+1}手目で辺を越えると、面だけでなく向きも変わり、新しい面では${directions[crossing.state.heading]}向きになるよ。その後の前進を新しい向きで追おう。`:'その場で曲がる命令と、前へ1マス進む命令を分けよう。最後の面まで位置と向きを一緒に追おう。',crossing?.i??0,'command');
 }
 if(p.id==='balancefoot'){
  if(!Array.isArray(d.heights))return null;
  const heights=[...d.heights];if(d.move){heights[d.move.from]--;heights[d.move.to]++;}if(d.swap)[heights[d.swap.from],heights[d.swap.to]]=[heights[d.swap.to],heights[d.swap.from]];
  const total=heights.reduce((s,v)=>s+v,0);if(!total)return null;
  const center=heights.reduce((s,v,i)=>s+v*(i+.5),0)/total;if(Number(value)===Math.floor(center)+1)return null;
  return reason('balance-range',`重さの中心は、選んだ${String(value)}番の範囲より${center<Number(value)-1?'左':'右'}にあるよ。${d.move||d.swap?'移動・交換した後の柱で':'柱の積み木の個数と、左右への距離で'}重さを比べよう。番号は点ではなく幅のある範囲だよ。`);
 }
 if(p.id==='hinge3d'){
  if(!Array.isArray(value?.points)||!Array.isArray(d.points)||!Array.isArray(d.turns))return null;
  let expected=d.points.map((v:number[])=>[...v]);for(const turn of d.turns)expected=applyHingeTurn(expected,turn);
  const at=expected.findIndex((v:number[],i:number)=>!equal(v,value.points[i]));if(at<0)return null;
  const turn=d.turns.find((t:any)=>at>t.pivot)||d.turns[0];
  return reason('hinge-pivot',at<=turn.pivot?`${at===0?'根元':`関節${at}`}は指定関節より手前なので動かないよ。関節と手前を固定し、先の点だけをまとめて回そう。`:`点${at}の位置が指定回転と合わないよ。関節${turn.pivot}から先を、${axes[turn.axis]}軸の${turn.q===1?'＋90':'−90'}度で順に回そう。`,at,'observation');
 }
 if(p.id==='handedness'){
  if(!Array.isArray(value?.points)||!Array.isArray(d.points)||value.points.length!==4)return null;
  if(d.exactReflection){
   const expected=d.points.map((v:number[])=>v.map((x,i)=>i===d.reflectionAxis?-x:x)),at=expected.findIndex((v:number[],i:number)=>!equal(v,value.points[i]));if(at<0)return null;
   return reason('hand-reflection',`枝${at}の反転が合わないよ。${axes[d.reflectionAxis]}の向きだけを逆にし、ほかの2軸の位置は保とう。`,at);
  }
  const source=branchData(d.points),candidate=branchData(value.points);if(!equal(source.gram,candidate.gram))return reason('hand-length','色で区別した枝の長さや枝どうしの角度が変わっているよ。回転・鏡写しでも長さと角度は保つよ。');
  const wanted=d.matchTask?source.hand:-source.hand;if(candidate.hand===wanted)return null;
  return reason('hand-order',d.matchTask?'候補では3色の枝の向きの順番が裏返っているよ。回すだけでは右手と左手の関係は変わらないよ。':'候補は元の3色の枝と同じ向きの順番だよ。鏡写しでは枝の並びの右手・左手が逆になるよ。');
 }
 if(p.id==='gears'){
  if(!Array.isArray(d.links)||typeof d.start!=='number')return null;
  const transmit=(links:string[],start:number)=>links.reduce((s,t)=>t==='belt'?s:1-s,start);
  if(d.missingLink!==undefined){
   const links=[...d.links];links[d.missingLink]=String(value).includes('まっすぐ')?'belt':'crossed';
   if(transmit(links,d.start)===d.end)return null;
   return reason('gears-link','選んだベルトで回転を伝えると、図の最後の向きに合わないよ。まっすぐは同じ向き、クロスは反対向きになるよ。',d.missingLink,'edge');
  }
  const rotation=value==='↻'?1:0,actual=d.unknown==='start'?transmit(d.links,rotation):transmit(d.links,d.start),wanted=d.unknown==='start'?d.end:rotation;
  if(actual===wanted)return null;
  const at=d.links.findIndex((v:string)=>v!=='belt');
  return reason('gears-direction','かみ合う歯車とクロスベルトでは向きが反対、まっすぐベルトでは同じだよ。選んだ向きから伝えると条件に合わないので、接続を1つずつたどろう。',Math.max(0,at),'edge');
 }
 if(p.id==='gravitytray'){
  if(!Array.isArray(value?.values)||!Array.isArray(d.balls)||!Array.isArray(d.moves))return null;
  let balls=[...d.balls],stops:any[]=[];for(const dir of d.moves){const t=tiltTrace(balls,d.n,d.walls,dir);balls=t.balls;stops=t.steps;}
  const actual=value.values.flatMap((v:any,i:number)=>v==='●'?[i]:[]),bad=balls.find(at=>!actual.includes(at))??actual.find((at:number)=>!balls.includes(at));if(bad===undefined)return null;
  const stop=stops.find(s=>s.to===bad)||stops[0],cause=stop?.reason==='ball'?'先に止まった玉':stop?.reason==='wall'?'壁':'盤の端';
  return reason('ball-stop',`${Math.floor(bad/d.n)+1}行${bad%d.n+1}列の玉の位置が合わないよ。進む先の玉から止め、${cause}の手前で止まることを確かめよう。`,bad,'cell');
 }
 if(p.id==='viewpoint'){
  const source=findScene(d.scene,'viewpoint');if(!source||!Array.isArray(d.positions)||!Array.isArray(d.heights))return null;
  const dir=String(value).charCodeAt(0)-65;if(dir<0||dir>3)return null;
  if(source.silhouette){
   const profile=Array.from({length:source.n},(_,at)=>{const axis=dir%2===0?0:1,index=dir<2?source.n-1-at:at;return Math.max(0,...d.positions.map((v:number[],i:number)=>v[axis]===index?d.heights[i]:0));}),at=profile.findIndex((v,i)=>v!==source.photo[i].height);if(at<0)return null;
   return reason('view-overlap',`カメラ${String(value)}では写真の${at+1}列目の高さが合わないよ。同じ列の塔は重なり、いちばん高い塔が影に残るよ。`,at);
  }
  const order=d.positions.map((_:number[],i:number)=>i).sort((a:number,b:number)=>dir===0?d.positions[b][0]-d.positions[a][0]:dir===1?d.positions[b][1]-d.positions[a][1]:dir===2?d.positions[a][0]-d.positions[b][0]:d.positions[a][1]-d.positions[b][1]),at=order.findIndex((v:number,i:number)=>String.fromCharCode(65+v)!==source.photo[i].label);if(at<0)return null;
  return reason('view-order',`カメラ${String(value)}からの写真では、${at+1}番目の塔の並びが違うよ。見る側が変わると写真の左右も変わるので、塔の文字を順に照合しよう。`,at);
 }
 if(p.id==='nets'){
  if(!Array.isArray(d.cells)||!Array.isArray(d.labels))return null;
  const normals=foldNet(d.cells);if(!normals)return null;
  const at=d.labels.indexOf(value);if(at<0)return null;
  if(d.moves){
   if(!Array.isArray(d.initial))return null;
   const end=rollTrace(d.initial,d.moves).end;if(Number(value)===end[0])return null;
   return reason('face-roll','選んだ面は、指定の順に転がした後の上面と合わないよ。上だけでなく前・奥・左右の面も保ち、矢印ごとに面を入れ替えよう。',d.moves.length-1,'command');
  }
  if(d.pose){
   const top=normals[d.labels.indexOf(d.pose.top)],front=normals[d.labels.indexOf(d.pose.front)],right=cross(top,front),wanted=d.side==='left'?right.map(v=>-v):right;
   if(equal(normals[at],wanted))return null;
   return reason('face-side',`上を${d.pose.top}、前を${d.pose.front}に合わせると、選んだ面は指定の${d.side==='left'?'左':'右'}にないよ。上と前を固定して、横の面の向きを確かめよう。`,at);
  }
  const target=normals[d.labels.indexOf(d.target)],normal=normals[at];if(equal(normal,target.map(v=>-v)))return null;
  return reason('face-opposite',`選んだ面は${d.target}の${dot(target,normal)===0?'隣':'同じ向き'}にあるよ。展開図を折り、向かい合う面の向きを確かめよう。`,at);
 }
 if(p.id==='slice'){
  if(!Array.isArray(d.normal)||typeof d.d!=='number')return null;
  const polygon=cutCube(d.normal,d.d);if(Number(value)===polygon.length)return null;
  return reason('cut-boundary',Number(value)<polygon.length?'選んだ角の数では、切る面が辺と交わる角を数え落としているよ。印の3点だけでなく、裏側を通る辺もつないで輪を確かめよう。':'選んだ角の数は、切る面が辺と交わる角より多いよ。同じ交点を二度数えず、切り口を1周して角を確かめよう。');
 }
 return null;
}
