// Exercise the real sheet hook and production CSS against native D&D5e 5.3.3
// card geometry, including the fixed-width row responsible for the overflow.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'..');
const ID='telys-star-rail-ultimates';
const nativeCards=['str','dex','con','int','wis','cha'].map(key=>`<div class="ability-score" data-ability="${key}"><a class="label ability-check" data-action="roll" data-type="ability">${key.toUpperCase()}</a><div class="mod">+0</div><div class="score">10</div></div>`).join('');
const bootstrap=`
window.Hooks={on(){},once(){}};window.FormApplication=class {};
window.foundry={applications:{api:{ApplicationV2:class {},HandlebarsApplicationMixin:C=>C}},utils:{deepClone:value=>structuredClone(value),mergeObject:(a,b)=>Object.assign(a,b)}};
window.notices=[];window.ui={notifications:{info:message=>notices.push(message)}};
window.game={user:{isGM:true},settings:{get(){}}};
window.updates=[];window.nativeChanges=0;
window.a={documentName:'Actor',id:'hero',name:'Hero',type:'character',isOwner:true,flags:{regenScore:10,breakEffectScore:10},getFlag(){return this.flags},async update(patch){updates.push(patch);for(const [key,value]of Object.entries(patch))this.flags[key.split('.').at(-1)]=value}};
window.sheet=document.querySelector('#ability-sheet');window.nativeRow=sheet.querySelector('.bottom').innerHTML;
sheet.addEventListener('change',()=>nativeChanges++);
const {injectEnergyAbility,injectLightConeSheetPanel}=await import('/scripts/module.js');window.injectEnergyAbility=injectEnergyAbility;window.injectLightConeSheetPanel=injectLightConeSheetPanel;
window.app={actor:a,element:sheet};await injectEnergyAbility(app,sheet);window.ready=true;
`;
(async()=>{
 const server=http.createServer(async(req,res)=>{
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
   if(pathname==='/'){
    res.setHeader('Content-Type','text/html');
    res.end('<!doctype html><html><head><link rel="stylesheet" href="/fixtures/dnd5e-ability-row.css"><link rel="stylesheet" href="/styles/ultimates.css"><script src="/jquery.js"></script><style>input.uninput{background:transparent;border:1px solid transparent;color:inherit}input:disabled{opacity:1}</style></head><body><form id="ability-sheet" class="dnd5e2 sheet actor character tab-details"><header>Character Sheet</header><section class="ability-scores optional-ability-0"><div class="rows"><div class="top"></div><div class="bottom">'+nativeCards+'</div></div></section><footer>Character Settings</footer></form><script type="module">'+bootstrap+'</script></body></html>');return;
   }
   if(pathname==='/jquery.js'){res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(require.resolve('jquery')));return;}
   const file=path.resolve(root,pathname.startsWith('/fixtures/')?'tests'+pathname:'.'+pathname);
   if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
   let data=await fs.readFile(file);
   if(pathname==='/scripts/module.js')data=data.toString()+'\nexport {injectEnergyAbility,injectLightConeSheetPanel};';
   res.setHeader('Content-Type',pathname.endsWith('.css')?'text/css':pathname.endsWith('.svg')?'image/svg+xml':'text/javascript');res.end(data);
  }catch(error){res.writeHead(404);res.end(error.message);}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1400,height:700}}),errors=[];
 page.on('pageerror',error=>{errors.push(error.message);console.error('Browser error:',error.stack)});
 try{
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);
  assert.equal(await page.locator('#ability-sheet .ability-score').count(),8);
  assert.equal(await page.locator('[data-tsru-native-ability]').count(),2,'the added cards use the native label/mod/score structure');
  assert.equal(await page.locator('[data-tsru-energy-ability] .label').innerText(),'REGEN');
  assert.equal(await page.locator('[data-tsru-break-ability] .label').innerText(),'BREAK');
  await page.evaluate(async()=>{await injectEnergyAbility(app,sheet);await injectEnergyAbility(app,sheet)});
  assert.equal(await page.locator('#ability-sheet .ability-score').count(),8,'repeated render hooks do not duplicate scores');
  const measurements=[];
  for(const sidebar of [230,0])for(const width of [1200,1000,840,800,720,640]){
   await page.evaluate(({width,sidebar})=>{sheet.style.width=width+'px';sheet.style.setProperty('--dnd5e-sheet-sidebar-width',sidebar+'px')},{width,sidebar});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const result=await page.evaluate(()=>{
    const bounds=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
    const cards=[...sheet.querySelectorAll('.ability-score')];
    return {sheet:bounds(sheet),row:bounds(sheet.querySelector('.bottom')),scrollWidth:sheet.scrollWidth,clientWidth:sheet.clientWidth,cards:cards.map(card=>({box:bounds(card),label:bounds(card.querySelector('.label')),score:bounds(card.querySelector('.score')),input:card.querySelector('input')?bounds(card.querySelector('input')):null,background:getComputedStyle(card,'::before').backgroundImage,clip:getComputedStyle(card).clipPath,labelColor:getComputedStyle(card.querySelector('.label')).color,labelSize:getComputedStyle(card.querySelector('.label')).fontSize,modSize:getComputedStyle(card.querySelector('.mod')).fontSize,scoreColor:getComputedStyle(card.querySelector('.score')).backgroundColor}))};
   });
   const native=result.cards[0];
   for(const card of result.cards){
    assert.ok(card.box.width>15,'cards stay visible');
    assert.ok(card.box.x>=result.row.x-.5&&card.box.right<=result.row.right+.5,`card stays in row at sheet ${width}, sidebar ${sidebar}`);
    assert.ok(card.box.right<=result.sheet.right+.5,'no card escapes the sheet');
    assert.ok(card.label.x>=card.box.x-.5&&card.label.right<=card.box.right+.5,'labels fit their cards');
    assert.ok(card.score.x>=card.box.x-.5&&card.score.right<=card.box.right+.5,'score boxes fit their cards');
    if(card.input)assert.ok(card.input.x>=card.box.x-.5&&card.input.right<=card.box.right+.5,'editable scores fit their cards');
    assert.ok(Math.abs(card.box.width-native.box.width)<.5&&Math.abs(card.box.height-native.box.height)<.5,'all eight cards scale equally');
    for(const property of ['background','clip','labelColor','labelSize','modSize','scoreColor'])assert.equal(card[property],native[property],`native ${property} is shared by added scores`);
   }
   assert.ok(result.scrollWidth<=result.clientWidth+1,`sheet has no horizontal overflow at ${width}, sidebar ${sidebar}`);
   measurements.push({width,sidebar,cardWidth:native.box.width});
  }
  assert.ok(measurements.find(m=>m.width===800&&m.sidebar===230).cardWidth<64,'cards shrink below their native width when needed');
  await page.evaluate(()=>{sheet.style.width='1000px';sheet.style.setProperty('--dnd5e-sheet-sidebar-width','230px')});
  const regen=page.locator('[data-tsru-energy-ability] input'),effect=page.locator('[data-tsru-break-ability] input');
  await regen.fill('14');await regen.press('Tab');await page.waitForFunction(()=>a.flags.regenScore===14);
  assert.equal(await page.locator('[data-tsru-energy-ability] .mod').innerText(),'+2');
  await effect.fill('18');await effect.press('Tab');await page.waitForFunction(()=>a.flags.breakEffectScore===18);
  assert.equal(await page.locator('[data-tsru-break-ability] .mod').innerText(),'+4');
  await regen.fill('0');await regen.press('Tab');await page.waitForFunction(()=>a.flags.regenScore===1);
  assert.equal(await regen.inputValue(),'1');
  await effect.fill('99');await effect.press('Tab');await page.waitForFunction(()=>a.flags.breakEffectScore===30);
  assert.equal(await effect.inputValue(),'30');
  assert.equal(await page.evaluate(()=>nativeChanges),0,'editing HSR scores does not submit the native ability fields');
  assert.ok((await page.evaluate(()=>updates)).every(patch=>Object.keys(patch).every(key=>key===`flags.${ID}.ultimate.regenScore`||key===`flags.${ID}.ultimate.breakEffectScore`)));
  assert.equal(await page.locator('.tsru-energy-ability input[name]').count(),0,'custom score inputs do not impersonate native ability fields');
  await page.locator('#ability-sheet').screenshot({path:path.join(root,'ability-scores-wide-smoke.png')});
  await page.evaluate(()=>sheet.style.width='800px');
  await page.locator('#ability-sheet').screenshot({path:path.join(root,'ability-scores-compact-smoke.png')});
  await page.evaluate(async()=>{game.user.isGM=false;a.isOwner=false;sheet.querySelector('.bottom').innerHTML=nativeRow;await injectEnergyAbility(app,sheet)});
  assert.equal(await regen.isDisabled(),true);assert.equal(await effect.isDisabled(),true);
  const before=await page.evaluate(()=>updates.length);
  await regen.evaluate(el=>{el.value='20';el.dispatchEvent(new Event('change',{bubbles:true}))});
  assert.equal(await page.evaluate(()=>updates.length),before,'unowned actors cannot be edited through synthetic changes');
  await page.evaluate(async()=>{a.isOwner=true;sheet.querySelector('.bottom').innerHTML=nativeRow;await injectEnergyAbility(app,sheet)});
  assert.equal(await regen.isEnabled(),true);assert.equal(await effect.isEnabled(),true,'owners retain direct editing');
  assert.equal(await regen.inputValue(),'1');assert.equal(await effect.inputValue(),'30','saved scores survive sheet rerenders');
  await page.evaluate(async()=>{
   sheet.querySelector('.bottom').innerHTML=nativeRow;
   for(const card of sheet.querySelectorAll('[data-ability]'))card.querySelector('.score').innerHTML='<input type="text" class="uninput" name="system.abilities.'+card.dataset.ability+'.value" value="10">';
   await injectEnergyAbility(app,sheet);
  });
  assert.equal(await page.locator('#ability-sheet [name^="system.abilities."]').count(),6,'edit mode preserves each native ability field once');
  assert.equal(await page.locator('#ability-sheet .ability-score').count(),8);
  assert.equal(await page.locator('.tsru-energy-ability input[name]').count(),0);
  const editableSizes=await page.locator('#ability-sheet .score input').evaluateAll(inputs=>inputs.map(input=>({width:input.getBoundingClientRect().width,height:input.getBoundingClientRect().height})));
  assert.ok(editableSizes.every(size=>Math.abs(size.width-editableSizes[0].width)<.5&&Math.abs(size.height-editableSizes[0].height)<.5),'edit-mode score fields match the native fields');
  await page.evaluate(async()=>{
    foundry.utils.randomID=()=>crypto.randomUUID();
    foundry.applications.ux={TextEditor:{implementation:{enrichHTML:async text=>text}}};
    Object.defineProperty(window,'TextEditor',{configurable:true,get(){throw Error('Deprecated TextEditor global used');}});
    const root=document.createElement('section');root.id='light-cone-sheet';root.style.cssText='width:900px;position:relative';
    root.innerHTML='<section class="tab" data-tab="details"><div class="left"></div><div class="right"><div class="top flexrow"><div class="saves"></div><div class="pills-lg" id="light-cone-identity" style="width:600px"><div data-item-id="race">Species</div><div data-item-id="background">Background</div></div></div></div></section><section class="tab" data-tab="inventory"><div data-item-id="race"></div><div data-item-id="background"></div></section>';
    document.body.append(root);
    const cone={id:'cone',uuid:'Actor.lc.Item.cone',name:'Test Light Cone',img:'/assets/paths/Path_Abundance.png',getFlag:()=>({enabled:true,pathId:'',description:'Shared Light Cone description'})};
    const items=[{id:'race',type:'race'},{id:'background',type:'background'},cone];items.get=id=>items.find(item=>item.id===id);
    const actor={documentName:'Actor',type:'character',name:'Light Cone Hero',items,isOwner:true,getFlag:(_scope,key)=>key==='selectedLightConeItemId'?'cone':key==='ultimate'?{enabled:true}:undefined};
    window.lcApp={document:actor,element:root};
    await Promise.all([injectLightConeSheetPanel(lcApp,root),injectLightConeSheetPanel(lcApp,root)]);
  });
  assert.equal(await page.locator('#light-cone-identity [data-tsru-light-cone]').count(),1,'duplicate inventory identities and render hooks do not hide or duplicate the card');
  assert.equal(await page.locator('#light-cone-sheet [data-tab="inventory"] [data-tsru-light-cone]').count(),0);
  await page.locator('#light-cone-sheet').screenshot({path:path.join(root,'light-cone-frame-smoke.png')});
  await page.evaluate(async()=>{lcApp.document.items=[];lcApp.document.getFlag=()=>undefined;document.querySelector('#light-cone-identity').innerHTML='<div data-action="findItem" data-item-type="race">Añadir especie</div>';await injectLightConeSheetPanel(lcApp,lcApp.element)});
  assert.equal(await page.locator('#light-cone-identity .unequipped').count(),1,'an empty localized sheet retains its Light Cone frame');
  await page.evaluate(async()=>{lcApp.document={documentName:'Item'};await injectLightConeSheetPanel(lcApp,lcApp.element);document.querySelector('#light-cone-sheet').remove()});
  assert.deepEqual(errors,[]);
  console.log('Ability score browser checks passed: native styling, 12 sheet/sidebar resize cases, matching card dimensions, contained labels/score inputs, duplicate render hooks, score updates/clamping, owner permissions; equipped and empty Light Cone frames on native/localized sheets with duplicate inventory rows and modern TextEditor.');
 }catch(error){console.error('Browser errors:',errors);await page.screenshot({path:path.join(root,'ability-scores-failure.png')}).catch(()=>{});throw error;}
 finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exit(1)});
