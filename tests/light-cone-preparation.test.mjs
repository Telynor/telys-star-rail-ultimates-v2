import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLightConePreparation} from '../scripts/light-cone-preparation.mjs';

function nativeWorld(){
 const visits=[],lifecycle=createLightConePreparation(actor=>{visits.push(actor.id);actor.bonus+=2;});
 class Item {
  constructor(actor,rider=false){this.actor=actor;this.rider=rider;this.calls=0;}
  prepareFinalAttributes(){this.calls++;this.parts.unshift({formula:'1d6 + 4',base:true});this.seenBonus=this.actor.bonus;}
 }
 class Actor {
  constructor(id='hero'){this.id=id;this.items=[new Item(this,true),new Item(this)];}
  prepareData(){this.bonus=0;for(const item of this.items)item.parts=item.rider?[{formula:'1d6 + 4',rider:true}]:[];for(const item of this.items)item.prepareFinalAttributes();return this;}
 }
 for(const [proto,key,wrapper]of [[Actor.prototype,'prepareData',lifecycle.actor],[Item.prototype,'prepareFinalAttributes',lifecycle.item]]){const original=proto[key];proto[key]=function(...args){return wrapper.call(this,original.bind(this),...args);};}
 return {Actor,Item,lifecycle,visits};
}
test('native item finalization runs once; base weapon damage is not inserted twice and legitimate riders survive',()=>{
 const {Actor,visits}=nativeWorld(),actor=new Actor();
 for(let i=1;i<=5;i++){
  assert.equal(actor.prepareData(),actor);assert.equal(actor.bonus,2);
  for(const item of actor.items){assert.equal(item.calls,i);assert.equal(item.seenBonus,2);assert.equal(item.parts.filter(p=>p.base).length,1);}
  assert.equal(actor.items[0].parts.length,2,'same-formula rider must not be deduplicated');assert.equal(actor.items[1].parts.length,1);
 }
 assert.equal(visits.length,5);
});
test('separate actors and actors without items receive their own bonus once',()=>{
 const {Actor,visits}=nativeWorld(),a=new Actor('a'),b=new Actor('b');b.items=[];
 a.prepareData();b.prepareData();assert.equal(a.bonus,2);assert.equal(b.bonus,2);assert.deepEqual(visits,['a','b']);
});
test('an unrelated item finalization and a failed actor preparation do not apply actor bonuses later',()=>{
 const {Actor,lifecycle,visits}=nativeWorld(),actor=new Actor();
 actor.bonus=0;actor.items[0].parts=[];actor.items[0].prepareFinalAttributes();assert.equal(actor.bonus,0);
 assert.throws(()=>lifecycle.actor.call(actor,()=>{throw Error('system failure');}),/system failure/);
 actor.items[0].parts=[];actor.items[0].prepareFinalAttributes();assert.deepEqual(visits,[]);
});
