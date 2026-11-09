/* =====================================================================
   THE WARDROBE ("Edit player card"): every personalization option, one category per tab, with a live preview on the
   credit-card Arcade Pass (profile.js passCard) that stays in view while you switch tabs.
     Profile (name, picture, accent colour) · Frames · Backgrounds · Titles · Title Skins · Username Styles ·
     Card Sleeves (Anime TCG) · Achievements (your record, not editable)
   Every category is a grid of item cards with its own preview art, an "Equipped" badge on the current one and an
   "owned / total" count on its tab.
   OWNED item: a tap equips it (in the draft). LOCKED item: greyed out with a lock, but a tap still selects it and
   shows it on the pass ("Preview only") with its name, rarity, how to get it and its price if the Shop sells it.
   The only way to the Shop is the separate "Get in Shop" button: the Shop opens ON that item, on top of the
   Wardrobe, and its back button ("‹ Wardrobe", Esc, ✕) brings you back here with your unsaved changes intact.
   Nothing is applied until Save profile; closing the Wardrobe (✕, Esc, the backdrop) throws the changes away.
   Equipping happens ONLY here (and through the Shop's "Equip now" shortcut, js/vault/shoppage.js, which the
   draft picks up if the Wardrobe is open underneath).
   Profile side (name, picture, colour, arcade frame, level title) -> profile.js; Shop side (Season frame /
   background, Shop title, title skin, username style, sleeve) -> the Vault bank's equip slots (shop.js equip).
   ===================================================================== */
import { profile, TITLES, FRAMES, ACH, COLORS, isUnlocked, titleName, levelOf, cleanAvatar, avatarEl, passCard, galleryTabs, galleryFor, shrinkImage, commitProfile } from "./profile.js?v=20";
import { bank } from "./vault/vault.js?v=24";
import { SKIN_ITEMS, SCRATCH_ITEMS, itemById, owns, equip, publicLook, tierInfo, seasonLive } from "./vault/shop.js?v=19";
import { SKINS, SCRATCH } from "./vault/config.js?v=21";
import { CARD_SERIES } from "./vault/carddb.js?v=6";
import { requestTilt } from "./skins3.js?v=3";
import { theme, backCard } from "./vault/cardui.js?v=20";

const $ = id => document.getElementById(id);
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
let X = { sfx: () => {}, toast: () => {}, openShop: () => {}, closeOverlay: () => {}, uid: () => "" };
let D = null, picTab = "emblem", tab = "profile", sel = null, lastSig = "";
const VSLOTS = ["sf", "bg", "title", "ts", "uc", "sleeve"];
const TABS = [
    { id: "profile", name: "Profile" }, { id: "frames", name: "Frames" }, { id: "bgs", name: "Backgrounds" }, { id: "titles", name: "Titles" },
    { id: "tskins", name: "Title Skins" }, { id: "ustyles", name: "Username Styles" }, { id: "sleeves", name: "Card Sleeves" }, { id: "ach", name: "Achievements" }
];
const tierName = t => (tierInfo(t) || {}).name || t;
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : "";
const fmt = n => Number(n || 0).toLocaleString("en-US");
const achName = id => (ACH.find(a => a.id === id) || {}).name || "an achievement";
const isOpen = () => !!$("profile") && !$("profile").classList.contains("hidden");

export function initWardrobe(ctx) {
    X = Object.assign(X, ctx);
    // the Shop (opened from here, on top) can buy or "Equip now": pick that up without losing the draft
    bank.onChange(() => { if (!D || !isOpen()) return; syncEquip(); render(); });
}

