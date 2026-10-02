import assert from 'node:assert/strict';import {test} from 'node:test';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {createServer} from 'vite';
test('関節図の根元は別印で、点と固定関節番号は実問と一致する',async()=>{const server=await createServer({server:{middlewareMode:true,ws:false},appType:'custom'});try{const {TeachingScene}=await server.ssrLoadModule('/components/teaching-scene.tsx');const html=renderToStaticMarkup(React.createElement(TeachingScene,{scene:{type:'hinge-state',points:[[0,0,0],[1,0,0],[1,1,0]],fixed:[0,1],pivot:1,axis:0}}));assert.match(html,new RegExp(">根元</text>"));assert.match(html,new RegExp(">1</text>"));assert.match(html,new RegExp(">2</text>"));assert.doesNotMatch(html,new RegExp(">3</text>"));assert.match(html,/固定: 根元・1/);}finally{await server.close();}});

import {spaceTeaching} from '../lib/teaching/space-steps.ts';
test('関節captionは実問pivot番号と先端番号をそのまま使う',()=>{const frames=spaceTeaching({id:'hinge3d',data:{points:[[0,0,0],[1,0,0],[1,1,0]],turns:[{pivot:1,axis:2,q:1}]}});assert.match(frames[1].caption,/関節1/);assert.match(frames[2].caption,/関節1/);assert.match(frames[2].caption,/点2/);});

import {skewerTrace} from '../lib/teaching/skewer.ts';
test('串の入口座標は盤内の最初のマスを示し、盤外と呼ばない',async()=>{
 const server=await createServer({server:{middlewareMode:true,ws:false},appType:'custom'});
 try{const {TeachingScene}=await server.ssrLoadModule('/components/teaching-scene.tsx');
  for(const axis of [0,1,2])for(const sign of [1,-1]){
   const d={n:2,h:2,axis,sign,fixed:[0,0,0],values:[1,2,3,4,5,6,7,8]},trace=skewerTrace(d);
   const scene={...d,type:'skewer-state',entry:trace.entry,tokens:[]};
   const html=renderToStaticMarkup(React.createElement(TeachingScene,{scene}));
   assert.ok(html.includes('入口のマス: ('+trace.entry.displayCoordinate.join(',')+')'),axis+':'+sign);
   assert.ok(!html.includes('入口の外'),axis+':'+sign);
   assert.notDeepEqual(trace.entry.coordinate,trace.entry.outside);
  }
 }finally{await server.close();}
});

test('関節図の回転軸は内部番号でなく字幕と同じ軸名を表示する',async()=>{
 const server=await createServer({server:{middlewareMode:true,ws:false},appType:'custom'});
 try{const {TeachingScene}=await server.ssrLoadModule('/components/teaching-scene.tsx');
  const names=['横 X','奥 Y','高さ Z'];
  for(const axis of [0,1,2,undefined]){
   const scene={type:'hinge-state',points:[[0,0,0],[1,0,0],[1,1,0]],fixed:[0,1],pivot:1,axis};
   const html=renderToStaticMarkup(React.createElement(TeachingScene,{scene}));
   assert.ok(html.includes('回転軸: '+(axis===undefined?'はじめ':names[axis])));
   assert.doesNotMatch(html,/回転軸: [012]</);
  }
 }finally{await server.close();}
});

