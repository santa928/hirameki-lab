/** Pure intermediate geometry for the nine plane choice teaching recipes. */
import {equal,normalize,rotate,type Puzzle,type Scene} from '../engine/shared.ts';

type Cell=number[];
export type TeachingEdge={from:Cell;to:Cell};
export type TeachingPanel={label:string;cells?:Cell[];markedCells?:Cell[];edges?:TeachingEdge[];points?:Cell[];candidate?:Cell;distances?:number[]};
export type PlaneTeachingScene=Scene&{
 type:'teaching-plane';mode:'cells'|'angles'|'distances';
 bounds:{minX:number;minY:number;maxX:number;maxY:number};panels:TeachingPanel[];
 formula?:string;result?:number|string|Cell[];axis?:{x:number};pivot?:Cell;
 angles?:{parts:number[];total:number;missing:number;knownIndices:number[];revealMissing:boolean};
};
export type PlaneTeachingStep={scene:PlaneTeachingScene;caption:string;phase:'observe'|'transform'|'calculate'|'compare'};
const copyCells=(cells:Cell[]):Cell[]=>cells.map(c=>[...c]);
const cellKey=(c:Cell)=>c.join(',');
const uniqueCells=(cells:Cell[])=>[...new Map(cells.map(c=>[cellKey(c),[...c]])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);

/** Find every exposed unit edge, including the boundary of enclosed holes. */
function boundary(cells:Cell[]):TeachingEdge[]{
 const occupied=new Set(cells.map(cellKey)),edges:TeachingEdge[]=[];
 for(const [x,y] of cells){
  if(!occupied.has(cellKey([x,y-1])))edges.push({from:[x,y],to:[x+1,y]});
  if(!occupied.has(cellKey([x+1,y])))edges.push({from:[x+1,y],to:[x+1,y+1]});
  if(!occupied.has(cellKey([x,y+1])))edges.push({from:[x,y+1],to:[x+1,y+1]});
  if(!occupied.has(cellKey([x-1,y])))edges.push({from:[x,y],to:[x,y+1]});
 }
 return edges;
}

/** Rotate whole unit squares around one fixed corner, without re-centering steps. */
function quarterTurn(cells:Cell[]):Cell[]{return cells.map(([x,y])=>[-y-1,x]);}

/** Expand each source square into a kx-by-ky block in the same coordinate system. */
function expand(cells:Cell[],kx:number,ky:number):Cell[]{
 return cells.flatMap(([x,y])=>Array.from({length:kx*ky},(_,i)=>[x*kx+i%kx,y*ky+Math.floor(i/kx)]));
}

/** Derive teaching from source data and check its conclusion against the answer. */
export function planeTeaching(p:Puzzle):PlaneTeachingStep[]|null{
 if(!['rotate','mirror','fit','area','perimeter','translate','angles','circlecenter','scale'].includes(p.id))return null;
 const d=p.data,frames:PlaneTeachingStep[]=[];
 const shape:Cell[]=copyCells(d.shape??d.cells??d.scene?.cells??[]);
 const scene=(panels:TeachingPanel[],extra:Partial<PlaneTeachingScene>={}):PlaneTeachingScene=>({type:'teaching-plane',mode:'cells',bounds:{minX:0,minY:0,maxX:1,maxY:1},panels,...extra});
 const add=(view:PlaneTeachingScene,caption:string,phase:PlaneTeachingStep['phase'])=>frames.push({scene:structuredClone(view),caption,phase});
 const bounds=(cells:Cell[],padding=0)=>({minX:Math.min(0,...cells.map(c=>c[0]))-padding,minY:Math.min(0,...cells.map(c=>c[1]))-padding,maxX:Math.max(1,...cells.map(c=>c[0]+1))+padding,maxY:Math.max(1,...cells.map(c=>c[1]+1))+padding});
 let derived:number|string|Cell[];
 if(p.id==='rotate'){
  const options=p.options as Cell[][];
  const turns=[0,1,2,3].find(q=>options.some(opt=>equal(rotate(shape,q),normalize(opt))));
  if(turns===undefined)throw Error('No rotation matches a candidate');
  let current=copyCells(shape);const states=[current];for(let i=0;i<turns;i++){current=quarterTurn(current);states.push(current);}
  derived=rotate(shape,turns);
  const common=bounds([...states.flat(),...derived]),pivot=[0,0];
  add(scene([{label:'元の形',cells:shape}],{bounds:common,pivot}),'でっぱりと くぼみを見つけ、同じ点のまわりで まわそう。','observe');
  states.slice(1).forEach((cells,i)=>add(scene([{label:`${(i+1)*90}° 回した形`,cells}],{bounds:common,pivot}),`同じ点のまわりで ${i+1}回、90°ずつ まわす。形のつながりは同じ。`,'transform'));
  if(turns===0)add(scene([{label:'向きは同じ',cells:shape}],{bounds:common,pivot}),'向きはそのままで、同じ形を確かめる。','transform');
  add(scene([{label:'位置をそろえた 回転後の形',cells:derived}],{bounds:common,pivot,result:derived,formula:`90° × ${turns} = ${90*turns}°`}),`${turns}回まわした形。位置をそろえると、でっぱりと穴の場所も重なる。`,'compare');
 }else if(p.id==='mirror'){
  const reflected=shape.map(([x,y])=>[-x-1,y]),common=bounds([...shape,...reflected]),axis={x:0};
  add(scene([{label:'元の形',cells:shape}],{bounds:common,axis}),'線をかがみの軸にする。線から同じ距離の反対側へ写す。','observe');
  const marked=shape.slice(0,1),paired=reflected.slice(0,1);
  add(scene([{label:'元の1マス',cells:shape,markedCells:marked},{label:'軸から同じ距離',cells:paired,markedCells:paired}],{bounds:common,axis}),'1マスを写す。上下の位置は変わらず、左右が反対になる。','transform');
  derived=normalize(reflected);
  add(scene([{label:'元の形',cells:shape},{label:'全部を写した形',cells:reflected}],{bounds:common,axis,result:derived,formula:'(x, y) → (−x − 1, y)'}),'全部のマスを同じ線で写す。でっぱりも穴も左右が反対になる。','compare');
 }else if(p.id==='fit'){
  const parts=(d.parts as Cell[][]).map(copyCells),union=uniqueCells(parts.flat()),overlap=parts[0].filter(c=>parts[1].some(v=>equal(c,v))),common=bounds(union);
  add(scene(parts.map((cells,i)=>({label:`シート${i+1}（同じ原点）`,cells})),{bounds:common}),'左上の位置をそろえる。シートごとにマスの位置をずらさない。','observe');
  add(scene([{label:'重なったマスは1つ',cells:union,markedCells:overlap}],{bounds:common}),`重なった ${overlap.length}マスは、一つずつ数える。`,'calculate');
  derived=union;
  add(scene([{label:'どちらかに色があるマス',cells:union,markedCells:union}],{bounds:common,result:derived,formula:`${parts[0].length} + ${parts[1].length} − ${overlap.length} = ${union.length}マス`}),`どちらかのシートに色があれば塗る。両方が空のマスは、空のまま。`,'compare');
 }else if(p.id==='area'){
  const cells=uniqueCells(shape),common=bounds(cells),rows=[...new Set(cells.map(c=>c[1]))].sort((a,b)=>a-b);let marked:Cell[]=[],counts:number[]=[];
  add(scene([{label:'色のついた1マスが広さ1',cells}],{bounds:common}),'塗られたマスだけを数える。空のマスは数えない。','observe');
  for(const y of rows){const row=cells.filter(c=>c[1]===y);marked=[...marked,...row];counts=[...counts,row.length];add(scene([{label:`${y+1}行目まで数える`,cells,markedCells:marked}],{bounds:common,formula:`${counts.join(' + ')} = ${marked.length}`}),`この行は ${row.length}マス。ここまで ${marked.length}マス。`,'calculate');}
  derived=cells.length;
  const width=common.maxX-common.minX,height=common.maxY-common.minY,missing=width*height-derived;
  add(scene([{label:'数えた全部のマス',cells,markedCells:cells}],{bounds:common,result:derived,formula:missing?`${width} × ${height} − ${missing} = ${derived}`:`${counts.join(' + ')} = ${derived}`}),`広さは ${derived}。${missing?'大きな長方形から空のマスを引いても同じ。':'全部の塗られたマスを合わせた数。'}`,'compare');
 }else if(p.id==='perimeter'){
  const cells=uniqueCells(shape),edges=boundary(cells),common=bounds(cells);let counted:TeachingEdge[]=[];
  add(scene([{label:'マスの1辺が長さ1',cells}],{bounds:common}),'隣のマスとつながる辺は数えない。空に面した辺をたどる。','observe');
  const rows=[...new Set(cells.map(c=>c[1]))].sort((a,b)=>a-b);
  for(const y of rows){const rowEdges=boundary(cells.filter(c=>c[1]===y)).filter(e=>edges.some(v=>equal(v,e)));counted=[...counted,...rowEdges];add(scene([{label:'外側と穴側の露出辺',cells,edges:counted}],{bounds:common,formula:`ここまで ${counted.length}辺`}),`この行で ${rowEdges.length}辺を加える。穴に面した辺も含む。`,'calculate');}
  derived=edges.length;
  add(scene([{label:'数えた全部の露出辺',cells,edges}],{bounds:common,result:derived,formula:`${edges.length} × 1 = ${edges.length}`}),`周りの長さは ${edges.length}。外側も穴の周りも、露出した辺だけ数えた。`,'compare');
 }else if(p.id==='translate'){
  const moves=d.moves??d.scene.moves,n=d.scene.n,common={minX:0,minY:0,maxX:n,maxY:n};let current=copyCells(shape),dx=0,dy=0;
  add(scene([{label:'最初の位置',cells:current}],{bounds:common}),'盤面の左上を固定する。形の向きを変えず、矢印を一つずつたどる。','observe');
  moves.forEach((direction:number,i:number)=>{const x=[0,1,0,-1][direction],y=[-1,0,1,0][direction];dx+=x;dy+=y;current=current.map(([cx,cy])=>[cx+x,cy+y]);add(scene([{label:`${i+1}手目 ${['↑','→','↓','←'][direction]}`,cells:current}],{bounds:common,formula:`横 ${dx>=0?'+':''}${dx}、縦 ${dy>=0?'+':''}${dy}`}),`${i+1}本目の矢印 ${['↑','→','↓','←'][direction]}。全部のマスを同じ方向へ1マス動かす。`,'transform');});
  derived=current;
  add(scene([{label:'全部の矢印の後の位置',cells:current}],{bounds:common,result:derived,formula:`横 ${dx}、縦 ${dy}`}),`同じ形のまま、最初から横に ${dx}、縦に ${dy}動いた位置になる。`,'compare');
 }else if(p.id==='angles'){
  const parts:number[]=d.parts,total:number=d.total,missing:number=d.missing,known=parts.map((_,i)=>i).filter(i=>i!==missing),base={parts:[...parts],total,missing,knownIndices:[] as number[],revealMissing:false};let accumulated=0;
  add(scene([],{mode:'angles',angles:base}),`全部の角度は ${total}°。？以外の角度を合わせる。`,'observe');
  known.forEach((index,i)=>{accumulated+=parts[index];add(scene([],{mode:'angles',angles:{...base,knownIndices:known.slice(0,i+1)},formula:`${known.slice(0,i+1).map(j=>parts[j]).join(' + ')} = ${accumulated}°`}),`${index+1}番の角度 ${parts[index]}°を加える。わかる角度は合計 ${accumulated}°。`,'calculate');});
  derived=total-accumulated;
  add(scene([],{mode:'angles',angles:{...base,knownIndices:known,revealMissing:true},result:derived,formula:`${total} − (${known.map(i=>parts[i]).join(' + ')}) = ${derived}°`}),`全体 ${total}°から、わかる角度の合計 ${accumulated}°を引く。残りは ${derived}°。`,'compare');
 }else if(p.id==='circlecenter'){
  const points=copyCells(d.points),candidates=copyCells(d.candidates),common=bounds([...points,...candidates],1),distances=candidates.map(candidate=>points.map(point=>(point[0]-candidate[0])**2+(point[1]-candidate[1])**2)),matching=distances.map((ds,i)=>ds.every(v=>v===ds[0])?i:-1).filter(i=>i>=0);
  add(scene([{label:'円を通る3点',points}],{mode:'distances',bounds:common}),'中心の候補から、3点すべてまでの距離を比べる。距離の2乗が同じなら距離も同じ。','observe');
  candidates.forEach((candidate,i)=>add(scene([{label:`候補 ${String.fromCharCode(65+i)}`,points,candidate,distances:distances[i],edges:points.map(point=>({from:candidate,to:point}))}],{mode:'distances',bounds:common,formula:`距離²: ${distances[i].join('、')}`}),`候補 ${String.fromCharCode(65+i)}から3点までの距離²は ${distances[i].join('、')}。${matching.includes(i)?'全部同じ。':'同じではないので中心ではない。'}`,'calculate'));
  if(matching.length!==1)throw Error('Circle center must have one equal-distance candidate');
  const index=matching[0];derived=String.fromCharCode(65+index);
  add(scene([{label:`3点から同じ距離の ${derived}`,points,candidate:candidates[index],distances:distances[index],edges:points.map(point=>({from:candidates[index],to:point}))}],{mode:'distances',bounds:common,result:derived,formula:`${distances[index].join(' = ')}（距離²）`}),`${derived}だけが3点すべてから同じ距離にあるので、円の中心。`,'compare');
 }else{
  const factor:number=d.factor,expanded=expand(shape,factor,factor),horizontal=expand(shape,factor,1),unequal=expand(shape,Math.max(1,factor-1),factor+1),common=bounds([...shape,...expanded,...horizontal,...unequal]);
  add(scene([{label:'元の形',cells:shape}],{bounds:common}),'1マスを、縦も横も同じ倍率で大きくする。','observe');
  add(scene([{label:`元の1マス → ${factor} × ${factor}マス`,cells:expand(shape.slice(0,1),factor,factor),markedCells:expand(shape.slice(0,1),factor,factor)}],{bounds:common,formula:`1マス → ${factor} × ${factor} = ${factor*factor}マス`}),`元の1マスを ${factor}×${factor}のまとまりにする。`,'transform');
  add(scene([{label:`全部を縦横 ${factor}ばい`,cells:expanded}],{bounds:common}),`全部のマスを同じように拡大。穴やくぼみの幅も ${factor}ばいになる。`,'transform');
  add(scene([{label:`横だけ ${factor}ばい（誤り）`,cells:horizontal},{label:`横 ${Math.max(1,factor-1)}・縦 ${factor+1}ばい（誤り）`,cells:unequal},{label:`正しい 縦横 ${factor}ばい`,cells:expanded}],{bounds:common}),'横だけ広げたり、縦と横を別の倍率にしたりすると、元の形と同じ比率にならない。','compare');
  derived=expanded;
  add(scene([{label:'同じ倍率で拡大した形',cells:expanded}],{bounds:common,result:derived,formula:`${shape.length} × ${factor} × ${factor} = ${expanded.length}マス`}),`縦も横も ${factor}ばい。全部で ${expanded.length}マスになり、穴の位置と形も保たれる。`,'compare');
 }
 // The answer is used only after the complete calculation, never as an intermediate view.
 const expected=p.kind==='choice'?(d.optionType==='shape'?p.options?.[p.solution]:p.solution):p.options?.[p.solution];
 const actual=Array.isArray(derived)&&['rotate','mirror','fit'].includes(p.id)?normalize(derived):derived;
 const answer=Array.isArray(expected)?normalize(expected):expected?.type==='shape'?expected.cells:expected;
 if(!equal(actual,answer))throw Error(`Teaching conclusion disagrees with ${p.id} answer`);
 return frames;
}
