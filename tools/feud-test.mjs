// Anime Feud rules + rotation tests: node tools/feud-test.mjs
import { buildLibrary, eligible, boardFor, qText, matchText, matchChar, pickQuestion, remember, trimHist, digest, scoreCandidate, balanceTeams,
    newMatch, act, actorOf, advance, needsQuestion, stateBoard, startTeam, poolInfo, FEUD_RULES as R } from "../js/feud/engine.js";
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

sect("a round");
const C = (id, sc = ["onepiece"]) => eligible(lib, "classic", sc).find(c => c.id === id);
let s = newMatch({ mid: 1, type: "classic", series: ["onepiece"], teams: { A: [1, 3], B: [2, 4] }, q: C("c-protect_1"), now: NOW, rounds: 2 });
let bd = stateBoard(lib, s), ctx = (o = {}) => Object.assign({ board: bd, now: NOW, present: () => true }, o);
t(s.phase === "play" && s.round === 1 && s.turn === "A" && actorOf(s) === 1 && bd.length >= 5, "round 1: team A, player 1 answers");
t(act(s, { k: "guess", by: 2, tk: s.tk, text: "Luffy" }, ctx()) && s.bank === 0, "the other team can't answer");
t(/teammate/.test(act(s, { k: "guess", by: 3, tk: s.tk, text: "Luffy" }, ctx())), "only the designated teammate answers");
const tk0 = s.tk;
t(act(s, { k: "guess", by: 1, tk: s.tk, text: "Luffy" }, ctx()) === "" && s.rev[0] === "A" && s.bank === bd[0].p, "a hit reveals and banks");
t(act(s, { k: "guess", by: 3, tk: tk0, text: "Zoro" }, ctx()) === "stale", "a double submission with an old turn key is ignored");
t(actorOf(s) === 3, "the guesser rotates");
t(/Already/.test(act(s, { k: "guess", by: 3, tk: s.tk, text: "monkey d luffy" }, ctx())) && s.strikes === 0, "an answer already on the board costs nothing");
act(s, { k: "guess", by: 3, tk: s.tk, text: "Buggy" }, ctx());
t(s.strikes === 1 && actorOf(s) === 1, "a miss is a strike");
t(act(s, { k: "timeout", tk: s.tk }, ctx()) === "Time isn't up yet.", "no timeout before the deadline");
act(s, { k: "timeout", tk: s.tk }, ctx({ now: s.dl + 1 }));
t(s.strikes === 2, "a timeout is a strike");
act(s, { k: "guess", by: 3, tk: s.tk, text: "Crocodile" }, ctx());
t(s.phase === "steal" && actorOf(s) === 2, "three strikes: the other team steals");
const bank = s.bank, zoroI = bd.findIndex(a => a.c === 62);
act(s, { k: "guess", by: 2, tk: s.tk, text: "Zoro" }, ctx());
t(s.phase === "reveal" && s.score.B === bank + bd[zoroI].p && s.score.A === 0, "a steal takes the whole pot");
t(s.log.length === 1 && s.log[0].how === "steal", "round logged");
t(needsQuestion(s), "the host needs a second question");
t(advance(s, 2, C("c-villain_1")) === "stale", "advance is guarded by the round number");
advance(s, 1, C("c-villain_1"), NOW + 7000);
t(s.round === 2 && s.turn === "B" && s.phase === "play" && actorOf(s) === 4, "round 2: the other team starts, next guesser");
bd = stateBoard(lib, s);
// team B misses three times, team A fails to steal
["xx", "yy", "zz"].forEach(w => act(s, { k: "guess", by: actorOf(s), tk: s.tk, text: w }, ctx()));
const aBefore = s.score.A, bBefore = s.score.B;
act(s, { k: "guess", by: actorOf(s), tk: s.tk, text: "nope" }, ctx());
t(s.phase === "reveal" && s.log[1].how === "defend" && s.score.A === aBefore && s.score.B === bBefore, "a failed steal leaves the pot (0 here) with the defenders");
t(!needsQuestion(s) || s.score.A === s.score.B, "after the last round: over unless tied");

