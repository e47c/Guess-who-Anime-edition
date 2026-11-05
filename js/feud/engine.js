/* =====================================================================
   ANIME FEUD: rules engine (pure: no DOM, no Firebase; unit-tested in Node by tools/feud-test.mjs)

   - Library:  question packs (js/feud/packs/) are compiled into boards (one ranked answer list,
               shared by every wording of the same question) and questions (one per wording).
   - Boards:   filtered by the ticked series. One series ticked = that series' answers only.
               Two or more = a crossover board built from the ticked series only, never from others.
   - Rotation: pickQuestion() scores every eligible question against the room's histories
               (exact question, its other wordings, its opposite, its family) and picks at random
               among the freshest. Nothing is ever banned for good: cooldowns fade with time.
   - Match:    newMatch / act / actorOf / advance: two teams, hidden ranked board, 3 strikes, one steal.
   ===================================================================== */
import { CHARS } from "../draft/data.js?v=3";
import { NICKNAMES } from "./nicknames.js?v=1";
import { ALIASES, NAME_ALIASES } from "./aliases.js?v=1";
import { TRAITS, parseTraits } from "./packs/traits.js?v=1";

export const FEUD_RULES = {
    rounds: 5,                 // default match length (setup offers ROUND_CHOICES)
    roundChoices: [3, 5, 7],
    timer: 30,                 // seconds per guess (setup offers TIMER_CHOICES)
    timerChoices: [20, 30, 45],
    likelyRounds: 10, likelyRoundChoices: [5, 10, 15],      // Most Likely: duels per match
    likelyTimer: 15, likelyTimerChoices: [10, 15, 20],      // seconds to vote
    buzzMs: 15000,             // face-off: nobody buzzes in time = the round's starting team answers first
    decideMs: 15000,           // play or pass: no decision in time = play
    duelRevealMs: 5000,
    duelGap: 6, duelCrossGap: 3,                            // how close two characters must be to make a duel
    maxSd: { classic: 1, likely: 3 },                       // sudden-death questions before a tie stands
    strikes: 3,
    minAnswers: 5,             // a board shows 5 to 8 answers; fewer after filtering = the question is not used
    maxAnswers: 8,
    revealMs: 6500,            // the full board stays up this long between rounds (the host can skip)
    graceMs: 700,              // a timed-out guess is struck this long after the deadline (clock skew)
    // rotation (hours). Not bans: a question inside its cooldown is only scored lower, and the score keeps
    // rising for restoreDays after the cooldown, so older questions drift back in at random.
    cooldownH: { exact: 24, reword: 36, opposite: 18, family: 6 },
    restoreDays: 7
};
const R = FEUD_RULES;
const arr = x => Array.isArray(x) ? x : (x ? Object.values(x) : []);
export const TEAMS = ["A", "B"];
export const other = t => t === "A" ? "B" : "A";

/* ---------------- text matching ---------------- */
const STOP = new Set(["the", "a", "an", "of", "no", "d", "de", "van", "von", "san", "kun", "sama"]);
export function norm(s) {
    return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
        .replace(/&/g, " and ").replace(/['’`.]/g, "").replace(/[^a-z0-9]+/g, " ")
        .replace(/\b(the|a|an)\b/g, " ").replace(/\s+/g, " ").trim();
}
// plural-insensitive: "Marines" = "marine", "Gloves" = "glove" (both sides get the same treatment)
export const stem = s => norm(s).split(" ").map(w => w.length > 3 ? w.replace(/s$/, "") : w).join(" ");
export function lev(a, b, max = 3) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const cur = [i]; let best = i;
        for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); best = Math.min(best, cur[j]); }
        if (best > max) return max + 1;
        prev = cur;
    }
    return prev[b.length];
}
// romanisation folding, for matching only: "Gojou" = "Gojo", "Yuuji" = "Yuji", "Kyouraku" = "Kyoraku", "Toushirou" = "Toshiro"
export const fold = s => String(s).replace(/ou/g, "o").replace(/oo/g, "o").replace(/uu/g, "u").replace(/ii/g, "i").replace(/aa/g, "a");
const typoOk = (k, n) => { if (/\d/.test(k) || /\d/.test(n)) return false; const L = Math.min(k.length, n.length); const t = L >= 9 ? 2 : L >= 5 ? 1 : 0; return t > 0 && lev(k, n, t) <= t; };
// a whole-word piece of the key that is most of it: "shadow clone" for "shadow clone jutsu"
const partOk = (k, n) => n.length >= 4 && n.length >= .6 * k.length && (" " + k + " ").includes(" " + n + " ");
// the whole answer inside a slightly longer input ("the rasengan jutsu"), but not inside a sentence that names several things
// ... and never when the extra words carry a number ("Super Saiyan 4" is not "Super Saiyan", "Gear 4" is not "Gear")
const wordsIn = (k, n) => { const w = n.split(" "), kw = k.split(" "); return k.length >= 4 && w.length <= kw.length + 2 && kw.every(x => w.includes(x)) && !w.some(x => /\d/.test(x) && !kw.includes(x)); };
const flat = x => x.replace(/ /g, "");

/* match a typed answer against a board. Returns { k: "hit", i } | { k: "vague", i: [..] } | { k: "miss" } | { k: "empty" } */
export function matchText(board, input) {
    const n = fold(stem(input)); if (!n) return { k: "empty" };
    const keysOf = a => a.fk || (a.fk = arr(a.keys).map(fold)), toksOf = a => a.ft || (a.ft = arr(a.toks).map(fold));
    const find = test => board.map((a, i) => keysOf(a).some(k => test(k, n)) ? i : -1).filter(i => i >= 0);
    let h = find((k, x) => k === x || flat(k) === flat(x));    // exact (any alias), spaces ignored ("gumgum" = "gum gum")
    if (h.length) return { k: "hit", i: h[0] };
    for (const t of [typoOk, partOk, wordsIn]) {               // one typo, most of the name, or the name inside a slightly longer answer
        h = find(t);
        if (h.length === 1) return { k: "hit", i: h[0] };
        if (h.length > 1) return { k: "vague", i: h };
    }
    for (const t of [(k, x) => k === x, typoOk]) {             // a character's first or last name (exact, then one typo)
        h = board.map((a, i) => toksOf(a).some(k => t(k, n)) ? i : -1).filter(i => i >= 0);
        if (h.length === 1) return { k: "hit", i: h[0] };
        if (h.length > 1) return { k: "vague", i: h };
    }
    return { k: "miss" };
}
export const matchChar = (board, cid) => { const i = board.findIndex(a => a.c && Number(a.c) === Number(cid)); return i >= 0 ? { k: "hit", i } : { k: "miss" }; };

