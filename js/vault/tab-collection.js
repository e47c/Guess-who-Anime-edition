/* =====================================================================
   ANIME TCG · COLLECTION
   A binder (pages of 9 pockets, two pages side by side on wide screens, page-turn) or a grid. Missing cards are
   silhouettes with their number and a name hint. Search + filters (series, rarity, archetype, card type, owned /
   missing, Holo, NEW) and sorting (number, rarity, ATK, DEF, name, recently pulled). Progress: the total, a ring per
   series, the rarity breakdown and the completion rewards (card sleeves). Tap a card: the 3D inspector with a panel
   (ability with keyword chips that explain themselves, stats, number, "first pulled by", copies, shard value, Add to
   deck). Duplicates (a card owned both Normal and Holo): turn the extra copy into shards. Trades with friends in the
   room (cards only): pick, review both sides, send; the friend reviews and accepts; an undo window, then the swap.
   ===================================================================== */
import { TRADE } from "./config.js?v=18";
import { owned, isHolo, ownedIds, seriesDone, shardValue, convertDuplicate, lockTrade, unlockTrade, applyTrade, tradeProblem } from "./packs.js?v=16";
import { CARDS, BY_SERIES, CARD_SERIES, CARD_COUNT, RARITY_NAMES, ARCHETYPES, TOTAL_CARDS } from "./carddb.js?v=6";
import { cardEl, theme, SHOW, abilityParts } from "./cardui.js?v=17";
import { inspect } from "./opening.js?v=17";
import { icon, RARITY_ICON, ARCH_ICON, KEYWORD_ICON } from "./icons.js?v=3";
import { define } from "../duel/glossary.js?v=2";

const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const btn = (txt, cls, fn, ic) => { const b = mk("button", "btn " + (cls || "")); b.type = "button"; if (ic) b.innerHTML = icon(ic); b.appendChild(document.createTextNode(txt)); if (fn) b.onclick = fn; return b; };
const fmt = n => Math.round(n).toLocaleString("en-US");
let H = null;
const X = () => H.x(), W = () => H.bank.get(), sfx = n => X().sfx(n), toast = t => X().toast(t);
const ask = o => (X().uiConfirm ? X().uiConfirm(o) : Promise.resolve(confirm(o.text || o.title)));
const NEW_MS = 3 * 86400000;
const F = { q: "", series: "", rar: -1, arch: "", type: "", own: "all", holo: false, fresh: false, sort: "no", desc: false };
let view = "binder", page = 0, panel = "", turn = "";
try { view = localStorage.getItem("aap_tcg_colview") === "grid" ? "grid" : "binder"; } catch (e) {}
const seen = (() => { try { return new Set(JSON.parse(localStorage.getItem("aap_tcg_seen") || "[]")); } catch (e) { return new Set(); } })();
const markSeen = id => { seen.add(id); try { localStorage.setItem("aap_tcg_seen", JSON.stringify([...seen].slice(-1500))); } catch (e) {} };
const isNew = (w, id) => { const c = (w.cards || {})[id]; return !!c && owned(w, id) && !seen.has(id) && Number(c.at) > Date.now() - NEW_MS; };
const cardType = () => "character";        // Action cards (Support / Counter) are not collectible: Decks tab
const hint = n => n.split(/\s+/).map(w => w[0] + "·".repeat(Math.max(0, Math.min(6, w.length - 1)))).join(" ");

