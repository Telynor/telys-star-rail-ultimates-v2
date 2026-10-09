import {
  number,
  hpRatio,
  eligibleCone,
  passive,
  dotModifiers,
  dieStep,
  DICE,
} from "./light-cone-rules.mjs";
const ID = "telys-star-rail-ultimates",
  FLAG = "lightConeRuntime";
let api,
  catalog = [],
  queue = Promise.resolve();
const cfg = (a) => api?.getConfig(a) ?? a?.getFlag(ID, "ultimate") ?? {};
// Use the same first-active-GM authority as the combat module. Sorting user
// IDs here can elect a different GM and discard its forwarded combat events.
const auth = () =>
  Boolean(game.user?.isGM && game.users.find((u) => u.active && u.isGM)?.id === game.user.id);
const enqueue = (f) => {
  queue = queue.then(f).catch((e) => {
    console.error(ID + " | Light Cones", e);
    ui.notifications.error("Light Cone automation failed: " + e.message);
  });
  return queue;
};
const esc = (x) => foundry.utils.escapeHTML(String(x ?? "")),
  clone = (x) => foundry.utils.deepClone(x);
const cone = (a) => eligibleCone(a, cfg(a), game.combat);
const combatActors = () => [
  ...new Map(
    (game.combat?.combatants ?? [])
      .filter(
        (c) =>
          !c.getFlag(ID, "temporaryUltimate") &&
          !c.getFlag(ID, "actionAdvance"),
      )
      .map((c) => [c.actor?.uuid, c.actor])
      .filter((x) => x[1]),
  ).values(),
];
const friends = (a) => {
  const c = game.combat?.combatants.find((c) => c.actor?.uuid === a.uuid),
    side = c?.token?.disposition;
  return combatActors().filter(
    (b) =>
      hpRatio(b) > 0 &&
      (side === undefined
        ? b.type === a.type
        : game.combat.combatants.find((c) => c.actor?.uuid === b.uuid)?.token
            ?.disposition === side),
  );
};
const party = (a) => friends(a).filter((b) => cfg(b).mainParty);
const runtime = (a) => {
  const s = clone(a?.getFlag(ID, FLAG) ?? {});
  return s.combatId === game.combat?.id
    ? s
    : {
        combatId: game.combat?.id,
        turns: 0,
        stacks: {},
        buffs: {},
        once: {},
        marks: {},
        dots: [],
      };
};
const marks = (a) =>
  Object.values(runtime(a).marks ?? {}).filter((m) => m.remaining > 0);
const tags = (a) =>
  new Set([
    ...(runtime(a).dots ?? [])
      .filter((d) => d.remaining > 0)
      .map((d) => d.type),
    ...marks(a)
      .filter(
        (m) =>
          !m.source ||
          combatActors().some(
            (b) => b.uuid === m.source && cone(b)?.catalogId === m.cone,
          ),
      )
      .map((m) => m.tag),
    ...(a?.effects ?? [])
      .filter((e) => !e.disabled)
      .flatMap((e) => e.getFlag(ID, "lightConeTags") ?? []),
  ]);
const has = (a, tag) => tags(a).has(tag);
const sprite = (a) =>
  combatActors().find((b) => b.getFlag(ID, "lightConeOwner") === a.uuid);
function context(a, target = null, event = {}) {
  const s = runtime(a),
    t = target ?? a,
    ts = tags(t),
    c = cfg(a);
  return {
    elationElements: new Set(friends(a).filter(isElationActor).map(b => cfg(b).elementId).filter(Boolean)).size,
    hp: hpRatio(a),
    targetHP: hpRatio(t),
    energy: c.current,
    maxEnergy: c.max,
    ac: number(a.system?.attributes?.ac?.value),
    speed: number(a.system?.attributes?.movement?.walk),
    turns: s.turns,
    stacks: s.stacks,
    buffs: s.buffs,
    category: event.category,
    hasShield: number(a.system?.attributes?.hp?.temp) > 0,
    shielded: friends(a).filter(
      (b) => number(b.system?.attributes?.hp?.temp) > 0,
    ).length,
    enemies: combatActors().filter(
      (b) => !friends(a).some((f) => f.uuid === b.uuid) && hpRatio(b) > 0,
    ).length,
    debuffs: ts.size,
    reducedAC: ts.has("reducedAC"),
    slowed: ts.has("slowed"),
    shock: ts.has("shock"),
    burn: ts.has("burn"),
    bleed: ts.has("bleed"),
    windShear: ts.has("windShear"),
    implantedWeakness: ts.has("implantedWeakness"),
    ownMark: marks(t).some((m) => m.source === a.uuid),
    targetUuid: t.uuid,
    weaknesses: (t.getFlag(ID, "toughness")?.weaknesses ?? []).length,
    sprite: Boolean(sprite(a)),
    punchline: number(game.settings.get(ID, "punchline")),
    aha: Boolean(
      game.combat?.combatant?.getFlag(ID, "ahaInstantCombatant") ||
        game.combat?.combatant?.getFlag(ID, "elationActionCombatant"),
    ),
    effectHit: number(a._lightConeStats?.effectHit),
    breakBonus:
      number(a._lightConeStats?.breakEffect) +
      number(a._planarBonuses?.breakEffect),
    critDamage:
      number(a._lightConeStats?.critDamage) +
      number(a._planarBonuses?.critDamageBonus),
  };
}
function liveBuffs(a) {
  const s = runtime(a);
  return Object.fromEntries(
    Object.entries(s.buffs ?? {}).filter(([, b]) => {
      const source = combatActors().find((x) => x.uuid === b.source),
        c = source && cone(source);
      return (
        c?.inCombat &&
        c.catalogId === b.cone &&
        hpRatio(source) > 0 &&
        b.remaining > 0
      );
    }),
  );
}
export function snapshot(a, target = null, event = {}) {
  const c = cone(a);
  if (!game.combat?.started) return {};
  const x = context(a, target, event);
  x.buffs = liveBuffs(a);
  if (number(a.system?.attributes?.hp?.temp) <= 0) delete x.buffs.journeyShield;
  let o = c?.inCombat ? passive(c.id, x) : passive(0, x);
  const add = (k, n) => (o[k] = (o[k] ?? 0) + n);
  const seenAuras = new Set();
  for (const source of combatActors()) {
    const sc = cone(source);
    if (
      !sc?.inCombat ||
      hpRatio(source) <= 0 ||
      !party(source).some((x) => x.uuid === a.uuid)
    )
      continue;
    if (seenAuras.has(sc.id)) continue;
    seenAuras.add(sc.id);
    switch (sc.id) {
      case 21:
        add("attack", 1);
        break;
      case 31:
        add("reduction", 1);
        break;
      case 62:
        if (event.category === "break") add("damage", 2);
        break;
      case 102:
        if (cfg(source).elementId === cfg(a).elementId) add("damage", 1);
        break;
      case 103:
        if (
          party(source).filter((x) => cfg(x).pathId === cfg(a).pathId).length >=
          2
        )
          add("critDamage", 2);
        break;
      case 157:
        if (hpRatio(a) > 0.5) add("damage", 1);
        break;
      case 50:
        if (
          source.getFlag(ID, "lightConeSettings")?.trailblazer === source.uuid
        ) {
          add("damage", 1);
          if (source === a && event.category === "enhancedBasic")
            add("damage", 3);
        }
        break;
    }
  }
  const owner = a.getFlag(ID, "lightConeOwner")
    ? combatActors().find((b) => b.uuid === a.getFlag(ID, "lightConeOwner"))
    : null;
  if (owner) {
    const oc = cone(owner),
      ox = context(owner, target, event);
    if (oc?.inCombat && [109, 129, 135, 149].includes(oc.id)) {
      const owned = passive(oc.id, ox);
      for (const k of ["damage", "critDamage", "basicDamage"])
        add(k, number(owned[k]));
    }
  }
  if (owner && cone(owner)?.id === 75 && liveBuffs(owner).rainbowCharge)
    add("damage", 3);
  for (const source of combatActors()) {
    const sc = cone(source);
    if (
      !sc?.inCombat ||
      hpRatio(source) <= 0 ||
      !friends(source).some((t) => t.uuid === a.uuid)
    )
      continue;
    if (
      sc.id === 88 &&
      (source === a ||
        (source.getFlag(ID, "lightConeSettings")?.breakPartner ||
          friends(source)
            .filter((t) => t !== source)
            .sort(
              (a, b) =>
                number(cfg(b).breakEffectScore) -
                number(cfg(a).breakEffectScore),
            )[0]?.uuid) === a.uuid) &&
      event.category === "break"
    )
      add("damage", 2);
    if (
      sc.id === 148 &&
      source.uuid !== a.uuid &&
      runtime(source).once.timeWound !== turnKey()
    )
      add("damage", number(runtime(source).stacks.healRecord));
  }
  const appliedMarks = new Set();
  for (const m of marks(target ?? a)) {
    const source = combatActors().find((x) => x.uuid === m.source);
    if (!source || cone(source)?.catalogId !== m.cone || hpRatio(source) <= 0)
      continue;
    const mk = m.cone + ":" + m.tag;
    if (appliedMarks.has(mk)) continue;
    appliedMarks.add(mk);
    if (m.tag === "blank" && x.buffs.verse?.source === source.uuid) {
      add("damage", 1);
      add("critDamage", 1);
    }
    if (m.stats?.taken && friends(source).some((x) => x.uuid === a.uuid))
      add("damage", m.stats.taken);
    if (m.tag === "hellfire" && source === a) add("critDamage", 2);
    if (m.tag === "mirage" && source === a)
      add("damage", event.category === "ultimate" ? 3 : 2);
    if (m.stats?.critTaken && friends(source).some((x) => x.uuid === a.uuid))
      add("critDamage", m.stats.critTaken);
  }
  if (event.category === "break")
    for (const m of marks(target ?? a))
      o.damage = number(o.damage) + number(m.stats?.breakTaken);
  if (event.category === "elation")
    for (const m of marks(target ?? a))
      o.damage = number(o.damage) + number(m.stats?.elationTaken);
  for (const k of [(event.category ?? "") + "Damage"])
    o.damage = number(o.damage) + number(o[k]);
  if (event.category === "enhancedBasic")
    o.damage = number(o.damage) + number(o.basicDamage);
  if (event.category === "elation")
    o.damage = number(o.damage) + number(o.elationDamage);
  return o;
}
async function save(a, s) {
  await a.setFlag(ID, FLAG, s);
  a.reset();
}
const turnKey = () =>
  game.combat?.id + ":" + game.combat?.round + ":" + game.combat?.combatant?.id;
