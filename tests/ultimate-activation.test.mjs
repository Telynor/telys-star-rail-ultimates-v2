import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {energyAfterUpdate} from '../scripts/alternate-ultimate-rules.mjs';
import * as alternate from '../scripts/alternate-ultimates.mjs';

const ID='telys-star-rail-ultimates';
const source=await readFile(new URL('../scripts/module.js',import.meta.url),'utf8');
const get=(o,p)=>p.split('.').reduce((v,k)=>v?.[k],o);
const set=(o,p,v)=>{const keys=p.split('.');let target=o;for(const k of keys.slice(0,-1))target=target[k]??={};target[keys.at(-1)]=structuredClone(v);};
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function setup(mode='energy',config={}) {
 const hooks=new Map(),timers=new Map();let timerId=0;
 const events={messages:[],socket:[],warnings:[],errors:[],splashes:[],infos:[]};
 const a={id:'hero',uuid:'Actor.hero',name:'Hero',type:'character',isOwner:true,executions:[],
  flags:{ultimate:{enabled:true,current:100,max:100,alternateUltimateEnabled:mode!=='energy',ultimateText:'Ultimate description',ultimateScript:'actor.executions.push({tokenId:token?.id,combatantId});',...config},alternateOrb:{mode:mode==='circular'?'circular':'free',components:['a','b','c','d'].map(id=>({id,image:id+'.png'}))},alternateOrbStates:{a:true,b:true,c:true,d:true},alternateOrbCounter:4},
  getFlag(_,key){return this.flags[key]},
  async setFlag(_,key,value){this.flags[key]=structuredClone(value)},
  async update(updates){for(const [p,v]of Object.entries(updates))set(this.flags,p.slice(`flags.${ID}.`.length),v)},
  testUserPermission:user=>user?.id==='player',
  getActiveTokens:()=>[{id:'hero-token',document:{id:'hero-token'}}]
 };
 const gm={id:'gm',isGM:true,active:true},player={id:'player',isGM:false,active:true};
 const actors=[a];actors.get=id=>actors.find(x=>x.id===id);
 const users=[gm,player];users.get=id=>users.find(x=>x.id===id);
 const combats=[];combats.get=id=>combats.find(x=>x.id===id);
 const game={user:gm,actors,users,combats,combat:null,settings:{get:()=>({})},socket:{emit:(_,data)=>events.socket.push(data)},modules:{get:()=>({api:{}})}};
 const ui={notifications:{warn:message=>events.warnings.push(message),error:message=>events.errors.push(message),info:message=>events.infos.push(message)}};
 Object.assign(globalThis,{game,ui,fromUuid:async uuid=>uuid===a.uuid?a:null});
 const textEditor={enrichHTML:async text=>text};
 const context=vm.createContext({game,ui,structuredClone,energyAfterUpdate,...alternate,
  console:{...console,error:(...args)=>events.errors.push(args.map(String).join(' '))},FormApplication:class{},
  Hooks:{on(name,fn){const list=hooks.get(name)??[];list.push(fn);hooks.set(name,list)},once(){},callAll(){}},
  foundry:{utils:{deepClone:structuredClone,randomID:()=>`request-${events.socket.length}`,mergeObject:(a,b)=>({...a,...b}),getProperty:get,setProperty:set},applications:{api:{ApplicationV2:class{},HandlebarsApplicationMixin:C=>C},ux:{TextEditor:{implementation:textEditor}}}},
  TextEditor:textEditor,ChatMessage:{getSpeaker:({actor})=>({actor:actor.id}),create:async data=>{events.messages.push(data);return data}},
  document:{createElement:()=>({textContent:'',get innerHTML(){return html(this.textContent)}}),querySelectorAll:()=>[]},canvas:{},
  window:{setTimeout:(fn,delay)=>{const id=++timerId;timers.set(id,{fn,delay});return id},clearTimeout:id=>timers.delete(id)},setTimeout,clearTimeout});
 vm.runInContext(source.replace(/^import .*;\n/gm,'')+'\nglobalThis.api={requestUltimate,executeUltimate,onSocket,processUltimateQueue,completeUltimate,reconcileUltimateLock,state,getConfig,runUltimateScript};',context);
 // Keep the actual readiness, action dispatch, script runner, chat card, and queue.
 // Only audiovisual presentation and the unrelated Light Cone engine are isolated.
 context.events=events;
 vm.runInContext('refreshOrb=()=>{};broadcastUltimateSplash=actor=>events.splashes.push(actor.id);dispatchTalentEvent=async()=>{};refreshToughnessBars=()=>{};refreshResourceHuds=()=>{};refreshCombatPartyHud=()=>{};refreshPunchlineHUD=()=>{};refreshSkillUI=()=>{};refreshBossHud=()=>{};refreshInitiativeCarousel=()=>{};refreshTalentCounter=()=>{};',context);
 alternate.configureAlternateUltimates({isResolving:actor=>context.api.state.ultimateLocks.has(actor.id)});
 return {a,game,gm,player,events,api:context.api,context,hooks,timers,
  async fireHook(name,...args){await Promise.all((hooks.get(name)??[]).map(fn=>fn(...args)))},
  async runTimers(delay){const due=[...timers].filter(([,timer])=>timer.delay===delay);for(const [id,timer]of due){timers.delete(id);await timer.fn()}return due.length}
 };
}

