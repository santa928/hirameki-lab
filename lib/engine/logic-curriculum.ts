import {context,range,equal,adjacent,sceneText,sceneRow,sceneGrid,type Puzzle} from './shared.ts';
import {isSet,cardRule,circuitValue,mstWeight,connectedEdges,nonogramSolutions} from './logic.ts';
import {logicMetricsRaw} from './logic-metrics.mjs';

type Generator=(id:string,level:number,seed:number)=>Puzzle|undefined;
type Features=Record<string,number|string|boolean>;
const sum=(a:number[])=>a.reduce((s,v)=>s+v,0);
const permutations=(a:number[]):number[][]=>a.length?a.flatMap((v,i)=>permutations(a.filter((_,j)=>j!==i)).map(p=>[v,...p])):[[]];
const distinct=(a:any[])=>new Set(a.map(v=>JSON.stringify(v))).size;
const symbol=(shape:number,color=0,count=1)=>({type:'symbol',shape,color,count});
const deck=()=>range(27).map(i=>symbol(i%3,Math.floor(i/3)%3,Math.floor(i/9)+1));
// Each active attribute appears in competing answers; option frequency must not reveal the answer.
function symbolAlternatives(answer:any,attrs:string[],shuffle:<T>(a:T[])=>T[]){
 if(attrs.length===1){const attr=attrs[0],offset=attr==='count'?1:0;return range(3).filter(v=>v+offset!==answer[attr]).map(v=>({...answer,[attr]:v+offset}));}
 const other=Object.fromEntries(attrs.map(attr=>[attr,shuffle(range(3).map(v=>v+(attr==='count'?1:0)).filter(v=>v!==answer[attr]))[0]]));
 return (attrs.length===2?[1,2,3]:[3,5,6]).map(mask=>Object.fromEntries(Object.entries(answer).map(([key,value])=>[key,attrs.includes(key)&&(mask&(1<<attrs.indexOf(key)))?other[key]:value])));
}
const annotated=(p:Puzzle,features:Features,score:number,concept:string):Puzzle=>{
 const text:Record<string,[string,string]>={order:['すべての やくそくどおりに ならべよう','位置・前後・間の枚数など、表示された全ての約束を満たす順番にカードを並べます。'],matrix:['よこの きまりで くうらんを みつけよう','例の行と同じ計算の関係を使い、空欄の数を求めます。'],odd:['きまりに あわない 1まいは？','表示された条件を満たさないカードを一枚選びます。'],zebra:['すべての じょうけんで カードを くばろう','一人に一枚、同じ数字は一度だけです。表示された候補と、二人の数字の関係を両方満たします。']};
 let scene=p.data.scene,prompt=text[p.id]?.[0],help=text[p.id]?.[1];
 if(p.id==='familytree'){prompt=scene.queryText;help='線は親子のつながりで、上の人が親です。問題の人物や関係を確かめ、線をたどって考えます。';scene={...scene,hideQuery:true};}
 if(p.id==='rulemachine'||p.id==='cipher'){prompt=scene.prompt;help=p.id==='rulemachine'?'例から箱の変化を読み取ります。逆向きの問題は変化を戻し、二つの箱は指定の順番で使います。':'表の矢印を指定の向きと順番でたどります。逆向きなら最後の表から元へ戻します。';scene={...scene,prompt:undefined};}
 return{...p,data:{...p.data,scene,...(prompt?{prompt}:{}),...(help?{help}:{}),logicCurriculum:true,curriculumMetrics:{...features,score,concept}}};
};

export function orderRuleHolds(order:number[],rule:any):boolean{
 const at=(v:number)=>order.indexOf(v);
 if(rule.op==='before')return at(rule.a)<at(rule.b);
 if(rule.op==='adjacent')return Math.abs(at(rule.a)-at(rule.b))===1;
 if(rule.op==='notAdjacent')return Math.abs(at(rule.a)-at(rule.b))!==1;
 if(rule.op==='gap')return Math.abs(at(rule.a)-at(rule.b))===rule.gap;
 if(rule.op==='position')return at(rule.a)===rule.position;
 if(rule.op==='end')return at(rule.a)===0||at(rule.a)===order.length-1;
 if(rule.op==='between')return (at(rule.a)<at(rule.b)&&at(rule.b)<at(rule.c))||(at(rule.c)<at(rule.b)&&at(rule.b)<at(rule.a));
 return false;
}
function orderWords(r:any){const a=(v:number)=>String.fromCharCode(65+v);if(r.op==='before')return`${a(r.a)} は ${a(r.b)} より まえ`;if(r.op==='adjacent')return`${a(r.a)} と ${a(r.b)} は となり`;if(r.op==='notAdjacent')return`${a(r.a)} と ${a(r.b)} は となりではない`;if(r.op==='gap')return`${a(r.a)} と ${a(r.b)} の あいだは ${r.gap-1}まい`;if(r.op==='position')return`${a(r.a)} は ひだりから ${r.position+1}ばん`;if(r.op==='end')return`${a(r.a)} は どちらかの はし`;return`${a(r.b)} は ${a(r.a)} と ${a(r.c)} の あいだ`;
}
export function assignmentRuleHolds(answer:number[],r:any):boolean{const a=answer[r.a]+1,b=answer[r.b]+1;return r.op==='sum'?a+b===r.value:r.op==='difference'?Math.abs(a-b)===r.value:r.op==='before'?a<b:false;}
function assignmentWords(r:any){const a=(v:number)=>String.fromCharCode(65+v);return r.op==='sum'?`${a(r.a)} と ${a(r.b)} の すうじを たすと ${r.value}`:r.op==='difference'?`${a(r.a)} と ${a(r.b)} の すうじの さは ${r.value}`:`${a(r.a)} の すうじは ${a(r.b)} より ちいさい`;}

