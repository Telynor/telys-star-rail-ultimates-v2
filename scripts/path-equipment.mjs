import {PATH_MODULE as ID,documentData,isSharedInventory,identityKeys,rewriteBuildReferences} from './path-change-rules.mjs';
import {lightConeAttunementUpdate} from './light-cone-equipment.mjs';
const options=()=>({render:false,keepId:true,tsruPathChange:true,tsruLightConeSelection:true});

// Import only the selected cone into the live shared inventory. Subsequent
// imports reuse its provenance; charges, upgrades and deletions stay shared.
export async function importPathLightCone(source,actor,createdIds=[]){
  const sourceItem=source.items?.get?.(source.getFlag(ID,'selectedLightConeItemId'));
  if(!sourceItem||!isSharedInventory(sourceItem))return '';
  const keys=new Set(identityKeys({...documentData(sourceItem),uuid:sourceItem.uuid}));
  let matches=Array.from(actor.items).filter(isSharedInventory).filter(item=>identityKeys({...documentData(item),uuid:item.uuid}).some(key=>keys.has(key)));
  const exact=matches.filter(item=>item.getFlag?.(ID,'pathLightConeSource')===sourceItem.uuid);
  if(exact.length===1)matches=exact;
  if(matches.length>1){const selected=matches.find(item=>item.id===actor.getFlag(ID,'selectedLightConeItemId'));if(selected)matches=[selected];else throw Error('Several shared Light Cones match '+sourceItem.name+'. Equip the desired copy on the destination character before importing.');}
  if(matches.length)return matches[0].id;
  const data=documentData(sourceItem),id=foundry.utils.randomID();
  const rewritten=rewriteBuildReferences(data,{sourceUuid:source.uuid,targetUuid:actor.uuid,itemIds:new Map([[sourceItem.id,id]])});
  rewritten._id=id;delete rewritten.ownership;for(const effect of rewritten.effects??[])delete effect.ownership;
  rewritten.flags??={};rewritten.flags[ID]??={};rewritten.flags[ID].pathLightConeSource=sourceItem.uuid;
  delete rewritten.flags[ID].lightConeAttunementState;
  if(Object.hasOwn(rewritten.system??{},'quantity'))rewritten.system.quantity=1;
  if(Object.hasOwn(rewritten.system??{},'container'))rewritten.system.container=null;
  if(Object.hasOwn(rewritten.system??{},'equipped'))rewritten.system.equipped=false;
  if(Object.hasOwn(rewritten.system??{},'attuned'))rewritten.system.attuned=false;
  createdIds.push(id);
  const created=await actor.createEmbeddedDocuments('Item',[rewritten],options());
  if(created.length!==1||!actor.items.get(id))throw Error('The source Light Cone could not be imported.');
  return id;
}

export async function applyPathLightCone(actor,selection){
  // An unavailable legacy source can retain the current selection.
  if(!selection)return;
  const wanted=actor.items.get(selection.itemId),next=wanted&&isSharedInventory(wanted)?wanted:null;
  const current=actor.getFlag(ID,'selectedLightConeItemId');
  for(const item of actor.items)if(item.id!==next?.id&&(item.id===current||item.getFlag?.(ID,'lightConeAttunementState'))){
    const patch=lightConeAttunementUpdate(item,false);
    if(Object.keys(patch).length)await item.update(patch,options());
  }
  if(next){const patch=lightConeAttunementUpdate(next,true);if(Object.keys(patch).length)await next.update(patch,options());}
  await actor.update({[`flags.${ID}.selectedLightConeItemId`]:next?.id??''},options());
}
