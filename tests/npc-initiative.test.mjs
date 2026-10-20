import {test} from "node:test";
import assert from "node:assert/strict";
import {npcInitiativeSource, sharedNpcInitiativeConfig, saveNpcInitiativeConfig} from "../scripts/npc-initiative.mjs";

const ID="telys-star-rail-ultimates";
function npc(id="guard", ultimate={}) {
  return {id,uuid:`Actor.${id}`,documentName:"Actor",type:"npc",name:"Guard",img:"guard.png",flags:{[ID]:{ultimate,allegiance:"enemy",toughness:{current:50}}},updates:[],
    getFlag(_,key){return this.flags[ID][key]},
    async update(patch){this.updates.push(structuredClone(patch));for(const [path,value]of Object.entries(patch)){const parts=path.split('.');let target=this;for(const part of parts.slice(0,-1))target=target[part]??={};target[parts.at(-1)]=value;}}
  };
}
function copies() {
  const source=npc("guard",{carouselImage:"shared.webp",carouselImageX:75,carouselImageY:28,carouselImageScale:180,carouselImageFlip:true});
  const enemy=npc("guard",{carouselImage:"stale.png",carouselImageX:5}),ally=npc("guard",{carouselImage:"other.png"});
  Object.assign(enemy,{isToken:true,uuid:"Scene.first.Token.enemy.Actor.guard",token:{actorId:"guard"}});
  Object.assign(ally,{isToken:true,uuid:"Scene.second.Token.ally.Actor.guard",parent:{documentName:"Token",actorId:"guard"}});
  ally.flags[ID].allegiance="ally";
  return {source,enemy,ally,actors:new Map([[source.id,source]])};
}
test("existing unlinked NPC copies across scenes share source framing regardless of allegiance",()=>{
  const {source,enemy,ally,actors}=copies();
  for(const actor of [enemy,ally]){assert.equal(npcInitiativeSource(actor,actors),source);assert.deepEqual(sharedNpcInitiativeConfig(actor,actors),source.flags[ID].ultimate);}
  assert.equal(enemy.flags[ID].allegiance,"enemy");assert.equal(ally.flags[ID].allegiance,"ally");
});
test("shared blank artwork and omitted crop values reset stale token overrides, without changing enhanced state",()=>{
  const {source,enemy,actors}=copies();source.flags[ID].ultimate={carouselImage:"",enhancedCarouselImage:"enhanced.webp",enhancedCarouselImageX:0};
  const shared=sharedNpcInitiativeConfig(enemy,actors);
  assert.deepEqual(shared,{carouselImage:"",carouselImageX:50,carouselImageY:50,carouselImageScale:100,carouselImageFlip:false,enhancedCarouselImage:"enhanced.webp",enhancedCarouselImageX:0,enhancedCarouselImageY:50,enhancedCarouselImageScale:100,enhancedCarouselImageFlip:false});
  assert.equal(Object.hasOwn(shared,"enhancedStanceActive"),false);
});
test("legacy token-only artwork survives until a source form is configured; unrelated same-name NPCs stay separate",()=>{
  const {source,enemy,actors}=copies();source.flags[ID].ultimate={};const other=npc("other",{carouselImage:"other.webp"});actors.set(other.id,other);
  assert.deepEqual(sharedNpcInitiativeConfig(enemy,actors),{});assert.equal(npcInitiativeSource(other,actors),other);
  actors.delete(source.id);assert.equal(npcInitiativeSource(enemy,actors),enemy);
  assert.equal(npcInitiativeSource({...source,type:"character"},actors).type,"character");
});
test("saving from a token updates shared artwork only and future duplicated Actors inherit that source",async()=>{
  const {source,enemy,ally,actors}=copies(),before=structuredClone(source.flags[ID]);
  await saveNpcInitiativeConfig(ally,{carouselImageX:0,carouselImageFlip:false,current:0,allegiance:"ally"},{actors,isGM:true});
  assert.equal(source.flags[ID].ultimate.carouselImageX,0);assert.equal(source.flags[ID].ultimate.carouselImageFlip,false);
  assert.equal(source.flags[ID].initiativePortraitSource,source.uuid);assert.deepEqual(source.flags[ID].toughness,before.toughness);assert.equal(source.flags[ID].allegiance,"enemy");
  assert.equal(ally.updates.length,0);assert.equal(enemy.updates.length,0);
  const duplicate=npc("duplicate",structuredClone(source.flags[ID].ultimate));duplicate.flags[ID].initiativePortraitSource=source.uuid;actors.set(duplicate.id,duplicate);
  await saveNpcInitiativeConfig(duplicate,{carouselImageScale:225},{actors,isGM:true});
  assert.equal(source.flags[ID].ultimate.carouselImageScale,225);assert.equal(duplicate.updates.length,0);assert.equal(sharedNpcInitiativeConfig(enemy,actors).carouselImageScale,225);
});
test("normal and enhanced artwork save independently and clamp invalid positions and scale",async()=>{
  const {source,enemy,actors}=copies(),normal=structuredClone(source.flags[ID].ultimate);
  await saveNpcInitiativeConfig(enemy,{enhancedCarouselImage:"enhanced.webp",enhancedCarouselImageScale:10000,enhancedCarouselImageX:-5000,enhancedCarouselImageY:5000},{actors,isGM:true});
  for(const [key,value]of Object.entries(normal))assert.equal(source.flags[ID].ultimate[key],value);
  assert.equal(source.flags[ID].ultimate.enhancedCarouselImageScale,800);assert.equal(source.flags[ID].ultimate.enhancedCarouselImageX,-1150);assert.equal(source.flags[ID].ultimate.enhancedCarouselImageY,1250);
});
test("rapid partial edits serialize against the latest shared configuration, and failed saves can be retried",async()=>{
  const {source,enemy,actors}=copies(),update=source.update;let release;
  source.update=async function(patch){await new Promise(resolve=>release=resolve);return update.call(this,patch)};
  const x=saveNpcInitiativeConfig(enemy,{carouselImageX:17},{actors,isGM:true}),y=saveNpcInitiativeConfig(enemy,{carouselImageY:23},{actors,isGM:true});
  await new Promise(resolve=>setImmediate(resolve));release();await x;
  await new Promise(resolve=>setImmediate(resolve));release();await y;
  assert.equal(source.flags[ID].ultimate.carouselImageX,17);assert.equal(source.flags[ID].ultimate.carouselImageY,23);
  source.update=async()=>{throw Error("save failure")};await assert.rejects(saveNpcInitiativeConfig(enemy,{carouselImageX:42},{actors,isGM:true}),/save failure/);
  source.update=update;await saveNpcInitiativeConfig(enemy,{carouselImageX:43},{actors,isGM:true});assert.equal(source.flags[ID].ultimate.carouselImageX,43);
});
test("portrait source references reject unrelated document types and safely handle deleted sources and cycles",()=>{
  const source=npc("source"),duplicate=npc("duplicate"),character={...npc("hero"),type:"character"},actors=new Map([[source.id,source],[duplicate.id,duplicate],[character.id,character]]);
  for(const invalid of ["Actor.missing","Actor.hero","Scene.map.Token.x.Actor.source","Item.source"]){source.flags[ID].initiativePortraitSource=invalid;assert.equal(npcInitiativeSource(source,actors),source);}
  source.flags[ID].initiativePortraitSource=duplicate.uuid;duplicate.flags[ID].initiativePortraitSource=source.uuid;assert.equal(npcInitiativeSource(source,actors),duplicate);
});
test("shared portrait saving requires a GM and an NPC Actor",async()=>{
  const actor=npc();await assert.rejects(saveNpcInitiativeConfig(actor,{carouselImage:"a"},{isGM:false}),/Only a GM/);
  await assert.rejects(saveNpcInitiativeConfig({...actor,type:"character"},{carouselImage:"a"},{isGM:true}),/NPC Actor/);
  await assert.rejects(saveNpcInitiativeConfig({...actor,documentName:"Item"},{carouselImage:"a"},{isGM:true}),/NPC Actor/);
});
