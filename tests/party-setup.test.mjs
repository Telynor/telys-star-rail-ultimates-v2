import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PARTY_ID as ID,normalizePartySetup,effectivePartySetup,partyIssues,swapPartySlots,choosePartySlot,planCharacterSelection,normalizePartyArtwork,partyArtworkFor,orderCombatPartyActors,optionalPartyActors,characterAvailability,unlockingItemDescriptor,partyActorDetails} from '../scripts/party-setup-rules.mjs';
import {getPartySetup,applyPartySetupRequest,requestPartySetup,handlePartySetupSocket,savePartyArtwork} from '../scripts/party-setup.mjs';
import {partySetupModel,renderPartySetup,renderPartyArtwork} from '../scripts/party-setup-ui.mjs';
const collection=rows=>{rows.get=id=>rows.find(row=>row.id===id);return rows;};
function fixture({requires=true}={}){
  const gm={id:'gm',isGM:true,active:true},alice={id:'alice',isGM:false,active:true},ben={id:'ben',isGM:false,active:true};
  const actors=collection(['a','b','c','d','e'].map(id=>({id,uuid:`Actor.${id}`,documentName:'Actor',type:'character',name:id.toUpperCase(),img:`${id}.png`,flags:{[ID]:{ultimate:{mainParty:id!=='e'}}},
    getFlag(scope,key){return this.flags[scope]?.[key]},async setFlag(scope,key,value){(this.flags[scope]??={})[key]=structuredClone(value)},
    testUserPermission(user,permission){return user?.isGM||permission==='OBSERVER'||user?.id===(id==='a'||id==='e'?'alice':id==='b'?'ben':'gm')},
    async update(patch){if(this.failUpdate){this.failUpdate=false;throw Error('Actor update rejected');}for(const [key,value]of Object.entries(patch))if(key===`flags.${ID}.ultimate.mainParty`)this.flags[ID].ultimate.mainParty=value;}
  })));
  const state={configured:true,revision:7,slots:['a','b','c','d'],requirementsEnabled:requires,requiredActorIds:['c']},settings={partySetup:structuredClone(state),partySelections:{alice:'a',ben:'b'}},users=collection([gm,alice,ben]),messages=[];
  globalThis.game={user:gm,users,actors,settings:{get:(_,key)=>settings[key],async set(_,key,value){if(this.failKey===key){this.failKey=null;throw Error('Setting update rejected');}settings[key]=structuredClone(value);return value;}},socket:{emit:(_,message)=>messages.push(message)}};
  globalThis.Hooks={callAll(){}};let seq=0;globalThis.foundry={utils:{randomID:()=>`request-${++seq}`}};
  return {gm,alice,ben,actors,users,state,settings,messages,context:{actors,users,selections:settings.partySelections}};
}
test('the world stores four distinct positions and preserves the required list when disabled',()=>{
  const value=normalizePartySetup({slots:['a','b'],requiredActorIds:['c','c','d'],requirementsEnabled:false});
  assert.deepEqual(value.slots,['a','b','','']);assert.equal(value.configured,false);assert.equal(value.revision,0);assert.equal(value.requirementsEnabled,false);assert.deepEqual(value.requiredActorIds,['c','d']);assert.equal(value.presets.length,6);assert.equal(value.optionalActorId,'');
});
test('legacy parties open as a four-slot draft without writing or changing membership',()=>{
  const w=fixture();const before=structuredClone(w.settings);const value=effectivePartySetup({},w.context);
  assert.deepEqual(value.slots,['a','b','c','d']);assert.equal(value.configured,false);assert.deepEqual(w.settings,before);
});
test('occupied dropdown choices swap both characters rather than duplicating or removing them',()=>{
  assert.deepEqual(choosePartySlot(['a','b','c','d'],0,'c'),['c','b','a','d']);assert.deepEqual(swapPartySlots(['a','b','c','d'],0,3),['d','b','c','a']);
  assert.throws(()=>swapPartySlots(['a','b','c','d'],-1,4),/valid/);
});
test('player selections and GM-locked members stay in the party, while all positions can be swapped',()=>{
  const w=fixture();w.actors.get('d').flags[ID].ultimate.partyGMOverride=true;
  assert.deepEqual(partyIssues(['d','b','c','a'],w.state,w.context,w.alice),[]);
  assert.match(partyIssues(['e','b','c','d'],w.state,w.context,w.alice).join(' '),/Active player characters/);
  assert.match(partyIssues(['a','e','c','d'],w.state,w.context,w.alice).join(' '),/Active player characters/);
  assert.match(partyIssues(['a','b','c','e'],w.state,w.context,w.alice).join(' '),/GM-locked/);
});
test('missing required characters block the lock for players and the GM; disabling requirements releases the rule',()=>{
  const w=fixture();for(const user of [w.alice,w.gm])assert.match(partyIssues(['a','b','e','d'],w.state,w.context,user).join(' '),/Party Requires: C/);
  assert.deepEqual(partyIssues(['a','b','e','d'],{...w.state,requirementsEnabled:false},w.context,w.alice),[]);
});
test('invalid IDs, deleted requirements, duplicates and malformed slot counts cannot be locked',()=>{
  const w=fixture();assert.ok(partyIssues(['a','a','c','d'],w.state,w.context,w.gm).length);
  assert.ok(partyIssues(['a','b','c'],w.state,w.context,w.gm).length);
  w.actors.splice(w.actors.indexOf(w.actors.get('c')),1);assert.match(partyIssues(w.state.slots,w.state,w.context,w.gm).join(' '),/Party Requires/);
});
test('all clients use the exact stored HUD order, without promoting their own character',()=>{
  const w=fixture(),state={...w.state,slots:['d','b','a','c']};
  for(const user of [w.gm,w.alice,w.ben]){game.user=user;assert.deepEqual(orderCombatPartyActors(w.actors,state).map(actor=>actor.id),state.slots);}
  assert.deepEqual(orderCombatPartyActors([w.actors.get('b'),w.actors.get('d')],state).map(actor=>actor.id),['d','b']);
});
test('the elected GM validates and commits a player reorder to shared state',async()=>{
  const w=fixture();const next=await applyPartySetupRequest('lineup',{revision:7,slots:['d','b','c','a']},w.alice);
  assert.equal(next.revision,8);assert.deepEqual(getPartySetup().slots,['d','b','c','a']);assert.deepEqual(w.settings.partySelections,{alice:'a',ben:'b'});
});
test('concurrent changes serialize: the stale draft is rejected instead of overwriting the first save',async()=>{
  const w=fixture(),results=await Promise.allSettled([applyPartySetupRequest('lineup',{revision:7,slots:['d','b','c','a']},w.alice),applyPartySetupRequest('lineup',{revision:7,slots:['a','c','b','d']},w.ben)]);
  assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');assert.match(results[1].reason.message,/Reload/);assert.deepEqual(w.settings.partySetup.slots,['d','b','c','a']);
});
test('Party Requires saves up to four exact world character IDs, stays GM-only and does not rearrange the lineup',async()=>{
  const w=fixture();await assert.rejects(applyPartySetupRequest('requirements',{revision:7,requiredActorIds:['a'],requirementsEnabled:true},w.alice),/Only the GM/);
  await applyPartySetupRequest('requirements',{revision:7,requiredActorIds:['a','b','c','e'],requirementsEnabled:true},w.gm);
  assert.deepEqual(w.settings.partySetup.slots,['a','b','c','d']);assert.equal(w.settings.partySetup.requiredActorIds.length,4);
  await assert.rejects(applyPartySetupRequest('lineup',{revision:8,slots:w.state.slots},w.gm),/Party Requires: E/);
  await applyPartySetupRequest('requirements',{revision:8,requiredActorIds:['a','b','c','e'],requirementsEnabled:false},w.gm);
  assert.equal(w.settings.partySetup.requirementsEnabled,false);assert.deepEqual(w.settings.partySetup.requiredActorIds,['a','b','c','e']);
});
test('the existing main-character selector cannot remove a required character',async()=>{
  const w=fixture();w.settings.partySetup.requiredActorIds=['a'];
  await assert.rejects(applyPartySetupRequest('selectCharacter',{actorId:'e'},w.alice),/Party Requires: A/);
  assert.deepEqual(w.settings.partySelections,{alice:'a',ben:'b'});assert.equal(w.actors.get('a').getFlag(ID,'ultimate').mainParty,true);
});
test('a permitted main-character change retains the slot, updates membership and broadcasts only after acceptance',async()=>{
  const w=fixture();await applyPartySetupRequest('selectCharacter',{actorId:'e'},w.alice);
  assert.deepEqual(w.settings.partySetup.slots,['e','b','c','d']);assert.equal(w.settings.partySelections.alice,'e');assert.equal(w.actors.get('a').getFlag(ID,'ultimate').mainParty,false);assert.equal(w.actors.get('e').getFlag(ID,'ultimate').mainParty,true);
  assert.equal(w.messages.at(-1).type,'partySelectionChanged');
});
test('main-character changes enforce ownership, GM locks and a full party',()=>{
  const w=fixture();assert.throws(()=>planCharacterSelection(w.state,w.context,w.alice,'b'),/you own/);
  w.actors.get('e').flags[ID].ultimate.partyGMOverride=true;assert.throws(()=>planCharacterSelection(w.state,w.context,w.alice,'e'),/GM has locked/);
  w.actors.get('e').flags[ID].ultimate.partyGMOverride=false;w.actors.get('a').flags[ID].ultimate.partyGMOverride=true;assert.throws(()=>planCharacterSelection(w.state,w.context,w.alice,'e'),/positions are full/);
});
test('failed membership or settings writes restore the previous roster and selection',async()=>{
  const w=fixture();w.actors.get('e').failUpdate=true;
  await assert.rejects(applyPartySetupRequest('selectCharacter',{actorId:'e'},w.alice),/Actor update rejected/);
  assert.equal(w.actors.get('a').getFlag(ID,'ultimate').mainParty,true);assert.equal(w.settings.partySelections.alice,'a');assert.equal(w.settings.partySetup.revision,7);
  game.settings.failKey='partySetup';await assert.rejects(applyPartySetupRequest('selectCharacter',{actorId:'e'},w.alice),/Setting update rejected/);
  assert.equal(w.actors.get('a').getFlag(ID,'ultimate').mainParty,true);assert.equal(w.actors.get('e').getFlag(ID,'ultimate').mainParty,false);assert.equal(w.settings.partySelections.alice,'a');
});
test('the player request resolves only from the elected GM and carries a validated shared result',async()=>{
  const w=fixture();game.user=w.alice;const work=requestPartySetup('lineup',{revision:7,slots:['d','b','c','a']}),request=w.messages.at(-1);
  await handlePartySetupSocket({type:'partySetupResult',requestId:request.requestId,targetUserId:w.alice.id,sourceUserId:'forged',state:{}});
  game.user=w.gm;await handlePartySetupSocket(request);const result=w.messages.at(-1);game.user=w.alice;await handlePartySetupSocket(result);
  assert.deepEqual((await work).slots,['d','b','c','a']);
});
test('four artwork variants remain independent for each character and position',async()=>{
  const w=fixture(),a=w.actors.get('a'),art=normalizePartyArtwork([{image:'left.webp'}, {image:'front.webp',flip:true}, {image:'rear.webp',scale:140}, {image:'right.webp'}]);
  await savePartyArtwork(a,art);assert.deepEqual([0,1,2,3].map(index=>partyArtworkFor(a,index).image),['left.webp','front.webp','rear.webp','right.webp']);
  assert.equal(partyArtworkFor(w.actors.get('b'),1).image,'b.png');assert.equal(partyArtworkFor(a,1).flip,true);
  game.user=w.alice;await assert.rejects(savePartyArtwork(a,art),/Only the GM/);
});
test('artwork normalization rejects executable paths and bounds layout without sharing objects',()=>{
  const art=normalizePartyArtwork([{image:'javascript:bad',x:-3,y:400,scale:1000},'slot2.png']);assert.equal(art[0].image,'');assert.equal(art[0].x,0);assert.equal(art[0].y,100);assert.equal(art[0].scale,250);assert.equal(art[1].image,'slot2.png');art[2].image='changed';assert.equal(art[3].image,'');
});
test('player and GM markup expose four dropdowns, swaps, requirement status and only authorized editing controls',()=>{
  const w=fixture();for(const user of [w.alice,w.gm]){
    const model=partySetupModel({state:w.state,context:w.context,user}),html=renderPartySetup(model);
    assert.equal((html.match(/data-party-slot=/g)||[]).length,4);assert.match(html,/Swap slots/);assert.match(html,/Lock in changes/);assert.equal(html.includes('data-party-requires-enabled'),user.isGM);
  }
  const invalid=partySetupModel({state:w.state,slots:['a','b','e','d'],context:w.context,user:w.alice});assert.equal(invalid.canLock,false);assert.match(renderPartySetup(invalid),/data-party-lock disabled/);
  assert.equal(partySetupModel({state:w.state,context:w.context,user:w.alice,stale:true}).canLock,false);
});
test('artwork editor has a separate file field and preview for every position and escapes character names',()=>{
  const w=fixture(),actor=w.actors.get('a');actor.name='<script>bad</script>';
  const html=renderPartyArtwork(actor,normalizePartyArtwork(),w.actors);
  assert.equal((html.match(/data-party-art-field="image"/g)||[]).length,4);assert.equal((html.match(/data-party-art-browse=/g)||[]).length,4);assert.ok(!html.includes('<script>bad'));
});
test('legacy player-owned party members remain protected before a shared main selection is recorded',()=>{
  const w=fixture(),ctx={...w.context,selections:{}};
  assert.match(partyIssues(['e','b','c','d'],w.state,ctx,w.alice).join(' '),/Active player characters/);
  const model=partySetupModel({state:w.state,context:ctx,user:w.alice,activeCharacterId:'a'});assert.equal(model.activeIndex,0);
});
test('a legacy player can change their sole party character before recording a shared selection',async()=>{
  const w=fixture();w.settings.partySelections={ben:'b'};
  await applyPartySetupRequest('selectCharacter',{actorId:'e'},w.alice);
  assert.deepEqual(w.settings.partySetup.slots,['e','b','c','d']);assert.equal(w.settings.partySelections.alice,'e');
});
test('the GM can disable requirements while retaining a deleted character reference for later repair',async()=>{
  const w=fixture();w.actors.splice(w.actors.indexOf(w.actors.get('c')),1);
  await applyPartySetupRequest('requirements',{revision:7,requiredActorIds:['c'],requirementsEnabled:false},w.gm);
  assert.equal(w.settings.partySetup.requirementsEnabled,false);assert.deepEqual(w.settings.partySetup.requiredActorIds,['c']);
  await assert.rejects(applyPartySetupRequest('requirements',{revision:8,requiredActorIds:['c'],requirementsEnabled:true},w.gm),/world character sheets/);
});
test('a backend failure after applying a partial write still rolls back party membership',async()=>{
  const w=fixture(),actor=w.actors.get('a'),update=actor.update;let fail=true;
  actor.update=async function(patch){await update.call(this,patch);if(fail){fail=false;throw Error('Post-update failure');}};
  await assert.rejects(applyPartySetupRequest('selectCharacter',{actorId:'e'},w.alice),/Post-update failure/);
  assert.equal(actor.getFlag(ID,'ultimate').mainParty,true);assert.equal(w.settings.partySelections.alice,'a');assert.equal(w.settings.partySetup.revision,7);
});

