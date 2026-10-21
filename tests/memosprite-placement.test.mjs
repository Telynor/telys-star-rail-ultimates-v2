import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {world} from './helpers/summoning-world.mjs';
import * as rules from '../scripts/ability-summons.mjs';
const addon=path.resolve(process.env.MEMOSPRITES_SOURCE_ROOT??'../memosprites-summoning');
const {adjacentPlacements,validateAdjacentPlacement}=await import(pathToFileURL(path.join(addon,'scripts/summon-placement.mjs')));
function setup(){const w=world();w.game.modules.get=()=>({api:{summoning:rules}});return w;}
test('a large memosprite cannot bisect a light-only wall even when its anchor square is clear',()=>{
  const w=setup();w.scene.walls.push({c:[650,0,650,1000],light:1,move:0});
  const legal=adjacentPlacements(w.scene,w.caster,{width:4,height:4});assert.ok(legal.length);assert.ok(legal.every(p=>p.x+400<=650));assert.throws(()=>validateAdjacentPlacement(w.scene,w.caster,{width:4,height:4},{x:500,y:400}),/Cannot Fit/);
});
test('adjacent placement includes the full-sized anchors to the left and above the caster',()=>{
  const w=setup(),legal=adjacentPlacements(w.scene,w.caster,{width:4,height:4});assert.ok(legal.some(p=>p.x===0&&p.y===400));assert.ok(legal.some(p=>p.x===400&&p.y===0));assert.ok(legal.every(p=>p.x>=0&&p.y>=0&&p.x+400<=1000&&p.y+400<=1000));
});
test('short walls entirely inside the summon footprint are blocked without relying on corner rays',()=>{
  const w=setup();w.scene.walls.push({c:[620,420,620,450],light:1});assert.throws(()=>validateAdjacentPlacement(w.scene,w.caster,{width:4,height:4},{x:500,y:400}),/Cannot Fit/);
});
test('occupied cells and closed doors block the full footprint while open doors permit it',()=>{
  const w=setup();w.scene.tokens.push({id:'obstacle',x:700,y:500,width:1,height:1});assert.throws(()=>validateAdjacentPlacement(w.scene,w.caster,{width:4,height:4},{x:500,y:400}),/Cannot Fit/);w.scene.tokens.pop();
  const door={c:[650,0,650,1000],light:1,door:1,ds:0};w.scene.walls.push(door);assert.throws(()=>validateAdjacentPlacement(w.scene,w.caster,{width:4,height:4},{x:500,y:400}),/Cannot Fit/);door.ds=1;assert.doesNotThrow(()=>validateAdjacentPlacement(w.scene,w.caster,{width:4,height:4},{x:500,y:400}));
});
test('authoritative validation rejects a changed footprint or wall after the picker has opened',()=>{
  const w=setup();const position={x:500,y:400};validateAdjacentPlacement(w.scene,w.caster,{width:1,height:1},position);w.scene.walls.push({c:[650,0,650,1000],light:1});assert.throws(()=>validateAdjacentPlacement(w.scene,w.caster,{width:4,height:4},position),/Cannot Fit/);
});
