// Anime Feud rules + rotation tests: node tools/feud-test.mjs
import { buildLibrary, eligible, boardFor, qText, matchText, matchChar, pickQuestion, remember, trimHist, digest, scoreCandidate, balanceTeams,
    newMatch, act, actorOf, advance, needsQuestion, stateBoard, startTeam, poolInfo, faceOffOf, teamPick, pairsFor, pickPair, duelPoints, guessTeam, leaders, seatsOf, FEUD_RULES as R } from "../js/feud/engine.js";
import { PACKS } from "../js/feud/packs/index.js";

let ok = 0, bad = 0;
const t = (c, m) => { if (c) ok++; else { bad++; console.log("  ✘", m); } };
const sect = s => console.log("• " + s);
const lib = buildLibrary(PACKS);
const H = 3600e3, NOW = Date.UTC(2026, 10, 4, 12);
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

sect("library");
t(!lib.issues.filter(i => i.level === "error").length, "no library errors: " + JSON.stringify(lib.issues.slice(0, 3)));
const q0 = lib.questions[0];
["questionId", "familyId", "variantGroupId", "variantType", "questionType", "animeScope", "animeIds", "category", "subcategory", "difficulty", "polarity", "questionText", "answers", "answerPoints", "characterIds", "acceptedAliases", "curationSource", "reviewStatus"].forEach(k => t(k in q0, "question has " + k));
t(lib.questions.every(q => /^[a-z0-9-]+_\d+$/.test(q.questionId)), "question ids are Firebase-safe");
t(lib.boards["x-loyal"].opp === "x-betray" && lib.boards["x-betray"].opp === "x-loyal", "opposites are linked both ways");
t(lib.boards["x-leader-best"].ans.find(a => a.s === "onepiece").c === 40, "character answers carry AniList ids (Luffy = 40)");

sect("matching");
const nb = boardFor(lib.boards["c-technique"], ["naruto"]);
const hitT = (s, txt) => { const r = matchText(nb, s); return r.k === "hit" && nb[r.i].t === txt; };
t(hitT("Rasengan", "Rasengan"), "exact");
t(hitT("spiraling sphere", "Rasengan"), "alias");
t(hitT("rasengann", "Rasengan"), "one typo");
t(hitT("shadow clone", "Shadow Clone Jutsu"), "most of a long answer");
t(hitT("the chidori!", "Chidori"), "punctuation and articles ignored");
t(matchText(nb, "fireball jutsu").k === "miss", "wrong answer misses");
t(matchText(nb, "   ").k === "empty", "empty input");
const vb = boardFor(lib.boards["c-villain"], ["naruto"]);
t((() => { const r = matchText(vb, "Madara"); return r.k === "hit" && vb[r.i].c === 53901; })(), "a character's first name finds them");
t(matchText(vb, "Uchiha").k === "vague", "a shared surname asks to be more specific");
const ob = boardFor(lib.boards["c-villain"], ["onepiece"]);
t((() => { const r = matchText(ob, "blackbeard"); return r.k === "hit" && ob[r.i].c === 3331; })(), "nicknames are accepted (Blackbeard)");
const db = boardFor(lib.boards["db-transform"], ["dragonball"]);
t(matchText(db, "super saiyan 4").k !== "hit" || db[matchText(db, "super saiyan 4").i].t !== "Super Saiyan 3", "numbers are not typos (SSJ4 is not SSJ3)");
const lb = boardFor(lib.boards["x-loyal"], ["onepiece"]);
t(matchChar(lb, 62).k === "hit" && matchChar(lb, 999999).k === "miss", "Most Likely matches by character id");

