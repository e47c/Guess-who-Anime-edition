// Anime TCG tests: node tools/vault-test.mjs
// Phase 1: the standard match result for every mode (from final room states), the storage layer (idempotent,
// atomic, never negative), the seeded RNG, the config. Phase 2: coins per placement, anti-farming, the daily
// cap, missions and the login streak.
import { resultOf, resultToDb, resultFromDb, placeRows, RESULT_MODES, battleResultOf } from "../js/vault/result.js";
import { createBank, memoryBackend, migrate, blankVault } from "../js/vault/store.js?v=12";
import { rngFrom, newSeed, pickWeighted, shuffleWith } from "../js/vault/rng.js?v=1";
import { MODE_META, EARN, PACKS, RARITY_ORDER, SKINS, DAILY_LOGIN, VAULT, MISSIONS } from "../js/vault/config.js?v=12";
import { posValue, placeValues, gameValid, gameCoins, applyGame, claimDaily, loginState, ensureMissions, missionEvent, dayKey, dayBefore, nightPartyCoins, nightPartyValid, applyNightParty, gameCoinsOn, FEATURES } from "../js/vault/economy.js?v=11";
import { SKIN_ITEMS, SCRATCH_ITEMS, itemById, buySkin, buyBundle, bundlePrice, grantCosmetic, rollScratch, equip, publicLook } from "../js/vault/shop.js?v=10";
import { rollPack, markOpened, unopened, owned, addCard, removeCard, grantStarter, saveDeck, deleteDeck, setActiveDeck, activeDeck, deckProblem, recordBattle, veteran, lockTrade, unlockTrade, applyTrade, tradeProblem, seriesDone, grantToken } from "../js/vault/packs.js?v=10";
import { CARDS, BY_SERIES, CARD_SERIES } from "../js/vault/carddb.js?v=4";
import { SCRATCH, SHARDS, DECK } from "../js/vault/config.js?v=12";

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
t(Object.values(MODE_META).every(m => m.min >= 2 && m.max >= m.min && m.max <= 8 && ["short", "medium", "long"].includes(m.length) && typeof m.teams === "boolean" && typeof m.ffa === "boolean" && typeof m.oneVone === "boolean" && typeof m.fast === "boolean" && (m.teams || m.ffa || m.oneVone)), "metadata: players, teams, FFA, 1v1, length, fast (every mode has a format)");
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

sect("ANIME TCG battles (one result per challenge, not per room match)");
r = resultOf(room("cardvault", 3, { cv: { phase: "over", places: [{ p: 2, place: 1, life: 7 }, { p: 1, place: 2, life: 0 }, { p: 3, place: 2, life: 0 }] } }), null, NOW);
t(places(r) === "2:1 1:2 3:2", "elimination order with shared places");
t(MODE_META.cardvault.name === "Anime TCG", "the ninth mode is called Anime TCG");
{
    const lobbyRoom = Object.assign({ status: "waiting", gameType: "cardvault" }, players(4));
    t(resultOf(lobbyRoom, null, NOW) === null, "the Vault lobby itself never reports a match");
    const node = { from: 3, to: [1], timer: 30, at: NOW - 200000, t0: NOW - 180000, end: NOW, uids: { p1: "u1", p3: "u3" },
        s: { phase: "over", players: [3, 1], names: { p1: "P1", p3: "P3" }, places: [{ p: 3, place: 1, life: 9 }, { p: 1, place: 2, life: 0 }] } };
    const br = battleResultOf(node, lobbyRoom, "bx1", NOW);
    t(br && br.key === "cardvault:bx1" && br.mode === "cardvault", "battle result keyed per battle id");
    t(places(br) === "3:1 1:2" && br.players.length === 2 && br.players.every(p => p.uid), "only the two duelists are in it, with their uids");
    t(br.duration === 180 && br.settings.cvFormat === "duel" && br.settings.cvTimer === 30 && !("cvPack" in br.settings), "duration from the battle's own start; its settings (no free-pack setting any more)");
    t(battleResultOf(Object.assign({}, node, { s: Object.assign({}, node.s, { phase: "pick" }) }), lobbyRoom, "bx1", NOW) === null, "no result while the battle runs");
    t(eq(resultFromDb(JSON.parse(JSON.stringify(resultToDb(br)))), br), "a battle result survives the Firebase round trip");
    const ffa = battleResultOf({ from: 1, to: [2, 4], t0: NOW - 90000, end: NOW, s: { phase: "over", players: [1, 2, 4], names: {}, places: [{ p: 4, place: 1, life: 3 }, { p: 1, place: 2, life: 0 }, { p: 2, place: 2, life: 0 }] } }, lobbyRoom, "bx2", NOW);
    t(ffa.settings.cvFormat === "ffa" && ffa.players.every(p => p.uid) && places(ffa) === "4:1 1:2 2:2", "free-for-all battle, uids taken from the room when the node has none");
    let w = blankVault(NOW);
    const pay = applyGame(w, br, 3, NOW, 7, null);
    t(pay.place === 1 && pay.coins === Math.round(40 * EARN.lengthMult.short), "the winner of a 3-minute duel is paid like any short game");
    w = blankVault(NOW); const quick = battleResultOf(Object.assign({}, node, { t0: NOW - 30000 }), lobbyRoom, "bx3", NOW);
    t(applyGame(w, quick, 3, NOW, 7, null).coins === Math.round(40 * EARN.lengthMult.short), "a 30-second battle pays like any other (no minimum length)");
}

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
t(gameValid(res("uno", [1, 2], { duration: 1 })).ok && gameValid(res("uno", [1, 2], { duration: 0 })).ok && !("minSeconds" in EARN), "no minimum length: a finished game pays however short (the config value is gone)");