/* ---------------- character index (the Anime Draft roster: AniList ids, names, pictures) ---------------- */
export function charIndex(chars = CHARS) {
    const idx = {};
    Object.entries(chars).forEach(([s, rows]) => {
        const full = new Map(), tok = new Map();
        rows.forEach(r => {
            const c = { id: Number(r[0]), n: r[1], s };
            full.set(norm(r[1]), c);
            new Set(norm(r[1]).split(" ").filter(w => w && !STOP.has(w))).forEach(w => { if (!tok.has(w)) tok.set(w, []); tok.get(w).push(c); });
        });
        idx[s] = { full, tok, rows };
    });
    return idx;
}
// "Luffy" -> Monkey D. Luffy. Exact full name first, then a unique name token. Returns the char or an error string.
export function resolveChar(idx, s, name) {
    const I = idx[s]; if (!I) return "unknown series " + s;
    const n = norm(name);
    if (I.full.has(n)) return I.full.get(n);
    const t = I.tok.get(n) || [];
    if (t.length === 1) return t[0];
    return t.length ? "\"" + name + "\" is ambiguous in " + s + " (" + t.map(c => c.n).join(", ") + ")" : "\"" + name + "\" is not a " + s + " character";
}
const nameToks = n => norm(n).split(" ").filter(w => w.length >= 3 && !STOP.has(w)).map(stem);

/* ---------------- the library ----------------
   Pack format (see js/feud/packs/README in the README "Anime Feud" section):
   board = { id, fam, cat, sub, pol, diff, vt, opp, only, q: [wordings], a: { <series>|any: "Answer / alias 30; ..." } } */
export const slug = s => norm(s).replace(/ /g, "-").slice(0, 40) || "x";
export const ID_RE = /^[a-z0-9-]+$/;
export function parseLine(line) {
    return String(line).split(";").map(x => x.trim()).filter(Boolean).map(x => {
        const m = /^(.*?)\s+(\d+)$/.exec(x);
        const body = m ? m[1] : x, parts = body.split("/").map(y => y.trim()).filter(Boolean);
        const char = /^@/.test(parts[0] || "");
        if (char) parts[0] = parts[0].slice(1).trim();
        return { raw: x, t: parts[0] || "", al: parts.slice(1), p: m ? Number(m[2]) : NaN, char };
    });
}
// one board answer: shown text, points, every accepted spelling (keys) and, for characters, their first / last names (toks).
// Character spellings: the pack's own aliases + nicknames.js + aliases.js (reviewed nicknames, titles, other romanisations).
function mkAnswer(bid, s, t, c, p, al = []) {
    const aliases = arr(al).concat(c ? (NICKNAMES[c.id] || []).concat(ALIASES[c.id] || []) : []);
    const keys = [...new Set([t].concat(aliases).map(stem).filter(Boolean))];
    const toks = c ? [...new Set(nameToks(c.n).concat(arr(NAME_ALIASES[c.id]).flatMap(nameToks)))] : [];
    return { id: bid + "~" + s + "~" + slug(t), s, t, c: c ? c.id : 0, p, al: aliases, keys, toks };
}
/* Boards ranked by the Anime Draft ratings (gen: { stat, top, min, skip }): the series' best in ONE category, best first.
   Classic: points by rank (ties share them; a tie is never split by the cut). Most Likely: points = the rating itself
   (duels compare two characters' ratings; never across series, since ratings are measured inside each series). */
export const GEN_STATS = { STR: 2, SPD: 3, IQ: 4, DUR: 5, CMB: 6 };
const RANK_PTS = [28, 20, 15, 11, 9, 7, 5, 3, 2, 2, 2, 2];
function genAnswers(b, type, chars, idx) {
    const g = b.gen, col = GEN_STATS[g.stat], out = [];
    if (col == null) return out;
    Object.entries(chars).forEach(([s, rows]) => {
        if (arr(g.skip).includes(s) || (g.only && !arr(g.only).includes(s))) return;
        const list = rows.filter(r => r[col] >= (g.min || 0)).sort((x, y) => y[col] - x[col] || (x[0] - y[0]));
        let top = g.top || 8;
        while (top < list.length && top > 0 && list[top][col] === list[top - 1][col]) top--;   // don't split a tie at the cut
        if (top < 5) { top = g.top || 8; while (top < list.length && list[top][col] === list[top - 1][col] && top < (g.top || 8) + 3) top++; }
        let rank = 0;
        const mine = [];
        list.slice(0, top).forEach((r, i) => {
            if (i && r[col] < list[i - 1][col]) rank = i;
            const c = idx[s] && idx[s].full.get(norm(r[1]));
            if (c) mine.push(mkAnswer(b.id, s, c.n, c, type === "likely" ? r[col] : RANK_PTS[Math.min(rank, RANK_PTS.length - 1)]));
        });
        const sum = mine.reduce((t, a) => t + a.p, 0);       // Classic: never more than 100 points per series (ties at the top can push it over)
        if (type !== "likely" && sum > 100) mine.forEach(a => { a.p = Math.max(2, Math.floor(a.p * 100 / sum)); });
        out.push(...mine);
    });
    return out;
}
/* Most Likely boards built from the character traits (trait: { key, inv, win, need, skip }): every character scored on that trait,
   points = the score (inv: 9 - score, for the opposite question: "childish" from maturity; need: { K: 5 } = only characters
   with at least that score in another trait, so "forgives" means a kind character letting go, not a villain who doesn't care). See js/feud/packs/traits.js. */
