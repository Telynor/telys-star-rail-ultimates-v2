import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSummons,parseHpDice,fixedHpCost,rectangle,insideRadius,segmentIntersectsRect,segmentsCross} from '../scripts/summoning-rules.mjs';
import {placementContext,canPlaceSummon,legalSummonPositions,validateSummonPlan,createAbilitySummons,evaluateSkillHpCost,playSummonAnimation,ensureQueuedSummonPlan,handleSummoningSocket} from '../scripts/ability-summons.mjs';
import {matchesSetting} from '../scripts/character-settings.mjs';
import {world,startCombat,ID} from './helpers/summoning-world.mjs';

test('summon configuration accepts existing world Actor references and bounds counts and radius',()=>{
 const value=normalizeSummons({enabled:true,radius:-2,choices:[{id:'same',actorUuid:'Actor.wolf',quantity:0},{id:'same',actorUuid:'Actor.hero',quantity:100},{actorUuid:'Compendium.actors.abc'}]});
 assert.equal(value.radius,0);assert.equal(value.choices.length,2);assert.equal(value.choices[0].quantity,1);assert.equal(value.choices[1].quantity,20);assert.notEqual(value.choices[0].id,value.choices[1].id);
 assert.equal(normalizeSummons().radius,30);
});

test('HP requirements floor percentages using the chosen HP basis and accept only bounded xDy rolls',()=>{
 const hp={value:39,max:55};const c={skillHpCostEnabled:true};
 assert.equal(fixedHpCost({...c,skillHpCostType:'half'},hp),19);
 assert.equal(fixedHpCost({...c,skillHpCostType:'ten'},hp),3);
 assert.equal(fixedHpCost({...c,skillHpCostType:'half',skillHpCostBasis:'max'},hp),27);
 assert.equal(fixedHpCost({...c,skillHpCostType:'flat',skillHpCostFlat:12.9},hp),12);
 assert.equal(fixedHpCost({...c,skillHpCostType:'roll'},hp),null);assert.equal(fixedHpCost({},hp),0);
 assert.equal(parseHpDice(' 02 D 06 '),'2d6');
 for(const formula of ['1d6+3','1d6;game.foo()','d6','0d6','101d6','1d0','1d1001','-1d6'])assert.throws(()=>parseHpDice(formula));
});

test('full footprint range and wall geometry handle corners, wall edges and interior barriers',()=>{
 const caster=rectangle(100,100,100,100);
 assert.equal(insideRadius(rectangle(200,100,100,100),caster,100),true);
 assert.equal(insideRadius(rectangle(200,200,100,100),caster,100),false);
 assert.equal(segmentIntersectsRect({x:0,y:150},{x:400,y:150},caster),true);
 assert.equal(segmentIntersectsRect({x:0,y:100},{x:400,y:100},caster),false);
 assert.equal(segmentsCross({x:0,y:0},{x:100,y:100},{x:0,y:100},{x:100,y:0}),true);
 assert.equal(segmentsCross({x:0,y:0},{x:100,y:0},{x:200,y:0},{x:300,y:0}),false);
});

test('open-map placement uses anchor range and full token occupancy, rejecting out-of-bounds and unsnapped selections',()=>{
 const w=world(),c=placementContext(w.scene,w.caster),small={width:1,height:1},large={width:2,height:2};
 assert.equal(canPlaceSummon(c,small,{x:500,y:400},5),true);
 assert.equal(canPlaceSummon(c,large,{x:500,y:400},5),true);
 assert.equal(canPlaceSummon(c,small,{x:400,y:400},15),false);
 assert.equal(canPlaceSummon(c,small,{x:501,y:400},15),false);
 assert.equal(canPlaceSummon(c,large,{x:900,y:400},100),true);
 assert.equal(canPlaceSummon(c,large,{x:1000,y:400},100),false);
 assert.equal(canPlaceSummon(c,small,{x:500,y:400},15,[rectangle(500,400,100,100)]),false);
 w.scene.grid.size=200;w.caster.x=400;w.caster.y=400;
 assert.equal(canPlaceSummon(placementContext(w.scene,w.caster),small,{x:600,y:400},5),true);
});

