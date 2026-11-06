/* =====================================================================
   STANDARD MATCH RESULT (A1)
   resultOf(d, x) reads a room's FINAL state and returns the one object every mode reports:
     { key, mode, players:[{slot, uid, name}], placements:[{slot, place}], scores:{slot: n},
       teams?:[{id, name, slots, place, score}], duration (s), startedAt, endedAt, settings, v }
   or null while the match isn't over. Pure (no DOM, no Firebase), so it runs the same on every client
   and is unit-tested in Node (tools/result-test.mjs). It never changes a mode's gameplay: it only reads.

   Placements share a place on a tie ("1, 1, 3"). In a team mode every member gets the team's place.
   key = what pays at most once: one per started match (matchId), so a Headbanz sudden death or a
   reconnect never reports a second paid result for the same match.
   x (optional) = { draftStandings(s) } for the one mode whose scores need the rating database.
   ===================================================================== */

const arr = v => Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];
const num = v => Number(v) || 0;

/* lobby settings each mode reads (copied as-is into the result) */
const SETTINGS = {
    classic: ["animes", "boardSize"], headbanz: ["animes", "difficulty", "rounds"], imposter: ["animes", "difficulty", "laps"],
    uno: ["animes", "unoDeck", "unoSp"], draft: ["animes", "draftType", "draftFmt", "draftRoles"], feud: ["animes", "feudRounds", "feudTimer"],
    likely: ["animes", "likelyPlay", "likelyRounds", "likelyTimer"], sketch: ["animes", "sketchRounds", "sketchTimer", "sketchDiff", "sketchMode"],
    cardvault: ["cvFormat", "cvTimer", "cvPack"]
};

/* rows sorted best-first + a "same as the row before" test -> shared places */
export function placeRows(rows, same) {
    rows.forEach((r, i) => { r.place = i && same(rows[i - 1], r) ? rows[i - 1].place : i + 1; });
    return rows;
}

/* every mode: is it over, who played, and how they placed */
const MODES = {
    classic(d) {
        if (d.status !== "finished" || !num(d.winner)) return null;
        const seats = arr(d.gw && d.gw.seats).map(Number), w = num(d.winner);
        if (seats.length !== 2) return null;
        return { slots: seats, rows: seats.map(p => ({ p, score: p === w ? 1 : 0, place: p === w ? 1 : 2 })), end: num(d.finishedAt) };
    },
    headbanz(d) {
        const hb = d.hb; if (!hb || hb.phase !== "match") return null;
        const sc = hb.scores || {}, fi = hb.firsts || {};
        const rows = arr(hb.players).map(Number).map(p => ({ p, score: num(sc["p" + p]), k: num(fi["p" + p]) }))
            .sort((a, b) => b.score - a.score || b.k - a.k || a.p - b.p);
        return { slots: rows.map(r => r.p), rows: placeRows(rows, (a, b) => a.score === b.score && a.k === b.k) };
    },
    imposter(d) {
        const im = d.im; if (!im || im.phase !== "match") return null;
        const sc = im.scores || {}, iw = im.impWins || {};
        const rows = arr(im.players).map(Number).map(p => ({ p, score: num(sc["p" + p]), k: num(iw["p" + p]) }))
            .sort((a, b) => b.score - a.score || b.k - a.k || a.p - b.p);
        return { slots: rows.map(r => r.p), rows: placeRows(rows, (a, b) => a.score === b.score && a.k === b.k) };
    },
    uno(d) {
        const u = d.uno; if (!u || u.phase !== "over") return null;
        const seats = arr(u.seats).map(Number), places = arr(u.places).map(Number), hands = u.hands || {};
        const order = places.length === seats.length ? places
            : seats.slice().sort((a, b) => (a === num(u.winner) ? -1 : b === num(u.winner) ? 1 : arr(hands["p" + a]).length - arr(hands["p" + b]).length));
        return { slots: seats, rows: order.map((p, i) => ({ p, score: arr(hands["p" + p]).length, place: i + 1 })), lowWins: true, round: num(u.round) };
    },
    draft(d, x) {
        const s = d.draft; if (!s || s.phase !== "over" || !x || !x.draftStandings) return null;
        const st = x.draftStandings(s); if (!st || !st.length) return null;
        const rows = [], teams = s.type === "build" ? [] : null;
        st.forEach(t => {
            if (teams) teams.push({ id: t.key, name: t.key === "L" ? "Left side" : "Right side", slots: t.players.slice(), place: t.place, score: t.total });
            t.players.forEach(p => rows.push({ p, score: t.total, place: t.place }));
        });
        return { slots: rows.map(r => r.p), rows, teams };
    },
    feud(d) { return feudLike(d.feud); },
    likely(d) { return feudLike(d.likely); },
    sketch(d) {
        const s = d.sketch; if (!s || s.phase !== "over") return null;
        const sc = s.score || {};
        const rows = arr(s.players).map(Number).map(p => ({ p, score: num(sc["p" + p]) })).sort((a, b) => b.score - a.score || a.p - b.p);
        return { slots: rows.map(r => r.p), rows: placeRows(rows, (a, b) => a.score === b.score) };
    },
    cardvault(d) {
        const s = d.cv; if (!s || s.phase !== "over") return null;
        const rows = arr(s.places).map(r => ({ p: num(r.p), score: num(r.life), place: num(r.place) }));
        return rows.length ? { slots: rows.map(r => r.p), rows } : null;
    }
};
/* Anime Feud and Most Likely share an engine: two teams A/B, or (Most Likely) a free-for-all */
const TEAM_NAMES = { A: "Team Crimson", B: "Team Gold" };
function feudLike(s) {
    if (!s || s.phase !== "over") return null;
    const sc = s.score || {};
    if (s.ffa) {
        const rows = arr(s.players).map(Number).map(p => ({ p, score: num(sc["p" + p]) })).sort((a, b) => b.score - a.score || a.p - b.p);
        return { slots: rows.map(r => r.p), rows: placeRows(rows, (a, b) => a.score === b.score) };
    }
    const tm = ["A", "B"].map(k => ({ id: k, name: TEAM_NAMES[k], slots: arr(s.teams && s.teams[k]).map(Number), score: num(sc[k]) })).filter(t => t.slots.length)
        .sort((a, b) => b.score - a.score);
    placeRows(tm, (a, b) => a.score === b.score);
    const rows = []; tm.forEach(t => t.slots.forEach(p => rows.push({ p, score: t.score, place: t.place })));
    return { slots: rows.map(r => r.p), rows, teams: tm };
}

