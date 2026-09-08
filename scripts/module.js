const MODULE_ID = "telys-star-rail-ultimates";
const SOCKET = `module.${MODULE_ID}`;

const DEFAULT_CONFIG = Object.freeze({
  enabled: false,
  current: 0,
  max: 100,
  regenScore: 10,
  attackGain: 10,
  attackedGain: 5,
  attackedMode: "hit",
  mainParty: false,
  lockEnergyAfterUltimate: true,
  energyLockCombatId: "",
  energyLockRound: null,
  breakCharacter: false,
  breakEffectScore: 10,
  breakDamageDice: 1,
  breakDamageDie: 6,
  skillEnabled: true,
  skillScript: "",
  skillText: "",
  skillButtonImage: "",
  talentPointsCurrent: 0,
  talentPointsMax: 0,
  talentScript: "",
  punchlineGain: 1,
  elationActionScript: "",
  elationActionText: "",
  ultimateScript: "",
  ultimateText: "",
  splashImage: "",
  splashDuration: 1,
  ultimateName: "Ultimate",
  ultimateSubtitle: "",
  titleX: 17,
  titleY: 78,
  titleSize: 48,
  titleAlign: "left",
  fontFile: "",
  subtitleFontFile: "",
  ultimateButtonImage: "",
  orbImage: "",
  chargeColor: "#596171",
  readyColor: "#20e6ff",
  showPercent: true,
  elementId: "",
  pathId: ""
});

const state = {
  orbs: new Map(),
  skillButtons: new Map(),
  skillMeter: null,
  skillLocks: new Set(),
  pendingSkills: new Map(),
  skillSpendLock: false,
  ahaButton: null,
  punchlineMeter: null,
  pendingElationActions: new Map(),
  activeElationActions: new Set(),
  lastElationSequenceKey: "",
  processedMessages: new Set(),
  ultimateLocks: new Set(),
  pendingUltimates: new Map(),
  ultimateQueues: new Map(),
  splashBroadcasts: new Map(),
  receivedSplashIds: new Set(),
  lastTargetsByActor: new Map(),
  recentToughness: new Map(),
  activeTalents: new Set(),
  talentEvents: new Set(),
  lastTalentTurns: new Map(),
  lastCombatTurns: new Map(),
  specialAha: null,
  gmPanel: null,
  actionAdvances: new Map(),
  sheetObservers: new WeakMap(),
  suppressCombatHook: false,
  lastAhaTurnKey: ""
};

let ahaToolbarOpening = false;
let gmToolbarOpening = false;

const DEFAULT_AHA_CONFIG = Object.freeze({
  elationEnabled: false,
  elationPathId: "",
  punchlineIcon: "icons/svg/mask.svg",
  punchlineFontFile: "",
  punchlineFontSize: 39,
  punchlineIconOffsetX: 0,
  punchlineIconOffsetY: 0,
  video: "",
  buttonImage: "icons/svg/explosion.svg",
  color: "#ff4fd8",
  initiativeEnabled: false,
  combatantImage: "icons/svg/mystery-man.svg"
});

const DEFAULT_SKILL_POINT_CONFIG = Object.freeze({
  maximum: 5,
  starting: 3,
  pointsPerRow: 5,
  pointSpacing: 1,
  illuminatedIcon: "icons/svg/sun.svg",
  emptyIcon: "icons/svg/circle.svg",
  numberFontFile: ""
});

const DEFAULT_TOUGHNESS = Object.freeze({enabled: true, current: 100, max: 100, weaknesses: [], temporaryWeaknesses: [], discoveredWeaknesses: []});

const DEFAULT_EIDOLON_CONFIG = Object.freeze({
  backgroundImage: "",
  fiveShardOverlay: "",
  e3Overlay: "",
  referenceImage: "",
  titleFontFile: "",
  mask1: "",
  mask2: "",
  mask3: "",
  mask4: "",
  mask5: "",
  mask6: ""
});

const EIDOLON_MASKS = Object.freeze({
  1: "polygon(29.1% 0%, 48.5% 0%, 48.6% 22.7%, 50.5% 32.5%, 47.2% 33.0%, 42.0% 28.0%, 36.8% 25.2%, 32.3% 17.3%)",
  2: "polygon(53.2% 0%, 73.8% 0%, 73.2% 28.7%, 70.7% 41.7%, 67.6% 52.0%, 60.5% 55.5%, 52.5% 42.0%, 51.8% 24.0%)",
  3: "polygon(73.5% 0%, 100% 0%, 100% 46.0%, 91.8% 48.8%, 83.3% 47.7%, 80.4% 42.8%, 81.8% 31.8%, 72.6% 25.0%)",
  4: "polygon(73.0% 51.2%, 91.8% 49.6%, 90.7% 67.8%, 86.8% 75.0%, 84.6% 90.0%, 78.0% 93.5%, 74.2% 100%, 68.4% 98.0%, 64.0% 81.5%, 63.8% 73.5%)",
  5: "polygon(48.5% 47.0%, 56.0% 57.0%, 63.0% 81.0%, 62.2% 88.0%, 62.2% 100%, 54.5% 100%, 47.5% 93.0%, 42.7% 88.5%, 38.7% 80.0%, 41.8% 70.0%, 44.0% 56.0%)",
  6: "polygon(34.2% 33.8%, 52.0% 35.3%, 47.7% 54.0%, 41.0% 68.3%, 35.2% 75.0%, 28.7% 80.5%, 22.0% 79.4%, 18.4% 72.0%, 14.5% 61.0%, 15.8% 50.2%, 24.8% 42.5%)"
});

function defaultEidolonSlots() {
  return Array.from({length: 6}, (_entry, index) => ({
    number: index + 1,
    active: false,
    title: `Eidolon ${index + 1}`,
    artwork: "",
    offsetX: 0,
    offsetY: 0,
    scale: 100
  }));
}

function getEidolonConfig() {
  return foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_EIDOLON_CONFIG), game.settings.get(MODULE_ID, "eidolonConfig") ?? {}, {inplace: false, insertKeys: true, overwrite: true});
}

function getEidolons(actor) {
  const stored = actor?.getFlag(MODULE_ID, "eidolons") ?? {};
  const slots = defaultEidolonSlots().map((fallback, index) => {
    const value = Array.isArray(stored.slots) ? stored.slots[index] ?? {} : {};
    return {...fallback, ...value, number: index + 1, active: Boolean(value.active), offsetX: clamp(value.offsetX, -100, 100), offsetY: clamp(value.offsetY, -100, 100), scale: clamp(value.scale || 100, 25, 400)};
  });
  return {currencyUuid: String(stored.currencyUuid ?? ""), slots};
}

function activeGM() {
  return game.users?.find(user => user.active && user.isGM);
}

function isAuthority() {
  return game.user?.isGM && activeGM()?.id === game.user.id;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function signedNumber(value) {
  const number = Number(value) || 0;
  return number >= 0 ? `+${number}` : String(number);
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function resolveAssetUrl(path) {
  const value = String(path || "").trim();
  if (!value) return "";
  try {
    return new URL(value, document.baseURI).href;
  } catch (_error) {
    return value;
  }
}

function resolveActorSheetRoot(app, html) {
  const appElement = app?.element?.jquery ? app.element[0] : app?.element;
  const htmlElement = html?.jquery ? html[0] : html instanceof HTMLElement ? html : null;
  const enclosingElement = htmlElement?.closest?.(".application, .window-app, [data-appid]");
  const candidates = [htmlElement, enclosingElement, appElement].filter((element, index, list) => element instanceof HTMLElement && list.indexOf(element) === index);
  const navigation = 'nav.tabs[data-group="primary"], nav.sheet-tabs[data-group="primary"], .tabs-right nav.tabs';
  const content = '.tab-body, .sheet-body, [data-application-part="body"]';
  return candidates.find(element => {
    const root = $(element);
    return root.find(navigation).length && root.find(content).length;
  }) ?? enclosingElement ?? appElement ?? htmlElement;
}

function getConfig(actor) {
  const stored = actor?.getFlag(MODULE_ID, "ultimate") ?? {};
  const config = foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_CONFIG), stored, {
    inplace: false,
    insertKeys: true,
    overwrite: true
  });
  config.max = Math.max(1, Number(config.max) || 100);
  config.current = clamp(config.current, 0, config.max);
  return config;
}

function getToughness(actor) {
  const stored = actor?.getFlag(MODULE_ID, "toughness") ?? {};
  const config = foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_TOUGHNESS), stored, {inplace: false, insertKeys: true, overwrite: true});
  config.max = Math.max(1, Number(config.max) || 100);
  config.current = clamp(config.current, 0, config.max);
  config.weaknesses = Array.isArray(config.weaknesses) ? config.weaknesses : [];
  config.temporaryWeaknesses = Array.isArray(config.temporaryWeaknesses) ? config.temporaryWeaknesses : [];
  config.discoveredWeaknesses = Array.isArray(config.discoveredWeaknesses) ? config.discoveredWeaknesses : [];
  return config;
}

function toughnessTargetParts(target) {
  const tokenDocument = target?.documentName === "Token" ? target
    : target?.document?.documentName === "Token" ? target.document
    : target?.documentName === "Actor" && target?.parent?.documentName === "Token" ? target.parent
    : null;
  const actor = tokenDocument?.actor ?? target?.actor ?? target;
  return {actor, tokenDocument};
}

function temporaryToughnessWeaknesses(target) {
  const {actor, tokenDocument} = toughnessTargetParts(target);
  const tokenValues = tokenDocument?.getFlag(MODULE_ID, "temporaryWeaknesses");
  return Array.isArray(tokenValues) ? tokenValues : getToughness(actor).temporaryWeaknesses;
}

function effectiveToughnessWeaknesses(target) {
  const {actor} = toughnessTargetParts(target);
  const config = getToughness(actor);
  return [...new Set([...config.weaknesses, ...temporaryToughnessWeaknesses(target)])];
}

async function setTemporaryToughnessWeaknesses(target, elementIds) {
  const {actor, tokenDocument} = toughnessTargetParts(target);
  if (!game.user.isGM || !actor || actor.type !== "npc") return false;
  const config = getToughness(actor);
  const valid = new Set(getElements().map(element => element.id));
  const temporaryWeaknesses = [...new Set(elementIds ?? [])].filter(id => valid.has(id) && !config.weaknesses.includes(id));
  if (tokenDocument) await tokenDocument.setFlag(MODULE_ID, "temporaryWeaknesses", temporaryWeaknesses);
  else await actor.update({[`flags.${MODULE_ID}.toughness.temporaryWeaknesses`]: temporaryWeaknesses});
  refreshToughnessBars();
  return true;
}

async function addTemporaryToughnessWeakness(target, elementId) {
  return setTemporaryToughnessWeaknesses(target, [...temporaryToughnessWeaknesses(target), elementId]);
}

async function resetTemporaryToughnessWeaknesses(target = null) {
  if (!game.user.isGM) return 0;
  const targets = target ? [target] : (canvas.tokens?.placeables ?? []).filter(token => token.actor?.type === "npc").map(token => token.document);
  let reset = 0;
  for (const entry of targets) {
    const {actor, tokenDocument} = toughnessTargetParts(entry);
    const config = getToughness(actor);
    if (!temporaryToughnessWeaknesses(entry).length) continue;
    if (tokenDocument) await tokenDocument.setFlag(MODULE_ID, "temporaryWeaknesses", []);
    else await actor.update({[`flags.${MODULE_ID}.toughness.temporaryWeaknesses`]: []});
    await actor.update({[`flags.${MODULE_ID}.toughness.discoveredWeaknesses`]: config.discoveredWeaknesses.filter(id => config.weaknesses.includes(id))});
    reset++;
  }
  refreshToughnessBars();
  return reset;
}

async function setToughness(actor, value) {
  if (!actor || !game.user.isGM) return;
  const config = getToughness(actor);
  await actor.update({[`flags.${MODULE_ID}.toughness.current`]: clamp(value, 0, config.max)});
}

async function resetCanvasToughness() {
  if (!game.user.isGM) return ui.notifications.warn("Only a GM can reset Toughness.");
  if (!canvas?.ready) return ui.notifications.warn("Open a Scene before resetting Toughness.");
  const actors = new Map();
  for (const token of canvas.tokens?.placeables ?? []) {
    const actor = token.actor;
    if (!actor || actor.type !== "npc") continue;
    const stored = actor.getFlag(MODULE_ID, "toughness");
    if (!stored || !getToughness(actor).enabled) continue;
    actors.set(actor.uuid, actor);
  }
  if (!actors.size) return ui.notifications.info("No Toughness-enabled NPCs are present on this Scene.");
  const confirmed = await Dialog.confirm({
    title: "Reset All Toughness",
    content: `<p>Restore the current Toughness of <strong>${actors.size}</strong> NPC actor${actors.size === 1 ? "" : "s"} on this Scene to each actor's configured maximum?</p><p>Weaknesses and maximum values will not be changed.</p>`,
    yes: () => true,
    no: () => false,
    defaultYes: false
  });
  if (!confirmed) return;
  let reset = 0;
  for (const actor of actors.values()) {
    const toughness = getToughness(actor);
    if (toughness.current === toughness.max) continue;
    await actor.update({[`flags.${MODULE_ID}.toughness.current`]: toughness.max});
    reset++;
  }
  refreshToughnessBars();
  ui.notifications.info(`Reset Toughness for ${reset} actor${reset === 1 ? "" : "s"}.`);
}

function regenModifier(config) {
  const parsed = Number(config.regenScore);
  const score = Number.isFinite(parsed) ? clamp(parsed, 1, 30) : 10;
  return Math.floor((score - 10) / 2);
}

function breakEffectModifier(config) {
  const parsed = Number(config.breakEffectScore);
  const score = Number.isFinite(parsed) ? clamp(parsed, 1, 30) : 10;
  return Math.floor((score - 10) / 2);
}

function energyAbilityMarkup(actor, tagName = "div") {
  const config = getConfig(actor);
  const editable = game.user.isGM || actor.isOwner;
  return `<${tagName} class="tsru-energy-ability ability-score" data-tsru-energy-ability data-actor-id="${actor.id}" title="Energy gained = base gain + Energy Regen modifier">
    <div class="tsru-energy-ability-label">ENERGY REGEN</div>
    <div class="tsru-energy-ability-modifier">${signedNumber(regenModifier(config))}</div>
    <input class="tsru-energy-ability-score" type="number" min="1" max="30" step="1" value="${Number.isFinite(Number(config.regenScore)) ? clamp(config.regenScore, 1, 30) : 10}" aria-label="Energy Regen ability score" ${editable ? "" : "disabled"}>
  </${tagName}>`;
}

function breakAbilityMarkup(actor, tagName = "div") {
  const config = getConfig(actor);
  const editable = game.user.isGM || actor.isOwner;
  return `<${tagName} class="tsru-energy-ability tsru-break-ability ability-score" data-tsru-break-ability data-actor-id="${actor.id}" title="Break damage multiplier uses the Break Effect modifier">
    <div class="tsru-energy-ability-label">BREAK EFFECT</div>
    <div class="tsru-energy-ability-modifier">${signedNumber(breakEffectModifier(config))}</div>
    <input class="tsru-energy-ability-score" type="number" min="1" max="30" step="1" value="${Number.isFinite(Number(config.breakEffectScore)) ? clamp(config.breakEffectScore, 1, 30) : 10}" aria-label="Break Effect ability score" ${editable ? "" : "disabled"}>
  </${tagName}>`;
}

async function injectEnergyAbility(app, html, attempt = 0) {
  const actor = app.actor ?? app.document;
  if (actor?.documentName !== "Actor" || actor.type !== "character") return;
  const appElement = app.element?.jquery ? app.element[0] : app.element;
  const hookElement = html?.jquery ? html[0] : html instanceof HTMLElement ? html : null;
  const rootElement = appElement?.isConnected ? appElement : hookElement;
  if (!rootElement) {
    if (attempt < 6) window.setTimeout(() => injectEnergyAbility(app, null, attempt + 1), 75);
    return;
  }
  const root = $(rootElement);
  if (root.find("[data-tsru-energy-ability]").length) return;
  const explicitCha = root.find('[data-ability="cha"], [data-ability-id="cha"], [data-key="cha"]').filter((_index, element) => {
    const rect = element.getBoundingClientRect();
    return rect.width >= 45 && rect.width <= 160 && rect.height >= 40 && rect.height <= 150 && /\bCHA\b/i.test(element.textContent);
  }).first();
  let chaCard = explicitCha;
  if (!chaCard.length) {
    chaCard = root.find("li, div").filter((_index, element) => {
      const rect = element.getBoundingClientRect();
      const text = element.textContent?.replace(/\s+/g, " ").trim() ?? "";
      return rect.width >= 45 && rect.width <= 160 && rect.height >= 45 && rect.height <= 130 && /^CHA\b/i.test(text) && /[+-]\d/.test(text);
    }).first();
  }
  if (!chaCard.length) {
    if (attempt < 6) window.setTimeout(() => injectEnergyAbility(app, null, attempt + 1), 75);
    else console.debug(`${MODULE_ID} | CHA ability card not found for`, actor.name);
    return;
  }
  const tagName = chaCard.prop("tagName")?.toLowerCase() || "div";
  chaCard.after(`${energyAbilityMarkup(actor, tagName)}${breakAbilityMarkup(actor, tagName)}`);
  const card = chaCard.next("[data-tsru-energy-ability]");
  card.parent().addClass("tsru-seven-ability-row");
  const score = card.find(".tsru-energy-ability-score");
  score.on("input.tsru", event => {
    event.stopPropagation();
    const value = clamp(event.currentTarget.value, 1, 30);
    card.find(".tsru-energy-ability-modifier").text(signedNumber(Math.floor((value - 10) / 2)));
  });
  score.on("change.tsru", async event => {
    event.preventDefault();
    event.stopPropagation();
    if (!(game.user.isGM || actor.isOwner)) return;
    const value = clamp(event.currentTarget.value, 1, 30);
    event.currentTarget.value = value;
    const updatedConfig = foundry.utils.deepClone(getConfig(actor));
    updatedConfig.regenScore = value;
    await actor.setFlag(MODULE_ID, "ultimate", updatedConfig);
    card.find(".tsru-energy-ability-modifier").text(signedNumber(Math.floor((value - 10) / 2)));
    ui.notifications.info(`${actor.name}'s Energy Regen is now ${value} (${signedNumber(Math.floor((value - 10) / 2))}).`);
  });
  const breakCard = card.next("[data-tsru-break-ability]");
  const breakScore = breakCard.find(".tsru-energy-ability-score");
  breakScore.on("input.tsru", event => {
    event.stopPropagation();
    const value = clamp(event.currentTarget.value, 1, 30);
    breakCard.find(".tsru-energy-ability-modifier").text(signedNumber(Math.floor((value - 10) / 2)));
  });
  breakScore.on("change.tsru", async event => {
    event.preventDefault();
    event.stopPropagation();
    if (!(game.user.isGM || actor.isOwner)) return;
    const value = clamp(event.currentTarget.value, 1, 30);
    event.currentTarget.value = value;
    await actor.update({[`flags.${MODULE_ID}.ultimate.breakEffectScore`]: value});
    breakCard.find(".tsru-energy-ability-modifier").text(signedNumber(Math.floor((value - 10) / 2)));
    ui.notifications.info(`${actor.name}'s Break Effect is now ${value} (${signedNumber(Math.floor((value - 10) / 2))}).`);
  });
}

function energyGain(config, kind) {
  const base = kind === "attack" ? config.attackGain : config.attackedGain;
  const tetsuoBonus = game.actors?.some(actor => actor.type === "character" && foundry.utils.getProperty(actor.getFlag(MODULE_ID, "scriptState") ?? {}, "tetsuo.teamBuff.active")) ? 1 : 0;
  return Math.max(0, (Number(base) || 0) + regenModifier(config) + tetsuoBonus);
}

function isEnergyLocked(actor) {
  if (!actor) return false;
  const config = getConfig(actor);
  if (!config.lockEnergyAfterUltimate || !config.energyLockCombatId || config.energyLockRound === null) return false;
  const combat = game.combats.get(config.energyLockCombatId);
  return Boolean(combat?.started && Number(combat.round) <= Number(config.energyLockRound));
}

async function lockEnergyUntilNextRound(actor, combat) {
  if (!actor || !combat?.started || !getConfig(actor).lockEnergyAfterUltimate) return;
  await actor.update({
    [`flags.${MODULE_ID}.ultimate.energyLockCombatId`]: combat.id,
    [`flags.${MODULE_ID}.ultimate.energyLockRound`]: Number(combat.round)
  });
}

async function clearExpiredEnergyLocks(combat) {
  if (!combat?.started) return;
  const updates = game.actors
    .filter(actor => {
      const config = getConfig(actor);
      return config.energyLockCombatId === combat.id && config.energyLockRound !== null && Number(combat.round) > Number(config.energyLockRound);
    })
    .map(actor => ({_id: actor.id, [`flags.${MODULE_ID}.ultimate.energyLockCombatId`]: "", [`flags.${MODULE_ID}.ultimate.energyLockRound`]: null}));
  if (updates.length) await Actor.updateDocuments(updates);
}

async function setEnergy(actor, value) {
  if (!actor) return;
  const config = getConfig(actor);
  const current = clamp(value, 0, config.max);
  if (current > config.current && isEnergyLocked(actor)) return config.current;
  await actor.update({[`flags.${MODULE_ID}.ultimate.current`]: current});
  return current;
}

async function addEnergy(actor, amount, reason = "") {
  if (!actor || !isAuthority()) return;
  const config = getConfig(actor);
  if (!config.enabled || !amount) return;
  if (Number(amount) > 0 && isEnergyLocked(actor)) return;
  const before = config.current;
  const after = clamp(before + Number(amount), 0, config.max);
  if (after === before) return;
  await setEnergy(actor, after);
  Hooks.callAll("tsruEnergyChanged", actor, before, after, reason);
}

function canObserveActor(actor) {
  if (!actor || !getConfig(actor).enabled) return false;
  return game.user.isGM || actor.isOwner;
}

function actorFromUuidish(value) {
  if (!value) return null;
  if (value instanceof Actor) return value;
  if (value.actor instanceof Actor) return value.actor;
  if (value.document?.actor instanceof Actor) return value.document.actor;
  if (value.actorId) return game.actors.get(value.actorId) ?? null;
  const id = String(value).split(".").at(-1);
  return game.actors.get(id) ?? canvas?.tokens?.get(id)?.actor ?? null;
}

async function actorFromUuid(value) {
  if (!value) return null;
  try {
    const doc = await fromUuid(value);
    return doc?.actor ?? (doc instanceof Actor ? doc : null);
  } catch (_error) {
    return actorFromUuidish(value);
  }
}

function userLayout(actorId) {
  const all = game.settings.get(MODULE_ID, "orbLayouts") ?? {};
  return foundry.utils.mergeObject({x: 80, y: 180, size: 128, visible: true}, all[actorId] ?? {}, {inplace: false});
}

async function saveLayout(actorId, changes) {
  const layouts = foundry.utils.deepClone(game.settings.get(MODULE_ID, "orbLayouts") ?? {});
  layouts[actorId] = foundry.utils.mergeObject(layouts[actorId] ?? {}, changes, {inplace: false});
  await game.settings.set(MODULE_ID, "orbLayouts", layouts);
}

function getAhaConfig() {
  return foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_AHA_CONFIG), game.settings.get(MODULE_ID, "ahaConfig") ?? {}, {inplace: false});
}

function currentPunchline() {
  return Math.max(0, Math.floor(Number(game.settings.get(MODULE_ID, "punchline")) || 0));
}

async function setPunchline(value, {broadcast = true} = {}) {
  if (!isAuthority()) return currentPunchline();
  const next = Math.max(0, Math.floor(Number(value) || 0));
  await game.settings.set(MODULE_ID, "punchline", next);
  if (broadcast) game.socket.emit(SOCKET, {type: "punchlineChanged", value: next, sourceUserId: game.user.id});
  refreshPunchlineHUD();
  Hooks.callAll("tsruPunchlineChanged", next);
  return next;
}

async function addPunchline(amount = 1) {
  if (!isAuthority()) throw new Error("Only the active GM can change Punchline directly.");
  if (!getAhaConfig().elationEnabled) return currentPunchline();
  return setPunchline(currentPunchline() + (Number(amount) || 0));
}

async function awardPunchlineForAttack(actor, eventKey = "") {
  if (!isAuthority() || actor?.type !== "character" || !getAhaConfig().elationEnabled) return;
  const key = `punchline-attack:${eventKey || actor.uuid}`;
  if (state.processedMessages.has(key)) return;
  state.processedMessages.add(key);
  window.setTimeout(() => state.processedMessages.delete(key), 120000);
  const ahaConfig = getAhaConfig();
  const actorConfig = getConfig(actor);
  const isElation = Boolean(ahaConfig.elationPathId) && actorConfig.pathId === ahaConfig.elationPathId;
  let multiplier = 1;
  const scriptState = actor.getFlag(MODULE_ID, "scriptState") ?? {};
  const larkTurn = foundry.utils.getProperty(scriptState, "lark.skillTurn");
  if (larkTurn && larkTurn.round === game.combat?.round && larkTurn.turn === game.combat?.turn) multiplier *= 2;
  if (game.actors.some(entry => entry.type === "character" && foundry.utils.getProperty(entry.getFlag(MODULE_ID, "scriptState") ?? {}, "tetsuo.teamBuff.active"))) multiplier *= 2;
  const gain = (isElation ? Math.max(0, Math.floor(Number(actorConfig.punchlineGain) || 0)) : 1) * multiplier;
  if (gain > 0) await addPunchline(gain);
}

async function spendPunchline(amount = 1) {
  if (!isAuthority()) throw new Error("Only the active GM can change Punchline directly.");
  const cost = Math.max(0, Math.floor(Number(amount) || 0));
  if (currentPunchline() < cost) return false;
  await setPunchline(currentPunchline() - cost);
  return true;
}

function punchlineScriptHelpers(actor) {
  const request = (operation, amount) => {
    if (isAuthority()) {
      if (operation === "add") return addPunchline(amount);
      if (operation === "spend") return spendPunchline(amount);
      if (operation === "set") return setPunchline(amount);
    }
    game.socket.emit(SOCKET, {type: "changePunchline", operation, amount: Number(amount) || 0, actorUuid: actor?.uuid, sourceUserId: game.user.id});
    return Promise.resolve(true);
  };
  return Object.freeze({
    get: currentPunchline,
    add: amount => request("add", amount),
    spend: amount => request("spend", amount),
    set: amount => request("set", amount)
  });
}

function currentTalentPoints(actor) {
  const config = getConfig(actor);
  return clamp(Math.floor(Number(config.talentPointsCurrent) || 0), 0, Math.max(0, Math.floor(Number(config.talentPointsMax) || 0)));
}

