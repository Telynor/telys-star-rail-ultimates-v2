import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { ClassicLevel } from "classic-level";
import {
  eligibleCone,
  passive,
  dotModifiers,
  dieStep,
} from "../scripts/light-cone-rules.mjs";
const ID = "telys-star-rail-ultimates";
test("inventory, slot, and Path gate are independent", () => {
  const item = {
      type: "loot",
      getFlag: () => ({
        enabled: true,
        catalogId: "1",
        draftId: 42,
        pathId: "nihility",
      }),
    },
    a = { uuid: "Actor.a", getFlag: () => null, items: new Map([["a", item]]) };
  assert.equal(eligibleCone(a, { pathId: "nihility" }), null);
  a.getFlag = () => "a";
  assert.equal(eligibleCone(a, { pathId: "harmony" }), null);
  assert.equal(
    eligibleCone(
      a,
      { pathId: "nihility" },
      { started: true, combatants: [{ actor: a }] },
    ).id,
    42,
  );
  item.getFlag = () => ({ enabled: false });
  assert.equal(eligibleCone(a, { pathId: "nihility" }), null);
});
test("crit bonuses and conditional target thresholds remain additive", () => {
  assert.equal(passive(26, { targetHP: 0.6 }).crit, 1);
  assert.equal(passive(26, { targetHP: 0.3 }).crit, 2);
  assert.equal(passive(17, { slowed: true }).critDamage, 3);
  assert.equal(
    passive(17, { reducedAC: false, slowed: false }).critDamage,
    undefined,
  );
  assert.equal(passive(87, { hp: 0.9 }).crit, undefined);
});
test("conditional bonuses distinguish attacks from damage and skill categories", () => {
  assert.equal(passive(22, { category: "basic" }).damage, 1);
  assert.equal(passive(22, { category: "ultimate" }).damage, undefined);
  assert.equal(passive(63, { debuffs: 2, category: "skill" }).attack, 1);
  assert.equal(
    passive(63, { debuffs: 2, category: "basic" }).attack,
    undefined,
  );
  assert.equal(
    passive(130, {
      targetUuid: "b",
      stacks: { swordTarget: "a", swordplay: 3 },
    }).damage,
    undefined,
  );
});
test("DoT changes are die steps or initial duration; d12 cap", () => {
  assert.deepEqual(dotModifiers(42, "burn"), { steps: 1, turns: 0 });
  assert.deepEqual(dotModifiers(43, "shock"), { steps: 0, turns: 1 });
  assert.deepEqual(dotModifiers(125, "burn", { buffs: { solitary: {} } }), {
    steps: 0,
    turns: 1,
  });
  assert.equal(dotModifiers(54, "burn", { debuffs: 1 }).steps, 0);
  assert.equal(dotModifiers(54, "burn", { debuffs: 2 }).steps, 1);
  assert.equal(dieStep(4, 2), 8);
  assert.equal(dieStep(10, 5), 12);
});
test("maximum HP, AC and speed modifiers never replace the sheet values", () => {
  assert.equal(passive(46).maxHP, 8);
  assert.equal(passive(11, { hp: 0.25 }).ac, 2);
  assert.equal(passive(99, { stacks: { erodeSpeed: 3 } }).speed, 15);
  assert.equal(passive(34, { ac: 30 }).damage, 3);
});
test("all 163 compendium documents have local transparent PNGs and only 4/5-star rarity", async () => {
  const rows = JSON.parse(
    await readFile(new URL("../data/light-cones.json", import.meta.url)),
  );
  assert.equal(rows.length, 163);
  assert.equal(new Set(rows.map((x) => x.id)).size, 163);
  const db = new ClassicLevel(
    new URL("../packs/light-cones", import.meta.url).pathname,
    { keyEncoding: "utf8", valueEncoding: "json" },
  );
  await db.open();
  let count = 0;
  for await (const [key, item] of db.iterator()) {
    assert.ok(key.startsWith("!items!"));
    assert.equal(item.type, "loot");
    assert.equal(item.system.type.value, "lightCone");
    assert.ok(["rare", "veryRare"].includes(item.system.rarity));
    assert.ok(item.flags[ID].lightCone.enabled);
    count++;
  }
  await db.close();
  assert.equal(count, 163);
  for (const row of rows) {
    assert.ok(row.rarity >= 4);
    const b = await readFile(
      new URL("../assets/light-cones/" + row.id + ".png", import.meta.url),
    );
    assert.equal(b.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.ok(
      [4, 6].includes(b[25]),
      "PNG must have an alpha channel: " + row.name,
    );
  }
});

test("Joyseeker subtracts one threshold point per distinct Elation element", () => {
  assert.equal(passive(171, {elationElements:3}).crit, 3);
  assert.equal(passive(171, {elationElements:0}).crit, 0);
  assert.equal(passive(171, {elationElements:3}).critFloor, 2);
});
