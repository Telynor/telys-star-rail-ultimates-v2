import {outfitBaseAppearance} from './outfit-rules.mjs';
export const PATH_MODULE = 'telys-star-rail-ultimates';
export const MEMO_MODULE = 'telys-memosprites';
export const INVENTORY_TYPES = new Set(['weapon','equipment','consumable','tool','loot','container','backpack']);
export const BUILD_ITEM_TYPES = new Set(['class','subclass','feat','spell','background','race']);
export const BUILD_SCOPES = [PATH_MODULE,'dnd5e','midi-qol','dae',MEMO_MODULE];
export const TOKEN_BUILD_FIELDS = ['texture','width','height','sight','light','detectionModes','bar1','bar2','ring','alpha','lockRotation','hexagonalShape'];
export const SHARED_HSR_FLAGS = new Set(['outfits','pathChanging','pathChangeRecovery','unlockedCraftingRecipes','selectedLightConeItemId','lightConeAttunementState','lightConeRuntime','bossEncounter','bossPhaseSourceUuid','initiativePortraitSource']);
export const SHARED_ULTIMATE_FIELDS = ['mainParty','partyGMOverride','receivesRewards','trialCharacter','unlockingItem'];
const copy = value => structuredClone(value);
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' ? value.trim() : '';
export const safePathImage = value => /^(?:javascript|vbscript|data:text)\s*:/i.test(text(value)) ? '' : text(value);
export const isSharedInventory = item => !BUILD_ITEM_TYPES.has(item?.type) || item?.flags?.[PATH_MODULE]?.sharedPathInventory === true;
export const documentData = document => copy(document?.toObject ? document.toObject(true) : document?._source ?? document ?? {});
export const pathCatalog = actor => normalizePathCatalog(actor?.getFlag?.(PATH_MODULE,'pathChanging'));

export function normalizePathCatalog(value) {
  const data = plain(value) ? value : {};
  return {schema:1,revision:Math.max(0,Math.floor(Number(data.revision)||0)),activeId:text(data.activeId),ownerEnabled:data.ownerEnabled!==false,allowInCombat:data.allowInCombat===true,
    profiles:(Array.isArray(data.profiles)?data.profiles:[]).filter(p=>p&&text(p.id)).map(p=>({...p,id:text(p.id),name:text(p.name).slice(0,80)||'Unnamed Path',previewImage:safePathImage(p.previewImage),pathId:text(p.pathId),elementId:text(p.elementId),enabled:p.enabled!==false})),
    pending:data.pending??null};
}

export function pathLabels(profile,{paths=[],elements=[]}={}) {
  return {pathName:paths.find(p=>p.id===profile.pathId)?.name||'Unassigned Path',pathIcon:safePathImage(paths.find(p=>p.id===profile.pathId)?.icon),
    elementName:elements.find(e=>e.id===profile.elementId)?.name||'Unassigned Element',elementIcon:safePathImage(elements.find(e=>e.id===profile.elementId)?.icon)};
}

function inventoryOrigin(effect,actorUuid,ids) {
  const origin=String(effect?.origin??'');
  return [...ids].some(id=>origin===`${actorUuid}.Item.${id}`||origin.startsWith(`${actorUuid}.Item.${id}.`));
}
export function buildEffect(effect,actorUuid,inventoryIds) {const planar=effect?.flags?.['telys-planar-ornaments'];return !planar?.statBonus&&!planar?.hsrBonus&&!inventoryOrigin(effect,actorUuid,inventoryIds);}

