/* =====================================================================
   THE SHOP: its own section (not a game mode, not in the Vault / Anime TCG). A full-screen sheet over the main menu
   or the lobby, so closing it puts you back exactly where you were (room, friends, state intact).
   Two tabs, one per season:
     SEASON 1: the Season 1 skins (each tier as a Frame and a Background, bundle discount) AND the scratch cards
               (Basic, Silver, Gold -> titles, title skins, username styles). Scratch cards live only here.
     SEASON 2: the Season 2 skins (new Frame + Background per tier, "NEW" tags). Prices: config.js SKINS / SKINS2.
   THE PREVIEW: one persistent panel with the real credit-card Arcade Pass (your name, title, level and XP) wearing the
   frame and / or background being tried. Wide screens: a side panel that stays in view while the grid scrolls; on a
   PC, hovering a tile previews it and a click pins it (the hover only redraws the panel). Phones: the same panel as a
   bottom sheet. A frame and a background can be tried together, from any tier and season.
   (Root cause of the old "no preview on PC": the try-on sat in a grid column sized `auto`, and the pass is a
   size-contained card (container-type: inline-size) with width:100%, so on screens >= 640px the column measured
   0 px and the pass was drawn 0 px wide. Phones used one full-width column, so it showed there. The panel now has
   explicit widths.)
   BUYING and EQUIPPING are separate: the Shop buys, the Wardrobe equips. After every purchase (and every new scratch
   prize) the "Equip now" shortcut sits next to "Keep browsing": it equips the item in the right slot at once and
   shows the result on the Arcade Pass. Every purchase is an intent sent to the bank (bank.apply with an operation
   id): a double click never pays twice.
   ===================================================================== */
import { SKINS, SKINS2, SCRATCH } from "./config.js?v=19";
import { SKIN_TIERS, tierInfo, SCRATCH_ITEMS, KIND_NAME, itemById, owns, bundlePrice, buySkin, buyBundle, rollScratch, equip, publicLook } from "./shop.js?v=17";
import { bank, vaultEvent } from "./vault.js?v=22";
import { newSeed } from "./rng.js?v=2";
import { motionOK } from "../fx.js";

