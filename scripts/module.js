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
  ultimateItemId: "",
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
  elementId: ""
});

const state = {
  orbs: new Map(),
  ahaButton: null,
  processedMessages: new Set(),
  ultimateLocks: new Set(),
  pendingUltimates: new Map(),
  suppressCombatHook: false,
  lastAhaTurnKey: ""
};

let ahaToolbarOpening = false;

const DEFAULT_AHA_CONFIG = Object.freeze({
  video: "",
  buttonImage: "icons/svg/explosion.svg",
  color: "#ff4fd8",
  initiativeEnabled: false,
  initiativeValue: 0,
  combatantImage: "icons/svg/mystery-man.svg"
});

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

function regenModifier(config) {
  return Math.floor(((Number(config.regenScore) || 10) - 10) / 2);
}

function energyAbilityMarkup(actor) {
  const config = getConfig(actor);
  const editable = game.user.isGM || actor.isOwner;
  return `<div class="tsru-energy-ability ability-score" data-tsru-energy-ability data-actor-id="${actor.id}" title="Energy gained = base gain + Energy Regen modifier">
    <div class="tsru-energy-ability-label">ENERGY REGEN</div>
    <div class="tsru-energy-ability-modifier">${signedNumber(regenModifier(config))}</div>
    <input class="tsru-energy-ability-score" type="number" min="1" max="30" step="1" value="${Number(config.regenScore) || 10}" aria-label="Energy Regen ability score" ${editable ? "" : "disabled"}>
  </div>`;
}

async function injectEnergyAbility(app, html) {
  const actor = app.actor ?? app.document;
  if (actor?.documentName !== "Actor" || actor.type !== "character") return;
  const rootElement = html?.jquery ? html[0] : html instanceof HTMLElement ? html : app.element?.[0] ?? app.element;
  if (!rootElement) return;
  const root = $(rootElement);
  if (root.find("[data-tsru-energy-ability]").length) return;
  const candidates = root.find('[data-application-part="ability-scores"], .ability-scores, header .abilities, .sheet-header .abilities').toArray();
  const abilityElement = candidates.find(element => {
    const rect = element.getBoundingClientRect();
    const children = [...element.children].filter(child => child.getBoundingClientRect().width > 35);
    if (children.length < 6) return false;
    const tops = children.slice(0, 6).map(child => Math.round(child.getBoundingClientRect().top));
    return rect.width >= 420 && rect.height <= 180 && Math.max(...tops) - Math.min(...tops) <= 30;
  });
  const abilities = abilityElement ? $(abilityElement) : $();
  if (!abilities.length) return console.debug(`${MODULE_ID} | Ability-score container not found for`, actor.name);
  abilities.append(energyAbilityMarkup(actor));
  const card = abilities.find("[data-tsru-energy-ability]").last();
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
    await actor.update({[`flags.${MODULE_ID}.ultimate.regenScore`]: value});
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
  overlay.innerHTML = `<video src="${escapeHTML(video)}" autoplay playsinline></video>`;
  const board = document.querySelector("#board");
  const canvasLayer = document.querySelector("#canvas");
  if (board instanceof HTMLCanvasElement) board.insertAdjacentElement("afterend", overlay);
  else (board ?? canvasLayer ?? document.body).appendChild(overlay);
  const player = overlay.querySelector("video");
  const remove = () => overlay.remove();
  player.addEventListener("ended", remove, {once: true});
  player.addEventListener("error", remove, {once: true});
  window.setTimeout(remove, 300000);
}

