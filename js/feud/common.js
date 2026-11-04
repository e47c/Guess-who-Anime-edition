/* =====================================================================
   Shared by ANIME FEUD (js/feud/feud.js) and MOST LIKELY (js/feud/likely.js).
   Two separate modes with their own rooms data, screens, sounds and settings; this file only holds what both need:
   the question library, the per-player question history and rotation, the server clock, the character pictures
   (the Anime Draft roster), and small screen helpers that work on a mode's own element ids (kit("fd") / kit("ml")).
   ===================================================================== */
import { CHARS } from "../draft/data.js?v=2";
import { PACKS } from "./packs/index.js?v=1";
import { buildLibrary, eligible, pickQuestion, pickPair, qText, remember, trimHist, balanceTeams, poolInfo } from "./engine.js?v=3";

export const LIB = buildLibrary(PACKS);
export const K = { X: null, DB: null, offset: 0 };
export const arr = x => Array.isArray(x) ? x : (x ? Object.values(x) : []);
export const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
export const srvNow = () => Date.now() + K.offset;
export const label = k => ((K.X && K.X.HB_SERIES[k]) || { label: k }).label;
export const presentIn = d => p => { const n = d && d["player" + p]; return !!n && !n.left && ((d.presence || {})["p" + p] !== false); };
export const pickOpt = (v, list, def) => list.includes(Number(v)) ? Number(v) : def;
export const seriesOf = d => arr(d && d.animes).filter(k => CHARS[k]);
export const TEAM = { A: { name: "Team Crimson", short: "CRIMSON", cls: "fd-a" }, B: { name: "Team Gold", short: "GOLD", cls: "fd-b" } };

/* ---------------- start-up (both modes call it; it runs once) ---------------- */
const dbWaiters = [];
export function initCommon(ctx, onDb) {
    if (onDb) dbWaiters.push(onDb);
    if (K.X) { if (K.DB && onDb) onDb(K.DB); return; }
    K.X = ctx;
    ctx.onValue(ctx.ref(ctx.db, ".info/serverTimeOffset"), s => { K.offset = Number(s.val()) || 0; });
    ctx.draftDb().then(db => { K.DB = db; dbWaiters.forEach(f => { try { f(db); } catch (e) { console.error(e); } }); }).catch(() => {});
}

/* ---------------- question history (per Firebase anonymous identity, shared by both modes) ----------------
   Kept in this browser (localStorage, keyed by the anonymous uid, so it survives normal sessions), mirrored into the
   room so the host sees everyone's, and also into feudHistory/<uid> when the database rules allow it (they currently
   don't: see README). No cross-device history: there is no account linking. */
let fbHist = null, pubKey = "";            // fbHist: null = untested, false = not allowed by the rules, true = synced
const HKEY = () => "aa_feud_hist_v1:" + (K.X && K.X.uid() || "anon");
function loadHist() { try { return trimHist(JSON.parse(localStorage.getItem(HKEY()) || "{}") || {}); } catch (e) { return {}; } }
function saveHist(h) { try { localStorage.setItem(HKEY(), JSON.stringify(h)); } catch (e) {} }
const shareable = h => trimHist(h, srvNow(), 14, 250);
export function recordSeen(key, at) {
    const X = K.X, h = loadHist(), cur = h[key];
    if (cur && Number(cur[0]) >= Number(at)) return;
    const nh = remember(h, key, Number(at) || srvNow()); saveHist(nh);
    const room = X.room(); if (!room) return;
    X.update(X.ref(X.db, "rooms/" + room + "/feudHist/p" + X.me()), { u: X.uid(), ["h/" + key]: nh[key] }).catch(() => {});
    if (fbHist) X.update(X.ref(X.db, "feudHistory/" + X.uid()), { [key]: nh[key] }).catch(() => { fbHist = false; });
}
export function publishHist(d) {
    const X = K.X, room = X.room(); if (!room || !d) return;
    const h = shareable(loadHist()), sig = room + ":" + X.me() + ":" + JSON.stringify(h), mine = (d.feudHist || {})["p" + X.me()];
    if (sig === pubKey && mine && mine.u === X.uid()) return;
    pubKey = sig;
    X.update(X.ref(X.db, "rooms/" + room + "/feudHist"), { ["p" + X.me()]: { u: X.uid(), h } }).catch(() => {});
}
export async function syncRemoteHist() {
    const X = K.X; if (fbHist !== null || !X.uid()) return;
    try {
        const snap = await X.get(X.ref(X.db, "feudHistory/" + X.uid()));
        const remote = snap.val() || {}, h = loadHist();
        Object.entries(remote).forEach(([k, v]) => { if (!h[k] || Number(arr(v)[0]) > Number(h[k][0])) h[k] = arr(v); });
        saveHist(trimHist(h)); fbHist = true;
    } catch (e) { fbHist = false; }
}
export function roomHists(d, players) {
    const fh = d.feudHist || {};
    return arr(players).map(Number).map(p => { const x = fh["p" + p], node = d["player" + p]; return x && node && x.u === node.uid ? x.h || {} : null; }).filter(Boolean);
}
// the next question (and, for Most Likely, its pair of characters)
export function nextQuestion(type, series, hists, used) {
    const q = pickQuestion(eligible(LIB, type, series), { hists, used, now: srvNow(), lib: LIB });
    if (!q || type !== "likely") return q;
    const pair = pickPair(LIB, q, series);
    return pair ? Object.assign({}, q, { pair }) : null;
}
export const qTpl = s => (LIB.questions.find(q => q.questionId === (s.q || {}).id) || {}).questionText || "";

