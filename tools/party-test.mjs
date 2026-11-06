/* Night Party unit tests: node tools/party-test.mjs
   Phase 1: the stage registry (metadata, settings schema, formats, fits, team patches) and its match with the
   standard result every mode reports. */
import { MODE_META } from "../js/vault/config.js?v=8";
import { RESULT_MODES, RESULT_SETTINGS } from "../js/vault/result.js?v=4";
import { basePoints, sharePoints, stagePoints, teamPlacements, adjustPlacements, standings, topTied, leadGap, lateStart, seedOrder, splitTeams, seedSlots, makeBracket, normBracket, nextMatch, recordWin, bracketDone, matchesLeft, bracketPlacements, sdWinners } from "../js/party/scoring.js?v=1";
import { STAGE_SETTINGS, registerStage, stageIds, stageMeta, fastStages, normalizeSettings, defaultSettings, formatOf, stageFits, teamPatch, estMinutes, estTotal } from "../js/party/stages.js?v=3";
import { NIGHT_PARTY } from "../js/party/config.js?v=1";

let pass = 0, fail = 0;
const t = (ok, name) => { if (ok) pass++; else { fail++; console.log("  FAIL  " + name); } };
const sect = s => console.log("• " + s);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

sect("registry");
const modes = Object.keys(MODE_META).filter(m => MODE_META[m].stage !== false);
t(eq(stageIds().sort(), modes.slice().sort()), "every mode except Anime TCG is a stage (" + stageIds().join(", ") + ")");
t(!stageMeta("cardvault") && MODE_META.cardvault.stage === false, "Anime TCG battles are not a stage yet");
t(stageIds().every(id => RESULT_MODES.includes(id)), "every stage reports the standard result");
t(stageIds().every(id => { const m = stageMeta(id); return m.min >= 2 && m.max <= 8 && m.min <= m.max && ["short", "medium", "long"].includes(m.length) && (m.teams || m.ffa || m.oneVone); }), "every stage has players, a length and at least one format");
t(eq(fastStages().sort(), ["classic", "likely"]), "fast stages (tiebreaker pool): Guess Who and Most Likely");
let threw = false; try { registerStage("broken", { name: "Broken" }); } catch (e) { threw = /missing/.test(e.message); }
t(threw && !stageMeta("broken"), "registering a stage without its metadata is refused");
const cv = registerStage("cvtest", { name: "Card Battle", min: 2, max: 2, oneVone: true, length: "short", fast: true, settings: { cvTimer: { choices: [20, 30, 45], def: 30 } } });
t(stageMeta("cvtest") === cv && formatOf("cvtest", {}) === "duel" && stageFits("cvtest", {}, 8).ok && fastStages().includes("cvtest"), "a later stage (e.g. card battles) plugs in with one registerStage call");

sect("settings schema = the lobby keys");
t(stageIds().filter(id => id !== "cvtest").every(id => eq(Object.keys(STAGE_SETTINGS[id]).sort(), RESULT_SETTINGS[id].slice().sort())), "each stage's settings are exactly the keys its result reports");
t(stageIds().every(id => { const s = defaultSettings(id); return Object.entries(stageMeta(id).settings).every(([k, f]) => f.series ? Array.isArray(s[k]) && s[k].length : f.choices.includes(s[k])); }), "defaults are valid choices");
let n = normalizeSettings("headbanz", { rounds: "7", difficulty: "insane", animes: ["naruto", "naruto", "bleach"], junk: 1 });
t(eq(n, { animes: ["naruto", "bleach"], difficulty: "normal", rounds: 7 }), "normalise: string numbers become the choice, bad values the default, duplicates and unknown keys dropped");
n = normalizeSettings("sketch", { sketchMode: 1, sketchRounds: 99, sketchTimer: 60 });
t(n.sketchMode === 1 && n.sketchRounds === STAGE_SETTINGS.sketch.sketchRounds.def && n.sketchTimer === 60 && eq(n.animes, ["onepiece"]), "normalise: Sketch Contest kept, an impossible round count falls back");
t(eq(normalizeSettings("likely", { animes: { 0: "jjk", 1: "aot" } }).animes, ["jjk", "aot"]), "series stored by Firebase as an object still read as a list");
t(normalizeSettings("nope", {}) === null, "unknown mode -> null");

