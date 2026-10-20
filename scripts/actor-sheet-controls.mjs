import {npcAllegiance} from "./npc-rules.mjs";
const ID = "telys-star-rail-ultimates";
const dom = value => value?.jquery || Array.isArray(value) ? value[0] : value;

// An Item or Activity sheet may expose .actor. Its document still decides which
// sheet it is; never attach Actor configuration to a spell or usage dialog.
export function sheetActor(app) {
  const document = app?.document ?? app?.object ?? app?.actor;
  return document?.documentName === "Actor" ? document : null;
}

export function actorSheetControls(app, html) {
  const actor = sheetActor(app);
  if (!actor) return null;
  const roots = [dom(app?.element), dom(html)].filter(root => root?.querySelector);
  const header = roots.map(root => root.matches?.(".window-header") ? root : root.querySelector(".window-header") ?? root.closest?.(".application,.window-app")?.querySelector(".window-header")).find(Boolean);
  if (!header) return null;
  let group = header.querySelector("[data-tsru-actor-controls]");
  if (group && group.dataset.actorUuid !== actor.uuid) { group.remove(); group = null; }
  if (!group) {
    group = globalThis.document.createElement("nav");
    group.className = "tsru-actor-config-controls";
    group.dataset.tsruActorControls = "true"; group.dataset.actorUuid = actor.uuid;
    group.setAttribute("aria-label", "Star Rail Actor configuration");
    const controls = header.querySelector(".window-controls");
    const close = header.querySelector('[data-action="close"],button.close,a.close');
    if (controls) controls.prepend(group);
    else if (close) close.before(group);
    else header.append(group);
  }
  return group;
}

export function orderActorControls(group) {
  for (const child of [...group.children].sort((a,b) => Number(a.dataset.actorControlOrder ?? 99) - Number(b.dataset.actorControlOrder ?? 99))) group.append(child);
}

export function actorHeaderButton(group, {key, label, icon, order, onClick, className = ""}) {
  let button = [...group.querySelectorAll("[data-actor-control]")].find(node => node.dataset.actorControl === key);
  if (!button) {
    button = globalThis.document.createElement("button"); button.type = "button";
    button.className = "header-control icon tsru-actor-header-control " + className;
    button.dataset.actorControl = key;
    const image = globalThis.document.createElement("i"); image.className = icon; image.setAttribute("aria-hidden", "true"); button.append(image);
    button.addEventListener("click", event => {event.preventDefault();event.stopPropagation();onClick(event);});
    group.append(button);
  }
  button.dataset.actorControlOrder = String(order); button.title = label; button.setAttribute("aria-label",label);
  orderActorControls(group);
  return button;
}

const explanation = "GM only. ON selects Ally: hide this NPC’s Toughness bar and weaknesses, stop Toughness processing, and use a blue initiative frame. OFF selects Enemy: enable Toughness and use a red frame. Current/maximum Toughness and weakness choices are retained. Applies to this Actor, including a summoned or unlinked token Actor.";
export function allegianceSwitch(actor, {compact = false} = {}) {
  const label = globalThis.document.createElement("label"); label.className = "tsru-npc-allegiance" + (compact ? " is-compact" : "");
  label.dataset.actorControlOrder = "30";
  const enemy = globalThis.document.createElement("span"); enemy.dataset.npcChoice = "enemy"; enemy.textContent = "Enemy";
  const input = globalThis.document.createElement("input"); input.type = "checkbox"; input.setAttribute("role","switch"); input.dataset.npcAllegiance = actor.uuid;
  input.setAttribute("aria-label","NPC is an Ally"); input.title = explanation; input.setAttribute("aria-description",explanation);
  const ally = globalThis.document.createElement("span"); ally.dataset.npcChoice = "ally"; ally.textContent = "Ally";
  label.append(enemy,input,ally);
  return label;
}

export function syncAllegianceControls(actor, root = globalThis.document) {
  const allied = npcAllegiance(actor) === "ally";
  for (const input of root?.querySelectorAll?.("[data-npc-allegiance]") ?? []) {
    if (input.dataset.npcAllegiance !== actor.uuid) continue;
    input.checked = allied; input.disabled = !globalThis.game?.user?.isGM;
    for (const text of input.closest(".tsru-npc-allegiance")?.querySelectorAll("[data-npc-choice]") ?? []) text.classList.toggle("active", text.dataset.npcChoice === (allied ? "ally" : "enemy"));
  }
}

export async function setNpcAllegiance(actor, role) {
  if (!globalThis.game?.user?.isGM) throw new Error("Only a GM can change NPC Ally/Enemy mode.");
  if (actor?.documentName !== "Actor" || actor.type !== "npc" || !["ally","enemy"].includes(role)) throw new Error("Choose Ally or Enemy for an NPC Actor.");
  await actor.update({[`flags.${ID}.allegiance`]:role, [`flags.${ID}.toughness.enabled`]:role === "enemy"}, {render:false});
  syncAllegianceControls(actor);
  return role;
}

export function bindAllegianceControls(actor, root) {
  for (const input of root?.querySelectorAll?.("[data-npc-allegiance]") ?? []) {
    if (input.dataset.npcAllegianceBound || input.dataset.npcAllegiance !== actor.uuid) continue;
    input.dataset.npcAllegianceBound = "true";
    input.addEventListener("change", async event => {
      event.stopPropagation(); input.disabled = true;
      try { await setNpcAllegiance(actor, input.checked ? "ally" : "enemy"); }
      catch (error) { globalThis.ui?.notifications?.error?.("Could not change NPC allegiance: " + error.message); }
      finally { syncAllegianceControls(actor); }
    });
  }
  syncAllegianceControls(actor, root);
}

let installed = false;
export function installActorControls() {
  if (installed) return; installed = true;
  Hooks.on("updateActor", actor => syncAllegianceControls(actor));
}
