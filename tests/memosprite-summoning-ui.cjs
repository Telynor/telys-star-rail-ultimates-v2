// Integrates the real sheet, spell binder, cast transaction, wall geometry and
// companion HUD against a minimal Foundry document adapter.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const vm=require('node:vm');
const nativeRoot=path.resolve(process.env.DND5E_SOURCE_ROOT||path.join(__dirname,'../../dnd5e-reference'));
const root=path.resolve(__dirname,'..'),addon=path.resolve(process.env.MEMOSPRITES_SOURCE_ROOT||path.join(root,'../memosprites-summoning'));
(async()=>{
 const shots=process.env.UPDATE_HELP_IMAGES==='1'?path.join(root,'docs/images'):root;
 const source=await fs.readFile(path.join(root,'tests/summoning-ui.cjs'),'utf8'),box={require,__dirname,process,console};
 vm.runInNewContext(source.slice(0,source.indexOf('(async()=>{'))+'\nthis.baseBootstrap=bootstrap;',box);
 let bootstrap=box.baseBootstrap.replace('once(){},callAll(){}',`once(){},callAll(name,...args){for(const fn of hooks.get(name)??[])fn(...args)},call(name,...args){let valid=true;for(const fn of hooks.get(name)??[])if(fn(...args)===false)valid=false;return valid;}`)
 .replace("this.root.append(this.shape);return this;}\n circle","this.shape.setAttribute('fill','none');this.root.append(this.shape);return this;}\n circle")
 .replace('window.game={',`window.moduleRecords=new Map([['telys-star-rail-ultimates',{active:true,version:'3.14.0-preview.20',api:{}}],['telys-memosprites',{active:true,version:'1.3.2',api:{}}]]);window.game={`)
 .replace('modules:{get:()=>({api:{}})}','modules:{get:id=>moduleRecords.get(id)}')
 .replace('getFlag(_,key){return this.flags[ID][key]}','getFlag(scope,key){return this.flags[scope]?.[key]}');
 bootstrap=bootstrap.replace('window.ready=true;',`
 const M='telys-memosprites';window.M=M;canvas.ready=true;
 foundry.utils.hasProperty=(o,p)=>get(o,p)!==undefined;
 window.fire=(name,...args)=>Hooks.callAll(name,...args);
 a.setFlag=async(scope,key,value)=>{(a.flags[scope]??={})[key]=structuredClone(value);fire('updateActor',a,{['flags.'+scope+'.'+key]:value});};
 wolf.system={attributes:{hp:{value:999,max:999}}};
 for(const source of actors)if(!source.getFlag){source.flags={};source.type='npc';source.getFlag=(scope,key)=>source.flags[scope]?.[key];}
 a.flags[M]={config:{enabled:true,sourceUuid:'Actor.wolf',portrait:'/art/default.svg',image:'/art/default.svg',portraitCropX:22,portraitCropY:18,portraitCropScale:160,hp:20,maxHp:20,resource:2,resourceMax:3}};
 const coll=entries=>{entries.get=id=>entries.find(x=>x.id===id);return entries;};
 window.castMode='success';window.nativePosition={x:400,y:320,width:1,height:1};window.spellUses=[];
 const nativeUse=async function(usage){
   spellUses.push({actor:this.actor.uuid,sp:settings.skillPoints,hp:a.system.attributes.hp.value,consume:usage.consume});
   const activity={type:'summon',actor:this.actor,item:this,getUsageToken:()=>scene.tokens.get('caster')};
   if(Hooks.call('dnd5e.preUseActivity',activity,usage)===false)return;
   if(castMode==='cancel')return;
   const data={...nativePosition,actorId:'wolf',texture:{src:wolf.img},flags:{}};
   fire('dnd5e.summonToken',activity,{},data,usage.summons);
   const tokens=await scene.createEmbeddedDocuments('Token',[data]);
   fire('dnd5e.postSummon',activity,{},tokens,usage.summons);return {summoned:tokens};
 };
 window.known={id:'known',uuid:'Actor.hero.Item.known',name:'Known Frost Wolf',documentName:'Item',type:'spell',actor:a,use:nativeUse};a.items=coll([known]);
 window.compendium={uuid:'Compendium.test.spells.Item.wolf',name:'Conjure Frost Wolf',img:wolf.img,documentName:'Item',type:'spell',pack:'test.spells',toObject:()=>({_id:'wolf',name:'Conjure Frost Wolf',img:wolf.img,type:'spell',flags:{}}),sheet:{render:()=>window.opened=true}};
 window.fromUuid=async uuid=>uuid===compendium.uuid?compendium:actors.find(x=>x.uuid===uuid);
 window.fromUuidSync=uuid=>actors.find(x=>x.uuid===uuid)||a.items.find(x=>x.uuid===uuid);
 a.createEmbeddedDocuments=async(_,rows)=>rows.map(row=>{const item={...row,id:'imported',uuid:'Actor.hero.Item.imported',documentName:'Item',actor:a,use:nativeUse,getFlag(scope,key){return this.flags?.[scope]?.[key]}};a.items.push(item);return item;});
 scene.createEmbeddedDocuments=async(_,rows)=>{
   const result=[];
   for(const data of rows){const id='live-'+(++tokenSequence),token={...structuredClone(data),id,uuid:'Scene.map.Token.'+id,parent:scene,getFlag(scope,key){return this.flags?.[scope]?.[key]}};
    if(Hooks.call('preCreateToken',token,data)===false)continue;
    token.actor={documentName:'Actor',type:'npc',id:'wolf',uuid:token.uuid+'.Actor.wolf',img:wolf.img,flags:{},items:[],getFlag(scope,key){return this.flags[scope]?.[key]},system:{attributes:{hp:{value:40,max:80}}}};
    scene.tokens.push(token);created.push(token);result.push(token);fire('createToken',token);
   }drawTokens();return result;
 };
 scene.deleteEmbeddedDocuments=async(_,ids)=>{for(const id of ids){const index=scene.tokens.findIndex(t=>t.id===id);if(index>=0){const [token]=scene.tokens.splice(index,1);fire('deleteToken',token);}}drawTokens();};
 scene.tokens.get('caster').parent=scene;scene.tokens.get('caster').actor=a;
 window.memo=await import('/memo/scripts/memosprites.js');window.links=await import('/memo/scripts/summon-links.mjs');
 links.installSummonLinks(memo.syncHud);memo.syncHud();
 window.defaults=JSON.stringify(a.getFlag(M,'config'));
 const spells=await import('/scripts/ability-spells.mjs');spells.bindSkillSpellSettings(a,settingsRoot);
 const tips=await import('/scripts/help-tooltips.mjs');window.tips=tips;await tips.installContextualHelp({});
 window.helpData=await(await import('/scripts/help-data.mjs')).loadHelp();
 window.ready=true;
 `);
 const css=`body{margin:0;background:#101c29;color:#e4f2fa;font:14px Arial}h1{font-size:22px;margin:22px}#sheet{position:absolute;left:20px;top:65px;width:490px;height:820px;overflow:auto;padding:12px;background:#192b3d;border:1px solid #577285;border-radius:9px}#map{position:absolute;left:550px;top:90px;width:800px;height:800px;background-color:#23313d;background-image:linear-gradient(#8aa2b32b 1px,transparent 1px),linear-gradient(90deg,#8aa2b32b 1px,transparent 1px);background-size:80px 80px;overflow:hidden}#map:before{content:'';position:absolute;left:559px;top:0;height:800px;width:3px;background:#e9b36e;pointer-events:none}#tokens{position:absolute;inset:0;pointer-events:none}.map-token{position:absolute;display:grid;place-items:center;box-sizing:border-box;background:#a6e8ff33;border:2px solid #83cde3;border-radius:12px}#controls{position:absolute;left:550px;top:30px;display:flex;gap:12px;align-items:center}button{color:inherit;background:#234557;border:1px solid #71aebf;padding:7px}#controls button{width:auto}input,select,textarea{color:inherit;background:#20394a}#caption{position:absolute;left:550px;top:915px;color:#a6c0ce}.tsru-combat-party-hud{position:absolute!important;left:580px!important;top:660px!important;bottom:auto!important;transform:none!important;width:230px!important;height:190px!important;padding:18px!important;z-index:12!important;background:#132335ee;border:1px solid #597d92;border-radius:10px}.tsru-combat-party-member{position:relative!important;width:184px;height:150px;margin:0!important}.tsru-combat-party-member>img{position:absolute;width:100%;height:100%;object-fit:cover;opacity:.45}.tsru-combat-party-member>strong{position:absolute;bottom:0;left:10px;font-size:12px}#hud-heading{position:absolute;left:580px;top:630px;font-weight:600;color:#bce9f3}`;
 const server=http.createServer(async(req,res)=>{try{
   const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname).replace('/modules/telys-star-rail-ultimates','');
   if(pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta charset="utf-8"><script src="/handlebars.js"></script><script src="/jquery.js"></script>'+['ultimates','character-settings','help'].map(n=>'<link rel="stylesheet" href="/styles/'+n+'.css">').join('')+'<link rel="stylesheet" href="/memo/styles/memosprites.css"><style>'+css+'</style></head><body><h1>Skill spell casting · Live companion HUD</h1><div id="sheet"></div><div id="controls"><button id="cast-skill">Use Skill</button><button id="cast-ultimate">Use Ultimate</button><span id="balance">SP 5 · HP 39</span></div><div id="map"><div id="tokens"></div></div><p id="caption">5 ft per square · amber line: lighting barrier · full-sized footprint required</p><span id="hud-heading">Summoner’s companion HUD</span><div class="tsru-combat-party-hud"><article class="tsru-combat-party-member" data-actor-id="hero"><img src="/art/hero.svg"><strong>Summoner</strong></article></div><script type="module">'+bootstrap+'</script></body></html>');return;}
   if(pathname==='/native-system/token-placement.mjs'){res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(path.join(nativeRoot,'module/canvas/token-placement.mjs')));return;}
   if(pathname==='/handlebars.js'||pathname==='/jquery.js'){res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(require.resolve(pathname==='/jquery.js'?'jquery':'handlebars/dist/handlebars.js')));return;}
   if(pathname.startsWith('/art/')||pathname.startsWith('/icons/')){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="'+(pathname.includes('default')?'#856e8f':'#336f8f')+'"/><path d="M10 46 18 12 32 28 46 12 54 46 32 55Z" fill="#d2f6ff"/><circle cx="24" cy="38" r="3" fill="#19313e"/><circle cx="40" cy="38" r="3" fill="#19313e"/></svg>');return;}
   const base=pathname.startsWith('/memo/')?addon:root,relative=pathname.startsWith('/memo/')?pathname.slice(5):pathname,file=path.resolve(base,'.'+relative);if(!file.startsWith(base+path.sep))throw Error('Invalid path');let content=await fs.readFile(file);
   if(pathname==='/scripts/module.js')content+='\nexport {requestSkill,requestUltimate,state,getConfig,registerApi,saveUltimateConfigFromTab};export function isolateSummoningPresentation(){refreshOrb=()=>{};dispatchTalentEvent=async()=>{};broadcastUltimateSplash=()=>{};refreshToughnessBars=()=>{};refreshResourceHuds=()=>{};refreshCombatPartyHud=()=>{};refreshPunchlineHUD=()=>{};refreshSkillUI=()=>{};refreshBossHud=()=>{};refreshInitiativeCarousel=()=>{};refreshTalentCounter=()=>{};dockSceneControlsBesideCarousel=()=>{};}';
   if(pathname==='/memo/scripts/memosprites.js')content+='\nexport {syncHud,config,openSummonPicker,performSummonAction};';
   res.setHeader('Content-Type',/\.m?js$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':file.endsWith('.png')?'image/png':'text/plain');res.end(content);
 }catch(e){res.writeHead(404);res.end(e.message);}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']}),page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack)});
 const drop=async data=>page.locator('[data-spell-drop]').evaluate((node,data)=>{const dataTransfer=new DataTransfer();dataTransfer.setData('text/plain',JSON.stringify(data));node.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer}));},data);
 try{
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);
  await page.locator('[data-settings-menu="abilities"]').click();await page.locator('[data-spell-enabled]').check();await page.locator('[data-spell-known]').selectOption('known');
  await page.waitForFunction(()=>a.getFlag(ID,'ultimate').skillSpell?.itemId==='known');assert.equal(await page.locator('[data-spell-mode]').isChecked(),false);
  await page.locator('[data-spell-mode]').check();const switchBox=await page.locator('[data-spell-mode]').boundingBox();assert.ok(switchBox.width>switchBox.height*1.5,'source switch keeps its horizontal shape');await drop({type:'Actor',uuid:'Actor.wolf'});await page.waitForFunction(()=>notices.some(n=>n.includes('compendium')));assert.equal(await page.evaluate(()=>a.getFlag(ID,'ultimate').skillSpell.uuid),'');
  await drop({type:'Item',uuid:'Compendium.test.spells.Item.wolf'});await page.waitForFunction(()=>a.getFlag(ID,'ultimate').skillSpell.uuid.includes('Compendium.'));
  await page.locator('[data-spell-open]').click();assert.equal(await page.evaluate(()=>opened),true);
  await page.mouse.move(1370,950);await page.keyboard.press('Escape');await page.locator('[data-skill-spell]').screenshot({path:path.join(shots,'skill-spells.png')});
  await page.locator('#cast-skill').click();await page.evaluate(()=>cast);await page.waitForSelector('.tms-frame.is-summoned .tms-hp');
  assert.equal(await page.locator('.tms-hp').getAttribute('aria-label'),'40 of 80 HP');assert.equal(await page.locator('.tms-portrait img').getAttribute('src'),'/art/wolf.svg');
  assert.deepEqual(await page.evaluate(()=>spellUses[0]),{actor:'Actor.hero',sp:4,hp:39,consume:false});assert.equal(await page.evaluate(()=>a.items.length),2);
  await page.evaluate(()=>{const token=scene.tokens.at(-1);token.actor.system.attributes.hp.value=12;fire('updateActor',token.actor,{'system.attributes.hp.value':12});});await page.waitForFunction(()=>document.querySelector('.tms-hp')?.getAttribute('aria-label')==='12 of 80 HP');
  await page.locator('.tsru-combat-party-hud').screenshot({path:path.join(shots,'memosprite-live-summon.png')});
  await page.evaluate(()=>{const token=scene.tokens.at(-1);token.actor.system.attributes.hp.value=0;fire('updateActor',token.actor,{'system.attributes.hp.value':0});});await page.waitForSelector('.tms-frame.is-idle');assert.equal(await page.locator('.tms-hp').count(),0);assert.equal(await page.locator('.tms-portrait img').getAttribute('src'),'/art/default.svg');assert.equal(await page.evaluate(()=>JSON.stringify(a.getFlag(M,'config'))===defaults),true);
  await page.evaluate(()=>scene.deleteEmbeddedDocuments('Token',[scene.tokens.at(-1).id]));await page.locator('#cast-skill').click();await page.evaluate(()=>cast);assert.equal(await page.evaluate(()=>a.items.length),2,'the imported owned spell is reused');
  await page.evaluate(()=>scene.deleteEmbeddedDocuments('Token',[scene.tokens.at(-1).id]));await page.waitForSelector('.tms-frame.is-idle');assert.equal(await page.locator('.tms-hp').count(),0);
  const sp=await page.evaluate(()=>settings.skillPoints);await page.evaluate(()=>{nativePosition={x:400,y:320,width:4,height:4};});await page.locator('#cast-skill').click();await page.evaluate(()=>cast);assert.equal(await page.evaluate(()=>settings.skillPoints),sp,'Cannot Fit refunds SP');assert.equal(await page.evaluate(()=>scene.tokens.length),1);assert.match(await page.evaluate(()=>notices.at(-1)),/Cannot Fit/);
  await page.evaluate(()=>{Object.assign(wolf.prototypeToken,{width:4,height:4});canvas.tokens.controlled[0].document=scene.tokens.get('caster');});
  assert.match(await page.evaluate(async()=>{try{await memo.performSummonAction(a,'summon',{x:400,y:320});return '';}catch(e){return e.message;}}),/Cannot Fit/);
  await page.evaluate(()=>{window.memoPlacement=memo.openSummonPicker(a)});await page.waitForSelector('[data-native-placement]');const map=await page.locator('#map').boundingBox();await page.mouse.move(map.x+160,map.y+480);await page.mouse.move(1370,950);await page.keyboard.press('Tab');await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-native-placement]').count(),0,'Escape cancels the memosprite picker');
  await page.evaluate(()=>{window.memoPlacement=memo.openSummonPicker(a)});await page.mouse.move(map.x+160,map.y+480);await page.locator('.tsru-combat-party-hud').evaluate(el=>el.style.setProperty('display','none','important'));await page.locator('#hud-heading').evaluate(el=>el.hidden=true);await page.locator('#map').screenshot({path:path.join(shots,'memosprite-placement.png')});await page.locator('.tsru-combat-party-hud').evaluate(el=>el.style.removeProperty('display'));await page.locator('#hud-heading').evaluate(el=>el.hidden=false);await page.keyboard.press('Escape');
  await page.evaluate(()=>{window.memoPlacement=memo.openSummonPicker(a)});await page.mouse.click(map.x+160,map.y+480);await page.waitForFunction(()=>scene.tokens.length===2);assert.equal(await page.evaluate(()=>scene.tokens.at(-1).width),4,'a large companion can actually be placed in a mapped room');
  await page.evaluate(()=>scene.deleteEmbeddedDocuments('Token',[scene.tokens.at(-1).id]));
  await page.evaluate(()=>{castMode='cancel';nativePosition={x:400,y:320,width:1,height:1};});await page.locator('[data-spell-mode]').uncheck();assert.equal(await page.locator('[data-spell-known]').inputValue(),'known');await page.locator('#cast-skill').click();await page.evaluate(()=>cast);assert.equal(await page.evaluate(()=>settings.skillPoints),sp,'closed spell dialog refunds SP');
  const audit=await page.evaluate(()=>tips.auditHelp(settingsRoot,helpData));assert.equal(audit.fallback.filter(x=>/data-spell-/.test(x.html)).length,0,'spell controls have authored tooltips');assert.deepEqual(errors,[]);
  await page.evaluate(()=>{castMode='success';scene.walls.splice(0);nativePosition={x:400,y:320,width:12,height:12};settings.skillPoints=5;});await page.locator('#cast-skill').click();await page.evaluate(()=>cast);
  assert.equal(await page.evaluate(()=>scene.tokens.length),2);assert.equal(await page.evaluate(()=>scene.tokens.at(-1).width),12,'native spell can place a giant on an open map');
  await page.evaluate(()=>scene.deleteEmbeddedDocuments('Token',[scene.tokens.at(-1).id]));
  await page.evaluate(()=>{Object.assign(wolf.prototypeToken,{width:8,height:8});window.memoPlacement=memo.openSummonPicker(a);});await page.waitForSelector('[data-native-placement]');await page.mouse.click(map.x+720,map.y+640);await page.waitForFunction(()=>scene.tokens.length===2);
  assert.equal(await page.evaluate(()=>scene.tokens.at(-1).width),8,'the memosprite picker uses the same open-map exception');assert.deepEqual(errors,[]);
  console.log('PASS: v14 Level contract, Spell known/Other UI, costs/refunds, live HP/portrait/reset, actual mapped-room memosprite placement, giant native-spell and memosprite placement on open maps, Escape and authored help.');
 }catch(e){await page.screenshot({path:path.join(root,'memosprite-summoning-failure.png')});console.error(await page.evaluate(()=>({notices,errors,flags:a.flags})));throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