sect("boards and series");
t(boardFor(lib.boards["x-loyal"], ["onepiece"]).every(a => a.s === "onepiece"), "one series: only its answers");
const mix = boardFor(lib.boards["x-loyal"], ["onepiece", "naruto"]);
t(mix.every(a => ["onepiece", "naruto"].includes(a.s)) && new Set(mix.map(a => a.s)).size === 2 && mix.length >= 5 && mix.length <= 8, "mix: only ticked series, both present, 5-8 answers");
for (let i = 1; i < mix.length; i++) t(mix[i].p <= mix[i - 1].p, "mix board ranked by points");
const big = boardFor(lib.boards["x-loyal"], Object.keys(lib.idx));
t(big.length === 8 && new Set(big.map(a => a.s)).size >= 4, "18-series mix spreads answers across series");
t(boardFor(lib.boards["g-food"], ["onepiece"]) === null && boardFor(lib.boards["g-food"], ["onepiece", "naruto"]).length >= 5, "general anime boards only in a mix");
t(boardFor(lib.boards["op-straw-hats"], ["onepiece"]) && boardFor(lib.boards["op-straw-hats"], ["onepiece", "naruto"]) === null && boardFor(lib.boards["op-straw-hats"], ["naruto"]) === null, "single-series boards only for that series");
t(boardFor(lib.boards["x-betray"], ["windbreaker"]) === null, "a series with no line gets no board");
t(boardFor(lib.boards["x-zombie-survive"], ["gachiakuta", "deathnote"]) !== null && boardFor(lib.boards["x-teacher"], ["gachiakuta", "deathnote"]) === null, "mixes need two represented series");
t(qText("Which {a}character is the most loyal?", ["onepiece"], k => ({ onepiece: "One Piece" })[k]) === "Which One Piece character is the most loyal?", "{a} single");
t(qText("Which {a}character is the most loyal?", ["onepiece", "naruto"]) === "Which character is the most loyal?", "{a} mix");
t(qText("Name a place from {s}", ["a", "b"], k => k.toUpperCase()) === "Name a place from A or B" && qText("Name a place from {s}", ["a", "b", "c", "d"]) === "Name a place from your chosen series", "{s}");
const eOP = eligible(lib, "likely", ["onepiece"]);
t(eOP.some(c => c.g === "op-captain") && !eligible(lib, "likely", ["naruto"]).some(c => c.g === "op-captain"), "eligible respects single-series boards");
t(eOP.every(c => c.key.endsWith("@onepiece")) && eligible(lib, "likely", ["onepiece", "jjk"]).every(c => c.key.endsWith("@mix")), "history keys carry the scope");
t(!eligible(lib, "likely", ["onepiece"]).some(c => /^M\|/.test(c.tpl)) && eligible(lib, "likely", ["onepiece", "naruto"]).some(c => c.id === "x-leader-best_3") && !eOP.some(c => c.id === "x-leader-best_3"), "mix-only wordings");
t(poolInfo(lib, "classic", ["gachiakuta"]).boards === 0, "an empty pool is reported, not faked");

