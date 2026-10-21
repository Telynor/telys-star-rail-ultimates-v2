const limit=(value,min,max,fallback)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Number(value):fallback));

// Resource settings belong to a particular summon, never to its caster's kit.
export function normalizeSummonOptions(raw={},defaults={}) {
  const type=raw.resourceType==='counter'?'hp':raw.resourceType;
  const resourceType=['none','dots','percent','hp'].includes(type)?type:(defaults.resourceType??'none');
  const resourceMax=resourceType==='dots'?3:resourceType==='percent'?100:limit(raw.resourceMax,1,999999,defaults.resourceMax??3);
  return {resourceType:raw.showResource===false?'none':resourceType,resourceMax,
    resource:limit(raw.resource,0,resourceMax,defaults.resource??0),
    initiativeMode:raw.initiativeMode==='owner'?'owner':'own'};
}

export const spellSummonKey=(activity,profile)=>`${activity.item?.uuid??activity.item?.id}:${activity.id??'summon'}:${profile?._id??profile?.id??'default'}`;
export function spellSummonOptions(actor,activity,profile) {
  const key=spellSummonKey(activity,profile);
  const preferences=actor?.getFlag?.('telys-star-rail-ultimates','summonPreferences')??[];
  return {...normalizeSummonOptions(preferences.find(entry=>entry.key===key)),key,actorUuid:profile?.uuid??''};
}
