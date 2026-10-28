import {PATH_MODULE as ID,pathCatalog,pathCatalogView,capturePathBuild,importPathBuild,materializePathBuild,buildActorPatch,buildEffect,isSharedInventory,documentData,profileFromBuild,safePathImage} from './path-change-rules.mjs';
import {actorSheetControls,actorHeaderButton,sheetActor} from './actor-sheet-controls.mjs';
import {openPathChangeWindow,refreshPathChangeWindows} from './path-changing-ui.mjs';
import {importPathLightCone,applyPathLightCone} from './path-equipment.mjs';
const queues=new Map(),pendingRequests=new Map(),changing=new Set();
const observed=new WeakMap();
let installed=false,registered=false,services={};
const gm=()=>game.users.find(user=>user.isGM&&user.active);
const authority=()=>game.user?.isGM&&gm()?.id===game.user.id;
const context=()=>({paths:game.settings.get(ID,'paths')??[],elements:game.settings.get(ID,'elements')??[]});
// Foundry mutates database operations (parent, documentName, action, etc.).
// Every call needs a fresh operation: an embedded Item's parent must never
// leak into a later world Actor update, another character or recovery.
const options=()=>({render:false,animate:false,keepId:true,tsruPathChange:true});
const notify=error=>globalThis.ui?.notifications?.error?.(error.message??String(error));
const owned=(actor,user)=>Boolean(user&&(user.isGM||actor.testUserPermission?.(user,'OWNER')));
const worldCharacter=actor=>actor?.documentName==='Actor'&&actor.type==='character'&&!actor.isToken&&game.actors.get(actor.id)===actor;
export const isChangingPath=actor=>changing.has(actor?.uuid)||Boolean(actor?.getFlag?.(ID,'pathChanging')?.pending);

