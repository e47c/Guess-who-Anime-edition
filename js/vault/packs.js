/* =====================================================================
   ANIME TCG · PACKS, COLLECTION, DECKS, TRADES (pure; tested in tools/vault-test.mjs)
   Collection: w.cards[id] = { n (normal copy 0/1), h (holo copy 0/1), at, by ("first pulled by" stamp), w (wins) }.
   The first copy of a card (and the first holo copy) is kept; any further copy turns into shards
   (Common 5 ... Mythic 500, Holo x2). Shards craft a pack of any series.

   PACK ROLL (one seed per pack, logged in the ledger):
   1. every slot rolls a rarity with the pack's odds, then a random card of that rarity FROM THE PACK'S SERIES;
   2. Premium: if no slot is Rare or better, the last slot is re-rolled among Rare+ (same relative odds);
   3. pity: a Normal pack that is the 20th in a row without an Ultra Rare+ (Premium: 30th without a Legendary+)
      re-rolls its last slot among those rarities; the counter resets whenever a pack reaches that rarity;
   4. every card rolls Holo (8% Normal, 12% Premium);
   5. the cards go into the collection right away (the opening animation only reveals them), in reveal order:
      lowest rarity first, best last.
   ===================================================================== */
import { PACKS, SHARDS, RARITY_ORDER, DECK, TRADE } from "./config.js?v=19";
import { CARDS, BY_SERIES, BY_SERIES_RARITY, CARD_SERIES } from "./carddb.js?v=6";
import { rngFrom, pickWeighted, pickInt, shuffleWith } from "./rng.js?v=2";

export const owned = (w, id) => { const c = (w.cards || {})[id]; return !!c && (c.n > 0 || c.h > 0); };
export const isHolo = (w, id) => !!((w.cards || {})[id] || {}).h;
export const ownedIds = w => Object.keys(w.cards || {}).map(Number).filter(id => CARDS[id] && owned(w, id));
export const seriesDone = (w, s) => BY_SERIES[s].every(id => owned(w, id));
export const shardValue = (id, holo) => SHARDS[CARDS[id].rk] * (holo ? SHARDS.holoMult : 1);

/* add one copy: returns { isNew, shards } (a duplicate becomes shards) */
export function addCard(w, id, holo, by, now) {
    w.cards = Object.assign({}, w.cards);
    const c = Object.assign({ n: 0, h: 0, w: 0 }, w.cards[id]), wasOwned = c.n > 0 || c.h > 0, k = holo ? "h" : "n";
    if (c[k] > 0) { const sh = shardValue(id, holo); w.shards = (Number(w.shards) || 0) + sh; return { isNew: false, shards: sh }; }
    c[k] = 1; if (!wasOwned) { c.at = now || 0; c.by = String(by || "").slice(0, 20); }
    w.cards[id] = c;
    return { isNew: !wasOwned, newHolo: holo && wasOwned, shards: 0 };
}
export function removeCard(w, id, holo) {
    const c = Object.assign({}, (w.cards || {})[id]); const k = holo ? "h" : "n";
    if (!(c[k] > 0)) return false;
    c[k] = 0; w.cards = Object.assign({}, w.cards, { [id]: c });
    if (!owned(w, id)) { delete w.cards[id]; fixDecks(w); }
    return true;
}
/* a card owned both Normal and Holo: the Normal copy becomes its shards (the Holo copy stays) */
export function convertDuplicate(w, id) {
    const c = (w.cards || {})[id]; if (!c || !(c.n > 0) || !(c.h > 0)) return { error: "Not a duplicate" };
    if (Object.values(w.locks || {}).some(l => (l || []).some(x => Number(x.id) === Number(id) && !Number(x.h)))) return { error: "That copy is in an open trade offer" };
    const sh = shardValue(id, false);
    w.cards = Object.assign({}, w.cards, { [id]: Object.assign({}, c, { n: 0 }) }); w.shards = (Number(w.shards) || 0) + sh;
    return { id, shards: sh };
}
/* completing a series unlocks its card sleeve */
function checkSleeves(w, series) {
    const id = "sl_" + series;
    if (!w.inv || !w.inv[id]) { if (seriesDone(w, series)) { w.inv = Object.assign({}, w.inv, { [id]: 1 }); return id; } }
    return null;
}