sect("paying a game");
const T0 = new Date(2026, 10, 6, 12).getTime();
let w = blankVault(T0);
let g = applyGame(w, res("uno", [2, 1, 3, 4]), 2, T0, 77);
const mc = ms => ms.reduce((s, m) => s + m.coins, 0);
t(g.coins === 40 && w.coins === 140 + mc(g.missions) && g.place === 1, "1st of 4 in UNO: +40 (+ any mission it finished)");
t(w.missions.day === dayKey(T0) && w.missions.list.length === 3 && w.missions.seed === 77, "the first game of the day rolls the missions (seed kept)");
t(w.missions.list.filter(m => m.kind === "fresh").length === 1 && new Set(w.missions.list.map(m => m.kind)).size === 3, "one 'try a mode' mission + two others, all different");
t(w.missions.list.every(m => !MISSIONS.pool.find(p => p.id === m.id && p.needs)), "no mission for parts of the Vault that don't exist yet (packs, decks...)");
t(Number(w.modes.uno) === T0, "the mode is marked as played");
const cBefore = w.coins; g = applyGame(w, res("uno", [1, 2], { duration: 20 }), 2, T0, 1);
t(g.coins === 10 && !g.why && w.coins === cBefore + 10 + g.missions.reduce((s2, m) => s2 + m.coins, 0), "a 20-second game pays in full (2nd of 2: +10)");
t(applyGame(blankVault(T0), res("uno", [1, 2], { players: [{ slot: 1, uid: "u1" }, { slot: 2, uid: "u1" }] }), 1, T0, 1).coins === 0, "still: one real account playing alone pays nothing");
w = blankVault(T0); w.earn = { day: dayKey(T0), games: 590 };          // a save from before the cap was removed
g = applyGame(w, res("feud", [1, 2]), 1, T0, 5);
t(g.coins === 60 && g.raw === 60 && !g.why && !("earn" in w), "no daily cap: an old save's cap counter is ignored and dropped, the game pays in full");
w = blankVault(T0); const toLedger = x => w.ledger.push(Object.assign({ t: T0 }, x)); for (let i = 0; i < 40; i++) applyGame(w, res("feud", [1, 2], { key: "k" + i }), 1, T0, i, toLedger);
const fromGames = gameCoinsOn(w.ledger, dayKey(T0));
t(fromGames === 40 * 60 && !("earn" in blankVault(T0)), "no daily cap: 40 wins in one day pay all 40 games (" + fromGames + " coins from games)");
t(gameCoinsOn(w.ledger, dayKey(T0 + 86400000)) === 0, "coins from games today is a plain stat read from the ledger");
t(!("dailyGameCap" in EARN), "the cap's config value is gone");
t(!("earn" in migrate({ v: 1, coins: 75, earn: { day: dayKey(T0), games: 600 } }, T0)) && migrate({ v: 1, coins: 75, earn: {} }, T0).coins === 75, "an old save loads without the cap counter, coins intact");

