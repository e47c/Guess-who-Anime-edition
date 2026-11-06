// Arcade Vault tests: node tools/vault-test.mjs
// Phase 1: the standard match result for every mode (from final room states), the storage layer (idempotent,
// atomic, never negative), the seeded RNG, the config. Phase 2: coins per placement, anti-farming, the daily
// cap, missions and the login streak.
import { resultOf, resultToDb, resultFromDb, placeRows, RESULT_MODES } from "../js/vault/result.js";
import { createBank, memoryBackend, migrate, blankVault } from "../js/vault/store.js?v=2";
import { rngFrom, newSeed, pickWeighted, shuffleWith } from "../js/vault/rng.js?v=1";
import { MODE_META, EARN, PACKS, RARITY_ORDER, SKINS, DAILY_LOGIN, VAULT, MISSIONS } from "../js/vault/config.js?v=2";
import { posValue, placeValues, gameValid, gameCoins, applyGame, claimDaily, loginState, ensureMissions, missionEvent, dayKey, dayBefore, nightPartyCoins } from "../js/vault/economy.js?v=1";

let ok = 0, bad = 0;
const t = (c, m) => { if (c) ok++; else { bad++; console.log("  ✘", m); } };
const sect = s => console.log("• " + s);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const players = n => Object.fromEntries(Array.from({ length: n }, (_, i) => ["player" + (i + 1), { uid: "u" + (i + 1), name: "P" + (i + 1) }]));
const room = (gameType, n, extra) => Object.assign({ status: "playing", gameType, matchId: 1000000, animes: ["onepiece", "naruto"] }, players(n), extra);
const places = r => r.placements.map(p => p.slot + ":" + p.place).join(" ");
const NOW = 1000000 + 300000;     // 5 minutes after the start

sect("config");
t(RESULT_MODES.every(m => MODE_META[m]), "every mode with a result has metadata");
t(Object.values(MODE_META).every(m => m.min >= 2 && m.max >= m.min && m.max <= 8 && ["short", "medium", "long"].includes(m.length) && typeof m.teams === "boolean" && typeof m.duel === "boolean" && typeof m.fast === "boolean"), "metadata: players, teams, 1v1, length, fast");
t(EARN.place8.length === 8 && EARN.place8[0] === 40 && EARN.place8[7] === 10, "8-player coin table");
t(Object.values(PACKS).every(p => Math.abs(RARITY_ORDER.reduce((s, k) => s + p.odds[k], 0) - 100) < 1e-9), "pack odds add up to 100%");
t(SKINS.tiers.length === 11 && SKINS.tiers.some(x => x.id === "prismatic") && !SKINS.tiers.some(x => x.id === "holo"), "11 skin tiers, Holo renamed Prismatic");
t(eq(DAILY_LOGIN, [30, 30, 40, 40, 50, 50, 100]), "login streak");

sect("not over -> no result");
t(resultOf(room("classic", 2, { status: "selecting", gw: { seats: [1, 2] } })) === null, "Guess Who picking");
t(resultOf(room("headbanz", 3, { hb: { phase: "round", players: [1, 2, 3] } })) === null, "Headbanz between rounds");
t(resultOf({ status: "waiting", gameType: "uno" }) === null, "lobby");
t(resultOf(room("draft", 2, { draft: { phase: "over", type: "build" } })) === null, "Draft without the rating database (host builds it)");

sect("Guess Who");
let r = resultOf(room("classic", 4, { status: "finished", winner: 3, finishedAt: 1000000 + 95000, gw: { seats: [3, 1] } }), null, NOW);
t(r && r.mode === "classic" && places(r) === "3:1 1:2", "winner 1st, other duelist 2nd: " + (r && places(r)));
t(r.players.length === 2 && r.players.every(p => p.uid), "only the two duelists are players (spectators aren't)");
t(r.duration === 95 && r.key === "classic:1000000", "duration from matchId to finishedAt, key per match");
t(eq(r.settings.animes, ["onepiece", "naruto"]), "settings copied");

