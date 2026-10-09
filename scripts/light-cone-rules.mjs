export const DICE = [4, 6, 8, 10, 12],
  number = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);
export const dieStep = (base, steps) =>
  DICE[
    Math.max(
      0,
      Math.min(4, DICE.indexOf(Number(base)) + Math.floor(number(steps))),
    )
  ];
export const hpRatio = (a) =>
  number(a?.system?.attributes?.hp?.value) /
  Math.max(1, number(a?.system?.attributes?.hp?.max));
export function eligibleCone(actor, config, combat) {
  const item = actor?.items?.get(
      actor.getFlag?.("telys-star-rail-ultimates", "selectedLightConeItemId"),
    ),
    c = item?.getFlag?.("telys-star-rail-ultimates", "lightCone");
  if (
    !item ||
    !c?.enabled ||
    !c.catalogId ||
    !(
      [c.pathId].includes(config?.pathId) ||
      globalThis.game?.settings
        ?.get("telys-star-rail-ultimates", "paths")
        ?.some(
          (p) => p.id === config?.pathId && p.name?.toLowerCase() === c.pathId,
        )
    )
  )
    return null;
  if (item.type !== "loot" && item.system?.equipped === false) return null;
  return {
    ...c,
    item,
    id: Number(c.draftId),
    inCombat: Boolean(
      combat?.started &&
        combat.combatants.some((x) => x.actor?.uuid === actor.uuid),
    ),
  };
}
const bases = {
  1: { crit: 1 },
  4: { damage: 2 },
  6: { critDamage: 4 },
  7: { crit: 1 },
  9: { breakEffect: 2 },
  10: { critDamage: 4 },
  11: { ac: 1 },
  12: { critDamage: 4 },
  14: { critDamage: 4 },
  15: { critDamage: 4 },
  16: { effectHit: 1 },
  17: { crit: 1 },
  18: { crit: 1 },
  24: { ac: 1 },
  26: { crit: 1 },
  27: { critDamage: 4 },
  31: { ac: 1 },
  32: { critDamage: 4 },
  34: { save: 1 },
  35: { speed: 5 },
  37: { critDamage: 4 },
  38: { attack: 2 },
  39: { attack: 2 },
  40: { attack: 2 },
  41: { attack: 1 },
  42: { effectHit: 1 },
  43: { breakEffect: 2 },
  44: { attack: 1 },
  46: { maxHP: 8, incomingHealing: 2 },
  50: { critDamage: 2 },
  51: { attack: 1 },
  52: { attack: 1 },
  53: { attack: 1 },
  55: { maxHP: 5 },
  59: { critDamage: 4 },
  60: { crit: 1 },
  61: { critDamage: 4 },
  65: { effectHit: 2 },
  66: { breakEffect: 2 },
  67: { ac: 2 },
  68: { crit: 1 },
  70: { shield: 3 },
  71: { reduction: 1 },
  72: { speed: 10 },
  74: {},
  75: { speed: 10 },
  76: { breakEffect: 2 },
  78: { maxHP: 8 },
  81: { breakEffect: 2 },
  82: { speed: 10 },
  84: { ac: 2, effectHit: 1 },
  86: {},
  88: { breakEffect: 3 },
  89: { regen: 2 },
  91: { maxHP: 5 },
  92: { breakEffect: 3 },
  93: { attack: 1 },
  95: { attack: 1 },
  97: { breakEffect: 3 },
  99: { damage: 2 },
  100: { save: 1 },
  103: { attack: 1 },
  104: { regen: 2 },
  107: { effectHit: 2 },
  108: { maxHP: 8 },
  111: { crit: 1 },
  115: { breakEffect: 3 },
  116: { breakEffect: 3 },
  117: { critDamage: 2 },
  119: { breakEffect: 2 },
  120: { healing: 2 },
  122: { maxHP: 8, regen: 2 },
  123: { critDamage: 4 },
  125: { breakEffect: 3 },
  126: { attack: 2 },
  129: { crit: 1 },
  131: { save: 1 },
  133: { attack: 1 },
  134: { crit: 1 },
  135: { critDamage: 3 },
  136: { attack: 1 },
  137: { attack: 1 },
  138: { crit: 1 },
  140: { damage: 1 },
  141: { maxHP: 5 },
  142: { crit: 1, maxHP: 8 },
  143: { ac: 1 },
  144: { speed: 10 },
  145: { effectHit: 2 },
  146: { attack: 2 },
  147: { speed: 10, damage: 2 },
  148: { maxHP: 8, healing: 2 },
  149: { speed: 10 },
  150: { maxHP: 8 },
  152: { crit: 1 },
  153: { critDamage: 2 },
  154: { ac: 1 },
  155: { attack: 1 },
  156: { critDamage: 4, regen: 2 },
  157: { healing: 2 },
  158: { critDamage: 2 },
  160: { maxHP: 5 },
  163: { speed: 10 },
  164: { breakEffect: 2 },
  165: { speed: 10 },
  166: { breakEffect: 3 },
  167: { effectHit: 2 },
  168: { attack: 1 },
  169: { crit: 1 },
  170: { crit: 1 },
};
export function passive(id, x = {}) {
  const o = { ...bases[id] },
    add = (k, n) => (o[k] = (o[k] ?? 0) + n),
    s = x.stacks ?? {},
    b = x.buffs ?? {},
    cat = x.category,
    hp = x.hp ?? 1,
    t = x.targetHP ?? 1,
    d = x.debuffs ?? 0,
    max = x.maxEnergy ?? 100;
  if (id === 171) { add("crit", Math.max(0, number(x.elationElements))); o.critFloor = 2; }
  const basic = cat === "basic" || cat === "enhancedBasic",
    skill = cat === "skill",
    ult = cat === "ultimate",
    fo = cat === "followup";
  if (
    [1, 7, 15, 117].includes(id) &&
    ((id === 1 && (ult || fo)) ||
      (id === 7 && (skill || ult)) ||
      (id === 15 && (skill || ult)) ||
      (id === 117 && (skill || fo)))
  )
    add("damage", 2);
  if (id === 22 && (basic || skill)) add("damage", 1);
  if (id === 4 && t >= hp) add("damage", 2);
  if (id === 11 && hp < 0.5) add("ac", 1);
  if (id === 12 && ult) add("damage", Math.min(3, Math.floor(max / 20)));
  if (id === 13 && (x.turns ?? 0) < 3) add("crit", 1);
  if (id === 14) {
    add("critDamage", Math.min(3, d));
    if (fo && b.disputation) add("damage", 2);
  }
  if (id === 15 && fo && s.somnus) add("damage", 3);
  if (id === 17 && (x.reducedAC || x.slowed)) add("critDamage", 3);
  if (id === 24) add("damage", Math.min(3, x.shielded ?? 0));
  if (id === 25 && (skill || ult)) add("healing", 2);
  if (id === 26 && t < 0.5) add("crit", 1);
  if (id === 27 && fo) add("damage", 2 * (s.firedance ?? 0));
  if ([30, 79].includes(id) && ult) add("damage", 2);
  if (id === 34)
    add(
      "damage",
      Math.min(3, Math.max(0, Math.floor(((x.ac ?? 10) - 10) / 2))),
    );

  if (id === 41) add("attack", s.calculus ?? 0);
  if (id === 43 && (x.shock || x.windShear)) add("damage", 2);
  if (id === 44) add("critDamage", s.goodFortune ?? 0);
  if (id === 54) add("damage", Math.min(3, d));
  if (id === 56 && basic && s.shadow) add("damage", 2);
  if (id === 57) add("damage", 1);
  if (id === 59)
    add("damage", (s.eclipse ?? 0) + ((s.eclipse ?? 0) >= 3 ? 2 : 0));
  if (id === 60 && ult) add("damage", 2 * (s.luminflux ?? 0));
  if (id === 63) {
    if (d) add("damage", 2);
    if (skill) {
      add("attack", 1);
      add("effectHit", 1);
    }
  }
  if (id === 64) {
    add("crit", 1);
    const n = Math.min(3, Math.max(0, Math.floor(((x.speed ?? 30) - 30) / 10)));
    if (basic || skill) add("damage", n);
    if (ult) add("critDamage", n);
  }
  if (id === 65 && d >= 3) add("crit", 1);
  if (id === 69) {
    add("damage", s.showtime ?? 0);
    if ((x.effectHit ?? 0) >= 3) add("attack", 1);
  }
  if (id === 73 && x.implantedWeakness) add("damage", 2);
  if (id === 74 && (x.punchline ?? 0) >= 10) add("critDamage", 2);
  if (id === 77 && x.slowed) add("damage", 2);
  if (id === 86 && cat === "elation") add("damage", 2);
  if (id === 87 && hp < 0.8) add("crit", 1);
  if (id === 90) add("attack", Math.min(3, x.enemies ?? 0));
  if (id === 94) add("attack", s.aeon ?? 0);
  if (id === 95 && (x.enemies ?? 99) <= 2) add("crit", 1);
  if (id === 99) add("speed", 5 * (s.erodeSpeed ?? 0));
  if (id === 100) add("healing", Math.min(3, x.itemSaveBonus ?? 1));
  if (id === 104 && ult) add("healing", 2);
  if (id === 107) add("attack", s.prophet ?? 0);
  if (id === 109) add("damage", s.reminiscence ?? 0);
  if (id === 113 && !b.riverSuppressed) {
    add("speed", 5);
    add("damage", 1);
  }
  if (id === 115 && (x.breakBonus ?? 0) >= 3) add("speed", 10);
  if (id === 121 && t > 0.5) add("damage", 2);
  if (id === 124 && x.aha && cat === "elation") add("damage", 2);
  if (id === 127 && (basic || skill))
    add("damage", (x.energy ?? 0) >= max ? 2 : 1);
  if (id === 129 && x.sprite) add("damage", 2);
  if (id === 130 && s.swordTarget === x.targetUuid)
    add("damage", s.swordplay ?? 0);
  if (id === 131 && x.hasShield) add("reduction", 1);
  if (id === 132 && fo) add("damage", t < 0.5 ? 4 : 2);
  if (id === 136) add("attack", s.victual ?? 0);
  if (id === 137) add("damage", Math.min(3, x.weaknesses ?? 0));
  if (id === 138) add("attack", s.hell ?? 0);
  if (id === 139) add("attack", s.moles ?? 0);
  if (id === 140) add("attack", s.breakfast ?? 0);
  if (id === 142 && s.unreachable) add("damage", 3);
  if (id === 143 && ult)
    add(
      "damage",
      Math.min(3, Math.max(0, Math.floor(((x.ac ?? 10) - 10) / 2))),
    );
  if (id === 149) {
    add("critDamage", s.gold ?? 0);
    if ((s.gold ?? 0) >= 6 && basic) add("damage", 2);
  }
  if (id === 151) add("damage", Math.min(3, Math.floor(max / 20)));
  if (id === 152 && cat === "elation") add("damage", s.luck ?? 0);
  if (id === 156 && max >= 60) add("regen", 1);
  if (id === 159 && (x.turns ?? 0) < 3) add("effectHit", 1);
  if (id === 163 && cat === "elation") add("damage", 2);
  if (id === 168 && (x.burn || x.bleed)) add("damage", 2);
  if (id === 169 && fo) add("damage", 2);
  if (id === 170 && fo)
    add("damage", Math.min(3, Math.floor((x.critDamage ?? 0) / 3)));
  if (id === 32 && cat === "elation") add("damage", s.elationCharge ?? 0);
  for (const v of Object.values(b))
    for (const [k, n] of Object.entries(v.stats ?? {})) add(k, n);
  return o;
}
export function dotModifiers(id, type, x = {}) {
  let steps = 0,
    turns = 0;
  if (id === 42) steps++;
  if (id === 43 && ["shock", "windShear"].includes(type)) turns++;
  if (id === 54 && (x.debuffs ?? 0) >= 2) steps++;
  if (id === 107 && (x.stacks?.prophet ?? 0) >= 4) steps++;
  if (id === 125 && x.buffs?.solitary) turns++;
  if (id === 168 && ["burn", "bleed"].includes(type)) turns++;
  return { steps, turns };
}
