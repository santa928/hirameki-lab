/** Answer diagnostics derived from the current planar geometry, never a new judge. */
import type {Feedback,FeedbackTarget} from '../feedback.ts';
import {equal,normalize,rotate,perimeter,connected,type Puzzle} from '../engine/shared.ts';
import {cross,pointInside,hullIndices,tileEdges} from '../engine/plane.ts';
export const PLANE_FEEDBACK_IDS=['rotate','mirror','fit','scale','translate','area','perimeter','square','angles','circlecenter','triangulate','inside','jigsaw','separator','hull','parallel','coinparking','equalparts','mapcolor'] as const;
type Options={accepted:boolean;submitted?:boolean};
const cellsKey=(cells:number[][])=>JSON.stringify(normalize(cells));
const distance2=(a:number[],b:number[])=>(a[0]-b[0])**2+(a[1]-b[1])**2;
const target=(type:FeedbackTarget['type'],index:number):FeedbackTarget=>({type,index});
const uniqueCells=(cells:number[][])=>[...new Map(cells.map(c=>[c.join(','),c])).values()];
const positive:Record<string,string>={
 rotate:'でっぱりと穴を含め、回すと元の形に重なる形を選べたよ。',mirror:'同じ線から同じ距離へ写した、左右が反対の形を選べたよ。',fit:'同じ位置でシートを合わせ、重なりを一度だけ数えた形だよ。',scale:'縦も横も同じ倍率で、穴やくぼみまで大きくした形だよ。',translate:'全部の矢印をたどり、向きを変えずに最後の位置へ動かせたよ。',area:'空のマスを除き、色のついたマスの広さを数えられたよ。',perimeter:'隣のマスとの接合辺を除き、外側も穴側も数えられたよ。',square:'4つの辺が同じ長さで、対角線も同じ長さの正方形だよ。',angles:'全体の角度から、わかる角度の合計を引いた残りだよ。',circlecenter:'3つの点すべてから同じ距離になる中心を選べたよ。',triangulate:'辺を避け、線を交差させず、全部の部屋を三角形にできたよ。',inside:'囲いの内側にある点を、へこみも確かめて選べたよ。',jigsaw:'外側は0、接合辺は同じ数の＋と−が合っているよ。',separator:'線上に点がなく、二つの種類が別々の側に分かれたよ。',hull:'内側や辺の途中の点を除き、全部を囲む角を選べたよ。',parallel:'長さや位置が違っても、縦横の進み方が同じ方向の線だよ。',coinparking:'円が箱から出ず、円どうしが重ならずに置けたよ。触れるのは大丈夫。',equalparts:'各庭が同じ広さでつながり、家が一つずつ入っているよ。',mapcolor:'すべての地域を塗り、辺で接する地域は違う色になっているよ。',
};

/** Explain concrete local violations while respecting authoritative acceptance.
 * null also means that all locally checked conditions pass: an accepted=false
 * context alone cannot justify inventing a negative diagnosis or a new verdict.
 */
