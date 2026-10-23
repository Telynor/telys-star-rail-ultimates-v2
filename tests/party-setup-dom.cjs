const assert=require('node:assert/strict'),{JSDOM}=require(process.env.JSDOM_MODULE||'jsdom'),fs=require('node:fs/promises'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const dom=new JSDOM('<!doctype html><html><body><aside id="hud"></aside></body></html>'),ID='telys-star-rail-ultimates';
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,Event:dom.window.Event});
 const hooks=new Map();globalThis.Hooks={on(name,fn){const list=hooks.get(name)||[];list.push(fn);hooks.set(name,list)},callAll(name,...args){for(const fn of hooks.get(name)||[])fn(...args)}};
 class App{
  constructor(options){this.options=options;this.rendered=false;this.element=document.createElement('section');this.element.className='application '+this.constructor.DEFAULT_OPTIONS.classes.join(' ');this.element.innerHTML='<div class="window-content"></div>';}
  async render(){if(!this.element.isConnected)document.body.append(this.element);const html=await this._renderHTML();this._replaceHTML(html,this.element.querySelector('.window-content'));this.rendered=true;this._onRender({},{});return this;}
  _onRender(){} _onClose(){}bringToFront(){}async close(){this.rendered=false;this.element.remove();this._onClose({});}
 }
 const gm={id:'gm',isGM:true,active:true},alice={id:'alice',isGM:false,active:true},ben={id:'ben',isGM:false,active:true};
 const collection=rows=>{rows.get=id=>rows.find(row=>row.id===id);return rows};
 const actors=collection(['a','b','c','d','e'].map(id=>({id,uuid:'Actor.'+id,documentName:'Actor',type:'character',name:id.toUpperCase(),img:id+'.png',flags:{[ID]:{ultimate:{mainParty:id!=='e'}}},getFlag(scope,key){return this.flags[scope]?.[key]},async setFlag(scope,key,value){(this.flags[scope]??={})[key]=structuredClone(value);Hooks.callAll('updateActor',this,{flags:{[scope]:{[key]:value}}});},testUserPermission(user,level){return user?.isGM||level==='OBSERVER'||user?.id===(id==='a'?'alice':'ben')},async update(changes){if(Object.hasOwn(changes,`flags.${ID}.ultimate.mainParty`))this.flags[ID].ultimate.mainParty=changes[`flags.${ID}.ultimate.mainParty`];}})));
 const settings={partySetup:{configured:true,revision:1,slots:['a','b','c','d'],requiredActorIds:[],requirementsEnabled:false},partySelections:{alice:'a',ben:'b'}};
 globalThis.game={user:gm,users:collection([gm,alice,ben]),actors,settings:{get:(_,key)=>settings[key],async set(_,key,value){settings[key]=structuredClone(value);Hooks.callAll('updateSetting',{key:ID+'.'+key});}},socket:{on(){},emit(){}}};
 globalThis.foundry={utils:{randomID:()=>String(Math.random())},applications:{api:{ApplicationV2:App},apps:{FilePicker:class{constructor(options){this.options=options}browse(){this.options.callback('picked.png')}}}}};
 const notices=[];globalThis.ui={notifications:{error:m=>notices.push(m),warn:m=>notices.push(m),info:m=>notices.push(m)}};
 globalThis.fromUuid=async uuid=>actors.find(actor=>actor.uuid===uuid)||null;
 const root=path.resolve(__dirname,'..'),module=await import(pathToFileURL(path.join(root,'scripts/party-setup.mjs')));
 const api={refreshCombatPartyHud:()=>{document.querySelector('#hud').textContent=settings.partySetup.slots.join(',')}};module.installPartySetup(api);
 const settle=async()=>{for(let i=0;i<12;i++)await new Promise(setImmediate)};
 const change=async(selector,value)=>{const input=document.querySelector(selector);assert.ok(input,selector);if(input.type==='checkbox')input.checked=value;else input.value=value;input.dispatchEvent(new Event('change',{bubbles:true}));await settle()};
 const app=api.openPartySetup();await settle();assert.equal(document.querySelectorAll('[data-party-slot]').length,4);
 await change('[data-party-slot="0"]','c');assert.deepEqual(app.slots,['c','b','a','d']);assert.deepEqual(settings.partySetup.slots,['a','b','c','d']);
 const drop=document.querySelector('[data-party-required-slot="0"]'),event=new Event('drop',{bubbles:true,cancelable:true});Object.defineProperty(event,'dataTransfer',{value:{getData:()=>JSON.stringify({type:'Actor',uuid:'Actor.e'})}});drop.dispatchEvent(event);await settle();
 await change('[data-party-requires-enabled]',true);document.querySelector('[data-party-save-requirements]').click();await settle();
 assert.deepEqual(app.slots,['c','b','a','d'],'saving requirements preserves a separately edited lineup draft');assert.equal(settings.partySetup.requirementsEnabled,true);assert.deepEqual(settings.partySetup.requiredActorIds,['e']);assert.equal(document.querySelector('[data-party-lock]').disabled,true);
 await change('[data-party-slot="3"]','e');assert.equal(document.querySelector('[data-party-lock]').disabled,false);document.querySelector('[data-party-lock]').click();await settle();
 assert.deepEqual(settings.partySetup.slots,['c','b','a','e']);assert.equal(document.querySelector('#hud').textContent,'c,b,a,e');
 await change('[data-party-slot="0"]','b');const draft=[...app.slots];settings.partySetup={...settings.partySetup,revision:settings.partySetup.revision+1,slots:['e','b','a','c']};Hooks.callAll('updateSetting',{key:ID+'.partySetup'});await settle();
 assert.deepEqual(app.slots,draft);assert.equal(document.querySelector('[data-party-lock]').disabled,true);assert.ok(document.querySelector('[data-party-reload]'));document.querySelector('[data-party-reload]').click();await settle();assert.deepEqual(app.slots,['e','b','a','c']);
 await app.close();game.user=alice;const player=api.openPartySetup();await settle();assert.equal(document.querySelector('[data-party-requires-enabled]'),null);assert.equal(document.querySelector('[data-party-artwork]'),null);assert.equal(document.querySelector('[data-party-slot="2"] option[value=""]').disabled,true);
 await change('[data-party-swap-to]','0');document.querySelector('[data-party-swap]').click();await settle();assert.equal(player.slots[0],'a');assert.equal(player.slots.includes('b'),true);await player.close();
 game.user=gm;const artwork=api.openPartyArtwork(actors.get('a'));await settle();assert.equal(document.querySelectorAll('[data-party-art-field="image"]').length,4);
 for(let i=0;i<4;i++){const input=document.querySelector(`[data-party-art-index="${i}"][data-party-art-field="image"]`);input.value=`a-position-${i+1}.png`;input.dispatchEvent(new Event('input',{bubbles:true}));}
 document.querySelector('[data-party-art-save]').click();await settle();assert.deepEqual(actors.get('a').getFlag(ID,'partySetupArtwork').map(entry=>entry.image),['a-position-1.png','a-position-2.png','a-position-3.png','a-position-4.png']);
 await change('[data-party-art-actor]','b');assert.equal(artwork.actor.id,'b');await change('[data-party-art-actor]','a');assert.equal(document.querySelector('[data-party-art-index="3"][data-party-art-field="image"]').value,'a-position-4.png');
 document.querySelector('[data-party-art-browse="2"]').click();assert.equal(document.querySelector('[data-party-art-index="2"][data-party-art-field="image"]').value,'picked.png');
 const {validateHelp}=await import(pathToFileURL(path.join(root,'scripts/help-data.mjs'))),{describeHelp}=await import(pathToFileURL(path.join(root,'scripts/help-tooltips.mjs'))),help=validateHelp(JSON.parse(await fs.readFile(path.join(root,'docs/manual.json'))),JSON.parse(await fs.readFile(path.join(root,'docs/controls.json'))));
 for(const node of document.querySelectorAll('.tsru-party-artwork-editor button,.tsru-party-artwork-editor input,.tsru-party-artwork-editor select')){const entry=describeHelp(node,help);assert.ok(entry&&!entry.fallback,node.outerHTML);}
 assert.deepEqual(notices.filter(message=>/failed|rejected|error/i.test(message)),[]);await artwork.close();dom.window.close();
 console.log('PASS: actual Party Setup Application controls, occupied-slot swaps, four Actor requirements, preserved lineup drafts, lock gating, shared HUD refresh, stale reload, player controls, four artwork fields, file picker and authored help.');
})().catch(error=>{console.error(error);process.exitCode=1});