/* ---------- packs ---------- */
const atLeast = (odds, min) => Object.fromEntries(RARITY_ORDER.map((k, i) => [k, i >= min ? odds[k] : 0]));
export function rollPack(w, { series, kind, seed, via = "coins", by = "", now = 0 }) {
    const P = PACKS[kind]; if (!P) return { error: "Unknown pack" };
    if (!CARD_SERIES.includes(series)) return { error: "Unknown series" };
    if (via === "coins") { if (w.coins < P.price) return { error: "Not enough coins" }; w.coins -= P.price; }
    else if (via === "shards") { if ((Number(w.shards) || 0) < P.shards) return { error: "Not enough shards" }; w.shards -= P.shards; }
    else if (via === "token") { const tk = Number((w.tokens || {})[kind]) || 0; if (tk < 1) return { error: "No free pack" }; w.tokens = Object.assign({}, w.tokens, { [kind]: tk - 1 }); }
    else return { error: "How do you want to pay?" };
    const rng = rngFrom(seed), slots = [];
    for (let i = 0; i < P.cards; i++) slots.push(RARITY_ORDER.indexOf(pickWeighted(rng, P.odds)));
    let guaranteed = false;
    if (P.guaranteeRare && !slots.some(r => r >= 2)) { slots[slots.length - 1] = RARITY_ORDER.indexOf(pickWeighted(rng, atLeast(P.odds, 2))); guaranteed = true; }
    w.pity = Object.assign({ normal: 0, premium: 0 }, w.pity);
    const need = RARITY_ORDER.indexOf(P.pity.atLeast), before = Number(w.pity[kind]) || 0;
    let pity = false;
    if (!slots.some(r => r >= need) && before + 1 >= P.pity.after) { slots[slots.length - 1] = RARITY_ORDER.indexOf(pickWeighted(rng, atLeast(P.odds, need))); pity = true; }
    w.pity[kind] = slots.some(r => r >= need) ? 0 : before + 1;
    const cards = slots.map(r => {
        const list = BY_SERIES_RARITY[series][r], id = list[pickInt(rng, list.length)], h = rng() < P.holo;
        return { id, r, h: h ? 1 : 0 };
    }).sort((a, b) => a.r - b.r || a.h - b.h);
    let shards = 0;
    cards.forEach(c => { const res = addCard(w, c.id, !!c.h, by, now); c.isNew = res.isNew ? 1 : 0; c.newHolo = res.newHolo ? 1 : 0; c.shards = res.shards; shards += res.shards; });
    const sleeve = checkSleeves(w, series);
    w.packsOpened = (Number(w.packsOpened) || 0) + 1;
    const out = { seed, series, kind, via, cards, shards, pity, guaranteed, pityLeft: P.pity.after - w.pity[kind], sleeve: sleeve || "" };
    w.pending = (Array.isArray(w.pending) ? w.pending : []).concat([Object.assign({ at: now }, out)]).slice(-12);
    return out;
}
export const unopened = w => (Array.isArray(w.pending) ? w.pending : []);
export function markOpened(w, seed) { w.pending = unopened(w).filter(p => p.seed !== seed); return {}; }
export function grantToken(w, kind = "normal", n = 1) { w.tokens = Object.assign({}, w.tokens, { [kind]: (Number((w.tokens || {})[kind]) || 0) + n }); return { kind, n }; }

/* ---------- starter deck: 10 balanced Common/Uncommon cards from several series, one of each archetype + 3 ---------- */
export function grantStarter(w, seed, by, now) {
    if (w.starter) return { error: "Already have it" };
    const rng = rngFrom(seed), pool = shuffleWith(rng, Object.values(CARDS).filter(c => c.r <= 1).map(c => c.id)), pick = [], series = {};
    const arches = ["Brawler", "Tank", "Speedster", "Trickster", "Healer", "Mage", "Support"];
    const take = id => { pick.push(id); series[CARDS[id].s] = (series[CARDS[id].s] || 0) + 1; };
    arches.forEach(a => { const id = pool.find(x => CARDS[x].a === a && !pick.includes(x) && !series[CARDS[x].s]); if (id) take(id); });
    for (const id of pool) { if (pick.length >= DECK.starterCount) break; if (!pick.includes(id) && (series[CARDS[id].s] || 0) < 2) take(id); }
    pick.forEach(id => addCard(w, id, false, "Starter deck", now));
    w.starter = 1; w.decks20 = 1;
    const deck = { id: "starter", name: "Starter Deck", cards: pick.slice() };
    w.decks = [deck].concat((w.decks || []).filter(d => d.id !== "starter")); w.activeDeck = "starter";
    return { seed, cards: pick };
}

/* ---------- decks: 20 cards, 1 copy per character, up to DECK.maxActions Action cards (DECK.actionCopies of each,
   unlocked by level). Cards: character ids (numbers) and Action cards ("a:<id>"). ---------- */
