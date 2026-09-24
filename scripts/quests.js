const MODULE_ID = "telys-star-rail-ultimates";
const SOCKET = `module.${MODULE_ID}`;

const DEFAULT_TYPES = [
  {id: "trailblaze", name: "Trailblaze Mission", enabled: true, order: 10, icon: "icons/svg/book.svg", background: ""},
  {id: "companion", name: "Companion Mission", enabled: true, order: 20, icon: "icons/svg/angel.svg", background: ""},
  {id: "adventure", name: "Adventure Mission", enabled: true, order: 30, icon: "icons/svg/compass.svg", background: ""},
  {id: "daily", name: "Daily Mission", enabled: true, order: 40, icon: "icons/svg/clockwork.svg", background: ""}
];

const DEFAULT_RARITIES = [
  {id: "common", name: "Common", order: 10, color: "#748092", background: ""},
  {id: "rare", name: "Rare", order: 20, color: "#4f80cf", background: ""},
  {id: "epic", name: "Epic", order: 30, color: "#9b62d7", background: ""},
  {id: "legendary", name: "Legendary", order: 40, color: "#dba640", background: ""}
];

const DEFAULT_HUB_BUTTONS = [
  ["party","Main Character","fas fa-user-check",68,18],["quests","Missions","fas fa-clipboard-list",80,18],["abilities","Abilities","fas fa-circle-nodes",68,38],
  ["crafting","Synthesize","fas fa-flask",80,38],["eidolon-effects","Eidolons","fas fa-gem",68,58],["characters","Characters","fas fa-users",80,58],
  ["gm","GM Panel","fas fa-sliders",68,78],["quest-manager","Mission Manager","fas fa-list-check",80,78],["configure-hub","Configure Phone","fas fa-mobile-screen",92,78],["contacts-config","Configure Contacts","fas fa-address-book",92,58]
].map(([action,label,icon,x,y])=>({action,label,icon,x,y,width:10,height:16}));
const HUB_BUTTON_ACTIONS = [
  ["quests","Mission Log"],["party","Main Character Selector"],["abilities","Ability Bubbles"],["crafting","Party Crafting"],["eidolon-effects","Eidolon Effects"],
  ["check-kit","Check Kit"],["inventory","Main Character Inventory"],["messenger","HSR Messenger"],["sheet","Character Sheet Tab or Element"],
  ["orbs","Combat Party HUD"],["hud-designer","Combat HUD Designer"],["aha-config","Aha Instant Configuration"],["aha-toggle","Aha Instant Orb"],["skill-config","Skill Point Configuration"],
  ["elements","Element Manager"],["paths","Path Manager"],["eidolons","Eidolon Configuration"],["light-cone-generator","Light Cone Generator"],["quest-settings","Mission Settings"],
  ["characters","Main Character Selector (GM)"],["gm","GM Panel"],["quest-manager","Mission Manager"],["contacts-config","Configure Contacts"],["configure-hub","Phone Hub Designer"]
].map(([value,label])=>({value,label}));
const GM_ONLY_HUB_ACTIONS = new Set(["gm","quest-manager","contacts-config","configure-hub","characters","quest-settings","elements","paths","eidolons","light-cone-generator","aha-config","skill-config","hud-designer"]);
const DEFAULT_HUB_CONFIG = {
  wallpaper:"",wallpaperFit:"cover",wallpaperX:50,wallpaperY:50,wallpaperScale:100,
  snap:true,gridSize:4,poseByActor:{},phoneByActor:{},buttons:DEFAULT_HUB_BUTTONS
};

function hubConfig(actor=null,profileKey=""){
  const saved=clone(game.settings.get(MODULE_ID,"hsrHubConfig")??{});
  const merged=foundry.utils.mergeObject(clone(DEFAULT_HUB_CONFIG),saved,{inplace:false,insertKeys:true,overwrite:true});
  merged.buttons=(Array.isArray(saved.buttons)&&saved.buttons.length?saved.buttons:DEFAULT_HUB_BUTTONS).map((button,index)=>({...DEFAULT_HUB_BUTTONS[index%DEFAULT_HUB_BUTTONS.length],...button}));
  const actorConfig=saved.phoneByActor?.[profileKey||actor?.id]??null;
  if(actorConfig){
    for(const key of ["wallpaper","wallpaperFit","wallpaperX","wallpaperY","wallpaperScale"]) if(actorConfig[key]!==undefined) merged[key]=actorConfig[key];
    if(Array.isArray(actorConfig.buttons)&&actorConfig.buttons.length) merged.buttons=actorConfig.buttons.map((button,index)=>({...DEFAULT_HUB_BUTTONS[index%DEFAULT_HUB_BUTTONS.length],...button}));
  }
  if(profileKey==="__gm__"&&!merged.buttons.some(button=>button.action==="contacts-config"))merged.buttons.push({...DEFAULT_HUB_BUTTONS.find(button=>button.action==="contacts-config")});
  return merged;
}

function hubPose(actor,config=hubConfig(),profileKey=""){
  const stored=config.poseByActor?.[profileKey||actor?.id]??{};
  return {image:String(stored.image||actor?.img||"icons/svg/mystery-man.svg"),x:Number(stored.x??50),y:Number(stored.y??50),scale:Number(stored.scale??100),flip:Boolean(stored.flip)};
}

function actorOwnerName(actor){const owners=game.users.filter(user=>!user.isGM&&actor?.testUserPermission(user,"OWNER")).map(user=>user.name);return owners.join(", ")||"No player owner";}

