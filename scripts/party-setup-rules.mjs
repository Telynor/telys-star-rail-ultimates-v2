import {outfitArt} from './outfit-rules.mjs';
export const PARTY_ID='telys-star-rail-ultimates';
export const PARTY_SIZE=4;
export const PARTY_PRESETS=6;
const text=value=>typeof value==='string'?value.trim():'';
const whole=(value,fallback=0)=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):fallback;
const clamp=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.min(max,Math.max(min,Number(value))):fallback;
export const characterConfig=actor=>actor?.getFlag?.(PARTY_ID,'ultimate')??{};
export const actorList=actors=>Array.from(actors??[]);
export const actorById=(actors,id)=>actors?.get?.(id)??actorList(actors).find(actor=>actor.id===id);
export const slotsOf=value=>Array.from({length:PARTY_SIZE},(_,index)=>text(value?.[index]));
export function normalizePartyPreset(value={},index=0){
  return {name:text(value?.name).slice(0,60)||`Party ${String(index+1).padStart(2,'0')}`,slots:slotsOf(value?.slots),optionalActorId:text(value?.optionalActorId),saved:value?.saved===true};
}
export function normalizePartySetup(value={}){
  const state={configured:value.configured===true,revision:whole(value.revision),slots:slotsOf(value.slots),optionalActorId:text(value.optionalActorId),activePreset:Math.min(PARTY_PRESETS-1,whole(value.activePreset)),presets:Array.from({length:PARTY_PRESETS},(_,i)=>normalizePartyPreset(value.presets?.[i],i)),requirementsEnabled:value.requirementsEnabled===true,requiredActorIds:[...new Set((Array.isArray(value.requiredActorIds)?value.requiredActorIds:[]).map(text).filter(Boolean))].slice(0,PARTY_SIZE)};
  if(!value.presets?.[state.activePreset]&&state.slots.some(Boolean))state.presets[state.activePreset]={...state.presets[state.activePreset],slots:[...state.slots],optionalActorId:state.optionalActorId,saved:state.configured};
  return state;
}
export const partyMemberIds=(state,slots=state.slots,optionalActorId=state.optionalActorId)=>[...slots,optionalActorId].filter(Boolean);
export function normalizeUnlockingItem(value){
  if(!value||typeof value!=='object'||!/^Item\.[^.]+$|^Actor\.[^.]+\.Item\.[^.]+$|^Compendium\.[^\s]+$/.test(text(value.uuid)))return null;
  return {uuid:text(value.uuid),name:text(value.name).slice(0,200)||'Unlocking item',img:safePartyImage(value.img),keys:[...new Set([text(value.uuid),...(Array.isArray(value.keys)?value.keys:[]).map(text)])].filter(Boolean).slice(0,12)};
}
export function itemIdentityKeys(item){
  return [...new Set([item?.uuid,item?._stats?.compendiumSource,item?._stats?.duplicateSource,item?.flags?.core?.sourceId,item?.flags?.dnd5e?.sourceId,item?.flags?.[PARTY_ID]?.partyUnlockKey].filter(value=>typeof value==='string'&&value))];
}
export function unlockingItemDescriptor(item){return normalizeUnlockingItem({uuid:item?.uuid,name:item?.name,img:item?.img,keys:itemIdentityKeys(item)});}
export function partyInventoryKeys(state,context){
  const members=state.configured?new Set(partyMemberIds(state)):null,keys=new Set();
  for(const actor of actorList(context.actors))if(actor.type==='character'&&characterConfig(actor).mainParty&&(!members||members.has(actor.id)))for(const item of actorList(actor.items)){
    if(item.system?.quantity!==undefined&&Number(item.system.quantity)<=0)continue;
    for(const key of itemIdentityKeys(item))keys.add(key);
  }
  return keys;
}
export function characterAvailability(actor,state,context){
  const config=characterConfig(actor),item=normalizeUnlockingItem(config.unlockingItem),inventory=context.inventoryKeys??partyInventoryKeys(state,context);
  const unlocked=Boolean(item&&item.keys.some(key=>inventory.has(key)));
  return {item,unlocked,trial:config.trialCharacter===true,selectable:!item||unlocked||config.trialCharacter===true,optional:config.trialCharacter===true||unlocked};
}
export function optionalPartyActors(state,context){
  const ctx={...context,inventoryKeys:context.inventoryKeys??partyInventoryKeys(state,context)};
  return actorList(context.actors).filter(actor=>actor.type==='character'&&characterAvailability(actor,state,ctx).optional).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
}
export function partyActorDetails(actor,context={}){
  const config=characterConfig(actor),catalog=value=>Array.isArray(value)?value:Object.values(value??{});
  const path=catalog(context.paths).find(entry=>entry?.id===config.pathId),element=catalog(context.elements).find(entry=>entry?.id===config.elementId);
  const rawLevel=actor?.system?.details?.level,level=Number(rawLevel?.value??rawLevel);
  return {level:Number.isFinite(level)?Math.max(0,Math.floor(level)):'—',pathName:path?.name||'Unassigned Path',pathIcon:safePartyImage(path?.icon||path?.image),elementName:element?.name||'',elementIcon:safePartyImage(element?.icon||element?.image),trial:config.trialCharacter===true};
}
export function selectedCharacterId(user,selections={}){return text(selections[user?.id])||user?.character?.id||'';}
export function defaultPartySlots(actors,users,selections={}){
  const selected=new Set(actorList(users).filter(user=>!user.isGM).map(user=>selectedCharacterId(user,selections)).filter(Boolean));
  const characters=actorList(actors).filter(actor=>actor.type==='character'&&!characterConfig(actor).trialCharacter&&(characterConfig(actor).mainParty||selected.has(actor.id)));
  const playerOwned=actor=>actorList(users).some(user=>!user.isGM&&actor.testUserPermission?.(user,'OWNER'));
  characters.sort((a,b)=>Number(!selected.has(a.id))-Number(!selected.has(b.id))||Number(!playerOwned(a))-Number(!playerOwned(b))||String(a.name).localeCompare(String(b.name),undefined,{sensitivity:'base'}));
  return slotsOf(characters.map(actor=>actor.id));
}
export function effectivePartySetup(value,{actors,users,selections={}}){
  const state=normalizePartySetup(value);
  if(!state.configured){state.slots=defaultPartySlots(actors,users,selections);if(!state.presets[state.activePreset].saved)state.presets[state.activePreset].slots=[...state.slots];}
  return state;
}
export function protectedPartyIds(state,{actors,users,selections={}}){
  const present=new Set(partyMemberIds(state)),ids=new Set();
  for(const user of actorList(users).filter(user=>!user.isGM)){
    const id=selectedCharacterId(user,selections),actor=actorById(actors,id);
    if(actor&&(present.has(id)||characterConfig(actor).mainParty))ids.add(id);
    if(!id)for(const member of actorList(actors))if(member.type==='character'&&present.has(member.id)&&member.testUserPermission?.(user,'OWNER'))ids.add(member.id);
  }
  for(const actor of actorList(actors))if(actor.type==='character'&&characterConfig(actor).partyGMOverride&&characterConfig(actor).mainParty)ids.add(actor.id);
  return ids;
}
export function availablePartyActors(state,context,user){
  const {actors,selections={}}=context,known=new Set([...partyMemberIds(state),...state.requiredActorIds,...Object.values(selections)]),ctx={...context,inventoryKeys:context.inventoryKeys??partyInventoryKeys(state,context)};
  return actorList(actors).filter(actor=>{if(actor.type!=='character')return false;const access=characterAvailability(actor,state,ctx);return !access.trial&&access.selectable&&(access.unlocked||user?.isGM||known.has(actor.id)||characterConfig(actor).mainParty||actor.testUserPermission?.(user,'OBSERVER')||actor.testUserPermission?.(user,'OWNER'));})
    .sort((a,b)=>String(a.name).localeCompare(String(b.name),undefined,{sensitivity:'base'}));
}
export function partyIssues(slots,state,context,user,{optionalActorId=state.optionalActorId||''}={}){
  const errors=[],names=ids=>ids.map(id=>actorById(context.actors,id)?.name||`Missing character (${id})`).join(', ');
  if(!Array.isArray(slots)||slots.length!==PARTY_SIZE)return ['The party must have exactly four position slots.'];
  if(typeof optionalActorId!=='string')return ['Choose a valid optional character.'];
  const ids=partyMemberIds(state,slots,optionalActorId),projected={...state,configured:true,slots,optionalActorId},ctx={...context,inventoryKeys:partyInventoryKeys(projected,context)};
  if(ids.some(id=>typeof id!=='string'||actorById(context.actors,id)?.type!=='character'))errors.push('Every occupied slot must contain an available world character.');
  if(new Set(ids).size!==ids.length)errors.push('A character can occupy only one slot. Use Swap slots to move them.');
  const misplacedTrials=slots.filter(id=>characterConfig(actorById(context.actors,id)).trialCharacter);
  if(misplacedTrials.length)errors.push(`Trial Characters must use position 5 (Optional Character): ${names(misplacedTrials)}.`);
  for(const id of ids){const actor=actorById(context.actors,id);if(actor){const access=characterAvailability(actor,projected,ctx);if(!access.selectable)errors.push(`${actor.name} requires ${access.item.name} in a main-party character’s inventory.`);}}
  if(optionalActorId){const actor=actorById(context.actors,optionalActorId);if(actor&&!characterAvailability(actor,projected,ctx).optional)errors.push('Optional Character must be a Trial Character or have its unlocking item held by the main party.');}
  if(!user?.isGM){
    const allowed=new Set([...availablePartyActors(projected,ctx,user),...optionalPartyActors(projected,ctx)].map(actor=>actor.id));
    if(ids.some(id=>!allowed.has(id)))errors.push('You cannot add a character that is not available to the party.');
    const removed=[...protectedPartyIds(state,context)].filter(id=>!ids.includes(id));
    if(removed.length)errors.push(`Active player characters and GM-locked members must stay in the party: ${names(removed)}. Use Swap slots to move them.`);
  }
  if(state.requirementsEnabled){
    const missing=state.requiredActorIds.filter(id=>!ids.includes(id)||!actorById(context.actors,id));
    if(missing.length)errors.push(`Party Requires: ${names(missing)}. Include every required character before locking in.`);
  }
  return errors;
}
export function swapPartySlots(slots,from,to){
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=PARTY_SIZE||to>=PARTY_SIZE)throw Error('Choose two valid party positions.');
  const next=slotsOf(slots);[next[from],next[to]]=[next[to],next[from]];return next;
}
export function choosePartySlot(slots,index,actorId){
  if(!Number.isInteger(index)||index<0||index>=PARTY_SIZE)throw Error('Choose a valid party position.');
  const next=slotsOf(slots),id=text(actorId),other=id?next.indexOf(id):-1;
  if(other>=0&&other!==index)return swapPartySlots(next,index,other);
  next[index]=id;return next;
}
export function swapPartyPositions(slots,optionalActorId,from,to){
  if(![from,to].every(index=>Number.isInteger(index)&&index>=0&&index<=PARTY_SIZE))throw Error('Choose two valid party positions.');
  const next=[...slotsOf(slots),text(optionalActorId)];[next[from],next[to]]=[next[to],next[from]];
  return {slots:next.slice(0,PARTY_SIZE),optionalActorId:next[PARTY_SIZE]};
}
export function choosePartyPosition(slots,optionalActorId,index,actorId){
  if(!Number.isInteger(index)||index<0||index>PARTY_SIZE)throw Error('Choose a valid party position.');
  const next=[...slotsOf(slots),text(optionalActorId)],id=text(actorId),other=id?next.indexOf(id):-1;
  if(other>=0&&other!==index)return swapPartyPositions(slots,optionalActorId,index,other);
  next[index]=id;return {slots:next.slice(0,PARTY_SIZE),optionalActorId:next[PARTY_SIZE]};
}
export function planCharacterSelection(state,context,user,actorId){
  const actor=actorById(context.actors,actorId);
  if(!user||user.isGM||actor?.type!=='character'||!actor.testUserPermission?.(user,'OWNER'))throw Error('Choose a character you own.');
  if(characterConfig(actor).trialCharacter)throw Error('Trial Characters must use position 5 (Optional Character).');
  if(characterConfig(actor).partyGMOverride)throw Error('The GM has locked this character’s party status.');
  const selections={...context.selections,[user.id]:actor.id},slots=slotsOf(state.slots);
  const ownedMembers=slots.filter(id=>actorById(context.actors,id)?.testUserPermission?.(user,'OWNER'));
  const previous=selectedCharacterId(user,context.selections)||(ownedMembers.length===1?ownedMembers[0]:'');
  const stillSelected=actorList(context.users).some(other=>!other.isGM&&other.id!==user.id&&selectedCharacterId(other,selections)===previous);
  const previousLocked=characterConfig(actorById(context.actors,previous)).partyGMOverride;
  const oldIndex=slots.indexOf(previous),newIndex=slots.indexOf(actor.id);
  if(state.optionalActorId===actor.id)throw Error('This character is already in the Optional Character slot. Move them into a main position first.');
  if(newIndex<0){
    const index=oldIndex>=0&&!stillSelected&&!previousLocked?oldIndex:slots.indexOf('');
    if(index<0)throw Error('The four party positions are full. Ask the GM to make room before changing characters.');
    slots[index]=actor.id;
  }else if(oldIndex>=0&&oldIndex!==newIndex&&!stillSelected&&!previousLocked)slots[oldIndex]='';
  const errors=partyIssues(slots,state,{...context,selections},user);
  // The newly selected character must be present, while the previous selection
  // is allowed to leave unless another owner or the GM still protects it.
  if(errors.length)throw Error(errors[0]);
  return {slots,selections};
}
export function orderCombatPartyActors(actors,state){
  if(!state?.configured)return actors;
  const byId=new Map(actors.map(actor=>[actor.id,actor]));
  return partyMemberIds(state).map(id=>byId.get(id)).filter(Boolean);
}
export function normalizePartyArtwork(value){
  const source=Array.isArray(value)?value:value?.slots;
  return Array.from({length:PARTY_SIZE},(_,index)=>{
    const entry=source?.[index]??{},image=text(typeof entry==='string'?entry:entry.image);
    return {image:safePartyImage(image),x:clamp(entry.x,0,100,50),y:clamp(entry.y,0,100,100),scale:clamp(entry.scale,25,250,100),flip:entry.flip===true};
  });
}
export function normalizePartyShadow(value={}){value??={};return {enabled:value.enabled!==false,x:clamp(value.x,-100,200,50),y:clamp(value.y,-100,200,100),width:clamp(value.width,1,200,34),height:clamp(value.height,1,50,4),opacity:clamp(value.opacity,0,100,24),blur:clamp(value.blur,0,20,2)};}
export function normalizePartyShadows(value){return Array.from({length:PARTY_SIZE},(_,i)=>normalizePartyShadow(value?.[i]));}
export function normalizeOptionalArtwork(value={}){value??={};return {...normalizePartyArtwork([value])[0],x:clamp(value.x,-100,200,50),y:clamp(value.y,-100,200,100),scale:clamp(value.scale,25,500,100)};}
export function partyArtworkFor(actor,index){
  const costume=outfitArt(actor,'team'+(index+1),globalThis.game?.settings?.get?.(PARTY_ID,'outfitLibrary')??{},characterConfig(actor));
  const entry=costume??(index===4?normalizeOptionalArtwork(actor?.getFlag?.(PARTY_ID,'optionalPartyArtwork')):normalizePartyArtwork(actor?.getFlag?.(PARTY_ID,'partySetupArtwork'))[index])??normalizePartyArtwork()[0];
  return {...entry,image:entry.image||characterConfig(actor).combatHudPortrait||actor?.img||'icons/svg/mystery-man.svg'};
}

export function safePartyImage(value){const image=text(value);return /^(?:javascript|vbscript|data:text)\s*:/i.test(image)?'':image;}
