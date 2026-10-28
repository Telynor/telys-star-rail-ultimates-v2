const {JSDOM}=require('jsdom'),assert=require('node:assert/strict');
(async()=>{
  const {lightConeSheetHost}=await import('../scripts/sheet-compat.mjs');
  const dom=new JSDOM('<!doctype html><main id="sheet"></main>'),root=dom.window.document.querySelector('#sheet');
  const details='<section class="tab" data-tab="details"><div class="left"></div><div class="right"><div class="top flexrow"><filigree-box class="saves"></filigree-box><div class="pills-lg" id="identity">IDENTITY</div></div></div></section>';
  // Native D&D5e 5.3/6.x identity rows also appear in inventory/feature lists.
  root.innerHTML=details.replace('IDENTITY','<div class="pill-lg race" data-item-id="race"></div><div class="pill-lg background" data-item-id="background"></div>')+'<section class="tab" data-tab="inventory"><div data-item-id="race"></div><div data-item-id="background"></div></section>';
  assert.equal(lightConeSheetHost(root,['race','background']).id,'identity');
  root.querySelector('#identity').getBoundingClientRect=()=>({width:720});
  assert.equal(lightConeSheetHost(root,['race','background']).id,'identity','a wide native column is still the correct host');
  root.innerHTML=details.replace('IDENTITY','<div class="pill-lg empty" data-action="findItem" data-item-type="race">Añadir especie</div><div class="pill-lg empty" data-action="findItem" data-item-type="background">Añadir trasfondo</div>');
  assert.equal(lightConeSheetHost(root,[]).id,'identity','empty and localized native sheets do not need English button labels');
  root.innerHTML='<section class="tab" data-tab="character"><div id="legacy"><div data-document-id="race"></div><div data-entry-id="background"></div></div></section><section data-tab="inventory"><div data-item-id="race"></div></section>';
  assert.equal(lightConeSheetHost(root,['race','background']).id,'legacy');
  root.innerHTML='<div class="sheet-body"><div data-item-id="race"></div><div data-item-id="background"></div></div>';
  assert.equal(lightConeSheetHost(root,['race','background']),null,'a sheet body must never become the card host');
  root.innerHTML='<div><div id="too-wide"><div data-item-id="race"></div></div></div>';root.querySelector('#too-wide').getBoundingClientRect=()=>({width:720});
  assert.equal(lightConeSheetHost(root,['race']),null,'unrecognized broad containers remain excluded');
  dom.window.close();console.log('PASS: Light Cone identity placement with duplicate inventory rows, wide native columns, empty/localized sheets, legacy layouts and safe rejection of unrelated containers.');
})().catch(error=>{console.error(error);process.exitCode=1});
