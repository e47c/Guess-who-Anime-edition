/* =====================================================================
   ANIME TCG · PACKS STORE
   A rail of the 18 series (progress ring each). The selected series gets a showcase: its Normal and Premium packs side
   by side, large, floating, lit by the pointer; Buy & open, Open x5 (one by one, or a quick summary of all five), and
   the craft-with-shards price. Under it the detail panel: odds per rarity (config PACKS), the pity counters as bars,
   "cards you still need", and the series' card pool (owned cards, silhouettes for the missing ones).
   Roll logic, odds, prices, pity and shards are unchanged (js/vault/packs.js rollPack). Every purchase is an intent
   (bank.apply with an operation id), so a double tap can never pay twice.
   ===================================================================== */
import { PACKS, SHARDS, RARITY_ORDER } from "./config.js?v=14";
import { rollPack, unopened, markOpened, owned, isHolo } from "./packs.js?v=12";
import { CARDS, BY_SERIES, CARD_SERIES, CARD_COUNT, RARITY_NAMES } from "./carddb.js?v=5";
import { cardEl, packEl, theme, bindShine, preloadArt } from "./cardui.js?v=13";
import { openPack, inspect } from "./opening.js?v=13";
import { icon, RARITY_ICON } from "./icons.js?v=2";

const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const btn = (txt, cls, fn, ic) => { const b = mk("button", "btn " + (cls || "")); b.type = "button"; if (ic) b.innerHTML = icon(ic); b.appendChild(document.createTextNode(txt)); if (fn) b.onclick = fn; return b; };
const fmt = n => Math.round(n).toLocaleString("en-US");
const coinTag = n => { const s = mk("span", "tp-price"); s.innerHTML = icon("coin"); s.appendChild(mk("b", null, fmt(n))); return s; };
const shardTag = n => { const s = mk("span", "tp-price sh"); s.innerHTML = icon("shard"); s.appendChild(mk("b", null, fmt(n))); return s; };
let H = null;
const X = () => H.x(), W = () => H.bank.get(), sfx = n => X().sfx(n), toast = t => X().toast(t);
const ask = o => (X().uiConfirm ? X().uiConfirm(o) : Promise.resolve(confirm(o.text || o.title)));
const intents = {};
const intent = k => intents[k] || (intents[k] = k + ":" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
const used = k => { delete intents[k]; };
let sel = "", detail = "normal";
try { sel = localStorage.getItem("aap_tcg_series") || ""; } catch (e) {}

export function packsTab(h) {
    H = h; const w = W(); if (!CARD_SERIES.includes(sel)) sel = CARD_SERIES[0];
    const v = mk("div", "tp");
    const head = mk("div", "tcg-h"), hl = mk("div");
    const h2 = mk("h2"); h2.innerHTML = icon("packs"); h2.appendChild(document.createTextNode("Packs Store"));
    hl.append(h2, mk("p", null, "Pick a series, then a pack. Normal: " + PACKS.normal.cards + " cards. Premium: " + PACKS.premium.cards + " cards with a Rare or better guaranteed. A pack only holds cards from its own series."));
    const pills = mk("div", "tcg-actions");
    const p1 = mk("span", "tcg-pill"); p1.innerHTML = icon("shard"); p1.appendChild(document.createTextNode(fmt(w.shards || 0) + " shards")); pills.appendChild(p1);
    const tok = Number((w.tokens || {}).normal) || 0;
    if (tok) { const p2 = mk("span", "tcg-pill gold"); p2.innerHTML = icon("gift"); p2.appendChild(document.createTextNode(tok + " free pack" + (tok > 1 ? "s" : ""))); pills.appendChild(p2); }
    head.append(hl, pills); v.appendChild(head);
    // packs bought but not revealed yet (closed the page mid-opening)
    const un = unopened(w);
    if (un.length) {
        const u = mk("div", "vt-card tp-unopened"); const ul = mk("b"); ul.innerHTML = icon("gift"); ul.appendChild(document.createTextNode("Waiting to be opened: " + un.length)); u.appendChild(ul);
        const row = mk("div", "tcg-actions"); un.forEach(p => row.appendChild(btn(theme(p.series).label + " · " + (p.kind === "premium" ? "Premium" : "Normal"), "alt sm", () => reveal(p))));
        if (un.length > 1) row.appendChild(btn("Quick summary of all", "ghost sm", () => quickSummary(un.slice())));
        u.appendChild(row); v.appendChild(u);
    }
    v.append(seriesRail(w), showcase(w), detailPanel(w));
    return v;
}

/* ---------- the series rail ---------- */
function seriesRail(w) {
    const rail = mk("div", "tp-rail"); rail.setAttribute("role", "listbox"); rail.setAttribute("aria-label", "Series");
    CARD_SERIES.forEach((s, i) => {
        const T = theme(s), have = BY_SERIES[s].filter(id => owned(w, id)).length, pct = Math.round(have / CARD_COUNT[s] * 100);
        const b = mk("button", "tp-ser" + (s === sel ? " on" : "") + (have === CARD_COUNT[s] ? " done" : "")); b.type = "button"; b.setAttribute("role", "option"); b.setAttribute("aria-selected", String(s === sel));
        ["--c1", "--c2", "--c3", "--ink"].forEach(k => b.style.setProperty(k, T[k.slice(2)]));
        const ring = mk("span", "tcg-ring-prog"); ring.style.setProperty("--p", pct); ring.style.setProperty("--rc", T.c3);
        const em = mk("i", "tp-emb"); em.innerHTML = T.emblem; ring.appendChild(em);
        b.append(ring, mk("b", "f-" + T.font, T.label), mk("small", null, have + " / " + CARD_COUNT[s]));
        b.onclick = () => { if (sel === s) return; sel = s; try { localStorage.setItem("aap_tcg_series", s); } catch (e) {} sfx("toggle"); H.rerender(); };
        b.onkeydown = e => { const k = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 1, ArrowUp: -1 }[e.key]; if (!k) return; e.preventDefault(); const n = rail.children[(i + k + CARD_SERIES.length) % CARD_SERIES.length]; n.focus(); n.click(); };
        rail.appendChild(b);
    });
    requestAnimationFrame(() => { const on = rail.querySelector(".on"); if (on && on.scrollIntoView) on.scrollIntoView({ block: "nearest", inline: "center" }); });
    return rail;
}

