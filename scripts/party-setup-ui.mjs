import {PARTY_ID as ID,slotsOf,availablePartyActors,protectedPartyIds,partyIssues,choosePartySlot,swapPartySlots,selectedCharacterId,partyArtworkFor,normalizePartyArtwork,actorById,actorList,characterConfig} from './party-setup-rules.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let partyWindow,artworkWindow,PartyWindowClass,ArtworkWindowClass;
const notify=error=>ui.notifications.error(error.message??String(error));
const artStyle=art=>`--party-art-x:${art.x}%;--party-art-y:${art.y}%;--party-art-scale:${art.scale/100};--party-art-flip:${art.flip?-1:1}`;
const memberName=(id,actors)=>actorById(actors,id)?.name||(id?'Missing character':'Empty slot');

export function partySetupModel({state,slots=state.slots,context,user,activeCharacterId='',stale=false,busy=false,requirementsDirty=false}){
  const candidates=availablePartyActors(state,context,user),protectedIds=user.isGM?new Set():protectedPartyIds(state,context);
  const currentId=selectedCharacterId(user,context.selections)||activeCharacterId,activeIndex=slots.indexOf(currentId);
  const errors=partyIssues(slots,state,context,user);
  return {state,slots,context,user,candidates,protectedIds,currentId,activeIndex,stale,busy,requirementsDirty,errors,canLock:!busy&&!stale&&!requirementsDirty&&!errors.length,
    requirements:state.requiredActorIds.map(id=>({id,name:memberName(id,context.actors),present:slots.includes(id)&&Boolean(actorById(context.actors,id))})),
    cards:slots.map((id,index)=>{const actor=actorById(context.actors,id);return {id,index,actor,name:memberName(id,context.actors),active:id===currentId,art:partyArtworkFor(actor,index),options:[{id:'',name:'Empty slot'},...candidates.map(actor=>({id:actor.id,name:actor.name}))].map(option=>({...option,selected:option.id===id,disabled:!user.isGM&&[...protectedIds].some(id=>!choosePartySlot(slots,index,option.id).includes(id))}))};})};
}
export function renderPartySetup(model,{requirementsEnabled=model.state.requirementsEnabled,requiredSlots=slotsOf(model.state.requiredActorIds),requiresExpanded=false}={}){
  const {user,state,context,errors}=model;
  const requireSummary=model.requirements.map(entry=>`<span class="tsru-party-requirement ${entry.present?'is-met':'is-missing'}" data-required-actor="${esc(entry.id)}"><i class="fas ${entry.present?'fa-check-circle':'fa-circle'}"></i>${esc(entry.name)}</span>`).join('');
  const gmRequires=user.isGM?`<details class="tsru-party-requires-editor" ${requiresExpanded?'open':''}><summary><i class="fas fa-lock"></i> Party Requires <small>GM configuration</small></summary><label class="tsru-party-requires-toggle"><input type="checkbox" data-party-requires-enabled ${requirementsEnabled?'checked':''}>Require these characters before anyone can lock in a lineup</label><div class="tsru-party-requires-slots">${requiredSlots.map((id,index)=>{const actor=actorById(context.actors,id);return `<div class="tsru-party-requires-drop ${id?'is-filled':''}" data-party-required-slot="${index}">${id?`<img src="${esc(actor?.img||'icons/svg/mystery-man.svg')}" alt=""><strong>${esc(memberName(id,context.actors))}</strong><button type="button" data-party-clear-requirement="${index}" aria-label="Remove ${esc(memberName(id,context.actors))} requirement">×</button>`:`<i class="fas fa-user-plus"></i><span>Drop character sheet</span><small>Requirement ${index+1}</small>`}</div>`;}).join('')}</div><button type="button" class="tsru-party-save-requires" data-party-save-requirements ${model.busy||!model.requirementsDirty||model.stale?'disabled':''}>Save Party Requires</button><small>Toggle off to keep the list without enforcing it.</small></details>`:'';
  return `<main class="tsru-party-setup"><header class="tsru-party-heading"><div class="tsru-party-emblem" aria-hidden="true"><i class="fas fa-users"></i></div><div><small>SHARED LINEUP</small><h1>Party Setup</h1></div>${user.isGM?'<button type="button" data-party-open-artwork><i class="fas fa-image"></i> Configure slot artwork</button>':''}</header><div class="tsru-party-requires-summary ${state.requirementsEnabled?'is-enabled':'is-disabled'}"><span><i class="fas fa-${state.requirementsEnabled?'lock':'unlock'}"></i> Party Requires${state.requirementsEnabled?'':' · Off'}</span>${requireSummary||'<small>No required characters assigned</small>'}</div>
    ${model.stale?'<div class="tsru-party-notice is-error" role="alert">Someone changed the shared party. Your draft is preserved. <button type="button" data-party-reload>Reload current party</button></div>':''}
    <section class="tsru-party-stage" aria-label="Four party positions">${model.cards.map(card=>`<article class="tsru-party-position tsru-party-position-${card.index+1} ${card.active?'is-active-character':''} ${card.id?'':'is-empty'}" data-party-position="${card.index+1}"><span class="tsru-party-position-number">0${card.index+1}</span><div class="tsru-party-character-art" style="${artStyle(card.art)}">${card.id?`<img src="${esc(card.art.image)}" alt="${esc(card.name)} — position ${card.index+1}">`:'<i class="fas fa-plus" aria-hidden="true"></i>'}</div><div class="tsru-party-nameplate"><h2>${esc(card.name)}</h2><small>${card.active?'Your active character':card.actor?esc(characterConfig(card.actor).pathId||'Party member'):'Choose a character'}</small></div><label class="tsru-party-position-select"><span>Position ${card.index+1}</span><select data-party-slot="${card.index}" aria-label="Position ${card.index+1} character" ${model.busy?'disabled':''}>${card.options.map(option=>`<option value="${esc(option.id)}" ${option.selected?'selected':''} ${option.disabled?'disabled':''}>${esc(option.name)}</option>`).join('')}</select></label>${user.isGM&&card.actor?`<button type="button" class="tsru-party-art-shortcut" data-party-artwork="${esc(card.id)}" title="Configure ${esc(card.name)} artwork for all four positions"><i class="fas fa-image"></i></button>`:''}</article>`).join('')}</section>
    ${gmRequires}<footer class="tsru-party-footer"><div class="tsru-party-swap"><label>${user.isGM?'From position':'Active character'}${user.isGM?`<select data-party-swap-from aria-label="Swap from position">${model.cards.map(card=>`<option value="${card.index}">${card.index+1} · ${esc(card.name)}</option>`).join('')}</select>`:`<strong>${esc(memberName(model.currentId,context.actors))}</strong>`}</label><label>Swap with<select data-party-swap-to aria-label="Swap with position">${model.cards.map(card=>`<option value="${card.index}" ${card.index===(model.activeIndex===0?1:0)?'selected':''} ${!user.isGM&&card.index===model.activeIndex?'disabled':''}>${card.index+1} · ${esc(card.name)}</option>`).join('')}</select></label><button type="button" data-party-swap ${model.busy||!user.isGM&&model.activeIndex<0?'disabled':''}><i class="fas fa-exchange-alt"></i> Swap slots</button></div><div class="tsru-party-lock"><small>Shared across the party · sets combat HUD order</small><button type="button" data-party-lock ${model.canLock?'':'disabled'}><i class="fas fa-check"></i> ${model.busy?'Saving…':'Lock in changes'}</button></div></footer><div class="tsru-party-validation" aria-live="polite">${model.requirementsDirty?'<p>Save Party Requires before locking in the lineup.</p>':''}${errors.map(message=>`<p role="status">${esc(message)}</p>`).join('')}${!errors.length&&!model.stale&&!model.requirementsDirty?'<p class="is-ready">Ready to lock in. Moving a character into an occupied position swaps both slots.</p>':''}</div></main>`;
}
async function actorFromDrop(event){
  const raw=event.dataTransfer?.getData('text/plain')||'';let data;try{data=JSON.parse(raw);}catch{throw Error('Drag a character sheet from the Actors directory.');}
  const uuid=data.uuid||(data.type==='Actor'&&data.id?`Actor.${data.id}`:'');
  const actor=uuid?await fromUuid(uuid):null;
  if(actor?.documentName!=='Actor'||actor.type!=='character'||game.actors.get(actor.id)!==actor)throw Error('Drop a world character sheet. NPCs, Items and compendium entries cannot occupy party slots.');
  return actor;
}
function makePartyWindowClass(){
  return class PartySetupApplication extends foundry.applications.api.ApplicationV2 {
    static DEFAULT_OPTIONS={id:'tsru-party-setup',classes:['tsru-party-setup-window'],window:{title:'Party Setup',resizable:true},position:{width:1180,height:820}};
    constructor(service){super({id:'tsru-party-setup'});this.service=service;this.busy=false;this.reload();}
    reload(){this.base=this.service.getState();this.slots=[...this.base.slots];this.requiredSlots=slotsOf(this.base.requiredActorIds);this.requirementsEnabled=this.base.requirementsEnabled;this.dirty=false;this.requirementsDirty=false;this.stale=false;}
    model(){return partySetupModel({state:this.base,slots:this.slots,context:this.service.getContext(),user:game.user,activeCharacterId:this.service.getSelectedCharacter?.()?.id,stale:this.stale,busy:this.busy,requirementsDirty:this.requirementsDirty});}
    async _renderHTML(){return renderPartySetup(this.model(),this);}
    _replaceHTML(html,content){content.innerHTML=html;}
    refresh({artworkOnly=false}={}){
      if(this.busy)return;
      const current=this.service.getState();
      if(current.revision!==this.base.revision){if(this.dirty||this.requirementsDirty)this.stale=true;else this.reload();}
      else if(!artworkOnly&&!this.dirty&&!this.requirementsDirty)this.reload();
      if(this.rendered)this.render({force:false});
    }
    async commit(action,payload){
      if(this.busy)return;this.busy=true;this.render({force:false});
      const draftSlots=[...this.slots],hadLineupDraft=this.dirty;
      try{await this.service.request(action,{...payload,revision:this.base.revision});this.reload();if(action==='requirements'&&hadLineupDraft){this.slots=draftSlots;this.dirty=true;}ui.notifications.info(action==='requirements'?'Party Requires updated.':'Party lineup locked in for everyone.');}
      catch(error){notify(error);if(this.service.getState().revision!==this.base.revision)this.stale=true;}
      finally{this.busy=false;this.render({force:false});}
    }
    _onRender(context,options){
      super._onRender(context,options);const root=this.element;
      root.querySelector('details')?.addEventListener('toggle',event=>{if(event.currentTarget.isConnected)this.requiresExpanded=event.currentTarget.open;});
      for(const select of root.querySelectorAll('[data-party-slot]'))select.addEventListener('change',()=>{this.slots=choosePartySlot(this.slots,Number(select.dataset.partySlot),select.value);this.dirty=true;this.render({force:false});});
      root.querySelector('[data-party-reload]')?.addEventListener('click',()=>{this.reload();this.render({force:false});});
      root.querySelector('[data-party-lock]')?.addEventListener('click',()=>{if(this.model().canLock)void this.commit('lineup',{slots:this.slots});});
      root.querySelector('[data-party-swap]')?.addEventListener('click',()=>{const from=game.user.isGM?Number(root.querySelector('[data-party-swap-from]').value):this.model().activeIndex,to=Number(root.querySelector('[data-party-swap-to]').value);if(from<0)return;this.slots=swapPartySlots(this.slots,from,to);this.dirty=true;this.render({force:false});});
      root.querySelector('[data-party-open-artwork]')?.addEventListener('click',()=>{const actor=game.actors.get(this.slots.find(Boolean))??actorList(game.actors).find(actor=>actor.type==='character');if(actor)openPartyArtworkWindow(actor,this.service);else ui.notifications.warn('Create a character sheet first.');});
      for(const button of root.querySelectorAll('[data-party-artwork]'))button.addEventListener('click',()=>openPartyArtworkWindow(game.actors.get(button.dataset.partyArtwork),this.service));
      root.querySelector('[data-party-requires-enabled]')?.addEventListener('change',event=>{this.requirementsEnabled=event.currentTarget.checked;this.requirementsDirty=true;this.render({force:false});});
      root.querySelector('[data-party-save-requirements]')?.addEventListener('click',()=>void this.commit('requirements',{requirementsEnabled:this.requirementsEnabled,requiredActorIds:this.requiredSlots.filter(Boolean)}));
      for(const button of root.querySelectorAll('[data-party-clear-requirement]'))button.addEventListener('click',()=>{this.requiredSlots[Number(button.dataset.partyClearRequirement)]='';this.requirementsDirty=true;this.render({force:false});});
      for(const zone of root.querySelectorAll('[data-party-required-slot]')){
        zone.addEventListener('dragover',event=>{if(game.user.isGM){event.preventDefault();zone.classList.add('is-dragover');}});
        zone.addEventListener('dragleave',()=>zone.classList.remove('is-dragover'));
        zone.addEventListener('drop',async event=>{event.preventDefault();zone.classList.remove('is-dragover');if(!game.user.isGM)return;try{const actor=await actorFromDrop(event);this.requiredSlots=choosePartySlot(this.requiredSlots,Number(zone.dataset.partyRequiredSlot),actor.id);this.requirementsDirty=true;await this.render({force:false});this.element.querySelector('details')?.setAttribute('open','');}catch(error){notify(error);}});
      }
    }
    _onClose(options){super._onClose(options);if(partyWindow===this)partyWindow=null;}
  };
}