sect("clearing the board, ties and sudden death");
s = newMatch({ mid: 2, type: "likely", series: ["onepiece"], teams: { A: [1], B: [2] }, q: eligible(lib, "likely", ["onepiece"]).find(c => c.g === "x-loyal"), now: NOW, rounds: 1 });
bd = stateBoard(lib, s);
bd.forEach(a => act(s, { k: "guess", by: 1, tk: s.tk, cid: a.c }, ctx()));
t(s.phase === "reveal" && s.log[0].how === "clear" && s.score.A === bd.reduce((n, a) => n + a.p, 0), "clearing the board banks everything, no steal");
s = newMatch({ mid: 3, type: "likely", series: ["onepiece"], teams: { A: [1], B: [2] }, q: eligible(lib, "likely", ["onepiece"]).find(c => c.g === "x-loyal"), now: NOW, rounds: 1 });
bd = stateBoard(lib, s);
for (let i = 0; i < 4; i++) act(s, { k: "guess", by: actorOf(s), tk: s.tk, cid: 999 }, ctx());
t(s.phase === "reveal" && s.score.A === 0 && s.score.B === 0 && needsQuestion(s), "0-0 after the last round: sudden death");
advance(s, 1, eligible(lib, "likely", ["onepiece"]).find(c => c.g === "x-party"), NOW);
t(s.sd === 1 && s.round === 2 && s.turn === "B", "sudden death round, the other team starts");
bd = stateBoard(lib, s);
act(s, { k: "guess", by: 2, tk: s.tk, cid: bd[0].c }, ctx());
for (let i = 0; i < 3; i++) act(s, { k: "guess", by: 2, tk: s.tk, cid: 999 }, ctx());
act(s, { k: "guess", by: 1, tk: s.tk, cid: 998 }, ctx());
advance(s, 2, null, NOW);
t(s.phase === "over" && s.winner === "B", "sudden death decides the winner");
s = newMatch({ mid: 4, type: "likely", series: ["onepiece"], teams: { A: [1], B: [2] }, q: eligible(lib, "likely", ["onepiece"])[0], now: NOW, rounds: 3 });
bd = stateBoard(lib, s); for (let i = 0; i < 4; i++) act(s, { k: "guess", by: actorOf(s), tk: s.tk, cid: 999 }, ctx());
advance(s, 1, null, NOW);
t(s.phase === "over" && s.why === "out", "no question left: the match ends cleanly instead of breaking");

sect("away players");
s = newMatch({ mid: 5, type: "classic", series: ["onepiece"], teams: { A: [1, 3, 5], B: [2, 4] }, q: C("c-protect_1"), now: NOW });
bd = stateBoard(lib, s);
const away = p => p !== 1;
t(actorOf(s, p => p !== 1) === 3, "an away guesser is skipped");
act(s, { k: "guess", by: 3, tk: s.tk, text: "Luffy" }, ctx({ present: away }));
t(actorOf(s) === 5, "rotation continues after the one who answered");
t(actorOf(s, () => false) === 5, "nobody present: the timer runs on the designated player");

sect("full matches, 2 to 8 players");
for (let n = 2; n <= 8; n++) for (const type of ["classic", "likely"]) {
    const series = n % 2 ? ["onepiece", "naruto"] : ["jjk"], pool = eligible(lib, type, series);
    const T = balanceTeams(Array.from({ length: n }, (_, i) => i + 1));
    let st = newMatch({ mid: 10 + n, type, series, teams: T, q: pickQuestion(pool, { now: NOW, rnd, lib }), now: NOW }), guard = 0, answered = new Set(), err = "";
    while (st.phase !== "over" && guard++ < 500) {
        if (st.phase === "reveal") {
            const c = needsQuestion(st) ? pickQuestion(pool, { used: st.used, now: NOW, rnd, lib }) : null;
            advance(st, st.round, c, NOW); continue;
        }
        const b = stateBoard(lib, st), who = actorOf(st), hidden = b.map((a, i) => i).filter(i => st.rev[i] == null);
        const hit = rnd() < .55 && hidden.length, a = b[hidden[(rnd() * hidden.length) | 0]];
        const r = act(st, type === "likely" ? { k: "guess", by: who, tk: st.tk, cid: hit ? a.c : 1 } : { k: "guess", by: who, tk: st.tk, text: hit ? a.t : "zzz wrong" }, { board: b, now: NOW });
        if (r) { err = r; break; }
        answered.add(who);
    }
    const banked = st.log.reduce((x, l) => x + l.pts, 0);
    t(!err && st.phase === "over", `${n}p ${type}: match finishes (${err})`);
    t(st.score.A + st.score.B === banked, `${n}p ${type}: scores = banked pots`);
    t(st.round >= st.rounds && new Set(st.used.map(u => u.key)).size === st.used.length, `${n}p ${type}: ${st.round} rounds, no repeats`);
    t(answered.size === n, `${n}p ${type}: everyone got to answer (${answered.size}/${n})`);
    t(st.winner === (st.score.A > st.score.B ? "A" : st.score.B > st.score.A ? "B" : ""), `${n}p ${type}: winner matches the score`);
}

console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
