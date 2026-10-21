import * as skillSpells from '../../scripts/ability-spells.mjs';
import * as npcInitiative from "../../scripts/npc-initiative.mjs";
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {energyAfterUpdate} from '../../scripts/alternate-ultimate-rules.mjs';
import * as alternate from '../../scripts/alternate-ultimates.mjs';
import * as summoning from '../../scripts/ability-summons.mjs';
export const ID='telys-star-rail-ultimates';
const source=await readFile(new URL('../../scripts/module.js',import.meta.url),'utf8');
const get=(o,p)=>p.split('.').reduce((v,k)=>v?.[k],o);
const set=(o,p,v)=>{const keys=p.split('.');let target=o;for(const k of keys.slice(0,-1))target=target[k]??={};target[keys.at(-1)]=structuredClone(v);};
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function collection(items=[]){items.get=id=>items.find(x=>x.id===id);return items;}
export function world({mode='energy',quantity=1,config={},size=1}={}){
  const hooks=new Map(),timers=new Map(),events={messages:[],socket:[],errors:[],warnings:[],talent:[],lightCone:[],splashes:[],rolls:0,creates:0};let seq=0;
  const gm={id:'gm',isGM:true,active:true,viewedScene:'map'},player={id:'player',isGM:false,active:true,viewedScene:'map'},stranger={id:'stranger',isGM:false,active:true,viewedScene:'map'};
  const a={id:'hero',uuid:'Actor.hero',name:'Hero',documentName:'Actor',items:collection(),type:'character',isOwner:true,executions:[],system:{attributes:{hp:{value:39,max:50,temp:12}}},
    flags:{ultimate:{enabled:true,skillEnabled:true,current:100,max:100,skillText:'Skill description',ultimateText:'Ultimate description',ultimateScript:'actor.executions.push(combatantId);',skillPointCost:2,energyLockCombatId:"",energyLockRound:null,alternateUltimateEnabled:mode!=='energy',skillSummons:{enabled:true,radius:15,choices:[{id:'wolf',actorUuid:'Actor.wolf',quantity}]},ultimateSummons:{enabled:true,radius:15,choices:[{id:'wolf',actorUuid:'Actor.wolf',quantity}]},...config},
      alternateOrb:{mode:mode==='circular'?'circular':'free',components:['a','b','c','d'].map(id=>({id,image:id+'.png'}))},alternateOrbStates:{a:true,b:true,c:true,d:true},alternateOrbCounter:4},
    getFlag(_,key){return this.flags[key]},async setFlag(_,key,value){this.flags[key]=structuredClone(value)},
    async update(patch,options={}){for(const hook of hooks.get('preUpdateActor')??[])hook(this,patch,options);if(this.failHp&&Object.hasOwn(patch,'system.attributes.hp.value'))throw new Error('HP update failed');for(const [p,v]of Object.entries(patch)){if(p.startsWith(`flags.${ID}.`))set(this.flags,p.slice(`flags.${ID}.`.length),v);else set(this,p,v)}return this;},
    testUserPermission:user=>user?.id==='player',getActiveTokens:()=>[{id:'caster',document:{id:'caster'}}]};
  const wolf={id:'wolf',uuid:'Actor.wolf',documentName:'Actor',name:'Wolf',img:'wolf.png',prototypeToken:{width:size,height:size},async getTokenDocument(overrides){const data={...this.prototypeToken,...overrides,name:this.name,texture:{src:this.img},flags:{}};return {toObject:()=>structuredClone(data)}}};
  const actors=collection([a,wolf]),users=collection([gm,player,stranger]),combats=collection(),settings=new Map([['skillPoints',5],['skillPointConfig',{maximum:12}]]);
  const caster={id:'caster',actorId:'hero',x:400,y:400,width:1,height:1,elevation:0,getFlag(){}};
  const scene={id:'map',width:1000,height:1000,grid:{size:100,distance:5,units:'ft'},tokens:collection([caster]),walls:[],
    async createEmbeddedDocuments(type,data){events.creates++;const created=[];for(const entry of data){if(this.failCreate&&created.length===Math.min(1,data.length-1))throw new Error('Token creation failed');const token={...structuredClone(entry),id:`summon-${++seq}`,parent:this,getFlag(_,key){return this.flags?.[ID]?.[key]}};this.tokens.push(token);created.push(token)}return created;},
    async deleteEmbeddedDocuments(_,ids){for(const id of ids){const index=this.tokens.findIndex(t=>t.id===id);if(index>=0)this.tokens.splice(index,1)}}};
  const game={user:gm,actors,users,combats,scenes:collection([scene]),combat:null,settings:{get:(_,key)=>settings.get(key),set:async(_,key,value)=>settings.set(key,value)},socket:{emit:(_,data)=>events.socket.push(data)},modules:{get:()=>({api:{}})}};
  const ui={notifications:{warn:message=>events.warnings.push(message),error:message=>events.errors.push(message),info:message=>events.warnings.push(message)}};
  const foundry={utils:{deepClone:structuredClone,randomID:()=>`request-${++seq}`,mergeObject:(a,b)=>({...a,...b}),getProperty:get,setProperty:set,expandObject:patch=>{const result={};for(const [p,v]of Object.entries(patch))set(result,p,v);return result;}},applications:{api:{ApplicationV2:class{},HandlebarsApplicationMixin:C=>C},ux:{TextEditor:{implementation:{enrichHTML:async text=>text}}}}};
  const canvas={scene,tokens:{controlled:[{id:caster.id,actor:a,document:caster}]}};
  const hookApi={on(name,fn){const list=hooks.get(name)??[];list.push(fn);hooks.set(name,list)},once(){},callAll(name,...args){for(const fn of hooks.get(name)??[])fn(...args)},call(name,...args){let ok=true;for(const fn of hooks.get(name)??[])if(fn(...args)===false)ok=false;return ok;}};
  const dice={total:7};class Roll{constructor(formula){this.formula=formula}async evaluate(){events.rolls++;this.total=dice.total;return this;}}
  Object.assign(globalThis,{game,ui,foundry,canvas,Hooks:hookApi,fromUuid:async uuid=>actors.find(actor=>actor.uuid===uuid),Roll});
  const context=vm.createContext({skillSpells,game,ui,foundry,canvas,Roll,summoning,npcInitiative,structuredClone,energyAfterUpdate,...alternate,Hooks:hookApi,FormApplication:class{},
    lightConeSkillCapacity:()=>0,handleLightConeEvent:async(type,detail)=>events.lightCone.push({type,detail}),
    console:{...console,error:(...args)=>events.errors.push(args.map(String).join(' '))},TextEditor:{enrichHTML:async text=>text},
    ChatMessage:{getSpeaker:({actor})=>({actor:actor.id}),create:async data=>{events.messages.push(data);return data}},
    document:{createElement:()=>({textContent:'',get innerHTML(){return html(this.textContent)}}),querySelectorAll:()=>[]},
    window:{setTimeout:(fn,delay)=>{const id=++seq;timers.set(id,{fn,delay});return id},clearTimeout:id=>timers.delete(id)},setTimeout,clearTimeout});
  vm.runInContext(source.replace(/^import .*;\n/gm,'')+'\nglobalThis.api={requestUltimate,executeUltimate,requestSkill,executeSkill,onSocket,processUltimateQueue,completeUltimate,refundSummoningUltimate,reconcileUltimateLock,finishSpellSkill,runSkillSpell,state,getConfig};',context);
  context.events=events;
  vm.runInContext('refreshOrb=()=>{};broadcastUltimateSplash=actor=>events.splashes.push(actor.id);dispatchTalentEvent=async(type)=>events.talent.push(type);refreshToughnessBars=()=>{};refreshResourceHuds=()=>{};refreshCombatPartyHud=()=>{};refreshPunchlineHUD=()=>{};refreshSkillUI=()=>{};refreshBossHud=()=>{};refreshInitiativeCarousel=()=>{};refreshTalentCounter=()=>{};',context);
  alternate.configureAlternateUltimates({isResolving:actor=>context.api.state.ultimateLocks.has(actor.id)});
  const plan={sceneId:scene.id,casterTokenId:caster.id,choiceId:'wolf',positions:Array.from({length:quantity},(_,i)=>({x:500+i*size*100,y:400}))};
  return {a,wolf,game,gm,player,stranger,scene,caster,events,settings,hooks,context,api:context.api,plan,dice,
    async fire(name,...args){for(const fn of hooks.get(name)??[])await fn(...args)},
    block(){scene.walls.push({c:[0,0,1000,0],light:1});for(let i=0;i<10;i++)for(let j=0;j<10;j++)if(i!==4||j!==4)scene.tokens.push({id:`block-${i}-${j}`,x:j*100,y:i*100,width:1,height:1,getFlag(){}});}};
}
export function startCombat(w,{ownTurn=false,ally=false}={}){
 const {a,game}=w,hero={id:'hero-turn',actorId:a.id,actor:a,initiative:10,flags:{},getFlag(_,key){return this.flags[key]}},enemy={id:'enemy-turn',actorId:ally?'ally':'enemy',actor:{type:ally?'character':'npc',getFlag:(_,key)=>key==='ultimate'?{mainParty:ally}:undefined},initiative:20,flags:{},getFlag(_,key){return this.flags[key]}};
 const combatants=collection([enemy,hero]);
 const combat={id:'fight',started:true,round:1,turn:ownTurn?1:0,combatants,
  get turns(){return [...combatants].sort((a,b)=>b.initiative-a.initiative)},get combatant(){return this.turns[this.turn]},setupTurns(){return this.turns},
  async update(patch){if(this.failTurn){this.failTurn=false;throw new Error('Turn update failed')}Object.assign(this,patch)},
  async createEmbeddedDocuments(_,documents){return documents.map((data,i)=>{const c={...data,id:'ultimate-turn-'+i,actor:a,parent:this,getFlag(_,key){return this.flags?.[ID]?.[key]}};combatants.push(c);return c})},
  async deleteEmbeddedDocuments(_,ids){for(const id of ids){const i=combatants.findIndex(c=>c.id===id);if(i>=0)combatants.splice(i,1)}}};
 game.combat=combat;game.combats.push(combat);return combat;
}