export function selectedPathCharacter() {
  return services.getSelectedCharacter?.()??game.user?.character??game.actors.find(actor=>worldCharacter(actor)&&owned(actor,game.user));
}
function resolveActor(id) {return game.actors.get(id)||game.actors.find(actor=>actor.uuid===id);}
function assertActor(actor,user) {
  if(!worldCharacter(actor))throw Error('Choose a world character sheet. Path changes use the same Actor and shared inventory.');
  if(!user||user.active===false||!owned(actor,user))throw Error('Only this character’s owner or the GM can change its Path.');
}
function assertSwitchAllowed(actor,catalog) {
  if(services.isResolving?.(actor))throw Error('Finish this character’s resolving or queued ability before changing Paths.');
  if(services.activeSummon?.(actor))throw Error('Dismiss this character’s active summon before changing Paths.');
  const combat=Array.from(game.combats??[]).find(combat=>combat.started&&Array.from(combat.combatants??[]).some(c=>c.actor?.id===actor.id||c.actorId===actor.id));
  if(combat&&!catalog.allowInCombat)throw Error('Path changes during combat are disabled for this character. The GM can enable them in the Path importer.');
}
function serialize(actor,work) {
  const key=actor.uuid,job=(queues.get(key)??Promise.resolve()).catch(()=>{}).then(work);queues.set(key,job);
  return job.finally(()=>{if(queues.get(key)===job)queues.delete(key);});
}
async function writeCatalog(actor,catalog) {
  if(!worldCharacter(actor))throw Error('The destination character was removed.');
  await actor.update({[`flags.${ID}.pathChanging`]:catalog},options());
  if(pathCatalog(actor).revision!==catalog.revision)throw Error('The character’s Path configuration could not be saved.');
}
function tokenRecords(actor) {
  return Array.from(game.scenes??[]).flatMap(scene=>Array.from(scene.tokens??[])).filter(token=>token.actorId===actor.id&&token.actorLink)
    .map(token=>({sceneId:token.parent.id,tokenId:token.id,before:Object.fromEntries(['texture','width','height','sight','light','detectionModes','bar1','bar2','ring','alpha','lockRotation','hexagonalShape'].filter(key=>Object.hasOwn(documentData(token),key)).map(key=>[key,documentData(token)[key]]))}));
}
async function updateTokens(actor,snapshot,records,{restore=false}={}) {
  for(const record of records) {
    const token=game.scenes?.get?.(record.sceneId)?.tokens?.get?.(record.tokenId);
    if(!token||token.actorId!==actor.id||!token.actorLink)continue;
    const patch=restore?record.before:{...snapshot.token};
    if(!restore)patch.texture={...(patch.texture??{}),src:patch.texture?.src||snapshot.img};
    await token.update(patch,options());
  }
}
async function applyBuild(actor,snapshot) {
  if(!worldCharacter(actor))throw Error('The destination character was removed.');
  const inventory=Array.from(actor.items).filter(isSharedInventory),inventoryIds=new Set(inventory.map(item=>item.id));
  const itemIds=Array.from(actor.items).filter(item=>!isSharedInventory(item)).map(item=>item.id);
  if(itemIds.length)await actor.deleteEmbeddedDocuments('Item',itemIds,options());
  const effectIds=Array.from(actor.effects??[]).filter(effect=>buildEffect(documentData(effect),actor.uuid,inventoryIds)).map(effect=>effect.id);
  if(effectIds.length)await actor.deleteEmbeddedDocuments('ActiveEffect',effectIds,options());
  await actor.update(buildActorPatch(actor,snapshot),options());
  if(snapshot.items.length) {
    const created=await actor.createEmbeddedDocuments('Item',structuredClone(snapshot.items),options());
    if(created.length!==snapshot.items.length)throw Error('Some class, feature or spell documents were rejected. The previous Path will be restored.');
  }
  const effects=snapshot.effects.filter(effect=>!actor.effects?.get?.(effect._id));
  if(effects.length) {
    const created=await actor.createEmbeddedDocuments('ActiveEffect',structuredClone(effects),options());
    if(created.length!==effects.length)throw Error('Some Path effects were rejected. The previous Path will be restored.');
  }
  // D&D5e class creation/deletion may assign originalClass or spellcasting.
  // Reapply source values after those callbacks without touching inventory.
  await actor.update(buildActorPatch(actor,snapshot),options());
  await applyPathLightCone(actor,snapshot.lightCone);
  for(const item of inventory)if(!actor.items.get(item.id))throw Error('A shared inventory document was replaced during the Path change.');
}
function refresh(actor) {
  services.refresh?.(actor);
  actor.sheet?.render?.(false);
  Hooks.callAll('tsruPathChanged',actor);
  refreshPathChangeWindows(actor);
}

async function switchPath(actor,catalog,profile) {
  assertSwitchAllowed(actor,catalog);
  const before=capturePathBuild(actor),incoming=materializePathBuild(profile.snapshot,actor,{randomID:()=>foundry.utils.randomID()});
  incoming.flags[ID]??={};incoming.flags[ID].ultimate??={};
  Object.assign(incoming.flags[ID].ultimate,{pathId:profile.pathId,elementId:profile.elementId});
  const records=tokenRecords(actor),oldCatalog=structuredClone(catalog);
  const outgoing=catalog.profiles.find(entry=>entry.id===catalog.activeId);
  if(!outgoing)throw Error('The current Path is missing. Ask the GM to repair its configuration.');
  outgoing.snapshot=before;
  outgoing.pathId=before.flags[ID]?.ultimate?.pathId??'';
  outgoing.elementId=before.flags[ID]?.ultimate?.elementId??'';
  const transaction={...catalog,pending:{fromId:catalog.activeId,toId:profile.id,before,tokens:records,error:''}};
  changing.add(actor.uuid);let began=false;
  try {
    await writeCatalog(actor,transaction);began=true;
    await applyBuild(actor,incoming);await updateTokens(actor,incoming,records);
    profile.snapshot=incoming;
    await writeCatalog(actor,{...catalog,revision:catalog.revision+1,activeId:profile.id,pending:null});
  }catch(error) {
    if(!began&&!pathCatalog(actor).pending)throw error;
    try {await applyBuild(actor,before);await updateTokens(actor,before,records,{restore:true});await writeCatalog(actor,oldCatalog);}
    catch(rollback) {
      await writeCatalog(actor,{...transaction,pending:{...transaction.pending,error:`${error.message} Recovery: ${rollback.message}`}}).catch(()=>{});
      throw Error('The Path change was interrupted and could not be fully restored. The GM must use Restore previous Path in the importer. Shared inventory was not replaced.');
    }
    throw Error(`Path change failed; the previous Path was restored. ${error.message}`);
  }finally {changing.delete(actor.uuid);refresh(actor);}
}

