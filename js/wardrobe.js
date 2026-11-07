/* =====================================================================
   THE WARDROBE ("Edit player card"): every personalization option in one place, with a live preview on the
   credit-card Arcade Pass (profile.js passCard).
     Display name · Profile picture (+ accent colour, upload) · Frame · Background · Title · Title skin ·
     Username style · Card sleeve (Anime TCG)
   Each section lists what you own; what you don't own is greyed out with where to get it ("Get it in the Shop" for
   Shop items, the level or achievement for arcade frames and titles, the series to complete for sleeves).
   Nothing is applied until Save profile; closing (✕, Esc, the backdrop) throws the changes away, as before.
   Equipping happens ONLY here (and through the Shop's "Equip now" shortcut, js/vault/shoppage.js).
   Profile side (name, picture, colour, arcade frame, level title) -> profile.js; Shop side (Season frame /
   background, Shop title, title skin, username style, sleeve) -> the Vault bank's equip slots (shop.js equip).
   ===================================================================== */
import { profile, TITLES, FRAMES, ACH, COLORS, isUnlocked, titleName, levelOf, cleanAvatar, avatarEl, passCard, galleryTabs, galleryFor, shrinkImage, commitProfile } from "./profile.js?v=9";
import { bank } from "./vault/vault.js?v=11";
import { SKIN_ITEMS, SCRATCH_ITEMS, itemById, owns, equip, publicLook } from "./vault/shop.js?v=8";
import { SKINS } from "./vault/config.js?v=10";
import { CARD_SERIES } from "./vault/carddb.js?v=3";
import { theme } from "./vault/cardui.js?v=7";

const $ = id => document.getElementById(id);
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
let X = { sfx: () => {}, toast: () => {}, openShop: () => {}, closeOverlay: () => {} };
let D = null, picTab = "emblem";
const VSLOTS = ["sf", "bg", "title", "ts", "uc", "sleeve"];
const tierName = t => (SKINS.tiers.find(x => x.id === t) || {}).name || t;
const short = it => it.name.replace(/ - Season \d+$/, "").replace(/ (Frame|Background)$/, "");

export function initWardrobe(ctx) { X = Object.assign(X, ctx); }

/* the draft: profile fields + Shop equip slots, from what is saved now */
export function openWardrobe() {
    const P = profile.get(), e = bank.get().equip || {}, w = bank.get(), ok = id => id && owns(w, id) ? id : "";
    D = { name: P.name || "", av: JSON.parse(JSON.stringify(P.av || null)), col: P.col, fr: P.fr || "none", ttl: P.ttl || "rookie" };
    VSLOTS.forEach(k => { D[k] = ok(e[k]); });
    D.v0 = VSLOTS.map(k => D[k]).join("|");
    render();
}
/* the look the draft gives (what the lobby would show) */
function lookOf() {
    const P = profile.get();
    return { name: D.name || "Player", av: cleanAvatar(D.av) || P.av, col: D.col, fr: D.sf ? "none" : D.fr, lvl: levelOf(P.xp).lvl,
        sf: D.sf.replace(/^sf_/, ""), bg: D.bg.replace(/^bg_/, ""), ts: D.ts.replace(/^ts_/, ""), uc: D.uc.replace(/^uc_/, ""),
        ttl: D.title ? itemById(D.title).name : titleName(D.ttl) };
}
function preview() {
    const box = $("wardPreview"); if (!box || !D) return;
    box.innerHTML = ""; box.appendChild(passCard(lookOf(), { xp: levelOf(profile.get().xp), cls: "pass-preview" }));
}
const touch = (full) => { X.sfx("pick"); if (full) render(); else preview(); };

