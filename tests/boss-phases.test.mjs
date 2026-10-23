import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {world,collection,ID} from './helpers/summoning-world.mjs';

const clone=structuredClone;
function merge(target,patch){
  for(const [path,value]of Object.entries(patch)){
    const keys=path.split('.');let object=target;
    for(const key of keys.slice(0,-1))object=object[key]??={};
    const key=keys.at(-1);
    if(key.startsWith('-='))delete object[key.slice(2)];
    else if(value&&typeof value==='object'&&!Array.isArray(value))merge(object[key]??={},value);
    else object[key]=clone(value);
  }
}
function bossWorld({linked=false,twins=false}={}){
  const w=world();
  w.context.fromUuid=globalThis.fromUuid;
  vm.runInContext('globalThis.bossApi={bossEncounter,ensureBossEncounter,handleBossPhaseDefeat,switchBossPhase,BossPhaseControl,installDamageScrollingTextOverride,state};',w.context);
  const api=w.context.bossApi;
  function actor(id,{hp=100,phase=1,uuid=`Actor.${id}`,isToken=false}={}){
    const data={_id:id,type:'npc',name:`Boss ${phase}`,img:`phase${phase}.png`,prototypeToken:{texture:{src:`token${phase}.png`},width:phase,height:phase},
      system:{attributes:{hp:{value:hp,max:100*phase}},abilities:{}},
      flags:{[ID]:{ultimate:{isBoss:phase===1,bossPhaseCount:3,bossPhase2ActorUuid:'Actor.phase2',bossPhase3ActorUuid:'Actor.phase3',bossPhase2TokenWidth:4,bossHudWidth:1000,bossHudPortrait:`portrait${phase}.png`,elementId:`element${phase}`},toughness:{max:phase*100,current:phase*100,weaknesses:[`element${phase}`]}}},
      items:[{_id:`item${phase}`,name:`Move ${phase}`,system:{activities:{attack:{consumption:{targets:[{target:`item${phase}`}]}}}},effects:[{_id:'item-effect',origin:`Actor.${id}.Item.item${phase}`}]}],
      effects:[{_id:`effect${phase}`,origin:`Actor.${id}.Item.item${phase}`}]};
    const a={...clone(data),id,uuid,isToken,documentName:'Actor',updates:[],statuses:new Set(),
      getFlag(scope,key){return this.flags?.[scope]?.[key]},toObject(){return Object.fromEntries(Object.keys(data).map(key=>[key,clone(this[key])]));},
      async update(patch,options){this.updates.push({patch:clone(patch),options});merge(this,patch);await this.onUpdate?.();return this;},
      async toggleStatusEffect(status,{active}){active?this.statuses.add(status):this.statuses.delete(status)},
      async deleteEmbeddedDocuments(type,ids){const key=type==='Item'?'items':'effects';this[key]=this[key].filter(x=>!ids.includes(x._id));},
      async createEmbeddedDocuments(type,entries,options){if(this.failCreate){this.failCreate=false;throw Error('Embedded create failed');}assert.equal(options.keepId,true);this[type==='Item'?'items':'effects'].push(...clone(entries));}};
    for(const key of ['items','effects'])for(const item of a[key])item.id=item._id;
    // Foundry Collections return Document IDs independently of source _id.
    const ids=key=>{a[key]=a[key].map(item=>({...item,id:item._id}));};
    const create=a.createEmbeddedDocuments.bind(a);a.createEmbeddedDocuments=async(...args)=>{await create(...args);ids(args[0]==='Item'?'items':'effects');};
    return a;
  }
  const root=actor('boss'),phase2=actor('phase2',{phase:2}),phase3=actor('phase3',{phase:3});
  w.game.actors.push(root,phase2,phase3);
  const combat={id:'boss-fight',started:true,combatants:collection(),get scene(){return w.scene}};
  w.game.combats.push(combat);w.game.combat=combat;
  function participant(id){
    let own=actor('boss',{uuid:`Scene.map.Token.${id}.Actor.boss`,isToken:true});
    const token={id,uuid:`Scene.map.Token.${id}`,parent:w.scene,actorId:root.id,actorLink:linked,name:root.name,texture:{src:'original-token.png'},x:100,y:100,width:2,height:1,
      get actor(){return this.actorLink?root:own},async update(patch){merge(this,patch);return this;}};
    own.token=token;
    const c={id:`turn-${id}`,uuid:`Combat.boss-fight.Combatant.turn-${id}`,parent:combat,token,initiative:17,defeated:false,flags:{},get actor(){return token.actor},
      getFlag(scope,key){return this.flags[scope]?.[key]},async setFlag(scope,key,value){(this.flags[scope]??={})[key]=clone(value)},async update(patch){merge(this,patch);return this;}};
    combat.combatants.push(c);w.scene.tokens.push(token);return c;
  }
  const first=participant('boss-token'),second=twins?participant('twin-token'):null;
  return {...w,api,root,phase2,phase3,combat,first,second};
}

