// Anime Feud library check: node tools/feud-check.mjs   (exit code 1 on any error)
// Validates every pack in js/feud/packs/ and prints what each series / mix can play.
import { buildLibrary, eligible, poolInfo, norm, stem, boardFor, pairsFor, FEUD_RULES } from "../js/feud/engine.js";
import { PACKS } from "../js/feud/packs/index.js";
import { CHARS } from "../js/draft/data.js";
import { TRAITS, TRAIT_INFO, ANCHORS, parseTraits } from "../js/feud/packs/traits.js";

const lib = buildLibrary(PACKS);
const errors = lib.issues.filter(i => i.level === "error").map(i => `${i.pack}/${i.board || "-"}: ${i.msg}`);
const warns = lib.issues.filter(i => i.level !== "error").map(i => `${i.pack}/${i.board || "-"}: ${i.msg}`);
const B = Object.values(lib.boards), SERIES = Object.keys(CHARS);
const BAD_WORDS = /\b(fuck|shit|bitch|cunt|nigg|fag|retard|rape|porn|nsfw)\w*/i;
const words = t => new Set(norm(t).replace(/\b(who|which|what|name|would|is|the|most|be|to|a|an|of|in|from|character|characters|anime|s|their|you|your|with|that|one|on|for|and|or|do|does)\b/g, " ").split(" ").filter(w => w.length > 2).map(w => w.replace(/s$/, "")));
const jac = (a, b) => { const A = words(a), C = words(b); if (!A.size || !C.size) return 0; let n = 0; A.forEach(x => { if (C.has(x)) n++; }); return n / (A.size + C.size - n); };

// --- every board ---
B.forEach(b => {
    const id = b.pack + "/" + b.id;
    const bySeries = {};
    b.ans.forEach(a => (bySeries[a.s] = bySeries[a.s] || []).push(a));
    Object.entries(bySeries).forEach(([s, list]) => {
        const sum = list.reduce((t, a) => t + a.p, 0);
        if (b.type === "classic" && sum > 100) errors.push(`${id}: ${s} points add up to ${sum} (max 100)`);
        for (let i = 1; i < list.length; i++) if (list[i].p > list[i - 1].p) { warns.push(`${id}: ${s} is not ranked best-first (${list[i - 1].t} ${list[i - 1].p} < ${list[i].t} ${list[i].p})`); break; }
        // two answers of the same line that accept the same text = an ambiguous board
        const seen = new Map();
        list.forEach(a => a.keys.forEach(k => { if (seen.has(k) && seen.get(k) !== a.id) errors.push(`${id}: ${s} "${k}" is accepted by two answers`); seen.set(k, a.id); }));
    });
    if (b.only && b.ans.length < FEUD_RULES.minAnswers) errors.push(`${id}: single-series board has ${b.ans.length} answers (min ${FEUD_RULES.minAnswers})`);
    if (b.generic && b.ans.length < FEUD_RULES.minAnswers) errors.push(`${id}: generic board has ${b.ans.length} answers`);
    if (b.generic && b.ans.some(a => a.c)) errors.push(`${id}: generic board lists a character`);
    if (!b.only && !b.generic && Object.keys(bySeries).length < 2) warns.push(`${id}: crossover board covers only ${Object.keys(bySeries).join()}`);
    b.ans.forEach(a => { if (BAD_WORDS.test(a.t + " " + a.al.join(" "))) errors.push(`${id}: inappropriate answer "${a.t}"`); });
    // opposites: their own board, never the original reversed
    // (trait boards are computed from one score per character; their opposites are checked duel by duel further down)
    if (b.opp && lib.boards[b.opp] && b.id < b.opp && !(b.trait && lib.boards[b.opp].trait)) {
        const o = lib.boards[b.opp];
        if (o.fam !== b.fam) warns.push(`${id}: opposite ${o.id} is in another family (${o.fam})`);
        Object.keys(bySeries).forEach(s => {
            const x = b.ans.filter(a => a.s === s).map(a => a.c || stem(a.t)), y = o.ans.filter(a => a.s === s).map(a => a.c || stem(a.t));
            if (x.length >= 3 && x.join() === y.slice().reverse().join()) errors.push(`${id}: ${s} opposite board is just this ranking reversed`);
            const shared = x.filter(v => y.includes(v)).length;
            if (x.length >= 4 && shared / x.length >= .6) warns.push(`${id} vs ${o.id}: ${s} shares ${shared}/${x.length} answers (check the opposite board was ranked on its own)`);
        });
    }
});
// --- wordings ---
/* ---------- the accuracy review ----------
   - every board says what kind of question it is and how it's ranked (shown to players above the question)
   - "fans" boards: roster answers must follow AniList favourites (data/draft-pop.json); popularity drifts weekly, so a warning
   - "agree" boards (opinion boards about a rated quality): no answer may sit above one rated clearly better/worse in that stat
   - "feats" boards are generated from the Draft ratings, so they can't disagree with them */
