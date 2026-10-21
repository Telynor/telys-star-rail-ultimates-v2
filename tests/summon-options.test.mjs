import {test} from 'node:test';
import assert from 'node:assert/strict';
import {world,collection} from './helpers/summoning-world.mjs';
import {normalizeSummonOptions,spellSummonKey,spellSummonOptions} from '../scripts/summon-options.mjs';
import {activeSummon,confirmSummonReplacement,dismissForReplacement,removeSummonedTokens,setupSummonInitiative} from '../scripts/summon-lifecycle.mjs';
import {createAbilitySummons,validateSummonPlan,installNativeSummonLifecycle,stampSpellSummon,getSummonOptions} from '../scripts/ability-summons.mjs';
const ID='telys-star-rail-ultimates';
function oldSummon(w,{id='old',time=10,operationId='previous'}={}){
  const token={id,actorId:'wolf',parent:w.scene,x:500,y:400,width:1,height:1,actor:{system:{attributes:{hp:{value:20,max:40}}}},flags:{[ID]:{abilitySummon:{casterUuid:w.a.uuid,casterId:w.a.id,createdAt:time,operationId}}},getFlag(scope,key){return this.flags[scope]?.[key]}};
  w.scene.tokens.push(token);return token;
}
function combat(w){
  let seq=0;const turns=collection(),rolled=[];
  const c={id:'fight',scene:w.scene,combatants:turns,async createEmbeddedDocuments(_,rows){return rows.map(row=>{const entry={...row,id:`turn-${++seq}`};turns.push(entry);return entry;});},async deleteEmbeddedDocuments(_,ids){for(const id of ids){const index=turns.findIndex(e=>e.id===id);if(index>=0)turns.splice(index,1);}},async rollInitiative(ids){rolled.push(...ids);for(const id of ids)turns.get(id).initiative=17;}};
  w.game.combat=c;w.game.combats.push(c);return {c,turns,rolled};
}
test('each summon normalizes none, three dots, percentage, HP and its initiative independently',()=>{
  assert.deepEqual(normalizeSummonOptions(),{resourceType:'none',resourceMax:3,resource:0,initiativeMode:'own'});
  assert.deepEqual(normalizeSummonOptions({resourceType:'dots',resourceMax:99,resource:8,initiativeMode:'owner'}),{resourceType:'dots',resourceMax:3,resource:3,initiativeMode:'owner'});
  assert.equal(normalizeSummonOptions({resourceType:'percent',resource:90}).resourceMax,100);
  assert.equal(normalizeSummonOptions({resourceType:'counter'}).resourceType,'hp');
  assert.equal(normalizeSummonOptions({resourceType:'hp',showResource:false}).resourceType,'none');
});
test('spells cast through a Skill default to no extra resource and respect only their own configured profile',()=>{
  const w=world(),activity={id:'invocation',actor:w.a,item:{uuid:'Actor.hero.Item.spell'}},profile={_id:'magellenica',uuid:'Actor.wolf'};
  assert.equal(spellSummonOptions(w.a,activity,profile).resourceType,'none');
  w.a.flags.summonPreferences=[{key:spellSummonKey(activity,profile),resourceType:'percent',resource:75,initiativeMode:'owner'}];
  const data={};stampSpellSummon(activity,profile,data,{tsruSkillCastId:'skill-1'});
  assert.equal(data.flags[ID].summonOwner.options.resourceType,'percent');assert.equal(data.flags[ID].summonOwner.options.resource,75);
  assert.equal(data.flags[ID].summonOwner.options.initiativeMode,'owner');
  assert.equal(spellSummonOptions(w.a,activity,{_id:'other'}).resourceType,'none');
});
test('replacement No and closing the dialog keep the old creature and its turn without creating anything',async()=>{
  const w=world(),old=oldSummon(w),{turns}=combat(w);turns.push({id:'old-turn',tokenId:old.id,sceneId:w.scene.id});
  for(const answer of [false,null]){foundry.applications.api.DialogV2={wait:async options=>{assert.match(options.content,/you still have a summon out, do you wish to dismiss and summon your new creature\?/);return answer;}};assert.equal(await confirmSummonReplacement(w.a),false);}
  assert.equal(w.scene.tokens.get(old.id),old);assert.equal(turns.length,1);assert.equal(w.events.creates,0);
});
test('confirmed replacement can reuse the old square, removes its whole batch and all initiative entries, and preserves the source Actor',async()=>{
  const w=world(),old=oldSummon(w),second=oldSummon(w,{id:'old-2'}),{turns}=combat(w);
  second.x=700;turns.push({id:'first-turn',tokenId:old.id,sceneId:w.scene.id},{id:'second-turn',tokenId:second.id,sceneId:w.scene.id});
  foundry.applications.api.DialogV2={wait:async()=>true};const replaces=await confirmSummonReplacement(w.a);
  const receipt=await createAbilitySummons(w.a,'skill',{...w.plan,replaces});
  assert.equal(w.scene.tokens.get('old'),undefined);assert.equal(w.scene.tokens.get('old-2'),undefined);
  assert.equal(turns.length,1);assert.equal(turns[0].tokenId,receipt.tokenIds[0]);assert.equal(turns[0].initiative,17);
  const token=w.scene.tokens.get(receipt.tokenIds[0]);assert.equal(token.flags[ID].abilitySummon.options.resourceType,'dots');
  assert.equal(w.game.actors.get(w.wolf.id),w.wolf);assert.equal(w.a.system.attributes.hp.value,39);
});
test('a stale or forged replacement reference cannot overwrite another summon or delete somebody else’s creature',async()=>{
  const w=world(),old=oldSummon(w);await assert.rejects(validateSummonPlan(w.a,'skill',w.plan),/active summon changed/);
  await assert.rejects(dismissForReplacement(w.a,{sceneId:'map',tokenId:'wrong'},w.gm),/active summon changed/);
  await assert.rejects(dismissForReplacement(w.a,{sceneId:'map',tokenId:old.id},w.stranger),/do not own/);
  assert.equal(activeSummon(w.a),old);assert.equal(w.scene.tokens.length,2);
});
test('owner initiative mode has no independent turn, while the default rolls only once across duplicate creation hooks',async()=>{
  const w=world(),first=oldSummon(w),{turns,rolled}=combat(w);
  await Promise.all([setupSummonInitiative(w.a,first),setupSummonInitiative(w.a,first)]);
  assert.equal(turns.length,1);assert.equal(rolled.length,1);
  const shared=oldSummon(w,{id:'shared'});await setupSummonInitiative(w.a,shared,{initiativeMode:'owner'});
  assert.equal(turns.length,1);
  await setupSummonInitiative(w.a,first,{initiativeMode:'owner'});assert.equal(turns.length,0);
  await setupSummonInitiative(w.a,first,{initiativeMode:'own'});assert.equal(turns.length,1);assert.equal(rolled.length,2);
});

