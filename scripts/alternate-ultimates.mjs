import {normalizeAlternateOrb, alternateOrbProgress, ultimateCharge} from "./alternate-ultimate-rules.mjs";

const MODULE_ID = "telys-star-rail-ultimates";
const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
const designers = new Map(), counterQueues = new Map();
let resolving = () => false;
export const getAlternateOrb = actor => normalizeAlternateOrb(actor?.getFlag(MODULE_ID, "alternateOrb"));
export const getAlternateOrbStates = actor => actor?.getFlag(MODULE_ID, "alternateOrbStates") ?? {};
export const alternateUltimateEnabled = actor => Boolean(actor?.getFlag(MODULE_ID, "ultimate")?.alternateUltimateEnabled);
export const alternateUltimateCharge = (actor, config) => ultimateCharge(config, getAlternateOrb(actor), getAlternateOrbStates(actor));
export function configureAlternateUltimates(options) { resolving = options.isResolving; }

export function bindAlternateOrbSheet(actor, root) {
  const toggle = root?.querySelector('[name="alternateUltimateEnabled"]');
  const builder = root?.querySelector("[data-tsru-alternate-builder]");
  if (!toggle || !builder) return;
  const sync = () => { builder.hidden = !toggle.checked; };
  toggle.addEventListener("change", sync);
  builder.querySelector('[data-action="open-alternate-orb-builder"]')?.addEventListener("click", () => openAlternateOrbDesigner(actor));
  sync();
}

export function renderAlternateOrb(raw, states = {}, {editing = false, selected = ""} = {}) {
  const orb = normalizeAlternateOrb(raw);
  return `<span class="tsru-alt-orb-artboard ${editing ? "is-editing" : ""}" aria-hidden="${!editing}">${orb.components.map(c => {
    const active = states[c.id] === true;
    const image = !active && c.offImage ? c.offImage : c.image;
    return `<span class="tsru-alt-orb-piece ${active ? "is-on" : "is-off"} ${!active && c.offImage ? "has-off-image" : ""} ${active && c.glow && orb.glowEnabled ? "has-glow" : ""} ${selected === c.id ? "is-selected" : ""}" data-alt-piece="${c.id}" style="left:${c.x}%;top:${c.y}%;width:${c.scale}%;height:${c.scale}%;transform:translate(-50%,-50%) rotate(${c.rotation}deg);--alt-color:${c.color}">${image ? `<img class="tsru-alt-orb-art" src="${escape(image)}" alt="${escape(c.name)}" draggable="false">` : '<span class="tsru-alt-orb-placeholder">＋</span>'}${editing && selected === c.id ? '<span class="tsru-alt-orb-handle is-scale" data-alt-handle="scale" title="Drag to scale">↘</span><span class="tsru-alt-orb-handle is-rotate" data-alt-handle="rotate" title="Drag to rotate">↻</span>' : ""}</span>`;
  }).join("")}</span>`;
}

export function alternateOrbControls(actor) {
  const orb = getAlternateOrb(actor), states = getAlternateOrbStates(actor), progress = alternateOrbProgress(orb, states);
  return `<div class="tsru-alt-controls" data-alt-controls="${escape(actor.uuid)}"><header><strong>${escape(orb.label)}</strong><b>${progress.current}/${progress.total} on${progress.ready ? " · Ready" : ""}</b></header><div class="tsru-alt-counter-list">${orb.components.map(c => `<button type="button" data-alt-counter="${c.id}" class="${states[c.id] === true ? "is-on" : "is-off"}" aria-pressed="${states[c.id] === true}" style="--alt-color:${c.color}" ${resolving(actor) ? "disabled" : ""}>${c.image ? `<img src="${escape(!states[c.id] && c.offImage ? c.offImage : c.image)}" class="${!states[c.id] && !c.offImage ? "is-grayscale" : ""}" alt="">` : ""}<span>${escape(c.name)}</span><b>${states[c.id] ? "ON" : "OFF"}</b></button>`).join("") || '<p>Add components in the Ultimate Orb Builder.</p>'}</div><footer><button type="button" data-alt-reset ${resolving(actor) ? "disabled" : ""}>Reset counters</button><button type="button" data-alt-builder="${escape(actor.uuid)}">Edit orb</button></footer></div>`;
}

