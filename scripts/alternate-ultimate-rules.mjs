// Alternate Ultimates deliberately use manual GM counters, independent of Energy.
const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const bound = (value, min, max, fallback) => Math.min(max, Math.max(min, number(value, fallback)));
const text = (value, fallback = "") => typeof value === "string" ? value.trim() : fallback;
export const orbColor = value => /^#[\da-f]{6}$/i.test(String(value)) ? String(value) : "#20e6ff";

export function normalizeAlternateOrb(raw = {}) {
  const ids = new Set();
  const components = (Array.isArray(raw?.components) ? raw.components : []).flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    let id = text(entry.id, `component-${index}`);
    if (!/^[\w-]{1,80}$/.test(id)) id = `component-${index}`;
    while (ids.has(id)) id += "-copy";
    ids.add(id);
    return [{id, name: text(entry.name, `Component ${index + 1}`) || `Component ${index + 1}`,
      image: text(entry.image), offImage: text(entry.offImage), color: orbColor(entry.color),
      glow: entry.glow !== false, x: bound(entry.x, 0, 100, 50), y: bound(entry.y, 0, 100, 50),
      scale: bound(entry.scale, 5, 200, 50), rotation: bound(entry.rotation, -360, 360, 0)}];
  });
  return {label: text(raw?.label, "Alternate Ultimate") || "Alternate Ultimate", glowEnabled: raw?.glowEnabled !== false, components};
}

export function alternateOrbProgress(orb, states = {}) {
  const components = normalizeAlternateOrb(orb).components;
  const current = components.filter(c => states?.[c.id] === true).length;
  const total = components.length;
  return {current, total, percent: total ? current / total * 100 : 0,
    ready: total > 0 && current === total && components.every(c => Boolean(c.image))};
}

export function ultimateCharge(config, orb, states) {
  if (config.alternateUltimateEnabled) {
    const progress = alternateOrbProgress(orb, states);
    return {...progress, alternate: true, ready: Boolean(config.enabled) && progress.ready};
  }
  const total = Math.max(1, number(config.max, 100));
  const current = bound(config.current, 0, total, 0);
  return {current, total, percent: current / total * 100, alternate: false,
    ready: Boolean(config.enabled) && current >= total};
}

export function energyAfterUpdate(config, value, {locked = false, overrideLock = false} = {}) {
  const current = bound(config.current, 0, Math.max(1, number(config.max, 100)), 0);
  const next = bound(value, 0, Math.max(1, number(config.max, 100)), current);
  if (next > current && (config.alternateUltimateEnabled || (locked && !overrideLock))) return current;
  return next;
}