const $ = id => document.getElementById(id);
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const btn = (txt, cls, fn) => { const b = mk("button", "btn " + (cls || ""), txt); b.type = "button"; if (fn) b.onclick = fn; return b; };
const fmt = n => Math.round(n).toLocaleString("en-US");
const coin = n => { const s = mk("span", "vt-price"); s.append(mk("i", "coin-ico"), document.createTextNode(fmt(n))); return s; };
let X = { sfx: () => {}, toast: () => {}, uiConfirm: null, openOverlay: () => {}, closeOverlay: () => {}, passCard: null, profilePub: () => ({}), level: () => null, setLook: () => {}, inRoom: () => false, openWardrobe: () => {} };
const ask = o => (X.uiConfirm ? X.uiConfirm(o) : Promise.resolve(confirm(o.text || o.title)));
const intents = {};
const intent = k => intents[k] || (intents[k] = k + ":" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
const used = k => { delete intents[k]; };

const SEASON_TABS = [{ id: "s1", season: SKINS.season, label: "Season 1", ico: "◆" }, { id: "s2", season: SKINS2.season, label: "Season 2", ico: "✦", isNew: !!SKINS2.newTag }];
let view = "s1", tabAnim = false;
const pv = { sf: null, bg: null };          // the pinned try-on (null = what you wear now, "" = none)
let hov = null;                             // { slot, tier } while a fine pointer rests on a tile (PC)
const tierOf = id => tierInfo(id);
const lookWith = over => Object.assign({}, X.profilePub(), publicLook(bank.get()), over || {});
const pass = (over, cls) => X.passCard(lookWith(over), { xp: X.level(), cls: "pass-preview" + (cls ? " " + cls : "") });
const finePointer = () => !!(window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches);
const seasonOfView = v => (SEASON_TABS.find(t => t.id === v) || SEASON_TABS[0]).season;

export function initShop(ctx) {
    X = Object.assign(X, ctx);
    window.openShop = openShop; window.shopBack = closeShop;
    bank.onChange(() => { if (isOpen()) render(); });
    const o = $("shop"); if (o) o.addEventListener("click", e => { if (e.target === o) closeShop(); });
}
export const isOpen = () => !!$("shop") && !$("shop").classList.contains("hidden");
/* where = { tab: "s1" | "s2" | "skins" | "scratch", tier, slot, sct (scratch tier), from: "wardrobe", name }
   ("skins" opens the season of `tier`; "scratch" opens Season 1 at the scratch cards.)
   The Wardrobe's "Get in Shop" button comes in with the item: the Shop opens on it (a skin tried on, or the scratch
   cards that can win it highlighted) ABOVE the Wardrobe, so "‹ Wardrobe" (or ✕ / Esc) goes straight back to it. */
let focus = null;
const fromWardrobe = () => !!$("profile") && !$("profile").classList.contains("hidden");
export function openShop(where) {
    where = where && typeof where === "object" ? where : {};
    const t = where.tier ? tierOf(where.tier) : null;
    if (where.tab === "s1" || where.tab === "s2") view = where.tab;
    else if (where.tab === "scratch") view = "s1";
    else if (t) view = t.season === SKINS2.season ? "s2" : "s1";
    pv.sf = null; pv.bg = null; hov = null; tabAnim = false;
    if (t) { if (where.slot === "bg") pv.bg = t.id; else pv.sf = t.id; }
    focus = where.from === "wardrobe" && where.name ? { name: where.name, tab: view, scratch: where.tab === "scratch", sct: where.sct || null, item: where.item || null } : null;
    const back = $("shopBack"); if (back) back.textContent = fromWardrobe() ? "‹ Wardrobe" : X.inRoom() ? "‹ Lobby" : "‹ Menu";
    X.sfx("start"); render(); X.openOverlay("shop");
    const o = $("shop"); if (o) o.scrollTop = 0;
    const target = t ? '#shopBody .sh-item[data-tier="' + t.id + '"]' : where.sct ? '#shopBody .vt-sct.t-' + where.sct : where.tab === "scratch" ? "#shopBody .sh-scratch" : "";
    if (target) setTimeout(() => { const el = document.querySelector(target); if (el && el.scrollIntoView) el.scrollIntoView({ block: "center", behavior: motionOK() ? "smooth" : "auto" }); }, 80);
}
/* "You came here for ..." line at the top of the Shop, when the Wardrobe sent you */
function focusBar() {
    if (!focus || focus.tab !== view) return null;
    const d = mk("div", "sh-focus"), it = focus.item ? itemById(focus.item) : null;
    d.append(mk("small", null, "FROM YOUR WARDROBE"), mk("b", null, focus.name));
    d.appendChild(mk("span", null, focus.scratch ? (it && owns(bank.get(), it.id) ? "You own it now. Go back to the Wardrobe to equip it." : "Won from the highlighted scratch cards (the prize is random).") : "It's on the preview. Buy it, then tap Equip now or equip it back in the Wardrobe."));
    const back = btn("‹ Back to the Wardrobe", "ghost sm", () => closeShop()); d.appendChild(back);
    return d;
}
export function closeShop() { pv.sf = pv.bg = null; hov = null; X.closeOverlay("shop"); }
export function shopView() { return view; }

function render() {
    const body = $("shopBody"), nav = $("shopTabs"); if (!body || !nav) return;
    nav.innerHTML = "";
    SEASON_TABS.forEach(T => {
        const b = mk("button", "sh-tab" + (T.id === view ? " on" : "")); b.type = "button"; b.id = "shTab-" + T.id; b.dataset.tab = T.id;
        b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(T.id === view)); b.setAttribute("aria-controls", "shopBody");
        b.append(mk("i", null, T.ico), mk("span", null, T.label));
        if (T.isNew) b.appendChild(mk("em", "sh-new", "NEW"));
        b.onclick = () => { if (view === T.id) return; view = T.id; hov = null; tabAnim = true; X.sfx("toggle"); render(); const o = $("shop"); if (o) o.scrollTop = 0; };
        nav.appendChild(b);
    });
    nav.onkeydown = e => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const i = SEASON_TABS.findIndex(t => t.id === view), n = SEASON_TABS[(i + 1) % SEASON_TABS.length];
        e.preventDefault(); view = n.id; tabAnim = true; render(); const b = $("shTab-" + n.id); if (b) b.focus();
    };
    const o = $("shop"), y = o ? o.scrollTop : 0;
    body.innerHTML = ""; body.setAttribute("aria-labelledby", "shTab-" + view);
    const lay = mk("div", "sh-layout"), main = mk("div", "sh-main"), panel = mk("aside", "sh-pv");
    panel.id = "shopPv"; panel.setAttribute("aria-label", "Preview on your Arcade Pass"); panel.setAttribute("aria-live", "polite");
    const fb = fromWardrobe() ? focusBar() : null; if (fb) main.appendChild(fb);
    main.appendChild(seasonView(seasonOfView(view)));
    lay.append(main, panel); body.appendChild(lay);
    renderPreview();
    if (o) o.scrollTop = y;
    tabAnim = false;
    const bal = $("shopBal"); if (bal) bal.textContent = fmt(bank.coins());
}

