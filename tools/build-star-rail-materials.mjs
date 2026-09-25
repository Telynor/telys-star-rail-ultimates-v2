import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { ClassicLevel } from "classic-level";

const MODULE_ID="telys-star-rail-ultimates", PACK_ID="star-rail-materials";
const root=new URL("..",import.meta.url).pathname;
const packPath=`${root}/packs/${PACK_ID}`, sourcePath=`${root}/packs/_source/${PACK_ID}`;
const cardIcon=`modules/${MODULE_ID}/assets/star-rail-materials/404001.png`;
const legacy=[
 ["201","Fuel",4,"Replenishes 60 Trailblaze Power.","A canister filled with dreams and courage."],
 ["212","Adventure Log",3,"Provides 5,000 Character EXP.","A neatly organized collection of educational adventure notes."],
 ["213","Traveler's Guide",4,"Provides 20,000 Character EXP.","Required reading for world exploration."],
 ["222","Condensed Aether",3,"Provides 2,000 Light Cone EXP.","A can of Aether refined through special techniques."],
 ["223","Refined Aether",4,"Provides 6,000 Light Cone EXP.","A canister of Aether extracted and distilled using special procedures."],
 ["233","Lost Crystal",4,"Provides 5,000 Relic EXP.","A Fragmentum dust crystal densified after being reduced to its original form."],
 ["235","Relic Remains",5,"Used to craft Relics.","Material salvaged from Relics."],
 ["236","Self-Modeling Resin",5,"Used when synthesizing customized Relics.","A rare material used for customizing Relics."],
 ["238","Variable Dice",5,"Reassigns a fully enhanced 5-star Relic's subsidiary-stat upgrades.","Use to reassign and randomize subsidiary-stat upgrade values."],
 ["241","Tracks of Destiny",5,"Used to activate high-level Traces.","Advanced level-up material for Traces."],
 ["283","Light Cone Memory Shard",5,"Exchanged for a 5-star Light Cone.","A fragment containing condensed memories."],
 ["110101","Tears of Dreams",4,"Substitutes for missing Path Materials.","Sealed thoughts and feelings."],
 ["300013","Jewels of the Starry Seas",4,"Selects an eligible 4-star Nameless Honor Light Cone.","A precious treasure drifting in the endless sea of stars."]
];
const rarity={Normal:"common",NotNormal:"uncommon",Rare:"rare",VeryRare:"veryRare",1:"common",2:"common",3:"uncommon",4:"rare",5:"veryRare"};
const id=key=>createHash("sha256").update(`star-rail-materials:${key}`).digest("hex").slice(0,16);
const uuid=x=>`Compendium.${MODULE_ID}.${PACK_ID}.Item.${x}`;
const clean=(v="")=>String(v).replace(/<unbreak>(.*?)<\/unbreak>/gis,"$1").replace(/<color=[^>]+>(.*?)<\/color>/gis,"$1").replace(/<size=[^>]+>(.*?)<\/size>/gis,"$1").replace(/<i>(.*?)<\/i>/gis,"$1").replace(/<[^>]+>/g,"").replaceAll("\\n","\n").replace(/\n{3,}/g,"\n\n").trim();
const esc=v=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
const paras=v=>clean(v).split(/\n{2,}/).filter(Boolean).map(x=>`<p>${esc(x).replaceAll("\n","<br>")}</p>`).join("");
const pct=e=>Math.max(0,...[...e.matchAll(/(\d+)%/g)].map(x=>Number(x[1])));
const duration=(n=1)=>n>1?`The benefit applies during the next ${n} combats and ends after 1 minute in each combat.`:"The benefit begins when the next combat starts and lasts for 1 minute.";