function traitAnswers(b, idx) {
    const t = b.trait, out = [];
    Object.entries(TRAITS).forEach(([s, rows]) => {
        if (arr(t.skip).includes(s) || !idx[s]) return;
        const mine = [];
        rows.forEach(([name, str]) => {
            const v = parseTraits(str)[t.key], c = idx[s].full.get(norm(name));
            if (v == null || v < 0 || !c) return;
            if (t.need) { const all = parseTraits(str); if (Object.entries(t.need).some(([k, min]) => !(all[k] >= min))) return; }
            mine.push(mkAnswer(b.id, s, c.n, c, t.inv ? 9 - v : v));
        });
        out.push(...mine.sort((x, y) => y.p - x.p || x.c - y.c));
    });
    return out;
}
// the board's ranking basis in a few words (shown above the question)
export function kindLabel(B) {
    if (!B) return "";
    if (B.kind === "canon") return B.rank === "fans" ? "Canon answers · ranked by AniList fans" : "Canon answers · ranked by how well-known";
    if (B.kind === "feats") return "Ranked by feats · Anime Draft ratings";
    if (B.kind === "power") return "Ranked by canon feats";
    if (B.kind === "traits") return "Canon behaviour · editors' trait scores";
    return "Opinion · editors' poll, not canon";
}
// a typed answer that is right for the question but not among the answers shown (for a fairer "not on the board" message)
export function fairAnswer(B, series, text, shown) {
    if (!B || B.type !== "classic" || !text) return null;
    series = arr(series);
    const rest = B.ans.filter(a => (B.generic || B.only || series.includes(a.s)) && !arr(shown).some(x => x.id === a.id));
    const r = rest.length ? matchText(rest, text) : { k: "miss" };
    return r.k === "hit" ? rest[r.i] : null;
}
export function buildLibrary(packs, chars = CHARS) {
    const idx = charIndex(chars), boards = {}, questions = [], issues = [];
    const bad = (pack, b, msg, level = "error") => issues.push({ level, pack: pack.id, board: b && b.id, msg });
    arr(packs).forEach(pack => {
        if (!pack || !pack.id || !["classic", "likely"].includes(pack.type)) { issues.push({ level: "error", pack: pack && pack.id, msg: "pack needs an id and type classic|likely" }); return; }
        arr(pack.boards).forEach(b => {
            if (!b.id || !ID_RE.test(b.id)) return bad(pack, b, "board id must be lower-case letters, digits and dashes (it is a Firebase key)");
            if (boards[b.id]) return bad(pack, b, "duplicate board id " + b.id);
            const ans = [], seenC = new Set(), seenT = new Set();
            Object.entries(b.a || {}).forEach(([s, line]) => {
                if (s !== "any" && !idx[s]) return bad(pack, b, "unknown series key " + s);
                parseLine(line).forEach(x => {
                    if (!x.t) return bad(pack, b, "empty answer in " + s);
                    if (!(x.p > 0)) return bad(pack, b, s + ": \"" + x.raw + "\" has no points");
                    const char = pack.type === "likely" || x.char;
                    let c = null;
                    if (char) {
                        if (s === "any") return bad(pack, b, "a character answer needs a series line, not 'any': " + x.t);
                        c = resolveChar(idx, s, x.t);
                        if (typeof c === "string") return bad(pack, b, c);
                        if (seenC.has(c.id)) return bad(pack, b, s + ": " + c.n + " is listed twice");
                        seenC.add(c.id);
                    }
                    const t = c ? c.n : x.t, key = s + ":" + stem(t);
                    if (!c && seenT.has(key)) return bad(pack, b, s + ": \"" + t + "\" is listed twice");
                    seenT.add(key);
                    ans.push(mkAnswer(b.id, s, t, c, x.p, x.al));
                });
            });
            if (b.gen) genAnswers(b, pack.type, chars, idx).forEach(a => ans.push(a));
            if (b.trait) traitAnswers(b, idx).forEach(a => ans.push(a));
            const series = [...new Set(ans.map(a => a.s))];
            const B = { id: b.id, pack: pack.id, type: pack.type, fam: b.fam || b.id, cat: b.cat || "General", sub: b.sub || "", pol: b.pol || "0", diff: Number(b.diff) || 2, vt: b.vt || "base",
                opp: b.opp || "", only: b.only ? (series[0] || "") : "", kind: b.kind || "poll", rank: b.rank || "", why: b.why || "", noCross: !!(b.gen || b.noCross), gen: b.gen || null, trait: b.trait || null, agree: b.agree || null, beats: b.beats || null, generic: series.length === 1 && series[0] === "any", series, ans,
                source: pack.source || "Anime Arcade curated answers", review: b.review || pack.review || "curated", ranking: "curated", votes: null };
            boards[b.id] = B;
            arr(b.q).forEach((w, i) => {
                const m = /^([SM])\|(.*)$/.exec(w), text = (m ? m[2] : w).trim();
                questions.push({
                    questionId: b.id + "_" + (i + 1), familyId: B.fam, variantGroupId: B.id, variantType: i === 0 ? B.vt : "reword",
                    questionType: pack.type, animeScope: B.generic ? "generic" : B.only ? "single" : "cross", animeIds: B.generic ? [] : series,
                    category: B.cat, subcategory: B.sub, difficulty: B.diff, polarity: B.pol, questionText: text, wording: m ? m[1] : "",
                    answers: ans.map(a => a.id), answerPoints: ans.map(a => a.p), characterIds: ans.filter(a => a.c).map(a => a.c),
                    acceptedAliases: Object.fromEntries(ans.filter(a => a.al.length).map(a => [a.id, a.al])),
                    oppositeGroupId: B.opp, curationSource: B.source, reviewStatus: B.review
                });
            });
            if (!arr(b.q).length) bad(pack, b, "board has no question wording");
        });
    });
    // opposites must point at a real board, both ways
    Object.values(boards).forEach(B => {
        if (!B.opp) return;
        const O = boards[B.opp];
        if (!O) issues.push({ level: "error", pack: B.pack, board: B.id, msg: "opposite " + B.opp + " does not exist" });
        else if (O.opp !== B.id) issues.push({ level: "error", pack: B.pack, board: B.id, msg: "opposite " + B.opp + " does not point back" });
        else if (O.type !== B.type) issues.push({ level: "error", pack: B.pack, board: B.id, msg: "opposite " + B.opp + " is a different game type" });
    });
    /* two trait questions that are opposites but scored separately (kind / cruel, loyal / betrays, honest / liar...):
       a pair of characters where the same one comes out on top on BOTH (Zoro trains hardest AND naps most) is not a clear
       call, so that duel is dropped from both boards. */
    Object.values(boards).forEach(B => {
        const O = B.trait && B.opp && boards[B.opp];
        if (!O || !O.trait) return;
        const om = new Map(O.ans.map(a => [a.c, a.p])), list = B.ans.filter(a => om.has(a.c));
        B.clash = new Set();
        for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++)
            if ((list[i].p - list[j].p) * (om.get(list[i].c) - om.get(list[j].c)) > 0) B.clash.add(pairKey(list[i].c, list[j].c));
    });
    const version = hashStr(JSON.stringify(Object.values(boards).map(B => [B.id, B.ans.map(a => [a.id, a.p])])) + questions.map(q => q.questionId).join());
    return { boards, questions, issues, version, idx };
}
const pairKey = (a, b) => a < b ? a + ":" + b : b + ":" + a;
export function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

