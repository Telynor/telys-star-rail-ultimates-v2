import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathWorld,ID,MEMO_MODULE,HookApi,collection} from './helpers/path-world.mjs';
import {pathCatalog,capturePathBuild,importPathBuild,materializePathBuild,rewriteBuildReferences,buildActorPatch,pathCatalogView,isSharedInventory} from '../scripts/path-change-rules.mjs';
import {applyPathRequest,requestPathChange,handlePathSocket,isChangingPath,installPathChanging} from '../scripts/path-changing.mjs';
import {renderPathChanger} from '../scripts/path-changing-ui.mjs';
const payload=(w,extra={})=>({actorId:w.hero.id,revision:pathCatalog(w.hero).revision,...extra});
async function imported(w){await applyPathRequest('import',payload(w,{sourceActorId:w.source.id}),w.gm);return pathCatalog(w.hero).profiles.find(p=>!p.original);}
const activate=(w,id,user=w.owner)=>applyPathRequest('switch',payload(w,{profileId:id}),user);

test('player rendering contains only selectable Paths and never reads the GM source-sheet catalog',async()=>{
  const w=pathWorld(),alt=await imported(w),view=pathCatalogView(w.hero,w.settings);
  view.profiles.push({...view.profiles[1],id:'hidden',name:'GM hidden build',enabled:false});
  const html=renderPathChanger({actor:w.hero,view,selectedId:alt.id,context:w.settings,isGM:false,manage:true,actors:{find(){throw Error('Player accessed source catalog');}}});
  assert.match(html,/data-path-choice=/);assert.match(html,/data-path-switch/);
  assert.doesNotMatch(html,/data-path-(?:manage|import|reimport|remove|save|field|browse|owner-enabled|in-combat|recover)|Import \/ Configure|Import from|Import to|GM hidden build/);
  const gm=renderPathChanger({actor:w.hero,view,context:w.settings,isGM:true,manage:true,actors:w.actors});
  assert.match(gm,/data-path-import-from/);assert.match(gm,/data-path-import-to/);assert.match(gm,/data-path-config-row/);
});

test('player clients reject every management action before emitting a GM request',async()=>{
  const w=pathWorld();game.user=w.owner;
  for(const action of ['import','update','settings','remove','reimport','recover'])await assert.rejects(requestPathChange(action,w.hero,{sourceActorId:w.source.id}),/Only the GM/);
  assert.equal(w.messages.length,0);assert.equal(pathCatalog(w.hero).profiles.length,0);
});

test('sidebar artwork, open sheets and owner macro synchronization refresh only after a durable Path commit',async()=>{
  const w=pathWorld(),alt=await imported(w),renders=[],sync=[];
  for(const key of ['actors','combat','players'])ui[key]={render:()=>renders.push({key,img:w.hero.img,pending:isChangingPath(w.hero)})};
  w.hero.apps.extra={render:()=>renders.push({key:'extra-sheet',img:w.hero.img,pending:isChangingPath(w.hero)})};
  installPathChanging({}, {synchronizeMacros:async actor=>{await new Promise(setImmediate);sync.push(actor.img);}});
  await activate(w,alt.id);
  assert.equal(renders.length,4);assert.ok(renders.every(row=>row.img==='alt-portrait.png'&&!row.pending));
  assert.deepEqual(sync,['alt-portrait.png'],'owner macros finish before the switch request resolves');
});

test('linked tokens use incoming enhanced artwork and its own normal art, including rollback and later Path switches',async()=>{
  const w=pathWorld(),token=w.token('linked'),independent=w.token('independent',{linked:false});
  await w.source.update({[`flags.${ID}.ultimate.enhancedStanceEnabled`]:true,[`flags.${ID}.ultimate.enhancedStanceActive`]:true,[`flags.${ID}.ultimate.enhancedTokenImage`]:'ice-enhanced.png'});
  const alt=await imported(w),original=pathCatalog(w.hero).activeId;await activate(w,alt.id);
  assert.equal(token.texture.src,'ice-enhanced.png');assert.equal(token.flags[ID].enhancedStanceOriginalToken.src,'alt-token.png');
  assert.equal(independent.texture.src,'custom-before.png');
  token.fail=true;await assert.rejects(activate(w,original),/previous Path was restored/);
  assert.equal(token.texture.src,'ice-enhanced.png');assert.equal(token.flags[ID].enhancedStanceOriginalToken.src,'alt-token.png');
  await activate(w,original);assert.equal(token.texture.src,'hero-token.png');assert.equal(token.flags[ID].enhancedStanceOriginalToken,undefined);
  await activate(w,alt.id);assert.equal(token.texture.src,'ice-enhanced.png');
});

