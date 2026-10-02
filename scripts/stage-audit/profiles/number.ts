import type{Puzzle}from'../../../lib/engine/shared.ts';
export const NUMBER_GOALS:Record<string,[string,string,string,string,string]>={
 count:['小さいまとまりを一目でとらえる','5ずつのまとまりを使う','10と残りに分ける','離れたまとまりを合わせる','整った並びの空きを引く'],
 compare:['一対一で対応させる','同じまとまりをそろえる','少ない差を見つける','並べ方に惑わされず比べる','同じ部分を除いて比べる'],
 sum:['二枚で目標を作る','10のまとまりを使う','三枚の組み合わせを選ぶ','余りから逆に考える','四枚と補数を組み合わせる'],
 missing:['足し算の足りない分を考える','10をまたぐ数を分ける','引き算を逆にたどる','かけ算とわり算の関係を使う','式の違う位置の空欄を求める'],
 groups:['同じ数のまとまりを数える','5や10のまとまりを使う','最後の余りも合わせる','空いている分を引く','二種類のまとまりを合わせる'],
 numberpath:['1ずつ進む数を見つける','途中の数から順に進む','2ずつ・5ずつ進む','大きい方から戻る','同じ差で続く数を見つける'],
 placevalue:['十と一を合わせる','0の位を残す','三つの位を合わせる','10こを上の位にまとめる','二つの位でまとめ直す'],
 fractionline:['等分を数える','半分以外の位置を読む','同じ大きさの分数を見つける','1を超える分数を読む','0以外から始まる線を読む'],
 fairshare:['同じ数ずつ配る','余りを分けて考える','袋の中も合わせて配る','先によけてから配る','袋・ばら・よける分を整理する'],
 clock:['時と30分を読む','15分と45分を読む','5分ずつ数える','1分の目盛りを読む','前後の時刻を考える'],
 mincoins:['1と5を交換する','10を使うか考える','50と小さいコインを合わせる','大きいコインを使わない方も比べる','何種類かの組み合わせを比べる'],
 fractions:['分け方が同じ分数を比べる','分子が同じ分数を比べる','半分を目印に比べる','近い分数を同じ物差しで比べる','1までの残りも使って比べる'],
 factors:['小さいかけ算の組を探す','かけ算の相手を見つける','約数の中から相手を選ぶ','積が同じ組の差を比べる','式のお題と組の差を合わせて考える'],
 expressions:['足す・引くを選ぶ','かけ算を使う場所を選ぶ','四つの数をつなぐ','足し引きとかけ算を組み合わせる','五つの数で三種類の符号を使う'],
 digitorder:['大きい位から選ぶ','0を含むカードを並べる','0を先頭にしない最小を作る','同じ数字も一枚ずつ使う','末尾の条件と大小を両立する'],
 rounding:['数直線で10のまとまりにする','数直線で100のまとまりにする','数だけを見て10のまとまりにする','境目と切り上がりを考える','計算してから丸める'],
 divisibility:['一の位で見分ける','数字の合計で見分ける','最後の二桁・三桁を見る','二つの性質を合わせる','二つの割る数の両方を満たす'],
 gcd:['片方がもう片方の倍のとき','共通する約数を探す','大きな共通約数がないときも考える','三本に共通する長さを探す','二本だけに共通する長さを除く'],
 lcm:['倍の周期をそろえる','共通の倍数を探す','共通の因数を使って周期をそろえる','三つの周期をそろえる','点き始めのずれを考える'],
 median:['三枚の真ん中を探す','五枚を整理して探す','同じ数を含めて数える','真ん中の二枚を平均する','枚数の表から真ん中を探す'],
 mean:['ブロックを動かしてそろえる','いくつかの柱から分ける','合計と本数で考える','平均から隠れた一本を求める','同じ高さの本数も使って平均する'],
 probability:['全部の中の割合を数える','反対の形の割合を考える','どちらかの条件を合わせる','一枚減った後の割合を考える','二回引く場合を数える'],
 routecount:['分かれ道の数を合わせる','障害物で消える道を除く','決まったマスを通る道を数える','二つの通過点をつなぐ','通る点の個数で場合を分ける'],
 alphametic:['和と差を合わせる','同じ形が何個分か考える','二桁の位と繰り上がりを使う','三つの形を二つの式で決める','かけ算と位の条件を合わせる'],
};
// Within-level semantic ranking only. No level multiplier or answer magnitude proxy.
export function numberMetrics(p:Puzzle):{score:number;features:Record<string,number|string|boolean>}{
 const d=p.data,features={...(d.progression?.features||{})} as Record<string,number|string|boolean>,n=(k:string)=>Number(features[k]||0);let score=0;
 switch(p.id){
 case'placevalue':score=8*n('requiredColumns')+6*n('regroupColumns')+2*n('zeroColumns')+Math.min(20,n('bundles'))/5;break;
 case'fractionline':score=2*n('denominator')+2*n('stepsFromEndpoint')+3*(n('simplify')>1?1:0)+3*n('origin')+2*n('span');break;
 case'fairshare':score=4*n('steps')+2*n('groups')+2*(n('remainder')>0?1:0)+(n('loose')>0?2:0);break;
 case'clock':score=12*(features.hourBoundary?1:0)+5*(features.backward?1:0)+6/Math.max(1,n('hourAlternativeDistance'))+12/Math.max(1,n('minuteAlternativeDistance'))+n('elapsed')/20;break;
 case'mincoins':score=7*n('greedyGap')+4*n('usedDenominations')+n('minimumCoins')+Math.min(8,n('indispensableAdditions')+n('indispensableRemovals'))+3*(n('indispensableAdditions')>0&&n('indispensableRemovals')>0?1:0);break;
 case'fractions':score=4*n('denominatorKinds')+Math.min(12,Math.log2(1/Math.max(.0001,n('winnerGap'))))+Math.log2(Math.max(1,n('commonDenominator')));break;
 case'factors':score=3*n('minimumFactor')+2*n('dividingCards')-2*n('solutionPairs')+8*n('operations')+6*(features.closest?1:0);break;
 case'expressions':score=6*n('minOperatorKinds')+4*(features.multiplyRequired?1:0)+4*(features.subtractRequired?1:0)+Math.log2(Math.max(1,n('searchSpace')))-2*Math.log2(Math.max(1,n('solutions')));break;
 case'digitorder':score=3*n('digits')+5*(features.terminalConstraint?1:0)+3*(features.zero&&features.small?1:0)+2*n('repeated')+Math.log2(Math.max(1,n('validPermutations')));break;
 case'rounding':score=8*n('operations')+4*(features.midpoint?1:0)+4*(features.carryBoundary?1:0)+4/(1+n('midpointDistance'))+(features.scaffold?0:4);break;
 case'divisibility':score=5*n('conditions')+2*n('nearMisses')+n('cards')+n('positives');break;
 case'gcd':score=4*n('ribbons')+6*(features.pairOnlyLarger?1:0)+2*(features.coprime?1:0)+Math.log2(Math.max(1,n('quotientMax')))-(features.nested?4:0);break;
 case'lcm':score=5*n('cycles')+6*n('offsetCount')+Math.log2(1+n('stepsToMeet'))-(features.nested?4:0);break;
 case'median':score=2*n('cards')+3*n('duplicates')+5*(features.even?1:0)+5*(features.frequencyTable?1:0)+2/(1+n('neighborGap'));break;
 case'mean':score=2*n('columns')+2*n('moveBlocks')+6*(features.missing?1:0)+5*(features.frequencyTable?1:0);break;
 case'probability':score=5*n('draws')+Math.log2(Math.max(1,n('sampleSpace')))+3*(features.replacement?0:1)+Math.log2(Math.max(1,n('reducedDenominator')));break;
 case'routecount':score=5*n('checkpoints')+7*(features.exactlyOne?1:0)+2*n('blocked')+Math.log2(Math.max(1,n('routes')))+Math.log2(1+Math.max(0,n('unconstrainedRoutes')-n('routes')));break;
 case'alphametic':score=6*n('symbols')+5*(features.carry?1:0)+7*(features.nonlinear?1:0)+2*n('coefficient')-(features.equalDigits?3:0);break;
 case'count':{const positions=d.positions||[],occupied=new Set(positions),isolated=positions.filter((i:number)=>![i%6?i-1:-1,i%6<5?i+1:-1,i>=6?i-6:-1,i<30?i+6:-1].some(j=>occupied.has(j))).length;Object.assign(features,{quantity:d.count,isolated,layout:d.layout||'scattered'});score=d.count+2*isolated;break;}
 case'compare':{const gap=Math.abs(d.a-d.b),max=Math.max(d.a,d.b);Object.assign(features,{gap,max,common:d.common||0,layout:d.layout||'aligned',tie:gap===0});score=(max-(d.common||0))/3+8/(gap+1)+(d.positionsA?4:0);break;}
 case'sum':{let min=99,solutions=0;for(let mask=1;mask<2**d.values.length;mask++){const a=d.values.filter((_:number,i:number)=>mask>>i&1);if(a.reduce((s:number,v:number)=>s+v,0)===d.target){solutions++;min=Math.min(min,a.length);}}Object.assign(features,{cards:d.values.length,minPicks:min,solutions});score=min*6+d.values.length-2*Math.log2(Math.max(1,solutions));break;}
 case'missing':Object.assign(features,{operation:d.op,blank:d.blank||'right',multiStep:!!d.expression});score=(d.op==='×'?8:d.op==='−'?5:3)+(d.expression?6:0)+(d.blank&&d.blank!=='right'?3:0);break;
 case'groups':Object.assign(features,{groups:d.groups,each:d.each,loose:d.loose||0,missing:d.missing||0,secondaryGroups:d.secondaryGroups||0,secondaryEach:d.secondaryEach||0});score=d.groups+d.each+4*(d.loose?1:0)+5*(d.missing?1:0)+6*(d.secondaryGroups?1:0);break;
 case'numberpath':{const sequence=d.sequence||Array.from({length:d.n*d.n},(_,i)=>i+1),step=sequence.length>1?sequence[1]-sequence[0]:1;Object.assign(features,{taps:sequence.length,start:sequence[0],step,descending:step<0});score=sequence.length/3+3*Math.abs(step)+5*(step<0?1:0)+2*(sequence[0]!==1?1:0);break;}
 }
 return {score,features};
}

