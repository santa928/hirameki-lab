import type {Puzzle} from '../engine/shared.ts';
import {adjacent,range} from '../engine/shared.ts';
import {runs,components,cardRule,connectedEdges} from '../engine/logic.ts';
import {orderRuleHolds,assignmentRuleHolds} from '../engine/logic-curriculum.ts';
import type {Feedback,FeedbackTarget} from '../feedback.ts';
export const LOGIC_FEEDBACK_IDS=['nonogram','minestars','binary','islands','tents','bridges','loopclues','mintree','order','schedule','domino','settriple','venn','odd','pattern','matrix','balance','liar','rulemachine','familytree','cipher','zebra','sudoku'] as const;
const scope:Record<string,[string[],FeedbackTarget['type'][]]>={
 nonogram:[['fixed cells','row/column runs'],['cell','constraint']],
 minestars:[['fixed cells','eight-neighbor star counts'],['cell']],
 binary:[['fixed cells','triplets','row/column balance','distinct lines','unassigned sentinel'],['cell','constraint']],
 islands:[['fixed cells','connected sea','2x2 sea','island clue count and size'],['cell','constraint']],
 tents:[['fixed cells','touching tents','row/column counts','one-to-one maximum matching'],['cell','constraint']],
 bridges:[['island bridge degree','connected graph'],['edge','constraint']],
 loopclues:[['cell edge count','vertex degree','nonempty and single connected loop'],['edge','cell']],
 mintree:[['connected graph','tree edge count','displayed minimum weight'],['edge','constraint']],
 order:[['precedence','adjacent/notAdjacent/gap/position/end/between','remaining cards'],['card','constraint']],
 schedule:[['precedence','remaining cards'],['card','constraint']],
 domino:[['start','neighbor joins','end','remaining cards'],['card']],
 settriple:[['selection count','shape/color/count all same or all distinct'],['card','constraint']],
 venn:[['Boolean card condition','extra and missing matching cards'],['card','constraint']],
 odd:[['original majority shape/direction','Boolean condition exception','selection count'],['cell','card','constraint']],
 pattern:[['curriculum symbol period and differing attribute'],['card','observation','constraint']],
 matrix:[['additive-cross and five forward/inverse row families'],['card','constraint']],
 balance:[['displayed linear weight equations with determined query'],['card','constraint']],
 liar:[['truth count under the selected person'],['card','constraint','observation']],
 rulemachine:[['shape/color/count forward/reverse shift composition'],['card','constraint','observation']],
 familytree:[['ancestor/common-ancestor/path-distance'],['card','constraint','observation']],
 cipher:[['forward/reverse composed tables at first differing position'],['card','constraint','observation']],
 zebra:[['allowed numbers','duplicates','sum/difference/before','unassigned people'],['card','constraint']],
 sudoku:[['fixed cells','row/column/bw blocks in 4x4 and 6x6','unassigned cells'],['cell']],
};
/** Machine-readable scope. Local-rule parity is not an alternative acceptance rule. */
export const LOGIC_FEEDBACK_COVERAGE:Record<string,{supported:string[];targets:FeedbackTarget['type'][];unsupported:string[]}>=Object.fromEntries(LOGIC_FEEDBACK_IDS.map(id=>[id,{
 supported:scope[id][0],targets:scope[id][1],
 unsupported:['unrecognized answer shape or missing required rule metadata','unknown rule families','accepted=false with no derived local violation',...(['pattern','matrix','balance'].includes(id)?['legacy choices without curriculum rule metadata']:[])],
}]));
const ids=new Set<string>(LOGIC_FEEDBACK_IDS);
const target=(type:FeedbackTarget['type'],index:number):FeedbackTarget=>({type,index});
const cell=(i:number)=>target('cell',i),card=(i:number)=>target('card',i),edge=(i:number)=>target('edge',i),constraint=(i:number)=>target('constraint',i),observation=(i:number)=>target('observation',i);
const sum=(a:number[])=>a.reduce((s,v)=>s+v,0);
const index=(v:any,n:number)=>Number.isInteger(v)&&v>=0&&v<n;
const equal=(a:any,b:any)=>JSON.stringify(a)===JSON.stringify(b);
const coord=(i:number,n:number)=>`${Math.floor(i/n)+1}ぎょう ${i%n+1}れつ`;
const letter=(i:number)=>String.fromCharCode(65+i);
const attrName:Record<string,string>={shape:'かたち',color:'いろ',count:'こすう'};
const neighbors8=(i:number,n:number)=>range(n*n).filter(j=>j!==i&&Math.abs(j%n-i%n)<=1&&Math.abs(Math.floor(j/n)-Math.floor(i/n))<=1);
const lines=(a:number[],n:number)=>[...range(n).map(y=>range(n).map(x=>y*n+x)),...range(n).map(x=>range(n).map(y=>y*n+x))];
const lineName=(i:number,n:number)=>i<n?`${i+1}ぎょうめ`:`${i-n+1}れつめ`;
function knownCardRule(r:any,depth=0):boolean{
 if(!r||depth>8)return false;
 if(r.op==='not')return knownCardRule(r.child,depth+1);
 if(r.op==='and'||r.op==='or')return knownCardRule(r.left,depth+1)&&knownCardRule(r.right,depth+1);
 return !r.op&&['shape','color','count'].includes(r.attr)&&Number.isInteger(r.value)&&(r.attr==='count'?r.value>=1&&r.value<=3:r.value>=0&&r.value<=2);
}
/** The same Boolean attribute vocabulary used by the rendered card condition. */
function ruleWords(r:any):string{
 if(r.op==='not')return `「${ruleWords(r.child)}」ではない`;
 if(r.op==='and'||r.op==='or')return `「${ruleWords(r.left)}」${r.op==='and'?'かつ':'または'}「${ruleWords(r.right)}」`;
 return r.attr==='shape'?`かたちが ${['○','△','□'][r.value]}`:r.attr==='color'?`いろが ${r.value+1}ばん`:`こすうが ${r.value}`;
}
/** Maximum matching, including Hall conflicts where every tree has a neighbor. */
function treeMatching(trees:number[],tents:number[],n:number):number{
 const owner=new Map<number,number>();
 function augment(tree:number,seen:Set<number>):boolean{
  for(const tent of tents)if(adjacent(tree,n).includes(tent)&&!seen.has(tent)){
   seen.add(tent);if(!owner.has(tent)||augment(owner.get(tent)!,seen)){owner.set(tent,tree);return true;}
  }return false;
 }
 trees.forEach(tree=>augment(tree,new Set()));return owner.size;
}
/** Solve only displayed weight equations; no stored solution or option index is used. */
function weightQuery(equations:string[]):number|null{
 const coefficients=(s:string)=>['○','△','□'].map(mark=>[...s].filter(v=>v===mark).length);
 const rows=equations.slice(0,-1).map(line=>{const[left,right]=line.split(/[＝=]/);return [...coefficients(left||''),Number(right?.trim())];});
 if(rows.some(r=>!Number.isFinite(r[3])))return null;
 let row=0;const pivots:number[]=[];
 for(let col=0;col<3;col++){
  const at=rows.findIndex((r,i)=>i>=row&&Math.abs(r[col])>1e-8);if(at<0)continue;
  [rows[row],rows[at]]=[rows[at],rows[row]];const scale=rows[row][col];rows[row]=rows[row].map(v=>v/scale);
  for(let i=0;i<rows.length;i++)if(i!==row){const k=rows[i][col];rows[i]=rows[i].map((v,j)=>v-k*rows[row][j]);}
  pivots.push(col);row++;
 }
 const query=coefficients(equations.at(-1)?.split(/[＝=]/)[0]||'');
 if(rows.some(r=>r.slice(0,3).every(v=>Math.abs(v)<1e-8)&&Math.abs(r[3])>1e-8))return null;
 let value=0;
 pivots.forEach((col,i)=>{const scale=query[col];value+=scale*rows[i][3];for(let j=0;j<3;j++)query[j]-=scale*rows[i][j];});
 return query.some(v=>Math.abs(v)>1e-8)?null:value;
}