import {readFileSync} from 'node:fs';
import {makeTutorial} from '../lib/tutorial.ts';
test('拡大の比較3図は同じ座標範囲の等幅1段として表示する',async()=>{
 const server=await createServer({server:{middlewareMode:true,ws:false},appType:'custom'});
 try{const {TeachingScene}=await server.ssrLoadModule('/components/teaching-scene.tsx');
  const frame=makeTutorial('scale').frames.find(f=>f.scene?.panels?.length===3);
  const html=renderToStaticMarkup(React.createElement(TeachingScene,{scene:frame.scene}));
  assert.match(html,/class="teaching-panels teaching-plane-panels" data-panel-count="3"/);
  const views=[...html.matchAll(/viewBox="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(views.length,3);assert.equal(new Set(views).size,1);
  const css=readFileSync(new URL('../components/tutorial.css',import.meta.url),'utf8');
  const rule=(selector)=>{const start=css.indexOf(selector+'{');assert.ok(start>=0,selector);return css.slice(start,css.indexOf('}',start));};
  assert.ok(rule('.teaching-plane-panels[data-panel-count="3"]').includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
  assert.ok(rule('.teaching-plane-panels[data-panel-count="3"]>figure').includes('min-width:0'));
  assert.ok(rule('.teaching-plane-panels[data-panel-count="3"]>figure>svg').includes('height:150px'));
 }finally{await server.close();}
});

test('お手本では重複操作説明と選択候補を除き、対象図と結果を表示する',()=>{
 const css=readFileSync(new URL('../components/tutorial.css',import.meta.url),'utf8');
 const selector='.tutorial-context .operation-guide,.tutorial-context .answer-options,.tutorial-context .extended-options';
 assert.ok(css.includes(selector+'{display:none}'));
});

test('左右の量比較は両図を同じ行で保ち、SVGのintrinsic幅で溢れない',()=>{
 const css=readFileSync(new URL('../components/tutorial.css',import.meta.url),'utf8');
 assert.ok(css.includes('.tutorial-context .compare-problem{grid-template-columns:repeat(2,minmax(0,1fr))'));
 assert.ok(css.includes('.tutorial-context .compare-problem>div{min-width:0'));
});

import {generateStage} from '../lib/stages.ts';
test('現在のcompare実scene-row-panelsを教程専用2列にし、両側の丸と順序を保持する',async()=>{
 const server=await createServer({server:{middlewareMode:true,ws:false},appType:'custom'});
 try{const {Tutorial}=await server.ssrLoadModule('/components/tutorial.tsx');
  const source=generateStage('compare',1,0),before=structuredClone(source),context={mode:'stage',stage:1,source};
  const tutorial=makeTutorial('compare',context),html=renderToStaticMarkup(React.createElement(Tutorial,{id:'compare',context}));
  assert.match(html,/data-game="compare"/);assert.match(html,/scene-row-panels/);
  assert.ok(html.indexOf('ひだり')<html.indexOf('みぎ'));
  assert.equal([...html.matchAll(/aria-label="まる"/g)].length,tutorial.p.data.a+tutorial.p.data.b);
  assert.deepEqual(source,before);
  const css=readFileSync(new URL('../components/tutorial.css',import.meta.url),'utf8');
  assert.ok(css.includes('.tutorial-context[data-game="compare"] .scene-row-panels{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'));
  assert.ok(css.includes('.tutorial-context[data-game="compare"] .scene-row-panels .diagram-grid{width:100%;max-width:125px'));
 }finally{await server.close();}
});

test('viewpointのお手本は向き付き配置図と写真を両方保持して一様にcompact表示する',async()=>{
 const server=await createServer({server:{middlewareMode:true,ws:false},appType:'custom'});
 try{const {Tutorial}=await server.ssrLoadModule('/components/tutorial.tsx');
  const source=generateStage('viewpoint',1,0),before=structuredClone(source),context={mode:'stage',stage:1,source};
  const html=renderToStaticMarkup(React.createElement(Tutorial,{id:'viewpoint',context}));
  assert.match(html,/scene-viewpoint/);assert.match(html,/camera-board/);assert.match(html,/photo-towers/);
  for(const arrow of ['A ↓','D →','← B','↑ C'])assert.ok(html.includes(arrow),arrow);
  assert.deepEqual(source,before);
  const css=readFileSync(new URL('../components/tutorial.css',import.meta.url),'utf8');
  assert.ok(css.includes('.tutorial-context .scene-viewpoint .diagram-grid{width:175px;max-width:175px'));
  assert.ok(css.includes('.tutorial-context .scene-viewpoint .camera{font-size:13px'));
  assert.ok(css.includes('.tutorial-context .scene-viewpoint .photo-towers{zoom:.8'));
 }finally{await server.close();}
});

test('viewpointの左右矢印は水平1行、上下ラベル余白は図を保ってcompactにする',()=>{
 const css=readFileSync(new URL('../components/tutorial.css',import.meta.url),'utf8');
 assert.ok(css.includes('.tutorial-context .scene-viewpoint .camera{font-size:13px;white-space:nowrap}'));
 assert.ok(css.includes('grid-template-columns:30px minmax(0,1fr) 30px;grid-template-rows:20px auto 20px;width:235px'));
});

test('教程はplayback子の後描画/サイズ変更を観察し、patternのsource列を内幅へ収める',()=>{
 const css=readFileSync(new URL('../components/tutorial.css',import.meta.url),'utf8'),component=readFileSync(new URL('../components/tutorial.tsx',import.meta.url),'utf8');
 assert.match(component,/new ResizeObserver/);assert.match(component,/observer.observe\(content\)/);assert.match(component,/observer.disconnect\(\)/);
 assert.ok(css.includes('.tutorial-context{min-width:0;max-width:100%}'));
 assert.ok(css.includes('.tutorial-context[data-game="pattern"] .scene-row-sequence{width:100%;max-width:100%;min-width:0;flex-wrap:wrap'));
});

test('patternをwrapで同時表示する教程では横scrollの誤案内cueを抑止する',()=>{
 const css=readFileSync(new URL('../components/tutorial.css',import.meta.url),'utf8');
 assert.ok(css.includes('.tutorial-context[data-game="pattern"] .scene-sequence-wrap>.scene-sub{display:none}'));
});


test('串S80の4層100マスと現在位置を保持して教程専用2×2で表示する',async()=>{
 const server=await createServer({server:{middlewareMode:true,ws:false},appType:'custom'});
 try{const {TeachingScene}=await server.ssrLoadModule('/components/teaching-scene.tsx');
  const source=generateStage('skewer',80,0),before=JSON.stringify(source),{p,frames}=makeTutorial('skewer',{mode:'stage',stage:80,source});
  assert.equal(p.data.n,5);assert.equal(p.data.h,4);
  for(const frame of frames){
   const html=renderToStaticMarkup(React.createElement(TeachingScene,{scene:frame.scene}));
   assert.match(html,/class="teaching-exact teaching-skewer" data-layers="4"/);
   const cells=[...html.matchAll(new RegExp('<span class="(?:active|ray|)">([^<]+)(?:<small>今</small>)?</span>','g'))];
   assert.equal(cells.length,100);assert.deepEqual(cells.map(m=>m[1]),p.data.values.map(v=>String(v||'空')));
   for(let layer=1;layer<=4;layer++)assert.ok(html.includes(layer+'だんめ'));
   assert.ok(html.includes('入口のマス: ('+frame.scene.entry.displayCoordinate.join(',')+')'));
   assert.ok(html.includes('順番: '+(frame.scene.tokens.join(' → ')||'まだなし')));
   assert.equal((html.match(new RegExp('<small>今</small>','g'))||[]).length,frame.scene.current?1:0);
  }
  assert.equal(JSON.stringify(source),before);
  const css=readFileSync(new URL('../components/tutorial.css',import.meta.url),'utf8');
  assert.ok(css.includes('.teaching-skewer[data-layers="4"] .teaching-layers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'));
  assert.ok(css.includes('.teaching-skewer[data-layers="4"] .teaching-grid>span{aspect-ratio:auto;min-height:18px;height:18px;font-size:14px'));
 }finally{await server.close();}
});