sect("missions");
w = blankVault(T0); ensureMissions(w, T0, 3);
const mx = w.missions.list.map(m => m.id).join();
t(!ensureMissions(w, T0 + 3600000, 999) && w.missions.list.map(m => m.id).join() === mx, "rolled once per day");
const w2 = blankVault(T0); ensureMissions(w2, T0, 3); t(w2.missions.list.map(m => m.id).join() === mx, "same seed, same missions (auditable)");
const fresh = w.missions.list.find(m => m.kind === "fresh");
t(fresh.modes.length >= 1 && fresh.modes.every(m => MODE_META[m] && m !== "cardvault"), "'try a mode' lists modes not played in 7 days (Anime TCG excluded)");
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
applyGame(w, res("uno", [1, 2], { duration: 10 }), 1, T0, 1); t(w.missions.list[0].prog === 1, "a 10-second game counts for missions too");
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
t(nightPartyCoins(true, 4) === 140 && nightPartyCoins(false, 3) === 30, "Night Party: winner +100, +10 per stage played");
{
    const NPO = { won: true, stages: 6, players: 8, seconds: 3600 };
    let wv = blankVault(T0); const c0 = wv.coins; let o = applyNightParty(wv, NPO, T0, 9);
    t(o.coins === 160 && wv.coins === c0 + 160 + o.missions.reduce((s, m) => s + m.coins, 0), "Night Party winner of 6 stages: +160 (+ the mission if rolled)");
    wv = blankVault(T0); o = applyNightParty(wv, { won: false, stages: 5, players: 8, seconds: 3600 }, T0, 9); t(o.coins === 50, "a participant of 5 stages: +50");
    t(applyNightParty(blankVault(T0), { won: true, stages: 3, players: 1, seconds: 3600 }, T0, 9).coins === 0 && /2\+/.test(nightPartyValid({ players: 1, seconds: 9999, stages: 2 }).why), "one real player: nothing (anti-farming)");
    t(applyNightParty(blankVault(T0), { won: true, stages: 3, players: 4, seconds: 60 }, T0, 9).coins === 130, "a 1-minute tournament pays too (no minimum length)");
    t(applyNightParty(blankVault(T0), { won: false, stages: 0, players: 4, seconds: 3600 }, T0, 9).coins === 0, "no stage played: nothing");
    wv = blankVault(T0); wv.missions = { day: dayKey(T0), seed: 1, list: [Object.assign({}, MISSIONS.pool.find(m => m.id === "party1"), { prog: 0, done: false })] };
    o = applyNightParty(wv, NPO, T0, 9); t(o.missions.length === 1 && o.missions[0].id === "party1", "the 'Finish a Night Party' daily mission completes");
    t(MISSIONS.pool.some(m => m.id === "party1" && m.needs === "party"), "the Night Party mission is in the daily pool");
    let ww = blankVault(T0); ensureMissions(ww, T0, 1); const pool = new Set(); for (let s2 = 0; s2 < 300; s2++) { ww = blankVault(T0); FEATURES.add("party"); ensureMissions(ww, T0, s2); ww.missions.list.forEach(m => pool.add(m.id)); }
    t(pool.has("party1"), "it gets rolled once Night Party exists");
}

