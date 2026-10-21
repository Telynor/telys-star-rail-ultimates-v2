import {test} from 'node:test';
import assert from 'node:assert/strict';
import {world,ID} from './helpers/summoning-world.mjs';
import {placementContext,canPlaceSummon,legalSummonPositions,validateSummonPlan,createAbilitySummons,validateSummonCreation} from '../scripts/ability-summons.mjs';

function v14(w,t,{surfaces=[]}={}) {
  const level={id:'ground',parent:w.scene},calls=[];
  w.scene.levels=new Map([[level.id,level]]);
  w.caster.level=level.id;
  canvas.level=level;
  w.scene.getSurfaces=({type,level:chosen})=>{
    assert.equal(type,'light');
    assert.ok(chosen===level||chosen===level.id);
    return surfaces;
  };
  const previous=globalThis.CONFIG;
  // Foundry v14 PointSourcePolygonConfig.level accepts a Level document.
  globalThis.CONFIG={Canvas:{polygonBackends:{light:{testCollision(origin,destination,config){
    assert.equal(config.level,level,'the polygon backend must receive the Level document, not its ID');
    assert.equal(config.type,'light');assert.equal(config.mode,'any');
    calls.push({origin,destination});return false;
  }}}}};
  t.after(()=>{if(previous===undefined)delete globalThis.CONFIG;else globalThis.CONFIG=previous;});
  return {level,calls};
}

for (const withWalls of [false,true]) test(`v14 permits valid Skill and native spell summons ${withWalls?'inside a mapped room':'on an open map'}`,async t=>{
  const w=world(),{calls}=v14(w,t);
  if(withWalls)w.scene.walls.push({c:[850,0,850,1000],light:1,level:'ground'});
  const checked=await validateSummonPlan(w.a,'skill',w.plan,w.player);
  assert.equal(checked.choice.id,'wolf');assert.ok(calls.length>0);
  const data={x:600,y:400,width:1,height:1,flags:{[ID]:{summonOwner:{casterId:w.a.id,casterTokenId:w.caster.id}}}};
  assert.notEqual(validateSummonCreation({parent:w.scene},data),false);
  const result=await createAbilitySummons(w.a,'skill',w.plan,w.player);
  assert.equal(result.tokenIds.length,1);assert.equal(w.scene.tokens.at(-1).x,500);
});

test('v14 also resolves a caster Level document and uses it for a scene the GM is not viewing',t=>{
  const w=world(),{level,calls}=v14(w,t);
  w.caster.level=level;canvas.scene={id:'another-map'};canvas.level={id:'another-level'};
  assert.equal(canPlaceSummon(placementContext(w.scene,w.caster),{width:1,height:1},{x:500,y:400},5),true);
  assert.ok(calls.length>0,'the GM validates the target scene, independent of their current view');
});

test('an open map admits a giant summon whose selected square is in range even when its size exceeds the zone and map',t=>{
  const w=world({size:12});v14(w,t);
  const context=placementContext(w.scene,w.caster),choice={width:12,height:12},position={x:500,y:400};
  assert.equal(canPlaceSummon(context,choice,position,5),true);
  assert.ok(legalSummonPositions(context,choice,5).some(p=>p.x===position.x&&p.y===position.y));
  assert.equal(canPlaceSummon(context,choice,{x:800,y:400},5),false,'the selected square still respects summon range');
  assert.equal(canPlaceSummon(context,choice,{x:1000,y:400},100),false,'the selected square must be on the map');
  assert.equal(canPlaceSummon(context,choice,{x:501,y:400},5),false,'the selection still uses the map grid');
});

test('open-map summons still reserve their actual full size against existing creatures and each other',()=>{
  const w=world(),choice={width:4,height:4},position={x:500,y:400};
  w.scene.tokens.push({x:700,y:500,width:1,height:1});
  assert.equal(canPlaceSummon(placementContext(w.scene,w.caster),choice,position,5),false);
  w.scene.tokens.pop();
  const context=placementContext(w.scene,w.caster);
  assert.equal(canPlaceSummon(context,choice,position,5),true);
  assert.equal(canPlaceSummon(context,choice,position,5,[{x:700,y:500,right:800,bottom:600}]),false);
});

test('real lighting walls and surfaces retain full-size checks, while open doors and non-light walls do not',t=>{
  const w=world();v14(w,t);const choice={width:4,height:4},position={x:500,y:400};
  const wall={c:[900,0,900,1000],light:1,level:'ground'};w.scene.walls.push(wall);
  assert.equal(canPlaceSummon(placementContext(w.scene,w.caster),choice,position,5),false);
  wall.door=1;wall.ds=1;
  assert.equal(canPlaceSummon(placementContext(w.scene,w.caster),choice,position,5),true);
  wall.ds=0;wall.light=0;wall.move=1;
  assert.equal(canPlaceSummon(placementContext(w.scene,w.caster),choice,position,5),true);
  w.scene.getSurfaces=()=>[{}];
  assert.equal(canPlaceSummon(placementContext(w.scene,w.caster),choice,position,5),false);
});

test('adding a lighting barrier after open-map selection revalidates the full size before creating the summon',async()=>{
  const w=world({size:4});w.a.flags.ultimate.skillSummons.radius=5;
  await validateSummonPlan(w.a,'skill',w.plan,w.player);
  w.scene.walls.push({c:[650,0,650,1000],light:1});
  await assert.rejects(createAbilitySummons(w.a,'skill',w.plan,w.player),/Cannot Fit/);
  assert.equal(w.events.creates,0);
});

test('v14 wall Level membership excludes barriers from other floors and includes barriers shared with this floor',t=>{
  const w=world();v14(w,t);const choice={width:4,height:4},position={x:500,y:400};
  const wall={c:[650,0,650,1000],light:1,levels:new Set(['upper'])};w.scene.walls.push(wall);
  assert.equal(canPlaceSummon(placementContext(w.scene,w.caster),choice,position,20),true);
  wall.levels.add('ground');
  assert.equal(canPlaceSummon(placementContext(w.scene,w.caster),choice,position,20),false);
  wall.levels=null;
  assert.equal(canPlaceSummon(placementContext(w.scene,w.caster),choice,position,20),false);
});
