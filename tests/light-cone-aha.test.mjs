import { test } from "node:test";
import assert from "node:assert/strict";

const ID = "telys-star-rail-ultimates";
globalThis.Hooks = { once() {}, on() {} };
globalThis.foundry = {
  utils: { deepClone: structuredClone, escapeHTML: String, randomID: () => "id" },
};
const { installLightCones, handle, joyseekerThreshold } = await import("../scripts/light-cones.mjs");

class Actor {
  constructor(id, path = "elation", element = "fire") {
    this.id = id;
    this.uuid = `Actor.${id}`;
    this.name = id;
    this.type = "character";
    this.documentName = "Actor";
    this.flags = { ultimate: { pathId: path, elementId: element, regenScore: 10, max: 100, current: 0 } };
    this.items = new Map();
    this.effects = [];
    this.statuses = new Set();
    this.sourceSystem = {
      attributes: { hp: { value: 20, max: 20, temp: 0 }, ac: { value: 10 }, movement: { walk: 30 }, prof: 2, crit: { threshold: 20 }, senses: {} },
      abilities: {}, bonuses: {},
    };
    this.system = structuredClone(this.sourceSystem);
  }
  getFlag(_, key) { return this.flags[key]; }
  async setFlag(_, key, value) { this.flags[key] = structuredClone(value); }
  async unsetFlag(_, key) { delete this.flags[key]; }
  prepareData() {
    if (this.strictSenses) Object.defineProperty(this.system.attributes.senses, "darkvision", { get: () => 0, configurable: false });
  }
  reset() {
    this.system = structuredClone(this.sourceSystem);
    this.prepareData();
  }
}

function setup() {
  const state = { prompts: [], rolls: [], chats: [], notices: [], energy: [], rollTotal: 18, answer: false, hooks: new Map(), flags: {} };
  const wearer = new Actor("wearer"), ally = new Actor("ally", "elation", "ice"), other = new Actor("other", "harmony");
  wearer.flags.selectedLightConeItemId = "cone";
  wearer.items.set("cone", {
    name: "As the Joyseeker Remembers It", type: "loot",
    getFlag: () => ({ enabled: true, catalogId: "custom-joyseeker", draftId: 171, pathId: "elation", image: "card.png", description: "Custom cone" }),
  });
  const actors = [wearer, ally, other];
  const aha = { id: "aha", getFlag: (_, key) => key === "ahaInstantCombatant" };
  const combat = {
    id: "combat", round: 1, started: true, combatant: aha,
    combatants: actors.map(actor => ({ actor, token: { disposition: 1 }, getFlag: () => null })),
    getFlag: (_, key) => state.flags[key],
    async setFlag(_, key, value) { state.flags[key] = structuredClone(value); },
  };
  globalThis.game = {
    // The combat module elects the first active GM, regardless of ID sort order.
    user: { id: "z-gm", isGM: true },
    users: [{ id: "z-gm", isGM: true, active: true }, { id: "a-gm", isGM: true, active: true }],
    actors, combat, modules: { get: () => ({ active: false }) },
    settings: { get: (_, key) => key === "paths" ? [{ id: "elation", name: "Elation" }] : key === "ahaConfig" ? { elationPathId: "elation" } : 0 },
  };
  globalThis.Hooks = { once() {}, on: (name, callback) => state.hooks.set(name, callback) };
  globalThis.CONFIG = { Actor: { documentClass: Actor }, DND5E: { damageTypes: { fire: {}, cold: {} } } };
  globalThis.ui = { notifications: Object.fromEntries(["info", "warn", "error"].map(level => [level, message => state.notices.push({ level, message })])) };
  globalThis.ChatMessage = { getSpeaker: ({ actor } = {}) => ({ actor: actor?.id }), create: async message => state.chats.push(message) };
  globalThis.Roll = class {
    constructor(formula) { this.formula = formula; this.total = state.rollTotal; }
    async evaluate() { return this; }
    async toMessage(message) { state.rolls.push({ total: this.total, ...message }); }
  };
  globalThis.Dialog = { confirm: async () => { throw Error("The Aha prompt must use DialogV2 on Foundry v14"); } };
  foundry.applications = { api: { DialogV2: { confirm: async options => { state.prompts.push(options); return state.answer; } } } };
  globalThis.fetch = async () => ({ json: async () => [] });
  const api = { getConfig: actor => actor.flags.ultimate, addEnergy: async (actor, amount) => state.energy.push({ actor: actor.id, amount }) };
  installLightCones(api);
  return { state, wearer, ally, other, actors, combat, aha, api, detail: { combat, combatant: aha, sequenceKey: "sequence", round: 1 } };
}

