/* =====================================================================
   ANIME TCG · DECKS
   Six deck slots (rename, copy, delete, cover card, the active one, a validity line). The builder: the deck list
   (20 slots, characters then Action cards) on the left, the card pool on the right (characters with filters, search,
   sort and an owned-only switch; Action cards, unlocked by level). Tap or drag to add and remove. Stats: rarity and
   card-type counts, the ATK curve, tribute cards, warnings. Test hand (5 random cards, again and again) and
   Auto-build (fills the empty slots from your collection). Rules: DECK in js/vault/config.js.
   ===================================================================== */
import { DECK } from "./config.js?v=21";
import { owned, isHolo, ownedIds, saveDeck, deleteDeck, setActiveDeck, activeDeck, deckProblem, renameDeck, copyDeck } from "./packs.js?v=19";
import { CARDS, CARD_SERIES, RARITY_NAMES, ARCHETYPES } from "./carddb.js?v=6";
import { cardEl, theme, SHOW } from "./cardui.js?v=20";
import { icon, RARITY_ICON } from "./icons.js?v=3";
import { ACTIONS, ACTION_IDS } from "../duel/cards.js?v=7";
import { actionEl } from "../duel/ui.js?v=7";

const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const btn = (txt, cls, fn, ic) => { const b = mk("button", "btn " + (cls || "")); b.type = "button"; if (ic) b.innerHTML = icon(ic); b.appendChild(document.createTextNode(txt)); if (fn) b.onclick = fn; return b; };
let H = null;
const X = () => H.x(), W = () => H.bank.get(), sfx = n => X().sfx(n), toast = t => X().toast(t);
const ask = o => (X().uiConfirm ? X().uiConfirm(o) : Promise.resolve(confirm(o.text || o.title)));
const lvl = () => ((X().level && X().level()) || {}).lvl || 1;
const isA = x => /^a:/.test(String(x));
const TRIB = id => CARDS[id] && CARDS[id].r >= 5;
let E = null, poolTab = "chars", F = { q: "", series: "", rar: -1, arch: "", own: true, sort: "rar" }, renaming = "";
export const editingDeck = () => E;
export function startEditing(deckOrNull, addId, ctx) {
    if (ctx) H = ctx;          // "Add to deck" can come before the Decks tab was ever opened
    const w = W(), d = deckOrNull;
    E = d ? { id: d.id, name: d.name, cards: d.cards.slice(), cover: d.cover || 0 } : { id: "", name: "Deck " + ((w.decks || []).length + 1), cards: [], cover: 0 };
    if (addId != null && !E.cards.includes(addId)) { if (E.cards.length < DECK.size) E.cards.push(addId); else toast("That deck is full: take a card out to make room."); }
}

