/* =====================================================================
   ANIME SKETCH: the rules (pure functions, no DOM, no Firebase; tested by tools/sketch-test.mjs).

   A match:  every active player draws once per round; the others guess the drawer's secret word.
   Phases:   pick (the drawer chooses 1 of 3 words) -> draw (timer runs, guessers type) -> reveal (the word + points)
             -> next drawer ... -> round (summary, newcomers join here) -> next round ... -> over.
   Secrecy:  the word itself is never in the shared state while it is being drawn. The drawer's browser publishes the
             blank pattern (mask), a random salt and salted SHA-256 fingerprints of the accepted spellings (wh).
             A guesser's browser checks its own guess against those fingerprints; only a match is sent as a claim.
             The word is written to the room only once the turn is over.
   Every move runs inside a Firebase transaction on rooms/<code>/sketch, guarded by the turn number (tk === s.n),
   so two clicks, two tabs or two clients doing the same thing can never score or advance twice.
   ===================================================================== */

export const SK = {
    rounds: 3, roundChoices: [1, 2, 3, 4, 5],
    timer: 90, timerChoices: [60, 90, 120],
    pickMs: 15000,          // the drawer has 15 s to choose a word (then one is picked for them)
    revealMs: 6500,         // the answer and the points stay up this long
    skipMs: 3500,           // a skipped turn (drawer gone / never chose) is shown shorter
    roundMs: 8000,          // the round summary
    firstHintMs: 20000,     // first letter hint after 20 s without a correct guess
    nextHintMs: 15000,      // then one every 15 s, still without a new correct guess
    pts: [100, 75, 50], laterPts: 25, drawerBonus: 25,
    diffChoices: [0, 1, 2, 3],   // word difficulty for the whole match: 0 = mixed, 1 easy, 2 medium, 3 hard
    goneMs: 6000,           // a drawer offline this long loses the turn
    maxWord: 26
};

export const arr = x => Array.isArray(x) ? x : (x ? Object.values(x) : []);

/* ---------------- words ---------------- */
// lower case, no accents, no punctuation, single spaces, no leading "the / a / an"
export function norm(s) {
    return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ").replace(/^(the|a|an) (?=\S)/, "");
}
const isSlot = ch => /[\p{L}\p{N}]/u.test(ch);
// the blanks everyone sees: a slot per letter or digit, spaces kept, punctuation shown as is
export const maskOf = w => [...String(w)].map(ch => ch === " " ? " " : isSlot(ch) ? "_" : ch).join("");
export const letters = w => [...String(w)].filter(isSlot).length;
// short words (up to 5 letters) get 1 hint, medium (6 to 10) 2, long (11+) 3; never every letter
export const hintMax = w => { const n = letters(w); return Math.max(0, Math.min(n <= 5 ? 1 : n <= 10 ? 2 : 3, n - 1)); };
// revealed letters are stored as { i<position>: letter } (string keys, so Firebase never turns them into an array)
export const hintAt = h => { const o = {}; Object.entries(h || {}).forEach(([k, v]) => { if (v != null && /^i\d+$/.test(k)) o[Number(k.slice(1))] = v; }); return o; };
// a position to reveal: an unrevealed letter, preferring one whose letter isn't showing anywhere yet
export function pickHint(word, shown, rnd = Math.random) {
    const chars = [...String(word)], open = [], fresh = [], at = hintAt(shown), seen = new Set(Object.keys(at).map(i => (chars[i] || "").toLowerCase()));
    chars.forEach((ch, i) => { if (!isSlot(ch) || at[i] != null) return; open.push(i); if (!seen.has(ch.toLowerCase())) fresh.push(i); });
    const pool = fresh.length ? fresh : open;
    return pool.length ? pool[(rnd() * pool.length) | 0] : -1;
}
// every way a message could contain the answer: the whole message and each run of consecutive words
export function spans(msg, max = 16) {
    const w = norm(msg).split(" ").filter(Boolean).slice(0, max), out = new Set();
    for (let i = 0; i < w.length; i++) for (let j = i + 1; j <= w.length; j++) out.add(w.slice(i, j).join(" "));
    // and without the spaces, for "kamehame ha" / "gumgum"
    const joined = w.join(""); if (joined) out.add(joined);
    return [...out];
}