sect("Headbanz");
r = resultOf(room("headbanz", 4, { hb: { phase: "match", players: [1, 2, 3, 4], scores: { p1: 9, p2: 12, p3: 9, p4: 3 }, firsts: { p1: 1, p2: 2, p3: 1, p4: 0 } } }), null, NOW);
t(places(r) === "2:1 1:2 3:2 4:4", "tie shares 2nd, next is 4th: " + places(r));
t(r.scores[2] === 12 && r.duration === 300, "scores and duration");
r = resultOf(room("headbanz", 3, { hb: { phase: "match", players: [1, 2, 3], scores: { p1: 5, p2: 5, p3: 1 }, firsts: { p1: 1, p2: 0, p3: 0 } } }), null, NOW);
t(places(r) === "1:1 2:2 3:3", "firsts break a score tie (as the mode's own standings do)");

sect("Imposter");
r = resultOf(room("imposter", 5, { im: { phase: "match", players: [1, 2, 3, 4, 5], scores: { p1: 4, p2: 6, p3: 6, p4: 2, p5: 4 }, impWins: { p1: 1, p2: 1, p3: 1, p4: 0, p5: 1 } } }), null, NOW);
t(places(r) === "2:1 3:1 1:3 5:3 4:5", "shared 1st and 3rd: " + places(r));

sect("Anime UNO");
r = resultOf(room("uno", 4, { matchId: 2000000, uno: { phase: "over", round: 3, seats: [1, 2, 3, 4], places: [3, 1, 4, 2], winner: 3, hands: { p1: [], p2: [5, 6], p3: [], p4: [] } } }), null, NOW);
t(places(r) === "3:1 1:2 4:3 2:4", "finishing order: " + places(r));
t(r.key === "uno:2000000:r3" && r.lowWins, "key per round");

sect("Anime Draft");
const drBuild = s => [{ key: "R", players: [2, 4], total: 140, place: 1 }, { key: "L", players: [1, 3], total: 120, place: 2 }];
r = resultOf(room("draft", 4, { draft: { phase: "over", type: "build" } }), { draftStandings: drBuild }, NOW);
t(places(r) === "2:1 4:1 1:2 3:2" && r.teams.length === 2 && r.teams[0].place === 1 && eq(r.teams[0].slots, [2, 4]), "build: two teams, members share the team's place");
const drAuc = s => [{ key: "p2", players: [2], total: 90, place: 1 }, { key: "p1", players: [1], total: 80, place: 2 }, { key: "p3", players: [3], total: 80, place: 2 }];
r = resultOf(room("draft", 3, { draft: { phase: "over", type: "auction" } }), { draftStandings: drAuc }, NOW);
t(places(r) === "2:1 1:2 3:2" && !r.teams, "auction: free-for-all, shared places from the mode's standings");

sect("Anime Feud / Most Likely");
r = resultOf(room("feud", 5, { feud: { phase: "over", teams: { A: [1, 3, 5], B: [2, 4] }, score: { A: 210, B: 260 } } }), null, NOW);
t(places(r) === "2:1 4:1 1:2 3:2 5:2" && r.teams[0].name === "Team Gold", "Feud: winning team 1st: " + places(r));
r = resultOf(room("likely", 4, { likely: { phase: "over", teams: { A: [1, 2], B: [3, 4] }, score: { A: 50, B: 50 } } }), null, NOW);
t(places(r) === "1:1 2:1 3:1 4:1", "Most Likely teams: a draw is everyone 1st");
r = resultOf(room("likely", 4, { likely: { phase: "over", ffa: 1, players: [1, 2, 3, 4], teams: { A: [], B: [] }, score: { p1: 30, p2: 50, p3: 30, p4: 0 } } }), null, NOW);
t(places(r) === "2:1 1:2 3:2 4:4" && !r.teams, "Most Likely free-for-all");

sect("Anime Sketch");
r = resultOf(room("sketch", 3, { sketch: { phase: "over", players: [1, 2, 3], score: { p1: 300, p2: 450, p3: 300 } } }), null, NOW);
t(places(r) === "2:1 1:2 3:2", "classic and contest share the score table");

