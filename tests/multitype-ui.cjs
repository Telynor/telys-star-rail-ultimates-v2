// Universal Actor Element settings and real Item/activity editor in Chromium.
const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs/promises"),path=require("node:path"),http=require("node:http"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),ID="telys-star-rail-ultimates";
(async()=>{
 const fixture=await fs.readFile(path.join(__dirname,"alternate-orb-ui.cjs"),"utf8"),box={require,__dirname};
 vm.createContext(box);vm.runInContext(fixture.slice(0,fixture.indexOf("(async()=>{"))+"\nthis.bootstrap=bootstrap;",box);
 const bootstrap=box.bootstrap+`
window.multi=await import('/scripts/multitype.mjs');
Handlebars.registerHelper('checked',v=>v?'checked':'');
window.renderTemplate=async(url,data)=>Handlebars.compile(await(await fetch(url.replace('modules/'+ID+'/','/'))).text())(data);
window.Dialog=class {constructor(options,settings){this.data=options;this.options=settings}render(){const node=document.createElement('section');node.className='application tsru-multitype-window';node.innerHTML='<header class="window-header">'+this.data.title+'</header><div class="window-content">'+this.data.content+'</div>';document.querySelectorAll('.tsru-test-dialog').forEach(n=>n.remove());node.classList.add('tsru-test-dialog');document.body.append(node);this.data.render?.($(node));return this}};
settings.elements=['fire','ice','lightning','wind'].map(id=>({id,name:id[0].toUpperCase()+id.slice(1),color:'#48b9e8'}));
a.documentName='Actor';a.flags[ID].ultimate.elementId='fire';a.flags[ID].ultimate.enhancedStanceEnabled=true;a.flags[ID].ultimate.enhancedStanceActive=true;
const item={id:'blade',uuid:a.uuid+'.Item.blade',documentName:'Item',name:'Prismatic Blade',actor:a,system:{activities:[{id:'normal',name:'Normal Slash',type:'attack'},{id:'storm',name:'Storm Spell',type:'damage'}]},flags:{[ID]:{attackElementId:'',activityElements:{}}},getFlag(_,key){return this.flags[ID][key]},async update(patch){for(const [p,v]of Object.entries(patch))set(this,p,v)}};
item.system.activities.get=id=>item.system.activities.find(a=>a.id===id);for(const activity of item.system.activities){activity.actor=a;activity.item=item}a.items.push(item);window.item=item;
window.npc={...a,id:'npc',uuid:'Actor.npc',type:'npc',name:'Elemental NPC',flags:{[ID]:{ultimate:{elementId:'fire',multitypeEnabled:false,multitypeMode:'attacks'}}},items:[]};
window.pet={...npc,id:'npc',uuid:'Scene.map.Token.pet.Actor.npc',name:'Summoned Creature',isToken:true,flags:{[ID]:{ultimate:{elementId:'lightning',multitypeEnabled:true,multitypeMode:'changer'}}}};
game.actors.push(npc);canvas.scene={id:'map'};canvas.tokens={placeables:[{id:'pet',actor:pet,document:{uuid:'Scene.map.Token.pet'}}],get:()=>null};
window.fromUuid=async uuid=>[a,npc,pet,item].find(doc=>doc.uuid===uuid)??null;
document.querySelector('#actor-config').innerHTML=await multi.renderSettings(a,{includeElement:true});multi.bindSettings(a,document.querySelector('#actor-config'));
multi.renderSheetControls({actor:npc,element:document.querySelector('#npc-sheet')});multi.renderSheetControls({actor:pet,element:document.querySelector('#pet-sheet')});
window.drawMenus=async()=>{for(const [id,template]of [['gm-menu','gm-panel'],['dm-menu','dm-combat-menu']]){document.getElementById(id).innerHTML=await renderTemplate('modules/'+ID+'/templates/'+template+'.hbs',{elementActors:multi.elementChangeRows(),elementsTab:true,tabs:[{id:'elements',label:'Element Change',active:true}],characters:[],sceneEnemies:[]});multi.bindElementChanges(document.getElementById(id))}};
await drawMenus();window.multitypeReady=true;
`;
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,"http://local");let pathname=decodeURIComponent(url.pathname).replace("/modules/"+ID+"/","/");
   if(pathname==="/"){res.setHeader("Content-Type","text/html");res.end('<!doctype html><html><head><link rel="stylesheet" href="/styles/ultimates.css"><link rel="stylesheet" href="/styles/alternate-ultimates.css"><link rel="stylesheet" href="/styles/character-settings.css"><link rel="stylesheet" href="/styles/help.css"><link rel="stylesheet" href="/styles/multitype.css"><script src="/test-handlebars.js"></script><script src="/test-jquery.js"></script><style>body{margin:18px;background:#111a28;color:#e9f1fa;font:15px Arial,sans-serif}#fixture{display:none}.application{margin:12px 0;width:680px;max-width:96vw;background:#18263a;border:1px solid #647992}.window-header{padding:12px;background:#263b55}.window-content{padding:16px}#actor-config{padding:18px;width:620px;max-width:90vw}#gm-menu,#dm-menu{width:620px;max-width:90vw;padding:12px}.tsru-config-section{background:#192a40}input,select,button{color:inherit}select{background:#263b55}button{cursor:pointer}</style></head><body><div id="fixture"><section id="sheet"><input type="checkbox" name="alternateUltimateEnabled"></section><div id="gm-controls"></div><div id="art-preview"></div><div id="hud-preview"></div></div><div id="actor-config"></div><section id="npc-sheet" class="application"><header class="window-header"><div class="window-controls"></div>NPC Sheet</header><div class="tab" data-tab="combat"></div></section><section id="pet-sheet" class="application"><header class="window-header"><div class="window-controls"></div>Summon Sheet</header><div class="tab" data-tab="combat"></div></section><div id="gm-menu"></div><div id="dm-menu"></div><script type="module">'+bootstrap+'</script></body></html>');return;}
   if(pathname==="/test-handlebars.js"||pathname==="/test-jquery.js"){res.setHeader("Content-Type","text/javascript");res.end(await fs.readFile(require.resolve(pathname==="/test-jquery.js"?"jquery":"handlebars/dist/handlebars.js")));return;}
   if(pathname.startsWith("/test-art/")){res.setHeader("Content-Type","image/svg+xml");res.end('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="35" fill="#fe7373"/></svg>');return;}
   const file=path.resolve(root,"."+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
   let content=await fs.readFile(file,"utf8");
   if(pathname==="/scripts/module.js")content+="\nexport {UltimateOrb,CombatPartyHud,state,getConfig,combatHudDesignerPreview,ultimateArtworkPreview,registerApi};";
   res.setHeader("Content-Type",pathname.endsWith(".css")?"text/css":/\.m?js$/.test(pathname)?"text/javascript":pathname.endsWith(".json")?"application/json":pathname.endsWith(".svg")?"image/svg+xml":"text/plain");res.end(content);
  }catch(error){res.writeHead(404);res.end(error.message)}
 });
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const page=await browser.newPage({viewport:{width:1360,height:1000}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto("http://127.0.0.1:"+server.address().port);await page.waitForFunction(()=>window.multitypeReady);
  assert.equal(await page.locator('#actor-config [data-multitype-fields]').isVisible(),false);
  await page.locator('#actor-config [name="multitypeEnabled"]').check();
  await page.waitForFunction(()=>a.flags[ID].ultimate.multitypeEnabled===true);
  assert.equal(await page.locator('#actor-config [data-multitype-mode-panel="attacks"]').isVisible(),true);
  await page.locator('#actor-config [data-multitype-attacks]').click();
  await page.waitForSelector('.tsru-test-dialog [data-attack-element-item]');
  await page.locator('[data-attack-element-item][data-attack-element-activity=""]').selectOption("ice");
  await page.locator('[data-attack-element-activity="storm"]').selectOption("lightning");
  await page.waitForFunction(()=>item.flags[ID].activityElements.storm==="lightning");
  assert.equal(await page.evaluate(()=>a.flags[ID].ultimate.elementId),"fire");
  assert.equal(await page.evaluate(()=>multi.attackContext(a,{item,activityId:"storm"}).elementId),"lightning");
  await page.locator('[data-multitype-attack-search]').fill("storm spell");
  assert.equal(await page.locator('[data-multitype-item]').isVisible(),true);
  await page.locator('[data-multitype-attack-search]').fill("missing sword");
  assert.equal(await page.locator('[data-multitype-attack-empty]').isVisible(),true);
  await page.locator('[data-multitype-attack-search]').fill("");
  await page.screenshot({path:path.join(root,"multitype-attacks-smoke.png")});
  await page.locator('.tsru-test-dialog').evaluate(el=>el.remove());
  await page.locator('#actor-config [name="multitypeMode"]').check();
  await page.waitForFunction(()=>a.flags[ID].ultimate.multitypeMode==="changer");
  assert.equal(await page.locator('#actor-config [data-multitype-mode-panel="changer"]').isVisible(),true);
  await page.locator('#actor-config [data-element-change]').selectOption("wind");
  await page.waitForFunction(()=>a.flags[ID].ultimate.elementId==="wind");
  assert.equal(await page.locator('#actor-config [name="elementId"]').inputValue(),"wind");
  assert.equal(await page.evaluate(()=>multi.attackContext(a,{item,activityId:"storm"}).elementId),"wind");
  assert.equal(await page.evaluate(()=>item.flags[ID].activityElements.storm),"lightning");
  assert.equal(await page.evaluate(()=>a.flags[ID].ultimate.enhancedStanceActive),true);
  await page.screenshot({path:path.join(root,"multitype-settings-smoke.png")});
  await page.locator('#npc-sheet [data-multitype-open]').first().click();
  await page.waitForSelector('.tsru-test-dialog [name="multitypeEnabled"]');
  await page.locator('.tsru-test-dialog [name="multitypeEnabled"]').check();
  await page.locator('.tsru-test-dialog [name="multitypeMode"]').check();
  await page.waitForFunction(()=>npc.flags[ID].ultimate.multitypeMode==="changer");
  await page.locator('.tsru-test-dialog').evaluate(el=>el.remove());
  await page.evaluate(()=>drawMenus());
  assert.equal(await page.locator('#gm-menu [data-element-change]').count(),3);
  assert.equal(await page.locator('#dm-menu [data-element-change]').count(),3);
  const petSelector='[data-element-change="Scene.map.Token.pet.Actor.npc"]';
  await page.locator("#gm-menu "+petSelector).selectOption("ice");
  await page.waitForFunction(()=>pet.flags[ID].ultimate.elementId==="ice");
  assert.equal(await page.evaluate(()=>npc.flags[ID].ultimate.elementId),"fire");
  assert.equal(await page.locator("#dm-menu "+petSelector).inputValue(),"ice");
  assert.equal(await page.locator("#pet-sheet "+petSelector).inputValue(),"ice");
  await page.locator('#dm-menu [data-element-change="Actor.npc"]').selectOption("lightning");
  await page.waitForFunction(()=>npc.flags[ID].ultimate.elementId==="lightning");
  assert.equal(await page.evaluate(()=>pet.flags[ID].ultimate.elementId),"ice");
  await page.screenshot({path:path.join(root,"multitype-element-change-smoke.png")});
  await page.evaluate(()=>window.updateFails=true);
  // The failed save restores checked immediately; click instead of asking
  // Playwright to assert an unchecked state that is intentionally rolled back.
  await page.locator('#actor-config [name="multitypeEnabled"]').click();
  await page.waitForFunction(()=>document.querySelector('#actor-config [name="multitypeEnabled"]').checked&&!document.querySelector('#actor-config [name="multitypeEnabled"]').disabled);
  assert.match(await page.evaluate(()=>notices.at(-1)),/Could not save Element settings/);
  await page.evaluate(()=>{window.updateFails=false;failures.length=0;game.user.isGM=false});
  assert.match(await page.evaluate(async()=>{try{await multi.changeElement(a,"ice")}catch(error){return error.message}}),/Only a GM/);
  await page.evaluate(()=>game.user.isGM=true);
  await page.evaluate(async()=>{window.tips=await import('/scripts/help-tooltips.mjs');const hd=await import('/scripts/help-data.mjs');window.helpDocs=await hd.loadHelp();tips.decorateHelp(document,helpDocs)});
  const audit=await page.evaluate(()=>tips.auditHelp(document,helpDocs));
  assert.equal(audit.covered,audit.total);
  const newControls=audit.fallback.filter(entry=>/data-element-change|multitypeEnabled|multitypeMode|data-multitype-attacks/.test(entry.html||entry.outerHTML||""));
  assert.equal(newControls.length,0,JSON.stringify(newControls));
  await page.setViewportSize({width:390,height:900});
  assert.equal(await page.locator('#actor-config').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
  assert.deepEqual(errors,[]);
  console.log("PASS: PC/NPC/summon modes, Item and activity assignments, three live menus, token isolation, failed saves, permissions, detailed help and compact layout.");
 }catch(error){console.error(error);await page.screenshot({path:path.join(root,"multitype-failure.png"),fullPage:true});throw error}
 finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);process.exit(1)});