function startCombat(world,{ownTurn=true,deferredTurns=false}={}) {
 const {a,game}=world;
 const hero={id:'hero-turn',actorId:a.id,actor:a,initiative:10,flags:{},getFlag(_,key){return this.flags[key]}};
 const enemy={id:'enemy-turn',actorId:'enemy',actor:{type:'npc',getFlag:()=>undefined},initiative:20,flags:{},getFlag(_,key){return this.flags[key]}};
 const combatants=[enemy,hero];combatants.get=id=>combatants.find(c=>c.id===id);combatants.has=id=>Boolean(combatants.get(id));
 let ordered=[enemy,hero];
 const combat={id:'fight',started:true,round:1,turn:ownTurn?1:0,combatants,
  get turns(){return deferredTurns?ordered:[...combatants].sort((a,b)=>b.initiative-a.initiative)},get combatant(){return this.turns[this.turn]},
  setupTurns(){ordered=[...combatants].sort((a,b)=>b.initiative-a.initiative);return ordered},
  async update(patch){Object.assign(this,patch)},
  async createEmbeddedDocuments(_,documents){return documents.map((data,i)=>{const c={...data,id:'ultimate-turn-'+i,actor:a,parent:this,getFlag(_,key){return this.flags?.[ID]?.[key]}};combatants.push(c);return c})},
  async deleteEmbeddedDocuments(_,ids){for(const id of ids){const i=combatants.findIndex(c=>c.id===id);if(i>=0)combatants.splice(i,1)}}};
 game.combat=combat;game.combats.push(combat);return combat;
}

test('v14 deferred turn order is rebuilt before selecting the extra Ultimate turn',async()=>{
 const world=setup('energy'),{a,api}=world;const combat=startCombat(world,{ownTurn:false,deferredTurns:true});
 assert.equal(await api.requestUltimate(a),true);await api.processUltimateQueue(combat.id);
 assert.equal(combat.combatant?.getFlag(ID,'temporaryUltimate'),true);
 assert.equal(combat.combatant.actorId,a.id);
 assert.equal(world.events.messages.length,1);assert.equal(world.events.splashes.length,1);
});

test('a waiting Ultimate resumes from its timer after a suppressed turn-change hook',async()=>{
 const world=setup('free'),{a,api}=world;const combat=startCombat(world,{ownTurn:false,deferredTurns:true});
 combat.combatant.actor={id:'ally',type:'character',getFlag:(_,key)=>key==='ultimate'?{mainParty:true}:undefined};combat.combatant.actorId='ally';
 await api.requestUltimate(a);assert.equal(a.executions.length,0);
 assert.ok(await world.runTimers(225));assert.equal(a.executions.length,0);
 combat.turn=1;api.state.suppressCombatHook=true;await world.fireHook('updateCombat',combat);api.state.suppressCombatHook=false;
 assert.ok(await world.runTimers(225));
 assert.equal(a.executions.length,1);assert.equal(combat.combatant?.getFlag(ID,'temporaryUltimate'),true);
});

