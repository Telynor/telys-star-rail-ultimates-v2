import {normalizeSummons, parseHpDice, fixedHpCost, rectangle, overlaps, rectCorners, insideRadius, wallOccludesFootprint, segmentsCross} from './summoning-rules.mjs';
import {isSkillSpellCancelled} from './ability-spells.mjs';
import {chooseNativeSummonPositions,isNativeSummonPlacementActive,cancelNativeSummonPlacement} from './native-token-placement.mjs';
import {normalizeSummonOptions,spellSummonOptions} from './summon-options.mjs';
import {activeSummon,summonMetadata,ownsSummon,confirmSummonReplacement,validateSummonReplacement,replacementTokens,dismissForReplacement,setupSummonInitiative,removeSummonedTokens} from './summon-lifecycle.mjs';
export {chooseNativeSummonPositions,isNativeSummonPlacementActive,cancelNativeSummonPlacement};
export {activeSummon,confirmSummonReplacement,validateSummonReplacement,replacementTokens,setupSummonInitiative,removeSummonedTokens};
const ID = 'telys-star-rail-ultimates', SOCKET = `module.${ID}`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pending = new Map(), planning = new Set(), sceneQueues = new Map();
let installed = false;
const configFor = (actor, action) => normalizeSummons(actor.getFlag(ID, 'ultimate')?.[`${action}Summons`],{resourceType:action==='skill'?'dots':'none'});
const authority = () => game.user.isGM && game.users.find(user => user.isGM && user.active)?.id === game.user.id;
const canUse = (actor, user) => Boolean(actor && user && (user.isGM || actor.testUserPermission(user, 'OWNER')));
const sourceActor = uuid => /^Actor\.[\w-]+$/.test(String(uuid)) ? game.actors.get(uuid.slice(6)) : null;
const failFit = () => new Error('Cannot Fit: choose a square in the summoning zone with space clear of creatures and lighting barriers.');
export {normalizeSummons};

export function getSummonOptions(actor,token) {
  const meta=summonMetadata(token),native=token?.getFlag?.('telys-memosprites','summonerUuid')===actor.uuid;
  if(native)return normalizeSummonOptions(actor.getFlag('telys-memosprites','config')??{},{resourceType:'dots'});
  if(meta?.action&&meta.choiceId){const entry=configFor(actor,meta.action).choices.find(row=>row.id===meta.choiceId);if(entry)return normalizeSummonOptions(entry);}
  const origin=token.actor?.getFlag?.('dnd5e','summon')??token.actor?.flags?.dnd5e?.summon;
  const key=meta?.options?.key??(meta?.itemUuid&&origin?.activity&&origin?.profile?`${meta.itemUuid}:${origin.activity}:${origin.profile}`:null);
  const preference=key&&(actor.getFlag(ID,'summonPreferences')??[]).find(row=>row.key===key);
  return normalizeSummonOptions(preference??meta?.options);
}

export async function evaluateSkillHpCost(actor, config) {
  const hp = actor.system?.attributes?.hp ?? {value:0,max:0};
  let cost = fixedHpCost(config, hp), roll = null;
  if (cost === null) {
    const formula = parseHpDice(config.skillHpCostRoll || '1d6');
    roll = await new Roll(formula).evaluate();
    if (!Number.isFinite(Number(roll.total))) throw new Error('The HP cost roll did not produce a valid amount.');
    cost = Math.max(0, Math.floor(Number(roll.total)));
  }
  if (Number(hp.value) < cost) throw new Error(`This Skill requires ${cost} HP; ${actor.name} has ${Math.max(0, Number(hp.value) || 0)}. Nothing was spent.`);
  return {cost, before:Number(hp.value) || 0, roll};
}