async function findActor(uuid) {
  return game.actors?.get(uuid) ?? await fromUuid(uuid).catch(() => null);
}

export async function setAlternateOrbCounter(actor, id, active) {
  if (!game.user.isGM || !actor || !alternateUltimateEnabled(actor)) return false;
  return queueCounterChange(actor, async () => {
    if (resolving(actor)) return false;
    if (!getAlternateOrb(actor).components.some(c => c.id === id)) return false;
    await actor.update({[`flags.${MODULE_ID}.alternateOrbStates.${id}`]: Boolean(active)});
    return true;
  });
}

async function queueCounterChange(actor, work) {
  const key = actor.uuid;
  const pending = (counterQueues.get(key) ?? Promise.resolve()).catch(() => {}).then(work);
  counterQueues.set(key, pending);
  try { return await pending; }
  finally { if (counterQueues.get(key) === pending) counterQueues.delete(key); }
}

export async function resetAlternateOrbCounters(actor, {consume = false} = {}) {
  if (!game.user.isGM || !actor) return false;
  return queueCounterChange(actor, async () => {
    if (!consume && resolving(actor)) return false;
    const updates = Object.fromEntries(getAlternateOrb(actor).components.map(c => [`flags.${MODULE_ID}.alternateOrbStates.${c.id}`, false]));
    if (Object.keys(updates).length) await actor.update(updates);
    return true;
  });
}

export function bindAlternateOrbControls(root) {
  if (!root || root.dataset.altControlsBound) return;
  root.dataset.altControlsBound = "true";
  root.addEventListener("click", async event => {
    const button = event.target.closest("[data-alt-counter], [data-alt-reset], [data-alt-builder]");
    if (!button || !root.contains(button) || !game.user.isGM) return;
    event.preventDefault(); event.stopPropagation();
    const uuid = button.dataset.altBuilder || button.closest("[data-alt-controls]")?.dataset.altControls;
    const actor = await findActor(uuid);
    if (!actor) return;
    if (button.hasAttribute("data-alt-builder")) return openAlternateOrbDesigner(actor);
    if (button.disabled) return;
    button.disabled = true;
    try {
      if (button.hasAttribute("data-alt-reset")) await resetAlternateOrbCounters(actor);
      else await setAlternateOrbCounter(actor, button.dataset.altCounter, button.getAttribute("aria-pressed") !== "true");
    } catch (error) { ui.notifications.error(`Could not update ${actor.name}'s counters: ${error.message}`); }
    finally { if (button.isConnected) button.disabled = false; }
  });
}

export function refreshAlternateOrbControls(root) {
  for (const container of root?.querySelectorAll("[data-alt-gm-slot]") ?? []) {
    const actor = game.actors?.get(container.dataset.altGmSlot.split(".").at(-1));
    if (actor) container.innerHTML = alternateUltimateEnabled(actor) ? alternateOrbControls(actor) : "";
  }
}