async function setTalentPoints(actor, value) {
  if (!isAuthority() || actor?.type !== "character") return currentTalentPoints(actor);
  const config = getConfig(actor);
  const maximum = Math.max(0, Math.floor(Number(config.talentPointsMax) || 0));
  const next = clamp(Math.floor(Number(value) || 0), 0, maximum);
  const before = currentTalentPoints(actor);
  if (next !== before) await actor.update({[`flags.${MODULE_ID}.ultimate.talentPointsCurrent`]: next});
  Hooks.callAll("tsruTalentPointsChanged", actor, before, next);
  return next;
}

function talentScriptHelpers(actor) {
  return Object.freeze({
    get: () => currentTalentPoints(actor),
    max: () => Math.max(0, Math.floor(Number(getConfig(actor).talentPointsMax) || 0)),
    set: value => setTalentPoints(actor, value),
    add: amount => setTalentPoints(actor, currentTalentPoints(actor) + (Number(amount) || 0)),
    spend: async amount => {
      const cost = Math.max(0, Math.floor(Number(amount) || 0));
      if (currentTalentPoints(actor) < cost) return false;
      await setTalentPoints(actor, currentTalentPoints(actor) - cost);
      return true;
    }
  });
}

function skillPointScriptHelpers(actor) {
  const request = (operation, amount) => {
    if (isAuthority()) {
      if (operation === "set") return setSkillPoints(amount);
      if (operation === "add") return setSkillPoints(currentSkillPoints() + (Number(amount) || 0));
      if (operation === "spend") {
        const cost = Math.max(0, Math.floor(Number(amount) || 0));
        if (currentSkillPoints() < cost) return Promise.resolve(false);
        return setSkillPoints(currentSkillPoints() - cost).then(() => true);
      }
    }
    game.socket.emit(SOCKET, {type: "changeSkillPoints", operation, amount: Number(amount) || 0, actorUuid: actor?.uuid, sourceUserId: game.user.id});
    return Promise.resolve(true);
  };
  return Object.freeze({
    get: currentSkillPoints,
    max: () => getSkillPointConfig().maximum,
    set: value => request("set", value),
    add: amount => request("add", amount),
    spend: amount => request("spend", amount)
  });
}

function scriptRuntimeHelpers(actor) {
  const scope = "scriptState";
  return Object.freeze({
    specialAha: fixedPunchline => triggerSpecialAha(actor, fixedPunchline),
    moduleId: MODULE_ID,
    state: Object.freeze({
      get: (key, fallback = null) => foundry.utils.getProperty(actor.getFlag(MODULE_ID, scope) ?? {}, key) ?? fallback,
      set: async (key, value) => {
        const stored = foundry.utils.deepClone(actor.getFlag(MODULE_ID, scope) ?? {});
        foundry.utils.setProperty(stored, key, value);
        await actor.setFlag(MODULE_ID, scope, stored);
        return value;
      },
      unset: async key => {
        const stored = foundry.utils.deepClone(actor.getFlag(MODULE_ID, scope) ?? {});
        const removed = foundry.utils.unsetProperty(stored, key);
        if (removed) await actor.setFlag(MODULE_ID, scope, stored);
        return removed;
      }
    })
  });
}

async function runTalentScript(actor, event) {
  const script = getConfig(actor).talentScript?.trim();
  if (!script || state.activeTalents.has(actor.id)) return;
  state.activeTalents.add(actor.id);
  try {
    const token = actor.getActiveTokens(true, true)?.[0] ?? null;
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const execute = new AsyncFunction("actor", "token", "event", "game", "canvas", "ui", "foundry", "Hooks", "punchline", "talent", "skillPoints", "tsru", `"use strict";\n${script}`);
    await execute(actor, token, event, game, canvas, ui, foundry, Hooks, punchlineScriptHelpers(actor), talentScriptHelpers(actor), skillPointScriptHelpers(actor), scriptRuntimeHelpers(actor));
  } catch (error) {
    console.error(`${MODULE_ID} | ${actor.name} Talent failed during ${event.type}`, error);
    ui.notifications.error(`${actor.name}'s Talent failed: ${error.message}`);
  } finally { state.activeTalents.delete(actor.id); }
}

async function dispatchTalentEvent(type, detail = {}, eventKey = "") {
  if (!isAuthority()) return;
  const key = eventKey ? `talent:${type}:${eventKey}` : "";
  if (key && state.talentEvents.has(key)) return;
  if (key) {
    state.talentEvents.add(key);
    window.setTimeout(() => state.talentEvents.delete(key), 120000);
  }
  const event = Object.freeze({
    type,
    id: eventKey || foundry.utils.randomID(),
    combat: detail.combat ?? game.combat ?? null,
    round: detail.combat?.round ?? game.combat?.round ?? null,
    turn: detail.combat?.turn ?? game.combat?.turn ?? null,
    ...detail
  });
  const actors = game.actors.filter(actor => actor.type === "character" && Boolean(getConfig(actor).talentScript?.trim()));
  for (const actor of actors) await runTalentScript(actor, event);
}

function punchlineLayout() {
  return foundry.utils.mergeObject({x: 580, y: 145, size: 54, visible: true}, game.settings.get(MODULE_ID, "punchlineLayout") ?? {}, {inplace: false});
}

async function savePunchlineLayout(changes) {
  const layout = foundry.utils.mergeObject(punchlineLayout(), changes, {inplace: false});
  await game.settings.set(MODULE_ID, "punchlineLayout", layout);
  return layout;
}

class PunchlineMeter {
  constructor() { this.element = null; this.drag = null; this.resize = null; }
  render() {
    const config = getAhaConfig();
    const layout = punchlineLayout();
    if (!config.elationEnabled || !layout.visible) return this.destroy();
    if (!this.element) {
      this.element = document.createElement("div");
      this.element.className = "tsru-punchline-meter";
      this.element.innerHTML = `<div class="tsru-punchline-drag" title="Move Punchline counter"><i class="fas fa-grip-lines"></i></div><img class="tsru-punchline-icon"><div class="tsru-punchline-number"></div><button type="button" class="tsru-punchline-close" title="Hide Punchline counter"><i class="fas fa-xmark"></i></button><div class="tsru-punchline-resize" title="Resize"></div>`;
      document.body.appendChild(this.element);
      this.activateListeners();
    }
    this.element.style.left = `${clamp(layout.x, 0, window.innerWidth - 40)}px`;
    this.element.style.top = `${clamp(layout.y, 0, window.innerHeight - 40)}px`;
    this.element.style.setProperty("--tsru-punchline-size", `${clamp(layout.size, 30, 160)}px`);
    this.element.style.setProperty("--tsru-punchline-font-scale", String(clamp(config.punchlineFontSize, 12, 160) / 54));
    this.element.style.setProperty("--tsru-punchline-icon-x", `${clamp(config.punchlineIconOffsetX, -100, 100)}px`);
    this.element.style.setProperty("--tsru-punchline-icon-y", `${clamp(config.punchlineIconOffsetY, -100, 100)}px`);
    this.element.style.setProperty("--tsru-punchline-color", config.color || DEFAULT_AHA_CONFIG.color);
    const icon = this.element.querySelector(".tsru-punchline-icon");
    icon.src = config.punchlineIcon || DEFAULT_AHA_CONFIG.punchlineIcon;
    icon.style.transform = `translate(${clamp(config.punchlineIconOffsetX, -100, 100)}px, ${clamp(config.punchlineIconOffsetY, -100, 100)}px)`;
    this.element.querySelector(".tsru-punchline-number").textContent = String(currentPunchline());
    loadSplashFont(config.punchlineFontFile).then(font => this.element?.style.setProperty("--tsru-punchline-font", font)).catch(error => console.warn(`${MODULE_ID} | Could not load Punchline font`, error));
    return this;
  }
  activateListeners() {
    const drag = this.element.querySelector(".tsru-punchline-drag"); const resize = this.element.querySelector(".tsru-punchline-resize");
    drag.addEventListener("pointerdown", event => { event.preventDefault(); const rect = this.element.getBoundingClientRect(); this.drag = {dx: event.clientX - rect.left, dy: event.clientY - rect.top}; drag.setPointerCapture(event.pointerId); });
    drag.addEventListener("pointermove", event => { if (!this.drag) return; this.element.style.left = `${clamp(event.clientX - this.drag.dx, 0, window.innerWidth - 40)}px`; this.element.style.top = `${clamp(event.clientY - this.drag.dy, 0, window.innerHeight - 40)}px`; });
    drag.addEventListener("pointerup", async event => { if (!this.drag) return; this.drag = null; drag.releasePointerCapture(event.pointerId); const rect = this.element.getBoundingClientRect(); await savePunchlineLayout({x: Math.round(rect.left), y: Math.round(rect.top)}); });
    resize.addEventListener("pointerdown", event => { event.preventDefault(); this.resize = {startX: event.clientX, startSize: punchlineLayout().size}; resize.setPointerCapture(event.pointerId); });
    resize.addEventListener("pointermove", event => { if (!this.resize) return; this.element.style.setProperty("--tsru-punchline-size", `${clamp(this.resize.startSize + event.clientX - this.resize.startX, 30, 160)}px`); });
    resize.addEventListener("pointerup", async event => { if (!this.resize) return; const size = clamp(this.resize.startSize + event.clientX - this.resize.startX, 30, 160); this.resize = null; resize.releasePointerCapture(event.pointerId); await savePunchlineLayout({size: Math.round(size)}); this.render(); });
    this.element.querySelector(".tsru-punchline-close").addEventListener("click", async () => { await savePunchlineLayout({visible: false}); this.destroy(); });
  }
  destroy() { this.element?.remove(); this.element = null; if (state.punchlineMeter === this) state.punchlineMeter = null; }
}

function refreshPunchlineHUD() {
  if (!getAhaConfig().elationEnabled || !punchlineLayout().visible) { state.punchlineMeter?.destroy(); return; }
  if (!state.punchlineMeter) state.punchlineMeter = new PunchlineMeter();
  state.punchlineMeter.render();
}

function appendToCanvasLayer(element) {
  const board = document.querySelector("#board");
  const canvasLayer = document.querySelector("#canvas");
  if (board instanceof HTMLCanvasElement) board.insertAdjacentElement("afterend", element);
  else (board ?? canvasLayer ?? document.body).appendChild(element);
}

function ahaLayout() {
  return foundry.utils.mergeObject({x: 220, y: 180, size: 128, visible: false}, game.settings.get(MODULE_ID, "ahaLayout") ?? {}, {inplace: false});
}

async function saveAhaLayout(changes) {
  const layout = foundry.utils.mergeObject(ahaLayout(), changes, {inplace: false});
  await game.settings.set(MODULE_ID, "ahaLayout", layout);
  return layout;
}

function playAhaVideo({video}) {
  if (!video) return;
  document.querySelectorAll(".tsru-aha-overlay").forEach(element => element.remove());
  const overlay = document.createElement("div");
  overlay.className = "tsru-aha-overlay";
  overlay.innerHTML = `<video src="${escapeHTML(video)}" autoplay playsinline preload="auto"></video>`;
  appendToCanvasLayer(overlay);
  const player = overlay.querySelector("video");
  let removed = false;
  const failsafe = window.setTimeout(remove, 10000);
  function remove() {
    if (removed) return;
    removed = true;
    window.clearTimeout(failsafe);
    try { player.pause(); } catch (_error) {}
    player.removeAttribute("src");
    player.load();
    overlay.remove();
  }
  player.addEventListener("ended", remove, {once: true});
  player.addEventListener("error", remove, {once: true});
  const playback = player.play();
  if (playback?.catch) playback.catch(() => {
    player.muted = true;
    player.play().catch(error => {
      console.warn(`${MODULE_ID} | Aha Instant video could not autoplay on this client`, error);
      remove();
    });
  });
}

function triggerAhaInstant() {
  if (!game.user.isGM) return;
  const config = getAhaConfig();
  if (!config.elationEnabled) return ui.notifications.warn("Aha Instant is disabled because Elation is not on the team.");
  if (!config.video) return ui.notifications.warn("Configure an Aha Instant WebM first.");
  playAhaVideo(config);
  game.socket.emit(SOCKET, {type: "showAhaVideo", sourceUserId: game.user.id, playbackId: foundry.utils.randomID(), video: config.video});
}

function isAhaCombatant(combatant) {
  return Boolean(combatant?.getFlag(MODULE_ID, "ahaInstantCombatant"));
}

function isElationActionCombatant(combatant) {
  return Boolean(combatant?.getFlag(MODULE_ID, "elationActionCombatant"));
}

function combatTurnSnapshot(combat) {
  const combatant = combat?.combatant;
  return combatant ? {
    id: combatant.id,
    actorId: combatant.actorId ?? combatant.actor?.id ?? null,
    ultimate: Boolean(combatant.getFlag(MODULE_ID, "temporaryUltimate")),
    elation: isElationActionCombatant(combatant)
  } : null;
}

async function removeOrphanedTemporaryTurns(combat) {
  if (!isAuthority() || !combat) return;
  const queue = state.ultimateQueues.get(combat.id);
  const orphanedUltimates = combat.combatants.filter(entry => {
    if (!entry.getFlag(MODULE_ID, "temporaryUltimate")) return false;
    const pending = state.pendingUltimates.get(entry.actorId);
    return pending?.combatantId !== entry.id && queue?.activeActorId !== entry.actorId;
  });
  const completedElation = combat.combatants.filter(entry => isElationActionCombatant(entry) && entry.getFlag(MODULE_ID, "completed"));
  const ids = [...new Set([...orphanedUltimates, ...completedElation].map(entry => entry.id))];
  if (!ids.length) return;
  state.suppressCombatHook = true;
  try { await combat.deleteEmbeddedDocuments("Combatant", ids); }
  finally { state.suppressCombatHook = false; }
}

async function ensureAhaCombatant(combat) {
  if (!isAuthority() || !combat) return null;
  const config = getAhaConfig();
  const existing = combat.combatants.find(isAhaCombatant);
  if (!config.elationEnabled || !config.initiativeEnabled) {
    if (existing) await combat.deleteEmbeddedDocuments("Combatant", [existing.id]);
    return null;
  }
  const rolledInitiatives = combat.combatants
    .filter(combatant => !isAhaCombatant(combatant) && !isElationActionCombatant(combatant) && combatant.initiative !== null && Number.isFinite(Number(combatant.initiative)))
    .map(combatant => Number(combatant.initiative));
  if (!rolledInitiatives.length) return existing ?? null;
  const data = {
    name: "Aha Instant",
    initiative: Math.min(...rolledInitiatives) - 1,
    img: config.combatantImage || config.buttonImage || DEFAULT_AHA_CONFIG.combatantImage
  };
  if (existing) {
    await existing.update(data);
    return existing;
  }
  const [created] = await combat.createEmbeddedDocuments("Combatant", [{
    ...data,
    flags: {[MODULE_ID]: {ahaInstantCombatant: true}}
  }]);
  return created ?? null;
}

async function clearElationActionTurns(combat, {resetPunchline = false, resume = false, resumeRound = null} = {}) {
  if (!isAuthority() || !combat) return;
  const temporary = combat.combatants.filter(isElationActionCombatant);
  state.suppressCombatHook = true;
  try {
    if (temporary.length) await combat.deleteEmbeddedDocuments("Combatant", temporary.map(entry => entry.id));
    if (resetPunchline) await setPunchline(0);
    if (resume && combat.started) await combat.update({round: Number(resumeRound ?? combat.round) + 1, turn: 0});
  } finally { state.suppressCombatHook = false; }
  for (const entry of temporary) {
    const pending = state.pendingElationActions.get(entry.id);
    if (pending?.timer) window.clearTimeout(pending.timer);
    state.pendingElationActions.delete(entry.id);
    state.activeElationActions.delete(entry.id);
  }
}

async function triggerSpecialAha(actor, fixedPunchline = 20) {
  if (!isAuthority()) {
    game.socket.emit(SOCKET, {type: "triggerSpecialAha", actorUuid: actor?.uuid, fixedPunchline, sourceUserId: game.user.id});
    return true;
  }
  const combat = game.combat;
  const aha = combat?.combatants?.find(isAhaCombatant);
  if (!combat?.started || !aha || !getAhaConfig().elationEnabled) return false;
  if (state.specialAha) return false;
  const interrupted = combat.combatant;
  state.specialAha = {
    id: foundry.utils.randomID(),
    combatId: combat.id,
    resumeRound: combat.round,
    resumeCombatantId: interrupted?.id ?? null,
    savedPunchline: currentPunchline()
  };
  state.lastElationSequenceKey = "";
  await setPunchline(Math.max(0, Math.floor(Number(fixedPunchline) || 20)));
  const ahaIndex = combat.turns.findIndex(entry => entry.id === aha.id);
  if (ahaIndex < 0) { state.specialAha = null; return false; }
  await combat.update({turn: ahaIndex});
  return true;
}

async function finishSpecialAha(combat) {
  const special = state.specialAha?.combatId === combat?.id ? state.specialAha : null;
  if (!special) return false;
  state.specialAha = null;
  await clearElationActionTurns(combat);
  await setPunchline(special.savedPunchline);
  const resumeIndex = combat.turns.findIndex(entry => entry.id === special.resumeCombatantId);
  if (resumeIndex >= 0) await combat.update({round: special.resumeRound, turn: resumeIndex});
  return true;
}

async function createElationActionTurns(combat) {
  if (!isAuthority() || !combat?.started || !getAhaConfig().elationEnabled) return [];
  const aha = combat.combatant;
  if (!isAhaCombatant(aha)) return [];
  const sequenceKey = `${combat.id}:${combat.round}:${aha.id}:${state.specialAha?.id ?? "normal"}`;
  if (state.lastElationSequenceKey === sequenceKey) return combat.combatants.filter(isElationActionCombatant);
  state.lastElationSequenceKey = sequenceKey;
  await clearElationActionTurns(combat);
  const pathId = getAhaConfig().elationPathId;
  if (!pathId) { if (!await finishSpecialAha(combat)) await setPunchline(0); return []; }

  const seenActors = new Set();
  const eligible = combat.combatants.filter(combatant => {
    const actor = combatant.actor;
    if (isAhaCombatant(combatant) || isElationActionCombatant(combatant) || combatant.getFlag(MODULE_ID, "temporaryUltimate") || actor?.type !== "character" || combatant.initiative === null) return false;
    if (seenActors.has(actor.id) || getConfig(actor).pathId !== pathId) return false;
    seenActors.add(actor.id);
    return true;
  }).sort((left, right) => Number(right.initiative) - Number(left.initiative) || String(left.actor?.name ?? "").localeCompare(String(right.actor?.name ?? "")) || left.id.localeCompare(right.id));

  if (!eligible.length) { if (!await finishSpecialAha(combat)) await setPunchline(0); return []; }
  const ahaInitiative = Number(aha.initiative ?? -999);
  return combat.createEmbeddedDocuments("Combatant", eligible.map((source, index) => ({
    name: `ELATION ACTION — ${source.actor.name}`,
    actorId: source.actor.id,
    // Actor-backed rather than token-backed so the temporary turn cannot collide
    // with the character's existing token combatant.
    tokenId: null,
    sceneId: null,
    initiative: ahaInitiative - ((index + 1) / 1000),
    img: source.actor.img || "icons/svg/mystery-man.svg",
    flags: {[MODULE_ID]: {elationActionCombatant: true, sequenceKey, sequenceOrder: index, sourceCombatantId: source.id, resumeRound: combat.round, completed: false}}
  })));
}

async function syncAhaCombatants() {
  if (!isAuthority()) return;
  for (const combat of game.combats ?? []) await ensureAhaCombatant(combat);
}

async function maybeEnsureAhaCombatant(combat, {force = false} = {}) {
  if (!isAuthority() || !combat || !getAhaConfig().elationEnabled || !getAhaConfig().initiativeEnabled) return null;
  const hasRolledInitiative = combat.combatants.some(combatant => !isAhaCombatant(combatant) && combatant.initiative !== null);
  if (!force && !hasRolledInitiative) return null;
  try { return await ensureAhaCombatant(combat); }
  catch (error) {
    console.error(`${MODULE_ID} | Could not add Aha Instant to combat`, error);
    ui.notifications.error(`Could not add Aha Instant to initiative: ${error.message}`);
    return null;
  }
}

class AhaButton {
  constructor() { this.element = null; this.drag = null; this.resize = null; }
  render() {
    if (!game.user.isGM || !getAhaConfig().elationEnabled) return this.destroy();
    const layout = ahaLayout();
    if (!layout.visible) return this.destroy();
    const config = getAhaConfig();
    if (!this.element) {
      this.element = document.createElement("div");
      this.element.className = "tsru-aha-widget";
      this.element.innerHTML = `<div class="tsru-aha-drag" title="Drag Aha Instant"><i class="fas fa-grip-lines"></i></div><button type="button" class="tsru-aha-button" title="Play Aha Instant for everyone"><img></button><div class="tsru-aha-label">Aha Instant</div><button type="button" class="tsru-aha-close" title="Hide Aha Instant"><i class="fas fa-xmark"></i></button><div class="tsru-aha-resize" title="Resize"></div>`;
      document.body.appendChild(this.element);
      this.activateListeners();
    }
    this.element.style.left = `${clamp(layout.x, 0, window.innerWidth - 40)}px`;
    this.element.style.top = `${clamp(layout.y, 0, window.innerHeight - 40)}px`;
    this.element.style.setProperty("--tsru-aha-size", `${clamp(layout.size, 72, 360)}px`);
    this.element.style.setProperty("--tsru-aha-color", config.color || DEFAULT_AHA_CONFIG.color);
    this.element.querySelector("img").src = config.buttonImage || DEFAULT_AHA_CONFIG.buttonImage;
    return this;
  }
  activateListeners() {
    const drag = this.element.querySelector(".tsru-aha-drag");
    const resize = this.element.querySelector(".tsru-aha-resize");
    drag.addEventListener("pointerdown", event => {
      event.preventDefault(); const rect = this.element.getBoundingClientRect();
      this.drag = {dx: event.clientX - rect.left, dy: event.clientY - rect.top}; drag.setPointerCapture(event.pointerId);
    });
    drag.addEventListener("pointermove", event => {
      if (!this.drag) return;
      this.element.style.left = `${clamp(event.clientX - this.drag.dx, 0, window.innerWidth - 40)}px`;
      this.element.style.top = `${clamp(event.clientY - this.drag.dy, 0, window.innerHeight - 40)}px`;
    });
    drag.addEventListener("pointerup", async event => {
      if (!this.drag) return; this.drag = null; drag.releasePointerCapture(event.pointerId);
      const rect = this.element.getBoundingClientRect(); await saveAhaLayout({x: Math.round(rect.left), y: Math.round(rect.top)});
    });
    resize.addEventListener("pointerdown", event => {
      event.preventDefault(); const rect = this.element.getBoundingClientRect();
      this.resize = {startX: event.clientX, startSize: rect.width}; resize.setPointerCapture(event.pointerId);
    });
    resize.addEventListener("pointermove", event => {
      if (!this.resize) return;
      this.element.style.setProperty("--tsru-aha-size", `${clamp(this.resize.startSize + event.clientX - this.resize.startX, 72, 360)}px`);
    });
    resize.addEventListener("pointerup", async event => {
      if (!this.resize) return; const size = clamp(this.resize.startSize + event.clientX - this.resize.startX, 72, 360);
      this.resize = null; resize.releasePointerCapture(event.pointerId); await saveAhaLayout({size: Math.round(size)});
    });
    this.element.querySelector(".tsru-aha-close").addEventListener("click", async () => { await saveAhaLayout({visible: false}); this.destroy(); });
    this.element.querySelector(".tsru-aha-button").addEventListener("click", triggerAhaInstant);
  }
  destroy() { this.element?.remove(); this.element = null; if (state.ahaButton === this) state.ahaButton = null; }
}

function refreshAhaButton() {
  if (!game.user.isGM || !getAhaConfig().elationEnabled || !ahaLayout().visible) { state.ahaButton?.destroy(); return; }
  if (!state.ahaButton) state.ahaButton = new AhaButton();
  state.ahaButton.render();
}

async function showAhaButton() {
  if (!getAhaConfig().elationEnabled) return ui.notifications.warn("Enable ‘Elation on Team?’ before showing Aha Instant.");
  await saveAhaLayout({visible: true}); refreshAhaButton();
}

function openAhaInstantControls() {
  if (!game.user.isGM || ahaToolbarOpening) return;
  ahaToolbarOpening = true;
  window.setTimeout(() => { ahaToolbarOpening = false; }, 350);
  try { new AhaConfig().render(true); }
  catch (error) {
    console.error(`${MODULE_ID} | Could not open Aha Instant configuration`, error);
    ui.notifications.error(`Could not open Aha Instant configuration: ${error.message}`);
  }
}

function registerAhaToolbarFallback() {
  if (document.documentElement.dataset.tsruAhaToolbarListener) return;
  document.documentElement.dataset.tsruAhaToolbarListener = "true";
  document.addEventListener("click", event => {
    const ahaControl = event.target.closest?.('[data-tool="tsru-aha-instant"], [data-control="tsru-aha-instant"], [data-action="tsru-aha-instant"]');
    if (ahaControl) return openAhaInstantControls();
    const gmControl = event.target.closest?.('[data-tool="tsru-gm-panel"], [data-control="tsru-gm-panel"], [data-action="tsru-gm-panel"]');
    if (gmControl) openStarRailGMPanel();
  }, true);
}

function getSkillPointConfig() {
  const stored = game.settings.get(MODULE_ID, "skillPointConfig") ?? {};
  const config = foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_SKILL_POINT_CONFIG), stored, {inplace: false});
  config.maximum = Math.max(1, Math.floor(Number(config.maximum) || DEFAULT_SKILL_POINT_CONFIG.maximum));
  config.starting = clamp(Math.floor(Number(config.starting)), 0, config.maximum);
  config.pointsPerRow = clamp(Math.floor(Number(config.pointsPerRow)), 1, config.maximum);
  config.pointSpacing = clamp(Number(config.pointSpacing), -50, 50);
  return config;
}

function currentSkillPoints() {
  return clamp(Math.floor(Number(game.settings.get(MODULE_ID, "skillPoints"))), 0, getSkillPointConfig().maximum);
}

async function setSkillPoints(value, {broadcast = true} = {}) {
  if (!isAuthority()) return currentSkillPoints();
  const next = clamp(Math.floor(Number(value)), 0, getSkillPointConfig().maximum);
  await game.settings.set(MODULE_ID, "skillPoints", next);
  if (broadcast) game.socket.emit(SOCKET, {type: "skillPointsChanged", value: next, sourceUserId: game.user.id});
  refreshSkillUI();
  Hooks.callAll("tsruSkillPointsChanged", next);
  return next;
}

function skillMeterLayout() {
  return foundry.utils.mergeObject({x: 420, y: 80, size: 42, visible: true}, game.settings.get(MODULE_ID, "skillMeterLayout") ?? {}, {inplace: false});
}

