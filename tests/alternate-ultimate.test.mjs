import * as outfits from '../scripts/outfits.mjs';
import * as skillSpells from '../scripts/ability-spells.mjs';
import * as npcInitiative from "../scripts/npc-initiative.mjs";
import * as npcRules from "../scripts/npc-rules.mjs";
import * as actorControls from "../scripts/actor-sheet-controls.mjs";
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {normalizeAlternateOrb, ultimateCharge, energyAfterUpdate, alternateOrbSequence, circularOrbMaximum, circularOrbStates} from '../scripts/alternate-ultimate-rules.mjs';
import * as alternate from '../scripts/alternate-ultimates.mjs';

const ID='telys-star-rail-ultimates';
const orb=()=>normalizeAlternateOrb({components:['red','white','black','yellow'].map(id=>({id,name:id,image:`${id}.png`,color:{red:'#ff0000',white:'#ffffff',black:'#000000',yellow:'#ffff00'}[id]}))});
const allOn=()=>Object.fromEntries(orb().components.map(c=>[c.id,true]));
const source=await readFile(new URL('../scripts/module.js',import.meta.url),'utf8');
const set=(o,path,value)=>{const keys=path.split('.');let target=o;for(const key of keys.slice(0,-1))target=target[key]??={};target[keys.at(-1)]=structuredClone(value);};
const get=(o,path)=>path.split('.').reduce((v,k)=>v?.[k],o);
function actor(options={}) {
  return {id:'hero',uuid:'Actor.hero',name:'Hero',type:'character',isOwner:true,
    flags:{ultimate:{enabled:true,current:80,max:100,alternateUltimateEnabled:true,...options},alternateOrb:orb(),alternateOrbStates:{}},
    getFlag(_,key){return this.flags[key]},
    async update(updates){await new Promise(resolve=>setTimeout(resolve,1));for(const [p,v]of Object.entries(updates)) { if(p.startsWith(`flags.${ID}.`))set(this.flags,p.slice(`flags.${ID}.`.length),v); else set(this,p,v); }},
    async setFlag(_,key,value){this.flags[key]=structuredClone(value)},
    testUserPermission(user){return user?.id==='player'}
  };
}
function setup(options={}) {
  const a=actor(options),gms={id:'gm',isGM:true,active:true},player={id:'player',isGM:false,active:true},hooks=new Map(), events=[];
  const actors=[a];actors.get=id=>actors.find(x=>x.id===id);
  const users=[gms,player];users.get=id=>users.find(x=>x.id===id);
  const game={user:gms,users,actors,combat:null,combats:new Map(),settings:{get:()=>[]},socket:{emit:(...args)=>events.push(args)},modules:{get:()=>({api:{}})}};
  globalThis.game=game;
  globalThis.fromUuid=async uuid=>uuid===a.uuid?a:null;
  globalThis.ui={notifications:{warn:msg=>events.push(msg),error:msg=>events.push(msg),info(){}}};
  const sandbox={outfits,console,npcRules,actorControls,npcInitiative,structuredClone,FormApplication:class {},Hooks:{on:(name,fn)=>hooks.set(name,fn),once(){},callAll:(...args)=>events.push(args)},
    foundry:{utils:{deepClone:structuredClone,mergeObject:(base,stored)=>({...base,...stored}),expandObject:updates=>{const out={};for(const [p,v]of Object.entries(updates))set(out,p,v);return out;},getProperty:get,setProperty:set},applications:{api:{ApplicationV2:class {},HandlebarsApplicationMixin:c=>c}}},
    game,ui:globalThis.ui,canvas:{},window:{setTimeout:()=>1,clearTimeout(){}},setTimeout,clearTimeout,
    skillSpells,energyAfterUpdate,...alternate};
  const context=vm.createContext(sandbox);
  const script=source.replace(/^import .*;\n/gm,'')+ '\nglobalThis.testApi={getConfig,setEnergy,addEnergy,requestUltimate,executeUltimate,ultimateMacroDisplay,state,runUltimateScript,getVisualConfig,saveUltimateConfigFromTab,combatHudDesignerPreview,ultimateArtworkPreview};';
  vm.runInContext(script,context);
  const api=context.testApi;
  alternate.configureAlternateUltimates({isResolving:actor=>api.state.ultimateLocks.has(actor.id)});
  // Replace unrelated audiovisual and chat effects, retaining real readiness, ownership,
  // stance validation, resource consumption, lock and queue branches in executeUltimate.
  vm.runInContext('broadcastUltimateSplash=()=>{}; runUltimateScript=async actor=>{globalThis.lastUltimateConfig=getVisualConfig(actor)}; dispatchTalentEvent=async()=>{}; refreshOrb=()=>{};',context);
  return {a,game,events,hooks,api,context};
}