test('old prose stored in ultimateScript is recovered as chat text instead of executed',async()=>{
 const {a,api,events}=setup('energy',{ultimateText:'',ultimateScript:'<p>Legacy Ultimate: deal [[/r 3d6]] lightning damage.</p>'});
 const before=structuredClone(a.flags);
 assert.match(api.getConfig(a).ultimateText,/Legacy Ultimate/);assert.deepEqual(a.flags,before,'reading compatibility data does not rewrite the actor');
 assert.equal(await api.requestUltimate(a),true);assert.equal(a.executions.length,0);
 assert.match(events.messages[0]?.content??'',/Legacy Ultimate/);assert.equal(events.errors.length,0);
});

test('legacy prose preserves an existing description and an original backup',()=>{
 const {a,api}=setup('energy',{ultimateText:'Current description',ultimateScript:'Old description of the attack',legacyUltimateScript:'Original backup'});
 const config=api.getConfig(a);
 assert.equal(config.ultimateText,'Current description');assert.equal(config.ultimateScript,'');
 assert.equal(config.legacyUltimateScript,'Original backup');
});

test('legacy enhanced descriptions are enriched in chat with the enhanced effect',async()=>{
 const {a,api,events}=setup('energy',{ultimateScript:'',enhancedStanceEnabled:true,enhancedStanceActive:true,enhancedUltimateEnabled:true,enhancedUltimateScript:'<p>Old enhanced description [[/r 4d6]]</p>',enhancedEffectText:'Extra lightning'});
 assert.equal(await api.requestUltimate(a),true);
 assert.match(events.messages[0].content,/Old enhanced description/);assert.match(events.messages[0].content,/Extra lightning/);
});

test('explicit code is never reclassified as description even if it fails',async()=>{
 const {a,api,events}=setup('energy',{ultimateScriptMode:'code',ultimateScript:'missingIdentifier',ultimateText:'Configured description'});
 assert.equal(api.getConfig(a).ultimateScript,'missingIdentifier');
 assert.equal(await api.requestUltimate(a),false);
 assert.match(events.messages[0].content,/Configured description/);assert.ok(events.errors.some(e=>e.includes('missingIdentifier')));
});

test('an old script returning text supplies the chat description',async()=>{
 const {a,api,events}=setup('energy',{ultimateText:'',ultimateScript:'return "<p>Returned legacy description</p>";'});
 assert.equal(await api.requestUltimate(a),true);
 assert.match(events.messages[0].content,/Returned legacy description/);assert.doesNotMatch(events.messages[0].content,/return &quot;/);
});

test('an old script returning its own chat card gets a completion button without a duplicate',async()=>{
 const world=setup('energy',{ultimateText:'',ultimateScript:'return actor.card;'}),{a,api}=world;
 a.card={documentName:'ChatMessage',content:'<p>Original scripted chat card</p>',async update(patch){Object.assign(this,patch)}};
 const combat=startCombat(world,{ownTurn:false,deferredTurns:true});
 await api.requestUltimate(a);await world.runTimers(225);
 assert.equal(world.events.messages.length,0);assert.match(a.card.content,/Original scripted chat card/);
 assert.match(a.card.content,/data-tsru-complete-ultimate="hero"/);
 await api.completeUltimate(a.id);assert.equal(combat.combatant.id,'enemy-turn');
});

test('completing a queued Ultimate rebuilds deferred initiative and resumes the interrupted turn',async()=>{
 const world=setup('circular'),{a,api}=world,combat=startCombat(world,{ownTurn:false,deferredTurns:true});
 await api.requestUltimate(a);await world.runTimers(225);
 assert.equal(combat.combatant.getFlag(ID,'temporaryUltimate'),true);
 assert.match(world.events.messages[0].content,/data-tsru-complete-ultimate/);
 await api.completeUltimate(a.id);
 assert.equal(combat.combatant.id,'enemy-turn');assert.equal(combat.turns.length,2);
 assert.equal(api.state.ultimateQueues.size,0);assert.equal(api.state.ultimateLocks.size,0);
});

test('queued automation errors still post saved text and remove the temporary turn',async()=>{
 const world=setup('energy',{ultimateScript:'throw new Error("Queued automation failed");'}),{a,api}=world;
 const combat=startCombat(world,{ownTurn:false,deferredTurns:true});
 await api.requestUltimate(a);await world.runTimers(225);
 assert.match(world.events.messages[0].content,/Ultimate description/);
 assert.equal(combat.combatant.id,'enemy-turn');assert.equal(combat.combatants.length,2);
 assert.equal(api.state.pendingUltimates.size,0);assert.equal(api.state.ultimateLocks.size,0);
 assert.ok(world.events.errors.some(e=>e.includes('Queued automation failed')));
});