import fs from "fs";
const pop = JSON.parse(fs.readFileSync(new URL("../data/draft-pop.json", import.meta.url), "utf8")).chars;
const COL = { STR: 2, SPD: 3, IQ: 4, DUR: 5, CMB: 6 }, row = {};
Object.values(CHARS).forEach(rows => rows.forEach(r => { row[r[0]] = r; }));
const KINDS = { canon: 1, feats: 1, power: 1, poll: 1, traits: 1 };
B.forEach(b => {
    const id = b.pack + "/" + b.id;
    if (!KINDS[b.kind]) errors.push(`${id}: kind must be canon, feats, power, poll or traits (got ${b.kind})`);
    if ((b.kind === "traits") !== !!b.trait) errors.push(`${id}: a traits board is generated from the trait scores (trait: { key }) and only those`);
    if (b.trait && !TRAIT_INFO[b.trait.key]) errors.push(`${id}: unknown trait ${b.trait.key}`);
    if (b.kind === "traits" && !b.why) errors.push(`${id}: say what the ranking is based on (why)`);
    // opinion boards and their opposites: nobody can be both the best and the worst leader, roommate, survivor...
    if (b.type === "likely" && b.kind === "poll" && b.opp && lib.boards[b.opp] && lib.boards[b.opp].kind === "poll" && b.id < b.opp) {
        const o = lib.boards[b.opp];
        b.ans.filter(a => a.c && o.ans.some(x => x.c === a.c)).forEach(a => errors.push(`${id}: ${a.s} ${a.t} is on this board and on its opposite ${o.id}`));
    }
    if (b.kind === "canon" && !["fans", "known"].includes(b.rank)) errors.push(`${id}: a canon board needs rank "fans" or "known"`);
    if (b.kind === "feats" && !b.gen) errors.push(`${id}: a feats board is generated from the ratings (gen: { stat })`);
    if ((b.kind === "power" || b.kind === "feats") && !b.why) errors.push(`${id}: say what the ranking is based on (why)`);
    if (b.rank === "fans") {
        const by = {}; b.ans.filter(a => a.c).forEach(a => (by[a.s] = by[a.s] || []).push(a));
        Object.entries(by).forEach(([s, list]) => {
            list.sort((x, y) => y.p - x.p);
            for (let i = 1; i < list.length; i++) {
                const f0 = (pop[list[i - 1].c] || [0])[0], f1 = (pop[list[i].c] || [0])[0];
                if (list[i].p < list[i - 1].p && f1 > f0 * 1.15) { warns.push(`${id}: ${s} popularity drifted (${list[i].t} now has more AniList favourites than ${list[i - 1].t}); re-rank this line`); break; }
            }
        });
    }
    if (b.beats) Object.entries(b.beats).forEach(([s, list]) => list.forEach(([w, l]) => {      // canon outcomes: the winner ranks higher
        const W = b.ans.find(a => a.s === s && a.t === w), L = b.ans.find(a => a.s === s && a.t === l);
        if (!W || !L) errors.push(`${id}: ${s} outcome ${w} > ${l} names someone who isn't on the board`);
        else if (!(W.p > L.p)) errors.push(`${id}: ${s} ranks ${l} (${L.p}) at or above ${w} (${W.p}), but ${w} beat them in canon`);
    }));
    if (b.agree) {
        const col = COL[b.agree.stat], dir = b.agree.dir || 1, tol = b.agree.tol || 10, by = {};
        b.ans.filter(a => a.c).forEach(a => (by[a.s] = by[a.s] || []).push(a));
        Object.entries(by).forEach(([s, list]) => list.forEach(x => list.forEach(y => {
            if (x.p > y.p && dir * (row[y.c][col] - row[x.c][col]) > tol) errors.push(`${id}: ${s} ranks ${x.t} above ${y.t}, but their ${b.agree.stat} ratings say the opposite (${row[x.c][col]} vs ${row[y.c][col]})`);
        })));
    }
});
/* ---------- the character traits (Most Likely personality duels) ----------
   - every row is a real Anime Draft character, scores are 0-9 on known traits, every row has a note
   - ANCHORS: facts of the story the scores must agree with (Teach betrayed Whitebeard, so his betrayal score is high)
   - contradictions: very kind AND very cruel, very honest AND a skilled liar, hard-working AND lazy; loyal AND a
     betrayer only when the note explains it (Itachi: loyal to the Leaf, traitor to his clan)
   - opposite boards never give the same two characters the same winner (kinder AND crueler) */
