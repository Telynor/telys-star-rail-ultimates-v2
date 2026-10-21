// Real template, setting binder, casting and placement picker in a small Foundry
// shell using the unmodified D&D5e native placement class and a Foundry document adapter.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'..');
const nativeRoot=path.resolve(process.env.DND5E_SOURCE_ROOT||path.join(root,'../dnd5e-reference'));
const bootstrap=`
const ID='telys-star-rail-ultimates';window.ID=ID;
const get=(o,p)=>p.split('.').reduce((v,k)=>v?.[k],o);
const set=(o,p,v)=>{const keys=p.split('.');let t=o;for(const k of keys.slice(0,-1))t=t[k]??={};t[keys.at(-1)]=structuredClone(v);};
const hooks=new Map();window.Hooks={on(name,fn){const list=hooks.get(name)??[];list.push(fn);hooks.set(name,list)},once(){},callAll(){}};
window.FormApplication=class{};window.notices=[];window.errors=[];window.cards=[];window.socketEvents=[];window.created=[];window.tokenSequence=0;
window.ui={notifications:{info:m=>notices.push(m),warn:m=>notices.push(m),error:m=>errors.push(m)}};
class Dialog {static wait(options){return new Promise(resolve=>{const element=document.createElement('div');element.className='summon-window';element.innerHTML='<h2>'+options.window.title+'</h2>'+options.content;for(const entry of options.buttons){const button=document.createElement('button');button.textContent=entry.label;button.dataset.dialogAction=entry.action;button.onclick=async event=>{const value=await entry.callback(event,button,{element});element.remove();resolve(value)};element.append(button)}document.body.append(element);});}}
window.foundry={utils:{deepClone:value=>structuredClone(value),randomID:()=>crypto.randomUUID().replaceAll('-',''),mergeObject:(a,b)=>Object.assign(a,b),getProperty:get,setProperty:set,expandObject:patch=>{const result={};for(const [p,v]of Object.entries(patch))set(result,p,v);return result}},applications:{api:{ApplicationV2:class{},HandlebarsApplicationMixin:C=>C,DialogV2:Dialog},ux:{TextEditor:{implementation:{enrichHTML:async text=>text}}}}};
window.TextEditor={enrichHTML:async text=>text};window.ChatMessage={getSpeaker:({actor})=>({actor:actor.id}),create:async data=>{cards.push(data);return data}};
window.PIXI={Graphics:class{},Rectangle:class{constructor(x,y,width,height){Object.assign(this,{x,y,width,height})}}};
const collection=items=>{items.get=id=>items.find(x=>x.id===id);return items};
window.a={id:'hero',uuid:'Actor.hero',name:'Summoner',img:'/art/hero.svg',type:'character',documentName:'Actor',isOwner:true,items:[],effects:[],getActiveTokens:()=>[{id:'caster',document:{id:'caster'}}],system:{attributes:{hp:{value:39,max:50,temp:12}}},
 flags:{[ID]:{ultimate:{enabled:true,skillEnabled:true,skillPointCost:1,current:100,max:100,skillText:'Summon a companion.',ultimateText:'Ultimate summon.',skillHpCostEnabled:false,skillHpCostType:'half'}}},getFlag(_,key){return this.flags[ID][key]},testUserPermission:()=>true,
 async update(patch){for(const [p,v]of Object.entries(patch)){if(p==='flags.'+ID+'.ultimate')Object.assign(this.flags[ID].ultimate,structuredClone(v));else set(this,p,v)}document.querySelector('#balance').textContent='SP '+settings.skillPoints+' · HP '+this.system.attributes.hp.value;return this;}};
const creature=(id,name,size)=>{
 const actor={id,uuid:'Actor.'+id,documentName:'Actor',name,img:'/art/'+id+'.svg',async getTokenDocument(overrides){const data={...this.prototypeToken.toObject(),...overrides,name:this.name,texture:{src:this.img},flags:{}};return{toObject:()=>structuredClone(data)}}};
 actor.prototypeToken={width:size,height:size,parent:actor,actor,toObject(){return{width:this.width,height:this.height,sight:{enabled:false},texture:{src:actor.img}}}};return actor;
};
window.wolf=creature('wolf','Frost Wolf',1);window.titan=creature('titan','Great Titan',8);window.actors=collection([a,wolf,titan]);
const gm={id:'gm',isGM:true,active:true},users=collection([gm]);window.settings={skillPoints:5,skillPointConfig:{maximum:12}};
window.scene={id:'map',width:800,height:800,grid:{size:80,distance:5,units:'ft'},walls:[{c:[560,0,560,800],light:1,move:0}],tokens:collection([]),
 async createEmbeddedDocuments(_,data){const result=data.map(entry=>({...entry,id:'summon-'+(++tokenSequence),parent:this,getFlag(_,key){return this.flags?.[ID]?.[key]}}));this.tokens.push(...result);created.push(...result);drawTokens();for(const token of result)for(const fn of hooks.get('createToken')??[])fn(token);return result;},
 async deleteEmbeddedDocuments(_,ids){for(const id of ids){const index=this.tokens.findIndex(t=>t.id===id);if(index>=0)this.tokens.splice(index,1)}drawTokens();}};
window.drawTokens=()=>{const layer=document.querySelector('#tokens');layer.replaceChildren();for(const token of scene.tokens){const node=document.createElement('div');node.className='map-token';node.style.cssText='left:'+token.x+'px;top:'+token.y+'px;width:'+token.width*80+'px;height:'+token.height*80+'px';node.textContent=token.actorId==='hero'?'Summoner':'Wolf';layer.append(node);const mesh={get alpha(){return Number(node.style.opacity||1)},set alpha(value){node.style.opacity=value}};token.object={mesh};}};
window.resetMap=()=>{scene.tokens.splice(0,scene.tokens.length,{id:'caster',actorId:'hero',x:320,y:320,width:1,height:1,getFlag(){}});drawTokens();};resetMap();
window.canvas={scene,app:{canvas:document.querySelector('#map')},stage:{addChild:graphics=>document.querySelector('#map').append(graphics.root),toLocal:p=>p},tokens:{controlled:[{id:'caster',actor:a,document:scene.tokens[0]}]}};
const viewedLevel={id:'ground',parent:scene};scene.levels=collection([viewedLevel]);scene.getSurfaces=()=>[];canvas.level=viewedLevel;
window.CONFIG={Canvas:{polygonBackends:{light:{testCollision(_from,_to,options){if(options.level!==viewedLevel)throw TypeError('Foundry v14 collision requires a Level document');return false;}}}}};
window.game={user:gm,users,actors,scenes:collection([scene]),combats:collection([]),combat:{started:false,combatant:{actor:a},getFlag(){},async setFlag(){}},modules:{get:()=>({api:{}})},socket:{emit:(_,data)=>socketEvents.push(data)},settings:{get:(_,key)=>settings[key],set:async(_,key,value)=>{settings[key]=value;document.querySelector('#balance').textContent='SP '+settings.skillPoints+' · HP '+a.system.attributes.hp.value;return value}}};window.fromUuid=async uuid=>actors.find(actor=>actor.uuid===uuid);
await(await import('/tests/fixtures/native-placement-browser.mjs')).install();
window.core=await import('/scripts/module.js');core.isolateSummoningPresentation();core.registerApi();
const {organizeCharacterSettings}=await import('/scripts/character-settings.mjs');const {bindAbilitySummonSettings}=await import('/scripts/ability-summon-settings.mjs');
window.invocation={id:'invocation',uuid:'Actor.hero.Item.invocation',name:'Invocation',img:wolf.img,system:{activities:[]}};
invocation.system.activities.push({id:'summon',type:'summon',item:invocation,profiles:[{_id:'wolf-profile',uuid:wolf.uuid,name:'Frost Wolf'}]});a.items.push(invocation);
Handlebars.registerHelper('checked',value=>value?'checked':'');document.querySelector('#sheet').innerHTML=Handlebars.compile(await(await fetch('/templates/ultimate-tab.hbs')).text())({actor:a,config:core.getConfig(a),isGM:true,elements:[],paths:[],frameColors:[]});
window.settingsRoot=document.querySelector('.tsru-sheet-tab');organizeCharacterSettings(settingsRoot,{key:a.id});bindAbilitySummonSettings(a,settingsRoot);
settingsRoot.addEventListener('change',event=>{if(event.target.name)window.lastSave=core.saveUltimateConfigFromTab(a,$(settingsRoot));});
document.querySelector('#cast-skill').onclick=()=>{window.cast=core.requestSkill(a)};document.querySelector('#cast-ultimate').onclick=()=>{window.cast=core.requestUltimate(a)};
window.ready=true;
`;
(async()=>{
 const server=http.createServer(async(req,res)=>{
  try{const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
   if(pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta charset="utf-8"><script src="/handlebars.js"></script><script src="/jquery.js"></script><link rel="stylesheet" href="/styles/ultimates.css"><link rel="stylesheet" href="/styles/character-settings.css"><style>body{margin:0;background:#111b27;color:#edf6ff;font:14px Arial}#sheet{position:absolute;left:18px;top:68px;width:490px;height:865px;overflow:auto;background:#192536;padding:12px;border:1px solid #51697a;border-radius:8px}#map{position:absolute;left:550px;top:90px;width:800px;height:800px;background-color:#23313d;background-image:linear-gradient(#8aa2b32b 1px,transparent 1px),linear-gradient(90deg,#8aa2b32b 1px,transparent 1px);background-size:80px 80px;overflow:hidden}#map:before{content:"";position:absolute;top:0;left:559px;width:3px;height:800px;background:#e1ac6a;z-index:1;pointer-events:none}#tokens{position:absolute;inset:0;pointer-events:none}.map-token{position:absolute;display:grid;place-items:center;background:#a6e8ff33;border:2px solid #83cde3;box-sizing:border-box;color:#e3f8ff;font-size:11px;border-radius:14px}#controls{display:flex;gap:12px;align-items:center;padding:16px;position:absolute;left:550px;top:20px}#controls button{width:auto;padding:8px 16px;background:#285969;border:1px solid #83ddeb;color:inherit;border-radius:4px}#label{padding:23px;font-size:18px;font-weight:bold}.summon-window{position:fixed;z-index:12000;left:50%;top:18%;transform:translateX(-50%);padding:20px;width:450px;background:#172838;color:#eefcff;border:1px solid #8fbbc9;border-radius:9px;box-shadow:0 20px 80px #000b}.summon-window button{padding:7px 15px;width:auto;margin-right:9px;color:inherit;background:#234858;border:1px solid #71bccd}input,select,textarea{color:inherit}input,select{background:#1c3041}h2{font-size:20px}#map-caption{position:absolute;left:550px;top:910px;color:#9fb6c7;font-size:12px}</style></head><body><div id="label">Character Settings · Summoning</div><div id="sheet"></div><div id="controls"><button id="cast-skill">Use Skill</button><button id="cast-ultimate">Use Ultimate</button><span id="balance">SP 5 · HP 39</span></div><div id="map"><div id="tokens"></div></div><div id="map-caption">5 ft per square · amber line: lighting barrier</div><script type="module">'+bootstrap+'</script></body></html>');return;}
   if(pathname==='/native-system/token-placement.mjs'){res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(path.join(nativeRoot,'module/canvas/token-placement.mjs')));return;}
   if(pathname==='/handlebars.js'||pathname==='/jquery.js'){res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(require.resolve(pathname==='/jquery.js'?'jquery':'handlebars/dist/handlebars.js')));return;}
   if(pathname.startsWith('/art/')||pathname.startsWith('/icons/')){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#477e96"/><path d="M10 46 18 12 32 28 46 12 54 46 32 55Z" fill="#c5eef5"/></svg>');return;}
   const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
   let content=await fs.readFile(file);
   if(pathname==='/scripts/module.js')content=content.toString()+'\nexport {requestSkill,requestUltimate,state,getConfig,registerApi,saveUltimateConfigFromTab};export function isolateSummoningPresentation(){refreshOrb=()=>{};dispatchTalentEvent=async()=>{};broadcastUltimateSplash=()=>{};refreshToughnessBars=()=>{};refreshResourceHuds=()=>{};refreshCombatPartyHud=()=>{};refreshPunchlineHUD=()=>{};refreshSkillUI=()=>{};refreshBossHud=()=>{};refreshInitiativeCarousel=()=>{};refreshTalentCounter=()=>{};dockSceneControlsBesideCarousel=()=>{};}';
   res.setHeader('Content-Type',pathname.endsWith('.css')?'text/css':/\.m?js$/.test(pathname)?'text/javascript':pathname.endsWith('.hbs')?'text/plain':'application/octet-stream');res.end(content);
  }catch(error){res.writeHead(404);res.end(error.message)}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1400,height:1000}}),pageErrors=[];page.on('pageerror',error=>{pageErrors.push(error.message);console.error(error.stack)});
 const group=action=>page.locator('[data-ability-summons="'+action+'"]');
 const dropActor=async(action,uuid,target=null)=>{await group(action).locator(target||'[data-summons-list]').evaluate((node,uuid)=>{const dataTransfer=new DataTransfer();dataTransfer.setData('text/plain',JSON.stringify({type:'Actor',uuid}));node.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer}));},uuid);};
 const point=async(x,y,click=false)=>{const box=await page.locator('#map').boundingBox();if(click)await page.mouse.click(box.x+x,box.y+y);else await page.mouse.move(box.x+x,box.y+y);};
 try{
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);
  await page.locator('[data-settings-menu="abilities"]').click();
  assert.equal(await group('skill').locator('[data-summons-fields]').isVisible(),false);
  await group('skill').locator('[data-summons-enabled]').check();await dropActor('skill','Actor.wolf');await dropActor('skill','Actor.titan');
  await page.waitForFunction(()=>a.getFlag(ID,'ultimate').skillSummons?.choices.length===2);
  assert.equal(await group('skill').locator('[data-summon-resource]').first().inputValue(),'dots');
  assert.equal(await group('skill').locator('[data-summon-initiative]').first().inputValue(),'own');
  await group('skill').locator('[data-summon-resource]').first().selectOption('percent');
  await group('skill').locator('[data-summon-value]').first().fill('65');await group('skill').locator('[data-summon-value]').first().dispatchEvent('change');
  await group('skill').locator('[data-summon-initiative]').first().selectOption('owner');
  await page.waitForFunction(()=>a.getFlag(ID,'ultimate').skillSummons.choices[0].resource===65&&a.getFlag(ID,'ultimate').skillSummons.choices[0].initiativeMode==='owner');
  assert.equal(await group('skill').locator('[data-summon-max]').first().inputValue(),'100');
  const spellSettings=page.locator('[data-spell-summon-settings]');assert.equal(await spellSettings.locator('[data-summon-resource]').inputValue(),'none');
  await spellSettings.locator('[data-summon-resource]').selectOption('hp');await spellSettings.locator('[data-summon-max]').fill('10');await spellSettings.locator('[data-summon-max]').dispatchEvent('change');
  await spellSettings.locator('[data-summon-value]').fill('4');await spellSettings.locator('[data-summon-value]').dispatchEvent('change');
  await spellSettings.locator('[data-summon-initiative]').selectOption('owner');
  await page.waitForFunction(()=>a.getFlag(ID,'summonPreferences')?.[0]?.resource===4&&a.getFlag(ID,'summonPreferences')[0].initiativeMode==='owner');
  await group('skill').locator('[data-summon-count]').first().fill('2');await group('skill').locator('[data-summon-count]').first().dispatchEvent('change');
  const rows=await group('skill').locator('[data-summon-row]').evaluateAll(nodes=>nodes.map(node=>node.dataset.summonRow));
  await group('skill').locator('[data-summons-list]').evaluate((node,rows)=>{const dataTransfer=new DataTransfer();dataTransfer.setData('text/plain',JSON.stringify({type:'Actor',uuid:'Actor.titan',tsruSummonAction:'skill',tsruSummonRow:rows[1]}));node.querySelector('[data-summon-row="'+rows[0]+'"]').dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer}));},rows);
  await page.waitForFunction(()=>a.getFlag(ID,'ultimate').skillSummons.choices[0].actorUuid==='Actor.titan');
  await group('skill').locator('[data-summon-down]').first().click();
  await page.locator('[data-skill-cost-preset]').selectOption('custom');assert.equal(await page.locator('[data-skill-custom-cost]').isVisible(),true);
  await page.locator('[name="skillPointCost"]').fill('7');await page.locator('[name="skillPointCost"]').dispatchEvent('change');await page.evaluate(()=>lastSave);
  assert.equal(await page.evaluate(()=>a.getFlag(ID,'ultimate').skillPointCost),7);
  await page.locator('[data-skill-cost-preset]').selectOption('3');await page.evaluate(()=>lastSave);assert.equal(await page.evaluate(()=>a.getFlag(ID,'ultimate').skillPointCost),3);assert.equal(await page.locator('[data-skill-custom-cost]').isVisible(),false);
  await page.locator('[name="skillHpCostEnabled"]').check();await page.locator('[name="skillHpCostType"]').selectOption('roll');
  await page.locator('[name="skillHpCostRoll"]').fill('1d6+3');assert.match(await page.locator('[data-hp-roll-error]').textContent(),/Use an HP cost roll/);
  await page.locator('[name="skillHpCostRoll"]').fill('2d6');assert.equal(await page.locator('[data-hp-roll-error]').textContent(),'');
  await page.locator('[name="skillHpCostType"]').selectOption('ten');await page.evaluate(()=>lastSave);
  assert.equal(await page.locator('[name="skillHpCostBasis"]').isVisible(),true);
  assert.equal(await page.evaluate(()=>a.getFlag(ID,'ultimate').skillSummons.choices.length),2,'whole-sheet saves preserve the immediate summon list');
  await page.locator('[data-settings-menu="ultimates"]').click();await group('ultimate').locator('[data-summons-enabled]').check();await dropActor('ultimate','Actor.wolf');
  await page.waitForFunction(()=>a.getFlag(ID,'ultimate').ultimateSummons?.choices.length===1);
  assert.equal(await group('ultimate').locator('[data-summon-resource]').inputValue(),'none');
  await page.locator('[data-settings-search]').fill('pet range');assert.equal(await page.locator('.tsru-settings-page:visible').count(),2);
  await page.screenshot({path:path.join(root,'summoning-settings-smoke.png')});
  await page.locator('[data-settings-search]').fill('');
  await page.locator('#cast-skill').click();await page.waitForSelector('.summon-window');
  assert.equal(await page.locator('.summon-window .cannot-fit').count(),1);assert.match(await page.locator('.summon-window .cannot-fit').textContent(),/Great Titan.*Cannot Fit/);
  await page.screenshot({path:path.join(root,'summoning-choice-smoke.png')});
  await page.locator('[data-dialog-action="place"]').click();await page.waitForSelector('[data-native-placement]');
  await point(600,350,true);await page.waitForFunction(()=>notices.some(n=>n.startsWith('Cannot Fit')));await page.waitForSelector('[data-native-placement]');
  await point(440,360);await page.screenshot({path:path.join(root,'summoning-placement-smoke.png')});
  await point(440,360,true);await page.waitForSelector('[data-native-placement]');await point(520,360,true);await page.evaluate(()=>cast);
  assert.equal(await page.evaluate(()=>created.length),2);assert.equal(await page.evaluate(()=>settings.skillPoints),2);assert.equal(await page.evaluate(()=>a.system.attributes.hp.value),36);assert.equal(await page.evaluate(()=>cards.length),1);
  await page.waitForFunction(()=>created.every(token=>token.object.mesh.alpha===1));
  await page.locator('#cast-skill').click();assert.equal(await page.locator('.summon-window').count(),0,'insufficient SP blocks before opening a picker');
  await page.evaluate(()=>settings.skillPoints=5);await page.locator('#cast-skill').click();await page.waitForSelector('[data-dialog-action="no"]');await page.locator('[data-dialog-action="no"]').click();await page.evaluate(()=>cast);
  assert.equal(await page.evaluate(()=>scene.tokens.length),3,'No preserves both old summons');
  await page.locator('#cast-skill').click();await page.locator('[data-dialog-action="yes"]').click();await page.locator('[data-dialog-action="place"]').click();await page.waitForSelector('[data-native-placement]');await page.keyboard.press('Escape');await page.evaluate(()=>cast);
  assert.equal(await page.evaluate(()=>scene.tokens.length),3,'cancelled placement preserves the old summon batch');
  assert.equal(await page.evaluate(()=>settings.skillPoints),5);assert.equal(await page.evaluate(()=>a.system.attributes.hp.value),36);assert.equal(await page.locator('[data-native-placement]').count(),0);
  await page.evaluate(()=>resetMap());await page.locator('#cast-ultimate').click();await page.locator('[data-dialog-action="place"]').click();await page.waitForSelector('[data-native-placement]');await point(440,360,true);await page.evaluate(()=>cast);
  assert.equal(await page.evaluate(()=>a.getFlag(ID,'ultimate').current),0);assert.equal(await page.evaluate(()=>scene.tokens.length),2);assert.equal(await page.evaluate(()=>cards.length),2);
  await page.evaluate(()=>{resetMap();for(let i=0;i<10;i++)for(let j=0;j<10;j++)if(i!==4||j!==4)scene.tokens.push({id:'blocked-'+i+'-'+j,x:j*80,y:i*80,width:1,height:1,getFlag(){}});});
  await page.locator('#cast-skill').click();await page.evaluate(()=>cast);assert.match(await page.evaluate(()=>notices.at(-1)),/Cannot Fit/);assert.equal(await page.evaluate(()=>settings.skillPoints),5);assert.equal(await page.evaluate(()=>core.state.abilityPlanning.size),0);
  await page.evaluate(()=>{resetMap();scene.walls.splice(0);Object.assign(a.flags[ID].ultimate,{skillPointCost:1,skillHpCostEnabled:false,skillSummons:{enabled:true,radius:5,choices:[{id:'titan',actorUuid:'Actor.titan',quantity:1}]}});});
  await page.locator('#cast-skill').click();await page.waitForSelector('.summon-window');assert.equal(await page.locator('.summon-window .cannot-fit').count(),0,'the giant is selectable on the open map');
  await page.locator('[data-dialog-action="place"]').click();await page.waitForSelector('[data-native-placement]');await point(720,640,true);await page.evaluate(()=>cast);
  assert.equal(await page.evaluate(()=>scene.tokens.at(-1).width),8);assert.equal(await page.evaluate(()=>scene.tokens.at(-1).x),400);assert.equal(await page.evaluate(()=>settings.skillPoints),4);
  assert.deepEqual(pageErrors,[]);assert.deepEqual(await page.evaluate(()=>errors),[]);
  console.log('Summoning browser checks passed: v14 Level collision contract, actual native D&D5e placement, mapped-room Skill/Ultimate placement, open-map giant placement, real sheet settings, multiple placements, Escape, animation and no-fit costs.');
 }catch(error){await page.screenshot({path:path.join(root,'summoning-failure.png')});console.error('State:',await page.evaluate(()=>({errors,notices,lastSave:!!window.lastSave,flags:a.flags,created:created.length})));throw error;}
 finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