test('all imported action, HUD, cinematic and initiative artwork is live on the changed character',async()=>{
  const w=pathWorld(),art={skillButtonImage:'skill.webp',ultimateButtonImage:'ult.webp',talentIcon:'talent.webp',techniqueButtonImage:'technique.webp',orbImage:'orb.webp',splashImage:'splash.webp',combatHudPortrait:'hud.webp',carouselImage:'initiative.webp',enhancedHudPortrait:'enhanced-hud.webp',enhancedSplashImage:'enhanced-splash.webp'};
  await w.source.update({[`flags.${ID}.ultimate`]:art});const alt=await imported(w);await activate(w,alt.id);
  for(const [key,value]of Object.entries(art))assert.equal(w.hero.getFlag(ID,'ultimate')[key],value,key);
  assert.equal(w.hero.img,'alt-portrait.png');assert.equal(w.hero.prototypeToken.texture.src,'alt-token.png');
});

test('Import from / Import to read the source Path and Element without switching or importing its inventory',async()=>{
  const w=pathWorld(),before=w.hero.toObject(),source=w.source.toObject(),alt=await imported(w),catalog=pathCatalog(w.hero);
  assert.equal(catalog.profiles.length,2);assert.equal(catalog.profiles.find(p=>p.original).id,catalog.activeId);
  assert.equal(alt.name,'Remembrance');assert.equal(alt.pathId,'remembrance');assert.equal(alt.elementId,'ice');assert.equal(alt.snapshot.items.length,4);assert.ok(alt.snapshot.items.every(i=>!isSharedInventory(i)));
  assert.deepEqual(w.hero.system,before.system);assert.deepEqual(w.inventory(),before.items.filter(isSharedInventory));assert.deepEqual(w.source.toObject(),source);
  const html=renderPathChanger({actor:w.hero,view:pathCatalogView(w.hero,w.settings),actors:w.actors,context:w.settings,isGM:true,manage:true,sourceActorId:w.source.id});assert.match(html,/>Import from</);assert.match(html,/>Import to</);assert.match(html,/Remembrance/);assert.match(html,/>Ice</);assert.match(html,/source inventory items excluded/);
});
test('switching replaces raw stats, class/subclass, spells, HSR abilities, Eidolons, Memosprite and art on the same Actor',async()=>{
  const w=pathWorld(),inventory=w.inventory(),source=w.source.toObject(),ownership=structuredClone(w.hero._source.ownership),alt=await imported(w);await activate(w,alt.id);
  assert.equal(w.hero.id,'hero');assert.equal(w.hero.name,'Hero');assert.deepEqual(w.hero._source.ownership,ownership);assert.equal(w.hero.system.abilities.dex.value,18);assert.equal(w.hero.system.attributes.hp.max,50);
  assert.equal(w.hero.items.find(i=>i.type==='class').name,'Wizard');assert.equal(w.hero.items.find(i=>i.type==='subclass').name,'Ice School');assert.equal(w.hero.items.find(i=>i.type==='spell').name,'Ice spell');assert.ok(!w.hero.items.get('class'));
  assert.equal(w.hero.getFlag(ID,'ultimate').skillText,'Ice Skill');assert.equal(w.hero.getFlag(ID,'eidolons').slots[0].active,true);assert.equal(w.hero.getFlag(MEMO_MODULE,'config').name,'Ice Spirit');assert.equal(w.hero.getFlag(MEMO_MODULE,'config').summoned,false);
  assert.equal(w.hero.img,'alt-portrait.png');assert.equal(w.hero.prototypeToken.texture.src,'alt-token.png');assert.equal(w.hero.getFlag(ID,'partySetupArtwork')[0].image,'alt-standing.png');
  assert.deepEqual(w.inventory(),inventory);assert.equal(w.hero.system.currency.gp,14);assert.equal(w.hero.getFlag(ID,'selectedLightConeItemId'),'');assert.deepEqual(w.source.toObject(),source);
  assert.equal(w.hero.getFlag(ID,'ultimate').mainParty,true);assert.equal(w.hero.getFlag(ID,'ultimate').trialCharacter,false);assert.equal(w.hero.getFlag(ID,'ultimate').partyGMOverride,true);assert.equal(w.hero.getFlag(ID,'ultimate').unlockingItem,null);assert.deepEqual(w.hero.flags.otherAddon,{sharedCharacterNote:'Do not overwrite'});
});
test('gear quantities, charges, equipped state, containers and currency stay shared across repeated path changes',async()=>{
  const w=pathWorld(),alt=await imported(w),original=pathCatalog(w.hero).activeId,sword=w.hero.items.get('sword');await activate(w,alt.id);
  await w.hero.items.get('arrows').update({'system.quantity':12});await sword.update({'system.uses.spent':4,'system.equipped':false});await w.hero.update({'system.currency.gp':3});
  await w.hero.createEmbeddedDocuments('Item',[{_id:'new-loot',name:'New loot',type:'loot',system:{quantity:2,container:'bag'}}]);
  await activate(w,original);await activate(w,alt.id);
  assert.equal(w.hero.items.get('sword'),sword);assert.equal(sword.system.uses.spent,4);assert.equal(sword.system.equipped,false);assert.equal(w.hero.items.get('arrows').system.quantity,12);assert.equal(w.hero.items.get('arrows').system.container,'bag');assert.equal(w.hero.items.get('new-loot').system.quantity,2);assert.equal(w.hero.system.currency.gp,3);
  assert.equal(w.hero.items.filter(isSharedInventory).length,4);assert.ok(!w.hero.items.get('sourceweapon'));
});
test('each Path retains spent HP, Energy, feature charges, spells and Eidolon progression when returning',async()=>{
  const w=pathWorld(),alt=await imported(w),original=pathCatalog(w.hero).activeId;await activate(w,alt.id);
  await w.hero.update({'system.attributes.hp.value':8,[`flags.${ID}.ultimate.current`]:5,[`flags.${ID}.eidolons.slots`]:[{number:1,active:false}]});await w.hero.items.get('altfeat').update({'system.uses.spent':3});
  await activate(w,original);assert.equal(w.hero.system.attributes.hp.value,34);assert.equal(w.hero.getFlag(ID,'ultimate').current,70);assert.equal(w.hero.getFlag(ID,'eidolons').slots[0].active,false);
  await activate(w,alt.id);assert.equal(w.hero.system.attributes.hp.value,8);assert.equal(w.hero.getFlag(ID,'ultimate').current,5);assert.equal(w.hero.items.get('altfeat').system.uses.spent,3);assert.equal(w.hero.getFlag(ID,'eidolons').slots[0].active,false);
});
test('feature IDs colliding with shared gear are remapped consistently, including advancements and consumption',async()=>{
  const w=pathWorld(),alt=await imported(w);await activate(w,alt.id);const cls=w.hero.items.find(i=>i.type==='class'),feat=w.hero.items.get('altfeat');
  assert.notEqual(cls.id,'sword');assert.equal(w.hero.system.details.originalClass,cls.id);assert.equal(feat.flags.dnd5e.advancementOrigin,cls.id+'.adv');assert.equal(feat.system.activities.hit.consumption.targets[0].target,cls.id);assert.equal(feat.system.activities.hit.consumption.targets[1].target,'arrows');
  assert.equal(w.hero.getFlag(ID,'ultimate').skillSpell.spellUuid,'Actor.hero.Item.altspell');assert.equal(w.hero.effects.get('alteffect').origin,'Actor.hero.Item.altfeat');assert.ok(w.hero.items.get('sword').type==='weapon');assert.ok(cls.system.advancement.adv.value.added.altfeat);
});
test('imports detach unavailable source inventory targets and report the names without copying source gear',()=>{
  const w=pathWorld();w.source.items.get('altfeat')._source.system.activities.hit.consumption.targets[1].target='sourceweapon';const snap=importPathBuild(w.source,w.hero,{randomID:()=>foundry.utils.randomID()});
  assert.equal(snap.items.find(i=>i._id==='altfeat').system.activities.hit.consumption.targets[1].target,'');assert.match(snap.warnings.join(' '),/Source weapon/);assert.ok(!snap.items.some(i=>i.type==='weapon'));
});
test('equipment effects and shared inventory favorites survive without importing source equipment buffs',async()=>{
  const w=pathWorld(),gearEffect=w.hero.effects.get('geareffect'),alt=await imported(w);await activate(w,alt.id);
  assert.equal(w.hero.effects.get('geareffect'),gearEffect);assert.ok(!w.hero.effects.get('sourcegeareffect'));assert.ok(w.hero.system.favorites.some(f=>f.id==='.Item.arrows'));assert.ok(w.hero.system.favorites.some(f=>f.id==='.Item.altspell'));assert.ok(!w.hero.system.favorites.some(f=>f.id==='.Item.spell'));
});
test('snapshots use document source stats, avoiding repeated prepared gear bonuses',()=>{
  const w=pathWorld();w.hero.preparedSystem=structuredClone(w.hero._source.system);w.hero.preparedSystem.attributes.hp.max=999;assert.equal(capturePathBuild(w.hero).system.attributes.hp.max,42);
});
test('active Element changes and level-ups are saved per Path and shown live in its preview',async()=>{
  const w=pathWorld(),alt=await imported(w),original=pathCatalog(w.hero).activeId;await activate(w,alt.id);
  await w.hero.update({[`flags.${ID}.ultimate.elementId`]:'wind'});await w.hero.items.find(item=>item.type==='class').update({'system.levels':8});
  const view=pathCatalogView(w.hero,w.settings).profiles.find(p=>p.id===alt.id);assert.equal(view.elementId,'wind');assert.equal(view.level,8);
  await activate(w,original);await activate(w,alt.id);assert.equal(w.hero.getFlag(ID,'ultimate').elementId,'wind');assert.equal(w.hero.items.find(item=>item.type==='class').system.levels,8);
});
test('other inventory types stay shared and imported features inherit the destination ownership',async()=>{
  const w=pathWorld();await w.hero.createEmbeddedDocuments('Item',[{_id:'custom',name:'Custom inventory',type:'facility',system:{uses:{spent:1,max:3}}}]);w.source.items.get('altfeat')._source.ownership={default:0,gm:3};
  const alt=await imported(w),original=pathCatalog(w.hero).activeId;await activate(w,alt.id);assert.equal(w.hero.items.get('custom').system.uses.spent,1);assert.ok(!w.hero.items.get('altfeat').toObject().ownership);await activate(w,original);assert.equal(w.hero.items.get('custom').system.uses.spent,1);
});
test('a new shared gear collision after import is resolved without replacing that inventory document',async()=>{
  const w=pathWorld(),alt=await imported(w);await w.hero.createEmbeddedDocuments('Item',[{_id:'altfeat',name:'Acquired gear',type:'equipment',system:{quantity:1}}]);await activate(w,alt.id);
  assert.equal(w.hero.items.get('altfeat').type,'equipment');const feat=w.hero.items.find(i=>i.name==='Ice Skill');assert.notEqual(feat.id,'altfeat');assert.equal(w.hero.effects.get('alteffect').origin,`Actor.hero.Item.${feat.id}`);
});
test('nonowners, NPCs and token Actors cannot request a character Path change',async()=>{
  const w=pathWorld(),alt=await imported(w);await assert.rejects(activate(w,alt.id,w.stranger),/owner/);
  w.hero.isToken=true;await assert.rejects(activate(w,alt.id,w.gm),/world character/);w.hero.isToken=false;w.hero._source.type='npc';await assert.rejects(activate(w,alt.id,w.gm),/world character/);
});
test('only the GM configures imports, visibility, preview art and combat permissions',async()=>{
  const w=pathWorld(),alt=await imported(w);for(const action of ['import','update','settings','remove','reimport'])await assert.rejects(applyPathRequest(action,payload(w,{sourceActorId:w.source.id,profileId:alt.id}),w.owner),/Only the GM/);
  await applyPathRequest('settings',payload(w,{ownerEnabled:false,allowInCombat:false}),w.gm);await assert.rejects(activate(w,alt.id),/not available/);await activate(w,alt.id,w.gm);
});
test('queued and concurrent changes reject stale revisions instead of duplicating inventory',async()=>{
  const w=pathWorld(),alt=await imported(w),p=payload(w,{profileId:alt.id}),before=w.inventory();
  const result=await Promise.allSettled([applyPathRequest('switch',p,w.owner),applyPathRequest('switch',p,w.owner)]);assert.equal(result[0].status,'fulfilled');assert.equal(result[1].status,'rejected');assert.match(result[1].reason.message,/Reopen/);assert.deepEqual(w.inventory(),before);
  const calls=w.hero.calls.length;await activate(w,alt.id);assert.equal(w.hero.calls.length,calls,'reselecting the active Path does not reset or rewrite it');
});
test('the GM can rename art and assigned Path/Element, hide an inactive build and reimport its source',async()=>{
  const w=pathWorld(),alt=await imported(w);await applyPathRequest('update',payload(w,{profileId:alt.id,name:'Ice build',previewImage:'custom.png',pathId:'hunt',elementId:'wind',enabled:false}),w.gm);
  let saved=pathCatalog(w.hero).profiles.find(p=>p.id===alt.id);assert.equal(saved.previewImage,'custom.png');assert.equal(saved.pathId,'hunt');await assert.rejects(activate(w,alt.id),/not available/);
  w.source._source.system.abilities.dex.value=20;await applyPathRequest('reimport',payload(w,{profileId:alt.id}),w.gm);saved=pathCatalog(w.hero).profiles.find(p=>p.id===alt.id);assert.equal(saved.snapshot.system.abilities.dex.value,20);assert.equal(saved.pathId,'remembrance');assert.equal(saved.elementId,'ice');assert.equal(saved.name,'Ice build');
  await activate(w,alt.id);assert.equal(w.hero.system.abilities.dex.value,20);await assert.rejects(applyPathRequest('remove',payload(w,{profileId:alt.id}),w.gm),/active one/);await assert.rejects(applyPathRequest('reimport',payload(w,{profileId:alt.id}),w.gm),/Switch to another/);
});
test('combat changes are GM-configurable, preserve initiative, and refuse resolving abilities or active summons',async()=>{
  const w=pathWorld(),alt=await imported(w),turn={id:'turn',actorId:w.hero.id,actor:w.hero,initiative:17};w.combats.push({id:'combat',started:true,combatants:[turn]});
  await assert.rejects(activate(w,alt.id),/during combat are disabled/);await applyPathRequest('settings',payload(w,{ownerEnabled:true,allowInCombat:true}),w.gm);
  w.controls.resolving=true;await assert.rejects(activate(w,alt.id),/resolving or queued/);w.controls.resolving=false;w.controls.summon={id:'summon'};await assert.rejects(activate(w,alt.id),/Dismiss/);w.controls.summon=null;
  await activate(w,alt.id);assert.equal(w.combats[0].combatants[0],turn);assert.equal(turn.initiative,17);
});
test('linked map tokens update art and size while synthetic token Actors and scene placement remain intact',async()=>{
  const w=pathWorld(),token=w.token('linked'),synthetic=w.token('unlinked',{linked:false}),alt=await imported(w);await activate(w,alt.id);
  assert.equal(token.texture.src,'alt-token.png');assert.equal(token.width,2);assert.equal(token.height,3);assert.equal(token.x,200);assert.equal(token.y,300);assert.equal(token.elevation,5);assert.equal(token.actorId,'hero');assert.equal(synthetic.texture.src,'custom-before.png');
});
test('partial feature creation rolls back the previous build, flags and token art without touching inventory',async()=>{
  const w=pathWorld(),token=w.token('linked'),alt=await imported(w),before=capturePathBuild(w.hero),inventory=w.inventory(),revision=pathCatalog(w.hero).revision;
  w.hero.failCreates=1;await assert.rejects(activate(w,alt.id),/previous Path was restored/);assert.deepEqual(capturePathBuild(w.hero),before);assert.deepEqual(w.inventory(),inventory);assert.equal(token.texture.src,'custom-before.png');assert.equal(pathCatalog(w.hero).revision,revision);assert.equal(isChangingPath(w.hero),false);
});
test('a rejected feature create or failed token update also restores the previous Path',async()=>{
  for(const kind of ['reject','token']){const w=pathWorld(),token=w.token('linked'),alt=await imported(w),before=capturePathBuild(w.hero);if(kind==='reject')w.hero.rejectCreates=true;else token.fail=true;await assert.rejects(activate(w,alt.id),/previous Path was restored/);assert.deepEqual(capturePathBuild(w.hero),before);}
});
test('failed rollback leaves a durable GM recovery action, guards edits and restores after retry',async()=>{
  const w=pathWorld(),alt=await imported(w),before=capturePathBuild(w.hero),inventory=w.inventory();w.hero.failCreates=2;
  await assert.rejects(activate(w,alt.id),/Restore previous Path/);assert.ok(pathCatalog(w.hero).pending);assert.equal(isChangingPath(w.hero),true);
  await w.hero.items.get('arrows').update({'system.quantity':0});assert.equal(w.hero.items.get('arrows').system.quantity,30);await w.hero.update({'system.currency.gp':0});assert.equal(w.hero.system.currency.gp,14);
  await assert.rejects(activate(w,alt.id),/needs recovery/);await assert.rejects(applyPathRequest('recover',payload(w),w.owner),/Only the GM/);
  await applyPathRequest('recover',payload(w),w.gm);assert.deepEqual(capturePathBuild(w.hero),before);assert.deepEqual(w.inventory(),inventory);assert.equal(pathCatalog(w.hero).pending,null);
});
test('a failed initial catalog write performs no destructive feature changes',async()=>{
  const w=pathWorld(),alt=await imported(w),before=w.hero.toObject();w.hero.calls=[];w.hero.failUpdates=1;await assert.rejects(activate(w,alt.id),/Actor update failed/);assert.deepEqual(w.hero.toObject(),before);assert.ok(!w.hero.calls.some(call=>call.type.startsWith('delete')));
});
test('recovering a preview.28 switch interrupted after feature deletion restores the saved original build',async()=>{
  const w=pathWorld(),token=w.token('linked'),alt=await imported(w),catalog=structuredClone(pathCatalog(w.hero)),before=capturePathBuild(w.hero),inventory=w.inventory();
  const pending={fromId:catalog.activeId,toId:alt.id,before,tokens:[{sceneId:token.parent.id,tokenId:token.id,before:{texture:{src:'custom-before.png'},width:1,height:1}}],error:''};
  await w.hero.update({[`flags.${ID}.pathChanging`]:{...catalog,pending}},{tsruPathChange:true});
  await w.hero.deleteEmbeddedDocuments('Item',w.hero.items.filter(item=>!isSharedInventory(item)).map(item=>item.id),{tsruPathChange:true});
  await w.hero.deleteEmbeddedDocuments('ActiveEffect',['effect'],{tsruPathChange:true});
  assert.equal(w.hero.items.some(item=>item.type==='class'),false);assert.equal(isChangingPath(w.hero),true);
  await applyPathRequest('recover',payload(w),w.gm);
  assert.deepEqual(capturePathBuild(w.hero),before);assert.deepEqual(w.inventory(),inventory);assert.equal(pathCatalog(w.hero).pending,null);assert.equal(pathCatalog(w.hero).activeId,catalog.activeId);assert.equal(token.texture.src,'custom-before.png');
  await activate(w,alt.id);await activate(w,catalog.activeId);assert.deepEqual(capturePathBuild(w.hero),before);
  const calls=w.hero.calls.filter(call=>call.opts.tsruPathChange);
  assert.equal(new Set(calls.map(call=>call.opts)).size,calls.length,'each database call owns its operation object');
  assert.ok(calls.filter(call=>call.type==='update').every(call=>call.opts.parent===null&&call.opts.documentName==='Actor'));
});
test('simultaneous character switches and subsequent imports cannot inherit another Actor or token parent',async()=>{
  const w=pathWorld(),heroInventory=w.inventory(),sourceInventory=w.source.items.filter(isSharedInventory).map(item=>item.toObject()),alt=await imported(w);w.token('linked');
  await applyPathRequest('import',{actorId:w.source.id,revision:0,sourceActorId:w.hero.id},w.gm);
  const sourceAlt=pathCatalog(w.source).profiles.find(p=>!p.original);
  await Promise.all([activate(w,alt.id),applyPathRequest('switch',{actorId:w.source.id,revision:pathCatalog(w.source).revision,profileId:sourceAlt.id},w.gm)]);
  assert.equal(w.hero.items.find(i=>i.type==='class').name,'Wizard');assert.equal(w.source.items.find(i=>i.type==='class').name,'Fighter');
  assert.deepEqual(w.inventory(),heroInventory);assert.deepEqual(w.source.items.filter(isSharedInventory).map(item=>item.toObject()),sourceInventory);
  await applyPathRequest('import',payload(w,{sourceActorId:w.source.id}),w.gm);assert.equal(pathCatalog(w.hero).profiles.length,3);
});
test('reference rewriting handles keyed grants and UUID links without changing unrelated compendium references',()=>{
  const data={old:'old.adv',origin:'Actor.source.Item.old',description:'@UUID[Actor.source.Item.old]{Feature}',compendium:'Compendium.spells.Item.old'};
  assert.deepEqual(rewriteBuildReferences(data,{sourceUuid:'Actor.source',targetUuid:'Actor.hero',itemIds:new Map([['old','new']])}),{new:'new.adv',origin:'Actor.hero.Item.new',description:'@UUID[Actor.hero.Item.new]{Feature}',compendium:'Compendium.spells.Item.old'});
  assert.equal(rewriteBuildReferences('Actor.source2.Item.old',{sourceUuid:'Actor.source',targetUuid:'Actor.hero',itemIds:new Map([['old','new']])}),'Actor.source2.Item.old');
});
test('malformed stored builds cannot inject shared inventory, and replacement removes stale bonuses',()=>{
  const w=pathWorld(),snapshot=capturePathBuild(w.source);snapshot.items.push({_id:'gear',type:'weapon'});assert.throws(()=>materializePathBuild(snapshot,w.hero,{randomID:()=>foundry.utils.randomID()}),/shared inventory/);
  const before=capturePathBuild(w.hero);w.hero._source.system.abilities.str.oldBonus=10;assert.equal(buildActorPatch(w.hero,before).system.abilities.str['-=oldBonus'],null);
});
test('player socket requests accept results only from the elected GM and never send an arbitrary snapshot',async()=>{
  const w=pathWorld(),alt=await imported(w);game.user=w.owner;const work=requestPathChange('switch',w.hero,{revision:pathCatalog(w.hero).revision,profileId:alt.id}),request=w.messages.at(-1);assert.ok(!request.payload.snapshot);
  await handlePathSocket({type:'pathChangeResult',targetUserId:w.owner.id,sourceUserId:'forged',requestId:request.requestId,result:{activeId:'forged'}});
  game.user=w.gm;await handlePathSocket(request);const response=w.messages.at(-1);game.user=w.owner;await handlePathSocket(response);const result=await work;assert.equal(result.activeId,alt.id);assert.ok(result.profiles.every(p=>!p.snapshot));
});
