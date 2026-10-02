import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GAMES} from '../../lib/catalog.ts';
import {generate,check,hash,optionAnswer} from '../../lib/puzzles.ts';
import {selectStageCandidates,taskFingerprint,reserveThemeBodies} from '../../lib/stage-selection.ts';

const categories=['space','plane','logic','number','trial'];
const selected=process.argv[2];
const dir='docs/stage-audit/after';mkdirSync(dir,{recursive:true});
if(selected==='merge'){
 const seeds={},goals={},outlines={},summary=[];
 for(const cat of categories){const report=JSON.parse(readFileSync(`${dir}/${cat}.json`,'utf8'));for(const game of report.games){seeds[game.id]=game.stages.map(s=>s.questions.map(q=>[q.level,q.seed]));goals[game.id]=game.goals;outlines[game.id]={totalStages:game.stages.length,phases:game.phases};summary.push({id:game.id,uniqueBodies:game.uniqueBodies,stages:game.stages.length,minimumLevelPool:Math.min(...game.levelPools.map(p=>p.distinct)),minStageDistinct:Math.min(...game.stages.map(s=>s.uniqueBodies))});}}
 if(Object.keys(seeds).length!==120||Object.values(seeds).some(s=>s.length<5||s.length>80||s.some(q=>q.length!==10)))throw Error('Incomplete curriculum');
 writeFileSync('lib/stage-seeds.json',JSON.stringify(seeds)+'\n');writeFileSync('lib/stage-goals.json',JSON.stringify(goals)+'\n');writeFileSync('lib/stage-outline.json',JSON.stringify(outlines)+'\n');writeFileSync(`${dir}/summary.json`,JSON.stringify(summary,null,2)+'\n');
 console.log(JSON.stringify({games:120,stages:summary.reduce((n,g)=>n+g.stages,0),questions:summary.reduce((n,g)=>n+g.stages*10,0),minimumStageDistinct:Math.min(...summary.map(g=>g.minStageDistinct)),uniqueTaskBodies:summary.reduce((s,g)=>s+g.uniqueBodies,0)}));
}else{
 if(!categories.includes(selected))throw Error('Pass one category or merge');
 const profile=await import(`./profiles/${selected}.ts`),metric=profile[`${selected}Metrics`],allGoals=profile[`${selected.toUpperCase()}_GOALS`],questionBody=profile[`${selected}QuestionBody`]||taskFingerprint;
 const games=[],filter=process.argv[3];
 if(existsSync(`${dir}/${selected}.json`)&&filter)games.push(...JSON.parse(readFileSync(`${dir}/${selected}.json`,'utf8')).games.filter(g=>g.id!==filter));
 for(const game of GAMES.filter(g=>g.category===selected&&(!filter||g.id===filter))){
  const goals=allGoals[game.id];if(!goals||goals.length!==5||new Set(goals).size<4)throw Error(`Missing distinct goals ${game.id}`);
  const stages=[],phases=[],levelPools=[],seen=new Set(),bodyHashes=new Set(),pools=[];
  for(let band=0;band<5;band++){
   const pool=[],local=new Set();
   for(let level=band*4+1;level<=band*4+4;level++){const bank=['traffic','trainyard'].includes(game.id),limit=bank?200:120;
   for(let attempt=0;attempt<limit;attempt++){
    const seed=bank?attempt:hash(`course-v4/${game.id}/${level}/${attempt}`),p=generate(game.id,level,seed);
    if(!check(p,p.solution))throw Error(`Bad witness ${game.id}/${level}/${seed}`);
    if(p.options&&p.options.filter((_,i)=>check(p,optionAnswer(p,i))).length!==1)throw Error(`Ambiguous options ${game.id}/${level}/${seed}`);
    const {score,features}=metric(p);if(!Number.isFinite(score))throw Error(`Invalid score ${game.id}`);
    const body=createHash('sha256').update(typeof questionBody(p)==='string'?questionBody(p):JSON.stringify(questionBody(p))).digest('hex').slice(0,20);
    if(local.has(body))continue;local.add(body);pool.push({level,seed,score,body,features});
   }
   }
   pools.push(pool);
  }
  const reserved=reserveThemeBodies(pools);
  for(let band=0;band<5;band++){
   const pool=pools[band],future=new Set(reserved.slice(band+1).flatMap(set=>[...set]));
   const fresh=pool.filter(c=>!seen.has(c.body)&&!future.has(c.body)),count=Math.min(16,Math.floor(fresh.length/10)),start=stages.length+1;
   if(count<1)throw Error(`Too few fresh bodies: ${game.id}/theme${band+1} (${fresh.length})`);
   levelPools.push({band:band+1,candidates:pool.length,distinct:pool.length,newBodies:fresh.length,reservedForLater:pool.filter(c=>future.has(c.body)).length});
   const missions=selectStageCandidates(fresh,count*10);
   for(let m=0;m<count;m++){
    const questions=missions[m];for(const q of questions){seen.add(q.body);bodyHashes.add(q.body);}
    stages.push({stage:stages.length+1,theme:band+1,mission:m+1,goal:goals[band],minimum:Math.min(...questions.map(q=>q.score)),mean:questions.reduce((s,q)=>s+q.score,0)/10,maximum:Math.max(...questions.map(q=>q.score)),uniqueBodies:new Set(questions.map(q=>q.body)).size,questions});
   }
   phases.push({theme:band+1,start,end:stages.length,goal:goals[band]});
  }
  games.push({id:game.id,name:game.name,goals,phases,uniqueBodies:bodyHashes.size,levelPools,stages});
  writeFileSync(`${dir}/${selected}.json`,JSON.stringify({category:selected,method:'Generated task demand, not measured child learning or human difficulty',games})+'\n');
  console.log(`${game.id}: ${stages.length} stages, ${bodyHashes.size} distinct bodies, smallest pool ${Math.min(...levelPools.map(p=>p.distinct))}`);
 }
}