test('a failed turn selection restores hooks and cleans up the new combatant',async()=>{
 const world=setup('energy'),{a,api}=world,combat=startCombat(world,{ownTurn:false,deferredTurns:true});
 const update=combat.update;let fail=true;
 combat.update=async function(patch){if(fail){fail=false;throw new Error('Turn update failed')}return update.call(this,patch)};
 await api.requestUltimate(a);await world.runTimers(225);
 assert.equal(api.state.suppressCombatHook,false);assert.equal(combat.combatants.length,2);
 assert.equal(api.state.ultimateQueues.size,0);assert.equal(api.state.ultimateLocks.size,0);
 assert.equal(combat.combatant.id,'enemy-turn');
});

test('the same ally in a new round releases a waiting Ultimate',async()=>{
 const world=setup('free'),{a,api}=world,combat=startCombat(world,{ownTurn:false,deferredTurns:true});
 combat.combatant.actor={id:'ally',type:'character',getFlag:(_,key)=>key==='ultimate'?{mainParty:true}:undefined};
 combat.combatant.actorId='ally';
 await api.requestUltimate(a);combat.round=2;await world.runTimers(225);
 assert.equal(a.executions.length,1);await api.completeUltimate(a.id);
 assert.equal(combat.combatant.id,'enemy-turn');assert.equal(combat.round,2);
});

test('a normal updateCombat hook starts a waiting Ultimate once and resumes its successor',async()=>{
 const world=setup('energy'),{a,api}=world,combat=startCombat(world,{ownTurn:false,deferredTurns:true});
 combat.combatant.actor={id:'ally',type:'character',getFlag:(_,key)=>key==='ultimate'?{mainParty:true}:undefined};combat.combatant.actorId='ally';
 await api.requestUltimate(a);combat.turn=1;await world.fireHook('updateCombat',combat);
 assert.equal(a.executions.length,1);await world.runTimers(225);assert.equal(a.executions.length,1);
 await api.completeUltimate(a.id);assert.equal(combat.combatant.id,'hero-turn');
});

test('an explicitly disabled existing character keeps its saved configuration and cannot cast',async()=>{
 const {a,api,events}=setup('energy',{enabled:false});const before=structuredClone(a.flags);
 assert.equal(await api.requestUltimate(a),false);assert.deepEqual(a.flags,before);
 assert.equal(events.messages.length,0);assert.equal(a.executions.length,0);assert.match(events.warnings[0],/system is disabled/);
});

for(const mode of ['energy','free','circular']) {
 test(`${mode} full charge: public activation executes saved Ultimate code and posts the chat card`,async()=>{
  const {a,api,events}=setup(mode);
  const accepted=await api.requestUltimate(a);
  assert.equal(a.executions.length,1);
  assert.equal(accepted,true);
  assert.equal(a.executions[0].tokenId,'hero-token');
  assert.equal(events.messages.length,1);
  assert.match(events.messages[0].content,/Ultimate description/);
  assert.equal(api.state.ultimateLocks.size,0);
  if(mode==='energy')assert.equal(a.flags.ultimate.current,0);
  else {assert.equal(a.flags.ultimate.current,100);assert.equal(a.flags.alternateOrbCounter,0);assert.ok(Object.values(a.flags.alternateOrbStates).every(v=>v===false));}
 });
 test(`${mode} partial charge: no code, card, splash or resource consumption`,async()=>{
  const {a,api,events}=setup(mode);
  if(mode==='energy')a.flags.ultimate.current=99;
  else if(mode==='free')a.flags.alternateOrbStates.d=false;
  else a.flags.alternateOrbCounter=3;
  const before=structuredClone(a.flags);
  assert.equal(await api.requestUltimate(a),false);
  assert.deepEqual(a.flags,before);assert.equal(a.executions.length,0);
  assert.equal(events.messages.length,0);assert.equal(events.splashes.length,0);
  assert.match(events.warnings[0],mode==='energy'?/99\/100/:/3\/4/);
 });
}

