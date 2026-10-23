import {MODULE_ID as ID, multitypeMode, isTypeChanger, isMultitypeAttacks, resolveAttackElement, storedAttackContext, attackSource, attackElementPatch, collectionValues} from "./multitype-rules.mjs";
import {actorSheetControls, actorHeaderButton} from "./actor-sheet-controls.mjs";
import {midiWorkflow,midiDamageRolls} from "./midi-compat.mjs";
export {midiWorkflow,midiDamageRolls} from "./midi-compat.mjs";
export {multitypeMode, isTypeChanger, isMultitypeAttacks, resolveAttackElement} from "./multitype-rules.mjs";
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let services = {
  getConfig: actor => actor?.getFlag?.(ID, "ultimate") ?? {},
  getElements: () => globalThis.game?.settings?.get(ID, "elements") ?? []
};
let installed = false;
const workflows = new WeakMap(), rollConfigs = new WeakMap(), roots = new Set(), saveQueues = new Map();
const uniqueId = () => globalThis.foundry?.utils?.randomID?.() ?? globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random();
const dom = html => html?.jquery ? html[0] : html;
const notify = (kind, text) => globalThis.ui?.notifications?.[kind]?.(text);
const elements = () => services.getElements();
const config = actor => services.getConfig(actor);
const flags = (document, key) => document?.getFlag?.(ID, key) ?? document?.flags?.[ID]?.[key];

export function actorFromMessage(message) {
  try { const associated = message?.getAssociatedActor?.(); if (associated) return associated; } catch (_) {}
  const speaker = message?.speaker ?? {};
  const scene = globalThis.game?.scenes?.get?.(speaker.scene);
  const token = scene?.tokens?.get?.(speaker.token)
    ?? ((!speaker.scene || speaker.scene === globalThis.canvas?.scene?.id) ? globalThis.canvas?.tokens?.get?.(speaker.token) : null);
  return token?.actor ?? token?.document?.actor ?? globalThis.game?.actors?.get?.(speaker.actor) ?? null;
}

export function actorsForControls() {
  const entries = [...collectionValues(globalThis.game?.actors),
    ...(globalThis.canvas?.tokens?.placeables ?? []).map(token => token.actor),
    ...collectionValues(globalThis.game?.combat?.combatants).map(combatant => combatant.actor)];
  return [...new Map(entries.filter(actor => actor?.uuid).map(actor => [actor.uuid, actor])).values()]
    .sort((a, b) => String(a.name).localeCompare(String(b.name)) || a.uuid.localeCompare(b.uuid));
}

export function elementChangeRows() {
  return actorsForControls().filter(actor => isTypeChanger(config(actor))).map(actor => ({
    uuid: actor.uuid, name: actor.name, image: actor.img,
    sourceLabel: actor.isToken || actor.token ? "Scene token" : actor.type === "npc" ? "NPC" : actor.type === "character" ? "PC" : "Actor",
    elements: elementChoices(config(actor).elementId)
  }));
}

function elementChoices(selected) {
  return [{id:"", name:"— None —", selected:!selected}, ...elements().map(element => ({...element, selected:element.id === selected}))];
}

function workflowFor(source, actor) {
  return midiWorkflow(source,actor);
}

export function attackContext(actor, source = {}) {
  const saved = storedAttackContext(source);
  if (saved) return resolveAttackElement(actor, source, {config:config(actor), elements:elements()});
  const workflow = workflowFor(source, actor);
  if (workflow) {
    let snapshot = workflows.get(workflow);
    if (!snapshot) {
      snapshot = {...resolveAttackElement(actor, {item:workflow.item, activity:workflow.activity}, {config:config(actor), elements:elements()}),
        eventId:"attack:" + uniqueId(), workflowId:String(workflow.uuid ?? workflow.id ?? workflow.itemCardId ?? "")};
      workflows.set(workflow, snapshot);
    }
    // Damage rolls can also travel through standard hooks. Their shared event ID
    // joins those notifications without suppressing a later identical attack.
    if (workflow.itemCardId) { snapshot = {...snapshot, eventId:"midi:" + workflow.itemCardId}; workflows.set(workflow,snapshot); }
    const rolled = storedAttackContext({rolls:workflow.damageRolls ?? [workflow.damageRoll]});
    return rolled?.actorUuid === actor?.uuid ? {...snapshot, eventId:rolled.eventId || snapshot.eventId} : {...snapshot};
  }
  return resolveAttackElement(actor, source, {config:config(actor), elements:elements()});
}