export function explainPlaneAnswer(p:Puzzle,answer:any,options:Options):Feedback|null{
 const id=p.id,d=p.data;if(!(PLANE_FEEDBACK_IDS as readonly string[]).includes(id))return null;
 const feedback=(code:string,message:string,targets:FeedbackTarget[]=[],phase:Feedback['phase']=options.submitted?'invalid':'editing'):Feedback=>({code:`plane.${id}.${code}`,message,targets,phase});
 if(options.accepted)return feedback('correct',positive[id],[],'correct');
 const incomplete=(message:string,targets:FeedbackTarget[]=[])=>feedback('incomplete',message,targets,'incomplete');
 if(answer===null||answer===undefined||Array.isArray(answer)&&answer.length===0)return incomplete('まだ答案がないよ。図と条件を確かめ、選ぶ場所から始めよう。');
 if(['rotate','mirror','fit','scale','translate','area','perimeter','angles','circlecenter'].includes(id)){
  const indexed=p.kind==='visual-choice'||d.optionType==='shape';
  if(indexed&&(!Number.isInteger(answer)||answer<0||answer>=(p.options?.length??0)))return feedback('selection','選んだカードが見つからないよ。表示された候補から選び直そう。');
  const selected=indexed?p.options![answer]:answer,card=indexed?[target('card',answer)]:[target('constraint',0)];
  if(['rotate','mirror','fit','scale','translate'].includes(id)){
   const chosen:number[][]=Array.isArray(selected)?selected:selected?.cells;
   if(!Array.isArray(chosen)||chosen.some(v=>!Array.isArray(v)||v.length!==2||v.some(x=>!Number.isFinite(x))))return feedback('selection','形のカードを選ぼう。マスの位置を比べるよ。',card);
   const source:number[][]=d.shape??d.cells??d.scene?.cells??[];
   if(id==='rotate'){
    if([0,1,2,3].some(q=>cellsKey(rotate(source,q))===cellsKey(chosen)))return null;
    const reflected=normalize(source.map(([x,y])=>[-x,y]));
    return feedback(cellsKey(reflected)===cellsKey(chosen)?'reflection':'features',cellsKey(reflected)===cellsKey(chosen)?'この形は左右を反転した形。回転では左右のつながりは反対にならないよ。':'元の形を90°ずつ回しても重ならない。でっぱりと穴の位置を比べよう。',card);
   }
   if(id==='mirror'){
    const reflected=normalize(source.map(([x,y])=>[-x,y]));
    const got=normalize(chosen),missing=reflected.filter(c=>!got.some(v=>equal(c,v)));
    if(cellsKey(reflected)===cellsKey(chosen))return null;
    return feedback('reflection',`同じ線から同じ距離で左右を写すと ${reflected.length}マス。選んだ形は写した位置の ${missing.length}マスが合わないよ。上下を変えず、でっぱりも反対側になるか比べよう。`,card);
   }
   if(id==='fit'){
    const union=normalize(uniqueCells((d.parts as number[][][]).flat())),got=normalize(chosen),missing=union.filter(c=>!got.some(v=>equal(c,v))),extra=got.filter(c=>!union.some(v=>equal(c,v)));
    if(!missing.length&&!extra.length)return null;
    return feedback(missing.length?'missing-cells':'extra-cells',`同じ位置でシートを重ねると ${union.length}マス。選んだ形には${missing.length?`足りないマスが ${missing.length}こ`:`余分なマスが ${extra.length}こ`}あるよ。重なりは1マスとして数えよう。`,card);
   }
   if(id==='scale'){
    const factor:number=d.factor,expanded=source.flatMap(([x,y])=>Array.from({length:factor*factor},(_,i)=>[x*factor+i%factor,y*factor+Math.floor(i/factor)]));
    const width=(cells:number[][])=>Math.max(...cells.map(c=>c[0]))-Math.min(...cells.map(c=>c[0]))+1,height=(cells:number[][])=>Math.max(...cells.map(c=>c[1]))-Math.min(...cells.map(c=>c[1]))+1;
    const wrongSize=width(chosen)!==width(source)*factor||height(chosen)!==height(source)*factor;
    const missing=expanded.filter(c=>!chosen.some(v=>equal(c,v))).length,extra=chosen.filter(c=>!expanded.some(v=>equal(c,v))).length;
    if(!wrongSize&&!missing&&!extra)return null;
    return feedback(wrongSize?'multiplier':'features',wrongSize?`元の1マスは ${factor}×${factor}マスになるよ。選んだ形は幅 ${width(chosen)}・高さ ${height(chosen)}。縦も横も ${factor}ばいか確かめよう。`:`縦横の大きさは合うけれど、足りない位置が ${missing}マス、余分な位置が ${extra}マス。${expanded.length}マスに拡大した穴・くぼみの位置を比べよう。`,card);
   }
   let current=source.map(c=>[...c]);let dx=0,dy=0;for(const move of d.moves??d.scene.moves){const x=[0,1,0,-1][move],y=[-1,0,1,0][move];dx+=x;dy+=y;current=current.map(([cx,cy])=>[cx+x,cy+y]);}
   if(current.length===chosen.length&&current.every(c=>chosen.some(v=>equal(c,v))))return null;
   const sameShape=cellsKey(current)===cellsKey(chosen);
   return feedback(sameShape?'position':'shape',sameShape?`形の向きは同じだね。全部の矢印では横 ${dx}・縦 ${dy}動く。最初の位置から同じ盤面で数え直そう。`:'移動は位置だけを変えるよ。選んだ形は元のマスのつながりや向きが変わっている。',card);
  }
  if(id==='area')return selected===uniqueCells(d.shape).length?null:feedback('count',`色のついたマスは ${uniqueCells(d.shape).length}こ。選んだ ${selected}には空のマスを数えていないか、行ごとに確かめよう。`,card);
  if(id==='perimeter')return selected===perimeter(d.cells)?null:feedback('boundary',`露出した辺は ${perimeter(d.cells)}本。選んだ ${selected}と比べよう。隣どうしの辺は除き、穴の周りは足すよ。`,card);
  if(id==='angles'){const known=(d.parts as number[]).filter((_,i)=>i!==d.missing),sum=known.reduce((a,b)=>a+b,0);return selected===d.total-sum?null:feedback('remainder',`わかる角度は ${known.join(' + ')} = ${sum}°。全体 ${d.total}° − ${sum}° = ${d.total-sum}°。選んだ ${selected}°と比べよう。`,card);}
  const index=typeof selected==='string'?selected.charCodeAt(0)-65:-1,candidate=d.candidates[index];
  if(!candidate)return feedback('selection','中心の候補を選び直そう。候補の記号と点の位置を合わせて見よう。',card);
  const ds=(d.points as number[][]).map(point=>distance2(point,candidate));
  if(ds.every(v=>v===ds[0]))return null;
  return feedback('distances',`候補 ${selected}から3点への距離の2乗は ${ds.join('、')}。3つ全部が同じでないと円の中心にならないよ。`,[...card,target('observation',index)]);
 }
 if(id==='jigsaw'){
  if(!answer||!Array.isArray(answer.slots)||!Array.isArray(answer.turns))return incomplete('ピースを置いて、外側の0と隣どうしの辺を確かめよう。');
  const slots:number[]=answer.slots,turns:number[]=answer.turns;
  const invalid=slots.findIndex(i=>i!==-1&&(!Number.isInteger(i)||!d.tiles[i]));if(invalid>=0)return feedback('piece','使えるピースを盤面に置き直そう。',[target('cell',invalid)]);
  const duplicate=slots.findIndex((v,i)=>v>=0&&slots.indexOf(v)!==i);if(duplicate>=0)return feedback('duplicate','同じピースを二度置いているよ。各ピースは一枚ずつ使おう。',[target('piece',slots[duplicate]),target('cell',duplicate)]);
  if(turns.length!==d.tiles.length||turns.some(q=>!Number.isInteger(q)||q<0||q>3))return feedback('turn','ピースの回転は0〜3回。回転した向きを確かめよう。');
  const tiles=slots.map(i=>i<0?null:tileEdges(d.tiles[i],turns[i]));
  for(let i=0;i<tiles.length;i++){const e=tiles[i];if(!e)continue;const outer=[i<d.n,i%d.n===d.n-1,i>=d.n*(d.n-1),i%d.n===0];for(let edge=0;edge<4;edge++)if(outer[edge]&&e[edge]!==0)return feedback('border',`${i+1}番のマスの外側に ${e[edge]}があるよ。外周へ向ける辺は0だよ。`,[target('cell',i),target('piece',slots[i]),target('edge',i*4+edge)]);
   for(const [neighbor,edge,other] of [[i%d.n<d.n-1?i+1:-1,1,3],[i+d.n<d.n*d.n?i+d.n:-1,2,0]])if(neighbor>=0&&tiles[neighbor]&&e[edge]+tiles[neighbor]![other]!==0)return feedback('joint',`${i+1}番と${neighbor+1}番の接合は ${e[edge]}と${tiles[neighbor]![other]}。同じ数の＋と−を合わせよう。`,[target('cell',i),target('cell',neighbor),target('edge',i*4+edge)]);
  }
  const empty=slots.findIndex(v=>v<0);if(empty>=0||slots.length!==d.n*d.n)return incomplete('まだ空のマスがあるよ。各ピースを一枚ずつ置こう。',empty>=0?[target('cell',empty)]:[]);
  return null;
 }
 if(!Array.isArray(answer))return incomplete('選ぶ場所を一つずつ確かめよう。まだ答案ができていないよ。');
 const a:number[]=answer;
 if(id==='triangulate'){
  const chords:number[][]=answer,valid:number[][]=[];
  for(let i=0;i<chords.length;i++){const e=chords[i];if(!Array.isArray(e)||e.length!==2||e.some(v=>!Number.isInteger(v)||v<0||v>=d.n)||e[0]===e[1])return feedback('vertices','線の両端に違う二つの角を選ぼう。',[target('edge',i)]);const [u,v]=[...e].sort((x,y)=>x-y);if(v-u===1||u===0&&v===d.n-1)return feedback('side','この線は多角形の元の辺だよ。部屋を分ける対角線を引こう。',[target('edge',i)]);if(d.banned.some((b:number[])=>equal([...b].sort((x,y)=>x-y),[u,v])))return feedback('banned','この対角線は禁止の線だよ。別の角の組を選ぼう。',[target('edge',i)]);if(valid.some(previous=>equal(previous,[u,v])))return feedback('duplicate','同じ対角線を二度数えているよ。別の線を選ぼう。',[target('edge',i)]);valid.push([u,v]);}
  for(let i=0;i<valid.length;i++)for(let j=i+1;j<valid.length;j++){const [u,v]=valid[i],[w,z]=valid[j];if(u<w&&w<v&&v<z||w<u&&u<z&&z<v)return feedback('crossing',`${i+1}本目と${j+1}本目が交差しているよ。交差しない対角線で分けよう。`,[target('edge',i),target('edge',j)]);}
  if(chords.length===d.n-3)return null;
  return chords.length<d.n-3?incomplete(`全部を三角形にするには ${d.n-3}本。今は ${chords.length}本だよ。`):feedback('count',`全部を三角形にする線は ${d.n-3}本。今の ${chords.length}本を見直そう。`);
 }
 if(id==='mapcolor'){
  if(a.length!==d.k)return incomplete(`全部で ${d.k}地域あるよ。地域ごとに色を選ぼう。`);
  const invalid=a.findIndex(v=>!Number.isInteger(v)||v< -1||v>=(d.colors??4));if(invalid>=0)return feedback('color','表示された色から選ぼう。',[target('cell',invalid)]);
  const changed=a.findIndex((v,i)=>d.initial[i]>=0&&v!==d.initial[i]);if(changed>=0)return feedback('given','最初から塗られた地域の色は変えられないよ。',[target('cell',changed)]);
  const unpainted=a.findIndex(v=>v===-1),conflict=(d.edges as number[][]).find(([u,v])=>a[u]>=0&&a[v]>=0&&a[u]===a[v]);
  if(conflict)return feedback('neighbors',`${conflict[0]+1}番と${conflict[1]+1}番の地域が同じ色で、辺を共有しているよ。どちらかを別の色にしよう。`,conflict.map(i=>target('cell',i)),unpainted>=0?'editing':options.submitted?'invalid':'editing');
  if(unpainted>=0)return incomplete(`${unpainted+1}番の地域はまだ塗られていないよ。隣の塗られた色を見て選ぼう。`,[target('cell',unpainted)]);
  return null;
 }
 if(id==='equalparts'){
  if(a.length!==d.n*d.rows)return incomplete(`庭の盤面は ${d.n*d.rows}マス。すべてのマスを塗ろう。`);
  const invalid=a.findIndex(v=>!Number.isInteger(v)||v< -1||v>=d.k);if(invalid>=0)return feedback('garden','使える庭の色で塗ろう。',[target('cell',invalid)]);
  const unpainted=a.findIndex(v=>v===-1);
  if(unpainted>=0){
   const required=a.length/d.k;
   for(let garden=0;garden<d.k;garden++){
    const cells=a.map((v,i)=>v===garden?i:-1).filter(i=>i>=0);
    if(cells.length>required)return feedback('size',`${garden+1}番の庭はもう ${cells.length}マス。同じ広さは ${required}マスずつなので、塗り過ぎたマスを別の庭に塗り直そう。`,[target('constraint',garden),...cells.map(i=>target('cell',i))],'editing');
   }
   return incomplete(`${unpainted+1}番のマスがまだ塗られていないよ。`,[target('cell',unpainted)]);
  }
  for(let garden=0;garden<d.k;garden++){const cells=a.map((v,i)=>v===garden?i:-1).filter(i=>i>=0),required=a.length/d.k;if(cells.length!==required)return feedback('size',`${garden+1}番の庭は ${cells.length}マス。同じ広さにするには ${required}マスずつだよ。`,[target('constraint',garden),...cells.map(i=>target('cell',i))]);const homes=(d.homes as number[]).filter(i=>a[i]===garden);if(a[d.homes[garden]]!==garden){const requiredHome=d.homes[garden],otherHomes=homes.map(i=>`${d.homes.indexOf(i)+1}番の家`).join('・');return feedback('homes',`${garden+1}番の庭に必要な${garden+1}番の家は、今は${a[requiredHome]+1}番の庭にあるよ。${garden+1}番の庭には${otherHomes||'家がない'}${otherHomes?'が入っている':''}。家の番号と庭の色を合わせよう。`,[target('constraint',garden),...[...new Set([requiredHome,...homes])].map(i=>target('cell',i))]);}if(homes.length!==1)return feedback('homes',`${garden+1}番の庭に家が ${homes.length}こあるよ。各庭には、その庭の家を一つだけ入れよう。`,[target('constraint',garden),...homes.map(i=>target('cell',i))]);if(!connected(cells.map(i=>[i%d.n,Math.floor(i/d.n)])))return feedback('connection',`${garden+1}番の庭が離れているよ。角だけではつながらない。縦横の辺でつなごう。`,cells.map(i=>target('cell',i)));}
  return null;
 }
 const pool=id==='square'?d.dots:id==='separator'?d.anchors:id==='parallel'?d.cards:d.points;
 const max=id==='square'?d.n*d.n:pool?.length??0;
 const bad=a.findIndex(i=>!Number.isInteger(i)||i<0||i>=max||id==='square'&&!d.dots.includes(i));if(bad>=0)return feedback('selection','図にある場所を選ぼう。選んだ場所が図の外にあるよ。');
 const dup=a.findIndex((v,i)=>a.indexOf(v)!==i);if(dup>=0)return feedback('duplicate','同じ場所を二度選んでいるよ。一つずつ選ぼう。',[target(id==='parallel'?'card':'cell',a[dup])]);
 if(id==='square'){
  if(a.length<4)return incomplete(`正方形の角は4つ。今は ${a.length}点を選んでいるよ。`,a.map(i=>target('cell',i)));
  if(a.length!==4)return feedback('count','正方形の角を四つだけ選ぼう。',a.map(i=>target('cell',i)));
  const points=a.map(i=>[i%d.n,Math.floor(i/d.n)]),ds=points.flatMap((p,i)=>points.slice(i+1).map(q=>distance2(p,q))).sort((x,y)=>x-y),equalSides=ds[0]>0&&ds.slice(0,4).every(v=>v===ds[0]);
  if(equalSides&&ds[4]===ds[5]&&ds[4]===2*ds[0])return null;
  return feedback(equalSides?'diagonals':'sides',equalSides?`辺の距離²は ${ds[0]}。対角線の距離² ${ds[4]}・${ds[5]}も同じで、辺の2倍になるか確かめよう。`:`4つの辺候補の距離²は ${ds.slice(0,4).join('、')}。同じ長さの辺四つと直角を作ろう。`,a.map(i=>target('cell',i)));
 }
 if(id==='separator'){
  if(a.length<2)return incomplete('仕切り線の両端に、違う二つの外側の点を選ぼう。');if(a.length!==2)return feedback('count','一本の仕切りは、両端の二点だけ選ぼう。');
  const signs=(d.points as number[][]).map(point=>Math.sign(cross(d.anchors[a[0]],d.anchors[a[1]],point))),onLine=signs.findIndex(v=>v===0);if(onLine>=0)return feedback('line',`${onLine+1}番の点が仕切り線の上にあるよ。どの点にも触れない線を探そう。`,[target('cell',onLine),target('constraint',0)]);
  const wrong=signs.findIndex((s,i)=>s!==(d.groups[i]===d.groups[0]?signs[0]:-signs[0]));if(wrong<0)return null;return feedback('mixed',`${wrong+1}番の点が、同じ種類と同じ側になっていないよ。二種類を別々の側へ分けよう。`,wrong>=0?[target('cell',wrong),target('constraint',0)]:[target('constraint',0)]);
 }
 if(id==='coinparking'){
  for(const i of a){const [x,y]=d.points[i];if(x<d.radius||y<d.radius||x>d.n-d.radius||y>d.n-d.radius)return feedback('boundary',`${i+1}番の円は箱から出るよ。中心から壁まで、半径 ${d.radius}以上あけよう。`,[target('cell',i)]);}
  for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){const ds=distance2(d.points[a[i]],d.points[a[j]]),limit=4*d.radius**2;if(ds<limit)return feedback('overlap',`${a[i]+1}番と${a[j]+1}番の円が重なるよ。中心間の距離² ${ds}は、(2×${d.radius})² = ${limit}より小さい。等しければ触れるだけで大丈夫。`,[target('cell',a[i]),target('cell',a[j])]);}
  if(a.length===d.k)return null;
  return a.length<d.k?incomplete(`重ならない円を ${d.k}こ置こう。今は ${a.length}こ。`):feedback('count',`置く円は ${d.k}こ。今は ${a.length}こ選んでいるよ。`);
 }
 if(id==='inside'){
  const expected=(d.points as number[][]).map((point,i)=>pointInside(point,d.poly)?i:-1).filter(i=>i>=0),outside=a.find(i=>!expected.includes(i));if(outside!==undefined)return feedback('outside',`${outside+1}番の点は囲いの外側。へこみの空いている部分は内側ではないよ。`,[target('cell',outside)]);const missing=expected.find(i=>!a.includes(i));return missing!==undefined?incomplete(`${missing+1}番の点は囲いの内側にあるよ。内側の点を全部選ぼう。`,[target('cell',missing)]):null;
 }
 if(id==='hull'){
  const expected=hullIndices(d.points),extra=a.find(i=>!expected.includes(i));if(extra!==undefined)return feedback('interior',`${extra+1}番の点は内側か、辺の途中にあるよ。ゴムが曲がる外側の角だけ選ぼう。`,[target('cell',extra)]);const missing=expected.find(i=>!a.includes(i));return missing!==undefined?incomplete(`${missing+1}番の外側の角が足りないよ。全部の点を囲むように角をつなごう。`,[target('cell',missing)]):null;
 }
 const parallel=(i:number)=>d.cards[i].vector[0]*d.vector[1]===d.cards[i].vector[1]*d.vector[0],wrong=a.find(i=>!parallel(i));if(wrong!==undefined){const v=d.cards[wrong].vector;return feedback('direction',`${wrong+1}番は横 ${v[0]}・縦 ${v[1]}。お手本の横 ${d.vector[0]}・縦 ${d.vector[1]}と進む比が違うよ。長さと位置で決めないで比べよう。`,[target('card',wrong)]);}const missing=(d.cards as unknown[]).findIndex((_,i)=>parallel(i)&&!a.includes(i));return missing>=0?incomplete(`${missing+1}番もお手本と同じ方向だよ。平行な線を全部選ぼう。`,[target('card',missing)]):null;
}
