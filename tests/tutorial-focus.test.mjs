import assert from 'node:assert/strict';import {test} from 'node:test';import {makeTutorial} from '../lib/tutorial.ts';
test('お手本各手に対象と結果を追う焦点がある',()=>{for(const id of ['count','clock','pairroutes','codebreak','flood','trainyard','numberpath']){const {frames}=makeTutorial(id);for(const f of frames){assert.ok(f.focus?.selectors.length,id);assert.equal(typeof f.caption,'string');}}});
test('選択型の最終手は全候補の下でなく答えを単独表示する',()=>{for(const id of ['count','clock']){const {frames}=makeTutorial(id);assert.equal(frames.at(-1).focus.resultOnly,true,id);}});
test('元の図形選択の結果は内部indexでなく選んだ図形を表示する',async()=>{const api=await import('../lib/tutorial.ts'),{generate}=await import('../lib/puzzles.ts');assert.equal(typeof api.tutorialResultScene,'function');for(const id of ['shadow','top','rotate3d']){const p=generate(id,1,913),scene=api.tutorialResultScene(p,p.solution);assert.equal(scene.type,p.data.optionType);assert.deepEqual(scene.cells,p.options[p.solution]);}});

test('選択型の導入は全候補の積み上げでなく元の図を焦点にする',()=>{for(const id of ['cubes','shadow','top','rotate3d','slice','count','clock']){const {frames}=makeTutorial(id);assert.equal(frames[0].focus.selectors[0],'.problem-surface',id);assert.ok(frames[0].focus.selectors.includes('.scene'),id);}});

test('途中の点配置・抜く立体・試行型は意味のある盤面を焦点にする',()=>{
 const cases={inside:'.geometry-art',separator:'.geometry-art',hull:'.geometry-art',coinparking:'.geometry-art',triangulate:'.geometry-art',parallel:'.symbol-options',extract3d:'.voxel-pieces',sokoban:'.diagram-grid',river:'.river-banks',jugs:'.jugs'};
 for(const [id,selector] of Object.entries(cases)){const {frames}=makeTutorial(id);for(const frame of frames)assert.equal(frame.focus.selectors[0],selector,id);}
});

test('辺・回路・プログラム・計量の途中結果に実対象の焦点を持つ',()=>{
 const cases={bridges:'.edge-board',mintree:'.edge-board',circuit:'.scene-circuit',programbot:'.diagram-grid',bridge:'.river-banks',matchsticks:'.match-equation'};
 for(const [id,selector] of Object.entries(cases)){for(const frame of makeTutorial(id).frames)assert.equal(frame.focus.selectors[0],selector,id);}
 const frames=makeTutorial('ballweigh').frames;assert.equal(frames[0].focus.selectors[0],'.ball-rack');assert.equal(frames.at(-1).focus.selectors[0],'.weigh-history>div:last-child');
});

test('教程viewport補正は必要最小のdialogスクロールと図領域上限を計算する',async()=>{
 const api=await import('../lib/tutorial.ts');assert.equal(typeof api.tutorialViewportFit,'function');
 const viewport={top:20,bottom:820};
 assert.deepEqual(api.tutorialViewportFit({top:100,bottom:700},viewport,330),{surfaceHeight:330,scrollDelta:0});
 assert.deepEqual(api.tutorialViewportFit({top:300,bottom:870},viewport,330),{surfaceHeight:330,scrollDelta:50});
 assert.deepEqual(api.tutorialViewportFit({top:10,bottom:580},viewport,330),{surfaceHeight:330,scrollDelta:-10});
 assert.deepEqual(api.tutorialViewportFit({top:100,bottom:1000},viewport,330),{surfaceHeight:230,scrollDelta:80});
});

test('focus可視判定は古いattributeでなくsurfaceと実viewport両方の境界を確認する',async()=>{
 const api=await import('../lib/tutorial.ts');assert.equal(typeof api.tutorialFocusVisible,'function');
 const viewport={top:0,bottom:844,left:0,right:390},surface={top:128,bottom:458,left:50,right:340};
 assert.equal(api.tutorialFocusVisible({top:371,bottom:461,left:58,right:332},surface,viewport),false);
 assert.equal(api.tutorialFocusVisible({top:136,bottom:489,left:58,right:332},surface,viewport),false);
 assert.equal(api.tutorialFocusVisible({top:402,bottom:440,left:58,right:332},surface,viewport),true);
 assert.equal(api.tutorialFocusVisible({top:368,bottom:422,left:58,right:674},{top:344,bottom:463,left:50,right:682},viewport),false);
 for(const frame of makeTutorial('domino').frames)assert.equal(frame.focus.selectors[0],'.domino-chain');
});
