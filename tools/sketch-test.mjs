// Anime Sketch rules + word library tests: node tools/sketch-test.mjs
import { SK, norm, maskOf, letters, hintMax, pickHint, hintAt, spans, buildWords, poolFor, pickOptions, newMatch, act, eligible, allGot, hasGot, gotList,
    hintDue, standings, ptsFor, fp, prints, claim, near, wordPrints, del1, CATS, TYPO_MIN, parseEntry,
    CT, isContest, rateMsFor, contestWord, seeded, ents, isDone, ratedBy, toRate, ratedAll, allDone, allRated, tally, newContest } from "../js/sketch/engine.js";
import { LIBRARY } from "../js/sketch/words.js";
import { CHARS } from "../js/draft/data.js";

let ok = 0, bad = 0;
const t = (c, m) => { if (c) ok++; else { bad++; console.log("  ✘", m); } };
const sect = s => console.log("• " + s);
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

sect("word library");
const W = buildWords({ library: LIBRARY, chars: CHARS });
const SERIES = Object.keys(LIBRARY);
const cnt = (s, c) => W[s].filter(w => w.cat === c).length;
t(SERIES.length === 18 && SERIES.every(s => CHARS[s]), "all 18 series have a word list");
t(SERIES.every(s => W[s].length >= 30), "every series has at least 30 words: " + SERIES.map(s => s + " " + W[s].length).join(", "));
const all = Object.values(W).flat();
t(all.length >= 1000, "a big library (" + all.length + " words)");
t(all.every(w => w.t && w.k && w.f.length && w.f.includes(w.k) && w.cat && w.s && [1, 2, 3].includes(w.d)), "every word has text, category, series, difficulty and accepted spellings");
t(all.every(w => w.t.length <= SK.maxWord && letters(w.t) >= 3), "no word too long or too short");
t(SERIES.every(s => new Set(W[s].map(w => w.k)).size === W[s].length), "no duplicates inside a series");
t(SERIES.every(s => W[s].every(w => !W[s].some(x => x !== w && x.f.includes(w.k)))), "no word is just another word's alternate spelling");
t(SERIES.every(s => { const seen = new Map(); return W[s].every(w => w.f.every(f => { const o = seen.get(f); seen.set(f, w.k); return !o || o === w.k; })); }), "an accepted spelling means one word only, per series");
t(all.every(w => CATS.includes(w.cat)) && CATS.join() === "Character,Weapon,Object", "only Characters, Weapons and Objects & Items");
t(!["Grand Line", "Marineford", "Hidden Leaf Village", "Kamehameha", "Rasengan", "Domain Expansion", "Straw Hat Pirates", "Super Saiyan", "Water Breathing", "Shibuya", "Soul Society", "Konoha"].some(x => all.some(w => w.k === norm(x))), "no places, attacks, powers or groups");
t(SERIES.every(s => cnt(s, "Character") >= 18), "every series has plenty of characters: " + SERIES.map(s => s + " " + cnt(s, "Character")).join(", "));
t(SERIES.every(s => cnt(s, "Object") >= 10), "every series has 10+ objects & items: " + SERIES.map(s => s + " " + cnt(s, "Object")).join(", "));
t(SERIES.filter(s => cnt(s, "Weapon") >= 5).length >= 16, "16 of 18 series have 5+ weapons (Death Note and Wind Breaker barely use weapons): " + SERIES.map(s => s + " " + cnt(s, "Weapon")).join(", "));
t(SERIES.every(s => [1, 2, 3].every(d => W[s].some(w => w.d === d))), "every series has easy, medium and hard words");
t(["Character", "Weapon", "Object"].every(c => [1, 2, 3].every(d => all.some(w => w.cat === c && w.d === d))), "every category has easy, medium and hard words");
// every roster link points at a real Anime Draft character (that's the picture at the reveal)
const links = SERIES.flatMap(s => Object.values(LIBRARY[s]).flatMap(v => String(v).split(";").map(x => x.trim()).filter(Boolean).map(parseEntry).filter(e => e.link).map(e => [s, e.link])));
t(links.length > 400 && links.every(([s, n]) => CHARS[s].some(r => r[1] === n)), "every roster link is an Anime Draft character (" + links.length + " links)");
t(all.filter(w => w.cat !== "Character").every(w => !w.c), "only characters carry a picture");
const luffy = W.onepiece.find(w => w.c === 40);
t(luffy && luffy.f.includes("luffy") && !luffy.f.includes("monkey"), "Monkey D. Luffy: 'luffy' counts, the shared 'monkey' doesn't");
t(!luffy.f.includes("straw hat") && W.onepiece.some(w => w.k === "straw hat" && w.cat === "Object"), "a spelling means one word only: 'straw hat' is the hat, not Luffy's nickname");
const ita = W.naruto.find(w => w.t === "Itachi Uchiha");
t(ita && ita.f.includes("itachi") && !ita.f.includes("uchiha"), "Itachi: 'itachi' alone counts, 'uchiha' alone doesn't");
const bm = W.onepiece.find(w => w.t === "Big Mom");
t(bm && bm.c === 54495 && bm.f.includes("charlotte linlin"), "a display name with its roster link: Big Mom = Charlotte Linlin (picture and spelling)");
t(W.dragonball.some(w => w.t === "Senzu Bean" && w.cat === "Object") && W.onepiece.some(w => w.t === "Yoru" && w.cat === "Weapon") && W.jojo.some(w => w.t === "Star Platinum" && w.cat === "Character"), "objects, weapons and Stands as characters");
const wc = W.windbreaker.find(w => w.t === "Wind chime");
t(!!wc && wc.f.includes("furin") && wc.d === 1, "aliases and difficulty (Wind chime / furin, easy)");
t(JSON.stringify(parseEntry("Whitebeard / Edward Newgate @Edward Newgate ^1")) === JSON.stringify({ t: "Whitebeard", al: ["Edward Newgate"], d: 1, link: "Edward Newgate" }) && parseEntry("Kunai").d === 2, "entry format: word / aliases @roster ^difficulty (medium by default)");