async function saveSkillMeterLayout(changes) {
  const layout = foundry.utils.mergeObject(skillMeterLayout(), changes, {inplace: false});
  await game.settings.set(MODULE_ID, "skillMeterLayout", layout);
  return layout;
}

function skillButtonLayout(actorId) {
  const layouts = game.settings.get(MODULE_ID, "skillButtonLayouts") ?? {};
  const index = Math.max(0, game.actors.filter(actor => actor.type === "character").findIndex(actor => actor.id === actorId));
  return foundry.utils.mergeObject({x: 240, y: 330 + index * 118, size: 96, visible: false}, layouts[actorId] ?? {}, {inplace: false});
}

async function saveSkillButtonLayout(actorId, changes) {
  const layouts = foundry.utils.deepClone(game.settings.get(MODULE_ID, "skillButtonLayouts") ?? {});
  layouts[actorId] = foundry.utils.mergeObject(layouts[actorId] ?? {}, changes, {inplace: false});
  await game.settings.set(MODULE_ID, "skillButtonLayouts", layouts);
}

class SkillPointMeter {
  constructor() { this.element = null; this.drag = null; this.resize = null; }
  render() {
    const layout = skillMeterLayout();
    if (!layout.visible) return this.destroy();
    if (!this.element) {
      this.element = document.createElement("div");
      this.element.className = "tsru-skill-meter";
      this.element.innerHTML = `<div class="tsru-skill-meter-drag" title="Move Skill Point meter"><i class="fas fa-grip-lines"></i></div><div class="tsru-skill-meter-content"><div class="tsru-skill-point-number"></div><div class="tsru-skill-point-separator" aria-hidden="true"></div><div class="tsru-skill-pips"></div></div><div class="tsru-skill-meter-underline"></div><button type="button" class="tsru-skill-meter-close" title="Hide Skill Point meter"><i class="fas fa-xmark"></i></button><div class="tsru-skill-meter-resize" title="Resize"></div>`;
      document.body.appendChild(this.element);
      this.activateListeners();
    }
    const config = getSkillPointConfig();
    const current = currentSkillPoints();
    const spent = config.maximum - current;
    const drainOrder = [];
    for (let start = 0; start < config.maximum; start += config.pointsPerRow) {
      const end = Math.min(start + config.pointsPerRow, config.maximum);
      for (let index = end - 1; index >= start; index--) drainOrder.push(index);
    }
    const empty = new Set(drainOrder.slice(0, spent));
    const pips = Array.from({length: config.maximum}, (_entry, index) => {
      const active = !empty.has(index);
      const src = active ? config.illuminatedIcon : config.emptyIcon;
      return `<img class="tsru-skill-pip ${active ? "is-filled" : "is-empty"}" src="${escapeHTML(src)}" alt="${active ? "Filled" : "Empty"} Skill Point">`;
    }).join("");
    this.element.querySelector(".tsru-skill-pips").innerHTML = pips;
    this.element.querySelector(".tsru-skill-pips").style.setProperty("--tsru-skill-columns", String(config.pointsPerRow));
    this.element.querySelector(".tsru-skill-pips").style.setProperty("--tsru-skill-point-gap", `${config.pointSpacing}px`);
    this.element.querySelector(".tsru-skill-point-number").textContent = String(current);
    loadSplashFont(config.numberFontFile).then(font => this.element?.style.setProperty("--tsru-skill-number-font", font)).catch(error => console.warn(`${MODULE_ID} | Could not load Skill Point font`, error));
    this.element.style.left = `${clamp(layout.x, 0, window.innerWidth - 40)}px`;
    this.element.style.top = `${clamp(layout.y, 0, window.innerHeight - 40)}px`;
    this.element.style.setProperty("--tsru-skill-pip-size", `${clamp(layout.size, 24, 100)}px`);
    return this;
  }
  activateListeners() {
    const drag = this.element.querySelector(".tsru-skill-meter-drag");
    const resize = this.element.querySelector(".tsru-skill-meter-resize");
    drag.addEventListener("pointerdown", event => { event.preventDefault(); const rect = this.element.getBoundingClientRect(); this.drag = {dx: event.clientX - rect.left, dy: event.clientY - rect.top}; drag.setPointerCapture(event.pointerId); });
    drag.addEventListener("pointermove", event => { if (!this.drag) return; this.element.style.left = `${clamp(event.clientX - this.drag.dx, 0, window.innerWidth - 40)}px`; this.element.style.top = `${clamp(event.clientY - this.drag.dy, 0, window.innerHeight - 40)}px`; });
    drag.addEventListener("pointerup", async event => { if (!this.drag) return; this.drag = null; drag.releasePointerCapture(event.pointerId); const rect = this.element.getBoundingClientRect(); await saveSkillMeterLayout({x: Math.round(rect.left), y: Math.round(rect.top)}); });
    resize.addEventListener("pointerdown", event => { event.preventDefault(); this.resize = {startX: event.clientX, startSize: skillMeterLayout().size}; resize.setPointerCapture(event.pointerId); });
    resize.addEventListener("pointermove", event => { if (!this.resize) return; this.element.style.setProperty("--tsru-skill-pip-size", `${clamp(this.resize.startSize + event.clientX - this.resize.startX, 24, 100)}px`); });
    resize.addEventListener("pointerup", async event => { if (!this.resize) return; const size = clamp(this.resize.startSize + event.clientX - this.resize.startX, 24, 100); this.resize = null; resize.releasePointerCapture(event.pointerId); await saveSkillMeterLayout({size: Math.round(size)}); this.render(); });
    this.element.querySelector(".tsru-skill-meter-close").addEventListener("click", async () => { await saveSkillMeterLayout({visible: false}); this.destroy(); });
  }
  destroy() { this.element?.remove(); this.element = null; if (state.skillMeter === this) state.skillMeter = null; }
}

function canUseSkillActor(actor) {
  return Boolean(actor?.type === "character" && getConfig(actor).skillEnabled && (game.user.isGM || actor.isOwner));
}

class SkillButton {
  constructor(actor) { this.actor = actor; this.element = null; this.drag = null; this.resize = null; }
  render() {
    const layout = skillButtonLayout(this.actor.id);
    if (!canUseSkillActor(this.actor) || !layout.visible) return this.destroy();
    if (!this.element) {
      this.element = document.createElement("div");
      this.element.className = "tsru-skill-widget";
      this.element.dataset.actorId = this.actor.id;
      this.element.innerHTML = `<div class="tsru-skill-drag" title="Move Skill button"><i class="fas fa-grip-lines"></i></div><button type="button" class="tsru-skill-button"><img></button><div class="tsru-skill-label">Skill</div><button type="button" class="tsru-skill-close" title="Hide Skill button"><i class="fas fa-xmark"></i></button><div class="tsru-skill-resize" title="Resize"></div>`;
      document.body.appendChild(this.element);
      this.activateListeners();
    }
    const config = getConfig(this.actor);
    const element = getElements().find(entry => entry.id === config.elementId);
    const available = currentSkillPoints() > 0 && !state.skillLocks.has(this.actor.id);
    this.element.style.left = `${clamp(layout.x, 0, window.innerWidth - 40)}px`;
    this.element.style.top = `${clamp(layout.y, 0, window.innerHeight - 40)}px`;
    this.element.style.setProperty("--tsru-skill-size", `${clamp(layout.size, 64, 280)}px`);
    this.element.style.setProperty("--tsru-skill-color", element?.readyColor || DEFAULT_CONFIG.readyColor);
    this.element.classList.toggle("is-unavailable", !available);
    const button = this.element.querySelector(".tsru-skill-button");
    button.disabled = !available;
    button.title = available ? `${this.actor.name}: Use Skill (costs 1 Skill Point)` : state.skillLocks.has(this.actor.id) ? "This Skill is currently resolving." : "No Skill Points remain.";
    button.querySelector("img").src = config.skillButtonImage || this.actor.img || "icons/svg/sword.svg";
    return this;
  }
  activateListeners() {
    const drag = this.element.querySelector(".tsru-skill-drag"); const resize = this.element.querySelector(".tsru-skill-resize");
    drag.addEventListener("pointerdown", event => { event.preventDefault(); const rect = this.element.getBoundingClientRect(); this.drag = {dx: event.clientX - rect.left, dy: event.clientY - rect.top}; drag.setPointerCapture(event.pointerId); });
    drag.addEventListener("pointermove", event => { if (!this.drag) return; this.element.style.left = `${clamp(event.clientX - this.drag.dx, 0, window.innerWidth - 40)}px`; this.element.style.top = `${clamp(event.clientY - this.drag.dy, 0, window.innerHeight - 40)}px`; });
    drag.addEventListener("pointerup", async event => { if (!this.drag) return; this.drag = null; drag.releasePointerCapture(event.pointerId); const rect = this.element.getBoundingClientRect(); await saveSkillButtonLayout(this.actor.id, {x: Math.round(rect.left), y: Math.round(rect.top)}); });
    resize.addEventListener("pointerdown", event => { event.preventDefault(); const rect = this.element.getBoundingClientRect(); this.resize = {startX: event.clientX, startSize: rect.width}; resize.setPointerCapture(event.pointerId); });
    resize.addEventListener("pointermove", event => { if (!this.resize) return; this.element.style.setProperty("--tsru-skill-size", `${clamp(this.resize.startSize + event.clientX - this.resize.startX, 64, 280)}px`); });
    resize.addEventListener("pointerup", async event => { if (!this.resize) return; const size = clamp(this.resize.startSize + event.clientX - this.resize.startX, 64, 280); this.resize = null; resize.releasePointerCapture(event.pointerId); await saveSkillButtonLayout(this.actor.id, {size: Math.round(size)}); });
    this.element.querySelector(".tsru-skill-close").addEventListener("click", async () => { await saveSkillButtonLayout(this.actor.id, {visible: false}); this.destroy(); });
    this.element.querySelector(".tsru-skill-button").addEventListener("click", () => requestSkill(this.actor));
  }
  destroy() { this.element?.remove(); this.element = null; state.skillButtons.delete(this.actor.id); }
}

function refreshSkillUI() {
  const meterLayout = skillMeterLayout();
  if (meterLayout.visible) { if (!state.skillMeter) state.skillMeter = new SkillPointMeter(); state.skillMeter.render(); }
  else state.skillMeter?.destroy();
  for (const actor of game.actors ?? []) {
    if (!canUseSkillActor(actor) || !skillButtonLayout(actor.id).visible) { state.skillButtons.get(actor.id)?.destroy(); continue; }
    let button = state.skillButtons.get(actor.id);
    if (!button) { button = new SkillButton(actor); state.skillButtons.set(actor.id, button); }
    button.render();
  }
}

async function showSkillUI() {
  await saveSkillMeterLayout({visible: true});
  for (const actor of game.actors.filter(canUseSkillActor)) await saveSkillButtonLayout(actor.id, {visible: true});
  refreshSkillUI();
}

function getElements() {
  return (game.settings.get(MODULE_ID, "elements") ?? []).map(element => ({
    ...element,
    chargeColor: element.chargeColor || element.color || DEFAULT_CONFIG.chargeColor,
    readyColor: element.readyColor || element.color || DEFAULT_CONFIG.readyColor,
    color: element.readyColor || element.color || DEFAULT_CONFIG.readyColor
  }));
}

function getPaths() {
  const stored = game.settings.get(MODULE_ID, "paths") ?? [];
  return (Array.isArray(stored) ? stored : Object.values(stored)).filter(Boolean);
}

function droppedAssetPath(event) {
  const transfer = event.originalEvent?.dataTransfer ?? event.dataTransfer;
  const plain = transfer?.getData("text/plain") || transfer?.getData("text/uri-list") || "";
  try {
    const data = JSON.parse(plain);
    return data.src || data.img || data.path || data.texture?.src || "";
  } catch (_error) { return plain.trim(); }
}

function activateImageDrops(html) {
  html.find(".tsru-drop-image").on("dragover", event => { event.preventDefault(); event.currentTarget.classList.add("is-dragover"); });
  html.find(".tsru-drop-image").on("dragleave", event => event.currentTarget.classList.remove("is-dragover"));
  html.find(".tsru-drop-image").on("drop", event => {
    event.preventDefault(); event.currentTarget.classList.remove("is-dragover");
    const path = droppedAssetPath(event);
    if (path) $(event.currentTarget).val(path).trigger("change");
  });
}

async function injectCharacterBadges(app, html) {
  const actor = app.actor ?? app.document;
  if (actor?.documentName !== "Actor" || actor.type !== "character") return;
  const rootElement = html?.jquery ? html[0] : html instanceof HTMLElement ? html : app.element?.[0] ?? app.element;
  if (!rootElement) return;
  const root = $(rootElement);
  root.find("[data-tsru-character-badges]").remove();
  root.find("[data-tsru-talent-counter]").remove();
  const config = getConfig(actor);
  const element = getElements().find(entry => entry.id === config.elementId);
  const path = getPaths().find(entry => entry.id === config.pathId);
  const typeName = String(actor.system?.details?.type?.value || actor.system?.details?.type || "").trim();
  const speciesCandidates = root.find('.species, [class*="species"], [data-action*="species"], section, div').filter((_index, node) => {
    const rect = node.getBoundingClientRect();
    const text = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const matchesType = typeName && text.toLocaleLowerCase().startsWith(typeName.toLocaleLowerCase());
    return rect.width >= 150 && rect.width <= 500 && rect.height >= 38 && rect.height <= 100 && (matchesType || /^Humanoid\b/i.test(text));
  }).toArray().sort((a, b) => (a.getBoundingClientRect().width * a.getBoundingClientRect().height) - (b.getBoundingClientRect().width * b.getBoundingClientRect().height));
  let host = speciesCandidates.length ? $(speciesCandidates[0]) : $();
  const speciesHostFound = Boolean(host.length);
  if (!host.length) {
    const portrait = root.find('img[data-edit="img"], img.profile, img.portrait, [data-application-part="portrait"] img').first();
    if (!portrait.length) return;
    host = portrait.parent().addClass("tsru-portrait-badge-host");
  } else host.addClass("tsru-species-badge-host");
  if (speciesHostFound) {
    const talentMaximum = Math.max(0, Math.floor(Number(config.talentPointsMax) || 0));
    const talentCurrent = clamp(config.talentPointsCurrent, 0, talentMaximum);
    host.before(`<div class="tsru-sheet-talent-counter" data-tsru-talent-counter title="Talent Points reset to 0 when combat starts"><span><i class="fas fa-star"></i> Talent Points</span><strong><b data-tsru-talent-current>${talentCurrent}</b><i>/</i><b data-tsru-talent-max>${talentMaximum}</b></strong></div>`);
  }
  if (!element?.icon && !path?.icon) return;
  const badges = $(`<div class="tsru-character-badges" data-tsru-character-badges></div>`);
  if (element?.icon) badges.append(`<div class="tsru-character-badge" title="Element: ${escapeHTML(element.name)}" style="--tsru-badge-color:${element.readyColor || element.color || "#fff"}"><img src="${escapeHTML(element.icon)}"></div>`);
  if (path?.icon) badges.append(`<div class="tsru-character-badge" title="Path: ${escapeHTML(path.name)}"><img src="${escapeHTML(path.icon)}"></div>`);
  host.append(badges);
}

function refreshTalentCounter(actor) {
  if (!actor) return;
  const config = getConfig(actor);
  const maximum = Math.max(0, Math.floor(Number(config.talentPointsMax) || 0));
  const current = clamp(config.talentPointsCurrent, 0, maximum);
  for (const app of Object.values(ui.windows ?? {})) {
    if (app.actor?.id !== actor.id) continue;
    const root = app.element?.jquery ? app.element : $(app.element ?? []);
    root.find("[data-tsru-talent-current]").text(current);
    root.find("[data-tsru-talent-max]").text(maximum);
  }
}

class UltimateOrb {
  constructor(actor) {
    this.actor = actor;
    this.element = null;
    this.drag = null;
    this.resize = null;
  }

  render() {
    const config = getConfig(this.actor);
    if (!canObserveActor(this.actor)) return this.destroy();
    const layout = userLayout(this.actor.id);
    if (!layout.visible) return this.destroy();

    if (!this.element) {
      this.element = document.createElement("div");
      this.element.className = "tsru-orb-widget";
      this.element.dataset.actorId = this.actor.id;
      this.element.innerHTML = `
        <div class="tsru-orb-drag" title="Drag Ultimate orb"><i class="fas fa-grip-lines"></i></div>
        <button type="button" class="tsru-orb" aria-label="Activate Ultimate">
          <img class="tsru-orb-image">
          <span class="tsru-orb-fill"></span>
          <span class="tsru-orb-percent"></span>
        </button>
        <div class="tsru-ready-text">Ultimate Ready</div>
        <button type="button" class="tsru-orb-close" title="Hide orb"><i class="fas fa-xmark"></i></button>
        <div class="tsru-orb-resize" title="Resize"></div>`;
      document.body.appendChild(this.element);
      this.activateListeners();
    }

    const percent = clamp((config.current / config.max) * 100, 0, 100);
    const ready = percent >= 100;
    const element = getElements().find(entry => entry.id === config.elementId);
    const color = ready
      ? (element?.readyColor || DEFAULT_CONFIG.readyColor)
      : (element?.chargeColor || DEFAULT_CONFIG.chargeColor);
    this.element.style.left = `${clamp(layout.x, 0, window.innerWidth - 40)}px`;
    this.element.style.top = `${clamp(layout.y, 0, window.innerHeight - 40)}px`;
    this.element.style.setProperty("--tsru-size", `${clamp(layout.size, 72, 360)}px`);
    this.element.style.setProperty("--tsru-fill", `${percent}%`);
    this.element.style.setProperty("--tsru-color", color || DEFAULT_CONFIG.chargeColor);
    this.element.classList.toggle("has-energy", percent > 0 && !ready);
    this.element.classList.toggle("is-ready", ready);
    this.element.querySelector(".tsru-orb-image").src = config.ultimateButtonImage || config.orbImage || this.actor.img || "icons/svg/mystery-man.svg";
    this.element.querySelector(".tsru-orb-percent").textContent = config.showPercent ? `${Math.round(percent)}%` : "";
    this.element.querySelector(".tsru-orb").disabled = !ready || state.ultimateLocks.has(this.actor.id);
    this.element.querySelector(".tsru-orb").title = ready ? `${this.actor.name}: Activate Ultimate` : `${this.actor.name}: ${config.current}/${config.max} Energy`;
    return this;
  }

  activateListeners() {
    const dragHandle = this.element.querySelector(".tsru-orb-drag");
    const resizeHandle = this.element.querySelector(".tsru-orb-resize");
    dragHandle.addEventListener("pointerdown", event => {
      event.preventDefault();
      const rect = this.element.getBoundingClientRect();
      this.drag = {dx: event.clientX - rect.left, dy: event.clientY - rect.top};
      dragHandle.setPointerCapture(event.pointerId);
    });
    dragHandle.addEventListener("pointermove", event => {
      if (!this.drag) return;
      const x = clamp(event.clientX - this.drag.dx, 0, window.innerWidth - 40);
      const y = clamp(event.clientY - this.drag.dy, 0, window.innerHeight - 40);
      this.element.style.left = `${x}px`;
      this.element.style.top = `${y}px`;
    });
    dragHandle.addEventListener("pointerup", async event => {
      if (!this.drag) return;
      this.drag = null;
      dragHandle.releasePointerCapture(event.pointerId);
      const rect = this.element.getBoundingClientRect();
      await saveLayout(this.actor.id, {x: Math.round(rect.left), y: Math.round(rect.top)});
    });
    resizeHandle.addEventListener("pointerdown", event => {
      event.preventDefault();
      const rect = this.element.getBoundingClientRect();
      this.resize = {startX: event.clientX, startSize: rect.width};
      resizeHandle.setPointerCapture(event.pointerId);
    });
    resizeHandle.addEventListener("pointermove", event => {
      if (!this.resize) return;
      const size = clamp(this.resize.startSize + event.clientX - this.resize.startX, 72, 360);
      this.element.style.setProperty("--tsru-size", `${size}px`);
    });
    resizeHandle.addEventListener("pointerup", async event => {
      if (!this.resize) return;
      const size = clamp(this.resize.startSize + event.clientX - this.resize.startX, 72, 360);
      this.resize = null;
      resizeHandle.releasePointerCapture(event.pointerId);
      await saveLayout(this.actor.id, {size: Math.round(size)});
    });
    this.element.querySelector(".tsru-orb-close").addEventListener("click", async () => {
      await saveLayout(this.actor.id, {visible: false});
      this.destroy();
    });
    this.element.querySelector(".tsru-orb").addEventListener("click", () => requestUltimate(this.actor));
  }

  destroy() {
    this.element?.remove();
    this.element = null;
    state.orbs.delete(this.actor.id);
  }
}

function refreshOrb(actor) {
  if (!actor) return;
  if (!canObserveActor(actor) || !userLayout(actor.id).visible) {
    state.orbs.get(actor.id)?.destroy();
    return;
  }
  let orb = state.orbs.get(actor.id);
  if (!orb) {
    orb = new UltimateOrb(actor);
    state.orbs.set(actor.id, orb);
  }
  orb.render();
}

function refreshAllOrbs() {
  for (const actor of game.actors) refreshOrb(actor);
  for (const [id, orb] of state.orbs) if (!game.actors.get(id)) orb.destroy();
}

async function toggleOrb(actor) {
  const layout = userLayout(actor.id);
  await saveLayout(actor.id, {visible: !layout.visible});
  refreshOrb(actor);
}

async function showOrb(actor, {notify = true} = {}) {
  if (!actor) {
    if (notify) ui.notifications.error("No character was found for this Ultimate orb.");
    return false;
  }
  const config = getConfig(actor);
  if (!config.enabled) {
    if (notify) ui.notifications.warn(`${actor.name}'s Ultimate system is not enabled. Enable it and save the configuration first.`);
    return false;
  }
  await saveLayout(actor.id, {visible: true});
  try {
    refreshOrb(actor);
  } catch (error) {
    console.error(`${MODULE_ID} | Could not render ${actor.name}'s Ultimate orb`, error);
    if (notify) ui.notifications.error(`Could not show ${actor.name}'s Ultimate orb: ${error.message}`);
    return false;
  }
  const rendered = Boolean(document.querySelector(`.tsru-orb-widget[data-actor-id="${actor.id}"]`));
  if (notify) {
    if (rendered) ui.notifications.info(`${actor.name}'s Ultimate orb is now visible.`);
    else ui.notifications.error(`${actor.name}'s Ultimate orb could not be created. Check the console for details.`);
  }
  return rendered;
}

async function loadSplashFont(fontFile) {
  if (!fontFile) return "Arial, sans-serif";
  const family = `TSRU-${Math.abs([...fontFile].reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0) | 0, 0))}`;
  if (![...document.fonts].some(font => font.family === family)) {
    const face = new FontFace(family, `url("${String(fontFile).replace(/["\\]/g, "\\$&")}")`);
    await face.load();
    document.fonts.add(face);
  }
  return `"${family}", Arial, sans-serif`;
}

async function showSplash({actorName, image, duration = 1, ultimateName = "Ultimate", ultimateSubtitle = "", titleX = 17, titleY = 78, titleSize = 48, titleAlign = "left", fontFile = "", subtitleFontFile = "", color = DEFAULT_CONFIG.chargeColor}) {
  if (!image) return;
  document.querySelectorAll(".tsru-splash").forEach(element => element.remove());
  const splash = document.createElement("div");
  splash.className = "tsru-splash";
  const isVideo = /\.(webm|mp4|m4v)(\?.*)?$/i.test(image);
  let fontFamily = "Arial, sans-serif";
  let subtitleFontFamily = "Arial, sans-serif";
  try { fontFamily = await loadSplashFont(fontFile); }
  catch (error) { console.warn(`${MODULE_ID} | Could not load splash font`, error); }
  try { subtitleFontFamily = await loadSplashFont(subtitleFontFile || fontFile); }
  catch (error) { console.warn(`${MODULE_ID} | Could not load subtitle font`, error); }
  const x = clamp(titleX, 0, 100);
  const y = clamp(titleY, 0, 100);
  const size = clamp(titleSize, 16, 140);
  const align = ["left", "center", "right"].includes(titleAlign) ? titleAlign : "left";
  splash.style.setProperty("--tsru-accent", color || DEFAULT_CONFIG.chargeColor);
  splash.style.setProperty("--tsru-title-x", `${x}%`);
  splash.style.setProperty("--tsru-title-y", `${y}%`);
  splash.style.setProperty("--tsru-title-size", `${size}px`);
  splash.style.setProperty("--tsru-title-font", fontFamily);
  splash.style.setProperty("--tsru-subtitle-font", subtitleFontFamily);
  splash.style.setProperty("--tsru-title-align", align);
  splash.innerHTML = `<div class="tsru-splash-backdrop"></div><div class="tsru-splash-media">${isVideo ? `<video src="${escapeHTML(image)}" autoplay muted playsinline></video>` : `<img src="${escapeHTML(image)}" alt="${escapeHTML(actorName)} Ultimate">`}<div class="tsru-title-card tsru-align-${align}"><i class="tsru-title-square tsru-title-square-one"></i><i class="tsru-title-square tsru-title-square-two"></i><div class="tsru-title-copy"><div class="tsru-title-name">${escapeHTML(ultimateName || actorName || "Ultimate")}</div><div class="tsru-title-bar">${ultimateSubtitle ? `<div class="tsru-title-subtitle">${escapeHTML(ultimateSubtitle)}</div>` : ""}</div></div></div></div>`;
  appendToCanvasLayer(splash);
  requestAnimationFrame(() => splash.classList.add("show"));
  window.setTimeout(() => {
    splash.classList.remove("show");
    window.setTimeout(() => splash.remove(), 260);
  }, Math.max(100, Number(duration) * 1000));
}

function hasTemporaryUltimateTurn(actorId) {
  return game.combats.some(combat => combat.combatants.some(entry => entry.actorId === actorId && entry.getFlag(MODULE_ID, "temporaryUltimate")));
}

function hasQueuedUltimateRequest(actorId) {
  return [...state.ultimateQueues.values()].some(queue => queue.requests?.some(request => request.actorId === actorId));
}

async function reconcileUltimateLock(actorId) {
  if (!actorId || !state.ultimateLocks.has(actorId)) return false;
  if (hasTemporaryUltimateTurn(actorId) || hasQueuedUltimateRequest(actorId)) return false;
  const pending = state.pendingUltimates.get(actorId);
  if (pending?.timer) window.clearTimeout(pending.timer);
  state.pendingUltimates.delete(actorId);
  for (const [combatId, queue] of state.ultimateQueues) {
    if (queue.activeActorId !== actorId) continue;
    queue.activeActorId = null;
    window.setTimeout(() => processUltimateQueue(combatId), 0);
  }
  state.ultimateLocks.delete(actorId);
  if (isAuthority()) game.socket.emit(SOCKET, {type: "ultimateState", actorId, locked: false});
  refreshOrb(game.actors.get(actorId));
  console.warn(`${MODULE_ID} | Cleared a stale Ultimate lock for`, game.actors.get(actorId)?.name ?? actorId);
  return true;
}

