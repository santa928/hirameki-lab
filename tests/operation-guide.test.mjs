import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generate} from '../lib/puzzles.ts';
import {project,projectRequire,loadSource} from './helpers/tsx-source.mjs';
import {operationGuide as guide} from '../lib/operation-guide.ts';
const p=(id,data)=>({id,kind:id,level:1,seed:0,data,solution:null,hint:''});
/** Inspect the real generated guide content, not source spelling or JSX structure. */
function get(id,data){assert.equal(typeof guide,'function');const result=guide(p(id,data));assert.ok(result);return result;}
const text=(g)=>[...g.instructions,g.goal].join('\n');

test('stroke names the actual start and counts all allowed circles including that start',()=>{
 const g=get('stroke',{n:3,start:1,allowed:[0,1,4,5]});
 assert.match(text(g),/1行.*2列/);assert.match(g.goal,/4.*丸/);assert.match(text(g),/上下左右/);assert.match(text(g),/一つ前.*戻|直前.*戻/);
 assert.match(text(g),/一度|1回/);assert.match(text(g),/ななめ/);
});
test('slide shows the complete goal arrangement and does not turn search distance into a move limit',()=>{
 const g=get('slide',{n:2,initial:[2,0,3,1],minimum:2});
 assert.deepEqual(g.completion,{columns:2,cells:[1,2,3,'あき']});
 assert.match(text(g),/隣/);assert.match(text(g),/右下/);assert.doesNotMatch(text(g),/2手以内|2回まで|最少.*2/);
 const larger=get('slide',{n:3,initial:[8,7,6,5,4,3,2,1,0],minimum:12});assert.deepEqual(larger.completion.cells,[1,2,3,4,5,6,7,8,'あき']);
});
test('district colors map to house numbers and equal plot sizes come from this board',()=>{
 const g=get('equalparts',{n:3,rows:2,k:2,homes:[0,5]});
 assert.match(text(g),/1〜2/);assert.match(text(g),/3マス/);assert.match(text(g),/6マス/);assert.match(text(g),/家.*一つ|家.*1つ/);assert.match(text(g),/辺.*つな|縦横.*つな/);
});
test('jigsaw separates piece identities from signed joining labels and describes selecting then rotating',()=>{
 const g=get('jigsaw',{n:2,tiles:[[0,2,3,0],[0,0,4,-2],[-3,5,0,0],[-4,0,0,-5]]});
 assert.match(text(g),/4枚/);assert.match(text(g),/中心.*番号/);assert.match(text(g),/辺.*接合|辺.*つな/);assert.match(text(g),/ピース.*選.*マス/);assert.match(text(g),/90°/);assert.match(text(g),/外側.*0/);assert.match(text(g),/＋2.*−2/);
});
test('separator numbers identify line endpoints while the inner symbols are separate groups',()=>{
 const g=get('separator',{anchors:[[0,0],[1,0],[2,0],[2,1]],points:[[0,1],[1,1],[1,2]],groups:[0,1,1]});
 assert.match(text(g),/番号.*名前|数字.*番号/);assert.match(text(g),/二つ|2つ/);assert.match(g.goal,/●.*1.*★.*2/);assert.match(text(g),/点.*触れ/);
});
test('parallel card numbers name lines and the goal is every matching direction',()=>{
 const g=get('parallel',{cards:[{vector:[1,0]},{vector:[2,0]},{vector:[0,1]}],vector:[1,0]});
 assert.match(text(g),/1〜3/);assert.match(text(g),/名前/);assert.match(text(g),/長さ.*位置|位置.*長さ/);assert.match(text(g),/全部/);assert.match(text(g),/できた/);
});
test('triangulation gives the actual required diagonal count and current forbidden-line count',()=>{
 const g=get('triangulate',{n:6,banned:[[0,2],[1,3]]});
 assert.match(text(g),/3本/);assert.match(text(g),/2本.*点線|点線.*2本/);assert.match(text(g),/外周.*辺/);assert.match(text(g),/交差/);assert.match(text(g),/同じ.*両端.*消/);
});
test('square keeps the four-point task and equal-edge right-angle meaning',()=>{
 const g=get('square',{n:4,dots:[0,1,4,5,7]});assert.match(text(g),/4点/);assert.match(text(g),/4.*辺.*同じ/);assert.match(text(g),/直角/);
});

test('the visible component exposes readable steps and a labeled goal table with actual row order',()=>{
 const React=projectRequire('react'),{renderToStaticMarkup}=projectRequire('react-dom/server');
 let Component;try{Component=loadSource(project+'/components/operation-guide.tsx').OperationGuide;}catch{}
 assert.equal(typeof Component,'function');
 const html=renderToStaticMarkup(React.createElement(Component,{p:p('slide',{n:2,initial:[2,0,3,1]})}));
 assert.match(html,/<aside[^>]*aria-label="[^"]+"/);assert.match(html,/<ul/);assert.match(html,/<caption>完成する並び<\/caption>/);
 const rows=[...html.matchAll(/<tr>(.*?)<\/tr>/g)].map(m=>[...m[1].matchAll(/<td[^>]*>(.*?)<\/td>/g)].map(c=>c[1].replace(/<[^>]*>/g,'')));
 assert.deepEqual(rows,[['1','2'],['3','あき']]);
 assert.equal(renderToStaticMarkup(React.createElement(Component,{p:p('unrelated',{})})), '');
});

/** Freeze the incoming board so a guide cannot modify problem or answer data. */
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
test('all supported concept levels get a short immutable guide and unrelated IDs remain unchanged',()=>{
 assert.equal(typeof guide,'function');
 for(const id of ['stroke','slide','equalparts','jigsaw','separator','parallel','triangulate','square'])for(const level of [1,5,9,13,17,20])for(const seed of [0,42]){
  const board=freeze(generate(id,level,seed)),before=JSON.stringify(board),g=guide(board);assert.ok(g,id);
  assert.ok(g.instructions.length<=3);assert.ok(g.instructions.every(s=>s.length>5));assert.ok(g.goal.length>5);assert.equal(JSON.stringify(board),before);
 }
 assert.equal(guide(p('unrelated',{})),null);
});