sect("normalising + blanks + hints");
t(norm("  Monkey   D.  LUFFY!! ") === "monkey d luffy", "case, punctuation and repeated spaces ignored");
t(norm("Pokémon") === "pokemon" && norm("The One Piece") === "one piece", "accents and a leading 'the' ignored");
t(maskOf("Monkey D. Luffy") === "______ _. _____", "blanks keep spaces and punctuation");
t(maskOf("Gum-Gum Pistol") === "___-___ ______" && maskOf("Super Saiyan 3") === "_____ ______ _", "hyphens shown, digits are slots");
t(letters("Gum-Gum Pistol") === 12, "letters exclude spaces and punctuation");
t(hintMax("Goku") === 1 && hintMax("Sanji") === 1, "short words (≤5 letters): 1 hint");
t(hintMax("Rasengan") === 2 && hintMax("Kakashi Hatake") === 3, "medium (6–10): 2, long (11+): 3");
t(hintMax("Ryuk") === 1 && hintMax("Rem") === 1, "3–4 letter words still get one (never all letters)");
for (const w of all) { if (hintMax(w.t) >= letters(w.t)) { t(false, "hints could reveal all of " + w.t); break; } }
t(true, "no word can be fully revealed by hints");
{
    const w = "Kakashi Hatake", shown = {};
    for (let i = 0; i < hintMax(w); i++) { const p = pickHint(w, shown, rnd); shown[p] = w[p]; }
    const chars = Object.values(shown).map(c => c.toLowerCase());
    t(Object.keys(shown).length === 3 && new Set(chars).size === 3, "hint letters are distinct when possible: " + chars.join(""));
    t(Object.keys(shown).every(i => /[a-z]/i.test(w[i])), "hints only reveal letters, never spaces");
}
t(JSON.stringify(hintAt({ i3: "a", i10: "k", x: "?" })) === JSON.stringify({ 3: "a", 10: "k" }), "hint storage: string keys only");

sect("secret word: fingerprints and guesses");
const salt = "s4lt";
const wh = prints(salt, luffy.f.concat(["straw hat"]));
t(wh.length >= luffy.f.length && wh.every(h => /^[0-9a-z]+$/.test(h)), "fingerprints are opaque strings");
t(!JSON.stringify(wh).includes("luffy"), "the fingerprints don't contain the word");
t(fp("a", "luffy") !== fp("b", "luffy"), "a different salt every turn gives different fingerprints");
t(!!claim("LUFFY", salt, wh) && !!claim("  monkey   d.  luffy ", salt, wh), "exact answer, any case and spacing");
t(!!claim("is it luffy?", salt, wh), "the answer inside a sentence counts (and is never posted to the chat)");
t(!claim("luffyy", salt, wh) && !claim("zoro", salt, wh) && !claim("monkey", salt, wh), "near misses and wrong answers don't");
t(!!claim("gumgum pistol", "x", prints("x", ["gum gum pistol"])), "spaces optional (gumgum pistol)");
{
    const P = wordPrints(salt, luffy.f.concat(["straw hat"]));
    t(!JSON.stringify(P).includes("luff") && !JSON.stringify(P).includes("straw"), "the slip and 'close' fingerprints don't contain the word either");
    t(!!claim("monkey d lufy", salt, P.wh, P.wv) && !!claim("strawhat", salt, P.wh, P.wv) && !!claim("stawr hat", salt, P.wh, P.wv), "one slip is fine on longer answers (monkey d lufy, stawr hat)");
    const gk = wordPrints(salt, ["goku"]);
    t(!claim("gok", salt, gk.wh, gk.wv) && !claim("goky", salt, gk.wh, gk.wv) && !!claim("Goku", salt, gk.wh, gk.wv), "short answers (under " + TYPO_MIN + " letters) must be exact");
    t(["luffi", "luff", "lufy", "monkey", "is it luffi", "straw hats?"].every(m => near(m, salt, P.wt)), "close guesses are recognised (luffi, luff, monkey...)");
    t(["zoro", "nice drawing", "lol", "is that a boat", "haha"].every(m => !near(m, salt, P.wt)), "ordinary chat isn't");
    t(del1("abc").sort().join() === "ab,abc,ac,bc", "one-letter-missing variants");
    const pk = wordPrints("z", ["charlotte katakuri", "katakuri"]);
    t(near("kata", "z", pk.wt) && near("charlotte", "z", pk.wt) && near("katakuri", "z", pk.wt), "any word of the answer, or its first letters, is close");
}
t(spans("x y z").length === 7, "every run of words is checked");