/* ---------- the showcase: both packs of the series, large, floating ---------- */
function showcase(w) {
    const T = theme(sel), box = mk("section", "tp-show"); box.style.setProperty("--c1", T.c1); box.style.setProperty("--c3", T.c3);
    const title = mk("div", "tp-showh"); title.append(mk("small", null, "SERIES"), mk("b", "f-" + T.font, T.label));
    box.appendChild(title);
    const pair = mk("div", "tp-pair");
    ["normal", "premium"].forEach(kind => {
        const P = PACKS[kind], col = mk("article", "tp-pk k-" + kind);
        const stage = mk("div", "tp-stage"), pk = packEl(sel, kind); pk.classList.add("tp-float"); stage.appendChild(pk); bindShine(pk, { tilt: 14 });
        stage.onclick = () => { detail = kind; H.rerender(); };
        col.appendChild(stage);
        col.appendChild(mk("b", "tp-pkname", P.name));
        col.appendChild(mk("small", "tp-pksub", P.cards + " cards" + (kind === "premium" ? " · 1 Rare+ guaranteed" : "") + " · Holo " + Math.round(P.holo * 100) + "% per card"));
        const buy = mk("div", "tp-buy");
        const b1 = btn("Buy & open ", "alt", () => doPack(sel, kind, "coins"), "packs"); b1.appendChild(coinTag(P.price)); b1.disabled = w.coins < P.price; buy.appendChild(b1);
        const b5 = btn("Open ×5 ", "", () => doFive(sel, kind), "decks"); b5.appendChild(coinTag(P.price * 5)); b5.disabled = w.coins < P.price * 5; buy.appendChild(b5);
        if (kind === "normal" && (Number((w.tokens || {}).normal) || 0) > 0) buy.appendChild(btn("Open free pack", "", () => doPack(sel, "normal", "token"), "gift"));
        col.appendChild(buy);
        if (w.coins < P.price) col.appendChild(mk("small", "tp-need", "You need " + fmt(P.price - w.coins) + " more coins. Play any mode or claim your Daily reward."));
        pair.appendChild(col);
    });
    box.appendChild(pair);
    return box;
}

