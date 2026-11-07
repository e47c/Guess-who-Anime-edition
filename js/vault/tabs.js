/* =====================================================================
   ANIME TCG · PAGE TABS: Packs Store, Collection (binder + trades), Decks (deck boxes + builder with a slot / curve
   view), Battle (everyone in the room, challenges, live battles). The Shop and the Wardrobe are not here any more:
   js/vault/shoppage.js and js/wardrobe.js.
   Every action is an intent sent to the bank (bank.apply with an operation id), so a double click or a second tab
   can never pay twice; the button's operation id only changes after the action went through.
   ===================================================================== */
import { PACKS, SHARDS, RARITY_ORDER, DECK, TRADE, BATTLE } from "./config.js?v=10";
import { rollPack, unopened, markOpened, owned, isHolo, ownedIds, seriesDone, saveDeck, deleteDeck, setActiveDeck, activeDeck, deckProblem, veteran, lockTrade, unlockTrade, applyTrade, tradeProblem } from "./packs.js?v=8";
import { cvChallenge, cvBattles, busyIn, seatsOf, cvWatch, cvReturn, cvDeckOf, locOf } from "../cardvault/cardvault.js?v=9";
import { CARDS, BY_SERIES, CARD_SERIES, CARD_COUNT, RARITY_NAMES, ARCHETYPES, TOTAL_CARDS } from "./carddb.js?v=3";
import { cardEl, packEl, theme } from "./cardui.js?v=8";
import { openPack, inspect, holdToInspect } from "./opening.js?v=8";

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
    const f = { packs: packsTab, collection: collectionTab, decks: deckTab, battle: battleTab }[id];
    if (f) body.appendChild(f());
}
const sub = (name, list, cur, onPick) => {
    const nav = mk("div", "vt-sub"); nav.setAttribute("role", "tablist"); nav.setAttribute("aria-label", name);
    list.forEach(([k, l]) => { const b = mk("button", "vt-subtab" + (k === cur ? " on" : ""), l); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(k === cur)); b.onclick = () => { sfx("toggle"); onPick(k); }; nav.appendChild(b); });
    return nav;
};