sect("word options");
const o1 = pickOptions(W, ["onepiece"], { rnd });
t(o1.length === 3 && new Set(o1.map(w => w.id)).size === 3, "3 different words");
t(o1.every(w => w.s === "onepiece"), "single anime: words from that series only");
const o2 = pickOptions(W, ["onepiece", "naruto", "jjk"], { rnd });
t(o2.every(w => ["onepiece", "naruto", "jjk"].includes(w.s)), "Anime Mix: only the ticked series");
{
    let balanced = 0, allCat = new Set(), mixSeries = new Set(), catCount = { Character: 0, Weapon: 0, Object: 0 };
    for (let i = 0; i < 400; i++) {
        const o = pickOptions(W, ["onepiece", "naruto", "jjk"], { rnd });
        const cats = o.map(w => w.cat); cats.forEach(c => { allCat.add(c); catCount[c]++; }); o.forEach(w => mixSeries.add(w.s));
        if (cats.join() === "Character,Weapon,Object") balanced++;
    }
    t(balanced === 400, "every pick offers one character, one weapon and one object & item, in that order (" + balanced + "/400)");
    t(allCat.size === 3 && mixSeries.size === 3, "every category and every ticked series shows up");
    t(catCount.Character === catCount.Weapon && catCount.Weapon === catCount.Object, "no category dominates: " + JSON.stringify(catCount));
    // a series without weapons still gets three words (the weapon slot is filled from the others)
    const wb = pickOptions(W, ["windbreaker"], { rnd });
    t(wb.length === 3 && new Set(wb.map(w => w.k)).size === 3 && wb[0].cat === "Character", "Wind Breaker (no weapons): still three different words");
    // difficulty: the setting decides which words are offered, for every drawer alike
    for (const d of [1, 2, 3]) {
        let match = 0, n = 0;
        for (let i = 0; i < 200; i++) pickOptions(W, ["onepiece"], { rnd, diff: d }).forEach(w => { n++; if (w.d === d) match++; });
        t(match / n > .9, "difficulty " + d + ": " + Math.round(100 * match / n) + "% of the words offered are that level");
    }
    const hard = pickOptions(W, ["deathnote"], { rnd, diff: 3 });
    t(hard.length === 3, "a level that runs short falls back to the nearest level, never fewer than three words");
    // recently offered words wait their turn
    const first = pickOptions(W, ["onepiece"], { rnd }), next = pickOptions(W, ["onepiece"], { rnd, recent: first.map(w => w.id) });
    t(next.every(w => !first.some(x => x.id === w.id)), "words this browser was just offered aren't offered again straight away");
}
const used = W.gachiakuta.slice(0, W.gachiakuta.length - 3).map(w => w.t);
const o3 = pickOptions(W, ["gachiakuta"], { used, rnd });
t(o3.length === 3 && o3.every(w => !used.includes(w.t)), "never a word already drawn this match");

/* ---------------- match helpers ---------------- */
const NOW = Date.UTC(2026, 10, 4, 12);
function run(s, a, now, present) { const c = JSON.parse(JSON.stringify(s)); const err = act(c, a, { now, present: present || (() => true) }); return { err, s: err ? s : c }; }
function pickWord(s, w, now) { const sa = "salt" + s.n, P = wordPrints(sa, w.f); const r = run(s, { k: "pick", by: s.drawer, tk: s.n, mask: maskOf(w.t), salt: sa, wh: P.wh, wv: P.wv, wt: P.wt, cat: w.cat, hm: hintMax(w.t) }, now); return r.s; }
const guess = (s, p, text, now, present) => run(s, { k: "guess", by: p, tk: s.n, h: claim(text, s.salt, s.wh, s.wv) || "nope" }, now, present);

sect("a turn: scoring, order, duplicates");
let s = newMatch({ mid: 1, series: ["onepiece"], players: [1, 2, 3, 4, 5], rounds: 2, timer: 90, now: NOW, rnd });
t(s.phase === "pick" && s.round === 1 && s.n === 1 && s.order.length === 5 && s.drawer === s.order[0], "the match opens with the first drawer picking");
t(Object.keys(s.score).length === 5 && Object.values(s.score).every(v => v === 0), "everyone starts at 0");
t(run(s, { k: "pick", by: s.order[1], tk: 1, mask: "_", salt: "x", wh: ["a"], hm: 1 }, NOW).err, "only the drawer picks");
s = pickWord(s, luffy, NOW + 3000);
t(s.phase === "draw" && s.dl === NOW + 3000 + 90000 && !JSON.stringify(s).toLowerCase().includes("luffy"), "drawing: 90 s, and the word is nowhere in the shared state");
const D = s.drawer, G = s.order.slice(1);
t(run(s, { k: "guess", by: D, tk: 1, h: s.wh[0] }, NOW + 4000).err, "the drawer can't guess their own word");
t(guess(s, 9, "luffy", NOW + 4000).err === "Spectators can't guess.", "spectators can't guess");
t(guess(s, G[0], "zoro", NOW + 4000).err === "wrong", "a wrong guess changes nothing");
let r = guess(s, G[0], "Luffy", NOW + 10000); s = r.s;
t(!r.err && s.score["p" + G[0]] === 100 && s.score["p" + D] === 25, "first right guess +100, drawer +25");
t(guess(s, G[0], "luffy", NOW + 10500).err === "already", "a repeated right guess scores nothing");
s = guess(s, G[1], "luffy", NOW + 12000).s; s = guess(s, G[2], "monkey d lufy", NOW + 12001).s;
t(s.score["p" + G[1]] === 75 && s.score["p" + G[2]] === 50 && s.score["p" + D] === 75, "second +75, third +50, drawer +25 each");
t(gotList(s).map(g => g.p).join() === [G[0], G[1], G[2]].join() && s.phase === "draw", "the order of correct guesses is kept");
// two right guesses arriving at the same moment: each transaction sees the other's result, so the order is strict
const sA = guess(s, G[3], "luffy", NOW + 13000).s, sB = guess(sA, G[3], "luffy", NOW + 13000);
t(sA.score["p" + G[3]] === 25 && sB.err && sA.phase === "reveal" && sA.why === "all", "4th +25; everyone got it → the turn ends at once; the duplicate is refused");
t(sA.score["p" + D] === 100 && standings(sA)[0].score === 100, "drawer: +25 × 4 = 100");
t(ptsFor(0) === 100 && ptsFor(1) === 75 && ptsFor(2) === 50 && ptsFor(3) === 25 && ptsFor(7) === 25, "points table");
t(run(sA, { k: "word", by: G[0], tk: 1, word: "x" }, NOW + 13100).err && !run(sA, { k: "word", by: D, tk: 1, word: "Monkey D. Luffy", c: 40 }, NOW + 13100).err, "only the drawer writes the word for the reveal");
s = run(sA, { k: "word", by: D, tk: 1, word: "Monkey D. Luffy", c: 40 }, NOW + 13100).s;
t(s.word === "Monkey D. Luffy" && s.log[0].w === "Monkey D. Luffy" && s.log[0].got.length === 4, "the reveal and the log show the word and who got it");
t(run(s, { k: "next", tk: 1 }, NOW + 13100 + 1000).err === "stale", "the reveal stays up before moving on");
let r2 = run(s, { k: "next", tk: 1 }, NOW + 13100 + SK.revealMs + 10);
t(!r2.err && r2.s.n === 2 && r2.s.drawer === s.order[1] && r2.s.phase === "pick", "next turn: the next player in order draws");
t(run(r2.s, { k: "next", tk: 1 }, NOW + 30000).err === "stale", "a duplicate 'next' can't advance twice");

