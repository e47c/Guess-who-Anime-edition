/* =====================================================================
   ANIME SKETCH (eighth mode): one player draws an anime word, everyone else races to guess it.
   Rules: engine.js (pure, tested). Words: words.js (Characters, Weapons, Objects & Items per series, with a difficulty),
   characters linked to the Anime Draft roster for their picture. Shared helpers (server clock, character pictures,
   lobby buttons): ../feud/common.js.

   Firebase (rooms/<code>):
     sketch        the match: players, drawing order, round, turn, phase, deadline, scores, who guessed it (in order),
                   the blanks + revealed letters, salted fingerprints of the answer. Every move is a transaction.
     sketchInk     the live drawing: one child per stroke piece {m, n, g, c, w, e, p} (match, turn, stroke, colour,
                   width, eraser, points on an 800x600 sheet). Only the drawer writes.
     sketchChat    the chat: {m, n, p, k, t} (k: "c" chat, "w" only for players who already know the word, "s" system)
   The word is never written to any of these while it is being drawn (see engine.js).
   ===================================================================== */
import { SK, arr, maskOf, hintMax, pickHint, hintAt, buildWords, poolFor, pickOptions, newMatch, act, hasGot, gotList, allGot,
    hintDue, standings, wordPrints, claim, near, CATS, CAT_NAME } from "./engine.js?v=3";
import { LIBRARY } from "./words.js?v=3";
import { CHARS } from "../draft/data.js?v=3";
import { el, srvNow, label, presentIn, pickOpt, seriesOf, initCommon, charOf, img, optButtons, confetti } from "../feud/common.js?v=2";
import { push, set, remove, query, limitToLast, onChildAdded, onChildChanged, onChildRemoved } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

const GT = "sketch", NODE = "sketch";
const $ = id => document.getElementById("sk" + id);
let X = null, WORDS = null;
const words = () => WORDS || (WORDS = buildWords({ library: LIBRARY, chars: CHARS }));
const sRounds = d => pickOpt(d && d.sketchRounds, SK.roundChoices, SK.rounds);
const sTimer = d => pickOpt(d && d.sketchTimer, SK.timerChoices, SK.timer);
const sDiff = d => pickOpt(d && d.sketchDiff, SK.diffChoices, 0);
const DIFF_NAME = ["Mixed", "Easy", "Medium", "Hard"];
export const sketchPrefs = p => ({ sketchRounds: pickOpt(p.sketchRounds, SK.roundChoices, SK.rounds), sketchTimer: pickOpt(p.sketchTimer, SK.timerChoices, SK.timer), sketchDiff: pickOpt(p.sketchDiff, SK.diffChoices, 0) });
export const sketchPrefsOf = d => ({ sketchRounds: sRounds(d), sketchTimer: sTimer(d), sketchDiff: sDiff(d) });
const PCOL = ["#ff5a5a", "#ffb02e", "#3fc46b", "#3aa0ff", "#b06bff", "#ff6fb1", "#22c7c7", "#e8d14a"];
const pCol = (d, p) => (X.pPub(d, p) || {}).col || PCOL[(Number(p) - 1) % PCOL.length];
const COLORS = ["#16161d", "#ffffff", "#8a8a96", "#d81e2c", "#ff7a1a", "#ffd21f", "#38b94a", "#13704a", "#2f8cff", "#1d3bb3", "#8a3ffc", "#ff5fa8", "#8b5a2b", "#f3c9a1", "#19c1c4", "#c7c7cf"];
const PAPER = "#ffffff", LW = 800, LH = 600, WMIN = 2, WMAX = 48;
const MAX_CHAT = 80;

/* ---------------- init ---------------- */
export function initSketch(ctx) {
    X = ctx;
    initCommon(ctx, () => { const d = X.data(); if (d && d.gameType === GT && d.sketch && d.status !== "waiting") showSketch(d); });
    Object.assign(window, {
        setSketchOpt(k, v) {
            const d = X.data(); if (!d || !X.amHost() || d.status !== "waiting") return;
            X.sfx("pick");
            if (k === "rounds") X.lobbySet({ sketchRounds: Number(v) });
            if (k === "timer") X.lobbySet({ sketchTimer: Number(v) });
            if (k === "diff") X.lobbySet({ sketchDiff: Number(v) });
        },
        skChoose: i => choose(i),
        skJoin: () => joinNext(),
        skAgain: () => sketchStart(true),
        skLobby: () => X.backToLobby(true)
    });
    /* keyboard: Ctrl+Z undo, Ctrl+Y / Ctrl+Shift+Z redo, B brush, E eraser, [ ] brush size, hold Space to pan.
       Never while typing: in the chat box, Ctrl+Z / Ctrl+Y stay the browser's, and single keys are just letters. */
    const typing = () => { const a = document.activeElement; return !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable); };
    const onSketch = () => { const v = document.getElementById("sketch"); return v && !v.classList.contains("hidden"); };
    document.addEventListener("keydown", e => {
        if (!onSketch()) return;
        const k = (e.key || "").toLowerCase(), mod = e.ctrlKey || e.metaKey;
        if (mod && !e.altKey && (k === "z" || k === "y")) {
            if (!canDraw()) return;
            const a = document.activeElement;
            if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName) && a.value) return;      // undoing typing in the chat box stays the browser's
            e.preventDefault();
            if (k === "y" || (k === "z" && e.shiftKey)) redoLast(); else undoLast();
            return;
        }
        if (mod || e.altKey || typing()) return;
        if (e.code === "Space" && !e.repeat && view.z > 1) { spaceDown = true; paperClass("grab", true); e.preventDefault(); return; }
        if (!canDraw()) return;
        if (k === "b") { tool.e = false; syncTools(); }
        else if (k === "e") { tool.e = true; syncTools(); }
        else if (k === "[" || k === "]") { const d = k === "]" ? 1 : -1, key = tool.e ? "ew" : "w"; tool[key] = Math.max(WMIN, Math.min(WMAX, tool[key] + d * Math.max(1, Math.round(tool[key] * .15)))); syncTools(); }
    });
    document.addEventListener("keyup", e => { if (e.code === "Space" && spaceDown) { spaceDown = false; paperClass("grab", false); } });
}

/* ---------------- lobby ---------------- */
export function sketchHint(d) {
    const n = seriesOf(d).length;
    return n === 1 ? "Single anime: every word comes from " + label(seriesOf(d)[0]) + "." : n > 1 ? "Anime Mix: words come from the " + n + " series you tick." : "Tick one series for its own words, or several for an Anime Mix.";
}
export function sketchReq(d) {
    const series = seriesOf(d), n = X.activeSlots(d).length, rounds = sRounds(d);
    if (!series.length) return { ok: false, msg: "Tick at least one series." };
    const pool = poolFor(words(), series).length, need = n * rounds + 2;
    if (pool < need) return { ok: false, msg: "Anime Sketch has " + pool + " words for " + (series.length === 1 ? label(series[0]) + " on its own" : "this mix") + ", not enough for " + rounds + " round" + (rounds === 1 ? "" : "s") + " with " + n + " players. Tick another series or pick fewer rounds." };
    return { ok: true, msg: "Anime Sketch · " + n + " players · " + (series.length === 1 ? "Single anime" : "Anime Mix") + " · " + rounds + " round" + (rounds === 1 ? "" : "s") + " × " + n + " turns · " + sTimer(d) + " s to draw" };
}
export function sketchLobby(d, lock) {
    const series = seriesOf(d);
    optButtons($("RoundsBtns"), SK.roundChoices, sRounds(d), lock, String, v => window.setSketchOpt("rounds", v));
    optButtons($("TimerBtns"), SK.timerChoices, sTimer(d), lock, v => v + " s", v => window.setSketchOpt("timer", v));
    if ($("DiffBtns")) optButtons($("DiffBtns"), SK.diffChoices, sDiff(d), lock, v => DIFF_NAME[v], v => window.setSketchOpt("diff", v));
    const box = $("Scope"), pool = poolFor(words(), series), cats = {};
    pool.forEach(w => { cats[w.cat] = (cats[w.cat] || 0) + 1; });
    box.innerHTML = "";
    box.append(el("b", "fd-scope-tag " + (series.length > 1 ? "mix" : "single"), series.length > 1 ? "ANIME MIX" : "SINGLE ANIME"),
        el("span", null, series.length === 1 ? label(series[0]) : series.length + " series"),
        el("em", null, pool.length + " words · " + CATS.filter(c => cats[c]).map(c => cats[c] + " " + (c === "Object" ? "objects & items" : c.toLowerCase() + (cats[c] === 1 ? "" : "s"))).join(", ")));
    $("Hint").textContent = "Every round, each player draws once: pick a character, a weapon or an object & item, then draw it while everyone else types guesses. First right guess +100, then 75, 50, 25; the drawer gets +25 for each player who gets it. Word difficulty: " + DIFF_NAME[sDiff(d)] + (sDiff(d) ? " (every drawer gets words of that level)" : " (easy, medium and hard words)") + ".";
}