function originalOrder(level:number,seed:number){const c=context('order',level,seed),{L,int,pick,shuffle,base}=c,n=L<=2?3:L<=8?4:L<=14?5:6,solution=shuffle(range(n)),all=permutations(range(n)),band=Math.floor((L-1)/4),pool:any[]=[];
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){pool.push({op:'before',a:solution[i],b:solution[j]});if(j===i+1)pool.push({op:'adjacent',a:solution[i],b:solution[j]});if(band>=2&&j>i+1)pool.push({op:'notAdjacent',a:solution[i],b:solution[j]});if(band>=2&&j>i+1)pool.push({op:'gap',a:solution[i],b:solution[j],gap:j-i});if(band>=3)for(let k=j+1;k<n;k++)pool.push({op:'between',a:solution[i],b:solution[j],c:solution[k]});}
 if(band===1){const position=int(0,n-1);pool.push({op:'position',a:solution[position],position});}
 if(band>=4){pool.push({op:'end',a:solution[0]},{op:'end',a:solution[n-1]});}
 const validPool=shuffle(pool.filter(r=>orderRuleHolds(solution,r))),rules:any[]=[];let remaining=all;
 const required=band===0?'adjacent':band===1?'position':band===2?(L%2?'gap':'notAdjacent'):band===3?'between':'end';
 const special=validPool.find(r=>r.op===required);if(special){rules.push(special);remaining=remaining.filter(a=>orderRuleHolds(a,special));}
 while(remaining.length>1){const candidates=validPool.filter(r=>!rules.includes(r)).map(r=>({r,count:remaining.filter(a=>orderRuleHolds(a,r)).length})).filter(x=>x.count>0&&x.count<remaining.length);candidates.sort((a,b)=>a.count-b.count);if(!candidates.length)throw Error('order constraints do not distinguish solution');const chosen=pick(candidates.slice(0,Math.min(3,candidates.length)));rules.push(chosen.r);remaining=remaining.filter(a=>orderRuleHolds(a,chosen.r));}
 const shown=shuffle(rules),families=distinct(shown.map(r=>r.op));return annotated(base('arrange',{values:range(n).map(i=>String.fromCharCode(65+i)),clues:[],orderRules:shown,scene:sceneRow(shown.map(r=>sceneText(orderWords(r))))},solution,'ひとつの ヒントで きめず、ほかの やくそくも たしかめよう。'),{n,constraints:rules.length,ruleFamilies:families,nonlocalConstraints:rules.filter(r=>r.op!=='before'&&r.op!=='adjacent').length},families*2+rules.length+rules.filter(r=>r.op==='between'||r.op==='gap').length,'relational-order');
}