async function once(a, key, f) {
  const s = runtime(a),
    keyvalue = turnKey();
  if (s.once[key] === keyvalue) return;
  s.once[key] = keyvalue;
  await save(a, s);
  return f();
}
async function stack(a, key, cap, delta = 1) {
  const s = runtime(a);
  s.stacks[key] = Math.max(0, Math.min(cap, number(s.stacks[key]) + delta));
  await save(a, s);
}
async function setStack(a, key, value) {
  const s = runtime(a);
  s.stacks[key] = value;
  await save(a, s);
}
async function buff(source, target, key, stats, remaining = 1) {
  const c = cone(source);
  if (!c?.inCombat) return;
  const s = runtime(target);
  s.buffs[key] = {
    source: source.uuid,
    cone: c.catalogId,
    stats,
    remaining,
    indefinite: remaining === 100,
    expiresAtStart: [
      "calculusSpeed",
      "nightglowAttack",
      "nightglowDamage",
      "flower",
      "erode",
      "victory",
      "elationExpiry",
      "showtimeExpiry",
      "milky",
      "dawn",
      "together",
      "story",
    ].includes(key),
    appliedTurn: turnKey(),
  };
  await save(target, s);
}
async function team(source, key, stats, n = 1) {
  for (const a of party(source)) await buff(source, a, key, stats, n);
}
async function mark(
  source,
  target,
  tag,
  stats = {},
  remaining = 1,
  saveAbility = null,
) {
  const c = cone(source);
  if (!c?.inCombat) return;
  if (saveAbility) {
    const dc =
      8 +
      number(source.system.attributes.prof) +
      number(
        source.system.abilities[
          source.getFlag(ID, "lightConeSettings")?.saveAbility ?? "cha"
        ]?.mod,
      ) +
      number(snapshot(source).effectHit) +
      number(source._planarBonuses?.effectHit);
    const r = await target.rollAbilitySave(saveAbility, {
      target: dc,
      chatMessage: true,
    });
    const total = Array.isArray(r) ? r[0]?.total : r?.total;
    if (!Number.isFinite(total)) throw Error("Save did not return a total");
    if (total >= dc) return;
  }
  const s = runtime(target);
  s.marks[c.catalogId + ":" + source.uuid + ":" + tag] = {
    source: source.uuid,
    cone: c.catalogId,
    tag,
    stats,
    remaining,
  };
  await save(target, s);
  if (!["enthrall", "dotSave"].includes(tag))
    await event(source, { type: "debuff", other: target });
}
async function heal(a, n) {
  const h = a.system.attributes.hp;
  await a.update(
    {
      "system.attributes.hp.value": Math.min(
        h.max,
        number(h.value) + Math.max(0, Math.floor(n)),
      ),
    },
    { lightConeHeal: true },
  );
}
const energy = (a, n) => api.addEnergy(a, n, "lightCone");
const sp = async (n) => api.setSkillPoints(api.getSkillPoints() + n);
async function advance(a, n) {
  const cb = game.combat?.combatants.find(
    (c) =>
      c.actor?.uuid === a.uuid &&
      !c.getFlag(ID, "temporaryUltimate") &&
      !c.getFlag(ID, "actionAdvance"),
  );
  if (!cb || cb.initiative == null) return;
  const f = cb.getFlag(ID, "lightConeInitiative");
  if (f) return;
  await cb.setFlag(ID, "lightConeInitiative", {
    bonus: n,
    round: game.combat.round + 1,
    active: false,
  });
}
export async function initiatives(combat) {
  for (const c of combat.combatants) {
    const f = c.getFlag(ID, "lightConeInitiative");
    if (!f) continue;
    if (combat.round === f.round && !f.active) {
      await c.update(
        {
          initiative: number(c.initiative) + f.bonus,
          [`flags.${ID}.lightConeInitiative.active`]: true,
        },
        { lightConeInitiative: true },
      );
    } else if (combat.round > f.round) {
      await c.update(
        {
          ...(f.active ? { initiative: number(c.initiative) - f.bonus } : {}),
          [`flags.${ID}.-=lightConeInitiative`]: null,
        },
        { lightConeInitiative: true },
      );
    }
  }
}
export async function restoreInitiative(combat) {
  for (const c of combat.combatants) {
    const f = c.getFlag(ID, "lightConeInitiative");
    if (f)
      await c.update(
        {
          ...(f.active ? { initiative: number(c.initiative) - f.bonus } : {}),
          [`flags.${ID}.-=lightConeInitiative`]: null,
        },
        { lightConeInitiative: true },
      );
  }
}
export async function applyDot(
  target,
  { source, type = "custom", attribute, dice = 1, die = 4, turns = 1 },
) {
  if (!game.user.isGM) throw Error("GM required");
  if (!game.combat?.started || !combatActors().includes(target))
    throw Error("Choose an active combatant");
  dice = Number(dice);
  die = Number(die);
  turns = Number(turns);
  if (
    !Number.isInteger(dice) ||
    dice < 1 ||
    dice > 20 ||
    !DICE.includes(die) ||
    !Number.isInteger(turns) ||
    turns < 0 ||
    turns > 100
  )
    throw Error("Invalid DoT dice or turn count");
  if (!CONFIG.DND5E.damageTypes[attribute])
    throw Error("Choose a registered damage attribute");
  const s = runtime(target),
    key = source?.uuid + ":" + type + ":" + attribute;
  s.dots = s.dots ?? [];
  const old = s.dots.find((d) => d.key === key);
  if (turns === 0) {
    s.dots = s.dots.filter((d) => d.key !== key);
    await save(target, s);
    return;
  }
  const c = source && cone(source),
    mods = c?.inCombat ? dotModifiers(c.id, type, context(source, target)) : {};
  const dot = {
    id: old?.id ?? foundry.utils.randomID(),
    key,
    source: source?.uuid ?? null,
    sourceCone: c?.catalogId ?? null,
    type,
    attribute,
    dice,
    die,
    remaining: Math.max(old?.remaining ?? 0, turns + number(mods.turns)),
    appliedTurn: turnKey(),
    lastTick: null,
  };
  s.dots = s.dots.filter((d) => d.key !== key);
  s.dots.push(dot);
  await save(target, s);
  if (source && c?.inCombat)
    await event(source, { type: "debuff", other: target });
}
export async function tickDots(a, key) {
  let s = runtime(a);
  if (a.statuses?.has("dead")) {
    s.dots = [];
    await save(a, s);
    return;
  }
  for (const dot of [...(s.dots ?? [])]) {
    if (
      dot.lastTick === key ||
      dot.pendingTick ||
      dot.appliedTurn === key ||
      dot.remaining <= 0
    )
      continue;
    const source = dot.source ? await fromUuid(dot.source) : null,
      c = source && cone(source);
    let steps = c?.inCombat
      ? dotModifiers(c.id, dot.type, context(source, a)).steps
      : 0;
    if (
      source &&
      marks(a).some(
        (m) =>
          m.tag === "enthrall" &&
          m.stats.steps &&
          combatActors().some(
            (w) =>
              w.uuid === m.source &&
              cone(w)?.catalogId === m.cone &&
              hpRatio(w) > 0 &&
              friends(w).some((t) => t.uuid === source.uuid),
          ),
      )
    )
      steps++;
    const die = dieStep(dot.die, steps);
    const roll = await new Roll(
      `${dot.dice}d${die}[${dot.attribute}]`,
    ).evaluate();
    dot.pendingTick = key;
    s = runtime(a);
    s.dots = s.dots.map((d) => (d.id === dot.id ? dot : d));
    await save(a, s);
    await a.applyDamage([{ value: roll.total, type: dot.attribute }], {
      lightConeDot: { id: dot.id, source: dot.source, turnKey: key },
    });
    dot.lastTick = key;
    delete dot.pendingTick;
    dot.remaining--;
    s = runtime(a);
    s.dots = s.dots
      .map((d) => (d.id === dot.id ? dot : d))
      .filter((d) => d.remaining > 0);
    await save(a, s);
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: a }),
      flavor: `${esc(a.name)} — ${esc(friendlyLabel(dot.type))}: ${dot.remaining} turns remaining`,
      flags: { [ID]: { lightConeDot: true } },
    });
  }
}
function refreshActors() {
  // Rebuild from source before preparation. Reusing the prepared D&D5e model
  // attempts to define its nonconfigurable senses shims a second time.
  for (const a of combatActors()) a.reset();
}
async function event(a, e) {
  const c = cone(a);
  if (!c?.inCombat) return;
  if(e.type==="targetResolution" && ![2,39,40,108,116].includes(c.id))return;
  if(e.type==="targetResolution" && e.supportHandled && [2,39].includes(c.id))return;
  const id = c.id,
    s = runtime(a),
    cat = e.category,
    targets = e.targets ?? [],
    other = e.other,
    hit = targets.length > 0,
    ult = cat === "ultimate",
    skill = cat === "skill",
    basic = cat === "basic" || cat === "enhancedBasic",
    fo = cat === "followup",
    atk = e.type === "attack",
    start = e.type === "start",
    turn = e.type === "turn",
    hurt = e.type === "hurt",
    kill = e.type === "kill",
    br = e.type === "break",
    debuff = e.type === "debuff",
    support = e.support ?? [],
    r = (x) => number(s.stacks[x]);
  const self = (key, stats, n = 1) => buff(a, a, key, stats, n),
    group = (key, stats, n = 1) => team(a, key, stats, n),
    saveMarks = (tag, stats, n = 2) =>
      Promise.all(targets.map((t) => mark(a, t, tag, stats, n, "con"))),
    gain = (key, cap) => stack(a, key, cap),
    consume = (key) => setStack(a, key, 0),
    tick = (key, f) => once(a, key, f);
  switch (id) {
    case 2:
      if ((skill || ult) && support.length === 1) {
        const t = support[0],
          old = runtime(t).buffs.hymn,
          st = Math.min(3, number(old?.stats?.damage) + 1);
        await buff(a, t, "hymn", { damage: st }, 3);
        await energy(a, 2);
        await gain("hymnUses", 2);
        if (r("hymnUses") >= 1) {
          await sp(1);
          await consume("hymnUses");
        }
      }
      break;
    case 6:
      if (ult) {
        await self("coronation", { attack: 2 + (cfg(a).max >= 60 ? 1 : 0) }, 2);
        if (cfg(a).max >= 60) await energy(a, 3);
      }
      break;
    case 8:
      if (kill) await self("adversarial", { speed: 10 }, 2);
      break;
    case 9:
      if (ult) await self("charmony", { speed: 10 }, 2);
      break;
    case 10:
      if (atk) for (const t of targets) await mark(a, t, "mirage", {}, 1);
      break;
    case 14:
      if (ult) await self("disputation", { damage: 2 }, 2);
      break;
    case 15:
      if (fo) await consume("somnus");
      if (skill || ult) await setStack(a, "somnus", 1);
      break;
    case 16:
      if (atk && targets.some((t) => has(t, "reducedAC")))
        await tick("tutorial", () => energy(a, 2));
      break;
    case 18:
      if (basic) {
        const old = Object.keys(liveBuffs(a)).filter((k) =>
          k.startsWith("dragon:"),
        );
        if (old.length < 2)
          await self(
            "dragon:" + foundry.utils.randomID(),
            { attack: 1, regen: 1 },
            2,
          );
      }
      break;
    case 19:
      if (ult && support.length) {
        await gain("battleUses", 2);
        if (r("battleUses") >= 1) {
          await sp(1);
          await consume("battleUses");
        }
      }
      if (skill) {
        const next = nextAlly(a);
        if (next) await buff(a, next, "battle", { damage: 2 }, 1);
      }
      break;
    case 20:
      if (start || turn) {
        const previous = r("cloud"),
          choices = [1, 2, 3].filter((x) => x !== previous),
          n = choices[Math.floor(Math.random() * choices.length)];
        await setStack(a, "cloud", n);
        await group(
          "cloud",
          n === 1 ? { attack: 1 } : n === 2 ? { critDamage: 2 } : { regen: 1 },
          1,
        );
      }
      break;
    case 26:
      if (kill) await self("stellar", { attack: 2 }, 2);
      break;
    case 27:
      if (ult) {
        await gain("firedance", 2);
        await self("firedanceExpiry", {}, 2);
      }
      if (atk && hit)
        await tick("provoke", () =>
          mark(a, targets[0], "provoke", {}, 1, "wis"),
        );
      break;
    case 28:
      if (ult && !r("danceUsed")) {
        for (const t of party(a)) await advance(t, 2);
        await setStack(a, "danceUsed", 1);
      }
      break;
    case 29:
      if (kill) await self("darting", { attack: 1 }, 3);
      break;
    case 32:
      if (e.type === "spSpent") {
        await stack(a, "elationCharge", 4, e.amount);
        await self("elationExpiry", {}, 1);
        if (r("elationCharge") + e.amount >= 4)
          await group("elationSP", { elationDamage: 2 }, 1);
      }
      break;
    case 33:
      if (ult) await tick("defense", () => heal(a, 3));
      break;
    case 35:
      if (
        atk &&
        targets.some((t) => number(t.getFlag(ID, "toughness")?.current) === 0)
      )
        await tick("montage", () => energy(a, 2));
      break;
    case 36:
      if (["basic", "enhancedBasic", "skill", "ultimate"].includes(cat)) {
        const kind = basic ? "basic" : cat;
        await setStack(a, "dreamville", kind);
        await group("dreamville", { [kind + "Damage"]: 2 }, 100);
      }
      break;
    case 37:
      if (start) await group("mask", { crit: 1, critDamage: 2 }, 3);
      if (e.type === "spRestored") {
        await stack(a, "maskSP", 4, e.amount);
        if (r("maskSP") + e.amount >= 4) {
          await group("mask", { crit: 1, critDamage: 2 }, 4);
          await consume("maskSP");
        }
      }
      break;
    case 38:
      if (atk && hit)
        await tick("coffin", () => energy(a, Math.min(3, targets.length)));
      if (ult) await group("coffinSpeed", { speed: 10 }, 1);
      break;
    case 39:
      if (skill || ult)
        for (const t of support)
          await buff(a, t, "blessings", { elationDamage: 3 }, 2);
      break;
    case 40:
      if (ult && hit) await tick("epochSP", () => sp(1));
      if (skill)
        for (const t of support)
          await buff(a, t, "epoch", { skillDamage: 3 }, 3);
      break;
    case 41:
      if (atk) {
        await setStack(a, "calculus", Math.min(3, targets.length));
        if (targets.length >= 3) await self("calculusSpeed", { speed: 10 }, 1);
      }
      break;
    case 44:
      if (e.critical) await gain("goodFortune", 4);
      break;
    case 45:
      if (start) for (const t of party(a)) await energy(t, 3);
      break;
    case 46:
      if (
        (skill || ult) &&
        [2, 4].includes(number(a.getFlag(ID, "lightConeSettings")?.hpCost))
      ) {
        const cost = number(a.getFlag(ID, "lightConeSettings")?.hpCost);
        if (a.system.attributes.hp.value > cost) {
          await a.update(
            {
              "system.attributes.hp.value": a.system.attributes.hp.value - cost,
            },
            {
              lightConeHPSpend: {
                amount: cost,
                consent: Boolean(a.getFlag(ID, "lightConeHPConsent")),
              },
            },
          );
          await self("sacrifice", { damage: cost }, 1);
        }
      }
      break;
    case 47:
      if (
        hurt &&
        e.amount > a.system.attributes.hp.max / 4 &&
        s.turns - number(s.stacks.farCooldown) >= 3
      ) {
        await heal(a, 3);
        await self("flames", { damage: 2 }, 2);
        await setStack(a, "farCooldown", s.turns);
      }
      break;
    case 49:
      if (e.type === "allyAttack") {
        await gain("nightglow", 5);
        await self(
          "nightglowRegen",
          { regen: Math.min(5, r("nightglow") + 1) },
          100,
        );
      }
      if (ult) {
        await consume("nightglow");
        const st = runtime(a);
        delete st.buffs.nightglowRegen;
        await save(a, st);
        await self("nightglowAttack", { attack: 2 }, 1);
        await group("nightglowDamage", { damage: 2 }, 1);
      }
      break;
    case 51:
      if (ult) await self("tomorrow", { damage: 2 }, 2);
      break;
    case 52:
      if (ult) {
        await self("greetings", { basicDamage: 2 }, 3);
        const m = sprite(a);
        if (m) await buff(a, m, "greetings", { basicDamage: 2 }, 3);
      }
      break;
    case 53:
      if (kill) await self("repose", { critDamage: 3 }, 3);
      break;
    case 55:
      if (skill) await self("overHere", { healing: 2 }, 2);
      break;
    case 56:
      if (basic) await consume("shadow");
      if (skill) await setStack(a, "shadow", 1);
      break;
    case 57:
      if (atk && hit)
        await tick("thermae", () => saveMarks("thermae", { taken: 1 }, 2));
      break;
    case 59:
      if (e.type === "allyHurt") await gain("eclipse", 3);
      if (atk) await consume("eclipse");
      break;
    case 60:
      if (ult) await consume("luminflux");
      if (fo) await gain("luminflux", 2);
      break;
    case 61:
      if (start) {
        await energy(a, 3);
        await group("flower", { critDamage: 2 }, 2);
      }
      if (fo)
        await tick("flower", async () => {
          await energy(a, 2);
          await group("flower", { critDamage: 2 }, 2);
        });
      break;
    case 65:
      if (atk && hit)
        await tick("aether", () =>
          mark(
            a,
            targets[Math.floor(Math.random() * targets.length)],
            "aether",
            { taken: 1 },
            1,
          ),
        );
      break;
    case 66:
      if (ult) await self("promise", { crit: 1 }, 2);
      break;
    case 67:
      if (e.type === "shield" && other !== a)
        await self("destiny", { critDamage: 3 }, 2);
      if (fo) await saveMarks("destiny", { taken: 1 }, 2);
      break;
    case 68:
      if (ult) {
        await self("veil", { skillDamage: 3, ultimateDamage: 3 }, 3);
        if (e.energySpent >= 50) await sp(1);
      }
      break;
    case 69:
      if (debuff) {
        await gain("showtime", 3);
        await self("showtimeExpiry", {}, 1);
      }
      break;
    case 70:
      if (e.type === "shield" && other)
        await buff(a, other, "journeyShield", { damage: 1 }, 100);
      break;
    case 71:
      if (atk && hit)
        await tick("provoke", () =>
          mark(a, targets[0], "provoke", {}, 1, "wis"),
        );
      break;
    case 72:
      if (atk)
        await saveMarks(
          "reducedAC",
          { ac: -(a.system.attributes.movement.walk >= 50 ? 2 : 1) },
          2,
        );
      break;
    case 73:
      if (turn) await energy(a, 2);
      if (atk && hit)
        await tick("lifeFlames", () => saveMarks("reducedAC", { ac: -1 }, 2));
      break;
    case 75:
      if (e.type === "spriteAttack") {
        const current = runtime(a);
        delete current.buffs.rainbowCharge;
        await save(a, current);
      }
      if (e.type === "allySpentHP" && e.consent)
        await self("rainbowCharge", { spriteDamage: 3 }, 100);
      if (e.type === "spriteSkill") await saveMarks("rainbow", { taken: 1 }, 2);
      break;
    case 76:
      if (e.type === "partyBreak" && other) {
        const old = marks(other).find(
          (m) => m.source === a.uuid && m.tag === "charring",
        );
        await mark(
          a,
          other,
          "charring",
          { breakTaken: Math.min(2, number(old?.stats?.breakTaken) + 1) },
          2,
        );
      }
      break;
    case 78:
      if (hurt && game.combat.combatant?.actor?.uuid === a.uuid) {
        await self("farewell", { damage: 2 }, 2);
        const m = sprite(a);
        if (m) await buff(a, m, "farewell", { damage: 2 }, 2);
      }
      if (e.type === "unsummon" && !r("farewellUsed")) {
        await advance(a, 2);
        await setStack(a, "farewellUsed", 1);
      }
      if (ult) await consume("farewellUsed");
      break;
    case 79:
      if (start) await energy(a, 5);
      break;
    case 80:
      if (start) await group("mediation", { speed: 10 }, 1);
      break;
    case 81:
      if (atk) await tick("memories", () => energy(a, 2));
      break;
    case 82:
      if (skill) await group("curtain", { damage: 2 }, 3);
      break;
    case 83:
      if (atk || hurt) await tick("cogs", () => energy(a, 2));
      break;
    case 84:
      if (hurt) await self("victory", { ac: 1 }, 1);
      if (atk && hit)
        await tick("provoke", () =>
          mark(a, targets[0], "provoke", {}, 1, "wis"),
        );
      break;
    case 85:
      if (basic) await tick("multiply", () => advance(a, 1));
      break;
    case 86:
      if (cat === "elation") await saveMarks("shroomy", { elationTaken: 2 }, 2);
      break;
    case 88:
      if (e.type === "implant" && !r("flameSP")) {
        await sp(1);
        await setStack(a, "flameSP", 1);
      }
      if (ult) await consume("flameSP");
      break;
    case 89:
      if (e.type === "allyUltimate")
        await tick("fright", () =>
          heal(friends(a).sort((a, b) => hpRatio(a) - hpRatio(b))[0], 3),
        );
      if (e.type === "heal" && other) {
        const old = runtime(other).buffs.fright;
        await buff(
          a,
          other,
          "fright",
          { attack: Math.min(3, number(old?.stats?.attack) + 1) },
          2,
        );
      }
      break;
    case 90:
      if (e.type === "partyBreak") await self("milky", { damage: 2 }, 1);
      break;
    case 91:
      if (hurt || e.type === "healed")
        await tick("ninja", () => self("ninja", { critDamage: 3 }, 2));
      break;
    case 92:
      if (start) await energy(a, 5);
      if (ult) await setStack(a, "raiton", 2);
      if (basic && r("raiton")) {
        await tick("raiton", () => advance(a, 2));
        await stack(a, "raiton", 2, -1);
      }
      break;
    case 93:
      if (kill) await tick("nowhere", () => heal(a, 3));
      break;
    case 94:
      if (atk) await gain("aeon", 3);
      if (br) await self("aeonBreak", { damage: 2 }, 2);
      break;
    case 96:
      if (skill) await tick("passkey", () => energy(a, 2));
      break;
    case 97:
      if (start) for (const t of party(a)) await energy(t, 3);
      if (ult) {
        await group("mirror", { damage: 2 }, 3);
        if (context(a).breakBonus >= 3) await sp(1);
      }
      break;
    case 98:
      if (skill) {
        const next = nextAlly(a);
        if (next) await buff(a, next, "pastFuture", { damage: 2 }, 1);
      }
      break;
    case 99:
      if (atk) {
        await gain("erodeSpeed", 3);
        if (hit)
          await tick("erode", () =>
            automaticDot(a, targets[0], "shock", "lightning", 1),
          );
      }
      break;
    case 101:
      if (br) await tick("pioneering", () => heal(a, 3));
      break;
    case 105:
      if (turn) {
        const candidates = friends(a).filter(
          (t) => t !== a && cfg(t).current < cfg(t).max / 2,
        );
        if (candidates.length)
          await energy(
            candidates[Math.floor(Math.random() * candidates.length)],
            3,
          );
      }
      break;
    case 107:
      if (atk) {
        let seen = new Set(s.stacks.prophetTypes ?? []);
        for (const t of targets)
          for (const k of ["burn", "shock", "bleed", "windShear"])
            if (has(t, k)) seen.add(k);
        await setStack(a, "prophetTypes", [...seen]);
        await setStack(a, "prophet", seen.size);
      }
      break;
    case 108:
      if (turn && s.turns === 1) await energy(a, 5);
      if (skill)
        for (const t of targets)
          await mark(a, t, "hellfire", { critTaken: 2 }, 2);
      break;
    case 109:
      if (e.type === "spriteTurn") await gain("reminiscence", 3);
      if (e.type === "unsummon") await consume("reminiscence");
      break;
    case 110:
      if (atk && hit)
        await tick("ensnared", () => saveMarks("reducedAC", { ac: -1 }, 1));
      break;
    case 111:
      if (atk && e.critical && hit)
        await tick("darkness", async () => {
          const t = targets[0],
            effect = t.effects.find(
              (x) => !x.disabled && x.getFlag(ID, "removableBeneficial"),
            );
          if (effect) {
            const dc =
                8 +
                number(a.system.attributes.prof) +
                number(a.system.abilities.cha.mod),
              r = await t.rollAbilitySave("con", { target: dc });
            if (number(Array.isArray(r) ? r[0]?.total : r?.total) < dc)
              await effect.delete();
          }
        });
      break;
    case 113:
      if (hurt) await self("riverSuppressed", {}, 2);
      break;
    case 114:
      if (ult) await self("sagacity", { attack: 1 }, 2);
      break;
    case 116:
      if (ult && hit)
        await saveMarks(
          "scent",
          { taken: context(a).breakBonus >= 3 ? 2 : 1 },
          2,
        );
      break;
    case 118:
      if (e.type === "summon" && !r("shadowburn")) {
        await sp(1);
        await energy(a, 3);
        await setStack(a, "shadowburn", 1);
      }
      break;
    case 119:
      if (start || br)
        await tick("shadowed", () => self("shadowed", { speed: 10 }, 2));
      break;
    case 120:
      if (skill)
        await tick("shared", async () => {
          for (const t of party(a)) await energy(t, 1);
        });
      break;
    case 122:
      if (start)
        for (const t of party(a))
          await heal(
            t,
            Math.floor(
              (t.system.attributes.hp.max - t.system.attributes.hp.value) / 4,
            ),
          );
      if (hurt) await group("closedEyes", { damage: 1 }, 2);
      break;
    case 123:
      if (
        atk &&
        (basic || skill) &&
        !e.critical &&
        s.turns - number(s.stacks.sleepCooldown) >= 3
      ) {
        await self("sleep", { crit: 1 }, 2);
        await setStack(a, "sleepCooldown", s.turns);
      }
      break;
    case 125:
      if (ult) await self("solitary", {}, 2);
      if (e.type === "dotKill")
        await tick("solitaryEnergy", () => energy(a, 3));
      break;
    case 126:
      if (kill || hurt)
        await tick("irreplaceable", async () => {
          await heal(a, 3);
          await self("irreplaceable", { damage: 2 }, 2);
        });
      break;
    case 130:
      if (atk && targets.length) {
        const t = targets[0].uuid;
        if (s.stacks.swordTarget !== t) {
          await setStack(a, "swordplay", 1);
          await setStack(a, "swordTarget", t);
        } else await gain("swordplay", 3);
      }
      break;
    case 131:
      if (
        hurt &&
        number(a.system.attributes.hp.temp) <= 0 &&
        s.turns - number(s.stacks.textureCooldown) >= 3
      ) {
        await a.update({ "system.attributes.hp.temp": 5 });
        await self("textureShield", {}, 2);
        await setStack(a, "textureCooldown", s.turns);
      }
      break;
    case 133:
      if (
        atk &&
        targets.filter((t) =>
          (t.getFlag(ID, "toughness")?.weaknesses ?? []).includes(
            cfg(a).elementId,
          ),
        ).length >= 2
      )
        await self("cosmos", { critDamage: 3 }, 2);
      break;
    case 134:
      if (fo) await gain("finaleCount", 4);
      if (start || (fo && r("finaleCount") >= 3)) {
        await self("finale", { attack: 2 }, 3);
        for (const t of targets) await mark(a, t, "finale", { taken: 1 }, 3);
        if (fo) await consume("finaleCount");
      }
      break;
    case 136:
      if (skill) await gain("victual", 2);
      break;
    case 138:
      if (skill) await gain("hell", 3);
      break;
    case 139:
      if (
        ["basic", "enhancedBasic", "skill", "ultimate"].includes(cat) &&
        !s.stacks["moles:" + (basic?"basic":cat)]
      ) {
        await setStack(a, "moles:" + (basic?"basic":cat), 1);
        await gain("moles", 3);
      }
      break;
    case 140:
      if (kill) await gain("breakfast", 3);
      break;
    case 141:
      if (e.type === "spriteAttack") {
        await self("story", { healing: 2 }, 1);
        const m = sprite(a);
        if (m) await buff(a, m, "story", { healing: 2 }, 1);
      }
      break;
    case 142:
      if (hurt) await setStack(a, "unreachable", 1);
      if (atk) await consume("unreachable");
      break;
    case 144:
      if (e.type === "spriteSkill") {
        if (support.length) {
          for (const t of combatActors().filter((t) => !friends(a).includes(t)))
            await mark(a, t, "blank", { taken: 1 }, 2);
        }
        if (hit) await group("verse", { critDamage: 2 }, 2);
      }
      break;
    case 145:
      if (atk && hit)
        await tick("springs", async () => {
          for (const t of targets)
            await mark(
              a,
              t,
              "springs",
              {
                taken: runtime(t).dots?.some((d) => d.source === a.uuid)
                  ? 2
                  : 1,
              },
              2,
              "con",
            );
        });
      break;
    case 146:
      if (ult) {
        for (const t of party(a)) await heal(t, 3);
        const t = party(a).sort((a, b) => hpRatio(a) - hpRatio(b))[0];
        if (t) await heal(t, 3);
        await group("worlds", { damage: 2 }, 3);
        for (const t of party(a).filter((t) => t.getFlag(ID, "lightConeOwner")))
          await buff(a, t, "worlds", { damage: 3 }, 3);
      }
      break;
    case 147:
      if (ult) await self("dawn", { damage: 2 }, 1);
      break;
    case 148:
      if (e.type === "heal")
        await setStack(a, "healRecord", Math.min(4, Math.floor(e.amount / 2)));
      if (e.type === "allyAttack" && r("healRecord"))
        await tick("timeWound", async () => {
          await setStack(a, "healRecord", 0);
        });
      break;
    case 149:
      if (atk || e.type === "spriteAttack")
        await tick("gold", () => gain("gold", 6));
      break;
    case 150:
      if (e.type === "spriteSkill") {
        for (const m of friends(a).filter((t) =>
          t.getFlag(ID, "lightConeOwner"),
        ))
          await buff(a, m, "evernight", { damage: 2 }, 2);
        await self("evernight", { damage: 2 }, 2);
      }
      if (e.type === "unsummon")
        await tick("evernightEnergy", () => energy(a, 3));
      break;
    case 152:
      if (cat === "elation") await gain("luck", 2);
      break;
    case 153:
      if (ult) await group("together", { elationDamage: 2 }, 1);
      break;
    case 154:
      if (hurt && other)
        await tick("trend", () => automaticDot(a, other, "burn", "fire", 2));
      break;
    case 155:
      if (kill) await self("blueSky", { crit: 1 }, 3);
      break;
    case 156:
      if (cat === "elation") await saveMarks("bloom", { taken: 2 }, 2);
      break;
    case 158:
      if (e.type === "spriteSkill" && support.length)
        await group("blink", { damage: 1 }, 3);
      break;
    case 160:
      if (basic || skill)
        await tick("warmth", async () => {
          for (const t of party(a)) await heal(t, 1);
        });
      break;
    case 161:
      if (start) {
        await group("wildfire", { reduction: 1 }, 5);
        for (const t of party(a))
          await heal(
            t,
            Math.floor(
              (t.system.attributes.hp.max - t.system.attributes.hp.value) / 5,
            ),
          );
      }
      break;
    case 162:
      if ((basic || skill) && hit)
        await tick("meetAgain", () =>
          extraDamage(
            a,
            targets[Math.floor(Math.random() * targets.length)],
            2,
            e.damageType,
          ),
        );
      break;
    case 163:
      if (basic) await gain("cosmicBasics", 3);
      if (ult && (!s.stacks.cosmicUsed || r("cosmicBasics") >= 3)) {
        await api.setPunchline?.(
          number(game.settings.get(ID, "punchline")) + 3,
        );
        await setStack(a, "cosmicUsed", 1);
        await consume("cosmicBasics");
      }
      break;
    case 164:
      if (basic) await tick("real", () => heal(a, 2));
      break;
    case 165:
      if (start || (ult && support.length)) {
        await group("decided", { crit: 1, critDamage: 2 }, 3);
        await self("decidedRegen", { regen: 2 }, 3);
      }
      if (start) for (const t of party(a)) await energy(t, 3);
      break;
    case 166:
      if (br && other)
        await mark(a, other, "slowed", { speed: -10, breakTaken: 2 }, 2);
      break;
    case 167:
      if (debuff && other) {
        const old = marks(other).find(
            (m) => m.tag === "enthrall" && m.source === a.uuid,
          ),
          n = Math.min(3, number(old?.stats?.stacks) + 1);
        await mark(
          a,
          other,
          "enthrall",
          { stacks: n, steps: n >= 2 ? 1 : 0 },
          3,
        );
      }
      if (e.type === "allyAttack")
        for (const t of targets)
          if (has(t, "enthrall") && other)
            await tick("oceanSpeed", () =>
              buff(a, other, "ocean", { speed: 5 }, 3),
            );
      break;
    case 169:
      if (fo)
        for (const t of targets) {
          const old = marks(t).find(
            (m) => m.tag === "tame" && m.source === a.uuid,
          );
          await mark(
            a,
            t,
            "tame",
            { critTaken: Math.min(2, number(old?.stats?.critTaken) + 1) },
            2,
          );
        }
      break;
    case 170:
      if (start || basic)
        await self("hope", { ultimateDamage: 2, followupDamage: 2 }, 2);
      break;
  }
}
function nextAlly(a) {
  const turns = game.combat?.turns ?? [],
    start = game.combat?.turn ?? 0;
  for (let i = 1; i <= turns.length; i++) {
    const c = turns[(start + i) % turns.length];
    if (c.actor && c.actor !== a && friends(a).includes(c.actor))
      return c.actor;
  }
  return null;
}
async function extraDamage(source, target, n, type) {
  if (!CONFIG.DND5E.damageTypes[type])
    throw Error("Damage attribute must be configured");
  await target.applyDamage([{ value: n, type }], {
    lightConeExtra: true,
    sourceActorUuid: source.uuid,
  });
}
async function automaticDot(source, target, type, attribute, turns) {
  const before = runtime(target).dots?.length ?? 0;
  await mark(source, target, "dotSave", {}, 1, "con");
  if (
    !marks(target).some((m) => m.tag === "dotSave" && m.source === source.uuid)
  )
    return;
  await applyDot(target, { source, type, attribute, turns });
}
export async function dispatch(actor, e) {
  if (!auth() || !game.combat?.started) return;
  await event(actor, e);
  if (e.type === "attack") {
    for (const a of friends(actor).filter((a) => a !== actor))
      await event(a, { ...e, type: "allyAttack", other: actor });
  }
  if (e.category === "ultimate") {
    for (const a of friends(actor).filter((a) => a !== actor))
      await event(a, {
        ...e,
        category: null,
        type: "allyUltimate",
        other: actor,
      });
  }
  if (e.type === "hurt") {
    for (const a of friends(actor).filter((a) => a !== actor))
      await event(a, { ...e, type: "allyHurt", other: actor });
  }
  if (e.type === "break") {
    for (const a of friends(actor))
      await event(a, { ...e, type: "partyBreak", other: e.other });
  }
  refreshActors();
}
const category = (item, activity) =>
  activity?.getFlag?.(ID, "lightConeCategory") ??
  item?.getFlag?.(ID, "lightConeCategory") ??
  null;