export function capturePathBuild(actor) {
  const data=documentData(actor),items=data.items??[],inventoryIds=new Set(items.filter(isSharedInventory).map(item=>item._id));
  const appearance=outfitBaseAppearance(actor);data.img=appearance.img;data.prototypeToken??={};data.prototypeToken.texture=appearance.texture;
  const flags={};
  for(const scope of BUILD_SCOPES) {
    flags[scope]=copy(data.flags?.[scope]??{});
    if(scope===PATH_MODULE) {
      for(const key of SHARED_HSR_FLAGS)delete flags[scope][key];
      for(const key of SHARED_ULTIMATE_FIELDS)if(flags[scope].ultimate)delete flags[scope].ultimate[key];
    }
    if(scope===MEMO_MODULE) {
      delete flags[scope].activeSummon;
      if(flags[scope].config){flags[scope].config.summoned=false;flags[scope].config.summonedTokenId='';}
    }
  }
  const system=copy(data.system??{});delete system.currency;
  // Favorites pointing at physical items remain part of the shared inventory.
  if(Array.isArray(system.favorites))system.favorites=system.favorites.filter(f=>![...inventoryIds].some(id=>String(f.id??'').includes(`.Item.${id}`)));
  const selected=items.find(item=>item._id===data.flags?.[PATH_MODULE]?.selectedLightConeItemId&&isSharedInventory(item));
  return {schema:1,sourceUuid:actor.uuid??`Actor.${data._id}`,system,flags,img:safePathImage(data.img),lightCone:{itemId:selected?selected._id:''},
    token:Object.fromEntries(TOKEN_BUILD_FIELDS.filter(key=>Object.hasOwn(data.prototypeToken??{},key)).map(key=>[key,copy(data.prototypeToken[key])])),
    items:items.filter(item=>!isSharedInventory(item)).map(copy),effects:(data.effects??[]).filter(effect=>buildEffect(effect,actor.uuid??`Actor.${data._id}`,inventoryIds)).map(copy),warnings:[]};
}

export const identityKeys = item => [item.uuid,item._stats?.compendiumSource,item._stats?.duplicateSource,item.flags?.core?.sourceId,item.flags?.[PATH_MODULE]?.partyUnlockKey,item.flags?.[PATH_MODULE]?.pathLightConeSource].filter(Boolean);

// Rewrite both object keys (advancement grants) and values (consumption targets,
// originalClass, effect origins, favorites, macros and owned-spell UUIDs).
export function rewriteBuildReferences(value,{sourceUuid,targetUuid,itemIds=new Map(),missingInventory=new Set()}={}) {
  const escaped=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const rewriteString = original => {
    if(itemIds.has(original))return itemIds.get(original);
    if(missingInventory.has(original))return '';
    let result=original;
    if(sourceUuid)result=result.replace(new RegExp(escaped(sourceUuid)+'(?![A-Za-z0-9])','g'),()=>targetUuid);
    for(const [oldId,newId]of itemIds) {
      if(oldId!==newId) {
        result=result.replace(new RegExp(escaped(`${targetUuid}.Item.${oldId}`)+'(?![A-Za-z0-9])','g'),()=>`${targetUuid}.Item.${newId}`);
        if(result===`.Item.${oldId}`||result.startsWith(`.Item.${oldId}.`))result=`.Item.${newId}`+result.slice(`.Item.${oldId}`.length);
      }
      if(result.startsWith(oldId+'.'))result=newId+result.slice(oldId.length);
    }
    for(const id of missingInventory)if(result===`${targetUuid}.Item.${id}`||result.startsWith(`${targetUuid}.Item.${id}.`))return '';
    return result;
  };
  if(typeof value==='string')return rewriteString(value);
  if(Array.isArray(value))return value.map(entry=>rewriteBuildReferences(entry,{sourceUuid,targetUuid,itemIds,missingInventory}));
  if(plain(value))return Object.fromEntries(Object.entries(value).filter(([key])=>!['__proto__','constructor','prototype'].includes(key)&&!missingInventory.has(key)).map(([key,entry])=>[rewriteString(key),rewriteBuildReferences(entry,{sourceUuid,targetUuid,itemIds,missingInventory})]));
  return value;
}