export function stampDamageRolls(actor, rolls, source = {}) {
  const list = Array.isArray(rolls) ? rolls : [rolls];
  const existing = storedAttackContext({rolls:list});
  const snapshot = existing?.actorUuid === actor?.uuid ? attackContext(actor, {attackElement:existing})
    : {...attackContext(actor, source), eventId:"damage:" + uniqueId()};
  for (const roll of list) if (roll && typeof roll === "object") {
    roll.options ??= {};
    roll.options[ID] = {...roll.options[ID], attackElement:{...snapshot}};
  }
  return snapshot;
}

function beforeDamageRoll(rollConfig, _dialog, message = {}) {
  const subject = rollConfig?.subject;
  const actor = subject?.actor ?? subject?.item?.actor ?? (subject?.parent?.documentName === "Actor" ? subject.parent : null);
  if (!actor) return;
  const snapshot = {...attackContext(actor, {subject}), eventId:"damage:" + uniqueId()};
  rollConfigs.set(rollConfig, snapshot);
  message.data ??= {}; message.data.flags ??= {};
  message.data.flags[ID] = {...message.data.flags[ID], attackElement:snapshot};
}

function afterDamageConfiguration(rolls, rollConfig, _dialog, message = {}) {
  const snapshot = rollConfigs.get(rollConfig);
  if (!snapshot) return;
  for (const roll of rolls ?? []) { roll.options ??= {}; roll.options[ID] = {...roll.options[ID], attackElement:{...snapshot}}; }
  message.data ??= {}; message.data.flags ??= {};
  message.data.flags[ID] = {...message.data.flags[ID], attackElement:{...snapshot}};
}

function captureMessage(document, data) {
  const source = {...data, speaker:data.speaker ?? document.speaker,
    flags:data.flags ?? document.flags, rolls:document.rolls ?? data.rolls, system:data.system ?? document.system};
  const actor = actorFromMessage(source);
  if (!actor || !source.rolls?.length) return;
  const snapshot = attackContext(actor, source);
  snapshot.eventId ||= "chat:" + (document.id || uniqueId());
  document.updateSource({[`flags.${ID}.attackElement`]:snapshot});
}

export function messageTargets(message) {
  const dnd = message?.flags?.dnd5e ?? {};
  const descriptors = [message?.system?.targets, dnd.targets, dnd.use?.targets, dnd.activity?.targets, message?.flags?.[ID]?.targets]
    .filter(Boolean).flatMap(collectionValues);
  const result = new Map();
  const add = target => { if (target) { const actor = target.actor ?? target.document?.actor ?? target; if (actor?.uuid) result.set(target.uuid ?? target.document?.uuid ?? actor.uuid, target); } };
  for (const entry of descriptors) {
    const uuid = typeof entry === "string" ? entry : entry?.tokenUuid ?? entry?.uuid ?? entry?.actorUuid;
    let target;
    if (uuid && globalThis.fromUuidSync) { try { target = fromUuidSync(uuid, {strict:false}); } catch (_) {} }
    const tokenId = entry?.tokenId ?? uuid?.match(/Token\.([^.]+)/)?.[1];
    if (!target && tokenId) {
      const sceneId = entry?.sceneId ?? uuid?.match(/Scene\.([^.]+)/)?.[1];
      target = globalThis.game?.scenes?.get?.(sceneId)?.tokens?.get?.(tokenId)
        ?? ((!sceneId || sceneId === globalThis.canvas?.scene?.id) ? globalThis.canvas?.tokens?.get?.(tokenId) : null);
    }
    if (!target) target = globalThis.game?.actors?.get?.(entry?.actorId ?? uuid?.match(/(?:^|\.)Actor\.([^.]+)/)?.[1]);
    add(target);
  }
  if (!result.size) {
    const user = globalThis.game?.users?.get?.(message?.user?.id ?? message?.user);
    for (const target of user?.targets ?? []) add(target);
  }
  return [...result.values()];
}

async function resolveActor(value) {
  if (value?.documentName === "Actor" || value?.getFlag && value?.uuid) return value;
  try { const doc = await globalThis.fromUuid?.(value); if (doc) return doc.actor ?? doc; } catch (_) {}
  return actorsForControls().find(actor => actor.uuid === value) ?? null;
}

async function enqueueSave(actor, write) {
  const prior = saveQueues.get(actor.uuid) ?? Promise.resolve();
  const next = prior.catch(() => {}).then(write);
  saveQueues.set(actor.uuid, next);
  try { return await next; } finally { if (saveQueues.get(actor.uuid) === next) saveQueues.delete(actor.uuid); }
}