/* the draft: profile fields + Shop equip slots, from what is saved now */
export function openWardrobe() {
    const P = profile.get(), w = bank.get(), e = w.equip || {}, ok = id => id && owns(w, id) ? id : "";
    lastSig = "";
    D = { name: P.name || "", av: JSON.parse(JSON.stringify(P.av || null)), col: P.col, fr: P.fr || "none", ttl: P.ttl || "rookie", e0: {} };
    VSLOTS.forEach(k => { D[k] = ok(e[k]); D.e0[k] = e[k] || ""; });
    if (!D.name) tab = "profile";           // "pick a display name first" lands on the name
    sel = null;
    render();
}
/* an equip slot changed outside the Wardrobe (the Shop's Equip now): the draft follows it */
function syncEquip() {
    const e = bank.get().equip || {};
    VSLOTS.forEach(k => { const v = e[k] || ""; if (v !== D.e0[k]) { D.e0[k] = v; D[k] = v; } });
}
/* the look the draft gives (what the lobby would show), with an optional override (a locked item being previewed) */
function lookOf(over) {
    const P = profile.get();
    const look = { name: D.name || "Player", av: cleanAvatar(D.av) || P.av, col: D.col, fr: D.sf ? "none" : D.fr, lvl: levelOf(P.xp).lvl,
        sf: D.sf.replace(/^sf_/, ""), bg: D.bg.replace(/^bg_/, ""), ts: D.ts.replace(/^ts_/, ""), uc: D.uc.replace(/^uc_/, ""),
        ttl: D.title ? itemById(D.title).name : titleName(D.ttl) };
    return Object.assign(look, over || {});
}

/* ---------------- the catalogue, per tab ----------------
   item = { key, name, grade (rarity / tier label), owned, on (equipped in the draft), def (a default, not counted),
            how (how to get it), price (Shop price), shop (where the Shop opens), pick (equip in the draft),
            over (look override for the preview), art () -> element, big () -> larger art for the panel } */