/* one choice tile (owned / locked) */
function choice({ on, locked, label, art, why, shop, onPick, cls }) {
    const b = mk("button", "wd-opt" + (on ? " on" : "") + (locked ? " locked" : "") + (cls ? " " + cls : "")); b.type = "button";
    if (art) b.appendChild(art);
    const l = mk("span", "wd-lbl"); if (label instanceof Node) l.appendChild(label); else l.textContent = label; b.appendChild(l);
    b.setAttribute("aria-pressed", String(!!on));
    if (locked) {
        b.setAttribute("aria-disabled", "true");
        const w = mk("small", "wd-why", why || "Locked"); b.appendChild(w);
        if (shop) { const a = mk("span", "wd-shop", "Get it in the Shop ›"); b.appendChild(a); b.title = "Get it in the Shop"; b.onclick = () => goShop(shop); }
        else b.onclick = () => X.toast(why || "Locked");
    } else b.onclick = onPick;
    return b;
}
function goShop(where) {
    X.sfx("click"); X.closeOverlay("profile");
    setTimeout(() => X.openShop(where), 60);
}
function section(title, sub, body) {
    const s = mk("section", "wd-sec"); const h = mk("header", "wd-h"); h.append(mk("b", null, title)); if (sub) h.appendChild(mk("small", null, sub)); s.append(h, body); return s;
}