/* ---------- details: odds, pity, cards you still need, the pool, shard craft ---------- */
function detailPanel(w) {
    const box = mk("section", "vt-card tp-detail"), P = PACKS[detail];
    const seg = mk("div", "tp-seg"); seg.setAttribute("role", "tablist");
    ["normal", "premium"].forEach(k => { const b = mk("button", "chip-btn" + (k === detail ? " on" : ""), PACKS[k].name + " details"); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(k === detail)); b.onclick = () => { detail = k; sfx("toggle"); H.rerender(); }; seg.appendChild(b); });
    box.appendChild(seg);
    const grid = mk("div", "tp-dgrid");
    // odds
    const odds = mk("div", "tp-odds"); odds.appendChild(mk("h3", null, "Odds per card"));
    const tbl = mk("table", "tp-otbl");
    RARITY_ORDER.forEach((r, i) => {
        const tr = mk("tr", "r-" + r), td0 = mk("td"); td0.innerHTML = icon(RARITY_ICON[i]); td0.appendChild(document.createTextNode(RARITY_NAMES[i]));
        const pct = P.odds[r], bar = mk("td", "tp-obar"), bi = mk("i"); bi.style.setProperty("--p", Math.min(100, Math.sqrt(pct) * 10) + "%"); bar.appendChild(bi);
        tr.append(td0, bar, mk("td", "tp-opct", pct + "%"), mk("td", "tp-osh", "dup " + SHARDS[r]));
        tbl.appendChild(tr);
    });
    odds.append(tbl, mk("p", "vt-rule", "Holo: " + Math.round(P.holo * 100) + "% per card; a Holo duplicate gives " + SHARDS.holoMult + "× shards." + (P.guaranteeRare ? " Every Premium pack holds a Rare or better." : "") + " A duplicate (dup) turns into the shards shown."));
    grid.appendChild(odds);
    // pity + needed + craft
    const side = mk("div", "tp-side");
    const pity = mk("div", "tp-pity"); pity.appendChild(mk("h3", null, "Pity counters"));
    ["normal", "premium"].forEach(k => {
        const Q = PACKS[k], n = Number((w.pity || {})[k]) || 0, left = Q.pity.after - n, need = RARITY_NAMES[RARITY_ORDER.indexOf(Q.pity.atLeast)];
        const row = mk("div", "tp-prow"); row.append(mk("b", null, Q.name), mk("small", null, need + " or better guaranteed within " + left + " more pack" + (left === 1 ? "" : "s")));
        const bar = mk("div", "tcg-bar"), bi = mk("i"); bi.style.setProperty("--p", (n / Q.pity.after * 100).toFixed(1) + "%"); bar.appendChild(bi); row.appendChild(bar);
        row.appendChild(mk("small", "tp-pn", n + " / " + Q.pity.after));
        pity.appendChild(row);
    });
    side.appendChild(pity);
    const have = BY_SERIES[sel].filter(id => owned(w, id)).length, miss = CARD_COUNT[sel] - have;
    const need = mk("div", "tp-need2"); need.innerHTML = icon("collection");
    need.append(mk("b", null, miss ? "Cards you still need: " + miss + " / " + CARD_COUNT[sel] : "Series complete: " + CARD_COUNT[sel] + " / " + CARD_COUNT[sel]), mk("small", null, miss ? "Every missing card is in this series' packs. Completing it unlocks its card sleeve." : "Its card sleeve is yours (Wardrobe › Card Sleeves)."));
    side.appendChild(need);
    const craft = mk("div", "tp-craft"); craft.appendChild(mk("h3", null, "Craft with shards"));
    ["normal", "premium"].forEach(k => {
        const Q = PACKS[k], row = mk("div", "tp-crow"); row.append(mk("span", null, theme(sel).label + " " + Q.name));
        const b = btn("Craft ", "sm", () => doPack(sel, k, "shards"), "shard"); b.appendChild(shardTag(Q.shards)); b.disabled = (Number(w.shards) || 0) < Q.shards; row.appendChild(b);
        craft.appendChild(row);
    });
    craft.appendChild(mk("small", "vt-rule", "You have " + fmt(w.shards || 0) + " shards. Duplicates from packs turn into shards (Collection › Duplicates)."));
    side.appendChild(craft);
    grid.appendChild(side);
    box.appendChild(grid);
    // the card pool
    const pool = mk("div", "tp-pool"); const ph = mk("div", "tp-poolh");
    ph.append(mk("h3", null, theme(sel).label + " card pool"), mk("small", null, have + " owned · " + miss + " missing (shown as silhouettes) · tap a card to inspect"));
    pool.appendChild(ph);
    const strip = mk("div", "tp-strip");
    BY_SERIES[sel].slice().sort((a, b) => CARDS[a].no.localeCompare(CARDS[b].no)).forEach(id => {
        const own = owned(w, id), cell = mk("div", "tp-cell" + (own ? " own" : " miss"));
        const el = cardEl(id, { size: "sm", holo: own && isHolo(w, id), ghost: !own });
        cell.appendChild(el);
        const tag = mk("span", "tp-tag"); tag.innerHTML = icon(own ? "check" : "lock"); tag.appendChild(document.createTextNode(own ? "Owned" : "No. " + CARDS[id].no.split("/")[0])); cell.appendChild(tag);
        if (own) { cell.tabIndex = 0; cell.onclick = () => inspect(id, { holo: isHolo(w, id) }); cell.onkeydown = e => { if (e.key === "Enter") cell.click(); }; }
        else cell.title = "Not collected yet: " + RARITY_NAMES[CARDS[id].r];
        strip.appendChild(cell);
    });
    pool.appendChild(strip);
    box.appendChild(pool);
    return box;
}