/* =========================== SEASON TABS: skins (+ scratch cards in Season 1) =========================== */
const slotName = slot => slot === "sf" ? "Frame" : "Background";
const nameOf = (slot, tier) => tier ? tierOf(tier).name + " " + slotName(slot) + " · S" + tierOf(tier).season : (slot === "sf" ? "No frame" : "No background");
const tried = () => { const cur = publicLook(bank.get()); return { cur, tf: pv.sf == null ? cur.sf : pv.sf, tb: pv.bg == null ? cur.bg : pv.bg }; };
function seasonView(season) {
    const w = bank.get(), { cur, tf, tb } = tried(), s2 = season === SKINS2.season;
    const v = mk("div", "sh-season s" + season + (tabAnim && motionOK() ? " enter" : ""));
    const head = mk("header", "sh-shead");
    head.append(mk("small", null, s2 ? "NEW SEASON" : "THE ORIGINAL SET"), mk("h2", null, "Season " + season + " skins"));
    head.appendChild(mk("p", null, s2
        ? "A new Frame and Background for every tier: realistic materials, light that moves, frames that reach past your picture. Hover or tap a tile to try it on the preview."
        : "Every tier as a Frame (around your picture) and a Background (your whole Arcade Pass and lobby card). Hover or tap a tile to try it on the preview."));
    v.appendChild(head);
    const grid = mk("div", "sh-grid");
    SKIN_TIERS.filter(t => t.season === season).forEach(t => grid.appendChild(tierCard(t, w, cur, tf, tb)));
    v.appendChild(grid);
    v.appendChild(mk("p", "vt-rule", "Wear any frame with any background, from either season; everyone in the room sees both. Buying the Frame and Background of a tier together is " + Math.round(SKINS.bundleOff * 100) + "% off. Cosmetics can't be traded or gifted; if you ever get one twice (future rewards) you get " + Math.round(SKINS.dupRefund * 100) + "% of its price back."));
    if (!s2) v.appendChild(scratchSection());
    return v;
}
function tierCard(t, w, cur, tf, tb) {
    const fId = "sf_" + t.id, bId = "bg_" + t.id, of = owns(w, fId), ob = owns(w, bId), s2 = t.season === SKINS2.season;
    const c = mk("article", "sh-item tier-" + t.base + " s" + t.season + (tf === t.id || tb === t.id ? " on" : ""));
    c.dataset.tier = t.id;
    const h = mk("header", "sh-ih");
    const badge = mk("span", "sh-tb t-" + t.base, t.name); h.appendChild(badge);
    h.appendChild(mk("small", "sh-sn", "S" + t.season));
    if (s2 && SKINS2.newTag && !of && !ob) h.appendChild(mk("em", "sh-new", "NEW"));
    c.appendChild(h);
    const tiles = mk("div", "sh-tiles");
    const tile = (slot, art, own, worn) => {
        const on = (slot === "sf" ? tf : tb) === t.id;
        const b = mk("button", "sh-tile " + (slot === "sf" ? "sh-tf" : "sh-tbg") + (on ? " on" : "")); b.type = "button";
        b.dataset.slot = slot; b.dataset.tier = t.id; b.setAttribute("aria-pressed", String(on));
        b.setAttribute("aria-label", "Try the " + t.name + " " + slotName(slot) + " (Season " + t.season + ")" + (worn ? ", equipped" : own ? ", owned" : ", " + fmt(t.price) + " coins"));
        const a = mk("span", "sh-art"); a.appendChild(art); b.appendChild(a);
        const meta = mk("span", "sh-tm"); meta.appendChild(mk("b", null, slotName(slot)));
        meta.appendChild(worn ? mk("small", "sh-st eq", "Equipped") : own ? mk("small", "sh-st own", "Owned ✓") : mk("small", "sh-st try", on ? "On the preview" : "Try it on"));
        b.appendChild(meta);
        b.onclick = () => pin(slot, t.id);
        b.addEventListener("pointerenter", e => { if (e.pointerType === "mouse" && finePointer()) hover({ slot, tier: t.id }); });
        b.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") hover(null); });
        b.addEventListener("focus", () => { if (finePointer()) hover({ slot, tier: t.id }); });
        b.addEventListener("blur", () => hover(null));
        return b;
    };
    const fa = X.avatarEl(lookWith({ sf: t.id }), { size: 64 });
    const mini = mk("div", "sh-minipass"); mini.appendChild(X.passCard(lookWith({ bg: t.id, sf: "" }), { cls: "pass-mini" }));
    tiles.append(tile("sf", fa, of, cur.sf === t.id), tile("bg", mini, ob, cur.bg === t.id));
    c.appendChild(tiles);
    const row = mk("div", "sh-buy");
    const buyOne = (id, label, own) => {
        if (own) return mk("span", "sh-owned", label + " ✓");
        if (t.earnOnly) return mk("span", "sh-owned", label + ": earn only");
        const b = btn("", "ghost sm", () => doBuySkin(id)); b.append(mk("small", null, label), coin(t.price)); return b;
    };
    row.append(buyOne(fId, "Frame", of), buyOne(bId, "Background", ob));
    if (!of && !ob && !t.earnOnly) { const b = btn("", "alt sm sh-bundle", () => doBundle(t.id)); b.append(mk("small", null, "Both −" + Math.round(SKINS.bundleOff * 100) + "%"), coin(bundlePrice(t.id))); b.title = "Instead of " + fmt(t.price * 2); row.appendChild(b); }
    else if (of && ob) row.appendChild(mk("span", "sh-owned all", "Complete set ✓"));
    c.appendChild(row);
    return c;
}
/* a click / tap pins a tile on the preview (a second click on the same tile goes back to what you wear) */
function pin(slot, tier) {
    const cur = publicLook(bank.get()), was = slot === "sf" ? (pv.sf == null ? cur.sf : pv.sf) : (pv.bg == null ? cur.bg : pv.bg);
    const next = was === tier ? null : tier;
    if (slot === "sf") pv.sf = next; else pv.bg = next;
    hov = null; X.sfx("pick"); markOn(); renderPreview(true);
}
/* hovering (PC): preview without pinning; only the panel redraws */
let hovT = 0;
function hover(h) {
    clearTimeout(hovT);
    hovT = setTimeout(() => { const same = (hov && h && hov.slot === h.slot && hov.tier === h.tier) || (!hov && !h); if (same) return; hov = h; renderPreview(); }, h ? 60 : 140);
}
function markOn() {
    const { tf, tb } = tried();
    document.querySelectorAll("#shopBody .sh-tile").forEach(b => { const on = (b.dataset.slot === "sf" ? tf : tb) === b.dataset.tier; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); const st = b.querySelector(".sh-st.try"); if (st) st.textContent = on ? "On the preview" : "Try it on"; });
    document.querySelectorAll("#shopBody .sh-item").forEach(c => c.classList.toggle("on", c.dataset.tier === tf || c.dataset.tier === tb));
}
/* the persistent preview: the real Arcade Pass with what is tried (hovered > pinned > worn), and what to do about it */
function renderPreview(pop) {
    const box = $("shopPv"); if (!box) return;
    const w = bank.get(), { cur } = tried();
    const tf = hov && hov.slot === "sf" ? hov.tier : (pv.sf == null ? cur.sf : pv.sf);
    const tb = hov && hov.slot === "bg" ? hov.tier : (pv.bg == null ? cur.bg : pv.bg);
    const trying = tf !== cur.sf || tb !== cur.bg;
    box.innerHTML = ""; box.classList.toggle("trying", trying); box.classList.toggle("hovering", !!hov);
    const hd = mk("header", "sh-pvh"); hd.append(mk("small", null, hov ? "PREVIEW · HOVER" : trying ? "PREVIEW · TRYING ON" : "PREVIEW · YOUR LOOK"), mk("b", null, "Your Arcade Pass"));
    box.appendChild(hd);
    const pw = mk("div", "sh-pvpass"); const card = X.passCard(lookWith({ sf: tf, bg: tb }), { xp: X.level(), cls: "pass-preview" + (pop && motionOK() ? " equipped" : ""), tilt: true }); pw.appendChild(card); box.appendChild(pw);
    const info = mk("div", "sh-pvinfo");
    [["sf", tf], ["bg", tb]].forEach(([slot, tier]) => {
        const row = mk("div", "sh-pvrow"), id = slot + "_" + tier, own = !tier || owns(w, id), worn = (slot === "sf" ? cur.sf : cur.bg) === tier;
        const tx = mk("div", "sh-pvt"); tx.append(mk("small", null, slot === "sf" ? "FRAME" : "BACKGROUND"), mk("b", null, nameOf(slot, tier))); row.appendChild(tx);
        const act = mk("div", "sh-pvact");
        if (tier && !own) { const T = tierOf(tier); if (T.earnOnly) act.appendChild(mk("span", "sh-owned", "Earn only")); else { const b = btn("", "alt sm", () => doBuySkin(id)); b.append(mk("small", null, "Buy"), coin(T.price)); act.appendChild(b); } }
        else if (tier && worn) act.appendChild(mk("span", "sh-st eq", "Equipped"));
        else if (tier) act.appendChild(mk("span", "sh-st own", "Owned ✓"));
        row.appendChild(act); info.appendChild(row);
    });
    if (tf && tf === tb && !owns(w, "sf_" + tf) && !owns(w, "bg_" + tf) && !tierOf(tf).earnOnly) {
        const b = btn("", "alt sh-bundle", () => doBundle(tf)); b.append(mk("small", null, tierOf(tf).name + " S" + tierOf(tf).season + " bundle −" + Math.round(SKINS.bundleOff * 100) + "%"), coin(bundlePrice(tf))); info.appendChild(b);
    }
    if (pv.sf != null || pv.bg != null) info.appendChild(btn("Back to my look", "ghost sm", () => { pv.sf = pv.bg = null; hov = null; X.sfx("close"); markOn(); renderPreview(); }));
    info.appendChild(mk("p", "sh-pvnote", "Buying never changes what you wear: equip in the Wardrobe, or with Equip now right after buying."));
    box.appendChild(info);
}
async function doBuySkin(id) {
    const it = itemById(id); if (!(await ask({ title: "Buy " + it.name + "?", text: fmt(it.price) + " AAP Coins. You have " + fmt(bank.coins()) + ".", ok: "Buy" }))) return;
    const r = await bank.apply(intent("buy:" + id), "skin", w => buySkin(w, id));
    if (!r.ok) { X.toast(r.error); return; }
    used("buy:" + id); X.sfx("coin"); bought([id]);
}
async function doBundle(tier) {
    const t = tierOf(tier); if (!(await ask({ title: "Buy the " + t.name + " Season " + t.season + " bundle?", text: "Frame + Background for " + fmt(bundlePrice(tier)) + " AAP Coins (instead of " + fmt(t.price * 2) + ").", ok: "Buy" }))) return;
    const r = await bank.apply(intent("bundle:" + tier), "bundle", w => buyBundle(w, tier));
    if (!r.ok) { X.toast(r.error); return; }
    used("bundle:" + tier); X.sfx("coin"); bought(r.result.items);
}