sect("rotation");
const cands = eligible(lib, "likely", ["onepiece", "naruto"]);
const H1 = {}; cands.forEach(c => { if (c.g !== "x-party") H1[c.key] = [NOW - H, 1]; });    // everything seen an hour ago except x-party
let picks = Array.from({ length: 60 }, () => pickQuestion(cands, { hists: [H1, H1], now: NOW, rnd, lib }).g);
t(picks.every(g => g === "x-party"), "fresh questions beat ones seen an hour ago");
// nothing fresh at all: still picks (never stuck)
const H2 = {}; cands.forEach(c => { H2[c.key] = [NOW - H, 1]; });
t(!!pickQuestion(cands, { hists: [H2], now: NOW, rnd, lib }), "a fully seen pool still returns a question");
// exact cooldown is ~24h, not permanent
const one = cands.filter(c => c.id === "x-loyal_1"), fresh = cands.filter(c => c.id === "x-party_1");
const sc = h => scoreCandidate(one[0], [digest({ [one[0].key]: [NOW - h * H, 1] }, lib)], NOW).score;
t(sc(2) < sc(30) && sc(30) < sc(24 * 8), "a question regains weight with time: 2h < 30h < 8 days");
t(sc(24 * 9) >= scoreCandidate(fresh[0], [digest({}, lib)], NOW).score - .01, "after cooldown + restore window it is as eligible as a new one");
let back = 0; for (let i = 0; i < 300; i++) if (pickQuestion(one.concat(fresh), { hists: [{ [one[0].key]: [NOW - 30 * 24 * H, 1] }], now: NOW, rnd, lib }).id === "x-loyal_1") back++;
t(back > 60 && back < 240, "an old question comes back at random (" + back + "/300)");
// rewording shares the cooldown
const rw = cands.find(c => c.id === "x-loyal_2");
t(scoreCandidate(rw, [digest({ [cands.find(c => c.id === "x-loyal_1").key]: [NOW - 2 * H, 1] }, lib)], NOW).score < 2, "a rewording of a question seen 2h ago is penalised");
// opposite and family
const betr = cands.find(c => c.id === "x-betray_1"), party = cands.find(c => c.id === "x-party_1"), lazy = cands.find(c => c.id === "x-lazy_1");
const dLoyal = [digest({ [cands.find(c => c.id === "x-loyal_1").key]: [NOW - 2 * H, 1] }, lib)];
t(scoreCandidate(betr, dLoyal, NOW).score < scoreCandidate(party, dLoyal, NOW).score, "the opposite of a recent question is held back");
t(scoreCandidate(betr, dLoyal, NOW).score > scoreCandidate(rw, dLoyal, NOW).score, "...but less than its own rewording");
const dLeader = [digest({ [cands.find(c => c.id === "x-strategist_1").key]: [NOW - 2 * H, 1] }, lib)];
t(scoreCandidate(cands.find(c => c.id === "x-teacher_1"), dLeader, NOW).score >= scoreCandidate(cands.find(c => c.id === "x-leader-best_1"), dLeader, NOW).score, "same family is softly spaced out");
// different histories: one player saw it, another didn't
const A = { [party.key]: [NOW - H, 1] }, Bh = {};
const sAB = scoreCandidate(party, [digest(A, lib), digest(Bh, lib)], NOW).score, sAA = scoreCandidate(party, [digest(A, lib), digest(A, lib)], NOW).score, sBB = scoreCandidate(party, [digest(Bh, lib), digest(Bh, lib)], NOW).score;
t(sAA < sAB && sAB < sBB, "group history: fresh for more players = higher score");
const twoQ = [party, lazy];
let freshForAll = 0; for (let i = 0; i < 100; i++) if (pickQuestion(twoQ, { hists: [A, Bh, Bh], now: NOW, rnd, lib }).id === lazy.id) freshForAll++;
t(freshForAll > 90, "prefers the question nobody saw recently (" + freshForAll + "/100)");
t(!!pickQuestion([party], { hists: [A, Bh], now: NOW, rnd, lib }), "one player's history never blocks a question for good");
// in-match rules
const used = [];
for (let i = 0; i < 8; i++) { const c = pickQuestion(cands, { used, now: NOW, rnd, lib }); used.push({ key: c.key, g: c.g, f: c.f, opp: c.opp }); }
t(new Set(used.map(u => u.key)).size === 8 && new Set(used.map(u => u.g)).size === 8, "no repeated question or board in a match");
t(new Set(used.map(u => u.f)).size === 8, "no repeated family while others remain");
t(!used.some(u => used.some(v => v.g === u.opp)), "no question and its opposite in one match");
const spread = new Set(Array.from({ length: 200 }, () => pickQuestion(cands, { now: NOW, rnd, lib }).g));
t(spread.size > 15, "picks are spread at random, not chronological (" + spread.size + " boards in 200 picks)");
const tiny = cands.filter(c => c.g === "x-loyal");
const u2 = []; let c2; while ((c2 = pickQuestion(tiny, { used: u2, now: NOW, rnd, lib }))) u2.push({ key: c2.key, g: c2.g, f: c2.f, opp: c2.opp });
t(u2.length === tiny.length, "an exhausted pool falls back to rewordings, then stops (" + u2.length + ")");
// history housekeeping
let h = {}; h = remember(h, "x-a_1@mix", NOW); h = remember(h, "x-a_1@mix", NOW + H);
t(h["x-a_1@mix"][0] === NOW + H && h["x-a_1@mix"][1] === 2, "remember: last time + count");
h = remember(h, "x-a_1@mix", NOW + H); t(h["x-a_1@mix"][1] === 2, "remembering the same sighting twice (refresh) doesn't double count");
const old = { "x-old_1@mix": [NOW - 60 * 24 * H, 3] }; t(!trimHist(old, NOW)["x-old_1@mix"], "very old entries are trimmed");
// two rooms at once: different groups, different picks are fine; each room only reads its own players
const roomA = pickQuestion(cands, { hists: [H1], now: NOW, rnd, lib }), roomB = pickQuestion(cands, { hists: [{}], now: NOW, rnd, lib });
t(roomA && roomB && roomA.g === "x-party", "simultaneous rooms pick from their own players' histories");

sect("teams");
const sizes = { 2: [1, 1], 3: [2, 1], 4: [2, 2], 5: [3, 2], 6: [3, 3], 7: [4, 3], 8: [4, 4] };
Object.entries(sizes).forEach(([n, [a, b]]) => { const T = balanceTeams(Array.from({ length: n }, (_, i) => i + 1)); t(T.A.length === a && T.B.length === b, n + " players -> " + a + " vs " + b); });
const Tsaved = balanceTeams([1, 2, 3, 4], { p1: "B", p2: "B" }); t(Tsaved.B.join() === "1,2" && Tsaved.A.join() === "3,4", "host picks are kept");
const Tempty = balanceTeams([1, 2, 3], { p1: "A", p2: "A", p3: "A" }); t(Tempty.B.length === 1, "a team is never left empty");

