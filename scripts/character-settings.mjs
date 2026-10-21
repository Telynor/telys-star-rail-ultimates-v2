const menus = [
  ["character", "Character", "Element, Path and party membership"],
  ["ultimates", "Ultimates", "Energy, alternate counters and Ultimate effects"],
  ["abilities", "Abilities", "Skill, Talent, Technique and Elation"],
  ["enhanced", "Enhanced Form", "Enhanced abilities, token transitions and Ultimate"],
  ["artwork", "Artwork", "Portraits, splash art, orb images and cropping"],
  ["combat", "Combat", "Break, Toughness and boss phases"]
];
const memories = new Map();
const aliases = [
  ["alternate", "alt", "alternative", "custom", "segment", "quarter", "seal", "glyph"],
  ["ultimate", "ult", "burst", "super", "finisher"],
  ["art", "artwork", "image", "picture", "graphic", "illustration", "visual", "photo"],
  ["portrait", "profile", "avatar", "headshot"],
  ["enhanced", "enhance", "stance", "form", "transformation", "transform", "powered"],
  ["energy", "battery", "mana", "recharge", "ep", "mp"],
  ["regen", "regeneration", "recovery", "regain"],
  ["counter", "count", "charge", "progress", "stack", "stacks"],
  ["circular", "circle", "sequence", "order", "clockwise", "rotation"],
  ["crop", "position", "offset", "align", "placement", "move", "drag"],
  ["scale", "zoom", "size", "resize", "bigger", "smaller"],
  ["flip", "invert", "mirror", "horizontal"],
  ["glow", "shine", "light", "illuminate", "halo", "lit"],
  ["token", "miniature", "mini", "skin"],
  ["splash", "cinematic", "cutscene", "animation", "gif", "video"],
  ["hud", "lineup", "overlay", "panel", "display"],
  ["party", "team", "roster", "membership", "member"],
  ["initiative", "turn", "tracker", "carousel"],
  ["script", "code", "javascript", "macro", "automation"],
  ["text", "description", "chat", "message", "wording"],
  ["toughness", "weakness", "break", "stagger"],
  ["boss", "phase", "stage", "encounter"],
  ["spell", "magic", "compendium", "spellbook", "known", "casting"],
  ["summon", "summons", "summoning", "creature", "pet", "minion", "familiar", "spawn"],
  ["hp", "health", "life", "blood", "sacrifice"],
  ["radius", "range", "distance", "zone"],
  ["cost", "price", "payment", "spend"],
  ["skill", "sp"], ["talent", "tp"], ["technique", "tech"],
  ["multitype", "multi", "dual", "hybrid", "changer", "change", "swap", "switch"],
  ["element", "elemental", "damage", "type"], ["path", "class"],
  ["font", "typeface", "typography", "lettering"]
];
export const searchWords = text => String(text ?? "").replace(/([a-z])([A-Z])/g, "$1 $2").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[a-z0-9]+/g) ?? [];
function near(a, b) {
  if (a === b || b.startsWith(a)) return true;
  if (a.length < 4 || Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    const different = [...a].flatMap((c, i) => c !== b[i] ? [i] : []);
    return different.length === 1 || (different.length === 2 && different[1] === different[0] + 1 && a[different[0]] === b[different[1]] && a[different[1]] === b[different[0]]);
  }
  const shorter = a.length < b.length ? a : b, longer = a.length < b.length ? b : a;
  for (let i = 0; i < longer.length; i++) if (longer.slice(0, i) + longer.slice(i + 1) === shorter) return true;
  return false;
}
export function matchesSetting(query, text) {
  const words = searchWords(text);
  return searchWords(query).every(term => {
    const group = aliases.find(list => list.some(alias => term === alias));
    return words.some(word => near(term, word)) || Boolean(group?.some(alias => words.includes(alias)));
  });
}