const isA = x => /^a:/.test(String(x));
export const ACTION_LEVELS = {};          // filled by js/duel/cards.js (id -> level needed); kept here so the bank stays pure
export function setActionLevels(map) { Object.assign(ACTION_LEVELS, map); }
export function deckProblem(w, cards, lvl = 99) {
    const list = (cards || []).map(x => isA(x) ? String(x) : Number(x));
    if (list.length !== DECK.size) return "Deck needs " + DECK.size + " cards (" + list.length + " now).";
    const chars = list.filter(x => !isA(x)), acts = list.filter(isA);
    if (new Set(chars).size !== chars.length) return "Max " + DECK.maxCopies + " copy of each character.";
    const miss = chars.filter(id => !CARDS[id] || !owned(w, id));
    if (miss.length) return "You don't own " + miss.slice(0, 3).map(id => (CARDS[id] || { n: "card " + id }).n).join(", ") + (miss.length > 3 ? " and " + (miss.length - 3) + " more" : "") + ".";
    if (acts.length > DECK.maxActions) return "Max " + DECK.maxActions + " Action cards (" + acts.length + " now).";
    const per = {}; acts.forEach(a => { per[a] = (per[a] || 0) + 1; });
    const over = Object.keys(per).find(a => per[a] > DECK.actionCopies); if (over) return "Max " + DECK.actionCopies + " copies of each Action card.";
    const locked = Object.keys(per).find(a => ACTION_LEVELS[a.slice(2)] == null || ACTION_LEVELS[a.slice(2)] > lvl); if (locked) return "An Action card in this deck isn't unlocked yet (level " + (ACTION_LEVELS[locked.slice(2)] || "?") + ").";
    return "";
}
export function saveDeck(w, deck, lvl = 99) {
    const name = String(deck.name || "").trim().slice(0, 24) || "Deck";
    const p = deckProblem(w, deck.cards, lvl); if (p) return { error: p };
    const list = (w.decks || []).slice(), i = list.findIndex(d => d.id === deck.id);
    if (i < 0 && list.length >= DECK.maxDecks) return { error: "You have " + DECK.maxDecks + " deck slots. Delete one first." };
    const d = { id: deck.id || "d" + Date.now().toString(36), name, cards: deck.cards.map(x => isA(x) ? String(x) : Number(x)), cover: Number(deck.cover) || 0 };
    if (i < 0) list.push(d); else list[i] = d;
    w.decks = list; if (!w.activeDeck) w.activeDeck = d.id;
    return { deck: d };
}
export function renameDeck(w, id, name) { const d = (w.decks || []).find(x => x.id === id); if (!d) return { error: "No such deck" }; w.decks = w.decks.map(x => x.id === id ? Object.assign({}, x, { name: String(name || "").trim().slice(0, 24) || x.name }) : x); return { id }; }
export function copyDeck(w, id) {
    const d = (w.decks || []).find(x => x.id === id); if (!d) return { error: "No such deck" };
    if ((w.decks || []).length >= DECK.maxDecks) return { error: "You have " + DECK.maxDecks + " deck slots. Delete one first." };
    const c = Object.assign({}, d, { id: "d" + Date.now().toString(36), name: (d.name + " copy").slice(0, 24) }); w.decks = w.decks.concat(c); return { deck: c };
}
export function deleteDeck(w, id) {
    w.decks = (w.decks || []).filter(d => d.id !== id);
    if (w.activeDeck === id) w.activeDeck = (w.decks[0] || {}).id || "";
    return { id };
}
export function setActiveDeck(w, id) { if (!(w.decks || []).some(d => d.id === id)) return { error: "No such deck" }; w.activeDeck = id; return { id }; }
export const activeDeck = w => (w.decks || []).find(d => d.id === w.activeDeck) || (w.decks || [])[0] || null;
function fixDecks(w) { (w.decks || []).forEach(d => { d.bad = deckProblem(w, d.cards) ? 1 : 0; }); }
/* the move to 20-card decks: 10 more starter cards for everyone who had the starter deck, then every deck under
   20 cards is padded from the player's own collection (low rarities first), level-1 Action cards if they still run
   short, and flagged "needs review". Nothing is removed. */