export function importPathBuild(source,target,{randomID}) {
  const snapshot=capturePathBuild(source),sourceData=documentData(source),targetData=documentData(target);
  const inventory=(targetData.items??[]).filter(isSharedInventory),reserved=new Set((targetData.items??[]).map(item=>item._id)),map=new Map(),missing=new Set(),warnings=[];
  const nextId=()=>{let id;do{id=randomID();}while(reserved.has(id));reserved.add(id);return id;};
  for(const item of snapshot.items){const id=item._id;map.set(id,reserved.has(id)?nextId():id);reserved.add(map.get(id));}
  for(const item of (sourceData.items??[]).filter(isSharedInventory)) {
    const keys=new Set(identityKeys({...item,uuid:`${source.uuid}.Item.${item._id}`}));
    const matches=inventory.filter(gear=>identityKeys({...gear,uuid:`${target.uuid}.Item.${gear._id}`}).some(key=>keys.has(key)));
    if(matches.length===1)map.set(item._id,matches[0]._id);
    else missing.add(item._id);
  }
  let result=rewriteBuildReferences(snapshot,{sourceUuid:source.uuid,targetUuid:target.uuid,itemIds:map,missingInventory:missing});
  // Item IDs are deliberately preserved or explicitly remapped. Item creation
  // must not start an advancement wizard or generate duplicate grants.
  result.items=result.items.map((item,index)=>({...item,_id:map.get(snapshot.items[index]._id)}));
  for(const item of result.items){delete item.ownership;for(const effect of item.effects??[])delete effect.ownership;}
  for(const effect of result.effects)delete effect.ownership;
  if(missing.size) {
    const raw=JSON.stringify(snapshot);
    const linked=[...(sourceData.items??[])].filter(item=>missing.has(item._id)&&raw.includes(item._id)).map(item=>item.name);
    if(linked.length)warnings.push(`Source inventory links need configuration on the shared inventory: ${linked.join(', ')}.`);
  }
  result.sourceUuid=target.uuid;result.warnings=warnings;
  return result;
}

export function materializePathBuild(snapshot,actor,{randomID}) {
  if(snapshot?.schema!==1||!plain(snapshot.system)||!Array.isArray(snapshot.items)||!Array.isArray(snapshot.effects))throw Error('This Path has no valid imported build. Ask the GM to import it again.');
  if(snapshot.items.some(isSharedInventory))throw Error('A Path build cannot contain shared inventory items. Import the source sheet again.');
  const inventory=Array.from(actor.items??[]).filter(isSharedInventory),reserved=new Set(inventory.map(item=>item.id??item._id)),ids=new Map();
  for(const item of snapshot.items) {
    if(!item._id||ids.has(item._id))throw Error('The imported Path has missing or duplicate feature IDs.');
    let id=item._id;while(reserved.has(id))id=randomID();reserved.add(id);ids.set(item._id,id);
  }
  const result=rewriteBuildReferences(copy(snapshot),{sourceUuid:snapshot.sourceUuid,targetUuid:actor.uuid,itemIds:ids});
  // Older imports may contain generated Planar effects. The Planar module
  // rebuilds these from the active loadout; importing them would stack bonuses.
  result.effects=result.effects.filter(effect=>!effect.flags?.['telys-planar-ornaments']?.statBonus&&!effect.flags?.['telys-planar-ornaments']?.hsrBonus);
  result.items=result.items.map((item,index)=>({...item,_id:ids.get(snapshot.items[index]._id)}));
  const keptEffects=new Set(Array.from(actor.effects??[]).filter(effect=>!buildEffect(documentData(effect),actor.uuid,new Set(inventory.map(item=>item.id??item._id)))).map(effect=>effect.id??effect._id));
  const effectIds=new Set(keptEffects);
  result.effects=result.effects.map(effect=>{let id=effect._id;while(!id||effectIds.has(id))id=randomID();effectIds.add(id);return {...effect,_id:id};});
  result.sourceUuid=actor.uuid;return result;
}