sect("classic: the face-off");
const C = (id, sc = ["onepiece"]) => eligible(lib, "classic", sc).find(c => c.id === id);
const T4 = { A: [1, 3], B: [2, 4] };
let s = newMatch({ mid: 1, type: "classic", series: ["onepiece"], teams: T4, q: C("c-protect_1"), now: NOW, rounds: 2 });
let bd = stateBoard(lib, s), ctx = (o = {}) => Object.assign({ board: bd, now: NOW, present: () => true }, o);
t(s.phase === "buzz" && faceOffOf(s, "A") === 1 && faceOffOf(s, "B") === 2 && actorOf(s) === 0, "round opens on the buzzers: player 1 vs player 2");
t(/face-off/.test(act(s, { k: "buzz", by: 3 }, ctx())), "only the face-off players can buzz");
t(act(s, { k: "guess", by: 1, tk: s.tk, text: "Luffy" }, ctx()) === "Buzz first!", "no answering before the buzzer");
t(act(s, { k: "buzz", by: 2 }, ctx()) === "" && s.phase === "face" && s.fb === "B" && actorOf(s) === 2, "first buzz: Team B's player answers first");
t(act(s, { k: "buzz", by: 1 }, ctx()) === "stale" && s.fb === "B", "a late buzz changes nothing");
act(s, { k: "guess", by: 2, tk: s.tk, text: bd[0].t }, ctx());
t(s.phase === "decide" && s.ctrl === "B" && s.rev[0] === "B" && s.bank === bd[0].p, "top answer: control at once, points in the pot");
t(/deciding/.test(act(s, { k: "decide", by: 1, tk: s.tk, play: true }, ctx())), "only the controlling team decides");
act(s, { k: "decide", by: 4, tk: s.tk, play: false }, ctx());
t(s.phase === "play" && s.turn === "A" && actorOf(s) === 1 && s.strikes === 0, "pass: the other team plays the board");
// second answer is lower than the first
s = newMatch({ mid: 2, type: "classic", series: ["onepiece"], teams: T4, q: C("c-protect_1"), now: NOW });
act(s, { k: "buzz", by: 1 }, ctx()); act(s, { k: "guess", by: 1, tk: s.tk, text: bd[2].t }, ctx());
t(s.phase === "face2" && actorOf(s) === 2, "not the top answer: the other face-off player answers");
act(s, { k: "guess", by: 2, tk: s.tk, text: bd[4].t }, ctx());
t(s.phase === "decide" && s.ctrl === "A" && s.bank === bd[2].p + bd[4].p, "a lower answer: the first team keeps control");
act(s, { k: "decide", by: 3, tk: s.tk, play: true }, ctx());
t(s.phase === "play" && s.turn === "A", "play: they keep the board");
// second answer is higher
s = newMatch({ mid: 3, type: "classic", series: ["onepiece"], teams: T4, q: C("c-protect_1"), now: NOW });
act(s, { k: "buzz", by: 1 }, ctx()); act(s, { k: "guess", by: 1, tk: s.tk, text: bd[3].t }, ctx()); act(s, { k: "guess", by: 2, tk: s.tk, text: bd[1].t }, ctx());
t(s.ctrl === "B", "a higher answer: the second team takes control");
// first misses, second hits anything
s = newMatch({ mid: 4, type: "classic", series: ["onepiece"], teams: T4, q: C("c-protect_1"), now: NOW });
act(s, { k: "buzz", by: 1 }, ctx()); act(s, { k: "guess", by: 1, tk: s.tk, text: "Buggy" }, ctx());
t(s.phase === "face2" && !s.strikes, "a face-off miss is not a strike");
act(s, { k: "guess", by: 2, tk: s.tk, text: bd[5].t }, ctx());
t(s.ctrl === "B", "first missed, second on the board: second team takes control");
// first hits, second misses
s = newMatch({ mid: 5, type: "classic", series: ["onepiece"], teams: T4, q: C("c-protect_1"), now: NOW });
act(s, { k: "buzz", by: 2 }, ctx()); act(s, { k: "guess", by: 2, tk: s.tk, text: bd[5].t }, ctx()); act(s, { k: "guess", by: 1, tk: s.tk, text: "Buggy" }, ctx());
t(s.ctrl === "B", "second missed: the first team has control");
// both miss: a fresh face-off with the next pair
s = newMatch({ mid: 6, type: "classic", series: ["onepiece"], teams: T4, q: C("c-protect_1"), now: NOW });
act(s, { k: "buzz", by: 1 }, ctx()); act(s, { k: "guess", by: 1, tk: s.tk, text: "Buggy" }, ctx()); act(s, { k: "guess", by: 2, tk: s.tk, text: "Enel" }, ctx());
t(s.phase === "buzz" && faceOffOf(s, "A") === 3 && faceOffOf(s, "B") === 4, "both missed: the next two players face off");
// nobody buzzes / nobody decides
s = newMatch({ mid: 7, type: "classic", series: ["onepiece"], teams: T4, q: C("c-protect_1"), now: NOW });
t(act(s, { k: "timeout", tk: s.tk }, ctx()) === "Time isn't up yet.", "the buzzer waits for its window");
act(s, { k: "timeout", tk: s.tk }, ctx({ now: s.dl + 1 }));
t(s.phase === "face" && s.fb === s.turn, "nobody buzzed: the round's starting team answers first");
act(s, { k: "timeout", tk: s.tk }, ctx({ now: s.dl + 1 }));
t(s.phase === "face2", "a face-off answer can time out too");
act(s, { k: "guess", by: faceOffOf(s, "B"), tk: s.tk, text: bd[1].t }, ctx());
act(s, { k: "timeout", tk: s.tk }, ctx({ now: s.dl + 1 }));
t(s.phase === "play" && s.turn === "B", "no decision in time: they play");
// the play phase, steal and the next round
s = newMatch({ mid: 8, type: "classic", series: ["onepiece"], teams: T4, q: C("c-protect_1"), now: NOW, rounds: 2 });
act(s, { k: "buzz", by: 1 }, ctx()); act(s, { k: "guess", by: 1, tk: s.tk, text: bd[1].t }, ctx()); act(s, { k: "guess", by: 2, tk: s.tk, text: "nope" }, ctx());
act(s, { k: "decide", by: 1, tk: s.tk, play: true }, ctx());
const tk0 = s.tk, first = actorOf(s);
t(act(s, { k: "guess", by: first, tk: s.tk, text: "monkey d luffy" }, ctx()) === "" && s.rev[0] === "A", "play: a hit");
t(act(s, { k: "guess", by: first, tk: tk0, text: "Zoro" }, ctx()) === "stale", "a double submission with an old turn key is ignored");
t(actorOf(s) !== first, "the answerer rotates");
t(/Already/.test(act(s, { k: "guess", by: actorOf(s), tk: s.tk, text: "Luffy" }, ctx())), "an answer already on the board costs nothing");
for (let i = 0; i < 3; i++) act(s, { k: "guess", by: actorOf(s), tk: s.tk, text: "Buggy" + i }, ctx());
t(s.phase === "steal" && guessTeam(s) === "B", "three strikes: the other team steals");
const bank = s.bank, stealI = bd.findIndex((a, i) => s.rev[i] == null);
act(s, { k: "guess", by: actorOf(s), tk: s.tk, text: bd[stealI].t }, ctx());
t(s.phase === "reveal" && s.score.B === bank + bd[stealI].p && s.log[0].how === "steal", "a steal takes the whole pot, face-off points included");
t(advance(s, 2, C("c-villain_1")) === "stale", "advance is guarded by the round number");
advance(s, 1, C("c-villain_1"), NOW + 7000);
t(s.round === 2 && s.phase === "buzz" && faceOffOf(s, "A") === 3 && faceOffOf(s, "B") === 4, "round 2: new face-off pair");

