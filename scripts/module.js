const MODULE_ID = "telys-star-rail-ultimates";
const SOCKET = `module.${MODULE_ID}`;

const DEFAULT_PATHS = Object.freeze([
  {id:"abundance",name:"Abundance",icon:`modules/${MODULE_ID}/assets/paths/Path_Abundance.png`,color:"#e5c878"},
  {id:"beauty",name:"Beauty",icon:`modules/${MODULE_ID}/assets/paths/Path_Beauty.png`,color:"#e5c878"},
  {id:"enigmata",name:"Enigmata",icon:`modules/${MODULE_ID}/assets/paths/Path_Enigmata.png`,color:"#e5c878"},
  {id:"equilibrium",name:"Equilibrium",icon:`modules/${MODULE_ID}/assets/paths/Path_Equilibrium.png`,color:"#e5c878"},
  {id:"finality",name:"Finality",icon:`modules/${MODULE_ID}/assets/paths/Path_Finality.png`,color:"#e5c878"},
  {id:"fracture",name:"Fracture",icon:`modules/${MODULE_ID}/assets/paths/Path_Fracture.png`,color:"#e5c878"},
  {id:"harmony",name:"Harmony",icon:`modules/${MODULE_ID}/assets/paths/Path_Harmony.png`,color:"#e5c878"},
  {id:"nihility",name:"Nihility",icon:`modules/${MODULE_ID}/assets/paths/Path_Nihility.png`,color:"#e5c878"},
  {id:"order",name:"Order",icon:`modules/${MODULE_ID}/assets/paths/Path_Order.png`,color:"#e5c878"},
  {id:"permanence",name:"Permanence",icon:`modules/${MODULE_ID}/assets/paths/Path_Permanence.png`,color:"#e5c878"},
  {id:"propagation",name:"Propagation",icon:`modules/${MODULE_ID}/assets/paths/Path_Propagation.png`,color:"#e5c878"},
  {id:"remembrance",name:"Remembrance",icon:`modules/${MODULE_ID}/assets/paths/Path_Remembrance.png`,color:"#e5c878"},
  {id:"trailblaze",name:"Trailblaze",icon:`modules/${MODULE_ID}/assets/paths/Path_Trailblaze.png`,color:"#e5c878"},
  {id:"voracity",name:"Voracity",icon:`modules/${MODULE_ID}/assets/paths/Path_Voracity.png`,color:"#e5c878"}
]);

const DEFAULT_CRAFTING_CLASSIFICATIONS = Object.freeze([
  {id:"consumables",name:"Consumables",icon:"fas fa-flask"},
  {id:"materials",name:"Materials",icon:"fas fa-cubes-stacked"},
  {id:"equipment",name:"Equipment",icon:"fas fa-shield-halved"},
  {id:"other",name:"Other",icon:"fas fa-box"}
]);

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
  isBoss: false,
  bossPhaseCount: 1,
  bossPhase2ActorUuid: "",
  bossPhase3ActorUuid: "",
  bossPhase2TokenWidth: 0,
  bossPhase2TokenHeight: 0,
  bossPhase3TokenWidth: 0,
  bossPhase3TokenHeight: 0,
  bossInheritsMainPhaseCount: false,
  bossHudPortrait: "",
  bossHudPortraitX: 50,
  bossHudPortraitY: 50,
  bossHudPortraitScale: 100,
  bossHudWidth: 920,
  bossHudHealthHeight: 20,
  bossHudToughnessHeight: 9,
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
  carouselImage: "",
  carouselImageX: 50,
  carouselImageY: 50,
  carouselImageScale: 100,
  carouselImageFlip: false,
  carouselFrameColorOverride: false,
  carouselFrameColorPreset: "ally-blue",
  carouselFrameColor: "#58dfee",
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
  techniqueButtons: new Map(),
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
  partyCombatHud: null,
  bossHud: null,
  bossPhaseControl: null,
  initiativePortraitEditors: new Map(),
  bossTransitionLocks: new Set()
};
state.craftingApp = null;
state.craftingLocks = new Set();
state.initiativeCarousel = null;
state.bossTransitionVisuals = 0;
state.bossTransitionVisualsUntil = 0;

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
  combatantImage: "icons/svg/mystery-man.svg",
  combatantImageX: 50,
  combatantImageY: 50,
  combatantImageScale: 100,
  combatantImageFlip: false
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

const DEFAULT_INITIATIVE_CAROUSEL_CONFIG = Object.freeze({
  enabled: true,
  allowLengthResize: true,
  maximumWidth: 220,
  maximumHeight: 900
});
const DEFAULT_INITIATIVE_FRAME_COLORS=Object.freeze([
  {id:"ally-blue",name:"Ally Blue",color:"#58dfee"},
  {id:"enemy-red",name:"Enemy Red",color:"#e54b55"},
  {id:"elation-pink",name:"Elation Pink",color:"#ff77df"},
  {id:"gold",name:"Gold",color:"#e5c878"}
]);

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
  config.bossPhaseCount = clamp(Math.floor(Number(config.bossPhaseCount) || 1), 1, 3);
  for(const key of ["bossPhase2TokenWidth","bossPhase2TokenHeight","bossPhase3TokenWidth","bossPhase3TokenHeight"])config[key]=clamp(config[key],0,20);
  config.bossHudPortraitX = clamp(config.bossHudPortraitX, 0, 100);
  config.bossHudPortraitY = clamp(config.bossHudPortraitY, 0, 100);
  config.bossHudPortraitScale = clamp(config.bossHudPortraitScale, 50, 400);
  config.bossHudWidth = clamp(config.bossHudWidth, 420, 1400);
  config.bossHudHealthHeight = clamp(config.bossHudHealthHeight, 12, 48);
  config.bossHudToughnessHeight = clamp(config.bossHudToughnessHeight, 4, 24);
  config.carouselImageScale = clamp(config.carouselImageScale, 50, 800);
  const carouselBounds=initiativePortraitPositionBounds(config.carouselImageScale);
  config.carouselImageX = clamp(config.carouselImageX, carouselBounds.min, carouselBounds.max);
  config.carouselImageY = clamp(config.carouselImageY, carouselBounds.min, carouselBounds.max);
  config.carouselImageFlip = Boolean(config.carouselImageFlip);
  config.carouselFrameColorOverride = Boolean(config.carouselFrameColorOverride);
  if(!/^#[0-9a-f]{6}$/i.test(String(config.carouselFrameColor??"")))config.carouselFrameColor="#58dfee";
  return config;
}

function initiativePortraitPositionBounds(scalePercent){
  const scale=clamp(Number(scalePercent)||100,50,800);
  const travel=Math.max(1050,scale*1.5);
  return {min:Math.floor(50-travel),max:Math.ceil(50+travel)};
}

function getInitiativeCarouselConfig() {
  const stored = game.settings.get(MODULE_ID, "initiativeCarouselConfig") ?? {};
  const config = foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_INITIATIVE_CAROUSEL_CONFIG), stored, {inplace:false, insertKeys:true, overwrite:true});
  config.enabled = Boolean(config.enabled);
  config.allowLengthResize = config.allowLengthResize !== false;
  config.maximumWidth = clamp(config.maximumWidth, 190, 420);
  config.maximumHeight = clamp(config.maximumHeight, 260, 1200);
  return config;
}

