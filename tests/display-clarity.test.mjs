import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import {project,projectRequire,loadSource} from './helpers/tsx-source.mjs';
import {generateStage} from '../lib/stages.ts';
const React=projectRequire('react'),{renderToStaticMarkup}=projectRequire('react-dom/server');
const {PuzzleView}=loadSource(project+'/components/puzzle-view.tsx');
const {SceneView,Wire3D}=loadSource(project+'/components/scene.tsx');
const render=(p)=>renderToStaticMarkup(React.createElement(PuzzleView,{p,onAnswer:()=>{}}));
const scene=(s)=>renderToStaticMarkup(React.createElement(SceneView,{s}));
const css=fs.readFileSync(project+'/app/globals.css','utf8').replace(/\/\*[\s\S]*?\*\//g,'');
const rule=(selector)=>[...css.matchAll(/([^{}]+)\{([^}]+)\}/g)].filter(m=>m[1].trim()===selector).map(m=>m[2]).join(';');
const options=(html)=>[...html.matchAll(/<button\b[^>]*class="extended-option[^>]*>[\s\S]*?<\/button>/g)].map(m=>m[0]);
test('mirror axis represents horizontal reflection without a tilted axis',()=>{
 assert.doesNotMatch(rule('.mirror-axis'),/rotate\([^0]/);
});
test('scale candidates share one complete viewBox without changing source cells',()=>{
 for(const stage of [40,80]){
  const p=generateStage('scale',stage,0),before=JSON.stringify(p),cards=options(render(p));
  assert.equal(cards.length,p.options.length);const extents=[];
  cards.forEach((html,i)=>{const box=html.match(/viewBox="([^\"]+)"/)[1].split(' ').map(Number);extents.push(box[2]);
   for(const [x,y] of p.options[i].cells){assert.ok(x+1<=box[0]+box[2],stage+' cell x outside');assert.ok(y+1<=box[1]+box[3],stage+' cell y outside');}
  });assert.equal(new Set(extents).size,1);assert.equal(JSON.stringify(p),before);
 }
});
test('camera arrows point inward in horizontal glyph layout',()=>{
 const html=scene({type:'viewpoint',n:2,positions:[[0,0],[1,1]],heights:[1,2]});
 for(const text of ['A ↓','D →','← B','↑ C'])assert.ok(html.includes(text));
 assert.doesNotMatch(rule('.camera.east')+rule('.camera.west'),/writing-mode:vertical/);
});
test('all wire joint numbers render above every line',()=>{
 const points=[[0,0,0],[1,0,0],[2,0,0],[2,1,0]],before=JSON.stringify(points);
 const html=renderToStaticMarkup(React.createElement(Wire3D,{points}));
 assert.ok(html.indexOf('<text')>html.lastIndexOf('<line'));
 assert.equal((html.match(/<text /g)||[]).length,points.length-1);assert.equal(JSON.stringify(points),before);
});
test('letter answer content has matching accessible names without ordinal letters',()=>{
 for(const [id,stage] of [['circlecenter',1],['circlecenter',40],['circlecenter',80],['liar',1]]){
  const p=generateStage(id,stage,0),cards=options(render(p));assert.equal(cards.length,p.options.length);
  cards.forEach((html,i)=>{assert.ok(html.includes('aria-label="こたえ '+p.options[i]+'"'));assert.ok(!html.includes('option-letter'));});
 }
 const shape=options(render(generateStage('scale',1,0)));assert.ok(shape.every(h=>h.includes('option-letter')));
});
test('parking shows an unselected same-unit radius sample without extra candidates',()=>{
 for(const stage of [1,40,80]){const p=generateStage('coinparking',stage,0),before=JSON.stringify(p),html=render(p);
 const tag=html.match(/<circle[^>]*class="parking-size-sample"[^>]*>/);assert.ok(tag,'unselected radius sample');
 const r=Number(tag[0].match(/r="([^\"]+)"/)[1]);assert.equal(r,p.data.radius*260/p.data.n);
 const cy=Number(tag[0].match(/cy="([^\"]+)"/)[1]),box=html.match(/<svg class="geometry-art"[^>]*viewBox="([^\"]+)"/)[1].split(' ').map(Number);assert.ok(cy+r<box[3],'sample must fit within same coordinate frame');
 assert.equal((html.match(/ばんの てん/g)||[]).length,p.data.points.length);assert.equal(JSON.stringify(p),before);
 }
});
test('prose and graphic sequences have distinct layouts without changing order',()=>{
 const liar=render(generateStage('liar',50,0));assert.ok(liar.includes('scene-row-prose'));assert.ok(liar.includes('ほんとうの はなしは'));
 const pattern=render(generateStage('pattern',25,0));assert.ok(pattern.includes('scene-row-sequence'));
 const compare=render(generateStage('compare',52,0));assert.ok(compare.includes('scene-row-panels'));assert.ok(compare.includes('ひだり'));assert.ok(compare.includes('みぎ'));assert.ok(compare.includes('7このまとまり'));
 const mixed=scene({type:'row',items:[{type:'text',text:'条件'}, {type:'balls',a:3,b:11}]});assert.ok(mixed.includes('scene-row-mixed'));assert.equal((mixed.match(/class="symbol-card"/g)||[]).length,11);
 const groups=scene({type:'row',layout:'groups',items:[{type:'text',text:'ばら'},{type:'grid',n:2,values:['●','']}]});assert.ok(groups.includes('scene-row-groups'));
});
test('compare dots keep the visible count and use cell-relative geometry',()=>{
 const nodes=s=>[s,...(s.items||[]).flatMap(nodes)];
 for(const stage of [1,26,52]){const p=generateStage('compare',stage,0),before=JSON.stringify(p),expected=nodes(p.data.scene).filter(s=>s.type==='grid').reduce((n,s)=>n+s.values.filter(v=>v==='●').length,0),html=render(p);
 assert.equal((html.match(/class="diagram-dot"/g)||[]).length,expected);assert.equal(JSON.stringify(p),before);
 }assert.match(rule('.diagram-dot'),/width:[^;]*%/);assert.match(rule('.diagram-dot'),/border-radius:50%/);
});

test('row layout keeps ordered symbol attributes and every prose condition',()=>{
 const ordered=scene({type:'row',items:[{type:'symbol',shape:0,color:0,count:1},{type:'symbol',shape:1,color:1,count:2},{type:'text',text:'？'}]});
 const first=ordered.indexOf('aria-label="まる、色1、1こ"'),second=ordered.indexOf('aria-label="さんかく、色2、2こ"'),question=ordered.indexOf('>？<');
 assert.ok(first>=0&&second>first&&question>second);assert.equal((ordered.match(/class="symbol-card"/g)||[]).length,2);
 const prose=scene({type:'row',items:[{type:'text',text:'A は B より前'},{type:'text',text:'2 < 3'},{type:'text',text:'合計は 7'}]});
 for(const text of ['A は B より前','2 &lt; 3','合計は 7'])assert.ok(prose.includes(text));
});
test('scale common frame derives the whole bound and leaves the supplied scenes intact',()=>{
 const {scaleDisplayScenes}=loadSource(project+'/components/extended-puzzle.tsx');
 const given=[{type:'shape',cells:[[0,0],[1,0]],extent:4,grid:true},{type:'shape',cells:[[0,0],[1,5]],extent:4,grid:true}],before=JSON.stringify(given),display=scaleDisplayScenes(given);
 assert.deepEqual(display.map(s=>s.extent),[6,6]);assert.deepEqual(display.map(s=>s.cells),[[[0,0],[1,0]],[[0,0],[1,5]]]);assert.equal(JSON.stringify(given),before);
});
test('parking selected circles and the sample use the identical coordinate radius',()=>{
 const p=generateStage('coinparking',40,0),html=renderToStaticMarkup(React.createElement(PuzzleView,{p,onAnswer:()=>{},playbackAnswer:[0]}));
 const filled=[...html.matchAll(/<circle\b[^>]*fill="#44baa64a"[^>]*>/g)].map(m=>m[0]);
 assert.equal(filled.length,2);const radii=filled.map(tag=>Number(tag.match(/ r="([^\"]+)"/)[1]));assert.deepEqual(radii,[p.data.radius*260/p.data.n,p.data.radius*260/p.data.n]);
});
test('omitting a duplicate prompt keeps distinct supplementary conditions',()=>{
 const s={type:'row',items:[{type:'text',text:'同じ問題文'},{type:'text',text:'残す条件'}]},before=JSON.stringify(s);
 const html=renderToStaticMarkup(React.createElement(SceneView,{s,questionText:'同じ問題文'}));assert.ok(!html.includes('同じ問題文'));assert.ok(html.includes('残す条件'));assert.equal(JSON.stringify(s),before);
});

test('rendered quantity dots retain readable content for assistive technology',()=>{
 const html=scene({type:'grid',n:2,values:['●','','','●']});
 assert.equal((html.match(/class="diagram-dot" role="img" aria-label="まる"/g)||[]).length,2);
});
