import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";
import * as rules from "../scripts/multitype-rules.mjs";
const ID = rules.MODULE_ID;
const source = await readFile(new URL("../scripts/module.js",import.meta.url),"utf8");
const elementList = ["fire","ice","lightning","wind"].map(id => ({id,name:id,color:"#ff4400"}));
const get=(o,p)=>p.split(".").reduce((v,k)=>v?.[k],o);
const set=(o,p,v)=>{const keys=p.split(".");let target=o;for(const k of keys.slice(0,-1))target=target[k]??={};target[keys.at(-1)]=structuredClone(v);};
const collection=entries=>{entries.get=id=>entries.find(e=>e.id===id);return entries;};
let caseId=0;
async function setup({type="character",mode="attacks",enabled=true,synthetic=false}={}) {
  const hooks=new Map(),sent=[],notices=[];
  const Hooks={on(name,fn){const list=hooks.get(name)??[];list.push(fn);hooks.set(name,list);},once(){},callAll(){}};
  class Actor {
    constructor(id,type,uuid="Actor."+id) {Object.assign(this,{id,uuid,type,documentName:"Actor",name:id,isOwner:true,items:collection([]),updates:[],flags:{[ID]:{ultimate:{elementId:"fire",multitypeEnabled:enabled,multitypeMode:mode,enabled:false,current:30,pathId:"hunt"},toughness:{enabled:true,current:100,max:100,weaknesses:["ice"],discoveredWeaknesses:[]}}}});}
    getFlag(_,key){return this.flags[ID][key];}
    async update(patch){this.updates.push(structuredClone(patch));for(const [p,v]of Object.entries(patch))set(this,p,v);}
    testUserPermission(user){return user?.id==="player"||user?.isGM;}
  }
  const attacker=new Actor("attacker",type,synthetic?"Scene.map.Token.pet.Actor.attacker":"Actor.attacker");
  const target=new Actor("target","npc"),second=new Actor("second","npc");
  const item={id:"weapon",uuid:attacker.uuid+".Item.weapon",documentName:"Item",name:"Weapon",actor:attacker,
    flags:{[ID]:{attackElementId:"ice",activityElements:{second:"lightning"}}},
    getFlag(_,key){return this.flags[ID][key];},async update(patch){for(const [p,v]of Object.entries(patch))set(this,p,v);},
    system:{activities:collection([{id:"first",name:"First",type:"attack"},{id:"second",name:"Second",type:"attack"}])}};
  attacker.items.push(item);for(const activity of item.system.activities){activity.item=item;activity.actor=attacker;}
  const gm={id:"gm",isGM:true,active:true,targets:new Set()},player={id:"player",isGM:false,active:true,targets:new Set()};
  const actors=collection(synthetic?[target,second]:[attacker,target,second]),users=collection([gm,player]);
  const token={id:"pet",uuid:"Scene.map.Token.pet",documentName:"Token",actor:attacker,getFlag:()=>undefined};
  if(synthetic){attacker.isToken=true;attacker.parent=token;}
  const scene={id:"map",tokens:new Map([["pet",token]])};
  const game={user:gm,actors,users,scenes:new Map([["map",scene]]),combat:null,combats:[],
    settings:{get:(_,key)=>key==="elements"?elementList:key==="paths"?[]:{}},
    socket:{emit:(_,payload)=>sent.push(payload)},modules:{get:id=>({active:id==="midi-qol"?game.midiActive:false})}};
  const canvas={scene,tokens:{placeables:synthetic?[{id:"pet",document:token,actor:attacker}]:[],get:id=>id==="pet"?{document:token,actor:attacker}:null}};
  const fromUuid=async uuid=>[...actors,attacker,item,token].find(e=>e.uuid===uuid)??null;
  const foundry={utils:{deepClone:structuredClone,randomID:()=>String(++caseId),mergeObject:(a,b)=>({...a,...b}),getProperty:get,setProperty:set,expandObject:value=>value},
    applications:{api:{ApplicationV2:class{},HandlebarsApplicationMixin:C=>C}}};
  Object.assign(globalThis,{game,canvas,Hooks,foundry,fromUuid,ui:{notifications:{info:m=>notices.push(m),warn:m=>notices.push(m),error:m=>notices.push(m)}}});
  const multitype=await import("../scripts/multitype.mjs?case="+(++caseId));
  multitype.installMultitype();
  const context=vm.createContext({game,canvas,Hooks,foundry,fromUuid,Actor,multitype,structuredClone,console,
    FormApplication:class{},ui:globalThis.ui,document:{querySelectorAll:()=>[]},
    window:{setTimeout(){},clearTimeout(){}},setTimeout(){},clearTimeout(){}});
  vm.runInContext(source.replace(/^import .*;\n/gm,"")+'\nglobalThis.api={applyToughnessDamage,processDnd5eDamageRolls,processCoreAttackMessage,processAppliedDamage,processMidiWorkflow,onSocket,state,getConfig,getToughness,saveUltimateConfigFromTab};',context);
  vm.runInContext('awardPunchlineForAttack=async()=>{};awardDamageEnergy=async()=>{};dispatchTalentEvent=async()=>{};limitBreakAttackHpDamage=async()=>{};addEnergy=async()=>{};broadcastWeaknessBreak=async()=>{};delayBrokenCombatant=async()=>{};handleLightConeEvent=async()=>{};',context);
  return {attacker,target,second,item,gm,player,game,canvas,token,scene,multitype,hooks,sent,api:context.api,context,
    roll:(n=7)=>({total:n+5,formula:"1d8+5",options:{rollType:"damage"},dice:[{faces:8,number:1,results:[{result:n,active:true}]}]}),
    async hook(name,...args){for(const fn of hooks.get(name)??[])await fn(...args);}};
}

