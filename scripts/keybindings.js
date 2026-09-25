const MODULE = "telys-star-rail-ultimates";

// Every shortcut is optional and stored by Foundry for the individual user.
const MENUS = [
  ["hub", "HSR Phone Hub", "openHub"],
  ["missions", "Mission Hub", "openQuestLog"],
  ["crafting", "Party Crafting", "openCrafting"],
  ["messenger", "HSR Messenger", "openMessenger"],
  ["character", "Main Character Selection", "openPartySelector"],
  ["sheet", "Selected Character Sheet", "openSelectedSheet"],
  ["inventory", "Selected Character Inventory", "openSelectedInventory"],
  ["kit", "Selected Character Kit", "openCheckKit"],
  ["abilities", "Ability Bubbles", "showAllAbilityBubbles"],
  ["combatHud", "Combat Party HUD", "showUltimateUI"],
  ["gmPanel", "Star Rail GM Panel", "openGMPanel", true],
  ["dmCombat", "HSR DM Combat menu", "openDMCombatMenu", true],
  ["missionManager", "Mission Manager", "openQuestManager", true],
  ["missionSettings", "Mission Types & Rarities", "openQuestSettings", true],
  ["recipeManager", "Crafting Recipe Manager", "openRecipeManager", true],
  ["craftingCategories", "Crafting Classifications", "openCraftingClassifications", true],
  ["phoneDesigner", "Phone Hub Designer", "openPhoneDesigner", true],
  ["contactSettings", "Messenger Contacts", "openContactConfig", true],
  ["combatDesigner", "Combat HUD Designer", "openCombatHudDesigner", true],
  ["ahaSettings", "Aha Instant Configuration", "openAhaConfig", true],
  ["skillSettings", "Skill Point Configuration", "openSkillPointConfig", true],
  ["talentSettings", "Talent Point Configuration", "openTalentPointConfig", true],
  ["techniqueSettings", "Technique Point Configuration", "openTechniquePointConfig", true],
  ["elements", "Element Manager", "openElementManager", true],
  ["paths", "Path Manager", "openPathManager", true],
  ["eidolonSettings", "Eidolon Configuration", "openEidolonConfig", true],
  ["eidolonEffects", "Eidolon Effects", "openEidolonEffectsBrowser", true],
  ["lightCones", "Light Cone Generator", "openLightConeGenerator", true],
  ["damageDisplay", "Damage Display Appearance", "openBreakAppearance", true]
].map(([id,label,method,gm=false])=>({id,label,method,gm}));

function invokeMenu(menu) {
  if (menu.gm && !game.user.isGM) return false;
  const api=game.modules.get(MODULE)?.api;
  try {
    const method=api?.[menu.method];
    if (typeof method !== "function") throw new Error("Menu is not ready. Try again after the world finishes loading.");
    Promise.resolve(method()).catch(error=>{
      console.error(`${MODULE} | ${menu.label} shortcut failed`,error);
      ui.notifications.error(`Could not open ${menu.label}: ${error.message}`);
    });
    return true;
  } catch(error) {
    console.error(`${MODULE} | ${menu.label} shortcut failed`,error);
    ui.notifications.error(`Could not open ${menu.label}: ${error.message}`);
    return true;
  }
}

const MODIFIERS=["CONTROL","ALT","SHIFT"];
const canonical=binding=>`${binding.key}|${MODIFIERS.filter(modifier=>(binding.modifiers??[]).some(value=>String(value).toUpperCase()===modifier)).join("+")}`;
const display=binding=>binding?.key?[...MODIFIERS.filter(modifier=>(binding.modifiers??[]).some(value=>String(value).toUpperCase()===modifier)).map(value=>value==="CONTROL"?"Ctrl":value==="ALT"?"Alt":"Shift"),binding.key.replace(/^(Key|Digit)/,"")].join(" + "):"Unassigned";

function conflictingActions(binding,ownId) {
  const matches=[];
  for(const [id,bindings] of game.keybindings.bindings) {
    if(id===`${MODULE}.${ownId}`)continue;
    if(!bindings.some(other=>canonical(other)===canonical(binding)))continue;
    const action=game.keybindings.actions.get(id);
    if(action?.restricted&&!game.user.isGM)continue;
    matches.push(game.i18n.localize(action?.name??id));
  }
  return matches;
}

