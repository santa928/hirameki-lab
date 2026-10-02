import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
export const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const projectRequire=createRequire(`${project}/package.json`);
const ts=projectRequire('typescript'),cache=new Map();
export function loadSource(file){
  file=path.resolve(file);
  if(cache.has(file))return cache.get(file).exports;
  const mod={exports:{}};cache.set(file,mod);
  const source=fs.readFileSync(file,'utf8');
  const compiled=ts.transpileModule(source,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
  const localRequire=specifier=>{
    if(!specifier.startsWith('.')&&!specifier.startsWith('@/'))return projectRequire(specifier);
    const base=specifier.startsWith('@/')?path.join(project,specifier.slice(2)):path.resolve(path.dirname(file),specifier);
    const target=[base,`${base}.ts`,`${base}.tsx`,`${base}.js`].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
    if(!target)throw Error(`Missing ${specifier} from ${file}`);
    if(/\.(tsx?|jsx?)$/.test(target))return loadSource(target);
    return projectRequire(target);
  };
  vm.runInThisContext(`(function(require,module,exports,__filename,__dirname){${compiled}\n})`,{filename:file})(localRequire,mod,mod.exports,file,path.dirname(file));
  return mod.exports;
}
