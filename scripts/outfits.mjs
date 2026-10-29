import {OUTFIT_ID as ID,normalizeOutfitLibrary,normalizeOutfit,outfitState,outfitPaths,activeOutfitPath,outfitAvailability,selectedOutfit,outfitBaseAppearance,outfitArt,outfitTexture,outfitConfig,outfitPhonePose,normalizeOutfitTexture,isOutfitInventoryItem,outfitPortraitStyle} from './outfit-rules.mjs';
import {unlockingItemDescriptor} from './party-setup-rules.mjs';
import {actorSheetControls,actorHeaderButton,sheetActor} from './actor-sheet-controls.mjs';
import {openOutfitWindow,refreshOutfitWindows} from './outfits-ui.mjs';
const queues=new Map(),pending=new Map(),updating=new Set();let installed=false,registered=false,callbacks={};
export const isUpdatingOutfit=actor=>updating.has(actor?.uuid);
const gm=()=>game.users.find(user=>user.isGM&&user.active);
const authority=()=>game.user?.isGM&&gm()?.id===game.user.id;
const library=()=>normalizeOutfitLibrary(game.settings.get(ID,'outfitLibrary'));
const world=actor=>actor?.documentName==='Actor'&&actor.type==='character'&&!actor.isToken&&game.actors.get(actor.id)===actor;
const owned=(actor,user)=>Boolean(user&&(user.isGM||actor?.testUserPermission?.(user,'OWNER')));
const notify=error=>ui.notifications.error(error.message??String(error));
const serialize=(key,work)=>{const job=(queues.get(key)??Promise.resolve()).catch(()=>{}).then(work);queues.set(key,job);return job.finally(()=>{if(queues.get(key)===job)queues.delete(key);});};
const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
const same=(a,b)=>JSON.stringify(ordered(a))===JSON.stringify(ordered(b));
const isChanging=actor=>Boolean(actor?.getFlag?.(ID,'pathChanging')?.pending);
const opts=()=>({render:false,animate:false,tsruOutfitChange:true});
export const resolveOutfitConfig=(actor,config)=>outfitConfig(actor,config,library());
export const resolveOutfitPhonePose=(actor,pose)=>outfitPhonePose(actor,pose,library());

