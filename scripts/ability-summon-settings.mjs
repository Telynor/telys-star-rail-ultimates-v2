import {normalizeSummons, parseHpDice} from './summoning-rules.mjs';
import {normalizeSummonOptions,spellSummonKey} from './summon-options.mjs';
const ID = 'telys-star-rail-ultimates';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function optionFields(entry,key) {
  const fields=normalizeSummonOptions(entry);
  return `<div class="tsru-summon-options"><label>Show resource?<select data-summon-resource="${esc(key)}">${[['none','None'],['dots','Dots (3)'],['percent','Percentage'],['hp','HP']].map(([value,label])=>`<option value="${value}" ${fields.resourceType===value?'selected':''}>${label}</option>`).join('')}</select></label><label>Turn<select data-summon-initiative="${esc(key)}"><option value="own" ${fields.initiativeMode==='own'?'selected':''}>Uses own initiative</option><option value="owner" ${fields.initiativeMode==='owner'?'selected':''}>Takes its turn with you</option></select></label><label ${fields.resourceType==='none'?'hidden':''}>Current resource<input type="number" min="0" max="${fields.resourceMax}" value="${fields.resource}" data-summon-value="${esc(key)}"></label><label ${fields.resourceType==='none'?'hidden':''}>Maximum resource<input type="number" min="1" value="${fields.resourceMax}" data-summon-max="${esc(key)}" ${['dots','percent'].includes(fields.resourceType)?'disabled':''}></label></div>`;
}
function changeOption(target,entries,keyName='id') {
  const dataset=target.dataset,kind=['summonResource','summonInitiative','summonValue','summonMax'].find(key=>Object.hasOwn(dataset,key));
  if(!kind)return null;const entry=entries.find(row=>row[keyName]===dataset[kind]);if(!entry)return null;
  const property={summonResource:'resourceType',summonInitiative:'initiativeMode',summonValue:'resource',summonMax:'resourceMax'}[kind];
  entry[property]=kind==='summonValue'||kind==='summonMax'?Number(target.value):target.value;
  Object.assign(entry,normalizeSummonOptions(entry));return entry;
}