sect("formats");
t(formatOf("classic", {}) === "duel", "Guess Who: 1v1 duel (bracket)");
t(["headbanz", "imposter", "uno", "sketch"].every(id => formatOf(id, {}) === "ffa"), "Headbanz, Imposter, UNO, Sketch: everyone in one match");
t(formatOf("feud", {}) === "teams", "Anime Feud: teams");
t(formatOf("likely", { likelyPlay: "ffa" }) === "ffa" && formatOf("likely", {}) === "teams", "Most Likely: FFA or teams, by its setting");
t(formatOf("draft", { draftType: "auction" }) === "ffa" && formatOf("draft", { draftType: "build" }) === "teams", "Anime Draft: Auction FFA, Build teams");

sect("fits a player count");
t(!stageFits("imposter", {}, 2).ok && stageFits("imposter", {}, 3).ok, "Imposter needs 3+");
t([2, 3, 5, 8].every(k => stageFits("classic", {}, k).ok), "Guess Who runs as a bracket for 2-8 players");
t(!stageFits("draft", { draftType: "build", draftFmt: 1 }, 8).ok && /4v4/.test(stageFits("draft", { draftType: "build", draftFmt: 1 }, 8).why), "Draft Build 1v1 with 8 is blocked (6 would sit out), and says to pick 4v4");
t(stageFits("draft", { draftType: "build", draftFmt: 4 }, 8).ok && stageFits("draft", { draftType: "build", draftFmt: 1 }, 2).ok && stageFits("draft", { draftType: "auction" }, 8).ok, "Draft Build with N = players / 2, or Auction, fits");
t(!stageFits("draft", { draftType: "build", draftFmt: 3 }, 5).ok && /even/.test(stageFits("draft", { draftType: "build", draftFmt: 3 }, 5).why) && !stageFits("draft", { draftType: "build", draftFmt: 4 }, 6).ok && stageFits("draft", { draftType: "auction" }, 5).ok, "Draft Build with an odd count or a too-big N is blocked (it seats exactly N per side); Auction takes 5");
t(stageIds().filter(id => id !== "cvtest").every(id => stageFits(id, id === "draft" ? { draftFmt: 4 } : {}, 8).ok), "every stage fits 8 players (Draft at 4v4)");
t(!stageFits("uno", {}, 1).ok, "one player is never a stage");

sect("team splits");
t(eq(teamPatch("draft", { A: [1, 2], B: [3] }), { key: "draftSides", map: { p1: "L", p2: "L", p3: "R" } }), "Draft: sides L / R");
t(eq(teamPatch("feud", { A: [4], B: [1, 2] }), { key: "feudTeams", map: { p4: "A", p1: "B", p2: "B" } }), "Anime Feud: teams A / B");
t(teamPatch("likely", { A: [1], B: [2] }).key === "likelyTeams", "Most Likely: likelyTeams");
t(teamPatch("uno", { A: [1], B: [2] }) === null && teamPatch("feud", null) === null, "no team split for an FFA mode, or when none is given");


/* ================= Phase 2: data model + scoring ================= */
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;
const P = (...ids) => ids.map((id, i) => ({ id, place: i + 1 }));

sect("base points (2-8 players)");
t([10, 9, 7, 6, 5, 4, 2, 1].every((v, i) => Math.round(basePoints(i + 1, 8)) === v), "8 players display 10, 9, 7, 6, 5, 4, 2, 1");
t(near(basePoints(2, 8), 10 - 9 / 7) && near(basePoints(7, 8), 10 - 54 / 7), "exact values are kept (2nd = 8.714..., 7th = 2.285...)");
t([2, 3, 4, 5, 6, 7, 8].every(n => near(basePoints(1, n), 10) && near(basePoints(n, n), 1)), "for every 2-8 players: 1st gets 10, last gets 1 (never 0)");
t([2, 3, 4, 5, 6, 7, 8].every(n => { for (let p = 1; p < n; p++) if (!(basePoints(p, n) > basePoints(p + 1, n))) return false; return true; }), "strictly decreasing for every size");
t(near(basePoints(2, 3), 5.5) && near(basePoints(2, 4), 7) && near(basePoints(3, 4), 4), "3 players: 10, 5.5, 1; 4 players: 10, 7, 4, 1");
t(basePoints(1, 1) === 10, "a single player gets the top value");