test('four independent counters require all four, irrespective of stored Energy',()=>{
 const config={enabled:true,current:100,max:100,alternateUltimateEnabled:true};
 for(let n=0;n<=4;n++){
  const states=Object.fromEntries(orb().components.slice(0,n).map(c=>[c.id,true]));
  assert.equal(ultimateCharge(config,orb(),states).ready,n===4);
 }
 assert.equal(ultimateCharge({...config,enabled:false},orb(),allOn()).ready,false);
});
test('empty or incomplete orb never unlocks an Ultimate',()=>{
 const config={enabled:true,alternateUltimateEnabled:true};
 assert.equal(ultimateCharge(config,{},{}).ready,false);
 const design=orb();design.components[0].image='';
 assert.equal(ultimateCharge(config,design,allOn()).ready,false);
 assert.equal(ultimateCharge(config,orb(),{...allOn(),red:1}).ready,false);
});
test('switching off alternate mode immediately restores regular Energy readiness',()=>{
 const config={enabled:true,current:99,max:100,alternateUltimateEnabled:false};
 assert.equal(ultimateCharge(config,orb(),allOn()).ready,false);
 assert.equal(ultimateCharge({...config,current:100},orb(),{}).ready,true);
});
test('alternate mode blocks every positive Energy write, including lock overrides',()=>{
 const config={current:20,max:100,alternateUltimateEnabled:true};
 assert.equal(energyAfterUpdate(config,100),20);
 assert.equal(energyAfterUpdate(config,100,{overrideLock:true}),20);
 assert.equal(energyAfterUpdate(config,0),0);
 assert.equal(energyAfterUpdate({...config,alternateUltimateEnabled:false},100),100);
});
test('regular Energy lock and explicit GM override retain their behavior',()=>{
 const c={current:20,max:100};
 assert.equal(energyAfterUpdate(c,30,{locked:true}),20);
 assert.equal(energyAfterUpdate(c,30,{locked:true,overrideLock:true}),30);
});
test('off artwork defaults to greyscale; custom off artwork and independent glows work',()=>{
 const design=orb(); design.components[1].offImage='white-off.png';design.components[2].glow=false;
 const html=alternate.renderAlternateOrb(design,{red:true,black:true});
 assert.match(html,/is-on[^>]*has-glow[^>]*--alt-color:#ff0000/);
 assert.match(html,/is-off has-off-image/);assert.match(html,/src="white-off.png"/);
 assert.doesNotMatch(html.match(/<span class="tsru-alt-orb-piece[^>]*data-alt-piece="black"[^>]*>/)[0],/has-glow/);
 assert.doesNotMatch(alternate.renderAlternateOrb({...design,glowEnabled:false},allOn()),/has-glow/);
});
test('normalization preserves black and white glow colors and safely bounds geometry',()=>{
 const design=normalizeAlternateOrb({components:[{id:'a',x:1000,y:-50,scale:NaN,rotation:Infinity,color:'#000000'},{id:'a',color:'#ffffff'}]});
 assert.equal(design.components[0].x,100);assert.equal(design.components[0].y,0);assert.equal(design.components[0].scale,50);
 assert.equal(design.components[0].color,'#000000');assert.equal(design.components[1].color,'#ffffff');
 assert.notEqual(design.components[0].id,design.components[1].id);
});
test('actual module energy API blocks gains and does not emit misleading gain hooks',async()=>{
 const {a,api,events}=setup();
 await api.addEnergy(a,15,'attack');await api.addEnergy(a,5,'lightCone');await api.setEnergy(a,100,{overrideLock:true});
 assert.equal(a.flags.ultimate.current,80);assert.equal(events.length,0);
 a.flags.ultimate.alternateUltimateEnabled=false;
 await api.addEnergy(a,5,'attack');assert.equal(a.flags.ultimate.current,85);
 assert.equal(events.some(e=>Array.isArray(e)&&e[0]==='tsruEnergyChanged'),true);
});

test('enhanced-only alternate mode blocks API and direct Energy awards in the active form',async()=>{
 const {a,api,hooks}=setup({alternateUltimateEnabled:false,enhancedStanceEnabled:true,enhancedStanceActive:true,enhancedUltimateEnabled:true,enhancedAlternateUltimateEnabled:true});
 await api.addEnergy(a,15,'attack');await api.setEnergy(a,100,{overrideLock:true});assert.equal(a.flags.ultimate.current,80);
 const changes={[`flags.${ID}.ultimate.current`]:100};hooks.get('preUpdateActor')(a,changes);assert.equal(changes[`flags.${ID}.ultimate.current`],80);
 a.flags.ultimate.enhancedStanceActive=false;await api.addEnergy(a,5,'attack');assert.equal(a.flags.ultimate.current,85);
});
test('preUpdate guard rejects direct third-party Energy awards in flat and nested updates',()=>{
 const {a,hooks}=setup();const guard=hooks.get('preUpdateActor');
 const flat={[`flags.${ID}.ultimate.current`]:100};guard(a,flat);assert.equal(flat[`flags.${ID}.ultimate.current`],80);
 const nested={flags:{[ID]:{ultimate:{current:95}}}};guard(a,nested);assert.equal(nested.flags[ID].ultimate.current,80);
 const disabling={flags:{[ID]:{ultimate:{current:95,alternateUltimateEnabled:false}}}};guard(a,disabling);assert.equal(disabling.flags[ID].ultimate.current,95);
});
test('manual GM switches serialize independent updates and reject player edits',async()=>{
 const {a,game}=setup();
 await Promise.all(['red','white','black','yellow'].map(id=>alternate.setAlternateOrbCounter(a,id,true)));
 assert.deepEqual(a.flags.alternateOrbStates,allOn());
 game.user={id:'player',isGM:false};
 assert.equal(await alternate.setAlternateOrbCounter(a,'red',false),false);assert.equal(a.flags.alternateOrbStates.red,true);
 assert.equal(alternate.openAlternateOrbDesigner(a),undefined);
});
for (const mode of ['free','circular']) test(`inheriting a regular ${mode} orb copies its configuration without consuming either form's progress`,async()=>{
 const {a}=setup({enhancedAlternateUltimateEnabled:false});
 a.flags.alternateOrb={...orb(),mode,startComponentId:'yellow',firstActivation:3,glowEnabled:false};
 a.flags.alternateOrbStates={red:true};a.flags.alternateOrbCounter=4;
 a.flags.enhancedAlternateOrbStates={white:true};a.flags.enhancedAlternateOrbCounter=2;
 const before=structuredClone(a.flags);
 assert.equal(await alternate.inheritRegularAlternateOrb(a),true);
 assert.equal(a.flags.ultimate.enhancedAlternateUltimateEnabled,true);
 assert.deepEqual(alternate.getAlternateOrb(a,'enhanced'),alternate.getAlternateOrb(a,'regular'));
 for(const name of ['alternateOrb','alternateOrbStates','alternateOrbCounter','enhancedAlternateOrbStates','enhancedAlternateOrbCounter'])assert.deepEqual(a.flags[name],before[name]);
 a.flags.enhancedAlternateOrb.components[0].image='enhanced-only.png';
 assert.equal(a.flags.alternateOrb.components[0].image,'red.png');
});
test('inheritance rejects non-GMs, live Ultimate locks and incomplete designs without writing configuration',async()=>{
 const {a,api,game}=setup({enhancedAlternateUltimateEnabled:false});
 game.user={isGM:false};assert.equal(await alternate.inheritRegularAlternateOrb(a),false);
 game.user={isGM:true};api.state.ultimateLocks.add(a.id);assert.equal(await alternate.inheritRegularAlternateOrb(a),false);api.state.ultimateLocks.clear();
 a.flags.alternateOrb.components[0].image='';assert.equal(await alternate.inheritRegularAlternateOrb(a),false);
 a.flags.alternateOrb.components=[];assert.equal(await alternate.inheritRegularAlternateOrb(a),false);
 assert.equal(a.flags.enhancedAlternateOrb,undefined);assert.equal(a.flags.ultimate.enhancedAlternateUltimateEnabled,false);
});
test('inheritance rejects ambiguous circular order and propagates a failed document save',async()=>{
 const {a}=setup({enhancedAlternateUltimateEnabled:false});
 a.flags.alternateOrb={...orb(),mode:'circular'};a.flags.alternateOrb.components[1].sequence=1;
 assert.equal(await alternate.inheritRegularAlternateOrb(a),false);
 a.flags.alternateOrb=orb();a.update=async()=>{throw new Error('Save failed')};
 await assert.rejects(alternate.inheritRegularAlternateOrb(a),/Save failed/);
 assert.equal(a.flags.enhancedAlternateOrb,undefined);assert.equal(a.flags.ultimate.enhancedAlternateUltimateEnabled,false);
});
test('actual Ultimate activation refuses a partially charged alternate orb',async()=>{
 const {a,api}=setup({current:100});
 a.flags.alternateOrbStates={red:true,white:true,black:true};
 await api.executeUltimate(a.id,'gm');
 assert.equal(a.flags.alternateOrbStates.red,true);assert.equal(api.state.ultimateLocks.size,0);
});
test('actual alternate Ultimate consumes counters, retains normal Energy, and keeps enhanced form text',async()=>{
 const {a,api,context}=setup({enhancedStanceEnabled:true,enhancedStanceActive:true,enhancedUltimateEnabled:true,ultimateText:'Normal',enhancedUltimateText:'Enhanced',enhancedSplashImage:'enhanced.png'});
 a.flags.alternateOrbStates=allOn();
 await api.executeUltimate(a.id,'gm',true);
 assert.deepEqual(a.flags.alternateOrbStates,{red:false,white:false,black:false,yellow:false});
 assert.equal(a.flags.ultimate.current,80);assert.equal(api.state.ultimateLocks.size,0);
 assert.equal(context.lastUltimateConfig.ultimateText,'Enhanced');assert.equal(context.lastUltimateConfig.splashImage,'enhanced.png');
});
test('stale enhanced-stance requests and unowned Ultimate requests do not consume counters',async()=>{
 const {a,api}=setup();a.flags.alternateOrbStates=allOn();
 await api.executeUltimate(a.id,'gm',true);assert.equal(a.flags.alternateOrbStates.red,true);
 await api.executeUltimate(a.id,'unknown');assert.equal(a.flags.alternateOrbStates.red,true);
});
test('queued alternate Ultimates consume once and block GM recharging until completion',async()=>{
 const {a,api,game}=setup();a.flags.alternateOrbStates=allOn();
 const combatant={id:'enemy',actorId:'enemy',actor:{type:'npc'},getFlag:()=>false};
 game.combat={id:'fight',started:true,round:1,combatant,combatants:[combatant]};
 await api.executeUltimate(a.id,'gm',false);
 assert.equal(api.state.ultimateQueues.get('fight').requests.length,1);
 assert.equal(a.flags.alternateOrbStates.red,false);
 assert.equal(await alternate.setAlternateOrbCounter(a,'red',true),false);
 await api.executeUltimate(a.id,'gm',false);
 assert.equal(api.state.ultimateQueues.get('fight').requests.length,1);
});
test('normal Ultimate still consumes Energy with alternate mode off',async()=>{
 const {a,api}=setup({alternateUltimateEnabled:false,current:100});a.flags.alternateOrbStates=allOn();
 await api.executeUltimate(a.id,'gm',false);
 assert.equal(a.flags.ultimate.current,0);assert.deepEqual(a.flags.alternateOrbStates,allOn());
});
test('hotbar readiness uses the same alternate counters as the activation path',()=>{
 const {a,api}=setup({current:100});
 assert.equal(api.ultimateMacroDisplay(a).ready,false);
 a.flags.alternateOrbStates=allOn();a.flags.ultimate.current=0;
 assert.equal(api.ultimateMacroDisplay(a).ready,true);assert.equal(api.ultimateMacroDisplay(a).current,4);
});

test('preview.6 orb designs keep free activation and acquire stable sequence defaults',()=>{
 const old={components:[{id:'a',image:'a.png'},{id:'b',image:'b.png'}]};
 const migrated=normalizeAlternateOrb(old);
 assert.equal(migrated.mode,'free');assert.equal(migrated.firstActivation,1);
 assert.deepEqual(migrated.components.map(c=>c.sequence),[1,2]);assert.equal(migrated.startComponentId,'a');
});
test('circular order starts at the chosen icon and wraps independently of drawing layers',()=>{
 const design=orb();design.mode='circular';design.startComponentId='black';
 assert.deepEqual(alternateOrbSequence(design).map(c=>c.id),['black','yellow','red','white']);
 design.components.reverse();
 assert.deepEqual(alternateOrbSequence(design).map(c=>c.id),['black','yellow','red','white']);
 design.components.find(c=>c.id==='yellow').sequence=10;
 assert.deepEqual(alternateOrbSequence(design).map(c=>c.id),['black','yellow','red','white']);
});
test('each circular increment keeps all prior icons lit, including an offset first activation number',()=>{
 const design={...orb(),mode:'circular',startComponentId:'white',firstActivation:3};
 const expected=[[],[],[],['white'],['white','black'],['white','black','yellow'],['white','black','yellow','red']];
 for(let count=0;count<=6;count++){
  const states=circularOrbStates(design,count),lit=Object.keys(states).filter(id=>states[id]);
  assert.deepEqual(new Set(lit),new Set(expected[count]));
  assert.equal(ultimateCharge({enabled:true,alternateUltimateEnabled:true},design,states).ready,count===6);
 }
 assert.equal(circularOrbMaximum(design),6);
});
test('circular counters clamp at full charge, unwind on decrement, and recover a deleted start icon',()=>{
 const design={...orb(),mode:'circular',startComponentId:'black'};
 assert.deepEqual(circularOrbStates(design,999),allOn());
 assert.deepEqual(circularOrbStates(design,-10),{red:false,white:false,black:false,yellow:false});
 assert.equal(circularOrbStates(design,2).black,true);assert.equal(circularOrbStates(design,2).red,false);
 design.components=design.components.filter(c=>c.id!=='black');
 assert.deepEqual(alternateOrbSequence(design).map(c=>c.id),['red','white','yellow']);
 assert.equal(ultimateCharge({enabled:true,alternateUltimateEnabled:true},{mode:'circular'},circularOrbStates({},100)).ready,false);
});
test('circular live states ignore independent flags and reads never mutate charge',()=>{
 const {a}=setup();a.flags.alternateOrb.mode='circular';a.flags.alternateOrbStates=allOn();a.flags.alternateOrbCounter=0;
 const before=structuredClone(a.flags);
 assert.equal(alternate.alternateUltimateCharge(a,a.flags.ultimate).ready,false);
 assert.deepEqual(a.flags,before);
 a.flags.alternateOrbCounter=4;
 assert.equal(alternate.alternateUltimateCharge(a,a.flags.ultimate).ready,true);
});
test('manual circular increments serialize and clamp without bypassing GM or mode checks',async()=>{
 const {a,game}=setup();a.flags.alternateOrb.mode='circular';
 await Promise.all(Array.from({length:3},()=>alternate.setAlternateOrbCount(a,1,{relative:true})));
 assert.equal(a.flags.alternateOrbCounter,3);
 await alternate.setAlternateOrbCount(a,1,{relative:true});assert.equal(a.flags.alternateOrbCounter,4);
 await alternate.setAlternateOrbCount(a,1,{relative:true});assert.equal(a.flags.alternateOrbCounter,4);
 await alternate.setAlternateOrbCount(a,-2,{relative:true});assert.equal(a.flags.alternateOrbCounter,2);
 assert.equal(await alternate.setAlternateOrbCounter(a,'red',true),false);
 assert.equal(await alternate.setAlternateOrbCount(a,Infinity),false);
 game.user={id:'player',isGM:false};assert.equal(await alternate.setAlternateOrbCount(a,4),false);
 game.user={id:'gm',isGM:true};a.flags.alternateOrb.mode='free';
 assert.equal(await alternate.setAlternateOrbCount(a,4),false);
});
test('circular partial charge blocks casting; full charge casts the enhanced Ultimate and resets both modes',async()=>{
 const {a,api,context}=setup({enhancedStanceEnabled:true,enhancedStanceActive:true,enhancedUltimateEnabled:true,enhancedUltimateText:'Enhanced circular'});
 a.flags.alternateOrb.mode='circular';a.flags.alternateOrb.startComponentId='black';a.flags.alternateOrbStates=allOn();
 await alternate.setAlternateOrbCount(a,3);await api.executeUltimate(a.id,'gm',true);
 assert.equal(a.flags.alternateOrbCounter,3);assert.equal(api.state.ultimateLocks.size,0);
 await alternate.setAlternateOrbCount(a,4);await api.executeUltimate(a.id,'gm',true);
 assert.equal(context.lastUltimateConfig.ultimateText,'Enhanced circular');
 assert.equal(a.flags.alternateOrbCounter,0);assert.equal(a.flags.ultimate.current,80);
 assert.deepEqual(a.flags.alternateOrbStates,{red:false,white:false,black:false,yellow:false});
 assert.equal(alternate.alternateUltimateCharge(a,a.flags.ultimate).ready,false);
});
test('queued circular Ultimates consume exactly once and reject charge changes until completion',async()=>{
 const {a,api,game}=setup();a.flags.alternateOrb.mode='circular';await alternate.setAlternateOrbCount(a,4);
 const enemy={id:'enemy',actorId:'enemy',actor:{type:'npc'},getFlag:()=>false};
 game.combat={id:'fight',started:true,round:1,combatant:enemy,combatants:[enemy]};
 await api.executeUltimate(a.id,'gm',false);
 assert.equal(a.flags.alternateOrbCounter,0);assert.equal(await alternate.setAlternateOrbCount(a,4),false);
 await api.executeUltimate(a.id,'gm',false);assert.equal(api.state.ultimateQueues.get('fight').requests.length,1);
});
test('free mode still uses only its checkboxes and casting also clears the circular counter',async()=>{
 const {a,api}=setup();a.flags.alternateOrbCounter=4;
 assert.equal(alternate.alternateUltimateCharge(a,a.flags.ultimate).ready,false);
 a.flags.alternateOrbStates=allOn();await api.executeUltimate(a.id,'gm',false);
 assert.equal(a.flags.alternateOrbCounter,0);
});
test('a fully charged circular orb still requires every icon image and still blocks all Energy gains',async()=>{
 const {a,api}=setup();a.flags.alternateOrb.mode='circular';await alternate.setAlternateOrbCount(a,4);
 a.flags.alternateOrb.components[0].image='';
 assert.equal(alternate.alternateUltimateCharge(a,a.flags.ultimate).ready,false);
 await api.addEnergy(a,5,'lightCone');await api.setEnergy(a,100,{overrideLock:true});
 assert.equal(a.flags.ultimate.current,80);
});

test('a stale sheet draft cannot turn alternate mode off or award Energy',async()=>{
 const {a,api,context}=setup();
 vm.runInContext('refreshSkillUI=()=>{};refreshResourceHuds=()=>{};refreshCombatPartyHud=()=>{};refreshBossHud=()=>{};refreshInitiativeCarousel=()=>{};dockSceneControlsBesideCarousel=()=>{};',context);
 const updates=[];
 a.update=async patch=>{updates.push(structuredClone(patch));Object.assign(a.flags.ultimate,patch[`flags.${ID}.ultimate`]);};
 const fields=[{name:'alternateUltimateEnabled',type:'checkbox',checked:false},{name:'current',type:'number',value:'100'},{name:'ultimateText',type:'textarea',value:'Updated description'}];
 const tab={find:()=>({each:fn=>fields.forEach((field,i)=>fn(i,field))})};
 await api.saveUltimateConfigFromTab(a,tab);
 assert.equal(a.flags.ultimate.alternateUltimateEnabled,true);
 assert.equal(a.flags.ultimate.current,80);
 assert.equal(a.flags.ultimate.ultimateText,'Updated description');
 assert.equal(Object.hasOwn(updates[0][`flags.${ID}.ultimate`],'alternateUltimateEnabled'),false);
 a.flags.ultimate.alternateUltimateEnabled=false;
 fields[0].checked=true;
 await api.saveUltimateConfigFromTab(a,tab);
 assert.equal(a.flags.ultimate.alternateUltimateEnabled,false);
 assert.equal(a.flags.ultimate.current,100);
});

test('a sheet save already in flight preserves a subsequent mode switch',async()=>{
 const {a,api,context}=setup({alternateUltimateEnabled:false});
 vm.runInContext('refreshSkillUI=()=>{};refreshResourceHuds=()=>{};refreshCombatPartyHud=()=>{};refreshBossHud=()=>{};refreshInitiativeCarousel=()=>{};dockSceneControlsBesideCarousel=()=>{};',context);
 let release,signal;
 const gate=new Promise(resolve=>release=resolve),started=new Promise(resolve=>signal=resolve);
 a.update=async patch=>{signal();await gate;Object.assign(a.flags.ultimate,patch[`flags.${ID}.ultimate`]);};
 const tab={find:()=>({each:fn=>fn(0,{name:'ultimateText',value:'Draft saved'})})};
 const saving=api.saveUltimateConfigFromTab(a,tab);
 await started;
 a.flags.ultimate.alternateUltimateEnabled=true;
 release();await saving;
 assert.equal(a.flags.ultimate.alternateUltimateEnabled,true);
 assert.equal(a.flags.ultimate.ultimateText,'Draft saved');
});

test('HUD and sheet previews replace standard artwork with the configured alternate components',()=>{
 const {a,api,context}=setup({ultimateButtonImage:'standard-orb.png'});
 vm.runInContext('escapeHTML=value=>String(value??"");',context);
 a.flags.alternateOrbStates=allOn();
 for(const render of [api.combatHudDesignerPreview,api.ultimateArtworkPreview]){
  const custom=render(a,api.getConfig(a));
  assert.match(custom,/class="is-alternate"/);
  assert.equal((custom.match(/data-alt-piece=/g)||[]).length,4);
  assert.doesNotMatch(custom,/standard-orb\.png|tsru-hud-orb-fill|72%<\/strong>/);
  assert.match(custom,/4\/4<\/strong>/);
  a.flags.ultimate.alternateUltimateEnabled=false;
  const normal=render(a,api.getConfig(a));
  assert.match(normal,/standard-orb\.png/);
  assert.doesNotMatch(normal,/data-alt-piece=/);
  a.flags.ultimate.alternateUltimateEnabled=true;
 }
});