export function bindAbilitySummonSettings(actor, root) {
  if (!root || !game.user.isGM || root.dataset.summonSettingsBound) return;
  root.dataset.summonSettingsBound = 'true';
  const config = actor.getFlag(ID, 'ultimate') ?? {};
  const cost = root.querySelector('[name="skillPointCost"]'), preset = root.querySelector('[data-skill-cost-preset]');
  if (cost && preset) {
    const value = Math.max(0, Math.floor(Number(config.skillPointCost ?? 1) || 0));
    preset.value = value <= 5 ? String(value) : 'custom'; cost.value = value;
    const sync = () => { const custom = preset.value === 'custom'; cost.closest('[data-skill-custom-cost]').hidden = !custom; if (!custom) cost.value = preset.value; };
    preset.addEventListener('change', () => { sync(); cost.dispatchEvent(new Event('change', {bubbles:true})); });
    sync();
  }
  const hpEnabled = root.querySelector('[name="skillHpCostEnabled"]'), hpType = root.querySelector('[name="skillHpCostType"]'), hpBasis = root.querySelector('[name="skillHpCostBasis"]');
  if (hpEnabled && hpType) {
    hpType.value = config.skillHpCostType || 'half'; if (hpBasis) hpBasis.value = config.skillHpCostBasis || 'current';
    const sync = () => {
      root.querySelector('[data-skill-hp-settings]').hidden = !hpEnabled.checked;
      root.querySelectorAll('[data-hp-mode]').forEach(node => { node.hidden = !node.dataset.hpMode.split(' ').includes(hpType.value); });
      const dice = root.querySelector('[name="skillHpCostRoll"]');
      if (dice) { let error = ''; if (hpEnabled.checked && hpType.value === 'roll') { try { parseHpDice(dice.value); } catch (cause) { error = cause.message; } } dice.setCustomValidity(error); root.querySelector('[data-hp-roll-error]').textContent = error; }
    };
    hpEnabled.addEventListener('change', sync); hpType.addEventListener('change', sync);
    root.querySelector('[name="skillHpCostRoll"]')?.addEventListener('input', sync); sync();
  }
  for (const section of root.querySelectorAll('[data-ability-summons]')) {
    const action = section.dataset.abilitySummons, key = `${action}Summons`;
    const defaults={resourceType:action==='skill'?'dots':'none'};
    let settings = normalizeSummons(config[key],defaults), saving = Promise.resolve();
    const enabled = section.querySelector('[data-summons-enabled]'), fields = section.querySelector('[data-summons-fields]'), radius = section.querySelector('[data-summons-radius]'), list = section.querySelector('[data-summons-list]'), add = section.querySelector('[data-summons-actor]');
    enabled.checked = settings.enabled; fields.hidden = !settings.enabled; radius.value = settings.radius;
    add.innerHTML = '<option value="">Choose an existing Actor…</option>' + [...game.actors].sort((a,b)=>a.name.localeCompare(b.name)).map(source => `<option value="${esc(source.uuid || `Actor.${source.id}`)}">${esc(source.name)}</option>`).join('');
    const render = () => {
      list.innerHTML = settings.choices.length ? settings.choices.map((entry,index) => {
        const source = game.actors.get(entry.actorUuid.slice(6));
        return `<li draggable="true" data-summon-row="${esc(entry.id)}"><span class="tsru-summon-grip" title="Drag to reorder">⠿</span><img src="${esc(source?.img || 'icons/svg/mystery-man.svg')}" alt=""><button type="button" data-summon-open="${esc(entry.id)}" class="tsru-summon-name">${esc(source?.name || 'Missing Actor')}<small>${esc(entry.actorUuid)}</small></button><label>Count<input type="number" min="1" max="20" step="1" value="${entry.quantity}" data-summon-count="${esc(entry.id)}" aria-label="Number of ${esc(source?.name || 'creatures')}"></label><button type="button" data-summon-up="${esc(entry.id)}" title="Move up" ${index===0?'disabled':''}>↑</button><button type="button" data-summon-down="${esc(entry.id)}" title="Move down" ${index===settings.choices.length-1?'disabled':''}>↓</button><button type="button" data-summon-remove="${esc(entry.id)}" title="Remove from summon list">×</button>${optionFields(entry,entry.id)}</li>`;
      }).join('') : '<li class="tsru-summon-empty">Drop Actors here to build the summon menu.</li>';
    };
    const save = () => {
      settings = normalizeSummons(settings,defaults); const snapshot = structuredClone(settings);
      saving = saving.then(() => actor.update({[`flags.${ID}.ultimate.${key}`]:snapshot}, {render:false})).catch(error => { ui.notifications.error(`Could not save summons: ${error.message}`); });
      return saving;
    };
    const addActor = async uuid => {
      const source = await fromUuid(uuid);
      if (source?.documentName !== 'Actor' || source.pack || !/^Actor\.[\w-]+$/.test(source.uuid)) return ui.notifications.warn('Drop an existing world Actor from the Actors directory.');
      if (settings.choices.some(entry => entry.actorUuid === source.uuid)) return ui.notifications.info('That Actor is already in this summon list. Adjust its Count to summon more than one.');
      settings.choices.push({id:foundry.utils.randomID(),actorUuid:source.uuid,quantity:1,...normalizeSummonOptions({},defaults)}); render(); await save();
    };
    enabled.addEventListener('change', () => { settings.enabled = enabled.checked; fields.hidden = !settings.enabled; void save(); });
    radius.addEventListener('change', () => { settings.radius = Math.max(0, Math.min(1000, Number(radius.value)||0)); radius.value = settings.radius; void save(); });
    add.addEventListener('change', () => { if(add.value) void addActor(add.value).catch(error=>ui.notifications.error(error.message)); add.value = ''; });
    list.addEventListener('change', event => { if(changeOption(event.target,settings.choices)){render();void save();return;}const id = event.target.dataset.summonCount, entry = settings.choices.find(item=>item.id===id); if(!entry)return; entry.quantity = Math.max(1,Math.min(20,Math.floor(Number(event.target.value)||1))); event.target.value=entry.quantity; void save(); });
    list.addEventListener('click', event => {
      const button = event.target.closest('button'); if(!button)return;
      const {summonOpen:open,summonRemove:remove,summonUp:up,summonDown:down} = button.dataset;
      if(open){game.actors.get(settings.choices.find(item=>item.id===open)?.actorUuid.slice(6))?.sheet?.render(true);return;}
      if(remove)settings.choices=settings.choices.filter(item=>item.id!==remove);
      else if(up||down){const index=settings.choices.findIndex(item=>item.id===(up||down)),next=index+(up?-1:1);if(index<0||next<0||next>=settings.choices.length)return;[settings.choices[index],settings.choices[next]]=[settings.choices[next],settings.choices[index]];}
      else return; render();void save();
    });
    list.addEventListener('dragstart', event => {if(event.target.closest('input,select')){event.preventDefault();return;} const row=event.target.closest('[data-summon-row]'),entry=settings.choices.find(item=>item.id===row?.dataset.summonRow);if(!entry)return;event.stopPropagation();event.dataTransfer.setData('text/plain',JSON.stringify({type:'Actor',uuid:entry.actorUuid,tsruSummonRow:entry.id,tsruSummonAction:action}));event.dataTransfer.effectAllowed='copyMove'; });
    fields.addEventListener('dragover',event=>{event.preventDefault();event.stopPropagation();list.classList.add('is-dragover');});
    fields.addEventListener('dragleave',event=>{if(!fields.contains(event.relatedTarget))list.classList.remove('is-dragover');});
    fields.addEventListener('drop',event=>{
      event.preventDefault();event.stopPropagation();list.classList.remove('is-dragover');
      let data;try{data=JSON.parse(event.dataTransfer.getData('text/plain'));}catch{return;}
      const target=event.target.closest('[data-summon-row]')?.dataset.summonRow;
      if(data.tsruSummonAction===action&&data.tsruSummonRow){const index=settings.choices.findIndex(item=>item.id===data.tsruSummonRow),next=settings.choices.findIndex(item=>item.id===target);if(index<0)return;const [entry]=settings.choices.splice(index,1);settings.choices.splice(next<0?settings.choices.length:next,0,entry);render();void save();return;}
      if(data.type==='Actor')void addActor(data.uuid||`Actor.${data.id}`).catch(error=>ui.notifications.error(error.message));
      else ui.notifications.warn('Drop an Actor from the Actors directory.');
    });
    render();
  }
  bindSpellSummonOptions(actor,root);
}