test('native grid offsets and padded scene bounds are honored',()=>{
 const w=world();w.scene.dimensions={sceneRect:{x:50,y:50,width:800,height:800}};
 w.scene.grid.getOffset=p=>({i:Math.floor((p.y-50)/100),j:Math.floor((p.x-50)/100)});
 w.scene.grid.getTopLeftPoint=({i,j})=>({x:50+j*100,y:50+i*100});w.caster.x=450;w.caster.y=450;
 const c=placementContext(w.scene,w.caster),choice={width:1,height:1};
 assert.equal(canPlaceSummon(c,choice,{x:550,y:450},5),true);
 assert.equal(canPlaceSummon(c,choice,{x:500,y:400},10),false);
 assert.equal(canPlaceSummon(c,choice,{x:850,y:450},100),false);
});

test('lighting walls block summons even when movement is allowed; open doors and another level do not',()=>{
 const w=world(),choice={width:1,height:1},position={x:600,y:400};
 w.scene.walls.push({c:[550,0,550,1000],move:0,light:1});
 assert.equal(canPlaceSummon(placementContext(w.scene,w.caster),choice,position,20),false);
 assert.equal(canPlaceSummon(placementContext(w.scene,w.caster),{width:2,height:1},{x:500,y:300},20),false,'cannot straddle a wall');
 w.scene.walls[0].door=1;w.scene.walls[0].ds=1;
 assert.equal(canPlaceSummon(placementContext(w.scene,w.caster),choice,position,20),true);
 w.scene.walls[0].ds=0;w.scene.walls[0].level='upper';w.caster.level='ground';
 assert.equal(canPlaceSummon(placementContext(w.scene,w.caster),choice,position,20),true);
 w.scene.walls[0].level='ground';
 assert.equal(canPlaceSummon(placementContext(w.scene,w.caster),choice,position,20),false);
});

test('Foundry light collision backends also exclude barriers absent from the simple wall collection',()=>{
 const w=world();globalThis.CONFIG={Canvas:{polygonBackends:{light:{testCollision:(a,b,options)=>{assert.equal(options.type,'light');return b.x>550;}}}}};
 assert.equal(canPlaceSummon(placementContext(w.scene,w.caster),{width:1,height:1},{x:600,y:400},20),false);
 delete globalThis.CONFIG;
});

test('authority resolves saved choices and sizes instead of trusting a forged client plan',async()=>{
 const w=world();const original=structuredClone(w.plan);
 await validateSummonPlan(w.a,'skill',w.plan,w.player);
 await assert.rejects(validateSummonPlan(w.a,'skill',{...w.plan,choiceId:'Actor.hero'},w.player),/selection changed/);
 await assert.rejects(validateSummonPlan(w.a,'skill',{...w.plan,positions:[...w.plan.positions,{x:600,y:400}]},w.player),/selection changed/);
 await assert.rejects(validateSummonPlan(w.a,'skill',w.plan,w.stranger),/do not own/);
 w.scene.tokens.push({x:700,y:400,width:1,height:1});w.wolf.prototypeToken.width=4;
 await assert.rejects(validateSummonPlan(w.a,'skill',w.plan,w.player),/Cannot Fit/);
 assert.deepEqual(w.plan,original);
});

test('a completely occupied zone reports no legal placements',()=>{
 const w=world();w.block();assert.equal(legalSummonPositions(placementContext(w.scene,w.caster),{width:1,height:1},15).length,0);
});

