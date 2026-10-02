import{taskFingerprint}from'../../../lib/stage-selection.ts';
import type {Puzzle} from '../../../lib/puzzles.ts';
import {neighbors,iceMove} from '../../../lib/puzzles.ts';
import {trialStep} from '../../../lib/engine/trial.ts';

type GoalSet=[string,string,string,string,string];
export const TRIAL_GOALS:Record<string,GoalSet>={
 maze:['わかれみちと いきどまりを みつける','まちがう みちを さきに しらべる','いくつかの わかれみちを おぼえる','ながい よりみちを みわける','ゴールから ぎゃくにも たどる'],
 stroke:['いきどまりを さいごに のこす','まわる じゅんを えらぶ','ふたつの まとまりを つなぐ','のこる みちを さきに よむ','おおきな まとまりの とおりかたを くむ'],
 rails:['まっすぐと カーブを つなぐ','まがる ばしょを さがす','べつの みちと くらべる','とおくの つながりを よむ','ながい みちの むきを そろえる'],
 slide:['あきマスで タイルを まわす','そろった れつを のこす','いれかえる じゅんを くむ','ふたつの れつを まとめて そろえる','4かける4で さいごまで くみたてる'],
 lights:['ひとおしで かわる まとまりを みる','ふたつの おしかたを かさねる','おなじ はたらきの おしかたを みぬく','うえから じゅんに そろえる','おおきな ばんめんの のこりを よむ'],
 ice:['どこで とまるか よむ','まがる ための かべを つかう','もどる すべりも つかう','いくつもの とまりばを つなぐ','ゴールに とまる さいごの むきから よむ'],
 sokoban:['はこを おす うらがわへ まわる','ふたつの はこの じゅんを えらぶ','じぶんの とおりみちを のこす','かべと はこの あいだを つかう','3つの はこの うごかす じゅんを くむ'],
 hanoi:['ちいさい リングを よける','ちいさな やまを まとめて うつす','おおきい リングを うごかす じゅんを くむ','ふたつの こやまを つかいわける','こやまの うつしかたを くりかえす'],
 river:['のこせない ペアを みる','もどりの ふねを かんがえる','いくつもの ペアを いっしょに みる','つれて もどる なかまを えらぶ','わたる じゅんと もどる じゅんを くむ'],
 jugs:['そそいだ のこりを つくる','みたす・あける・そそぐを つなぐ','3つの コップを つかいわける','ふたつの はんぱな りょうを つくる','つぎの そそぎの ために みずを のこす'],
 pegs:['とびこす じゅんを えらぶ','さいごの 1こへ つなぐ','べつの まとまりを のこさない','すうて さきの とびこしを よむ','ふくすうの とびかたから つながる みちを えらぶ'],
 frogs:['すすむ・とびこすを つかいわける','あきを あいてに わたす','ふたつの チームの じゅんを まもる','とびこす れんぞくを つくる','ながい れつを つまらせずに いれかえる'],
 pancake:['おおきいものを したへ うつす','そろった まとまりを みつける','まとまりの むきも そろえる','そろえた したの だんを のこす','おおきな タワーを すくない うらがえしで そろえる'],
 traffic:['でぐちを ふさぐ くるまを どける','くるまを どける ための くうかんを つくる','その さきの くるまから うごかす','いちど よけた くるまを もどす','いくつもの くるまの じゅんを くむ'],
 colorsort:['からの ボトルを つかう','したの しるしを とりだす','ふたつの あきばしょを つかいわける','そろえた ボトルを くずさず すすむ','つぎに あける ボトルを さきに えらぶ'],
 trainyard:['つぎの れっしゃを うえに のこす','いれる じゅんと だす じゅんを ぎゃくに する','べつの たいひせんへ いったん よける','あきばしょを のこして おくを とりだす','いくつもの いれかえを さきに くむ'],
 programbot:['むきを かえてから すすむ','かべを よける めいれいを くむ','まとめて すすむ めいれいを つかう','すくない めいれいで まわりこむ','つぎの むきまで ふくめて けいかくする'],
 keydoors:['わきみちの カギを とって もどる','1つめの ドアの さきの カギを とる','カギを とる じゅんを つなぐ','3つの ドアを じゅんに ひらく','とおい わきみちと ドアの じゅんを くむ'],
 twobots:['ふたりが どう うごくか みる','かべで ひとりだけ とめる','ふたりの きょりを かえる','とめる ひとを いれかえる','ふたりの ゴールを いっしょに そろえる'],
 matchsticks:['1ぽんで かわる すうじを みつける','くりあがりも たしかめる','2ぽんの うつしかたを くむ','べつの すうじを いっしょに なおす','3ぽんで 2けたの しきを なおす'],
 bridge:['はやい ひとに あかりを もどす','2つの わたりかたを くらべる','おそい ふたりを まとめるか えらぶ','のこる ひとに あわせて けいかくする','とちゅうで わたりかたを きりかえる'],
 ballweigh:['のせない たまも グループに する','これまでの はかりから こうほを えらぶ','ふたつの けっかを あわせて よむ','かさなる グループの けっかを しぼる','のこりの かいすうで 3つに わける'],
 codebreak:['◎と△を くらべる','ふたつの ヒントを あわせる','おなじ しるしの こすうを かんがえる','3つの ヒントから こうほを しぼる','5つの ばしょと しるしを くみあわせる'],
 flood:['となりへ つながる いろを えらぶ','とおくへ すすむ いろを えらぶ','ふたつの ほうこうを いっしょに ひろげる','あとで とる しまの いろを よむ','おおきな しまを さいしょう てすうで つなぐ'],
};

