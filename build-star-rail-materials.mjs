import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { ClassicLevel } from "classic-level";

const MODULE_ID = "telys-star-rail-ultimates";
const outputPath = new URL("../packs/star-rail-materials", import.meta.url).pathname;
const sourcePath = new URL("../packs/_source/star-rail-materials", import.meta.url).pathname;

const materials = [
  ["201", "Fuel", 4, "Replenishes 60 Trailblaze Power.", "A canister filled with dreams and courage. This fuel carries the power of the Trailblaze and restores the energy needed to continue the journey."],
  ["212", "Adventure Log", 3, "Provides 5,000 Character EXP.", "A neatly organized collection of educational adventure notes containing countless illustrations and texts covering adventures from beginning to end, along with valuable information and survival techniques."],
  ["213", "Traveler's Guide", 4, "Provides 20,000 Character EXP.", "Required reading for world exploration. Press the Read button to hear the legendary encounters of renowned adventurers across different worlds and the precious wisdom they gathered."],
  ["222", "Condensed Aether", 3, "Provides 2,000 Light Cone EXP.", "A can of Aether refined through special techniques."],
  ["223", "Refined Aether", 4, "Provides 6,000 Light Cone EXP.", "A canister of Aether extracted and distilled using special procedures."],
  ["233", "Lost Crystal", 4, "Provides 5,000 Relic EXP.", "A Fragmentum dust crystal that densified after being reduced to its original form."],
  ["235", "Relic Remains", 5, "Used to craft Relics.", "Material salvaged from Relics."],
  ["236", "Self-Modeling Resin", 5, "Used when synthesizing customized Relics.", "A rare material used for customizing Relics."],
  ["238", "Variable Dice", 5, "Reassigns and randomizes the upgrade distributions of a fully enhanced 5-star Relic's subsidiary stats.", "Use to reassign the upgrade counts for subsidiary stats of fully enhanced 5-star Relics and randomize their values."],
  ["241", "Tracks of Destiny", 5, "Used to activate high-level Traces.", "Advanced level-up material for Traces."],
  ["283", "Light Cone Memory Shard", 5, "Used to exchange for a 5-star Light Cone at the Stellar Convergence shop.", "A fragment containing condensed memories that can be exchanged for a 5-star Light Cone at the Stellar Convergence shop."],
  ["110101", "Tears of Dreams", 4, "Substitutes for Path Materials when they are insufficient; the required amount varies by material rarity.", "Sealed thoughts and feelings. Can substitute Path Materials when they are insufficient. The substitution ratio varies depending on the material's rarity."],
  ["300013", "Jewels of the Starry Seas", 4, "Allows selection of one eligible 4-star Nameless Honor Light Cone.", "A precious treasure drifting in the endless sea of stars."]
];

const rarityNames = { 1: "common", 2: "common", 3: "uncommon", 4: "rare", 5: "veryRare" };
const escapeHtml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const stableId = (hsrId) => createHash("sha256").update(`star-rail-materials:${hsrId}`).digest("hex").slice(0, 16);

function makeItem([hsrId, name, rarity, effect, description]) {
  return {
    _id: stableId(hsrId),
    name,
    type: "loot",
    img: `modules/${MODULE_ID}/assets/star-rail-materials/${hsrId}.png`,
    system: {
      description: {
        value: `<p>${escapeHtml(description)}</p><p><strong>Use:</strong> ${escapeHtml(effect)}</p>`,
        chat: ""
      },
      source: { custom: "Honkai: Star Rail — Nameless Honor" },
      quantity: 1,
      weight: { value: 0, units: "lb" },
      price: { value: 0, denomination: "gp" },
      rarity: rarityNames[rarity],
      identified: true,
      unidentified: { description: "" },
      properties: [],
      type: { value: "material", subtype: "" }
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {
      [MODULE_ID]: {
        hsrItemId: hsrId,
        hsrRarity: rarity,
        sourceTrack: "Nameless Gift / Nameless Honor"
      }
    }
  };
}

await rm(outputPath, { recursive: true, force: true });
await rm(sourcePath, { recursive: true, force: true });
await mkdir(outputPath, { recursive: true });
await mkdir(sourcePath, { recursive: true });

const items = materials.map(makeItem);
const db = new ClassicLevel(outputPath, { valueEncoding: "json" });
await db.open();
for (const item of items) {
  await db.put(item._id, item);
  await writeFile(`${sourcePath}/${item._id}.json`, `${JSON.stringify(item, null, 2)}\n`);
}
await db.close();

console.log(`Built ${items.length} items in the Star Rail Materials compendium.`);
