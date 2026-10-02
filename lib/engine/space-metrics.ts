import {equal,key,normalize,range,type Puzzle} from './shared.ts';
import {canExtract,rotateAxis,surfaceStep,tilt} from './space.ts';
import {foldNet} from '../puzzles.ts';
export const SPACE_GOALS:Record<string,[string,string,string,string,string]>={
 cubes:['はしらごとの たかさを あわせる','かくれた つみきを みつける','だんごとに わけて かぞえる','はこ ぜんぶから あなを ひく','はしらと だんを つかいわける'],
 shadow:['たかさを かげに うつす','おくの はしらの かさなりを みる','いちばん たかい はしらを くらべる','てまえと おくの たかさを くらべる','あなと でこぼこを かげに うつす'],
 top:['たかさを なくして うえから みる','したに かくれた ばしょを みる','あいた マスを さがす','ふくざつな ならびの あきを みる','たかさに まどわされず ならびを みる'],
 rotate3d:['つながりを たもって まわす','たてと よこの むきを くらべる','まがりと えだを たどる','にている つながりを みわける','かくれた つながりも くらべる'],
 nets:['おりあげて うらの めんを さがす','うえと まえから よこの めんへ','おって ひとつの むきに ころがす','むきを かえて ころがす','ながい みちで めんの むきを たもつ'],
 slice:['きりくちが とおる めんを みる','みえない きりくちを つなげる','3つの しるしの めんを つくる','しるしから うらの めんへ つなぐ','かくれた へんも ふくめて つくる'],
 rollcube:['ひとつずつ めんを うつす','まがりかどで むきを たもつ','たてと よこの かいてんを つなぐ','まわった めんを つぎへ たどる','ながい みちの とちゅうを まとめる'],
 viewbuild:['たかさと かさなりを くらべる','3つの ずの ちがいを つなぐ','あなを 3つの むきで たしかめる','かくれた だんを くらべる','3つの じょうけんを あわせる'],
 pack3d:['あなの かたちを つなぐ','2だんの つながりを たどる','たて・よこ・おくの まがりを みる','3だんを ひとつの ピースに する','ひとマスの ちがいを みわける'],
 extract3d:['さきに じゃまな ピースを ぬく','つぎに ぬける ピースを かんがえる','むきが ちがう じゃまを たどる','おおきな ピースの みちを あける','つぎに あく みちを さきよみする'],
 drop3d:['さいしょに あたる はしらを さがす','したの すきまを のこして とめる','でこぼこの ピースを とめる','いくつもの すきまを たしかめる','ピースと ささえの たかさを あわせる'],
 ropeends:['こうさしても おなじ ひもを たどる','もどる ひもも たどりつづける','となりの ひもに のりかえず たどる','まわりの こうさに まどわされない','ながい ひもを くぎって たどる'],
 contact3d:['めんで さわる つみきを かぞえる','うえと したも たしかめる','かどと めんを わける','かくれた となりを しらべる','3つの じくで めんを たしかめる'],
 depthorder:['みる むきから ちかさを くらべる','てまえからの じゅんばんを みる','みる ばしょを かえて くらべる','ある つみきの おくを さがす','よこと おくの じゅんを つなぐ'],
 voxelcoords:['よこ・おく・たかさを よむ','ひとつの じくを うごかす','ふたつの じくを うごかす','3つの じくの うごきを つなぐ','ついた ばしょから ぎゃくに たどる'],
 surfacewalk:['へんを こえて となりの めんへ','むきを かえて べつの へんへ','ちがう めんから さんぽする','めんを またいで むきを たもつ','いくつもの めんの みちを つなぐ'],
 balancefoot:['おもい ほうへ まんなかが よる','おもさと きょりを くらべる','たかい はしらだけで きめない','つみきを うつした あとを かんがえる','はしらを いれかえた あとを かんがえる'],
 tunnelpass:['あなと でっぱりを くらべる','ふたつの あなが どちらも ひつよう','たて・よこ・おくの むきを くらべる','あなの あまりは とおって よい','ひっかかる でっぱりを ふたつの あなで みる'],
 hinge3d:['かんせつより さきだけを まわす','ひらたい かたちを たてに おる','ちがう じくへ おりまげる','つぎの かんせつの むきを たもつ','うごく ぶぶんを つぎの おりめへ つなぐ'],
 handedness:['かがみで いろの じゅんが かわる','まわしても みぎてと ひだりては ちがう','りょうほうを まわして くらべる','かがみで ひとつの じくを はんてんする','かがみと かいてんを えらびわける'],
 gears:['かみあうと はんたいに まわる','ベルトの つなぎかたを よみわける','クロスする ベルトを たどる','さいごから ぎゃくに むきを さがす','あう ベルトの つなぎかたを さがす'],
 gravitytray:['かべまで ころがして とめる','ふたつの たまの じゅんを みる','さきの たまから じゅんに とめる','まえの うごきで できる じゃまを つかう','とちゅうの たまの ならびを たもつ'],
 viewpoint:['ひだりと みぎの ならびを くらべる','おくの とうが かさなる','ふたつの たかさを あわせて くらべる','おなじ たかさでも ならびを くらべる','かくれる とうも ふくめて けしきを つくる'],
 skewer:['やじるしから じゅんに よむ','ぎゃくの むきから たどる','しろい あなを とばして よむ','ちがう だんへ まっすぐ たどる','あなを とばして ぎゃくからも たどる'],
};
const unique=(a:any[])=>new Set(a.map(key)).size;
const sum=(a:number[])=>a.reduce((s,v)=>s+v,0);
const has=(c:number[][],p:number[])=>c.some(v=>equal(v,p));
const columns=(c:number[][])=>[...new Set(c.map(([x,y])=>key([x,y])))].map(v=>JSON.parse(v) as number[]);
const cellStats=(c:number[][])=>{const dims=range(3).map(i=>Math.max(...c.map(v=>v[i]))-Math.min(...c.map(v=>v[i]))+1),cols=columns(c),heights=cols.map(([x,y])=>Math.max(...c.filter(v=>v[0]===x&&v[1]===y).map(v=>v[2]+1))),degrees=c.map(p=>c.filter(q=>sum(q.map((v,i)=>Math.abs(v-p[i])))===1).length);return{height:dims[2],width:dims[0],depth:dims[1],axes:dims.filter(v=>v>1).length,volume:c.length,footprint:cols.length,heights:unique(heights),branches:degrees.filter(v=>v>=3).length,dimsKey:[...dims].sort().join(','),degreesKey:degrees.sort().join(','),hidden:c.filter(([x,y,z])=>has(c,[x+1,y,z])&&has(c,[x,y+1,z])&&has(c,[x,y,z+1])).length};};
const projection=(c:number[][],i:number)=>normalize([...new Map(c.map(v=>{const p=i===0?[v[0],v[2]]:i===1?[v[1],v[2]]:[v[0],v[1]];return[key(p),p]})).values()]);
const requiredViews=(p:Puzzle,contains=false)=>{const views=p.data.views,pass=p.options!.map(o=>views.map((v:number[][],i:number)=>contains?projection(o.cells,i).every(c=>has(v,c)):equal(projection(o.cells,i),v)));for(let k=1;k<=views.length;k++)for(let mask=1;mask<1<<views.length;mask++)if(mask.toString(2).split('').filter(v=>v==='1').length===k&&pass.every((v:boolean[],i:number)=>i===p.solution||!v.every((yes,j)=>!(mask&(1<<j))||yes)))return k;return 0;};
export function spaceMetrics(p:Puzzle):{score:number;features:Record<string,number|string|boolean>}{
 const{id,data:d}=p,features:Record<string,number|string|boolean>={},o=p.options||[];let score=0;const set=(a:Record<string,number|string|boolean>,s:number)=>{Object.assign(features,a);score=s;};
 if(['cubes','shadow','top','rotate3d'].includes(id)){const s=cellStats(d.cubes);Object.assign(features,{height:s.height,volume:s.volume,footprint:s.footprint,distinctHeights:s.heights,hidden:s.hidden,branches:s.branches,axes:s.axes});
  if(id==='cubes')score=3*s.height+2*s.heights+s.hidden+Math.min(s.volume,20)*.08;
  if(id==='shadow'){const xs=[...new Set<number>(d.cubes.map((v:number[])=>v[0]))],profile=xs.map(x=>Math.max(...d.cubes.filter((v:number[])=>v[0]===x).map((v:number[])=>v[2]+1))),overlap=xs.filter(x=>unique(d.cubes.filter((v:number[])=>v[0]===x).map((v:number[])=>v[1]))>1).length;set({profileHeights:unique(profile),overlapColumns:overlap},3*unique(profile)+2*overlap+s.height+(p.level>=17?10:0));}
  if(id==='top'){const holes=s.width*s.depth-s.footprint;set({footprintHoles:holes,overlappingCubes:s.volume-s.footprint},2*holes+2*s.height+Math.min(6,s.volume-s.footprint));}
  if(id==='rotate3d'){const wrong=o.filter((_,i)=>i!==p.solution),sameDims=wrong.filter(v=>cellStats(v).dimsKey===s.dimsKey).length,sameDegrees=wrong.filter(v=>cellStats(v).degreesKey===s.degreesKey).length;set({sameBoundingBoxWrong:sameDims,sameDegreeWrong:sameDegrees},3*s.axes+2*s.branches+3*sameDims+4*sameDegrees+s.volume*.1);}
 }
 else if(id==='nets'){const cells=d.cells,faces=foldNet(cells)!,start=d.labels.indexOf(d.target),end=faces.findIndex(v=>v.every((x,i)=>x===-faces[start][i])),queue=[[start]],seen=new Set([start]);let path:number[]=[];while(queue.length){const a=queue.shift()!,at=a.at(-1)!;if(at===end){path=a;break;}cells.forEach((p:number[],j:number)=>{if(!seen.has(j)&&sum(p.map((v,i)=>Math.abs(v-cells[at][i])))===1){seen.add(j);queue.push([...a,j]);}});}const dirs=path.slice(1).map((j,i)=>key(cells[j].map((v:number,k:number)=>v-cells[path[i]][k]))),turns=dirs.slice(1).filter((v,i)=>v!==dirs[i]).length;const moves=d.moves||[],switches=moves.slice(1).filter((v:number,i:number)=>v%2!==moves[i]%2).length;set({foldSteps:path.length-1,foldTurns:turns,poseTask:!!d.pose,rollMoves:moves.length,rollAxisSwitches:switches},2*(path.length-1)+3*turns+3*+!!d.pose+3*moves.length+2*switches);}
 else if(id==='slice')set({sides:d.poly.length,cutAxes:d.normal.filter(Boolean).length,normalVariety:unique(d.normal),revealPolygon:d.revealPolygon!==false,sectionMode:d.sectionMode||'outline',verticesToInfer:Math.max(0,d.poly.length-(d.cutPoints?.length||d.poly.length))},2*d.normal.filter(Boolean).length+unique(d.normal)+Math.max(0,d.poly.length-(d.cutPoints?.length||d.poly.length))*.5);
 else if(id==='rollcube'){const reduced:number[]=[];d.moves.forEach((v:number)=>{if(reduced.length&&(reduced.at(-1)!+2)%4===v)reduced.pop();else reduced.push(v);});const switches=reduced.slice(1).filter((v,i)=>v%2!==reduced[i]%2).length;set({moves:d.moves.length,effectiveMoves:reduced.length,axisSwitches:switches},reduced.length+2*switches);}
 else if(id==='viewbuild'){const s=cellStats(d.cells),views=requiredViews(p);set({requiredViews:views,height:s.height,distinctHeights:s.heights,footprint:s.footprint},5*views+2*s.heights+s.footprint*.2);}
 else if(id==='pack3d'){const s=cellStats(d.hole),connections=d.hole.filter(([x,y,z]:number[])=>has(d.hole,[x,y,z+1])).length;set({holeCells:s.volume,holeLayers:s.height,axes:s.axes,layerConnections:connections,branches:s.branches},3*(s.height-1)+2*s.axes+s.branches+s.volume*.2);}
 else if(id==='extract3d'){const pieces=d.pieces,n=pieces.length,deps=pieces.map((_:any,i:number)=>range(n).filter(j=>j!==i&&!canExtract(pieces,range(n).filter(k=>k!==i&&k!==j),i))),memo=new Map<number,number>();const depth=(i:number):number=>{if(memo.has(i))return memo.get(i)!;const v=1+Math.max(0,...deps[i].map(depth));memo.set(i,v);return v;};const longest=Math.max(...range(n).map(depth)),blocked=deps.filter((v:number[])=>v.length).length,multi=pieces.filter((v:any)=>v.cells.length>1).length;set({pieces:n,dependencyDepth:longest,initiallyBlocked:blocked,multiCellPieces:multi,extractionAxes:unique(pieces.map((v:any)=>v.dir.findIndex(Boolean)))},4*(longest-1)+blocked+multi*.5);}
 else if(id==='drop3d'){const foot=[...new Set<number>(d.piece.map(([x,y]:number[])=>y*d.n+x))],heights=foot.map(i=>d.heights[i]),ph=foot.map(i=>d.piece.filter(([x,y]:number[])=>y*d.n+x===i).length),gaps=heights.filter(v=>v<d.offset).length,range=Math.max(...heights)-Math.min(...heights);set({pieceColumns:foot.length,gapColumns:gaps,supportHeightRange:range,pieceHeightVariety:unique(ph)},3*gaps+2*(unique(ph)-1)+range+foot.length*.2);}
 else if(id==='ropeends'){let at=d.start,hits=0;d.swaps.forEach((v:number)=>{if(at===v){at++;hits++;}else if(at===v+1){at--;hits++;}});set({ropes:d.n,targetCrossings:hits,irrelevantCrossings:d.swaps.length-hits,returnsToStart:at===d.start},2*hits+d.n*.2);}
 else if(id==='contact3d'){const{cells,target}=d,contacts=cells.filter((p:number[])=>sum(p.map((v,i)=>Math.abs(v-target[i])))===1),vertical=contacts.filter((p:number[])=>p[2]!==target[2]).length,decoys=cells.filter((p:number[])=>!equal(p,target)&&p.every((v,i)=>Math.abs(v-target[i])<=1)).length-contacts.length,axes=unique(contacts.map((p:number[])=>p.findIndex((v,i)=>v!==target[i])));set({contactFaces:contacts.length,contactAxes:axes,verticalContacts:vertical,edgeCornerDecoys:decoys},2*vertical+2*axes+decoys*.5);}
 else if(id==='depthorder')set({objects:d.positions.length,reasoningSteps:d.reasoningSteps||1,cameraChanged:d.observedDirection!==undefined&&d.observedDirection!==d.dir,rank:d.rank||1},4*(d.reasoningSteps||1)+(d.rank||1)*.25+d.positions.length*.1);
 else if(id==='voxelcoords'){const target=(d.result||d.target).map((v:number)=>v+1),wrong=o.filter((_:any,i:number)=>i!==p.solution).map((v:string)=>v.split('・').map(Number)),near=wrong.filter((v:number[])=>v.filter((x,i)=>x!==target[i]).length===1).length,moves=d.moves||[];set({coordinateVariety:unique(target),nearMisses:near,moves:moves.length,movementAxes:unique(moves.map((v:any)=>v.axis)),negativeMoves:moves.filter((v:any)=>v.amount<0).length,reverseTask:!!d.reverseTask},3*moves.length+2*near+unique(target)+3*+!!d.reverseTask);}
 else if(id==='surfacewalk'){let state={...d.start},cross=0;const faces=new Set([state.face]);for(const cmd of d.commands){const next=cmd==='F'?surfaceStep(state,d.n):{...state,heading:(state.heading+(cmd==='R'?1:3))%4};cross+=+(state.face!==next.face);state=next;faces.add(state.face);}const turns=d.commands.filter((v:string)=>v!=='F').length;set({edgeCrossings:cross,distinctFaces:faces.size,turns,commands:d.commands.length},3*cross+2*(faces.size-1)+turns);}
 else if(id==='balancefoot'){const heights=d.resultHeights||d.heights,answer=Math.floor(d.center)+1,max=Math.max(...heights),tallestWrong=!heights.some((v:number,i:number)=>v===max&&i+1===answer),boundary=Math.min(d.center%1,1-d.center%1);set({occupiedColumns:heights.filter(Boolean).length,heightVariety:unique(heights),boundaryDistance:boundary,tallestWrong,edgeAnswer:answer===1||answer===4,transfer:!!d.move,columnSwap:!!d.swap},3*+tallestWrong+2*unique(heights)+Math.min(5,1/(.1+boundary))+3*+!!d.move+4*+!!d.swap);}
 else if(id==='tunnelpass'){const s=cellStats(o[p.solution].cells),views=requiredViews(p,true),extra=d.views.reduce((sum:number,v:number[][],i:number)=>sum+v.length-projection(o[p.solution].cells,i).length,0);set({requiredViews:views,axes:s.axes,branches:s.branches,holeSlack:extra},5*views+s.branches+s.axes+2*extra);}
 else if(id==='hinge3d'){let end=d.points;for(const t of d.turns)end=[...end.slice(0,t.pivot+1),...rotateAxis(end.slice(t.pivot+1),t.axis,t.q,end[t.pivot])];const axes=unique(d.turns.map((v:any)=>v.axis)),pivots=unique(d.turns.map((v:any)=>v.pivot)),returns=equal(end,d.points);set({turns:d.turns.length,axes,pivots,returnsToStart:returns},3*d.turns.length+2*axes+2*pivots-4*+returns);}
 else if(id==='handedness'){const dirs=d.points.slice(1).map((p:number[])=>p.map((v,i)=>Math.sign(v-d.points[0][i]))),neg=dirs.filter((v:number[])=>v.includes(-1)).length,rot=dirs.filter((v:number[],i:number)=>v[i]!==1).length;set({negativeArms:neg,sourceRotatedAxes:rot,matchTask:!!d.matchTask,exactReflection:!!d.exactReflection,reflectionAxis:d.reflectionAxis||0,options:o.length},2*neg+rot+o.length);}
 else if(id==='gears'){const switches=d.links.slice(1).filter((v:string,i:number)=>v!==d.links[i]).length;set({links:d.links.length,ruleTypes:unique(d.links),ruleSwitches:switches,crossedBelts:d.links.filter((v:string)=>v==='crossed').length,reverseTask:d.unknown==='start',missingLink:d.missingLink!==undefined},2*switches+unique(d.links)+3*+(d.unknown==='start')+4*+(d.missingLink!==undefined));}
 else if(id==='gravitytray'){let end=d.balls,collisions=0,walls=0;for(const v of d.moves){const separate=end.map((at:number)=>tilt([at],d.n,d.walls,v)[0]);collisions+=separate.length-unique(separate);const clear=tilt(end,d.n,[],v);end=tilt(end,d.n,d.walls,v);walls+=+!equal(end,clear);}const essential=d.moves.filter((_:number,skip:number)=>{let a=d.balls;d.moves.forEach((v:number,i:number)=>{if(i!==skip)a=tilt(a,d.n,d.walls,v);});return!equal(a,end);}).length;set({moves:d.moves.length,indispensableMoves:essential,ballCollisionEvents:collisions,wallInfluencedMoves:walls},3*essential+2*collisions+walls);}
 else if(id==='viewpoint'){const profiles=d.profiles||[],photo=d.photo||[],cues=profiles.length?range(photo.length).filter(i=>profiles.every((v:number[],j:number)=>j===d.dir||v[i]!==photo[i])).length:1;set({objects:d.positions.length,occludedTowers:d.overlap||0,silhouette:!!profiles.length,singleCuePositions:cues},profiles.length?6+(cues?0:4)+2*(d.overlap||0):d.positions.length*.5);}
 else if(id==='skewer'){const tokens=d.path.map(([x,y,z]:number[])=>d.values[z*d.n*d.n+y*d.n+x]),holes=tokens.filter((v:number)=>!v).length;set({rayLength:tokens.length,holes,reverse:d.sign<0,distinctSymbols:unique(tokens.filter(Boolean)),pathHighlighted:!!d.scene.path},tokens.length+2*holes+2*+(d.sign<0)+unique(tokens.filter(Boolean)));}
 return{score,features};
}