export function renderPartyArtwork(actor,draft,actors){
  return `<main class="tsru-party-artwork-editor"><header><h1>Four positions. Four artworks.</h1><p>Each position uses its own image for this character. Choose uploaded images, paste paths, or drop artwork from an Actor or Item.</p><label>Character<select data-party-art-actor>${actorList(actors).filter(actor=>actor.type==='character').sort((a,b)=>a.name.localeCompare(b.name)).map(entry=>`<option value="${esc(entry.id)}" ${actor.id===entry.id?'selected':''}>${esc(entry.name)}</option>`).join('')}</select></label></header><section class="tsru-party-artwork-grid">${draft.map((entry,index)=>`<article class="tsru-party-artwork-card" data-party-art-card="${index}"><h2>Position ${index+1}</h2><div class="tsru-party-artwork-preview tsru-party-position-${index+1}" data-party-art-drop="${index}"><div class="tsru-party-character-art" style="${artStyle(entry)}"><img data-party-art-preview="${index}" src="${esc(entry.image||actor.img||'icons/svg/mystery-man.svg')}" alt="${esc(actor.name)} position ${index+1}"></div></div><label>Image path<input type="text" data-party-art-field="image" data-party-art-index="${index}" value="${esc(entry.image)}" placeholder="Use character portrait"></label><button type="button" data-party-art-browse="${index}"><i class="fas fa-folder-open"></i> Browse image</button><div class="tsru-party-art-adjustments">${[['x','Image X',0,100],['y','Image Y',0,100],['scale','Scale %',25,250]].map(([key,label,min,max])=>`<label>${label}<input type="number" min="${min}" max="${max}" data-party-art-field="${key}" data-party-art-index="${index}" value="${entry[key]}"></label>`).join('')}<label class="tsru-party-art-flip"><input type="checkbox" data-party-art-field="flip" data-party-art-index="${index}" ${entry.flip?'checked':''}>Flip</label></div></article>`).join('')}</section><footer><button type="button" data-party-art-save><i class="fas fa-check"></i> Save ${esc(actor.name)} artwork</button><small>Artwork is stored per character. Swapping slots chooses the corresponding image automatically.</small></footer></main>`;
}
function makeArtworkWindowClass(){
  return class PartyArtworkApplication extends foundry.applications.api.ApplicationV2 {
    static DEFAULT_OPTIONS={classes:['tsru-party-artwork-window'],window:{title:'Party Slot Artwork',resizable:true},position:{width:1080,height:740}};
    constructor(actor,service){super({id:`tsru-party-artwork-${actor.id}`});this.actor=actor;this.service=service;this.drafts=new Map();this.saved();}
    saved(){this.draft=normalizePartyArtwork(this.actor.getFlag(ID,'partySetupArtwork'));this.drafts.set(this.actor.id,this.draft);}
    async _renderHTML(){return renderPartyArtwork(this.actor,this.draft,game.actors);}
    _replaceHTML(html,content){content.innerHTML=html;}
    preview(index){const entry=normalizePartyArtwork(this.draft)[index],image=this.element.querySelector(`[data-party-art-preview="${index}"]`);if(!image)return;image.src=entry.image||this.actor.img||'icons/svg/mystery-man.svg';image.parentElement.setAttribute('style',artStyle(entry));}
    _onRender(context,options){
      super._onRender(context,options);const root=this.element;
      root.querySelector('[data-party-art-actor]').addEventListener('change',event=>this.selectActor(game.actors.get(event.currentTarget.value)));
      for(const input of root.querySelectorAll('[data-party-art-field]'))input.addEventListener('input',()=>{const index=Number(input.dataset.partyArtIndex),key=input.dataset.partyArtField;this.draft[index][key]=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;this.preview(index);});
      const setImage=(index,path)=>{this.draft[index].image=path;root.querySelector(`[data-party-art-field="image"][data-party-art-index="${index}"]`).value=path;this.preview(index);};
      for(const button of root.querySelectorAll('[data-party-art-browse]'))button.addEventListener('click',()=>{const index=Number(button.dataset.partyArtBrowse),Picker=foundry.applications.apps.FilePicker.implementation??foundry.applications.apps.FilePicker;new Picker({type:'image',current:this.draft[index].image,callback:path=>setImage(index,path)}).browse();});
      for(const zone of root.querySelectorAll('[data-party-art-drop]')){
        zone.addEventListener('dragover',event=>event.preventDefault());
        zone.addEventListener('drop',async event=>{event.preventDefault();try{const raw=event.dataTransfer.getData('text/plain');let data;try{data=JSON.parse(raw);}catch{data={path:event.dataTransfer.getData('text/uri-list')||raw};}const doc=data.uuid?await fromUuid(data.uuid):null,path=doc?.img||data.path||data.src||data.texture?.src;if(!path)throw Error('Drop an image path, Actor or Item, or choose an uploaded image with Browse.');setImage(Number(zone.dataset.partyArtDrop),path);}catch(error){notify(error);}});
      }
      root.querySelector('[data-party-art-save]').addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{await this.service.saveArtwork(this.actor,this.draft);this.saved();ui.notifications.info(`${this.actor.name} party artwork saved.`);}catch(error){notify(error);}finally{button.disabled=false;}});
    }
    selectActor(actor){this.actor=actor;this.draft=this.drafts.get(actor.id)??normalizePartyArtwork(actor.getFlag(ID,'partySetupArtwork'));this.drafts.set(actor.id,this.draft);this.render({force:false});}
    _onClose(options){super._onClose(options);if(artworkWindow===this)artworkWindow=null;}
  };
}
export function openPartySetupWindow(service){
  if(partyWindow){partyWindow.bringToFront();return partyWindow;}
  PartyWindowClass??=makePartyWindowClass();partyWindow=new PartyWindowClass(service);partyWindow.render({force:true});return partyWindow;
}
export function openPartyArtworkWindow(actor,service){
  if(!game.user.isGM){ui.notifications.warn('Only the GM can configure party artwork.');return null;}
  if(!actor||actor.type!=='character')return null;
  if(artworkWindow){artworkWindow.selectActor(actor);artworkWindow.bringToFront();return artworkWindow;}
  ArtworkWindowClass??=makeArtworkWindowClass();artworkWindow=new ArtworkWindowClass(actor,service);artworkWindow.render({force:true});return artworkWindow;
}
export function refreshPartySetupWindows(options){partyWindow?.refresh(options);}