async function openHubActorSheet(actor,target=""){
  if(!actor)return ui.notifications.warn("Select a main character first.");
  const requested=String(target||"").trim();
  actor.sheet.render(true,requested?{tab:requested}:{});
  if(!requested)return;
  const selectorLike=/^[.#\[]/.test(requested),aliases={inventory:["inventory","items","equipment"],features:["features","classes","class features"],spells:["spells","spellbook"],effects:["effects","active effects"],biography:["biography","details","description"]}[requested.toLowerCase()]??[requested];
  const normalize=value=>String(value??"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  let root=null,node=null;
  for(let attempt=0;attempt<40;attempt++){
    root=actor.sheet.element?.[0]??actor.sheet.element;
    if(root?.isConnected){
      if(selectorLike)try{node=root.querySelector?.(requested);}catch{}
      if(!node){
        const controls=[...(root?.querySelectorAll?.("[data-tab],[data-section],[data-target],[role='tab'],nav button,nav a,.tabs button,.tabs a,button[data-action],a[data-action]")??[])];
        const values=control=>[control.dataset?.tab,control.dataset?.section,control.dataset?.target,control.getAttribute?.("aria-label"),control.getAttribute?.("title"),control.getAttribute?.("data-tooltip"),control.getAttribute?.("data-tooltip-text")];
        node=controls.find(control=>aliases.some(alias=>values(control).some(value=>normalize(value)===normalize(alias))));
        node??=controls.find(control=>aliases.some(alias=>{const needle=normalize(alias);return [control.textContent,...values(control)].some(value=>normalize(value).split(" ").includes(needle)||normalize(value).startsWith(`${needle} `));}));
      }
      if(node)break;
    }
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  if(node){node.scrollIntoView({behavior:"smooth",block:"center"});node.click?.();return;}
  const tabGroups=actor.sheet.tabGroups??{};
  if(typeof actor.sheet.changeTab==="function")for(const alias of aliases)for(const group of [...Object.keys(tabGroups),"primary","sheet"]){try{await actor.sheet.changeTab(alias,group);return;}catch{}}
  ui.notifications.warn(`Could not find sheet tab or element “${requested}” on ${actor.name}.`);
}

async function showHubKit(actor){
  if(!actor)return ui.notifications.warn("Select a main character first.");
  const config=actor.getFlag(MODULE_ID,"ultimate")??{};
  const entries=[
    ["Ultimate","fas fa-burst",config.ultimateText,config.enabled!==false],
    ["Talent","fas fa-star",config.talentText,Boolean(config.talentText)||Number(config.talentPointsMax)>0],
    ["Skill","fas fa-hand-sparkles",config.skillText,config.skillEnabled!==false],
    ["Technique","fas fa-bolt",config.techniqueText,Boolean(config.techniqueEnabled)||Boolean(config.techniqueText)]
  ].filter(([_label,_icon,text,enabled])=>enabled&&String(text||"").trim());
  const sections=[];
  for(const [label,icon,text] of entries)sections.push(`<article><h3><i class="${icon}"></i> ${label}</h3><div>${await TextEditor.enrichHTML(String(text),{async:true,secrets:actor.isOwner,relativeTo:actor})}</div></article>`);
  new Dialog({title:`${actor.name} — Check Kit`,content:`<section class="tsru-kit-browser"><header><img src="${esc(actor.img)}"><h2>${esc(actor.name)}</h2></header>${sections.join("")||"<p><em>No Skill, Talent, Technique, or Ultimate descriptions are configured.</em></p>"}</section>`,buttons:{close:{label:"Close"}}},{width:620,height:"auto",resizable:true}).render(true);
}

const clone = value => foundry.utils.deepClone(value);
const esc = value => {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
};
const api = () => game.modules.get(MODULE_ID)?.api;
const requireApiMethod = name => {
  const method=api()?.[name];
  if(typeof method!=="function") throw new Error(`Star Rail API method ${name} is unavailable. Reload Foundry after updating the module.`);
  return method;
};
const types = () => clone(game.settings.get(MODULE_ID, "questTypes") ?? DEFAULT_TYPES).sort((a, b) => Number(a.order) - Number(b.order));
const rarities = () => clone(game.settings.get(MODULE_ID, "questRarities") ?? DEFAULT_RARITIES).sort((a, b) => Number(a.order) - Number(b.order));
const quests = () => clone(game.settings.get(MODULE_ID, "quests") ?? []);
const ownedCharacterIds = () => new Set(game.actors.filter(a => a.type === "character" && a.isOwner).map(a => a.id));
const visibleQuest = quest => game.user.isGM || (quest.actorIds ?? []).some(id => ownedCharacterIds().has(id));

function normalizeQuest(quest = {}) {
  const firstType = types().find(t => t.enabled)?.id ?? types()[0]?.id ?? "";
  return {
    id: quest.id || foundry.utils.randomID(),
    background: String(quest.background || ""),
    title: String(quest.title || "New Mission"), typeId: String(quest.typeId || firstType),
    location: String(quest.location || ""), description: String(quest.description || ""),
    status: ["active", "complete"].includes(quest.status) ? quest.status : "active",
    isNew: quest.isNew !== false, stageIndex: Math.max(0, Number(quest.stageIndex) || 0),
    actorIds: Array.isArray(quest.actorIds) ? quest.actorIds : [],
    rewardMode: quest.rewardMode === "copy" ? "copy" : "split",
    rewardsClaimed: Boolean(quest.rewardsClaimed),
    stages: (Array.isArray(quest.stages) && quest.stages.length ? quest.stages : [{id: foundry.utils.randomID(), title: "Stage 1", objectives: []}]).map(stage => ({
      id: stage.id || foundry.utils.randomID(), title: String(stage.title || "Stage"),
      objectives: (stage.objectives ?? []).map(objective => ({id: objective.id || foundry.utils.randomID(), text: String(objective.text || "Objective"), hidden: Boolean(objective.hidden), revealed: Boolean(objective.revealed), complete: Boolean(objective.complete)}))
    })),
    rewards: (quest.rewards ?? []).map(reward => ({uuid: String(reward.uuid || ""), name: String(reward.name || "Reward"), img: String(reward.img || "icons/svg/item-bag.svg"), quantity: Math.max(1, Number(reward.quantity) || 1), rarityId: String(reward.rarityId || rarities()[0]?.id || "")}))
  };
}

async function saveQuests(next, {notify = true, quest = null} = {}) {
  await game.settings.set(MODULE_ID, "quests", next.map(normalizeQuest));
  game.socket.emit(SOCKET, {type: "questsChanged", sourceUserId: game.user.id, questId: quest?.id, notify, title: quest?.title});
  refreshQuestWindows();
}

function refreshQuestWindows() {
  for (const app of Object.values(ui.windows ?? {})) if (["tsru-quest-log", "tsru-quest-manager", "tsru-hub"].includes(app.options?.id)) app.render(false);
}

function questActors() {
  return game.actors.filter(a => a.type === "character");
}

const actorUltimate = actor => actor?.getFlag(MODULE_ID, "ultimate") ?? {};
const nonGmOwners = actor => game.users.filter(user => !user.isGM && actor?.testUserPermission(user, "OWNER"));
const selectedPartyCharacters = () => game.settings.get(MODULE_ID, "partySelections") ?? {};
const partyAuthority = () => game.users.activeGM ?? game.users.find(user => user.active && user.isGM);

async function applyPartySelection(userId, actorId) {
  if (!game.user.isGM || partyAuthority()?.id !== game.user.id) return false;
  const user=game.users.get(userId), selected=game.actors.get(actorId);
  if (!user || user.isGM || !selected || selected.type !== "character" || !selected.testUserPermission(user, "OWNER")) return false;
  const selections=foundry.utils.deepClone(selectedPartyCharacters());
  selections[user.id]=selected.id;
  await game.settings.set(MODULE_ID, "partySelections", selections);
  const selectedByOthers=new Set(Object.entries(selections).filter(([id])=>id!==user.id).map(([,id])=>id));
  for (const actor of game.actors.filter(entry=>entry.type==="character" && entry.testUserPermission(user,"OWNER"))) {
    const config=actorUltimate(actor);
    if (config.partyGMOverride) continue;
    const mainParty=actor.id===selected.id || selectedByOthers.has(actor.id);
    if (Boolean(config.mainParty)!==mainParty) await actor.update({[`flags.${MODULE_ID}.ultimate.mainParty`]:mainParty});
  }
  game.socket.emit(SOCKET,{type:"partySelectionChanged",userId:user.id,actorId:selected.id});
  return true;
}

class PartyCharacterSelector extends FormApplication {
  static get defaultOptions() { return foundry.utils.mergeObject(super.defaultOptions,{id:"tsru-party-selector",title:"Select Main Character",template:`modules/${MODULE_ID}/templates/party-selector.hbs`,width:480,height:"auto",closeOnSubmit:false}); }
  getData() {
    const selectedId=selectedPartyCharacters()[game.user.id] ?? "";
    return {characters:game.actors.filter(actor=>actor.type==="character" && actor.isOwner).map(actor=>({id:actor.id,name:actor.name,img:actor.img,selected:actor.id===selectedId,locked:Boolean(actorUltimate(actor).partyGMOverride)})),selectedId,gm:game.user.isGM};
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-select-party-character]").on("click",event=>this.select(event.currentTarget.dataset.selectPartyCharacter));
  }
  async select(actorId) {
    if (game.user.isGM) return ui.notifications.warn("This selector is for non-GM players. Use the GM Panel for GM-controlled characters.");
    const actor=game.actors.get(actorId);
    if (!actor?.isOwner) return ui.notifications.error("You do not own that character.");
    if (actorUltimate(actor).partyGMOverride) return ui.notifications.warn("The GM has locked this character's party status.");
    const gm=partyAuthority();
    if (!gm) return ui.notifications.error("An active GM is required to change your main character.");
    await api()?.setLocalMainCharacter?.(actorId);
    game.socket.emit(SOCKET,{type:"selectPartyCharacter",userId:game.user.id,actorId,sourceUserId:game.user.id});
    ui.notifications.info(`Requested ${actor.name} as your main character.`);
  }
  async _updateObject() {}
}

function seenQuestIds() { return new Set(game.settings.get(MODULE_ID, "questSeen") ?? []); }
async function markQuestSeen(id) {
  if (!id) return;
  const seen = seenQuestIds();
  if (seen.has(id)) return;
  seen.add(id);
  await game.settings.set(MODULE_ID, "questSeen", [...seen]);
}

async function rewardData(reward) {
  const doc = reward.uuid ? await fromUuid(reward.uuid).catch(() => null) : null;
  return {doc, data: doc?.toObject?.() ?? null};
}

async function grantReward(actor, reward, quantity) {
  if (!actor || quantity < 1) return;
  const {doc, data} = await rewardData(reward);
  if (!doc || !data) throw new Error(`Reward item “${reward.name}” can no longer be found.`);
  const existing = actor.items.find(item => item.name === doc.name && item.type === doc.type);
  const quantityPath = foundry.utils.hasProperty(data, "system.quantity") ? "system.quantity" : null;
  if (existing && quantityPath) {
    const current = Number(foundry.utils.getProperty(existing, quantityPath)) || 0;
    await existing.update({[quantityPath]: current + quantity});
  } else {
    delete data._id;
    if (quantityPath) foundry.utils.setProperty(data, quantityPath, quantity);
    await actor.createEmbeddedDocuments("Item", [data]);
  }
}

async function distributeRewards(questId) {
  if (!game.user.isGM) return;
  const all = quests();
  const quest = all.find(q => q.id === questId);
  if (!quest || quest.rewardsClaimed) return ui.notifications.warn("These rewards have already been distributed.");
  const recipients = [...new Set(quest.actorIds ?? [])].map(id=>game.actors.get(id)).filter(actor => {
    if (actor?.type !== "character") return false;
    return nonGmOwners(actor).length > 0 || Boolean(actorUltimate(actor).receivesRewards);
  });
  if (!recipients.length) return ui.notifications.warn("No selected quest recipients are eligible. Select characters on the mission; GMPCs also need Receives Rewards enabled.");
  for (const reward of quest.rewards ?? []) {
    const total = Math.max(1, Number(reward.quantity) || 1);
    if (quest.rewardMode === "copy") {
      for (const actor of recipients) await grantReward(actor, reward, total);
    } else {
      const base = Math.floor(total / recipients.length);
      let remainder = total % recipients.length;
      const shuffled = [...recipients];
      for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
      for (const actor of recipients) {
        const extra = remainder > 0 && shuffled.slice(0, remainder).includes(actor) ? 1 : 0;
        if (base + extra > 0) await grantReward(actor, reward, base + extra);
      }
    }
  }
  quest.rewardsClaimed = true;
  await saveQuests(all, {notify: false});
  ui.notifications.info(`Rewards for ${quest.title} distributed.`);
}

class HSRHub extends FormApplication {
  static get defaultOptions() { return foundry.utils.mergeObject(super.defaultOptions, {id:"tsru-hub",title:"HSR Hub",template:`modules/${MODULE_ID}/templates/hsr-hub.hbs`,width:window.innerWidth,height:window.innerHeight,resizable:false}); }
  getData() {
    const actors=game.actors.filter(actor=>actor.type==="character").sort((a,b)=>actorOwnerName(a).localeCompare(actorOwnerName(b))||a.name.localeCompare(b.name));
    const actor=game.user.isGM?(this.viewActorId?game.actors.get(this.viewActorId):null):api()?.getSelectedMainCharacter?.(),profileKey=game.user.isGM?(actor?.id||"__gm__"):actor?.id,config=hubConfig(actor,profileKey),pose=hubPose(actor,config,profileKey);
    const gmOnly=GM_ONLY_HUB_ACTIONS,playerOnly=new Set(["party"]),gmPanel=game.user.isGM&&!actor;
    const visibleButton=button=>game.user.isGM?(gmPanel?!playerOnly.has(button.action):!gmOnly.has(button.action)):!gmOnly.has(button.action);
    const buttons=config.buttons.filter(visibleButton).map(button=>({...button,id:button.id||button.action,gmOnly:gmOnly.has(button.action),style:`left:${button.x}%;top:${button.y}vh;width:${button.width}%;height:${button.height}vh`}));
    const contentHeight=Math.max(100,...buttons.map(button=>Number(button.y||0)+Number(button.height||16)));
    return {gm:game.user.isGM,player:!game.user.isGM,gmPanel,actor,pose,config,contentHeight,phoneChoices:[{id:"",name:"DM PANEL",selected:!actor},...actors.map(entry=>({id:entry.id,name:`${entry.name} — ${actorOwnerName(entry)}`,selected:entry.id===actor?.id}))],buttons};
  }
  activateListeners(html) {
    super.activateListeners(html);
    this.element.appendTo(document.body).addClass("tsru-phone-hub-window");
    html.find("[data-action='close-phone-hub']").on("click",()=>this.close());
    html.find("[data-gm-phone-view]").on("change",event=>{this.viewActorId=String(event.currentTarget.value||"");this.render(false);});
    html.find("[data-action='configure-viewed-phone']").on("click",()=>{const app=new HSRHubConfig();app.actorId=this.viewActorId||"__gm__";app.render(true);});
    html.find("[data-hub-action]").on("click", async event => {
      const action = event.currentTarget.dataset.hubAction;
      const mainActor=game.user.isGM&&this.viewActorId?game.actors.get(this.viewActorId):api()?.getSelectedMainCharacter?.();
      const buttonId=String(event.currentTarget.dataset.hubButtonId||action);
      const buttonConfig=hubConfig(mainActor).buttons.find(button=>String(button.id||button.action)===buttonId)??{};
      const actions = {
        quests: ["Mission Log", openQuestLog],
        party: ["Main Character", () => new PartyCharacterSelector().render(true)],
        orbs: ["Combat Party HUD", async () => {
          const count = await api()?.showUltimateUI?.();
          if (count) ui.notifications.info("Combat party HUD shown.");
        }],
        "hud-designer": ["Combat HUD Designer", () => api()?.openCombatHudDesigner?.()],
        abilities: ["Ability Bubbles", () => requireApiMethod("showAllAbilityBubbles")()],
        crafting: ["Party Crafting", () => api()?.openCrafting?.()],
        "check-kit": ["Check Kit", () => showHubKit(mainActor)],
        inventory: ["Inventory", () => openHubActorSheet(mainActor,"inventory")],
        messenger: ["HSR Messenger", () => new HSRMessenger().render(true)],
        sheet: ["Character Sheet", () => openHubActorSheet(mainActor,buttonConfig.target)],
        "eidolon-effects": ["Eidolon Effects", () => api()?.openEidolonEffectsBrowser?.()],
        characters: ["Main Character", () => new PartyCharacterSelector().render(true)],
        gm: ["Star Rail GM Panel", () => api()?.openGMPanel?.()],
        "aha-config": ["Aha Instant Configuration", () => api()?.openAhaConfig?.()],
        "aha-toggle": ["Aha Instant Orb", async () => {
          const shown = await api()?.toggleAhaOrb?.();
          ui.notifications.info(`Aha Instant orb ${shown ? "shown" : "hidden"}.`);
        }],
        "skill-config": ["Skill Point Configuration", () => api()?.openSkillPointConfig?.()],
        elements: ["Element Manager", () => api()?.openElementManager?.()],
        paths: ["Path Manager", () => api()?.openPathManager?.()],
        eidolons: ["Eidolon Configuration", () => api()?.openEidolonConfig?.()],
        "light-cone-generator": ["Light Cone Generator", () => api()?.openLightConeGenerator?.()],
        "quest-manager": ["Mission Manager", () => new QuestManager().render(true)],
        "contacts-config": ["Configure Contacts", () => new HSRContactConfig().render(true)],
        "quest-settings": ["Mission Settings", () => new QuestSettings().render(true)],
        "configure-hub": ["Phone Hub Designer", () => {const app=new HSRHubConfig();app.actorId=this.viewActorId||"__gm__";app.render(true);}]
      };
      const [label, callback] = actions[action] ?? [];
      if (callback) await runUiAction(label, callback);
    });
  }
  async _updateObject() {}
}

class HSRHubConfig extends FormApplication {
  static get defaultOptions(){return foundry.utils.mergeObject(super.defaultOptions,{id:"tsru-hub-config",title:"HSR Phone Hub Designer",template:`modules/${MODULE_ID}/templates/hsr-hub-config.hbs`,width:1000,height:820,resizable:true,closeOnSubmit:true});}
  getData(){const actors=game.actors.filter(actor=>actor.type==="character").sort((a,b)=>String(a.name).localeCompare(String(b.name))),dmPanel=this.actorId==="__gm__"||(!this.actorId&&game.user.isGM),actor=dmPanel?null:(actors.find(entry=>entry.id===this.actorId)||api()?.getSelectedMainCharacter?.()||actors[0]);this.actorId=dmPanel?"__gm__":(actor?.id||"__gm__");const config={...hubConfig(actor,this.actorId),...(this.configDraft??{})},pose={...hubPose(actor,config,this.actorId),...(this.poseDraft??{})};if(!this.buttonsDraft)this.buttonsDraft=clone(config.buttons);const buttons=this.buttonsDraft.map((button,index)=>({...button,id:button.id||foundry.utils.randomID(),index,gmOnly:GM_ONLY_HUB_ACTIONS.has(button.action),actionOptions:HUB_BUTTON_ACTIONS.map(option=>({...option,selected:option.value===button.action})),sheetAction:button.action==="sheet",style:`left:${button.x}%;top:${button.y}%;width:${button.width}%;height:${button.height}%`}));this.buttonsDraft=buttons.map(({actionOptions,sheetAction,style,index,gmOnly,...button})=>button);return {config,dmPanel,profileName:dmPanel?"DM PANEL":actor?.name,actors:[{id:"__gm__",name:"DM PANEL",ownerLabel:"Game Master",selected:dmPanel},...actors.map(entry=>({id:entry.id,name:entry.name,ownerLabel:actorOwnerName(entry),selected:entry.id===this.actorId}))],actor,pose,buttons};}
  captureButtons(html){const form=html?.is?.("form")?html[0]:html?.find?.("form.tsru-hub-config-form")?.[0];if(!form)return;const expanded=foundry.utils.expandObject(Object.fromEntries(new FormData(form).entries()));this.configDraft={wallpaper:String(expanded.wallpaper||""),wallpaperFit:String(expanded.wallpaperFit||"cover"),wallpaperX:Number(expanded.wallpaperX)||50,wallpaperY:Number(expanded.wallpaperY)||50,wallpaperScale:Number(expanded.wallpaperScale)||100,snap:Boolean(expanded.snap),gridSize:Number(expanded.gridSize)||4};this.poseDraft={image:String(expanded.poseImage||""),x:Number(expanded.poseX)||50,y:Number(expanded.poseY)||50,scale:Number(expanded.poseScale)||100,flip:Boolean(expanded.poseFlip)};const current=Object.values(expanded.buttons??{});this.buttonsDraft=current.map((button,index)=>({...this.buttonsDraft[index],id:String(button.id||this.buttonsDraft[index]?.id||foundry.utils.randomID()),label:String(button.label||"New Button"),icon:String(button.icon||"fas fa-star"),action:String(button.action||"sheet"),target:String(button.target||""),x:Number(button.x)||0,y:Number(button.y)||0,width:Math.max(4,Number(button.width)||10),height:Math.max(6,Number(button.height)||16)}));}
  activateListeners(html){
    super.activateListeners(html);activatePickers(html);
    html.find('[name="actorId"]').on("change",event=>{this.actorId=String(event.currentTarget.value);this.buttonsDraft=null;this.configDraft=null;this.poseDraft=null;this.render(false);});
    html.find("[data-add-hub-button]").on("click",()=>{this.captureButtons(html);this.buttonsDraft.push({id:foundry.utils.randomID(),label:"New Button",icon:"fas fa-star",action:"sheet",target:"features",x:68,y:78,width:10,height:16});this.render(false);});
    html.find("[data-add-hub-preset]").on("click",event=>{this.captureButtons(html);const action=String(event.currentTarget.dataset.addHubPreset),presets={"check-kit":["Check Kit","fas fa-book-open"],inventory:["Inventory","fas fa-box-open"],messenger:["Messages","fas fa-comments"]},[label,icon]=presets[action]??["New Button","fas fa-star"],count=this.buttonsDraft.length;this.buttonsDraft.push({id:foundry.utils.randomID(),label,icon,action,target:"",x:68+(count%3)*11,y:78-Math.floor(count%6/3)*18,width:10,height:16});this.render(false);});
    html.find("[data-save-player-standard]").on("click",async()=>{this.captureButtons(html);const stored=clone(game.settings.get(MODULE_ID,"hsrHubConfig")??{});stored.standardPlayerButtons=clone(this.buttonsDraft);await game.settings.set(MODULE_ID,"hsrHubConfig",stored);ui.notifications.info("Saved this button format as the standard player phone layout.");});
    html.find("[data-load-player-standard]").on("click",()=>{this.captureButtons(html);const standard=game.settings.get(MODULE_ID,"hsrHubConfig")?.standardPlayerButtons;if(!Array.isArray(standard)||!standard.length)return ui.notifications.warn("No standard player phone layout has been saved yet.");this.buttonsDraft=clone(standard);this.render(false);});
    html.find("[data-apply-player-standard]").on("click",async()=>{const stored=clone(game.settings.get(MODULE_ID,"hsrHubConfig")??{}),standard=stored.standardPlayerButtons;if(!Array.isArray(standard)||!standard.length)return ui.notifications.warn("Save a standard player phone layout first.");const playerActors=game.actors.filter(actor=>actor.type==="character"&&game.users.some(user=>!user.isGM&&actor.testUserPermission(user,"OWNER")));if(!playerActors.length)return ui.notifications.warn("No player-owned characters were found.");const confirmed=await Dialog.confirm({title:"Apply Standard Player Phone",content:`<p>Replace the button format and layout for <strong>${playerActors.length}</strong> player-owned characters? Their wallpapers and phone-pose artwork will be preserved.</p>`});if(!confirmed)return;stored.phoneByActor??={};for(const actor of playerActors)stored.phoneByActor[actor.id]={...(stored.phoneByActor[actor.id]??{}),buttons:clone(standard)};await game.settings.set(MODULE_ID,"hsrHubConfig",stored);refreshQuestWindows();ui.notifications.info(`Applied the standard phone layout to ${playerActors.length} player characters.`);});
    html.find("[data-remove-hub-button]").on("click",event=>{this.captureButtons(html);this.buttonsDraft.splice(Number(event.currentTarget.dataset.removeHubButton),1);this.render(false);});
    html.find("[data-hub-button-action]").on("change",event=>{const row=event.currentTarget.closest("[data-hub-button-editor]"),index=[...row.parentElement.children].indexOf(row),gmOnly=GM_ONLY_HUB_ACTIONS.has(event.currentTarget.value);row?.classList.toggle("is-sheet-action",event.currentTarget.value==="sheet");row?.classList.toggle("is-gm-only",gmOnly);html.find(`[data-hub-button-index="${index}"]`).toggleClass("is-gm-only",gmOnly);});
    html.find('[name$=".label"],[name$=".icon"]').on("input",event=>{const match=event.currentTarget.name.match(/^buttons\.(\d+)\.(label|icon)$/);if(!match)return;const button=html.find(`[data-hub-button-index="${match[1]}"]`);if(match[2]==="label")button.find("span").text(event.currentTarget.value);else button.find("i").attr("class",event.currentTarget.value);});
    html.find("[data-toggle-hub-snap]").on("click",event=>{const input=html.find('[name="snap"]'),enabled=!input.prop("checked");input.prop("checked",enabled);event.currentTarget.innerHTML=`<i class="fas fa-magnet"></i> ${enabled?"Disable Snapping":"Enable Snapping"}`;});
    const preview=html.find("[data-hub-designer-preview]"),canvas=html.find("[data-hub-designer-canvas]");
    const baseHeight=preview.innerHeight(),extraHeight=Math.max(360,Math.round(baseHeight*.65));canvas.height(baseHeight+extraHeight);canvas.find("[data-hub-button-index]").each((_index,node)=>{const index=Number(node.dataset.hubButtonIndex),x=Number(html.find(`[name="buttons.${index}.x"]`).val())||0,y=Number(html.find(`[name="buttons.${index}.y"]`).val())||0,width=Number(html.find(`[name="buttons.${index}.width"]`).val())||10,height=Number(html.find(`[name="buttons.${index}.height"]`).val())||16;Object.assign(node.style,{left:`${x}%`,top:`${y/100*baseHeight}px`,width:`${width}%`,height:`${height/100*baseHeight}px`});});
    const snap=value=>{const enabled=html.find('[name="snap"]').prop("checked"),size=Math.max(1,Number(html.find('[name="gridSize"]').val())||4);return enabled?Math.round(value/size)*size:value;};
    html.find('[name="wallpaperFit"]').val(hubConfig(game.actors.get(this.actorId),this.actorId).wallpaperFit);
    const updateWallpaper=()=>preview.css({"--hub-wallpaper":`url('${String(html.find('[name="wallpaper"]').val()||"").replaceAll("'","%27")}')`,"--hub-wallpaper-fit":html.find('[name="wallpaperFit"]').val(),"--hub-wallpaper-x":`${html.find('[name="wallpaperX"]').val()}%`,"--hub-wallpaper-y":`${html.find('[name="wallpaperY"]').val()}%`,"--hub-wallpaper-scale":Number(html.find('[name="wallpaperScale"]').val())});
    html.find('[name="wallpaper"],[name="wallpaperFit"],[name="wallpaperX"],[name="wallpaperY"],[name="wallpaperScale"]').on("input change",updateWallpaper);
    html.find("[data-hub-button-size]").on("input change",event=>{const match=event.currentTarget.name.match(/^buttons\.(\d+)\.(width|height)$/);if(!match)return;const value=Math.max(match[2]==="width"?4:6,Math.min(100,Number(event.currentTarget.value)||10)),node=html.find(`[data-hub-button-index="${match[1]}"]`)[0];if(node)node.style[match[2]]=match[2]==="height"?`${value/100*baseHeight}px`:`${value}%`;});
    let drag=null;
    preview.on("pointerdown","[data-hub-button-index]",event=>{if(event.button!==0)return;event.preventDefault();const node=event.currentTarget,index=Number(node.dataset.hubButtonIndex),canvasRect=canvas[0].getBoundingClientRect(),buttonRect=node.getBoundingClientRect();if(event.target.closest("[data-hub-button-resize]")){drag={type:"resize",node,index,canvasRect,startX:event.clientX,startY:event.clientY,width:buttonRect.width,height:buttonRect.height};}else drag={type:"button",node,index,canvasRect,dx:event.clientX-buttonRect.left,dy:event.clientY-buttonRect.top};node.setPointerCapture?.(event.pointerId);});
    preview.on("pointerdown","[data-hub-pose-preview]",event=>{if(event.button!==0)return;event.preventDefault();const rect=preview[0].getBoundingClientRect();drag={type:"pose",node:event.currentTarget,rect,startX:event.clientX,startY:event.clientY,x:Number(html.find('[name="poseX"]').val())||50,y:Number(html.find('[name="poseY"]').val())||50};event.currentTarget.setPointerCapture?.(event.pointerId);});
    preview.on("pointermove",event=>{if(!drag)return;if(drag.type==="button"){const maxY=(canvas.height()-drag.node.getBoundingClientRect().height)/baseHeight*100,x=snap((event.clientX-drag.canvasRect.left-drag.dx)/drag.canvasRect.width*100),y=snap((event.clientY-drag.canvasRect.top-drag.dy)/baseHeight*100),left=Math.max(0,Math.min(100,x)),top=Math.max(0,Math.min(maxY,y));drag.node.style.left=`${left}%`;drag.node.style.top=`${top/100*baseHeight}px`;html.find(`[name="buttons.${drag.index}.x"]`).val(left);html.find(`[name="buttons.${drag.index}.y"]`).val(top);}else if(drag.type==="resize"){const width=snap((drag.width+event.clientX-drag.startX)/drag.canvasRect.width*100),height=snap((drag.height+event.clientY-drag.startY)/baseHeight*100),safeWidth=Math.max(4,Math.min(100,width)),safeHeight=Math.max(6,Math.min(100,height));drag.node.style.width=`${safeWidth}%`;drag.node.style.height=`${safeHeight/100*baseHeight}px`;html.find(`[name="buttons.${drag.index}.width"]`).val(safeWidth);html.find(`[name="buttons.${drag.index}.height"]`).val(safeHeight);}else{const x=Math.max(-100,Math.min(200,drag.x+(event.clientX-drag.startX)/drag.rect.width*100)),y=Math.max(-100,Math.min(200,drag.y+(event.clientY-drag.startY)/drag.rect.height*100));html.find('[name="poseX"]').val(Math.round(x));html.find('[name="poseY"]').val(Math.round(y));drag.node.style.setProperty("--pose-x",`${x}%`);drag.node.style.setProperty("--pose-y",`${y}%`);}}).on("pointerup pointercancel",()=>{drag=null;});
    preview.on("wheel","[data-hub-pose-preview]",event=>{event.preventDefault();const input=html.find('[name="poseScale"]'),value=Math.max(20,Math.min(500,(Number(input.val())||100)+(event.originalEvent.deltaY<0?5:-5)));input.val(value);event.currentTarget.style.setProperty("--pose-scale",value);});
    preview.on("dragover",event=>event.preventDefault()).on("drop",event=>{event.preventDefault();let data={};try{data=JSON.parse(event.originalEvent.dataTransfer.getData("text/plain")||"{}");}catch{}const path=data.path||data.src||data.texture?.src;if(path){html.find('[name="poseImage"]').val(path).trigger("change");preview.find("[data-hub-pose-preview] img").attr("src",path);}});
    html.find('[name="poseImage"]').on("change",event=>preview.find("[data-hub-pose-preview] img").attr("src",event.currentTarget.value));
  }
  async _updateObject(_event,formData){if(!game.user.isGM)return ui.notifications.error("Only a GM can save player phone layouts.");const expanded=foundry.utils.expandObject(formData),stored=clone(game.settings.get(MODULE_ID,"hsrHubConfig")??{});stored.snap=Boolean(expanded.snap);stored.gridSize=Math.max(1,Math.min(25,Number(expanded.gridSize)||4));stored.poseByActor??={};stored.poseByActor[this.actorId]={image:String(expanded.poseImage||""),x:Number(expanded.poseX)||50,y:Number(expanded.poseY)||50,scale:Math.max(20,Math.min(500,Number(expanded.poseScale)||100)),flip:Boolean(expanded.poseFlip)};stored.phoneByActor??={};stored.phoneByActor[this.actorId]={wallpaper:String(expanded.wallpaper||""),wallpaperFit:String(expanded.wallpaperFit||"cover"),wallpaperX:Number(expanded.wallpaperX)||50,wallpaperY:Number(expanded.wallpaperY)||50,wallpaperScale:Math.max(25,Math.min(400,Number(expanded.wallpaperScale)||100)),buttons:Object.values(expanded.buttons??{}).map(button=>({id:String(button.id||foundry.utils.randomID()),label:String(button.label||"Button"),icon:String(button.icon||"fas fa-star"),action:String(button.action||"sheet"),target:String(button.target||""),x:Number(button.x)||0,y:Number(button.y)||0,width:Math.max(4,Number(button.width)||10),height:Math.max(6,Number(button.height)||16)}))};await game.settings.set(MODULE_ID,"hsrHubConfig",stored);refreshQuestWindows();const actor=game.actors.get(this.actorId),name=this.actorId==="__gm__"?"DM PANEL":actor?.name||"Character";ui.notifications.info(`${name}'s HSR Phone Hub layout saved.`);}
}

function messengerThreads(){return clone(game.settings.get(MODULE_ID,"hsrMessengerThreads")??[]);}
async function saveMessengerThreads(threads){await game.settings.set(MODULE_ID,"hsrMessengerThreads",threads);}
function messengerPortrait(actor){const config=actor?.getFlag(MODULE_ID,"ultimate")??{};return {portrait:String(config.messagingPortrait||actor?.img||"icons/svg/mystery-man.svg"),portraitX:Number(config.messagingPortraitX??50),portraitY:Number(config.messagingPortraitY??50),portraitScale:Number(config.messagingPortraitScale??100)};}
function messengerActors(){return game.actors.filter(actor=>["character","npc"].includes(actor.type)).sort((a,b)=>a.name.localeCompare(b.name));}
function messengerContactIds(){return new Set(game.settings.get(MODULE_ID,"hsrMessengerContacts")??[]);}

class HSRContactConfig extends FormApplication {
  static get defaultOptions(){return foundry.utils.mergeObject(super.defaultOptions,{id:"tsru-hsr-contact-config",title:"Configure Messenger Contacts",template:`modules/${MODULE_ID}/templates/hsr-contact-config.hbs`,width:620,height:720,resizable:true,closeOnSubmit:true});}
  getData(){const enabled=messengerContactIds(),actors=messengerActors();return {actors:actors.map(actor=>({id:actor.id,name:actor.name,img:actor.img,enabled:enabled.has(actor.id)}))};}
  activateListeners(html){super.activateListeners(html);html.find("[data-contact-jump]").on("change",event=>{const id=String(event.currentTarget.value||""),row=html.find(`[data-contact-row="${id}"]`)[0];row?.scrollIntoView({behavior:"smooth",block:"center"});row?.querySelector("input")?.focus();});html.find("[data-contact-search]").on("input",event=>{const query=String(event.currentTarget.value||"").trim().toLowerCase();html.find("[data-contact-row]").each((_index,row)=>row.hidden=Boolean(query&&!String(row.dataset.contactName||"").toLowerCase().includes(query)));});}
  async _updateObject(_event,formData){if(!game.user.isGM)return ui.notifications.error("Only a GM can configure contacts.");const expanded=foundry.utils.expandObject(formData),ids=Object.entries(expanded.contacts??{}).filter(([_id,value])=>Boolean(value)).map(([id])=>id);await game.settings.set(MODULE_ID,"hsrMessengerContacts",ids);ui.notifications.info(`Players can now message ${ids.length} configured contacts.`);}
}

class HSRMessenger extends Application {
  static get defaultOptions(){return foundry.utils.mergeObject(super.defaultOptions,{id:"tsru-hsr-messenger",title:"HSR Messenger",template:`modules/${MODULE_ID}/templates/hsr-messenger.hbs`,width:920,height:700,resizable:true});}
  getData(){
    const all=messengerThreads(),visible=(game.user.isGM?all:all.filter(thread=>(thread.participantIds??[]).includes(game.user.id))).sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0));
    if(!visible.some(thread=>thread.id===this.threadId))this.threadId=visible[0]?.id||"";
    const selected=visible.find(thread=>thread.id===this.threadId);
    const speakers=messengerActors();
    if(!speakers.some(actor=>actor.id===this.speakerActorId))this.speakerActorId=api()?.getSelectedMainCharacter?.()?.id||speakers[0]?.id||"";
    const messages=[...(selected?.messages??[])].sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0)).map(message=>{const actor=game.actors.get(message.speakerActorId),portrait=messengerPortrait(actor);return {...message,...portrait,speakerName:actor?.name||message.speakerName||"Unknown",mine:message.senderUserId===game.user.id,time:new Date(Number(message.createdAt)||Date.now()).toLocaleString()};});
    const memberNames=(selected?.memberActorIds??[]).map(id=>game.actors.get(id)?.name).filter(Boolean),fallbackNames=(selected?.participantIds??[]).map(id=>game.users.get(id)?.name).filter(Boolean);
    const selectedData=selected?{...selected,messages,participantNames:(memberNames.length?memberNames:fallbackNames).join(", ")}:null,contactIds=messengerContactIds(),contacts=speakers.filter(actor=>contactIds.has(actor.id)).map(actor=>({...messengerPortrait(actor),id:actor.id,name:actor.name,img:actor.img}));
    return {isGM:game.user.isGM,contactsView:this.view==="contacts",messagesView:this.view!=="contacts",contacts,threads:visible.map(thread=>({id:thread.id,title:thread.title,selected:thread.id===this.threadId,preview:String(thread.messages?.at(-1)?.text||"No messages").slice(0,70)})),selected:selectedData,speakers:speakers.map(actor=>({id:actor.id,name:actor.name,selected:actor.id===this.speakerActorId}))};
  }
  activateListeners(html){
    super.activateListeners(html);
    html.find("[data-thread-id]").on("click",event=>{this.threadId=String(event.currentTarget.dataset.threadId);this.view="messages";this.render(false);});
    html.find('[name="speakerActorId"]').on("change",event=>{this.speakerActorId=String(event.currentTarget.value);});
    html.find("[data-messenger-view]").on("click",event=>{this.view=String(event.currentTarget.dataset.messengerView||"messages");this.render(false);});
    html.find("[data-contact-id]").on("click",event=>this.openContact(String(event.currentTarget.dataset.contactId)));
    html.find("[data-action='configure-contacts']").on("click",()=>{if(game.user.isGM)new HSRContactConfig().render(true);});
    html.find("[data-contact-search]").on("input",event=>{const query=String(event.currentTarget.value||"").trim().toLowerCase();html.find("[data-contact-id]").each((_index,row)=>row.hidden=Boolean(query&&!String(row.dataset.contactName||"").toLowerCase().includes(query)));});
    html.find("[data-action='new-thread']").on("click",()=>game.user.isGM?this.createGroupChat():this.viewContacts());
    html.find("[data-action='send-message']").on("click",()=>this.sendMessage(html));
    html.find("[data-delete-message]").on("click",event=>this.deleteMessage(String(event.currentTarget.dataset.deleteMessage)));
    html.find('[name="messageText"]').on("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();this.sendMessage(html);}});
    html.find("[data-action='delete-thread']").on("click",()=>this.deleteThread());
    const scroller=html.find(".tsru-messenger-messages")[0];if(scroller)scroller.scrollTop=0;
  }
  viewContacts(){this.view="contacts";this.render(false);}
  async openContact(actorId){if(game.user.isGM)return;const contactIds=messengerContactIds();if(!contactIds.has(actorId))return ui.notifications.warn("That contact is not currently available.");const mainActor=api()?.getSelectedMainCharacter?.(),contact=game.actors.get(actorId);if(!mainActor||!contact)return ui.notifications.warn("Select a main character before opening a conversation.");const threads=messengerThreads();let thread=threads.find(entry=>entry.contactActorId===actorId&&(entry.memberActorIds??[]).includes(mainActor.id)&&(entry.participantIds??[]).includes(game.user.id));if(!thread){thread={id:foundry.utils.randomID(),title:contact.name,contactActorId:actorId,memberActorIds:[mainActor.id,contact.id],participantIds:[game.user.id],createdBy:game.user.id,createdAt:Date.now(),updatedAt:Date.now(),messages:[]};threads.push(thread);await saveMessengerThreads(threads);}this.threadId=thread.id;this.view="messages";this.render(false);}
  async createGroupChat(){
    if(!game.user.isGM)return this.viewContacts();const actors=messengerActors().map(actor=>({id:actor.id,name:actor.name,img:actor.img,type:actor.type})),content=await renderTemplate(`modules/${MODULE_ID}/templates/hsr-messenger-new.hbs`,{actors});
    new Dialog({title:"Make Group Chat",content,buttons:{create:{label:"Make Group Chat",icon:'<i class="fas fa-users"></i>',callback:async html=>{const root=html?.[0]??html,title=String(root.querySelector('[name="title"]')?.value||"New Group Chat").trim(),memberActorIds=[...root.querySelectorAll('[name="memberActorIds"]:checked')].map(input=>input.value);if(memberActorIds.length<2)return ui.notifications.warn("Choose at least two NPCs or player characters.");const participantIds=new Set();for(const id of memberActorIds){const actor=game.actors.get(id);for(const user of game.users)if(!user.isGM&&actor?.testUserPermission(user,"OWNER"))participantIds.add(user.id);}const threads=messengerThreads(),thread={id:foundry.utils.randomID(),title,memberActorIds,participantIds:[...participantIds],createdBy:game.user.id,createdAt:Date.now(),updatedAt:Date.now(),messages:[]};threads.push(thread);await saveMessengerThreads(threads);this.threadId=thread.id;this.view="messages";this.render(false);}},cancel:{label:"Cancel"}},default:"create",render:html=>{html.find("[data-group-search]").on("input",event=>{const query=String(event.currentTarget.value||"").trim().toLowerCase();html.find("[data-group-actor]").each((_index,row)=>row.hidden=Boolean(query&&!String(row.dataset.groupName||"").toLowerCase().includes(query)));});}}).render(true);
  }
  async sendMessage(html){
    const text=String(html.find('[name="messageText"]').val()||"").trim();if(!text||!this.threadId)return;
    const threads=messengerThreads(),thread=threads.find(entry=>entry.id===this.threadId);if(!thread)return;
    if(!game.user.isGM&&!(thread.participantIds??[]).includes(game.user.id))return ui.notifications.error("You cannot post to this text chain.");
    const actor=game.user.isGM?game.actors.get(html.find('[name="speakerActorId"]').val()):api()?.getSelectedMainCharacter?.();if(!actor)return ui.notifications.warn("Choose a main character or speaker first.");
    thread.messages??=[];thread.messages.push({id:foundry.utils.randomID(),senderUserId:game.user.id,speakerActorId:actor.id,speakerName:actor.name,text,createdAt:Date.now()});thread.updatedAt=Date.now();await saveMessengerThreads(threads);this.render(false);
  }
  async deleteMessage(messageId){if(!game.user.isGM||!this.threadId||!messageId)return;const threads=messengerThreads(),thread=threads.find(entry=>entry.id===this.threadId),message=thread?.messages?.find(entry=>entry.id===messageId);if(!thread||!message)return;const confirmed=await Dialog.confirm({title:"Delete Message",content:`<p>Delete this message from <strong>${esc(message.speakerName||"Unknown")}</strong> for everyone?</p>`});if(!confirmed)return;thread.messages=thread.messages.filter(entry=>entry.id!==messageId);thread.updatedAt=Date.now();await saveMessengerThreads(threads);this.render(false);}
  async deleteThread(){if(!game.user.isGM||!this.threadId)return;const confirmed=await Dialog.confirm({title:"Delete Text Chain",content:"<p>Permanently delete this entire text chain?</p>"});if(!confirmed)return;await saveMessengerThreads(messengerThreads().filter(thread=>thread.id!==this.threadId));this.threadId="";this.render(false);}
}