/** Original logic games use the shared visual choice/arrange renderers. Sudoku keeps its keypad. */
export function generateOriginalLogic(id:string,level:number,seed:number):Puzzle|undefined{
 if(!['pattern','matrix','sudoku','order','balance','odd'].includes(id))return;
 if(id==='order')return originalOrder(level,seed);
 const c=context(id,level,seed),{L,int,pick,shuffle,choice,numeric,base}=c,band=Math.floor((L-1)/4),step=(L-1)%4;
 if(id==='sudoku'){
  const n=L<=8?4:6,bw=n===4?2:3,bh=n/bw,target=n===4?2+L:Math.min(28,10+(L-9)*2);let best:Puzzle|undefined,bestScore=-Infinity;
  const count=(board:number[])=>{const a=[...board];let found=0;function solve(){if(found>=2)return;let at=-1,opts:number[]=[];for(let i=0;i<a.length;i++)if(!a[i]){const x=i%n,y=Math.floor(i/n),possible=range(n).map(v=>v+1).filter(v=>!a.some((t,j)=>t===v&&(j%n===x||Math.floor(j/n)===y||Math.floor(j%n/bw)===Math.floor(x/bw)&&Math.floor(Math.floor(j/n)/bh)===Math.floor(y/bh))));if(!possible.length)return;if(at<0||possible.length<opts.length){at=i;opts=possible;}}if(at<0){found++;return;}for(const v of opts){a[at]=v;solve();}a[at]=0;}solve();return found;};
  for(let attempt=0;attempt<(L<9?1:L<17?6:20);attempt++){
   const symbols=shuffle(range(n).map(v=>v+1)),rows=shuffle(range(bw)).flatMap(g=>shuffle(range(bh).map(i=>g*bh+i))),cols=shuffle(range(bh)).flatMap(g=>shuffle(range(bw).map(i=>g*bw+i))),solution=rows.flatMap(y=>cols.map(x=>symbols[(bw*(y%bh)+Math.floor(y/bh)+x)%n])),initial=[...solution];let removed=0;for(const at of shuffle(range(n*n))){if(removed>=target)break;const old=initial[at];initial[at]=0;if(count(initial)!==1)initial[at]=old;else removed++;}
   const candidate:Puzzle={id,level:L,seed,kind:'sudoku',data:{n,bw,initial,logicCurriculum:true},solution,hint:'まだ はいれる すうじと、すうじが はいれる ばしょを べつべつに しらべよう。'},m=logicMetricsRaw(candidate),score=m.propagationRounds+(m.hiddenSingles||0)*.5+(m.unresolved||0)*3;
   if(score>bestScore){best=candidate;bestScore=score;}
  }return best;
 }
 if(id==='pattern'){
  const shapes=shuffle(range(3)),colors=shuffle(range(3)),counts=shuffle([1,2,3]);let period=2,active=1,interleaved=false;
  const motifs=[[0,1],[0,1,2],[0,0,1],[0,1,1],[0,0,1,1],[0,1,0,2]];
  const motif=band===0?motifs[step<2?0:1]:band===1?motifs[2+step]:[0,1,2];
  let at:(i:number)=>any;
  if(band<=1){period=motif.length;at=i=>symbol(shapes[motif[i%period]],0,1);}
  else if(band===2){interleaved=true;period=6;const a=int(0,2),b=int(0,2);at=i=>symbol(shapes[(Math.floor(i/2)*(i%2?2:1)+(i%2?b:a))%3],0,1);}
  else if(band===3){active=2;const shapePeriod=pick([2,3]),colorMotif=pick(motifs.filter(m=>m.length!==shapePeriod)),phaseOffset=int(0,colorMotif.length-1);period=shapePeriod;while(period%colorMotif.length)period+=shapePeriod;at=i=>symbol(shapes[(i+step)%shapePeriod],colors[colorMotif[(i+phaseOffset)%colorMotif.length]],1);}
  else {active=3;period=6;at=i=>symbol(shapes[(i+step)%3],colors[i%2],counts[Math.floor(i/2)%3]);}
  const singleAxis=pick(['shape','color','count']);if(active===1){const shapeAt=at;at=i=>{const value=shapeAt(i).shape;return symbol(singleAxis==='shape'?value:0,singleAxis==='color'?value:0,singleAxis==='count'?value+1:1);};}
  const shown=band<2?period*2+int(0,Math.min(2,period-1)):12+int(0,1),offset=int(0,period-1),items=range(shown).map(i=>at(i+offset)),answer=at(shown+offset),wrong=deck().filter(v=>!equal(v,answer)).sort((a,b)=>['shape','color','count'].filter(k=>a[k as keyof typeof a]!==answer[k]).length-['shape','color','count'].filter(k=>b[k as keyof typeof b]!==answer[k]).length);
  const changedNextAttributes=['shape','color','count'].filter(k=>answer[k]!==items.at(-1)![k]).length;
  return annotated(choice(answer,symbolAlternatives(answer,active===1?[singleAxis]:['shape','color','count'].slice(0,active),shuffle),sceneRow([...items,sceneText('？')]),interleaved?'1つおきの ならびも たしかめよう。':'かたち・いろ・かず、それぞれの くりかえしを みよう。',{ruleFamily:interleaved?'interleaved':active>1?'independent-attributes':'repeated-motif',activeAttributes:active,period,shown,interleaved}),{period,activeAttributes:active,interleaved,shown,changedNextAttributes},active*3+Math.log2(period)+(interleaved?2:0)+changedNextAttributes*.5,'sequence-rules');
 }
 if(id==='matrix'){
  const families=['add','subtract','multiply','multiply-plus','pair-product-offset'];const family=families[band],k=int(2,3),offset=int(1,5),n=band===0&&step<2?2:3;
  if(n===2){const a=int(1,5),dx=int(1,3),dy=int(1,3),answer=a+dx+dy;return annotated(numeric(answer,sceneGrid(2,[a,a+dx,a+dy,'？']),'みぎと したの ふえかたを くらべよう。',0,{n,values:[a,a+dx,a+dy],ruleFamily:'additive-cross',reasoningOperations:2}),{n,ruleFamilies:2,inverse:false,reasoningOperations:2},2.5,'additive-cross');}
  const operation=(a:number,b:number)=>family==='add'?a+b:family==='subtract'?a-b:family==='multiply'?a*b:family==='multiply-plus'?a*k+b:a*b+offset;
  const rows=range(3).map((_,i)=>{let a=int(2,8)+i,b=int(1,5);if(family==='subtract')a+=b;return[a,b,operation(a,b)];});
  // Distinct examples are needed to distinguish addition, subtraction and multiplication.
  if(rows[0][0]===rows[1][0]&&rows[0][1]===rows[1][1]){rows[1][0]++;rows[1][2]=operation(rows[1][0],rows[1][1]);}
  const inverse=step>=2&&band>=1,missing=inverse?0:2,answer=rows[2][missing],values=rows.flat().map((v,i)=>i===6+missing?'？':v),ops=band>=3?2:1;
  const scene=sceneRow([sceneText('よこの 3つに おなじ きまり',family==='multiply-plus'?'左の数を おなじ数倍して、まん中を たす。':family==='pair-product-offset'?'左と まん中を かけて、おなじ数を たす。':'たす・ひく・かける。おてほんの 2だんで たしかめよう。'),sceneGrid(3,values)]);
  return annotated(numeric(answer,scene,inverse?'うしろの こたえから、まえの かずを さかのぼろう。':'それぞれの だんで、おなじ きまりが つかえるかな？',0,{n:3,values,ruleFamily:family,reasoningOperations:ops+(inverse?1:0),inverse,coefficient:k,offset}),{n:3,reasoningOperations:ops+(inverse?1:0),inverse,ruleFamily:family},ops*2+(inverse?1.5:0)+(band>=3?1:0),'row-relation');
 }
 if(id==='balance'){
  const a=int(2,8),b=int(2,8),d=int(2,8),ca=int(2,step<2?2:3),cb=step<2?1:2;let lines:string[],answer:number,ops:number,unknowns:number;
  if(band===0){lines=[`${'○'.repeat(ca)} ＝ ${a*ca}`,'○ ＝ ？'];answer=a;ops=1;unknowns=1;}
  else if(band===1){lines=[`${'○'.repeat(ca)} ＝ ${a*ca}`,`○ ＋ △ ＝ ${a+b}`,'△ ＝ ？'];answer=b;ops=2;unknowns=2;}
  else if(band===2){lines=[`${'○'.repeat(ca)} ＝ ${a*ca}`,`○ ＋ △△ ＝ ${a+2*b}`,`${'△'.repeat(cb)} ＝ ？`];answer=b*cb;ops=3+(cb>1?1:0);unknowns=2;}
  else if(band===3){lines=[`○ ＋ △ ＝ ${a+b}`,`○ ＋ △△ ＝ ${a+2*b}`,`${step<2?'○':'○○ ＋ △'} ＝ ？`];answer=step<2?a:2*a+b;ops=3+(step<2?0:2);unknowns=2;}
  else {lines=[`○ ＋ △ ＝ ${a+b}`,`△ ＋ □ ＝ ${b+d}`,`○ ＋ □ ＝ ${a+d}`,`${step<2?'○ ＋ △ ＋ □':'○'} ＝ ？`];answer=step<2?a+b+d:a;ops=step<2?3:4;unknowns=3;}
  return annotated(numeric(answer,sceneRow(lines.map(s=>sceneText(s))),'おなじ かたちを ひとつぶんに。2つの しきを くらべる ほうほうも あるよ。',1,{equations:lines,reasoningOperations:ops,unknowns}),{reasoningOperations:ops,unknowns,equations:lines.length-1},ops+unknowns*1.5,'weight-equations');
 }
 if(id==='odd'){
  if(L===1)return;const attrs=shuffle(['shape','color','count']),atoms=attrs.map(attr=>({attr,value:attr==='count'?int(1,3):int(0,2)}));let rule:any=band===0?{attr:['shape','color','count'][L-2],value:L===4?int(1,3):int(0,2)}:band===1?{op:'not',child:atoms[0]}:band===2?{op:'and',left:atoms[0],right:atoms[1]}:band===3?{op:'or',left:atoms[0],right:atoms[1]}:{op:'and',left:{op:'not',child:atoms[0]},right:{op:'or',left:atoms[1],right:atoms[2]}};
  const good=shuffle(deck().filter(v=>cardRule(v,rule))),bad=shuffle(deck().filter(v=>!cardRule(v,rule))),cards=shuffle([...good.slice(0,Math.min(good.length,3+step)),bad[0]]),answer=cards.findIndex(v=>!cardRule(v,rule)),atomsCount=band<=1?1:band===4?3:2;
  return annotated(base('card-select',{cards,rule,oddAnswer:answer,scene:{type:'rule',rule}},[answer],'きまりを ひとつずつ たしかめよう。あわない カードは 1まいだけ。'),{cards:cards.length,atoms:atomsCount,negations:band===1||band===4?1:0,logicalOperators:band===0?0:band===4?3:1},atomsCount*2+(band===4?3:band>=1?1:0),'rule-exception');
 }
}

