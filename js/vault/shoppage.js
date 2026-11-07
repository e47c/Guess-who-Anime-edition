/* =====================================================================
   THE SHOP: its own section (not a game mode, not in the Vault / Anime TCG). A full-screen sheet over the main menu
   or the lobby, so closing it puts you back exactly where you were (room, friends, state intact).
     Season 1 skins: each tier as a Frame and a Background, bundle discount (prices in config.js SKINS)
     Scratch cards: Basic, Silver, Gold -> titles, title skins, username styles (odds / refunds in config.js SCRATCH)
   BUYING and EQUIPPING are separate: the Shop buys, the Wardrobe equips. After every purchase (and every new scratch
   prize) the "Equip now" shortcut sits next to "Keep browsing": it equips the item in the right slot at once and
   shows the result on the Arcade Pass preview. The try-on and every preview is the credit-card Arcade Pass.
   Every purchase is an intent sent to the bank (bank.apply with an operation id): a double click never pays twice.
   ===================================================================== */
import { SKINS, SCRATCH } from "./config.js?v=11";
import { SKIN_ITEMS, SCRATCH_ITEMS, KIND_NAME, itemById, owns, bundlePrice, buySkin, buyBundle, rollScratch, equip, publicLook } from "./shop.js?v=9";
import { bank, vaultEvent } from "./vault.js?v=13";
import { newSeed } from "./rng.js?v=1";
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

let view = "skins";
const pv = { sf: null, bg: null };          // what's being tried on (null = what you wear now, "" = none)
const tierOf = id => SKINS.tiers.find(t => t.id === id);
const lookWith = over => Object.assign({}, X.profilePub(), publicLook(bank.get()), over || {});
const pass = (over, cls) => X.passCard(lookWith(over), { xp: X.level(), cls: "pass-preview" + (cls ? " " + cls : "") });

export function initShop(ctx) {
    X = Object.assign(X, ctx);
    window.openShop = openShop; window.shopBack = closeShop;
    bank.onChange(() => { if (isOpen()) render(); });
    const o = $("shop"); if (o) o.addEventListener("click", e => { if (e.target === o) closeShop(); });
}
export const isOpen = () => !!$("shop") && !$("shop").classList.contains("hidden");
/* where = { tab: "skins" | "scratch", tier, slot, sct (scratch tier), from: "wardrobe", name }
   The Wardrobe's "Get in Shop" button comes in with the item: the Shop opens on it (a skin tried on, or the scratch
   cards that can win it highlighted) ABOVE the Wardrobe, so "‹ Wardrobe" (or ✕ / Esc) goes straight back to it. */
let focus = null;
const fromWardrobe = () => !!$("profile") && !$("profile").classList.contains("hidden");
export function openShop(where) {
    where = where && typeof where === "object" ? where : {};
    if (where.tab === "scratch" || where.tab === "skins") view = where.tab;
    pv.sf = null; pv.bg = null;
    if (where.tier && tierOf(where.tier)) { if (where.slot === "bg") pv.bg = where.tier; else pv.sf = where.tier; }
    focus = where.from === "wardrobe" && where.name ? { name: where.name, tab: view, sct: where.sct || null, item: where.item || null } : null;
    const back = $("shopBack"); if (back) back.textContent = fromWardrobe() ? "‹ Wardrobe" : X.inRoom() ? "‹ Lobby" : "‹ Menu";
    X.sfx("start"); render(); X.openOverlay("shop");
    const b = $("shopBody"); if (b) b.scrollTop = 0;
    const target = where.tier ? '#shopBody .vt-tier.tier-' + where.tier : where.sct ? '#shopBody .vt-sct.t-' + where.sct : "";
    if (target) setTimeout(() => { const t = document.querySelector(target); if (t && t.scrollIntoView) t.scrollIntoView({ block: "center", behavior: motionOK() ? "smooth" : "auto" }); }, 80);
}
/* "You came here for ..." line at the top of the Shop, when the Wardrobe sent you */
function focusBar() {
    if (!focus || focus.tab !== view) return null;
    const d = mk("div", "sh-focus"), it = focus.item ? itemById(focus.item) : null;
    d.append(mk("small", null, "FROM YOUR WARDROBE"), mk("b", null, focus.name));
    d.appendChild(mk("span", null, view === "scratch" ? (it && owns(bank.get(), it.id) ? "You own it now. Go back to the Wardrobe to equip it." : "Won from the highlighted scratch cards (the prize is random).") : "Tried on below. Buy it, then tap Equip now or equip it back in the Wardrobe."));
    const back = btn("‹ Back to the Wardrobe", "ghost sm", () => closeShop()); d.appendChild(back);
    return d;
}
export function closeShop() { pv.sf = pv.bg = null; X.closeOverlay("shop"); }
export function shopView() { return view; }