class QuestSettings extends FormApplication {
  constructor(...args) { super(...args); this._types = types(); this._rarities = rarities(); }
  static get defaultOptions() { return foundry.utils.mergeObject(super.defaultOptions, {id: "tsru-quest-settings", title: "HSR Quest Configuration", template: `modules/${MODULE_ID}/templates/quest-settings.hbs`, width: 760, height: 720, resizable: true, closeOnSubmit: false}); }
  getData() { return {types: this._types, rarities: this._rarities, allIcon: game.settings.get(MODULE_ID, "questAllIcon")}; }
  activateListeners(html) {
    super.activateListeners(html); activatePickers(html);
    html.find("[data-add-type]").on("click", () => { this.capture(html); this._types.push({id: foundry.utils.randomID(), name: "Mission Type", enabled: true, order: (this._types.length + 1) * 10, icon: "icons/svg/book.svg", background: ""}); this.render(true); });
    html.find("[data-add-rarity]").on("click", () => { this.capture(html); this._rarities.push({id: foundry.utils.randomID(), name: "Rarity", order: (this._rarities.length + 1) * 10, color: "#888888", background: ""}); this.render(true); });
    html.find("[data-remove-type]").on("click", e => { this.capture(html); this._types.splice(Number(e.currentTarget.dataset.removeType), 1); this.render(true); });
    html.find("[data-remove-rarity]").on("click", e => { this.capture(html); this._rarities.splice(Number(e.currentTarget.dataset.removeRarity), 1); this.render(true); });
  }
  capture(html) {
    const root = html?.jquery ? html : $(html);
    const form = root.is("form") ? root[0] : root.find("form.tsru-quest-settings-form").first()[0];
    if (!form) throw new Error("Mission configuration form could not be found.");
    const fd = new FormData(form);
    this._types = this._types.map((type, i) => ({
      ...type, id: String(fd.get(`types.${i}.id`) || type.id),
      name: String(fd.get(`types.${i}.name`) ?? type.name),
      enabled: fd.has(`types.${i}.enabled`),
      order: Number(fd.get(`types.${i}.order`)) || 0,
      icon: String(fd.get(`types.${i}.icon`) ?? type.icon).trim(),
      background: String(fd.get(`types.${i}.background`) ?? type.background).trim()
    }));
    this._rarities = this._rarities.map((rarity, i) => ({
      ...rarity, id: String(fd.get(`rarities.${i}.id`) || rarity.id),
      name: String(fd.get(`rarities.${i}.name`) ?? rarity.name),
      order: Number(fd.get(`rarities.${i}.order`)) || 0,
      color: String(fd.get(`rarities.${i}.color`) ?? rarity.color),
      background: String(fd.get(`rarities.${i}.background`) ?? rarity.background).trim()
    }));
  }
  async _updateObject(event, formData) {
    this.capture(event?.currentTarget?.matches?.("form.tsru-quest-settings-form") ? event.currentTarget : this.element);
    await game.settings.set(MODULE_ID, "questTypes", this._types);
    await game.settings.set(MODULE_ID, "questRarities", this._rarities);
    const form = this.element?.jquery ? this.element[0]?.querySelector("form.tsru-quest-settings-form") ?? this.element[0] : this.element?.querySelector("form.tsru-quest-settings-form") ?? this.element;
    await game.settings.set(MODULE_ID, "questAllIcon", form?.querySelector('[name="questAllIcon"]')?.value?.trim() || formData.questAllIcon || "icons/svg/book.svg");
    ui.notifications.info(`Mission configuration saved (${this._types.filter(type => type.background).length} mission backgrounds, ${this._rarities.filter(rarity => rarity.background).length} reward backgrounds).`);
    refreshQuestWindows();
    this.render(false);
  }
}

