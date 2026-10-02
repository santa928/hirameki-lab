import {context,range,equal,sceneText,sceneRow,sceneGrid,type Puzzle,type Meta,type Scene} from './shared.ts';
export const NUMBER_META:Meta[]=[
 ['placevalue','たばと ばら','number','たばを かずに してみよう','10のまとまりと1の数を見て、全部の数を選びます。100・1000の位や、10個以上のばらも登場します。'],
 ['fractionline','ぶんすうの みち','number','ほしは どの ぶんすう？','数直線の星の位置を分数で選びます。1より大きい数や、0以外から始まる線も登場します。'],
 ['fairshare','わけっこ おやつ','number','ひとりに いくつ わたせる？','みんなに同じ数ずつ配ります。一人分を選びましょう。余りや先によけるおやつは配りません。'],
 ['clock','とけいの じかん','number','とけいを よんで かんがえよう','短い針が時、長い針が分。時計の時刻や、指定された分だけ前・後の時刻を選びます。'],
 ['mincoins','ぴったり コイン','number','いちばん すくない まいすうで','コインをタップしてお題の金額を作ります。枚数をいちばん少なくしましょう。特別な金額のコインも登場します。'],
 ['fractions','ぶんすう くらべ','number','いろの わりあいが おおいのは？','同じ大きさの円です。色がついた割合がいちばん大きいものを選びます。'],
 ['factors','かけて ぴったり','number','ふたつを かけて おだいの かず','二つのカードを選び、かけ算でお題の数を作ります。上級では積が合う組の中で、差が一番小さい組を選びます。式のお題も登場します。'],
 ['expressions','けいさん スイッチ','number','しるしを かえて ぴったりに','＋・−・×を切り替えます。かっこの順に、左から計算してお題の数に合わせます。'],
 ['digitorder','すうじの ならべかえ','number','じょうけんに あう かずを つくろう','カードを順にタップして、表示された条件に合う最大・最小の数を作ります。一番左に0は置けません。'],
 ['rounding','だいたい いくつ？','number','ちかい まとまりは どれ？','指定されたまとまりで近い方を選びます。ちょうど真ん中なら大きい方です。式のお題は先に計算します。'],
 ['divisibility','あまり ゼロ','number','わりきれる かずを ぜんぶ','指定された数で割って余りが0になるカードを全部選びます。二つの数の両方で割り切れる問題も登場します。'],
 ['gcd','おなじ ながさ','number','いちばん ながく そろえると？','リボンを、余りなく同じ長さに切ります。全部のリボンに使える、一番長い一片を選びます。'],
 ['lcm','また あう とき','number','つぎに いっしょに なるのは？','ライトが決まった間隔で点きます。次に全部一緒に点くのは何秒後でしょう。点き始める時刻にも注目します。'],
 ['median','まんなかの かず','number','じゅんに ならべた まんなかは？','小さい順に並べた真ん中の数を選びます。枚数が偶数なら、真ん中の2枚の平均です。同じ数も一枚ずつ数えます。'],
 ['mean','たいらに わけよう','number','おなじ たかさに すると？','全部を同じ高さにしたときの高さを考えます。指定された平均にするための、隠れた一本の高さを求める問題も登場します。'],
 ['probability','どれくらい でる？','number','でる わりあいを かんがえよう','どの札も同じ確率で出ます。表示された条件が起こる割合を分数で選びます。続けて引くときは札を戻すかにも注目します。'],
 ['routecount','みちの かぞえかた','number','ゴールまで なんとおり？','右か下にだけ進めます。ふさがったマスを避け、表示された通過条件を守って星に着く道の数を考えます。'],
 ['alphametic','すうじ あんごう','number','かたちに かくれた かずは？','同じ形には同じ一桁の数が入ります。二つの式を手がかりに、お題の数を答えます。違う形に同じ数字が入ることもあります。'],
];
export const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const lcm=(a:number,b:number)=>a*b/gcd(a,b);
const sum=(a:number[])=>a.reduce((s,v)=>s+v,0);
const unique=<T>(a:T[])=>[...new Set(a)];
export function calculate(values:number[],ops:string[]){return values.slice(1).reduce((a,b,i)=>ops[i]==='+'?a+b:ops[i]==='−'?a-b:ops[i]==='×'?a*b:NaN,values[0]);}
export function coinSolution(target:number,denoms:number[]){const dp=Array(target+1).fill(Infinity),prev=Array(target+1).fill(-1);dp[0]=0;for(let i=1;i<=target;i++)denoms.forEach((v,j)=>{if(v<=i&&dp[i-v]+1<dp[i]){dp[i]=dp[i-v]+1;prev[i]=j;}});const counts=denoms.map(()=>0);for(let x=target;x>0;){const j=prev[x];if(j<0)throw Error('No coin solution');counts[j]++;x-=denoms[j];}return counts;}
export function routeWays(n:number,blocked:number[]){return routeCount(n,blocked,0,n*n-1,[],'all');}
export function routeCount(n:number,blocked:number[],start:number,end:number,marks:number[],condition:'all'|'one'='all'){
 const states=range(n*n).map(()=>Array(1<<marks.length).fill(0)),bit=(i:number)=>marks.includes(i)?1<<marks.indexOf(i):0;states[start][bit(start)]=1;
 for(let i=start;i<=end;i++)if(!blocked.includes(i))for(let mask=0;mask<1<<marks.length;mask++)if(states[i][mask])for(const to of [i%n<n-1?i+1:-1,i+n<n*n?i+n:-1])if(to>=0&&to<=end&&!blocked.includes(to))states[to][mask|bit(to)]+=states[i][mask];
 return condition==='one'?states[end].reduce((s,v,mask)=>s+((mask===1||mask===2)?v:0),0):states[end][(1<<marks.length)-1];
}
const allOperators=(n:number,available:string[]):string[][]=>n?allOperators(n-1,available).flatMap(a=>available.map(op=>[...a,op])):[[]];
const permutations=(values:number[]):number[][]=>values.length?values.flatMap((v,i)=>permutations(values.filter((_,j)=>j!==i)).map(a=>[v,...a])):[[]];
const fractionText=(a:number,b:number,reduce=false)=>{const g=reduce?gcd(a,b):1;return `${a/g}/${b/g}`;};
function numberChoice(c:ReturnType<typeof context>,answer:number,wrong:number[],scene:Scene,hint:string,extra:any={}){const candidates=unique(wrong.filter(v=>Number.isFinite(v)&&v>=0&&v!==answer));for(let d=1;candidates.length<3;d++)for(const v of [answer-d,answer+d])if(v>=0&&v!==answer&&!candidates.includes(v))candidates.push(v);return c.choice(answer,candidates,scene,hint,extra);}
function fractionalChoice(c:ReturnType<typeof context>,a:number,b:number,scene:Scene,hint:string,extra:any={},reduce=false){const answer=fractionText(a,b,reduce),wrong=unique([a-1,a+1,b-a,a-2,a+2,0,b].filter(x=>x>=0&&x!==a).map(x=>fractionText(x,b,reduce)));return c.choice(answer,wrong,scene,hint,{a,b,...extra});}
function tagged(p:Puzzle,tactic:string,features:Record<string,number|string|boolean>){p.data.progression={tactic,features};return p;}