test('multi-summon creation is one batch with independent tokens and removes partial creations after a failure',async()=>{
 const w=world({quantity:2});const result=await createAbilitySummons(w.a,'skill',w.plan,w.player);
 assert.equal(result.tokenIds.length,2);assert.equal(w.events.creates,1);assert.equal(w.scene.tokens.length,3);assert.equal(w.scene.tokens[1].actorId,'wolf');assert.equal(w.scene.tokens[1].width,1);
 assert.equal(w.scene.tokens[1].getFlag(ID,'abilitySummon').casterId,'hero');
 const v=world({quantity:2});v.scene.failCreate=true;
 await assert.rejects(createAbilitySummons(v.a,'skill',v.plan,v.player),/creation failed/);assert.equal(v.scene.tokens.length,1);
});

test('two simultaneous casts cannot create tokens in the same square',async()=>{
 const w=world();const results=await Promise.allSettled([createAbilitySummons(w.a,'skill',w.plan,w.player),createAbilitySummons(w.a,'skill',w.plan,w.player)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);assert.equal(w.scene.tokens.length,2);
});

test('dice HP cost rolls once and insufficient HP rejects the cast',async()=>{
 const w=world({config:{skillHpCostEnabled:true,skillHpCostType:'roll',skillHpCostRoll:'2d6'}});
 w.dice.total=7.8;const hp=await evaluateSkillHpCost(w.a,w.a.flags.ultimate);assert.equal(hp.cost,7);assert.equal(w.events.rolls,1);
 w.a.system.attributes.hp.value=2;
 await assert.rejects(evaluateSkillHpCost(w.a,w.a.flags.ultimate),/requires 7 HP/);
});

for(const [type,cost]of [['half',19],['ten',3],['flat',8],['roll',7]])test(`actual Skill cast deducts its SP and ${type} HP cost and preserves temporary HP`,async()=>{
 const w=world({config:{skillHpCostEnabled:true,skillHpCostType:type,skillHpCostFlat:8,skillHpCostRoll:'2d6'}});
 assert.equal(await w.api.executeSkill(w.a.id,w.gm.id,false,w.plan),true);
 assert.equal(w.settings.get('skillPoints'),3);assert.equal(w.a.system.attributes.hp.value,39-cost);assert.equal(w.a.system.attributes.hp.temp,12);
 assert.equal(w.events.messages.length,1);assert.equal(w.scene.tokens.length,2);assert.deepEqual(w.events.talent.filter(type=>type==='skillUsed'),['skillUsed']);assert.equal(w.api.state.skillLocks.size,0);
 assert.equal(w.events.rolls,type==='roll'?1:0);
});

test('free Skills cast with an empty SP bar and exact HP costs may reach zero',async()=>{
 const w=world({config:{skillPointCost:0,skillHpCostEnabled:true,skillHpCostType:'flat',skillHpCostFlat:39}});w.settings.set('skillPoints',0);
 assert.equal(await w.api.executeSkill(w.a.id,w.gm.id,false,w.plan),true);assert.equal(w.a.system.attributes.hp.value,0);assert.equal(w.settings.get('skillPoints'),0);
});

test('invalid placement and insufficient HP leave resources and cast automation untouched',async()=>{
 for(const reason of ['fit','hp']){
  const w=world({config:{skillHpCostEnabled:true,skillHpCostType:'flat',skillHpCostFlat:100}});
  if(reason==='fit')w.block();
  assert.equal(await w.api.executeSkill(w.a.id,w.gm.id,false,w.plan),false);
  assert.equal(w.settings.get('skillPoints'),5);assert.equal(w.a.system.attributes.hp.value,39);assert.equal(w.events.messages.length,0);assert.equal(w.events.talent.length,0);assert.equal(w.events.lightCone.length,0);assert.equal(w.api.state.skillLocks.size,0);
 }
});

test('token creation failure consumes neither resources nor Skill automation',async()=>{
 const w=world({quantity:2,config:{skillHpCostEnabled:true}});w.scene.failCreate=true;
 assert.equal(await w.api.executeSkill(w.a.id,w.gm.id,false,w.plan),false);
 assert.equal(w.scene.tokens.length,1);assert.equal(w.settings.get('skillPoints'),5);assert.equal(w.a.system.attributes.hp.value,39);assert.equal(w.events.talent.length,0);
});

test('HP write failure refunds SP, removes summoned tokens and releases the cast lock',async()=>{
 const w=world({config:{skillHpCostEnabled:true}});w.a.failHp=true;
 assert.equal(await w.api.executeSkill(w.a.id,w.gm.id,false,w.plan),false);
 assert.equal(w.scene.tokens.length,1);assert.equal(w.settings.get('skillPoints'),5);assert.equal(w.a.system.attributes.hp.value,39);assert.equal(w.events.talent.length,0);assert.equal(w.events.lightCone.length,0);assert.equal(w.api.state.skillLocks.size,0);
});

test('player cast requests are revalidated by the authority and return the Cannot Fit reason',async()=>{
 const w=world();w.block();await w.api.onSocket({type:'activateSkill',actorId:'hero',requestingUserId:'player',enhanced:false,summonPlan:w.plan,requestId:'client'});
 const result=w.events.socket.find(e=>e.type==='playerActionResult');assert.equal(result.accepted,false);assert.match(result.message,/Cannot Fit/);assert.equal(w.settings.get('skillPoints'),5);
});

for(const mode of ['energy','free','circular'])for(const enhanced of [false,true])test(`${enhanced?'enhanced':'regular'} ${mode} summoning Ultimate executes, consumes the active charge and leaves the other form intact`,async()=>{
 const w=world({mode});if(enhanced){Object.assign(w.a.flags.ultimate,{enhancedStanceEnabled:true,enhancedStanceActive:true,enhancedUltimateEnabled:true,enhancedAlternateUltimateEnabled:mode!=='energy'});w.a.flags.enhancedAlternateOrb=structuredClone(w.a.flags.alternateOrb);w.a.flags.enhancedAlternateOrbStates={a:true,b:true,c:true,d:true};w.a.flags.enhancedAlternateOrbCounter=4;}
 const c=startCombat(w,{ownTurn:true});
 assert.equal(await w.api.executeUltimate(w.a.id,w.gm.id,enhanced,w.plan),true);
 assert.equal(w.scene.tokens.length,2);assert.equal(w.a.executions.length,1);assert.equal(w.events.splashes.length,1);assert.equal(w.events.messages.length,1);assert.equal(c.combatants.length,2);
 assert.equal(w.api.state.ultimateSummonReceipts.size,0);
 if(mode==='energy')assert.equal(w.a.flags.ultimate.current,0);else{const prefix=enhanced?'enhancedAlternateOrb':'alternateOrb';assert.equal(w.a.flags[`${prefix}Counter`],0);assert.ok(Object.values(w.a.flags[`${prefix}States`]).every(value=>!value));if(enhanced)assert.equal(w.a.flags.alternateOrbCounter,4);}
});

for(const mode of ['energy','free','circular'])for(const enhanced of [false,true])test(`${enhanced?'enhanced':'regular'} ${mode} queued Ultimate refunds its exact charge if no creature fits at execution`,async()=>{
 const w=world({mode});if(enhanced){Object.assign(w.a.flags.ultimate,{enhancedStanceEnabled:true,enhancedStanceActive:true,enhancedUltimateEnabled:true,enhancedAlternateUltimateEnabled:mode!=='energy'});w.a.flags.enhancedAlternateOrb=structuredClone(w.a.flags.alternateOrb);w.a.flags.enhancedAlternateOrbStates={a:true,b:true,c:true,d:true};w.a.flags.enhancedAlternateOrbCounter=4;}
 const before=structuredClone(w.a.flags),c=startCombat(w,{ally:true});
 assert.equal(await w.api.executeUltimate(w.a.id,w.gm.id,enhanced,w.plan),true);assert.equal(w.scene.tokens.length,1);assert.equal(w.events.talent.length,0,'queued summon does not grant cast rewards before placement');
 w.block();c.turn=1;await w.api.processUltimateQueue(c.id);
 assert.deepEqual(w.a.flags,before);assert.equal(w.a.executions.length,0);assert.equal(w.events.splashes.length,0);assert.equal(w.api.state.ultimateLocks.size,0);assert.equal(w.api.state.ultimateQueues.size,0);assert.equal(c.combatant.id,'hero-turn');assert.equal(w.api.state.ultimateSummonReceipts.size,0);
 assert.ok(w.events.errors.some(message=>message.includes('Cannot Fit')));
});

test('a queued summon materializes at the Ultimate turn and completes back to the interrupted actor',async()=>{
 const w=world({mode:'circular'}),c=startCombat(w);
 assert.equal(await w.api.executeUltimate(w.a.id,w.gm.id,false,w.plan),true);assert.equal(w.scene.tokens.length,1);
 await w.api.processUltimateQueue(c.id);assert.equal(w.scene.tokens.length,2);assert.equal(c.combatant.getFlag(ID,'temporaryUltimate'),true);assert.equal(w.a.executions.length,1);assert.deepEqual(w.events.talent,['ultimateUsed']);
 await w.api.completeUltimate(w.a.id);assert.equal(c.combatant.id,'enemy-turn');assert.equal(w.api.state.ultimateQueues.size,0);
});

test('a failed temporary-turn insertion removes summons, refunds charge and resumes initiative',async()=>{
 const w=world({mode:'free'}),c=startCombat(w);await w.api.executeUltimate(w.a.id,w.gm.id,false,w.plan);c.failTurn=true;
 await w.api.processUltimateQueue(c.id);
 assert.equal(w.scene.tokens.length,1);assert.equal(w.a.flags.alternateOrbCounter,4);assert.equal(c.combatant.id,'enemy-turn');assert.equal(c.combatants.length,2);assert.equal(w.api.state.ultimateQueues.size,0);
});

test('a standard queued charge can be restored after a stance changes to alternate without allowing unrelated Energy gains',async()=>{
 const w=world(),c=startCombat(w);await w.api.executeUltimate(w.a.id,w.gm.id,false,w.plan);
 Object.assign(w.a.flags.ultimate,{enhancedStanceEnabled:true,enhancedStanceActive:true,enhancedUltimateEnabled:true,enhancedAlternateUltimateEnabled:true});
 await w.api.processUltimateQueue(c.id);assert.equal(w.a.flags.ultimate.current,100);
 await w.a.update({[`flags.${ID}.ultimate.current`]:0});await w.a.update({[`flags.${ID}.ultimate.current`]:80},{tsruUltimateRefund:'forged'});assert.equal(w.a.flags.ultimate.current,0);
});

test('ending combat refunds reserved summoning Ultimates',async()=>{
 const w=world(),c=startCombat(w,{ally:true});await w.api.executeUltimate(w.a.id,w.gm.id,false,w.plan);
 // Exercise the actual receipt restoration; the broad combat teardown has unrelated HUD dependencies.
 assert.equal(await w.api.refundSummoningUltimate(w.a.id),true);assert.equal(w.a.flags.ultimate.current,100);assert.equal(w.a.flags.ultimate.energyLockCombatId,'');assert.equal(w.api.state.ultimateSummonReceipts.size,0);
 assert.equal(await w.api.refundSummoningUltimate(w.a.id),false,'a receipt cannot award a second refund');
});

test('setting search accepts summon, health and cost synonyms with multiple narrowing keywords',()=>{
 assert.ok(matchesSetting('pet range','Summoning radius creature'));
 assert.ok(matchesSetting('blood price','Has HP requirement cost'));
 assert.ok(matchesSetting('minion ult','Ultimate summons creature'));
 assert.equal(matchesSetting('pet range','Skill Point cost'),false);
});

test('animation restores mesh alpha on renderer failure without creating custom PIXI graphics',async()=>{
 world();const original={PIXI:globalThis.PIXI,requestAnimationFrame:globalThis.requestAnimationFrame};
 const mesh={alpha:.7},token={object:{mesh}};
 globalThis.PIXI={Graphics:class{constructor(){throw Error('Custom graphics are unavailable')}}};
 globalThis.requestAnimationFrame=()=>{throw Error('Renderer stopped')};
 const warn=console.warn;console.warn=()=>{};
 try{await playSummonAnimation(token);assert.equal(mesh.alpha,.7);}finally{console.warn=warn;Object.assign(globalThis,original);}
});

test('queued re-placement accepts a response only from the requesting player',async()=>{
 const w=world();w.scene.tokens.push({id:'block',x:500,y:400,width:1,height:1,getFlag(){}});
 const promise=ensureQueuedSummonPlan(w.a,'ultimate',w.plan,w.player);
 await new Promise(resolve=>setImmediate(resolve));
 const request=w.events.socket.find(event=>event.type==='abilitySummonReposition');assert.equal(request.targetUserId,'player');
 let settled=false;promise.catch(()=>{settled=true;});
 await handleSummoningSocket({type:'abilitySummonResponse',requestId:request.requestId,targetUserId:'gm',sourceUserId:'stranger',error:'Forged reply'});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);
 await handleSummoningSocket({type:'abilitySummonResponse',requestId:request.requestId,targetUserId:'gm',sourceUserId:'player',error:'Player cancelled placement'});
 await assert.rejects(promise,/Player cancelled placement/);
});