export function collectionTab(h) {
    H = h; const w = W(), v = mk("div", "tc");
    if (panel === "trade" && others().length) { v.appendChild(tradeView()); return v; }
    if (panel === "dups") { v.appendChild(dupView(w)); return v; }
    panel = "";
    v.append(header(w), progress(w), filters(w));
    const ids = filtered(w);
    v.appendChild(view === "binder" ? binder(w, ids) : grid(w, ids));
    return v;
}
function header(w) {
    const head = mk("div", "tcg-h"), hl = mk("div"), h2 = mk("h2"); h2.innerHTML = icon("collection"); h2.appendChild(document.createTextNode("Collection"));
    hl.append(h2, mk("p", null, "Every card you own, in a binder. Missing cards show as silhouettes with their number. Tap a card to inspect it."));
    const act = mk("div", "tcg-actions");
    const seg = mk("div", "tc-seg");
    [["binder", "Binder"], ["grid", "Grid"]].forEach(([k, l]) => { const b = btn(l, "sm" + (view === k ? " alt" : " ghost"), () => { view = k; page = 0; try { localStorage.setItem("aap_tcg_colview", k); } catch (e) {} sfx("toggle"); H.rerender(); }, k); b.setAttribute("aria-pressed", String(view === k)); seg.appendChild(b); });
    act.appendChild(seg);
    const nd = dupList(w).length;
    act.appendChild(btn("Duplicates" + (nd ? " (" + nd + ")" : ""), "sm", () => { panel = "dups"; sfx("open"); H.rerender(); }, "shard"));
    if (others().length) { const n = incomingCount(); act.appendChild(btn("Trade with friends" + (n ? " (" + n + ")" : ""), "sm" + (n ? " alt" : ""), () => { panel = "trade"; sfx("open"); H.rerender(); }, "trade")); }
    head.append(hl, act);
    return head;
}
/* ---------- progress: total, rarity breakdown, a ring per series, sleeves ---------- */
function progress(w) {
    const box = mk("section", "vt-card tc-prog"), mine = ownedIds(w), pct = mine.length / TOTAL_CARDS * 100;
    const tot = mk("div", "tc-total"), ring = mk("span", "tcg-ring-prog big"); ring.style.setProperty("--p", pct.toFixed(1)); ring.appendChild(mk("b", null, Math.floor(pct) + "%"));
    const done = CARD_SERIES.filter(s => seriesDone(w, s)).length;
    const tt = mk("div"); tt.append(mk("b", null, mine.length + " / " + TOTAL_CARDS + " cards"), mk("small", null, done + " / 18 series complete · " + done + " card sleeve" + (done === 1 ? "" : "s") + " unlocked"), mk("small", null, "Holo copies: " + mine.filter(id => isHolo(w, id)).length));
    tot.append(ring, tt); box.appendChild(tot);
    const chart = mk("div", "tc-rchart"); chart.appendChild(mk("b", "tc-sub", "By rarity"));
    RARITY_NAMES.forEach((n, r) => {
        const all = Object.values(CARDS).filter(c => c.r === r).length, have = mine.filter(id => CARDS[id].r === r).length;
        const row = mk("div", "tc-rrow r" + r); const lab = mk("span"); lab.innerHTML = icon(RARITY_ICON[r]); lab.appendChild(document.createTextNode(n));
        const bar = mk("div", "tcg-bar"), bi = mk("i"); bi.style.setProperty("--p", (have / all * 100).toFixed(1) + "%"); bar.appendChild(bi);
        row.append(lab, bar, mk("small", null, have + " / " + all)); chart.appendChild(row);
    });
    box.appendChild(chart);
    const rings = mk("div", "tc-rings"); rings.appendChild(mk("b", "tc-sub", "Series · completing one unlocks its card sleeve"));
    const rl = mk("div", "tc-rlist");
    CARD_SERIES.forEach(s => {
        const T = theme(s), have = BY_SERIES[s].filter(id => owned(w, id)).length, b = mk("button", "tc-sring" + (F.series === s ? " on" : "") + (have === CARD_COUNT[s] ? " done" : "")); b.type = "button";
        b.title = T.label + ": " + have + " / " + CARD_COUNT[s] + (have === CARD_COUNT[s] ? " · sleeve unlocked" : "");
        const r = mk("span", "tcg-ring-prog"); r.style.setProperty("--p", (have / CARD_COUNT[s] * 100).toFixed(1)); r.style.setProperty("--rc", T.c3);
        const e = mk("i", "tp-emb"); e.innerHTML = T.emblem; r.appendChild(e);
        b.append(r, mk("small", null, have + "/" + CARD_COUNT[s]));
        if (have === CARD_COUNT[s]) { const k = mk("i", "tc-done"); k.innerHTML = icon("check"); b.appendChild(k); }
        b.onclick = () => { F.series = F.series === s ? "" : s; page = 0; sfx("toggle"); H.rerender(); };
        rl.appendChild(b);
    });
    rings.appendChild(rl); box.appendChild(rings);
    return box;
}
/* ---------- filters + sort ---------- */
function filters(w) {
    const box = mk("div", "tc-filters");
    const search = mk("label", "tc-search"); search.innerHTML = icon("search"); const q = mk("input"); q.type = "search"; q.placeholder = "Search a name"; q.value = F.q; q.setAttribute("aria-label", "Search cards by name");
    let qt = 0; q.oninput = () => { clearTimeout(qt); qt = setTimeout(() => { F.q = q.value; page = 0; H.rerender(); setTimeout(() => { const n = document.querySelector(".tc-search input"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 0); }, 250); };
    search.appendChild(q); box.appendChild(search);
    const sel = (label, opts, cur, fn) => { const s = mk("select"); s.setAttribute("aria-label", label); opts.forEach(([v, l]) => { const o = new Option(l, v); if (String(v) === String(cur)) o.selected = true; s.add(o); }); s.onchange = () => { fn(s.value); page = 0; H.rerender(); }; return s; };
    box.append(
        sel("Series", [["", "All series"]].concat(CARD_SERIES.map(s => [s, theme(s).label])), F.series, v => { F.series = v; }),
        sel("Rarity", [[-1, "Any rarity"]].concat(RARITY_NAMES.map((n, i) => [i, n])), F.rar, v => { F.rar = Number(v); }),
        sel("Archetype", [["", "Any archetype"]].concat(ARCHETYPES.map(a => [a, a])), F.arch, v => { F.arch = v; }),
        sel("Card type", [["", "Any card type"], ["character", "Character"], ["support", "Support (Decks tab)"], ["counter", "Counter (Decks tab)"]], F.type, v => { F.type = v; }),
        sel("Owned", [["all", "Owned + missing"], ["own", "Owned only"], ["miss", "Missing only"]], F.own, v => { F.own = v; }));
    const tog = (label, k, ic) => { const b = mk("button", "chip-btn" + (F[k] ? " on" : "")); b.type = "button"; b.innerHTML = icon(ic); b.appendChild(document.createTextNode(label)); b.setAttribute("aria-pressed", String(!!F[k])); b.onclick = () => { F[k] = !F[k]; page = 0; sfx("toggle"); H.rerender(); }; return b; };
    box.append(tog("Holo", "holo", "holo"), tog("New", "fresh", "new"));
    const sortRow = mk("span", "tc-sort"); sortRow.innerHTML = icon("sort");
    sortRow.append(sel("Sort", [["no", "Number"], ["rar", "Rarity"], ["atk", "ATK"], ["def", "DEF"], ["name", "Name"], ["recent", "Recently pulled"]], F.sort, v => { F.sort = v; }));
    const dir = btn(F.desc ? "High → low" : "Low → high", "sm ghost", () => { F.desc = !F.desc; H.rerender(); }); sortRow.appendChild(dir);
    box.appendChild(sortRow);
    if (F.q || F.series || F.rar >= 0 || F.arch || F.type || F.own !== "all" || F.holo || F.fresh) box.appendChild(btn("Clear filters", "sm ghost", () => { Object.assign(F, { q: "", series: "", rar: -1, arch: "", type: "", own: "all", holo: false, fresh: false }); page = 0; H.rerender(); }, "close"));
    return box;
}
function filtered(w) {
    const q = F.q.trim().toLowerCase();
    let ids = Object.keys(CARDS).map(Number);
    if (F.series) ids = ids.filter(id => CARDS[id].s === F.series);
    if (F.rar >= 0) ids = ids.filter(id => CARDS[id].r === F.rar);
    if (F.arch) ids = ids.filter(id => CARDS[id].a === F.arch);
    if (F.type) ids = ids.filter(id => cardType(id) === F.type);
    if (F.own === "own" || F.holo || F.fresh) ids = ids.filter(id => owned(w, id));
    if (F.own === "miss") ids = ids.filter(id => !owned(w, id));
    if (F.holo) ids = ids.filter(id => isHolo(w, id));
    if (F.fresh) ids = ids.filter(id => isNew(w, id));
    if (q) ids = ids.filter(id => owned(w, id) ? CARDS[id].n.toLowerCase().includes(q) : CARDS[id].n.toLowerCase().startsWith(q) && q.length >= 3);
    const at = id => Number(((w.cards || {})[id] || {}).at) || 0, so = CARD_SERIES.indexOf.bind(CARD_SERIES);
    const by = { no: (a, b) => so(CARDS[a].s) - so(CARDS[b].s) || CARDS[a].no.localeCompare(CARDS[b].no), rar: (a, b) => CARDS[a].r - CARDS[b].r, atk: (a, b) => CARDS[a].pow - CARDS[b].pow, def: (a, b) => CARDS[a].def - CARDS[b].def,
        name: (a, b) => CARDS[a].n.localeCompare(CARDS[b].n), recent: (a, b) => at(a) - at(b) }[F.sort];
    ids.sort((a, b) => (by(a, b) || so(CARDS[a].s) - so(CARDS[b].s) || CARDS[a].no.localeCompare(CARDS[b].no)) * (F.desc ? -1 : 1));
    return ids;
}
/* ---------- a pocket: the card, or its silhouette ---------- */
function pocket(w, id) {
    const own = owned(w, id), c = CARDS[id], p = mk("div", "tc-pocket" + (own ? " own" : " miss"));
    if (own) {
        const el = cardEl(id, { size: "sm", holo: isHolo(w, id), gold: seriesDone(w, c.s), isNew: isNew(w, id) });
        p.appendChild(el); p.tabIndex = 0; p.setAttribute("role", "button"); p.setAttribute("aria-label", "Inspect " + c.n);
        p.onclick = () => inspectCard(id); p.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inspectCard(id); } };
    } else {
        const sil = mk("div", "tc-sil r" + c.r); sil.style.setProperty("--c1", theme(c.s).c1); sil.style.setProperty("--c3", theme(c.s).c3);
        sil.innerHTML = '<svg viewBox="0 0 100 120" aria-hidden="true"><path d="M50 18a19 19 0 1 1 0 38 19 19 0 0 1 0-38zM12 120c2-31 19-48 38-48s36 17 38 48z" fill="currentColor"/></svg>';
        sil.append(mk("b", null, "No. " + c.no.split("/")[0]), mk("small", null, hint(c.n)), mk("i", null, RARITY_NAMES[c.r]));
        p.appendChild(sil); p.title = "Not collected: " + theme(c.s).label + " No. " + c.no;
    }
    return p;
}
function binder(w, ids) {
    const per = 9, wide = matchMedia("(min-width: 900px)").matches, spread = wide ? 2 : 1, pages = Math.max(1, Math.ceil(ids.length / per));
    page = Math.max(0, Math.min(page, pages - 1)); if (spread === 2) page -= page % 2;
    const box = mk("section", "tc-binder" + (spread === 2 ? " spread" : ""));
    if (!ids.length) { box.appendChild(empty()); return box; }
    const book = mk("div", "tc-book" + (turn ? " turn-" + turn : "")); turn = "";
    for (let k = 0; k < spread; k++) {
        const pi = page + k; if (pi >= pages && k) break;
        const pg = mk("div", "tc-page" + (k ? " right" : " left")), rings = mk("i", "tc-rings2"); pg.appendChild(rings);
        const g = mk("div", "tc-pockets");
        ids.slice(pi * per, pi * per + per).forEach(id => g.appendChild(pocket(w, id)));
        for (let e = g.childElementCount; e < per; e++) g.appendChild(mk("div", "tc-pocket blank"));
        pg.append(g, mk("small", "tc-pno", "Page " + (pi + 1)));
        book.appendChild(pg);
    }
    box.appendChild(book);
    const nav = mk("div", "tc-nav");
    const go = d => { const np = page + d * spread; if (np < 0 || np >= pages) return; turn = d > 0 ? "next" : "prev"; page = np; sfx("flip"); H.rerender(); };
    const prev = btn("Previous", "ghost", () => go(-1), "back"); prev.disabled = page === 0;
    const next = btn("Next", "", () => go(1)); next.innerHTML = '<span>Next</span>' + icon("back", "flip-x"); next.disabled = page + spread >= pages;
    nav.append(prev, mk("b", "tc-pcount", "Pages " + (page + 1) + (spread === 2 && page + 2 <= pages ? "–" + (page + 2) : "") + " of " + pages + " · " + ids.length + " cards"), next);
    box.appendChild(nav);
    // swipe on touch screens, arrow keys anywhere on the binder
    let sx = null;
    book.addEventListener("pointerdown", e => { sx = e.clientX; });
    book.addEventListener("pointerup", e => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); });
    box.tabIndex = -1; box.addEventListener("keydown", e => { if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return; if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); });
    return box;
}
function grid(w, ids) {
    const box = mk("section", "tc-grid"); if (!ids.length) { box.appendChild(empty()); return box; }
    const cap = 240, g = mk("div", "tc-gridin"); ids.slice(0, cap).forEach(id => g.appendChild(pocket(w, id))); box.appendChild(g);
    if (ids.length > cap) box.appendChild(mk("p", "vt-rule", "Showing " + cap + " of " + ids.length + ". Narrow it down with a filter, or switch to the Binder to page through all of them."));
    return box;
}
const empty = () => { const e = mk("div", "tcg-empty"); e.innerHTML = icon("search"); e.append(mk("b", null, "No cards match"), mk("small", null, "Change or clear the filters above.")); return e; };