sect("Anime Card Vault (mode 9, built later)");
r = resultOf(room("cardvault", 3, { cv: { phase: "over", places: [{ p: 2, place: 1, life: 7 }, { p: 1, place: 2, life: 0 }, { p: 3, place: 2, life: 0 }] } }), null, NOW);
t(places(r) === "2:1 1:2 3:2", "elimination order with shared places");

sect("Firebase round trip");
r = resultOf(room("feud", 4, { feud: { phase: "over", teams: { A: [1, 2], B: [3, 4] }, score: { A: 3, B: 1 } } }), null, NOW);
const fbLike = JSON.parse(JSON.stringify(resultToDb(r)));
t(Object.keys(fbLike.scores).every(k => /^p\d$/.test(k)), "scores stored with p-keys (RTDB would turn 1,2,3 keys into an array)");
t(eq(resultFromDb(fbLike), r), "what the host stores is exactly what clients read back");
const asObj = o => Array.isArray(o) ? Object.fromEntries(o.map((v, i) => [i, asObj(v)])) : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, asObj(v)])) : o;
t(eq(resultFromDb(asObj(fbLike)), r), "also when arrays come back as objects");
t(placeRows([{ s: 5 }, { s: 5 }, { s: 5 }], (a, b) => a.s === b.s).every(x => x.place === 1), "a three-way tie is three firsts");

sect("storage layer");
let clock = 1700000000000;
const bank = createBank(memoryBackend(), { now: () => clock });
t(bank.coins() === VAULT.startCoins, "a new player starts with " + VAULT.startCoins + " coins");
let a = await bank.grant("g1", 40, "test");
t(a.ok && !a.dup && bank.coins() === 140, "grant");
a = await bank.grant("g1", 40, "test");
t(a.ok && a.dup && bank.coins() === 140, "the same grant again pays nothing");
const many = await Promise.all(Array.from({ length: 10 }, () => bank.grant("g2", 25, "test")));
t(bank.coins() === 165 && many.filter(x => !x.dup).length === 1, "10 simultaneous copies of one grant pay once");
a = await bank.spend("s1", 500, "test");
t(!a.ok && bank.coins() === 165 && !bank.has("s1"), "can't spend more than you have (and a refused spend can be retried)");
a = await bank.spend("s2", 65, "test");
t(a.ok && bank.coins() === 100, "spend");
const sp = await Promise.all([bank.spend("s3", 60, "t"), bank.spend("s4", 60, "t")]);
t(sp.filter(x => x.ok).length === 1 && bank.coins() === 40, "two spends racing for the same coins: only one goes through");
a = await bank.apply("roll1", "roll", w => { w.coins -= 10; return { seed: 12345, got: "x" }; });
t(a.ok && bank.ledger().some(l => l.op === "roll1" && l.seed === 12345 && l.d === -10 && l.bal === 30), "rolls log their seed, delta and balance in the ledger");
a = await bank.apply("roll1", "roll", w => { w.coins -= 10; return { seed: 99 }; });
t(a.dup && a.result.got === "x" && bank.coins() === 30, "a repeated roll returns the first result, no second charge");
a = await bank.apply("bad", "x", w => { w.coins = -5; });
t(!a.ok && bank.coins() === 30, "the balance can never go negative");
a = await bank.apply("boom", "x", () => { throw new Error("nope"); });
t(!a.ok && bank.coins() === 30, "a failing operation saves nothing");
clock += (VAULT.opsKeepDays + 1) * 86400000;
await bank.grant("later", 1, "t");
t(!bank.has("g1") && bank.has("later"), "old operation ids are pruned after " + VAULT.opsKeepDays + " days");
const be = memoryBackend(); const b1 = createBank(be, { now: () => clock }), b2 = createBank(be, { now: () => clock });
await b1.grant("x1", 10, "t"); await b2.grant("x1", 10, "t"); await b2.grant("x2", 5, "t");
t(b2.coins() === VAULT.startCoins + 15 && createBank(be).coins() === VAULT.startCoins + 15, "two tabs on one storage: each op once, always from the latest saved state");
t(migrate(null).coins === VAULT.startCoins && migrate({ v: 1, coins: 77.6, pity: { normal: 3 } }).coins === 78 && migrate({ v: 1, pity: { normal: 3 } }).pity.premium === 0, "migration fills missing parts, never invents coins");
t(eq(Object.keys(blankVault()).sort(), Object.keys(migrate({ v: 1 })).sort()), "every document has the full shape");