sect("ties share the places they cover");
let sp = sharePoints([{ id: "a", place: 1 }, { id: "b", place: 1 }, { id: "c", place: 3 }, { id: "d", place: 4 }]);
t(near(sp.a, 8.5) && near(sp.b, 8.5) && near(sp.c, 4) && near(sp.d, 1), "4 players, a tie for 1st: (10 + 7) / 2 = 8.5 each, then 4, 1");
sp = sharePoints(P("a", "b", "c", "d", "e", "f", "g", "h").map(p => ({ id: p.id, place: 1 })));
t(Object.values(sp).every(v => near(v, 5.5)), "everyone tied (8): 5.5 each");
sp = sharePoints([{ id: "a", place: 1 }, { id: "b", place: 2 }, { id: "c", place: 2 }, { id: "d", place: 2 }, { id: "e", place: 5 }]);
t(near(sp.b, (basePoints(2, 5) + basePoints(3, 5) + basePoints(4, 5)) / 3) && near(sp.e, 1), "a 3-way tie for 2nd of 5 averages positions 2-4");
const tot = o => Object.values(o).reduce((s, v) => s + v, 0);
t([2, 3, 5, 8].every(n => near(tot(sharePoints(Array.from({ length: n }, (_, i) => ({ id: "p" + i, place: 1 + (i >> 1) * 2 })))), tot(sharePoints(Array.from({ length: n }, (_, i) => ({ id: "p" + i, place: i + 1 })))))), "ties never create or destroy points (same total as no tie)");

sect("weights");
let wp = stagePoints(P("a", "b"), 2); t(near(wp.a, 20) && near(wp.b, 2), "x2: 20 / 2");
wp = stagePoints(P("a", "b", "c"), 1.5); t(near(wp.b, 8.25), "x1.5: 5.5 -> 8.25");
wp = stagePoints(P("a", "b"), 0); t(wp.a === 0 && wp.b === 0, "x0 (sudden death rounds) adds nothing");
wp = stagePoints(P("a", "b", "c", "d"), 2.5); t(near(wp.c, 10), "custom x2.5: 4 -> 10");

sect("team expansion");
let tp = sharePoints(teamPlacements([{ ids: ["a", "b", "c", "d"], place: 1 }, { ids: ["e", "f", "g", "h"], place: 2 }]));
const avg = (n, from, to) => { let s = 0; for (let k = from; k <= to; k++) s += basePoints(k, n); return s / (to - from + 1); };
t(near(tp.a, avg(8, 1, 4)) && near(tp.h, avg(8, 5, 8)) && Math.round(tp.a) === 8 && Math.round(tp.e) === 3, "4v4: winners ~" + tp.a.toFixed(2) + " each, losers ~" + tp.e.toFixed(2) + " (about 8 / about 3)");
tp = sharePoints(teamPlacements([1, 2, 3, 4].map(k => ({ ids: ["t" + k + "a", "t" + k + "b"], place: k }))));
t([9.5, 6.5, 4.5, 1.5].every((v, k) => Math.abs(tp["t" + (k + 1) + "a"] - v) < .35 && tp["t" + (k + 1) + "a"] === tp["t" + (k + 1) + "b"]), "four teams of 2 among 8: about 9.5 / 6.5 / 4.5 / 1.5 (" + [1, 2, 3, 4].map(k => tp["t" + k + "a"].toFixed(2)).join(" / ") + "), exact values");
tp = sharePoints(teamPlacements([{ ids: ["a", "b"], place: 1 }, { ids: ["c", "d"], place: 2 }]));
t(near(tp.a, 8.5) && near(tp.d, 2.5), "2v2 among 4: 8.5 / 2.5");
tp = sharePoints(teamPlacements([{ ids: ["a", "b", "c"], place: 1 }, { ids: ["d", "e"], place: 2 }]));
t(near(tp.a, avg(5, 1, 3)) && near(tp.e, avg(5, 4, 5)), "uneven teams 3v2: the 3 cover positions 1-3, the 2 cover 4-5");
tp = sharePoints(teamPlacements([{ ids: ["a", "b"], place: 1 }, { ids: ["c", "d"], place: 1 }]));
t(Object.values(tp).every(v => near(v, 5.5)), "two teams tied: everyone 5.5");

