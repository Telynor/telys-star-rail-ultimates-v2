import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathWorld,collection,ID} from './helpers/path-world.mjs';
import {actionMacroPresentation,actionMacroCommand,synchronizeActionMacros} from '../scripts/action-macros.mjs';

function fixture() {
  const w=pathWorld({install:false}),writes=[];
  const config={ultimateName:'Ice Ultimate',skillButtonImage:'ice-skill.png',ultimateButtonImage:'ice-ult.png',talentIcon:'ice-talent.png',techniqueButtonImage:'ice-technique.png'};
  const macro=(id,action,actorId='hero')=>({id,name:'Old '+id,img:'old.png',command:'old command',isOwner:false,
    getFlag:(_scope,key)=>({action,actorId}[key]),async update(patch){writes.push({id,patch});Object.assign(this,patch);}});
  const macros=collection(['skill','ultimate','talent','technique'].map(action=>macro(action,action)));
  macros.push(macro('other-actor','skill','source'),macro('custom',undefined),macro('unassigned','skill'));
  w.owner.hotbar={1:'skill',10:'ultimate',11:'talent',50:'technique',32:'skill',9:'custom',8:'other-actor'};
  const offline={id:'offline',isGM:false,active:false,hotbar:{24:{id:'technique'}}};
  w.users.push(offline);w.hero.testUserPermission=user=>user.isGM||['owner','offline'].includes(user.id);
  game.macros=macros;
  const presentation=(actor,action)=>actionMacroPresentation(actor,action,config);
  return {...w,config,macros,writes,offline,presentation,sync:opts=>synchronizeActionMacros({actor:w.hero,users:w.users,presentation,replaceCommand:true,...opts})};
}

test('all four owner actions refresh in exact existing slots across all pages and offline owners',async()=>{
  const w=fixture(),hotbar=structuredClone(w.owner.hotbar),offlineBar=structuredClone(w.offline.hotbar);
  await w.sync();
  assert.equal(w.writes.length,4,'duplicate references update one macro document');
  for(const action of ['skill','ultimate','talent','technique']){
    const macro=w.macros.get(action),expected=w.presentation(w.hero,action);
    assert.equal(macro.name,expected.name);assert.equal(macro.img,expected.img);assert.equal(macro.command,actionMacroCommand(w.hero,action));
  }
  assert.deepEqual(w.owner.hotbar,hotbar);assert.deepEqual(w.offline.hotbar,offlineBar);
  for(const id of ['other-actor','custom','unassigned'])assert.equal(w.macros.get(id).img,'old.png');
  await w.sync();assert.equal(w.writes.length,4,'repeated redraws perform no redundant writes');
});

test('canonical macros execute the active character action after switching without source sheet references',async()=>{
  const w=fixture(),calls=[];await w.sync();
  game.modules={get:()=>({api:Object.fromEntries(['requestSkill','requestUltimate','showTalentPopup','requestTechnique'].map(method=>[method,actor=>calls.push([method,actor.id,actor.getFlag(ID,'ultimate').elementId])]))})};
  await w.hero.update({[`flags.${ID}.ultimate.elementId`]:'ice'});
  for(const action of ['skill','ultimate','talent','technique'])await new Function(w.macros.get(action).command)();
  assert.deepEqual(calls.map(call=>call.slice(1)),Array.from({length:4},()=>['hero','ice']));
});

test('ordinary clients update only editable macros on their own hotbar',async()=>{
  const w=fixture();game.user=w.owner;w.macros.get('skill').isOwner=true;
  await w.sync({users:[w.owner]});assert.deepEqual(w.writes.map(x=>x.id),['skill']);
});

test('intermediate Path state never updates macros and queued writes finish with the latest committed artwork',async()=>{
  const w=fixture();let changing=true;
  await w.sync({isChanging:()=>changing});assert.equal(w.writes.length,0);
  changing=false;const macro=w.macros.get('skill'),update=macro.update;let release,started;
  const begun=new Promise(resolve=>started=resolve),gate=new Promise(resolve=>release=resolve);
  macro.update=async function(patch){started();await gate;return update.call(this,patch);};
  const first=w.sync({isChanging:()=>changing});await begun;
  w.config.skillButtonImage='second-path-skill.png';const second=w.sync({isChanging:()=>changing});release();
  await Promise.all([first,second]);assert.equal(macro.img,'second-path-skill.png');
});

test('enhanced artwork and Technique use their correct action images and fallbacks',()=>{
  const w=fixture();
  assert.deepEqual(actionMacroPresentation(w.hero,'technique',w.config,true),{name:'Hero — Technique',img:'ice-technique.png'});
  assert.equal(actionMacroPresentation(w.hero,'ultimate',w.config,true).name,'Hero — Enhanced Ice Ultimate');
  assert.equal(actionMacroPresentation(w.hero,'skill',{}).img,w.hero.img);
});