for(const [type,synthetic] of [["character",false],["npc",false],["npc",true]]) test(type+(synthetic?" summon":"")+" uses independent Item/activity Elements",async()=>{
  const w=await setup({type,synthetic}),{attacker,item,multitype}=w;
  const before=structuredClone(attacker.flags);
  assert.equal(multitype.attackContext(attacker,{item,activityId:"first"}).elementId,"ice");
  assert.equal(multitype.attackContext(attacker,{item,activityId:"second"}).elementId,"lightning");
  assert.equal(multitype.attackContext(attacker).elementId,"fire");
  assert.deepEqual(attacker.flags,before);
});

test("disabled and Type Changer modes ignore saved per-attack assignments",async()=>{
  for(const [enabled,mode]of [[false,"attacks"],[true,"changer"]]){
    const {attacker,item,multitype}=await setup({enabled,mode});
    assert.equal(multitype.attackContext(attacker,{item,activityId:"second"}).elementId,"fire");
  }
});
test("empty and deleted overrides inherit the Item, then Actor",async()=>{
  const {attacker,item,multitype}=await setup();
  item.flags[ID].activityElements.second="";assert.equal(multitype.attackContext(attacker,{item,activityId:"second"}).elementId,"ice");
  item.flags[ID].attackElementId="removed";assert.equal(multitype.attackContext(attacker,{item,activityId:"second"}).elementId,"fire");
  item.flags[ID].activityElements.second="removed";assert.equal(multitype.attackContext(attacker,{item,activityId:"second"}).elementId,"fire");
});
test("legacy and current D&D5e chat sources resolve the exact activity",async()=>{
  const {attacker,item,multitype}=await setup();
  for(const msg of [
    {flags:{dnd5e:{item:{uuid:item.uuid,activityId:"second"}}}},
    {flags:{dnd5e:{use:{itemUuid:item.uuid},activity:{id:"second"}}}},
    {system:{item:{uuid:item.uuid,id:item.id},activity:{id:"second"}}},
    {getAssociatedItem:()=>item,system:{activity:{id:"second"}}}
  ])assert.equal(multitype.attackContext(attacker,msg).elementId,"lightning");
});
test("foreign Item flags and foreign roll snapshots cannot select another Actor's Element",async()=>{
  const {attacker,item,multitype}=await setup();
  const foreign={...item,actor:{uuid:"Actor.foreign"}};
  assert.equal(multitype.attackContext(attacker,{item:foreign}).elementId,"fire");
  assert.equal(multitype.attackContext(attacker,{attackElement:{actorUuid:"Actor.foreign",elementId:"ice"}}).elementId,"fire");
});
test("hot swapping changes only this Actor's live Element, including an unlinked summon",async()=>{
  const {attacker,target,multitype}=await setup({type:"npc",mode:"changer",synthetic:true});
  const before=structuredClone(attacker.getFlag(ID,"ultimate"));
  await multitype.changeElement(attacker.uuid,"lightning");
  assert.equal(attacker.getFlag(ID,"ultimate").elementId,"lightning");
  assert.equal(target.getFlag(ID,"ultimate").elementId,"fire");
  assert.deepEqual(attacker.getFlag(ID,"ultimate"),{...before,elementId:"lightning"});
  assert.deepEqual(Object.keys(attacker.updates[0]),["flags."+ID+".ultimate.elementId"]);
  assert.ok(multitype.elementChangeRows().some(row=>row.uuid===attacker.uuid));
});
test("Type Changer validates mode, Element and GM authority",async()=>{
  const w=await setup({mode:"changer"});
  await assert.rejects(w.multitype.changeElement(w.attacker,"bad"),/existing Element/);
  w.game.user=w.player;await assert.rejects(w.multitype.changeElement(w.attacker,"ice"),/Only a GM/);
  w.game.user=w.gm;w.attacker.flags[ID].ultimate.multitypeMode="attacks";
  await assert.rejects(w.multitype.changeElement(w.attacker,"ice"),/Type Changer/);
  assert.equal(w.attacker.updates.length,0);
});
test("speaker resolution and targets prefer unlinked token Actors over world Actors",async()=>{
  const w=await setup({synthetic:true,type:"npc"}),base={...w.attacker,uuid:"Actor.attacker"};w.game.actors.push(base);
  const message={speaker:{actor:base.id,scene:"map",token:"pet"},system:{targets:[{tokenUuid:w.token.uuid}]}};
  assert.equal(w.multitype.actorFromMessage(message),w.attacker);
  assert.equal(w.multitype.messageTargets(message)[0],w.token);
});
test("roll snapshots retain their Element after hot swaps, mode changes and Item edits",async()=>{
  const w=await setup(),roll=w.roll();
  const original=w.multitype.stampDamageRolls(w.attacker,[roll],{item:w.item});
  w.attacker.flags[ID].ultimate={...w.attacker.flags[ID].ultimate,elementId:"wind",multitypeEnabled:false};
  w.item.flags[ID].attackElementId="lightning";
  assert.equal(w.multitype.attackContext(w.attacker,{rolls:[roll]}).elementId,"ice");
  assert.equal(w.multitype.attackContext(w.attacker,{rolls:[roll]}).eventId,original.eventId);
});
test("pre/post standard damage hooks preserve the Element in rolls and chat flags",async()=>{
  const w=await setup(),subject=w.item.system.activities.get("second"),rollConfig={subject},message={data:{}},roll=w.roll();
  await w.hook("dnd5e.preRollDamageV2",rollConfig,{},message);
  w.item.flags[ID].activityElements.second="wind";
  await w.hook("dnd5e.postDamageRollConfiguration",[roll],rollConfig,{},message);
  assert.equal(message.data.flags[ID].attackElement.elementId,"lightning");
  assert.equal(roll.options[ID].attackElement.elementId,"lightning");
  assert.equal(message.data.flags[ID].attackElement.eventId,roll.options[ID].attackElement.eventId);
});
test("matching attack override reduces Toughness; nonmatching override does not",async()=>{
  const w=await setup(),attackElement=w.multitype.attackContext(w.attacker,{item:w.item});
  assert.equal(await w.api.applyToughnessDamage(w.attacker,[w.target],7,"attack1",{attackElement}),7);
  assert.equal(w.target.getFlag(ID,"toughness").current,93);
  assert.deepEqual(w.target.getFlag(ID,"toughness").discoveredWeaknesses,["ice"]);
  const other=w.multitype.attackContext(w.attacker,{item:w.item,activityId:"second"});
  assert.equal(await w.api.applyToughnessDamage(w.attacker,[w.target],7,"attack2",{attackElement:other}),0);
  assert.equal(w.target.getFlag(ID,"toughness").current,93);
});
test("temporary All/None weaknesses still govern every attack Element",async()=>{
  const w=await setup(),attackElement=w.multitype.attackContext(w.attacker,{item:w.item});
  w.target.flags[ID].weaknessMode="none";
  assert.equal(await w.api.applyToughnessDamage(w.attacker,[w.target],7,"none",{attackElement}),0);
  w.target.flags[ID].weaknessMode="all";
  const other=w.multitype.attackContext(w.attacker,{item:w.item,activityId:"second"});
  assert.equal(await w.api.applyToughnessDamage(w.attacker,[w.target],7,"all",{attackElement:other}),7);
});
test("duplicate and concurrent hook delivery applies once per attack and target",async()=>{
  const w=await setup(),attackElement={...w.multitype.attackContext(w.attacker,{item:w.item}),eventId:"one-cast"};
  await Promise.all([w.api.applyToughnessDamage(w.attacker,[w.target],7,"chat",{attackElement}),w.api.applyToughnessDamage(w.attacker,[w.target],7,"midi",{attackElement})]);
  assert.equal(w.target.getFlag(ID,"toughness").current,93);
  await w.api.applyToughnessDamage(w.attacker,[w.target,w.second],7,"applied",{attackElement});
  assert.equal(w.target.getFlag(ID,"toughness").current,93);assert.equal(w.second.getFlag(ID,"toughness").current,93);
  await w.api.applyToughnessDamage(w.attacker,[w.target],7,"next",{attackElement:{...attackElement,eventId:"another-cast"}});
  assert.equal(w.target.getFlag(ID,"toughness").current,86,"a distinct identical attack is not suppressed");
});
test("standard handler uses the activity Element and dice-only Toughness amount for an NPC",async()=>{
  const w=await setup({type:"npc",synthetic:true}),roll=w.roll();
  w.gm.targets.add(w.target);
  await w.api.processDnd5eDamageRolls([roll],{subject:w.item.system.activities.get("first")});
  assert.equal(w.target.getFlag(ID,"toughness").current,93);
  assert.equal(roll.options[ID].attackElement.elementId,"ice");
  assert.equal(w.attacker.getFlag(ID,"ultimate").elementId,"fire");
});
test("MidiQOL uses per-attack Element, confirmed hits and a stable roll identity",async()=>{
  const w=await setup(),roll=w.roll(),hit={id:"hit",actor:w.target},miss={id:"miss",actor:w.second};
  const workflow={id:"workflow",actor:w.attacker,item:w.item,activity:w.item.system.activities.get("first"),targets:new Set([hit,miss]),hitTargets:new Set([hit]),attackRoll:{},damageRolls:[roll]};
  await w.hook("midi-qol.preItemRoll",workflow);w.attacker.flags[ID].ultimate.elementId="wind";
  await w.api.processMidiWorkflow(workflow);await w.api.processMidiWorkflow(workflow);
  assert.equal(w.target.getFlag(ID,"toughness").current,93);
  assert.equal(w.second.getFlag(ID,"toughness").current,100);
});
test("MidiQOL misses and damage cards cannot bypass hit confirmation",async()=>{
  const w=await setup();w.game.midiActive=true;
  const message={id:"miss-card",type:"damage",speaker:{actor:w.attacker.id},user:w.gm,rolls:[w.roll()],flags:{"midi-qol":{workflowId:"missed"},dnd5e:{item:{id:w.item.id}}},getFlag:()=>false};
  w.gm.targets.add({actor:w.target});
  await w.api.processCoreAttackMessage(message);
  assert.equal(w.target.getFlag(ID,"toughness").current,100);
  await w.api.processMidiWorkflow({id:"missed",actor:w.attacker,item:w.item,attackRoll:{},targets:new Set([{actor:w.target}]),hitTargets:new Set(),damageRolls:[w.roll()]});
  assert.equal(w.target.getFlag(ID,"toughness").current,100);
});
test("core chat and applied damage share the captured attack Element",async()=>{
  const w=await setup({synthetic:true,type:"npc"}),roll=w.roll();
  const attackElement=w.multitype.stampDamageRolls(w.attacker,[roll],{item:w.item});
  const message={id:"card",type:"damage",speaker:{actor:w.attacker.id,scene:"map",token:"pet"},user:w.gm,rolls:[roll],system:{item:{uuid:w.item.uuid},targets:[{actorUuid:w.target.uuid}]},flags:{[ID]:{attackElement}},getFlag:(_,key)=>key==="attackElement"?attackElement:false};
  await w.api.processCoreAttackMessage(message);
  await w.api.processAppliedDamage(w.target,12,{sourceActor:w.attacker,origin:message});
  assert.equal(w.target.getFlag(ID,"toughness").current,93);
});
test("player socket requests carry the exact captured attack Element to the GM",async()=>{
  const w=await setup({type:"npc",synthetic:true});w.game.user=w.player;w.player.targets.add(w.target);
  await w.api.processDnd5eDamageRolls([w.roll()],{subject:w.item.system.activities.get("first")});
  assert.equal(w.sent[0].attackElement.elementId,"ice");
  assert.equal(w.sent[0].attackerUuid,w.attacker.uuid);
  w.game.user=w.gm;await w.api.onSocket(w.sent[0]);
  assert.equal(w.target.getFlag(ID,"toughness").current,93);
});
test("attack assignment edits validate real activities and retain sibling overrides",async()=>{
  const {item}=await setup();
  const patch=rules.attackElementPatch(item,"first","wind",elementList);await item.update(patch);
  assert.equal(item.flags[ID].activityElements.second,"lightning");assert.equal(item.flags[ID].activityElements.first,"wind");
  assert.throws(()=>rules.attackElementPatch(item,"gone","wind",elementList),/no longer exists/);
  assert.throws(()=>rules.attackElementPatch(item,"first","missing",elementList),/Element Manager/);
});

test("separate Midi workflows for the same Item and identical damage remain separate attacks",async()=>{
 const w=await setup(),hit={id:"hit",actor:w.target};
 const create=()=>({uuid:w.item.uuid,actor:w.attacker,item:w.item,activity:w.item.system.activities.get("first"),targets:new Set([hit]),hitTargets:new Set([hit]),attackRoll:{},damageRolls:[w.roll()]});
 await w.api.processMidiWorkflow(create());await w.api.processMidiWorkflow(create());
 assert.equal(w.target.getFlag(ID,"toughness").current,86);
});