function resolveTargets(list) {
  return [
    ...new Map(
      (list ?? [])
        .map((t) => t.actor ?? t.document?.actor ?? t)
        .filter((a) => a?.documentName === "Actor")
        .map((a) => [a.uuid, a]),
    ).values(),
  ];
}
function isElationActor(actor) {
  const path = cfg(actor).pathId;
  return actor?.type === "character" && (path === "elation" || path === game.settings.get(ID, "ahaConfig")?.elationPathId || game.settings.get(ID, "paths")?.some?.(p => p.id === path && p.name?.toLowerCase() === "elation"));
}
export function joyseekerThreshold(actor) {
  const override = actor.getFlag(ID, "combatStatBuffs");
  if (override?.combatId === game.combat?.id && Number.isFinite(override.threshold)) return override.threshold;
  const thresholds = [];
  for (const item of actor.items?.values?.() ?? actor.items ?? []) {
    if (item.system?.equipped === false) continue;
    const activities = item.system?.activities;
    for (const activity of activities?.values?.() ?? Object.values(activities ?? {})) {
      if (activity.type === "attack" || activity.attack) {
        const n = Number(activity.criticalThreshold ?? activity.attack?.critical?.threshold ?? item.system?.criticalThreshold);
        if (Number.isFinite(n) && n >= 2 && n <= 20) thresholds.push(n);
      }
    }
  }
  const sheetThreshold = Number(actor.system?.attributes?.crit?.threshold);
  if (Number.isFinite(sheetThreshold) && sheetThreshold >= 2 && sheetThreshold <= 20) thresholds.push(sheetThreshold);
  const base = globalThis.window?.TelysPlanar?.criticalSnapshot(actor)?.automatic ?? Math.min(20, ...thresholds);
  const stats = snapshot(actor);
  return Math.min(base, Math.max(stats.critFloor ?? 15, base - number(stats.crit)));
}
function joyseekerActive(combat = game.combat) {
  const state = combat?.getFlag(ID, "joyseekerAha"), current = combat?.combatant;
  return Boolean(state?.critical && current && (current.getFlag(ID, "elationActionCombatant") ? current.getFlag(ID, "sequenceKey") === state.sequenceKey : current.getFlag(ID, "ahaInstantCombatant") && current.id === state.ahaId && combat.round === state.round));
}
export async function joyseekerAha(combat, detail) {
  await combat.setFlag(ID, "joyseekerAha", {sequenceKey: detail.sequenceKey, ahaId: detail.combatant.id, round: combat.round, critical: false});
  for (const actor of combatActors()) {
    const item = actor.items?.get(actor.getFlag(ID, "selectedLightConeItemId"));
    const data = item?.getFlag?.(ID, "lightCone");
    if (data?.catalogId !== "custom-joyseeker" && Number(data?.draftId) !== 171 && item?.name !== "As the Joyseeker Remembers It") continue;
    const c = cone(actor);
    if (!c || c.id !== 171) {
      globalThis.ui?.notifications?.warn(`${actor.name}: Joyseeker's Aha check was skipped. The equipped cone must have enabled compendium automation and a matching Elation Path.`);
      continue;
    }
    if (hpRatio(actor) <= 0) {
      globalThis.ui?.notifications?.warn(`${actor.name}: Joyseeker's Aha check was skipped because the wearer has no remaining HP.`);
      continue;
    }
    const threshold = joyseekerThreshold(actor), roll = await new Roll("1d20").evaluate();
    const success = roll.total >= threshold;
    await roll.toMessage({speaker: ChatMessage.getSpeaker({actor}), flavor: `${esc(c.item.name)} — Aha Instant critical check: ${roll.total} against ${threshold} — ${success ? "PASSED" : "FAILED (no critical activation)"}`});
    if (!success) {
      globalThis.ui?.notifications?.info(`${actor.name}: Joyseeker rolled ${roll.total} against ${threshold}. The check failed, so there is no critical confirmation this Aha Instant.`);
      continue;
    }
    const title = "Can Aha Instant crit this turn?";
    const content = `<h3>Aha Instant can crit this turn.</h3><p>${esc(actor.name)} rolled ${roll.total}, meeting the critical threshold of ${threshold}.</p><p><strong>Has at least one other player already enabled this Aha Instant to crit?</strong></p><p>Yes grants 5 Energy plus Energy Regeneration to living Elation teammates. Elation Action damage is doubled for this Aha sequence either way.</p>`;
    const DialogV2 = globalThis.foundry?.applications?.api?.DialogV2;
    const yes = typeof DialogV2?.confirm === "function"
      ? await DialogV2.confirm({window: {title}, content, modal: true, rejectClose: false, yes: {label: "Yes — another source", default: false}, no: {label: "No — first source", default: true}})
      : await Dialog.confirm({title, content, yes: () => true, no: () => false, defaultYes: false});
    // The sequence must still be active when the GM answers.
    const current = combat.combatant;
    if (!combat.started || current?.id !== detail.combatant.id || combat.round !== detail.round) continue;
    await combat.setFlag(ID, "joyseekerAha", {sequenceKey: detail.sequenceKey, ahaId: current.id, round: combat.round, critical: true});
    if (yes) for (const ally of friends(actor).filter(isElationActor)) await energy(ally, Math.max(0, 5 + Math.floor((number(cfg(ally).regenScore) - 10) / 2)));
    await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}), content: `<article class="tsru-ability-chat"><h3>${esc(c.item.name)}</h3><img src="${esc(c.image)}" style="max-height:180px"><p>${esc(c.description)}</p><strong>${yes ? "SECOND AHA CRITICAL INSTANCE: Elation teammates gain Energy." : "AHA INSTANT CAN NOW CRIT"}</strong><p>All Elation Action damage is doubled for this Aha sequence.</p></article>`});
  }
}
export function handle(type, detail = {}, eventKey = "") {
  if (!auth()) return;
  return enqueue(async () => {
    const combat = detail.combat ?? game.combat;
    if (!combat) return;
    const stored = clone(combat.getFlag(ID, "lightConeProcessed") ?? []),
      key = type + ":" + eventKey;
    if (eventKey && stored.includes(key)) return;
    if (eventKey) {
      stored.push(key);
      await combat.setFlag(ID, "lightConeProcessed", stored.slice(-300));
    }
    const a = detail.sourceActor;
    if (type === "ahaInstant") { await joyseekerAha(combat, detail); return; }
    if (type === "combatStart") {
      for (const actor of combatActors()) {
        await actor.unsetFlag(ID, FLAG);
        const s = runtime(actor);
        s.stacks.farCooldown = -3;
        s.stacks.sleepCooldown = -3;
        s.stacks.textureCooldown = -3;
        await save(actor, s);
        await dispatch(actor, { type: "start" });
      }
      const current = combat.combatant;
      if (current?.actor && !synthetic(current))
        await beginTurn(current.actor, turnKey());
      return;
    }
    if (type === "combatEnd") {
      await restoreInitiative(combat);
      for (const actor of new Set(
        combat.combatants.map((c) => c.actor).filter(Boolean),
      ))
        await actor.unsetFlag(ID, FLAG);
      refreshActors();
      return;
    }
    if (type === "turnStart") {
      await initiatives(combat);
      if (a && !synthetic(detail.combatant)) await beginTurn(a, eventKey);
      return;
    }
    if (type === "turnEnd") {
      if (a && !synthetic(detail.combatant)) await endTurn(a);
      return;
    }
    if (type === "lightConeWorkflowResolved" && a) {
      const w = detail.workflow,
        tagged = category(detail.item, detail.activity);

      const pending = runtime(a).buttonAction,
        cat =
          pending?.category === tagged && Date.now() - pending.time < 60000
            ? null
            : tagged;
      if (cat === null && pending) {
        const current = runtime(a);
        delete current.buttonAction;
        await save(a, current);
      }
      const hit = resolveTargets(detail.hitTargets),
        all = resolveTargets(detail.targets),
        support = all.filter((t) => friends(a).includes(t));
      await dispatch(a, {
        type: "attack",
        category: cat,
        targets: hit,
        support,
        critical: Boolean(w?.isCritical),
        damageType:
          w?.damageRolls?.[0]?.options?.type ?? w?.damageRoll?.options?.type,
      });
      if(cat===null && pending)await dispatch(a,{type:'targetResolution',category:tagged,targets:hit,support,supportHandled:pending.supportHandled,energySpent:tagged==='ultimate'?cfg(a).max:0});
      const owner = a.getFlag(ID, "lightConeOwner")
        ? await fromUuid(a.getFlag(ID, "lightConeOwner"))
        : null;
      if (owner)
        await dispatch(owner, {
          type: cat === "skill" ? "spriteSkill" : "spriteAttack",
          category: null,
          targets: hit,
          support,
        });
      for (const t of hit)
        if (hpRatio(t) <= 0) await dispatch(a, { type: "kill", other: t });
      return;
    }
    // Existing resource-button scripts are classified separately from tagged activity workflows.
    if (["skillUsed", "ultimateUsed"].includes(type) && a) {
      const requester=game.users.get?.(detail.requestingUserId)??game.user;
      const selected=globalThis.canvas?.tokens?.placeables?.filter(t=>t.targeted?.has(requester))??[...(requester.targets??[])];
      const targets = resolveTargets(selected),
        support = targets.filter((t) => friends(a).includes(t));
      const state = runtime(a);
      state.buttonAction = {
        category: type === "skillUsed" ? "skill" : "ultimate",
        time: Date.now(),supportHandled:support.length>0,
      };
      await save(a, state);
      await dispatch(a, {
        type: "ability",
        category: type === "skillUsed" ? "skill" : "ultimate",
        targets: [],
        support,
        energySpent: type === "ultimateUsed" ? cfg(a).max : 0,
      });
      return;
    }
    if (type === "toughnessBreak" && a && detail.targetActor)
      await dispatch(a, { type: "break", other: detail.targetActor });
    if (type === "damageTaken" && detail.targetActor && detail.amount > 0)
      await dispatch(detail.targetActor, {
        type: "hurt",
        amount: detail.amount,
        other: a,
      });
    if (type === "healingResolved" && a && detail.targetActor) {
      await dispatch(a, {
        type: "heal",
        other: detail.targetActor,
        amount: detail.amount,
      });
      await dispatch(detail.targetActor, {
        type: "healed",
        other: a,
        amount: detail.amount,
      });
    }
    if (type === "shieldResolved" && a && detail.targetActor)
      await dispatch(a, { type: "shield", other: detail.targetActor });
    if (type === "skillPointsChanged") {
      const before = number(detail.before),
        after = number(detail.after),
        actor = detail.sourceActor ?? game.combat.combatant?.actor;
      if (actor && after < before)
        await dispatch(actor, { type: "spSpent", amount: before - after });
      if (after > before)
        for (const actor of combatActors())
          await dispatch(actor, { type: "spRestored", amount: after - before });
    }
  });
}
const synthetic = (c) =>
  Boolean(
    c?.getFlag(ID, "temporaryUltimate") ||
      c?.getFlag(ID, "actionAdvance") ||
      c?.getFlag(ID, "elationActionCombatant") ||
      c?.getFlag(ID, "talentTurnCombatant") ||
      !c?.actor,
  );
