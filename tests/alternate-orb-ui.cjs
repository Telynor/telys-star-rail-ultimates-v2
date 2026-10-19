// Browser smoke test for the real editor and orb renderers, with a small Foundry
// Application shell. No running world or user data is required.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'..');
const ID='telys-star-rail-ultimates';
const bootstrap=`
const ID='${ID}';
window.ID=ID;
window.Hooks={on(){},once(){},callAll(){}};
window.FormApplication=class {};
const set=(o,path,value)=>{const keys=path.split('.');let t=o;for(const k of keys.slice(0,-1))t=t[k]??={};t[keys.at(-1)]=structuredClone(value)};
const get=(o,p)=>p.split('.').reduce((v,k)=>v?.[k],o);
class AppV2 {
 constructor(options){this.options=options;this.element=document.createElement('section');this.element.className='application '+this.constructor.DEFAULT_OPTIONS.classes.join(' ');this.element.id=options.id;this.element.innerHTML='<header class="window-header">Ultimate Orb Builder</header><div class="window-content"></div>';this.rendered=false;}
 async render(){if(!this.element.isConnected)document.body.append(this.element);const html=await this._renderHTML();this._replaceHTML(html,this.element.querySelector('.window-content'));this.rendered=true;this._onRender({},{});return this;}
 _onRender(){} _onClose(){} bringToFront(){} async close(){this.element.remove();this.rendered=false;this._onClose({});return this;}
}
window.ui={notifications:{info:message=>window.notices.push(message),warn:message=>window.notices.push(message),error:message=>{window.notices.push(message);window.failures.push(message)}}};
window.notices=[];window.failures=[];window.updates=[];window.updateFails=false;window.ultimateExecutions=[];window.chatCards=[];window.socketEvents=[];
window.TextEditor={enrichHTML:async text=>text};
window.ChatMessage={getSpeaker:({actor})=>({actor:actor.id}),create:async data=>{window.chatCards.push(data);const card=document.createElement('div');card.innerHTML=data.content;document.querySelector('#chat-cards')?.append(card);return data}};
class Picker {
 constructor(options){this.options=options}browse(){this.options.callback('/test-art/red.svg')}
 static async uploadPersistent(id,dir,file){window.lastUpload={id,dir,name:file.name};return {path:await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file)})}}
}
window.foundry={applications:{api:{ApplicationV2:AppV2,HandlebarsApplicationMixin:C=>C,DialogV2:{confirm:async()=>true}},apps:{FilePicker:Picker}},utils:{deepClone:value=>structuredClone(value),randomID:()=>crypto.randomUUID().replaceAll('-',''),escapeHTML:String,mergeObject:(a,b)=>Object.assign(a,b),getProperty:get,setProperty:set,hasProperty:(o,p)=>get(o,p)!==undefined,expandObject:updates=>{const out={};for(const [p,v]of Object.entries(updates))set(out,p,v);return out}}};
window.a={id:'hero',uuid:'Actor.hero',name:'Alchemical Ultimate',img:'/test-art/red.svg',type:'character',isOwner:true,items:[],effects:[],reset(){},prepareData(){},getActiveTokens:()=>[{id:'hero-token',document:{id:'hero-token'}}],system:{attributes:{hp:{value:20,max:20,temp:0}}},
 flags:{[ID]:{ultimate:{enabled:true,current:80,max:100,mainParty:true,alternateUltimateEnabled:false},alternateOrb:{label:'Alchemical Seals',components:['red','white','black','yellow'].map((id,i)=>({id,name:id[0].toUpperCase()+id.slice(1)+' seal',image:'/test-art/'+id+'.svg',x:i%2?72:28,y:i<2?28:72,scale:45,rotation:0,color:{red:'#e32b38',white:'#f1f5f8',black:'#17171b',yellow:'#efd153'}[id],glow:true}))},alternateOrbStates:{red:true}}},
 getFlag(_,key){return this.flags[ID][key]},async setFlag(_,key,value){this.flags[ID][key]=structuredClone(value);window.drawHud?.()},
 async update(updates){if(window.updateFails)throw new Error('Test save failure');window.updates.push(structuredClone(updates));for(const [p,v]of Object.entries(updates)){if(p==='flags.'+ID+'.ultimate')Object.assign(this.flags[ID].ultimate,structuredClone(v));else set(this,p,v)}window.drawHud?.()},testUserPermission:()=>true};
const actors=[a];actors.get=id=>actors.find(v=>v.id===id);
a.items.get=id=>a.items.find(item=>item.id===id);
const gm={id:'gm',isGM:true,active:true},users=[gm];users.get=id=>users.find(v=>v.id===id);
const settings={orbLayouts:{hero:{visible:true,x:1120,y:50,size:190}},elements:[],paths:[],combatPartyHudLayout:{x:1110,y:320,scale:1},partySelections:{},combatHudDesign:{}};
const ownTurn={id:'hero-turn',actor:a,actorId:a.id,getFlag:()=>false};
const combat={id:'ui-fight',round:1,started:true,combatant:ownTurn,combatants:[ownTurn],flags:{},getFlag(_,key){return this.flags[key]},async setFlag(_,key,value){this.flags[key]=structuredClone(value)}};
const combats=[combat];combats.get=id=>combats.find(c=>c.id===id);
const moduleData={};
window.game={user:gm,users,actors,combats,combat,settings:{get:(_,key)=>settings[key],set:async(_,key,value)=>settings[key]=value},modules:{get:()=>moduleData},socket:{emit:(_,payload)=>window.socketEvents.push(payload)}};
window.fromUuid=async uuid=>uuid===a.uuid?a:null;window.canvas={};
const alt=await import('/scripts/alternate-ultimates.mjs');window.alt=alt;
const core=await import('/scripts/module.js');window.core=core;
core.registerApi();
alt.configureAlternateUltimates({isResolving:a=>core.state.ultimateLocks.has(a.id)});
window.floating=new core.UltimateOrb(a);window.party=new core.CombatPartyHud();
core.state.orbs.set(a.id,floating);
const controls=document.querySelector('#gm-controls');alt.bindAlternateOrbControls(controls);
const sheet=document.querySelector('#sheet');
const refreshPreviews=()=>{const config={...core.getConfig(a),alternateUltimateEnabled:sheet.querySelector('input').checked};document.querySelector('#art-preview').innerHTML=core.ultimateArtworkPreview(a,config);document.querySelector('#hud-preview').innerHTML=core.combatHudDesignerPreview(a,config)};
window.drawHud=()=>{floating.render();party.render();controls.innerHTML=alt.alternateOrbControls(a);refreshPreviews()};
alt.bindAlternateOrbSheet(a,sheet,{onChange:refreshPreviews});
alt.bindAlternateOrbSheet(a,sheet,{onChange:refreshPreviews});
drawHud();window.ready=true;
`;
(async()=>{
 const template=await fs.readFile(path.join(root,'templates/ultimate-tab.hbs'),'utf8');
 let section=template.slice(template.indexOf('<div class="tsru-config-section tsru-alternate-ultimate-section">'),template.indexOf('<div class="tsru-config-section tsru-skill-config-section">'));
 section=section.replace('{{checked config.alternateUltimateEnabled}}','').replace('{{#unless config.alternateUltimateEnabled}}hidden{{/unless}}','hidden');
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://local'),pathname=decodeURIComponent(url.pathname);
   if(pathname==='/'){
    res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><link rel="stylesheet" href="/styles/ultimates.css"><link rel="stylesheet" href="/styles/alternate-ultimates.css"><link rel="stylesheet" href="/styles/character-settings.css"><script src="/test-handlebars.js"></script><script src="/test-jquery.js"></script><style>body{margin:0;background:#101521;color:#fff;font-family:Arial,sans-serif}.application{position:absolute;left:18px;top:18px;width:1050px;height:830px;border:1px solid #627185;border-radius:10px;overflow:hidden;display:flex;flex-direction:column}.window-header{padding:9px 14px;background:#222f43;font-size:13px}.window-content{flex:1;min-height:0;overflow:auto}#sheet{position:absolute;left:20px;top:20px;width:600px}#gm-controls{position:absolute;left:1110px;top:530px;width:255px}#art-preview{position:absolute;left:20px;top:880px;width:230px}#hud-preview{position:absolute;left:280px;top:880px;width:230px}input{color:inherit}</style></head><body><section id="sheet">'+section+'</section><section id="gm-controls"></section><section id="art-preview" class="tsru-ultimate-adjust-preview"></section><section id="hud-preview"></section><script type="module">'+bootstrap+'</script></body></html>');return;
   }
   if(pathname.startsWith('/test-art/')){
    const color=({red:'#e32b38',yellow:'#efd153',white:'#f1f5f8',black:'#17171b'})[path.basename(pathname,'.svg')]||'#8494a8';
    res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><path d="M152 152H8A144 144 0 0 1 152 8Z" fill="'+color+'" stroke="#ddd" stroke-width="2"/><path d="M65 56 L93 111 L121 56 Z" fill="none" stroke="#ffffffaa" stroke-width="5"/></svg>');return;
   }
   if(pathname==='/test-handlebars.js'||pathname==='/test-jquery.js'){
    res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(require.resolve(pathname==='/test-jquery.js'?'jquery':'handlebars/dist/handlebars.js')));return;
   }
   const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
   let content=await fs.readFile(file);
   if(pathname==='/scripts/module.js')content=content.toString()+'\nexport {UltimateOrb,CombatPartyHud,state,getConfig,combatHudDesignerPreview,ultimateArtworkPreview,registerApi,completeUltimate,initializeCollapsibleUltimateSections,saveUltimateConfigFromTab};';
   res.setHeader('Content-Type',pathname.endsWith('.css')?'text/css':/\.m?js$/.test(pathname)?'text/javascript':'application/octet-stream');res.end(content);
  }catch(error){res.writeHead(404);res.end(error.message)}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
 page.on('pageerror',error=>{errors.push(error.message);console.error('Browser error:',error.stack)});
 try{
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);
  assert.equal(await page.locator('[data-tsru-alternate-builder]').isVisible(),false);
  assert.equal(await page.locator('.tsru-orb-image, .tsru-orb-fill').count(),2);
  await page.locator('[name="alternateUltimateEnabled"]').check();
  await page.waitForFunction(()=>a.getFlag('','ultimate').alternateUltimateEnabled===true);
  assert.equal(await page.locator('[data-tsru-alternate-builder]').isVisible(),true);
  assert.equal(await page.evaluate(()=>updates.length),1,'binding the sheet twice still saves the toggle once');
  assert.deepEqual(await page.evaluate(()=>Object.keys(updates[0])),['flags.'+ID+'.ultimate.alternateUltimateEnabled'],'checkbox saves its own flag without a whole-sheet write');
  assert.equal(await page.locator('.tsru-orb-image, .tsru-orb-fill, [data-tsru-party-ultimate][data-actor-id="hero"]>.tsru-hud-orb-fill, [data-tsru-party-ultimate][data-actor-id="hero"]>img, #art-preview button>img, #hud-preview .tsru-hud-orb-fill').count(),0,'alternate mode removes standard orb nodes');
  assert.equal(await page.locator('#art-preview [data-alt-piece], #hud-preview [data-alt-piece]').count(),8);
  assert.equal(await page.locator('.tsru-orb').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
  assert.equal(await page.locator('#art-preview .tsru-alt-orb-art').first().evaluate(el=>getComputedStyle(el).borderRadius),'0px');
  // A failed switch rolls the checkbox and builder back to the saved mode.
  await page.evaluate(()=>window.updateFails=true);
  await page.locator('[name="alternateUltimateEnabled"]').click();
  await page.waitForFunction(()=>document.querySelector('[name="alternateUltimateEnabled"]').checked&&!document.querySelector('[name="alternateUltimateEnabled"]').disabled);
  assert.equal(await page.locator('[data-tsru-alternate-builder]').isVisible(),true);
  assert.match(await page.evaluate(()=>failures.pop()),/Could not change.*Ultimate mode/);
  await page.evaluate(()=>window.updateFails=false);
  await page.locator('[data-action="open-alternate-orb-builder"]').click();
  await page.waitForSelector('.tsru-alt-stage');
  assert.equal(await page.locator('.tsru-alt-stage [data-alt-piece]').count(),4);
  assert.equal(await page.locator('#gm-controls [data-alt-counter="red"]').getAttribute('type'),'checkbox');
  await page.locator('#gm-controls [data-alt-counter="red"]').uncheck();
  await page.waitForFunction(()=>a.getFlag('','alternateOrbStates').red===false);
  await page.locator('#gm-controls [data-alt-counter="red"]').check();
  await page.waitForFunction(()=>a.getFlag('','alternateOrbStates').red===true);
  await page.locator('[data-alt-preview="off"]').click();
  assert.equal(await page.locator('.tsru-alt-stage .is-off').count(),4);
  assert.equal(await page.locator('.tsru-alt-stage .has-glow').count(),0);
  await page.locator('[data-alt-preview="on"]').click();
  assert.equal(await page.locator('.tsru-alt-stage .has-glow').count(),4);
  const before=await page.locator('[data-alt-field="x"]').inputValue();
  const piece=await page.locator('.tsru-alt-stage [data-alt-piece="red"]').boundingBox();
  await page.mouse.move(piece.x+piece.width*.7,piece.y+piece.height*.65);await page.mouse.down();await page.mouse.move(piece.x+piece.width*.7+20,piece.y+piece.height*.65+12,{steps:5});await page.mouse.up();
  assert.notEqual(await page.locator('[data-alt-field="x"]').inputValue(),before,'pointer drag updates position');
  await page.locator('[data-alt-field="rotation"]').fill('35');
  await page.locator('[data-alt-field="scale"]').fill('48');
  await page.locator('[data-alt-field="offImage"]').fill('/test-art/white.svg');
  await page.locator('[data-alt-field="glow"]').uncheck();
  await page.locator('[data-alt-save]').click();
  await page.waitForFunction(()=>window.a.getFlag('', 'alternateOrb').components[0].rotation===35);
  assert.equal(await page.evaluate(()=>a.getFlag('','alternateOrbStates').red),true,'saving design preserves live counters');
  const saved=await page.evaluate(()=>a.getFlag('','alternateOrb').components[0]);
  assert.equal(saved.glow,false);assert.equal(saved.scale,48);assert.equal(saved.offImage,'/test-art/white.svg');
  // Upload path is the actual FilePicker.uploadPersistent integration; only server IO is mocked.
  await page.locator('[data-alt-files]').setInputFiles({name:'new-seal.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#ff0000"/></svg>')});
  await page.waitForFunction(()=>window.lastUpload&&document.querySelectorAll('.tsru-alt-stage [data-alt-piece]').length===5);
  await page.waitForFunction(()=>document.querySelector('[data-alt-field="color"]').value==='#ff0000');
  await page.locator('[data-alt-delete]').click();await page.locator('[data-alt-save]').click();
  await page.waitForFunction(()=>a.getFlag('','alternateOrb').components.length===4);
  assert.equal(await page.locator('.tsru-orb-widget.is-alternate').count(),1);
  assert.equal(await page.locator('[data-tsru-party-ultimate][data-actor-id="hero"]').isDisabled(),true);
  for(const id of ['white','black','yellow'])await page.locator('#gm-controls [data-alt-counter="'+id+'"]').click();
  await page.waitForFunction(()=>!document.querySelector('[data-tsru-party-ultimate][data-actor-id="hero"]').disabled);
  assert.equal(await page.locator('.tsru-orb').isDisabled(),false);
  await page.locator('#gm-controls [data-alt-reset]').click();
  await page.waitForFunction(()=>document.querySelector('[data-tsru-party-ultimate][data-actor-id="hero"]').disabled);
  assert.equal(await page.locator('.tsru-orb').isDisabled(),true);
  // Color detection handles black/white too, while off-image CSS keeps uploaded artwork.
  const detected=await page.evaluate(async()=>Promise.all(['red','white','black','yellow'].map(c=>alt.detectOrbImageColor('/test-art/'+c+'.svg'))));
  const rgb=detected.map(hex=>hex&&[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)));
  assert.ok(rgb[0][0]>180&&rgb[0][1]<100&&rgb[0][2]<110);
  assert.ok(rgb[1].every(c=>c>220));assert.ok(rgb[2].every(c=>c<60));
  assert.ok(rgb[3][0]>200&&rgb[3][1]>150&&rgb[3][2]<140);
  // Configure the real circular editor: custom start, offset, unique sequence.
  await page.locator('[data-alt-setting="mode"]').selectOption('circular');
  await page.locator('[data-alt-setting="startComponentId"]').selectOption('black');
  await page.locator('[data-alt-setting="firstActivation"]').fill('2');
  await page.locator('[data-alt-setting="firstActivation"]').press('Tab');
  await page.locator('[data-alt-select="red"]').click();
  await page.locator('[data-alt-field="sequence"]').fill('4');
  await page.locator('[data-alt-field="sequence"]').press('Tab');
  await page.locator('[data-alt-save]').click();
  await page.waitForFunction(()=>notices.some(s=>s.includes('different sequence order')));
  assert.equal(await page.evaluate(()=>a.getFlag('','alternateOrb').mode),'free','duplicate sequence must not save');
  await page.locator('[data-alt-field="sequence"]').fill('5');
  await page.locator('[data-alt-field="sequence"]').press('Tab');
  await page.locator('[data-alt-save]').click();
  await page.waitForFunction(()=>a.getFlag('','alternateOrb').mode==='circular');
  assert.equal(await page.evaluate(()=>a.getFlag('','alternateOrb').firstActivation),2);
  assert.equal(await page.evaluate(()=>a.getFlag('','alternateOrb').startComponentId),'black');
  assert.equal(await page.locator('#gm-controls [data-alt-counter]').count(),0);
  const expected=[[],[],['black'],['black','yellow'],['black','yellow','red'],['black','yellow','red','white']];
  for(let count=0;count<=5;count++){
    if(count){await page.locator('#gm-controls [data-alt-count-step="1"]').click();await page.waitForFunction(n=>a.getFlag('','alternateOrbCounter')===n,count)}
    const lit=await page.locator('.tsru-orb-custom .tsru-alt-orb-piece.is-on').evaluateAll(nodes=>nodes.map(n=>n.dataset.altPiece).sort());
    assert.deepEqual(lit,[...expected[count]].sort(),'cumulative icons at count '+count);
    assert.equal(await page.locator('[data-tsru-party-ultimate][data-actor-id="hero"]').isDisabled(),count!==5);
  }
  await page.locator('#gm-controls [data-alt-count-value]').fill('3');
  await page.locator('#gm-controls [data-alt-count-value]').press('Tab');
  await page.waitForFunction(()=>a.getFlag('','alternateOrbCounter')===3);
  assert.equal(await page.locator('.tsru-orb-custom .is-on').count(),2);
  await page.locator('#gm-controls [data-alt-reset]').click();
  await page.waitForFunction(()=>a.getFlag('','alternateOrbCounter')===0);
  assert.equal(await page.locator('.tsru-orb-custom .is-on').count(),0);
  await page.locator('[data-alt-preview-count]').fill('4');
  await page.locator('[data-alt-preview-count]').press('Tab');
  assert.equal(await page.locator('.tsru-alt-stage .is-on').count(),3);
  assert.equal(await page.evaluate(()=>a.getFlag('','alternateOrbCounter')),0,'preview does not change live counter');
  await page.locator('[data-alt-preview="on"]').click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.tsru-alt-stage img, .tsru-alt-layer img')].every(img=>img.complete&&img.naturalWidth>0));
  await page.screenshot({path:path.join(root,'orb-designer-smoke.png'),fullPage:true});
  await page.locator('[data-alt-setting="mode"]').selectOption('free');
  await page.locator('[data-alt-save]').click();
  await page.waitForFunction(()=>a.getFlag('','alternateOrb').mode==='free');
  assert.equal(await page.locator('#gm-controls [data-alt-counter]').count(),4);
  assert.equal(await page.locator('#gm-controls [data-alt-counter]:checked').count(),0);
  await page.evaluate(()=>{const sheet=document.querySelector('#sheet');sheet.style.zIndex='100000';document.querySelector('[name="alternateUltimateEnabled"]').checked=false;document.querySelector('[name="alternateUltimateEnabled"]').dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(()=>a.getFlag('','ultimate').alternateUltimateEnabled===false);
  assert.equal(await page.locator('[data-tsru-alternate-builder]').isVisible(),false);
  assert.equal(await page.locator('.tsru-orb-widget.is-alternate').count(),0);
  assert.equal(await page.locator('[data-tsru-party-ultimate][data-actor-id="hero"].is-alternate').count(),0);
  assert.equal(await page.locator('.tsru-orb-image, .tsru-orb-fill').count(),2);
  assert.equal(await page.locator('.tsru-orb [data-alt-piece], [data-tsru-party-ultimate][data-actor-id="hero"] [data-alt-piece], #art-preview [data-alt-piece], #hud-preview [data-alt-piece]').count(),0);
  // Existing enhanced artwork also yields to alternate mode and comes back on uncheck.
  await page.evaluate(id=>a.update({['flags.'+id+'.ultimate.enhancedStanceEnabled']:true,['flags.'+id+'.ultimate.enhancedStanceActive']:true,['flags.'+id+'.ultimate.enhancedUltimateEnabled']:true,['flags.'+id+'.ultimate.enhancedUltimateButtonImage']:'/test-art/white.svg'}),ID);
  assert.equal(await page.locator('.tsru-orb-image').getAttribute('src'),'/test-art/white.svg');
  await page.locator('[name="alternateUltimateEnabled"]').check();
  await page.waitForFunction(()=>a.getFlag('','ultimate').alternateUltimateEnabled===true);
  assert.equal(await page.locator('.tsru-orb-image, .tsru-orb-fill').count(),0);
  assert.equal(await page.locator('.tsru-orb [data-alt-piece]').count(),4);
  await page.locator('[name="alternateUltimateEnabled"]').uncheck();
  await page.waitForFunction(()=>a.getFlag('','ultimate').alternateUltimateEnabled===false);
  assert.equal(await page.locator('.tsru-orb-image').getAttribute('src'),'/test-art/white.svg');
  assert.equal(await page.evaluate(()=>a.getFlag('','alternateOrb').components.length),4);
  await page.evaluate(()=>alt.openAlternateOrbDesigner(a).close());
  // Actually activate each entry point using the real handler and saved code.
  // No script runner, readiness check, resource consumption or Light Cone code is replaced.
  for(const enhanced of [false,true])for(const mode of ['energy','free','circular'])for(const source of ['floating','party','hotbar']){
    const before=await page.evaluate(()=>ultimateExecutions.length);
    const cardsBefore=await page.evaluate(()=>chatCards.length);
    await page.evaluate(({mode,enhanced,id})=>{
      const config=a.flags[id].ultimate;
      Object.assign(config,{enabled:true,current:100,alternateUltimateEnabled:mode!=='energy',lockEnergyAfterUltimate:false,enhancedStanceEnabled:enhanced,enhancedStanceActive:enhanced,enhancedUltimateEnabled:enhanced,ultimateText:'Normal cast description',enhancedUltimateText:'Enhanced cast description',ultimateScript:'window.ultimateExecutions.push("normal");',enhancedUltimateScript:'window.ultimateExecutions.push("enhanced");'});
      a.flags[id].alternateOrb.mode=mode==='circular'?'circular':'free';
      a.flags[id].alternateOrb.firstActivation=1;
      a.flags[id].alternateOrbCounter=4;
      a.flags[id].alternateOrbStates={red:true,white:true,black:true,yellow:true};
      drawHud();
    },{mode,enhanced,id:ID});
    assert.equal(await page.locator('[data-tsru-party-ultimate][data-actor-id="hero"]').evaluate(el=>getComputedStyle(el.parentElement,'::before').content),'""','a fully charged Ultimate has its ready halo');
    if(source==='floating')await page.locator('.tsru-orb').click();
    else if(source==='party')await page.locator('[data-tsru-party-ultimate][data-actor-id="hero"]').click();
    else await page.evaluate(id=>game.modules.get(id).api.requestUltimate(a),ID);
    await page.waitForFunction(n=>ultimateExecutions.length===n+1,before);
    await page.waitForFunction(n=>chatCards.length===n+1,cardsBefore);
    await page.waitForFunction(()=>!core.state.ultimateLocks.has(a.id));
    assert.equal(await page.evaluate(()=>ultimateExecutions.at(-1)),enhanced?'enhanced':'normal',source+' '+mode+' executes the correct saved code');
    assert.match(await page.evaluate(()=>chatCards.at(-1).content),enhanced?/Enhanced cast description/:/Normal cast description/);
    assert.equal(await page.evaluate(()=>a.getFlag('','ultimate').current),mode==='energy'?0:100);
    if(mode!=='energy')assert.equal(await page.evaluate(()=>a.getFlag('','alternateOrbCounter')),0);
    assert.equal(await page.locator('[data-tsru-party-ultimate][data-actor-id="hero"]').evaluate(el=>getComputedStyle(el.parentElement,'::before').content),'none','consuming the Ultimate removes its ready halo');
  }
  // Full queued sequence: cached v14 turn order, real asset fetch/decode and splash
  // DOM/CSS, legacy descriptions, the timer wakeup and completion/resume mechanics.
  await page.evaluate(()=>{
    const board=document.createElement('div');board.id='board';board.style.cssText='position:fixed;inset:0;z-index:0;isolation:isolate';document.body.prepend(board);
    const cover=document.createElement('aside');cover.id='test-window';cover.textContent='Foundry window';cover.style.cssText='position:fixed;left:45%;top:40%;width:260px;height:130px;z-index:100000;background:#253a50;color:white;pointer-events:none';document.body.append(cover);
    const chat=document.createElement('section');chat.id='chat-cards';chat.style.cssText='position:fixed;bottom:20px;left:30px;width:400px';document.body.append(chat);
    const combat=game.combat;let sorted=[];let sequence=0;
    delete combat.combatant;
    Object.defineProperties(combat,{turns:{get:()=>sorted},combatant:{get:()=>sorted[combat.turn]}});
    combat.setupTurns=()=>sorted=[...combat.combatants].sort((a,b)=>b.initiative-a.initiative);
    combat.update=async patch=>Object.assign(combat,patch);
    combat.createEmbeddedDocuments=async(_,docs)=>docs.map(data=>{const c={...data,id:'queued-'+(++sequence),parent:combat,actor:a,getFlag(_,key){return this.flags?.[ID]?.[key]}};combat.combatants.push(c);return c});
    combat.deleteEmbeddedDocuments=async(_,ids)=>{for(const id of ids){const i=combat.combatants.findIndex(c=>c.id===id);if(i>=0)combat.combatants.splice(i,1)}};
    window.resetQueuedCombat=()=>{
      const ally={...a,id:'ally',name:'Ally',flags:structuredClone(a.flags),getFlag:(_,key)=>key==='ultimate'?{mainParty:true}:undefined};
      combat.combatants.splice(0,combat.combatants.length,{id:'ally-turn',actorId:'ally',actor:ally,initiative:20,getFlag:()=>false},{id:'hero-turn',actorId:a.id,actor:a,initiative:10,getFlag:()=>false});
      combat.combatants.get=id=>combat.combatants.find(c=>c.id===id);combat.combatants.has=id=>Boolean(combat.combatants.get(id));
      combat.turn=0;combat.round=1;combat.setupTurns();chat.replaceChildren();
    };
  });
  for(const enhanced of [false,true])for(const mode of ['energy','free','circular']){
    const cardsBefore=await page.evaluate(()=>chatCards.length);
    await page.evaluate(({mode,enhanced,id})=>{
      resetQueuedCombat();const config=a.flags[id].ultimate;
      Object.assign(config,{current:100,alternateUltimateEnabled:mode!=='energy',enhancedStanceEnabled:enhanced,enhancedStanceActive:enhanced,enhancedUltimateEnabled:enhanced,ultimateText:'',ultimateScript:'<p>Existing character Ultimate [[/r 3d6]]</p>',enhancedUltimateText:'',enhancedUltimateScript:'<p>Existing enhanced Ultimate [[/r 4d6]]</p>',splashImage:'/test-art/red.svg',enhancedSplashImage:'/test-art/white.svg',splashDuration:1,ultimateName:'Queued Ultimate',ultimateSubtitle:'Sequence verification'});
      a.flags[id].alternateOrb.mode=mode==='circular'?'circular':'free';a.flags[id].alternateOrbCounter=4;
      a.flags[id].alternateOrbStates={red:true,white:true,black:true,yellow:true};drawHud();
    },{mode,enhanced,id:ID});
    await page.locator('.tsru-orb').click();
    assert.equal(await page.evaluate(()=>chatCards.length),cardsBefore,'allied turn must finish before chat and splash');
    assert.equal(await page.locator('.tsru-splash').count(),0);
    assert.equal(await page.evaluate(()=>core.state.ultimateQueues.get(game.combat.id)?.waitTurnId),'ally-turn');
    // Intentionally omit updateCombat: the queue watcher must wake the cast.
    await page.evaluate(()=>game.combat.turn=1);
    await page.waitForFunction(()=>game.combat.combatant?.getFlag(ID,'temporaryUltimate'));
    await page.waitForFunction(()=>{const splash=document.querySelector('.tsru-splash.show'),img=splash?.querySelector('img');return splash?.parentElement===document.body&&img?.complete&&img.naturalWidth>0});
    assert.equal(await page.evaluate(()=>chatCards.length),cardsBefore+1);
    assert.match(await page.locator('#chat-cards').innerHTML(),enhanced?/Existing enhanced Ultimate/:/Existing character Ultimate/);
    assert.equal(await page.locator('#chat-cards [data-tsru-complete-ultimate="hero"]').count(),1);
    assert.equal(await page.evaluate(()=>game.combat.turns.length),3,'new combatant is in the cached turn list');
    assert.equal(await page.evaluate(()=>Number(getComputedStyle(document.querySelector('.tsru-splash')).zIndex)>Number(getComputedStyle(document.querySelector('#test-window')).zIndex)),true,'splash sits above Foundry windows');
    assert.match(await page.evaluate(({enhanced})=>core.state.splashAssetCache.get(enhanced?'/test-art/white.svg':'/test-art/red.svg')?.url,{enhanced}),/^blob:/,'real artwork was fetched and decoded');
    assert.equal(await page.evaluate(()=>a.flags[ID].ultimate.current),mode==='energy'?0:100);
    if(mode!=='energy')assert.equal(await page.evaluate(()=>a.flags[ID].alternateOrbCounter),0);
    if(mode==='energy'&&!enhanced){await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.tsru-splash')).opacity)>.9);await page.screenshot({path:path.join(root,'ultimate-sequence-smoke.png')});}
    await page.evaluate(()=>core.completeUltimate(a.id));
    assert.equal(await page.evaluate(()=>game.combat.combatant.id),'hero-turn');
    assert.equal(await page.evaluate(()=>game.combat.turns.length),2);
    assert.equal(await page.evaluate(()=>core.state.ultimateQueues.size+core.state.pendingUltimates.size+core.state.ultimateLocks.size),0);
    await page.waitForFunction(()=>!document.querySelector('.tsru-splash'));
  }
  // Explicit enhanced orbs use their own art, GM controls and progress.
  for(const mode of ['free','circular']){
    await page.evaluate(({mode})=>{
      const config=a.flags[ID].ultimate;
      Object.assign(config,{current:100,alternateUltimateEnabled:true,enhancedStanceEnabled:true,enhancedStanceActive:true,enhancedUltimateEnabled:true,enhancedAlternateUltimateEnabled:true,enhancedUltimateText:'Independent enhanced cast',enhancedUltimateScript:'window.ultimateExecutions.push("independent-enhanced");',splashImage:'',enhancedSplashImage:''});
      a.flags[ID].enhancedAlternateOrb={mode,components:['e1','e2'].map((id,i)=>({id,name:id,image:'/test-art/'+(i?'white':'red')+'.svg',x:25+i*50,y:50,scale:50}))};
      a.flags[ID].enhancedAlternateOrbStates={e1:true,e2:false};a.flags[ID].enhancedAlternateOrbCounter=1;
      a.flags[ID].alternateOrbCounter=4;a.flags[ID].alternateOrbStates={red:true,white:true,black:true,yellow:true};
      drawHud();
    },{mode});
    assert.equal(await page.locator('.tsru-orb [data-alt-piece="e1"]').count(),1);
    assert.equal(await page.locator('[data-tsru-party-ultimate][data-actor-id="hero"]').isDisabled(),true);
    assert.equal(await page.locator('#gm-controls [data-alt-form="enhanced"]').count(),1);
    if(mode==='free')await page.locator('#gm-controls [data-alt-counter="e2"]').check();
    else await page.locator('#gm-controls [data-alt-count-step="1"]').click();
    await page.waitForFunction(()=>!document.querySelector('[data-tsru-party-ultimate][data-actor-id="hero"]').disabled);
    await page.locator('[data-tsru-party-ultimate][data-actor-id="hero"]').click();
    await page.waitForFunction(()=>!core.state.ultimateLocks.has(a.id));
    assert.equal(await page.evaluate(()=>ultimateExecutions.at(-1)),'independent-enhanced');
    assert.equal(await page.evaluate(()=>a.flags[ID].enhancedAlternateOrbCounter),0);
    assert.equal(await page.evaluate(()=>a.flags[ID].alternateOrbCounter),4);
    assert.equal(await page.evaluate(()=>Object.values(a.flags[ID].alternateOrbStates).every(Boolean)),true);
    await page.evaluate(()=>{a.flags[ID].ultimate.enhancedStanceActive=false;drawHud()});
    assert.equal(await page.locator('.tsru-orb [data-alt-piece="red"]').count(),1);
    assert.equal(await page.locator('[data-tsru-party-ultimate][data-actor-id="hero"]').isDisabled(),false);
  }
  const blankCardsBefore=await page.evaluate(()=>chatCards.length);
  await page.evaluate(()=>{Object.assign(a.flags[ID].ultimate,{enhancedStanceActive:true,ultimateText:'',ultimateScript:'',enhancedUltimateText:'',enhancedUltimateScript:''});a.flags[ID].enhancedAlternateOrbCounter=2;drawHud()});
  await page.locator('[data-tsru-party-ultimate][data-actor-id="hero"]').click();
  await page.waitForFunction(n=>chatCards.length===n+1,blankCardsBefore);
  assert.match(await page.evaluate(()=>chatCards.at(-1).content),/No ability text/,'enhanced counter mechanics do not require a description or script');
  await page.waitForFunction(()=>!core.state.ultimateLocks.has(a.id));
  assert.equal(await page.evaluate(()=>a.flags[ID].enhancedAlternateOrbCounter),0);
  // Render the complete real sheet template, then exercise menu/search and save.
  await page.evaluate(async()=>{
    const module=await import('/scripts/character-settings.mjs');window.settingsUI=module;
    Object.assign(a.flags[ID].ultimate,{enhancedStanceActive:false,enhancedStanceEnabled:true,enhancedUltimateEnabled:true,alternateUltimateEnabled:false,enhancedAlternateUltimateEnabled:false,ultimateText:'Normal saved description',ultimateScript:'window.ultimateExecutions.push("normal");'});
    Handlebars.registerHelper('checked',value=>value?'checked':'');
    const source=await (await fetch('/templates/ultimate-tab.hbs')).text();
    const config=core.getConfig(a),container=document.createElement('div');container.id='full-settings';container.style.cssText='position:absolute;z-index:100;left:15px;top:15px;width:620px;height:930px;overflow:auto;padding:14px;background:#101924;color:white';document.body.append(container);
    container.innerHTML=Handlebars.compile(source)({actor:a,config,enhancedAlternateUltimateChecked:false,elationEnabled:true,isGM:true,elements:[],paths:[],frameColors:[]});
    window.settingsRoot=container.querySelector('.tsru-sheet-tab');
    window.settingNamesBefore=[...settingsRoot.querySelectorAll('[name]')].map(n=>n.name).sort();
    settingsUI.organizeCharacterSettings(settingsRoot,{key:a.id});core.initializeCollapsibleUltimateSections(a,settingsRoot);
    alt.bindAlternateOrbSheet(a,settingsRoot);
    document.querySelector('#sheet').style.display='none';
  });
  assert.deepEqual(await page.evaluate(()=>[...settingsRoot.querySelectorAll('[name]')].map(n=>n.name).sort()),await page.evaluate(()=>settingNamesBefore),'reorganizing and search preserve every named setting exactly once');
  assert.equal(await page.locator('#full-settings [data-settings-menu]').count(),6);
  assert.equal(await page.locator('#full-settings .tsru-settings-page:visible').count(),1);
  const search=page.locator('#full-settings [data-settings-search]');
  await search.fill('alt ult');
  assert.equal(await page.locator('#full-settings [name="alternateUltimateEnabled"]').isVisible(),true);
  assert.equal(await page.locator('#full-settings [name="enhancedAlternateUltimateEnabled"]').isVisible(),true);
  assert.equal(await page.locator('#full-settings [name="max"]').isVisible(),false);
  assert.equal(await page.locator('#full-settings [name="skillText"]').isVisible(),false);
  await search.fill('art');
  assert.equal(await page.locator('#full-settings [name="combatHudPortrait"]').isVisible(),true);
  assert.equal(await page.locator('#full-settings [name="enhancedTokenImage"]').isVisible(),true);
  assert.equal(await page.locator('#full-settings [name="ultimateText"]').isVisible(),false);
  assert.equal(await page.locator('#full-settings [name="current"]').isVisible(),false);
  await page.screenshot({path:path.join(root,'character-settings-search-smoke.png')});
  await page.locator('#full-settings [data-settings-scope]').selectOption('page');
  await page.locator('#full-settings [data-settings-menu="artwork"]').click();
  assert.equal(await page.locator('#full-settings [name="combatHudPortrait"]').isVisible(),true);
  assert.equal(await page.locator('#full-settings [name="enhancedTokenImage"]').isVisible(),false,'this-menu search keeps results on the selected menu');
  await search.fill('portriat crop');
  assert.equal(await page.locator('#full-settings [name="combatHudPortraitX"]').isVisible(),true);
  assert.equal(await page.locator('#full-settings [name="attackGain"]').isVisible(),false);
  await search.fill('zzzzzz');assert.match(await page.locator('#full-settings [data-settings-status]').innerText(),/0 matching/);
  assert.equal(await page.locator('#full-settings .tsru-settings-page:visible').count(),0);
  await page.locator('#full-settings [data-settings-clear]').click();
  await page.locator('#full-settings [data-settings-menu="ultimates"]').click();
  assert.equal(await page.locator('#full-settings [name="max"]').isVisible(),true);
  await search.fill('alt');await page.locator('#full-settings [name="alternateUltimateEnabled"]').check();
  await page.waitForFunction(()=>a.flags[ID].ultimate.alternateUltimateEnabled===true);
  await page.locator('#full-settings [data-action="open-alternate-orb-builder"]').click();
  await page.locator('#tsru-alternate-orb-hero-regular [data-alt-copy-regular]').click();
  await page.waitForSelector('#tsru-alternate-orb-hero-enhanced .tsru-alt-stage [data-alt-piece]');
  const copied=await page.evaluate(()=>alt.getAlternateOrb(a,'regular'));
  await page.locator('#tsru-alternate-orb-hero-enhanced [data-alt-save]').click();
  await page.waitForFunction(()=>a.flags[ID].ultimate.enhancedAlternateUltimateEnabled===true);
  assert.equal(await page.locator('#full-settings [name="enhancedAlternateUltimateEnabled"]').isChecked(),true,'saving the enhanced designer synchronizes the sheet toggle');
  assert.deepEqual(await page.evaluate(()=>alt.getAlternateOrb(a,'enhanced')),copied,'copy preserves geometry, images, glow and circular settings');
  const normalName=copied.components[0].name;
  await page.locator('#tsru-alternate-orb-hero-enhanced [data-alt-field="name"]').fill('Enhanced-only seal');
  await page.locator('#tsru-alternate-orb-hero-enhanced [data-alt-save]').click();
  await page.waitForFunction(()=>a.flags[ID].enhancedAlternateOrb.components[0].name==='Enhanced-only seal');
  assert.equal(await page.evaluate(()=>alt.getAlternateOrb(a,'regular').components[0].name),normalName,'editing the copy cannot change the regular design');
  await page.evaluate(async()=>{await alt.openAlternateOrbDesigner(a,{form:'enhanced'}).close();await alt.openAlternateOrbDesigner(a,{form:'regular'}).close()});
  await page.locator('#full-settings [data-settings-clear]').click();
  await page.locator('#full-settings [data-settings-menu="enhanced"]').click();
  await page.screenshot({path:path.join(root,'character-settings-menu-smoke.png')});
  // A draft created before an enhanced-mode change must not overwrite that change.
  await page.evaluate(async()=>{settingsRoot.querySelector('[name="enhancedAlternateUltimateEnabled"]').checked=false;await core.saveUltimateConfigFromTab(a,$(settingsRoot))});
  assert.equal(await page.evaluate(()=>a.flags[ID].ultimate.enhancedAlternateUltimateEnabled),true);
  assert.equal(await page.evaluate(()=>a.flags[ID].ultimate.ultimateText),'Normal saved description');
  assert.deepEqual(await page.evaluate(()=>[...settingsRoot.querySelectorAll('[name]')].map(n=>n.name).sort()),await page.evaluate(()=>settingNamesBefore));
  assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>failures),[]);
  console.log('Browser smoke passed: 18 direct activation cases and 6 complete queued casts with real splash fetch/decode/rendering above windows, deferred initiative insertion, legacy normal/enhanced chat text, completion/resume, and Energy/free/circular resource reset. Enhanced independent counters, designer copy, full settings template/menu/search and saved-field preservation checks also passed.');
 }catch(error){await page.screenshot({path:path.join(root,'orb-designer-smoke.png'),fullPage:true}).catch(()=>{});throw error;}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exit(1)});
