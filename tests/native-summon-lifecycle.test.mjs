import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {world,collection} from './helpers/summoning-world.mjs';
import {installNativeSummonLifecycle,stampSpellSummon} from '../scripts/ability-summons.mjs';
import {castSkillSpell} from '../scripts/ability-spells.mjs';

test('actual D&D5e SummonActivity supports No, placement cancellation and replacement through a Skill spell',async()=>{
  const system=process.env.DND5E_V6_SOURCE_ROOT??process.env.DND5E_SOURCE_ROOT;if(!system)throw Error('Set DND5E_V6_SOURCE_ROOT to the D&D5e 6 source tree.');
  const source=await readFile(path.join(system,'module/documents/activity/summon.mjs'),'utf8');
  const w=world();let positions=[{x:500,y:400}],answer=false;
  const old={id:'old',parent:w.scene,actorId:'wolf',actor:{system:{attributes:{hp:{value:10,max:20}}}},flags:{'telys-star-rail-ultimates':{summonOwner:{casterId:w.a.id,casterUuid:w.a.uuid}}},getFlag(scope,key){return this.flags[scope]?.[key]}};
  w.scene.tokens.push(old);
  const turns=collection([{id:'old-turn',tokenId:'old',sceneId:'map'}]);
  const combat={id:'fight',scene:w.scene,combatants:turns,async deleteEmbeddedDocuments(_,ids){turns.splice(0,turns.length,...turns.filter(row=>!ids.includes(row.id)));}};
  w.game.combats.push(combat);
  const context=vm.createContext({foundry,Hooks,game,canvas,Roll:class{async evaluate(){this.total=1;}},
    _loc:message=>message,
    SummonSheet:class{},SummonUsageDialog:class{},BaseSummonActivityData:class{},
    ActivityMixin:()=>class{static LOCALIZATION_PREFIXES=[];static metadata={};},
    TokenPlacement:{place:async()=>positions},dnd5e:{documents:{Actor5e:{fetchExisting:async()=>w.wolf}}}});
  vm.runInContext(source.replace(/^import .*;\n/gm,'').replace('export default class SummonActivity','class SummonActivity')+'\nglobalThis.NativeSummon=SummonActivity;',context);
  const Class=context.NativeSummon;
  globalThis.CONFIG={DND5E:{activityTypes:{summon:{documentClass:Class}}}};
  foundry.applications.api.DialogV2={wait:async()=>answer};installNativeSummonLifecycle();
  Hooks.on('dnd5e.summonToken',stampSpellSummon);
  const activity=new Class(),profile={_id:'magellenica',uuid:w.wolf.uuid,count:'1'};
  const item={id:'invocation',uuid:'Actor.hero.Item.invocation',actor:w.a,type:'spell',name:'Invocation',async use(config){return {summoned:await activity.placeSummons({...config.summons,profile:profile._id})};}};
  w.a.items.push(item);
  w.wolf.isOwner=true;
  Object.assign(activity,{id:'summon',actor:w.a,item,profiles:[profile],summon:{mode:''},creatureSizes:new Set(),getRollData:()=>({}),getUsageToken:()=>w.caster,
    getChanges:async()=>({}),getTokenData:async({placement})=>({...placement,actorId:'wolf',width:1,height:1,flags:{}})});
  Object.defineProperty(activity,'canSummon',{value:true});
  assert.deepEqual(Array.from(await activity.placeSummons({profile:'magellenica'})),[]);assert.equal(w.scene.tokens.get('old'),old);assert.equal(turns.length,1);
  answer=true;positions=[];assert.deepEqual(Array.from(await activity.placeSummons({profile:'magellenica'})),[]);assert.equal(w.scene.tokens.get('old'),old);
  positions=[{x:500,y:400}];assert.equal(await castSkillSpell(w.a,{itemId:item.id,castId:'cast-1'}),true);
  assert.equal(w.scene.tokens.get('old'),undefined);assert.equal(turns.length,0);
  const created=w.scene.tokens.find(row=>row.id!=='caster');assert.equal(created.flags['telys-star-rail-ultimates'].summonOwner.options.resourceType,'none');
  assert.equal(created.flags['telys-star-rail-ultimates'].summonOwner.casterUuid,w.a.uuid);assert.equal(w.game.actors.get('wolf'),w.wolf);
});
