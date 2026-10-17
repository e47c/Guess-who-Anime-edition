/* =====================================================================
   PLAYER PROFILE · AVATARS · PROGRESSION · ACHIEVEMENTS
   Stored per browser in localStorage ("gw_profile_v1"). The public part
   (name, avatar, colour, frame, title, level) is copied into the room's
   player node so everybody sees the same card in every mode.
   ===================================================================== */

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
    { id: "secret", icon: "🌀", name: "Ultra Instinct", desc: "Found a hidden technique on the main menu.", hidden: true }
];
const MODE_KEYS = ["gw", "hb", "im", "uno"];

/* ---------------- storage ---------------- */
function blank() {
    let legacy = ""; try { legacy = localStorage.getItem("gw_name") || ""; } catch (e) {}
    const c = COLORS[(Math.random() * COLORS.length) | 0];
    return { v: 1, name: legacy, av: { t: "g", g: GLYPHS[(Math.random() * GLYPHS.length) | 0], c }, col: c, fr: "none", ttl: "rookie", xp: 0, st: {}, ach: {}, em: 0 };
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
    public() { return { name: P.name || "Player", av: P.av, col: P.col, fr: P.fr, ttl: titleName(P.ttl), lvl: levelOf(P.xp).lvl }; },
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
/* p = a player node / profile.public(): { name, av, col, fr, lvl }. Returns a .ava element. */
export function avatarEl(p, { size = 48, cls = "", badge = false } = {}) {
    p = p || {};
    const el = document.createElement("div"), av = cleanAvatar(p.av), col = /^#[0-9a-f]{3,8}$/i.test(p.col || "") ? p.col : "#e11b1b";
    el.className = "ava fr-" + (FRAMES.some(f => f.id === p.fr) ? p.fr : "none") + (cls ? " " + cls : "");
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
    if (badge && p.lvl) { const b = document.createElement("span"); b.className = "ava-lvl"; b.textContent = p.lvl; el.appendChild(b); }
    return el;
}
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

/* ---------------- editor UI ---------------- */
let draft = null, tab = "emblem", hooks = { onSave: null, sfx: () => {} };
export function setProfileHooks(h) { Object.assign(hooks, h); }
const $ = id => document.getElementById(id);
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

export function openProfileEditor() {
    draft = JSON.parse(JSON.stringify({ name: P.name, av: P.av, col: P.col, fr: P.fr, ttl: P.ttl }));
    $("profName").value = draft.name || "";
    renderEditor(); renderTabs(); renderGrid();
}
function renderEditor() {
    const pv = $("profPreview"); pv.innerHTML = "";
    const card = mk("div", "prof-card"); card.style.setProperty("--ac", draft.col);
    card.appendChild(avatarEl({ name: draft.name, av: draft.av, col: draft.col, fr: draft.fr, lvl: levelOf(P.xp).lvl }, { size: 112, badge: true }));
    const id = mk("div", "prof-card-id"); id.append(mk("b", null, draft.name || "Your name"), mk("small", null, titleName(draft.ttl)));
    card.appendChild(id); pv.appendChild(card);
    const sw = $("profColors"); sw.innerHTML = "";
    COLORS.forEach(c => { const b = mk("button", "swatch" + (c === draft.col ? " on" : "")); b.style.background = c; b.setAttribute("aria-label", "Colour " + c); b.onclick = () => { draft.col = c; if (draft.av.t === "g") draft.av.c = c; hooks.sfx("toggle"); renderEditor(); }; sw.appendChild(b); });
    const pill = (box, list, key) => { box.innerHTML = ""; list.forEach(it => { const ok = isUnlocked(it); if (it.hidden && !ok) return; const b = mk("button", "pill" + (draft[key] === it.id ? " on" : "") + (ok ? "" : " locked"), it.name); b.title = ok ? it.name : (it.ach ? "Unlock: " + (ACH.find(a => a.id === it.ach) || {}).name : "Reach level " + it.lvl); if (!ok) b.disabled = true; b.onclick = () => { draft[key] = it.id; hooks.sfx("toggle"); renderEditor(); }; box.appendChild(b); }); };
    pill($("profTitles"), TITLES, "ttl"); pill($("profFrames"), FRAMES, "fr");
    const ach = $("profAch"); ach.innerHTML = "";
    ACH.forEach(a => { const got = profile.has(a.id), secret = a.hidden && !got, d = mk("div", "ach" + (got ? " got" : "")); d.title = secret ? "A secret" : a.desc; d.append(mk("span", "ach-i", got ? a.icon : secret ? "❔" : "🔒"), mk("b", null, secret ? "???" : a.name), mk("small", null, secret ? "Hidden achievement" : a.desc)); ach.appendChild(d); });
}
function renderTabs() {
    const box = $("avaTabs"); box.innerHTML = "";
    [["emblem", "Emblems"]].concat(Object.keys(SERIES_LABEL).map(k => [k, SERIES_LABEL[k]])).forEach(([k, l]) => {
        const b = mk("button", "ava-tab" + (k === tab ? " on" : ""), l); b.setAttribute("role", "tab"); b.setAttribute("aria-selected", k === tab);
        b.onclick = () => { tab = k; renderTabs(); renderGrid(); }; box.appendChild(b);
    });
}
async function renderGrid() {
    const box = $("avaGrid"), want = tab; box.innerHTML = ""; box.appendChild(mk("div", "anime-hint", "Loading…"));
    const items = await galleryFor(want); if (want !== tab) return;
    box.innerHTML = "";
    items.forEach(it => {
        const b = mk("button", "ava-pick"); b.setAttribute("aria-label", it.label || "Avatar");
        const same = JSON.stringify(cleanAvatar(it.av)) === JSON.stringify(cleanAvatar(draft.av)); if (same) b.classList.add("on");
        b.appendChild(avatarEl({ name: draft.name, av: it.av, col: draft.col, fr: "none" }, { size: 64 }));
        b.onclick = () => { draft.av = JSON.parse(JSON.stringify(it.av)); if (draft.av.t === "g") draft.col = draft.av.c; hooks.sfx("pick"); renderEditor(); box.querySelectorAll(".ava-pick").forEach(x => x.classList.remove("on")); b.classList.add("on"); };
        box.appendChild(b);
    });
    if (!items.length) box.textContent = "No pictures for this series yet.";
}
export function bindUpload() {
    const nm = $("profName"); if (nm) nm.addEventListener("input", () => { if (!draft) return; draft.name = nm.value.trim().slice(0, 20); const b = document.querySelector("#profPreview .prof-card-id b"); if (b) b.textContent = draft.name || "Your name"; const g = document.querySelector("#profPreview .ava-in.glyph"); if (g && !(draft.av && draft.av.g)) g.textContent = (draft.name || "?").slice(0, 2).toUpperCase(); });
    const inp = $("avaFile"); if (!inp) return;
    inp.addEventListener("change", async () => {
        const f = inp.files && inp.files[0]; inp.value = ""; if (!f) return;
        if (!/^image\//.test(f.type) || f.size > 12 * 1024 * 1024) { hooks.toast && hooks.toast("Pick an image file (under 12 MB)."); return; }
        try { draft.av = { t: "i", d: await shrink(f) }; hooks.sfx("pick"); renderEditor(); }
        catch (e) { hooks.toast && hooks.toast("Couldn't read that image."); }
    });
}
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
export function commitProfileEditor() {
    const name = ($("profName").value || "").trim().slice(0, 20);
    if (!name) { hooks.toast && hooks.toast("Pick a display name first."); $("profName").focus(); return false; }
    const changedPic = JSON.stringify(draft.av) !== JSON.stringify(P.av) && draft.av.t !== "g";
    Object.assign(P, { name, av: cleanAvatar(draft.av) || P.av, col: draft.col, fr: isUnlocked(FRAMES.find(f => f.id === draft.fr) || FRAMES[0]) ? draft.fr : "none", ttl: draft.ttl });
    persist();
    if (changedPic) { const a = profile.unlock("new_look"); if (a && hooks.onAchievement) hooks.onAchievement(a); }
    if (hooks.onSave) hooks.onSave(P);
    return true;
}

/* ---------------- home screen card ---------------- */
export function renderProfileCard() {
    const L = levelOf(P.xp), pub = profile.public();
    const a = $("pcAva"); if (!a) return; a.innerHTML = ""; a.appendChild(avatarEl(pub, { size: 76, badge: true }));
    $("pcName").textContent = P.name || "Set your name";
    $("pcTitle").textContent = titleName(P.ttl);
    $("pcLvl").textContent = "LV " + L.lvl; $("pcXp").style.width = Math.round(L.pct * 100) + "%"; $("pcXpTxt").textContent = L.into + " / " + L.need + " XP";
    const st = P.st.all || { p: 0, w: 0, s: 0, b: 0 }, box = $("pcStats"); box.innerHTML = "";
    [["Matches", st.p], ["Wins", st.w], ["Best streak", st.b], ["Badges", Object.keys(P.ach).length + "/" + ACH.length]].forEach(([k, v]) => { const d = mk("div", "pc-stat"); d.append(mk("b", null, String(v)), mk("small", null, k)); box.appendChild(d); });
    document.getElementById("profileCard").style.setProperty("--ac", P.col);
}
