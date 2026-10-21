import {test} from 'node:test';
import assert from 'node:assert/strict';
import {world} from './helpers/summoning-world.mjs';
import {chooseNativeSummonPositions as choose,cancelNativeSummonPlacement as cancel,isNativeSummonPlacementActive as busy} from '../scripts/native-token-placement.mjs';

function setup(place) {
  const w=world(),listeners=new Map();
  globalThis.document={addEventListener(name,fn){listeners.set(name,fn)},removeEventListener(name){listeners.delete(name)}};
  w.game.dnd5e={canvas:{TokenPlacement:{place}}};
  canvas.app={view:{}};
  Hooks.off=(name,fn)=>w.hooks.set(name,(w.hooks.get(name)??[]).filter(x=>x!==fn));
  return {...w,listeners,options:{scene:w.scene,origin:w.caster}};
}

test('uses the spell system native TokenPlacement with the real prototype, copies and rotation',async()=>{
  const calls=[],w=setup(async config=>{calls.push(config);return [{x:500+(calls.length-1)*100,y:400,rotation:45,prototypeToken:config.tokens[0]}]});
  const validated=[];let minimized=0,maximized=0;
  w.a.sheet={minimize:async()=>{minimized++},maximize:async()=>{maximized++}};
  const result=await choose(w.a,w.wolf,{...w.options,count:2,validate:(p,previous)=>{validated.push(previous.length);return true}});
  assert.deepEqual(result,[{x:500,y:400,rotation:45},{x:600,y:400,rotation:45}]);
  assert.equal(calls.length,2);assert.equal(calls[0].tokens[0],w.wolf.prototypeToken);assert.equal(calls[0].origin,w.caster);
  assert.deepEqual(validated,[0,1]);assert.equal(minimized,1);assert.equal(maximized,1);assert.equal(w.scene.tokens.length,1);
  assert.equal(w.listeners.size,0);assert.equal(busy(),false);
});

test('invalid placement retries through the native preview, without creating tokens or spending resources',async()=>{
  let attempts=0;const w=setup(async()=>[{x:++attempts===1?400:500,y:400}]);
  const result=await choose(w.a,w.wolf,{...w.options,validate:p=>p.x===500});
  assert.deepEqual(result,[{x:500,y:400}]);assert.equal(attempts,2);assert.match(w.events.warnings[1],/Cannot Fit/);
  assert.equal(w.scene.tokens.length,1);assert.equal(w.settings.get('skillPoints'),5);
});

test('right-clicking a later copy cancels the entire uncreated plan',async()=>{
  let attempts=0;const w=setup(async()=>++attempts===1?[{x:500,y:400}]:[]);
  assert.equal(await choose(w.a,w.wolf,{...w.options,count:2}),null);
  assert.equal(w.scene.tokens.length,1);assert.equal(busy(),false);
});

test('native failure clears the session so the next summon can be placed',async()=>{
  const w=setup(async()=>{throw Error('Native draw failed')});
  await assert.rejects(choose(w.a,w.wolf,w.options),/Native draw failed/);
  assert.equal(busy(),false);assert.equal(w.listeners.size,0);
  w.game.dnd5e.canvas.TokenPlacement.place=async()=>[{x:500,y:400}];
  assert.deepEqual(await choose(w.a,w.wolf,w.options),[{x:500,y:400}]);
});

test('Escape during native preview drawing waits for its own cancel handler and cleans up',async()=>{
  const w=setup(()=>new Promise(resolve=>setTimeout(()=>{canvas.app.view.oncontextmenu=()=>resolve([])},25)));
  const pending=choose(w.a,w.wolf,w.options);
  w.listeners.get('keydown')({key:'Escape',preventDefault(){},stopPropagation(){}});
  assert.equal(await pending,null);assert.equal(busy(),false);assert.equal(w.listeners.size,0);
});

test('only the matching owner can cancel a native session and overlapping requests cannot replace it',async()=>{
  const w=setup(()=>new Promise(resolve=>{canvas.app.view.oncontextmenu=()=>resolve([])}));
  const first=choose(w.a,w.wolf,w.options);
  assert.equal(await choose(w.a,w.wolf,w.options),null);cancel('another-actor');assert.equal(busy(),true);
  cancel(w.a.uuid);assert.equal(await first,null);assert.equal(busy(),false);
});

test('scene teardown cancels native placement and releases the preview session',async()=>{
  const w=setup(()=>new Promise(resolve=>{canvas.app.view.oncontextmenu=()=>resolve([])}));
  const pending=choose(w.a,w.wolf,w.options);await w.fire('canvasTearDown');
  assert.equal(await pending,null);assert.equal((w.hooks.get('canvasTearDown')??[]).length,0);assert.equal(busy(),false);
});

test('missing native API and stale scenes fail before drawing or spending anything',async()=>{
  const w=setup(async()=>{throw Error('Must not draw')});delete w.game.dnd5e;
  await assert.rejects(choose(w.a,w.wolf,w.options),/native summon placement is unavailable/);
  w.game.dnd5e={canvas:{TokenPlacement:{place:async()=>[]}}};canvas.scene={id:'other'};
  await assert.rejects(choose(w.a,w.wolf,w.options),/Open the summoning scene/);
  assert.equal(w.scene.tokens.length,1);assert.equal(w.settings.get('skillPoints'),5);
});
