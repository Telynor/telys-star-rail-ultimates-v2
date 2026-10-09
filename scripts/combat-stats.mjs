const ID='telys-star-rail-ultimates', FLAG='combatStatBuffs';
const numeric=x=>Number.isFinite(Number(x))?Number(x):0;
const esc=x=>foundry.utils.escapeHTML(String(x??''));
const active=actor=>{const b=actor.getFlag(ID,FLAG);return game.combat?.started&&b?.combatId===game.combat.id?b:{values:{},planar:{}}};
const criticalView=(actor,base)=>{const p=window.TelysPlanar.criticalSnapshot(actor,base),cone=game.modules.get(ID)?.api?.lightCones?.snapshot(actor)??{},override=active(actor).threshold;const automatic=Math.min(p.automatic,Math.max(cone.critFloor??15,p.automatic-numeric(cone.crit)));return {...p,automatic,threshold:Number.isFinite(override)?override:automatic,critDamageBonus:p.critDamageBonus+numeric(cone.critDamage)}};
const effect=actor=>actor.effects.find(e=>e.getFlag(ID,'combatStatBuff'));
function standardActor(actor){
  const data=actor.toObject();const b=active(actor);if(b.hpDelta)data.system.attributes.hp.value=Math.max(0,numeric(data.system.attributes.hp.value)-b.hpDelta);data.effects=data.effects.filter(e=>!e.flags?.[ID]?.combatStatBuff&&!e.flags?.['telys-planar-ornaments']?.statBonus&&!e.flags?.['telys-planar-ornaments']?.hsrBonus);
  if(data.flags?.[ID]){delete data.flags[ID][FLAG];delete data.flags[ID].planarCritAdjustment;}
  let copy=actor.clone(data,{keepId:true});copy.prepareData();
  for(let pass=0;pass<2;pass++){const effects=window.TelysPlanar.standardStatEffects(copy);copy=actor.clone({...data,effects:[...data.effects,...effects]},{keepId:true});copy.prepareData();}
  return copy;
}
function descriptors(actor,getConfig){
  const a=actor.system.attributes??{}, rows=[];
  const add=(id,name,value,path,formula=false)=>rows.push({id,name,value:numeric(value),path,formula,raw:value});
  add('hp','HP',a.hp?.value,null);add('maxHp','Maximum HP',a.hp?.max,'system.attributes.hp.bonuses.overall');
  add('ac','AC',a.ac?.value,'system.attributes.ac.bonus');add('speed','Speed (ft)',a.movement?.walk,'system.attributes.movement.walk');
  add('initiative','Initiative',a.init?.total??a.init?.mod??a.init?.bonus,'system.attributes.init.bonus');add('proficiency','Proficiency',a.prof,'system.attributes.prof');
  for(const [key,v] of Object.entries(actor.system.abilities??{})){add(`ability.${key}`,key.toUpperCase(),v.value,`system.abilities.${key}.value`);add(`save.${key}`,`${key.toUpperCase()} save`,v.save?.total??v.save??v.mod,`system.abilities.${key}.bonuses.save`);}
  for(const [key,v] of Object.entries(actor.system.skills??{}))add(`skill.${key}`,game.i18n.localize(CONFIG.DND5E?.skills?.[key]?.label??key),v.total??v.mod,`system.skills.${key}.bonuses.check`);
  for(const key of ['mwak','rwak','msak','rsak','spell'])if(actor.system.bonuses?.[key])add(`attack.${key}`,`${key.toUpperCase()} attack bonus`,actor.system.bonuses[key].attack||'0',`system.bonuses.${key}.attack`,true);
  const hsr=getConfig(actor);add('breakEffect','Break Effect',hsr.breakEffectScore,`flags.${ID}.ultimate.breakEffectScore`);add('regen','Energy Regen',hsr.regenScore,`flags.${ID}.ultimate.regenScore`);
  return rows;
}
async function persist(actor,b){
  await actor.setFlag(ID,FLAG,b);
  const changes=Object.values(b.values??{}).map(v=>({key:v.path,mode:v.formula?CONST.ACTIVE_EFFECT_MODES.OVERRIDE:CONST.ACTIVE_EFFECT_MODES.ADD,value:String(v.formula?v.value:v.delta),priority:90}));
  const old=effect(actor);
  if(changes.length){if(old)await old.update({changes});else await actor.createEmbeddedDocuments('ActiveEffect',[{name:'Temporary combat buffs',changes,flags:{[ID]:{combatStatBuff:true,combatId:b.combatId}}}]);}
  else if(old)await old.delete();
  await window.TelysPlanar?.syncCombatStats?.(actor);actor.prepareData();
}
export async function resetCombatBuffs(actor){
  const b=actor.getFlag(ID,FLAG);if(!b)return;
  if(b.hpDelta)await actor.update({'system.attributes.hp.value':Math.max(0,numeric(actor.system.attributes.hp.value)-b.hpDelta)});
  const old=effect(actor);if(old)await old.delete();
  await actor.unsetFlag(ID,FLAG);await actor.unsetFlag(ID,'planarCritAdjustment');await window.TelysPlanar?.syncCombatStats?.(actor);actor.prepareData();
}
export function showCombatStats({actors,getConfig,isCombatant}){
  const combat=game.combat;
  if(!game.user.isGM||!combat?.started)return;
  if(!window.TelysPlanar?.combatBuffSupport)return ui.notifications.error('Update Planar Ornaments to v1.0.14 to inspect combat buffs.');
  let dialog;
  const build=()=>actors.filter(isCombatant).map(actor=>{
    actor.prepareData();const base=standardActor(actor),b=active(actor),current=criticalView(actor),standard=criticalView(base);
    const bases=new Map(descriptors(base,getConfig).map(v=>[v.id,v]));
    const row=(id,name,value,original,formula=false)=>`<label class="tsru-combat-stat-row"><span title="${esc(id==='threshold'?'Lowest natural d20 result that counts as a critical hit. Lower numbers increase critical chance.':id==='planar.critDamageBonus'?'Flat additional damage on a critical hit, including sheet, planar and Light Cone bonuses. This is not extra dice.':id==='hp'?'Current hit points. Editing this changes HP immediately.':`Effective ${name}. Editing sets the current combat value; reset restores its automatic baseline.`)}">${esc(name)}</span><input data-stat="${esc(id)}" type="${formula?'text':'number'}" step="1" value="${esc(value)}" title="Sheet + planar + Light Cone: ${esc(original)}"><small class="tsru-stat-baseline" title="Automatic value before manual combat edits: sheet plus planar and active Light Cone effects.">${esc(original)}</small><button type="button" data-reset-value="${esc(id)}" title="Reset to sheet + planar + Light Cone"><i class="fas fa-rotate-left"></i></button></label>`;
    const groups=[['Vitals & movement',v=>['hp','maxHp','ac','speed','initiative','proficiency'].includes(v.id)],['Ability scores & saving throws',v=>v.id.startsWith('ability.')||v.id.startsWith('save.')],['Skill checks',v=>v.id.startsWith('skill.')],['Attacks & HSR scores',v=>v.id.startsWith('attack.')||['breakEffect','regen'].includes(v.id)]];
    const fields=groups.map(([label,filter])=>`<section class="tsru-stat-section"><h3>${label}</h3>${descriptors(actor,getConfig).filter(filter).map(v=>row(v.id,v.name,v.formula?v.raw:v.value,v.formula?bases.get(v.id)?.raw:bases.get(v.id)?.value,v.formula)).join('')}</section>`).join('');
    const crit=row('threshold','Critical threshold',current.threshold,standard.automatic)+row('planar.critDamageBonus','Cumulative critical damage bonus',current.critDamageBonus,standard.critDamageBonus);
    const planar=Object.entries(current.adjustedBonuses).filter(([key,value])=>!['critDamageBonus','critRange','critRate'].includes(key)&&(numeric(value)!==0||numeric(standard.adjustedBonuses[key])!==0||key in (b.planar??{}))).map(([key,value])=>row(`planar.${key}`,`Planar ${key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ')}`,value,standard.adjustedBonuses[key]??0)).join('');
    return `<details class="tsru-adjusted-stat-card" data-combat-actor="${esc(actor.uuid)}"><summary><img src="${esc(actor.img)}" alt="">${esc(actor.name)}</summary><div class="tsru-adjusted-stat-body"><button type="button" data-reset-all title="Remove all manual combat changes for this character and restore automatic sheet, planar and Light Cone values.">Reset all combat changes</button><div class="tsru-stat-columns"><span>Stat</span><span>In combat</span><span>Automatic</span><span>Reset</span></div><section class="tsru-stat-section"><h3>Critical hits</h3>${crit}</section>${fields}<section class="tsru-stat-section"><h3>Planar bonuses</h3>${planar || '<p class="tsru-panel-hint">No additional planar bonuses.</p>'}</section></div></details>`;
  }).join('');
  const refresh=(html,uuid)=>{const open=new Set([...html[0].querySelectorAll('details[open]')].map(x=>x.dataset.combatActor));html.find('.tsru-combat-stat-cards').html(build());for(const d of html[0].querySelectorAll('details'))d.open=open.has(d.dataset.combatActor)||d.dataset.combatActor===uuid;};
  dialog=new Dialog({title:'Adjusted PC Combat Stats',content:`<div class="tsru-adjusted-stats"><p>Click a character to expand. In combat shows the editable effective value; Automatic shows the baseline before manual changes. Edits apply immediately and clear when combat ends. Hover over labels and reset buttons for help.</p><div class="tsru-combat-stat-cards">${build()}</div></div>`,buttons:{close:{label:'Close'}},render:html=>{
    let busy=false;
    const change=async(event,reset=false)=>{
      event.preventDefault();if(busy)return;busy=true;html.find('input,button').prop('disabled',true);
      const card=event.target.closest('[data-combat-actor]'),actor=actors.find(a=>a.uuid===card?.dataset.combatActor);
      try{
        if(!actor||!isCombatant(actor)||!game.combat?.started||game.combat.id!==combat.id)throw Error('This character is no longer in the active combat.');
        if(event.target.closest('[data-reset-all]'))await resetCombatBuffs(actor);
        else{
          const id=reset?event.target.closest('[data-reset-value]').dataset.resetValue:event.target.dataset.stat;
          const b=foundry.utils.deepClone(active(actor));b.combatId=combat.id;b.values??={};b.planar??={};
          const base=standardActor(actor),standard=criticalView(base),field=descriptors(base,getConfig).find(v=>v.id===id);
          const desired=field?.formula?event.target.value:Number(event.target.value);
          if(!reset&&!field?.formula&&!Number.isFinite(desired))throw Error('Enter a finite number.');
          if(id==='threshold'){if(!reset&&(!Number.isInteger(desired)||desired<2||desired>20))throw Error('Critical threshold must be 2–20.');if(reset)delete b.threshold;else b.threshold=desired;}
          else if(id.startsWith('planar.')){const key=id.slice(7);if(reset)delete b.planar[key];else b.planar[key]=desired-numeric(standard.adjustedBonuses[key]);}
          else if(id==='hp'){const previous=numeric(b.hpDelta),value=reset?numeric(actor.system.attributes.hp.value)-previous:desired;b.hpDelta=reset?0:previous+value-numeric(actor.system.attributes.hp.value);await actor.update({'system.attributes.hp.value':Math.max(0,value)});}
          else if(field){if(reset)delete b.values[id];else b.values[id]=field.formula?{path:field.path,formula:true,value:desired}:{path:field.path,delta:desired-field.value};}
          await persist(actor,b);
        }
        refresh(html,actor.uuid);
      }catch(error){ui.notifications.error(error.message);}finally{busy=false;html.find('input,button').prop('disabled',false);}
    };
    html.on('change','[data-stat]',event=>void change(event));html.on('click','[data-reset-value], [data-reset-all]',event=>void change(event,true));
  }},{width:760,height:700,resizable:true});dialog.render(true);
}
async function cleanup(combat){if(!game.user.isGM||game.users?.filter(u=>u.isGM&&u.active).sort((a,b)=>a.id.localeCompare(b.id))[0]?.id!==game.user.id)return;const actors=new Map([...game.actors,...[...combat.combatants].map(c=>c.actor).filter(Boolean)].map(a=>[a.uuid,a]));for(const actor of actors.values())if(actor.getFlag(ID,FLAG)?.combatId===combat.id)await resetCombatBuffs(actor);}
Hooks.on('deleteCombat',cleanup);
Hooks.on('updateCombat',(combat,change)=>{if(change.started===false||change.round===0)void cleanup(combat);});
Hooks.once('ready',()=>{if(game.user.isGM)for(const actor of game.actors){const b=actor.getFlag(ID,FLAG);if(b&&!game.combats.get(b.combatId)?.started)void resetCombatBuffs(actor);}});

Hooks.on('deleteCombatant',combatant=>{if(!game.user.isGM)return;const actor=combatant.actor,combat=combatant.parent;if(actor?.getFlag(ID,FLAG)?.combatId===combat?.id&&![...combat.combatants].some(c=>c.actor?.uuid===actor.uuid))void resetCombatBuffs(actor);});
