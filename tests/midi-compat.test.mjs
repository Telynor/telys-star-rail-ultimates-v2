import {test} from 'node:test';
import assert from 'node:assert/strict';
import {midiWorkflow,midiDamageRolls} from '../scripts/midi-compat.mjs';
import {systemPath,typedChanges,effectChanges,addAttackBonus} from '../scripts/system-compat.mjs';
const actor={uuid:'Actor.hero'},workflow={id:'cast',actor,item:{uuid:'Actor.hero.Item.spell'},activity:{uuid:'Actor.hero.Item.spell.Activity.save'}};
test('Midi 14.0 workflow and 14.6 preItemRoll/V2 payloads resolve to the same workflow',()=>{
  for(const source of [workflow,{workflow},{activity:workflow.activity,config:{workflow}},{usage:{workflow}}])assert.equal(midiWorkflow(source,actor),workflow);
});
test('Midi 14.6 chat-message UUID lookup works without legacy message flags',()=>{
  const calls=[],env={MidiQOL:{Workflow:{getWorkflow:id=>{calls.push(id);return id==='ChatMessage.card'?workflow:null;}}}};
  assert.equal(midiWorkflow({uuid:'ChatMessage.card',system:{item:{uuid:workflow.item.uuid}}},actor,env),workflow);
  assert.deepEqual(calls,['ChatMessage.card']);
});
test('activity UUID lookup supports modern workflows before a chat card exists',()=>{
  const env={MidiQOL:{Workflow:{getWorkflowByActivityUuid:uuid=>uuid===workflow.activity.uuid?workflow:null}}};
  assert.equal(midiWorkflow({subject:workflow.activity},actor,env),workflow);
});
test('foreign actor workflow matches cannot override the intended actor',()=>{
  const foreign={...workflow,actor:{uuid:'Actor.other'}};
  const env={MidiQOL:{Workflow:{getWorkflow:()=>foreign,getWorkflowByActivityUuid:()=>foreign}}};
  assert.equal(midiWorkflow({workflow:foreign,message:{uuid:'ChatMessage.card'}},actor,env),null);
});
test('legacy item UUID lookup is retained for Midi 14.0',()=>{
  const env={MidiQOL:{Workflow:{getWorkflow:id=>id===workflow.item.uuid?workflow:null}}};
  assert.equal(midiWorkflow({system:{item:{uuid:workflow.item.uuid}}},actor,env),workflow);
});
test('plural damage rolls preserve riders and bonus rolls without reading deprecated aggregate getters',()=>{
  const base={},rider={},bonus={},w={damageRolls:[base],otherDamageRolls:[rider],bonusDamageRolls:[bonus]};
  for(const key of ['damageRoll','otherDamageRoll','bonusDamageRoll'])Object.defineProperty(w,key,{get(){throw Error('aggregate getter must not be read');}});
  assert.deepEqual(midiDamageRolls(w),[base,rider,bonus]);
});
test('legacy scalar damage rolls and repeated object references are supported',()=>{
  const base={},rider={};assert.deepEqual(midiDamageRolls({damageRoll:base,otherDamageRolls:[rider,base]}),[base,rider]);
});
test('v6 persistent bonus paths and v5 paths remain separate',()=>{
  const modern={game:{system:{version:'6.0.6'}}},legacy={game:{system:{version:'5.3.3'}}};
  for(const [old,current]of [['system.abilities.con.bonuses.save','system.abilities.con.save.roll.bonus'],['system.skills.prc.bonuses.check','system.skills.prc.roll.bonus'],['system.bonuses.rsak.attack','system.rolls.attack.rsak.bonus'],['system.attributes.init.bonus','system.attributes.init.roll.bonus'],['system.attributes.movement.walk','system.attributes.movement.speeds.walk']]){
    assert.equal(systemPath(old,modern),current);assert.equal(systemPath(old,legacy),old);
  }
});
test('v14 effect change serialization and comparisons ignore system-generated IDs and filters',()=>{
  const logical=[{key:'system.abilities.con.value',mode:2,value:'2',priority:30}],serialized=typedChanges(logical);
  assert.equal(serialized[0].type,'add');assert.equal(serialized[0].mode,undefined);
  assert.deepEqual(effectChanges({system:{changes:serialized.map(c=>({...c,_id:'system-id',conditions:[],replacement:''}))}}),logical);
});
test('Light Cone attack bonuses target v6 roll data once per attack type',()=>{
  const attack=Object.fromEntries(['mwak','rwak','msak','rsak'].map(k=>[k,{bonus:''}])),system={rolls:{attack},bonuses:{}};
  addAttackBonus(system,2);addAttackBonus(system,1,{spellOnly:true});
  assert.equal(attack.mwak.bonus,'(0) + 2');assert.equal(attack.rwak.bonus,'(0) + 2');
  assert.equal(attack.msak.bonus,'((0) + 2) + 1');assert.equal(attack.rsak.bonus,'((0) + 2) + 1');
});
test('Light Cone attack bonuses retain the v5 prepared fields',()=>{
  const system={bonuses:{mwak:{attack:'1'},msak:{attack:''}}};addAttackBonus(system,2);
  assert.equal(system.bonuses.mwak.attack,'(1) + 2');assert.equal(system.bonuses.msak.attack,'(0) + 2');
});
