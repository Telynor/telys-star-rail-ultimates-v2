import {PATH_MODULE as ID,isSharedInventory,pathLabels,safePathImage} from './path-change-rules.mjs';
const windows=new Map();let WindowClass;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const image=(url,alt='',className='')=>url?`<img class="${className}" src="${esc(safePathImage(url))}" alt="${esc(alt)}">`:'';
const options=(entries,current,empty)=>`${empty?`<option value="">${esc(empty)}</option>`:''}${entries.map(entry=>`<option value="${esc(entry.id)}" ${entry.id===current?'selected':''}>${esc(entry.name)}</option>`).join('')}`;
function identity(profile) {return `<span class="tsru-path-identity">${image(profile.pathIcon)}<span>${esc(profile.pathName)}</span>${image(profile.elementIcon)}<span>${esc(profile.elementName)}</span></span>`;}

export function renderPathChanger({actor,view,selectedId,sourceActorId,actors=[],context,isGM,manage=false,busy=false,stale=false,drafts=new Map()}) {
  const profiles=view.profiles.filter(profile=>isGM||profile.enabled),selected=profiles.find(profile=>profile.id===selectedId)??profiles.find(profile=>profile.id===view.activeId)??profiles[0];
  const source=isGM?actors.find(entry=>entry.id===sourceActorId):null,sourceConfig=source?.getFlag?.(ID,'ultimate')??{},sourceDetails=pathLabels({pathId:sourceConfig.pathId,elementId:sourceConfig.elementId},context);
  const sourceItems=Array.from(source?.items??[]),canSwitch=selected&&selected.id!==view.activeId&&selected.enabled&&!busy&&!stale&&!view.pending&&(isGM||view.ownerEnabled);
  const disabled=busy?'disabled':'';
  const manager=isGM?`<details class="tsru-path-importer" ${manage?'open':''}><summary>Import and configure Paths</summary><p>Import a build from a separate sheet. The destination keeps its live inventory and currency; the source sheet is untouched.</p>
    <div class="tsru-path-import-fields"><label><span>Import from</span><select data-path-import-from ${disabled}>${options(actors.filter(entry=>entry.id!==actor.id),sourceActorId,'Choose a source character')}</select></label><label><span>Import to</span><select data-path-import-to ${disabled}>${options(actors,actor.id)}</select></label></div>
    <section class="tsru-path-import-preview" data-path-import-drop tabindex="0" aria-label="Drop a source character sheet">${image(sourceConfig.splashImage||source?.img,source?.name??'')}<div><strong>${esc(source?.name||'Choose or drop a character sheet')}</strong>${source?identity(sourceDetails):''}<small>${source?`${sourceItems.filter(i=>!isSharedInventory(i)).length} class, feature and spell documents · ${sourceItems.filter(i=>isSharedInventory(i)&&i.id!==source?.getFlag?.(ID,'selectedLightConeItemId')).length} other source inventory items excluded · equipped Light Cone included`:'Path and Element are read from the source sheet’s HSR settings.'}</small></div><button type="button" data-path-import ${!source||busy||stale||view.pending?'disabled':''}><i class="fas fa-file-import"></i> Import Path</button></section>
    <div class="tsru-path-owner-settings"><label><input type="checkbox" data-path-owner-enabled ${view.ownerEnabled?'checked':''} ${disabled}>Owners can change Paths</label><label><input type="checkbox" data-path-in-combat ${view.allowInCombat?'checked':''} ${disabled}>Allow changes during combat</label><button type="button" data-path-save-settings ${busy||stale||view.pending?'disabled':''}>Save permissions</button></div>
    <div class="tsru-path-config-list">${view.profiles.map(profile=>{const draft={...profile,...drafts.get(profile.id)};return `<article data-path-config-row="${esc(profile.id)}"><header><strong>${esc(profile.name)}</strong><small>${profile.id===view.activeId?'Active Path':profile.original?'Original Path':'Imported Path'}</small></header><div class="tsru-path-config-fields"><label>Name<input data-path-field="name" value="${esc(draft.name)}" maxlength="80" ${disabled}></label><label class="tsru-path-preview-field">Preview art<div><input data-path-field="previewImage" value="${esc(draft.previewImage)}" placeholder="Use imported artwork" ${disabled}><button type="button" data-path-browse="${esc(profile.id)}" aria-label="Browse Path preview artwork" ${disabled}><i class="fas fa-folder-open"></i></button></div></label><label>Path<select data-path-field="pathId" ${disabled}>${options(context.paths,draft.pathId,'Unassigned Path')}</select></label><label>Element<select data-path-field="elementId" ${disabled}>${options(context.elements,draft.elementId,'Unassigned Element')}</select></label></div><footer><label><input type="checkbox" data-path-field="enabled" ${draft.enabled?'checked':''} ${profile.id===view.activeId?'disabled':disabled}>Selectable</label><button type="button" data-path-save="${esc(profile.id)}" ${busy||stale||view.pending?'disabled':''}>Save Path</button><button type="button" data-path-reimport="${esc(profile.id)}" ${profile.original||profile.id===view.activeId||busy||stale||view.pending?'disabled':''}>Reimport source</button><button type="button" data-path-remove="${esc(profile.id)}" ${profile.id===view.activeId||busy||stale||view.pending?'disabled':''}>Remove</button></footer>${profile.warnings?.map(w=>`<p class="tsru-path-warning">${esc(w)}</p>`).join('')??''}</article>`;}).join('')}</div></details>`:'';
  return `<main class="tsru-path-changer"><header class="tsru-path-heading"><div><small>CHARACTER PATHS</small><h1>${esc(actor.name)}</h1><p>Choose a build. Carry the same inventory.</p></div>${isGM?'<button type="button" data-path-manage><i class="fas fa-sliders"></i> Import / Configure</button>':''}</header>
    ${view.pending?`<div class="tsru-path-notice" role="status"><span>${view.pending.error?'A Path change needs recovery. Ask the GM to restore the previous Path.':'A Path change is in progress. If it was interrupted, the GM can restore the previous Path.'}</span>${isGM?`<button type="button" data-path-recover ${disabled}>Restore previous Path</button>`:''}</div>`:''}
    ${stale?'<div class="tsru-path-notice" role="alert">The Path configuration changed. Reload before saving. <button type="button" data-path-reload>Reload Paths</button></div>':''}
    <section class="tsru-path-stage"><div class="tsru-path-art">${selected?image(selected.previewImage||actor.img,selected.name):'<i class="fas fa-route"></i>'}<div>${selected?`<h2>${esc(selected.name)}</h2>${identity(selected)}`:'<h2>No alternate Paths yet</h2>'}</div></div><div class="tsru-path-choices"><h2>Available Paths</h2>${profiles.length?profiles.map(profile=>`<button type="button" class="tsru-path-choice ${profile.id===selected?.id?'is-selected':''}" data-path-choice="${esc(profile.id)}" aria-pressed="${profile.id===selected?.id}" ${busy||!profile.enabled?'disabled':''}>${image(profile.previewImage||actor.img)}<span><strong>${esc(profile.name)}</strong>${identity(profile)}<small>${esc(profile.classes||'HSR ability build')}${profile.level?` · Lv. ${profile.level}`:''}</small><small>${profile.features} features · ${profile.spells} spells</small><small class="tsru-path-cone">Light Cone: ${esc(profile.lightConeNeedsImport?'Assigned on next Path change':profile.lightConeName)}</small></span><b>${profile.id===view.activeId?'ACTIVE':profile.enabled?'':'HIDDEN'}</b></button>`).join(''):`<p>${isGM?'Use Import / Configure to import an alternate character sheet. Your original build will be saved automatically.':'The GM has not added any alternate Paths to this character.'}</p>`}</div></section>
    <footer class="tsru-path-switch-footer"><p>Inventory, item charges and currency stay shared. Light Cone selection follows each Path. Classes, features, spells, HSR abilities, Eidolons and artwork follow the selected Path.</p><button type="button" data-path-switch ${canSwitch?'':'disabled'}><i class="fas fa-route"></i> ${busy?'Applying…':'Change Path'}</button></footer>${manager}</main>`;
}