/* ---------- after a purchase: Equip now / Keep browsing ---------- */
async function equipNow(ids) {
    for (const id of ids) {
        const it = itemById(id); if (!it) continue;
        const r = await bank.apply("equip:" + it.slot + ":" + id + ":" + Date.now(), "equip", w => equip(w, it.slot, id));
        if (!r.ok) { X.toast(r.error); return false; }
    }
    X.setLook(publicLook(bank.get()));
    return true;
}
/* the purchase panel: what you bought on your Arcade Pass, Equip now + Keep browsing */
function bought(ids, o = {}) {
    const items = ids.map(itemById).filter(Boolean);
    const ov = mk("div", "sh-bought"); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Purchase");
    const box = mk("div", "sh-bbox");
    box.appendChild(mk("small", "sh-bk", o.kicker || "PURCHASED"));
    box.appendChild(mk("b", "sh-bname", items.map(i => i.name.replace(/ - Season \d+$/, "")).join(" + ")));
    const over = {}; items.forEach(i => { if (i.slot === "sf") over.sf = i.tier; if (i.slot === "bg") over.bg = i.tier; if (i.slot === "title") over.ttl = i.name; if (i.slot === "ts") over.ts = i.id.slice(3); if (i.slot === "uc") over.uc = i.id.slice(3); });
    const pw = mk("div", "sh-bpass"); pw.appendChild(pass(over)); box.appendChild(pw);
    const note = mk("p", "sh-bnote", "This is how it looks on your Arcade Pass. Equip it now, or later in the Wardrobe (Edit player card).");
    box.appendChild(note);
    const row = mk("div", "sh-brow");
    const eq = btn("Equip now", "alt", async () => {
        eq.disabled = true;
        if (!(await equipNow(ids))) { eq.disabled = false; return; }
        X.sfx("ready"); pw.innerHTML = ""; pw.appendChild(pass({}, "equipped"));
        note.textContent = "Equipped ✓ Everyone in your room sees it now."; eq.remove(); keep.textContent = "Done"; keep.focus();
    });
    const keep = btn("Keep browsing", "ghost", () => close());
    row.append(eq, keep); box.appendChild(row);
    ov.appendChild(box);
    const close = () => { ov.remove(); document.removeEventListener("keydown", onKey, true); pv.sf = pv.bg = null; render(); if (o.onClose) o.onClose(); };
    const onKey = e => { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(); } };
    document.addEventListener("keydown", onKey, true);
    ov.addEventListener("click", e => { if (e.target === ov) close(); });
    ($("shop") || document.body).appendChild(ov);
    setTimeout(() => eq.focus(), 40);
}

