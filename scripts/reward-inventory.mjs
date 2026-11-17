const ID = "telys-star-rail-ultimates";
const SOURCES = [ID, "telys-battle-pass"];

function canonicalUuid(uuid) {
  return typeof uuid === "string"
    ? uuid.replace(/^(Compendium\.[^.]+\.[^.]+)\.([^.]+)$/, "$1.Item.$2")
    : "";
}

function sourceKeys(item) {
  return new Set([
    item.uuid, ...SOURCES.map(namespace => item.getFlag?.(namespace, "sourceUuid") ?? item.flags?.[namespace]?.sourceUuid), item._stats?.compendiumSource,
    item._stats?.duplicateSource, item.flags?.core?.sourceId
  ].map(canonicalUuid).filter(Boolean));
}

function itemDefinition(item) {
  const data = item.toObject();
  delete data._id;
  delete data._stats;
  delete data.sort;
  delete data.folder;
  delete data.ownership;
  if (data.system) delete data.system.quantity;
  for (const namespace of SOURCES) {
    if (!data.flags?.[namespace]) continue;
    delete data.flags[namespace].sourceUuid;
    if (!Object.keys(data.flags[namespace]).length) delete data.flags[namespace];
  }
  if (data.flags && !Object.keys(data.flags).length) delete data.flags;
  const normalize = value => {
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])]));
    }
    return value;
  };
  return JSON.stringify(normalize(data));
}

async function grantReward(actor, source, quantity) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error("Reward quantity must be a positive whole number.");
  const canStack = source.system?.quantity != null && Number.isFinite(Number(source.system.quantity));
  const keys = sourceKeys(source);
  const definition = canStack ? itemDefinition(source) : null;
  const stack = canStack && actor.items.find(item => {
    if (item.type !== source.type || (item.system?.quantity == null || !Number.isFinite(Number(item.system.quantity)))) return false;
    if ([...sourceKeys(item)].some(key => keys.has(key))) return true;
    // Older mission awards were copied without recording their source UUID.
    return item.name === source.name && itemDefinition(item) === definition;
  });
  if (stack) {
    const updated = await stack.update({"system.quantity": Number(stack.system.quantity) + quantity});
    if (!updated) throw new Error(`Could not add ${source.name} to ${actor.name}'s stack.`);
    return;
  }

  const data = source.toObject();
  delete data._id;
  data.flags ??= {};
  data.flags[ID] = {...data.flags[ID], sourceUuid: source.uuid};
  if (canStack) data.system.quantity = quantity;
  const copies = canStack ? [data] : Array.from({length: quantity}, () => structuredClone(data));
  const created = await actor.createEmbeddedDocuments("Item", copies);
  if (created?.length !== copies.length) throw new Error(`Could not grant every copy of ${source.name} to ${actor.name}.`);
}

// Both modules use the same actor queue when they distribute rewards together.
const QUEUE_KEY = Symbol.for("telys.inventory-rewards");
export function grantInventoryReward(actor, source, quantity) {
  const queues = globalThis[QUEUE_KEY] ??= new WeakMap();
  const prior = queues.get(actor) ?? Promise.resolve();
  const next = prior.then(() => grantReward(actor, source, quantity));
  const settled = next.catch(() => {});
  queues.set(actor, settled);
  settled.then(() => { if (queues.get(actor) === settled) queues.delete(actor); });
  return next;
}
