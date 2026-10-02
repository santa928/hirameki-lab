import{generateOriginalLogic}from'./engine/logic-curriculum.ts';
import{generateOriginalPlane}from'./engine/plane-original.ts';
import{generateOriginalNumber}from'./engine/original-number.ts';
import{SLIDE_BANK}from'./engine/slide-bank.ts';
import{cubeSignature,cubeRotations,polycube,roll}from'./engine/space.ts';
import{context as puzzleContext}from'./engine/shared.ts';
import {EXTENDED_META,generateExtended,checkExtended} from './engine/extended.ts';
export type Puzzle={id:string;level:number;seed:number;kind:string;data:any;solution:any;options?:any[];hint:string};
export const IDS=['cubes','shadow','top','rotate3d','nets','slice','rotate','mirror','fit','square','symmetry','area','maze','stroke','rails','slide','lights','ice','pattern','matrix','sudoku','order','balance','odd','count','compare','sum','missing','groups','numberpath',...EXTENDED_META.map(m=>m[0])];
export function rng(seed:number){let a=seed|0;return ()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
export function hash(s:string){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
// Bank-backed traffic/train stages traverse a band without replacement; procedural games keep stable hashed seeds.
export function stageSeed(id:string,stage:number,index:number){return ['traffic','trainyard'].includes(id)?((stage-1)%16)*10+index:hash(`${id}/${stage}/${index}`);}
export function shuffle<T>(a:T[],r:()=>number){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
export function neighbors(i:number,n:number){return [i%n>0?i-1:-1,i%n<n-1?i+1:-1,i>=n?i-n:-1,i<n*(n-1)?i+n:-1].filter(x=>x>=0);}
export const same=(a:any,b:any)=>JSON.stringify(a)===JSON.stringify(b);
export function norm(c:number[][]){let mins=c[0].map((_,j)=>Math.min(...c.map(v=>v[j])));return c.map(v=>v.map((x,j)=>x-mins[j])).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));}
export function turn(c:number[][],k=1){let a=c;for(let i=0;i<k;i++)a=a.map(([x,y])=>[-y,x]);return norm(a);}
export function flip(c:number[][]){return norm(c.map(([x,y])=>[-x,y]));}
function shape(r:()=>number,len:number){let c=[[0,0]];for(let z=0;c.length<len&&z<500;z++){const p=c[Math.floor(r()*c.length)];const d=[[1,0],[-1,0],[0,1],[0,-1]][Math.floor(r()*4)];const q=[p[0]+d[0],p[1]+d[1]];if(!c.some(v=>same(v,q)))c.push(q);}return norm(c);}
function choices(correct:any,make:()=>any,r:()=>number,count=4){let a=[correct];for(let t=0;a.length<count&&t<400;t++){const v=make();if(!a.some(x=>same(x,v)))a.push(v);}return shuffle(a,r);}
function numChoices(x:number,r:()=>number,min=0){const a=new Set([x]);while(a.size<4)a.add(Math.max(min,x+Math.floor(r()*9)-4));return shuffle([...a],r);}
export function project(c:number[][],axis:'front'|'top'){return norm([...new Map(c.map(v=>{const p=axis==='front'?[v[0],-v[2]]:[v[0],v[1]];return[p.join(','),p];})).values()]);}
function pile(r:()=>number,L:number){
 const int=(a:number,b:number)=>a+Math.floor(r()*(b-a+1)),w=L<13?3:4,depth=L<5?2:L<17?3:4;
 const maxHeight=L===1?2:L<9?3:L<17?4:5;
 const footprint:number[][]=L<5?[[1,0]]:[[0,0],[1,0],[0,1],[1,1]];
 const count=L<5?3+Math.floor(L/2)+int(0,1):L<13?Math.min(w*depth,5+Math.floor((L-5)/2)+int(0,1)):L<17?w*depth:11+Math.floor((L-17)/2)+int(0,1);
 while(footprint.length<count){const choices:number[][]=[];for(let y=0;y<depth;y++)for(let x=0;x<w;x++)if(!footprint.some(p=>p[0]===x&&p[1]===y)&&footprint.some(p=>Math.abs(p[0]-x)+Math.abs(p[1]-y)===1))choices.push([x,y]);footprint.push(choices[int(0,choices.length-1)]);}
 let heights=footprint.map(([x,y],i)=>{
  if(L<5)return int(1,maxHeight);
  if(L<9)return i<4?int(2,maxHeight):int(1,maxHeight);
  if(L<13)return Math.max(1,maxHeight-Math.floor((x+y)/2)+int(-1,0));
  if(L<17)return maxHeight-int(0,1); // Count a nearly complete box by finding the notches.
  return Math.max(1,maxHeight-Math.min(x,y)+int(-1,1));
 });
 heights=heights.map(h=>Math.min(maxHeight,h));
 const high=int(0,heights.length-1),low=(high+int(1,heights.length-1))%heights.length;heights[high]=maxHeight;heights[low]=L<9?1:maxHeight-2;
 const cubes=footprint.flatMap(([x,y],i)=>Array.from({length:heights[i]},(_,z)=>[x,y,z]));
 return yaw(cubes,int(0,3));
}
function projectionPile(r:()=>number,L:number,axis:'top'|'front'){
 const int=(a:number,b:number)=>a+Math.floor(r()*(b-a+1)),maxHeight=Math.min(5,2+Math.floor((L+2)/5));
 if(axis==='top'){
  let footprint:number[][]=[];
  for(let tries=0;tries<500;tries++){
   footprint=shape(r,3+Math.floor(L/2)+int(0,1));const width=Math.max(...footprint.map(p=>p[0]))+1,depth=Math.max(...footprint.map(p=>p[1]))+1;
   if(width>1&&depth>1&&width<=5&&depth<=5&&(L<5||width*depth>footprint.length))break;
  }
  const heights=footprint.map(()=>int(1,maxHeight));heights[0]=maxHeight;heights[1]=1;
  return footprint.flatMap(([x,y],i)=>Array.from({length:heights[i]},(_,z)=>[x,y,z]));
 }
 if(L>=17){
  const width=L<19?5:6,height=int(4,5),windowW=int(1,2),windowH=int(1,height-3),left=int(1,width-windowW-1),bottom=int(1,height-windowH-1);
  const cells:number[][]=[];for(let x=0;x<width;x++)for(let z=0;z<height;z++)if(!(x>=left&&x<left+windowW&&z>=bottom&&z<bottom+windowH))for(let y=0;y<2+(r()<.45?1:0);y++)cells.push([x,y,z]);
  return cells;
 }
 const width=Math.min(5,3+Math.floor((L+3)/8)),depth=L<5?2:3,profile=Array.from({length:width},()=>int(1,maxHeight));
 const high=int(0,width-1),low=(high+int(1,width-1))%width;profile[high]=maxHeight;profile[low]=1;
 return profile.flatMap((height,x)=>{
  const tallest=int(0,depth-1),heights=Array.from({length:depth},()=>int(1,height));heights[tallest]=height;
  if(L>=5&&height>1){heights[depth-1]=height-1;heights[int(0,depth-2)]=height;}
  return heights.flatMap((h,y)=>Array.from({length:h},(_,z)=>[x,y,z]));
 });
}
function yaw(c:number[][],k:number){let a=c;for(let i=0;i<k;i++)a=a.map(([x,y,z])=>[-y,x,z]);return norm(a);}
function cubeKey(c:number[][]){return [0,1,2,3].map(k=>JSON.stringify(yaw(c,k))).sort()[0];}
function pathWalk(r:()=>number,n:number,len:number){let best=[0];for(let attempt=0;attempt<80;attempt++){let p=[Math.floor(r()*n*n)];while(p.length<len){const ns=shuffle(neighbors(p[p.length-1],n).filter(x=>!p.includes(x)),r);if(!ns.length)break;p.push(ns[0]);}if(p.length>best.length)best=p;if(best.length>=len)break;}return best;}

const slideDistanceCandidates=new Map<string,string[]>();
function slideDistanceBoard(r:()=>number,minimum:number){
 const depth=minimum+Math.floor(r()*3),floor=2+Math.floor((minimum-4)/2),cacheKey=`${depth}:${floor}`;let candidates=slideDistanceCandidates.get(cacheKey);
 if(!candidates){candidates=SLIDE_BANK[depth].split(' ').filter(board=>[...board].reduce((total,digit,i)=>{const value=Number(digit);return value?total+Math.abs(i%3-(value-1)%3)+Math.abs(Math.floor(i/3)-Math.floor((value-1)/3)):total;},0)>=floor);if(!candidates.length)throw Error('slide distance bank empty');slideDistanceCandidates.set(cacheKey,candidates);}
 return{initial:candidates[Math.floor(r()*candidates.length)].split('').map(Number),minimum:depth};
}
function minimalLightMoves(initial:number[],n:number){
 const N=n*n,popcount=(v:number)=>{let count=0;while(v){v&=v-1;count++;}return count;},rows=Array.from({length:N},(_,i)=>{let mask=initial[i]<<N;for(const j of[i,...neighbors(i,n)])mask|=1<<j;return mask;}),pivots:number[]=[];let rank=0;
 for(let column=0;column<N;column++){const at=rows.findIndex((v,i)=>i>=rank&&!!(v&(1<<column)));if(at<0)continue;[rows[at],rows[rank]]=[rows[rank],rows[at]];for(let i=0;i<N;i++)if(i!==rank&&(rows[i]&(1<<column)))rows[i]^=rows[rank];pivots.push(column);rank++;}
 const free=Array.from({length:N},(_,i)=>i).filter(i=>!pivots.includes(i));let minimum=Infinity,best=0;for(let assignment=0;assignment<1<<free.length;assignment++){let mask=0;free.forEach((at,i)=>{if(assignment&(1<<i))mask|=1<<at;});for(let i=0;i<rank;i++)if(((rows[i]>>>N)&1)!==(popcount(rows[i]&mask)&1))mask|=1<<pivots[i];const cost=popcount(mask);if(cost<minimum){minimum=cost;best=mask;}}
 return{minimum,moves:Array.from({length:N},(_,i)=>i).filter(i=>best&(1<<i)),nullity:free.length};
}
function strokeChallenge(r:()=>number,n:number,length:number,minimumChoices:number){
 for(let attempt=0;attempt<500;attempt++){const path=pathWalk(r,n,length);if(path.length!==length)continue;const allowed=new Set(path),visited=new Set<number>();let choices=0;for(const at of path.slice(0,-1)){visited.add(at);if(neighbors(at,n).filter(v=>allowed.has(v)&&!visited.has(v)).length>1)choices++;}if(choices>=minimumChoices)return{path,choices};}throw Error('one-stroke decision challenge');
}

export function lightToggle(c:number[],i:number,n:number){const a=[...c];for(const j of [i,...neighbors(i,n)])a[j]=1-a[j];return a;}
export function slideMove(a:number[],i:number,n:number){const z=a.indexOf(0);if(!neighbors(z,n).includes(i))return a;const c=[...a];[c[z],c[i]]=[c[i],c[z]];return c;}
export function iceMove(at:number,dir:number,n:number,blocked:number[]){let x=at%n,y=Math.floor(at/n);const [dx,dy]=[[0,-1],[1,0],[0,1],[-1,0]][dir];while(x+dx>=0&&x+dx<n&&y+dy>=0&&y+dy<n&&!blocked.includes((y+dy)*n+x+dx)){x+=dx;y+=dy;}return y*n+x;}
export function railOpen(type:number,rot:number){return(type===0?[0,2]:[0,1]).map(x=>(x+rot)%4);}
export function railPath(p:Puzzle,rot:number[]){const {n,types,start,end}=p.data;let at=start,enter=0;const path:number[]=[];for(let k=0;k<n*n+1;k++){if(path.includes(at))return[];path.push(at);const open=railOpen(types[at],rot[at]);if(!open.includes(enter))return[];const dir=open.find((x:number)=>x!==enter)!;if(at===end&&dir===2)return path;const x=at%n,y=Math.floor(at/n),[dx,dy]=[[0,-1],[1,0],[0,1],[-1,0]][dir];if(x+dx<0||x+dx>=n||y+dy<0||y+dy>=n)return[];at=(y+dy)*n+x+dx;enter=(dir+2)%4;}return[];}
export function sudokuCount(board:number[],n:number,bw:number,limit=2){const bh=n/bw,a=[...board];let count=0;function solve(){if(count>=limit)return;let at=-1,opts:number[]=[];for(let i=0;i<a.length;i++)if(!a[i]){const x=i%n,y=Math.floor(i/n),o=Array.from({length:n},(_,k)=>k+1).filter(v=>!a.some((t,j)=>t===v&&(j%n===x||Math.floor(j/n)===y||(Math.floor(j%n/bw)===Math.floor(x/bw)&&Math.floor(Math.floor(j/n)/bh)===Math.floor(y/bh)))));if(!o.length)return;if(at<0||o.length<opts.length){at=i;opts=o;}}if(at<0){count++;return;}for(const v of opts){a[at]=v;solve();if(count>=limit)break;}a[at]=0;}solve();return count;}
export function cutCube(normal:number[],d:number){const vs=Array.from({length:8},(_,i)=>[i&1,(i>>1)&1,(i>>2)&1]);const points:number[][]=[];for(let i=0;i<8;i++)for(let j=i+1;j<8;j++)if([1,2,4].includes(i^j)){const a=vs[i],b=vs[j],f=a.reduce((s,v,k)=>s+v*normal[k],0)-d,g=b.reduce((s,v,k)=>s+v*normal[k],0)-d;if(f*g<0){const t=f/(f-g);points.push(a.map((v,k)=>v+(b[k]-v)*t));}}const center=[0,1,2].map(k=>points.reduce((s,p)=>s+p[k],0)/points.length);const u=[normal[1],-normal[0],0],v=[normal[1]*u[2]-normal[2]*u[1],normal[2]*u[0]-normal[0]*u[2],normal[0]*u[1]-normal[1]*u[0]];const angle=(p:number[])=>Math.atan2(p.reduce((s,x,k)=>s+(x-center[k])*v[k],0),p.reduce((s,x,k)=>s+(x-center[k])*u[k],0));return points.sort((a,b)=>angle(a)-angle(b));}
export function foldNet(cells:number[][]):number[][]|null{
 if(cells.length!==6||new Set(cells.map(v=>v.join(','))).size!==6)return null;
 const neg=(v:number[])=>v.map(x=>-x),frames:(number[][]|undefined)[]=Array(6).fill(undefined);frames[0]=[[1,0,0],[0,1,0],[0,0,1]];
 const queue=[0];while(queue.length){const i=queue.shift()!,[u,v,n]=frames[i]!;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const j=cells.findIndex(c=>c[0]===cells[i][0]+dx&&c[1]===cells[i][1]+dy);if(j<0)continue;const frame=dx===1?[neg(n),v,u]:dx===-1?[n,v,neg(u)]:dy===1?[u,neg(n),v]:[u,n,neg(v)];if(frames[j]){if(!same(frames[j],frame))return null;}else{frames[j]=frame;queue.push(j);}}}
 if(frames.some(f=>!f))return null;const normals=frames.map(f=>f![2]);return new Set(normals.map(v=>v.join(','))).size===6?normals:null;
}
function netShape(r:()=>number,L:number){let cells=[[1,0],[0,1],[1,1],[2,1],[1,2],[1,3]];if(L>=10){for(let attempt=0;attempt<500;attempt++){const candidate=shape(r,6);if(foldNet(candidate)){cells=candidate;break;}}}return L<5?cells:turn(r()<.5?flip(cells):cells,Math.floor(r()*4));}
function railRoute(r:()=>number,n:number,minLength:number){
 for(let attempt=0;attempt<100;attempt++){
  const start=Math.floor(r()*n),path=[start],seen=new Set(path);let budget=8000;
  function visit():boolean{if(--budget<0)return false;const at=path[path.length-1];
   if(at>=n*(n-1)&&at%n!==start&&path.length>=minLength)return true;
   for(const next of shuffle(neighbors(at,n),r)){if(seen.has(next))continue;seen.add(next);path.push(next);if(visit())return true;path.pop();seen.delete(next);}return false;
  }if(visit())return [...path];
 }throw Error('rail route generation failed');
}
function railHasShortcut(n:number,types:number[],start:number,end:number,minLength:number,minTurns:number){
 const seen=new Set<number>();
 function visit(at:number,enter:number,length:number,turns:number):boolean{
  if(seen.has(at))return false;seen.add(at);length++;turns+=types[at];
  const exits=types[at]?[(enter+1)%4,(enter+3)%4]:[(enter+2)%4];
  for(const dir of exits){if(at===end&&dir===2){if(length<minLength||turns<minTurns){seen.delete(at);return true;}continue;}
   const x=at%n+[0,1,0,-1][dir],y=Math.floor(at/n)+[-1,0,1,0][dir];
   if(x>=0&&y>=0&&x<n&&y<n&&visit(y*n+x,(dir+2)%4,length,turns)){seen.delete(at);return true;}
  }seen.delete(at);return false;
 }return visit(start,0,0,0);
}
function mazeBoard(r:()=>number,L:number){
 const n=L<5?5:L<11?7:9,minChoices=1+Math.floor((L-1)/4);
 for(let attempt=0;attempt<500;attempt++){
  // A randomized spanning tree with a frontier (rather than a DFS corridor) creates actual forks.
  const rooms=Array.from({length:Math.ceil(n/2)**2},(_,i)=>Math.floor(i/Math.ceil(n/2))*2*n+i%Math.ceil(n/2)*2);
  const start=rooms[Math.floor(r()*rooms.length)],open=new Set([start]),visited=new Set([start]);
  const edges:number[][]=[];const add=(at:number)=>{for(const to of rooms)if(Math.abs(at%n-to%n)+Math.abs(Math.floor(at/n)-Math.floor(to/n))===2&&!visited.has(to))edges.push([at,to]);};add(start);
  while(edges.length){const k=Math.floor(r()*edges.length),[from,to]=edges.splice(k,1)[0];if(visited.has(to))continue;visited.add(to);open.add(to);open.add((from+to)/2);add(to);}
  const queue=[[start]],seen=new Set([start]),candidates:number[][]=[];
  while(queue.length){const path=queue.shift()!,at=path[path.length-1];const choices=path.filter(i=>neighbors(i,n).filter(j=>open.has(j)).length>=3).length;
   if(choices>=minChoices&&path.length>=5+Math.floor((L-1)*.85))candidates.push(path);
   for(const q of neighbors(at,n))if(open.has(q)&&!seen.has(q)){seen.add(q);queue.push([...path,q]);}
  }
  if(candidates.length){candidates.sort((a,b)=>b.length-a.length);const path=candidates[Math.floor(r()*Math.min(4,candidates.length))];return {n,start,end:path[path.length-1],blocked:Array.from({length:n*n},(_,i)=>i).filter(i=>!open.has(i)),path};}
 }throw Error('maze generation failed');
}
function iceBoard(r:()=>number,L:number){
 const n=L<5?4:L<12?5:6,min=Math.max(L<6?2:L<13?4:L<18?6:8,2+Math.floor((L-1)*.42));
 for(let attempt=0;attempt<3000;attempt++){
  const start=Math.floor(r()*n*n),blocked=shuffle(Array.from({length:n*n},(_,i)=>i).filter(i=>i!==start),r).slice(0,Math.floor(n*n*(.16+r()*.18)));
  const seen=new Set([start]),queue=[[start]],routes:number[][]=[];
  while(queue.length){const path=queue.shift()!,at=path[path.length-1];if(path.length-1>=min)routes.push(path);
   for(let dir=0;dir<4;dir++){const to=iceMove(at,dir,n,blocked);if(!seen.has(to)){seen.add(to);queue.push([...path,to]);}}
  }if(routes.length){const route=routes[Math.floor(r()*routes.length)];return{n,start,end:route[route.length-1],blocked,route};}
 }throw Error('ice generation failed');
}
export function generate(id:string,level:number,seed:number):Puzzle{
 const original=generateOriginalPlane(id,level,seed)||generateOriginalNumber(id,level,seed)||generateOriginalLogic(id,level,seed);if(original)return original;
 const extended=generateExtended(id,level,seed);if(extended)return extended;
 if(!IDS.includes(id))throw new Error('Unknown game');
 const L=Math.max(1,Math.min(20,Math.floor(level)||1)),r=rng(hash(id+':'+seed)),int=(a:number,b:number)=>a+Math.floor(r()*(b-a+1));
 let p:Puzzle={id,level:L,seed,kind:'choice',data:{},solution:0,hint:'ゆっくり みくらべてみよう。'};
 if(['cubes','shadow','top','rotate3d'].includes(id)){
  const spatialContext=puzzleContext(id,L,seed),cubes=id==='rotate3d'?polycube(spatialContext,4+Math.floor(L/3)+int(0,2)):id==='top'?projectionPile(r,L,'top'):id==='shadow'?projectionPile(r,L,'front'):pile(r,L);p.data={cubes};
  if(id==='cubes'){p.solution=cubes.length;const footprints=new Set(cubes.map(([x,y])=>`${x},${y}`)).size,maxHeight=Math.max(...cubes.map(c=>c[2]))+1;const wrong=shuffle([...new Set([footprints,project(cubes,'front').length,cubes.length-1,cubes.length+1,cubes.length-maxHeight,cubes.length+maxHeight])].filter(x=>x>0&&x!==cubes.length),r);p.options=shuffle([cubes.length,...wrong.slice(0,3)],r);p.data.strategy=L<5?'columns':L<9?'hidden':L<13?'layers':L<17?'box-minus':'mixed-layers';p.hint=L<5?'たかさが ちがうよ。ひとつの はしらごとに かぞえよう。':L<9?'うえに つみきが あれば、その したにも つみきが あるよ。':L<13?'1だんめ、2だんめ…と、だんごとに まとめてみよう。':L<17?'ぜんぶ つまった はこを かんがえて、へこんだ ぶんを ひいても いいよ。':'だんごとの かずを まとめよう。おくの かくれた つみきも わすれずに。';}
  if(id==='shadow'||id==='top'){
   const axis=id==='top'?'top':'front',correct=project(cubes,axis),w=Math.max(...cubes.map(v=>v[0]))+1,depth=Math.max(...cubes.map(v=>v[1]))+1,h=Math.max(...cubes.map(v=>v[2]))+1;
   if(id==='shadow'&&L>=17){
    const all=Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]),missing=all.filter(v=>!correct.some(p=>same(p,v))),holeW=Math.max(...missing.map(v=>v[0]))-Math.min(...missing.map(v=>v[0]))+1,holeH=Math.max(...missing.map(v=>v[1]))-Math.min(...missing.map(v=>v[1]))+1;
    const alternatives:number[][][]=[];for(let x=1;x<w-holeW;x++)for(let y=1;y<h-holeH;y++){const a=norm(all.filter(v=>!(v[0]>=x&&v[0]<x+holeW&&v[1]>=y&&v[1]<y+holeH)));if(!same(a,correct))alternatives.push(a);}
    p.options=shuffle([correct,...shuffle(alternatives,r).slice(0,3)],r);
   }else{
   p.options=choices(correct,()=>{
    if(id==='shadow'){const heights=Array.from({length:w},(_,x)=>Math.max(0,...cubes.filter(v=>v[0]===x).map(v=>v[2]+1)));const at=int(0,w-1);heights[at]=int(1,h+1);return norm(heights.flatMap((v,x)=>Array.from({length:v},(_,z)=>[x,-z])));}
    const cells=Array.from({length:w*depth},(_,i)=>[i%w,Math.floor(i/w)]),selected=cells.filter(v=>correct.some(p=>same(p,v)));const at=int(0,cells.length-1),has=selected.findIndex(v=>same(v,cells[at]));if(has>=0&&selected.length>1)selected.splice(has,1);else if(has<0)selected.push(cells[at]);else return [[0,0],[1,0]];return norm(selected);
   },r);}
   p.solution=p.options.findIndex(x=>same(x,correct));p.data.optionType='shape';p.hint=id==='top'?'たかさを なくして うえから みよう。':L>=17?'あなの むこうまで あいている ところは、かげにも あなが のこるよ。':'あおい やじるしの むきから みよう。おくの つみきは かさなるよ。';
  }
  if(id==='rotate3d'){
   let source=cubes;const mirror=(a:number[][])=>norm(a.map(([x,y,z])=>[-x,y,z])),bounds=(a:number[][])=>[0,1,2].map(i=>Math.max(...a.map(v=>v[i]))-Math.min(...a.map(v=>v[i]))+1).sort().join(',');
   let correct:number[][]=[],wrong:number[][][]=[];
   const connected=(a:number[][])=>{const seen=new Set([a[0].join(',')]),queue=[a[0]];for(let i=0;i<queue.length;i++)for(const b of a)if(!seen.has(b.join(','))&&b.reduce((n,v,j)=>n+Math.abs(v-queue[i][j]),0)===1){seen.add(b.join(','));queue.push(b);}return seen.size===a.length;};
   for(let round=0;round<100;round++){
    const dimensions=[0,1,2].map(i=>Math.max(...source.map(v=>v[i]))-Math.min(...source.map(v=>v[i]))+1);
    if(L>=9&&(dimensions.some(v=>v<2)||dimensions.reduce((a,b)=>a*b,1)<source.length+2)||L>=13&&cubeSignature(source)===cubeSignature(mirror(source))){source=polycube(spatialContext,cubes.length);continue;}
    const poses=cubeRotations(source),signature=cubeSignature(source);correct=poses[int(0,poses.length-1)];wrong=[];
    if(L>=9&&cubeSignature(mirror(source))!==signature)wrong.push(mirror(source));
    for(let tries=0;wrong.length<2&&tries<400;tries++){
     let candidate:number[][];
     if(L<5)candidate=polycube(spatialContext,source.length);
     else{const removed=int(0,source.length-1),a=source.filter((_,i)=>i!==removed),from=a[int(0,a.length-1)],to=[...from];to[int(0,2)]+=r()<.5?-1:1;if(a.some(v=>same(v,to)))continue;candidate=norm([...a,to]);if(!connected(candidate))continue;}
     if(L>=9&&bounds(candidate)!==bounds(source))continue;
     const sig=cubeSignature(candidate);if(sig===signature||wrong.some(v=>cubeSignature(v)===sig))continue;
     const rotations=cubeRotations(candidate);wrong.push(rotations[int(0,rotations.length-1)]);
    }
    if(wrong.length===2)break;source=polycube(spatialContext,cubes.length);
   }
   if(wrong.length<2)throw Error('3D rotation distractors');
   p.data.cubes=source;p.options=shuffle([correct,...wrong],r);p.solution=p.options.findIndex(x=>same(x,correct));p.data.optionType='cubes';p.hint=L>=9?'おおきさは おなじ。かがみの むきや、1この つながりの ちがいを たしかめよう。':'おなじ かずの つみきでも、つながりかたが ちがうよ。';
  }

 }
 else if(id==='nets'){
  const labels=shuffle([1,2,3,4,5,6],r),cells=netShape(r,L>=3?Math.max(10,L):L),faces=foldNet(cells)!,q=int(0,5),opposite=(i:number)=>faces.findIndex(v=>v.every((x,k)=>x===-faces[i][k]));
  p.data={cells,labels,target:labels[q]};p.hint='となりの めんから おりあげて、めんの むきを たもとう。';
  if(L<5){p.solution=labels[opposite(q)];p.options=shuffle(labels.filter(x=>x!==labels[q]),r);}
  else{
   const front=shuffle(faces.map((_,i)=>i).filter(i=>i!==q&&i!==opposite(q)),r)[0],topNormal=faces[q],frontNormal=faces[front],rightNormal=[topNormal[1]*frontNormal[2]-topNormal[2]*frontNormal[1],topNormal[2]*frontNormal[0]-topNormal[0]*frontNormal[2],topNormal[0]*frontNormal[1]-topNormal[1]*frontNormal[0]],right=faces.findIndex(v=>same(v,rightNormal));
   const pose={top:labels[q],front:labels[front]},initial=[labels[q],labels[opposite(q)],labels[opposite(front)],labels[front],labels[right],labels[opposite(right)]];
   if(L<9){const side=L<7?'right':(r()<.5?'left':'right');p.solution=labels[side==='right'?right:opposite(right)];p.options=shuffle(labels.filter(v=>v!==pose.top&&v!==pose.front),r);p.data={...p.data,pose,side,netPrompt:`${pose.top}を うえ、${pose.front}を まえにすると、${side==='right'?'みぎ':'ひだり'}は？`};}
   else{let moves:number[]=[],end=initial;const length=L<13?(L<11?1:2):L<17?(L<15?2:3):4+Math.floor((L-17)/2);
    for(let attempt=0;attempt<200;attempt++){moves=[];const direction=int(0,3);for(let k=0;k<length;k++){const allowed=[0,1,2,3].filter(v=>!moves.length||v!==(moves[moves.length-1]+2)%4);moves.push(L<13?direction:allowed[int(0,allowed.length-1)]);}end=moves.reduce(roll,initial);const switches=moves.slice(1).filter((v,i)=>v%2!==moves[i]%2).length;if(end[0]!==initial[0]&&(L<13||switches>=(L<17?1:2)))break;}
    p.solution=end[0];p.options=shuffle(labels,r);p.data={...p.data,pose,moves,initial,end,netPrompt:`${pose.top}を うえ、${pose.front}を まえ（↓がわ）にして、ころがすと さいごの うえは？`};}
   p.data.prompt=p.data.netPrompt;p.data.help='展開図を折り、指定の上と前に合わせます。右と左を考え、矢印があればその順に転がします。';
  }
 }
 else if(id==='slice'){
  const phase=Math.floor((L-1)/4),wanted=phase===0?int(3,4):phase===1?int(3,5):int(3,6);let ns:number[]=[],d=0,poly:number[][]=[];
  for(let attempt=0;attempt<2000;attempt++){ns=phase===0&&wanted===4?[1,0,0]:[int(1,phase<2?2:4),int(1,phase<2?2:4),int(1,phase<2?2:4)];const total=ns.reduce((a,b)=>a+b,0);d=total*(.1+r()*.8)+.00013;poly=cutCube(ns,d);if(poly.length===wanted)break;}
  if(poly.length!==wanted)throw Error('section side family');
  const cutPoints=shuffle(poly.map((_,i)=>i),r).slice(0,3).map(i=>poly[i]),center=[0,1,2].map(k=>poly.reduce((s,v)=>s+v[k],0)/poly.length),rawU=[ns[1],-ns[0],0],mag=Math.hypot(...rawU),u=rawU.map(v=>v/mag),rawV=[ns[1]*u[2]-ns[2]*u[1],ns[2]*u[0]-ns[0]*u[2],ns[0]*u[1]-ns[1]*u[0]],vMag=Math.hypot(...rawV),v=rawV.map(x=>x/vMag),planeQuad=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>center.map((x,i)=>x+.8*(a*u[i]+b*v[i]))),sectionMode=phase===0?'outline':phase===1?'partial':phase===2?'plane':'points';
  p.data={normal:ns,d,poly,cutPoints,planeQuad,sectionMode,revealPolygon:phase===0,prompt:phase<2?'きりくちは なんかくけい？':'3つの しるしを とおる めんで きると、きりくちは なんかくけい？',help:'緑の3つの点を同じ平面でつなぎ、その面で立方体を切ります。裏側を通る辺も考えます。ヒントで切り口を確かめられます。'};p.solution=poly.length;p.options=shuffle([3,4,5,6],r);p.hint='しるしから となりの めんへ。うらがわにも きりくちを つなげよう。';
 }
 else if(['rotate','mirror','fit','area'].includes(id)){
  const c=shape(r,id==='area'?int(3+Math.floor(L/4),6+Math.floor(L/2)):3+Math.floor(L/2)),correct=id==='mirror'?flip(c):id==='rotate'?turn(c,int(1,3)):c;p.data={shape:c,optionType:'shape'};
  if(id==='area'){p.solution=c.length;p.options=numChoices(p.solution,r,1);p.data.optionType='number';}
  else {if(id==='fit'){const a=c.filter((_,i)=>i%2===0),b=c.filter((_,i)=>i%2===1);p.data.parts=[a,b];}p.options=choices(correct,()=>{const v=shape(r,c.length);return id==='rotate'&&[0,1,2,3].some(k=>same(turn(v,k),norm(c)))?shape(r,c.length+1):v;},r);p.solution=p.options.findIndex(x=>same(x,correct));}
  p.hint=id==='mirror'?'ひだりと みぎが いれかわるよ。':id==='fit'?'ふたつの シートを ぴったり かさねよう。':'マスを ひとつずつ たどってみよう。';
 }
 else if(id==='square'){
  const n=L<8?4:L<15?5:6,a=int(1,Math.min(3,n-2)),b=L<6?0:int(1,n-1-a),x=int(b,n-1-a),y=int(0,n-1-a-b),pts=[[x,y],[x+a,y+b],[x+a-b,y+b+a],[x-b,y+a]],correct=pts.map(([x,y])=>y*n+x),dots=[...correct];
  for(const at of shuffle(Array.from({length:n*n},(_,i)=>i).filter(i=>!dots.includes(i)),r)){
   if(dots.length>=Math.min(13,6+Math.floor(L/3)))break;const trial=[...dots,at];let extra=false;
   for(let i=0;i<dots.length;i++)for(let j=i+1;j<dots.length;j++)for(let k=j+1;k<dots.length;k++)if(check({...p,id:'square',data:{n,dots:trial}},[dots[i],dots[j],dots[k],at]))extra=true;
   if(!extra)dots.push(at);
  }p.kind='select';p.data={n,dots:shuffle(dots,r)};p.solution=correct;p.hint='4つの へんが おなじ ながさで、かどが ちょっかくだよ。ななめの しかくも さがそう。';
 }
 else if(id==='symmetry'){const n=L<7?4:L<14?6:8;const left=Array.from({length:n*n/2},()=>r()<.45?1:0);left[0]=1;p.kind='paint';p.data={n,left};p.solution=left.map((_,i)=>left[Math.floor(i/(n/2))*(n/2)+n/2-1-i%(n/2)]);p.hint='まんなかの せんから おなじ きょりの マスを ぬろう。';}
 else if(id==='maze'){const {path,...data}=mazeBoard(r,L);p.kind='path';p.data=data;p.solution=path;p.hint='いきどまりは もどって だいじょうぶ。ほしの ほうからも かんがえよう。';}
 else if(id==='stroke'){const n=L<5?3:L<13?4:5,{path,choices}=strokeChallenge(r,n,Math.min(n*n,4+L),Math.floor((L-1)/4));p.kind='path';p.data={n,start:path[0],allowed:[...path].sort((a,b)=>a-b),decisionPoints:choices};p.solution=path;p.hint='いちど とおった まるは とおれないよ。いきどまりを のこさないように。';}
 else if(id==='rails'){const n=L<6?3:L<15?4:5;let accepted=false;for(let attempt=0;attempt<1000;attempt++){const path=railRoute(r,n,Math.min(n*n,n+1+Math.floor((L-1)*.65)));const types=Array.from({length:n*n},()=>int(0,1)),solution=Array.from({length:n*n},()=>int(0,3));for(let j=0;j<path.length;j++){const at=path[j],dir=(to:number)=>to===at-n?0:to===at+1?1:to===at+n?2:3;const a=j===0?0:dir(path[j-1]),b=j===path.length-1?2:dir(path[j+1]);types[at]=(Math.abs(a-b)===2)?0:1;solution[at]=[0,1,2,3].find(k=>railOpen(types[at],k).includes(a)&&railOpen(types[at],k).includes(b))!;}if(railHasShortcut(n,types,path[0],path[path.length-1],Math.max(n+Math.floor(L/3),n+Math.floor(L*.55)),Math.max(2+Math.floor(L/5),2+Math.floor((L-1)*.33))))continue;const initial=solution.map(x=>(x+int(0,3))%4);p.kind='rails';p.data={n,types,start:path[0],end:path[path.length-1],initial,path};p.solution=solution;p.hint='いりぐちから じゅんに つなぐと わかりやすいよ。';if(railPath(p,initial).length)while(railOpen(types[p.data.start],initial[p.data.start]).includes(0))initial[p.data.start]=(initial[p.data.start]+1)%4;accepted=true;break;}if(!accepted)throw Error('rail challenge generation');}
 else if(id==='slide'){
  const n=L<15?3:4,solution=Array.from({length:n*n},(_,i)=>(i+1)%(n*n));let initial:number[],minimum:number|undefined,lowerBound:number;
  if(n===3){const result=slideDistanceBoard(r,4+L);initial=result.initial;minimum=result.minimum;lowerBound=initial.reduce((total,v,i)=>v?total+Math.abs(i%n-(v-1)%n)+Math.abs(Math.floor(i/n)-Math.floor((v-1)/n)):total,0);}
  else{initial=[...solution];let last=-1;const floor=18+(L-15)*2;lowerBound=0;for(let step=0;step<10000;step++){const empty=initial.indexOf(0),options=neighbors(empty,n).filter(v=>v!==last),to=options[int(0,options.length-1)];initial=slideMove(initial,to,n);last=empty;lowerBound=initial.reduce((total,v,i)=>v?total+Math.abs(i%n-(v-1)%n)+Math.abs(Math.floor(i/n)-Math.floor((v-1)/n)):total,0);if(lowerBound>=floor&&lowerBound<=floor+3)break;}if(lowerBound<floor)throw Error('sliding tile distance');}
  p.kind='slide';p.data={n,initial,minimum,lowerBound};p.solution=solution;p.hint='そろえた たて・よこを のこして、からの マスで つぎの タイルを まわそう。';
 }
 else if(id==='lights'){
  const n=L<8?3:L<13?4:5,floor=[1,2,2,3,3,4,4,4,5,5,6,6,7,7,8,9,10,11,12,13][L-1];let accepted=false;
  for(let attempt=0;attempt<500;attempt++){let initial=Array(n*n).fill(0);const scramble=shuffle(Array.from({length:n*n},(_,i)=>i),r).slice(0,floor+int(0,1));for(const at of scramble)initial=lightToggle(initial,at,n);const measured=minimalLightMoves(initial,n);if(measured.minimum<floor)continue;p.kind='lights';p.data={n,initial,moves:measured.moves,minimum:measured.minimum,nullity:measured.nullity};p.solution=Array(n*n).fill(0);p.hint='ひとつの ライトだけでなく、おした あとの まとまりを かんがえよう。';accepted=true;break;}if(!accepted)throw Error('lights minimum challenge');
 }
 else if(id==='ice'){p.kind='ice';p.data=iceBoard(r,L);p.solution=p.data.end;p.hint='ほしの ところで とまるには、どちらから すべれば いいかな？';}
 else if(id==='pattern'){const count=L<7?2:L<14?3:4,unit=shuffle([0,1,2,3,4,5],r).slice(0,count);const rule=L<10?unit:[...unit,...unit.slice(1,-1).reverse()];const seq=Array.from({length:rule.length*2+int(0,rule.length-1)},(_,i)=>rule[i%rule.length]);p.data={seq,optionType:'glyph'};p.solution=rule[seq.length%rule.length];p.options=shuffle([0,1,2,3,4,5],r);p.hint='くりかえしている ひとまとまりを さがそう。';}
 else if(id==='matrix'){const n=L<7?2:3,a=int(1,4),dx=int(1,1+Math.ceil(L/4)),dy=int(1,1+Math.ceil(L/4));const values=Array.from({length:n*n},(_,i)=>a+(i%n)*dx+Math.floor(i/n)*dy);p.data={n,values:values.slice(0,-1)};p.solution=values[values.length-1];p.options=numChoices(p.solution,r,1);p.hint='みぎへ いくと いくつ ふえる？したへ いくと いくつ ふえる？';}
 else if(id==='sudoku'){const n=L<14?4:6,bw=n===4?2:3,bh=n/bw,symbols=shuffle(Array.from({length:n},(_,i)=>i+1),r);const rows=shuffle(Array.from({length:bw},(_,i)=>i),r).flatMap(g=>shuffle(Array.from({length:bh},(_,i)=>g*bh+i),r));const cols=shuffle(Array.from({length:bh},(_,i)=>i),r).flatMap(g=>shuffle(Array.from({length:bw},(_,i)=>g*bw+i),r));const sol=rows.flatMap(y=>cols.map(x=>symbols[(bw*(y%bh)+Math.floor(y/bh)+x)%n]));const initial=[...sol];let removed=0;for(const at of shuffle(Array.from({length:n*n},(_,i)=>i),r)){if(removed>=Math.min(n*n*.7,2+L))break;const old=initial[at];initial[at]=0;if(sudokuCount(initial,n,bw)!==1)initial[at]=old;else removed++;}p.kind='sudoku';p.data={n,bw,initial};p.solution=sol;p.hint='まだ ない すうじは どれかな？たて・よこ・おなじ わくを みよう。';}
 else if(id==='order'){const n=Math.min(6,3+Math.floor(L/6)),sol=shuffle(Array.from({length:n},(_,i)=>i),r);const clues=shuffle(sol.slice(0,-1).map((a,i)=>[a,sol[i+1]]),r);p.kind='order';p.data={n,clues};p.solution=sol;p.hint='ヒントの みぎの かたちと、つぎの ヒントの ひだりの かたちを つなげよう。';}
 else if(id==='balance'){const a=int(1,2+L),b=int(1,2+L),ca=L<8?2:int(2,4),cb=L<8?1:int(1,3);p.data={aTotal:a*ca,ca,second:a+b,cb,targetShape:L<5?0:1};p.solution=L<5?a:b*cb;p.options=numChoices(p.solution,r,1);p.hint='さいしょの しきから、まる 1つぶんの おもさを さがそう。';}
 else if(id==='odd'){const n=L<5?2:L<12?3:L<18?4:5,base=int(0,3),answer=int(0,n*n-1);p.data={n,base,odd:answer,variant:L<10?'shape':'direction'};p.solution=answer;p.kind='odd';p.hint='おなじ かたちでも、むきが ちがうかも。';}
 else if(id==='count'){const count=int(2,Math.min(30,4+L*2));p.data={count,positions:shuffle(Array.from({length:36},(_,i)=>i),r).slice(0,count)};p.solution=count;p.options=numChoices(count,r,1);p.hint='ゆびで ひとつずつ かぞえても いいよ。';}
 else if(id==='compare'){const a=int(2,4+L),b=r()<.23?a:Math.max(1,a+int(-3,3));p.data={a,b};p.solution=a===b?1:a>b?0:2;p.options=['ひだり','おなじ','みぎ'];p.hint='ひだりと みぎを ひとつずつ ペアに してみよう。';}
 else if(id==='sum'){const n=L<8?4:L<15?6:8,values=Array.from({length:n},()=>int(1,3+L));const sol=shuffle(Array.from({length:n},(_,i)=>i),r).slice(0,2+Math.floor(L/8));p.kind='select';p.data={values,target:sol.reduce((a,i)=>a+values[i],0)};p.solution=sol;p.hint='おおきな かずから えらんで、あと いくつ たりないか かんがえよう。';}
 else if(id==='missing'){let a=int(1,3+L),b=int(1,3+L),op=L<7?'+':L<15?(r()<.5?'+':'−'):'×';if(op==='−'&&a<b)[a,b]=[b,a];p.data={a,op,total:op==='+'?a+b:op==='−'?a-b:a*b};p.solution=b;p.options=numChoices(b,r,0);p.hint=op==='+'?'ごうけいに なるまで、あと いくつ？':op==='−'?'いくつ とりのぞくと のこりの かずに なるかな？':'おなじ かずの まとまりを かんがえよう。';}
 else if(id==='groups'){const groups=int(2,Math.min(6,2+Math.ceil(L/4))),each=int(2,Math.min(9,2+Math.ceil(L/3)));p.data={groups,each};p.solution=groups*each;p.options=numChoices(p.solution,r,1);p.hint='ひとつの まとまりには いくつ？それが いくつ あるかな？';}
 else if(id==='numberpath'){const n=L<6?3:L<15?4:5,values=shuffle(Array.from({length:n*n},(_,i)=>i+1),r);p.kind='numberpath';p.data={n,values};p.solution=Array.from({length:n*n},(_,i)=>values.indexOf(i+1));p.hint='1の つぎは 2。ちいさい じゅんに タッチしよう。';}
 return p;
}
export function optionAnswer(p:Puzzle,index:number):any{return p.kind==='visual-choice'||p.id==='compare'||['shape','cubes'].includes(p.data.optionType)?index:p.options?.[index];}
export function check(p:Puzzle,answer:any):boolean{
 if(p.data.extended)return checkExtended(p,answer);
 const {id,kind,data:d}=p;if(answer===undefined||answer===null)return false;
 if(id==='square'){if(!Array.isArray(answer)||answer.length!==4||new Set(answer).size!==4||answer.some(i=>!d.dots.includes(i)))return false;const pts=answer.map(i=>[i%d.n,Math.floor(i/d.n)]),ds:number[]=[];for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)ds.push((pts[i][0]-pts[j][0])**2+(pts[i][1]-pts[j][1])**2);ds.sort((a,b)=>a-b);return ds[0]>0&&ds.slice(0,4).every(x=>x===ds[0])&&ds[4]===ds[5]&&ds[4]===2*ds[0];}
 if(id==='sum')return Array.isArray(answer)&&answer.length>0&&new Set(answer).size===answer.length&&answer.every(i=>Number.isInteger(i)&&i>=0&&i<d.values.length)&&answer.reduce((s,i)=>s+d.values[i],0)===d.target;
 if(kind==='path'){if(!Array.isArray(answer)||!answer.length||answer[0]!==d.start||new Set(answer).size!==answer.length)return false;for(let i=0;i<answer.length;i++){const at=answer[i];if(at<0||at>=d.n*d.n||!Number.isInteger(at)||d.blocked?.includes(at)||d.allowed&&!d.allowed.includes(at)||i>0&&!neighbors(answer[i-1],d.n).includes(at))return false;}return id==='maze'?answer[answer.length-1]===d.end:answer.length===d.allowed.length;}
 if(kind==='rails')return Array.isArray(answer)&&answer.length===d.n*d.n&&answer.every(x=>Number.isInteger(x)&&x>=0&&x<4)&&railPath(p,answer).length>0;
 return same(answer,p.solution);
}