const scratchTiers = it => Object.entries(SCRATCH.tiers).filter(([, T]) => (T.types[it.kind] || 0) > 0 && (T.odds[it.rarity] || 0) > 0);
function scratchItem(it, w, slot, over, art) {
    const tiers = scratchTiers(it), own = owns(w, it.id);
    return { key: it.id, name: it.name, grade: cap(it.rarity), rar: it.rarity, owned: own, on: D[slot] === it.id,
        how: tiers.length ? "Won from Shop scratch cards (" + tiers.map(([, T]) => T.name).join(", ") + ")" : "Won from Shop scratch cards",
        price: tiers.length ? tiers.map(([, T]) => T.name + " " + fmt(T.price)).join(" · ") : null, priceNote: "per scratch card, the prize is random",
        shop: { tab: "scratch", item: it.id, sct: tiers.length ? tiers[0][0] : null }, pick: () => { D[slot] = it.id; }, over, art };
}
function plate(name, title, look) {      // a mini name plate: the name and title as the pass shows them
    const p = mk("span", "wd-plate"), n = mk("b", "wd-pn", name), t = mk("small", "wd-pt", title);
    if (look.uc) n.classList.add("uc", "uc-" + look.uc); if (look.ts) t.classList.add("ts", "ts-" + look.ts);
    p.append(n, t); return p;
}
function itemsFor(id) {
    const w = bank.get(), L = lookOf();
    const ava = over => () => avatarEl(lookOf(over), { size: 54 });
    const mini = over => () => { const m = mk("div", "wd-bgmini"); m.appendChild(passCard(lookOf(over), { cls: "pass-mini" })); return m; };
    const plateOf = over => () => { const l = lookOf(over); return plate(l.name, l.ttl, l); };
    if (id === "frames") {
        const out = [{ key: "none", name: "No frame", grade: "Default", owned: true, def: true, on: !D.sf && D.fr === "none", how: "Always yours", over: { sf: "", fr: "none" }, pick: () => { D.sf = ""; D.fr = "none"; } }];
        SKIN_ITEMS.filter(i => i.kind === "frame" && seasonLive(i.season)).forEach(i => out.push({ key: i.id, name: tierName(i.tier) + " Frame", grade: tierName(i.tier) + " tier · Season " + i.season, group: "Season " + i.season, owned: owns(w, i.id), on: D.sf === i.id,
            how: i.earnOnly ? "Earned, not sold" : "Sold in the Shop (Season " + i.season + " tab)", price: i.earnOnly ? null : i.price, shop: i.earnOnly ? null : { tab: "skins", tier: i.tier, slot: "sf" },
            over: { sf: i.tier }, pick: () => { D.sf = i.id; } }));
        FRAMES.filter(f => f.id !== "none").forEach(f => {
            const ok = isUnlocked(f); if (f.hidden && !ok) return;
            out.push({ key: "fr_" + f.id, name: f.name, grade: "Arcade frame", group: "Arcade frames", owned: ok, on: !D.sf && D.fr === f.id, how: f.ach ? "Unlock the achievement “" + achName(f.ach) + "”" : "Reach level " + f.lvl,
                over: { sf: "", fr: f.id }, pick: () => { D.sf = ""; D.fr = f.id; } });
        });
        out.forEach(o => { o.art = ava(o.over); });
        return out;
    }
    if (id === "bgs") {
        const out = [{ key: "none", name: "Arcade default", grade: "Default", owned: true, def: true, on: !D.bg, how: "Always yours", over: { bg: "" }, pick: () => { D.bg = ""; } }];
        SKIN_ITEMS.filter(i => i.kind === "bg" && seasonLive(i.season)).forEach(i => out.push({ key: i.id, name: tierName(i.tier) + " Background", grade: tierName(i.tier) + " tier · Season " + i.season, group: "Season " + i.season, owned: owns(w, i.id), on: D.bg === i.id,
            how: i.earnOnly ? "Earned, not sold" : "Sold in the Shop (Season " + i.season + " tab)", price: i.earnOnly ? null : i.price, shop: i.earnOnly ? null : { tab: "skins", tier: i.tier, slot: "bg" },
            over: { bg: i.tier }, pick: () => { D.bg = i.id; } }));
        out.forEach(o => { o.art = mini(Object.assign({ sf: "" }, o.over)); });
        return out;
    }
    if (id === "titles") {
        const out = [];
        TITLES.forEach(t => {
            const ok = isUnlocked(t); if (t.hidden && !ok) return;
            out.push({ key: "tt_" + t.id, name: t.name, grade: t.ach ? "Achievement title" : "Level title", owned: ok, def: t.id === "rookie", on: !D.title && D.ttl === t.id,
                how: t.ach ? "Unlock the achievement “" + achName(t.ach) + "”" : t.lvl > 1 ? "Reach level " + t.lvl : "Always yours", over: { ttl: t.name }, pick: () => { D.title = ""; D.ttl = t.id; } });
        });
        SCRATCH_ITEMS.filter(i => i.kind === "title").forEach(i => out.push(scratchItem(i, w, "title", { ttl: i.name })));
        out.forEach(o => { o.art = plateOf(o.over); });
        return out;
    }
    if (id === "tskins" || id === "ustyles") {
        const slot = id === "tskins" ? "ts" : "uc", kind = id === "tskins" ? "tskin" : "ucol";
        const out = [{ key: "none", name: "None", grade: "Default", owned: true, def: true, on: !D[slot], how: "Always yours", over: { [slot]: "" }, pick: () => { D[slot] = ""; } }];
        SCRATCH_ITEMS.filter(i => i.kind === kind).forEach(i => out.push(scratchItem(i, w, slot, { [slot]: i.id.slice(3) })));
        out.forEach(o => { o.art = plateOf(o.over); });
        return out;
    }
    if (id === "sleeves") {
        const out = [{ key: "none", name: "Classic back", grade: "Default", owned: true, def: true, on: !D.sleeve, how: "Every card shows its own series' back", pick: () => { D.sleeve = ""; },
            art: () => backCard(CARD_SERIES[0], null, "xs"), big: () => backCard(CARD_SERIES[0], null, "sm") }];
        CARD_SERIES.forEach(s => {
            const sid = "sl_" + s;
            out.push({ key: sid, name: theme(s).label, grade: "Card sleeve", owned: owns(w, sid), on: D.sleeve === sid, how: "Complete the " + theme(s).label + " series in Anime TCG",
                pick: () => { D.sleeve = sid; }, art: () => backCard(s, s, "xs"), big: () => backCard(s, s, "sm") });
        });
        return out;
    }
    return [];
}
const counted = list => list.filter(i => !i.def);
function countOf(id) {
    if (id === "profile") return "";
    if (id === "ach") return ACH.filter(a => profile.has(a.id)).length + "/" + ACH.length;
    const l = counted(itemsFor(id)); return l.filter(i => i.owned).length + "/" + l.length;
}

