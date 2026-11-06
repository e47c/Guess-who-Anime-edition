/* =====================================================================
   ARCADE VAULT · TABS: Shop (skins, scratch cards, wardrobe), Packs, Collection (book + trades), Deck, Battle.
   Every action is an intent sent to the bank (bank.apply with an operation id), so a double click or a second tab
   can never pay twice; the button's operation id only changes after the action went through.
   ===================================================================== */
import { SKINS, SCRATCH, PACKS, SHARDS, RARITY_ORDER, DECK, TRADE, BATTLE } from "./config.js?v=3";
import { SKIN_ITEMS, SCRATCH_ITEMS, KIND_NAME, itemById, owns, bundlePrice, buySkin, buyBundle, rollScratch, equip, publicLook } from "./shop.js?v=1";
import { rollPack, unopened, markOpened, owned, isHolo, ownedIds, seriesDone, saveDeck, deleteDeck, setActiveDeck, activeDeck, deckProblem, veteran, lockTrade, unlockTrade, applyTrade, tradeProblem } from "./packs.js?v=1";
import { CARDS, BY_SERIES, CARD_SERIES, CARD_COUNT, RARITY_NAMES, ARCHETYPES, TOTAL_CARDS } from "./carddb.js?v=1";
import { cardEl, packEl, theme } from "./cardui.js?v=1";
import { openPack, inspect, holdToInspect } from "./opening.js?v=1";
import { motionOK } from "../fx.js";

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
    const f = { shop: shopTab, packs: packsTab, collection: collectionTab, deck: deckTab, battle: battleTab }[id];
    if (f) body.appendChild(f());
}
const sub = (name, list, cur, onPick) => {
    const nav = mk("div", "vt-sub"); nav.setAttribute("role", "tablist"); nav.setAttribute("aria-label", name);
    list.forEach(([k, l]) => { const b = mk("button", "vt-subtab" + (k === cur ? " on" : ""), l); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(k === cur)); b.onclick = () => { sfx("toggle"); onPick(k); }; nav.appendChild(b); });
    return nav;
};

