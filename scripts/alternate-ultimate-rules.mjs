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
      glow: entry.glow !== false, sequence: Math.floor(bound(entry.sequence, 1, 1000000, index + 1)),
      x: bound(entry.x, 0, 100, 50), y: bound(entry.y, 0, 100, 50),
      scale: bound(entry.scale, 5, 200, 50), rotation: bound(entry.rotation, -360, 360, 0)}];
  });
  const first = [...components].sort((a, b) => a.sequence - b.sequence)[0];
  const startComponentId = components.some(c => c.id === raw?.startComponentId) ? raw.startComponentId : first?.id ?? "";
  return {label: text(raw?.label, "Alternate Ultimate") || "Alternate Ultimate", glowEnabled: raw?.glowEnabled !== false,
    mode: raw?.mode === "circular" ? "circular" : "free", startComponentId,
    firstActivation: Math.floor(bound(raw?.firstActivation, 1, 1000000, 1)), components};
}

// Sequence numbers define charging order, independently of visual layer order.
// Rotate that order at the chosen start icon, then wrap once around the circle.
export function alternateOrbSequence(raw) {
  const orb = normalizeAlternateOrb(raw), ordered = [...orb.components].sort((a, b) => a.sequence - b.sequence);
  const start = Math.max(0, ordered.findIndex(c => c.id === orb.startComponentId));
  return [...ordered.slice(start), ...ordered.slice(0, start)];
}

export function circularOrbMaximum(raw) {
  const orb = normalizeAlternateOrb(raw);
  return orb.components.length ? orb.firstActivation + orb.components.length - 1 : 0;
}

export function circularOrbCount(raw, value) {
  return Math.floor(bound(value, 0, circularOrbMaximum(raw), 0));
}

export function circularOrbStates(raw, value) {
  const orb = normalizeAlternateOrb(raw), count = circularOrbCount(orb, value);
  const lit = Math.max(0, count - orb.firstActivation + 1);
  const active = new Set(alternateOrbSequence(orb).slice(0, lit).map(c => c.id));
  return Object.fromEntries(orb.components.map(c => [c.id, active.has(c.id)]));
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