sect("leavers and dropped players");
let ad = adjustPlacements(P("a", "b", "c", "d"), { remove: ["b"] });
t(JSON.stringify(ad) === JSON.stringify([{ id: "a", place: 1 }, { id: "c", place: 2 }, { id: "d", place: 3 }]), "a player who left is removed; the rest are scored as 3 players");
ad = adjustPlacements(P("a", "b", "c", "d"), { last: ["a"] });
t(ad.find(p => p.id === "a").place === 4 && ad.find(p => p.id === "b").place === 1, "a player offline too long is scored last");
ad = adjustPlacements(P("a", "b", "c", "d"), { last: ["a", "b"] });
t(ad.filter(p => p.place === 3).length === 2, "two dropped players tie for last");
ad = adjustPlacements([{ id: "a", place: 1 }, { id: "b", place: 1 }, { id: "c", place: 3 }], { remove: ["c"] });
t(ad.every(p => p.place === 1), "ties survive the adjustment");

sect("standings: recomputed from the stored stage results");
const roster = { a: { start: 0 }, b: { start: 0 }, c: { start: 0 }, d: { start: 0 } };
const results = { 0: { weight: 1, placements: P("a", "b", "c", "d") }, 1: { weight: 2, placements: P("d", "c", "b", "a") } };
let rows = standings(roster, results, 3);
const row = id => rows.find(r => r.id === id);
t(near(row("a").pool, 12) && near(row("d").pool, 21) && near(row("b").pool, 15) && near(row("c").pool, 18), "pools: a 10+2, b 7+8, c 4+14, d 1+20");
t(rows[0].id === "d" && rows[0].rank === 1 && rows.map(r => r.rank).join() === "1,2,3,4", "ranked by pool");
t(row("d").last === 20 && row("d").gains[0] === 1 && row("d").gains[2] === null && row("a").played === 2, "gains per stage, last-stage gain, stages played");
const again = standings(JSON.parse(JSON.stringify(roster)), JSON.parse(JSON.stringify(results)), 3);
t(JSON.stringify(again) === JSON.stringify(rows), "recomputing from the stored list gives the same standings (Firebase round trip)");
rows = standings(roster, { 0: { weight: 1, placements: [{ id: "a", place: 1 }, { id: "b", place: 1 }, { id: "c", place: 3 }, { id: "d", place: 4 }] } }, 1);
t(rows[0].rank === 1 && rows[1].rank === 1 && rows[0].tied && rows[1].tied && !rows[2].tied && rows[2].rank === 3, "a tie on exact values shares the rank (T1, T1, 3)");
t(JSON.stringify(topTied(rows).sort()) === '["a","b"]', "topTied: a and b -> sudden death");
rows = standings({ a: { start: 0 }, b: { start: 0, gone: true } }, { 0: { weight: 1, placements: P("b", "a") } }, 1);
t(rows[0].id === "b" && rows[0].gone && JSON.stringify(topTied(rows)) === '["a"]', "a player who left keeps their pool (greyed) but cannot win");
rows = standings({ a: { start: 0 }, b: { start: 0 } }, { 0: { weight: 1, skipped: true, placements: [] }, 1: { weight: 1, placements: P("a", "b") } }, 2);
t(near(rows[0].pool, 10) && rows[0].gains[0] === null, "a skipped stage scores nothing; the others are intact");
rows = standings({ a: { start: 0 }, b: { start: 0 } }, { 0: { weight: 1, placements: [{ id: "a", place: 1 }, { id: "b", place: 1 }] }, 1: { weight: 0, sd: true, placements: P("b", "a") } }, 1);
t(near(rows[0].pool, 5.5) && near(rows[1].pool, 5.5) && rows.every(r => r.played === 1), "sudden-death rounds add no points and don't count as stages played");
rows = standings({ a: { start: 0 }, b: { start: 0 }, c: { start: 7.5 } }, { 0: { weight: 1, placements: P("a", "b") } }, 1);
t(near(rows.find(r => r.id === "c").pool, 7.5), "a late joiner's start value is part of their pool");
t(near(lateStart(standings({ a: { start: 0 }, b: { start: 0 } }, { 0: { weight: 1, placements: P("a", "b") } }, 1), ["a", "b"], "avg"), 5.5) && lateStart([], [], "zero") === 0, "late start: average of those present (5.5) or 0");
t(near(leadGap(standings(roster, results, 2)), 3), "leader gap (d 21 vs c 18 = 3)");
rows = standings({ x: { start: 0 }, y: { start: 0 } }, { 0: { weight: 1, placements: [{ id: "x", place: 1 }, { id: "y", place: 2 }] }, 1: { weight: 1, placements: [{ id: "y", place: 1 }, { id: "x", place: 2 }] } }, 2);
t(rows[0].tied && rows[1].tied && near(rows[0].pool, 11), "1st then 2nd vs 2nd then 1st: an exact tie (11 = 11)");
rows = standings({ x: { start: 0 }, y: { start: 0 }, z: { start: 0 } }, { 0: { weight: 1.5, placements: P("x", "y", "z") }, 1: { weight: 1, placements: P("y", "z", "x") }, 2: { weight: 1, placements: P("z", "x", "y") } }, 3);
t(!rows[0].tied && rows[0].id === "x", "same places in different weights is not a tie");

