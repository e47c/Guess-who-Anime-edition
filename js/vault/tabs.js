/* =====================================================================
   ANIME TCG · PAGE TABS: Packs Store, Collection (binder + trades), Decks (deck boxes + builder with a slot / curve
   view), Duel (everyone in the room, challenges, live duels). The Shop and the Wardrobe are not here any more:
   js/vault/shoppage.js and js/wardrobe.js.
   Every action is an intent sent to the bank (bank.apply with an operation id), so a double click or a second tab
   can never pay twice; the button's operation id only changes after the action went through.
   ===================================================================== */
import { PACKS, SHARDS, RARITY_ORDER, DECK, TRADE, DUEL } from "./config.js?v=14";
import { rollPack, unopened, markOpened, owned, isHolo, ownedIds, seriesDone, saveDeck, deleteDeck, setActiveDeck, activeDeck, deckProblem, veteran, lockTrade, unlockTrade, applyTrade, tradeProblem } from "./packs.js?v=12";
import { cvChallenge, cvDuels, busyIn, seatsOf, cvWatch, cvReturn, cvDeckOf, locOf } from "../cardvault/cardvault.js?v=15";
import { CARDS, BY_SERIES, CARD_SERIES, CARD_COUNT, RARITY_NAMES, ARCHETYPES, TOTAL_CARDS } from "./carddb.js?v=5";
import { cardEl, packEl, theme } from "./cardui.js?v=13";
import { inspect, holdToInspect } from "./opening.js?v=13";
import { packsTab } from "./tab-packs.js?v=2";
import { collectionTab, collectionSig, collectionRoomSync } from "./tab-collection.js?v=1";

const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const btn = (txt, cls, fn) => { const b = mk("button", "btn " + (cls || ""), txt); b.type = "button"; if (fn) b.onclick = fn; return b; };
const fmt = n => Math.round(n).toLocaleString("en-US");
const coin = n => { const s = mk("span", "vt-price"); s.append(mk("i", "coin-ico"), document.createTextNode(fmt(n))); return s; };
let H = null;
const X = () => H.x();
const W = () => H.bank.get();
const intents = {};
const intent = k => intents[k] || (intents[k] = k + ":" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
const used = k => { delete intents[k]; };
const ask = o => (X().uiConfirm ? X().uiConfirm(o) : Promise.resolve(confirm(o.text || o.title)));
const toast = t => X().toast(t);
const sfx = n => X().sfx(n);
export function initTabs(h) { H = h; }

export function renderTab(id, body, h) {
    H = h || H;
    const f = { packs: () => packsTab(H), collection: () => collectionTab(H), decks: deckTab, duel: duelTab }[id];
    if (f) body.appendChild(f());
}
const sub = (name, list, cur, onPick) => {
    const nav = mk("div", "vt-sub"); nav.setAttribute("role", "tablist"); nav.setAttribute("aria-label", name);
    list.forEach(([k, l]) => { const b = mk("button", "vt-subtab" + (k === cur ? " on" : ""), l); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(k === cur)); b.onclick = () => { sfx("toggle"); onPick(k); }; nav.appendChild(b); });
    return nav;
};

