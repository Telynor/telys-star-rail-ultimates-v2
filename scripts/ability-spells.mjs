import {removeSummonedTokens} from './summon-lifecycle.mjs';
const ID = 'telys-star-rail-ultimates';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const casts = new WeakMap(), active = new WeakMap(), cancelled = new WeakMap();
let installedHooks;

export function normalizeSkillSpell(value = {}) {
  return {enabled:Boolean(value.enabled),mode:value.mode === 'other' ? 'other' : 'known',itemId:String(value.itemId ?? ''),uuid:String(value.uuid ?? ''),name:String(value.name ?? ''),img:String(value.img ?? '')};
}
const setting = actor => normalizeSkillSpell(actor.getFlag(ID, 'ultimate')?.skillSpell);
const isCompendiumSpell = item => item?.documentName === 'Item' && item.type === 'spell' && item.pack && String(item.uuid).startsWith('Compendium.');

export function bindSkillSpellSettings(actor, root) {
  const section = root?.querySelector('[data-skill-spell]');
  if (!section || !game.user.isGM || section.dataset.bound) return;
  section.dataset.bound = 'true';
  let config = setting(actor), saved = structuredClone(config), saving = Promise.resolve();
  const enabled = section.querySelector('[data-spell-enabled]'), mode = section.querySelector('[data-spell-mode]'), list = section.querySelector('[data-spell-known]');
  list.innerHTML = '<option value="">Choose a character spell…</option>' + [...(actor.items ?? [])].filter(item => item.type === 'spell').sort((a,b) => a.name.localeCompare(b.name)).map(item => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('');
  const render = () => {
    enabled.checked = config.enabled;
    section.querySelector('[data-spell-fields]').hidden = !config.enabled;
    mode.checked = config.mode === 'other';
    mode.setAttribute('aria-checked', String(mode.checked));
    section.querySelector('[data-spell-known-field]').hidden = mode.checked;
    section.querySelector('[data-spell-other-field]').hidden = !mode.checked;
    section.querySelectorAll('[data-spell-mode-label]').forEach(node => node.classList.toggle('is-active', node.dataset.spellModeLabel === config.mode));
    list.value = config.itemId;
    section.querySelector('[data-spell-drop]').innerHTML = config.uuid ? `<img src="${esc(config.img || 'icons/svg/book.svg')}" alt=""><span><strong>${esc(config.name || 'Compendium spell')}</strong><small>${esc(config.uuid)}</small></span>` : '<span>Drop a spell from a compendium here</span>';
    for (const action of ['open','clear']) section.querySelector(`[data-spell-${action}]`).disabled = !config.uuid;
  };
  const save = () => {
    const snapshot = normalizeSkillSpell(config);
    saving = saving.then(async () => {
      try { await actor.update({[`flags.${ID}.ultimate.skillSpell`]:snapshot}, {render:false}); saved = structuredClone(snapshot); }
      catch (error) { config = structuredClone(saved); render(); ui.notifications.error(`Could not save Skill spell: ${error.message}`); }
    });
    return saving;
  };
  enabled.addEventListener('change', () => { config.enabled = enabled.checked; render(); void save(); });
  mode.addEventListener('change', () => { config.mode = mode.checked ? 'other' : 'known'; render(); void save(); });
  list.addEventListener('change', () => { config.itemId = list.value; void save(); });
  const drop = section.querySelector('[data-spell-drop]');
  drop.addEventListener('dragover', event => { event.preventDefault(); event.stopPropagation(); drop.classList.add('is-dragover'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('is-dragover'));
  drop.addEventListener('drop', async event => {
    event.preventDefault(); event.stopPropagation(); drop.classList.remove('is-dragover');
    try {
      const data = JSON.parse(event.dataTransfer.getData('text/plain'));
      if (data.type !== 'Item' || !String(data.uuid).startsWith('Compendium.')) throw Error('Drop a spell Item from a compendium.');
      const item = await fromUuid(data.uuid);
      if (!isCompendiumSpell(item)) throw Error('Drop a spell Item from a compendium. Actors, features and world Items are not accepted.');
      Object.assign(config, {uuid:item.uuid,name:item.name,img:item.img}); render(); await save();
    } catch (error) { ui.notifications.warn(error.message || 'Drop a spell Item from a compendium.'); }
  });
  section.querySelector('[data-spell-clear]').addEventListener('click', () => { Object.assign(config,{uuid:'',name:'',img:''}); render(); void save(); });
  section.querySelector('[data-spell-open]').addEventListener('click', async () => { try { (await fromUuid(config.uuid))?.sheet?.render(true); } catch (error) { ui.notifications.error(error.message); } });
  render();
}

export async function resolveSkillSpell(actor, {importOther = true} = {}) {
  const config = setting(actor);
  if (!config.enabled) return null;
  if (config.mode === 'known') {
    const item = actor.items?.get(config.itemId);
    if (!item || item.type !== 'spell' || item.actor !== actor) throw Error('Choose a spell from this character’s spell list in Casts spell? → Spell known.');
    return item;
  }
  if (!config.uuid.startsWith('Compendium.')) throw Error('Drop a compendium spell in Casts spell? → Other first.');
  const existing = [...(actor.items ?? [])].find(item => item.type === 'spell' && item.getFlag?.(ID,'skillSpellSource') === config.uuid);
  if (existing) return existing;
  const source = await fromUuid(config.uuid);
  if (!isCompendiumSpell(source)) throw Error('The selected compendium spell is missing or is no longer a spell. Drop it again.');
  if (!importOther) return source;
  const data = source.toObject(); delete data._id;
  data.flags = {...data.flags,[ID]:{...data.flags?.[ID],skillSpellSource:source.uuid}};
  const [item] = await actor.createEmbeddedDocuments('Item',[data]);
  if (!item || item.actor !== actor) throw Error('Could not create an owned copy of the compendium spell.');
  return item;
}

export const isSkillSpellCancelled = (actor, castId) => Boolean(castId && cancelled.get(actor)?.has(castId));
export function cancelSkillSpell(actor, castId) {
  if (!actor || !castId) return;
  const ids = cancelled.get(actor) ?? new Set(); ids.add(castId); cancelled.set(actor,ids);
  if (active.get(actor)?.id === castId) active.get(actor).blocked = true;
}
const entryFor = activity => {
  const actor = activity?.actor ?? activity?.item?.actor, entry = actor && active.get(actor);
  return entry && activity.item?.id === entry.itemId ? entry : null;
};
export function installSkillSpellHooks() {
  if (installedHooks === Hooks) return; installedHooks = Hooks;
  const prepareUsage = (activity, usage) => {
    const entry = entryFor(activity); if (!entry) return;
    if (entry.blocked || isSkillSpellCancelled(entry.actor,entry.id)) return false;
    usage.consume = false;
    usage.summons = {...usage.summons,tsruSkillCastId:entry.id};
    if (activity.type === 'summon') { entry.summoning = true; usage.create = {...usage.create,summons:true}; }
  };
  Hooks.on('dnd5e.preUseActivity', prepareUsage);
  Hooks.on('dnd5e.preActivityConsumption', prepareUsage);
  Hooks.on('dnd5e.postSummon', (activity, _profile, tokens, options = {}) => {
    const entry = entryFor(activity);
    if (entry && (!options.tsruSkillCastId || options.tsruSkillCastId === entry.id)) entry.tokens.push(...(tokens ?? []));
  });
  Hooks.on('tsruSummonPlacementBlocked', (_token, meta) => {
    for (const actor of game.actors) { const entry = active.get(actor); if (entry && entry.id === meta?.castId) entry.blocked = true; }
  });
}
async function removeTokens(tokens) {
  const scenes = new Map();
  for (const token of tokens) if (token.parent?.tokens.get(token.id)) { const ids = scenes.get(token.parent) ?? new Set(); ids.add(token.id); scenes.set(token.parent,ids); }
  for (const [scene,ids] of scenes) await removeSummonedTokens([...ids].map(id=>scene.tokens.get(id)));
}
export async function castSkillSpell(actor, {itemId,castId}) {
  const cache = casts.get(actor) ?? new Map(); casts.set(actor,cache);
  if (cache.has(castId)) return cache.get(castId);
  if (isSkillSpellCancelled(actor,castId)) return false;
  if (active.has(actor)) throw Error('This character already has a spell cast resolving.');
  const item = actor.items?.get(itemId);
  if (!item || item.type !== 'spell' || item.actor !== actor || typeof item.use !== 'function') throw Error('The Skill’s owned spell is unavailable.');
  installSkillSpellHooks();
  const entry = {actor,id:castId,itemId,tokens:[],blocked:false,summoning:false}; active.set(actor,entry);
  const work = (async () => {
    try {
      const result = await item.use({consume:false,summons:{tsruSkillCastId:castId}});
      const tokens = [...entry.tokens,...(Array.isArray(result?.summoned) ? result.summoned : [])];
      if (!result || result.cancelled || result.aborted || entry.blocked || isSkillSpellCancelled(actor,castId) || (entry.summoning && !tokens.length)) { await removeTokens(tokens); return false; }
      return true;
    } catch (error) { await removeTokens(entry.tokens); throw error; }
    finally { if (active.get(actor) === entry) active.delete(actor); }
  })();
  cache.set(castId,work);
  if (cache.size > 100) cache.delete(cache.keys().next().value);
  return work;
}