sect("classic: clears, ties and sudden death");
s = newMatch({ mid: 9, type: "classic", series: ["onepiece"], teams: { A: [1], B: [2] }, q: C("c-protect_1"), now: NOW, rounds: 1 });
bd = stateBoard(lib, s);
act(s, { k: "buzz", by: 1 }, ctx()); act(s, { k: "guess", by: 1, tk: s.tk, text: bd[0].t }, ctx()); act(s, { k: "decide", by: 1, tk: s.tk, play: true }, ctx());
bd.slice(1).forEach(a => act(s, { k: "guess", by: 1, tk: s.tk, text: a.t }, ctx()));
t(s.phase === "reveal" && s.log[0].how === "clear" && s.score.A === bd.reduce((n, a) => n + a.p, 0), "clearing the board banks everything, no steal");
s = newMatch({ mid: 10, type: "classic", series: ["onepiece"], teams: { A: [1], B: [2] }, q: C("c-protect_1"), now: NOW, rounds: 1 });
act(s, { k: "buzz", by: 1 }, ctx()); act(s, { k: "guess", by: 1, tk: s.tk, text: "x1" }, ctx()); act(s, { k: "guess", by: 2, tk: s.tk, text: "x2" }, ctx());
act(s, { k: "buzz", by: 1 }, ctx()); act(s, { k: "guess", by: 1, tk: s.tk, text: bd[3].t }, ctx()); act(s, { k: "guess", by: 2, tk: s.tk, text: "x3" }, ctx());
act(s, { k: "decide", by: 1, tk: s.tk, play: false }, ctx());
for (let i = 0; i < 3; i++) act(s, { k: "guess", by: 2, tk: s.tk, text: "nope" + i }, ctx());
const pot = s.bank; act(s, { k: "guess", by: 1, tk: s.tk, text: "still no" }, ctx());
t(s.phase === "reveal" && s.score.B === pot && s.log[0].how === "defend", "pass, three strikes, failed steal: the playing team keeps the pot");
s.score = { A: 0, B: 0 };
t(needsQuestion(s), "tied after the last round: sudden death");
advance(s, 1, C("c-villain_1"), NOW);
t(s.sd === 1 && s.round === 2 && s.phase === "buzz", "one sudden-death round");
s.phase = "reveal"; s.score = { A: 5, B: 5 };
t(!needsQuestion(s), "Classic plays only one sudden-death question");
advance(s, 2, null, NOW);
t(s.phase === "over" && s.winner === "", "still tied: a draw");
s = newMatch({ mid: 11, type: "classic", series: ["onepiece"], teams: { A: [1], B: [2] }, q: C("c-protect_1"), now: NOW, rounds: 3 });
s.phase = "reveal";
advance(s, 1, null, NOW);
t(s.phase === "over" && s.why === "out", "no question left: the match ends cleanly");

