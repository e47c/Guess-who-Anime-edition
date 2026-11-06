/* =====================================================================
   ARCADE VAULT · hub module
   Owns the player's bank (storage layer, store.js) and receives every finished match's standard result
   (result.js) from game.js. Phase 1: the plumbing only. The economy (coins per placement, daily login,
   missions), the shop, packs and Anime Card Vault plug into onResult() / bank in the next phases.
   ===================================================================== */
import { createBank, localBackend } from "./store.js?v=1";
import { MODE_META } from "./config.js?v=1";

export const bank = createBank(localBackend());
export { MODE_META };

const resultSubs = new Set();
/* f(result, ctx) with ctx = { me: my slot in that room, room: code, uid } */
export function onResult(f) { resultSubs.add(f); return () => resultSubs.delete(f); }
export function reportResult(r, ctx) { resultSubs.forEach(f => { try { f(r, ctx); } catch (e) { console.error("result handler", e); } }); }