const tIdx = {};
Object.entries(TRAITS).forEach(([s, rows]) => {
    if (!CHARS[s]) { errors.push(`traits: unknown series ${s}`); return; }
    const seen = new Set();
    rows.forEach(([name, str, note]) => {
        const hits = CHARS[s].filter(r => r[1] === name);
        if (hits.length !== 1) errors.push(`traits: ${s} "${name}" is not exactly one Anime Draft character`);
        if (seen.has(name)) errors.push(`traits: ${s} ${name} listed twice`); seen.add(name);
        if (!note || note.length < 15) errors.push(`traits: ${s} ${name} needs a note on the canon behaviour`);
        const t = parseTraits(str);
        Object.keys(t).forEach(k => { if (!TRAIT_INFO[k] || !(t[k] >= 0 && t[k] <= 9)) errors.push(`traits: ${s} ${name} has a bad score "${k}"`); });
        if (Object.keys(t).length < 5) warns.push(`traits: ${s} ${name} has only ${Object.keys(t).length} traits scored`);
        const both = (a, b, lim) => t[a] >= lim && t[b] >= lim;
        if (both("K", "C", 7)) errors.push(`traits: ${s} ${name} is scored both very kind and very cruel`);
        if (both("H", "M", 7)) errors.push(`traits: ${s} ${name} is scored both very honest and a skilled liar`);
        if (both("D", "Z", 7)) errors.push(`traits: ${s} ${name} is scored both very hard-working and very lazy`);
        if (both("L", "T", 7) && !/betray|traitor|turned on/i.test(note)) errors.push(`traits: ${s} ${name} is scored both very loyal and a betrayer, and the note doesn't explain it`);
        if (hits.length === 1) tIdx[s + "|" + name] = t;
    });
});
ANCHORS.forEach(([s, name, k, op, v, why]) => {
    const t = tIdx[s + "|" + name];
    if (!t) return errors.push(`traits anchor: ${s} ${name} has no trait row`);
    if (t[k] == null) return errors.push(`traits anchor: ${s} ${name} has no ${k} score (${why})`);
    if (op === ">=" ? t[k] < v : t[k] > v) errors.push(`traits anchor: ${s} ${name} ${k}${t[k]} contradicts the story (${why}: needs ${op} ${v})`);
});
let traitPairs = 0;
B.filter(b => b.trait && b.opp && lib.boards[b.opp] && lib.boards[b.opp].trait && b.id < b.opp).forEach(b => {
    const o = lib.boards[b.opp], name = c => (b.ans.find(a => a.c === c) || o.ans.find(a => a.c === c) || {}).t;
    Object.keys(TRAITS).forEach(s => {
        const mine = new Map(pairsFor(b, [s]).map(p => [p.w + ">" + p.l, p]));
        pairsFor(o, [s]).forEach(p => { traitPairs++; if (mine.has(p.w + ">" + p.l)) errors.push(`${b.id} / ${o.id}: ${s} ${name(p.w)} beats ${name(p.l)} on both opposite questions`); });
    });
});
B.filter(b => b.trait).forEach(b => {
    const thin = Object.keys(TRAITS).filter(s => pairsFor(b, [s]).length < 3);
    if (thin.length > 3) warns.push(`${b.id}: fewer than 3 duels in ${thin.join(", ")}`);
});
const Q = lib.questions;
const seenText = new Map();
Q.forEach(q => {
    if (BAD_WORDS.test(q.questionText)) errors.push(`${q.questionId}: inappropriate wording`);
    const k = norm(q.questionText);
    if (seenText.has(k)) errors.push(`${q.questionId}: same wording as ${seenText.get(k)}`); else seenText.set(k, q.questionId);
});
for (let i = 0; i < Q.length; i++) for (let j = i + 1; j < Q.length; j++) {
    const a = Q[i], b = Q[j]; if (a.questionType !== b.questionType) continue;
    const s = jac(a.questionText, b.questionText);
    if (a.variantGroupId === b.variantGroupId) { if (s >= .85) warns.push(`${a.questionId} / ${b.questionId}: rewording is little more than a synonym swap`); }
    else if (s >= .8 && lib.boards[a.variantGroupId].opp !== b.variantGroupId) warns.push(`${a.questionId} / ${b.questionId}: different boards, nearly the same question ("${a.questionText}" / "${b.questionText}")`);
}

