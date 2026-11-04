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

/* the word library: CHARACTERS and OBJECTS / WEAPONS only (no places, attacks, powers, groups or terms)
   - js/sketch/words.js first: each series' recognisable objects and weapons and the important characters the roster lacks
     (it goes first, so its category, Object or Weapon, wins over the boards' plain "Object")
   - characters: the Anime Draft roster (AniList ids, so the reveal can show the picture) plus the fan nicknames
   - the Anime Feud item boards, and its titans, devils and Stands as characters */
export const CATS = ["Character", "Object", "Weapon"];
const FEUD_CATS = { "c-item": "Object", "op-devil-fruit": "Object", "aot-titans": "Character", "csm-devils": "Character", "jojo-stands": "Character" };
export function buildWords({ chars = {}, nick = {}, lib = null, extras = {}, block = [], perSeries = 30 } = {}) {
    const out = {}, blocked = new Set(block.map(norm));
    const tokCount = {};       // a single name ("Itachi") is accepted when no other character of that series shares it ("Uchiha")
    Object.entries(chars).forEach(([s, rows]) => rows.forEach(r => new Set(norm(r[1]).split(" ")).forEach(t => { tokCount[s + ":" + t] = (tokCount[s + ":" + t] || 0) + 1; })));
    // src: 0 = words.js, 1 = the roster, 2 = the Feud boards. A spelling can only ever mean ONE word of a series:
    // a board answer that is just another spelling of a curated word is skipped; otherwise the older word gives that spelling up.
    const add = (s, w, src) => {
        const t = String(w.t || "").trim(), k = norm(t);
        if (!t || !k || t.length > SK.maxWord || blocked.has(k) || letters(t) < 3 || !CATS.includes(w.cat)) return;
        const list = out[s] || (out[s] = []);
        if (list.some(x => x.k === k)) return;
        const owner = list.find(x => x.f.includes(k));
        if (owner && src === 2 && owner.src === 0) return;
        if (owner) owner.f = owner.f.filter(f => f !== k);
        const forms = [...new Set([k, ...arr(w.al).map(norm)].filter(f => f && f.length >= 2 && (f === k || !list.some(x => x.k === f))))];
        list.push({ id: s + ":" + k.replace(/ /g, "-"), t, k, s, cat: w.cat, c: w.c || 0, f: forms, src });
    };
    Object.entries(extras).forEach(([s, rows]) => arr(rows).forEach(r => add(s, Array.isArray(r) ? { t: r[0], cat: r[1], al: r[2] || [] } : r, 0)));
    Object.entries(chars).forEach(([s, rows]) => rows.slice(0, perSeries).forEach(r => {
        const name = String(r[1]), toks = norm(name).split(" ");
        const solo = toks.filter(t => t.length >= 3 && tokCount[s + ":" + t] === 1 && !/^(the|van|von|king|devil|lord|man|god)$/.test(t));
        add(s, { t: name, cat: "Character", c: Number(r[0]), al: solo.concat(arr(nick[r[0]])) }, 1);
    }));
    if (lib) Object.entries(FEUD_CATS).forEach(([bid, cat]) => {
        const b = lib.boards[bid]; if (!b) return;
        arr(b.ans).forEach(a => { if (a && a.t && !a.c && a.s && a.s !== "any") add(a.s, { t: a.t, cat, al: arr(a.al) }, 2); });
    });
    return out;
}
export const poolFor = (words, series) => arr(series).flatMap(s => words[s] || []);
// three different words for the drawer, picked at random from the whole pool (any mix of characters, objects and weapons):
// never one already drawn this match, and preferably not one this browser saw recently
export function pickOptions(words, series, { used = [], recent = [], rnd = Math.random, n = 3 } = {}) {
    const usedK = new Set(arr(used).map(norm)), rec = new Set(arr(recent));
    let pool = poolFor(words, series).filter(w => !usedK.has(w.k));
    if (pool.filter(w => !rec.has(w.id)).length >= n) pool = pool.filter(w => !rec.has(w.id));
    const out = [], left = pool.slice();
    while (out.length < n && left.length) out.push(left.splice((rnd() * left.length) | 0, 1)[0]);
    return out;
}

/* ---------------- a match ---------------- */
const pk = p => "p" + p;
export const ptsFor = order => SK.pts[order] != null ? SK.pts[order] : SK.laterPts;
export function newMatch({ mid, lv = 0, series, rounds = SK.rounds, timer = SK.timer, players, now, rnd = Math.random }) {
    const ps = arr(players).map(Number), order = ps.slice().sort(() => rnd() - .5), score = {};
    ps.forEach(p => { score[pk(p)] = 0; });
    const s = { mid, lv, series: arr(series), rounds: SK.roundChoices.includes(Number(rounds)) ? Number(rounds) : SK.rounds, timer: SK.timerChoices.includes(Number(timer)) ? Number(timer) : SK.timer,
        players: ps, order, ti: 0, round: 1, n: 0, score, log: [], ev: { n: 0 } };
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