export function decksTab(h) {
    H = h; const v = mk("div", "td");
    if (E) { v.appendChild(builder()); return v; }
    const w = W(), act = activeDeck(w);
    const head = mk("div", "tcg-h"), hl = mk("div"), h2 = mk("h2"); h2.innerHTML = icon("decks"); h2.appendChild(document.createTextNode("Decks"));
    hl.append(h2, mk("p", null, "A deck is " + DECK.size + " cards: at most " + DECK.maxCopies + " copy of each character, and up to " + DECK.maxActions + " Action cards (" + DECK.actionCopies + " of each). Your active deck is the one you duel with."));
    head.appendChild(hl); v.appendChild(head);
    const grid = mk("div", "td-slots");
    for (let i = 0; i < DECK.maxDecks; i++) {
        const d = (w.decks || [])[i];
        if (!d) { const e = mk("button", "td-slot empty"); e.type = "button"; e.innerHTML = icon("plus"); e.append(mk("b", null, "New deck"), mk("small", null, "Slot " + (i + 1))); e.onclick = () => { startEditing(null); sfx("open"); H.rerender(); }; grid.appendChild(e); continue; }
        const bad = deckProblem(w, d.cards, lvl()), on = act && act.id === d.id;
        const box = mk("article", "td-slot" + (on ? " active" : "") + (bad ? " bad" : "") + (d.review ? " review" : ""));
        const cover = mk("div", "td-cover"), cid = Number(d.cover) && d.cards.includes(Number(d.cover)) ? Number(d.cover) : d.cards.find(x => !isA(x));
        if (cid && CARDS[cid]) cover.appendChild(cardEl(cid, { size: "sm", holo: isHolo(w, cid) }));
        cover.appendChild(mk("i", "td-stack"));
        box.appendChild(cover);
        const info = mk("div", "td-info");
        if (renaming === d.id) {
            const inp = mk("input"); inp.type = "text"; inp.value = d.name; inp.maxLength = 24; inp.setAttribute("aria-label", "Deck name");
            const done = async () => { renaming = ""; await H.act("deckren:" + d.id + ":" + Date.now(), "deck", w2 => renameDeck(w2, d.id, inp.value)); H.rerender(); };
            inp.onkeydown = e => { if (e.key === "Enter") done(); if (e.key === "Escape") { renaming = ""; H.rerender(); } }; inp.onblur = done;
            info.appendChild(inp); setTimeout(() => inp.focus(), 0);
        } else info.appendChild(mk("b", "td-name", d.name));
        const st = mk("span", "tcg-pill " + (bad ? "bad" : on ? "gold" : "ok")); st.innerHTML = icon(bad ? "info" : "check"); st.appendChild(document.createTextNode(bad || (d.review ? "Ready · needs review" : on ? "Active · ready" : "Ready")));
        info.append(st, mk("small", null, d.cards.filter(x => !isA(x)).length + " characters · " + d.cards.filter(isA).length + " Action cards"));
        box.appendChild(info);
        const row = mk("div", "td-btns");
        if (!on) row.appendChild(btn("Use", "alt sm", async () => { await H.act("deckuse:" + d.id + ":" + Date.now(), "deck", w2 => setActiveDeck(w2, d.id)); sfx("pick"); H.rerender(); }, "check"));
        row.append(btn("Edit", "sm", () => { startEditing(d); sfx("open"); H.rerender(); }, "edit"), btn("Rename", "ghost sm", () => { renaming = d.id; H.rerender(); }, "edit"),
            btn("Copy", "ghost sm", async () => { const r = await H.act("deckcopy:" + d.id + ":" + Date.now(), "deck", w2 => copyDeck(w2, d.id)); if (!r.ok) toast(r.error); H.rerender(); }, "copy"),
            btn("Delete", "ghost sm", async () => { if (!(await ask({ title: "Delete " + d.name + "?", text: "The cards stay in your collection.", ok: "Delete", danger: true }))) return; await H.act("deckdel:" + d.id + ":" + Date.now(), "deck", w2 => deleteDeck(w2, d.id)); H.rerender(); }, "trash"));
        box.appendChild(row); grid.appendChild(box);
    }
    v.appendChild(grid);
    if ((w.decks || []).length > DECK.maxDecks) v.appendChild(mk("p", "vt-rule", "You have more decks than slots from before; keep the ones you like, new ones need a free slot."));
    return v;
}