/* =========================== DECKS =========================== */
let editing = null, dkSeries = "", dkRar = -1, dkArch = "";
function deckTab() {
    const w = W(), v = mk("div", "vt-deck");
    if (editing) { v.appendChild(deckEditor()); return v; }
    const act = activeDeck(w);
    (w.decks || []).forEach(d => {
        const bad = deckProblem(w, d.cards), c = mk("article", "vt-card vt-dk" + (act && act.id === d.id ? " active" : "") + (bad ? " bad" : ""));
        const h = mk("header", "vt-ch"); h.append(mk("b", null, d.name), mk("small", null, act && act.id === d.id ? "Active deck: used in duels" : bad || "10 cards ✓"));
        const row = mk("div", "vt-dkrow"); d.cards.forEach((id, k) => { const el = cardEl(id, { size: "xs", holo: isHolo(w, id) }); el.style.setProperty("--k", k); el.onclick = () => inspect(id, { holo: isHolo(w, id) }); row.appendChild(el); });
        const btns = mk("div", "vt-row");
        if (!(act && act.id === d.id)) btns.appendChild(btn("Use in duels", "alt sm", async () => { await H.act("deckuse:" + d.id + ":" + Date.now(), "deck", w2 => setActiveDeck(w2, d.id)); sfx("pick"); H.rerender(); }));
        btns.appendChild(btn("Edit", "ghost sm", () => { editing = { id: d.id, name: d.name, cards: d.cards.slice() }; H.rerender(); }));
        if (d.id !== "starter" || (w.decks || []).length > 1) btns.appendChild(btn("Delete", "ghost sm", async () => { if (await ask({ title: "Delete " + d.name + "?", text: "The cards stay in your collection.", ok: "Delete", danger: true })) { await H.act("deckdel:" + d.id + ":" + Date.now(), "deck", w2 => deleteDeck(w2, d.id)); H.rerender(); } }));
        c.append(h, row, btns); v.appendChild(c);
    });
    if ((w.decks || []).length < DECK.maxDecks) v.appendChild(btn("+ New deck", "alt", () => { editing = { id: "", name: "Deck " + ((w.decks || []).length + 1), cards: [] }; H.rerender(); }));
    v.appendChild(mk("p", "vt-rule", "A deck is exactly " + DECK.size + " different cards. Everyone starts with a free Starter Deck; open packs for more. Your active deck is the one you bring to duels (Duel tab)."));
    return v;
}
function deckEditor() {
    const w = W(), E = editing, v = mk("div", "vt-dked");
    const top = mk("div", "vt-dktop"), name = mk("input", "vt-dkname"); name.value = E.name; name.maxLength = 24; name.setAttribute("aria-label", "Deck name");
    name.oninput = () => { E.name = name.value; };
    top.append(name, mk("b", "vt-dkcount" + (E.cards.length === DECK.size ? " ok" : ""), E.cards.length + " / " + DECK.size));
    v.appendChild(top);
    const slots = mk("div", "vt-dkslots");
    for (let i = 0; i < DECK.size; i++) {
        const id = E.cards[i];
        if (id) { const el = cardEl(id, { size: "xs", holo: isHolo(w, id) }); el.title = "Remove " + CARDS[id].n; el.onclick = () => { E.cards.splice(i, 1); sfx("close"); H.rerender(); }; slots.appendChild(el); }
        else slots.appendChild(mk("div", "vt-dkempty", String(i + 1)));
    }
    v.appendChild(slots);
    v.appendChild(curveEl(E.cards));
    if (E.cards.length) {
        const cs = E.cards.map(id => CARDS[id]), avg = k => (cs.reduce((s, c) => s + c[k], 0) / cs.length).toFixed(1);
        const arch = {}; cs.forEach(c => { arch[c.a] = (arch[c.a] || 0) + 1; });
        v.appendChild(mk("p", "vt-rule", "Average Power " + avg("pow") + " · Defense " + avg("def") + " · " + Object.entries(arch).map(([a, n]) => n + " " + a).join(", ")));
    }
    const fl = mk("div", "vt-filters");
    const sel = mk("select", "vt-sel"); sel.setAttribute("aria-label", "Series"); sel.innerHTML = '<option value="">All series</option>' + CARD_SERIES.map(s => '<option value="' + s + '"' + (s === dkSeries ? " selected" : "") + ">" + theme(s).label + "</option>").join("");
    sel.onchange = () => { dkSeries = sel.value; H.rerender(); };
    const sa = mk("select", "vt-sel"); sa.setAttribute("aria-label", "Archetype"); sa.innerHTML = '<option value="">Any archetype</option>' + ARCHETYPES.map(a => '<option' + (a === dkArch ? " selected" : "") + ">" + a + "</option>").join("");
    sa.onchange = () => { dkArch = sa.value; H.rerender(); };
    fl.append(sel, sa);
    RARITY_NAMES.forEach((n, i) => { const b = mk("button", "chip-btn" + (dkRar === i ? " on" : ""), n); b.type = "button"; b.onclick = () => { dkRar = dkRar === i ? -1 : i; H.rerender(); }; fl.appendChild(b); });
    v.appendChild(fl);
    let ids = ownedIds(w);
    if (dkSeries) ids = ids.filter(id => CARDS[id].s === dkSeries); if (dkRar >= 0) ids = ids.filter(id => CARDS[id].r === dkRar); if (dkArch) ids = ids.filter(id => CARDS[id].a === dkArch);
    ids.sort((a, b) => CARDS[b].r - CARDS[a].r || CARDS[b].pow + CARDS[b].def - CARDS[a].pow - CARDS[a].def);
    const grid = mk("div", "vt-cgrid pick");
    ids.forEach(id => {
        const inD = E.cards.includes(id), el = cardEl(id, { size: "sm", holo: isHolo(w, id) }); if (inD) el.classList.add("picked");
        el.tabIndex = 0;
        el.onclick = () => { if (inD) E.cards = E.cards.filter(x => x !== id); else if (E.cards.length < DECK.size) E.cards.push(id); else { toast("A deck holds " + DECK.size + " cards. Tap a card in the deck to take it out."); return; } sfx(inD ? "close" : "pick"); H.rerender(); };
        el.onkeydown = e => { if (e.key === "Enter") el.click(); };
        grid.appendChild(el);
    });
    holdToInspect(grid, e => { const el = e.target.closest && e.target.closest(".vcard"); return el ? { id: Number(el.dataset.id), h: isHolo(w, Number(el.dataset.id)) } : null; });
    v.appendChild(grid);
    const bar = mk("div", "vt-row vt-dkbar");
    bar.append(btn("Cancel", "ghost", () => { editing = null; H.rerender(); }), btn("Save deck", "alt", async () => {
        const r = await H.act("decksave:" + (E.id || "new") + ":" + Date.now(), "deck", w2 => saveDeck(w2, E));
        if (!r.ok) { toast(r.error); return; }
        H.event("deck", "ev:deck:" + Date.now()); editing = null; sfx("ready"); toast("Deck saved"); H.rerender();
    }));
    v.appendChild(bar);
    v.appendChild(mk("p", "vt-rule", "Tap cards to add or remove them; hold a card to inspect it."));
    return v;
}