async function requestUltimate(actor) {
  const config = getConfig(actor);
  if (!game.user.isGM && !actor?.isOwner) return ui.notifications.error("You do not own this character.");
  if (!config.enabled || config.current < config.max) return ui.notifications.warn("This Ultimate is not ready.");
  await reconcileUltimateLock(actor.id);
  if (state.ultimateLocks.has(actor.id)) return ui.notifications.warn("This Ultimate is already queued or resolving.");
  if (game.user.isGM && isAuthority()) return executeUltimate(actor.id, game.user.id);
  const gm = activeGM();
  if (!gm) return ui.notifications.error("A GM must be connected to activate an Ultimate.");
  const requestId = foundry.utils.randomID();
  ui.notifications.info(`${actor.name}'s Ultimate request was sent to the GM.`);
  game.socket.emit(SOCKET, {type: "activateUltimate", requestId, actorId: actor.id, requestingUserId: game.user.id});
}

async function insertUltimateTurn(actor, resume = {}) {
  const combat = game.combat;
  if (!combat?.started) return null;
  const current = combat.combatant;
  const currentInit = Number(current?.initiative ?? 0);
  const turn = Number(combat.turn ?? 0);
  const next = combat.turns[turn + 1];
  let initiative = next ? (currentInit + Number(next.initiative ?? currentInit - 1)) / 2 : currentInit - 0.001;
  if (!Number.isFinite(initiative)) initiative = currentInit - 0.001;
  const token = actor.getActiveTokens(true, true)?.[0];
  const [temporary] = await combat.createEmbeddedDocuments("Combatant", [{
    name: `ULTIMATE — ${actor.name}`,
    actorId: actor.id,
    tokenId: token?.id ?? null,
    sceneId: token?.parent?.id ?? canvas.scene?.id ?? null,
    initiative,
    img: getConfig(actor).ultimateButtonImage || getConfig(actor).orbImage || actor.img,
    flags: {[MODULE_ID]: {temporaryUltimate: true, resumeCombatantId: resume.combatantId ?? current?.id ?? null, resumeRound: resume.round ?? combat.round}}
  }]);
  if (!temporary) return null;
  const index = combat.turns.findIndex(entry => entry.id === temporary.id);
  if (index >= 0) {
    state.suppressCombatHook = true;
    await combat.update({turn: index});
    state.suppressCombatHook = false;
  }
  return temporary;
}

async function removeUltimateTurn(temporary, {resume = true} = {}) {
  if (!temporary) return;
  const combat = temporary.parent;
  const resumeId = temporary.getFlag(MODULE_ID, "resumeCombatantId");
  const resumeRound = temporary.getFlag(MODULE_ID, "resumeRound");
  state.suppressCombatHook = true;
  try {
    if (combat?.combatants.has(temporary.id)) await combat.deleteEmbeddedDocuments("Combatant", [temporary.id]);
    if (resume) {
      const resumeIndex = combat.turns.findIndex(entry => entry.id === resumeId);
      if (resumeIndex >= 0) await combat.update({turn: resumeIndex, round: resumeRound ?? combat.round});
    }
  } finally { state.suppressCombatHook = false; }
}

async function postAbilityText(actor, kind, text, {combatantId = ""} = {}) {
  const description = String(text ?? "").trim();
  const content = description
    ? await TextEditor.enrichHTML(description, {async: true, secrets: game.user.isGM, relativeTo: actor})
    : "<em>No ability text has been configured.</em>";
  const labels = {skill: "Skill", ultimate: "Ultimate", elation: "Elation Action"};
  const icons = {skill: "fa-hand-sparkles", ultimate: "fa-burst", elation: "fa-masks-theater"};
  const completion = kind === "elation" && combatantId
    ? `<footer><button type="button" data-tsru-complete-elation="${escapeHTML(combatantId)}"><i class="fas fa-check"></i> Complete Elation Action</button></footer>`
    : kind === "ultimate" && combatantId
      ? `<footer><button type="button" data-tsru-complete-ultimate="${escapeHTML(actor.id)}"><i class="fas fa-check"></i> Ultimate Complete</button></footer>`
      : "";
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({actor, token: actor.getActiveTokens(true, true)?.[0]?.document}),
    content: `<article class="tsru-ability-chat tsru-ability-chat-${kind}"><header><i class="fas ${icons[kind]}"></i><div><strong>${escapeHTML(actor.name)}</strong><span>${labels[kind]}</span></div></header><div class="tsru-ability-chat-body">${content}</div>${completion}</article>`
  });
}

async function runUltimateScript(actor, combatantId = "") {
  return postAbilityText(actor, "ultimate", getConfig(actor).ultimateText, {combatantId});
}

async function runSkillScript(actor) {
  return postAbilityText(actor, "skill", getConfig(actor).skillText);
}

async function runElationActionScript(actor, combatantId = "") {
  return postAbilityText(actor, "elation", getConfig(actor).elationActionText, {combatantId});
}

async function completeElationAction(combatantId, userId) {
  if (!isAuthority()) return;
  const pending = state.pendingElationActions.get(combatantId);
  const combat = (pending?.combatId ? game.combats.get(pending.combatId) : null)
    ?? game.combats.find(entry => entry.combatants.has(combatantId))
    ?? game.combat;
  const combatant = combat?.combatants.get(combatantId);
  const completingUser = userId ? game.users.get(userId) : null;
  if (userId && !completingUser?.isGM && !combatant?.actor?.testUserPermission(completingUser, "OWNER")) return;
  if (pending?.timer) window.clearTimeout(pending.timer);
  state.pendingElationActions.delete(combatantId);
  state.activeElationActions.delete(combatantId);
  if (!combatant || !isElationActionCombatant(combatant)) return;
  const resumeRound = combatant.getFlag(MODULE_ID, "resumeRound") ?? combat.round;
  const remainingIds = combat.turns
    .filter(entry => entry.id !== combatantId && isElationActionCombatant(entry) && !entry.getFlag(MODULE_ID, "completed"))
    .sort((left, right) => Number(left.getFlag(MODULE_ID, "sequenceOrder")) - Number(right.getFlag(MODULE_ID, "sequenceOrder")))
    .map(entry => entry.id);
  state.suppressCombatHook = true;
  try { await combat.deleteEmbeddedDocuments("Combatant", [combatantId]); }
  finally { state.suppressCombatHook = false; }
  const remaining = remainingIds.map(id => combat.combatants.get(id)).filter(Boolean);
  if (remaining.length) {
    const next = remaining[0];
    const index = combat.turns.findIndex(entry => entry.id === next.id);
    if (index >= 0) await combat.update({turn: index});
    await executeElationAction(next);
    return;
  }
  if (await finishSpecialAha(combat)) return;
  await clearElationActionTurns(combat, {resetPunchline: true, resume: true, resumeRound});
}

async function executeElationAction(combatant) {
  if (!isAuthority() || !combatant || state.activeElationActions.has(combatant.id) || combatant.getFlag(MODULE_ID, "completed")) return;
  if (state.pendingElationActions.size && !state.pendingElationActions.has(combatant.id)) return;
  const actor = combatant.actor;
  if (!actor) return completeElationAction(combatant.id);
  state.activeElationActions.add(combatant.id);
  await dispatchTalentEvent("elationAction", {sourceActor: actor, combatant, combat: combatant.parent}, combatant.id);
  const owner = game.users.find(user => user.active && !user.isGM && actor.testUserPermission(user, "OWNER")) ?? activeGM();
  const pending = {combatId: combatant.parent.id, userId: owner?.id, timer: window.setTimeout(() => completeElationAction(combatant.id, owner?.id), 600000)};
  state.pendingElationActions.set(combatant.id, pending);
  if (!owner || owner.id === game.user.id) {
    try { await runElationActionScript(actor, combatant.id); }
    catch (error) { console.error(`${MODULE_ID} | Elation Action failed`, error); ui.notifications.error(`${actor.name}'s Elation Action failed: ${error.message}`); }
  } else game.socket.emit(SOCKET, {type: "useElationAction", combatantId: combatant.id, actorId: actor.id, targetUserId: owner.id});
}

async function requestSkill(actor) {
  const config = getConfig(actor);
  if (!game.user.isGM && !actor?.isOwner) return ui.notifications.error("You do not own this character.");
  if (!config.skillEnabled) return ui.notifications.warn("This character's Skill button is disabled.");
  if (currentSkillPoints() <= 0) return ui.notifications.warn("The party has no Skill Points remaining.");
  if (state.skillLocks.has(actor.id)) return ui.notifications.warn("This Skill is already resolving.");
  if (game.user.isGM && isAuthority()) return executeSkill(actor.id, game.user.id);
  const gm = activeGM();
  if (!gm) return ui.notifications.error("A GM must be connected to spend a shared Skill Point.");
  const requestId = foundry.utils.randomID();
  ui.notifications.info(`${actor.name}'s Skill request was sent to the GM.`);
  game.socket.emit(SOCKET, {type: "activateSkill", requestId, actorId: actor.id, requestingUserId: game.user.id});
}

async function completeSkill(actorId) {
  if (!isAuthority()) return;
  const pending = state.pendingSkills.get(actorId);
  if (pending?.timer) window.clearTimeout(pending.timer);
  state.pendingSkills.delete(actorId);
  state.skillLocks.delete(actorId);
  game.socket.emit(SOCKET, {type: "skillState", actorId, locked: false});
  refreshSkillUI();
}

async function executeSkill(actorId, requestingUserId) {
  if (!isAuthority() || state.skillLocks.has(actorId) || state.skillSpendLock) return;
  const actor = game.actors.get(actorId);
  const requester = game.users.get(requestingUserId);
  if (!actor || actor.type !== "character" || (!requester?.isGM && !actor.testUserPermission(requester, "OWNER"))) return;
  const config = getConfig(actor);
  if (!config.skillEnabled) return ui.notifications.warn(`${actor.name}'s Skill button is disabled.`);
  if (currentSkillPoints() <= 0) return ui.notifications.warn("The party has no Skill Points remaining.");

  state.skillSpendLock = true;
  state.skillLocks.add(actorId);
  game.socket.emit(SOCKET, {type: "skillState", actorId, locked: true});
  try {
    await setSkillPoints(currentSkillPoints() - 1);
    await dispatchTalentEvent("skillUsed", {sourceActor: actor, requestingUserId}, `${actor.id}:${Date.now()}`);
    const pending = {actorId, requestingUserId, timer: window.setTimeout(() => completeSkill(actorId), 120000)};
    state.pendingSkills.set(actorId, pending);
    if (requestingUserId === game.user.id) {
      await runSkillScript(actor);
      await completeSkill(actorId);
    } else game.socket.emit(SOCKET, {type: "useSkill", actorId, targetUserId: requestingUserId});
  } catch (error) {
    console.error(`${MODULE_ID} | Skill failed`, error);
    ui.notifications.error(`Skill failed: ${error.message}`);
    await completeSkill(actorId);
  } finally { state.skillSpendLock = false; }
}

async function completeUltimate(actorId) {
  if (!isAuthority()) return;
  const pending = state.pendingUltimates.get(actorId);
  if (pending?.timer) window.clearTimeout(pending.timer);
  const combat = (pending?.combatId ? game.combats.get(pending.combatId) : null)
    ?? game.combats.find(entry => entry.combatants.some(combatant => combatant.actorId === actorId && combatant.getFlag(MODULE_ID, "temporaryUltimate")))
    ?? game.combat;
  const temporaryIds = combat?.combatants
    .filter(combatant => combatant.actorId === actorId && combatant.getFlag(MODULE_ID, "temporaryUltimate"))
    .map(combatant => combatant.id) ?? [];
  const queueCombatId = pending?.combatId ?? combat?.id ?? [...state.ultimateQueues].find(([_id, entry]) => entry.activeActorId === actorId)?.[0];
  const queue = queueCombatId ? state.ultimateQueues.get(queueCombatId) : null;
  try {
    if (temporaryIds.length) {
      state.suppressCombatHook = true;
      try { await combat.deleteEmbeddedDocuments("Combatant", temporaryIds); }
      finally { state.suppressCombatHook = false; }
    }
  } catch (error) {
    console.error(`${MODULE_ID} | Could not remove completed Ultimate turn`, error);
    ui.notifications.error(`The Ultimate finished, but its temporary initiative turn could not be removed: ${error.message}`);
  } finally {
    state.pendingUltimates.delete(actorId);
    state.ultimateLocks.delete(actorId);
    game.socket.emit(SOCKET, {type: "ultimateState", actorId, locked: false});
    refreshOrb(game.actors.get(actorId));
    if (queue) queue.activeActorId = null;
  }
  if (queue) {
    try { await processUltimateQueue(queueCombatId); }
    catch (error) {
      console.error(`${MODULE_ID} | Could not continue the Ultimate queue`, error);
      ui.notifications.error(`Could not continue the Ultimate queue: ${error.message}`);
    }
  }
}

function ultimateInitiative(actor, combat) {
  const combatant = combat?.combatants.find(entry => entry.actorId === actor.id && !entry.getFlag(MODULE_ID, "temporaryUltimate"));
  return Number.isFinite(Number(combatant?.initiative)) ? Number(combatant.initiative) : -Infinity;
}

async function finishUltimateQueue(combatId) {
  const queue = state.ultimateQueues.get(combatId);
  const combat = game.combats.get(combatId);
  state.ultimateQueues.delete(combatId);
  if (!queue || !combat) return;
  const resumeIndex = combat.turns.findIndex(entry => entry.id === queue.resumeCombatantId);
  if (resumeIndex < 0) return;
  state.suppressCombatHook = true;
  try { await combat.update({round: queue.resumeRound ?? combat.round, turn: resumeIndex}); }
  finally { state.suppressCombatHook = false; }
}

function retryUltimateSplashBroadcast(playbackId) {
  const pending = state.splashBroadcasts.get(playbackId);
  if (!pending) return;
  if (!pending.remaining.size) {
    window.clearTimeout(pending.timer);
    state.splashBroadcasts.delete(playbackId);
    return;
  }
  if (pending.attempts >= 3) {
    const missed = [...pending.remaining].map(id => game.users.get(id)?.name ?? id);
    console.warn(`${MODULE_ID} | Ultimate splash was not acknowledged by`, missed);
    ui.notifications.warn(`Ultimate splash could not be confirmed for: ${missed.join(", ")}.`);
    state.splashBroadcasts.delete(playbackId);
    return;
  }
  pending.attempts++;
  for (const targetUserId of pending.remaining) game.socket.emit(SOCKET, {...pending.payload, targetUserId});
  pending.timer = window.setTimeout(() => retryUltimateSplashBroadcast(playbackId), 900);
}

function broadcastUltimateSplash(actor) {
  const config = getConfig(actor);
  const element = getElements().find(entry => entry.id === config.elementId);
  const splash = {actorName: actor.name, image: config.splashImage, duration: config.splashDuration, ultimateName: config.ultimateName, ultimateSubtitle: config.ultimateSubtitle, titleX: config.titleX, titleY: config.titleY, titleSize: config.titleSize, titleAlign: config.titleAlign, fontFile: config.fontFile, subtitleFontFile: config.subtitleFontFile, color: element?.chargeColor || DEFAULT_CONFIG.chargeColor};
  showSplash(splash);
  const recipients = new Set(game.users.filter(user => user.active && user.id !== game.user.id).map(user => user.id));
  if (!recipients.size) return;
  const playbackId = foundry.utils.randomID();
  const payload = {type: "showSplash", playbackId, sourceUserId: game.user.id, ...splash};
  state.splashBroadcasts.set(playbackId, {payload, remaining: recipients, attempts: 0, timer: null});
  retryUltimateSplashBroadcast(playbackId);
}

async function beginQueuedUltimate(request, queue, combat) {
  const actor = game.actors.get(request.actorId);
  if (!actor) return completeUltimate(request.actorId);
  broadcastUltimateSplash(actor);
  queue.activeActorId = actor.id;
  const temporary = await insertUltimateTurn(actor, {combatantId: queue.resumeCombatantId, round: queue.resumeRound});
  if (!temporary) throw new Error("Foundry could not create the temporary Ultimate combatant.");
  const pending = {actorId: actor.id, requestingUserId: request.requestingUserId, combatId: combat.id, combatantId: temporary?.id ?? null, timer: window.setTimeout(() => completeUltimate(actor.id), 600000)};
  state.pendingUltimates.set(actor.id, pending);
  if (request.requestingUserId === game.user.id) await runUltimateScript(actor, temporary?.id ?? "");
  else game.socket.emit(SOCKET, {type: "useUltimate", actorId: actor.id, combatantId: temporary?.id ?? "", targetUserId: request.requestingUserId});
}

async function processUltimateQueue(combatId) {
  const queue = state.ultimateQueues.get(combatId);
  const combat = game.combats.get(combatId);
  if (!queue || !combat || queue.activeActorId) return;
  if (queue.startTimer) { window.clearTimeout(queue.startTimer); queue.startTimer = null; }
  if (!queue.requests.length) return finishUltimateQueue(combatId);
  const firstTime = Math.min(...queue.requests.map(entry => entry.requestedAt));
  const simultaneous = queue.requests.filter(entry => entry.requestedAt <= firstTime + 200);
  simultaneous.sort((left, right) => right.initiative - left.initiative || left.sequence - right.sequence);
  const request = simultaneous[0];
  queue.requests.splice(queue.requests.indexOf(request), 1);
  try { await beginQueuedUltimate(request, queue, combat); }
  catch (error) {
    console.error(`${MODULE_ID} | Could not begin queued Ultimate`, error);
    ui.notifications.error(`Could not begin ${game.actors.get(request.actorId)?.name ?? "the character"}'s Ultimate turn: ${error.message}`);
    state.pendingUltimates.delete(request.actorId);
    state.ultimateLocks.delete(request.actorId);
    game.socket.emit(SOCKET, {type: "ultimateState", actorId: request.actorId, locked: false});
    queue.activeActorId = null;
    await processUltimateQueue(combatId);
  }
}

async function executeUltimate(actorId, requestingUserId) {
  if (!isAuthority() || state.ultimateLocks.has(actorId)) return;
  const actor = game.actors.get(actorId);
  const requester = game.users.get(requestingUserId);
  if (!actor || (!requester?.isGM && !actor.testUserPermission(requester, "OWNER"))) return;
  const config = getConfig(actor);
  if (!config.enabled || config.current < config.max) return;
  state.ultimateLocks.add(actorId);
  game.socket.emit(SOCKET, {type: "ultimateState", actorId, locked: true});
  refreshOrb(actor);
  try {
    await dispatchTalentEvent("ultimateUsed", {sourceActor: actor, requestingUserId}, `${actor.id}:${Date.now()}`);
    await setEnergy(actor, 0);
    const combat = game.combat;
    await lockEnergyUntilNextRound(actor, combat);
    if (!combat?.started) {
      broadcastUltimateSplash(actor);
      await runUltimateScript(actor);
      state.ultimateLocks.delete(actorId);
      game.socket.emit(SOCKET, {type: "ultimateState", actorId, locked: false});
      return refreshOrb(actor);
    }
    let queue = state.ultimateQueues.get(combat.id);
    if (!queue) {
      const current = combat.combatant;
      const isOtherMainPartyActor = current?.actorId !== actor.id && current?.actor?.type === "character" && getConfig(current.actor).mainParty;
      const waitsForAlly = Boolean(isOtherMainPartyActor && !current.getFlag(MODULE_ID, "temporaryUltimate"));
      queue = {resumeCombatantId: waitsForAlly ? null : current?.id ?? null, resumeRound: combat.round, waitTurnId: waitsForAlly ? current.id : null, activeActorId: null, requests: [], sequence: 0, startTimer: null};
      state.ultimateQueues.set(combat.id, queue);
    }
    queue.requests.push({actorId, requestingUserId, initiative: ultimateInitiative(actor, combat), requestedAt: Date.now(), sequence: queue.sequence++});
    ui.notifications.info(`${actor.name}'s Ultimate was added to the interrupt queue.`);
    if (!queue.waitTurnId && !queue.activeActorId && !queue.startTimer) queue.startTimer = window.setTimeout(() => processUltimateQueue(combat.id), 225);
  } catch (error) {
    console.error(`${MODULE_ID} | Ultimate failed`, error);
    ui.notifications.error(`Ultimate failed: ${error.message}`);
    await completeUltimate(actorId);
  }
}

async function onSocket(payload) {
  if (!payload?.type) return;
  if (payload.type === "ahaConfigChanged") {
    state.punchlineMeter?.destroy();
    refreshAhaButton();
    refreshPunchlineHUD();
    return;
  }
  if (payload.type === "punchlineChanged") { refreshPunchlineHUD(); return; }
  if (payload.type === "changePunchline" && isAuthority()) {
    const requester = game.users.get(payload.sourceUserId);
    const actor = await actorFromUuid(payload.actorUuid);
    if (!getAhaConfig().elationEnabled || !actor || (!requester?.isGM && !actor.testUserPermission(requester, "OWNER"))) return;
    if (payload.operation === "add") await addPunchline(payload.amount);
    else if (payload.operation === "spend") await spendPunchline(payload.amount);
    else if (payload.operation === "set") await setPunchline(payload.amount);
    return;
  }
  if (payload.type === "changeSkillPoints" && isAuthority()) {
    const requester = game.users.get(payload.sourceUserId);
    const actor = await actorFromUuid(payload.actorUuid);
    if (!actor || (!requester?.isGM && !actor.testUserPermission(requester, "OWNER"))) return;
    if (payload.operation === "set") await setSkillPoints(payload.amount);
    else if (payload.operation === "add") await setSkillPoints(currentSkillPoints() + (Number(payload.amount) || 0));
    else if (payload.operation === "spend") {
      const cost = Math.max(0, Math.floor(Number(payload.amount) || 0));
      if (currentSkillPoints() >= cost) await setSkillPoints(currentSkillPoints() - cost);
    }
    return;
  }
  if (payload.type === "triggerSpecialAha" && isAuthority()) {
    const requester = game.users.get(payload.sourceUserId);
    const actor = await actorFromUuid(payload.actorUuid);
    if (!actor || (!requester?.isGM && !actor.testUserPermission(requester, "OWNER"))) return;
    await triggerSpecialAha(actor, payload.fixedPunchline);
    return;
  }
  if (payload.type === "useElationAction" && payload.targetUserId === game.user.id) {
    const actor = game.actors.get(payload.actorId);
    try {
      if (!actor?.isOwner) throw new Error("You no longer own this character.");
      await runElationActionScript(actor, payload.combatantId);
    } catch (error) {
      console.error(`${MODULE_ID} | Player Elation Action failed`, error);
      ui.notifications.error(`Elation Action failed: ${error.message}`);
      game.socket.emit(SOCKET, {type: "elationActionComplete", combatantId: payload.combatantId, userId: game.user.id, failed: true});
    }
    return;
  }
  if (payload.type === "elationActionComplete" && isAuthority()) return completeElationAction(payload.combatantId, payload.userId);
  if (payload.type === "skillPointsChanged") { refreshSkillUI(); return; }
  if (payload.type === "activateSkill" && isAuthority()) {
    const before = currentSkillPoints();
    await executeSkill(payload.actorId, payload.requestingUserId);
    const accepted = currentSkillPoints() < before;
    game.socket.emit(SOCKET, {type: "playerActionResult", targetUserId: payload.requestingUserId, requestId: payload.requestId, accepted, action: "Skill", message: accepted ? "Skill activated successfully." : "The GM could not activate that Skill. Check ownership, the Skill toggle, and available Skill Points."});
    return;
  }
  if (payload.type === "useSkill" && payload.targetUserId === game.user.id) {
    const actor = game.actors.get(payload.actorId);
    try {
      if (!actor?.isOwner) throw new Error("You no longer own this character.");
      await runSkillScript(actor);
      game.socket.emit(SOCKET, {type: "skillComplete", actorId: payload.actorId, userId: game.user.id});
    } catch (error) {
      console.error(`${MODULE_ID} | Player Skill failed`, error);
      ui.notifications.error(`Skill failed: ${error.message}`);
      game.socket.emit(SOCKET, {type: "skillComplete", actorId: payload.actorId, userId: game.user.id, failed: true});
    }
    return;
  }
  if (payload.type === "skillComplete" && isAuthority()) {
    const pending = state.pendingSkills.get(payload.actorId);
    if (pending?.requestingUserId === payload.userId) await completeSkill(payload.actorId);
    return;
  }
  if (payload.type === "skillState") {
    payload.locked ? state.skillLocks.add(payload.actorId) : state.skillLocks.delete(payload.actorId);
    refreshSkillUI();
    return;
  }
  if (payload.type === "applyManualChatDamage" && isAuthority()) {
    const requestingUser = game.users.get(payload.sourceUserId);
    const message = game.messages.get(payload.messageId);
    const target = await actorFromUuid(payload.targetUuid);
    const result = await applyChatRollAsDamage(message, target, requestingUser, payload.applicationId);
    game.socket.emit(SOCKET, {type: "manualChatDamageResult", targetUserId: payload.sourceUserId, messageId: payload.messageId, ...result});
    return;
  }
  if (payload.type === "manualChatDamageResult" && payload.targetUserId === game.user.id) {
    const notify = payload.ok ? ui.notifications.info : ui.notifications.error;
    notify.call(ui.notifications, payload.message);
    const message = game.messages.get(payload.messageId);
    document.querySelectorAll(`[data-tsru-chat-damage-control="${CSS.escape(payload.messageId ?? "")}"]`).forEach(control => renderManualDamageControl(control, message, payload.applications, payload.done));
    return;
  }
  if (payload.type === "finishManualChatDamage" && isAuthority()) {
    const requestingUser = game.users.get(payload.sourceUserId);
    const message = game.messages.get(payload.messageId);
    const result = await finishManualChatDamage(message, requestingUser);
    game.socket.emit(SOCKET, {type: "manualChatDamageResult", targetUserId: payload.sourceUserId, messageId: payload.messageId, ...result});
    return;
  }
  if (payload.type === "applyToughness" && isAuthority()) {
    const requestingUser = game.users.get(payload.sourceUserId);
    const attacker = await actorFromUuid(payload.attackerUuid);
    if (!attacker || (!requestingUser?.isGM && !attacker.testUserPermission(requestingUser, "OWNER"))) return;
    const targets = (await Promise.all((payload.targetUuids ?? []).map(actorFromUuid))).filter(Boolean);
    await applyToughnessDamage(attacker, targets, Number(payload.amount) || 0, payload.eventKey);
    return;
  }
  if (payload.type === "showAhaVideo") {
    if (payload.sourceUserId !== game.user.id) playAhaVideo(payload);
    return;
  }
  if (payload.type === "activateUltimate" && isAuthority()) {
    const actor = game.actors.get(payload.actorId);
    const before = Number(getConfig(actor).current);
    await executeUltimate(payload.actorId, payload.requestingUserId);
    const accepted = Boolean(actor && Number(getConfig(actor).current) < before);
    const queue = game.combat?.id ? state.ultimateQueues.get(game.combat.id) : null;
    const waiting = Boolean(accepted && queue?.waitTurnId);
    game.socket.emit(SOCKET, {type: "playerActionResult", targetUserId: payload.requestingUserId, requestId: payload.requestId, accepted, action: "Ultimate", message: accepted ? (waiting ? "Ultimate queued. It will begin when the current Main Party turn ends." : "Ultimate activated successfully.") : "The GM could not activate that Ultimate. Check ownership, Energy, and the character's Ultimate toggle."});
    return;
  }
  if (payload.type === "playerActionResult" && payload.targetUserId === game.user.id) {
    const notify = payload.accepted ? ui.notifications.info : ui.notifications.error;
    notify.call(ui.notifications, payload.message || `${payload.action ?? "Action"} request ${payload.accepted ? "accepted" : "rejected"}.`);
    return;
  }
  if (payload.type === "showSplash") {
    if (payload.sourceUserId === game.user.id) return;
    if (payload.targetUserId && payload.targetUserId !== game.user.id) return;
    const playbackId = payload.playbackId;
    const alreadyReceived = playbackId && state.receivedSplashIds.has(playbackId);
    if (playbackId) {
      state.receivedSplashIds.add(playbackId);
      window.setTimeout(() => state.receivedSplashIds.delete(playbackId), 60000);
    }
    if (!alreadyReceived) await showSplash(payload);
    if (playbackId) game.socket.emit(SOCKET, {type: "ultimateSplashAck", playbackId, sourceUserId: game.user.id, targetUserId: payload.sourceUserId});
    return;
  }
  if (payload.type === "ultimateSplashAck" && payload.targetUserId === game.user.id) {
    const pending = state.splashBroadcasts.get(payload.playbackId);
    pending?.remaining.delete(payload.sourceUserId);
    if (pending && !pending.remaining.size) {
      window.clearTimeout(pending.timer);
      state.splashBroadcasts.delete(payload.playbackId);
    }
    return;
  }
  if (payload.type === "useUltimate" && payload.targetUserId === game.user.id) {
    const actor = game.actors.get(payload.actorId);
    try {
      if (!actor?.isOwner) throw new Error("You no longer own this character.");
      await runUltimateScript(actor, payload.combatantId ?? "");
    } catch (error) {
      console.error(`${MODULE_ID} | Player Ultimate failed`, error);
      ui.notifications.error(`Ultimate failed: ${error.message}`);
      game.socket.emit(SOCKET, {type: "ultimateComplete", actorId: payload.actorId, userId: game.user.id, failed: true});
    }
    return;
  }
  if (payload.type === "ultimateComplete" && isAuthority()) {
    const pending = state.pendingUltimates.get(payload.actorId);
    const completingUser = game.users.get(payload.userId);
    const actor = game.actors.get(payload.actorId);
    if ((pending || game.combats.some(combat => combat.combatants.some(entry => entry.actorId === payload.actorId && entry.getFlag(MODULE_ID, "temporaryUltimate"))))
      && (completingUser?.isGM || actor?.testUserPermission(completingUser, "OWNER"))) await completeUltimate(payload.actorId);
    return;
  }
  if (payload.type === "ultimateState") {
    payload.locked ? state.ultimateLocks.add(payload.actorId) : state.ultimateLocks.delete(payload.actorId);
    refreshOrb(game.actors.get(payload.actorId));
  }
}