test('boss phases isolate linked tokens, advance 1 → 2 → 3, and defeat only the synthetic Actor',async()=>{
  const w=bossWorld({linked:true,twins:true}),{api,first,second,root}=w,before=clone(root.toObject());
  await Promise.all([api.ensureBossEncounter(first),api.ensureBossEncounter(first),api.ensureBossEncounter(second)]);
  assert.equal(first.token.actorLink,false);assert.notEqual(first.actor,root);
  assert.equal(first.getFlag(ID,'bossEncounter').originalActorData.name,'Boss 1');
  first.actor.system.attributes.hp.value=0;await api.handleBossPhaseDefeat(first.actor);
  assert.equal(first.getFlag(ID,'bossEncounter').currentPhase,2);assert.equal(first.actor.name,'Boss 2');
  assert.equal(first.token.width,4);assert.equal(first.token.height,2);assert.equal(first.initiative,17);assert.equal(first.defeated,false);
  assert.equal(first.actor.getFlag(ID,'ultimate').elementId,'element2');assert.equal(first.actor.getFlag(ID,'ultimate').bossHudWidth,1000);
  assert.equal(first.actor.items[0]._id,'item2');assert.equal(first.actor.effects[0].origin,`${first.actor.uuid}.Item.item2`);
  assert.equal(second.actor.name,'Boss 1');assert.equal(api.bossEncounter(second).currentPhase,1);
  first.actor.system.attributes.hp.value=0;await api.handleBossPhaseDefeat(first.actor);
  assert.equal(api.bossEncounter(first).currentPhase,3);assert.equal(first.token.texture.src,'token3.png');
  first.actor.system.attributes.hp.value=0;await api.handleBossPhaseDefeat(first.actor);
  assert.equal(api.bossEncounter(first).defeated,true);assert.equal(first.defeated,true);
  assert.equal(first.actor.name,'Boss 1');assert.equal(first.actor.system.attributes.hp.value,0);assert.ok(first.actor.statuses.has('dead'));
  assert.equal(first.token.width,2);assert.equal(first.token.height,1);assert.equal(first.token.texture.src,'original-token.png');
  assert.deepEqual(root.toObject(),before);assert.equal(root.updates.length,0);assert.equal(second.actor.system.attributes.hp.value,100);
});

test('bosses sharing a source Actor use the correct token identity and separate phase controls',async()=>{
  const w=bossWorld({twins:true});await w.api.ensureBossEncounter(w.first);await w.api.ensureBossEncounter(w.second);
  w.second.actor.system.attributes.hp.value=0;await w.api.handleBossPhaseDefeat(w.second.actor);
  assert.equal(w.api.bossEncounter(w.first).currentPhase,1);assert.equal(w.api.bossEncounter(w.second).currentPhase,2);
  assert.equal(new w.api.BossPhaseControl().bosses().length,2);
});

test('manual selection and lethal update hooks share a lock and cannot skip a phase',async()=>{
  const w=bossWorld();await w.api.ensureBossEncounter(w.first);
  w.first.actor.system.attributes.hp.value=0;
  let release,entered;const gate=new Promise(resolve=>release=resolve),started=new Promise(resolve=>entered=resolve);
  w.first.actor.onUpdate=async()=>{entered();await gate;};
  const automatic=w.api.handleBossPhaseDefeat(w.first.actor);await started;
  await Promise.all([w.api.handleBossPhaseDefeat(w.first.actor),w.api.switchBossPhase(w.first,3)]);release();await automatic;
  assert.equal(w.api.bossEncounter(w.first).currentPhase,2);assert.equal(w.first.actor.name,'Boss 2');assert.equal(w.api.state.bossTransitionLocks.size,0);
});

test('manual return to phase 1 restores its art, size, HP, items and boss bar immediately',async()=>{
  const w=bossWorld();await w.api.ensureBossEncounter(w.first);await w.api.switchBossPhase(w.first,3);await w.api.switchBossPhase(w.first,1);
  assert.equal(w.api.bossEncounter(w.first).currentPhase,1);assert.equal(w.first.actor.name,'Boss 1');assert.equal(w.first.token.width,2);
  assert.equal(w.first.actor.system.attributes.hp.value,100);assert.equal(w.first.actor.items[0]._id,'item1');assert.equal(w.first.defeated,false);
});

test('missing next phases leave the current phase recoverable and do not mark the boss defeated',async()=>{
  const w=bossWorld();await w.api.ensureBossEncounter(w.first);w.game.actors.splice(w.game.actors.indexOf(w.phase2),1);
  w.first.actor.system.attributes.hp.value=0;await w.api.handleBossPhaseDefeat(w.first.actor);
  assert.equal(w.api.bossEncounter(w.first).currentPhase,1);assert.equal(w.first.defeated,false);assert.ok(w.events.errors.some(x=>String(x).includes('missing or invalid')));
});