/**
 * Explain a current answer using public domain constraints, without deciding correctness.
 * accepted is authoritative: true always returns null, including accepted alternative answers.
 * Null on a false answer means unsupported or no local explanation, never "correct".
 * Inputs, options, solution, RNG and records are neither changed nor consulted as a verdict.
 * Constraint indices: grid rows then columns; order/assignment displayed rule order.
 */
export function explainLogicAnswer(p:Puzzle,a:any,status:{accepted:boolean;submitted?:boolean}):Feedback|null{
 if(status.accepted||!ids.has(p.id))return null;
 const {id,kind}=p,d=p.data||{};
 let complete=true;
 const fail=(code:string,message:string,targets:FeedbackTarget[],phase?:Feedback['phase']):Feedback=>({code:`logic.${id}.${code}`,message,targets,phase:phase??(complete?'invalid':'editing')});
 const missing=(message:string,targets:FeedbackTarget[])=>fail('incomplete',message,targets,'incomplete');

 if(kind==='sudoku'){
  const n=d.n,bw=d.bw,bh=n/bw;if(!Number.isInteger(n)||!Number.isInteger(bh)||!Array.isArray(a)||a.length!==n*n||a.some(v=>!Number.isInteger(v)||v<0||v>n))return null;
  complete=a.every(v=>v!==0);
  for(let i=0;i<a.length;i++)if(d.initial?.[i]&&a[i]!==d.initial[i])return fail('fixed',`${coord(i,n)}の すうじは ${d.initial[i]}で きまっているよ。`,[cell(i)]);
  const groups=lines(a,n),names:string[]=groups.map((_,i)=>i<n?'row':'column');
  for(let y=0;y<n;y+=bh)for(let x=0;x<n;x+=bw){groups.push(range(bh).flatMap(dy=>range(bw).map(dx=>(y+dy)*n+x+dx)));names.push('block');}
  for(let g=0;g<groups.length;g++){const seen=new Map<number,number>();for(const i of groups[g])if(a[i]){if(seen.has(a[i]))return fail(names[g],`${a[i]}が おなじ ${names[g]==='row'?'ぎょう':names[g]==='column'?'れつ':'わく'}に ふたつあるよ。`,[cell(seen.get(a[i])!),cell(i)]);seen.set(a[i],i);}}
  return complete?null:missing(`まだ ${a.filter(v=>v===0).length}マス あいているよ。`,a.flatMap((v,i)=>v===0?[cell(i)]:[]));
 }
 if(kind==='assignment'&&id==='zebra'){
  if(!Array.isArray(a)||a.length!==d.n||!Array.isArray(d.allowed)||a.some(v=>!Number.isInteger(v)||v< -1||v>=d.n))return null;
  complete=a.every(v=>v>=0);
  for(let i=0;i<a.length;i++)if(a[i]>=0){
   if(!d.allowed[i].includes(a[i]))return fail('allowed',`${letter(i)}には ${a[i]+1}の カードを わたせないよ。${letter(i)}の こうほを みよう。`,[card(i)]);
   const other=a.findIndex((v,j)=>j<i&&v===a[i]);if(other>=0)return fail('duplicate',`${letter(other)}と ${letter(i)}に、おなじ ${a[i]+1}を わたしているよ。カードは ひとりに 1まいずつ。`,[card(other),card(i)]);
  }
  for(let i=0;i<(d.relations||[]).length;i++){const r=d.relations[i];if(a[r.a]<0||a[r.b]<0)continue;if(!['sum','difference','before'].includes(r.op))return null;
   if(!assignmentRuleHolds(a,r)){const x=a[r.a]+1,y=a[r.b]+1;return fail(r.op,r.op==='sum'?`${letter(r.a)}と ${letter(r.b)}は ${x}+${y}=${x+y}。やくそくの ${r.value}と ちがうよ。`:r.op==='difference'?`${letter(r.a)}と ${letter(r.b)}の さは ${Math.abs(x-y)}。やくそくは ${r.value}だよ。`:`${letter(r.a)}の ${x}は、${letter(r.b)}の ${y}より ちいさくないよ。`,[constraint(i),card(r.a),card(r.b)]);}
  }return complete?null:missing('まだ カードを わたしていない ひとが いるよ。',a.flatMap((v,i)=>v<0?[card(i)]:[]));
 }
 if(kind==='binary-grid'){
  const n=d.n;if(!Number.isInteger(n)||!Array.isArray(a)||a.length!==n*n||a.some(v=>![0,1,...(id==='binary'?[-1]:[])].includes(v)))return null;
  complete=!a.includes(-1);
  for(let i=0;i<a.length;i++)if(d.given?.[i]>=0&&a[i]!==d.given[i])return fail('fixed',`${coord(i,n)}は さいしょから きまった マスだよ。`,[cell(i)]);
  const groups=lines(a,n);
  if(id==='nonogram'){
   if(!d.rows||!d.cols)return null;
   for(let i=0;i<groups.length;i++){const actual=runs(groups[i].map(at=>a[at])),wanted=(i<n?d.rows:d.cols)[i%n];if(!equal(actual,wanted))return fail('runs',`${lineName(i,n)}の つづく ぬりマスは ${actual.join('・')}。そとの すうじ ${wanted.join('・')}と ちがうよ。`,[constraint(i),...groups[i].map(cell)]);}
  }
  if(id==='minestars'){
   if(!d.given||!d.counts)return null;
   for(let i=0;i<a.length;i++)if(d.given[i]===0){const around=neighbors8(i,n),stars=around.filter(j=>a[j]===1);if(stars.length!==d.counts[i])return fail('neighbors',`${coord(i,n)}の ${d.counts[i]}の まわりに、ほしが ${stars.length}こあるよ。ななめも かぞえよう。`,[cell(i),...(stars.length?stars:around).map(cell)]);}
  }
  if(id==='binary'){
   for(const group of groups)for(let j=2;j<group.length;j++)if(a[group[j]]>=0&&a[group[j]]===a[group[j-1]]&&a[group[j]]===a[group[j-2]])return fail('triple','おなじ しるしが 3つ つづいているよ。たて・よこで 3つは ならべられないよ。',group.slice(j-2,j+1).map(cell));
   for(let i=0;i<groups.length;i++){const values=groups[i].map(at=>a[at]),zero=values.filter(v=>v===0).length,one=values.filter(v=>v===1).length;if(zero>n/2||one>n/2)return fail('balance',`${lineName(i,n)}は ○${zero}こ、●${one}こ。どちらも ${n/2}こずつだよ。`,[constraint(i),...groups[i].map(cell)]);}
   for(let axis=0;axis<2;axis++)for(let i=0;i<n;i++)for(let j=0;j<i;j++){const x=groups[axis*n+i],y=groups[axis*n+j];if(x.every(at=>a[at]>=0)&&y.every(at=>a[at]>=0)&&equal(x.map(at=>a[at]),y.map(at=>a[at])))return fail('duplicate-lines',`${lineName(axis*n+j,n)}と ${lineName(axis*n+i,n)}が、おなじ ならびだよ。`,[constraint(axis*n+j),constraint(axis*n+i),...y.map(cell),...x.map(cell)]);}
   if(!complete)return missing(`まだ ${a.filter(v=>v<0).length}マスの しるしが きまっていないよ。`,a.flatMap((v,i)=>v<0?[cell(i)]:[]));
  }
  if(id==='islands'){
   if(!d.clues)return null;const sea=components(a,n,1);
   if(sea.length!==1)return fail('sea-connected',sea.length?`うみが ${sea.length}つに わかれているよ。うみは たて・よこで ひとつに つなげよう。`:'うみの マスが ないよ。うみを たて・よこで ひとつに つなげよう。',sea.length?sea.flatMap(g=>g.map(cell)):[constraint(0)]);
   for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++){const square=[y*n+x,y*n+x+1,(y+1)*n+x,(y+1)*n+x+1];if(square.every(i=>a[i]===1))return fail('sea-square','この 2×2が ぜんぶ うみだよ。うみの 2×2は つくれないよ。',square.map(cell));}
   for(const group of components(a,n,0)){const clues=group.filter(i=>d.clues[i]);if(clues.length!==1)return fail('island-clues',`この しまには すうじが ${clues.length}こあるよ。しまには すうじを 1つ。`,group.map(cell));const wanted=d.clues[clues[0]];if(wanted!==group.length)return fail('island-size',`${coord(clues[0],n)}の しまは ${group.length}マス。すうじの ${wanted}マスに あわせよう。`,group.map(cell));}
  }
  if(id==='tents'){
   if(!d.trees||!d.rows||!d.cols)return null;const tents=range(a.length).filter(i=>a[i]===1);
   for(const t of tents){const neighbor=tents.find(other=>other>t&&neighbors8(t,n).includes(other));if(neighbor!==undefined)return fail('touching','この テントどうしが ふれているよ。ななめにも ふれないようにしよう。',[cell(t),cell(neighbor)]);}
   for(let i=0;i<groups.length;i++){const count=sum(groups[i].map(at=>a[at])),wanted=(i<n?d.rows:d.cols)[i%n];if(count!==wanted)return fail(i<n?'row-count':'column-count',`${lineName(i,n)}の テントは ${count}こ。そとの すうじは ${wanted}だよ。`,[constraint(i),...groups[i].map(cell)]);}
   const matched=treeMatching(d.trees,tents,n);if(matched!==d.trees.length||tents.length!==d.trees.length)return fail('matching',`${d.trees.length}この きと ${tents.length}この テントを、となりどうしで ${matched}くみしか つくれないよ。き1つに テント1つ。`,[...d.trees.map(cell),...tents.map(cell)]);
  }return null;
 }
 if(kind==='edge-grid'){
  if(!Array.isArray(d.edges)||!Array.isArray(d.nodes)||!Array.isArray(a)||a.length!==d.edges.length||a.some(v=>!Number.isInteger(v)||v<0||v>d.max))return null;
  const incident=(node:number)=>range(d.edges.length).filter(i=>d.edges[i].includes(node)),active=range(a.length).filter(i=>a[i]>0),degrees=d.nodes.map((_:any,node:number)=>sum(incident(node).map(i=>a[i])));
  if(id==='bridges'){
   if(!d.degrees)return null;for(let i=0;i<degrees.length;i++)if(degrees[i]!==d.degrees[i])return fail('degree',`${i+1}ばんの しまの はしは ${degrees[i]}ほん。すうじは ${d.degrees[i]}だよ。`,[constraint(i),...incident(i).map(edge)]);
  }
  if(id==='loopclues'){
   if(!d.clues||!d.cellEdges)return null;for(let i=0;i<d.clues.length;i++)if(d.clues[i]!==null){const count=sum(d.cellEdges[i].map((j:number)=>a[j]));if(count!==d.clues[i])return fail('clue',`${i+1}ばんの マスの まわりは ${count}ほん。すうじは ${d.clues[i]}だよ。`,[cell(i),...d.cellEdges[i].map(edge)]);}
   for(let i=0;i<degrees.length;i++)if(degrees[i]!==0&&degrees[i]!==2)return fail('vertex',`${i+1}ばんの せんの つなぎめに ${degrees[i]}ほんあるよ。わっかは 2ほんずつ つながるよ。`,incident(i).map(edge));
   if(!active.length)return fail('empty-loop','まだ わっかの せんが ないよ。ひとつの わっかを つくろう。',d.edges.map((_:any,i:number)=>edge(i)));
   const activeNodes=range(degrees.length).filter(i=>degrees[i]>0),seen=new Set([activeNodes[0]]),queue=[activeNodes[0]];
   for(let k=0;k<queue.length;k++)for(const i of active){const[u,v]=d.edges[i],next=u===queue[k]?v:v===queue[k]?u:-1;if(next>=0&&!seen.has(next)){seen.add(next);queue.push(next);}}
   if(seen.size!==activeNodes.length)return fail('multiple-loops','せんが はなれた わっかに わかれているよ。わっかは ひとつだけ。',active.map(edge));return null;
  }
  if(id==='bridges'||id==='mintree'){
   if(!connectedEdges(d.nodes.length,d.edges,a)){
    const seen=new Set([0]),queue=[0];for(let k=0;k<queue.length;k++)for(const i of active){const[u,v]=d.edges[i],next=u===queue[k]?v:v===queue[k]?u:-1;if(next>=0&&!seen.has(next)){seen.add(next);queue.push(next);}}
    const outside=range(d.nodes.length).filter(i=>!seen.has(i)),cuts=range(d.edges.length).filter(i=>seen.has(d.edges[i][0])!==seen.has(d.edges[i][1]));
    return fail('connected',`1ばんの まるから ${outside.map(i=>i+1).join('・')}ばんへ、まだ みちが つながっていないよ。はなれた まとまりを つなごう。`,cuts.length?cuts.map(edge):[...active.map(edge),...outside.map(constraint)]);
   }
   if(id==='mintree'){
    if(active.length!==d.nodes.length-1)return fail('edge-count',`${active.length}ほんの みちを えらんでいるよ。${d.nodes.length}この まるを わっかなしで つなぐには ${d.nodes.length-1}ほんだよ。`,active.map(edge));
    if(!d.weights||!Number.isFinite(d.minimum))return null;const weight=sum(a.map((v,i)=>v*d.weights[i]));if(weight!==d.minimum)return fail('weight',`えらんだ みちの ごうけいは ${weight}。おだいの いちばん みじかい ${d.minimum}と ちがうよ。`,active.map(edge));
   }
  }return null;
 }
 if(kind==='arrange'&&(id==='order'||id==='schedule')){
  const count=d.values?.length??d.n;if(!Number.isInteger(count)||!Array.isArray(a)||a.some(v=>!index(v,count))||new Set(a).size!==a.length)return null;complete=a.length===count;
  const before=(u:number,v:number)=>a.includes(v)&&(!a.includes(u)||a.indexOf(u)>a.indexOf(v));
  for(let i=0;i<(d.clues||[]).length;i++){const[u,v]=d.clues[i];if(before(u,v))return fail('before',`${d.values?.[u]??letter(u)}を ${d.values?.[v]??letter(v)}より まえに ならべる やくそくだよ。`,[constraint(i),card(u),card(v)]);}
  for(let i=0;i<(d.orderRules||[]).length;i++){const r=d.orderRules[i];if(!['before','adjacent','notAdjacent','gap','position','end','between'].includes(r.op))return null;const people=[r.a,...(r.b===undefined?[]:[r.b]),...(r.c===undefined?[]:[r.c])];if(!complete&&!(r.op==='before'?before(r.a,r.b):r.op!=='end'&&people.every(v=>a.includes(v))))continue;
   if(!orderRuleHolds(a,r)){const names=people.map(letter).join('・'),detail=r.op==='gap'?`あいだは ${r.gap-1}まい`:r.op==='position'?`ひだりから ${r.position+1}ばん`:r.op==='end'?'どちらかの はし':r.op==='between'?`${letter(r.b)}を ${letter(r.a)}と ${letter(r.c)}の あいだ`:r.op==='adjacent'?'となりどうし':r.op==='notAdjacent'?'となりではない':`${letter(r.a)}が ${letter(r.b)}より まえ`;return fail(r.op,`${names}の やくそく「${detail}」と、いまの ならびが ちがうよ。`,[constraint((d.clues||[]).length+i),...people.map(card)]);}
  }return complete?null:missing(`まだ ${count-a.length}まい ならべていないよ。`,range(count).filter(i=>!a.includes(i)).map(card));
 }
 if(kind==='domino-chain'&&id==='domino'){
  if(!Array.isArray(d.tiles)||!d.tiles.length||!a||!Array.isArray(a.order)||!Array.isArray(a.flips)||a.order.length!==a.flips.length||a.order.some((i:any)=>!index(i,d.tiles.length))||a.flips.some((v:any)=>typeof v!=='boolean')||new Set(a.order).size!==a.order.length)return null;
  complete=a.order.length===d.tiles.length;const tiles=a.order.map((j:number,i:number)=>a.flips[i]?[...d.tiles[j]].reverse():d.tiles[j]);
  if(tiles.length&&tiles[0][0]!==d.start)return fail('start',`さいしょの ドミノの ひだりは ${tiles[0][0]}。はじめの ${d.start}に つながっていないよ。`,[card(a.order[0])]);
  for(let i=1;i<tiles.length;i++)if(tiles[i-1][1]!==tiles[i][0])return fail('joint',`${i}まいめの みぎは ${tiles[i-1][1]}、つぎの ひだりは ${tiles[i][0]}。おなじ すうじを つなごう。`,[card(a.order[i-1]),card(a.order[i])]);
  if(complete&&tiles.at(-1)[1]!==d.end)return fail('end',`さいごの みぎは ${tiles.at(-1)[1]}。おわりの ${d.end}に つながっていないよ。`,[card(a.order.at(-1))]);
  return complete?null:missing(`まだ ${d.tiles.length-a.order.length}まいの ドミノを つかっていないよ。`,range(d.tiles.length).filter(i=>!a.order.includes(i)).map(card));
 }
 if(kind==='card-select'){
  if(!Array.isArray(d.cards)||!Array.isArray(a)||a.some(v=>!index(v,d.cards.length))||new Set(a).size!==a.length)return null;
  complete=id==='settriple'?a.length>=3:id==='odd'?a.length>=1:!!status.submitted;
  if(id==='settriple'){
   if(a.length<3)return missing(`3まい えらぼう。いまは ${a.length}まいだよ。`,a.length?a.map(card):[constraint(0)]);
   if(a.length>3)return fail('selection-count',`${a.length}まい えらんでいるよ。くみに するのは 3まいだけ。`,a.map(card));
   for(const attr of ['shape','color','count'])if(new Set(a.map(i=>d.cards[i][attr])).size===2)return fail(attr,`この3まいは ${attrName[attr]}が 2まいおなじで、1まいだけ ちがうよ。ぜんぶ おなじか、ぜんぶ ちがうように しよう。`,a.map(card));
  }
  if(id==='venn'||id==='odd'){
   if(!knownCardRule(d.rule))return null;
   if(id==='odd'&&a.length===0)return missing('きまりに あわない カードを 1まい えらぼう。',[constraint(0)]);
   if(id==='odd'&&a.length>1)return fail('selection-count',`${a.length}まい えらんでいるよ。きまりに あわない カードは 1まいだけ。`,a.map(card));
   for(const i of a)if(cardRule(d.cards[i],d.rule)===(id==='odd'))return fail(id==='odd'?'fits-rule':'extra',`${i+1}ばんは「${ruleWords(d.rule)}」に ${id==='odd'?'あっている':'あっていない'}よ。${id==='odd'?'あわない1まいを さがそう。':'じょうけんに あうものを えらぼう。'}`,[card(i),constraint(0)]);
   if(id==='venn'){const i=d.cards.findIndex((c:any,i:number)=>!a.includes(i)&&cardRule(c,d.rule));if(i>=0)return fail('missing-card',`${i+1}ばんも「${ruleWords(d.rule)}」に あっているよ。あうカードは ぜんぶ えらぼう。`,[card(i),constraint(0)],status.submitted?'invalid':'incomplete');}
  }return null;
 }
 if(kind==='odd'&&id==='odd'){
  if(!Number.isInteger(d.n)||!index(a,d.n*d.n))return null;if(a===d.odd)return null;
  return fail('majority',`${coord(a,d.n)}は、ほかの マスと おなじ ${d.variant==='direction'?'むき':'かたち'}だよ。ちがう 1つを さがそう。`,[cell(a)]);
 }
 if(kind!=='visual-choice')return null;
 if(a===null||a===undefined||Array.isArray(a)&&a.length===0)return missing('こたえの カードを 1まい えらぼう。',[constraint(0)]);
 if(!Array.isArray(p.options)||!index(a,p.options.length))return null;const chosen=p.options[a];
 if(id==='liar'){
  const person=d.people?.indexOf(chosen);if(person===undefined||person<0||!d.statements)return null;
  const trueStatements=d.statements.map((s:any)=>((s.members||[s.person]).includes(person))===s.is),count=trueStatements.filter(Boolean).length;
  if(count!==d.trueCount)return fail('truth-count',`${chosen}を あたりとすると、ほんとうの はなしは ${count}こ。やくそくの ${d.trueCount}こと ちがうよ。`,[card(a),constraint(0),...trueStatements.flatMap((yes:boolean,i:number)=>yes?[observation(i)]:[])]);return null;
 }
 if(id==='pattern'){
  const items=d.scene?.items?.filter((s:any)=>s.type==='symbol'),period=d.period;if(!items||!index(items.length-period,items.length)||!chosen||typeof chosen!=='object')return null;
  const previous=items[items.length-period];for(const attr of ['shape','color','count'])if(chosen[attr]!==previous[attr])return fail(attr,`${attrName[attr]}の ${period}こぶんの くりかえしを みよう。えらんだカードは、ひとまわり まえの ${attrName[attr]}と ちがうよ。`,[card(a),observation(items.length-period)]);return null;
 }
 if(id==='matrix'){
  const value=Number(chosen);if(!Number.isFinite(value)||!Array.isArray(d.values))return null;
  if(d.n===2&&d.ruleFamily==='additive-cross'){const[x,y,z]=d.values;if(value-z!==y-x)return fail('row',`みぎの ふえかたが うえは ${y-x}、したは ${value-z}だよ。おなじ ふえかたに なるか みよう。`,[constraint(1),card(a)]);return null;}
  if(d.n!==3||!['add','subtract','multiply','multiply-plus','pair-product-offset'].includes(d.ruleFamily))return null;
  const row=d.values.slice(6,9).map((v:any)=>v==='？'?value:v);if(row.some((v:any)=>!Number.isFinite(v)))return null;
  const [x,y,z]=row,k=d.coefficient,offset=d.offset,actual=d.ruleFamily==='add'?x+y:d.ruleFamily==='subtract'?x-y:d.ruleFamily==='multiply'?x*y:d.ruleFamily==='multiply-plus'?x*k+y:x*y+offset;
  if(actual!==z)return fail('row',`3だんめの ${row.join('・')}は、うえの2だんと おなじ「${d.ruleFamily==='add'?'たす':d.ruleFamily==='subtract'?'ひく':d.ruleFamily==='multiply'?'かける':d.ruleFamily==='multiply-plus'?`${k}ばいして たす`:`かけて ${offset}を たす`}」の きまりに なっていないよ。`,[constraint(2),card(a)]);return null;
 }
 if(id==='balance'){
  if(!Array.isArray(d.equations))return null;const expected=weightQuery(d.equations),value=Number(chosen);if(expected===null||!Number.isFinite(value))return null;
  if(Math.abs(value-expected)>1e-8)return fail('equation',`えらんだ ${value}では「${d.equations.at(-1).split(/[＝=]/)[0].trim()}」の おもさが、うえの しきと そろわないよ。おなじ かたちは 1つぶんの おもさも おなじ。`,[card(a),...d.equations.map((_:any,i:number)=>constraint(i))]);return null;
 }
 if(id==='rulemachine'){
  if(!d.target||!d.shift||!chosen||typeof chosen!=='object')return null;
  let value={...d.target};const shifts=[d.shift,...(d.shift2?[d.shift2]:[])];if(d.reverse)shifts.reverse();
  for(const shift of shifts)for(const attr of ['shape','color','count']){const base=attr==='count'?1:0;value[attr]=(value[attr]-base+(d.reverse?-shift[attr]:shift[attr])+3)%3+base;}
  for(const attr of ['shape','color','count'])if(chosen[attr]!==value[attr])return fail(attr,`えらんだカードの ${attrName[attr]}が ちがうよ。れいでは ${attrName[attr]}を ${shifts.map(s=>s[attr]).join('→')}つずつ ${d.reverse?'ぎゃくに もどす':'じゅんに すすめる'} きまりだよ。${shifts.length===2?'2つの はこの じゅんも たしかめよう。':'れいの まえと あとを くらべよう。'}`,[card(a),observation(0),...shifts.map((_,i)=>constraint(i))]);return null;
 }
 if(id==='cipher'){
  const maps=d.maps||[d.map,d.map2,d.map3].filter(Boolean);if(!Array.isArray(d.message)||!maps.length||maps.some((m:any)=>!Array.isArray(m)))return null;
  const values=String(chosen).trim().split(/\s+/).map(Number);if(values.length!==d.message.length||values.some(v=>!Number.isFinite(v)))return null;
  for(let i=0;i<d.message.length;i++){let value=d.message[i];const order=d.reverse?[...maps].reverse():maps;for(const map of order)value=d.reverse?map.indexOf(value):map[value];if(!Number.isInteger(value)||value<0)return null;
   if(values[i]!==value+1)return fail('mapping',`${i+1}ばんめの ${d.message[i]+1}を ${d.reverse?'さいごの カギから ぎゃくに':'カギの じゅんに'} たどると、えらんだ ${values[i]}には つながらないよ。${maps.length}つの カギを じゅんに たしかめよう。`,[card(a),observation(i),...maps.map((_:any,j:number)=>constraint(j))]);
  }return null;
 }
 if(id==='familytree'){
  const s=d.scene||{},parents=d.parents||s.parents,labels=s.labels,targetNode=d.target??s.target,other=d.otherTarget??s.otherTarget,relation=d.relation||'ancestor';if(!Array.isArray(parents)||!Array.isArray(labels)||!index(targetNode,parents.length)||!['ancestor','common-ancestor','path-distance'].includes(relation))return null;
  const ancestors=(start:number)=>{const path:number[]=[];for(let at=start;index(at,parents.length)&&!path.includes(at);at=parents[at])path.push(at);return path;},path=ancestors(targetNode);
  if(relation==='path-distance'){const next=ancestors(other),common=next.find(i=>path.includes(i));if(common===undefined)return null;const left=path.indexOf(common),right=next.indexOf(common),hops=left+right;if(Number(chosen)!==hops)return fail('path-distance',`${labels[targetNode]}から ごうりゅうまで ${left}ほん、そこから ${labels[other]}まで ${right}ほん。えらんだ ${chosen}ほんと あうか、2つの みちを あわせて かぞえよう。`,[card(a),...path.slice(0,left+1).map(observation),...next.slice(0,right+1).map(observation)]);return null;}
  const selected=labels.indexOf(String(chosen));if(selected<0)return null;
  if(relation==='common-ancestor'){const next=ancestors(other),common=next.find(i=>path.includes(i));if(common===undefined)return null;if(selected!==common){const missingFrom=!path.includes(selected)?targetNode:!next.includes(selected)?other:-1;return fail('common-ancestor',missingFrom>=0?`${chosen}は、${labels[missingFrom]}から おやへ たどる みちに いないよ。2人の みちに いる おなじ せんぞを みよう。`:`${chosen}よりも 2人に ちかい ごうりゅうが あるよ。2人から おやへ たどり、さいしょの ごうりゅうを みよう。`,[card(a),observation(targetNode),observation(other)]);}return null;}
  const steps=d.steps??s.steps;if(!Number.isInteger(steps))return null;if(path[steps]!==selected)return fail('ancestor',`${chosen}は、${labels[targetNode]}から おやを ${steps}かい たどった ばしょと ちがうよ。えらんだ ひとまでの つながりを たしかめよう。`,[card(a),...path.slice(0,steps+1).map(observation)]);return null;
 }
 return null;
}
