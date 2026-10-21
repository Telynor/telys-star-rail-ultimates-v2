import {normalizeSummonOptions} from './summon-options.mjs';
const ID='telys-star-rail-ultimates',MEMO='telys-memosprites';
const flag=(doc,scope,key)=>doc?.getFlag?.(scope,key)??doc?.flags?.[scope]?.[key];
export const summonMetadata=token=>flag(token,ID,'summonOwner')??flag(token,ID,'abilitySummon');
export const ownsSummon=(actor,token)=>{
  if(!actor?.uuid||!token)return false;
  const meta=summonMetadata(token);
  return meta?.casterUuid===actor?.uuid||!meta?.casterUuid&&meta?.casterId===actor?.id
    ||flag(token,MEMO,'summonerUuid')===actor?.uuid;
};
export const summonReference=token=>token?{sceneId:token.parent?.id,tokenId:token.id}:null;
const same=(a,b)=>a?.sceneId===b?.sceneId&&a?.tokenId===b?.tokenId;
const resolve=ref=>ref&&game.scenes.get(ref.sceneId)?.tokens.get(ref.tokenId);
export function activeSummon(actor) {
  const saved=flag(actor,MEMO,'activeSummon');
  const mapped=saved?.status==='active'?resolve(saved):null;
  if(mapped&&ownsSummon(actor,mapped))return mapped;
  const candidates=[...game.scenes].flatMap(scene=>[...scene.tokens]).filter(token=>{
    if(!ownsSummon(actor,token))return false;
    // A summon with unprepared HP still occupies the slot; a defeated one does not.
    const hp=token.actor?.system?.attributes?.hp?.value;
    return hp==null||Number(hp)>0;
  });
  return candidates.sort((a,b)=>Number(b._stats?.createdTime??summonMetadata(b)?.createdAt??0)-Number(a._stats?.createdTime??summonMetadata(a)?.createdAt??0))[0]??null;
}
export async function confirmSummonReplacement(actor) {
  const current=activeSummon(actor);if(!current)return null;
  const yes=await foundry.applications.api.DialogV2.wait({window:{title:'Replace summon?'},rejectClose:false,
    content:'<p>you still have a summon out, do you wish to dismiss and summon your new creature?</p>',
    buttons:[{action:'yes',label:'Yes',callback:()=>true},{action:'no',label:'No',default:true,callback:()=>false}]});
  return yes?summonReference(current):false;
}
export function validateSummonReplacement(actor,reference) {
  const current=activeSummon(actor);
  if(current&&!same(summonReference(current),reference))throw Error('Your active summon changed. Confirm its replacement and choose the new summon again. Nothing was spent.');
  return current;
}
export function replacementTokens(actor,reference) {
  const token=resolve(reference);if(!token||!ownsSummon(actor,token))return [];
  const operation=summonMetadata(token)?.operationId;
  return operation?[...token.parent.tokens].filter(other=>ownsSummon(actor,other)&&summonMetadata(other)?.operationId===operation):[token];
}
export async function removeSummonedTokens(tokens) {
  // Delete every initiative entry for these exact scene tokens, including inactive combats.
  for(const combat of game.combats??[]) {
    const ids=[...combat.combatants].filter(entry=>tokens.some(token=>entry.tokenId===token.id&&(entry.sceneId??combat.scene?.id)===token.parent?.id)).map(entry=>entry.id);
    if(ids.length)await combat.deleteEmbeddedDocuments('Combatant',ids);
  }
  const scenes=new Map();for(const token of tokens){const ids=scenes.get(token.parent)??[];ids.push(token.id);scenes.set(token.parent,ids);}
  for(const [scene,ids]of scenes)await scene.deleteEmbeddedDocuments('Token',ids.filter(id=>scene.tokens.get(id)));
  // Only scene tokens and their synthetic actors are discarded. Source Actors are templates.
}
export async function dismissForReplacement(actor,reference,user=game.user) {
  if(!actor||!user||!(user.isGM||actor.testUserPermission?.(user,'OWNER')))throw Error('You do not own this summoning character.');
  validateSummonReplacement(actor,reference);
  if(reference)await removeSummonedTokens(replacementTokens(actor,reference));
  return true;
}
const initiativeJobs=new WeakMap();
export async function setupSummonInitiative(actor,token,options={}) {
  const mode=normalizeSummonOptions(options).initiativeMode,combat=game.combat,previous=initiativeJobs.get(token);
  if(previous?.mode===mode&&previous.combat===combat)return previous.job;
  const job=(previous?.job??Promise.resolve()).catch(()=>{}).then(async()=>{
    if(!combat||!token.parent?.tokens.get(token.id)||(combat.scene?.id??combat.sceneId)!==token.parent.id)return;
    const entries=[...combat.combatants].filter(entry=>entry.tokenId===token.id&&(entry.sceneId??combat.scene?.id)===token.parent.id);
    if(mode==='owner') {
      if(entries.length)await combat.deleteEmbeddedDocuments('Combatant',entries.map(entry=>entry.id));
      return;
    }
    let entry=entries[0];
    if(!entry)[entry]=await combat.createEmbeddedDocuments('Combatant',[{tokenId:token.id,sceneId:token.parent.id,actorId:token.actorId}]);
    if(entry&&entry.initiative==null)await combat.rollInitiative([entry.id]);
  });const entry={mode,combat,job};initiativeJobs.set(token,entry);
  try{return await job;}catch(error){if(initiativeJobs.get(token)===entry)initiativeJobs.delete(token);throw error;}
}
