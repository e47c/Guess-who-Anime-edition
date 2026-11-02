/* =====================================================================
   ANIME DRAFT (fifth mode)
   Build the strongest six-character team. Two game types:
   - Build:   two sides, 1v1 to 4v4, each shown by its players' names. Sides take turns drawing a random character and placing it
              in one of their six roles. Each side has ONE blind reroll, decided before the stats show.
   - Auction: everyone for themselves with $25. A random character is revealed, players bid in turn
              (+$1 at least) or pass; the winner places it in an empty role.
   Final score = the six role scores + the six rarity bonuses (rarity = global AniList popularity rank).

   Everything that changes the match runs in a Firebase transaction on rooms/<code>/draft and is checked
   there (turn, phase, money, free role), so two clicks or two players can never both apply.
   The rules engine (act / actorOf / newMatch / scoring) is pure and has no DOM, so it is unit-tested
   in Node (tools/draft-test.mjs). Rendering and the lobby panel follow below it.
   ===================================================================== */
import { CHARS, ROLESETS, ROLE_ICONS, RARITIES, TIERS, DRAFT_VERSION } from "./data.js?v=1";

/* tunable rules: see README "Anime Draft" for which ones are still open for balancing */
export const DRAFT_RULES = {
    slots: 6,
    budget: 25,          // auction: starting money
    minRaise: 1,         // auction: a bid beats the current one by at least this much
    openMin: 1,          // auction: lowest opening bid
    rerolls: 1,          // build: per side, per match
    awayMs: 8000,        // the host plays the turn of a player who has been offline this long
    leftMs: 1500         // ... or who left the room
};
const R = DRAFT_RULES;
const IMG = "https://s4.anilist.co/file/anilistcdn/character/large/";
const SIDES = ["L", "R"];
/* a side is shown by its players' names: "Ayla", "Ayla & Cyd", "Ayla, Cyd & Eli" */
const joinNames = names => names.length < 2 ? (names[0] || "") : names.slice(0, -1).join(", ") + " & " + names[names.length - 1];
const arr = x => Array.isArray(x) ? x : (x ? Object.values(x) : []);