export async function changeElement(value, elementId, {requireChanger = true} = {}) {
  const actor = await resolveActor(value);
  if (!globalThis.game?.user?.isGM) throw new Error("Only a GM can change an Actor’s Element.");
  if (!actor) throw new Error("This Actor is no longer available.");
  if (requireChanger && !isTypeChanger(config(actor))) throw new Error("Enable Multitype? and select Type Changer for this Actor first.");
  if (elementId && !elements().some(element => element.id === elementId)) throw new Error("Choose an existing Element from the Element Manager.");
  await enqueueSave(actor, () => actor.update({[`flags.${ID}.ultimate.elementId`]:String(elementId ?? "")}, {render:false}));
  syncActorControls(actor);
  return config(actor).elementId;
}

export async function renderSettings(actor, {includeElement = false} = {}) {
  return renderTemplate(`modules/${ID}/templates/multitype-settings.hbs`, {
    actor, config:config(actor), changer:multitypeMode(config(actor)) === "changer", includeElement,
    controlId:"tsru-element-" + String(actor.uuid).replace(/[^a-zA-Z0-9_-]/g, "-"), elements:elementChoices(config(actor).elementId)
  });
}

function syncRoot(actor, root) {
  const settings = config(actor), enabled = Boolean(settings.multitypeEnabled), changer = multitypeMode(settings) === "changer";
  root.querySelectorAll('[name="multitypeEnabled"]').forEach(input => { input.checked = enabled; });
  root.querySelectorAll('[name="multitypeMode"]').forEach(input => { input.checked = changer; });
  root.querySelectorAll("[data-multitype-fields]").forEach(node => { node.hidden = !enabled; });
  root.querySelectorAll("[data-multitype-mode-panel]").forEach(node => { node.hidden = node.dataset.multitypeModePanel !== (changer ? "changer" : "attacks"); });
  root.querySelectorAll('[name="elementId"],[data-element-change]').forEach(input => { input.value = settings.elementId || ""; });
  root.querySelectorAll("[data-multitype-mode-label]").forEach(node => { node.classList.toggle("active", node.dataset.multitypeModeLabel === (changer ? "changer" : "attacks")); });
  root.querySelectorAll('[data-multitype-settings-status]').forEach(node => { node.textContent = enabled ? (changer ? "Type Changer is active." : "Independent attack Elements are active.") : "Using this Actor’s Assigned Element."; });
}

export function syncActorControls(actor) {
  for (const record of roots) {
    if (!record.root.isConnected) { roots.delete(record); continue; }
    if (record.actor.uuid === actor.uuid) syncRoot(actor, record.root);
  }
  for (const input of globalThis.document?.querySelectorAll?.("[data-element-change]") ?? []) if (input.dataset.elementChange === actor.uuid) input.value = config(actor).elementId || "";
}

export function bindElementChanges(root) {
  if (!root) return;
  for (const input of root.querySelectorAll("[data-element-change]")) {
    if (input.dataset.elementChangeBound) continue;
    input.dataset.elementChangeBound = "true"; input.disabled = !globalThis.game?.user?.isGM;
    input.addEventListener("change", async event => {
      event.stopPropagation(); const previous = (await resolveActor(input.dataset.elementChange))?.getFlag(ID, "ultimate")?.elementId || "";
      input.disabled = true;
      try { const elementId = await changeElement(input.dataset.elementChange, input.value); notify("info", "Element changed to " + (elements().find(element => element.id === elementId)?.name ?? "None") + ". Future attacks use this Element."); }
      catch (error) { input.value = previous; notify("error", error.message); }
      finally { input.disabled = !globalThis.game?.user?.isGM; }
    });
  }
  for (const button of root.querySelectorAll("[data-multitype-attacks]")) {
    if (button.dataset.multitypeAttackBound) continue; button.dataset.multitypeAttackBound = "true";
    button.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); openAttackElements(button.dataset.multitypeAttacks); });
  }
}

export function bindSettings(actor, root) {
  if (!root || root.dataset.multitypeSettingsBound) return;
  root.dataset.multitypeSettingsBound = "true"; roots.add({actor, root});
  bindElementChanges(root);
  const status = root.querySelector("[data-multitype-status]");
  for (const input of root.querySelectorAll('[name="multitypeEnabled"],[name="multitypeMode"],[name="elementId"]')) {
    input.disabled = !globalThis.game?.user?.isGM;
    input.addEventListener("change", async event => {
      if (!globalThis.game?.user?.isGM) { syncRoot(actor, root); return; }
      const name = input.name;
      const value = name === "multitypeMode" ? (input.checked ? "changer" : "attacks") : name === "multitypeEnabled" ? input.checked : input.value;
      input.disabled = true;
      try {
        if (name === "elementId") await changeElement(actor, value, {requireChanger:false});
        else await enqueueSave(actor, () => actor.update({[`flags.${ID}.ultimate.${name}`]:value}, {render:false}));
        syncRoot(actor, root);
        if (status) status.textContent = "Saved. " + (config(actor).multitypeEnabled ? (isTypeChanger(config(actor)) ? "Type Changer is active." : "Independent attack Elements are active.") : "Using the Actor’s Assigned Element.");
      } catch (error) { syncRoot(actor, root); if (status) status.textContent = error.message; notify("error", "Could not save Element settings: " + error.message); }
      finally { input.disabled = !globalThis.game?.user?.isGM; }
    });
  }
  syncRoot(actor, root);
}

