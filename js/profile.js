/* =====================================================================
   PLAYER PROFILE · AVATARS · PROGRESSION · ACHIEVEMENTS
   Stored per browser in localStorage ("gw_profile_v1"). The public part
   (name, avatar, colour, frame, title, level) is copied into the room's
   player node so everybody sees the same card in every mode.
   ===================================================================== */

import { SKINS } from "./vault/config.js?v=10";
import { NIGHT_PARTY } from "./party/config.js?v=2";

const KEY = "gw_profile_v1";
export const COLORS = ["#e11b1b", "#ff6a1a", "#f2c200", "#2ec4a6", "#3ea6ff", "#7a5cff", "#ff4fa8", "#e8e8f4"];
const GLYPHS = ["火", "雷", "風", "影", "龍", "鬼", "侍", "忍", "夢", "星", "魂", "刃"];

export const TITLES = [
    { id: "rookie", name: "Rookie", lvl: 1 }, { id: "genin", name: "Genin", lvl: 2 }, { id: "chunin", name: "Chunin", lvl: 4 },
    { id: "jonin", name: "Jonin", lvl: 6 }, { id: "captain", name: "Squad Captain", lvl: 8 }, { id: "hashira", name: "Hashira", lvl: 10 },
    { id: "yonko", name: "Yonko", lvl: 13 }, { id: "special", name: "Special Grade", lvl: 16 }, { id: "king", name: "Pirate King", lvl: 20 },
    { id: "detective", name: "Great Detective", ach: "gw_fast" }, { id: "mind", name: "Mind Reader", ach: "hb_flawless" },
    { id: "liar", name: "Master of Lies", ach: "im_escape" }, { id: "shark", name: "Card Shark", ach: "uno_special" }, { id: "hype", name: "Hype Man", ach: "hype" },
    { id: "ui", name: "Ultra Instinct", ach: "secret", hidden: true }
];
export const FRAMES = [
    { id: "none", name: "Plain", lvl: 1 }, { id: "steel", name: "Steel", lvl: 2 }, { id: "crimson", name: "Crimson", lvl: 3 },
    { id: "gold", name: "Gold", lvl: 5 }, { id: "sakura", name: "Sakura", lvl: 7 }, { id: "void", name: "Six Eyes", lvl: 10 },
    { id: "holo", name: "Holo", ach: "streak5" }, { id: "flame", name: "Flame", ach: "uno_special" }, { id: "shadow", name: "Shadow", ach: "im_escape" },
    { id: "ui", name: "Ultra Instinct", ach: "secret", hidden: true }
];
export const ACH = [
    { id: "first_win", icon: "🏅", name: "First Blood", desc: "Win your first match." },
    { id: "streak3", icon: "🔥", name: "On Fire", desc: "Win 3 matches in a row." },
    { id: "streak5", icon: "☄️", name: "Unstoppable", desc: "Win 5 matches in a row." },
    { id: "veteran", icon: "🎖️", name: "Veteran", desc: "Play 25 matches." },
    { id: "all_modes", icon: "🧭", name: "Jack of All Trades", desc: "Play every game mode." },
    { id: "gw_win", icon: "🔎", name: "Case Closed", desc: "Win a Guess Who match." },
    { id: "gw_fast", icon: "⚡", name: "Speed Reader", desc: "Win Guess Who in 3 of your turns or fewer." },
    { id: "hb_win", icon: "🧠", name: "Telepath", desc: "Win a Headbanz match." },
    { id: "hb_flawless", icon: "💎", name: "Flawless Read", desc: "Guess your own Headbanz card with no strikes." },
    { id: "im_escape", icon: "🎭", name: "Master of Disguise", desc: "Fool everyone as the imposter." },
    { id: "im_catch", icon: "🕵️", name: "Truth Seeker", desc: "Vote for the real imposter." },
    { id: "uno_win", icon: "🃏", name: "Clean Hands", desc: "Win a round of Anime UNO." },
    { id: "uno_special", icon: "💥", name: "Ultimate Finisher", desc: "Win UNO with a special card as your last card." },
    { id: "uno_villain", icon: "😈", name: "Villain Arc", desc: "Play a Wild +4." },
    { id: "hype", icon: "📣", name: "Hype Man", desc: "Send 25 reactions." },
    { id: "new_look", icon: "🪞", name: "New Look", desc: "Pick a profile picture." },
    { id: "np_win", icon: "🏆", name: "Night Party Winner", desc: "Win a Night Party tournament." },
    { id: "secret", icon: "🌀", name: "Ultra Instinct", desc: "Found a hidden technique on the main menu.", hidden: true }
];
const MODE_KEYS = ["gw", "hb", "im", "uno"];

