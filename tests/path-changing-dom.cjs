const assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),fs=require('node:fs/promises'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
  const dom=new JSDOM('<!doctype html><html><body><section id="character-sheet"><header class="window-header"><div class="window-controls"></div></header></section></body></html>');
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,Event:dom.window.Event,HTMLElement:dom.window.HTMLElement});
  const {pathWorld,ID}=await import('./helpers/path-world.mjs'),w=pathWorld();
  class App {
    constructor(opts){this.options=opts;this.rendered=false;this.element=document.createElement('section');this.element.id=opts.id;this.element.className='application '+this.constructor.DEFAULT_OPTIONS.classes.join(' ');this.element.innerHTML='<header class="window-header"></header><div class="window-content"></div>';}
    async render(){if(!this.element.isConnected)document.body.append(this.element);const html=await this._renderHTML();this._replaceHTML(html,this.element.querySelector('.window-content'));this.rendered=true;this._onRender({},{});return this;}
    _onRender(){} _onClose(){}bringToFront(){}async close(){this.rendered=false;this.element.remove();this._onClose({});}
  }
  foundry.applications={api:{ApplicationV2:App},apps:{FilePicker:class {constructor(opts){this.opts=opts}browse(){this.opts.callback('custom-preview.webp')}}}};
  const mod=await import('../scripts/path-changing.mjs'),{pathCatalog}=await import('../scripts/path-change-rules.mjs');
  const sheet={document:w.hero,actor:w.hero,element:document.querySelector('#character-sheet')};w.hero.apps.sheet=sheet;
  const settle=async()=>{for(let i=0;i<25;i++)await new Promise(setImmediate)};
  const change=async(selector,value,event='change')=>{const node=document.querySelector(selector);assert.ok(node,selector);if(node.type==='checkbox')node.checked=value;else node.value=value;node.dispatchEvent(new Event(event,{bubbles:true}));await settle();};
  game.user=w.owner;mod.bindPathChangerHeader(sheet,sheet.element);assert.equal(document.querySelector('[data-actor-control="path-changer"]'),null);
  game.user=w.gm;mod.bindPathChangerHeader(sheet,sheet.element);mod.bindPathChangerHeader(sheet,sheet.element);assert.equal(document.querySelectorAll('[data-actor-control="path-changer"]').length,1);
  const itemSheet={document:{documentName:'Item'},actor:w.hero,element:document.createElement('section')};itemSheet.element.innerHTML='<header class="window-header"></header>';mod.bindPathChangerHeader(itemSheet,itemSheet.element);assert.equal(itemSheet.element.querySelector('[data-actor-control]'),null);
  document.querySelector('[data-actor-control="path-changer"]').click();await settle();document.querySelector('[data-path-manage]').click();await settle();
  assert.equal(document.querySelector('[data-path-import-to]').value,'hero');assert.equal(document.querySelector('[data-path-import-from]').value,'source');assert.match(document.querySelector('.tsru-path-import-preview').textContent,/Remembrance/);assert.match(document.querySelector('.tsru-path-import-preview').textContent,/Ice/);
  await change('[data-path-import-to]','source');assert.equal(document.querySelector('[data-path-import-to]').value,'source');assert.equal(document.querySelector('[data-path-import-from]').value,'hero');await change('[data-path-import-to]','hero');
  const event=new Event('drop',{bubbles:true,cancelable:true});Object.defineProperty(event,'dataTransfer',{value:{getData:()=>JSON.stringify({type:'Actor',uuid:w.source.uuid})}});globalThis.fromUuid=async uuid=>w.actors.find(actor=>actor.uuid===uuid);document.querySelector('[data-path-import-drop]').dispatchEvent(event);await settle();
  document.querySelector('[data-path-import]').click();await settle();let catalog=pathCatalog(w.hero);const alternate=catalog.profiles.find(profile=>!profile.original),original=catalog.activeId;assert.equal(catalog.profiles.length,2);assert.equal(w.hero.system.abilities.dex.value,12);assert.equal(document.querySelectorAll('[data-path-choice]').length,2);
  const row='[data-path-config-row="'+alternate.id+'"]';await change(row+' [data-path-field="name"]','Ice build','input');document.querySelector(row+' [data-path-browse]').click();await settle();document.querySelector(row+' [data-path-save]').click();await settle();
  assert.equal(pathCatalog(w.hero).profiles.find(p=>p.id===alternate.id).previewImage,'custom-preview.webp');assert.match(document.querySelector('[data-path-choice="'+alternate.id+'"]').textContent,/Ice build/);
  // A stale source refresh cannot silently replace an edited configuration.
  await change(row+' [data-path-field="name"]','Local draft','input');await w.hero.update({[`flags.${ID}.pathChanging.revision`]:pathCatalog(w.hero).revision+1});await settle();assert.ok(document.querySelector('[data-path-reload]'));assert.equal(document.querySelector(row+' [data-path-save]').disabled,true);document.querySelector('[data-path-reload]').click();await settle();
  const gmApp=mod.openPathChanger(w.hero);await gmApp.close();game.user=w.owner;mod.bindPathChangerHeader(sheet,sheet.element);
  const responses=[];game.socket.emit=(_channel,message)=>{
    if(message.type==='pathChangeResult'){responses.push(message);return;}
    if(message.type!=='pathChangeRequest')return;
    setImmediate(async()=>{game.user=w.gm;try{await mod.handlePathSocket(message);}finally{game.user=w.owner;for(const response of responses.splice(0))await mod.handlePathSocket(response);}});
  };
  document.querySelector('[data-actor-control="path-changer"]').click();await settle();assert.equal(document.querySelector('[data-path-import-from]'),null);assert.equal(document.querySelector('[data-path-manage]'),null);
  document.querySelector('[data-path-choice="'+alternate.id+'"]').click();await settle();assert.equal(document.querySelector('.tsru-path-art>img').getAttribute('src'),'custom-preview.webp');document.querySelector('[data-path-switch]').click();await settle();
  assert.equal(pathCatalog(w.hero).activeId,alternate.id);assert.equal(w.hero.system.abilities.dex.value,18);assert.equal(w.hero.items.get('arrows').system.quantity,30);
  await w.hero.items.get('arrows').update({'system.quantity':7});document.querySelector('[data-path-choice="'+original+'"]').click();await settle();document.querySelector('[data-path-switch]').click();await settle();assert.equal(w.hero.system.abilities.dex.value,12);assert.equal(w.hero.items.get('arrows').system.quantity,7);
  const {validateHelp}=await import('../scripts/help-data.mjs'),{describeHelp}=await import('../scripts/help-tooltips.mjs'),help=validateHelp(JSON.parse(await fs.readFile(path.join(__dirname,'../docs/manual.json'))),JSON.parse(await fs.readFile(path.join(__dirname,'../docs/controls.json'))));
  for(const node of document.querySelectorAll('.tsru-path-changer button,.tsru-path-changer select,.tsru-path-changer input,[data-actor-control="path-changer"]')){const meta=describeHelp(node,help);assert.ok(meta&&!meta.fallback,node.outerHTML);}
  await mod.openPathChanger(w.hero).close();game.user=w.gm;const manager=mod.openPathChanger(w.hero,{manage:true});await settle();for(const node of manager.element.querySelectorAll('button,select,input')){const meta=describeHelp(node,help);assert.ok(meta&&!meta.fallback,node.outerHTML);}
  assert.ok(!w.notices.some(message=>/failed|error|could not/i.test(message)),JSON.stringify(w.notices));await manager.close();dom.window.close();
  console.log('PASS: actual owner header button and selector; GM Import from / Import to and source Actor drop; automatic Path/Element preview; editable artwork; stale revision reload; GM-coordinated owner switches; shared inventory quantities; class changes; authored help for every control.');
})().catch(error=>{console.error(error);process.exitCode=1});