/* ---------- the builder ---------- */
function builder() {
    const w = W(), v = mk("div", "td-build");
    const top = mk("div", "td-btop"), name = mk("input", "td-bname"); name.type = "text"; name.value = E.name; name.maxLength = 24; name.setAttribute("aria-label", "Deck name"); name.oninput = () => { E.name = name.value; };
    const prob = deckProblem(w, E.cards, lvl());
    const st = mk("span", "tcg-pill " + (prob ? "bad" : "ok")); st.innerHTML = icon(prob ? "info" : "check"); st.appendChild(document.createTextNode(prob || "Ready to duel"));
    top.append(name, st);
    const acts = mk("div", "tcg-actions");
    acts.append(btn("Test hand", "sm", testHand, "decks"), btn("Auto-build", "sm", autoBuild, "spirit"), btn("Cancel", "ghost sm", () => { E = null; H.rerender(); }, "close"),
        btn("Save deck", "alt sm", async () => {
            const r = await H.act("decksave:" + (E.id || "new") + ":" + Date.now(), "deck", w2 => saveDeck(w2, E, lvl())); if (!r.ok) { toast(r.error); sfx("strike"); return; }
            const saved = r.result && r.result.deck; if (saved) { const all = W().decks.map(d => d.id === saved.id ? Object.assign({}, d, { review: 0 }) : d); await H.act("deckrev:" + saved.id + ":" + Date.now(), "deck", w3 => { w3.decks = all; return {}; }); }
            H.event("deck", "ev:deck:" + Date.now()); E = null; sfx("ready"); toast("Deck saved"); H.rerender();
        }, "check"));
    top.appendChild(acts); v.appendChild(top);
    const cols = mk("div", "td-cols");
    cols.append(deckList(w), pool(w));
    v.appendChild(cols);
    return v;
}
function deckList(w) {
    const box = mk("section", "td-list"); box.appendChild(mk("h3", null, "Your deck · " + E.cards.length + " / " + DECK.size));
    const slots = mk("div", "td-dslots");
    const sorted = E.cards.slice().sort((a, b) => (isA(a) - isA(b)) || (isA(a) ? String(a).localeCompare(String(b)) : CARDS[a].r - CARDS[b].r || CARDS[b].pow - CARDS[a].pow));
    for (let i = 0; i < DECK.size; i++) {
        const x = sorted[i], s = mk("div", "td-ds" + (x ? " full" : ""));
        if (x != null) {
            const el = isA(x) ? actionEl(String(x).slice(2), "xs") : cardEl(Number(x), { size: "xs", holo: isHolo(w, Number(x)) });
            s.appendChild(el); s.title = "Tap to take " + (isA(x) ? ACTIONS[String(x).slice(2)].name : CARDS[x].n) + " out";
            s.onclick = () => { const k = E.cards.indexOf(x); if (k >= 0) E.cards.splice(k, 1); s.classList.add("leaving"); sfx("close"); setTimeout(() => H.rerender(), 140); };
            s.draggable = true; s.ondragstart = e => { e.dataTransfer.setData("text/plain", "out:" + x); };
            if (!isA(x)) { const cv = mk("button", "td-coverbtn" + (Number(E.cover) === Number(x) ? " on" : "")); cv.type = "button"; cv.title = "Use as the deck's cover"; cv.innerHTML = icon("star"); cv.onclick = e => { e.stopPropagation(); E.cover = Number(x); sfx("toggle"); H.rerender(); }; s.appendChild(cv); }
        } else s.appendChild(mk("span", null, String(i + 1)));
        slots.appendChild(s);
    }
    slots.ondragover = e => e.preventDefault();
    slots.ondrop = e => { e.preventDefault(); const t = e.dataTransfer.getData("text/plain"); if (t.startsWith("in:")) add(t.slice(3)); };
    box.appendChild(slots);
    box.appendChild(statsPanel());
    return box;
}
function statsPanel() {
    const box = mk("div", "td-stats"), chars = E.cards.filter(x => !isA(x)).map(Number), acts = E.cards.filter(isA);
    const rar = mk("div", "td-rar"); RARITY_NAMES.forEach((n, r) => { const k = chars.filter(id => CARDS[id].r === r).length; if (!k) return; const s = mk("span", "td-rp r" + r); s.innerHTML = icon(RARITY_ICON[r]); s.appendChild(document.createTextNode(k)); s.title = n; rar.appendChild(s); });
    const sup = acts.filter(a => (ACTIONS[a.slice(2)] || {}).type === "support").length, ctr = acts.length - sup;
    const types = mk("p", "td-types", chars.length + " characters · " + sup + " Support · " + ctr + " Counter · " + chars.filter(TRIB).length + " need a tribute");
    // the ATK curve (shown values, in steps of 100)
    const curve = mk("div", "td-curve"), vals = [2, 3, 4, 5, 6, 7, 8, 9], peak = Math.max(1, ...vals.map(v => chars.filter(id => CARDS[id].pow === v).length));
    vals.forEach(v => { const n = chars.filter(id => CARDS[id].pow === v).length, c = mk("div", "td-cv"); const b = mk("i"); b.style.height = (n / peak * 100) + "%"; c.append(mk("b", null, n ? String(n) : ""), b, mk("small", null, String(v * 100))); curve.appendChild(c); });
    box.append(mk("b", "td-sub", "Rarity"), rar, types, mk("b", "td-sub", "ATK curve"), curve);
    const warn = [];
    const trib = chars.filter(TRIB).length, low = chars.filter(id => !TRIB(id)).length;
    if (trib > 0 && low < trib * 3) warn.push(trib + " tribute cards but only " + low + " characters to tribute with: add more low-cost characters.");
    if (trib > 4) warn.push(trib + " tribute cards: a hand full of them can't be summoned.");
    if (!ctr) warn.push("No Counter cards: you can't answer attacks or Supports.");
    if (chars.length && chars.filter(id => CARDS[id].def >= 6).length < 2) warn.push("Few high-DEF characters to hold the line in Defense position.");
    if (chars.length < 12 && E.cards.length >= DECK.size) warn.push("Only " + chars.length + " characters: you may run out of things to summon.");
    warn.forEach(t => { const p = mk("p", "td-warn"); p.innerHTML = icon("info"); p.appendChild(document.createTextNode(t)); box.appendChild(p); });
    return box;
}
function pool(w) {
    const box = mk("section", "td-pool");
    const seg = mk("div", "tcg-actions"); [["chars", "Characters", "character"], ["acts", "Action cards", "support"]].forEach(([k, l, ic]) => seg.appendChild(btn(l, "sm" + (poolTab === k ? " alt" : " ghost"), () => { poolTab = k; H.rerender(); }, ic)));
    box.appendChild(seg);
    const g = mk("div", "td-pgrid");
    g.ondragover = e => e.preventDefault();
    g.ondrop = e => { e.preventDefault(); const t = e.dataTransfer.getData("text/plain"); if (t.startsWith("out:")) { const x = t.slice(4), k = E.cards.findIndex(y => String(y) === x); if (k >= 0) { E.cards.splice(k, 1); sfx("close"); H.rerender(); } } };
    if (poolTab === "acts") {
        box.appendChild(mk("p", "vt-rule", "Action cards are free for everyone and unlock as your Arcade Pass levels up (you're level " + lvl() + "). Up to " + DECK.maxActions + " per deck, " + DECK.actionCopies + " of each. Never in packs, never traded."));
        ACTION_IDS.slice().sort((a, b) => ACTIONS[a].lvl - ACTIONS[b].lvl).forEach(id => {
            const A = ACTIONS[id], open = lvl() >= A.lvl, n = E.cards.filter(x => x === "a:" + id).length, cell = mk("div", "td-pc" + (open ? "" : " locked") + (n ? " in" : ""));
            cell.appendChild(actionEl(id, "sm")); cell.appendChild(mk("small", null, open ? (n ? n + " in deck" : A.type === "counter" ? "Counter" : "Support") : "Unlocks at level " + A.lvl));
            if (open) { cell.tabIndex = 0; cell.onclick = () => add("a:" + id); cell.draggable = true; cell.ondragstart = e => e.dataTransfer.setData("text/plain", "in:a:" + id); }
            g.appendChild(cell);
        });
        box.appendChild(g); return box;
    }
    const fl = mk("div", "td-filters"), q = mk("input"); q.type = "search"; q.placeholder = "Search"; q.value = F.q; q.setAttribute("aria-label", "Search the pool");
    let qt = 0; q.oninput = () => { clearTimeout(qt); qt = setTimeout(() => { F.q = q.value; H.rerender(); setTimeout(() => { const n = document.querySelector(".td-filters input"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 0); }, 250); };
    const sel = (label, opts, cur, fn) => { const s = mk("select"); s.setAttribute("aria-label", label); opts.forEach(([v2, l]) => { const o = new Option(l, v2); if (String(v2) === String(cur)) o.selected = true; s.add(o); }); s.onchange = () => { fn(s.value); H.rerender(); }; return s; };
    const own = mk("button", "chip-btn" + (F.own ? " on" : ""), "Owned only"); own.type = "button"; own.onclick = () => { F.own = !F.own; H.rerender(); };
    fl.append(q, sel("Series", [["", "All series"]].concat(CARD_SERIES.map(s => [s, theme(s).label])), F.series, x => { F.series = x; }), sel("Rarity", [[-1, "Any rarity"]].concat(RARITY_NAMES.map((n, i) => [i, n])), F.rar, x => { F.rar = Number(x); }),
        sel("Archetype", [["", "Any archetype"]].concat(ARCHETYPES.map(a => [a, a])), F.arch, x => { F.arch = x; }), sel("Sort", [["rar", "Rarity"], ["atk", "ATK"], ["def", "DEF"], ["name", "Name"]], F.sort, x => { F.sort = x; }), own);
    box.appendChild(fl);
    let ids = F.own ? ownedIds(w) : Object.keys(CARDS).map(Number);
    if (F.series) ids = ids.filter(id => CARDS[id].s === F.series); if (F.rar >= 0) ids = ids.filter(id => CARDS[id].r === F.rar); if (F.arch) ids = ids.filter(id => CARDS[id].a === F.arch);
    if (F.q) ids = ids.filter(id => CARDS[id].n.toLowerCase().includes(F.q.toLowerCase()));
    const by = { rar: (a, b) => CARDS[b].r - CARDS[a].r, atk: (a, b) => CARDS[b].pow - CARDS[a].pow, def: (a, b) => CARDS[b].def - CARDS[a].def, name: (a, b) => CARDS[a].n.localeCompare(CARDS[b].n) }[F.sort];
    ids.sort((a, b) => by(a, b) || CARDS[a].n.localeCompare(CARDS[b].n));
    ids.slice(0, 300).forEach(id => {
        const mine = owned(w, id), inD = E.cards.includes(id), cell = mk("div", "td-pc" + (inD ? " in" : "") + (mine ? "" : " locked"));
        cell.appendChild(cardEl(id, { size: "sm", holo: mine && isHolo(w, id), ghost: !mine }));
        if (inD) cell.appendChild(mk("small", "td-intag", "In deck"));
        if (mine) { cell.tabIndex = 0; cell.onclick = () => inD ? (E.cards.splice(E.cards.indexOf(id), 1), sfx("close"), H.rerender()) : add(id); cell.onkeydown = e => { if (e.key === "Enter") cell.click(); }; cell.draggable = true; cell.ondragstart = e => e.dataTransfer.setData("text/plain", "in:" + id); }
        g.appendChild(cell);
    });
    if (!ids.length) g.appendChild(mk("p", "vt-rule", "No cards match."));
    box.appendChild(g);
    return box;
}
function add(x) {
    x = isA(x) ? String(x) : Number(x);
    if (E.cards.length >= DECK.size) { toast("The deck is full (" + DECK.size + "). Tap a card in it to take it out."); sfx("strike"); return; }
    if (isA(x)) { if (E.cards.filter(isA).length >= DECK.maxActions) { toast("Max " + DECK.maxActions + " Action cards."); return; } if (E.cards.filter(y => y === x).length >= DECK.actionCopies) { toast("Max " + DECK.actionCopies + " of each Action card."); return; } }
    else if (E.cards.includes(x)) { toast("Max " + DECK.maxCopies + " copy of each character."); return; }
    E.cards.push(x); sfx("pick"); H.rerender();
}
/* a random opening hand, again and again */
function testHand() {
    if (E.cards.length < 5) { toast("Add at least 5 cards first."); return; }
    const ov = mk("div", "tp-qs"), box = mk("div", "tp-qsbox");
    const draw = () => { g.innerHTML = ""; E.cards.slice().sort(() => Math.random() - .5).slice(0, 5).forEach((x, i) => { const c = mk("div", "tp-qscell"); c.style.setProperty("--i", i); c.appendChild(isA(x) ? actionEl(String(x).slice(2), "sm") : cardEl(Number(x), { size: "sm" })); g.appendChild(c); }); sfx("card"); };
    const h = mk("div", "tcg-h"), hl = mk("div"), h2 = mk("h2"); h2.innerHTML = icon("decks"); h2.appendChild(document.createTextNode("Test hand")); hl.append(h2, mk("p", null, "Five random cards from this deck: your opening hand. Draw again as often as you like."));
    h.appendChild(hl); const g = mk("div", "tp-qsgrid"); box.append(h, g);
    const row = mk("div", "tcg-actions"); row.append(btn("Draw again", "alt", draw, "flip"), btn("Close", "", () => ov.remove(), "close")); box.appendChild(row);
    ov.appendChild(box); document.body.appendChild(ov); ov.onclick = e => { if (e.target === ov) ov.remove(); }; draw();
}
/* fill the empty slots from the collection: strong characters first (at most 3 that need a tribute), then
   unlocked Action cards (a Counter, a Support, ...) up to 4 */
function autoBuild() {
    const w = W(), have = new Set(E.cards.map(String));
    const scoreC = id => (CARDS[id].pow + CARDS[id].def) * 10 + CARDS[id].r * 6;
    let trib = E.cards.filter(x => !isA(x) && TRIB(x)).length;
    const chars = ownedIds(w).filter(id => !have.has(String(id))).sort((a, b) => scoreC(b) - scoreC(a));
    const wantChars = DECK.size - 4;
    for (const id of chars) { if (E.cards.filter(x => !isA(x)).length >= wantChars || E.cards.length >= DECK.size) break; if (TRIB(id)) { if (trib >= 3) continue; trib++; } E.cards.push(id); }
    const acts = ACTION_IDS.filter(a => lvl() >= ACTIONS[a].lvl).sort((a, b) => ACTIONS[b].lvl - ACTIONS[a].lvl);
    const order = acts.filter(a => ACTIONS[a].type === "counter").slice(0, 2).concat(acts.filter(a => ACTIONS[a].type === "support").slice(0, 2));
    for (const a of order) { if (E.cards.length >= DECK.size || E.cards.filter(isA).length >= DECK.maxActions) break; if (E.cards.filter(x => x === "a:" + a).length < DECK.actionCopies) E.cards.push("a:" + a); }
    for (const id of chars) { if (E.cards.length >= DECK.size) break; if (!E.cards.includes(id)) E.cards.push(id); }
    sfx("ready"); toast(E.cards.length === DECK.size ? "Auto-build filled your deck." : "Auto-build added what it could: open packs for more cards."); H.rerender();
}
