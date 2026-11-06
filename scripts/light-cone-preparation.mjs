// Apply actor bonuses before the system's first item-finalization pass. Item
// finalization is not idempotent: D&D5e inserts base weapon damage on each call.
export function createLightConePreparation(prepare) {
  const pending=new WeakSet();
  return {
    actor(original,...args) {
      pending.add(this);
      try {
        const result=original(...args);
        // Actors without any finalizing items still need their actor bonuses.
        if(pending.delete(this))prepare(this);
        return result;
      } finally {pending.delete(this);}
    },
    item(original,...args) {
      const actor=this.actor;
      if(actor&&pending.delete(actor))prepare(actor);
      return original(...args);
    }
  };
}