sect("classic: away players");
s = newMatch({ mid: 12, type: "classic", series: ["onepiece"], teams: { A: [1, 3, 5], B: [2, 4] }, q: C("c-protect_1"), now: NOW });
bd = stateBoard(lib, s);
t(faceOffOf(s, "A", p => p !== 1) === 3, "an away face-off player is replaced by the next teammate");
t(act(s, { k: "buzz", by: 3 }, ctx({ present: p => p !== 1 })) === "", "...who can buzz");
act(s, { k: "guess", by: 3, tk: s.tk, text: bd[0].t }, ctx({ present: p => p !== 1 })); act(s, { k: "decide", by: 5, tk: s.tk, play: true }, ctx());
t(actorOf(s, p => p !== 1) === 3, "an away answerer is skipped in play");
t(actorOf(s, () => false) === 1, "nobody present: the timer runs on the designated player");

sect("most likely: duels");
const scOP = ["onepiece"], eL = eligible(lib, "likely", scOP);
t(eL.length > 20 && eL.every(c => pairsFor(lib.boards[c.g], scOP).length), "Most Likely questions all have a close pair (" + eL.length + ")");
const pairs = pairsFor(lib.boards["x-smartest"], scOP), byId = {}; lib.boards["x-smartest"].ans.forEach(a => { byId[a.c] = a; });
t(pairs.every(p => byId[p.w].p > byId[p.l].p && byId[p.w].p - byId[p.l].p <= R.duelGap && byId[p.w].s === "onepiece"), "pairs are close, never tied, the higher-ranked one wins");
const mixP = pairsFor(lib.boards["x-smartest"], ["onepiece", "naruto"]);
t(mixP.some(p => p.cross) && mixP.every(p => ["onepiece", "naruto"].includes(byId[p.w].s) && ["onepiece", "naruto"].includes(byId[p.l].s)), "mix: same-series and cross-series pairs, only from ticked series");
t(duelPoints(1) === 30 && duelPoints(4) === 20 && duelPoints(6) === 10, "closer calls are worth more");
const pp = pickPair(lib, eL.find(c => c.g === "x-smartest"), scOP, rnd);
t(pp && pp.a !== pp.b && (pp.w === "a" ? byId[pp.a].p > byId[pp.b].p : byId[pp.b].p > byId[pp.a].p), "pickPair: two characters, the right winner, random sides");
t(eligible(lib, "likely", ["gachiakuta"]).length < 3, "a thin series has (almost) no duels and says so");
const LQ = (g, sc = scOP) => { const c = eligible(lib, "likely", sc).find(x => x.g === g); return Object.assign({}, c, { pair: pickPair(lib, c, sc, rnd) }); };
const T6 = { A: [1, 3, 5], B: [2, 4, 6] };
s = newMatch({ mid: 20, type: "likely", series: scOP, teams: T6, q: LQ("x-smartest"), now: NOW, rounds: 2 });
const lc = (o = {}) => Object.assign({ now: NOW, present: () => true }, o);
t(s.phase === "vote" && s.rounds === 2 && s.duel.a && s.duel.b && actorOf(s) === 0, "a duel opens with both teams voting");
const W = s.duel.w, L2 = W === "a" ? "b" : "a";
act(s, { k: "vote", by: 1, pick: W }, lc()); act(s, { k: "vote", by: 3, pick: W }, lc()); act(s, { k: "vote", by: 5, pick: L2 }, lc());
act(s, { k: "vote", by: 2, pick: L2 }, lc());
t(s.phase === "vote" && teamPick(s, "A") === W && teamPick(s, "B") === L2, "majority picks per team, still open until everyone voted");
t(act(s, { k: "vote", by: 2, pick: L2 }, lc()) === "stale" && act(s, { k: "vote", by: 9, pick: "a" }, lc()) !== "", "repeat votes and outsiders change nothing");
act(s, { k: "vote", by: 2, pick: W }, lc());
t(teamPick(s, "B") === W, "a vote can be changed before the reveal");
act(s, { k: "vote", by: 4, pick: L2 }, lc()); act(s, { k: "vote", by: 6, pick: L2 }, lc());
t(s.phase === "reveal" && s.score.A === s.duel.pts && s.score.B === 0 && s.log[0].picks.B === L2, "everyone voted: revealed, only the right team scores");
advance(s, 1, LQ("x-loyal"), NOW);
t(s.round === 2 && s.phase === "vote" && Object.keys(s.votes || {}).length === 0, "next duel, fresh votes");
act(s, { k: "vote", by: 1, pick: s.duel.w }, lc()); act(s, { k: "vote", by: 2, pick: s.duel.w }, lc());
t(act(s, { k: "timeout", tk: s.tk }, lc()) === "Time isn't up yet." && s.phase === "vote", "the vote waits for its clock");
act(s, { k: "timeout", tk: s.tk }, lc({ now: s.dl + 1 }));
t(s.phase === "reveal" && s.log[1].gain.A === s.duel.pts && s.log[1].gain.B === s.duel.pts, "time up: the votes in count, both teams can score");
s = newMatch({ mid: 21, type: "likely", series: scOP, teams: { A: [1, 3], B: [2, 4] }, q: LQ("x-smartest"), now: NOW, rounds: 1 });
act(s, { k: "vote", by: 3, pick: "b" }, lc({ now: NOW + 5 })); act(s, { k: "vote", by: 1, pick: "a" }, lc({ now: NOW + 9 }));
t(teamPick(s, "A") === "b", "a split team goes with whoever voted first");
act(s, { k: "vote", by: 2, pick: "a" }, lc({ present: p => p !== 4 }));
t(s.phase === "reveal", "away players don't hold up the vote");
s = newMatch({ mid: 22, type: "likely", series: scOP, teams: { A: [1], B: [2] }, q: LQ("x-smartest"), now: NOW, rounds: 1 });
act(s, { k: "vote", by: 1, pick: s.duel.w }, lc()); act(s, { k: "vote", by: 2, pick: s.duel.w }, lc());
t(needsQuestion(s) && s.score.A === s.score.B, "tied: sudden death");
let sdN = 0; while (needsQuestion(s)) { advance(s, s.round, LQ(["x-loyal", "x-kindest", "x-lazy", "x-party"][sdN]), NOW); sdN++; act(s, { k: "vote", by: 1, pick: s.duel.w }, lc()); act(s, { k: "vote", by: 2, pick: s.duel.w }, lc()); }
t(sdN === 3, "up to three sudden-death duels (" + sdN + ")");
advance(s, s.round, null, NOW);
t(s.phase === "over" && s.winner === "", "still tied after three: a draw");

