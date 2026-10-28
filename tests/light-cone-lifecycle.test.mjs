import {test} from 'node:test';
import assert from 'node:assert/strict';
const ID='telys-star-rail-ultimates',FLAG='lightConeRuntime',hooks=new Map(),errors=[];
globalThis.Hooks={once(){},on(name,fn){const list=hooks.get(name)??[];list.push(fn);hooks.set(name,list)}};
globalThis.foundry={utils:{deepClone:structuredClone,escapeHTML:String}};
globalThis.ui={notifications:{error:message=>errors.push(message)}};
globalThis.window={};globalThis.fetch=async()=>({json:async()=>[]});
const gm={id:'gm',isGM:true,active:true};
globalThis.game={user:gm,users:[gm],combat:null,combats:new Map(),modules:new Map(),settings:{get:()=>[]}};
class Actor {
  constructor(id='hero',modern=false){
    this.uuid=`Actor.${id}`;this.id=id;this.documentName='Actor';this.type='character';this.effects=[];this.flags={ultimate:{pathId:'nihility'},selectedLightConeItemId:'cone'};this.modern=modern;this.resets=0;
    this.items=[{id:'cone',type:'loot',getFlag:()=>({enabled:true,catalogId:'21001',draftId:99,pathId:'nihility'}),prepareFinalAttributes:()=>this.itemPrepares++}];this.items.get=id=>this.items.find(item=>item.id===id);this.itemPrepares=0;this.prepareData();
  }
  prepareData(){
    const movement=this.modern?{speeds:{walk:30}}:{walk:30};
    if(this.modern)Object.defineProperty(movement,'walk',{get(){throw Error('Deprecated walk getter');},set(){throw Error('Deprecated walk setter');}});
    this.system={attributes:{hp:{value:20,max:20,temp:0},ac:{value:10},movement},abilities:this.modern?{con:{save:{value:5}}}:{},bonuses:{}};
    if(this.modern)this.system.rolls={attack:Object.fromEntries(['mwak','rwak','msak','rsak'].map(key=>[key,{bonus:''}]))};
  }
  getFlag(_,key){return this.flags[key]}
  async setFlag(_,key,value){this.flags[key]=structuredClone(value)}
  async unsetFlag(_,key){delete this.flags[key];this.clears=(this.clears??0)+1}
  reset(){this.resets++;this.prepareData()}
}
globalThis.CONFIG={Actor:{documentClass:Actor},DND5E:{}};
const {installLightCones,handle,restoreInitiative,snapshot}=await import('../scripts/light-cones.mjs');
const configReads=new Map();
installLightCones({getConfig:a=>{configReads.set(a,(configReads.get(a)??0)+1);return a.getFlag(ID,'ultimate')??{}}});
function encounter(id='fight',actor=new Actor()){
  let initiativeFlag={bonus:2,active:true};
  const combat={id,started:true,round:1,flags:{},combatants:[],getFlag(_,key){return this.flags[key]},async setFlag(_,key,value){assert.equal(game.combats.get(id),this,'never write flags on deleted combat');this.flags[key]=value;}};
  const c={id:'turn',actor,initiative:12,getFlag:(_,key)=>key==='lightConeInitiative'?initiativeFlag:null,async update(patch){assert.equal(game.combats.get(id),combat,'never update children of deleted combat');this.initiative=patch.initiative??this.initiative;initiativeFlag=null;}};
  combat.combatants.push(c);combat.combatant=c;game.combats.set(id,combat);game.combat=combat;
  actor.flags[FLAG]={combatId:id,stacks:{erodeSpeed:3},buffs:{},marks:{},once:{},dots:[]};
  return {combat,actor,c};
}
test('post-delete cleanup skips combat writes, clears runtime once, and removes prepared bonuses',async()=>{
  const {combat,actor}=encounter();actor.reset();assert.ok(actor._lightConeStats);
  game.combats.delete(combat.id);game.combat=null;
  for(const hook of hooks.get('deleteCombat'))hook(combat);
  await handle('combatEnd',{combat},combat.id);
  assert.equal(actor.getFlag(ID,FLAG),undefined);assert.equal(actor.clears,1);assert.equal(actor._lightConeStats,undefined);assert.deepEqual(errors,[]);
});
test('Path equipment waits for commit before clearing old cone stacks and preserves foreign buffs and once limits',async()=>{
  const {actor}=encounter('path-equipment');actor.flags[FLAG].once={used:true};actor.flags[FLAG].buffs={self:{source:actor.uuid},ally:{source:'Actor.ally'}};
  const patch={[`flags.${ID}.selectedLightConeItemId`]:'other'},opts={tsruPathChange:true};
  for(const hook of hooks.get('preUpdateActor')??[])hook(actor,patch,opts);
  actor.flags.selectedLightConeItemId='other';actor.flags.pathChanging={pending:{}};
  for(const hook of hooks.get('updateActor')??[])hook(actor,patch,opts);
  for(const hook of hooks.get('tsruPathChanged')??[])hook(actor);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(actor.flags[FLAG].stacks.erodeSpeed,3);
  actor.flags.pathChanging.pending=null;for(const hook of hooks.get('tsruPathChanged')??[])hook(actor);
  await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(actor.flags[FLAG].stacks,{});assert.deepEqual(actor.flags[FLAG].buffs,{ally:{source:'Actor.ally'}});assert.equal(actor.flags[FLAG].once.used,true);
});
test('live combat end restores temporary initiative and does not write event flags',async()=>{
  const {combat,actor,c}=encounter('stopped');combat.started=false;
  await handle('combatEnd',{combat},combat.id);
  assert.equal(c.initiative,10);assert.equal(actor.getFlag(ID,FLAG),undefined);assert.deepEqual(combat.flags,{});
});
test('queued events stay bound to their original encounter and cannot affect its replacement',async()=>{
  const old=encounter('old'),work=handle('turnStart',{combat:old.combat,sourceActor:old.actor,combatant:old.c},'old:1:turn');
  const replacement=encounter('new',old.actor);game.combats.delete('old');
  await work;await handle('combatEnd',{combat:old.combat},'old');
  assert.equal(old.actor.getFlag(ID,FLAG).combatId,'new');assert.deepEqual(replacement.combat.flags,{});assert.deepEqual(old.combat.flags,{});assert.deepEqual(errors,[]);
});
test('D&D5e 5 and 6 speed bonuses use the correct field, reset without accumulating, and stop after combat',()=>{
  for(const modern of [false,true]){
    const {actor}=encounter('speed-'+modern,new Actor('hero',modern));
    for(let i=0;i<3;i++){actor.reset();assert.equal((modern?actor.system.attributes.movement.speeds:actor.system.attributes.movement).walk,45);}
    game.combat=null;actor.reset();assert.equal((modern?actor.system.attributes.movement.speeds:actor.system.attributes.movement).walk,30);assert.equal(actor._lightConeStats,undefined);
    const before=actor.itemPrepares;actor.reset();assert.equal(actor.itemPrepares,before,'no item re-preparation outside combat');
  }
});
test('initiative restoration is a no-op for a deleted encounter even if another combat is active',async()=>{
  const old=encounter('deleted');game.combats.delete(old.combat.id);encounter('current');
  await restoreInitiative(old.combat);assert.equal(old.c.initiative,12);assert.deepEqual(errors,[]);
});
test('stat evaluation reads each combatant config once and sees changed resources on the next evaluation',()=>{
  const {combat,actor}=encounter('many');
  for(let i=0;i<20;i++)combat.combatants.push({actor:new Actor('ally'+i),getFlag:()=>null});
  configReads.clear();assert.equal(snapshot(actor).speed,15);
  assert.equal(configReads.size,21);assert.ok([...configReads.values()].every(count=>count===1));
  actor.flags[FLAG].stacks.erodeSpeed=4;assert.equal(snapshot(actor).speed,20);
});
test('a deleted combat still referenced by a client cannot reapply prepared bonuses',()=>{
  const {actor,combat}=encounter('stale-pointer');actor.reset();assert.equal(actor.system.attributes.movement.walk,45);
  game.combats.delete(combat.id);actor.reset();assert.equal(actor._lightConeStats,undefined);assert.equal(actor.system.attributes.movement.walk,30);
});
test('v6 Light Cone prepared attack and save bonuses use current fields and reset without accumulating',()=>{
  const {actor}=encounter('modern-bonuses',new Actor('modern-hero',true));
  actor.flags[FLAG].buffs.compat={source:actor.uuid,cone:'21001',stats:{attack:2,save:1,effectHit:1},remaining:1};
  for(let i=0;i<3;i++){
    actor.reset();assert.equal(actor.system.abilities.con.save.value,6);assert.equal(actor.system.abilities.con.save.total,undefined);
    assert.equal(actor.system.rolls.attack.mwak.bonus,'(0) + 2');assert.equal(actor.system.rolls.attack.msak.bonus,'((0) + 2) + 1');
  }
});
test('the real Light Cone preItemRoll handler accepts Midi 14.6 payloads and charges HP only once',async()=>{
  const {actor}=encounter('modern-pre-action');actor.isOwner=true;
  actor.items[0].getFlag=()=>({enabled:true,catalogId:'21001',draftId:46,pathId:'nihility'});
  actor.flags.lightConeSettings={hpCost:2};const updates=[];actor.update=async patch=>updates.push(patch);
  const workflow={id:'skill-cast',actor,item:{getFlag:()=> 'skill'},activity:{}};
  const payload={activity:workflow.activity,config:{workflow}};
  for(const hook of hooks.get('midi-qol.preItemRoll'))await hook(payload);
  for(const hook of hooks.get('midi-qol.preItemRoll'))await hook(payload);
  assert.equal(updates.length,1);assert.equal(updates[0]['system.attributes.hp.value'],18);
  assert.equal(actor.flags[FLAG].buttonAction.category,'skill');
});
