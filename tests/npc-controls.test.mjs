import {test} from "node:test";
import assert from "node:assert/strict";
import {npcAllegiance,npcToughnessEnabled,initiativeAlly} from "../scripts/npc-rules.mjs";
import {sheetActor,setNpcAllegiance} from "../scripts/actor-sheet-controls.mjs";
const ID="telys-star-rail-ultimates";
function npc(role=null,uuid="Actor.npc") {
  return {documentName:"Actor",type:"npc",uuid,prototypeToken:{disposition:-1},flags:{[ID]:{allegiance:role,toughness:{enabled:true,current:26,max:70,weaknesses:["fire"]},ultimate:{multitypeEnabled:true,multitypeMode:"changer",elementId:"ice"}}},updates:[],
    getFlag(_,key){return this.flags[ID][key]},
    async update(patch){this.updates.push(structuredClone(patch));for(const [path,value]of Object.entries(patch)){const keys=path.split('.');let object=this;for(const key of keys.slice(0,-1))object=object[key]??={};object[keys.at(-1)]=value;}}
  };
}
test("only Actor documents receive Actor configuration, even when an ability exposes its owner",()=>{
  const actor=npc();
  for(const app of [{document:actor,actor},{object:actor},{actor}])assert.equal(sheetActor(app),actor);
  for(const document of [{documentName:"Item",actor},{documentName:"Activity",actor},{item:{actor}},{type:"summon",actor}])assert.equal(sheetActor({document,actor}),null);
  assert.equal(sheetActor({object:{documentName:"Item",actor},actor}),null);
});
test("explicit NPC allegiance governs both Toughness and initiative despite token disposition",()=>{
  for(const [role,friendly]of [["ally",true],["enemy",false]]){
    const actor=npc(role),combatant={actor,token:{disposition:friendly?-1:1}};
    assert.equal(npcAllegiance(actor,combatant.token),role);
    assert.equal(npcToughnessEnabled(actor,!friendly,combatant.token),!friendly);
    assert.equal(initiativeAlly(combatant),friendly);
  }
});
test("unconfigured NPCs infer friendly tokens and retain legacy disabled Toughness for enemies",()=>{
  const actor=npc();
  assert.equal(npcAllegiance(actor,{disposition:1}),"ally");
  assert.equal(npcToughnessEnabled(actor,true,{disposition:1}),false);
  assert.equal(npcToughnessEnabled(actor,false,{disposition:-1}),false);
  assert.equal(npcToughnessEnabled(actor,true,{disposition:-1}),true);
  assert.equal(npcToughnessEnabled({type:"character"},false),false);
  assert.equal(initiativeAlly({actor:{type:"character"}}),true);
});
test("GM toggles retain current/max Toughness, weaknesses, and Multitype through an Ally/Enemy roundtrip",async()=>{
  globalThis.game={user:{isGM:true}};const actor=npc(),before=structuredClone(actor.flags[ID]);
  await setNpcAllegiance(actor,"ally");assert.equal(npcToughnessEnabled(actor,true),false);
  await setNpcAllegiance(actor,"enemy");assert.equal(npcToughnessEnabled(actor,false),true);
  assert.deepEqual(actor.flags[ID],{...before,allegiance:"enemy"});
  assert.deepEqual(Object.keys(actor.updates[0]),[`flags.${ID}.allegiance`,`flags.${ID}.toughness.enabled`]);
});
test("a summoned/unlinked token's allegiance does not overwrite its source Actor",async()=>{
  globalThis.game={user:{isGM:true}};const source=npc("enemy"),summon=npc("enemy","Scene.map.Token.pet.Actor.npc");
  await setNpcAllegiance(summon,"ally");assert.equal(npcAllegiance(summon),"ally");assert.equal(npcAllegiance(source),"enemy");assert.equal(source.updates.length,0);
});
test("allegiance validates GM authority, NPC type and saved roles, and propagates a failed save",async()=>{
  const actor=npc();globalThis.game={user:{isGM:false}};
  await assert.rejects(setNpcAllegiance(actor,"ally"),/Only a GM/);
  game.user.isGM=true;await assert.rejects(setNpcAllegiance(actor,"neutral"),/Choose Ally or Enemy/);
  await assert.rejects(setNpcAllegiance({...actor,type:"character"},"ally"),/NPC Actor/);
  actor.update=async()=>{throw Error("test save failure")};await assert.rejects(setNpcAllegiance(actor,"ally"),/test save failure/);
  assert.equal(actor.getFlag(ID,"allegiance"),null);
});