export function placementContext(scene, caster, ignoredTokens = []) {
  const active = globalThis.canvas?.scene?.id === scene.id;
  const grid = typeof scene.grid?.getTopLeftPoint === 'function' ? scene.grid : active && canvas.grid?.getTopLeftPoint ? canvas.grid : null;
  const gx = Number(scene.grid?.sizeX || scene.grid?.size || scene._source?.grid?.size || (active && canvas.dimensions?.size)) || 100;
  const gy = Number(scene.grid?.sizeY || scene.grid?.size || scene._source?.grid?.size || (active && canvas.dimensions?.size)) || gx;
  const distance = Number(scene.grid?.distance || scene._source?.grid?.distance || (active && canvas.dimensions?.distance)) || 5;
  const raw = scene.dimensions?.sceneRect ?? scene.getDimensions?.().sceneRect ?? {x:0,y:0,width:scene.width,height:scene.height};
  const bounds = rectangle(Number(raw.x)||0, Number(raw.y)||0, Number(raw.width)||1, Number(raw.height)||1);
  const level = caster.level?.id ?? caster.level ?? caster.levelId ?? (active ? canvas.level?.id : null);
  // v14 polygon backends require a Level document; Scene surface queries also
  // accept its ID. Keep both, including when the GM is viewing another scene.
  const levelDocument = (typeof caster.level === 'object' ? caster.level : null)
    ?? scene.levels?.get(level) ?? (active && canvas.level?.id === level ? canvas.level : null);
  const casterRect = rectangle(caster.x, caster.y, Math.max(.1,Number(caster.width)||1)*gx, Math.max(.1,Number(caster.height)||1)*gy);
  const elevation = Number(caster.elevation) || 0;
  const origin = {x:casterRect.x+casterRect.width/2,y:casterRect.y+casterRect.height/2,elevation};
  const walls = [...(scene.walls ?? [])].flatMap(item => {
    const wall = item.document ?? item, coords = wall.c;
    if (!Array.isArray(coords) || !Number(wall.light) || item.isOpen || Number(wall.door)>0 && Number(wall.ds)===(globalThis.CONST?.WALL_DOOR_STATES?.OPEN ?? 1)) return [];
    const wallLevel = wall.level?.id ?? wall.level ?? wall.levelId;
    if (level && wallLevel && wallLevel !== level) return [];
    if (level && wall.levels != null && !(wall.levels.has?.(level) ?? wall.levels.includes?.(level) ?? true)) return [];
    return [[{x:coords[0],y:coords[1]},{x:coords[2],y:coords[3]}]];
  });
  const occupied = [...(scene.tokens ?? [])].filter(token => {
    if(ignoredTokens.some(ignored=>ignored.id===token.id&&ignored.parent?.id===scene.id))return false;
    const tokenLevel = token.level?.id ?? token.level ?? token.levelId;
    return !level || !tokenLevel || tokenLevel === level;
  }).map(token => rectangle(token.x,token.y,Math.max(.1,Number(token.width)||1)*gx,Math.max(.1,Number(token.height)||1)*gy));
  const surfaces = scene.getSurfaces?.({type:'light',...(level?{level:levelDocument??level}:{})}) ?? [];
  const hasLightingBoundaries = walls.length > 0 || surfaces.length > 0;
  const pointFor = (i,j) => grid?.getTopLeftPoint({i,j}) ?? {x:bounds.x+j*gx,y:bounds.y+i*gy};
  const offsetFor = point => grid?.getOffset(point) ?? {i:Math.floor((point.y-bounds.y)/gy),j:Math.floor((point.x-bounds.x)/gx)};
  const lightCollision = (a,b) => {
    if (walls.some(([c,d]) => segmentsCross(a,b,c,d))) return true;
    if (active || levelDocument) {
      const backend = globalThis.CONFIG?.Canvas?.polygonBackends?.light;
      if (backend?.testCollision?.({...a,elevation},{...b,elevation},{type:'light',mode:'any',...(levelDocument?{level:levelDocument}:{})})) return true;
    }
    return Boolean(level && scene.testSurfaceCollision?.({...a,elevation},{...b,elevation},{type:'light',mode:'any',level:levelDocument??level}));
  };
  return {scene,caster,gx,gy,distance,bounds,casterRect,origin,walls,occupied,hasLightingBoundaries,pointFor,offsetFor,lightCollision};
}