/* ---------------- characters (the Anime Draft roster: AniList ids, names, pictures) ---------------- */
export const charOf = id => (K.DB && K.DB[id]) || null;
export const charName = id => { const c = charOf(id); if (c) return c.n; for (const rows of Object.values(CHARS)) { const r = rows.find(x => Number(x[0]) === Number(id)); if (r) return r[1]; } return "?"; };
export const charSeries = id => { const c = charOf(id); if (c) return c.s; for (const [k, rows] of Object.entries(CHARS)) if (rows.some(x => Number(x[0]) === Number(id))) return k; return ""; };
export const img = (id, cls) => { const w = el("span", cls), c = charOf(id); if (c && c.img) { const i = new Image(); i.src = c.img; i.alt = ""; i.decoding = "async"; w.appendChild(i); } else w.textContent = charName(id).charAt(0); return w; };

/* ---------------- lobby pieces ---------------- */
export const teamsFrom = (d, mapKey) => balanceTeams(K.X.activeSlots(d), d[mapKey] || {});
export function optButtons(box, list, cur, lock, fmt, onPick) {
    box.innerHTML = "";
    list.forEach(v => { const b = el("button", "modebtn" + (v === cur ? " selected" : ""), fmt(v)); b.type = "button"; b.disabled = lock; b.dataset.k = v; b.onclick = () => onPick(v); box.appendChild(b); });
}
export function scopeLine(box, type, series) {
    const p = poolInfo(LIB, type, series); box.innerHTML = "";
    box.append(el("b", "fd-scope-tag " + (series.length > 1 ? "mix" : "single"), series.length > 1 ? "ANIME MIX" : "SINGLE ANIME"),
        el("span", null, series.length === 1 ? label(series[0]) : series.length + " series"), el("em", null, p.questions + " questions · " + p.boards + " boards"));
    return p;
}
export function teamColumns(box, d, T, lock, onTap, onShuffle) {
    const X = K.X; box.innerHTML = "";
    ["A", "B"].forEach(k => {
        const col = el("div", "drt-col fd-tcol " + TEAM[k].cls); col.appendChild(el("b", null, TEAM[k].short + " · " + T[k].length));
        T[k].forEach(p2 => { const c = el("button", "drt-chip"); c.type = "button"; c.disabled = lock; c.append(X.avatarEl(X.pPub(d, p2), { size: 22 }), el("span", null, X.pName(d, p2))); c.onclick = () => onTap(p2); col.appendChild(c); });
        if (!T[k].length) col.appendChild(el("span", "drt-empty", "empty team"));
        box.appendChild(col);
    });
    if (!lock) { const sh = el("button", "chip-btn fd-shuffle", "Shuffle teams"); sh.type = "button"; sh.onclick = onShuffle; box.appendChild(sh); box.appendChild(el("p", "anime-hint", "Tap a player to move them to the other team.")); }
}
export function tapTeam(d, mapKey, p) {
    const T = teamsFrom(d, mapKey), map = {};
    T.A.forEach(i => { map["p" + i] = "A"; }); T.B.forEach(i => { map["p" + i] = "B"; });
    map["p" + p] = map["p" + p] === "A" ? "B" : "A";
    return map;
}
export function shuffleTeams(d) { const map = {}; K.X.activeSlots(d).slice().sort(() => Math.random() - .5).forEach((p, i) => { map["p" + p] = i % 2 ? "B" : "A"; }); return map; }

