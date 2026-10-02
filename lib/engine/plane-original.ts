/** Original six plane games, with explicit geometric concepts at all five curriculum bands. */
import{context,range,key,equal,normalize,rotate,connected,type Puzzle}from'./shared.ts';
const IDS=['rotate','mirror','fit','square','symmetry','area'];
const flip=(c:number[][])=>normalize(c.map(([x,y])=>[-x,y]));
const equivalent=(a:number[][],b:number[][])=>range(4).some(q=>equal(rotate(a,q),normalize(b)));
function geometricShape(c:ReturnType<typeof context>,phase:number){
 if(phase<3)return c.shape(4+phase+c.int(0,3));
 const w=c.int(4,7),h=c.int(4,6),hx=c.int(1,w-2),hy=c.int(1,h-2),hw=c.int(1,Math.min(2,w-1-hx)),hh=c.int(1,Math.min(2,h-1-hy));let cells=range(w*h).map(i=>[i%w,Math.floor(i/w)]).filter(([x,y])=>x<hx||x>=hx+hw||y<hy||y>=hy+hh);
 if(phase===4){const corners=c.shuffle([[0,0],[w-1,0],[0,h-1],[w-1,h-1]]).slice(0,c.int(1,3));cells=cells.filter(v=>!corners.some(q=>equal(q,v)));}return rotate(cells,c.int(0,3));
}
function nearbyShape(c:ReturnType<typeof context>,source:number[][]){
 for(let attempt=0;attempt<150;attempt++){const out=source.map(v=>[...v]),removed=c.int(0,out.length-1);out.splice(removed,1);const candidates=c.shuffle(out.flatMap(([x,y])=>[[x+1,y],[x-1,y],[x,y+1],[x,y-1]]).filter(v=>!source.some(q=>equal(v,q))));for(const at of candidates){const next=normalize([...out,at]);if(connected(next))return next;}}
 return c.shape(source.length);
}
export function generateOriginalPlane(id:string,level:number,seed:number):Puzzle|undefined{
 if(!IDS.includes(id))return;const c=context(id,level,seed),{L,int,pick,shuffle}=c,phase=Math.floor((L-1)/4),step=(L-1)%4,p:Puzzle={id,level:L,seed,kind:'choice',data:{concept:phase},solution:0,hint:'かたちの とくちょうを たしかめよう。'};
 const choices=(correct:number[][],source:number[][],reject:(v:number[][])=>boolean,preferred:number[][][]=[])=>{const options=[normalize(correct)];for(const v of preferred){const a=normalize(v);if(!reject(a)&&!options.some(b=>equal(a,b)))options.push(a);if(options.length===4)break;}for(let attempt=0;options.length<4&&attempt<2000;attempt++){const a=phase<1?c.shape(source.length):nearbyShape(c,source);if(!reject(a)&&!options.some(b=>equal(a,b)))options.push(a);}if(options.length!==4)throw Error('plane distractor generation');p.options=shuffle(options);p.solution=p.options.findIndex(v=>equal(v,normalize(correct)));};
 if(id==='rotate'||id==='mirror'){
  let cells:number[][]=[];for(let attempt=0;attempt<500;attempt++){cells=geometricShape(c,phase);if(equal(cells,flip(cells)))continue;if(id==='rotate'&&phase>=2&&equivalent(cells,flip(cells)))continue;if(new Set(range(4).map(q=>key(rotate(cells,q)))).size<4)continue;break;}
  const q=phase===0?1:phase===1?2:pick([1,2,3]),correct=id==='rotate'?rotate(cells,q):flip(cells);p.data={...p.data,shape:cells,optionType:'shape'};
  if(id==='rotate'){choices(correct,cells,v=>equivalent(v,cells),phase>=2?[flip(cells),nearbyShape(c,cells)]:[]);p.hint=phase<2?'ながい へんと、でっぱりを いっしょに まわしてみよう。':'かがみの かたちは、まわすだけでは かさならないよ。あなや くぼみも たしかめよう。';}
  else{choices(correct,cells,v=>equal(v,correct),[cells,...(phase>=1?[rotate(cells,pick([1,2,3]))]:[])]);p.hint=phase<2?'ひだりと みぎが いれかわるよ。でっぱりを みつけよう。':'かがみでは、でっぱりも くぼみも はんたいへ。まわした かたちと くらべよう。';}
  return p;
 }
 if(id==='fit'){
  const cells=geometricShape(c,phase),maxX=Math.max(...cells.map(v=>v[0]));let a:number[][],b:number[][];
  if(phase===0){const cut=int(0,Math.max(0,maxX-1));a=cells.filter(v=>v[0]<=cut);b=cells.filter(v=>v[0]>cut);if(!b.length){a=cells.slice(0,Math.ceil(cells.length/2));b=cells.slice(Math.ceil(cells.length/2));}}
  else if(phase===1){a=cells.filter((v,i)=>i%2===0);b=cells.filter((v,i)=>i%2===1);}
  else{const membership=cells.map(()=>int(0,2));membership[0]=0;membership[1]=1;membership[2]=2;a=cells.filter((_,i)=>membership[i]!==1);b=cells.filter((_,i)=>membership[i]!==0);}
  p.data={...p.data,shape:cells,parts:[a,b],optionType:'shape',prompt:phase>=2?'かさなる ところも あるよ。ふたつを あわせると？':undefined,help:'ふたつの シートを、おなじ マスの いちで かさねます。どちらかに いろが あれば、こたえも いろつきです。'};
  const intersection=a.filter(v=>b.some(q=>equal(v,q))),xor=cells.filter(v=>!intersection.some(q=>equal(v,q)));choices(cells,cells,v=>equal(v,normalize(cells)),phase>=2?[xor,nearbyShape(c,cells),intersection]:[]);p.hint=phase>=2?'かさなった マスは、1つぶん。どちらにも ない マスは あいたままだよ。':'ひだりうえの マスを そろえて、ふたつを かさねよう。';return p;
 }
 if(id==='square'){
  const n=phase<1?4:phase<3?5:6,tilted=phase>=1,a=int(1,Math.min(3,n-2)),b=tilted?int(1,n-1-a):0,x=int(b,n-1-a),y=int(0,n-1-a-b),pts=[[x,y],[x+a,y+b],[x+a-b,y+b+a],[x-b,y+a]],correct=pts.map(([x,y])=>y*n+x),dots=[...correct],isSquare=(at:number[])=>{const ps=at.map(i=>[i%n,Math.floor(i/n)]),dist=ps.flatMap((p,i)=>ps.slice(i+1).map(q=>(p[0]-q[0])**2+(p[1]-q[1])**2)).sort((a,b)=>a-b);return dist[0]>0&&dist.slice(0,4).every(v=>v===dist[0])&&dist[4]===2*dist[0]&&dist[5]===dist[4];},near=shuffle(range(n*n).filter(i=>!dots.includes(i))).sort((a,b)=>phase>=2?Math.min(...correct.map(v=>Math.abs(a%n-v%n)+Math.abs(Math.floor(a/n)-Math.floor(v/n))))-Math.min(...correct.map(v=>Math.abs(b%n-v%n)+Math.abs(Math.floor(b/n)-Math.floor(v/n)))):0);
  for(const at of near){if(dots.length>=6+phase+Number(step>=2))break;let extra=false;for(let i=0;i<dots.length;i++)for(let j=i+1;j<dots.length;j++)for(let k=j+1;k<dots.length;k++)if(isSquare([dots[i],dots[j],dots[k],at]))extra=true;if(!extra)dots.push(at);}
  p.kind='select';p.data={...p.data,n,dots:shuffle(dots)};p.solution=correct;p.hint=phase<1?'4つの へんが おなじ ながさで、かどが ちょっかく。':phase<3?'ななめでも、たてと よこの すすみかたを くらべよう。':'にている てんに まどわされず、4つの へんと ちょっかくを たしかめよう。';return p;
 }
 if(id==='symmetry'){
  const axis=phase===0?'vertical':phase===1?'horizontal':phase===2?'diagonal':phase===3?'antidiagonal':pick(['vertical','horizontal','diagonal','antidiagonal']),n=phase<2?4+2*Number(step>=2):6+2*Number(phase===4&&step>=2),isSource=(x:number,y:number)=>axis==='vertical'?x<n/2:axis==='horizontal'?y<n/2:axis==='diagonal'?x<y:x+y<n-1,reflect=(x:number,y:number)=>axis==='vertical'?[n-1-x,y]:axis==='horizontal'?[x,n-1-y]:axis==='diagonal'?[y,x]:[n-1-y,n-1-x],sourceIndices=range(n*n).filter(i=>isSource(i%n,Math.floor(i/n))),targetIndices=sourceIndices.map(i=>{const[x,y]=reflect(i%n,Math.floor(i/n));return y*n+x;}),left=sourceIndices.map(()=>c.r()<(phase===4?.6:.42)?1:0);left[int(0,left.length-1)]=1;if(left.every(Boolean))left[0]=0;
  p.kind='paint';p.data={...p.data,n,left,axis,sourceIndices,targetIndices,prompt:'せんを はさんで、かがみのように ぬろう。',help:'いろの ついた おてほんを、せんで おりかえした いちに うつします。せんから おなじ きょりの マスを ぬりましょう。'};p.solution=[...left];p.hint=axis==='vertical'?'せんから ひだりと みぎへ、おなじ マスすう。':axis==='horizontal'?'せんから うえと したへ、おなじ マスすう。':'ななめの せんで おりかえすと、たてと よこが いれかわるよ。';return p;
 }
 if(id==='area'){
  let cells:number[][];if(phase===0){if(step===3)cells=c.shape(int(5,10));else{const w=int(2,5),h=int(2,4);cells=range(w*h).map(i=>[i%w,Math.floor(i/w)]);if(step===2){const widths=range(h).map(()=>int(1,w));widths[0]=w;cells=cells.filter(([x,y])=>x<widths[y]);}}}
  else if(phase===1){const w=int(3,6),h=int(2,6),corners=shuffle([[0,0],[w-1,0],[0,h-1],[w-1,h-1]]).slice(0,1+Number(step>=2));cells=range(w*h).map(i=>[i%w,Math.floor(i/w)]).filter(v=>!corners.some(q=>equal(q,v)));}
  else if(phase===2){const w=int(4,7),h=int(3,7),cutW=int(1,w-2),cutH=int(1,h-1);cells=range(w*h).map(i=>[i%w,Math.floor(i/w)]).filter(([x,y])=>x<w-cutW||y<h-cutH);}
  else cells=geometricShape(c,phase);
  cells=rotate(cells,int(0,3));const answer=cells.length,wrong=new Set<number>();const bbox=(Math.max(...cells.map(v=>v[0]))+1)*(Math.max(...cells.map(v=>v[1]))+1);if(bbox!==answer)wrong.add(bbox);while(wrong.size<3){const v=answer+pick([-4,-3,-2,-1,1,2,3,4]);if(v>0)wrong.add(v);}p.data={...p.data,shape:cells,optionType:'number'};p.solution=answer;p.options=shuffle([answer,...wrong]);p.hint=phase<2?'たてと よこの まとまりで、ぬった マスを かぞえよう。':'おおきな しかくから、へこみや あなの マスを ひくことも できるよ。';return p;
 }
}