for(const mode of ['free','circular'])test(`enhanced ${mode} counters consume separately and restore normal progress on stance exit`,async()=>{
 const {a,api,events}=setup('free',{enhancedStanceEnabled:true,enhancedStanceActive:true,enhancedUltimateEnabled:true,enhancedAlternateUltimateEnabled:true,enhancedUltimateText:'Separate enhanced Ultimate'});
 a.flags.enhancedAlternateOrb={mode,components:['x','y'].map(id=>({id,image:id+'.png'}))};a.flags.enhancedAlternateOrbStates={x:true,y:true};a.flags.enhancedAlternateOrbCounter=2;
 const regular=structuredClone({orb:a.flags.alternateOrb,states:a.flags.alternateOrbStates,counter:a.flags.alternateOrbCounter});
 assert.equal(alternate.alternateUltimateCharge(a,api.getConfig(a)).ready,true);
 assert.equal(await api.requestUltimate(a),true);assert.match(events.messages[0].content,/Separate enhanced Ultimate/);
 assert.equal(a.flags.ultimate.current,100);assert.equal(a.flags.enhancedAlternateOrbCounter,0);assert.ok(Object.values(a.flags.enhancedAlternateOrbStates).every(v=>!v));
 assert.deepEqual({orb:a.flags.alternateOrb,states:a.flags.alternateOrbStates,counter:a.flags.alternateOrbCounter},regular);
 a.flags.ultimate.enhancedStanceActive=false;assert.equal(alternate.alternateUltimateCharge(a,api.getConfig(a)).ready,true);
});

test('full normal counters cannot unlock an incomplete enhanced Ultimate',async()=>{
 const {a,api,events}=setup('free',{enhancedStanceEnabled:true,enhancedStanceActive:true,enhancedUltimateEnabled:true,enhancedAlternateUltimateEnabled:true});
 a.flags.enhancedAlternateOrb={components:[{id:'enh',image:'enh.png'}]};a.flags.enhancedAlternateOrbStates={enh:false};
 assert.equal(await api.requestUltimate(a),false);assert.equal(events.messages.length,0);assert.equal(a.flags.alternateOrbCounter,4);
});

test('enhanced alternate mode works when the normal Ultimate uses Energy and blocks Energy awards',async()=>{
 const {a,api}=setup('energy',{enhancedStanceEnabled:true,enhancedStanceActive:true,enhancedUltimateEnabled:true,enhancedAlternateUltimateEnabled:true,current:50});
 a.flags.enhancedAlternateOrb={components:[{id:'enh',image:'enh.png'}]};a.flags.enhancedAlternateOrbStates={enh:true};
 assert.equal(energyAfterUpdate(api.getConfig(a),90),50);assert.equal(await api.requestUltimate(a),true);assert.equal(a.flags.ultimate.current,50);
 a.flags.ultimate.enhancedStanceActive=false;assert.equal(alternate.alternateUltimateCharge(a,api.getConfig(a)).ready,false);assert.equal(energyAfterUpdate(api.getConfig(a),90),90);
});

test('an explicitly regular-energy enhanced Ultimate ignores normal alternate readiness',async()=>{
 const {a,api}=setup('free',{enhancedStanceEnabled:true,enhancedStanceActive:true,enhancedUltimateEnabled:true,enhancedAlternateUltimateEnabled:false,current:99});
 assert.equal(await api.requestUltimate(a),false);a.flags.ultimate.current=100;assert.equal(await api.requestUltimate(a),true);
 assert.equal(a.flags.ultimate.current,0);assert.equal(a.flags.alternateOrbCounter,4);
});

test('a stale normal-form GM counter control cannot write enhanced progress',async()=>{
 const {a}=setup('free',{enhancedStanceEnabled:true,enhancedStanceActive:true,enhancedUltimateEnabled:true,enhancedAlternateUltimateEnabled:true});
 a.flags.enhancedAlternateOrb={components:[{id:'x',image:'x.png'}]};a.flags.enhancedAlternateOrbStates={x:false};
 assert.equal(await alternate.setAlternateOrbCounter(a,'a',false,{form:'regular'}),false);assert.equal(a.flags.alternateOrbStates.a,true);
 assert.equal(await alternate.setAlternateOrbCounter(a,'x',true,{form:'enhanced'}),true);assert.equal(a.flags.enhancedAlternateOrbStates.x,true);
});