/* ---------------- start (host) ---------------- */
export async function sketchStart(again) {
    const d = X.data(); if (!d || !X.amHost()) return;
    const prev = d.sketch;
    if (again && prev && prev.phase !== "over" && !(await X.uiConfirm({ title: "Restart Anime Sketch?", text: "The current match is thrown away.", ok: "Restart" }))) return;
    try {
        const players = X.activeSlots(d), series = again && prev ? arr(prev.series) : seriesOf(d);
        if (players.length < 2) { X.toast("Anime Sketch needs at least 2 players."); return; }
        const mid = Date.now();
        const s = newMatch({ mid, lv: 1, series, players, rounds: again && prev ? prev.rounds : sRounds(d), timer: again && prev ? prev.timer : sTimer(d), diff: again && prev ? Number(prev.diff) || 0 : sDiff(d), now: srvNow() });
        await X.update(X.ref(X.db, "rooms/" + X.room()), { status: "playing", matchId: mid, sketch: s, sketchInk: null, sketchChat: null });
    } catch (e) { console.error(e); X.toast("Could not start Anime Sketch: " + (e.message || e)); }
}
export const sketchSeats = d => { const s = d && d.sketch; return s ? arr(s.players).map(Number) : []; };
export const sketchOver = d => !d.sketch || d.sketch.phase === "over";

/* ---------------- moves (all in a transaction on rooms/<code>/sketch) ---------------- */
async function tx(a) {
    let err = null;
    try {
        const r = await X.runTransaction(X.ref(X.db, "rooms/" + X.room() + "/" + NODE), cur => {
            if (!cur) return cur;
            err = act(cur, Object.assign({ by: X.me() }, a), { now: srvNow(), present: presentIn(X.data()) });
            return err ? undefined : cur;
        });
        if (!r.committed && !err) err = "stale";
    } catch (e) { console.error(e); err = "net"; }
    return err;
}
const pend = {};
function once(key, fn, retryMs = 3000) { const t = pend[key]; if (t && Date.now() - t < retryMs) return; pend[key] = Date.now(); fn(); }

/* the drawer's secret stays in this browser (localStorage, so a reload mid-turn doesn't lose it) */
const SKEY = (s, what) => "aa_sketch_" + what + ":" + X.room() + ":" + s.mid + ":" + s.n;
const load = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const RKEY = "aa_sketch_recent";
function myOptions(s) {
    let o = load(SKEY(s, "o"));
    const all = words(), byId = id => poolFor(all, s.series).find(w => w.id === id);
    if (o && o.length) { const ws = o.map(byId).filter(Boolean); if (ws.length) return ws; }
    const used = arr(s.log).map(L => L.w).filter(Boolean), recent = load(RKEY) || [];
    const ws = pickOptions(all, s.series, { used, recent, diff: Number(s.diff) || 0 });
    save(SKEY(s, "o"), ws.map(w => w.id));
    save(RKEY, recent.concat(ws.map(w => w.id)).slice(-90));
    return ws;
}
const mySecret = s => s ? load(SKEY(s, "w")) : null;
let choosing = false;
async function choose(i) {
    const d = X.data(), s = d && d.sketch; if (!s || s.phase !== "pick" || Number(s.drawer) !== X.me() || choosing) return;
    const w = myOptions(s)[i]; if (!w) return;
    choosing = true; X.sfx("skPick");
    const salt = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    save(SKEY(s, "w"), { t: w.t, c: w.c, f: w.f, cat: w.cat, n: s.n });
    try { await remove(inkRef()); } catch (e) {}           // a clean sheet (the last drawing is hidden anyway: strokes carry their turn)
    const P = wordPrints(salt, w.f);
    const err = await tx({ k: "pick", tk: s.n, mask: maskOf(w.t), salt, wh: P.wh, wv: P.wv, wt: P.wt, cat: w.cat, hm: hintMax(w.t) });
    choosing = false;
    if (err && err !== "stale") feedback(err === "net" ? "Couldn't send that. Check your connection." : err, "warn");
}
async function joinNext() {
    const s = (X.data() || {}).sketch; if (!s) return;
    const queued = !!(s.pend || {})["p" + X.me()];
    X.sfx(queued ? "toggle" : "join");
    await tx({ k: queued ? "unjoin" : "join" });
}

/* ---------------- duties: a 4-per-second check run by every browser (each acts only on what it's allowed to) ----------------
   - the drawer: auto-picks at the deadline, reveals letter hints when they're due, ends its turn on time (with the word),
     writes the word for the reveal
   - the host (or, if the host is unreachable, the next players in turn after a short delay): timeouts, a drawer who
     went offline, everyone-has-it after someone left, the next turn / round. All transactions are guarded by the turn
     number, so if two browsers do the same thing only one wins. */
let loopT = 0, goneSince = {}, hostGoneAt = 0;
function loop() {
    const d = X.data(), s = d && d.sketch;
    if (!s || d.gameType !== GT || !d.status || d.status === "waiting") { stopLoop(); return; }
    paintTimer(d, s);
    if (s.phase === "over") return;
    const now = srvNow(), me = X.me(), pres = presentIn(d), key = s.mid + ":" + s.n + ":" + s.phase, playing = arr(s.players).map(Number).includes(me);
    if (Number(s.drawer) === me && playing) {
        const sec = mySecret(s);
        if (s.phase === "pick" && now >= Number(s.dl) - 700) once("auto:" + key, () => { const o = myOptions(s); choose((Math.random() * o.length) | 0); }, 4000);
        if (s.phase === "draw") {
            if (sec && sec.n === s.n && now >= hintDue(s)) once("hint:" + key + ":" + (s.hn || 0), () => {
                const i = pickHint(sec.t, s.hint); if (i >= 0) tx({ k: "hint", tk: s.n, i, c: [...sec.t][i] });
            }, 2500);
            if (now >= Number(s.dl)) once("dto:" + key, () => tx({ k: "timeout", tk: s.n, word: sec && sec.n === s.n ? sec.t : null, c: sec ? sec.c : 0 }));
        }
        if (s.phase === "reveal" && !s.word && sec && sec.n === s.n) once("word:" + key, () => tx({ k: "word", tk: s.n, word: sec.t, c: sec.c }));
    }
    watchHost(d, s, now);
    const rank = dutyRank(d); if (rank < 0) return;
    const lag = rank === 0 ? 0 : 2500 + rank * 900;
    if ((s.phase === "pick" || s.phase === "draw")) {
        if (now >= Number(s.dl) + 2500 + lag) once("to:" + key, () => tx({ k: "timeout", tk: s.n }));
        if (!pres(Number(s.drawer))) { goneSince[key] = goneSince[key] || now; if (now - goneSince[key] >= SK.goneMs + lag) once("gone:" + key, () => tx({ k: "gone", tk: s.n })); }
        else delete goneSince[key];
        if (s.phase === "draw" && allGot(s, pres)) once("chk:" + key + ":" + gotList(s).length, () => setTimeout(() => tx({ k: "check", tk: s.n }), lag), 3000 + lag);
    }
    if ((s.phase === "reveal" || s.phase === "round") && now >= Number(s.nx) + lag) once("nx:" + key, () => tx({ k: "next", tk: s.n }));
}
// 0 = the host (when online); 1, 2... = the other online players, who step in one after another if nothing happens
function dutyRank(d) {
    const pres = presentIn(d), me = X.me(), host = X.hostSlot(d);
    if (me === host && pres(me)) return 0;
    const backups = X.activeSlots(d).filter(p => p !== host && pres(p));
    const i = backups.indexOf(me);
    return i < 0 ? -1 : i + 1;
}
// the host lost connection for 8 s during a match: the first online player takes over hosting (Rematch, back to lobby, timers)
function watchHost(d, s, now) {
    const host = X.hostSlot(d), pres = presentIn(d);
    if (pres(host)) { hostGoneAt = 0; return; }
    hostGoneAt = hostGoneAt || now;
    if (now - hostGoneAt < 8000) return;
    const first = X.activeSlots(d).find(pres);
    if (first !== X.me()) return;
    once("host:" + host + ":" + s.mid, () => {
        X.update(X.ref(X.db, "rooms/" + X.room()), { host: X.me() }).then(() => X.toast(X.pName(d, host) + " lost connection. You're the host now.")).catch(() => {});
    }, 10000);
}
function startLoop() { if (!loopT) loopT = setInterval(loop, 250); }
function stopLoop() { clearInterval(loopT); loopT = 0; }