class MenuShortcutSettings extends FormApplication {
  constructor(...args){super(...args);this.pending=new Map();this.recording=null;this.capture=null;}
  static get defaultOptions(){return foundry.utils.mergeObject(super.defaultOptions,{id:"tsru-shortcut-settings",title:"Star Rail Menu Shortcuts",template:`modules/${MODULE}/templates/keybindings.hbs`,width:720,height:700,resizable:true,closeOnSubmit:false});}
  getData(){return {groups:[
    {label:"Player Menus",menus:MENUS.filter(menu=>!menu.gm)},
    ...(game.user.isGM?[{label:"GM Menus",menus:MENUS.filter(menu=>menu.gm)}]:[])
  ].map(group=>({...group,menus:group.menus.map(menu=>({id:menu.id,label:menu.label,gm:menu.gm,binding:display(this.pending.get(menu.id)??game.keybindings.get(MODULE,menu.id)?.[0]),ready:this.pending.has(menu.id)&&!conflictingActions(this.pending.get(menu.id),menu.id).length,warning:this.pending.has(menu.id)?conflictingActions(this.pending.get(menu.id),menu.id).join(", "):""}))}))};}
  stopRecording(){window.removeEventListener("keydown",this.capture,true);this.capture=null;this.recording=null;}
  activateListeners(html){super.activateListeners(html);
    html.find("[data-record-shortcut]").on("click",event=>{
      this.stopRecording();const id=event.currentTarget.dataset.recordShortcut;
      const menu=MENUS.find(entry=>entry.id===id&&(!entry.gm||game.user.isGM));if(!menu)return;
      this.recording=id;event.currentTarget.textContent="Press keys… (Esc cancels)";
      this.capture=keyEvent=>{
        keyEvent.preventDefault();keyEvent.stopImmediatePropagation();
        if(keyEvent.key==="Escape"){this.stopRecording();this.render(false);return;}
        if(["Control","Alt","Shift","Meta"].includes(keyEvent.key))return;
        if(!keyEvent.code)return;
        const modifiers=[...(keyEvent.ctrlKey||keyEvent.metaKey?["CONTROL"]:[]),...(keyEvent.altKey?["ALT"]:[]),...(keyEvent.shiftKey?["SHIFT"]:[])];
        this.pending.set(id,{key:keyEvent.code,modifiers});this.stopRecording();this.render(false);
      };
      window.addEventListener("keydown",this.capture,true);
    });
    html.find("[data-save-shortcut]").on("click",async event=>{
      const id=event.currentTarget.dataset.saveShortcut,menu=MENUS.find(entry=>entry.id===id&&(!entry.gm||game.user.isGM)),binding=this.pending.get(id);
      if(!menu||!binding)return;
      const conflicts=conflictingActions(binding,id);
      if(conflicts.length){ui.notifications.warn(`${display(binding)} conflicts with ${conflicts.join(", ")}. Choose another combination.`);return;}
      try{await game.keybindings.set(MODULE,id,[binding]);this.pending.delete(id);ui.notifications.info(`${menu.label}: ${display(binding)}`);this.render(false);}catch(error){ui.notifications.error(`Could not save shortcut: ${error.message}`);}
    });
    html.find("[data-clear-shortcut]").on("click",async event=>{
      const id=event.currentTarget.dataset.clearShortcut,menu=MENUS.find(entry=>entry.id===id&&(!entry.gm||game.user.isGM));if(!menu)return;
      this.pending.delete(id);this.stopRecording();await game.keybindings.set(MODULE,id,[]);this.render(false);
    });
  }
  async close(...args){this.stopRecording();return super.close(...args);}
  async _updateObject(){}
}

Hooks.once("init",()=>{
  for(const menu of MENUS)game.keybindings.register(MODULE,menu.id,{name:menu.label,hint:`Open ${menu.label}`,editable:[],restricted:menu.gm,onDown:()=>invokeMenu(menu)});
  game.settings.registerMenu(MODULE,"menuShortcuts",{name:"Menu Keyboard Shortcuts",label:"Configure Shortcuts",hint:"Record shortcuts for Star Rail menus. Conflicts with existing Foundry controls and other modules are checked before saving. Shortcuts are personal to each user; GM menus are restricted to GMs.",icon:"fas fa-keyboard",type:MenuShortcutSettings,restricted:false});
});