export function canPlaceSummon(context, choice, position, radius, reserved = []) {
  if (![position?.x,position?.y].every(Number.isFinite)) return false;
  const {gx,gy,bounds,casterRect,origin,walls,occupied} = context;
  const offset = context.offsetFor(position), snapped = context.pointFor(offset.i,offset.j);
  if (Math.abs(snapped.x-position.x)>.1 || Math.abs(snapped.y-position.y)>.1) return false;
  const footprint = rectangle(position.x,position.y,choice.width*gx,choice.height*gy);
  // An open map has no room to fit inside: only the selected square must be in
  // range/on the map. Always reserve the creature's real size against tokens.
  const zoneFootprint = context.hasLightingBoundaries ? footprint : rectangle(position.x,position.y,Math.min(1,choice.width)*gx,Math.min(1,choice.height)*gy);
  if (zoneFootprint.x<bounds.x-.01 || zoneFootprint.y<bounds.y-.01 || zoneFootprint.right>bounds.right+.01 || zoneFootprint.bottom>bounds.bottom+.01) return false;
  if (!insideRadius(zoneFootprint,casterRect,radius/context.distance*gx) || [...occupied,...reserved].some(other=>overlaps(footprint,other))) return false;
  if (walls.some(([a,b])=>wallOccludesFootprint(origin,footprint,a,b))) return false;
  const corners = rectCorners(zoneFootprint), center = {x:zoneFootprint.x+zoneFootprint.width/2,y:zoneFootprint.y+zoneFootprint.height/2};
  return ![...corners,center].some(point=>context.lightCollision(origin,point));
}

export function legalSummonPositions(context, choice, radius, reserved = []) {
  const pixels = radius/context.distance*context.gx, caster = context.casterRect, bounds = context.bounds;
  const start = context.offsetFor({x:Math.max(bounds.x,caster.x-pixels),y:Math.max(bounds.y,caster.y-pixels)});
  const end = context.offsetFor({x:Math.min(bounds.right,caster.right+pixels),y:Math.min(bounds.bottom,caster.bottom+pixels)});
  if ((end.i-start.i+1)*(end.j-start.j+1)>25000) throw new Error('The summoning zone covers too many squares. Reduce its radius before casting. Nothing was spent.');
  const positions = [];
  for (let i=start.i;i<=end.i;i++) for (let j=start.j;j<=end.j;j++) {
    const point = context.pointFor(i,j);
    if (canPlaceSummon(context,choice,point,radius,reserved)) positions.push({x:point.x,y:point.y});
  }
  return positions;
}

function casterFor(actor, scene, id) {
  const controlled = globalThis.canvas?.scene?.id===scene.id ? canvas.tokens?.controlled?.find(token=>token.actor?.id===actor.id)?.document : null;
  const caster = id ? scene.tokens.get(id) : controlled ?? scene.tokens.find(token=>token.actorId===actor.id);
  if (!caster || caster.actorId!==actor.id) throw new Error('Place the summoning character’s token on the battle map first.');
  return caster;
}
export function describeSummoning(actor, action, sceneId = globalThis.canvas?.scene?.id, casterTokenId) {
  const settings = configFor(actor,action), scene = game.scenes.get(sceneId);
  if (!settings.enabled) return null;
  if (!scene) throw new Error('Open the summoning character’s battle map first.');
  const caster = casterFor(actor,scene,casterTokenId);
  const choices = settings.choices.flatMap(entry => {
    const source = sourceActor(entry.actorUuid);
    if (!source) return [];
    return [{...entry,name:source.name,img:source.img || 'icons/svg/mystery-man.svg',width:Math.max(.1,Number(source.prototypeToken?.width)||1),height:Math.max(.1,Number(source.prototypeToken?.height)||1)}];
  });
  if (!choices.length) throw new Error('This ability has no available summon Actors. Ask the GM to configure its summon list. Nothing was spent.');
  return {sceneId:scene.id,casterTokenId:caster.id,radius:settings.radius,units:scene.grid?.units || scene._source?.grid?.units || 'scene units',choices};
}