function isAttackMessage(message) {
  const flags = message.flags ?? {};
  const dnd = flags.dnd5e ?? {};
  const type = String(dnd.roll?.type ?? dnd.type ?? message.rolls?.[0]?.options?.type ?? "").toLowerCase();
  return type.includes("attack") || Boolean(dnd.item?.activityId || dnd.activity?.id) && message.rolls?.some(roll => String(roll.options?.type ?? "").includes("attack"));
}

function targetActorIdsFromMessage(message) {
  const flags = message.flags ?? {};
  const candidates = [
    flags.dnd5e?.targets,
    flags.dnd5e?.use?.targets,
    flags.dnd5e?.activity?.targets,
    flags[MODULE_ID]?.targets
  ].filter(Boolean).flatMap(value => Array.isArray(value) ? value : Object.values(value));
  const ids = new Set();
  for (const target of candidates) {
    const raw = target?.actorUuid ?? target?.actorId ?? target?.uuid ?? target?.tokenUuid ?? target?.id ?? target;
    const text = String(raw ?? "");
    const actorMatch = text.match(/Actor\.([^.]+)/);
    const tokenMatch = text.match(/Token\.([^.]+)/);
    if (actorMatch) ids.add(actorMatch[1]);
    else if (target?.actorId) ids.add(target.actorId);
    else if (tokenMatch) {
      const actor = canvas?.tokens?.get(tokenMatch[1])?.actor;
      if (actor) ids.add(actor.id);
    }
  }
  if (!ids.size) {
    const messageUser = game.users.get(message.user?.id ?? message.user);
    for (const target of messageUser?.targets ?? []) if (target.actor) ids.add(target.actor.id);
  }
  return ids;
}

function rawDiceTotal(rolls) {
  const seen = new Set();
  const dice = [];
  const visit = term => {
    if (!term || typeof term !== "object" || seen.has(term)) return;
    seen.add(term);
    if (Array.isArray(term.results) && (term.faces || term.number)) dice.push(term);
    for (const key of ["dice", "terms", "rolls", "operands", "roll", "damageRoll"]) {
      const children = term[key];
      if (Array.isArray(children)) children.forEach(visit);
      else visit(children);
    }
  };
  for (const roll of rolls ?? []) visit(roll);
  return dice.flatMap(die => die.results ?? []).filter(result => result?.active !== false && result?.discarded !== true)
    .reduce((total, result) => total + (Number(result?.result) || 0), 0);
}

function fullDamageTotal(rolls) {
  return (rolls ?? []).reduce((total, roll) => total + Math.max(0, Number(roll?.total) || 0), 0);
}

function actorFromChatMessage(message) {
  return game.actors.get(message?.speaker?.actor) ?? canvas?.tokens?.get(message?.speaker?.token)?.actor ?? null;
}

function manualChatDamageAmount(message) {
  return Math.max(0, Math.floor(fullDamageTotal(Array.isArray(message?.rolls) ? message.rolls : [])));
}

function manualDamageApplications(message) {
  const applications = message?.getFlag(MODULE_ID, "manualDamageApplications");
  if (Array.isArray(applications)) return applications;
  const legacy = message?.getFlag(MODULE_ID, "manualDamageApplied");
  return legacy ? [legacy] : [];
}

function isManualChatDamageEligible(message) {
  const actor = actorFromChatMessage(message);
  const combat = game.combat;
  if (!combat?.started || actor?.type !== "character" || manualChatDamageAmount(message) <= 0) return false;
  if (!combat.combatants.some(combatant => combatant.actorId === actor.id)) return false;
  return !/weakness break/i.test(String(message.flavor ?? ""));
}

async function applyDirectChatDamage(target, amount) {
  const hp = target?.system?.attributes?.hp;
  if (!hp || !Number.isFinite(Number(hp.value))) return 0;
  const damage = Math.max(0, Math.floor(Number(amount) || 0));
  const temporary = Math.max(0, Number(hp.temp) || 0);
  const absorbed = Math.min(temporary, damage);
  const remaining = damage - absorbed;
  const updates = {"system.attributes.hp.value": Math.max(0, Number(hp.value) - remaining)};
  if (hp.temp !== undefined && hp.temp !== null) updates["system.attributes.hp.temp"] = Math.max(0, temporary - absorbed);
  await target.update(updates);
  return damage;
}

async function applyChatRollAsDamage(message, target, requestingUser, applicationId = "") {
  if (!isAuthority()) return {ok: false, message: "Only the active GM can apply chat damage."};
  if (!message || !target) return {ok: false, message: "The roll or target no longer exists."};
  if (message.getFlag(MODULE_ID, "manualDamageDone")) return {ok: false, done: true, applications: manualDamageApplications(message), message: "Damage application has already been marked done."};
  const attacker = actorFromChatMessage(message);
  if (!attacker || (!requestingUser?.isGM && !attacker.testUserPermission(requestingUser, "OWNER"))) return {ok: false, message: "You do not control the character that made this roll."};
  if (!isManualChatDamageEligible(message)) return {ok: false, message: "This roll is not eligible for combat damage."};
  const combat = game.combat;
  if (!combat?.combatants.some(combatant => combatant.actorId === target.id || combatant.actor?.id === target.id || combatant.actor?.uuid === target.uuid)) return {ok: false, message: "The targeted creature is not in the current combat."};
  const total = manualChatDamageAmount(message);
  const config = getConfig(attacker);
  const hpDamage = config.breakCharacter ? Math.min(1, total) : total;
  const rolledDiceDamage = rawDiceTotal(message.rolls);
  const toughnessDamage = config.breakCharacter ? total : (rolledDiceDamage > 0 ? rolledDiceDamage : total);
  const resolvedApplicationId = applicationId || foundry.utils.randomID();
  const eventKey = `manual-chat-damage:${message.id}:${resolvedApplicationId}:${target.uuid}`;
  await applyDirectChatDamage(target, hpDamage);
  if (toughnessDamage > 0) await applyToughnessDamage(attacker, [target], toughnessDamage, eventKey);
  const detail = {sourceActor: attacker, targetActor: target, amount: hpDamage, origin: message, manual: true};
  await dispatchTalentEvent("damageDealt", detail, eventKey);
  await dispatchTalentEvent("damageTaken", detail, eventKey);
  await awardPunchlineForAttack(attacker, eventKey);
  if (target.type === "character") {
    const targetConfig = getConfig(target);
    if (targetConfig.attackedMode === "targeted" || targetConfig.attackedMode === "hit") await addEnergy(target, energyGain(targetConfig, "attacked"), "hit");
  }
  const application = {id: resolvedApplicationId, actorUuid: attacker.uuid, targetUuid: target.uuid, targetName: target.name, amount: hpDamage, total, toughnessDamage, userId: requestingUser?.id, appliedAt: Date.now()};
  const applications = [...manualDamageApplications(message), application];
  await message.setFlag(MODULE_ID, "manualDamageApplications", applications);
  return {ok: true, applications, done: false, message: `${total} roll damage applied to ${target.name} (${hpDamage} HP, ${toughnessDamage} Toughness attempted).`};
}

async function finishManualChatDamage(message, requestingUser) {
  if (!isAuthority()) return {ok: false, message: "Only the active GM can finish chat damage."};
  const attacker = actorFromChatMessage(message);
  if (!message || !attacker || (!requestingUser?.isGM && !attacker.testUserPermission(requestingUser, "OWNER"))) return {ok: false, message: "You do not control the character that made this roll."};
  await message.setFlag(MODULE_ID, "manualDamageDone", true);
  return {ok: true, done: true, applications: manualDamageApplications(message), message: "Finished applying damage from this roll."};
}

async function limitBreakAttackHpDamage(attacker, target, amount, eventId, options = {}) {
  if (!getConfig(attacker).breakCharacter || target?.type !== "npc" || Number(amount) <= 1) return;
  const key = `break-hp-limit:${eventId}:${target.uuid}`;
  if (state.processedMessages.has(key)) return;
  state.processedMessages.add(key);
  window.setTimeout(() => state.processedMessages.delete(key), 120000);
  const initialHp = [options.midi?.oldHP, options.midi?.oldHp, options.midi?.oldHPValue, target.system?.attributes?.hp?.value]
    .map(Number).find(Number.isFinite);
  await new Promise(resolve => window.setTimeout(resolve, 100));
  const hp = target.system?.attributes?.hp;
  if (!hp || !Number.isFinite(initialHp)) return;
  await target.update({"system.attributes.hp.value": Math.max(0, Math.min(Number(hp.max) || Infinity, initialHp - 1))});
}

async function applyWeaknessBreakDamage(attacker, target) {
  const config = getConfig(attacker);
  if (!config.breakCharacter) return 0;
  const count = clamp(Math.floor(config.breakDamageDice), 1, 20);
  const faces = [4, 6, 8, 10, 12, 20].includes(Number(config.breakDamageDie)) ? Number(config.breakDamageDie) : 6;
  const modifier = breakEffectModifier(config);
  const roll = await new Roll(`${count}d${faces}`).evaluate();
  const damage = Math.max(0, Math.floor((Number(roll.total) || 0) * modifier));
  if (damage > 0) {
    const hp = target.system?.attributes?.hp;
    if (hp && Number.isFinite(Number(hp.value))) await target.update({"system.attributes.hp.value": Math.max(0, Number(hp.value) - damage)});
  }
  await roll.toMessage({speaker: ChatMessage.getSpeaker({actor: attacker}), flavor: `${attacker.name} — Weakness Break (${count}d${faces} × ${signedNumber(modifier)})${damage ? `: ${damage} HP damage` : ": no HP damage"}`});
  return damage;
}

function midiDamageRolls(workflow) {
  const rolls = [];
  for (const candidate of [workflow?.damageRolls, workflow?.damageRoll, workflow?.damageRollArray, workflow?.otherDamageRolls, workflow?.otherDamageRoll]) {
    if (Array.isArray(candidate)) rolls.push(...candidate);
    else if (candidate && typeof candidate === "object") rolls.push(candidate);
  }
  return [...new Set(rolls)];
}

function isDamageMessage(message) {
  const dnd = message.flags?.dnd5e ?? {};
  const type = String(dnd.roll?.type ?? dnd.type ?? message.rolls?.[0]?.options?.type ?? "").toLowerCase();
  return type.includes("damage") || message.rolls?.some(roll => String(roll.options?.type ?? roll.options?.rollType ?? "").toLowerCase().includes("damage"));
}

function damageRollsFromAppliedMessage(message) {
  const rolls = Array.isArray(message?.rolls) ? message.rolls : [];
  const explicitDamage = rolls.filter(roll => {
    const className = String(roll?.constructor?.name ?? "").toLowerCase();
    const rollType = String(roll?.options?.type ?? roll?.options?.rollType ?? "").toLowerCase();
    return className.includes("damageroll") || rollType.includes("damage");
  });
  if (explicitDamage.length) return explicitDamage;
  return rolls.filter(roll => !String(roll?.constructor?.name ?? "").toLowerCase().includes("d20roll"));
}

async function processAppliedDamage(target, amount, options = {}) {
  if (!isAuthority() || !target) return;
  const origin = options.origin;
  const sourceUuid = options.midi?.sourceActorUuid;
  let attacker = sourceUuid ? await fromUuid(sourceUuid).catch(() => null) : null;
  attacker = attacker?.actor ?? attacker;
  if (!attacker && origin?.speaker?.actor) attacker = game.actors.get(origin.speaker.actor);
  if (!attacker && origin?.speaker?.token) attacker = canvas?.tokens?.get(origin.speaker.token)?.actor;
  if (!attacker || attacker.documentName !== "Actor") return;

  const targetActor = target?.actor ?? target?.document?.actor ?? target;
  const damageEventId = origin?.id ?? options.midi?.workflowId ?? "unknown";

  if (Number(amount) > 0) {
    const detail = {sourceActor: attacker, targetActor, amount: Number(amount), origin, midi: options.midi ?? null};
    await dispatchTalentEvent("damageDealt", detail, `${damageEventId}:${targetActor.uuid}`);
    await dispatchTalentEvent("damageTaken", detail, `${damageEventId}:${targetActor.uuid}`);
  }

  await limitBreakAttackHpDamage(attacker, targetActor, amount, damageEventId, options);

  if (targetActor?.type === "character" && Number(amount) > 0) {
    const energyKey = `applied-energy:${damageEventId}:${targetActor.uuid}`;
    if (!state.processedMessages.has(energyKey)) {
      state.processedMessages.add(energyKey);
      window.setTimeout(() => state.processedMessages.delete(energyKey), 120000);
      const config = getConfig(targetActor);
      if (config.attackedMode === "targeted" || config.attackedMode === "hit") {
        await addEnergy(targetActor, energyGain(config, "attacked"), "hit");
      }
    }
  }

  const damageRolls = damageRollsFromAppliedMessage(origin);
  const toughnessDamage = getConfig(attacker).breakCharacter ? fullDamageTotal(damageRolls) : rawDiceTotal(damageRolls);
  if (toughnessDamage <= 0) return;
  const eventKey = `applied-damage:${damageEventId}:${targetActor.uuid}:${toughnessDamage}`;
  await applyToughnessDamage(attacker, [targetActor], toughnessDamage, eventKey);
}

async function applyToughnessDamage(attacker, targets, amount, eventKey = "") {
  if (!isAuthority() || !attacker || amount <= 0) return;
  const targetList = [...targets].filter(Boolean);
  const targetSignature = targetList.map(target => (target?.actor ?? target?.document?.actor ?? target)?.uuid ?? target?.id ?? "target").sort().join(",");
  const signature = `${attacker.uuid}:${targetSignature}:${amount}`;
  const now = Date.now();
  if (now - (state.recentToughness.get(signature) ?? 0) < 1500) return;
  const processedKey = eventKey ? `toughness:${eventKey}` : "";
  if (processedKey && state.processedMessages.has(processedKey)) return;
  const elementId = getConfig(attacker).elementId;
  const breakCharacter = getConfig(attacker).breakCharacter;
  const freeForAll = game.actors.some(entry => entry.type === "character" && foundry.utils.getProperty(entry.getFlag(MODULE_ID, "scriptState") ?? {}, "lark.freeForAll.active"));
  if (!elementId && !freeForAll) return;
  let applied = false;
  for (const target of targetList) {
    const actor = target?.actor ?? target?.document?.actor ?? target;
    if (!actor || actor.type !== "npc") continue;
    const toughness = getToughness(actor);
    const matchesWeakness = Boolean(elementId && effectiveToughnessWeaknesses(target).includes(elementId));
    if (!toughness.enabled || (!breakCharacter && !freeForAll && !matchesWeakness) || toughness.current <= 0) continue;
    const next = clamp(toughness.current - amount, 0, toughness.max);
    const discoveredWeaknesses = matchesWeakness ? [...new Set([...toughness.discoveredWeaknesses, elementId])] : toughness.discoveredWeaknesses;
    await actor.update({
      [`flags.${MODULE_ID}.toughness.current`]: next,
      [`flags.${MODULE_ID}.toughness.discoveredWeaknesses`]: discoveredWeaknesses
    });
    applied = true;
    if (next === 0 && toughness.current > 0) {
      ui.notifications.info(`${actor.name}'s Toughness was broken!`);
      await applyWeaknessBreakDamage(attacker, actor);
    }
  }
  if (processedKey && applied) {
    state.processedMessages.add(processedKey);
    window.setTimeout(() => state.processedMessages.delete(processedKey), 120000);
  }
  if (applied) {
    state.recentToughness.set(signature, now);
    window.setTimeout(() => state.recentToughness.delete(signature), 2000);
  }
}

async function processDnd5eDamageRolls(rolls, data = {}) {
  const subject = data.subject;
  const attacker = subject?.actor ?? subject?.item?.actor ?? subject?.parent?.actor ?? subject?.parent;
  if (!attacker || attacker.documentName !== "Actor") return;
  const rollList = Array.isArray(rolls) ? rolls : [rolls];
  const amount = getConfig(attacker).breakCharacter ? fullDamageTotal(rollList) : rawDiceTotal(rollList);
  if (amount <= 0) return;
  const targets = [...(game.user?.targets ?? [])];
  if (!targets.length) return;
  const rollKey = (Array.isArray(rolls) ? rolls : [rolls]).map(roll => roll?.id ?? roll?._id ?? roll?.formula ?? "roll").join(":");
  const eventKey = `dnd5e-damage:${attacker.uuid}:${rollKey}`;
  if (isAuthority()) return applyToughnessDamage(attacker, targets, amount, eventKey);
  if (!attacker.isOwner) return;
  const targetUuids = targets.map(target => target.document?.uuid ?? target.actor?.uuid).filter(Boolean);
  if (targetUuids.length) game.socket.emit(SOCKET, {type: "applyToughness", sourceUserId: game.user.id, attackerUuid: attacker.uuid, targetUuids, amount, eventKey});
}

async function processCoreAttackMessage(message) {
  const midiActive = game.modules.get("midi-qol")?.active;
  const attackMessage = isAttackMessage(message);
  const damageMessage = isDamageMessage(message);
  const macroDamageMessage = Boolean(message.rolls?.length) && message.user?.id === game.user.id && /attack|damage|weapon|spell/i.test(String(message.flavor ?? message.content ?? ""));
  if (!attackMessage && !damageMessage && !macroDamageMessage) return;
  if (state.processedMessages.has(message.id)) return;
  state.processedMessages.add(message.id);
  window.setTimeout(() => state.processedMessages.delete(message.id), 60000);
  const midiWorkflowId = message.flags?.["midi-qol"]?.workflowId ?? message.flags?.["midi-qol"]?.workflowUuid ?? message.flags?.["midi-qol"]?.itemUuid;
  const midiWorkflow = midiActive && midiWorkflowId ? globalThis.MidiQOL?.Workflow?.getWorkflow?.(midiWorkflowId) : null;
  const attacker = midiWorkflow?.actor ?? game.actors.get(message.speaker?.actor) ?? canvas?.tokens?.get(message.speaker?.token)?.actor;
  let targetIds = targetActorIdsFromMessage(message);
  if (!targetIds.size && midiWorkflow) {
    const workflowTargets = midiWorkflow.hitTargets?.size ? midiWorkflow.hitTargets : midiWorkflow.targets;
    for (const target of workflowTargets ?? []) {
      const actor = target?.actor ?? target?.document?.actor;
      if (actor) targetIds.add(actor.id);
    }
  }
  if (attackMessage && attacker) state.lastTargetsByActor.set(attacker.id, [...targetIds]);
  if (!targetIds.size && attacker) targetIds = new Set(state.lastTargetsByActor.get(attacker.id) ?? []);
  if (!isAuthority()) {
    if (attacker?.isOwner && (damageMessage || macroDamageMessage)) {
      const ownedTargets = [...(game.user.targets ?? [])];
      const targetUuids = ownedTargets.map(target => target.document?.uuid ?? target.actor?.uuid).filter(Boolean);
      const amount = getConfig(attacker).breakCharacter ? fullDamageTotal(message.rolls) : rawDiceTotal(message.rolls);
      if (amount > 0 && targetUuids.length) game.socket.emit(SOCKET, {type: "applyToughness", sourceUserId: game.user.id, attackerUuid: attacker.uuid, targetUuids, amount, eventKey: midiWorkflowId || `chat:${message.id}`});
    }
    return;
  }
  if (attackMessage && attacker) await addEnergy(attacker, energyGain(getConfig(attacker), "attack"), "attack");
  if ((damageMessage || macroDamageMessage) && attacker) {
    if (!midiActive) await awardPunchlineForAttack(attacker, `chat:${message.id}`);
    const toughnessDamage = getConfig(attacker).breakCharacter ? fullDamageTotal(message.rolls) : rawDiceTotal(message.rolls);
    await applyToughnessDamage(attacker, [...targetIds].map(id => game.actors.get(id)), toughnessDamage, midiWorkflowId || message.id);
  }
  if (midiActive) return;
  if (!attackMessage) return;
  for (const actorId of targetIds) {
    const target = game.actors.get(actorId);
    if (!target) continue;
    const config = getConfig(target);
    if (config.attackedMode === "targeted" || config.attackedMode === "hit") await addEnergy(target, energyGain(config, "attacked"), "attacked");
  }
}

async function processMidiWorkflow(workflow) {
  const key = workflow?.uuid ?? workflow?.id ?? workflow?.itemCardId ?? foundry.utils.randomID();
  const attacker = workflow?.actor;
  const targets = workflow?.targets ?? new Set();
  const hitTargets = workflow?.hitTargets ?? new Set();
  const usedAttackRoll = Boolean(workflow?.attackRoll || workflow?.attackRolls?.length || workflow?.activity?.attack);
  const toughnessTargets = usedAttackRoll ? hitTargets : (hitTargets.size ? hitTargets : targets);
  const damageRolls = midiDamageRolls(workflow);
  const diceDamage = getConfig(attacker).breakCharacter ? fullDamageTotal(damageRolls) : rawDiceTotal(damageRolls);
  if (!isAuthority()) {
    if (attacker && diceDamage > 0 && toughnessTargets.size !== 0) {
      const targetUuids = [...toughnessTargets].map(target => target?.document?.uuid ?? target?.actor?.uuid).filter(Boolean);
      game.socket.emit(SOCKET, {type: "applyToughness", sourceUserId: game.user.id, attackerUuid: attacker.uuid, targetUuids, amount: diceDamage, eventKey: key});
    }
    return;
  }
  const attackKey = `midi-attack:${key}`;
  if (attacker && !state.processedMessages.has(attackKey)) {
    state.processedMessages.add(attackKey);
    window.setTimeout(() => state.processedMessages.delete(attackKey), 120000);
    await addEnergy(attacker, energyGain(getConfig(attacker), "attack"), "attack");
    await dispatchTalentEvent("attackResolved", {
      sourceActor: attacker,
      item: workflow?.item ?? workflow?.activity?.item ?? null,
      activity: workflow?.activity ?? null,
      targets: [...targets],
      hitTargets: [...hitTargets],
      hit: hitTargets.size > 0,
      workflow
    }, `attack:${key}`);
  }
  if (attacker && (hitTargets.size > 0 || diceDamage > 0)) await awardPunchlineForAttack(attacker, `midi:${key}`);
  const targetKey = [...toughnessTargets].map(target => target?.id ?? target?.document?.id ?? target?.actor?.id ?? "target").sort().join(",");
  const damageKey = `midi-damage:${key}:${targetKey}:${diceDamage}`;
  if (diceDamage > 0 && !state.processedMessages.has(damageKey)) {
    state.processedMessages.add(damageKey);
    window.setTimeout(() => state.processedMessages.delete(damageKey), 120000);
    await applyToughnessDamage(attacker, toughnessTargets, diceDamage, key);
  }
  for (const target of targets) {
    const actor = target.actor ?? target.document?.actor;
    if (!actor) continue;
    const config = getConfig(actor);
    const hit = [...hitTargets].some(entry => (entry.id ?? entry.document?.id) === (target.id ?? target.document?.id));
    if (config.attackedMode === "targeted" || hit) await addEnergy(actor, energyGain(config, "attacked"), hit ? "hit" : "targeted");
  }
}