sect("most likely: free for all");
const FQ = (g, sc = scOP) => LQ(g, sc);
s = newMatch({ mid: 30, type: "likely", ffa: true, players: [1, 2, 3, 4], series: scOP, q: FQ("x-smartest"), now: NOW, rounds: 2 });
t(s.ffa === 1 && s.score.p1 === 0 && s.score.p4 === 0 && !s.score.A, "free for all: a score per player, no teams");
const fw = s.duel.w, fl = fw === "a" ? "b" : "a";
act(s, { k: "vote", by: 1, pick: fw }, lc()); act(s, { k: "vote", by: 2, pick: fl }, lc()); act(s, { k: "vote", by: 3, pick: fw }, lc());
t(act(s, { k: "vote", by: 7, pick: "a" }, lc()) !== "" && s.phase === "vote", "outsiders can't vote, the duel waits for player 4");
act(s, { k: "vote", by: 4, pick: fl }, lc());
t(s.phase === "reveal" && s.score.p1 === s.duel.pts && s.score.p3 === s.duel.pts && s.score.p2 === 0 && s.score.p4 === 0, "everyone who picked right scores for themselves");
advance(s, 1, FQ("x-loyal"), NOW);
act(s, { k: "vote", by: 2, pick: s.duel.w }, lc({ present: p => p === 2 }));
t(s.phase === "reveal" && s.log[1].gain.p2 === s.duel.pts && s.log[1].gain.p1 === 0, "away players don't hold the vote up; a missing vote scores 0");
s.score = { p1: 40, p2: 40, p3: 10, p4: 0 };
t(needsQuestion(s), "two players tied on top after the last duel: sudden death");
advance(s, 2, FQ("x-party"), NOW);
act(s, { k: "vote", by: 1, pick: s.duel.w }, lc()); ["2", "3", "4"].forEach(p => act(s, { k: "vote", by: Number(p), pick: s.duel.w === "a" ? "b" : "a" }, lc()));
t(!needsQuestion(s), "the tie is broken");
advance(s, 3, null, NOW);
t(s.phase === "over" && s.winner === "p1" && s.winners.join() === "1", "the single leader wins");
s = newMatch({ mid: 31, type: "likely", ffa: true, players: [1, 2], series: scOP, q: FQ("x-smartest"), now: NOW, rounds: 1 });
act(s, { k: "vote", by: 1, pick: s.duel.w }, lc()); act(s, { k: "vote", by: 2, pick: s.duel.w }, lc());
let fsd = 0; while (needsQuestion(s)) { advance(s, s.round, FQ(["x-loyal", "x-kindest", "x-lazy", "x-party"][fsd]), NOW); fsd++; act(s, { k: "vote", by: 1, pick: s.duel.w }, lc()); act(s, { k: "vote", by: 2, pick: s.duel.w }, lc()); }
advance(s, s.round, null, NOW);
t(fsd === 3 && s.phase === "over" && s.winner === "" && s.winners.length === 2, "still tied after three sudden-death duels: a shared win");

