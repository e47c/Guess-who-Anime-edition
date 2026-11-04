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
import { CHARS } from "../draft/data.js?v=2";
import { NICKNAMES } from "./nicknames.js?v=1";

export const FEUD_RULES = {
    rounds: 5,                 // default match length (setup offers ROUND_CHOICES)
    roundChoices: [3, 5, 7],
    timer: 30,                 // seconds per guess (setup offers TIMER_CHOICES)
    timerChoices: [20, 30, 45],
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
const typoOk = (k, n) => { if (/\d/.test(k) || /\d/.test(n)) return false; const L = Math.min(k.length, n.length); const t = L >= 9 ? 2 : L >= 5 ? 1 : 0; return t > 0 && lev(k, n, t) <= t; };
// a whole-word piece of the key that is most of it: "shadow clone" for "shadow clone jutsu"
const partOk = (k, n) => n.length >= 4 && n.length >= .6 * k.length && (" " + k + " ").includes(" " + n + " ");
const wordsIn = (k, n) => { const w = n.split(" "); return k.length >= 4 && k.split(" ").every(x => w.includes(x)); };

/* match a typed answer against a board. Returns { k: "hit", i } | { k: "vague", i: [..] } | { k: "miss" } | { k: "empty" } */
export function matchText(board, input) {
    const n = stem(input); if (!n) return { k: "empty" };
    const find = test => board.map((a, i) => a.keys.some(k => test(k, n)) ? i : -1).filter(i => i >= 0);
    let h = find((k, x) => k === x);                          // exact (any alias)
    if (h.length) return { k: "hit", i: h[0] };
    for (const t of [typoOk, partOk, wordsIn]) {               // one typo, most of the name, or the name inside a longer answer
        h = find(t);
        if (h.length === 1) return { k: "hit", i: h[0] };
        if (h.length > 1) return { k: "vague", i: h };
    }
    for (const t of [(k, x) => k === x, typoOk]) {             // a character's first or last name (exact, then one typo)
        h = board.map((a, i) => a.toks.some(k => t(k, n)) ? i : -1).filter(i => i >= 0);
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
                    const aliases = x.al.concat(c ? NICKNAMES[c.id] || [] : []), keys = [...new Set([t].concat(aliases).map(stem).filter(Boolean))];
                    ans.push({ id: b.id + "~" + s + "~" + slug(t), s, t, c: c ? c.id : 0, p: x.p, al: aliases, keys, toks: c ? [...new Set(nameToks(c.n).concat(aliases.flatMap(nameToks)))] : [] });
                });
            });
            const series = [...new Set(ans.map(a => a.s))];
            const B = { id: b.id, pack: pack.id, type: pack.type, fam: b.fam || b.id, cat: b.cat || "General", sub: b.sub || "", pol: b.pol || "0", diff: Number(b.diff) || 2, vt: b.vt || "base",
                opp: b.opp || "", only: b.only ? (series[0] || "") : "", generic: series.length === 1 && series[0] === "any", series, ans,
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
    const version = hashStr(JSON.stringify(Object.values(boards).map(B => [B.id, B.ans.map(a => [a.id, a.p])])) + questions.map(q => q.questionId).join());
    return { boards, questions, issues, version, idx };
}
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
// every question of this type that works for these series
export function eligible(lib, type, series) {
    series = arr(series);
    const scope = scopeOf(series), single = series.length === 1, cache = {}, out = [];
    lib.questions.forEach(q => {
        if (q.questionType !== type) return;
        if ((q.wording === "S" && !single) || (q.wording === "M" && single)) return;
        const B = lib.boards[q.variantGroupId];
        if (!(B.id in cache)) cache[B.id] = boardFor(B, series);
        if (!cache[B.id]) return;
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
export function newMatch(o) {
    const s = { v: 1, lv: o.lv || "", mid: o.mid, type: o.type, series: arr(o.series).slice(), rounds: o.rounds || R.rounds, timer: o.timer || R.timer,
        teams: { A: arr(o.teams.A).map(Number), B: arr(o.teams.B).map(Number) }, ptr: { A: 0, B: 0 }, score: { A: 0, B: 0 },
        first: o.first === "B" ? "B" : "A", round: 0, sd: 0, used: [], log: [], phase: "pick", evn: 0, tk: 0 };
    if (o.q) startRound(s, o.q, o.now || Date.now());
    return s;
}
function startRound(s, c, now) {
    s.round = (Number(s.round) || 0) + 1;
    s.q = { key: c.key, id: c.id, g: c.g, f: c.f, opp: c.opp || "", at: now };
    s.used = arr(s.used).concat([{ key: c.key, g: c.g, f: c.f, opp: c.opp || "" }]);
    s.turn = startTeam(s, s.round); s.strikes = 0; s.bank = 0; s.rev = {}; s.phase = "play";
    s.tk = (Number(s.tk) || 0) + 1; s.dl = now + s.timer * 1000; s.nx = 0;
    evt(s, { k: "round", round: s.round, sd: s.sd, team: s.turn });
}
// who answers now: the team's pointer, skipping players who are away (they get their go back when they return)
export function actorOf(s, present = () => true) {
    if (!s || (s.phase !== "play" && s.phase !== "steal")) return 0;
    const team = s.phase === "play" ? s.turn : other(s.turn), m = arr(s.teams[team]).map(Number);
    if (!m.length) return 0;
    const st = (Number((s.ptr || {})[team]) || 0) % m.length;
    for (let k = 0; k < m.length; k++) { const p = m[(st + k) % m.length]; if (present(p)) return p; }
    return m[st];
}
export const guessTeam = s => s.phase === "play" ? s.turn : s.phase === "steal" ? other(s.turn) : "";
function nextGuesser(s, team, p) { const m = arr(s.teams[team]).map(Number), i = m.indexOf(Number(p)); s.ptr = Object.assign({ A: 0, B: 0 }, s.ptr, { [team]: ((i >= 0 ? i : Number(s.ptr[team]) || 0) + 1) % Math.max(1, m.length) }); }
function endRound(s, winner, how, now) {
    const pts = Number(s.bank) || 0;
    s.score = Object.assign({ A: 0, B: 0 }, s.score); s.score[winner] = (Number(s.score[winner]) || 0) + pts;
    s.log = arr(s.log).concat([{ r: s.round, sd: s.sd || 0, key: s.q.key, id: s.q.id, win: winner, how, pts, rev: Object.assign({}, s.rev) }]);
    s.phase = "reveal"; s.nx = now + R.revealMs; s.tk = (Number(s.tk) || 0) + 1; s.dl = 0;
    evt(s, { k: "end", win: winner, how, pts });
}
/* a = { k: "guess", by, tk, text | cid } | { k: "timeout", tk }.  ctx = { board, present, now, force }.
   Returns "" when applied, or the reason it was refused (the transaction then aborts). */
export function act(s, a, ctx) {
    if (!s || !ctx || !ctx.board) return "The board isn't ready.";
    if (s.phase !== "play" && s.phase !== "steal") return "This round is over.";
    if (Number(a.tk) !== Number(s.tk)) return "stale";
    const now = ctx.now || Date.now(), team = guessTeam(s), who = actorOf(s, ctx.present || (() => true)), board = ctx.board;
    let r;
    if (a.k === "timeout") { if (now < Number(s.dl) && !ctx.force) return "Time isn't up yet."; r = { k: "miss", timeout: true }; }
    else if (a.k === "guess") {
        if (Number(a.by) !== who && !ctx.force) return teamOf(s, a.by) === team ? "It's another teammate's turn to answer." : "It's not your team's turn.";
        r = a.cid ? matchChar(board, a.cid) : matchText(board, a.text);
        if (r.k === "empty") return "Type an answer first.";
        if (r.k === "vague") return "Be more specific: that fits more than one answer.";
        if (r.k === "hit" && s.rev && s.rev[r.i] != null) return "Already on the board. Try another answer.";
    } else return "Unknown move.";
    nextGuesser(s, team, who);
    const said = a.cid ? Number(a.cid) : String(a.text || "").slice(0, 60);
    if (r.k === "hit") {
        s.rev = Object.assign({}, s.rev, { [r.i]: team }); s.bank = (Number(s.bank) || 0) + board[r.i].p;
        evt(s, { k: "hit", team, by: who, i: r.i, said });
        if (s.phase === "steal") return endRound(s, team, "steal", now), "";
        if (Object.keys(s.rev).length >= board.length) return endRound(s, team, "clear", now), "";
        s.tk++; s.dl = now + s.timer * 1000; return "";
    }
    // miss or timeout
    if (s.phase === "steal") { evt(s, { k: "miss", team, by: who, said, timeout: !!r.timeout }); return endRound(s, s.turn, "defend", now), ""; }
    s.strikes = (Number(s.strikes) || 0) + 1;
    evt(s, { k: "miss", team, by: who, said, timeout: !!r.timeout, strikes: s.strikes });
    if (s.strikes >= R.strikes) { s.phase = "steal"; evt(s, { k: "steal", team: other(s.turn), bank: s.bank }); }
    s.tk++; s.dl = now + s.timer * 1000;
    return "";
}
/* host: after the reveal, the next round (c = the picked question) or the end. Ties after the last round get ONE sudden-death question. */
export function needsQuestion(s) { if (!s || s.phase !== "reveal") return false; const last = s.sd || s.round >= s.rounds; return !last || (!s.sd && s.score.A === s.score.B); }
export function advance(s, round, c, now = Date.now()) {
    if (!s || s.phase !== "reveal" || Number(s.round) !== Number(round)) return "stale";
    if (needsQuestion(s)) {
        if (!c) return finish(s, "out"), "";
        if (s.round >= s.rounds && !s.sd) s.sd = 1;
        startRound(s, c, now); return "";
    }
    finish(s, ""); return "";
}
function finish(s, why) {
    s.phase = "over"; s.dl = 0; s.nx = 0; s.tk = (Number(s.tk) || 0) + 1;
    s.winner = s.score.A > s.score.B ? "A" : s.score.B > s.score.A ? "B" : "";
    if (why) s.why = why;
    evt(s, { k: "over", win: s.winner });
}
