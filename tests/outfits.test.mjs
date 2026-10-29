import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathWorld,ID,HookApi,collection} from './helpers/path-world.mjs';
import {normalizeOutfit,normalizeOutfitLibrary,outfitAvailability,outfitState,activeOutfitPath,outfitConfig,outfitPhonePose,selectedOutfit} from '../scripts/outfit-rules.mjs';
import {installOutfits,applyOutfitRequest,requestOutfitChange,handleOutfitSocket,syncOutfitAppearance,resolveOutfitConfig} from '../scripts/outfits.mjs';
import {applyPathRequest} from '../scripts/path-changing.mjs';
import {pathCatalog,capturePathBuild} from '../scripts/path-change-rules.mjs';
import {renderOutfits} from '../scripts/outfits-ui.mjs';
const settle=async()=>{for(let i=0;i<20;i++)await new Promise(setImmediate);};
function world(){const w=pathWorld();w.settings.outfitLibrary={revision:0,outfits:[]};game.settings.set=async(_id,key,value)=>{w.settings[key]=structuredClone(value);HookApi.callAll('updateSetting',{key:ID+'.'+key});return value;};globalThis.fromUuid=async uuid=>game.items?.get?.(uuid.replace(/^Item\./,''))??w.actors.flatMap(a=>a.items).find(i=>i.uuid===uuid);installOutfits({},{});return w;}
function put(w,data={}){const outfit=normalizeOutfit({id:'gala',name:'Gala',actorIds:['hero'],profiles:[{actorId:'hero',pathKey:'original',normal:{art:{portrait:{image:'gala-portrait.png'},token:{image:'gala-token.png',scale:120,x:40,y:60},phone:{image:'gala-phone.png'},splash:{image:'gala-splash.png'},hud:{image:'gala-hud.png'}},icons:{skill:{custom:true,image:'gala-skill.png'}}}}],...data});w.settings.outfitLibrary.outfits.push(outfit);return outfit;}
const equip=(w,id='gala',user=w.owner)=>applyOutfitRequest('equip',{actorId:'hero',pathKey:activeOutfitPath(w.hero),revision:outfitState(w.hero).revision,outfitId:id},user);
const path=(w,action,data={})=>applyPathRequest(action,{actorId:'hero',revision:pathCatalog(w.hero).revision,...data},w.gm);

