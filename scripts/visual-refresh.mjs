// Only presentation work enters this queue; rules and document writes remain immediate.
export function createVisualRefreshQueue({schedule,cancel,delay=()=>50,now=()=>globalThis.performance?.now?.()??Date.now(),onError=()=>{}}){
 const pending=new Map();let timer=null,flushing=false;
 let stats={requests:0,flushes:0,executions:0,lastMs:0,peakMs:0};
 const arm=()=>{if(timer===null&&!flushing&&pending.size)timer=schedule(flush,Math.max(16,Math.min(250,Number(delay())||50)));};
 function flush(){
  if(flushing)return;if(timer!==null)cancel(timer);timer=null;if(!pending.size)return;
  const work=[...pending.values()];pending.clear();flushing=true;const start=now();stats.flushes++;
  try{for(const fn of work){stats.executions++;try{fn()?.catch?.(onError);}catch(error){onError(error);}}}
  finally{stats.lastMs=Math.max(0,now()-start);stats.peakMs=Math.max(stats.peakMs,stats.lastMs);flushing=false;arm();}
 }
 return {request(key,fn){stats.requests++;pending.set(key,fn);arm();},flush,
  clear(){if(timer!==null)cancel(timer);timer=null;pending.clear();},
  snapshot:()=>({...stats,pending:pending.size}),reset(){stats={requests:0,flushes:0,executions:0,lastMs:0,peakMs:0};}};
}
const movementFields=new Set(['x','y','elevation','rotation','lockRotation','sort']);
export function isTokenMovementOnly(changes){const keys=Object.keys(changes??{});return keys.length>0&&keys.every(key=>movementFields.has(key));}
function changedPaths(changes,prefix=''){
 return Object.entries(changes??{}).flatMap(([key,value])=>{const path=(prefix?prefix+'.':'')+key.replace(/^-=/,'');return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length?changedPaths(value,path):[path];});
}
export function touchesVisualData(changes,roots){return changedPaths(changes).some(path=>roots.some(root=>path===root||path.startsWith(root+'.')||root.startsWith(path+'.')));}
export function changesOnlyWithin(changes,roots){const paths=changedPaths(changes);return paths.length>0&&paths.every(path=>roots.some(root=>path===root||path.startsWith(root+'.')));}
const markupCache=new WeakMap();
export function replaceMarkupIfChanged(element,markup){if(markupCache.get(element)===markup)return false;element.innerHTML=markup;markupCache.set(element,markup);return true;}