sect("brackets: seeding, byes, placements");
t(seedSlots(8).join() === "1,8,4,5,2,7,3,6", "standard seed positions (1v8, 4v5, 2v7, 3v6)");
const seed = seedOrder(["a", "b", "c", "d"], id => ({ a: 3, b: 9, c: 9, d: 1 })[id], () => .5);
t(seed[0] !== "a" && seed.slice(0, 2).sort().join() === "b,c" && seed[3] === "d", "seeded by current pool (ties in random order)");
let ord = new Set(); for (let k = 0; k < 40; k++) ord.add(seedOrder(["a", "b", "c", "d"], () => 0).join());
t(ord.size > 4, "equal pools (stage 1): a random draw (" + ord.size + " different orders in 40)");
let br = makeBracket(["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"]);
t(br.size === 8 && br.rounds.length === 3 && br.rounds[0][0].a === "s1" && br.rounds[0][0].b === "s8" && matchesLeft(br) === 7, "8 players: 3 rounds, 7 matches, 1 v 8 first");
let played = 0, m;
while ((m = nextMatch(br))) { recordWin(br, m.r, m.i, m.a); played++; }
t(played === 7 && bracketDone(br), "plays out in 7 matches");
let pl = bracketPlacements(br), placeOf = id => pl.find(p => p.id === id).place;
t(pl.length === 8 && placeOf("s1") === 1 && placeOf("s2") === 2 && placeOf("s3") === 3 && placeOf("s4") === 3 && ["s5", "s6", "s7", "s8"].every(id => placeOf(id) === 5), "champion 1st, finalist 2nd, semifinal losers tie 3rd, quarterfinal losers tie 5th");
const bp = sharePoints(pl);
t(near(bp.s3, avg(8, 3, 4)) && near(bp.s8, avg(8, 5, 8)), "bracket places score like ties (3rd/4th share, 5th-8th share)");
br = makeBracket(["s1", "s2", "s3", "s4", "s5"]);
t(br.size === 8 && matchesLeft(br) === 4 && br.rounds[0].filter(x => x.w).map(x => x.w).sort().join() === "s1,s2,s3", "5 players: 3 byes to the top 3 seeds, 4 matches");
m = nextMatch(br); t(m && [m.a, m.b].sort().join() === "s4,s5", "the only first-round match: 4 v 5");
while ((m = nextMatch(br))) recordWin(br, m.r, m.i, m.b);
pl = bracketPlacements(br);
t(pl.length === 5 && pl.filter(p => p.place === 1).length === 1 && pl.filter(p => p.place === 3).length === 2 && pl.filter(p => p.place === 5).length === 1, "5 players placed 1, 2, 3, 3, 5");
for (const n of [2, 3, 4, 5, 6, 7, 8]) {
    const b2 = makeBracket(Array.from({ length: n }, (_, i) => "p" + i)); let k = 0;
    while ((m = nextMatch(b2))) { recordWin(b2, m.r, m.i, Math.random() < .5 ? m.a : m.b); k++; }
    const pp = bracketPlacements(b2);
    t(k === n - 1 && pp.length === n && new Set(pp.map(p => p.id)).size === n && pp.filter(p => p.place === 1).length === 1, n + " players: " + (n - 1) + " matches, everyone placed once, one champion");
}
br = makeBracket(["a", "b", "c"]);
t(!recordWin(br, 0, 0, "zz") && !recordWin(br, 0, 0, "a"), "a winner must be one of the two players, and a decided match can't change");
br = normBracket(JSON.parse(JSON.stringify(makeBracket(["a", "b", "c", "d"]))));
t(nextMatch(br) && nextMatch(br).a === "a", "a bracket survives a Firebase round trip");