sect("seeded RNG");
const s1 = rngFrom(42), s2 = rngFrom(42), s3 = rngFrom(43);
const seqA = Array.from({ length: 5 }, s1), seqB = Array.from({ length: 5 }, s2), seqC = Array.from({ length: 5 }, s3);
t(eq(seqA, seqB) && !eq(seqA, seqC), "same seed, same rolls; another seed, other rolls");
t(seqA.every(x => x >= 0 && x < 1), "values in [0, 1)");
const gR = rngFrom(newSeed()), cnt = { a: 0, b: 0, c: 0 }; for (let i = 0; i < 100000; i++) cnt[pickWeighted(gR, { a: 60, b: 30, c: 10 })]++;
t(Math.abs(cnt.a / 1000 - 60) < 1.2 && Math.abs(cnt.b / 1000 - 30) < 1.2 && Math.abs(cnt.c / 1000 - 10) < 0.8, "weighted picks follow the odds: " + JSON.stringify(cnt));
t(eq(shuffleWith(rngFrom(7), [1, 2, 3, 4, 5]), shuffleWith(rngFrom(7), [1, 2, 3, 4, 5])), "seeded shuffle is replayable");
let lo = 1, hi = 0; const g2 = rngFrom(1); for (let i = 0; i < 1e5; i++) { const x = g2(); lo = Math.min(lo, x); hi = Math.max(hi, x); }
t(lo < 0.001 && hi > 0.999, "covers the whole range");

sect("coins per placement (A2)");
const P = (...pl) => pl.map((place, i) => ({ slot: i + 1, place }));
t(eq([1, 2, 3, 4, 5, 6, 7, 8].map(p => posValue(p, 8)), [40, 34, 28, 24, 20, 16, 13, 10]), "8 players: the table");
t(eq([1, 2, 3, 4].map(p => posValue(p, 4)), [40, 30, 20, 10]) && eq([1, 2].map(p => posValue(p, 2)), [40, 10]), "fewer players: an even spread 40 -> 10");
t(eq(placeValues(P(1, 2, 2, 4)), { 1: 40, 2: 25, 3: 25, 4: 10 }), "a tie shares the average of the places it covers");
t(eq(placeValues(P(1, 1, 1, 2, 2)), { 1: 32.5, 2: 32.5, 3: 32.5, 4: 13.75, 5: 13.75 }), "teams: 3 winners cover 1st-3rd, 2 losers 4th-5th");
const tt = placeValues(P(1, 1, 1, 1, 2, 2, 2, 2)); t(tt[1] === 31.5 && tt[5] === 14.75, "4v4: winners avg(40,34,28,24) = 31.5, losers avg(20,16,13,10) = 14.75");
t(eq(placeValues(P(1, 1)), { 1: 25, 2: 25 }), "a 1v1 draw: 25 each");
const res = (mode, pl, o = {}) => Object.assign({ key: mode + ":1", mode, players: pl.map((_, i) => ({ slot: i + 1, uid: "u" + (i + 1), name: "P" })), placements: P(...pl), duration: 600 }, o);
t(gameCoins(res("classic", [1, 2]), 1) === 30 && gameCoins(res("classic", [1, 2]), 2) === 8, "short game x0.75 (Guess Who win 30, loss 8)");
t(gameCoins(res("feud", [1, 2]), 1) === 60 && gameCoins(res("uno", [1, 2, 3]), 2) === 25, "long x1.5 (Feud win 60), medium x1");
t(!gameValid(res("uno", [1, 2], { players: [{ slot: 1, uid: "same" }, { slot: 2, uid: "same" }] })).ok, "one account twice is not 2 real players");
t(!gameValid(res("uno", [1, 2], { players: [{ slot: 1, uid: "u1" }, { slot: 2, uid: "" }] })).ok, "an unknown account doesn't count");
t(!gameValid(res("uno", [1, 2], { duration: EARN.minSeconds.medium - 1 })).ok && gameValid(res("uno", [1, 2], { duration: EARN.minSeconds.medium })).ok, "a game shorter than the minimum pays nothing");

