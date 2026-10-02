import type {Puzzle} from '../engine/shared.ts';
import {directed,trialStep} from '../engine/trial.ts';
import type {Feedback,FeedbackTarget} from '../feedback.ts';

/** Only these rejected-action adapters are implemented; other games return null. */
export const TRIAL_FEEDBACK_IDS = ['ballweigh','sokoban','pegs','frogs','traffic','keydoors','twobots','bridge','jugs','river'] as const;
const supported = new Set<string>(TRIAL_FEEDBACK_IDS);
const cell = (index:number):FeedbackTarget => ({type:'cell',index});
const piece = (index:number):FeedbackTarget => ({type:'piece',index});
const at = (index:number,n:number) => `${Math.floor(index/n)+1}ぎょう ${index%n+1}れつ`;
const letter = (index:number) => String.fromCharCode(65+index);
const validIndex = (value:any,length:number):boolean => Number.isInteger(value)&&value>=0&&value<length;
function reason(id:string,code:string,message:string,targets:FeedbackTarget[]=[]):Feedback {
  return {code:`trial.${id}.${code}`,message,targets,phase:'invalid'};
}

/**
 * The existing step is authoritative. This function explains only its null result,
 * and never commits an action, changes a puzzle, or evaluates a goal differently.
 * State is the current valid engine state, before the attempted action.
 */