export async function openSettings(value) {
  const actor = await resolveActor(value);
  if (!actor || !globalThis.game?.user?.isGM) return notify("warn", "Only a GM can configure Actor Element settings.");
  const content = await renderSettings(actor, {includeElement:true});
  return new Dialog({
    title:actor.name + " — HSR Elements",
    content, buttons:{close:{label:"Close"}},
    render:html => bindSettings(actor, dom(html))
  }, {width:620, height:"auto", resizable:true, classes:["tsru-multitype-window"]}).render(true);
}

function itemRows(actor, onlyItem = null) {
  return collectionValues(actor.items).filter(item => !onlyItem || item.uuid === onlyItem.uuid)
    .sort((a,b) => String(a.name).localeCompare(String(b.name)))
    .map(item => ({uuid:item.uuid, name:item.name, elements:elements().map(element => ({...element,selected:element.id === flags(item,"attackElementId")})),
      activities:collectionValues(item.system?.activities).map(activity => ({id:activity.id, name:activity.name || item.name, type:activity.type || "Item", elements:elements().map(element => ({...element,selected:element.id === (flags(item,"activityElements") ?? {})[activity.id]}))}))}));
}

export async function openAttackElements(value, onlyItem = null) {
  const actor = await resolveActor(value);
  if (!actor || (!globalThis.game?.user?.isGM && !actor.isOwner)) return notify("warn", "You must own this Actor to assign attack Elements.");
  const content = await renderTemplate(`modules/${ID}/templates/multitype-attacks.hbs`, {
    actor, active:isMultitypeAttacks(config(actor)), actorElementName:elements().find(element => element.id === config(actor).elementId)?.name ?? "None",
    items:itemRows(actor, onlyItem)
  });
  return new Dialog({title:actor.name + " — Attack Elements",content,buttons:{close:{label:"Close"}},render:html => bindAttackElements(actor, dom(html))},
    {width:680,height:640,resizable:true,classes:["tsru-multitype-window"]}).render(true);
}

export function bindAttackElements(actor, root) {
  if (!root || root.dataset.multitypeAttackEditorBound) return;
  root.dataset.multitypeAttackEditorBound = "true";
  const status = root.querySelector("[data-multitype-attack-status]");
  for (const input of root.querySelectorAll("[data-attack-element-item]")) input.addEventListener("change", async () => {
    const item = collectionValues(actor.items).find(item => item.uuid === input.dataset.attackElementItem);
    const activityId = input.dataset.attackElementActivity || "";
    const previous = activityId ? (flags(item,"activityElements") ?? {})[activityId] || "" : flags(item,"attackElementId") || "";
    input.disabled = true;
    try {
      if (!item || (!globalThis.game?.user?.isGM && !actor.isOwner)) throw new Error("You no longer own this Actor or Item.");
      await item.update(attackElementPatch(item, activityId, input.value, elements()));
      if (status) status.textContent = "Saved " + (activityId ? "activity" : "Item") + " Element. The Actor’s Assigned Element is unchanged.";
    } catch (error) { input.value = previous; if (status) status.textContent = error.message; notify("error", "Could not assign attack Element: " + error.message); }
    finally { input.disabled = false; }
  });
  root.querySelector("[data-multitype-attack-search]")?.addEventListener("input", event => {
    const query = event.currentTarget.value.toLocaleLowerCase().split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const row of root.querySelectorAll("[data-multitype-item]")) {
      const names = [...row.querySelectorAll("h4,.tsru-multitype-attack-row>span")].map(node => node.textContent).join(" ").toLocaleLowerCase();
      row.hidden = !query.every(term => names.includes(term)); if (!row.hidden) visible++;
    }
    const empty = root.querySelector("[data-multitype-attack-empty]"); if (empty) empty.hidden = visible > 0;
  });
}

