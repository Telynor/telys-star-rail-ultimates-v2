const ID = 'telys-star-rail-ultimates';
export const ACTION_METHODS = Object.freeze({skill:'requestSkill',ultimate:'requestUltimate',talent:'showTalentPopup',technique:'requestTechnique'});
const queues = new Map();

export function actionMacroPresentation(actor, action, config, enhanced=false) {
  const label = {skill:'Skill',ultimate:config.ultimateName||'Ultimate',talent:'Talent',technique:'Technique'}[action];
  const img = {skill:config.skillButtonImage,ultimate:config.ultimateButtonImage||config.orbImage,talent:config.talentIcon,technique:config.techniqueButtonImage}[action];
  return {name:`${actor.name} — ${enhanced&&action!=='technique'?'Enhanced ':''}${label}`,img:img||actor.img||'icons/svg/d20.svg'};
}

export function actionMacroCommand(actor, action) {
  return `const actor = game.actors.get(${JSON.stringify(actor.id)});\nif (!actor) return ui.notifications.error("Character not found.");\nreturn game.modules.get("${ID}")?.api?.${ACTION_METHODS[action]}(actor);`;
}

// Read every numbered slot, including inactive pages and offline owners. Keep
// the same macro documents and slot assignments; only their active action changes.
export async function synchronizeActionMacros({actor,users=[game.user],presentation,replaceCommand=false,isChanging=()=>false}={}) {
  const entries=new Map();
  for(const user of users??[]) {
    if(actor&&!user.isGM&&!actor.testUserPermission?.(user,'OWNER'))continue;
    for(const value of Object.values(user.hotbar??{})) {
      const macro=game.macros?.get(typeof value==='string'?value:value?.id??value?._id);
      const action=macro?.getFlag?.(ID,'action'),target=game.actors.get(macro?.getFlag?.(ID,'actorId'));
      if(!Object.hasOwn(ACTION_METHODS,action)||!target||actor&&target.id!==actor.id)continue;
      if(!game.user.isGM&&!macro.isOwner)continue;
      entries.set(macro.id,{macro,actor:target,action});
    }
  }
  await Promise.all([...entries.values()].map(({macro,actor,action})=>{
    const previous=queues.get(macro)??Promise.resolve();
    const job=previous.catch(()=>{}).then(async()=>{
      if(isChanging(actor)||game.macros.get(macro.id)!==macro)return;
      const display=presentation(actor,action),patch={};
      for(const key of ['name','img'])if(macro[key]!==display[key])patch[key]=display[key];
      if(replaceCommand) {
        const command=actionMacroCommand(actor,action);
        if(macro.command!==command)patch.command=command;
      }
      if(Object.keys(patch).length)await macro.update(patch);
    });
    queues.set(macro,job);
    return job.finally(()=>{if(queues.get(macro)===job)queues.delete(macro);});
  }));
}