function render() {
    const body = $("shopBody"), nav = $("shopTabs"); if (!body || !nav) return;
    nav.innerHTML = "";
    [["skins", "Season 1 skins", "◆"], ["scratch", "Scratch cards", "✦"]].forEach(([k, l, ico]) => {
        const b = mk("button", "sh-tab" + (k === view ? " on" : "")); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(k === view));
        b.append(mk("i", null, ico), mk("span", null, l)); b.onclick = () => { if (view === k) return; view = k; X.sfx("toggle"); render(); body.scrollTop = 0; };
        nav.appendChild(b);
    });
    const y = body.scrollTop; body.innerHTML = "";
    const fb = fromWardrobe() ? focusBar() : null; if (fb) body.appendChild(fb);
    body.appendChild(view === "scratch" ? scratchView() : skinsView());
    body.scrollTop = y;
    const bal = $("shopBal"); if (bal) bal.textContent = fmt(bank.coins());
}

/* =========================== SEASON 1 SKINS =========================== */
const nameOf = (slot, tier) => tier ? tierOf(tier).name + (slot === "sf" ? " Frame" : " Background") : (slot === "sf" ? "No frame" : "No background");
function skinsView() {
    const w = bank.get(), v = mk("div", "vt-skins sh-skins"), cur = publicLook(w);
    const tf = pv.sf == null ? cur.sf : pv.sf, tb = pv.bg == null ? cur.bg : pv.bg;
    const top = mk("section", "vt-tryon sh-tryon");
    const pw = mk("div", "sh-passwrap"); pw.appendChild(pass({ sf: tf, bg: tb })); top.appendChild(pw);
    const side = mk("div", "vt-tryside");
    side.appendChild(mk("b", "vt-trytitle", "Try-on"));
    side.appendChild(mk("p", "vt-seatcap", "Your Arcade Pass with the picked frame and background (the lobby card shows the same). Tap Frame or Background on any tier to try it; mix them freely. Buying never changes what you wear: equip in the Wardrobe, or with Equip now right after buying."));
    [["sf", tf], ["bg", tb]].forEach(([slot, tier]) => {
        const row = mk("div", "vt-tryrow"), id = (slot === "sf" ? "sf_" : "bg_") + tier, own = !tier || owns(w, id), worn = (slot === "sf" ? cur.sf : cur.bg) === tier;
        row.append(mk("small", null, slot === "sf" ? "FRAME" : "BACKGROUND"), mk("b", null, nameOf(slot, tier)));
        const act = mk("div", "vt-tryact");
        if (tier && !own) { if (SKINS.earnOnly.includes(tier)) act.appendChild(mk("span", "vt-owned", "Earn only")); else { const b = btn("", "alt sm", () => doBuySkin(id)); b.append(mk("small", null, "Buy"), coin(tierOf(tier).price)); act.appendChild(b); } }
        else if (tier && worn) act.appendChild(mk("span", "vt-owned", "Wearing ✓"));
        else if (tier) act.appendChild(mk("span", "vt-owned", "Owned ✓ · equip in the Wardrobe"));
        row.appendChild(act); side.appendChild(row);
    });
    if (tf && tf === tb && !owns(w, "sf_" + tf) && !owns(w, "bg_" + tf) && !SKINS.earnOnly.includes(tf)) {
        const b = btn("", "alt", () => doBundle(tf)); b.append(mk("small", null, tierOf(tf).name + " bundle −" + Math.round(SKINS.bundleOff * 100) + "%"), coin(bundlePrice(tf))); side.appendChild(b);
    }
    if (pv.sf != null || pv.bg != null) side.appendChild(btn("Back to my look", "ghost sm", () => { pv.sf = pv.bg = null; X.sfx("close"); render(); }));
    top.appendChild(side);
    v.appendChild(top);
    const grid = mk("div", "vt-tiers");
    SKINS.tiers.forEach(t => {
        const fId = "sf_" + t.id, bId = "bg_" + t.id, of = owns(w, fId), ob = owns(w, bId), earn = SKINS.earnOnly.includes(t.id);
        const c = mk("article", "vt-tier tier-" + t.id + (tf === t.id || tb === t.id ? " on" : ""));
        const h = mk("header"); h.append(mk("b", null, t.name), mk("small", null, "Season " + SKINS.season)); c.appendChild(h);
        const tiles = mk("div", "vt-ttiles");
        const fTile = mk("button", "vt-ttile" + (tf === t.id ? " on" : "")); fTile.type = "button"; fTile.setAttribute("aria-label", "Try the " + t.name + " Frame");
        fTile.append(X.avatarEl(lookWith({ sf: t.id }), { size: 64 }), mk("small", null, "Frame"));
        fTile.onclick = () => { pv.sf = tf === t.id ? (cur.sf === t.id ? "" : null) : t.id; X.sfx("pick"); render(); };
        const bTile = mk("button", "vt-ttile vt-tbg" + (tb === t.id ? " on" : "")); bTile.type = "button"; bTile.setAttribute("aria-label", "Try the " + t.name + " Background");
        const mini = mk("div", "sh-minipass"); mini.appendChild(X.passCard(lookWith({ bg: t.id, sf: "" }), { cls: "pass-mini" })); bTile.append(mini, mk("small", null, "Background"));
        bTile.onclick = () => { pv.bg = tb === t.id ? (cur.bg === t.id ? "" : null) : t.id; X.sfx("pick"); render(); };
        tiles.append(fTile, bTile); c.appendChild(tiles);
        const row = mk("div", "vt-tbuy");
        const buyOne = (id, label, price, own) => {
            if (own) return mk("span", "vt-owned", label + " ✓");
            if (earn) return mk("span", "vt-owned", label + ": earn only");
            const b = btn("", "ghost sm", () => doBuySkin(id)); b.append(mk("small", null, label), coin(price)); return b;
        };
        row.append(buyOne(fId, "Frame", t.price, of), buyOne(bId, "Background", t.price, ob));
        if (!of && !ob && !earn) { const b = btn("", "alt sm", () => doBundle(t.id)); b.append(mk("small", null, "Both −" + Math.round(SKINS.bundleOff * 100) + "%"), coin(bundlePrice(t.id))); row.appendChild(b); }
        c.appendChild(row); grid.appendChild(c);
    });
    v.appendChild(grid);
    v.appendChild(mk("p", "vt-rule", "Each tier comes as a Frame (the animated ring around your picture) and a Background (your whole Arcade Pass and lobby card). Wear any frame with any background; everyone in the room sees both. Buying both of a tier together is " + Math.round(SKINS.bundleOff * 100) + "% off. Cosmetics can't be traded or gifted; if you ever get one twice (future rewards) you get " + Math.round(SKINS.dupRefund * 100) + "% of its price back."));
    return v;
}
async function doBuySkin(id) {
    const it = itemById(id); if (!(await ask({ title: "Buy " + it.name + "?", text: fmt(it.price) + " AAP Coins. You have " + fmt(bank.coins()) + ".", ok: "Buy" }))) return;
    const r = await bank.apply(intent("buy:" + id), "skin", w => buySkin(w, id));
    if (!r.ok) { X.toast(r.error); return; }
    used("buy:" + id); X.sfx("coin"); bought([id]);
}
async function doBundle(tier) {
    const t = tierOf(tier); if (!(await ask({ title: "Buy the " + t.name + " bundle?", text: "Frame + Background for " + fmt(bundlePrice(tier)) + " AAP Coins (instead of " + fmt(t.price * 2) + ").", ok: "Buy" }))) return;
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

/* =========================== SCRATCH CARDS =========================== */
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
