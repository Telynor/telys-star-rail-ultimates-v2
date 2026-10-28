const MODULE_ID="telys-star-rail-ultimates";
export function lightConeAttunementUpdate(item, equipped) {
  const changes = {};
  const statePath = `flags.${MODULE_ID}.lightConeAttunementState`;
  const properties = new Set(Array.from(item?.system?.properties ?? []));
  const saved = item?.getFlag?.(MODULE_ID, "lightConeAttunementState");
  const supportsAttunement = ('attunement' in (item?.system ?? {}))
    && ('attuned' in (item?.system ?? {}));
  if ('equipped' in (item?.system ?? {})) changes['system.equipped']=equipped;
  if (!supportsAttunement && !saved) return changes;
  if (equipped) {
    // Loot items have no attunement fields in D&D5e. Their selected Light Cone
    // consumes a virtual slot in the prepared sheet context instead.
    if (!supportsAttunement) return changes;
    if (!saved) {
      changes[statePath] = {
        attunement: item?.system?.attunement,
        attuned: Boolean(item?.system?.attuned),
        hadMagic: properties.has("mgc")
      };
    }
    // D&D5e 5.3 clears attunement during data preparation unless the item has
    // the magical property, so Light Cones need it for as long as they are selected.
    properties.add("mgc");
    changes["system.properties"] = Array.from(properties);
    if (('attunement' in (item?.system ?? {}))) changes["system.attunement"] = "optional";
    if (('attuned' in (item?.system ?? {}))) changes["system.attuned"] = true;
  } else {
    if (saved && !saved.hadMagic) properties.delete("mgc");
    changes["system.properties"] = Array.from(properties);
    if (('attunement' in (item?.system ?? {}))) changes["system.attunement"] = saved?.attunement ?? "";
    if (('attuned' in (item?.system ?? {}))) changes["system.attuned"] = saved?.attuned ?? false;
    if (saved) changes[`flags.${MODULE_ID}.-=lightConeAttunementState`] = null;
  }
  return changes;
}