export async function applyPathRequest(action,payload={},user=game.user) {
  if(!authority())throw Error('The active GM must apply Path changes.');
  const actor=resolveActor(payload.actorId);assertActor(actor,user);
  return serialize(actor,async()=>{
    if(!authority())throw Error('GM authority changed. Open the Path selector again.');
    assertActor(actor,user);
    const catalog=pathCatalog(actor);
    if(Number(payload.revision)!==catalog.revision)throw Error('This character’s Paths changed. Reopen the selector before saving.');
    if(action!=='switch'&&!user.isGM)throw Error('Only the GM can import or configure Paths.');
    if(catalog.pending&&action!=='recover')throw Error('A previous Path change needs recovery. Ask the GM to restore the previous Path.');
    if(action==='switch') {
      const profile=catalog.profiles.find(p=>p.id===payload.profileId);
      if(!profile||!profile.enabled||!user.isGM&&!catalog.ownerEnabled)throw Error('This Path is not available for owner selection.');
      if(profile.id!==catalog.activeId)await switchPath(actor,catalog,profile);
      return pathCatalogView(actor,context());
    }
    if(action==='recover') {
      if(!catalog.pending)throw Error('There is no interrupted Path change to restore.');
      changing.add(actor.uuid);
      try {const snapshot=materializePathBuild(catalog.pending.before,actor,{randomID:()=>foundry.utils.randomID()});await applyBuild(actor,snapshot);await updateTokens(actor,snapshot,catalog.pending.tokens??[],{restore:true});await writeCatalog(actor,{...catalog,activeId:catalog.pending.fromId,pending:null,revision:catalog.revision+1});}
      finally {changing.delete(actor.uuid);refresh(actor);}
      return pathCatalogView(actor,context());
    }
    let next=structuredClone(catalog);const createdIds=[];
    try{
    if(action==='import') {
      const source=resolveActor(payload.sourceActorId);
      if(!worldCharacter(source)||source===actor)throw Error('Import from a different world character sheet.');
      if(isChangingPath(source))throw Error('The source character is changing Paths. Try importing after it finishes.');
      if(next.profiles.length>=24)throw Error('A character can have up to 24 selectable Paths.');
      const catalogs=context();
      if(!next.profiles.length) {
        const original=profileFromBuild(capturePathBuild(actor),{...catalogs,id:foundry.utils.randomID(),name:undefined});
        original.original=true;original.sourceActorUuid=actor.uuid;next.activeId=original.id;next.profiles.push(original);
      }
      await importPathLightCone(source,actor,createdIds);
      const snapshot=importPathBuild(source,actor,{randomID:()=>foundry.utils.randomID()}),profile=profileFromBuild(snapshot,{...catalogs,id:foundry.utils.randomID(),name:payload.name,previewImage:payload.previewImage});
      profile.sourceActorUuid=source.uuid;next.profiles.push(profile);
    }else if(action==='settings') {
      next.ownerEnabled=payload.ownerEnabled===true;next.allowInCombat=payload.allowInCombat===true;
    }else if(['update','remove','reimport'].includes(action)) {
      const profile=next.profiles.find(p=>p.id===payload.profileId);
      if(!profile)throw Error('This Path is no longer available.');
      if(action==='remove') {
        if(profile.id===next.activeId)throw Error('Switch to another Path before removing the active one.');
        next.profiles=next.profiles.filter(p=>p!==profile);
      }else if(action==='reimport') {
        if(profile.original||profile.id===next.activeId)throw Error('Switch to another Path before replacing an imported build. The original Path is saved from this character.');
        const source=resolveActor(profile.sourceActorUuid);
        if(!worldCharacter(source)||source===actor||isChangingPath(source))throw Error('The original source sheet is missing or currently changing Paths.');
        await importPathLightCone(source,actor,createdIds);
        const snapshot=importPathBuild(source,actor,{randomID:()=>foundry.utils.randomID()});
        const imported=profileFromBuild(snapshot,{...context(),id:profile.id,name:profile.name,previewImage:profile.previewImage});
        Object.assign(profile,imported);
      }else {
        profile.name=String(payload.name??profile.name).trim().slice(0,80)||'Unnamed Path';profile.previewImage=safePathImage(payload.previewImage??profile.previewImage);
        profile.enabled=payload.enabled!==false;
        if(!profile.enabled&&profile.id===next.activeId)throw Error('The active Path must stay selectable. Switch Paths before disabling it.');
        const catalogs=context();
        for(const [key,list]of [['pathId',catalogs.paths],['elementId',catalogs.elements]])if(Object.hasOwn(payload,key)) {
          if(payload[key]&&!list.some(entry=>entry.id===payload[key]))throw Error('Choose a configured Path and Element.');
          profile[key]=payload[key];
        }
        if(profile.id===next.activeId)await actor.update({[`flags.${ID}.ultimate.pathId`]:profile.pathId,[`flags.${ID}.ultimate.elementId`]:profile.elementId},{render:false});
      }
    }else throw Error('Unknown Path changer action.');
    next.revision++;await writeCatalog(actor,next);refreshPathChangeWindows(actor);
    return pathCatalogView(actor,context());
    }catch(error){
      const added=createdIds.filter(id=>actor.items.get(id));
      if(added.length)await actor.deleteEmbeddedDocuments('Item',added,options());
      throw error;
    }
  });
}