test("the actual Aha handler runs on the same GM as the combat module and opens a v14 modal", async () => {
  const { state, detail } = setup();
  await handle("ahaInstant", detail, "sequence");
  assert.equal(state.rolls.length, 1);
  assert.equal(state.prompts.length, 1);
  assert.equal(state.prompts[0].modal, true);
  assert.match(state.prompts[0].content, /other player/i);
  assert.equal(state.flags.joyseekerAha.critical, true);
  assert.match(state.chats[0].content, /AHA INSTANT CAN NOW CRIT/);
  await handle("ahaInstant", detail, "sequence");
  assert.equal(state.rolls.length, 1, "the same Aha sequence must not roll again");
});

test("the other GM does not duplicate the roll or popup", async () => {
  const { state, detail } = setup();
  game.user = { id: "a-gm", isGM: true };
  await handle("ahaInstant", detail, "sequence");
  assert.equal(state.rolls.length, 0);
  assert.equal(state.prompts.length, 0);
});

test("a failed d20 explains why there is no duplicate-source confirmation", async () => {
  const { state, wearer, detail } = setup();
  state.rollTotal = joyseekerThreshold(wearer) - 1;
  await handle("ahaInstant", detail, "sequence");
  assert.equal(state.rolls.length, 1);
  assert.equal(state.prompts.length, 0);
  assert.equal(state.flags.joyseekerAha.critical, false);
  assert.match(state.rolls[0].flavor, /failed/i);
});

test("a successful Yes grants base five plus each living Elation ally's own regeneration", async () => {
  const { state, wearer, ally, actors, combat, detail } = setup();
  state.answer = true;
  state.rollTotal = 18; // Exactly the effective 20 minus two distinct elements.
  wearer.flags.ultimate.regenScore = 14;
  ally.flags.ultimate.regenScore = 12;
  const fallen = new Actor("fallen", "elation", "wind");
  fallen.sourceSystem.attributes.hp.value = 0;
  fallen.reset();
  actors.push(fallen);
  combat.combatants.push({ actor: fallen, token: { disposition: 1 }, getFlag: () => null });
  await handle("ahaInstant", detail, "sequence");
  assert.deepEqual(state.energy, [{ actor: "wearer", amount: 7 }, { actor: "ally", amount: 6 }]);
  assert.equal(state.flags.joyseekerAha.critical, true);
});

test("an equipped cone with the wrong Path reports the skipped check without activating", async () => {
  const { state, wearer, detail } = setup();
  wearer.flags.ultimate.pathId = "harmony";
  await handle("ahaInstant", detail, "sequence");
  assert.equal(state.rolls.length, 0);
  assert.equal(state.prompts.length, 0);
  assert.ok(state.notices.some(n => /matching.*Elation|Elation.*Path/i.test(n.message)));
  assert.equal(state.flags.joyseekerAha.critical, false);
});

test("repeated cone refreshes rebuild the model instead of redefining prepared darkvision", async () => {
  const { state, wearer, detail } = setup();
  game.users = [game.users[0]];
  wearer.strictSenses = true;
  wearer.reset();
  // This event saves runtime state and refreshes all combat actors.
  await handle("turnStart", { ...detail, combatant: { actor: wearer, getFlag: () => null }, sourceActor: wearer }, "wearer-turn");
  await handle("turnStart", { ...detail, combatant: { actor: wearer, getFlag: () => null }, sourceActor: wearer }, "wearer-next-turn");
  assert.deepEqual(state.notices.filter(n => n.level === "error"), []);
  assert.equal(wearer.system.attributes.senses.darkvision, 0);
});

test("all damage components double only in the successful Aha sequence", async () => {
  const { state, wearer, combat, detail } = setup();
  await handle("ahaInstant", detail, "sequence");
  const calculate = state.hooks.get("dnd5e.preCalculateDamage");
  const workflow = { actor: wearer, item: { getFlag: () => "elation" } };
  const turn = sequence => ({ id: "elation-turn", getFlag: (_, key) => key === "elationActionCombatant" ? true : key === "sequenceKey" ? sequence : null });
  combat.combatant = turn("sequence");
  const damages = [{ type: "fire", value: 3 }, { type: "cold", value: 4 }];
  calculate(wearer, damages, { workflow });
  assert.deepEqual(damages.map(d => d.value), [6, 8]);
  combat.combatant = turn("next-sequence");
  const next = [{ type: "fire", value: 3 }, { type: "cold", value: 4 }];
  calculate(wearer, next, { workflow });
  assert.deepEqual(next.map(d => d.value), [3, 4]);
});