/* ---------------- storage ---------------- */
function blank() {
    let legacy = ""; try { legacy = localStorage.getItem("gw_name") || ""; } catch (e) {}
    const c = COLORS[(Math.random() * COLORS.length) | 0];
    return { v: 1, name: legacy, av: { t: "g", g: GLYPHS[(Math.random() * GLYPHS.length) | 0], c }, col: c, fr: "none", ttl: "rookie", xp: 0, st: {}, ach: {}, em: 0, sf: "", bg: "", ts: "", uc: "", vtn: "", np: { won: 0, played: 0, hist: [] } };
}
let P = blank();
try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.v === 1) P = Object.assign(blank(), s); } catch (e) {}
const subs = new Set();
function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(P)); localStorage.setItem("gw_name", P.name || ""); } catch (e) {}
    subs.forEach(f => { try { f(P); } catch (e) {} });
}
export const profile = {
    get() { return P; },
    onChange(f) { subs.add(f); return () => subs.delete(f); },
    update(patch) { Object.assign(P, patch); persist(); },
    level() { return levelOf(P.xp); },
    // the part other players see (kept small: it rides along on every room update)
    // sf/bg/ts/uc/vtn = Anime TCG cosmetics (Season frame, background, title skin, username style, Vault title), equipped in the Wardrobe (js/wardrobe.js)
    public() { return { name: P.name || "Player", av: P.av, col: P.col, fr: P.fr, ttl: P.vtn || titleName(P.ttl), lvl: levelOf(P.xp).lvl, sf: P.sf || "", bg: P.bg || "", ts: P.ts || "", uc: P.uc || "" }; },
    stats(mode) { return P.st[mode] || { p: 0, w: 0, s: 0, b: 0 }; },
    has(id) { return !!P.ach[id]; },
    unlock(id) { if (P.ach[id] || !ACH.find(a => a.id === id)) return null; P.ach[id] = Date.now(); persist(); return ACH.find(a => a.id === id); },
    emoteSent() { P.em = (P.em || 0) + 1; persist(); return P.em >= 25 ? this.unlock("hype") : null; },
    /* call once per finished match. extra = { ach: [ids earned by the mode], bonus: xp } */
    recordMatch(mode, won, extra = {}) {
        const before = levelOf(P.xp), stAll = P.st.all || { p: 0, w: 0, s: 0, b: 0 }, st = P.st[mode] || { p: 0, w: 0, s: 0, b: 0 };
        [stAll, st].forEach(x => { x.p++; if (won) { x.w++; x.s++; x.b = Math.max(x.b, x.s); } else if (won === false) x.s = 0; });
        P.st.all = stAll; P.st[mode] = st;
        let gain = 25 + (won ? 55 : 0) + (won && stAll.s >= 2 ? Math.min(60, (stAll.s - 1) * 15) : 0) + (extra.bonus || 0);
        P.xp += gain;
        const earned = [];
        const tryU = id => { const a = this._unlockSilent(id); if (a) earned.push(a); };
        if (won) tryU("first_win");
        if (stAll.s >= 3) tryU("streak3");
        if (stAll.s >= 5) tryU("streak5");
        if (stAll.p >= 25) tryU("veteran");
        if (MODE_KEYS.every(k => P.st[k] && P.st[k].p > 0)) tryU("all_modes");
        (extra.ach || []).forEach(tryU);
        const after = levelOf(P.xp);
        persist();
        return { gain, before, after, levelUp: after.lvl > before.lvl, achievements: earned, streak: stAll.s, best: stAll.b, unlocked: unlocksBetween(before.lvl, after.lvl) };
    },
    /* a finished Night Party, once per tournament id: { id, name, reward, winner (name), date, won } -> the achievement if new */
    recordNightParty(rec) {
        const np = P.np && Array.isArray(P.np.hist) ? P.np : (P.np = { won: 0, played: 0, hist: [] });
        if (!rec || !rec.id || np.hist.some(h => h.id === rec.id)) return null;
        np.played = (np.played | 0) + 1; if (rec.won) np.won = (np.won | 0) + 1;
        np.hist.unshift({ id: String(rec.id), name: String(rec.name || "Night Party").slice(0, 60), reward: String(rec.reward || "").slice(0, 140), winner: String(rec.winner || "").slice(0, 40), date: Number(rec.date) || Date.now(), won: !!rec.won });
        np.hist = np.hist.slice(0, NIGHT_PARTY.historyKeep);
        const a = rec.won ? this._unlockSilent("np_win") : null;
        persist();
        return a;
    },
    nightParty() { return P.np && Array.isArray(P.np.hist) ? P.np : { won: 0, played: 0, hist: [] }; },
    _unlockSilent(id) { if (P.ach[id] || !ACH.find(a => a.id === id)) return null; P.ach[id] = Date.now(); return ACH.find(a => a.id === id); }
};