/* ---------- the inspector with its panel ---------- */
export function inspectCard(id, extra = {}) {
    const w = W(), c = CARDS[id], rec = (w.cards || {})[id] || {}, P = abilityParts(c.ab), T = theme(c.s);
    markSeen(id);
    const pane = mk("aside", "tc-ipanel");
    const top = mk("div", "tc-ihead"); const ri = mk("span", "tc-irar r" + c.r); ri.innerHTML = icon(RARITY_ICON[c.r]); ri.appendChild(document.createTextNode(RARITY_NAMES[c.r] + (rec.h ? " · Holo owned" : "")));
    top.append(mk("small", null, T.label + " · No. " + c.no), mk("b", null, c.n), ri);
    pane.appendChild(top);
    const stats = mk("div", "tc-istats");
    [["atk", "ATK", SHOW(c.pow)], ["def", "DEF", SHOW(c.def)]].forEach(([ic, l, v]) => { const s = mk("span", "tc-istat " + ic); s.innerHTML = icon(ic); s.append(mk("b", null, String(v)), mk("small", null, l)); stats.appendChild(s); });
    const ar = mk("span", "tc-istat arch"); ar.innerHTML = icon(ARCH_ICON[c.a] || "character"); ar.append(mk("b", null, c.a), mk("small", null, "ARCHETYPE")); stats.appendChild(ar);
    pane.appendChild(stats);
    const ab = mk("div", "tc-iab"); ab.appendChild(mk("b", null, c.abName));
    const chips = mk("div", "tc-ichips"), def = mk("p", "tc-idef");
    P.kw.concat(P.tags).forEach(k => { const b = mk("button", "tc-ichip" + (P.tags.includes(k) ? " tm" : "")); b.type = "button"; b.innerHTML = icon(P.tags.includes(k) ? "timing" : (KEYWORD_ICON[k] || "spirit")); b.appendChild(document.createTextNode(k)); b.onclick = () => { def.textContent = k + ": " + (define(k) || "a timing word."); chips.querySelectorAll(".on").forEach(x => x.classList.remove("on")); b.classList.add("on"); }; chips.appendChild(b); });
    ab.append(chips, mk("p", null, P.text), def);
    if (P.kw.length) def.textContent = "Tap a keyword to see what it does.";
    pane.appendChild(ab);
    const facts = mk("dl", "tc-ifacts");
    const fact = (k, v) => { facts.append(mk("dt", null, k), mk("dd", null, v)); };
    if (owned(w, id)) {
        fact("First pulled by", (rec.by || "you") + (rec.at ? " · " + new Date(rec.at).toLocaleDateString() : ""));
        fact("Your copies", [rec.n ? "Normal ×" + rec.n : "", rec.h ? "Holo ×" + rec.h : ""].filter(Boolean).join(" · "));
        fact("Shard value", (rec.n ? shardValue(id, false) + " (Normal)" : "") + (rec.n && rec.h ? " · " : "") + (rec.h ? shardValue(id, true) + " (Holo)" : ""));
        fact("Duels won with it", String(Number(rec.w) || 0));
    } else fact("Status", "Not collected yet: it's in " + T.label + " packs.");
    pane.appendChild(facts);
    if (owned(w, id) && H.addToDeck) pane.appendChild(btn("Add to deck", "alt", () => { ins.close(); H.addToDeck(id); }, "decks"));
    if (extra.actions) extra.actions.forEach(a => pane.appendChild(a));
    const ins = inspect(id, { holo: isHolo(w, id) && owned(w, id), stamp: { by: rec.by, at: rec.at }, panel: pane, ghost: !owned(w, id) });
    return ins;
}