export const STARTER_ACTIONS = ["a:secondwind", "a:battlecry", "a:parry"];
export function migrateDecks20(w, seed, now) {
    if (w.decks20) return { already: 1 };
    let gift = [];
    if (w.starter) {
        const rng = rngFrom(seed), pool = shuffleWith(rng, Object.values(CARDS).filter(c => c.r <= 1 && !owned(w, c.id)).map(c => c.id));
        const series = {}; pool.forEach(id => { if (gift.length < DECK.starterCount - 10 && (series[CARDS[id].s] || 0) < 2) { gift.push(id); series[CARDS[id].s] = (series[CARDS[id].s] || 0) + 1; } });
        gift.forEach(id => addCard(w, id, false, "Starter deck", now));
    }
    w.decks = (w.decks || []).map(d => {
        const cards = (d.cards || []).map(x => isA(x) ? String(x) : Number(x)); if (cards.length >= DECK.size) return d;
        const add = (d.id === "starter" ? gift : []).filter(id => !cards.includes(id));
        add.forEach(id => { if (cards.length < DECK.size) cards.push(id); });
        const spare = ownedIds(w).filter(id => !cards.includes(id)).sort((a, b) => CARDS[a].r - CARDS[b].r || (CARDS[b].pow + CARDS[b].def) - (CARDS[a].pow + CARDS[a].def));
        spare.forEach(id => { if (cards.length < DECK.size - 2) cards.push(id); });
        let k = 0; while (cards.length < DECK.size && k < 12) { const a = STARTER_ACTIONS[k % STARTER_ACTIONS.length]; if (cards.filter(x => x === a).length < DECK.actionCopies && cards.filter(isA).length < DECK.maxActions) cards.push(a); k++; }
        spare.forEach(id => { if (cards.length < DECK.size && !cards.includes(id)) cards.push(id); });
        return Object.assign({}, d, { cards, review: 1 });
    });
    w.decks20 = 1;
    return { gift, decks: (w.decks || []).length };
}

/* ---------- after a card duel: wins per card (the cosmetic "veteran" mark at 10) ---------- */
export function recordDuel(w, played, won) {
    w.duels = Object.assign({ p: 0, w: 0 }, w.duels); w.duels.p++; if (won) w.duels.w++;
    if (won) { w.cards = Object.assign({}, w.cards); [...new Set((played || []).map(Number))].forEach(id => { if (w.cards[id]) w.cards[id] = Object.assign({}, w.cards[id], { w: (Number(w.cards[id].w) || 0) + 1 }); }); }
    return { won: !!won };
}
export const veteran = (w, id) => (Number(((w.cards || {})[id] || {}).w) || 0) >= DECK.veteranWins;

/* ---------- trades between friends in the same room (cards only) ----------
   An offer {tid, from, to, give:[{id,h}], get:[{id,h}]} lives in rooms/<code>/trades/<tid>.
   1. the offering player locks the cards they give (lockTrade); 2. the other player accepts: their client checks
   and locks the cards asked for; 3. each side then swaps its own cards exactly once (applyTrade, op "trade:<tid>").
   A declined or cancelled offer just unlocks. Receiving a card you already own turns it into shards. */
const lockedIds = w => Object.values(w.locks || {}).flat().map(x => x.id + ":" + (x.h ? 1 : 0));
export function tradeProblem(w, list) {
    if (!Array.isArray(list) || list.length > TRADE.maxCards) return "Up to " + TRADE.maxCards + " cards per side.";
    const L = lockedIds(w);
    for (const x of list) {
        if (!CARDS[x.id]) return "Unknown card.";
        const c = (w.cards || {})[x.id] || {}; if (!(x.h ? c.h : c.n)) return "You don't have " + CARDS[x.id].n + (x.h ? " (Holo)" : "") + ".";
        if (L.includes(x.id + ":" + (x.h ? 1 : 0))) return CARDS[x.id].n + " is already in another offer.";
    }
    return "";
}
export function lockTrade(w, tid, give) {
    const p = tradeProblem(w, give); if (p) return { error: p };
    if (Object.keys(w.locks || {}).length >= TRADE.maxOpen) return { error: "You have " + TRADE.maxOpen + " open offers already." };
    w.locks = Object.assign({}, w.locks, { [tid]: give.map(x => ({ id: Number(x.id), h: x.h ? 1 : 0 })) });
    return { tid };
}
export function unlockTrade(w, tid) { if (w.locks && w.locks[tid]) { w.locks = Object.assign({}, w.locks); delete w.locks[tid]; } return { tid }; }
export function applyTrade(w, tid, give, get, by, now) {
    const locked = (w.locks || {})[tid];
    for (const x of give) { const c = (w.cards || {})[x.id] || {}; if (!(x.h ? c.h : c.n)) return { error: "You no longer have " + (CARDS[x.id] || {}).n }; }
    give.forEach(x => removeCard(w, Number(x.id), !!x.h));
    let shards = 0; const got = get.map(x => { const r = addCard(w, Number(x.id), !!x.h, by, now); shards += r.shards; return { id: Number(x.id), h: x.h ? 1 : 0, isNew: r.isNew ? 1 : 0, shards: r.shards }; });
    if (locked) unlockTrade(w, tid);
    const sleeves = [...new Set(get.map(x => CARDS[x.id].s))].map(s => checkSleeves(w, s)).filter(Boolean);
    fixDecks(w);
    return { tid, gave: give, got, shards, sleeves };
}