class ElementManager extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "tsru-element-manager",
      title: "Tely's Star Rail Ultimates — Elements",
      template: `modules/${MODULE_ID}/templates/element-manager.hbs`,
      width: 560,
      height: "auto",
      closeOnSubmit: true
    });
  }
  getData() { return {elements: foundry.utils.deepClone(getElements())}; }
  activateListeners(html) {
    super.activateListeners(html);
    activateImageDrops(html);
    html.find(".tsru-add-element").on("click", async () => {
      const elements = this._readElements(html);
      elements.push({id: foundry.utils.randomID(), name: "New Element", icon: "icons/svg/aura.svg", chargeColor: "#596171", readyColor: "#20e6ff"});
      await game.settings.set(MODULE_ID, "elementsDraft", elements);
      this._elementsOverride = elements;
      this.render(true);
    });
    html.find(".tsru-remove-element").on("click", event => {
      const index = Number(event.currentTarget.closest(".tsru-element-row").dataset.index);
      const elements = this._readElements(html);
      elements.splice(index, 1);
      this._elementsOverride = elements;
      this.render(true);
    });
    html.find("input[data-color-index]").on("change", event => {
      const index = event.currentTarget.dataset.colorIndex;
      const kind = event.currentTarget.dataset.colorKind;
      html.find(`input[name="elements.${index}.${kind}"]`).val(event.currentTarget.value);
    });
  }
  async _render(...args) {
    if (this._elementsOverride) {
      const original = this.getData;
      const override = this._elementsOverride;
      this.getData = () => ({elements: override});
      await super._render(...args);
      this.getData = original;
      return;
    }
    return super._render(...args);
  }
  _readElements(html) {
    const data = new FormData(html[0]);
    const expanded = foundry.utils.expandObject(Object.fromEntries(data.entries()));
    return Object.values(expanded.elements ?? {}).map(entry => ({
      id: entry.id || foundry.utils.randomID(),
      name: entry.name?.trim() || "Element",
      icon: entry.icon || "",
      chargeColor: entry.chargeColor || "#596171",
      readyColor: entry.readyColor || "#20e6ff"
    }));
  }
  async _updateObject(_event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    const elements = Object.values(expanded.elements ?? {}).map(entry => ({
      id: entry.id,
      name: entry.name,
      icon: entry.icon,
      chargeColor: entry.chargeColor || "#596171",
      readyColor: entry.readyColor || "#20e6ff"
    }));
    await game.settings.set(MODULE_ID, "elements", elements);
    this._elementsOverride = null;
    refreshAllOrbs();
    for (const app of Object.values(ui.windows ?? {})) if (app.actor?.type === "character") app.render(false);
  }
}

class ElementMenu extends FormApplication {
  render() { new ElementManager().render(true); return this; }
}

class PathManager extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {id: "tsru-path-manager", title: "Tely's Star Rail Ultimates — Paths", template: `modules/${MODULE_ID}/templates/path-manager.hbs`, width: 560, height: "auto", closeOnSubmit: true});
  }
  getData() { return {paths: foundry.utils.deepClone(this._pathsOverride ?? getPaths())}; }
  activateListeners(html) {
    super.activateListeners(html);
    activateImageDrops(html);
    html.find(".tsru-add-path").on("click", () => { this._pathsOverride = this._readPaths(html); this._pathsOverride.push({id: foundry.utils.randomID(), name: "New Path", icon: "icons/svg/upgrade.svg"}); this.render(true); });
    html.find(".tsru-remove-path").on("click", event => { const index = Number(event.currentTarget.closest(".tsru-path-row").dataset.index); this._pathsOverride = this._readPaths(html); this._pathsOverride.splice(index, 1); this.render(true); });
  }
  _readPaths(html) {
    const data = new FormData(html[0]);
    const expanded = foundry.utils.expandObject(Object.fromEntries(data.entries()));
    return Object.values(expanded.paths ?? {}).map(entry => ({id: entry.id || foundry.utils.randomID(), name: entry.name?.trim() || "Path", icon: entry.icon || ""}));
  }
  async _updateObject(_event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    const paths = Object.values(expanded.paths ?? {}).map(entry => ({id: entry.id, name: entry.name?.trim() || "Path", icon: entry.icon || ""}));
    await game.settings.set(MODULE_ID, "paths", paths);
    this._pathsOverride = null;
    for (const app of Object.values(ui.windows ?? {})) if (app.actor?.type === "character") app.render(false);
  }
}

class PathMenu extends FormApplication {
  render() { new PathManager().render(true); return this; }
}

class AhaConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "tsru-aha-config",
      title: "Aha Instant",
      template: `modules/${MODULE_ID}/templates/aha-config.hbs`,
      width: 560,
      height: "auto",
      closeOnSubmit: true
    });
  }
  getData() {
    const config = getAhaConfig();
    return {config, punchline: currentPunchline(), paths: getPaths().map(path => ({...path, selected: path.id === config.elationPathId}))};
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".file-picker").on("click", event => {
      const button = event.currentTarget;
      const target = button.dataset.target;
      new FilePicker({type: button.dataset.type || "any", current: html.find(`[name="${target}"]`).val(), callback: path => html.find(`[name="${target}"]`).val(path).trigger("change")}).browse();
    });
    html.find("[data-color-for]").on("change", event => html.find(`[name="${event.currentTarget.dataset.colorFor}"]`).val(event.currentTarget.value));
    html.find("[data-action='preview-aha']").on("click", () => playAhaVideo({video: html.find('[name="video"]').val()}));
    html.find("[data-action='show-aha-button']").on("click", showAhaButton);
    html.find("[data-action='show-punchline']").on("click", async () => { await savePunchlineLayout({visible: true}); refreshPunchlineHUD(); });
    html.find("[data-action='reset-canvas-toughness']").on("click", resetCanvasToughness);
    const refreshPunchlinePreview = () => {
      const preview = html.find(".tsru-punchline-placement-preview");
      const x = clamp(html.find('[name="punchlineIconOffsetX"]').val(), -100, 100);
      const y = clamp(html.find('[name="punchlineIconOffsetY"]').val(), -100, 100);
      preview.css("--tsru-preview-icon-x", `${x}px`).css("--tsru-preview-icon-y", `${y}px`);
      preview.find(".tsru-preview-x-value").text(`${x}px`);
      preview.find(".tsru-preview-y-value").text(`${y}px`);
      preview.find("img").attr("src", html.find('[name="punchlineIcon"]').val() || DEFAULT_AHA_CONFIG.punchlineIcon);
    };
    html.find('[name="punchlineIconOffsetX"], [name="punchlineIconOffsetY"]').on("input change", refreshPunchlinePreview);
    html.find('[name="punchlineIcon"]').on("input change", refreshPunchlinePreview);
    refreshPunchlinePreview();
    html.find("[data-action='sync-aha-initiative']").on("click", async () => {
      if (!game.combat) return ui.notifications.warn("There is no active combat to add Aha Instant to.");
      const combatant = await maybeEnsureAhaCombatant(game.combat, {force: true});
      if (combatant) ui.notifications.info(`Aha Instant is in combat at initiative ${combatant.initiative}.`);
    });
  }
  async _updateObject(_event, formData) {
    const savedConfig = {
      elationEnabled: Boolean(formData.elationEnabled),
      elationPathId: formData.elationPathId || "",
      punchlineIcon: formData.punchlineIcon || DEFAULT_AHA_CONFIG.punchlineIcon,
      punchlineFontFile: formData.punchlineFontFile || "",
      punchlineFontSize: clamp(formData.punchlineFontSize, 12, 160),
      punchlineIconOffsetX: clamp(formData.punchlineIconOffsetX, -100, 100),
      punchlineIconOffsetY: clamp(formData.punchlineIconOffsetY, -100, 100),
      video: formData.video || "",
      buttonImage: formData.buttonImage || DEFAULT_AHA_CONFIG.buttonImage,
      color: formData.color || DEFAULT_AHA_CONFIG.color,
      initiativeEnabled: Boolean(formData.initiativeEnabled),
      combatantImage: formData.combatantImage || DEFAULT_AHA_CONFIG.combatantImage
    };
    await game.settings.set(MODULE_ID, "ahaConfig", savedConfig);
    await setPunchline(formData.punchline);
    refreshAhaButton();
    state.punchlineMeter?.destroy();
    refreshPunchlineHUD();
    game.socket.emit(SOCKET, {type: "ahaConfigChanged", sourceUserId: game.user.id});
    if (!getAhaConfig().elationEnabled && game.combat) await clearElationActionTurns(game.combat);
    await syncAhaCombatants();
    for (const app of Object.values(ui.windows ?? {})) if (app.actor?.type === "character") app.render(false);
    ui.notifications.info("Aha Instant configuration saved.");
  }
}

class AhaMenu extends FormApplication {
  render() { new AhaConfig().render(true); return this; }
}

class SkillPointConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "tsru-skill-point-config",
      title: "Skill Point Configuration",
      template: `modules/${MODULE_ID}/templates/skill-point-config.hbs`,
      width: 580,
      height: "auto",
      closeOnSubmit: true
    });
  }
  getData() { return {config: getSkillPointConfig(), current: currentSkillPoints()}; }
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".file-picker").on("click", event => {
      const button = event.currentTarget;
      const target = button.dataset.target;
      new FilePicker({type: button.dataset.type || "image", current: html.find(`[name="${target}"]`).val(), callback: path => html.find(`[name="${target}"]`).val(path).trigger("change")}).browse();
    });
    activateImageDrops(html);
    html.find("[data-action='show-skill-ui']").on("click", showSkillUI);
    html.find("[data-action='refill-skill-points']").on("click", async () => {
      await setSkillPoints(getSkillPointConfig().maximum);
      html.find('[name="current"]').val(currentSkillPoints());
    });
  }
  async _updateObject(_event, formData) {
    const maximum = Math.max(1, Math.floor(Number(formData.maximum) || DEFAULT_SKILL_POINT_CONFIG.maximum));
    const config = {
      maximum,
      starting: clamp(Math.floor(Number(formData.starting)), 0, maximum),
      pointsPerRow: clamp(Math.floor(Number(formData.pointsPerRow)), 1, maximum),
      pointSpacing: clamp(Number(formData.pointSpacing), -50, 50),
      illuminatedIcon: formData.illuminatedIcon || DEFAULT_SKILL_POINT_CONFIG.illuminatedIcon,
      emptyIcon: formData.emptyIcon || DEFAULT_SKILL_POINT_CONFIG.emptyIcon,
      numberFontFile: formData.numberFontFile || ""
    };
    await game.settings.set(MODULE_ID, "skillPointConfig", config);
    await setSkillPoints(clamp(Math.floor(Number(formData.current)), 0, maximum));
    refreshSkillUI();
    ui.notifications.info("Shared Skill Point configuration saved.");
  }
}

class SkillPointMenu extends FormApplication {
  render() { new SkillPointConfig().render(true); return this; }
}

class EidolonAppearanceConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "tsru-eidolon-appearance-config",
      title: "Eidolon Interface Configuration",
      template: `modules/${MODULE_ID}/templates/eidolon-config.hbs`,
      width: 680,
      height: "auto",
      resizable: true,
      closeOnSubmit: true
    });
  }
  getData() { return {config: getEidolonConfig()}; }
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".file-picker").on("click", event => {
      const target = event.currentTarget.dataset.target;
      new FilePicker({type: event.currentTarget.dataset.type || "image", current: html.find(`[name="${target}"]`).val(), callback: path => html.find(`[name="${target}"]`).val(path).trigger("input")}).browse();
    });
    activateImageDrops(html);
    const refresh = () => {
      html.find(".tsru-eidolon-global-preview .tsru-eidolon-background").attr("src", html.find('[name="backgroundImage"]').val());
      html.find(".tsru-eidolon-global-preview .tsru-eidolon-five-overlay").attr("src", html.find('[name="fiveShardOverlay"]').val());
      html.find(".tsru-eidolon-global-preview .tsru-eidolon-e3-overlay").attr("src", html.find('[name="e3Overlay"]').val());
    };
    html.find("input").on("input change", refresh);
    refresh();
  }
  async _updateObject(_event, formData) {
    await game.settings.set(MODULE_ID, "eidolonConfig", {
      backgroundImage: formData.backgroundImage || "",
      fiveShardOverlay: formData.fiveShardOverlay || "",
      e3Overlay: formData.e3Overlay || "",
      referenceImage: formData.referenceImage || "",
      titleFontFile: formData.titleFontFile || "",
      mask1: formData.mask1 || "",
      mask2: formData.mask2 || "",
      mask3: formData.mask3 || "",
      mask4: formData.mask4 || "",
      mask5: formData.mask5 || "",
      mask6: formData.mask6 || ""
    });
    for (const app of Object.values(ui.windows ?? {})) if (app.actor?.type === "character") app.render(false);
    ui.notifications.info("Eidolon interface layers saved.");
  }
}

class EidolonAppearanceMenu extends FormApplication {
  render() { new EidolonAppearanceConfig().render(true); return this; }
}

async function insertActionAdvanceTurn(combatantId) {
  if (!isAuthority()) return ui.notifications.warn("Only the active GM can insert an Action Advance turn.");
  const combat = game.combat;
  if (!combat?.started) return ui.notifications.warn("Start combat before inserting an Action Advance turn.");
  if (state.actionAdvances.has(combat.id)) return ui.notifications.warn("Finish the current Action Advance turn first.");
  const source = combat.combatants.get(combatantId);
  if (!source || isAhaCombatant(source) || isElationActionCombatant(source)) return ui.notifications.warn("Choose a normal character or enemy in initiative.");
  const interrupted = combat.combatant;
  const currentInitiative = Number(interrupted?.initiative ?? 0);
  const next = combat.turns[Number(combat.turn ?? 0) + 1];
  let initiative = next ? (currentInitiative + Number(next.initiative ?? currentInitiative - 1)) / 2 : currentInitiative - 0.001;
  if (!Number.isFinite(initiative)) initiative = currentInitiative - 0.001;
  const [temporary] = await combat.createEmbeddedDocuments("Combatant", [{
    name: `ACTION ADVANCE — ${source.name}`,
    actorId: source.actorId,
    tokenId: null,
    sceneId: null,
    initiative,
    img: source.img ?? source.actor?.img ?? "icons/svg/mystery-man.svg",
    flags: {[MODULE_ID]: {actionAdvance: true, sourceCombatantId: source.id, resumeCombatantId: interrupted?.id ?? null, resumeRound: combat.round}}
  }]);
  if (!temporary) return;
  state.actionAdvances.set(combat.id, {combatantId: temporary.id, resumeCombatantId: interrupted?.id ?? null, resumeRound: combat.round});
  const index = combat.turns.findIndex(entry => entry.id === temporary.id);
  if (index >= 0) await combat.update({turn: index});
  ui.notifications.info(`${source.name} receives an Action Advance turn.`);
}

async function finishActionAdvance(combat, advance) {
  if (!isAuthority() || !combat || !advance) return;
  state.actionAdvances.delete(combat.id);
  const temporary = combat.combatants.get(advance.combatantId);
  if (temporary) await dispatchTalentEvent("turnEnd", {combat, combatant: temporary, sourceActor: temporary.actor ?? null}, `action-advance:${temporary.id}`);
  state.suppressCombatHook = true;
  try {
    if (combat.combatants.has(advance.combatantId)) await combat.deleteEmbeddedDocuments("Combatant", [advance.combatantId]);
    const resumeIndex = combat.turns.findIndex(entry => entry.id === advance.resumeCombatantId);
    if (resumeIndex >= 0) {
      await combat.update({round: advance.resumeRound, turn: resumeIndex});
      const resumed = combat.combatants.get(advance.resumeCombatantId);
      if (resumed) state.lastTalentTurns.set(combat.id, {key: `${combat.id}:${advance.resumeRound}:${resumed.id}`, combatantId: resumed.id, actorId: resumed.actor?.id ?? null});
    }
  } finally { state.suppressCombatHook = false; }
}

class StarRailGMPanel extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "tsru-gm-panel",
      title: "Star Rail GM Panel",
      template: `modules/${MODULE_ID}/templates/gm-panel.hbs`,
      width: 820,
      height: 720,
      minWidth: 340,
      minHeight: 300,
      resizable: true,
      closeOnSubmit: false
    });
  }
  getData() {
    const canvasCharacterIds = new Set((canvas?.tokens?.placeables ?? []).filter(token => token.actor?.type === "character").map(token => token.actor.id));
    const characters = game.actors
      .filter(actor => actor.type === "character" && (getConfig(actor).mainParty || canvasCharacterIds.has(actor.id)))
      .map(actor => ({actor, config: getConfig(actor), modifier: signedNumber(regenModifier(getConfig(actor)))}));
    const normalCombatants = game.combat?.combatants?.filter(entry => !isAhaCombatant(entry) && !isElationActionCombatant(entry) && !entry.getFlag(MODULE_ID, "temporaryUltimate") && !entry.getFlag(MODULE_ID, "actionAdvance")) ?? [];
    const combatants = game.combat?.started ? normalCombatants.map(entry => ({id: entry.id, name: entry.name, initiative: entry.initiative, img: entry.img})) : [];
    const initiativeTokenIds = new Set(normalCombatants.map(entry => entry.tokenId).filter(Boolean));
    const initiativeActorUuids = new Set(normalCombatants.map(entry => entry.actor?.uuid).filter(Boolean));
    const elements = getElements();
    const targetedIds = new Set([...(game.user?.targets ?? [])].map(token => token.id));
    const sceneEnemies = (canvas?.tokens?.placeables ?? []).filter(token => token.actor?.type === "npc" && (initiativeTokenIds.has(token.id) || initiativeActorUuids.has(token.actor.uuid))).map(token => {
      const actor = token.actor;
      const config = getToughness(actor);
      const temporary = temporaryToughnessWeaknesses(token);
      return {
        actor, token, tokenId: token.id, tokenUuid: token.document.uuid, targeted: targetedIds.has(token.id),
        elements: elements.map(element => ({...element, permanent: config.weaknesses.includes(element.id), temporary: temporary.includes(element.id)}))
      };
    });
    return {characters, sceneEnemies, punchline: currentPunchline(), skillPoints: currentSkillPoints(), skillPointMax: getSkillPointConfig().maximum, combatants, hasCombat: Boolean(game.combat?.started)};
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-resource-action]").on("click", async event => {
      const action = event.currentTarget.dataset.resourceAction;
      const delta = Number(event.currentTarget.dataset.delta) || 0;
      if (action === "punchline") await setPunchline(currentPunchline() + delta);
      if (action === "skillPoints") await setSkillPoints(currentSkillPoints() + delta);
      this.refreshLiveValues();
    });
    html.find("[data-resource-input]").on("change", async event => {
      if (event.currentTarget.dataset.resourceInput === "punchline") await setPunchline(event.currentTarget.value);
      if (event.currentTarget.dataset.resourceInput === "skillPoints") await setSkillPoints(event.currentTarget.value);
      this.refreshLiveValues();
    });
    html.find("[data-actor-field]").on("change", async event => {
      const input = event.currentTarget;
      const actor = game.actors.get(input.dataset.actorId);
      const field = input.dataset.actorField;
      if (!actor || !["current", "max", "regenScore", "attackGain", "attackedGain", "punchlineGain", "talentPointsCurrent", "talentPointsMax", "mainParty"].includes(field)) return;
      if (field === "mainParty") {
        await actor.update({[`flags.${MODULE_ID}.ultimate.mainParty`]: input.checked});
        return this.refreshLiveValues();
      }
      let value = Number(input.value);
      if (!Number.isFinite(value)) value = 0;
      value = Math.floor(value);
      const config = getConfig(actor);
      if (field === "max") {
        value = Math.max(1, value);
        await actor.update({[`flags.${MODULE_ID}.ultimate.max`]: value, [`flags.${MODULE_ID}.ultimate.current`]: clamp(config.current, 0, value)});
      } else if (field === "current") {
        const applied = await setEnergy(actor, value);
        input.value = applied ?? getConfig(actor).current;
        if (Number(applied) !== clamp(value, 0, config.max) && isEnergyLocked(actor)) ui.notifications.warn(`${actor.name} cannot regain Energy until the next round.`);
      }
      else if (field === "regenScore") await actor.update({[`flags.${MODULE_ID}.ultimate.regenScore`]: clamp(value, 1, 30)});
      else if (field === "talentPointsMax") {
        value = Math.max(0, value);
        await actor.update({[`flags.${MODULE_ID}.ultimate.talentPointsMax`]: value, [`flags.${MODULE_ID}.ultimate.talentPointsCurrent`]: clamp(config.talentPointsCurrent, 0, value)});
      } else if (field === "talentPointsCurrent") await setTalentPoints(actor, value);
      else await actor.update({[`flags.${MODULE_ID}.ultimate.${field}`]: Math.max(0, value)});
      this.refreshLiveValues();
    });
    html.find("[data-action='action-advance']").on("click", async () => {
      const id = html.find('[name="actionAdvanceCombatant"]').val();
      if (!id) return ui.notifications.warn("Choose a combatant first.");
      await insertActionAdvanceTurn(id);
      this.render(false);
    });
    html.find("[data-action='reset-canvas-toughness']").on("click", resetCanvasToughness);
    html.find("[data-action='save-temporary-weaknesses']").on("click", async event => {
      const row = event.currentTarget.closest("[data-toughness-actor]");
      const tokenDocument = row?.dataset.toughnessActor ? await fromUuid(row.dataset.toughnessActor).catch(() => null) : null;
      const selected = [...(row?.querySelectorAll("input[data-temporary-element]:checked") ?? [])].map(input => input.value);
      if (await setTemporaryToughnessWeaknesses(tokenDocument, selected)) {
        ui.notifications.info(`Temporary weaknesses saved for ${tokenDocument?.name ?? "enemy"}.`);
        this.render(false);
      }
    });
    html.find("[data-action='reset-temporary-weaknesses']").on("click", async event => {
      const tokenUuid = event.currentTarget.closest("[data-toughness-actor]")?.dataset.toughnessActor;
      const tokenDocument = tokenUuid ? await fromUuid(tokenUuid).catch(() => null) : null;
      const reset = await resetTemporaryToughnessWeaknesses(tokenDocument);
      ui.notifications.info(reset ? `Weaknesses reset to ${tokenDocument?.name ?? "enemy"}'s main sheet selections.` : "No temporary weaknesses needed resetting.");
      this.render(false);
    });
    html.find("[data-action='reset-all-temporary-weaknesses']").on("click", async () => {
      const reset = await resetTemporaryToughnessWeaknesses();
      ui.notifications.info(`Reset temporary weaknesses for ${reset} enem${reset === 1 ? "y" : "ies"}.`);
      this.render(false);
    });
    html.find("[data-open-config]").on("click", event => {
      const target = event.currentTarget.dataset.openConfig;
      if (target === "aha") new AhaConfig().render(true);
      if (target === "skills") new SkillPointConfig().render(true);
      if (target === "elements") new ElementManager().render(true);
      if (target === "paths") new PathManager().render(true);
      if (target === "eidolons") new EidolonAppearanceConfig().render(true);
    });
  }
  refreshLiveValues() {
    const root = this.element?.jquery ? this.element : $(this.element);
    if (!root?.length) return;
    root.find('[data-resource-input="punchline"]').val(currentPunchline());
    root.find('[data-resource-input="skillPoints"]').val(currentSkillPoints());
    for (const actor of game.actors.filter(entry => entry.type === "character")) {
      const config = getConfig(actor);
      root.find(`[data-actor-id="${actor.id}"][data-actor-field="current"]`).val(config.current);
      root.find(`[data-actor-id="${actor.id}"][data-actor-field="max"]`).val(config.max);
      root.find(`[data-actor-id="${actor.id}"][data-actor-field="talentPointsCurrent"]`).val(config.talentPointsCurrent);
      root.find(`[data-actor-id="${actor.id}"][data-actor-field="talentPointsMax"]`).val(config.talentPointsMax);
      root.find(`[data-actor-id="${actor.id}"][data-actor-field="mainParty"]`).prop("checked", config.mainParty);
      root.find(`[data-regen-modifier="${actor.id}"]`).text(signedNumber(regenModifier(config)));
    }
  }
  refreshTargetHighlights() {
    const root = this.element?.jquery ? this.element : $(this.element);
    if (!root?.length) return;
    const targeted = new Set([...(game.user?.targets ?? [])].map(token => token.id));
    root.find("[data-toughness-token]").each((_index, row) => {
      const active = targeted.has(row.dataset.toughnessToken);
      row.classList.toggle("targeted", active);
      $(row).find(".tsru-targeted-badge").toggle(active);
    });
  }
  async close(...args) {
    if (state.gmPanel === this) state.gmPanel = null;
    return super.close(...args);
  }
  async _updateObject() {}
}

function openStarRailGMPanel() {
  if (!game.user.isGM) return ui.notifications.warn("Only a GM can open the Star Rail GM Panel.");
  if (gmToolbarOpening) return;
  gmToolbarOpening = true;
  window.setTimeout(() => { gmToolbarOpening = false; }, 350);
  try {
    if (!state.gmPanel) state.gmPanel = new StarRailGMPanel();
    state.gmPanel.render(true);
  } catch (error) {
    console.error(`${MODULE_ID} | Could not open Star Rail GM Panel`, error);
    ui.notifications.error(`Could not open the Star Rail GM Panel: ${error.message}`);
  }
}