test('failed phase writes roll back Actor data and release the lock for a retry',async()=>{
  const w=bossWorld();await w.api.ensureBossEncounter(w.first);const before=clone(w.first.actor.toObject());w.first.actor.failCreate=true;
  await w.api.switchBossPhase(w.first,2);
  assert.deepEqual(w.first.actor.toObject(),before);assert.equal(w.api.bossEncounter(w.first).currentPhase,1);
  await w.api.switchBossPhase(w.first,2);assert.equal(w.api.bossEncounter(w.first).currentPhase,2);
});

test('deleted combats and removed tokens cannot receive a delayed phase change',async()=>{
  const w=bossWorld();await w.api.ensureBossEncounter(w.first);w.game.combats.splice(w.game.combats.indexOf(w.combat),1);
  await w.api.switchBossPhase(w.first,2);assert.equal(w.first.actor.name,'Boss 1');assert.equal(w.events.errors.length,0);
});
test('a combat deleted while its next phase resolves receives no Actor, token or combatant writes',async()=>{
  const w=bossWorld();await w.api.ensureBossEncounter(w.first);
  w.game.actors.splice(w.game.actors.indexOf(w.phase2),1);
  let resolve,started;const entered=new Promise(done=>started=done);
  w.context.fromUuid=()=>new Promise(done=>{resolve=done;started();});
  const work=w.api.switchBossPhase(w.first,2);await entered;
  const count=w.first.actor.updates.length;w.game.combats.splice(w.game.combats.indexOf(w.combat),1);resolve(w.phase2);await work;
  assert.equal(w.first.actor.updates.length,count);assert.equal(w.first.actor.name,'Boss 1');assert.equal(w.events.errors.length,0);
});
test('a new phase starting at zero HP heals to its prepared maximum and clears defeat statuses',async()=>{
  const w=bossWorld();await w.api.ensureBossEncounter(w.first);w.phase2.system.attributes.hp.value=0;
  w.first.actor.statuses.add('dead');w.first.actor.statuses.add('unconscious');
  await w.api.switchBossPhase(w.first,2);
  assert.equal(w.first.actor.system.attributes.hp.value,200);assert.equal(w.first.actor.statuses.size,0);assert.equal(w.first.defeated,false);
});
test('transferred effects created by new phase Items are retained',async()=>{
  const w=bossWorld();await w.api.ensureBossEncounter(w.first);
  const create=w.first.actor.createEmbeddedDocuments.bind(w.first.actor);
  w.first.actor.createEmbeddedDocuments=async(type,...args)=>{await create(type,...args);if(type==='Item')w.first.actor.effects.push({_id:'transfer',id:'transfer',origin:w.first.actor.uuid+'.Item.item2'});};
  await w.api.switchBossPhase(w.first,2);assert.ok(w.first.actor.effects.some(effect=>effect.id==='transfer'));
});
test('a secondary GM forwards phase selection to the elected authority; players cannot select phases',async()=>{
  const w=bossWorld();await w.api.ensureBossEncounter(w.first);
  w.game.user={id:'second-gm',isGM:true};await w.api.switchBossPhase(w.first,2);
  assert.equal(w.events.socket.at(-1).type,'switchBossPhase');assert.equal(w.api.bossEncounter(w.first).currentPhase,1);
  w.game.user=w.player;const sent=w.events.socket.length;await w.api.switchBossPhase(w.first,2);assert.equal(w.events.socket.length,sent);
});
test('rendering a stored boss encounter does not clone its Actor inventory again',async()=>{
  const w=bossWorld();await w.api.ensureBossEncounter(w.first);
  w.first.actor.toObject=()=>{throw Error('HUD must not resnapshot inventory');};
  for(let i=0;i<50;i++)assert.equal(w.api.bossEncounter(w.first).currentPhase,1);
});
test('initiative artwork follows the active phase source and returns to the root portrait on phase 1',async()=>{
  const w=bossWorld();w.root.flags[ID].ultimate.carouselImage='root-initiative.png';w.phase2.flags[ID].ultimate.carouselImage='phase2-initiative.png';
  await w.api.ensureBossEncounter(w.first);await w.api.switchBossPhase(w.first,2);
  assert.equal(w.context.api.getConfig(w.first.actor).carouselImage,'phase2-initiative.png');
  await w.api.switchBossPhase(w.first,1);assert.equal(w.context.api.getConfig(w.first.actor).carouselImage,'root-initiative.png');
});
test('boss transition text suppression leaves unrelated tokens damage text visible',async()=>{
  const w=bossWorld();await w.api.ensureBossEncounter(w.first);const forwarded=[];
  w.context.canvas.interface={createScrollingText:(...args)=>{forwarded.push(args);return Promise.resolve();}};
  w.api.state.customDamageScrollingText=true;w.api.installDamageScrollingTextOverride();
  w.first.actor.onUpdate=async()=>{
    await w.context.canvas.interface.createScrollingText({x:200,y:150},'-20');
    await w.context.canvas.interface.createScrollingText({x:900,y:900},'-10');
  };
  await w.api.switchBossPhase(w.first,2);assert.equal(forwarded.length,1);assert.equal(forwarded[0][1],'-10');
});