sect("nobody guesses · timers · hints");
for (const sec of SK.timerChoices) {
    let m = newMatch({ mid: 2, series: ["naruto"], players: [1, 2], rounds: 1, timer: sec, now: NOW, rnd });
    m = pickWord(m, ita, NOW);
    t(m.dl === NOW + sec * 1000, sec + " s timer");
    t(run(m, { k: "timeout", tk: m.n }, NOW + sec * 1000 - 1).err === "stale", sec + " s: no early timeout");
    const e = run(m, { k: "timeout", tk: m.n }, NOW + sec * 1000 + 1);
    t(!e.err && e.s.phase === "reveal" && e.s.why === "time" && Object.values(e.s.score).every(v => v === 0), sec + " s: time's up, nobody guessed → no points for anyone");
}
{
    let m = newMatch({ mid: 3, series: ["naruto"], players: [1, 2, 3], rounds: 1, timer: 120, now: NOW, rnd });
    m = pickWord(m, ita, NOW);              // "Itachi Uchiha": 12 letters → 3 hints
    t(m.hm === 3 && hintDue(m) === NOW + 20000, "first hint due 20 s in");
    const H = (mm, at) => { const i = pickHint(ita.t, mm.hint, rnd); return run(mm, { k: "hint", by: mm.drawer, tk: mm.n, i, c: ita.t[i] }, at); };
    t(H(m, NOW + 15000).err === "stale", "no hint before it's due");
    t(run(m, { k: "hint", by: m.order[1], tk: m.n, i: 0, c: "I" }, NOW + 21000).err, "only the drawer's browser reveals letters");
    m = H(m, NOW + 20000).s;
    t(m.hn === 1 && Object.keys(hintAt(m.hint)).length === 1 && hintDue(m) === NOW + 35000, "hint 1 at 20 s, next due 15 s later");
    const other = m.order.find(p => p !== m.drawer);
    m = guess(m, other, "itachi", NOW + 30000).s;
    t(hintDue(m) === NOW + 50000, "a correct guess resets the hint clock (next hint 20 s after it)");
    m = H(m, NOW + 50000).s; m = H(m, NOW + 65000).s;
    t(m.hn === 3 && isFinite(hintDue(m)) === false, "3 hints max for a long word, then no more");
    t(H(m, NOW + 90000).err === "stale", "never more than the word's hint count");
    t(Object.keys(hintAt(m.hint)).length < letters(ita.t), "the hints never spell the whole word");
}