/* ---------- duplicates: a card owned both Normal and Holo; the Normal copy can become shards ---------- */
const dupList = w => ownedIds(w).filter(id => { const c = w.cards[id]; return c.n > 0 && c.h > 0; });
function dupView(w) {
    const v = mk("div", "tc-dups"), list = dupList(w);
    v.appendChild(btn("Back to the binder", "ghost sm", () => { panel = ""; H.rerender(); }, "back"));
    const head = mk("div", "tcg-h"), hl = mk("div"), h2 = mk("h2"); h2.innerHTML = icon("shard"); h2.appendChild(document.createTextNode("Duplicates & shards"));
    hl.append(h2, mk("p", null, "Duplicates from packs turn into shards on their own. A card you own both as Normal and as Holo can give up its Normal copy for shards: you keep the Holo one, so it stays in your binder and your decks."));
    const bal = mk("span", "tcg-pill"); bal.innerHTML = icon("shard"); bal.appendChild(document.createTextNode(fmt(w.shards || 0) + " shards"));
    head.append(hl, bal); v.appendChild(head);
    if (!list.length) { const e = mk("div", "tcg-empty"); e.innerHTML = icon("shard"); e.append(mk("b", null, "No duplicates right now"), mk("small", null, "When you own a card both as Normal and as Holo, it shows up here.")); v.appendChild(e); }
    else {
        const total = list.reduce((n, id) => n + shardValue(id, false), 0);
        v.appendChild(btn("Convert all " + list.length + " (+" + fmt(total) + " shards)", "alt", async () => {
            if (!(await ask({ title: "Convert " + list.length + " Normal copies?", text: "You keep every Holo copy. +" + fmt(total) + " shards.", ok: "Convert" }))) return;
            for (const id of list) await H.act("dup:" + id + ":" + Date.now(), "dup", w2 => convertDuplicate(w2, id));
            sfx("shard"); toast("+" + fmt(total) + " shards"); H.rerender();
        }, "shard"));
        const g = mk("div", "tc-duplist");
        list.forEach(id => {
            const row = mk("div", "tc-dup"); row.appendChild(cardEl(id, { size: "xs" }));
            row.append(mk("b", null, CARDS[id].n), mk("small", null, RARITY_NAMES[CARDS[id].r] + " · Normal + Holo"));
            row.appendChild(btn("+" + shardValue(id, false) + " shards", "sm", async () => {
                if (!(await ask({ title: "Convert the Normal " + CARDS[id].n + "?", text: "You keep the Holo copy. +" + shardValue(id, false) + " shards.", ok: "Convert" }))) return;
                const r = await H.act("dup:" + id + ":" + Date.now(), "dup", w2 => convertDuplicate(w2, id)); if (!r.ok) { toast(r.error); return; }
                sfx("shard"); H.rerender();
            }, "shard"));
            g.appendChild(row);
        });
        v.appendChild(g);
    }
    v.appendChild(btn("Craft a pack with shards", "", () => { panel = ""; H.open("packs"); }, "packs"));
    return v;
}