// Rectangular clue-value sets: both clue marginals are balanced in all four options.
// Every retained clue pair has exactly one assignment in the full digit domain.
type CryptoEntry={x:number;y:number;digits:number[];answer:number};
type CryptoRectangle={entries:CryptoEntry[]};
const cryptoCache=new Map<string,CryptoRectangle[]>();
function cryptoClues(d:number[],family:number,k:number):[number,number]{const[a,b,z]=d;return family===0?[a+b,a-b]:family===1?[a+b,a+k*b]:family===2?[11*(a+b),a-b]:family===3?[10*a+11*b+z,a+z]:[(10*a+b)*z,a+z];}
function cryptoRectangles(family:number,max:number,k:number){const key=`${family}/${max}/${k}`;let cached=cryptoCache.get(key);if(cached)return cached;
 const entries:CryptoEntry[]=[],seen=new Map<string,CryptoEntry[]>(),dims=family>=3?3:2;
 for(let a=1;a<=max;a++)for(let b=1;b<=max;b++)for(let z=dims===3?1:0;z<=(dims===3?max:0);z++){const ds=dims===3?[a,b,z]:[a,b],[x,y]=cryptoClues(ds,family,k);if(y<0)continue;const entry={x,y,digits:ds,answer:Number(ds.join(''))},key=`${x}/${y}`;seen.set(key,[...(seen.get(key)||[]),entry]);}
 for(const es of seen.values())if(es.length===1)entries.push(es[0]);
 const rows=new Map<number,Map<number,CryptoEntry>>();for(const e of entries){if(!rows.has(e.x))rows.set(e.x,new Map());rows.get(e.x)!.set(e.y,e);}
 const xs=[...rows.keys()].sort((a,b)=>a-b),rectangles:CryptoRectangle[]=[];
 for(let i=0;i<xs.length;i++)for(let j=i+1;j<xs.length;j++){const a=rows.get(xs[i])!,b=rows.get(xs[j])!,ys=[...a.keys()].filter(y=>b.has(y));for(let u=0;u<ys.length;u++)for(let v=u+1;v<ys.length;v++){const es=[a.get(ys[u])!,a.get(ys[v])!,b.get(ys[u])!,b.get(ys[v])!];if(unique(es.map(e=>e.answer)).length===4)rectangles.push({entries:es});}}
 if(!rectangles.length)throw Error(`No crypto rectangles ${key}`);cryptoCache.set(key,rectangles);return rectangles;
}

