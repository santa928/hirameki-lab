import React from 'react';
import type {Puzzle} from '../lib/engine/shared.ts';
import {operationGuide} from '../lib/operation-guide.ts';

/** Keep first-use instructions visible beside the board; no extra interaction needed. */
export function OperationGuide({p}:{p:Pick<Puzzle,'id'|'data'>}){
 const guide=operationGuide(p);if(!guide)return null;
 const completion=guide.completion;
 return <aside className="operation-guide" aria-label={guide.title}>
  <p className="operation-guide-title"><strong>{guide.title}</strong></p>
  <ul className="operation-guide-steps">{guide.instructions.map((instruction,i)=><li key={i}>{instruction}</li>)}</ul>
  <p className="operation-guide-goal"><strong>ゴール：</strong>{guide.goal}</p>
  {completion&&<table className="operation-guide-goal-grid">
   <caption>完成する並び</caption>
   <tbody>{Array.from({length:Math.ceil(completion.cells.length/completion.columns)},(_,row)=><tr key={row}>{completion.cells.slice(row*completion.columns,(row+1)*completion.columns).map((value,column)=><td key={column}>{value}</td>)}</tr>)}</tbody>
  </table>}
 </aside>;
}