sect("rounds, rotation, joiners and leavers");
{
    let m = newMatch({ mid: 4, series: ["jjk"], players: [1, 2, 3, 4], rounds: 3, timer: 60, now: NOW, rnd }), now = NOW, drawers = [], rounds = [];
    let present = new Set([1, 2, 3, 4]); const pres = p => present.has(Number(p));
    let joinedAt = 0;
    for (let guard = 0; guard < 60 && m.phase !== "over"; guard++) {
        if (m.phase === "pick") { drawers.push(m.drawer); rounds.push(m.round); m = pickWord(m, W.jjk[guard % W.jjk.length], now += 2000); continue; }
        if (m.phase === "draw") {
            if (m.n === 2) {        // a spectator (5) asks to join mid-round
                const j = run(m, { k: "join", by: 5 }, now, p => p === 5 || pres(p)); m = j.s; joinedAt = m.round;
                t(!j.err && m.pend.p5 && !m.players.includes(5), "a spectator queues for the next round, not this one");
                t(guess(m, 5, W.jjk[1 % W.jjk.length].t, now + 100, pres).err === "Spectators can't guess.", "queued spectators still can't guess this round");
            }
            for (const p of eligible(m, pres)) m = guess(m, p, W.jjk[guard % W.jjk.length].t.split(" ")[0] === "" ? "x" : W.jjk[guard % W.jjk.length].t, now += 500, pres).s;
            if (m.phase === "draw") m = run(m, { k: "timeout", tk: m.n }, now = m.dl + 1, pres).s;
            continue;
        }
        if (m.phase === "reveal") { m = run(m, { k: "next", tk: m.n }, now = m.nx + 1, p => p === 5 || pres(p)).s; if (m.phase === "round") t(m.round === rounds[rounds.length - 1], "round summary after everyone drew"); continue; }
        if (m.phase === "round") { present.add(5); m = run(m, { k: "next", tk: m.n }, now = m.nx + 1, pres).s; continue; }
    }
    const r1 = drawers.filter((_, i) => rounds[i] === 1), r2d = drawers.filter((_, i) => rounds[i] === 2), r3 = drawers.filter((_, i) => rounds[i] === 3);
    t(r1.length === 4 && new Set(r1).size === 4 && !r1.includes(5), "round 1: each of the 4 players draws exactly once");
    t(r2d.length === 5 && new Set(r2d).size === 5 && r2d[4] === 5, "round 2: the newcomer is in, at the end of the order");
    t(r3.length === 5 && r3.join() === r2d.join(), "round 3: same order");
    t(m.phase === "over" && drawers.length === 14, "3 rounds = 4 + 5 + 5 turns, then the match ends");
    t(m.winners.length >= 1 && m.winners.every(p => m.score["p" + p] === Math.max(...Object.values(m.score))), "the winner has the top score");
}
{
    // a player leaves mid-round: their turn is skipped, the rest go on; a drawer who leaves loses the turn
    let m = newMatch({ mid: 5, series: ["bleach"], players: [1, 2, 3], rounds: 1, timer: 60, now: NOW, rnd }), now = NOW;
    const order = m.order.slice(), present = new Set([1, 2, 3]), pres = p => present.has(Number(p));
    m = pickWord(m, W.bleach[0], now);
    const g1 = order[1], g2 = order[2];
    m = guess(m, g1, W.bleach[0].t, now += 1000, pres).s;
    t(m.phase === "draw", "one of two guessers has it: the turn goes on");
    present.delete(g2);               // the other guesser drops out
    const c = run(m, { k: "check", tk: m.n }, now += 500, pres);
    t(!c.err && c.s.phase === "reveal" && c.s.why === "all", "a guesser left: everyone still here has it → the turn ends");
    m = run(c.s, { k: "next", tk: m.n }, now = c.s.nx + 1, pres).s;
    t(m.drawer === g1 && m.phase === "pick", "next drawer");
    m = pickWord(m, W.bleach[1], now += 500);
    present.delete(g1); const before = m.score["p" + g1];
    t(run(m, { k: "gone", tk: m.n }, now += 100, p => p !== g1 && pres(p)).s.why === "left", "a drawer who goes offline loses the turn");
    m = run(m, { k: "gone", tk: m.n }, now, pres).s;
    t(m.log[1].got.length === 0 && m.log[1].bonus === 0 && m.score["p" + g1] === before, "no points from a turn the drawer left");
    m = run(m, { k: "next", tk: m.n }, now = m.nx + 1, pres).s;
    t(m.phase === "over", "the offline player's turn is skipped and the 1-round match ends");
}
{
    let m = newMatch({ mid: 6, series: ["aot"], players: [1, 2], rounds: 1, timer: 60, now: NOW, rnd });
    const e = run(m, { k: "timeout", tk: m.n }, NOW + SK.pickMs + 1);
    t(!e.err && e.s.why === "skip" && e.s.nx === NOW + SK.pickMs + 1 + SK.skipMs, "a drawer who never picks: turn skipped (short reveal)");
    t(run(m, { k: "join", by: 1 }, NOW).err === "stale", "players already in can't queue");
    let q = run(m, { k: "join", by: 3 }, NOW).s; q = run(q, { k: "unjoin", by: 3 }, NOW).s;
    t(!q.pend, "a spectator can change their mind");
}

sect("full matches: 2 and 8 players");
for (const n of [2, 8]) {
    const players = Array.from({ length: n }, (_, i) => i + 1);
    let m = newMatch({ mid: 10 + n, series: n === 2 ? ["dragonball"] : ["onepiece", "naruto", "jjk"], players, rounds: 3, timer: 90, now: NOW, rnd }), now = NOW, turns = 0, usedW = [];
    for (let guard = 0; guard < 200 && m.phase !== "over"; guard++) {
        if (m.phase === "pick") { const opts = pickOptions(W, m.series, { used: usedW, rnd }); t(opts.length === 3, "3 options"); const w = opts[0]; usedW.push(w.t); m = pickWord(m, w, now += 1500); m._w = w; turns++; continue; }
        if (m.phase === "draw") {
            const w = W[m.series[0]] && poolFor(W, m.series).find(x => x.t === usedW[usedW.length - 1]);
            const gs = eligible(m);
            // half the turns everyone gets it, a quarter some do, a quarter nobody
            const k = turns % 4 === 0 ? 0 : turns % 4 === 1 ? Math.ceil(gs.length / 2) : gs.length;
            for (const p of gs.slice(0, k)) m = guess(m, p, w.t, now += 700).s;
            if (m.phase === "draw") m = run(m, { k: "timeout", tk: m.n }, now = m.dl + 1).s;
            m = run(m, { k: "word", by: m.drawer, tk: m.n, word: w.t }, now).s;
            continue;
        }
        m = run(m, { k: "next", tk: m.n }, now = m.nx + 1).s;
    }
    t(m.phase === "over" && turns === n * 3 && m.log.length === n * 3, n + " players: 3 rounds = " + n * 3 + " turns");
    t(players.every(p => m.log.filter(L => L.d === p).length === 3), n + " players: everyone drew once per round");
    t(new Set(m.log.map(L => L.w)).size === m.log.length, n + " players: no word drawn twice");
    const total = m.log.reduce((a, L) => a + L.got.reduce((b, g) => b + g.pts, 0) + L.bonus, 0);
    t(total === Object.values(m.score).reduce((a, b) => a + b, 0), n + " players: the scores add up to the turn log exactly");
    t(m.log.filter(L => !L.got.length).every(L => L.bonus === 0), n + " players: no drawer bonus when nobody guessed");
    t(standings(m)[0].score >= standings(m)[n - 1].score && m.winners.length >= 1, n + " players: final ranking + winner");
}