function activatePickers(html) {
  html.find(".file-picker").on("click", event => {
    const button = event.currentTarget; const input = html.find(`[name="${button.dataset.target}"]`);
    new FilePicker({type: button.dataset.type || "image", current: input.val(), callback: path => input.val(path).trigger("change")}).browse();
  });
}

class QuestManager extends FormApplication {
  constructor(...args) { super(...args); this.selectedQuestId = ""; this.search = ""; }
  static get defaultOptions() { return foundry.utils.mergeObject(super.defaultOptions, {id: "tsru-quest-manager", title: "HSR Mission Manager", template: `modules/${MODULE_ID}/templates/quest-manager.hbs`, width: 940, height: 780, resizable: true, closeOnSubmit: false, dragDrop: [{dropSelector: ".tsru-reward-drop"}]}); }
  async getData() {
    const typeList = types(); const rarityList = rarities(); const actors = questActors();
    const all = quests().map(normalizeQuest);
    if (!all.some(q => q.id === this.selectedQuestId)) this.selectedQuestId = all[0]?.id ?? "";
    const selected = all.find(q => q.id === this.selectedQuestId);
    const actorOption = a => ({id:a.id,name:a.name,img:a.img,assigned:selected.actorIds.includes(a.id)});
    const mainParty = actors.filter(a => Boolean(a.getFlag(MODULE_ID, "ultimate")?.mainParty));
    const otherActors = actors.filter(a => !mainParty.includes(a));
    return {quests: all.map(q => ({...q, searchText: [q.title,q.location,q.description,...q.rewards.map(r=>r.name)].join(" ").toLocaleLowerCase()})),
      selectedQuest: selected ? {...selected, typeOptions:typeList.map(t=>({...t,selected:t.id===selected.typeId})), rarityOptions:rarityList, mainPartyActors:mainParty.map(actorOption), otherActors:otherActors.map(actorOption), currentStage:selected.stages[selected.stageIndex]??selected.stages[0]} : null, search:this.search};
  }
  activateListeners(html) {
    super.activateListeners(html); activatePickers(html);
    html.find("[data-new-quest]").on("click", async () => { const all = quests(); const q = normalizeQuest({actorIds:questActors().filter(actor=>Boolean(actorUltimate(actor).mainParty)).map(actor=>actor.id)}); all.push(q); this.selectedQuestId=q.id; await saveQuests(all, {quest:q}); this.render(false); });
    html.find("[data-delete-quest]").on("click", async e => { if (!await Dialog.confirm({title:"Delete Mission",content:"<p>Permanently delete this mission?</p>"})) return; await saveQuests(quests().filter(q => q.id !== e.currentTarget.dataset.deleteQuest), {notify:false}); this.selectedQuestId=""; this.render(false); });
    html.find("[data-select-manager-quest]").on("click", e => { this.selectedQuestId=e.currentTarget.dataset.selectManagerQuest; this.render(false); });
    html.find("[data-mission-search]").on("input", e => {
      this.search=e.currentTarget.value;
      const tokens=this.search.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)??[];
      html.find("[data-manager-search-text]").each((_index, row) => {
        row.hidden=!tokens.every(token=>row.dataset.managerSearchText.includes(token));
      });
      html.find("[data-no-search-results]").prop("hidden", html.find("[data-manager-search-text]:visible").length>0);
    });
    html.find("[data-save-quest]").on("click", e => this.saveEditor(e.currentTarget));
    html.find("[data-quest-field]").on("change", e => this.updateField(e.currentTarget));
    html.find("[data-assignment]").on("change", e => this.toggleAssignment(e.currentTarget));
    html.find("[data-add-stage]").on("click", e => this.addStage(e.currentTarget.dataset.addStage));
    html.find("[data-add-objective]").on("click", e => this.addObjective(e.currentTarget.dataset.addObjective));
    html.find("[data-objective-field]").on("change", e => this.updateObjective(e.currentTarget));
    html.find("[data-stage-title]").on("change", e => this.updateStageTitle(e.currentTarget));
    html.find("[data-remove-objective]").on("click", e => this.removeObjective(e.currentTarget));
    html.find("[data-remove-reward]").on("click", e => this.removeReward(e.currentTarget));
    html.find("[data-reward-field]").on("change", e => this.updateReward(e.currentTarget));
    html.find("[data-complete-quest]").on("click", e => this.completeQuest(e.currentTarget.dataset.completeQuest));
    html.find("[data-distribute-rewards]").on("click", e => distributeRewards(e.currentTarget.dataset.distributeRewards));
    if (this.search) html.find("[data-mission-search]").trigger("input");
  }
  async persist(all, notify = false, q = null) { await saveQuests(all, {notify, quest:q}); }
  async saveEditor(button) {
    const card=button.closest("[data-quest-id]"), all=quests(), q=all.find(x=>x.id===card?.dataset.questId);
    if(!q)return;
    for(const input of card.querySelectorAll("[data-quest-field]")) q[input.dataset.questField]=input.type==="checkbox"?input.checked:(input.type==="number"?Number(input.value):input.value);
    q.actorIds=[...card.querySelectorAll("[data-assignment]:checked")].map(input=>input.value);
    const stage=q.stages[q.stageIndex];
    if(stage) {
      stage.title=card.querySelector("[data-stage-title]")?.value||"Stage";
      for(const row of card.querySelectorAll("[data-objective-id]")) {
        const objective=stage.objectives.find(o=>o.id===row.dataset.objectiveId);
        if(objective) for(const input of row.querySelectorAll("[data-objective-field]")) objective[input.dataset.objectiveField]=input.type==="checkbox"?input.checked:input.value;
      }
    }
    for(const input of card.querySelectorAll("[data-reward-field]")) {
      const reward=q.rewards[Number(input.dataset.rewardIndex)];
      if(reward) reward[input.dataset.rewardField]=input.type==="number"?Math.max(1,Number(input.value)||1):input.value;
    }
    await this.persist(all);
    ui.notifications.info(`Mission “${q.title}” saved. You can return to complete it later.`);
  }
  async updateField(input) { const all=quests(), q=all.find(x=>x.id===input.closest("[data-quest-id]")?.dataset.questId); if(!q)return; const f=input.dataset.questField; q[f]=input.type==="checkbox"?input.checked:(input.type==="number"?Number(input.value):input.value); await this.persist(all); }
  async toggleAssignment(input) { const all=quests(),q=all.find(x=>x.id===input.closest("[data-quest-id]")?.dataset.questId); if(!q)return; q.actorIds=q.actorIds??[]; input.checked?q.actorIds.push(input.value):q.actorIds=q.actorIds.filter(id=>id!==input.value); q.actorIds=[...new Set(q.actorIds)]; await this.persist(all,input.checked,q); }
  async addStage(id) { const all=quests(),q=all.find(x=>x.id===id); q.stages.push({id:foundry.utils.randomID(),title:`Stage ${q.stages.length+1}`,objectives:[]}); q.stageIndex=q.stages.length-1; await this.persist(all); }
  async addObjective(id) { const all=quests(),q=all.find(x=>x.id===id); const s=q.stages[q.stageIndex]; s.objectives.push({id:foundry.utils.randomID(),text:"New objective",hidden:false,revealed:false,complete:false}); await this.persist(all); }
  async updateStageTitle(input) { const all=quests(),q=all.find(x=>x.id===input.closest("[data-quest-id]")?.dataset.questId);if(!q)return;q.stages[q.stageIndex].title=input.value||"Stage";await this.persist(all); }
  async updateObjective(input) { const row=input.closest("[data-objective-id]"),card=input.closest("[data-quest-id]"),all=quests(),q=all.find(x=>x.id===card.dataset.questId),s=q.stages[q.stageIndex],o=s.objectives.find(x=>x.id===row.dataset.objectiveId); const f=input.dataset.objectiveField;o[f]=input.type==="checkbox"?input.checked:input.value; await this.persist(all); }
  async removeObjective(button) { const card=button.closest("[data-quest-id]"),all=quests(),q=all.find(x=>x.id===card.dataset.questId),s=q.stages[q.stageIndex];s.objectives=s.objectives.filter(o=>o.id!==button.dataset.removeObjective);await this.persist(all); }
  async updateReward(input) { const card=input.closest("[data-quest-id]"),all=quests(),q=all.find(x=>x.id===card.dataset.questId),r=q.rewards[Number(input.dataset.rewardIndex)];r[input.dataset.rewardField]=input.type==="number"?Math.max(1,Number(input.value)||1):input.value;await this.persist(all); }
  async removeReward(button) { const card=button.closest("[data-quest-id]"),all=quests(),q=all.find(x=>x.id===card.dataset.questId);q.rewards.splice(Number(button.dataset.removeReward),1);await this.persist(all); }
  async completeQuest(id) { const all=quests(),q=all.find(x=>x.id===id);q.status="complete";q.isNew=false;await this.persist(all,true,q); }
  async _onDrop(event) {
    const card=event.target.closest("[data-quest-id]"); if(!card)return;
    const data=TextEditor.implementation?.getDragEventData?.(event) ?? TextEditor.getDragEventData?.(event) ?? {}; const doc=await fromUuid(data.uuid).catch(()=>null); if(!doc || doc.documentName!=="Item") return ui.notifications.warn("Drop an Item here.");
    const all=quests(),q=all.find(x=>x.id===card.dataset.questId);q.rewards.push({uuid:doc.uuid,name:doc.name,img:doc.img,quantity:1,rarityId:rarities()[0]?.id||""});await this.persist(all);
  }
  async _updateObject() {}
}

