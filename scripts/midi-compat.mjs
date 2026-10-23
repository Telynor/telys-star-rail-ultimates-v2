// Midi-QOL 14.0 (D&D5e 5) and 14.6 (D&D5e 6) integration boundaries.
// 14.6 preItemRoll supplies {activity, config:{workflow}}, and stores
// workflows by chat-message UUID. Completed workflows retain RollComplete.
export function midiWorkflow(source, actor=null, env=globalThis) {
  const matches=w=>w&&(!actor||w.actor?.uuid===actor.uuid);
  const direct=source?.workflow??source?.config?.workflow??source?.usage?.workflow;
  if(matches(direct))return direct;
  if(source?.actor&&(source.item||source.activity||source.targets||source.damageRolls)&&matches(source))return source;
  const origin=source?.origin??source?.message??source;
  const flags=origin?.flags?.["midi-qol"]??{};
  const api=env.MidiQOL?.Workflow;
  for(const id of [flags.workflowId,flags.workflowUuid,origin?.uuid,origin?.id]){
    if(!id)continue;
    try{const w=api?.getWorkflow?.(id);if(matches(w))return w;}catch{}
  }
  const activity=source?.activity??source?.subject;
  const activityUuid=activity?.uuid??origin?.system?.activity?.uuid;
  if(activityUuid){try{const w=api?.getWorkflowByActivityUuid?.(activityUuid);if(matches(w))return w;}catch{}}
  const itemUuid=source?.item?.uuid??activity?.item?.uuid??origin?.system?.item?.uuid??flags.itemUuid;
  if(itemUuid){try{const w=api?.getWorkflow?.(itemUuid);if(matches(w))return w;}catch{}}
  return null;
}

export function midiDamageRolls(workflow) {
  const rolls=[];
  for(const [plural,singular]of [["damageRolls","damageRoll"],["otherDamageRolls","otherDamageRoll"],["bonusDamageRolls","bonusDamageRoll"]]){
    const list=workflow?.[plural];
    if(Array.isArray(list)&&list.length)rolls.push(...list);
    else if(workflow?.[singular])rolls.push(workflow[singular]);
  }
  if(!rolls.length&&Array.isArray(workflow?.damageRollArray))rolls.push(...workflow.damageRollArray);
  return [...new Set(rolls.filter(r=>r&&typeof r==="object"))];
}
