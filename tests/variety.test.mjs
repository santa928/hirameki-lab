import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generateTrial,checkTrial,trialGoal} from '../lib/engine/trial.ts';
import {hash} from '../lib/puzzles.ts';
for(const [id,min] of [['river',220],['frogs',180],['hanoi',200]])test(`${id}: stages vary the puzzle state while retaining a legal solution`,()=>{
 const unique=new Set();for(let stage=1;stage<=80;stage++)for(let i=0;i<10;i++){
 const p=generateTrial(id,Math.floor((stage-1)/4)+1,hash(`${id}/${stage}/${i}`));assert.ok(checkTrial(p,p.solution),`${stage}/${i}`);assert.equal(trialGoal(p,p.data.initial),false);const {minimum,...data}=p.data;unique.add(JSON.stringify(data));}
 assert.ok(unique.size>=min,`${unique.size} distinct states, require ${min}`);
});
import {generateSpace} from '../lib/engine/space.ts';
import {generateLogic} from '../lib/engine/logic.ts';
test('family trees vary topology and trace the requested ancestors',()=>{const trees=new Set();for(let i=0;i<100;i++){const p=generateLogic('familytree',9+i%4,i),s=p.data.scene;trees.add(JSON.stringify(s.parents));let ancestor=s.target;for(let j=0;j<s.steps;j++)ancestor=s.parents[ancestor];assert.equal(p.options[p.solution],s.labels[ancestor]);}assert.ok(trees.size>20);});
test('tunnel and handedness grow beyond their introductory geometry',()=>{for(const id of ['tunnelpass','handedness']){let changes=0;for(let i=0;i<40;i++)if(JSON.stringify(generateSpace(id,1,i).data.scene)!==JSON.stringify(generateSpace(id,20,i).data.scene))changes++;assert.ok(changes>25,`${id}: ${changes}`);}});
