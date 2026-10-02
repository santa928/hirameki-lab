import{courseIsComplete}from'./stages.ts';
import{GAMES,CATEGORIES}from'./catalog.ts';import{hash}from'./puzzles.ts';import type{Progress}from'./progress.ts';
const FIRST=['cubes','mirror','count','frogs','rollcube','tiling','nonogram','mincoins','ropeends','lights','factors','maze'];
export function recommendations(progress:Progress,date:string){if(!progress.plays)return FIRST.map(id=>GAMES.find(g=>g.id===id)!);const continued=GAMES.filter(g=>progress.games[g.id]?.correct>0&&!courseIsComplete(g.id,progress.games[g.id].stages||{})).sort((a,b)=>progress.games[a.id].plays-progress.games[b.id].plays).slice(0,3);const daily=CATEGORIES.flatMap(c=>GAMES.filter(g=>g.category===c.id).sort((a,b)=>(progress.games[a.id]?.plays||0)-(progress.games[b.id]?.plays||0)||hash(date+a.id)-hash(date+b.id)).slice(0,2));return [...new Map([...continued,...daily].map(g=>[g.id,g])).values()].slice(0,12);}
export const MILESTONES=[10,30,60,120,240,500,1000,2500,5000];
export const INTRO_GAMES=['count','compare','cubes','top','rotate','mirror','area','maze','numberpath','lights','ropeends','rollcube','perimeter','tiling','fairshare','placevalue','frogs'];
export function japanDay(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo'}).format(date);}
