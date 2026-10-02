import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GAMES} from '../lib/catalog.ts';
import {generateStage,stageInfo,stageCount,coursePhases,courseIsComplete} from '../lib/stages.ts';
import {check} from '../lib/puzzles.ts';

test('all stages replay their selected questions and carry grounded learning goals',()=>{
 for(const game of GAMES){
  const goals=new Set();
  for(let stage=1;stage<=stageCount(game.id);stage++){
   const info=stageInfo(game.id,stage);goals.add(info.goal);
   const p=generateStage(game.id,stage,0);assert.ok(check(p,p.solution),`${game.id}/${stage}`);
   assert.deepEqual(p,generateStage(game.id,stage,0),'replay must not draw a new task');
   assert.ok(p.level>=(info.theme-1)*4+1&&p.level<=(info.theme-1)*4+4,'question belongs to the displayed learning theme');
  }assert.equal(goals.size,5,game.id);
 }
});
test('cube stage one teaches height and the course increases its spatial demands',()=>{
 const heights=[];
 for(let stage=1;stage<=stageCount('cubes');stage++){
  const questions=Array.from({length:10},(_,i)=>generateStage('cubes',stage,i));
  for(const p of questions)assert.ok(p.data.cubes.some(c=>c[2]>0),`flat stage ${stage}`);
  heights.push(Math.max(...questions.flatMap(p=>p.data.cubes.map(c=>c[2]+1))));
 }
 assert.ok(heights.at(-1)>heights[0]);
 assert.throws(()=>generateStage('cubes',stageCount('cubes')+1,0));assert.throws(()=>generateStage('cubes',1,10));
});
test('course completion uses all current stage IDs and ignores excess legacy IDs',()=>{
 const game=GAMES.find(g=>stageCount(g.id)>0&&stageCount(g.id)<80);assert.ok(game);
 const total=stageCount(game.id),records=Object.fromEntries(Array.from({length:80},(_,i)=>[i+1,3]));
 assert.equal(courseIsComplete(game.id,records),true);
 delete records[Math.ceil(total/2)];assert.equal(courseIsComplete(game.id,records),false);
 assert.equal(courseIsComplete(game.id,{}),false);
});
test('every scheduled mission has ten questions and demand does not reset inside a theme',async()=>{
 for(const category of ['space','plane','logic','number','trial']){
  const profile=await import(`../scripts/stage-audit/profiles/${category}.ts`);
  const metrics=profile[`${category}Metrics`];
  for(const game of GAMES.filter(g=>g.category===category)){
   assert.equal(coursePhases(game.id).length,5);
   let previousTheme=0,previousMean=0;
   for(let stage=1;stage<=stageCount(game.id);stage++){
    const info=stageInfo(game.id,stage),questions=Array.from({length:10},(_,i)=>generateStage(game.id,stage,i));
    const mean=questions.reduce((sum,p)=>sum+metrics(p).score,0)/10;
    if(info.theme===previousTheme)assert.ok(mean>=previousMean,`${game.id}/${stage}: demand resets`);
    previousTheme=info.theme;previousMean=mean;
   }
  }
 }
});