/* ---------------- the drawing sheet (live: strokes stream in as they're drawn) ----------------
   Strokes live on a fixed 800x600 logical sheet, so every screen shows the same drawing. Each viewer has their own
   viewport (view: zoom z and the logical top-left x, y): zooming and panning only change how the sheet is shown,
   never the strokes, their coordinates or what is sent to the others. */
const ink = { strokes: new Map(), mine: new Set(), turn: "", unsub: [], room: "", cv: null, g: null, scale: 1, raf: 0 };
const ZMIN = 1, ZMAX = 4, view = { z: 1, x: 0, y: 0 };
let tool = { c: COLORS[0], w: 7, ew: 24, e: false }, undo = [], redo = [], cur = null, flushT = 0, spaceDown = false;
function inkRef(k) { return X.ref(X.db, "rooms/" + X.room() + "/sketchInk" + (k ? "/" + k : "")); }
function listenInk() {
    if (ink.room === X.room() && ink.unsub.length) return;
    unlistenInk(); ink.room = X.room();
    const r = inkRef();
    const take = snap => { const v = snap.val(); if (!v || ink.mine.has(snap.key)) return null; return { m: Number(v.m), n: Number(v.n), g: v.g, c: v.c, w: Number(v.w) || 7, e: !!v.e, pts: String(v.p || "").split(",").map(Number).filter(x => !isNaN(x)), drawn: 0 }; };
    ink.unsub.push(onChildAdded(r, snap => { const st = take(snap); if (!st) return; ink.strokes.set(snap.key, st); if (liveTurn(st)) paint(st, 0); }));
    ink.unsub.push(onChildChanged(r, snap => { const st = take(snap); if (!st) return; const old = ink.strokes.get(snap.key); const from = old ? old.drawn : 0; ink.strokes.set(snap.key, st); if (liveTurn(st)) paint(st, from); }));
    ink.unsub.push(onChildRemoved(r, snap => { ink.strokes.delete(snap.key); ink.mine.delete(snap.key); redrawSoon(); }));
}
function unlistenInk() { ink.unsub.forEach(f => { try { f(); } catch (e) {} }); ink.unsub = []; ink.room = ""; ink.strokes.clear(); ink.mine.clear(); }
const curTurn = () => { const s = (X.data() || {}).sketch; return s ? s.mid + ":" + s.n : ""; };
const liveTurn = st => st.m + ":" + st.n === curTurn();
const xform = g => { const k = ink.scale * view.z; g.setTransform(k, 0, 0, k, -view.x * k, -view.y * k); };
// a smooth stroke: quadratic curves through the midpoints. "from" = points already painted: continue from there.
function paint(st, from) {
    const g = ink.g; if (!g) return;
    const P = st.pts, n = P.length / 2; if (n < 1) return;
    g.save(); xform(g);
    g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = g.fillStyle = st.e ? PAPER : st.c; g.lineWidth = st.w;
    if (n === 1) { g.beginPath(); g.arc(P[0], P[1], st.w / 2, 0, Math.PI * 2); g.fill(); }
    else if (n > from) {
        const mid = k => [(P[2 * k] + P[2 * k + 2]) / 2, (P[2 * k + 1] + P[2 * k + 3]) / 2];
        let k = Math.max(1, from - 1);
        g.beginPath();
        if (k === 1) g.moveTo(P[0], P[1]); else { const m = mid(k - 1); g.moveTo(m[0], m[1]); }
        for (; k <= n - 2; k++) { const m = mid(k); g.quadraticCurveTo(P[2 * k], P[2 * k + 1], m[0], m[1]); }
        g.lineTo(P[2 * n - 2], P[2 * n - 1]);
        g.stroke();
    }
    g.restore();
    st.drawn = n;
}
function redraw() {
    const g = ink.g, cv = ink.cv; if (!g || !cv) return;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = PAPER; g.fillRect(0, 0, cv.width, cv.height);
    [...ink.strokes.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).forEach(([, st]) => { if (liveTurn(st)) paint(st, 0); });
    if (cur && cur.turn === curTurn()) paint(cur.st, 0);
}
function redrawSoon() { if (ink.raf) return; ink.raf = requestAnimationFrame(() => { ink.raf = 0; redraw(); }); }
function fitCanvas() {
    const cv = ink.cv; if (!cv) return;
    const r = cv.parentElement.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.width * dpr * LH / LW));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; ink.scale = W / LW; redraw(); }
}
const canDraw = () => { const s = (X.data() || {}).sketch; return !!s && s.phase === "draw" && Number(s.drawer) === X.me() && arr(s.players).map(Number).includes(X.me()) && srvNow() < Number(s.dl); };
// screen point -> sheet point (through this viewer's viewport), clamped to the sheet
function toLogical(e) {
    const r = ink.cv.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    return [Math.round(Math.max(0, Math.min(LW, view.x + fx * LW / view.z))), Math.round(Math.max(0, Math.min(LH, view.y + fy * LH / view.z)))];
}

/* ---------------- zoom and pan (this viewer only) ---------------- */
function clampView() {
    view.z = Math.max(ZMIN, Math.min(ZMAX, view.z));
    view.x = Math.max(0, Math.min(LW - LW / view.z, view.x)); view.y = Math.max(0, Math.min(LH - LH / view.z, view.y));
}
// zoom to z, keeping the sheet point under (fx, fy) (fractions of the canvas box) where it is
function zoomTo(z, fx = .5, fy = .5) {
    const lx = view.x + fx * LW / view.z, ly = view.y + fy * LH / view.z;
    view.z = Math.max(ZMIN, Math.min(ZMAX, z));
    view.x = lx - fx * LW / view.z; view.y = ly - fy * LH / view.z;
    clampView(); redrawSoon(); syncZoom();
}
let zoomAnim = 0;
function zoomSmooth(z, fx = .5, fy = .5) {           // the buttons: a short eased glide
    cancelAnimationFrame(zoomAnim);
    const z0 = view.z, z1 = Math.max(ZMIN, Math.min(ZMAX, z)), t0 = performance.now(), D = X.motionOK() ? 160 : 0;
    const step = t => { const k = D ? Math.min(1, (t - t0) / D) : 1, e = 1 - Math.pow(1 - k, 3); zoomTo(z0 + (z1 - z0) * e, fx, fy); if (k < 1) zoomAnim = requestAnimationFrame(step); };
    zoomAnim = requestAnimationFrame(step);
}
function zoomResetNow() { cancelAnimationFrame(zoomAnim); view.z = 1; view.x = 0; view.y = 0; redrawSoon(); syncZoom(); }
function panBy(dxPx, dyPx) {                          // screen pixels -> sheet units at the current zoom
    const r = ink.cv.getBoundingClientRect();
    view.x -= dxPx * LW / (r.width * view.z); view.y -= dyPx * LH / (r.height * view.z);
    clampView(); redrawSoon(); syncZoom();
}
function syncZoom() {
    const z = $("ZoomPct"); if (z) z.textContent = Math.round(view.z * 100) + "%";
    const o = $("ZoomOut"), i = $("ZoomIn"), r = $("ZoomReset");
    if (o) o.disabled = view.z <= ZMIN + 1e-3;
    if (i) i.disabled = view.z >= ZMAX - 1e-3;
    if (r) r.disabled = view.z <= ZMIN + 1e-3;
    paperClass("zoomed", view.z > ZMIN + 1e-3);
}
function bindZoom(paper, cv) {
    // Ctrl / Cmd + wheel (and trackpad pinch, which browsers send as Ctrl + wheel) zooms around the cursor, never the page.
    // A plain wheel pans while zoomed in (Shift + wheel: sideways); at 100% it scrolls the page as usual.
    paper.addEventListener("wheel", e => {
        const r = cv.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
        const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? r.height : 1;
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomTo(view.z * Math.exp(-e.deltaY * unit * .0018), Math.max(0, Math.min(1, fx)), Math.max(0, Math.min(1, fy))); return; }
        if (view.z > ZMIN + 1e-3) { e.preventDefault(); const dx = e.shiftKey ? e.deltaY : e.deltaX, dy = e.shiftKey ? 0 : e.deltaY; panBy(-dx * unit, -dy * unit); }
    }, { passive: false });
    cv.addEventListener("contextmenu", e => { if (view.z > ZMIN + 1e-3 || canDraw()) e.preventDefault(); });
}

