/* =====================================================================
   ANIME TCG · PAGE TABS (router): Packs Store, Collection, Decks, Duel. Each tab is its own module:
   tab-packs.js, tab-collection.js (+ trades), tab-decks.js, tab-duel.js. The Shop and the Wardrobe are elsewhere
   (js/vault/shoppage.js, js/wardrobe.js).
   Every action is an intent sent to the bank (bank.apply with an operation id), so a double click or a second tab
   can never pay twice.
   ===================================================================== */
import { activeDeck } from "./packs.js?v=18";
import { packsTab } from "./tab-packs.js?v=8";
import { collectionTab, collectionSig, collectionRoomSync } from "./tab-collection.js?v=7";
import { decksTab, startEditing } from "./tab-decks.js?v=6";
import { duelTab, setDuelRoom, maybeOfferTraining, closeTrainingOffer } from "./tab-duel.js?v=6";
export { closeTrainingOffer };

let H = null;
export function initTabs(h) { H = h; }
export function renderTab(id, body, h) {
    H = h || H;
    const f = { packs: () => packsTab(H), collection: () => collectionTab(H), decks: () => decksTab(H), duel: () => duelTab(H) }[id];
    if (f) body.appendChild(f());
    if (id === "duel") setTimeout(() => maybeOfferTraining(H), 600);
}
/* what each tab reads from the room: the page only redraws a tab when this changes */
export function roomSig(tab, d) {
    if (!d || !H) return "";
    const x = H.x();
    if (tab === "duel") {
        const slots = x && x.activeSlots ? x.activeSlots(d) : [];
        return JSON.stringify([slots.map(p => { const n = d["player" + p] || {}; return [p, n.name, n.col, n.sf, n.av && (n.av.u || n.av.g || (n.av.d || "").length)]; }),
            d.vloc || {}, Object.keys(d.cvDeck || {}), d.cvTimer, d.np ? 1 : 0, Object.entries(d.cvb || {}).map(([k, b]) => [k, b && b.st, Object.keys((b && b.acc) || {}).length])]);
    }
    if (tab === "collection") return collectionSig(d);
    return "";
}
export function roomSync(d) { setDuelRoom(d); collectionRoomSync(d, H); }
/* "Add to deck" from the inspector: the active deck in the builder with the card in it */
export function addToDeck(id) { startEditing(activeDeck(H.bank.get()), id, H); H.open("decks"); }