/* the deck's curve: how many cards at each Power (bars) and each Defense (ticks), like a mana curve */
function curveEl(ids) {
    const box = mk("div", "vt-curve"), cs = ids.map(id => CARDS[id]).filter(Boolean);
    const vals = cs.flatMap(c => [c.pow, c.def]), hi = Math.max(8, ...vals, 1);
    box.appendChild(mk("b", "vt-cvt", "Curve"));
    const plot = mk("div", "vt-cvplot");
    const peak = Math.max(1, ...Array.from({ length: hi + 1 }, (_, v) => Math.max(cs.filter(c => c.pow === v).length, cs.filter(c => c.def === v).length)));
    for (let v = 0; v <= hi; v++) {
        const p = cs.filter(c => c.pow === v).length, d = cs.filter(c => c.def === v).length, col = mk("div", "vt-cvcol");
        const bp = mk("i", "vt-cvp"); bp.style.height = (p / peak * 100) + "%"; bp.title = p + " card(s) with Power " + v;
        const bd = mk("i", "vt-cvd"); bd.style.height = (d / peak * 100) + "%"; bd.title = d + " card(s) with Defense " + v;
        col.append(mk("span", "vt-cvn", p ? String(p) : ""), bp, bd, mk("small", null, String(v)));
        plot.appendChild(col);
    }
    box.appendChild(plot);
    box.appendChild(mk("small", "vt-cvkey", "■ Power   ■ Defense   (" + cs.length + " / " + DECK.size + " cards)"));
    return box;
}

/* =========================== DUEL =========================== */
/* Everyone in the room, on their own lobby card: pick one (1v1) or several (free-for-all) and challenge them.
   Live duels in the room can be watched; yours can be re-entered. Practice vs CPU never pays. */