class QuestLog extends FormApplication {
  constructor(...args) { super(...args); this.filter="all"; this.selected="";  }
  static get defaultOptions() { return foundry.utils.mergeObject(super.defaultOptions, {id:"tsru-quest-log",title:"Missions",template:`modules/${MODULE_ID}/templates/quest-log.hbs`,width:1100,height:680,minWidth:620,minHeight:400,resizable:true,classes:["tsru-quest-window"]}); }
  async getData() {
    const typeList=types().filter(t=>t.enabled); let list=quests().map(normalizeQuest).filter(visibleQuest);
    if(this.filter!=="all")list=list.filter(q=>q.typeId===this.filter);
    const selected=list.find(q=>q.id===this.selected)??list[0]??null; this.selected=selected?.id??"";
    const rars=rarities();
    const seen=seenQuestIds();
    const enrich=q=>{const type=typeList.find(t=>t.id===q.typeId)??{};const stage=q.stages[q.stageIndex]??q.stages[0];return {...q,cardBackground:q.background||type.background||"",isNew:q.isNew&&!seen.has(q.id),type,stage,objectives:(stage?.objectives??[]).filter(o=>game.user.isGM||!o.hidden||o.revealed),rewards:q.rewards.map(r=>({...r,rarity:rars.find(x=>x.id===r.rarityId)??{}})).sort((a,b)=>(Number(a.rarity.order)||0)-(Number(b.rarity.order)||0))};};
    const enriched=list.map(enrich); const groups=typeList.map(t=>({type:t,quests:enriched.filter(q=>q.typeId===t.id)})).filter(g=>g.quests.length);
    return {allIcon:game.settings.get(MODULE_ID,"questAllIcon"),types:typeList.map(t=>({...t,active:this.filter===t.id})),allActive:this.filter==="all",groups,flat:enriched,selected:selected?enrich(selected):null,allMode:this.filter==="all",gm:game.user.isGM};
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-quest-filter]").on("click",e=>{this.filter=e.currentTarget.dataset.questFilter;this.selected="";this.render(false);});
    html.find("[data-select-quest]").on("click",async e=>{this.selected=e.currentTarget.dataset.selectQuest;await markQuestSeen(this.selected);this.render(false);});
    html.find("[data-quest-close]").on("click",()=>this.close());
    html.find("[data-quest-minimize]").on("click",()=>this.minimize());
    html.find(".tsru-quest-custom-header").on("dblclick",e=>{if(!e.target.closest("button, a, input, select, textarea"))this.minimize();});
    const dragHandle = html.find(".tsru-quest-custom-header")[0];
    dragHandle?.addEventListener("pointerdown", event => {
      if (event.button !== 0 || event.target.closest("button, a, input, select, textarea")) return;
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const windowElement = this.element?.jquery ? this.element[0] : this.element;
      const startLeft = Number(this.position.left) || windowElement?.offsetLeft || 0;
      const startTop = Number(this.position.top) || windowElement?.offsetTop || 0;
      dragHandle.setPointerCapture?.(event.pointerId);
      const move = moveEvent => this.setPosition({
        left: startLeft + moveEvent.clientX - startX,
        top: startTop + moveEvent.clientY - startY
      });
      const finish = finishEvent => {
        dragHandle.removeEventListener("pointermove", move);
        dragHandle.removeEventListener("pointerup", finish);
        dragHandle.removeEventListener("pointercancel", finish);
        if (dragHandle.hasPointerCapture?.(finishEvent.pointerId)) dragHandle.releasePointerCapture(finishEvent.pointerId);
      };
      dragHandle.addEventListener("pointermove", move);
      dragHandle.addEventListener("pointerup", finish);
      dragHandle.addEventListener("pointercancel", finish);
    });
  }
  setPosition(options={}) { const pos=super.setPosition(options); const el=this.element?.jquery?this.element[0]:this.element;if(el)el.style.setProperty("--tsru-quest-scale",Math.max(.68,Math.min(1.35,(pos?.width||1100)/1100))); return pos; }
  async close(...args){questLog=null;return super.close(...args);}
  async _updateObject() {}
}