/* the word library (js/sketch/words.js): per series, Characters, Weapons and Objects & Items, each with a difficulty
   (1 easy, 2 medium, 3 hard). Characters linked to the Anime Draft roster carry its AniList id, so the reveal shows the picture.
   A spelling only ever means ONE word of a series (the first word to claim it keeps it). */
export const CATS = ["Character", "Weapon", "Object"];
export const CAT_NAME = { Character: "Character", Weapon: "Weapon", Object: "Object & Item" };
const CAT_OF = { c: "Character", w: "Weapon", o: "Object" };
const SOLO_STOP = /^(the|van|von|king|devil|lord|man|god|of|and|captain|mr|old)$/;
// "Word / alias / alias @Roster Name ^2" or "@Roster Name / alias ^1"
export function parseEntry(e) {
    let x = String(e).trim(), d = 2, link = "";
    const dm = /\s\^([123])\s*$/.exec(x); if (dm) { d = Number(dm[1]); x = x.slice(0, dm.index).trim(); }
    if (x.startsWith("@")) { x = x.slice(1).trim(); link = x.split(" / ")[0].trim(); }
    else { const lm = /\s@([^@/]+)$/.exec(x); if (lm) { link = lm[1].trim(); x = x.slice(0, lm.index).trim(); } }
    const parts = x.split(" / ").map(y => y.trim()).filter(Boolean);
    return { t: parts[0] || "", al: parts.slice(1), d, link };
}
export function buildWords({ library = {}, chars = {} } = {}) {
    const out = {};
    Object.entries(library).forEach(([s, cats]) => {
        const ids = new Map(arr(chars[s]).map(r => [r[1], Number(r[0])]));
        const entries = [];
        Object.entries(CAT_OF).forEach(([key, cat]) => String((cats || {})[key] || "").split(";").map(x => x.trim()).filter(Boolean).forEach(e => entries.push(Object.assign(parseEntry(e), { cat }))));
        // a first or last name alone counts when no other character of the series shares it ("Itachi", not "Uchiha")
        const tok = {};
        entries.filter(e => e.cat === "Character").forEach(e => new Set([e.t, e.link].filter(Boolean).flatMap(n => norm(n).split(" "))).forEach(t => { tok[t] = (tok[t] || 0) + 1; }));
        const list = out[s] = [];
        entries.forEach(e => {
            const t = e.t, k = norm(t);
            if (!t || !k || t.length > SK.maxWord || letters(t) < 3 || list.some(x => x.k === k || x.f.includes(k))) return;
            const solo = e.cat === "Character" ? [e.t, e.link].filter(Boolean).flatMap(n => norm(n).split(" ")).filter(w => w.length >= 3 && tok[w] === 1 && !SOLO_STOP.test(w)) : [];
            const forms = [...new Set([k, ...e.al.map(norm), ...(e.link ? [norm(e.link)] : []), ...solo].filter(f => f && f.length >= 2 && (f === k || !list.some(x => x.f.includes(f)))))];
            list.push({ id: s + ":" + k.replace(/ /g, "-"), t, k, s, cat: e.cat, d: e.d, c: e.link ? ids.get(e.link) || 0 : 0, f: forms });
        });
    });
    return out;
}
export const poolFor = (words, series) => arr(series).flatMap(s => words[s] || []);
/* three words for the drawer: one Character, one Weapon and one Object & Item (a series short on one category fills the
   slot from the others), never one already drawn this match, preferably not one this browser offered recently.
   diff (0 = mixed, 1-3) prefers words of that difficulty, then the next difficulty, then any. */
export function pickOptions(words, series, { used = [], recent = [], rnd = Math.random, n = 3, diff = 0 } = {}) {
    const usedK = new Set(arr(used).map(norm)), rec = new Set(arr(recent)), out = [];
    const pool = poolFor(words, series).filter(w => !usedK.has(w.k));
    const pick = cands => {
        if (!cands.length) return null;
        const fresh = cands.filter(w => !rec.has(w.id)), base = fresh.length ? fresh : cands;
        const tiers = Number(diff) ? [base.filter(w => w.d === Number(diff)), base.filter(w => Math.abs(w.d - Number(diff)) === 1), base] : [base];
        const tier = tiers.find(x => x.length);
        return tier[(rnd() * tier.length) | 0];
    };
    const taken = w => out.some(x => x.k === w.k);
    for (const cat of CATS) { if (out.length >= n) break; const w = pick(pool.filter(x => x.cat === cat && !taken(x))); if (w) out.push(w); }
    while (out.length < n) { const w = pick(pool.filter(x => !taken(x))); if (!w) break; out.push(w); }
    return out;
}

