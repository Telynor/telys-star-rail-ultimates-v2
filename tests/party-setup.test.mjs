import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PARTY_ID as ID,normalizePartySetup,effectivePartySetup,partyIssues,swapPartySlots,choosePartySlot,planCharacterSelection,normalizePartyArtwork,partyArtworkFor,orderCombatPartyActors} from '../scripts/party-setup-rules.mjs';
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
  assert.deepEqual(normalizePartySetup({slots:['a','b'],requiredActorIds:['c','c','d'],requirementsEnabled:false}),{configured:false,revision:0,slots:['a','b','',''],requirementsEnabled:false,requiredActorIds:['c','d']});
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