/* ---------------- boards for the ticked series ---------------- */
export const scopeOf = series => series.length === 1 ? series[0] : "mix";
// the answers a board shows for these series, best first (5..8), or null if the question doesn't fit them
export function boardFor(B, series) {
    series = arr(series);
    let list;
    if (B.only) { if (series.length !== 1 || series[0] !== B.only) return null; list = B.ans; }
    else if (B.generic) { if (series.length < 2) return null; list = B.ans; }
    else list = B.ans.filter(a => series.includes(a.s));
    list = list.slice().sort((x, y) => y.p - x.p || (x.id < y.id ? -1 : 1));
    if (series.length >= 2 && !B.generic) {
        const reps = new Set(list.map(a => a.s)).size;
        if (reps < 2) return null;                               // a crossover board needs at least two of the ticked series
        const cap = Math.max(2, Math.ceil(R.maxAnswers / reps) + 1), n = {}, out = [];
        for (const a of list) { if (out.length >= R.maxAnswers) break; if ((n[a.s] || 0) >= cap) continue; n[a.s] = (n[a.s] || 0) + 1; out.push(a); }
        list = out;
        if (new Set(list.map(a => a.s)).size < 2) return null;
    } else list = list.slice(0, R.maxAnswers);
    return list.length >= R.minAnswers ? list : null;
}
// "{a}" = "One Piece " / "" ; "{s}" = "One Piece" / "One Piece or Naruto" / "your chosen series"
export function qText(tpl, series, label = k => k) {
    series = arr(series);
    const one = series.length === 1, names = series.map(label);
    const s = one ? names[0] : names.length <= 3 ? (names.length === 2 ? names.join(" or ") : names.slice(0, -1).join(", ") + " or " + names[names.length - 1]) : "your chosen series";
    const t = String(tpl).replace(/\{a\}/g, one ? names[0] + " " : "").replace(/\{s\}/g, s).replace(/\s+/g, " ").trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
}
/* Most Likely duels: two characters who are CLOSE on a curated board ("who is smarter: Robin or Law?").
   Same series: neighbours in the ranking (or one apart) a few points from each other. In a mix, also two characters of
   two different ticked series with nearly the same score. The higher-ranked one is the "most likely" answer; ties are never used. */
export function pairsFor(B, series) {
    series = arr(series);
    if (B.only && (series.length !== 1 || series[0] !== B.only)) return [];
    if (B.generic) return [];
    const by = {}; B.ans.filter(a => a.c && series.includes(a.s)).forEach(a => (by[a.s] = by[a.s] || []).push(a));
    const out = [], add = (x, y, cross) => { const [w, l] = x.p > y.p ? [x, y] : [y, x]; out.push({ w: w.c, l: l.c, gap: w.p - l.p, cross: !!cross, ws: w.s, ls: l.s }); };
    if (B.trait) {
        /* trait boards (0-9 scores): any two characters 2 to 5 points apart, and the answer must clearly show the trait
           (score >= win, 5 by default). Across series (a mix): 2 to 4 apart, both showing at least some of it (>= 3). */
        const win = B.trait.win == null ? 5 : B.trait.win, lists = Object.values(by), clash = (x, y) => !!(B.clash && B.clash.has(pairKey(x.c, y.c)));
        lists.forEach(list => { for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
            const d = Math.abs(list[i].p - list[j].p);
            if (d >= 2 && d <= 5 && Math.max(list[i].p, list[j].p) >= win && !clash(list[i], list[j])) add(list[i], list[j]);
        } });
        if (series.length > 1) for (let i = 0; i < lists.length; i++) for (let j = i + 1; j < lists.length; j++)
            lists[i].forEach(x => lists[j].forEach(y => { const d = Math.abs(x.p - y.p); if (d >= 2 && d <= 4 && Math.min(x.p, y.p) >= 3 && Math.max(x.p, y.p) >= win && !clash(x, y)) add(x, y, true); }));
        return out;
    }
    Object.values(by).forEach(list => {
        list = list.slice().sort((x, y) => y.p - x.p);
        for (let i = 0; i < list.length; i++) {
            const n1 = list[i + 1], n2 = list[i + 2];
            if (n1 && list[i].p > n1.p && list[i].p - n1.p <= R.duelGap) add(list[i], n1);
            if (n2 && list[i].p > n2.p && list[i].p - n2.p <= R.duelGap - 2 && n1.p !== n2.p) add(list[i], n2);
        }
    });
    if (series.length > 1 && !B.noCross) {
        const keys = Object.keys(by);
        for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++)
            by[keys[i]].forEach(x => by[keys[j]].forEach(y => { if (x.p >= 10 && y.p >= 10 && x.p !== y.p && Math.abs(x.p - y.p) <= R.duelCrossGap) add(x, y, true); }));
    }
    return out;
}
export const duelPoints = gap => gap <= 2 ? 30 : gap <= 4 ? 20 : 10;        // the closer the call, the more it's worth
// one duel for a question: random pair (in a mix, a cross-series pair half the time when there is one), random sides
export function pickPair(lib, c, series, rnd = Math.random) {
    const B = lib.boards[c.g], all = pairsFor(B, series); if (!all.length) return null;
    const cross = all.filter(p => p.cross), pool = cross.length && arr(series).length > 1 && rnd() < .5 ? cross : all.filter(p => !p.cross).length ? all.filter(p => !p.cross) : all;
    const p = pool[Math.floor(rnd() * pool.length)], left = rnd() < .5;
    return { a: left ? p.w : p.l, b: left ? p.l : p.w, w: left ? "a" : "b", pts: duelPoints(p.gap) };
}
// every question of this type that works for these series
export function eligible(lib, type, series) {
    series = arr(series);
    const scope = scopeOf(series), single = series.length === 1, cache = {}, out = [];
    lib.questions.forEach(q => {
        if (q.questionType !== type) return;
        if ((q.wording === "S" && !single) || (q.wording === "M" && single)) return;
        const B = lib.boards[q.variantGroupId];
        if (!(B.id in cache)) cache[B.id] = type === "likely" ? pairsFor(B, series) : boardFor(B, series);
        if (!cache[B.id] || !cache[B.id].length) return;
        out.push({ key: q.questionId + "@" + scope, id: q.questionId, g: B.id, f: B.fam, opp: B.opp, n: cache[B.id].length, tpl: q.questionText });
    });
    return out;
}
export function poolInfo(lib, type, series) {
    const e = eligible(lib, type, series);
    return { questions: e.length, boards: new Set(e.map(x => x.g)).size, families: new Set(e.map(x => x.f)).size };
}
// the board of the question currently in play (recomputed by every client from the shared library; answers are never stored in the room)
export function stateBoard(lib, s) {
    if (!s || !s.q) return null;
    const B = lib.boards[String(s.q.id).replace(/_\d+$/, "")];
    return B ? boardFor(B, arr(s.series)) : null;
}