/* ---------------- screen helpers on a mode's own ids ("fd..." for Anime Feud, "ml..." for Most Likely) ---------------- */
export function kit(px) {
    const $ = id => document.getElementById(px + id);
    return {
        $,
        banner(text, sub, cls) { const fx = $("Fx"); if (!fx) return; const b = el("div", "fd-banner " + (cls || "")); b.append(el("b", null, text)); if (sub) b.appendChild(el("small", null, sub)); fx.appendChild(b); setTimeout(() => b.remove(), 1900); },
        feedback(msg, kind) { const f = $("Feedback"); if (!f) return; f.textContent = msg; f.className = "fd-feedback show " + (kind || ""); clearTimeout(f._t); f._t = setTimeout(() => f.classList.remove("show"), 3200); },
        topBar(w) {
            const top = el("div", "fd-top");
            const rc = el("div", "fd-round"); rc.id = px + "Round";
            const qc = el("div", "fd-qcard"); const k = el("div", "fd-qkick"); k.id = px + "Kick"; const q = el("h2", "fd-qtext"); q.id = px + "Q"; qc.append(k, q);
            const tm = el("div", "fd-timer"); tm.id = px + "Timer"; tm.innerHTML = '<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="19"/><circle class="fd-tarc" cx="22" cy="22" r="19"/></svg><b></b>';
            top.append(rc, qc, tm); w.appendChild(top);
        },
        setTop(s, kick, unit) {
            $("TurnT").textContent = s.phase === "over" ? "FINAL SCORE" : s.sd ? "SUDDEN DEATH" : unit + " " + s.round + " / " + s.rounds;
            const rc = $("Round"); rc.innerHTML = ""; rc.append(el("small", null, s.sd ? "SUDDEN" : unit), el("b", null, s.sd ? "DEATH" : s.round + "/" + s.rounds));
            $("Kick").textContent = kick;
            $("Q").textContent = qText(qTpl(s), arr(s.series), label);
        },
        fxLayer(w) { const fx = el("div", "fd-fx"); fx.id = px + "Fx"; fx.setAttribute("aria-hidden", "true"); w.appendChild(fx); },
        feedbackLine(w) { const fb = el("p", "fd-feedback"); fb.id = px + "Feedback"; fb.setAttribute("role", "status"); fb.setAttribute("aria-live", "polite"); w.appendChild(fb); }
    };
}
/* the countdown, drawn from the shared deadline (server time) so every screen shows the same second */
export function makeTimer(px, node, gameType, totalMs, tickFor) {
    let t = 0, last = -1;
    return {
        start() {
            if (t) return;
            t = setInterval(() => {
                const X = K.X, d = X.data(), s = d && d[node], tm = document.getElementById(px + "Timer");
                if (!s || !tm || d.gameType !== gameType) { clearInterval(t); t = 0; return; }
                const live = !!Number(s.dl) && !["reveal", "over"].includes(s.phase);
                tm.classList.toggle("off", !live);
                if (!live) { tm.querySelector("b").textContent = ""; return; }
                const left = Math.max(0, Number(s.dl) - srvNow()), sec = Math.ceil(left / 1000), frac = Math.min(1, left / totalMs(s));
                tm.querySelector("b").textContent = String(sec);
                tm.querySelector(".fd-tarc").style.strokeDashoffset = String(119.4 * (1 - frac));
                tm.classList.toggle("low", sec <= 5);
                if (sec <= 5 && sec > 0 && sec !== last && tickFor(s)) { last = sec; X.sfx("tick"); }
            }, 200);
        },
        stop() { clearInterval(t); t = 0; }
    };
}
export function confetti(host, cols) {
    const cv = el("canvas", "fd-confetti"); host.appendChild(cv);
    const c = cv.getContext("2d"), W = cv.width = innerWidth, Hh = cv.height = innerHeight;
    const P = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: -20 - Math.random() * Hh * .6, v: 2 + Math.random() * 3.5, r: Math.random() * 6.28, s: 5 + Math.random() * 6, c: cols[(Math.random() * cols.length) | 0], w: (Math.random() - .5) * .2 }));
    const t0 = performance.now();
    (function f(t) {
        if (!cv.isConnected || t - t0 > 4200) { cv.remove(); return; }
        c.clearRect(0, 0, W, Hh);
        P.forEach(p => { p.y += p.v; p.x += Math.sin(p.r) * 1.2; p.r += p.w; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore(); });
        requestAnimationFrame(f);
    })(t0);
}
export const hintFor = d => { const n = seriesOf(d).length; return n === 1 ? "Single anime: questions written for " + label(seriesOf(d)[0]) + "." : n > 1 ? "Anime Mix: crossover questions, answers only from the " + n + " series you tick." : "Tick one series for its own questions, or several for an Anime Mix."; };
