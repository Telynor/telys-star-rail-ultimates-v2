import {normalizeUnlockingItem,itemIdentityKeys,normalizePartyShadow} from './party-setup-rules.mjs';
export const OUTFIT_ID='telys-star-rail-ultimates';
export const ART_SLOTS=Object.freeze({phone:'Phone pose',team1:'Team lineup · position 1',team2:'Team lineup · position 2',team3:'Team lineup · position 3',team4:'Team lineup · position 4',team5:'Team lineup · optional position 5',splash:'Splash art',token:'Token art',portrait:'Portrait art',hud:'Combat HUD portrait',boss:'Boss HUD portrait',initiative:'Initiative portrait',messenger:'Messenger portrait'});
export const ICON_SLOTS=Object.freeze({skill:'Skill',ultimate:'Ultimate',talent:'Talent',technique:'Technique'});
export const isOutfitInventoryItem=item=>['weapon','equipment','consumable','tool','loot','container','backpack'].includes(item?.type);
const text=value=>typeof value==='string'?value.trim():'';
const clamp=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
export const safeOutfitImage=value=>/^(?:javascript|vbscript|data(?!:image\/))\s*:/i.test(text(value))?'':text(value);
export function outfitArtBounds(slot,scalePercent=100){if(slot==='initiative'){const scale=clamp(scalePercent,50,800,100),travel=Math.max(1050,scale*1.5);return {min:Math.floor(50-travel),max:Math.ceil(50+travel),minScale:50,maxScale:800};}return {min:['phone','initiative','team5'].includes(slot)?-100:0,max:['phone','initiative','team5'].includes(slot)?200:100,minScale:['hud','messenger','initiative'].includes(slot)?50:25,maxScale:slot==='hud'?300:slot==='messenger'?400:500};}
export function normalizeArt(value={},slot){const b=slot?outfitArtBounds(slot,value.scale):{min:-100,max:200,minScale:25,maxScale:500};return {image:safeOutfitImage(value.image),x:clamp(value.x,b.min,b.max,50),y:clamp(value.y,b.min,b.max,50),scale:clamp(value.scale,b.minScale,b.maxScale,100),flip:value.flip===true,...(/^team[1-4]$/.test(slot??'')&&value.shadow?{shadow:normalizePartyShadow(value.shadow)}:{})};}
export function normalizeForm(value={}){return {art:Object.fromEntries(Object.keys(ART_SLOTS).map(key=>[key,normalizeArt(value.art?.[key],key)])),icons:Object.fromEntries(Object.keys(ICON_SLOTS).map(key=>[key,{custom:value.icons?.[key]?.custom===true,image:safeOutfitImage(value.icons?.[key]?.image)}]))};}
export function normalizeOutfit(value={}){return {id:text(value.id),name:text(value.name).slice(0,80)||'New outfit',actorIds:[...new Set((Array.isArray(value.actorIds)?value.actorIds:[]).map(text).filter(Boolean))],unlockingItem:normalizeUnlockingItem(value.unlockingItem),profiles:(Array.isArray(value.profiles)?value.profiles:[]).filter(p=>p&&text(p.actorId)&&text(p.pathKey)).map(p=>({actorId:text(p.actorId),pathKey:text(p.pathKey),normal:normalizeForm(p.normal),enhanced:normalizeForm(p.enhanced)}))};}
export function normalizeOutfitLibrary(value={}){return {schema:1,revision:Math.max(0,Math.floor(Number(value.revision)||0)),outfits:(Array.isArray(value.outfits)?value.outfits:[]).map(normalizeOutfit).filter(o=>o.id)};}
export const outfitState=actor=>{const data=actor?.getFlag?.(OUTFIT_ID,'outfits')??{};return {revision:Math.max(0,Math.floor(Number(data.revision)||0)),selections:{...(data.selections??{})},appearance:data.appearance??null};};
export function outfitPaths(actor,{paths=[]}={}){
  const catalog=actor?.getFlag?.(OUTFIT_ID,'pathChanging')??{},current=actor?.getFlag?.(OUTFIT_ID,'ultimate')??{},original=catalog.profiles?.find(p=>p.original);
  const profiles=catalog.profiles?.length?catalog.profiles:[{id:'',original:true,name:paths.find(p=>p.id===current.pathId)?.name||'Current Path'}];
  return profiles.map(profile=>{const active=profile.id===catalog.activeId||!catalog.profiles?.length,config=active?current:profile.snapshot?.flags?.[OUTFIT_ID]?.ultimate??{};return {key:profile.original||profile===original?'original':profile.id,name:profile.name,active,enabled:profile.enabled!==false,config,flags:active?actor.flags?.[OUTFIT_ID]??{}:profile.snapshot?.flags?.[OUTFIT_ID]??{},img:active?outfitBaseAppearance(actor).img:profile.snapshot?.img||actor.img,texture:active?outfitBaseAppearance(actor).texture:profile.snapshot?.token?.texture??{}};});
}
export const activeOutfitPath=actor=>outfitPaths(actor).find(p=>p.active)?.key||'original';
export const normalizeOutfitTexture=value=>({scaleX:1,scaleY:1,anchorX:.5,anchorY:.5,...structuredClone(value??{})});
export function outfitBaseAppearance(actor){const saved=outfitState(actor).appearance;return saved&&saved.pathKey===activeOutfitPathRaw(actor)?{img:saved.img,texture:normalizeOutfitTexture(saved.texture)}:{img:actor?.img||'',texture:normalizeOutfitTexture(actor?.prototypeToken?.texture?.toObject?.()??actor?.prototypeToken?.texture)};}
function activeOutfitPathRaw(actor){const c=actor?.getFlag?.(OUTFIT_ID,'pathChanging')??{};return c.profiles?.find(p=>p.id===c.activeId)?.original?'original':c.activeId||'original';}
export function outfitAvailability(outfit,actor,pathKey=activeOutfitPathRaw(actor)){
  const assigned=outfit.actorIds.includes(actor?.id),profile=outfit.profiles.find(p=>p.actorId===actor?.id&&p.pathKey===pathKey)??outfit.profiles.find(p=>p.actorId===actor?.id&&p.pathKey==='*'),item=outfit.unlockingItem;
  const unlocked=!item||Array.from(actor?.items??[]).some(owned=>isOutfitInventoryItem(owned)&&(owned.system?.quantity===undefined||Number(owned.system.quantity)>0)&&itemIdentityKeys({...owned.toObject?.(),...owned,uuid:owned.uuid}).some(key=>item.keys.includes(key)));
  return {assigned,profile,unlocked,available:assigned&&Boolean(profile)&&unlocked,reason:!assigned?'Not assigned to this character':!profile?'No profile for this Path':!unlocked?`Requires ${item.name} in this character’s inventory`:''};
}
export function selectedOutfit(actor,library){const pathKey=activeOutfitPathRaw(actor),id=outfitState(actor).selections['*']||outfitState(actor).selections[pathKey],outfit=normalizeOutfitLibrary(library).outfits.find(o=>o.id===id),access=outfit&&outfitAvailability(outfit,actor,pathKey);return access?.available?{outfit,profile:access.profile,pathKey}:null;}
const artFields={boss:['bossHudPortrait','bossHudPortrait'],splash:['splashImage','splash'],hud:['combatHudPortrait','combatHudPortrait'],initiative:['carouselImage','carouselImage'],messenger:['messagingPortrait','messagingPortrait']};
const iconFields={skill:'skillButtonImage',ultimate:'ultimateButtonImage',talent:'talentIcon',technique:'techniqueButtonImage'};
const enhancedFields={splash:['enhancedSplashImage','enhancedSplash'],hud:['enhancedHudPortrait','enhancedHudPortrait'],initiative:['enhancedCarouselImage','enhancedCarouselImage']};
const enhancedIcons={skill:'enhancedSkillButtonImage',ultimate:'enhancedUltimateButtonImage',talent:'enhancedTalentIcon',technique:'enhancedTechniqueButtonImage'};
export function outfitConfig(actor,base={},library={}){
  const selected=selectedOutfit(actor,library);if(!selected)return {...base};
  const config={...base},profile=selected.profile;
  const apply=(form,fields,icons)=>{for(const [slot,[field,prefix]]of Object.entries(fields)){const art=form.art[slot];if(!art.image)continue;config[field]=art.image;for(const key of ['x','y','scale','flip'])config[prefix+key[0].toUpperCase()+key.slice(1)]=art[key];}for(const [slot,field]of Object.entries(icons))if(form.icons[slot].custom&&form.icons[slot].image)config[field]=form.icons[slot].image;};
  apply(profile.normal,artFields,iconFields);
  if(base.enhancedStanceEnabled){for(const [slot,field]of Object.entries(enhancedIcons))config[field]=base[field]||base[iconFields[slot]]||'';apply(profile.enhanced,enhancedFields,enhancedIcons);if(base.enhancedStanceActive){const art=profile.enhanced.art.messenger;if(art.image){config.messagingPortrait=art.image;for(const key of ['x','y','scale'])config['messagingPortrait'+key[0].toUpperCase()+key.slice(1)]=art[key];}}}
  return config;
}
export function outfitArt(actor,slot,library={},base={}){const selected=selectedOutfit(actor,library);if(!selected)return null;const enhanced=base.enhancedStanceEnabled&&base.enhancedStanceActive,normal=selected.profile.normal.art[slot],advanced=selected.profile.enhanced.art[slot];return enhanced&&advanced.image?advanced:normal.image?normal:null;}
export function outfitPhonePose(actor,pose,library={}){return outfitArt(actor,'phone',library,actor?.getFlag?.(OUTFIT_ID,'ultimate')??{})??pose;}
export function outfitTexture(base,art){if(!art?.image)return normalizeOutfitTexture(base);return {...normalizeOutfitTexture(base),src:art.image,scaleX:art.scale/100*(art.flip?-1:1),scaleY:art.scale/100,anchorX:clamp(1-art.x/100,0,1,.5),anchorY:clamp(1-art.y/100,0,1,.5)};}
export function outfitPortraitStyle(art){const size=10000/art.scale,left=(100-size)*art.x/100,top=(100-size)*art.y/100;return {objectFit:'cover',objectPosition:`${art.x}% ${art.y}%`,objectViewBox:`inset(${top}% ${100-size-left}% ${100-size-top}% ${left}%)`,scale:art.flip?'-1 1':'1 1'};}