/* =========================== PACKS =========================== */
let packKind = "normal";
function packsTab() {
    const w = W(), v = mk("div", "vt-packs");
    // status line: shards, free packs, pity
    const st = mk("div", "vt-pstat");
    st.innerHTML = '<span><i class="shard-ico"></i> <b>' + fmt(w.shards || 0) + '</b> shards</span>' + (((w.tokens || {}).normal || 0) ? '<span>🎁 <b>' + w.tokens.normal + '</b> free pack' + (w.tokens.normal > 1 ? "s" : "") + '</span>' : "");
    const pn = PACKS.normal.pity.after - ((w.pity || {}).normal || 0), pp = PACKS.premium.pity.after - ((w.pity || {}).premium || 0);
    st.appendChild(mk("small", null, "Ultra Rare+ guaranteed within " + pn + " Normal pack" + (pn === 1 ? "" : "s") + " · Legendary+ within " + pp + " Premium pack" + (pp === 1 ? "" : "s")));
    v.appendChild(st);
    const un = unopened(w);
    if (un.length) {
        const u = mk("div", "vt-card vt-unopened"); u.appendChild(mk("b", null, "Unopened: " + un.length));
        un.forEach(p => { const b = btn(theme(p.series).label + (p.kind === "premium" ? " Premium" : ""), "alt sm", () => reveal(p)); u.appendChild(b); });
        v.appendChild(u);
    }
    v.appendChild(sub("Pack", [["normal", "Normal · " + PACKS.normal.cards + " cards"], ["premium", "Premium · " + PACKS.premium.cards + " cards, Rare+"]], packKind, k => { packKind = k; H.rerender(); }));
    const P = PACKS[packKind], grid = mk("div", "vt-pgrid");
    CARD_SERIES.forEach(s => {
        const c = mk("article", "vt-pcell"), have = BY_SERIES[s].filter(id => owned(w, id)).length;
        const pk = packEl(s, packKind); pk.style.setProperty("--pw", "min(38vw, 150px)"); c.appendChild(pk);
        c.appendChild(mk("small", "vt-pprog" + (have === CARD_COUNT[s] ? " done" : ""), have + " / " + CARD_COUNT[s] + (have === CARD_COUNT[s] ? " ✓" : "")));
        const row = mk("div", "vt-pbuy");
        const b1 = btn("", "alt sm", () => doPack(s, packKind, "coins")); b1.appendChild(coin(P.price)); b1.disabled = w.coins < P.price; row.appendChild(b1);
        const b2 = btn("", "ghost sm", () => doPack(s, packKind, "shards")); b2.innerHTML = '<i class="shard-ico"></i> ' + P.shards; b2.title = "Craft with shards"; b2.disabled = (w.shards || 0) < P.shards; row.appendChild(b2);
        if (packKind === "normal" && ((w.tokens || {}).normal || 0) > 0) row.appendChild(btn("Free", "sm", () => doPack(s, "normal", "token")));
        c.appendChild(row); grid.appendChild(c);
    });
    v.appendChild(grid);
    const odds = mk("details", "vt-card vt-odds-d"); odds.appendChild(mk("summary", null, "Odds, pity and shards"));
    const tbl = mk("table", "vt-otbl"); tbl.innerHTML = "<tr><th>Rarity</th><th>Normal</th><th>Premium</th><th>Duplicate</th></tr>" + RARITY_ORDER.map((r, i) => "<tr><td>" + RARITY_NAMES[i] + "</td><td>" + PACKS.normal.odds[r] + "%</td><td>" + PACKS.premium.odds[r] + "%</td><td>" + SHARDS[r] + " shards</td></tr>").join("");
    odds.append(tbl, mk("p", "vt-rule", "Odds are per card. Holo: " + PACKS.normal.holo * 100 + "% per card (Normal), " + PACKS.premium.holo * 100 + "% (Premium); a Holo duplicate gives double shards. Premium packs always hold a Rare or better. Pity: after " + PACKS.normal.pity.after + " Normal packs in a row without an Ultra Rare or better, the next one has one; after " + PACKS.premium.pity.after + " Premium packs without a Legendary or better, the next one has one. A pack only holds characters from its own series. Every pack is rolled with its own seed, saved in your coin history."));
    v.appendChild(odds);
    return v;
}
async function doPack(series, kind, via) {
    const k = "pack-" + series + "-" + kind + "-" + via, op = intent(k), seed = H.newSeed(), by = X().profileName ? X().profileName() : "";
    if (via === "coins" && !(await ask({ title: theme(series).label + " " + PACKS[kind].name + "?", text: fmt(PACKS[kind].price) + " AAP Coins · " + PACKS[kind].cards + " cards" + (kind === "premium" ? ", one Rare or better guaranteed" : "") + ".", ok: "Buy & open" }))) return;
    const r = await H.act(op, via === "shards" ? "craft" : via === "token" ? "token" : "pack", (w, x) => rollPack(w, { series, kind, seed, via, by, now: x.now }));
    if (!r.ok) { toast(r.error); return; }
    used(k); H.event("pack", "ev:" + op);
    reveal(r.result);
}
function reveal(res) {
    openPack(res, {
        onDone: () => { H.act("opened:" + res.seed, "opened", w => markOpened(w, res.seed)).then(() => H.rerender()); },
        onNext: W().coins >= PACKS[res.kind].price ? { label: "Open another", price: PACKS[res.kind].price, fn: () => { H.act("opened:" + res.seed, "opened", w => markOpened(w, res.seed)).then(() => doPack(res.series, res.kind, "coins")); } } : null
    });
}