/* ---------------- drawing ---------------- */
function render() {
    if (!D) return;
    renderTabs(); renderBody(); renderSide();
}
function renderTabs() {
    const nav = $("wardTabs"); if (!nav) return;
    nav.innerHTML = "";
    TABS.forEach(t => {
        const b = mk("button", "wd-tab" + (t.id === tab ? " on" : "")); b.type = "button"; b.id = "wdTab-" + t.id;
        b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(t.id === tab)); b.setAttribute("aria-controls", "wardBody");
        b.appendChild(mk("span", "wd-tn", t.name));
        const c = countOf(t.id); if (c) { const k = mk("small", "wd-tc", c); k.setAttribute("aria-label", c.replace("/", " of ") + (t.id === "ach" ? " unlocked" : " owned")); b.appendChild(k); }
        b.onclick = () => setTab(t.id);
        nav.appendChild(b);
    });
    nav.onkeydown = e => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const i = TABS.findIndex(t => t.id === tab), n = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
        e.preventDefault(); setTab(n.id); const b = $("wdTab-" + n.id); if (b) b.focus();
    };
    const on = nav.querySelector(".wd-tab.on");
    if (on) { const l = on.offsetLeft, r = l + on.offsetWidth; if (l < nav.scrollLeft || r > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = Math.max(0, l - (nav.clientWidth - on.offsetWidth) / 2); }
}
function setTab(id) {
    if (id === tab) return;
    tab = id; sel = null; X.sfx("toggle");
    const body = $("wardBody"); if (body) body.scrollTop = 0;
    render();
}
function renderBody() {
    const body = $("wardBody"); if (!body) return;
    const y = body.scrollTop; body.innerHTML = "";
    body.setAttribute("aria-labelledby", "wdTab-" + tab);
    if (tab === "profile") body.appendChild(profileTab());
    else if (tab === "ach") body.appendChild(achTab());
    else body.appendChild(gridTab(tab));
    body.scrollTop = y;
}
const SUBS = {
    frames: "The decoration around your picture. Season 1 and Season 2 frames come from the Shop, arcade frames from levels and achievements.",
    bgs: "Covers your whole Arcade Pass and your lobby card.",
    titles: "Shown under your name. Level titles unlock as you play, the rest are won from Shop scratch cards.",
    tskins: "The colour and effect of your title.",
    ustyles: "The colour and effect of your name.",
    sleeves: "The back of your Anime TCG cards. Complete a series to unlock its sleeve."
};
/* Frames and Backgrounds are grouped under "Season 1" / "Season 2" (and "Arcade frames") headings; the default
   item (No frame / Arcade default) sits on top of the first group */