function getInitiativeFrameColors(){const stored=game.settings.get(MODULE_ID,"initiativeFrameColors");return (Array.isArray(stored)&&stored.length?stored:DEFAULT_INITIATIVE_FRAME_COLORS).map(entry=>({id:String(entry.id||foundry.utils.randomID()),name:String(entry.name||"Frame Color"),color:/^#[0-9a-f]{6}$/i.test(String(entry.color||""))?String(entry.color):"#58dfee"}));}
function resolvedInitiativeFrameColor(config){return getInitiativeFrameColors().find(entry=>entry.id===config.carouselFrameColorPreset)?.color||config.carouselFrameColor||"#58dfee";}
function initiativeFrameOverrideEnabled(config){const preset=String(config?.carouselFrameColorPreset||"");return Boolean(config?.carouselFrameColorOverride||(preset&&preset!=="ally-blue"));}
function initiativeFrameColorOptions(config){const selected=String(config.carouselFrameColorPreset||"");return getInitiativeFrameColors().map(entry=>({...entry,selected:entry.id===selected}));}

function getToughness(actor) {
  const stored = actor?.getFlag(MODULE_ID, "toughness") ?? {};
  const config = foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_TOUGHNESS), stored, {inplace: false, insertKeys: true, overwrite: true});
  config.enabled = Object.hasOwn(stored, "enabled") ? Boolean(stored.enabled) : actor?.type === "npc";
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
  if (!actor || !["npc","character"].includes(actor.type)) return false;
  if (tokenDocument) await tokenDocument.setFlag(MODULE_ID, "weaknessMode", mode);
  else await actor.setFlag(MODULE_ID, "weaknessMode", mode);
  refreshToughnessBars();
  return true;
}

async function setTemporaryToughnessWeaknesses(target, elementIds) {
  const {actor, tokenDocument} = toughnessTargetParts(target);
  if (!game.user.isGM || !actor || !["npc","character"].includes(actor.type)) return false;
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
  const targets = target ? [target] : (canvas.tokens?.placeables ?? []).filter(token => ["npc","character"].includes(token.actor?.type)).map(token => token.document);
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
    if (!actor || !["npc","character"].includes(actor.type)) continue;
    const stored = actor.getFlag(MODULE_ID, "toughness");
    if (!stored || !getToughness(actor).enabled) continue;
    actors.set(actor.uuid, actor);
  }
  if (!actors.size) return ui.notifications.info("No Toughness-enabled actors are present on this Scene.");
  const confirmed = await Dialog.confirm({
    title: "Reset All Toughness",
    content: `<p>Restore the current Toughness of <strong>${actors.size}</strong> actor${actors.size === 1 ? "" : "s"} on this Scene to each actor's configured maximum?</p><p>Weaknesses and maximum values will not be changed.</p>`,
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
  if (!actor) return false;
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
  return foundry.utils.mergeObject({x: 80, y: 180, size: 128, visible: false}, all[actorId] ?? {}, {inplace: false});
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
      const advance=tracked?.combatantId===previousTurn.id?tracked:(temporary?{combatantId:temporary.id,resumeCombatantId:temporary.getFlag(MODULE_ID,"resumeCombatantId")??null,resumeRound:temporary.getFlag(MODULE_ID,"resumeRound")??combat.round,aha:false,reuseSource:false}:null);
      if(advance)await finishActionAdvance(combat,advance);
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
  const staleAdvances=combat.combatants.filter(entry=>entry.getFlag(MODULE_ID,"actionAdvance")&&entry.id!==combat.combatant?.id);
  for(const temporary of staleAdvances){
    const tracked=state.actionAdvances.get(combat.id);
    const advance=tracked?.combatantId===temporary.id?tracked:{combatantId:temporary.id,resumeCombatantId:temporary.getFlag(MODULE_ID,"resumeCombatantId")??null,resumeRound:temporary.getFlag(MODULE_ID,"resumeRound")??combat.round,aha:false,reuseSource:false};
    await finishActionAdvance(combat,advance);
  }
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
  const permanentTurns=combat.turns.filter(entry=>!isElationActionCombatant(entry)&&!isTalentTurnCombatant(entry)&&!entry.getFlag(MODULE_ID,"temporaryUltimate")&&!entry.getFlag(MODULE_ID,"actionAdvance")),ahaIndex=permanentTurns.findIndex(entry=>entry.id===aha.id),nextNatural=ahaIndex>=0?(permanentTurns[ahaIndex+1]??permanentTurns[0]??null):permanentTurns[0]??null,nextRound=ahaIndex>=0&&ahaIndex+1<permanentTurns.length?combat.round:Number(combat.round||0)+1;
  return combat.createEmbeddedDocuments("Combatant", eligible.map((source, index) => ({
    name: `ELATION ACTION — ${source.actor.name}`,
    actorId: source.actor.id,
    // Actor-backed rather than token-backed so the temporary turn cannot collide
    // with the character's existing token combatant.
    tokenId: null,
    sceneId: null,
    initiative: ahaInitiative - ((index + 1) / 1000),
    img: source.actor.img || "icons/svg/mystery-man.svg",
    flags: {[MODULE_ID]: {elationActionCombatant: true, sequenceKey, sequenceOrder: index, sourceCombatantId: source.id, resumeCombatantId:nextNatural?.id??null, resumeRound:nextRound, completed: false}}
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
  refreshTechniqueButtons();
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
  const localId = game.settings.get(MODULE_ID, "selectedMainCharacterId");
  const worldId = (game.settings.get(MODULE_ID, "partySelections") ?? {})[game.user.id];
  const candidates=[localId,worldId,game.user.character?.id,canvas?.tokens?.controlled?.find(token=>token.actor?.type==="character" && token.actor.isOwner)?.actor?.id];
  for(const actorId of candidates){const actor=game.actors.get(actorId);if(actor?.type==="character" && (game.user.isGM || actor.isOwner))return actor;}
  const owned=game.actors.filter(actor=>actor.type==="character" && actor.isOwner);
  return owned.length===1 ? owned[0] : null;
}

async function setLocalMainCharacter(actorId) {
  const actor=game.actors.get(actorId);
  if(!actor || actor.type!=="character" || (!game.user.isGM && !actor.isOwner)) return false;
  await game.settings.set(MODULE_ID,"selectedMainCharacterId",actor.id);
  return true;
}

function talentButtonLayout(actorId) {
  const layouts = game.settings.get(MODULE_ID, "talentButtonLayouts") ?? {};
  return foundry.utils.mergeObject({x:360,y:330,size:96,visible:false}, layouts[actorId] ?? {}, {inplace:false});
}

function techniqueButtonLayout(actorId) {
  const layouts = game.settings.get(MODULE_ID, "techniqueButtonLayouts") ?? {};
  return foundry.utils.mergeObject({x:480,y:330,size:96,visible:false}, layouts[actorId] ?? {}, {inplace:false});
}

async function saveTechniqueButtonLayout(actorId, changes) {
  const layouts = foundry.utils.deepClone(game.settings.get(MODULE_ID, "techniqueButtonLayouts") ?? {});
  layouts[actorId] = foundry.utils.mergeObject(layouts[actorId] ?? {}, changes, {inplace:false});
  await game.settings.set(MODULE_ID, "techniqueButtonLayouts", layouts);
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
    if (!layout.visible) return this.destroy();
    if (!this.element) {
      this.element=document.createElement("div");
      this.element.className="tsru-skill-widget tsru-talent-widget";
      this.element.dataset.actorId=this.actor.id;
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
    ? game.actors.filter(actor => actor.type === "character" && talentButtonLayout(actor.id).visible)
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

class TechniqueButton {
  constructor(actor) { this.actor=actor; this.element=null; this.drag=null; this.resize=null; }
  render() {
    const layout=techniqueButtonLayout(this.actor.id), config=getConfig(this.actor);
    if (!layout.visible || (!game.user.isGM && !this.actor.isOwner)) return this.destroy();
    if (!this.element) {
      this.element=document.createElement("div");
      this.element.className="tsru-skill-widget tsru-technique-widget";
      this.element.dataset.actorId=this.actor.id;
      this.element.innerHTML=`<div class="tsru-skill-drag" title="Move Technique button"><i class="fas fa-grip-lines"></i></div><button type="button" class="tsru-skill-button tsru-technique-button"><img></button><div class="tsru-skill-label">Technique</div><button type="button" class="tsru-skill-close" title="Hide Technique button"><i class="fas fa-xmark"></i></button><div class="tsru-skill-resize" title="Resize"></div>`;
      document.body.appendChild(this.element);
      const drag=this.element.querySelector(".tsru-skill-drag"), resize=this.element.querySelector(".tsru-skill-resize");
      drag.addEventListener("pointerdown",event=>{event.preventDefault();const rect=this.element.getBoundingClientRect();this.drag={dx:event.clientX-rect.left,dy:event.clientY-rect.top};drag.setPointerCapture(event.pointerId);});
      drag.addEventListener("pointermove",event=>{if(!this.drag)return;this.element.style.left=`${clamp(event.clientX-this.drag.dx,0,window.innerWidth-40)}px`;this.element.style.top=`${clamp(event.clientY-this.drag.dy,0,window.innerHeight-40)}px`;});
      drag.addEventListener("pointerup",async event=>{if(!this.drag)return;this.drag=null;drag.releasePointerCapture(event.pointerId);const rect=this.element.getBoundingClientRect();await saveTechniqueButtonLayout(this.actor.id,{x:Math.round(rect.left),y:Math.round(rect.top)});});
      resize.addEventListener("pointerdown",event=>{event.preventDefault();this.resize={startX:event.clientX,startSize:this.element.getBoundingClientRect().width};resize.setPointerCapture(event.pointerId);});
      resize.addEventListener("pointermove",event=>{if(this.resize)this.element.style.setProperty("--tsru-skill-size",`${clamp(this.resize.startSize+event.clientX-this.resize.startX,64,280)}px`);});
      resize.addEventListener("pointerup",async event=>{if(!this.resize)return;const size=clamp(this.resize.startSize+event.clientX-this.resize.startX,64,280);this.resize=null;resize.releasePointerCapture(event.pointerId);await saveTechniqueButtonLayout(this.actor.id,{size:Math.round(size)});});
      this.element.querySelector(".tsru-skill-close").addEventListener("click",async()=>{await saveTechniqueButtonLayout(this.actor.id,{visible:false});this.destroy();});
      this.element.querySelector(".tsru-technique-button").addEventListener("click",()=>requestTechnique(this.actor));
      activateStarRailActionDrag(this.element.querySelector(".tsru-technique-button"),this.actor,"technique");
    }
    this.element.style.left=`${clamp(layout.x,0,window.innerWidth-40)}px`;
    this.element.style.top=`${clamp(layout.y,0,window.innerHeight-40)}px`;
    this.element.style.setProperty("--tsru-skill-size",`${clamp(layout.size,64,280)}px`);
    this.element.classList.toggle("is-unavailable",!config.techniqueEnabled || currentTechniquePoints()<1);
    const button=this.element.querySelector(".tsru-technique-button");
    button.querySelector("img").src=config.techniqueButtonImage || this.actor.img || "icons/svg/lightning.svg";
    button.title=config.techniqueEnabled ? `${this.actor.name}: Use Technique` : `${this.actor.name}'s Technique is disabled.`;
    return this;
  }
  destroy(){this.element?.remove();this.element=null;state.techniqueButtons.delete(this.actor.id);}
}

function refreshTechniqueButtons() {
  const actors=game.actors.filter(actor=>actor.type==="character" && techniqueButtonLayout(actor.id).visible && (game.user.isGM || actor.isOwner));
  const actorIds=new Set(actors.map(actor=>actor.id));
  for(const [id,button] of [...state.techniqueButtons]) if(!actorIds.has(id)) button.destroy();
  for(const actor of actors){let button=state.techniqueButtons.get(actor.id);if(!button){button=new TechniqueButton(actor);state.techniqueButtons.set(actor.id,button);}button.render();}
}

async function spawnAbilityBubbles(actor, selections={skill:true,ultimate:true,talent:true,technique:true}, {notify=true}={}) {
  if (!actor || actor.type!=="character") return ui.notifications.warn("Select a character first.");
  if (!game.user.isGM && !actor.isOwner) return ui.notifications.error("You do not own this character.");
  if (selections.ultimate) {
    await saveLayout(actor.id,{visible:true});
    let orb=state.orbs.get(actor.id);
    if(!orb){orb=new UltimateOrb(actor);state.orbs.set(actor.id,orb);}
    orb.render();
  }
  if (selections.skill) await saveSkillButtonLayout(actor.id,{visible:true});
  if (selections.talent) await saveTalentButtonLayout(actor.id,{visible:true});
  if (selections.technique) await saveTechniqueButtonLayout(actor.id,{visible:true});
  if(selections.skill){let button=state.skillButtons.get(actor.id);if(!button){button=new SkillButton(actor);state.skillButtons.set(actor.id,button);}button.render();}
  if(selections.talent){let button=state.talentButtons.get(actor.id);if(!button){button=new TalentButton(actor);state.talentButtons.set(actor.id,button);}button.render();}
  if(selections.technique){let button=state.techniqueButtons.get(actor.id);if(!button){button=new TechniqueButton(actor);state.techniqueButtons.set(actor.id,button);}button.render();}
  const shown=[
    selections.ultimate && state.orbs.get(actor.id)?.element?.isConnected,
    selections.skill && state.skillButtons.get(actor.id)?.element?.isConnected,
    selections.talent && state.talentButtons.get(actor.id)?.element?.isConnected,
    selections.technique && state.techniqueButtons.get(actor.id)?.element?.isConnected
  ].filter(Boolean).length;
  if(!shown){ui.notifications.error(`No ability bubbles could be shown for ${actor.name}. Check that this player owns the character.`);return false;}
  if (notify) ui.notifications.info(`${shown} ability bubble${shown===1?"":"s"} shown for ${actor.name}.`);
  return shown;
}

function playerCharacterActors() {
  return game.actors.filter(actor=>actor.type==="character")
    .sort((a,b)=>String(a.name).localeCompare(String(b.name),undefined,{sensitivity:"base"}));
}

function showGMAbilityBubblePicker() {
  const actors=playerCharacterActors();
  if(!actors.length) return ui.notifications.warn("No player characters are available.");
  const actorRows=actors.map((actor,index)=>`<label class="tsru-ability-actor"><input type="checkbox" name="actorId" value="${actor.id}" ${index===0?"checked":""}><img src="${escapeHTML(actor.img || "icons/svg/mystery-man.svg")}" alt=""><span>${escapeHTML(actor.name)}</span></label>`).join("");
  const content=`<form class="tsru-ability-bubble-picker"><fieldset><legend>Ability bubbles</legend><label><input type="checkbox" name="skill" checked> Skill</label><label><input type="checkbox" name="ultimate" checked> Ult</label><label><input type="checkbox" name="talent" checked> Talent</label><label><input type="checkbox" name="technique" checked> Technique</label></fieldset><div class="tsru-ability-actors">${actorRows}</div></form>`;
  const selectedActors=html=>html.find('[name="actorId"]:checked').toArray().map(input=>game.actors.get(input.value)).filter(Boolean);
  new Dialog({title:"Show All Ability Bubbles",content,buttons:{
    spawn:{icon:'<i class="fas fa-circle-play"></i>',label:"Spawn Buttons",callback:async html=>{const selections={skill:html.find('[name="skill"]').prop("checked"),ultimate:html.find('[name="ultimate"]').prop("checked"),talent:html.find('[name="talent"]').prop("checked"),technique:html.find('[name="technique"]').prop("checked")};for(const actor of selectedActors(html))await spawnAbilityBubbles(actor,selections,{notify:false});ui.notifications.info("Selected ability bubbles were shown.");}},
    all:{icon:'<i class="fas fa-layer-group"></i>',label:"Spawn All Buttons",callback:async html=>{for(const actor of selectedActors(html))await spawnAbilityBubbles(actor,{skill:true,ultimate:true,talent:true,technique:true},{notify:false});ui.notifications.info("All ability bubbles were shown.");}},
    cancel:{icon:'<i class="fas fa-times"></i>',label:"Cancel"}
  },default:"spawn"}).render(true);
}

async function showAllAbilityBubbles() {
  if(game.user.isGM) return showGMAbilityBubblePicker();
  const actor=selectedMainCharacter();
  if(!actor) return ui.notifications.warn("Select your main character in the HSR Hub first.");
  return spawnAbilityBubbles(actor,{skill:true,ultimate:true,talent:true,technique:true});
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
  return Boolean(actor?.type === "character" && (game.user.isGM || actor.isOwner));
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
    const available = getConfig(this.actor).skillEnabled && currentSkillPoints() >= cost && !state.skillLocks.has(this.actor.id);
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
  if (combatHasInitiative() && meterLayout.visible) { if (!state.skillMeter) state.skillMeter = new SkillPointMeter(); state.skillMeter.render(); }
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
  return (Array.isArray(stored) ? stored : Object.values(stored)).filter(Boolean).map(path => ({...path, color:path.color || "#e5c878"}));
}

function getCraftingRecipes() {
  const stored = game.settings.get(MODULE_ID, "craftingRecipes") ?? [];
  return (Array.isArray(stored) ? stored : Object.values(stored)).filter(Boolean);
}

function getCraftingClassifications(){
  const stored=game.settings.get(MODULE_ID,"craftingClassifications")??[];
  return (Array.isArray(stored)?stored:Object.values(stored)).filter(Boolean).map(entry=>({id:String(entry.id||foundry.utils.randomID()),name:String(entry.name||"Classification"),icon:String(entry.icon||"fas fa-box")}));
}

function partyCraftingActors() {
  return game.actors.filter(actor => actor.type === "character" && getConfig(actor).mainParty);
}

function recipeItemKey(entry) {
  return String(entry?.uuid || `${entry?.type || "loot"}:${entry?.name || ""}`).toLowerCase();
}

function itemMatchesRecipeEntry(item, entry) {
  if (!item || !entry) return false;
  const sourceId = item.getFlag?.("core", "sourceId");
  if (entry.uuid && (item.uuid === entry.uuid || sourceId === entry.uuid)) return true;
  return item.name === entry.name && (!entry.type || item.type === entry.type);
}

function itemQuantity(item) {
  return Math.max(0, Number(item?.system?.quantity ?? 1) || 0);
}

function pooledCraftingInventory() {
  const actors = partyCraftingActors();
  const totals = new Map();
  for (const actor of actors) for (const item of actor.items ?? []) {
    const sourceId = item.getFlag?.("core", "sourceId");
    const entry = {uuid:sourceId || item.uuid,name:item.name,type:item.type};
    const key = recipeItemKey(entry);
    const current = totals.get(key) ?? {quantity:0,items:[],name:item.name,img:item.img};
    current.quantity += itemQuantity(item);
    current.items.push({actor,item});
    totals.set(key,current);
  }
  return {actors,totals};
}

function pooledQuantityFor(entry, actors=partyCraftingActors()) {
  let quantity = 0;
  for (const actor of actors) for (const item of actor.items ?? []) if (itemMatchesRecipeEntry(item,entry)) quantity += itemQuantity(item);
  return quantity;
}

function actorUnlockedRecipes(actor) {
  const value = actor?.getFlag(MODULE_ID,"unlockedCraftingRecipes") ?? [];
  return new Set(Array.isArray(value) ? value : []);
}

function craftingLearningActors(sourceActor) {
  const party = partyCraftingActors();
  const ownerIds = new Set();
  for (const actor of party) for (const user of game.users ?? []) if (!user.isGM && actor.testUserPermission(user,"OWNER")) ownerIds.add(user.id);
  const recipients = new Map(party.map(actor=>[actor.id,actor]));
  if(sourceActor)recipients.set(sourceActor.id,sourceActor);
  for(const actor of game.actors.filter(entry=>entry.type==="character")){
    if([...ownerIds].some(id=>actor.testUserPermission(game.users.get(id),"OWNER")))recipients.set(actor.id,actor);
  }
  return [...recipients.values()];
}

async function unlockCraftingRecipe(recipeId,sourceActor) {
  const recipe=getCraftingRecipes().find(entry=>entry.id===recipeId);
  if(!recipe)return false;
  for(const actor of craftingLearningActors(sourceActor)){
    const unlocked=actorUnlockedRecipes(actor);
    if(unlocked.has(recipeId))continue;
    unlocked.add(recipeId);
    await actor.setFlag(MODULE_ID,"unlockedCraftingRecipes",[...unlocked]);
  }
  return true;
}

function craftingUserActors(user=game.user) {
  return partyCraftingActors().filter(actor=>user.isGM||actor.testUserPermission(user,"OWNER"));
}

async function consumePartyIngredients(recipe,multiplier=1) {
  const actors=partyCraftingActors();
  multiplier=clamp(Math.floor(Number(multiplier)||1),1,99);
  for(const ingredient of recipe.ingredients??[])if(pooledQuantityFor(ingredient,actors)<Math.max(1,Number(ingredient.quantity)||1)*multiplier)throw new Error(`Not enough ${ingredient.name}.`);
  for(const ingredient of recipe.ingredients??[]){
    let remaining=Math.max(1,Number(ingredient.quantity)||1)*multiplier;
    for(const actor of actors){
      for(const item of [...(actor.items??[])]){
        if(!remaining||!itemMatchesRecipeEntry(item,ingredient))continue;
        const quantity=itemQuantity(item),used=Math.min(quantity,remaining);
        remaining-=used;
        if(quantity<=used)await item.delete();
        else await item.update({"system.quantity":quantity-used});
      }
      if(!remaining)break;
    }
  }
}

async function grantCraftingOutput(actor,output,multiplier=1) {
  if(!actor||!output?.itemData)throw new Error("This recipe has no configured output item.");
  const quantity=Math.max(1,Number(output.quantity)||1)*clamp(Math.floor(Number(multiplier)||1),1,99);
  const existing=actor.items.find(item=>itemMatchesRecipeEntry(item,output));
  if(existing)return existing.update({"system.quantity":itemQuantity(existing)+quantity});
  const data=foundry.utils.deepClone(output.itemData);delete data._id;delete data.folder;delete data.sort;delete data.ownership;
  foundry.utils.setProperty(data,"system.quantity",quantity);
  return actor.createEmbeddedDocuments("Item",[data]);
}

async function executeCraftRecipe(recipeId,actorId,requestingUserId,craftCount=1) {
  if(!isAuthority())return {ok:false,message:"No active GM is available."};
  if(state.craftingLocks.has("party"))return {ok:false,message:"The party is already crafting. Please try again."};
  const requester=game.users.get(requestingUserId),actor=game.actors.get(actorId),recipe=getCraftingRecipes().find(entry=>entry.id===recipeId);
  if(!requester||!actor||!recipe)return {ok:false,message:"The recipe or receiving character no longer exists."};
  if(!getConfig(actor).mainParty||(!requester.isGM&&!actor.testUserPermission(requester,"OWNER")))return {ok:false,message:"Choose one of your Main Party characters to receive the result."};
  if(!requester.isGM&&!actorUnlockedRecipes(actor).has(recipeId))return {ok:false,message:"That recipe has not been unlocked."};
  if(!recipe.output?.itemData)return {ok:false,message:"This recipe has no configured output item."};
  craftCount=clamp(Math.floor(Number(craftCount)||1),1,99);
  state.craftingLocks.add("party");
  try{await consumePartyIngredients(recipe,craftCount);await grantCraftingOutput(actor,recipe.output,craftCount);await unlockCraftingRecipe(recipeId,actor);return {ok:true,message:`Crafted ${Math.max(1,Number(recipe.output?.quantity)||1)*craftCount} × ${recipe.output?.name}.`};}
  catch(error){console.error(`${MODULE_ID} | Crafting failed`,error);return {ok:false,message:error.message};}
  finally{state.craftingLocks.delete("party");}
}

async function executeRedeemAllRecipeCards(requestingUserId){
  if(!isAuthority())return {ok:false,message:"No active GM is available."};
  const requester=game.users.get(requestingUserId);
  if(!requester?.isGM)return {ok:false,message:"Only a GM can redeem every recipe card."};
  const characters=game.actors.filter(actor=>actor.type==="character"),recipes=getCraftingRecipes(),recipeIds=new Set(),cards=[];
  for(const actor of characters)for(const item of actor.items??[]){const recipeId=item.getFlag(MODULE_ID,"recipeCard")?.recipeId;if(recipes.some(recipe=>recipe.id===recipeId)){recipeIds.add(recipeId);cards.push(item);}}
  if(!cards.length)return {ok:false,message:"No recipe cards were found on any player character."};
  for(const actor of characters){const unlocked=actorUnlockedRecipes(actor);for(const recipeId of recipeIds)unlocked.add(recipeId);await actor.setFlag(MODULE_ID,"unlockedCraftingRecipes",[...unlocked]);}
  for(const item of cards)await item.delete();
  return {ok:true,message:`Redeemed ${cards.length} recipe card${cards.length===1?"":"s"}. ${recipeIds.size} recipe${recipeIds.size===1?" is":"s are"} now unlocked for all player characters.`};
}

async function executeRedeemRecipeCard(actorId,itemId,requestingUserId) {
  if(!isAuthority())return {ok:false,message:"No active GM is available."};
  const requester=game.users.get(requestingUserId),actor=game.actors.get(actorId),item=actor?.items.get(itemId);
  const recipeId=item?.getFlag(MODULE_ID,"recipeCard")?.recipeId;
  const recipe=getCraftingRecipes().find(entry=>entry.id===recipeId);
  if(!requester||!actor||!item||!recipe)return {ok:false,message:"That recipe card is no longer available."};
  if(!requester.isGM&&!actor.testUserPermission(requester,"OWNER"))return {ok:false,message:"You do not own the character holding that card."};
  if(actorUnlockedRecipes(actor).has(recipeId))return {ok:false,message:`${recipe.name} is already unlocked.`};
  const quantity=itemQuantity(item);if(quantity<=1)await item.delete();else await item.update({"system.quantity":quantity-1});
  await unlockCraftingRecipe(recipeId,actor);
  return {ok:true,message:`${recipe.name} was unlocked for the party and their owners' characters.`};
}

async function ensureDefaultPaths() {
  if (!game.user.isGM) return false;
  const stored = getPaths();
  const names = new Set(stored.map(path => String(path.name || "").trim().toLowerCase()));
  const missing = DEFAULT_PATHS.filter(path => !names.has(path.name.toLowerCase())).map(path => ({...path}));
  if (!missing.length) return false;
  await game.settings.set(MODULE_ID, "paths", [...stored, ...missing]);
  return true;
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


function getLightConeData(item) {
  const stored = item?.getFlag?.(MODULE_ID, "lightCone") ?? {};
  return {
    enabled: Boolean(stored.enabled),
    pathId: String(stored.pathId || ""),
    description: String(stored.description ?? item?.system?.description?.value ?? ""),
    image: String(stored.image || item?.img || "icons/svg/item-bag.svg")
  };
}

function isLightCone(item) {
  return Boolean(item?.getFlag?.(MODULE_ID, "lightCone")?.enabled);
}

function equippedLightCone(actor) {
  const itemId = String(actor?.getFlag?.(MODULE_ID, "selectedLightConeItemId") || "");
  return itemId ? actor.items?.get(itemId) ?? null : null;
}

async function ensureLightConeFolder() {
  let folder = Array.from(game.folders ?? []).find(entry => entry.type === "Item" && entry.name === "Light Cones");
  if (!folder) folder = await Folder.create({name: "Light Cones", type: "Item"});
  return folder;
}

function lightConeFolderOptions(selectedId = "") {
  return Array.from(game.folders ?? [])
    .filter(folder => folder.type === "Item")
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map(folder => `<option value="${escapeHTML(folder.id)}" ${folder.id === selectedId ? "selected" : ""}>${escapeHTML(folder.name)}</option>`)
    .join("");
}

async function openLightConeGenerator() {
  if (!game.user.isGM) return ui.notifications.warn("Only a GM can generate Light Cones.");
  const paths = getPaths();
  if (!paths.length) return ui.notifications.warn("Create at least one Path before generating a Light Cone.");
  const options = paths.map(path => `<option value="${escapeHTML(path.id)}">${escapeHTML(path.name)}</option>`).join("");
  const defaultFolder = await ensureLightConeFolder();
  const folderOptions = lightConeFolderOptions(defaultFolder.id);
  const content = `<form class="tsru-light-cone-generator">
    <div class="form-group"><label>Name</label><div class="form-fields"><input type="text" name="name" placeholder="Light Cone name"></div></div>
    <div class="form-group"><label>Path</label><div class="form-fields"><select name="pathId">${options}</select></div></div>
    <div class="form-group"><label>Light Cone Image</label><div class="form-fields"><input type="text" name="image" value="icons/svg/item-bag.svg"><button type="button" class="file-picker" data-type="image" data-target="image"><i class="fas fa-file-import"></i></button></div></div>
    <div class="form-group"><label>Target Item Folder</label><div class="form-fields"><select name="folderId">${folderOptions}</select></div></div>
    <div class="form-group stacked"><label>Description</label><textarea name="description" rows="10" placeholder="Light Cone effects"></textarea></div>
    <p class="notes">The Path restriction line will be inserted automatically at the top in bold uppercase text.</p>
  </form>`;
  const dialog = new Dialog({
    title: "Generate New Light Cone",
    content,
    buttons: {
      create: {
        icon: '<i class="fas fa-plus"></i>',
        label: "Create",
        callback: async html => {
          const name = String(html.find('[name="name"]').val() || "").trim();
          const pathId = String(html.find('[name="pathId"]').val() || "");
          const path = paths.find(entry => entry.id === pathId);
          if (!name) return ui.notifications.warn("Enter a Light Cone name.");
          if (!path) return ui.notifications.warn("Select a valid Path.");
          const image = String(html.find('[name="image"]').val() || "icons/svg/item-bag.svg").trim();
          const folderId = String(html.find('[name="folderId"]').val() || defaultFolder.id);
          const body = String(html.find('[name="description"]').val() || "").trim();
          const restriction = `<p><strong>THE FOLLOWING EFFECTS ONLY WORK ON CHARACTERS OF THE PATH OF ${escapeHTML(path.name).toUpperCase()}</strong></p>`;
          const description = `${restriction}\n${body}`;
          const lightCone = {enabled: true, pathId, image, description};
          const item = await Item.create({
            name,
            type: "loot",
            img: image,
            folder: folderId,
            system: {description: {value: description}, quantity: 1, attunement: 1},
            flags: {[MODULE_ID]: {lightCone}}
          });
          ui.notifications.info(`Created Light Cone: ${name}.`);
          item?.sheet?.render(true);
        }
      },
      cancel: {icon: '<i class="fas fa-times"></i>', label: "Cancel"}
    },
    default: "create"
  });
  Hooks.once("renderDialog", rendered => {
    if (rendered !== dialog) return;
    rendered.element.find(".file-picker").on("click", event => {
      const target = event.currentTarget.dataset.target;
      const input = rendered.element.find(`[name="${target}"]`);
      new FilePicker({type: "image", current: input.val(), callback: path => input.val(path)}).browse();
    });
  });
  dialog.render(true);
}

function lightConeAttunementUpdate(item, equipped) {
  const changes = {};
  const statePath = `flags.${MODULE_ID}.lightConeAttunementState`;
  const properties = new Set(Array.from(item?.system?.properties ?? []));
  const saved = item?.getFlag?.(MODULE_ID, "lightConeAttunementState");
  const supportsAttunement = foundry.utils.hasProperty(item, "system.attunement")
    && foundry.utils.hasProperty(item, "system.attuned");
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
    if (foundry.utils.hasProperty(item, "system.attunement")) changes["system.attunement"] = "optional";
    if (foundry.utils.hasProperty(item, "system.attuned")) changes["system.attuned"] = true;
  } else {
    if (saved && !saved.hadMagic) properties.delete("mgc");
    changes["system.properties"] = Array.from(properties);
    if (foundry.utils.hasProperty(item, "system.attunement")) changes["system.attunement"] = saved?.attunement ?? "";
    if (foundry.utils.hasProperty(item, "system.attuned")) changes["system.attuned"] = saved?.attuned ?? false;
    if (saved) changes[`flags.${MODULE_ID}.-=lightConeAttunementState`] = null;
  }
  return changes;
}

function itemIsAttuned(item) {
  const attunement = item?.system?.attunement;
  return item?.system?.attuned === true || attunement === 2 || String(attunement || "").toLowerCase() === "attuned";
}

function actorAttunementCapacity(actor) {
  const attributes = actor?.system?.attributes ?? {};
  const configured = Number(attributes.attunement?.max ?? attributes.attunementMax ?? 3);
  return Number.isFinite(configured) ? Math.max(0, configured) : 3;
}

function actorAttunedItemCount(actor) {
  const nativeCount = Array.from(actor?.items ?? []).filter(itemIsAttuned).length;
  const cone = equippedLightCone(actor);
  return nativeCount + (cone && !itemIsAttuned(cone) ? 1 : 0);
}

async function repairSelectedLightConeAttunements() {
  if (!game.user.isGM) return;
  for (const actor of game.actors.filter(entry => entry.type === "character")) {
    const item = equippedLightCone(actor);
    if (!item) continue;
    const supportsAttunement = foundry.utils.hasProperty(item, "system.attunement")
      && foundry.utils.hasProperty(item, "system.attuned");
    let changes = {};
    // Clean up the magical property added to loot by v2.25.5; loot uses the
    // virtual selected-Light-Cone slot because its schema cannot be attuned.
    if (!supportsAttunement && item.getFlag(MODULE_ID, "lightConeAttunementState")) changes = lightConeAttunementUpdate(item, false);
    else if (supportsAttunement && !itemIsAttuned(item)) changes = lightConeAttunementUpdate(item, true);
    if (Object.keys(changes).length) await item.update(changes, {tsruLightConeSelection: true});
  }
}

function prepareLightConeAttunementContext(app, _partId, context) {
  const actor = app?.actor ?? app?.document;
  const attunement = context?.system?.attributes?.attunement;
  if (actor?.documentName !== "Actor" || actor.type !== "character" || !attunement) return;
  attunement.value = actorAttunedItemCount(actor);
}

async function unequipLightCone(item) {
  const actor = item?.parent;
  if (!(game.user.isGM || actor?.isOwner) || equippedLightCone(actor)?.id !== item?.id) return;
  const attunement = lightConeAttunementUpdate(item, false);
  if (Object.keys(attunement).length) await item.update(attunement, {tsruLightConeSelection: true});
  await actor.unsetFlag(MODULE_ID, "selectedLightConeItemId");
  clearLightConeContextBackdrop(actor.sheet?.element?.jquery ? actor.sheet.element[0] : actor.sheet?.element);
  actor.sheet?.render(false);
  ui.notifications.info(`${item.name} was unequipped as ${actor.name}'s Light Cone.`);
}

async function selectLightConeItem(item) {
  const actor = item?.parent;
  if (!(game.user.isGM || actor?.isOwner) || actor?.documentName !== "Actor" || actor.type !== "character") return;
  const current = equippedLightCone(actor);
  if (current?.id === item.id) return unequipLightCone(item);
  if (!current && !itemIsAttuned(item)) {
    const used = actorAttunedItemCount(actor);
    const maximum = actorAttunementCapacity(actor);
    if (used >= maximum) return ui.notifications.warn(`${actor.name} already has the maximum of ${maximum} attuned items.`);
  }
  if (current) {
    const confirmed = await Dialog.confirm({
      title: "Switch Light Cones?",
      content: `<p><strong>${escapeHTML(actor.name)}</strong> is currently using <strong>${escapeHTML(current.name)}</strong>.</p><p>Unequip it and equip <strong>${escapeHTML(item.name)}</strong> instead?</p>`,
      yes: () => true,
      no: () => false,
      defaultYes: false
    });
    if (!confirmed) return ui.notifications.info(`${current.name} remains equipped for ${actor.name}.`);
  }
  const newAttunement = lightConeAttunementUpdate(item, true);
  if (Object.keys(newAttunement).length) await item.update(newAttunement, {tsruLightConeSelection: true});
  try {
    if (current) {
      const oldAttunement = lightConeAttunementUpdate(current, false);
      if (Object.keys(oldAttunement).length) await current.update(oldAttunement, {tsruLightConeSelection: true});
    }
    await actor.setFlag(MODULE_ID, "selectedLightConeItemId", item.id);
  } catch (error) {
    const rollback = lightConeAttunementUpdate(item, false);
    if (Object.keys(rollback).length) await item.update(rollback, {tsruLightConeSelection: true}).catch(() => {});
    throw error;
  }
  clearLightConeContextBackdrop(actor.sheet?.element?.jquery ? actor.sheet.element[0] : actor.sheet?.element);
  actor.sheet?.render(false);
  ui.notifications.info(`${item.name} is now equipped as ${actor.name}'s Light Cone.`);
}

function clearLightConeContextBackdrop(rootElement) {
  $("#tsru-light-cone-context-fallback").remove();
  const root = $(rootElement ?? []);
  root.filter(".context").add(root.find(".context")).removeClass("context");
  root.filter(".context-menu-open").add(root.find(".context-menu-open")).removeClass("context-menu-open");
  document.body?.classList.remove("context", "context-menu-open");
}

function activateLightConeInventoryContext(app, html) {
  const actor = app.actor ?? app.document;
  if (!(game.user.isGM || actor?.isOwner) || actor?.documentName !== "Actor" || actor.type !== "character") return;
  const renderedRoot = html?.jquery ? html[0] : html;
  const appRoot = app.element?.jquery ? app.element[0] : app.element;
  const rootElement = appRoot ?? renderedRoot;
  if (!rootElement) return;
  clearLightConeContextBackdrop(rootElement);
  if (rootElement.dataset.tsruLightConeContext === "true") return;
  rootElement.dataset.tsruLightConeContext = "true";

  rootElement.addEventListener("contextmenu", event => {
    const row = event.target.closest?.("[data-item-id], [data-document-id], [data-entry-id], [data-id].item, .item");
    const itemId = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.entryId || row?.dataset?.id;
    const item = actor.items.get(itemId);
    if (!item) return;
    const isEquipped = equippedLightCone(actor)?.id === item.id;
    const pointer = {x: event.clientX, y: event.clientY};

    const activate = activateEvent => {
      activateEvent.preventDefault();
      $("#tsru-light-cone-context-fallback").remove();
      const operation = isEquipped ? unequipLightCone(item) : selectLightConeItem(item);
      window.setTimeout(() => {
        document.body?.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}));
        clearLightConeContextBackdrop(rootElement);
      }, 0);
      return operation;
    };
    const label = isEquipped ? "Unequip Light Cone" : "Select as Light Cone";
    const icon = isEquipped ? "fa-link-slash" : "fa-id-card";
    const optionMarkup = `<i class="fas ${icon} fa-fw"></i><span>${label}</span>`;

    const addOption = attempts => {
      const menus = $("#context-menu:visible, .context-menu:visible, [data-application-part='context-menu']:visible, [role='menu']:visible").not("#tsru-light-cone-context-fallback");
      const menu = menus.last();
      if (menu.length) {
        const nestedList = menu.find(".context-items, ol, ul, menu").first();
        const list = nestedList.length ? nestedList : menu;
        menu.find("[data-tsru-select-light-cone]").remove();
        const option = $(`<li class="context-item" data-tsru-select-light-cone tabindex="0">${optionMarkup}</li>`);
        list.append(option);
        option.on("click.tsru", activate);
        option.on("keydown.tsru", keyEvent => {
          if (keyEvent.key === "Enter" || keyEvent.key === " ") activate(keyEvent);
        });
        return;
      }
      if (attempts < 12) return requestAnimationFrame(() => addOption(attempts + 1));
      $("#tsru-light-cone-context-fallback").remove();
      const fallback = $(`<nav id="tsru-light-cone-context-fallback" class="tsru-light-cone-context-fallback" role="menu"><button type="button">${optionMarkup}</button></nav>`);
      fallback.css({left: `${pointer.x}px`, top: `${pointer.y}px`}).appendTo(document.body);
      fallback.find("button").on("click.tsru", activate);
      window.setTimeout(() => {
        const dismiss = dismissEvent => {
          if (!dismissEvent.target.closest?.("#tsru-light-cone-context-fallback")) fallback.remove();
          document.removeEventListener("pointerdown", dismiss, true);
        };
        document.addEventListener("pointerdown", dismiss, true);
      }, 0);
    };
    requestAnimationFrame(() => addOption(0));
  }, true);
}

async function injectLightConePanel(app, root, host) {
  const actor = app.actor ?? app.document;
  const renderKey = foundry.utils.randomID();
  root.attr("data-tsru-light-cone-render", renderKey);
  root.find("[data-tsru-light-cone]").remove();
  const item = equippedLightCone(actor);
  let description = "";
  let cone = null;
  let path = null;
  let mismatch = false;
  if (item) {
    cone = getLightConeData(item);
    const actorPathId = String(getConfig(actor).pathId || "");
    mismatch = Boolean(cone.pathId && actorPathId && cone.pathId !== actorPathId);
    path = getPaths().find(entry => entry.id === cone.pathId);
    description = await TextEditor.enrichHTML(cone.description, {async: true, secrets: actor.isOwner});
  }
  if (root.attr("data-tsru-light-cone-render") !== renderKey) return;
  const panel = item ? $(`<article class="tsru-light-cone-card ${mismatch ? "path-mismatch" : ""}" data-tsru-light-cone data-item-uuid="${escapeHTML(item.uuid)}">
    <div class="tsru-light-cone-image"><img src="${escapeHTML(cone.image)}" alt="${escapeHTML(item.name)}"><div class="tsru-light-cone-description">${description || "<em>No description configured.</em>"}</div></div>
    <footer><strong>${escapeHTML(item.name)}</strong><span>${escapeHTML(path?.name || "Any Path")}</span></footer>
  </article>`) : $('<article class="tsru-light-cone-card unequipped" data-tsru-light-cone><div class="tsru-light-cone-image tsru-light-cone-empty"><i class="fas fa-id-card"></i><span>No Light Cone Equipped</span></div><footer><strong>Unequipped</strong><span>Light Cone</span></footer></article>');
  (host?.length ? host : root).append(panel);
}

function lightConeCommonContainer(elements, rootElement) {
  const nodes = elements.filter(Boolean);
  if (!nodes.length) return null;
  let candidate = nodes[0].parentElement;
  while (candidate && candidate !== rootElement) {
    if (nodes.every(node => candidate.contains(node))) return candidate;
    candidate = candidate.parentElement;
  }
  return null;
}

function injectLightConeSheetPanel(app, html) {
  const actor = app.actor ?? app.document;
  if (actor?.documentName !== "Actor" || actor.type !== "character") return;
  const renderedRoot = html?.jquery ? html[0] : html;
  const appRoot = app.element?.jquery ? app.element[0] : app.element;
  const rootElement = appRoot ?? renderedRoot;
  if (!rootElement) return;
  const root = $(rootElement);
  root.find("[data-tsru-light-cone]").remove();

  const identityIds = Array.from(actor.items ?? [])
    .filter(item => item.type === "race" || item.type === "background")
    .map(item => item.id);
  const identityRows = identityIds.flatMap(id => root.find(`[data-item-id="${id}"], [data-document-id="${id}"], [data-entry-id="${id}"]`).toArray());
  let hostElement = lightConeCommonContainer(identityRows, rootElement);

  if (!hostElement && identityRows.length === 1) hostElement = identityRows[0].parentElement;
  if (!hostElement) {
    const identityControls = root.find("button, [role='button'], [data-action]").filter((_index, node) => /^(add|select)\s+(race|background)$/i.test(node.textContent?.replace(/\s+/g, " ").trim() || "")).toArray();
    hostElement = lightConeCommonContainer(identityControls, rootElement);
    if (!hostElement && identityControls.length === 1) hostElement = identityControls[0].parentElement;
  }

  if (!hostElement) {
    const mainTab = root.find('.tab[data-tab="details"], section[data-tab="details"], .tab[data-tab="character"], section[data-tab="character"], [data-application-part="details"]').filter((_index, node) => !node.closest("[data-tsru-light-cone]")).first();
    const rightColumn = mainTab.find(':scope > .right, :scope > [class*="right-column"], :scope > [class*="details-column"], :scope > :last-child').last();
    if (rightColumn.length) hostElement = rightColumn[0];
  }

  const hostRect = hostElement?.getBoundingClientRect?.();
  if (!hostElement || hostElement === rootElement || (hostRect?.width && hostRect.width > 520) || $(hostElement).is(".sheet-body, [data-application-part='body'], .tab")) {
    console.warn(`${MODULE_ID} | Light Cone frame host was not found for ${actor.name}; refusing to place it over an arbitrary sheet tab.`);
    return;
  }
  const host = $(hostElement).addClass("tsru-light-cone-sheet-host");
  injectLightConePanel(app, root, host);
}

async function postLightConeToChat(item, actor) {
  if (!item || !actor || !(game.user.isGM || actor.isOwner)) return;
  const cone = getLightConeData(item);
  const path = getPaths().find(entry => entry.id === cone.pathId);
  const description = await TextEditor.enrichHTML(cone.description, {async: true, secrets: actor.isOwner});
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({actor}),
    content: `<section class="tsru-light-cone-chat"><header><img src="${escapeHTML(cone.image)}"><div><h3>${escapeHTML(item.name)}</h3><span>${escapeHTML(path?.name || "Any Path")} Light Cone</span></div></header><div class="tsru-light-cone-chat-description">${description || "<em>No description configured.</em>"}</div></section>`
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
    const talentCurrent = currentTalentPoints(actor);
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
  const current = currentTalentPoints(actor);
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
      activateStarRailActionDrag(this.element, this.actor, "ultimate");
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
    this.element.style.setProperty("--tsru-ultimate-x", `${config.ultimateButtonAdjustEnabled ? clamp(config.ultimateButtonX, 0, 100) : 50}%`);
    this.element.style.setProperty("--tsru-ultimate-y", `${config.ultimateButtonAdjustEnabled ? clamp(config.ultimateButtonY, 0, 100) : 50}%`);
    this.element.style.setProperty("--tsru-ultimate-scale", String((config.ultimateButtonAdjustEnabled ? clamp(config.ultimateButtonScale, 50, 400) : 100) / 100));
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

function bossPhaseActorUuids(actor) {
  const config=getConfig(actor);
  return [actor?.uuid || (actor?.id ? `Actor.${actor.id}` : ""),String(config.bossPhase2ActorUuid||""),String(config.bossPhase3ActorUuid||"")];
}

function bossEncounter(combatant) {
  if(!combatant || combatant.getFlag(MODULE_ID,"actionAdvance") || combatant.getFlag(MODULE_ID,"temporaryUltimate") || isTalentTurnCombatant(combatant) || isElationActionCombatant(combatant) || isAhaCombatant(combatant))return null;
  const stored=combatant?.getFlag(MODULE_ID,"bossEncounter");
  if(stored){const encounter=foundry.utils.deepClone(stored);const actor=combatant?.actor;if(!encounter.bossConfig&&actor)encounter.bossConfig=getConfig(actor);if(!encounter.originalActorData&&actor)encounter.originalActorData=actor.toObject();return encounter;}
  const actor=combatant?.actor;
  const config=getConfig(actor);
  if(!actor || !config.isBoss)return null;
  return {rootOriginalActorId:actor.id,planOwnerActorId:actor.id,currentPhase:1,totalPhases:config.bossPhaseCount,phaseActorUuids:bossPhaseActorUuids(actor),defeated:false,originalTokenTexture:combatant.token?.texture?.src || actor.prototypeToken?.texture?.src || actor.img,originalTokenWidth:combatant.token?.width || actor.prototypeToken?.width || 1,originalTokenHeight:combatant.token?.height || actor.prototypeToken?.height || 1,originalActorData:actor.toObject(),bossConfig:config};
}

async function ensureBossEncounter(combatant) {
  if(!isAuthority() || !combatant?.parent || combatant.getFlag(MODULE_ID,"bossEncounter"))return bossEncounter(combatant);
  const encounter=bossEncounter(combatant);
  if(!encounter)return null;
  await combatant.setFlag(MODULE_ID,"bossEncounter",encounter);
  return encounter;
}

async function ensureBossEncounters(combat=game.combat) {
  if(!isAuthority() || !combat)return;
  for(const combatant of combat.combatants ?? [])await ensureBossEncounter(combatant);
  refreshBossHud();
  refreshInitiativeCarousel();
}

async function bossActorFromUuid(uuid) {
  if(!uuid)return null;
  const direct=String(uuid).match(/^Actor\.([^.]+)$/);
  return direct ? game.actors.get(direct[1]) : (await fromUuid(String(uuid)).catch(()=>null));
}

function bossPortraitConfig(actor, fallback={}) {
  const config=getConfig(actor);
  return {image:config.bossHudPortrait || actor?.prototypeToken?.texture?.src || actor?.img || fallback.image || "icons/svg/mystery-man.svg",x:config.bossHudPortraitX,y:config.bossHudPortraitY,scale:config.bossHudPortraitScale};
}

async function overwriteBossActor(target, sourceData, encounter, {restore=false}={}) {
  if(!target || !sourceData)return false;
  const data=foundry.utils.deepClone(sourceData);
  const rootConfig=foundry.utils.deepClone(encounter.bossConfig || getConfig(target));
  const phaseConfig=foundry.utils.getProperty(data,`flags.${MODULE_ID}.ultimate`) || {};
  for(const key of ["bossHudPortrait","bossHudPortraitX","bossHudPortraitY","bossHudPortraitScale"])if(Object.hasOwn(phaseConfig,key))rootConfig[key]=phaseConfig[key];
  const rootToughness=foundry.utils.getProperty(data,`flags.${MODULE_ID}.toughness`) || {};
  const update={name:data.name,img:data.img,system:data.system,prototypeToken:data.prototypeToken,[`flags.${MODULE_ID}.ultimate`]:restore ? (foundry.utils.getProperty(data,`flags.${MODULE_ID}.ultimate`)||rootConfig) : rootConfig,[`flags.${MODULE_ID}.toughness`]:rootToughness};
  await target.update(update,{render:false,animate:false,tsruBossTransition:true});
  const itemIds=target.items?.map(item=>item.id) ?? [];
  if(itemIds.length)await target.deleteEmbeddedDocuments("Item",itemIds,{render:false,animate:false,tsruBossTransition:true});
  const items=(data.items ?? []).map(item=>{const copy=foundry.utils.deepClone(item);delete copy._id;return copy;});
  if(items.length)await target.createEmbeddedDocuments("Item",items,{render:false,animate:false,tsruBossTransition:true});
  const effectIds=target.effects?.map(effect=>effect.id) ?? [];
  if(effectIds.length)await target.deleteEmbeddedDocuments("ActiveEffect",effectIds,{render:false,animate:false,tsruBossTransition:true});
  const effects=(data.effects ?? []).map(effect=>{const copy=foundry.utils.deepClone(effect);delete copy._id;return copy;});
  if(effects.length)await target.createEmbeddedDocuments("ActiveEffect",effects,{render:false,animate:false,tsruBossTransition:true});
  return true;
}

async function replaceBossPhase(combatant,nextActor,encounter) {
  const token=combatant.token, actor=combatant.actor;
  if(!token || !nextActor || !actor)return false;
  const nextData=nextActor.toObject();
  const texture=nextActor.prototypeToken?.texture?.src || nextActor.img || token.texture?.src;
  state.bossTransitionVisuals++;
  try{
    await overwriteBossActor(actor,nextData,encounter);
    const hp=actor.system?.attributes?.hp;
    if(Number(hp?.value??0)<=0 && Number(hp?.max??0)>0)await actor.update({"system.attributes.hp.value":Number(hp.max)},{render:false,animate:false,tsruBossTransition:true});
    const phase=encounter.currentPhase,design=encounter.bossConfig||{};
    const width=Number(design[`bossPhase${phase}TokenWidth`])||Number(nextActor.prototypeToken?.width)||1;
    const height=Number(design[`bossPhase${phase}TokenHeight`])||Number(nextActor.prototypeToken?.height)||1;
    await token.update({name:nextActor.name,"texture.src":texture,width,height},{animate:false,render:false,tsruBossTransition:true});
    await combatant.update({name:nextActor.name,img:texture,[`flags.${MODULE_ID}.bossEncounter`]:encounter},{render:false,animate:false,tsruBossTransition:true});
  }finally{state.bossTransitionVisuals=Math.max(0,state.bossTransitionVisuals-1);state.bossTransitionVisualsUntil=Date.now()+1500;}
  refreshBossHud();
  refreshInitiativeCarousel();
  ui.notifications.info(`${nextActor.name} entered boss phase ${encounter.currentPhase}.`);
  return true;
}

async function finishBossEncounter(combatant,encounter) {
  const original=game.actors.get(encounter.rootOriginalActorId) || combatant.actor;
  const token=combatant.token;
  encounter.defeated=true;
  if(original && token){
    if(encounter.originalActorData)await overwriteBossActor(original,encounter.originalActorData,encounter,{restore:true});
    await token.update({name:original.name,"texture.src":encounter.originalTokenTexture || original.prototypeToken?.texture?.src || original.img});
    await combatant.update({name:original.name,img:encounter.originalTokenTexture || original.img,[`flags.${MODULE_ID}.bossEncounter`]:encounter});
    const hp=original.system?.attributes?.hp;
    if(Number(hp?.value??0)!==0)await original.update({"system.attributes.hp.value":0});
    await original.toggleStatusEffect?.("dead",{active:true}).catch?.(()=>{});
  } else await combatant.update({[`flags.${MODULE_ID}.bossEncounter`]:encounter});
  refreshBossHud();
  ui.notifications.info(`${original?.name || combatant.name} has been defeated.`);
}

async function switchBossPhase(combatant,phase) {
  if(!game.user?.isGM)return;
  let encounter=await ensureBossEncounter(combatant);
  if(!encounter || encounter.defeated)return ui.notifications.warn("That combatant is not an active boss.");
  phase=clamp(Math.floor(phase),1,encounter.totalPhases);
  if(phase===encounter.currentPhase)return;
  const nextActor=phase===1 ? null : await bossActorFromUuid(encounter.phaseActorUuids?.[phase-1]);
  if(phase>1 && !nextActor)return ui.notifications.warn(`No actor is configured for boss phase ${phase}.`);
  encounter.currentPhase=phase;
  if(phase===1){
    state.bossTransitionVisuals++;
    try{
      await overwriteBossActor(combatant.actor,encounter.originalActorData,encounter,{restore:true});
      await combatant.token?.update({name:encounter.originalActorData.name,"texture.src":encounter.originalTokenTexture,width:encounter.originalTokenWidth||1,height:encounter.originalTokenHeight||1},{animate:false,render:false,tsruBossTransition:true});
      await combatant.update({name:encounter.originalActorData.name,img:encounter.originalTokenTexture,[`flags.${MODULE_ID}.bossEncounter`]:encounter},{render:false,animate:false,tsruBossTransition:true});
    }finally{state.bossTransitionVisuals=Math.max(0,state.bossTransitionVisuals-1);state.bossTransitionVisualsUntil=Date.now()+1500;}
  }else await replaceBossPhase(combatant,nextActor,encounter);
  state.bossPhaseControl?.render();
}

async function handleBossPhaseDefeat(actor) {
  if(!isAuthority() || Number(actor?.system?.attributes?.hp?.value??1)>0)return;
  const combat=game.combat;
  if(!combat?.started)return;
  const combatant=combat.combatants.find(entry=>entry.actor?.id===actor.id && bossEncounter(entry) && !bossEncounter(entry).defeated);
  if(!combatant || state.bossTransitionLocks.has(combatant.id))return;
  state.bossTransitionLocks.add(combatant.id);
  try{
    let encounter=await ensureBossEncounter(combatant);
    if(!encounter || encounter.defeated)return;
    if(encounter.currentPhase < encounter.totalPhases){
      const nextActor=await bossActorFromUuid(encounter.phaseActorUuids?.[encounter.currentPhase]);
      if(nextActor){
        encounter.currentPhase+=1;
        await replaceBossPhase(combatant,nextActor,encounter);
        return;
      }
    }
    await finishBossEncounter(combatant,encounter);
  }catch(error){console.error(`${MODULE_ID} | Boss phase transition failed`,error);ui.notifications.error(`Boss phase transition failed: ${error.message}`);}
  finally{state.bossTransitionLocks.delete(combatant.id);}
}

function carouselPortraitData(combatant) {
  if (isAhaCombatant(combatant)){const config=getAhaConfig(),scale=clamp(config.combatantImageScale,50,800),bounds=initiativePortraitPositionBounds(scale);return {image:config.combatantImage||config.buttonImage||DEFAULT_AHA_CONFIG.combatantImage,x:clamp(config.combatantImageX,bounds.min,bounds.max),y:clamp(config.combatantImageY,bounds.min,bounds.max),scale,flip:Boolean(config.combatantImageFlip)};}
  const actor=combatant?.actor;
  const config=getConfig(actor);
  return {image:config.carouselImage || actor?.img || combatant?.img || "icons/svg/mystery-man.svg",x:config.carouselImageX,y:config.carouselImageY,scale:config.carouselImageScale,flip:config.carouselImageFlip};
}

function openInitiativePortraitEditor(actor){
  if(!actor)return;
  const existing=state.initiativePortraitEditors.get(actor.id);
  if(existing)return existing.bringToTop?.();
  const config=getConfig(actor),colors=getInitiativeFrameColors();
  const frameOverride=initiativeFrameOverrideEnabled(config),frameColor=frameOverride?(colors.find(entry=>entry.id===config.carouselFrameColorPreset)?.color||config.carouselFrameColor||"#58dfee"):"#58dfee";
  const content=`<form class="tsru-initiative-portrait-editor">
    <div class="tsru-initiative-editor-stage" data-initiative-editor-stage>
      <button type="button" class="tsru-hsr-turn tsru-initiative-art-mask is-ally is-active ${frameOverride?"has-custom-frame":""}" style="--turn-color:${frameColor};--portrait-x:${config.carouselImageX}%;--portrait-y:${config.carouselImageY}%;--portrait-scale:${config.carouselImageScale/100};--portrait-flip:${config.carouselImageFlip?-1:1}"><span class="tsru-hsr-turn-pointer"><i></i></span><span class="tsru-hsr-turn-card"><span class="tsru-initiative-art-layer"><img src="${escapeHTML(config.carouselImage||actor.img||"icons/svg/mystery-man.svg")}" alt="${escapeHTML(actor.name)}" draggable="false"></span><b>${escapeHTML(actor.name)}</b><small>19</small></span></button>
    </div>
    <p class="notes">Drop artwork into the preview, drag to reposition it, and use the mouse wheel to zoom. Every change saves automatically.</p>
    <label><strong>Initiative portrait</strong><span class="tsru-file-control"><input type="text" name="carouselImage" value="${escapeHTML(config.carouselImage)}" placeholder="Use actor portrait"><button type="button" data-initiative-image-picker title="Browse Files"><i class="fas fa-file-import"></i></button></span></label>
    <div class="tsru-initiative-editor-values"><label>X <input type="number" name="carouselImageX" value="${config.carouselImageX}"></label><label>Y <input type="number" name="carouselImageY" value="${config.carouselImageY}"></label><label>Scale <input type="number" name="carouselImageScale" min="50" max="800" value="${config.carouselImageScale}"></label><label>Flip <input type="checkbox" name="carouselImageFlip" ${config.carouselImageFlip?"checked":""}></label></div>
    <div class="tsru-initiative-editor-status"><i class="fas fa-check"></i> <span>Saved</span></div>
  </form>`;
  let saveTimer=null,saving=false,pending=false,flushSave=()=>{},cleanupEditorEvents=()=>{};
  const dialog=new Dialog({title:`${actor.name} — Initiative Portrait`,content,buttons:{close:{label:"Close"}},render:html=>{
    const form=html.find(".tsru-initiative-portrait-editor"),stage=form.find("[data-initiative-editor-stage]")[0],image=stage?.querySelector("img"),card=stage?.querySelector(".tsru-hsr-turn"),status=form.find(".tsru-initiative-editor-status span");
    const values=({normalize=false}={})=>{const carouselImageScale=clamp(Number(form.find('[name="carouselImageScale"]').val())||100,50,800),bounds=initiativePortraitPositionBounds(carouselImageScale),data={carouselImage:String(form.find('[name="carouselImage"]').val()||""),carouselImageX:clamp(Number(form.find('[name="carouselImageX"]').val())||0,bounds.min,bounds.max),carouselImageY:clamp(Number(form.find('[name="carouselImageY"]').val())||0,bounds.min,bounds.max),carouselImageScale,carouselImageFlip:Boolean(form.find('[name="carouselImageFlip"]').prop("checked"))};form.find('[name="carouselImageX"],[name="carouselImageY"]').attr({min:bounds.min,max:bounds.max});if(normalize){form.find('[name="carouselImageX"]').val(Math.round(data.carouselImageX));form.find('[name="carouselImageY"]').val(Math.round(data.carouselImageY));form.find('[name="carouselImageScale"]').val(Math.round(data.carouselImageScale));}return data;};
    const preview=()=>{const data=values();image.src=data.carouselImage||actor.img||"icons/svg/mystery-man.svg";card.style.setProperty("--portrait-x",`${data.carouselImageX}%`);card.style.setProperty("--portrait-y",`${data.carouselImageY}%`);card.style.setProperty("--portrait-scale",String(data.carouselImageScale/100));card.style.setProperty("--portrait-flip",data.carouselImageFlip?-1:1);};
    const save=async()=>{if(saving){pending=true;return;}saving=true;pending=false;status.text("Saving…");const data=values();try{await actor.update({[`flags.${MODULE_ID}.ultimate.carouselImage`]:data.carouselImage,[`flags.${MODULE_ID}.ultimate.carouselImageX`]:data.carouselImageX,[`flags.${MODULE_ID}.ultimate.carouselImageY`]:data.carouselImageY,[`flags.${MODULE_ID}.ultimate.carouselImageScale`]:data.carouselImageScale,[`flags.${MODULE_ID}.ultimate.carouselImageFlip`]:data.carouselImageFlip},{tsruAutosave:true,render:false});refreshInitiativeCarousel();status.text("Saved");}catch(error){console.error(`${MODULE_ID} | Initiative portrait autosave failed`,error);status.text("Save failed");}finally{saving=false;if(pending)save();}};
    flushSave=save;const scheduleSave=()=>{values({normalize:true});preview();status.text("Unsaved changes…");window.clearTimeout(saveTimer);saveTimer=window.setTimeout(()=>{saveTimer=null;save();},180);};
    form.on("input change","input",scheduleSave);
    form.find("[data-initiative-image-picker]").on("click",event=>{event.preventDefault();new FilePicker({type:"image",current:values().carouselImage,callback:path=>form.find('[name="carouselImage"]').val(path).trigger("change")}).browse();});
    const inStage=event=>event.composedPath?.().includes(stage)||stage.contains(event.target);
    const extractDropPath=event=>{const direct=droppedAssetPath(event);if(direct)return direct;const transfer=event.dataTransfer;for(const type of ["application/json","text","text/html"]){const raw=transfer?.getData(type)||"";if(!raw)continue;try{const data=JSON.parse(raw);const path=data.src||data.img||data.path||data.texture?.src;if(path)return path;}catch(_error){const match=raw.match(/(?:src|href)=["']([^"']+)["']/i);if(match)return match[1];}}return "";};
    let drag=null;
    const onDragOver=event=>{if(!inStage(event))return;event.preventDefault();event.stopImmediatePropagation();if(event.dataTransfer)event.dataTransfer.dropEffect="copy";stage.classList.add("is-dragover");};
    const onDrop=event=>{if(!inStage(event))return;event.preventDefault();event.stopImmediatePropagation();stage.classList.remove("is-dragover");const path=extractDropPath(event);if(path)form.find('[name="carouselImage"]').val(path).trigger("change");else ui.notifications.warn("Drop an image from Foundry's file browser, or use the browse button.");};
    const onPointerDown=event=>{const hit=event.target.closest?.(".tsru-hsr-turn-card");if(event.button!==0||!hit||!stage.contains(hit))return;event.preventDefault();event.stopPropagation();const data=values();drag={pointerId:event.pointerId,x:event.clientX,y:event.clientY,startX:data.carouselImageX,startY:data.carouselImageY,rect:hit.getBoundingClientRect()};stage.setPointerCapture?.(event.pointerId);};
    const onPointerMove=event=>{if(!drag||drag.pointerId!==event.pointerId)return;event.preventDefault();event.stopPropagation();const bounds=initiativePortraitPositionBounds(values().carouselImageScale),x=clamp(drag.startX+(event.clientX-drag.x)/Math.max(1,drag.rect.width)*100,bounds.min,bounds.max),y=clamp(drag.startY+(event.clientY-drag.y)/Math.max(1,drag.rect.height)*100,bounds.min,bounds.max);form.find('[name="carouselImageX"]').val(Math.round(x));form.find('[name="carouselImageY"]').val(Math.round(y));scheduleSave();};
    const finish=event=>{if(!drag||drag.pointerId!==event.pointerId)return;event.preventDefault();stage.releasePointerCapture?.(event.pointerId);drag=null;};
    const onWheel=event=>{if(!inStage(event))return;event.preventDefault();event.stopImmediatePropagation();const input=form.find('[name="carouselImageScale"]'),current=values({normalize:true}).carouselImageScale,next=clamp(current+(event.deltaY<0?5:-5),50,800);input.val(next);scheduleSave();};
    document.addEventListener("dragover",onDragOver,true);document.addEventListener("drop",onDrop,true);document.addEventListener("pointerdown",onPointerDown,true);document.addEventListener("pointermove",onPointerMove,true);document.addEventListener("pointerup",finish,true);document.addEventListener("pointercancel",finish,true);document.addEventListener("wheel",onWheel,{capture:true,passive:false});
    cleanupEditorEvents=()=>{document.removeEventListener("dragover",onDragOver,true);document.removeEventListener("drop",onDrop,true);document.removeEventListener("pointerdown",onPointerDown,true);document.removeEventListener("pointermove",onPointerMove,true);document.removeEventListener("pointerup",finish,true);document.removeEventListener("pointercancel",finish,true);document.removeEventListener("wheel",onWheel,true);};preview();
  },close:()=>{cleanupEditorEvents();if(saveTimer){window.clearTimeout(saveTimer);flushSave();}state.initiativePortraitEditors.delete(actor.id);}}, {width:520,height:"auto",resizable:true,classes:["tsru-initiative-editor-dialog"]});
  state.initiativePortraitEditors.set(actor.id,dialog);dialog.render(true);
}

function carouselTurnKind(combatant) {
  if(isAhaCombatant(combatant))return "aha";
  if(isElationActionCombatant(combatant))return "elation";
  if(isTalentTurnCombatant(combatant))return "talent";
  if(combatant?.getFlag(MODULE_ID,"temporaryUltimate"))return "ultimate";
  if(combatant?.getFlag(MODULE_ID,"actionAdvance"))return "advance";
  return "normal";
}

class HsrInitiativeCarousel {
  constructor(){this.element=null;this.drag=null;this.resize=null;this.scrollTop=0;this.currentCombatantId=null;}
  layout(){const saved=game.settings.get(MODULE_ID,"initiativeCarouselLayout")||{},config=getInitiativeCarouselConfig();return {x:0,y:Number.isFinite(Number(saved.y))?Number(saved.y):86,width:clamp(saved.width??config.maximumWidth,190,config.maximumWidth),height:clamp(saved.height??520,180,1200)};}
  async saveLayout(changes={}){const next={...this.layout(),...changes};await game.settings.set(MODULE_ID,"initiativeCarouselLayout",next);return next;}
  turnMarkup(combatant,{active=false,nextRound=false}={}){
    const portrait=carouselPortraitData(combatant),kind=carouselTurnKind(combatant);
    const displayName=combatant?.actor?.name||combatant?.name||"Unknown";
    const inserted=kind!=="normal"&&kind!=="aha";
    const actorConfig=getConfig(combatant?.actor);
    const disposition=Number(combatant?.token?.disposition);
    const friendlyDisposition=Number(globalThis.CONST?.TOKEN_DISPOSITIONS?.FRIENDLY??1);
    const allied=Number.isFinite(disposition)?disposition===friendlyDisposition:combatant?.actor?.type==="character";
    const customFrameColor=initiativeFrameOverrideEnabled(actorConfig)?resolvedInitiativeFrameColor(actorConfig):"";
    const labels={ultimate:"ULT",talent:"TALENT",advance:"ADV",elation:"ELATION",aha:"AHA"};
    const initiative=Number.isFinite(Number(combatant.initiative))?Number(combatant.initiative):"—";
    return `<button type="button" class="tsru-hsr-turn tsru-initiative-art-mask ${active?"is-active":""} ${inserted?"is-inserted":""} ${allied?"is-ally":"is-enemy"} ${customFrameColor?"has-custom-frame":""} is-${kind} ${nextRound?"is-next-round":""}" data-combatant-id="${combatant.id}" title="${escapeHTML(displayName)} — Initiative ${initiative}" style="--portrait-x:${portrait.x}%;--portrait-y:${portrait.y}%;--portrait-scale:${portrait.scale/100};--portrait-flip:${portrait.flip?-1:1};${customFrameColor?`--turn-color:${customFrameColor};`:""}"><span class="tsru-hsr-turn-pointer"><i></i></span><span class="tsru-hsr-turn-card"><span class="tsru-initiative-art-layer"><img src="${escapeHTML(portrait.image)}" alt="${escapeHTML(displayName)}"></span><b>${escapeHTML(displayName)}</b>${labels[kind]?`<em>${labels[kind]}</em>`:""}<small>${initiative}</small></span></button>`;
  }
  render(){
    const config=getInitiativeCarouselConfig(),combat=game.combat;
    if(!config.enabled||!combat?.started||!combat.turns?.length)return this.destroy();
    document.body.classList.add("tsru-hsr-carousel-active");
    if(!this.element){
      this.element=document.createElement("section");this.element.className="tsru-hsr-initiative-carousel";document.body.appendChild(this.element);
      this.element.addEventListener("click",async event=>{const control=event.target.closest("[data-carousel-control]");if(!control||!game.user.isGM)return;event.preventDefault();event.stopPropagation();const activeCombat=game.combat;if(!activeCombat)return;control.disabled=true;try{if(control.dataset.carouselControl==="previous-turn")await activeCombat.previousTurn();else if(control.dataset.carouselControl==="next-turn")await activeCombat.nextTurn();else if(control.dataset.carouselControl==="end-combat"){if(typeof activeCombat.deleteDialog==="function")await activeCombat.deleteDialog();else await activeCombat.delete();}}catch(error){console.error(`${MODULE_ID} | Carousel combat control failed`,error);ui.notifications.error(`Could not update combat: ${error.message}`);}finally{if(control.isConnected)control.disabled=false;}});
      this.element.addEventListener("click",event=>{const button=event.target.closest("[data-combatant-id]");if(!button)return;const entry=game.combat?.combatants.get(button.dataset.combatantId),token=entry?.token?.object;if(token){token.control({releaseOthers:true});canvas.animatePan(token.center);}});
      this.element.addEventListener("pointerdown",event=>{const handle=event.target.closest(".tsru-hsr-carousel-drag");if(!handle)return;event.preventDefault();const rect=this.element.getBoundingClientRect();this.drag={dx:event.clientX-rect.left,dy:event.clientY-rect.top};handle.setPointerCapture(event.pointerId);});
      this.element.addEventListener("pointermove",event=>{if(!this.drag)return;this.element.style.left="0px";this.element.style.top=`${clamp(event.clientY-this.drag.dy,0,innerHeight-60)}px`;dockSceneControlsBesideCarousel(this.element);});
      this.element.addEventListener("pointerup",event=>{if(!this.drag)return;this.drag=null;event.target.releasePointerCapture?.(event.pointerId);const rect=this.element.getBoundingClientRect();this.saveLayout({x:0,y:Math.round(rect.top)});dockSceneControlsBesideCarousel(this.element);});
      this.element.addEventListener("pointerdown",event=>{const handle=event.target.closest(".tsru-hsr-carousel-resize");if(!handle||!getInitiativeCarouselConfig().allowLengthResize)return;event.preventDefault();event.stopPropagation();const rect=this.element.getBoundingClientRect();this.resize={startX:event.clientX,startY:event.clientY,startWidth:rect.width,startHeight:rect.height};handle.setPointerCapture(event.pointerId);});
      this.element.addEventListener("pointermove",event=>{if(!this.resize)return;const config=getInitiativeCarouselConfig();const viewportMaximum=Math.max(180,Math.min(config.maximumHeight,innerHeight-this.element.getBoundingClientRect().top-16));const height=clamp(this.resize.startHeight+event.clientY-this.resize.startY,180,viewportMaximum),width=clamp(this.resize.startWidth+event.clientX-this.resize.startX,190,Math.min(config.maximumWidth,innerWidth-8));this.element.style.width=`${width}px`;this.element.style.height=`${height}px`;dockSceneControlsBesideCarousel(this.element);});
      this.element.addEventListener("pointerup",event=>{if(!this.resize)return;const rect=this.element.getBoundingClientRect(),height=Math.round(rect.height),width=Math.round(rect.width);this.resize=null;event.target.releasePointerCapture?.(event.pointerId);this.saveLayout({width,height});dockSceneControlsBesideCarousel(this.element);});
      this.element.addEventListener("wheel",event=>{const viewport=event.target.closest(".tsru-hsr-carousel-viewport");if(!viewport||viewport.scrollHeight<=viewport.clientHeight)return;event.preventDefault();event.stopPropagation();viewport.scrollTop+=event.deltaY;this.scrollTop=viewport.scrollTop;},{passive:false});
    }
    const layout=this.layout(),turns=[...combat.turns].filter(entry=>game.user.isGM||(!entry.hidden&&!entry.token?.hidden));
    this.element.style.left="0px";this.element.style.top=`${clamp(layout.y,0,innerHeight-60)}px`;
    const currentId=combat.combatant?.id,currentIndex=Math.max(0,turns.findIndex(entry=>entry.id===currentId));
    if(this.currentCombatantId!==currentId){this.currentCombatantId=currentId;this.scrollTop=0;}
    let remaining=turns.slice(currentIndex),wrapped=turns.slice(0,currentIndex),activeRow=0;
    const current=combat.combatant,currentKind=carouselTurnKind(current),resumeId=current?.getFlag(MODULE_ID,"resumeCombatantId");
    if(currentKind!=="normal"&&currentKind!=="aha"&&resumeId){const resumed=turns.find(entry=>entry.id===resumeId);if(resumed){remaining=[resumed,current,...remaining.slice(1).filter(entry=>entry.id!==resumeId)];wrapped=wrapped.filter(entry=>entry.id!==resumeId);activeRow=1;}}
    const rows=[];
    remaining.forEach((entry,index)=>rows.push(this.turnMarkup(entry,{active:index===activeRow})));
    const nextRoundNumber=Math.max(1,Number(combat.round||0)+1),nextRoundActionValue=Math.max(0,(nextRoundNumber-1)*6);
    rows.push(`<div class="tsru-hsr-round-marker" title="Round ${nextRoundNumber} — ${nextRoundActionValue} action value"><span class="tsru-hsr-round-hourglass"><i class="fas fa-hourglass-half"></i></span><span class="tsru-hsr-round-count">${nextRoundNumber}</span><span class="tsru-hsr-round-separator"></span><span class="tsru-hsr-round-action-value">${nextRoundActionValue}</span></div>`);
    if(wrapped.length)wrapped.forEach(entry=>rows.push(this.turnMarkup(entry,{nextRound:true})));
    else if(turns[0])rows.push(this.turnMarkup(turns[0],{nextRound:true}));
    const maximumHeight=Math.max(180,Math.min(config.maximumHeight,innerHeight-clamp(layout.y,0,innerHeight-60)-16));
    const height=clamp(layout.height,180,maximumHeight);
    this.element.style.width=`${layout.width}px`;this.element.style.height=`${height}px`;
    this.element.classList.toggle("is-length-resizable",config.allowLengthResize);
    this.element.classList.toggle("has-gm-controls",game.user.isGM);
    const gmControls=game.user.isGM?`<nav class="tsru-hsr-carousel-gm-controls" aria-label="Combat controls"><button type="button" data-carousel-control="previous-turn" title="Previous turn" aria-label="Previous turn"><i class="fas fa-step-backward"></i></button><button type="button" data-carousel-control="next-turn" title="Next turn" aria-label="Next turn"><i class="fas fa-step-forward"></i></button><button type="button" class="is-danger" data-carousel-control="end-combat" title="End combat" aria-label="End combat"><i class="fas fa-flag-checkered"></i></button></nav>`:"";
    this.element.innerHTML=`<span class="tsru-hsr-carousel-drag" title="Move initiative carousel vertically"><i class="fas fa-grip-lines"></i></span><div class="tsru-hsr-carousel-viewport"><div class="tsru-hsr-carousel-list">${rows.join("")}</div></div>${gmControls}${config.allowLengthResize?'<span class="tsru-hsr-carousel-resize" title="Resize carousel width and length"></span>':""}`;
    this.element.querySelector(".tsru-hsr-carousel-viewport").scrollTop=this.scrollTop;
    dockSceneControlsBesideCarousel(this.element);
    return this;
  }
  destroy(){undockSceneControls();this.element?.remove();this.element=null;document.body.classList.remove("tsru-hsr-carousel-active");if(state.initiativeCarousel===this)state.initiativeCarousel=null;}
}

function refreshInitiativeCarousel(){if(!state.initiativeCarousel)state.initiativeCarousel=new HsrInitiativeCarousel();state.initiativeCarousel.render();}

function sceneControlsPanel(){return document.querySelector("#scene-controls")??document.querySelector("#controls");}
function undockSceneControls(){for(const panel of document.querySelectorAll(".tsru-controls-docked-by-carousel")){panel.classList.remove("tsru-controls-docked-by-carousel");panel.style.removeProperty("--tsru-controls-left");panel.style.removeProperty("--tsru-controls-top");}}
function dockSceneControlsBesideCarousel(carousel=state.initiativeCarousel?.element){
  document.getElementById("tsru-left-controls-toggle")?.remove();document.body.classList.remove("tsru-left-controls-collapsed");
  for(const panel of [document.querySelector("#scene-controls"),document.querySelector("#controls")].filter(Boolean)){panel.classList.remove("collapsed");panel.removeAttribute("aria-hidden");}
  undockSceneControls();
  const panel=sceneControlsPanel();if(!carousel||!panel||!document.body.classList.contains("tsru-hsr-carousel-active"))return;
  const rect=carousel.getBoundingClientRect();panel.classList.add("tsru-controls-docked-by-carousel");panel.style.setProperty("--tsru-controls-left",`${Math.round(rect.right+4)}px`);panel.style.setProperty("--tsru-controls-top",`${Math.round(rect.top)}px`);
}

function applySceneNavigationVisibility(){document.body.classList.toggle("tsru-hide-scene-navigation",!game.settings.get(MODULE_ID,"showSceneNavigation"));}

class BossHud {
  constructor(){this.element=null;this.drag=null;}
  attachBelowInterfaceUi(){
    if(!this.element)return;
    const foundryInterface=document.querySelector("#interface");
    const uiTop=foundryInterface?.querySelector(":scope > #ui-top");
    if(foundryInterface && uiTop){
      this.element.classList.add("tsru-boss-hud-interface-layer");
      if(this.element.parentElement!==foundryInterface || this.element.nextElementSibling!==uiTop)foundryInterface.insertBefore(this.element,uiTop);
    }
  }
  render(){
    const combat=game.combat;
    const bosses=combat ? combat.combatants.map(combatant=>({combatant,encounter:bossEncounter(combatant)})).filter(entry=>entry.encounter && !entry.encounter.defeated) : [];
    if(!bosses.length)return this.destroy();
    if(!this.element){this.element=document.createElement("section");this.element.className="tsru-boss-hud";document.body.appendChild(this.element);this.attachBelowInterfaceUi();const layout=game.settings.get(MODULE_ID,"bossHudLayout")||{};this.element.style.left=`${layout.x??Math.max(20,(innerWidth-920)/2)}px`;this.element.style.top=`${clamp(Number(layout.y??54),0,innerHeight-40)}px`;this.element.addEventListener("pointerdown",event=>{const handle=event.target.closest(".tsru-boss-drag");if(!handle)return;event.preventDefault();const rect=this.element.getBoundingClientRect();this.drag={dx:event.clientX-rect.left,dy:event.clientY-rect.top};handle.setPointerCapture(event.pointerId);});this.element.addEventListener("pointermove",event=>{if(!this.drag)return;this.element.style.left=`${clamp(event.clientX-this.drag.dx,0,innerWidth-80)}px`;this.element.style.top=`${clamp(event.clientY-this.drag.dy,0,innerHeight-40)}px`;});this.element.addEventListener("pointerup",async event=>{if(!this.drag)return;this.drag=null;this.userMoved=true;const rect=this.element.getBoundingClientRect();await game.settings.set(MODULE_ID,"bossHudLayout",{x:Math.round(rect.left),y:Math.round(rect.top)});});}
    this.attachBelowInterfaceUi();
    this.element.innerHTML=bosses.map(({combatant,encounter})=>{
      const actor=combatant.actor;
      const design=encounter.bossConfig || getConfig(actor);
      const hp=actor?.system?.attributes?.hp ?? {};
      const value=Math.max(0,Number(hp.value)||0),max=Math.max(1,Number(hp.max)||1),percent=clamp(value/max*100,0,100);
      const toughness=getToughness(actor),toughnessPercent=clamp(toughness.current/toughness.max*100,0,100);
      const remaining=Math.max(0,encounter.totalPhases-encounter.currentPhase+1);
      const orbs=Array.from({length:encounter.totalPhases},(_v,index)=>`<i class="${index<remaining?"is-active":""}"></i>`).join("");
      const portrait=bossPortraitConfig(actor);
      const weaknesses=getElements().filter(element=>effectiveToughnessWeaknesses(actor).includes(element.id)).map(element=>`<img src="${escapeHTML(element.icon||"icons/svg/aura.svg")}" title="${escapeHTML(element.name)}">`).join("");
      return `<article class="tsru-boss-entry" data-combatant-id="${combatant.id}" style="--boss-width:${design.bossHudWidth}px;--boss-health-h:${design.bossHudHealthHeight}px;--boss-toughness-h:${design.bossHudToughnessHeight}px;--boss-portrait-x:${portrait.x}%;--boss-portrait-y:${portrait.y}%;--boss-portrait-scale:${portrait.scale/100}"><div class="tsru-boss-drag" title="Move boss bar"><i class="fas fa-grip-lines"></i></div><div class="tsru-boss-portrait"><img src="${escapeHTML(portrait.image)}" alt="${escapeHTML(actor?.name||combatant.name)}"></div><div class="tsru-boss-main"><header><span class="tsru-boss-phases">${orbs}</span><strong>${escapeHTML(actor?.name||combatant.name)}</strong><span class="tsru-boss-weaknesses">${weaknesses}</span></header><div class="tsru-boss-health" style="--boss-hp:${percent}%"><i></i><span>${Math.round(percent)}%</span></div><div class="tsru-boss-toughness" style="--boss-toughness:${toughnessPercent}%"><i></i></div></div></article>`;
    }).join("");
    return this;
  }
  destroy(){this.element?.remove();this.element=null;if(state.bossHud===this)state.bossHud=null;}
}

class BossPhaseControl {
  constructor(){this.element=null;this.drag=null;this.dragFrame=null;}
  bosses(){
    const entries=new Map();
    for(const combatant of game.combat?.combatants??[]){
      const encounter=bossEncounter(combatant);
      if(!encounter||encounter.defeated)continue;
      const config=encounter.bossConfig||getConfig(combatant.actor);
      const totalPhases=clamp(Number(encounter.totalPhases??config.bossPhaseCount)||1,1,3);
      if(!config.isBoss||totalPhases<2)continue;
      const actorId=encounter.rootOriginalActorId||combatant.actor?.id||combatant.id;
      if(!entries.has(actorId))entries.set(actorId,{combatant,encounter,totalPhases,name:combatant.actor?.name||combatant.name||"Boss"});
    }
    return [...entries.values()].sort((left,right)=>left.name.localeCompare(right.name,undefined,{sensitivity:"base"}));
  }
  render(){
    if(!game.user?.isGM)return this.destroy();
    const bosses=this.bosses();
    if(!this.element){
      this.element=document.createElement("section");this.element.className="tsru-boss-phase-control";document.body.appendChild(this.element);this.element.style.left="240px";this.element.style.top="180px";
      this.element.addEventListener("click",event=>{const button=event.target.closest("[data-boss-phase]");if(!button)return;const combatant=game.combat?.combatants.get(button.dataset.combatantId);if(combatant)switchBossPhase(combatant,Number(button.dataset.bossPhase));});
      this.element.addEventListener("pointerdown",event=>{if(!event.target.closest(".tsru-boss-phase-drag")||event.target.closest("button"))return;event.preventDefault();const rect=this.element.getBoundingClientRect();this.drag={pointerId:event.pointerId,dx:event.clientX-rect.left,dy:event.clientY-rect.top,startX:rect.left,startY:rect.top,x:rect.left,y:rect.top};this.element.setPointerCapture?.(event.pointerId);this.element.classList.add("is-dragging");});
      this.element.addEventListener("pointermove",event=>{if(!this.drag||event.pointerId!==this.drag.pointerId)return;this.drag.x=clamp(event.clientX-this.drag.dx,0,innerWidth-this.element.offsetWidth);this.drag.y=clamp(event.clientY-this.drag.dy,0,innerHeight-40);if(this.dragFrame)return;this.dragFrame=requestAnimationFrame(()=>{this.dragFrame=null;if(!this.drag)return;this.element.style.transform=`translate3d(${this.drag.x-this.drag.startX}px,${this.drag.y-this.drag.startY}px,0)`;});});
      const finishDrag=event=>{if(!this.drag||event.pointerId!==this.drag.pointerId)return;if(this.dragFrame){cancelAnimationFrame(this.dragFrame);this.dragFrame=null;}this.element.style.left=`${this.drag.x}px`;this.element.style.top=`${this.drag.y}px`;this.element.style.transform="";this.element.releasePointerCapture?.(event.pointerId);this.drag=null;this.element.classList.remove("is-dragging");};
      this.element.addEventListener("pointerup",finishDrag);this.element.addEventListener("pointercancel",finishDrag);
    }
    const rows=bosses.map(({combatant,encounter,totalPhases,name})=>`<article class="tsru-boss-phase-row"><div class="tsru-boss-phase-identity"><img src="${escapeHTML(combatant.actor?.img||combatant.img||"icons/svg/mystery-man.svg")}" alt=""><span><strong>${escapeHTML(name)}</strong><small>Phase ${encounter.currentPhase} of ${totalPhases}</small></span></div><div class="tsru-boss-phase-buttons">${Array.from({length:totalPhases},(_v,index)=>`<button type="button" data-combatant-id="${combatant.id}" data-boss-phase="${index+1}" class="${encounter.currentPhase===index+1?"is-active":""}" title="Switch ${escapeHTML(name)} to Phase ${index+1}">${index+1}</button>`).join("")}</div></article>`).join("");
    this.element.innerHTML=`<header class="tsru-boss-phase-drag"><i class="fas fa-grip-lines"></i><strong>Boss Phase Controls</strong><button type="button" data-close-boss-phase title="Close"><i class="fas fa-xmark"></i></button></header><div class="tsru-boss-phase-list">${rows||'<p class="notes">No multi-phase bosses are currently in the initiative order.</p>'}</div>`;
    this.element.querySelector("[data-close-boss-phase]").onclick=()=>this.destroy();return this;
  }
  destroy(){if(this.dragFrame)cancelAnimationFrame(this.dragFrame);this.dragFrame=null;this.element?.remove();this.element=null;if(state.bossPhaseControl===this)state.bossPhaseControl=null;}
}

function showBossPhaseControl(){if(!state.bossPhaseControl)state.bossPhaseControl=new BossPhaseControl();state.bossPhaseControl.render();}

function refreshBossHud(){
  state.bossPhaseControl?.render();
  if(!game.combat){state.bossHud?.destroy();return;}
  if(!state.bossHud)state.bossHud=new BossHud();
  state.bossHud.render();
}

function bossDesignerPreview(actor,config=getConfig(actor)){
  const portrait=bossPortraitConfig(actor,{image:config.bossHudPortrait});
  const toughness=getToughness(actor);
  const weaknesses=getElements().filter(element=>toughness.weaknesses.includes(element.id)).map(element=>`<img src="${escapeHTML(element.icon||"icons/svg/aura.svg")}" title="${escapeHTML(element.name)}">`).join("");
  return `<article class="tsru-boss-entry tsru-boss-preview-entry" style="--boss-width:${config.bossHudWidth}px;--boss-health-h:${config.bossHudHealthHeight}px;--boss-toughness-h:${config.bossHudToughnessHeight}px;--boss-portrait-x:${config.bossHudPortraitX}%;--boss-portrait-y:${config.bossHudPortraitY}%;--boss-portrait-scale:${config.bossHudPortraitScale/100}"><div class="tsru-boss-portrait"><img src="${escapeHTML(config.bossHudPortrait||portrait.image)}" alt=""></div><div class="tsru-boss-main"><header><span class="tsru-boss-phases"><i class="is-active"></i><i class="is-active"></i><i class="is-active"></i></span><strong>${escapeHTML(actor.name)}</strong><span class="tsru-boss-weaknesses">${weaknesses}</span></header><div class="tsru-boss-health" style="--boss-hp:72%"><i></i><span>72%</span></div><div class="tsru-boss-toughness" style="--boss-toughness:58%"><i></i></div></div></article>`;
}

function getCombatHudDesign() {
  const stored = game.settings.get(MODULE_ID, "combatHudDesign") ?? {};
  const design = foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_COMBAT_HUD_DESIGN), stored, {inplace: false});
  for (const key of Object.keys(DEFAULT_COMBAT_HUD_DESIGN)) design[key] = Math.max(0, Number(design[key]) || 0);
  design.memberWidth = clamp(design.memberWidth, 100, 400);
  design.memberHeight = clamp(design.memberHeight, 80, 320);
  design.orbSize = clamp(design.orbSize, 24, 140);
  design.talentSize = clamp(design.talentSize, 18, 100);
  design.hpHeight = clamp(design.hpHeight, 3, 30);
  return design;
}

function combatHudDesignStyle(design = getCombatHudDesign()) {
  const vars = {
    "member-w": design.memberWidth, "member-h": design.memberHeight,
    "portrait-l": design.portraitLeft, "portrait-r": design.portraitRight, "portrait-t": design.portraitTop, "portrait-b": design.portraitBottom,
    "hp-l": design.hpLeft, "hp-r": design.hpRight, "hp-b": design.hpBottom, "hp-h": design.hpHeight,
    "orb-r": design.orbRight, "orb-b": design.orbBottom, "orb-size": design.orbSize,
    "talent-l": design.talentLeft, "talent-b": design.talentBottom, "talent-size": design.talentSize,
    "name-l": design.nameLeft, "name-b": design.nameBottom, "name-w": design.nameWidth
  };
  return Object.entries(vars).map(([key, value]) => `--${key}:${Number(value)}px`).join(";");
}

function combatHudDesignerPreview(actor = null, config = null, design = getCombatHudDesign()) {
  actor ??= game.actors.find(entry => entry.type === "character") ?? null;
  config ??= actor ? getConfig(actor) : DEFAULT_CONFIG;
  const portrait = config.combatHudPortrait || actor?.img || "icons/svg/mystery-man.svg";
  const orb = config.ultimateButtonImage || config.orbImage || actor?.img || "icons/svg/mystery-man.svg";
  const talent = config.talentIcon || "icons/svg/aura.svg";
  return `<article class="tsru-combat-party-member tsru-combat-hud-design-sample" style="${combatHudDesignStyle(design)};--hud-x:${clamp(config.combatHudPortraitX,0,100)}%;--hud-y:${clamp(config.combatHudPortraitY,0,100)}%;--hud-scale:${clamp(config.combatHudPortraitScale,50,300)/100};--hud-flip:${config.combatHudPortraitFlip ? -1 : 1};--tsru-ultimate-x:${config.ultimateButtonAdjustEnabled ? clamp(config.ultimateButtonX,0,100) : 50}%;--tsru-ultimate-y:${config.ultimateButtonAdjustEnabled ? clamp(config.ultimateButtonY,0,100) : 50}%;--tsru-ultimate-scale:${(config.ultimateButtonAdjustEnabled ? clamp(config.ultimateButtonScale,50,400) : 100)/100};--energy:72%;--energy-color:#20e6ff;--hp:78%">
    <div class="tsru-combat-party-portrait"><img src="${escapeHTML(portrait)}" alt=""></div><strong class="tsru-combat-party-name">${escapeHTML(actor?.name || "Character Preview")}</strong>
    <div class="tsru-combat-party-hp"><i></i><span>78/100</span></div><div class="tsru-combat-party-talent"><img src="${escapeHTML(talent)}" alt=""><strong>2/7</strong></div>
    <div class="tsru-combat-party-ultimate-wrap"><button type="button" disabled><span class="tsru-hud-orb-fill"></span><img src="${escapeHTML(orb)}" alt=""><strong>72%</strong></button></div></article>`;
}

function activateCombatHudDesignCanvas(root, design, rerender) {
  const preview = root.find("[data-tsru-design-preview]");
  const decorate = () => {
    const sample = preview.find(".tsru-combat-hud-design-sample");
    const parts = [[sample,"member"],[sample.find(".tsru-combat-party-portrait"),"portrait"],[sample.find(".tsru-combat-party-hp"),"hp"],[sample.find(".tsru-combat-party-ultimate-wrap"),"orb"],[sample.find(".tsru-combat-party-talent"),"talent"],[sample.find(".tsru-combat-party-name"),"name"]];
    for (const [element,key] of parts) if (element.length) { element.attr("data-hud-design-part",key); if (!element.children(".tsru-hud-design-resize").length) element.append('<i class="tsru-hud-design-resize" title="Drag to resize"></i>'); }
  };
  decorate();
  let interaction = null;
  preview.on("pointerdown.tsru-design", "[data-hud-design-part]", event => {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const part = event.currentTarget.dataset.hudDesignPart;
    interaction = {part, resize:Boolean($(event.target).closest(".tsru-hud-design-resize").length), x:event.clientX, y:event.clientY, original:{...design}};
    event.currentTarget.setPointerCapture?.(event.pointerId);
  });
  preview.on("pointermove.tsru-design", "[data-hud-design-part]", event => {
    if (!interaction) return;
    const dx=event.clientX-interaction.x, dy=event.clientY-interaction.y;
    event.currentTarget.style.transform=`translate(${dx}px,${dy}px)`;
  });
  preview.on("pointerup.tsru-design pointercancel.tsru-design", "[data-hud-design-part]", event => {
    if (!interaction) return;
    const {part,resize,original}=interaction, dx=event.clientX-interaction.x, dy=event.clientY-interaction.y; interaction=null;
    const set=(key,value)=>{design[key]=Math.max(0,Math.round(value)); root.find(`[name="${key}"]`).val(design[key]);};
    if (part==="member" && resize) { set("memberWidth",original.memberWidth+dx); set("memberHeight",original.memberHeight+dy); }
    if (part==="portrait") { if(resize){set("portraitRight",original.portraitRight-dx);set("portraitBottom",original.portraitBottom-dy);}else{set("portraitLeft",original.portraitLeft+dx);set("portraitRight",original.portraitRight-dx);set("portraitTop",original.portraitTop+dy);set("portraitBottom",original.portraitBottom-dy);} }
    if (part==="hp") { if(resize){set("hpRight",original.hpRight-dx);set("hpHeight",original.hpHeight+dy);}else{set("hpLeft",original.hpLeft+dx);set("hpRight",original.hpRight-dx);set("hpBottom",original.hpBottom-dy);} }
    if (part==="orb") { if(resize)set("orbSize",original.orbSize+dx);else{set("orbRight",original.orbRight-dx);set("orbBottom",original.orbBottom-dy);} }
    if (part==="talent") { if(resize)set("talentSize",original.talentSize+dx);else{set("talentLeft",original.talentLeft+dx);set("talentBottom",original.talentBottom-dy);} }
    if (part==="name") { if(resize)set("nameWidth",original.nameWidth+dx);else{set("nameLeft",original.nameLeft+dx);set("nameBottom",original.nameBottom-dy);} }
    rerender(); decorate();
  });
  return decorate;
}

async function openCombatHudDesigner() {
  if (!game.user.isGM) return ui.notifications.warn("Only a GM can configure the universal combat HUD design.");
  const design = getCombatHudDesign();
  const labels = {
    memberWidth:"Character width",memberHeight:"Character height",portraitLeft:"Portrait left",portraitRight:"Portrait right",portraitTop:"Portrait top",portraitBottom:"Portrait bottom",
    hpLeft:"HP left",hpRight:"HP right",hpBottom:"HP bottom",hpHeight:"HP height",orbRight:"Orb right",orbBottom:"Orb bottom",orbSize:"Orb size",
    talentLeft:"Talent left",talentBottom:"Talent bottom",talentSize:"Talent size",nameLeft:"Name left",nameBottom:"Name bottom",nameWidth:"Name width"
  };
  const fields = Object.entries(labels).map(([key,label]) => `<label><span>${label}</span><input type="number" name="${key}" min="0" max="400" value="${design[key]}"></label>`).join("");
  const content = `<form class="tsru-combat-hud-designer"><p>These measurements define the universal relationship between splash art, HP bars, Talent icons, names, and Ultimate orbs. Individual sheets inherit this geometry.</p><div class="tsru-combat-hud-design-preview" data-tsru-design-preview>${combatHudDesignerPreview(null,null,design)}</div><div class="tsru-combat-hud-design-fields">${fields}</div></form>`;
  const dialog = new Dialog({title:"Combat HUD Designer",content,buttons:{save:{icon:'<i class="fas fa-save"></i>',label:"Save Universal Design",callback:async html=>{
    const next = {...design};
    html.find("[name]").each((_i,field)=>next[field.name]=Number(field.value));
    await game.settings.set(MODULE_ID,"combatHudDesign",next);
    refreshCombatPartyHud();
    ui.notifications.info("Universal combat HUD design saved.");
  }},cancel:{icon:'<i class="fas fa-times"></i>',label:"Cancel"}},default:"save"},{width:720,height:780,resizable:true,classes:["tsru-combat-hud-designer-dialog"]});
  Hooks.once("renderDialog", rendered => {
    if (rendered !== dialog) return;
    const root = rendered.element;
    let decorateDesign = null;
    const renderDraft = () => {
      const draft={...design}; root.find(".tsru-combat-hud-design-fields [name]").each((_i,field)=>draft[field.name]=Number(field.value));
      Object.assign(design,draft);
      root.find("[data-tsru-design-preview]").html(combatHudDesignerPreview(null,null,draft));
      decorateDesign?.();
    };
    root.on("input change",".tsru-combat-hud-design-fields input",renderDraft);
    decorateDesign = activateCombatHudDesignCanvas(root,design,renderDraft);
  });
  dialog.render(true);
}

function combatPartyActors() {
  const combat = game.combat;
  if (!combat?.started) return [];
  const seen = new Set();
  const actors = Array.from(combat.combatants ?? []).filter(combatant => {
    if (!game.user.isGM && (combatant.hidden || combatant.token?.hidden)) return false;
    const actor = combatant.actor;
    if (!actor || actor.type !== "character" || !getConfig(actor).mainParty || seen.has(actor.id)) return false;
    seen.add(actor.id);
    return true;
  }).map(combatant => combatant.actor);
  const playerOwned = actor => game.users.some(user => !user.isGM && actor.testUserPermission(user, "OWNER"));
  const players = actors.filter(playerOwned);
  const gmpcs = actors.filter(actor => !playerOwned(actor));
  const byName = (a, b) => String(a.name).localeCompare(String(b.name), undefined, {sensitivity: "base"});
  const selections = game.settings.get(MODULE_ID, "partySelections") ?? {};
  const selectedIds = new Set(Object.entries(selections)
    .filter(([userId]) => !game.users.get(userId)?.isGM)
    .map(([, actorId]) => String(actorId || "")));
  const selectedPlayers = players.filter(actor => selectedIds.has(actor.id)).sort(byName);
  const otherPlayers = players.filter(actor => !selectedIds.has(actor.id)).sort(byName);
  gmpcs.sort(byName);
  if (!game.user.isGM) {
    const selectedId = String(selections[game.user.id] || "");
    const index = selectedPlayers.findIndex(actor => actor.id === selectedId && actor.isOwner);
    if (index > 0) selectedPlayers.unshift(selectedPlayers.splice(index, 1)[0]);
  }
  return [...selectedPlayers, ...otherPlayers, ...gmpcs];
}

function combatHudTalentMarkup(actor, config) {
  if (!config.talentText && Number(config.talentPointsMax) <= 0) return "";
  const current = currentTalentPoints(actor);
  const maximum = Math.max(0, Number(config.talentPointsMax) || 0);
  const element = getElements().find(entry => entry.id === config.elementId);
  const progress = maximum > 0 ? clamp(current / maximum, 0, 1) : 0;
  return `<div class="tsru-combat-party-talent ${progress >= 1 ? "is-full" : ""}" style="--talent-progress:${progress * 360}deg;--talent-color:${escapeHTML(element?.color || "#e5c878")}" title="${escapeHTML(plainAbilityText(config.talentText) || `${actor.name} Talent`)}"><img src="${escapeHTML(config.talentIcon || actor.img || "icons/svg/star.svg")}" alt=""><strong>${current}/${maximum}</strong></div>`;
}

class CombatPartyHud {
  constructor() { this.element = null; this.drag = null; }
  render() {
    const actors = combatPartyActors();
    if (!actors.length) return this.destroy();
    if (!this.element) {
      this.element = document.createElement("section");
      this.element.className = "tsru-combat-party-hud";
      this.element.addEventListener("pointerdown", event => {
        const handle = event.target.closest("[data-tsru-hud-drag]");
        if (!handle || event.button !== 0) return;
        event.preventDefault();
        const rect = this.element.getBoundingClientRect();
        this.drag = {dx: event.clientX - rect.left, dy: event.clientY - rect.top};
        handle.setPointerCapture(event.pointerId);
      });
      this.element.addEventListener("pointermove", event => {
        if (!this.drag) return;
        this.element.style.setProperty("--hud-translate", "0px");
        this.element.style.left = `${clamp(event.clientX - this.drag.dx, 0, window.innerWidth - 50)}px`;
        this.element.style.top = `${clamp(event.clientY - this.drag.dy, 0, window.innerHeight - 30)}px`;
        this.element.style.bottom = "auto";
      });
      this.element.addEventListener("pointerup", async event => {
        if (!this.drag) return;
        this.drag = null;
        event.target.closest("[data-tsru-hud-drag]")?.releasePointerCapture?.(event.pointerId);
        const rect = this.element.getBoundingClientRect();
        await saveCombatPartyHudLayout({x: Math.round(rect.left), y: Math.round(rect.top)});
      });
      this.element.addEventListener("click", async event => {
        const control = event.target.closest("[data-tsru-hud-control]");
        if (control) {
          const layout = combatPartyHudLayout();
          const action = control.dataset.tsruHudControl;
          if (action === "minimize") await saveCombatPartyHudLayout({minimized: true});
          if (action === "expand") await saveCombatPartyHudLayout({minimized: false});
          if (action === "smaller") await saveCombatPartyHudLayout({scale: clamp(layout.scale - .1, .5, 1.75)});
          if (action === "larger") await saveCombatPartyHudLayout({scale: clamp(layout.scale + .1, .5, 1.75)});
          return refreshCombatPartyHud();
        }
        const button = event.target.closest("[data-tsru-party-ultimate]");
        if (!button) return;
        const actor = game.actors.get(button.dataset.actorId);
        if (!actor || (!game.user.isGM && !actor.isOwner)) return ui.notifications.warn("You can only activate an Ultimate for a character you own.");
        requestUltimate(actor);
      });
      document.body.appendChild(this.element);
    }
    const layout = combatPartyHudLayout();
    this.element.style.setProperty("--hud-user-scale", layout.scale);
    if (Number.isFinite(layout.x) && Number.isFinite(layout.y)) {
      this.element.style.setProperty("--hud-translate", "0px");
      this.element.style.left = `${clamp(layout.x, 0, window.innerWidth - 50)}px`;
      this.element.style.top = `${clamp(layout.y, 0, window.innerHeight - 30)}px`;
      this.element.style.bottom = "auto";
    } else {
      this.element.style.setProperty("--hud-translate", "-50%");
      this.element.style.left = "50%";
      this.element.style.top = "auto";
      this.element.style.bottom = "12px";
    }
    if (layout.minimized) {
      this.element.classList.add("is-minimized");
      this.element.innerHTML = '<button type="button" class="tsru-combat-hud-expand" data-tsru-hud-control="expand"><i class="fas fa-users"></i> Party HUD</button>';
      return this;
    }
    this.element.classList.remove("is-minimized");
    this.element.innerHTML = `<header class="tsru-combat-party-controls"><span class="tsru-combat-party-drag" data-tsru-hud-drag title="Drag combat party HUD"><i class="fas fa-grip-lines"></i></span><button type="button" data-tsru-hud-control="smaller" title="Make HUD smaller"><i class="fas fa-minus"></i></button><span>${Math.round(layout.scale * 100)}%</span><button type="button" data-tsru-hud-control="larger" title="Make HUD larger"><i class="fas fa-plus"></i></button><button type="button" data-tsru-hud-control="minimize" title="Minimize party HUD"><i class="fas fa-window-minimize"></i></button></header><div class="tsru-combat-party-line">${actors.map(actor => {
      const config = getConfig(actor);
      const hp = actor.system?.attributes?.hp ?? {};
      const hpValue = Math.max(0, Number(hp.value) || 0);
      const hpMax = Math.max(1, Number(hp.max) || 1);
      const hpTemp = Math.max(0, Number(hp.temp) || 0);
      const hpPercent = clamp((hpValue / hpMax) * 100, 0, 100);
      const shieldPercent = clamp((hpTemp / hpMax) * 100, 0, 100);
      const energyPercent = clamp((Number(config.current) / Math.max(1, Number(config.max))) * 100, 0, 100);
      const ready = config.enabled && energyPercent >= 100 && !state.ultimateLocks.has(actor.id);
      const owned = game.user.isGM || actor.isOwner;
      const element = getElements().find(entry => entry.id === config.elementId);
      const energyColor = ready ? (element?.readyColor || DEFAULT_CONFIG.readyColor) : (element?.chargeColor || DEFAULT_CONFIG.chargeColor);
      const portrait = config.combatHudPortrait || actor.img || "icons/svg/mystery-man.svg";
      return `<article class="tsru-combat-party-member ${owned ? "is-owned" : ""} ${hpTemp > 0 ? "has-shield" : ""}" data-actor-id="${actor.id}" style="${combatHudDesignStyle()};--hud-x:${clamp(config.combatHudPortraitX, 0, 100)}%;--hud-y:${clamp(config.combatHudPortraitY, 0, 100)}%;--hud-scale:${clamp(config.combatHudPortraitScale, 50, 300) / 100};--hud-flip:${config.combatHudPortraitFlip ? -1 : 1};--tsru-ultimate-x:${config.ultimateButtonAdjustEnabled ? clamp(config.ultimateButtonX,0,100) : 50}%;--tsru-ultimate-y:${config.ultimateButtonAdjustEnabled ? clamp(config.ultimateButtonY,0,100) : 50}%;--tsru-ultimate-scale:${(config.ultimateButtonAdjustEnabled ? clamp(config.ultimateButtonScale,50,400) : 100)/100};--energy:${energyPercent}%;--energy-color:${energyColor};--hp:${hpPercent}%;--shield:${shieldPercent}%">
        <div class="tsru-combat-party-portrait"><img src="${escapeHTML(portrait)}" alt="${escapeHTML(actor.name)}"></div>
        <strong class="tsru-combat-party-name">${escapeHTML(actor.name)}</strong>
        <div class="tsru-combat-party-hp" title="${hpTemp > 0 ? `${hpTemp} temporary HP shield · ` : ""}${hpValue}/${hpMax} HP"><b class="tsru-combat-party-shield-icon" aria-hidden="true"><i class="fas fa-shield-halved"></i></b><i class="tsru-combat-party-shield"></i><i class="tsru-combat-party-health"></i><span>${hpValue}/${hpMax}</span></div>
        ${combatHudTalentMarkup(actor, config)}
        <div class="tsru-combat-party-ultimate-wrap ${ready ? "is-ready" : ""}">${config.trialCharacter ? '<b class="tsru-combat-party-trial">Trial</b>' : ""}<button type="button" data-tsru-party-ultimate data-actor-id="${actor.id}" class="${ready ? "is-ready" : "is-unavailable"} ${owned ? "" : "is-locked"}" aria-disabled="${!owned || !ready}" title="${owned ? (ready ? "Activate Ultimate" : "Ultimate is not ready; drag it to the hotbar to create its macro") : "Only this character's owner can activate their Ultimate"}"><span class="tsru-hud-orb-fill"></span><img src="${escapeHTML(config.ultimateButtonImage || config.orbImage || actor.img || "icons/svg/mystery-man.svg")}" alt="">${config.showHudPercent ? `<strong>${Math.round(energyPercent)}%</strong>` : ""}</button></div>
      </article>`;
    }).join("")}</div>`;
    for (const button of this.element.querySelectorAll("[data-tsru-party-ultimate]")) {
      const actor = game.actors.get(button.dataset.actorId);
      if (actor && (game.user.isGM || actor.isOwner)) activateStarRailActionDrag(button, actor, "ultimate");
    }
    return this;
  }
  destroy() { this.element?.remove(); this.element = null; if (state.partyCombatHud === this) state.partyCombatHud = null; }
}

function combatPartyHudLayout() {
  const stored = game.settings.get(MODULE_ID, "combatPartyHudLayout") ?? {};
  const hasX = stored.x !== null && stored.x !== undefined && Number.isFinite(Number(stored.x));
  const hasY = stored.y !== null && stored.y !== undefined && Number.isFinite(Number(stored.y));
  return {scale: clamp(Number(stored.scale) || 1, .5, 1.75), minimized: Boolean(stored.minimized), x: hasX ? Number(stored.x) : null, y: hasY ? Number(stored.y) : null};
}

async function saveCombatPartyHudLayout(changes) {
  await game.settings.set(MODULE_ID, "combatPartyHudLayout", {...combatPartyHudLayout(), ...changes});
}

function refreshCombatPartyHud() {
  if (!game.combat?.started) { state.partyCombatHud?.destroy(); return; }
  if (!state.partyCombatHud) state.partyCombatHud = new CombatPartyHud();
  state.partyCombatHud.render();
}

async function showCombatPartyHud({notify = true} = {}) {
  if (!game.combat?.started) { if (notify) ui.notifications.warn("The combat party HUD only appears while initiative is active."); return false; }
  await saveCombatPartyHudLayout({minimized: false});
  refreshCombatPartyHud();
  refreshBossHud();
  refreshInitiativeCarousel();
  const shown = Boolean(document.querySelector(".tsru-combat-party-hud:not(.is-minimized)"));
  if (notify && shown) ui.notifications.info("Combat party HUD shown.");
  return shown;
}

function refreshOrb(actor) {
  if (actor) state.orbs.get(actor.id)?.render();
}

function refreshAllOrbs() {
  for (const orb of [...state.orbs.values()]) orb.destroy();
  for (const actor of game.actors.filter(actor => actor.type === "character" && canObserveActor(actor) && userLayout(actor.id).visible)) {
    const orb = new UltimateOrb(actor);
    state.orbs.set(actor.id, orb);
    orb.render();
  }
  refreshCombatPartyHud();
}

async function toggleOrb(actor) {
  const layout = userLayout(actor.id);
  await saveLayout(actor.id, {visible: !layout.visible});
  refreshOrb(actor);
}

async function showOrb(actor, {notify = true} = {}) {
  if (!game.user?.isGM) {
    if (notify) ui.notifications.warn("Only a GM can show a detached Ultimate orb from a character sheet.");
    return false;
  }
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
  let orb = state.orbs.get(actor.id);
  if (!orb) {
    orb = new UltimateOrb(actor);
    state.orbs.set(actor.id, orb);
  }
  orb.render();
  const shown = Boolean(orb.element?.isConnected);
  if (notify && shown) ui.notifications.info(`${actor.name}'s detached Ultimate orb was shown.`);
  return shown;
}

async function placeGMActionButton(actor, action) {
  if (!game.user?.isGM) return ui.notifications.warn("Only a GM can place character action buttons.");
  if (!actor || actor.type !== "character") return ui.notifications.warn("Choose a character first.");
  const config = getConfig(actor);
  if (action === "skill") {
    if (!config.skillEnabled) return ui.notifications.warn(`${actor.name}'s Skill button is disabled on their sheet.`);
    await saveSkillButtonLayout(actor.id, {visible: true});
    refreshSkillUI();
    ui.notifications.info(`${actor.name}'s Skill button was placed.`);
    return true;
  }
  if (action === "ultimate") {
    if (!config.enabled) return ui.notifications.warn(`${actor.name}'s Ultimate system is disabled on their sheet.`);
    await saveLayout(actor.id, {visible: true});
    let orb = state.orbs.get(actor.id);
    if (!orb) {
      orb = new UltimateOrb(actor);
      state.orbs.set(actor.id, orb);
    }
    orb.render();
    ui.notifications.info(`${actor.name}'s Ultimate button was placed.`);
    return true;
  }
  return ui.notifications.warn("Choose Skill or Ultimate.");
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

async function showSplash({actorName, image, duration = 1, splashX = 50, splashY = 50, splashScale = 100, ultimateName = "Ultimate", ultimateSubtitle = "", titleX = 17, titleY = 78, titleSize = 48, titleAlign = "left", fontFile = "", subtitleFontFile = "", color = DEFAULT_CONFIG.chargeColor}) {
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
  splash.style.setProperty("--tsru-splash-x", `${clamp(splashX, 0, 100)}%`);
  splash.style.setProperty("--tsru-splash-y", `${clamp(splashY, 0, 100)}%`);
  splash.style.setProperty("--tsru-splash-scale", String(clamp(splashScale, 25, 500) / 100));
  splash.innerHTML = `<div class="tsru-splash-backdrop"></div><div class="tsru-splash-media"><div class="tsru-splash-artwork"><div class="tsru-splash-artboard">${isVideo ? `<video src="${escapeHTML(image)}" autoplay muted playsinline></video>` : `<img src="${escapeHTML(image)}" alt="${escapeHTML(actorName)} Ultimate">`}</div></div><div class="tsru-title-card tsru-align-${align}"><i class="tsru-title-square tsru-title-square-one"></i><i class="tsru-title-square tsru-title-square-two"></i><div class="tsru-title-copy"><div class="tsru-title-name">${escapeHTML(ultimateName || actorName || "Ultimate")}</div><div class="tsru-title-bar">${ultimateSubtitle ? `<div class="tsru-title-subtitle">${escapeHTML(ultimateSubtitle)}</div>` : ""}</div></div></div></div>`;
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
  const labels = {skill: "Skill", ultimate: "Ultimate", elation: "Elation Action", talent: "Talent"};
  const icons = {skill: "fa-hand-sparkles", ultimate: "fa-burst", elation: "fa-masks-theater", talent: "fa-star"};
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
  const resumeCombatantId=combatant.getFlag(MODULE_ID,"resumeCombatantId");
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
  const advance=state.actionAdvances.get(combat.id);
  if(advance?.aha){await clearElationActionTurns(combat,{resetPunchline:true});await finishActionAdvance(combat,advance);return;}
  await clearElationActionTurns(combat,{resetPunchline:true});
  const resumeIndex=combat.turns.findIndex(entry=>entry.id===resumeCombatantId);
  if(resumeIndex>=0)await combat.update({round:Number(resumeRound),turn:resumeIndex});
  else if(combat.started)await combat.update({round:Number(resumeRound),turn:0});
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
  const cost = Math.max(0, Math.floor(Number(config.skillPointCost) || 0));
  if (currentSkillPoints() < cost) return ui.notifications.warn(`This Skill requires ${cost} Skill Points.`);
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
  if (!isAuthority() || state.skillLocks.has(actorId) || state.skillSpendLock) return false;
  const actor = game.actors.get(actorId);
  const requester = game.users.get(requestingUserId);
  if (!actor || actor.type !== "character" || (!requester?.isGM && !actor.testUserPermission(requester, "OWNER"))) return false;
  const config = getConfig(actor);
  if (!config.skillEnabled) { ui.notifications.warn(`${actor.name}'s Skill button is disabled.`); return false; }
  const cost = Math.max(0, Math.floor(Number(config.skillPointCost) || 0));
  if (currentSkillPoints() < cost) { ui.notifications.warn(`This Skill requires ${cost} Skill Points.`); return false; }

  state.skillSpendLock = true;
  state.skillLocks.add(actorId);
  game.socket.emit(SOCKET, {type: "skillState", actorId, locked: true});
  try {
    await setSkillPoints(currentSkillPoints() - cost);
    await dispatchTalentEvent("skillUsed", {sourceActor: actor, requestingUserId}, `${actor.id}:${Date.now()}`);
    const pending = {actorId, requestingUserId, timer: window.setTimeout(() => completeSkill(actorId), 120000)};
    state.pendingSkills.set(actorId, pending);
    if (requestingUserId === game.user.id) {
      await runSkillScript(actor);
      await completeSkill(actorId);
    } else game.socket.emit(SOCKET, {type: "useSkill", actorId, targetUserId: requestingUserId});
    return true;
  } catch (error) {
    console.error(`${MODULE_ID} | Skill failed`, error);
    ui.notifications.error(`Skill failed: ${error.message}`);
    await completeSkill(actorId);
    return false;
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

async function completeImmediateUltimate(actorId) {
  if (!isAuthority()) return;
  state.ultimateLocks.delete(actorId);
  game.socket.emit(SOCKET, {type: "ultimateState", actorId, locked: false});
  refreshOrb(game.actors.get(actorId));
}

async function beginImmediateUltimate(actor, requestingUserId) {
  broadcastUltimateSplash(actor);
  if (requestingUserId === game.user.id) {
    try { await runUltimateScript(actor); }
    catch (error) {
      console.error(`${MODULE_ID} | Immediate Ultimate failed`, error);
      ui.notifications.error(`Ultimate failed: ${error.message}`);
    } finally { await completeImmediateUltimate(actor.id); }
    return;
  }
  game.socket.emit(SOCKET, {type: "useUltimate", actorId: actor.id, combatantId: "", immediate: true, targetUserId: requestingUserId});
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
  const splash = {actorName: actor.name, image: config.splashImage, duration: config.splashDuration, splashX: config.splashX, splashY: config.splashY, splashScale: config.splashScale, ultimateName: config.ultimateName, ultimateSubtitle: config.ultimateSubtitle, titleX: config.titleX, titleY: config.titleY, titleSize: config.titleSize, titleAlign: config.titleAlign, fontFile: config.fontFile, subtitleFontFile: config.subtitleFontFile, color: element?.chargeColor || DEFAULT_CONFIG.chargeColor};
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
  queue.requests.sort((left,right)=>left.requestedAt-right.requestedAt||left.sequence-right.sequence);
  const request = queue.requests.shift();
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
    const current = combat.combatant;
    const isOwnNormalTurn = current?.actorId === actor.id
      && !current.getFlag(MODULE_ID, "temporaryUltimate")
      && !isElationActionCombatant(current)
      && !isAhaCombatant(current);
    if (isOwnNormalTurn) {
      return beginImmediateUltimate(actor, requestingUserId);
    }
    let queue = state.ultimateQueues.get(combat.id);
    if (!queue) {
      const isOtherMainPartyActor = current?.actorId !== actor.id && current?.actor?.type === "character" && getConfig(current.actor).mainParty;
      const waitsForAlly = Boolean(isOtherMainPartyActor && !current.getFlag(MODULE_ID, "temporaryUltimate"));
      queue = {resumeCombatantId: waitsForAlly ? null : current?.id ?? null, resumeRound: combat.round, waitTurnId: waitsForAlly ? current.id : null, activeActorId: null, requests: [], sequence: 0, startTimer: null};
      state.ultimateQueues.set(combat.id, queue);
    }
    queue.requests.push({actorId, requestingUserId, initiative: ultimateInitiative(actor, combat), requestedAt: Date.now(), sequence: queue.sequence++});
    if (!queue.waitTurnId && !queue.activeActorId && !queue.startTimer) queue.startTimer = window.setTimeout(() => processUltimateQueue(combat.id), 225);
  } catch (error) {
    console.error(`${MODULE_ID} | Ultimate failed`, error);
    ui.notifications.error(`Ultimate failed: ${error.message}`);
    await completeUltimate(actorId);
  }
}

async function onSocket(payload) {
  if (!payload?.type) return;
  if(payload.type==="craftRecipe"&&isAuthority()){
    const result=await executeCraftRecipe(payload.recipeId,payload.actorId,payload.requestingUserId,payload.craftCount);
    game.socket.emit(SOCKET,{type:"craftingResult",targetUserId:payload.requestingUserId,...result});return;
  }
  if(payload.type==="redeemRecipeCard"&&isAuthority()){
    const result=await executeRedeemRecipeCard(payload.actorId,payload.itemId,payload.requestingUserId);
    game.socket.emit(SOCKET,{type:"craftingResult",targetUserId:payload.requestingUserId,...result});return;
  }
  if(payload.type==="craftingResult"&&payload.targetUserId===game.user.id){
    (payload.ok?ui.notifications.info:ui.notifications.error).call(ui.notifications,payload.message);state.craftingApp?.render({force:false});return;
  }
  if (payload.type === "breakResult" || payload.type === "damageResult" || payload.type === "weaknessBreak") { await showBreakResult(payload); return; }
  if (payload.type === "ahaConfigChanged") {
    state.punchlineMeter?.destroy();
    refreshAhaButton();
    refreshPunchlineHUD();
    preloadAhaVideo(payload.video ?? getAhaConfig().video);
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
  if (payload.type === "changeTalentPoints" && isAuthority()) {
    const requester = game.users.get(payload.sourceUserId);
    const actor = game.actors.get(payload.actorId);
    if (!actor || (!requester?.isGM && !actor.testUserPermission(requester, "OWNER")) || !talentCombatForActor(actor)) return;
    await setTalentPoints(actor, currentTalentPoints(actor) + clamp(Number(payload.delta), -1, 1));
    refreshResourceHuds();
    return;
  }
  if (payload.type === "activateTechnique" && isAuthority()) {
    await executeTechnique(payload.actorId, payload.requestingUserId);
    return;
  }
  if (payload.type === "techniquePointsChanged") { refreshResourceHuds(); refreshTechniqueButtons(); return; }
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
    const accepted = await executeSkill(payload.actorId, payload.requestingUserId) === true;
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
    const target = await fromUuid(payload.targetUuid).catch(() => actorFromUuid(payload.targetUuid));
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
  if (payload.type === "applyChatTempHp" && isAuthority()) {
    const requestingUser = game.users.get(payload.sourceUserId);
    const message = game.messages.get(payload.messageId);
    const target = await fromUuid(payload.targetUuid).catch(() => actorFromUuid(payload.targetUuid));
    const result = await applyChatRollAsTempHp(message, target, requestingUser);
    game.socket.emit(SOCKET, {type: "chatTempHpResult", targetUserId: payload.sourceUserId, messageId: payload.messageId, ...result});
    return;
  }
  if (payload.type === "chatTempHpResult" && payload.targetUserId === game.user.id) {
    const notify = payload.ok ? ui.notifications.info : ui.notifications.error;
    notify.call(ui.notifications, payload.message);
    document.querySelectorAll(`[data-tsru-temp-hp-message="${CSS.escape(payload.messageId ?? "")}"]`).forEach(button => {
      button.disabled = false;
      button.innerHTML = '<i class="fas fa-shield-halved"></i><span>Add as TempHP</span>';
    });
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
      if (payload.immediate) game.socket.emit(SOCKET, {type: "immediateUltimateComplete", actorId: payload.actorId, userId: game.user.id});
    } catch (error) {
      console.error(`${MODULE_ID} | Player Ultimate failed`, error);
      ui.notifications.error(`Ultimate failed: ${error.message}`);
      game.socket.emit(SOCKET, {type: payload.immediate ? "immediateUltimateComplete" : "ultimateComplete", actorId: payload.actorId, userId: game.user.id, failed: true});
    }
    return;
  }
  if (payload.type === "immediateUltimateComplete" && isAuthority()) {
    const completingUser = game.users.get(payload.userId);
    const actor = game.actors.get(payload.actorId);
    if (state.ultimateLocks.has(payload.actorId) && (completingUser?.isGM || actor?.testUserPermission(completingUser, "OWNER"))) await completeImmediateUltimate(payload.actorId);
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
  if (message?.getFlag?.(MODULE_ID, "breakDamageRoll")) {
    return Math.max(0, Math.floor(Number(message.getFlag(MODULE_ID, "hpDamageAmount")) || 0));
  }
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
  return message.getFlag(MODULE_ID, "breakDamageRoll") || !/weakness break/i.test(String(message.flavor ?? ""));
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

function superBreakLabel(superBreak) { return superBreak ? "Super Break" : "Break"; }

async function applyChatRollAsDamage(message, target, requestingUser, applicationId = "") {
  if (!isAuthority()) return {ok: false, message: "Only the active GM can apply chat damage."};
  const {actor: targetActor} = toughnessTargetParts(target);
  if (!message || !targetActor) return {ok: false, message: "The roll or target no longer exists."};
  if (message.getFlag(MODULE_ID, "manualDamageDone")) return {ok: false, done: true, applications: manualDamageApplications(message), message: "Damage application has already been marked done."};
  const attacker = actorFromChatMessage(message);
  if (!attacker || (!requestingUser?.isGM && !attacker.testUserPermission(requestingUser, "OWNER"))) return {ok: false, message: "You do not control the character that made this roll."};
  if (!isManualChatDamageEligible(message)) return {ok: false, message: "This roll is not eligible for combat damage."};
  const combat = game.combat;
  if (!combat?.combatants.some(combatant => combatant.actorId === targetActor.id || combatant.actor?.id === targetActor.id || combatant.actor?.uuid === targetActor.uuid)) return {ok: false, message: "The targeted creature is not in the current combat."};
  const total = manualChatDamageAmount(message);
  const config = getConfig(attacker);
  const isBreakDamageRoll = Boolean(message.getFlag(MODULE_ID, "breakDamageRoll"));
  const isSuperBreakDamageRoll = Boolean(message.getFlag(MODULE_ID, "superBreakDamageRoll"));
  const hpDamage = isBreakDamageRoll ? total : config.breakCharacter ? Math.min(1, total) : total;
  const rolledDiceDamage = rawDiceTotal(message.rolls);
  const toughnessDamage = isBreakDamageRoll ? 0 : config.breakCharacter ? total : (rolledDiceDamage > 0 ? rolledDiceDamage : total);
  const resolvedApplicationId = applicationId || foundry.utils.randomID();
  const targetUuid = toughnessTargetParts(target).tokenDocument?.uuid ?? targetActor.uuid;
  const eventKey = `manual-chat-damage:${message.id}:${resolvedApplicationId}:${targetUuid}`;
  if (isBreakDamageRoll) {
    const breakType = isSuperBreakDamageRoll ? "superBreak" : "break";
    state.lastDamageDisplay = {
      type: breakType,
      label: isSuperBreakDamageRoll ? "Super Break" : "Break",
      color: damageResultColor(attacker),
      critical: false,
      attackerId: attacker.id,
      expires: Date.now() + 15000
    };
  }
  await applyDirectChatDamage(targetActor, hpDamage);
  if (attacker.type === "character" && hpDamage > 0) {
    if (isBreakDamageRoll) {
      const elementColor = damageResultColor(attacker);
      await broadcastDamageResult(target, hpDamage, {
        plainDamage: false,
        superBreak: isSuperBreakDamageRoll,
        color: elementColor,
        fontFile: isSuperBreakDamageRoll ? getBreakFonts().superBreakFontFile : getBreakFonts().breakFontFile
      });
    } else {
      await broadcastDamageOnce(attacker, target, hpDamage, eventKey, {critical:damageRollWasCritical(message)});
    }
  }
  const appliedToughness = toughnessDamage > 0 ? await applyToughnessDamage(attacker, [target], toughnessDamage, eventKey) : 0;
  const detail = {sourceActor: attacker, targetActor, amount: hpDamage, origin: message, manual: true};
  await dispatchTalentEvent("damageDealt", detail, eventKey);
  await dispatchTalentEvent("damageTaken", detail, eventKey);
  await awardPunchlineForAttack(attacker, eventKey);
  if (targetActor.type === "character") {
    const targetConfig = getConfig(targetActor);
    if (targetConfig.attackedMode === "targeted" || targetConfig.attackedMode === "hit") await addEnergy(targetActor, energyGain(targetConfig, "attacked"), "hit");
  }
  const application = {id: resolvedApplicationId, actorUuid: attacker.uuid, targetUuid, targetName: targetActor.name, amount: hpDamage, total, damageKind: isSuperBreakDamageRoll ? "superBreak" : isBreakDamageRoll ? "break" : "normal", toughnessDamage: appliedToughness, toughnessAttempted: toughnessDamage, userId: requestingUser?.id, appliedAt: Date.now()};
  const applications = [...manualDamageApplications(message), application];
  await message.setFlag(MODULE_ID, "manualDamageApplications", applications);
  return {ok: true, applications, done: false, message: isBreakDamageRoll ? `${superBreakLabel(isSuperBreakDamageRoll)} applied ${hpDamage} HP damage to ${targetActor.name}.` : `${total} roll damage applied to ${targetActor.name} (${hpDamage} HP, ${appliedToughness} Toughness).`};
}

async function finishManualChatDamage(message, requestingUser) {
  if (!isAuthority()) return {ok: false, message: "Only the active GM can finish chat damage."};
  const attacker = actorFromChatMessage(message);
  if (!message || !attacker || (!requestingUser?.isGM && !attacker.testUserPermission(requestingUser, "OWNER"))) return {ok: false, message: "You do not control the character that made this roll."};
  await message.setFlag(MODULE_ID, "manualDamageDone", true);
  return {ok: true, done: true, applications: manualDamageApplications(message), message: "Finished applying damage from this roll."};
}

async function applyChatRollAsTempHp(message, target, requestingUser) {
  if (!isAuthority()) return {ok: false, message: "Only the active GM can apply temporary HP from chat."};
  const sourceActor = actorFromChatMessage(message);
  const {actor: targetActor} = toughnessTargetParts(target);
  if (!message || !sourceActor || !targetActor) return {ok: false, message: "The roll or target no longer exists."};
  if (!requestingUser?.isGM && !sourceActor.testUserPermission(requestingUser, "OWNER")) return {ok: false, message: "You do not control the character that made this roll."};
  const amount = manualChatDamageAmount(message);
  if (amount <= 0) return {ok: false, message: "This roll has no positive total to add as temporary HP."};
  const hp = targetActor.system?.attributes?.hp;
  if (!hp || hp.temp === undefined || hp.temp === null) return {ok: false, message: `${targetActor.name} does not have a temporary HP field.`};
  const before = Math.max(0, Number(hp.temp) || 0);
  const after = before + amount;
  await targetActor.update({"system.attributes.hp.temp": after});
  return {ok: true, amount, before, after, targetName: targetActor.name, message: `Added ${amount} temporary HP to ${targetActor.name} (${before} → ${after}).`};
}

async function limitBreakAttackHpDamage(attacker, target, amount, eventId, options = {}) {
  if (!getConfig(attacker).breakCharacter || !["npc","character"].includes(target?.type) || !getToughness(target).enabled || Number(amount) <= 1) return;
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

const DEFAULT_DAMAGE_DISPLAY = Object.freeze({
  brokenOverlayImage: "",
  damageFontFile: "",
  breakFontFile: "",
  superBreakFontFile: "",
  damageFontSize: 56,
  breakFontSize: 48,
  superBreakFontSize: 48,
  damageBold: true,
  breakBold: true,
  superBreakBold: true,
  damageGradient: true,
  breakGradient: true,
  superBreakGradient: true,
  damageInheritElement: true,
  breakInheritElement: true,
  superBreakInheritElement: true,
  damageTopColor: "#ffd84d",
  breakTopColor: "#ffd84d",
  superBreakTopColor: "#ffd84d",
  damageBottomColor: "#ffffff",
  breakBottomColor: "#ffffff",
  superBreakBottomColor: "#ffffff"
});

function getBreakFonts() {
  const stored = game.settings.get(MODULE_ID, "breakFonts") ?? {};
  const config = foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_DAMAGE_DISPLAY), stored, {inplace:false});
  for (const type of ["damage", "break", "superBreak"]) {
    config[`${type}FontSize`] = clamp(Number(config[`${type}FontSize`]) || DEFAULT_DAMAGE_DISPLAY[`${type}FontSize`], 16, 140);
    config[`${type}Bold`] = Boolean(config[`${type}Bold`]);
    config[`${type}Gradient`] = Boolean(config[`${type}Gradient`]);
    config[`${type}InheritElement`] = config[`${type}InheritElement`] !== false;
    if (!/^#[0-9a-f]{6}$/i.test(config[`${type}TopColor`] ?? "")) config[`${type}TopColor`] = "#ffd84d";
    if (!/^#[0-9a-f]{6}$/i.test(config[`${type}BottomColor`] ?? "")) config[`${type}BottomColor`] = "#ffffff";
  }
  return config;
}

function damageDisplayStyle(type) {
  const config = getBreakFonts();
  const prefix = type === "superBreak" ? "superBreak" : type === "break" ? "break" : "damage";
  return {
    fontFile: config[`${prefix}FontFile`] || "",
    fontSize: config[`${prefix}FontSize`],
    bold: config[`${prefix}Bold`],
    gradient: config[`${prefix}Gradient`],
    inheritElement: config[`${prefix}InheritElement`],
    topColor: config[`${prefix}TopColor`],
    bottomColor: config[`${prefix}BottomColor`]
  };
}

class BreakAppearanceConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:"tsru-break-appearance", title:"Damage Display Appearance",
      template:`modules/${MODULE_ID}/templates/break-appearance.hbs`,
      width:720, height:"auto", resizable:true, closeOnSubmit:true
    });
  }
  getData() {
    const elements = getElements().map((element, index) => ({...element, previewSelected:index===0}));
    return {config:getBreakFonts(), elements, previewColor:elements[0]?.readyColor || "#ed4855"};
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".file-picker").on("click", event => {
      const input=html.find(`[name="${event.currentTarget.dataset.target}"]`);
      new FilePicker({type:event.currentTarget.dataset.fileType||"any",current:input.val(),callback:path=>input.val(path).trigger("input").trigger("change")}).browse();
    });
    let previewSequence = 0;
    const refreshPreview = async () => {
      const sequence = ++previewSequence;
      const type = String(html.find('[name="previewType"]').val() || "damage");
      const prefix = type === "superBreak" ? "superBreak" : type === "break" ? "break" : "damage";
      const color = html.find('[name="previewElement"] option:selected').data("readyColor") || "#ed4855";
      const preview = html.find(".tsru-damage-style-preview");
      const popup = preview.find(".tsru-break-popup");
      const size = clamp(Number(html.find(`[name="${prefix}FontSize"]`).val()), 16, 140);
      const bold = html.find(`[name="${prefix}Bold"]`).prop("checked");
      const gradient = html.find(`[name="${prefix}Gradient"]`).prop("checked");
      let fontFamily = "Arial, sans-serif";
      try { fontFamily = await loadSplashFont(html.find(`[name="${prefix}FontFile"]`).val()); }
      catch (_error) {}
      if (sequence !== previewSequence) return;
      popup.toggleClass("is-plain-damage", type === "damage" || type === "critical");
      const inheritElement = html.find(`[name="${prefix}InheritElement"]`).prop("checked");
      const topColor = inheritElement ? color : html.find(`[name="${prefix}TopColor"]`).val();
      const bottomColor = html.find(`[name="${prefix}BottomColor"]`).val() || "#ffffff";
      const label = type === "critical" ? "CRIT Hit" : type === "superBreak" ? "Super Break" : type === "break" ? "Break" : "";
      renderDamageSvg(popup[0], {
        label,
        damage: "81433",
        fontFamily,
        fontSize: size,
        bold,
        gradient,
        topColor,
        bottomColor
      });
    };
    html.on("input change", "input, select", refreshPreview);
    refreshPreview();
  }
  async _updateObject(_event, formData) {
    if (!game.user.isGM) return;
    const config = {brokenOverlayImage:String(formData.brokenOverlayImage ?? "").trim()};
    for (const type of ["damage", "break", "superBreak"]) {
      config[`${type}FontFile`] = String(formData[`${type}FontFile`] ?? "").trim();
      config[`${type}FontSize`] = clamp(Number(formData[`${type}FontSize`]), 16, 140);
      config[`${type}Bold`] = Boolean(formData[`${type}Bold`]);
      config[`${type}Gradient`] = Boolean(formData[`${type}Gradient`]);
      config[`${type}InheritElement`] = Boolean(formData[`${type}InheritElement`]);
      config[`${type}TopColor`] = /^#[0-9a-f]{6}$/i.test(formData[`${type}TopColor`] ?? "") ? formData[`${type}TopColor`] : "#ffd84d";
      config[`${type}BottomColor`] = /^#[0-9a-f]{6}$/i.test(formData[`${type}BottomColor`] ?? "") ? formData[`${type}BottomColor`] : "#ffffff";
    }
    await game.settings.set(MODULE_ID, "breakFonts", config);
    refreshBrokenTokenOverlays();
    ui.notifications.info("Universal damage display appearance saved.");
  }
}

function breakDisplayTarget(target) {
  const {actor,tokenDocument}=toughnessTargetParts(target);
  const preferred=[...(game.user?.targets??[]),...(canvas?.tokens?.controlled??[])].find(token=>token.actor?.id===actor?.id);
  return canvas?.tokens?.get(tokenDocument?.id) ?? preferred ?? (canvas?.tokens?.placeables ?? []).find(token => token.actor?.id === actor?.id) ?? null;
}

function safePopupColor(value, fallback = "#ffffff") {
  return /^#[0-9a-f]{6}$/i.test(String(value ?? "")) ? String(value) : fallback;
}

function renderDamageSvg(container, {label = "", damage = "0", labelOnly = false, fontFamily = "Arial, sans-serif", fontSize = 48, bold = true, gradient = true, topColor = "#ffffff", bottomColor = "#ffffff"} = {}) {
  if (!container) return;
  container.replaceChildren();
  const ns = "http://www.w3.org/2000/svg";
  const size = clamp(Number(fontSize), 16, 140);
  const labelSize = labelOnly ? size : size * .52;
  const width = Math.max(150, labelOnly ? String(label).length * labelSize * .72 : String(damage).length * size * .72, String(label).length * labelSize * .68);
  const height = labelOnly ? size * 1.25 : label ? size * 1.65 : size * 1.2;
  const svg = document.createElementNS(ns, "svg");
  svg.classList.add("tsru-damage-svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("overflow", "visible");
  const id = `tsru-gradient-${foundry.utils.randomID()}`;
  const defs = document.createElementNS(ns, "defs");
  const linear = document.createElementNS(ns, "linearGradient");
  linear.id = id;
  linear.setAttribute("x1", "0"); linear.setAttribute("y1", "0");
  linear.setAttribute("x2", "0"); linear.setAttribute("y2", "100%");
  for (const [offset, color] of [["0%", safePopupColor(topColor)], ["38%", safePopupColor(topColor)], ["100%", safePopupColor(bottomColor)]]) {
    const stop = document.createElementNS(ns, "stop");
    stop.setAttribute("offset", offset);
    stop.setAttribute("stop-color", color);
    linear.appendChild(stop);
  }
  defs.appendChild(linear); svg.appendChild(defs);
  const addText = (text, y, textSize) => {
    const node = document.createElementNS(ns, "text");
    node.textContent = text;
    node.setAttribute("x", "50%");
    node.setAttribute("y", String(y));
    node.setAttribute("text-anchor", "middle");
    node.setAttribute("dominant-baseline", "middle");
    node.setAttribute("fill", gradient ? `url(#${id})` : "#ffffff");
    node.setAttribute("stroke", "#18181e");
    node.setAttribute("stroke-opacity", "0.95");
    node.setAttribute("stroke-width", "1.5");
    node.setAttribute("paint-order", "stroke fill");
    node.style.fontFamily = fontFamily;
    node.style.fontSize = `${textSize}px`;
    node.style.fontWeight = bold ? "900" : "400";
    node.style.filter = "drop-shadow(0 1px 1px rgba(0,0,0,.65))";
    svg.appendChild(node);
  };
  if (label) addText(label, labelOnly ? height * .52 : labelSize * .72, labelSize);
  if (!labelOnly) addText(String(damage), label ? labelSize + size * .62 : height * .52, size);
  container.appendChild(svg);
}

function installDamageScrollingTextOverride() {
  const layer = canvas?.interface;
  if (!layer?.createScrollingText || layer.__tsruDamageTextOriginal) return;
  try {
    const original = layer.createScrollingText;
    Object.defineProperty(layer, "__tsruDamageTextOriginal", {value:original, configurable:true});
    layer.createScrollingText = function(origin, content, options = {}) {
      if(state.bossTransitionVisuals>0 || state.bossTransitionVisualsUntil>Date.now() || options?.tsruBossTransition)return Promise.resolve();
      const numeric = /^[+\-−]?\s*\d+(?:\.\d+)?$/.test(String(content ?? "").trim());
      if (!numeric || state.customDamageScrollingText) return original.call(this, origin, content, options);
      const recent = state.lastDamageDisplay?.expires > Date.now() ? state.lastDamageDisplay : null;
      const style = damageDisplayStyle(recent?.type || "damage");
      const topColor = (recent?.forceElementColor || style.inheritElement) ? (recent?.color || "#ffffff") : style.topColor;
      const statusLabel = recent?.label || (recent?.critical ? "CRIT Hit" : "");
      const shown = statusLabel ? `${statusLabel}\n${content}` : content;
      return Promise.resolve(loadSplashFont(style.fontFile)).catch(() => "Arial, sans-serif").then(fontFamily => original.call(this, origin, shown, {
        ...options,
        fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.bold ? "900" : "400",
        fill: style.gradient ? [safePopupColor(topColor), safePopupColor(style.bottomColor)] : "#ffffff",
        fillGradientType: 0,
        fillGradientStops: [0, 1],
        stroke: "#202028",
        strokeThickness: 2,
        duration: 1200,
        distance: 42
      }));
    };
  } catch(error) {
    console.warn(`${MODULE_ID} | Could not restyle Foundry damage scrolling text`, error);
  }
}

async function broadcastDamageResult(target, damage, {plainDamage=false, critical=false, superBreak=false, forceElementColor=false, color="", fontFile=""}={}) {
  const {actor}=toughnessTargetParts(target);
  const token=breakDisplayTarget(target);
  const display={type:plainDamage?"damageResult":"breakResult",actorId:actor?.id??"",tokenId:token?.id??"",sceneId:canvas?.scene?.id??"",damage,plainDamage,critical,superBreak,forceElementColor,color,fontFile};
  await showBreakResult(display);
  game.socket.emit(SOCKET,display);
}

function damageResultColor(attacker, {_hpDamage = false} = {}) {
  const config = getConfig(attacker);
  const assigned = String(config.elementId ?? "").trim();
  const element = getElements().find(entry =>
    String(entry.id ?? "") === assigned ||
    (assigned && String(entry.name ?? "").toLowerCase() === assigned.toLowerCase())
  );
  const candidates = [element?.readyColor, element?.color, element?.chargeColor, config.readyColor, config.chargeColor];
  return candidates.find(color => /^#[0-9a-f]{6}$/i.test(String(color ?? ""))) || "#ffffff";
}

function damageRollWasCritical(source) {
  const confirmed = value => value === true;
  const criticalRoll = roll => confirmed(roll?.isCritical) || confirmed(roll?.options?.critical);
  return confirmed(source?.isCritical)
    || confirmed(source?.critical)
    || confirmed(source?.flags?.dnd5e?.roll?.critical)
    || confirmed(source?.flags?.["midi-qol"]?.isCritical)
    || criticalRoll(source?.attackRoll)
    || Boolean(source?.attackRolls?.some?.(criticalRoll))
    || Boolean(source?.rolls?.some?.(criticalRoll));
}

async function broadcastDamageOnce(attacker, target, amount, eventId, {critical = false} = {}) {
  const value = Math.max(0, Math.floor(Number(amount) || 0));
  const targetActor = target?.actor ?? target?.document?.actor ?? target;
  if (!attacker || attacker.type !== "character" || !targetActor || value <= 0) return false;
  const key = `damage-popup:${eventId || "unknown"}:${targetActor.uuid || targetActor.id}:${value}`;
  if (state.processedMessages.has(key)) return false;
  state.processedMessages.add(key);
  window.setTimeout(() => state.processedMessages.delete(key), 120000);
  const forceElementColor = Boolean(getConfig(attacker).breakCharacter && value === 1);
  state.lastDamageDisplay = {color:damageResultColor(attacker, {hpDamage:true}), critical:Boolean(critical), forceElementColor, expires:Date.now() + 15000};
  await broadcastDamageResult(target, value, {
    plainDamage: true,
    critical,
    forceElementColor,
    color: damageResultColor(attacker, {hpDamage:true}),
    fontFile: getBreakFonts().damageFontFile
  });
  return true;
}

async function showBreakResult(payload) {
  if (payload.sceneId && canvas?.scene?.id !== payload.sceneId) return;
  const token = canvas?.tokens?.get(payload.tokenId) ?? breakDisplayTarget(game.actors.get(payload.actorId));
  if(payload.announcementOnly&&token)await renderBrokenTokenOverlay(token);
  const damage = String(Math.max(0, Math.floor(Number(payload.damage) || 0)));
  const type = payload.plainDamage ? "damage" : payload.superBreak ? "superBreak" : "break";
  const label = payload.announcementOnly ? "BREAK" : payload.plainDamage ? (payload.critical ? "CRIT Hit" : "") : payload.superBreak ? "SUPER BREAK" : "BREAK";
  const style = damageDisplayStyle(type);
  let fontFamily = "Arial, sans-serif";
  try { fontFamily = await loadSplashFont(style.fontFile || payload.fontFile); }
  catch(error) { console.warn(`${MODULE_ID} | Could not load damage popup font`, error); }
  installDamageScrollingTextOverride();
  const configuredTop = (payload.forceElementColor || style.inheritElement) ? payload.color : style.topColor;
  const topColor = safePopupColor(configuredTop, "#ffffff");
  const bottomColor = safePopupColor(style.bottomColor, "#ffffff");
  if(!token||!canvas?.interface?.createScrollingText)return;
  const content=payload.announcementOnly?"BREAK":label?`${label}\n${damage}`:damage;
  const longestLine=Math.max(...content.split("\n").map(line=>line.length),1);
  const fontSize=clamp(Math.min(style.fontSize,token.w/Math.max(2.4,longestLine*.68)),12,style.fontSize);
  await canvas.interface.createScrollingText(token.center,content,{
    anchor:CONST.TEXT_ANCHOR_POINTS.CENTER,
    direction:CONST.TEXT_ANCHOR_POINTS.TOP,
    duration:1200,
    distance:Math.max(8,token.h*.12),
    jitter:0,
    fontFamily,
    fontSize,
    fontWeight:style.bold?"900":"400",
    fill:style.gradient?[topColor,bottomColor]:"#ffffff",
    fillGradientType:0,
    fillGradientStops:[0,1],
    stroke:"#18181e",
    strokeThickness:2
  });
}

async function broadcastWeaknessBreak(attacker, target) {
  const {actor}=toughnessTargetParts(target);
  const token=breakDisplayTarget(target);
  const display={type:"weaknessBreak",actorId:actor?.id??"",tokenId:token?.id??"",sceneId:canvas?.scene?.id??"",damage:0,announcementOnly:true,forceElementColor:true,color:damageResultColor(attacker)};
  await showBreakResult(display);
  game.socket.emit(SOCKET,display);
}

function removeBrokenTokenOverlay(token) {
  const overlay=token?.__tsruBrokenOverlay;
  if(overlay){overlay.destroy?.({children:true});delete token.__tsruBrokenOverlay;}
  if(token)delete token.__tsruBrokenOverlayLoading;
}

async function renderBrokenTokenOverlay(token) {
  if(!token?.actor)return;
  const image=String(getBreakFonts().brokenOverlayImage||"").trim();
  const broken=getToughness(token.actor).enabled&&getToughness(token.actor).current<=0;
  if(!image||!broken){removeBrokenTokenOverlay(token);return;}
  const existing=token.__tsruBrokenOverlay;
  if(existing?.__tsruSource===image){existing.width=token.w;existing.height=token.h;return;}
  if(token.__tsruBrokenOverlayLoading===image)return;
  removeBrokenTokenOverlay(token);
  token.__tsruBrokenOverlayLoading=image;
  try{
    const texture=await loadTexture(image);
    if(token.__tsruBrokenOverlayLoading!==image||!token.parent||!token.actor||getToughness(token.actor).current>0||String(getBreakFonts().brokenOverlayImage||"").trim()!==image)return;
    const sprite=new PIXI.Sprite(texture);
    sprite.__tsruSource=image;sprite.name="tsru-broken-token-overlay";sprite.position.set(0,0);sprite.width=token.w;sprite.height=token.h;sprite.zIndex=9999;sprite.eventMode="none";sprite.interactive=false;
    token.sortableChildren=true;token.addChild(sprite);token.__tsruBrokenOverlay=sprite;
  }catch(error){console.warn(MODULE_ID+" | Could not load broken-token overlay",error);}finally{if(token.__tsruBrokenOverlayLoading===image)delete token.__tsruBrokenOverlayLoading;}
}

function refreshBrokenTokenOverlays(){for(const token of canvas?.tokens?.placeables??[])renderBrokenTokenOverlay(token);}

async function applyWeaknessBreakDamage(attacker, target, {superBreak = false} = {}) {
  const config = getConfig(attacker);
  const targetActor = toughnessTargetParts(target).actor;
  if (!targetActor || !config.breakCharacter || (superBreak && !config.superBreakCharacter)) return 0;
  const count = clamp(Math.floor(config.breakDamageDice), 1, 20);
  const faces = [4, 6, 8, 10, 12, 20].includes(Number(config.breakDamageDie)) ? Number(config.breakDamageDie) : 6;
  const modifier = Math.max(1, breakEffectModifier(config));
  const roll = await new Roll(`${count}d${faces}`).evaluate();
  const damage = Math.max(0, Math.floor(superBreak ? (Number(roll.total) || 0) + breakEffectModifier(config) + 1 : (Number(roll.total) || 0) * modifier));
  const element = getElements().find(entry => entry.id === config.elementId);
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor: attacker}),
    flavor: `${attacker.name} — ${superBreak ? "Super Break" : "Break"} (${count}d${faces} ${superBreak ? `+ ${breakEffectModifier(config) + 1}` : `× ${modifier}`}): ${damage} HP damage`,
    flags: {
      [MODULE_ID]: {
        breakDamageRoll: true,
        superBreakDamageRoll: Boolean(superBreak),
        damageKind: superBreak ? "superBreak" : "break",
        hpDamageAmount: damage,
        elementColor: element?.readyColor || "#ffffff"
      }
    }
  });
  ui.notifications.info(`${superBreak ? "Super Break" : "Break"} rolled ${damage} HP damage. Use Apply Damage on the chat card.`);
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

function processDnd5eAppliedDamage(...args) {
  const target=args.find(value=>value?.documentName==="Actor" || value?.documentName==="Token" || value?.actor?.documentName==="Actor");
  const options=[...args].reverse().find(value=>value && typeof value==="object" && value!==target) ?? {};
  const numeric=args.find(value=>typeof value==="number" && Number.isFinite(value));
  const amount=numeric ?? Number(options.amount ?? options.damage ?? options.appliedDamage ?? options.total ?? 0);
  if (!target || !Number.isFinite(Number(amount)) || Number(amount)<=0) return;
  return processAppliedDamage(target,Number(amount),options);
}

async function processAppliedDamage(target, amount, options = {}) {
  if (!isAuthority() || !target) return;
  const origin = options.origin;
  const sourceUuid = options.midi?.sourceActorUuid ?? options.sourceActorUuid ?? options.workflow?.actor?.uuid;
  let attacker = options.sourceActor ?? options.workflow?.actor ?? (sourceUuid ? await fromUuid(sourceUuid).catch(() => null) : null);
  attacker = attacker?.actor ?? attacker;
  if (!attacker && options.item?.actor) attacker=options.item.actor;
  if (!attacker && origin?.speaker?.actor) attacker = game.actors.get(origin.speaker.actor);
  if (!attacker && origin?.speaker?.token) attacker = canvas?.tokens?.get(origin.speaker.token)?.actor;
  if (!attacker || attacker.documentName !== "Actor") return;

  const targetActor = target?.actor ?? target?.document?.actor ?? target;
  const damageEventId = origin?.id ?? options.midi?.workflowId ?? "unknown";

  if (Number(amount) > 0) {
    const shownDamage=getConfig(attacker).breakCharacter ? Math.min(1,Math.floor(Number(amount))) : Math.floor(Number(amount));
    const critical = damageRollWasCritical(options.midi ?? options.workflow ?? origin);
    await broadcastDamageOnce(attacker, target, shownDamage, damageEventId, {critical});
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
  await applyToughnessDamage(attacker, [target], toughnessDamage, eventKey);
}

async function delayBrokenCombatant(target) {
  const combat = game.combat;
  const actor = toughnessTargetParts(target).actor;
  if (!combat?.started || !actor) return;
  const tokenId = toughnessTargetParts(target).tokenDocument?.id;
  const combatant = combat.combatants.find(entry => entry.actor?.id === actor.id && (!tokenId || entry.tokenId === tokenId) && !entry.getFlag(MODULE_ID, "temporaryUltimate") && !isElationActionCombatant(entry));
  if (!combatant || combatant.getFlag(MODULE_ID, "brokenInitiative")) return;
  const index = combat.turns.findIndex(entry => entry.id === combatant.id);
  const canDelay = index > combat.turn && combatant.initiative !== null;
  const original = combatant.initiative;
  await combatant.setFlag(MODULE_ID, "brokenInitiative", {initiative:original, round:combat.round, delayed:canDelay});
  if (!canDelay) return;
  const activeId = combat.combatant?.id;
  const lowest = Math.min(...combat.combatants.map(entry => Number(entry.initiative)).filter(Number.isFinite));
  state.suppressCombatHook = true;
  try {
    await combatant.update({initiative:lowest - 1});
    const activeIndex = combat.turns.findIndex(entry => entry.id === activeId);
    if (activeIndex >= 0 && activeIndex !== combat.turn) await combat.update({turn:activeIndex});
  } finally { state.suppressCombatHook = false; }
}

async function restoreBrokenCombatant(combatant, {preserveActive = true} = {}) {
  const stored = combatant?.getFlag(MODULE_ID, "brokenInitiative");
  if (!combatant || !isAuthority()) return;
  const actor = combatant.actor;
  if (!stored && (!getToughness(actor).enabled || getToughness(actor).current !== 0)) return;
  const toughness = getToughness(actor);
  if (toughness.enabled && toughness.current === 0) {
    await actor.update({[`flags.${MODULE_ID}.toughness.current`]:toughness.max});
    ui.notifications.info(`${actor.name}'s Toughness recovered to full.`);
  }
  const combat = combatant.parent, activeId = combat?.combatant?.id;
  state.suppressCombatHook = true;
  try {
    if (stored?.delayed && stored.initiative !== null) await combatant.update({initiative:stored.initiative});
    if (stored) await combatant.unsetFlag(MODULE_ID, "brokenInitiative");
    const activeIndex = combat?.turns.findIndex(entry => entry.id === activeId) ?? -1;
    if (preserveActive && activeIndex >= 0 && activeIndex !== combat.turn) await combat.update({turn:activeIndex});
  } finally { state.suppressCombatHook = false; }
  refreshToughnessBars();
}

async function skipBrokenCombatantTurn(combat, combatant) {
  const stored = combatant?.getFlag(MODULE_ID, "brokenInitiative");
  if (!isAuthority() || !combat?.started || !stored || !getToughness(combatant.actor).enabled || getToughness(combatant.actor).current !== 0) return false;
  const beforeTurns=[...combat.turns];
  const currentIndex=beforeTurns.findIndex(entry=>entry.id===combatant.id);
  const nextId=beforeTurns[currentIndex+1]?.id ?? null;
  const round=combat.round;
  await restoreBrokenCombatant(combatant,{preserveActive:false});
  state.suppressCombatHook=true;
  try {
    const nextIndex=nextId ? combat.turns.findIndex(entry=>entry.id===nextId) : -1;
    if (nextIndex >= 0) await combat.update({round,turn:nextIndex});
    else await combat.update({round:round+1,turn:0});
  } finally { state.suppressCombatHook=false; }
  state.lastCombatTurns.set(combat.id,combatTurnSnapshot(combat));
  ui.notifications.info(`${combatant.name}'s broken turn was skipped.`);
  return true;
}

async function applyToughnessDamage(attacker, targets, amount, eventKey = "") {
  if (!isAuthority() || !attacker || amount <= 0) return 0;
  const targetList = [...targets].filter(Boolean);
  const targetSignature = targetList.map(target => (target?.actor ?? target?.document?.actor ?? target)?.uuid ?? target?.id ?? "target").sort().join(",");
  const signature = `${attacker.uuid}:${targetSignature}:${amount}`;
  const now = Date.now();
  const isManualApplication = String(eventKey).startsWith("manual-chat-damage:");
  if (!isManualApplication && now - (state.recentToughness.get(signature) ?? 0) < 1500) return 0;
  const processedKey = eventKey ? `toughness:${eventKey}` : "";
  if (!isManualApplication && processedKey && state.processedMessages.has(processedKey)) return 0;
  const elementId = getConfig(attacker).elementId;
  const breakCharacter = getConfig(attacker).breakCharacter;
  const freeForAll = game.actors.some(entry => entry.type === "character" && foundry.utils.getProperty(entry.getFlag(MODULE_ID, "scriptState") ?? {}, "lark.freeForAll.active"));
  if (!elementId && !freeForAll) return 0;
  let applied = false;
  for (const target of targetList) {
    const actor = target?.actor ?? target?.document?.actor ?? target;
    if (!actor || !["npc","character"].includes(actor.type)) continue;
    if (toughnessWeaknessMode(target) === "none") continue;
    const toughness = getToughness(actor);
    const matchesWeakness = Boolean(elementId && effectiveToughnessWeaknesses(target).includes(elementId));
    if (!toughness.enabled || (!breakCharacter && !freeForAll && !matchesWeakness)) continue;
    if (toughness.current <= 0) {
      if (breakCharacter && getConfig(attacker).superBreakCharacter) {
        await applyWeaknessBreakDamage(attacker, target, {superBreak:true});
        applied = true;
      }
      continue;
    }
    const next = clamp(toughness.current - amount, 0, toughness.max);
    const discoveredWeaknesses = matchesWeakness ? [...new Set([...toughness.discoveredWeaknesses, elementId])] : toughness.discoveredWeaknesses;
    await actor.update({
      [`flags.${MODULE_ID}.toughness.current`]: next,
      [`flags.${MODULE_ID}.toughness.discoveredWeaknesses`]: discoveredWeaknesses
    });
    applied = true;
    if (next === 0 && toughness.current > 0) {
      ui.notifications.info(`${actor.name}'s Toughness was broken!`);
      await broadcastWeaknessBreak(attacker,target);
      if (breakCharacter) await applyWeaknessBreakDamage(attacker, target);
      await delayBrokenCombatant(target);
    }
  }
  if (!isManualApplication && processedKey && applied) {
    state.processedMessages.add(processedKey);
    window.setTimeout(() => state.processedMessages.delete(processedKey), 120000);
  }
  if (applied) {
    if (!isManualApplication) {
      state.recentToughness.set(signature, now);
      window.setTimeout(() => state.recentToughness.delete(signature), 2000);
    }
  }
  return applied ? amount : 0;
}

async function processDnd5eDamageRolls(rolls, data = {}) {
  const subject = data.subject;
  const attacker = subject?.actor ?? subject?.item?.actor ?? subject?.parent?.actor ?? subject?.parent;
  if (!attacker || attacker.documentName !== "Actor") return;
  const rollList = Array.isArray(rolls) ? rolls : [rolls];
  state.lastDamageDisplay = {
    color: damageResultColor(attacker, {hpDamage:true}),
    critical: damageRollWasCritical({rolls:rollList}),
    forceElementColor: Boolean(getConfig(attacker).breakCharacter),
    attackerId: attacker.id,
    expires: Date.now() + 15000
  };
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
  const taggedBreakDamage = Boolean(message.getFlag(MODULE_ID, "breakDamageRoll"));
  if (!attackMessage && !damageMessage && !macroDamageMessage) return;
  if (state.processedMessages.has(message.id)) return;
  state.processedMessages.add(message.id);
  window.setTimeout(() => state.processedMessages.delete(message.id), 60000);
  const midiWorkflowId = message.flags?.["midi-qol"]?.workflowId ?? message.flags?.["midi-qol"]?.workflowUuid ?? message.flags?.["midi-qol"]?.itemUuid;
  const midiWorkflow = midiActive && midiWorkflowId ? globalThis.MidiQOL?.Workflow?.getWorkflow?.(midiWorkflowId) : null;
  const attacker = midiWorkflow?.actor ?? game.actors.get(message.speaker?.actor) ?? canvas?.tokens?.get(message.speaker?.token)?.actor;
  if (attacker?.type === "character" && (damageMessage || macroDamageMessage)) {
    state.lastDamageDisplay = {
      color: damageResultColor(attacker, {hpDamage:true}),
      critical: damageRollWasCritical(message) || damageRollWasCritical(midiWorkflow),
      forceElementColor: Boolean(getConfig(attacker).breakCharacter),
      attackerId: attacker.id,
      expires: Date.now() + 15000
    };
  }
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
    if (!taggedBreakDamage && attacker?.isOwner && (damageMessage || macroDamageMessage)) {
      const ownedTargets = [...(game.user.targets ?? [])];
      const targetUuids = ownedTargets.map(target => target.document?.uuid ?? target.actor?.uuid).filter(Boolean);
      const amount = getConfig(attacker).breakCharacter ? fullDamageTotal(message.rolls) : rawDiceTotal(message.rolls);
      if (amount > 0 && targetUuids.length) game.socket.emit(SOCKET, {type: "applyToughness", sourceUserId: game.user.id, attackerUuid: attacker.uuid, targetUuids, amount, eventKey: midiWorkflowId || `chat:${message.id}`});
    }
    return;
  }
  if (attackMessage && attacker) await addEnergy(attacker, energyGain(getConfig(attacker), "attack"), "attack");
  if ((damageMessage || macroDamageMessage) && attacker) {
    if (taggedBreakDamage) return;
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
  if (attacker?.type === "character" && diceDamage > 0) {
    state.lastDamageDisplay = {
      color: damageResultColor(attacker, {hpDamage:true}),
      critical: damageRollWasCritical(workflow),
      forceElementColor: Boolean(getConfig(attacker).breakCharacter),
      attackerId: attacker.id,
      expires: Date.now() + 15000
    };
  }
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
  const displayDamage = getConfig(attacker).breakCharacter ? Math.min(1, fullDamageTotal(damageRolls)) : fullDamageTotal(damageRolls);
  if (attacker?.type === "character" && displayDamage > 0) {
    const critical = damageRollWasCritical(workflow);
    for (const target of toughnessTargets) await broadcastDamageOnce(attacker, target, displayDamage, key, {critical});
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

function craftingItemSnapshot(item,quantity=1) {
  return {uuid:item.getFlag?.("core","sourceId")||item.uuid,name:item.name,img:item.img,type:item.type,quantity:Math.max(1,Number(quantity)||1),itemData:item.toObject()};
}

async function droppedCraftingItem(event) {
  const raw=event.originalEvent?.dataTransfer?.getData("text/plain")||event.dataTransfer?.getData("text/plain")||"";
  try{const data=JSON.parse(raw);const document=data.uuid?await fromUuid(data.uuid):null;return document?.documentName==="Item"?document:null;}catch(_error){return null;}
}

class RecipeManager extends FormApplication {
  static get defaultOptions(){return foundry.utils.mergeObject(super.defaultOptions,{id:"tsru-recipe-manager",title:"Tely's Star Rail Ultimates — Recipes",template:`modules/${MODULE_ID}/templates/recipe-manager.hbs`,width:720,height:760,resizable:true,closeOnSubmit:false});}
  getData(){const classifications=getCraftingClassifications();return {recipes:foundry.utils.deepClone(this._recipesOverride??getCraftingRecipes()).map((recipe,recipeIndex)=>({...recipe,recipeIndex,classificationOptions:classifications.map(entry=>({...entry,selected:entry.id===(recipe.classificationId||"other")})),ingredients:(recipe.ingredients??[]).map((ingredient,ingredientIndex)=>({...ingredient,recipeIndex,ingredientIndex}))}))};}
  recipes(){return this._recipesOverride??foundry.utils.deepClone(getCraftingRecipes());}
  async save(){await game.settings.set(MODULE_ID,"craftingRecipes",this.recipes());ui.notifications.info("Crafting recipes saved.");state.craftingApp?.render({force:false});}
  activateListeners(html){
    super.activateListeners(html);
    html.find("[data-recipe-field]").on("change",event=>{const recipes=this.recipes(),recipe=recipes[Number(event.currentTarget.dataset.recipeIndex)];if(!recipe)return;const field=event.currentTarget.dataset.recipeField;recipe[field]=event.currentTarget.type==="number"?Math.max(1,Number(event.currentTarget.value)||1):event.currentTarget.value;this._recipesOverride=recipes;});
    html.find("[data-ingredient-quantity]").on("change",event=>{const recipes=this.recipes(),recipe=recipes[Number(event.currentTarget.dataset.recipeIndex)],ingredient=recipe?.ingredients?.[Number(event.currentTarget.dataset.ingredientQuantity)];if(ingredient)ingredient.quantity=Math.max(1,Number(event.currentTarget.value)||1);this._recipesOverride=recipes;});
    html.find("[data-output-quantity]").on("change",event=>{const recipes=this.recipes(),recipe=recipes[Number(event.currentTarget.dataset.recipeIndex)];if(recipe?.output)recipe.output.quantity=Math.max(1,Number(event.currentTarget.value)||1);this._recipesOverride=recipes;});
    html.find("[data-action='add-recipe']").on("click",()=>{const recipes=this.recipes();recipes.push({id:foundry.utils.randomID(),name:"New Recipe",img:"icons/svg/forge.svg",description:"",classificationId:getCraftingClassifications()[0]?.id||"other",ingredients:[],output:null});this._recipesOverride=recipes;this.render(true);});
    html.find("[data-action='remove-recipe']").on("click",event=>{const recipes=this.recipes();recipes.splice(Number(event.currentTarget.dataset.recipeIndex),1);this._recipesOverride=recipes;this.render(true);});
    html.find("[data-action='remove-ingredient']").on("click",event=>{const recipes=this.recipes(),recipe=recipes[Number(event.currentTarget.dataset.recipeIndex)];recipe?.ingredients?.splice(Number(event.currentTarget.dataset.ingredientIndex),1);this._recipesOverride=recipes;this.render(true);});
    html.find("[data-crafting-drop]").on("dragover",event=>{event.preventDefault();event.currentTarget.classList.add("is-dragover");}).on("dragleave",event=>event.currentTarget.classList.remove("is-dragover")).on("drop",async event=>{event.preventDefault();event.currentTarget.classList.remove("is-dragover");const item=await droppedCraftingItem(event);if(!item)return ui.notifications.warn("Drop an Item document here.");const recipes=this.recipes(),recipe=recipes[Number(event.currentTarget.dataset.recipeIndex)];if(!recipe)return;if(event.currentTarget.dataset.craftingDrop==="ingredient")recipe.ingredients.push(craftingItemSnapshot(item));else recipe.output=craftingItemSnapshot(item);this._recipesOverride=recipes;this.render(true);});
    html.find("[data-action='save-recipes']").on("click",()=>this.save());
    html.find("[data-action='create-recipe-card']").on("click",async event=>{await this.save();const recipe=this.recipes()[Number(event.currentTarget.dataset.recipeIndex)];if(!recipe)return;await Item.create({name:`Recipe: ${recipe.name}`,type:"loot",img:recipe.img||recipe.output?.img||"icons/svg/book.svg",system:{quantity:1,description:{value:`<p>Redeem this card in the Crafting menu to unlock <strong>${escapeHTML(recipe.name)}</strong>.</p>`}},flags:{[MODULE_ID]:{recipeCard:{recipeId:recipe.id}}}});ui.notifications.info(`Created Recipe: ${recipe.name} in the Items directory.`);});
  }
  async _updateObject(){return this.save();}
}

class RecipeMenu extends FormApplication {render(){new RecipeManager().render(true);return this;}}

class CraftingClassificationManager extends FormApplication{
  static get defaultOptions(){return foundry.utils.mergeObject(super.defaultOptions,{id:"tsru-crafting-classifications",title:"Crafting Item Classifications",template:`modules/${MODULE_ID}/templates/crafting-classifications.hbs`,width:560,height:"auto",resizable:true,closeOnSubmit:false});}
  getData(){return {classifications:foundry.utils.deepClone(this._override??getCraftingClassifications()).map((entry,index)=>({...entry,index}))};}
  read(html){return [...html.find("[data-classification-row]")].map(row=>({id:String(row.querySelector('[data-field="id"]')?.value||foundry.utils.randomID()).trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-")||foundry.utils.randomID(),name:String(row.querySelector('[data-field="name"]')?.value||"Classification").trim()||"Classification",icon:String(row.querySelector('[data-field="icon"]')?.value||"fas fa-box").trim()||"fas fa-box"}));}
  activateListeners(html){super.activateListeners(html);html.find("[data-action='add-classification']").on("click",()=>{this._override=this.read(html);this._override.push({id:foundry.utils.randomID(),name:"New Classification",icon:"fas fa-box"});this.render(true);});html.find("[data-action='remove-classification']").on("click",event=>{this._override=this.read(html);this._override.splice(Number(event.currentTarget.dataset.index),1);this.render(true);});html.find("[data-action='save-classifications']").on("click",async()=>{const values=this.read(html);await game.settings.set(MODULE_ID,"craftingClassifications",values.length?values:foundry.utils.deepClone(DEFAULT_CRAFTING_CLASSIFICATIONS));this._override=null;ui.notifications.info("Crafting classifications saved.");state.craftingApp?.render({force:false});});}
  async _updateObject(){return undefined;}
}

class CraftingClassificationMenu extends FormApplication{render(){new CraftingClassificationManager().render(true);return this;}}

class CraftingApplication extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  constructor(...args){super(...args);this.placed={};this.inventoryChecked=false;this.selectedCategory="all";this.selectedRecipeId="";this.craftCount=1;state.craftingApp=this;}
  static DEFAULT_OPTIONS={id:"tsru-crafting",classes:["tsru-crafting-window"],window:{title:"Party Crafting",resizable:true},position:{width:1040,height:720}};
  static PARTS={main:{template:`modules/${MODULE_ID}/templates/crafting.hbs`}};
  async _prepareContext(){
    const recipes=getCraftingRecipes(),classifications=getCraftingClassifications(),userActors=craftingUserActors(),unlocked=new Set(userActors.flatMap(actor=>[...actorUnlockedRecipes(actor)]));
    const visible=(game.user.isGM?recipes:recipes.filter(recipe=>unlocked.has(recipe.id))).map(recipe=>({...recipe,classificationId:recipe.classificationId||"other"}));
    const filtered=this.selectedCategory==="all"?visible:visible.filter(recipe=>recipe.classificationId===this.selectedCategory);
    if(!filtered.some(recipe=>recipe.id===this.selectedRecipeId))this.selectedRecipeId=filtered[0]?.id||"";
    const chosen=visible.find(recipe=>recipe.id===this.selectedRecipeId),craftCount=clamp(Math.floor(Number(this.craftCount)||1),1,99);
    const selected=chosen?{...chosen,classificationName:classifications.find(entry=>entry.id===chosen.classificationId)?.name||"Other",owned:chosen.output?pooledQuantityFor(chosen.output):0,yieldTotal:Math.max(1,Number(chosen.output?.quantity)||1)*craftCount,ingredients:(chosen.ingredients??[]).map(ingredient=>{const required=Math.max(1,Number(ingredient.quantity)||1)*craftCount,available=pooledQuantityFor(ingredient),key=recipeItemKey(ingredient),placed=this.placed[chosen.id]?.[key]??0;return {...ingredient,key,required,available,placed,enough:available>=required,placedEnough:placed>=required};})}:null;
    if(selected)selected.placedReady=selected.ingredients.every(ingredient=>ingredient.placedEnough);
    const categories=[{id:"all",name:"All Items",icon:"fas fa-border-all",count:visible.length},...classifications.map(entry=>({...entry,count:visible.filter(recipe=>recipe.classificationId===entry.id).length}))].map(entry=>({...entry,active:entry.id===this.selectedCategory}));
    const cards=[],cardActors=game.user.isGM?game.actors.filter(actor=>actor.type==="character"):userActors;for(const actor of cardActors)for(const item of actor.items??[]){const recipeId=item.getFlag(MODULE_ID,"recipeCard")?.recipeId,recipe=recipes.find(entry=>entry.id===recipeId);if(recipe)cards.push({actorId:actor.id,itemId:item.id,actorName:actor.name,name:recipe.name,img:item.img,quantity:itemQuantity(item)});}
    return {recipes:filtered.map(recipe=>({...recipe,active:recipe.id===this.selectedRecipeId,displayImg:recipe.output?.img||recipe.img,owned:recipe.output?pooledQuantityFor(recipe.output):0})),selected,categories,actors:userActors,cards,cardCount:cards.reduce((sum,card)=>sum+card.quantity,0),craftCount,inventoryChecked:this.inventoryChecked,isGM:game.user.isGM};
  }
  _onRender(context,options){
    super._onRender(context,options);
    const html=this.element;
    for(const button of html.querySelectorAll("[data-category-id]"))button.addEventListener("click",()=>{this.selectedCategory=button.dataset.categoryId;this.selectedRecipeId="";this.render({force:false});});
    for(const button of html.querySelectorAll("[data-select-recipe]"))button.addEventListener("click",()=>{this.selectedRecipeId=button.dataset.selectRecipe;this.render({force:false});});
    for(const button of html.querySelectorAll("[data-craft-count-delta]"))button.addEventListener("click",()=>{this.craftCount=clamp(this.craftCount+(Number(button.dataset.craftCountDelta)||0),1,99);this.placed[this.selectedRecipeId]={};this.render({force:false});});
    html.querySelector("[data-action='check-reagents']")?.addEventListener("click",()=>{this.inventoryChecked=true;this.render({force:false});});
    for(const button of html.querySelectorAll("[data-action='auto-place']"))button.addEventListener("click",()=>{const recipe=getCraftingRecipes().find(entry=>entry.id===button.dataset.recipeId);if(!recipe)return;this.placed[recipe.id]={};for(const ingredient of recipe.ingredients??[]){const required=Math.max(1,Number(ingredient.quantity)||1)*this.craftCount;this.placed[recipe.id][recipeItemKey(ingredient)]=Math.min(required,pooledQuantityFor(ingredient));}this.inventoryChecked=true;this.render({force:false});});
    for(const button of html.querySelectorAll("[data-place-delta]"))button.addEventListener("click",()=>{const recipeId=button.dataset.recipeId,key=button.dataset.ingredientKey,delta=Number(button.dataset.placeDelta)||0,recipe=getCraftingRecipes().find(entry=>entry.id===recipeId),ingredient=recipe?.ingredients?.find(entry=>recipeItemKey(entry)===key);if(!ingredient)return;const required=Math.max(1,Number(ingredient.quantity)||1)*this.craftCount;this.placed[recipeId]??={};this.placed[recipeId][key]=clamp((this.placed[recipeId][key]??0)+delta,0,Math.min(required,pooledQuantityFor(ingredient)));this.render({force:false});});
    for(const button of html.querySelectorAll("[data-action='craft']"))button.addEventListener("click",async()=>{const recipeId=button.dataset.recipeId,actorId=html.querySelector(`[data-recipe-recipient='${recipeId}']`)?.value;if(!actorId)return ui.notifications.warn("Choose a receiving character.");button.disabled=true;if(isAuthority()){const result=await executeCraftRecipe(recipeId,actorId,game.user.id,this.craftCount);(result.ok?ui.notifications.info:ui.notifications.error).call(ui.notifications,result.message);this.placed[recipeId]={};await this.render({force:false});}else game.socket.emit(SOCKET,{type:"craftRecipe",recipeId,actorId,craftCount:this.craftCount,requestingUserId:game.user.id});});
    for(const button of html.querySelectorAll("[data-action='redeem-card']"))button.addEventListener("click",async()=>{const actorId=button.dataset.actorId,itemId=button.dataset.itemId;button.disabled=true;if(isAuthority()){const result=await executeRedeemRecipeCard(actorId,itemId,game.user.id);(result.ok?ui.notifications.info:ui.notifications.error).call(ui.notifications,result.message);await this.render({force:false});}else game.socket.emit(SOCKET,{type:"redeemRecipeCard",actorId,itemId,requestingUserId:game.user.id});});
    html.querySelector("[data-action='redeem-all-recipes']")?.addEventListener("click",async event=>{event.currentTarget.disabled=true;const result=await executeRedeemAllRecipeCards(game.user.id);(result.ok?ui.notifications.info:ui.notifications.warn).call(ui.notifications,result.message);await this.render({force:false});});
  }
  async close(options){if(state.craftingApp===this)state.craftingApp=null;return super.close(options);}
}

async function openCrafting(){
  try{
    const existing=foundry.applications.instances.get("tsru-crafting");
    if(existing){existing.bringToFront();return existing;}
    if(state.craftingApp)await state.craftingApp.close?.({animate:false});
    const app=new CraftingApplication();
    await app.render({force:true});
    return app;
  }catch(error){
    state.craftingApp=null;console.error(`${MODULE_ID} | Could not open Party Crafting`,error);ui.notifications.error(`Could not open Party Crafting: ${error.message}`);return null;
  }
}

class InitiativeFrameColorManager extends FormApplication {
  static get defaultOptions(){return foundry.utils.mergeObject(super.defaultOptions,{id:"tsru-initiative-frame-colors",title:"Initiative Tracker Frame Colors",template:`modules/${MODULE_ID}/templates/initiative-frame-colors.hbs`,width:520,height:"auto",closeOnSubmit:true});}
  getData(){return {colors:foundry.utils.deepClone(this._colorsOverride??getInitiativeFrameColors())};}
  activateListeners(html){super.activateListeners(html);html.find("[data-action='add-frame-color']").on("click",()=>{this._colorsOverride=this._read(html);this._colorsOverride.push({id:foundry.utils.randomID(),name:"New Frame Color",color:"#58dfee"});this.render(true);});html.find("[data-action='remove-frame-color']").on("click",event=>{this._colorsOverride=this._read(html);this._colorsOverride.splice(Number(event.currentTarget.closest("[data-color-index]").dataset.colorIndex),1);this.render(true);});}
  _read(html){const expanded=foundry.utils.expandObject(Object.fromEntries(new FormData(html[0]).entries()));return Object.values(expanded.colors??{}).map(entry=>({id:String(entry.id||foundry.utils.randomID()),name:String(entry.name||"Frame Color").trim()||"Frame Color",color:/^#[0-9a-f]{6}$/i.test(String(entry.color||""))?String(entry.color):"#58dfee"}));}
  async _updateObject(_event,formData){const expanded=foundry.utils.expandObject(formData);const colors=Object.values(expanded.colors??{}).map(entry=>({id:String(entry.id||foundry.utils.randomID()),name:String(entry.name||"Frame Color").trim()||"Frame Color",color:/^#[0-9a-f]{6}$/i.test(String(entry.color||""))?String(entry.color):"#58dfee"}));await game.settings.set(MODULE_ID,"initiativeFrameColors",colors.length?colors:foundry.utils.deepClone(DEFAULT_INITIATIVE_FRAME_COLORS));this._colorsOverride=null;refreshInitiativeCarousel();for(const app of Object.values(ui.windows??{}))if((app.actor??app.document)?.type==="character")app.render(false);}
}

class PathManager extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {id: "tsru-path-manager", title: "Tely's Star Rail Ultimates — Paths", template: `modules/${MODULE_ID}/templates/path-manager.hbs`, width: 560, height: "auto", closeOnSubmit: true});
  }
  getData() { return {paths: foundry.utils.deepClone(this._pathsOverride ?? getPaths())}; }
  activateListeners(html) {
    super.activateListeners(html);
    activateImageDrops(html);
    html.find(".tsru-add-path").on("click", () => { this._pathsOverride = this._readPaths(html); this._pathsOverride.push({id: foundry.utils.randomID(), name: "New Path", icon: "icons/svg/upgrade.svg", color:"#e5c878"}); this.render(true); });
    html.find(".tsru-remove-path").on("click", event => { const index = Number(event.currentTarget.closest(".tsru-path-row").dataset.index); this._pathsOverride = this._readPaths(html); this._pathsOverride.splice(index, 1); this.render(true); });
  }
  _readPaths(html) {
    const data = new FormData(html[0]);
    const expanded = foundry.utils.expandObject(Object.fromEntries(data.entries()));
    return Object.values(expanded.paths ?? {}).map(entry => ({id: entry.id || foundry.utils.randomID(), name: entry.name?.trim() || "Path", icon: entry.icon || "", color:entry.color || "#e5c878"}));
  }
  async _updateObject(_event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    const paths = Object.values(expanded.paths ?? {}).map(entry => ({id: entry.id, name: entry.name?.trim() || "Path", icon: entry.icon || "", color:entry.color || "#e5c878"}));
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
    const initiativePreview=html.find("[data-aha-initiative-preview]"),initiativeCard=initiativePreview.find(".tsru-hsr-turn"),initiativeImage=initiativePreview.find("img");
    const initiativeValues=()=>{const scale=clamp(Number(html.find('[name="combatantImageScale"]').val())||100,50,800),bounds=initiativePortraitPositionBounds(scale);return {image:String(html.find('[name="combatantImage"]').val()||DEFAULT_AHA_CONFIG.combatantImage),x:clamp(Number(html.find('[name="combatantImageX"]').val())||0,bounds.min,bounds.max),y:clamp(Number(html.find('[name="combatantImageY"]').val())||0,bounds.min,bounds.max),scale,flip:Boolean(html.find('[name="combatantImageFlip"]').prop("checked"))};};
    const refreshInitiativePreview=()=>{const data=initiativeValues();initiativeImage.attr("src",data.image);initiativeCard.css({"--portrait-x":`${data.x}%`,"--portrait-y":`${data.y}%`,"--portrait-scale":data.scale/100,"--portrait-flip":data.flip?-1:1});};
    html.find('[name="combatantImage"],[name="combatantImageX"],[name="combatantImageY"],[name="combatantImageScale"],[name="combatantImageFlip"]').on("input change",refreshInitiativePreview);
    let initiativeDrag=null;
    initiativePreview.on("pointerdown.tsru-aha-crop",".tsru-hsr-turn-card",event=>{if(event.button!==0)return;event.preventDefault();const data=initiativeValues(),rect=event.currentTarget.getBoundingClientRect();initiativeDrag={x:event.clientX,y:event.clientY,startX:data.x,startY:data.y,rect};event.currentTarget.setPointerCapture?.(event.pointerId);});
    $(document).off(".tsru-aha-initiative-crop").on("pointermove.tsru-aha-initiative-crop",event=>{if(!initiativeDrag)return;event.preventDefault();const bounds=initiativePortraitPositionBounds(initiativeValues().scale),x=clamp(initiativeDrag.startX+(event.clientX-initiativeDrag.x)/Math.max(1,initiativeDrag.rect.width)*100,bounds.min,bounds.max),y=clamp(initiativeDrag.startY+(event.clientY-initiativeDrag.y)/Math.max(1,initiativeDrag.rect.height)*100,bounds.min,bounds.max);html.find('[name="combatantImageX"]').val(Math.round(x));html.find('[name="combatantImageY"]').val(Math.round(y));refreshInitiativePreview();}).on("pointerup.tsru-aha-initiative-crop pointercancel.tsru-aha-initiative-crop",()=>{initiativeDrag=null;});
    initiativePreview.on("wheel.tsru-aha-crop",event=>{event.preventDefault();event.stopPropagation();const input=html.find('[name="combatantImageScale"]'),next=clamp(initiativeValues().scale+(event.originalEvent.deltaY<0?5:-5),50,800);input.val(next);refreshInitiativePreview();});
    refreshInitiativePreview();
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
      combatantImage: formData.combatantImage || DEFAULT_AHA_CONFIG.combatantImage,
      combatantImageX: clamp(formData.combatantImageX,-1150,1250),
      combatantImageY: clamp(formData.combatantImageY,-1150,1250),
      combatantImageScale: clamp(formData.combatantImageScale,50,800),
      combatantImageFlip: Boolean(formData.combatantImageFlip)
    };
    await game.settings.set(MODULE_ID, "ahaConfig", savedConfig);
    await setPunchline(formData.punchline);
    refreshAhaButton();
    state.punchlineMeter?.destroy();
    refreshPunchlineHUD();
    preloadAhaVideo(savedConfig.video);
    game.socket.emit(SOCKET, {type: "ahaConfigChanged", sourceUserId: game.user.id, video: savedConfig.video});
    if (!getAhaConfig().elationEnabled && game.combat) await clearElationActionTurns(game.combat);
    await syncAhaCombatants();
    for (const app of Object.values(ui.windows ?? {})) if (app.actor?.type === "character") app.render(false);
    ui.notifications.info("Aha Instant configuration saved.");
  }
  async close(...args){$(document).off(".tsru-aha-initiative-crop");return super.close(...args);}
}

class AhaMenu extends FormApplication {
  render() { new AhaConfig().render(true); return this; }
}

class TechniquePointConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "tsru-technique-point-config",
      title: "Technique Point Configuration",
      template: `modules/${MODULE_ID}/templates/technique-point-config.hbs`,
      width: 480,
      height: "auto",
      closeOnSubmit: true
    });
  }
  getData() { return {config: getTechniquePointConfig(), current: currentTechniquePoints()}; }
  async _updateObject(_event, formData) {
    const maximum = Math.max(1, Math.floor(Number(formData.maximum) || DEFAULT_TECHNIQUE_POINT_CONFIG.maximum));
    const config = {maximum, starting: clamp(Math.floor(Number(formData.starting)), 0, maximum)};
    await game.settings.set(MODULE_ID, "techniquePointConfig", config);
    await setTechniquePoints(clamp(Math.floor(Number(formData.current)), 0, maximum));
    refreshResourceHuds();
    ui.notifications.info("Shared Technique Point configuration saved.");
  }
}
class TechniquePointMenu extends FormApplication {
  render() { new TechniquePointConfig().render(true); return this; }
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

class TalentPointConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:"tsru-talent-point-config",
      title:"Talent Point Configuration",
      template:`modules/${MODULE_ID}/templates/talent-point-config.hbs`,
      width:520,
      height:"auto",
      closeOnSubmit:true
    });
  }
  getData() { return {config:getTalentPointConfig()}; }
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".file-picker").on("click", event => {
      const button = event.currentTarget;
      const target = button.dataset.target;
      new FilePicker({type:"any", current:html.find(`[name="${target}"]`).val(), callback:path => html.find(`[name="${target}"]`).val(path).trigger("change")}).browse();
    });
  }
  async _updateObject(_event, formData) {
    await game.settings.set(MODULE_ID, "talentPointConfig", {numberFontFile:String(formData.numberFontFile || "").trim()});
    await refreshTalentPointFont();
    refreshResourceHuds();
    refreshCombatPartyHud();
    ui.notifications.info("Talent Point appearance saved.");
  }
}

class TalentPointMenu extends FormApplication {
  render() { new TalentPointConfig().render(true); return this; }
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
  if (!source || isElationActionCombatant(source)) return ui.notifications.warn("Choose a character, enemy, or Aha Instant in initiative.");
  const advanceAha=isAhaCombatant(source);
  const interrupted = combat.combatant;
  if(advanceAha){
    if(interrupted?.id===source.id)return ui.notifications.warn("It is already Aha Instant's turn.");
    const index=combat.turns.findIndex(entry=>entry.id===source.id);
    if(index<0)return ui.notifications.warn("Aha Instant is not available in the current turn order.");
    state.actionAdvances.set(combat.id,{combatantId:source.id,resumeCombatantId:interrupted?.id??null,resumeRound:combat.round,aha:true,reuseSource:true});
    state.lastElationSequenceKey="";
    await combat.update({turn:index});
    ui.notifications.info("Aha Instant receives an Action Advance turn.");
    return true;
  }
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
  state.actionAdvances.set(combat.id, {combatantId: temporary.id, resumeCombatantId: interrupted?.id ?? null, resumeRound: combat.round, aha:advanceAha});
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
    if (!advance.reuseSource && combat.combatants.has(advance.combatantId)) await combat.deleteEmbeddedDocuments("Combatant", [advance.combatantId]);
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
    const collapsedCards = game.settings.get(MODULE_ID, "gmPanelCollapsedCards") ?? {};
    const canvasCharacterIds = new Set((canvas?.tokens?.placeables ?? []).filter(token => token.actor?.type === "character").map(token => token.actor.id));
    const characters = game.actors
      .filter(actor => actor.type === "character" && (getConfig(actor).mainParty || canvasCharacterIds.has(actor.id)))
      .map(actor => {
        const hasPlayerOwner=game.users.some(user=>!user.isGM && actor.testUserPermission(user,"OWNER"));
        return {actor, config:getConfig(actor), hasPlayerOwner, isGMPC:!hasPlayerOwner, talentCurrent: currentTalentPoints(actor), talentEligible: Boolean(talentCombatForActor(actor)), modifier: signedNumber(regenModifier(getConfig(actor))), collapsed: Boolean(collapsedCards[`character:${actor.id}`])};
      });
    const normalCombatants = game.combat?.combatants?.filter(entry => !isAhaCombatant(entry) && !isElationActionCombatant(entry) && !entry.getFlag(MODULE_ID, "temporaryUltimate") && !entry.getFlag(MODULE_ID, "actionAdvance")) ?? [];
    const actionAdvanceCombatants = game.combat?.combatants?.filter(entry => !isElationActionCombatant(entry) && !entry.getFlag(MODULE_ID, "temporaryUltimate") && !entry.getFlag(MODULE_ID, "actionAdvance")) ?? [];
    const combatants = game.combat?.started ? actionAdvanceCombatants.map(entry => ({id: entry.id, name: entry.name, initiative: entry.initiative, img: entry.img})) : [];
    const initiativeTokenIds = new Set(normalCombatants.map(entry => entry.tokenId).filter(Boolean));
    const initiativeActorUuids = new Set(normalCombatants.map(entry => entry.actor?.uuid).filter(Boolean));
    const elements = getElements();
    const targetedIds = new Set([...(game.user?.targets ?? []), ...(canvas?.tokens?.controlled ?? [])].map(token => token.id));
    const sceneEnemies = (canvas?.tokens?.placeables ?? []).filter(token => token.actor?.type === "npc" && (initiativeTokenIds.has(token.id) || initiativeActorUuids.has(token.actor.uuid))).map(token => {
      const actor = token.actor;
      const config = getToughness(actor);
      const temporary = temporaryToughnessWeaknesses(token);
      const weaknessMode = toughnessWeaknessMode(token);
      return {
        actor, token, tokenId: token.id, tokenUuid: token.document.uuid, targeted: targetedIds.has(token.id), weaknessMode,
        collapsed: Boolean(collapsedCards[`npc:${token.document.uuid}`]),
        allWeaknesses: weaknessMode === "all", noWeaknesses: weaknessMode === "none",
        elements: elements.map(element => ({...element, permanent: config.weaknesses.includes(element.id), temporary: weaknessMode === "all" || temporary.includes(element.id)}))
      };
    });
    const actionCharacters = game.actors.filter(actor => actor.type === "character").sort((left, right) => left.name.localeCompare(right.name)).map(actor => ({id: actor.id, name: actor.name}));
    return {characters, actionCharacters, sceneEnemies, punchline: currentPunchline(), punchlineOverride: punchlineOverrideEnabled(), skillPoints: currentSkillPoints(), skillPointMax: getSkillPointConfig().maximum, combatants, hasCombat: Boolean(game.combat?.started), initiativeCarousel:getInitiativeCarouselConfig(), showSceneNavigation:game.settings.get(MODULE_ID,"showSceneNavigation")};
  }
  activateListeners(html) {
    super.activateListeners(html);
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
    html.find("[data-action='show-phase-controls']").on("click", () => showBossPhaseControl());
    html.find("[data-action='save-initiative-carousel']").on("click",async()=>{
      const data={enabled:Boolean(html.find('[name="initiativeCarouselEnabled"]').prop("checked")),allowLengthResize:Boolean(html.find('[name="initiativeCarouselAllowLengthResize"]').prop("checked")),maximumWidth:clamp(html.find('[name="initiativeCarouselMaximumWidth"]').val(),190,420),maximumHeight:clamp(html.find('[name="initiativeCarouselMaximumHeight"]').val(),260,1200)};
      await game.settings.set(MODULE_ID,"initiativeCarouselConfig",data);refreshInitiativeCarousel();ui.notifications.info("HSR initiative carousel settings saved.");this.render(false);
    });
    html.find('[name="showSceneNavigation"]').on("change",async event=>{await game.settings.set(MODULE_ID,"showSceneNavigation",Boolean(event.currentTarget.checked));applySceneNavigationVisibility();});
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
      if (target === "recipes") new RecipeManager().render(true);
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
  game.settings.register(MODULE_ID, "paths", {scope: "world", config: false, type: Array, default: DEFAULT_PATHS.map(path => ({...path}))});
  game.settings.register(MODULE_ID,"craftingRecipes",{scope:"world",config:false,type:Array,default:[]});
  game.settings.register(MODULE_ID,"craftingClassifications",{scope:"world",config:false,type:Array,default:foundry.utils.deepClone(DEFAULT_CRAFTING_CLASSIFICATIONS)});
  game.settings.register(MODULE_ID, "elementsDraft", {scope: "client", config: false, type: Array, default: []});
  game.settings.register(MODULE_ID, "orbLayouts", {scope: "client", config: false, type: Object, default: {}});
  game.settings.register(MODULE_ID, "selectedMainCharacterId", {scope: "client", config: false, type: String, default: ""});
  game.settings.register(MODULE_ID, "combatPartyHudLayout", {scope: "client", config: false, type: Object, default: {scale: 1, minimized: false, x: null, y: null}});
  game.settings.register(MODULE_ID, "bossHudLayout", {scope: "client", config: false, type: Object, default: {x: null, y: 54}});
  game.settings.register(MODULE_ID, "initiativeCarouselConfig", {scope:"world",config:false,type:Object,default:foundry.utils.deepClone(DEFAULT_INITIATIVE_CAROUSEL_CONFIG)});
  game.settings.register(MODULE_ID, "initiativeFrameColors", {scope:"world",config:false,type:Array,default:foundry.utils.deepClone(DEFAULT_INITIATIVE_FRAME_COLORS)});
  game.settings.register(MODULE_ID, "initiativeCarouselLayout", {scope:"client",config:false,type:Object,default:{x:0,y:86,width:null,height:520}});
  game.settings.register(MODULE_ID, "showSceneNavigation", {scope:"world",config:false,type:Boolean,default:true,onChange:applySceneNavigationVisibility});
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
  game.settings.register(MODULE_ID, "techniqueButtonLayouts", {scope: "client", config: false, type: Object, default: {}});
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
  game.settings.registerMenu(MODULE_ID,"initiativeFrameColorsMenu",{name:"Initiative Tracker Frame Colors",label:"Configure Frame Colors",hint:"Create reusable global frame colors, then select one from each character's Ultimate settings.",icon:"fas fa-palette",type:InitiativeFrameColorManager,restricted:true});
  game.settings.registerMenu(MODULE_ID, "pathManager", {
    name: "Manage Paths",
    label: "Open Path Manager",
    hint: "Create Path names and drag-and-drop or browse for their character-sheet icons.",
    icon: "fas fa-route",
    type: PathMenu,
    restricted: true
  });
  game.settings.registerMenu(MODULE_ID,"recipeManager",{name:"Manage Crafting Recipes",label:"Open Recipe Manager",hint:"Create drag-and-drop recipes, outputs, and redeemable recipe cards.",icon:"fas fa-hammer",type:RecipeMenu,restricted:true});
  game.settings.registerMenu(MODULE_ID,"craftingClassificationsMenu",{name:"Crafting Item Classifications",label:"Configure Crafting Classifications",hint:"Create the item classifications used to organize crafting recipes into tabs.",icon:"fas fa-layer-group",type:CraftingClassificationMenu,restricted:true});
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
    actor, config, elements, paths, frameColors:initiativeFrameColorOptions(config),
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
    modeTargeted: config.attackedMode === "targeted",
    bossPhase1: config.bossPhaseCount === 1,
    bossPhase2: config.bossPhaseCount === 2,
    bossPhase3: config.bossPhaseCount === 3
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
    actor, config, elements, paths, frameColors:initiativeFrameColorOptions(config),
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
    modeTargeted: config.attackedMode === "targeted",
    bossPhase1: config.bossPhaseCount === 1,
    bossPhase2: config.bossPhaseCount === 2,
    bossPhase3: config.bossPhaseCount === 3
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
  for (const key of ["current", "max", "regenScore", "breakEffectScore", "breakDamageDice", "breakDamageDie", "attackGain", "attackedGain", "skillPointCost", "talentPointsCurrent", "talentPointsMax", "talentPointsOvercapMax", "punchlineGain", "splashDuration", "splashX", "splashY", "splashScale", "titleX", "titleY", "titleSize", "combatHudPortraitX", "combatHudPortraitY", "combatHudPortraitScale", "ultimateButtonX", "ultimateButtonY", "ultimateButtonScale", "bossPhaseCount", "bossPhase2TokenWidth", "bossPhase2TokenHeight", "bossPhase3TokenWidth", "bossPhase3TokenHeight", "bossHudPortraitX", "bossHudPortraitY", "bossHudPortraitScale", "bossHudWidth", "bossHudHealthHeight", "bossHudToughnessHeight"]) data[key] = Number(data[key]);
  for (const key of ["enabled", "showPercent", "showHudPercent", "skillEnabled", "techniqueEnabled", "mainParty", "trialCharacter", "combatHudPortraitFlip", "ultimateButtonAdjustEnabled", "partyGMOverride", "receivesRewards", "lockEnergyAfterUltimate", "breakCharacter", "superBreakCharacter", "isBoss", "bossInheritsMainPhaseCount", "carouselFrameColorOverride"]) data[key] = Boolean(data[key]);
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
  data.bossPhaseCount = clamp(Math.floor(data.bossPhaseCount || 1), 1, 3);
  for(const key of ["bossPhase2TokenWidth","bossPhase2TokenHeight","bossPhase3TokenWidth","bossPhase3TokenHeight"])data[key]=clamp(data[key],0,20);
  data.bossHudPortraitX=clamp(data.bossHudPortraitX,0,100);data.bossHudPortraitY=clamp(data.bossHudPortraitY,0,100);data.bossHudPortraitScale=clamp(data.bossHudPortraitScale,50,400);data.bossHudWidth=clamp(data.bossHudWidth,420,1400);data.bossHudHealthHeight=clamp(data.bossHudHealthHeight,12,48);data.bossHudToughnessHeight=clamp(data.bossHudToughnessHeight,4,24);
  data.carouselFrameColor=/^#[0-9a-f]{6}$/i.test(String(data.carouselFrameColor??""))?String(data.carouselFrameColor):"#58dfee";
  data.carouselFrameColorPreset=String(data.carouselFrameColorPreset||"");
  data.talentCombatId = talentCombatForActor(actor)?.id ?? "";
  await actor.update({[`flags.${MODULE_ID}.ultimate`]: data}, {tsruAutosave: !notify, render: false});
  refreshOrb(actor);
  refreshSkillUI();
  refreshResourceHuds();
  refreshCombatPartyHud();
  refreshBossHud();
  refreshInitiativeCarousel();
  dockSceneControlsBesideCarousel();
  if (notify) ui.notifications.info(`${actor.name}'s Ultimate configuration saved.`);
  if (renderApp && app?.render) app.render(false);
  return data;
}

function activateConfigListeners(actor, tab, app) {
  tab.find("input, select, textarea, button").prop("disabled", false);
  initializeCollapsibleUltimateSections(actor, tab);
  tab.find("input:not([readonly])").prop("readonly", false);
  activateImageDrops(tab);
  tab.find(".tsru-drop-actor").on("dragover.tsru-boss",event=>{event.preventDefault();$(event.currentTarget).addClass("is-dragover");});
  tab.find(".tsru-drop-actor").on("dragleave.tsru-boss",event=>$(event.currentTarget).removeClass("is-dragover"));
  tab.find(".tsru-drop-actor").on("drop.tsru-boss",event=>{
    event.preventDefault();
    const input=$(event.currentTarget).removeClass("is-dragover");
    const data=TextEditor.getDragEventData(event.originalEvent??event);
    const uuid=String(data?.uuid || (data?.type==="Actor" && data?.id ? `Actor.${data.id}` : ""));
    if(!uuid)return ui.notifications.warn("Drop an Actor from the Actors directory into this field.");
    fromUuid(uuid).then(document=>{if(document?.documentName!=="Actor" || document.pack)return ui.notifications.warn("Drop a world Actor from the Actors directory, not a compendium entry.");input.val(document.uuid).trigger("change");});
  });
  tab.find("[data-clear-boss-phase]").on("click.tsru-boss",event=>{event.preventDefault();tab.find(`[name="${event.currentTarget.dataset.clearBossPhase}"]`).val("").trigger("change");});
  tab.find("[data-action='show-boss-phase-control']").on("click.tsru-boss",event=>{event.preventDefault();showBossPhaseControl(actor);});
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
  const refreshBossPreview=async()=>{const preview=tab.find("[data-tsru-boss-preview]");if(!preview.length)return;const draft={...getConfig(actor)};for(const key of ["bossHudPortrait","bossHudPortraitX","bossHudPortraitY","bossHudPortraitScale","bossHudWidth","bossHudHealthHeight","bossHudToughnessHeight","bossPhase2TokenWidth","bossPhase2TokenHeight","bossPhase3TokenWidth","bossPhase3TokenHeight"]){const field=tab.find(`[name='${key}']`)[0];draft[key]=field?.type==="number"?Number(field.value):String(field?.value||"");}const phases=[actor];for(const name of ["bossPhase2ActorUuid","bossPhase3ActorUuid"]){const uuid=String(tab.find(`[name='${name}']`).val()||"");if(uuid){const phase=await bossActorFromUuid(uuid);if(phase)phases.push(phase);}}preview.html(phases.map((phase,index)=>{const phaseNumber=index+1,size=phaseNumber===1?"Original token size":`${Number(draft[`bossPhase${phaseNumber}TokenWidth`])||phase.prototypeToken?.width||1} × ${Number(draft[`bossPhase${phaseNumber}TokenHeight`])||phase.prototypeToken?.height||1} grid units`;return `<div class="tsru-boss-phase-preview"><b>Phase ${phaseNumber}: ${escapeHTML(phase.name)} <small>(${size})</small></b>${bossDesignerPreview(phase,index===0?draft:{...getConfig(phase),bossHudWidth:draft.bossHudWidth,bossHudHealthHeight:draft.bossHudHealthHeight,bossHudToughnessHeight:draft.bossHudToughnessHeight})}</div>`;}).join(""));};
  tab.on("input.tsru-boss-preview change.tsru-boss-preview","[name='bossHudPortrait'],[name='bossHudPortraitX'],[name='bossHudPortraitY'],[name='bossHudPortraitScale'],[name='bossHudWidth'],[name='bossHudHealthHeight'],[name='bossHudToughnessHeight'],[name='bossPhase2ActorUuid'],[name='bossPhase3ActorUuid'],[name='bossPhase2TokenWidth'],[name='bossPhase2TokenHeight'],[name='bossPhase3TokenWidth'],[name='bossPhase3TokenHeight']",refreshBossPreview);
  refreshBossPreview();
  const bossPreview=tab.find("[data-tsru-boss-preview]");let bossCropDrag=null;
  bossPreview.on("dragover.tsru-boss-crop",event=>{event.preventDefault();bossPreview.addClass("is-dragover");}).on("dragleave.tsru-boss-crop",()=>bossPreview.removeClass("is-dragover")).on("drop.tsru-boss-crop",event=>{event.preventDefault();bossPreview.removeClass("is-dragover");const path=droppedAssetPath(event);if(path)tab.find("[name='bossHudPortrait']").val(path).trigger("change");});
  bossPreview.on("pointerdown.tsru-boss-crop",".tsru-boss-portrait",event=>{if(event.button!==0)return;event.preventDefault();bossCropDrag={x:event.clientX,y:event.clientY,startX:Number(tab.find("[name='bossHudPortraitX']").val())||50,startY:Number(tab.find("[name='bossHudPortraitY']").val())||50};});
  $(document).off(`.tsru-boss-crop-${actor.id}`).on(`pointermove.tsru-boss-crop-${actor.id}`,event=>{if(!bossCropDrag)return;const rect=bossPreview[0].getBoundingClientRect();bossCropDrag.nextX=clamp(bossCropDrag.startX+(event.clientX-bossCropDrag.x)/Math.max(1,rect.width)*100,0,100);bossCropDrag.nextY=clamp(bossCropDrag.startY+(event.clientY-bossCropDrag.y)/Math.max(1,rect.height)*100,0,100);tab.find("[name='bossHudPortraitX']").val(Math.round(bossCropDrag.nextX));tab.find("[name='bossHudPortraitY']").val(Math.round(bossCropDrag.nextY)).trigger("input");}).on(`pointerup.tsru-boss-crop-${actor.id} pointercancel.tsru-boss-crop-${actor.id}`,()=>{bossCropDrag=null;});
  bossPreview.on("wheel.tsru-boss-crop",".tsru-boss-portrait",event=>{event.preventDefault();const input=tab.find("[name='bossHudPortraitScale']"),next=clamp((Number(input.val())||100)+(event.originalEvent.deltaY<0?5:-5),50,400);input.val(next).trigger("input");});
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
  tab.find("[data-action='open-initiative-portrait-editor']").on("click.tsru-initiative-preview",event=>{event.preventDefault();openInitiativePortraitEditor(actor);});
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
  const carousel = getConfig(actor);
  const elements = getElements();
  const weaknessRows = elements.map(element => `<label class="tsru-weakness-choice"><input type="checkbox" name="weakness" value="${escapeHTML(element.id)}" ${config.weaknesses.includes(element.id) ? "checked" : ""}><img src="${escapeHTML(element.icon || "icons/svg/aura.svg")}"><span>${escapeHTML(element.name)}</span></label>`).join("");
  const content = `<form class="tsru-toughness-form">
    <p>Configure this actor's Star Rail Toughness and elemental weaknesses. These controls are GM-only.</p>
    <label class="tsru-toughness-toggle"><span><strong>Enable Toughness</strong><small>Show and automatically process Toughness while this actor is in combat.</small></span><input type="checkbox" name="enabled" ${config.enabled ? "checked" : ""}></label>
    <div class="tsru-toughness-numbers"><label><strong>Current</strong><input type="number" name="current" min="0" value="${config.current}"></label><label><strong>Maximum</strong><input type="number" name="max" min="1" value="${config.max}"></label></div>
    <fieldset><legend>Elemental Weaknesses</legend><div class="tsru-weakness-grid">${weaknessRows || "<em>Create Elements in Module Settings first.</em>"}</div></fieldset>
    ${actor.type==="npc"?`<fieldset class="tsru-carousel-art-config"><legend>Initiative Carousel Artwork</legend><label><strong>NPC carousel art</strong><small>Used by the HSR initiative carousel instead of the token portrait.</small><div class="tsru-file-control"><input type="text" name="carouselImage" value="${escapeHTML(carousel.carouselImage)}" placeholder="Use combatant or actor image"><button type="button" data-carousel-picker title="Browse Files"><i class="fas fa-file-import"></i></button></div></label><div class="tsru-toughness-numbers"><label><strong>Art X</strong><input type="number" name="carouselImageX" min="-1000" max="1100" value="${carousel.carouselImageX}"></label><label><strong>Art Y</strong><input type="number" name="carouselImageY" min="-1000" max="1100" value="${carousel.carouselImageY}"></label><label><strong>Zoom %</strong><input type="number" name="carouselImageScale" min="50" max="800" value="${carousel.carouselImageScale}"></label></div></fieldset>`:""}
  </form>`;
  const dialog = new Dialog({title: `${actor.name} — Toughness`, content, buttons: {
    save: {icon: '<i class="fas fa-save"></i>', label: "Save", callback: async html => {
      const max = Math.max(1, Number(html.find('[name="max"]').val()) || 100);
      const data = {enabled: html.find('[name="enabled"]').prop("checked"), max, current: clamp(html.find('[name="current"]').val(), 0, max), weaknesses: html.find('[name="weakness"]:checked').map((_i, field) => field.value).get(), temporaryWeaknesses: config.temporaryWeaknesses, discoveredWeaknesses: config.discoveredWeaknesses};
      await actor.setFlag(MODULE_ID, "toughness", data);
      if(actor.type==="npc"){const scale=clamp(html.find('[name="carouselImageScale"]').val(),50,800),bounds=initiativePortraitPositionBounds(scale);await actor.update({[`flags.${MODULE_ID}.ultimate.carouselImage`]:String(html.find('[name="carouselImage"]').val()||""),[`flags.${MODULE_ID}.ultimate.carouselImageX`]:clamp(html.find('[name="carouselImageX"]').val(),bounds.min,bounds.max),[`flags.${MODULE_ID}.ultimate.carouselImageY`]:clamp(html.find('[name="carouselImageY"]').val(),bounds.min,bounds.max),[`flags.${MODULE_ID}.ultimate.carouselImageScale`]:scale});}
      refreshToughnessBars();
      refreshInitiativeCarousel();
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
  Hooks.once("renderDialog",rendered=>{if(rendered!==dialog)return;rendered.element.find("[data-carousel-picker]").on("click",event=>{event.preventDefault();const input=rendered.element.find('[name="carouselImage"]');new FilePicker({type:"image",current:input.val(),callback:path=>input.val(path).trigger("change")}).browse();});});
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
  if (!token?.actor || !["npc","character"].includes(token.actor.type) || !game.combat?.combatants?.some(c => c.tokenId === token.document.id)) return;
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
  refreshBrokenTokenOverlays();
}

function injectToughnessHeaderButton(app, html) {
  const actor = app.actor ?? app.document;
  if (!game.user?.isGM || actor?.documentName !== "Actor" || !["npc","character"].includes(actor.type)) return;
  const appElement = app.element?.jquery ? app.element : $(app.element ?? html);
  const renderedElement = html?.jquery ? html : $(html);
  const root = appElement.length ? appElement : renderedElement;
  if (!root.length) return;
  const header = root.find(".window-header").first();
  if (!header.length) return;
  const controls = header.find(".window-controls").first();
  const addButton=(button,callback)=>{if(controls.length)controls.prepend(button);else header.find("button.close, [data-action='close']").first().before(button);button.on("click.tsru",event=>{event.preventDefault();event.stopPropagation();callback();});};
  if(!root.find(".tsru-open-toughness").length)addButton($(`<button type="button" class="header-control icon tsru-open-toughness" data-tooltip="Configure Toughness" aria-label="Configure Toughness"><i class="fas fa-shield-halved"></i></button>`),()=>openToughnessConfig(actor));
  if(!root.find(".tsru-open-boss-config").length)addButton($(`<button type="button" class="header-control icon tsru-open-boss-config" data-tooltip="Configure Boss Encounter" aria-label="Configure Boss Encounter"><i class="fas fa-skull"></i></button>`),()=>openUltimateConfig(actor,app));
}

function addActorHeaderButton(app, buttons) {
  if (!game.user.isGM) return;
  if (app.actor?.type === "npc") {
    buttons.unshift({label: "Toughness", class: "tsru-open-toughness", icon: "fas fa-shield-halved", onclick: () => openToughnessConfig(app.actor)});
    buttons.unshift({label: "Boss", class: "tsru-open-boss-config", icon: "fas fa-skull", onclick: () => openUltimateConfig(app.actor,app)});
    return;
  }
  if (app.actor?.type !== "character") return;
  buttons.unshift({label: "Toughness", class: "tsru-open-toughness", icon: "fas fa-shield-halved", onclick: () => openToughnessConfig(app.actor)});
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
  const craftingTool={name:"tsru-crafting",title:"Party Crafting",icon:"fas fa-hammer",order:94,button:true,visible:true,onChange:()=>{void openCrafting();}};
  if(Array.isArray(token.tools))token.tools.push(craftingTool);else token.tools.tsruCrafting=craftingTool;
}

function bindCraftingSceneControl(app,html){
  const root=html?.querySelector?html:html?.[0]??app?.element??document;
  const selector='[data-tool="tsru-crafting"], [data-action="tsru-crafting"], [data-control="tsru-crafting"], [data-tooltip="Party Crafting"]';
  const button=root?.querySelector?.(selector)??document.querySelector(selector);
  if(!button||button.dataset.tsruCraftingBound)return;
  button.dataset.tsruCraftingBound="true";
  button.addEventListener("click",event=>{
    event.preventDefault();
    event.stopPropagation();
    void openCrafting();
  });
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
    openCrafting,
    openRecipeManager:()=>new RecipeManager().render(true),
    openCombatHudDesigner,
    triggerSpecialAha,
    showSkillUI,
    showTalentUI,
    showAllAbilityBubbles,
    setLocalMainCharacter,
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

Hooks.once("ready", async () => {
  await ensureDefaultPaths();
  game.socket.on(SOCKET, onSocket);
  registerApi();
  applySceneNavigationVisibility();
  let controlsDockQueued=false;
  new MutationObserver(()=>{if(controlsDockQueued)return;controlsDockQueued=true;requestAnimationFrame(()=>{controlsDockQueued=false;dockSceneControlsBesideCarousel();applySceneNavigationVisibility();});}).observe(document.body,{childList:true,subtree:true});
  window.addEventListener("resize",()=>requestAnimationFrame(()=>dockSceneControlsBesideCarousel()));
  refreshAllOrbs();
  refreshAhaButton();
  refreshPunchlineHUD();
  refreshTechniqueButtons();
  refreshSkillUI();
  refreshResourceHuds();
  refreshTechniqueButtons();
  refreshBossHud();
  refreshInitiativeCarousel();
  if(isAuthority())ensureBossEncounters(game.combat).catch(error=>console.error(`${MODULE_ID} | Boss encounter initialization failed`,error));
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
  if (actor?.documentName === "Actor" && ["npc","character"].includes(actor.type)) injectToughnessHeaderButton(app, html);
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
Hooks.on("renderSceneControls", (app,html) => requestAnimationFrame(()=>{dockSceneControlsBesideCarousel();bindCraftingSceneControl(app,html);}));
Hooks.on("renderSceneControlsV2", (app,html) => requestAnimationFrame(()=>{dockSceneControlsBesideCarousel();bindCraftingSceneControl(app,html);}));
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
  refreshBossHud();
  refreshInitiativeCarousel();
  if(isAuthority())handleBossPhaseDefeat(actor).catch(error=>console.error(`${MODULE_ID} | Boss phase check failed`,error));
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
Hooks.on("updateToken", token => { refreshToughnessBars(); refreshResourceHuds(); refreshBossHud(); refreshInitiativeCarousel(); if(isAuthority()&&token.actor)handleBossPhaseDefeat(token.actor).catch(error=>console.error(`${MODULE_ID} | Boss token phase check failed`,error)); state.gmPanel?.render(false); });
Hooks.on("targetToken", user => { if (user.id === game.user.id) state.gmPanel?.refreshTargetHighlights(); });
Hooks.on("controlToken", () => state.gmPanel?.refreshTargetHighlights());
Hooks.on("deleteActor", actor => { state.orbs.get(actor.id)?.destroy(); state.skillButtons.get(actor.id)?.destroy(); state.talentButtons.get(actor.id)?.destroy(); state.techniqueButtons.get(actor.id)?.destroy(); refreshResourceHuds(); });
for(const hook of ["createItem","updateItem","deleteItem"])Hooks.on(hook,()=>state.craftingApp?.render({force:false}));
Hooks.on("updateUser", user => { if (user.id === game.user.id) { refreshAllOrbs(); refreshSkillUI(); refreshResourceHuds(); refreshCombatPartyHud(); refreshInitiativeCarousel(); } });
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
  if([`${MODULE_ID}.craftingRecipes`,`${MODULE_ID}.craftingClassifications`].includes(setting?.key))state.craftingApp?.render({force:false});
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
  if(setting?.key===`${MODULE_ID}.initiativeCarouselConfig`)refreshInitiativeCarousel();
  if(setting?.key===`${MODULE_ID}.initiativeFrameColors`){refreshInitiativeCarousel();for(const app of Object.values(ui.windows??{}))if((app.actor??app.document)?.type==="character")app.render(false);}
});
Hooks.on("canvasReady", () => { refreshAllOrbs(); refreshSkillUI(); refreshTalentButtons(); refreshTechniqueButtons(); refreshPunchlineHUD(); refreshToughnessBars(); refreshCombatPartyHud(); refreshBossHud(); refreshInitiativeCarousel(); });
Hooks.on("canvasReady", refreshAhaButton);

Hooks.on("deleteCombat", async combat => {
  refreshResourceHuds();
  state.partyCombatHud?.destroy();
  state.bossHud?.destroy();
  state.bossPhaseControl?.destroy();
  state.initiativeCarousel?.destroy();
  state.bossTransitionLocks.clear();
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
  refreshBossHud();
  refreshInitiativeCarousel();
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
    if (!(advance.aha && isElationActionCombatant(combat.combatant))) {
      await finishActionAdvance(combat, advance);
      state.gmPanel?.render(false);
      return;
    }
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
  refreshBossHud();
  refreshInitiativeCarousel();
  state.bossPhaseControl?.render();
  if(isAuthority())await ensureBossEncounter(combatant);
  if (!isAuthority() || isAhaCombatant(combatant) || isElationActionCombatant(combatant) || isTalentTurnCombatant(combatant) || !("initiative" in changed)) return;
  await maybeEnsureAhaCombatant(combatant.parent);
});

Hooks.on("createCombatant", combatant => {
  state.gmPanel?.render(false);
  window.setTimeout(refreshToughnessBars, 150);
  window.setTimeout(refreshCombatPartyHud, 150);
  window.setTimeout(refreshInitiativeCarousel,150);
  window.setTimeout(()=>ensureBossEncounter(combatant).catch(error=>console.error(`${MODULE_ID} | Boss combatant initialization failed`,error)),100);
  if (isAhaCombatant(combatant) || isElationActionCombatant(combatant) || isTalentTurnCombatant(combatant)) return;
  window.setTimeout(() => maybeEnsureAhaCombatant(combatant.parent), 100);
});

Hooks.on("combatStart", async combat => {
  refreshCombatPartyHud();
  refreshPunchlineHUD();
  refreshSkillUI();
  refreshBossHud();
  refreshInitiativeCarousel();
  state.lastCombatTurns.set(combat.id, combatTurnSnapshot(combat));
  if (isAuthority()) {
    await ensureBossEncounters(combat);
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
    refreshInitiativeCarousel();
  }, 100);
});
Hooks.on("deleteCombatant", combatant => {
  refreshBossHud();
  refreshInitiativeCarousel();
  state.bossPhaseControl?.render();
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
