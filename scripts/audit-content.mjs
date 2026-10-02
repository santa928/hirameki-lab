import {IDS,generate,check,stageSeed} from '../lib/puzzles.ts';
import {GAMES} from '../lib/catalog.ts';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const unordered=new Set(['cubes','cells','shape','blocked','allowed','dots']);
const hidden=new Set(['extended','solution','witness','minimum','path']);
function core(v,k=''){
 if(Array.isArray(v)){const a=v.map(x=>core(x));return unordered.has(k)?a.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))):a;}
 if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().filter(k=>!hidden.has(k)).map(k=>[k,core(v[k],k)]));
 return v;
}
const report=[];let tested=0;
for(const id of IDS){const unique=new Set();let maxMs=0,solutionErrors=0;for(let stage=1;stage<=80;stage++)for(let i=0;i<10;i++){
 const t=performance.now(),p=generate(id,Math.floor((stage-1)/4)+1,stageSeed(id,stage,i));maxMs=Math.max(maxMs,performance.now()-t);if(!check(p,p.solution))solutionErrors++;
 const question={id,data:core(p.data),...(id==='fractions'?{options:[...p.options].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))}:{})};
 unique.add(createHash('sha256').update(JSON.stringify(question)).digest('hex'));tested++;
 }report.push({id,name:GAMES.find(g=>g.id===id).name,slots:800,distinctBoards:unique.size,solutionErrors,maxGenerationMs:Math.round(maxMs*100)/100});}
const out={generatedAt:new Date().toISOString(),definition:'Distinct mechanical question data; seed, level label, solution witnesses and distractor order excluded. Coordinate sets normalized. Includes hidden targets where they determine feedback in guessing games. Fractions use unordered compared fractions. Not an isomorphism proof or a count of human-authored problems.',tested,distinctBoards:report.reduce((a,b)=>a+b.distinctBoards,0),solutionErrors:report.reduce((a,b)=>a+b.solutionErrors,0),games:report};
writeFileSync('docs/content-audit.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({...out,games:report.filter(r=>r.distinctBoards<100)},null,2));