/* ---------------- a match ---------------- */
const pk = p => "p" + p;
export const ptsFor = order => SK.pts[order] != null ? SK.pts[order] : SK.laterPts;
export function newMatch({ mid, lv = 0, series, rounds = SK.rounds, timer = SK.timer, diff = 0, players, now, rnd = Math.random }) {
    const ps = arr(players).map(Number), order = ps.slice().sort(() => rnd() - .5), score = {};
    ps.forEach(p => { score[pk(p)] = 0; });
    const s = { mid, lv, series: arr(series), rounds: SK.roundChoices.includes(Number(rounds)) ? Number(rounds) : SK.rounds, timer: SK.timerChoices.includes(Number(timer)) ? Number(timer) : SK.timer,
        players: ps, order, ti: 0, round: 1, n: 0, score, log: [], ev: { n: 0 }, diff: SK.diffChoices.includes(Number(diff)) ? Number(diff) : 0 };
    startTurn(s, 0, now);
    return s;
}
function ev(s, k, x) { s.ev = Object.assign({ n: ((s.ev && s.ev.n) || 0) + 1, k }, x || {}); }
const clearTurn = s => { ["mask", "salt", "wh", "wv", "wt", "cat", "hm", "hint", "hn", "ia", "hsa", "got", "gain", "word", "wc", "why", "nx", "t0"].forEach(k => { s[k] = null; }); };
function startTurn(s, ti, now) {
    clearTurn(s);
    s.ti = ti; s.drawer = Number(arr(s.order)[ti]); s.n = (Number(s.n) || 0) + 1;
    s.phase = "pick"; s.dl = now + SK.pickMs;
    ev(s, "turn", { p: s.drawer });
}
export const eligible = (s, present = () => true) => arr(s.players).map(Number).filter(p => p !== Number(s.drawer) && present(p));
export const gotList = s => arr(s.got);
export const hasGot = (s, p) => gotList(s).some(g => Number(g.p) === Number(p));
export const allGot = (s, present) => { const e = eligible(s, present); return e.length > 0 && e.every(p => hasGot(s, p)); };
// when the next letter hint is due (server time): 20 s after the turn started or the last correct guess, then every 15 s
export const hintDue = s => (Number(s.hn) || 0) >= (Number(s.hm) || 0) ? Infinity : Number(s.ia) + SK.firstHintMs + SK.nextHintMs * (Number(s.hsa) || 0);
function endTurn(s, why, now) {
    s.phase = "reveal"; s.why = why; s.dl = null;
    s.nx = now + (why === "skip" || why === "left" && !gotList(s).length ? SK.skipMs : SK.revealMs);
    s.log = arr(s.log).concat([{ r: s.round, n: s.n, d: s.drawer, why, w: s.word || null, c: s.wc || 0, got: gotList(s).map(g => ({ p: Number(g.p), pts: Number(g.pts) })), bonus: Number((s.gain || {})[pk(s.drawer)]) || 0 }]);
    ev(s, "end", { why });
}
function nextTurnOrRound(s, now, present) {
    let i = Number(s.ti) + 1;
    const order = arr(s.order).map(Number);
    while (i < order.length && !present(order[i])) i++;        // someone offline when their turn comes misses it this round
    if (i < order.length) { startTurn(s, i, now); return; }
    if (Number(s.round) >= Number(s.rounds)) { finish(s, "done"); return; }
    clearTurn(s); s.phase = "round"; s.dl = null; s.nx = now + SK.roundMs;
    ev(s, "round", { r: s.round });
}
function newRound(s, now, present) {
    const pend = Object.keys(s.pend || {}).map(k => Number(k.slice(1))).filter(p => present(p) && !arr(s.players).map(Number).includes(p));
    s.players = arr(s.players).map(Number).concat(pend);
    pend.forEach(p => { if (s.score[pk(p)] == null) s.score[pk(p)] = 0; });
    s.pend = null;
    const live = s.players.filter(present);
    if (live.length < 2) { finish(s, "few"); return; }
    // same drawing order every round; players who joined go to the end, players who left drop out
    s.order = arr(s.order).map(Number).filter(p => live.includes(p)).concat(live.filter(p => !arr(s.order).map(Number).includes(p)));
    s.round = Number(s.round) + 1;
    startTurn(s, 0, now);
    if (pend.length) s.ev.joined = pend;
}
export function standings(s) {
    return arr(s.players).map(Number).map(p => ({ p, score: Number((s.score || {})[pk(p)]) || 0 })).sort((a, b) => b.score - a.score || a.p - b.p);
}
function finish(s, why) {
    clearTurn(s);
    const st = standings(s), top = st.length ? st[0].score : 0;
    s.phase = "over"; s.dl = null; s.end = why;
    s.winners = st.filter(x => x.score === top).map(x => x.p);
    ev(s, "over", { why });
}

