const assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),fs=require('node:fs/promises'),vm=require('node:vm');
(async()=>{
  const {pathWorld,collection,ID}=await import('./helpers/path-world.mjs'),w=pathWorld({install:false});
  const macros=await import('../scripts/action-macros.mjs'),pathChanging=await import('../scripts/path-changing.mjs');
  const {pathCatalog}=await import('../scripts/path-change-rules.mjs'),{ultimateCharge}=await import('../scripts/alternate-ultimate-rules.mjs');
  const dom=new JSDOM('<!doctype html><body><aside id="actors"></aside><section id="hotbar"></section></body>');
  const {document}=dom.window;
  for(const [actor,prefix]of [[w.hero,'wind'],[w.source,'ice']])await actor.update({['flags.'+ID+'.ultimate']:{ultimateName:prefix+' Ultimate',skillButtonImage:prefix+'-skill.png',ultimateButtonImage:prefix+'-ultimate.png',talentIcon:prefix+'-talent.png',techniqueButtonImage:prefix+'-technique.png'}});
  w.owner.hotbar={1:'skill',4:'ultimate',7:'talent',10:'technique',50:'ultimate',3:'custom'};
  game.macros=collection(['skill','ultimate','talent','technique','custom'].map(action=>({id:action,name:'Old '+action,img:'old.png',command:'old',isOwner:false,
    getFlag:(_scope,key)=>key==='action'?(action==='custom'?undefined:action):key==='actorId'?'hero':undefined,
    async update(patch){Object.assign(this,patch);}})));
  ui.actors={render(){document.querySelector('#actors').innerHTML='<img src="'+w.hero.img+'">';}};
  for(const [slot,id]of Object.entries(w.owner.hotbar).filter(([slot])=>slot<=10)){
    document.querySelector('#hotbar').insertAdjacentHTML('beforeend','<div data-slot="'+slot+'" data-macro-id="'+id+'" data-tooltip="Old tooltip"><img src="old.png"><span class="macro-name">Old</span></div>');
  }
  const source=await fs.readFile(new URL('../scripts/module.js','file://'+__dirname+'/'),'utf8');
  const context=vm.createContext({document,game:{...game,user:w.owner},MODULE_ID:ID,...macros,pathChanging,console,
    isAuthority:()=>false,getConfig:actor=>actor.getFlag(ID,'ultimate'),getVisualConfig:actor=>actor.getFlag(ID,'ultimate'),enhancedFormActive:()=>false,
    getElements:()=>[{id:'wind',chargeColor:'#11aa22',readyColor:'#ffff00'},{id:'ice',chargeColor:'#00aaff',readyColor:'#ffffff'}],
    DEFAULT_CONFIG:{chargeColor:'#aaa',readyColor:'#fff'},alternateUltimateCharge:actor=>ultimateCharge(actor.getFlag(ID,'ultimate'),{components:['a','b','c','d'].map(id=>({id,image:id+'.png'}))},actor.getFlag(ID,'alternateOrbStates')),
    plainAbilityText:text=>text});
  vm.runInContext(source.slice(source.indexOf('function stanceMacroPresentation('),source.indexOf('function activateStarRailActionDrag('))+
    source.slice(source.indexOf('function ultimateMacroDisplay('),source.indexOf('function refreshPathPresentation('))+
    '\nthis.paint=refreshUltimateHotbarMacros;this.presentation=stanceMacroPresentation;',context);
  const slot=number=>document.querySelector('[data-slot="'+number+'"]'),before=structuredClone(w.owner.hotbar);
  pathChanging.installPathChanging({}, {refresh:()=>context.paint(),synchronizeMacros:actor=>macros.synchronizeActionMacros({actor,users:w.users,presentation:context.presentation,replaceCommand:true,isChanging:pathChanging.isChangingPath})});
  const request=(action,extra={})=>pathChanging.applyPathRequest(action,{actorId:'hero',revision:pathCatalog(w.hero).revision,...extra},w.owner);
  await pathChanging.applyPathRequest('import',{actorId:'hero',revision:0,sourceActorId:'source'},w.gm);
  const catalog=pathCatalog(w.hero),original=catalog.activeId,alternate=catalog.profiles.find(p=>!p.original).id;
  context.paint();assert.equal(slot(4).querySelector('.tsru-hotbar-energy-label').textContent,'70%');
  await request('switch',{profileId:alternate});
  assert.equal(document.querySelector('#actors img').getAttribute('src'),'alt-portrait.png');
  for(const [number,action]of [[1,'skill'],[4,'ultimate'],[7,'talent'],[10,'technique']]){
    assert.equal(slot(number).querySelector('img').getAttribute('src'),'ice-'+action+'.png');
    assert.equal(game.macros.get(action).img,'ice-'+action+'.png');
  }
  assert.equal(slot(4).querySelector('.tsru-hotbar-energy-label').textContent,'20%');
  assert.match(slot(4).dataset.tooltip,/16\/80/);assert.equal(slot(4).style.getPropertyValue('--tsru-hotbar-energy'),'20%');
  assert.equal(slot(4).style.getPropertyValue('--tsru-hotbar-energy-color'),'#00aaff');
  assert.equal(slot(3).querySelector('img').getAttribute('src'),'old.png');
  assert.deepEqual(w.owner.hotbar,before);
  await w.hero.update({['flags.'+ID+'.ultimate.current']:5});context.paint();
  assert.equal(slot(4).querySelector('.tsru-hotbar-energy-label').textContent,'6%');
  await request('switch',{profileId:original});
  assert.equal(slot(4).querySelector('.tsru-hotbar-energy-label').textContent,'70%');
  await request('switch',{profileId:alternate});
  assert.equal(slot(4).querySelector('.tsru-hotbar-energy-label').textContent,'6%');
  for(let i=0;i<4;i++)context.paint();
  assert.equal(slot(4).querySelectorAll('.tsru-hotbar-energy-fill').length,1);assert.equal(slot(4).querySelectorAll('.tsru-hotbar-energy-label').length,1);
  await w.hero.update({['flags.'+ID+'.ultimate.alternateUltimateEnabled']:true,['flags.'+ID+'.alternateOrbStates']:{a:true,b:true,c:true,d:true}});context.paint();
  assert.equal(slot(4).querySelector('.tsru-hotbar-energy-label').textContent,'4/4');assert.equal(slot(4).classList.contains('is-ready'),true);
  await request('switch',{profileId:original});
  assert.equal(slot(4).querySelector('.tsru-hotbar-energy-label').textContent,'70%');assert.equal(slot(4).classList.contains('is-ready'),false);
  dom.window.close();
  console.log('PASS: committed Path changes redraw sidebar portraits, all four owner hotbar icons and live Energy/counter overlays; exact slots, shared macro identities, unrelated icons and spent Energy survive repeated switches.');
})().catch(error=>{console.error(error);process.exitCode=1});
