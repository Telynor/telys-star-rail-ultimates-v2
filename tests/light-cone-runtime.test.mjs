import { test } from "node:test";
import assert from "node:assert/strict";
const ID = "telys-star-rail-ultimates";
globalThis.Hooks = { once() {}, on() {} };
globalThis.foundry = {
  utils: {
    deepClone: structuredClone,
    randomID: () => Math.random().toString(36).slice(2),
    escapeHTML: String,
  },
};
globalThis.CONFIG = {
  DND5E: {
    damageTypes: { fire: { label: "Fire" }, lightning: { label: "Lightning" } },
  },
};
globalThis.ChatMessage = { getSpeaker: () => ({}) };
const formulas = [];
globalThis.Roll = class {
  constructor(formula) {
    this.formula = formula;
    formulas.push(formula);
    this.total = 3;
  }
  async evaluate() {
    return this;
  }
  async toMessage() {}
};
function actor(id, path = "nihility") {
  const flags = {
      ultimate: { pathId: path, max: 100, current: 0 },
      selectedLightConeItemId: "cone",
    },
    a = {
      uuid: "Actor." + id,
      documentName: "Actor",
      type: "character",
      system: {
        attributes: {
          hp: { value: 20, max: 20, temp: 0 },
          ac: { value: 10 },
          movement: { walk: 30 },
          prof: 2,
        },
        abilities: { cha: { mod: 2 } },
      },
      items: new Map(),
      effects: [],
      statuses: new Set(),
      getFlag: (_, k) => flags[k],
      async setFlag(_, k, v) {
        flags[k] = structuredClone(v);
      },
      async unsetFlag(_, k) {
        delete flags[k];
      },
      prepareData() {},
      calls: [],
      async applyDamage(d, o) {
        this.calls.push({ d, o });
        this.system.attributes.hp.value -= d[0].value;
      },
      async update(d) {
        for (const [k, v] of Object.entries(d)) {
          if (k === "system.attributes.hp.value")
            this.system.attributes.hp.value = v;
        }
      },
      flags,
    };
  return a;
}
const source = actor("source"),
  target = actor("target");
source.items.set("cone", {
  type: "loot",
  getFlag: () => ({
    enabled: true,
    catalogId: "21004",
    draftId: 42,
    pathId: "nihility",
  }),
});
const actors = [source, target];
globalThis.game = {
  user: { id: "gm", isGM: true },
  users: [{ id: "gm", active: true, isGM: true }],
  combat: {
    id: "combat",
    started: true,
    round: 1,
    combatant: { id: "t", actor: target, getFlag: () => null },
    combatants: actors.map((a) => ({
      id: a.uuid,
      actor: a,
      getFlag: () => null,
    })),
  },
  settings: { get: () => 0 },
};
globalThis.fromUuid = async (uuid) => actors.find((a) => a.uuid === uuid);
const { applyDot, tickDots, initiatives, restoreInitiative } = await import(
  "../scripts/light-cones.mjs"
);
test("DoT snapshots duration, inherits live die upgrade, ticks once, and clears exactly", async () => {
  await applyDot(target, {
    source,
    type: "burn",
    attribute: "fire",
    dice: 1,
    die: 4,
    turns: 2,
  });
  assert.equal(target.flags.lightConeRuntime.dots[0].remaining, 2);
  await tickDots(target, "combat:1:other");
  assert.equal(target.calls.length, 1);
  assert.equal(formulas.at(-1), "1d6[fire]");
  assert.equal(target.calls[0].d[0].type, "fire");
  assert.equal(target.flags.lightConeRuntime.dots[0].remaining, 1);
  await tickDots(target, "combat:1:other");
  assert.equal(target.calls.length, 1);
  source.flags.selectedLightConeItemId = null;
  await tickDots(target, "combat:2:other");
  assert.equal(target.calls.length, 2);
  assert.equal(formulas.at(-1), "1d4[fire]");
  assert.equal(target.flags.lightConeRuntime.dots.length, 0);
});
test("zero turns removes without rolling, refresh never adds duration every tick", async () => {
  source.flags.selectedLightConeItemId = "cone";
  await applyDot(target, {
    source,
    type: "shock",
    attribute: "lightning",
    turns: 2,
  });
  await applyDot(target, {
    source,
    type: "shock",
    attribute: "lightning",
    turns: 1,
  });
  assert.equal(target.flags.lightConeRuntime.dots[0].remaining, 2);
  const calls = target.calls.length;
  await applyDot(target, {
    source,
    type: "shock",
    attribute: "lightning",
    turns: 0,
  });
  assert.equal(target.flags.lightConeRuntime.dots.length, 0);
  assert.equal(target.calls.length, calls);
});
test("pending damage application is fail-closed after an interrupted tick", async () => {
  await applyDot(target, { source, type: "burn", attribute: "fire", turns: 1 });
  target.flags.lightConeRuntime.dots[0].pendingTick = "interrupted";
  const calls = target.calls.length;
  await tickDots(target, "new-turn");
  assert.equal(target.calls.length, calls);
  assert.equal(target.flags.lightConeRuntime.dots[0].remaining, 1);
});
test("temporary initiative is removed without overwriting a subsequent GM adjustment", async () => {
  let f = { bonus: 2, round: 2, active: false };
  const c = {
    initiative: 10,
    getFlag: () => f,
    async update(d) {
      if ("initiative" in d) this.initiative = d.initiative;
      if (d[`flags.${ID}.lightConeInitiative.active`]) f.active = true;
      if (`flags.${ID}.-=lightConeInitiative` in d) f = null;
    },
  };
  const combat = { round: 1, combatants: [c] };
  await initiatives(combat);
  assert.equal(c.initiative, 10);
  combat.round = 2;
  await initiatives(combat);
  assert.equal(c.initiative, 12);
  c.initiative = 20;
  combat.round = 3;
  await initiatives(combat);
  assert.equal(c.initiative, 18);
  assert.equal(f, null);
  f = { bonus: 2, round: 4, active: false };
  await restoreInitiative(combat);
  assert.equal(c.initiative, 18);
  assert.equal(f, null);
});