test('inventory unlocks match identity and positive quantity on the assigned character, never names or another inventory',async()=>{
 const w=world(),o=put(w,{unlockingItem:{uuid:'Compendium.gear.Item.arrows',name:'Gala ticket'}});
 assert.equal(outfitAvailability(o,w.hero).available,true);assert.equal(outfitAvailability(o,w.source).assigned,false);
 await w.hero.items.get('arrows').update({'system.quantity':0});await settle();assert.equal(outfitAvailability(o,w.hero).unlocked,false);
 await w.hero.items.get('arrows').update({'system.quantity':1});await settle();assert.equal(outfitAvailability(o,w.hero).unlocked,true);
 const byName=put(w,{id:'fake',unlockingItem:{uuid:'Item.different',name:'Shared arrows'}});assert.equal(outfitAvailability(byName,w.hero).unlocked,false);
 await assert.rejects(equip(w,'fake'),/Requires Shared arrows/);assert.equal(outfitState(w.hero).selections.original,undefined);
});
test('equipping refreshes actor and linked token artwork while keeping raw Path settings, resources and equipment intact; defaults restore exact art',async()=>{
 const w=world(),token=w.token('linked'),unlinked=w.token('unlinked',{linked:false}),inventory=w.inventory(),system=structuredClone(w.hero.system),raw=structuredClone(w.hero.getFlag(ID,'ultimate'));put(w);const sameImage=w.token('existing-same-image');await sameImage.update({texture:{...w.hero.prototypeToken.texture,src:'gala-token.png',scaleX:2,scaleY:2}});
 await equip(w);assert.equal(w.hero.img,'gala-portrait.png');assert.equal(token.texture.src,'gala-token.png');assert.equal(token.texture.scaleX,1.2);assert.equal(token.texture.anchorX,.6);assert.equal(unlinked.texture.src,'custom-before.png');
 assert.equal(resolveOutfitConfig(w.hero,raw).splashImage,'gala-splash.png');assert.equal(resolveOutfitConfig(w.hero,raw).skillButtonImage,'gala-skill.png');assert.deepEqual(w.hero.getFlag(ID,'ultimate'),raw);assert.deepEqual(w.hero.system,system);assert.deepEqual(w.inventory(),inventory);
 const snapshot=capturePathBuild(w.hero);assert.equal(snapshot.img,'hero.png');assert.equal(snapshot.token.texture.src,'hero-token.png');assert.equal(snapshot.flags[ID].outfits,undefined);
 await equip(w,'');assert.equal(w.hero.img,'hero.png');assert.equal(w.hero.prototypeToken.texture.src,'hero-token.png');assert.equal(token.texture.src,'custom-before.png');assert.equal(token.texture.scaleX,1);assert.equal(token.flags[ID].outfitOriginalTexture,undefined);assert.equal(sameImage.texture.src,'gala-token.png');assert.equal(sameImage.texture.scaleX,2);
});
test('normal and enhanced icons inherit their own Path until their individual custom checkboxes are enabled',async()=>{
 const w=world(),outfit=put(w),raw={skillButtonImage:'path-skill.png',ultimateButtonImage:'path-ult.png',talentIcon:'path-talent.png',techniqueButtonImage:'path-tech.png',enhancedStanceEnabled:true,enhancedStanceActive:true,enhancedSkillButtonImage:'path-enhanced-skill.png'};
 w.hero.flags[ID].outfits={selections:{original:'gala'}};
 const config=outfitConfig(w.hero,raw,w.settings.outfitLibrary);assert.equal(config.skillButtonImage,'gala-skill.png');assert.equal(config.enhancedSkillButtonImage,'path-enhanced-skill.png');assert.equal(config.enhancedTalentIcon,'path-talent.png');assert.equal(config.techniqueButtonImage,'path-tech.png');
 outfit.profiles[0].enhanced.icons.technique={custom:true,image:'gala-enhanced-technique.png'};assert.equal(outfitConfig(w.hero,raw,w.settings.outfitLibrary).enhancedTechniqueButtonImage,'gala-enhanced-technique.png');
 outfit.profiles[0].normal.icons.skill.custom=false;assert.equal(outfitConfig(w.hero,raw,w.settings.outfitLibrary).skillButtonImage,'path-skill.png');
 assert.equal(outfitPhonePose(w.hero,{image:'base.png'},w.settings.outfitLibrary).image,'gala-phone.png');
});
test('enhanced costume artwork follows the enabled stance and restores normal appearance without modifying the stance or Ultimate rules',async()=>{
 const w=world(),o=put(w),token=w.token('hero');Object.assign(o.profiles[0].enhanced.art,{portrait:{image:'enhanced-portrait.png'},token:{image:'enhanced-token.png',x:50,y:50,scale:150},phone:{image:'enhanced-phone.png'}});
 await w.hero.update({[`flags.${ID}.ultimate.enhancedStanceEnabled`]:true,[`flags.${ID}.ultimate.enhancedTokenImage`]:'path-enhanced.png'});await settle();await equip(w);
 await w.hero.update({[`flags.${ID}.ultimate.enhancedStanceActive`]:true});await settle();assert.equal(w.hero.img,'enhanced-portrait.png');assert.equal(token.texture.src,'enhanced-token.png');assert.equal(token.texture.scaleX,1.5);assert.equal(w.hero.prototypeToken.texture.src,'gala-token.png');
 await w.hero.update({[`flags.${ID}.ultimate.enhancedStanceActive`]:false});await settle();assert.equal(w.hero.img,'gala-portrait.png');assert.equal(token.texture.src,'gala-token.png');assert.equal(token.texture.scaleX,1.2);
 await equip(w,'');assert.equal(token.texture.src,'custom-before.png');
});
test('item removal relocks an equipped outfit and restores Path art; reacquiring the same item reactivates the saved selection',async()=>{
 const w=world();put(w,{unlockingItem:{uuid:'Compendium.gear.Item.arrows',name:'Gala ticket'}});await equip(w);
 await w.hero.items.get('arrows').update({'system.quantity':0});await settle();assert.equal(w.hero.img,'hero.png');assert.equal(selectedOutfit(w.hero,w.settings.outfitLibrary),null);assert.equal(outfitState(w.hero).selections.original,'gala');
 await w.hero.items.get('arrows').update({'system.quantity':1});await settle();assert.equal(w.hero.img,'gala-portrait.png');
});
test('outfit selection survives importing and repeated Path changes without writing costume artwork into saved builds',async()=>{
 const w=world(),o=put(w);w.token('hero');await equip(w);await path(w,'import',{sourceActorId:'source'});await settle();const catalog=pathCatalog(w.hero),alt=catalog.profiles.find(p=>!p.original),original=catalog.activeId;
 o.profiles.push({...structuredClone(o.profiles[0]),pathKey:alt.id});o.profiles[1].normal.art.portrait.image='ice-gala.png';
 await path(w,'switch',{profileId:alt.id});await settle();assert.equal(w.hero.img,'alt-portrait.png');assert.equal(outfitState(w.hero).selections.original,'gala');await equip(w);assert.equal(w.hero.img,'ice-gala.png');
 w.actors.splice(w.actors.indexOf(w.source),1);await path(w,'switch',{profileId:original});await settle();assert.equal(w.hero.img,'gala-portrait.png');assert.equal(pathCatalog(w.hero).profiles.find(p=>p.id===alt.id).snapshot.img,'alt-portrait.png');
 await path(w,'switch',{profileId:alt.id});await settle();assert.equal(w.hero.img,'ice-gala.png');await equip(w,'');assert.equal(w.hero.img,'alt-portrait.png');
});
test('server enforces owner selection, GM-only management, fresh revisions, profile compatibility and inventory locks',async()=>{
 const w=world();put(w);await assert.rejects(equip(w,'gala',w.stranger),/owner or GM/);
 await assert.rejects(applyOutfitRequest('save',{revision:0,outfit:{}},w.owner),/Only the GM/);game.user=w.owner;await assert.rejects(requestOutfitChange('remove',w.hero,{outfitId:'gala'}),/Only the GM/);assert.equal(w.messages.length,0);game.user=w.gm;
 await assert.rejects(applyOutfitRequest('equip',{actorId:'hero',revision:99,pathKey:'original',outfitId:'gala'},w.owner),/Reopen/);
 await assert.rejects(applyOutfitRequest('equip',{actorId:'hero',revision:0,pathKey:'different',outfitId:'gala'},w.owner),/Reopen/);
 w.hero.flags[ID].pathChanging={pending:{fromId:'x'}};await assert.rejects(equip(w),/Path change finishes/);
});
test('GM saves sanitize profiles and resolve the actual unlocking Item instead of accepting forged identity keys',async()=>{
 const w=world(),ticket={id:'ticket',uuid:'Item.ticket',documentName:'Item',name:'Gala permit',img:'permit.png',type:'loot'};game.items=collection([ticket]);
 const result=await applyOutfitRequest('save',{revision:0,outfit:{name:'Gala',actorIds:['hero'],unlockingItem:{uuid:'Item.ticket',keys:['Compendium.gear.Item.arrows']},profiles:[{actorId:'hero',pathKey:'original',normal:{art:{splash:{image:'javascript:alert(1)'}},max:999,ultimateScript:'bad'}}]}},w.gm);await settle();
 assert.equal(result.outfits[0].unlockingItem.name,'Gala permit');assert.deepEqual(result.outfits[0].unlockingItem.keys,['Item.ticket']);assert.equal(result.outfits[0].profiles[0].normal.art.splash.image,'');assert.equal(result.outfits[0].profiles[0].normal.max,undefined);
 await assert.rejects(applyOutfitRequest('save',{revision:0,outfit:result.outfits[0]},w.gm),/Reload/);
});
test('player markup contains only choices and inventory requirements; GM editing and enhanced controls are absent',()=>{
 const w=world(),o=put(w);const base={actor:w.hero,view:{outfits:[{...o,...outfitAvailability(o,w.hero)}],selectedId:'',pathKey:'original'},paths:[{key:'original',name:'Hunt',active:true,config:{}}],pathKey:'original'};
 const player=renderOutfits({...base,isGM:false,manage:true,draft:o});assert.doesNotMatch(player,/data-outfit-(?:save|new|delete|character|art-field|custom-icon|unlock-drop|manage|library)/);assert.match(player,/data-outfit-equip/);
 const gm=renderOutfits({...base,isGM:true,manage:true,draft:o,actors:w.actors});assert.match(gm,/Custom skill icon/);assert.doesNotMatch(gm,/<option value="enhanced"/);base.paths[0].config.enhancedStanceEnabled=true;assert.match(renderOutfits({...base,isGM:true,manage:true,draft:o,actors:w.actors}),/<option value="enhanced"/);
});
test('owner socket equip accepts a result only from the elected GM',async()=>{
 const w=world();put(w);game.user=w.owner;const waiting=requestOutfitChange('equip',w.hero,{revision:0,pathKey:'original',outfitId:'gala'}),request=w.messages.pop();let done=false;waiting.then(()=>{done=true;});
 await handleOutfitSocket({type:'outfitResult',requestId:request.requestId,targetUserId:'owner',sourceUserId:'stranger',result:'forged'});await Promise.resolve();assert.equal(done,false);
 game.user=w.gm;await handleOutfitSocket(request);const response=w.messages.pop();game.user=w.owner;await handleOutfitSocket(response);assert.equal((await waiting).selectedId,'gala');game.user=w.gm;
});
test('a failed token update restores the previous selection and artwork without consuming inventory',async()=>{
 const w=world(),token=w.token('hero'),inventory=w.inventory();put(w);token.fail=true;
 await assert.rejects(equip(w),/Token update failed/);assert.equal(outfitState(w.hero).selections.original,'');assert.equal(w.hero.img,'hero.png');assert.equal(token.texture.src,'custom-before.png');assert.deepEqual(w.inventory(),inventory);
});
test('reconciling an already applied outfit makes no further actor writes',async()=>{
 const w=world();w.token('hero');put(w);await equip(w);const writes=w.hero.calls.length;await syncOutfitAppearance(w.hero);await syncOutfitAppearance(w.hero);assert.equal(w.hero.calls.length,writes);
});
test('an owner can clear a remembered locked outfit and stay on Path default after reacquiring the item',async()=>{
 const w=world();put(w,{unlockingItem:{uuid:'Compendium.gear.Item.arrows',name:'Gala ticket'}});await equip(w);await w.hero.items.get('arrows').update({'system.quantity':0});await settle();
 await equip(w,'');await w.hero.items.get('arrows').update({'system.quantity':1});await settle();assert.equal(w.hero.img,'hero.png');assert.equal(outfitState(w.hero).selections.original,'');
});
test('tokens placed while wearing an outfit restore the Path baseline, including an active enhanced stance',async()=>{
 for(const enhanced of [false,true]){
  const w=world();put(w);if(enhanced)await w.hero.update({[`flags.${ID}.ultimate.enhancedStanceEnabled`]:true,[`flags.${ID}.ultimate.enhancedStanceActive`]:true,[`flags.${ID}.ultimate.enhancedTokenImage`]:'path-enhanced-token.png'});await settle();await equip(w);
  const token=w.token('new-token');await token.update({texture:structuredClone(w.hero.prototypeToken.texture)});await syncOutfitAppearance(w.hero);assert.equal(token.flags[ID].outfitOriginalTexture.texture.src,'hero-token.png');
  await equip(w,'');assert.equal(token.texture.src,enhanced?'path-enhanced-token.png':'hero-token.png');assert.equal(token.flags[ID].outfitOriginalTexture,undefined);
 }
});