sect("teams for a team stage");
let tm = splitTeams(["a", "b", "c", "d", "e", "f", "g", "h"], id => ({ a: 8, b: 7, c: 6, d: 5, e: 4, f: 3, g: 2, h: 1 })[id]);
t(tm.A.join() === "a,d,e,h" && tm.B.join() === "b,c,f,g", "snake split by pool: A a,d,e,h vs B b,c,f,g");
tm = splitTeams(["a", "b", "c", "d", "e"], () => 0, "random");
t(tm.A.length + tm.B.length === 5 && Math.abs(tm.A.length - tm.B.length) <= 1, "random split stays balanced");

sect("sudden death");
t(sdWinners([{ id: "a", place: 1 }, { id: "b", place: 2 }]).join() === "a", "one player 1st = the winner");
t(sdWinners([{ id: "a", place: 1 }, { id: "b", place: 1 }, { id: "c", place: 3 }]).join() === "a,b", "still tied: those two go again");


sect("setup estimates, UNO series rule, the example template");
t(!stageFits("uno", { unoDeck: "classic", animes: ["onepiece", "naruto"] }, 4).ok && stageFits("uno", { unoDeck: "classic", animes: ["onepiece", "naruto", "jjk", "bleach"] }, 4).ok && !stageFits("uno", { unoDeck: "chaos", animes: ["a", "b", "c"] }, 4).ok, "UNO: Classic needs exactly 4 series, Chaos 4 to 8");
t(estMinutes("classic", {}, 8) === 35 && estMinutes("headbanz", { rounds: 5 }, 8) === 12.5 && estMinutes("feud", { feudRounds: 5 }, 8) === 15, "estimates: an 8-player Guess Who bracket 35 min, Headbanz 5 rounds 12.5, Feud 5 rounds 15");
const ex = NIGHT_PARTY.templates.find(x => x.id === "night-of-eight").plan;
t(ex.stages.length === 6 && ex.stages[5].weight === 2 && /final/i.test(ex.stages[5].label), "the example template: 6 stages ending with a x2 Final Round");
t(ex.stages.every(st => stageFits(st.mode, st.settings, 8).ok), "every stage of the example fits 8 players");
const tot8 = estTotal(ex.stages, 8); t(tot8 > 60 && tot8 < 110, "the example takes about " + Math.round(tot8) + " min with 8 players");
t(new Set(ex.stages.map(st => formatOf(st.mode, st.settings))).size === 3, "it mixes FFA, teams and a duel bracket");
t(NIGHT_PARTY.templates.every(tp => tp.plan.stages.every(st => stageIds().includes(st.mode) && JSON.stringify(normalizeSettings(st.mode, st.settings)) === JSON.stringify(Object.assign({}, normalizeSettings(st.mode, {}), st.settings)))), "every value written in a template is a valid choice (nothing silently replaced)");

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