test("Joyseeker uses distinct living Elation elements, sheet threshold and a successful GM prompt", async () => {
  const {joyseekerThreshold,joyseekerAha} = await import('../scripts/light-cones.mjs');
  const oldCombat=game.combat, oldCreate=ChatMessage.create;
  const wearer=actor('joy','elation'), ally=actor('ally','elation'), duplicate=actor('duplicate','elation'), fallen=actor('fallen','elation');
  for (const [a,element] of [[wearer,'fire'],[ally,'ice'],[duplicate,'ice'],[fallen,'wind']]) a.flags.ultimate.elementId=element;
  wearer.name='Wearer'; wearer.system.attributes.crit={threshold:19}; fallen.system.attributes.hp.value=0;
  wearer.items.set('cone',{name:'As the Joyseeker Remembers It',type:'loot',getFlag:()=>({enabled:true,catalogId:'custom-joyseeker',draftId:171,pathId:'elation',image:'card.png',description:'Custom cone'})});
  const flags={},aha={id:'aha',getFlag:()=>true};
  game.combat={id:'joycombat',round:1,started:true,combatant:aha,combatants:[wearer,ally,duplicate,fallen].map(a=>({actor:a,getFlag:()=>null})),getFlag:(_,k)=>flags[k],setFlag:async(_,k,v)=>{flags[k]=v}};
  const chats=[];ChatMessage.create=async msg=>chats.push(msg);let prompts=0;globalThis.Dialog={confirm:async()=>{prompts++;return false}};
  try {
    assert.equal(joyseekerThreshold(wearer),17);
    wearer.flags.combatStatBuffs={combatId:'joycombat',threshold:3};
    await joyseekerAha(game.combat,{combatant:aha,sequenceKey:'sequence',round:1});
    assert.equal(prompts,1);assert.equal(flags.joyseekerAha.critical,true);
    assert.match(chats[0].content,/AHA INSTANT CAN NOW CRIT/);
    wearer.flags.combatStatBuffs.threshold=4;
    await joyseekerAha(game.combat,{combatant:aha,sequenceKey:'next',round:1});
    assert.equal(prompts,1);assert.equal(flags.joyseekerAha.critical,false);
  } finally {game.combat=oldCombat;ChatMessage.create=oldCreate;delete globalThis.Dialog;}
});
