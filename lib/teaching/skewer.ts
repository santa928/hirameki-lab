export type VoxelCoordinate = readonly [number,number,number];
export type SkewerInput = {
 readonly n:number;readonly h:number;readonly axis:0|1|2;
 readonly fixed:VoxelCoordinate;readonly sign:1|-1;readonly values:readonly number[];
};
export type SkewerStep = {
 readonly step:number;readonly coordinate:VoxelCoordinate;readonly displayCoordinate:VoxelCoordinate;
 readonly index:number;readonly value:number;readonly skipped:boolean;readonly tokens:readonly number[];
};
function freeze<T>(value:T):T{
 if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}
 return value;
}
/** Values use z*n*n+y*n+x. Zero is a hole: traverse it, but do not read a token.
 * Engine coordinates are zero-based; displayCoordinate is one-based.
 */
export function skewerTrace(d:SkewerInput){
 const {n,h,axis,sign}=d;
 if(!Number.isInteger(n)||n<1||!Number.isInteger(h)||h<1)throw new Error('Invalid skewer dimensions');
 if(!Number.isInteger(axis)||axis<0||axis>2)throw new Error('Invalid skewer axis');
 if(sign!==1&&sign!==-1)throw new Error('Invalid skewer sign');
 if(d.fixed.length!==3||d.fixed.some((v,i)=>!Number.isInteger(v)||v<0||v>=[n,n,h][i]))throw new Error('Invalid skewer coordinate');
 if(d.values.length!==n*n*h||d.values.some(v=>!Number.isInteger(v)||v<0))throw new Error('Invalid skewer values');
 const length=[n,n,h][axis],tokens:number[]=[],steps:SkewerStep[]=[];
 for(let k=0;k<length;k++){
  const coordinate=[...d.fixed] as [number,number,number];coordinate[axis]=sign===1?k:length-1-k;
  const [x,y,z]=coordinate,index=z*n*n+y*n+x,value=d.values[index],skipped=value===0;
  if(!skipped)tokens.push(value);
  steps.push({step:k+1,coordinate,displayCoordinate:coordinate.map(v=>v+1) as [number,number,number],index,value,skipped,tokens:[...tokens]});
 }
 const first=steps[0],outside=[...first.coordinate] as [number,number,number];outside[axis]-=sign;
 return freeze({axis,sign,entry:{coordinate:[...first.coordinate] as [number,number,number],displayCoordinate:[...first.displayCoordinate] as [number,number,number],outside,index:first.index},
  steps,tokens:[...tokens],answer:tokens.join(' ')});
}
