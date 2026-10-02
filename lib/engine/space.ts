import{context,range,key,equal,normalize,sceneCubes,sceneShape,sceneRow,sceneGrid,type Puzzle,type Meta}from'./shared.ts';
export const SPACE_META:Meta[]=[
['rollcube','ころがる サイコロ','space','さいごの うえは なに？','展開図のサイコロを矢印の順に1マスずつ転がします。最後の上の面を選びます。'],
['viewbuild','さんぽう つみき','space','3つの けしきに あうのは？','前・右・上から見た3枚の図に、すべて合う積み木を選びます。'],
['pack3d','はこに ぴったり','space','あなに はまる つみきは？','各段の白い穴を埋める一つのピースを選びます。ピースの向きはそのままです。'],
['extract3d','するっと ぬこう','space','やじるしへ ぜんぶ ぬこう','色のピースを選ぶと矢印の方向へ抜きます。他のピースに当たらない順番を考えましょう。'],
['drop3d','すとんと つみき','space','おちると たかさは どうなる？','上のピースを真下に落とします。最初に触れる所で止まるので、下にすき間が残ることもあります。'],
['ropeends','ひもを たどって','space','この ひもの でぐちは？','丸で囲んだ入口から、同じひもを目でたどって出口を選びます。交差しても乗り換えません。'],
['contact3d','ぴたっと となり','space','あかい つみきは なんめん くっつく？','赤い積み木と面で接する積み木を数えます。角や辺だけで触れるものは数えません。'],
['depthorder','てまえは どれ？','space','やじるしから いちばん てまえは？','床の上の立体を、矢印の側から見ます。目に最も近いものを選びます。'],
['voxelcoords','りったい ばんち','space','あかい マスの ばんちは？','横・奥・高さの3つの番号で赤い積み木の場所を答えます。各段の図も見られます。'],
['surfacewalk','サイコロ さんぽ','space','さいごは どの めん？','立方体の表面を歩きます。↑は前へ1マス、↶と↷はその場で90度向きを変えます。辺を越えたら隣の面へ進みます。'],
['balancefoot','たおれない ばしょ','space','おもさの まんなかは どの はんい？','積み木は全部同じ重さ。重さの中心が真上にある床の区画を選びます。番号は点ではなく、それぞれ同じ幅の範囲です。'],
['tunnelpass','トンネル つみき','space','ふたつの あなを とおれる むきは？','前と右にある二つの穴を、向きを変えずに通れる積み木を選びます。穴の余白には触れなくても大丈夫です。'],
['hinge3d','ぱたんと りったい','space','まげると どの かたち？','しるしの関節より先を、指定された軸のまわりに90度回します。線の色と順番を追いましょう。'],
['handedness','みぎてと ひだりて','space','かがみうつしは どれ？','色と番号のついた3本の枝を見ます。回すだけでは重ならない、鏡写しの一つを選びます。'],
['gears','はぐるま リレー','space','さいごは どっちに まわる？','かみ合う歯車は反対向き。ベルトでつながる車は同じ向きです。最初の回転を最後まで伝えます。'],
['gravitytray','ころころ トレイ','space','かたむけると どこに とまる？','矢印の順にトレイを傾けます。玉は壁や先の玉にぶつかるまで転がります。最後の玉の位置を選びます。'],
['viewpoint','どこから パシャリ','space','この しゃしんは どこから？','上から見た塔の配置と写真を比べます。同じ並びが見えるカメラを選びます。'],
['skewer','くしの とおりみち','space','くしは どの じゅんに とおる？','矢印の向きに、指定の列をまっすぐ貫きます。通るしるしを順に選びます。白い穴は飛ばします。'],
];
export function roll(f:number[],d:number){const[t,b,n,s,e,w]=f;return d===0?[s,n,t,b,e,w]:d===1?[w,e,n,s,t,b]:d===2?[n,s,b,t,e,w]:[e,w,n,s,b,t];}
const vec=(a:number[],b:number[])=>a.map((v,i)=>v+b[i]),neg=(a:number[])=>a.map(v=>-v),dot=(a:number[],b:number[])=>a.reduce((s,v,i)=>s+v*b[i],0);
// Face frames: outward normal, screen-right u, screen-down v. Screen coordinates: u×v = −normal.
export const FRAMES=[{n:[0,0,1],u:[1,0,0],v:[0,-1,0]},{n:[0,0,-1],u:[1,0,0],v:[0,1,0]},{n:[0,-1,0],u:[1,0,0],v:[0,0,-1]},{n:[0,1,0],u:[-1,0,0],v:[0,0,-1]},{n:[1,0,0],u:[0,1,0],v:[0,0,-1]},{n:[-1,0,0],u:[0,-1,0],v:[0,0,-1]}];
export function surfaceStep(s:{face:number;x:number;y:number;heading:number},n:number){const dx=[0,1,0,-1][s.heading],dy=[-1,0,1,0][s.heading],x=s.x+dx,y=s.y+dy;if(x>=0&&x<n&&y>=0&&y<n)return{...s,x,y};const f=FRAMES[s.face],motion=f.u.map((v,i)=>v*dx+f.v[i]*dy),face=FRAMES.findIndex(g=>equal(g.n,motion)),g=FRAMES[face],world=f.n.map((v,i)=>v*n+f.u[i]*(2*s.x+1-n)+f.v[i]*(2*s.y+1-n)),newMotion=neg(f.n),heading=dot(newMotion,g.u)===1?1:dot(newMotion,g.u)===-1?3:dot(newMotion,g.v)===1?2:0;return{face,x:Math.max(0,Math.min(n-1,Math.floor((dot(world,g.u)+n)/2))),y:Math.max(0,Math.min(n-1,Math.floor((dot(world,g.v)+n)/2))),heading};}
export function contacts(cells:number[][],p:number[]){return cells.filter(q=>q.reduce((s,v,i)=>s+Math.abs(v-p[i]),0)===1).length;}
export function canExtract(pieces:any[],removed:number[],id:number){const piece=pieces[id];if(!piece||removed.includes(id))return false;const axis=piece.dir.findIndex((v:number)=>v!==0),sign=piece.dir[axis];return !piece.cells.some((a:number[])=>pieces.some((other,j)=>j!==id&&!removed.includes(j)&&other.cells.some((b:number[])=>b.every((v:number,i:number)=>i===axis||(v===a[i]))&&(b[axis]-a[axis])*sign>0)));}
export function rotateAxis(points:number[][],axis:number,q=1,pivot=[0,0,0]){return points.map(point=>{let p=point.map((v,i)=>v-pivot[i]);for(let k=0;k<(q+4)%4;k++)p=axis===0?[p[0],-p[2],p[1]]:axis===1?[p[2],p[1],-p[0]]:[-p[1],p[0],p[2]];return p.map((v,i)=>v+pivot[i]);});}
export function cubeRotations(cells:number[][]){const out:number[][][]=[];for(let x=0;x<4;x++)for(let y=0;y<4;y++)for(let z=0;z<4;z++){const a=normalize(rotateAxis(rotateAxis(rotateAxis(cells,0,x),1,y),2,z));if(!out.some(v=>equal(v,a)))out.push(a);}return out;}
export function cubeSignature(cells:number[][]){return cubeRotations(cells).map(key).sort()[0];}
export function polycube(c:ReturnType<typeof context>,count:number){const cells=[[0,0,0]];while(cells.length<count){const a=c.pick(cells),axis=c.int(0,2),b=[...a];b[axis]+=c.pick([-1,1]);if(!cells.some(v=>equal(v,b)))cells.push(b);}return normalize(cells);}
const projections=(cells:number[][])=>[normalize([...new Map(cells.map(([x,,z])=>[key([x,z]),[x,z]])).values()]),normalize([...new Map(cells.map(([,y,z])=>[key([y,z]),[y,z]])).values()]),normalize([...new Map(cells.map(([x,y])=>[key([x,y]),[x,y]])).values()])];
export function tilt(balls:number[],n:number,walls:number[],dir:number){const delta=[-n,1,n,-1][dir],a=[...balls].sort((a,b)=>dir===0?a-b:dir===2?b-a:dir===1?b%n-a%n:a%n-b%n),settled:number[]=[];for(let at of a){for(let k=0;k<n;k++){const next=at+delta;if(next<0||next>=n*n||[1,3].includes(dir)&&Math.floor(next/n)!==Math.floor(at/n)||walls.includes(next)||settled.includes(next))break;at=next;}settled.push(at);}return settled.sort((a,b)=>a-b);}
function generateSpaceLegacy(id:string,level:number,seed:number):Puzzle|undefined{
 if(!SPACE_META.some(m=>m[0]===id))return;const c=context(id,level,seed),{L,int,pick,shuffle,base,choice,numeric,pile}=c;
 if(id==='rollcube'){const faces=shuffle(range(6).map(i=>i+1)),moves=range(1+Math.floor(L/2)).map(()=>int(0,3)),end=moves.reduce(roll,faces);return choice(end[0],shuffle(faces.filter(v=>v!==end[0])),{type:'rollcube',faces,moves},'ひとつ ころがすと、よこの めんが うえに くるよ。',{faces,moves,end});}
 if(id==='viewbuild'){
  const n=L<6?2:3,h=2+Math.floor(L/5),toCells=(heights:number[])=>heights.flatMap((v,i)=>range(v).map(z=>[i%n,Math.floor(i/n),z]));
  for(let attempt=0;attempt<300;attempt++){
   const heights=range(n*n).map(()=>int(0,h)),cells=toCells(heights);if(!cells.length)continue;const views=projections(cells),wrong:any[]=[],byView:any[][]=[[],[],[]];
   for(let at=0;at<n*n;at++)for(let height=0;height<=h+1;height++)if(height!==heights[at]){const next=[...heights];next[at]=height;const a=toCells(next);if(!a.length)continue;const p=projections(a),diff=range(3).filter(i=>!equal(p[i],views[i]));if(diff.length===1)byView[diff[0]].push(sceneCubes(a));}
   if(L>=6&&byView.some(a=>!a.length))continue;for(const group of byView)if(group.length)wrong.push(pick(group));if(wrong.length<2)continue;
   return choice(sceneCubes(cells),wrong,{type:'views',views},'ひとつの ずだけでなく、3つとも あうか たしかめよう。',{cells,views});
  }throw Error('three view comparisons');
 }
 if(id==='pack3d'){const n=L<10?2:3,h=L<15?2:3,all=range(n*n*h).map(i=>[i%n,Math.floor(i/n)%n,Math.floor(i/(n*n))]),hole=[pick(all)];for(let k=0;k<2+Math.floor(L/4);k++){const around=shuffle(all.filter(v=>!hole.some(a=>equal(a,v))&&hole.some(a=>a.reduce((s,x,i)=>s+Math.abs(x-v[i]),0)===1)));if(around.length)hole.push(around[0]);}const answer=normalize(hole),wrong:any[]=[];for(let k=0;k<40&&wrong.length<3;k++){const region=[pick(all)];while(region.length<hole.length){const next=shuffle(all.filter(v=>!region.some(a=>equal(a,v))&&region.some(a=>a.reduce((s,x,i)=>s+Math.abs(x-v[i]),0)===1)));region.push(next[0]);}const a=normalize(region);if(!equal(a,answer)&&!wrong.some(v=>equal(v.cells,a)))wrong.push(sceneCubes(a));}return choice(sceneCubes(answer),wrong,{type:'layers',n,h,values:all.map(v=>hole.some(a=>equal(a,v))?0:1),holes:true},'だんごとの しろい あなを、したから つなげよう。',{hole,n,h});}
 if(id==='extract3d'){
  const n=L<7?3:4,count=3+Math.floor(L/5),required=L<7?1:Math.floor(count/2);let pieces:any[]=[];
  for(let attempt=0;attempt<2000;attempt++){
   pieces=[];for(let k=0;k<300&&pieces.length<count;k++){const axis=int(0,2),dir=range(3).map(i=>i===axis?pick([-1,1]):0),start=range(3).map(()=>int(0,n-1)),cells=[start];if(L>6){const second=[...start];second[(axis+1)%3]+=pick([-1,1]);if(second[(axis+1)%3]>=0&&second[(axis+1)%3]<n)cells.push(second);}if(cells.some(a=>pieces.some(p=>p.cells.some((b:number[])=>equal(a,b)))))continue;const piece={cells,dir};if(canExtract([...pieces,piece],[],pieces.length))pieces.push(piece);}
   if(pieces.length===count&&pieces.filter((_,i)=>!canExtract(pieces,[],i)).length>=required)break;
  }if(pieces.length!==count||pieces.filter((_,i)=>!canExtract(pieces,[],i)).length<required)throw Error('extraction dependencies');
  const order=shuffle(range(count)),mixed=order.map(i=>pieces[i]);return base('extract',{pieces:mixed,initial:[],scene:{type:'pieces3d',pieces:mixed}},range(count).reverse().map(i=>order.indexOf(i)),'やじるしの さきに べつの ピースは ある？ぬける ピースから ためそう。');
 }
 if(id==='drop3d'){
  const n=L<8?2:3,heights=range(n*n).map(()=>int(0,1+Math.floor(L/5))),foot=[int(0,n*n-1)];while(foot.length<Math.min(n*n,2+Math.floor(L/5))){const next=pick(range(n*n).filter(i=>!foot.includes(i)&&foot.some(j=>Math.abs(i%n-j%n)+Math.abs(Math.floor(i/n)-Math.floor(j/n))===1)));foot.push(next);}
  const unique=foot.map(i=>[i%n,Math.floor(i/n)]),piece=unique.flatMap(([x,y])=>range(int(1,2+Math.floor(L/10))).map(z=>[x,y,z])),offset=Math.max(...foot.map(i=>heights[i])),result=[...heights];piece.forEach(([x,y,z])=>result[y*n+x]=Math.max(result[y*n+x],offset+z+1));
  const wrong:any[]=[];for(let t=0;wrong.length<3&&t<100;t++){const a=[...result];for(const at of shuffle(foot).slice(0,int(1,foot.length)))a[at]=Math.max(heights[at]+1,a[at]+pick([-2,-1,1,2]));if(!equal(a,result)&&!wrong.some(o=>equal(o.values,a)))wrong.push({type:'heightmap',n,values:a});}
  return choice({type:'heightmap',n,values:result},wrong,{type:'drop3d',n,heights,piece},'いちばん さきに ぶつかる はしらが、ピースを ささえるよ。',{n,heights,piece,offset,result});
 }
 if(id==='ropeends'){const n=L<8?3:L<15?4:5,swaps=range(2+Math.floor(L/2)).map(()=>int(0,n-2)),start=int(0,n-1);let end=start;swaps.forEach(i=>{if(end===i)end++;else if(end===i+1)end--;});return choice(end+1,range(n).filter(i=>i!==end).map(i=>i+1),{type:'braid',n,swaps,start},'こうさする ところでも、おなじ ひもを たどるよ。',{n,swaps,start});}
 if(id==='contact3d'||id==='voxelcoords'){const n=L<9?2:3,h=L<7?2:L<15?3:4,cells=pile(n,h),target=pick(cells),values=range(n*n*h).map(i=>{const v=[i%n,Math.floor(i/n)%n,Math.floor(i/(n*n))];return equal(v,target)?2:cells.some(a=>equal(a,v))?1:0;}),scene={type:'layers',n,h,values,target,coordinates:id==='voxelcoords'};if(id==='contact3d')return choice(contacts(cells,target),shuffle(range(7).filter(v=>v!==contacts(cells,target))).slice(0,3),scene,'あかい マスの ひだり・みぎ・まえ・うしろ・うえ・したを しらべよう。',{cells,target});const a=target.map(v=>v+1).join('・'),wrong=shuffle(range(n*n*h).map(i=>[i%n+1,Math.floor(i/n)%n+1,Math.floor(i/(n*n))+1].join('・')).filter(v=>v!==a)).slice(0,3);return choice(a,wrong,scene,'ばんちは「よこ・おく・たかさ」の じゅんだよ。',{cells,target});}
 if(id==='depthorder'){const n=L<8?3:4,perm=shuffle(range(n)),positions=shuffle(range(n).map(i=>[i,perm[i]])),dir=int(0,3),depth=positions.map(([x,y])=>[y,n-1-x,n-1-y,x][dir]),answer=depth.indexOf(Math.min(...depth));return choice(String.fromCharCode(65+answer),range(n).filter(i=>i!==answer).map(i=>String.fromCharCode(65+i)),{type:'spatialmap',n,positions,dir},'やじるしの へんから、いちばん ちかい れつを みよう。',{positions,dir});}
 if(id==='surfacewalk'){const n=L<8?2:3,start={face:0,x:int(0,n-1),y:int(0,n-1),heading:int(0,3)},commands=range(2+Math.floor(L*.8)).map((_,i)=>i%3===2?pick(['L','R']):'F');let end={...start};for(const cmd of commands)end=cmd==='F'?surfaceStep(end,n):{...end,heading:(end.heading+(cmd==='R'?1:3))%4};return choice(end.face+1,shuffle(range(6).filter(i=>i!==end.face)).map(i=>i+1),{type:'surfacewalk',n,start,commands,frames:FRAMES},'へんを こえたら むきも いっしょに まがるよ。',{n,start,commands,end});}
 if(id==='balancefoot'){
  const w=4,h=3+Math.floor(L/2);let heights:number[]=[],sum=0;do{heights=range(w).map(()=>int(0,h));if(!heights.some(Boolean))continue;sum=heights.reduce((s,v,i)=>s+v*(i+.5),0)/heights.reduce((a,b)=>a+b,0);}while(!heights.some(Boolean)||Number.isInteger(sum));const cells=heights.flatMap((v,x)=>range(v).map(z=>[x,0,z])),answer=Math.floor(sum)+1;
  return choice(answer,range(w).map(i=>i+1).filter(v=>v!==answer),{type:'balancefoot',cells,heights},'つみきは ひとつに つながっているよ。おもさの まんなかを さがそう。',{heights,center:sum});
 }
 if(id==='tunnelpass'){
  for(let attempt=0;attempt<200;attempt++){
   const original=polycube(c,4+Math.floor(L/3)),poses=cubeRotations(original),answer=pick(poses),views=projections(answer).slice(0,2),wrong=shuffle(poses.filter(a=>projections(a).slice(0,2).some((projection,i)=>projection.some(cell=>!views[i].some(v=>equal(v,cell)))))).slice(0,3).map(cells=>sceneCubes(cells));
   if(wrong.length>=3)return choice(sceneCubes(answer),wrong,{type:'views',views,holes:true},'まえだけでなく、みぎの あなも たしかめよう。',{views});
  }throw Error('tunnel orientations');
 }
 if(id==='hinge3d'){
  const count=3+Math.floor(L/7);let points=[[0,0,0]];for(let i=0;i<count;i++)points.push(vec(points[i],i%2?[0,2,0]:[2,0,0]));
  if(L>=3&&L<=4)points=rotateAxis(points,2,int(0,3));
  const apply=(a:number[][],t:any)=>[...a.slice(0,t.pivot+1),...rotateAxis(a.slice(t.pivot+1),t.axis,t.q,a[t.pivot])];
  const valid=(a:number[][])=>new Set(a.map(key)).size===a.length&&a.every((v,i)=>i===0||a.every((w,j)=>j===0||Math.abs(i-j)<=1||!range(3).every(k=>Math.max(a[i-1][k],v[k])>=Math.min(a[j-1][k],w[k])&&Math.max(a[j-1][k],w[k])>=Math.min(a[i-1][k],v[k]))));
  let answer=points.map(p=>[...p]);const turns:any[]=[];
  for(let step=0;step<1+Math.floor(L/8);step++){const options=shuffle(range((count-1)*6).map(i=>({pivot:1+Math.floor(i/6),axis:Math.floor(i%6/2),q:i%2?3:1}))).filter(t=>{const a=apply(answer,t);return !equal(a,answer)&&valid(a);});const t=pick(options);turns.push(t);answer=apply(answer,t);}
  const wrong:any[]=[];for(let tries=0;tries<200&&wrong.length<3;tries++){let a=points.map(p=>[...p]);for(let step=0;step<turns.length;step++){const t={...turns[step],pivot:int(1,count-1),axis:int(0,2),q:pick([1,3])};a=apply(a,t);}if(valid(a)&&!equal(a,answer)&&!wrong.some(v=>equal(v.points,a)))wrong.push({type:'wire3d',points:a});}
  return choice({type:'wire3d',points:answer},wrong,{type:'hinge',points,turns},'かんせつより あとの てんが、まとめて まわるよ。',{points,turns});
 }
 if(id==='handedness'){
  const extent=1+Math.floor(L/4),basePoints=[[0,0,0],[int(1,extent),0,0],[0,int(1,extent),0],[0,0,int(1,extent)]],rot=(p:number[][])=>L<6?rotateAxis(p,2,int(0,1)):rotateAxis(rotateAxis(rotateAxis(p,0,int(0,3)),1,int(0,3)),2,L<14?0:int(0,3)),points=L<10?basePoints:rot(basePoints),mirror=rot(points.map(([x,y,z])=>[-x,y,z]));
  return choice({type:'branches',points:mirror},range(3).map(()=>({type:'branches',points:rot(points)})),{type:'branches',points},'3つの いろの まわる じゅんばんを くらべよう。',{points});
 }
 if(id==='gears'){const count=3+Math.floor(L/3),links=range(count-1).map(()=>L<7?'gear':pick(['gear','belt'])),start=int(0,1),end=links.reduce((s,t)=>t==='gear'?1-s:s,start);return choice(end?'↻':'↺',[end?'↺':'↻'],{type:'gears',count,links,start},'はぐるまなら はんたい、ベルトなら おなじだよ。',{links,start});}
 if(id==='gravitytray'){
  for(let attempt=0;attempt<100;attempt++){
   const n=L<7?4:5,walls=shuffle(range(n*n)).slice(0,Math.max(1,Math.floor(L/3))),balls=shuffle(range(n*n).filter(i=>!walls.includes(i))).slice(0,L<5?1:L<13?2:3).sort((a,b)=>a-b),moves:number[]=[];let end=balls;
   for(let k=0;k<1+Math.floor(L/4);k++){const dirs=range(4).filter(d=>!equal(tilt(end,n,walls,d),end));if(!dirs.length)break;const d=pick(dirs);moves.push(d);end=tilt(end,n,walls,d);}
   if(moves.length<1+Math.floor(L/4))continue;const scene=(a:number[])=>sceneGrid(n,range(n*n).map(i=>a.includes(i)?'●':''),{blocked:walls}),wrong:any[]=[];
   for(let k=0;k<120&&wrong.length<3;k++){const start=shuffle(range(n*n).filter(i=>!walls.includes(i))).slice(0,balls.length),a=tilt(start,n,walls,moves.at(-1)!);if(!equal(a,end)&&!wrong.some(v=>equal(v.values,scene(a).values)))wrong.push(scene(a));}
   if(wrong.length>=2)return choice(scene(end),wrong,{type:'tilt',n,walls,balls,moves},'うごく さきの たまから じゅんに とめよう。',{n,walls,balls,moves});
  }throw Error('gravity choices');
 }
 if(id==='viewpoint'){const n=L<8?3:4;let ys=shuffle(range(n));if(equal(ys,range(n))||equal(ys,range(n).reverse()))ys=n===3?[1,0,2]:[1,3,0,2];const positions=shuffle(range(n).map(i=>[i,ys[i]])),heights=shuffle(range(n).map(i=>i+1)),dir=int(0,3),order=range(n).sort((a,b)=>dir===0?positions[b][0]-positions[a][0]:dir===1?positions[b][1]-positions[a][1]:dir===2?positions[a][0]-positions[b][0]:positions[a][1]-positions[b][1]);return choice(['A','B','C','D'][dir],['A','B','C','D'].filter((_,i)=>i!==dir),{type:'viewpoint',n,positions,heights,photo:order.map(i=>({label:String.fromCharCode(65+i),height:heights[i]}))},'しゃしんの ひだりと みぎの とうを、うえの ずで さがそう。',{dir,positions,heights,order});}
 if(id==='skewer'){const n=L<7?2:3,h=L<13?2:3,axis=int(0,2),fixed=[int(0,n-1),int(0,n-1),int(0,h-1)],sign=pick([-1,1]),values=range(n*n*h).map(()=>int(1,4)),length=[n,n,h][axis],path=range(length).map(k=>{const p=[...fixed];p[axis]=sign===1?k:length-1-k;return p;}),answer=path.map(([x,y,z])=>values[z*n*n+y*n+x]).join(' '),wrong=shuffle(range(4**length).map(code=>range(length).map(i=>Math.floor(code/4**i)%4+1).join(' ')).filter(v=>v!==answer)).slice(0,3);return choice(answer,wrong,{type:'layers',n,h,values:values.map(String),ray:{axis,fixed,sign},path},'やじるしから おくへ。おなじ れつを まっすぐ たどろう。',{n,h,axis,fixed,sign,values,path});}
}
export function checkSpace(p:Puzzle,a:any){if(a===null||a===undefined)return false;if(p.kind==='visual-choice')return Number.isInteger(a)&&a===p.solution;if(p.kind==='extract'){if(!Array.isArray(a)||a.length!==p.data.pieces.length||new Set(a).size!==a.length)return false;return a.every((id,i)=>Number.isInteger(id)&&canExtract(p.data.pieces,a.slice(0,i),id));}return false;}
// This stage progression repair keeps the public generateSpace(id, level, seed) API.
// Existing free/timed levels remain 1..20. Candidate acceptance is deterministic.
const columnHeight=(cells:number[][],x:number,y:number)=>Math.max(0,...cells.filter(p=>p[0]===x&&p[1]===y).map(p=>p[2]+1));
const hasCell=(cells:number[][],p:number[])=>cells.some(v=>equal(v,p));
const uniqueCount=(a:any[])=>new Set(a.map(key)).size;
const connected3d=(cells:number[][])=>{const seen=new Set([key(cells[0])]),queue=[cells[0]];for(let i=0;i<queue.length;i++)for(const p of cells)if(!seen.has(key(p))&&p.reduce((s,v,j)=>s+Math.abs(v-queue[i][j]),0)===1){seen.add(key(p));queue.push(p);}return seen.size===cells.length;};
const worldStats=(cells:number[][])=>{const dims=range(3).map(i=>Math.max(...cells.map(p=>p[i]))-Math.min(...cells.map(p=>p[i]))+1),columns=[...new Set(cells.map(([x,y])=>key([x,y])))].map(v=>JSON.parse(v));return{dims,axes:dims.filter(v=>v>1).length,heights:columns.map(([x,y])=>columnHeight(cells,x,y)),footprint:columns.length};};
function dependencyDepth(pieces:any[]){const deps=pieces.map((_,i)=>range(pieces.length).filter(j=>j!==i&&!canExtract(pieces,range(pieces.length).filter(k=>k!==i&&k!==j),i)));const memo=new Map<number,number>();const depth=(i:number):number=>{if(memo.has(i))return memo.get(i)!;const v=1+Math.max(0,...deps[i].map(depth));memo.set(i,v);return v;};return Math.max(...pieces.map((_,i)=>depth(i)));}
function stageInstruction(p:Puzzle,prompt:string,objective:string,help?:string){p.data.prompt=prompt;p.data.objective=objective;if(help)p.data.help=help;return p;}
function trackSurface(d:any){let state={...d.start},crossings=0;const faces=new Set([state.face]),states=new Set([key(state)]);for(const cmd of d.commands){const next=cmd==='F'?surfaceStep(state,d.n):{...state,heading:(state.heading+(cmd==='R'?1:3))%4};crossings+=+(next.face!==state.face);state=next;faces.add(state.face);states.add(key(state));}return{state,crossings,faces:faces.size,states:states.size};}
function targetRopeCrossings(d:any){let at=d.start,hits=0;for(const v of d.swaps){if(at===v){at++;hits++;}else if(at===v+1){at--;hits++;}}return{hits,end:at};}
export function generateSpace(id:string,level:number,seed:number):Puzzle|undefined{
 if(!SPACE_META.some(m=>m[0]===id))return;const c=context(id,level,seed),{L,int,pick,shuffle,choice,base}=c,phase=Math.floor((L-1)/4);
 const accept=(test:(p:Puzzle)=>boolean,limit=500)=>{let p:Puzzle|undefined;for(let attempt=0;attempt<limit;attempt++){p=generateSpaceLegacy(id,L,seed+attempt*104729)!;if(test(p))return p;}throw Error(`${id}: no semantic candidate at level ${L}`);};
 if(id==='rollcube'){
  const faces=shuffle(range(6).map(i=>i+1)),length=1+Math.floor(L/2);let moves:number[]=[],end:number[]=[];
  for(let tries=0;tries<300;tries++){moves=[];for(let i=0;i<length;i++)moves.push(pick(range(4).filter(v=>!moves.length||v!==(moves.at(-1)!+2)%4)));end=moves.reduce(roll,faces);const switches=moves.slice(1).filter((v,i)=>v%2!==moves[i]%2).length;if(switches>=Math.min(phase,Math.max(0,length-1))&&!equal(end,faces))break;}
  return stageInstruction(choice(end[0],faces.filter(v=>v!==end[0]),{type:'rollcube',faces,moves},'よこに まがると、べつの めんの うごきも たどろう。',{faces,moves,end}),'さいごの うえは なに？',phase<1?'ひとつずつ めんを うつす':phase<3?'まがりかどで むきを たもつ':'たてと よこの かいてんを つなぐ');
 }
 if(id==='viewbuild'){
  const p=accept(p=>{const s=worldStats(p.data.cells),occupied=s.footprint,total=(L<6?2:3)**2;return s.dims[2]>=2&&uniqueCount(s.heights)>=2&&(phase<2||occupied<total)&&(phase<3||s.dims[2]>=3);});
  return stageInstruction(p,'3つの けしきに あうのは？',phase<1?'たかさと かさなりを くらべる':phase<3?'3つの ずの ちがいを つなぐ':'あなと かくれた だんを たしかめる');
 }
 if(id==='pack3d'){
  const n=phase<2?2:3,h=phase<3?2:3,count=phase===0?3:phase===1?4:phase===2?5:phase===3?6:7;let hole:number[][]=[];
  const all=range(n*n*h).map(i=>[i%n,Math.floor(i/n)%n,Math.floor(i/(n*n))]);
  for(let tries=0;tries<1000;tries++){hole=[pick(all)];while(hole.length<count){const around=all.filter(v=>!hasCell(hole,v)&&hole.some(a=>a.reduce((s,x,i)=>s+Math.abs(x-v[i]),0)===1));hole.push(pick(around));}const s=worldStats(hole);if((phase===0||s.dims[2]>=2)&&(phase<2||s.axes===3)&&(phase<3||s.dims[2]===3))break;}
  const answer=normalize(hole),wrong:any[]=[];for(let tries=0;tries<600&&wrong.length<3;tries++){const cells=answer.map(v=>[...v]),at=int(0,cells.length-1);cells.splice(at,1);const next=shuffle(all.filter(v=>!hasCell(cells,v)&&cells.some(a=>a.reduce((s,x,i)=>s+Math.abs(x-v[i]),0)===1)));if(!next.length)continue;cells.push(next[0]);const a=normalize(cells);if(!connected3d(a)||equal(a,answer)||wrong.some(v=>equal(v.cells,a)))continue;wrong.push(sceneCubes(a));}
  return stageInstruction(choice(sceneCubes(answer),wrong,{type:'layers',n,h,values:all.map(v=>hasCell(hole,v)?0:1),holes:true},'だんと だんの あなを、まっすぐ つなげよう。',{hole,n,h}),'この むきのまま あなに はまるのは？',phase<1?'あなの かたちを つなぐ':phase<3?'2だんの つながりを たどる':'3だんの まがりを たどる');
 }
 if(id==='extract3d'){
  const count=3+phase,chain=Math.min(count,2+phase+((L-1)%4>=2?1:0)),pieces:any[]=[];let at=[0,0,0];
  const axes=phase===0?[0]:shuffle(range(3));for(let i=0;i<chain;i++){const axis=axes[i%axes.length],dir=range(3).map(j=>j===axis?1:0);pieces.push({cells:[[...at]],dir});const gap=phase===0?int(1,2):1;at=at.map((v,j)=>v+dir[j]*gap);}
  while(pieces.length<count){const k=pieces.length-chain;pieces.push({cells:[[k,int(3,5),int(0,1)]],dir:[0,0,1]});}
  if(phase>=2){for(let i=0;i<chain-1;i++){const piece=pieces[i],axis=piece.dir.findIndex(Boolean),extra=[...piece.cells[0]];extra[(axis+1)%3]--;if(!pieces.some(p=>hasCell(p.cells,extra))){piece.cells.push(extra);if(!canExtract(pieces,range(pieces.length-1),pieces.length-1))piece.cells.pop();}}}
  const rotation=range(3).map(()=>int(0,3)),all=pieces.flatMap(p=>p.cells),mins=range(3).map(i=>Math.min(...all.map(v=>v[i])));for(const piece of pieces){piece.cells=piece.cells.map((p:number[])=>p.map((v,i)=>v-mins[i]));for(let axis=0;axis<3;axis++){piece.cells=rotateAxis(piece.cells,axis,rotation[axis]);piece.dir=rotateAxis([piece.dir],axis,rotation[axis])[0];}}
  const rotated=pieces.flatMap(p=>p.cells),offset=range(3).map(i=>Math.min(...rotated.map(v=>v[i])));pieces.forEach(p=>p.cells=p.cells.map((v:number[])=>v.map((x,i)=>x-offset[i])));
  const order=shuffle(range(count)),mixed=order.map(i=>pieces[i]),solution:number[]=[];while(solution.length<count){const next=range(count).find(i=>!solution.includes(i)&&canExtract(mixed,solution,i));if(next===undefined)throw Error('constructed extraction cycle');solution.push(next);}
  return stageInstruction(base('extract',{pieces:mixed,initial:[],scene:{type:'pieces3d',pieces:mixed}},solution,'どれを ぬくと、つぎの ピースが うごけるかな？'),'やじるしへ ぜんぶ ぬこう',phase<1?'さきに じゃまな ピースを ぬく':phase<3?'むきが ちがう じゃまを たどる':'つぎに あく みちを さきよみする');
 }
 if(id==='drop3d'){
  const p=accept(p=>{const d=p.data,foot=[...new Set<number>(d.piece.map(([x,y]:number[])=>y*d.n+x))],hs=foot.map(i=>d.heights[i]),ph=foot.map(i=>d.piece.filter(([x,y]:number[])=>y*d.n+x===i).length);return (L===1||new Set(hs).size>=2)&&(phase<2||new Set(ph).size>=2)&&(phase<3||hs.filter(v=>v<d.offset).length>=2);});
  return stageInstruction(p,'おちると たかさは どうなる？',phase<1?'さいしょに あたる はしらを さがす':phase<3?'したの すきまを のこして とめる':'でこぼこの ピースと ささえを あわせる');
 }
 if(id==='ropeends'){
  const n=L<3?3:phase<3?4:5,target=1+Math.floor((L+1)/3),start=int(0,n-1),swaps:number[]=[];let at=start,last=-1;
  for(let k=0;k<target+phase;k++){const active=k<target||k%2===0;let candidates=range(n-1).filter(v=>active?(v===at||v+1===at):(v!==at&&v+1!==at));if(candidates.length>1&&swaps.length>1&&swaps.at(-1)===swaps.at(-2))candidates=candidates.filter(v=>v!==last);if(!candidates.length)candidates=range(n-1);const v=pick(candidates);swaps.push(v);if(v===at)at++;else if(v+1===at)at--;last=v;}
  return stageInstruction(choice(at+1,range(n).filter(i=>i!==at).map(i=>i+1),{type:'braid',n,swaps,start},'じぶんの ひもが こうさする ところを ひとつずつ たどろう。',{n,swaps,start}),'この ひもの でぐちは？',phase<1?'こうさしても おなじ ひもを たどる':phase<3?'となりの ひもに のりかえず たどる':'まわりの こうさに まどわされず たどる');
 }
 if(id==='contact3d'){
  const p=accept(p=>{const{cells,target}=p.data,near=cells.filter((v:number[])=>v.every((x,i)=>Math.abs(x-target[i])<=1)&&!equal(v,target)),vertical=cells.filter((v:number[])=>v[0]===target[0]&&v[1]===target[1]&&Math.abs(v[2]-target[2])===1).length,edge=near.length-contacts(cells,target);return (phase===0||vertical>=1)&&(phase<2||edge>=2)&&(phase<3||target[2]>0)&&(phase<4||near.some((v:number[])=>v[2]!==target[2]&&v.slice(0,2).some((x,i)=>x!==target[i])));});
  return stageInstruction(p,'あかい つみきは なんめん くっつく？',phase<1?'めんで さわる つみきを かぞえる':phase<3?'かどと めんを わける':'うえと したの めんも たしかめる');
 }
 if(id==='depthorder'){
  const n=phase<1?3:phase<3?4:5,perm=shuffle(range(n)),positions=shuffle(range(n).map(i=>[i,perm[i]])),dir=int(0,3),depth=(direction:number)=>positions.map(([x,y])=>[y,n-1-x,n-1-y,x][direction]);let observed=dir,rank=phase===1?int(1,2):1,prompt='やじるしから いちばん てまえは？',answer:any,wrong:any[],steps=1;
  if(phase===1)prompt=`やじるしから ${rank}ばんめに てまえは？`;
  if(phase===2){const clockwise=pick([-1,1]);observed=(dir+clockwise+4)%4;steps=2;prompt=`みる ばしょを ${clockwise===1?'とけいまわり':'はんとけいまわり'}に 90°うごかすと、いちばん てまえは？`;}
  const distances=depth(observed),order=range(n).sort((a,b)=>distances[a]-distances[b]);
  if(phase===3){const targetRank=int(0,n-3),target=order[targetRank];rank=targetRank+2;steps=2;prompt=`${String.fromCharCode(65+target)}より おくで、いちばん てまえは？`;}
  if(phase===4){const side=depth((dir+1)%4),sideOrder=range(n).sort((a,b)=>side[a]-side[b]),sideRank=int(1,n),at=sideOrder[sideRank-1];answer=order.indexOf(at)+1;wrong=range(n).map(i=>i+1).filter(v=>v!==answer);steps=3;prompt=`やじるしから みて ひだりから ${sideRank}ばんめは、てまえから なんばんめ？`;}
  else{answer=String.fromCharCode(65+order[rank-1]);wrong=range(n).map(i=>String.fromCharCode(65+i)).filter(v=>v!==answer);}
  return stageInstruction(choice(answer,wrong,{type:'row',items:[{type:'text',text:prompt},{type:'spatialmap',n,positions,dir}]},'みる むきを きめてから、じゅんばんを たどろう。',{positions,dir,observedDirection:observed,rank,reasoningSteps:steps}),prompt,phase<1?'みる むきから ちかさを くらべる':phase<3?'むきと じゅんばんを あわせる':'よこと おくの じゅんを つなぐ');
 }
 if(id==='voxelcoords'){
  const p=generateSpaceLegacy(id,L,seed)!,d=p.data,n=d.scene.n,h=d.scene.h,target=d.target,start=target.map((v:number)=>v+1),moves:any[]=[];let result=[...target];
  if(phase){const axes=shuffle(range(3)).slice(0,Math.min(phase,3));for(const axis of axes){const limit=[n,n,h][axis],sign=result[axis]===0?1:result[axis]===limit-1?-1:pick([-1,1]);result[axis]+=sign;moves.push({axis,amount:sign});}}
  const shownTarget=phase===4?[...result]:target,answerTarget=phase===4?target:result,displayScene=phase===4?{...d.scene,target:shownTarget,values:d.scene.values.map((v:number,i:number)=>i===shownTarget[2]*n*n+shownTarget[1]*n+shownTarget[0]?2:v===2?1:v)}:d.scene;const correct=answerTarget.map((v:number)=>v+1),answer=correct.join('・'),alternatives=correct.map((v:number,i:number)=>pick(range([n,n,h][i]).map(k=>k+1).filter(k=>k!==v))),axes=shuffle(range(3)),masks=phase<2?[1,2,3]:[3,5,6],wrong=masks.map(mask=>correct.map((v:number,i:number)=>mask&(1<<axes.indexOf(i))?alternatives[i]:v).join('・'));
  const moveText=moves.map(v=>`${['よこ','おく','たかさ'][v.axis]}を ${v.amount>0?'＋1':'−1'}`).join('、');const prompt=phase===4?`${moveText}で ★へ ついた。はじめの ばんちは？`:phase?`${moves.map(v=>`${['よこ','おく','たかさ'][v.axis]}を ${v.amount>0?'＋1':'−1'}`).join('、')}。うごいた あとの ばんちは？`:'あかい マスの ばんちは？';
  return stageInstruction(choice(answer,wrong,{type:'row',items:[{type:'text',text:prompt},displayScene]},'よこ・おく・たかさを、ひとつずつ かえるよ。',{cells:d.cells,target:shownTarget,sceneBase:displayScene,moves,result:answerTarget,reverseTask:phase===4}),prompt,phase<1?'よこ・おく・たかさを よむ':phase<3?'ひとつの じくを うごかす':phase===3?'3つの じくの うごきを つなぐ':'ついた ばしょから ぎゃくに たどる');
 }
 if(id==='surfacewalk'){
  const n=L<8?2:3,start={face:phase<2?0:int(0,5),x:int(0,n-1),y:int(0,n-1),heading:int(0,3)};let commands:string[]=[],end:any;
  for(let tries=0;tries<1200;tries++){commands=[];for(let i=0;i<3+Math.floor(L*.8);i++)commands.push(i===0||i===2+Math.floor(L*.8)?'F':c.r()<.72?'F':pick(['L','R']));const track=trackSurface({n,start,commands});if(track.crossings>=1+Math.floor(phase/2)&&track.faces>=Math.min(4,2+Math.floor(phase/2))){end=track.state;break;}}
  if(!end)throw Error('surface progression');return stageInstruction(choice(end.face+1,range(6).filter(i=>i!==end.face).map(i=>i+1),{type:'surfacewalk',n,start,commands,frames:FRAMES},'へんを こえた あとの むきを たしかめよう。',{n,start,commands,end}),'さいごは どの めん？',phase<1?'へんを こえて となりの めんへ':phase<3?'むきを かえて べつの へんへ':'いくつもの めんで むきを たもつ');
 }
 if(id==='balancefoot'){
  const wanted=int(1,4),max=phase<1?4:phase<3?7:9;let heights:number[]=[],result:number[]=[],center=0,move:any=null,swap:any=null,accepted=false;
  for(let tries=0;tries<6000;tries++){heights=range(4).map(()=>int(0,max));if(!heights.some(Boolean))continue;result=[...heights];move=null;swap=null;if(phase===4){const from=int(0,3),to=pick(range(4).filter(i=>i!==from));if(heights[from]===heights[to])continue;[result[from],result[to]]=[result[to],result[from]];swap={from,to};}else if(phase===3){const from=pick(range(4).filter(i=>result[i]>0)),to=pick(range(4).filter(i=>i!==from));result[from]--;result[to]++;move={from,to};}center=result.reduce((s,v,i)=>s+v*(i+.5),0)/result.reduce((a,b)=>a+b,0);const before=heights.reduce((s,v,i)=>s+v*(i+.5),0)/heights.reduce((a,b)=>a+b,0);if(!Number.isInteger(center)&&Math.floor(center)+1===wanted&&(phase<2||new Set(result).size>=3)&&(phase<3||Math.floor(before)!==Math.floor(center))){accepted=true;break;}}
  if(!accepted)throw Error('balance meaningful center change');const prompt=swap?`${swap.from+1}ばんと ${swap.to+1}ばんの はしらを いれかえると、おもさの まんなかは どの はんい？`:move?`${move.from+1}ばんから ${move.to+1}ばんへ 1こ うつすと、おもさの まんなかは どの はんい？`:'おもさの まんなかは どの はんい？',cells=heights.flatMap((v,x)=>range(v).map(z=>[x,0,z]));
  return stageInstruction(choice(Math.floor(center)+1,range(4).map(i=>i+1).filter(v=>v!==Math.floor(center)+1),{type:'row',items:[{type:'text',text:prompt},{type:'balancefoot',cells,heights}]},'おもさと、まんなかからの きょりを くらべよう。',{heights,resultHeights:result,center,move,swap}),prompt,phase<1?'おもい ほうへ まんなかが よる':phase<3?'おもさと きょりを くらべる':phase===3?'うつす まえと あとの まんなかを くらべる':'はしらを いれかえた あとの まんなかを くらべる','重さの中心が真上にある床の区画を選びます。番号は点ではなく、区切られた範囲を表します。');
 }
 if(id==='tunnelpass'){
  for(let tries=0;tries<1200;tries++){const original=polycube(c,4+Math.floor(L/4)),poses=cubeRotations(original),correct=pick(poses),stats=worldStats(correct);if(phase>=2&&stats.axes<3)continue;const views=projections(correct).slice(0,2);if(phase>=3){const i=pick([0,1]),v=views[i],extra=pick(v).map((n,k)=>n+(k===0?1:0));if(!hasCell(v,extra))v.push(extra);views[i]=normalize(v);}
   const pass=(a:number[][])=>projections(a).slice(0,2).map((v,i)=>v.every(cell=>hasCell(views[i],cell))),groups=[[],[],[]] as number[][][][];
   for(const pose of poses){const[a,b]=pass(pose);if(a&&b)continue;groups[a?0:b?1:2].push(pose);}
   if(phase>0&&(!groups[0].length||!groups[1].length))continue;const wrong:number[][][]=[];if(groups[0].length)wrong.push(pick(groups[0]));if(groups[1].length)wrong.push(pick(groups[1]));for(const a of shuffle(groups.flat()))if(wrong.length<3&&!wrong.some(v=>equal(v,a)))wrong.push(a);if(wrong.length<3)continue;
   return stageInstruction(choice(sceneCubes(correct),wrong.map(sceneCubes),{type:'views',views,holes:true},'かたほうを とおっても、もう かたほうも たしかめよう。',{views}),'この むきのまま ふたつの あなを とおれるのは？',phase<1?'あなと でっぱりを くらべる':phase<3?'ふたつの あなが どちらも ひつよう':'あなの あまりと ひっかかる でっぱりを わける');
  }throw Error('two essential tunnel views');
 }
 if(id==='hinge3d'){
  const p=accept(p=>{const d=p.data;let a=d.points;for(const t of d.turns)a=[...a.slice(0,t.pivot+1),...rotateAxis(a.slice(t.pivot+1),t.axis,t.q,a[t.pivot])];return!equal(a,d.points)&&(phase<1||Math.max(...a.map((v:number[])=>v[2]))!==Math.min(...a.map((v:number[])=>v[2])))&&(phase<2||uniqueCount(d.turns.map((v:any)=>v.axis))>=Math.min(2,d.turns.length))&&(phase<3||uniqueCount(d.turns.map((v:any)=>v.pivot))>=Math.min(2,d.turns.length));});
  return stageInstruction(p,'まげると どの かたち？',phase<1?'かんせつより さきだけを まわす':phase<3?'ちがう じくへ おりまげる':'うごく ぶぶんを つぎの おりめへ つなぐ');
 }
 if(id==='handedness'){
  const lengths=phase===0?shuffle([1,2,3]):phase===1?shuffle([2,2,3]):[2,2,2],basePoints=[[0,0,0],[lengths[0],0,0],[0,lengths[1],0],[0,0,lengths[2]]],rot=(points:number[][])=>rotateAxis(rotateAxis(rotateAxis(points,0,phase<1?0:int(0,3)),1,phase<2?0:int(0,3)),2,int(0,3)),points=L===1?basePoints:rot(basePoints),reflectionAxis=phase===3?int(0,2):0,mirror=points.map(p=>p.map((v,i)=>i===reflectionAxis?-v:v)),match=phase===4&&c.r()<.5,correct=phase===3?mirror:rot(match?points:mirror),wrong:any[]=[];
  for(let tries=0;tries<100&&wrong.length<3;tries++){const pose=rot(phase===3?mirror:match?mirror:points);if(!equal(pose,correct)&&!wrong.some(v=>equal(v.points,pose)))wrong.push({type:'branches',points:pose});}
  const prompt=phase===3?`${['X','Y','Z'][reflectionAxis]}の むきだけ ぎゃくにすると、どの むき？`:match?'まわすだけで かさなるのは どれ？':'かがみうつしは どれ？';return stageInstruction(choice({type:'branches',points:correct},wrong,{type:'branches',points,showAxes:phase===3},'3つの いろの じゅんばんを たもって、まわして くらべよう。',{points,matchTask:match,exactReflection:phase===3,reflectionAxis}),prompt,phase<1?'かがみで いろの じゅんが かわる':phase<3?'まわしても みぎてと ひだりては ちがう':'かがみと かいてんを えらびわける');
 }
 if(id==='gears'){
  const count=3+Math.floor(L/4),types=phase<1?['gear','belt']:phase<3?['gear','belt','crossed']:['gear','belt','crossed'],links=range(count-1).map(()=>pick(types));if(L===1)links.fill('gear');if(L>=3&&!links.includes('belt'))links[0]='belt';if(phase>=1&&!links.some(v=>v!=='belt'))links[1]='gear';if(phase>=2&&!links.includes('crossed'))links[links.length-1]='crossed';
  const start=int(0,1),end=links.reduce((s,t)=>t==='belt'?s:1-s,start);let answer:any=end?'↻':'↺',wrong:any[]=[end?'↺':'↻'],scene:any={type:'gears',count,links,start},prompt='さいごは どっちに まわる？';
  if(phase===3){answer=start?'↻':'↺';wrong=[start?'↺':'↻'];scene={...scene,end,unknown:'start'};prompt='さいごの むきに なる、はじめの むきは？';}
  if(phase===4){const at=int(0,links.length-1),wanted=links[at]==='belt';answer=wanted?'まっすぐ ベルト':'クロス ベルト';wrong=[wanted?'クロス ベルト':'まっすぐ ベルト'];scene={...scene,end,missingLink:at};prompt='？は どちらの ベルト？';}
  return stageInstruction(choice(answer,wrong,scene,'かみあう・クロスは はんたい、まっすぐ ベルトは おなじ。',{links,start,end,unknown:scene.unknown,missingLink:scene.missingLink}),prompt,phase<1?'かみあうと はんたいに まわる':phase<3?'ベルトの つなぎかたを よみわける':'さいごから ぎゃくに つなぎかたを さがす');
 }
 if(id==='gravitytray'){
  const p=accept(p=>{const d=p.data;let end=d.balls,collisions=0;for(const v of d.moves){const separate=end.map((at:number)=>tilt([at],d.n,d.walls,v)[0]);collisions+=separate.length-uniqueCount(separate);end=tilt(end,d.n,d.walls,v);}const needed=d.moves.filter((_:number,skip:number)=>{let a=d.balls;d.moves.forEach((v:number,i:number)=>{if(i!==skip)a=tilt(a,d.n,d.walls,v);});return!equal(a,end);}).length;return needed>=Math.min(d.moves.length,1+Math.floor(phase/2))&&(phase<2||collisions>=1);},1200);
  return stageInstruction(p,'かたむけると どこに とまる？',phase<1?'かべまで ころがして とめる':phase<3?'さきの たまから じゅんに とめる':'まえの うごきで できる じゃまを つかう');
 }
 if(id==='viewpoint'){
  if(phase===0)return stageInstruction(generateSpaceLegacy(id,L,seed)!,'この しゃしんは どこから？','ひだりと みぎの ならびを くらべる');
  const n=phase<2?3:4,count=phase<2?4:phase<4?6:7;
  for(let tries=0;tries<5000;tries++){const positions=shuffle(range(n*n)).slice(0,count).map(i=>[i%n,Math.floor(i/n)]),heights=positions.map(()=>int(1,phase<3?3:4)),profiles=range(4).map(dir=>range(n).map(at=>{const axis=dir%2===0?0:1,index=dir<2?n-1-at:at;return Math.max(0,...positions.map((p,i)=>p[axis]===index?heights[i]:0));}));if(uniqueCount(profiles)!==4)continue;const dir=int(0,3),photo=profiles[dir];const oneCue=range(n).some(i=>profiles.every((p,j)=>j===dir||p[i]!==photo[i]));if(phase>=2&&oneCue)continue;const axis=dir%2===0?0:1,overlap=count-uniqueCount(positions.map(p=>p[axis]));if(phase>=1&&overlap<1)continue;
   return stageInstruction(choice(['A','B','C','D'][dir],['A','B','C','D'].filter((_,i)=>i!==dir),{type:'viewpoint',n,positions,heights,photo:photo.map(height=>({label:'',height})),silhouette:true},'おくの とうは かさなるよ。たかさと ならびを どちらも くらべよう。',{dir,positions,heights,profiles,photo,overlap}),'この かげの しゃしんは どこから？',phase<2?'おくの とうが かさなる':phase<4?'ふたつの たかさを あわせて くらべる':'かくれる とうも ふくめて けしきを つくる','上の図の塔を、A〜Dの方向から見ます。同じ列は重なり、いちばん高い塔の高さだけが影に残ります。');
  }throw Error('viewpoint multiple clues');
 }
 if(id==='skewer'){
  const n=phase<1?2:phase<3?3:phase===3?4:5,h=phase<2?2:phase<4?3:4,axis=phase===0?pick([0,1]):int(0,2),fixed=[int(0,n-1),int(0,n-1),int(0,h-1)],sign=L<3?1:pick([-1,1]),values=range(n*n*h).map(()=>int(1,4)),length=[n,n,h][axis],path=range(length).map(k=>{const p=[...fixed];p[axis]=sign===1?k:length-1-k;return p;}),indices=path.map(([x,y,z])=>z*n*n+y*n+x);
  if(phase>=2){const gaps=shuffle(indices).slice(0,Math.min(phase>=4?2:1,length-2));gaps.forEach(i=>values[i]=0);}const solid=indices.filter(i=>values[i]);if(solid.length>=2){values[solid[0]]=int(1,4);values[solid[solid.length-1]]=pick(range(4).map(i=>i+1).filter(v=>v!==values[solid[0]]));}
  const tokens=indices.map(i=>values[i]).filter(Boolean),answer=tokens.join(' '),wrong:string[]=[tokens.slice().reverse().join(' ')];if(phase>=2)wrong.push(indices.map(i=>values[i]||'○').join(' '));for(let tries=0;tries<100&&uniqueCount(wrong.filter(v=>v!==answer))<3;tries++){const a=[...tokens],at=int(0,a.length-1);a[at]=int(1,4);wrong.push(a.join(' '));}
  return stageInstruction(choice(answer,wrong,{type:'layers',n,h,values:values.map(v=>v?String(v):''),ray:{axis,fixed,sign},...(phase===0?{path}:{})},'やじるしから まっすぐ。しろい あなは とばすよ。',{n,h,axis,fixed,sign,values,path}),'くしは どの じゅんに とおる？',phase<1?'やじるしから じゅんに よむ':phase<3?'ちがう だんへ まっすぐ たどる':'あなを とばして ぎゃくからも たどる');
 }
 return generateSpaceLegacy(id,L,seed);
}