const GROUP_NOTE = { "Season 1": "The original Shop set", "Season 2": "Realistic materials, frames that reach past your picture", "Season 3": "New: living scenes, frames with an entrance, backgrounds with depth", "Arcade frames": "From levels and achievements" };
function gridTab(id) {
    const wrap = mk("div", "wd-cat"), list = itemsFor(id);
    wrap.appendChild(mk("p", "wd-sub", SUBS[id] || ""));
    const groups = [];
    list.forEach(it => { const g = it.group || (groups.length ? groups[groups.length - 1].name : ""); let G = groups.find(x => x.name === g); if (!G) { G = { name: g, items: [] }; groups.push(G); } G.items.push(it); });
    if (groups.length > 1 && !groups[0].name) { const d = groups.shift(); groups[0].items.unshift(...d.items); }
    groups.forEach(G => {
        if (G.name && groups.length > 1) {
            const own = G.items.filter(i => !i.def), h = mk("header", "wd-gh"); h.dataset.group = G.name;
            h.append(mk("b", null, G.name), mk("small", null, (GROUP_NOTE[G.name] ? GROUP_NOTE[G.name] + " · " : "") + own.filter(i => i.owned).length + "/" + own.length + " owned"));
            wrap.appendChild(h);
        }
        const grid = mk("div", "wd-grid g-" + id); grid.setAttribute("role", "list"); if (G.name) grid.setAttribute("aria-label", G.name);
        G.items.forEach(it => grid.appendChild(itemCard(it)));
        wrap.appendChild(grid);
    });
    return wrap;
}
function itemCard(it) {
    const picked = sel && sel.key === it.key;
    const b = mk("button", "wd-item" + (it.on ? " on" : "") + (!it.owned ? " locked" : "") + (picked ? " sel" : "") + (it.rar ? " r-" + it.rar : "")); b.type = "button";
    b.setAttribute("role", "listitem"); b.dataset.key = it.key;
    const art = mk("span", "wd-art"); if (it.art) art.appendChild(it.art()); b.appendChild(art);
    const skin = !!(it.shop && it.shop.tab === "skins");
    b.append(mk("b", "wd-in", it.name), mk("small", "wd-ig", skin ? (it.owned ? "Owned" : fmt(it.price) + " coins") : it.grade));
    if (it.on) b.appendChild(mk("span", "wd-eq", "Equipped"));
    if (!it.owned) { const l = mk("span", "wd-lock", "🔒"); l.setAttribute("aria-hidden", "true"); b.appendChild(l); }
    b.setAttribute("aria-label", it.name + ", " + it.grade + (it.on ? ", equipped" : it.owned ? ", owned: tap to equip" : ", locked: tap to preview"));
    b.setAttribute("aria-pressed", String(!!it.on));
    b.onclick = () => {
        if (it.owned) { it.pick(); sel = null; X.sfx("pick"); render(); return; }
        sel = { key: it.key, tab }; X.sfx("hover"); renderBody(); renderSide();      // a locked item: preview only
    };
    return b;
}
/* the pinned side: the pass (with the previewed item, if any) and the panel about the selected / equipped item */
function renderSide() {
    const box = $("wardPreview"), panel = $("wardSel"); if (!box || !panel || !D) return;
    const list = tab === "profile" || tab === "ach" ? [] : itemsFor(tab);
    const it = (sel && list.find(i => i.key === sel.key)) || null, cur = list.find(i => i.on) || null, show = it || cur;
    box.innerHTML = ""; box.classList.toggle("previewing", !!it);
    const look = lookOf(it ? it.over : null), sig = look.sf + "|" + look.bg, enter = !!lastSig && sig !== lastSig; lastSig = sig;     // a newly shown skin plays its entrance
    if (enter && /3$/.test(look.sf + look.bg)) requestTilt();
    box.appendChild(passCard(look, { xp: levelOf(profile.get().xp), cls: "pass-preview", entrance: enter }));
    if (it) { const f = mk("span", "wd-pvflag", "Preview only"); box.appendChild(f); }
    panel.innerHTML = "";
    if (!show) {
        panel.appendChild(mk("p", "wd-hint", tab === "ach" ? "Achievements unlock arcade frames and titles. They can't be bought." : "Live preview: your Arcade Pass and your lobby card show exactly this. Nothing changes until you save."));
        return;
    }
    const head = mk("div", "wd-sh");
    if (show.big || (tab === "sleeves" && show.art)) { const a = mk("span", "wd-sart"); a.appendChild((show.big || show.art)()); head.appendChild(a); }
    const txt = mk("div", "wd-st");
    const badge = it ? mk("span", "wd-badge pv", "Preview only") : mk("span", "wd-badge eq", "Equipped");
    txt.append(badge, mk("b", "wd-sn" + (show.rar ? " r-" + show.rar : ""), show.name), mk("small", "wd-sg", show.grade));
    head.appendChild(txt); panel.appendChild(head);
    const facts = mk("dl", "wd-facts");
    const fact = (k, v) => { facts.append(mk("dt", null, k), mk("dd", null, v)); };
    fact(show.owned ? "Status" : "How to get it", show.owned ? (show.on ? "Equipped (saved when you press Save profile)" : "Owned") : show.how);
    if (!show.owned && show.price) fact("Price", show.shop && show.shop.tab === "scratch" ? show.price + " coins " + show.priceNote : fmt(show.price) + " AAP Coins");
    panel.appendChild(facts);
    if (it) {
        const row = mk("div", "wd-sbtns");
        if (it.shop) { const g = mk("button", "btn alt sm wd-getshop", "Get in Shop"); g.type = "button"; g.onclick = () => goShop(it); row.appendChild(g); }
        const back = mk("button", "btn ghost sm", "Back to equipped"); back.type = "button"; back.onclick = () => { sel = null; X.sfx("click"); renderBody(); renderSide(); };
        row.appendChild(back); panel.appendChild(row);
    }
}
/* the ONLY way from the Wardrobe to the Shop: it opens on that item, above the Wardrobe (which keeps its draft);
   the Shop's "‹ Wardrobe" button, ✕ or Esc comes back here */