export async function validateSummonPlan(actor, action, plan, user = game.user) {
  if (!configFor(actor,action).enabled) return null;
  if (!canUse(actor,user)) throw new Error('You do not own this summoning character.');
  if (!plan) throw new Error('Choose a creature and its placement before using this ability. Nothing was spent.');
  const description = describeSummoning(actor,action,plan.sceneId,plan.casterTokenId);
  if (!user.isGM && user.viewedScene && user.viewedScene!==description.sceneId) throw new Error('You must be viewing the summoning scene.');
  const choice = description.choices.find(entry=>entry.id===plan.choiceId);
  if (!choice || !Array.isArray(plan.positions) || plan.positions.length!==choice.quantity) throw new Error('The summon selection changed. Select the creature again.');
  validateSummonReplacement(actor,plan.replaces);
  const scene = game.scenes.get(description.sceneId), caster = casterFor(actor,scene,description.casterTokenId), context = placementContext(scene,caster,replacementTokens(actor,plan.replaces)), reserved = [];
  for (const position of plan.positions) {
    if (!canPlaceSummon(context,choice,position,description.radius,reserved)) throw failFit();
    reserved.push(rectangle(position.x,position.y,choice.width*context.gx,choice.height*context.gy));
  }
  return {description,choice,source:sourceActor(choice.actorUuid),scene,caster,context};
}

export async function createAbilitySummons(actor, action, plan, user = game.user) {
  if (!authority()) throw new Error('A connected GM must create summoned tokens.');
  const key=plan?.sceneId,previous=sceneQueues.get(key)??Promise.resolve();
  const work=previous.catch(()=>{}).then(()=>createSummons(actor,action,plan,user));
  sceneQueues.set(key,work);
  try{return await work;}finally{if(sceneQueues.get(key)===work)sceneQueues.delete(key);}
}
async function createSummons(actor, action, plan, user) {
  const checked = await validateSummonPlan(actor,action,plan,user);
  if (!checked) return null;
  const {source,scene,caster,choice} = checked, operationId = foundry.utils.randomID(), data = [];
  for (const position of plan.positions) {
    const token = await source.getTokenDocument({x:position.x,y:position.y,...(Number.isFinite(position.rotation)?{rotation:position.rotation}:{}),elevation:Number(caster.elevation)||0,...(caster.level?{level:caster.level.id??caster.level}:{})});
    const entry = token.toObject(); delete entry._id;
    entry.x=position.x;entry.y=position.y;entry.actorId=source.id;entry.actorLink=false;
    entry.flags={...entry.flags,[ID]:{...entry.flags?.[ID],abilitySummon:{operationId,casterId:actor.id,casterUuid:actor.uuid,casterTokenId:caster.id,choiceId:choice.id,action,createdAt:Date.now(),options:normalizeSummonOptions(choice)}}};
    data.push(entry);
  }
  try {
    // Recheck after document preparation: a creature may have moved meanwhile.
    const fresh=await validateSummonPlan(actor,action,plan,user);
    if(!fresh||JSON.stringify(fresh.choice)!==JSON.stringify(checked.choice))throw new Error('The summon Actor or its configuration changed. Select it again.');
    await dismissForReplacement(actor,plan.replaces,user);
    const tokens = await scene.createEmbeddedDocuments('Token',data);
    if (tokens.length!==data.length) throw new Error('Foundry could not create every summoned token.');
    for(const token of tokens)await setupSummonInitiative(actor,token,choice);
    return {sceneId:scene.id,tokenIds:tokens.map(token=>token.id),operationId};
  } catch (error) {
    const ids=[...scene.tokens].filter(token=>token.getFlag(ID,'abilitySummon')?.operationId===operationId).map(token=>token.id);
    if(ids.length) await removeSummonedTokens(ids.map(id=>scene.tokens.get(id)));
    throw error;
  }
}

function askGM(type, data, timeout = 15000) {
  if (!game.users.some(user=>user.isGM&&user.active)) throw new Error('A GM must be connected to use a summoning ability.');
  const requestId=foundry.utils.randomID();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('The summon request timed out. Nothing was spent.'));},timeout);
    const responder = type === 'abilitySummonReposition' ? data.targetUserId : game.users.find(user=>user.isGM&&user.active)?.id;
    pending.set(requestId,{resolve,reject,timer,responder});
    game.socket.emit(SOCKET,{type,requestId,sourceUserId:game.user.id,...data});
  });
}

