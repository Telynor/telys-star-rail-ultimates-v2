const ID = "telys-star-rail-ultimates";
export function storedNpcAllegiance(actor) {
  const value = actor?.getFlag?.(ID, "allegiance");
  return actor?.type === "npc" && ["ally", "enemy"].includes(value) ? value : null;
}

export function npcAllegiance(actor, token = null) {
  if (actor?.type !== "npc") return null;
  const saved = storedNpcAllegiance(actor);
  if (saved) return saved;
  const document = token?.document ?? token ?? actor.token ?? (actor.parent?.documentName === "Token" ? actor.parent : null);
  const disposition = Number(document?.disposition ?? actor.prototypeToken?.disposition);
  return disposition === Number(globalThis.CONST?.TOKEN_DISPOSITIONS?.FRIENDLY ?? 1) ? "ally" : "enemy";
}

export function npcToughnessEnabled(actor, enabled, token = null) {
  if (actor?.type !== "npc") return Boolean(enabled);
  if (npcAllegiance(actor, token) === "ally") return false;
  return storedNpcAllegiance(actor) === "enemy" || Boolean(enabled);
}

export function initiativeAlly(combatant) {
  const role = npcAllegiance(combatant?.actor, combatant?.token);
  if (role) return role === "ally";
  const disposition = Number(combatant?.token?.disposition);
  return Number.isFinite(disposition) ? disposition === Number(globalThis.CONST?.TOKEN_DISPOSITIONS?.FRIENDLY ?? 1) : combatant?.actor?.type === "character";
}