/* =========================== COLLECTION =========================== */
let colSeries = "", colRar = -1, colOwned = false, colView = "book";
function collectionTab() {
    const w = W(), v = mk("div", "vt-col"), mine = ownedIds(w);
    const head = mk("div", "vt-colhead");
    head.append(mk("b", null, mine.length + " / " + TOTAL_CARDS + " cards"), mk("small", null, CARD_SERIES.filter(s => seriesDone(w, s)).length + " series complete"));
    if (canTrade()) head.appendChild(btn("Trade with friends" + (incomingCount() ? " (" + incomingCount() + ")" : ""), "alt sm", () => { colView = "trade"; H.rerender(); }));
    v.appendChild(head);
    if (colView === "trade" && canTrade()) { v.appendChild(tradeView()); return v; }
    colView = "book";
    // the book: series with completion
    const book = mk("div", "vt-book");
    CARD_SERIES.forEach(s => {
        const have = BY_SERIES[s].filter(id => owned(w, id)).length, done = have === CARD_COUNT[s];
        const b = mk("button", "vt-bk" + (colSeries === s ? " on" : "") + (done ? " done" : "")); b.type = "button";
        const T = theme(s); b.style.setProperty("--c1", T.c1); b.style.setProperty("--c3", T.c3);
        const bar = mk("i", "vt-bkbar"); bar.style.setProperty("--p", (have / CARD_COUNT[s] * 100).toFixed(1) + "%");
        b.append(mk("b", null, T.label), mk("small", null, have + "/" + CARD_COUNT[s] + (done ? " ✓" : "")), bar);
        b.onclick = () => { colSeries = colSeries === s ? "" : s; sfx("toggle"); H.rerender(); };
        book.appendChild(b);
    });
    v.appendChild(book);
    const fl = mk("div", "vt-filters");
    RARITY_NAMES.forEach((n, i) => { const b = mk("button", "chip-btn" + (colRar === i ? " on" : ""), n); b.type = "button"; b.onclick = () => { colRar = colRar === i ? -1 : i; H.rerender(); }; fl.appendChild(b); });
    const ob = mk("button", "chip-btn" + (colOwned ? " on" : ""), "Owned only"); ob.type = "button"; ob.onclick = () => { colOwned = !colOwned; H.rerender(); }; fl.appendChild(ob);
    v.appendChild(fl);
    let ids = colSeries ? BY_SERIES[colSeries].slice() : mine.slice();
    if (colRar >= 0) ids = ids.filter(id => CARDS[id].r === colRar);
    if (colOwned || !colSeries) ids = ids.filter(id => owned(w, id));
    ids.sort((a, b) => CARDS[a].s === CARDS[b].s ? CARDS[a].no.localeCompare(CARDS[b].no) : CARD_SERIES.indexOf(CARDS[a].s) - CARD_SERIES.indexOf(CARDS[b].s));
    const grid = mk("div", "vt-cgrid");
    if (!ids.length) grid.appendChild(mk("p", "vt-rule", colSeries ? "No cards match." : "Open packs to fill your book. Tap a series above to see every card in it (missing ones are shadows)."));
    ids.slice(0, 400).forEach(id => {
        const own = owned(w, id), c = (w.cards || {})[id] || {};
        const el = cardEl(id, { size: "sm", holo: !!c.h, ghost: !own, gold: own && seriesDone(w, CARDS[id].s), veteran: veteran(w, id) });
        if (own) { el.tabIndex = 0; el.onclick = () => inspect(id, { holo: !!c.h, stamp: { by: c.by, at: c.at }, veteran: veteran(w, id) }); el.onkeydown = e => { if (e.key === "Enter") el.click(); }; }
        grid.appendChild(el);
    });
    if (ids.length > 400) grid.appendChild(mk("p", "vt-rule", "Showing 400 of " + ids.length + ". Pick a series or a rarity to narrow it down."));
    v.appendChild(grid);
    v.appendChild(mk("p", "vt-rule", "Tap a card to inspect it (drag to tilt, tap to turn it over). A completed series gets a gold edge and unlocks its card sleeve (equip it in the Wardrobe: Edit player card). Duplicates from packs turn into shards automatically."));
    return v;
}

