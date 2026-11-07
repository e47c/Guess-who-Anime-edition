/* =====================================================================
   ANIME DRAFT (fifth mode)
   Build the strongest six-character team. Two game types:
   - Build:   two sides, 1v1 to 4v4, each shown by its players' names. Both sides pick AT THE SAME TIME: each side gets its own
              random pull and places it in one of its six roles (a pick timer, then it's auto-placed), then pulls the next.
              ONE reroll per side per match. The other side's roles show only as locked until the clash.
              The clash: both teams revealed, then the roles fight one by one, top to bottom: the higher stat in that role
              wins it (equal = draw). Most roles wins; tied on roles = higher stat total; tied again = a draw.
   - Auction: everyone for themselves with $25. A random character is revealed, players bid in turn
              (+$1 at least) or pass; the winner places it in an empty role.
   Auction score = the six role scores + the six rarity bonuses (rarity = RANKS in data.js: power and story role per series).

   Everything that changes the match runs in a Firebase transaction on rooms/<code>/draft and is checked
   there (turn, phase, money, free role), so two clicks or two players can never both apply.
   The rules engine (act / actorOf / newMatch / scoring) is pure and has no DOM, so it is unit-tested
   in Node (tools/draft-test.mjs). Rendering and the lobby panel follow below it.
   ===================================================================== */
import { CHARS, ROLESETS, ROLE_ICONS, RARITIES, RANKS, TIERS, DRAFT_VERSION } from "./data.js?v=3";

/* tunable rules: see README "Anime Draft" for which ones are still open for balancing */
export const DRAFT_RULES = {
    slots: 6,
    budget: 25,          // auction: starting money
    minRaise: 1,         // auction: a bid beats the current one by at least this much
    openMin: 1,          // auction: lowest opening bid
    rerolls: 1,          // build: per side, per match (swaps the current pull for a fresh one)
    pickSec: 25,         // build: seconds to place each pulled card; then it goes to the best free role
    awayMs: 8000,        // the host plays the turn of a player who has been offline this long
    leftMs: 1500,        // ... or who left the room
    // build: the clash timeline in ms (every screen plays it in sync from the same start; the match ends after it)
    clash: { revealMs: 2600, roleMs: 3200, finalMs: 5400, endMs: 2600 },
    clashLite: { revealMs: 600, roleMs: 900, finalMs: 1300, endMs: 900 }    // the same on a screen with Reduced effects
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
/* rarity from RANKS (data.js): per series, by power and story importance. Unlisted = Common. */
export function rankRarity(db) {
    const idx = {};
    Object.entries(RANKS).forEach(([key, tiers]) => RARITIES.forEach((R0, i) => String(tiers[R0.key] || "").split("|").filter(Boolean).forEach(n => { idx[key + "|" + n] = i; })));
    Object.values(db).forEach(c => { const i = idx[c.s + "|" + c.n]; c.r = i == null ? RARITIES.length - 1 : i; });
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
    if (s.type === "build") {      // Build: the clash decides (role wins, then the stat total); total = the stat total
        const K = clashOf(s, db);
        return SIDES.map(k => ({ key: k, players: arr(s.sides[k]).map(Number), ids: arr(s.team[k]), wins: K.wins[k], total: K.tot[k], roles: K.tot[k], bonus: 0, place: !K.winner || K.winner === k ? 1 : 2 }))
            .sort((a, b) => a.place - b.place);
    }
    const teams = arr(s.players).map(Number).map(p => ({ key: "p" + p, players: [p], ids: arr(s.team["p" + p]), money: Number(s.budget["p" + p]) || 0 }));
    teams.forEach(t => Object.assign(t, teamBreakdown(s, t.ids, db)));
    const cmp = (a, b) => (b.total - a.total) || (b.roles - a.roles) || ((b.money || 0) - (a.money || 0));
    teams.sort(cmp);
    teams.forEach((t, i) => { t.place = i && cmp(teams[i - 1], t) === 0 ? teams[i - 1].place : i + 1; });
    return teams;
}

/* Build: the clash, role by role. stat = the character's score in that role (the same numbers as the role scores).
   { rows:[{role, i, L:{id,c,stat,rar}, R:{...}, win:"L"|"R"|""}], wins:{L,R}, tot:{L,R}, winner:"L"|"R"|"", by:"roles"|"total"|"draw" } */
export function clashOf(s, db) {
    db = db || DB; const wins = { L: 0, R: 0 }, tot = { L: 0, R: 0 };
    const rows = roleNames(s.rs).map((role, i) => {
        const one = k => { const id = Number(arr(s.team[k])[i]) || 0, c = id ? db[id] : null, stat = c ? charRoles(c, s.rs, !!s.mixed)[i].score : 0; tot[k] += stat; return { id, c, stat, rar: id ? rarOf(s, id, db) : -1 }; };
        const L = one("L"), Rr = one("R"), win = L.stat > Rr.stat ? "L" : Rr.stat > L.stat ? "R" : "";
        if (win) wins[win]++;
        return { role, i, L, R: Rr, win };
    });
    const winner = wins.L !== wins.R ? (wins.L > wins.R ? "L" : "R") : tot.L !== tot.R ? (tot.L > tot.R ? "L" : "R") : "";
    return { rows, wins, tot, winner, by: wins.L !== wins.R ? "roles" : winner ? "total" : "draw" };
}
/* the clash's length (the host ends the match after it) */
export const clashTotal = (C = R.clash, n = R.slots) => C.revealMs + (n - 1) * C.roleMs + C.finalMs + C.endMs;

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
/* o = { type, series, classic, mid, pool:[ids], sides:{L,R} (build), players (auction), rarity(id), rnd, now (build: server ms) } */
export function newMatch(o) {
    const s = { v: DRAFT_VERSION, mid: o.mid || 0, type: o.type, series: o.series.slice(), rs: roleSetFor(o.series, o.classic), mixed: o.series.length > 1,
        deck: shuffle(o.pool, o.rnd), rar: {}, gone: [], evn: 0, ev: { n: 0, k: "start" }, phase: "", team: {} };
    if (o.type === "build") {
        s.sides = { L: o.sides.L.slice(), R: o.sides.R.slice() }; s.fmt = s.sides.L.length;
        s.team = { L: empty6(), R: empty6() }; s.rr = { L: R.rerolls, R: R.rerolls }; s.pk = { L: 0, R: 0 };
        const t0 = Number(o.now) || 0;
        s.cur = { L: draw(s, o.rarity), R: draw(s, o.rarity) }; s.dl = { L: t0 + R.pickSec * 1000, R: t0 + R.pickSec * 1000 }; s.phase = "pick";
    } else {
        s.players = o.players.slice(); s.budget = {}; s.lotn = 0;
        s.players.forEach(p => { s.team["p" + p] = empty6(); s.budget["p" + p] = R.budget; });
        s.opener = s.players[s.players.length - 1];
        newLot(s, o.rarity);
    }
    return s;
}
/* Build: who places for a side. Its members take turns (rotating every placement); an away member is skipped. */
export const sideOf = (s, p) => SIDES.find(k => arr(s && s.sides && s.sides[k]).map(Number).includes(Number(p))) || "";
export function pickerOf(s, side, present = () => true) {
    const m = arr(s.sides[side]).map(Number), i0 = (Number(s.pk[side]) || 0) % Math.max(1, m.length);
    for (let k = 0; k < m.length; k++) { const p = m[(i0 + k) % m.length]; if (present(p)) return p; }
    return m[i0] || 0;
}
/* Auction: whose move it is (Build has no single turn: both sides pick at once, see pickerOf) */
export function actorOf(s, present = () => true) {
    if (!s || s.phase === "over" || s.type === "build") return 0;
    return s.phase === "won" ? Number(s.win && s.win.p) || 0 : Number(s.lot && s.lot.turn) || 0;
}
/* apply one move; returns an error message (nothing changed) or null.
   ctx = { present, rarity, force, now }. Build + force: a.side says which side the host plays for. */
export function act(s, a, ctx) {
    if (!s || s.phase === "over") return "The draft is over.";
    if (s.type === "build") return buildAct(s, a, ctx);
    const who = actorOf(s, ctx.present || (() => true));
    if (ctx.force) a = Object.assign({}, a, { by: who });
    else if (Number(a.by) !== who) return "It's not your turn.";
    return aucAct(s, a, ctx);
}
function buildAct(s, a, ctx) {
    if (s.phase === "clash") { if (a.k === "end" && ctx.force) { s.phase = "over"; evt(s, { k: "end" }); return null; } return "The clash is on."; }
    if (s.phase !== "pick") return "Nothing to do right now.";
    const side = ctx.force ? (SIDES.includes(a.side) ? a.side : "") : sideOf(s, a.by);
    if (!side) return "You're watching this draft.";
    const by = pickerOf(s, side, ctx.present || (() => true));
    if (!ctx.force && Number(a.by) !== by) return "It's your teammate's pick.";
    const cur = Number((s.cur || {})[side]), t0 = Number(ctx.now) || 0;
    if (!cur) return "Your board is full.";
    if (a.k === "reroll") {
        if (!Number(s.rr[side])) return "Your reroll is already used.";
        const nu = draw(s, ctx.rarity); if (!nu) return "No characters left to draw.";
        s.rr[side] = 0; s.gone = arr(s.gone).concat(cur); s.cur[side] = nu; s.dl[side] = t0 + R.pickSec * 1000;
        evt(s, { k: "reroll", side, by }); return null;
    }
    if (a.k === "place") {
        const t = arr(s.team[side]).slice(), i = Number(a.slot);
        if (!(i >= 0 && i < R.slots) || Number(t[i])) return "That role is already filled.";
        t[i] = cur; s.team[side] = t; s.pk[side] = (Number(s.pk[side]) || 0) + 1;
        evt(s, { k: "place", side, slot: i, by, auto: !!ctx.force });      // no character id: the other side only sees a locked role
        s.cur[side] = full(t) ? 0 : draw(s, ctx.rarity); s.dl[side] = s.cur[side] ? t0 + R.pickSec * 1000 : 0;
        if (!Number(s.cur.L) && !Number(s.cur.R)) { s.phase = "clash"; s.clash = { at: t0 }; evt(s, { k: "clash" }); }
        return null;
    }
    return "Unknown move.";
}
// the only player who can still buy (everyone else is full or broke), or 0. Alone, a pass just redraws, so they get one pass for the rest of the draft.
const lastBuyer = s => { const c = arr(s.players).map(Number).filter(p => hasEmpty(s, p) && money(s, p) >= R.openMin); return c.length === 1 ? c[0] : 0; };
export const canPass = (s, p) => !(s && s.lot && !Number(s.lot.by) && lastBuyer(s) === Number(p) && Number((s.spass || {})["p" + p]));
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
        if (!canPass(s, me)) return "You already used your one pass. You have to buy this one.";
        if (lastBuyer(s) === me) s.spass = Object.assign({}, s.spass, { ["p" + me]: 1 });
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
/* the move the host plays for an away player (or a Build pick timer that ran out): pass, or the best free role */
export function autoMove(s, db, side) {
    if (s.type === "build") {
        const c = (db || DB)[Number((s.cur || {})[side])], t = arr(s.team[side]), sc = c ? charRoles(c, s.rs, !!s.mixed) : [];
        let best = -1; t.forEach((x, i) => { if (!Number(x) && (best < 0 || (sc[i] || {}).score > (sc[best] || {}).score)) best = i; });
        return { k: "place", slot: best, side };
    }
    if (s.phase === "bid") return canPass(s, actorOf(s)) ? { k: "pass" } : { k: "bid", amount: R.openMin };
    const p = actorOf(s), key = "p" + p, c = (db || DB)[s.win.c];
    const t = arr(s.team[key]), sc = c ? charRoles(c, s.rs, !!s.mixed) : [];
    let best = -1; t.forEach((x, i) => { if (!Number(x) && (best < 0 || (sc[i] || {}).score > (sc[best] || {}).score)) best = i; });
    return { k: "place", slot: best };
}

/* =====================================================================
   CLIENT: lobby panel, match screen, animations, host duties
   ===================================================================== */
let X = null;
const now = () => X && X.srvNow ? X.srvNow() : Date.now();       // the server clock (pick deadlines, the clash start)
const lite = () => document.body.classList.contains("fx-lite");
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
        drReroll: () => move({ k: "reroll" }),
        drSkip: () => skipClash(),
        drPlace: i => move({ k: "place", slot: i }),
        drPass: () => move({ k: "pass" }),
        drBid: () => { const v = Number(($("drBidAmt") || {}).dataset.v); move({ k: "bid", amount: v }); },
        drStep: k => { const b = $("drBidAmt"); if (b) setBid(Number(b.dataset.v) + k); },
        drSetBid: v => setBid(v),
        drView: k => { if (k === "p" + X.me()) return; viewKey = k; X.sfx("toggle"); const d = X.data(); if (d && d.draft) render(d, d.draft, true); },
        drAgain: () => draftStart(true),
        drLobby: () => X.backToLobby(true)
    });
    draftLoad();
}
const $ = id => document.getElementById(id);