let questLog;
function openQuestLog(){ if(!questLog)questLog=new QuestLog();questLog.render(true); }
function openHub(){ new HSRHub().render(true); }

async function runUiAction(label, callback) {
  try { return await callback(); }
  catch (error) {
    console.error(`${MODULE_ID} | Could not open ${label}`, error);
    ui.notifications.error(`Could not open ${label}: ${error.message}`);
  }
}

function toolbarAction(label, callback) {
  return () => runUiAction(label, callback);
}

function hubToolbarActions() {
  return {
    "tsru-quest-log": ["Mission Log", openQuestLog],
    "tsru-party-selector": ["Main Character", () => new PartyCharacterSelector().render(true)],
    "tsru-orbs": ["Combat Party HUD", () => api()?.showUltimateUI?.()],
    "tsru-skills": ["Skills & Skill Points", () => api()?.showSkillUI?.()],
    "tsru-talents": ["Talent", () => api()?.showTalentUI?.()],
    "tsru-hub-window": ["HSR Hub", openHub],
    "tsru-gm-panel": ["Star Rail GM Panel", () => api()?.openGMPanel?.()],
    "tsru-quest-manager": ["Mission Manager", () => new QuestManager().render(true)],
    "tsru-quest-settings": ["Mission Settings", () => new QuestSettings().render(true)],
    "tsru-aha-config": ["Aha Instant Configuration", () => api()?.openAhaConfig?.()],
    "tsru-aha-toggle": ["Aha Instant Orb", () => api()?.toggleAhaOrb?.()],
    "tsru-skill-config": ["Skill Point Configuration", () => api()?.openSkillPointConfig?.()],
    "tsru-elements": ["Element Manager", () => api()?.openElementManager?.()],
    "tsru-paths": ["Path Manager", () => api()?.openPathManager?.()],
    "tsru-eidolons": ["Eidolon Configuration", () => api()?.openEidolonConfig?.()]
  };
}

