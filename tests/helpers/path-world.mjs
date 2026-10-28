import {PATH_MODULE as ID,MEMO_MODULE,documentData} from '../../scripts/path-change-rules.mjs';
import {installPathChanging} from '../../scripts/path-changing.mjs';
export {ID,MEMO_MODULE};
const clone=structuredClone,hooks=new Map();
export function merge(target,patch) {
  for(const [path,value]of Object.entries(patch)) {
    const keys=path.split('.');let object=target;
    for(const key of keys.slice(0,-1))object=object[key]??={};
    const key=keys.at(-1);
    if(key.startsWith('-='))delete object[key.slice(2)];
    else if(value&&typeof value==='object'&&!Array.isArray(value))merge(object[key]??={},value);
    else object[key]=clone(value);
  }
  return target;
}
export const collection=(values=[])=>Object.assign(values,{get:id=>values.find(value=>value.id===id)});
export const HookApi={on(name,fn){const list=hooks.get(name)??[];list.push(fn);hooks.set(name,list);},callAll(name,...args){for(const fn of hooks.get(name)??[])fn(...args);},call(name,...args){return (hooks.get(name)??[]).every(fn=>fn(...args)!==false);}};
class Embedded {
  constructor(data,parent,documentName){this._source=clone(data);this.parent=parent;this.documentName=documentName;}
  get id(){return this._source._id;}get uuid(){return `${this.parent.uuid}.${this.documentName}.${this.id}`;}
  get type(){return this._source.type;}get name(){return this._source.name;}get system(){return this._source.system??{};}get flags(){return this._source.flags??{};}
  get origin(){return this._source.origin;}getFlag(scope,key){return this.flags?.[scope]?.[key];}toObject(){return clone(this._source);}
  async update(patch,opts={}){if(!HookApi.call('preUpdateItem',this,patch,opts))return;merge(this._source,patch);HookApi.callAll('updateItem',this,patch,opts);return this;}
}
export class PathActor {
  constructor(data,{owner='owner'}={}) {
    this._source=clone(data);this.items=collection((data.items??[]).map(item=>new Embedded(item,this,'Item')));this.effects=collection((data.effects??[]).map(effect=>new Embedded(effect,this,'ActiveEffect')));
    delete this._source.items;delete this._source.effects;this.owner=owner;this.documentName='Actor';this.apps={};this.calls=[];this.failCreates=0;this.rejectCreates=false;this.failUpdates=0;this.sheet={render:()=>{this.renders=(this.renders??0)+1;}};
  }
  get id(){return this._source._id;}get uuid(){return `Actor.${this.id}`;}get type(){return this._source.type;}get name(){return this._source.name;}get img(){return this._source.img;}
  get system(){return this.preparedSystem??this._source.system;}get flags(){return this._source.flags;}get prototypeToken(){return this._source.prototypeToken;}get isOwner(){return this.testUserPermission(game.user);}
  getFlag(scope,key){return this.flags?.[scope]?.[key];}testUserPermission(user){return Boolean(user&&(user.isGM||user.id===this.owner));}
  toObject(){return {...clone(this._source),items:this.items.map(item=>item.toObject()),effects:this.effects.map(effect=>effect.toObject())};}
  async update(patch,opts={}) {
    // Foundry enriches operation objects in place. A leaked embedded parent
    // makes a later world Actor update target an invalid embedded Actor.
    if(opts.parent)throw Error('Actor is not a valid embedded Document within the Actor Document');
    Object.assign(opts,{action:'update',documentName:'Actor',parent:null});
    if(!HookApi.call('preUpdateActor',this,patch,opts))return;
    this.calls.push({type:'update',patch:clone(patch),opts});
    if(this.failUpdates>0){this.failUpdates--;throw Error('Actor update failed');}
    merge(this._source,patch);HookApi.callAll('updateActor',this,patch,opts);await this.onUpdate?.(patch,opts);return this;
  }
  async setFlag(scope,key,value){return this.update({[`flags.${scope}.${key}`]:value});}
  async deleteEmbeddedDocuments(type,ids,opts={}) {
    Object.assign(opts,{action:'delete',documentName:type,parent:this});
    const list=type==='Item'?this.items:this.effects;this.calls.push({type:'delete'+type,ids:[...ids],opts});
    for(const id of ids){const item=list.get(id);if(!item||type==='Item'&&!HookApi.call('preDeleteItem',item,opts))continue;list.splice(list.indexOf(item),1);}
  }
  async createEmbeddedDocuments(type,entries,opts={}) {
    Object.assign(opts,{action:'create',documentName:type,parent:this});
    const list=type==='Item'?this.items:this.effects;this.calls.push({type:'create'+type,entries:clone(entries),opts});
    if(this.failCreates>0){this.failCreates--;if(entries[0])list.push(new Embedded(entries[0],this,type));throw Error('Embedded document creation failed');}
    const created=[];
    for(const data of entries) {
      const item=new Embedded(data,this,type);
      if(type==='Item'&&!HookApi.call('preCreateItem',item,data,opts))continue;
      if(this.rejectCreates){this.rejectCreates=false;continue;}
      if(list.get(item.id))throw Error('Duplicate embedded ID');list.push(item);created.push(item);
    }
    await this.onCreate?.(type,created,opts);return created;
  }
}
function actorData(id,{alt=false}={}) {
  const classId=alt?'sword':'class',featId=alt?'altfeat':'feat',spellId=alt?'altspell':'spell',uuid=`Actor.${id}`;
  return {_id:id,name:alt?'Imported template':'Hero',type:'character',img:alt?'alt-portrait.png':'hero.png',ownership:{default:0,owner:3},prototypeToken:{name:id,actorLink:true,texture:{src:alt?'alt-token.png':'hero-token.png'},width:alt?2:1,height:alt?3:1},
    system:{currency:{gp:alt?999:14},abilities:{str:{value:alt?8:16},dex:{value:alt?18:12}},details:{originalClass:classId,level:alt?7:3,biography:{value:alt?'Alt build biography':'Hero biography'}},attributes:{hp:{value:alt?21:34,max:alt?50:42,temp:0},movement:{walk:alt?40:30}},skills:{acr:{value:alt?1:0}},spells:{spell1:{value:alt?2:1}},favorites:[{id:`.Item.${spellId}`},{id:`.Item.${alt?'sourcearrows':'arrows'}`}]},
    flags:{[ID]:{ultimate:{enabled:true,current:alt?16:70,max:alt?80:100,skillText:alt?'Ice Skill':'Wind Skill',ultimateText:alt?'Ice Ultimate':'Wind Ultimate',pathId:alt?'remembrance':'hunt',elementId:alt?'ice':'wind',mainParty:!alt,trialCharacter:alt,partyGMOverride:!alt,unlockingItem:alt?{uuid:'Item.template-key'}:null,skillSpell:{spellUuid:`${uuid}.Item.${spellId}`}},eidolons:{slots:[{number:1,active:alt,title:alt?'Ice E1':'Wind E1'}]},alternateOrb:{label:alt?'Alt orb':'Original orb'},alternateOrbCounter:alt?2:4,partySetupArtwork:[{image:alt?'alt-standing.png':'hero-standing.png'}],unlockedCraftingRecipes:['shared-recipe'],selectedLightConeItemId:alt?'sourceweapon':'sword',scriptState:{state:alt?'ice':'wind'}},
      [MEMO_MODULE]:{config:{enabled:alt,name:alt?'Ice Spirit':'Wind Spirit',sourceUuid:'Actor.pet',summoned:alt,summonedTokenId:alt?'source-summon':''}},dnd5e:{weaponCriticalThreshold:alt?18:20},otherAddon:{sharedCharacterNote:'Do not overwrite'},core:{sheetClass:'current-sheet'}},
    items:[{_id:classId,name:alt?'Wizard':'Fighter',type:'class',system:{levels:alt?7:3,advancement:{adv:{type:'ItemGrant',value:{added:{[featId]:`Compendium.features.Item.${featId}`}}}}}},
      {_id:alt?'altsub':'subclass',name:alt?'Ice School':'Wind Knight',type:'subclass',system:{classIdentifier:alt?'wizard':'fighter'}},
      {_id:featId,name:alt?'Ice Skill':'Wind Skill',type:'feat',system:{uses:{spent:0,max:4},activities:{hit:{consumption:{targets:[{type:'itemUses',target:classId},{type:'ammo',target:alt?'sourcearrows':'arrows'}]}}}},flags:{dnd5e:{advancementOrigin:`${classId}.adv`}},effects:[{_id:'featureeffect',name:'Feature effect',origin:`${uuid}.Item.${featId}`,changes:[{key:'system.abilities.dex.value',type:'add',value:'1'}]}]},
      {_id:spellId,name:alt?'Ice spell':'Wind spell',type:'spell',system:{uses:{spent:alt?1:0,max:3}}},
      {_id:alt?'sourceweapon':'sword',name:alt?'Source weapon':'Shared sword',type:'weapon',system:{quantity:1,uses:{spent:2,max:5},equipped:true,attuned:true}},
      {_id:alt?'sourcebag':'bag',name:alt?'Source bag':'Shared bag',type:'container',system:{quantity:1}},
      {_id:alt?'sourcearrows':'arrows',name:'Shared arrows',type:'consumable',system:{quantity:alt?99:30,container:alt?'sourcebag':'bag'},_stats:{compendiumSource:'Compendium.gear.Item.arrows'}}],
    effects:[{_id:alt?'alteffect':'effect',name:'Path effect',origin:`${uuid}.Item.${featId}`,changes:[{key:'system.attributes.init.bonus',type:'add',value:alt?'2':'1'}]},
      {_id:alt?'sourcegeareffect':'geareffect',name:'Equipment effect',origin:`${uuid}.Item.${alt?'sourceweapon':'sword'}`,changes:[{key:'system.attributes.ac.bonus',type:'add',value:'1'}]}]};
}
export function pathWorld({install=true}={}) {
  const gm={id:'gm',isGM:true,active:true},owner={id:'owner',isGM:false,active:true},stranger={id:'stranger',isGM:false,active:true};
  const hero=new PathActor(actorData('hero')),source=new PathActor(actorData('source',{alt:true}),{owner:'gm'}),actors=collection([hero,source]);
  const messages=[],notices=[],refreshes=[],settings={paths:[{id:'hunt',name:'The Hunt',icon:'hunt.png'},{id:'remembrance',name:'Remembrance',icon:'remembrance.png'}],elements:[{id:'wind',name:'Wind',icon:'wind.png'},{id:'ice',name:'Ice',icon:'ice.png'}]};let seq=0;
  const scenes=collection(),combats=collection(),users=collection([gm,owner,stranger]);
  Object.assign(globalThis,{game:{user:gm,actors,users,scenes,combats,settings:{get:(_,key)=>settings[key]},socket:{on(){},emit:(_,message)=>messages.push(message)}},Hooks:HookApi,foundry:{utils:{randomID:()=>`random${String(++seq).padStart(10,'0')}`}},ui:{notifications:{info:m=>notices.push(m),warn:m=>notices.push(m),error:m=>notices.push(m)}}});
  const controls={resolving:false,summon:null};if(install)installPathChanging({}, {isResolving:()=>controls.resolving,activeSummon:()=>controls.summon,refresh:actor=>refreshes.push(actor.id)});
  function token(id,{linked=true}={}) {
    const scene=scenes[0]??{id:'map',tokens:collection()};if(!scenes.length)scenes.push(scene);
    const data={_id:id,texture:{src:'custom-before.png'},width:1,height:1,actorId:hero.id,actorLink:linked,x:200,y:300,elevation:5};
    const t={...data,id,parent:scene,toObject(){return clone(data)},async update(patch,opts={}){if(opts.parent&&opts.parent!==scene)throw Error('Token operation inherited the wrong parent');Object.assign(opts,{action:'update',documentName:'Token',parent:scene});if(this.fail){this.fail=false;throw Error('Token update failed');}merge(this,patch);merge(data,patch);}};scene.tokens.push(t);return t;
  }
  return {hero,source,actors,gm,owner,stranger,scenes,combats,users,messages,notices,refreshes,settings,controls,token,inventory:()=>hero.items.filter(i=>['weapon','container','consumable','equipment','loot','tool'].includes(i.type)).map(documentData)};
}
