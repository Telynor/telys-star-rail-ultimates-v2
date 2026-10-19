const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const bound = (value, min, max, fallback) => Math.min(max, Math.max(min, finite(value, fallback)));
export function normalizeSummons(raw = {}) {
  const seen = new Set();
  return {enabled: raw?.enabled === true, radius: bound(raw?.radius, 0, 1000, 30),
    choices: (Array.isArray(raw?.choices) ? raw.choices : []).slice(0, 100).flatMap((choice, index) => {
      if (!/^Actor\.[\w-]+$/.test(String(choice?.actorUuid))) return [];
      let id = /^[\w-]{1,80}$/.test(String(choice.id)) ? choice.id : `summon-${index}`;
      while (seen.has(id)) id += '-copy'; seen.add(id);
      return [{id, actorUuid: choice.actorUuid, quantity: Math.floor(bound(choice.quantity, 1, 20, 1))}];
    })};
}
export function parseHpDice(formula) {
  const match = /^\s*(\d+)\s*d\s*(\d+)\s*$/i.exec(String(formula ?? ''));
  if (!match || Number(match[1]) < 1 || Number(match[1]) > 100 || Number(match[2]) < 1 || Number(match[2]) > 1000) throw new Error('Use an HP cost roll such as 2d6 (1–100 dice, 1–1000 sides).');
  return `${Number(match[1])}d${Number(match[2])}`;
}
export function fixedHpCost(config, hp) {
  if (!config.skillHpCostEnabled) return 0;
  const mode = config.skillHpCostType || 'half';
  if (mode === 'roll') return null;
  const base = Math.max(0, finite(config.skillHpCostBasis === 'max' ? hp?.max : hp?.value));
  if (mode === 'half') return Math.floor(base / 2);
  if (mode === 'ten') return Math.floor(base / 10);
  if (mode === 'flat') return Math.floor(bound(config.skillHpCostFlat, 0, 999999, 0));
  throw new Error('Select a valid HP requirement for this Skill.');
}
export const rectangle = (x, y, width, height) => ({x, y, width, height, right: x + width, bottom: y + height});
export function overlaps(a, b, epsilon = .01) {
  return a.x < b.right - epsilon && a.right > b.x + epsilon && a.y < b.bottom - epsilon && a.bottom > b.y + epsilon;
}
export const rectCorners = (r, inset = .05) => [
  {x:r.x + inset,y:r.y + inset}, {x:r.right - inset,y:r.y + inset},
  {x:r.right - inset,y:r.bottom - inset}, {x:r.x + inset,y:r.bottom - inset}
];
export function insideRadius(footprint, caster, radius) {
  return rectCorners(footprint, 0).every(point => Math.hypot(Math.max(caster.x - point.x, 0, point.x - caster.right), Math.max(caster.y - point.y, 0, point.y - caster.bottom)) <= radius + .01);
}
export function segmentIntersectsRect(a, b, r) {
  // Liang–Barsky clipping against the interior: touching an edge can fit,
  // but a wall through even one occupied part of a large token cannot.
  let low = 0, high = 1;
  const dx = b.x - a.x, dy = b.y - a.y;
  for (const [p, q] of [[-dx,a.x-r.x-.05],[dx,r.right-.05-a.x],[-dy,a.y-r.y-.05],[dy,r.bottom-.05-a.y]]) {
    if (Math.abs(p) < 1e-9) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) low = Math.max(low, t); else high = Math.min(high, t);
    if (low > high) return false;
  }
  return true;
}
export function segmentsCross(a, b, c, d) {
  const cross = (p,q,r) => (q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  const within = (p,q,r) => q.x >= Math.min(p.x,r.x)-.01 && q.x <= Math.max(p.x,r.x)+.01 && q.y >= Math.min(p.y,r.y)-.01 && q.y <= Math.max(p.y,r.y)+.01;
  const [v1,v2,v3,v4] = [cross(a,b,c),cross(a,b,d),cross(c,d,a),cross(c,d,b)];
  if ((v1 > 0) !== (v2 > 0) && (v3 > 0) !== (v4 > 0)) return true;
  return Math.abs(v1)<.01&&within(a,c,b) || Math.abs(v2)<.01&&within(a,d,b) || Math.abs(v3)<.01&&within(c,a,d) || Math.abs(v4)<.01&&within(c,b,d);
}
export function wallOccludesFootprint(origin, footprint, a, b) {
  if (segmentIntersectsRect(a,b,footprint)) return true;
  const points=rectCorners(footprint),corners=[points[0],points[1],points[3],points[2]];
  if(corners.some(corner=>segmentsCross(origin,corner,a,b)))return true;
  const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  const inTriangle=(point,p,q,r)=>{
    if(Math.abs(cross(p,q,r))<1e-8)return false;
    const signs=[cross(p,q,point),cross(q,r,point),cross(r,p,point)];
    return signs.every(value=>value>=-.001)||signs.every(value=>value<=.001);
  };
  // A short wall can lie completely between the corner rays. Its shadow still
  // covers part of the token, so test the entire visibility fan, not only rays.
  return corners.some((corner,index)=>[a,b].some(point=>inTriangle(point,origin,corner,corners[(index+1)%corners.length])));
}