/* ---------------- character database ---------------- */
let DB = null, dbP = null, loadPacks = () => Promise.resolve(null);
export const draftDb = () => DB;
export function draftLoad() {
    if (dbP) return dbP;
    dbP = Promise.all([
        fetch("data/draft-pop.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : null).catch(() => null),
        loadPacks().catch(() => null)
    ]).then(([pop, packs]) => { DB = buildDb(pop, packs); return DB; });
    return dbP;
}
// pop: data/draft-pop.json (weekly AniList sync). packs: packs.json (Headbanz' AniList download), the fallback.
export function buildDb(pop, packs) {
    const fromPacks = {};
    if (packs && packs.series) Object.values(packs.series).forEach(sr => (sr.chars || []).forEach(c => { fromPacks[String(c[0]).slice(1)] = [Number(c[4]) || 0, c[3] || ""]; }));
    const db = {};
    Object.entries(CHARS).forEach(([key, rows]) => rows.forEach(r => {
        if (db[r[0]]) return;
        const p = (pop && pop.chars && pop.chars[r[0]]) || fromPacks[r[0]] || [0, ""];
        db[r[0]] = { id: r[0], n: r[1], s: key, v: r.slice(2), f: Number(p[0]) || 0, img: p[1] ? (/^http/.test(p[1]) ? p[1] : IMG + p[1]) : "" };
    }));
    rankRarity(db);
    return db;
}
/* global popularity rank: every draftable character of all 18 series in one list, most favourites first.
   Equal favourites share a position, so they always share a rarity. */
export function rankRarity(db) {
    const list = Object.values(db).sort((a, b) => b.f - a.f), N = list.length;
    let pos = 0;
    list.forEach((c, i) => {
        if (i && c.f !== list[i - 1].f) pos = i;
        const k = RARITIES.findIndex(x => pos / N < x.top);
        c.r = k < 0 ? RARITIES.length - 1 : k;
    });
    return db;
}

/* ---------------- roles and scores ---------------- */
export const roleSetFor = (series, classic) => classic ? "classic" : (series.length === 1 ? series[0] : "mixed");
export const roleNames = rs => ROLESETS[rs] || ROLESETS.mixed;
/* a character's six role scores under a role set: [{raw, mult, score}]. mixed = the match has 2+ series,
   which scales physical power and Special Ability by the series tier (see TIERS in data.js). */
export function charRoles(c, rs, mixed) {
    const v = c.v, dn = c.s === "deathnote", t = TIERS[c.s] || { p: 1, s: 1 }, P = mixed ? t.p : 1, S = mixed ? t.s : 1;
    let raw, mul;
    if (rs === "classic") { raw = dn ? v.slice(12, 18) : v.slice(8, 14); mul = [1, 1, P, P, 1, 1]; }
    else if (rs === "mixed") { raw = v.slice(0, 6); mul = [P, P, 1, P, 1, S]; }
    else { raw = dn ? v.slice(6, 12) : [v[0], v[1], v[2], v[3], v[6], v[7]]; mul = [1, 1, 1, 1, 1, 1]; }
    return raw.map((x, i) => ({ raw: x, mult: mul[i], score: Math.round(x * mul[i]) }));
}
const rarKey = id => "c" + id;
export const rarOf = (s, id, db) => { const r = s && s.rar && s.rar[rarKey(id)]; return r != null ? Number(r) : ((db || DB || {})[id] || { r: RARITIES.length - 1 }).r; };
/* the transparent breakdown of one team: a row per role, plus the sums */
export function teamBreakdown(s, ids, db) {
    db = db || DB; const names = roleNames(s.rs);
    const rows = names.map((role, i) => {
        const id = Number(arr(ids)[i]) || 0, c = id && db[id];
        if (!c) return { role, id: 0, c: null, raw: 0, mult: 1, score: 0, bonus: 0, rar: -1, total: 0 };
        const sc = charRoles(c, s.rs, !!s.mixed)[i], rar = rarOf(s, id, db), bonus = RARITIES[rar].bonus;
        return { role, id, c, raw: sc.raw, mult: sc.mult, score: sc.score, bonus, rar, total: sc.score + bonus };
    });
    const roles = rows.reduce((n, r) => n + r.score, 0), bonus = rows.reduce((n, r) => n + r.bonus, 0);
    return { rows, roles, bonus, total: roles + bonus };
}
/* every team, ranked. Ties: higher role-score sum first (skill beats rarity), then (auction) more money left;
   still level = the same place. */
export function standings(s, db) {
    const teams = s.type === "build" ? SIDES.map(k => ({ key: k, players: arr(s.sides[k]).map(Number), ids: arr(s.team[k]) }))
        : arr(s.players).map(Number).map(p => ({ key: "p" + p, players: [p], ids: arr(s.team["p" + p]), money: Number(s.budget["p" + p]) || 0 }));
    teams.forEach(t => Object.assign(t, teamBreakdown(s, t.ids, db)));
    const cmp = (a, b) => (b.total - a.total) || (b.roles - a.roles) || ((b.money || 0) - (a.money || 0));
    teams.sort(cmp);
    teams.forEach((t, i) => { t.place = i && cmp(teams[i - 1], t) === 0 ? teams[i - 1].place : i + 1; });
    return teams;
}

/* ---------------- rules engine (pure) ---------------- */
const full = t => arr(t).length === R.slots && arr(t).every(x => Number(x) > 0);
const hasEmpty = (s, p) => arr(s.team["p" + p]).some(x => !Number(x));
const money = (s, p) => Number((s.budget || {})["p" + p]) || 0;
const empty6 = () => Array(R.slots).fill(0);
function evt(s, o) { s.evn = (Number(s.evn) || 0) + 1; s.ev = Object.assign({ n: s.evn }, o); }
function draw(s, rarity) {
    const d = arr(s.deck).slice(), id = Number(d.pop()) || 0; s.deck = d;
    if (id) { s.rar = s.rar || {}; s.rar[rarKey(id)] = rarity(id); }     // rarity is frozen in the match, a weekly re-rank can't change it mid-game
    return id;
}
export function shuffle(a, rnd = Math.random) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
/* o = { type, series, classic, mid, pool:[ids], sides:{L,R} (build), players (auction), rarity(id), rnd } */
export function newMatch(o) {
    const s = { v: DRAFT_VERSION, mid: o.mid || 0, type: o.type, series: o.series.slice(), rs: roleSetFor(o.series, o.classic), mixed: o.series.length > 1,
        deck: shuffle(o.pool, o.rnd), rar: {}, gone: [], evn: 0, ev: { n: 0, k: "start" }, phase: "", team: {} };
    if (o.type === "build") {
        s.sides = { L: o.sides.L.slice(), R: o.sides.R.slice() }; s.fmt = s.sides.L.length;
        s.team = { L: empty6(), R: empty6() }; s.rr = { L: R.rerolls, R: R.rerolls }; s.pk = { L: 0, R: 0 };
        s.turn = "L"; s.cur = draw(s, o.rarity); s.phase = s.rr.L ? "blind" : "place";
    } else {
        s.players = o.players.slice(); s.budget = {}; s.lotn = 0;
        s.players.forEach(p => { s.team["p" + p] = empty6(); s.budget["p" + p] = R.budget; });
        s.opener = s.players[s.players.length - 1];
        newLot(s, o.rarity);
    }
    return s;
}
/* whose move it is. Build: the side's members take turns (rotating every placement); an away member is skipped. */
export function actorOf(s, present = () => true) {
    if (!s || s.phase === "over") return 0;
    if (s.type === "build") {
        const m = arr(s.sides[s.turn]).map(Number), i0 = (Number(s.pk[s.turn]) || 0) % Math.max(1, m.length);
        for (let k = 0; k < m.length; k++) { const p = m[(i0 + k) % m.length]; if (present(p)) return p; }
        return m[i0] || 0;
    }
    return s.phase === "won" ? Number(s.win && s.win.p) || 0 : Number(s.lot && s.lot.turn) || 0;
}
/* apply one move; returns an error message (nothing changed) or null. ctx = { present, rarity, force } */
export function act(s, a, ctx) {
    if (!s || s.phase === "over") return "The draft is over.";
    const who = actorOf(s, ctx.present || (() => true));
    if (ctx.force) a = Object.assign({}, a, { by: who });
    else if (Number(a.by) !== who) return "It's not your turn.";
    return s.type === "build" ? buildAct(s, a, ctx) : aucAct(s, a, ctx);
}
function buildAct(s, a, ctx) {
    const side = s.turn, other = side === "L" ? "R" : "L";
    if (a.k === "keep") {
        if (s.phase !== "blind") return "Nothing to keep right now.";
        s.phase = "place"; evt(s, { k: "keep", side, c: s.cur, by: a.by }); return null;
    }
    if (a.k === "reroll") {
        if (s.phase !== "blind") return "A reroll is only possible right after the draw, before the stats.";
        if (!Number(s.rr[side])) return "Your side's reroll is already used.";
        const nu = draw(s, ctx.rarity); if (!nu) return "No characters left to draw.";
        s.rr[side] = 0; s.gone = arr(s.gone).concat(s.cur);
        evt(s, { k: "reroll", side, old: s.cur, c: nu, by: a.by }); s.cur = nu; s.phase = "place"; return null;
    }
    if (a.k === "place") {
        if (s.phase !== "place") return "Keep or reroll first.";
        const t = arr(s.team[side]).slice(), i = Number(a.slot);
        if (!(i >= 0 && i < R.slots) || Number(t[i])) return "That role is already filled.";
        t[i] = s.cur; s.team[side] = t; s.pk[side] = (Number(s.pk[side]) || 0) + 1;
        evt(s, { k: "place", side, c: s.cur, slot: i, by: a.by });
        const next = !full(s.team[other]) ? other : !full(t) ? side : null;
        s.cur = 0;
        if (!next) { s.phase = "over"; return null; }
        s.turn = next; s.cur = draw(s, ctx.rarity);
        s.phase = !s.cur ? "over" : Number(s.rr[next]) ? "blind" : "place";
        return null;
    }
    return "Unknown move.";
}
function contenders(s) {
    const L = s.lot, out = arr(L.out).map(Number), by = Number(L.by), need = Number(L.hi) ? Number(L.hi) + R.minRaise : R.openMin;
    return arr(s.players).map(Number).filter(p => p === by || (!out.includes(p) && hasEmpty(s, p) && money(s, p) >= need));
}
function aucAct(s, a, ctx) {
    const L = s.lot, me = Number(a.by);
    if (a.k === "bid") {
        if (s.phase !== "bid") return "No auction is running.";
        const amt = Math.floor(Number(a.amount)), need = Number(L.hi) ? Number(L.hi) + R.minRaise : R.openMin;
        if (!hasEmpty(s, me)) return "Your team is already full.";
        if (!(amt >= need)) return "Bid at least $" + need + ".";
        if (amt > money(s, me)) return "You only have $" + money(s, me) + ".";
        L.hi = amt; L.by = me; evt(s, { k: "bid", p: me, amt, c: L.c });
        return aucNext(s, me, ctx);
    }
    if (a.k === "pass") {
        if (s.phase !== "bid") return "No auction is running.";
        L.out = arr(L.out).concat(me); evt(s, { k: "pass", p: me, c: L.c });
        return aucNext(s, me, ctx);
    }
    if (a.k === "place") {
        if (s.phase !== "won") return "Nothing to place.";
        const t = arr(s.team["p" + me]).slice(), i = Number(a.slot);
        if (!(i >= 0 && i < R.slots) || Number(t[i])) return "That role is already filled.";
        t[i] = s.win.c; s.team["p" + me] = t;
        evt(s, { k: "place", p: me, c: s.win.c, slot: i, by: me, amt: s.win.amt });
        s.win = null; newLot(s, ctx.rarity); return null;
    }
    return "Unknown move.";
}
// after a bid or a pass: sold, unsold, or the next bidder in seat order
function aucNext(s, from, ctx) {
    const L = s.lot, con = contenders(s), by = Number(L.by);
    if (by && con.length === 1 && con[0] === by) return sell(s);
    if (!by && !con.length) { evt(s, { k: "unsold", c: L.c }); s.gone = arr(s.gone).concat(L.c); newLot(s, ctx.rarity); return null; }
    const ps = arr(s.players).map(Number), at = ps.indexOf(Number(from));
    for (let k = 1; k <= ps.length; k++) { const p = ps[(at + k) % ps.length]; if (p !== by && con.includes(p)) { L.turn = p; return null; } }
    return by ? sell(s) : (newLot(s, ctx.rarity), null);
}
function sell(s) {
    const L = s.lot, p = Number(L.by), amt = Number(L.hi);
    s.budget["p" + p] = money(s, p) - amt; s.win = { p, c: L.c, amt }; s.phase = "won";
    evt(s, { k: "sold", p, c: L.c, amt }); return null;
}
// the next lot opens with the next player (after the last opener) who can still buy; nobody can = the draft ends
function newLot(s, rarity) {
    const ps = arr(s.players).map(Number), can = p => hasEmpty(s, p) && money(s, p) >= R.openMin;
    if (!ps.some(can)) { s.phase = "over"; s.lot = null; return; }
    const at = ps.indexOf(Number(s.opener)); let op = 0;
    for (let k = 1; k <= ps.length; k++) { const p = ps[(at + k) % ps.length]; if (can(p)) { op = p; break; } }
    const c = draw(s, rarity); if (!c) { s.phase = "over"; s.lot = null; return; }
    s.opener = op; s.lot = { c, hi: 0, by: 0, turn: op, out: [] }; s.lotn = (Number(s.lotn) || 0) + 1; s.phase = "bid";
}
/* the move the host plays for an away player: keep, pass, or the best free role */
export function autoMove(s, db) {
    if (s.phase === "blind") return { k: "keep" };
    if (s.phase === "bid") return { k: "pass" };
    const p = actorOf(s), key = s.type === "build" ? s.turn : "p" + p, c = (db || DB)[s.type === "build" ? s.cur : s.win.c];
    const t = arr(s.team[key]), sc = c ? charRoles(c, s.rs, !!s.mixed) : [];
    let best = -1; t.forEach((x, i) => { if (!Number(x) && (best < 0 || (sc[i] || {}).score > (sc[best] || {}).score)) best = i; });
    return { k: "place", slot: best };
}

/* =====================================================================
   CLIENT: lobby panel, match screen, animations, host duties
   ===================================================================== */
let X = null;
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const presentIn = d => p => { const n = d && d["player" + p]; return !!n && !n.left && ((d.presence || {})["p" + p] !== false); };
const dType = d => d && d.draftType === "auction" ? "auction" : "build";
const dFmt = d => [1, 2, 3, 4].includes(Number(d && d.draftFmt)) ? Number(d.draftFmt) : 1;
const dClassic = d => !!d && d.draftRoles === "classic";
const dSeries = d => arr(d && d.animes).filter(k => CHARS[k]);
const label = k => (X.HB_SERIES[k] || { label: k }).label;
export const draftPrefs = p => ({ draftType: p.draftType === "auction" ? "auction" : "build", draftFmt: [1, 2, 3, 4].includes(Number(p.draftFmt)) ? Number(p.draftFmt) : 1, draftRoles: p.draftRoles === "classic" ? "classic" : "auto" });
export const draftPrefsOf = d => ({ draftType: dType(d), draftFmt: dFmt(d), draftRoles: dClassic(d) ? "classic" : "auto" });

export function initDraft(ctx) {
    X = ctx; loadPacks = ctx.loadPacks;
    Object.assign(window, {
        setDraftOpt(k, v) {
            const d = X.data(); if (!d || !X.amHost() || d.status !== "waiting") return;
            X.sfx("pick");
            if (k === "type") X.lobbySet({ draftType: v === "auction" ? "auction" : "build" });
            if (k === "fmt") X.lobbySet({ draftFmt: Number(v) });
            if (k === "roles") X.lobbySet({ draftRoles: dClassic(d) ? "auto" : "classic" });
        },
        draftSideTap(p) {
            const d = X.data(); if (!d || !X.amHost() || d.status !== "waiting") return;
            const sd = sidesOf(d), map = {}, cur = sd.L.includes(p) ? "L" : sd.R.includes(p) ? "R" : "S", nx = { L: "R", R: "S", S: "L" }[cur];
            sd.L.forEach(i => { map["p" + i] = "L"; }); sd.R.forEach(i => { map["p" + i] = "R"; }); sd.S.forEach(i => { map["p" + i] = "S"; });
            map["p" + p] = nx; X.sfx("toggle"); X.lobbySet({ draftSides: map });
        },
        drKeep: () => move({ k: "keep" }),
        drReroll: () => move({ k: "reroll" }),
        drPlace: i => move({ k: "place", slot: i }),
        drPass: () => move({ k: "pass" }),
        drBid: () => { const v = Number(($("drBidAmt") || {}).dataset.v); move({ k: "bid", amount: v }); },
        drStep: k => { const b = $("drBidAmt"); if (b) setBid(Number(b.dataset.v) + k); },
        drSetBid: v => setBid(v),
        drView: k => { viewKey = k; X.sfx("toggle"); const d = X.data(); if (d && d.draft) render(d, d.draft, true); },
        drAgain: () => draftStart(true),
        drLobby: () => X.backToLobby(true)
    });
    draftLoad();
}
const $ = id => document.getElementById(id);

/* ---------------- lobby ---------------- */
/* Left / Right / spectating for Build. Saved picks first; anyone new fills the emptier side, the rest watch. */
export function sidesOf(d) {
    const act = X.activeSlots(d), N = dFmt(d), map = d.draftSides || {}, L = [], Rr = [], S = [];
    act.forEach(i => { const v = map["p" + i]; if (v === "L" && L.length < N) L.push(i); else if (v === "R" && Rr.length < N) Rr.push(i); else if (v === "S") S.push(i); });
    act.filter(i => !L.includes(i) && !Rr.includes(i) && !S.includes(i)).forEach(i => {
        if (L.length < N && L.length <= Rr.length) L.push(i); else if (Rr.length < N) Rr.push(i); else if (L.length < N) L.push(i); else S.push(i);
    });
    return { L, R: Rr, S };
}
const roleLabel = d => dClassic(d) ? "Classic roles" : dSeries(d).length === 1 ? label(dSeries(d)[0]) + " roles" : "Mixed roles";
export function draftHint(d) {
    const n = dSeries(d).length;
    return n === 1 ? "One series ticked: its own six roles. Tick two or more for the Mixed roles." : n > 1 ? n + " series ticked: the six Mixed roles. Characters only come from the series you tick." : "Tick the series for the character pool.";
}
export function draftReq(d) {
    const keys = dSeries(d), act = X.activeSlots(d), type = dType(d), N = dFmt(d), pool = keys.reduce((n, k) => n + CHARS[k].length, 0);
    if (!keys.length) return { ok: false, msg: "Tick at least one series." };
    let extra = "";
    if (type === "build") {
        const sd = sidesOf(d);
        if (act.length < 2 * N) return { ok: false, msg: N + "v" + N + " Build needs " + 2 * N + " players (" + act.length + " here). Pick a smaller format or invite more." };
        if (sd.L.length !== N || sd.R.length !== N) return { ok: false, msg: "Put " + N + " on each side (" + sd.L.length + " left, " + sd.R.length + " right). Tap a player to move them." };
        if (pool < 2 * R.slots + 2 * R.rerolls) return { ok: false, msg: "Those series have " + pool + " draftable characters; Build needs " + (2 * R.slots + 2 * R.rerolls) + ". Tick another series." };
        extra = N + "v" + N + " Build" + (sd.S.length ? ", " + sd.S.length + " spectating" : "");
    } else {
        if (pool < R.slots * act.length) return { ok: false, msg: "An auction for " + act.length + " needs " + R.slots * act.length + " characters; those series have " + pool + ". Tick another series." };
        extra = "Auction, $" + R.budget + " each";
    }
    if (!DB) { draftLoad().then(() => X.lobbyRefresh()); return { ok: false, wait: true, msg: "Loading the character database…" }; }
    return { ok: true, msg: "Anime Draft · " + extra + " · " + roleLabel(d) + " · " + pool + " characters" };
}
export function draftLobby(d, lock) {
    const type = dType(d), N = dFmt(d);
    document.querySelectorAll(".drtbtn").forEach(b => { b.classList.toggle("selected", b.dataset.k === type); b.disabled = lock; });
    document.querySelectorAll(".drfbtn").forEach(b => { b.classList.toggle("selected", Number(b.dataset.k) === N); b.disabled = lock; });
    $("drFmtBox").classList.toggle("hidden", type !== "build");
    const tg = $("drRolesTg"); tg.setAttribute("aria-checked", String(dClassic(d))); tg.classList.toggle("on", dClassic(d)); tg.disabled = lock;
    $("drRolesName").textContent = roleLabel(d);
    const pv = $("drRolePrev"); pv.innerHTML = "";
    roleNames(dClassic(d) ? "classic" : roleSetFor(dSeries(d).length ? dSeries(d) : ["onepiece", "naruto"], false)).forEach(r => pv.appendChild(el("span", null, (ROLE_ICONS[r] || "◆") + " " + r)));
    const box = $("drTeams"); box.innerHTML = "";
    if (type === "build") {
        const sd = sidesOf(d);
        ["L", "R", "S"].forEach(k => {
            const ids = sd[k]; if (k === "S" && !ids.length) return;
            const t = k === "S" ? "SPECTATING" : ids.length ? joinNames(ids.map(p => X.pName(d, p))).toUpperCase() : "OPEN SIDE";
            const col = el("div", "drt-col drt-" + k); col.appendChild(el("b", null, t + (k === "S" ? "" : " · " + ids.length + "/" + N)));
            ids.forEach(p => { const c = el("button", "drt-chip"); c.type = "button"; c.disabled = lock; c.append(X.avatarEl(X.pPub(d, p), { size: 22 }), el("span", null, X.pName(d, p))); c.onclick = () => window.draftSideTap(p); col.appendChild(c); });
            for (let k2 = ids.length; k !== "S" && k2 < N; k2++) col.appendChild(el("span", "drt-empty", "open seat"));
            box.appendChild(col);
        });
        if (!lock) box.appendChild(el("p", "anime-hint", "Tap a player to move them to the other side, tap again to spectate."));
    }
    $("drHint").textContent = type === "build" ? "Sides alternate: draw, then place in a free role. One blind reroll per side." : "Everyone starts with $" + R.budget + ". Bid at least $" + R.minRaise + " more than the last bid, or pass.";
}

/* ---------------- start (host) ---------------- */
export async function draftStart(again) {
    const d = X.data(); if (!d || !X.amHost()) return;
    if (again && !(d.draft && d.draft.phase === "over") && !(await X.uiConfirm({ title: "Restart the draft?", text: "The current draft is thrown away.", ok: "Restart" }))) return;
    try {
        const db = await draftLoad(), series = dSeries(d), type = dType(d), mid = Date.now();
        const pool = Object.values(db).filter(c => series.includes(c.s)).map(c => c.id);
        const o = { type, series, classic: dClassic(d), mid, pool, rarity: id => (db[id] || { r: 4 }).r };
        if (type === "build") { const sd = again && d.draft && d.draft.sides ? { L: arr(d.draft.sides.L).map(Number), R: arr(d.draft.sides.R).map(Number) } : sidesOf(d); o.sides = { L: sd.L, R: sd.R }; }
        else o.players = again && d.draft && d.draft.players ? arr(d.draft.players).map(Number).filter(p => X.activeSlots(d).includes(p)) : X.activeSlots(d);
        if (type === "auction" && o.players.length < 2) { X.toast("An auction needs at least 2 players."); return; }
        await X.update(X.ref(X.db, "rooms/" + X.room()), { status: "playing", matchId: mid, draft: newMatch(o) });
    } catch (e) { console.error(e); X.toast("Could not start the draft: " + (e.message || e)); }
}
export const draftSeats = d => { const s = d && d.draft; if (!s) return []; return s.type === "build" ? arr(s.sides && s.sides.L).concat(arr(s.sides && s.sides.R)).map(Number) : arr(s.players).map(Number); };
export const draftOver = d => !d.draft || d.draft.phase === "over";

/* ---------------- moves ---------------- */
let busy = false;
async function move(a) {
    if (busy) return; busy = true;
    let err = null;
    try {
        await X.runTransaction(X.ref(X.db, "rooms/" + X.room() + "/draft"), cur => {
            if (!cur) return cur;
            err = act(cur, Object.assign({ by: X.me() }, a), { present: presentIn(X.data()), rarity: id => (DB[id] || { r: 4 }).r });
            return err ? undefined : cur;
        });
    } catch (e) { console.error(e); err = "Couldn't sync that move. Try again."; }
    busy = false;
    if (err) { X.toast(err); X.sfx("strike"); }
}

/* ---------------- host duties: away players ---------------- */
let awayT = 0, awayKey = "", goneKey = "";
export function draftDuties(d) {
    const s = d.draft; if (!s || s.phase === "over" || !DB) return;
    if (s.type === "build") {
        const empty = SIDES.find(k => !arr(s.sides[k]).some(p => d["player" + p] && !d["player" + p].left));
        if (empty) { const k = "g" + s.mid; if (goneKey !== k) { goneKey = k; X.toast(joinNames(arr(s.sides[empty]).map(p => X.pName(d, Number(p)))) + " left. Back to the lobby."); X.backToLobby(true); } return; }
    }
    const present = presentIn(d), who = actorOf(s, present), key = s.mid + ":" + s.evn + ":" + s.phase + ":" + who;
    if (!who || present(who)) { clearTimeout(awayT); awayKey = ""; return; }
    if (awayKey === key) return;
    awayKey = key; clearTimeout(awayT);
    const left = !d["player" + who] || d["player" + who].left;
    awayT = setTimeout(() => {
        const d2 = X.data(); if (!d2 || !d2.draft || !X.amHost()) return;
        const s2 = d2.draft, p2 = presentIn(d2);
        if (s2.mid + ":" + s2.evn + ":" + s2.phase + ":" + actorOf(s2, p2) !== key || p2(actorOf(s2, p2))) return;
        X.runTransaction(X.ref(X.db, "rooms/" + X.room() + "/draft"), cur => {
            if (!cur || cur.evn !== s2.evn) return;
            return act(cur, autoMove(cur), { present: presentIn(X.data()), rarity: id => (DB[id] || { r: 4 }).r, force: true }) ? undefined : cur;
        }).catch(e => console.error(e));
    }, left ? R.leftMs : R.awayMs);
}

/* ---------------- screen ---------------- */
let seen = { mid: 0, evn: -1, turnMine: false, lot: 0, phase: "", over: 0 }, viewKey = "", layout = "";
export function draftReset() { seen = { mid: 0, evn: -1, turnMine: false, lot: 0, phase: "", over: 0 }; viewKey = ""; layout = ""; clearTimeout(awayT); awayKey = ""; const o = $("drOver"); if (o) o.remove(); }
export function showDraft(d) {
    X.showOnly("draft");
    if (!DB) { $("drTurn").textContent = "Loading characters…"; draftLoad().then(() => { const d2 = X.data(); if (d2 && d2.draft && d2.gameType === "draft") showDraft(d2); }); return; }
    if (d.draft) render(d, d.draft);
}
const rarity = (s, id) => RARITIES[rarOf(s, id)];
const myKey = s => s.type === "build" ? SIDES.find(k => arr(s.sides[k]).map(Number).includes(X.me())) || "" : (arr(s.players).map(Number).includes(X.me()) ? "p" + X.me() : "");
function teamName(d, s, key) {
    if (s.type === "build") return joinNames(arr(s.sides[key]).map(p => X.pName(d, Number(p))));
    return X.pName(d, Number(key.slice(1)));
}

/* a collectible card. mode: "full" | "blind" | "mini" */
function cardEl(s, id, mode) {
    const c = DB[id], R0 = rarity(s, id), blind = mode === "blind";
    const box = el("div", "dc " + (mode === "mini" ? "mini " : "") + (blind ? "blind" : "r-" + R0.key));
    if (!c) { box.appendChild(el("div", "dc-name", "Unknown")); return box; }
    box.style.setProperty("--rc", blind ? "#8d8a86" : R0.color);
    const art = el("div", "dc-art"), im = new Image(); im.alt = ""; im.draggable = false; im.decoding = "async";
    if (c.img) { im.src = c.img; im.onerror = () => { im.remove(); art.classList.add("noimg"); }; art.appendChild(im); } else art.classList.add("noimg");
    art.appendChild(el("span", "dc-kj", c.n.slice(0, 1)));
    box.appendChild(art);
    box.appendChild(el("div", "dc-rar", blind ? "? ? ?" : R0.name.toUpperCase()));
    const cap = el("div", "dc-cap"); cap.append(el("small", null, label(c.s)), el("b", null, c.n)); box.appendChild(cap);
    if (mode === "mini") return box;
    const st = el("div", "dc-stats"), names = roleNames(s.rs), sc = charRoles(c, s.rs, !!s.mixed);
    names.forEach((r, i) => {
        const row = el("div", "dc-st");
        row.append(el("i", null, ROLE_ICONS[r] || "◆"), el("span", null, r));
        const bar = el("em"), f = el("u");
        if (blind) { row.classList.add("hid"); f.style.width = "100%"; bar.appendChild(f); row.append(bar, el("b", null, "??")); }
        else { f.style.width = sc[i].score + "%"; bar.appendChild(f); const v = el("b", null, String(sc[i].score)); if (sc[i].mult !== 1) v.title = sc[i].raw + " × " + sc[i].mult + " (series tier)"; row.append(bar, v); }
        st.appendChild(row);
    });
    box.appendChild(st);
    const foot = el("div", "dc-foot");
    foot.append(el("span", null, blind ? "Stats hidden until you keep it" : "♥ " + c.f.toLocaleString("en-US") + " fans"), el("span", null, blind ? "" : "+" + R0.bonus + " rarity"));
    box.appendChild(foot);
    return box;
}

/* a six-role board. placing = the character id being placed by me (slots become buttons showing its score there) */
function boardEl(d, s, key, placing) {
    const ids = arr(s.team[key]), names = roleNames(s.rs), bd = teamBreakdown(s, ids), mine = key === myKey(s);
    const box = el("section", "dr-board" + (mine ? " mine" : "") + (placing ? " placing" : "") + (s.type === "build" ? " side-" + key : ""));
    box.dataset.key = key;
    const head = el("div", "drb-head"), who = el("div", "drb-who");
    who.appendChild(el("b", null, teamName(d, s, key)));
    const ppl = el("span", "drb-ppl");
    (s.type === "build" ? arr(s.sides[key]).map(Number) : [Number(key.slice(1))]).forEach(p => { const a = X.avatarEl(X.pPub(d, p), { size: 22 }); a.title = X.pName(d, p); if (!presentIn(d)(p)) a.classList.add("away"); ppl.appendChild(a); });
    who.appendChild(ppl); head.appendChild(who);
    const meta = el("div", "drb-meta");
    if (s.type === "build") { const left = Number(s.rr[key]) > 0; const tk = el("span", "dr-token" + (left ? "" : " used"), left ? "🎲 REROLL ×1" : "🎲 USED"); tk.title = left ? "One blind reroll for the whole match" : "This side's reroll is spent"; meta.appendChild(tk); }
    else meta.appendChild(el("span", "dr-cash", "$" + (Number(s.budget[key]) || 0)));
    const sc = el("span", "drb-score"); sc.append(el("b", null, String(bd.total)), el("small", null, "pts")); meta.appendChild(sc);
    head.appendChild(meta); box.appendChild(head);
    const grid = el("div", "drb-grid"), pc = placing && DB[placing], pr = pc ? charRoles(pc, s.rs, !!s.mixed) : null;
    let best = -1; if (pr) ids.forEach((x, i) => { if (!Number(x) && (best < 0 || pr[i].score > pr[best].score)) best = i; });
    names.forEach((r, i) => {
        const id = Number(ids[i]) || 0, row = bd.rows[i];
        const slot = el(pr && !id ? "button" : "div", "drb-slot" + (id ? " full r-" + RARITIES[row.rar].key : "") + (pr && !id ? " open" + (i === best ? " best" : "") : ""));
        slot.dataset.slot = key + i;
        slot.appendChild(el("span", "drs-role", (ROLE_ICONS[r] || "◆") + " " + r));
        if (id) {
            slot.appendChild(cardEl(s, id, "mini"));
            const v = el("span", "drs-val"); v.append(el("b", null, String(row.score)), el("small", null, row.bonus ? "+" + row.bonus : "")); slot.appendChild(v);
        } else if (pr) {
            slot.type = "button"; slot.onclick = () => window.drPlace(i);
            slot.setAttribute("aria-label", "Place in " + r + ": " + pr[i].score + " points");
            slot.appendChild(el("span", "drs-prev", "+" + pr[i].score));
            if (i === best) slot.appendChild(el("span", "drs-best", "BEST"));
        } else slot.appendChild(el("span", "drs-empty", "empty"));
        grid.appendChild(slot);
    });
    box.appendChild(grid);
    return box;
}

let bidPick = { k: "", v: 0 };      // the amount I dialled in, kept while other updates re-render the stage
function bidLimits() {
    const d = X.data(), s = d && d.draft; if (!s || !s.lot) return { min: 1, max: 1 };
    const need = Number(s.lot.hi) ? Number(s.lot.hi) + R.minRaise : R.openMin;
    return { min: need, max: Math.max(need, Number(s.budget["p" + X.me()]) || 0) };
}
function setBid(v) {
    const b = $("drBidAmt"), s = (X.data() || {}).draft; if (!b || !s || !s.lot) return;
    const lim = bidLimits(); v = Math.max(lim.min, Math.min(lim.max, Math.round(v)));
    b.dataset.v = v; b.textContent = "$" + v; bidPick = { k: s.lotn + ":" + s.lot.hi, v }; X.sfx("tick"); syncBidBtn();
}
function syncBidBtn() { const b = $("drBidGo"), a = $("drBidAmt"); if (b && a) b.textContent = "BID " + a.textContent; }

function stageEl(d, s) {
    const st = el("section", "dr-stage"), present = presentIn(d), who = actorOf(s, present), me = X.me(), mine = who === me;
    const id = s.type === "build" ? s.cur : s.phase === "won" ? s.win && s.win.c : s.lot && s.lot.c;
    const blind = s.type === "build" && s.phase === "blind";
    const kick = el("div", "dr-kick");
    if (s.type === "build") kick.append(el("span", "dr-side-tag side-" + s.turn, teamName(d, s, s.turn).toUpperCase()), el("span", null, " draws · pick " + (arr(s.team[s.turn]).filter(Number).length + 1) + "/6"));
    else kick.append(el("span", null, "LOT " + (s.lotn || 1)), el("span", "dr-left", " · " + arr(s.deck).length + " left in the pool"));
    st.appendChild(kick);
    if (id) { const cw = el("div", "dr-cardwrap"); cw.id = "drCardWrap"; const card = cardEl(s, id, blind ? "blind" : "full"); card.id = "drCard"; cw.appendChild(card); if (s.phase === "won") cw.appendChild(el("div", "dr-sold", "SOLD $" + s.win.amt)); st.appendChild(cw); }
    const act = el("div", "dr-act");
    const name = id && DB[id] ? DB[id].n : "";
    if (s.type === "build") {
        if (blind) {
            if (mine) {
                act.appendChild(el("p", "dr-q", "Keep " + name + "? Stats and rarity stay hidden until you decide."));
                const row = el("div", "dr-btns"), k = el("button", "btn xl", "KEEP"), rr = el("button", "btn alt xl dr-rr");
                k.onclick = () => window.drKeep(); rr.onclick = () => window.drReroll();
                rr.append(el("span", null, "🎲 REROLL"), el("small", null, "one time only"));
                rr.disabled = !Number(s.rr[s.turn]);
                row.append(k, rr); act.appendChild(row);
            } else act.appendChild(el("p", "dr-wait", X.pName(d, who) + " decides: keep or use the one reroll…"));
        } else if (mine) act.appendChild(el("p", "dr-q", "Place " + name + " in a free role on your board."));
        else act.appendChild(el("p", "dr-wait", X.pName(d, who) + " is placing " + name + "…"));
    } else if (s.phase === "bid") {
        const L = s.lot, hi = Number(L.hi), by = Number(L.by);
        const hb = el("div", "dr-hi" + (hi ? "" : " none")); hb.id = "drHi";
        if (hi) { hb.append(el("small", null, "HIGH BID"), el("b", null, "$" + hi), el("span", null, X.pName(d, by))); } else hb.append(el("small", null, "NO BIDS YET"), el("b", null, "$0"), el("span", null, "opening bid $" + R.openMin + "+"));
        act.appendChild(hb);
        if (mine) {
            const lim = bidLimits(), pick = bidPick.k === s.lotn + ":" + L.hi ? Math.max(lim.min, Math.min(lim.max, bidPick.v)) : lim.min;
            const pad = el("div", "dr-bid"), amt = el("b", "dr-amt", "$" + pick); amt.id = "drBidAmt"; amt.dataset.v = pick;
            const minus = el("button", "btn ghost sm", "−"), plus = el("button", "btn ghost sm", "+");
            minus.onclick = () => window.drStep(-1); plus.onclick = () => window.drStep(1);
            pad.append(minus, amt, plus);
            const quick = el("div", "dr-quick");
            [["+1", lim.min], ["+2", lim.min + 1], ["+5", lim.min + 4], ["ALL IN", lim.max]].forEach(([t, v]) => { if (v > lim.max && t !== "ALL IN") return; const b = el("button", "chip-btn", t + (t === "ALL IN" ? " $" + lim.max : "")); b.onclick = () => window.drSetBid(v); quick.appendChild(b); });
            const row = el("div", "dr-btns"), go = el("button", "btn xl", "BID $" + pick), ps = el("button", "btn ghost xl", "PASS");
            go.id = "drBidGo"; go.onclick = () => window.drBid(); ps.onclick = () => window.drPass();
            row.append(go, ps);
            act.append(el("p", "dr-q", "Your bid. You have $" + (Number(s.budget["p" + me]) || 0) + "."), pad, quick, row);
        } else act.appendChild(el("p", "dr-wait", X.pName(d, who) + " is bidding…"));
    } else if (s.phase === "won") {
        act.appendChild(el("p", mine ? "dr-q" : "dr-wait", mine ? "You won " + name + " for $" + s.win.amt + ". Place it in a free role." : X.pName(d, s.win.p) + " won " + name + " for $" + s.win.amt + " and is placing it…"));
    }
    st.appendChild(act);
    return st;
}

function playersEl(d, s) {
    const box = el("div", "dr-plist"), who = actorOf(s, presentIn(d)), L = s.lot || {};
    arr(s.players).map(Number).forEach(p => {
        const k = "p" + p, filled = arr(s.team[k]).filter(Number).length, out = arr(L.out).map(Number).includes(p);
        const c = el("button", "dr-pl" + (p === who ? " turn" : "") + (s.phase === "bid" && Number(L.by) === p ? " high" : "") + (s.phase === "bid" && out ? " out" : "") + (filled === 6 ? " done" : "") + (p === X.me() ? " me" : "") + (viewKey === k ? " viewing" : ""));
        c.type = "button"; c.dataset.p = p; c.onclick = () => window.drView(k);
        c.appendChild(X.avatarEl(X.pPub(d, p), { size: 34 }));
        const t = el("div", "dr-pl-t"); t.append(el("b", null, X.pName(d, p)), el("small", null, filled + "/6 · " + (filled === 6 ? "full" : s.phase === "bid" && out ? "passed" : s.phase === "bid" && Number(L.by) === p ? "high bid" : p === who ? "bidding" : "")));
        c.append(t, el("span", "dr-pl-cash", "$" + (Number(s.budget[k]) || 0)));
        if (!presentIn(d)(p)) c.classList.add("away");
        box.appendChild(c);
    });
    return box;
}

/* ---------------- render + animations ---------------- */
function render(d, s, quiet) {
    if (!s) return;
    const fresh = seen.mid !== s.mid;
    if (fresh) { draftReset(); seen.mid = s.mid; seen.evn = Number(s.evn) || 0; try { window.scrollTo(0, 0); } catch (e) {} }
    const ev = s.ev || {}, newEv = !fresh && !quiet && Number(ev.n) > seen.evn;
    const me = X.me(), present = presentIn(d), who = actorOf(s, present), mk = myKey(s);
    // header
    const turnTxt = s.phase === "over" ? "DRAFT COMPLETE" : who === me ? (s.phase === "blind" ? "YOUR DRAW" : s.phase === "bid" ? "YOUR BID" : "PLACE YOUR PICK") : (s.type === "build" && s.fmt > 1 ? teamName(d, s, s.turn).toUpperCase() + " · " : "") + X.pName(d, who).toUpperCase() + (s.type === "build" && s.fmt > 1 ? " PICKS" : "");
    $("drTurn").textContent = turnTxt;
    $("drStatus").textContent = (s.type === "build" ? s.fmt + "v" + s.fmt + " Build" : "Auction") + " · " + (s.rs === "classic" ? "Classic roles" : s.rs === "mixed" ? "Mixed roles" : label(s.rs) + " roles") + " · " + s.series.map(label).join(" · ") + (mk ? "" : " · spectating");
    // remember where the drawn card was, so a placement can fly from it
    let flyFrom = null, flyNode = null;
    if (newEv && ev.k === "place") { const c = $("drCard"); if (c) { flyFrom = c.getBoundingClientRect(); flyNode = c.cloneNode(true); } }
    const wrap = $("drWrap"), placingMine = s.phase !== "over" && who === me && (s.phase === "place" || s.phase === "won");
    wrap.innerHTML = "";
    wrap.className = "dr-wrap " + s.type;
    if (s.type === "build") {
        const other = mk === "R" ? "L" : "R", first = mk || "L";
        const g = el("div", "dr-grid");
        const a = boardEl(d, s, first, placingMine ? s.cur : 0), b = boardEl(d, s, first === "L" ? "R" : other, 0);
        a.classList.add("first"); g.append(stageEl(d, s), a, b);
        wrap.appendChild(g);
    } else {
        if (!viewKey || !s.team[viewKey] || placingMine) viewKey = mk || "p" + arr(s.players)[0];
        wrap.appendChild(playersEl(d, s));
        const g = el("div", "dr-grid");
        g.append(stageEl(d, s), boardEl(d, s, viewKey, placingMine ? s.win.c : 0));
        wrap.appendChild(g);
    }
    // events
    if (newEv) playEvent(d, s, ev, flyFrom, flyNode);
    else if (!fresh && s.type === "auction" && Number(s.lotn) !== seen.lot && s.phase === "bid") revealAnim(s, s.lot.c);
    if (fresh && s.phase !== "over") revealAnim(s, s.type === "build" ? s.cur : (s.lot || s.win || {}).c);
    seen.evn = Math.max(seen.evn, Number(ev.n) || 0); seen.lot = Number(s.lotn) || 0;
    // my turn ping
    const myTurn = s.phase !== "over" && who === me;
    if (myTurn && !seen.turnMine) X.sfx("turn");
    seen.turnMine = myTurn;
    if (s.phase === "over") showOver(d, s); else { const o = $("drOver"); if (o) o.remove(); seen.over = 0; }
}
function centerOf(node) { const r = node.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
function revealAnim(s, id) {
    const c = $("drCard"); if (!c || !id) return;
    const R0 = rarity(s, id);
    c.classList.add("in");
    if (s.type === "build" && s.phase === "blind" && id === s.cur) { X.sfx("draw"); return; }    // still blind: no rarity fanfare
    if (R0.key === "mythical" || R0.key === "legendary") {
        setTimeout(() => { const [x, y] = centerOf(c); X.ring(x, y, R0.color, 420, 800); X.burstText(R0.name.toUpperCase() + "!", x, y - 120, R0.color, "big"); X.sfx(R0.key === "mythical" ? "impact" : "reveal"); if (R0.key === "mythical") document.body.classList.add("dr-myth"); setTimeout(() => document.body.classList.remove("dr-myth"), 900); }, 420);
    } else X.sfx("flip");
}
function playEvent(d, s, ev, flyFrom, flyNode) {
    const name = p => X.pName(d, p);
    if (ev.k === "keep") { const c = $("drCard"); if (c) { c.classList.add("flipin"); revealAnim(s, ev.c); } }
    else if (ev.k === "reroll") {
        X.sfx("reverse");
        const c = $("drCard"); if (c) { c.classList.add("rerolled"); const [x, y] = centerOf(c); X.burstText("REROLL!", x, y + 170, "#f0c869", "big"); setTimeout(() => revealAnim(s, ev.c), 350); }
    } else if (ev.k === "place") {
        const key = s.type === "build" ? ev.side : "p" + ev.p, slot = document.querySelector('[data-slot="' + key + ev.slot + '"]');
        if (!slot) return;
        const sc = teamBreakdown(s, s.team[key]).rows[ev.slot];
        slot.classList.add("landing");
        const done = () => { slot.classList.remove("landing"); slot.classList.add("slam"); const [x, y] = centerOf(slot); X.burstText("+" + sc.total, x, y, RARITIES[sc.rar].color); X.sfx("slam"); };
        if (flyFrom && flyNode) X.flyClone(flyNode, flyFrom, slot.getBoundingClientRect(), { ms: 520, rot: -6 }).then(done); else done();
        if (s.phase !== "over" && s.type === "build") setTimeout(() => revealAnim(s, s.cur), 560);
        else if (s.phase === "bid") setTimeout(() => revealAnim(s, s.lot.c), 560);
    } else if (ev.k === "bid") {
        X.sfx("coin"); const hb = $("drHi"); if (hb) { hb.classList.add("bump"); const [x, y] = centerOf(hb); X.burstText("$" + ev.amt, x, y - 40, "#f0c869"); }
        const pl = document.querySelector('.dr-pl[data-p="' + ev.p + '"]'); if (pl) X.shake(pl, 5);
    } else if (ev.k === "pass") { X.sfx("toggle"); const pl = document.querySelector('.dr-pl[data-p="' + ev.p + '"]'); if (pl) { const [x, y] = centerOf(pl); X.burstText("PASS", x, y - 30, "#a7a3a0"); } }
    else if (ev.k === "sold") { X.sfx("stamp"); const c = $("drCardWrap"); if (c) { c.classList.add("sold"); const [x, y] = centerOf(c); X.burstText(name(ev.p) + " · $" + ev.amt, x, y + 140, "#f0c869", "big"); X.shake(c, 8); } }
    else if (ev.k === "unsold") { X.sfx("skip"); X.toast("No bids: " + ((DB[ev.c] || {}).n || "the character") + " goes back to the void."); if (s.phase === "bid") setTimeout(() => revealAnim(s, s.lot.c), 200); }
}

/* ---------------- results ---------------- */
function showOver(d, s) {
    if (seen.over === s.mid && $("drOver")) return;
    seen.over = s.mid;
    const old = $("drOver"); if (old) old.remove();
    const teams = standings(s), mk = myKey(s), mine = teams.find(t => t.key === mk);
    const ov = el("div", "dr-over"); ov.id = "drOver"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Draft results");
    const top = teams[0], tie = teams.length > 1 && teams[1].place === 1;
    const head = el("div", "dro-head");
    head.appendChild(el("div", "dro-kick", "ANIME DRAFT · FINAL SCORES"));
    const title = tie ? "DEAD EVEN" : s.type === "build" ? teamName(d, s, top.key).toUpperCase() + (top.players.length > 1 ? " WIN" : " WINS") : X.pName(d, top.players[0]).toUpperCase() + " WINS";
    const h = el("h1", "dro-title", title); h.dataset.text = title; head.appendChild(h);
    head.appendChild(el("p", "dro-sub", mine ? (mine.place === 1 ? (tie ? "Shared first place." : "Your team is the strongest.") : "You finished " + ord(mine.place) + ".") + " Score = six role scores + six rarity bonuses." : "Score = six role scores + six rarity bonuses."));
    ov.appendChild(head);
    const list = el("div", "dro-list");
    teams.forEach((t, i) => {
        const card = el("section", "dro-team p" + Math.min(t.place, 4) + (t.key === mk ? " me" : "")); card.style.setProperty("--i", i);
        const th = el("div", "dro-th");
        th.appendChild(el("span", "dro-place", ord(t.place)));
        const who = el("div", "dro-who"); who.appendChild(el("b", null, teamName(d, s, t.key)));
        const av = el("span", "drb-ppl"); t.players.forEach(p => av.appendChild(X.avatarEl(X.pPub(d, p), { size: 24 }))); who.appendChild(av);
        th.appendChild(who);
        const tot = el("div", "dro-tot"), num = el("b", null, "0");
        tot.append(num, el("small", null, "roles " + t.roles + " + rarity " + t.bonus + (t.money != null ? " · $" + t.money + " left" : "")));
        th.appendChild(tot); card.appendChild(th);
        const tb = el("div", "dro-rows");
        t.rows.forEach(r => {
            const row = el("div", "dro-row" + (r.c ? " r-" + RARITIES[r.rar].key : " none"));
            row.appendChild(el("span", "dro-role", (ROLE_ICONS[r.role] || "◆") + " " + r.role));
            if (r.c) {
                const ch = el("span", "dro-ch"); const im = new Image(); im.alt = ""; if (r.c.img) im.src = r.c.img; im.onerror = () => im.remove();
                ch.append(im, el("b", null, r.c.n), el("i", null, RARITIES[r.rar].name)); row.appendChild(ch);
                row.appendChild(el("span", "dro-sc", r.mult !== 1 ? r.raw + "×" + r.mult + " = " + r.score : String(r.score)));
                row.appendChild(el("span", "dro-bo", "+" + r.bonus));
                row.appendChild(el("b", "dro-rt", String(r.total)));
            } else { row.appendChild(el("span", "dro-ch", "empty role")); row.append(el("span", "dro-sc", "0"), el("span", "dro-bo", "+0"), el("b", "dro-rt", "0")); }
            tb.appendChild(row);
        });
        card.appendChild(tb);
        list.appendChild(card);
        setTimeout(() => X.countUp(num, 0, t.total, 1100), 300 + i * 220);
    });
    ov.appendChild(list);
    const btns = el("div", "dro-btns");
    if (X.amHost()) { const a = el("button", "btn xl", "DRAFT AGAIN"), b = el("button", "btn ghost", "Back to lobby"); a.onclick = () => window.drAgain(); b.onclick = () => window.drLobby(); btns.append(a, b); }
    else btns.appendChild(el("p", "dr-wait", "Waiting for " + X.pName(d, X.hostSlot(d)) + " to draft again or go back to the lobby."));
    ov.appendChild(btns);
    $("draft").appendChild(ov);
    X.sfx(!mine ? "reveal" : mine.place === 1 ? "win" : "lose");
}
const ord = n => n + (n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th");