export async function prepareAbilitySummon(actor, action, {description = null, choiceId = null, replaces = undefined} = {}) {
  if (!configFor(actor,action).enabled) return null;
  if (!game.user.isGM&&!actor.isOwner) throw new Error('You do not own this character.');
  const key=`${actor.id}:${action}`;
  if (planning.has(key) || isNativeSummonPlacementActive()) { ui.notifications.warn('Finish or cancel the current summon placement first.'); return false; }
  planning.add(key);
  try {
    const sceneId=globalThis.canvas?.scene?.id;
    if(!sceneId)throw new Error('Open the battle map first.');
    const casterTokenId=canvas.tokens?.controlled?.find(token=>token.actor?.id===actor.id)?.id;
    description ??= authority() ? describeSummoning(actor,action,sceneId,casterTokenId) : await askGM('abilitySummonDescribe',{actorId:actor.id,action,sceneId,casterTokenId});
    if(!description)return null;
    if(description.sceneId!==canvas.scene.id)throw new Error('Open the summoning scene before choosing its squares.');
    if(replaces===undefined)replaces=await confirmSummonReplacement(actor);
    if(replaces===false)return false;
    validateSummonReplacement(actor,replaces);
    const scene=canvas.scene,context=placementContext(scene,casterFor(actor,scene,description.casterTokenId),replacementTokens(actor,replaces));
    const choices=description.choices.map(choice=>({...choice,fits:legalSummonPositions(context,choice,description.radius).length>0}));
    if(!choices.some(choice=>choice.fits)){ui.notifications.warn('Cannot Fit: no summon can fit in the zone. Nothing was spent; you can continue.');return false;}
    if(!choiceId){
      choiceId=await foundry.applications.api.DialogV2.wait({window:{title:`${actor.name} — Summon creature`},classes:['tsru-summon-dialog'],rejectClose:false,
        content:`<p>Choose a creature, then choose ${description.units==='ft'?'its squares on the map':'where to summon it'}. Range: ${description.radius} ${esc(description.units)}.</p><div class="tsru-summon-choices">${choices.map((choice,index)=>`<label class="${choice.fits?'':'cannot-fit'}"><input type="radio" name="summonChoice" value="${esc(choice.id)}" ${choice.id===choices.find(c=>c.fits)?.id?'checked':''} ${choice.fits?'':'disabled'}><img src="${esc(choice.img)}" alt=""><span><strong>${esc(choice.name)}</strong><small>${choice.width} × ${choice.height} squares · ${choice.quantity} creature${choice.quantity===1?'':'s'}${choice.fits?'':' · Cannot Fit'}</small></span></label>`).join('')}</div>`,
        buttons:[{action:'place',label:'Choose squares',default:true,callback:(_event,_button,dialog)=>dialog.element.querySelector('[name="summonChoice"]:checked')?.value??null},{action:'cancel',label:'Cancel',callback:()=>null}]});
    }
    const choice=choices.find(entry=>entry.id===choiceId);
    if(!choice||!choice.fits)return false;
    const positions=await chooseSquares(context,choice,description,replaces);
    return positions ? {sceneId:description.sceneId,casterTokenId:description.casterTokenId,choiceId:choice.id,positions,replaces} : false;
  } finally { planning.delete(key); }
}

async function chooseSquares(context,choice,description,replaces) {
  const source=sourceActor(choice.actorUuid),actor=game.actors.get(context.caster.actorId);
  return chooseNativeSummonPositions(actor,source,{scene:context.scene,origin:context.caster,count:choice.quantity,
    validate:(point,positions)=>{
      const fresh=placementContext(context.scene,context.caster,replacementTokens(actor,replaces));
      const reserved=positions.map(p=>rectangle(p.x,p.y,choice.width*fresh.gx,choice.height*fresh.gy));
      return canPlaceSummon(fresh,choice,point,description.radius,reserved);
    }});
}

export async function ensureQueuedSummonPlan(actor, action, plan, requester) {
  try { await validateSummonPlan(actor,action,plan,requester); return plan; }
  catch(error) {
    if(!String(error.message).startsWith('Cannot Fit'))throw error;
    const description=describeSummoning(actor,action,plan.sceneId,plan.casterTokenId),choice=description.choices.find(entry=>entry.id===plan.choiceId);
    const scene=game.scenes.get(plan.sceneId),context=placementContext(scene,casterFor(actor,scene,plan.casterTokenId),replacementTokens(actor,plan.replaces));
    if(!choice||!legalSummonPositions(context,choice,description.radius).length)throw error;
    const owner=requester?.active?requester:game.user;
    const revised=owner.id===game.user.id ? await prepareAbilitySummon(actor,action,{description,choiceId:choice.id,replaces:plan.replaces}) : await askGM('abilitySummonReposition',{targetUserId:owner.id,actorId:actor.id,action,description,choiceId:choice.id,replaces:plan.replaces},180000);
    if(!revised)throw new Error('Summoning cancelled.');
    await validateSummonPlan(actor,action,revised,requester);return revised;
  }
}