function makeWindowClass() {
  return class PathChangerApplication extends foundry.applications.api.ApplicationV2 {
    static DEFAULT_OPTIONS={classes:['tsru-path-changing-window'],window:{title:'Change Path',resizable:true},position:{width:1000,height:820}};
    constructor(actor,service,{manage=false}={}) {super({id:`tsru-path-changing-${foundry.utils.randomID()}`});this.actor=actor;this.service=service;this.manage=game.user.isGM&&manage;this.busy=false;this.drafts=new Map();this.reload();}
    reload(view=this.service.view(this.actor)) {this.view=view;this.selectedId=view.activeId||view.profiles[0]?.id||'';this.stale=false;this.drafts.clear();if(game.user.isGM)this.sourceActorId??=this.service.actors().find(actor=>actor.id!==this.actor.id)?.id||'';else{this.sourceActorId='';this.manage=false;}}
    async _renderHTML() {return renderPathChanger({actor:this.actor,view:this.view,selectedId:this.selectedId,sourceActorId:game.user.isGM?this.sourceActorId:'',actors:game.user.isGM?this.service.actors():[],context:this.service.context(),isGM:game.user.isGM,manage:this.manage,busy:this.busy,stale:this.stale,drafts:this.drafts});}
    _replaceHTML(html,content){content.innerHTML=html;}
    async commit(action,payload={}) {
      if(this.busy)return;
      if(action!=='switch'&&!game.user.isGM){ui.notifications.error('Only the GM can import or configure Paths.');return;}
      // Recovery uses the live transaction even if an old configuration draft
      // was left open before another client changed the character's Path.
      if(action==='recover')this.reload();
      this.busy=true;await this.render({force:false});
      try {
        const result=await this.service.request(action,this.actor,{...payload,revision:this.view.revision});this.reload(result);
        ui.notifications.info(action==='switch'?'Path changed. Inventory is shared.':action==='import'?'Path imported. Its Path and Element were read from the source sheet.':action==='recover'?'The previous Path was restored.':'Path configuration saved.');
      }catch(error) {ui.notifications.error(error.message);this.view=this.service.view(this.actor);this.stale=false;}
      finally {this.busy=false;await this.render({force:false});}
    }
    refresh({deleted=false}={}) {
      if(deleted){void this.close();return;}if(this.busy)return;
      const view=this.service.view(this.actor);
      if(view.revision!==this.view.revision&&(this.drafts.size||this.selectedId!==this.view.activeId)) {
        this.stale=true;this.view={...this.view,pending:view.pending};
      }else {
        const selected=this.selectedId,followActive=selected===this.view.activeId;this.view=view;
        if(followActive||!view.profiles.some(p=>p.id===selected))this.selectedId=view.activeId;
      }
      if(this.rendered)void this.render({force:false});
    }
    _onRender(context,opts) {
      super._onRender(context,opts);const root=this.element;
      for(const button of root.querySelectorAll('[data-path-choice]'))button.addEventListener('click',()=>{this.selectedId=button.dataset.pathChoice;void this.render({force:false});});
      root.querySelector('[data-path-switch]')?.addEventListener('click',()=>void this.commit('switch',{profileId:this.selectedId}));
      root.querySelector('[data-path-reload]')?.addEventListener('click',()=>{this.reload();void this.render({force:false});});
      // Player windows bind only their selector, switch and reload controls.
      // No importer, drop target, editing or recovery handlers are installed.
      if(!game.user.isGM)return;
      const details=root.querySelector('.tsru-path-importer');details?.addEventListener('toggle',()=>{if(details.isConnected)this.manage=details.open;});
      root.querySelector('[data-path-manage]')?.addEventListener('click',()=>{this.manage=!this.manage;void this.render({force:false});});
      root.querySelector('[data-path-recover]')?.addEventListener('click',()=>void this.commit('recover'));
      root.querySelector('[data-path-import-from]')?.addEventListener('change',event=>{this.sourceActorId=event.currentTarget.value;void this.render({force:false});});
      root.querySelector('[data-path-import-to]')?.addEventListener('change',event=>{
        const actor=this.service.actors().find(actor=>actor.id===event.currentTarget.value);if(!actor)return;const other=windows.get(actor.uuid);if(other&&other!==this){other.manage=true;other.bringToFront();void other.render({force:false});void this.close();return;}
        windows.delete(this.actor.uuid);this.actor=actor;windows.set(actor.uuid,this);this.reload();
        if(this.sourceActorId===actor.id)this.sourceActorId=this.service.actors().find(entry=>entry.id!==actor.id)?.id||'';
        void this.render({force:false});
      });
      root.querySelector('[data-path-import]')?.addEventListener('click',()=>void this.commit('import',{sourceActorId:this.sourceActorId}));
      root.querySelector('[data-path-save-settings]')?.addEventListener('click',()=>void this.commit('settings',{ownerEnabled:root.querySelector('[data-path-owner-enabled]').checked,allowInCombat:root.querySelector('[data-path-in-combat]').checked}));
      const drop=root.querySelector('[data-path-import-drop]');
      drop?.addEventListener('dragover',event=>{event.preventDefault();drop.classList.add('is-dragover');});drop?.addEventListener('dragleave',()=>drop.classList.remove('is-dragover'));
      drop?.addEventListener('drop',async event=>{
        event.preventDefault();drop.classList.remove('is-dragover');
        try{const data=JSON.parse(event.dataTransfer.getData('text/plain'));if(data.type!=='Actor')throw Error('Drop a character sheet from the Actors directory.');const source=await fromUuid(data.uuid||`Actor.${data.id}`);if(!source||source.id===this.actor.id||!this.service.actors().includes(source))throw Error('Drop a different world character sheet.');this.sourceActorId=source.id;void this.render({force:false});}catch(error){ui.notifications.error(error.message);}
      });
      for(const row of root.querySelectorAll('[data-path-config-row]')) {
        const read=()=>Object.fromEntries([...row.querySelectorAll('[data-path-field]')].map(input=>[input.dataset.pathField,input.type==='checkbox'?input.checked:input.value]));
        for(const input of row.querySelectorAll('[data-path-field]'))input.addEventListener('input',()=>this.drafts.set(row.dataset.pathConfigRow,read()));
        row.querySelector('[data-path-save]')?.addEventListener('click',()=>void this.commit('update',{profileId:row.dataset.pathConfigRow,...read()}));
        row.querySelector('[data-path-reimport]')?.addEventListener('click',()=>void this.commit('reimport',{profileId:row.dataset.pathConfigRow}));
        row.querySelector('[data-path-remove]')?.addEventListener('click',()=>void this.commit('remove',{profileId:row.dataset.pathConfigRow}));
        row.querySelector('[data-path-browse]')?.addEventListener('click',()=>{
          const Picker=foundry.applications.apps.FilePicker.implementation??foundry.applications.apps.FilePicker,input=row.querySelector('[data-path-field="previewImage"]');
          new Picker({type:'image',current:input.value,callback:path=>{input.value=path;this.drafts.set(row.dataset.pathConfigRow,read());}}).browse();
        });
      }
    }
    _onClose(opts){super._onClose(opts);if(windows.get(this.actor.uuid)===this)windows.delete(this.actor.uuid);}
  };
}
export function openPathChangeWindow(actor,service,opts={}) {
  const existing=windows.get(actor.uuid);if(existing){if(opts.manage&&game.user.isGM)existing.manage=true;existing.bringToFront();void existing.render({force:false});return existing;}
  WindowClass??=makeWindowClass();const app=new WindowClass(actor,service,opts);windows.set(actor.uuid,app);void app.render({force:true});return app;
}
export function refreshPathChangeWindows(actor,opts={}) {for(const app of windows.values())if(!actor||app.actor.uuid===actor.uuid)app.refresh(opts);}
