const assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
(async()=>{
 const dom=new JSDOM('<!doctype html><html><body><section id="sheet"><header class="window-header"><div class="window-controls"></div></header><img class="profile" src="hero.png"></section></body></html>');
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,Event:dom.window.Event,HTMLElement:dom.window.HTMLElement});
 const {pathWorld,ID,HookApi,collection}=await import('./helpers/path-world.mjs'),w=pathWorld();
 class App{get form(){return this.element?.tagName==='FORM'?this.element:null;}constructor(opts){this.options=opts;this.element=document.createElement('section');this.element.className='application '+this.constructor.DEFAULT_OPTIONS.classes.join(' ');this.element.innerHTML='<header class="window-header"></header><div class="window-content"></div>';}async render(){if(!this.element.isConnected)document.body.append(this.element);const html=await this._renderHTML();this._replaceHTML(html,this.element.querySelector('.window-content'));this.rendered=true;this._onRender({},{});return this;}_onRender(){}_onClose(){}bringToFront(){}async close(){this.rendered=false;this.element.remove();this._onClose({});}}
 foundry.applications={api:{ApplicationV2:App},apps:{FilePicker:class{constructor(opts){this.opts=opts}browse(){this.opts.callback('picked-art.webp')}}}};
 w.settings.outfitLibrary={revision:0,outfits:[]};game.settings.set=async(_id,key,value)=>{w.settings[key]=structuredClone(value);HookApi.callAll('updateSetting',{key:ID+'.'+key});return value;};
 const ticket={documentName:'Item',id:'ticket',uuid:'Item.ticket',name:'Gala ticket',img:'ticket.png',type:'loot'};game.items=collection([ticket]);globalThis.fromUuid=async uuid=>uuid===ticket.uuid?ticket:null;
 const mod=await import('../scripts/outfits.mjs');mod.installOutfits({},{});const sheet={document:w.hero,element:document.querySelector('#sheet')};w.hero.apps.sheet=sheet;
 mod.bindOutfitHeader(sheet,sheet.element);mod.bindOutfitHeader(sheet,sheet.element);assert.equal(document.querySelectorAll('[data-actor-control="outfits"]').length,1);assert.match(document.querySelector('[data-actor-control="outfits"] img').src,/outfit-icon\.png/);
 const settle=async()=>{for(let i=0;i<25;i++)await new Promise(setImmediate);};
 const change=async(selector,value,event='input')=>{const node=document.querySelector(selector);assert.ok(node,selector);if(node.type==='checkbox')node.checked=value;else node.value=value;node.dispatchEvent(new Event(event,{bubbles:true}));await settle();};
 const app=mod.openOutfits(w.hero,{manage:true});await settle();assert.equal(app.form,null,'Foundry native form getter remains intact');assert.equal(app.artworkForm,'normal');await change('[data-outfit-name]','Evening gala');
 assert.equal(document.querySelectorAll('[data-outfit-custom-icon]').length,4);assert.equal(document.querySelector('[data-outfit-form] option[value="enhanced"]'),null);
 document.querySelector('[data-outfit-art="portrait"] [data-outfit-browse]').click();await settle();assert.equal(app.profile().normal.art.portrait.image,'picked-art.webp');
 const drop=new Event('drop',{bubbles:true,cancelable:true});Object.defineProperty(drop,'dataTransfer',{value:{getData:type=>type==='text/plain'?JSON.stringify({path:'gala-splash.png'}):''}});document.querySelector('[data-outfit-stage="splash"]').dispatchEvent(drop);await settle();assert.equal(app.profile().normal.art.splash.image,'gala-splash.png');
 await change('[data-outfit-art="splash"] [data-outfit-art-field="scale"]',145);assert.match(document.querySelector('[data-outfit-stage="splash"] img').style.transform,/1.45/);
 const initiative=document.querySelector('[data-outfit-stage="initiative"]'),frame=initiative.querySelector('.tsru-hsr-turn');assert.ok(frame.querySelector('.tsru-hsr-turn-pointer i'));assert.equal(frame.querySelector('small').textContent,'19');assert.equal(frame.querySelector('b').textContent,w.hero.name);
 await change('[data-outfit-art="initiative"] [data-outfit-art-field="image"]','outfit-initiative.png');
 await change('[data-outfit-art="initiative"] [data-outfit-art-field="x"]',45);await change('[data-outfit-art="initiative"] [data-outfit-art-field="scale"]',160);
 assert.equal(frame.style.getPropertyValue('--portrait-x'),'45%');assert.equal(frame.style.getPropertyValue('--portrait-scale'),'1.6');assert.equal(frame.querySelector('img').getAttribute('src'),'outfit-initiative.png');assert.equal(frame.querySelector('img').style.transform,'');
 frame.querySelector('.tsru-hsr-turn-card').getBoundingClientRect=()=>({width:148,height:58});
 initiative.dispatchEvent(new dom.window.MouseEvent('pointerdown',{button:0,clientX:100,clientY:100}));initiative.dispatchEvent(new dom.window.MouseEvent('pointermove',{clientX:114.8,clientY:105.8}));initiative.dispatchEvent(new dom.window.MouseEvent('pointerup'));
 assert.ok(Math.abs(app.profile().normal.art.initiative.x-55)<.001);assert.ok(Math.abs(app.profile().normal.art.initiative.y-60)<.001);
 await change('[data-outfit-icon="skill"] [data-outfit-custom-icon]',true,'change');await change('[data-outfit-icon="skill"] [data-outfit-icon-image]','gala-skill.png');assert.equal(app.profile().normal.icons.skill.custom,true);
 await change('[data-outfit-unlock-uuid]','Item.ticket','change');assert.equal(app.draft.unlockingItem.name,'Gala ticket');
 await change('[data-outfit-any-path]',true,'change');assert.equal(app.profile().pathKey,'*');
 await change('[data-outfit-art="team3"] [data-outfit-art-field="image"]','gala-team3.png');
 await change('[data-outfit-art="team3"] [data-outfit-art-field="scale"]',135);assert.match(document.querySelector('[data-outfit-stage="team3"] img').style.transform,/1.35/);
 document.querySelector('[data-outfit-save]').click();await settle();assert.equal(w.settings.outfitLibrary.outfits[0].name,'Evening gala');assert.equal(w.settings.outfitLibrary.outfits[0].profiles[0].normal.art.splash.scale,145);
 assert.equal(document.querySelector('[data-outfit-equip]:not([data-outfit-equip=""])').disabled,true);assert.match(document.querySelector('.tsru-outfit-choices').textContent,/Requires Gala ticket/);
 await app.close();game.user=w.owner;document.querySelector('[data-actor-control="outfits"]').click();await settle();assert.equal(document.querySelector('.tsru-outfit-builder,[data-outfit-manage],[data-outfit-save],[data-outfit-unlock-drop]'),null);
 const item={_id:'permit',name:'Renamed ticket',type:'loot',system:{quantity:1},_stats:{duplicateSource:'Item.ticket'}};game.user=w.gm;await w.hero.createEmbeddedDocuments('Item',[item]);HookApi.callAll('createItem',w.hero.items.get('permit'));await settle();game.user=w.owner;
 document.querySelector('[data-outfit-equip]:not([data-outfit-equip=""])').click();await settle(); // The request is coordinated by the online GM.
 // Complete that socket request on the GM, then deliver its authoritative response.
 const request=w.messages.pop();game.user=w.gm;await mod.handleOutfitSocket(request);const response=w.messages.pop();game.user=w.owner;await mod.handleOutfitSocket(response);await settle();assert.equal(w.hero.img,'picked-art.webp');
 mod.styleOutfitPortraits(w.hero,sheet.element);assert.match(document.querySelector('#sheet img.profile').style.objectViewBox,/inset/);
 await mod.openOutfits(w.hero).close();dom.window.close();console.log('PASS: native read-only form getter; outfit icon/header; real builder controls, per-Path defaults, artwork drops and scaling, custom icons, item requirement, save, clean player selector and GM socket equip.');
})().catch(error=>{console.error(error);process.exitCode=1});