// Foundry updates merge objects. Explicit deletion markers prevent old class
// fields, bonuses, scripts and Eidolons from leaking into the incoming build.
export function replaceObject(current,next) {
  const result=copy(next??{});
  for(const key of Object.keys(current??{})) {
    if(!Object.hasOwn(result,key))result[`-=${key}`]=null;
    else if(plain(current[key])&&plain(result[key]))result[key]=replaceObject(current[key],result[key]);
  }
  return result;
}

export function buildActorPatch(actor,snapshot) {
  const current=documentData(actor),system=copy(snapshot.system),currentInventory=new Set((current.items??[]).filter(isSharedInventory).map(item=>item._id));
  if(Object.hasOwn(current.system??{},'currency'))system.currency=copy(current.system.currency);
  if(Array.isArray(current.system?.favorites)) {
    const shared=current.system.favorites.filter(f=>[...currentInventory].some(id=>String(f.id??'').includes(`.Item.${id}`)));
    system.favorites=[...shared,...(system.favorites??[])];
  }
  const patch={img:snapshot.img,system:replaceObject(current.system,system)};
  for(const scope of BUILD_SCOPES) {
    const desired=copy(snapshot.flags?.[scope]??{}),before=current.flags?.[scope]??{};
    if(scope===PATH_MODULE) {
      for(const key of SHARED_HSR_FLAGS)if(Object.hasOwn(before,key))desired[key]=copy(before[key]);
      if(desired.outfits)desired.outfits.appearance=null;
      desired.ultimate??={};
      for(const key of SHARED_ULTIMATE_FIELDS)if(Object.hasOwn(before.ultimate??{},key))desired.ultimate[key]=copy(before.ultimate[key]);
    }
    if(scope===MEMO_MODULE&&Object.hasOwn(before,'activeSummon'))desired.activeSummon=copy(before.activeSummon);
    patch[`flags.${scope}`]=replaceObject(before,desired);
  }
  for(const [key,value]of Object.entries(snapshot.token??{}))if(TOKEN_BUILD_FIELDS.includes(key))patch[`prototypeToken.${key}`]=copy(value);
  return patch;
}

export function profileFromBuild(snapshot,{id,paths=[],elements=[],name,previewImage}={}) {
  const config=snapshot.flags?.[PATH_MODULE]?.ultimate??{},labels=pathLabels({pathId:config.pathId,elementId:config.elementId},{paths,elements});
  return {id,name:text(name)||labels.pathName,previewImage:safePathImage(previewImage)||snapshot.flags?.[PATH_MODULE]?.ultimate?.splashImage||snapshot.img,
    pathId:config.pathId??'',elementId:config.elementId??'',enabled:true,snapshot};
}

export function pathCatalogView(actor,context={}) {
  const catalog=pathCatalog(actor);
  return {...catalog,pending:catalog.pending?{fromId:catalog.pending.fromId,toId:catalog.pending.toId,error:catalog.pending.error??''}:null,
    profiles:catalog.profiles.map(({snapshot,...profile})=>{
      const active=profile.id===catalog.activeId,config=actor?.getFlag?.(PATH_MODULE,'ultimate')??{};
      const detail=active?{...profile,pathId:config.pathId??'',elementId:config.elementId??''}:profile,items=active?Array.from(actor.items??[]):snapshot?.items??[];
      const coneId=active?actor?.getFlag?.(PATH_MODULE,'selectedLightConeItemId'):snapshot?.lightCone?.itemId,cone=actor?.items?.get?.(coneId);
      return {...detail,...pathLabels(detail,context),classes:items.filter(item=>['class','subclass'].includes(item.type)).map(item=>item.name).join(' / '),
        lightConeName:cone?.name??'None',lightConeImage:cone?.img??'',lightConeNeedsImport:!active&&!snapshot?.lightCone,
        level:items.filter(item=>item.type==='class').reduce((n,item)=>n+(Number(item.system?.levels)||0),0),features:items.filter(item=>item.type==='feat').length,spells:items.filter(item=>item.type==='spell').length,warnings:snapshot?.warnings??[]};
    })};
}
