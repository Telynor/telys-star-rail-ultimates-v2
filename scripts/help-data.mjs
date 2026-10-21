import {matchesSetting,searchWords} from './character-settings.mjs';
export const HELP_MODULE='telys-star-rail-ultimates';
let cached;
export const helpAsset=path=>`modules/${HELP_MODULE}/docs/${path}`;
export const escapeHelp=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const canonicalHelpKey=key=>String(key??'').replace(/\.\d+(?=\.|$)/g,'.*').replace(/^(pcWallpaper-).+$/,'$1*');
export function validateHelp(manual,controls){
 if(manual?.schema!==1||controls?.schema!==1||!Array.isArray(manual.articles)||!Array.isArray(controls.fields)||!Array.isArray(controls.rules))throw Error('The bundled help files have an unsupported format.');
 const articles=new Map(manual.articles.map(a=>[a.id,a])),reference=[...controls.fields,...controls.rules];
 if(!articles.has('overview')||articles.size!==manual.articles.length)throw Error('The help index is incomplete.');
 if(new Set(reference.map(e=>e.id)).size!==reference.length)throw Error('The help reference contains duplicate anchors.');
 for(const e of reference)if(!e.description||!articles.has(e.topic))throw Error(`Missing help topic for ${e.id}.`);
 for(const a of manual.articles)for(const id of a.related??[])if(!articles.has(id))throw Error(`Missing related topic: ${id}.`);
 return {...manual,...controls,articleMap:articles,reference,referenceMap:new Map(reference.map(e=>[e.id,e]))};
}
export async function loadHelp({refresh=false}={}){
 if(refresh)cached=null;
 if(!cached){const version=globalThis.game?.modules?.get(HELP_MODULE)?.version??'3.14.0-preview.19';cached=Promise.all(['manual.json','controls.json'].map(async name=>{const r=await fetch(`${helpAsset(name)}?v=${encodeURIComponent(version)}`);if(!r.ok)throw Error(`Help file ${name} could not be loaded (${r.status}).`);return r.json();})).then(([m,c])=>validateHelp(m,c)).catch(e=>{cached=null;throw e;});}
 return cached;
}
const stop=new Set(['a','an','the','and','of','to','for','is','are','do','does','how','what','where','can','i','my','me','it','in','on','with','please']);
const shorthand={altult:['alternate','ultimate'],ultorb:['ultimate','orb'],sp:['skill','points'],tp:['talent'],crit:['critical'],aoe:['area'],cant:['cannot'],docs:['documentation'],regen:['regeneration']};
const extra=[['documentation','help','manual','guide','instructions'],['hp','health','life','blood','sacrifice'],['summon','summons','summoning','creature','pet','minion','familiar','spawn'],['cost','price','payment','spend'],['radius','range','distance','zone'],['refund','restore','return','cancel'],['memosprite','sprite','companion'],['critical','crit','threshold'],['cannot','cant','fit','placement']];
export const helpTerms=query=>searchWords(query).filter(w=>!stop.has(w)).flatMap(w=>shorthand[w]??[w]);
const matchesTerm=(term,text)=>matchesSetting(term,text)||extra.some(group=>group.includes(term)&&group.some(w=>searchWords(text).includes(w)));
export function helpEntries(data){return [...data.articles.map(a=>({id:a.id,topic:a.id,kind:'guide',title:a.title,context:a.group,description:a.summary,text:[a.title,a.summary,...a.keywords,JSON.stringify(a.sections)].join(' ')})),...data.reference.map(e=>({id:e.id,topic:e.topic,kind:e.kind,title:e.label,context:data.scopes.find(s=>s.id===e.scope)?.label??e.scope,description:e.description,text:[e.label,e.key,e.description,data.articleMap.get(e.topic)?.title,e.scope,JSON.stringify(e.options??[])].join(' ')}))];}
export function searchHelp(data,query){const terms=helpTerms(query);if(!terms.length)return [];return helpEntries(data).filter(e=>terms.every(t=>matchesTerm(t,e.text))).map(e=>({...e,score:terms.reduce((n,t)=>n+(matchesTerm(t,e.title)?8:0)+(matchesTerm(t,e.description)?3:0),e.kind==='guide'?2:0)})).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title));}
export function referenceLimits(e){const p=[];if(e.min!==undefined&&e.max!==undefined)p.push(`Range: ${e.min} to ${e.max}`);else if(e.min!==undefined)p.push(`Minimum: ${e.min}`);else if(e.max!==undefined)p.push(`Maximum: ${e.max}`);if(e.step!==undefined&&String(e.step)!=='any')p.push(`Step: ${e.step}`);return p.join(' · ');}