/** The displayed counting structure and arithmetic inputs, without hidden derivations or presentation permutations. */
export function numberQuestionBody(p:Puzzle):unknown{
 const d=p.data,sort=(a:number[])=>[...a].sort((a,b)=>a-b),order=(a:any[])=>[...a].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 switch(p.id){
 case'count':return{columns:d.scene.n,capacity:d.scene.values.length,positions:sort(d.positions)};
 case'compare':return d.common?{common:d.common,remainders:sort([d.a-d.common,d.b-d.common])}:{columns:5,positions:order([sort(d.positionsA),sort(d.positionsB)])};
 case'sum':return{values:sort(d.values),target:d.target};
 case'missing':return{op:d.op,left:d.blank==='left'?'?':d.a,right:d.blank==='right'?'?':d.b,total:d.blank==='total'?'?':d.total};
 case'groups':return{groups:order([...Array.from({length:d.groups},(_,i)=>[d.each,i===d.groups-1?d.missing:0]),...Array.from({length:d.secondaryGroups},()=>[d.secondaryEach,0])]),loose:d.loose};
 case'numberpath':return{sequence:d.sequence};
 case'placevalue':return{digits:d.digits};
 case'fractionline':return{min:d.scene.min,max:d.scene.max,steps:d.scene.steps,at:d.scene.at,reduce:d.reduce};
 case'fairshare':return{groups:d.groups,shown:d.total+d.reserved,reserved:d.reserved,packs:d.packs,perPack:d.perPack,loose:d.loose};
 case'clock':return{hour:d.hour,minute:d.minute,elapsed:d.elapsed};
 case'mincoins':return{denoms:d.denoms,target:d.target,initial:d.initial};
 case'fractions':return{fractions:order(p.options!.map((v:any)=>[v.a,v.b]))};
 case'factors':return{values:sort(d.values),target:d.scene.text,closest:d.closest};
 case'expressions':return{values:d.values,target:d.target,available:d.available};
 case'digitorder':return{values:sort(d.values),condition:d.scene.text};
 case'rounding':return{expression:d.expression,unit:d.unit,scaffold:d.scene.type==='numberline'};
 case'divisibility':return{values:sort(d.values),conditions:sort(d.conditions)};
 case'gcd':return{values:sort(d.values)};
 case'lcm':return{cycles:order(d.values.map((v:number,i:number)=>[v,d.offsets[i]]))};
 case'median':return{values:sort(d.values),frequencyTable:d.scene.items[0].type==='text'};
 case'mean':return d.missingIndex>=0?{given:sort(d.values.filter((_:number,i:number)=>i!==d.missingIndex)),average:d.average}:{values:sort(d.values),representation:d.scene.type};
 case'probability':return{a:d.a,b:d.b,event:d.event,draws:d.draws,replacement:d.replacement,...(d.event==='triangle-or-square'?{square:d.numerator-d.a}:{})};
 case'routecount':return{n:d.n,start:d.start,end:d.end,blocked:sort(d.blocked),marks:sort(d.marks),condition:d.condition};
 case'alphametic':return{family:d.family,k:d.family===1?d.k:undefined,clues:d.clues};
 default:throw Error(`Missing number task body ${p.id}`);
 }
}
