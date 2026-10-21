import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {world} from './helpers/summoning-world.mjs';
import {chooseNativeSummonPositions,isNativeSummonPlacementActive} from '../scripts/native-token-placement.mjs';
const system=path.resolve(process.env.DND5E_V6_SOURCE_ROOT??'../dnd5e-v6-reference');
const {default:NativePlacement}=await import(pathToFileURL(path.join(system,'module/canvas/token-placement.mjs')));
function setup(){
  const w=world(),listeners=new Map();
  globalThis.document={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
  globalThis.PIXI={Graphics:class{constructor(){throw Error('Do not draw custom placement graphics');}}};
  canvas.app={view:{}};canvas.level={id:'ground',elevation:{base:0}};w.scene.getSurfaces=()=>[];
  w.wolf.prototypeToken={parent:w.wolf,toObject:()=>({width:1,height:1})};
  w.game.dnd5e={canvas:{TokenPlacement:NativePlacement}};Hooks.off=()=>{};
  return {...w,listeners};
}
test('actual D&D5e 6 TokenPlacement uses the v14 native token layer without creating documents',async()=>{
  const w=setup();let calls=0;
  canvas.tokens.placeTokens=async(data,options)=>{
    calls++;assert.equal(options.create,false);assert.equal(data[0].actorId,'wolf');assert.equal(data[0].level,'ground');
    const document={x:500,y:400,elevation:0,level:canvas.level,rotation:45,_source:{elevation:0}};
    options.onChange({document,preview:{}});options.preConfirm({document,index:0});return [];
  };
  const positions=await chooseNativeSummonPositions(w.a,w.wolf,{scene:w.scene,origin:w.caster});
  assert.deepEqual(positions,[{x:500,y:400,rotation:45}]);assert.equal(calls,1);assert.equal(w.scene.tokens.length,1);assert.equal(w.listeners.size,0);
});
test('Escape cancels actual D&D5e 6 TokenPlacement through v14 without a legacy view handler or stale session',async()=>{
  const w=setup();let cancelled=0;
  canvas.tokens.placeTokens=()=>new Promise(resolve=>{canvas.tokens._placementContext={};canvas.tokens._cancelPlacement=()=>{cancelled++;canvas.tokens._placementContext=null;resolve([]);};});
  const work=chooseNativeSummonPositions(w.a,w.wolf,{scene:w.scene,origin:w.caster});
  for(let i=0;i<8&&!canvas.tokens._placementContext;i++)await new Promise(setImmediate);
  assert.equal(canvas.app.view.oncontextmenu,undefined);
  w.listeners.get('keydown')({key:'Escape',preventDefault(){},stopPropagation(){}});
  assert.equal(await work,null);assert.equal(cancelled,1);assert.equal(isNativeSummonPlacementActive(),false);assert.equal(w.listeners.size,0);assert.equal(w.scene.tokens.length,1);
});
