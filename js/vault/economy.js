/* =====================================================================
   ANIME TCG · ECONOMY RULES (pure: no DOM, no storage; unit-tested in tools/vault-test.mjs)
   Every function here changes a vault document `w` handed in by bank.apply(), so it is saved atomically
   and at most once per operation id. Numbers come from config.js.

   COINS PER GAME (A2)
   1. Sort the players by place. Players who share a place (a tie, or one team) cover the positions they
      take up together: a team of 3 in 1st covers positions 1-3, the 2-player team behind it 4-5.
   2. Each player gets the average of the position values they cover. Position values: the 8-player
      table with 8 players, otherwise an even spread from 40 (1st) to 10 (last).
   3. x the length multiplier of the mode (short 0.75, medium 1, long 1.5), rounded.
   4. Paid only if: 2+ real players (distinct accounts). Every finished game pays, however short it was.
      There is no daily limit on coins from games.
   ===================================================================== */
import { EARN, DAILY_LOGIN, MISSIONS, MODE_META, DUEL } from "./config.js?v=15";
import { rngFrom, shuffleWith } from "./rng.js?v=2";
import { NIGHT_PARTY } from "../party/config.js?v=2";

/* parts of the Vault that exist so far (missions that need a missing part are never rolled) */
export const FEATURES = new Set(["games"]);