sect("shop: Season 1 skins");
const rich = () => Object.assign(blankVault(T0), { coins: 100000 });
t(SKIN_ITEMS.length === 22 && SKIN_ITEMS.some(i => i.name === "Iron Frame - Season 1") && SKIN_ITEMS.some(i => i.name === "Prismatic Background - Season 1"), "11 tiers x (Frame + Background), named like \"Iron Frame - Season 1\"");
t(eq(SKINS.tiers.map(x => x.price), [150, 250, 400, 600, 900, 1300, 1800, 2200, 2200, 2500, 3000]) && SKINS.tiers.every(x => Number(x.speed) > 0), "prices as specified; every tier has an animation speed (all frames and backgrounds animate)");
t(SKIN_ITEMS.filter(i => i.kind === "frame").every(i => / Frame - Season 1$/.test(i.name)) && SKIN_ITEMS.filter(i => i.kind === "bg").every(i => / Background - Season 1$/.test(i.name)), "names: \"Iron Frame - Season 1\", \"Iron Background - Season 1\"");
w = Object.assign(blankVault(T0), { coins: 200 });
let sres = buySkin(w, "sf_iron");
t(!sres.error && w.coins === 50 && w.inv.sf_iron === 1, "buy the Iron Frame: -150");
t(buySkin(w, "sf_iron").error && w.coins === 50, "can't buy it twice");
t(buySkin(w, "bg_bronze").error && w.coins === 50, "can't buy what you can't afford");
t(bundlePrice("iron") === 240 && bundlePrice("prismatic") === 4800, "bundle = 20% off both (Iron 240, Prismatic 4800)");
w = rich(); t(!buyBundle(w, "gold").error && w.coins === 100000 - 960 && w.inv.sf_gold && w.inv.bg_gold, "the Gold bundle gives both for 960");
w = rich(); buySkin(w, "sf_gold"); t(buyBundle(w, "gold").error, "no bundle when you already own one part");
SKINS.earnOnly.push("diamond"); w = rich(); t(buySkin(w, "sf_diamond").error && buyBundle(w, "diamond").error, "earn-only skins can't be bought"); SKINS.earnOnly.pop();
w = rich(); buySkin(w, "sf_flame"); const c0s = w.coins; const dupR = grantCosmetic(w, "sf_flame");
t(dupR.dup && w.coins - c0s === 1100, "a duplicate cosmetic (any future source) refunds 50% of its price");
t(equip(w, "sf", "sf_flame").slot === "sf" && publicLook(w).sf === "flame" && equip(w, "bg", "bg_flame").error, "equip what you own, not what you don't");
w.inv.sf_flame = 0; t(publicLook(w).sf === "", "the public look never shows something not owned");

sect("scratch cards");
w = Object.assign(blankVault(T0), { coins: 60 });
let sc = rollScratch(w, "basic", 1234);
t(!sc.error && w.coins === (sc.dup ? SCRATCH.dupRefund[sc.rarity] : 0) && w.inv[sc.item] === 1, "Basic costs 60; the prize is in the inventory before any scratching");
const scA = rollScratch(Object.assign(blankVault(T0), { coins: 999 }), "gold", 77), scB = rollScratch(Object.assign(blankVault(T0), { coins: 999 }), "gold", 77);
t(eq(scA, scB), "same seed, same prize (auditable)");
t(rollScratch(Object.assign(blankVault(T0), { coins: 10 }), "silver", 1).error, "not enough coins: nothing happens");
const cnt2 = { common: 0, rare: 0, epic: 0, legendary: 0 }, kinds = {};
for (let i = 0; i < 6000; i++) { const r2 = rollScratch(Object.assign(blankVault(T0), { coins: 999 }), "gold", 1000 + i); cnt2[r2.rarity]++; kinds[r2.kind] = (kinds[r2.kind] || 0) + 1; }
t(cnt2.common === 0 && Math.abs(cnt2.legendary / 6000 - .15) < .02 && Math.abs(cnt2.epic / 6000 - .40) < .025, "Gold: no commons, 15% legendary, 40% epic (" + JSON.stringify(cnt2) + ")");
t(kinds.title && kinds.tskin && kinds.ucol, "Gold gives titles, title skins and username styles");
const basicKinds = new Set(); for (let i = 0; i < 400; i++) basicKinds.add(rollScratch(Object.assign(blankVault(T0), { coins: 999 }), "basic", i).kind);
t(!basicKinds.has("tskin"), "Basic gives titles and username colours (no title skins)");
w = Object.assign(blankVault(T0), { coins: 99999 }); let dupSeen = 0;
for (let i = 0; i < 300; i++) { const before = w.coins; const r2 = rollScratch(w, "basic", i); if (r2.dup) { dupSeen++; if (w.coins - before !== -60 + SCRATCH.dupRefund[r2.rarity]) { dupSeen = -999; break; } } }
t(dupSeen > 0, "duplicates refund by rarity (Common 20, Rare 60, Epic 150, Legendary 400)");
t(new Set(SCRATCH_ITEMS.map(i => i.id)).size === SCRATCH_ITEMS.length, "every scratch reward is unique");