/** Deliberate rule families and information constraints; no level is added to the score. */
export function generateLogicCurriculum(id:string,level:number,seed:number,fallback:Generator):Puzzle|undefined{
 const c=context(id,level,seed),{L,int,pick,shuffle,base,choice}=c,band=Math.floor((L-1)/4),step=(L-1)%4;
 if(id==='venn'){
  const attrs=shuffle(['shape','color','count']),atoms=attrs.map(attr=>({attr,value:attr==='count'?int(1,3):int(0,2)}));let rule:any=band===0?atoms[0]:band===1?{op:'and',left:atoms[0],right:atoms[1]}:band===2?{op:'or',left:atoms[0],right:atoms[1]}:band===3?{op:step<2?'and':'or',left:{op:'not',child:atoms[0]},right:atoms[1]}:{op:step<2?'and':'or',left:{op:step<2?'or':'and',left:atoms[0],right:atoms[1]},right:{op:'not',child:atoms[2]}};
  const universe=deck(),classes=new Map<string,any[]>();for(const card of universe){const key=atoms.slice(0,band===0?1:band===4?3:2).map(a=>+(card[a.attr as keyof typeof card]===a.value)).join('');if(!classes.has(key))classes.set(key,[]);classes.get(key)!.push(card);}const required=[...classes.values()].map(a=>pick(a)),count=Math.min(12,band===0?6:band<3?9:12),cards=shuffle([...required,...shuffle(universe.filter(v=>!required.includes(v))).slice(0,count-required.length)]),solution=range(cards.length).filter(i=>cardRule(cards[i],rule));
  return annotated(base('card-select',{cards,rule,scene:{type:'rule',rule}},solution,'かっこの なかを さきに。「または」は どちらか ひとつでも あえば いいよ。'),{atoms:band===0?1:band===4?3:2,operators:band===0?0:band===4?3:band===3?2:1,truthClasses:classes.size,negations:band>=3?1:0,cards:cards.length},(band===0?1:band===4?3:2)*2+(band===0?0:band===4?3:band===3?2:1)+classes.size*.3,'boolean-card-selection');
 }
 if(id==='liar'){
  const n=band===0&&step<2?3:4,people=range(n).map(i=>String.fromCharCode(65+i)),statementCount=band===0?2+step%2:Math.min(7,3+band+(step>=2?1:0));for(let attempt=0;attempt<1000;attempt++){
   const pool:any[]=[];for(let mask=1;mask<2**n-1;mask++){const members=range(n).filter(i=>mask>>i&1);if(band<2&&members.length!==1||band>=2&&members.length>2)continue;pool.push({members,is:true},{members,is:false});}const statements=shuffle(pool).slice(0,statementCount),counts=range(n).map(v=>statements.filter(s=>s.members.includes(v)===s.is).length),eligible=range(n).filter(v=>counts.filter(x=>x===counts[v]).length===1&&(band===0||counts[v]>0&&counts[v]<statementCount));if(!eligible.length||band>=2&&!statements.some(s=>s.members.length===2)||band>=1&&!statements.some(s=>!s.is))continue;const target=pick(eligible),trueCount=counts[target],lines=statements.map(s=>s.members.length>1&&!s.is?`あたりは ${s.members.map((i:number)=>people[i]).join(' でも ')} でもないよ`:`あたりは ${s.members.map((i:number)=>people[i]).join(' か ')} ${s.is?'だよ':'ではないよ'}`),compound=statements.filter(s=>s.members.length>1).length,negative=statements.filter(s=>!s.is).length;
   return annotated(choice(people[target],people.filter((_,i)=>i!==target),sceneRow([sceneText(`ほんとうの はなしは ${trueCount}こ`),...lines.map((text,i)=>sceneText(`${i+1}. ${text}`))]),'ひとりを あたりと かりに きめて、ほんとうの はなしを かぞえよう。',{people,statements,trueCount}),{people:n,statements:statements.length,compoundStatements:compound,negativeStatements:negative,extremeTruthCount:trueCount===0||trueCount===statementCount},statements.length+compound*1.5+negative*.5,'compound-truth-count');
  }throw Error('truth-count curriculum generation failed');
 }
 if(id==='zebra'){
  const n=L<=4?3:L<=8?4:L<=14?5:6,solution=shuffle(range(n)),perms=permutations(range(n)),relations:any[]=[],pool:any[]=[];for(let a=0;a<n;a++)for(let b=a+1;b<n;b++){pool.push({op:'sum',a,b,value:solution[a]+solution[b]+2},{op:'difference',a,b,value:Math.abs(solution[a]-solution[b])});if(solution[a]<solution[b])pool.push({op:'before',a,b});else pool.push({op:'before',a:b,b:a});}
  const relationCount=band===0?0:band===1?1:band===2?2:band===3?3:4;for(const r of shuffle(pool))if(relations.length<relationCount&&!relations.some(x=>x.a===r.a&&x.b===r.b))relations.push(r);
  const allowed=range(n).map(i=>range(n).filter(v=>v===solution[i]||int(0,3)<(band>=2?3:2)));let alternatives=perms.filter(p=>p.every((v,i)=>allowed[i].includes(v))&&relations.every(r=>assignmentRuleHolds(p,r)));while(alternatives.length>1){const other=pick(alternatives.filter(a=>!equal(a,solution))),row=pick(range(n).filter(i=>other[i]!==solution[i]));allowed[row]=allowed[row].filter(v=>v!==other[row]);alternatives=perms.filter(p=>p.every((v,i)=>allowed[i].includes(v))&&relations.every(r=>assignmentRuleHolds(p,r)));}
  const initiallyOpen=allowed.filter(a=>a.length>1).length;return annotated(base('assignment',{n,allowed,relations,initial:range(n).map(()=>-1),scene:sceneRow([{type:'assignment'},...relations.map(r=>sceneText(assignmentWords(r)))])},solution,'ひとりに ひとつ。カードの こうほと、ふたりの かんけいを いっしょに みよう。'),{n,relations:relations.length,relationKinds:distinct(relations.map(r=>r.op)),initiallyOpen,totalOptions:sum(allowed.map(a=>a.length))},relations.length*2+initiallyOpen+distinct(relations.map(r=>r.op)),'relational-assignment');
 }
 if(id==='bridges'){
  const w=L<=6?2:L<=15?3:4,h=L<=2?2:L<=6?3:L<=12?3:L<=15?4:4,full=range(w*h).map(i=>[i%w,Math.floor(i/w)]),remove=L%4===1&&full.length>4?[[w-1,h-1]]:L%4===2&&full.length>6?[[w-1,h-1],[0,0]]:[],nodes=full.filter(p=>!remove.some(q=>equal(p,q))),edges:number[][]=[];
  for(let a=0;a<nodes.length;a++)for(let b=a+1;b<nodes.length;b++)if(Math.abs(nodes[a][0]-nodes[b][0])+Math.abs(nodes[a][1]-nodes[b][1])===1)edges.push([a,b]);
  // Remove redundant routes only when all islands remain reachable. This produces sparse and dense graphs.
  const targetCycles=Math.min(edges.length-nodes.length+1,Math.max(1,1+Math.floor((L-1)/4)+(step===3?1:0)));
  for(const e of shuffle([...edges])){if(edges.length-nodes.length+1<=targetCycles)break;const at=edges.indexOf(e),trial=edges.filter((_,i)=>i!==at);if(connectedEdges(nodes.length,trial,trial.map(()=>1)))edges.splice(at,1);}
  const solution=edges.map(()=>0),seen=new Set([0]);while(seen.size<nodes.length){const choices=range(edges.length).filter(i=>seen.has(edges[i][0])!==seen.has(edges[i][1])),e=pick(choices);solution[e]=L<=2?1:int(1,2);edges[e].forEach(v=>seen.add(v));}for(let i=0;i<edges.length;i++)if(!solution[i]&&int(0,4)<(band>=2?2:1))solution[i]=int(1,2);
  const degrees=nodes.map((_,v)=>sum(edges.map((e,i)=>e.includes(v)?solution[i]:0)));return base('edge-grid',{n:Math.max(w,h),nodes,edges,degrees,max:2,initial:edges.map(()=>0),logicCurriculum:true},solution,'すうじを あわせたあと、はなれた しまが ないか たしかめよう。');
 }
 if(id==='rulemachine'){
  const active=band===0?1:band===1?2:3,attrs=['shape','color','count'],chosen=shuffle(attrs).slice(0,active),shift:any={shape:0,color:0,count:0};for(const attr of chosen)shift[attr]=int(1,2);const shifted=(s:any,sh:any)=>symbol((s.shape+sh.shape)%3,(s.color+sh.color)%3,(s.count-1+sh.count)%3+1),inverse=(s:any,sh:any)=>shifted(s,{shape:(3-sh.shape)%3,color:(3-sh.color)%3,count:(3-sh.count)%3});
  const shift2:any={shape:int(1,2),color:int(1,2),count:int(1,2)};if(band>=4){for(const attr of shuffle(attrs).slice(0,2))shift2[attr]=shift[attr];}const layers=band>=4?2:1,reverse=band===3||band===4&&step>=2,keys=[shift,...(layers===2?[shift2]:[])].map((sh,index)=>({name:String.fromCharCode(65+index),examples:range(3).map(i=>{const input=symbol(i,(i+1)%3,(i+2)%3+1);return[input,shifted(input,sh)];})})),target=pick(deck()),answer=reverse?(layers===2?inverse(inverse(target,shift2),shift):inverse(target,shift)):layers===2?shifted(shifted(target,shift),shift2):shifted(target,shift),wrong=deck().filter(v=>!equal(v,answer)).sort((a,b)=>attrs.filter(k=>a[k as keyof typeof a]!==answer[k as keyof typeof answer]).length-attrs.filter(k=>b[k as keyof typeof b]!==answer[k as keyof typeof answer]).length).slice(0,6);
  const scene={type:'machine',examples:keys[0].examples,keys,target,reverse,prompt:layers===2?(reverse?'A → B を とおった あと。はじめは？':'A → B の じゅんに とおすと？'):reverse?'はこを とおった あと。はじめは？':'はこを とおすと？'};
  return annotated(choice(answer,symbolAlternatives(answer,chosen,shuffle),scene,reverse?'さいごの はこから ぎゃくに もどしてみよう。':'かたち・いろ・かずを べつべつに かえてみよう。',{shift,shift2:layers===2?shift2:null,target,layers,reverse}),{changedAttributes:active,layers,reverse,nearMissDistractors:active<3?2:0},active*2+layers*2+(reverse?2:0),'symbol-transform');
 }
 if(id==='familytree'){
  const depth=band===0?2:band<=2?3:4,parents=[-1],depths=[0];let row=[0];for(let y=1;y<=depth;y++){const next:number[]=[],count=int(2,y===1?3:4),order=shuffle(row);for(let k=0;k<count;k++){const parent=order[k%order.length];next.push(parents.length);parents.push(parent);depths.push(y);}row=next;}
  const labels=shuffle(range(parents.length).map(i=>String(i+1))),steps=band===0?1:band===1?2:3,target=pick(range(parents.length).filter(i=>depths[i]>=Math.min(depth,steps)));let answer=target,otherTarget=-1,queryText='',reasoningHops=steps,relation='ancestor';
  if(band<=2){for(let k=0;k<steps;k++)answer=parents[answer];queryText=`${labels[target]} の ${steps}だい まえは？`;}
  else if(band===3){const alternatives=range(parents.length).filter(i=>i!==target&&depths[i]===depths[target]&&parents[i]!==parents[target]);otherTarget=pick(alternatives.length?alternatives:range(parents.length).filter(i=>i!==target&&depths[i]>=2));const ancestors:number[]=[];for(let at=target;at>=0;at=parents[at])ancestors.push(at);answer=otherTarget;let bSteps=0;while(!ancestors.includes(answer)){answer=parents[answer];bSteps++;}reasoningHops=ancestors.indexOf(answer)+bSteps;queryText=`${labels[target]} と ${labels[otherTarget]} の、いちばん ちかい おなじ せんぞは？`;relation='common-ancestor';}
  else {const distance=(other:number)=>{const path:number[]=[];for(let at=target;at>=0;at=parents[at])path.push(at);let at=other,hops=0;while(!path.includes(at)){at=parents[at];hops++;}return hops+path.indexOf(at);};otherTarget=pick(range(parents.length).filter(i=>i!==target&&depths[i]>=3&&parents[i]!==parents[target]&&distance(i)>=3));const path:number[]=[];for(let at=target;at>=0;at=parents[at])path.push(at);let at=otherTarget,hops=0;while(!path.includes(at)){at=parents[at];hops++;}answer=hops+path.indexOf(at);reasoningHops=answer;queryText=`${labels[target]} から ${labels[otherTarget]} まで、せんを なんぼん たどる？`;relation='path-distance';}
  const wrong=relation==='path-distance'?shuffle(range(9).map(i=>i+1).filter(i=>i!==answer)).slice(0,3).map(String):shuffle(range(parents.length).filter(i=>i!==answer)).sort((a,b)=>Math.abs(depths[a]-depths[answer])-Math.abs(depths[b]-depths[answer])).slice(0,3).map(i=>labels[i]);return annotated(choice(relation==='path-distance'?String(answer):labels[answer],wrong,{type:'family',parents,target,otherTarget,steps,labels,queryText},'ひとつの せんは おやと こ。とちゅうの ひとを たしかめながら たどろう。',{parents,target,otherTarget,steps,reasoningHops,relation}),{reasoningHops,relations:band<=2?1:2,treeDepth:depth,relation},reasoningHops+(band<=2?0:2),'family-relation');
 }
 if(id==='settriple'){
  const minVary=band===0?1:band<=2?2:3,count=band===0?6:band===1?7:band===2?8:band===3?9:10,maxSets=band===0?Math.max(1,4-step):band===1||band===4?2:1;let best:any[]=[];
  for(let attempt=0;attempt<3000;attempt++){
   const cards=shuffle(deck()).slice(0,count),sets:number[][]=[];let good=true;
   for(let a=0;a<cards.length&&good;a++)for(let b=a+1;b<cards.length&&good;b++)for(let d=b+1;d<cards.length;d++)if(isSet([cards[a],cards[b],cards[d]])){const s=[a,b,d],vary=['shape','color','count'].filter(k=>new Set(s.map(i=>cards[i][k as keyof typeof cards[0]])).size===3).length;if(vary<minVary){good=false;break;}sets.push(s);}
   if(!good||!sets.length||sets.length>maxSets)continue;best=cards;const easiest=Math.min(...sets.map(s=>['shape','color','count'].filter(k=>new Set(s.map(i=>cards[i][k as keyof typeof cards[0]])).size===3).length));let nearSets=0;for(let a=0;a<cards.length;a++)for(let b=a+1;b<cards.length;b++)for(let d=b+1;d<cards.length;d++)if(['shape','color','count'].filter(k=>new Set([cards[a][k as keyof typeof cards[0]],cards[b][k as keyof typeof cards[0]],cards[d][k as keyof typeof cards[0]]]).size!==2).length===2)nearSets++;
   return annotated(base('card-select',{cards,scene:sceneText('おなじ？ ぜんぶ ちがう？','かたち・いろ・かずを べつべつに')},sets[0],'どの せいしつも「ぜんぶ おなじ」か「ぜんぶ ちがう」に しよう。'),{cards:cards.length,validTriples:sets.length,minVaryingAttributes:easiest,nearSets},easiest*3+Math.log2((cards.length*(cards.length-1)*(cards.length-2)/6)/sets.length)+Math.log2(nearSets+1)*.3,'three-attribute-set');
  }throw Error(`set curriculum generation failed at level ${L}`);
 }
 if(id==='schedule'){
  const n=band===0?(step===0?3:step===1?4:5):band===1?(step<2?4:5):band===2?5:6,solution=shuffle(range(n)),clues:number[][]=[];
  const possible=range(n).flatMap(a=>range(n).filter(b=>b>a).map(b=>[solution[a],solution[b]]));
  if(band===0)clues.push(...shuffle(possible).slice(0,int(1,Math.min(n,step+2))));
  else if(band===1){for(let attempt=0;attempt<100;attempt++){const trial=shuffle(possible).slice(0,int(n-1,n+1)),forkOrJoin=range(n).some(v=>trial.filter(([a])=>a===v).length>1||trial.filter(([,b])=>b===v).length>1);if(connectedEdges(n,trial,trial.map(()=>1))&&forkOrJoin){clues.push(...trial);break;}}if(!clues.length)clues.push(...range(n-1).map(i=>[solution[0],solution[i+1]]));}
  else {for(let i=1;i<n-1;i++){clues.push([solution[0],solution[i]],[solution[i],solution[n-1]]);}clues.push([solution[1],solution[3]]);if(band>=3)clues.push([solution[2],solution[4]]);if(band>=4&&step>=2)clues.push([solution[1],solution[4]]);}
  if(band>=2){const all=permutations(range(n)),possible=range(n).flatMap(a=>range(n).filter(b=>b>a).map(b=>[solution[a],solution[b]]));for(let attempt=0;attempt<80;attempt++){const trial=shuffle(possible).slice(0,Math.min(possible.length,n-1+int(0,band-1)));if(!connectedEdges(n,trial,trial.map(()=>1)))continue;const orders=all.filter(a=>trial.every(([u,v])=>a.indexOf(u)<a.indexOf(v))).length;if(orders<2||orders>(band>=4?8:band===3?14:20))continue;clues.splice(0,clues.length,...trial);break;}}
  // Remove transitive clues: displayed arrows should carry information.
  for(let i=clues.length-1;i>=0;i--){const trial=clues.filter((_,j)=>i!==j),[a,b]=clues[i],seen=new Set([a]),q=[a];for(let k=0;k<q.length;k++)for(const[u,v]of trial)if(u===q[k]&&!seen.has(v)){seen.add(v);q.push(v);}if(seen.has(b))clues.splice(i,1);}
  const displayed=shuffle(clues);return base('arrange',{values:range(n).map(i=>String.fromCharCode(65+i)),clues:displayed,scene:{type:'precedence',clues:displayed,n},logicCurriculum:true},solution,'いま えらべる カードは どれ？ まえに ひつような カードが ぜんぶ ならんだか みよう。');
 }
 if(id==='cipher'){
  const n=band===0?3:6,map=shuffle(range(n)),map2=band>=2?shuffle(range(n)):null,map3=band>=4?shuffle(range(n)):null,maps=[map,...(map2?[map2]:[]),...(map3?[map3]:[])],reverse=band===1||band===3||band===4&&step>=2,message=shuffle(range(n)).slice(0,Math.min(n,band===0?1+Math.min(2,step):2+Math.min(2,step))),decode=(v:number)=>reverse?[...maps].reverse().reduce((v,m)=>m.indexOf(v),v):maps.reduce((v,m)=>m[v],v),correctInitial=message.map(i=>decode(i)+1).join(' '),wrong=range(12).map(()=>message.map(i=>int(1,n)).join(' '));
  if(band>=4&&correctInitial===message.map(i=>i+1).join(' ')){const last=maps[maps.length-1],a=reverse?last.indexOf(message[0]):maps.slice(0,-1).reduce((v,m)=>m[v],message[0]),b=(a+1)%n;[last[a],last[b]]=[last[b],last[a]];}const correct=message.map(i=>decode(i)+1).join(' ');
  const prompt=reverse?'さいごの すうじから、もとの すうじへ もどそう':maps.length===1?'カギで よみかえよう':`カギを 1 → ${range(maps.length-1).map(i=>i+2).join(' → ')} の じゅんに`;
  return annotated(choice(correct,wrong,{type:'cipher',map,map2,maps,message,prompt,reverse},reverse?'さいごの カギから、やじるしを ぎゃくに たどろう。':maps.length===1?'ひとつの カギの やじるしに そって よみかえよう。':'ひとつめの こたえを、つぎの カギに いれよう。',{map,map2,map3,maps,message,reverse}),{layers:maps.length,distinctSymbols:message.length,lookupSteps:maps.length*message.length,reverse},maps.length*message.length+(reverse?maps.length:0),'symbol-composition');
 }
 if(id==='mintree'){
  const n=L<=4?4:L<=8?5:L<=14?6:7,nodes=range(n).map(i=>[Math.cos(-Math.PI/2+i*2*Math.PI/n)*2+2,Math.sin(-Math.PI/2+i*2*Math.PI/n)*2+2]),edges=range(n).map(i=>[i,(i+1)%n]);const candidates=shuffle(range(n).flatMap(a=>range(n).filter(b=>b>a+1&&!(a===0&&b===n-1)).map(b=>[a,b]))),extra=Math.min(n-3,1+band+(step>=2?1:0));
  const crosses=([a,b]:number[],[c,d]:number[])=>{if(a>b)[a,b]=[b,a];if(c>d)[c,d]=[d,c];return a<c&&c<b&&b<d||c<a&&a<d&&d<b;};for(const edge of candidates){if(edges.length>=n+extra)break;if(!edges.some(e=>crosses(edge,e)))edges.push(edge);}
  let weights=edges.map(()=>int(1,band===0?5:9)),solution=edges.map(()=>0);const parent=range(n),root=(i:number):number=>parent[i]===i?i:(parent[i]=root(parent[i]));for(const i of range(edges.length).sort((a,b)=>weights[a]-weights[b])){const[a,b]=edges[i],x=root(a),y=root(b);if(x!==y){parent[x]=y;solution[i]=1;}}
  return base('edge-grid',{n,nodes,edges,weights,minimum:mstWeight(n,edges,weights),max:1,initial:edges.map(()=>0),logicCurriculum:true},solution,'やすい みちでも、わっかに なるなら つながなくて いいよ。');
 }
 // Grid problems retain their recognisable interaction. Solver features choose informative candidates.
 if(['nonogram','minestars','loopclues','islands','tents','binary','circuit','domino'].includes(id)){
  let best:Puzzle|undefined,bestQuality=-Infinity;const tries=id==='loopclues'?24:L<=4?1:10;
  for(let attempt=0;attempt<tries;attempt++){
   const p=fallback(id,L,seed+attempt*1000003);if(!p)continue;const m=logicMetricsRaw(p);let quality=m.score;
   if(id==='minestars')quality=(m.subset||0)*3+(m.hiddenStars||0)-(m.revealedStars||0)*2;
   if(id==='loopclues'){if(m.solutionsCapped2!==1||m.solverAborted)continue;quality=(m.unresolved||0)+m.propagationRounds*2;}
   if(id==='tents')quality=(m.trees||0)-(m.forcedTrees||0)+(m.solutions===1?2:0)+Math.log2(m.solverNodes||1);
   if(id==='circuit')quality=(m.depth||0)+(m.gateKinds||0)*2+(m.branchingSubtrees||0)*2-Math.log2(m.validFraction||1);
   if(id==='domino')quality=(m.trapChoices||0)*3+(m.branchSteps||0)*2-(m.loops||0);
   if(quality>bestQuality){best=p;bestQuality=quality;}if(id==='loopclues'&&L<=4)break;
  }
  if(!best)throw Error(`${id} curriculum generation failed`);
  if(id==='nonogram'){
   // Early clues teach single lines; later puzzles remove this assistance while retaining uniqueness.
   const d=best.data,extra=Math.max(0,3-step)*(band===0?1:band===1?2:band===2?1:0),open=shuffle(range(d.n*d.n).filter(i=>d.given[i]<0));for(const at of open.slice(0,extra))d.given[at]=best.solution[at];d.initial=d.given.map((v:number)=>v<0?0:v);
  }
  if(id==='loopclues'&&L>=9){
   const d=best.data,removeTarget=Math.min(d.clues.length-2,1+Math.floor((L-9)/2));let removed=0;
   for(const at of shuffle(range(d.clues.length))){if(removed>=removeTarget)break;const old=d.clues[at];d.clues[at]=null;const m=logicMetricsRaw(best);if(m.solutionsCapped2===1&&!m.solverAborted)removed++;else d.clues[at]=old;}
  }
  if(id==='islands'&&L<=4){const d=best.data;for(const at of shuffle(range(d.n*d.n).filter(i=>d.given[i]<0&&best!.solution[i]===1)).slice(0,4-L))d.given[at]=1;d.initial=d.given.map((v:number)=>v<0?0:v);}
  return {...best,seed,data:{...best.data,logicCurriculum:true}};
 }
 return fallback(id,L,seed);
}
