const ID = "telys-star-rail-ultimates";
const prefixes = ["carouselImage", "enhancedCarouselImage"];
const defaults = {"":"", X:50, Y:50, Scale:100, Flip:false};
export const NPC_INITIATIVE_FIELDS = prefixes.flatMap(prefix => Object.keys(defaults).map(suffix => prefix + suffix));

// Synthetic Actors retain their own resources and allegiance. Only initiative
// artwork follows the world Actor, including tokens on other scenes.
export function npcInitiativeSource(actor, actors = globalThis.game?.actors) {
  if (actor?.type !== "npc") return actor;
  const token = actor.token ?? (actor.parent?.documentName === "Token" ? actor.parent : null);
  let source = actor.isToken || token ? actors?.get?.(token?.actorId ?? actor.id) ?? actor : actor;
  const seen = new Set();
  while (source?.type === "npc" && !seen.has(source)) {
    seen.add(source);
    const reference = source.getFlag?.(ID, "initiativePortraitSource");
    const id = /^Actor\.([^.]+)$/.exec(String(reference ?? ""))?.[1];
    const next = id && actors?.get?.(id);
    if (!next || next.type !== "npc" || seen.has(next)) break;
    source = next;
  }
  return source?.type === "npc" ? source : actor;
}

export function sharedNpcInitiativeConfig(actor, actors) {
  if (actor?.type !== "npc") return {};
  const source = npcInitiativeSource(actor, actors);
  if (source === actor) return {};
  const config = source?.getFlag?.(ID, "ultimate") ?? {}, shared = {};
  for (const prefix of prefixes) {
    // Preserve old token-only artwork until its source has a configured form.
    if (!Object.keys(defaults).some(suffix => Object.hasOwn(config, prefix + suffix))) continue;
    for (const [suffix, fallback] of Object.entries(defaults)) shared[prefix + suffix] = config[prefix + suffix] ?? fallback;
  }
  return shared;
}

const writes = new Map();
const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export async function saveNpcInitiativeConfig(actor, values, {actors = globalThis.game?.actors, isGM = globalThis.game?.user?.isGM, autosave = true} = {}) {
  if (!isGM) throw new Error("Only a GM can format NPC initiative portraits.");
  if (actor?.documentName !== "Actor" || actor.type !== "npc") throw new Error("Choose an NPC Actor.");
  const source = npcInitiativeSource(actor, actors), key = source.uuid;
  const fields = Object.fromEntries(NPC_INITIATIVE_FIELDS.filter(field => Object.hasOwn(values, field)).map(field => [field, values[field]]));
  if (!Object.keys(fields).length) return source;
  const job = (writes.get(key) ?? Promise.resolve()).catch(() => {}).then(async () => {
    const stored = source.getFlag(ID, "ultimate") ?? {}, patch = {};
    for (const prefix of prefixes) {
      if (!Object.keys(defaults).some(suffix => Object.hasOwn(fields, prefix + suffix))) continue;
      const merged = {...stored, ...fields};
      const scale = clamp(number(merged[prefix + "Scale"], 100), 50, 800), travel = Math.max(1050, scale * 1.5);
      const normalized = {"":String(merged[prefix] ?? ""), X:clamp(number(merged[prefix + "X"], 50), Math.floor(50 - travel), Math.ceil(50 + travel)), Y:clamp(number(merged[prefix + "Y"], 50), Math.floor(50 - travel), Math.ceil(50 + travel)), Scale:scale, Flip:Boolean(merged[prefix + "Flip"])};
      for (const [suffix, value] of Object.entries(normalized)) patch[`flags.${ID}.ultimate.${prefix}${suffix}`] = value;
    }
    // Actor duplication copies this reference, so future world-Actor copies
    // continue to use the same framing without grouping unrelated NPC names.
    patch[`flags.${ID}.initiativePortraitSource`] = source.uuid;
    await source.update(patch, {tsruAutosave:autosave, render:false});
    return source;
  });
  writes.set(key, job);
  try { return await job; }
  finally { if (writes.get(key) === job) writes.delete(key); }
}