/* =========================== SHOP =========================== */
let shopView = "skins", previewTier = "", previewKind = "both";
function lookWith(over) {
    const pub = Object.assign({}, X().profilePub ? X().profilePub() : {}), look = publicLook(W());
    return Object.assign(pub, look, over || {});
}
/* the exact lobby seat: same avatarEl, size, name plate and title as the lobby draws */
function seatPreview(p, label) {
    const wrap = mk("div", "vt-seatwrap"), s = mk("div", "seat me vt-seat"); s.style.setProperty("--pc", p.col || "#e11b1b");
    s.append(mk("span", "seat-no", "1P"), X().avatarEl(p, { size: 72, badge: true }));
    const id = mk("div", "seat-id"), b = mk("b", null, p.name || "Player"), sm = mk("small"), t = mk("span", null, p.ttl || "Rookie");
    X().styleName && X().styleName(b, p); X().styleTitle && X().styleTitle(t, p);
    sm.append(t, document.createTextNode(p.lvl ? " · LV " + p.lvl : "")); id.append(b, sm); s.appendChild(id);
    wrap.append(s, mk("small", "vt-seatcap", label || "This is exactly how you look in the lobby."));
    return wrap;
}
function shopTab() {
    const box = mk("div", "vt-shop");
    box.appendChild(sub("Shop", [["skins", "Season 1 skins"], ["scratch", "Scratch cards"], ["wardrobe", "Wardrobe"]], shopView, k => { shopView = k; H.rerender(); }));
    if (shopView === "skins") box.appendChild(skinsView());
    if (shopView === "scratch") box.appendChild(scratchView());
    if (shopView === "wardrobe") box.appendChild(wardrobeView());
    return box;
}
function skinsView() {
    const w = W(), v = mk("div", "vt-skins"), T = SKINS.tiers;
    if (!previewTier) previewTier = (T.find(t => !owns(w, "sf_" + t.id)) || T[0]).id;
    const t0 = T.find(t => t.id === previewTier);
    const over = previewKind === "frame" ? { sf: t0.id } : previewKind === "bg" ? { bg: t0.id } : { sf: t0.id, bg: t0.id };
    const top = mk("div", "vt-skintop");
    top.appendChild(seatPreview(lookWith(over), "Preview: " + t0.name + (previewKind === "frame" ? " Frame" : previewKind === "bg" ? " Background" : " Frame + Background") + ", exactly as it looks in the lobby."));
    const pk = mk("div", "vt-pk"); [["both", "Both"], ["frame", "Frame"], ["bg", "Background"]].forEach(([k, l]) => { const b = mk("button", "chip-btn" + (previewKind === k ? " on" : ""), l); b.type = "button"; b.onclick = () => { previewKind = k; H.rerender(); }; pk.appendChild(b); });
    top.appendChild(pk);
    v.appendChild(top);
    const grid = mk("div", "vt-tiers");
    T.forEach(t => {
        const fId = "sf_" + t.id, bId = "bg_" + t.id, of = owns(w, fId), ob = owns(w, bId), earn = SKINS.earnOnly.includes(t.id);
        const c = mk("article", "vt-tier tier-" + t.id + (t.id === previewTier ? " on" : ""));
        const prev = mk("button", "vt-tprev"); prev.type = "button"; prev.setAttribute("aria-label", "Preview " + t.name);
        prev.appendChild(X().avatarEl(lookWith({ sf: t.id, bg: t.id }), { size: 58 })); prev.onclick = () => { previewTier = t.id; sfx("pick"); H.rerender(); };
        const h = mk("header"); h.append(mk("b", null, t.name), mk("small", null, (t.animated ? "Animated · " : "Static shine · ") + "Season " + SKINS.season));
        const row = mk("div", "vt-tbuy");
        const buyOne = (id, label, price, own) => {
            if (own) return mk("span", "vt-owned", label + " ✓");
            if (earn) return mk("span", "vt-owned", label + ": earn only");
            const b = btn("", "ghost sm", () => doBuySkin(id)); b.append(mk("small", null, label), coin(price)); return b;
        };
        row.append(buyOne(fId, "Frame", t.price, of), buyOne(bId, "Background", t.price, ob));
        if (!of && !ob && !earn) { const b = btn("", "alt sm", () => doBundle(t.id)); b.append(mk("small", null, "Bundle −" + Math.round(SKINS.bundleOff * 100) + "%"), coin(bundlePrice(t.id))); row.appendChild(b); }
        c.append(prev, h, row); grid.appendChild(c);
    });
    v.appendChild(grid);
    v.appendChild(mk("p", "vt-rule", "Each tier comes as a Frame (the ring around your picture) and a Background (inside the circle, behind your picture). Buying both together is " + Math.round(SKINS.bundleOff * 100) + "% off. Cosmetics can't be traded or gifted; if you ever get one twice (future rewards), it refunds " + Math.round(SKINS.dupRefund * 100) + "% of its price."));
    return v;
}
async function doBuySkin(id) {
    const it = itemById(id); if (!(await ask({ title: "Buy " + it.name + "?", text: fmt(it.price) + " AAP Coins. You have " + fmt(W().coins) + ".", ok: "Buy" }))) return;
    const r = await H.act("buy:" + id, "skin", w => buySkin(w, id));
    if (!r.ok) { toast(r.error); return; }
    sfx("coin"); offerEquip([id]);
}
async function doBundle(tier) {
    const t = SKINS.tiers.find(x => x.id === tier); if (!(await ask({ title: "Buy the " + t.name + " bundle?", text: "Frame + Background for " + fmt(bundlePrice(tier)) + " AAP Coins (instead of " + fmt(t.price * 2) + ").", ok: "Buy" }))) return;
    const r = await H.act("bundle:" + tier, "bundle", w => buyBundle(w, tier));
    if (!r.ok) { toast(r.error); return; }
    sfx("coin"); offerEquip(r.result.items);
}
async function offerEquip(ids) {
    H.rerender();
    if (await ask({ title: "Equip it now?", text: ids.map(id => itemById(id).name).join(" + "), ok: "Equip", cancel: "Later" })) { for (const id of ids) await doEquip(itemById(id).slot, id); }
}
async function doEquip(slot, id) {
    const r = await H.act("equip:" + slot + ":" + (id || "none") + ":" + Date.now(), "equip", w => equip(w, slot, id));
    if (!r.ok) { toast(r.error); return; }
    H.setLook(); sfx("pick"); H.rerender();
}
function wardrobeView() {
    const w = W(), v = mk("div", "vt-ward");
    v.appendChild(seatPreview(lookWith({}), "Your current look in the lobby."));
    const groups = [["sf", "Frames", SKIN_ITEMS.filter(i => i.kind === "frame")], ["bg", "Backgrounds", SKIN_ITEMS.filter(i => i.kind === "bg")], ["title", "Titles", SCRATCH_ITEMS.filter(i => i.kind === "title")],
        ["ts", "Title skins", SCRATCH_ITEMS.filter(i => i.kind === "tskin")], ["uc", "Username styles", SCRATCH_ITEMS.filter(i => i.kind === "ucol")], ["sleeve", "Card sleeves", CARD_SERIES.map(s => itemById("sl_" + s))]];
    groups.forEach(([slot, name, list]) => {
        const sec = mk("section", "vt-card"), have = list.filter(i => owns(w, i.id)), cur = (w.equip || {})[slot] || "";
        const h = mk("header", "vt-ch"); h.append(mk("b", null, name), mk("small", null, have.length + " / " + list.length + " owned"));
        sec.appendChild(h);
        const row = mk("div", "pill-list vt-pills");
        const none = mk("button", "pill" + (!cur ? " on" : ""), slot === "title" ? "Level title" : "None"); none.type = "button"; none.onclick = () => doEquip(slot, ""); row.appendChild(none);
        have.forEach(i => {
            const b = mk("button", "pill" + (cur === i.id ? " on" : "")); b.type = "button";
            const label = mk("span", null, slot === "sleeve" ? theme(i.series).label : i.name.replace(/ - Season \d+$/, "").replace(/ (Frame|Background)$/, ""));
            if (slot === "uc") label.classList.add("uc", "uc-" + i.id.slice(3)); if (slot === "ts") label.classList.add("ts", "ts-" + i.id.slice(3));
            b.appendChild(label); if (i.rarity) b.title = i.rarity; b.onclick = () => doEquip(slot, i.id); row.appendChild(b);
        });
        sec.appendChild(row);
        if (!have.length) sec.appendChild(mk("p", "vt-rule", slot === "sleeve" ? "Complete a series in your collection to unlock its sleeve: it reskins the back of all your cards." : slot === "sf" || slot === "bg" ? "Buy them in Season 1 skins." : "Win them from scratch cards."));
        v.appendChild(sec);
    });
    return v;
}