sect("packs");
const S = "naruto";
w = Object.assign(blankVault(T0), { coins: 1000 });
let pr = rollPack(w, { series: S, kind: "normal", seed: 5, by: "Ann", now: T0 });
t(!pr.error && w.coins === 850 && pr.cards.length === 5 && pr.cards.every(c => CARDS[c.id].s === S), "Normal: 150 coins, 5 cards, all from its own series");
t(pr.cards.every((c, i) => !i || pr.cards[i - 1].r <= c.r), "revealed lowest rarity first, best last");
t(unopened(w).length === 1 && unopened(w)[0].seed === 5, "the rolled pack waits as 'unopened' until the reveal is done (a reload can't re-roll)");
markOpened(w, 5); t(unopened(w).length === 0, "...then it's marked opened");
t(pr.cards.filter(c => c.isNew).every(c => owned(w, c.id) && w.cards[c.id].by === "Ann" && w.cards[c.id].at === T0), "new cards are in the collection with a 'first pulled by' stamp");
w = Object.assign(blankVault(T0), { coins: 400 });
pr = rollPack(w, { series: S, kind: "premium", seed: 9 }); t(pr.cards.length === 6 && w.coins === 0, "Premium: 400 coins, 6 cards");
const eqP = rollPack(Object.assign(blankVault(T0), { coins: 999 }), { series: "jjk", kind: "premium", seed: 42 }), eqQ = rollPack(Object.assign(blankVault(T0), { coins: 999 }), { series: "jjk", kind: "premium", seed: 42 });
t(eq(eqP.cards, eqQ.cards), "same seed, same pack (auditable)");
let premOk = true; for (let i = 0; i < 4000; i++) { const r2 = rollPack(Object.assign(blankVault(T0), { coins: 999 }), { series: CARD_SERIES[i % 18], kind: "premium", seed: i + 1 }); if (!r2.cards.some(c => c.r >= 2)) premOk = false; }
t(premOk, "every Premium pack has a Rare or better (4000 packs)");
const dist = Array(7).fill(0); let holo = 0, N2 = 0;
for (let i = 0; i < 20000; i++) { const r2 = rollPack(Object.assign(blankVault(T0), { coins: 999 }), { series: CARD_SERIES[i % 18], kind: "normal", seed: 7e6 + i }); r2.cards.forEach(c => { dist[c.r]++; holo += c.h; N2++; }); }
const pct = dist.map(n => n / N2 * 100), want = [60, 25, 10, 3.5, 1, .4, .1];
t(pct.every((p, i) => Math.abs(p - want[i]) < Math.max(.5, want[i] * .08)), "Normal odds per card match the spec: " + pct.map(p => p.toFixed(2)).join(" / "));
t(Math.abs(holo / N2 - .08) < .005, "Holo 8% per card in Normal packs (" + (holo / N2 * 100).toFixed(2) + "%)");
// pity: 19 Normal packs in a row without an Ultra Rare+, then the 20th must have one
w = Object.assign(blankVault(T0), { coins: 1e6 }); w.pity = { normal: 19, premium: 0 };
let forced = 0; for (let i = 0; i < 300; i++) { const ww = Object.assign(blankVault(T0), { coins: 999, pity: { normal: 19, premium: 0 } }); const r2 = rollPack(ww, { series: "bleach", kind: "normal", seed: 9e5 + i }); if (!r2.cards.some(c => c.r >= 3)) forced = -999; if (r2.pity) forced++; if (ww.pity.normal !== 0) forced = -999; }
t(forced > 200, "Normal pity: the 20th pack without an Ultra Rare+ always has one, and the counter resets (" + forced + "/300 needed the pity)");
let pre = 0; for (let i = 0; i < 300; i++) { const ww = Object.assign(blankVault(T0), { coins: 999, pity: { normal: 0, premium: 29 } }); const r2 = rollPack(ww, { series: "aot", kind: "premium", seed: 8e5 + i }); if (r2.cards.some(c => c.r >= 5)) pre++; }
t(pre === 300, "Premium pity: the 30th pack without a Legendary+ always has one");
w = Object.assign(blankVault(T0), { coins: 999 }); for (let i = 0; i < 5; i++) w.pity.normal = 0;
let cntP = 0, hits = 0; for (let i = 0; i < 2000; i++) { const before = w.pity.normal; const r2 = rollPack(Object.assign(w, { coins: 999 }), { series: "hxh", kind: "normal", seed: 3e6 + i }); if (r2.cards.some(c => c.r >= 3)) { hits++; if (w.pity.normal !== 0) cntP = -999; } else if (w.pity.normal !== before + 1) cntP = -999; }
t(cntP === 0 && hits > 0, "the counter counts packs without one and resets when it appears");
// duplicates -> shards
w = blankVault(T0); const anyId = BY_SERIES.onepiece[0];
addCard(w, anyId, false, "A", T0); let a2 = addCard(w, anyId, false, "A", T0);
t(!a2.isNew && a2.shards === SHARDS[CARDS[anyId].rk] && w.shards === a2.shards, "a duplicate becomes shards (" + CARDS[anyId].rk + " " + a2.shards + ")");
a2 = addCard(w, anyId, true, "A", T0); t(a2.newHolo && w.cards[anyId].h === 1 && w.shards === SHARDS[CARDS[anyId].rk], "the first Holo copy of an owned card is kept");
a2 = addCard(w, anyId, true, "A", T0); t(a2.shards === SHARDS[CARDS[anyId].rk] * 2, "a Holo duplicate gives double shards");
w = Object.assign(blankVault(T0), { coins: 0, shards: 100 });
pr = rollPack(w, { series: "mha", kind: "normal", seed: 3, via: "shards" }); t(!pr.error && w.shards === 0 && pr.cards.length === 5, "100 shards craft a Normal pack of any series");
t(rollPack(w, { series: "mha", kind: "premium", seed: 3, via: "shards" }).error, "a Premium pack needs 250 shards");
w = blankVault(T0); grantToken(w, "normal", 1); pr = rollPack(w, { series: "frieren", kind: "normal", seed: 4, via: "token" });
t(!pr.error && w.tokens.normal === 0 && w.coins === VAULT.startCoins, "a free pack token opens a Normal pack of any series");
w = blankVault(T0); BY_SERIES.windbreaker.slice(0, -1).forEach(id => addCard(w, id, false, "A", 0)); const last = BY_SERIES.windbreaker.slice(-1)[0];
t(!seriesDone(w, "windbreaker"), "a series is complete only with every card");
w.coins = 99999; for (let i = 0; i < 4000 && !seriesDone(w, "windbreaker"); i++) rollPack(w, { series: "windbreaker", kind: "premium", seed: 6e6 + i });
t(seriesDone(w, "windbreaker") && w.inv.sl_windbreaker === 1, "completing a series unlocks its card sleeve");

