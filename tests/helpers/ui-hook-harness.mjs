import {projectRequire} from './tsx-source.mjs';
const React=projectRequire('react');
/** Exercise component callbacks and state without browser automation. Effects remain off. */
export function hookHarness(Component,props){const slots=[];let at=0;const internals=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;const dispatcher={useState(init){const i=at++;if(!(i in slots))slots[i]=typeof init==='function'?init():init;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];},useRef(init){const i=at++;if(!(i in slots))slots[i]={current:init};return slots[i];},useEffect(){at++;},useMemo(fn,deps){const i=at++;if(!(i in slots)||deps.some((v,j)=>v!==slots[i].deps[j]))slots[i]={value:fn(),deps};return slots[i].value;},useCallback(fn,deps){return this.useMemo(()=>fn,deps);}};return{render(){at=0;const prev=internals.H;internals.H=dispatcher;try{return Component(props);}finally{internals.H=prev;}}};}
export function elements(node){return !node||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(elements)];}
export const findElement=(tree,fn)=>elements(tree).find(fn);