const pad = n => String(n).padStart(2, "0");
export const dayKey = (t = Date.now()) => { const d = new Date(t); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
export const dayBefore = day => { const [y, m, d] = day.split("-").map(Number); return dayKey(new Date(y, m - 1, d - 1, 12).getTime()); };

/* value of finishing position pos (1-based) among n players */
export function posValue(pos, n) {
    if (n <= 1) return EARN.top;
    if (n === EARN.place8.length) return EARN.place8[pos - 1];
    return EARN.top - (pos - 1) * (EARN.top - EARN.bottom) / (n - 1);
}
/* slot -> average value of the positions it covers */
export function placeValues(placements) {
    const rows = placements.slice().sort((a, b) => a.place - b.place), n = rows.length, out = {};
    let i = 0;
    while (i < n) {
        let j = i; while (j + 1 < n && rows[j + 1].place === rows[i].place) j++;
        let sum = 0; for (let k = i; k <= j; k++) sum += posValue(k + 1, n);
        for (let k = i; k <= j; k++) out[rows[k].slot] = sum / (j - i + 1);
        i = j + 1;
    }
    return out;
}
export const lengthOf = mode => mode === "cardvault" ? DUEL.length : (MODE_META[mode] || {}).length || "medium";

/* can this game pay at all? */
export function gameValid(r) {
    const uids = new Set(r.players.map(p => p.uid).filter(Boolean));
    if (uids.size < EARN.minRealPlayers) return { ok: false, why: "needs " + EARN.minRealPlayers + "+ real players" };
    return { ok: true };
}
/* coins one player gets for one game */
export function gameCoins(r, slot) {
    const v = placeValues(r.placements)[slot]; if (v == null) return 0;
    return Math.round(v * (EARN.lengthMult[lengthOf(r.mode)] || 1));
}
export const myPlace = (r, slot) => (r.placements.find(p => p.slot === slot) || {}).place || 0;

/* ---------- daily missions ---------- */
function staleModes(w, now) {
    const cut = now - MISSIONS.freshModeDays * 86400000;
    return Object.keys(MODE_META).filter(m => (m !== "cardvault" || FEATURES.has("duel")) && !(Number((w.modes || {})[m]) > cut));
}
/* rolls today's missions once (seeded; the seed goes in the ledger). Returns true if it rolled. */
export function ensureMissions(w, now, seed, log) {
    const day = dayKey(now);
    if (w.missions && w.missions.day === day && w.missions.list && w.missions.list.length) return false;
    const rng = rngFrom(seed);
    let stale = staleModes(w, now);
    if (!stale.length) {     // played everything this week: the least recently played mode
        const all = Object.keys(MODE_META).filter(m => m !== "cardvault" || FEATURES.has("duel"));
        stale = [all.sort((a, b) => (Number(w.modes[a]) || 0) - (Number(w.modes[b]) || 0))[0]];
    }
    const fresh = Object.assign({}, MISSIONS.fresh, { modes: shuffleWith(rng, stale).slice(0, 4), prog: 0, done: false });
    const kinds = new Set(["fresh"]), list = [fresh];
    for (const m of shuffleWith(rng, MISSIONS.pool.filter(m => !m.needs || FEATURES.has(m.needs)))) {
        if (list.length >= MISSIONS.perDay) break;
        if (kinds.has(m.kind)) continue;
        kinds.add(m.kind); list.push(Object.assign({}, m, { prog: 0, done: false }));
    }
    w.missions = { day, seed, list: shuffleWith(rng, list) };
    if (log) log({ kind: "missions", d: 0, seed, info: list.map(m => m.id).join(",") });
    return true;
}
/* ev = { play, win, top3ffa, squad, teamwin, cvwin, pack, scratch, deck, mode }; pays finished missions */
export function missionEvent(w, ev, log) {
    const done = [];
    (w.missions.list || []).forEach(m => {
        if (m.done) return;
        const hit = m.kind === "fresh" ? (ev.play && (m.modes || []).includes(ev.mode) ? 1 : 0) : Number(ev[m.kind]) || 0;
        if (!hit) return;
        m.prog = Math.min(m.goal, (m.prog || 0) + hit);
        if (m.prog >= m.goal) { m.done = true; w.coins += m.coins; done.push({ id: m.id, text: m.text, coins: m.coins }); if (log) log({ kind: "mission", d: m.coins, info: m.id }); }
    });
    return done;
}

/* ---------- a finished game (the standard result) ---------- */
export function applyGame(w, r, slot, now, seed, log) {
    ensureMissions(w, now, seed, log);
    const n = r.players.length, place = myPlace(r, slot), mode = r.mode;
    const out = { mode, place, n, coins: 0, raw: 0, mult: EARN.lengthMult[lengthOf(mode)] || 1, why: "", missions: [], teams: !!r.teams };
    const ok = gameValid(r);
    if (!ok.ok) { out.why = ok.why; return out; }
    delete w.earn;                                               // the old daily-cap counter (no cap any more)
    out.raw = out.coins = gameCoins(r, slot);
    w.coins += out.coins;
    if (log) log({ kind: "game", d: out.coins, info: mode + " #" + place + "/" + n });
    const won = place === 1, ffa = !r.teams;
    out.missions = missionEvent(w, { mode, play: 1, win: won ? 1 : 0, top3ffa: ffa && n >= 4 && place <= 3 ? 1 : 0, squad: n >= 4 ? 1 : 0, teamwin: r.teams && won ? 1 : 0, cvwin: mode === "cardvault" && won ? 1 : 0 }, log);
    w.modes = Object.assign({}, w.modes, { [mode]: now });       // after the missions: "fresh" looks at the time before this game
    return out;
}

/* ---------- daily login bonus ---------- */
export function loginState(w, now) {
    const day = dayKey(now), d = w.daily || {};
    const claimed = d.last === day, cont = d.last === dayBefore(day);
    const streak = claimed ? d.streak : cont ? (d.streak || 0) + 1 : 1;     // the streak it is (claimed) or will be (claim now)
    return { day, claimed, streak, coins: DAILY_LOGIN[(streak - 1) % DAILY_LOGIN.length], index: (streak - 1) % DAILY_LOGIN.length, lost: !claimed && !cont && (d.streak || 0) > 0 };
}
export function claimDaily(w, now, log) {
    const s = loginState(w, now);
    if (s.claimed) return { error: "Already claimed today" };
    w.daily = { last: s.day, streak: s.streak }; w.coins += s.coins;
    if (log) log({ kind: "daily", d: s.coins, info: "day " + s.streak });
    return { coins: s.coins, streak: s.streak, index: s.index };
}

/* coins from games on one day, read from the ledger (a plain stat: nothing is limited by it) */
export const gameCoinsOn = (ledger, day) => (ledger || []).reduce((s, l) => s + (l.kind === "game" && dayKey(l.t) === day ? Number(l.d) || 0 : 0), 0);

/* ---------- Night Party bonus coins (on top of each stage's normal coins) ----------
   winner + perStage x the stages this player played. Pays only when the tournament had 2+ real players (accounts);
   no minimum length; at most once per tournament (the bank's operation id). */
const NPC = NIGHT_PARTY.coins;
export const nightPartyCoins = (won, stages) => (won ? NPC.winner : 0) + NPC.perStage * Math.max(0, stages | 0);
export function nightPartyValid(o) {
    if ((o.players | 0) < NPC.minPlayers) return { ok: false, why: "needs " + NPC.minPlayers + "+ real players" };
    if ((o.stages | 0) < 1) return { ok: false, why: "no stage played" };
    return { ok: true };
}
/* o = { won, stages (played by this player), players (distinct accounts), seconds }; also counts the Night Party mission */
export function applyNightParty(w, o, now, seed, log) {
    ensureMissions(w, now, seed, log);
    const ok = nightPartyValid(o), out = { coins: 0, why: ok.ok ? "" : ok.why, won: !!o.won, stages: o.stages | 0, missions: [] };
    if (!ok.ok) return out;
    out.coins = nightPartyCoins(o.won, o.stages);
    w.coins += out.coins;
    if (log) log({ kind: "nightparty", d: out.coins, info: (o.won ? "winner, " : "") + (o.stages | 0) + " stages" });
    out.missions = missionEvent(w, { party: 1 }, log);
    if (o.won && NIGHT_PARTY.winnerCosmetic) out.cosmetic = winnerCosmeticHook(w, NIGHT_PARTY.winnerCosmetic, log);
    w.party = { played: ((w.party || {}).played | 0) + 1, won: ((w.party || {}).won | 0) + (o.won ? 1 : 0) };
    return out;
}
/* HOOK (not built): an earn-only cosmetic for tournament winners. To build it: add the tier to SKINS.earnOnly (so the
   shop can't sell it), set NIGHT_PARTY.winnerCosmetic to its item id, and grant it here (w.inv[id] = 1 + a ledger line).
   Until then it does nothing. */
export function winnerCosmeticHook(w, id, log) { return null; }