function registerSettings() {
  game.settings.register(MODULE_ID, "elements", {scope: "world", config: false, type: Array, default: []});
  game.settings.register(MODULE_ID, "paths", {scope: "world", config: false, type: Array, default: []});
  game.settings.register(MODULE_ID, "elementsDraft", {scope: "client", config: false, type: Array, default: []});
  game.settings.register(MODULE_ID, "orbLayouts", {scope: "client", config: false, type: Object, default: {}});
  game.settings.register(MODULE_ID, "ahaConfig", {scope: "world", config: false, type: Object, default: foundry.utils.deepClone(DEFAULT_AHA_CONFIG)});
  game.settings.register(MODULE_ID, "ahaLayout", {scope: "client", config: false, type: Object, default: {x: 220, y: 180, size: 128, visible: false}});
  game.settings.register(MODULE_ID, "punchline", {scope: "world", config: false, type: Number, default: 0});
  game.settings.register(MODULE_ID, "punchlineLayout", {scope: "client", config: false, type: Object, default: {x: 580, y: 145, size: 54, visible: true}});
  game.settings.register(MODULE_ID, "skillPointConfig", {scope: "world", config: false, type: Object, default: foundry.utils.deepClone(DEFAULT_SKILL_POINT_CONFIG)});
  game.settings.register(MODULE_ID, "skillPoints", {scope: "world", config: false, type: Number, default: DEFAULT_SKILL_POINT_CONFIG.starting});
  game.settings.register(MODULE_ID, "skillMeterLayout", {scope: "client", config: false, type: Object, default: {x: 420, y: 80, size: 42, visible: true}});
  game.settings.register(MODULE_ID, "skillButtonLayouts", {scope: "client", config: false, type: Object, default: {}});
  game.settings.register(MODULE_ID, "eidolonConfig", {scope: "world", config: false, type: Object, default: foundry.utils.deepClone(DEFAULT_EIDOLON_CONFIG)});
  game.settings.registerMenu(MODULE_ID, "elementManager", {
    name: "Manage Elements",
    label: "Open Element Manager",
    hint: "Create Element names, icons, and colors for assignment on character sheets.",
    icon: "fas fa-sparkles",
    type: ElementMenu,
    restricted: true
  });
  game.settings.registerMenu(MODULE_ID, "pathManager", {
    name: "Manage Paths",
    label: "Open Path Manager",
    hint: "Create Path names and drag-and-drop or browse for their character-sheet icons.",
    icon: "fas fa-route",
    type: PathMenu,
    restricted: true
  });
  game.settings.registerMenu(MODULE_ID, "ahaInstant", {
    name: "Aha Instant Configuration",
    label: "Configure Aha Instant",
    hint: "Choose the GM-only floating button artwork, color, and WebM shown to connected players.",
    icon: "fas fa-masks-theater",
    type: AhaMenu,
    restricted: true
  });
  game.settings.registerMenu(MODULE_ID, "skillPointsMenu", {
    name: "Skill Point Configuration",
    label: "Configure Skill Points",
    hint: "Configure the shared party pool, starting points, layout, and filled/empty point artwork.",
    icon: "fas fa-diamond",
    type: SkillPointMenu,
    restricted: true
  });
  game.settings.registerMenu(MODULE_ID, "eidolonAppearance", {
    name: "Eidolon Interface Configuration",
    label: "Configure Eidolon Layers",
    hint: "Choose the background, five-shard glass, E3 glass, reference artwork, and title font used by every character's Eidolon interface.",
    icon: "fas fa-gem",
    type: EidolonAppearanceMenu,
    restricted: true
  });
}

async function injectUltimateTab(app, html) {
  const actor = app.actor ?? app.document;
  if (!game.user.isGM || actor?.type !== "character") return;
  const rootElement = resolveActorSheetRoot(app, html);
  if (!rootElement) return;
  const root = $(rootElement);
  const existingControl = root.find('nav [data-tab="tsru-ultimate"]');
  const existingTab = root.find('.tsru-sheet-tab[data-tab="tsru-ultimate"]');
  if (existingControl.length && existingTab.length) return;
  existingControl.remove();
  existingTab.remove();
  if (root.attr("data-tsru-ultimate-injecting") === "true") return;
  root.attr("data-tsru-ultimate-injecting", "true");
  const nav = root.find('nav.tabs[data-group="primary"], nav.sheet-tabs[data-group="primary"], .tabs-right nav.tabs').first();
  let body = root.find('.tab-body').first();
  if (!body.length) body = root.find('.sheet-body').first();
  if (!body.length) body = root.find('[data-application-part="body"]').first();
  if (!nav.length || !body.length) {
    root.removeAttr("data-tsru-ultimate-injecting");
    addSheetConfigFallback(app, root, actor);
    return;
  }
  nav.append(`<a class="item control tsru-tab-control" data-action="tab" data-tab="tsru-ultimate" data-group="primary" data-tooltip="Ultimate Configuration" aria-label="Ultimate Configuration"><i class="fas fa-burst"></i><span class="tsru-tab-label">Ultimate</span></a>`);
  const config = getConfig(actor);
  const elements = getElements().map(entry => ({...entry, selected: entry.id === config.elementId}));
  const paths = getPaths().map(entry => ({...entry, selected: entry.id === config.pathId}));
  const content = await renderTemplate(`modules/${MODULE_ID}/templates/ultimate-tab.hbs`, {
    config, elements, paths,
    elationEnabled: getAhaConfig().elationEnabled,
    selectedElement: elements.find(entry => entry.selected),
    selectedPath: paths.find(entry => entry.selected),
    titleAlignLeft: config.titleAlign === "left",
    titleAlignCenter: config.titleAlign === "center",
    titleAlignRight: config.titleAlign === "right",
    modifierSigned: signedNumber(regenModifier(config)),
    breakModifierSigned: signedNumber(breakEffectModifier(config)),
    ultimateButtonArtwork: config.ultimateButtonImage || config.orbImage || "",
    breakDiceOptions: Array.from({length: 20}, (_value, index) => ({value: index + 1, selected: config.breakDamageDice === index + 1})),
    breakDieOptions: [4, 6, 8, 10, 12, 20].map(value => ({value, selected: config.breakDamageDie === value})),
    modeHit: config.attackedMode === "hit",
    modeTargeted: config.attackedMode === "targeted"
  });
  body.append(content);
  const tab = body.find('.tsru-sheet-tab');
  activateConfigListeners(actor, tab, app);
  const ultimateControl = nav.find('[data-tab="tsru-ultimate"]');
  ultimateControl.on("click.tsru", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    nav.find('[data-tab]').removeClass("active");
    ultimateControl.addClass("active");
    root.find('.tab[data-group="primary"]').removeClass("active");
    tab.addClass("active");
    root.addClass("tsru-tab-open");
    if (app.tabGroups) app.tabGroups.primary = "tsru-ultimate";
  });
  nav.find('[data-tab]').not('[data-tab="tsru-ultimate"]').on("click.tsru-hide", () => {
    tab.removeClass("active");
    root.removeClass("tsru-tab-open");
  });
  root.removeAttr("data-tsru-ultimate-injecting");
  if (app.tabGroups?.primary === "tsru-ultimate") ultimateControl.trigger("click");
}

function addSheetConfigFallback(app, root, actor) {
  if (root.find(".tsru-config-fallback").length) return;
  const header = root.closest(".window-app").find(".window-header").first().length
    ? root.closest(".window-app").find(".window-header").first()
    : root.find(".window-header").first();
  if (!header.length) return console.warn(`${MODULE_ID} | Could not add Ultimate tab or fallback button to`, app);
  const button = $(`<button type="button" class="header-control icon tsru-config-fallback" data-tooltip="Ultimate Configuration" aria-label="Ultimate Configuration"><i class="fas fa-burst"></i></button>`);
  header.find(".window-controls").prepend(button);
  button.on("click", () => openUltimateConfig(actor, app));
}

async function openUltimateConfig(actor, sheetApp = null) {
  const config = getConfig(actor);
  const elements = getElements().map(entry => ({...entry, selected: entry.id === config.elementId}));
  const paths = getPaths().map(entry => ({...entry, selected: entry.id === config.pathId}));
  const content = await renderTemplate(`modules/${MODULE_ID}/templates/ultimate-tab.hbs`, {
    config, elements, paths,
    elationEnabled: getAhaConfig().elationEnabled,
    selectedElement: elements.find(entry => entry.selected),
    selectedPath: paths.find(entry => entry.selected),
    titleAlignLeft: config.titleAlign === "left",
    titleAlignCenter: config.titleAlign === "center",
    titleAlignRight: config.titleAlign === "right",
    modifierSigned: signedNumber(regenModifier(config)),
    breakModifierSigned: signedNumber(breakEffectModifier(config)),
    ultimateButtonArtwork: config.ultimateButtonImage || config.orbImage || "",
    breakDiceOptions: Array.from({length: 20}, (_value, index) => ({value: index + 1, selected: config.breakDamageDice === index + 1})),
    breakDieOptions: [4, 6, 8, 10, 12, 20].map(value => ({value, selected: config.breakDamageDie === value})),
    modeHit: config.attackedMode === "hit",
    modeTargeted: config.attackedMode === "targeted"
  });
  const dialog = new Dialog({title: `${actor.name} — Ultimate Configuration`, content, buttons: {close: {label: "Close"}}}, {width: 620, height: 760, resizable: true, classes: ["tsru-config-dialog"]});
  Hooks.once("renderDialog", rendered => {
    if (rendered !== dialog) return;
    const root = rendered.element.find(".tsru-sheet-tab").addClass("active");
    activateConfigListeners(actor, root, sheetApp ?? rendered);
  });
  dialog.render(true);
}

function activateConfigListeners(actor, tab, app) {
  tab.find("input, select, textarea, button").prop("disabled", false);
  tab.find("input:not([readonly])").prop("readonly", false);
  tab.on("input.tsru change.tsru", "input, select, textarea", event => event.stopPropagation());
  tab.find("[data-action='save-config']").on("click", async event => {
    event.preventDefault();
    event.stopPropagation();
    const data = foundry.utils.deepClone(getConfig(actor));
    tab.find("[name]").each((_index, field) => {
      data[field.name] = field.type === "checkbox" ? field.checked : field.value;
    });
    for (const key of ["current", "max", "regenScore", "breakEffectScore", "breakDamageDice", "breakDamageDie", "attackGain", "attackedGain", "talentPointsCurrent", "talentPointsMax", "punchlineGain", "splashDuration", "titleX", "titleY", "titleSize"]) data[key] = Number(data[key]);
    for (const key of ["enabled", "showPercent", "skillEnabled", "mainParty", "lockEnergyAfterUltimate", "breakCharacter"]) data[key] = Boolean(data[key]);
    data.max = Math.max(1, data.max || 100);
    data.current = clamp(data.current, 0, data.max);
    const savedConfig = getConfig(actor);
    if (isEnergyLocked(actor) && data.current > savedConfig.current) {
      data.current = savedConfig.current;
      ui.notifications.warn(`${actor.name} cannot regain Energy until the next round.`);
    }
    data.talentPointsMax = Math.max(0, Math.floor(data.talentPointsMax || 0));
    data.talentPointsCurrent = clamp(Math.floor(data.talentPointsCurrent || 0), 0, data.talentPointsMax);
    await actor.setFlag(MODULE_ID, "ultimate", data);
    ui.notifications.info(`${actor.name}'s Ultimate configuration saved.`);
    refreshOrb(actor);
    refreshSkillUI();
    if (app?.render) app.render(false);
  });
  tab.find(".file-picker").on("click", event => {
    const button = event.currentTarget;
    const target = button.dataset.target;
    new FilePicker({type: button.dataset.type || "image", current: tab.find(`[name="${target}"]`).val(), callback: path => tab.find(`[name="${target}"]`).val(path)}).browse();
  });
  tab.find("input[data-color-for]").on("change", event => tab.find(`[name="${event.currentTarget.dataset.colorFor}"]`).val(event.currentTarget.value));
  tab.find("[data-action='preview-splash']").on("click", () => {
    const element = getElements().find(entry => entry.id === tab.find("[name='elementId']").val());
    showSplash({actorName: actor.name, image: tab.find("[name='splashImage']").val(), duration: Number(tab.find("[name='splashDuration']").val()) || 1, ultimateName: tab.find("[name='ultimateName']").val(), ultimateSubtitle: tab.find("[name='ultimateSubtitle']").val(), titleX: Number(tab.find("[name='titleX']").val()), titleY: Number(tab.find("[name='titleY']").val()), titleSize: Number(tab.find("[name='titleSize']").val()), titleAlign: tab.find("[name='titleAlign']").val(), fontFile: tab.find("[name='fontFile']").val(), subtitleFontFile: tab.find("[name='subtitleFontFile']").val(), color: element?.chargeColor || DEFAULT_CONFIG.chargeColor});
  });
  tab.find("[data-action='set-energy']").on("click", async event => {
    event.preventDefault();
    event.stopPropagation();
    const config = getConfig(actor);
    const value = clamp(tab.find(".tsru-energy-override-value").val(), 0, config.max);
    const applied = await setEnergy(actor, value);
    tab.find("[name='current']").val(applied);
    tab.find(".tsru-energy-override-value").val(applied);
    refreshOrb(actor);
    if (Number(applied) !== value && isEnergyLocked(actor)) ui.notifications.warn(`${actor.name} cannot regain Energy until the next round.`);
    else ui.notifications.info(`${actor.name}'s Energy was set to ${applied}/${config.max}.`);
  });
  tab.find("[data-action='reset-energy']").on("click", async () => { await setEnergy(actor, 0); app.render(false); });
  tab.find("[data-action='fill-energy']").on("click", async () => { await setEnergy(actor, getConfig(actor).max); app.render(false); });
  tab.find("[data-action='show-orb']").on("click", () => showOrb(actor));
  tab.find("[data-action='show-skill-button']").on("click", async () => { await saveSkillButtonLayout(actor.id, {visible: true}); refreshSkillUI(); });
  tab.find("[name='regenScore']").on("input", event => tab.find(".tsru-modifier").text(`Modifier: ${signedNumber(Math.floor(((Number(event.currentTarget.value) || 10) - 10) / 2))}`));
  tab.find("[name='breakEffectScore']").on("input", event => tab.find(".tsru-break-modifier").text(`Modifier: ${signedNumber(Math.floor(((Number(event.currentTarget.value) || 10) - 10) / 2))}`));
}

async function eidolonTabData(actor) {
  const data = getEidolons(actor);
  const interfaceConfig = getEidolonConfig();
  const firstLocked = data.slots.find(slot => !slot.active)?.number ?? 7;
  return {
    interface: interfaceConfig,
    currencyUuid: data.currencyUuid,
    isGM: Boolean(game.user.isGM),
    slots: data.slots.map(slot => ({
      ...slot,
      isE3: slot.number === 3,
      mask: interfaceConfig[`mask${slot.number}`] ? "none" : EIDOLON_MASKS[slot.number],
      maskImage: resolveAssetUrl(interfaceConfig[`mask${slot.number}`]),
      displayArtwork: slot.artwork || "",
      scalePercent: slot.scale / 100,
      canActivate: slot.number === firstLocked && (game.user.isGM || actor.isOwner),
      canConfigure: Boolean(game.user.isGM)
    }))
  };
}

async function findEidolonCurrency(actor, currencyUuid) {
  if (!currencyUuid) return null;
  const source = await fromUuid(currencyUuid).catch(() => null);
  return actor.items?.find(item => item.uuid === currencyUuid || item.getFlag("core", "sourceId") === currencyUuid || (source && item.name === source.name && item.type === source.type)) ?? null;
}

async function activateEidolon(actor, number) {
  if (!(game.user.isGM || actor.isOwner)) return ui.notifications.warn("You do not own this character.");
  const data = getEidolons(actor);
  const next = data.slots.find(slot => !slot.active)?.number;
  if (number !== next) return ui.notifications.warn(`E${next ?? 6} must be activated next.`);
  const currency = await findEidolonCurrency(actor, data.currencyUuid);
  const quantity = Number(currency?.system?.quantity ?? 0);
  if (!game.user.isGM && (!currency || quantity < 1)) return ui.notifications.warn("This character does not have the configured Eidolon currency.");
  if (currency && quantity > 0) {
    if (quantity === 1) await currency.delete();
    else await currency.update({"system.quantity": quantity - 1});
  } else if (!game.user.isGM) return;
  data.slots[number - 1].active = true;
  await actor.setFlag(MODULE_ID, "eidolons", data);
  ui.notifications.info(`${actor.name} activated Eidolon ${number}.`);
  for (const app of Object.values(ui.windows ?? {})) if ((app.actor ?? app.document)?.id === actor.id) app.render(false);
}

function refreshEidolonPreview(tab, number) {
  const editor = tab.find(`[data-eidolon-editor="${number}"]`);
  const art = tab.find(`[data-eidolon-preview-art="${number}"]`);
  if (!editor.length || !art.length) return;
  const artwork = editor.find(`[name="eidolon.${number}.artwork"]`).val();
  const x = Number(editor.find(`[name="eidolon.${number}.offsetX"]`).val()) || 0;
  const y = Number(editor.find(`[name="eidolon.${number}.offsetY"]`).val()) || 0;
  const scale = Number(editor.find(`[name="eidolon.${number}.scale"]`).val()) || 100;
  art.find("img").attr("src", artwork || "");
  art.css("--art-x", `${x}%`).css("--art-y", `${y}%`).css("--art-scale", String(scale / 100));
  editor.find(`[name="eidolon.${number}.offsetX"]`).next("output").text(`${x}%`);
  editor.find(`[name="eidolon.${number}.offsetY"]`).next("output").text(`${y}%`);
  editor.find(`[name="eidolon.${number}.scale"]`).next("output").text(`${scale}%`);
}

function populateEidolonEditor(actor, tab, number) {
  const slot = getEidolons(actor).slots[number - 1];
  const editor = tab.find(`[data-eidolon-editor="${number}"]`);
  if (!slot || !editor.length) return;
  editor.find(`[name="eidolon.${number}.title"]`).val(slot.title);
  editor.find(`[name="eidolon.${number}.artwork"]`).val(slot.artwork);
  editor.find(`[name="eidolon.${number}.offsetX"]`).val(slot.offsetX);
  editor.find(`[name="eidolon.${number}.offsetY"]`).val(slot.offsetY);
  editor.find(`[name="eidolon.${number}.scale"]`).val(slot.scale);
  editor.find(`[name="eidolon.${number}.active"]`).prop("checked", slot.active);
  refreshEidolonPreview(tab, number);
}

function activateEidolonListeners(actor, tab, app) {
  tab.find("[data-action='activate-eidolon']").on("click", async event => activateEidolon(actor, Number(event.currentTarget.dataset.eidolon)));
  if (!game.user.isGM) return;
  tab.find("[data-action='configure-eidolon']").on("click", event => {
    const number = Number(event.currentTarget.dataset.eidolon);
    populateEidolonEditor(actor, tab, number);
    const popout = tab.find(`[data-eidolon-popout="${number}"]`);
    popout.data("tsru-return-parent", popout.parent()[0]);
    popout.prop("hidden", false).addClass("open").appendTo(document.body);
  });
  tab.find("[data-action='close-eidolon-config']").on("click", event => {
    const popout = $(event.currentTarget).closest("[data-eidolon-popout]");
    const returnParent = popout.data("tsru-return-parent");
    popout.prop("hidden", true).removeClass("open");
    if (returnParent?.isConnected) popout.appendTo(returnParent);
    else popout.remove();
  });
  tab.find(".file-picker").on("click", event => {
    const target = event.currentTarget.dataset.target;
    const scope = $(event.currentTarget).closest("[data-eidolon-popout]").length ? $(event.currentTarget).closest("[data-eidolon-popout]") : tab;
    const popout = scope.is("[data-eidolon-popout]") ? scope : $();
    let restored = false;
    const restorePopout = () => {
      if (restored || !popout.length) return;
      restored = true;
      popout.prop("hidden", false).addClass("open");
    };
    const picker = new FilePicker({
      type: event.currentTarget.dataset.type || "image",
      current: scope.find(`[name="${target}"]`).val(),
      callback: path => {
        scope.find(`[name="${target}"]`).val(path).trigger("input");
        restorePopout();
      }
    });
    const originalClose = picker.close.bind(picker);
    picker.close = async (...args) => {
      try {
        return await originalClose(...args);
      } finally {
        restorePopout();
      }
    };
    if (popout.length) popout.prop("hidden", true);
    Promise.resolve(picker.browse()).catch(error => {
      restorePopout();
      console.error(`${MODULE_ID} | Could not open Eidolon artwork browser`, error);
    });
  });
  tab.find("[data-eidolon-editor] input").on("input change", event => {
    const number = Number(event.currentTarget.closest("[data-eidolon-editor]").dataset.eidolonEditor);
    refreshEidolonPreview($(event.currentTarget).closest("[data-eidolon-popout]"), number);
  });
  tab.find("[data-eidolon-preview-art]").on("pointerdown", event => {
    const slot = Number(event.currentTarget.dataset.eidolonPreviewArt);
    const popout = $(event.currentTarget).closest("[data-eidolon-popout]");
    const editor = popout.find(`[data-eidolon-editor="${slot}"]`);
    const xInput = editor.find(`[name="eidolon.${slot}.offsetX"]`);
    const yInput = editor.find(`[name="eidolon.${slot}.offsetY"]`);
    const startX = event.clientX;
    const startY = event.clientY;
    const initialX = Number(xInput.val()) || 0;
    const initialY = Number(yInput.val()) || 0;
    const preview = event.currentTarget.closest(".tsru-eidolon-popout-preview");
    const rect = preview.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = moveEvent => {
      xInput.val(clamp(initialX + ((moveEvent.clientX - startX) / rect.width) * 100, -100, 100));
      yInput.val(clamp(initialY + ((moveEvent.clientY - startY) / rect.height) * 100, -100, 100));
      refreshEidolonPreview(popout, slot);
    };
    const end = () => {
      event.currentTarget.removeEventListener("pointermove", move);
      event.currentTarget.removeEventListener("pointerup", end);
      event.currentTarget.removeEventListener("pointercancel", end);
    };
    event.currentTarget.addEventListener("pointermove", move);
    event.currentTarget.addEventListener("pointerup", end);
    event.currentTarget.addEventListener("pointercancel", end);
  });
  tab.find('[name="eidolonCurrencyUuid"]').on("drop", event => {
    event.preventDefault();
    try {
      const dropped = JSON.parse(event.originalEvent?.dataTransfer?.getData("text/plain") || "{}");
      if (dropped.type === "Item" && dropped.uuid) event.currentTarget.value = dropped.uuid;
    } catch (_error) {}
  });
  tab.find("[data-action='save-eidolon-currency']").on("click", async () => {
    const data = getEidolons(actor);
    data.currencyUuid = String(tab.find('[name="eidolonCurrencyUuid"]').val() || "").trim();
    await actor.setFlag(MODULE_ID, "eidolons", data);
    ui.notifications.info(`${actor.name}'s Eidolon activation currency was saved.`);
  });
  tab.find("[data-action='save-eidolon']").on("click", async event => {
    const number = Number(event.currentTarget.dataset.eidolon);
    const data = getEidolons(actor);
    const slot = data.slots[number - 1];
    const popout = $(event.currentTarget).closest("[data-eidolon-popout]");
    const editor = popout.find(`[data-eidolon-editor="${number}"]`);
    slot.title = String(editor.find(`[name="eidolon.${number}.title"]`).val() || `Eidolon ${number}`);
    slot.artwork = String(editor.find(`[name="eidolon.${number}.artwork"]`).val() || "");
    slot.offsetX = clamp(editor.find(`[name="eidolon.${number}.offsetX"]`).val(), -100, 100);
    slot.offsetY = clamp(editor.find(`[name="eidolon.${number}.offsetY"]`).val(), -100, 100);
    slot.scale = clamp(editor.find(`[name="eidolon.${number}.scale"]`).val(), 25, 400);
    slot.active = editor.find(`[name="eidolon.${number}.active"]`).prop("checked");
    popout.prop("hidden", true).removeClass("open").remove();
    await actor.setFlag(MODULE_ID, "eidolons", data);
    ui.notifications.info(`${actor.name}'s E${number} appearance was saved.`);
  });
}

async function injectEidolonTab(app, html) {
  const actor = app.actor ?? app.document;
  if (actor?.documentName !== "Actor" || actor.type !== "character") return;
  const rootElement = resolveActorSheetRoot(app, html);
  if (!rootElement) return;
  const root = $(rootElement);
  const existingControl = root.find('nav [data-tab="tsru-eidolons"]');
  const existingTab = root.find('.tsru-eidolon-tab[data-tab="tsru-eidolons"]');
  if (existingControl.length && existingTab.length) return;
  existingControl.remove();
  existingTab.remove();
  if (root.attr("data-tsru-eidolons-injecting") === "true") return;
  root.attr("data-tsru-eidolons-injecting", "true");
  const nav = root.find('nav.tabs[data-group="primary"], nav.sheet-tabs[data-group="primary"], .tabs-right nav.tabs').first();
  let body = root.find('.tab-body').first();
  if (!body.length) body = root.find('.sheet-body').first();
  if (!body.length) body = root.find('[data-application-part="body"]').first();
  if (!nav.length || !body.length) { root.removeAttr("data-tsru-eidolons-injecting"); return; }
  nav.append(`<a class="item control tsru-tab-control" data-action="tab" data-tab="tsru-eidolons" data-group="primary" data-tooltip="Eidolon Resonance" aria-label="Eidolon Resonance"><i class="fas fa-gem"></i><span class="tsru-tab-label">Eidolons</span></a>`);
  body.append(await renderTemplate(`modules/${MODULE_ID}/templates/eidolon-tab.hbs`, await eidolonTabData(actor)));
  const tab = body.find('.tsru-eidolon-tab');
  const control = nav.find('[data-tab="tsru-eidolons"]');
  const fontFile = getEidolonConfig().titleFontFile;
  if (fontFile) loadSplashFont(fontFile).then(font => tab.css("--tsru-eidolon-font", font)).catch(error => console.warn(`${MODULE_ID} | Could not load Eidolon title font`, error));
  activateEidolonListeners(actor, tab, app);
  control.on("click.tsru", event => {
    event.preventDefault(); event.stopImmediatePropagation();
    nav.find('[data-tab]').removeClass("active"); control.addClass("active");
    root.find('.tab[data-group="primary"]').removeClass("active"); tab.addClass("active");
    root.addClass("tsru-eidolon-tab-open");
    if (app.tabGroups) app.tabGroups.primary = "tsru-eidolons";
  });
  nav.find('[data-tab]').not('[data-tab="tsru-eidolons"]').on("click.tsru-eidolon-hide", () => {
    tab.removeClass("active");
    root.removeClass("tsru-eidolon-tab-open");
  });
  root.removeAttr("data-tsru-eidolons-injecting");
  if (app.tabGroups?.primary === "tsru-eidolons") control.trigger("click");
}

function observeCharacterSheetTabs(app) {
  const actor = app.actor ?? app.document;
  if (actor?.documentName !== "Actor" || actor.type !== "character") return;
  const rawElement = app.element;
  const root = rawElement?.jquery ? rawElement[0] : rawElement?.[0] instanceof HTMLElement ? rawElement[0] : rawElement;
  if (!(root instanceof HTMLElement)) return;
  const previous = state.sheetObservers.get(app);
  if (previous?.root === root) return;
  previous?.observer?.disconnect();
  if (previous?.timer) clearTimeout(previous.timer);
  const entry = {root, observer: null, timer: null};
  const ensureTabs = () => {
    if (!root.isConnected) return;
    injectUltimateTab(app, root);
    injectEidolonTab(app, root);
  };
  const observer = new MutationObserver(() => {
    clearTimeout(entry.timer);
    entry.timer = setTimeout(ensureTabs, 40);
  });
  entry.observer = observer;
  observer.observe(root, {childList: true, subtree: true});
  state.sheetObservers.set(app, entry);
  setTimeout(ensureTabs, 0);
  setTimeout(ensureTabs, 100);
  setTimeout(ensureTabs, 300);
}