// Prefer the most common visible image color; GM can override this for any layer.
export async function detectOrbImageColor(path) {
  return new Promise(resolve => {
    const image = new Image(); image.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(null), 5000);
    image.onerror = () => { clearTimeout(timer); resolve(null); };
    image.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 48;
        const ctx = canvas.getContext("2d", {willReadFrequently: true});
        ctx.drawImage(image, 0, 0, 48, 48);
        const pixels = ctx.getImageData(0, 0, 48, 48).data, groups = new Map();
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] < 32) continue;
          const rgb = Array.from(pixels.slice(i, i + 3)), key = rgb.map(c => Math.floor(c / 32)).join(",");
          const group = groups.get(key) ?? {weight: 0, r: 0, g: 0, b: 0};
          const weight = pixels[i + 3] / 255 * (1 + (Math.max(...rgb) - Math.min(...rgb)) / 255);
          group.weight += weight; group.r += rgb[0] * weight; group.g += rgb[1] * weight; group.b += rgb[2] * weight;
          groups.set(key, group);
        }
        const best = [...groups.values()].sort((a, b) => b.weight - a.weight)[0];
        resolve(best ? `#${[best.r, best.g, best.b].map(c => Math.round(c / best.weight).toString(16).padStart(2, "0")).join("")}` : null);
      } catch { resolve(null); }
    };
    image.src = path;
  });
}

const field = (label, key, value, type = "text", extra = "") => `<label>${label}<input type="${type}" data-alt-field="${key}" value="${escape(value)}" ${extra}></label>`;
const fileField = (label, key, value) => `<label>${label}<span class="tsru-alt-file"> <input type="text" data-alt-field="${key}" value="${escape(value)}" placeholder="${key === "offImage" ? "Greyscale of active image" : "Image path or URL"}"><button type="button" data-alt-browse="${key}" title="Browse or upload image">…</button></span></label>`;

function designerMarkup(app) {
  const orb = app.draft, c = orb.components.find(c => c.id === app.selected);
  return `<div class="tsru-alt-designer"><header class="tsru-alt-designer-heading"><div><h2>${escape(app.actor.name)} · Ultimate Orb Builder</h2><p>Arrange your components. The GM switches each counter on or off during play.</p></div><span class="tsru-alt-mode-badge">${alternateUltimateEnabled(app.actor) ? "Alternate mode ON" : "Regular energy mode"}</span></header><div class="tsru-alt-toolbar"><button type="button" data-alt-add>＋ Add component</button><button type="button" data-alt-upload>Upload images</button><button type="button" data-alt-browse-add>Browse images</button><input type="file" accept="image/*" multiple data-alt-files hidden></div><div class="tsru-alt-designer-grid"><aside class="tsru-alt-layers"><h3>Components <small>${orb.components.length}</small></h3><div class="tsru-alt-layers-list">${orb.components.map((c, i) => `<div class="tsru-alt-layer ${app.selected === c.id ? "is-selected" : ""}"><button type="button" data-alt-select="${c.id}">${c.image ? `<img src="${escape(c.image)}" alt="">` : "<span>◇</span>"}<span>${escape(c.name)}<small>Layer ${i + 1}</small></span></button><button type="button" data-alt-preview-toggle="${c.id}" aria-pressed="${app.previewStates[c.id] === true}" title="Preview on/off">${app.previewStates[c.id] ? "ON" : "OFF"}</button></div>`).join("") || '<p class="tsru-alt-empty">Add an image or drop images or Items onto the canvas.</p>'}</div><p class="tsru-alt-help">Last layer appears on top. Preview switches do not change live counters.</p></aside><section class="tsru-alt-stage-column"><div class="tsru-alt-preview-toolbar"><strong>Orb preview</strong><button type="button" data-alt-preview="off">All off</button><button type="button" data-alt-preview="on">All on</button><button type="button" data-alt-preview="live">Live counters</button></div><div class="tsru-alt-stage" tabindex="0" aria-label="Orb design canvas">${renderAlternateOrb(orb, app.previewStates, {editing: true, selected: app.selected})}</div><p class="tsru-alt-help">Drag to move. Drag ↘ to scale or ↻ to rotate. Mouse wheel scales; Shift + wheel rotates. Arrow keys nudge the selected component.</p><label class="tsru-alt-check"><input type="checkbox" data-alt-setting="glowEnabled" ${orb.glowEnabled ? "checked" : ""}> Active component glow</label><label class="tsru-alt-name">Counter system name<input type="text" data-alt-setting="label" value="${escape(orb.label)}"></label></section><aside class="tsru-alt-inspector"><h3>Selected component</h3>${c ? `${field("Name", "name", c.name)}${fileField("Active image", "image", c.image)}${fileField("Off image (optional)", "offImage", c.offImage)}<p class="tsru-alt-help">Without an off image, the active artwork is greyed out. A supplied off image keeps its own appearance.</p><div class="tsru-alt-two-fields">${field("X %", "x", c.x, "number", 'min="0" max="100" step="0.1"')}${field("Y %", "y", c.y, "number", 'min="0" max="100" step="0.1"')}</div>${field("Scale % of orb", "scale", c.scale, "number", 'min="5" max="200" step="1"')}${field("Rotation °", "rotation", c.rotation, "number", 'min="-360" max="360" step="1"')}${field("Glow color", "color", c.color, "color")}<button type="button" data-alt-detect>Detect image color</button><label class="tsru-alt-check"><input type="checkbox" data-alt-field="glow" ${c.glow ? "checked" : ""}> Glow when active</label><div class="tsru-alt-layer-order"><button type="button" data-alt-order="-1">Send back</button><button type="button" data-alt-order="1">Bring forward</button></div><div class="tsru-alt-layer-order"><button type="button" data-alt-duplicate>Duplicate</button><button type="button" data-alt-delete>Remove</button></div>` : '<p class="tsru-alt-empty">Select a component to edit its image, position, scale, rotation, and glow.</p>'}</aside></div><footer class="tsru-alt-designer-footer"><span data-alt-save-status>${app.dirty ? "Unsaved changes" : "Design saved"}</span><small>All counters must be on. Using the Ultimate resets them.</small><button type="button" data-alt-save>Save orb design</button></footer></div>`;
}