/* ---------------- question rotation ----------------
   A history is { "<questionId>@<scope>": [lastSeenMs, timesSeen] } per player (scope = series key or "mix").
   Score per candidate (higher = fresher):
     3.0 x share of players who have NOT met this question or one of its other wordings inside the cooldown   (priority 1)
     1.5 x average freshness (exact, rewording, opposite and family cooldowns, each fading linearly)           (2, 3)
     0.6 x average restoration (keeps rising for restoreDays after the cooldown, so old questions come back) (5)
     0.3 x random                                                                                               (4)
   Then a weighted random pick among everything within 0.35 of the best score. Nothing is excluded for good. */
const H = 3600e3;
const gidOf = qid => String(qid).replace(/_\d+$/, "");
export function digest(hist, lib) {
    const d = { key: {}, grp: {}, fam: {} };
    Object.entries(hist || {}).forEach(([k, v]) => {
        const t = Number(arr(v)[0]) || 0, n = Number(arr(v)[1]) || 1; if (!t) return;
        const at = k.lastIndexOf("@"), qid = at > 0 ? k.slice(0, at) : k, scope = at > 0 ? k.slice(at + 1) : "", g = gidOf(qid);
        d.key[k] = { t: Math.max(t, (d.key[k] || {}).t || 0), n };
        const gk = g + "@" + scope; d.grp[gk] = Math.max(d.grp[gk] || 0, t);
        const B = lib && lib.boards[g]; if (B) d.fam[B.fam] = Math.max(d.fam[B.fam] || 0, t);
    });
    return d;
}
const fade = (age, h) => h <= 0 ? 1 : Math.max(0, Math.min(1, age / (h * H)));
export function scoreCandidate(c, digests, now, rules = R) {
    const cd = rules.cooldownH, scope = c.key.slice(c.key.lastIndexOf("@") + 1);
    if (!digests.length) return { fresh: 1, mean: 1, restore: 1, score: 5.1 };
    let freshN = 0, mean = 0, restore = 0;
    digests.forEach(D => {
        const tq = (D.key[c.key] || {}).t || 0, tg = D.grp[c.g + "@" + scope] || 0, to = c.opp ? D.grp[c.opp + "@" + scope] || 0 : 0, tf = D.fam[c.f] || 0;
        const aq = tq ? now - tq : Infinity, ag = tg ? now - tg : Infinity, ao = to ? now - to : Infinity, af = tf ? now - tf : Infinity;
        const recent = aq < cd.exact * H || ag < cd.reword * H;
        if (!recent) freshN++;
        mean += fade(aq, cd.exact) * fade(ag, cd.reword) * (.35 + .65 * fade(ao, cd.opposite)) * (.6 + .4 * fade(af, cd.family));
        restore += tq ? Math.min(1, Math.max(0, aq - cd.exact * H) / (rules.restoreDays * 24 * H)) : 1;
    });
    const n = digests.length, r = { fresh: freshN / n, mean: mean / n, restore: restore / n };
    r.score = 3 * r.fresh + 1.5 * r.mean + .6 * r.restore;
    return r;
}
/* used = the questions already played this match ([{ key, g, f, opp }]). In-match rules, relaxed only when nothing else is left:
   never the same question; then avoid its other wordings, its opposite and its family, in that order of importance. */