/* the moves. Returns null when applied, or a short reason when not (the caller then aborts the transaction).
   a = { k, by, tk, ... }   ctx = { now, present(p) } */
export function act(s, a, ctx) {
    if (s && s.type === "contest") return actContest(s, a, ctx);
    const now = ctx.now, present = ctx.present || (() => true), by = Number(a.by), inTurn = a.tk == null || Number(a.tk) === Number(s.n);
    switch (a.k) {
        case "pick": {
            if (s.phase !== "pick" || !inTurn) return "stale";
            if (by !== Number(s.drawer)) return "Only the drawer picks the word.";
            if (typeof a.mask !== "string" || !a.mask || !Array.isArray(a.wh) || !a.wh.length || !a.salt) return "bad word";
            s.mask = a.mask; s.salt = String(a.salt); s.wh = a.wh.map(String).slice(0, 24); s.cat = String(a.cat || "");
            s.wv = arr(a.wv).map(String).slice(0, 400); s.wt = arr(a.wt).map(String).slice(0, 600);
            s.hm = Math.max(0, Math.min(3, Number(a.hm) || 0)); s.hint = null; s.hn = 0; s.hsa = 0;
            s.phase = "draw"; s.t0 = now; s.ia = now; s.dl = now + Number(s.timer) * 1000; s.got = null; s.gain = null;
            ev(s, "draw", { p: s.drawer });
            return null;
        }
        case "guess": {
            if (s.phase !== "draw" || !inTurn) return "stale";
            if (by === Number(s.drawer)) return "You're drawing this one!";
            if (!arr(s.players).map(Number).includes(by)) return "Spectators can't guess.";
            if (hasGot(s, by)) return "already";
            if (!arr(s.wh).includes(String(a.h)) && !arr(s.wv).includes(String(a.h))) return "wrong";
            if (Number(s.dl) && now > Number(s.dl) + 1500) return "stale";
            const order = gotList(s).length, pts = ptsFor(order), gain = Object.assign({}, s.gain);
            s.got = gotList(s).concat([{ p: by, pts, at: now }]);
            s.score[pk(by)] = (Number(s.score[pk(by)]) || 0) + pts;
            s.score[pk(s.drawer)] = (Number(s.score[pk(s.drawer)]) || 0) + SK.drawerBonus;
            gain[pk(by)] = pts; gain[pk(s.drawer)] = (Number(gain[pk(s.drawer)]) || 0) + SK.drawerBonus; s.gain = gain;
            s.ia = now; s.hsa = 0;                       // a correct guess resets the hint clock
            ev(s, "got", { p: by, pts, i: order + 1 });
            if (allGot(s, present)) endTurn(s, "all", now);
            return null;
        }
        case "hint": {
            if (s.phase !== "draw" || !inTurn) return "stale";
            if (by !== Number(s.drawer)) return "stale";
            if ((Number(s.hn) || 0) >= (Number(s.hm) || 0) || now < hintDue(s) - 400) return "stale";
            const i = Number(a.i), m = [...String(s.mask)];
            if (!(i >= 0 && i < m.length) || m[i] !== "_" || hintAt(s.hint)[i] != null || typeof a.c !== "string" || a.c.length !== 1) return "stale";
            s.hint = Object.assign({}, s.hint, { ["i" + i]: a.c }); s.hn = (Number(s.hn) || 0) + 1; s.hsa = (Number(s.hsa) || 0) + 1;
            ev(s, "hint", { i });
            return null;
        }
        case "timeout": {
            if (!inTurn || !Number(s.dl) || now < Number(s.dl)) return "stale";
            if (s.phase === "pick") { endTurn(s, "skip", now); return null; }
            if (s.phase !== "draw") return "stale";
            if (by === Number(s.drawer) && a.word) { s.word = String(a.word).slice(0, 40); s.wc = Number(a.c) || 0; }
            endTurn(s, "time", now);
            return null;
        }
        case "check": {         // a guesser left: maybe everyone still here has it now
            if (s.phase !== "draw" || !inTurn || !allGot(s, present)) return "stale";
            endTurn(s, "all", now); return null;
        }
        case "gone": {          // the drawer went offline (the caller checked how long)
            if (!inTurn || !["pick", "draw"].includes(s.phase) || present(Number(s.drawer))) return "stale";
            endTurn(s, "left", now); return null;
        }
        case "word": {          // the drawer fills in the answer for the reveal
            if (s.phase !== "reveal" || !inTurn || by !== Number(s.drawer) || s.word || !a.word) return "stale";
            s.word = String(a.word).slice(0, 40); s.wc = Number(a.c) || 0;
            const L = arr(s.log), last = L[L.length - 1];
            if (last && Number(last.n) === Number(s.n)) { last.w = s.word; last.c = s.wc; s.log = L; }
            return null;
        }
        case "next": {
            if (!inTurn || now < Number(s.nx)) return "stale";
            if (s.phase === "reveal") { nextTurnOrRound(s, now, present); return null; }
            if (s.phase === "round") { newRound(s, now, present); return null; }
            return "stale";
        }
        case "join": {          // a spectator asks to play: they're dealt in when the next round starts
            if (s.phase === "over" || arr(s.players).map(Number).includes(by)) return "stale";
            s.pend = Object.assign({}, s.pend, { [pk(by)]: true }); return null;
        }
        case "unjoin": {
            if (!(s.pend || {})[pk(by)]) return "stale";
            const p = Object.assign({}, s.pend); delete p[pk(by)]; s.pend = Object.keys(p).length ? p : null; return null;
        }
    }
    return "unknown move";
}

