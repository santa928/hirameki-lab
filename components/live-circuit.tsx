'use client';
import React from 'react';
import {circuitValue} from '@/lib/engine/logic';
function CircuitNode({tree,bits}:{tree:any;bits:number[]}){
 const output=circuitValue(tree,bits),state=output?'ON・通る':'OFF・止まる';
 if(typeof tree==='number')return <span className="circuit-input" data-input-index={tree} data-input-value={output} aria-label={String.fromCharCode(65+tree)+' '+state}>{String.fromCharCode(65+tree)}<small>{state}</small></span>;
 return <div className="circuit-branch"><div><CircuitNode tree={tree.left} bits={bits}/><CircuitNode tree={tree.right} bits={bits}/></div><span className="circuit-wire" aria-hidden="true">→</span><span className="circuit-gate" data-gate-output={output} aria-label={tree.op+' '+state}>{tree.op==='AND'?'両方':tree.op==='OR'?'どちらか':'片方だけ'}<small>{tree.op}</small><b>{state}</b></span></div>;
}
export function LiveCircuit({tree,bits,required}:{tree:any;bits:number[];required:number}){
 const output=circuitValue(tree,bits),count=bits.reduce((sum,v)=>sum+v,0);
 return <div className="scene scene-circuit" data-circuit-output={output}><div role="group" aria-label="現在の入力から各ゲートの出口をたどる回路"><CircuitNode tree={tree} bits={bits}/></div><div role="status" aria-live="polite"><strong>出口：{output?'ON・通る':'OFF・止まる'}</strong><p>ONは {count} / {required}こ。{count!==required?'指定のON数に合わせよう。':output?'指定の数で出口へ通っているよ。':'ONの数は合っているよ。止まるゲートを見よう。'}</p></div><small>「両方」＝2つともON　「どちらか」＝1つ以上ON<br/>「片方だけ」＝ちょうど1つON</small></div>;
}
