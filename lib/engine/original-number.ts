import{context,range,sceneText,sceneRow,sceneGrid,type Puzzle,type Scene}from'./shared.ts';
export const ORIGINAL_NUMBER_IDS=['count','compare','sum','missing','groups','numberpath'];
export const ORIGINAL_NUMBER_HELP:Record<string,string>={
 count:'丸の数を選びます。5・10のまとまりや、並びの空いているところも使って考えましょう。',
 compare:'左と右の丸を比べ、数が多い方を選びます。同じ数もあります。並べ方に惑わされないようにしましょう。',
 sum:'数字のカードを選んで、合計をお題の数に合わせます。正しい組み合わせはどれでも正解です。',
 missing:'足し算・引き算・かけ算の式で、？に入る数を選びます。？の位置にも注目しましょう。',
 groups:'丸のまとまりを使って全部の数を求めます。ばら・空き・違う大きさのまとまりも登場します。×は空きです。',
 numberpath:'表示された順番で数字のカードをタップします。途中から始まる数、飛び数、逆の順番も登場します。',
};
const sum=(a:number[])=>a.reduce((s,v)=>s+v,0);
const tagged=(p:Puzzle,tactic:string,features:Record<string,number|string|boolean>)=>{p.data.progression={tactic,features};return p;};
function subsetStats(values:number[],target:number){let min=99,solutions=0;for(let mask=1;mask<1<<values.length;mask++){const a=values.filter((_,i)=>mask>>i&1);if(sum(a)===target){min=Math.min(min,a.length);solutions++;}}return{min,solutions};}
export function generateOriginalNumber(id:string,level:number,seed:number):Puzzle|undefined{
 if(!ORIGINAL_NUMBER_IDS.includes(id))return;const c=context(id,level,seed),{L,int,pick,shuffle,base,choice}=c,tier=Math.floor((L-1)/4),q=(L-1)%4;
 const numeric=(answer:number,scene:Scene,extra:any={})=>{const wrong=shuffle(range(11).map(i=>answer+i-5).filter(v=>v>=0&&v!==answer)).slice(0,3);return choice(answer,wrong,scene,'まとまりや式の意味を、ひとつずつ確かめよう。',extra);};
 if(id==='count'){
  let count=0,positions:number[]=[],layout='dice',capacity=36,missing=0;
  if(tier===0){count=int(2,Math.min(8,4+q));const patterns=[[7,10,14,21,25,28,31,34],[7,8,13,14,21,22,27,28],[0,2,4,12,14,16,24,26]];positions=shuffle(pick(patterns)).slice(0,count);}
  if(tier===1){count=int(6+q,14+q);positions=range(30).map(i=>Math.floor(i/5)*6+i%5).slice(0,count);layout='fives';}
  if(tier===2){count=int(13+q,20+q);const chunks=shuffle([0,12,24]);positions=chunks.flatMap(start=>range(10).map(i=>start+Math.floor(i/5)*6+i%5)).slice(0,count);layout='tens';}
  if(tier===3){count=int(12,20+q);const areas=shuffle([0,3,18,21]);positions=areas.flatMap(start=>shuffle([0,1,2,6,7,8,12,13,14].filter(i=>start+i<36&&Math.floor((start+i)/6)-Math.floor(start/6)<3).map(i=>start+i))).filter((v,i,a)=>a.indexOf(v)===i).slice(0,count);layout='clusters';count=positions.length;}
  if(tier===4){capacity=pick([24,30,36]);missing=int(3,6+q);count=capacity-missing;positions=shuffle(range(capacity)).slice(0,count);layout='gaps';}
  const visible=new Set(positions),scene=sceneGrid(6,range(capacity).map(i=>visible.has(i)?'●':''),{footer:tier===4?'空いているところも使って考えよう':''});
  return tagged(numeric(count,scene,{count,positions,layout,capacity,missing}),['小さいまとまりを一目でとらえる','5ずつのまとまりを使う','10と残りに分ける','離れたまとまりを合わせる','整った並びの空きを引く'][tier],{quantity:count,layout,capacity,missing});
 }
 if(id==='compare'){
  const a=int(3+tier,Math.min(24,8+tier*3+q)),gap=tier===0?int(1,3):tier===1?int(0,2):int(0,1),b=Math.max(1,a+pick([-1,1])*gap),positionsA=tier<2?range(a):shuffle(range(30)).slice(0,a),positionsB=tier<2?range(b):shuffle(range(30)).slice(0,b);
  const common=tier===4?int(3,Math.min(a,b)-1):0,grid=(positions:number[],label:string,quantity:number)=>sceneRow([sceneText(label),...(common?[sceneText(`${common}このまとまり`),sceneGrid(5,range(quantity-common).map(()=>'●'))]:[sceneGrid(5,range(30).map(i=>positions.includes(i)?'●':''))])]),scene=sceneRow([grid(positionsA,'ひだり',a),grid(positionsB,'みぎ',b)]);
  return tagged(choice(a===b?'おなじ':a>b?'ひだり':'みぎ',['ひだり','おなじ','みぎ'],scene,'同じ数のまとまりをそろえ、残った分を比べよう。',{a,b,common,positionsA,positionsB,layout:tier<2?'aligned':'scattered'}),['一対一で対応させる','同じまとまりをそろえる','少ない差を見つける','並べ方に惑わされず比べる','同じ部分を除いて比べる'][tier],{left:a,right:b,gap,scattered:tier>=2,tie:a===b});
 }
 if(id==='sum'){
  const n=tier===0?4:tier===4?8:6,required=tier<2?2:tier===2?3:4;let values:number[]=[],target=0,solution:number[]=[],stats={min:0,solutions:0};
  for(let attempt=0;attempt<1000;attempt++){values=shuffle(range(tier===0?9:15).map(i=>i+1)).slice(0,n);solution=shuffle(range(n)).slice(0,required);target=sum(solution.map(i=>values[i]));if(tier===1&&target!==10+q*2)continue;stats=subsetStats(values,target);if(stats.min===required)break;}
  return tagged(base('multiselect',{values,target,scene:sceneText(String(target),'合わせてこの数にしよう')},solution,'全部の合計から、選ばない数を引く方法もあるよ。'),['二枚で目標を作る','10のまとまりを使う','三枚の組み合わせを選ぶ','余りから逆に考える','四枚と補数を組み合わせる'][tier],{cards:n,minPicks:stats.min,solutions:stats.solutions,complementCards:n-required});
 }
 if(id==='missing'){
  let a=int(2,8),b=int(2,8),op='+',blank='right';if(tier===0){a=int(1,5+q);b=int(1,5+q);}if(tier===1){a=int(5,9);b=int(10-a,9);}if(tier===2){a=int(1,3)*10+int(0,3);b=int(a%10+1,9);op='−';}if(tier===3){a=int(2,6+q);b=int(2,9);op='×';}if(tier===4){op=pick(['+','−','×']);if(op==='−'&&a<b)[a,b]=[b,a];blank=pick(['left','right','total']);}
  const total=op==='+'?a+b:op==='−'?a-b:a*b,answer=blank==='left'?a:blank==='total'?total:b,display=`${blank==='left'?'？':a} ${op} ${blank==='right'?'？':b} ＝ ${blank==='total'?'？':total}`;
  return tagged(numeric(answer,sceneText(display),{a,b,op,total,blank,answer}),['足し算の足りない分を考える','10をまたぐ数を分ける','引き算を逆にたどる','かけ算とわり算の関係を使う','式の違う位置の空欄を求める'][tier],{operation:op,blank,carry:tier===1,borrow:tier===2});
 }
 if(id==='groups'){
  const groups=int(2,tier===1?5+q:Math.min(5,3+Math.floor(q/2))),each=tier===1?pick([5,10]):int(2,6+Math.floor(q/2)),loose=tier===2?int(1,each-1):0,missing=tier===3?int(1,each-1):0,secondaryGroups=tier===4?int(1,3):0,secondaryEach=tier===4?pick(range(6).map(i=>i+2).filter(v=>v!==each)):0;
  const boxes:Scene[]=range(groups).map((_,i)=>sceneGrid(each<=4?2:5,range(each).map((_,j)=>i===groups-1&&j>=each-missing?'×':'●')));if(loose)boxes.push(sceneRow([sceneText('ばら'),sceneGrid(Math.min(loose,5),range(loose).map(()=>'●'))]));for(let i=0;i<secondaryGroups;i++)boxes.push(sceneGrid(secondaryEach<=4?2:5,range(secondaryEach).map(()=>'●')));
  const answer=groups*each+loose-missing+secondaryGroups*secondaryEach;
  return tagged(numeric(answer,sceneRow(boxes,{layout:'groups'}),{groups,each,loose,missing,secondaryGroups,secondaryEach}),['同じ数のまとまりを数える','5や10のまとまりを使う','最後の余りも合わせる','空いている分を引く','二種類のまとまりを合わせる'][tier],{groups,each,loose,missing,secondaryGroups,secondaryEach,operations:1+Number(!!loose)+Number(!!missing)+Number(!!secondaryGroups)});
 }
 if(id==='numberpath'){
  const length=tier===0?int(4,10+q):tier===1?8+q:tier===2?8+q:tier===3?9+q:10+q,start=tier===0?1:tier===1?int(2,15):tier===2?int(1,6):tier===3?int(length*2,length*2+12):int(1,12),step=tier<2?1:tier===2?pick([2,5]):tier===3?-pick([1,2]):pick([3,4,6,7]),sequence=range(length).map(i=>start+i*step),values=shuffle(sequence),solution=sequence.map(v=>values.indexOf(v)),prompt=`${start}から ${Math.abs(step)}ずつ${step>0?'ふえる':'へる'}順に`;
  return tagged(base('arrange',{values,sequence,start,step,scene:sceneText(prompt),n:Math.ceil(Math.sqrt(length))},solution,'次の数を確かめてからタップしよう。'),['1ずつ進む数を見つける','途中の数から順に進む','2ずつ・5ずつ進む','大きい方から戻る','同じ差で続く数を見つける'][tier],{taps:length,start,step,descending:step<0});
 }
}
export function checkOriginalNumber(p:Puzzle,answer:any){
 if(p.id==='sum')return Array.isArray(answer)&&answer.length>0&&new Set(answer).size===answer.length&&answer.every(i=>Number.isInteger(i)&&i>=0&&i<p.data.values.length)&&sum(answer.map(i=>p.data.values[i]))===p.data.target;
 if(p.id==='numberpath')return Array.isArray(answer)&&answer.length===p.data.sequence.length&&new Set(answer).size===answer.length&&answer.every((i,j)=>Number.isInteger(i)&&i>=0&&i<p.data.values.length&&p.data.values[i]===p.data.sequence[j]);
 return Number.isInteger(answer)&&answer===p.solution;
}