test('a queued summon being created retains its live lock during actor refreshes',async()=>{
 const w=world(),c=startCombat(w);await w.api.executeUltimate(w.a.id,w.gm.id,false,w.plan);
 const create=w.scene.createEmbeddedDocuments.bind(w.scene);let release,entered;
 const began=new Promise(resolve=>{entered=resolve});const gate=new Promise(resolve=>{release=resolve});
 w.scene.createEmbeddedDocuments=async(...args)=>{entered();await gate;return create(...args);};
 const casting=w.api.processUltimateQueue(c.id);await began;
 assert.equal(await w.api.reconcileUltimateLock(w.a.id),false);assert.equal(w.api.state.ultimateLocks.has(w.a.id),true);
 release();await casting;assert.equal(w.a.executions.length,1);
});

test('cancellation during token creation removes late tokens and refunds only once',async()=>{
 const w=world(),c=startCombat(w);await w.api.executeUltimate(w.a.id,w.gm.id,false,w.plan);
 const create=w.scene.createEmbeddedDocuments.bind(w.scene);let release,entered;
 const began=new Promise(resolve=>{entered=resolve});const gate=new Promise(resolve=>{release=resolve});
 w.scene.createEmbeddedDocuments=async(...args)=>{entered();await gate;return create(...args);};
 const casting=w.api.processUltimateQueue(c.id);await began;
 await w.api.refundSummoningUltimate(w.a.id);w.api.state.ultimateQueues.delete(c.id);c.started=false;
 release();await casting;
 assert.equal(w.scene.tokens.length,1);assert.equal(w.a.flags.ultimate.current,100);assert.equal(w.a.executions.length,0);assert.equal(w.api.state.ultimateLocks.size,0);
});


test('a short lighting barrier between the corner rays still blocks a partly shadowed footprint',()=>{
 const w=world(),position={x:600,y:400},choice={width:1,height:1};
 w.scene.walls.push({c:[550,434,550,436],light:1,move:0});
 assert.equal(canPlaceSummon(placementContext(w.scene,w.caster),choice,position,20),false);
 w.scene.walls[0].c=[550,600,550,620];
 assert.equal(canPlaceSummon(placementContext(w.scene,w.caster),choice,position,20),true,'an unrelated short wall outside the visibility fan does not block');
});