sect("full matches, 2 to 8 players");
for (let n = 2; n <= 8; n++) for (let type of ["classic", "likely", "ffa"]) {
    const ffa = type === "ffa"; if (ffa) type = "likely";
    const series = n % 2 ? ["onepiece", "naruto"] : ["jjk"], pool = eligible(lib, type, series);
    const pick = used => { const c = pickQuestion(pool, { used, now: NOW, rnd, lib }); return c && type === "likely" ? Object.assign({}, c, { pair: pickPair(lib, c, series, rnd) }) : c; };
    const T = balanceTeams(Array.from({ length: n }, (_, i) => i + 1));
    let st = newMatch({ mid: 100 + n, type, series, teams: T, ffa, players: [...T.A, ...T.B], q: pick([]), now: NOW }), guard = 0, acted = new Set(), err = "";
    while (st.phase !== "over" && guard++ < 800) {
        if (st.phase === "reveal") { advance(st, st.round, needsQuestion(st) ? pick(st.used) : null, NOW); continue; }
        let r = "";
        if (st.phase === "vote") { const p = [...T.A, ...T.B].find(x => !(st.votes || {})["p" + x]); r = act(st, { k: "vote", by: p, pick: rnd() < .5 ? "a" : "b" }, { now: NOW }); acted.add(p); }
        else if (st.phase === "buzz") { const tm = rnd() < .5 ? "A" : "B", p = faceOffOf(st, tm); r = act(st, { k: "buzz", by: p }, { board: stateBoard(lib, st), now: NOW }); acted.add(p); }
        else if (st.phase === "decide") { const p = st.teams[st.ctrl][0]; r = act(st, { k: "decide", by: p, tk: st.tk, play: rnd() < .7 }, { board: stateBoard(lib, st), now: NOW }); }
        else {
            const b = stateBoard(lib, st), who = actorOf(st), hidden = b.map((a, i) => i).filter(i => st.rev[i] == null);
            const hit = rnd() < .55 && hidden.length, a = b[hidden[(rnd() * hidden.length) | 0]];
            r = act(st, { k: "guess", by: who, tk: st.tk, text: hit ? a.t : "zzz wrong" }, { board: b, now: NOW }); acted.add(who);
        }
        if (r) { err = r + " @" + st.phase; break; }
    }
    const banked = st.log.reduce((x, l) => x + (type === "likely" ? Object.values(l.gain).reduce((u, v) => u + v, 0) : l.pts), 0), total = Object.values(st.score).reduce((u, v) => u + v, 0);
    t(!err && st.phase === "over", `${n}p ${type}: match finishes (${err})`);
    t(total === banked, `${n}p ${type}${ffa ? " ffa" : ""}: scores = points awarded`);
    t(st.round >= st.rounds && new Set(st.used.map(u => u.key)).size === st.used.length, `${n}p ${type}: ${st.round} rounds, no repeats`);
    t(acted.size === n, `${n}p ${type}: everyone took part (${acted.size}/${n})`);
    t(ffa ? (st.winners.length && st.winners.every(p => st.score["p" + p] === Math.max(...Object.values(st.score)))) : st.winner === (st.score.A > st.score.B ? "A" : st.score.B > st.score.A ? "B" : ""), `${n}p ${type}${ffa ? " ffa" : ""}: winner matches the score`);
}

console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