test('legacy saved lineups migrate into preset 01 without changing the applied party',()=>{
 const w=fixture(),state=normalizePartySetup(w.state);assert.equal(state.activePreset,0);assert.equal(state.presets.length,6);assert.deepEqual(state.presets[0].slots,w.state.slots);assert.equal(state.presets[0].saved,true);assert.equal(state.presets[1].saved,false);
 state.presets[0].slots[0]='changed';assert.equal(state.slots[0],'a');assert.equal(w.state.slots[0],'a');
});
test('saving and applying a named preset are distinct shared operations',async()=>{
 const w=fixture(),slots=['d','b','c','a'];await applyPartySetupRequest('savePreset',{revision:7,presetIndex:2,presetName:'Boss team',slots},w.alice);
 assert.deepEqual(getPartySetup().slots,['a','b','c','d']);assert.equal(getPartySetup().presets[2].name,'Boss team');assert.deepEqual(getPartySetup().presets[2].slots,slots);assert.equal(getPartySetup().activePreset,0);
 await applyPartySetupRequest('lineup',{revision:8,presetIndex:2,presetName:'Boss team',slots},w.alice);assert.equal(getPartySetup().activePreset,2);assert.deepEqual(getPartySetup().slots,slots);
});
test('preset saves reject stale revisions, invalid numbers and protected-character removal',async()=>{
 const w=fixture();await assert.rejects(applyPartySetupRequest('savePreset',{revision:7,presetIndex:6,slots:w.state.slots},w.alice),/valid party preset/);
 await assert.rejects(applyPartySetupRequest('savePreset',{revision:6,presetIndex:0,slots:w.state.slots},w.alice),/Reload/);
 await assert.rejects(applyPartySetupRequest('savePreset',{revision:7,presetIndex:1,slots:['e','b','c','d']},w.alice),/Active player/);
});
const keyItem=(uuid='Item.key')=>({uuid,documentName:'Item',name:'Companion invitation',img:'invitation.webp',system:{quantity:1},flags:{}});
function unlockFixture(){const w=fixture(),item=keyItem();w.actors.get('a').items=[item];w.actors.get('e').flags[ID].ultimate.unlockingItem=unlockingItemDescriptor(item);return {...w,item};}
test('only trials and characters with their exact unlocking item can occupy the optional slot',()=>{
 const w=fixture();assert.equal(optionalPartyActors(w.state,w.context).length,0);w.actors.get('e').flags[ID].ultimate.trialCharacter=true;
 assert.deepEqual(optionalPartyActors(w.state,w.context).map(actor=>actor.id),['e']);assert.deepEqual(partyIssues(w.state.slots,w.state,w.context,w.alice,{optionalActorId:'e'}),[]);
 assert.match(partyIssues(w.state.slots,w.state,w.context,w.gm,{optionalActorId:'d'}).join(' '),/only one slot|Trial Character/);
});
test('an unlocking item in any main-party inventory grants access to its linked character',()=>{
 const w=unlockFixture();assert.equal(characterAvailability(w.actors.get('e'),w.state,w.context).unlocked,true);assert.equal(optionalPartyActors(w.state,w.context).some(actor=>actor.id==='e'),true);
 w.actors.get('a').items=[];w.actors.get('c').items=[w.item];assert.equal(characterAvailability(w.actors.get('e'),w.state,w.context).unlocked,true);
 w.actors.get('c').items=[];w.actors.get('e').items=[w.item];assert.equal(characterAvailability(w.actors.get('e'),w.state,w.context).unlocked,false,'an inactive character cannot unlock itself');
});
test('owned copies match compendium/world provenance; matching names and zero quantity do not grant access',()=>{
 const w=unlockFixture(),source=keyItem('Compendium.demo.items.Item.key');w.actors.get('e').flags[ID].ultimate.unlockingItem=unlockingItemDescriptor(source);
 w.actors.get('a').items=[{...keyItem('Actor.a.Item.copy'),_stats:{compendiumSource:source.uuid}}];assert.equal(characterAvailability(w.actors.get('e'),w.state,w.context).unlocked,true);
 w.actors.get('a').items=[{...keyItem('Actor.a.Item.copy'),flags:{core:{sourceId:source.uuid}}}];assert.equal(characterAvailability(w.actors.get('e'),w.state,w.context).unlocked,true);
 w.actors.get('a').items=[keyItem('Item.same-name')];assert.equal(characterAvailability(w.actors.get('e'),w.state,w.context).unlocked,false);
 w.actors.get('a').items=[{...source,system:{quantity:0}}];assert.equal(characterAvailability(w.actors.get('e'),w.state,w.context).unlocked,false);
});
test('the GM cannot bypass an item lock and losing the final eligible holder blocks an apply',async()=>{
 const w=unlockFixture();w.actors.get('a').items=[];
 await assert.rejects(applyPartySetupRequest('lineup',{revision:7,slots:w.state.slots,optionalActorId:'e'},w.gm),/requires Companion invitation/);
 w.actors.get('c').items=[w.item];await assert.rejects(applyPartySetupRequest('lineup',{revision:7,slots:['a','b','','d'],optionalActorId:'e'},w.gm),/requires Companion invitation/);
 assert.deepEqual(w.settings.partySetup.slots,w.state.slots);
});
test('optional characters are included in membership, requirements, presets and the final HUD position',async()=>{
 const w=unlockFixture();w.settings.partySetup.requiredActorIds=['c','e'];await applyPartySetupRequest('lineup',{revision:7,slots:w.state.slots,optionalActorId:'e',presetIndex:1},w.alice);
 const state=getPartySetup();assert.equal(w.actors.get('e').flags[ID].ultimate.mainParty,true);assert.equal(state.presets[1].optionalActorId,'e');assert.deepEqual(orderCombatPartyActors(w.actors,state).map(a=>a.id),['a','b','c','d','e']);
});
test('a removed inventory key is rechecked during an asynchronous party apply and membership rolls back',async()=>{
 const w=unlockFixture(),actor=w.actors.get('e'),update=actor.update.bind(actor);actor.update=async patch=>{await update(patch);if(patch[`flags.${ID}.ultimate.mainParty`])w.actors.get('a').items=[];};
 await assert.rejects(applyPartySetupRequest('lineup',{revision:7,slots:w.state.slots,optionalActorId:'e'},w.gm),/requires Companion invitation/);assert.equal(actor.flags[ID].ultimate.mainParty,false);assert.equal(w.settings.partySetup.revision,7);
});
test('nameplates layer the configured Element behind the sheet level and resolve configured Path names',()=>{
 const w=fixture(),actor=w.actors.get('a');actor.system={details:{level:12}};Object.assign(actor.flags[ID].ultimate,{pathId:'custom-path-id',elementId:'custom-element-id',trialCharacter:true});
 const ctx={...w.context,paths:[{id:'custom-path-id',name:'Remembrance',icon:'path.webp'}],elements:[{id:'custom-element-id',name:'Ice',icon:'ice.webp'}]};
 const details=partyActorDetails(actor,ctx);assert.equal(details.level,12);assert.equal(details.pathName,'Remembrance');assert.equal(details.pathIcon,'path.webp');assert.equal(details.elementIcon,'ice.webp');
 const html=renderPartySetup(partySetupModel({state:w.state,context:ctx,user:w.gm}));assert.match(html,/tsru-party-level/);assert.match(html,/>TRIAL</);assert.match(html,/class="tsru-party-level"[^>]*><img class="tsru-party-element" src="ice.webp"[^>]*><span>12<\/span>/);assert.match(html,/src="path.webp"/);assert.ok(!html.includes('custom-path-id'));
 assert.equal((html.match(/data-party-preset=/g)||[]).length,6);assert.match(html,/Optional Character/);assert.match(html,/tsru-party-floor-shadow/);
});

