Warning: truncated output (original token count: 90959)
Total output lines: 6579

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
  partyGMOverride: false,
  receivesRewards: false,
  lockEnergyAfterUltimate: true,
  energyLockCombatId: "",
  energyLockRound: null,
  breakCharacter: false,
  superBreakCharacter: false,
  breakEffectScore: 10,
  breakDamageDice: 1,
  breakDamageDie: 6,
  skillEnabled: true,
  skillScript: "",
  skillText: "",
  skillPointCost: 1,
  skillButtonImage: "",
  techniqueEnabled: false,
  techniqueText: "",
  techniqueButtonImage: "",
  talentPointsCurrent: 0,
  talentPointsMax: 0,
  talentPointsOvercapMax: 0,
  talentCombatId: "",
  talentScript: "",
  talentText: "",
  talentIcon: "",
  trialCharacter: false,
  combatHudPortrait: "",
  combatHudPortraitX: 50,
  combatHudPortraitY: 50,
  combatHudPortraitScale: 100,
  combatHudPortraitFlip: false,
  punchlineGain: 1,
  elationActionScript: "",
  elationActionText: "",
  ultimateScript: "",
  ultimateText: "",
  splashImage: "",
  splashDuration: 1,
  splashX: 50,
  splashY: 50,
  splashScale: 100,
  ultimateName: "Ultimate",
  ultimateSubtitle: "",
  titleX: 17,
  titleY: 78,
  titleSize: 48,
  titleAlign: "left",
  fontFile: "",
  subtitleFontFile: "",
  ultimateButtonImage: "",
  ultimateButtonAdjustEnabled: false,
  ultimateButtonX: 50,
  ultimateButtonY: 50,
  ultimateButtonScale: 100,
  orbImage: "",
  chargeColor: "#596171",
  readyColor: "#20e6ff",
  showPercent: true,
  showHudPercent: true,
  elementId: "",
  pathId: ""
});