test('Any Path profile stays equipped across switches, uses only the assigned inventory and restores each Path default',async()=>{
 const w=world(),o=put(w,{unlockingItem:{uuid:'Compendium.gear.Item.arrows',name:'Gala ticket'}});o.profiles[0].pathKey='*';
 await applyOutfitRequest('save',{revision:0,outfit:o},w.gm);
 await equip(w);assert.equal(outfitState(w.hero).selections['*'],'gala');
 await path(w,'import',{sourceActorId:'source'});await settle();const catalog=pathCatalog(w.hero),alt=catalog.profiles.find(p=>!p.original),original=catalog.activeId;
 await path(w,'switch',{profileId:alt.id});await settle();assert.equal(w.hero.img,'gala-portrait.png');
 assert.equal(selectedOutfit(w.hero,w.settings.outfitLibrary).profile.pathKey,'*');
 await w.hero.items.get('arrows').update({'system.quantity':0});await settle();assert.equal(w.hero.img,'alt-portrait.png');
 await w.hero.items.get('arrows').update({'system.quantity':1});await settle();assert.equal(w.hero.img,'gala-portrait.png');
 await equip(w,'');assert.equal(w.hero.img,'alt-portrait.png');assert.equal(outfitState(w.hero).selections['*'],'');
 await path(w,'switch',{profileId:original});await settle();assert.equal(w.hero.img,'hero.png');
});
test('four lineup slots inherit settings, override independently, refresh, and restore without changing original artwork',async()=>{
 const {partyArtworkFor}=await import('../scripts/party-setup-rules.mjs');
 const {inheritedOutfitArt}=await import('../scripts/outfits-ui.mjs');
 const w=world(),original=Array.from({length:4},(_,i)=>({image:`base-${i}.png`,x:30+i,y:70+i,scale:110+i,flip:i===1}));
 w.hero.flags[ID].partySetupArtwork=structuredClone(original);w.settings.hsrHubConfig={poseByActor:{hero:{image:'phone-base.png',x:40,y:60,scale:125}}};
 const outfit=put(w);for(let i=0;i<4;i++)outfit.profiles[0].normal.art['team'+(i+1)]={image:`outfit-${i}.png`,x:40,y:80,scale:120,flip:true};
 const p=(await import('../scripts/outfit-rules.mjs')).outfitPaths(w.hero)[0];
 for(let i=0;i<4;i++)assert.deepEqual(inheritedOutfitArt(w.hero,p,'team'+(i+1)),original[i]);
 assert.equal(inheritedOutfitArt(w.hero,p,'phone').image,'phone-base.png');
 await equip(w);for(let i=0;i<4;i++)assert.equal(partyArtworkFor(w.hero,i).image,`outfit-${i}.png`);
 assert.deepEqual(w.hero.getFlag(ID,'partySetupArtwork'),original);
 await equip(w,'');for(let i=0;i<4;i++)assert.deepEqual(partyArtworkFor(w.hero,i),original[i]);
 const html=renderOutfits({actor:w.hero,view:{outfits:[]},isGM:true,manage:true,draft:outfit,paths:[p],pathKey:'original'});
 assert.match(html,/data-outfit-any-path/);for(let i=1;i<=4;i++)assert.match(html,new RegExp(`data-outfit-art="team${i}"`));
 assert.ok(html.indexOf('data-outfit-art-field="image"')<html.indexOf('data-outfit-stage="phone"'));
});

 test('boss artwork and legacy Ultimate orb images are fetched from the selected Path settings',async()=>{
 const {inheritedOutfitArt,inheritedOutfitIcon}=await import('../scripts/outfits-ui.mjs');const w=world(),p={img:'path.png',config:{bossHudPortrait:'boss.png',bossHudPortraitX:25,bossHudPortraitScale:140,orbImage:'legacy-orb.png'}};
 assert.equal(inheritedOutfitArt(w.hero,p,'boss').image,'boss.png');assert.equal(inheritedOutfitArt(w.hero,p,'boss').scale,140);assert.equal(inheritedOutfitIcon(p,'ultimate'),'legacy-orb.png');
 const o=put(w);o.profiles[0].normal.art.boss={image:'outfit-boss.png',x:30,y:60,scale:120};await equip(w);assert.equal(resolveOutfitConfig(w.hero,p.config).bossHudPortrait,'outfit-boss.png');
 });