export async function handleSummoningSocket(payload) {
  if(!payload?.type?.startsWith('abilitySummon'))return false;
  if(payload.type==='abilitySummonResponse'&&payload.targetUserId===game.user.id){
    const request=pending.get(payload.requestId);if(request&&request.responder===payload.sourceUserId){clearTimeout(request.timer);pending.delete(payload.requestId);payload.error?request.reject(new Error(payload.error)):request.resolve(payload.value);}return true;
  }
  if(payload.type==='abilitySummonReplace'&&authority()){
    let value,error;try{value=await dismissForReplacement(game.actors.get(payload.actorId),payload.replaces,game.users.get(payload.sourceUserId));}catch(cause){error=cause.message;}
    game.socket.emit(SOCKET,{type:'abilitySummonResponse',requestId:payload.requestId,targetUserId:payload.sourceUserId,sourceUserId:game.user.id,value,error});return true;
  }
  if(payload.type==='abilitySummonDescribe'&&authority()){
    let value,error;try{const actor=game.actors.get(payload.actorId),user=game.users.get(payload.sourceUserId);if(!canUse(actor,user))throw new Error('You do not own this character.');if(!['skill','ultimate'].includes(payload.action))throw new Error('Unknown summoning ability.');value=describeSummoning(actor,payload.action,payload.sceneId,payload.casterTokenId);}catch(cause){error=cause.message;}
    game.socket.emit(SOCKET,{type:'abilitySummonResponse',requestId:payload.requestId,targetUserId:payload.sourceUserId,sourceUserId:game.user.id,value,error});return true;
  }
  if(payload.type==='abilitySummonReposition'&&payload.targetUserId===game.user.id&&game.users.get(payload.sourceUserId)?.isGM){
    let value,error;try{value=await prepareAbilitySummon(game.actors.get(payload.actorId),payload.action,{description:payload.description,choiceId:payload.choiceId,replaces:payload.replaces});}catch(cause){error=cause.message;}
    game.socket.emit(SOCKET,{type:'abilitySummonResponse',requestId:payload.requestId,targetUserId:payload.sourceUserId,sourceUserId:game.user.id,value,error});return true;
  }
  return true;
}

export function installSummoningHooks() {
  if(installed)return;installed=true;
  installNativeSummonLifecycle();
  Hooks.on('dnd5e.summonToken',stampSpellSummon);
  Hooks.on('preCreateToken',validateSummonCreation);
  Hooks.on('createToken',token=>{
    const meta=summonMetadata(token),actor=meta&&game.actors.get(meta.casterId);
    if(authority()&&actor)void setupSummonInitiative(actor,token,getSummonOptions(actor,token)).catch(error=>ui.notifications.error(`Summon initiative: ${error.message}`));
    if(token.getFlag(ID,'abilitySummon')&&token.parent?.id===canvas.scene?.id)void playSummonAnimation(token);
  });
  Hooks.on('preCreateCombatant',(entry,data)=>{
    const scene=game.scenes.get(data.sceneId??entry.parent?.scene?.id),token=scene?.tokens.get(data.tokenId);
    const meta=summonMetadata(token),actor=meta&&game.actors.get(meta.casterId);
    if(actor&&getSummonOptions(actor,token).initiativeMode==='owner')return false;
  });
  Hooks.on('updateActor',(actor,changes)=>{
    const changed=Object.keys(changes).some(key=>key==='flags'||key.startsWith(`flags.${ID}.`)||key.startsWith('flags.telys-memosprites.config'));
    if(!authority()||!changed)return;
    for(const scene of game.scenes)for(const token of scene.tokens)if(ownsSummon(actor,token))void setupSummonInitiative(actor,token,getSummonOptions(actor,token)).catch(error=>ui.notifications.error(`Summon initiative: ${error.message}`));
  });
}

export async function requestSummonReplacement(actor,replaces) {
  return authority()?dismissForReplacement(actor,replaces):askGM('abilitySummonReplace',{actorId:actor.id,replaces});
}