/* ---------- scratch cards ---------- */
function scratchView() {
    const v = mk("div", "vt-scratch");
    Object.entries(SCRATCH.tiers).forEach(([k, T]) => {
        const c = mk("article", "vt-sct t-" + k);
        const face = mk("div", "sc-face t-" + k); face.append(mk("b", null, T.name.toUpperCase()), mk("small", null, "SCRATCH CARD"));
        const odds = Object.entries(T.odds).filter(([, p]) => p > 0).map(([r, p]) => r[0].toUpperCase() + r.slice(1) + " " + p + "%").join(" · ");
        const types = Object.keys(T.types).map(t => KIND_NAME[t] + "s").join(", ");
        c.append(face, mk("p", "vt-rule", "Wins one of: " + types + "."), mk("small", "vt-odds", odds));
        const b = btn("", "alt sm", () => doScratch(k)); b.append(mk("small", null, "Buy & scratch"), coin(T.price)); c.appendChild(b);
        v.appendChild(c);
    });
    v.appendChild(mk("p", "vt-rule", "The prize is decided the moment you buy (and saved), the scratching only reveals it. Already own it? You get coins back: Common " + SCRATCH.dupRefund.common + ", Rare " + SCRATCH.dupRefund.rare + ", Epic " + SCRATCH.dupRefund.epic + ", Legendary " + SCRATCH.dupRefund.legendary + "."));
    return v;
}
async function doScratch(tier) {
    const k = "scratch-" + tier, op = intent(k), seed = H.newSeed();
    const r = await H.act(op, "scratch", w => rollScratch(w, tier, seed));
    if (!r.ok) { toast(r.error); return; }
    used(k); H.event("scratch", "ev:" + op); scratchReveal(r.result);
}
function prizeEl(res) {
    const it = itemById(res.item), p = mk("div", "sc-prize r-" + res.rarity);
    p.append(mk("small", "sc-kind", KIND_NAME[res.kind] + " · " + res.rarity.toUpperCase()));
    const name = mk("b", "sc-name", it.name);
    if (res.kind === "ucol") name.classList.add("uc", "uc-" + it.id.slice(3)); if (res.kind === "tskin") name.classList.add("ts", "ts-" + it.id.slice(3));
    p.appendChild(name);
    p.appendChild(mk("small", "sc-sub", res.dup ? "Duplicate: +" + res.refund + " coins back" : "New! It's in your Wardrobe."));
    return p;
}
function scratchReveal(res) {
    const ov = mk("div", "sc-over"); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Scratch card");
    const card = mk("div", "sc-card t-" + res.tier), prize = prizeEl(res), cv = mk("canvas", "sc-coat");
    card.append(prize, cv);
    const all = btn("Reveal all", "ghost sm"), close = btn("Done", "sm");
    const bar = mk("div", "vt-row"); bar.append(all, close); close.classList.add("hidden");
    const equipB = btn("Equip it", "alt sm"); equipB.classList.add("hidden"); bar.appendChild(equipB);
    ov.append(mk("p", "sc-tip", "Scratch the silver with your finger or mouse"), card, bar);
    document.body.appendChild(ov);
    const it = itemById(res.item);
    requestAnimationFrame(() => {
        const r = card.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr;
        const g = cv.getContext("2d"); g.scale(dpr, dpr);
        const grad = g.createLinearGradient(0, 0, r.width, r.height); grad.addColorStop(0, "#d9dde3"); grad.addColorStop(.5, "#9aa3ad"); grad.addColorStop(1, "#e6e9ee");
        g.fillStyle = grad; g.fillRect(0, 0, r.width, r.height);
        g.fillStyle = "rgba(60,60,70,.55)"; g.font = "700 " + Math.round(r.width / 13) + "px sans-serif"; g.textAlign = "center"; g.fillText("SCRATCH HERE", r.width / 2, r.height / 2 + 6);
        for (let i = 0; i < 220; i++) { g.fillStyle = "rgba(255,255,255," + (Math.random() * .25) + ")"; g.fillRect(Math.random() * r.width, Math.random() * r.height, 2, 2); }
        g.globalCompositeOperation = "destination-out";
        let down = false, moves = 0, last = null, revealed = false;
        const at = e => { const b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
        const scratch = p => { g.lineWidth = Math.max(26, r.width / 9); g.lineCap = "round"; g.beginPath(); g.moveTo((last || p).x, (last || p).y); g.lineTo(p.x, p.y); g.stroke(); last = p; if (++moves % 6 === 0) { sfx("scratch"); check(); } };
        const check = () => {
            const d = g.getImageData(0, 0, cv.width, cv.height).data; let clear = 0, n = 0;
            for (let i = 3; i < d.length; i += 4 * 37) { n++; if (d[i] < 40) clear++; }
            if (clear / n > .55) reveal();
        };
        const reveal = () => { if (revealed) return; revealed = true; cv.classList.add("gone"); all.classList.add("hidden"); close.classList.remove("hidden"); if (!res.dup && ["title", "ts", "uc"].includes(it.slot)) equipB.classList.remove("hidden"); sfx(res.rarity === "legendary" ? "legendary" : res.rarity === "epic" ? "epicHit" : "reveal"); };
        cv.addEventListener("pointerdown", e => { down = true; last = null; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); scratch(at(e)); });
        cv.addEventListener("pointermove", e => { if (down) scratch(at(e)); });
        cv.addEventListener("pointerup", () => { down = false; last = null; check(); });
        all.onclick = reveal;
        if (!motionOK()) all.textContent = "Reveal";
    });
    const done = () => { ov.remove(); H.rerender(); };
    close.onclick = done;
    equipB.onclick = async () => { await doEquip(it.slot, it.id); done(); };
    setTimeout(() => all.focus(), 50);
}

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
    X().closeOverlay && X().closeOverlay("vault");
    openPack(res, {
        onDone: () => { H.act("opened:" + res.seed, "opened", w => markOpened(w, res.seed)).then(() => { X().openOverlay && X().openOverlay("vault"); H.rerender(); }); },
        onNext: W().coins >= PACKS[res.kind].price ? { label: "Open another (" + PACKS[res.kind].price + " coins)", fn: () => { H.act("opened:" + res.seed, "opened", w => markOpened(w, res.seed)).then(() => doPack(res.series, res.kind, "coins")); } } : null
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
    v.appendChild(mk("p", "vt-rule", "Tap a card to inspect it (drag to tilt, tap to turn it over). A completed series gets a gold edge and unlocks its card sleeve. Duplicates from packs turn into shards automatically."));
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
        const row = mk("div", "vt-dkrow"); d.cards.forEach(id => { const el = cardEl(id, { size: "xs", holo: isHolo(w, id) }); el.onclick = () => inspect(id, { holo: isHolo(w, id) }); row.appendChild(el); });
        const btns = mk("div", "vt-row");
        if (!(act && act.id === d.id)) btns.appendChild(btn("Use in battles", "alt sm", async () => { await H.act("deckuse:" + d.id + ":" + Date.now(), "deck", w2 => setActiveDeck(w2, d.id)); sfx("pick"); H.rerender(); }));
        btns.appendChild(btn("Edit", "ghost sm", () => { editing = { id: d.id, name: d.name, cards: d.cards.slice() }; H.rerender(); }));
        if (d.id !== "starter" || (w.decks || []).length > 1) btns.appendChild(btn("Delete", "ghost sm", async () => { if (await ask({ title: "Delete " + d.name + "?", text: "The cards stay in your collection.", ok: "Delete", danger: true })) { await H.act("deckdel:" + d.id + ":" + Date.now(), "deck", w2 => deleteDeck(w2, d.id)); H.rerender(); } }));
        c.append(h, row, btns); v.appendChild(c);
    });
    if ((w.decks || []).length < DECK.maxDecks) v.appendChild(btn("+ New deck", "alt", () => { editing = { id: "", name: "Deck " + ((w.decks || []).length + 1), cards: [] }; H.rerender(); }));
    v.appendChild(mk("p", "vt-rule", "A deck is exactly " + DECK.size + " different cards. Everyone starts with a free Starter Deck; open packs for more. Your active deck is the one you bring to Anime Card Vault battles."));
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