/* ---------------- pointers: draw, pan, pinch ---------------- */
const touches = new Map();
let pan = null, pinch = null;
function bindCanvas(cv) {
    cv.addEventListener("pointerdown", e => {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touches.size === 2) {                       // a second finger: pinch and pan with two fingers (any player)
            if (cur) endStroke();
            pan = null; const [a, b] = [...touches.values()];
            pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: view.z, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
            return;
        }
        const wantPan = view.z > ZMIN + 1e-3 && (e.button === 1 || e.button === 2 || spaceDown || !canDraw());
        if (wantPan) { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (er) {} pan = { x: e.clientX, y: e.clientY }; paperClass("panning", true); return; }
        if (!canDraw() || (e.button != null && e.button > 0)) return;
        e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (er) {}
        const s = X.data().sketch, [x, y] = toLogical(e), key = push(inkRef()).key, w = tool.e ? tool.ew : tool.w;
        cur = { key, g: key, turn: s.mid + ":" + s.n, m: s.mid, n: s.n, keys: [key], data: {}, st: { m: Number(s.mid), n: Number(s.n), c: tool.c, w, e: tool.e, pts: [x, y], drawn: 0 }, dirty: true };
        redo = [];                                      // a new stroke ends the redo trail
        ink.mine.add(key); ink.strokes.set(key, cur.st); paint(cur.st, 0); flushSoon(); syncTools();
    });
    cv.addEventListener("pointermove", e => {
        if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        ring(e);
        if (pinch && touches.size >= 2) {
            const [a, b] = [...touches.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, r = cv.getBoundingClientRect();
            zoomTo(pinch.z * d / pinch.d, (cx - r.left) / r.width, (cy - r.top) / r.height);
            panBy(cx - pinch.cx, cy - pinch.cy); pinch.cx = cx; pinch.cy = cy; return;
        }
        if (pan) { panBy(e.clientX - pan.x, e.clientY - pan.y); pan = { x: e.clientX, y: e.clientY }; return; }
        if (!cur) return;
        if (!canDraw()) { endStroke(); return; }
        const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e], st = cur.st, from = st.pts.length / 2;
        const minStep = 1.2 / view.z;                   // finer points when zoomed in, for detail work
        (evs.length ? evs : [e]).forEach(ev => { const [x, y] = toLogical(ev), P = st.pts; if (Math.hypot(x - P[P.length - 2], y - P[P.length - 1]) >= minStep) P.push(x, y); });
        if (st.pts.length / 2 > from) { paint(st, from); cur.dirty = true; flushSoon(); }
        if (st.pts.length >= 160) {      // long strokes go out in pieces so each write stays small
            flush();
            const P = st.pts, key = push(inkRef()).key, nst = { m: st.m, n: st.n, c: st.c, w: st.w, e: st.e, pts: [P[P.length - 2], P[P.length - 1]], drawn: 1 };
            cur.key = key; cur.st = nst; cur.keys.push(key); ink.mine.add(key); ink.strokes.set(key, nst); cur.dirty = true;
        }
    });
    const up = e => {
        touches.delete(e.pointerId);
        if (touches.size < 2) pinch = null;
        if (pan && !touches.size) { pan = null; paperClass("panning", false); }
        endStroke();
    };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up); cv.addEventListener("lostpointercapture", up);
    cv.addEventListener("pointerleave", () => { const r = $("Ring"); if (r) r.classList.add("hidden"); });
}
function paperClass(c, on) { const p = $("Paper"); if (p) p.classList.toggle(c, on); }
// the brush / eraser size under the cursor, at the current zoom
function ring(e) {
    const r = $("Ring"); if (!r) return;
    if (!canDraw() || e.pointerType === "touch" || pan) { r.classList.add("hidden"); return; }
    const box = ink.cv.getBoundingClientRect(), pr = $("Paper").getBoundingClientRect(), d = (tool.e ? tool.ew : tool.w) * box.width / LW * view.z;
    r.style.width = r.style.height = Math.max(4, d) + "px";
    r.style.left = (e.clientX - pr.left) + "px"; r.style.top = (e.clientY - pr.top) + "px";
    r.classList.toggle("erase", tool.e); r.classList.remove("hidden");
}
function flushSoon() { if (!flushT) flushT = setTimeout(flush, 45); }
function flush() {
    clearTimeout(flushT); flushT = 0;
    if (!cur || !cur.dirty) return;
    cur.dirty = false;
    const v = { m: cur.m, n: cur.n, g: cur.g, c: cur.st.c, w: cur.st.w, e: cur.st.e ? 1 : 0, p: cur.st.pts.join(",") };
    cur.data[cur.key] = v;
    set(inkRef(cur.key), v).catch(() => {});
}
function endStroke() { if (!cur) return; flush(); undo.push({ keys: cur.keys, data: cur.data }); if (undo.length > 80) undo.shift(); cur = null; syncTools(); }
const stOf = v => ({ m: Number(v.m), n: Number(v.n), g: v.g, c: v.c, w: Number(v.w) || 7, e: !!v.e, pts: String(v.p || "").split(",").map(Number), drawn: 0 });
function undoLast() {
    if (!canDraw()) return;
    const it = undo.pop(); if (!it) return;
    X.sfx("skErase");
    const upd = {}; it.keys.forEach(k => { upd[k] = null; ink.strokes.delete(k); }); redraw();
    redo.push(it); syncTools();
    X.update(inkRef(), upd).catch(() => {});
}
function redoLast() {
    if (!canDraw()) return;
    const it = redo.pop(); if (!it) return;
    X.sfx("toggle");
    const upd = {}; it.keys.forEach(k => { const v = it.data[k]; if (!v) return; upd[k] = v; ink.mine.add(k); ink.strokes.set(k, stOf(v)); }); redraw();
    undo.push(it); syncTools();
    X.update(inkRef(), upd).catch(() => {});
}
async function clearSheet() {
    if (!canDraw()) return;
    if (ink.strokes.size && !(await X.uiConfirm({ title: "Clear the drawing?", text: "Everything on the sheet is erased for everyone. This can't be undone.", ok: "Clear", danger: true }))) return;
    if (!canDraw()) return;
    X.sfx("skErase"); undo = []; redo = []; ink.strokes.clear(); redraw(); syncTools();
    remove(inkRef()).catch(() => {});
}