export function installNativeSummonLifecycle() {
  const Class=globalThis.CONFIG?.DND5E?.activityTypes?.summon?.documentClass;
  const prototype=Class?.prototype;if(!prototype?.getPlacement||prototype.getPlacement.tsruSummonLifecycle)return;
  const wrapper=async function(original,...args){
    const actor=this.actor??this.item?.actor;if(!actor)return original(...args);
    const replaces=await confirmSummonReplacement(actor);if(replaces===false)return [];
    const positions=await original(...args);
    if(positions?.length)await requestSummonReplacement(actor,replaces);
    return positions;
  };
  if(globalThis.libWrapper?.register){
    libWrapper.register(ID,'CONFIG.DND5E.activityTypes.summon.documentClass.prototype.getPlacement',wrapper,'WRAPPER');
  }else{
    const original=prototype.getPlacement;
    prototype.getPlacement=function(...args){return wrapper.call(this,original.bind(this),...args);};
  }
  prototype.getPlacement.tsruSummonLifecycle=true;
}

// Stamp the exact caster before native D&D5e creates the token. This also covers
// ordinary spell casts made outside an HSR Skill.
export function stampSpellSummon(activity, profile, data, options = {}) {
  const actor=activity.actor??activity.item?.actor;
  if(!actor)return;
  const usage=activity.getUsageToken?.(),candidate=usage?.document??usage;
  const caster=candidate??globalThis.canvas?.tokens?.controlled?.find(token=>token.actor?.uuid===actor.uuid)?.document??actor.getActiveTokens?.(true,true)?.[0];
  const token=caster?.document??caster;
  options.tsruSummonOperationId??=foundry.utils.randomID();
  data.actorLink=false;
  data.flags={...data.flags,[ID]:{...data.flags?.[ID],summonOwner:{operationId:options.tsruSummonOperationId,casterId:actor.id,casterUuid:actor.uuid,casterTokenId:token?.id,itemUuid:activity.item?.uuid,castId:options.tsruSkillCastId??'',createdAt:Date.now(),options:spellSummonOptions(actor,activity,profile)}}};
}

export function validateSummonCreation(token, data = {}) {
  const meta=data.flags?.[ID]?.summonOwner??token.getFlag?.(ID,'summonOwner');
  if(!meta)return;
  const scene=token.parent,actor=game.actors.get(meta.casterId);
  const caster=scene?.tokens.get(meta.casterTokenId)??scene?.tokens.find(entry=>entry.actor?.uuid===meta.casterUuid||entry.actorId===meta.casterId);
  let valid=false;
  try{
    if(scene&&caster&&!isSkillSpellCancelled(actor,meta.castId)){
      const context=placementContext(scene,caster),radius=Math.hypot(context.bounds.width,context.bounds.height)/context.gx*context.distance+context.distance;
      valid=canPlaceSummon(context,{width:Math.max(.1,Number(data.width??token.width)||1),height:Math.max(.1,Number(data.height??token.height)||1)},{x:Number(data.x??token.x),y:Number(data.y??token.y)},radius);
    }
  }catch(error){console.warn(`${ID} | Summon validation`,error);}
  if(valid)return;
  ui.notifications.warn('Cannot Fit: choose an on-map square and keep the summoned creature clear of other tokens and lighting barriers.');
  Hooks.callAll('tsruSummonPlacementBlocked',token,meta);
  return false;
}
export async function playSummonAnimation(token) {
  let mesh,alpha;
  try {
    for(let i=0;i<20&&!token.object?.mesh;i++)await new Promise(resolve=>setTimeout(resolve,25));
    mesh=token.object?.mesh;if(!mesh)return;
    alpha=mesh.alpha;const start=performance.now();mesh.alpha=0;
    await new Promise((resolve,reject)=>{const tick=now=>{try{if(mesh.destroyed)return resolve();const progress=Math.min(1,(now-start)/650);mesh.alpha=alpha*progress;if(progress<1)requestAnimationFrame(tick);else resolve();}catch(error){reject(error);}};requestAnimationFrame(tick);});
  } catch(error) {console.warn(`${ID} | Summon animation`,error);}
  finally {if(mesh&&!mesh.destroyed&&alpha!==undefined)mesh.alpha=alpha;}
}