test('a queued enhanced circular Ultimate inserts a turn and leaves regular progress untouched',async()=>{
 const world=setup('free',{enhancedStanceEnabled:true,enhancedStanceActive:true,enhancedUltimateEnabled:true,enhancedAlternateUltimateEnabled:true,enhancedUltimateText:'Queued enhanced cast'}),{a,api,events}=world;
 a.flags.enhancedAlternateOrb={mode:'circular',firstActivation:3,components:['x','y'].map(id=>({id,image:id+'.png'}))};a.flags.enhancedAlternateOrbCounter=4;
 const combat=startCombat(world,{ownTurn:false,deferredTurns:true});
 await api.requestUltimate(a);assert.equal(a.flags.enhancedAlternateOrbCounter,0);assert.equal(a.flags.alternateOrbCounter,4);
 await world.runTimers(225);assert.equal(combat.combatant.getFlag(ID,'temporaryUltimate'),true);assert.match(events.messages[0].content,/Queued enhanced cast/);
 await api.completeUltimate(a.id);assert.equal(combat.combatant.id,'enemy-turn');assert.equal(api.state.ultimateLocks.size,0);
});

test('enhanced Ultimate executes its own code and description instead of the ordinary code',async()=>{
 const {a,api,events}=setup('circular',{enhancedStanceEnabled:true,enhancedStanceActive:true,enhancedUltimateEnabled:true,enhancedUltimateText:'Enhanced description',enhancedUltimateScript:'actor.executions.push("enhanced");'});
 assert.equal(await api.requestUltimate(a),true);
 assert.deepEqual(a.executions,['enhanced']);assert.match(events.messages[0].content,/Enhanced description/);
});

test('a code-only enhanced Ultimate is configured even without descriptive text',async()=>{
 const {a,api}=setup('free',{enhancedStanceEnabled:true,enhancedStanceActive:true,enhancedUltimateEnabled:true,enhancedUltimateScript:'actor.executions.push("enhanced");'});
 assert.equal(await api.requestUltimate(a),true);assert.deepEqual(a.executions,['enhanced']);
});

test('ordinary descriptive text remains text, and a blank code field still casts',async()=>{
 const {a,api,events}=setup('energy',{ultimateScript:'',ultimateText:'actor.executions.push("description-only");'});
 assert.equal(await api.requestUltimate(a),true);assert.equal(a.executions.length,0);
 assert.match(events.messages[0].content,/description-only/);
});

test('a disabled full orb explains the disabled Ultimate setting without executing code',async()=>{
 const {a,api,events}=setup('energy',{enabled:false});
 assert.equal(await api.requestUltimate(a),false);assert.equal(a.executions.length,0);
 assert.match(events.warnings[0],/disabled|Enable Ultimate system/i);
});

test('a queued alternate Ultimate executes once on its temporary turn and completes cleanly',async()=>{
 const world=setup('circular'),{a,api,events}=world;const combat=startCombat(world,{ownTurn:false});
 assert.equal(await api.requestUltimate(a),true);assert.equal(a.executions.length,0);
 assert.equal(a.flags.alternateOrbCounter,0);
 await api.processUltimateQueue(combat.id);
 assert.equal(a.executions.length,1);assert.equal(a.executions[0].combatantId,'ultimate-turn-0');
 assert.match(events.messages[0].content,/data-tsru-complete-ultimate/);
 assert.equal(await api.requestUltimate(a),false);assert.equal(a.executions.length,1);
 await api.completeUltimate(a.id);
 assert.equal(api.state.ultimateLocks.size,0);assert.equal(combat.combatant.id,'enemy-turn');
});

for(const mode of ['free','circular'])test(`${mode} player request is acknowledged by activation success rather than Energy consumption`,async()=>{
 const {a,api,events}=setup(mode);
 await api.onSocket({type:'activateUltimate',actorId:a.id,requestingUserId:'player',requestId:'owned-request',enhanced:false});
 const result=events.socket.find(e=>e.type==='playerActionResult');
 assert.equal(result?.accepted,true);assert.equal(a.flags.ultimate.current,100);
 assert.equal(a.executions.length,1);assert.equal(events.messages.length,1);
});

test('player activation during their turn dispatches the saved code to the owning client once',async()=>{
 const world=setup('free'),{a,api,game,gm,player,events}=world;startCombat(world);
 game.user=player;await api.requestUltimate(a);
 const request=events.socket.find(e=>e.type==='activateUltimate');assert.ok(request);assert.equal(a.executions.length,0);
 game.user=gm;await api.onSocket(request);
 const use=events.socket.find(e=>e.type==='useUltimate');assert.equal(use?.targetUserId,'player');
 assert.equal(events.socket.find(e=>e.type==='playerActionResult')?.accepted,true);
 game.user=player;await api.onSocket(use);assert.equal(a.executions.length,1);
 game.user=gm;await api.onSocket(events.socket.find(e=>e.type==='immediateUltimateComplete'));
 assert.equal(api.state.ultimateLocks.size,0);
});

