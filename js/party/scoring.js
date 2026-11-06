/* =====================================================================
   NIGHT PARTY · DATA MODEL + SCORING (pure: no DOM, no Firebase; unit-tested in tools/party-test.mjs)

   Everything is keyed by player id (the account uid), so a player who rejoins with another seat keeps their pool.
   The tournament keeps only:
     roster  { id: { start, joined, gone, ... } }   start = the pool they began with (0, or the average for a late joiner)
     res     { "<stage index>": { weight, placements: [{ id, place }], skipped?, sd? } }
   Pools, gains, ranks and ties are ALWAYS recomputed from those (standings), never stored.

   SCORING (placement only, never raw scores)
   1. base(place, n) = top - (place - 1) * (top - bottom) / (n - 1)        (10 .. 1 by default; n = players placed)
   2. Players sharing a place (a tie, or one team) cover the positions they take up together and each get the
      average of those positions' base points (4v4: 1st team ~8.07, 2nd ~2.93).
   3. x the stage weight, added to the pool. Exact values are kept; ties are decided on exact values (eps).
   ===================================================================== */
import { NIGHT_PARTY as NP } from "./config.js?v=1";

const near = (a, b) => Math.abs(a - b) < NP.eps;
const arr = v => Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];

/* 1. base points for a place among n */
export function basePoints(place, n) {
    const { top, bottom } = NP.points;
    if (n <= 1) return top;
    return top - (place - 1) * (top - bottom) / (n - 1);
}
/* 2. placements [{id, place}] -> {id: points before the weight}; shared places share their positions */
export function sharePoints(placements) {
    const rows = arr(placements).filter(p => p && p.id).slice().sort((a, b) => a.place - b.place), n = rows.length, out = {};
    let i = 0;
    while (i < n) {
        let j = i; while (j + 1 < n && rows[j + 1].place === rows[i].place) j++;
        let sum = 0; for (let k = i; k <= j; k++) sum += basePoints(k + 1, n);
        for (let k = i; k <= j; k++) out[rows[k].id] = sum / (j - i + 1);
        i = j + 1;
    }
    return out;
}
/* 3. one stage: {id: weighted points} */
export function stagePoints(placements, weight = 1) {
    const s = sharePoints(placements), w = Number(weight) || 0;
    Object.keys(s).forEach(k => { s[k] *= w; });
    return s;
}
/* team placements -> every member gets the team's place (sharePoints then spreads the positions) */
export function teamPlacements(teams) {
    const out = [];
    arr(teams).forEach(t => arr(t.ids).forEach(id => out.push({ id, place: Number(t.place) })));
    return out;
}
/* places from an ordering of groups: [[a], [b, c], [d]] -> a 1, b 2, c 2, d 4 */
export function placesFromGroups(groups) {
    const out = []; let pos = 1;
    arr(groups).forEach(g => { const ids = arr(g); ids.forEach(id => out.push({ id, place: pos })); pos += ids.length; });
    return out;
}
/* a stage result's placements with some players removed (left the room) and some scored last (dropped: offline too
   long). The rest keep their order; places are renumbered so they still share correctly among those present. */
export function adjustPlacements(placements, { remove = [], last = [] } = {}) {
    const rm = new Set(remove), dl = new Set(last);
    const keep = arr(placements).filter(p => !rm.has(p.id)).sort((a, b) => a.place - b.place);
    const groups = [], seen = new Map();
    keep.filter(p => !dl.has(p.id)).forEach(p => { if (!seen.has(p.place)) { seen.set(p.place, []); groups.push(seen.get(p.place)); } seen.get(p.place).push(p.id); });
    const tail = keep.filter(p => dl.has(p.id)).map(p => p.id);
    if (tail.length) groups.push(tail);
    return placesFromGroups(groups);
}

/* ---------- standings: recomputed from the roster and the stored stage results ---------- */
export function standings(roster, results, nStages) {
    const ids = Object.keys(roster || {});
    const idx = Object.keys(results || {}).map(Number).filter(k => !isNaN(k)).sort((a, b) => a - b);
    const len = Math.max(nStages || 0, idx.length ? idx[idx.length - 1] + 1 : 0);
    const rows = ids.map(id => ({ id, pool: Number((roster[id] || {}).start) || 0, gains: new Array(len).fill(null), last: null, gone: !!(roster[id] || {}).gone, played: 0 }));
    const by = Object.fromEntries(rows.map(r => [r.id, r]));
    idx.forEach(k => {
        const r = results[k]; if (!r || r.skipped) return;
        const pts = stagePoints(r.placements, r.weight);
        Object.entries(pts).forEach(([id, p]) => { const row = by[id]; if (!row) return; row.gains[k] = p; row.pool += p; if (!r.sd) row.played++; });
    });
    const lastK = idx.filter(k => results[k] && !results[k].skipped && !results[k].sd).pop();
    if (lastK != null) rows.forEach(r => { r.last = r.gains[lastK]; });
    rows.sort((a, b) => (b.pool - a.pool) || (a.gone - b.gone) || a.id.localeCompare(b.id));
    rows.forEach((r, i) => {
        const prev = rows[i - 1];
        r.rank = prev && near(prev.pool, r.pool) ? prev.rank : i + 1;
    });
    rows.forEach(r => { r.tied = rows.some(o => o !== r && o.rank === r.rank); });
    return rows;
}
/* the players who can still win (not gone) with the top pool: more than one = sudden death */
export function topTied(rows) {
    const ok = rows.filter(r => !r.gone); if (!ok.length) return [];
    const best = Math.max(...ok.map(r => r.pool));
    return ok.filter(r => near(r.pool, best)).map(r => r.id);
}
/* the gap between the leader and the next player (0 when tied) */
export function leadGap(rows) {
    const ok = rows.filter(r => !r.gone); if (ok.length < 2) return 0;
    return Math.max(0, ok[0].pool - ok[1].pool);
}
/* a late joiner's starting pool: 0 or the average pool of the players present */
export function lateStart(rows, presentIds, mode) {
    if (mode !== "avg") return 0;
    const p = rows.filter(r => presentIds.includes(r.id)); if (!p.length) return 0;
    return p.reduce((s, r) => s + r.pool, 0) / p.length;
}