/* ---------------- Contest: same word for everyone, then 1-5 star ratings ---------------- */
sect("contest: a round");
{
    const w1 = contestWord(W, ["onepiece"], { round: 1, mid: 0, rnd });
    t(w1 && w1.cat === "Character", "round 1 of match 0 is a character");
    t(contestWord(W, ["onepiece"], { round: 2, mid: 0, rnd }).cat === "Weapon" && contestWord(W, ["onepiece"], { round: 3, mid: 0, rnd }).cat === "Object", "categories take turns: character, weapon, object & item");
    t(contestWord(W, ["onepiece"], { round: 1, mid: 1, rnd }).cat === "Weapon", "each match starts the rotation somewhere else");
    const usedC = W.gachiakuta.slice(0, W.gachiakuta.length - 2).map(w => w.t), wl = contestWord(W, ["gachiakuta"], { used: usedC, rnd });
    t(wl && !usedC.includes(wl.t), "never a word already drawn this match");
    let m = newContest({ mid: 50, series: ["onepiece"], players: [1, 2, 3, 4], rounds: 2, timer: 60, now: NOW, word: luffy });
    t(isContest(m) && !isContest(newMatch({ mid: 1, series: ["onepiece"], players: [1, 2], now: NOW, rnd })), "a contest is marked as one; Classic matches aren't");
    t(m.phase === "draw" && m.round === 1 && m.n === 1 && m.word.t === "Monkey D. Luffy" && m.word.c === 40 && m.dl === NOW + 60000, "everyone draws the same, public word at once (60 s)");
    t(ents(m).join() === "1,2,3,4" && Object.values(m.score).every(v => v === 0) && !m.drawer, "all 4 draw; nobody is 'the drawer'; everyone at 0");
    t(run(m, { k: "rate", by: 1, tk: 1, to: 2, v: 5 }, NOW + 1000).err === "stale", "no rating while drawing");
    t(run(m, { k: "guess", by: 1, tk: 1, h: "x" }, NOW + 1000).err === "unknown move" && run(m, { k: "pick", by: 1, tk: 1, mask: "_", salt: "x", wh: ["a"] }, NOW).err === "unknown move", "Classic moves don't exist in a contest");
    t(run(m, { k: "done", by: 9, tk: 1 }, NOW + 1000).err, "a spectator can't be 'done'");
    m = run(m, { k: "done", by: 1, tk: 1 }, NOW + 5000).s; m = run(m, { k: "done", by: 2, tk: 1 }, NOW + 6000).s;
    t(m.phase === "draw" && isDone(m, 1) && isDone(m, 2) && !isDone(m, 3), "done players wait; the round goes on");
    m = run(m, { k: "undone", by: 2, tk: 1 }, NOW + 7000).s;
    t(!isDone(m, 2) && m.phase === "draw", "a player can go back to drawing");
    t(run(m, { k: "timeout", tk: 1, ph: "draw" }, NOW + 59999).err === "stale", "no early timeout");
    for (const p of [2, 3]) m = run(m, { k: "done", by: p, tk: 1 }, NOW + 8000).s;
    const offline4 = p => p !== 4;
    const c = run(m, { k: "check", tk: 1, ph: "draw" }, NOW + 9000, offline4);
    t(!c.err && c.s.phase === "rate", "everyone still here is done (4 went offline): drawing ends early");
    m = run(m, { k: "done", by: 4, tk: 1 }, NOW + 9000).s;
    t(m.phase === "rate" && m.dl === NOW + 9000 + rateMsFor(4) && rateMsFor(4) === 39000, "the last 'done' ends the drawing; rating time 15 s + 6 s × 4 = 39 s");
    t(m.gal.slice().sort().join() === "1,2,3,4" && JSON.stringify(m.gal) === JSON.stringify(seeded([1, 2, 3, 4], 50 * 31 + 1 * 7919)), "the anonymous gallery order is shuffled, and the same in every browser");
    t(rateMsFor(1) === CT.rateMin && rateMsFor(2) === 27000 && rateMsFor(8) === 60000 && rateMsFor(20) === CT.rateMax, "rating time: 2 drawings 27 s, 8 drawings 60 s (25 s min, 60 s max)");

    sect("contest: rating");
    t(run(m, { k: "rate", by: 1, tk: 1, to: 1, v: 5 }, NOW + 10000).err === "You can't rate your own drawing.", "nobody rates their own drawing");
    t(run(m, { k: "rate", by: 9, tk: 1, to: 1, v: 5 }, NOW + 10000).err, "spectators can't rate");
    t(run(m, { k: "rate", by: 1, tk: 1, to: 9, v: 5 }, NOW + 10000).err === "stale", "only this round's drawings can be rated");
    t([0, 6, 2.5, -1, "x", null].every(v => run(m, { k: "rate", by: 1, tk: 1, to: 2, v }, NOW + 10000).err === "Pick 1 to 5 stars."), "only whole stars from 1 to 5");
    t(run(m, { k: "rate", by: 1, tk: 0, to: 2, v: 3 }, NOW + 10000).err === "stale", "a rating from an old round is refused");
    const R = { 1: { 2: 5, 3: 3, 4: 1 }, 2: { 1: 4, 3: 3, 4: 2 }, 3: { 1: 2, 2: 5, 4: 2 } };
    for (const [by, row] of Object.entries(R)) for (const [to, v] of Object.entries(row)) m = run(m, { k: "rate", by: Number(by), tk: 1, to: Number(to), v }, NOW + 12000).s;
    t(ratedAll(m, 1) && ratedAll(m, 2) && ratedAll(m, 3) && !ratedAll(m, 4) && !allRated(m), "player 4 hasn't rated yet");
    m = run(m, { k: "rate", by: 1, tk: 1, to: 4, v: 2 }, NOW + 13000).s;
    t(ratedBy(m, 1).p4 === 2 && m.phase === "rate", "a rating can be changed until rating ends");
    t(run(m, { k: "check", tk: 1, ph: "rate" }, NOW + 14000).err === "stale", "no early end while someone still has drawings to rate");
    const early = run(m, { k: "check", tk: 1, ph: "rate" }, NOW + 14000, offline4);
    t(!early.err && early.s.phase === "results" && early.s.why === "all", "everyone still here has rated everything: rating ends");
    m = run(m, { k: "rate", by: 4, tk: 1, to: 1, v: 5 }, NOW + 15000).s;      // 4 rates only one drawing
    t(run(m, { k: "rate", by: 4, tk: 1, to: 2, v: 5 }, m.dl + 2000).err === "stale", "a rating after the time is up is refused");
    m = run(m, { k: "timeout", tk: 1, ph: "rate" }, m.dl).s;
    t(m.phase === "results" && m.why === "time" && m.nx === m.t0 + CT.resultsMs, "time's up: results");
    // stars received: 1 ← 4 + 2 + 5 = 11 · 2 ← 5 + 5 = 10 · 3 ← 3 + 3 = 6 · 4 ← 2 + 2 + 2 = 6
    t(m.score.p1 === 11 && m.score.p2 === 10 && m.score.p3 === 6 && m.score.p4 === 6, "points = the stars each drawing received (11, 10, 6, 6)");
    t(m.gain.p1 === 11 && m.log[0].res[0].p === 1 && m.log[0].res[0].n === 3 && m.log[0].res.find(x => x.p === 2).n === 2, "the results list each drawing's stars and how many ratings it got");
    t(m.log[0].w === "Monkey D. Luffy" && m.log[0].c === 40 && m.log[0].cat === "Character", "the round log keeps the word and its picture");
    t(run(m, { k: "timeout", tk: 1, ph: "rate" }, m.nx + 1).err === "stale" && run(m, { k: "check", tk: 1, ph: "draw" }, m.nx + 1).err === "stale", "a late duplicate can't end a phase twice");

    sect("contest: rounds, joiners, leavers");
    t(run(m, { k: "next", tk: 1, ph: "results", word: W.onepiece[3] }, m.nx - 1).err === "stale", "the results stay up before moving on");
    t(run(m, { k: "next", tk: 1, ph: "results" }, m.nx).err === "need word", "the next round needs its word");
    t(run(m, { k: "next", tk: 1, ph: "results", word: luffy }, m.nx).err === "used word", "a word already drawn this match is refused");
    m = run(m, { k: "join", by: 5 }, m.nx - 100, p => true).s;
    t(m.pend.p5 && !m.players.includes(5), "a spectator queues for the next round");
    const nw = contestWord(W, ["onepiece"], { used: m.log.map(L => L.w), round: 2, mid: 50, rnd });
    const n2 = run(m, { k: "next", tk: 1, ph: "results", word: nw }, m.nx);
    t(!n2.err && n2.s.round === 2 && n2.s.n === 2 && n2.s.phase === "draw" && n2.s.word.t === nw.t && n2.s.word.t !== "Monkey D. Luffy", "round 2: a new word for everyone");
    t(ents(n2.s).join() === "1,2,3,4,5" && n2.s.score.p5 === 0 && n2.s.ev.joined.join() === "5" && !n2.s.done && !n2.s.rt, "the newcomer draws from round 2; done flags and ratings start fresh");
    t(run(n2.s, { k: "next", tk: 1, ph: "results", word: nw }, m.nx + 10).err === "stale", "a duplicate 'next' can't advance twice");
    let m2 = n2.s;
    // 3 was offline when round 2 began? (here: leaves mid-round, comes back) · a player not in the round can enter while drawing
    const late = newContest({ mid: 51, series: ["naruto"], players: [1, 2, 3], rounds: 1, timer: 60, now: NOW, word: ita });
    const l2 = run(Object.assign(JSON.parse(JSON.stringify(late)), { ent: [1, 2] }), { k: "enter", by: 3, tk: 1 }, NOW + 1000);
    t(!l2.err && ents(l2.s).join() === "1,2,3", "a player who was offline at the start can still enter while drawing");
    t(run(late, { k: "enter", by: 7, tk: 1 }, NOW + 1000).err === "stale" && run(l2.s, { k: "enter", by: 3, tk: 1 }, NOW + 1000).err === "stale", "only match players, and only once");
    // last round → over
    for (const p of ents(m2)) m2 = run(m2, { k: "done", by: p, tk: 2 }, NOW + 200000).s;
    for (const by of ents(m2)) for (const to of toRate(m2, by)) m2 = run(m2, { k: "rate", by, tk: 2, to, v: to === 5 ? 5 : 1 }, NOW + 201000).s;
    t(m2.phase === "rate", "the last rating doesn't end rating at once (a moment to change it)");
    m2 = run(m2, { k: "check", tk: 2, ph: "rate" }, NOW + 202000).s;
    t(m2.gain.p5 === 20 && m2.gain.p1 === 4, "round 2: player 5 gets 5 stars from all 4 others (20)");
    const fin = run(m2, { k: "next", tk: 2, ph: "results" }, m2.nx);
    t(!fin.err && fin.s.phase === "over" && fin.s.end === "done" && fin.s.winners.join() === "5", "after the last round: over, the highest total wins (5: 20)");
    t(standings(fin.s).map(x => x.score).join() === "20,15,14,10,10", "final standings add up both rounds");
    // a tie at the top is a shared win
    let tie = newContest({ mid: 52, series: ["bleach"], players: [1, 2], rounds: 1, timer: 60, now: NOW, word: W.bleach[0] });
    tie = run(tie, { k: "done", by: 1, tk: 1 }, NOW).s; tie = run(tie, { k: "done", by: 2, tk: 1 }, NOW).s;
    tie = run(tie, { k: "rate", by: 1, tk: 1, to: 2, v: 4 }, NOW + 100).s; tie = run(tie, { k: "rate", by: 2, tk: 1, to: 1, v: 4 }, NOW + 100).s;
    tie = run(tie, { k: "check", tk: 1, ph: "rate" }, NOW + 200).s; tie = run(tie, { k: "next", tk: 1, ph: "results" }, tie.nx).s;
    t(tie.phase === "over" && tie.winners.join() === "1,2", "2 players, same stars: a shared win");
    // everyone else left before the next round
    let few = newContest({ mid: 53, series: ["bleach"], players: [1, 2, 3], rounds: 3, timer: 60, now: NOW, word: W.bleach[0] });
    few = run(few, { k: "timeout", tk: 1, ph: "draw" }, few.dl).s; few = run(few, { k: "timeout", tk: 1, ph: "rate" }, few.dl).s;
    t(few.log[0].res.every(x => x.pts === 0 && x.n === 0), "nobody rated: 0 points each");
    const f2 = run(few, { k: "next", tk: 1, ph: "results", word: W.bleach[1] }, few.nx, p => p === 1);
    t(f2.s.phase === "over" && f2.s.end === "few", "fewer than 2 players left: the match ends");
    // a lone player still here when drawing ends: no one to rate with
    let solo = newContest({ mid: 54, series: ["bleach"], players: [1, 2], rounds: 2, timer: 60, now: NOW, word: W.bleach[0] });
    solo.ent = [1];
    solo = run(solo, { k: "done", by: 1, tk: 1 }, NOW + 1000, p => p === 1).s;
    t(solo.phase === "results" && solo.why === "solo", "only one artist this round: straight to the results");
}

