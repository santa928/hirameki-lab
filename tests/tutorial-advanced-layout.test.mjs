import assert from 'node:assert/strict';
import {test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {readFileSync} from 'node:fs';
import {generateStage,stageCount} from '../lib/stages.ts';
import {makeTutorial} from '../lib/tutorial.ts';
import {check} from '../lib/puzzles.ts';

test('高段階の展開図は初期の元図を残し、向き確定後は今の6面を焦点にする',()=>{
 for(const stage of [1,Math.ceil(stageCount('nets')/2),stageCount('nets')]){
  const source=generateStage('nets',stage,0),before=JSON.stringify(source),{p,frames}=makeTutorial('nets',{mode:'stage',stage,source});
  for(const frame of frames){
   assert.equal(frame.focus.selectors[0],frame.scene.faces?'.teaching-net .teaching-exact':'[data-tutorial-diagram]');
   assert.deepEqual(frame.scene.cells,p.data.cells);assert.deepEqual(frame.scene.labels,p.data.labels);
  }
  assert.ok(check(p,frames.at(-1).answer));assert.equal(JSON.stringify(source),before);
 }
});

test('高段階の球と暗号を全情報保持でcompactにし、展開図の6面と元図をともに残す',async()=>{
 const server=await createServer({server:{middlewareMode:true,ws:false},appType:'custom'});
 try{
  const {Tutorial}=await server.ssrLoadModule('/components/tutorial.tsx'),{TeachingScene}=await server.ssrLoadModule('/components/teaching-scene.tsx');
  for(const id of ['ballweigh','cipher']){
   const stage=65,source=generateStage(id,stage,0),before=JSON.stringify(source),context={mode:'stage',stage,source},t=makeTutorial(id,context);
   const html=renderToStaticMarkup(React.createElement(Tutorial,{id,context}));
   if(id==='ballweigh'){
    const rack=html.split('<div class="ball-rack">')[1].split('</div>')[0];
    assert.equal((rack.match(/<button /g)||[]).length,t.p.data.n);assert.equal(t.p.data.n,22);
    for(let ball=1;ball<=t.p.data.n;ball++)assert.ok(rack.includes('>'+ball+'<small>'));
   }else{
    assert.equal((html.match(/class="cipher-key"/g)||[]).length,3);
    assert.equal((html.match(/<span>\d+ → <b>\d+<\/b><\/span>/g)||[]).length,18);
    const message=html.split('<div class="cipher-message">')[1].split('</div>')[0];
    assert.deepEqual([...message.matchAll(/<b>(\d+)<\/b>/g)].map(m=>Number(m[1])),t.p.data.message.map(v=>v+1));
    assert.equal(t.p.data.message.length,4);
   }
   assert.ok(check(t.p,t.frames.at(-1).answer));assert.equal(JSON.stringify(source),before);
  }
  const source=generateStage('nets',80,0),{frames}=makeTutorial('nets',{mode:'stage',stage:80,source});
  for(const frame of frames){
   const html=renderToStaticMarkup(React.createElement(TeachingScene,{scene:frame.scene}));
   assert.ok(html.includes('class="teaching-panels teaching-net" data-posed="'+Boolean(frame.scene.faces)+'"'));
   assert.ok(html.includes('元の展開図'));assert.ok(html.includes('展開図の面対応'));
   if(frame.scene.faces){const f=frame.scene.faces;assert.ok(html.includes('6面 うえ'+f[0]+'した'+f[1]+'おく'+f[2]+'てまえ'+f[3]+'みぎ'+f[4]+'ひだり'+f[5]));assert.ok(html.includes('今の6面の位置'));}
  }
  const css=readFileSync(new URL('../components/tutorial.css',import.meta.url),'utf8');
  assert.ok(css.includes('.tutorial-context[data-game="ballweigh"] .ball-rack>button{height:55px;font-size:23px}'));
  assert.ok(css.includes('.tutorial-context[data-game="cipher"] .scene-cipher{gap:4px}'));
  assert.ok(css.includes('.tutorial-context[data-game="cipher"] .cipher-key>span{padding:2px 4px;font-size:16px;line-height:1.3}'));
 }finally{await server.close();}
});


test('高さ700pxの計量教程でも22球が5行でsurface内容高へ収まり数字23pxを保つ',()=>{
 const css=readFileSync(new URL('../components/tutorial.css',import.meta.url),'utf8');
 const media=css.match(/@media\(max-height:760px\)\{\.tutorial-context\[data-game="ballweigh"\] \.ball-rack>button\{height:(\d+)px;font-size:(\d+)px\}/);
 assert.ok(media,'短いviewport向けのball専用ruleが必要');
 const source=generateStage('ballweigh',65,0),before=JSON.stringify(source),{p,frames}=makeTutorial('ballweigh',{mode:'stage',stage:65,source});
 const columns=5,rows=Math.ceil(p.data.n/columns),gap=8,rackHeight=rows*Number(media[1])+(rows-1)*gap,available=Math.floor(700*.43)-16;
 assert.equal(p.data.n,22);assert.equal(rows,5);assert.equal(Number(media[2]),23);
 assert.ok(rackHeight<=available,'rack '+rackHeight+'px > surface content '+available+'px');
 assert.ok(css.includes('.tutorial-context[data-game="ballweigh"] .ball-rack>button{height:55px;font-size:23px}'));
 assert.ok(check(p,frames.at(-1).answer));assert.equal(JSON.stringify(source),before);
});


test('高さ700pxの三鍵暗号は余白だけで30px削り全18対応と4文字の大きさを保持する',()=>{
 const css=readFileSync(new URL('../components/tutorial.css',import.meta.url),'utf8'),start=css.lastIndexOf('@media(max-height:760px)'),media=css.slice(start);
 const gap=media.match(/data-game="cipher"\] \.scene-cipher\{gap:(\d+)px\}/),key=media.match(/data-game="cipher"\] \.cipher-key\{padding:(\d+)px\}/),span=media.match(/data-game="cipher"\] \.cipher-key>span\{padding:(\d+)px 4px\}/);
 assert.ok(gap&&key&&span,'短いviewport向けのcipher余白ruleが必要');
 const source=generateStage('cipher',65,0),before=JSON.stringify(source),{p,frames}=makeTutorial('cipher',{mode:'stage',stage:65,source});
 assert.equal(p.data.maps.length,3);assert.ok(p.data.maps.every(map=>map.length===6));assert.equal(p.data.message.length,4);
 // S65の旧初期図は約316px。3鍵×2行の文字/行数を変えず余白を削る。
 const reduction=3*(4-Number(gap[1]))+3*2*(4-Number(key[1]))+3*2*2*(2-Number(span[1]));
 assert.ok(reduction>=30);assert.ok(316-reduction<=Math.floor(700*.43)-8);
 assert.ok(css.includes('.cipher-key>span{padding:2px 4px;font-size:16px;line-height:1.3}'));
 assert.ok(css.includes('.cipher-message{font-size:20px;padding:4px;gap:6px}'));
 assert.ok(check(p,frames.at(-1).answer));assert.equal(JSON.stringify(source),before);
});
