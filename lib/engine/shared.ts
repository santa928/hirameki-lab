/** Deterministic puzzle primitives. No React, clock or browser dependency. */
export type Scene={type:string;[key:string]:any};
export type Puzzle={id:string;level:number;seed:number;kind:string;data:any;solution:any;options?:any[];hint:string};
export type Meta=readonly [string,string,string,string,string];
export const equal=(a:any,b:any)=>JSON.stringify(a)===JSON.stringify(b);
export const key=(a:any)=>JSON.stringify(a);
export const range=(n:number)=>Array.from({length:n},(_,i)=>i);
export function hash(s:string){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export function adjacent(i:number,n:number,rows=n){return [i%n>0?i-1:-1,i%n<n-1?i+1:-1,i>=n?i-n:-1,i<n*(rows-1)?i+n:-1].filter(x=>x>=0);}
export function normalize(c:number[][]){if(!c.length)return[];const mins=c[0].map((_,j)=>Math.min(...c.map(v=>v[j])));return c.map(v=>v.map((x,j)=>x-mins[j])).sort((a,b)=>key(a).localeCompare(key(b)));}
export function rotate(c:number[][],q=1){let a=c.map(v=>[...v]);for(let k=0;k<(q+4)%4;k++)a=a.map(([x,y,...z])=>[-y,x,...z]);return normalize(a);}
export function search<T>(start:T,next:(s:T)=>T[],goal:(s:T)=>boolean,limit=30000):T[]|null{
 const states=[start],parents=[-1],seen=new Set([key(start)]);for(let i=0;i<states.length&&i<limit;i++){
  if(goal(states[i])){const path:T[]=[];for(let j=i;j>=0;j=parents[j])path.push(states[j]);return path.reverse();}
  for(const s of next(states[i])){const k=key(s);if(seen.has(k)||states.length>=limit)continue;seen.add(k);states.push(s);parents.push(i);}
 }return null;
}
export function context(id:string,level:number,seed:number){
 const L=Math.max(1,Math.min(20,Math.floor(level)||1));let a=hash(id+':'+seed);
 const r=()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};
 const int=(lo:number,hi:number)=>lo+Math.floor(r()*(hi-lo+1));
 const shuffle=<T>(items:T[])=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=int(0,i);[a[i],a[j]]=[a[j],a[i]];}return a;};
 const pick=<T>(items:T[])=>items[int(0,items.length-1)];
 const base=(kind:string,data:any,solution:any,hint='ひとつずつ たしかめよう。'):Puzzle=>({id,level:L,seed,kind,data:{extended:true,...data},solution,hint});
 const choice=(correct:any,wrong:any[],scene:Scene,hint:string,extra:any={})=>{const options=shuffle([correct,...shuffle(wrong.filter((v,i,arr)=>!equal(v,correct)&&arr.findIndex(w=>equal(v,w))===i)).slice(0,3)]);return {...base('visual-choice',{scene,...extra},options.findIndex(v=>equal(v,correct)),hint),options};};
 const numeric=(answer:number,scene:Scene,hint='ひとつずつ かぞえてみよう。',min=0,extra:any={})=>{const ds=shuffle(range(13).map(i=>i-6).filter(i=>i&&answer+i>=min));const wrong=ds.slice(0,3).map(d=>answer+d);return choice(answer,wrong,scene,hint,extra);};
 const shape=(count:number)=>{const c=[[0,0]],seen=new Set(['0,0']);for(let tries=0;c.length<count&&tries<1000;tries++){const p=pick(c),d=pick([[1,0],[-1,0],[0,1],[0,-1]]),q=[p[0]+d[0],p[1]+d[1]];if(!seen.has(q.join(','))){seen.add(q.join(','));c.push(q);}}return normalize(c);};
 const pile=(w=2+Math.floor(L/8),h=2+Math.floor(L/5))=>{const cells:number[][]=[];for(let x=0;x<w;x++)for(let y=0;y<w;y++)for(let z=0,n=int(0,h);z<n;z++)cells.push([x,y,z]);return cells.length?normalize(cells):[[0,0,0]];};
 return {id,L,seed,r,int,pick,shuffle,base,choice,numeric,shape,pile};
}
export type Context=ReturnType<typeof context>;
export const sceneText=(text:string,sub=''):Scene=>({type:'text',text,sub});
export const sceneGrid=(n:number,values:any[],extra:any={}):Scene=>({type:'grid',n,values,...extra});
export const sceneShape=(cells:number[][],extra:any={}):Scene=>({type:'shape',cells,...extra});
export const sceneCubes=(cells:number[][],extra:any={}):Scene=>({type:'cubes',cells,...extra});
export const sceneRow=(items:Scene[],extra:any={}):Scene=>({type:'row',items,...extra});
export function perimeter(cells:number[][]){const set=new Set(cells.map(c=>c.join(',')));return cells.reduce((s,[x,y])=>s+[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>!set.has([x+dx,y+dy].join(','))).length,0);}
export function connected(cells:number[][]){if(!cells.length)return false;const set=new Set(cells.map(c=>c.join(','))),seen=new Set([cells[0].join(',')]),q=[cells[0]];for(let i=0;i<q.length;i++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const p=[q[i][0]+dx,q[i][1]+dy],k=p.join(',');if(set.has(k)&&!seen.has(k)){seen.add(k);q.push(p);}}return seen.size===cells.length;}
