// Arcade Vault phase 1 tests: node tools/vault-test.mjs
// The standard match result for every mode (from final room states), the storage layer (idempotent, atomic,
// never negative), the seeded RNG, and that the config covers every mode.
import { resultOf, resultToDb, resultFromDb, placeRows, RESULT_MODES } from "../js/vault/result.js";
import { createBank, memoryBackend, migrate, blankVault } from "../js/vault/store.js";
import { rngFrom, newSeed, pickWeighted, shuffleWith } from "../js/vault/rng.js";
import { MODE_META, EARN, PACKS, RARITY_ORDER, SKINS, DAILY_LOGIN, VAULT } from "../js/vault/config.js";

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
const g = rngFrom(newSeed()), cnt = { a: 0, b: 0, c: 0 }; for (let i = 0; i < 100000; i++) cnt[pickWeighted(g, { a: 60, b: 30, c: 10 })]++;
t(Math.abs(cnt.a / 1000 - 60) < 1.2 && Math.abs(cnt.b / 1000 - 30) < 1.2 && Math.abs(cnt.c / 1000 - 10) < 0.8, "weighted picks follow the odds: " + JSON.stringify(cnt));
t(eq(shuffleWith(rngFrom(7), [1, 2, 3, 4, 5]), shuffleWith(rngFrom(7), [1, 2, 3, 4, 5])), "seeded shuffle is replayable");
let lo = 1, hi = 0; const g2 = rngFrom(1); for (let i = 0; i < 1e5; i++) { const x = g2(); lo = Math.min(lo, x); hi = Math.max(hi, x); }
t(lo < 0.001 && hi > 0.999, "covers the whole range");

console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