sect("paying a game");
const T0 = new Date(2026, 10, 6, 12).getTime();
let w = blankVault(T0);
let g = applyGame(w, res("uno", [2, 1, 3, 4]), 2, T0, 77);
const mc = ms => ms.reduce((s, m) => s + m.coins, 0);
t(g.coins === 40 && w.coins === 140 + mc(g.missions) && w.earn.games === 40 && g.place === 1, "1st of 4 in UNO: +40 (+ any mission it finished)");
t(w.missions.day === dayKey(T0) && w.missions.list.length === 3 && w.missions.seed === 77, "the first game of the day rolls the missions (seed kept)");
t(w.missions.list.filter(m => m.kind === "fresh").length === 1 && new Set(w.missions.list.map(m => m.kind)).size === 3, "one 'try a mode' mission + two others, all different");
t(w.missions.list.every(m => !MISSIONS.pool.find(p => p.id === m.id && p.needs)), "no mission for parts of the Vault that don't exist yet (packs, decks...)");
t(Number(w.modes.uno) === T0, "the mode is marked as played");
const cBefore = w.coins; g = applyGame(w, res("uno", [1, 2], { duration: 20 }), 2, T0, 1);
t(g.coins === 0 && /too short/.test(g.why) && w.coins === cBefore && !g.missions.length, "too short: nothing, with the reason");
w = blankVault(T0); w.earn = { day: dayKey(T0), games: 590 };
g = applyGame(w, res("feud", [1, 2]), 1, T0, 5);
t(g.coins === 10 && g.raw === 60 && /cap/.test(g.why) && w.earn.games === 600, "the daily cap cuts the last game to fit (600)");
g = applyGame(w, res("feud", [1, 2]), 1, T0, 5);
t(g.coins === 0 && w.earn.games === 600, "then nothing more from games today");
g = applyGame(w, res("feud", [1, 2]), 1, T0 + 86400000, 5);
t(g.coins === 60 && w.earn.games === 60, "the cap resets the next day");
let total = 0; w = blankVault(T0); for (let i = 0; i < 40; i++) { const c0 = w.coins; applyGame(w, res("feud", [1, 2], { key: "k" + i }), 1, T0, i); total += w.coins - c0; }
t(w.earn.games === EARN.dailyGameCap, "40 wins in a day pay exactly the cap from games (" + w.earn.games + ")");

