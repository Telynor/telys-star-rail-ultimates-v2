// Use the same D&D5e TokenPlacement API as SummonActivity.getPlacement.
// Placement collects positions only; the GM still validates and creates tokens.
let active = null;
export const isNativeSummonPlacementActive = () => Boolean(active);
export function cancelNativeSummonPlacement(owner) {
  if (!active || (owner && active.owner !== owner)) return;
  active.cancelled = true;
  active.skip?.();
}

export async function chooseNativeSummonPositions(actor, source, {scene,origin,count=1,validate} = {}) {
  const NativePlacement = game.dnd5e?.canvas?.TokenPlacement ?? globalThis.dnd5e?.canvas?.TokenPlacement;
  if (typeof NativePlacement?.place !== 'function') throw Error('D&D5e’s native summon placement is unavailable. Reload Foundry with the D&D5e system active.');
  if (active) { ui.notifications.warn('Finish or cancel the current summon placement first.'); return null; }
  if (!scene || canvas.scene?.id !== scene.id) throw Error('Open the summoning scene before placing its creatures.');
  if (!source?.prototypeToken) throw Error('The summoned Actor is unavailable.');
  const session = {owner:actor.uuid??actor.id,cancelled:false,skip:null}; active = session;
  const positions = [], view = canvas.app?.view ?? canvas.app?.canvas;
  const onKey = event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelNativeSummonPlacement(session.owner); } };
  const onTearDown = () => cancelNativeSummonPlacement(session.owner);
  document.addEventListener('keydown',onKey,true);
  Hooks.on('canvasTearDown',onTearDown);
  const timer = setTimeout(onTearDown,180000);
  const sheet = actor.sheet, windowId = (sheet?.parent??sheet)?.window?.windowId;
  const minimize = !sheet?._minimized && !windowId && typeof sheet?.minimize === 'function';
  try {
    if (minimize) await sheet.minimize();
    while (positions.length < count && !session.cancelled) {
      if (canvas.scene?.id !== scene.id) return null;
      ui.notifications.info(`${source.name}: place creature ${positions.length+1} of ${count}. Left-click places; right-click or Escape cancels.`);
      const previous = view?.oncontextmenu;
      let cancelPoll;
      session.skip = () => {
        // TokenPlacement installs its context-menu cancel handler after drawing
        // the native preview. Also handle Escape during that initial draw.
        const skip = () => {
          const handler = view?.oncontextmenu;
          if (typeof handler !== 'function' || handler === previous) return;
          clearInterval(cancelPoll);
          handler({preventDefault(){},stopPropagation(){}});
        };
        cancelPoll ??= setInterval(skip,20); skip();
      };
      let placements;
      try { placements = await NativePlacement.place({origin,tokens:[source.prototypeToken]}); }
      finally { clearInterval(cancelPoll); session.skip = null; }
      if (session.cancelled || canvas.scene?.id !== scene.id || !placements?.length) return null;
      const raw = placements[0];
      const point = {x:raw.x,y:raw.y,...(Number.isFinite(raw.rotation)?{rotation:raw.rotation}:{})};
      if (![point.x,point.y].every(Number.isFinite)) throw Error('Native summon placement returned an invalid position.');
      try {
        if (await validate?.(point,positions) === false) throw Error('Cannot Fit: choose a valid position clear of other creatures and lighting barriers.');
      } catch (error) {
        if (!String(error.message).startsWith('Cannot Fit')) throw error;
        ui.notifications.warn(error.message); continue;
      }
      positions.push(point);
    }
    return session.cancelled ? null : positions;
  } finally {
    clearTimeout(timer);
    document.removeEventListener('keydown',onKey,true);
    Hooks.off?.('canvasTearDown',onTearDown);
    if (active === session) active = null;
    if (minimize) await sheet.maximize();
  }
}