/* ---------------- lobby ---------------- */
/* Left / Right / spectating for Build. Saved picks first; anyone new fills the emptier side, the rest watch. */
export function sidesOf(d) {
    const act = X.dealSlots(d), N = dFmt(d), map = d.draftSides || {}, L = [], Rr = [], S = [];
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
    const keys = dSeries(d), act = X.dealSlots(d), type = dType(d), N = dFmt(d), pool = keys.reduce((n, k) => n + CHARS[k].length, 0);
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
    $("drHint").textContent = type === "build" ? "Both sides pick at the same time: place each pull in a free role before the timer runs out. One reroll per side. Then the roles clash one by one." : "Everyone starts with $" + R.budget + ". Bid at least $" + R.minRaise + " more than the last bid, or pass.";
}

/* ---------------- start (host) ---------------- */
export async function draftStart(again) {
    const d = X.data(); if (!d || !X.amHost()) return;
    if (again && !(d.draft && d.draft.phase === "over") && !(await X.uiConfirm({ title: "Restart the draft?", text: "The current draft is thrown away.", ok: "Restart" }))) return;
    try {
        const db = await draftLoad(), series = dSeries(d), type = dType(d), mid = Date.now();
        const pool = Object.values(db).filter(c => series.includes(c.s)).map(c => c.id);
        const o = { type, series, classic: dClassic(d), mid, pool, rarity: id => (db[id] || { r: 4 }).r, now: now() };
        if (type === "build") { const sd = again && d.draft && d.draft.sides ? { L: arr(d.draft.sides.L).map(Number), R: arr(d.draft.sides.R).map(Number) } : sidesOf(d); o.sides = { L: sd.L, R: sd.R }; }
        else o.players = again && d.draft && d.draft.players ? arr(d.draft.players).map(Number).filter(p => X.activeSlots(d).includes(p)) : X.dealSlots(d);
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
            err = act(cur, Object.assign({ by: X.me() }, a), { present: presentIn(X.data()), rarity: id => (DB[id] || { r: 4 }).r, now: now() });
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
        buildDuties(d, s); return;
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
export function draftReset() { overTimers.forEach(clearTimeout); overTimers = []; closeClash(); bSeen = null; clearInterval(tickT); tickT = 0; Object.values(bDuty).forEach(x => clearTimeout(x.t)); bDuty = {}; seen = { mid: 0, evn: -1, turnMine: false, lot: 0, phase: "", over: 0 }; viewKey = ""; layout = ""; clearTimeout(awayT); awayKey = ""; const o = $("drOver"); if (o) o.remove(); }
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

/* corner ornaments, one design per rarity (drawn in the frame colour) */
const ORN = {
    common: '<circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="2.2" fill="#000" opacity=".35"/>',
    rare: '<path d="M12 1 L21 12 L12 23 L3 12 Z"/><path d="M12 4 L18 12 L12 12 Z" fill="#fff" opacity=".5"/>',
    epic: '<path d="M2 22 C2 9 9 2 22 2 C14 5 9 10 8 16 C11 12 15 11 19 12 C13 14 10 18 9 22 Z"/><circle cx="21" cy="3" r="2.6"/><circle cx="3" cy="21" r="2.6"/>',
    legendary: '<path d="M1 23 L1 9 Q1 1 9 1 L23 1 L18 5 L10 5 Q5 5 5 10 L5 18 Z"/><path d="M12 7 L17 12 L12 17 L7 12 Z" fill="#fff" opacity=".85"/><circle cx="22" cy="1.8" r="1.8"/><circle cx="1.8" cy="22" r="1.8"/>',
    mythical: '<path d="M0 24 L0 8 Q0 0 8 0 L24 0 L15 4 Q6 5 5 15 Z"/><path d="M12 6 L17 12 L12 18 L7 12 Z" fill="#fff"/><path d="M12 8.5 L14.8 12 L12 15.5 L9.2 12 Z" fill="#ff2a3d"/><path d="M0 0 L9 9" stroke="currentColor" stroke-width="2.2"/>'
};
const SEAL = { build: "STATS SEALED · REVEALED IN THE CLASH", auction: "STATS SEALED · REVEALED AT THE FINAL SCORE" };
export const draftCard = (s, id, mode) => cardEl(s, id, mode);      // (also used by the card preview in tests)
/* a collectible card. mode: "full" | "mini" (board slot). Stats are never shown in play. */
function cardEl(s, id, mode) {
    const c = DB[id], R0 = rarity(s, id), key = R0.key;
    const box = el("div", "dc r-" + key + (mode === "mini" ? " mini" : ""));
    if (!c) { box.appendChild(el("div", "dc-cap", "Unknown")); return box; }
    box.style.setProperty("--rc", R0.color);
    box.appendChild(el("div", "dc-aura"));
    const inner = el("div", "dc-in");
    const art = el("div", "dc-art"), im = new Image(); im.alt = ""; im.draggable = false; im.decoding = "async";
    if (c.img) { im.src = c.img; im.onerror = () => { im.remove(); art.classList.add("noimg"); }; art.appendChild(im); } else art.classList.add("noimg");
    art.append(el("span", "dc-kj", c.n.slice(0, 1)), el("i", "dc-fx"));
    inner.appendChild(art);
    const cap = el("div", "dc-cap"); cap.append(el("small", null, label(c.s)), el("b", null, c.n)); inner.appendChild(cap);
    if (mode !== "mini") inner.appendChild(el("div", "dc-seal", SEAL[s.type] || SEAL.auction));
    box.appendChild(inner);
    if (mode !== "mini") ["tl", "tr", "bl", "br"].forEach(k => { const o = el("span", "dc-o " + k); o.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ORN[key] || ORN.common) + "</svg>"; box.appendChild(o); });
    const crest = el("div", "dc-crest");
    crest.append(el("i", null, "★".repeat(R0.stars)), el("b", null, R0.name.toUpperCase()));
    box.appendChild(crest);
    return box;
}

/* Auction: a six-role board. placing = the character id I'm placing (free roles become buttons). No scores until the results. */
function boardEl(d, s, key, placing) {
    const ids = arr(s.team[key]), names = roleNames(s.rs), mine = key === myKey(s);
    const box = el("section", "dr-board" + (mine ? " mine" : "") + (placing ? " placing" : ""));
    box.dataset.key = key;
    const head = el("div", "drb-head"), who = el("div", "drb-who");
    who.appendChild(el("b", null, teamName(d, s, key)));
    const ppl = el("span", "drb-ppl");
    [Number(key.slice(1))].forEach(p => { const a = X.avatarEl(X.pPub(d, p), { size: 22 }); a.title = X.pName(d, p); if (!presentIn(d)(p)) a.classList.add("away"); ppl.appendChild(a); });
    who.appendChild(ppl); head.appendChild(who);
    const meta = el("div", "drb-meta");
    meta.appendChild(el("span", "dr-cash", "$" + (Number(s.budget[key]) || 0)));
    meta.appendChild(el("span", "drb-count", ids.filter(Number).length + "/6"));
    head.appendChild(meta); box.appendChild(head);
    const grid = el("div", "drb-grid");
    names.forEach((r, i) => {
        const id = Number(ids[i]) || 0, open = placing && !id;
        const slot = el(open ? "button" : "div", "drb-slot" + (id ? " full r-" + RARITIES[rarOf(s, id)].key : "") + (open ? " open" : ""));
        slot.dataset.slot = key + i;
        slot.appendChild(el("span", "drs-role", (ROLE_ICONS[r] || "◆") + " " + r));
        if (id) slot.appendChild(cardEl(s, id, "mini"));
        else if (open) { slot.type = "button"; slot.onclick = () => window.drPlace(i); slot.setAttribute("aria-label", "Place in " + r); slot.appendChild(el("span", "drs-prev", "PLACE HERE")); }
        else slot.appendChild(el("span", "drs-empty", "empty"));
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
    const id = s.phase === "won" ? s.win && s.win.c : s.lot && s.lot.c;
    const kick = el("div", "dr-kick");
    kick.append(el("span", null, "LOT " + (s.lotn || 1)), el("span", "dr-left", " · " + arr(s.deck).length + " left in the pool"));
    st.appendChild(kick);
    if (id) { const cw = el("div", "dr-cardwrap"); cw.id = "drCardWrap"; const card = cardEl(s, id, "full"); card.id = "drCard"; cw.appendChild(card); if (s.phase === "won") cw.appendChild(el("div", "dr-sold", "SOLD $" + s.win.amt)); st.appendChild(cw); }
    const act = el("div", "dr-act");
    const name = id && DB[id] ? DB[id].n : "";
    if (s.phase === "bid") {
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
            const solo = lastBuyer(s) === me, free = canPass(s, me);
            if (!free) { ps.disabled = true; ps.textContent = "PASS USED"; } else if (solo) ps.append(el("small", null, "one time only"));
            row.append(go, ps);
            act.append(el("p", "dr-q", "Your bid. You have $" + (Number(s.budget["p" + me]) || 0) + "." + (!free ? " You're the last buyer and used your pass: this one is yours." : solo ? " You're the last buyer: you can pass once, then you buy every lot." : "")), pad, quick, row);
        } else act.appendChild(el("p", "dr-wait", X.pName(d, who) + " is bidding…"));
    } else if (s.phase === "won") {
        act.appendChild(el("p", mine ? "dr-q" : "dr-wait", mine ? "You won " + name + " for $" + s.win.amt + ". Place it in a free role." : X.pName(d, s.win.p) + " won " + name + " for $" + s.win.amt + " and is placing it…"));
    }
    st.appendChild(act);
    return st;
}

function playersEl(d, s, leftKey) {
    const box = el("div", "dr-plist"), who = actorOf(s, presentIn(d)), L = s.lot || {};
    arr(s.players).map(Number).forEach(p => {
        const k = "p" + p, filled = arr(s.team[k]).filter(Number).length, out = arr(L.out).map(Number).includes(p);
        const c = el("button", "dr-pl" + (p === who ? " turn" : "") + (s.phase === "bid" && Number(L.by) === p ? " high" : "") + (s.phase === "bid" && out ? " out" : "") + (filled === 6 ? " done" : "") + (p === X.me() ? " me" : "") + (viewKey === k || leftKey === k ? " viewing" : ""));
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
    $("drStatus").textContent = (s.type === "build" ? s.fmt + "v" + s.fmt + " Build" : "Auction") + " · " + (s.rs === "classic" ? "Classic roles" : s.rs === "mixed" ? "Mixed roles" : label(s.rs) + " roles") + " · " + s.series.map(label).join(" · ") + (myKey(s) ? "" : " · spectating");
    $("draft").classList.toggle("dr-build", s.type === "build");
    if (s.type === "build") { renderBuild(d, s); return; }
    const ev = s.ev || {}, newEv = !fresh && !quiet && Number(ev.n) > seen.evn;
    const me = X.me(), present = presentIn(d), who = actorOf(s, present), mk = myKey(s);
    $("drTurn").textContent = s.phase === "over" ? "DRAFT COMPLETE" : who === me ? (s.phase === "bid" ? "YOUR BID" : "PLACE YOUR PICK") : X.pName(d, who).toUpperCase();
    // remember where the drawn card was, so a placement can fly from it
    let flyFrom = null, flyNode = null;
    if (newEv && ev.k === "place") { const c = $("drCard"); if (c) { flyFrom = c.getBoundingClientRect(); flyNode = c.cloneNode(true); } }
    const wrap = $("drWrap"), placingMine = s.phase !== "over" && who === me && s.phase === "won";
    wrap.innerHTML = "";
    wrap.className = "dr-wrap " + s.type;
    const keys = arr(s.players).map(p => "p" + p), leftKey = mk || keys[0];
    if (!viewKey || !s.team[viewKey] || viewKey === leftKey) viewKey = keys.find(k => k !== leftKey);
    wrap.appendChild(playersEl(d, s, leftKey));
    const g = el("div", "dr-grid"), a = boardEl(d, s, leftKey, placingMine ? s.win.c : 0);
    a.classList.add("first"); g.append(stageEl(d, s), a, boardEl(d, s, viewKey, 0));
    wrap.appendChild(g);
    // events
    if (newEv) playEvent(d, s, ev, flyFrom, flyNode);
    else if (!fresh && Number(s.lotn) !== seen.lot && s.phase === "bid") revealAnim(s, s.lot.c);
    if (fresh && s.phase !== "over") revealAnim(s, (s.lot || s.win || {}).c);
    seen.evn = Math.max(seen.evn, Number(ev.n) || 0); seen.lot = Number(s.lotn) || 0;
    // my turn ping
    const myTurn = s.phase !== "over" && who === me;
    if (myTurn && !seen.turnMine) X.sfx("turn");
    seen.turnMine = myTurn;
    if (s.phase === "over") showOver(d, s); else { const o = $("drOver"); if (o) o.remove(); seen.over = 0; }
}
function centerOf(node) { const r = node.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
function revealAnim(s, id, c) {
    c = c || $("drCard"); if (!c || !id) return;
    const R0 = rarity(s, id);
    c.classList.add("in");
    if (lite()) { X.sfx("flip"); return; }
    if (R0.key === "mythical" || R0.key === "legendary") {
        setTimeout(() => { const [x, y] = centerOf(c); X.ring(x, y, R0.color, 420, 800); X.burstText(R0.name.toUpperCase() + "!", x, y - 120, R0.color, "big"); X.sfx(R0.key === "mythical" ? "impact" : "reveal"); if (R0.key === "mythical") document.body.classList.add("dr-myth"); setTimeout(() => document.body.classList.remove("dr-myth"), 900); }, 420);
    } else X.sfx("flip");
}
function playEvent(d, s, ev, flyFrom, flyNode) {
    const name = p => X.pName(d, p);
    if (ev.k === "place") {
        const key = "p" + ev.p, slot = document.querySelector('[data-slot="' + key + ev.slot + '"]');
        if (!slot) return;
        const R0 = rarity(s, ev.c), role = roleNames(s.rs)[ev.slot];
        slot.classList.add("landing");
        const done = () => { slot.classList.remove("landing"); slot.classList.add("slam"); const [x, y] = centerOf(slot); X.burstText(role.toUpperCase() + " LOCKED", x, y, R0.color); X.sfx("slam"); };
        if (flyFrom && flyNode) X.flyClone(flyNode, flyFrom, slot.getBoundingClientRect(), { ms: 520, rot: -6 }).then(done); else done();
        if (s.phase === "bid") setTimeout(() => revealAnim(s, s.lot.c), 560);
    } else if (ev.k === "bid") {
        X.sfx("coin"); const hb = $("drHi"); if (hb) { hb.classList.add("bump"); const [x, y] = centerOf(hb); X.burstText("$" + ev.amt, x, y - 40, "#f0c869"); }
        const pl = document.querySelector('.dr-pl[data-p="' + ev.p + '"]'); if (pl) X.shake(pl, 5);
    } else if (ev.k === "pass") { X.sfx("toggle"); const pl = document.querySelector('.dr-pl[data-p="' + ev.p + '"]'); if (pl) { const [x, y] = centerOf(pl); X.burstText("PASS", x, y - 30, "#a7a3a0"); } }
    else if (ev.k === "sold") { X.sfx("stamp"); const c = $("drCardWrap"); if (c) { c.classList.add("sold"); const [x, y] = centerOf(c); X.burstText(name(ev.p) + " · $" + ev.amt, x, y + 140, "#f0c869", "big"); X.shake(c, 8); } }
    else if (ev.k === "unsold") { X.sfx("skip"); X.toast("No bids: " + ((DB[ev.c] || {}).n || "the character") + " goes back to the void."); if (s.phase === "bid") setTimeout(() => revealAnim(s, s.lot.c), 200); }
}

/* ---------------- Auction results: the final reveal ----------------
   1. every team in seat order, roles face down; role by role the stats unseal and the totals count up
   2. the winner splash: rays, gold title, the MVP card, confetti
   3. the teams re-sort into the ranking, place badges stamp in, the buttons appear. A tap skips to the end. */
let overTimers = [];
function showOver(d, s) {
    if (seen.over === s.mid && $("drOver")) return;
    seen.over = s.mid;
    const old = $("drOver"); if (old) old.remove();
    overTimers.forEach(clearTimeout); overTimers = [];
    const ranked = standings(s), byKey = Object.fromEntries(ranked.map(t => [t.key, t])), mk = myKey(s), mine = byKey[mk];
    const seat = arr(s.players).map(p => "p" + p);
    const lite = document.body.classList.contains("fx-lite"), at = (ms, f) => overTimers.push(setTimeout(f, ms));
    const ov = el("div", "dr-over tallying"); ov.id = "drOver"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Draft results");
    const cv = el("canvas", "dro-cv"); ov.appendChild(cv);
    const hero = el("div", "dro-hero");
    hero.append(el("div", "dro-kick", "ANIME DRAFT"), goldTitle("FINAL REVEAL"), el("p", "dro-sub", "The stats are unsealed role by role: role score + rarity bonus."));
    ov.appendChild(hero);
    const list = el("div", "dro-list"), cards = {}, shown = {};
    seat.forEach((k, i) => {
        const t = byKey[k], card = el("section", "dro-team"); card.style.setProperty("--i", i); cards[k] = card; shown[k] = 0;
        const th = el("div", "dro-th");
        th.appendChild(el("span", "dro-place", "?"));
        const who = el("div", "dro-who"); who.appendChild(el("b", null, teamName(d, s, k)));
        const av = el("span", "drb-ppl"); t.players.forEach(p => av.appendChild(X.avatarEl(X.pPub(d, p), { size: 24 }))); who.appendChild(av);
        th.appendChild(who);
        const tot = el("div", "dro-tot"); tot.append(el("b", null, "0"), el("small", null, "roles " + t.roles + " + rarity " + t.bonus + " · $" + t.money + " left"));
        th.appendChild(tot); card.appendChild(th);
        const tb = el("div", "dro-rows");
        t.rows.forEach(r => {
            const row = el("div", "dro-row" + (r.c ? " r-" + RARITIES[r.rar].key : " none"));
            row.appendChild(el("span", "dro-role", (ROLE_ICONS[r.role] || "◆") + " " + r.role));
            if (r.c) {
                const ch = el("span", "dro-ch"), im = new Image(); im.alt = ""; if (r.c.img) im.src = r.c.img; im.onerror = () => im.remove();
                ch.append(im, el("b", null, r.c.n), el("i", null, "★".repeat(RARITIES[r.rar].stars) + " " + RARITIES[r.rar].name)); row.appendChild(ch);
                row.appendChild(el("span", "dro-sc", r.mult !== 1 ? r.raw + "×" + r.mult + " = " + r.score : String(r.score)));
            } else { row.appendChild(el("span", "dro-ch", "empty role")); row.appendChild(el("span", "dro-sc", "0")); }
            row.append(el("span", "dro-bo", "+" + r.bonus), el("b", "dro-rt", String(r.total)));
            tb.appendChild(row);
        });
        card.appendChild(tb); list.appendChild(card);
    });
    ov.appendChild(list);
    const btns = el("div", "dro-btns");
    if (X.amHost()) { const a = el("button", "btn xl", "DRAFT AGAIN"), b = el("button", "btn ghost", "Back to lobby"); a.onclick = () => window.drAgain(); b.onclick = () => window.drLobby(); btns.append(a, b); }
    else btns.appendChild(el("p", "dr-wait", "Waiting for " + X.pName(d, X.hostSlot(d)) + " to draft again or go back to the lobby."));
    ov.append(btns, el("div", "dro-skip", "tap to skip"));
    $("draft").appendChild(ov);

    const setTotal = (k, v, ms) => { const b = cards[k].querySelector(".dro-tot b"); X.countUp(b, shown[k], v, ms); shown[k] = v; };
    const revealRow = (i, ms) => {
        seat.forEach(k => { const row = cards[k].querySelectorAll(".dro-row")[i]; if (!row || row.classList.contains("on")) return; row.classList.add("on"); setTotal(k, byKey[k].rows.slice(0, i + 1).reduce((n, r) => n + r.total, 0), ms); });
        X.sfx(i === 5 ? "slam" : "flip");
        const lead = Math.max(...seat.map(k => shown[k]));
        seat.forEach(k => cards[k].classList.toggle("ahead", shown[k] === lead && lead > 0));
    };
    let done = false;
    const finale = () => {
        if (done) return; done = true;
        overTimers.forEach(clearTimeout); overTimers = [];
        for (let i = 0; i < 6; i++) revealRow(i, 300);
        ov.classList.remove("tallying"); ov.classList.add("won");
        const top = ranked[0], tie = ranked.length > 1 && ranked[1].place === 1, winners = ranked.filter(t => t.place === 1);
        const title = tie ? "DEAD EVEN" : teamName(d, s, top.key).toUpperCase() + " WINS";
        const mvp = top.rows.filter(r => r.c).sort((a, b) => b.total - a.total)[0];
        hero.innerHTML = "";
        hero.appendChild(el("div", "dro-rays"));
        hero.appendChild(el("div", "dro-kick", tie ? "SHARED FIRST PLACE" : "CHAMPION"));
        hero.appendChild(goldTitle(title));
        const av = el("div", "dro-wav"); winners.forEach(w => w.players.forEach(p => av.appendChild(X.avatarEl(X.pPub(d, p), { size: 64, badge: true })))); hero.appendChild(av);
        hero.appendChild(el("p", "dro-sub", top.total + " points · roles " + top.roles + " + rarity " + top.bonus + (ranked[1] && !tie ? " · " + (top.total - ranked[1].total) + " ahead of " + teamName(d, s, ranked[1].key) : "")));
        if (mvp) {
            const m = el("div", "dro-mvp"), c = cardEl(s, mvp.id, "full"); c.querySelector(".dc-seal").textContent = mvp.role.toUpperCase() + " · " + mvp.total + " PTS";
            m.append(el("div", "dro-mvp-k", "MVP"), c); hero.appendChild(m);
        }
        if (!lite) confetti(cv);
        X.sfx(!mine ? "reveal" : mine.place === 1 ? "win" : "lose");
        if (mine && mine.place === 1 && !lite) X.shake($("drOver"), 6);
        at(lite ? 0 : 1300, () => {
            const rects = new Map(Object.entries(cards).map(([k, c]) => [k, c.getBoundingClientRect()]));
            ranked.forEach(t => {
                const c = cards[t.key]; list.appendChild(c);
                c.classList.add("p" + Math.min(t.place, 4)); if (t.key === mk) c.classList.add("me");
                const pl = c.querySelector(".dro-place"); pl.textContent = ord(t.place); pl.classList.add("stamp");
            });
            if (!lite) ranked.forEach(t => { const c = cards[t.key], a = rects.get(t.key), b = c.getBoundingClientRect(); if (c.animate) c.animate([{ transform: "translate(" + (a.left - b.left) + "px," + (a.top - b.top) + "px)" }, { transform: "none" }], { duration: 650, easing: "cubic-bezier(.2,.9,.3,1)" }); });
            ov.classList.add("ranked"); X.sfx("stamp");
        });
    };
    const t0 = lite ? 80 : 1100, step = lite ? 40 : 750;
    for (let i = 0; i < 6; i++) at(t0 + i * step, () => revealRow(i, Math.max(200, step - 150)));
    at(t0 + 6 * step + 700, finale);
    ov.addEventListener("click", e => { if (!done && !e.target.closest("button")) finale(); });
}
function goldTitle(text) {
    const h = el("h1", "dro-title"); h.setAttribute("aria-label", text);
    let k = 0;          // letters drop in one by one, but a word never breaks across lines
    text.split(" ").forEach(word => { const w = el("span", "w"); w.setAttribute("aria-hidden", "true"); [...word].forEach(ch => { const l = el("i", null, ch); l.style.setProperty("--k", k++); w.appendChild(l); }); k++; h.appendChild(w); });
    return h;
}
function confetti(cv, ms = 4200) {
    const g = cv.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr;
    const cols = ["#f0c869", "#ff2a3d", "#fbf6ee", "#d9a441", "#ff7a3d", "#fff3cc"];
    const P = Array.from({ length: 190 }, (_, i) => { const side = i % 2 ? 1 : -1; return { x: W / 2 + side * W * (.18 + Math.random() * .12), y: H * .42, vx: -side * (2 + Math.random() * 9) * dpr, vy: -(8 + Math.random() * 15) * dpr, w: (6 + Math.random() * 8) * dpr, h: (3 + Math.random() * 5) * dpr, r: Math.random() * 6, vr: (Math.random() - .5) * .35, c: cols[i % cols.length] }; });
    const t0 = performance.now();
    const tick = now => {
        const k = now - t0; g.clearRect(0, 0, W, H);
        P.forEach(p => { p.vy += .32 * dpr; p.vx *= .992; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, 1 - k / ms); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); g.restore(); });
        if (k < ms && cv.isConnected) requestAnimationFrame(tick); else g.clearRect(0, 0, W, H);
    };
    requestAnimationFrame(tick);
}
const ord = n => n + (n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th");

/* =====================================================================
   BUILD: the pick screen and the clash
   Pick: split screen. My side's role column on the left, the other side's on the right (spectators: Left | Right),
   both pulls side by side in the middle under a big VS, each with its pick timer. The other side's filled roles show
   only as LOCKED. The clash: both teams revealed, then one role at a time, top to bottom (synced on every screen from
   s.clash.at, the server clock), then the result and the summary. Timings: DRAFT_RULES.clash / clashLite.
   ===================================================================== */
let bSeen = null, tickT = 0, bDuty = {}, clash = null;
const viewSides = s => myKey(s) === "R" ? ["R", "L"] : ["L", "R"];
const sideLabel = (s, k) => { const mk = myKey(s); return !mk ? (k === "L" ? "LEFT" : "RIGHT") : k === mk ? (s.fmt > 1 ? "YOUR SIDE" : "YOU") : "OPPONENT"; };

function renderBuild(d, s) {
    const wrap = $("drWrap"), mk = myKey(s), [A, B] = viewSides(s), present = presentIn(d);
    const prev = bSeen && bSeen.mid === s.mid ? bSeen : null;
    const newSlots = k => prev ? arr(s.team[k]).map((x, i) => Number(x) && !Number(arr(prev.team[k])[i]) ? i : -1).filter(i => i >= 0) : [];
    // my side's pull flies into the role it went to (the other side's placement only locks a role)
    let fly = null;
    if (mk && newSlots(mk).length) { const c = $("drCard" + mk); if (c) fly = { r: c.getBoundingClientRect(), node: c.cloneNode(true) }; }
    $("drTurn").textContent = s.phase === "over" ? "DRAFT COMPLETE" : s.phase === "clash" ? "THE CLASH" : !mk ? "BOTH SIDES PICK"
        : !Number(s.cur[mk]) ? "BOARD FULL" : pickerOf(s, mk, present) === X.me() ? "PLACE YOUR PULL" : "YOUR SIDE PICKS";
    wrap.innerHTML = ""; wrap.className = "dr-wrap build";
    const g = el("div", "drx");
    g.append(columnEl(d, s, A), midEl(d, s, A, B), columnEl(d, s, B));
    wrap.appendChild(g);
    // what changed since this screen last showed the match: new pulls, a reroll, filled roles
    SIDES.forEach(k => {
        const id = Number(s.cur[k]), card = $("drCard" + k);
        if (card && id && (!prev || Number(prev.cur[k]) !== id)) {
            if (prev && Number(prev.rr[k]) && !Number(s.rr[k])) { card.classList.add("rerolled"); X.sfx("reverse"); if (!lite()) { const [x, y] = centerOf(card); X.burstText("REROLL!", x, y, "#f0c869", "big"); } }
            else revealAnim(s, id, card);
        }
        newSlots(k).forEach(i => {
            const slot = document.querySelector('[data-slot="' + k + i + '"]'); if (!slot) return;
            const role = roleNames(s.rs)[i], seen2 = k === mk;
            const land = () => { slot.classList.add("slam"); X.sfx("slam"); if (!lite()) { const [x, y] = centerOf(slot); X.burstText(role.toUpperCase() + " LOCKED", x, y, seen2 ? rarity(s, Number(arr(s.team[k])[i])).color : "#a7a3a0"); } };
            if (seen2 && fly && !lite()) { slot.classList.add("landing"); X.flyClone(fly.node, fly.r, slot.getBoundingClientRect(), { ms: 480, rot: -6 }).then(() => { slot.classList.remove("landing"); land(); }); }
            else land();
        });
    });
    bSeen = { mid: s.mid, team: { L: arr(s.team.L).slice(), R: arr(s.team.R).slice() }, cur: Object.assign({}, s.cur), rr: Object.assign({}, s.rr) };
    clearInterval(tickT); tickT = 0;
    if (s.phase === "pick") { tickTimers(); tickT = setInterval(tickTimers, 250); }
    if (s.phase === "clash" || s.phase === "over") showClash(d, s); else closeClash();
}

/* one side's six roles. Mine show the characters; the other side's show LOCKED until the clash. */
function columnEl(d, s, k) {
    const mk = myKey(s), vis = mk === k, present = presentIn(d), ids = arr(s.team[k]), names = roleNames(s.rs);
    const placing = vis && s.phase === "pick" && Number(s.cur[k]) && pickerOf(s, k, present) === X.me();
    const box = el("section", "drc side-" + k + (vis ? " mine" : " theirs") + (placing ? " placing" : ""));
    const head = el("div", "drc-head"), who = el("div", "drc-who"), ppl = el("span", "drb-ppl");
    arr(s.sides[k]).map(Number).forEach(p => { const a = X.avatarEl(X.pPub(d, p), { size: 26 }); a.title = X.pName(d, p); if (!present(p)) a.classList.add("away"); ppl.appendChild(a); });
    const nm = el("div", "drc-nm"); nm.append(el("small", null, sideLabel(s, k)), el("b", null, teamName(d, s, k)));
    who.append(ppl, nm);
    const meta = el("div", "drc-meta"), left = Number(s.rr[k]) > 0;
    const tk = el("span", "dr-token" + (left ? "" : " used"), left ? "🎲 ×1" : "🎲 USED"); tk.title = left ? "One reroll left for this match" : "Reroll used";
    meta.append(tk, el("span", "drb-count", ids.filter(Number).length + "/6"));
    head.append(who, meta); box.appendChild(head);
    const list = el("div", "drc-list");
    names.forEach((r, i) => {
        const id = Number(ids[i]) || 0, open = placing && !id;
        const slot = el(open ? "button" : "div", "drc-slot" + (id ? (vis ? " full r-" + RARITIES[rarOf(s, id)].key : " locked") : "") + (open ? " open" : ""));
        slot.dataset.slot = k + i;
        slot.appendChild(el("span", "drs-role", (ROLE_ICONS[r] || "◆") + " " + r));
        if (id && vis) slot.appendChild(cardEl(s, id, "mini"));
        else if (id) { const lk = el("div", "drc-back"); lk.append(el("i", null, "🔒"), el("b", null, "LOCKED")); slot.appendChild(lk); }
        else if (open) { slot.type = "button"; slot.onclick = () => window.drPlace(i); slot.setAttribute("aria-label", "Place in " + r); slot.appendChild(el("span", "drs-prev", "PLACE HERE")); }
        else slot.appendChild(el("span", "drs-empty", "empty"));
        list.appendChild(slot);
    });
    box.appendChild(list);
    return box;
}
/* the middle: both pulls under the VS, the pick timers, my action */
function midEl(d, s, A, B) {
    const mid = el("section", "drx-mid"), mk = myKey(s), present = presentIn(d);
    const pulls = el("div", "drx-pulls");
    pulls.append(pullEl(d, s, A), el("div", "drx-vs", "VS"), pullEl(d, s, B));
    mid.appendChild(pulls);
    const act = el("div", "dr-act drx-act");
    if (s.phase !== "pick") act.appendChild(el("p", "dr-wait", "Both boards are full. The clash begins…"));
    else if (!mk) act.appendChild(el("p", "dr-wait", "Both sides pick at the same time. Their roles stay hidden until the clash."));
    else {
        const id = Number(s.cur[mk]), picker = pickerOf(s, mk, present), other = mk === "L" ? "R" : "L";
        if (!id) act.appendChild(el("p", "dr-wait", "Your board is full. Waiting for " + teamName(d, s, other) + "…"));
        else if (picker !== X.me()) act.appendChild(el("p", "dr-wait", X.pName(d, picker) + " is placing for your side…"));
        else {
            act.appendChild(el("p", "dr-q", "Tap a free role on your board for " + DB[id].n + "."));
            const rr = el("button", "btn alt dr-rr"); rr.type = "button"; rr.id = "drReroll";
            rr.append(el("span", null, "🎲 REROLL"), el("small", null, Number(s.rr[mk]) ? "one per match" : "used"));
            rr.disabled = !Number(s.rr[mk]); rr.onclick = () => window.drReroll();
            act.appendChild(rr);
        }
    }
    mid.appendChild(act);
    return mid;
}
function pullEl(d, s, k) {
    const mk = myKey(s), id = Number(s.cur[k]), present = presentIn(d), w = el("div", "drx-pull side-" + k);
    w.appendChild(el("div", "drx-tag", k === mk ? (s.fmt > 1 ? "YOUR SIDE'S PULL" : "YOUR PULL") : teamName(d, s, k).toUpperCase()));
    if (id) {
        const c = cardEl(s, id, "full"); c.id = "drCard" + k; w.appendChild(c);
        const tm = el("div", "drx-timer"); tm.dataset.dl = s.dl[k]; tm.dataset.side = k; tm.append(el("i"), el("b"));
        w.appendChild(tm);
        const p = pickerOf(s, k, present);
        if (!present(p)) w.appendChild(el("small", "drx-who away", X.pName(d, p) + " is away: auto-pick"));
        else if (s.fmt > 1) w.appendChild(el("small", "drx-who", X.pName(d, p) + " places"));
    } else w.appendChild(el("div", "drx-done", s.phase === "pick" ? "6/6 · READY" : "READY"));
    return w;
}
function tickTimers() {
    const t = now(), d = X.data(), mk = d && d.draft ? myKey(d.draft) : "";
    document.querySelectorAll(".drx-timer").forEach(tm => {
        const left = Math.max(0, Number(tm.dataset.dl) - t), sec = Math.ceil(left / 1000);
        tm.firstChild.style.width = Math.min(100, left / (R.pickSec * 1000) * 100) + "%";
        tm.lastChild.textContent = sec + "s";
        tm.classList.toggle("low", left < 6000);
        if (tm.dataset.side === mk && left > 0 && left < 5500 && tickT && tickTimers.last !== sec) { tickTimers.last = sec; X.sfx("tick"); }
    });
}

/* host: a pick timer that ran out, or a picker who is away (left: leftMs, offline: awayMs) = the best free role;
   the clash over = the match ends (that's when the result is reported, coins and Night Party included) */
function buildDuties(d, s) {
    const present = presentIn(d), t = now();
    const arm = (k, key, due, f) => { if (bDuty[k] && bDuty[k].key === key) return; if (bDuty[k]) clearTimeout(bDuty[k].t); bDuty[k] = { key, t: setTimeout(f, Math.max(0, due - t)) }; };
    const drop = k => { if (bDuty[k]) { clearTimeout(bDuty[k].t); delete bDuty[k]; } };
    SIDES.forEach(k => {
        const id = Number((s.cur || {})[k]); if (s.phase !== "pick" || !id) { drop(k); return; }
        const p = pickerOf(s, k, present), away = !present(p), gone = !d["player" + p] || d["player" + p].left;
        const dl = Number(s.dl[k]) || t, due = away ? Math.min(dl, t + (gone ? R.leftMs : R.awayMs)) : dl;
        const pk = Number(s.pk[k]) || 0, key = s.mid + ":" + k + ":" + pk + ":" + id + ":" + (away ? "a" : "p");
        arm(k, key, due + 150, () => hostTx(cur => cur.mid === s.mid && cur.phase === "pick" && (Number(cur.pk[k]) || 0) === pk && Number(cur.cur[k]) === id
            && act(cur, autoMove(cur, DB, k), { force: true, present: presentIn(X.data()), rarity: x => (DB[x] || { r: 4 }).r, now: now() }) === null));
    });
    if (s.phase === "clash" && s.clash) arm("end", s.mid + ":end", Number(s.clash.at) + clashTotal() + 400, () => hostTx(cur => cur.mid === s.mid && cur.phase === "clash" && act(cur, { k: "end" }, { force: true }) === null));
    else drop("end");
}
function hostTx(f) {
    const d = X.data(); if (!d || !d.draft || !X.amHost()) return;
    X.runTransaction(X.ref(X.db, "rooms/" + X.room() + "/draft"), cur => { if (!cur) return; return f(cur) ? cur : undefined; }).catch(e => console.error(e));
}

/* ---------------- Build: the clash ---------------- */
function clashPlan(lt) {
    const C = lt ? R.clashLite : R.clash, n = R.slots, roles = [];
    for (let i = 0; i < n; i++) roles.push({ at: C.revealMs + i * C.roleMs, ms: i === n - 1 ? C.finalMs : C.roleMs });
    const end = C.revealMs + (n - 1) * C.roleMs + C.finalMs;
    return { reveal: C.revealMs, roles, end, sum: end + C.endMs };
}
function closeClash() { if (clash) { clash.timers.forEach(clearTimeout); clash.ov.remove(); } clash = null; const o = $("drClash"); if (o) o.remove(); }
function showClash(d, s) {
    if (clash && clash.mid === s.mid) { clashBtns(d, s); return; }
    closeClash();
    const lt = lite(), K = clashOf(s), [A, B] = viewSides(s), plan = clashPlan(lt);
    const ov = el("div", "drk" + (lt ? " lite" : "")); ov.id = "drClash"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "The clash");
    const cv = el("canvas", "dro-cv"); ov.appendChild(cv);
    // top bar: the running score, Skip animations, the menu (Close room / Leave)
    const top = el("div", "drk-top"), sc = el("div", "drk-score");
    const sd = k => { const w = el("div", "drk-sd side-" + k); w.append(el("small", null, sideLabel(s, k)), el("b", null, teamName(d, s, k))); return w; };
    const nA = el("b", "drk-n", "0"), nB = el("b", "drk-n", "0");
    sc.append(sd(A), nA, el("i", null, "–"), nB, sd(B));
    const tools = el("div", "drk-tools"), skip = el("button", "btn ghost sm drk-skip", "Skip animations"), menu = el("button", "pop ghost menu-btn", "☰");
    skip.type = "button"; skip.onclick = () => window.drSkip(); menu.type = "button"; menu.setAttribute("aria-label", "Menu"); menu.onclick = () => window.openPause && window.openPause();
    tools.append(skip, menu);
    top.append(el("div", "drk-kick", "THE CLASH"), sc, tools);
    // body: both teams (hidden until the reveal), the arena between them
    const body = el("div", "drk-body"), cols = {};
    const col = k => {
        const c = el("div", "drk-col side-" + k);
        K.rows.forEach((r, i) => {
            const x = r[k], row = el("div", "drk-row" + (x.id ? " r-" + RARITIES[x.rar].key : "")); row.dataset.i = i;
            const ch = el("span", "drk-ch"), im = new Image(); im.alt = ""; im.decoding = "async"; if (x.c && x.c.img) im.src = x.c.img; im.onerror = () => im.remove();
            ch.append(im, el("b", null, x.c ? x.c.n : "empty role"));
            row.append(el("span", "drk-ri", ROLE_ICONS[r.role] || "◆"), el("span", "drk-lock", "🔒"), ch, el("span", "drk-st", ""), el("span", "drk-mk", ""));
            row.title = r.role;
            c.appendChild(row);
        });
        cols[k] = c; return c;
    };
    const arena = el("div", "drk-arena intro");
    arena.append(el("div", "drk-role"), el("div", "drk-vs", "VS"));
    arena.firstChild.append(el("small", null, "BOTH TEAMS"), el("b", null, "REVEALED"));
    body.append(col(A), arena, col(B));
    const sum = el("div", "drk-sum hidden");
    ov.append(top, body, sum);
    $("draft").appendChild(ov);
    clash = { mid: s.mid, s, ov, cv, timers: [], K, A, B, cols, arena, body, sum, nA, nB, skip, score: { [A]: 0, [B]: 0 }, res: {}, lt, done: false, ended: false };
    const t0 = s.phase === "over" ? Infinity : Math.max(0, now() - (Number(s.clash && s.clash.at) || now()));
    const at = (ms, f) => clash.timers.push(setTimeout(f, Math.max(0, ms - t0)));
    if (t0 >= plan.sum) { summary(true); return; }
    // steps already past (a reload mid-clash) apply at once, silently; the rest play on schedule
    revealCols(t0 > 200, plan.reveal);
    plan.roles.forEach((r, i) => { if (t0 >= r.at) resolveRow(i, true); else at(r.at, () => fight(i, r.ms)); });
    if (t0 >= plan.end) endSplash(true); else at(plan.end, () => endSplash(false));
    at(plan.sum, () => summary(false));
}
function revealCols(quiet, ms) {
    const c = clash; if (!c) return;
    [c.A, c.B].forEach(k => [...c.cols[k].children].forEach((row, i) => {
        if (quiet) { row.classList.add("rev"); return; }
        c.timers.push(setTimeout(() => { row.classList.add("rev"); if (k === c.A) X.sfx("flip"); }, Math.round(ms * .12 + i * ms * .11)));
    }));
}
function fight(i, ms) {
    const c = clash; if (!c) return;
    const r = c.K.rows[i], a = r[c.A], b = r[c.B], fin = i === c.K.rows.length - 1, lt = c.lt;
    [c.A, c.B].forEach(k => [...c.cols[k].children].forEach(row => row.classList.toggle("now", Number(row.dataset.i) === i)));
    const ar = c.arena; ar.innerHTML = ""; ar.className = "drk-arena fight" + (fin ? " final" : "");
    ar.style.setProperty("--d", ms + "ms");
    const head = el("div", "drk-role"); head.append(el("small", null, fin ? "FINAL ROLE" : "ROLE " + (i + 1) + " / " + c.K.rows.length), el("b", null, (ROLE_ICONS[r.role] || "◆") + " " + r.role));
    const ring = el("div", "drk-ring"), spark = el("i", "drk-spark");
    ring.append(fighter(a, "a"), spark, fighter(b, "b"));
    const max = Math.max(a.stat, b.stat, 1), bars = el("div", "drk-bars");
    const bar = (x, k) => { const w = el("div", "drk-bar " + k), f = el("i"); f.style.setProperty("--w", (x.stat / max * 100).toFixed(1) + "%"); w.append(f, el("b", null, lt ? String(x.stat) : "0")); return w; };
    const ba = bar(a, "a"), bb = bar(b, "b");
    bars.append(ba, bb);
    const out = el("div", "drk-out");
    ar.append(head, ring, bars, out);
    c.cur = { i, ring, out, ar };
    const T = f => Math.round(ms * f), go = (f, fn) => c.timers.push(setTimeout(fn, T(f)));
    X.sfx(fin && !lt ? "charge" : "whoosh");
    go(lt ? .05 : .3, () => {
        ring.classList.add("hit");
        if (lt) return;
        X.sfx(fin ? "heavy" : "clash");
        const [x, y] = centerOf(spark);
        X.ring(x, y, fin ? "#ff2a3d" : "#f0c869", fin ? 560 : 320, fin ? 900 : 600); X.shake(ar, fin ? 14 : 6);
        if (fin) { document.body.classList.add("dr-myth"); setTimeout(() => document.body.classList.remove("dr-myth"), 900); X.burstText("FINAL CLASH", x, y - 90, "#ff2a3d", "big"); }
    });
    go(lt ? .12 : .44, () => { bars.classList.add("on"); if (!lt) { X.countUp(ba.lastChild, 0, a.stat, T(.24)); X.countUp(bb.lastChild, 0, b.stat, T(.24)); X.sfx("tick"); } });
    go(lt ? .45 : .74, () => resolveRow(i, false));
}
function fighter(x, k) {
    const f = el("div", "drk-f " + k);
    if (x.id) { const card = cardEl(clash.s, x.id, "full"), seal = card.querySelector(".dc-seal"); if (seal) seal.remove(); f.appendChild(card); }
    else f.appendChild(el("div", "drk-none", "EMPTY ROLE"));
    return f;
}
/* one role decided: the marks in both columns, the score; in the arena the winner dominates (or DRAW) */
function resolveRow(i, quiet) {
    const c = clash; if (!c || c.res[i]) return; c.res[i] = 1;
    const r = c.K.rows[i], w = r.win;
    if (w) c.score[w]++;
    c.nA.textContent = c.score[c.A]; c.nB.textContent = c.score[c.B];
    [c.A, c.B].forEach(k => { const row = c.cols[k].children[i]; row.classList.add("done", !w ? "draw" : w === k ? "won" : "lost"); row.querySelector(".drk-st").textContent = r[k].stat; row.querySelector(".drk-mk").textContent = !w ? "=" : w === k ? "✓" : "✗"; });
    if (quiet || !c.cur || c.cur.i !== i) return;
    const { ring, out, ar } = c.cur;
    ring.classList.add(!w ? "res-draw" : w === c.A ? "res-a" : "res-b");
    out.textContent = !w ? "DRAW · NOBODY SCORES" : teamName(X.data(), c.s, w).toUpperCase() + " DOMINATES · +1";
    out.classList.add("on", !w ? "draw" : w === c.A ? "a" : "b");
    const n = !w ? null : w === c.A ? c.nA : c.nB;
    if (n) { n.classList.remove("pop"); void n.offsetWidth; n.classList.add("pop"); }
    X.sfx(!w ? "skip" : "stamp");
    if (!c.lt && n) { const [x, y] = centerOf(n); X.burstText("+1", x, y + 34, "#f0c869"); }
    ar.classList.add("resolved");
}
function endSplash(quiet) {
    const c = clash; if (!c || c.ended) return; c.ended = true;
    c.K.rows.forEach((r, i) => resolveRow(i, true));
    [c.A, c.B].forEach(k => [...c.cols[k].children].forEach(row => row.classList.remove("now")));
    const K = c.K, d = X.data(), mk = myKey(c.s), win = K.winner, ar = c.arena;
    ar.innerHTML = ""; ar.className = "drk-arena end";
    ar.append(el("div", "dro-kick", !win ? "PERFECTLY EVEN" : K.by === "total" ? "TIEBREAK · TOTAL STATS" : "WINNER"), goldTitle(win ? teamName(d, c.s, win).toUpperCase() + " WINS" : "DRAW"), el("p", "dro-sub", resultLine(K, c.A, c.B)));
    if (quiet) return;
    X.sfx(!mk ? "reveal" : win === mk ? "win" : win ? "lose" : "reveal");
    if (!c.lt && win && win === mk) confetti(c.cv);
}
const resultLine = (K, A, B) => "Roles " + K.wins[A] + "–" + K.wins[B] + " · total stats " + K.tot[A] + "–" + K.tot[B] + (K.by === "total" ? " (roles tied: the total decides)" : K.by === "draw" ? " (roles and totals tied)" : "");
/* the summary: every role with both characters, both stats and who took it; the result; the buttons */
function summary(quiet) {
    const c = clash; if (!c || c.done) return;
    c.timers.forEach(clearTimeout); c.timers = [];
    if (!c.ended) endSplash(true);
    c.done = true; c.ov.classList.add("sum-on"); c.skip.classList.add("hidden");
    const K = c.K, d = X.data(), s = c.s, A = c.A, B = c.B, win = K.winner, box = c.sum;
    box.innerHTML = ""; box.classList.remove("hidden"); c.body.classList.add("hidden");
    const hero = el("div", "drk-hero" + (win ? "" : " draw"));
    hero.append(el("div", "dro-kick", "FINAL RESULT"), goldTitle(win ? teamName(d, s, win).toUpperCase() + " WINS" : "DRAW"), el("p", "dro-sub", resultLine(K, A, B)));
    box.appendChild(hero);
    const tab = el("div", "drk-tab");
    const hd = el("div", "drk-tr head"); hd.append(el("b", "side-" + A, teamName(d, s, A)), el("span", null, "ROLE"), el("b", "side-" + B, teamName(d, s, B))); tab.appendChild(hd);
    const cell = (x, k, won) => {
        const w = el("div", "drk-tc " + (k === A ? "a" : "b") + (won ? " won" : "") + (x.id ? " r-" + RARITIES[x.rar].key : ""));
        const im = new Image(); im.alt = ""; if (x.c && x.c.img) im.src = x.c.img; im.onerror = () => im.remove();
        const t = el("span", "drk-tn"); t.append(el("b", null, x.c ? x.c.n : "empty"), el("small", null, x.id ? RARITIES[x.rar].name + " · " + label(x.c.s) : ""));
        w.append(im, t, el("strong", null, String(x.stat)));
        return w;
    };
    K.rows.forEach(r => {
        const tr = el("div", "drk-tr");
        const mid = el("div", "drk-tm"); mid.append(el("small", null, (ROLE_ICONS[r.role] || "◆") + " " + r.role), el("b", null, !r.win ? "DRAW" : r.win === A ? "◀ WIN" : "WIN ▶"));
        tr.append(cell(r[A], A, r.win === A), mid, cell(r[B], B, r.win === B));
        tab.appendChild(tr);
    });
    const tot = el("div", "drk-tr foot");
    tot.append(el("b", null, K.wins[A] + " roles · " + K.tot[A] + " pts"), el("span", null, "TOTAL"), el("b", null, K.wins[B] + " roles · " + K.tot[B] + " pts"));
    tab.appendChild(tot);
    box.append(tab, el("div", "drk-btns"));
    clashBtns(d, X.data() && X.data().draft || s);
    if (!quiet) X.sfx("stamp");
}
function clashBtns(d, s) {
    const c = clash; if (!c || !c.done || !s) return;
    const box = c.ov.querySelector(".drk-btns"); if (!box) return;
    const key = s.phase + ":" + X.amHost(); if (box.dataset.k === key) return; box.dataset.k = key; box.innerHTML = "";
    if (s.phase !== "over") { box.appendChild(el("p", "dr-wait", "Everyone is still watching the clash…")); return; }
    if (X.amHost()) { const a = el("button", "btn xl", c.K.winner ? "DRAFT AGAIN" : "REMATCH"), b = el("button", "btn ghost", "Back to lobby"); a.onclick = () => window.drAgain(); b.onclick = () => window.drLobby(); box.append(a, b); }
    else box.appendChild(el("p", "dr-wait", "Waiting for " + X.pName(d, X.hostSlot(d)) + (c.K.winner ? " to draft again or go back to the lobby." : " to start the rematch.")));
}
/* Skip animations: straight to the summary (this screen only; the match still ends for everyone on schedule) */
function skipClash() { if (clash && !clash.done) { X.sfx("click"); summary(true); } }