sect("missions");
w = blankVault(T0); ensureMissions(w, T0, 3);
const mx = w.missions.list.map(m => m.id).join();
t(!ensureMissions(w, T0 + 3600000, 999) && w.missions.list.map(m => m.id).join() === mx, "rolled once per day");
const w2 = blankVault(T0); ensureMissions(w2, T0, 3); t(w2.missions.list.map(m => m.id).join() === mx, "same seed, same missions (auditable)");
const fresh = w.missions.list.find(m => m.kind === "fresh");
t(fresh.modes.length >= 1 && fresh.modes.every(m => MODE_META[m] && m !== "cardvault"), "'try a mode' lists modes not played in 7 days (Card Vault once it exists)");
w = blankVault(T0); Object.keys(MODE_META).forEach(m => { w.modes[m] = T0 - 86400000; }); w.modes.imposter = T0 - 10 * 86400000; ensureMissions(w, T0, 4);
t(eq(w.missions.list.find(m => m.kind === "fresh").modes, ["imposter"]), "only Imposter is stale -> that's the one");
w = blankVault(T0); Object.keys(MODE_META).forEach((m, i) => { w.modes[m] = T0 - 3600000 * (i + 1); }); ensureMissions(w, T0, 4);
t(w.missions.list.find(m => m.kind === "fresh").modes.length === 1, "everything played this week: the least recently played mode");
const mis = id => Object.assign({}, id === "fresh" ? MISSIONS.fresh : MISSIONS.pool.find(m => m.id === id), { prog: 0, done: false });
w = blankVault(T0); w.missions = { day: dayKey(T0), list: [Object.assign(mis("fresh"), { modes: ["feud"] }), mis("play2"), mis("top3")] };
w.modes.feud = T0 - 30 * 86400000;
applyGame(w, res("uno", [3, 1, 2, 4]), 1, T0, 1);
t(!w.missions.list[0].done && w.missions.list[1].prog === 1 && w.missions.list[2].done, "UNO 3rd of 4: 'play 2' is 1/2, 'top 3 in a free-for-all' done");
const c0 = w.coins; g = applyGame(w, res("feud", [1, 2]), 1, T0, 1);
t(w.missions.list[0].done && w.missions.list[1].done && g.missions.length === 2 && w.coins === c0 + 60 + MISSIONS.fresh.coins + mis("play2").coins, "a Feud game finishes 'try a mode' and 'play 2'; mission coins come on top");
const c1 = w.coins; applyGame(w, res("feud", [1, 2]), 1, T0, 1);
t(w.coins - c1 === 60, "finished missions never pay twice");
w = blankVault(T0); w.missions = { day: dayKey(T0), list: [mis("top3"), mis("team1")] };
applyGame(w, res("feud", [1, 1, 1, 2, 2, 2], { teams: [{}] }), 1, T0, 1);
t(!w.missions.list[0].done && w.missions.list[1].done, "a team game counts for 'win a team game', not for 'top 3 free-for-all'");
w = blankVault(T0); w.missions = { day: dayKey(T0), list: [mis("squad4")] };
applyGame(w, res("classic", [1, 2]), 1, T0, 1); t(!w.missions.list[0].done, "a 1v1 isn't a 4+ player game");
w = blankVault(T0); w.missions = { day: dayKey(T0), list: [mis("play2")] };
applyGame(w, res("uno", [1, 2], { duration: 10 }), 1, T0, 1); t(w.missions.list[0].prog === 0, "a game too short to pay doesn't count for missions either");
t(missionEvent({ coins: 0, missions: { list: [mis("pack1")] } }, { pack: 1 }).length === 1, "pack / scratch / deck events can finish their missions (later phases)");

sect("daily login streak");
w = blankVault(T0); const days = Array.from({ length: 9 }, (_, i) => T0 + i * 86400000);
const got = days.map(d => claimDaily(w, d).coins);
t(eq(got, [30, 30, 40, 40, 50, 50, 100, 30, 30]), "30, 30, 40, 40, 50, 50, 100, then it repeats: " + got.join(","));
t(claimDaily(w, days[8] + 3600000).error && w.daily.streak === 9, "once per day");
t(loginState(w, days[8] + 2 * 86400000).lost && claimDaily(w, days[8] + 2 * 86400000).coins === 30 && w.daily.streak === 1, "a missed day resets the streak to day 1");
t(dayBefore("2026-03-01") === "2026-02-28" && dayBefore("2026-01-01") === "2025-12-31", "calendar days (month and year changes)");
const DST = new Date(2026, 2, 29, 0, 30).getTime(); t(dayBefore(dayKey(DST)) === "2026-03-28", "daylight-saving change");
const wb = createBank(memoryBackend(), { now: () => T0 });
const cl = await Promise.all([1, 2, 3].map(() => wb.apply("daily:" + dayKey(T0), "daily", (w, x) => claimDaily(w, x.now, x.log))));
t(wb.coins() === VAULT.startCoins + 30 && cl.filter(x => !x.dup).length === 1, "three claims at once (double click, two tabs) pay once");
t(wb.ledger().filter(l => l.kind === "daily").length === 1 && wb.ledger().some(l => l.kind === "daily" && l.d === 30), "logged once");
const gb = createBank(memoryBackend(), { now: () => T0 }), rr = res("uno", [1, 2]);
const two = await Promise.all([1, 2].map(() => gb.apply("game:ROOM:" + rr.key, "game", (w, x) => applyGame(w, rr, 1, x.now, 9, x.log))));
t(two.filter(x => x.dup).length === 1 && gb.coins() === VAULT.startCoins + 40 + mc(two.find(x => !x.dup).result.missions), "the same game reported twice (reload, reconnect) pays once");
t(nightPartyCoins(true, 4) === 140 && nightPartyCoins(false, 3) === 30, "Night Party hook: winner +100, +10 per stage");

console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