export function diagnoseTrialAction(p:Pick<Puzzle,'id'|'data'>,state:any,action:any):Feedback|null {
  if(!supported.has(p.id))return null;
  if(trialStep(p,state,action)!==null)return null;
  const {id,data:d}=p;
  const fail=(code:string,message:string,targets:FeedbackTarget[]=[])=>reason(id,code,message,targets);

  if(id==='sokoban'||id==='keydoors'||id==='twobots') {
    if(!validIndex(action,4))return fail('direction','うえ・みぎ・した・ひだりの やじるしを えらぼう。');
    if(id==='twobots') {
      const positions:number[]=state.positions.map((pos:number)=>{
        const next=directed(pos,action,d.n);
        return next<0||d.walls.includes(next)?pos:next;
      });
      if(positions[0]===positions[1])return fail('collision',`${at(positions[0],d.n)}に ふたりが はいってしまうよ。`,[cell(positions[0])]);
      if(positions[0]===state.positions[1]&&positions[1]===state.positions[0])return fail('swap','ふたりの いる マスを いれかえることは できないよ。',state.positions.map(cell));
      return fail('stopped','ふたりとも かべか ばんの はしで とまるよ。べつの むきを えらぼう。',state.positions.map(cell));
    }
    const next=directed(state.pos,action,d.n);
    if(next<0)return fail('boundary','その むきは ばんの そとだよ。');
    if(d.walls.includes(next))return fail('wall',`${at(next,d.n)}は かべだよ。`,[cell(next)]);
    if(id==='keydoors') {
      const door=d.doors.indexOf(next);
      if(door>=0&&!(state.keys&(1<<door)))return fail('key',`${door+1}ばんの ドアには ${door+1}ばんの カギが ひつようだよ。`,[cell(next)]);
      return null;
    }
    if(state.boxes.includes(next)) {
      const beyond=directed(next,action,d.n);
      if(beyond<0)return fail('box-boundary','はこを おすと ばんの そとに でてしまうよ。',[cell(next)]);
      if(d.walls.includes(beyond))return fail('box-wall',`はこの さきの ${at(beyond,d.n)}は かべだよ。`,[cell(beyond)]);
      if(state.boxes.includes(beyond))return fail('box-blocked','はこの さきに べつの はこが あるよ。いちどに おせるのは ひとつだよ。',[cell(beyond)]);
    }
    return null;
  }

  if(id==='pegs') {
    const {from,to}=action??{};
    if(!validIndex(from,d.n*d.n)||!validIndex(to,d.n*d.n))return fail('selection','うごかす まると、ばんの なかの いきさきを えらぼう。');
    if(!state.includes(from))return fail('source','うごかす まるが その マスに ないよ。',[cell(from)]);
    const x=from%d.n,y=Math.floor(from/d.n),xx=to%d.n,yy=Math.floor(to/d.n);
    if(!((x===xx&&Math.abs(y-yy)===2)||(y===yy&&Math.abs(x-xx)===2)))return fail('distance','たてか よこに 2マス とぼう。ななめには とべないよ。');
    const middle=(from+to)/2;
    if(!state.includes(middle))return fail('middle',`${at(middle,d.n)}に とびこす まるが ないよ。`,[cell(middle)]);
    if(state.includes(to))return fail('occupied',`${at(to,d.n)}には まるが あるよ。あきマスへ とぼう。`,[cell(to)]);
    return null;
  }

  if(id==='frogs') {
    if(!validIndex(action,state.length)||!state[action])return fail('selection','うごかす カエルを えらぼう。あきマスは うごかせないよ。');
    const empty=state.indexOf(0),dir=state[action],delta=empty-action;
    if(delta*dir<0)return fail('backwards',`${action+1}ばんの カエルは ${dir===1?'みぎ →':'ひだり ←'}にだけ すすめるよ。`,[cell(action)]);
    if(Math.abs(delta)>2)return fail('distance','すすめるのは 1マスか、あいてを とびこす 2マスだよ。',[cell(action)]);
    if(delta===2*dir&&state[action+dir]!==-dir)return fail('jump','とびこせるのは、はんたいむきの カエル 1ぴきだよ。',[cell(action+dir)]);
    return null;
  }

  if(id==='traffic') {
    const {car,delta}=action??{};
    if(!validIndex(car,d.cars.length))return fail('selection','うごかす くるまを えらぼう。');
    if(!Number.isInteger(delta)||Math.abs(delta)!==1)return fail('direction','くるまの むきに 1マスずつ うごかそう。',[piece(car)]);
    const cfg=d.cars[car],pos=state[car]+delta;
    if(pos<0||pos+cfg.len>d.n)return fail('boundary',`${car+1}ばんの くるまは ばんの そとへ でられないよ。`);
    const occupied=new Map<number,number>();
    d.cars.forEach((other:any,index:number)=>{
      if(index===car)return;
      for(let k=0;k<other.len;k++)occupied.set(other.axis==='h'?other.lane*d.n+state[index]+k:(state[index]+k)*d.n+other.lane,index);
    });
    for(let k=0;k<cfg.len;k++) {
      const destination=cfg.axis==='h'?cfg.lane*d.n+pos+k:(pos+k)*d.n+cfg.lane;
      const blocker=occupied.get(destination);
      if(blocker!==undefined)return fail('collision',`${blocker+1}ばんの くるまが いきさきに あるよ。`,[piece(blocker),cell(destination)]);
    }
    return null;
  }

  if(id==='river'||id==='bridge') {
    const riders=action?.riders;
    if(!Array.isArray(riders))return fail('selection','わたる なかまを えらぼう。');
    if(new Set(riders).size!==riders.length)return fail('duplicate','おなじ なかまを 2かい のせることは できないよ。');
    const capacity=id==='river'?d.capacity:2;
    if(riders.length>capacity)return fail('capacity',`いちどに わたれるのは ${capacity}にんまでだよ。`);
    if(id==='bridge'&&!riders.length)return fail('empty','あかりと いっしょに わたる ひとを 1にんか 2にん えらぼう。');
    if(riders.some((r:any)=>!validIndex(r,d.n)))return fail('selection','わたる なかまを ばんめんから えらぼう。');
    const wrongBank=riders.find((r:number)=>state.banks[r]!==state.boat);
    if(wrongBank!==undefined)return fail('bank',`${letter(wrongBank)}は ${id==='river'?'ふね':'あかり'}の ある きしに いないよ。`,[piece(wrongBank)]);
    if(id==='river') {
      const banks=[...state.banks],boat=1-state.boat;
      riders.forEach((r:number)=>banks[r]=boat);
      const conflict=d.conflicts.find(([a,b]:number[])=>banks[a]===banks[b]&&banks[a]!==boat);
      if(conflict) {
        const [a,b]=conflict;
        return fail('conflict',`${letter(a)}と${letter(b)}が ${banks[a]===0?'こちらぎし':'むこうぎし'}に のこるよ。せんどうが いないと けんかするよ。`,[piece(a),piece(b)]);
      }
    }
    return null;
  }

  if(id==='jugs') {
    const {type,from,to}=action??{};
    if(!validIndex(from,d.caps.length))return fail('selection','みずを うごかす コップを えらぼう。');
    if(type==='fill'&&state[from]===d.caps[from])return fail('full',`${letter(from)}は すでに まんぱいだよ。`,[piece(from)]);
    if(type==='empty'&&state[from]===0)return fail('empty',`${letter(from)}は すでに からだよ。`,[piece(from)]);
    if(type==='pour') {
      if(!validIndex(to,d.caps.length))return fail('destination','みずを そそぐ あいての コップを えらぼう。');
      if(from===to)return fail('same','べつの コップへ そそごう。おなじ コップには うつせないよ。',[piece(from)]);
      if(state[from]===0)return fail('source-empty',`${letter(from)}には そそぐ みずが ないよ。`,[piece(from)]);
      if(state[to]===d.caps[to])return fail('destination-full',`${letter(to)}は まんぱいで、みずが はいらないよ。`,[piece(to)]);
    }
    if(!['fill','empty','pour'].includes(type))return fail('operation','みたす・からにする・べつの コップへ そそぐ、から えらぼう。');
    return null;
  }

  if(id==='ballweigh') {
    const guess=action?.guess;
    if(guess!==undefined) {
      if(!validIndex(guess,d.n))return fail('selection','こたえる たまを えらぼう。');
      const excluded=state.observations.findIndex((observation:any)=>{
        const expected=observation.left.includes(guess)?-1:observation.right.includes(guess)?1:0;
        return expected!==observation.result;
      });
      if(excluded>=0&&!state.candidates.includes(guess)) {
        const result=state.observations[excluded].result;
        const words=result===-1?'ひだりが かるい':result===1?'みぎが かるい':'つりあう';
        return fail('eliminated',`${guess+1}ばんは ${excluded+1}かいめの「${words}」という けっかと あわないよ。`,[{type:'card',index:guess},{type:'observation',index:excluded}]);
      }
      if(state.candidates.length===1)return fail('different-candidate','えらんだ たまは、これまでの けっかに あう こうほではないよ。',[{type:'card',index:guess}]);
      const remaining=d.budget-state.observations.length;
      if(remaining<=0)return fail('exhausted',`こうほが ${state.candidates.length}こ のこっているよ。「もどす」か「やりなおす」で わけかたを かんがえよう。`);
      return fail('ambiguous',`こうほが ${state.candidates.length}こ のこっているよ。あと ${remaining}かい はかって ひとつに しぼろう。`);
    }
    const {left,right}=action??{};
    if(!Array.isArray(left)||!Array.isArray(right))return fail('selection','はかる たまを ひだりと みぎに のせよう。');
    if(!left.length||!right.length)return fail('empty','ひだりと みぎに たまを のせよう。');
    if(left.length!==right.length)return fail('unequal',`ひだりは ${left.length}こ、みぎは ${right.length}こだよ。おなじ かずに しよう。`);
    if(new Set([...left,...right]).size!==left.length+right.length)return fail('duplicate','ひとつの たまは ひとつの さらだけに のせよう。');
    if([...left,...right].some((v:any)=>!validIndex(v,d.n)))return fail('selection','ばんめんに ある たまを のせよう。');
    if(state.observations.length>=d.budget)return fail('no-weighings','はかれる かいすうを つかいきったよ。「もどす」か「やりなおす」で かんがえよう。');
  }
  return null;
}
