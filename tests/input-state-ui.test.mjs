import assert from 'node:assert/strict';
import {test} from 'node:test';
import {project,projectRequire,loadSource} from './helpers/tsx-source.mjs';
import {generateStage} from '../lib/stages.ts';
import {check} from '../lib/puzzles.ts';
import {circuitValue} from '../lib/engine/logic.ts';
const React=projectRequire('react'),{renderToStaticMarkup}=projectRequire('react-dom/server');
const {PuzzleView}=loadSource(project+'/components/puzzle-view.tsx'),{ExtendedPuzzleView,TouchBoard}=loadSource(project+'/components/extended-puzzle.tsx');
function harness(Component,props){const slots=[];let at=0;const internals=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;const dispatcher={useState(init){const i=at++;if(!(i in slots))slots[i]=typeof init==='function'?init():init;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];},useRef(init){const i=at++;if(!(i in slots))slots[i]={current:init};return slots[i];},useEffect(){at++;}};return{render(){at=0;const prev=internals.H;internals.H=dispatcher;try{return Component(props);}finally{internals.H=prev;}}};}
function all(node){return !node||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(all)];}
const html=node=>renderToStaticMarkup(node);
const find=(tree,fn)=>all(tree).find(fn);
const renderState=(p,a)=>html(React.createElement(PuzzleView,{p,playbackAnswer:a,onAnswer:()=>{}}));
test('empty and partial arrangement submit is local incomplete guidance, then full wrong order is submitted',()=>{
 for(const id of ['numberpath','digitorder','order','schedule']){const p=generateStage(id,1,0),calls=[],h=harness(ExtendedPuzzleView,{p,onAnswer:a=>calls.push(a)});let tree=h.render();find(tree,n=>n.props?.className==='done-action').props.onClick();assert.equal(calls.length,0,id+' empty must not be wrong');assert.match(html(tree),/カードが そろうと、自動で/);assert.match(html(h.render()),/まだ.*カード|あと.*カード/);tree=h.render();find(tree,n=>n.type==='div'&&n.props.className==='number-cards').props.children[0].props.onClick();find(h.render(),n=>n.props?.className==='done-action').props.onClick();assert.equal(calls.length,0,id+' partial');const wrong=[...p.solution].reverse();const fullCalls=[],full=harness(ExtendedPuzzleView,{p,playbackAnswer:wrong,onAnswer:a=>fullCalls.push(a)});assert.equal(check(p,wrong),false);find(full.render(),n=>n.props?.className==='done-action').props.onClick();assert.deepEqual(fullCalls,[wrong]);}
});
test('自動正答は1回だけ認識し、次問の空欄提出も誤答にしない',()=>{
 for(const id of ['numberpath','digitorder','order','schedule']){
 const p=generateStage(id,1,0),calls=[],h=harness(ExtendedPuzzleView,{p,onAnswer:a=>calls.push(a)});
 for(const i of p.solution){const cards=find(h.render(),n=>n.type==='div'&&n.props.className==='number-cards');cards.props.children[i].props.onClick();}assert.equal(calls.length,1);find(h.render(),n=>n.props?.className==='done-action').props.onClick();assert.equal(calls.length,1);
 const next=generateStage(id,1,1),nextCalls=[],nh=harness(ExtendedPuzzleView,{p:next,onAnswer:a=>nextCalls.push(a)});find(nh.render(),n=>n.props?.className==='done-action').props.onClick();assert.equal(nextCalls.length,0);
 }
});
test('completed invalid assignments and Sudoku show local violation and position, successful state clears',()=>{
 for(const [id,stage,make] of [['zebra',33,p=>[0,0,1,1,0]],['sudoku',1,p=>p.data.initial.map(v=>v||1)]]){const p=generateStage(id,stage,0),a=make(p);assert.equal(check(p,a),false);const markup=renderState(p,a);assert.match(markup,/<strong>見直そう：/,id);assert.match(markup,id==='zebra'?/おなじ.*1|カードは/:/ふたつ|重複/);assert.match(markup,/data-feedback-target/);assert.doesNotMatch(renderState(p,p.solution),/<strong>見直そう：/);}
});
test('completed invalid garden and map give sizes or adjacent region positions',()=>{
 for(const id of ['equalparts','mapcolor']){const p=generateStage(id,1,0),a=p.data.initial.map(v=>v<0?0:v);assert.equal(check(p,a),false);const markup=renderState(p,a);assert.match(markup,/<strong>見直そう：/,id);assert.match(markup,id==='equalparts'?/マス.*同じ広さ|家/:/番.*番.*同じ色/);assert.match(markup,/data-feedback-target/);assert.doesNotMatch(renderState(p,p.solution),/<strong>見直そう：/);}
});
test('circuit current gate and exit states agree with circuitValue for all sample inputs',()=>{
 const p=generateStage('circuit',1,0);for(let mask=0;mask<2**p.data.n;mask++){const bits=Array.from({length:p.data.n},(_,i)=>mask>>i&1),markup=renderState(p,bits);assert.match(markup,new RegExp('data-circuit-output="'+circuitValue(p.data.tree,bits)+'"'));assert.match(markup,/通る|止まる/);assert.match(markup,/data-gate-output="[01]"/);}
 const xor={...p,data:{...p.data,tree:{op:'XOR',left:0,right:1},n:2,required:1,scene:{type:'circuit',tree:{op:'XOR',left:0,right:1},n:2}}};assert.match(renderState(xor,[1,1]),/data-circuit-output="0"/);assert.match(renderState(xor,[1,1]),/ON.*2.*1/);
});
test('fixed cells have content plus readonly names and mutable cells remain available',()=>{
 for(const [id,stage] of [['minestars',38],['tents',80],['binary',1],['nonogram',1],['islands',1]]){const p=generateStage(id,stage,0),markup=renderState(p,p.data.initial);assert.ok(p.data.given.some(v=>v>=0),id+' fixed sample');assert.ok(p.data.given.some(v=>v<0),id+' editable sample');p.data.given.forEach((v,i)=>{if(v<0)return;const label=Math.floor(i/p.data.n)+1+'ぎょう '+(i%p.data.n+1)+'れつ';const button=[...markup.matchAll(/<button[^>]*class="board-cell[^>]*>[\s\S]*?<\/button>/g)].map(m=>m[0]).find(t=>t.includes(label));assert.ok(button,id+'/'+i);assert.match(button,/aria-disabled="true"/);assert.match(button,/変更できない|きまっている/);assert.match(button,id==='minestars'?(v===0?new RegExp(String(p.data.counts[i])):/星/):id==='tents'?/木/:id==='binary'?/まる/:id==='islands'?(p.data.clues[i]?new RegExp(String(p.data.clues[i])):/海|空白/):/空白|まる/);});assert.match(markup,/board-cell/);}
});
test('TouchBoard fixed cell guard covers click, keyboard and drag while allowing editable cells',()=>{
 const calls=[],h=harness(TouchBoard,{n:2,values:['固定','入力','',''],readOnly:[true,false,false,false],cellLabels:['固定値','空き','',''],drag:true,onCell:i=>calls.push(i)}),tree=h.render(),buttons=all(tree).filter(n=>n.type==='button');buttons[0].props.onClick();assert.deepEqual(calls,[]);let prevented=false;buttons[0].props.onKeyDown({key:'Enter',preventDefault(){prevented=true;}});assert.equal(prevented,true);prevented=false;buttons[0].props.onKeyDown({key:' ',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.deepEqual(calls,[]);
 const ref=tree.props.ref;ref.current={getBoundingClientRect:()=>({left:0,top:0,width:200,height:200})};const event={clientX:50,clientY:50,pointerId:1,currentTarget:{setPointerCapture(){}}};tree.props.onPointerDown(event);assert.deepEqual(calls,[]);tree.props.onPointerMove({...event,clientX:150});assert.deepEqual(calls,[1]);tree.props.onPointerUp();buttons[1].props.onClick();assert.deepEqual(calls,[1]);
});

test('unfinished violations stay editing or incomplete and never announce a failed completed answer',()=>{
 const zebra=generateStage('zebra',33,0),partial=[0,0,-1,-1,-1];assert.match(renderState(zebra,partial),/<strong>編集中：/);assert.doesNotMatch(renderState(zebra,partial),/<strong>見直そう：/);
 const sudoku=generateStage('sudoku',1,0),filled=[...sudoku.data.initial];filled[sudoku.data.initial.findIndex(v=>!v)]=1;assert.match(renderState(sudoku,filled),/<strong>編集中：/);assert.match(renderState(sudoku,sudoku.data.initial),/<strong>まだ途中：/);
});
test('Sudoku edits keep automatic success and undo/reset clear full-invalid feedback',()=>{
 const p=generateStage('sudoku',1,0),props={p,onAnswer:a=>calls.push(a)},calls=[],element=PuzzleView(props),h=harness(element.type,element.props),blanks=p.data.initial.flatMap((v,i)=>v?[]:[i]);
 const clickValue=(at,value)=>{let tree=h.render();all(tree).find(n=>n.type==='button'&&n.props['aria-label']?.startsWith('マス '+(at+1)+' ')).props.onClick();tree=h.render();const keypad=find(tree,n=>n.props?.className==='sudoku-keypad');keypad.props.children[0][value-1].props.onClick();};
 for(const at of blanks)clickValue(at,1);assert.equal(calls.length,0);assert.match(html(h.render()),/<strong>見直そう：/);let actions=find(h.render(),n=>n.props?.className==='board-actions');actions.props.children[0].props.onClick();assert.doesNotMatch(html(h.render()),/<strong>見直そう：/);actions=find(h.render(),n=>n.props?.className==='board-actions');actions.props.children[1].props.onClick();assert.match(html(h.render()),/<strong>まだ途中：/);
 for(const at of blanks)clickValue(at,p.solution[at]);assert.equal(calls.length,1);assert.deepEqual(calls[0],p.solution);assert.doesNotMatch(html(h.render()),/<strong>見直そう：/);
});

test('each current circuit gate follows the same truth function on mixed stages',()=>{
 const gates=(tree,bits)=>typeof tree==='number'?[]:[...gates(tree.left,bits),...gates(tree.right,bits),circuitValue(tree,bits)];
 for(const stage of [1,25,49]){const p=generateStage('circuit',stage,0);for(const mask of [0,1,3,2**p.data.n-1]){const bits=Array.from({length:p.data.n},(_,i)=>mask>>i&1),markup=renderState(p,bits),display=[...markup.matchAll(/data-gate-output="([01])"/g)].map(m=>Number(m[1]));assert.deepEqual(display,gates(p.data.tree,bits),stage+'/'+mask);}}
});

test('automatic assignment and painting keep invalid edits local, undo/reset, and successful recognition',()=>{
 for(const [id,stage] of [['zebra',33],['equalparts',1],['mapcolor',1]]){
  const p=generateStage(id,stage,0),before=JSON.stringify(p),calls=[],h=harness(ExtendedPuzzleView,{p,onAnswer:a=>calls.push(a)});
  const choose=(index,value)=>{let tree=h.render();if(id==='zebra'){const rows=find(tree,n=>n.props?.className==='assignment-rows'),button=rows.props.children[index].props.children[1][value];assert.ok(!button.props.disabled);button.props.onClick();}else{find(tree,n=>n.props?.className==='paint-palette').props.children[value].props.onClick();tree=h.render();const board=find(tree,n=>n.type===TouchBoard),at=id==='mapcolor'?p.data.regions.findIndex(v=>v===index):index;board.props.onCell(at);}};
  const editable=p.data.initial.flatMap((v,i)=>v<0?[i]:[]),bad=id==='zebra'?[0,0,1,1,0]:p.data.initial.map(v=>v<0?0:v);
  for(const i of editable)choose(i,bad[i]);assert.equal(calls.length,0,id+' invalid stays local');assert.match(html(h.render()),/<strong>見直そう：/);
  let actions=find(h.render(),n=>n.props?.className==='extended-actions');actions.props.children[0].props.onClick();assert.doesNotMatch(html(h.render()),/<strong>見直そう：/);actions=find(h.render(),n=>n.props?.className==='extended-actions');actions.props.children[1].props.onClick();assert.doesNotMatch(html(h.render()),/<strong>見直そう：/);
  for(const i of editable)choose(i,p.solution[i]);assert.equal(calls.length,1,id+' automatic success');assert.equal(check(p,calls[0]),true);assert.doesNotMatch(html(h.render()),/<strong>見直そう：/);assert.equal(JSON.stringify(p),before);
 }
});

test('local editing targets describe their own notice without colliding with global answer feedback',()=>{
 const p=generateStage('zebra',33,0),markup=renderState(p,[0,0,1,1,0]);assert.match(markup,/id="editing-feedback"/);assert.match(markup,/aria-describedby="editing-feedback"/);assert.doesNotMatch(markup,/id="answer-feedback"/);
});


test('stroke rejected nonadjacent touch gives local guidance without submission/history, and valid edit clears it',()=>{
 const p=generateStage('stroke',1,0),calls=[],edits=[],element=PuzzleView({p,onAnswer:a=>calls.push(a),onEdit:()=>edits.push(1)}),h=harness(element.type,element.props),before=JSON.stringify(p);
 const cell=i=>find(h.render(),n=>n.type==='button'&&n.props['aria-label']==='マス '+(i+1)),actions=()=>find(h.render(),n=>n.props?.className==='board-actions'),line=()=>find(h.render(),n=>n.type==='polyline')?.props.points;
 const initialLine=line();cell(7).props.onClick();const notice=find(h.render(),n=>n.props?.className==='puzzle-notice');assert.ok(notice,'reject notice is visible');assert.equal(notice.props.role,'status');assert.match(html(notice),/上下左右.*隣.*直前/);assert.equal(line(),initialLine);assert.equal(actions().props.children[0].props.disabled,true);assert.equal(calls.length,0);assert.equal(edits.length,1);
 cell(2).props.onClick();assert.doesNotMatch(html(find(h.render(),n=>n.props?.className==='puzzle-notice')),/上下左右/);cell(7).props.onClick();assert.match(html(find(h.render(),n=>n.props?.className==='puzzle-notice')),/上下左右/);actions().props.children[0].props.onClick();assert.doesNotMatch(html(find(h.render(),n=>n.props?.className==='puzzle-notice')),/上下左右/);cell(7).props.onClick();actions().props.children[1].props.onClick();assert.doesNotMatch(html(find(h.render(),n=>n.props?.className==='puzzle-notice')),/上下左右/);
 for(const i of p.solution.slice(1))cell(i).props.onClick();assert.deepEqual(calls,[p.solution]);assert.equal(JSON.stringify(p),before);
});
test('stroke rejection keeps locked/demo boundaries and does not add guidance to other paths',()=>{
 for(const flags of [{locked:true},{demo:true}]){const p=generateStage('stroke',1,0),calls=[],edits=[],el=PuzzleView({p,...flags,onAnswer:a=>calls.push(a),onEdit:()=>edits.push(1)}),h=harness(el.type,el.props);find(h.render(),n=>n.type==='button'&&n.props['aria-label']==='マス 8').props.onClick();assert.equal(calls.length,0);assert.equal(edits.length,0);assert.doesNotMatch(html(find(h.render(),n=>n.props?.className==='puzzle-notice')),/上下左右/);}
 const p=generateStage('maze',1,0),el=PuzzleView({p,onAnswer:()=>{}}),h=harness(el.type,el.props);assert.doesNotMatch(html(h.render()),/class="puzzle-notice"/);
});


test('stroke normal drag over the current endpoint stays quiet while older visited points explain backtracking',()=>{
 const p=generateStage('stroke',1,0),calls=[],el=PuzzleView({p,onAnswer:a=>calls.push(a)}),h=harness(el.type,el.props),cell=i=>find(h.render(),n=>n.type==='button'&&n.props['aria-label']==='マス '+(i+1)),notice=()=>html(find(h.render(),n=>n.props?.className==='puzzle-notice'));
 cell(1).props.onClick();assert.doesNotMatch(notice(),/もう通った/);cell(2).props.onClick();cell(2).props.onClick();assert.doesNotMatch(notice(),/もう通った/);cell(5).props.onClick();cell(1).props.onClick();assert.match(notice(),/もう通った.*直前/);cell(2).props.onClick();assert.doesNotMatch(notice(),/もう通った/);assert.equal(calls.length,0);
});

test('数カードの選択状態は切替・Undo・reset・お手本でも支援技術へ伝わる',()=>{
 for(const id of ['sum','factors','numberpath']){
  const p=generateStage(id,1,0),calls=[],h=harness(ExtendedPuzzleView,{p,onAnswer:a=>calls.push(a)});
  const cards=()=>find(h.render(),n=>n.props?.className==='number-cards').props.children;
  const states=()=>cards().map(n=>n.props['aria-pressed']);
  const empty=p.data.values.map(()=>false);
  assert.deepEqual(states(),empty,id+' 初期');
  cards()[0].props.onClick();assert.equal(states()[0],true,id+' 選択');
  cards()[0].props.onClick();assert.deepEqual(states(),empty,id+' 解除');
  find(h.render(),n=>n.props?.className==='extended-actions').props.children[0].props.onClick();
  assert.equal(states()[0],true,id+' Undo');
  find(h.render(),n=>n.props?.className==='extended-actions').props.children[1].props.onClick();
  assert.deepEqual(states(),empty,id+' reset');assert.equal(calls.length,0);
  for(const flags of [{demo:true},{locked:true}]){
   const frozen=harness(ExtendedPuzzleView,{p,...flags,playbackAnswer:[0],onAnswer:a=>calls.push(a)});
   const tree=frozen.render(),buttons=find(tree,n=>n.props?.className==='number-cards').props.children;
   assert.equal(find(tree,n=>n.type==='fieldset').props.disabled,true);
   assert.deepEqual(buttons.map(n=>n.props['aria-pressed']),empty.map((_,i)=>i===0));
   buttons[1].props.onClick();
   assert.deepEqual(find(frozen.render(),n=>n.props?.className==='number-cards').props.children.map(n=>n.props['aria-pressed']),empty.map((_,i)=>i===0));
  }
 }
});

test('数値選択肢の名前は表示された値と記号を含む',()=>{
 const base=generateStage('count',1,0),samples=[...[1,27,54].map(stage=>generateStage('count',stage,0)),{...base,options:[0,'0',{type:'text',text:'0',sub:'こ'},'みぎ']}];
 for(const p of samples){
  const markup=renderState(p,undefined);
  const buttons=[...markup.matchAll(/<button\b([^>]*class="extended-option[^\"]*"[^>]*)>([\s\S]*?)<\/button>/g)];
  assert.equal(buttons.length,p.options.length);
  buttons.forEach(([,attributes,content],i)=>{
   const name=attributes.match(/aria-label="([^"]*)"/)?.[1]??content.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
   const option=p.options[i],value=option?.type==='text'?option.text:String(option);
   assert.ok(name.includes(value),`${i}: 表示値を含む名前 ${name}`);
   if(option?.type==='text'&&option.sub)assert.ok(name.includes(option.sub));
   assert.ok(name.includes(String.fromCharCode(65+i)),`${i}: 記号を含む名前 ${name}`);
  });
 }
});

test('図形選択肢と文字識別子の既存ラベルを維持する',()=>{
 const base=generateStage('count',1,0),p={...base,options:base.options.map((_,i)=>({type:'shape',cells:[[0,0],[i+1,0]],extent:5}))},markup=renderState(p,undefined);
 p.options.forEach((_,i)=>assert.ok(markup.includes(`aria-label="こたえ ${i+1}"`)));
 const letters={...base,options:['A','B','C','D']},letterMarkup=renderState(letters,undefined);
 letters.options.forEach(value=>assert.ok(letterMarkup.includes(`aria-label="こたえ ${value}"`)));
});

test('盤面のぬる・メモモードは実際の選択状態を支援技術へ伝える',()=>{
 for(const id of ['nonogram','minestars','tents','islands']){
  const p=generateStage(id,1,0),calls=[],h=harness(ExtendedPuzzleView,{p,onAnswer:a=>calls.push(a)});
  const tools=()=>all(h.render()).filter(n=>n.type==='button'&&['ぬる','× メモ'].includes(n.props.children));
  const states=()=>tools().map(n=>n.props['aria-pressed']);
  assert.deepEqual(states(),[true,false],id+' 初期');
  tools()[1].props.onClick();assert.deepEqual(states(),[false,true],id+' メモ');
  tools()[0].props.onClick();assert.deepEqual(states(),[true,false],id+' ぬる');
  tools()[1].props.onClick();
  find(h.render(),n=>n.props?.className==='extended-actions').props.children[1].props.onClick();
  assert.deepEqual(states(),[false,true],id+' reset後も現在のモード');
  assert.deepEqual(tools().map(n=>n.props.className==='selected'),states(),id+' 視覚表示と一致');
  assert.equal(calls.length,0,id+' モード切替は提出しない');
  for(const flags of [{demo:true},{locked:true}]){
   const tree=harness(ExtendedPuzzleView,{p,...flags,onAnswer:()=>{}}).render();
   assert.equal(find(tree,n=>n.type==='fieldset').props.disabled,true);
   assert.deepEqual(all(tree).filter(n=>n.type==='button'&&['ぬる','× メモ'].includes(n.props.children)).map(n=>n.props['aria-pressed']),[true,false]);
  }
 }
 const binary=harness(ExtendedPuzzleView,{p:generateStage('binary',1,0),onAnswer:()=>{}}).render();
 assert.equal(all(binary).filter(n=>n.type==='button'&&['ぬる','× メモ'].includes(n.props.children)).length,0);
});

test('ペアの道の先端は選択・移動・戻る・Undo・resetに追随する',()=>{
 const base=generateStage('pairroutes',1,0),p={...base,data:{...base.data,n:3,pairs:[[6,2],[1,4]],initial:[[6],[1]]},solution:[[6,7,8,5,2],[1,0,3,4]]},calls=[];
 assert.equal(check(p,p.solution),true);
 const h=harness(ExtendedPuzzleView,{p,onAnswer:a=>calls.push(a)}),board=()=>find(h.render(),n=>n.type===TouchBoard),palette=()=>find(h.render(),n=>n.props?.className==='paint-palette').props.children;
 const tip=(at,label)=>{const b=board();assert.equal(b.props.cellLabels?.[at],label);assert.deepEqual(b.props.classes?.flatMap((v,i)=>v==='pair-path-tip'?[i]:[]),[at]);};
 tip(6,'1ばんの みちの さき');assert.deepEqual(palette().map(n=>n.props['aria-pressed']),[true,false]);
 board().props.onCell(2);board().props.onCell(5);tip(6,'1ばんの みちの さき');assert.equal(calls.length,0);
 board().props.onCell(7);tip(7,'1ばんの みちの さき');
 board().props.onCell(6);tip(6,'1ばんの みちの さき');
 board().props.onCell(7);find(h.render(),n=>n.props?.className==='extended-actions').props.children[0].props.onClick();tip(6,'1ばんの みちの さき');
 palette()[1].props.onClick();tip(1,'2ばんの みちの さき');assert.deepEqual(palette().map(n=>n.props['aria-pressed']),[false,true]);
 board().props.onCell(0);tip(0,'2ばんの みちの さき');
 find(h.render(),n=>n.props?.className==='extended-actions').props.children[1].props.onClick();tip(1,'2ばんの みちの さき');
 palette()[0].props.onClick();for(const at of [7,8,5,2])board().props.onCell(at);assert.equal(calls.length,0);
 palette()[1].props.onClick();for(const at of [0,3,4])board().props.onCell(at);
 assert.deepEqual(calls,[p.solution]);tip(4,'2ばんの みちの さき');
});

test('ペアの操作用先端は再生・previewへ重ねず、lockedの現在状態は維持する',()=>{
 const p=generateStage('pairroutes',1,0);
 for(const flags of [{demo:true},{locked:true,playbackAnswer:p.solution}]){
  const tree=harness(ExtendedPuzzleView,{p,...flags,onAnswer:()=>{}}).render(),b=find(tree,n=>n.type===TouchBoard);
  assert.equal(find(tree,n=>n.type==='fieldset').props.disabled,true);
  assert.ok(!b.props.classes?.includes('pair-path-tip'));
  assert.ok(!b.props.cellLabels?.some(Boolean));
 }
 const tree=harness(ExtendedPuzzleView,{p,locked:true,onAnswer:()=>{}}).render(),b=find(tree,n=>n.type===TouchBoard);
 assert.equal(find(tree,n=>n.type==='fieldset').props.disabled,true);
 assert.equal(b.props.cellLabels?.[p.data.pairs[0][0]],'1ばんの みちの さき');
});