/* =========================== DECKS =========================== */
let editing = null, dkSeries = "", dkRar = -1, dkArch = "";
function deckTab() {
    const w = W(), v = mk("div", "vt-deck");
    if (editing) { v.appendChild(deckEditor()); return v; }
    const act = activeDeck(w);
    (w.decks || []).forEach(d => {
        const bad = deckProblem(w, d.cards), c = mk("article", "vt-card vt-dk" + (act && act.id === d.id ? " active" : "") + (bad ? " bad" : ""));
        const h = mk("header", "vt-ch"); h.append(mk("b", null, d.name), mk("small", null, act && act.id === d.id ? "Active deck: used in battles" : bad || "10 cards ✓"));
        const row = mk("div", "vt-dkrow"); d.cards.forEach((id, k) => { const el = cardEl(id, { size: "xs", holo: isHolo(w, id) }); el.style.setProperty("--k", k); el.onclick = () => inspect(id, { holo: isHolo(w, id) }); row.appendChild(el); });
        const btns = mk("div", "vt-row");
        if (!(act && act.id === d.id)) btns.appendChild(btn("Use in battles", "alt sm", async () => { await H.act("deckuse:" + d.id + ":" + Date.now(), "deck", w2 => setActiveDeck(w2, d.id)); sfx("pick"); H.rerender(); }));
        btns.appendChild(btn("Edit", "ghost sm", () => { editing = { id: d.id, name: d.name, cards: d.cards.slice() }; H.rerender(); }));
        if (d.id !== "starter" || (w.decks || []).length > 1) btns.appendChild(btn("Delete", "ghost sm", async () => { if (await ask({ title: "Delete " + d.name + "?", text: "The cards stay in your collection.", ok: "Delete", danger: true })) { await H.act("deckdel:" + d.id + ":" + Date.now(), "deck", w2 => deleteDeck(w2, d.id)); H.rerender(); } }));
        c.append(h, row, btns); v.appendChild(c);
    });
    if ((w.decks || []).length < DECK.maxDecks) v.appendChild(btn("+ New deck", "alt", () => { editing = { id: "", name: "Deck " + ((w.decks || []).length + 1), cards: [] }; H.rerender(); }));
    v.appendChild(mk("p", "vt-rule", "A deck is exactly " + DECK.size + " different cards. Everyone starts with a free Starter Deck; open packs for more. Your active deck is the one you bring to battles (Battle tab)."));
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

/* =========================== BATTLE =========================== */
/* Everyone in the room, on their own lobby card: pick one (1v1) or several (free-for-all) and challenge them.
   Live battles in the room can be watched; yours can be re-entered. Practice vs CPU never pays. */
const chal = new Set();
const LOC = { v: "In Anime TCG", l: "In the lobby", b: "In a battle" };
function battleTab() {
    const w = W(), v = mk("div", "vt-battle"), d = activeDeck(w), bad = d ? deckProblem(w, d.cards) : "No deck", x = X(), rd = roomData, me = x.me ? x.me() : 0;
    const hero = mk("section", "vt-card vt-bhero");
    hero.append(mk("b", "vt-btitle", "Card Battles"), mk("p", "vt-rule", "Pick a card in secret, reveal together, clash: damage = your Power minus their Defense, then the abilities. 1v1: " + BATTLE.duel.life + " life, 10 cards, hand of " + BATTLE.duel.hand + ". Challenge 2 or more for a free-for-all (" + BATTLE.ffa.life + " life, pick a target too). Last one standing wins."));
    const rec = w.battles || { p: 0, w: 0 }; hero.appendChild(mk("small", "vt-brec", "Your record: " + rec.w + " wins / " + rec.p + " battles"));
    const dk = mk("div", "vt-bdeck"); dk.append(mk("b", null, "Your deck: " + (d ? d.name : "none")), mk("small", null, bad || "Ready"));
    if (d) { const row = mk("div", "vt-dkrow"); d.cards.forEach(id => row.appendChild(cardEl(id, { size: "xs", holo: isHolo(w, id) }))); dk.appendChild(row); }
    dk.appendChild(btn("Change deck", "ghost sm", () => H.open("decks")));
    hero.appendChild(dk);
    v.appendChild(hero);
    if (rd && rd.np && x.inRoom && x.inRoom()) {      // a Night Party is on: no challenges between stages
        const nr = mk("section", "vt-card vt-bnoroom");
        nr.append(mk("b", "vt-btitle", "Card battles are off during a Night Party"), mk("p", "vt-rule", "Challenges come back when the tournament is over. You can still build decks and practice against the CPU."));
        const pr = mk("div", "vt-row vt-bgo");
        pr.appendChild(btn("Practice vs CPU", "ghost", () => { if (bad) { toast(bad === "No deck" ? "Build a 10-card deck first (Decks tab)." : bad); return; } x.startPractice && x.startPractice(); }));
        nr.appendChild(pr); v.appendChild(nr);
        return v;
    }
    if (!(x.inRoom && x.inRoom()) || !rd || !x.activeSlots) {      // no room (opened from the main menu)
        const nr = mk("section", "vt-card vt-bnoroom");
        nr.append(mk("b", "vt-btitle", "Host a party or join one to battle"), mk("p", "vt-rule", "Card battles are between friends in the same room. Everything else in Anime TCG works right here."));
        const r = mk("div", "vt-row vt-bgo"); r.append(btn("HOST PARTY", "alt", () => H.hostParty()), btn("JOIN", "", () => H.joinParty()));
        nr.appendChild(r); v.appendChild(nr);
        const pr = mk("div", "vt-row vt-bgo");
        pr.appendChild(btn("Practice vs CPU", "ghost", () => { if (bad) { toast(bad === "No deck" ? "Build a 10-card deck first (Decks tab)." : bad); return; } x.startPractice && x.startPractice(); }));
        v.appendChild(pr); v.appendChild(mk("p", "vt-rule", "Practice never pays coins."));
        return v;
    }
    const all = cvBattles(rd), mine = busyIn(rd, me), others = x.activeSlots(rd).filter(p => p !== me);
    // my own battle / challenge
    if (mine) {
        const sec = mk("section", "vt-card vt-bmine");
        const opp = seatsOf(mine).filter(p => p !== me).map(p => x.pName(rd, p)).join(", ");
        if (mine.st === "live") { sec.append(mk("b", null, "⚔ You're battling " + opp), btn("Return to the battle", "alt", () => cvReturn(mine.bid))); }
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
        tags.appendChild(mk("span", "tag vt-loc loc-" + (busy && busy.st === "live" ? "b" : loc), busy && busy.st === "live" ? "⚔ In a battle" : busy ? "Challenge pending" : LOC[loc] || LOC.l));
        if (!deck) tags.appendChild(mk("span", "tag off", "No deck yet"));
        card.appendChild(tags); cell.appendChild(card);
        if (!isMe) {
            cell.setAttribute("aria-pressed", String(chal.has(p))); cell.setAttribute("aria-label", (chal.has(p) ? "Picked: " : "Pick ") + (n.name || "Player " + p));
            cell.disabled = !!busy;
            cell.onclick = () => { if (chal.has(p)) chal.delete(p); else if (chal.size + 2 > BATTLE.ffa.max) { toast("A battle holds up to " + BATTLE.ffa.max + " players."); return; } else chal.add(p); sfx("toggle"); H.rerender(); };
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
    if (mine) sec.appendChild(mk("small", "vt-rule", "One battle at a time: finish or cancel yours first."));
    v.appendChild(sec);
    // live battles in the room
    const live = all.filter(b => b.st === "live" && b.s);
    const ls = mk("section", "vt-card vt-blive"); ls.appendChild(mk("header", "vt-ch")).append(mk("b", null, "Live battles"), mk("small", null, live.length ? live.length + " running" : "none right now"));
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
    v.appendChild(mk("p", "vt-rule", "Challenges expire after " + ((BATTLE.challenge || {}).expireSeconds || 60) + " s. The host's lobby settings set the pick timer (" + (Number(rd.cvTimer) || BATTLE.pickSeconds) + " s). Battles pay placement coins like every mode; the cards you played count toward their Veteran mark (" + DECK.veteranWins + " wins). Practice never pays. You can go back to the lobby at any time."));
    return v;
}
/* what each tab reads from the room: the page only redraws a tab when this changes */
export function roomSig(tab, d) {
    if (!d) return "";
    const x = X ? (H ? X() : null) : null;
    if (tab === "battle") {
        const slots = x && x.activeSlots ? x.activeSlots(d) : [];
        return JSON.stringify([slots.map(p => { const n = d["player" + p] || {}; return [p, n.name, n.col, n.sf, n.bg, n.ttl, n.lvl, n.uc, n.ts, n.av && (n.av.u || n.av.g || (n.av.d || "").length)]; }),
            d.vloc || {}, Object.keys(d.cvDeck || {}).filter(k => arrv((d.cvDeck[k] || {}).cards).length === 10), d.cvTimer,
            Object.entries(d.cvb || {}).map(([k, b]) => [k, b && b.st, Object.keys((b && b.acc) || {}).length, b && b.s && b.s.round])]);
    }
    if (tab === "collection") return JSON.stringify([colView, Object.entries(d.trades || {}).map(([k, t]) => [k, t && t.st]), colView === "trade" ? Object.values(d.binder || {}).map(b => String(b).length) : 0, x && x.activeSlots ? x.activeSlots(d) : []]);
    return "";
}

/* =========================== TRADES (cards only, friends in the same room) =========================== */
const pk = p => "p" + p;
let tradeWith = 0, tGive = [], tGet = [], roomData = null;
const others = () => { const x = X(); if (!x.room || !x.room() || !roomData) return []; return x.activeSlots(roomData).filter(p => p !== x.me()); };
function canTrade() { return others().length > 0; }
const binderOf = p => String(((roomData || {}).binder || {})[pk(p)] || "").split(",").filter(Boolean).map(s => { const [id, h] = s.split(":"); return { id: Number(id), h: Number(h) || 0 }; }).filter(x => CARDS[x.id]);
const trades = () => Object.entries((roomData || {}).trades || {}).map(([tid, t]) => Object.assign({ tid }, t, { give: arrv(t.give), get: arrv(t.get) }));
const arrv = v => Array.isArray(v) ? v : v ? Object.values(v) : [];
function incomingCount() { const me = X().me && X().me(); return trades().filter(t => Number(t.to) === me && t.st === "open").length; }
function tradeView() {
    const w = W(), x = X(), me = x.me(), v = mk("div", "vt-trade");
    v.appendChild(btn("‹ Back to the book", "ghost sm", () => { colView = "book"; H.rerender(); }));
    const mine = trades().filter(t => Number(t.from) === me || Number(t.to) === me).filter(t => ["open", "accepted", "a-done"].includes(t.st));
    if (mine.length) {
        const sec = mk("section", "vt-card"); sec.appendChild(mk("b", null, "Offers"));
        mine.forEach(t => {
            const inc = Number(t.to) === me, row = mk("div", "vt-offer");
            row.appendChild(mk("small", null, inc ? x.pName(roomData, Number(t.from)) + " offers you:" : "You offer " + x.pName(roomData, Number(t.to)) + ":"));
            const g = mk("div", "vt-ocards"); (inc ? t.give : t.give).forEach(c => g.appendChild(cardEl(c.id, { size: "xs", holo: !!c.h })));
            const r = mk("div", "vt-ocards"); t.get.forEach(c => r.appendChild(cardEl(c.id, { size: "xs", holo: !!c.h })));
            row.append(g, mk("small", null, inc ? "for your:" : "for their:"), r);
            const b = mk("div", "vt-row");
            if (t.st !== "open") b.appendChild(mk("small", "vt-rule", "Swapping…"));
            else if (inc) { b.append(btn("Accept", "alt sm", () => acceptTrade(t)), btn("Decline", "ghost sm", () => setTrade(t.tid, "declined"))); }
            else b.appendChild(btn("Cancel offer", "ghost sm", () => setTrade(t.tid, "cancelled")));
            row.appendChild(b); sec.appendChild(row);
        });
        v.appendChild(sec);
    }
    const ps = mk("div", "vt-row"); ps.appendChild(mk("small", null, "Trade with:"));
    others().forEach(p => { const b = mk("button", "chip-btn" + (tradeWith === p ? " on" : ""), x.pName(roomData, p)); b.type = "button"; b.onclick = () => { tradeWith = p; tGive = []; tGet = []; H.rerender(); }; ps.appendChild(b); });
    v.appendChild(ps);
    if (!tradeWith || !others().includes(tradeWith)) { v.appendChild(mk("p", "vt-rule", "Pick a friend in this room. You choose up to " + TRADE.maxCards + " of your cards and up to " + TRADE.maxCards + " of theirs; they accept or decline. Cards only: cosmetics can't be traded.")); return v; }
    const theirs = binderOf(tradeWith);
    const col = (title, list, sel, max) => {
        const s = mk("section", "vt-card vt-tcol"); s.appendChild(mk("b", null, title + " (" + sel.length + "/" + max + ")"));
        const g = mk("div", "vt-cgrid tiny");
        list.forEach(c => {
            const on = sel.some(x2 => x2.id === c.id && x2.h === c.h), el = cardEl(c.id, { size: "xs", holo: !!c.h }); if (on) el.classList.add("picked");
            if (c.dim) el.classList.add("dim");
            el.onclick = () => { const i = sel.findIndex(x2 => x2.id === c.id && x2.h === c.h); if (i >= 0) sel.splice(i, 1); else if (sel.length < max) sel.push({ id: c.id, h: c.h }); H.rerender(); };
            g.appendChild(el);
        });
        if (!list.length) g.appendChild(mk("p", "vt-rule", "Nothing to show."));
        s.appendChild(g); return s;
    };
    const myList = ownedIds(w).flatMap(id => { const c = w.cards[id]; return [c.n ? { id, h: 0 } : null, c.h ? { id, h: 1 } : null].filter(Boolean); }).sort((a, b) => CARDS[b.id].r - CARDS[a.id].r);
    const theirList = theirs.map(c => Object.assign({}, c, { dim: owned(w, c.id) ? 1 : 0 })).sort((a, b) => a.dim - b.dim || CARDS[b.id].r - CARDS[a.id].r);
    if (!theirs.length) v.appendChild(mk("p", "vt-rule", x.pName(roomData, tradeWith) + "'s collection hasn't arrived yet (they need this version of the game)."));
    const two = mk("div", "vt-tcols"); two.append(col("You give", myList, tGive, TRADE.maxCards), col("You get from " + x.pName(roomData, tradeWith), theirList, tGet, TRADE.maxCards));
    v.appendChild(two);
    v.appendChild(mk("p", "vt-rule", "Dimmed cards are ones you already own (you'd get shards for them)."));
    v.appendChild(btn("Send offer", "alt", sendOffer));
    return v;
}
async function sendOffer() {
    const x = X(); if (!tGive.length && !tGet.length) { toast("Pick at least one card."); return; }
    const tid = "t" + Date.now().toString(36) + x.me();
    const r = await H.act("tradelock:" + tid, "tradelock", w => lockTrade(w, tid, tGive));
    if (!r.ok) { toast(r.error); return; }
    await x.update(x.ref(x.db, "rooms/" + x.room() + "/trades/" + tid), { from: x.me(), to: tradeWith, give: tGive, get: tGet, st: "open", at: Date.now() });
    tGive = []; tGet = []; toast("Offer sent"); sfx("ready"); H.rerender();
}
async function acceptTrade(t) {
    const x = X(), p = tradeProblem(W(), t.get);
    if (p) { toast(p); return; }
    const r = await H.act("tradelock:" + t.tid, "tradelock", w => lockTrade(w, t.tid, t.get));
    if (!r.ok) { toast(r.error); return; }
    await x.runTransaction(x.ref(x.db, "rooms/" + x.room() + "/trades/" + t.tid + "/st"), cur => cur === "open" ? "accepted" : undefined);
    sfx("ready");
}
function setTrade(tid, st) { const x = X(); return x.runTransaction(x.ref(x.db, "rooms/" + x.room() + "/trades/" + tid + "/st"), cur => cur === "open" ? st : undefined); }
/* every room update: publish my binder, run my side of the trades */
let binderSent = "", binderT = 0;
const tradeSeen = new Set();
export function roomSync(d) {
    roomData = d; const x = X && H ? X() : null; if (!x || !x.room || !x.room() || !d) return;
    const me = x.me(), w = W();
    const binder = ownedIds(w).flatMap(id => { const c = w.cards[id]; return [c.n ? id + ":0" : null, c.h ? id + ":1" : null].filter(Boolean); }).join(",");
    const key = x.room() + "|" + binder;
    if (binderSent !== key && (d.binder || {})[pk(me)] !== binder) { clearTimeout(binderT); binderT = setTimeout(() => { binderSent = key; x.update(x.ref(x.db, "rooms/" + x.room() + "/binder"), { [pk(me)]: binder }).catch(() => {}); }, 800); }
    trades().forEach(t => {
        const from = Number(t.from), to = Number(t.to), k = t.tid + ":" + t.st;
        if (to === me && t.st === "open" && !tradeSeen.has(k)) { tradeSeen.add(k); x.toast(x.pName(d, from) + " sent you a card trade offer: Collection › Trade with friends"); }
        if (from === me && t.st === "accepted" && !tradeSeen.has(k)) {
            tradeSeen.add(k);
            setTimeout(async () => {
                const r = await H.act("trade:" + t.tid, "trade", (w2, xx) => applyTrade(w2, t.tid, t.give, t.get, x.pName(d, to) + " (trade)", xx.now));
                if (r.ok) { await x.runTransaction(x.ref(x.db, "rooms/" + x.room() + "/trades/" + t.tid + "/st"), cur => cur === "accepted" ? "a-done" : undefined); if (!r.dup) { x.toast("Trade done with " + x.pName(d, to)); x.sfx("coin"); } }
                else { x.toast("Trade failed: " + r.error); await setTrade(t.tid, "cancelled"); }
                H.rerender();
            }, 0);
        }
        if (to === me && t.st === "a-done" && !tradeSeen.has(k)) {
            tradeSeen.add(k);
            setTimeout(async () => {
                const r = await H.act("trade:" + t.tid, "trade", (w2, xx) => applyTrade(w2, t.tid, t.get, t.give, x.pName(d, from) + " (trade)", xx.now));
                if (r.ok) { await x.runTransaction(x.ref(x.db, "rooms/" + x.room() + "/trades/" + t.tid + "/st"), cur => cur === "a-done" ? "done" : undefined); if (!r.dup) { x.toast("Trade done with " + x.pName(d, from)); x.sfx("coin"); } }
                H.rerender();
            }, 0);
        }
        if ((t.st === "declined" || t.st === "cancelled") && (from === me || to === me) && (W().locks || {})[t.tid] && !tradeSeen.has(k)) {
            tradeSeen.add(k);
            setTimeout(() => H.act("tradeunlock:" + t.tid + ":" + t.st, "tradelock", w2 => unlockTrade(w2, t.tid)).then(() => H.rerender()), 0);
            if (from === me && t.st === "declined") x.toast(x.pName(d, to) + " declined your trade.");
        }
    });
}