/* ---------------- chat + guesses ---------------- */
const chat = { list: [], unsub: [], room: "", sig: "" };
function listenChat() {
    if (chat.room === X.room() && chat.unsub.length) return;
    unlistenChat(); chat.room = X.room();
    const q = query(X.ref(X.db, "rooms/" + X.room() + "/sketchChat"), limitToLast(MAX_CHAT));
    chat.unsub.push(onChildAdded(q, snap => { const v = snap.val(); if (!v) return; v.key = snap.key; chat.list.push(v); if (chat.list.length > MAX_CHAT + 20) chat.list.splice(0, chat.list.length - MAX_CHAT); addLine(v); }));
}
function unlistenChat() { chat.unsub.forEach(f => { try { f(); } catch (e) {} }); chat.unsub = []; chat.room = ""; chat.list = []; }
// "w" lines (from players who already know the word) are shown to the drawer and to players who guessed it, and to everyone once the turn is over
function canSee(m, s) {
    if (m.k !== "w") return true;
    if (!s || Number(m.m) !== Number(s.mid)) return false;
    if (Number(m.n) !== Number(s.n) || s.phase !== "draw" && s.phase !== "pick") return true;
    return Number(s.drawer) === X.me() || hasGot(s, X.me());
}
function lineEl(m) {
    const d = X.data() || {}, s = d.sketch;
    if (m.k === "s") {
        const li = el("li", "sk-sys " + (m.e || ""));
        if (m.e === "got") li.textContent = X.pName(d, m.p) + " guessed the word!" + (m.pts ? " +" + m.pts : "");
        else li.textContent = m.t || "";
        return li;
    }
    if (m.k === "local") return el("li", "sk-sys " + (m.e || ""), m.t);
    const li = el("li", "sk-msg" + (m.k === "w" ? " w" : "") + (Number(m.p) === X.me() ? " me" : ""));
    const who = el("b", null, X.pName(d, m.p)); who.style.color = pCol(d, m.p);
    li.append(who, el("span", null, m.t));
    if (m.k === "w") li.title = "Only players who know the word see this";
    return li;
}
function addLine(m) {
    const s = (X.data() || {}).sketch, log = $("Log"); if (!log || !s || Number(m.m) !== Number(s.mid) || !canSee(m, s)) return;
    const stick = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
    log.appendChild(lineEl(m));
    while (log.childElementCount > MAX_CHAT) log.firstChild.remove();
    if (stick) log.scrollTop = log.scrollHeight;
}
function rebuildChat(s) {
    const sig = s.mid + ":" + s.n + ":" + s.phase + ":" + (hasGot(s, X.me()) ? 1 : 0) + ":" + (Number(s.drawer) === X.me() ? 1 : 0);
    if (chat.sig === sig) return; chat.sig = sig;
    const log = $("Log"); if (!log) return;
    log.innerHTML = "";
    chat.list.filter(m => Number(m.m) === Number(s.mid) && canSee(m, s)).slice(-MAX_CHAT).forEach(m => log.appendChild(lineEl(m)));
    log.scrollTop = log.scrollHeight;
}
function localLine(t, e) { const s = (X.data() || {}).sketch; if (!s) return; const m = { k: "local", t, e, m: s.mid, n: s.n }; chat.list.push(m); addLine(m); }
function post(k, t, extra) {
    const s = X.data().sketch;
    return push(X.ref(X.db, "rooms/" + X.room() + "/sketchChat"), Object.assign({ m: s.mid, n: s.n, p: X.me(), k, t: t || "", at: srvNow() }, extra || {})).catch(() => feedback("Couldn't send that. Check your connection.", "warn"));
}
let lastSend = 0, sending = false;
async function send(e) {
    if (e) e.preventDefault();
    const inp = $("Input"), d = X.data(), s = d && d.sketch; if (!inp || !s) return;
    const text = inp.value.replace(/\s+/g, " ").trim().slice(0, 80);
    if (!text) return;
    const me = X.me(), playing = arr(s.players).map(Number).includes(me);
    if (!playing) { feedback("You're watching. Join next round to guess.", "warn"); return; }
    if (Date.now() - lastSend < 350 || sending) return;
    lastSend = Date.now();
    const live = s.phase === "draw", drawer = Number(s.drawer) === me;
    const hot = () => !!claim(text, s.salt, s.wh, s.wv) || near(text, s.salt, s.wt);   // the answer, or anything close to it
    if (live && drawer) {
        const sec = mySecret(s);
        if (hot() || (sec && sec.n === s.n && claim(text, s.salt, s.wh, s.wv))) { feedback("No spoilers! That message is too close to the word.", "warn"); return; }
        inp.value = ""; post("c", text); return;
    }
    if (live && hasGot(s, me)) {
        if (hot()) { feedback("You already got it! You can't type the answer or anything close to it.", "warn"); return; }
        inp.value = ""; post("w", text); return;
    }
    if (live) {
        const h = claim(text, s.salt, s.wh, s.wv);
        inp.value = "";
        if (!h) {
            // close but not right: only you see it, so nobody else learns from it
            if (near(text, s.salt, s.wt)) { localLine("You: “" + text + "” · so close! (only you can see this)", "close"); feedback("So close! Keep going.", "ok"); X.sfx("skHint"); return; }
            post("c", text); return;
        }
        sending = true;
        save(SKEY(s, "g"), text);
        const err = await tx({ k: "guess", tk: s.n, h });
        sending = false;
        if (!err) {
            const s2 = X.data().sketch, mine = gotList(s2).find(g => Number(g.p) === me);
            post("s", "", { e: "got", pts: mine ? mine.pts : 0 });
        } else if (err === "already") feedback("You already got this one.", "ok");
        else if (err === "stale") feedback("Too late: the turn just ended.", "warn");
        else if (err === "net") feedback("Couldn't send that. Check your connection.", "warn");
        else feedback(err, "warn");
        return;
    }
    inp.value = ""; post("c", text);
}