/* ---------------- levels ---------------- */
// level n -> n+1 costs 100 + 60*(n-1) xp
export function levelOf(xp) {
    let lvl = 1, need = 100, left = Math.max(0, xp | 0);
    while (left >= need && lvl < 99) { left -= need; lvl++; need = 100 + 60 * (lvl - 1); }
    return { lvl, into: left, need, pct: left / need };
}
export function titleName(id) { const t = TITLES.find(x => x.id === id); return t ? t.name : "Rookie"; }
export function isUnlocked(item) { return item.ach ? profile.has(item.ach) : levelOf(P.xp).lvl >= (item.lvl || 1); }
function unlocksBetween(a, b) { return [...TITLES, ...FRAMES].filter(x => x.lvl && x.lvl > a && x.lvl <= b).map(x => x.name); }

/* ---------------- avatars ---------------- */
const SAFE_IMG = /^(images\/[\w\/.-]+\.(jpg|jpeg|png|webp)|https:\/\/s4\.anilist\.co\/file\/anilistcdn\/character\/[\w\/.-]+)$/i;
const SAFE_DATA = /^data:image\/(webp|jpeg|png);base64,[a-z0-9+\/=]+$/i;
export function cleanAvatar(av) {
    if (!av || typeof av !== "object") return null;
    if (av.t === "c" && typeof av.u === "string" && SAFE_IMG.test(av.u)) return { t: "c", u: av.u };
    if (av.t === "i" && typeof av.d === "string" && av.d.length < 40000 && SAFE_DATA.test(av.d)) return { t: "i", d: av.d };
    if (av.t === "g") return { t: "g", g: String(av.g || "?").slice(0, 2), c: /^#[0-9a-f]{3,8}$/i.test(av.c || "") ? av.c : "#e11b1b" };
    return null;
}
/* p = a player node / profile.public(): { name, av, col, fr, lvl, sf, bg }. Returns a .ava element.
   Season frame (p.sf) = the ring around the picture: the ring's base colours, a ring-shaped layer for effects that run
   along the ring (.ava-ring, masked to the ring) and a free layer just outside it for particles (.ava-fx: sparkles,
   flames, bubbles, orbiting lights). All CSS (css/vault.css); paused while off-screen, static under Reduced effects.
   The Season background (p.bg) is NOT drawn here: it restyles the whole player card (seatCard below). */
const COSM = /^[a-z0-9]{1,24}$/;
export function avatarEl(p, { size = 48, cls = "", badge = false } = {}) {
    p = p || {};
    const el = document.createElement("div"), av = cleanAvatar(p.av), col = /^#[0-9a-f]{3,8}$/i.test(p.col || "") ? p.col : "#e11b1b";
    const sf = COSM.test(p.sf || "") ? p.sf : "";
    el.className = "ava fr-" + (sf ? "none" : FRAMES.some(f => f.id === p.fr) ? p.fr : "none") + (sf ? " sf sf-" + sf : "") + (cls ? " " + cls : "");
    el.style.setProperty("--ava", size + "px"); el.style.setProperty("--ac", col);
    const inner = document.createElement("div"); inner.className = "ava-in";
    if (av && (av.t === "c" || av.t === "i")) {
        const img = new Image(); img.alt = ""; img.decoding = "async"; img.draggable = false; img.referrerPolicy = "no-referrer";
        img.onerror = () => { img.remove(); inner.textContent = initials(p.name); inner.classList.add("glyph"); };
        img.src = av.t === "c" ? av.u : av.d; inner.appendChild(img);
    } else {
        inner.classList.add("glyph"); inner.textContent = av && av.g ? av.g : initials(p.name);
        inner.style.setProperty("--gc", av && av.c ? av.c : col);
    }
    el.appendChild(inner);
    if (sf) { ["ava-ring", "ava-fx"].forEach(c => { const i = document.createElement("i"); i.className = c; i.setAttribute("aria-hidden", "true"); el.appendChild(i); }); fxWatch(el); }
    if (badge && p.lvl) { const b = document.createElement("span"); b.className = "ava-lvl"; b.textContent = p.lvl; el.appendChild(b); }
    return el;
}
/* The player card exactly as the lobby draws it: the "1P" tag, the picture (with its frame), name, title and level.
   p.bg (Season background) restyles the whole panel: .sbg[data-bg] in css/vault.css, over the lobby's stripes.
   Used by the lobby seats (game.js), the Anime TCG Battle tab, so they always match. */
export function seatCard(p, { slot = 1, me = false, col = "", cls = "", size = 72 } = {}) {
    p = p || {};
    const s = document.createElement("div"), bg = COSM.test(p.bg || "") ? p.bg : "";
    s.className = "seat" + (me ? " me" : "") + (bg ? " sbg" : "") + (cls ? " " + cls : "");
    s.style.setProperty("--pc", col || (/^#[0-9a-f]{3,8}$/i.test(p.col || "") ? p.col : "#e11b1b"));
    if (bg) { s.dataset.bg = bg; const f = document.createElement("i"); f.className = "sbg-fx"; f.setAttribute("aria-hidden", "true"); s.appendChild(f); fxWatch(s); }
    const no = document.createElement("span"); no.className = "seat-no"; no.textContent = slot + "P";
    const id = document.createElement("div"); id.className = "seat-id";
    const nm = document.createElement("b"); nm.textContent = p.name || "Player " + slot; styleName(nm, p);
    const sm = document.createElement("small"), tt = document.createElement("span"); tt.textContent = p.ttl || "Rookie"; styleTitle(tt, p);
    sm.append(tt, document.createTextNode(p.lvl ? " · LV " + p.lvl : "")); id.append(nm, sm);
    s.append(no, avatarEl(p, { size, badge: true }), id);
    return s;
}
/* THE ARCADE PASS: a credit-card-shaped player card (1.586:1). Picture with the equipped FRAME (avatarEl), the
   equipped BACKGROUND over the whole card (the same .sbg[data-bg] skin CSS as the lobby seats, css/vault.css),
   name with the username style, title with the title skin, level and the XP bar. A golden EMV chip on the right.
   Used on the main menu, as the Wardrobe's live preview and as the Shop's try-on, so all three always match.
   o = { xp: { lvl, into, need, pct }, ids (the home card: #pcName...), tilt, cls, empty (no name yet) } */
export function passCard(p, o = {}) {
    p = p || {};
    const c = document.createElement("div"), bg = COSM.test(p.bg || "") ? p.bg : "", xp = o.xp || null;
    const col = /^#[0-9a-f]{3,8}$/i.test(p.col || "") ? p.col : "#e11b1b";
    c.className = "pass" + (bg ? " sbg" : "") + (o.cls ? " " + o.cls : "");
    c.style.setProperty("--pc", col);
    if (o.tilt) c.setAttribute("data-tilt", "");
    if (bg) { c.dataset.bg = bg; const f = document.createElement("i"); f.className = "sbg-fx"; f.setAttribute("aria-hidden", "true"); c.appendChild(f); fxWatch(c); }
    const el = (tag, cls, txt, id) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (id && o.ids) e.id = id; return e; };
    const sheen = el("i", "pass-sheen"); sheen.setAttribute("aria-hidden", "true");
    const top = el("div", "pass-top");
    const brand = el("span", "pass-brand"); brand.innerHTML = '<svg class="aa-mark" viewBox="0 0 120 120" aria-hidden="true"><use href="#aa-mark"/></svg>';
    brand.appendChild(document.createTextNode("ARCADE PASS"));
    top.append(brand, el("span", "pass-lv", "LV " + ((xp && xp.lvl) || p.lvl || 1), "pcLvl"));
    const chip = el("span", "pass-chip"); chip.setAttribute("aria-hidden", "true"); chip.innerHTML = "<i></i><i></i><i></i>";
    const mid = el("div", "pass-mid");
    const ava = avatarEl(p, { size: 72 }); ava.classList.add("pass-ava"); if (o.ids) ava.id = "pcAva";
    const id = el("div", "pass-id");
    const nm = el("b", "pass-name", o.empty ? "Set your name" : (p.name || "Player"), "pcName"); styleName(nm, p);
    const tt = el("span", "pass-title", p.ttl || "Rookie", "pcTitle"); styleTitle(tt, p);
    id.append(el("small", "pass-holder", "CARD HOLDER"), nm, tt);
    mid.append(ava, id);
    const foot = el("div", "pass-foot");
    const bar = el("div", "pass-xp"); const fill = el("i", null, null, "pcXp"); fill.style.width = Math.round(((xp && xp.pct) || 0) * 100) + "%"; bar.appendChild(fill);
    foot.append(bar, el("span", "pass-xpt", xp ? xp.into + " / " + xp.need + " XP" : "", "pcXpTxt"));
    c.append(sheen, top, chip, mid, foot);
    c.setAttribute("role", "img"); c.setAttribute("aria-label", "Arcade Pass: " + (p.name || "Player") + ", " + (p.ttl || "Rookie") + ", level " + ((xp && xp.lvl) || p.lvl || 1));
    return c;
}
/* animated frames and backgrounds pause while scrolled out of view (class fx-off; css/vault.css) */
let fxIO = null; const fxSeen = new Set();
const FX_PAUSE = !(SKINS && SKINS.pauseOffscreen === false);
export function fxWatch(el) {
    if (!FX_PAUSE || typeof IntersectionObserver === "undefined") return;
    if (!fxIO) fxIO = new IntersectionObserver(list => list.forEach(e => { e.target.classList.toggle("fx-off", !e.isIntersecting); if (!e.target.isConnected) { fxIO.unobserve(e.target); fxSeen.delete(e.target); } }), { rootMargin: "80px" });
    if (fxSeen.size > 150) fxSeen.forEach(x => { if (!x.isConnected) { fxIO.unobserve(x); fxSeen.delete(x); } });
    fxSeen.add(el); fxIO.observe(el);
}
/* per-tier animation speed + ring width from the Vault config, once, as CSS variables */
if (typeof document !== "undefined" && SKINS) {
    const r = document.documentElement.style;
    (SKINS.tiers || []).forEach(t => r.setProperty("--sp-" + t.id, String(Number(t.speed) > 0 ? Number(t.speed) : 1)));
    if (Number(SKINS.ringWidth) > 0) r.setProperty("--ring", String(SKINS.ringWidth));
}
/* username style + title skin (Anime TCG scratch-card rewards) on any element showing a name / title */
export function styleName(elm, p) { if (elm && p && COSM.test(p.uc || "")) elm.classList.add("uc", "uc-" + p.uc); return elm; }
export function styleTitle(elm, p) { if (elm && p && COSM.test(p.ts || "")) elm.classList.add("ts", "ts-" + p.ts); return elm; }
const initials = n => (String(n || "?").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2) || "?").toUpperCase();

/* ---------------- avatar gallery sources ---------------- */
let LOCAL = {}, packsP = null, SERIES_LABEL = {};
export function initGallery(localLibrary, labels) { LOCAL = localLibrary || {}; SERIES_LABEL = labels || {}; }
function packs() {
    if (!packsP) packsP = fetch("packs.json").then(r => r.ok ? r.json() : null).catch(() => null);
    return packsP;
}
async function galleryFor(tab) {
    if (tab === "emblem") return GLYPHS.map((g, i) => ({ av: { t: "g", g, c: COLORS[i % COLORS.length] }, label: g }));
    const out = [], seen = new Set();
    (LOCAL[tab] || []).slice(0, 24).forEach(u => { if (!seen.has(u)) { seen.add(u); out.push({ av: { t: "c", u }, label: "" }); } });
    const pk = await packs();
    const s = pk && pk.series && pk.series[tab];
    if (s && s.chars) s.chars.filter(c => c[3]).slice(0, 36).forEach(c => out.push({ av: { t: "c", u: "https://s4.anilist.co/file/anilistcdn/character/large/" + c[3] }, label: c[1] }));
    return out;
}

/* ---------------- shared with the Wardrobe (js/wardrobe.js owns the editor) ---------------- */
let hooks = { onSave: null, sfx: () => {} };
export function setProfileHooks(h) { Object.assign(hooks, h); }
export const profileHooks = () => hooks;
const $ = id => document.getElementById(id);
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
/* the picture gallery: Emblems + one tab per series (local pictures + AniList characters) */
export const galleryTabs = () => [["emblem", "Emblems"]].concat(Object.keys(SERIES_LABEL).map(k => [k, SERIES_LABEL[k]]));
export { galleryFor };
/* commit what the Wardrobe edited on the profile side (name, picture, accent colour, arcade frame, level title) */
export function commitProfile(d) {
    const name = String(d.name || "").trim().slice(0, 20);
    if (!name) return { error: "Pick a display name first." };
    const changedPic = JSON.stringify(d.av) !== JSON.stringify(P.av) && d.av && d.av.t !== "g";
    Object.assign(P, { name, av: cleanAvatar(d.av) || P.av, col: /^#[0-9a-f]{3,8}$/i.test(d.col || "") ? d.col : P.col, fr: isUnlocked(FRAMES.find(f => f.id === d.fr) || FRAMES[0]) ? d.fr : "none", ttl: (TITLES.find(t => t.id === d.ttl && isUnlocked(t)) || {}).id || P.ttl });
    persist();
    let ach = null;
    if (changedPic) { ach = profile.unlock("new_look"); if (ach && hooks.onAchievement) hooks.onAchievement(ach); }
    if (hooks.onSave) hooks.onSave(P);
    return { ok: true, ach };
}
export function shrinkImage(file) { return shrink(file); }
function shrink(file) {
    return new Promise((res, rej) => {
        const url = URL.createObjectURL(file), img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const S = 128, cv = document.createElement("canvas"); cv.width = cv.height = S; const g = cv.getContext("2d");
            const m = Math.min(img.width, img.height); g.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S);
            let q = .82, out = "";
            for (let i = 0; i < 6; i++) { out = cv.toDataURL("image/webp", q); if (!/^data:image\/webp/.test(out)) out = cv.toDataURL("image/jpeg", q); if (out.length < 24000) break; q -= .12; }
            res(out);
        };
        img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("bad image")); };
        img.src = url;
    });
}
/* ---------------- home screen: the Arcade Pass (credit card) + stats under it ---------------- */
export function renderProfileCard() {
    const box = $("pcPass"); if (!box) return;
    const pub = profile.public();
    box.innerHTML = "";
    box.appendChild(passCard(pub, { xp: levelOf(P.xp), ids: true, tilt: true, empty: !P.name }));
    const st = P.st.all || { p: 0, w: 0, s: 0, b: 0 }, sb = $("pcStats"); if (!sb) return; sb.innerHTML = "";
    [["Matches", st.p], ["Wins", st.w], ["Best streak", st.b], ["Badges", Object.keys(P.ach).length + "/" + ACH.length]].forEach(([k, v]) => { const d = mk("div", "pc-stat"); d.append(mk("b", null, String(v)), mk("small", null, k)); sb.appendChild(d); });
    const card = $("profileCard"); if (card) card.style.setProperty("--ac", P.col);
}