/* =========================== BATTLE =========================== */
function battleTab() {
    const w = W(), v = mk("div", "vt-battle"), d = activeDeck(w), bad = d ? deckProblem(w, d.cards) : "No deck";
    const hero = mk("section", "vt-card vt-bhero");
    hero.append(mk("b", "vt-btitle", "Anime Card Vault"), mk("p", "vt-rule", "Pick a card in secret, reveal together, clash: damage = your Power minus their Defense, then the abilities. 1v1: 20 life, 10 cards, hand of 4. Free-for-all (3-8): 25 life, pick a target too. Last one standing wins; if every card is played, the higher life wins."));
    const rec = w.battles || { p: 0, w: 0 }; hero.appendChild(mk("small", "vt-brec", "Your record: " + rec.w + " wins / " + rec.p + " battles"));
    v.appendChild(hero);
    const dk = mk("section", "vt-card"); const h = mk("header", "vt-ch"); h.append(mk("b", null, "Your deck: " + (d ? d.name : "none")), mk("small", null, bad || "Ready"));
    dk.appendChild(h);
    if (d) { const row = mk("div", "vt-dkrow"); d.cards.forEach(id => row.appendChild(cardEl(id, { size: "xs", holo: isHolo(w, id) }))); dk.appendChild(row); }
    dk.appendChild(btn("Change deck", "ghost sm", () => H.open("deck")));
    v.appendChild(dk);
    const go = mk("div", "vt-row vt-bgo");
    const prac = btn("Practice vs CPU", "alt", () => { if (bad) { toast(bad); return; } X().closeOverlay("vault"); X().startPractice && X().startPractice(); });
    go.appendChild(prac);
    const x = X();
    if (x.inRoom && x.inRoom()) {
        if (x.amHost && x.amHost()) go.appendChild(btn("Switch this room to Anime Card Vault", "", () => { x.closeOverlay("vault"); x.setGameType("cv"); }));
        else go.appendChild(mk("small", "vt-rule", "In a room: ask the host to pick Anime Card Vault in the lobby."));
    } else go.appendChild(btn("Challenge a friend", "", () => { x.closeOverlay("vault"); x.hostMode && x.hostMode("cardvault"); }));
    v.appendChild(go);
    v.appendChild(mk("p", "vt-rule", "Practice battles never pay coins. Room battles with 2+ players pay like every other mode (placement coins), the cards you played count toward their Veteran mark (" + DECK.veteranWins + " wins), and the host can turn on \"Winner picks a free pack\"."));
    return v;
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
        if (to === me && t.st === "open" && !tradeSeen.has(k)) { tradeSeen.add(k); x.toast(x.pName(d, from) + " sent you a card trade offer: Vault › Collection › Trade"); }
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
