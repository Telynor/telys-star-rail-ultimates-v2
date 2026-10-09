import { readFile, mkdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { ClassicLevel } from "classic-level";
const ID = "telys-star-rail-ultimates",
  root = new URL("..", import.meta.url).pathname,
  data = JSON.parse(await readFile(root + "/data/light-cones.json", "utf8")),
  pack = root + "/packs/light-cones",
  src = root + "/packs/_source/light-cones";
await rm(pack, { recursive: true, force: true });
await mkdir(pack, { recursive: true });
await mkdir(src, { recursive: true });
const db = new ClassicLevel(pack, {
  keyEncoding: "utf8",
  valueEncoding: "json",
});
await db.open();
for (const c of data) {
  const _id = createHash("sha256")
      .update("light-cone:" + c.id)
      .digest("hex")
      .slice(0, 16),
    doc = {
      _id,
      name: c.name,
      type: "loot",
      img: c.image,
      system: {
        description: {
          value: `<p>${c.description}</p><p><strong>Equipment:</strong> Occupy the Light Cone slot; matching ${c.path} Path required.</p>`,
          chat: "",
        },
        source: { custom: "Honkai: Star Rail / Telys D&D conversion" },
        quantity: 1,
        weight: { value: 0, units: "lb" },
        price: { value: 0, denomination: "gp" },
        rarity: c.rarity === 5 ? "veryRare" : "rare",
        identified: true,
        properties: [],
        type: { value: "lightCone", subtype: c.path },
      },
      effects: [],
      folder: null,
      ownership: { default: 0 },
      flags: {
        [ID]: {
          lightCone: {
            enabled: true,
            pathId: c.path,
            image: c.image,
            description: c.description,
            catalogId: c.id,
            draftId: c.draftId,
            rarity: c.rarity,
          },
        },
      },
    };
  await db.put("!items!" + _id, doc);
  await writeFile(
    src + "/" + _id + ".json",
    JSON.stringify({ _key: "!items!" + _id, ...doc }, null, 2) + "\n",
  );
}
await db.close();
console.log("Built " + data.length + " Light Cone loot documents.");
