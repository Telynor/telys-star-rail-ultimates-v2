// Foundry document/canvas adapter for the unmodified D&D5e 5.3.3 TokenPlacement.
// No PIXI 8 drawing methods are provided: calling Graphics.rect fails the test.
export async function install() {
  const {default:TokenPlacement}=await import('/native-system/token-placement.mjs');
  const map=document.querySelector('#map'),events=new Map();
  canvas.app.view=map;canvas.grid??={type:1};
  globalThis.CONST={GRID_TYPES:{SQUARE:1}};
  canvas.stage.on=(type,fn)=>{
    const handler=event=>{
      if(type==='mousedown'&&event.button!==0)return;
      const bounds=map.getBoundingClientRect();
      fn({data:{getLocalPosition:()=>({x:event.clientX-bounds.x,y:event.clientY-bounds.y})},shiftKey:event.shiftKey,stopPropagation:()=>event.stopPropagation()});
    };
    events.set(fn,{type,handler});map.addEventListener(type,handler);return canvas.stage;
  };
  canvas.stage.off=(_type,fn)=>{const entry=events.get(fn);if(entry)map.removeEventListener(entry.type,entry.handler);events.delete(fn);};
  canvas.tokens.preview={addChild:object=>object};
  globalThis.PIXI.Graphics=class{constructor(){throw Error('Custom PIXI summon graphics are forbidden in this test')}};
  window.nativePreviewsDrawn=0;
  class TokenDocument {
    constructor(data){Object.assign(this,data);const doc=this;let node;
      this.object={
        get w(){return doc.width*scene.grid.size},get h(){return doc.height*scene.grid.size},
        async draw(){node=document.createElement('div');node.dataset.nativePlacement='';node.style.cssText='position:absolute;pointer-events:none;box-sizing:border-box;border:3px solid #a5ecff;background:#70b7dd55;background-size:contain;opacity:.65';map.append(node);this.refresh();window.nativePreviewsDrawn++;return this},
        refresh(){if(node)Object.assign(node.style,{left:(doc.x??0)+'px',top:(doc.y??0)+'px',width:this.w+'px',height:this.h+'px',transform:'rotate('+(doc.rotation??0)+'deg)'})},
        getSnappedPosition(point){const s=scene.grid.size;return{x:Math.round(point.x/s)*s,y:Math.round(point.y/s)*s}},
        destroy(){this.destroyed=true;node?.remove()}
      };
    }
    updateSource(patch){Object.assign(this,patch)}
  }
  globalThis.getDocumentClass=()=>TokenDocument;
  game.dnd5e={canvas:{TokenPlacement}};globalThis.dnd5e=game.dnd5e;
}
