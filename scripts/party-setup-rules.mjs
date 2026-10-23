export const PARTY_ID='telys-star-rail-ultimates';
export const PARTY_SIZE=4;
const text=value=>typeof value==='string'?value.trim():'';
const whole=(value,fallback=0)=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):fallback;
const clamp=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.min(max,Math.max(min,Number(value))):fallback;
export const characterConfig=actor=>actor?.getFlag?.(PARTY_ID,'ultimate')??{};
export const actorList=actors=>Array.from(actors??[]);
export const actorById=(actors,id)=>actors?.get?.(id)??actorList(actors).find(actor=>actor.id===id);
export const slotsOf=value=>Array.from({length:PARTY_SIZE},(_,index)=>text(value?.[index]));
export function normalizePartySetup(value={}){
  return {configured:value.configured===true,revision:whole(value.revision),slots:slotsOf(value.slots),requirementsEnabled:value.requirementsEnabled===true,requiredActorIds:[...new Set((Array.isArray(value.requiredActorIds)?value.requiredActorIds:[]).map(text).filter(Boolean))].slice(0,PARTY_SIZE)};
}
export function selectedCharacterId(user,selections={}){return text(selections[user?.id])||user?.character?.id||'';}
export function defaultPartySlots(actors,users,selections={}){
  const selected=new Set(actorList(users).filter(user=>!user.isGM).map(user=>selectedCharacterId(user,selections)).filter(Boolean));
  const characters=actorList(actors).filter(actor=>actor.type==='character'&&(characterConfig(actor).mainParty||selected.has(actor.id)));
  const playerOwned=actor=>actorList(users).some(user=>!user.isGM&&actor.testUserPermission?.(user,'OWNER'));
  characters.sort((a,b)=>Number(!selected.has(a.id))-Number(!selected.has(b.id))||Number(!playerOwned(a))-Number(!playerOwned(b))||String(a.name).localeCompare(String(b.name),undefined,{sensitivity:'base'}));
  return slotsOf(characters.map(actor=>actor.id));
}
export function effectivePartySetup(value,{actors,users,selections={}}){
  const state=normalizePartySetup(value);
  if(!state.configured)state.slots=defaultPartySlots(actors,users,selections);
  return state;
}
export function protectedPartyIds(state,{actors,users,selections={}}){
  const present=new Set(state.slots),ids=new Set();
  for(const user of actorList(users).filter(user=>!user.isGM)){
    const id=selectedCharacterId(user,selections),actor=actorById(actors,id);
    if(actor&&(present.has(id)||characterConfig(actor).mainParty))ids.add(id);
    if(!id)for(const member of actorList(actors))if(member.type==='character'&&present.has(member.id)&&member.testUserPermission?.(user,'OWNER'))ids.add(member.id);
  }
  for(const actor of actorList(actors))if(actor.type==='character'&&characterConfig(actor).partyGMOverride&&characterConfig(actor).mainParty)ids.add(actor.id);
  return ids;
}
export function availablePartyActors(state,context,user){
  const {actors,selections={}}=context,known=new Set([...state.slots,...state.requiredActorIds,...Object.values(selections)]);
  return actorList(actors).filter(actor=>actor.type==='character'&&(user?.isGM||known.has(actor.id)||characterConfig(actor).mainParty||actor.testUserPermission?.(user,'OBSERVER')||actor.testUserPermission?.(user,'OWNER')))
    .sort((a,b)=>String(a.name).localeCompare(String(b.name),undefined,{sensitivity:'base'}));
}
export function partyIssues(slots,state,context,user){
  const errors=[],names=ids=>ids.map(id=>actorById(context.actors,id)?.name||`Missing character (${id})`).join(', ');
  if(!Array.isArray(slots)||slots.length!==PARTY_SIZE)return ['The party must have exactly four position slots.'];
  const ids=slots.filter(Boolean);
  if(ids.some(id=>typeof id!=='string'||!actorById(context.actors,id)||actorById(context.actors,id).type!=='character'))errors.push('Every occupied slot must contain an available world character.');
  if(new Set(ids).size!==ids.length)errors.push('A character can occupy only one slot. Use Swap slots to move them.');
  if(!user?.isGM){
    const allowed=new Set(availablePartyActors(state,context,user).map(actor=>actor.id));
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
export function planCharacterSelection(state,context,user,actorId){
  const actor=actorById(context.actors,actorId);
  if(!user||user.isGM||actor?.type!=='character'||!actor.testUserPermission?.(user,'OWNER'))throw Error('Choose a character you own.');
  if(characterConfig(actor).partyGMOverride)throw Error('The GM has locked this character’s party status.');
  const selections={...context.selections,[user.id]:actor.id},previous=selectedCharacterId(user,context.selections),slots=slotsOf(state.slots);
  const stillSelected=actorList(context.users).some(other=>!other.isGM&&other.id!==user.id&&selectedCharacterId(other,selections)===previous);
  const previousLocked=characterConfig(actorById(context.actors,previous)).partyGMOverride;
  const oldIndex=slots.indexOf(previous),newIndex=slots.indexOf(actor.id);
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
  return state.slots.map(id=>byId.get(id)).filter(Boolean);
}
export function normalizePartyArtwork(value){
  const source=Array.isArray(value)?value:value?.slots;
  return Array.from({length:PARTY_SIZE},(_,index)=>{
    const entry=source?.[index]??{},image=text(typeof entry==='string'?entry:entry.image);
    return {image:/^(?:javascript|vbscript|data:text)\s*:/i.test(image)?'':image,x:clamp(entry.x,0,100,50),y:clamp(entry.y,0,100,100),scale:clamp(entry.scale,25,250,100),flip:entry.flip===true};
  });
}
export function partyArtworkFor(actor,index){
  const entry=normalizePartyArtwork(actor?.getFlag?.(PARTY_ID,'partySetupArtwork'))[index]??normalizePartyArtwork()[0];
  return {...entry,image:entry.image||characterConfig(actor).combatHudPortrait||actor?.img||'icons/svg/mystery-man.svg'};
}