export const RESULT_MODES = Object.keys(MODES);
export const RESULT_SETTINGS = SETTINGS;       // the lobby keys a result copies per mode (the Night Party stage schema must match)

export function resultOf(d, x, now = Date.now()) {
    if (!d || !d.status || d.status === "waiting") return null;
    const mode = d.gameType || "classic", f = MODES[mode];
    if (!f) return null;
    const r = f(d, x); if (!r || !r.rows.length) return null;
    const mid = num(d.matchId);
    const players = r.slots.map(p => { const n = d["player" + p] || {}; return { slot: p, uid: String(n.uid || ""), name: String(n.name || "Player " + p) }; });
    const endedAt = r.end || now, startedAt = mid || endedAt;
    const settings = {}; (SETTINGS[mode] || []).forEach(k => { if (d[k] != null) settings[k] = Array.isArray(d[k]) ? d[k].slice() : d[k]; });
    const out = {
        v: 1, key: mode + ":" + (mid || "x") + (r.round ? ":r" + r.round : ""), mode,
        players, placements: r.rows.map(x2 => ({ slot: x2.p, place: x2.place })).sort((a, b) => a.place - b.place || a.slot - b.slot),
        scores: Object.fromEntries(r.rows.map(x2 => [x2.p, x2.score])),
        duration: Math.max(0, Math.round((endedAt - startedAt) / 1000)), startedAt, endedAt, settings
    };
    if (r.teams) out.teams = r.teams.map(t => ({ id: t.id, name: t.name, slots: t.slots.slice(), place: t.place, score: t.score }));
    if (r.lowWins) out.lowWins = true;
    return out;
}

/* ARCADE VAULT card battles are challenges between some of the players in a room (rooms/<code>/cvb/<bid>), not a
   room-wide match, so they report one standard result per battle: key "cardvault:<bid>". b = the battle node
   ({ s: engine state, uids, t0, end, timer, pack }), d = the room (for uids of older nodes). Pure. */
export function battleResultOf(b, d, bid, now = Date.now()) {
    const s = b && b.s; if (!s || s.phase !== "over" || !bid) return null;
    const rows = arr(s.places).map(r => ({ p: num(r.p), score: num(r.life), place: num(r.place) }));
    if (!rows.length) return null;
    const uids = b.uids || {};
    const players = rows.map(r => { const n = (d && d["player" + r.p]) || {}; return { slot: r.p, uid: String(uids["p" + r.p] || n.uid || ""), name: String((s.names || {})["p" + r.p] || n.name || "Player " + r.p) }; });
    const endedAt = num(b.end) || now, startedAt = num(b.t0) || num(b.at) || endedAt;
    return {
        v: 1, key: "cardvault:" + bid, mode: "cardvault", players,
        placements: rows.map(r => ({ slot: r.p, place: r.place })).sort((a, c) => a.place - c.place || a.slot - c.slot),
        scores: Object.fromEntries(rows.map(r => [r.p, r.score])),
        duration: Math.max(0, Math.round((endedAt - startedAt) / 1000)), startedAt, endedAt,
        settings: { cvFormat: rows.length > 2 ? "ffa" : "duel", cvTimer: num(b.timer), cvPack: b.pack ? 1 : 0 }
    };
}

/* a result as Firebase can store it and back. RTDB turns {1:…, 2:…} into an array, so scores are keyed "p1" there. */
export function resultToDb(r) {
    const o = JSON.parse(JSON.stringify(r));
    o.scores = Object.fromEntries(Object.entries(r.scores || {}).map(([k, s]) => ["p" + k, s]));
    return o;
}
export function resultFromDb(v) {
    if (!v || typeof v !== "object" || !v.key || !v.mode) return null;
    const r = JSON.parse(JSON.stringify(v));
    r.players = arr(r.players).map(p => ({ slot: num(p.slot), uid: String(p.uid || ""), name: String(p.name || "") }));
    r.placements = arr(r.placements).map(p => ({ slot: num(p.slot), place: num(p.place) }));
    if (r.teams) r.teams = arr(r.teams).map(t => Object.assign(t, { slots: arr(t.slots).map(Number) }));
    r.scores = Object.fromEntries(Object.entries(r.scores || {}).map(([k, s]) => [num(String(k).replace(/^p/, "")), num(s)]));
    if (r.settings && r.settings.animes) r.settings.animes = arr(r.settings.animes);
    return r;
}