sect("starter deck and decks");
w = blankVault(T0); const st0 = grantStarter(w, 11, "Starter deck", T0);
const sc0 = st0.cards.map(id => CARDS[id]);
t(st0.cards.length === 10 && sc0.every(c => c.r <= 1) && new Set(sc0.map(c => c.s)).size >= 5 && new Set(sc0.map(c => c.a)).size === 7, "10 Common/Uncommon cards from 5+ series, all 7 archetypes");
t(activeDeck(w).id === "starter" && !deckProblem(w, activeDeck(w).cards), "it's saved as the active deck, ready to battle");
t(grantStarter(w, 12).error && w.decks.length === 1, "only once");
t(w.coins === VAULT.startCoins && VAULT.startCoins === 100, "plus the 100 starting coins");
t(saveDeck(w, { name: "x", cards: st0.cards.slice(0, 9) }).error && saveDeck(w, { name: "x", cards: st0.cards.slice(0, 9).concat([st0.cards[0]]) }).error, "exactly 10 different cards");
const notMine = Object.keys(CARDS).map(Number).find(id => !owned(w, id));
t(/don't own/.test(saveDeck(w, { name: "x", cards: st0.cards.slice(0, 9).concat([notMine]) }).error), "only cards you own");
const sd = saveDeck(w, { name: "Second", cards: st0.cards.slice().reverse() });
t(!sd.error && w.decks.length === 2 && !setActiveDeck(w, sd.deck.id).error && activeDeck(w).name === "Second", "save more decks, pick the active one");
deleteDeck(w, sd.deck.id); t(w.decks.length === 1 && activeDeck(w).id === "starter", "delete a deck: the active one falls back");
for (let i = 0; i < DECK.maxDecks; i++) saveDeck(w, { name: "D" + i, cards: st0.cards });
t(w.decks.length === DECK.maxDecks && saveDeck(w, { name: "one too many", cards: st0.cards }).error, "up to " + DECK.maxDecks + " decks");
for (let i = 0; i < 9; i++) recordBattle(w, [st0.cards[0]], true);
t(!veteran(w, st0.cards[0]), "9 wins: not a veteran yet"); recordBattle(w, [st0.cards[0], st0.cards[0]], true); t(veteran(w, st0.cards[0]) && w.battles.w === 10, "10 winning battles: the Veteran mark");
recordBattle(w, [st0.cards[1]], false); t(!veteran(w, st0.cards[1]) && w.battles.p === 11, "losses count as played only");

sect("trades (cards only)");
const A0 = blankVault(T0), B0 = blankVault(T0);
const ca = BY_SERIES.jojo[0], cb = BY_SERIES.jojo[1], cc = BY_SERIES.jojo[2];
addCard(A0, ca, false, "A", 1); addCard(A0, cc, false, "A", 1); addCard(B0, cb, false, "B", 2); addCard(B0, cc, true, "B", 2);
t(!lockTrade(A0, "t1", [{ id: ca, h: 0 }]).error && /another offer/.test(lockTrade(A0, "t2", [{ id: ca, h: 0 }]).error), "a card in an open offer can't be offered twice");
t(/don't have/.test(tradeProblem(A0, [{ id: cb, h: 0 }])), "you can only give what you have");
t(!lockTrade(B0, "t1", [{ id: cb, h: 0 }, { id: cc, h: 1 }]).error, "the other side locks what was asked for when accepting");
const ra = applyTrade(A0, "t1", [{ id: ca, h: 0 }], [{ id: cb, h: 0 }, { id: cc, h: 1 }], "B (trade)", 5);
const rb = applyTrade(B0, "t1", [{ id: cb, h: 0 }, { id: cc, h: 1 }], [{ id: ca, h: 0 }], "A (trade)", 5);
t(!ra.error && !rb.error && owned(A0, cb) && !owned(A0, ca) && A0.cards[cc].h === 1 && owned(B0, ca) && !owned(B0, cb) && !owned(B0, cc), "both sides swap exactly what was agreed (Holo stays Holo)");
t(!A0.locks.t1 && !B0.locks.t1, "the locks are released");
const A1 = blankVault(T0); addCard(A1, ca, false, "A", 1); lockTrade(A1, "t3", []); const r3 = applyTrade(A1, "t3", [], [{ id: ca, h: 0 }], "B", 1);
t(r3.shards === SHARDS[CARDS[ca].rk] && A1.shards === r3.shards, "receiving a card you already own gives shards");
const A2 = blankVault(T0); grantStarter(A2, 3, "S", 0); const gone = A2.decks[0].cards[0]; removeCard(A2, gone, false);
t(A2.decks[0].bad === 1 && deckProblem(A2, A2.decks[0].cards), "trading away a deck card flags the deck until it's fixed");
const A3 = blankVault(T0); addCard(A3, ca, false, "A", 1); lockTrade(A3, "t4", [{ id: ca, h: 0 }]); unlockTrade(A3, "t4");
t(!A3.locks.t4 && owned(A3, ca), "a declined / cancelled offer just unlocks");
t(!SKIN_ITEMS.some(i => i.kind === "card") && typeof itemById("sf_gold").price === "number", "cosmetics are never part of a trade (trades only carry card ids)");

console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
