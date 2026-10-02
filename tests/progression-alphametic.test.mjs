import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generateNumber} from '../lib/engine/number.ts';

function clueValues(d,answer){
 const [a,b,c]=String(answer).split('').map(Number);
 switch(d.family){
  case 0:return[a+b,a-b];
  case 1:return[a+b,a+d.k*b];
  case 2:return[(10*a+b)+(10*b+a),a-b];
  case 3:return[(10*a+b)+(10*b+c),a+c];
  case 4:return[(10*a+b)*c,a+c];
  default:throw Error(`Unknown alphametic family ${d.family}`);
 }
}

test('every alphametic family needs both balanced clues and has one joint digit assignment',()=>{
 for(let level=1;level<=20;level++)for(let seed=0;seed<40;seed++){
  const p=generateNumber('alphametic',level,seed),d=p.data,options=p.options.map(v=>clueValues(d,v)),label=`${level}/${seed}`;
  assert.equal(new Set(p.options).size,4,`${label}: four distinct choices`);
  for(let clue=0;clue<2;clue++){
   const values=options.map(v=>v[clue]),distinct=[...new Set(values)];
   assert.equal(distinct.length,2,`${label}: two clue outcomes`);
   assert.ok(distinct.every(v=>values.filter(w=>w===v).length===2),`${label}: balanced clue outcomes`);
   assert.equal(values.filter(v=>v===d.clues[clue]).length,2,`${label}: a clue alone leaves two options`);
  }
  assert.deepEqual(options.flatMap((v,i)=>v.every((x,j)=>x===d.clues[j])?[i]:[]),[p.solution],`${label}: both clues select the stored answer`);
  const valid=[];
  for(let a=1;a<=9;a++)for(let b=1;b<=9;b++)for(let c=d.family>=3?1:0;c<=(d.family>=3?9:0);c++){
   const value=d.family>=3?100*a+10*b+c:10*a+b;
   if(clueValues(d,value).every((x,j)=>x===d.clues[j]))valid.push(value);
  }
  assert.deepEqual(valid,[p.options[p.solution]],`${label}: one full-domain digit assignment`);
 }
});