test('an item-unlocked character is available in every main position without sheet ownership',async()=>{
 for(let index=0;index<4;index++){
  const w=unlockFixture();w.actors.get('e').testUserPermission=()=>false;
  const model=partySetupModel({state:w.state,slots:['a','b','c','e'],context:w.context,user:w.alice});assert.ok(model.cards[index].options.some(option=>option.id==='e'&&!option.disabled));
  const slots=choosePartySlot(['a','b','c','e'],index,'e');assert.deepEqual(partyIssues(slots,w.state,w.context,w.alice),[]);
  await applyPartySetupRequest('lineup',{revision:7,slots},w.alice);assert.equal(getPartySetup().slots[index],'e');
 }
 const w=unlockFixture();w.actors.get('e').testUserPermission=()=>false;w.actors.get('a').items=[];
 assert.equal(partySetupModel({state:w.state,context:w.context,user:w.alice}).candidates.some(actor=>actor.id==='e'),false);
});
test('Trial Characters are restricted to position five even when their item is held',async()=>{
 for(const action of ['lineup','savePreset'])for(let index=0;index<4;index++){
  const w=unlockFixture();w.actors.get('e').flags[ID].ultimate.trialCharacter=true;
  for(const user of [w.alice,w.gm]){
   const slots=choosePartySlot(['a','b','c','e'],index,'e');await assert.rejects(applyPartySetupRequest(action,{revision:7,slots,presetIndex:1},user),/Trial Characters must use position 5/);
   const model=partySetupModel({state:w.state,context:w.context,user});assert.ok(model.cards.every(card=>!card.options.some(option=>option.id==='e'&&!option.disabled)));assert.ok(model.optional.options.some(option=>option.id==='e'&&!option.disabled));
  }
  assert.equal(w.settings.partySetup.revision,7);
 }
 const w=unlockFixture();w.actors.get('e').flags[ID].ultimate.trialCharacter=true;
 assert.throws(()=>planCharacterSelection(w.state,w.context,w.alice,'e'),/Trial Characters must use position 5/);
 await applyPartySetupRequest('lineup',{revision:7,slots:w.state.slots,optionalActorId:'e'},w.alice);assert.equal(getPartySetup().optionalActorId,'e');
});
test('legacy trial placements remain visible but cannot be saved until moved to position five',()=>{
 const w=fixture();w.actors.get('c').flags[ID].ultimate.trialCharacter=true;
 const model=partySetupModel({state:w.state,context:w.context,user:w.gm});assert.equal(model.canLock,false);assert.match(model.errors.join(' '),/position 5/);assert.equal(model.cards[2].options.find(option=>option.id==='c').disabled,true);
 assert.ok(model.optional.options.some(option=>option.id==='c'&&!option.disabled),'the trial can be moved directly from a legacy main slot into the empty fifth slot');
 assert.ok(!effectivePartySetup({},w.context).slots.includes('c'),'new legacy drafts do not place trials in main slots');
});
test('five-position dropdowns and swaps preserve both members and enforce trial placement',async()=>{
 const {choosePartyPosition,swapPartyPositions}=await import('../scripts/party-setup-rules.mjs');
 const w=unlockFixture();w.actors.get('c').flags[ID].ultimate.unlockingItem=unlockingItemDescriptor(w.item);
 const moved=choosePartyPosition(w.state.slots,'e',2,'e');assert.deepEqual(moved,{slots:['a','b','e','d'],optionalActorId:'c'});assert.deepEqual(partyIssues(moved.slots,w.state,w.context,w.alice,{optionalActorId:moved.optionalActorId}),[]);
 assert.deepEqual(swapPartyPositions(moved.slots,moved.optionalActorId,2,4),{slots:w.state.slots,optionalActorId:'e'});
 const model=partySetupModel({state:w.state,slots:w.state.slots,optionalActorId:'e',context:w.context,user:w.alice});assert.equal(model.canSwap(2,4),true);assert.equal(model.canSwap(0,4),false,'a normal main character cannot be swapped into an ineligible optional slot');
 w.actors.get('e').flags[ID].ultimate.trialCharacter=true;assert.equal(partySetupModel({state:w.state,optionalActorId:'e',context:w.context,user:w.gm}).canSwap(4,2),false);
 assert.throws(()=>swapPartyPositions(w.state.slots,'e',0,5),/valid party positions/);assert.throws(()=>choosePartyPosition(w.state.slots,'e',5,'c'),/valid party position/);
});
