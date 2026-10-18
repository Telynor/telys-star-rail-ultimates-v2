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
window.notices=[];window.failures=[];
class Picker {
 constructor(options){this.options=options}browse(){this.options.callback('/test-art/red.svg')}
 static async uploadPersistent(id,dir,file){window.lastUpload={id,dir,name:file.name};return {path:await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file)})}}
}
window.foundry={applications:{api:{ApplicationV2:AppV2,HandlebarsApplicationMixin:C=>C,DialogV2:{confirm:async()=>true}},apps:{FilePicker:Picker}},utils:{deepClone:value=>structuredClone(value),randomID:()=>crypto.randomUUID().replaceAll('-',''),escapeHTML:String,mergeObject:(a,b)=>Object.assign(a,b),getProperty:get,setProperty:set,hasProperty:(o,p)=>get(o,p)!==undefined,expandObject:updates=>{const out={};for(const [p,v]of Object.entries(updates))set(out,p,v);return out}}};
window.a={id:'hero',uuid:'Actor.hero',name:'Alchemical Ultimate',img:'/test-art/red.svg',type:'character',isOwner:true,system:{attributes:{hp:{value:20,max:20,temp:0}}},
 flags:{[ID]:{ultimate:{enabled:true,current:80,max:100,mainParty:true,alternateUltimateEnabled:false},alternateOrb:{label:'Alchemical Seals',components:['red','white','black','yellow'].map((id,i)=>({id,name:id[0].toUpperCase()+id.slice(1)+' seal',image:'/test-art/'+id+'.svg',x:i%2?72:28,y:i<2?28:72,scale:45,rotation:0,color:{red:'#e32b38',white:'#f1f5f8',black:'#17171b',yellow:'#efd153'}[id],glow:true}))},alternateOrbStates:{red:true}}},
 getFlag(_,key){return this.flags[ID][key]},async setFlag(_,key,value){this.flags[ID][key]=structuredClone(value);window.drawHud?.()},
 async update(updates){for(const [p,v]of Object.entries(updates))set(this,p,v);window.drawHud?.()},testUserPermission:()=>true};