export function pickQuestion(cands, { hists = [], used = [], now = Date.now(), rnd = Math.random, lib = null, rules = R } = {}) {
    used = arr(used);
    const uk = new Set(used.map(u => u.key)), ug = new Set(used.map(u => u.g)), uf = new Set(used.map(u => u.f)), uo = new Set(used.flatMap(u => [u.opp, u.g].filter(Boolean)));
    const levels = [c => !ug.has(c.g) && !uo.has(c.g) && !uf.has(c.f), c => !ug.has(c.g) && !uo.has(c.g), c => !ug.has(c.g), () => true];
    const digests = arr(hists).map(h => digest(h, lib));
    for (const ok of levels) {
        const pool = cands.filter(c => !uk.has(c.key) && ok(c));
        if (!pool.length) continue;
        const scored = pool.map(c => ({ c, s: scoreCandidate(c, digests, now, rules).score + .3 * rnd() }));
        const best = Math.max(...scored.map(x => x.s)), band = scored.filter(x => x.s >= best - .35);
        let tot = band.reduce((t, x) => t + (x.s - best + .4), 0), r = rnd() * tot;
        for (const x of band) { r -= x.s - best + .4; if (r <= 0) return x.c; }
        return band[band.length - 1].c;
    }
    return null;
}
// add a sighting to a history object (returns a new object). Old or excess entries are trimmed.
export function remember(hist, key, now = Date.now(), { keepDays = 45, max = 600 } = {}) {
    const h = Object.assign({}, hist || {}), cur = arr(h[key]);
    h[key] = [now, (Number(cur[1]) || 0) + (Number(cur[0]) === now ? 0 : 1)];
    return trimHist(h, now, keepDays, max);
}
export function trimHist(h, now = Date.now(), keepDays = 45, max = 600) {
    const e = Object.entries(h || {}).filter(([, v]) => now - (Number(arr(v)[0]) || 0) < keepDays * 24 * H).sort((a, b) => Number(arr(b[1])[0]) - Number(arr(a[1])[0])).slice(0, max);
    return Object.fromEntries(e);
}

/* ---------------- teams ---------------- */
// saved host picks first ({ p3: "A" }), then everyone else fills the smaller team; never leaves a team empty if it can help it
export function balanceTeams(players, saved = {}) {
    const T = { A: [], B: [] }, rest = [];
    arr(players).map(Number).forEach(p => { const v = (saved || {})["p" + p]; if (v === "A" || v === "B") T[v].push(p); else rest.push(p); });
    rest.forEach(p => T[T.A.length <= T.B.length ? "A" : "B"].push(p));
    TEAMS.forEach(k => { const o = T[other(k)]; if (!T[k].length && o.length >= 2) T[k].push(o.pop()); });
    return T;
}

/* ---------------- the match ---------------- */
function evt(s, o) { s.evn = (Number(s.evn) || 0) + 1; s.ev = Object.assign({ n: s.evn }, o); }
const teamOf = (s, p) => TEAMS.find(k => arr(s.teams[k]).map(Number).includes(Number(p))) || "";
export const startTeam = (s, round) => (round % 2 === 1) === (s.first !== "B") ? "A" : "B";     // round 1 = s.first, then alternate
/* Most Likely can be played Team vs Team (o.teams) or Free For All (o.ffa + o.players: every player scores for themselves). */
export function newMatch(o) {
    const likely = o.type === "likely", ffa = likely && !!o.ffa, teams = o.teams || { A: [], B: [] };
    const s = { v: 2, lv: o.lv || "", mid: o.mid, type: o.type, series: arr(o.series).slice(),
        rounds: o.rounds || (likely ? R.likelyRounds : R.rounds), timer: o.timer || (likely ? R.likelyTimer : R.timer),
        teams: { A: arr(teams.A).map(Number), B: arr(teams.B).map(Number) }, ptr: { A: 0, B: 0 }, fptr: { A: 0, B: 0 }, score: { A: 0, B: 0 },
        first: o.first === "B" ? "B" : "A", round: 0, sd: 0, used: [], log: [], phase: "pick", evn: 0, tk: 0 };
    if (ffa) { s.ffa = 1; s.players = arr(o.players).map(Number); s.teams = { A: [], B: [] }; s.score = Object.fromEntries(s.players.map(p => ["p" + p, 0])); }
    if (o.q) startRound(s, o.q, o.now || Date.now());
    return s;
}
function startRound(s, c, now) {
    s.round = (Number(s.round) || 0) + 1;
    s.q = { key: c.key, id: c.id, g: c.g, f: c.f, opp: c.opp || "", at: now };
    s.used = arr(s.used).concat([{ key: c.key, g: c.g, f: c.f, opp: c.opp || "" }]);
    s.turn = startTeam(s, s.round); s.tk = (Number(s.tk) || 0) + 1; s.nx = 0;
    if (s.type === "likely") {
        s.duel = { a: Number(c.pair.a), b: Number(c.pair.b), w: c.pair.w, pts: Number(c.pair.pts) || 10 };
        s.votes = {}; s.phase = "vote"; s.dl = now + s.timer * 1000;
        evt(s, { k: "duel", round: s.round, sd: s.sd });
        return;
    }
    // Classic: every round opens with a face-off. One player per team at the buzzers (rotating every face-off).
    s.strikes = 0; s.bank = 0; s.rev = {}; s.fb = ""; s.fa = -2; s.ctrl = "";
    s.phase = "buzz"; s.dl = now + R.buzzMs;
    evt(s, { k: "round", round: s.round, sd: s.sd, team: s.turn });
}
const memberAt = (s, team, idx, present) => {
    const m = arr(s.teams[team]).map(Number); if (!m.length) return 0;
    const st = (Number(idx) || 0) % m.length;
    for (let k = 0; k < m.length; k++) { const p = m[(st + k) % m.length]; if (present(p)) return p; }
    return m[st];
};
// the team's face-off player this round
export const faceOffOf = (s, team, present = () => true) => memberAt(s, team, ((s.fptr || {})[team] || 0), present);
export const guessTeam = s => s.phase === "face" ? s.fb : s.phase === "face2" ? other(s.fb) : s.phase === "play" ? s.turn : s.phase === "steal" ? other(s.turn) : "";
// who answers now: the face-off player, or the team's pointer (skipping players who are away: they get their go back when they return)
export function actorOf(s, present = () => true) {
    if (!s) return 0;
    if (s.phase === "face" || s.phase === "face2") return faceOffOf(s, guessTeam(s), present);
    if (s.phase !== "play" && s.phase !== "steal") return 0;
    return memberAt(s, guessTeam(s), (s.ptr || {})[guessTeam(s)], present);
}
function nextGuesser(s, team, p) { const m = arr(s.teams[team]).map(Number), i = m.indexOf(Number(p)); s.ptr = Object.assign({ A: 0, B: 0 }, s.ptr, { [team]: ((i >= 0 ? i : Number(s.ptr[team]) || 0) + 1) % Math.max(1, m.length) }); }
function nextFaceOff(s) { s.fptr = { A: ((s.fptr || {}).A || 0) + 1, B: ((s.fptr || {}).B || 0) + 1 }; }
function endRound(s, winner, how, now) {
    const pts = Number(s.bank) || 0;
    s.score = Object.assign({ A: 0, B: 0 }, s.score); s.score[winner] = (Number(s.score[winner]) || 0) + pts;
    s.log = arr(s.log).concat([{ r: s.round, sd: s.sd || 0, key: s.q.key, id: s.q.id, win: winner, how, pts, ctrl: s.ctrl || "", rev: Object.assign({}, s.rev) }]);
    s.phase = "reveal"; s.nx = now + R.revealMs; s.tk = (Number(s.tk) || 0) + 1; s.dl = 0;
    nextFaceOff(s);
    evt(s, { k: "end", win: winner, how, pts });
}
function toControl(s, team, now, why) {
    s.ctrl = team; s.phase = "decide"; s.tk++; s.dl = now + R.decideMs;
    evt(s, { k: "control", team, why });
}
/* Moves.
   Classic: { k: "buzz", by } | { k: "guess", by, tk, text } | { k: "decide", by, tk, play } | { k: "timeout", tk }
   Likely:  { k: "vote", by, pick: "a"|"b" } | { k: "timeout", tk }
   ctx = { board, present, now, force }. Returns "" when applied, or the reason it was refused (the transaction then aborts). */