/* the fingerprint of an accepted spelling, salted per turn (cyrb53 twice: synchronous, same result in every browser) */
function cyrb(str, seed) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
export const fp = (salt, form) => cyrb(salt + "|" + form, 7) + cyrb(form + "|" + salt, 131);
const sfp = (salt, x) => cyrb(salt + "|" + x, 29);
// a word plus every version of it with one letter missing: two words share one of these when they are a slip or two apart
export const del1 = w => { const out = new Set([w]); for (let i = 0; i < w.length; i++) out.add(w.slice(0, i) + w.slice(i + 1)); return [...out]; };
const STOP = new Set(["the", "and", "of", "no", "to", "an", "on", "in", "de"]);
const answerTokens = f => f.split(" ").filter(t => t.length >= 3 && !STOP.has(t));
export const TYPO_MIN = 6;            // one slip is accepted on answers of 6+ letters (shorter ones must be exact)
/* what the drawer publishes for a word (never the word itself), all salted for this turn:
   wh  each accepted spelling, with and without spaces                    -> a right guess
   wv  each spelling of 6+ letters (no spaces) with one letter missing     -> a right guess with a slip
   wt  each answer word (3+ letters) with one letter missing + its first 4+ letters -> "close": never posted to the chat */
export const prints = (salt, forms) => [...new Set(arr(forms).flatMap(f => [f, f.replace(/ /g, "")]))].map(f => fp(salt, f));
export function wordPrints(salt, forms) {
    const wv = new Set(), wt = new Set();
    arr(forms).forEach(f => {
        const j = f.replace(/ /g, "");
        if (j.length >= TYPO_MIN) del1(j).forEach(v => wv.add(sfp(salt, "v:" + v)));
        answerTokens(f).forEach(t => {
            if (t.length < 5) { wt.add(sfp(salt, "x:" + t)); return; }     // short words ("hat", "goku"): only the word itself is close
            del1(t).forEach(v => { if (v.length >= 4) wt.add(sfp(salt, "t:" + v)); });
            for (let k = 4; k < t.length; k++) wt.add(sfp(salt, "p:" + t.slice(0, k)));
        });
    });
    return { wh: prints(salt, forms), wv: [...wv], wt: [...wt] };
}
// does this message contain the answer (or the answer with one slip)? returns the matching fingerprint, or ""
export function claim(msg, salt, wh, wv) {
    const set = new Set(arr(wh)), vset = new Set(arr(wv)), sp = spans(msg);
    for (const x of sp) for (const v of [x, x.replace(/ /g, "")]) { const h = fp(salt, v); if (set.has(h)) return h; }
    if (vset.size) for (const x of sp) {
        const j = x.replace(/ /g, ""); if (j.length < TYPO_MIN - 1) continue;
        for (const v of del1(j)) { const h = sfp(salt, "v:" + v); if (vset.has(h)) return h; }
    }
    return "";
}
// is any word of this message the answer, one of its words, nearly one of them, or the start of one?
export function near(msg, salt, wt) {
    const set = new Set(arr(wt)); if (!set.size) return false;
    const n = norm(msg);
    for (const t of n.split(" ")) {
        if (t.length < 3 || STOP.has(t)) continue;
        if (set.has(sfp(salt, "x:" + t))) return true;
        if (t.length >= 4 && (set.has(sfp(salt, "p:" + t)) || del1(t).some(v => v.length >= 4 && set.has(sfp(salt, "t:" + v))))) return true;
    }
    const j = n.replace(/ /g, "");            // written without spaces, or split oddly
    return j.length >= 4 && (set.has(sfp(salt, "x:" + j)) || set.has(sfp(salt, "p:" + j)) || del1(j).some(v => v.length >= 4 && set.has(sfp(salt, "t:" + v))));
}