const actors=[a];actors.get=id=>actors.find(v=>v.id===id);
const gm={id:'gm',isGM:true,active:true},users=[gm];users.get=id=>users.find(v=>v.id===id);
const settings={orbLayouts:{hero:{visible:true,x:1120,y:50,size:190}},elements:[],paths:[],combatPartyHudLayout:{x:1110,y:320,scale:1},partySelections:{},combatHudDesign:{}};
window.game={user:gm,users,actors,combats:new Map(),combat:{started:true,combatants:[{actor:a,actorId:a.id,getFlag:()=>false}]},settings:{get:(_,key)=>settings[key],set:async(_,key,value)=>settings[key]=value},modules:{get:()=>({})}};
window.fromUuid=async uuid=>uuid===a.uuid?a:null;window.canvas={};
const alt=await import('/scripts/alternate-ultimates.mjs');window.alt=alt;
const core=await import('/scripts/module.js');window.core=core;
alt.configureAlternateUltimates({isResolving:a=>core.state.ultimateLocks.has(a.id)});
window.floating=new core.UltimateOrb(a);window.party=new core.CombatPartyHud();
const controls=document.querySelector('#gm-controls');alt.bindAlternateOrbControls(controls);
window.drawHud=()=>{floating.render();party.render();controls.innerHTML=alt.alternateOrbControls(a)};
const sheet=document.querySelector('#sheet');alt.bindAlternateOrbSheet(a,sheet);
sheet.querySelector('input').addEventListener('change',event=>a.update({['flags.'+ID+'.ultimate.alternateUltimateEnabled']:event.target.checked}));
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
    res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><link rel="stylesheet" href="/styles/ultimates.css"><link rel="stylesheet" href="/styles/alternate-ultimates.css"><style>body{margin:0;background:#101521;color:#fff;font-family:Arial,sans-serif}.application{position:absolute;left:18px;top:18px;width:1050px;height:830px;border:1px solid #627185;border-radius:10px;overflow:hidden;display:flex;flex-direction:column}.window-header{padding:9px 14px;background:#222f43;font-size:13px}.window-content{flex:1;min-height:0;overflow:auto}#sheet{position:absolute;left:20px;top:20px;width:600px}#gm-controls{position:absolute;left:1110px;top:530px;width:255px}input{color:inherit}</style></head><body><section id="sheet">'+section+'</section><section id="gm-controls"></section><script type="module">'+bootstrap+'</script></body></html>');return;
   }
   if(pathname.startsWith('/test-art/')){
    const color=({red:'#e32b38',yellow:'#efd153',white:'#f1f5f8',black:'#17171b'})[path.basename(pathname,'.svg')]||'#8494a8';
    res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><path d="M152 152H8A144 144 0 0 1 152 8Z" fill="'+color+'" stroke="#ddd" stroke-width="2"/><path d="M65 56 L93 111 L121 56 Z" fill="none" stroke="#ffffffaa" stroke-width="5"/></svg>');return;
   }
   const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
   let content=await fs.readFile(file);
   if(pathname==='/scripts/module.js')content=content.toString()+'\nexport {UltimateOrb,CombatPartyHud,state};';
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
  await page.locator('[name="alternateUltimateEnabled"]').check();
  assert.equal(await page.locator('[data-tsru-alternate-builder]').isVisible(),true);
  await page.locator('[data-action="open-alternate-orb-builder"]').click();
  await page.waitForSelector('.tsru-alt-stage');
  assert.equal(await page.locator('.tsru-alt-stage [data-alt-piece]').count(),4);
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
  assert.equal(await page.locator('[data-tsru-party-ultimate]').isDisabled(),true);
  for(const id of ['white','black','yellow'])await page.locator('#gm-controls [data-alt-counter="'+id+'"]').click();
  await page.waitForFunction(()=>!document.querySelector('[data-tsru-party-ultimate]').disabled);
  assert.equal(await page.locator('.tsru-orb').isDisabled(),false);
  await page.locator('#gm-controls [data-alt-reset]').click();
  await page.waitForFunction(()=>document.querySelector('[data-tsru-party-ultimate]').disabled);
  assert.equal(await page.locator('.tsru-orb').isDisabled(),true);
  // Color detection handles black/white too, while off-image CSS keeps uploaded artwork.
  const detected=await page.evaluate(async()=>Promise.all(['red','white','black','yellow'].map(c=>alt.detectOrbImageColor('/test-art/'+c+'.svg'))));
  const rgb=detected.map(hex=>hex&&[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)));
  assert.ok(rgb[0][0]>180&&rgb[0][1]<100&&rgb[0][2]<110);
  assert.ok(rgb[1].every(c=>c>220));assert.ok(rgb[2].every(c=>c<60));
  assert.ok(rgb[3][0]>200&&rgb[3][1]>150&&rgb[3][2]<140);
  await page.locator('[data-alt-preview="on"]').click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.tsru-alt-stage img, .tsru-alt-layer img')].every(img=>img.complete&&img.naturalWidth>0));
  await page.screenshot({path:path.join(root,'orb-designer-smoke.png'),fullPage:true});
  await page.evaluate(()=>{const sheet=document.querySelector('#sheet');sheet.style.zIndex='100000';document.querySelector('[name="alternateUltimateEnabled"]').checked=false;document.querySelector('[name="alternateUltimateEnabled"]').dispatchEvent(new Event('change',{bubbles:true}));});
  assert.equal(await page.locator('[data-tsru-alternate-builder]').isVisible(),false);
  assert.equal(await page.locator('.tsru-orb-widget.is-alternate').count(),0);
  assert.equal(await page.locator('[data-tsru-party-ultimate].is-alternate').count(),0);
  assert.equal(await page.evaluate(()=>a.getFlag('','alternateOrb').components.length),4);
  assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>failures),[]);
  console.log('Browser smoke passed: sheet toggle, editor previews, drag, rotate, scale, save, upload, color detection, GM switches, both orb displays, and return to regular mode.');
 }catch(error){await page.screenshot({path:path.join(root,'orb-designer-smoke.png'),fullPage:true}).catch(()=>{});throw error;}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exit(1)});
