import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderSheetTemplate,sheetTextEditor} from '../scripts/sheet-compat.mjs';

test('v14 sheet rendering and text enrichment never evaluate deprecated global getters',async()=>{
  const names=['foundry','renderTemplate','TextEditor'],before=names.map(key=>Object.getOwnPropertyDescriptor(globalThis,key));
  const editor={enrichHTML:async value=>`enriched:${value}`},calls=[];
  try {
    globalThis.foundry={applications:{handlebars:{renderTemplate:async(...args)=>{calls.push(args);return 'rendered';}},ux:{TextEditor:{implementation:editor}}}};
    for(const key of ['renderTemplate','TextEditor'])Object.defineProperty(globalThis,key,{configurable:true,get(){throw Error('Deprecated global accessed: '+key);}});
    assert.equal(await renderSheetTemplate('sheet.hbs',{name:'Hero'}),'rendered');assert.deepEqual(calls,[['sheet.hbs',{name:'Hero'}]]);
    assert.equal(await sheetTextEditor().enrichHTML('description'),'enriched:description');
  }finally {names.forEach((key,index)=>{if(before[index])Object.defineProperty(globalThis,key,before[index]);else delete globalThis[key];});}
});
