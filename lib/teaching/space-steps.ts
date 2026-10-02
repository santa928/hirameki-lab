import type{Puzzle,Scene}from'../engine/shared.ts';
import{FRAMES,surfaceStep,applyHingeTurn,tiltTrace,dropPlacement}from'../engine/space.ts';
import{foldNet}from'../puzzles.ts';
import{rollTrace}from'./roll.ts';
export type SpaceTeachingStep={scene:Scene;caption:string;phase:'observe'|'transform'|'calculate'|'compare'};
const copy=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const headingNames=['うえ ↑','みぎ →','した ↓','ひだり ←'];
const axisNames=['横 X','奥 Y','高さ Z'];
const dot=(a:number[],b:number[])=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const opposite=(normal:number[],normals:number[][])=>normals.findIndex(n=>n.every((v,i)=>v===-normal[i]));
const worldHeading=(state:{face:number;heading:number})=>{const frame=FRAMES[state.face],dx=[0,1,0,-1][state.heading],dy=[-1,0,1,0][state.heading];return frame.u.map((v,i)=>v*dx+frame.v[i]*dy);};
const position=(at:number,n:number)=>`${Math.floor(at/n)+1}行 ${at%n+1}列`;
/** Derive teaching states from source data. Never replace a source by its answer option. */
export function spaceTeaching(p:Puzzle):SpaceTeachingStep[]|null{
 const d=p.data,out:SpaceTeachingStep[]=[];
 const add=(scene:Scene,caption:string,phase:SpaceTeachingStep['phase'])=>out.push({scene:copy(scene),caption,phase});
 if(p.id==='surfacewalk'){
  let state=copy(d.start);
  const scene=(extra:Record<string,unknown>={})=>({type:'surface-state',n:d.n,state,frame:FRAMES[state.face],frames:FRAMES,worldHeading:worldHeading(state),commands:d.commands,...extra});
  add(scene({step:0}),`面${state.face+1}の${state.y+1}行${state.x+1}列から。面の${headingNames[state.heading]}を向いているよ。`,'observe');
  d.commands.forEach((command:string,index:number)=>{const from=copy(state);state=command==='F'?surfaceStep(state,d.n):{...state,heading:(state.heading+(command==='R'?1:3))%4};
   const crossed=from.face!==state.face;
   add(scene({from,command,step:index+1,crossed}),command==='F'?(crossed?`辺を越えて、面${from.face+1}から面${state.face+1}へ。新しい面では${headingNames[state.heading]}を向くよ。`:`前へ1マス。${state.y+1}行${state.x+1}列に進むよ。`):`その場で${command==='R'?'右':'左'}へ90度。面の${headingNames[state.heading]}を向くよ。`,'transform');
  });
  add(scene({step:d.commands.length}),`最後は面${state.face+1}。辺を越えるたびに、面と向きを一緒に追おう。`,'compare');
 }else if(p.id==='hinge3d'){
  let points=copy<number[][]>(d.points);
  const scene=(extra:Record<string,unknown>={})=>({type:'hinge-state',points,turns:d.turns,...extra});
  add(scene({fixed:[]}),'線の順番と関節の番号を確かめよう。関節より先だけが動くよ。','observe');
  d.turns.forEach((turn:{pivot:number;axis:number;q:number},index:number)=>{const fixed=Array.from({length:turn.pivot+1},(_,i)=>i),sign=turn.q===3?-1:1;
   add(scene({pivot:turn.pivot,axis:turn.axis,sign,fixed,turn:index+1}),`${index+1}回目。関節${turn.pivot}と手前を固定し、${axisNames[turn.axis]}軸の${sign>0?'正':'負'}の向きへ90度回すよ。`,'observe');
   const before=copy(points);points=applyHingeTurn(points,turn);
   add(scene({before,pivot:turn.pivot,axis:turn.axis,sign,fixed,turn:index+1}),`関節${turn.pivot}を中心に、点${turn.pivot+1}から先をまとめて回したよ。固定した点は同じ場所だね。`,'transform');
  });
  add(scene({fixed:[]}),'回す順番をたどった形と、選択肢の線の順番を比べよう。','compare');
 }else if(p.id==='gravitytray'){
  let balls=copy<number[]>(d.balls);
  const scene=(extra:Record<string,unknown>={})=>({type:'tilt-state',n:d.n,walls:d.walls,balls,moves:d.moves,...extra});
  add(scene(),'玉と壁を確かめよう。進む先にいる玉から止めるよ。','observe');
  d.moves.forEach((dir:number,index:number)=>{const trace=tiltTrace(balls,d.n,d.walls,dir);
   add(scene({dir,step:index+1,order:trace.order,settled:[]}),`${index+1}回目は${headingNames[dir]}へ。進む先の玉から順に転がすよ。`,'observe');
   trace.steps.forEach((stop,ballIndex)=>{balls=[...stop.settled,...trace.order.slice(ballIndex+1)];
    const reason=stop.reason==='wall'?'壁':stop.reason==='ball'?'先に止まった玉':'トレイの端';
    add(scene({dir,step:index+1,order:trace.order,settled:stop.settled,stop}),`${position(stop.from,d.n)}の玉は${position(stop.to,d.n)}まで。${reason}の手前で止まるよ。`,'transform');
   });balls=trace.balls;
  });
  add(scene(),'すべての矢印を順に使った玉の位置を、選択肢と比べよう。','compare');
 }else if(p.id==='drop3d'){
  const placement=dropPlacement(d.n,d.heights,d.piece);
  const scene=(extra:Record<string,unknown>={})=>({type:'drop-state',n:d.n,heights:d.heights,piece:d.piece,footprint:placement.footprint,...extra});
  const above=placement.offset+2;
  add(scene({position:'above',offset:above,placed:d.piece.map(([x,y,z]:number[])=>[x,y,z+above]),supports:[],gaps:[],result:d.heights}),'ピースの真下にある柱を確かめよう。ピースは同じ形のまま真下へ落ちるよ。','observe');
  add(scene({position:'above',offset:above,placed:d.piece.map(([x,y,z]:number[])=>[x,y,z+above]),supports:placement.supports,gaps:[],result:d.heights,columnHeights:placement.footprint.map(at=>({at,height:d.heights[at]}))}),`真下の柱の高さは${placement.footprint.map(at=>d.heights[at]).join('・')}。最大の${placement.offset}で、最初に柱へ触れるよ。`,'calculate');
  add(scene({...placement,position:'contact'}),`ピース全体を同じ高さ${placement.offset}で止めるよ。低い柱へ別々に落とさないよ。`,'transform');
  placement.gaps.forEach(gap=>add(scene({...placement,position:'contact',gap}),`${position(gap.at,d.n)}の柱は高さ${gap.from}。ピースの下は高さ${gap.to}なので、${gap.to-gap.from}段の空間が残るよ。`,'calculate'));
  add(scene({...placement,position:'contact'}),`最後の柱の高さは${placement.result.join('・')}。空間を埋めずに、一番上の高さを比べよう。`,'compare');
 }else if(p.id==='nets'){
  const normals=foldNet(d.cells);if(!normals)throw Error('Teaching requires a valid cube net');
  const task=d.moves?'roll':d.pose?'side':'opposite';
  const scene=(extra:Record<string,unknown>={})=>({type:'net-state',cells:d.cells,labels:d.labels,normals,task,target:d.target,...extra});
  add(scene({visibleFaces:[0]}),'展開図の番号を確かめよう。隣の面を折ると、面が向く方向が変わるよ。','observe');
  // Visit neighboring net faces, keeping foldNet's world normals as the source of truth.
  const queue=[0],seen=new Set([0]);
  for(let index=0;index<queue.length;index++){const from=queue[index];d.cells.forEach(([x,y]:number[],to:number)=>{if(seen.has(to)||Math.abs(x-d.cells[from][0])+Math.abs(y-d.cells[from][1])!==1)return;seen.add(to);queue.push(to);add(scene({from,to,visibleFaces:[...seen]}),`面${d.labels[from]}の隣の面${d.labels[to]}を折る。番号を保ったまま、立方体の別の面になるよ。`,'transform');});}
  const target=d.labels.indexOf(d.target);
  if(task==='opposite'){
   const index=opposite(normals[target],normals),resolved=d.labels[index];
   add(scene({selected:[target,index],normal:normals[target],oppositeNormal:normals[index],resolved}),`面${d.target}と反対向きの面は${resolved}。立方体をはさんで向かい合い、同じ辺では触れないね。`,'calculate');
   add(scene({selected:[target,index],resolved}),`面${d.target}の反対の面${resolved}を選ぼう。`,'compare');
  }else{
   const top=d.labels.indexOf(d.pose.top),front=d.labels.indexOf(d.pose.front),t=normals[top],f=normals[front],rightNormal=[t[1]*f[2]-t[2]*f[1],t[2]*f[0]-t[0]*f[2],t[0]*f[1]-t[1]*f[0]],right=normals.findIndex(v=>dot(v,rightNormal)===1);
   const faces=[d.labels[top],d.labels[opposite(t,normals)],d.labels[opposite(f,normals)],d.labels[front],d.labels[right],d.labels[opposite(rightNormal,normals)]];
   add(scene({faces,pose:d.pose,selected:[top,front,right]}),`${d.pose.top}を上、${d.pose.front}を前にする。右は${faces[4]}、左は${faces[5]}だよ。`,'calculate');
   if(task==='side'){const resolved=faces[d.side==='right'?4:5];add(scene({faces,pose:d.pose,side:d.side,resolved}),`${d.side==='right'?'右':'左'}の面は${resolved}。上と前の向きを変えずに比べよう。`,'compare');}
   else{const trace=rollTrace(faces,d.moves);trace.states.slice(1).forEach(state=>add(scene({faces:[...state.faces],pose:state.pose,move:state.move,step:state.step}),`${state.step}回目は${headingNames[state.move!] }へころがす。今の上は${state.faces[0]}、前は${state.faces[3]}だよ。`,'transform'));add(scene({faces:[...trace.end],resolved:trace.end[0]}),`最後の上の面は${trace.end[0]}。途中の6つの面の向きを保って追えたね。`,'compare');}
  }
 }else return null;
 return out;
}
