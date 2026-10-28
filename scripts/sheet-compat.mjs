// Prefer v14's namespaced APIs without evaluating deprecated global getters.
export function renderSheetTemplate(...args) {
  const handlebars=globalThis.foundry?.applications?.handlebars;
  return handlebars?.renderTemplate ? handlebars.renderTemplate(...args) : globalThis.renderTemplate(...args);
}
export function sheetTextEditor() {
  return globalThis.foundry?.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
}

export function lightConeSheetHost(root,identityIds=[]) {
  if(!root?.querySelector)return null;
  const main=root.querySelector('.tab[data-tab="details"], section[data-tab="details"], .tab[data-tab="character"], section[data-tab="character"], [data-application-part="details"]');
  // Native 5.3/6.x sheets have a named identity column even when neither a
  // Background nor Species exists. Never search their duplicate inventory rows.
  const native=main?.querySelector(':scope > .right > .top > .pills-lg');
  if(native)return native;
  const area=main??root,ids=new Set(identityIds);
  const rows=[...area.querySelectorAll('[data-item-id], [data-document-id], [data-entry-id]')]
    .filter(node=>!node.closest('[data-tsru-light-cone]')&&[node.dataset.itemId,node.dataset.documentId,node.dataset.entryId].some(id=>ids.has(id)));
  if(!rows.length)return null;
  let host=rows[0].parentElement;
  while(host&&host!==area&&!rows.every(row=>host.contains(row)))host=host.parentElement;
  if(!host||host===area||host===root||host.matches('.sheet-body,.tab-body,.window-content,.tab,[data-application-part="body"]'))return null;
  const width=host.getBoundingClientRect?.().width;
  return width&&width>520?null:host;
}
