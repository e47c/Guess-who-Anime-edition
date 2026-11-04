// Anime Feud library check: node tools/feud-check.mjs   (exit code 1 on any error)
// Validates every pack in js/feud/packs/ and prints what each series / mix can play.
import { buildLibrary, eligible, poolInfo, norm, stem, boardFor, FEUD_RULES } from "../js/feud/engine.js";
import { PACKS } from "../js/feud/packs/index.js";
import { CHARS } from "../js/draft/data.js";

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
        if (sum > 100) errors.push(`${id}: ${s} points add up to ${sum} (max 100)`);
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
    if (b.opp && lib.boards[b.opp] && b.id < b.opp) {
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
    const list = boardFor(lib.boards[c.g], ps);
    if (list.some(a => a.s !== "any" && !ps.includes(a.s))) errors.push(`${c.g}: shows a series that wasn't ticked`);
});

const nb = B.length, nq = Q.length;
console.log(`Anime Feud library ${lib.version}: ${nq} questions on ${nb} boards (${B.filter(b => b.type === "classic").length} Classic, ${B.filter(b => b.type === "likely").length} Most Likely), ${new Set(B.map(b => b.fam)).size} families, ${B.filter(b => b.opp).length / 2} opposite pairs.`);
console.log(report.join("\n"));
if (warns.length) console.log("\nWarnings (" + warns.length + "):\n  " + warns.join("\n  "));
if (errors.length) { console.log("\nERRORS (" + errors.length + "):\n  " + errors.join("\n  ")); process.exit(1); }
console.log("\n0 errors.");