function dnd(name,raw){
 const e=clean(raw),l=e.toLowerCase(),p=pct(e),b=Number(e.match(/next (\d+) battles/i)?.[1]||1),critRate=Number(e.match(/CRIT Rate by (\d+)%/i)?.[1]||0);
 const team="As an action, consume this item and choose the creatures in your Main Party who can see you. ",one="As an action, a creature can consume or administer this item. ",stack=" A creature can benefit from only one synthesized pre-combat consumable at a time; a new one replaces the previous one.";
 if(/^Trash$/i.test(name))return `${one}The target loses hit points equal to its proficiency bonus. This cannot reduce it below 1 hit point.`;
 if(/Short Rejuvepill/i.test(name))return `${one}The target regains 1 hit point.`;
 if(/Grande Rejuvepill/i.test(name))return `${one}The target regains 1d4 + 1 hit points.`;
 if(/Hypnotic Hammer/i.test(name))return `${team}${duration()} Once per round each affected creature reduces damage taken by its proficiency bonus. When combat begins, roll a d10 for each creature; on a 1, it is incapacitated until the end of its first turn.${stack}`;
 if(/Vomit Inducing Agent/i.test(name))return `${one}The target loses all but 1 hit point.`;
 if(/Interstellar Braised Beast/i.test(name))return `${one}Roll a d20. On 3–20, the target regains 6d4 + 6 hit points. On 1–2, it loses all but 1 hit point.`;
 if(/Prayer Machine/i.test(name))return `${team}${duration()} At the start of every creature's turn, including enemies, it regains hit points equal to its proficiency bonus. This ends after 5 rounds.${stack}`;
 if(/Automatic Wooden Dummy/i.test(name))return `${team}${duration()} On its turn, an affected creature must Attack or cast a damaging cantrip if able; its first damage roll that turn gains its proficiency bonus.${stack}`;
 if(/Scare Box/i.test(name))return `${team}In the next combat, the GM secretly chooses one creature. At the start of its turn the box explodes: creatures within 10 feet make a DC 14 Dexterity save, taking 4d6 force damage on a failure or half on a success.${stack}`;
 if(/Veil Bundle/i.test(name))return `${team}At the next combat's start roll 1d3: affected creatures gain (1) +10 feet Speed, (2) +2 Break Effect, or (3) +1 to ability attack rolls and saving throw DCs. ${duration()}${stack}`;
 if(/Grudge Notebook/i.test(name))return `${team}${duration()} The first time an affected creature falls below half its hit-point maximum, it regains twice its proficiency bonus plus its level in hit points.${stack}`;
 if(/Dreamlight.*Mixed Sweets/i.test(name))return `${team}${duration()} At the start of each affected creature's turn roll 1d4: lose PB hit points, regain PB hit points, lose 5 Energy, or regain 5 Energy.${stack}`;
 if(/Take Your Life/i.test(name))return `${team}Each affected creature regains 30% maximum Energy. ${duration()} Its Strength increases by 1 and once per turn it adds PB to one damage roll. On a 1 on 1d10 at combat start, it is incapacitated until the end of its first turn.${stack}`;
 if(/Five-Grain Jade Elixir/i.test(name))return `${team}Each affected creature loses PB hit points. ${duration()} Once during the effect, its Technique rolls one additional damage die.${stack}`;
 if(/Steel Coil/i.test(name))return `${team}Each affected creature loses twice its level in hit points. ${duration()} Whenever it generates Punchline or another Elation resource, it generates 1 additional point.${stack}`;
 if(/Snow Plains Combo Stew/i.test(name))return `${team}${duration()} Affected creatures have resistance to fire damage and gain temporary hit points equal to their level plus their proficiency bonus.${stack}`;
 if(/Pom-Pom's Fried Fowl/i.test(name))return `${team}${duration()} Strength increases by 1, maximum 20, and once per turn when the creature deals fire damage it deals an additional 1d4 fire damage.${stack}`;
 if(/Abundance of Luck/i.test(name))return `${team}Each affected creature regains 30% maximum Energy. ${duration()} Once per turn it adds its proficiency bonus to one damage roll.${stack}`;
 if(/Boneflute of Fish-Calling/i.test(name))return `${team}${duration()} Strength increases by 1, maximum 20, and once per turn ongoing damage caused by the creature increases by its proficiency bonus.${stack}`;
 if(/The Moment Before Death/i.test(name))return `${team}${duration()} Once per round each affected creature reduces damage taken by its proficiency bonus and has advantage on saves against spells and magical effects.${stack}`;
 if(/Longevity Pill of Cruelty/i.test(name))return `${team}Each affected creature gains temporary hit points equal to twice its proficiency bonus plus its level and gains +1 to all saving throws. ${duration(3)}${stack}`;
 if(/Disposable Shield/i.test(name))return `${team}${duration()} Affected creatures gain +1 AC and advantage on saving throws against conditions.${stack}`;
 if(/Clockie Pizza/i.test(name))return `${team}${duration()} Once per turn each affected creature adds its proficiency bonus to one damage roll, but its Speed is reduced by 5 feet.${stack}`;
 if(/Flaming Potent Tea/i.test(name))return `${team}Each affected creature first loses hit points equal to its proficiency bonus. ${duration()} It has advantage on saving throws against being paralyzed or restrained and against cold effects.${stack}`;
 if(/Topological Acceleration Band/i.test(name))return `${team}During the first 2 rounds of each of the next 3 combats, affected creatures gain +10 feet Speed.${stack}`;
 if(/Camo Paint/i.test(name))return `${one}For 10 minutes, the target has advantage on Dexterity (Stealth) checks made to avoid being seen and cannot be tracked by ordinary sight while motionless.`;
 if(/downed character/i.test(l))return `${one}A creature at 0 hit points regains ${p>=10?"2d4 + 2":"1"} hit points. This cannot restore a dead creature.`;
 if(/heals? (a single|one designated|one ally|a target|one selected)|restores hp to one/i.test(l))return `${one}The target regains ${p>=38?"6d4 + 6":p>=24?"4d4 + 4":"2d4 + 2"} hit points.`;
 if(/entering the next battle.*heal|immediately heal.*respective max hp/i.test(l))return `${team}When the next combat begins, each affected creature regains 4d4 + 4 hit points.`;
 if(/recovers? \d+ technique points/i.test(l)){const n=e.match(/recovers? (\d+) Technique Points?/i)?.[1]||2,c=/loses hp/i.test(l)?" Each Main Party creature then loses PB hit points.":"";return `${one}The party regains ${n} shared Technique Points.${c}`;}
 if(/regenerates?.*energy|restores?.*energy|recovers?.*energy/i.test(l)){const n=p>=50?50:p>=30?30:20;return /all allies/i.test(l)?`${team}Each affected creature regains ${n}% maximum Energy.`:`${one}The target regains ${n}% maximum Energy.`;}
 if(/immune to debuffs/i.test(l))return `${team}${duration()} Affected creatures have advantage on saves against harmful effects and may reroll one failed save during the effect.${stack}`;
 if(/chance to resist freeze|resist frozen/i.test(l))return `${team}${duration()} Affected creatures have advantage on saves against paralysis, restraint, and cold effects.${stack}`;
 if(/effect res/i.test(l)&&!/def|shield|max hp|damage/i.test(l))return `${team}${duration(b)} Affected creatures have advantage on saves against spells and magical effects.${stack}`;
 if(/less dmg|decreases fire dmg taken/i.test(l))return `${team}${duration()} Once per round each affected creature reduces damage taken by PB${/fire dmg/i.test(l)?" and has resistance to fire damage":""}.${stack}`;
 if(/shield effect|absorbed by shields/i.test(l))return `${team}${duration()} Temporary hit points gained increase by PB, and the creature has +1 AC while it has temporary hit points.${stack}`;
 if(/def/i.test(l)){const c=/lose hp/i.test(l)?"Each creature first loses PB hit points. ":"";return `${team}${c}${duration()} Affected creatures gain +1 AC and +1 to Constitution saves.${stack}`;}
 if(/increases? (?:the |their |all allies'? )?max hp|max hp of all allies increases/i.test(l)){const n=p>=20?"twice its PB plus its level":"its PB plus its level",c=/lose hp/i.test(l)?"Each creature first loses PB hit points. ":"";return `${team}${c}Each affected creature gains temporary hit points equal to ${n}. ${duration(b)}${stack}`;}
 if(/hp restored/i.test(l))return `${team}${duration()} When an affected creature restores hit points, one target regains additional hit points equal to PB.${stack}`;
 if(/physical dmg|wind dmg|fire dmg|ice dmg|lightning dmg|quantum dmg|imaginary dmg/i.test(l)){const t=l.match(/(physical|wind|fire|ice|lightning|quantum|imaginary) dmg/)?.[1],m={physical:"weapon",wind:"thunder",fire:"fire",ice:"cold",lightning:"lightning",quantum:"force",imaginary:"radiant"}[t];return `${team}${duration()} Once per turn when an affected creature deals ${m} damage, it deals an additional 1d4 ${m==="weapon"?"damage of the weapon's type":m+" damage"}.${stack}`;}
 if(/dot dealt/i.test(l))return `${team}${duration()} Once per turn, ongoing damage caused by an affected creature increases by PB.${stack}`;
 if(/elation/i.test(l))return `${team}${duration()} Whenever an affected creature generates Punchline or another Elation resource, it generates 1 additional point.${stack}`;
 if(/speed|spd/i.test(l)){const s=p>=20?10:5,a=/atk/i.test(l)?" Its Strength also increases by 1, maximum 20.":"",h=/effect hit rate/i.test(l)?" It also gains +1 to ability attack rolls and saving throw DCs.":"";return `${team}${duration(b)} Speed increases by ${s} feet.${a}${h}${stack}`;}
 if(/crit rate|crit dmg|atk|dmg dealt|all allies' dmg/i.test(l)){const x=[];if(/atk/i.test(l))x.push("Strength increases by 1, maximum 20");if(/crit rate/i.test(l))x.push(`Crit Ratio increases by ${critRate>=24?2:1}`);if(/crit dmg/i.test(l))x.push("critical hits roll one additional weapon or spell damage die");if(/dmg dealt|all allies' dmg/i.test(l))x.push("once per turn add PB to one damage roll");const c=/lose hp/i.test(l)?"Each creature first loses PB hit points. ":"";return `${team}${c}${duration(b)} For each affected creature, ${x.join(", and ")}.${stack}`;}
 return `${one}${duration()} The user gains +1 to ability checks and saves related to the item's original purpose.${stack}`;
}

const base=(description,r="common")=>({description:{value:description,chat:""},source:{custom:"Honkai: Star Rail"},quantity:1,weight:{value:0,units:"lb"},price:{value:0,denomination:"gp"},rarity:r,identified:true,unidentified:{description:""},properties:[],type:{value:"material",subtype:""}});
function item({key,hsrItemId,name,img,r,description,flags={}}){return{_id:id(key),name:clean(name),type:"loot",img,system:base(description,rarity[r]||"common"),effects:[],folder:null,sort:0,ownership:{default:0},flags:{[MODULE_ID]:{hsrItemId:String(hsrItemId),...flags}}};}
function gameItem(x,kind){const original=clean(x.effect),hasUsableEffect=kind==="output"||(original&&!/^Tier \d+ Synthesis Material$/i.test(original)),balanced=(hasUsableEffect?dnd(x.name,original):"This is a crafting reagent used by Star Rail synthesis recipes.").replace(/\bPB\b/g,"proficiency bonus"),description=`${paras(x.flavor)}<hr><h3>${hasUsableEffect?"D&D 5e Effect":"Crafting Material"}</h3><p>${esc(balanced)}</p><section class="secret"><h3>GM Description — Original HSR Effect</h3><p>${esc(original)}</p></section>`;return item({key:`item:${x.itemId}`,hsrItemId:x.itemId,name:x.name,img:`modules/${MODULE_ID}/assets/star-rail-materials/${basename(x.icon||x.itemId+".png")}`,r:x.rarity,description,flags:{contentKind:kind,hasUsableEffect,originalHsrEffect:original,gmDescription:original,dndEffect:balanced}});}
const snap=(x,q)=>({uuid:uuid(x._id),name:x.name,img:x.img,type:x.type,quantity:q});

const catalog=JSON.parse(await readFile(`${root}/data/hsr-recipe-catalog.json`,"utf8")),docs=new Map();
for(const [n,name,r,e,f] of legacy)docs.set(`item:${n}`,item({key:`item:${n}`,hsrItemId:n,name,img:`modules/${MODULE_ID}/assets/star-rail-materials/${n}.png`,r,description:`<p>${esc(f)}</p><p><strong>Use:</strong> ${esc(e)}</p>`,flags:{sourceTrack:"Nameless Gift / Nameless Honor"}}));
const ingredients=new Map();for(const recipe of catalog)for(const material of recipe.materials)ingredients.set(String(material.itemId),material);
for(const x of ingredients.values())docs.set(`item:${x.itemId}`,gameItem(x,"material"));
for(const x of catalog)docs.set(`item:${x.itemId}`,gameItem(x,"output"));
const recipes=[];
for(const r of catalog){const rid=`hsr-${r.recipeId}`,out=docs.get(`item:${r.itemId}`),card=item({key:`recipe:${r.recipeId}`,hsrItemId:`recipe-${r.recipeId}`,name:`Recipe: ${out.name}`,img:cardIcon,r:r.rarity,description:`<p>Redeem this green recipe slip in Party Crafting to unlock <strong>${esc(out.name)}</strong> for the party and their owners' characters.</p>`,flags:{contentKind:"recipeCard",recipeCard:{recipeId:rid},outputHsrItemId:String(r.itemId)}});docs.set(`recipe:${r.recipeId}`,card);recipes.push({id:rid,name:out.name,img:cardIcon,description:`Synthesize ${out.name}.`,classificationId:"consumables",hsrRecipeId:String(r.recipeId),ingredients:r.materials.map(x=>snap(docs.get(`item:${x.itemId}`),x.quantity)),output:snap(out,r.quantity||1)});}
await rm(packPath,{recursive:true,force:true});await rm(sourcePath,{recursive:true,force:true});await mkdir(packPath,{recursive:true});await mkdir(sourcePath,{recursive:true});
const all=[...docs.values()].sort((a,b)=>a.name.localeCompare(b.name)),db=new ClassicLevel(packPath,{keyEncoding:"utf8",valueEncoding:"json"});await db.open();for(const x of all){const key=`!items!${x._id}`;await db.put(key,x);await writeFile(`${sourcePath}/${x._id}.json`,JSON.stringify({_key:key,...x},null,2)+"\n");}const keys=all.map(x=>`!items!${x._id}`).sort();await db.compactRange(keys[0],keys.at(-1),{keyEncoding:"utf8"});await db.close();await writeFile(`${root}/data/star-rail-recipes.json`,JSON.stringify(recipes,null,2)+"\n");
console.log(`Built ${all.length} compendium Items and ${recipes.length} linked recipes.`);