test('editing a saved summon updates that live creature’s resource selection independently of the initial snapshot',async()=>{
  const w=world(),receipt=await createAbilitySummons(w.a,'skill',w.plan),token=w.scene.tokens.get(receipt.tokenIds[0]);
  assert.equal(getSummonOptions(w.a,token).resourceType,'dots');
  Object.assign(w.a.flags.ultimate.skillSummons.choices[0],{resourceType:'percent',resource:68,initiativeMode:'owner'});
  const options=getSummonOptions(w.a,token);assert.equal(options.resourceType,'percent');assert.equal(options.resource,68);assert.equal(options.initiativeMode,'owner');
  assert.equal(token.flags[ID].abilitySummon.options.resourceType,'dots','the original snapshot is not mutated');
});
test('removing a summon cleans active and inactive combats and matches the exact scene token',async()=>{
  const w=world(),old=oldSummon(w),{c,turns}=combat(w);turns.push({id:'old-turn',tokenId:old.id,sceneId:'map'},{id:'other-scene',tokenId:old.id,sceneId:'elsewhere'});
  const second={...c,id:'inactive',combatants:collection([{id:'inactive-old',tokenId:old.id,sceneId:'map'}])};
  second.deleteEmbeddedDocuments=async(_,ids)=>{second.combatants.splice(0,second.combatants.length,...second.combatants.filter(e=>!ids.includes(e.id)));};w.game.combats.push(second);
  await removeSummonedTokens([old]);assert.equal(turns.length,1);assert.equal(turns[0].id,'other-scene');assert.equal(second.combatants.length,0);
});
test('native spell placement confirms replacement and retains the old summon when placement is cancelled',async()=>{
  const w=world(),old=oldSummon(w);let placements=[],calls=0,answer=true;
  class NativeSummon {constructor(){this.actor=w.a;}async getPlacement(){calls++;return placements;}}
  globalThis.CONFIG={DND5E:{activityTypes:{summon:{documentClass:NativeSummon}}}};
  foundry.applications.api.DialogV2={wait:async()=>answer};installNativeSummonLifecycle();
  const native=new NativeSummon();assert.deepEqual(await native.getPlacement(),[]);assert.equal(w.scene.tokens.get(old.id),old);
  answer=false;placements=[{x:500,y:400}];assert.deepEqual(await native.getPlacement(),[]);assert.equal(calls,1);
  answer=true;assert.equal((await native.getPlacement()).length,1);assert.equal(w.scene.tokens.get(old.id),undefined);
});