function render() {
    const body = $("wardBody"); if (!body || !D) return;
    const w = bank.get(), y = body.scrollTop; body.innerHTML = "";
    // display name
    const nm = mk("input", "wd-name"); nm.id = "profName"; nm.maxLength = 20; nm.placeholder = "Your name"; nm.autocomplete = "nickname"; nm.value = D.name; nm.setAttribute("aria-label", "Display name");
    nm.oninput = () => { D.name = nm.value.trim().slice(0, 20); preview(); };
    body.appendChild(section("Display name", "shown on your Arcade Pass and in every room", nm));
    // profile picture + accent colour
    const pic = mk("div", "wd-pic");
    const tabs = mk("div", "ava-tabs"); tabs.setAttribute("role", "tablist");
    galleryTabs().forEach(([k, l]) => { const b = mk("button", "ava-tab" + (k === picTab ? " on" : ""), l); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(k === picTab)); b.onclick = () => { picTab = k; render(); }; tabs.appendChild(b); });
    const grid = mk("div", "ava-grid"); grid.appendChild(mk("div", "anime-hint", "Loading…"));
    fillGrid(grid, picTab);
    const up = mk("div", "ava-upload"), lab = mk("label", "btn ghost sm", "Upload your own"), inp = mk("input"); lab.htmlFor = "avaFile"; inp.id = "avaFile"; inp.type = "file"; inp.accept = "image/*"; inp.hidden = true;
    inp.onchange = async () => { const f = inp.files && inp.files[0]; inp.value = ""; if (!f) return; if (!/^image\//.test(f.type) || f.size > 12 * 1024 * 1024) { X.toast("Pick an image file (under 12 MB)."); return; } try { D.av = { t: "i", d: await shrinkImage(f) }; touch(true); } catch (e) { X.toast("Couldn't read that image."); } };
    up.append(lab, inp, mk("span", "anime-hint", "Square crop, shrunk to a tiny file."));
    const sw = mk("div", "swatches"); COLORS.forEach(c => { const b = mk("button", "swatch" + (c === D.col ? " on" : "")); b.type = "button"; b.style.background = c; b.setAttribute("aria-label", "Accent colour " + c); b.onclick = () => { D.col = c; if (D.av && D.av.t === "g") D.av.c = c; touch(true); }; sw.appendChild(b); });
    pic.append(tabs, grid, up, mk("span", "field-label", "Accent colour"), sw);
    body.appendChild(section("Profile picture", "pick one or upload your own", pic));
    // frame: Season 1 frames (Shop) + arcade frames (levels, achievements)
    const fr = mk("div", "wd-opts");
    fr.appendChild(choice({ on: !D.sf && D.fr === "none", label: "No frame", art: avatarEl(Object.assign(lookOf(), { sf: "", fr: "none" }), { size: 46 }), onPick: () => { D.sf = ""; D.fr = "none"; touch(true); } }));
    SKIN_ITEMS.filter(i => i.kind === "frame").forEach(i => {
        const own = owns(w, i.id);
        fr.appendChild(choice({ on: D.sf === i.id, locked: !own, label: tierName(i.tier), art: avatarEl(Object.assign(lookOf(), { sf: i.tier }), { size: 46 }), why: i.earnOnly || SKINS.earnOnly.includes(i.tier) ? "Earned, not sold" : "Season 1 · Shop", shop: i.earnOnly ? null : { tab: "skins", tier: i.tier }, onPick: () => { D.sf = i.id; touch(true); } }));
    });
    FRAMES.filter(f => f.id !== "none").forEach(f => {
        const ok = isUnlocked(f); if (f.hidden && !ok) return;
        fr.appendChild(choice({ on: !D.sf && D.fr === f.id, locked: !ok, label: f.name, art: avatarEl(Object.assign(lookOf(), { sf: "", fr: f.id }), { size: 46 }), why: f.ach ? "Unlock: " + ((ACH.find(a => a.id === f.ach) || {}).name || "an achievement") : "Reach LV " + f.lvl, cls: "arcade", onPick: () => { D.sf = ""; D.fr = f.id; touch(true); } }));
    });
    body.appendChild(section("Frame", "the ring around your picture · Season 1 frames come from the Shop, arcade frames from levels and achievements", fr));
    // background
    const bgs = mk("div", "wd-opts wide");
    const mini = tier => { const m = mk("div", "wd-bgmini"); m.appendChild(passCard(Object.assign(lookOf(), { bg: tier, sf: "" }), { cls: "pass-mini" })); return m; };
    bgs.appendChild(choice({ on: !D.bg, label: "Arcade default", art: mini(""), onPick: () => { D.bg = ""; touch(true); } }));
    SKIN_ITEMS.filter(i => i.kind === "bg").forEach(i => {
        const own = owns(w, i.id);
        bgs.appendChild(choice({ on: D.bg === i.id, locked: !own, label: tierName(i.tier), art: mini(i.tier), why: "Season 1 · Shop", shop: i.earnOnly ? null : { tab: "skins", tier: i.tier }, onPick: () => { D.bg = i.id; touch(true); } }));
    });
    body.appendChild(section("Background", "covers your whole Arcade Pass and your lobby card", bgs));
    // title: level / achievement titles + Shop (scratch card) titles
    const tl = mk("div", "wd-opts pills");
    TITLES.forEach(t => {
        const ok = isUnlocked(t); if (t.hidden && !ok) return;
        tl.appendChild(choice({ on: !D.title && D.ttl === t.id, locked: !ok, label: t.name, why: t.ach ? "Unlock: " + ((ACH.find(a => a.id === t.ach) || {}).name || "an achievement") : "Reach LV " + t.lvl, cls: "pill", onPick: () => { D.title = ""; D.ttl = t.id; touch(true); } }));
    });
    SCRATCH_ITEMS.filter(i => i.kind === "title").forEach(i => {
        const own = owns(w, i.id);
        tl.appendChild(choice({ on: D.title === i.id, locked: !own, label: i.name, why: i.rarity[0].toUpperCase() + i.rarity.slice(1) + " · scratch cards", shop: { tab: "scratch" }, cls: "pill r-" + i.rarity, onPick: () => { D.title = i.id; touch(true); } }));
    });
    body.appendChild(section("Title", "under your name · level titles unlock as you play, the rest come from Shop scratch cards", tl));
    // title skins + username styles
    [["ts", "Title skins", "tskin", "the colour and effect of your title", t => { const s = mk("span", "ts ts-" + t.id.slice(3), t.name); return s; }],
     ["uc", "Username styles", "ucol", "the colour and effect of your name", t => { const s = mk("span", "uc uc-" + t.id.slice(3), t.name); return s; }]].forEach(([slot, title, kind, sub, lbl]) => {
        const row = mk("div", "wd-opts pills");
        row.appendChild(choice({ on: !D[slot], label: "None", cls: "pill", onPick: () => { D[slot] = ""; touch(true); } }));
        SCRATCH_ITEMS.filter(i => i.kind === kind).forEach(i => {
            const own = owns(w, i.id);
            row.appendChild(choice({ on: D[slot] === i.id, locked: !own, label: lbl(i), why: i.rarity[0].toUpperCase() + i.rarity.slice(1) + " · scratch cards", shop: { tab: "scratch" }, cls: "pill r-" + i.rarity, onPick: () => { D[slot] = i.id; touch(true); } }));
        });
        body.appendChild(section(title, sub, row));
    });
    // card sleeves (Anime TCG): unlocked by completing a series
    const sl = mk("div", "wd-opts pills");
    sl.appendChild(choice({ on: !D.sleeve, label: "Classic back", cls: "pill", onPick: () => { D.sleeve = ""; touch(true); } }));
    CARD_SERIES.forEach(s => {
        const id = "sl_" + s, own = owns(w, id);
        sl.appendChild(choice({ on: D.sleeve === id, locked: !own, label: theme(s).label, why: "Complete the series in Anime TCG", cls: "pill", onPick: () => { D.sleeve = id; touch(true); } }));
    });
    body.appendChild(section("Card sleeves", "the back of your Anime TCG cards", sl));
    // your record (not editable): achievements + Night Party
    const rec = mk("div", "wd-rec");
    const ach = mk("div", "ach-grid");
    ACH.forEach(a => { const got = profile.has(a.id), secret = a.hidden && !got, d = mk("div", "ach" + (got ? " got" : "")); d.title = secret ? "A secret" : a.desc; d.append(mk("span", "ach-i", got ? a.icon : secret ? "❔" : "🔒"), mk("b", null, secret ? "???" : a.name), mk("small", null, secret ? "Hidden achievement" : a.desc)); ach.appendChild(d); });
    const N = profile.nightParty(), np = mk("div", "pnp"); np.id = "profNp";
    const npt = mk("div", "pnp-top"); npt.append(mk("b", null, String(N.won | 0)), mk("small", null, "Tournaments won"), mk("b", null, String(N.played | 0)), mk("small", null, "Played")); np.appendChild(npt);
    if (!N.hist.length) np.appendChild(mk("p", "anime-hint", "No Night Party yet. Pick NIGHT PARTY in a room's lobby to host one."));
    N.hist.forEach(h => { const r = mk("div", "pnp-row" + (h.won ? " won" : "")), l = mk("div"); l.append(mk("b", null, (h.won ? "🏆 " : "") + h.name), mk("small", null, "Winner: " + (h.winner || "?") + (h.reward ? " · " + h.reward : ""))); r.append(l, mk("time", null, new Date(h.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }))); np.appendChild(r); });
    rec.append(mk("span", "field-label", "Achievements"), ach, mk("span", "field-label", "Night Party"), np);
    body.appendChild(section("Your record", null, rec));
    body.scrollTop = y;
    preview();
}
async function fillGrid(box, want) {
    const items = await galleryFor(want); if (want !== picTab || !box.isConnected) return;
    box.innerHTML = "";
    items.forEach(it => {
        const b = mk("button", "ava-pick"); b.type = "button"; b.setAttribute("aria-label", it.label || "Avatar");
        if (JSON.stringify(cleanAvatar(it.av)) === JSON.stringify(cleanAvatar(D.av))) b.classList.add("on");
        b.appendChild(avatarEl({ name: D.name, av: it.av, col: D.col, fr: "none" }, { size: 64 }));
        b.onclick = () => { D.av = JSON.parse(JSON.stringify(it.av)); if (D.av.t === "g") D.col = D.av.c; X.sfx("pick"); box.querySelectorAll(".ava-pick").forEach(x => x.classList.remove("on")); b.classList.add("on"); preview(); };
        box.appendChild(b);
    });
    if (!items.length) box.textContent = "No pictures for this series yet.";
}

/* Save profile: the profile side, then every Shop slot that changed (owned items only), then the public look */
export async function saveWardrobe() {
    if (!D) return false;
    const r = commitProfile(D);
    if (r.error) { X.toast(r.error); const n = $("profName"); if (n) n.focus(); return false; }
    const e = bank.get().equip || {};
    for (const k of VSLOTS) {
        if ((e[k] || "") === D[k]) continue;
        const res = await bank.apply("equip:" + k + ":" + (D[k] || "none") + ":" + Date.now(), "equip", w => equip(w, k, D[k]));
        if (!res.ok) { X.toast(res.error || "Couldn't equip that."); }
    }
    const look = publicLook(bank.get()), P = profile.get();
    if (["sf", "bg", "ts", "uc", "vtn"].some(k => (P[k] || "") !== (look[k] || ""))) profile.update(look);
    D = null;
    return true;
}
export const wardrobeDraft = () => D;