function openToughnessConfig(actor) {
  const config = getToughness(actor);
  const elements = getElements();
  const weaknessRows = elements.map(element => `<label class="tsru-weakness-choice"><input type="checkbox" name="weakness" value="${escapeHTML(element.id)}" ${config.weaknesses.includes(element.id) ? "checked" : ""}><img src="${escapeHTML(element.icon || "icons/svg/aura.svg")}"><span>${escapeHTML(element.name)}</span></label>`).join("");
  const content = `<form class="tsru-toughness-form">
    <p>Configure this enemy's Star Rail Toughness and elemental weaknesses. Only GMs can see its token display.</p>
    <label class="tsru-toughness-toggle"><span><strong>Enable Toughness</strong><small>Show and process Toughness while this NPC is in combat.</small></span><input type="checkbox" name="enabled" ${config.enabled ? "checked" : ""}></label>
    <div class="tsru-toughness-numbers"><label><strong>Current</strong><input type="number" name="current" min="0" value="${config.current}"></label><label><strong>Maximum</strong><input type="number" name="max" min="1" value="${config.max}"></label></div>
    <fieldset><legend>Elemental Weaknesses</legend><div class="tsru-weakness-grid">${weaknessRows || "<em>Create Elements in Module Settings first.</em>"}</div></fieldset>
  </form>`;
  const dialog = new Dialog({title: `${actor.name} — Toughness`, content, buttons: {
    save: {icon: '<i class="fas fa-save"></i>', label: "Save", callback: async html => {
      const max = Math.max(1, Number(html.find('[name="max"]').val()) || 100);
      const data = {enabled: html.find('[name="enabled"]').prop("checked"), max, current: clamp(html.find('[name="current"]').val(), 0, max), weaknesses: html.find('[name="weakness"]:checked').map((_i, field) => field.value).get(), temporaryWeaknesses: config.temporaryWeaknesses, discoveredWeaknesses: config.discoveredWeaknesses};
      await actor.setFlag(MODULE_ID, "toughness", data);
      refreshToughnessBars();
    }},
    refill: {icon: '<i class="fas fa-shield"></i>', label: "Refill", callback: async html => {
      const max = Math.max(1, Number(html.find('[name="max"]').val()) || config.max);
      await actor.setFlag(MODULE_ID, "toughness", {...config, current: max, max});
      refreshToughnessBars();
    }},
    hideWeaknesses: {icon: '<i class="fas fa-eye-slash"></i>', label: "Reset Discoveries", callback: async () => {
      await actor.update({[`flags.${MODULE_ID}.toughness.discoveredWeaknesses`]: []});
      refreshToughnessBars();
    }}
  }, default: "save"}, {width: 540, classes: ["tsru-toughness-dialog"]});
  dialog.render(true);
}

function drawToughnessRect(graphics, x, y, width, height, color, alpha = 1, radius = 0) {
  if (typeof graphics.roundRect === "function" && typeof graphics.fill === "function") {
    graphics.roundRect(x, y, width, height, radius).fill({color, alpha});
  } else {
    graphics.beginFill(color, alpha);
    radius ? graphics.drawRoundedRect(x, y, width, height, radius) : graphics.drawRect(x, y, width, height);
    graphics.endFill();
  }
}

function renderToughnessBar(token) {
  token?.children?.filter?.(child => child.name === "tsru-toughness-bar").forEach(child => child.destroy({children: true}));
  if (!token?.actor || token.actor.type !== "npc" || !game.combat?.combatants?.some(c => c.tokenId === token.document.id)) return;
  const config = getToughness(token.actor);
  if (!config.enabled) return;
  const PIXIRef = globalThis.PIXI;
  if (!PIXIRef?.Container || !PIXIRef?.Graphics) return;
  const container = new PIXIRef.Container();
  container.name = "tsru-toughness-bar";
  container.eventMode = "none";
  const graphics = new PIXIRef.Graphics();
  const width = Math.max(54, token.w * .82);
  const height = Math.max(7, Math.min(12, token.h * .055));
  const x = (token.w - width) / 2;
  const y = token.h - height - 15;
  drawToughnessRect(graphics, x - 2, y - 2, width + 4, height + 4, 0x111318, .92, 3);
  drawToughnessRect(graphics, x, y, width, height, 0x3c4149, 1, 2);
  const fill = width * clamp(config.current / config.max, 0, 1);
  if (fill > 0) drawToughnessRect(graphics, x, y, fill, height, 0xaeb4bd, 1, 2);
  container.addChild(graphics);
  const effectiveWeaknesses = effectiveToughnessWeaknesses(token);
  const visibleWeaknesses = game.user?.isGM
    ? effectiveWeaknesses
    : [...new Set([...config.discoveredWeaknesses.filter(id => effectiveWeaknesses.includes(id)), ...temporaryToughnessWeaknesses(token)])];
  const weaknesses = getElements().filter(element => visibleWeaknesses.includes(element.id));
  const dotSize = Math.max(7, Math.min(11, token.w * .055));
  weaknesses.forEach((element, index) => {
    const dot = new PIXIRef.Graphics();
    const hex = Number.parseInt(String(element.readyColor || element.color || "#ffffff").replace("#", ""), 16) || 0xffffff;
    const dx = x + index * (dotSize + 3);
    if (typeof dot.circle === "function" && typeof dot.fill === "function") dot.circle(dx + dotSize / 2, y - dotSize / 2 - 4, dotSize / 2).fill({color: hex});
    else { dot.beginFill(hex); dot.drawCircle(dx + dotSize / 2, y - dotSize / 2 - 4, dotSize / 2); dot.endFill(); }
    container.addChild(dot);
  });
  token.addChild(container);
}

function refreshToughnessBars() {
  for (const token of canvas?.tokens?.placeables ?? []) renderToughnessBar(token);
}

function injectToughnessHeaderButton(app, html) {
  const actor = app.actor ?? app.document;
  if (!game.user?.isGM || actor?.documentName !== "Actor" || actor.type !== "npc") return;
  const appElement = app.element?.jquery ? app.element : $(app.element ?? html);
  const renderedElement = html?.jquery ? html : $(html);
  const root = appElement.length ? appElement : renderedElement;
  if (!root.length || root.find(".tsru-open-toughness").length) return;
  const header = root.find(".window-header").first();
  if (!header.length) return;
  const button = $(`<button type="button" class="header-control icon tsru-open-toughness" data-tooltip="Configure Toughness" aria-label="Configure Toughness"><i class="fas fa-shield-halved"></i></button>`);
  const controls = header.find(".window-controls").first();
  if (controls.length) controls.prepend(button);
  else header.find("button.close, [data-action='close']").first().before(button);
  button.on("click.tsru", event => { event.preventDefault(); event.stopPropagation(); openToughnessConfig(actor); });
}

function addActorHeaderButton(app, buttons) {
  if (!game.user.isGM) return;
  if (app.actor?.type === "npc") {
    buttons.unshift({label: "Toughness", class: "tsru-open-toughness", icon: "fas fa-shield-halved", onclick: () => openToughnessConfig(app.actor)});
    return;
  }
  if (app.actor?.type !== "character") return;
  buttons.unshift({
    label: "Ultimate",
    class: "tsru-open-config",
    icon: "fas fa-burst",
    onclick: () => {
      const tabLink = app.element.find?.('[data-tab="tsru-ultimate"]');
      if (tabLink?.length) tabLink.trigger("click");
      else ui.notifications.warn("Open the full character sheet to access the Ultimate tab.");
    }
  });
}

function addHudTool(controls) {
  const token = controls.find?.(control => control.name === "token") ?? controls.tokens ?? controls.token;
  if (!token) return;
  const tool = {
    name: "tsru-orbs",
    title: "Show My Ultimate Orbs",
    icon: "fas fa-burst",
    order: 90,
    button: true,
    visible: true,
    onChange: async () => {
      const actors = game.actors.filter(canObserveActor);
      if (!actors.length) {
        ui.notifications.warn("No enabled Ultimate characters are available to you. A GM must enable a character in its Ultimate tab first.");
        return;
      }
      let shown = 0;
      for (const actor of actors) if (await showOrb(actor, {notify: false})) shown++;
      if (shown) ui.notifications.info(`Showing ${shown} Ultimate orb${shown === 1 ? "" : "s"}.`);
      else ui.notifications.error("No Ultimate orbs could be displayed. Check the browser console for details.");
    }
  };
  if (Array.isArray(token.tools)) token.tools.push(tool);
  else token.tools.tsruOrbs = tool;
  const skillTool = {
    name: "tsru-skills",
    title: "Show Skill Points & Skills",
    icon: "fas fa-hand-sparkles",
    order: 91,
    button: true,
    visible: true,
    onClick: showSkillUI,
    onChange: showSkillUI
  };
  if (Array.isArray(token.tools)) token.tools.push(skillTool);
  else token.tools.tsruSkills = skillTool;
  const ahaTool = {
    name: "tsru-aha-instant",
    title: "Aha Instant",
    icon: "fas fa-masks-theater",
    order: 92,
    button: true,
    visible: game.user.isGM,
    onClick: openAhaInstantControls,
    onChange: openAhaInstantControls
  };
  if (Array.isArray(token.tools)) token.tools.push(ahaTool);
  else token.tools.tsruAhaInstant = ahaTool;
  const gmTool = {
    name: "tsru-gm-panel",
    title: "Star Rail GM Panel",
    icon: "fas fa-sliders",
    order: 93,
    button: true,
    visible: game.user.isGM,
    onClick: openStarRailGMPanel,
    onChange: openStarRailGMPanel
  };
  if (Array.isArray(token.tools)) token.tools.push(gmTool);
  else token.tools.tsruGmPanel = gmTool;
}

function registerApi() {
  game.modules.get(MODULE_ID).api = {
    getConfig,
    setEnergy,
    addEnergy: async (actor, amount, reason = "api") => {
      if (!game.user.isGM) throw new Error("Only a GM can change Energy through the API.");
      return addEnergy(actor, amount, reason);
    },
    requestUltimate,
    requestSkill,
    getSkillPoints: currentSkillPoints,
    setSkillPoints,
    getTalentPoints: currentTalentPoints,
    setTalentPoints,
    resetCanvasToughness,
    setTemporaryToughnessWeaknesses,
    addTemporaryToughnessWeakness,
    resetTemporaryToughnessWeaknesses,
    insertActionAdvanceTurn,
    openGMPanel: openStarRailGMPanel,
    triggerSpecialAha,
    showSkillUI,
    getPunchline: currentPunchline,
    setPunchline,
    addPunchline,
    spendPunchline,
    showSplash,
    refreshOrbs: refreshAllOrbs,
    showOrb,
    showAhaButton,
    triggerAhaInstant,
    openElementManager: () => new ElementManager().render(true),
    openPathManager: () => new PathManager().render(true)
  };
}

Hooks.once("init", () => {
  registerSettings();
  Handlebars.registerHelper("add", (a, b) => Number(a) + Number(b));
  console.log(`${MODULE_ID} | Initialized`);
});

Hooks.once("ready", () => {
  game.socket.on(SOCKET, onSocket);
  registerApi();
  refreshAllOrbs();
  refreshAhaButton();
  refreshPunchlineHUD();
  refreshSkillUI();
  registerAhaToolbarFallback();
  if (game.modules.get("midi-qol")?.active) Hooks.on("midi-qol.RollComplete", processMidiWorkflow);
  if (game.modules.get("midi-qol")?.active) Hooks.on("midi-qol.damageRollComplete", processMidiWorkflow);
  Hooks.on("dnd5e.rollDamageV2", processDnd5eDamageRolls);
  Hooks.on("dnd5e.applyDamage", processAppliedDamage);
});

Hooks.on("renderActorSheet", injectUltimateTab);
Hooks.on("renderCharacterActorSheet", injectUltimateTab);
Hooks.on("renderActorSheet", injectEidolonTab);
Hooks.on("renderCharacterActorSheet", injectEidolonTab);
Hooks.on("renderActorSheet", observeCharacterSheetTabs);
Hooks.on("renderCharacterActorSheet", observeCharacterSheetTabs);
Hooks.on("renderActorSheet", injectToughnessHeaderButton);
Hooks.on("renderApplicationV2", (app, html) => {
  const actor = app.actor ?? app.document;
  if (actor?.documentName === "Actor" && actor.type === "character") {
    injectUltimateTab(app, html);
    injectEidolonTab(app, html);
    injectEnergyAbility(app, html);
    injectCharacterBadges(app, html);
    observeCharacterSheetTabs(app);
    requestAnimationFrame(() => {
      const root = app.element?.jquery ? app.element : $(app.element);
      injectUltimateTab(app, root);
      injectEidolonTab(app, root);
      injectEnergyAbility(app, root);
      injectCharacterBadges(app, root);
    });
  }
  if (actor?.documentName === "Actor" && actor.type === "npc") injectToughnessHeaderButton(app, html);
});
Hooks.on("renderActorSheet", injectEnergyAbility);
Hooks.on("renderCharacterActorSheet", injectEnergyAbility);
Hooks.on("renderActorSheet", injectCharacterBadges);
Hooks.on("renderCharacterActorSheet", injectCharacterBadges);
Hooks.on("getActorSheetHeaderButtons", addActorHeaderButton);
Hooks.on("getSceneControlButtons", addHudTool);
Hooks.on("createChatMessage", processCoreAttackMessage);

function renderManualDamageControl(controlElement, message, suppliedApplications = null, suppliedDone = null) {
  if (!controlElement || !message) return;
  const control = $(controlElement);
  const amount = manualChatDamageAmount(message);
  const applications = Array.isArray(suppliedApplications) ? suppliedApplications : manualDamageApplications(message);
  const done = suppliedDone ?? Boolean(message.getFlag(MODULE_ID, "manualDamageDone"));
  control.empty();
  for (const application of applications) {
    control.append(`<button type="button" class="tsru-chat-damage-applied" disabled><i class="fas fa-check"></i><span>Applied ${application.total ?? amount} to ${escapeHTML(application.targetName ?? "target")}</span></button>`);
  }
  if (done) {
    control.append('<div class="tsru-chat-damage-finished"><i class="fas fa-flag-checkered"></i><span>Done applying damage</span></div>');
    return;
  }
  const applyButton = $(`<button type="button" class="tsru-chat-damage-apply"><i class="fas fa-crosshairs"></i><span>Apply ${amount} as damage to targeted creature</span></button>`);
  const doneButton = $('<button type="button" class="tsru-chat-damage-done"><i class="fas fa-flag-checkered"></i><span>Done applying damage</span></button>');
  control.append(applyButton, doneButton);
  applyButton.on("click.tsru", async event => {
    const button = event.currentTarget;
    const targets = [...(game.user.targets ?? [])];
    if (targets.length !== 1) return ui.notifications.warn("Target exactly one creature before applying this roll as damage.");
    const target = targets[0];
    const targetUuid = target.document?.uuid ?? target.actor?.uuid;
    if (!targetUuid) return ui.notifications.error("The targeted creature could not be resolved.");
    const applicationId = foundry.utils.randomID();
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Applying damage…</span>';
    if (isAuthority()) {
      const result = await applyChatRollAsDamage(message, target.actor, game.user, applicationId);
      const notify = result.ok ? ui.notifications.info : ui.notifications.error;
      notify.call(ui.notifications, result.message);
      renderManualDamageControl(controlElement, message, result.applications, result.done);
    } else {
      game.socket.emit(SOCKET, {type: "applyManualChatDamage", sourceUserId: game.user.id, messageId: message.id, targetUuid, applicationId});
      window.setTimeout(() => {
        if (button.isConnected && button.disabled) {
          button.disabled = false;
          button.innerHTML = `<i class="fas fa-crosshairs"></i><span>Apply ${amount} as damage to targeted creature</span>`;
        }
      }, 5000);
    }
  });
  doneButton.on("click.tsru", async event => {
    event.currentTarget.disabled = true;
    if (isAuthority()) {
      const result = await finishManualChatDamage(message, game.user);
      const notify = result.ok ? ui.notifications.info : ui.notifications.error;
      notify.call(ui.notifications, result.message);
      renderManualDamageControl(controlElement, message, result.applications, result.done);
    } else game.socket.emit(SOCKET, {type: "finishManualChatDamage", sourceUserId: game.user.id, messageId: message.id});
  });
}

Hooks.on("renderChatMessage", (message, html) => {
  const root = html?.jquery ? html : $(html);
  const roller = actorFromChatMessage(message);
  if (isManualChatDamageEligible(message) && (game.user.isGM || roller?.isOwner)) {
    const control = $(`<div class="tsru-chat-damage-control" data-tsru-chat-damage-control="${escapeHTML(message.id)}"></div>`);
    const destination = root.find(".message-content").last();
    (destination.length ? destination : root).append(control);
    renderManualDamageControl(control[0], message);
  }
  root.find("[data-tsru-complete-ultimate]").each((_index, element) => {
    const actor = game.actors.get(element.dataset.tsruCompleteUltimate);
    if (!game.user.isGM && !actor?.isOwner) element.remove();
  });
  root.find("[data-tsru-complete-ultimate]").on("click.tsru", async event => {
    const button = event.currentTarget;
    const actorId = button.dataset.tsruCompleteUltimate;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Completing Ultimate…';
    if (isAuthority()) await completeUltimate(actorId);
    else game.socket.emit(SOCKET, {type: "ultimateComplete", actorId, userId: game.user.id});
  });
  root.find("[data-tsru-complete-elation]").on("click.tsru", async event => {
    const button = event.currentTarget;
    const combatantId = button.dataset.tsruCompleteElation;
    button.disabled = true;
    if (isAuthority()) await completeElationAction(combatantId, game.user.id);
    else game.socket.emit(SOCKET, {type: "elationActionComplete", combatantId, userId: game.user.id});
  });
});
Hooks.on("tsruEnergyChanged", (actor, before, after, reason) => dispatchTalentEvent("energyChanged", {sourceActor: actor, before, after, amount: after - before, reason}));
Hooks.on("tsruPunchlineChanged", value => { state.gmPanel?.refreshLiveValues(); dispatchTalentEvent("punchlineChanged", {value}); });
Hooks.on("tsruSkillPointsChanged", value => { state.gmPanel?.refreshLiveValues(); dispatchTalentEvent("skillPointsChanged", {value}); });
Hooks.on("tsruTalentPointsChanged", (actor, before, after) => { refreshTalentCounter(actor); dispatchTalentEvent("talentPointsChanged", {sourceActor: actor, before, after, amount: after - before}); });
Hooks.on("updateActor", (actor, changes) => {
  refreshOrb(actor);
  refreshSkillUI();
  refreshTalentCounter(actor);
  refreshToughnessBars();
  state.gmPanel?.refreshLiveValues();
  if (foundry.utils.hasProperty(changes, `flags.${MODULE_ID}.eidolons`)) {
    for (const app of Object.values(ui.windows ?? {})) if ((app.actor ?? app.document)?.id === actor.id) app.render(false);
  }
  if (actor.type === "character" && Number(getConfig(actor).current) >= Number(getConfig(actor).max) && state.ultimateLocks.has(actor.id)) {
    reconcileUltimateLock(actor.id);
  }
});
Hooks.on("updateToken", () => { refreshToughnessBars(); state.gmPanel?.render(false); });
Hooks.on("targetToken", user => { if (user.id === game.user.id) state.gmPanel?.refreshTargetHighlights(); });
Hooks.on("deleteActor", actor => { state.orbs.get(actor.id)?.destroy(); state.skillButtons.get(actor.id)?.destroy(); });
Hooks.on("updateUser", user => { if (user.id === game.user.id) { refreshAllOrbs(); refreshSkillUI(); } });
Hooks.on("updateSetting", setting => {
  if (setting?.key?.startsWith(`${MODULE_ID}.skillPoint`)) refreshSkillUI();
  if (setting?.key === `${MODULE_ID}.ahaConfig` || setting?.key === `${MODULE_ID}.punchline`) {
    if (!getAhaConfig().elationEnabled) document.querySelectorAll(".tsru-aha-overlay").forEach(element => element.remove());
    refreshAhaButton();
    refreshPunchlineHUD();
  }
});
Hooks.on("canvasReady", () => { refreshAllOrbs(); refreshSkillUI(); refreshPunchlineHUD(); refreshToughnessBars(); });
Hooks.on("canvasReady", refreshAhaButton);

Hooks.on("deleteCombat", async combat => {
  await dispatchTalentEvent("combatEnd", {combat}, combat.id);
  state.lastTalentTurns.delete(combat.id);
  state.lastCombatTurns.delete(combat.id);
  if (state.specialAha?.combatId === combat.id) state.specialAha = null;
  state.actionAdvances.delete(combat.id);
  state.ultimateLocks.clear();
  for (const pending of state.splashBroadcasts.values()) if (pending?.timer) window.clearTimeout(pending.timer);
  state.splashBroadcasts.clear();
  state.receivedSplashIds.clear();
  const ultimateQueue = state.ultimateQueues.get(combat.id);
  if (ultimateQueue?.startTimer) window.clearTimeout(ultimateQueue.startTimer);
  state.ultimateQueues.delete(combat.id);
  for (const pending of state.pendingUltimates.values()) if (pending?.timer) window.clearTimeout(pending.timer);
  state.pendingUltimates.clear();
  state.skillLocks.clear();
  for (const pending of state.pendingSkills.values()) if (pending?.timer) window.clearTimeout(pending.timer);
  state.pendingSkills.clear();
  for (const pending of state.pendingElationActions.values()) if (pending?.timer) window.clearTimeout(pending.timer);
  state.pendingElationActions.clear();
  state.activeElationActions.clear();
  state.lastElationSequenceKey = "";
  for (const combatant of combat.combatants ?? []) {
    if (combatant.getFlag(MODULE_ID, "temporaryUltimate")) state.ultimateLocks.delete(combatant.actorId);
  }
  refreshAllOrbs();
});

Hooks.on("updateCombat", async combat => {
  refreshToughnessBars();
  state.gmPanel?.render(false);
  if (!isAuthority()) return;
  await clearExpiredEnergyLocks(combat);
  const previousTurn = state.lastCombatTurns.get(combat.id);
  const currentTurn = combatTurnSnapshot(combat);
  state.lastCombatTurns.set(combat.id, currentTurn);
  if (state.suppressCombatHook) return;
  if (previousTurn?.id && previousTurn.id !== currentTurn?.id) {
    if (previousTurn.ultimate && previousTurn.actorId) {
      await completeUltimate(previousTurn.actorId);
      await removeOrphanedTemporaryTurns(combat);
      state.lastCombatTurns.set(combat.id, combatTurnSnapshot(combat));
      return;
    }
    if (previousTurn.elation) {
      await completeElationAction(previousTurn.id);
      await removeOrphanedTemporaryTurns(combat);
      state.lastCombatTurns.set(combat.id, combatTurnSnapshot(combat));
      return;
    }
  }
  await removeOrphanedTemporaryTurns(combat);
  const ultimateQueue = state.ultimateQueues.get(combat.id);
  if (ultimateQueue?.waitTurnId && combat.combatant?.id !== ultimateQueue.waitTurnId) {
    ultimateQueue.resumeCombatantId = combat.combatant?.id ?? null;
    ultimateQueue.resumeRound = combat.round;
    ultimateQueue.waitTurnId = null;
    await processUltimateQueue(combat.id);
    return;
  }
  const advance = state.actionAdvances.get(combat.id);
  if (advance && combat.combatant?.id !== advance.combatantId) {
    await finishActionAdvance(combat, advance);
    state.gmPanel?.render(false);
    return;
  }
  if (!combat.combatants.find(isAhaCombatant)) await maybeEnsureAhaCombatant(combat);
  const current = combat.combatant;
  if (combat.started && current?.actor?.type === "npc") {
    const toughness = getToughness(current.actor);
    if (toughness.enabled && toughness.current === 0) {
      await current.actor.update({[`flags.${MODULE_ID}.toughness.current`]: toughness.max});
      ui.notifications.info(`${current.actor.name}'s Toughness recovered to full.`);
      refreshToughnessBars();
    }
  }
  if (combat.started && current) {
    const turnKey = `${combat.id}:${combat.round}:${current.id}`;
    const previous = state.lastTalentTurns.get(combat.id);
    if (previous?.key !== turnKey) {
      if (previous) await dispatchTalentEvent("turnEnd", {combat, combatant: combat.combatants.get(previous.combatantId) ?? null, sourceActor: game.actors.get(previous.actorId) ?? null}, previous.key);
      state.lastTalentTurns.set(combat.id, {key: turnKey, combatantId: current.id, actorId: current.actor?.id ?? null});
      await dispatchTalentEvent("turnStart", {combat, combatant: current, sourceActor: current.actor ?? null}, turnKey);
    }
  }
  if (combat.started && isAhaCombatant(current)) {
    const turnKey = `${combat.id}:${combat.round}:${current.id}`;
    if (state.lastAhaTurnKey !== turnKey) {
      state.lastAhaTurnKey = turnKey;
      triggerAhaInstant();
    }
    await createElationActionTurns(combat);
    return;
  }
  if (isElationActionCombatant(current)) {
    await executeElationAction(current);
    return;
  }
  const temporary = current;
  if (!temporary?.getFlag(MODULE_ID, "temporaryUltimate")) return;
  const actor = temporary.actor;
  if (!actor || state.ultimateLocks.has(actor.id)) return;
  await removeUltimateTurn(temporary);
});

Hooks.on("updateCombatant", async (combatant, changed) => {
  if (!isAuthority() || isAhaCombatant(combatant) || isElationActionCombatant(combatant) || !("initiative" in changed)) return;
  await maybeEnsureAhaCombatant(combatant.parent);
});

Hooks.on("createCombatant", combatant => {
  state.gmPanel?.render(false);
  window.setTimeout(refreshToughnessBars, 150);
  if (isAhaCombatant(combatant) || isElationActionCombatant(combatant)) return;
  window.setTimeout(() => maybeEnsureAhaCombatant(combatant.parent), 100);
});

Hooks.on("combatStart", async combat => {
  state.lastCombatTurns.set(combat.id, combatTurnSnapshot(combat));
  if (isAuthority()) {
    await setSkillPoints(getSkillPointConfig().starting);
    for (const actor of game.actors.filter(entry => entry.type === "character" && currentTalentPoints(entry) !== 0)) {
      await actor.update({[`flags.${MODULE_ID}.ultimate.talentPointsCurrent`]: 0});
    }
    await dispatchTalentEvent("combatStart", {combat}, combat.id);
  }
  await maybeEnsureAhaCombatant(combat, {force: true});
});
Hooks.on("deleteCombatant", combatant => {
  const tracked = state.lastCombatTurns.get(combatant.parent?.id);
  if (tracked?.id === combatant.id) state.lastCombatTurns.set(combatant.parent.id, combatTurnSnapshot(combatant.parent));
  state.gmPanel?.render(false);
  const advance = state.actionAdvances.get(combatant.parent?.id);
  if (advance?.combatantId === combatant.id) state.actionAdvances.delete(combatant.parent.id);
  if (isElationActionCombatant(combatant)) {
    const pending = state.pendingElationActions.get(combatant.id);
    if (pending?.timer) window.clearTimeout(pending.timer);
    state.pendingElationActions.delete(combatant.id);
    state.activeElationActions.delete(combatant.id);
  }
  window.setTimeout(refreshToughnessBars, 100);
});