const state = {
  orbs: new Map(),
  skillButtons: new Map(),
  talentButtons: new Map(),
  skillMeter: null,
  skillLocks: new Set(),
  pendingSkills: new Map(),
  skillSpendLock: false,
  talentPointHud: null,
  talentTurnQueues: new Map(),
  talentTurnQueueLocks: new Set(),
  techniqueHud: null,
  techniqueSpendLock: false,
  ahaButton: null,
  ahaCombatantPromises: new Map(),
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
  lastDamageDisplay: null,
  activeTalents: new Set(),
  talentEvents: new Set(),
  lastTalentTurns: new Map(),
  lastCombatTurns: new Map(),
  specialAha: null,
  gmPanel: null,
  actionAdvances: new Map(),
  sheetObservers: new WeakMap(),
  suppressCombatHook: false,
  lastAhaTurnKey: "",
  ahaVideoCache: {source: "", objectUrl: "", promise: null},
  partyCombatHud: null
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

const DEFAULT_TECHNIQUE_POINT_CONFIG = Object.freeze({
  maximum: 5,
  starting: 3
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

const DEFAULT_TALENT_POINT_CONFIG = Object.freeze({
  numberFontFile: ""
});

const DEFAULT_COMBAT_HUD_DESIGN = Object.freeze({
  memberWidth: 184, memberHeight: 150,
  portraitLeft: 0, portraitRight: 25, portraitTop: 0, portraitBottom: 17,
  hpLeft: 22, hpRight: 0, hpBottom: 20, hpHeight: 9,
  orbRight: 7, orbBottom: 34, orbSize: 54,
  talentLeft: 5, talentBottom: 20, talentSize: 32,
  nameLeft: 8, nameBottom: 0, nameWidth: 128
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

function eidolonDataDefaults() {
  return {currencyUuid: "", slots: defaultEidolonSlots()};
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
  config.skillPointCost = Math.max(0, Math.floor(Number(config.skillPointCost) || 0));
  config.talentPointsMax = Math.max(0, Math.floor(Number(config.talentPointsMax) || 0));
  config.talentPointsOvercapMax = Math.max(config.talentPointsMax, Math.floor(Number(config.talentPointsOvercapMax) || config.talentPointsMax));
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

function toughnessWeaknessMode(target) {
  const {actor, tokenDocument} = toughnessTargetParts(target);
  return String(tokenDocument?.getFlag(MODULE_ID, "weaknessMode") ?? actor?.getFlag(MODULE_ID, "weaknessMode") ?? "");
}

function effectiveToughnessWeaknesses(target) {
  const mode = toughnessWeaknessMode(target);
  if (mode === "none") return [];
  if (mode === "all") return getElements().map(element => element.id);
  const {actor} = toughnessTargetParts(target);
  const config = getToughness(actor);
  return [...new Set([...config.weaknesses, ...temporaryToughnessWeaknesses(target)])];
}

async function setToughnessWeaknessMode(target, mode = "") {
  if (!game.user.isGM || !["", "all", "none"].includes(mode)) return false;
  const {actor, tokenDocument} = toughnessTargetParts(target);
  if (!actor || actor.type !== "npc") return false;
  if (tokenDocument) await tokenDocument.setFlag(MODULE_ID, "weaknessMode", mode);
  else await actor.setFlag(MODULE_ID, "weaknessMode", mode);
  refreshToughnessBars();
  return true;
}

async function setTemporaryToughnessWeaknesses(target, elementIds) {
  const {actor, tokenDocument} = toughnessTargetParts(target);
  if (!game.user.isGM || !actor || actor.type !== "npc") return false;
  const config = getToughness(actor);
  const valid = new Set(getElements().map(element => element.id));
  const temporaryWeaknesses = [...new Set(elementIds ?? [])].filter(id => valid.has(id) && !config.weaknesses.includes(id));
  if (tokenDocument) await tokenDocument.setFlag(MODULE_ID, "temporaryWeaknesses", temporaryWeaknesses);
  else await actor.update({[`flags.${MODULE_ID}.toughness.temporaryWeaknesses`]: temporaryWeaknesses});
  await setToughnessWeaknessMode(target, "");
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
    if (!temporaryToughnessWeaknesses(entry).length && !toughnessWeaknessMode(entry)) continue;
    if (tokenDocument) await tokenDocument.setFlag(MODULE_ID, "temporaryWeaknesses", []);
    else await actor.update({[`flags.${MODULE_ID}.toughness.temporaryWeaknesses`]: []});
    if (tokenDocument) await tokenDocument.unsetFlag(MODULE_ID, "weaknessMode");
    else await actor.unsetFlag(MODULE_ID, "weaknessMode");
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

async function setEnergy(actor, value, {overrideLock = false} = {}) {
  if (!actor) return;
  const config = getConfig(actor);
  const current = clamp(value, 0, config.max);
  if (current > config.current && isEnergyLocked(actor) && !overrideLock) return config.current;
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

function talentCombatForActor(actor) {
  const combat = game.combat;
  if (!combat?.started || actor?.type !== "character") return null;
  // Use the initiative roster itself as the source of truth. This also supports
  // hidden combatants and synthetic/unlinked token actors.
  return Array.from(combat.combatants ?? []).some(combatant =>
    combatant.actorId === actor.id || combatant.actor?.id === actor.id
  ) ? combat : null;
}

function currentTalentPoints(actor) {
  const combat = talentCombatForActor(actor);
  if (!combat) return 0;
  const config = getConfig(actor);
  if (config.talentCombatId !== combat.id) return 0;
  const trigger = Math.max(0, Math.floor(Number(config.talentPointsMax) || 0));
  const overcap = Math.max(trigger, Math.floor(Number(config.talentPointsOvercapMax) || trigger));
  return clamp(Math.floor(Number(config.talentPointsCurrent) || 0), 0, overcap);
}

function talentPointLimits(actor) {
  const config = getConfig(actor);
  const trigger = Math.max(0, Math.floor(Number(config.talentPointsMax) || 0));
  return {trigger, overcap: Math.max(trigger, Math.floor(Number(config.talentPointsOvercapMax) || trigger))};
}

function isTalentTurnCombatant(combatant) {
  return Boolean(combatant?.getFlag(MODULE_ID, "talentTurnCombatant"));
}

function queueTalentTurn(actor, combat = talentCombatForActor(actor)) {
  if (!isAuthority() || !combat?.started || !actor || talentPointLimits(actor).trigger < 1) return false;
  if (combat.combatants.some(entry => isTalentTurnCombatant(entry) && entry.actorId === actor.id)) return false;
  const queue = state.talentTurnQueues.get(combat.id) ?? [];
  if (queue.includes(actor.id)) return false;
  queue.push(actor.id);
  state.talentTurnQueues.set(combat.id, queue);
  return true;
}

function queueReadyTalentTurns(combat) {
  if (!isAuthority() || !combat?.started) return;
  const seen = new Set();
  for (const combatant of combat.combatants ?? []) {
    if (isTalentTurnCombatant(combatant)) continue;
    const actor = game.actors.get(combatant.actorId) ?? combatant.actor;
    if (!actor || actor.type !== "character" || seen.has(actor.id)) continue;
    seen.add(actor.id);
    const {trigger} = talentPointLimits(actor);
    if (trigger > 0 && currentTalentPoints(actor) >= trigger) queueTalentTurn(actor, combat);
  }
}

async function setTalentPoints(actor, value) {
  const combat = talentCombatForActor(actor);
  if (!isAuthority() || !combat) return currentTalentPoints(actor);
  const config = getConfig(actor);
  const {trigger, overcap} = talentPointLimits(actor);
  const next = clamp(Math.floor(Number(value) || 0), 0, overcap);
  const before = currentTalentPoints(actor);
  if (next !== before || config.talentCombatId !== combat.id) await actor.update({[`flags.${MODULE_ID}.ultimate.talentPointsCurrent`]: next, [`flags.${MODULE_ID}.ultimate.talentCombatId`]: combat.id});
  if (next !== before) Hooks.callAll("tsruTalentPointsChanged", actor, before, next);
  if (trigger > 0 && next >= trigger && queueTalentTurn(actor, combat)) {
    window.setTimeout(() => processTalentTurnQueue(combat).catch(error => {
      console.error(`${MODULE_ID} | Could not process ${actor.name}'s ready Talent turn`, error);
      ui.notifications.error(`Could not insert ${actor.name}'s Talent turn: ${error.message}`);
    }), 0);
  }
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
  if (!script || !talentCombatForActor(actor) || state.activeTalents.has(actor.id)) return;
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
  // Talents are descriptive text actions now. Legacy scripts are retained in stored
  // data for rollback compatibility, but are intentionally never executed.
  return;
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
    if (!combatHasInitiative() || !config.elationEnabled || (!punchlineOverrideEnabled() && !combatHasLivingElation()) || !layout.visible) return this.destroy();
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
  if (!combatHasInitiative() || !getAhaConfig().elationEnabled || (!punchlineOverrideEnabled() && !combatHasLivingElation()) || !punchlineLayout().visible) { state.punchlineMeter?.destroy(); return; }
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

async function preloadAhaVideo(video = getAhaConfig().video) {
  const source = String(video || "");
  const cache = state.ahaVideoCache;
  if (!source) {
    if (cache.objectUrl) URL.revokeObjectURL(cache.objectUrl);
    state.ahaVideoCache = {source: "", objectUrl: "", promise: null};
    return "";
  }
  if (cache.source === source && cache.objectUrl) return cache.objectUrl;
  if (cache.source === source && cache.promise) return cache.promise;
  if (cache.objectUrl) URL.revokeObjectURL(cache.objectUrl);
  const pending = fetch(resolveAssetUrl(source), {cache: "force-cache"})
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.blob();
    })
    .then(blob => {
      if (state.ahaVideoCache.source !== source) return source;
      const objectUrl = URL.createObjectURL(blob);
      state.ahaVideoCache = {source, objectUrl, promise: null};
      console.log(`${MODULE_ID} | Preloaded Aha Instant video (${Math.round(blob.size / 1024)} KB)`);
      return objectUrl;
    })
    .catch(error => {
      if (state.ahaVideoCache.source === source) state.ahaVideoCache = {source, objectUrl: "", promise: null};
      console.warn(`${MODULE_ID} | Could not preload Aha Instant video; playback will use the original asset`, error);
      return source;
    });
  state.ahaVideoCache = {source, objectUrl: "", promise: pending};
  return pending;
}

async function playAhaVideo({video}) {
  if (!video) return;
  const playbackSource = await preloadAhaVideo(video);
  document.querySelectorAll(".tsru-aha-overlay").forEach(element => element.remove());
  const overlay = document.createElement("div");
  overlay.className = "tsru-aha-overlay";
  overlay.innerHTML = `<video src="${escapeHTML(playbackSource || video)}" autoplay playsinline preload="auto"></video>`;
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

function isLivingElationCombatant(combatant) {
  if (!combatant || isAhaCombatant(combatant) || isElationActionCombatant(combatant) || isTalentTurnCombatant(combatant)) return false;
  const actor = combatant.actor ?? game.actors.get(combatant.actorId);
  if (actor?.type !== "character" || !getAhaConfig().elationPathId || getConfig(actor).pathId !== getAhaConfig().elationPathId) return false;
  return Number(foundry.utils.getProperty(actor, "system.attributes.hp.value") ?? 0) > 0;
}

function combatHasLivingElation(combat = game.combat) {
  return Boolean(combat?.combatants?.some(isLivingElationCombatant));
}

function punchlineOverrideEnabled() {
  return Boolean(game.settings.get(MODULE_ID, "punchlineOverride"));
}

async function postTalentText(actor) {
  return postAbilityText(actor, "talent", getConfig(actor).talentText);
}

async function beginTalentTurn(combatant) {
  if (!isAuthority() || !isTalentTurnCombatant(combatant) || combatant.getFlag(MODULE_ID, "talentActivated")) return;
  const actor = game.actors.get(combatant.getFlag(MODULE_ID, "talentActorId")) ?? combatant.actor;
  if (!actor) return;
  await postTalentText(actor);
  await combatant.setFlag(MODULE_ID, "talentActivated", true);
}

async function processTalentTurnQueue(combat) {
  if (!isAuthority() || !combat?.started || state.talentTurnQueueLocks.has(combat.id) || combat.combatants.some(isTalentTurnCombatant)) return false;
  state.talentTurnQueueLocks.add(combat.id);
  try {
    queueReadyTalentTurns(combat);
    const queue = state.talentTurnQueues.get(combat.id) ?? [];
    while (queue.length) {
      const actorId = queue[0];
      const actor = game.actors.get(actorId);
      if (!actor || !talentCombatForActor(actor) || currentTalentPoints(actor) < talentPointLimits(actor).trigger) {
        queue.shift();
        state.talentTurnQueues.set(combat.id, queue);
        continue;
      }
      const resume = combat.combatant;
      const currentInit = Number(resume?.initiative ?? 0);
      const next = combat.turns[Number(combat.turn ?? 0) + 1];
      let initiative = next ? (currentInit + Number(next.initiative ?? currentInit - 1)) / 2 : currentInit - 0.001;
      if (!Number.isFinite(initiative)) initiative = currentInit - 0.001;
      let temporary = null;
      try {
        [temporary] = await combat.createEmbeddedDocuments("Combatant", [{
          name:`TALENT - ${actor.name}`,
          actorId:actor.id,
          tokenId:null,
          sceneId:null,
          initiative,
          img:getConfig(actor).talentIcon || actor.img,
          flags:{[MODULE_ID]:{talentTurnCombatant:true,talentActorId:actor.id,resumeCombatantId:resume?.id ?? null,resumeRound:combat.round}}
        }]);
      } catch (error) {
        console.error(`${MODULE_ID} | Could not insert ${actor.name}'s Talent turn`, error);
        ui.notifications.error(`Could not insert ${actor.name}'s Talent turn: ${error.message}`);
        return false;
      }
      if (!temporary) return false;
      queue.shift();
      state.talentTurnQueues.set(combat.id, queue);
      const index = combat.turns.findIndex(entry => entry.id === temporary.id);
      if (index >= 0) {
        state.suppressCombatHook = true;
        try { await combat.update({turn:index}); } finally { state.suppressCombatHook = false; }
      }
      await beginTalentTurn(temporary);
      return true;
    }
    state.talentTurnQueues.delete(combat.id);
    return false;
  } finally {
    state.talentTurnQueueLocks.delete(combat.id);
  }
}

async function finishTalentTurn(combat, temporary) {
  const actor = game.actors.get(temporary?.getFlag(MODULE_ID, "talentActorId")) ?? temporary?.actor;
  const resumeId = temporary?.getFlag(MODULE_ID, "resumeCombatantId");
  const resumeRound = temporary?.getFlag(MODULE_ID, "resumeRound");
  const trigger = actor ? talentPointLimits(actor).trigger : 0;
  if (actor && trigger > 0) await setTalentPoints(actor, currentTalentPoints(actor) - trigger);
  state.suppressCombatHook = true;
  try {
    if (temporary && combat.combatants.has(temporary.id)) await combat.deleteEmbeddedDocuments("Combatant", [temporary.id]);
    const resumeIndex = combat.turns.findIndex(entry => entry.id === resumeId);
    if (resumeIndex >= 0) await combat.update({turn:resumeIndex,round:resumeRound ?? combat.round});
  } finally { state.suppressCombatHook = false; }
  if (actor && trigger > 0 && currentTalentPoints(actor) >= trigger) queueTalentTurn(actor, combat);
  await processTalentTurnQueue(combat);
}

function combatTurnSnapshot(combat) {
  const combatant = combat?.combatant;
  return combatant ? {
    id: combatant.id,
    actorId: combatant.actorId ?? combatant.actor?.id ?? null,
    round: combat.round,
    ultimate: Boolean(combatant.getFlag(MODULE_ID, "temporaryUltimate")),
    elation: isElationActionCombatant(combatant),
    talent: isTalentTurnCombatant(combatant),
    actionAdvance: Boolean(combatant.getFlag(MODULE_ID, "actionAdvance"))
  } : null;
}

async function cleanupDepartedTemporaryTurn(combat, previousTurn) {
  if (!isAuthority() || !combat || !previousTurn?.id) return false;
  const temporary = combat.combatants.get(previousTurn.id);
  const kind = previousTurn.talent || isTalentTurnCombatant(temporary) ? "talent"
    : previousTurn.actionAdvance || temporary?.getFlag(MODULE_ID, "actionAdvance") ? "actionAdvance"
    : previousTurn.elation || isElationActionCombatant(temporary) ? "elation"
    : previousTurn.ultimate || temporary?.getFlag(MODULE_ID, "temporaryUltimate") ? "ultimate"
    : "";
  if (!kind) return false;

  try {
    if (kind === "talent") {
      await finishTalentTurn(combat, temporary);
    } else if (kind === "actionAdvance") {
      const tracked = state.actionAdvances.get(combat.id);
      if (tracked?.combatantId === previousTurn.id) await finishActionAdvance(combat, tracked);
    } else if (kind === "elation") {
      await completeElationAction(previousTurn.id);
    } else if (kind === "ultimate" && previousTurn.actorId) {
      await completeUltimate(previousTurn.actorId);
    }
  } catch (error) {
    console.error(`${MODULE_ID} | ${kind} departure cleanup failed; forcing temporary turn removal`, error);
  } finally {
    if (combat.combatants.has(previousTurn.id)) {
      state.suppressCombatHook = true;
      try { await combat.deleteEmbeddedDocuments("Combatant", [previousTurn.id]); }
      finally { state.suppressCombatHook = false; }
    }
    if (kind === "actionAdvance") state.actionAdvances.delete(combat.id);
    if (kind === "elation") {
      const pending = state.pendingElationActions.get(previousTurn.id);
      if (pending?.timer) window.clearTimeout(pending.timer);
      state.pendingElationActions.delete(previousTurn.id);
      state.activeElationActions.delete(previousTurn.id);
    }
  }
  return true;
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

async function ensureAhaCombatantUnlocked(combat) {
  if (!isAuthority() || !combat) return null;
  const config = getAhaConfig();
  const existingAha = combat.combatants.filter(isAhaCombatant);
  const existing = existingAha[0] ?? null;
  if (!config.elationEnabled || !config.initiativeEnabled || !combatHasLivingElation(combat)) {
    if (combat.combatants.some(isElationActionCombatant)) await clearElationActionTurns(combat);
    if (existingAha.length) await combat.deleteEmbeddedDocuments("Combatant", existingAha.map(entry => entry.id));
    return null;
  }
  // Older versions could race several initiative-update hooks and create one
  // Aha combatant per roll. Repair those encounters while retaining one entry.
  if (existingAha.length > 1) {
    await combat.deleteEmbeddedDocuments("Combatant", existingAha.slice(1).map(entry => entry.id));
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

async function ensureAhaCombatant(combat) {
  if (!isAuthority() || !combat) return null;
  const pending = state.ahaCombatantPromises.get(combat.id);
  if (pending) return pending;
  const task = ensureAhaCombatantUnlocked(combat);
  state.ahaCombatantPromises.set(combat.id, task);
  try { return await task; }
  finally {
    if (state.ahaCombatantPromises.get(combat.id) === task) state.ahaCombatantPromises.delete(combat.id);
  }
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


function getTechniquePointConfig() {
  const stored = game.settings.get(MODULE_ID, "techniquePointConfig") ?? {};
  const config = foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_TECHNIQUE_POINT_CONFIG), stored, {inplace: false});
  config.maximum = Math.max(1, Math.floor(Number(config.maximum) || DEFAULT_TECHNIQUE_POINT_CONFIG.maximum));
  config.starting = clamp(Math.floor(Number(config.starting)), 0, config.maximum);
  return config;
}

function currentTechniquePoints() {
  return clamp(Math.floor(Number(game.settings.get(MODULE_ID, "techniquePoints"))), 0, getTechniquePointConfig().maximum);
}

async function setTechniquePoints(value, {broadcast = true} = {}) {
  if (!isAuthority()) return currentTechniquePoints();
  const next = clamp(Math.floor(Number(value)), 0, getTechniquePointConfig().maximum);
  await game.settings.set(MODULE_ID, "techniquePoints", next);
  if (broadcast) game.socket.emit(SOCKET, {type: "techniquePointsChanged", value: next, sourceUserId: game.user.id});
  refreshResourceHuds();
  Hooks.callAll("tsruTechniquePointsChanged", next);
  return next;
}

function combatHasInitiative() {
  return Boolean(game.combat?.started);
}

function visibleTalentActors() {
  if (!combatHasInitiative()) return [];
  return game.actors.filter(actor => actor.type === "character" && talentCombatForActor(actor) && (game.user.isGM || actor.isOwner) && Number(getConfig(actor).talentPointsMax) > 0);
}

function visibleTechniqueActors() {
  if (combatHasInitiative()) return [];
  return game.actors.filter(actor => actor.type === "character" && getConfig(actor).techniqueEnabled && (game.user.isGM || actor.isOwner));
}

function resourceHudLayout(key, fallback) {
  return foundry.utils.mergeObject(fallback, game.settings.get(MODULE_ID, key) ?? {}, {inplace: false});
}

async function saveResourceHudLayout(key, changes, fallback) {
  await game.settings.set(MODULE_ID, key, foundry.utils.mergeObject(resourceHudLayout(key, fallback), changes, {inplace: false}));
}

function activateResourceHudDrag(element, handle, settingKey, fallback) {
  let drag = null;
  handle.addEventListener("pointerdown", event => {
    event.preventDefault();
    const rect = element.getBoundingClientRect();
    drag = {dx: event.clientX - rect.left, dy: event.clientY - rect.top};
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener("pointermove", event => {
    if (!drag) return;
    element.style.left = `${clamp(event.clientX - drag.dx, 0, window.innerWidth - 60)}px`;
    element.style.top = `${clamp(event.clientY - drag.dy, 0, window.innerHeight - 40)}px`;
  });
  handle.addEventListener("pointerup", async event => {
    if (!drag) return;
    drag = null;
    handle.releasePointerCapture(event.pointerId);
    const rect = element.getBoundingClientRect();
    await saveResourceHudLayout(settingKey, {x: Math.round(rect.left), y: Math.round(rect.top)}, fallback);
  });
}

function requestTalentAdjustment(actor, delta) {
  if (!actor || !talentCombatForActor(actor)) return ui.notifications.warn("Talent Points can only be adjusted for a token in the active combat.");
  if (!game.user.isGM && !actor.isOwner) return ui.notifications.error("You do not own this character.");
  if (isAuthority()) return setTalentPoints(actor, currentTalentPoints(actor) + delta).then(refreshResourceHuds);
  const gm = activeGM();
  if (!gm) return ui.notifications.error("A GM must be connected to adjust Talent Points.");
  game.socket.emit(SOCKET, {type: "changeTalentPoints", actorId: actor.id, delta, sourceUserId: game.user.id});
}

class TalentPointHud {
  constructor() { this.element = null; }
  render() {
    const actors = visibleTalentActors();
    if (!actors.length) return this.destroy();
    const fallback = {x: 24, y: 180, minimized: false};
    const layout = resourceHudLayout("talentHudLayout", fallback);
    if (!this.element) {
      this.element = document.createElement("section");
      this.element.className = "tsru-resource-hud tsru-talent-hud";
      this.element.innerHTML = '<header><span><i class="fas fa-star"></i> Talent Points</span><span class="tsru-resource-header-actions"><i class="fas fa-grip-lines tsru-resource-drag" title="Move Talent Points"></i><button type="button" data-talent-hud-toggle title="Minimize Talent Points"><i class="fas fa-window-minimize"></i></button></span></header><div class="tsru-resource-list"></div>';
      document.body.appendChild(this.element);
      activateResourceHudDrag(this.element, this.element.querySelector(".tsru-resource-drag"), "talentHudLayout", fallback);
      this.element.addEventListener("click", event => {
        const toggle = event.target.closest("[data-talent-hud-toggle]");
        if (toggle) {
          saveResourceHudLayout("talentHudLayout", {minimized: !resourceHudLayout("talentHudLayout", fallback).minimized}, fallback).then(refreshResourceHuds);
          return;
        }
        const button = event.target.closest("[data-talent-delta]");
        if (!button) return;
        requestTalentAdjustment(game.actors.get(button.dataset.actorId), Number(button.dataset.talentDelta));
      });
    }
    this.element.style.left = `${clamp(layout.x, 0, window.innerWidth - 60)}px`;
    this.element.style.top = `${clamp(layout.y, 0, window.innerHeight - 40)}px`;
    this.element.classList.toggle("is-minimized", Boolean(layout.minimized));
    const toggleIcon = this.element.querySelector("[data-talent-hud-toggle] i");
    if (toggleIcon) toggleIcon.className = layout.minimized ? "fas fa-window-maximize" : "fas fa-window-minimize";
    const toggle = this.element.querySelector("[data-talent-hud-toggle]");
    if (toggle) toggle.title = layout.minimized ? "Expand Talent Points" : "Minimize Talent Points";
    this.element.querySelector(".tsru-resource-list").innerHTML = actors.map(actor => {
      const config = getConfig(actor);
      return `<div class="tsru-resource-row"><img src="${escapeHTML(config.talentIcon || actor.img || "icons/svg/star.svg")}" alt=""><span class="tsru-resource-name">${escapeHTML(actor.name)}</span><button type="button" data-actor-id="${actor.id}" data-talent-delta="-1" title="Remove 1 Talent Point"><i class="fas fa-minus"></i></button><strong>${currentTalentPoints(actor)}/${Math.max(0, Number(config.talentPointsMax) || 0)}</strong><button type="button" data-actor-id="${actor.id}" data-talent-delta="1" title="Add 1 Talent Point"><i class="fas fa-plus"></i></button></div>`;
    }).join("");
    return this;
  }
  destroy() { this.element?.remove(); this.element = null; if (state.talentPointHud === this) state.talentPointHud = null; }
}

async function requestTechnique(actor) {
  if (combatHasInitiative()) return ui.notifications.warn("Techniques cannot be used while initiative is active.");
  if (!actor || (!game.user.isGM && !actor.isOwner)) return ui.notifications.error("You do not own this character.");
  if (!getConfig(actor).techniqueEnabled) return ui.notifications.warn("This character's Technique is disabled.");
  if (currentTechniquePoints() < 1) return ui.notifications.warn("The party has no Technique Points remaining.");
  if (isAuthority()) return executeTechnique(actor.id, game.user.id);
  if (!activeGM()) return ui.notifications.error("A GM must be connected to spend a shared Technique Point.");
  game.socket.emit(SOCKET, {type: "activateTechnique", actorId: actor.id, requestingUserId: game.user.id});
}

async function executeTechnique(actorId, requestingUserId) {
  if (!isAuthority() || state.techniqueSpendLock || combatHasInitiative()) return;
  const actor = game.actors.get(actorId);
  const requester = game.users.get(requestingUserId);
  if (!actor || actor.type !== "character" || (!requester?.isGM && !actor.testUserPermission(requester, "OWNER"))) return;
  const config = getConfig(actor);
  if (!config.techniqueEnabled || currentTechniquePoints() < 1) return;
  state.techniqueSpendLock = true;
  try {
    await setTechniquePoints(currentTechniquePoints() - 1);
    const body = await TextEditor.enrichHTML(config.techniqueText || "<em>No Technique description has been entered.</em>", {async: true, secrets: actor.isOwner});
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor}),
      content: `<article class="tsru-technique-chat"><h3><img src="${escapeHTML(config.techniqueButtonImage || actor.img || "icons/svg/lightning.svg")}" alt="">${escapeHTML(actor.name)} — Technique</h3><div>${body}</div></article>`
    });
    ui.notifications.info(`${actor.name} used their Technique. ${currentTechniquePoints()} Technique Point(s) remain.`);
  } finally {
    state.techniqueSpendLock = false;
    refreshResourceHuds();
  }
}

function activateStarRailActionDrag(element, actor, action) {
  if (!element || !actor) return;
  element.draggable = true;
  element.classList.add("tsru-macro-draggable");
  element.addEventListener("dragstart", event => {
    const config = getConfig(actor);
    const actionDetails = {
      skill: {label: "Skill", img: config.skillButtonImage || actor.img},
      technique: {label: "Technique", img: config.techniqueButtonImage || actor.img},
      ultimate: {label: config.ultimateName || "Ultimate", img: config.ultimateButtonImage || config.orbImage || actor.img},
      talent: {label: "Talent", img: config.talentIcon || actor.img}
    }[action];
    if (!actionDetails) return;
    event.dataTransfer.setData("text/plain", JSON.stringify({type:"TSRUAction",action,actorId:actor.id,actorUuid:actor.uuid,name:`${actor.name} — ${actionDetails.label}`,img:actionDetails.img || "icons/svg/d20.svg"}));
    event.dataTransfer.effectAllowed = "copy";
  });
}

async function createStarRailActionMacro(data, slot) {
  if (data?.type !== "TSRUAction" || !["skill", "technique", "ultimate", "talent"].includes(data.action)) return true;
  const actor = game.actors.get(data.actorId) ?? await fromUuid(data.actorUuid).catch(() => null);
  if (!actor || actor.type !== "character") { ui.notifications.error("The character for this Star Rail action no longer exists."); return false; }
  if (!game.user.isGM && !actor.isOwner) { ui.notifications.error("You can only create action macros for characters you own."); return false; }
  let macro = game.macros.find(entry => entry.getFlag(MODULE_ID,"action") === data.action && entry.getFlag(MODULE_ID,"actorId") === actor.id && entry.isOwner);
  if (!macro) {
    const method = {skill:"requestSkill",technique:"requestTechnique",ultimate:"requestUltimate",talent:"showTalentPopup"}[data.action];
    macro = await Macro.create({name:data.name,type:"script",img:data.img || actor.img || "icons/svg/d20.svg",command:`const actor = game.actors.get("${actor.id}");\nif (!actor) return ui.notifications.error("Character not found.");\nreturn game.modules.get("${MODULE_ID}")?.api?.${method}(actor);`,flags:{[MODULE_ID]:{action:data.action,actorId:actor.id}}});
  }
  await game.user.assignHotbarMacro(macro,slot);
  requestAnimationFrame(refreshUltimateHotbarMacros);
  return false;
}

function ultimateMacroDisplay(actor) {
  const config = getConfig(actor);
  const maximum = Math.max(1, Number(config.max) || 1);
  const percent = clamp((Number(config.current) / maximum) * 100, 0, 100);
  const ready = Boolean(config.enabled) && percent >= 100;
  const element = getElements().find(entry => entry.id === config.elementId);
  const color = ready
    ? (element?.readyColor || config.readyColor || DEFAULT_CONFIG.readyColor)
    : (element?.chargeColor || config.chargeColor || DEFAULT_CONFIG.chargeColor);
  return {percent, ready, color};
}

function refreshUltimateHotbarMacros() {
  if (!game?.user) return;
  const slots = new Set(document.querySelectorAll("#hotbar [data-slot], #action-bar [data-slot], .hotbar [data-slot], #hotbar [data-macro-id], #action-bar [data-macro-id], .hotbar [data-macro-id]"));
  for (const slot of slots) {
    const slotNumber = String(slot.dataset.slot ?? "");
    const storedMacro = slotNumber ? game.user.hotbar?.[slotNumber] : null;
    const storedMacroId = typeof storedMacro === "string" ? storedMacro : storedMacro?.id;
    const macroId = slot.dataset.macroId ?? slot.querySelector?.("[data-macro-id]")?.dataset.macroId ?? storedMacroId;
    const macro = game.macros.get(macroId);
    const action = macro?.getFlag(MODULE_ID, "action");
    const isUltimate = action === "ultimate";
    const isSkill = action === "skill";
    const isTalent = action === "talent";
    slot.classList.toggle("tsru-ultimate-macro", isUltimate);
    slot.classList.toggle("tsru-skill-macro", isSkill);
    slot.classList.toggle("tsru-talent-macro", isTalent);
    slot.querySelectorAll(":scope > .tsru-hotbar-energy-fill, :scope > .tsru-hotbar-energy-label, :scope > .tsru-hotbar-action-label").forEach(node => node.remove());
    if (isSkill || isTalent) {
      slot.classList.remove("has-energy", "is-ready");
      const actor = game.actors.get(macro.getFlag(MODULE_ID, "actorId"));
      const label = document.createElement("span");
      label.className = "tsru-hotbar-action-label";
      label.textContent = isTalent ? "TALENT" : "SKILL";
      label.setAttribute("aria-hidden", "true");
      slot.append(label);
      if (isTalent && actor) slot.title = plainAbilityText(getConfig(actor).talentText) || `${actor.name} Talent`;
      continue;
    }
    if (!isUltimate) { slot.classList.remove("has-energy", "is-ready"); continue; }
    const actor = game.actors.get(macro.getFlag(MODULE_ID, "actorId"));
    if (!actor) continue;
    const display = ultimateMacroDisplay(actor);
    slot.style.setProperty("--tsru-hotbar-energy", `${display.percent}%`);
    slot.style.setProperty("--tsru-hotbar-energy-ratio", String(display.percent / 100));
    slot.style.setProperty("--tsru-hotbar-glow", `${2 + (12 * display.percent / 100)}px`);
    slot.style.setProperty("--tsru-hotbar-energy-color", display.color);
    slot.classList.toggle("has-energy", display.percent > 0);
    slot.classList.toggle("is-ready", display.ready);
    const fill = document.createElement("span");
    fill.className = "tsru-hotbar-energy-fill";
    fill.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "tsru-hotbar-energy-label";
    label.textContent = `${Math.round(display.percent)}%`;
    label.setAttribute("aria-label", `${actor.name} Ultimate Energy: ${Math.round(display.percent)}%`);
    slot.append(fill, label);
  }
}

class TechniqueHud {
  constructor() { this.element = null; }
  render() {
    const actors = visibleTechniqueActors();
    if (!actors.length) return this.destroy();
    const fallback = {x: 24, y: 420};
    const layout = resourceHudLayout("techniqueHudLayout", fallback);
    if (!this.element) {
      this.element = document.createElement("section");
      this.element.className = "tsru-resource-hud tsru-technique-hud";
      this.element.innerHTML = '<header><span><i class="fas fa-bolt"></i> Technique Points: <strong class="tsru-technique-count"></strong></span><i class="fas fa-grip-lines tsru-resource-drag"></i></header><div class="tsru-technique-buttons"></div>';
      document.body.appendChild(this.element);
      activateResourceHudDrag(this.element, this.element.querySelector(".tsru-resource-drag"), "techniqueHudLayout", fallback);
      this.element.addEventListener("click", event => {
        const button = event.target.closest("[data-technique-actor]");
        if (button) requestTechnique(game.actors.get(button.dataset.techniqueActor));
      });
    }
    this.element.style.left = `${clamp(layout.x, 0, window.innerWidth - 60)}px`;
    this.element.style.top = `${clamp(layout.y, 0, window.innerHeight - 40)}px`;
    this.element.querySelector(".tsru-technique-count").textContent = `${currentTechniquePoints()}/${getTechniquePointConfig().maximum}`;
    this.element.querySelector(".tsru-technique-buttons").innerHTML = actors.map(actor => {
      const config = getConfig(actor);
      const unavailable = currentTechniquePoints() < 1;
      return `<button type="button" class="tsru-technique-button ${unavailable ? "is-unavailable" : ""}" data-technique-actor="${actor.id}" aria-disabled="${unavailable}" title="Use ${escapeHTML(actor.name)}'s Technique (costs 1 Technique Point)"><img src="${escapeHTML(config.techniqueButtonImage || actor.img || "icons/svg/lightning.svg")}" alt=""><span>${escapeHTML(actor.name)}</span></button>`;
    }).join("");
    for (const button of this.element.querySelectorAll("[data-technique-actor]")) activateStarRailActionDrag(button, game.actors.get(button.dataset.techniqueActor), "technique");
    return this;
  }
  destroy() { this.element?.remove(); this.element = null; if (state.techniqueHud === this) state.techniqueHud = null; }
}

function refreshResourceHuds() {
  const talentActors = visibleTalentActors();
  if (game.user.isGM && talentActors.length) {
    if (!state.talentPointHud) state.talentPointHud = new TalentPointHud();
    state.talentPointHud.render();
  } else state.talentPointHud?.destroy();
  refreshTalentButtons();
  const techniqueActors = visibleTechniqueActors();
  if (techniqueActors.length) {
    if (!state.techniqueHud) state.techniqueHud = new TechniqueHud();
    state.techniqueHud.render();
  } else state.techniqueHud?.destroy();
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

function getTalentPointConfig() {
  return foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_TALENT_POINT_CONFIG), game.settings.get(MODULE_ID, "talentPointConfig") ?? {}, {inplace:false});
}

async function refreshTalentPointFont() {
  try {
    const font = await loadSplashFont(getTalentPointConfig().numberFontFile);
    document.documentElement.style.setProperty("--tsru-talent-number-font", font);
  } catch (error) {
    console.warn(`${MODULE_ID} | Could not load Talent Point font`, error);
    document.documentElement.style.removeProperty("--tsru-talent-number-font");
  }
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

function plainAbilityText(value) {
  const div = document.createElement("div");
  div.innerHTML = String(value ?? "");
  return (div.textContent || "").trim();
}

function selectedMainCharacter() {
  const actorId = (game.settings.get(MODULE_ID, "partySelections") ?? {})[game.user.id];
  const actor = game.actors.get(actorId);
  return actor?.type === "character" && (game.user.isGM || actor.isOwner) ? actor : null;
}

function talentButtonLayout(actorId) {
  const layouts = game.settings.get(MODULE_ID, "talentButtonLayouts") ?? {};
  return foundry.utils.mergeObject({x:360,y:330,size:96,visible:false}, layouts[actorId] ?? {}, {inplace:false});
}

async function saveTalentButtonLayout(actorId, changes) {
  const layouts = foundry.utils.deepClone(game.settings.get(MODULE_ID, "talentButtonLayouts") ?? {});
  layouts[actorId] = foundry.utils.mergeObject(layouts[actorId] ?? {}, changes, {inplace:false});
  await game.settings.set(MODULE_ID, "talentButtonLayouts", layouts);
}

async function showTalentPopup(actor) {
  if (!actor || (!game.user.isGM && !actor.isOwner)) return ui.notifications.error("You do not own this character.");
  const config = getConfig(actor);
  const {trigger, overcap} = talentPointLimits(actor);
  const body = await TextEditor.enrichHTML(config.talentText || "<em>No Talent description has been entered.</em>", {async:true,secrets:actor.isOwner,relativeTo:actor});
  const content = `<section class="tsru-talent-dialog" data-actor-id="${actor.id}"><header><img src="${escapeHTML(config.talentIcon || actor.img || "icons/svg/star.svg")}" alt=""><div><strong>${escapeHTML(actor.name)} — Talent</strong><span data-talent-count>${currentTalentPoints(actor)}/${trigger}${overcap > trigger ? ` (overcap ${overcap})` : ""}</span></div></header><div class="tsru-talent-description">${body}</div><footer><button type="button" data-talent-popup-delta="-1"><i class="fas fa-minus"></i></button><button type="button" data-talent-popup-delta="1"><i class="fas fa-plus"></i></button></footer></section>`;
  const dialog = new Dialog({title:`${actor.name} — Talent`,content,buttons:{close:{icon:'<i class="fas fa-check"></i>',label:"Close"}},render:html => {
    html.find("[data-talent-popup-delta]").on("click", async event => {
      await requestTalentAdjustment(actor, Number(event.currentTarget.dataset.talentPopupDelta));
      const limits = talentPointLimits(actor);
      html.find("[data-talent-count]").text(`${currentTalentPoints(actor)}/${limits.trigger}${limits.overcap > limits.trigger ? ` (overcap ${limits.overcap})` : ""}`);
    });
  }});
  dialog.render(true);
}

class TalentButton {
  constructor(actor) { this.actor=actor; this.element=null; this.drag=null; this.resize=null; }
  render() {
    const layout=talentButtonLayout(this.actor.id), config=getConfig(this.actor);
    if (!layout.visible || talentPointLimits(this.actor).trigger < 1) return this.destroy();
    if (!this.element) {
      this.element=document.createElement("div");
      this.element.className="tsru-skill-widget tsru-talent-widget";
      this.element.innerHTML=`<div class="tsru-skill-drag" title="Move Talent button"><i class="fas fa-grip-lines"></i></div><button type="button" class="tsru-skill-button tsru-talent-button"><img></button><div class="tsru-skill-label">Talent</div><button type="button" class="tsru-skill-close" title="Hide Talent button"><i class="fas fa-xmark"></i></button><div class="tsru-skill-resize" title="Resize"></div>`;
      document.body.appendChild(this.element);
      const drag=this.element.querySelector(".tsru-skill-drag"),resize=this.element.querySelector(".tsru-skill-resize");
      drag.addEventListener("pointerdown",e=>{e.preventDefault();const r=this.element.getBoundingClientRect();this.drag={dx:e.clientX-r.left,dy:e.clientY-r.top};drag.setPointerCapture(e.pointerId);});
      drag.addEventListener("pointermove",e=>{if(!this.drag)return;this.element.style.left=`${clamp(e.clientX-this.drag.dx,0,window.innerWidth-40)}px`;this.element.style.top=`${clamp(e.clientY-this.drag.dy,0,window.innerHeight-40)}px`;});
      drag.addEventListener("pointerup",async e=>{if(!this.drag)return;this.drag=null;drag.releasePointerCapture(e.pointerId);const r=this.element.getBoundingClientRect();await saveTalentButtonLayout(this.actor.id,{x:Math.round(r.left),y:Math.round(r.top)});});
      resize.addEventListener("pointerdown",e=>{e.preventDefault();this.resize={startX:e.clientX,startSize:this.element.getBoundingClientRect().width};resize.setPointerCapture(e.pointerId);});
      resize.addEventListener("pointermove",e=>{if(this.resize)this.element.style.setProperty("--tsru-skill-size",`${clamp(this.resize.startSize+e.clientX-this.resize.startX,64,280)}px`);});
      resize.addEventListener("pointerup",async e=>{if(!this.resize)return;const size=clamp(this.resize.startSize+e.clientX-this.resize.startX,64,280);this.resize=null;resize.releasePointerCapture(e.pointerId);await saveTalentButtonLayout(this.actor.id,{size:Math.round(size)});});
      this.element.querySelector(".tsru-skill-close").addEventListener("click",async()=>{await saveTalentButtonLayout(this.actor.id,{visible:false});this.destroy();});
      this.element.querySelector(".tsru-talent-button").addEventListener("click",()=>showTalentPopup(this.actor));
      activateStarRailActionDrag(this.element.querySelector(".tsru-talent-button"),this.actor,"talent");
    }
    this.element.style.left=`${clamp(layout.x,0,window.innerWidth-40)}px`;this.element.style.top=`${clamp(layout.y,0,window.innerHeight-40)}px`;this.element.style.setProperty("--tsru-skill-size",`${clamp(layout.size,64,280)}px`);
    const button=this.element.querySelector(".tsru-talent-button");
    button.querySelector("img").src=config.talentIcon || this.actor.img || "icons/svg/star.svg";
    button.title=plainAbilityText(config.talentText) || `${this.actor.name} Talent`;
    this.element.querySelector(".tsru-skill-label").textContent=`Talent ${currentTalentPoints(this.actor)}/${talentPointLimits(this.actor).trigger}`;
    return this;
  }
  destroy(){this.element?.remove();this.element=null;state.talentButtons.delete(this.actor.id);}
}

function refreshTalentButtons() {
  const actors = game.user.isGM
    ? game.actors.filter(actor => actor.type === "character" && talentButtonLayout(actor.id).visible && talentPointLimits(actor).trigger > 0)
    : [selectedMainCharacter()].filter(actor => actor && talentButtonLayout(actor.id).visible);
  const actorIds = new Set(actors.map(actor => actor.id));
  for (const [id,button] of [...state.talentButtons]) if (!actorIds.has(id)) button.destroy();
  for (const actor of actors) {
    let button=state.talentButtons.get(actor.id);
    if(!button){button=new TalentButton(actor);state.talentButtons.set(actor.id,button);}
    button.render();
  }
}

async function placeTalentButton(actor, {openPopup = false} = {}) {
  if (!actor) return ui.notifications.warn("Select your main character first.");
  if (talentPointLimits(actor).trigger < 1) return ui.notifications.warn("This character does not have a Talent Point trigger configured.");
  await saveTalentButtonLayout(actor.id,{visible:true});
  refreshTalentButtons();
  if (openPopup) showTalentPopup(actor);
  else ui.notifications.info(`${actor.name}'s Talent button was placed.`);
  return true;
}

function showGMTalentActorPicker() {
  const actors = game.actors
    .filter(actor => actor.type === "character")
    .sort((left, right) => String(left.name).localeCompare(String(right.name), undefined, {sensitivity:"base"}));
  if (!actors.length) return ui.notifications.warn("No player characters are available.");
  const options = actors.map(actor => `<option value="${actor.id}">${escapeHTML(actor.name)}</option>`).join("");
  const content = `<form class="tsru-talent-character-picker"><div class="form-group"><label>Select character</label><div class="form-fields"><select name="actorId">${options}</select></div><p class="hint">Creates that character's detached Talent button using the Talent configured on their sheet.</p></div></form>`;
  new Dialog({
    title:"Show Character Talent",
    content,
    buttons:{
      ok:{icon:'<i class="fas fa-check"></i>',label:"OK",callback:html => placeTalentButton(game.actors.get(html.find('[name="actorId"]').val()))},
      cancel:{icon:'<i class="fas fa-times"></i>',label:"Cancel"}
    },
    default:"ok"
  }).render(true);
}

async function showTalentUI() {
  if (game.user.isGM) return showGMTalentActorPicker();
  return placeTalentButton(selectedMainCharacter(), {openPopup:true});
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
    if (!combatHasInitiative() || !layout.visible) return this.destroy();
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
      activateStarRailActionDrag(this.element.querySelector(".tsru-skill-button"), this.actor, "skill");
    }
    const config = getConfig(this.actor);
    const element = getElements().find(entry => entry.id === config.elementId);
    const cost = Math.max(0, Math.floor(Number(config.skillPointCost) || 0));
    const available = currentSkillPoints() >= cost && !state.skillLocks.has(this.actor.id);
    this.element.style.left = `${clamp(layout.x, 0, window.innerWidth - 40)}px`;
    this.element.style.top = `${clamp(layout.y, 0, window.innerHeight - 40)}px`;
    this.element.style.setProperty("--tsru-skill-size", `${clamp(layout.size, 64, 280)}px`);
    this.element.style.setProperty("--tsru-skill-color", element?.readyColor || DEFAULT_CONFIG.readyColor);
    this.element.classList.toggle("is-unavailable", !available);
    const button = this.element.querySelector(".tsru-skill-button");
    button.disabled = false;
    button.setAttribute("aria-disabled", String(!available));
    button.title = available ? `${this.actor.name}: Use Skill (costs ${cost} Skill Point${cost === 1 ? "" : "s"})` : state.skillLocks.has(this.actor.id) ? "This Skill is currently resolving." : `This Skill requires ${cost} Skill Points.`;
    button.querySelector("img").src = config.skillButtonImage || this.actor.img || "icons/svg/sword.svg";
    return this;
  }
  activateListeners() {
    const drag = this.element.querySelector(".tsru-skill-drag"); const resize = this.element.querySelector(".tsru-skill-resize");
    drag.addEventListener("pointerdown", event => { event.preventDefault(); const rect = this.element.getBoundingClientRect(); this.drag = {dx: event.clientX - rect.left, dy: event.clientY - rect.top}; drag.setPointerCapture(event.pointerId); });
    drag.addEventListener("pointermove", event => { if (!this.drag) return; this.element.style.left = `${clamp(event.clientX - this.drag.dx, 0, window.innerWidth - 40)}px`; this.element.style.top = `${clamp(event.clientY - this.drag.dy, 0, window.innerHeight - 40)}px`; });
    drag.addEventListener("pointerup", async event => { if (!this.drag) return; this.drag = null; drag.releasePoin…40959 tokens truncated…vateListeners(html);
    html.find("[data-collapse-toggle]").on("click", async event => {
      const button = event.currentTarget;
      const key = button.dataset.collapseToggle;
      const card = button.closest(".tsru-gm-collapsible");
      if (!key || !card) return;
      const collapsed = !card.classList.contains("collapsed");
      card.classList.toggle("collapsed", collapsed);
      button.setAttribute("aria-expanded", String(!collapsed));
      const saved = foundry.utils.deepClone(game.settings.get(MODULE_ID, "gmPanelCollapsedCards") ?? {});
      saved[key] = collapsed;
      await game.settings.set(MODULE_ID, "gmPanelCollapsedCards", saved);
    });
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
    html.find('[name="punchlineOverride"]').on("change", async event => {
      await game.settings.set(MODULE_ID, "punchlineOverride", Boolean(event.currentTarget.checked));
      refreshPunchlineHUD();
      this.refreshLiveValues();
    });
    html.find("[data-actor-field]").on("change", async event => {
      const input = event.currentTarget;
      const actor = game.actors.get(input.dataset.actorId);
      const field = input.dataset.actorField;
      if (!actor || !["current", "max", "regenScore", "attackGain", "attackedGain", "punchlineGain", "talentPointsCurrent", "talentPointsMax", "mainParty", "partyGMOverride", "receivesRewards", "lockEnergyAfterUltimate"].includes(field)) return;
      if (["mainParty", "partyGMOverride", "receivesRewards", "lockEnergyAfterUltimate"].includes(field)) {
        await actor.update({[`flags.${MODULE_ID}.ultimate.${field}`]: input.checked});
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
        const applied = await setEnergy(actor, value, {overrideLock: true});
        input.value = applied ?? getConfig(actor).current;
      }
      else if (field === "regenScore") await actor.update({[`flags.${MODULE_ID}.ultimate.regenScore`]: clamp(value, 1, 30)});
      else if (field === "talentPointsMax") {
        value = Math.max(0, value);
        const overcap = Math.max(value, Number(config.talentPointsOvercapMax) || value);
        await actor.update({[`flags.${MODULE_ID}.ultimate.talentPointsMax`]: value, [`flags.${MODULE_ID}.ultimate.talentPointsOvercapMax`]:overcap, [`flags.${MODULE_ID}.ultimate.talentPointsCurrent`]: clamp(config.talentPointsCurrent, 0, overcap)});
      } else if (field === "talentPointsCurrent") {
        if (!talentCombatForActor(actor)) ui.notifications.warn("Talent Points can only be tracked during combat for characters with tokens on the battlefield.");
        else await setTalentPoints(actor, value);
      }
      else await actor.update({[`flags.${MODULE_ID}.ultimate.${field}`]: Math.max(0, value)});
      this.refreshLiveValues();
    });
    html.find("[data-action='action-advance']").on("click", async () => {
      const id = html.find('[name="actionAdvanceCombatant"]').val();
      if (!id) return ui.notifications.warn("Choose a combatant first.");
      await insertActionAdvanceTurn(id);
      this.render(false);
    });
    html.find("[data-action='place-action-button']").on("click", async () => {
      const actor = game.actors.get(html.find('[name="actionButtonActor"]').val());
      const action = html.find('[name="actionButtonType"]').val();
      await placeGMActionButton(actor, action);
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
    html.find("[data-action='set-weakness-mode']").on("click", async event => {
      const row = event.currentTarget.closest("[data-toughness-actor]");
      const tokenDocument = row?.dataset.toughnessActor ? await fromUuid(row.dataset.toughnessActor).catch(() => null) : null;
      const mode = event.currentTarget.dataset.mode;
      if (await setToughnessWeaknessMode(tokenDocument, mode)) {
        ui.notifications.info(`${tokenDocument?.name ?? "Enemy"} now has ${mode === "all" ? "all Toughness weaknesses" : "Toughness weakness disabled"}.`);
        this.render(false);
      }
    });
    html.find("[data-action='reset-all-temporary-weaknesses']").on("click", async () => {
      const reset = await resetTemporaryToughnessWeaknesses();
      ui.notifications.info(`Reset temporary weaknesses for ${reset} enem${reset === 1 ? "y" : "ies"}.`);
      this.render(false);
    });
    html.find("[data-action='bulk-weakness-mode']").on("click", async event => {
      const mode = event.currentTarget.dataset.mode;
      const targets = (canvas?.tokens?.placeables ?? []).filter(token => token.actor?.type === "npc").map(token => token.document);
      for (const target of targets) await setToughnessWeaknessMode(target, mode);
      ui.notifications.info(`Updated Toughness weakness mode for ${targets.length} scene enem${targets.length === 1 ? "y" : "ies"}.`);
      this.render(false);
    });
    html.find("[data-action='bulk-enable-toughness']").on("click", async () => {
      const actors = [...new Map((canvas?.tokens?.placeables ?? []).filter(token => token.actor?.type === "npc").map(token => [token.actor.id, token.actor])).values()];
      if (actors.length) await Actor.updateDocuments(actors.map(actor => ({_id: actor.id, [`flags.${MODULE_ID}.toughness.enabled`]: true})));
      refreshToughnessBars();
      ui.notifications.info(`Enabled Toughness for ${actors.length} scene enemy actor${actors.length === 1 ? "" : "s"}.`);
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
    root.find('[name="punchlineOverride"]').prop("checked", punchlineOverrideEnabled());
    root.find('[data-resource-input="skillPoints"]').val(currentSkillPoints());
    for (const actor of game.actors.filter(entry => entry.type === "character")) {
      const config = getConfig(actor);
      root.find(`[data-actor-id="${actor.id}"][data-actor-field="current"]`).val(config.current);
      root.find(`[data-actor-id="${actor.id}"][data-actor-field="max"]`).val(config.max);
      root.find(`[data-actor-id="${actor.id}"][data-actor-field="talentPointsCurrent"]`).val(currentTalentPoints(actor)).prop("disabled", !talentCombatForActor(actor));
      root.find(`[data-actor-id="${actor.id}"][data-actor-field="talentPointsMax"]`).val(config.talentPointsMax);
      root.find(`[data-actor-id="${actor.id}"][data-actor-field="mainParty"]`).prop("checked", config.mainParty);
      root.find(`[data-actor-id="${actor.id}"][data-actor-field="partyGMOverride"]`).prop("checked", config.partyGMOverride);
      root.find(`[data-actor-id="${actor.id}"][data-actor-field="receivesRewards"]`).prop("checked", config.receivesRewards);
      root.find(`[data-actor-id="${actor.id}"][data-actor-field="lockEnergyAfterUltimate"]`).prop("checked", config.lockEnergyAfterUltimate);
      root.find(`[data-regen-modifier="${actor.id}"]`).text(signedNumber(regenModifier(config)));
    }
  }
  refreshTargetHighlights() {
    const root = this.element?.jquery ? this.element : $(this.element);
    if (!root?.length) return;
    const targeted = new Set([...(game.user?.targets ?? []), ...(canvas?.tokens?.controlled ?? [])].map(token => token.id));
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
  game.settings.register(MODULE_ID, "combatPartyHudLayout", {scope: "client", config: false, type: Object, default: {scale: 1, minimized: false, x: null, y: null}});
  game.settings.register(MODULE_ID, "combatHudDesign", {scope: "world", config: false, type: Object, default: foundry.utils.deepClone(DEFAULT_COMBAT_HUD_DESIGN)});
  game.settings.register(MODULE_ID, "ahaConfig", {scope: "world", config: false, type: Object, default: foundry.utils.deepClone(DEFAULT_AHA_CONFIG)});
  game.settings.register(MODULE_ID, "ahaLayout", {scope: "client", config: false, type: Object, default: {x: 220, y: 180, size: 128, visible: false}});
  game.settings.register(MODULE_ID, "punchline", {scope: "world", config: false, type: Number, default: 0});
  game.settings.register(MODULE_ID, "punchlineOverride", {scope: "world", config: false, type: Boolean, default: false});
  game.settings.register(MODULE_ID, "punchlineLayout", {scope: "client", config: false, type: Object, default: {x: 580, y: 145, size: 54, visible: true}});
  game.settings.register(MODULE_ID, "techniquePointConfig", {scope: "world", config: false, type: Object, default: foundry.utils.deepClone(DEFAULT_TECHNIQUE_POINT_CONFIG)});
  game.settings.register(MODULE_ID, "techniquePoints", {scope: "world", config: false, type: Number, default: DEFAULT_TECHNIQUE_POINT_CONFIG.starting});
  game.settings.register(MODULE_ID, "talentHudLayout", {scope: "client", config: false, type: Object, default: {x: 24, y: 180}});
  game.settings.register(MODULE_ID, "talentPointConfig", {scope:"world", config:false, type:Object, default:foundry.utils.deepClone(DEFAULT_TALENT_POINT_CONFIG)});
  game.settings.register(MODULE_ID, "talentButtonLayouts", {scope: "client", config: false, type: Object, default: {}});
  game.settings.register(MODULE_ID, "techniqueHudLayout", {scope: "client", config: false, type: Object, default: {x: 24, y: 420}});
  game.settings.register(MODULE_ID, "skillPointConfig", {scope: "world", config: false, type: Object, default: foundry.utils.deepClone(DEFAULT_SKILL_POINT_CONFIG)});
  game.settings.register(MODULE_ID, "skillPoints", {scope: "world", config: false, type: Number, default: DEFAULT_SKILL_POINT_CONFIG.starting});
  game.settings.register(MODULE_ID, "skillMeterLayout", {scope: "client", config: false, type: Object, default: {x: 420, y: 80, size: 42, visible: true}});
  game.settings.register(MODULE_ID, "skillButtonLayouts", {scope: "client", config: false, type: Object, default: {}});
  game.settings.register(MODULE_ID, "eidolonConfig", {scope: "world", config: false, type: Object, default: foundry.utils.deepClone(DEFAULT_EIDOLON_CONFIG)});
  game.settings.register(MODULE_ID, "gmPanelCollapsedCards", {scope: "client", config: false, type: Object, default: {}});
  game.settings.register(MODULE_ID, "ultimateSectionStates", {scope: "client", config: false, type: Object, default: {}});
  game.settings.register(MODULE_ID, "breakFonts", {scope:"world",config:false,type:Object,default:{breakFontFile:"",superBreakFontFile:""}});
  game.settings.registerMenu(MODULE_ID, "breakAppearance", {name:"Damage Display Appearance",label:"Configure Damage Display",hint:"Preview and configure regular damage, Break, and Super Break fonts, sizes, weights, and Element gradients.",icon:"fas fa-burst",type:BreakAppearanceConfig,restricted:true});
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
  game.settings.registerMenu(MODULE_ID, "techniquePointsMenu", {
    name: "Technique Point Configuration",
    label: "Configure Technique Points",
    hint: "Configure the shared out-of-combat Technique Point pool.",
    icon: "fas fa-bolt",
    type: TechniquePointMenu,
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
  game.settings.registerMenu(MODULE_ID, "talentPointsMenu", {
    name:"Talent Point Configuration",
    label:"Configure Talent Points",
    hint:"Choose the universal number font used by Talent Points in the floating panel and combat party HUD.",
    icon:"fas fa-star",
    type:TalentPointMenu,
    restricted:true
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
    actor, config, elements, paths,
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
    actor, config, elements, paths,
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

function ultimateSectionStateKey(section, index) {
  const title = section.querySelector(":scope > h3")?.textContent?.trim()?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
  return `${index}-${title}`;
}

async function saveUltimateSectionStates(actorId, states) {
  const allStates = foundry.utils.deepClone(game.settings.get(MODULE_ID, "ultimateSectionStates") ?? {});
  allStates[actorId] = states;
  await game.settings.set(MODULE_ID, "ultimateSectionStates", allStates);
}

function initializeCollapsibleUltimateSections(actor, tab) {
  const root = tab?.jquery ? tab[0] : tab;
  if (!(root instanceof HTMLElement)) return;
  const allStates = game.settings.get(MODULE_ID, "ultimateSectionStates") ?? {};
  const actorStates = foundry.utils.deepClone(allStates[actor.id] ?? {});
  const sections = [...root.querySelectorAll(".tsru-config-section")];

  let toolbar = root.querySelector(":scope > .tsru-config-reveal-toolbar");
  if (!toolbar) {
    toolbar = document.createElement("div");
    toolbar.className = "tsru-config-reveal-toolbar";
    toolbar.innerHTML = '<button type="button" data-action="reveal-all-config"><i class="fas fa-eye"></i> Reveal All</button>';
    root.prepend(toolbar);
  }

  for (const [index, section] of sections.entries()) {
    const heading = section.querySelector(":scope > h3");
    if (!heading) continue;
    const key = ultimateSectionStateKey(section, index);
    section.dataset.tsruSectionKey = key;
    let content = section.querySelector(":scope > .tsru-collapsible-content");
    if (!content) {
      content = document.createElement("div");
      content.className = "tsru-collapsible-content";
      for (const child of [...section.children]) if (child !== heading) content.appendChild(child);
      section.appendChild(content);
    }
    let toggle = heading.querySelector(":scope > .tsru-section-toggle");
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "tsru-section-toggle";
      toggle.innerHTML = '<i class="fas fa-chevron-up" aria-hidden="true"></i>';
      toggle.setAttribute("aria-label", "Collapse section");
      heading.appendChild(toggle);
    }
    const applyState = collapsed => {
      section.classList.toggle("is-collapsed", collapsed);
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.title = collapsed ? "Reveal this section" : "Minimize this section";
      toggle.setAttribute("aria-label", collapsed ? "Reveal section" : "Minimize section");
      toggle.querySelector("i").className = collapsed ? "fas fa-chevron-down" : "fas fa-chevron-up";
    };
    applyState(Boolean(actorStates[key]));
    toggle.addEventListener("click", async event => {
      event.preventDefault();
      event.stopPropagation();
      actorStates[key] = !section.classList.contains("is-collapsed");
      applyState(actorStates[key]);
      await saveUltimateSectionStates(actor.id, actorStates);
    });
  }

  toolbar.querySelector("[data-action='reveal-all-config']").onclick = async event => {
    event.preventDefault();
    event.stopPropagation();
    for (const section of sections) {
      const key = section.dataset.tsruSectionKey;
      if (key) actorStates[key] = false;
      section.classList.remove("is-collapsed");
      const toggle = section.querySelector(":scope > h3 > .tsru-section-toggle");
      if (toggle) {
        toggle.setAttribute("aria-expanded", "true");
        toggle.title = "Minimize this section";
        toggle.setAttribute("aria-label", "Minimize section");
        toggle.querySelector("i").className = "fas fa-chevron-up";
      }
    }
    await saveUltimateSectionStates(actor.id, actorStates);
  };
}

async function saveUltimateConfigFromTab(actor, tab, {notify = false, renderApp = false, app = null} = {}) {
  const data = foundry.utils.deepClone(getConfig(actor));
  tab.find("[name]").each((_index, field) => {
    data[field.name] = field.type === "checkbox" ? field.checked : field.value;
  });
  for (const key of ["current", "max", "regenScore", "breakEffectScore", "breakDamageDice", "breakDamageDie", "attackGain", "attackedGain", "skillPointCost", "talentPointsCurrent", "talentPointsMax", "talentPointsOvercapMax", "punchlineGain", "splashDuration", "splashX", "splashY", "splashScale", "titleX", "titleY", "titleSize", "combatHudPortraitX", "combatHudPortraitY", "combatHudPortraitScale", "ultimateButtonX", "ultimateButtonY", "ultimateButtonScale"]) data[key] = Number(data[key]);
  for (const key of ["enabled", "showPercent", "showHudPercent", "skillEnabled", "techniqueEnabled", "mainParty", "trialCharacter", "combatHudPortraitFlip", "ultimateButtonAdjustEnabled", "partyGMOverride", "receivesRewards", "lockEnergyAfterUltimate", "breakCharacter", "superBreakCharacter"]) data[key] = Boolean(data[key]);
  data.max = Math.max(1, data.max || 100);
  data.current = clamp(data.current, 0, data.max);
  const savedConfig = getConfig(actor);
  if (isEnergyLocked(actor) && data.current > savedConfig.current) {
    data.current = savedConfig.current;
    if (notify) ui.notifications.warn(`${actor.name} cannot regain Energy until the next round.`);
  }
  data.talentPointsMax = Math.max(0, Math.floor(data.talentPointsMax || 0));
  data.talentPointsOvercapMax = Math.max(data.talentPointsMax, Math.floor(data.talentPointsOvercapMax || data.talentPointsMax));
  data.talentPointsCurrent = talentCombatForActor(actor) ? clamp(Math.floor(data.talentPointsCurrent || 0), 0, data.talentPointsOvercapMax) : 0;
  data.skillPointCost = Math.max(0, Math.floor(data.skillPointCost || 0));
  data.talentCombatId = talentCombatForActor(actor)?.id ?? "";
  await actor.update({[`flags.${MODULE_ID}.ultimate`]: data}, {tsruAutosave: !notify, render: false});
  refreshOrb(actor);
  refreshSkillUI();
  refreshResourceHuds();
  refreshCombatPartyHud();
  if (notify) ui.notifications.info(`${actor.name}'s Ultimate configuration saved.`);
  if (renderApp && app?.render) app.render(false);
  return data;
}

function activateConfigListeners(actor, tab, app) {
  tab.find("input, select, textarea, button").prop("disabled", false);
  initializeCollapsibleUltimateSections(actor, tab);
  tab.find("input:not([readonly])").prop("readonly", false);
  activateImageDrops(tab);
  tab.on("input.tsru change.tsru", "input, select, textarea", event => event.stopPropagation());
  const refreshCombatPortraitPreview = () => {
    const preview = tab.find("[data-tsru-combat-hud-preview]");
    if (!preview.length) return;
    const draft = {...getConfig(actor), combatHudPortrait:String(tab.find("[name='combatHudPortrait']").val() || ""), combatHudPortraitX:Number(tab.find("[name='combatHudPortraitX']").val()), combatHudPortraitY:Number(tab.find("[name='combatHudPortraitY']").val()), combatHudPortraitScale:Number(tab.find("[name='combatHudPortraitScale']").val()), combatHudPortraitFlip:Boolean(tab.find("[name='combatHudPortraitFlip']").prop("checked")), talentIcon:String(tab.find("[name='talentIcon']").val() || ""), ultimateButtonImage:String(tab.find("[name='ultimateButtonImage']").val() || ""), ultimateButtonAdjustEnabled:Boolean(tab.find("[name='ultimateButtonAdjustEnabled']").prop("checked")), ultimateButtonX:Number(tab.find("[name='ultimateButtonX']").val()), ultimateButtonY:Number(tab.find("[name='ultimateButtonY']").val()), ultimateButtonScale:Number(tab.find("[name='ultimateButtonScale']").val())};
    preview.html(combatHudDesignerPreview(actor,draft));
  };
  const refreshUltimatePreview = () => {
    const preview = tab.find("[data-tsru-ultimate-preview]");
    if (!preview.length) return;
    const enabled = Boolean(tab.find("[name='ultimateButtonAdjustEnabled']").prop("checked"));
    const x = enabled ? clamp(Number(tab.find("[name='ultimateButtonX']").val()), 0, 100) : 50;
    const y = enabled ? clamp(Number(tab.find("[name='ultimateButtonY']").val()), 0, 100) : 50;
    const scale = enabled ? clamp(Number(tab.find("[name='ultimateButtonScale']").val()), 50, 400) : 100;
    preview.toggleClass("is-disabled", !enabled).css({"--tsru-ultimate-x":`${x}%`,"--tsru-ultimate-y":`${y}%`,"--tsru-ultimate-scale":String(scale / 100)});
    preview.find("img").attr("src", String(tab.find("[name='ultimateButtonImage']").val() || actor.img || "icons/svg/mystery-man.svg"));
    tab.find(".tsru-ultimate-adjust-controls input").prop("disabled", !enabled);
  };
  tab.on("input.tsru-preview change.tsru-preview", "[name='combatHudPortrait'], [name='combatHudPortraitX'], [name='combatHudPortraitY'], [name='combatHudPortraitScale'], [name='combatHudPortraitFlip'], [name='talentIcon'], [name='ultimateButtonImage'], [name='ultimateButtonAdjustEnabled'], [name='ultimateButtonX'], [name='ultimateButtonY'], [name='ultimateButtonScale']", () => { refreshCombatPortraitPreview(); refreshUltimatePreview(); });
  refreshCombatPortraitPreview();
  refreshUltimatePreview();
  const cropPreview = tab.find("[data-tsru-combat-hud-preview]");
  cropPreview.on("dragover.tsru-crop", event => { event.preventDefault(); cropPreview.addClass("is-dragover"); });
  cropPreview.on("dragleave.tsru-crop", () => cropPreview.removeClass("is-dragover"));
  cropPreview.on("drop.tsru-crop", event => {
    event.preventDefault(); cropPreview.removeClass("is-dragover");
    const path = droppedAssetPath(event);
    if (path) tab.find("[name='combatHudPortrait']").val(path).trigger("change");
  });
  let cropDrag = null;
  cropPreview.on("pointerdown.tsru-crop", ".tsru-combat-party-portrait", event => {
    if (event.button !== 0) return;
    event.preventDefault();
    cropDrag = {x:event.clientX,y:event.clientY,startX:Number(tab.find("[name='combatHudPortraitX']").val())||50,startY:Number(tab.find("[name='combatHudPortraitY']").val())||50,image:$(event.currentTarget).find("img")};
  });
  $(document).off(`.tsru-crop-${actor.id}`).on(`pointermove.tsru-crop-${actor.id}`, event => {
    if (!cropDrag) return;
    const rect=cropPreview[0].getBoundingClientRect();
    const x=clamp(cropDrag.startX+(event.clientX-cropDrag.x)/Math.max(1,rect.width)*100,0,100), y=clamp(cropDrag.startY+(event.clientY-cropDrag.y)/Math.max(1,rect.height)*100,0,100);
    cropDrag.nextX=x; cropDrag.nextY=y; cropDrag.image.css({objectPosition:`${x}% ${y}%`,transformOrigin:`${x}% ${y}%`});
  });
  $(document).on(`pointerup.tsru-crop-${actor.id}`, () => {
    if (!cropDrag) return;
    tab.find("[name='combatHudPortraitX']").val(Math.round(cropDrag.nextX ?? cropDrag.startX));
    tab.find("[name='combatHudPortraitY']").val(Math.round(cropDrag.nextY ?? cropDrag.startY)).trigger("change");
    cropDrag=null;
  });
  cropPreview.on("wheel.tsru-crop", ".tsru-combat-party-portrait", event => {
    event.preventDefault();
    const input=tab.find("[name='combatHudPortraitScale']"), next=clamp((Number(input.val())||100)+(event.originalEvent.deltaY<0?5:-5),50,300);
    input.val(next).trigger("input");
  });
  const ultimatePreview = tab.find("[data-tsru-ultimate-preview]");
  let ultimateDrag = null;
  ultimatePreview.on("pointerdown.tsru-ultimate-crop", "button", event => {
    if (event.button !== 0 || !tab.find("[name='ultimateButtonAdjustEnabled']").prop("checked")) return;
    event.preventDefault();
    ultimateDrag = {x:event.clientX,y:event.clientY,startX:Number(tab.find("[name='ultimateButtonX']").val())||50,startY:Number(tab.find("[name='ultimateButtonY']").val())||50};
  });
  $(document).off(`.tsru-ultimate-crop-${actor.id}`).on(`pointermove.tsru-ultimate-crop-${actor.id}`, event => {
    if (!ultimateDrag) return;
    const rect=ultimatePreview[0].getBoundingClientRect();
    ultimateDrag.nextX=clamp(ultimateDrag.startX+(event.clientX-ultimateDrag.x)/Math.max(1,rect.width)*100,0,100);
    ultimateDrag.nextY=clamp(ultimateDrag.startY+(event.clientY-ultimateDrag.y)/Math.max(1,rect.height)*100,0,100);
    tab.find("[name='ultimateButtonX']").val(Math.round(ultimateDrag.nextX));
    tab.find("[name='ultimateButtonY']").val(Math.round(ultimateDrag.nextY)).trigger("input");
  }).on(`pointerup.tsru-ultimate-crop-${actor.id} pointercancel.tsru-ultimate-crop-${actor.id}`, () => { ultimateDrag=null; });
  ultimatePreview.on("wheel.tsru-ultimate-crop", "button", event => {
    if (!tab.find("[name='ultimateButtonAdjustEnabled']").prop("checked")) return;
    event.preventDefault();
    const input=tab.find("[name='ultimateButtonScale']"), next=clamp((Number(input.val())||100)+(event.originalEvent.deltaY<0?5:-5),50,400);
    input.val(next).trigger("input");
  });
  const splashDesigner = tab.find("[data-tsru-splash-designer]");
  let splashPreviewSequence = 0;
  const refreshSplashDesigner = async () => {
    if (!splashDesigner.length) return;
    const sequence = ++splashPreviewSequence;
    const image = String(tab.find("[name='splashImage']").val() || "");
    const x = clamp(Number(tab.find("[name='splashX']").val()), 0, 100);
    const y = clamp(Number(tab.find("[name='splashY']").val()), 0, 100);
    const scale = clamp(Number(tab.find("[name='splashScale']").val()), 25, 500);
    const titleX = clamp(Number(tab.find("[name='titleX']").val()), 0, 100);
    const titleY = clamp(Number(tab.find("[name='titleY']").val()), 0, 100);
    const titleSize = clamp(Number(tab.find("[name='titleSize']").val()), 16, 140);
    const align = ["left","center","right"].includes(tab.find("[name='titleAlign']").val()) ? tab.find("[name='titleAlign']").val() : "left";
    const element = getElements().find(entry => entry.id === tab.find("[name='elementId']").val());
    splashDesigner.css({"--tsru-splash-x":`${x}%`,"--tsru-splash-y":`${y}%`,"--tsru-splash-scale":String(scale/100),"--tsru-title-x":`${titleX}%`,"--tsru-title-y":`${titleY}%`,"--tsru-title-size":`${titleSize}px`,"--tsru-accent":element?.chargeColor||DEFAULT_CONFIG.chargeColor});
    const media = splashDesigner.find(".tsru-splash-designer-media");
    const isVideo = /\.(webm|mp4|m4v)(\?.*)?$/i.test(image);
    const current = media.children().first();
    if (!image) media.empty();
    else if (!current.length || current.attr("src") !== image || current.is("video") !== isVideo) media.html(isVideo ? `<video src="${escapeHTML(image)}" autoplay muted loop playsinline></video>` : `<img src="${escapeHTML(image)}" alt="${escapeHTML(actor.name)} Ultimate preview">`);
    const card = splashDesigner.find(".tsru-title-card").removeClass("tsru-align-left tsru-align-center tsru-align-right").addClass(`tsru-align-${align}`);
    card.find(".tsru-title-name").text(tab.find("[name='ultimateName']").val() || actor.name || "Ultimate");
    card.find(".tsru-title-subtitle").text(tab.find("[name='ultimateSubtitle']").val() || "");
    try {
      const [font,subtitleFont] = await Promise.all([loadSplashFont(tab.find("[name='fontFile']").val()),loadSplashFont(tab.find("[name='subtitleFontFile']").val()||tab.find("[name='fontFile']").val())]);
      if (sequence === splashPreviewSequence) splashDesigner.css({"--tsru-title-font":font,"--tsru-subtitle-font":subtitleFont});
    } catch (error) { console.warn(`${MODULE_ID} | Could not load splash designer font`, error); }
  };
  tab.on("input.tsru-splash-preview change.tsru-splash-preview", "[name='splashImage'], [name='splashX'], [name='splashY'], [name='splashScale'], [name='ultimateName'], [name='ultimateSubtitle'], [name='titleX'], [name='titleY'], [name='titleSize'], [name='titleAlign'], [name='fontFile'], [name='subtitleFontFile'], [name='elementId']", refreshSplashDesigner);
  refreshSplashDesigner();
  splashDesigner.on("dragover.tsru-splash-drop", event => { event.preventDefault(); splashDesigner.addClass("is-dragover"); });
  splashDesigner.on("dragleave.tsru-splash-drop", () => splashDesigner.removeClass("is-dragover"));
  splashDesigner.on("drop.tsru-splash-drop", event => {
    event.preventDefault(); splashDesigner.removeClass("is-dragover");
    const path = droppedAssetPath(event);
    if (path) tab.find("[name='splashImage']").val(path).trigger("change");
  });
  let splashDrag = null;
  splashDesigner.on("pointerdown.tsru-splash-drag", event => {
    if (event.button !== 0) return;
    event.preventDefault();
    splashDrag = {x:event.clientX,y:event.clientY,startX:Number(tab.find("[name='splashX']").val())||50,startY:Number(tab.find("[name='splashY']").val())||50};
  });
  $(document).off(`.tsru-splash-drag-${actor.id}`).on(`pointermove.tsru-splash-drag-${actor.id}`, event => {
    if (!splashDrag) return;
    const rect=splashDesigner[0].getBoundingClientRect();
    splashDrag.nextX=clamp(splashDrag.startX+(event.clientX-splashDrag.x)/Math.max(1,rect.width)*100,0,100);
    splashDrag.nextY=clamp(splashDrag.startY+(event.clientY-splashDrag.y)/Math.max(1,rect.height)*100,0,100);
    tab.find("[name='splashX']").val(Math.round(splashDrag.nextX));
    tab.find("[name='splashY']").val(Math.round(splashDrag.nextY)).trigger("input");
  }).on(`pointerup.tsru-splash-drag-${actor.id} pointercancel.tsru-splash-drag-${actor.id}`, () => { splashDrag=null; });
  splashDesigner.on("wheel.tsru-splash-zoom", event => {
    event.preventDefault();
    const input=tab.find("[name='splashScale']"), next=clamp((Number(input.val())||100)+(event.originalEvent.deltaY<0?5:-5),25,500);
    input.val(next).trigger("input");
  });
  let autosaveTimer = null;
  let autosaveRunning = false;
  let autosaveQueued = false;
  const runAutosave = async () => {
    if (autosaveRunning) { autosaveQueued = true; return; }
    autosaveRunning = true;
    try {
      await saveUltimateConfigFromTab(actor, tab);
      tab.addClass("tsru-autosave-saved");
      window.setTimeout(() => tab.removeClass("tsru-autosave-saved"), 500);
    } catch (error) {
      console.error(`${MODULE_ID} | Ultimate autosave failed`, error);
      ui.notifications.error(`Could not autosave ${actor.name}'s Ultimate configuration.`);
    } finally {
      autosaveRunning = false;
      if (autosaveQueued) { autosaveQueued = false; runAutosave(); }
    }
  };
  const scheduleAutosave = immediate => {
    window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(runAutosave, immediate ? 0 : 550);
  };
  tab.on("input.tsru-autosave change.tsru-autosave", "[name]", event => {
    if ($(event.target).closest(".tsru-energy-override").length) return;
    scheduleAutosave(event.type === "change" && ["checkbox", "select-one", "radio"].includes(event.target.type));
  });
  tab.find("[data-action='save-config']").on("click", async event => {
    event.preventDefault();
    event.stopPropagation();
    window.clearTimeout(autosaveTimer);
    await saveUltimateConfigFromTab(actor, tab, {notify: true, renderApp: true, app});
  });
  tab.find(".file-picker").on("click", event => {
    const button = event.currentTarget;
    const target = button.dataset.target;
    new FilePicker({type: button.dataset.type || "image", current: tab.find(`[name="${target}"]`).val(), callback: path => tab.find(`[name="${target}"]`).val(path).trigger("change")}).browse();
  });
  tab.find("input[data-color-for]").on("change", event => tab.find(`[name="${event.currentTarget.dataset.colorFor}"]`).val(event.currentTarget.value).trigger("change"));
  tab.find("[data-action='preview-splash']").on("click", () => {
    const element = getElements().find(entry => entry.id === tab.find("[name='elementId']").val());
    showSplash({actorName: actor.name, image: tab.find("[name='splashImage']").val(), duration: Number(tab.find("[name='splashDuration']").val()) || 1, splashX:Number(tab.find("[name='splashX']").val()), splashY:Number(tab.find("[name='splashY']").val()), splashScale:Number(tab.find("[name='splashScale']").val()), ultimateName: tab.find("[name='ultimateName']").val(), ultimateSubtitle: tab.find("[name='ultimateSubtitle']").val(), titleX: Number(tab.find("[name='titleX']").val()), titleY: Number(tab.find("[name='titleY']").val()), titleSize: Number(tab.find("[name='titleSize']").val()), titleAlign: tab.find("[name='titleAlign']").val(), fontFile: tab.find("[name='fontFile']").val(), subtitleFontFile: tab.find("[name='subtitleFontFile']").val(), color: element?.chargeColor || DEFAULT_CONFIG.chargeColor});
  });
  tab.find("[data-action='set-energy']").on("click", async event => {
    event.preventDefault();
    event.stopPropagation();
    const config = getConfig(actor);
    const value = clamp(tab.find(".tsru-energy-override-value").val(), 0, config.max);
    const applied = await setEnergy(actor, value, {overrideLock: true});
    tab.find("[name='current']").val(applied);
    tab.find(".tsru-energy-override-value").val(applied);
    refreshOrb(actor);
    ui.notifications.info(`${actor.name}'s Energy was set to ${applied}/${config.max}.`);
  });
  tab.find("[data-action='reset-energy']").on("click", async () => { await setEnergy(actor, 0, {overrideLock: true}); app.render(false); });
  tab.find("[data-action='fill-energy']").on("click", async () => { await setEnergy(actor, getConfig(actor).max, {overrideLock: true}); app.render(false); });
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

function refreshEidolonStageSlot(tab, number, slot) {
  if (!tab?.length || !slot) return;
  const art = tab.find(`[data-eidolon-art="${number}"]`);
  art.attr("data-fallback-art", slot.artwork || "").toggleClass("locked", !slot.active);
  art.find("img").attr("src", slot.artwork || "");
  art.css("--art-x", `${slot.offsetX}%`).css("--art-y", `${slot.offsetY}%`).css("--art-scale", String(slot.scale / 100));
  const title = tab.find(`[data-eidolon-title="${number}"]`);
  title.toggleClass("locked", !slot.active).find("span").text(slot.title || `Eidolon ${number}`);
}

function refreshEidolonTabDisplay(actor, tab) {
  const data = getEidolons(actor);
  for (const slot of data.slots) refreshEidolonStageSlot(tab, slot.number, slot);
}

function refreshEidolonStageDraft(tab, editor, number) {
  if (!editor?.length) return;
  refreshEidolonStageSlot(tab, number, {
    artwork: String(editor.find(`[name="eidolon.${number}.artwork"]`).val() || ""),
    title: String(editor.find(`[name="eidolon.${number}.title"]`).val() || `Eidolon ${number}`),
    offsetX: clamp(editor.find(`[name="eidolon.${number}.offsetX"]`).val(), -100, 100),
    offsetY: clamp(editor.find(`[name="eidolon.${number}.offsetY"]`).val(), -100, 100),
    scale: clamp(editor.find(`[name="eidolon.${number}.scale"]`).val(), 25, 400),
    active: editor.find(`[name="eidolon.${number}.active"]`).prop("checked")
  });
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

async function saveEidolonCurrencyFromTab(actor, tab, {notify = false} = {}) {
  const data = getEidolons(actor);
  data.currencyUuid = String(tab.find('[name="eidolonCurrencyUuid"]').val() || "").trim();
  await actor.update({[`flags.${MODULE_ID}.eidolons`]: data}, {tsruAutosave: !notify, render: false});
  if (notify) ui.notifications.info(`${actor.name}'s Eidolon activation currency was saved.`);
}

async function saveEidolonSlotFromEditor(actor, scope, number, {notify = false} = {}) {
  const data = getEidolons(actor);
  const slot = data.slots[number - 1];
  const editor = scope.find(`[data-eidolon-editor="${number}"]`);
  if (!slot || !editor.length) return;
  slot.title = String(editor.find(`[name="eidolon.${number}.title"]`).val() || `Eidolon ${number}`);
  slot.artwork = String(editor.find(`[name="eidolon.${number}.artwork"]`).val() || "");
  slot.offsetX = clamp(editor.find(`[name="eidolon.${number}.offsetX"]`).val(), -100, 100);
  slot.offsetY = clamp(editor.find(`[name="eidolon.${number}.offsetY"]`).val(), -100, 100);
  slot.scale = clamp(editor.find(`[name="eidolon.${number}.scale"]`).val(), 25, 400);
  slot.active = editor.find(`[name="eidolon.${number}.active"]`).prop("checked");
  await actor.update({[`flags.${MODULE_ID}.eidolons`]: data}, {tsruAutosave: !notify, render: false});
  if (notify) ui.notifications.info(`${actor.name}'s E${number} appearance was saved.`);
}

async function selectExistingEidolons(actor) {
  if (!game.user.isGM) return ui.notifications.warn("Only a GM can import existing Eidolons.");
  const sources = Array.from(game.actors ?? [])
    .filter(source => source.type === "character" && source.id !== actor.id)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  if (!sources.length) return ui.notifications.warn("There are no other player-character sheets to import Eidolons from.");

  const options = sources.map(source => `<option value="${escapeHTML(source.id)}">${escapeHTML(source.name)}</option>`).join("");
  const content = `<form class="tsru-eidolon-import"><div class="form-group"><label>Select character</label><div class="form-fields"><select name="sourceActorId">${options}</select></div></div><p class="notes">Copies all six Eidolon titles, artwork, crop positions, scale, and activation state. The destination sheet's activation currency is preserved.</p></form>`;
  new Dialog({
    title: `Select Existing Eidolons — ${actor.name}`,
    content,
    buttons: {
      ok: {
        icon: '<i class="fas fa-check"></i>',
        label: "OK",
        callback: async html => {
          const sourceId = String(html.find('[name="sourceActorId"]').val() || "");
          const source = game.actors.get(sourceId);
          if (!source) return ui.notifications.error("The selected character sheet could not be found.");
          const sourceData = getEidolons(source);
          const destinationData = getEidolons(actor);
          destinationData.slots = sourceData.slots.map((slot, index) => ({
            number: index + 1,
            active: Boolean(slot.active),
            title: String(slot.title || `Eidolon ${index + 1}`),
            artwork: String(slot.artwork || ""),
            offsetX: clamp(slot.offsetX, -100, 100),
            offsetY: clamp(slot.offsetY, -100, 100),
            scale: clamp(slot.scale, 25, 400)
          }));
          await actor.update({[`flags.${MODULE_ID}.eidolons`]: destinationData});
          ui.notifications.info(`Imported Eidolons from ${source.name} to ${actor.name}.`);
          for (const sheet of Object.values(ui.windows ?? {})) {
            if ((sheet.actor ?? sheet.document)?.id === actor.id) sheet.render(false);
          }
        }
      },
      cancel: {icon: '<i class="fas fa-times"></i>', label: "Cancel"}
    },
    default: "ok"
  }).render(true);
}

function activateEidolonListeners(actor, tab, app) {
  tab.find("[data-action='activate-eidolon']").on("click", async event => activateEidolon(actor, Number(event.currentTarget.dataset.eidolon)));
  if (!game.user.isGM) return;

  tab.find("[data-action='select-existing-eidolons']").on("click", () => selectExistingEidolons(actor));

  const slotTimers = new Map();
  const slotRunning = new Set();
  const slotQueued = new Set();
  const runSlotAutosave = async (number, scope) => {
    if (slotRunning.has(number)) { slotQueued.add(number); return; }
    slotRunning.add(number);
    try {
      await saveEidolonSlotFromEditor(actor, scope, number);
      scope.addClass("tsru-autosave-saved");
      window.setTimeout(() => scope.removeClass("tsru-autosave-saved"), 500);
    } catch (error) {
      console.error(`${MODULE_ID} | Eidolon autosave failed`, error);
      ui.notifications.error(`Could not autosave ${actor.name}'s E${number} configuration.`);
    } finally {
      slotRunning.delete(number);
      if (slotQueued.delete(number)) runSlotAutosave(number, scope);
    }
  };
  const scheduleSlotAutosave = (number, scope, immediate = false) => {
    window.clearTimeout(slotTimers.get(number));
    slotTimers.set(number, window.setTimeout(() => runSlotAutosave(number, scope), immediate ? 0 : 550));
  };
  let currencyTimer = null;
  const scheduleCurrencyAutosave = immediate => {
    window.clearTimeout(currencyTimer);
    currencyTimer = window.setTimeout(() => saveEidolonCurrencyFromTab(actor, tab).catch(error => {
      console.error(`${MODULE_ID} | Eidolon currency autosave failed`, error);
      ui.notifications.error(`Could not autosave ${actor.name}'s Eidolon currency.`);
    }), immediate ? 0 : 550);
  };

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
        scope.find(`[name="${target}"]`).val(path).trigger("input").trigger("change");
        restorePopout();
      }
    });
    const originalClose = picker.close.bind(picker);
    picker.close = async (...args) => {
      try { return await originalClose(...args); }
      finally { restorePopout(); }
    };
    if (popout.length) popout.prop("hidden", true);
    Promise.resolve(picker.browse()).catch(error => {
      restorePopout();
      console.error(`${MODULE_ID} | Could not open Eidolon artwork browser`, error);
    });
  });
  tab.find("[data-eidolon-editor] input").on("input change", event => {
    const editorElement = event.currentTarget.closest("[data-eidolon-editor]");
    const number = Number(editorElement.dataset.eidolonEditor);
    const popout = $(event.currentTarget).closest("[data-eidolon-popout]");
    refreshEidolonPreview(popout, number);
    refreshEidolonStageDraft(tab, $(editorElement), number);
    scheduleSlotAutosave(number, popout, event.type === "change" && ["checkbox", "radio"].includes(event.currentTarget.type));
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
    const finish = () => {
      event.currentTarget.removeEventListener("pointermove", move);
      event.currentTarget.removeEventListener("pointerup", finish);
      event.currentTarget.removeEventListener("pointercancel", finish);
      scheduleSlotAutosave(slot, popout, true);
    };
    event.currentTarget.addEventListener("pointermove", move);
    event.currentTarget.addEventListener("pointerup", finish);
    event.currentTarget.addEventListener("pointercancel", finish);
  });
  tab.find('[name="eidolonCurrencyUuid"]').on("input change", event => scheduleCurrencyAutosave(event.type === "change"));
  tab.find('[name="eidolonCurrencyUuid"]').on("drop", event => {
    event.preventDefault();
    try {
      const dropped = JSON.parse(event.originalEvent?.dataTransfer?.getData("text/plain") || "{}");
      if (dropped.type === "Item" && dropped.uuid) {
        event.currentTarget.value = dropped.uuid;
        $(event.currentTarget).trigger("change");
      }
    } catch (_error) {}
  });
  tab.find("[data-action='save-eidolon-currency']").on("click", async () => {
    window.clearTimeout(currencyTimer);
    await saveEidolonCurrencyFromTab(actor, tab, {notify: true});
  });
  tab.find("[data-action='save-eidolon']").on("click", async event => {
    const number = Number(event.currentTarget.dataset.eidolon);
    window.clearTimeout(slotTimers.get(number));
    const popout = $(event.currentTarget).closest("[data-eidolon-popout]");
    await saveEidolonSlotFromEditor(actor, popout, number, {notify: true});
    const returnParent = popout.data("tsru-return-parent");
    popout.prop("hidden", true).removeClass("open");
    if (returnParent?.isConnected) popout.appendTo(returnParent);
    else popout.remove();
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
  if (existingControl.length && existingTab.length) {
    refreshEidolonTabDisplay(actor, existingTab);
    return;
  }
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
  const weaknessMode = toughnessWeaknessMode(token);
  const visibleWeaknesses = weaknessMode === "none" ? [] : weaknessMode === "all" ? effectiveWeaknesses : game.user?.isGM
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
    title: "Show Combat Party HUD",
    icon: "fas fa-users",
    order: 90,
    button: true,
    visible: game.user.isGM,
    onClick: () => showCombatPartyHud(),
    onChange: () => showCombatPartyHud()
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
    requestTechnique,
    showTalentPopup,
    getTechniquePoints: currentTechniquePoints,
    setTechniquePoints,
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
    openAhaConfig: () => new AhaConfig().render(true),
    openSkillPointConfig: () => new SkillPointConfig().render(true),
    openTalentPointConfig: () => new TalentPointConfig().render(true),
    openTechniquePointConfig: () => new TechniquePointConfig().render(true),
    openEidolonConfig: () => new EidolonAppearanceConfig().render(true),
    openLightConeGenerator,
    openCombatHudDesigner,
    triggerSpecialAha,
    showSkillUI,
    showTalentUI,
    refreshResourceHuds,
    getPunchline: currentPunchline,
    setPunchline,
    addPunchline,
    spendPunchline,
    showSplash,
    refreshOrbs: refreshAllOrbs,
    showOrb,
    showCombatPartyHud,
    showAhaButton,
    triggerAhaInstant,
    openElementManager: () => new ElementManager().render(true),
    openPathManager: () => new PathManager().render(true),
    toggleAhaOrb: async () => {
      const layout = ahaLayout();
      await saveAhaLayout({visible: !layout.visible});
      refreshAhaButton();
      return !layout.visible;
    },
    showUltimateUI: () => showCombatPartyHud({notify: false})
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
  refreshResourceHuds();
  refreshTalentPointFont();
  preloadAhaVideo();
  registerAhaToolbarFallback();
  if (game.modules.get("midi-qol")?.active) Hooks.on("midi-qol.RollComplete", processMidiWorkflow);
  if (game.modules.get("midi-qol")?.active) Hooks.on("midi-qol.damageRollComplete", processMidiWorkflow);
  Hooks.on("dnd5e.rollDamageV2", processDnd5eDamageRolls);
  Hooks.on("dnd5e.applyDamage", (...args) => processDnd5eAppliedDamage(...args));
  installDamageScrollingTextOverride();
  repairSelectedLightConeAttunements().catch(error => console.error(`${MODULE_ID} | Failed to repair Light Cone attunement`, error));
  refreshCombatPartyHud();
});

Hooks.on("dnd5e.prepareSheetContext", prepareLightConeAttunementContext);

Hooks.on("canvasReady", installDamageScrollingTextOverride);

Hooks.on("preCreateActor", actor => {
  if (actor.type !== "character" || foundry.utils.hasProperty(actor._source, `flags.${MODULE_ID}.eidolons`)) return;
  actor.updateSource({[`flags.${MODULE_ID}.eidolons`]: eidolonDataDefaults()});
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
    injectLightConeSheetPanel(app, html);
    activateLightConeInventoryContext(app, html);
    observeCharacterSheetTabs(app);
    requestAnimationFrame(() => {
      const root = app.element?.jquery ? app.element : $(app.element);
      injectUltimateTab(app, root);
      injectEidolonTab(app, root);
      injectEnergyAbility(app, root);
      injectCharacterBadges(app, root);
      injectLightConeSheetPanel(app, root);
      activateLightConeInventoryContext(app, root);
    });
  }
  if (actor?.documentName === "Actor" && actor.type === "npc") injectToughnessHeaderButton(app, html);
});
Hooks.on("renderActorSheet", injectEnergyAbility);
Hooks.on("renderCharacterActorSheet", injectEnergyAbility);
Hooks.on("renderActorSheet", injectCharacterBadges);
Hooks.on("renderCharacterActorSheet", injectCharacterBadges);
Hooks.on("renderActorSheet", injectLightConeSheetPanel);
Hooks.on("renderCharacterActorSheet", injectLightConeSheetPanel);
Hooks.on("renderActorSheet", activateLightConeInventoryContext);
Hooks.on("renderCharacterActorSheet", activateLightConeInventoryContext);
Hooks.on("getActorSheetHeaderButtons", addActorHeaderButton);
Hooks.on("getSceneControlButtons", addHudTool);
Hooks.on("hotbarDrop", (_bar, data, slot) => {
  if (data?.type !== "TSRUAction") return true;
  createStarRailActionMacro(data, slot).catch(error => { console.error(`${MODULE_ID} | Could not create action macro`, error); ui.notifications.error(`Could not create Star Rail macro: ${error.message}`); });
  return false;
});
Hooks.on("renderHotbar", () => requestAnimationFrame(refreshUltimateHotbarMacros));
Hooks.on("createMacro", () => requestAnimationFrame(refreshUltimateHotbarMacros));
Hooks.on("updateMacro", () => requestAnimationFrame(refreshUltimateHotbarMacros));
Hooks.on("deleteMacro", () => requestAnimationFrame(refreshUltimateHotbarMacros));
Hooks.on("createChatMessage", processCoreAttackMessage);

function renderManualDamageControl(controlElement, message, suppliedApplications = null, suppliedDone = null) {
  if (!controlElement || !message) return;
  const control = $(controlElement);
  const amount = manualChatDamageAmount(message);
  const breakDamageRoll = Boolean(message.getFlag(MODULE_ID, "breakDamageRoll"));
  const superBreakDamageRoll = Boolean(message.getFlag(MODULE_ID, "superBreakDamageRoll"));
  const applyDamageLabel = breakDamageRoll ? `Apply ${amount} ${superBreakDamageRoll ? "Super Break" : "Break"} as HP Damage` : `Apply ${amount} as damage`;
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
  const applyButton = $(`<button type="button" class="tsru-chat-damage-apply"><i class="fas fa-crosshairs"></i><span>${applyDamageLabel}</span></button>`);
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
      const result = await applyChatRollAsDamage(message, target.document ?? target, game.user, applicationId);
      const notify = result.ok ? ui.notifications.info : ui.notifications.error;
      notify.call(ui.notifications, result.message);
      renderManualDamageControl(controlElement, message, result.applications, result.done);
    } else {
      game.socket.emit(SOCKET, {type: "applyManualChatDamage", sourceUserId: game.user.id, messageId: message.id, targetUuid, applicationId});
      window.setTimeout(() => {
        if (button.isConnected && button.disabled) {
          button.disabled = false;
          button.innerHTML = `<i class="fas fa-crosshairs"></i><span>${applyDamageLabel}</span>`;
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
  const lightConeActor = actorFromChatMessage(message);
  const lightCone = Array.isArray(message.rolls) && message.rolls.length && lightConeActor ? equippedLightCone(lightConeActor) : null;
  if (lightCone && !root.find("[data-tsru-light-cone-info]").length) {
    const info = $(`<details class="tsru-light-cone-roll-info" data-tsru-light-cone-info><summary><i class="fas fa-id-card"></i> Light Cone Info</summary><button type="button"><img src="${escapeHTML(getLightConeData(lightCone).image)}"><span>Post ${escapeHTML(lightCone.name)} to chat</span></button></details>`);
    const destination = root.find(".message-content").last();
    (destination.length ? destination : root).append(info);
    info.find("button").on("click.tsru", () => postLightConeToChat(lightCone, lightConeActor));
  }
  const roller = actorFromChatMessage(message);
  if (manualChatDamageAmount(message) > 0 && roller && (game.user.isGM || roller.isOwner) && !root.find("[data-tsru-temp-hp-message]").length) {
    const tempHpControl = $('<div class="tsru-chat-temp-hp-control"></div>');
    const tempHpButton = $(`<button type="button" data-tsru-temp-hp-message="${escapeHTML(message.id)}"><i class="fas fa-shield-halved"></i><span>Add as TempHP</span></button>`);
    tempHpControl.append(tempHpButton);
    const destination = root.find(".message-content").last();
    (destination.length ? destination : root).append(tempHpControl);
    tempHpButton.on("click.tsru", async event => {
      const button = event.currentTarget;
      const targets = [...(game.user.targets ?? [])];
      if (targets.length !== 1) return ui.notifications.warn("Target exactly one creature before adding this roll as temporary HP.");
      const target = targets[0];
      const targetUuid = target.document?.uuid ?? target.actor?.uuid;
      if (!targetUuid) return ui.notifications.error("The targeted creature could not be resolved.");
      button.disabled = true;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Adding Temp HP…</span>';
      if (isAuthority()) {
        const result = await applyChatRollAsTempHp(message, target.document ?? target, game.user);
        const notify = result.ok ? ui.notifications.info : ui.notifications.error;
        notify.call(ui.notifications, result.message);
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-shield-halved"></i><span>Add as TempHP</span>';
      } else if (activeGM()) {
        game.socket.emit(SOCKET, {type: "applyChatTempHp", sourceUserId: game.user.id, messageId: message.id, targetUuid});
        window.setTimeout(() => {
          if (button.isConnected && button.disabled) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-shield-halved"></i><span>Add as TempHP</span>';
          }
        }, 5000);
      } else {
        ui.notifications.error("A GM must be connected to add temporary HP.");
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-shield-halved"></i><span>Add as TempHP</span>';
      }
    });
  }
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
Hooks.on("updateActor", (actor, changes, options) => {
  refreshOrb(actor);
  refreshSkillUI();
  refreshTalentCounter(actor);
  refreshResourceHuds();
  refreshToughnessBars();
  state.gmPanel?.refreshLiveValues();
  refreshCombatPartyHud();
  refreshUltimateHotbarMacros();
  refreshPunchlineHUD();
  const talentChanges = foundry.utils.getProperty(changes, `flags.${MODULE_ID}.ultimate`);
  if (isAuthority() && actor.type === "character" && talentChanges && (
    Object.hasOwn(talentChanges, "talentPointsCurrent") ||
    Object.hasOwn(talentChanges, "talentPointsMax") ||
    Object.hasOwn(talentChanges, "talentPointsOvercapMax") ||
    Object.hasOwn(talentChanges, "talentCombatId")
  )) {
    const combat = talentCombatForActor(actor);
    if (combat) {
      const config = getConfig(actor);
      if (config.talentCombatId !== combat.id) {
        actor.update({[`flags.${MODULE_ID}.ultimate.talentCombatId`]: combat.id}).catch(error =>
          console.error(`${MODULE_ID} | Could not bind ${actor.name}'s Talent points to combat`, error)
        );
      } else if (talentPointLimits(actor).trigger > 0 && currentTalentPoints(actor) >= talentPointLimits(actor).trigger) {
        queueTalentTurn(actor, combat);
        window.setTimeout(() => processTalentTurnQueue(combat).catch(error => {
          console.error(`${MODULE_ID} | Could not reconcile ${actor.name}'s ready Talent turn`, error);
          ui.notifications.error(`Could not insert ${actor.name}'s Talent turn: ${error.message}`);
        }), 0);
      }
    }
  }
  if (isAuthority() && actor.type === "character" && game.combat) maybeEnsureAhaCombatant(game.combat);
  if (!options?.tsruAutosave && foundry.utils.hasProperty(changes, `flags.${MODULE_ID}.eidolons`)) {
    for (const app of Object.values(ui.windows ?? {})) if ((app.actor ?? app.document)?.id === actor.id) app.render(false);
  }
  if (actor.type === "character" && Number(getConfig(actor).current) >= Number(getConfig(actor).max) && state.ultimateLocks.has(actor.id)) {
    reconcileUltimateLock(actor.id);
  }
});
Hooks.on("updateToken", () => { refreshToughnessBars(); refreshResourceHuds(); state.gmPanel?.render(false); });
Hooks.on("targetToken", user => { if (user.id === game.user.id) state.gmPanel?.refreshTargetHighlights(); });
Hooks.on("controlToken", () => state.gmPanel?.refreshTargetHighlights());
Hooks.on("deleteActor", actor => { state.orbs.get(actor.id)?.destroy(); state.skillButtons.get(actor.id)?.destroy(); state.talentButtons.get(actor.id)?.destroy(); refreshResourceHuds(); });
Hooks.on("updateUser", user => { if (user.id === game.user.id) { refreshAllOrbs(); refreshSkillUI(); refreshResourceHuds(); refreshCombatPartyHud(); } });
Hooks.on("updateSetting", setting => {
  if (setting?.key?.startsWith(`${MODULE_ID}.skillPoint`)) refreshSkillUI();
  if (setting?.key === `${MODULE_ID}.talentPointConfig`) {
    refreshTalentPointFont();
    refreshResourceHuds();
    refreshCombatPartyHud();
  }
  if (setting?.key?.startsWith(`${MODULE_ID}.techniquePoint`)) refreshResourceHuds();
  if (setting?.key === `${MODULE_ID}.elements`) {
    refreshAllOrbs();
    refreshCombatPartyHud();
    refreshUltimateHotbarMacros();
  }
  if (setting?.key === `${MODULE_ID}.paths`) refreshCombatPartyHud();
  if (setting?.key === `${MODULE_ID}.partySelections`) { refreshCombatPartyHud(); refreshTalentButtons(); }
  if (setting?.key === `${MODULE_ID}.combatHudDesign`) {
    refreshCombatPartyHud();
    for (const app of Object.values(ui.windows ?? {})) if ((app.actor ?? app.document)?.type === "character") app.render(false);
  }
  if (setting?.key === `${MODULE_ID}.ahaConfig` || setting?.key === `${MODULE_ID}.punchline`) {
    if (!getAhaConfig().elationEnabled) document.querySelectorAll(".tsru-aha-overlay").forEach(element => element.remove());
    refreshAhaButton();
    refreshPunchlineHUD();
    if (setting?.key === `${MODULE_ID}.ahaConfig`) preloadAhaVideo();
  }
  if (setting?.key === `${MODULE_ID}.punchlineOverride`) refreshPunchlineHUD();
});
Hooks.on("canvasReady", () => { refreshAllOrbs(); refreshSkillUI(); refreshPunchlineHUD(); refreshToughnessBars(); refreshCombatPartyHud(); });
Hooks.on("canvasReady", refreshAhaButton);

Hooks.on("deleteCombat", async combat => {
  refreshResourceHuds();
  state.partyCombatHud?.destroy();
  state.punchlineMeter?.destroy();
  state.skillMeter?.destroy();
  await dispatchTalentEvent("combatEnd", {combat}, combat.id);
  state.lastTalentTurns.delete(combat.id);
  state.lastCombatTurns.delete(combat.id);
  state.talentTurnQueues.delete(combat.id);
  state.talentTurnQueueLocks.delete(combat.id);
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
  for (const actor of game.actors.filter(entry => entry.type === "character")) refreshTalentCounter(actor);
  state.gmPanel?.render(false);
});

Hooks.on("updateCombat", async combat => {
  refreshToughnessBars();
  refreshResourceHuds();
  refreshCombatPartyHud();
  refreshPunchlineHUD();
  refreshSkillUI();
  for (const actor of game.actors.filter(entry => entry.type === "character")) refreshTalentCounter(actor);
  state.gmPanel?.render(false);
  if (!isAuthority()) return;
  await clearExpiredEnergyLocks(combat);
  const previousTurn = state.lastCombatTurns.get(combat.id);
  const currentTurn = combatTurnSnapshot(combat);
  state.lastCombatTurns.set(combat.id, currentTurn);
  if (state.suppressCombatHook) return;
  if (previousTurn?.id && (previousTurn.id !== currentTurn?.id || previousTurn.round !== combat.round)) {
    await restoreBrokenCombatant(combat.combatants.get(previousTurn.id));
    if (await cleanupDepartedTemporaryTurn(combat, previousTurn)) {
      await removeOrphanedTemporaryTurns(combat);
      state.lastCombatTurns.set(combat.id, combatTurnSnapshot(combat));
      state.gmPanel?.render(false);
      return;
    }
  }
  await removeOrphanedTemporaryTurns(combat);
  if (previousTurn?.id && (previousTurn.id !== currentTurn?.id || previousTurn.round !== combat.round) && await processTalentTurnQueue(combat)) return;
  if (await skipBrokenCombatantTurn(combat, combat.combatant)) return;
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
  if (isTalentTurnCombatant(current)) {
    await beginTalentTurn(current);
    return;
  }
  const temporary = current;
  if (!temporary?.getFlag(MODULE_ID, "temporaryUltimate")) return;
  const actor = temporary.actor;
  if (!actor || state.ultimateLocks.has(actor.id)) return;
  await removeUltimateTurn(temporary);
});

Hooks.on("updateCombatant", async (combatant, changed) => {
  if (!isAuthority() || isAhaCombatant(combatant) || isElationActionCombatant(combatant) || isTalentTurnCombatant(combatant) || !("initiative" in changed)) return;
  await maybeEnsureAhaCombatant(combatant.parent);
});

Hooks.on("createCombatant", combatant => {
  state.gmPanel?.render(false);
  window.setTimeout(refreshToughnessBars, 150);
  window.setTimeout(refreshCombatPartyHud, 150);
  if (isAhaCombatant(combatant) || isElationActionCombatant(combatant) || isTalentTurnCombatant(combatant)) return;
  window.setTimeout(() => maybeEnsureAhaCombatant(combatant.parent), 100);
});

Hooks.on("combatStart", async combat => {
  refreshCombatPartyHud();
  refreshPunchlineHUD();
  refreshSkillUI();
  state.lastCombatTurns.set(combat.id, combatTurnSnapshot(combat));
  if (isAuthority()) {
    await setSkillPoints(getSkillPointConfig().starting);
    for (const actor of game.actors.filter(entry => talentCombatForActor(entry))) await setTalentPoints(actor, 0);
    await dispatchTalentEvent("combatStart", {combat}, combat.id);
  }
  for (const actor of game.actors.filter(entry => entry.type === "character")) refreshTalentCounter(actor);
  await maybeEnsureAhaCombatant(combat, {force: true});
  // Foundry can emit combatStart before every client has observed the updated
  // `started` state. Refresh again on the next task so combat-only HUDs do not
  // remain hidden after being destroyed between encounters.
  window.setTimeout(() => {
    refreshResourceHuds();
    refreshCombatPartyHud();
    refreshPunchlineHUD();
    refreshSkillUI();
  }, 100);
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
  window.setTimeout(refreshCombatPartyHud, 100);
  window.setTimeout(() => {
    refreshPunchlineHUD();
    if (isAuthority() && combatant.parent) maybeEnsureAhaCombatant(combatant.parent);
  }, 100);
});

for (const hook of ["createToken", "deleteToken"]) Hooks.on(hook, token => {
  const actor = token.actor ?? game.actors.get(token.actorId);
  if (actor?.type === "character") refreshTalentCounter(actor);
  state.gmPanel?.render(false);
});