export async function requestPathChange(action,actor,payload={}) {
  assertActor(actor,game.user);
  if(authority())return applyPathRequest(action,{...payload,actorId:actor.id},game.user);
  const responder=gm();if(!responder)throw Error('A GM must be online to apply Path changes.');
  const requestId=foundry.utils.randomID();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pendingRequests.delete(requestId);reject(Error('The GM has not confirmed the Path change. Reopen the selector to check its current state before retrying.'));},60000);
    pendingRequests.set(requestId,{resolve,reject,timer,responder:responder.id});
    game.socket.emit(`module.${ID}`,{type:'pathChangeRequest',sourceUserId:game.user.id,requestId,action,payload:{...payload,actorId:actor.id}});
  });
}
export async function handlePathSocket(message) {
  if(message?.type==='pathChangeResult'&&message.targetUserId===game.user.id) {
    const pending=pendingRequests.get(message.requestId);if(!pending||pending.responder!==message.sourceUserId)return;
    clearTimeout(pending.timer);pendingRequests.delete(message.requestId);message.error?pending.reject(Error(message.error)):pending.resolve(message.result);return;
  }
  if(message?.type!=='pathChangeRequest'||!authority())return;
  let result,error;
  try{result=await applyPathRequest(message.action,message.payload,game.users.get(message.sourceUserId));}catch(cause){error=cause.message;}
  game.socket.emit(`module.${ID}`,{type:'pathChangeResult',requestId:message.requestId,sourceUserId:game.user.id,targetUserId:message.sourceUserId,result,error});
}

