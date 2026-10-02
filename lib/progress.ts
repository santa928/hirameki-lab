import {GAMES} from './catalog.ts';
import {z} from 'zod';
export const sessionSchema=z.object({
 id:z.string().uuid(),profile:z.number().int().min(1).max(6),game:z.string().refine(v=>GAMES.some(g=>g.id===v),'unknown game'),mode:z.enum(['stage','timed','free']),stage:z.number().int().min(1).max(80),level:z.number().int().min(1).max(20),correct:z.number().int().min(0).max(9999),attempted:z.number().int().min(0).max(9999),firstCorrect:z.number().int().min(0).max(9999),hints:z.number().int().min(0).max(9999),seconds:z.number().int().min(0).max(86400)
}).strict().refine(s=>s.firstCorrect<=s.correct&&s.correct<=s.attempted,'invalid counts').refine(s=>s.mode!=='stage'||s.attempted<=10,'invalid stage');
export type SessionResult=z.infer<typeof sessionSchema>;
export type GameProgress={game:string;correct:number;plays:number;level:number;best:number;stages:Record<string,number>};
export type Progress={games:Record<string,GameProgress>;correct:number;plays:number;stars:number;days:number};
export const emptyProgress:Progress={games:{},correct:0,plays:0,stars:0,days:0};
export function earnedStars(s:SessionResult){return s.mode==='stage'&&s.correct===10? s.firstCorrect===10&&s.hints===0?3:s.firstCorrect>=7&&s.hints<=2?2:1:0;}