const sum=(a:number[])=>a.reduce((n,v)=>n+v,0);
function minimumRailRoute(d:any){
 const queue=[{at:d.start,enter:0,seen:0,length:0,turns:0}];
 for(let i=0;i<queue.length;i++){const s=queue[i];if(s.seen&(1<<s.at))continue;const seen=s.seen|(1<<s.at),length=s.length+1,turns=s.turns+d.types[s.at],exits=d.types[s.at]?[(s.enter+1)%4,(s.enter+3)%4]:[(s.enter+2)%4];for(const dir of exits){if(s.at===d.end&&dir===2)return{length,turns};const x=s.at%d.n+[0,1,0,-1][dir],y=Math.floor(s.at/d.n)+[-1,0,1,0][dir];if(x<0||y<0||x>=d.n||y>=d.n||seen&(1<<(y*d.n+x)))continue;queue.push({at:y*d.n+x,enter:(dir+2)%4,seen,length,turns});}}
 throw Error('rail route missing');
}
function trace(p:Puzzle){let state=JSON.parse(JSON.stringify(p.data.initial)),wallStops=0,turns=0,pours=0,macros=0,nonReducingPushes=0;const activeDisks=new Set<number>(),activeCars=new Set<number>(),carDirection=new Map<number,number>();let reversals=0,sidingTransfers=0;for(const action of p.solution){if(p.id==='hanoi')activeDisks.add(state.indexOf(action.from));if(p.id==='programbot'){turns+=action==='L'||action==='R'?1:0;macros+=action==='F2'||action==='F3'?1:0;}if(p.id==='jugs'&&action.type==='pour')pours++;if(p.id==='trainyard'&&Number.isInteger(action.from)&&Number.isInteger(action.to))sidingTransfers++;if(p.id==='traffic'){if(action.car!==0)activeCars.add(action.car);if(carDirection.has(action.car)&&carDirection.get(action.car)!==action.delta)reversals++;carDirection.set(action.car,action.delta);}const next=trialStep(p,state,action);if(next===null)throw Error('invalid trial profile witness');if(p.id==='twobots'&&state.positions.filter((v:number,i:number)=>v!==next.positions[i]).length===1)wallStops++;if(p.id==='sokoban'&&JSON.stringify(state.boxes)!==JSON.stringify(next.boxes)){const lower=(boxes:number[],goals:number[]):number=>!boxes.length?0:Math.min(...goals.map((g,i)=>Math.abs(boxes[0]%p.data.n-g%p.data.n)+Math.abs(Math.floor(boxes[0]/p.data.n)-Math.floor(g/p.data.n))+lower(boxes.slice(1),goals.filter((_,j)=>j!==i))));if(lower(next.boxes,p.data.goals)>=lower(state.boxes,p.data.goals))nonReducingPushes++;}state=next;}return{wallStops,turns,pours,macros,activeDisks:activeDisks.size,activeCars:activeCars.size,reversals,sidingTransfers,nonReducingPushes};}