export function organizeCharacterSettings(root, {key = "character"} = {}) {
  const panel = root?.querySelector(".tsru-config-panel");
  if (!panel || panel.classList.contains("tsru-settings-shell")) return;
  panel.classList.add("tsru-settings-shell");
  const state = memories.get(key) ?? {menu: "character", query: "", scope: "all"};
  memories.set(key, state);
  const sections = [...panel.querySelectorAll(":scope > .tsru-config-section")];
  const title = section => section?.querySelector(":scope > h3")?.textContent.trim() ?? "";
  const find = prefix => sections.find(section => title(section).startsWith(prefix));
  const make = (label, menu) => {
    const node = document.createElement("section"); node.className = "tsru-config-section";
    const heading = document.createElement("h3"); heading.textContent = label; node.append(heading);
    node.dataset.settingsPage = menu; sections.push(node); return node;
  };
  const moveField = (from, name, to) => {
    const node = from?.querySelector(`[name="${name}"]`)?.closest(".tsru-field");
    if (node) to.append(node);
  };
  const party = find("Party Membership"), energy = find("Energy");
  if (party && energy) moveField(party, "lockEnergyAfterUltimate", energy);
  if (party) {
    const portraits = make("Combat HUD & initiative portraits", "artwork"), messenger = make("Messenger portrait", "artwork");
    for (const child of [...party.children]) {
      if (child.tagName === "H3" || child.querySelector('[name="mainParty"], [name="trialCharacter"]')) continue;
      const names = [...child.querySelectorAll("[name]")].map(el => el.name).join(" ");
      (names.includes("messaging") || child.hasAttribute("data-messaging-portrait-preview") ? messenger : portraits).append(child);
    }
    party.querySelector("h3").textContent = "Party membership"; party.dataset.settingsPage = "character";
  }
  const ultimate = find("Ultimate & Splash");
  if (ultimate) {
    const effects = make("Ultimate description & automation", "ultimates");
    for (const name of ["ultimateText", "ultimateScript"]) moveField(ultimate, name, effects);
    const mode = ultimate.querySelector('[name="ultimateScriptMode"]'); if (mode) effects.append(mode);
    ultimate.querySelector("h3").textContent = "Ultimate splash artwork"; ultimate.dataset.settingsPage = "artwork";
  }
  const enhanced = find("Enhanced Stance");
  if (enhanced) {
    const mode = make("Enhanced form", "enhanced");
    moveField(enhanced, "enhancedStanceEnabled", mode);
    const ultimate = make("Enhanced Ultimate", "enhanced"), abilities = make("Enhanced Skill & Talent", "enhanced"), art = make("Enhanced portraits", "enhanced");
    moveField(enhanced, "enhancedUltimateEnabled", ultimate);
    const wrapper = enhanced.querySelector(".tsru-enhanced-ultimate-fields"); if (wrapper) ultimate.append(wrapper);
    for (const child of [...enhanced.children]) {
      if (child.tagName === "H3") continue;
      const names = [...child.querySelectorAll("[name]")].map(el => el.name).join(" ");
      if (/enhanced(?:Skill|Talent)/.test(names)) abilities.append(child);
      else if (/enhanced(?:Hud|Carousel)/.test(names) || /open-enhanced-(?:hud|initiative)-editor/.test(child.dataset.action ?? "")) art.append(child);
    }
    enhanced.querySelector("h3").textContent = "Token artwork & transitions"; enhanced.dataset.settingsPage = "enhanced";
    enhanced.dataset.settingsDefaultCollapsed = "true";
  }
  for (const section of sections) {
    if (section.dataset.settingsPage) continue;
    const label = title(section);
    section.dataset.settingsPage = /Element|Party/.test(label) ? "character" : /Energy|Alternate Ultimate/.test(label) ? "ultimates" : /Floating/.test(label) ? "artwork" : /Break|Boss/.test(label) ? "combat" : "abilities";
  }
  for (const [action, section] of [["reset-energy", find("Manual Energy")], ["fill-energy", find("Manual Energy")], ["show-orb", find("Floating")], ["show-skill-button", find("Skill")]]) {
    const button = panel.querySelector(`[data-action="${action}"]`);
    if (button && section) section.append(button);
  }
  const toolbar = document.createElement("div"); toolbar.className = "tsru-settings-toolbar";
  toolbar.innerHTML = '<label class="tsru-settings-search"><span>Find a setting</span><input type="search" data-settings-search placeholder="Try alt ult, art, token skin or charge…" aria-label="Search character settings"></label><div class="tsru-settings-search-options"><select data-settings-scope aria-label="Search scope"><option value="all">All menus</option><option value="page">This menu</option></select><button type="button" data-settings-clear>Clear</button><button type="button" data-settings-expand>Expand sections</button></div><p data-settings-status role="status" aria-live="polite"></p>';
  const navigation = document.createElement("nav"); navigation.className = "tsru-settings-menus"; navigation.setAttribute("aria-label", "Character settings menus");
  const pages = new Map();
  for (const [id, label, description] of menus) {
    const button = document.createElement("button"); button.type = "button"; button.dataset.settingsMenu = id; button.textContent = label; navigation.append(button);
    const page = document.createElement("div"); page.className = "tsru-settings-page"; page.dataset.settingsMenuPage = id;
    const heading = document.createElement("p"); heading.className = "tsru-settings-page-heading"; heading.textContent = description; page.append(heading);
    const items = sections.filter(section => section.dataset.settingsPage === id);
    if (id === "enhanced") {
      const order = ["Enhanced form", "Enhanced Ultimate", "Enhanced Skill & Talent", "Enhanced portraits", "Token artwork & transitions"];
      items.sort((a, b) => order.indexOf(title(a)) - order.indexOf(title(b)));
    }
    for (const section of items) page.append(section);
    pages.set(id, page);
  }
  panel.querySelector(".tsru-config-heading")?.after(toolbar);
  toolbar.after(navigation); for (const page of pages.values()) navigation.parentElement.insertBefore(page, panel.querySelector(".tsru-sheet-actions"));
  const records = [];
  for (const section of sections) {
    const collect = parent => {
      for (const node of parent.children) {
        if (node.tagName === "H3" || node.matches('input[type="hidden"]')) continue;
        if (node.matches(".tsru-enhanced-ultimate-fields,[data-settings-group]")) { collect(node); continue; }
        const copy = node.cloneNode(true); copy.querySelectorAll("input,textarea,select").forEach(el => el.remove());
        const names = [...node.querySelectorAll("[name]")].map(el => el.name).join(" ");
        const image = /Image|Portrait|Icon|Font|splash|transition|ultimateButton|carousel/i.test(names) || node.querySelector(".file-picker,[data-action*='designer'],[data-action*='editor']") || /builder|preview/.test([...node.attributes].map(a => a.name).join(" "));
        const keywords = [title(section), names, copy.textContent, node.dataset.settingKeywords, node.closest("[data-setting-keywords]")?.dataset.settingKeywords, image ? "art artwork image picture visual" : ""].join(" ");
        records.push({node, section, page:section.dataset.settingsPage, keywords, hidden:node.hidden});
      }
    };
    collect(section);
  }
  const search = toolbar.querySelector("[data-settings-search]"), scope = toolbar.querySelector("select");
  search.value = state.query; scope.value = state.scope;
  const apply = () => {
    state.query = search.value; state.scope = scope.value;
    const searching = searchWords(state.query).length > 0, global = searching && state.scope === "all";
    panel.classList.toggle("is-searching", searching);
    panel.querySelectorAll("[data-tsru-search-reveal]").forEach(node => node.removeAttribute("data-tsru-search-reveal"));
    const matching = new Set(), counts = new Map(); let count = 0;
    for (const record of records) {
      const match = !searching || matchesSetting(state.query, record.keywords);
      record.node.classList.toggle("tsru-setting-filtered", !match);
      if (!match) continue;
      matching.add(record.section); counts.set(record.page, (counts.get(record.page) ?? 0) + 1);
      if (global || record.page === state.menu) count++;
      if (searching) for (let node = record.node; node && node !== record.section; node = node.parentElement) if (node.hidden) node.dataset.tsruSearchReveal = "true";
    }
    for (const section of sections) section.hidden = searching && !matching.has(section);
    for (const [id, page] of pages) page.hidden = global ? !counts.has(id) : id !== state.menu || (searching && !counts.has(id));
    for (const button of navigation.children) {
      const id = button.dataset.settingsMenu;
      button.hidden = global && !counts.has(id); button.setAttribute("aria-pressed", String(id === state.menu));
    }
    toolbar.querySelector("[data-settings-status]").textContent = searching ? `${count} matching settings · ${global ? "all menus" : menus.find(m => m[0] === state.menu)[1]}${count ? "" : " · Try fewer keywords or another name."}` : "Search labels, related terms and shorthand. Multiple keywords narrow the results.";
  };
  search.addEventListener("input", apply); scope.addEventListener("change", apply);
  navigation.addEventListener("click", event => { const button = event.target.closest("[data-settings-menu]"); if (!button) return; state.menu = button.dataset.settingsMenu; if (searchWords(search.value).length) scope.value = "page"; apply(); });
  toolbar.querySelector("[data-settings-clear]").addEventListener("click", () => { search.value = ""; apply(); search.focus(); });
  search.addEventListener("keydown", event => { if (event.key === "Escape") { event.preventDefault(); search.value = ""; apply(); } });
  toolbar.querySelector("[data-settings-expand]").addEventListener("click", () => root.querySelector('[data-action="reveal-all-config"]')?.click());
  apply();
}