function viewService() {return {context,view:actor=>pathCatalogView(actor,context()),actors:()=>Array.from(game.actors).filter(worldCharacter),request:requestPathChange};}
export function openPathChanger(actor=selectedPathCharacter(),{manage=false}={}) {
  assertActor(actor,game.user);
  if(manage&&!game.user.isGM)throw Error('Only the GM can import Paths.');
  return openPathChangeWindow(actor,viewService(),{manage});
}
export function bindPathChangerHeader(app,html) {
  const actor=sheetActor(app);
  if(!worldCharacter(actor)||!owned(actor,game.user))return;
  const catalog=pathCatalog(actor),group=actorSheetControls(app,html);if(!group)return;
  if(!game.user.isGM&&(!catalog.ownerEnabled||catalog.profiles.filter(p=>p.enabled).length<2)) {group.querySelector('[data-actor-control="path-changer"]')?.remove();return;}
  actorHeaderButton(group,{key:'path-changer',label:game.user.isGM?'Change Path / Import Paths':'Change Path',icon:'fas fa-route',order:15,onClick:()=>{try{openPathChanger(actor);}catch(error){notify(error);}}});
}
export function registerPathChangeSettings() {
  if(registered)return;registered=true;
  class PathImportMenu extends FormApplication {render(){try{openPathChanger(undefined,{manage:true});}catch(error){notify(error);}return this;}}
  game.settings.registerMenu(ID,'pathChanger',{name:'Character Path Changer',label:'Import and configure Paths',hint:'Import from an existing character into a selected character. Inventory and currency remain shared across builds.',icon:'fas fa-route',type:PathImportMenu,restricted:true});
}
export function installPathChanging(api,callbacks={}) {
  services=callbacks;
  Object.assign(api,{openPathChanger,openPathImporter:actor=>openPathChanger(actor,{manage:true}),pathChanging:{request:requestPathChange,getCatalog:actor=>pathCatalogView(actor,context()),isChanging:isChangingPath}});
  if(installed)return;installed=true;
  game.socket.on?.(`module.${ID}`,message=>void handlePathSocket(message).catch(notify));
  for(const hook of ['renderActorSheet','renderCharacterActorSheet','renderApplicationV2'])Hooks.on(hook,bindPathChangerHeader);
  Hooks.on('updateActor',(actor,_changes,opts={})=>{
    const previous=observed.get(actor),catalog=pathCatalog(actor);observed.set(actor,{activeId:catalog.activeId,pending:Boolean(catalog.pending),error:catalog.pending?.error});
    if(opts.tsruPathChange&&isChangingPath(actor)) {
      // Show the durable recovery state on every open client without rebuilding
      // HUDs or sheets for each intermediate Item/Actor operation.
      if(catalog.pending&&(!previous?.pending||previous.error!==catalog.pending.error))refreshPathChangeWindows(actor);
      return;
    }
    if(!opts.tsruPathChange||!isChangingPath(actor)){
      // Only the requesting GM runs switchPath's finally block. Other clients
      // must refresh their live HSR widgets after the durable commit arrives.
      if(opts.tsruPathChange&&previous&&(previous.pending||previous.activeId&&previous.activeId!==catalog.activeId))refresh(actor);
      else refreshPathChangeWindows(actor);
      for(const app of Object.values(actor.apps??{}))bindPathChangerHeader(app,app.element);
    }
  });
  Hooks.on('deleteActor',actor=>refreshPathChangeWindows(actor,{deleted:true}));
  for(const hook of ['createItem','updateItem','deleteItem'])Hooks.on(hook,item=>{if(item.parent?.type==='character'&&!isChangingPath(item.parent))refreshPathChangeWindows(item.parent);});
  Hooks.on('updateSetting',setting=>{if([`${ID}.paths`,`${ID}.elements`].includes(setting?.key))refreshPathChangeWindows();});
  // Keep inventory edits and sheet autosaves out of a multi-document switch.
  // The durable pending flag also guards other connected clients and reloads.
  Hooks.on('preUpdateActor',(actor,_changes,opts={})=>{if(isChangingPath(actor)&&!opts.tsruPathChange)return false;});
  for(const hook of ['preCreateItem','preUpdateItem','preDeleteItem'])Hooks.on(hook,(item,...args)=>{
    const opts=hook==='preDeleteItem'?args[0]:args[1];
    if(item.parent&&isChangingPath(item.parent)&&!opts?.tsruPathChange)return false;
  });
}