function registerHubToolbarFallback() {
  if (document.documentElement.dataset.tsruHubToolbarListener) return;
  document.documentElement.dataset.tsruHubToolbarListener = "true";
  document.addEventListener("click", event => {
    const control = event.target.closest?.("[data-tool], [data-control], [data-action]");
    const toolName = control?.dataset.tool ?? control?.dataset.control ?? control?.dataset.action;
    const [label, callback] = hubToolbarActions()[toolName] ?? [];
    if (!callback) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    runUiAction(label, callback);
  }, true);
}

function consolidateToolbar(controls) {
  const token=controls.find?.(c=>c.name==="token")??controls.tokens??controls.token;
  const old=new Set(["tsru-orbs","tsru-skills","tsru-aha-instant","tsru-gm-panel"]);
  if(token){if(Array.isArray(token.tools)) token.tools=token.tools.filter(t=>!old.has(t.name)); else for(const name of old)delete token.tools[name];}
  let hubTools=[
    ["tsru-quest-log","Mission Log","fas fa-clipboard-list",true,toolbarAction("Mission Log",openQuestLog)],
    ["tsru-party-selector","Select Main Character","fas fa-user-check",!game.user.isGM,toolbarAction("Main Character",()=>new PartyCharacterSelector().render(true))],
    ["tsru-orbs","Show Combat Party HUD","fas fa-users",game.user.isGM,toolbarAction("Combat Party HUD",()=>api()?.showUltimateUI?.())],
    ["tsru-abilities","Show All Ability Bubbles","fas fa-circle-nodes",true,toolbarAction("Ability Bubbles",()=>requireApiMethod("showAllAbilityBubbles")())],
    ["tsru-hub-window","Open HSR Hub","fas fa-grid-2",true,toolbarAction("HSR Hub",openHub)],
    ["tsru-gm-panel","Star Rail GM Panel","fas fa-sliders",game.user.isGM,toolbarAction("Star Rail GM Panel",()=>api()?.openGMPanel?.())],
    ["tsru-quest-manager","Mission Manager","fas fa-list-check",game.user.isGM,toolbarAction("Mission Manager",()=>new QuestManager().render(true))],
    ["tsru-quest-settings","Mission Types & Rarities","fas fa-tags",game.user.isGM,toolbarAction("Mission Settings",()=>new QuestSettings().render(true))],
    ["tsru-aha-config","Aha Instant Configuration","fas fa-masks-theater",game.user.isGM,toolbarAction("Aha Instant Configuration",()=>api()?.openAhaConfig?.())],
    ["tsru-aha-toggle","Toggle Aha Instant Orb","fas fa-eye",game.user.isGM,toolbarAction("Aha Instant Orb",()=>api()?.toggleAhaOrb?.())],
    ["tsru-skill-config","Skill Point Configuration","fas fa-diamond",game.user.isGM,toolbarAction("Skill Point Configuration",()=>api()?.openSkillPointConfig?.())],
    ["tsru-elements","Manage Elements","fas fa-sparkles",game.user.isGM,toolbarAction("Element Manager",()=>api()?.openElementManager?.())],
    ["tsru-paths","Manage Paths","fas fa-route",game.user.isGM,toolbarAction("Path Manager",()=>api()?.openPathManager?.())],
    ["tsru-eidolons","Configure Eidolon Layers","fas fa-gem",game.user.isGM,toolbarAction("Eidolon Configuration",()=>api()?.openEidolonConfig?.())]
  ].map(([name,title,icon,visible,handler])=>({name,title,icon,button:true,visible,onClick:handler,onChange:handler}));
  if(game.user.isGM) hubTools=hubTools.filter(tool=>tool.name==="tsru-hub-window");
  const hub={name:"tsru-hsr-hub",title:"HSR Hub",icon:"fas fa-rocket",order:89,layer:"controls",tools:hubTools};
  if(Array.isArray(controls)){const existing=controls.findIndex(c=>c.name===hub.name);if(existing>=0)controls.splice(existing,1);controls.push(hub);}
  else controls[hub.name]=hub;
}