export function renderSheetControls(app, html) {
  const root = dom(app?.element) ?? dom(html);
  if (!root?.querySelector) return;
  const document = app.document ?? app.object ?? app.actor;
  if (!["Actor","Item"].includes(document?.documentName)) return;
  const actor = document?.documentName === "Actor" ? document : document?.actor;
  if (!actor) return;
  const isItem = document?.documentName === "Item";
  const canConfigure = !isItem ? globalThis.game?.user?.isGM : (globalThis.game?.user?.isGM || actor.isOwner);
  if (canConfigure) {
    if (!isItem) {
      const group = actorSheetControls(app, html);
      if (group) {
        const button = actorHeaderButton(group,{key:"multitype",label:"Configure Multitype and Elements",icon:"fas fa-shuffle",order:20,className:"tsru-open-multitype tsru-multitype-launcher",onClick:()=>openSettings(actor)});
        button.dataset.multitypeOpen = actor.uuid;
      }
    } else {
    const header = root.querySelector(".window-header") ?? root.closest(".application,.window-app")?.querySelector(".window-header");
    const marker = isItem ? "data-multitype-item-open" : "data-multitype-open";
    if (header && !header.querySelector("[" + marker + "]")) {
      const button = globalThis.document.createElement("button"); button.type = "button"; button.className = "header-control icon tsru-multitype-launcher";
      button.setAttribute(marker,actor.uuid); button.setAttribute("aria-label",isItem ? "HSR Attack Elements" : "HSR Element Settings");
      button.title = isItem ? "Assign HSR Elements to this Item and its activities. Saves immediately; affects Toughness when Multitype attacks is active." : "Configure Multitype?, Type Changer and the current HSR Element for this Actor, including NPCs and summons.";
      button.innerHTML = '<i class="fas fa-shuffle"></i>';
      button.addEventListener("click",event => {event.preventDefault();event.stopPropagation();isItem ? openAttackElements(actor,document) : openSettings(actor);});
      (header.querySelector(".window-controls") ?? header).prepend(button);
    }
    }
  }
  if (isItem) return;
  const combat = root.querySelector('.tab[data-tab="combat"],[data-application-part="combat"]');
  if (!combat || combat.querySelector("[data-multitype-combat]")) return;
  const settings = config(actor), changer = isTypeChanger(settings), attackMode = isMultitypeAttacks(settings);
  if (!globalThis.game?.user?.isGM && !settings.multitypeEnabled) return;
  const panel = globalThis.document.createElement("section"); panel.className = "tsru-multitype-combat"; panel.dataset.multitypeCombat = actor.uuid;
  panel.innerHTML = '<h3>Element Change</h3><p>Current HSR Element: <strong>' + esc(elements().find(element => element.id === settings.elementId)?.name ?? "None") + '</strong></p>'
    + (changer && globalThis.game?.user?.isGM ? '<label>Change Element now<select data-element-change="' + esc(actor.uuid) + '">' + elementChoices(settings.elementId).map(element => '<option value="' + esc(element.id) + '"' + (element.selected ? ' selected' : '') + '>' + esc(element.name) + '</option>').join("") + '</select></label>' : '')
    + (attackMode && (globalThis.game?.user?.isGM || actor.isOwner) ? '<button type="button" data-multitype-attacks="' + esc(actor.uuid) + '">Assign attack Elements</button>' : '')
    + (globalThis.game?.user?.isGM ? '<button type="button" data-multitype-open="' + esc(actor.uuid) + '">Configure Multitype?</button>' : '');
  panel.querySelector("[data-multitype-open]")?.addEventListener("click",() => openSettings(actor));
  bindElementChanges(panel); combat.prepend(panel);
}

export function installMultitype(api = {}) {
  services = {...services, ...api};
  if (installed) return; installed = true;
  Hooks.on("dnd5e.preRollDamageV2", beforeDamageRoll);
  Hooks.on("dnd5e.postDamageRollConfiguration", afterDamageConfiguration);
  Hooks.on("preCreateChatMessage", captureMessage);
  for (const hook of ["midi-qol.preItemRoll","midi-qol.preAttackRoll","midi-qol.preDamageRoll"]) Hooks.on(hook, source => { const workflow=midiWorkflow(source);if(workflow?.actor)attackContext(workflow.actor,workflow); });
  for (const hook of ["renderActorSheet","renderCharacterActorSheet","renderItemSheet","renderApplicationV2"]) Hooks.on(hook, renderSheetControls);
  Hooks.on("updateActor", actor => {
    syncActorControls(actor);
    for (const app of Object.values(actor.apps ?? {})) {
      const root = dom(app.element); root?.querySelectorAll?.("[data-multitype-combat]").forEach(node => node.remove());
      renderSheetControls(app, root);
    }
  });
}