/* =========================== TRADES (cards only, friends in the same room) ===========================
   1. pick a friend and the cards (yours and theirs) · 2. review both sides, send (your cards are locked) ·
   3. the friend reviews and accepts or declines · 4. an undo window (TRADE.undoSec) where either side can undo ·
   5. the swap: the sender applies it, then the receiver. */
const pk = p => "p" + p;
let tradeWith = 0, tGive = [], tGet = [], reviewing = false, roomData = null;
const others = () => { const x = H ? X() : null; if (!x || !x.room || !x.room() || !roomData) return []; return x.activeSlots(roomData).filter(p => p !== x.me()); };
const binderOf = p => String(((roomData || {}).binder || {})[pk(p)] || "").split(",").filter(Boolean).map(s => { const [id, h] = s.split(":"); return { id: Number(id), h: Number(h) || 0 }; }).filter(x => CARDS[x.id]);
const arrv = v => Array.isArray(v) ? v : v ? Object.values(v) : [];
const trades = () => Object.entries((roomData || {}).trades || {}).map(([tid, t]) => Object.assign({ tid }, t, { give: arrv(t.give), get: arrv(t.get) }));
function incomingCount() { const me = X().me && X().me(); return trades().filter(t => Number(t.to) === me && t.st === "open").length; }
const UNDO = () => (TRADE.undoSec || 10) * 1000;
const accSeen = {};
function sideBox(title, list, warnFor) {
    const s = mk("div", "tc-tside"); s.appendChild(mk("b", null, title));
    const g = mk("div", "tc-tcards"); list.forEach(c => g.appendChild(cardEl(c.id, { size: "xs", holo: !!c.h }))); if (!list.length) g.appendChild(mk("small", "vt-rule", "nothing"));
    s.appendChild(g);
    if (warnFor) warnFor(list).forEach(t => s.appendChild(mk("small", "tc-warn", t)));
    return s;
}
function tradeView() {
    const w = W(), x = X(), me = x.me(), v = mk("div", "tc-trade");
    v.appendChild(btn("Back to the binder", "ghost sm", () => { panel = ""; reviewing = false; H.rerender(); }, "back"));
    const head = mk("div", "tcg-h"), hl = mk("div"), h2 = mk("h2"); h2.innerHTML = icon("trade"); h2.appendChild(document.createTextNode("Trade with friends"));
    hl.append(h2, mk("p", null, "Cards only, with friends in this room. Both of you review the full offer, the friend accepts, and there's a " + (TRADE.undoSec || 10) + "-second undo window before the cards change hands.")); head.appendChild(hl); v.appendChild(head);
    const mine = trades().filter(t => Number(t.from) === me || Number(t.to) === me).filter(t => ["open", "accepted", "a-go", "a-done"].includes(t.st));
    mine.forEach(t => {
        const inc = Number(t.to) === me, other = inc ? Number(t.from) : Number(t.to), card = mk("section", "vt-card tc-offer" + (inc && t.st === "open" ? " incoming" : ""));
        card.appendChild(mk("b", "tc-otitle", inc ? x.pName(roomData, other) + " offers you a trade" : "Your offer to " + x.pName(roomData, other)));
        const two = mk("div", "tc-tsides");
        const myGive = inc ? t.get : t.give, myGet = inc ? t.give : t.get;
        two.append(sideBox("You give", myGive, l => l.filter(c => { const r = (w.cards || {})[c.id] || {}; return !(c.h ? r.n : r.h); }).map(c => "You lose your only copy of " + CARDS[c.id].n + ".")),
            mk("i", "tc-tarrow"), sideBox("You get", myGet, l => l.filter(c => owned(w, c.id)).map(c => "You already own " + CARDS[c.id].n + (((w.cards || {})[c.id] || {})[c.h ? "h" : "n"] ? ": it becomes shards." : "."))));
        card.appendChild(two);
        const row = mk("div", "tcg-actions");
        if (t.st === "open") { if (inc) row.append(btn("Accept", "alt sm", () => acceptTrade(t), "check"), btn("Decline", "ghost sm", () => setTrade(t.tid, "declined"), "close")); else row.appendChild(btn("Cancel offer", "ghost sm", () => setTrade(t.tid, "cancelled"), "close")); }
        else if (t.st === "accepted") {
            const k = t.tid; accSeen[k] = accSeen[k] || Date.now(); const left = Math.max(0, Math.ceil((accSeen[k] + UNDO() - Date.now()) / 1000));
            const cd = mk("span", "tcg-pill gold tc-undo"); cd.innerHTML = icon("timer"); cd.appendChild(document.createTextNode("Swapping in " + left + " s"));
            row.append(cd, btn("Undo", "sm", () => setTrade(t.tid, "undone"), "back"));
            setTimeout(() => { if (panel === "trade") H.rerender(); }, 1000);
        } else row.appendChild(mk("span", "tcg-pill ok", "Swapping…"));
        card.appendChild(row); v.appendChild(card);
    });
    const ps = mk("div", "tc-tpick"); ps.appendChild(mk("small", null, "Make an offer to:"));
    others().forEach(p => { const b = mk("button", "chip-btn" + (tradeWith === p ? " on" : "")); b.type = "button"; b.innerHTML = icon("friends"); b.appendChild(document.createTextNode(x.pName(roomData, p))); b.onclick = () => { tradeWith = p; tGive = []; tGet = []; reviewing = false; H.rerender(); }; ps.appendChild(b); });
    v.appendChild(ps);
    if (!tradeWith || !others().includes(tradeWith)) { v.appendChild(mk("p", "vt-rule", "Pick a friend. You choose up to " + TRADE.maxCards + " of your cards and up to " + TRADE.maxCards + " of theirs.")); return v; }
    if (reviewing) {
        const rv = mk("section", "vt-card tc-review"); rv.appendChild(mk("b", "tc-otitle", "Review your offer to " + x.pName(roomData, tradeWith)));
        const two = mk("div", "tc-tsides");
        two.append(sideBox("You give", tGive, l => l.filter(c => { const r = (w.cards || {})[c.id] || {}; return !(c.h ? r.n : r.h); }).map(c => "Your only copy of " + CARDS[c.id].n + ".")), mk("i", "tc-tarrow"), sideBox("You get", tGet, l => l.filter(c => owned(w, c.id)).map(c => "You already own " + CARDS[c.id].n + ".")));
        rv.appendChild(two);
        rv.appendChild(mk("p", "vt-rule", "Your cards are locked while the offer is open. " + x.pName(roomData, tradeWith) + " sees this same review before accepting."));
        const row = mk("div", "tcg-actions"); row.append(btn("Edit", "ghost", () => { reviewing = false; H.rerender(); }, "edit"), btn("Send offer", "alt", sendOffer, "trade"));
        rv.appendChild(row); v.appendChild(rv); return v;
    }
    const theirs = binderOf(tradeWith);
    const col = (title, list, sel, max) => {
        const s = mk("section", "vt-card tc-tcol"); s.appendChild(mk("b", null, title + " (" + sel.length + " / " + max + ")"));
        const g = mk("div", "tc-tgrid");
        list.forEach(c => {
            const on = sel.some(y => y.id === c.id && y.h === c.h), el = cardEl(c.id, { size: "xs", holo: !!c.h }); if (on) el.classList.add("picked"); if (c.dim) el.classList.add("dim");
            el.tabIndex = 0; el.onclick = () => { const i = sel.findIndex(y => y.id === c.id && y.h === c.h); if (i >= 0) sel.splice(i, 1); else if (sel.length < max) sel.push({ id: c.id, h: c.h }); else toast("Up to " + max + " cards per side."); sfx("toggle"); H.rerender(); };
            g.appendChild(el);
        });
        if (!list.length) g.appendChild(mk("p", "vt-rule", "Nothing to show."));
        s.appendChild(g); return s;
    };
    const myList = ownedIds(w).flatMap(id => { const c = w.cards[id]; return [c.n ? { id, h: 0 } : null, c.h ? { id, h: 1 } : null].filter(Boolean); }).sort((a, b) => CARDS[b.id].r - CARDS[a.id].r);
    const theirList = theirs.map(c => Object.assign({}, c, { dim: owned(w, c.id) ? 1 : 0 })).sort((a, b) => a.dim - b.dim || CARDS[b.id].r - CARDS[a.id].r);
    if (!theirs.length) v.appendChild(mk("p", "vt-rule", x.pName(roomData, tradeWith) + "'s collection hasn't arrived yet."));
    const two = mk("div", "tc-tcols"); two.append(col("You give", myList, tGive, TRADE.maxCards), col("You get from " + x.pName(roomData, tradeWith), theirList, tGet, TRADE.maxCards));
    v.appendChild(two);
    v.appendChild(mk("p", "vt-rule", "Dimmed cards are ones you already own."));
    const rb = btn("Review offer", "alt", () => { if (!tGive.length && !tGet.length) { toast("Pick at least one card."); return; } reviewing = true; sfx("open"); H.rerender(); }, "check");
    v.appendChild(rb);
    return v;
}
async function sendOffer() {
    const x = X(); const tid = "t" + Date.now().toString(36) + x.me();
    const r = await H.act("tradelock:" + tid, "tradelock", w => lockTrade(w, tid, tGive));
    if (!r.ok) { toast(r.error); return; }
    await x.update(x.ref(x.db, "rooms/" + x.room() + "/trades/" + tid), { from: x.me(), to: tradeWith, give: tGive, get: tGet, st: "open", at: Date.now() });
    tGive = []; tGet = []; reviewing = false; toast("Offer sent"); sfx("ready"); H.rerender();
}
async function acceptTrade(t) {
    const x = X(), p = tradeProblem(W(), t.get);
    if (p) { toast(p); return; }
    const r = await H.act("tradelock:" + t.tid, "tradelock", w => lockTrade(w, t.tid, t.get));
    if (!r.ok) { toast(r.error); return; }
    await x.runTransaction(x.ref(x.db, "rooms/" + x.room() + "/trades/" + t.tid + "/st"), cur => cur === "open" ? "accepted" : undefined);
    sfx("ready");
}
function setTrade(tid, st) { const x = X(); return x.runTransaction(x.ref(x.db, "rooms/" + x.room() + "/trades/" + tid + "/st"), cur => (cur === "open" || (st === "undone" && cur === "accepted")) ? st : undefined); }
/* the Collection redraws on room updates only when what it reads changed */
export const collectionSig = d => JSON.stringify([panel, Object.entries(d.trades || {}).map(([k, t]) => [k, t && t.st]), panel === "trade" ? Object.values(d.binder || {}).map(b => String(b).length) : 0, H && X().activeSlots ? X().activeSlots(d) : []]);
/* every room update: publish my binder, run my side of the trades */
let binderSent = "", binderT = 0;
const tradeSeen = new Set();
export function collectionRoomSync(d, h) {
    H = H || h; roomData = d; const x = H ? X() : null; if (!x || !x.room || !x.room() || !d) return;
    const me = x.me(), w = W();
    const binderStr = ownedIds(w).flatMap(id => { const c = w.cards[id]; return [c.n ? id + ":0" : null, c.h ? id + ":1" : null].filter(Boolean); }).join(",");
    const key = x.room() + "|" + binderStr;
    if (binderSent !== key && (d.binder || {})[pk(me)] !== binderStr) { clearTimeout(binderT); binderT = setTimeout(() => { binderSent = key; x.update(x.ref(x.db, "rooms/" + x.room() + "/binder"), { [pk(me)]: binderStr }).catch(() => {}); }, 800); }
    trades().forEach(t => {
        const from = Number(t.from), to = Number(t.to), k = t.tid + ":" + t.st;
        if (to === me && t.st === "open" && !tradeSeen.has(k)) { tradeSeen.add(k); x.toast(x.pName(d, from) + " sent you a card trade offer: Collection › Trade with friends"); }
        if (t.st === "accepted" && (from === me || to === me)) accSeen[t.tid] = accSeen[t.tid] || Date.now();
        // the sender swaps after the undo window, if nobody undid it
        if (from === me && t.st === "accepted" && !tradeSeen.has(k)) {
            tradeSeen.add(k);
            setTimeout(async () => {
                const go = await x.runTransaction(x.ref(x.db, "rooms/" + x.room() + "/trades/" + t.tid + "/st"), cur => cur === "accepted" ? "a-go" : undefined).catch(() => null);
                if (!go || !go.committed) return;
                const r = await H.act("trade:" + t.tid, "trade", (w2, xx) => applyTrade(w2, t.tid, t.give, t.get, x.pName(d, to) + " (trade)", xx.now));
                if (r.ok) { await x.runTransaction(x.ref(x.db, "rooms/" + x.room() + "/trades/" + t.tid + "/st"), cur => cur === "a-go" ? "a-done" : undefined); if (!r.dup) { x.toast("Trade done with " + x.pName(d, to)); x.sfx("coin"); } }
                else { x.toast("Trade failed: " + r.error); await x.runTransaction(x.ref(x.db, "rooms/" + x.room() + "/trades/" + t.tid + "/st"), () => "cancelled"); }
                H.rerender();
            }, UNDO());
        }
        if (to === me && t.st === "a-done" && !tradeSeen.has(k)) {
            tradeSeen.add(k);
            setTimeout(async () => {
                const r = await H.act("trade:" + t.tid, "trade", (w2, xx) => applyTrade(w2, t.tid, t.get, t.give, x.pName(d, from) + " (trade)", xx.now));
                if (r.ok) { await x.runTransaction(x.ref(x.db, "rooms/" + x.room() + "/trades/" + t.tid + "/st"), cur => cur === "a-done" ? "done" : undefined); if (!r.dup) { x.toast("Trade done with " + x.pName(d, from)); x.sfx("coin"); } }
                H.rerender();
            }, 0);
        }
        if (["declined", "cancelled", "undone"].includes(t.st) && (from === me || to === me) && (W().locks || {})[t.tid] && !tradeSeen.has(k)) {
            tradeSeen.add(k);
            setTimeout(() => H.act("tradeunlock:" + t.tid + ":" + t.st, "tradelock", w2 => unlockTrade(w2, t.tid)).then(() => H.rerender()), 0);
            if (from === me && t.st === "declined") x.toast(x.pName(d, to) + " declined your trade.");
            if (t.st === "undone") x.toast("The trade with " + x.pName(d, from === me ? to : from) + " was undone.");
        }
    });
}
