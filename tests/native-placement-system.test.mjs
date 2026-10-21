// Exercise the unmodified system placement class, not a replacement renderer.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {world} from './helpers/summoning-world.mjs';
import {prepareAbilitySummon,createAbilitySummons} from '../scripts/ability-summons.mjs';
const system=path.resolve(process.env.DND5E_SOURCE_ROOT??'../dnd5e-reference');
const {default:TokenPlacement}=await import(pathToFileURL(path.join(system,'module/canvas/token-placement.mjs')));

function setup(options) {
  const w=world(options),listeners=new Map(),previews=[];
  globalThis.document={addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)};
  globalThis.CONST={GRID_TYPES:{SQUARE:1}};
  globalThis.PIXI={Graphics:class{constructor(){throw Error('Custom graphics must not be used')}}};
  globalThis.requestAnimationFrame=fn=>setImmediate(()=>fn(performance.now()));
  canvas.app={view:{}};canvas.stage=new EventEmitter();canvas.grid={type:1};canvas.tokens.preview={addChild:o=>o};
  w.game.dnd5e={canvas:{TokenPlacement}};
  Hooks.off=(name,fn)=>w.hooks.set(name,(w.hooks.get(name)??[]).filter(x=>x!==fn));
  class TokenDocument {
    constructor(data){Object.assign(this,data);previews.push(this);const doc=this;
      this.object={w:100*data.width,h:100*data.height,draw:async()=>{},refresh(){},destroy(){this.destroyed=true},getSnappedPosition:p=>({x:Math.round(p.x/100)*100,y:Math.round(p.y/100)*100})};
    }
    updateSource(patch){Object.assign(this,patch)}
  }
  globalThis.getDocumentClass=()=>TokenDocument;
  w.wolf.prototypeToken={width:1,height:1,parent:w.wolf,toObject(){return{width:this.width,height:this.height,sight:{enabled:false},texture:{src:'wolf.png'}}}};
  w.wolf.getTokenDocument=async overrides=>({toObject:()=>({width:1,height:1,flags:{},...overrides})});
  return {...w,listeners,previews};
}
async function ready(previous) {
  const deadline=Date.now()+2000;
  while(typeof canvas.app.view.oncontextmenu!=='function'||canvas.app.view.oncontextmenu===previous){
    if(Date.now()>deadline)throw Error('Native placement did not activate');
    await new Promise(resolve=>setImmediate(resolve));
  }
  return canvas.app.view.oncontextmenu;
}
function place(x,y){canvas.stage.emit('mousemove',{stopPropagation(){},data:{getLocalPosition:()=>({x,y})}});canvas.stage.emit('mousedown',{});}

test('real D&D5e placement collects an Ultimate plan and the GM creates independent rotated copies',async()=>{
  const w=setup({quantity:2}),pending=prepareAbilitySummon(w.a,'ultimate',{choiceId:'wolf'});
  const first=await ready();canvas.app.view.onwheel({deltaY:1,stopPropagation(){}});place(550,450);
  await ready(first);place(650,450);
  const plan=await pending;
  assert.deepEqual(plan.positions,[{x:500,y:400,rotation:5},{x:600,y:400,rotation:0}]);
  assert.equal(w.scene.tokens.length,1,'native previews do not create real tokens');
  const result=await createAbilitySummons(w.a,'ultimate',plan,w.gm);
  assert.equal(result.tokenIds.length,2);assert.equal(w.scene.tokens[1].rotation,5);assert.equal(w.scene.tokens[1].actorLink,false);
  assert.ok(w.previews.every(p=>p.object.destroyed));assert.equal(w.listeners.size,0);assert.equal(canvas.stage.listenerCount('mousedown'),0);
});

test('real native right-click after one copy cancels the Ultimate plan and leaves resources untouched',async()=>{
  const w=setup({quantity:2}),pending=prepareAbilitySummon(w.a,'ultimate',{choiceId:'wolf'});
  const first=await ready();place(550,450);await ready(first);await canvas.app.view.oncontextmenu({});
  assert.equal(await pending,false);assert.equal(w.scene.tokens.length,1);assert.equal(w.a.flags.ultimate.current,100);assert.equal(w.settings.get('skillPoints'),5);
  assert.ok(w.previews.every(p=>p.object.destroyed));
});

test('an occupied native placement retries in the real system preview and Escape cancels without a stale lock',async()=>{
  const w=setup(),pending=prepareAbilitySummon(w.a,'skill',{choiceId:'wolf'});
  const first=await ready();place(450,450);await ready(first);
  assert.ok(w.events.warnings.some(m=>m.startsWith('Cannot Fit')));
  w.listeners.get('keydown')({key:'Escape',preventDefault(){},stopPropagation(){}});
  assert.equal(await pending,false);assert.equal(w.scene.tokens.length,1);assert.equal(w.listeners.size,0);
  const next=prepareAbilitySummon(w.a,'skill',{choiceId:'wolf'});await ready();place(550,450);assert.ok((await next).positions.length);
});