/* ---------- buying and opening ---------- */
async function buy(series, kind, via, quiet) {
    const k = "pack-" + series + "-" + kind + "-" + via, op = intent(k), seed = H.newSeed(), by = X().profileName ? X().profileName() : "";
    const r = await H.act(op, via === "shards" ? "craft" : via === "token" ? "token" : "pack", (w, x) => rollPack(w, { series, kind, seed, via, by, now: x.now }));
    if (!r.ok) { if (!quiet) toast(r.error); return null; }
    used(k); H.event("pack", "ev:" + op);
    preloadArt(r.result.cards.map(c => c.id));
    return r.result;
}
async function doPack(series, kind, via) {
    const P = PACKS[kind];
    const txt = via === "coins" ? fmt(P.price) + " AAP Coins" : via === "shards" ? fmt(P.shards) + " shards" : "your free pack";
    if (via !== "token" && !(await ask({ title: theme(series).label + " " + P.name + "?", text: txt + " · " + P.cards + " cards" + (kind === "premium" ? ", one Rare or better guaranteed" : "") + ".", ok: via === "shards" ? "Craft & open" : "Buy & open" }))) return;
    const res = await buy(series, kind, via); if (res) reveal(res);
}
async function doFive(series, kind) {
    const P = PACKS[kind];
    if (W().coins < P.price * 5) { toast("Open ×5 needs " + fmt(P.price * 5) + " coins."); return; }
    if (!(await ask({ title: "Open 5 " + theme(series).label + " " + P.name + "s?", text: fmt(P.price * 5) + " AAP Coins · " + P.cards * 5 + " cards. Each pack is rolled on its own (pity included). Reveal them one by one, or see a quick summary of all five.", ok: "Buy 5" }))) return;
    const got = [];
    for (let i = 0; i < 5; i++) { const r = await buy(series, kind, "coins", true); if (!r) break; got.push(r); }
    if (!got.length) { toast("Couldn't buy the packs."); return; }
    if (got.length < 5) toast("Bought " + got.length + " of 5 (not enough coins for the rest).");
    const how = await ask({ title: got.length + " packs ready", text: "Reveal them one by one (the full opening for each), or see every card at once?", ok: "One by one", cancel: "Quick summary" });
    if (how) revealChain(got); else quickSummary(got);
}
function revealChain(list, i = 0) {
    const res = list[i], more = i + 1 < list.length;
    openPack(res, {
        onDone: () => { H.act("opened:" + res.seed, "opened", w => markOpened(w, res.seed)).then(() => H.rerender()); },
        onNext: more ? { label: "Next pack (" + (i + 2) + " of " + list.length + ")", price: null, fn: () => revealChain(list, i + 1) } : null
    });
}
function reveal(res) {
    const P = PACKS[res.kind];
    openPack(res, {
        onDone: () => { H.act("opened:" + res.seed, "opened", w => markOpened(w, res.seed)).then(() => H.rerender()); },
        onNext: W().coins >= P.price ? { label: "Open another", price: P.price, fn: () => { H.act("opened:" + res.seed, "opened", w => markOpened(w, res.seed)).then(async () => { const r2 = await buy(res.series, res.kind, "coins"); if (r2) reveal(r2); }); } } : null
    });
}
/* every card of several packs at once: NEW tags, shards from duplicates, the best pull first */
function quickSummary(list) {
    const ov = mk("div", "tp-qs"); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Quick summary");
    const box = mk("div", "tp-qsbox");
    const all = list.flatMap(p => p.cards.map(c => Object.assign({ series: p.series }, c)));
    const shards = list.reduce((n, p) => n + (p.shards || 0), 0), fresh = all.filter(c => c.isNew).length;
    const best = all.slice().sort((a, b) => b.r - a.r || b.h - a.h)[0];
    const h = mk("div", "tcg-h"), hl = mk("div"), h2 = mk("h2"); h2.innerHTML = icon("decks"); h2.appendChild(document.createTextNode(list.length + " packs · " + all.length + " cards"));
    hl.append(h2, mk("p", null, fresh + " new · " + (all.length - fresh) + " duplicates (+" + fmt(shards) + " shards) · best pull: " + RARITY_NAMES[best.r] + (best.h ? " Holo" : "")));
    h.appendChild(hl); box.appendChild(h);
    const g = mk("div", "tp-qsgrid");
    all.sort((a, b) => b.r - a.r || b.isNew - a.isNew).forEach((c, i) => {
        const cell = mk("div", "tp-qscell"); cell.style.setProperty("--i", i);
        cell.appendChild(cardEl(c.id, { size: "sm", holo: !!c.h, isNew: !!c.isNew }));
        cell.appendChild(mk("small", null, c.isNew ? "NEW" : "+" + c.shards + " shards"));
        cell.onclick = () => inspect(c.id, { holo: !!c.h });
        g.appendChild(cell);
    });
    box.appendChild(g);
    const pit = list[list.length - 1]; if (pit && pit.pityLeft != null) box.appendChild(mk("p", "vt-rule", "Pity: a guaranteed " + (pit.kind === "premium" ? "Legendary" : "Ultra Rare") + " or better within " + pit.pityLeft + " more pack" + (pit.pityLeft === 1 ? "" : "s") + "."));
    const done = btn("Done", "alt", () => close(), "check"); box.appendChild(done);
    ov.appendChild(box); document.body.appendChild(ov); sfx(best.r >= 5 ? "legendary" : best.r >= 3 ? "stUltra" : "reveal");
    function close() { ov.remove(); Promise.all(list.map(p => H.act("opened:" + p.seed, "opened", w => markOpened(w, p.seed)))).then(() => H.rerender()); }
    ov.addEventListener("click", e => { if (e.target === ov) close(); });
    const onKey = e => { if (e.key === "Escape") { removeEventListener("keydown", onKey); close(); } }; addEventListener("keydown", onKey);
}