/** Semantic task difficulty. Scores never include p.level, seed, option order or witness scramble length. */
export function trialMetrics(p:Puzzle):{score:number;features:Record<string,number|string|boolean>}{
 const d=p.data,id=p.id,features:Record<string,number|string|boolean>={};let score=0;
 if(id==='maze'){const route=p.solution as number[],open=new Set<number>(Array.from({length:d.n*d.n},(_,i)=>i).filter(i=>!d.blocked.includes(i))),path=new Set(route),forks=route.filter(i=>neighbors(i,d.n).filter(j=>open.has(j)).length>=3).length,sideExits=sum(route.map(i=>neighbors(i,d.n).filter(j=>open.has(j)&&!path.has(j)).length));Object.assign(features,{minimumMoves:route.length-1,routeForks:forks,wrongBranches:sideExits,board:d.n});score=route.length-1+2*forks+.5*sideExits;}
 else if(id==='stroke'){const set=new Set<number>(d.allowed),seen=new Set<number>();let choices=0;for(const at of p.solution.slice(0,-1)){seen.add(at);if(neighbors(at,d.n).filter(i=>set.has(i)&&!seen.has(i)).length>1)choices++;}const junctions=d.allowed.filter((at:number)=>neighbors(at,d.n).filter(i=>set.has(i)).length>=3).length;Object.assign(features,{requiredNodes:d.allowed.length,decisionPoints:choices,junctions,board:d.n});score=d.allowed.length-1+2*choices+.3*junctions;}
 else if(id==='rails'){const r=minimumRailRoute(d);Object.assign(features,{minimumRouteTiles:r.length,minimumRouteTurns:r.turns,distractorTiles:d.n*d.n-r.length,board:d.n});score=r.length+2*r.turns+.1*(d.n*d.n-r.length);}
 else if(id==='slide'){const n=d.n,lower=sum(d.initial.map((v:number,i:number)=>v?Math.abs(i%n-(v-1)%n)+Math.abs(Math.floor(i/n)-Math.floor((v-1)/n)):0)),wrong=d.initial.filter((v:number,i:number)=>v&&v!==i+1).length;Object.assign(features,{minimumMoves:d.minimum??lower,depthIsExact:typeof d.minimum==='number',manhattanLowerBound:lower,misplacedTiles:wrong,board:n});score=(d.minimum??lower)+.1*wrong;}
 else if(id==='lights'){if(typeof d.minimum!=='number')throw Error('Lights profile needs measured minimum');Object.assign(features,{minimumTaps:d.minimum,board:d.n,solutionNullity:d.nullity??0});score=2*d.minimum+.1*d.n*d.n;}
 else if(id==='ice'){const queue=[d.start],distance=new Map<number,number>([[d.start,0]]);for(let i=0;i<queue.length;i++)for(let dir=0;dir<4;dir++){const to=iceMove(queue[i],dir,d.n,d.blocked);if(!distance.has(to)){distance.set(to,distance.get(queue[i])!+1);queue.push(to);}}const decisions=d.route.slice(0,-1).filter((at:number)=>new Set([0,1,2,3].map(dir=>iceMove(at,dir,d.n,d.blocked)).filter(v=>v!==at)).size>1).length;Object.assign(features,{minimumSlides:distance.get(d.end)!,decisionStops:decisions,stopStates:queue.length,board:d.n});score=distance.get(d.end)!+1.5*decisions+.1*queue.length;}
 else if(id==='ballweigh'){const count=d.initial.candidates.length,evidence=d.initial.observations as any[],remaining=d.budget-evidence.length,tilts=evidence.filter(o=>o.result!==0).length;let overlap=0;for(let i=0;i<evidence.length;i++)for(let j=0;j<i;j++)overlap+=evidence[i].left.filter((v:number)=>evidence[j].right.includes(v)).length+evidence[i].right.filter((v:number)=>evidence[j].left.includes(v)).length;Object.assign(features,{balls:d.n,initialCandidates:count,evidenceCount:evidence.length,tiltedClues:tilts,crossPanOverlap:overlap,remainingWeighings:remaining});score=4*remaining+Math.log2(count)+evidence.length+tilts+.1*overlap;}
 else if(id==='codebreak'){const history=d.initial.history as any[],candidateCount=d.candidateCount??d.alphabet**d.length,feedbackKinds=new Set(history.map(r=>`${r.exact}:${r.near}`)).size;Object.assign(features,{codeLength:d.length,alphabet:d.alphabet,repeats:d.repeats,candidateCount,clueCount:history.length,feedbackKinds,guessesUnlimited:true});score=2*Math.log2(candidateCount)+history.length+.5*feedbackKinds+.5*d.length+(d.repeats?1:0);}
 else{
  const t=trace(p);if(typeof d.n==='number')features.board=d.n;
  switch(id){
   case'sokoban':Object.assign(features,{boxes:d.initial.boxes.length,minimumPushes:d.minimumPushes,assignmentLowerBound:d.assignmentLowerBound??d.minimumPushes,nonReducingPushes:t.nonReducingPushes});score=d.minimumPushes+4*(d.initial.boxes.length-1)+2*t.nonReducingPushes;break;
   case'hanoi':Object.assign(features,{minimumMoves:d.minimum,disks:d.n,activeDisks:t.activeDisks});score=d.minimum+2*t.activeDisks;break;
   case'river':Object.assign(features,{minimumCrossings:d.minimum,people:d.n,capacity:d.capacity,conflicts:d.conflicts.length});score=2*d.minimum+.75*d.conflicts.length+.5*(d.n-d.capacity);break;
   case'jugs':{const partial=d.target.filter((v:number,i:number)=>v>0&&v<d.caps[i]).length;Object.assign(features,{minimumMoves:d.minimum,jugs:d.caps.length,pours:t.pours,partialTargets:partial});score=2*d.minimum+1.5*t.pours+partial;break;}
   case'pegs':Object.assign(features,{minimumJumps:d.initial.length-1,decisionPoints:d.decisionPoints??0});score=d.initial.length-1+2*(d.decisionPoints??0);break;
   case'frogs':{let state=[...d.initial],decisions=0;for(const action of p.solution){const legal=state.map((_:number,i:number)=>trialStep(p,state,i)).filter((v:any)=>v!==null).length;if(legal>1)decisions++;state=trialStep(p,state,action);}Object.assign(features,{minimumMoves:d.minimum,rightFrogs:d.initial.filter((v:number)=>v===1).length,leftFrogs:d.initial.filter((v:number)=>v===-1).length,decisionPoints:decisions});score=d.minimum+decisions+.25*(d.initial.length-1);break;}
   case'pancake':{const a=[...d.initial,d.n+1],breakpoints=a.slice(0,-1).filter((v:number,i:number)=>Math.abs(v-a[i+1])!==1).length;Object.assign(features,{minimumFlips:d.minimum,pancakes:d.n,breakpoints});score=3*d.minimum+.3*breakpoints+.25*d.n;break;}
   case'traffic':Object.assign(features,{minimumUnitMoves:d.minimum,directBlockers:d.blockerCount,nonTargetCarsMoved:t.activeCars,directionReversals:t.reversals,cars:d.cars.length});score=d.minimum+2*t.activeCars+3*t.reversals+d.blockerCount;break;
   case'colorsort':{const mixed=d.initial.filter((b:number[])=>new Set(b).size>1).length,runs=sum(d.initial.map((b:number[])=>b.filter((v,i)=>!i||v!==b[i-1]).length)),empty=d.initial.filter((b:number[])=>!b.length).length;Object.assign(features,{minimumMoves:d.minimum,mixedBottles:mixed,colorRuns:runs,emptyBottles:empty,colors:d.colors,capacity:d.capacity});score=2*d.minimum+2*mixed+.25*(2-empty);break;}
   case'trainyard':{let blocks=0;for(const stack of d.initial.sidings)for(let i=0;i<stack.length;i++)for(let j=i+1;j<stack.length;j++)if(stack[i]<stack[j])blocks++;Object.assign(features,{minimumExtraMoves:d.minimumExtraMoves,sidingTransfers:t.sidingTransfers,blockingPairs:blocks,trains:d.n,capacity:d.capacity});score=4*d.minimumExtraMoves+2*t.sidingTransfers+.5*blocks;break;}
   case'programbot':Object.assign(features,{minimumCommands:d.minimum??p.solution.length,obstacleDetour:d.obstacleDetour??0,turns:t.turns,macroCommands:t.macros,budgetSlack:d.budget-p.solution.length});score=2*(d.minimum??p.solution.length)+2*(d.obstacleDetour??0)+t.turns+.5*t.macros;break;
   case'keydoors':Object.assign(features,{minimumMoves:d.minimum,keys:d.keys.length,dependencyDepth:d.dependencyDepth??1});score=.25*d.minimum+4*d.keys.length+4*(d.dependencyDepth??1);break;
   case'twobots':Object.assign(features,{minimumMoves:d.minimum,wallStops:t.wallStops});score=d.minimum+2*t.wallStops;break;
   case'matchsticks':{const cross=p.solution.filter((a:any)=>Math.floor(a.from/7)!==Math.floor(a.to/7)).length,changed=new Set<number>();for(const a of p.solution){changed.add(Math.floor(a.from/7));changed.add(Math.floor(a.to/7));}Object.assign(features,{minimumMoves:d.minimum,digits:sum(d.groups),crossDigitMoves:cross,changedDigits:changed.size});score=5*d.minimum+.5*sum(d.groups)+cross+.5*changed.size;break;}
   case'bridge':{const margins=Array.from({length:Math.floor((d.n-2)/2)},(_,i)=>d.times[0]+d.times[d.n-2-i*2]-2*d.times[1]),changes=margins.some(v=>v<0)&&margins.some(v=>v>0),closest=margins.length?Math.min(...margins.map(Math.abs)):0;Object.assign(features,{people:d.n,optimalTime:d.minimum,budgetSlack:d.budget-d.minimum,strategyChanges:changes,closestStrategyMargin:closest});score=4*(d.n-2)+(changes?3:0)+2/(1+closest)+(d.budget===d.minimum?1:0);break;}
   case'flood':{const seen=new Set<number>();let components=0;for(let i=0;i<d.k;i++)if(!seen.has(i)){components++;const queue=[i];seen.add(i);for(let j=0;j<queue.length;j++)for(const [a,b]of d.edges){const next=a===queue[j]?b:b===queue[j]?a:-1;if(next>=0&&d.colors[next]===d.colors[i]&&!seen.has(next)){seen.add(next);queue.push(next);}}}Object.assign(features,{minimumMoves:d.minimum,colorComponents:components,palette:d.palette,budgetSlack:d.budget-d.minimum});score=2*d.minimum+.2*components+.5*d.palette-(d.budget-d.minimum);break;}
   default:throw Error(`Unknown trial profile ${id}`);
  }
 }
 if(!Number.isFinite(score))throw Error(`Invalid trial score ${id}`);
 return{score:Math.round(score*1000)/1000,features};
}

/** Preserve interactive initial states and rules; omit witness order and set storage order. */
export function trialQuestionBody(p:Puzzle){
 const d=JSON.parse(JSON.stringify(p.data)),sort=(a:any[])=>a.sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));
 for(const name of ['blocked','walls','allowed','goals','conflicts'])if(Array.isArray(d[name]))d[name]=sort(d[name].map((v:any)=>Array.isArray(v)?sort(v):v));
 if(p.id==='stroke')delete d.path;
 if(p.id==='maze'||p.id==='ice')delete d.route;
 if(p.id==='pegs')d.initial=sort(d.initial);
 if(p.id==='sokoban')d.initial.boxes=sort(d.initial.boxes);
 if(p.id==='ballweigh'&&d.initial.history)d.initial.history=sort(d.initial.history.map((h:any)=>({...h,left:sort(h.left),right:sort(h.right)})));
 return taskFingerprint({...p,data:d});
}