export async function syncOutfitAppearance(actor){
  if(!authority()||!world(actor)||isChanging(actor))return false;
  return serialize(actor.uuid+':appearance',async()=>{
    if(isChanging(actor))return false;
    updating.add(actor.uuid);try{
    const selected=selectedOutfit(actor,library()),state=outfitState(actor);
    if(!selected&&!state.appearance)return false;
    const pathKey=activeOutfitPath(actor),base=outfitBaseAppearance(actor),raw=actor.getFlag(ID,'ultimate')??{},config=resolveOutfitConfig(actor,raw),enhanced=Boolean(config.enhancedStanceEnabled&&config.enhancedStanceActive);
    const portrait=outfitArt(actor,'portrait',library(),config),normalToken=selected?.profile.normal.art.token,enhancedToken=selected?.profile.enhanced.art.token;
    const texture=outfitTexture(base.texture,normalToken);
    const appearance=selected?{pathKey,img:base.img,texture:base.texture}:null;
    const patch={};if(actor.img!==(portrait?.image||base.img))patch.img=portrait?.image||base.img;
    if(!same(actor.prototypeToken?.texture?.toObject?.()??actor.prototypeToken?.texture,texture))patch['prototypeToken.texture']=texture;
    if(!same(state.appearance,appearance))patch[`flags.${ID}.outfits.appearance`]=appearance;
    if(Object.keys(patch).length)await actor.update(patch,opts());
    for(const scene of game.scenes??[])for(const token of scene.tokens??[]){
      if(token.actorId!==actor.id||!token.actorLink)continue;
      const saved=token.getFlag?.(ID,'outfitOriginalTexture')??token.flags?.[ID]?.outfitOriginalTexture;
      const current=token.texture?.toObject?.()??token.texture??{};
      const original=normalizeOutfitTexture(saved?.pathKey===pathKey?saved.texture:token.getFlag?.(ID,'enhancedStanceOriginalToken')?.src?{...current,src:token.getFlag(ID,'enhancedStanceOriginalToken').src}:current);
      const normal=outfitTexture(original,normalToken),next=selected?(enhanced?outfitTexture({...normal,src:config.enhancedTokenImage||normal.src},enhancedToken):normal):structuredClone(original);
      if(!selected&&enhanced&&config.enhancedTokenImage)next.src=config.enhancedTokenImage;
      const changes={};
      if(!same(current,next))changes.texture=next;
      if(selected&&!saved)changes[`flags.${ID}.outfitOriginalTexture`]={pathKey,texture:original};
      else if(selected&&saved?.pathKey!==pathKey)changes[`flags.${ID}.outfitOriginalTexture`]={pathKey,texture:original};
      else if(!selected&&saved)changes[`flags.${ID}.-=outfitOriginalTexture`]=null;
      const stance=token.getFlag?.(ID,'enhancedStanceOriginalToken');
      if(enhanced&&next.src!==normal.src){const value={actorId:actor.id,src:normal.src};if(!same(stance,value))changes[`flags.${ID}.enhancedStanceOriginalToken`]=value;}
      else if(stance)changes[`flags.${ID}.-=enhancedStanceOriginalToken`]=null;
      if(Object.keys(changes).length)await token.update(changes,opts());
    }
    return true;
    }finally{updating.delete(actor.uuid);}
  });
}
async function refresh(actor){
  if(authority())await syncOutfitAppearance(actor);
  for(const app of new Set([actor.sheet,...Object.values(actor.apps??{}),ui.actors,ui.combat]))app?.render?.(false);
  callbacks.refresh?.(actor);await callbacks.synchronizeMacros?.(actor);
  Hooks.callAll('tsruOutfitChanged',actor);refreshOutfitWindows(actor);
}
export async function applyOutfitRequest(action,payload={},user=game.user){
  if(!authority())throw Error('The active GM must apply outfit changes.');
  if(!user||user.active===false)throw Error('This user is not connected.');
  if(action!=='equip'&&!user.isGM)throw Error('Only the GM can create or configure outfits.');
  if(action==='equip')return serialize('outfit:'+payload.actorId,async()=>{
    const actor=game.actors.get(payload.actorId);if(!world(actor)||!owned(actor,user))throw Error('Only the character’s owner or GM can change outfits.');
    if(isChanging(actor))throw Error('Wait until the Path change finishes.');
    const state=outfitState(actor),key=activeOutfitPath(actor);
    if(Number(payload.revision)!==state.revision||payload.pathKey!==key)throw Error('The character changed. Reopen Outfits before equipping.');
    if(payload.outfitId){const outfit=library().outfits.find(o=>o.id===payload.outfitId),access=outfit&&outfitAvailability(outfit,actor,key);if(!access?.available)throw Error(access?.reason||'This outfit is no longer available.');}
    updating.add(actor.uuid);try{
      await actor.update({[`flags.${ID}.outfits.selections.${key}`]:String(payload.outfitId||''),[`flags.${ID}.outfits.revision`]:state.revision+1},opts());
      if(outfitState(actor).revision!==state.revision+1)throw Error('The character is changing Paths. Reopen Outfits when it finishes.');
      await refresh(actor);
    }catch(error){if(!isChanging(actor)){await actor.update({[`flags.${ID}.outfits.selections.${key}`]:state.selections[key]||''},opts());await refresh(actor);}throw error;}
    finally{updating.delete(actor.uuid);}
    return outfitView(actor);
  });
  return serialize('outfit-library',async()=>{
    const current=library();if(Number(payload.revision)!==current.revision)throw Error('Outfits changed. Reload before saving.');
    if(action==='save'){
      const outfit=normalizeOutfit(payload.outfit);
      outfit.id=current.outfits.some(o=>o.id===outfit.id)?outfit.id:foundry.utils.randomID();
      if(!outfit.actorIds.length||outfit.actorIds.some(id=>!world(game.actors.get(id))))throw Error('Assign at least one world character to this outfit.');
      const seen=new Set();for(const profile of outfit.profiles){const actor=game.actors.get(profile.actorId),key=profile.actorId+':'+profile.pathKey;if(!outfit.actorIds.includes(profile.actorId)||!world(actor)||!outfitPaths(actor).some(p=>p.key===profile.pathKey)||seen.has(key))throw Error('Choose a unique character and Path for each outfit profile.');seen.add(key);}
      if(!outfit.profiles.length)throw Error('Create at least one Path artwork profile.');
      // Resolve the requirement on the GM instead of trusting client-supplied identity keys.
      if(payload.outfit?.unlockingItem){
        const item=await fromUuid(payload.outfit.unlockingItem.uuid),previous=current.outfits.find(o=>o.id===outfit.id)?.unlockingItem;
        if(!item&&previous?.uuid===payload.outfit.unlockingItem.uuid)outfit.unlockingItem=previous;
        else{
          if(item?.documentName!=='Item'||!isOutfitInventoryItem(item))throw Error('Choose an existing inventory item as the unlock requirement.');
          if(!item.pack&&item.setFlag&&!item.flags?.[ID]?.partyUnlockKey)await item.setFlag(ID,'partyUnlockKey',item.uuid);
          outfit.unlockingItem=unlockingItemDescriptor(item);
        }
      }
      current.outfits=current.outfits.filter(o=>o.id!==outfit.id);current.outfits.push(outfit);
    }else if(action==='remove')current.outfits=current.outfits.filter(o=>o.id!==payload.outfitId);
    else throw Error('Unknown outfit action.');
    current.revision++;await game.settings.set(ID,'outfitLibrary',current);
    for(const actor of game.actors)if(world(actor))await refresh(actor);
    return current;
  });
}
export async function requestOutfitChange(action,actor,payload={}){
  if(action!=='equip'&&!game.user.isGM)throw Error('Only the GM can create or configure outfits.');
  if(action==='equip'&&(!world(actor)||!owned(actor,game.user)))throw Error('Choose a character you own.');
  const body={...payload,actorId:actor?.id};if(authority())return applyOutfitRequest(action,body,game.user);
  const responder=gm();if(!responder)throw Error('A GM must be online to change outfits.');
  const requestId=foundry.utils.randomID();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('The GM has not confirmed the outfit change. Reopen Outfits to check.'));},60000);pending.set(requestId,{resolve,reject,timer,responder:responder.id});game.socket.emit(`module.${ID}`,{type:'outfitRequest',sourceUserId:game.user.id,requestId,action,payload:body});});
}
export async function handleOutfitSocket(message){
  if(message?.type==='outfitResult'&&message.targetUserId===game.user.id){const job=pending.get(message.requestId);if(!job||job.responder!==message.sourceUserId)return;clearTimeout(job.timer);pending.delete(message.requestId);message.error?job.reject(Error(message.error)):job.resolve(message.result);return;}
  if(message?.type!=='outfitRequest'||!authority())return;
  let result,error;try{result=await applyOutfitRequest(message.action,message.payload,game.users.get(message.sourceUserId));}catch(cause){error=cause.message;}
  game.socket.emit(`module.${ID}`,{type:'outfitResult',requestId:message.requestId,sourceUserId:game.user.id,targetUserId:message.sourceUserId,result,error});
}
export function outfitView(actor){const data=library(),key=activeOutfitPath(actor),state=outfitState(actor);return {revision:state.revision,libraryRevision:data.revision,pathKey:key,selectedId:selectedOutfit(actor,data)?.outfit.id||'',outfits:data.outfits.filter(o=>o.actorIds.includes(actor.id)&&o.profiles.some(p=>p.actorId===actor.id&&p.pathKey===key)).map(outfit=>({...outfit,...outfitAvailability(outfit,actor,key)}))};}
export function openOutfits(actor=callbacks.getSelectedCharacter?.()??game.user.character??Array.from(game.actors).find(actor=>world(actor)&&owned(actor,game.user)),{manage=false}={}){
  if(!world(actor)||!owned(actor,game.user))throw Error('Choose a world character you own.');
  if(manage&&!game.user.isGM)throw Error('Only the GM can create outfits.');
  return openOutfitWindow(actor,{view:outfitView,library,actors:()=>game.user.isGM?Array.from(game.actors).filter(world):[],paths:actor=>outfitPaths(actor,{paths:game.settings.get(ID,'paths')??[]}),request:requestOutfitChange,phonePreview:(actor,pose)=>game.modules?.get?.(ID)?.api?.outfits?.getPhonePreview?.(actor,pose)},{manage});
}
export function bindOutfitHeader(app,html){const actor=sheetActor(app);if(!world(actor)||!owned(actor,game.user))return;const group=actorSheetControls(app,html);if(!group)return;const button=actorHeaderButton(group,{key:'outfits',label:'Outfits',icon:'fas fa-shirt',order:16,onClick:()=>{try{openOutfits(actor);}catch(error){notify(error);}}});if(!button.querySelector('img')){button.replaceChildren();const icon=document.createElement('img');icon.src=`modules/${ID}/assets/ui/outfit-icon.png`;icon.alt='';icon.draggable=false;button.append(icon);}}
export function styleOutfitPortraits(actor,root=globalThis.document){
  if(!root?.querySelectorAll)return;const art=outfitArt(actor,'portrait',library(),actor.getFlag(ID,'ultimate')??{});
  for(const img of root.querySelectorAll(`img[data-edit="img"],img.profile,img.portrait,[data-application-part="portrait"] img,[data-document-id="${actor.id}"] img,[data-entry-id="${actor.id}"] img`)){
    if(img.closest('.tsru-outfits'))continue;
    if(art){if(!img.dataset.outfitPortraitStyle)img.dataset.outfitPortraitStyle=JSON.stringify(Object.fromEntries(['objectFit','objectPosition','objectViewBox','scale'].map(key=>[key,img.style[key]||''])));Object.assign(img.style,outfitPortraitStyle(art));}
    else if(img.dataset.outfitPortraitStyle){Object.assign(img.style,JSON.parse(img.dataset.outfitPortraitStyle));delete img.dataset.outfitPortraitStyle;}
  }
}
export function registerOutfitSettings(){if(registered)return;registered=true;game.settings.register(ID,'outfitLibrary',{scope:'world',config:false,type:Object,default:{schema:1,revision:0,outfits:[]}});class OutfitMenu extends FormApplication{render(){try{openOutfits(undefined,{manage:true});}catch(error){notify(error);}return this;}}game.settings.registerMenu(ID,'outfits',{name:'Character Outfits',label:'Outfit Builder',hint:'Create outfits, assign characters and Path artwork, and require an inventory item to unlock them.',icon:'fas fa-shirt',type:OutfitMenu,restricted:true});}
export function installOutfits(api,services={}){
  callbacks=services;Object.assign(api,{openOutfits,openOutfitBuilder:actor=>openOutfits(actor,{manage:true}),outfits:{request:requestOutfitChange,getView:outfitView,resolveConfig:resolveOutfitConfig,phonePose:resolveOutfitPhonePose,syncAppearance:syncOutfitAppearance}});
  if(installed)return;installed=true;
  game.socket.on?.(`module.${ID}`,message=>void handleOutfitSocket(message).catch(notify));
  for(const hook of ['renderActorSheet','renderCharacterActorSheet','renderApplicationV2'])Hooks.on(hook,(app,html)=>{bindOutfitHeader(app,html);const actor=sheetActor(app);if(world(actor))styleOutfitPortraits(actor,app.element?.[0]??app.element??html?.[0]??html);});
  Hooks.on('renderActorDirectory',(_app,html)=>{const root=html?.[0]??html;for(const actor of game.actors)if(world(actor))styleOutfitPortraits(actor,root);});
  Hooks.on('tsruPathChanged',actor=>{void refresh(actor).catch(notify);});
  Hooks.on('updateActor',(actor,_changes,options={})=>{if(!world(actor)||options.tsruPathChange)return;refreshOutfitWindows(actor);if(options.tsruOutfitChange){callbacks.refresh?.(actor);Hooks.callAll('tsruOutfitChanged',actor);}else if(selectedOutfit(actor,library())||outfitState(actor).appearance)void refresh(actor).catch(notify);});
  for(const hook of ['createItem','updateItem','deleteItem'])Hooks.on(hook,item=>{if(world(item.parent)&&!isChanging(item.parent)){refreshOutfitWindows(item.parent);if(selectedOutfit(item.parent,library())||outfitState(item.parent).appearance)void refresh(item.parent).catch(notify);}});
  Hooks.on('updateSetting',setting=>{if(setting?.key===`${ID}.outfitLibrary`){refreshOutfitWindows();for(const actor of game.actors)if(world(actor))void refresh(actor).catch(notify);}});
  Hooks.on('deleteActor',actor=>refreshOutfitWindows(actor,{deleted:true}));
}