/* =========================== SCRATCH CARDS (Season 1 tab only) =========================== */
function scratchSection() {
    const s = mk("section", "sh-scratch"); s.id = "shScratch";
    const h = mk("header", "sh-shead"); h.append(mk("small", null, "SEASON 1 · SCRATCH CARDS"), mk("h2", null, "Scratch cards"), mk("p", null, "Each card wins a title, a title skin or a username style. The better the card, the rarer the prize."));
    s.append(h, scratchView());
    return s;
}
function scratchView() {
    const v = mk("div", "vt-scratch");
    Object.entries(SCRATCH.tiers).forEach(([k, T]) => {
        const c = mk("article", "vt-sct t-" + k + (focus && fromWardrobe() && focus.item && (T.types[(itemById(focus.item) || {}).kind] || 0) > 0 && (T.odds[(itemById(focus.item) || {}).rarity] || 0) > 0 ? " hl" : ""));
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
    const k = "scratch-" + tier, op = intent(k), seed = newSeed();
    const r = await bank.apply(op, "scratch", w => rollScratch(w, tier, seed));
    if (!r.ok) { X.toast(r.error); return; }
    used(k); vaultEvent("scratch", "ev:" + op); scratchReveal(r.result);
}
function prizeEl(res) {
    const it = itemById(res.item), p = mk("div", "sc-prize r-" + res.rarity);
    p.append(mk("small", "sc-kind", KIND_NAME[res.kind] + " · " + res.rarity.toUpperCase()));
    const name = mk("b", "sc-name", it.name);
    if (res.kind === "ucol") name.classList.add("uc", "uc-" + it.id.slice(3)); if (res.kind === "tskin") name.classList.add("ts", "ts-" + it.id.slice(3));
    p.appendChild(name);
    p.appendChild(mk("small", "sc-sub", res.dup ? "Duplicate: +" + res.refund + " coins back" : "New! Equip it now or later in the Wardrobe."));
    return p;
}
function scratchReveal(res) {
    const ov = mk("div", "sc-over"); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Scratch card");
    const card = mk("div", "sc-card t-" + res.tier), prize = prizeEl(res), cv = mk("canvas", "sc-coat");
    card.append(prize, cv);
    const all = btn("Reveal all", "ghost sm"), keep = btn("Keep browsing", "sm");
    const bar = mk("div", "vt-row"); keep.classList.add("hidden");
    const equipB = btn("Equip now", "alt sm"); equipB.classList.add("hidden");
    bar.append(all, equipB, keep);
    ov.append(mk("p", "sc-tip", "Scratch the silver with your finger or mouse"), card, bar);
    ($("shop") || document.body).appendChild(ov);
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
        const scratch = p => { g.lineWidth = Math.max(26, r.width / 9); g.lineCap = "round"; g.beginPath(); g.moveTo((last || p).x, (last || p).y); g.lineTo(p.x, p.y); g.stroke(); last = p; if (++moves % 6 === 0) { X.sfx("scratch"); check(); } };
        const check = () => {
            const d = g.getImageData(0, 0, cv.width, cv.height).data; let clear = 0, n = 0;
            for (let i = 3; i < d.length; i += 4 * 37) { n++; if (d[i] < 40) clear++; }
            if (clear / n > .55) reveal();
        };
        const reveal = () => { if (revealed) return; revealed = true; cv.classList.add("gone"); all.classList.add("hidden"); keep.classList.remove("hidden"); if (!res.dup && ["title", "ts", "uc"].includes(it.slot)) equipB.classList.remove("hidden"); X.sfx(res.rarity === "legendary" ? "legendary" : res.rarity === "epic" ? "epicHit" : "reveal"); };
        cv.addEventListener("pointerdown", e => { down = true; last = null; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); scratch(at(e)); });
        cv.addEventListener("pointermove", e => { if (down) scratch(at(e)); });
        cv.addEventListener("pointerup", () => { down = false; last = null; check(); });
        all.onclick = reveal;
        if (!motionOK()) all.textContent = "Reveal";
    });
    const done = () => { ov.remove(); render(); };
    keep.onclick = done;
    equipB.onclick = async () => {
        equipB.disabled = true;
        if (!(await equipNow([it.id]))) { equipB.disabled = false; return; }
        X.sfx("ready");
        card.replaceWith((() => { const w = mk("div", "sh-bpass sc-equipped"); w.appendChild(pass({}, "equipped")); w.appendChild(mk("p", "sh-bnote", "Equipped ✓ " + it.name + " is on your Arcade Pass.")); return w; })());
        equipB.remove(); keep.textContent = "Done"; keep.focus();
    };
    setTimeout(() => all.focus(), 50);
}
export const _shopTest = { equipNow, bought };
