/** Teaching geometry for the existing right-to-left / bottom-to-top folds.
 * Cell centres reflect as W - 1 - x; boundary coordinates reflect as W - x.
 * Creases retain their original-paper provenance, so a folded edge is not
 * incorrectly duplicated onto both outside edges when the paper is opened.
 */
export type FoldAxis = 'x' | 'y';
export type PaperSize = {readonly width:number;readonly height:number};
export type PaperPoint = readonly [number,number];
export type CreaseSegment = {readonly order:number;readonly from:PaperPoint;readonly to:PaperPoint};
export type FoldStep = {
 readonly order:number;readonly axis:FoldAxis;
 readonly before:PaperSize;readonly after:PaperSize;
 readonly moving:'right'|'bottom';readonly remaining:'left'|'top';
 readonly crease:readonly CreaseSegment[];
 readonly creasesBefore:readonly CreaseSegment[];readonly creasesAfter:readonly CreaseSegment[];
};
export type UnfoldStep = {
 readonly order:number;readonly axis:FoldAxis;
 readonly before:PaperSize;readonly after:PaperSize;
 readonly holes:readonly PaperPoint[];readonly creases:readonly CreaseSegment[];
};
type Point=[number,number];
type Segment={order:number;from:Point;to:Point};
function freeze<T>(value:T):T {
 if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}
 return value;
}
function points(items:readonly PaperPoint[]):Point[]{
 const unique=new Map(items.map(p=>[p.join(','),[p[0],p[1]] as Point]));
 return [...unique.values()].sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
}
function segments(items:Segment[]):Segment[]{
 const unique=new Map<string,Segment>();
 for(const s of items){
  const swap=s.from[0]>s.to[0]||s.from[0]===s.to[0]&&s.from[1]>s.to[1];
  const from=(swap?s.to:s.from).slice() as Point,to=(swap?s.from:s.to).slice() as Point;
  unique.set(s.order+':'+from.join(',')+':'+to.join(','),{order:s.order,from,to});
 }
 return [...unique.values()];
}
function mirrorSegments(items:Segment[],axis:FoldAxis,size:PaperSize):Segment[]{
 const i=axis==='x'?0:1,extent=axis==='x'?size.width:size.height;
 return items.map(s=>({order:s.order,from:s.from.map((v,k)=>k===i?extent-v:v) as Point,to:s.to.map((v,k)=>k===i?extent-v:v) as Point}));
}
function crease(order:number,axis:FoldAxis,size:PaperSize):Segment[]{
 const extent=axis==='x'?size.height:size.width,line=(axis==='x'?size.width:size.height)/2;
 return Array.from({length:extent},(_,i)=>axis==='x'?{order,from:[line,i] as Point,to:[line,i+1] as Point}:{order,from:[i,line] as Point,to:[i+1,line] as Point});
}
function foldedSegments(original:Segment[],steps:FoldStep[],count:number):Segment[]{
 let result=original.map(s=>({order:s.order,from:[...s.from] as Point,to:[...s.to] as Point}));
 for(const step of steps.slice(0,count)){
  const i=step.axis==='x'?0:1,extent=i===0?step.before.width:step.before.height;
  const map=(p:Point)=>p.map((v,k)=>k===i&&v>extent/2?extent-v:v) as Point;
  result=segments(result.map(s=>({order:s.order,from:map(s.from),to:map(s.to)})));
 }
 return result;
}
export function foldTrace(n:number,folds:readonly FoldAxis[],holes:readonly number[]){
 if(!Number.isInteger(n)||n<1)throw new Error('Invalid fold paper size');
 let width=n,height=n;
 const steps:FoldStep[]=[];
 for(const [at,axis] of folds.entries()){
  if(axis!=='x'&&axis!=='y')throw new Error('Invalid fold axis');
  const before={width,height},extent=axis==='x'?width:height;
  if(extent<2||extent%2)throw new Error('Invalid fold dimension');
  if(axis==='x')width/=2;else height/=2;
  steps.push({order:at+1,axis,before,after:{width,height},moving:axis==='x'?'right':'bottom',remaining:axis==='x'?'left':'top',crease:crease(at+1,axis,before),creasesBefore:[],creasesAfter:[]});
 }
 if(holes.some(i=>!Number.isInteger(i)||i<0||i>=width*height))throw new Error('Invalid hole index');
 // Each new crease pierces every layer present before that fold. Reconstruct
 // its original-paper copies before mapping them into any later folded state.
 const originalCreases:Segment[]=[];
 for(const step of steps){
  let copies=step.crease.map(s=>({order:s.order,from:[...s.from] as Point,to:[...s.to] as Point}));
  for(let j=step.order-2;j>=0;j--)copies=segments([...copies,...mirrorSegments(copies,steps[j].axis,steps[j].before)]);
  originalCreases.push(...copies);
 }
 const allCreases=segments(originalCreases);
 const enriched=steps.map((s,i)=>({...s,
  creasesBefore:foldedSegments(allCreases.filter(c=>c.order<s.order),steps,i),
  creasesAfter:foldedSegments(allCreases.filter(c=>c.order<=s.order),steps,i+1)
 }));
 let current=points(holes.map(i=>[i%width,Math.floor(i/width)]));
 const folded={width,height,holes:current,creases:foldedSegments(allCreases,steps,steps.length)};
 const unfoldSteps:UnfoldStep[]=[];
 for(let j=steps.length-1;j>=0;j--){
  const step=steps[j],i=step.axis==='x'?0:1,extent=i===0?step.before.width:step.before.height;
  const reflected=current.map(p=>p.map((v,k)=>k===i?extent-1-v:v) as Point);
  current=points([...current,...reflected]);
  unfoldSteps.push({order:step.order,axis:step.axis,before:{...step.after},after:{...step.before},holes:current,creases:foldedSegments(allCreases,steps,j)});
 }
 const indices=new Set(current.map(([x,y])=>y*n+x));
 return freeze({n,folds:[...folds],foldSteps:enriched,folded,unfoldSteps,
  originalCreases:allCreases,mask:Array.from({length:n*n},(_,i)=>indices.has(i)?1:0)});
}