// --- coverage: what can each series play on its own, and do mixes work ---
const need = FEUD_RULES.rounds + 1;     // 5 rounds + a possible sudden death
const report = [];
for (const type of ["classic", "likely"]) {
    SERIES.forEach(s => {
        const p = poolInfo(lib, type, [s]);
        report.push(`${type.padEnd(7)} ${s.padEnd(12)} ${String(p.questions).padStart(3)} questions, ${String(p.boards).padStart(2)} boards, ${p.families} families${p.boards < need ? "   <- under " + need + " boards: only shorter matches" : ""}`);
    });
    const pairs = [["onepiece", "naruto"], ["jjk", "demonslayer"], ["deathnote", "frieren"], ["gachiakuta", "windbreaker"], ["onepiece", "naruto", "dragonball", "bleach"], SERIES];
    pairs.forEach(ps => { const p = poolInfo(lib, type, ps); report.push(`${type.padEnd(7)} mix ${ps.length > 4 ? "all " + ps.length : ps.join("+")}: ${p.questions} questions, ${p.boards} boards`); });
}
// every mixed board only shows ticked series
for (const type of ["classic", "likely"]) for (const ps of [["onepiece", "naruto"], ["jjk", "aot", "mha"]]) eligible(lib, type, ps).forEach(c => {
    const B = lib.boards[c.g], seriesOf = id => (B.ans.find(a => a.c === id) || {}).s;
    const shown = type === "likely" ? pairsFor(B, ps).flatMap(p => [seriesOf(p.w), seriesOf(p.l)]) : boardFor(B, ps).map(a => a.s);
    if (shown.some(x => x !== "any" && !ps.includes(x))) errors.push(`${c.g}: shows a series that wasn't ticked`);
});

const nb = B.length, nq = Q.length;
console.log(`Anime Feud library ${lib.version}: ${nq} questions on ${nb} boards (${B.filter(b => b.type === "classic").length} Classic, ${B.filter(b => b.type === "likely").length} Most Likely), ${new Set(B.map(b => b.fam)).size} families, ${B.filter(b => b.opp).length / 2} opposite pairs.`);
console.log(report.join("\n"));
console.log(`Character traits: ${Object.values(TRAITS).flat().length} characters in ${Object.keys(TRAITS).length} series, ${Object.values(tIdx).reduce((n, t) => n + Object.keys(t).length, 0)} scores, ${ANCHORS.length} story anchors, ${traitPairs} opposite-board duels cross-checked.`);
if (warns.length) console.log("\nWarnings (" + warns.length + "):\n  " + warns.join("\n  "));
if (errors.length) { console.log("\nERRORS (" + errors.length + "):\n  " + errors.join("\n  ")); process.exit(1); }
console.log("\n0 errors.");
