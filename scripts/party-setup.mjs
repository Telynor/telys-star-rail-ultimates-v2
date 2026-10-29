import {PARTY_ID as ID,PARTY_PRESETS,normalizePartyPreset,partyMemberIds,unlockingItemDescriptor,normalizeUnlockingItem,normalizePartySetup,effectivePartySetup,partyIssues,planCharacterSelection,orderCombatPartyActors,normalizePartyArtwork,actorList,actorById,characterConfig} from './party-setup-rules.mjs';
import {openPartySetupWindow,openPartyArtworkWindow,refreshPartySetupWindows} from './party-setup-ui.mjs';
const SOCKET=`module.${ID}`,pending=new Map();
let installed=false,settingsRegistered=false,mutationQueue=Promise.resolve(),services={};
const gm=()=>game.users.find(user=>user.isGM&&user.active);
const authority=()=>game.user?.isGM&&gm()?.id===game.user.id;
const context=()=>({actors:game.actors,users:game.users,selections:game.settings.get(ID,'partySelections')??{},paths:game.settings.get(ID,'paths')??[],elements:game.settings.get(ID,'elements')??[]});
export function getPartySetup(){return effectivePartySetup(game.settings.get(ID,'partySetup')??{},context());}
export function registerPartySetupSettings(){
  if(settingsRegistered)return;settingsRegistered=true;
  game.settings.register(ID,'partySetup',{scope:'world',config:false,type:Object,default:normalizePartySetup()});
}
function serialize(work){const job=mutationQueue.catch(()=>{}).then(work);mutationQueue=job;return job;}
async function persistPartyState(next,{selections,validate}={}){
  const previous=structuredClone(game.settings.get(ID,'partySetup')??normalizePartySetup()),oldSelections=structuredClone(context().selections),changed=[];
  let wroteSelections=false;
  try{
    const included=new Set(partyMemberIds(next));
    for(const actor of actorList(game.actors).filter(actor=>actor.type==='character')){
      const before=Boolean(characterConfig(actor).mainParty),after=included.has(actor.id);if(before===after)continue;
      changed.push({actor,before});await actor.update({[`flags.${ID}.ultimate.mainParty`]:after},{render:false,tsruPartySetup:true});
    }
    validate?.();
    if(selections){wroteSelections=true;await game.settings.set(ID,'partySelections',selections);}
    await game.settings.set(ID,'partySetup',next);
  }catch(error){
    for(const {actor,before}of changed.reverse())try{await actor.update({[`flags.${ID}.ultimate.mainParty`]:before},{render:false,tsruPartySetup:true});}catch(cause){console.error(`${ID} | Could not restore party membership`,cause);}
    if(wroteSelections)await game.settings.set(ID,'partySelections',oldSelections);
    // Some backends can reject after the update reached the local collection.
    if((game.settings.get(ID,'partySetup')?.revision??0)!==(previous.revision??0))await game.settings.set(ID,'partySetup',previous);
    throw error;
  }
  services.refreshCombatPartyHud?.();
  Hooks.callAll('tsruPartySetupChanged',next);
  return next;
}
export async function applyPartySetupRequest(action,payload={},user=game.user){
  if(!authority())throw Error('The active GM must apply party changes.');
  return serialize(async()=>{
    if(!authority())throw Error('GM authority changed before the party request was applied. Try again.');
    if(!user||(!user.isGM&&user.active===false))throw Error('An active player or GM is required.');
    const current=getPartySetup(),ctx=context();
    if(action!=='selectCharacter'&&Number(payload.revision)!==current.revision)throw Error('The party changed while you were editing. Reload the current party before locking in.');
    if(action==='requirements'){
      if(!user.isGM)throw Error('Only the GM can assign Party Requires.');
      const ids=payload.requiredActorIds;
      if(!Array.isArray(ids)||ids.length>4||ids.some(id=>typeof id!=='string'||actorById(ctx.actors,id)?.type!=='character'&&(payload.requirementsEnabled===true||!current.requiredActorIds.includes(id)))||new Set(ids).size!==ids.length)throw Error('Party Requires accepts up to four different world character sheets.');
      const next={...current,revision:current.revision+1,requirementsEnabled:payload.requirementsEnabled===true,requiredActorIds:[...ids]};
      await game.settings.set(ID,'partySetup',next);Hooks.callAll('tsruPartySetupChanged',next);return next;
    }
    let slots=payload.slots,selections,optionalActorId=payload.optionalActorId??current.optionalActorId;
    if(action==='selectCharacter')({slots,selections}=planCharacterSelection(current,ctx,user,payload.actorId));
    else if(!['lineup','savePreset'].includes(action))throw Error('Unknown party setup action.');
    const errors=partyIssues(slots,current,selections?{...ctx,selections}:ctx,user,{optionalActorId});if(errors.length)throw Error(errors[0]);
    const index=payload.presetIndex??current.activePreset;
    if(!Number.isInteger(index)||index<0||index>=PARTY_PRESETS)throw Error('Choose a valid party preset from 01 to 06.');
    const preset=normalizePartyPreset({name:payload.presetName??current.presets[index].name,slots,optionalActorId,saved:true},index),presets=current.presets.map((entry,i)=>i===index?preset:entry);
    if(action==='savePreset'){
      const next={...current,presets,revision:current.revision+1};
      await game.settings.set(ID,'partySetup',next);Hooks.callAll('tsruPartySetupChanged',next);return next;
    }
    const next={...current,configured:true,revision:current.revision+1,slots:[...slots],optionalActorId,presets,activePreset:index};
    await persistPartyState(next,{selections,validate:()=>{const errors=partyIssues(slots,current,selections?{...context(),selections}:context(),user,{optionalActorId});if(errors.length)throw Error(errors[0]);}});
    if(selections){game.socket.emit(SOCKET,{type:'partySelectionChanged',userId:user.id,actorId:payload.actorId,sourceUserId:game.user.id});}
    return next;
  });
}
export async function requestPartySetup(action,payload){
  if(authority())return applyPartySetupRequest(action,payload,game.user);
  const responder=gm();if(!responder)throw Error('A GM must be online to lock in party changes.');
  const requestId=foundry.utils.randomID();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('The GM did not respond. Reload the party before retrying.'));},20000);
    pending.set(requestId,{resolve,reject,timer,responder:responder.id});
    game.socket.emit(SOCKET,{type:'partySetupRequest',requestId,sourceUserId:game.user.id,action,payload});
  });
}
export async function handlePartySetupSocket(message){
  if(message?.type==='partySetupResult'&&message.targetUserId===game.user.id){
    const request=pending.get(message.requestId);if(!request||message.sourceUserId!==request.responder)return;
    clearTimeout(request.timer);pending.delete(message.requestId);message.error?request.reject(Error(message.error)):request.resolve(message.state);return;
  }
  if(message?.type!=='partySetupRequest'||!authority())return;
  let state,error;
  try{state=await applyPartySetupRequest(message.action,message.payload,game.users.get(message.sourceUserId));}catch(cause){error=cause.message;}
  game.socket.emit(SOCKET,{type:'partySetupResult',requestId:message.requestId,sourceUserId:game.user.id,targetUserId:message.sourceUserId,state,error});
}
export async function savePartyArtwork(actor,artwork){
  if(!game.user.isGM)throw Error('Only the GM can configure party artwork.');
  if(actor?.type!=='character'||actorById(game.actors,actor.id)!==actor)throw Error('Choose a world character sheet.');
  await actor.setFlag(ID,'partySetupArtwork',normalizePartyArtwork(artwork));
}
export async function savePartyUnlockingItem(actor,item){
  if(!game.user.isGM)throw Error('Only the GM can configure an unlocking item.');
  if(actor?.type!=='character'||actorById(game.actors,actor.id)!==actor)throw Error('Choose a world character sheet.');
  const value=item?unlockingItemDescriptor(item):null;
  if(item&&(item.documentName!=='Item'||!value))throw Error('Drop an Item from a sheet, the Items directory or a compendium.');
  if(item&&!item.pack&&item.setFlag&&!item.flags?.[ID]?.partyUnlockKey)await item.setFlag(ID,'partyUnlockKey',value.uuid);
  if(item)value.keys=[...new Set([...value.keys,...(item.flags?.[ID]?.partyUnlockKey?[item.flags[ID].partyUnlockKey]:[])])];
  await actor.update({[`flags.${ID}.ultimate.unlockingItem`]:value},{render:false,tsruPartySetup:true});
  return value;
}
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function bindPartyUnlockingItem(actor,root){
  if(actor.type!=='character'){for(const field of root?.querySelectorAll?.('.tsru-party-unlock-control')??[])field.remove();return;}
  for(const zone of root?.querySelectorAll?.('[data-party-unlock-item]')??[]){
    if(zone.dataset.partyUnlockBound)continue;zone.dataset.partyUnlockBound='true';
    const paint=()=>{const item=normalizeUnlockingItem(characterConfig(actor).unlockingItem);zone.innerHTML=item?`<img src="${escape(item.img||'icons/svg/item-bag.svg')}" alt=""><button type="button" data-party-unlock-open>${escape(item.name)}</button><button type="button" data-party-unlock-clear aria-label="Clear unlocking item">×</button>`:'<i class="fas fa-link" aria-hidden="true"></i><span>Drop an Item here</span>';};paint();
    const save=async item=>{try{zone.setAttribute('aria-busy','true');await savePartyUnlockingItem(actor,item);paint();}catch(error){ui.notifications.error(error.message);}finally{zone.removeAttribute('aria-busy');}};
    zone.addEventListener('dragover',event=>{if(game.user.isGM){event.preventDefault();zone.classList.add('is-dragover');}});
    zone.addEventListener('dragleave',()=>zone.classList.remove('is-dragover'));
    zone.addEventListener('drop',async event=>{event.preventDefault();event.stopPropagation();zone.classList.remove('is-dragover');try{const data=JSON.parse(event.dataTransfer.getData('text/plain'));if(data.type!=='Item')throw Error('Drop an Item to configure this character’s unlocking item.');const item=await fromUuid(data.uuid||(data.id?`Item.${data.id}`:''));if(!item)throw Error('The dropped Item is unavailable.');await save(item);}catch(error){ui.notifications.error(error.message);}});
    zone.addEventListener('click',async event=>{if(event.target.closest('[data-party-unlock-clear]'))return save(null);if(event.target.closest('[data-party-unlock-open]')){const item=await fromUuid(characterConfig(actor).unlockingItem?.uuid);item?.sheet?.render(true);}});
  }
}
export function partySetupViewServices(){return {getState:getPartySetup,getContext:context,request:requestPartySetup,saveArtwork:savePartyArtwork,getSelectedCharacter:()=>services.getSelectedMainCharacter?.()};}
export function installPartySetup(moduleApi){
  services=moduleApi;
  Object.assign(moduleApi,{openPartySetup:()=>openPartySetupWindow(partySetupViewServices()),openPartyArtwork:actor=>openPartyArtworkWindow(actor,partySetupViewServices()),partySetup:{getState:getPartySetup,request:requestPartySetup,commitMainCharacterSelection:(userId,actorId)=>applyPartySetupRequest('selectCharacter',{actorId},game.users.get(userId)),orderCombatActors:actors=>orderCombatPartyActors(actors,getPartySetup())}});
  if(installed)return;installed=true;
  game.socket.on?.(SOCKET,message=>void handlePartySetupSocket(message).catch(error=>console.error(`${ID} | Party setup`,error)));
  Hooks.on('updateSetting',setting=>{
    if(setting?.key===`${ID}.partySetup`){services.refreshCombatPartyHud?.();refreshPartySetupWindows();}
    if(setting?.key===`${ID}.partySelections`)refreshPartySetupWindows();
    if([`${ID}.paths`,`${ID}.elements`].includes(setting?.key))refreshPartySetupWindows({artworkOnly:true});
  });
  const changed=(changes,path)=>Object.keys(changes??{}).some(key=>key===path||key.startsWith(path+'.'))||path.split('.').reduce((value,key)=>value?.[key],changes)!==undefined;
  Hooks.on('updateActor',(actor,changes={})=>{if(actor.type==='character'&&['name','img','system.details.level',`flags.${ID}.partySetupArtwork`,...['mainParty','partyGMOverride','trialCharacter','pathId','elementId','unlockingItem'].map(key=>`flags.${ID}.ultimate.${key}`)].some(path=>changed(changes,path)))refreshPartySetupWindows({artworkOnly:true});});
  for(const hook of ['createItem','updateItem','deleteItem'])Hooks.on(hook,item=>{if(item.parent?.type==='character')refreshPartySetupWindows({artworkOnly:true});});
  Hooks.on('deleteActor',()=>refreshPartySetupWindows());
  Hooks.on('tsruOutfitChanged',()=>refreshPartySetupWindows({artworkOnly:true}));
  Hooks.on('tsruPathChanged',()=>refreshPartySetupWindows({artworkOnly:true}));
  Hooks.on('createActor',()=>refreshPartySetupWindows({artworkOnly:true}));
  Hooks.on('updateUser',()=>refreshPartySetupWindows({artworkOnly:true}));
}
