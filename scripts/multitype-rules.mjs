// HSR Elements are independent of D&D5e damage types and resistances.
export const MODULE_ID = "telys-star-rail-ultimates";
export const multitypeMode = config => config?.multitypeMode === "changer" ? "changer" : "attacks";
export const isTypeChanger = config => Boolean(config?.multitypeEnabled) && multitypeMode(config) === "changer";
export const isMultitypeAttacks = config => Boolean(config?.multitypeEnabled) && multitypeMode(config) === "attacks";
const flag = (doc, key) => doc?.getFlag?.(MODULE_ID, key) ?? doc?.flags?.[MODULE_ID]?.[key];
const text = value => typeof value === "string" ? value.trim() : "";
const values = collection => Array.isArray(collection) ? collection : collection?.contents ?? (collection?.values ? [...collection.values()] : Object.values(collection ?? {}));
export {values as collectionValues};

export function attackSource(actor, source = {}) {
  const origin = source.origin ?? source.message ?? source;
  const dnd = origin.flags?.dnd5e ?? {};
  const subject = source.subject ?? source.activity ?? source.workflow?.activity;
  let associatedItem;
  try { associatedItem = origin.getAssociatedItem?.(); } catch (_) {}
  let item = source.item ?? source.workflow?.item ?? subject?.item
    ?? (subject?.documentName === "Item" ? subject : null)
    ?? (source.documentName === "Item" ? source : null)
    ?? associatedItem;
  const rawUuid = text(origin.system?.item?.uuid ?? dnd.item?.uuid ?? dnd.use?.itemUuid ?? dnd.roll?.itemUuid ?? source.itemUuid);
  const itemId = text(source.itemId ?? origin.system?.item?.id ?? dnd.item?.id ?? dnd.use?.itemId ?? dnd.roll?.itemId)
    || rawUuid.match(/(?:^|\.)Item\.([^.]+)/)?.[1];
  item ??= actor?.items?.get?.(itemId) ?? values(actor?.items).find(entry => entry.id === itemId);
  const activityId = text(source.activityId ?? subject?.id ?? source.workflow?.activity?.id
    ?? origin.system?.activity?.id ?? dnd.activity?.id ?? dnd.item?.activityId ?? dnd.roll?.activityId)
    || rawUuid.match(/\.Activity\.([^.]+)/)?.[1] || "";
  const activity = subject?.item ? subject : item?.system?.activities?.get?.(activityId)
    ?? values(item?.system?.activities).find(entry => entry.id === activityId);
  return {item, activity, activityId, itemUuid: item?.uuid ?? rawUuid};
}

export function storedAttackContext(source = {}) {
  const origin = source.origin ?? source.message ?? source;
  const direct = source.attackElement ?? flag(origin, "attackElement") ?? origin._source?.flags?.[MODULE_ID]?.attackElement;
  if (direct) return direct;
  const rolls = source.rolls ?? source.damageRolls ?? source.damageRollArray ?? origin.rolls ?? [source.damageRoll];
  return values(rolls).map(roll => roll?.options?.[MODULE_ID]?.attackElement).find(Boolean) ?? null;
}

// Order: saved roll snapshot, activity override, Item override, Actor Element.
// An empty or removed override inherits its parent without changing the Actor.
export function resolveAttackElement(actor, source = {}, {config = flag(actor, "ultimate") ?? {}, elements = null} = {}) {
  const known = id => Boolean(id) && (!Array.isArray(elements) || elements.some(element => element.id === id));
  const saved = storedAttackContext(source);
  if (saved && saved.actorUuid === actor?.uuid && (saved.elementId === "" || known(saved.elementId))) {
    return {actorUuid: actor.uuid, elementId: saved.elementId, itemUuid: text(saved.itemUuid),
      activityId: text(saved.activityId), mode: text(saved.mode), eventId: text(saved.eventId), workflowId: text(saved.workflowId)};
  }
  const {item, activityId, itemUuid} = attackSource(actor, source);
  const actorElement = text(config.elementId);
  let elementId = known(actorElement) ? actorElement : "";
  let inheritedFrom = "actor";
  const owner = item?.actor ?? (item?.parent?.documentName === "Actor" ? item.parent : null);
  const belongsToActor = !owner || owner.uuid === actor?.uuid;
  if (isMultitypeAttacks(config) && item && belongsToActor) {
    const itemElement = text(flag(item, "attackElementId"));
    const activityElement = text((flag(item, "activityElements") ?? {})[activityId]);
    if (known(itemElement)) { elementId = itemElement; inheritedFrom = "item"; }
    if (known(activityElement)) { elementId = activityElement; inheritedFrom = "activity"; }
  }
  return {actorUuid: actor?.uuid ?? "", elementId, itemUuid: text(itemUuid), activityId,
    mode: config.multitypeEnabled ? multitypeMode(config) : "standard", inheritedFrom};
}

export function attackElementPatch(item, activityId, elementId, elements = []) {
  const id = text(elementId);
  if (id && !elements.some(element => element.id === id)) throw new Error("Choose an Element from the Element Manager.");
  if (!activityId) return {[`flags.${MODULE_ID}.attackElementId`]: id};
  if (!values(item?.system?.activities).some(activity => activity.id === activityId)) throw new Error("This activity no longer exists on the Item.");
  return {[`flags.${MODULE_ID}.activityElements.${activityId}`]: id};
}