const chal = new Set();
const LOC = { v: "In Anime TCG", l: "In the lobby", b: "In a duel" };
function duelTab() {
    const w = W(), v = mk("div", "vt-duel"), d = activeDeck(w), bad = d ? deckProblem(w, d.cards) : "No deck", x = X(), rd = roomData, me = x.me ? x.me() : 0;
    const hero = mk("section", "vt-card vt-bhero");
    hero.append(mk("b", "vt-btitle", "Card Duels"), mk("p", "vt-rule", "Pick a card in secret, reveal together, clash: damage = your Power minus their Defense, then the abilities. 1v1: " + DUEL.duel.life + " life, 10 cards, hand of " + DUEL.duel.hand + ". Challenge 2 or more for a free-for-all (" + DUEL.ffa.life + " life, pick a target too). Last one standing wins."));
    const rec = w.duels || { p: 0, w: 0 }; hero.appendChild(mk("small", "vt-brec", "Your record: " + rec.w + " wins / " + rec.p + " duels"));
    const dk = mk("div", "vt-bdeck"); dk.append(mk("b", null, "Your deck: " + (d ? d.name : "none")), mk("small", null, bad || "Ready"));
    if (d) { const row = mk("div", "vt-dkrow"); d.cards.forEach(id => row.appendChild(cardEl(id, { size: "xs", holo: isHolo(w, id) }))); dk.appendChild(row); }
    dk.appendChild(btn("Change deck", "ghost sm", () => H.open("decks")));
    hero.appendChild(dk);
    v.appendChild(hero);
    if (rd && rd.np && x.inRoom && x.inRoom()) {      // a Night Party is on: no challenges between stages
        const nr = mk("section", "vt-card vt-bnoroom");
        nr.append(mk("b", "vt-btitle", "Card duels are off during a Night Party"), mk("p", "vt-rule", "Challenges come back when the tournament is over. You can still build decks and practice against the CPU."));
        const pr = mk("div", "vt-row vt-bgo");
        pr.appendChild(btn("Practice vs CPU", "ghost", () => { if (bad) { toast(bad === "No deck" ? "Build a 10-card deck first (Decks tab)." : bad); return; } x.startPractice && x.startPractice(); }));
        nr.appendChild(pr); v.appendChild(nr);
        return v;
    }
    if (!(x.inRoom && x.inRoom()) || !rd || !x.activeSlots) {      // no room (opened from the main menu)
        const nr = mk("section", "vt-card vt-bnoroom");
        nr.append(mk("b", "vt-btitle", "Host a party or join one to duel"), mk("p", "vt-rule", "Card duels are between friends in the same room. Everything else in Anime TCG works right here."));
        const r = mk("div", "vt-row vt-bgo"); r.append(btn("HOST PARTY", "alt", () => H.hostParty()), btn("JOIN", "", () => H.joinParty()));
        nr.appendChild(r); v.appendChild(nr);
        const pr = mk("div", "vt-row vt-bgo");
        pr.appendChild(btn("Practice vs CPU", "ghost", () => { if (bad) { toast(bad === "No deck" ? "Build a 10-card deck first (Decks tab)." : bad); return; } x.startPractice && x.startPractice(); }));
        v.appendChild(pr); v.appendChild(mk("p", "vt-rule", "Practice never pays coins."));
        return v;
    }
    const all = cvDuels(rd), mine = busyIn(rd, me), others = x.activeSlots(rd).filter(p => p !== me);
    // my own duel / challenge
    if (mine) {
        const sec = mk("section", "vt-card vt-bmine");
        const opp = seatsOf(mine).filter(p => p !== me).map(p => x.pName(rd, p)).join(", ");
        if (mine.st === "live") { sec.append(mk("b", null, "⚔ You're battling " + opp), btn("Return to the duel", "alt", () => cvReturn(mine.bid))); }
        else sec.append(mk("b", null, mine.from === me ? "Challenge sent to " + opp : "Challenge from " + x.pName(rd, mine.from)), mk("small", "vt-rule", "Answer it in the strip at the bottom of the screen."));
        v.appendChild(sec);
    }
    // the room
    const sec = mk("section", "vt-card vt-broom");
    const hh = mk("header", "vt-ch"); hh.append(mk("b", null, "Players in this room"), mk("small", null, others.length ? "Tap players to pick them, then challenge" : "Nobody else yet"));
    sec.appendChild(hh);
    [...chal].forEach(p => { if (!others.includes(p) || busyIn(rd, p)) chal.delete(p); });
    if (!others.length) sec.appendChild(mk("p", "vt-rule", "Share the room code" + (x.roomCode ? " (" + x.roomCode() + ")" : "") + " so friends can join. Until then, practice against the CPU."));
    const grid = mk("div", "vt-bplayers");
    x.activeSlots(rd).forEach(p => {
        const n = rd["player" + p] || {}, isMe = p === me, busy = busyIn(rd, p), deck = cvDeckOf(rd, p), loc = locOf(rd, p);
        const cell = mk(isMe ? "div" : "button", "vt-bpl" + (chal.has(p) ? " on" : "") + (isMe ? " me" : "") + (busy ? " busy" : "")); if (!isMe) cell.type = "button";
        const card = x.seatCard(n, { slot: p, me: isMe, col: n.col });
        const tags = mk("div", "seat-tags");
        if (isMe) tags.appendChild(mk("span", "tag you", "YOU"));
        tags.appendChild(mk("span", "tag vt-loc loc-" + (busy && busy.st === "live" ? "b" : loc), busy && busy.st === "live" ? "⚔ In a duel" : busy ? "Challenge pending" : LOC[loc] || LOC.l));
        if (!deck) tags.appendChild(mk("span", "tag off", "No deck yet"));
        card.appendChild(tags); cell.appendChild(card);
        if (!isMe) {
            cell.setAttribute("aria-pressed", String(chal.has(p))); cell.setAttribute("aria-label", (chal.has(p) ? "Picked: " : "Pick ") + (n.name || "Player " + p));
            cell.disabled = !!busy;
            cell.onclick = () => { if (chal.has(p)) chal.delete(p); else if (chal.size + 2 > DUEL.ffa.max) { toast("A duel holds up to " + DUEL.ffa.max + " players."); return; } else chal.add(p); sfx("toggle"); H.rerender(); };
        }
        grid.appendChild(cell);
    });
    sec.appendChild(grid);
    const go = mk("div", "vt-row vt-bgo");
    const names = [...chal].map(p => x.pName(rd, p));
    const cb = btn(chal.size === 0 ? "Pick someone to challenge" : chal.size === 1 ? "Challenge " + names[0] + " · 1v1" : "Challenge " + chal.size + " players · free-for-all", "xl", async () => {
        if (bad) { toast(bad === "No deck" ? "Build a 10-card deck first (Decks tab)." : bad); return; }
        if (await cvChallenge([...chal])) { chal.clear(); H.rerender(); }
    });
    cb.disabled = !chal.size || !!mine; cb.classList.add("vt-chal");
    go.appendChild(cb);
    sec.appendChild(go);
    if (mine) sec.appendChild(mk("small", "vt-rule", "One duel at a time: finish or cancel yours first."));
    v.appendChild(sec);
    // live duels in the room
    const live = all.filter(b => b.st === "live" && b.s);
    const ls = mk("section", "vt-card vt-blive"); ls.appendChild(mk("header", "vt-ch")).append(mk("b", null, "Live duels"), mk("small", null, live.length ? live.length + " running" : "none right now"));
    live.forEach(b => {
        const r = mk("div", "vt-blrow"), ps = seatsOf(b), s = b.s;
        const who = mk("div", "vt-blwho"); ps.forEach(p => who.appendChild(x.avatarEl(rd["player" + p] || { name: (s.names || {})["p" + p] }, { size: 30 })));
        r.append(who, mk("span", null, ps.map(p => x.pName(rd, p)).join(" vs ") + " · round " + (s.round || 1)));
        r.appendChild(ps.includes(me) ? btn("Return", "alt sm", () => cvReturn(b.bid)) : btn("Watch", "ghost sm", () => cvWatch(b.bid)));
        ls.appendChild(r);
    });
    v.appendChild(ls);
    // practice
    const pr = mk("div", "vt-row vt-bgo");
    pr.appendChild(btn("Practice vs CPU", "ghost", () => { if (bad) { toast(bad === "No deck" ? "Build a 10-card deck first (Decks tab)." : bad); return; } x.startPractice && x.startPractice(); }));
    v.appendChild(pr);
    v.appendChild(mk("p", "vt-rule", "Challenges expire after " + ((DUEL.challenge || {}).expireSeconds || 60) + " s. The host's lobby settings set the pick timer (" + (Number(rd.cvTimer) || DUEL.pickSeconds) + " s). Duels pay placement coins like every mode; the cards you played count toward their Veteran mark (" + DECK.veteranWins + " wins). Practice never pays. You can go back to the lobby at any time."));
    return v;
}
/* what each tab reads from the room: the page only redraws a tab when this changes */
export function roomSig(tab, d) {
    if (!d) return "";
    const x = X ? (H ? X() : null) : null;
    if (tab === "duel") {
        const slots = x && x.activeSlots ? x.activeSlots(d) : [];
        return JSON.stringify([slots.map(p => { const n = d["player" + p] || {}; return [p, n.name, n.col, n.sf, n.bg, n.ttl, n.lvl, n.uc, n.ts, n.av && (n.av.u || n.av.g || (n.av.d || "").length)]; }),
            d.vloc || {}, Object.keys(d.cvDeck || {}).filter(k => arrv((d.cvDeck[k] || {}).cards).length === 10), d.cvTimer,
            Object.entries(d.cvb || {}).map(([k, b]) => [k, b && b.st, Object.keys((b && b.acc) || {}).length, b && b.s && b.s.round])]);
    }
    if (tab === "collection") return collectionSig(d);
    return "";
}

/* the Collection and the trades: js/vault/tab-collection.js */
export function roomSync(d) { roomData = d; collectionRoomSync(d, H); }
let roomData = null;
/* "Add to deck" from the inspector: open the active deck in the builder with the card in it */
export function addToDeck(id) {
    const w = W(), d = activeDeck(w);
    editing = d ? { id: d.id, name: d.name, cards: d.cards.slice() } : { id: "", name: "Deck " + ((w.decks || []).length + 1), cards: [] };
    if (!editing.cards.includes(id)) { if (editing.cards.length < DECK.size) editing.cards.push(id); else toast("That deck is full: take a card out to make room."); }
    H.open("decks");
}