/* ---------------- screen ---------------- */
let built = "", seen = { mid: 0, evn: -1 }, overShown = 0, roRef = null;
export function sketchReset() {
    stopLoop(); built = ""; offSeen = null; seen = { mid: 0, evn: -1 }; overShown = 0; chat.sig = ""; cur = null; undo = []; redo = []; view.z = 1; view.x = 0; view.y = 0; goneSince = {}; hostGoneAt = 0; choosing = false;
    unlistenInk(); unlistenChat();
    if (roRef) { roRef.disconnect(); roRef = null; }
    const o = $("Over"); if (o) o.remove();
}
const feedback = (msg, kind) => { const f = $("Feedback"); if (!f) return; f.textContent = msg; f.className = "sk-feedback show " + (kind || ""); clearTimeout(f._t); f._t = setTimeout(() => f.classList.remove("show"), 3000); };
export function showSketch(d) {
    X.showOnly("sketch");
    const s = d.sketch; if (!s) return;
    if (built !== String(s.mid)) { built = String(s.mid); seen = { mid: s.mid, evn: -1 }; chat.sig = ""; build(); }
    listenInk(); listenChat(); startLoop();
    render(d, s);
    const firstPaint = seen.evn < 0;
    if (s.ev && s.ev.n !== seen.evn) { if (!firstPaint) onEvent(d, s, s.ev); seen.evn = s.ev.n; }
    if (s.phase === "over" && overShown !== s.mid) { overShown = s.mid; setTimeout(() => { const d2 = X.data(); if (d2 && d2.sketch && d2.sketch.mid === s.mid && d2.sketch.phase === "over") showOver(d2, d2.sketch); }, firstPaint ? 0 : 1200); }
    if (s.phase !== "over") { const o = $("Over"); if (o) o.remove(); }
}
function build() {
    const w = $("Wrap"); w.innerHTML = "";
    const top = el("div", "sk-top");
    const rc = el("div", "sk-round"); rc.id = "skRound";
    const word = el("div", "sk-word"); word.id = "skWord";
    const tm = el("div", "sk-timer"); tm.id = "skTimer"; tm.innerHTML = '<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="19"/><circle class="sk-tarc" cx="22" cy="22" r="19"/></svg><b></b>';
    top.append(rc, word, tm);
    const main = el("div", "sk-main");
    const pl = el("aside", "sk-players"); pl.id = "skPlayers"; pl.setAttribute("aria-label", "Scores");
    const board = el("section", "sk-board");
    const paper = el("div", "sk-paper"); paper.id = "skPaper";
    const cv = el("canvas", "sk-canvas"); cv.id = "skCanvas"; cv.setAttribute("aria-label", "Drawing"); cv.setAttribute("role", "img");
    const ov = el("div", "sk-overlay"); ov.id = "skOverlay";
    // this viewer's zoom (Ctrl + wheel, the buttons, two-finger pinch): only the view changes, never the drawing
    const zm = el("div", "sk-zoom"); zm.setAttribute("role", "group"); zm.setAttribute("aria-label", "Zoom");
    const zb = (id, txt, lab, fn) => { const b = el("button", "sk-zbtn", txt); b.type = "button"; b.id = "sk" + id; b.setAttribute("aria-label", lab); b.title = lab; b.onclick = fn; return b; };
    const pct = el("output", "sk-zpct", "100%"); pct.id = "skZoomPct"; pct.setAttribute("aria-live", "polite");
    zm.append(zb("ZoomOut", "−", "Zoom out (Ctrl + wheel down)", () => zoomSmooth(view.z / 1.25)), pct, zb("ZoomIn", "+", "Zoom in (Ctrl + wheel up)", () => zoomSmooth(view.z * 1.25)), zb("ZoomReset", "⤢", "Reset zoom to 100%", () => zoomSmooth(1)));
    const rg = el("i", "sk-ring hidden"); rg.id = "skRing"; rg.setAttribute("aria-hidden", "true");
    paper.append(el("i", "sk-tape a"), el("i", "sk-tape b"), cv, rg, zm, ov);
    const tools = el("div", "sk-tools"); tools.id = "skTools";
    board.append(paper, tools);
    const side = el("aside", "sk-chat");
    const log = el("ul", "sk-log"); log.id = "skLog"; log.setAttribute("aria-live", "polite");
    const form = el("form", "sk-input"); form.id = "skForm";
    const inp = el("input"); inp.id = "skInput"; inp.maxLength = 80; inp.autocomplete = "off"; inp.setAttribute("autocapitalize", "off"); inp.spellcheck = false; inp.placeholder = "Type your guess…"; inp.setAttribute("aria-label", "Guess or chat");
    const sb = el("button", "btn", "Send"); sb.type = "submit";
    form.append(inp, sb); form.onsubmit = send;
    const join = el("div", "sk-join hidden"); join.id = "skJoinBar";
    side.append(el("div", "sk-chat-h", "GUESSES & CHAT"), log, form, join);
    main.append(pl, board, side);
    const fb = el("p", "sk-feedback"); fb.id = "skFeedback"; fb.setAttribute("role", "status"); fb.setAttribute("aria-live", "polite");
    const fx = el("div", "sk-fx"); fx.id = "skFx"; fx.setAttribute("aria-hidden", "true");
    w.append(top, main, fb, fx);
    ink.cv = cv; ink.g = cv.getContext("2d");
    bindCanvas(cv); bindZoom(paper, cv);
    buildTools(tools); syncZoom();
    if (roRef) roRef.disconnect();
    roRef = new ResizeObserver(() => fitCanvas()); roRef.observe(paper);
    fitCanvas();
}
function buildTools(box) {
    box.innerHTML = "";
    const cols = el("div", "sk-colors"); cols.setAttribute("role", "radiogroup"); cols.setAttribute("aria-label", "Colour");
    COLORS.forEach(c => { const b = el("button", "sk-col"); b.type = "button"; b.style.setProperty("--c", c); b.dataset.c = c; b.setAttribute("aria-label", "Colour " + c); b.onclick = () => { tool.c = c; tool.e = false; X.sfx("toggle"); syncTools(); }; cols.appendChild(b); });
    // any other colour: the system picker (the swatch shows the last custom colour)
    const cw = el("label", "sk-col sk-custom"); cw.title = "Custom colour";
    const ci = el("input"); ci.type = "color"; ci.value = "#ff8800"; ci.setAttribute("aria-label", "Custom colour");
    ci.oninput = () => { tool.c = ci.value; tool.e = false; cw.style.setProperty("--c", ci.value); cw.dataset.c = ci.value; syncTools(); };
    cw.style.setProperty("--c", ci.value); cw.dataset.c = ci.value; cw.appendChild(ci); cols.appendChild(cw);
    // the size of the current tool (the brush and the eraser each keep their own)
    const sz = el("label", "sk-sizer"); sz.title = "Size ( [ and ] )";
    const dot = el("i", "sk-sdot"); dot.id = "skSizeDot";
    const rng = el("input"); rng.type = "range"; rng.min = String(WMIN); rng.max = String(WMAX); rng.step = "1"; rng.id = "skSize"; rng.setAttribute("aria-label", "Brush size");
    rng.oninput = () => { tool[tool.e ? "ew" : "w"] = Number(rng.value); syncTools(); };
    const val = el("b", "sk-sval"); val.id = "skSizeVal";
    sz.append(dot, rng, val);
    const acts = el("div", "sk-acts");
    const tb = (t, txt, title, fn, cls) => { const b = el("button", "sk-tool" + (cls ? " " + cls : ""), txt); b.type = "button"; if (t) b.dataset.t = t; b.title = title; b.onclick = fn; return b; };
    const pen = tb("pen", "✏️ Brush", "Brush (B)", () => { tool.e = false; X.sfx("toggle"); syncTools(); });
    const er = tb("eraser", "🧽 Eraser", "Eraser (E)", () => { tool.e = true; X.sfx("toggle"); syncTools(); });
    const un = tb("", "↶ Undo", "Undo (Ctrl+Z)", undoLast); un.id = "skUndo"; un.setAttribute("aria-keyshortcuts", "Control+Z Meta+Z");
    const re = tb("", "↷ Redo", "Redo (Ctrl+Y)", redoLast); re.id = "skRedo"; re.setAttribute("aria-keyshortcuts", "Control+Y Control+Shift+Z Meta+Shift+Z");
    const cl = tb("", "🗑 Clear", "Clear the whole drawing", clearSheet, "danger");
    acts.append(pen, er, un, re, cl);
    box.append(cols, sz, acts);
    syncTools();
}
function syncTools() {
    document.querySelectorAll("#skTools .sk-col").forEach(b => { const on = !tool.e && b.dataset.c === tool.c; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
    document.querySelectorAll("#skTools .sk-tool[data-t]").forEach(b => { const on = (b.dataset.t === "eraser") === tool.e; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
    const w = tool.e ? tool.ew : tool.w, rng = $("Size"), dot = $("SizeDot"), val = $("SizeVal");
    if (rng) { rng.value = String(w); rng.setAttribute("aria-label", (tool.e ? "Eraser" : "Brush") + " size"); }
    if (dot) { dot.style.setProperty("--d", Math.max(3, Math.min(26, w * .55)) + "px"); dot.style.setProperty("--c", tool.e ? "#ffffff" : tool.c); dot.classList.toggle("erase", tool.e); }
    if (val) val.textContent = (tool.e ? "Eraser " : "") + w + " px";
    const u = $("Undo"), r = $("Redo"); if (u) u.disabled = !undo.length; if (r) r.disabled = !redo.length;
    const cv = $("Canvas"); if (cv) cv.classList.toggle("erasing", tool.e);
}
// the word line: blanks with any revealed letters, or the word itself for whoever knows it
function wordView(d, s) {
    const box = $("Word"); if (!box) return;
    const me = X.me(), drawer = Number(s.drawer) === me && arr(s.players).map(Number).includes(me), sec = drawer ? mySecret(s) : null;
    const sig = [s.mid, s.n, s.phase, s.mask, JSON.stringify(s.hint || {}), s.word || "", hasGot(s, me) ? 1 : 0, sec ? sec.t : ""].join("|");
    if (box.dataset.k === sig) return; box.dataset.k = sig;
    box.innerHTML = "";
    const kick = el("small", "sk-wkick"), line = el("div", "sk-wline"), sub = el("small", "sk-wsub"); sub.id = "skWordSub";
    if (s.phase === "pick") { kick.textContent = drawer ? "YOUR TURN TO DRAW" : "GET READY"; line.appendChild(el("span", "sk-wait", drawer ? "Choose a word" : X.pName(d, s.drawer) + " is choosing a word…")); }
    else if (s.phase === "draw" && drawer && sec && sec.n === s.n) {
        kick.textContent = "DRAW THIS · " + (s.cat || sec.cat || "").toUpperCase();
        line.appendChild(el("span", "sk-secret", sec.t)); sub.textContent = "Only you can see it. Don't write letters!";
    }
    else if (s.phase === "draw") {
        const got = hasGot(s, me), mine = got ? load(SKEY(s, "g")) : null;
        kick.textContent = (s.cat ? s.cat.toUpperCase() + " · " : "") + (drawer ? "YOU'RE DRAWING" : got ? "YOU GOT IT!" : "GUESS THE WORD");
        line.appendChild(slots(s.mask, hintAt(s.hint)));
        sub.textContent = got ? "✔ " + (mine ? "“" + mine + "”" : "Correct") + " · now watch the others race" : lengths(s.mask);
        line.classList.toggle("got", got);
    }
    else if (s.phase === "round") {
        kick.textContent = "ROUND " + s.round + " OF " + s.rounds + " DONE";
        const lead = standings(s)[0];
        line.appendChild(el("span", "sk-wait", lead && lead.score ? X.pName(d, lead.p) + " leads with " + lead.score : "Next round coming up"));
    }
    else if (s.phase === "reveal") {
        kick.textContent = "THE WORD WAS";
        const L = arr(s.log)[arr(s.log).length - 1] || {};
        line.appendChild(el("span", "sk-answer", s.word || L.w || (L.why === "skip" ? "(no word)" : "…")));
    }
    box.append(kick, line, sub);
}
const lengths = mask => String(mask || "").split(" ").filter(Boolean).map(w => [...w].filter(c => c === "_").length || w.length).join(" + ") + " letters";
function slots(mask, shown) {
    const row = el("span", "sk-slots");
    [...String(mask || "")].forEach((ch, i) => {
        if (ch === " ") { row.appendChild(el("i", "sk-gap")); return; }
        if (ch !== "_") { row.appendChild(el("b", "sk-punct", ch)); return; }
        const b = el("b", "sk-slot" + (shown[i] != null ? " hint" : ""), shown[i] != null ? String(shown[i]).toUpperCase() : "");
        row.appendChild(b);
    });
    return row;
}
function paintTimer(d, s) {
    const tm = $("Timer"); if (!tm) return;
    const live = (s.phase === "draw" || s.phase === "pick") && Number(s.dl);
    tm.classList.toggle("off", !live);
    if (!live) { tm.querySelector("b").textContent = ""; return; }
    const total = s.phase === "pick" ? SK.pickMs : Number(s.timer) * 1000, left = Math.max(0, Number(s.dl) - srvNow()), sec = Math.ceil(left / 1000);
    tm.querySelector("b").textContent = String(sec);
    tm.querySelector(".sk-tarc").style.strokeDashoffset = String(119.4 * (1 - Math.min(1, left / total)));
    tm.classList.toggle("low", s.phase === "draw" && sec <= 10);
    if (s.phase === "draw" && sec <= 5 && sec > 0 && tm._last !== sec && arr(s.players).map(Number).includes(X.me())) { tm._last = sec; X.sfx("tick"); }
    const sub = $("WordSub");
    if (sub && s.phase === "draw" && Number(s.drawer) !== X.me() && !hasGot(s, X.me())) {
        const due = hintDue(s), base = lengths(s.mask);
        sub.textContent = base + (isFinite(due) && due < Number(s.dl) ? " · next letter in " + Math.max(0, Math.ceil((due - srvNow()) / 1000)) + " s" : "");
    }
}
function render(d, s) {
    const me = X.me(), playing = arr(s.players).map(Number).includes(me), drawer = Number(s.drawer) === me && playing;
    $("TurnT").textContent = s.phase === "over" ? "FINAL SCORES" : "ROUND " + s.round + " / " + s.rounds;
    $("Status").textContent = s.phase === "pick" ? (drawer ? "Pick a word to draw" : X.pName(d, s.drawer) + " is picking a word") : s.phase === "draw" ? (drawer ? "You're drawing! Don't write the word." : !playing ? "You're watching " + X.pName(d, s.drawer) + " draw" : hasGot(s, me) ? "You got it! Watch the others" : "Guess what " + X.pName(d, s.drawer) + " is drawing") : s.phase === "reveal" ? "Turn over" : s.phase === "round" ? "Round " + s.round + " summary" : "";
    const rc = $("Round"); if (rc.dataset.k !== s.round + "/" + s.rounds) { rc.dataset.k = s.round + "/" + s.rounds; rc.innerHTML = ""; rc.append(el("small", null, "ROUND"), el("b", null, s.round + "/" + s.rounds)); }
    wordView(d, s);
    players(d, s);
    $("Tools").classList.toggle("hidden", !(drawer && s.phase === "draw"));
    const paper = $("Paper"); paper.classList.toggle("drawable", drawer && s.phase === "draw");
    if (ink.turn !== s.mid + ":" + s.n) { ink.turn = s.mid + ":" + s.n; if (!(cur && cur.turn === ink.turn)) { cur = null; undo = []; redo = []; } zoomResetNow(); syncTools(); redraw(); }
    overlay(d, s);
    rebuildChat(s);
    // the input: guessers type guesses, the drawer and players who got it can chat, spectators can join the next round
    const inp = $("Input"), form = $("Form"), jb = $("JoinBar");
    form.classList.toggle("hidden", !playing);
    inp.placeholder = s.phase === "draw" ? (drawer ? "Chat (the word is blocked)…" : hasGot(s, me) ? "Chat with players who got it…" : "Type your guess…") : "Chat…";
    jb.classList.toggle("hidden", playing);
    if (!playing) {
        const queued = !!(s.pend || {})["p" + me], k = queued + ":" + s.phase;
        if (jb.dataset.k !== k) {
            jb.dataset.k = k; jb.innerHTML = "";
            jb.appendChild(el("p", null, queued ? "You're in! You'll start drawing and guessing when the next round begins." : "You're watching this match. Spectators can't guess or score."));
            if (s.phase !== "over") { const b = el("button", "btn " + (queued ? "ghost" : ""), queued ? "Stay a spectator" : "Join next round"); b.type = "button"; b.onclick = () => window.skJoin(); jb.appendChild(b); }
        }
    }
}
let offSeen = null;
function players(d, s) {
    const box = $("Players"), pres = presentIn(d), me = X.me(), st = standings(s);
    // connection changes go to the chat (the room-wide "lost connection" banner is off in this mode: it would cover the sheet)
    const off = new Set(arr(s.players).map(Number).filter(p => !pres(p)));
    if (offSeen && offSeen.mid === s.mid) {
        off.forEach(p => { if (!offSeen.set.has(p)) localLine(X.pName(d, p) + ((d["player" + p] || {}).left ? " left the match." : " lost connection."), "join"); });
        offSeen.set.forEach(p => { if (!off.has(p) && d["player" + p] && !d["player" + p].left) localLine(X.pName(d, p) + " is back.", "join"); });
    }
    offSeen = { mid: s.mid, set: off };
    const spect = X.activeSlots(d).filter(p => !arr(s.players).map(Number).includes(p));
    const sig = JSON.stringify([st, s.drawer, s.phase, gotList(s).map(g => g.p), s.gain, spect, s.pend, X.activeSlots(d).map(p => pres(p)), X.hostSlot(d)]);
    if (box.dataset.k === sig) return; box.dataset.k = sig;
    box.innerHTML = "";
    const ol = el("ol", "sk-plist");
    st.forEach((x, i) => {
        const p = x.p, place = st.findIndex(y => y.score === x.score) + 1, drawing = Number(s.drawer) === p && ["pick", "draw"].includes(s.phase), got = hasGot(s, p);
        const li = el("li", "sk-p" + (p === me ? " me" : "") + (drawing ? " drawing" : "") + (got ? " got" : "") + (pres(p) ? "" : " off"));
        li.dataset.emote = "p" + p; li.style.setProperty("--pc", pCol(d, p));
        const gain = s.phase === "reveal" && s.gain ? Number(s.gain["p" + p]) || 0 : 0;
        const nm = el("span", "sk-pn"); nm.append(el("b", null, X.pName(d, p) + (p === me ? " (you)" : "")), el("small", null, drawing ? "✏️ drawing" : got ? "✔ guessed it" : !pres(p) ? "offline" : p === X.hostSlot(d) ? "host" : ""));
        const sc = el("strong", "sk-ps", String(x.score)); sc.id = "skScore" + p;
        li.append(el("span", "sk-prank", "#" + place), X.avatarEl(X.pPub(d, p), { size: 30 }), nm, sc);
        if (gain) li.appendChild(el("em", "sk-pgain", "+" + gain));
        ol.appendChild(li);
    });
    box.appendChild(ol);
    if (spect.length) {
        const sp = el("div", "sk-spect"); sp.appendChild(el("small", null, "WATCHING"));
        spect.forEach(p => { const c = el("span", "sk-sp" + ((s.pend || {})["p" + p] ? " queued" : "")); c.append(X.avatarEl(X.pPub(d, p), { size: 20 }), el("i", null, X.pName(d, p) + ((s.pend || {})["p" + p] ? " · next round" : ""))); sp.appendChild(c); });
        box.appendChild(sp);
    }
}
function overlay(d, s) {
    const ov = $("Overlay"), me = X.me(), drawer = Number(s.drawer) === me && arr(s.players).map(Number).includes(me);
    const L = arr(s.log)[arr(s.log).length - 1] || {};
    const k = [s.mid, s.n, s.phase, s.word || L.w || "", drawer, s.phase === "round" ? s.round : ""].join("|");
    if (ov.dataset.k === k) return; ov.dataset.k = k; ov.innerHTML = ""; ov.className = "sk-overlay";
    if (s.phase === "draw" || s.phase === "over") { ov.classList.add("off"); return; }
    if (s.phase === "pick") {
        if (drawer) {
            ov.classList.add("pick");
            ov.appendChild(el("h3", null, "Pick a word to draw"));
            const row = el("div", "sk-opts");
            const ICON = { Character: "👤", Weapon: "⚔️", Object: "🎒" }, LEVEL = ["", "Easy", "Medium", "Hard"];
            myOptions(s).forEach((w, i) => {
                const b = el("button", "sk-opt c-" + w.cat.toLowerCase()); b.type = "button"; b.onclick = () => window.skChoose(i);
                b.style.setProperty("--i", i);
                const lv = el("span", "sk-olv l" + (w.d || 2)); lv.setAttribute("aria-label", "Difficulty: " + LEVEL[w.d || 2]); lv.append(el("i"), el("i"), el("i"), el("em", null, LEVEL[w.d || 2]));
                b.append(el("span", "sk-oicon", ICON[w.cat] || "✦"), el("small", null, (CAT_NAME[w.cat] || w.cat).toUpperCase() + (arr(s.series).length > 1 ? " · " + label(w.s) : "")), el("b", null, w.t), lv, el("i", null, [...w.t].filter(c => /[\p{L}\p{N}]/u.test(c)).length + " letters"));
                row.appendChild(b);
            });
            ov.append(row, el("p", null, "Only you see these: a character, a weapon and an object or item" + (Number(s.diff) ? " (" + DIFF_NAME[Number(s.diff)].toLowerCase() + " words)" : "") + ". One is picked for you when the timer runs out."));
        } else {
            ov.classList.add("wait");
            const a = el("div", "sk-who"); a.appendChild(X.avatarEl(X.pPub(d, s.drawer), { size: 64 }));
            ov.append(a, el("h3", null, X.pName(d, s.drawer) + " is choosing a word"), el("p", null, "Get your fingers ready…"));
        }
        return;
    }
    if (s.phase === "reveal") {
        ov.classList.add("reveal");
        const w = s.word || L.w, c = Number(s.wc || L.c) || 0;
        ov.appendChild(el("small", "sk-rkick", L.why === "all" ? "EVERYONE GOT IT!" : L.why === "time" ? "TIME'S UP" : L.why === "left" ? X.pName(d, L.d) + " LEFT" : L.why === "skip" ? "TURN SKIPPED" : "TURN OVER"));
        const card = el("div", "sk-rcard");
        if (c && charOf(c)) card.appendChild(img(c, "sk-rimg"));
        card.appendChild(el("b", "sk-rword", w || (L.why === "skip" ? X.pName(d, L.d) + " didn't pick a word" : "…")));
        ov.appendChild(card);
        const got = arr(L.got);
        const ul = el("ul", "sk-rlist");
        if (got.length) got.forEach((g, i) => { const li = el("li"); li.append(el("span", null, (i + 1) + ".")), li.append(X.avatarEl(X.pPub(d, g.p), { size: 22 }), el("b", null, X.pName(d, g.p)), el("em", null, "+" + g.pts)); ul.appendChild(li); });
        if (got.length) { const li = el("li", "drawer"); li.append(el("span", null, "✏️"), X.avatarEl(X.pPub(d, L.d), { size: 22 }), el("b", null, X.pName(d, L.d) + " (drawer)"), el("em", null, "+" + L.bonus)); ul.appendChild(li); }
        else ul.appendChild(el("li", "none", L.why === "skip" ? "No points this turn." : "Nobody got it. No points this turn."));
        ov.appendChild(ul);
        return;
    }
    if (s.phase === "round") {
        ov.classList.add("round");
        ov.appendChild(el("h3", null, "Round " + s.round + " of " + s.rounds + " complete"));
        const ul = el("ul", "sk-rsum");
        arr(s.log).filter(x => Number(x.r) === Number(s.round)).forEach(x => {
            const li = el("li"); li.append(X.avatarEl(X.pPub(d, x.d), { size: 22 }), el("b", null, X.pName(d, x.d)), el("span", null, x.w || (x.why === "skip" ? "skipped" : x.why === "left" ? "left" : "—")), el("em", null, arr(x.got).length + " got it"));
            ul.appendChild(li);
        });
        ov.appendChild(ul);
        const top = standings(s).slice(0, 3);
        const pod = el("div", "sk-pod"); top.forEach((x, i) => { const c = el("div", "sk-podc p" + (i + 1)); c.append(el("span", null, ["🥇", "🥈", "🥉"][i]), X.avatarEl(X.pPub(d, x.p), { size: 30 }), el("b", null, X.pName(d, x.p)), el("strong", null, String(x.score))); pod.appendChild(c); });
        ov.appendChild(pod);
        const q = Object.keys(s.pend || {}).map(k2 => Number(k2.slice(1)));
        ov.appendChild(el("p", null, (q.length ? q.map(p => X.pName(d, p)).join(", ") + " join" + (q.length === 1 ? "s" : "") + " now. " : "") + "Round " + (Number(s.round) + 1) + " starts in a moment…"));
    }
}
function onEvent(d, s, e) {
    const me = X.me(), playing = arr(s.players).map(Number).includes(me);
    if (e.k === "turn") {
        X.sfx("skTurn");
        if (Number(e.p) === me) banner("YOUR TURN!", "Pick a word to draw"); else banner(X.pName(d, e.p).toUpperCase(), "is up next");
        localLine(X.pName(d, e.p) + " is drawing now.", "turn");
        if (arr(e.joined).length) localLine(arr(e.joined).map(p => X.pName(d, p)).join(", ") + " joined the match.", "join");
    } else if (e.k === "draw") { if (Number(e.p) !== me && playing) X.sfx("skGo"); }
    else if (e.k === "got") {
        const mine = Number(e.p) === me;
        X.sfx(mine ? "skCorrect" : Number(s.drawer) === me ? "skBonus" : "skPop");
        const row = $("Score" + e.p); if (row) { const r = row.getBoundingClientRect(); X.burstText("+" + e.pts, r.left + r.width / 2, r.top, "#3fd47a"); const tot = Number((s.score || {})["p" + e.p]) || 0; X.countUp(row, Math.max(0, tot - Number(e.pts)), tot, 600); }
        const pp = $("Paper"); if (pp && X.motionOK()) { pp.classList.remove("flash"); void pp.offsetWidth; pp.classList.add("flash"); }
        if (mine) { feedback("Correct! +" + e.pts + (e.i === 1 ? " · first to get it!" : ""), "ok"); const w = $("Word"); if (w && X.motionOK() && w.animate) w.animate([{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], { duration: 420 }); }
    }
    else if (e.k === "hint") { if (Number(s.drawer) !== me) X.sfx("skHint"); }
    else if (e.k === "end") {
        X.sfx(e.why === "all" ? "skAll" : e.why === "time" ? "skTime" : "skip");
        if (e.why === "time") banner("TIME'S UP!", "Let's see what it was");
        else if (e.why === "all") banner("EVERYONE GOT IT!", "Nice drawing!");
    }
    else if (e.k === "round") X.sfx("skRound");
}
function banner(text, sub) { const fx = $("Fx"); if (!fx) return; const b = el("div", "sk-banner"); b.append(el("b", null, text)); if (sub) b.appendChild(el("small", null, sub)); fx.appendChild(b); setTimeout(() => b.remove(), 1900); }

/* ---------------- the end ---------------- */
function showOver(d, s) {
    const old = $("Over"); if (old) old.remove();
    const o = el("div", "sk-over"); o.id = "skOver"; o.setAttribute("role", "dialog"); o.setAttribute("aria-label", "Final scores");
    const card = el("div", "sk-ocard");
    const w = arr(s.winners).map(Number), me = X.me(), iWon = w.includes(me);
    card.appendChild(el("div", "sk-okick", (s.end === "few" ? "NOT ENOUGH PLAYERS LEFT · " : "") + "ANIME SKETCH · " + s.rounds + " ROUND" + (s.rounds == 1 ? "" : "S")));
    card.appendChild(el("h2", "sk-otitle", w.length === 1 ? X.pName(d, w[0]).toUpperCase() + " WINS!" : w.length ? "SHARED WIN: " + w.map(p => X.pName(d, p)).join(" & ").toUpperCase() : "GAME OVER"));
    const list = el("ol", "sk-orank");
    standings(s).forEach((x, i, all) => {
        const place = all.findIndex(y => y.score === x.score) + 1, drew = arr(s.log).filter(L => Number(L.d) === x.p), guessed = arr(s.log).reduce((n, L) => n + (arr(L.got).some(g => Number(g.p) === x.p) ? 1 : 0), 0);
        const li = el("li", (w.includes(x.p) ? "won" : "") + (x.p === me ? " me" : ""));
        li.append(el("span", "sk-orn", place === 1 ? "🏆" : "#" + place), X.avatarEl(X.pPub(d, x.p), { size: 34 }), el("b", null, X.pName(d, x.p) + (x.p === me ? " (you)" : "")), el("small", null, "guessed " + guessed + " · drew " + drew.length), el("strong", null, String(x.score)));
        list.appendChild(li);
    });
    card.appendChild(list);
    const words2 = arr(s.log).filter(L => L.w).map(L => L.w);
    if (words2.length) card.appendChild(el("p", "sk-owords", "Drawn: " + words2.join(" · ")));
    const btns = el("div", "sk-obtns");
    if (X.amHost()) { const a = el("button", "btn xl", "Rematch"); a.onclick = () => window.skAgain(); const b = el("button", "btn ghost", "Back to lobby"); b.onclick = () => window.skLobby(); btns.append(a, b); }
    else btns.appendChild(el("p", "sk-wait", "Waiting for " + X.pName(d, X.hostSlot(d)) + " to start a rematch or go back to the lobby."));
    card.appendChild(btns);
    o.appendChild(card); document.body.appendChild(o);
    X.sfx(iWon ? "win" : arr(s.players).map(Number).includes(me) ? "skRound" : "skAll");
    if (X.motionOK()) confetti(o, ["#ff5a5a", "#ffd21f", "#3fc46b", "#2f8cff", "#b06bff", "#ff5fa8"]);
    setTimeout(() => { const f = o.querySelector("button"); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }, 60);
}