export function generateNumber(id:string,level:number,seed:number):Puzzle|undefined{
 if(!NUMBER_META.some(m=>m[0]===id))return;const c=context(id,level,seed),{L,int,pick,shuffle,base,choice}=c,q=(L-1)%4,tier=Math.floor((L-1)/4);
 if(id==='placevalue'){
  const count=tier<1?2:tier<3?3:4,digits=range(count).map((_,i)=>int(i?0:1,tier===0?5:9));if(tier===1)digits[int(1,count-1)]=0;
  const shown=[...digits],usedPlaces=new Set<number>();for(let i=0;i<(tier===4?2:tier===3?1:0);i++){const places=range(count-1).map(j=>j+1).filter(at=>shown[at-1]>0&&!usedPlaces.has(at));const at=pick(places.length?places:range(count-1).map(j=>j+1).filter(at=>shown[at-1]>0));usedPlaces.add(at);shown[at-1]--;shown[at]+=10;}
  const answer=shown.reduce((s,v)=>s*10+v,0),canonical=String(answer).padStart(count,'0').split('').map(Number),alternative=canonical.map((v,i)=>pick(range(tier===0?6:10).filter(w=>w!==v&&(i>0||w>0))));
  const code=(row:number,column:number)=>column%3===0?row&1:column%3===1?(row>>1)&1:((row&1)^((row>>1)&1));
  const options=shuffle(range(4).map(row=>canonical.reduce((a,v,i)=>a*10+(code(row,i)?alternative[i]:v),0)));const p={...base('visual-choice',{digits:shown,canonical,scene:{type:'abacus',digits:shown}},options.indexOf(answer),'どの位も確かめよう。10こ集まると、ひとつ上の位に1こ移せるよ。'),options};
  return tagged(p,['十と一を合わせる','0の位を残す','三つの位を合わせる','10こを上の位にまとめる','二つの位でまとめ直す'][tier],{places:count,requiredColumns:2,regroupColumns:shown.filter(v=>v>=10).length,zeroColumns:shown.filter(v=>v===0).length,bundles:sum(shown)});
 }
 if(id==='fractionline'){
  const b=tier===2||tier===4?pick([4,6,8,9,10,12].filter(v=>v<=Math.min(12,4+tier*2+q))):int(tier===0?2:tier===1?5:3,Math.min(12,4+tier*2+q)),span=tier===3?2:1,min=tier===4?int(1,2+Math.floor(q/2)):0;
  let at=tier===2||tier===4?pick(range(b-1).map(i=>i+1).filter(v=>gcd(v,b)>1)):int(1,b*span-1);if(tier===1&&at*2===b)at=Math.min(b-1,at+1);const a=min*b+at,reduce=tier===2||tier===4;
  return tagged(fractionalChoice(c,a,b,{type:'numberline',min,max:min+span,steps:b*span,at,label:'★'},'線の左端の数と、1を何等分したかを確かめよう。',{min,span,at,reduce},reduce),['等分を数える','半分以外の位置を読む','同じ大きさの分数を見つける','1を超える分数を読む','0以外から始まる線を読む'][tier],{denominator:b,origin:min,span,stepsFromEndpoint:Math.min(at,b*span-at),simplify:gcd(a,b),representation:reduce?'reduced':'partition'});
 }
 if(id==='fairshare'){
  const groups=int(2,Math.min(6,3+tier+Math.floor(q/2))),each=int(2,Math.min(9,4+tier+q)),rest=tier?int(1,groups-1):0,reserved=tier>=3?int(1,3+q):0,total=groups*each+rest,shown=total+reserved;
  let scene:Scene={type:'share',total:shown,groups};let packs=0,perPack=0,loose=0;
  if(tier>=2&&tier!==3){perPack=int(3,5+Math.floor(q/2));packs=Math.floor(shown/perPack);loose=shown%perPack;scene=sceneRow([sceneText(`${perPack}こ入りが ${packs}ふくろ${loose?` と ${loose}こ`:''}`),...(reserved?[sceneText(`${reserved}こは さきに よける`)]:[]),sceneText(`${groups}にんに 同じ数ずつ`)]);}
  if(tier===3)scene=sceneRow([sceneText(`全部で ${shown}こ`),sceneText(`${reserved}こを よけて、${groups}にんに分ける`)]);
  return tagged(numberChoice(c,each,[each-1,each+1,Math.ceil(shown/groups),Math.floor(shown/groups),rest,groups],scene,'配る分を先に求め、人数で分けるよ。余りは配らないよ。',{groups,total,rest,reserved,packs,perPack,loose}),['同じ数ずつ配る','余りを分けて考える','袋の中も合わせて配る','先によけてから配る','袋・ばら・よける分を整理する'][tier],{groups,each,remainder:rest,reserved,packSize:perPack,loose,steps:tier<2?1:tier===2?2:3});
 }
 if(id==='clock'){
  const minutePool=tier===0?[0,30]:tier===1?[15,45]:tier===2?[5,10,20,25,35,40,50,55]:range(60).filter(m=>m%5!==0);
  const hour=int(1,12),minute=pick(minutePool),elapsed=tier===4?(q===3?-int(15,55):q===0?int(5,25):int(25,70)):0;
  const clockTotal=(hour%12*60+minute+elapsed+720)%720,answerHour=Math.floor(clockTotal/60)||12,answerMinute=clockTotal%60;
  const altHour=((answerHour-1+pick(q>=2?[1,11]:[1,2,3,9,10,11]))%12)+1;
  const wrongMinutes=(tier<3?minutePool:range(60)).filter(m=>m!==answerMinute),altMinute=pick(wrongMinutes),fmt=(h:number,m:number)=>`${h}:${String(m).padStart(2,'0')}`;
  const clock:Scene={type:'clock',hour,minute},scene=elapsed?sceneRow([clock,sceneText(`${Math.abs(elapsed)}ふん${elapsed<0?'まえ':'あと'}は？`)]):clock;
  return tagged(choice(fmt(answerHour,answerMinute),[fmt(altHour,answerMinute),fmt(answerHour,altMinute),fmt(altHour,altMinute)],scene,'短い針は時、長い針は分。60分で時がひとつ進むよ。',{hour,minute,elapsed,answerHour,answerMinute}),['時と30分を読む','15分と45分を読む','5分ずつ数える','1分の目盛りを読む','前後の時刻を考える'][tier],{minute,precision:tier<3?30/(tier+1):1,elapsed:Math.abs(elapsed),backward:elapsed<0,hourBoundary:Math.floor((minute+elapsed)/60)!==0,hourAlternativeDistance:Math.min(Math.abs(answerHour-altHour),12-Math.abs(answerHour-altHour)),minuteAlternativeDistance:Math.min(Math.abs(answerMinute-altMinute),60-Math.abs(answerMinute-altMinute))});
 }
 if(id==='mincoins'){
  const custom=[[1,3,4],[1,4,6],[1,5,7],[1,6,9]],advanced=[[1,4,7,9],[1,5,8,11],[1,6,9,13],[1,4,10,13]],denoms=tier===0?[1,5]:tier===1?[1,5,10]:tier===2?[1,5,10,50]:tier===3?custom[q]:advanced[q];
  const greedy=(target:number)=>{let amount=target,coins=0;for(const v of [...denoms].sort((a,b)=>b-a)){coins+=Math.floor(amount/v);amount%=v;}return coins;};
  const candidates=range(tier<3?100:48).map(i=>i+3).filter(t=>tier===0?t<=18:tier===1?t>=10&&t<=38:tier===2?t>=50&&t<=99:greedy(t)>sum(coinSolution(t,denoms)));
  const target=pick(candidates.filter(v=>tier===0&&q===1?v>=5:true)),solution=coinSolution(target,denoms),minimum=sum(solution),greedyCount=greedy(target),initial=denoms.map(()=>0);let taskMode='build',task='最少の枚数で作ろう';
  if(tier<3&&q===1){for(let i=0;i<initial.length;i++)initial[i]=solution[i];const at=pick(range(denoms.length-1).map(i=>i+1).filter(i=>initial[i]>0));initial[at]--;initial[at-1]+=denoms[at]/denoms[at-1];taskMode='exchange';task='金額を変えずに、コインを交換して枚数を減らそう';}
  if(tier<3&&q===2){for(let i=0;i<initial.length;i++)initial[i]=solution[i];initial[0]+=int(1,4);taskMode='remove-surplus';task='多すぎる分を引いて、最少の枚数にしよう';}
  if(tier<3&&q===3){for(let i=0;i<initial.length;i++)initial[i]=solution[i];const take=pick(range(initial.length).filter(i=>initial[i]>0)),add=pick(range(initial.length).filter(i=>i!==take));initial[take]--;initial[add]+=int(1,3);taskMode='repair';task='足すコインと引くコインを考えて、最少にしよう';}
  if(tier>=3){let amount=target;for(let i=denoms.length-1;i>=0;i--){initial[i]=Math.floor(amount/denoms[i]);amount%=denoms[i];}taskMode='improve-greedy';task='今の金額のまま、もっと少ない枚数にできるよ';}
  let optimal=[...solution],bestEdits=Infinity;const candidate=denoms.map(()=>0);function searchCoins(at:number,amount:number,coins:number){if(at===denoms.length-1){if(amount!==coins*denoms[at])return;candidate[at]=coins;const edits=sum(candidate.map((v,i)=>Math.abs(v-initial[i])));if(edits<bestEdits){bestEdits=edits;optimal=[...candidate];}return;}for(let count=0;count<=Math.min(coins,Math.floor(amount/denoms[at]));count++){candidate[at]=count;searchCoins(at+1,amount-count*denoms[at],coins-count);}}searchCoins(0,target,minimum);
  const additions=sum(optimal.map((v,i)=>Math.max(0,v-initial[i]))),removals=sum(optimal.map((v,i)=>Math.max(0,initial[i]-v)));
  return tagged(base('coins',{denoms,target,initial,scene:sceneRow([{type:'coins',target,denoms},sceneText(task)]),minimum,taskMode},optimal,tier<3?'大きいコインに交換すると枚数が減るか、確かめよう。':'大きいコインから選ぶだけでは最少にならないよ。残りの作り方も比べよう。'),['1と5を交換する','10を使うか考える','50と小さいコインを合わせる','大きいコインを使わない方も比べる','何種類かの組み合わせを比べる'][tier],{denominations:denoms.length,usedDenominations:optimal.filter(Boolean).length,minimumCoins:minimum,greedyGap:greedyCount-minimum,target,taskMode,initialAmount:sum(initial.map((v,i)=>v*denoms[i])),initialCoins:sum(initial),indispensableAdditions:additions,indispensableRemovals:removals});
 }
 if(id==='fractions'){
  let items:{type:string;a:number;b:number}[]=[];
  for(let attempt=0;attempt<500;attempt++){
   if(tier===0){const b=5+q;items=shuffle(range(b-1).map(i=>({type:'fraction',a:i+1,b}))).slice(0,4);}
   else if(tier===1){const a=1+Math.floor(q/2);items=shuffle(range(10-a).map(i=>({type:'fraction',a,b:a+1+i}))).slice(0,4);}
   else{const pool=range(11).flatMap(i=>range(i+1).map(j=>({type:'fraction',a:j+1,b:i+2})));items=shuffle(pool).filter((v,i,a)=>a.findIndex(w=>w.a*v.b===v.a*w.b)===i).slice(0,4);}
   if(items.length!==4)continue;const sorted=[...items].sort((a,b)=>b.a/b.b-a.a/a.b),gap=sorted[0].a/sorted[0].b-sorted[1].a/sorted[1].b,above=items.filter(v=>v.a*2>v.b).length;
   if(tier===2&&above!==1||tier===3&&(gap>1/(6+q)||above<2)||tier===4&&(gap>1/(18+q*3)||unique(items.map(v=>v.b)).length<3||sorted[0].a===Math.max(...items.map(v=>v.a))))continue;break;
  }
  const sorted=[...items].sort((a,b)=>b.a/b.b-a.a/a.b),winner=sorted[0],gap=winner.a/winner.b-sorted[1].a/sorted[1].b;
  return tagged(choice(winner,items.filter(v=>v!==winner),sceneText('いちばん おおいのは？','どれも同じ大きさの円だよ'),'半分や1まであといくつかを使って比べよう。'),['分け方が同じ分数を比べる','分子が同じ分数を比べる','半分を目印に比べる','近い分数を同じ物差しで比べる','1までの残りも使って比べる'][tier],{denominatorKinds:unique(items.map(v=>v.b)).length,winnerGap:gap,commonDenominator:items.reduce((a,v)=>lcm(a,v.b),1),aboveHalf:items.filter(v=>v.a*2>v.b).length});
 }
 if(id==='factors'){
  let a=int(tier===0?2:tier===1?4:5,tier===0?5:tier===1?8:12),b=pick(range(Math.min(15,a+4)-(a===12?7:a+1)+1).map(i=>i+(a===12?7:a+1)).filter(v=>v!==a)),target=a*b;
  let factorCards:number[]=[];const closest=tier>=3;
  if(closest){const targets=[24,30,36,40,48,54,60,72,80,84,90,96,108,120,144];target=pick(targets);const pairs=range(28).map(i=>i+2).filter(v=>target%v===0&&v<target/v&&target/v<=30).map(v=>[v,target/v]);factorCards=shuffle(pairs).slice(0,3).flat();[a,b]=pairs.reduce((best,pair)=>pair[1]-pair[0]<best[1]-best[0]?pair:best);factorCards=unique([a,b,...factorCards]);}
  const divs=range(target-2).map(i=>i+2).filter(v=>target%v===0&&v!==a&&v!==b&&v<=30),wrong=shuffle(range(29).map(i=>i+2).filter(v=>v!==a&&v!==b));
  const distractors=tier>=2?[...factorCards,...shuffle(divs),...wrong]:wrong,values=shuffle(unique([a,b,...distractors]).slice(0,tier===0?6:8));let expression=String(target),operations=0;
  if(tier===4){const delta=int(3,12);expression=q%2?`${target+delta} − ${delta}`:`${target-delta} ＋ ${delta}`;operations=1;}
  const pairs=range(values.length).flatMap(i=>range(values.length-i-1).map(j=>[i,i+1+j])).filter(([i,j])=>values[i]*values[j]===target),minimumGap=Math.min(...pairs.map(([i,j])=>Math.abs(values[i]-values[j]))),solution=closest?pairs.find(([i,j])=>Math.abs(values[i]-values[j])===minimumGap)!:[values.indexOf(a),values.indexOf(b)];
  return tagged(base('pairselect',{values,target,closest,minimumGap,scene:sceneText(expression,closest?'かけてお題に。差が一番小さい組を選ぼう':'ふたつを かけて つくろう')},solution,closest?'積が合う組を探し、二つの数の差を比べよう。':'割り切れるだけでなく、残りの相手のカードもあるか確かめよう。'),['小さいかけ算の組を探す','かけ算の相手を見つける','約数の中から相手を選ぶ','積が同じ組の差を比べる','式のお題と組の差を合わせて考える'][tier],{cardCount:values.length,dividingCards:values.filter(v=>target%v===0).length,solutionPairs:pairs.length,minimumFactor:Math.min(...pairs.map(([i,j])=>Math.min(values[i],values[j]))),closest,minimumGap,operations,target});
 }
 if(id==='expressions'){
  const n=tier<2?3:tier<4?4:5,available=tier===0?['+','−']:['+','−','×'],all=allOperators(n-1,available);let values:number[]=[],ops:string[]=[],target=0,valid:string[][]=[];
  for(let attempt=0;attempt<1200;attempt++){values=range(n).map(()=>int(2,Math.min(9,4+q+tier)));ops=range(n-1).map(()=>pick(available));target=calculate(values,ops);if(target<0||target>300)continue;
   valid=all.filter(a=>calculate(values,a)===target);if(!valid.length)continue;
   const minKinds=Math.min(...valid.map(a=>unique(a).length)),allPlus=valid.some(a=>a.every(op=>op==='+')),hasTimes=valid.every(a=>a.includes('×')),hasMinus=valid.every(a=>a.includes('−'));
   if(tier===0&&q>0&&(!hasMinus||q>1&&minKinds<2)||tier===1&&!hasTimes||tier>=2&&(minKinds<2||allPlus)||tier===3&&(!hasTimes||!hasMinus)||tier===4&&(minKinds<3||!hasTimes||!hasMinus))continue;break;
  }
  return tagged(base('operators',{values,target,available,initial:range(n-1).map(()=>'?'),scene:{type:'expression',values,target}},ops,'左から計算するよ。途中の数を考えて、必要な符号を選ぼう。'),['足す・引くを選ぶ','かけ算を使う場所を選ぶ','四つの数をつなぐ','足し引きとかけ算を組み合わせる','五つの数で三種類の符号を使う'][tier],{operands:n,searchSpace:all.length,solutions:valid.length,minOperatorKinds:Math.min(...valid.map(a=>unique(a).length)),multiplyRequired:valid.every(a=>a.includes('×')),subtractRequired:valid.every(a=>a.includes('−')),allPlusSolution:valid.some(a=>a.every(op=>op==='+'))});
 }
 if(id==='digitorder'){
  const n=tier===0?3:tier<3?4:5;let values=shuffle(range(10)).slice(0,n);if(tier===1||tier===2){values[0]=0;values=shuffle(unique(values));while(values.length<n){const v=int(1,9);if(!values.includes(v))values.push(v);}}
  if(tier===3){values[0]=values[1];values=shuffle(values);}let small=tier===2||tier===3&&q%2===1||tier===4&&q%2===1;
  let condition='',endTest=(v:number)=>true;if(tier===4){if(q===0){condition='偶数で ';endTest=v=>v%2===0;if(!values.some(v=>v%2===0))values[0]=2;}if(q===1){condition='奇数で ';endTest=v=>v%2===1;if(!values.some(v=>v%2===1))values[0]=3;}if(q>=2){condition='5で割り切れて ';endTest=v=>v%5===0;if(!values.some(v=>v===0||v===5))values[0]=5;}}
  const candidates=unique(permutations(values).filter(a=>a[0]!==0&&endTest(a.at(-1)!)).map(a=>Number(a.join('')))).sort((a,b)=>a-b),target=small?candidates[0]:candidates.at(-1)!,digits=String(target).split('').map(Number),used=new Set<number>(),solution=digits.map(v=>{const i=values.findIndex((w,j)=>w===v&&!used.has(j));used.add(i);return i;});
  return tagged(base('arrange',{values,target,small,scene:sceneText(`${condition}${small?'いちばん ちいさく':'いちばん おおきく'}`,'さいしょに0は置けないよ')},solution,'左の位を優先しよう。条件があるときは、最後に置く数字も先に考えよう。'),['大きい位から選ぶ','0を含むカードを並べる','0を先頭にしない最小を作る','同じ数字も一枚ずつ使う','末尾の条件と大小を両立する'][tier],{digits:n,small,zero:values.includes(0),repeated:n-unique(values).length,terminalConstraint:tier===4,validPermutations:candidates.length});
 }
 if(id==='rounding'){
  const unit=tier===1||tier===3||tier===4&&q>=2?100:10,baseValue=int(1,tier<2?9:20)*unit,near=tier>=2?int(-Math.max(1,4-q),Math.max(1,4-q)):int(-unit/2+1,unit/2-1),n=baseValue+unit/2+near,answer=Math.floor((n+unit/2)/unit)*unit;
  let shown=String(n),steps=0;if(tier===4){const delta=int(3,19);shown=q%2?`${n+delta} − ${delta}`:`${n-delta} ＋ ${delta}`;steps=1;}
  const scene:Scene=tier<2?{type:'numberline',min:baseValue,max:baseValue+unit,steps:10,at:(n%unit)/unit*10,label:String(n)}:sceneText(shown,`${unit}のまとまりで ちかい方は？`);
  return tagged(choice(answer,range(5).map(i=>baseValue+(i-2)*unit).filter(v=>v>=0&&v!==answer),scene,'真ん中の数と比べよう。ちょうど真ん中なら大きい方だよ。',{n,unit,expression:shown}),['数直線で10のまとまりにする','数直線で100のまとまりにする','数だけを見て10のまとまりにする','境目と切り上がりを考える','計算してから丸める'][tier],{unit,scaffold:tier<2,midpointDistance:Math.abs((n%unit)-unit/2),midpoint:near===0,operations:steps,carryBoundary:answer%1000===0});
 }
 if(id==='divisibility'){
  const lists=[[2,5,10,2],[3,9,3,9],[4,8,4,8],[6,12,6,12]],conditions=tier===4?[[2,3],[3,4],[4,6],[5,6]][q]:[lists[tier][q]],divisor=conditions.reduce(lcm),count=tier<1?5:tier<3?6:8,max=divisor*(tier<2?8:10);
  const positives=shuffle(range(Math.floor(max/divisor)).map(i=>(i+1)*divisor)).slice(0,int(2,count-3));const near=positives.flatMap(v=>[v-1,v+1]),neg=shuffle(range(max).map(i=>i+1).filter(v=>v%divisor));
  const values=shuffle([...positives,...unique([...(tier>=2?shuffle(near):[]),...neg]).filter(v=>v>0&&v%divisor).slice(0,count-positives.length)]),solution=values.map((v,i)=>v%divisor===0?i:-1).filter(i=>i>=0);
  return tagged(base('multiselect',{values,divisor,conditions,scene:sceneText(conditions.map(v=>`${v}`).join('と')+'で わりきれる？',conditions.length>1?'両方で割り切れる数を全部':'あまりが0を全部')},solution,'一の位、数字の合計、組み合わせた条件などを使って確かめよう。'),['一の位で見分ける','数字の合計で見分ける','最後の二桁・三桁を見る','二つの性質を合わせる','二つの割る数の両方を満たす'][tier],{conditions:conditions.length,divisor,cards:count,positives:solution.length,nearMisses:values.filter(v=>v%divisor===1||v%divisor===divisor-1).length});
 }
 if(id==='gcd'){
  const unit=int(tier===2?1:2,Math.min(8,3+q+tier)),patterns=tier===0?[[1,2],[1,3],[1,4],[1,5]]:tier===1?[[2,3],[3,4],[3,5],[4,5]]:tier===2?[[4,7],[5,8],[7,9],[8,11]]:tier===3?[[2,3,4],[3,4,5],[4,5,6],[5,6,7]]:[[6,10,15],[10,14,35],[6,15,20],[12,15,20]],ratios=patterns[q],values=shuffle(ratios.map(v=>v*unit)),answer=values.reduce(gcd),pairOnly=values.slice(0,2).reduce(gcd);
  const wrong=unique([pairOnly,...values.flatMap(v=>range(Math.min(v,25)).map(i=>i+1).filter(x=>v%x===0))]).filter(v=>v!==answer);
  return tagged(numberChoice(c,answer,wrong,{type:'ribbons',values},'一本だけでなく、全部のリボンが余りなく切れるか確かめよう。',{a:values[0],b:values[1],values}),['片方がもう片方の倍のとき','共通する約数を探す','大きな共通約数がないときも考える','三本に共通する長さを探す','二本だけに共通する長さを除く'][tier],{ribbons:values.length,answer,quotientMax:Math.max(...values)/answer,nested:values.some(v=>values.every(w=>w%v===0)),pairOnlyLarger:pairOnly>answer,coprime:answer===1});
 }
 if(id==='lcm'){
  let values:number[]=[];if(tier===0){const a=int(2,5+q);values=[a,a*int(2,3+Math.floor(q/2))];}else if(tier===1||tier===2){const pairs=range(10+q).flatMap(i=>range(12+q).map(j=>[i+2,j+2])).filter(([a,b])=>a<b&&(tier===1?gcd(a,b)===1:gcd(a,b)>1&&b%a!==0));values=pick(pairs);}else if(tier===3){const max=8+q,triples=range(max-1).flatMap(i=>range(max-i-2).flatMap(j=>range(max-i-j-3).map(k=>[i+2,i+j+3,i+j+k+4]))).filter(a=>a.reduce(lcm)<=180&&a.every((_,i)=>a.filter((_,j)=>i!==j).reduce(lcm)<a.reduce(lcm)));values=pick(triples);}else values=q<2?[int(3,6),int(7,10)]:[int(3,5),int(6,8),int(9,11)];
  let offsets:number[]=values.map(()=>0),answer=values.reduce(lcm);if(tier===4){const period=answer,meeting=pick(range(Math.min(period-1,35)-2).map(i=>i+3).filter(t=>values.some(v=>t%v!==0)));offsets=values.map(v=>meeting%v);answer=range(period).map(i=>i+1).find(t=>values.every((v,i)=>t%v===offsets[i]))!;}
  const scene:Scene=tier<4?{type:'cycles',values}:sceneRow(values.map((v,i)=>sceneText(`${String.fromCharCode(65+i)}: ${offsets[i]}秒後から ${v}秒ごと`)).concat([sceneText('次に全部いっしょは何秒後？')]));
  return tagged(numberChoice(c,answer,unique([...values,values.reduce(lcm),sum(values),answer+Math.min(...values),answer-Math.min(...values)]),scene,'周期をそろえよう。始まる時刻が違うときは、各ライトの点く時刻を並べよう。',{a:values[0],b:values[1],values,offsets}),['倍の周期をそろえる','共通の倍数を探す','共通の因数を使って周期をそろえる','三つの周期をそろえる','点き始めのずれを考える'][tier],{cycles:values.length,offsetCount:offsets.filter(Boolean).length,meeting:answer,maxInterval:Math.max(...values),nested:values.some(v=>values.every(w=>v%w===0)),stepsToMeet:Math.ceil(answer/Math.max(...values))});
 }
 if(id==='median'){
  const n=tier===0?3:tier===1?5:tier===2?7:tier===3?4+q%2*2:7+q*2;let values:number[]=[];if(tier<2)values=shuffle(range(18+q*3).map(i=>i+1)).slice(0,n);else if(tier===2||tier===4){const pool=shuffle(range(14).map(i=>i+1)).slice(0,4);values=shuffle([...pool,...range(n-pool.length).map(()=>pick(pool))]);}else values=shuffle(range(15).map(i=>(i+1)*2)).slice(0,n);
  const sorted=[...values].sort((a,b)=>a-b),answer=n%2?sorted[Math.floor(n/2)]:(sorted[n/2-1]+sorted[n/2])/2,scene:Scene=tier===4?sceneRow(unique(values).sort((a,b)=>a-b).map(v=>sceneText(`${v}が ${values.filter(w=>w===v).length}枚`)).concat([sceneText('同じ数も一枚ずつ数えるよ')])):sceneRow([{type:'cards',values},...(n%2?[]:[sceneText('真ん中の2枚の平均は？')])]);
  let wrong=unique(values.filter(v=>v!==answer));if(n%2===0){wrong=unique(values.flatMap((v,i)=>values.slice(i+1).map(w=>(v+w)/2))).filter(v=>v!==answer&&values.includes(v)===values.includes(answer));}
  while(wrong.length<2){const v=answer+wrong.length+1;if(v!==answer&&values.includes(v)===values.includes(answer)&&!wrong.includes(v))wrong.push(v);else{const other=answer+wrong.length+10;if(!wrong.includes(other))wrong.push(other);}}
  return tagged(choice(answer,wrong,scene,'両端から同じ枚数を除こう。同じ数も別のカードとして数えるよ。',{values}),['三枚の真ん中を探す','五枚を整理して探す','同じ数を含めて数える','真ん中の二枚を平均する','枚数の表から真ん中を探す'][tier],{cards:n,distinctValues:unique(values).length,duplicates:n-unique(values).length,even:n%2===0,frequencyTable:tier===4,neighborGap:n%2?sorted[Math.floor(n/2)+1]-sorted[Math.floor(n/2)-1]:sorted[n/2]-sorted[n/2-1]});
 }
 if(id==='mean'){
  const n=tier===0?3:tier===1?4:5,average=int(3,6+Math.floor(q/2)),values=range(n).map(()=>average);
  for(let i=0;i<n-1;i++){const amount=int(1,Math.min(average-1,tier===0?2:4));if(i%2){values[i]-=amount;values[n-1]+=amount;}else{const safe=Math.min(amount,values[n-1]-1);values[i]+=safe;values[n-1]-=safe;}}
  let answer=average,scene:Scene=tier===2?{type:'cards',values}:{type:'bars',values},missingIndex=-1;if(tier===3){missingIndex=int(0,n-1);answer=values[missingIndex];scene=sceneRow([sceneText(values.map((v,i)=>i===missingIndex?'？':String(v)).join('、'),'それぞれの柱の高さ'),sceneText(`平均を ${average}にするには、？はいくつ？`)]);}
  if(tier===4)scene=sceneRow(unique(values).map(v=>sceneText(`高さ${v}が ${values.filter(w=>w===v).length}本`)).concat([sceneText('全部を同じ高さにすると？')]));
  return tagged(numberChoice(c,answer,[...values,Math.min(...values),Math.max(...values),Math.round(sum(values)/(n-1)),average+1,average-1],scene,'全部の合計は変わらないよ。合計と本数を使って考えよう。',{values,average,missingIndex}),['ブロックを動かしてそろえる','いくつかの柱から分ける','合計と本数で考える','平均から隠れた一本を求める','同じ高さの本数も使って平均する'][tier],{columns:n,moveBlocks:sum(values.map(v=>Math.abs(v-average)))/2,spread:Math.max(...values)-Math.min(...values),missing:missingIndex>=0,frequencyTable:tier===4,total:sum(values)});
 }
 if(id==='probability'){
  const b=int(4,Math.min(12,6+tier+q)),a=int(2,b-2);let numerator=a,denominator=b,scene:Scene={type:'balls',a,b},event='triangle',draws=1,replacement=false;
  if(tier===0)scene=sceneRow([scene,sceneText('△が出る割合は？')]);
  if(tier===1){numerator=b-a;event='circle';scene=sceneRow([scene,sceneText('まるが出る割合は？')]);}
  if(tier===2){const square=int(1,b-a-1),circle=b-a-square;event='triangle-or-square';numerator=a+square;scene=sceneRow([sceneText(`△ ${a}枚、□ ${square}枚、○ ${circle}枚`),sceneText('△か□が出る割合は？')]);}
  if(tier===3){const removed=q%2?'triangle':'circle';numerator=removed==='triangle'?a-1:a;denominator=b-1;event=`after-${removed}`;scene=sceneRow([scene,sceneText(`${removed==='triangle'?'△':'○'}を1枚取りのぞいた後、△が出る割合は？`)]);}
  if(tier===4){draws=2;replacement=q===0;denominator=replacement?b*b:b*(b-1);if(q<=1){numerator=a*(replacement?a:a-1);event='both-triangle';}else if(q===2){numerator=2*a*(b-a);event='different';}else{numerator=denominator-(b-a)*(b-a-1);event='at-least-one';}scene=sceneRow([scene,sceneText(`2回引く。札は${replacement?'もどす':'もどさない'}`),sceneText(q<=1?'2回とも△の割合は？':q===2?'△と○が1枚ずつの割合は？':'少なくとも1枚が△の割合は？')]);}
  return tagged(fractionalChoice(c,numerator,denominator,scene,'条件に合う場合と、全部の場合を同じ数え方で数えよう。',{a,b,event,draws,replacement,numerator,denominator},tier>=3),['全部の中の割合を数える','反対の形の割合を考える','どちらかの条件を合わせる','一枚減った後の割合を考える','二回引く場合を数える'][tier],{total:b,draws,replacement,event,favorable:numerator,sampleSpace:denominator,reducedDenominator:denominator/gcd(numerator,denominator)});
 }
 if(id==='routecount'){
  const n=tier<1?int(3,4):tier<3?4:5;let blocked:number[]=[],marks:number[]=[],answer=0;const condition=tier===4&&q>=2?'one':'all',start=0,end=n*n-1;
  for(let attempt=0;attempt<1000;attempt++){
   const candidates=shuffle(range(n*n-2).map(i=>i+1));blocked=candidates.slice(0,tier===0?1+q%2:1+Math.floor(q/2)+(tier>2?1:0));const markPool=shuffle(candidates.filter(i=>!blocked.includes(i)&&i%n>0&&i%n<n-1&&i>=n&&i<n*(n-1)));
   marks=tier<2?[]:markPool.slice(0,tier===2?1:2);answer=routeCount(n,blocked,start,end,marks,condition);if(answer>=2&&(tier<1||answer<routeCount(n,[],start,end,marks,condition)))break;
  }
  const footer=`→ または ↓ だけ${marks.length?condition==='one'?'・◎をちょうど1つ通る':'・◎を全部通る':''}`;
  return tagged(numberChoice(c,answer,[routeWays(n,blocked),routeWays(n,[]),answer+1,answer-1,answer*2],sceneGrid(n,range(n*n).map(i=>i===start?'●':i===end?'★':marks.includes(i)?'◎':''),{blocked,footer}),'そのマスまでの道を、上と左から来る道に分けて考えよう。通過条件も確かめよう。',{n,blocked,marks,condition,start,end}),['分かれ道の数を合わせる','障害物で消える道を除く','決まったマスを通る道を数える','二つの通過点をつなぐ','通る点の個数で場合を分ける'][tier],{side:n,blocked:blocked.length,checkpoints:marks.length,exactlyOne:condition==='one',routes:answer,unconstrainedRoutes:routeWays(n,blocked)});
 }
 if(id==='alphametic'){
  const family=tier,max=tier===0?4+q:tier===1?5+q:9,k=tier===1?2+Math.floor(q/2):2,rect=pick(cryptoRectangles(family,max,k)),at=int(0,3),entry=rect.entries[at];
  const lines=family===0?[`□ ＋ △ ＝ ${entry.x}`,`□ − △ ＝ ${entry.y}`]:family===1?[`□ ＋ △ ＝ ${entry.x}`,`□ ＋ ${k}×△ ＝ ${entry.y}`]:family===2?[`□△ ＋ △□ ＝ ${entry.x}`,`□ − △ ＝ ${entry.y}`]:family===3?[`□△ ＋ △○ ＝ ${entry.x}`,`□ ＋ ○ ＝ ${entry.y}`]:[`□△ × ○ ＝ ${entry.x}`,`□ ＋ ○ ＝ ${entry.y}`];
  const scene=sceneRow([...lines.map(s=>sceneText(s)),sceneText(family>=3?'□△○ ＝ ？':'□△ ＝ ？','どの形も1〜9。同じ数字になる形もあるよ。')]);
  return tagged(choice(entry.answer,rect.entries.filter((_,i)=>i!==at).map(e=>e.answer),scene,'両方の式が合う数字を探そう。一つの式だけでは決まらないよ。',{family,max,k,clues:[entry.x,entry.y],digits:entry.digits,assignments:rect.entries.map(e=>e.digits)}),['和と差を合わせる','同じ形が何個分か考える','二桁の位と繰り上がりを使う','三つの形を二つの式で決める','かけ算と位の条件を合わせる'][tier],{symbols:entry.digits.length,family,coefficient:k,carry:family===2&&entry.x>=110||family===3&&(entry.digits[1]+entry.digits[2]>=10),nonlinear:family===4,equalDigits:unique(entry.digits).length<entry.digits.length,catalogueRectangles:cryptoRectangles(family,max,k).length});
 }
}
export function checkNumber(p:Puzzle,answer:any):boolean{
 if(answer===null||answer===undefined)return false;const d=p.data;
 if(p.kind==='coins')return Array.isArray(answer)&&answer.length===d.denoms.length&&answer.every(n=>Number.isInteger(n)&&n>=0)&&answer.reduce((s,n,i)=>s+n*d.denoms[i],0)===d.target&&answer.reduce((s,n)=>s+n,0)===d.minimum;
 if(p.kind==='pairselect')return Array.isArray(answer)&&answer.length===2&&new Set(answer).size===2&&answer.every(i=>Number.isInteger(i)&&i>=0&&i<d.values.length)&&d.values[answer[0]]*d.values[answer[1]]===d.target&&(!d.closest||Math.abs(d.values[answer[0]]-d.values[answer[1]])===d.minimumGap);
 if(p.kind==='operators')return Array.isArray(answer)&&answer.length===d.values.length-1&&answer.every(op=>d.available.includes(op))&&calculate(d.values,answer)===d.target;
 if(p.kind==='arrange')return Array.isArray(answer)&&answer.length===d.values.length&&new Set(answer).size===answer.length&&answer.every(i=>Number.isInteger(i)&&i>=0&&i<d.values.length)&&d.values[answer[0]]!==0&&Number(answer.map(i=>d.values[i]).join(''))===d.target;
 if(p.kind==='multiselect')return Array.isArray(answer)&&new Set(answer).size===answer.length&&equal([...answer].sort((a,b)=>a-b),[...p.solution].sort((a,b)=>a-b));
 return Number.isInteger(answer)&&answer===p.solution;
}
