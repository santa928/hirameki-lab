import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {project,projectRequire,loadSource} from './helpers/tsx-source.mjs';
import {hookHarness,findElement,elements} from './helpers/ui-hook-harness.mjs';

const {renderToStaticMarkup}=projectRequire('react-dom/server');
const recordsModule=loadSource(project+'/lib/local-records.ts');
let currentStore;
recordsModule.localRecords=()=>currentStore;
// Viteが差し込む公開パスだけをテスト用に置換し、画面と保存キューは実物を使う。
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hirameki-save-ui-'));
const cssHandler=projectRequire.extensions['.css'];
projectRequire.extensions['.css']=()=>{};
let HomePage;
try{
 const source=fs.readFileSync(project+'/app/page.tsx','utf8').replace('import.meta.env.BASE_URL',JSON.stringify('/hirameki-lab/'));
 const file=path.join(temp,'page.tsx');fs.writeFileSync(file,source);HomePage=loadSource(file).default;
}finally{if(cssHandler)projectRequire.extensions['.css']=cssHandler;else delete projectRequire.extensions['.css'];fs.rmSync(temp,{recursive:true,force:true});}

const session=n=>({id:`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,profile:1,game:'cubes',mode:'stage',stage:1,level:1,correct:1,attempted:1,firstCorrect:1,hints:0,seconds:10});
const warning=tree=>findElement(tree,n=>n.props?.className==='save-warning');
const html=node=>node?renderToStaticMarkup(node):'';
const button=(tree,label)=>findElement(tree,n=>n.type==='button'&&n.props.children===label);
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function retrySettles(task){let done=false;void task.then(()=>{done=true;});await settle();assert.equal(done,true,'保存中の別記録を待たず、失敗分の再試行が完了する');}
function setup(){
 const attempts=[];
 currentStore={save(record){return new Promise((resolve,reject)=>attempts.push({record,resolve,reject}));},async progress(){return {games:{},correct:0,plays:0,stars:0,days:0};},async list(){return[];},async merge(){throw Error('この検証では読み込みを行わない');}};
 const h=hookHarness(HomePage,{});
 findElement(h.render(),n=>n.type==='article').props.onClick();
 const setupDialog=findElement(h.render(),n=>n.props?.className==='game-dialog setup-dialog ');
 const oldWindow=globalThis.window;globalThis.window={scrollTo(){}};
 try{findElement(setupDialog,n=>n.props?.className==='primary-button').props.onClick();}finally{globalThis.window=oldWindow;}
 const finish=h.render().props.onFinish;assert.equal(typeof finish,'function');
 return {h,finish,attempts};
}

test('保存が未解決の間は失敗や再試行を出さず、保存中とバックアップを示す',()=>{
 const {h,finish,attempts}=setup();finish(session(1));const tree=h.render(),notice=warning(tree);
 assert.ok(notice);assert.equal(notice.props.role,'status');assert.doesNotMatch(html(notice),/保存できませんでした/);
 assert.match(html(notice),/保存中|ほぞんちゅう|保存しています/);assert.match(html(notice),/ページを閉じない/);
 assert.equal(button(notice,'もういちど 保存'),undefined);assert.equal(button(notice,'バックアップを 書き出す').props.disabled,false);
 assert.equal(attempts.length,1);
});

test('保存失敗はエラーと再試行を示し、再試行中は中立表示へ戻り、成功で消える',async()=>{
 const {h,finish,attempts}=setup();finish(session(2));h.render();attempts[0].reject(Error('書き込み失敗'));await settle();
 let notice=warning(h.render());assert.equal(notice.props.role,'alert');assert.match(html(notice),/保存できませんでした/);
 assert.ok(button(notice,'バックアップを 書き出す'));const retry=button(notice,'もういちど 保存').props.onClick();
 notice=warning(h.render());assert.equal(notice.props.role,'status');assert.doesNotMatch(html(notice),/保存できませんでした/);assert.equal(attempts.length,2);
 attempts[1].resolve();await retry;await settle();const tree=h.render();assert.equal(warning(tree),undefined);
 const saved=findElement(tree,n=>n.props?.className==='save-state saved');assert.match(html(saved),/ほぞんしたよ/);
});

test('失敗と保存中が混在しても再試行は失敗分だけを対象とし、他の完了で失敗を隠さない',async()=>{
 const {h,finish,attempts}=setup(),a=session(3),b=session(4);finish(a);h.render();finish(b);h.render();
 attempts[0].reject(Error('A失敗'));await settle();let notice=warning(h.render());assert.equal(notice.props.role,'alert');assert.match(html(notice),/2件/);assert.match(html(notice),/保存できませんでした（1件）/);
 const retry=button(notice,'もういちど 保存').props.onClick();h.render();assert.equal(attempts.length,3);assert.equal(attempts[2].record.id,a.id);
 attempts[2].reject(Error('A再失敗'));await retrySettles(retry);h.render();attempts[1].resolve();await settle();
 notice=warning(h.render());assert.equal(notice.props.role,'alert');assert.match(html(notice),/1件/);assert.match(html(notice),/保存できませんでした/);
 const finalRetry=button(notice,'もういちど 保存').props.onClick();h.render();attempts[3].resolve();await finalRetry;await settle();assert.equal(warning(h.render()),undefined);
});

test('混在時の失敗解消後も未解決分を保護し、バックアップへ両方の記録を含める',async t=>{
 const {h,finish,attempts}=setup(),a=session(5),b=session(6);finish(a);h.render();finish(b);h.render();attempts[0].reject(Error('A失敗'));await settle();
 let blob,clicked=false;const oldDocument=globalThis.document;
 t.mock.method(URL,'createObjectURL',value=>{blob=value;return 'blob:save-status-test';});t.mock.method(URL,'revokeObjectURL',()=>{});
 globalThis.document={createElement:()=>({click(){clicked=true;}})};t.after(()=>{globalThis.document=oldDocument;});
 button(warning(h.render()),'バックアップを 書き出す').props.onClick();await settle();assert.equal(clicked,true);
 const backup=JSON.parse(await blob.text());assert.deepEqual(backup.sessions.map(row=>row.session.id).sort(),[a.id,b.id]);
 const retry=button(warning(h.render()),'もういちど 保存').props.onClick();h.render();attempts[2].resolve();await retrySettles(retry);
 const notice=warning(h.render());assert.equal(notice.props.role,'status');assert.match(html(notice),/1件/);assert.doesNotMatch(html(notice),/保存できませんでした/);
 assert.equal(button(notice,'もういちど 保存'),undefined);
 const settings=elements(h.render()).find(n=>n.props?.className==='backup-tools');assert.equal(button(settings,'バックアップを 読み込む').props.disabled,true);
 attempts[1].resolve();await settle();assert.equal(warning(h.render()),undefined);
});