/* =====================================================================
   CONTEST: a second way to play Anime Sketch. Every round, everyone gets the SAME word and draws it at the same time,
   each on their own sheet. When time runs out (or everyone pressed Done) the drawings are shown big, ONE AT A TIME and
   without names (up to 15 s each, moving on as soon as everyone who can rate it has), and every player rates every
   other drawing 1 to 5 stars (never their own; a rating can be changed until rating ends). Stars received are the
   points; the highest total after the last round wins.
   Phases:   draw (everyone draws, the word is public) -> rate (one anonymous drawing at a time: s.gal order, s.gi = the
             one on screen) -> results (names, stars, points) -> next round ... -> over.
   A contest match is marked type: "contest"; act() hands it to actContest(), so Classic matches never reach this code.
   s.n counts rounds (the transaction guard, and the turn the strokes belong to); moves that end a phase also name the
   phase (a.ph), so a late duplicate can never skip one.
   ===================================================================== */
export const CT = {
    ratePer: 15000,         // each drawing is on screen for rating up to 15 s
    resultsMs: 10000,       // the round results stay up this long
    stars: 5
};
export const isContest = s => !!s && s.type === "contest";
export const rateMsFor = n => CT.ratePer * Number(n || 0);          // the longest the whole rating can take
/* the round's word: categories take turns (character, weapon, object & item, from a different start every match),
   never a word already drawn this match; diff and recent work as in Classic */
export function contestWord(words, series, { used = [], recent = [], round = 1, mid = 0, diff = 0, rnd = Math.random } = {}) {
    const opts = pickOptions(words, series, { used, recent, diff, rnd });
    const want = CATS[(Math.abs(Number(mid) || 0) + Number(round) - 1) % CATS.length];
    return opts.find(w => w.cat === want) || opts[0] || null;
}
const wordOf = w => w && w.t ? { t: String(w.t).slice(0, 40), c: Number(w.c) || 0, cat: String(w.cat || ""), s: String(w.s || "") } : null;
// the gallery order: shuffled, but the same in every browser (seeded by match and round), so "drawing C" means one thing
export function seeded(list, seed) {
    let x = (Math.abs(Math.floor(Number(seed) || 0)) % 2147483646) + 1;
    const r = () => (x = (x * 16807) % 2147483647) / 2147483647, a = arr(list).slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}