/* ---------- seeding ---------- */
/* best pool first; equal pools in random order (rng() in [0,1)), so stage 1 (all 0) is a random draw */
export function seedOrder(ids, poolOf, rng = Math.random) {
    const keyed = arr(ids).map(id => ({ id, p: Number(poolOf(id)) || 0, r: rng() }));
    keyed.sort((a, b) => (near(a.p, b.p) ? 0 : b.p - a.p) || a.r - b.r);
    return keyed.map(k => k.id);
}
/* balanced teams: snake order by pool (1st A, 2nd B, 3rd B, 4th A, ...); random = shuffle first */
export function splitTeams(ids, poolOf, how = "auto", rng = Math.random) {
    const order = how === "random" ? arr(ids).map(id => ({ id, r: rng() })).sort((a, b) => a.r - b.r).map(x => x.id) : seedOrder(ids, poolOf, rng);
    const T = { A: [], B: [] };
    order.forEach((id, i) => { const k = i % 4; (k === 0 || k === 3 ? T.A : T.B).push(id); });
    return T;
}

/* ---------- single-elimination bracket ----------
   br = { size, rounds: [[{ a, b, w }]] }   a/b = player id, "" = not known yet, "-" = bye; w = winner id or "".
   Seeds go in standard positions (1 v 8, 4 v 5, 2 v 7, 3 v 6), so the top seeds get the byes. */
export const BYE = "-";
export function seedSlots(size) {
    let s = [1];
    while (s.length < size) { const m = s.length * 2 + 1; s = s.flatMap(x => [x, m - x]); }
    return s;
}
export function makeBracket(seeds) {
    const ids = arr(seeds); let size = 1; while (size < ids.length) size *= 2;
    size = Math.max(2, size);
    const slots = seedSlots(size).map(k => ids[k - 1] || BYE), rounds = [];
    let n = size / 2;
    rounds.push(Array.from({ length: n }, (_, i) => ({ a: slots[2 * i], b: slots[2 * i + 1], w: "" })));
    while (n > 1) { n /= 2; rounds.push(Array.from({ length: n }, () => ({ a: "", b: "", w: "" }))); }
    return settle({ size, rounds });
}
/* fill winners forward and resolve byes */
export function settle(br) {
    const R = br.rounds;
    for (let r = 0; r < R.length; r++) {
        R[r].forEach((m, i) => {
            if (r > 0) { m.a = R[r - 1][2 * i].w || (R[r - 1][2 * i].a === BYE && R[r - 1][2 * i].b === BYE ? BYE : ""); m.b = R[r - 1][2 * i + 1].w || (R[r - 1][2 * i + 1].a === BYE && R[r - 1][2 * i + 1].b === BYE ? BYE : ""); }
            if (!m.w && m.a && m.b && (m.a === BYE) !== (m.b === BYE)) m.w = m.a === BYE ? m.b : m.a;
        });
    }
    return br;
}
export function normBracket(v) {
    if (!v) return null;
    return { size: Number(v.size) || 2, rounds: arr(v.rounds).map(r => arr(r).map(m => ({ a: String(m.a || ""), b: String(m.b || ""), w: String(m.w || "") }))) };
}
/* the next match to play: both players known, no winner yet, earliest round first */
export function nextMatch(br) {
    for (let r = 0; r < br.rounds.length; r++)
        for (let i = 0; i < br.rounds[r].length; i++) {
            const m = br.rounds[r][i];
            if (!m.w && m.a && m.b && m.a !== BYE && m.b !== BYE) return { r, i, a: m.a, b: m.b };
        }
    return null;
}
export function recordWin(br, r, i, w) {
    const m = br.rounds[r] && br.rounds[r][i];
    if (!m || m.w || (w !== m.a && w !== m.b)) return false;
    m.w = w; settle(br); return true;
}
export const bracketDone = br => !!br && !!br.rounds[br.rounds.length - 1][0].w;
export const matchesLeft = br => br.rounds.flat().filter(m => !m.w && m.a !== BYE && m.b !== BYE).length;
/* champion 1st, finalist 2nd, semifinal losers 3rd (tied), quarterfinal losers 5th (tied), ... */
export function bracketPlacements(br) {
    const R = br.rounds, out = [], champ = R[R.length - 1][0].w;
    if (champ) out.push({ id: champ, place: 1 });
    for (let r = R.length - 1; r >= 0; r--) {
        const place = Math.pow(2, R.length - 1 - r) + 1;
        R[r].forEach(m => { if (!m.w || m.a === BYE || m.b === BYE) return; const loser = m.w === m.a ? m.b : m.a; if (loser && loser !== BYE) out.push({ id: loser, place }); });
    }
    return out;
}

/* ---------- sudden death ---------- */
/* the players placed 1st in a sudden-death round (one = the winner) */
export const sdWinners = placements => arr(placements).filter(p => p.place === 1).map(p => p.id);
