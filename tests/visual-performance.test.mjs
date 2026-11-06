import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as npcRules from '../scripts/npc-rules.mjs';
import {world,collection,ID} from './helpers/summoning-world.mjs';
import {createVisualRefreshQueue,isTokenMovementOnly,touchesVisualData,changesOnlyWithin,replaceMarkupIfChanged} from '../scripts/visual-refresh.mjs';

test('visual work is deduplicated, errors isolated, recursive requests deferred and teardown cancels work',()=>{
 let callback,id=0;const errors=[],calls=[];const q=createVisualRefreshQueue({schedule:fn=>{callback=fn;return ++id;},cancel(){},delay:()=>100,onError:e=>errors.push(e)});
 for(let i=0;i<250;i++)q.request('hud',()=>calls.push(i));
 q.request('bad',()=>{throw Error('test');});q.request('after',()=>calls.push('after'));callback();
 assert.deepEqual(calls,[249,'after']);assert.equal(errors.length,1);assert.equal(q.snapshot().executions,3);
 q.request('recursive',()=>q.request('next',()=>calls.push('next')));q.flush();assert.equal(q.snapshot().pending,1);q.clear();q.flush();assert.equal(calls.includes('next'),false);
});
test('nested and flattened updates distinguish HP, movement, artwork and deletions',()=>{
 assert.equal(isTokenMovementOnly({x:1,y:2,rotation:3}),true);assert.equal(isTokenMovementOnly({x:1,hidden:true}),false);assert.equal(isTokenMovementOnly({}),false);
 assert.equal(changesOnlyWithin({system:{attributes:{hp:{value:3,temp:4}}}},['system.attributes.hp']),true);
 assert.equal(changesOnlyWithin({'system.attributes.hp.value':3,flags:{}},['system.attributes.hp']),false);
 assert.equal(touchesVisualData({flags:{[ID]:{ultimate:{current:20}}}},[`flags.${ID}.ultimate.enhancedStanceActive`]),false);
 assert.equal(touchesVisualData({flags:{['-='+ID]:null}},[`flags.${ID}.ultimate`]),true);
 assert.equal(touchesVisualData({'prototypeToken.texture.src':'art.webp'},['prototypeToken']),true);
});
test('unchanged HUD markup preserves DOM nodes and listeners',()=>{
 let writes=0;const element={set innerHTML(value){writes++;}};
 assert.equal(replaceMarkupIfChanged(element,'phase 1'),true);assert.equal(replaceMarkupIfChanged(element,'phase 1'),false);assert.equal(writes,1);replaceMarkupIfChanged(element,'phase 2');assert.equal(writes,2);
});
function scene(count){
 const w=world(),counts={containers:0,comparisons:0,huds:0};w.context.npcRules=npcRules;
 const canvas=w.context.canvas;w.settings.set('elements',[{id:'ice',name:'Ice',color:'#aabbcc'}]);
 class Container{constructor(){this.children=[];counts.containers++;}addChild(child){child.parent=this;this.children.push(child);}destroy(){this.destroyed=true;if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}}
 class Graphics{roundRect(){return this;}fill(){return this;}circle(){return this;}destroy(){}}
 w.context.PIXI={Container,Graphics};
 const tokens=Array.from({length:count},(_,i)=>{const actor={id:'npc'+i,uuid:'Actor.npc'+i,type:'npc',prototypeToken:{disposition:-1},flags:{[ID]:{toughness:{enabled:true,current:100,max:100,weaknesses:['ice']}}},getFlag(scope,key){return this.flags[scope]?.[key];}};return {id:'t'+i,w:100,h:100,actor,children:[],document:{id:'t'+i,uuid:'Scene.map.Token.t'+i,documentName:'Token',actor,getFlag:()=>undefined},addChild(child){child.parent=this;this.children.push(child);}};});
 canvas.tokens.placeables=tokens;canvas.tokens.get=id=>tokens.find(token=>token.id===id);
 const combatants=collection(tokens.map(token=>({tokenId:token.id,actor:token.actor}))),some=combatants.some.bind(combatants);combatants.some=fn=>some(entry=>{counts.comparisons++;return fn(entry);});
 w.game.combat={started:true,combatants};w.context.refreshToughnessBars=w.context.savedVisuals.refreshToughnessBars;
 for(const name of ['refreshSkillUI','refreshResourceHuds','refreshCombatPartyHud','refreshPunchlineHUD','refreshBossHud','refreshInitiativeCarousel'])w.context[name]=()=>counts.huds++;
 w.context.savedVisuals.refreshToughnessBars();counts.containers=0;counts.comparisons=0;return {w,tokens,counts,visuals:w.context.savedVisuals};
}
test('bars reuse graphics; changed Toughness, geometry, weaknesses and visibility still invalidate',()=>{
 const {tokens,counts,visuals,w}=scene(250);visuals.refreshToughnessBars();assert.equal(counts.containers,0);assert.equal(counts.comparisons,0);
 tokens[0].actor.flags[ID].toughness.current=40;visuals.refreshToughnessBars([tokens[0]]);assert.equal(counts.containers,1);
 tokens[1].w=200;visuals.refreshToughnessBars([tokens[1]]);assert.equal(counts.containers,2);
 w.settings.set('elements',[{id:'ice',color:'#123456'}]);visuals.refreshToughnessBars([tokens[1]]);assert.equal(counts.containers,3);
 tokens[0].actor.flags[ID].toughness.enabled=false;visuals.refreshToughnessBars([tokens[0]]);assert.equal(tokens[0].children.length,0);
});
test('25/100/250-token stress comparison with released preview.38 renderer',()=>{
 const released=readFileSync(new URL('./fixtures/toughness-preview38.txt',import.meta.url),'utf8');
 const legacy=released.slice(released.indexOf('function renderToughnessBar(')).replaceAll('renderToughnessBar','legacyRenderToughnessBar').replaceAll('refreshToughnessBars','legacyRefreshToughnessBars');
 for(const count of [25,100,250]){
  const {w,tokens,counts,visuals}=scene(count);vm.runInContext(legacy+'\nglobalThis.legacyRefresh=legacyRefreshToughnessBars;',w.context);
  for(let i=0;i<count;i++)w.context.legacyRefresh();const legacyBuilds=counts.containers,legacyComparisons=counts.comparisons;assert.equal(legacyBuilds,count*count);
  visuals.refreshToughnessBars();counts.containers=0;counts.comparisons=0;
  for(const token of tokens)visuals.queueTokenVisualRefresh(token.document,{x:100,y:100});visuals.visualRefreshQueue.flush();assert.equal(counts.containers,0);assert.equal(counts.huds,0);
  for(const token of tokens)visuals.queueActorVisualRefresh(token.actor,{'system.attributes.hp.value':20});visuals.visualRefreshQueue.flush();assert.equal(counts.containers,0);assert.equal(counts.huds,1);assert.equal(counts.comparisons,0);
  console.log(JSON.stringify({tokens:count,baselineBarBuilds:legacyBuilds,baselineCombatantComparisons:legacyComparisons,movementBarBuilds:0,hpBarBuilds:counts.containers,hpHudPasses:counts.huds}));
 }
});
test('boss and companion HP refresh without unrelated bars; Toughness changes redraw only the actor',()=>{
 const {tokens,counts,visuals}=scene(100);tokens[0].actor.flags[ID].ultimate={isBoss:true};
 visuals.queueActorVisualRefresh(tokens[0].actor,{system:{attributes:{hp:{value:0}}}});visuals.visualRefreshQueue.flush();assert.equal(counts.huds,2);assert.equal(counts.containers,0);
 tokens[1].actor.flags[ID].toughness.current=50;visuals.queueActorVisualRefresh(tokens[1].actor,{flags:{[ID]:{toughness:{current:50}}}});visuals.visualRefreshQueue.flush();assert.equal(counts.containers,1);
});
test('bulk combatant changes share visual passes; teardown clears pending scene work',()=>{
 const {counts,visuals}=scene(100);for(let i=0;i<100;i++)visuals.queueCombatVisualRefresh();assert.equal(counts.huds,0);visuals.visualRefreshQueue.flush();assert.equal(counts.huds,3);assert.equal(counts.containers,0);
 visuals.queueCombatVisualRefresh();visuals.clearQueuedVisualRefreshes();visuals.visualRefreshQueue.flush();assert.equal(counts.huds,3);assert.equal(visuals.visualRefreshQueue.snapshot().pending,0);
});

test('the combat menu does not scan hidden tabs',()=>{
 const {w,visuals}=scene(100);let talentScans=0,elementScans=0;
 w.context.combatTalentGroups=()=>{talentScans++;return [{talents:[]}];};
 w.context.multitype={elementChangeRows:()=>{elementScans++;return [{id:'hero'}];}};
 w.context.currentPunchline=()=>0;w.context.currentSkillPoints=()=>0;
 const menu=new visuals.DMCombatMenu();menu.tab='dot';let data=menu.getData();assert.equal(talentScans,0);assert.equal(elementScans,0);assert.equal(data.enemies.length,0);
 menu.tab='talents';data=menu.getData();assert.equal(talentScans,1);assert.equal(data.talentGroups.length,1);assert.equal(elementScans,0);
 menu.tab='elements';data=menu.getData();assert.equal(elementScans,1);assert.equal(data.elementActors.length,1);
});