async function beginTurn(a, key) {
  const s = runtime(a);
  if (s.lastBeginKey === key) return;
  s.lastBeginKey = key;
  for (const [k, b] of Object.entries(s.buffs ?? {}))
    if (b.expiresAtStart && b.appliedTurn !== key) {
      delete s.buffs[k];
      if (k === "elationExpiry") s.stacks.elationCharge = 0;
      if (k === "showtimeExpiry") s.stacks.showtime = 0;
    }
  s.turns++;
  await save(a, s);
  await tickDots(a, key);
  await dispatch(a, { type: "turn" });
  const owner = a.getFlag(ID, "lightConeOwner")
    ? await fromUuid(a.getFlag(ID, "lightConeOwner"))
    : null;
  if (owner) await dispatch(owner, { type: "spriteTurn" });
}
async function endTurn(a) {
  const s = runtime(a);
  for (const [k, b] of Object.entries(s.buffs ?? {})) {
    if (b.expiresAtStart || b.indefinite) continue;
    b.remaining--;
    if (b.remaining <= 0) {
      delete s.buffs[k];
      if (k === "firedanceExpiry") s.stacks.firedance = 0;
      if (k === "elationExpiry") s.stacks.elationCharge = 0;
      if (k === "showtimeExpiry") s.stacks.showtime = 0;
      if (k === "textureShield")
        await a.update({ "system.attributes.hp.temp": 0 });
    }
  }
  for (const [k, m] of Object.entries(s.marks ?? {}))
    if (--m.remaining <= 0) delete s.marks[k];
  s.stacks.goodFortune = 0;
  s.stacks.luminflux = Math.max(0, number(s.stacks.luminflux) - 1);
  await save(a, s);
}
function prepared(a) {
  if (!api || !game.combat?.started) return;
  const o = snapshot(a);
  a._lightConeStats = o;
  const attr = a.system?.attributes;
  if (!attr) return;
  attr.ac.value += number(o.ac);
  attr.hp.max += number(o.maxHP);
  attr.movement.walk += number(o.speed);
  for (const b of Object.values(a.system.bonuses ?? {}))
    if (b && "attack" in b && o.attack)
      b.attack = `(${b.attack || 0}) + ${o.attack}`;
  for (const v of Object.values(a.system.abilities ?? {}))
    if (v.save && typeof v.save === "object") v.save.total += number(o.save);
    else if (typeof v.save === "number") v.save += number(o.save);
  if (attr.spell) attr.spell.dc += number(o.effectHit);
  for (const k of ["msak", "rsak"]) {
    const b = a.system.bonuses?.[k];
    if (b && o.effectHit) b.attack = `(${b.attack || 0}) + ${o.effectHit}`;
  }
  for (const m of marks(a)) {
    if (m.source) {
      const source = combatActors().find((x) => x.uuid === m.source);
      if (!source || cone(source)?.catalogId !== m.cone) continue;
    }
    attr.ac.value += number(m.stats?.ac);
    attr.movement.walk += number(m.stats?.speed);
  }
  attr.movement.walk = Math.max(0, attr.movement.walk);
}
function sourceFromOptions(options) {
  return (
    options.workflow?.actor ??
    options.sourceActor ??
    (options.midi?.sourceActorUuid || options.sourceActorUuid
      ? fromUuidSync(options.midi?.sourceActorUuid ?? options.sourceActorUuid)
      : null) ??
    options.item?.actor ??
    options.originatingMessage?.system?.activity?.actor
  );
}
function calculateBonus(target, damages, options) {
  if (!game.combat?.started || options.lightConeDot || options.lightConeExtra)
    return;
  const workflow =
      options.workflow ??
      globalThis.MidiQOL?.Workflow?.getWorkflow(options.midi?.workflowId),
    source = sourceFromOptions(options) ?? workflow?.actor,
    item = workflow?.item ?? options.item,
    cat = category(item, workflow?.activity);
  if (!source) return;
  const healing = damages.find(
      (d) => d.type === "healing" && number(d.value) > 0,
    ),
    shield = damages.find((d) => d.type === "temphp" && number(d.value) > 0);
  if (healing) {
    healing.value +=
      number(snapshot(source, target, { category: cat }).healing) +
      number(snapshot(target).incomingHealing);
    return;
  }
  if (shield) {
    shield.value += number(snapshot(source, target, { category: cat }).shield);
    return;
  }
  const first = damages.find(
    (d) => number(d.value) > 0 && CONFIG.DND5E.damageTypes[d.type],
  );
  if (!first) return;
  const o = snapshot(source, target, { category: cat }),
    crit = Boolean(workflow?.isCritical || options.isCritical);
  let bonus = number(o.damage) + (crit ? number(o.critDamage) : 0);
  if (bonus) first.value += bonus;
  if (cat === "elation" && isElationActor(source) && joyseekerActive()) {
    for (const damage of damages) if (number(damage.value) > 0 && CONFIG.DND5E.damageTypes[damage.type]) damage.value *= 2;
  }
}
function rollCrit(config) {
  const a = config.subject?.actor;
  if (!a || !game.combat?.started || !config.rolls?.[0]) return;
  const targets = resolveTargets([...game.user.targets]),
    t = targets.length === 1 ? targets[0] : null,
    o = snapshot(a, t, {
      category: category(config.subject?.item, config.subject),
    });
  const options = (config.rolls[0].options ??= {});
  const additional = number(o.attack) - number(a._lightConeStats?.attack);
  config.rolls[0].parts ??= [];
  if (additional) config.rolls[0].parts.push(String(additional));
  const conditionalHit =
    number(o.effectHit) - number(a._lightConeStats?.effectHit);
  if (conditionalHit) config.rolls[0].parts.push(String(conditionalHit));
  if (o.crit && !Number.isFinite(a.getFlag(ID, "combatStatBuffs")?.threshold)) {
    const base = number(
      options.criticalSuccess ?? config.subject.criticalThreshold ?? 20,
    );
    options.criticalSuccess = Math.min(base, Math.max(o.critFloor ?? 15, base - o.crit));
  }
  if (
    marks(a).some(
      (m) =>
        m.tag === "provoke" &&
        m.source &&
        !targets.some((t) => t.uuid === m.source),
    )
  )
    options.disadvantage = true;
}
const friendlyLabel = value => ({windShear:"Wind Shear", enhancedBasic:"Enhanced Basic", followup:"Follow-up", reducedAC:"Reduced AC", implantedWeakness:"Implanted Weakness"}[value] ?? String(value).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase()));
const panelTips = {
  target: "The active combatant receiving the damage or condition. Damage is applied to this creature, not the source.",
  source: "The combatant who caused the DoT. Their equipped, matching-Path Light Cone can extend its initial duration or upgrade its damage die. Choose no source to use base damage only.",
  type: "The DoT identity used by Light Cone conditions: Burn, Shock, Bleed, Wind Shear or Custom. This does not set the damage attribute.",
  attribute: "The damage type passed to the creature’s damage handling, including its resistances and immunities. This is independent of the DoT identity.",
  dice: "Number of dice rolled on each tick, from 1 to 20. For example, 2 dice with d6 rolls 2d6 each turn. DoTs cannot critically hit.",
  die: "Base die rolled for each damage die. Eligible source Light Cones can upgrade it: d4 → d6 → d8 → d10 → d12. The live upgrade is recalculated each tick.",
  turns: "Number of affected-creature turn starts that will deal damage, from 1 to 100. The first tick is on its next eligible turn start. Source duration bonuses apply when assigned. Zero removes a matching DoT without rolling.",
  condition: "Reduced AC subtracts the magnitude from AC; Slowed subtracts it from walking speed in feet. Implanted Weakness and Other Debuff are tracked tags for cone checks; they do not add native weaknesses or penalties themselves.",
  magnitude: "Amount subtracted for Reduced AC (AC points) or Slowed (feet). Other tracked condition types ignore this number.",
};
function explainPanel(html) {
  for (const [name, tip] of Object.entries(panelTips)) {
    const input = html.find(`[name="${name}"]`);
    input.attr("title", tip).attr("aria-label", `${friendlyLabel(name)}. ${tip}`);
    input.closest("label").attr("title", tip);
  }
  const detailTips = {
    "[data-duration]": "Remaining damage ticks on this creature’s future turn starts. Changing this does not reapply source duration bonuses. Set zero to remove.",
    "[data-remove-dot]": "Remove this DoT immediately, without rolling more damage.",
    "[data-remove-mark]": "Remove this tracked condition and its associated penalty immediately.",
    "[data-hp-consent]": "Allow Light Cones with ally HP costs to use this actor as a consenting participant. It does not spend HP by itself.",
    "[data-cone-option=hpCost]": "Optional HP paid by this actor for supported HP-sacrifice cone interactions. Disabled means no optional sacrifice.",
    "[data-cone-option=trailblazer]": "Identify the Trailblazer for cones whose effect depends on that character. No automatic name detection is used.",
    "[data-cone-option=breakPartner]": "Choose the ally used by this cone’s Break Effect partner rule. Automatic selection uses the highest Break Effect ally.",
    "[data-category]": "Classify this ability for Light Cone triggers. Unclassified does not trigger category-specific rules. Basic, Enhanced Basic, Skill, Ultimate, Follow-up, Elation and Break are distinct tags.",
    "[data-owner]": "For a memosprite actor, select its summoner so summon, turn and attack events can reach the owner’s Light Cone. For ordinary characters choose Not a memosprite.",
  };
  for (const [selector, tip] of Object.entries(detailTips)) {
    html.find(selector).attr("title", tip).closest("label").attr("title", tip);
  }
}
export async function openPanel() {
  if (!game.user.isGM) return;
  const actors = combatActors();
  if (!game.combat?.started || !actors.length)
    return ui.notifications.warn("Start combat to assign damage over time.");
  let dlg;
  const options = actors
    .map((a) => `<option value="${esc(a.uuid)}">${esc(a.name)}</option>`)
    .join("");
  const build = () =>
    `<form><p class="tsru-panel-hint">DoT means damage over time. Assign a target, damage and duration; the engine rolls and applies damage at that creature’s turn start. Effects clear after their last tick.</p><h3>Apply damage over time</h3><label>Target<select name="target">${options}</select></label><label>Source<select name="source"><option value="">No source / base damage only</option>${options}</select></label><label>DoT type<select name="type">${["custom", "burn", "shock", "bleed", "windShear"].map((x) => `<option value="${x}">${friendlyLabel(x)}</option>`).join("")}</select></label><label>Damage attribute<select name="attribute">${Object.entries(
      CONFIG.DND5E.damageTypes,
    )
      .map(
        ([k, v]) =>
          `<option value="${esc(k)}">${esc(game.i18n.localize(v.label ?? v))}</option>`,
      )
      .join(
        "",
      )}</select></label><label>Dice count<input name="dice" type="number" min="1" max="20" value="1"></label><label>Die size<select name="die">${DICE.map((d) => `<option value="${d}">d${d}</option>`).join("")}</select></label><label>Turn count<input name="turns" type="number" min="0" max="100" value="1"></label><button type="button" data-dot-apply>Apply DoT</button><h3>Tracked conditions</h3><label>Condition<select name="condition"><option value="reducedAC">Reduced AC</option><option value="slowed">Slowed</option><option value="implantedWeakness">Implanted weakness</option><option value="debuff">Other debuff</option></select></label><label>Penalty magnitude<input name="magnitude" type="number" value="1" min="0"></label><button type="button" data-condition-apply>Assign condition (uses target and turn count)</button><h3>Current effects</h3>${actors
      .map((a) => {
        const s = runtime(a),
          c = cone(a);
        return `<details><summary>${esc(a.name)} — ${esc(c?.item?.name ?? "No eligible cone")}</summary><h4 title="Counts stored by this actor’s Light Cone. Cooldown counters record the actor turn when an effect last triggered; other counts track progress or stacks.">Light Cone counters</h4><div class="tsru-effect-counters">${Object.entries(s.stacks ?? {}).map(([key,value]) => `<span title="${esc(key.endsWith('Cooldown') ? 'Actor turn count when this cooldown last triggered. A negative starting value makes the effect initially available.' : 'Stored stack or progress count used by this Light Cone’s rules.')}" >${esc(friendlyLabel(key))}: <b>${esc(value)}</b></span>`).join('') || '<span>No counters yet.</span>'}</div><h4>Active DoTs</h4>${(s.dots ?? []).map((d) => `<p><span title="DoT identity used for Light Cone rules; it is independent of the damage attribute.">${esc(friendlyLabel(d.type))}</span> · <span title="Base dice rolled each tick. Source Light Cone die upgrades are applied live when the tick rolls.">${d.dice}d${d.die}</span> <span title="Damage attribute used for resistance and immunity calculations.">${esc(friendlyLabel(d.attribute))}</span> · <span title="Number of future damage ticks remaining on this creature. The DoT clears after its final tick.">${d.remaining} ticks left</span> <input data-duration="${d.id}" data-actor="${esc(a.uuid)}" type="number" value="${d.remaining}" min="0" max="100" style="width:60px"><button type="button" data-remove-dot="${d.id}" data-actor="${esc(a.uuid)}">Remove</button></p>`).join("")}${Object.entries(
          s.marks ?? {},
        )
          .map(
            ([key, m]) =>
              `<p title="${esc(Object.entries(m.stats ?? {}).map(([k,v]) => `${friendlyLabel(k)}: ${v}`).join('; ') || 'Tracked debuff tag only; no automatic stat penalty.')}">${esc(friendlyLabel(m.tag))} · ${m.remaining} turns <button type="button" data-remove-mark="${esc(key)}" data-actor="${esc(a.uuid)}">Remove</button></p>`,
          )
          .join(
            "",
          )}<h4 title="Temporary stat bonuses granted by Light Cones. Remaining duration counts affected-character turns. Some named cone effects expire at the next turn start instead of turn end; a combat-duration effect lasts until combat ends or its source becomes ineligible.">Active Light Cone buffs</h4>${Object.entries(s.buffs ?? {}).map(([key,b]) => `<p title="${esc(Object.entries(b.stats ?? {}).map(([k,v]) => `${friendlyLabel(k)}: ${v}`).join('; '))}">${esc(friendlyLabel(key))} · ${b.indefinite ? 'For this combat' : `${b.remaining} turns remaining`}</p>`).join('') || '<p class="tsru-panel-hint">No active timed buffs.</p>'}<h4>Cone options</h4><label>Consent to ally HP-cost interactions<input type="checkbox" data-hp-consent="${esc(a.uuid)}" ${a.getFlag(ID, "lightConeHPConsent") ? "checked" : ""}></label><label>HP sacrifice cost<select data-cone-option="hpCost" data-actor="${esc(a.uuid)}">${[0, 2, 4].map((n) => `<option value="${n}" ${number(a.getFlag(ID, "lightConeSettings")?.hpCost) === n ? "selected" : ""}>${n === 0 ? "Disabled" : n + " HP"}</option>`).join("")}</select></label><label>Trailblazer gate<select data-cone-option="trailblazer" data-actor="${esc(a.uuid)}"><option value="">Not configured</option>${actors.map((b) => `<option value="${esc(b.uuid)}" ${a.getFlag(ID, "lightConeSettings")?.trailblazer === b.uuid ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</select></label><label>Break partner<select data-cone-option="breakPartner" data-actor="${esc(a.uuid)}"><option value="">Highest Break Effect ally</option>${friends(
          a,
        )
          .filter((b) => b !== a)
          .map(
            (b) =>
              `<option value="${esc(b.uuid)}" ${a.getFlag(ID, "lightConeSettings")?.breakPartner === b.uuid ? "selected" : ""}>${esc(b.name)}</option>`,
          )
          .join("")}</select></label><h4>Ability category tags</h4>${[
          ...a.items,
        ]
          .filter((i) => i.type !== "loot")
          .map(
            (i) =>
              `<label>${esc(i.name)}<select data-category="${esc(i.uuid)}"><option value="">Unclassified</option>${["basic", "enhancedBasic", "skill", "ultimate", "followup", "elation", "break"].map((t) => `<option value="${t}" ${i.getFlag(ID, "lightConeCategory") === t ? "selected" : ""}>${friendlyLabel(t)}</option>`).join("")}</select></label>`,
          )
          .join(
            "",
          )}<label>Memosprite owner<select data-owner="${esc(a.uuid)}"><option value="">Not a memosprite</option>${actors
          .filter((b) => b !== a)
          .map(
            (b) =>
              `<option value="${esc(b.uuid)}" ${a.getFlag(ID, "lightConeOwner") === b.uuid ? "selected" : ""}>${esc(b.name)}</option>`,
          )
          .join("")}</select></label></details>`;
      })
      .join("")}</form>`;
  dlg = new Dialog(
    {
      title: "Light Cones & Damage Over Time",
      content: build(),
      buttons: { close: { label: "Close" } },
      render: (html) => {
        explainPanel(html);
        html.find("[data-dot-apply]").on("click", () =>
          enqueue(async () => {
            const val = (n) => html.find(`[name="${n}"]`).val(),
              t = await fromUuid(val("target")),
              source = val("source") ? await fromUuid(val("source")) : null;
            await applyDot(t, {
              source,
              type: val("type"),
              attribute: val("attribute"),
              dice: val("dice"),
              die: val("die"),
              turns: val("turns"),
            });
            dlg.data.content = build();
            dlg.render(false);
          }),
        );
        html.find("[data-condition-apply]").on("click", () =>
          enqueue(async () => {
            const a = await fromUuid(html.find('[name="target"]').val()),
              s = runtime(a),
              tag = html.find('[name="condition"]').val(),
              n = Math.max(0, number(html.find('[name="turns"]').val())),
              m = Math.abs(number(html.find('[name="magnitude"]').val()));
            s.marks["gm:" + tag] = {
              tag,
              source: null,
              remaining: n,
              stats:
                tag === "reducedAC"
                  ? { ac: -m }
                  : tag === "slowed"
                    ? { speed: -m }
                    : {},
            };
            await save(a, s);
            dlg.data.content = build();
            dlg.render(false);
          }),
        );
        html.find("[data-remove-dot],[data-remove-mark]").on("click", (e) =>
          enqueue(async () => {
            const b = e.currentTarget,
              a = await fromUuid(b.dataset.actor),
              s = runtime(a);
            if (b.dataset.removeDot)
              s.dots = s.dots.filter((d) => d.id !== b.dataset.removeDot);
            if (b.dataset.removeMark) delete s.marks[b.dataset.removeMark];
            await save(a, s);
            dlg.data.content = build();
            dlg.render(false);
          }),
        );
        html.find("[data-duration]").on("change", (e) =>
          enqueue(async () => {
            const b = e.currentTarget,
              a = await fromUuid(b.dataset.actor),
              s = runtime(a),
              d = s.dots.find((d) => d.id === b.dataset.duration);
            if (d) {
              d.remaining = Math.min(
                100,
                Math.max(0, Math.floor(number(b.value))),
              );
              s.dots = s.dots.filter((d) => d.remaining > 0);
              await save(a, s);
            }
          }),
        );
        html.find("[data-category]").on("change", async (e) => {
          const i = await fromUuid(e.currentTarget.dataset.category);
          await i.setFlag(ID, "lightConeCategory", e.currentTarget.value);
        });
        html.find("[data-hp-consent]").on("change", async (e) => {
          const a = await fromUuid(e.currentTarget.dataset.hpConsent);
          await a.setFlag(ID, "lightConeHPConsent", e.currentTarget.checked);
        });
        html.find("[data-cone-option]").on("change", async (e) => {
          const b = e.currentTarget,
            a = await fromUuid(b.dataset.actor),
            old = a.getFlag(ID, "lightConeSettings") ?? {};
          await a.setFlag(ID, "lightConeSettings", {
            ...old,
            [b.dataset.coneOption]:
              b.dataset.coneOption === "hpCost" ? Number(b.value) : b.value,
          });
        });
        html.find("[data-owner]").on("change", async (e) => {
          const a = await fromUuid(e.currentTarget.dataset.owner);
          await a.setFlag(ID, "lightConeOwner", e.currentTarget.value);
        });
      },
    },
    {
      width: 640,
      height: 700,
      resizable: true,
      classes: ["tsru-light-cone-controls"],
    },
  );
  dlg.render(true);
}
export function installLightCones(moduleApi) {
  api = moduleApi;
  const proto = CONFIG.Actor.documentClass.prototype;
  if (!proto._tsruConePrepare) {
    const original = proto.prepareData;
    Object.defineProperty(proto, "_tsruConePrepare", { value: true });
    proto.prepareData = function (...args) {
      const result = original.apply(this, args);
      prepared(this);
      for (const item of this.items ?? []) item.prepareFinalAttributes?.();
      return result;
    };
  }
  const registerCrit = () => Hooks.on("dnd5e.preRollAttackV2", rollCrit);
  if (game.modules.get("telys-planar-ornaments")?.active) {
    const timer = setInterval(() => {
      if (window.TelysPlanar) {
        clearInterval(timer);
        registerCrit();
      }
    }, 100);
  } else registerCrit();
  Hooks.on("dnd5e.preCalculateDamage", calculateBonus);
  Hooks.on("dnd5e.calculateDamage", (a, damages) => {
    if (damages.amount > 0)
      damages.amount = Math.max(
        0,
        damages.amount - number(snapshot(a).reduction),
      );
  });
  Hooks.on("renderDMCombatMenu", (app, html) => {
    html.find("[data-dm-dot-panel]").on("click", openPanel);
  });
  Hooks.on("updateActor", (a, change) => {
    if (
      change.flags?.[ID]?.selectedLightConeItemId !== undefined ||
      Object.keys(change).some((k) => k.includes("selectedLightConeItemId"))
    ) {
      refreshActors();
      if (auth())
        enqueue(async () => {
          const c = game.combat?.combatants.find(
              (c) => c.actor?.uuid === a.uuid,
            ),
            f = c?.getFlag(ID, "lightConeInitiative");
          if (f)
            await c.update(
              {
                ...(f.active
                  ? { initiative: number(c.initiative) - f.bonus }
                  : {}),
                [`flags.${ID}.-=lightConeInitiative`]: null,
              },
              { lightConeInitiative: true },
            );
          const state = runtime(a);
          state.stacks = {};
          state.buffs = Object.fromEntries(
            Object.entries(state.buffs ?? {}).filter(
              ([, b]) => b.source !== a.uuid,
            ),
          );
          await save(a, state);
        });
    }
  });
  Hooks.on("deleteItem", refreshActors);
  Hooks.on("deleteCombat", (combat) => {
    if (auth())
      enqueue(async () => {
        await restoreInitiative(combat);
        for (const actor of combat.combatants
          .map((c) => c.actor)
          .filter(Boolean))
          await actor.unsetFlag(ID, FLAG);
      });
  });
  Hooks.on("midi-qol.preItemRoll", async (w) => {
    const a = w.actor,
      cat = category(w.item, w.activity);
    if (
      !a?.isOwner ||
      cone(a)?.id !== 46 ||
      !["skill", "ultimate"].includes(cat)
    )
      return;
    const state = runtime(a);
    if (
      state.buttonAction?.category === cat &&
      Date.now() - state.buttonAction.time < 60000
    )
      return;
    await event(a, { type: "preAction", category: cat });
    const next = runtime(a);
    next.buttonAction = { category: cat, time: Date.now() };
    await save(a, next);
  });
  Hooks.on("midi-qol.RollComplete", (w) =>
    handle(
      "lightConeWorkflowResolved",
      {
        sourceActor: w.actor,
        item: w.item,
        activity: w.activity,
        workflow: w,
        targets: [...(w.targets ?? [])],
        hitTargets: [...(w.hitTargets ?? [])],
      },
      w.uuid ?? w.id,
    ),
  );
  const spriteEvent = (cb, type) => {
    const a = cb?.actor,
      ownerId = a?.getFlag(ID, "lightConeOwner");
    if (auth() && ownerId)
      enqueue(async () => {
        const owner = await fromUuid(ownerId);
        if (owner) await dispatch(owner, { type });
      });
  };
  Hooks.on("createCombatant", (cb) => spriteEvent(cb, "summon"));
  Hooks.on("deleteCombatant", (cb) => spriteEvent(cb, "unsummon"));
  Hooks.on("updateActor", (a, change, options) => {
    if (auth() && options?.lightConeHPSpend)
      enqueue(async () => {
        for (const wearer of friends(a).filter((t) => t !== a))
          await dispatch(wearer, {
            type: "allySpentHP",
            other: a,
            ...options.lightConeHPSpend,
          });
      });
    const newOwner =
      change.flags?.[ID]?.lightConeOwner ??
      change[`flags.${ID}.lightConeOwner`];
    if (auth() && newOwner && combatActors().includes(a))
      enqueue(async () => {
        const owner = await fromUuid(newOwner);
        if (owner) await dispatch(owner, { type: "summon" });
      });
  });
  api.openLightConeCombatPanel = openPanel;
  Hooks.on("dnd5e.preApplyDamage", (a, amount, updates, options) => {
    options.lightConeBeforeHP = number(a.system.attributes.hp.value);
    options.lightConeBeforeTemp = number(a.system.attributes.hp.temp);
  });
  Hooks.on("dnd5e.applyDamage", (a, amount, updates, options) => {
    const source = sourceFromOptions(options ?? {});
    if (!auth() || !source) return;
    const gained = Math.max(
      0,
      number(a.system.attributes.hp.value) - number(options.lightConeBeforeHP),
    );
    if (gained)
      handle(
        "healingResolved",
        { sourceActor: source, targetActor: a, amount: gained },
        (options.midi?.workflowId ?? foundry.utils.randomID()) + a.uuid,
      );
    if (
      number(a.system.attributes.hp.temp) > number(options.lightConeBeforeTemp)
    )
      handle(
        "shieldResolved",
        { sourceActor: source, targetActor: a },
        (options.midi?.workflowId ?? foundry.utils.randomID()) + a.uuid,
      );
  });
  api.lightCones = {
    snapshot,
    applyDot,
    event: (a, e) => enqueue(() => dispatch(a, e)),
  };
  fetch(`modules/${ID}/data/light-cones.json`)
    .then((r) => r.json())
    .then((data) => (catalog = data));
  refreshActors();
}
Hooks.once("init", () => {
  CONFIG.DND5E.lootTypes ??= {};
  CONFIG.DND5E.lootTypes.lightCone = { label: "Light Cone" };
});

export function lightConeSkillCapacity() {
  if (!game.combat?.started) return 0;
  let bonus = 0,
    seen = new Set();
  for (const a of combatActors()) {
    const c = cone(a);
    if (!c?.inCombat || seen.has(c.id) || hpRatio(a) <= 0) continue;
    seen.add(c.id);
    if (c.id === 138) bonus++;
    if (c.id === 32) {
      const paths = game.settings.get(ID, "paths") ?? [];
      bonus += Math.min(
        3,
        party(a).filter(
          (b) =>
            cfg(b).pathId === "elation" ||
            paths.some(
              (p) =>
                p.id === cfg(b).pathId && p.name?.toLowerCase() === "elation",
            ),
        ).length,
      );
    }
  }
  return bonus;
}
