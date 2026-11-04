// Anime Sketch rules + word library tests: node tools/sketch-test.mjs
import { SK, norm, maskOf, letters, hintMax, pickHint, hintAt, spans, buildWords, poolFor, pickOptions, newMatch, act, eligible, allGot, hasGot, gotList,
    hintDue, standings, ptsFor, fp, prints, claim, near, wordPrints, del1, CATS, TYPO_MIN } from "../js/sketch/engine.js";
import { EXTRAS, BLOCK } from "../js/sketch/words.js";
import { CHARS } from "../js/draft/data.js";
import { NICKNAMES } from "../js/feud/nicknames.js";
import { buildLibrary } from "../js/feud/engine.js";
import { PACKS } from "../js/feud/packs/index.js";

let ok = 0, bad = 0;
const t = (c, m) => { if (c) ok++; else { bad++; console.log("  ✘", m); } };
const sect = s => console.log("• " + s);
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

sect("word library");
const W = buildWords({ chars: CHARS, nick: NICKNAMES, lib: buildLibrary(PACKS), extras: EXTRAS, block: BLOCK });
const SERIES = Object.keys(CHARS);
t(SERIES.every(s => (W[s] || []).length >= 24), "every series has at least 24 words: " + SERIES.map(s => s + " " + (W[s] || []).length).join(", "));
const all = Object.values(W).flat();
t(all.length > 700, "a big library (" + all.length + " words)");
t(all.every(w => w.t && w.k && w.f.length && w.f.includes(w.k) && w.cat && w.s), "every word has text, category, series and accepted spellings");
t(all.every(w => w.t.length <= SK.maxWord && letters(w.t) >= 3), "no word too long or too short");
t(SERIES.every(s => new Set(W[s].map(w => w.k)).size === W[s].length), "no duplicates inside a series");
t(SERIES.every(s => W[s].every(w => !W[s].some(x => x !== w && x.f.includes(w.k)))), "no word is just another word's alternate spelling");
t(all.every(w => CATS.includes(w.cat)) && CATS.join() === "Character,Object,Weapon", "only characters, objects and weapons");
t(!["Grand Line", "Marineford", "Hidden Leaf Village", "Kamehameha", "Rasengan", "Domain Expansion", "Straw Hat Pirates", "Super Saiyan", "Water Breathing", "Shibuya"].some(x => all.some(w => w.k === norm(x))), "no places, attacks, powers or groups");
t(SERIES.every(s => W[s].filter(w => w.cat !== "Character").length >= 7), "every series has its objects and weapons: " + SERIES.map(s => s + " " + W[s].filter(w => w.cat !== "Character").length).join(", "));
t(SERIES.every(s => W[s].filter(w => w.cat === "Character").length >= 17), "every series has plenty of characters");
t(!all.some(w => BLOCK.map(norm).includes(w.k)), "blocked answers stay out");
t(SERIES.every(s => W[s].some(w => w.cat === "Character") && W[s].some(w => w.cat !== "Character")), "every series mixes characters with other categories");
const luffy = W.onepiece.find(w => w.c === 40);
t(luffy && luffy.f.includes("luffy") && !luffy.f.includes("monkey"), "Monkey D. Luffy: 'luffy' counts, the shared 'monkey' doesn't");
t(!luffy.f.includes("straw hat") && W.onepiece.some(w => w.k === "straw hat" && w.cat === "Object"), "a spelling means one word only: 'straw hat' is the hat, not Luffy's nickname");
const ita = W.naruto.find(w => w.t === "Itachi Uchiha");
t(ita && ita.f.includes("itachi") && !ita.f.includes("uchiha"), "Itachi: 'itachi' alone counts, 'uchiha' alone doesn't");
t(W.dragonball.some(w => w.t === "Senzu Bean" && w.cat === "Object") && W.onepiece.some(w => w.t === "Yoru" && w.cat === "Weapon") && W.onepiece.some(w => w.t === "Big Mom" && w.f.includes("charlotte linlin")), "objects, weapons and extra characters with their spellings (Senzu Bean, Yoru, Big Mom)");
t(W.jojo.some(w => w.t === "Star Platinum" && w.cat === "Character") && W.onepiece.some(w => w.t === "Gum-Gum Fruit" && w.cat === "Object"), "Feud boards: Stands as characters, devil fruits as objects");
const wc = W.windbreaker.find(w => w.t === "Wind chime");
t(!!wc && wc.f.includes("furin"), "curated extras with aliases (Wind chime / furin)");

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
    let same = 0, mixed = 0, allCat = new Set(), mixSeries = new Set();
    for (let i = 0; i < 400; i++) {
        const o = pickOptions(W, ["onepiece", "naruto", "jjk"], { rnd });
        const cats = new Set(o.map(w => w.cat)); cats.forEach(c => allCat.add(c)); o.forEach(w => mixSeries.add(w.s));
        if (cats.size === 1) same++; else mixed++;
    }
    t(same > 0 && mixed > 0, "three random words: sometimes all one category (" + same + "/400), sometimes mixed (" + mixed + "/400)");
    t(allCat.size === 3 && mixSeries.size === 3, "every category and every ticked series shows up");
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
    const H = (mm, at) => { const i = pickHint(ita.t, hintAt(mm.hint), rnd); return run(mm, { k: "hint", by: mm.drawer, tk: mm.n, i, c: ita.t[i] }, at); };
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

console.log("\n" + (bad ? "✘" : "✔") + " " + ok + " passed, " + bad + " failed");
process.exit(bad ? 1 : 0);
