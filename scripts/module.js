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
  skillEnabled: true,
  skillScript: "",
  skillButtonImage: "",
  punchlineGain: 1,
  ultimateScript: "",
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
  processedMessages: new Set(),
  ultimateLocks: new Set(),
  pendingUltimates: new Map(),
  lastTargetsByActor: new Map(),
  recentToughness: new Map(),
  suppressCombatHook: false,
  lastAhaTurnKey: ""
};

let ahaToolbarOpening = false;

const DEFAULT_AHA_CONFIG = Object.freeze({
  elationEnabled: false,
  elationPathId: "",
  punchlineIcon: "icons/svg/mask.svg",
  punchlineFontFile: "",
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

const DEFAULT_TOUGHNESS = Object.freeze({enabled: true, current: 100, max: 100, weaknesses: [], discoveredWeaknesses: []});

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
  config.discoveredWeaknesses = Array.isArray(config.discoveredWeaknesses) ? config.discoveredWeaknesses : [];
  return config;
}

async function setToughness(actor, value) {
  if (!actor || !game.user.isGM) return;
  const config = getToughness(actor);
  await actor.update({[`flags.${MODULE_ID}.toughness.current`]: clamp(value, 0, config.max)});
}

function regenModifier(config) {
  const parsed = Number(config.regenScore);
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
  chaCard.after(energyAbilityMarkup(actor, tagName));
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
}

function energyGain(config, kind) {
  const base = kind === "attack" ? config.attackGain : config.attackedGain;
  return Math.max(0, (Number(base) || 0) + regenModifier(config));
}

async function setEnergy(actor, value) {
  if (!actor) return;
  const config = getConfig(actor);
  const current = clamp(value, 0, config.max);
  await actor.update({[`flags.${MODULE_ID}.ultimate.current`]: current});
  return current;
}

async function addEnergy(actor, amount, reason = "") {
  if (!actor || !isAuthority()) return;
  const config = getConfig(actor);
  if (!config.enabled || !amount) return;
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
    this.element.style.setProperty("--tsru-punchline-color", config.color || DEFAULT_AHA_CONFIG.color);
    this.element.querySelector(".tsru-punchline-icon").src = config.punchlineIcon || DEFAULT_AHA_CONFIG.punchlineIcon;
    this.element.querySelector(".tsru-punchline-number").textContent = `+${currentPunchline()}`;
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
  if (!getAhaConfig().elationEnabled || !video) return;
  document.querySelectorAll(".tsru-aha-overlay").forEach(element => element.remove());
  const overlay = document.createElement("div");
  overlay.className = "tsru-aha-overlay";
  overlay.innerHTML = `<video src="${escapeHTML(video)}" autoplay playsinline></video>`;
  appendToCanvasLayer(overlay);
  const player = overlay.querySelector("video");
  const remove = () => overlay.remove();
  player.addEventListener("ended", remove, {once: true});
  player.addEventListener("error", remove, {once: true});
  window.setTimeout(remove, 300000);
}

function triggerAhaInstant() {
  if (!game.user.isGM) return;
  const config = getAhaConfig();
  if (!config.elationEnabled) return ui.notifications.warn("Aha Instant is disabled because Elation is not on the team.");
  if (!config.video) return ui.notifications.warn("Configure an Aha Instant WebM first.");
  playAhaVideo(config);
  game.socket.emit(SOCKET, {type: "showAhaVideo", sourceUserId: game.user.id, video: config.video});
}

function isAhaCombatant(combatant) {
  return Boolean(combatant?.getFlag(MODULE_ID, "ahaInstantCombatant"));
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
    .filter(combatant => !isAhaCombatant(combatant) && combatant.initiative !== null && Number.isFinite(Number(combatant.initiative)))
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
  if (getAhaConfig().elationEnabled) showAhaButton().catch(error => {
    console.error(`${MODULE_ID} | Could not show Aha Instant button`, error);
    ui.notifications.error(`Could not show the Aha Instant button: ${error.message}`);
  });
}

function registerAhaToolbarFallback() {
  if (document.documentElement.dataset.tsruAhaToolbarListener) return;
  document.documentElement.dataset.tsruAhaToolbarListener = "true";
  document.addEventListener("click", event => {
    const control = event.target.closest?.('[data-tool="tsru-aha-instant"], [data-control="tsru-aha-instant"], [data-action="tsru-aha-instant"]');
    if (control) openAhaInstantControls();
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
    const available = currentSkillPoints() > 0 && !state.skillLocks.has(this.actor.id) && Boolean(config.skillScript?.trim());
    this.element.style.left = `${clamp(layout.x, 0, window.innerWidth - 40)}px`;
    this.element.style.top = `${clamp(layout.y, 0, window.innerHeight - 40)}px`;
    this.element.style.setProperty("--tsru-skill-size", `${clamp(layout.size, 64, 280)}px`);
    this.element.style.setProperty("--tsru-skill-color", element?.readyColor || DEFAULT_CONFIG.readyColor);
    this.element.classList.toggle("is-unavailable", !available);
    const button = this.element.querySelector(".tsru-skill-button");
    button.disabled = !available;
    button.title = available ? `${this.actor.name}: Use Skill (costs 1 Skill Point)` : state.skillLocks.has(this.actor.id) ? "This Skill is currently resolving." : currentSkillPoints() <= 0 ? "No Skill Points remain." : "No Skill script is configured.";
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
  const config = getConfig(actor);
  const element = getElements().find(entry => entry.id === config.elementId);
  const path = getPaths().find(entry => entry.id === config.pathId);
  if (!element?.icon && !path?.icon) return;
  const typeName = String(actor.system?.details?.type?.value || actor.system?.details?.type || "").trim();
  const speciesCandidates = root.find('.species, [class*="species"], [data-action*="species"], section, div').filter((_index, node) => {
    const rect = node.getBoundingClientRect();
    const text = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const matchesType = typeName && text.toLocaleLowerCase().startsWith(typeName.toLocaleLowerCase());
    return rect.width >= 150 && rect.width <= 500 && rect.height >= 38 && rect.height <= 100 && (matchesType || /^Humanoid\b/i.test(text));
  }).toArray().sort((a, b) => (a.getBoundingClientRect().width * a.getBoundingClientRect().height) - (b.getBoundingClientRect().width * b.getBoundingClientRect().height));
  let host = speciesCandidates.length ? $(speciesCandidates[0]) : $();
  if (!host.length) {
    const portrait = root.find('img[data-edit="img"], img.profile, img.portrait, [data-application-part="portrait"] img').first();
    if (!portrait.length) return;
    host = portrait.parent().addClass("tsru-portrait-badge-host");
  } else host.addClass("tsru-species-badge-host");
  const badges = $(`<div class="tsru-character-badges" data-tsru-character-badges></div>`);
  if (element?.icon) badges.append(`<div class="tsru-character-badge" title="Element: ${escapeHTML(element.name)}" style="--tsru-badge-color:${element.readyColor || element.color || "#fff"}"><img src="${escapeHTML(element.icon)}"></div>`);
  if (path?.icon) badges.append(`<div class="tsru-character-badge" title="Path: ${escapeHTML(path.name)}"><img src="${escapeHTML(path.icon)}"></div>`);
  host.append(badges);
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
    this.element.querySelector(".tsru-orb-image").src = config.orbImage || this.actor.img || "icons/svg/mystery-man.svg";
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

async function requestUltimate(actor) {
  const config = getConfig(actor);
  if (!config.enabled || config.current < config.max) return ui.notifications.warn("This Ultimate is not ready.");
  if (!config.ultimateScript?.trim()) return ui.notifications.warn("No Ultimate script is configured for this character.");
  if (state.ultimateLocks.has(actor.id)) return;
  if (game.user.isGM && isAuthority()) return executeUltimate(actor.id, game.user.id);
  const gm = activeGM();
  if (!gm) return ui.notifications.error("A GM must be connected to activate an Ultimate.");
  game.socket.emit(SOCKET, {type: "activateUltimate", actorId: actor.id, requestingUserId: game.user.id});
}

async function insertUltimateTurn(actor) {
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
    img: getConfig(actor).orbImage || actor.img,
    flags: {[MODULE_ID]: {temporaryUltimate: true, resumeCombatantId: current?.id ?? null, resumeRound: combat.round}}
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

async function removeUltimateTurn(temporary) {
  if (!temporary) return;
  const combat = temporary.parent;
  const resumeId = temporary.getFlag(MODULE_ID, "resumeCombatantId");
  const resumeRound = temporary.getFlag(MODULE_ID, "resumeRound");
  state.suppressCombatHook = true;
  await combat.deleteEmbeddedDocuments("Combatant", [temporary.id]);
  const resumeIndex = combat.turns.findIndex(entry => entry.id === resumeId);
  if (resumeIndex >= 0) await combat.update({turn: resumeIndex, round: resumeRound ?? combat.round});
  state.suppressCombatHook = false;
}

async function runUltimateScript(actor) {
  const config = getConfig(actor);
  const script = config.ultimateScript?.trim();
  if (!script) throw new Error(`${actor.name} has no configured Ultimate script.`);
  const token = actor.getActiveTokens(true, true)?.[0] ?? null;
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
  const execute = new AsyncFunction("actor", "token", "game", "canvas", "ui", "foundry", "Hooks", "punchline", `"use strict";\n${script}`);
  return execute(actor, token, game, canvas, ui, foundry, Hooks, punchlineScriptHelpers(actor));
}

async function runSkillScript(actor) {
  const script = getConfig(actor).skillScript?.trim();
  if (!script) throw new Error(`${actor.name} has no configured Skill script.`);
  const token = actor.getActiveTokens(true, true)?.[0] ?? null;
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
  const execute = new AsyncFunction("actor", "token", "game", "canvas", "ui", "foundry", "Hooks", "punchline", `"use strict";\n${script}`);
  return execute(actor, token, game, canvas, ui, foundry, Hooks, punchlineScriptHelpers(actor));
}

async function requestSkill(actor) {
  const config = getConfig(actor);
  if (!config.skillEnabled) return ui.notifications.warn("This character's Skill button is disabled.");
  if (!config.skillScript?.trim()) return ui.notifications.warn("No Skill script is configured for this character.");
  if (currentSkillPoints() <= 0) return ui.notifications.warn("The party has no Skill Points remaining.");
  if (state.skillLocks.has(actor.id)) return;
  if (game.user.isGM && isAuthority()) return executeSkill(actor.id, game.user.id);
  const gm = activeGM();
  if (!gm) return ui.notifications.error("A GM must be connected to spend a shared Skill Point.");
  game.socket.emit(SOCKET, {type: "activateSkill", actorId: actor.id, requestingUserId: game.user.id});
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
  if (!config.skillEnabled || !config.skillScript?.trim()) return ui.notifications.warn(`${actor.name} has no configured Skill script.`);
  if (currentSkillPoints() <= 0) return ui.notifications.warn("The party has no Skill Points remaining.");

  state.skillSpendLock = true;
  state.skillLocks.add(actorId);
  game.socket.emit(SOCKET, {type: "skillState", actorId, locked: true});
  try {
    await setSkillPoints(currentSkillPoints() - 1);
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
  const temporary = pending?.combatId && pending?.combatantId
    ? game.combats.get(pending.combatId)?.combatants.get(pending.combatantId)
    : null;
  await removeUltimateTurn(temporary);
  state.pendingUltimates.delete(actorId);
  state.ultimateLocks.delete(actorId);
  game.socket.emit(SOCKET, {type: "ultimateState", actorId, locked: false});
  refreshOrb(game.actors.get(actorId));
}

async function executeUltimate(actorId, requestingUserId) {
  if (!isAuthority() || state.ultimateLocks.has(actorId)) return;
  const actor = game.actors.get(actorId);
  const requester = game.users.get(requestingUserId);
  if (!actor || (!requester?.isGM && !actor.testUserPermission(requester, "OWNER"))) return;
  const config = getConfig(actor);
  if (!config.enabled || config.current < config.max) return;
  if (!config.ultimateScript?.trim()) return ui.notifications.warn(`${actor.name} has no configured Ultimate script.`);

  state.ultimateLocks.add(actorId);
  game.socket.emit(SOCKET, {type: "ultimateState", actorId, locked: true});
  refreshOrb(actor);
  try {
    const element = getElements().find(entry => entry.id === config.elementId);
    const splash = {actorName: actor.name, image: config.splashImage, duration: config.splashDuration, ultimateName: config.ultimateName, ultimateSubtitle: config.ultimateSubtitle, titleX: config.titleX, titleY: config.titleY, titleSize: config.titleSize, titleAlign: config.titleAlign, fontFile: config.fontFile, subtitleFontFile: config.subtitleFontFile, color: element?.chargeColor || DEFAULT_CONFIG.chargeColor};
    showSplash(splash);
    game.socket.emit(SOCKET, {type: "showSplash", sourceUserId: game.user.id, ...splash});
    const temporary = await insertUltimateTurn(actor);
    await setEnergy(actor, 0);
    const pending = {
      actorId,
      requestingUserId,
      combatId: temporary?.parent?.id ?? null,
      combatantId: temporary?.id ?? null,
      timer: window.setTimeout(() => completeUltimate(actorId), 120000)
    };
    state.pendingUltimates.set(actorId, pending);
    if (requestingUserId === game.user.id) {
      await runUltimateScript(actor);
      await completeUltimate(actorId);
    } else {
      game.socket.emit(SOCKET, {type: "useUltimate", actorId, targetUserId: requestingUserId});
    }
  } catch (error) {
    console.error(`${MODULE_ID} | Ultimate failed`, error);
    ui.notifications.error(`Ultimate failed: ${error.message}`);
    await completeUltimate(actorId);
  }
}

async function onSocket(payload) {
  if (!payload?.type) return;
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
  if (payload.type === "skillPointsChanged") { refreshSkillUI(); return; }
  if (payload.type === "activateSkill" && isAuthority()) return executeSkill(payload.actorId, payload.requestingUserId);
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
  if (payload.type === "activateUltimate" && isAuthority()) return executeUltimate(payload.actorId, payload.requestingUserId);
  if (payload.type === "showSplash") {
    if (payload.sourceUserId !== game.user.id) showSplash(payload);
    return;
  }
  if (payload.type === "useUltimate" && payload.targetUserId === game.user.id) {
    const actor = game.actors.get(payload.actorId);
    try {
      if (!actor?.isOwner) throw new Error("You no longer own this character.");
      await runUltimateScript(actor);
      game.socket.emit(SOCKET, {type: "ultimateComplete", actorId: payload.actorId, userId: game.user.id});
    } catch (error) {
      console.error(`${MODULE_ID} | Player Ultimate failed`, error);
      ui.notifications.error(`Ultimate failed: ${error.message}`);
      game.socket.emit(SOCKET, {type: "ultimateComplete", actorId: payload.actorId, userId: game.user.id, failed: true});
    }
    return;
  }
  if (payload.type === "ultimateComplete" && isAuthority()) {
    const pending = state.pendingUltimates.get(payload.actorId);
    if (pending?.requestingUserId === payload.userId) await completeUltimate(payload.actorId);
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

  if (attacker.type === "character" && Number(amount) > 0 && getAhaConfig().elationEnabled) {
    const punchlineKey = `punchline-damage:${damageEventId}:${targetActor.uuid}`;
    if (!state.processedMessages.has(punchlineKey)) {
      state.processedMessages.add(punchlineKey);
      window.setTimeout(() => state.processedMessages.delete(punchlineKey), 120000);
      const ahaConfig = getAhaConfig();
      const actorConfig = getConfig(attacker);
      const isElation = Boolean(ahaConfig.elationPathId) && actorConfig.pathId === ahaConfig.elationPathId;
      const gain = isElation ? Math.max(0, Math.floor(Number(actorConfig.punchlineGain) || 0)) : 1;
      if (gain > 0) await addPunchline(gain);
    }
  }

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
  const diceDamage = rawDiceTotal(damageRolls);
  if (diceDamage <= 0) return;
  const eventKey = `applied-damage:${damageEventId}:${targetActor.uuid}:${diceDamage}`;
  await applyToughnessDamage(attacker, [targetActor], diceDamage, eventKey);
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
  if (!elementId) return;
  let applied = false;
  for (const target of targetList) {
    const actor = target?.actor ?? target?.document?.actor ?? target;
    if (!actor || actor.type !== "npc") continue;
    const toughness = getToughness(actor);
    if (!toughness.enabled || !toughness.weaknesses.includes(elementId) || toughness.current <= 0) continue;
    const next = clamp(toughness.current - amount, 0, toughness.max);
    const discoveredWeaknesses = [...new Set([...toughness.discoveredWeaknesses, elementId])];
    await actor.update({
      [`flags.${MODULE_ID}.toughness.current`]: next,
      [`flags.${MODULE_ID}.toughness.discoveredWeaknesses`]: discoveredWeaknesses
    });
    applied = true;
    if (next === 0 && toughness.current > 0) ui.notifications.info(`${actor.name}'s Toughness was broken!`);
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
  const amount = rawDiceTotal(Array.isArray(rolls) ? rolls : [rolls]);
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
      const amount = rawDiceTotal(message.rolls);
      if (amount > 0 && targetUuids.length) game.socket.emit(SOCKET, {type: "applyToughness", sourceUserId: game.user.id, attackerUuid: attacker.uuid, targetUuids, amount, eventKey: midiWorkflowId || `chat:${message.id}`});
    }
    return;
  }
  if (attackMessage && attacker) await addEnergy(attacker, energyGain(getConfig(attacker), "attack"), "attack");
  if ((damageMessage || macroDamageMessage) && attacker) await applyToughnessDamage(attacker, [...targetIds].map(id => game.actors.get(id)), rawDiceTotal(message.rolls), midiWorkflowId || message.id);
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
  const toughnessTargets = hitTargets.size ? hitTargets : targets;
  const damageRolls = midiDamageRolls(workflow);
  const diceDamage = rawDiceTotal(damageRolls);
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
  }
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
      new FilePicker({type: button.dataset.type || "any", current: html.find(`[name="${target}"]`).val(), callback: path => html.find(`[name="${target}"]`).val(path)}).browse();
    });
    html.find("[data-color-for]").on("change", event => html.find(`[name="${event.currentTarget.dataset.colorFor}"]`).val(event.currentTarget.value));
    html.find("[data-action='preview-aha']").on("click", () => playAhaVideo({video: html.find('[name="video"]').val()}));
    html.find("[data-action='show-aha-button']").on("click", showAhaButton);
    html.find("[data-action='show-punchline']").on("click", async () => { await savePunchlineLayout({visible: true}); refreshPunchlineHUD(); });
    html.find("[data-action='sync-aha-initiative']").on("click", async () => {
      if (!game.combat) return ui.notifications.warn("There is no active combat to add Aha Instant to.");
      const combatant = await maybeEnsureAhaCombatant(game.combat, {force: true});
      if (combatant) ui.notifications.info(`Aha Instant is in combat at initiative ${combatant.initiative}.`);
    });
  }
  async _updateObject(_event, formData) {
    await game.settings.set(MODULE_ID, "ahaConfig", {
      elationEnabled: Boolean(formData.elationEnabled),
      elationPathId: formData.elationPathId || "",
      punchlineIcon: formData.punchlineIcon || DEFAULT_AHA_CONFIG.punchlineIcon,
      punchlineFontFile: formData.punchlineFontFile || "",
      video: formData.video || "",
      buttonImage: formData.buttonImage || DEFAULT_AHA_CONFIG.buttonImage,
      color: formData.color || DEFAULT_AHA_CONFIG.color,
      initiativeEnabled: Boolean(formData.initiativeEnabled),
      combatantImage: formData.combatantImage || DEFAULT_AHA_CONFIG.combatantImage
    });
    await setPunchline(formData.punchline);
    refreshAhaButton();
    refreshPunchlineHUD();
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
}

async function injectUltimateTab(app, html) {
  const actor = app.actor ?? app.document;
  if (!game.user.isGM || actor?.type !== "character") return;
  const rootElement = html?.jquery ? html[0] : html instanceof HTMLElement ? html : app.element;
  if (!rootElement) return;
  const root = $(rootElement);
  if (root.find('[data-tab="tsru-ultimate"]').length) return;
  const nav = root.find('nav.tabs[data-group="primary"], nav.sheet-tabs[data-group="primary"], .tabs-right nav.tabs').first();
  let body = root.find('.tab-body').first();
  if (!body.length) body = root.find('.sheet-body').first();
  if (!body.length) body = root.find('[data-application-part="body"]').first();
  if (!nav.length || !body.length) {
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
    for (const key of ["current", "max", "regenScore", "attackGain", "attackedGain", "punchlineGain", "splashDuration", "titleX", "titleY", "titleSize"]) data[key] = Number(data[key]);
    for (const key of ["enabled", "showPercent", "skillEnabled"]) data[key] = Boolean(data[key]);
    data.max = Math.max(1, data.max || 100);
    data.current = clamp(data.current, 0, data.max);
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
    await setEnergy(actor, value);
    tab.find("[name='current']").val(value);
    tab.find(".tsru-energy-override-value").val(value);
    refreshOrb(actor);
    ui.notifications.info(`${actor.name}'s Energy was set to ${value}/${config.max}.`);
  });
  tab.find("[data-action='reset-energy']").on("click", async () => { await setEnergy(actor, 0); app.render(false); });
  tab.find("[data-action='fill-energy']").on("click", async () => { await setEnergy(actor, getConfig(actor).max); app.render(false); });
  tab.find("[data-action='show-orb']").on("click", () => showOrb(actor));
  tab.find("[data-action='show-skill-button']").on("click", async () => { await saveSkillButtonLayout(actor.id, {visible: true}); refreshSkillUI(); });
  tab.find("[name='regenScore']").on("input", event => tab.find(".tsru-modifier").text(`Modifier: ${signedNumber(Math.floor(((Number(event.currentTarget.value) || 10) - 10) / 2))}`));
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
      const data = {enabled: html.find('[name="enabled"]').prop("checked"), max, current: clamp(html.find('[name="current"]').val(), 0, max), weaknesses: html.find('[name="weakness"]:checked').map((_i, field) => field.value).get(), discoveredWeaknesses: config.discoveredWeaknesses};
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
  const visibleWeaknesses = game.user?.isGM ? config.weaknesses : config.discoveredWeaknesses;
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
Hooks.on("renderActorSheet", injectToughnessHeaderButton);
Hooks.on("renderApplicationV2", (app, html) => {
  const actor = app.actor ?? app.document;
  if (actor?.documentName === "Actor" && actor.type === "character") {
    injectUltimateTab(app, html);
    injectEnergyAbility(app, html);
    injectCharacterBadges(app, html);
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
Hooks.on("updateActor", actor => { refreshOrb(actor); refreshSkillUI(); refreshToughnessBars(); });
Hooks.on("updateToken", () => refreshToughnessBars());
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

Hooks.on("deleteCombat", combat => {
  state.ultimateLocks.clear();
  state.skillLocks.clear();
  for (const pending of state.pendingSkills.values()) if (pending?.timer) window.clearTimeout(pending.timer);
  state.pendingSkills.clear();
  for (const combatant of combat.combatants ?? []) {
    if (combatant.getFlag(MODULE_ID, "temporaryUltimate")) state.ultimateLocks.delete(combatant.actorId);
  }
  refreshAllOrbs();
});

Hooks.on("updateCombat", async combat => {
  refreshToughnessBars();
  if (!isAuthority()) return;
  if (!combat.combatants.find(isAhaCombatant)) await maybeEnsureAhaCombatant(combat);
  const current = combat.combatant;
  if (combat.started && isAhaCombatant(current)) {
    const turnKey = `${combat.id}:${combat.round}:${current.id}`;
    if (state.lastAhaTurnKey !== turnKey) {
      state.lastAhaTurnKey = turnKey;
      triggerAhaInstant();
    }
    return;
  }
  if (state.suppressCombatHook) return;
  const temporary = current;
  if (!temporary?.getFlag(MODULE_ID, "temporaryUltimate")) return;
  const actor = temporary.actor;
  if (!actor || state.ultimateLocks.has(actor.id)) return;
  await removeUltimateTurn(temporary);
});

Hooks.on("updateCombatant", async (combatant, changed) => {
  if (!isAuthority() || isAhaCombatant(combatant) || !("initiative" in changed)) return;
  await maybeEnsureAhaCombatant(combatant.parent);
});

Hooks.on("createCombatant", combatant => {
  window.setTimeout(refreshToughnessBars, 150);
  if (isAhaCombatant(combatant)) return;
  window.setTimeout(() => maybeEnsureAhaCombatant(combatant.parent), 100);
});

Hooks.on("combatStart", async combat => {
  if (isAuthority()) await setSkillPoints(getSkillPointConfig().starting);
  await maybeEnsureAhaCombatant(combat, {force: true});
});
Hooks.on("deleteCombatant", () => window.setTimeout(refreshToughnessBars, 100));