export const ents = s => arr(s && s.ent).map(Number);
export const isDone = (s, p) => !!((s && s.done) || {})[pk(p)];
export const ratedBy = (s, p) => Object.assign({}, ((s && s.rt) || {})[pk(p)]);
export const toRate = (s, p) => ents(s).filter(q => q !== Number(p));
export const ratedAll = (s, p) => { const r = ratedBy(s, p); return toRate(s, p).every(q => Number(r[pk(q)]) >= 1); };
export const allDone = (s, present = () => true) => { const e = ents(s).filter(p => present(p)); return e.length > 0 && e.every(p => isDone(s, p)); };
export const allRated = (s, present = () => true) => { const e = ents(s).filter(p => present(p)); return e.length > 0 && e.every(p => ratedAll(s, p)); };
// the drawing on screen while rating, the drawings shown so far, and who still has to rate the current one
export const curOf = s => { const g = arr(s && s.gal).map(Number), i = Number(s && s.gi) || 0; return g[i] != null ? g[i] : null; };
export const shownSoFar = s => arr(s && s.gal).map(Number).slice(0, (Number(s && s.gi) || 0) + 1);
export const ratersOf = (s, p, present = () => true) => ents(s).filter(q => q !== Number(p) && present(q));
export const curRated = (s, present = () => true) => { const p = curOf(s); return p != null && ratersOf(s, p, present).every(q => Number(ratedBy(s, q)[pk(p)]) >= 1); };
// stars each drawing received this round (only entrants' ratings, only 1-5), best first
export function tally(s) {
    const E = ents(s);
    return E.map(p => {
        const got = E.filter(q => q !== p).map(q => Number(ratedBy(s, q)[pk(p)]) || 0).filter(v => v >= 1 && v <= CT.stars);
        return { p, pts: got.reduce((a, b) => a + b, 0), n: got.length };
    }).sort((a, b) => b.pts - a.pts || a.p - b.p);
}
export function newContest({ mid, lv = 0, series, rounds = SK.rounds, timer = SK.timer, diff = 0, players, now, word }) {
    const ps = arr(players).map(Number), score = {};
    ps.forEach(p => { score[pk(p)] = 0; });
    const s = { type: "contest", mid, lv, series: arr(series), rounds: SK.roundChoices.includes(Number(rounds)) ? Number(rounds) : SK.rounds, timer: SK.timerChoices.includes(Number(timer)) ? Number(timer) : SK.timer,
        diff: SK.diffChoices.includes(Number(diff)) ? Number(diff) : 0, players: ps, round: 1, n: 0, score, log: [], ev: { n: 0 } };
    startDraw(s, ps, word, now);
    return s;
}
function startDraw(s, ent, word, now) {
    s.n = (Number(s.n) || 0) + 1; s.ent = arr(ent).map(Number); s.word = wordOf(word);
    s.done = null; s.rt = null; s.gal = null; s.gi = null; s.gain = null; s.why = null; s.nx = null;
    s.phase = "draw"; s.t0 = now; s.dl = now + Number(s.timer) * 1000;
    ev(s, "draw", { r: s.round });
}
function endDraw(s, now) {
    if (ents(s).length < 2) { endRate(s, "solo", now); return; }        // nobody to rate with: straight to the results
    s.phase = "rate"; s.gal = seeded(ents(s), Number(s.mid) * 31 + Number(s.n) * 7919);
    s.gi = 0; s.t0 = now; s.dl = now + CT.ratePer;
    ev(s, "rate");
}
// the next drawing, or the results after the last one
function nextShown(s, why, now) {
    const i = (Number(s.gi) || 0) + 1;
    if (i >= arr(s.gal).length) { endRate(s, why, now); return; }
    s.gi = i; s.t0 = now; s.dl = now + CT.ratePer;
    ev(s, "show", { gi: i });
}
function endRate(s, why, now) {
    const res = tally(s), gain = {};
    res.forEach(x => { s.score[pk(x.p)] = (Number(s.score[pk(x.p)]) || 0) + x.pts; gain[pk(x.p)] = x.pts; });
    s.gain = gain; s.phase = "results"; s.why = why; s.dl = null; s.t0 = now; s.nx = now + CT.resultsMs;
    if (!s.gal) s.gal = ents(s);
    s.log = arr(s.log).concat([{ r: s.round, n: s.n, w: s.word ? s.word.t : null, c: s.word ? s.word.c : 0, cat: s.word ? s.word.cat : "", res: res.map(x => ({ p: x.p, pts: x.pts, n: x.n })) }]);
    ev(s, "results", { why });
}
function finishContest(s, why) {
    const st = standings(s), top = st.length ? st[0].score : 0;
    s.phase = "over"; s.dl = null; s.nx = null; s.end = why; s.done = null; s.rt = null;
    s.winners = st.filter(x => x.score === top).map(x => x.p);
    ev(s, "over", { why });
}
function contestNewRound(s, now, present, word) {
    const pend = Object.keys(s.pend || {}).map(k => Number(k.slice(1))).filter(p => present(p) && !arr(s.players).map(Number).includes(p));
    s.players = arr(s.players).map(Number).concat(pend);
    pend.forEach(p => { if (s.score[pk(p)] == null) s.score[pk(p)] = 0; });
    s.pend = null;
    const live = s.players.filter(p => present(p));
    if (live.length < 2) { finishContest(s, "few"); return; }
    s.round = Number(s.round) + 1;
    startDraw(s, live, word, now);
    if (pend.length) s.ev.joined = pend;
}
export function actContest(s, a, ctx) {
    const now = ctx.now, present = ctx.present || (() => true), by = Number(a.by), inTurn = a.tk == null || Number(a.tk) === Number(s.n);
    const phaseOk = a.ph == null || a.ph === s.phase, players = arr(s.players).map(Number);
    switch (a.k) {
        case "done": {          // finished drawing (the last one to finish ends the drawing time)
            if (s.phase !== "draw" || !inTurn) return "stale";
            if (!ents(s).includes(by)) return "You're not drawing this round.";
            s.done = Object.assign({}, s.done, { [pk(by)]: true });
            if (allDone(s, present)) endDraw(s, now);
            return null;
        }
        case "undone": {        // back to drawing, while there's time
            if (s.phase !== "draw" || !inTurn || !isDone(s, by) || now >= Number(s.dl)) return "stale";
            const d = Object.assign({}, s.done); delete d[pk(by)]; s.done = Object.keys(d).length ? d : null;
            return null;
        }
        case "enter": {         // a player who was offline when the round began comes back while it's still being drawn
            if (s.phase !== "draw" || !inTurn || !players.includes(by) || ents(s).includes(by) || now >= Number(s.dl)) return "stale";
            s.ent = ents(s).concat([by]);
            return null;
        }
        case "rate": {
            if (s.phase !== "rate" || !inTurn) return "stale";
            if (!ents(s).includes(by)) return "Only this round's artists rate.";
            const to = Number(a.to), v = Number(a.v);
            if (to === by) return "You can't rate your own drawing.";
            if (!ents(s).includes(to)) return "stale";
            if (!shownSoFar(s).includes(to)) return "That drawing hasn't been shown yet.";
            if (!Number.isInteger(v) || v < 1 || v > CT.stars) return "Pick 1 to 5 stars.";
            // the drawing on screen: until its time is up (a little grace); earlier ones: any time until rating ends
            if (to === curOf(s) && now > Number(s.dl) + 1500) return "stale";
            const rt = Object.assign({}, s.rt), mine = Object.assign({}, rt[pk(by)]);
            mine[pk(to)] = v; rt[pk(by)] = mine; s.rt = rt;
            return null;
        }
        case "timeout": {
            if (!inTurn || !phaseOk || !Number(s.dl) || now < Number(s.dl)) return "stale";
            if (s.phase === "draw") { endDraw(s, now); return null; }
            if (s.phase === "rate") { if (a.gi != null && Number(a.gi) !== Number(s.gi)) return "stale"; nextShown(s, "time", now); return null; }
            return "stale";
        }
        case "check": {         // everyone still here is done / has rated the drawing on screen (also after someone left)
            if (!inTurn || !phaseOk) return "stale";
            if (s.phase === "draw" && allDone(s, present)) { endDraw(s, now); return null; }
            if (s.phase === "rate" && (a.gi == null || Number(a.gi) === Number(s.gi)) && curRated(s, present)) { nextShown(s, "all", now); return null; }
            return "stale";
        }
        case "next": {
            if (s.phase !== "results" || !inTurn || !phaseOk || now < Number(s.nx)) return "stale";
            if (Number(s.round) >= Number(s.rounds)) { finishContest(s, "done"); return null; }
            const w = wordOf(a.word);
            if (!w) return "need word";
            if (arr(s.log).some(L => L.w && norm(L.w) === norm(w.t))) return "used word";
            contestNewRound(s, now, present, w);
            return null;
        }
        case "join": {
            if (s.phase === "over" || players.includes(by)) return "stale";
            s.pend = Object.assign({}, s.pend, { [pk(by)]: true }); return null;
        }
        case "unjoin": {
            if (!(s.pend || {})[pk(by)]) return "stale";
            const p = Object.assign({}, s.pend); delete p[pk(by)]; s.pend = Object.keys(p).length ? p : null; return null;
        }
    }
    return "unknown move";
}