sect("contest: full matches, 2 and 8 players");
for (const n of [2, 8]) {
    const players = Array.from({ length: n }, (_, i) => i + 1), series = n === 2 ? ["dragonball"] : ["onepiece", "naruto", "jjk"];
    let now = NOW, m = newContest({ mid: 60 + n, series, players, rounds: 5, timer: 90, now, word: contestWord(W, series, { round: 1, mid: 60 + n, rnd }) }), rounds = 0;
    for (let guard = 0; guard < 100 && m.phase !== "over"; guard++) {
        if (m.phase === "draw") {
            rounds++;
            if (rounds % 2) for (const p of ents(m)) m = run(m, { k: "done", by: p, tk: m.n }, now += 3000).s;
            else m = run(m, { k: "timeout", tk: m.n, ph: "draw" }, now = m.dl).s;
            continue;
        }
        if (m.phase === "rate") {
            // round 3: one player skips rating; otherwise everyone rates everything
            for (const by of ents(m)) { if (rounds === 3 && by === 1) continue; for (const to of toRate(m, by)) m = run(m, { k: "rate", by, tk: m.n, to, v: 1 + ((by * 3 + to * 5 + rounds) % 5) }, now += 200).s; }
            const ch = run(m, { k: "check", tk: m.n, ph: "rate" }, now += 1500);
            m = ch.err ? run(m, { k: "timeout", tk: m.n, ph: "rate" }, now = m.dl).s : ch.s;
            continue;
        }
        const w = contestWord(W, m.series, { used: m.log.map(L => L.w), round: m.round + 1, mid: m.mid, rnd });
        m = run(m, { k: "next", tk: m.n, ph: "results", word: w }, now = m.nx).s;
    }
    t(m.phase === "over" && rounds === 5 && m.log.length === 5, n + " players: 5 rounds, then over");
    t(new Set(m.log.map(L => L.w)).size === 5, n + " players: a different word every round");
    t(m.log.every(L => L.res.length === n && L.res.every(x => x.n <= n - 1)), n + " players: every drawing rated by at most everyone else");
    t(m.log[2].res.filter(x => x.p !== 1).every(x => x.n === n - 2) || n === 2, n + " players: a player who didn't rate just gives no stars");
    const total = m.log.reduce((a, L) => a + L.res.reduce((b, x) => b + x.pts, 0), 0);
    t(total === Object.values(m.score).reduce((a, b) => a + b, 0), n + " players: scores add up to the round results exactly");
    t(m.log.every(L => L.res.every(x => x.pts >= x.n && x.pts <= 5 * x.n)), n + " players: each rating is worth 1 to 5");
    t(m.winners.length >= 1 && m.winners.every(p => m.score["p" + p] === Math.max(...Object.values(m.score))), n + " players: the highest total wins");
}

console.log("\n" + (bad ? "✘" : "✔") + " " + ok + " passed, " + bad + " failed");
process.exit(bad ? 1 : 0);
