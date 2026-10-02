export type StageCandidate={seed:number;score:number;body:string};
export function reserveThemeBodies<T extends StageCandidate>(pools:T[][],perTheme=10):Set<string>[] {
 const slots=pools.flatMap((_,band)=>Array.from({length:perTheme},()=>band)),owner=new Map<string,number>(),assigned:string[]=[],frequency=new Map<string,number>();
 for(const pool of pools)for(const body of new Set(pool.map(p=>p.body)))frequency.set(body,(frequency.get(body)||0)+1);
 const choices=pools.map(pool=>[...new Set(pool.map(p=>p.body))].sort((a,b)=>frequency.get(a)!-frequency.get(b)!||a.localeCompare(b)));
 const place=(slot:number,visited:Set<string>):boolean=>{for(const body of choices[slots[slot]]){if(visited.has(body))continue;visited.add(body);const previous=owner.get(body);if(previous===undefined||place(previous,visited)){owner.set(body,slot);assigned[slot]=body;return true;}}return false;};
 for(let slot=0;slot<slots.length;slot++)if(!place(slot,new Set()))throw Error('Insufficient distinct tasks across learning themes');
 return pools.map((_,band)=>new Set(assigned.filter((_,slot)=>slots[slot]===band)));
}
export function selectStageCandidates<T extends StageCandidate>(pool:T[],count=40):T[][]{
 if(count<10||count%10)throw Error('Stage selection must contain complete missions');
 const unique=[...new Map([...pool].sort((a,b)=>a.seed-b.seed).map(p=>[p.body,p])).values()].sort((a,b)=>a.score-b.score||a.seed-b.seed);
 if(unique.length<count)throw Error(`Only ${unique.length} distinct task bodies for ${count} questions; shorten the course instead of repeating tasks.`);
 const selected=Array.from({length:count},(_,i)=>unique[Math.round(i*(unique.length-1)/(count-1))]);
 return Array.from({length:count/10},(_,i)=>selected.slice(i*10,i*10+10));
}
export function taskFingerprint(p:any):string{
 const hidden=new Set(['extended','difficulty','score','metrics','minimum','minMoves','minPushes','optimalMoves','optimal','witness','solution','scramble','goalDistance','optimalLength','minimumExtra','minimumMoves','solutionCount','strategy','concept','phase','objective','tactic','reasoningSteps','learningGoal','progression','decisionPoints','wallStops','turns','obstacleDetour','dependencyDepth','assignmentLowerBound','displacedBalls','candidateCount','totalPossibilities','initialCandidateCount','lowerBound','nullity','minimumExtraMoves','blockerCount','minimumPushes','help','hint','netPrompt']);
 const data={...p.data};delete data.id;delete data.band;
 if(['rails','maze','ice','stroke'].includes(p.id)){delete data.path;delete data.route;}
 if(p.id==='lights')delete data.moves;
 const clean=(v:any):any=>Array.isArray(v)?v.map(clean):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().filter(k=>!hidden.has(k)&&!k.startsWith('_')).map(k=>[k,clean(v[k])])):v;
 return JSON.stringify({id:p.id,kind:p.kind,data:clean(data)});
}