function goShop(it) {
    X.sfx("click");
    X.openShop(Object.assign({ from: "wardrobe", name: it.name }, it.shop));
}

function profileTab() {
    const wrap = mk("div", "wd-cat wd-prof");
    // display name
    const ns = mk("section", "wd-sec"), nh = mk("header", "wd-h"); nh.append(mk("b", null, "Display name"), mk("small", null, "shown on your Arcade Pass and in every room"));
    const nm = mk("input", "wd-name"); nm.id = "profName"; nm.maxLength = 20; nm.placeholder = "Your name"; nm.autocomplete = "nickname"; nm.value = D.name; nm.setAttribute("aria-label", "Display name");
    nm.oninput = () => { D.name = nm.value.trim().slice(0, 20); renderSide(); };
    ns.append(nh, nm); wrap.appendChild(ns);
    // profile picture + accent colour
    const ps = mk("section", "wd-sec"), ph = mk("header", "wd-h"); ph.append(mk("b", null, "Profile picture"), mk("small", null, "pick one or upload your own"));
    const pic = mk("div", "wd-pic");
    const tabs = mk("div", "ava-tabs"); tabs.setAttribute("role", "tablist");
    galleryTabs().forEach(([k, l]) => { const b = mk("button", "ava-tab" + (k === picTab ? " on" : ""), l); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(k === picTab)); b.onclick = () => { picTab = k; renderBody(); }; tabs.appendChild(b); });
    const grid = mk("div", "ava-grid"); grid.appendChild(mk("div", "anime-hint", "Loading…"));
    fillGrid(grid, picTab);
    const up = mk("div", "ava-upload"), lab = mk("label", "btn ghost sm", "Upload your own"), inp = mk("input"); lab.htmlFor = "avaFile"; inp.id = "avaFile"; inp.type = "file"; inp.accept = "image/*"; inp.hidden = true;
    inp.onchange = async () => { const f = inp.files && inp.files[0]; inp.value = ""; if (!f) return; if (!/^image\//.test(f.type) || f.size > 12 * 1024 * 1024) { X.toast("Pick an image file (under 12 MB)."); return; } try { D.av = { t: "i", d: await shrinkImage(f) }; X.sfx("pick"); render(); } catch (e) { X.toast("Couldn't read that image."); } };
    up.append(lab, inp, mk("span", "anime-hint", "Square crop, shrunk to a tiny file."));
    const sw = mk("div", "swatches"); COLORS.forEach(c => { const b = mk("button", "swatch" + (c === D.col ? " on" : "")); b.type = "button"; b.style.background = c; b.setAttribute("aria-label", "Accent colour " + c); b.onclick = () => { D.col = c; if (D.av && D.av.t === "g") D.av.c = c; X.sfx("pick"); render(); }; sw.appendChild(b); });
    pic.append(tabs, grid, up, mk("span", "field-label", "Accent colour"), sw);
    ps.append(ph, pic); wrap.appendChild(ps);
    // player id: this browser's account id (rooms show it to everyone in them; support and setup tools use it)
    const pid = String((X.uid && X.uid()) || bank.get().owner || "");
    if (pid) {
        const is = mk("section", "wd-sec wd-pid"), ih = mk("header", "wd-h"); ih.append(mk("b", null, "Player ID"), mk("small", null, "this browser's account"));
        const code = mk("code", "wd-pidv", pid), cp = mk("button", "btn ghost sm", "Copy"); cp.type = "button";
        cp.onclick = async () => { try { await navigator.clipboard.writeText(pid); X.toast("Player ID copied"); } catch (e) { const r = document.createRange(); r.selectNodeContents(code); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); } };
        const row = mk("div", "wd-pidrow"); row.append(code, cp); is.append(ih, row); wrap.appendChild(is);
    }
    return wrap;
}
async function fillGrid(box, want) {
    const items = await galleryFor(want); if (want !== picTab || !box.isConnected || !D) return;
    box.innerHTML = "";
    items.forEach(it => {
        const b = mk("button", "ava-pick"); b.type = "button"; b.setAttribute("aria-label", it.label || "Avatar");
        if (JSON.stringify(cleanAvatar(it.av)) === JSON.stringify(cleanAvatar(D.av))) b.classList.add("on");
        b.appendChild(avatarEl({ name: D.name, av: it.av, col: D.col, fr: "none" }, { size: 64 }));
        b.onclick = () => { D.av = JSON.parse(JSON.stringify(it.av)); if (D.av.t === "g") D.col = D.av.c; X.sfx("pick"); box.querySelectorAll(".ava-pick").forEach(x => x.classList.remove("on")); b.classList.add("on"); renderSide(); };
        box.appendChild(b);
    });
    if (!items.length) box.textContent = "No pictures for this series yet.";
}
function achTab() {
    const wrap = mk("div", "wd-cat");
    wrap.appendChild(mk("p", "wd-sub", "Your record. Achievements unlock arcade frames and titles; secret ones show up once you get them."));
    const grid = mk("div", "wd-grid g-ach"); grid.setAttribute("role", "list");
    ACH.forEach(a => {
        const got = profile.has(a.id), secret = a.hidden && !got;
        const d = mk("div", "wd-item wd-ach" + (got ? " got" : " locked")); d.setAttribute("role", "listitem");
        d.append(mk("span", "wd-art wd-achi", got ? a.icon : secret ? "❔" : a.icon), mk("b", "wd-in", secret ? "???" : a.name), mk("small", "wd-ig", secret ? "Hidden achievement" : a.desc));
        const gives = [...FRAMES.filter(f => f.ach === a.id).map(f => f.name + " frame"), ...TITLES.filter(t => t.ach === a.id).map(t => "“" + t.name + "” title")];
        if (gives.length && !secret) d.appendChild(mk("small", "wd-gives", "Unlocks: " + gives.join(", ")));
        if (got) d.appendChild(mk("span", "wd-eq", "Unlocked"));
        else { const l = mk("span", "wd-lock", "🔒"); l.setAttribute("aria-hidden", "true"); d.appendChild(l); }
        grid.appendChild(d);
    });
    wrap.appendChild(grid);
    const N = profile.nightParty(), np = mk("section", "wd-sec pnp"); np.id = "profNp";
    const h = mk("header", "wd-h"); h.append(mk("b", null, "Night Party"), mk("small", null, "your tournaments"));
    const npt = mk("div", "pnp-top"); npt.append(mk("b", null, String(N.won | 0)), mk("small", null, "Tournaments won"), mk("b", null, String(N.played | 0)), mk("small", null, "Played"));
    np.append(h, npt);
    if (!N.hist.length) np.appendChild(mk("p", "anime-hint", "No Night Party yet. Pick NIGHT PARTY in a room's lobby to host one."));
    N.hist.forEach(x => { const r = mk("div", "pnp-row" + (x.won ? " won" : "")), l = mk("div"); l.append(mk("b", null, (x.won ? "🏆 " : "") + x.name), mk("small", null, "Winner: " + (x.winner || "?") + (x.reward ? " · " + x.reward : ""))); r.append(l, mk("time", null, new Date(x.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }))); np.appendChild(r); });
    wrap.appendChild(np);
    return wrap;
}

/* Save profile: the profile side, then every Shop slot that changed (owned items only), then the public look */
export async function saveWardrobe() {
    if (!D) return false;
    const r = commitProfile(D);
    if (r.error) { X.toast(r.error); if (tab !== "profile") { tab = "profile"; sel = null; render(); } const n = $("profName"); if (n) n.focus(); return false; }
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
export const wardrobeTab = () => tab;