function bindSpellSummonOptions(actor,root) {
  const host=root.querySelector('[data-ability-summons="skill"]');if(!host)return;
  const saved=actor.getFlag(ID,'summonPreferences')??[],entries=[];
  for(const item of actor.items??[])for(const activity of item.system?.activities??[]) {
    if(activity.type!=='summon')continue;
    for(const profile of activity.profiles??[]) {
      const key=spellSummonKey(activity,profile),existing=saved.find(row=>row.key===key);
      const source=game.actors.get(String(profile.uuid??'').replace(/^Actor\./,''));
      entries.push({key,actorUuid:profile.uuid??'',name:`${item.name} — ${profile.name||source?.name||'Summon'}`,img:source?.img||item.img,...normalizeSummonOptions(existing)});
    }
  }
  for(const entry of saved)if(!entries.some(row=>row.key===entry.key))entries.push({...entry,...normalizeSummonOptions(entry)});
  const section=document.createElement('div');section.dataset.spellSummonSettings='';section.dataset.settingsGroup='';section.dataset.settingKeywords='summon spell invocation resource dots percentage hp initiative';host.append(section);
  const render=()=>{section.innerHTML='<h4>Spell summons</h4><p class="tsru-ability-cost-help">Each spell summon starts with no extra resource and its own initiative. The HP semicircle always follows its live token. These settings also apply when a Skill casts the spell.</p><ul class="tsru-summon-actor-list">'+(entries.length?entries.map(entry=>`<li data-spell-summon-row="${esc(entry.key)}"><img src="${esc(entry.img||'icons/svg/mystery-man.svg')}" alt=""><strong>${esc(entry.name)}</strong>${optionFields(entry,entry.key)}</li>`).join(''):'<li class="tsru-summon-empty">Summon profiles from this character’s spells appear here.</li>')+'</ul>';};
  let saving=Promise.resolve();section.addEventListener('change',event=>{
    const entry=changeOption(event.target,entries,'key');if(!entry)return;
    const snapshot=structuredClone(entry);render();
    saving=saving.then(async()=>{const latest=[...(actor.getFlag(ID,'summonPreferences')??[])],index=latest.findIndex(row=>row.key===snapshot.key);if(index<0)latest.push(snapshot);else latest[index]=snapshot;await actor.update({[`flags.${ID}.summonPreferences`]:latest},{render:false});}).catch(error=>ui.notifications.error(`Could not save spell summon: ${error.message}`));
  });render();
}