export function act(s, a, ctx) {
    if (!s || !ctx) return "Not ready.";
    if (s.type === "likely") return actLikely(s, a, ctx);
    if (!ctx.board) return "The board isn't ready.";
    if (!["buzz", "face", "face2", "decide", "play", "steal"].includes(s.phase)) return "This round is over.";
    const now = ctx.now || Date.now(), present = ctx.present || (() => true), board = ctx.board;
    // --- the buzzer
    if (a.k === "buzz") {
        if (s.phase !== "buzz") return "stale";
        const t = teamOf(s, a.by);
        if (!t || (faceOffOf(s, t, present) !== Number(a.by) && !ctx.force)) return "Only the two face-off players can buzz.";
        s.fb = t; s.phase = "face"; s.tk++; s.dl = now + s.timer * 1000;
        evt(s, { k: "buzz", team: t, by: Number(a.by) }); return "";
    }
    if (Number(a.tk) !== Number(s.tk)) return "stale";
    if (a.k === "timeout" && now < Number(s.dl) && !ctx.force) return "Time isn't up yet.";
    if (s.phase === "buzz") {            // nobody buzzed: the round's starting team answers first
        if (a.k !== "timeout") return "Buzz first!";
        s.fb = s.turn; s.phase = "face"; s.tk++; s.dl = now + s.timer * 1000;
        evt(s, { k: "buzz", team: s.turn, by: faceOffOf(s, s.turn, present), auto: true }); return "";
    }
    // --- play or pass
    if (s.phase === "decide") {
        if (a.k === "decide") { if (teamOf(s, a.by) !== s.ctrl && !ctx.force) return "The other team is deciding."; }
        else if (a.k !== "timeout") return "Play or pass first.";
        const play = a.k === "timeout" ? true : !!a.play;
        s.turn = play ? s.ctrl : other(s.ctrl); s.phase = "play"; s.strikes = 0; s.tk++; s.dl = now + s.timer * 1000;
        evt(s, { k: "decide", team: s.ctrl, play, by: Number(a.by) || 0, auto: a.k === "timeout" });
        if (Object.keys(s.rev || {}).length >= board.length) endRound(s, s.turn, "clear", now);
        return "";
    }
    // --- an answer (face-off, play or steal)
    const team = guessTeam(s), who = actorOf(s, present);
    let r;
    if (a.k === "timeout") r = { k: "miss", timeout: true };
    else if (a.k === "guess") {
        if (Number(a.by) !== who && !ctx.force) return teamOf(s, a.by) === team ? "It's another teammate's turn to answer." : "It's not your team's turn.";
        r = a.cid ? matchChar(board, a.cid) : matchText(board, a.text);
        if (r.k === "empty") return "Type an answer first.";
        if (r.k === "vague") return "Be more specific: that fits more than one answer.";
        if (r.k === "hit" && s.rev && s.rev[r.i] != null) return "Already on the board. Try another answer.";
    } else return "Unknown move.";
    const said = a.cid ? Number(a.cid) : String(a.text || "").slice(0, 60);
    if (r.k === "hit") { s.rev = Object.assign({}, s.rev, { [r.i]: team }); s.bank = (Number(s.bank) || 0) + board[r.i].p; }
    // face-off: the top answer wins control at once; otherwise the other face-off player answers, and the higher answer wins control
    if (s.phase === "face" || s.phase === "face2") {
        const i = r.k === "hit" ? r.i : -1;
        evt(s, r.k === "hit" ? { k: "hit", team, by: who, i, said, face: 1, top: i === 0 } : { k: "miss", team, by: who, said, timeout: !!r.timeout, face: 1 });
        if (s.phase === "face") {
            if (i === 0) return toControl(s, team, now, "top"), "";
            s.fa = i; s.phase = "face2"; s.tk++; s.dl = now + s.timer * 1000; return "";
        }
        const first = Number(s.fa);
        if (i === 0 || (i >= 0 && (first < 0 || i < first))) return toControl(s, team, now, i === 0 ? "top" : "higher"), "";
        if (first >= 0) return toControl(s, s.fb, now, "higher"), "";
        // both missed: a new face-off with the next pair of players
        nextFaceOff(s); s.fb = ""; s.fa = -2; s.phase = "buzz"; s.tk++; s.dl = now + R.buzzMs;
        evt(s, { k: "refaceoff" }); return "";
    }
    nextGuesser(s, team, who);
    if (r.k === "hit") {
        evt(s, { k: "hit", team, by: who, i: r.i, said });
        if (s.phase === "steal") return endRound(s, team, "steal", now), "";
        if (Object.keys(s.rev).length >= board.length) return endRound(s, team, "clear", now), "";
        s.tk++; s.dl = now + s.timer * 1000; return "";
    }
    if (s.phase === "steal") { evt(s, { k: "miss", team, by: who, said, timeout: !!r.timeout }); return endRound(s, s.turn, "defend", now), ""; }
    s.strikes = (Number(s.strikes) || 0) + 1;
    evt(s, { k: "miss", team, by: who, said, timeout: !!r.timeout, strikes: s.strikes });
    if (s.strikes >= R.strikes) { s.phase = "steal"; evt(s, { k: "steal", team: other(s.turn), bank: s.bank }); }
    s.tk++; s.dl = now + s.timer * 1000;
    return "";
}
/* ---------------- Most Likely: both teams vote at once ---------------- */
// a team's pick = its members' majority; a split team goes with whoever voted first
export function teamPick(s, team) {
    const v = arr(s.teams[team]).map(Number).map(p => (s.votes || {})["p" + p]).filter(Boolean).map(arr);
    if (!v.length) return "";
    const na = v.filter(x => x[0] === "a").length, nb = v.filter(x => x[0] === "b").length;
    if (na !== nb) return na > nb ? "a" : "b";
    return v.slice().sort((x, y) => Number(x[1]) - Number(y[1]))[0][0];
}
// everyone who plays: the two teams, or every Free For All player
export const seatsOf = s => s.ffa ? arr(s.players).map(Number) : arr(s.teams.A).concat(arr(s.teams.B)).map(Number);
const allVoted = (s, present) => seatsOf(s).filter(present).every(p => (s.votes || {})["p" + p]);
// the top of a Free For All table (several players when tied)
export const leaders = s => { const e = Object.entries(s.score || {}); if (!e.length) return []; const top = Math.max(...e.map(x => Number(x[1]) || 0)); return e.filter(x => (Number(x[1]) || 0) === top).map(x => Number(x[0].slice(1))); };
function actLikely(s, a, ctx) {
    const now = ctx.now || Date.now(), present = ctx.present || (() => true);
    if (s.phase !== "vote") return "stale";
    if (a.k === "vote") {
        if (s.ffa ? !arr(s.players).map(Number).includes(Number(a.by)) : !teamOf(s, a.by)) return "Only players in the match can vote.";
        if (a.pick !== "a" && a.pick !== "b") return "Pick one of the two.";
        const prev = arr((s.votes || {})["p" + a.by]);
        if (prev[0] === a.pick) return "stale";
        s.votes = Object.assign({}, s.votes, { ["p" + a.by]: [a.pick, prev[1] || now] });
        evt(s, { k: "vote", by: Number(a.by) });
        if (allVoted(s, present)) resolveDuel(s, now);
        return "";
    }
    if (a.k === "timeout") {
        if (Number(a.tk) !== Number(s.tk)) return "stale";
        if (now < Number(s.dl) && !ctx.force) return "Time isn't up yet.";
        resolveDuel(s, now); return "";
    }
    return "Unknown move.";
}
function resolveDuel(s, now) {
    if (s.ffa) {       // every player scores for their own pick
        const d = s.duel, gain = {}, picks = {};
        arr(s.players).map(Number).forEach(p => { const v = arr((s.votes || {})["p" + p])[0] || ""; picks["p" + p] = v; gain["p" + p] = v === d.w ? d.pts : 0; s.score["p" + p] = (Number(s.score["p" + p]) || 0) + gain["p" + p]; });
        s.log = arr(s.log).concat([{ r: s.round, sd: s.sd || 0, key: s.q.key, id: s.q.id, a: d.a, b: d.b, w: d.w, pts: d.pts, picks, gain, votes: Object.assign({}, s.votes) }]);
        s.phase = "reveal"; s.nx = now + R.duelRevealMs; s.tk = (Number(s.tk) || 0) + 1; s.dl = 0;
        evt(s, { k: "result", picks, gain, w: d.w });
        return;
    }
    const d = s.duel, picks = { A: teamPick(s, "A"), B: teamPick(s, "B") }, gain = { A: 0, B: 0 };
    s.score = Object.assign({ A: 0, B: 0 }, s.score);
    TEAMS.forEach(t => { if (picks[t] && picks[t] === d.w) { gain[t] = d.pts; s.score[t] = (Number(s.score[t]) || 0) + d.pts; } });
    s.log = arr(s.log).concat([{ r: s.round, sd: s.sd || 0, key: s.q.key, id: s.q.id, a: d.a, b: d.b, w: d.w, pts: d.pts, picks, gain, votes: Object.assign({}, s.votes) }]);
    s.phase = "reveal"; s.nx = now + R.duelRevealMs; s.tk = (Number(s.tk) || 0) + 1; s.dl = 0;
    evt(s, { k: "result", picks, gain, w: d.w });
}
/* host: after the reveal, the next round (c = the picked question, with c.pair for Most Likely) or the end.
   A tie after the last round plays sudden death: one question in Classic, up to three in Most Likely. */
export function needsQuestion(s) {
    if (!s || s.phase !== "reveal") return false;
    if (s.round < s.rounds) return true;
    const tied = s.ffa ? leaders(s).length > 1 : s.score.A === s.score.B;
    return tied && (Number(s.sd) || 0) < (R.maxSd[s.type] || 1);
}
export function advance(s, round, c, now = Date.now()) {
    if (!s || s.phase !== "reveal" || Number(s.round) !== Number(round)) return "stale";
    if (needsQuestion(s)) {
        if (!c || (s.type === "likely" && !c.pair)) return finish(s, "out"), "";
        if (s.round >= s.rounds) s.sd = (Number(s.sd) || 0) + 1;
        startRound(s, c, now); return "";
    }
    finish(s, ""); return "";
}
function finish(s, why) {
    s.phase = "over"; s.dl = 0; s.nx = 0; s.tk = (Number(s.tk) || 0) + 1;
    if (s.ffa) { s.winners = leaders(s); s.winner = s.winners.length === 1 ? "p" + s.winners[0] : ""; }
    else s.winner = s.score.A > s.score.B ? "A" : s.score.B > s.score.A ? "B" : "";
    if (why) s.why = why;
    evt(s, { k: "over", win: s.winner });
}
