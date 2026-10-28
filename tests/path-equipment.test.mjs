import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathWorld,ID} from './helpers/path-world.mjs';
import {pathCatalog,capturePathBuild,buildEffect} from '../scripts/path-change-rules.mjs';
import {applyPathRequest} from '../scripts/path-changing.mjs';
import {eligibleCone} from '../scripts/light-cone-rules.mjs';
const payload=(w,extra={})=>({actorId:w.hero.id,revision:pathCatalog(w.hero).revision,...extra});
const switchTo=(w,id)=>applyPathRequest('switch',payload(w,{profileId:id}),w.owner);
async function world({native=false,existing=false}={}){
 const w=pathWorld(),item=(id,name)=>({_id:id,name,type:native?'equipment':'loot',system:{quantity:1,uses:{spent:2,max:5},...(native?{attunement:'',attuned:false,properties:[],equipped:false}:{})},flags:{[ID]:{lightCone:{enabled:true,pathId:id==='coneA'?'hunt':'remembrance',catalogId:id==='coneA'?'A':'B'}}},_stats:{compendiumSource:'Compendium.cones.Item.'+(id==='coneA'?'A':'B')}});
 await w.hero.createEmbeddedDocuments('Item',[item('coneA','Hunt cone')]);await w.source.createEmbeddedDocuments('Item',[item('coneB','Ice cone')]);
 if(existing)await w.hero.createEmbeddedDocuments('Item',[item('ownedB','Ice cone')]);
 await w.hero.update({[`flags.${ID}.selectedLightConeItemId`]:'coneA'});await w.source.update({[`flags.${ID}.selectedLightConeItemId`]:'coneB'});
 const source=w.source.toObject();await applyPathRequest('import',payload(w,{sourceActorId:w.source.id}),w.gm);
 const catalog=pathCatalog(w.hero);return {...w,original:catalog.activeId,alternate:catalog.profiles.find(p=>!p.original).id,sourceBefore:source};
}
test('Path import includes the equipped source Light Cone once while leaving the source and other inventory unchanged',async()=>{
 const w=await world(),profile=pathCatalog(w.hero).profiles.find(p=>p.id===w.alternate),cone=w.hero.items.get(profile.snapshot.lightCone.itemId);
 assert.equal(cone.name,'Ice cone');assert.notEqual(cone.id,'coneB');assert.equal(w.hero.getFlag(ID,'selectedLightConeItemId'),'coneA');assert.deepEqual(w.source.toObject(),w.sourceBefore);
 await applyPathRequest('reimport',payload(w,{profileId:w.alternate}),w.gm);assert.equal(w.hero.items.filter(i=>i.name==='Ice cone').length,1);assert.equal(w.hero.items.get('arrows').system.quantity,30);
});
test('Light Cone selection follows each Path and current charges remain shared across repeated switches',async()=>{
 const w=await world();await switchTo(w,w.alternate);const id=w.hero.getFlag(ID,'selectedLightConeItemId'),cone=w.hero.items.get(id);
 assert.equal(cone.name,'Ice cone');await cone.update({'system.uses.spent':4});await switchTo(w,w.original);assert.equal(w.hero.getFlag(ID,'selectedLightConeItemId'),'coneA');
 assert.equal(eligibleCone(w.hero,w.hero.getFlag(ID,'ultimate'),null).item.id,'coneA');
 await switchTo(w,w.alternate);assert.equal(w.hero.getFlag(ID,'selectedLightConeItemId'),id);assert.equal(w.hero.items.get(id),cone);assert.equal(cone.system.uses.spent,4);
 assert.equal(eligibleCone(w.hero,w.hero.getFlag(ID,'ultimate'),null).item.id,id);
});
test('matching existing shared Light Cones are reused without copying or resetting charges',async()=>{
 const w=await world({existing:true});assert.equal(w.hero.items.filter(i=>i.name==='Ice cone').length,1);await w.hero.items.get('ownedB').update({'system.uses.spent':5});await switchTo(w,w.alternate);assert.equal(w.hero.getFlag(ID,'selectedLightConeItemId'),'ownedB');assert.equal(w.hero.items.get('ownedB').system.uses.spent,5);
});
test('native attunement moves to the active Path cone and rollback restores the original selection',async()=>{
 const w=await world({native:true});await switchTo(w,w.alternate);const b=w.hero.items.get(w.hero.getFlag(ID,'selectedLightConeItemId'));
 assert.equal(b.system.attuned,true);assert.equal(w.hero.items.get('coneA').system.attuned,false);await switchTo(w,w.original);assert.equal(w.hero.items.get('coneA').system.attuned,true);assert.equal(b.system.attuned,false);
 const before=capturePathBuild(w.hero),token=w.token('linked');token.fail=true;await assert.rejects(switchTo(w,w.alternate),/previous Path was restored/);assert.deepEqual(capturePathBuild(w.hero),before);assert.equal(w.hero.getFlag(ID,'selectedLightConeItemId'),'coneA');assert.equal(b.system.attuned,false);
});
test('None is saved per Path and deleting an owned cone never recreates it on a switch',async()=>{
 const w=await world();await switchTo(w,w.alternate);const id=w.hero.getFlag(ID,'selectedLightConeItemId');await w.hero.update({[`flags.${ID}.selectedLightConeItemId`]:''});await switchTo(w,w.original);await switchTo(w,w.alternate);assert.equal(w.hero.getFlag(ID,'selectedLightConeItemId'),'');
 await switchTo(w,w.original);await w.hero.deleteEmbeddedDocuments('Item',['coneA']);await switchTo(w,w.alternate);await switchTo(w,w.original);assert.equal(w.hero.getFlag(ID,'selectedLightConeItemId'),'');assert.equal(w.hero.items.get('coneA'),undefined);assert.ok(w.hero.items.get(id));
});
test('failed imports remove only the newly added cone and keep the original build and inventory',async()=>{
 const w=pathWorld();await w.source.createEmbeddedDocuments('Item',[{_id:'cone',name:'Source cone',type:'loot',system:{quantity:1}}]);await w.source.update({[`flags.${ID}.selectedLightConeItemId`]:'cone'});const before=w.hero.toObject();w.hero.failUpdates=1;
 await assert.rejects(applyPathRequest('import',payload(w,{sourceActorId:w.source.id}),w.gm),/Actor update failed/);assert.deepEqual(w.hero.toObject(),before);
});
test('Planar generated bonus effects never become saved build effects or duplicate on a Path change',()=>{
 for(const key of ['statBonus','hsrBonus'])assert.equal(buildEffect({flags:{'telys-planar-ornaments':{[key]:true}}},'Actor.hero',new Set()),false);
});
test('old profiles acquire their source cone without replacing saved stats, resources or Eidolon progress',async()=>{
 const w=await world(),catalog=structuredClone(pathCatalog(w.hero)),alt=catalog.profiles.find(p=>p.id===w.alternate);
 for(const p of catalog.profiles)delete p.snapshot.lightCone;
 alt.snapshot.system.attributes.hp.value=3;alt.snapshot.system.abilities.dex.value=20;alt.snapshot.flags[ID].eidolons.slots[0].title='Saved progress';
 await w.hero.update({[`flags.${ID}.pathChanging`]:catalog});await switchTo(w,w.alternate);
 assert.equal(w.hero.items.get(w.hero.getFlag(ID,'selectedLightConeItemId')).name,'Ice cone');assert.equal(w.hero.system.attributes.hp.value,3);assert.equal(w.hero.system.abilities.dex.value,20);assert.equal(w.hero.getFlag(ID,'eidolons').slots[0].title,'Saved progress');
 assert.equal(w.hero.items.filter(i=>i.name==='Ice cone').length,1);
});
test('an already-active old Path remembers its source cone when leaving, while recovery keeps the actual prior equipment',async()=>{
 const w=await world();await switchTo(w,w.alternate);const catalog=structuredClone(pathCatalog(w.hero));for(const p of catalog.profiles)delete p.snapshot.lightCone;
 await w.hero.update({[`flags.${ID}.pathChanging`]:catalog,[`flags.${ID}.selectedLightConeItemId`]:'coneA','system.attributes.hp.value':9});
 const token=w.token('linked');token.fail=true;await assert.rejects(switchTo(w,w.original),/previous Path was restored/);assert.equal(w.hero.getFlag(ID,'selectedLightConeItemId'),'coneA');
 await switchTo(w,w.original);assert.equal(w.hero.getFlag(ID,'selectedLightConeItemId'),'coneA');await switchTo(w,w.alternate);
 assert.equal(w.hero.items.get(w.hero.getFlag(ID,'selectedLightConeItemId')).name,'Ice cone');assert.equal(w.hero.system.attributes.hp.value,9);
});
