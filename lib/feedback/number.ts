import type {Puzzle} from '../engine/shared.ts';
import type {AnswerStatus,Feedback,FeedbackTarget} from '../feedback.ts';
export const NUMBER_FEEDBACK_IDS=['count','digitorder'] as const;
/** 表示中のカードから理由を作り、countはoptionAnswerと同じ数値・選択肢indexの境界を使う。 */
export function explainNumberAnswer(p:Puzzle,answer:any,status:AnswerStatus):Feedback|null {
 if(status.accepted)return null;
 const d=p.data||{};
 if(p.id==='digitorder'){
  const values=d.values;
  if(p.kind!=='arrange'||!Array.isArray(values)||!Array.isArray(answer)||answer.length!==values.length||new Set(answer).size!==answer.length||Array.from(answer).some(i=>!Number.isInteger(i)||i<0||i>=values.length)||values[answer[0]]!==0)return null;
  return {code:'number.digitorder.leading-zero',message:'さいしょに0を置くと、けたの数が少なくなるよ。さいしょは0いがいのカードにしよう。',phase:status.submitted?'invalid':'editing',targets:[{type:'card',index:answer[0]}]};
 }
 if(p.id!=='count')return null;
 const scene=d.scene;
 const positions:number[]|null=scene?.type==='grid'&&Array.isArray(scene.values)?scene.values.flatMap((v:any,i:number)=>v==='●'?[i]:[]):Array.isArray(d.positions)?d.positions:null;
 if(!positions||positions.some(v=>!Number.isInteger(v)||v<0)||new Set(positions).size!==positions.length)return null;
 const count=positions.length,capacity=scene?.type==='grid'?scene.values.length:d.capacity;
 const indexed=p.kind==='visual-choice'||['shape','cubes'].includes(d.optionType);
 const validIndex=indexed&&Number.isInteger(answer)&&answer>=0&&Array.isArray(p.options)&&answer<p.options.length;
 const selected=indexed?(validIndex?p.options![answer]:undefined):answer;
 const card=indexed?(validIndex?answer:-1):(p.options?.indexOf(answer)??-1);
 const targets:FeedbackTarget[]=[{type:'constraint',index:0}];if(card>=0)targets.unshift({type:'card',index:card});
 const feedback=(code:string,message:string,phase:Feedback['phase']=status.submitted?'invalid':'editing'):Feedback=>({code:`number.count.${code}`,message,phase,targets});
 if(answer===undefined||answer===null)return feedback('incomplete','丸を数えて、答えの数字を1つ選ぼう。','incomplete');
 if(!Number.isInteger(selected)||selected<0)return feedback('number','丸の数は0以上の整数だよ。表示された数字から選ぼう。');
 if(selected===count)return null;
 let method=`見えている丸は ${count}こ。並びを分けて、同じ丸を二度数えないようにしよう。`;
 if(d.layout==='fives')method=`5このまとまり ${Math.floor(count/5)}つと、残り ${count%5}こで ${count}こだよ。`;
 if(d.layout==='tens')method=`10このまとまり ${Math.floor(count/10)}つと、残り ${count%10}こで ${count}こだよ。`;
 if(d.layout==='gaps'&&Number.isInteger(capacity)&&capacity>=count)method=`全部の場所 ${capacity}こから、空き ${capacity-count}こを引くと ${count}こだよ。`;
 if(d.layout==='clusters')method=`離れたまとまりを合わせると ${count}こ。まとまりの間の空きは丸に数えないよ。`;
 return feedback(selected<count?'under':'over',`選んだ ${selected}こは、丸より${selected<count?'少ない':'多い'}よ。${method}`);
}
