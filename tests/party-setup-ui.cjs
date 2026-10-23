// Two real browser clients share settings, document updates and GM socket requests.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
(async()=>{
 const fixture=await fs.readFile(path.join(__dirname,'alternate-orb-ui.cjs'),'utf8'),box={require,__dirname};vm.createContext(box);vm.runInContext(fixture.slice(0,fixture.indexOf('(async()=>{'))+'\nthis.bootstrap=bootstrap;',box);
 const prefix=box.bootstrap.slice(0,box.bootstrap.indexOf("const alt=await"));
 const bootstrap=prefix+`
window.hooks=new Map();window.Hooks={on(name,fn){const list=hooks.get(name)||[];list.push(fn);hooks.set(name,list)},once(){},callAll(name,...args){for(const fn of hooks.get(name)||[])fn(...args)}};
window.foundry.applications.api.ApplicationV2=class extends AppV2{
 constructor(options){super(options);const d=this.constructor.DEFAULT_OPTIONS;this.element.style.width=Math.min(innerWidth-40,d.position.width)+'px';this.element.style.height=Math.min(innerHeight-40,d.position.height)+'px';this.element.querySelector('.window-header').innerHTML='<span>'+d.window.title+'</span><button data-fixture-close>×</button>';this.element.querySelector('[data-fixture-close]').onclick=()=>this.close();}
 bringToFront(){this.element.style.zIndex=10005;}
};
const alice={id:'alice',isGM:false,active:true},ben={id:'ben',isGM:false,active:true};users.push(alice,ben);
game.user=new URLSearchParams(location.search).get('role')==='alice'?alice:gm;
const definitions=[['renard','Renard','alice'],['lark','Mira Larkstep','ben'],['tatsuo','Tatsuo','gm'],['drakarius','Drakarius','gm'],['story','Story Companion','gm']];
actors.splice(0,actors.length,...definitions.map(([id,name,owner])=>({id,uuid:'Actor.'+id,documentName:'Actor',type:'character',name,img:'/art/'+id+'.svg',apps:{},items:[],effects:[],prototypeToken:{},system:{attributes:{hp:{value:40,max:50,temp:0}}},flags:{[ID]:{ultimate:{mainParty:id!=='story',pathId:id==='renard'?'hunt':'remembrance'},partySetupArtwork:[1,2,3,4].map(position=>({image:'/art/'+id+'-'+position+'.svg'}))}},
 get isOwner(){return game.user.isGM||game.user.id===owner},getFlag(scope,key){return this.flags[scope]?.[key]},testUserPermission(user,permission){return user?.isGM||permission==='OBSERVER'||user?.id===owner},reset(){},
 async setFlag(scope,key,value){(this.flags[scope]??={})[key]=structuredClone(value);Hooks.callAll('updateActor',this,{flags:{[scope]:{[key]:value}}},{});bus.postMessage({kind:'actor',id:this.id,flags:this.flags})},
 async update(changes){for(const [key,value]of Object.entries(changes))set(this,key,value);Hooks.callAll('updateActor',this,changes,{});bus.postMessage({kind:'actor',id:this.id,flags:this.flags})}
})));
for(const actor of actors)actor.items.get=id=>actor.items.find(item=>item.id===id);
Object.assign(settings,{partySetup:{configured:true,revision:1,slots:['renard','lark','tatsuo','drakarius'],requiredActorIds:[],requirementsEnabled:false},partySelections:{alice:'renard',ben:'lark'},orbLayouts:{},selectedMainCharacterId:'',combatHudDesign:{}});
combat.combatants=definitions.slice(0,4).map(([id])=>({id:'turn-'+id,actor:actors.get(id),actorId:id,initiative:10,getFlag:()=>false}));combat.combatants.get=id=>combat.combatants.find(c=>c.id===id);combat.combatant=combat.combatants[0];
window.canvas={tokens:{placeables:[],controlled:[]}};
window.fromUuid=async uuid=>actors.find(actor=>actor.uuid===uuid)||null;
const listeners=[],bus=new BroadcastChannel('party-setup-browser-test');
game.socket={on(_channel,fn){listeners.push(fn)},emit(_channel,message){bus.postMessage({kind:'socket',message})}};
game.settings.set=async(_scope,key,value)=>{settings[key]=structuredClone(value);Hooks.callAll('updateSetting',{key:ID+'.'+key});bus.postMessage({kind:'setting',key,value});return value};
bus.onmessage=event=>{const data=event.data;if(data.kind==='socket')for(const fn of listeners)fn(data.message);if(data.kind==='setting'){settings[data.key]=structuredClone(data.value);Hooks.callAll('updateSetting',{key:ID+'.'+data.key});}if(data.kind==='actor'){const actor=actors.get(data.id);actor.flags=structuredClone(data.flags);Hooks.callAll('updateActor',actor,{flags:actor.flags},{});}};
const core=await import('/scripts/module.js');window.core=core;hooks.clear();core.registerApi();core.state.partyCombatHud=new core.CombatPartyHud();core.state.partyCombatHud.render();
for(const [id,name]of definitions){const link=document.createElement('a');link.id='actor-'+id;link.textContent=name;link.draggable=true;link.ondragstart=event=>event.dataTransfer.setData('text/plain',JSON.stringify({type:'Actor',uuid:'Actor.'+id}));document.querySelector('#actors').append(link);}
window.fixture={state:()=>structuredClone(settings.partySetup),order:()=>[...document.querySelectorAll('.tsru-combat-party-member')].map(n=>n.dataset.actorId),art:()=>structuredClone(actors.get('renard').getFlag(ID,'partySetupArtwork'))};
window.ready=true;
`;
 const server=http.createServer(async(req,res)=>{try{
  const pathname=new URL(req.url,'http://local').pathname;
  if(pathname==='/'){
   res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles/ultimates.css"><link rel="stylesheet" href="/styles/party-setup.css"><style>body{margin:0;background:#0d1420;color:#edf3ff;font:14px Arial}.application{position:fixed;left:18px;top:18px;display:flex;flex-direction:column;border:1px solid #586a85;border-radius:8px;overflow:hidden;z-index:10000;box-shadow:0 20px 70px #0008}.window-header{height:34px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:0 14px;background:#1b273d;font-size:12px}.window-header button{width:24px;border:0;background:none;color:#b8c6da}.window-content{flex:1;min-height:0;overflow:auto}#actors{position:absolute;right:12px;top:35px;width:190px;display:grid;gap:8px}#actors a{padding:12px;border:1px solid #49607a;border-radius:4px;background:#1c2b41;cursor:grab}.tsru-combat-party-hud{z-index:100;left:30px!important;top:auto!important;bottom:10px!important}</style></head><body><aside id="actors"><h3>Actor sheets</h3></aside><script type="module">'+bootstrap+'</script></body></html>');return;
  }
  if(pathname.startsWith('/art/')){
   const id=path.basename(pathname,'.svg'),colors={renard:'#b2c6eb',lark:'#a9d4c1',tatsuo:'#daa7b6',drakarius:'#b49cdb',story:'#dec895'},who=id.split('-')[0],color=colors[who]||'#b2c6eb';
   res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 500"><ellipse cx="105" cy="490" rx="65" ry="9" fill="#12264055"/><path d="M76 90Q34 153 43 275L64 370 105 312 150 370 167 275Q171 143 134 90Z" fill="'+color+'"/><path d="M77 269 71 466 91 480 109 312 127 477 149 467 132 268" fill="#29334b"/><path d="M71 466 52 483 52 491 92 491 94 477M129 475 127 491 167 491 164 483 148 465" fill="#192136"/><ellipse cx="105" cy="59" rx="33" ry="43" fill="#e8d8c6"/><path d="M68 67Q61 1 106 4Q154 1 140 77L121 32 99 66 94 38 74 80Z" fill="#404352"/><path d="M75 114 105 152 137 114 125 280 85 280Z" fill="#f0eff0"/><path d="M105 150V272" stroke="#d5b67e" stroke-width="5"/><path d="M66 124 33 225 51 245 91 168M142 124 174 225 156 245 122 169" fill="'+color+'"/><text x="105" y="410" fill="white" text-anchor="middle" font-family="Arial" font-size="17">'+id.replace(/[^a-z0-9-]/g,'')+'</text></svg>');return;
  }
  const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw Error('Invalid path');let body=await fs.readFile(file);if(pathname==='/scripts/module.js')body=body.toString()+'\nexport {registerApi,CombatPartyHud,state};';
  res.setHeader('Content-Type',pathname.endsWith('.css')?'text/css':/\.m?js$/.test(pathname)?'text/javascript':'text/plain');res.end(body);
 }catch(error){res.writeHead(404);res.end(error.message)}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:1440,height:1100}}),gm=await context.newPage(),player=await context.newPage(),errors=[];
  for(const page of [gm,player])page.on('pageerror',error=>{errors.push(error.message);console.error(error.stack)});
  const url='http://127.0.0.1:'+server.address().port;
  await gm.goto(url+'/?role=gm');await player.goto(url+'/?role=alice');
  for(const page of [gm,player]){await page.waitForFunction(()=>window.ready);await page.locator('[data-tsru-party-setup]').click();await page.waitForSelector('[data-party-slot="3"]');assert.equal(await page.locator('[data-party-slot]').count(),4);}
  assert.equal(await player.locator('[data-party-requires-enabled]').count(),0);assert.equal(await player.locator('[data-party-open-artwork]').count(),0);
  await player.locator('[data-party-swap-to]').selectOption('2');await player.locator('[data-party-swap]').click();
  await player.waitForFunction(()=>document.querySelector('[data-party-position="3"] img')?.getAttribute('src')==='/art/renard-3.svg');
  assert.deepEqual(await gm.evaluate(()=>fixture.order()),['renard','lark','tatsuo','drakarius']);
  await player.locator('[data-party-lock]').click();await gm.waitForFunction(()=>fixture.state().slots[2]==='renard');await player.waitForFunction(()=>fixture.order()[2]==='renard');
  assert.deepEqual(await gm.evaluate(()=>fixture.order()),await player.evaluate(()=>fixture.order()));
  assert.equal(await player.locator('[data-party-slot="2"] option[value=""]').isDisabled(),true,'a player cannot remove their active character');
  // A second client saving must preserve and invalidate the first client's draft.
  await gm.locator('[data-party-swap-to]').selectOption('1');await gm.locator('[data-party-swap]').click();
  await player.locator('[data-party-swap-to]').selectOption('3');await player.locator('[data-party-swap]').click();await player.locator('[data-party-lock]').click();
  await gm.waitForSelector('[data-party-reload]');assert.equal(await gm.locator('[data-party-lock]').isDisabled(),true);await gm.locator('[data-party-reload]').click();
  // Drag four real Actor UUID payloads into the GM-only requirement slots.
  await gm.locator('.tsru-party-requires-editor summary').click();
  for(const [index,id]of ['renard','lark','tatsuo','story'].entries())await gm.locator('#actor-'+id).dragTo(gm.locator('[data-party-required-slot="'+index+'"]'));
  await gm.locator('[data-party-requires-enabled]').check();await gm.locator('[data-party-save-requirements]').click();
  await player.waitForFunction(()=>fixture.state().requirementsEnabled&&fixture.state().requiredActorIds.length===4);
  assert.equal(await player.locator('[data-party-lock]').isDisabled(),true);assert.match(await player.locator('.tsru-party-validation').innerText(),/Story Companion/);
  const free=await player.evaluate(()=>fixture.state().slots.indexOf('drakarius'));await player.locator('[data-party-slot="'+free+'"]').selectOption('story');
  await player.waitForFunction(()=>!document.querySelector('[data-party-lock]').disabled);await player.locator('[data-party-lock]').click();await gm.waitForFunction(()=>fixture.state().slots.includes('story'));
  assert.deepEqual(await gm.evaluate(()=>fixture.order()),await player.evaluate(()=>fixture.order()));
  await gm.locator('.tsru-party-setup-window').screenshot({path:path.join(root,'party-setup-shared.png')});
  // The GM can turn constraints off without losing the four configured Actors.
  if(!await gm.locator('[data-party-requires-enabled]').isVisible())await gm.locator('.tsru-party-requires-editor summary').click();
  await gm.locator('[data-party-requires-enabled]').uncheck();await gm.locator('[data-party-save-requirements]').click();await player.waitForFunction(()=>!fixture.state().requirementsEnabled);assert.equal((await player.evaluate(()=>fixture.state().requiredActorIds)).length,4);
  // Each character gets four independent image pickers and saved artwork variants.
  await gm.locator('[data-party-artwork="renard"]').click();await gm.waitForSelector('[data-party-art-field="image"]');assert.equal(await gm.locator('[data-party-art-field="image"]').count(),4);
  for(let index=0;index<4;index++)await gm.locator('[data-party-art-field="image"][data-party-art-index="'+index+'"]').fill('/art/renard-new-'+(index+1)+'.svg');
  await gm.locator('[data-party-art-save]').click();await player.waitForFunction(()=>fixture.art()[3].image==='/art/renard-new-4.svg');
  await gm.locator('.tsru-party-artwork-window').screenshot({path:path.join(root,'party-setup-artwork.png')});await gm.locator('.tsru-party-artwork-window [data-fixture-close]').click();
  await player.locator('[data-party-swap-to]').selectOption('0');await player.locator('[data-party-swap]').click();await player.waitForFunction(()=>document.querySelector('[data-party-position="1"] img')?.getAttribute('src')==='/art/renard-new-1.svg');
  await player.locator('.tsru-party-setup-window').evaluate(node=>node.style.width='680px');
  assert.equal(await player.locator('.window-content').evaluate(node=>node.scrollWidth<=node.clientWidth+1),true);await player.locator('.tsru-party-setup-window').screenshot({path:path.join(root,'party-setup-compact.png')});
  assert.deepEqual(errors,[]);console.log('PASS: two clients share four-slot lineup and HUD order; active-character protection; swaps select the correct artwork; stale drafts cannot overwrite changes; four GM Actor drops and toggleable requirements gate locks; four independent saved artwork fields; compact layout.');
 }catch(error){console.error(error);throw error;}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
