// Two real clients exercise the production module, importer, socket coordinator
// and live HSR widgets. Only Foundry document persistence is substituted.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
(async()=>{
  const common=await fs.readFile(path.join(__dirname,'alternate-orb-ui.cjs'),'utf8'),box={require,__dirname};vm.createContext(box);vm.runInContext(common.slice(0,common.indexOf('(async()=>{'))+'\nthis.bootstrap=bootstrap;',box);
  const prefix=box.bootstrap.slice(0,box.bootstrap.indexOf('const alt=await'));
  const bootstrap=prefix+`
const foundation=foundry,baseUI=ui;
const helper=await import('/tests/helpers/path-world.mjs');const w=helper.pathWorld({install:false});window.w=w;
window.foundry={...foundation,utils:{...foundation.utils,...foundry.utils}};window.ui=baseUI;Hooks.once=()=>{};
window.foundry.applications.api.ApplicationV2=class extends AppV2 {
 constructor(opts){super(opts);const d=this.constructor.DEFAULT_OPTIONS;this.element.style.width=Math.min(innerWidth-40,d.position.width)+'px';this.element.style.height=Math.min(innerHeight-40,d.position.height)+'px';this.element.querySelector('.window-header').innerHTML='<span>'+d.window.title+'</span><button data-fixture-close>×</button>';this.element.querySelector('[data-fixture-close]').onclick=()=>this.close();}
 bringToFront(){this.element.style.zIndex=10005;}
};
game.user=new URLSearchParams(location.search).get('role')==='owner'?w.owner:w.gm;
game.user.hotbar={};game.macros=helper.collection();game.user.getFlag=()=>undefined;
const pathModuleData={active:true,version:'3.14.0-preview.28'};game.modules={get:id=>id===ID?pathModuleData:{active:false}};
window.canvas={scene:null,tokens:{placeables:[],controlled:[]}};
const settingsExtra={partySelections:{owner:'hero'},orbLayouts:{},combatHudDesign:{},combatPartyHudLayout:{x:30,y:930,scale:1},selectedMainCharacterId:'hero'};
const oldGet=game.settings.get;game.settings.get=(scope,key)=>Object.hasOwn(settingsExtra,key)?settingsExtra[key]:oldGet(scope,key);game.settings.set=async(_scope,key,value)=>{settingsExtra[key]=structuredClone(value);return value};
const turn={id:'hero-turn',actorId:'hero',actor:w.hero,initiative:17,hidden:false,getFlag:()=>false},battle={id:'battle',started:true,round:1,combatants:helper.collection([turn]),combatant:turn};game.combat=battle;game.combats.push(battle);
const token=w.token('hero-token');
const bus=new BroadcastChannel('path-changing-browser-test'),listeners=[];
game.socket={on(_channel,fn){listeners.push(fn)},emit(_channel,message){bus.postMessage({kind:'socket',message})}};
function relayActor(actor,opts={}){bus.postMessage({kind:'actor',id:actor.id,data:actor.toObject(),opts})}
for(const actor of w.actors){
 const update=actor.update.bind(actor);actor.update=async(patch,opts={})=>{const result=await update(patch,opts);if(result)relayActor(actor,opts);return result;};
 const create=actor.createEmbeddedDocuments.bind(actor);actor.createEmbeddedDocuments=async(type,entries,opts={})=>{const result=await create(type,entries,opts);relayActor(actor,opts);return result;};
 const remove=actor.deleteEmbeddedDocuments.bind(actor);actor.deleteEmbeddedDocuments=async(type,ids,opts={})=>{const result=await remove(type,ids,opts);relayActor(actor,opts);return result;};
 for(const item of actor.items){const change=item.update.bind(item);item.update=async(patch,opts={})=>{const result=await change(patch,opts);if(result)relayActor(actor,opts);return result;};}
}
const updateToken=token.update.bind(token);token.update=async(patch,opts={})=>{await updateToken(patch);if(!opts.noRelay)bus.postMessage({kind:'token',patch});};
bus.onmessage=async event=>{
 const data=event.data;
 if(data.kind==='socket'){for(const fn of listeners)fn(data.message);return;}
 if(data.kind==='token'){await token.update(data.patch,{noRelay:true});return;}
 if(data.kind==='actor'){
  const actor=game.actors.get(data.id),fresh=new helper.PathActor(data.data,{owner:actor.owner});actor._source=fresh._source;actor.items=fresh.items;actor.effects=fresh.effects;for(const document of [...actor.items,...actor.effects])document.parent=actor;
  Hooks.callAll('updateActor',actor,{flags:actor.flags},data.opts);
 }
};
window.fromUuid=async uuid=>{const actor=w.actors.find(actor=>actor.uuid===uuid||uuid.startsWith(actor.uuid+'.Item.'));if(!actor)return null;return uuid===actor.uuid?actor:actor.items.get(uuid.split('.Item.')[1])};
const core=await import('/scripts/module.js');window.core=core;core.registerApi();core.state.partyCombatHud=new core.CombatPartyHud();core.state.partyCombatHud.render();
const pc={document:w.hero,actor:w.hero,element:document.querySelector('#hero-sheet')};w.hero.apps.fixture=pc;
const changer=await import('/scripts/path-changing.mjs');changer.bindPathChangerHeader(pc,pc.element);
const actorLink=document.querySelector('#source-actor');actorLink.draggable=true;actorLink.ondragstart=event=>event.dataTransfer.setData('text/plain',JSON.stringify({type:'Actor',uuid:w.source.uuid}));
window.fixture={open:()=>pathModuleData.api.openPathChanger(w.hero),manage:()=>pathModuleData.api.openPathImporter(w.hero),view:()=>pathModuleData.api.pathChanging.getCatalog(w.hero),active:()=>w.hero.getFlag(ID,'pathChanging')?.activeId,
 inventory:()=>w.inventory(),async spend(){await w.hero.items.get('arrows').update({'system.quantity':7});relayActor(w.hero)},setHP:async()=>w.hero.update({'system.attributes.hp.value':9,[\"flags.\"+ID+\".ultimate.current\"]:5}),close:async()=>{const app=pathModuleData.api.openPathChanger(w.hero);await app.close()},token:()=>({src:token.texture.src,x:token.x,y:token.y,width:token.width,height:token.height}),turn:()=>({id:turn.id,initiative:turn.initiative}),identity:()=>({id:w.hero.id,name:w.hero.name,owner:w.hero._source.ownership.owner}),savedClass:()=>w.hero.items.find(i=>i.type==='class')?.name};
window.ready=true;
`;
  const server=http.createServer(async(req,res)=>{try{
    const pathname=new URL(req.url,'http://local').pathname.replace('/modules/telys-star-rail-ultimates/','/');
    if(pathname==='/'){
      res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles/ultimates.css"><link rel="stylesheet" href="/styles/actor-sheet-controls.css"><link rel="stylesheet" href="/styles/path-changing.css"><style>body{margin:0;background:#0c1422;color:#eff3f8;font:14px Arial}.application{position:fixed;left:20px;top:20px;display:flex;flex-direction:column;border:1px solid #61758d;border-radius:8px;overflow:hidden;z-index:10000;box-shadow:0 20px 70px #0008}.window-header{height:34px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:0 13px;background:#23324a;font-size:12px}.window-header button{width:25px;border:0;background:none;color:#d6deec}.window-content{flex:1;min-height:0;overflow:auto}#hero-sheet{position:absolute;right:20px;top:25px;width:350px;border:1px solid #5d6c7d;border-radius:6px;overflow:hidden}#hero-sheet>p{padding:14px}#source-actor{position:absolute;right:20px;top:170px;width:350px;display:block;padding:20px;background:#26364b;border:1px solid #8c9db7;cursor:grab}.tsru-combat-party-hud{left:30px!important;top:auto!important;bottom:12px!important;z-index:20}</style></head><body><section id="hero-sheet"><header class="window-header"><span>Hero character sheet</span><div class="window-controls"></div></header><p>Same character · shared inventory</p></section><a id="source-actor">Imported template — drag character sheet</a><script type="module">'+bootstrap+'</script></body></html>');return;
    }
    if(/\.png$/.test(pathname)&&!pathname.startsWith('/assets/')||pathname.startsWith('/test-art/')){
      const alt=/alt|preview|red/.test(pathname),color=alt?'#a9d9fa':'#bee2ce';res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 540"><path d="M155 110 85 365 127 407 178 310 222 310 275 407 315 365 244 110Z" fill="'+color+'"/><path d="M158 290 145 505 185 505 200 350 215 505 258 505 241 290" fill="#243b5a"/><ellipse cx="200" cy="74" rx="47" ry="58" fill="#edddc9"/><path d="M150 73Q136 0 204 6Q271 4 251 100L223 44 197 81 187 42 151 104Z" fill="'+(alt?'#d3dfef':'#4b4d60')+'"/><path d="M183 124 200 171 219 124 225 323 175 323Z" fill="#f3f4ec"/><path d="M200 169V311" stroke="#d7bd87" stroke-width="5"/><path d="M149 500 130 522H187V500M215 500V522H273L255 500" fill="#1c2d48"/></svg>');return;
    }
    const filename=path.resolve(root,'.'+pathname);if(!filename.startsWith(root+path.sep))throw Error('Invalid path');let body=await fs.readFile(filename);
    if(pathname==='/scripts/module.js')body=body.toString()+'\nexport {registerApi,CombatPartyHud,state};';
    res.setHeader('Content-Type',pathname.endsWith('.css')?'text/css':/\.m?js$/.test(pathname)?'text/javascript':'application/octet-stream');res.end(body);
  }catch(error){res.writeHead(404);res.end(error.message)}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,gm,owner;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});const ctx=await browser.newContext({viewport:{width:1500,height:1120}}),errors=[];gm=await ctx.newPage();owner=await ctx.newPage();for(const page of [gm,owner])page.on('pageerror',error=>{errors.push(error.message);console.error(error.stack)});
    const url='http://127.0.0.1:'+server.address().port;await gm.goto(url+'/?role=gm');await owner.goto(url+'/?role=owner');for(const page of [gm,owner])await page.waitForFunction(()=>window.ready);
    assert.equal(await owner.locator('[data-actor-control="path-changer"]').count(),0);await gm.locator('[data-actor-control="path-changer"]').click();await gm.locator('[data-path-manage]').click();assert.equal(await gm.locator('[data-path-import-to]').inputValue(),'hero');assert.equal(await gm.locator('[data-path-import-from]').inputValue(),'source');assert.match(await gm.locator('.tsru-path-import-preview').innerText(),/Remembrance/);assert.match(await gm.locator('.tsru-path-import-preview').innerText(),/Ice/);
    await gm.locator('#source-actor').dragTo(gm.locator('[data-path-import-drop]'));await gm.locator('[data-path-import]').click();await gm.waitForFunction(()=>fixture.view().profiles.length===2);await owner.waitForSelector('[data-actor-control="path-changer"]');
    const profiles=await gm.evaluate(()=>fixture.view().profiles),original=profiles.find(p=>p.original).id,alternate=profiles.find(p=>!p.original).id;
    await gm.locator('[data-path-in-combat]').check();await gm.locator('[data-path-save-settings]').click();await owner.waitForFunction(()=>fixture.view().allowInCombat);
    const row=gm.locator('[data-path-config-row="'+alternate+'"]');await row.locator('[data-path-field="name"]').fill('Ice Remembrance');await row.locator('[data-path-field="previewImage"]').fill('/test-art/preview.svg');await row.locator('[data-path-save]').click();await owner.waitForFunction(()=>fixture.view().profiles.some(p=>p.name==='Ice Remembrance'));
    await gm.locator('[data-path-import-from]').scrollIntoViewIfNeeded();await gm.locator('.tsru-path-changing-window').screenshot({path:path.join(root,'path-changing-importer.png')});
    await owner.locator('[data-actor-control="path-changer"]').click();assert.equal(await owner.locator('[data-path-manage]').count(),0);assert.equal(await owner.locator('[data-path-import-from]').count(),0);
    await owner.locator('[data-path-choice="'+alternate+'"]').click();assert.equal(await owner.locator('.tsru-path-art>img').getAttribute('src'),'/test-art/preview.svg');await owner.locator('.tsru-path-changing-window').screenshot({path:path.join(root,'path-changing-selector.png')});
    await owner.locator('[data-path-switch]').click();await gm.waitForFunction(id=>fixture.active()===id,alternate);await owner.waitForFunction(()=>fixture.savedClass()==='Wizard');await owner.waitForFunction(()=>document.querySelector('.tsru-combat-party-portrait img')?.getAttribute('src')==='alt-portrait.png');assert.equal((await gm.evaluate(()=>fixture.token())).src,'alt-token.png');assert.equal((await owner.evaluate(()=>fixture.token())).src,'alt-token.png');
    await owner.evaluate(()=>fixture.spend());await owner.evaluate(()=>fixture.setHP());await gm.waitForFunction(()=>fixture.inventory().find(i=>i._id==='arrows').system.quantity===7);
    await owner.locator('[data-path-choice="'+original+'"]').click();await owner.locator('[data-path-switch]').click();await gm.waitForFunction(id=>fixture.active()===id,original);await owner.waitForFunction(()=>fixture.savedClass()==='Fighter');assert.equal((await owner.evaluate(()=>fixture.inventory())).find(i=>i._id==='arrows').system.quantity,7);assert.equal(await owner.evaluate(()=>w.hero.system.attributes.hp.value),34);
    await owner.locator('[data-path-choice="'+alternate+'"]').click();await owner.locator('[data-path-switch]').click();await gm.waitForFunction(id=>fixture.active()===id,alternate);await owner.waitForFunction(()=>w.hero.system.attributes.hp.value===9);assert.equal(await owner.evaluate(()=>w.hero.getFlag(ID,'ultimate').current),5);assert.deepEqual(await owner.evaluate(()=>fixture.turn()),{id:'hero-turn',initiative:17});assert.deepEqual(await owner.evaluate(()=>fixture.identity()),{id:'hero',name:'Hero',owner:3});
    await owner.locator('.tsru-path-changing-window').evaluate(node=>node.style.width='560px');await owner.waitForFunction(()=>{const c=document.querySelector('.tsru-path-changing-window .window-content');return c.scrollWidth<=c.clientWidth+1});await owner.locator('.tsru-path-changing-window').screenshot({path:path.join(root,'path-changing-compact.png')});
    const reject=await owner.evaluate(async()=>{try{await game.modules.get(ID).api.pathChanging.request('import',w.hero,{revision:fixture.view().revision,sourceActorId:'source'});return 'accepted'}catch(error){return error.message}});assert.match(reject,/Only the GM/);
    assert.deepEqual(errors,[]);for(const page of [gm,owner])assert.deepEqual(await page.evaluate(()=>failures),[]);
    console.log('PASS: two clients use production HSR importer and owner selector; source sheet drop and Path/Element detection; GM preview art; owner-only controls; same Actor/class and linked token artwork changes; remote HUD refresh; shared spent inventory; per-Path HP/Energy restoration; stable initiative and ownership; compact layout; GM-only import enforcement.');
  }catch(error){for(const [role,page]of [['gm',gm],['owner',owner]])if(page&&!page.isClosed()){console.error(role,await page.evaluate(()=>({view:window.fixture?.view(),notices:window.notices,failures:window.failures,body:document.body.innerText})).catch(()=>null));await page.screenshot({path:path.join(root,'path-changing-'+role+'-failure.png'),fullPage:true}).catch(()=>{});}throw error;}
  finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