export function openAlternateOrbDesigner(actor) {
  if (!game.user.isGM || !actor) return;
  const prior = designers.get(actor.uuid);
  if (prior?.rendered) { prior.bringToFront(); return prior; }
  class AlternateOrbDesigner extends foundry.applications.api.ApplicationV2 {
    static DEFAULT_OPTIONS = {classes: ["tsru-alternate-orb-window"], position: {width: 1050, height: 760}, window: {title: "Ultimate Orb Builder", resizable: true}};
    constructor() {
      super({id: `tsru-alternate-orb-${actor.id}`});
      this.actor = actor; this.draft = getAlternateOrb(actor); this.selected = this.draft.components[0]?.id ?? "";
      this.previewStates = {...getAlternateOrbStates(actor)}; this.dirty = false; this.saving = false;
    }
    async _renderHTML() { return designerMarkup(this); }
    _replaceHTML(result, content) { content.innerHTML = result; }
    _onRender(context, options) {
      super._onRender(context, options);
      const root = this.element.querySelector(".tsru-alt-designer");
      root.addEventListener("click", event => this.onClick(event));
      root.addEventListener("input", event => this.onInput(event));
      root.addEventListener("change", event => {
        if (event.target.matches("[data-alt-files]")) this.uploadFiles(event.target.files).catch(error => this.reportError(error));
        else if (event.target.matches('[data-alt-field="image"]')) this.detectSelectedColor();
      });
      const stage = root.querySelector(".tsru-alt-stage");
      stage.addEventListener("pointerdown", event => this.pointerDown(event));
      stage.addEventListener("pointermove", event => this.pointerMove(event));
      const stopDrag = event => { this.drag = null; if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId); this.syncInspector(); };
      stage.addEventListener("pointerup", stopDrag); stage.addEventListener("pointercancel", stopDrag);
      stage.addEventListener("wheel", event => {
        const c = this.component(); if (!c) return;
        event.preventDefault(); const direction = event.deltaY < 0 ? 1 : -1;
        if (event.shiftKey) c.rotation = clamp(c.rotation + direction * 5, -360, 360);
        else c.scale = clamp(c.scale + direction * 2, 5, 200);
        this.changed(); this.paint(); this.syncInspector();
      }, {passive: false});
      stage.addEventListener("keydown", event => {
        const c = this.component(), moves = {ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1]};
        if (!c || !moves[event.key]) return;
        event.preventDefault(); const [x,y] = moves[event.key], step = event.shiftKey ? 5 : 1;
        c.x = clamp(c.x + x * step, 0, 100); c.y = clamp(c.y + y * step, 0, 100);
        this.changed(); this.paint(); this.syncInspector();
      });
      stage.addEventListener("dragover", event => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; });
      stage.addEventListener("drop", event => { event.preventDefault(); this.dropImages(event).catch(error => this.reportError(error)); });
    }
    component() { return this.draft.components.find(c => c.id === this.selected); }
    changed() { this.dirty = true; const label = this.element.querySelector("[data-alt-save-status]"); if (label) label.textContent = "Unsaved changes"; }
    paint() {
      const stage = this.element.querySelector(".tsru-alt-stage");
      if (!stage) return;
      const template = document.createElement("template");
      template.innerHTML = renderAlternateOrb(this.draft, this.previewStates, {editing: true, selected: this.selected});
      const next = template.content.firstElementChild, board = stage.firstElementChild;
      if (!board) { stage.append(next); return; }
      const existing = new Map([...board.children].map(piece => [piece.dataset.altPiece, piece]));
      for (const piece of [...next.children]) {
        const prior = existing.get(piece.dataset.altPiece);
        if (!prior) { board.append(piece); continue; }
        existing.delete(piece.dataset.altPiece);
        prior.className = piece.className; prior.style.cssText = piece.style.cssText;
        const oldImage = prior.querySelector("img"), newImage = piece.querySelector("img");
        if (oldImage && newImage && oldImage.getAttribute("src") === newImage.getAttribute("src")) {
          oldImage.alt = newImage.alt;
          prior.querySelectorAll(".tsru-alt-orb-handle").forEach(handle => handle.remove());
          prior.append(...piece.querySelectorAll(".tsru-alt-orb-handle"));
        } else prior.replaceChildren(...piece.childNodes);
        board.append(prior);
      }
      for (const piece of existing.values()) piece.remove();
    }
    syncInspector() {
      const c = this.component(); if (!c) return;
      for (const input of this.element.querySelectorAll("[data-alt-field]")) {
        if (input.type === "checkbox") input.checked = c[input.dataset.altField];
        else if (input !== document.activeElement) input.value = c[input.dataset.altField];
      }
    }
    onInput(event) {
      const input = event.target, c = this.component(), key = input.dataset.altField;
      if (key && c) {
        c[key] = input.type === "checkbox" ? input.checked : input.type === "number" ? Number(input.value) : input.value;
        const normalized = normalizeAlternateOrb({components: [c]}).components[0]; Object.assign(c, normalized);
        this.changed(); this.paint();
        if (key === "name") {
          const label = this.element.querySelector(`[data-alt-select="${c.id}"]>span:last-child`);
          if (label) { label.firstChild.textContent = c.name; }
        }
      }
      const setting = input.dataset.altSetting;
      if (setting) { this.draft[setting] = input.type === "checkbox" ? input.checked : input.value; this.changed(); this.paint(); }
    }
    async onClick(event) {
      const button = event.target.closest("button"); if (!button) return;
      event.preventDefault();
      try {
        if (button.hasAttribute("data-alt-add")) return this.addComponent();
        if (button.hasAttribute("data-alt-upload")) return this.element.querySelector("[data-alt-files]").click();
        if (button.hasAttribute("data-alt-browse-add")) return this.browseImage("add");
        if (button.dataset.altBrowse) return this.browseImage(button.dataset.altBrowse);
        if (button.dataset.altSelect) { this.selected = button.dataset.altSelect; return this.render(); }
        if (button.dataset.altPreviewToggle) { const id = button.dataset.altPreviewToggle; this.previewStates[id] = !this.previewStates[id]; return this.render(); }
        if (button.dataset.altPreview) {
          this.previewStates = button.dataset.altPreview === "live" ? {...getAlternateOrbStates(this.actor)} : Object.fromEntries(this.draft.components.map(c => [c.id, button.dataset.altPreview === "on"]));
          return this.render();
        }
        if (button.hasAttribute("data-alt-detect")) return this.detectSelectedColor();
        if (button.hasAttribute("data-alt-save")) return this.save();
        const c = this.component(); if (!c) return;
        if (button.hasAttribute("data-alt-duplicate")) {
          const copy = {...c, id: foundry.utils.randomID(), name: `${c.name} copy`, x: clamp(c.x + 3,0,100), y: clamp(c.y + 3,0,100)};
          this.draft.components.push(copy); this.selected = copy.id;
        }
        if (button.hasAttribute("data-alt-delete")) { this.draft.components = this.draft.components.filter(v => v.id !== c.id); this.selected = this.draft.components[0]?.id ?? ""; }
        if (button.dataset.altOrder) {
          const index = this.draft.components.indexOf(c), next = clamp(index + Number(button.dataset.altOrder),0,this.draft.components.length - 1);
          this.draft.components.splice(index,1); this.draft.components.splice(next,0,c);
        }
        this.changed(); this.render();
      } catch (error) { this.reportError(error); }
    }
    addComponent(image = "", name = "", position = {}) {
      const id = foundry.utils.randomID();
      const c = normalizeAlternateOrb({components: [{id, name: name || `Component ${this.draft.components.length + 1}`, image, ...position}]}).components[0];
      this.draft.components.push(c); this.selected = c.id; this.previewStates[c.id] = true;
      this.changed(); this.render();
      if (image) this.detectSelectedColor(c);
      return c;
    }
    browseImage(field) {
      const c = this.component(), Picker = foundry.applications.apps.FilePicker;
      new Picker({type: "image", current: c?.[field] || "", callback: path => {
        if (field === "add") this.addComponent(path, path.split("/").at(-1)?.replace(/\.[^.]+$/, ""));
        else if (c) { c[field] = path; this.changed(); this.render(); if (field === "image") this.detectSelectedColor(c); }
      }}).browse();
    }
    async detectSelectedColor(c = this.component()) {
      if (!c?.image) return;
      const path = c.image, color = await detectOrbImageColor(path);
      if (color && c.image === path && this.draft.components.includes(c)) { c.color = color; this.changed(); this.paint(); this.syncInspector(); }
    }
    async uploadFiles(files, position = {}) {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const name = `${this.actor.id}-${foundry.utils.randomID()}-${file.name.replace(/[^\w.\-]/g,"_")}`;
        const upload = new File([file], name, {type: file.type});
        const result = await foundry.applications.apps.FilePicker.uploadPersistent(MODULE_ID, "", upload, {}, {notify: false});
        if (!result?.path) throw new Error(result?.error || "Image upload failed.");
        this.addComponent(result.path, file.name.replace(/\.[^.]+$/, ""), position);
      }
    }
    async dropImages(event) {
      const bounds = event.currentTarget.getBoundingClientRect(), position = {x: clamp((event.clientX - bounds.left) / bounds.width * 100,0,100), y: clamp((event.clientY - bounds.top) / bounds.height * 100,0,100)};
      if (event.dataTransfer.files.length) return this.uploadFiles(event.dataTransfer.files, position);
      const raw = event.dataTransfer.getData("text/plain"); let data;
      try { data = JSON.parse(raw); } catch { data = {}; }
      const item = data.uuid ? await fromUuid(data.uuid).catch(() => null) : null;
      const image = item?.img || data.img || data.src || event.dataTransfer.getData("text/uri-list").split("\n").find(v => !v.startsWith("#")) || raw;
      if (typeof image === "string" && /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(image)) this.addComponent(image, item?.name || "", position);
    }
    pointerDown(event) {
      if (event.button !== 0) return;
      const piece = event.target.closest("[data-alt-piece]"); if (!piece) return;
      event.preventDefault();
      const stage = event.currentTarget; this.selected = piece.dataset.altPiece;
      const c = this.component(), rect = stage.getBoundingClientRect();
      this.drag = {pointerId: event.pointerId, kind: event.target.dataset.altHandle || "move", startX: event.clientX, startY: event.clientY,
        rect, original: {...c}, centerX: rect.left + rect.width * c.x / 100, centerY: rect.top + rect.height * c.y / 100};
      this.drag.angle = Math.atan2(event.clientY - this.drag.centerY, event.clientX - this.drag.centerX);
      this.drag.distance = Math.max(1, Math.hypot(event.clientX - this.drag.centerX, event.clientY - this.drag.centerY));
      stage.setPointerCapture(event.pointerId); stage.focus();
      // Keep the canvas alive during pointer capture; only its artwork is replaced.
      const inspector = this.element.querySelector(".tsru-alt-inspector"), layers = this.element.querySelector(".tsru-alt-layers");
      const template = document.createElement("div"); template.innerHTML = designerMarkup(this);
      inspector.innerHTML = template.querySelector(".tsru-alt-inspector").innerHTML;
      layers.innerHTML = template.querySelector(".tsru-alt-layers").innerHTML;
      this.paint();
    }
    pointerMove(event) {
      if (!this.drag || event.pointerId !== this.drag.pointerId) return;
      const c = this.component(), d = this.drag;
      if (d.kind === "scale") c.scale = clamp(d.original.scale * Math.hypot(event.clientX - d.centerX,event.clientY - d.centerY) / d.distance,5,200);
      else if (d.kind === "rotate") c.rotation = clamp(d.original.rotation + (Math.atan2(event.clientY - d.centerY,event.clientX - d.centerX) - d.angle) * 180 / Math.PI,-360,360);
      else { c.x = clamp(d.original.x + (event.clientX - d.startX) / d.rect.width * 100,0,100); c.y = clamp(d.original.y + (event.clientY - d.startY) / d.rect.height * 100,0,100); }
      for (const key of ["x","y","scale","rotation"]) c[key] = Math.round(c[key] * 10) / 10;
      this.changed(); this.paint(); this.syncInspector();
    }
    async save() {
      if (this.saving || !game.user.isGM) return;
      if (resolving(this.actor)) return ui.notifications.warn("Finish the current Ultimate before editing its orb.");
      const orb = normalizeAlternateOrb(this.draft);
      if (alternateUltimateEnabled(this.actor) && (!orb.components.length || orb.components.some(c => !c.image))) return ui.notifications.warn("Add an active image for every component before saving an alternate orb.");
      this.saving = true;
      try {
        // Layout and live counters are separate flags: saving a draft preserves GM progress.
        await this.actor.setFlag(MODULE_ID, "alternateOrb", orb);
        this.draft = orb; this.dirty = false;
        this.element.querySelector("[data-alt-save-status]").textContent = "Design saved";
        ui.notifications.info(`${this.actor.name}'s Ultimate orb design saved.`);
      } catch (error) { this.reportError(error); }
      finally { this.saving = false; }
    }
    reportError(error) { console.error(`${MODULE_ID} | Alternate orb`, error); ui.notifications.error(`Ultimate orb: ${error.message}`); }
    async close(options = {}) {
      if (this.dirty) {
        const discard = await foundry.applications.api.DialogV2.confirm({window: {title: "Unsaved orb design"}, content: "<p>Discard your unsaved orb design changes?</p>", modal: true});
        if (!discard) return this;
      }
      return super.close(options);
    }
    _onClose(options) { designers.delete(this.actor.uuid); return super._onClose(options); }
  }
  const app = new AlternateOrbDesigner(); designers.set(actor.uuid, app); app.render({force: true}); return app;
}
