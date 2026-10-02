const range=n=>Array.from({length:n},(_,i)=>i),pop=m=>{let n=0;for(;m;m&=m-1)n++;return n;};
function tools(n){const full=2**(n*n)-1,adj=range(n*n).map(i=>[i%n?i-1:-1,i%n<n-1?i+1:-1,i>=n?i-n:-1,i<n*(n-1)?i+n:-1].filter(x=>x>=0)),near=adj.map(a=>a.reduce((m,i)=>m|1<<i,0)),squares=[];for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++)squares.push([y*n+x,y*n+x+1,(y+1)*n+x,(y+1)*n+x+1].reduce((m,i)=>m|1<<i,0));
 function components(mask){const out=[];while(mask){const bit=mask&-mask;let seen=bit,front=bit;while(front){const at=31-Math.clz32(front&-front);front&=front-1;const next=near[at]&mask&~seen;seen|=next;front|=next;}out.push(seen);mask&=~seen;}return out;}
 function neighborMask(mask){let out=0;for(let bits=mask;bits;bits&=bits-1)out|=near[31-Math.clz32(bits&-bits)];return out;}
 const seaValid=sea=>sea!==0&&!squares.some(s=>(sea&s)===s)&&components(sea).length===1;
 function solver(clues,budget=100000){const entries=Object.entries(clues).map(([i,size])=>[+i,size]),allClues=entries.reduce((m,[i])=>m|1<<i,0);let nodes=0,aborted=false;const regions=entries.map(([at,size])=>{const bit=1<<at,other=allClues&~bit,forbidden=other|neighborMask(other);let states=new Set([bit]);for(let k=1;k<size;k++){const next=new Set();for(const state of states){let boundary=neighborMask(state)&full&~state&~forbidden;while(boundary){const v=boundary&-boundary;boundary^=v;next.add(state|v);}}states=next;}return[...states].filter(m=>(m&forbidden)===0);});
 let count=0,answers=[];function go(remaining,land,forbidden){if(++nodes>budget){aborted=true;return;}if(count>=2||aborted)return;if(!remaining.length){const sea=full^land;if(seaValid(sea)){count++;answers.push(range(n*n).map(i=>sea>>i&1));}return;}
 let next=null,at=-1,possible=land;for(const j of remaining){const candidates=regions[j].filter(mask=>(mask&forbidden)===0);if(!candidates.length)return;for(const mask of candidates)possible|=mask;if(next===null||candidates.length<next.length){next=candidates;at=j;}}
 if(squares.some(square=>(square&possible)===0))return;for(const mask of next)go(remaining.filter(j=>j!==at),land|mask,forbidden|mask|neighborMask(mask));}
 go(entries.map((_,i)=>i),0,0);return{count,nodes,aborted,answers,candidateCounts:regions.map(a=>a.length)};}
 return{full,components,seaValid,solver};}

const solverCache=new Map();
/** Exact count capped at2. A budget hit is inconclusive, never unique. */
export function islandSolutions(n,clues,budget=50000){
  if(!solverCache.has(n))solverCache.set(n,tools(n));
  return solverCache.get(n).solver(clues,budget);
}