function triggerAhaInstant() {
  if (!game.user.isGM) return;
  const config = getAhaConfig();
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
  if (!config.initiativeEnabled) {
    if (existing) await combat.deleteEmbeddedDocuments("Combatant", [existing.id]);
    return null;
  }
  const data = {
    name: "Aha Instant",
    initiative: Number(config.initiativeValue) || 0,
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
  if (!isAuthority() || !combat || !getAhaConfig().initiativeEnabled) return null;
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
    if (!game.user.isGM) return this.destroy();
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
  if (!game.user.isGM || !ahaLayout().visible) { state.ahaButton?.destroy(); return; }
  if (!state.ahaButton) state.ahaButton = new AhaButton();
  state.ahaButton.render();
}

async function showAhaButton() { await saveAhaLayout({visible: true}); refreshAhaButton(); }

function openAhaInstantControls() {
  if (!game.user.isGM || ahaToolbarOpening) return;
  ahaToolbarOpening = true;
  window.setTimeout(() => { ahaToolbarOpening = false; }, 350);
  try { new AhaConfig().render(true); }
  catch (error) {
    console.error(`${MODULE_ID} | Could not open Aha Instant configuration`, error);
    ui.notifications.error(`Could not open Aha Instant configuration: ${error.message}`);
  }
  showAhaButton().catch(error => {
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

function getElements() {
  return (game.settings.get(MODULE_ID, "elements") ?? []).map(element => ({
    ...element,
    chargeColor: element.chargeColor || element.color || DEFAULT_CONFIG.chargeColor,
    readyColor: element.readyColor || element.color || DEFAULT_CONFIG.readyColor,
    color: element.readyColor || element.color || DEFAULT_CONFIG.readyColor
  }));
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
          <img class="tsru-orb-element" hidden>
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
    this.element.classList.toggle("is-ready", ready);
    this.element.querySelector(".tsru-orb-image").src = config.orbImage || this.actor.img || "icons/svg/mystery-man.svg";
    this.element.querySelector(".tsru-orb-percent").textContent = config.showPercent ? `${Math.round(percent)}%` : "";
    this.element.querySelector(".tsru-orb").disabled = !ready || state.ultimateLocks.has(this.actor.id);
    this.element.querySelector(".tsru-orb").title = ready ? `${this.actor.name}: Activate Ultimate` : `${this.actor.name}: ${config.current}/${config.max} Energy`;
    const badge = this.element.querySelector(".tsru-orb-element");
    if (element?.icon) {
      badge.src = element.icon;
      badge.title = element.name;
      badge.style.setProperty("--tsru-element-color", element.color || "#ffffff");
      badge.hidden = false;
    } else badge.hidden = true;
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
  document.body.appendChild(splash);
  requestAnimationFrame(() => splash.classList.add("show"));
  window.setTimeout(() => {
    splash.classList.remove("show");
    window.setTimeout(() => splash.remove(), 260);
  }, Math.max(100, Number(duration) * 1000));
}

async function requestUltimate(actor) {
  const config = getConfig(actor);
  if (!config.enabled || config.current < config.max) return ui.notifications.warn("This Ultimate is not ready.");
  if (!config.ultimateItemId) return ui.notifications.warn("No Ultimate Item is configured for this character.");
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

async function useUltimateItem(actor) {
  const config = getConfig(actor);
  const item = actor.items.get(config.ultimateItemId);
  if (!item) throw new Error(`${actor.name}'s configured Ultimate Item could not be found.`);
  if (typeof item.use === "function") return item.use();
  if (typeof item.roll === "function") return item.roll();
  throw new Error("The configured Ultimate Item cannot be used by this D&D 5e version.");
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
  const item = actor.items.get(config.ultimateItemId);
  if (!item) return ui.notifications.warn(`${actor.name}'s configured Ultimate Item could not be found.`);

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
      await useUltimateItem(actor);
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
      await useUltimateItem(actor);
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
  return ids;
}

async function processCoreAttackMessage(message) {
  if (!isAuthority() || game.modules.get("midi-qol")?.active || !isAttackMessage(message)) return;
  if (state.processedMessages.has(message.id)) return;
  state.processedMessages.add(message.id);
  window.setTimeout(() => state.processedMessages.delete(message.id), 60000);
  const attacker = game.actors.get(message.speaker?.actor) ?? canvas?.tokens?.get(message.speaker?.token)?.actor;
  if (attacker) await addEnergy(attacker, energyGain(getConfig(attacker), "attack"), "attack");
  for (const actorId of targetActorIdsFromMessage(message)) {
    const target = game.actors.get(actorId);
    if (!target) continue;
    const config = getConfig(target);
    if (config.attackedMode === "targeted" || config.attackedMode === "hit") await addEnergy(target, energyGain(config, "attacked"), "attacked");
  }
}

async function processMidiWorkflow(workflow) {
  if (!isAuthority()) return;
  const key = workflow?.uuid ?? workflow?.id ?? workflow?.itemCardId;
  if (key && state.processedMessages.has(key)) return;
  if (key) {
    state.processedMessages.add(key);
    window.setTimeout(() => state.processedMessages.delete(key), 60000);
  }
  const attacker = workflow?.actor;
  if (attacker) await addEnergy(attacker, energyGain(getConfig(attacker), "attack"), "attack");
  const targets = workflow?.targets ?? new Set();
  const hitTargets = workflow?.hitTargets ?? new Set();
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
  }
}

class ElementMenu extends FormApplication {
  render() { new ElementManager().render(true); return this; }
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
  getData() { return {config: getAhaConfig()}; }
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
    html.find("[data-action='sync-aha-initiative']").on("click", async () => {
      if (!game.combat) return ui.notifications.warn("There is no active combat to add Aha Instant to.");
      const combatant = await maybeEnsureAhaCombatant(game.combat, {force: true});
      if (combatant) ui.notifications.info(`Aha Instant is in combat at initiative ${combatant.initiative}.`);
    });
  }
  async _updateObject(_event, formData) {
    await game.settings.set(MODULE_ID, "ahaConfig", {
      video: formData.video || "",
      buttonImage: formData.buttonImage || DEFAULT_AHA_CONFIG.buttonImage,
      color: formData.color || DEFAULT_AHA_CONFIG.color,
      initiativeEnabled: Boolean(formData.initiativeEnabled),
      initiativeValue: Number(formData.initiativeValue) || 0,
      combatantImage: formData.combatantImage || DEFAULT_AHA_CONFIG.combatantImage
    });
    refreshAhaButton();
    await syncAhaCombatants();
    ui.notifications.info("Aha Instant configuration saved.");
  }
}

class AhaMenu extends FormApplication {
  render() { new AhaConfig().render(true); return this; }
}

function registerSettings() {
  game.settings.register(MODULE_ID, "elements", {scope: "world", config: false, type: Array, default: []});
  game.settings.register(MODULE_ID, "elementsDraft", {scope: "client", config: false, type: Array, default: []});
  game.settings.register(MODULE_ID, "orbLayouts", {scope: "client", config: false, type: Object, default: {}});
  game.settings.register(MODULE_ID, "ahaConfig", {scope: "world", config: false, type: Object, default: foundry.utils.deepClone(DEFAULT_AHA_CONFIG)});
  game.settings.register(MODULE_ID, "ahaLayout", {scope: "client", config: false, type: Object, default: {x: 220, y: 180, size: 128, visible: false}});
  game.settings.registerMenu(MODULE_ID, "elementManager", {
    name: "Manage Elements",
    label: "Open Element Manager",
    hint: "Create Element names, icons, and colors for assignment on character sheets.",
    icon: "fas fa-sparkles",
    type: ElementMenu,
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
  const items = actor.items.map(item => ({id: item.id, name: item.name, selected: item.id === config.ultimateItemId})).sort((a, b) => a.name.localeCompare(b.name));
  const content = await renderTemplate(`modules/${MODULE_ID}/templates/ultimate-tab.hbs`, {
    config, elements, items,
    selectedElement: elements.find(entry => entry.selected),
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
  const items = actor.items.map(item => ({id: item.id, name: item.name, selected: item.id === config.ultimateItemId})).sort((a, b) => a.name.localeCompare(b.name));
  const content = await renderTemplate(`modules/${MODULE_ID}/templates/ultimate-tab.hbs`, {
    config, elements, items,
    selectedElement: elements.find(entry => entry.selected),
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
  tab.find("input, select, button").prop("disabled", false);
  tab.find("input:not([readonly])").prop("readonly", false);
  tab.on("input.tsru change.tsru", "input, select", event => event.stopPropagation());
  tab.find("[data-action='save-config']").on("click", async event => {
    event.preventDefault();
    event.stopPropagation();
    const data = {};
    tab.find("[name]").each((_index, field) => {
      data[field.name] = field.type === "checkbox" ? field.checked : field.value;
    });
    for (const key of ["current", "max", "regenScore", "attackGain", "attackedGain", "splashDuration", "titleX", "titleY", "titleSize"]) data[key] = Number(data[key]);
    for (const key of ["enabled", "showPercent"]) data[key] = Boolean(data[key]);
    data.max = Math.max(1, data.max || 100);
    data.current = clamp(data.current, 0, data.max);
    await actor.setFlag(MODULE_ID, "ultimate", data);
    ui.notifications.info(`${actor.name}'s Ultimate configuration saved.`);
    refreshOrb(actor);
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
  tab.find("[name='regenScore']").on("input", event => tab.find(".tsru-modifier").text(`Modifier: ${signedNumber(Math.floor(((Number(event.currentTarget.value) || 10) - 10) / 2))}`));
}

function addActorHeaderButton(app, buttons) {
  if (!game.user.isGM || app.actor?.type !== "character") return;
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
  const ahaTool = {
    name: "tsru-aha-instant",
    title: "Aha Instant",
    icon: "fas fa-masks-theater",
    order: 91,
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
    showSplash,
    refreshOrbs: refreshAllOrbs,
    showOrb,
    showAhaButton,
    triggerAhaInstant,
    openElementManager: () => new ElementManager().render(true)
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
  registerAhaToolbarFallback();
  if (game.modules.get("midi-qol")?.active) Hooks.on("midi-qol.RollComplete", processMidiWorkflow);
});

Hooks.on("renderActorSheet", injectUltimateTab);
Hooks.on("renderCharacterActorSheet", injectUltimateTab);
Hooks.on("renderApplicationV2", (app, html) => {
  const actor = app.actor ?? app.document;
  if (actor?.documentName === "Actor" && actor.type === "character") {
    injectUltimateTab(app, html);
    injectEnergyAbility(app, html);
  }
});
Hooks.on("renderActorSheet", injectEnergyAbility);
Hooks.on("renderCharacterActorSheet", injectEnergyAbility);
Hooks.on("getActorSheetHeaderButtons", addActorHeaderButton);
Hooks.on("getSceneControlButtons", addHudTool);
Hooks.on("createChatMessage", processCoreAttackMessage);
Hooks.on("updateActor", actor => refreshOrb(actor));
Hooks.on("deleteActor", actor => state.orbs.get(actor.id)?.destroy());
Hooks.on("updateUser", user => { if (user.id === game.user.id) refreshAllOrbs(); });
Hooks.on("canvasReady", refreshAllOrbs);
Hooks.on("canvasReady", refreshAhaButton);

Hooks.on("deleteCombat", combat => {
  state.ultimateLocks.clear();
  for (const combatant of combat.combatants ?? []) {
    if (combatant.getFlag(MODULE_ID, "temporaryUltimate")) state.ultimateLocks.delete(combatant.actorId);
  }
  refreshAllOrbs();
});

Hooks.on("updateCombat", async combat => {
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
  if (isAhaCombatant(combatant)) return;
  window.setTimeout(() => maybeEnsureAhaCombatant(combatant.parent), 100);
});

Hooks.on("combatStart", combat => maybeEnsureAhaCombatant(combat, {force: true}));