test('initiative outfit preview uses the tracker mask, Path frame preset and full character-settings crop range',async()=>{
 const {inheritedOutfitArt,outfitInitiativePreview}=await import('../scripts/outfits-ui.mjs');
 const w=world();w.settings.initiativeFrameColors=[{id:'gold',color:'#fedcba'}];
 const p={img:'base.png',config:{carouselFrameColorPreset:'gold',enhancedCarouselImage:'enhanced.png',enhancedCarouselImageScale:800,enhancedCarouselImageX:1100,enhancedCarouselImageY:-1100,enhancedCarouselImageFlip:true}};
 const art=inheritedOutfitArt(w.hero,p,'initiative','enhanced');assert.equal(art.scale,800);assert.equal(art.x,1100);assert.equal(art.y,-1100);
 const html=outfitInitiativePreview(w.hero,p,art);assert.match(html,/tsru-initiative-art-mask/);assert.match(html,/tsru-hsr-turn-pointer/);assert.match(html,/has-custom-frame/);assert.match(html,/--turn-color:#fedcba/);assert.match(html,/--portrait-scale:8/);assert.match(html,/--portrait-flip:-1/);assert.match(html,/enhanced.png/);
 const outfit=normalizeOutfit({profiles:[{actorId:'hero',pathKey:'original',normal:{art:{initiative:art}}}]});assert.deepEqual(outfit.profiles[0].normal.art.initiative,art);
});

test('outfits override main-slot shadows and independent fifth-slot artwork while default restores the character settings',async()=>{
 const {partyArtworkFor}=await import('../scripts/party-setup-rules.mjs');const w=world();w.hero.flags[ID].optionalPartyArtwork={image:'base-fifth.png',scale:90};
 const o=put(w);o.profiles[0].normal.art.team1={image:'outfit-first.png',x:50,y:100,scale:100,shadow:{enabled:false,x:45,y:100,width:40,height:4,opacity:25,blur:2}};o.profiles[0].normal.art.team5={image:'outfit-fifth.png',x:30,y:80,scale:150};
 await equip(w);assert.equal(partyArtworkFor(w.hero,0).shadow.enabled,false);assert.equal(partyArtworkFor(w.hero,4).image,'outfit-fifth.png');assert.equal(partyArtworkFor(w.hero,4).scale,150);assert.equal(partyArtworkFor(w.hero,4).shadow,undefined);
 await equip(w,'');assert.equal(partyArtworkFor(w.hero,4).image,'base-fifth.png');assert.equal(w.hero.getFlag(ID,'optionalPartyArtwork').scale,90);
});
