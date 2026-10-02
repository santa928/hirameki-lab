import type {Puzzle} from '../engine/shared.ts';
import type {AnswerStatus,Feedback,FeedbackTarget} from '../feedback.ts';
export const NUMBER_FEEDBACK_IDS=['count'] as const;
/** Resolve the same numeric-value or option-index boundary as optionAnswer. */
export function explainNumberAnswer(p:Puzzle,answer:any,status:AnswerStatus):Feedback|null {
 if(p.id!=='count'||status.accepted)return null;
 const d=p.data||{},scene=d.scene;
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