Hooks.once("init",()=>{
  if (!Handlebars.helpers.eq) Handlebars.registerHelper("eq", (a,b) => String(a) === String(b));
  game.settings.register(MODULE_ID,"questTypes",{scope:"world",config:false,type:Array,default:clone(DEFAULT_TYPES)});
  game.settings.register(MODULE_ID,"questRarities",{scope:"world",config:false,type:Array,default:clone(DEFAULT_RARITIES)});
  game.settings.register(MODULE_ID,"quests",{scope:"world",config:false,type:Array,default:[]});
  game.settings.register(MODULE_ID,"questAllIcon",{scope:"world",config:false,type:String,default:"icons/svg/book.svg"});
  game.settings.register(MODULE_ID,"questSeen",{scope:"client",config:false,type:Array,default:[]});
  game.settings.register(MODULE_ID,"partySelections",{scope:"world",config:false,type:Object,default:{}});
  game.settings.register(MODULE_ID,"hsrHubConfig",{scope:"world",config:false,type:Object,default:clone(DEFAULT_HUB_CONFIG)});
  game.settings.register(MODULE_ID,"hsrMessengerThreads",{scope:"world",config:false,type:Array,default:[]});
  game.settings.register(MODULE_ID,"hsrMessengerContacts",{scope:"world",config:false,type:Array,default:[]});
  game.settings.registerMenu(MODULE_ID,"questConfiguration",{name:"Mission Types & Reward Rarities",label:"Configure Missions",hint:"Configure mission categories, category artwork, filter icons, order, and reward rarity hierarchy.",icon:"fas fa-list-check",type:class extends FormApplication{render(){new QuestSettings().render(true);return this;}},restricted:true});
});

Hooks.once("ready",()=>{
  game.socket.on(SOCKET,async payload=>{
    if(payload?.type==="selectPartyCharacter" && game.user.isGM && partyAuthority()?.id===game.user.id) { await applyPartySelection(payload.userId,payload.actorId); return; }
    if(payload?.type==="partySelectionChanged") { if(payload.userId===game.user.id) await api()?.setLocalMainCharacter?.(payload.actorId); for(const app of Object.values(ui.windows??{})) if(["tsru-party-selector","tsru-quest-manager","tsru-gm-panel","tsru-hub"].includes(app.options?.id)) app.render(false); if(payload.userId===game.user.id) ui.notifications.info("Your main character and party status were updated."); return; }
    if(payload?.type!=="questsChanged")return;refreshQuestWindows();
    if(payload.notify&&payload.sourceUserId!==game.user.id){const q=quests().find(x=>x.id===payload.questId);if(q&&visibleQuest(q))ui.notifications.info(q.status==="complete"?`Mission Complete: ${q.title}`:`New Mission: ${q.title}`);}
  });
  Object.assign(game.modules.get(MODULE_ID).api??{}, {openHub,openMessenger:()=>new HSRMessenger().render(true),openContactConfig:()=>new HSRContactConfig().render(true),openQuestLog,openQuestManager:()=>new QuestManager().render(true),openQuestSettings:()=>new QuestSettings().render(true),openPartySelector:()=>new PartyCharacterSelector().render(true)});
  registerHubToolbarFallback();
});

Hooks.on("getSceneControlButtons",consolidateToolbar);
Hooks.on("updateSetting", setting => {
  if (["questTypes", "questRarities", "quests", "questAllIcon"].some(key => setting?.key === `${MODULE_ID}.${key}`)) refreshQuestWindows();
  if(setting?.key===`${MODULE_ID}.hsrHubConfig`)for(const app of Object.values(ui.windows??{}))if(["tsru-hub","tsru-hub-config"].includes(app.options?.id))app.render(false);
  if(setting?.key===`${MODULE_ID}.hsrMessengerThreads`)for(const app of Object.values(ui.windows??{}))if(app.options?.id==="tsru-hsr-messenger")app.render(false);
  if(setting?.key===`${MODULE_ID}.hsrMessengerContacts`)for(const app of Object.values(ui.windows??{}))if(["tsru-hsr-messenger","tsru-hsr-contact-config"].includes(app.options?.id))app.render(false);
});
