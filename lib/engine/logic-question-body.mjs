// Semantic fingerprints exclude answers, witnesses, difficulty annotations, clue order,
// option order and purely cosmetic symbol/actor labels. They are intentionally stricter
// than JSON(data), so tiny introductory families report their genuinely finite pool.
const R=n=>Array.from({length:n},(_,i)=>i),J=JSON.stringify;
const permutations=a=>a.length?a.flatMap((v,i)=>permutations(a.filter((_,j)=>i!==j)).map(p=>[v,...p])):[[]];
const permCache=new Map(),perms=n=>{if(!permCache.has(n))permCache.set(n,permutations(R(n)));return permCache.get(n);};
const sorted=a=>a.map(J).sort();
const minimum=a=>a.sort()[0];
function transforms(n){return R(8).map(k=>R(n*n).map(i=>{let x=i%n,y=Math.floor(i/n);if(k&4)x=n-1-x;for(let r=0;r<(k&3);r++)[x,y]=[n-1-y,x];return y*n+x;}));}
const apply=(a,map)=>{const b=[];map.forEach((to,from)=>b[to]=a[from]);return b;};
const gridKey=(n,make)=>minimum(transforms(n).map((map,k)=>J(make(map,k))));
function graphGridKey(d){return minimum(R(8).map(k=>{let points=d.nodes.map(([x,y])=>{if(k&4)x=-x;for(let r=0;r<(k&3);r++)[x,y]=[-y,x];return[x,y];});const mx=Math.min(...points.map(p=>p[0])),my=Math.min(...points.map(p=>p[1]));points=points.map(([x,y])=>[x-mx,y-my]);const order=R(points.length).sort((a,b)=>points[a][0]-points[b][0]||points[a][1]-points[b][1]),label=points.map((_,i)=>order.indexOf(i));return J({nodes:order.map(i=>[...points[i],d.degrees[i]]),edges:sorted(d.edges.map(([a,b])=>[label[a],label[b]].sort((a,b)=>a-b)))});}));}
function relabelRules(rules,p){return rules.map(rule=>{const r=Object.fromEntries(Object.keys(rule).sort().map(k=>[k,['a','b','c'].includes(k)?p[rule[k]]:rule[k]]));if(['adjacent','notAdjacent','gap','sum','difference'].includes(r.op)&&r.a>r.b)[r.a,r.b]=[r.b,r.a];if(r.op==='between'&&r.a>r.c)[r.a,r.c]=[r.c,r.a];return r;});}
function symbolKey(cards,rule){const all=[];for(const a of perms(3))for(const b of perms(3))for(const c of perms(3)){const maps={shape:a,color:b,count:c},card=s=>[a[s.shape],b[s.color],c[s.count-1]],transform=r=>!r?null:r.op==='not'?['not',transform(r.child)]:r.op?[r.op,transform(r.left),transform(r.right)]:[r.attr,maps[r.attr][r.value-(r.attr==='count'?1:0)]];all.push(J({cards:sorted(cards.map(card)),...(rule?{rule:transform(rule)}:{})}));}return minimum(all);}
function clues(a,n){const run=line=>{const result=[];let count=0;for(const v of [...line,0])if(v)count++;else if(count){result.push(count);count=0;}return result.length?result:[0];};return{rows:R(n).map(y=>run(a.slice(y*n,(y+1)*n))),cols:R(n).map(x=>run(R(n).map(y=>a[y*n+x])))};}
export function logicQuestionBody(p){
 const d=p.data,id=p.id;let body;
 if(id==='pattern'&&d.scene){const maps={shape:new Map(),color:new Map(),count:new Map()},convert=s=>['shape','color','count'].map(k=>{if(k==='count')return s[k];if(!maps[k].has(s[k]))maps[k].set(s[k],maps[k].size);return maps[k].get(s[k]);}),sequence=d.scene.items.slice(0,-1).map(convert);body={sequence};}
 else if(id==='pattern'){const labels=new Map();body={sequence:d.seq.map(v=>{if(!labels.has(v))labels.set(v,labels.size);return labels.get(v);})};}
 else if(id==='matrix')body={family:d.ruleFamily||'additive-cross',n:d.n,values:d.values};
 else if(id==='sudoku')body=gridKey(d.n,(map,k)=>{const symbols=new Map(),initial=apply(d.initial,map).map(v=>{if(!v)return 0;if(!symbols.has(v))symbols.set(v,symbols.size+1);return symbols.get(v);});return{n:d.n,bw:k%2?d.n/d.bw:d.bw,initial};});
 else if(id==='order'&&d.orderRules)body=minimum(perms(d.values.length).map(v=>J({n:v.length,rules:sorted(relabelRules(d.orderRules,v))})));
 else if(id==='order')body=minimum(perms(d.n).map(v=>J({n:v.length,clues:sorted(d.clues.map(([a,b])=>[v[a],v[b]]))})));
 else if(id==='balance')body=d.equations?{equations:[...d.equations.slice(0,-1)].sort(),target:d.equations.at(-1)}:{aTotal:d.aTotal,ca:d.ca,second:d.second,cb:d.cb,targetShape:d.targetShape};
 else if(id==='odd')body=d.cards?symbolKey(d.cards,d.rule):gridKey(d.n,map=>({n:d.n,position:map[d.odd],variant:d.variant}));
 else if(id==='nonogram')body=gridKey(d.n,map=>({n:d.n,...clues(apply(p.solution,map),d.n),given:apply(d.given,map)}));
 else if(id==='liar')body=minimum(perms(d.people.length).map(v=>J({n:v.length,trueCount:d.trueCount,statements:sorted(d.statements.map(s=>({members:(s.members||[s.person]).map(i=>v[i]).sort((a,b)=>a-b),is:s.is})))})));
 else if(id==='zebra')body=minimum(perms(d.n).map(v=>{const allowed=[];v.forEach((to,from)=>allowed[to]=[...d.allowed[from]].sort((a,b)=>a-b));return J({n:d.n,allowed,relations:sorted(relabelRules(d.relations||[],v))});}));
 else if(id==='venn')body=symbolKey(d.cards,d.rule);
 else if(id==='minestars')body=gridKey(d.n,map=>({n:d.n,cells:apply(d.given.map((v,i)=>v<0?'?':v===1?'star':d.counts[i]),map)}));
 else if(id==='bridges')body=graphGridKey(d);
 else if(id==='loopclues')body=gridKey(d.n,map=>({n:d.n,clues:apply(d.clues,map)}));
 else if(id==='islands')body=gridKey(d.n,map=>({n:d.n,clues:apply(R(d.n*d.n).map(i=>d.clues[i]||0),map),given:apply(d.given,map)}));
 else if(id==='tents')body=gridKey(d.n,map=>{const solved=apply(p.solution,map);return{n:d.n,trees:apply(R(d.n*d.n).map(i=>+d.trees.includes(i)),map),rows:R(d.n).map(y=>solved.slice(y*d.n,(y+1)*d.n).reduce((a,b)=>a+b,0)),cols:R(d.n).map(x=>R(d.n).reduce((s,y)=>s+solved[y*d.n+x],0))};});
 else if(id==='binary')body=minimum([0,1].map(flip=>gridKey(d.n,map=>({n:d.n,given:apply(d.given,map).map(v=>v<0?-1:flip?1-v:v)}))));
 else if(id==='circuit'){const tree=t=>typeof t==='number'?'input':[t.op,...[tree(t.left),tree(t.right)].sort((a,b)=>J(a).localeCompare(J(b)))];body={tree:tree(d.tree),required:d.required};}
 else if(id==='rulemachine'){const keys=[];for(const a of perms(3))for(const b of perms(3)){const card=s=>[a[s.shape],b[s.color],s.count];keys.push(J({examples:d.scene.keys.map(k=>sorted(k.examples.map(pair=>pair.map(card)))),target:card(d.target),reverse:!!d.reverse}));}body=minimum(keys);}
 else if(id==='schedule')body=minimum(perms(d.values.length).map(v=>J({n:v.length,clues:sorted(d.clues.map(([a,b])=>[v[a],v[b]]))})));
 else if(id==='domino'){const values=[...new Set(d.tiles.flat())],start=d.start,end=d.end,other=values.filter(v=>v!==start&&v!==end),keys=[];for(const order of permutations(other)){const labels=new Map([[start,0],...(start===end?[]:[[end,1]]),...order.map((v,i)=>[v,i+(start===end?1:2)])]);keys.push(J({sameEnds:start===end,tiles:sorted(d.tiles.map(t=>t.map(v=>labels.get(v)).sort((a,b)=>a-b)))}));}body=minimum(keys);}
 else if(id==='familytree'){const scene=d.scene,labels=scene.labels,options=new Set(),tree=i=>({target:i===d.target,other:i===d.otherTarget,option:options.has(i),children:d.parents.flatMap((v,j)=>v===i?[tree(j)]:[]).sort((a,b)=>J(a).localeCompare(J(b)))});body={tree:tree(0),relation:d.relation||'ancestor',steps:d.steps};}
 else if(id==='settriple')body=symbolKey(d.cards);
 else if(id==='mintree'){const n=d.nodes.length,keys=[];for(let r=0;r<n;r++)for(const sign of[-1,1])keys.push(J({n,edges:sorted(d.edges.map(([a,b],i)=>[...[(a*sign+r+n)%n,(b*sign+r+n)%n].sort((a,b)=>a-b),d.weights[i]]))}));body=minimum(keys);}
 else if(id==='cipher'){const maps=d.maps||[d.map,...(d.map2?[d.map2]:[])],seen=[...new Set(d.message)],rest=R(d.map.length).filter(v=>!seen.includes(v)),keys=[];for(const order of permutations(rest)){const label=new Map([...seen,...order].map((v,i)=>[v,i])),convertMap=m=>{const a=[];for(let i=0;i<m.length;i++)a[label.get(i)]=label.get(m[i]);return a;};keys.push(J({maps:maps.map(convertMap),message:d.message.map(v=>label.get(v)),reverse:!!d.reverse}));}body=minimum(keys);}
 else return null;
 return {id,body};
}