test('a failing Ultimate script reports the error and releases its lock',async()=>{
 const {a,api,events}=setup('energy',{ultimateScript:'throw new Error("Example Ultimate error");'});
 assert.equal(await api.requestUltimate(a),false);assert.equal(api.state.ultimateLocks.size,0);
 assert.ok(events.errors.some(message=>message.includes('Example Ultimate error')));
});

test('actor updates during Ultimate activation cannot clear its live lock as stale',async()=>{
 const {a,api,context}=setup('free');
 vm.runInContext('dispatchTalentEvent=async(_type,{sourceActor})=>{if(await reconcileUltimateLock(sourceActor.id))throw new Error("Live Ultimate lock was cleared");};',context);
 assert.equal(await api.requestUltimate(a),true);
 assert.equal(a.executions.length,1);assert.equal(api.state.runningUltimates.size,0);
 assert.equal(api.state.ultimateLocks.size,0);
});

test('two overlapping activations execute and consume only once',async()=>{
 const {a,api}=setup('circular',{ultimateScript:'await new Promise(resolve=>setTimeout(resolve,5)); actor.executions.push("one cast");'});
 const results=await Promise.all([api.requestUltimate(a),api.requestUltimate(a)]);
 assert.equal(results.filter(Boolean).length,1);assert.deepEqual(a.executions,['one cast']);
 assert.equal(a.flags.alternateOrbCounter,0);assert.equal(api.state.runningUltimates.size,0);
});

test('an enhanced Ultimate with no override retains its saved ordinary automation',async()=>{
 const {a,api,events}=setup('energy',{enhancedStanceEnabled:true,enhancedStanceActive:true,enhancedUltimateEnabled:true,enhancedUltimateText:'Enhanced description',enhancedUltimateScript:''});
 assert.equal(await api.requestUltimate(a),true);assert.equal(a.executions.length,1);
 assert.equal(a.executions[0].tokenId,'hero-token');assert.match(events.messages[0].content,/Enhanced description/);
});

test('saved async code receives the existing tsru state and configuration helpers',async()=>{
 const {a,api}=setup('free',{elementId:'lightning',ultimateScript:'await tsru.state.set("casts",tsru.state.get("casts",0)+1); actor.executions.push(config.elementId);'});
 assert.equal(await api.requestUltimate(a),true);
 assert.equal(a.flags.scriptState.casts,1);assert.deepEqual(a.executions,['lightning']);
});

test('an error during the character own turn releases the lock and returns failure',async()=>{
 const world=setup('energy',{ultimateScript:'throw new Error("Own turn script failed");'});startCombat(world);
 assert.equal(await world.api.requestUltimate(world.a),false);
 assert.equal(world.api.state.ultimateLocks.size,0);assert.equal(world.api.state.runningUltimates.size,0);
 assert.ok(world.events.errors.some(message=>message.includes('Own turn script failed')));
});

test('a GM cast waiting for an allied turn gives explicit queue feedback',async()=>{
 const world=setup('circular'),{a,api,events}=world;const combat=startCombat(world,{ownTurn:false});
 combat.combatant.actor={id:'ally',type:'character',getFlag:(_,key)=>key==='ultimate'?{mainParty:true}:undefined};
 combat.combatant.actorId='ally';
 assert.equal(await api.requestUltimate(a),true);assert.equal(a.executions.length,0);
 assert.equal(api.state.ultimateQueues.get(combat.id).waitTurnId,'enemy-turn');
 assert.match(events.infos[0],/queued.*Main Party turn ends/);
});

test('ownership checks reject unauthorized Ultimate code execution without consumption',async()=>{
 const {a,api,game,gm}=setup('free'),before=structuredClone(a.flags);
 game.user={id:'intruder',isGM:false,active:true};a.isOwner=false;
 assert.equal(await api.requestUltimate(a),false);
 game.user=gm;assert.equal(await api.executeUltimate(a.id,'intruder'),false);
 assert.equal(a.executions.length,0);assert.deepEqual(a.flags,before);
});
