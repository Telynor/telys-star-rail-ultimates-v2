import {test} from 'node:test';
import assert from 'node:assert/strict';
import {world,collection,ID} from './helpers/summoning-world.mjs';
import * as spells from '../scripts/ability-spells.mjs';
import {stampSpellSummon,validateSummonCreation} from '../scripts/ability-summons.mjs';

function setup({mode='known',use=async()=>({}),...config}={}) {
  const w=world({config:{skillSummons:{enabled:false},skillHpCostEnabled:true,skillHpCostType:'half',skillSpell:{enabled:true,mode,itemId:'spell',uuid:'Compendium.test.spells.Item.magic'},...config}});
  w.item={id:'spell',uuid:'Actor.hero.Item.spell',name:'Conjure Wolf',documentName:'Item',type:'spell',actor:w.a,use};
  w.a.items=collection([w.item]);
  w.a.createEmbeddedDocuments=async(_type,rows)=>rows.map((row,index)=>{const item={...row,id:'imported-'+index,actor:w.a,use,getFlag(scope,key){return this.flags?.[scope]?.[key]}};w.a.items.push(item);return item;});
  return w;
}
test('the real Skill pays SP and actual HP before casting its owned spell, then posts Skill text',async()=>{
  const w=setup();w.item.use=async options=>{assert.equal(w.settings.get('skillPoints'),3);assert.equal(w.a.system.attributes.hp.value,20);assert.equal(options.consume,false);return {};};
  assert.equal(await w.api.executeSkill(w.a.id,w.gm.id),true);
  assert.equal(w.a.system.attributes.hp.temp,12);assert.equal(w.events.messages.length,1);
  assert.equal(w.events.talent.filter(type=>type==='skillUsed').length,1);assert.equal(w.api.state.pendingSkills.size,0);
});
for(const [name,result] of [['closed dialog',undefined],['cancelled',false],['aborted',{aborted:true}]])test(`${name} refunds the exact Skill SP/HP payment and releases its lock`,async()=>{
  const w=setup({use:async()=>result});assert.equal(await w.api.executeSkill(w.a.id,w.gm.id),false);
  assert.equal(w.settings.get('skillPoints'),5);assert.equal(w.a.system.attributes.hp.value,39);assert.equal(w.a.system.attributes.hp.temp,12);assert.equal(w.events.messages.length,0);assert.equal(w.events.talent.filter(type=>type==='skillUsed').length,0);assert.equal(w.api.state.skillLocks.size,0);
});
test('a spell error refunds costs and allows the next cast',async()=>{
  const w=setup({use:async()=>{throw Error('Roll blocked');}});assert.equal(await w.api.executeSkill(w.a.id,w.gm.id),false);
  assert.equal(w.settings.get('skillPoints'),5);assert.equal(w.a.system.attributes.hp.value,39);w.item.use=async()=>({});assert.equal(await w.api.executeSkill(w.a.id,w.gm.id),true);
});
test('Spell known rejects a missing, foreign or nonspell Item before any payment',async()=>{
  for(const change of [item=>item.type='feat',item=>item.actor={},item=>item.id='other']){
    const w=setup();change(w.item);assert.equal(await w.api.executeSkill(w.a.id,w.gm.id),false);assert.equal(w.settings.get('skillPoints'),5);assert.equal(w.a.system.attributes.hp.value,39);
  }
});
test('Other imports a genuine owned spell once, preserves its source, and reuses the owned Item',async()=>{
  const w=setup({mode:'other'}),source={documentName:'Item',type:'spell',pack:'test.spells',uuid:'Compendium.test.spells.Item.magic',toObject:()=>({_id:'magic',name:'Compendium Spell',type:'spell',flags:{}})};
  globalThis.fromUuid=async()=>source;
  const first=await spells.resolveSkillSpell(w.a),second=await spells.resolveSkillSpell(w.a);
  assert.equal(first.actor,w.a);assert.equal(first,second);assert.equal(first.getFlag(ID,'skillSpellSource'),source.uuid);assert.equal(w.a.items.length,2);assert.equal(source.actor,undefined);
});
test('Other rejects world Items, Actors, features and inaccessible compendium entries',async()=>{
  for(const source of [null,{documentName:'Actor',type:'npc',pack:'test.spells'},{documentName:'Item',type:'feat',pack:'test.spells'},{documentName:'Item',type:'spell',uuid:'Actor.hero.Item.magic'}]){
    const w=setup({mode:'other'});globalThis.fromUuid=async()=>source;assert.equal(await w.api.executeSkill(w.a.id,w.gm.id),false);assert.equal(w.settings.get('skillPoints'),5);
  }
});
test('native Summon activity is placed during the Skill, with resource consumption disabled',async()=>{
  const w=setup();w.item.use=async usage=>{
    const activity={type:'summon',actor:w.a,item:w.item};Hooks.call('dnd5e.preUseActivity',activity,usage);
    assert.equal(usage.consume,false);assert.equal(usage.create.summons,true);assert.ok(usage.summons.tsruSkillCastId);
    usage.consume=true;Hooks.call('dnd5e.preActivityConsumption',activity,usage);assert.equal(usage.consume,false,'a dialog cannot re-enable slot or Item consumption');
    const tokens=await w.scene.createEmbeddedDocuments('Token',[{x:500,y:400,width:1,height:1}]);Hooks.callAll('dnd5e.postSummon',activity,{},tokens,usage.summons);return {summoned:tokens};
  };
  assert.equal(await w.api.executeSkill(w.a.id,w.gm.id),true);assert.equal(w.scene.tokens.length,2);
});
test('zero native summons or a blocked full footprint refunds the Skill and removes partial native summons',async()=>{
  const w=setup();w.item.use=async usage=>{
    const activity={type:'summon',actor:w.a,item:w.item};Hooks.call('dnd5e.preUseActivity',activity,usage);
    const tokens=await w.scene.createEmbeddedDocuments('Token',[{x:500,y:400,width:1,height:1}]);Hooks.callAll('dnd5e.postSummon',activity,{},tokens,usage.summons);
    Hooks.callAll('tsruSummonPlacementBlocked',{}, {castId:usage.summons.tsruSkillCastId});return {};
  };
  assert.equal(await w.api.executeSkill(w.a.id,w.gm.id),false);assert.equal(w.scene.tokens.length,1);assert.equal(w.settings.get('skillPoints'),5);assert.equal(w.a.system.attributes.hp.value,39);
  w.item.use=async usage=>{Hooks.call('dnd5e.preUseActivity',{type:'summon',actor:w.a,item:w.item},usage);return {summoned:[]};};
  assert.equal(await w.api.executeSkill(w.a.id,w.gm.id),false);assert.equal(w.settings.get('skillPoints'),5);
});
test('remote spell completion requires the current cast nonce and requesting owner; duplicate completion cannot refund',async()=>{
  const w=setup();assert.equal(await w.api.executeSkill(w.a.id,w.player.id),true);
  const request=w.events.socket.find(entry=>entry.type==='useSkill');assert.equal(request.spellItemId,'spell');assert.ok(request.castId);
  for(const [userId,castId]of [[w.stranger.id,request.castId],[w.player.id,'old-nonce']])await w.api.onSocket({type:'skillComplete',actorId:w.a.id,userId,castId,failed:true});
  assert.equal(w.settings.get('skillPoints'),3);assert.equal(w.api.state.pendingSkills.size,1);
  await w.api.onSocket({type:'skillComplete',actorId:w.a.id,userId:w.player.id,castId:request.castId,failed:true});
  assert.equal(w.settings.get('skillPoints'),5);assert.equal(w.a.system.attributes.hp.value,39);
  await w.api.onSocket({type:'skillComplete',actorId:w.a.id,userId:w.player.id,castId:request.castId,failed:true});assert.equal(w.settings.get('skillPoints'),5);
});
test('another character can spend SP while a casting dialog is pending without reopening the first Skill lock',async()=>{
  const w=setup();let finish;w.item.use=()=>new Promise(resolve=>finish=resolve);
  const running=w.api.executeSkill(w.a.id,w.gm.id);await new Promise(setImmediate);assert.equal(typeof finish,'function');
  const ally={...w.a,id:'ally',uuid:'Actor.ally',flags:{ultimate:{...w.a.flags.ultimate,skillHpCostEnabled:false,skillSpell:{enabled:false}}},items:collection()};w.game.actors.push(ally);
  assert.equal(await w.api.executeSkill(ally.id,w.gm.id),true);assert.equal(w.settings.get('skillPoints'),1);assert.equal(await w.api.executeSkill(w.a.id,w.gm.id),false);
  finish({});assert.equal(await running,true);assert.equal(w.settings.get('skillPoints'),1);
});
test('repeat packets reuse one cast and a cancelled nonce cannot create a late summon',async()=>{
  const w=setup();let count=0;w.item.use=async()=>{count++;return {};};
  assert.equal(await spells.castSkillSpell(w.a,{itemId:'spell',castId:'once'}),true);assert.equal(await spells.castSkillSpell(w.a,{itemId:'spell',castId:'once'}),true);assert.equal(count,1);
  spells.cancelSkillSpell(w.a,'old');const data={x:500,y:400,width:1,height:1};stampSpellSummon({actor:w.a,item:w.item,getUsageToken:()=>w.caster},{},data,{tsruSkillCastId:'old'});
  assert.equal(validateSummonCreation({parent:w.scene,...data},data),false);assert.equal(await spells.castSkillSpell(w.a,{itemId:'spell',castId:'old'}),false);
});
test('cancelling a remote spell during another character’s pending SP write preserves both changes',async()=>{
  const w=setup();assert.equal(await w.api.executeSkill(w.a.id,w.player.id),true);
  const request=w.events.socket.find(entry=>entry.type==='useSkill');
  const ally={...w.a,id:'ally',uuid:'Actor.ally',flags:{ultimate:{...w.a.flags.ultimate,skillHpCostEnabled:false,skillSpell:{enabled:false}}},items:collection()};w.game.actors.push(ally);
  const original=w.game.settings.set;let release;
  w.game.settings.set=async(scope,key,value)=>{if(key==='skillPoints'&&value===1)await new Promise(resolve=>release=resolve);return original(scope,key,value);};
  const spending=w.api.executeSkill(ally.id,w.gm.id);await new Promise(setImmediate);assert.equal(typeof release,'function');
  const refund=w.api.onSocket({type:'skillComplete',actorId:w.a.id,userId:w.player.id,castId:request.castId,failed:true});
  await new Promise(setImmediate);assert.equal(w.settings.get('skillPoints'),3,'refund waits for the pending payment');
  release();assert.equal(await spending,true);await refund;
  assert.equal(w.settings.get('skillPoints'),3,'only the second Skill remains paid');assert.equal(w.a.system.attributes.hp.value,39);
});
test('ordinary native spell summons receive exact ownership and final lighting-wall validation',()=>{
  const w=setup(),data={x:500,y:300,width:4,height:4};
  stampSpellSummon({actor:w.a,item:w.item,getUsageToken:()=>w.caster},{},data,{});
  assert.equal(data.flags[ID].summonOwner.casterUuid,w.a.uuid);assert.equal(data.actorLink,false);
  w.scene.walls.push({c:[650,200,650,800],light:1,move:0});assert.equal(validateSummonCreation({parent:w.scene,...data},data),false);
});