/** A task key: arbitrary names, distractor sampling and hidden data are not fresh questions.
 * Candidate geometry stays in recognition tasks whose source alone is ambiguous.
 */
export function spaceQuestionBody(p:Puzzle):string{
 if(p.id==='cubes'){let c=p.data.cubes;const poses=[];for(let q=0;q<4;q++){poses.push(key(normalize(c)));c=c.map(([x,y,z]:number[])=>[-y,x,z]);}return poses.sort()[0];}
 const d=p.data,options=(values:any[])=>values.map(key).sort();
 if(p.id==='nets'){
  const faces=d.cells.map((cell:number[],i:number)=>({cell,label:d.labels[i]})).sort((a:any,b:any)=>key(a.cell).localeCompare(key(b.cell))),labels=new Map<number,number>(faces.map((v:any,i:number)=>[v.label,i+1]));
  return key({cells:faces.map((v:any)=>v.cell),target:labels.get(d.target),pose:d.pose?{top:labels.get(d.pose.top),front:labels.get(d.pose.front)}:null,side:d.side||null,moves:d.moves||[]});
 }
 if(p.id==='rollcube')return key({moves:d.moves});
 if(p.id==='depthorder'){
  const sorted=d.positions.map((point:number[],i:number)=>({point,i})).sort((a:any,b:any)=>key(a.point).localeCompare(key(b.point))),rename=new Map<number,number>(sorted.map((v:any,i:number)=>[v.i,i])),label=(v:any)=>typeof v==='string'&&/^[A-Z]$/.test(v)?rename.get(v.charCodeAt(0)-65):v;
  return key({positions:sorted.map((v:any)=>v.point),dir:d.dir,observedDirection:d.observedDirection,rank:d.rank,question:(d.prompt||'nearest').replace(/[A-Z]/g,(v:string)=>`T${label(v)}`)});
 }
 if(p.id==='viewpoint'){
  if(d.profiles)return key({towers:d.positions.map((v:number[],i:number)=>[...v,d.heights[i]]).sort((a:number[],b:number[])=>key(a).localeCompare(key(b))),photo:d.photo});
  return key({positions:[...d.positions].sort((a:number[],b:number[])=>key(a).localeCompare(key(b))),photoPositions:d.order.map((i:number)=>d.positions[i])});
 }
 if(p.id==='extract3d')return key(d.pieces.map((v:any)=>({cells:[...v.cells].sort((a:number[],b:number[])=>key(a).localeCompare(key(b))),dir:v.dir})).sort((a:any,b:any)=>key(a).localeCompare(key(b))));
 if(p.id==='handedness'){
  const order=range(d.points.length-1).map(i=>i+1).sort((a,b)=>key(d.points[a]).localeCompare(key(d.points[b]))),reorder=(points:number[][])=>[points[0],...order.map(i=>points[i])];
  return key({points:reorder(d.points),matchTask:!!d.matchTask,exactReflection:!!d.exactReflection,reflectionAxis:d.exactReflection?d.reflectionAxis:null,options:options(p.options!.map(v=>reorder(v.points)))});
 }
 if(p.id==='slice')return key({mode:d.sectionMode,outline:d.sectionMode==='outline'||d.sectionMode==='partial'?d.poly:null,cutPoints:d.sectionMode==='outline'?null:d.cutPoints,plane:d.sectionMode==='plane'?d.planeQuad:null});
 if(p.id==='gears')return key({links:d.links.map((v:string,i:number)=>i===d.missingLink?'?':v),start:d.unknown==='start'?null:d.start,end:d.unknown==='start'||d.missingLink!==undefined?d.end:null,unknown:d.unknown||null,missingLink:d.missingLink??null});
 if(p.id==='gravitytray')return key({n:d.n,walls:[...d.walls].sort((a:number,b:number)=>a-b),balls:[...d.balls].sort((a:number,b:number)=>a-b),moves:d.moves});
 if(p.id==='skewer'){
  const names=new Map<number,number>(),values=d.values.map((v:number)=>{if(!v)return 0;if(!names.has(v))names.set(v,names.size+1);return names.get(v);});
  return key({n:d.n,h:d.h,axis:d.axis,fixed:d.fixed.filter((_:number,i:number)=>i!==d.axis),sign:d.sign,values,pathHighlighted:!!d.scene.path});
 }
 if(p.id==='viewbuild'||p.id==='tunnelpass')return key({views:d.views,options:options(p.options!.map(v=>normalize(v.cells)))});
 if(d.scene)return key(d.scene);
 return key({cubes:normalize(d.cubes)});
}
