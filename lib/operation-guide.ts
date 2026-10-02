/** First-use operation instructions derived only from the visible puzzle board. */
import type {Puzzle} from './engine/shared.ts';
export type OperationGuideData={title:string;instructions:string[];goal:string;completion?:{columns:number;cells:(number|string)[]}};
export const OPERATION_GUIDE_IDS=['stroke','slide','equalparts','jigsaw','separator','parallel','triangulate','square'] as const;

/** Explain controls, board labels and the completion rule without changing inputs. */
export function operationGuide(p:Pick<Puzzle,'id'|'data'>):OperationGuideData|null{
 const d=p.data,title='このばんの あそびかた';
 if(p.id==='stroke')return{title,instructions:[
  `開始印（${Math.floor(d.start/d.n)+1}行・${d.start%d.n+1}列）の丸から、隣の丸をタッチするか、なぞろう。`,
  '上下左右の丸へ進む。ななめには進めず、同じ丸は一度だけ通るよ。',
  '直前の丸をタッチすると一つ前に戻る。「もどす」「やりなおす」も使えるよ。',
 ],goal:`開始の丸も含め、${d.allowed.length}この丸を全部、一度ずつつなぐ。`};
 if(p.id==='slide'){
  const numbers=(d.initial as number[]).filter(v=>v!==0).sort((a,b)=>a-b);
  return{title,instructions:[
   `数字 ${numbers[0]}〜${numbers.at(-1)}はタイル。数字のないマスが「あき」だよ。`,
   'あきマスの上下左右に隣り合うタイルをタップして、あきマスへ動かそう。ななめや遠いタイルは動かない。',
   '下の完成図のように、上の段から小さい順へ。移動回数の制限はないよ。',
  ],goal:'数字を上から横に順番に並べ、右下をあきマスにする。',completion:{columns:d.n,cells:[...numbers,'あき']}};
 }
 if(p.id==='equalparts')return{title,instructions:[
  `上の 1〜${d.k}は庭を選ぶ番号。⌂の数字は、その庭の家の番号だよ。`,
  '庭の番号を選び、家以外のマスをタップして塗る。塗ったマスも選び直せる。家は固定だよ。',
  `各庭を ${d.n*d.rows/d.k}マスずつにする。庭の中を縦横の辺でつなぎ、角だけのつながりにはしない。`,
 ],goal:`全部の ${d.n*d.rows}マスを塗り、${d.k}この庭を同じ広さに。各庭に家が一つ入るようにする。`};
 if(p.id==='jigsaw'){
  const joining=(d.tiles as number[][]).flat().map(Math.abs).filter(v=>v>0).sort((a,b)=>a-b)[0];
  return{title,instructions:[
   `中心の番号 1〜${d.tiles.length}はピースの名前。辺の数字は、隣とつなぐ条件だよ。`,
   '下のピースを選び、置くマスをタップする。選んだピースは「まわす」で90°ずつ回せるよ。',
   `外側の辺は0。内側は同じ数の＋と−を合わせる${joining===undefined?'。':`（例えば ＋${joining}と−${joining}）。`}`,
  ],goal:`${d.tiles.length}枚のピースを一回ずつ使い、${d.n}×${d.n}の枠を全部埋める。`};
 }
 if(p.id==='separator')return{title,instructions:[
  `外側の数字 1〜${d.anchors.length}は、線の端にする点の番号。計算する数ではないよ。`,
  '違う二つの外側の点を選ぶと一本の線になる。選んだ点をもう一度タップすると解除できる。',
  '中の●と★を別々の側に分ける。線が中のどの点にも触れないようにしよう。',
 ],goal:`● ${d.groups.filter((v:number)=>v===0).length}こ と ★ ${d.groups.filter((v:number)=>v===1).length}こを、一本の線の両側へ分ける。`};
 if(p.id==='parallel')return{title,instructions:[
  `番号 1〜${d.cards.length}は線の名前。番号の大小や順番を答える問題ではないよ。`,
  'おてほんと同じ方向の線を全部タップする。選んだ線をもう一度タップすると解除できる。',
  '長さや位置が違っても、同じ傾きなら平行。選び終わったら「できた」を押そう。',
 ],goal:'おてほんと平行な線を、もれなく全部選ぶ。'};
 if(p.id==='triangulate')return{title,instructions:[
  `数字 1〜${d.n}は角の名前。二つの角を順にタップすると対角線を引ける。同じ両端をもう一度選ぶと線を消せるよ。`,
  `外周の辺と、禁止の点線 ${d.banned.length}本には線を引かない。`,
  '対角線どうしを交差させずに分ける。線が同じ角でつながるのは大丈夫だよ。',
 ],goal:`対角線 ${d.n-3}本で、中の部屋を全部三角形にする。`};
 if(p.id==='square')return{title,instructions:[
  '正方形になる4点をタップして選ぼう。選んだ点をもう一度タップすると解除できる。',
  '4点を選ぶと判定される。「もどす」で選び直すこともできるよ。',
 ],goal:'4つの辺の長さが同じで、角が全部直角になる4点を選ぶ。'};
 return null;
}
