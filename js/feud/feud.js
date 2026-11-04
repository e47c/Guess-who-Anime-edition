/* =====================================================================
   ANIME FEUD (sixth mode): screen, lobby panel, Firebase sync, question history.
   Rules and rotation live in engine.js (pure, tested in Node). js/game.js only routes here.

   Two game types with two looks:
     Classic Feud  a TV game-show studio: buzzer face-off, play or pass, the hidden board, strikes, the steal.
     Most Likely   a light, warm head-to-head: two close characters, both teams vote at once, the right pick scores.

   Firebase layout (everything under rooms/<code>, the only path the current rules allow):
     feud            the match: teams, scores, round, the question's ID, revealed slots / the duel, strikes, turn key, deadline.
                     Classic answers are never written: every client rebuilds the board from the shared library.
     feudHist/p<N>   that player's recent question history ({ u: uid, h: { "<qid>@<scope>": [lastSeen, times] } }),
                     shared so the host can pick what is fresh for the whole room.
   Every move runs in a transaction on rooms/<code>/feud and is checked there (turn key, phase, player), so double
   buzzes, two players clicking at once and a host + a guest both advancing can never both apply.
   ===================================================================== */
import { CHARS } from "../draft/data.js?v=2";
import { NICKNAMES } from "./nicknames.js?v=1";
import { PACKS } from "./packs/index.js?v=1";
import { FEUD_RULES as R, buildLibrary, eligible, poolInfo, pickQuestion, pickPair, stateBoard, qText, newMatch, act, actorOf, advance, needsQuestion,
    balanceTeams, remember, trimHist, guessTeam, other, faceOffOf, teamPick } from "./engine.js?v=2";

export const FEUD_LIB = buildLibrary(PACKS);
const LIB = FEUD_LIB;
const arr = x => Array.isArray(x) ? x : (x ? Object.values(x) : []);
const TEAM = { A: { name: "Team Crimson", short: "CRIMSON", cls: "fd-a" }, B: { name: "Team Gold", short: "GOLD", cls: "fd-b" } };
let X = null, DB = null, offset = 0, fbHist = null;      // fbHist: null = untested, false = not allowed by the rules, true = synced
const $ = id => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const srvNow = () => Date.now() + offset;
const label = k => ((X && X.HB_SERIES[k]) || { label: k }).label;
const presentIn = d => p => { const n = d && d["player" + p]; return !!n && !n.left && ((d.presence || {})["p" + p] !== false); };
const fType = d => d && d.feudType === "likely" ? "likely" : "classic";
const roundOpts = t => t === "likely" ? [R.likelyRoundChoices, R.likelyRounds] : [R.roundChoices, R.rounds];
const timerOpts = t => t === "likely" ? [R.likelyTimerChoices, R.likelyTimer] : [R.timerChoices, R.timer];
const pickOpt = (v, [list, def]) => list.includes(Number(v)) ? Number(v) : def;
const fRounds = d => pickOpt(d && d.feudRounds, roundOpts(fType(d)));
const fTimer = d => pickOpt(d && d.feudTimer, timerOpts(fType(d)));
const fSeries = d => arr(d && d.animes).filter(k => CHARS[k]);
export const feudPrefs = p => { const t = p.feudType === "likely" ? "likely" : "classic"; return { feudType: t, feudRounds: pickOpt(p.feudRounds, roundOpts(t)), feudTimer: pickOpt(p.feudTimer, timerOpts(t)) }; };
export const feudPrefsOf = d => ({ feudType: fType(d), feudRounds: fRounds(d), feudTimer: fTimer(d) });

/* ---------------- question history (per Firebase anonymous identity) ----------------
   Kept in this browser (localStorage, keyed by the anonymous uid, so it survives normal sessions), mirrored into the
   room so the host sees everyone's, and also into feudHistory/<uid> when the database rules allow it (they currently
   don't: see README). No cross-device history: there is no account linking. */
const HKEY = () => "aa_feud_hist_v1:" + (X && X.uid() || "anon");
function loadHist() { try { return trimHist(JSON.parse(localStorage.getItem(HKEY()) || "{}") || {}); } catch (e) { return {}; } }
function saveHist(h) { try { localStorage.setItem(HKEY(), JSON.stringify(h)); } catch (e) {} }
let pubKey = "";
const shareable = h => trimHist(h, srvNow(), 14, 250);      // what the room needs: the last two weeks
function recordSeen(key, at) {
    const h = loadHist(), cur = h[key];
    if (cur && Number(cur[0]) >= Number(at)) return;           // already counted (refresh, re-render)
    const nh = remember(h, key, Number(at) || srvNow()); saveHist(nh);
    const room = X.room(); if (!room) return;
    X.update(X.ref(X.db, "rooms/" + room + "/feudHist/p" + X.me()), { u: X.uid(), ["h/" + key]: nh[key] }).catch(() => {});
    if (fbHist) X.update(X.ref(X.db, "feudHistory/" + X.uid()), { [key]: nh[key] }).catch(() => { fbHist = false; });
}
function publishHist(d, force) {
    const room = X.room(); if (!room || !d) return;
    const h = shareable(loadHist()), sig = room + ":" + X.me() + ":" + JSON.stringify(h), mine = (d.feudHist || {})["p" + X.me()];
    if (!force && sig === pubKey && mine && mine.u === X.uid()) return;
    pubKey = sig;
    X.update(X.ref(X.db, "rooms/" + room + "/feudHist"), { ["p" + X.me()]: { u: X.uid(), h } }).catch(() => {});
}
async function syncRemoteHist() {      // optional: works only if the rules add feudHistory/$uid (see README)
    if (fbHist !== null || !X.uid()) return;
    try {
        const snap = await X.get(X.ref(X.db, "feudHistory/" + X.uid()));
        const remote = snap.val() || {}, h = loadHist();
        Object.entries(remote).forEach(([k, v]) => { if (!h[k] || Number(arr(v)[0]) > Number(h[k][0])) h[k] = arr(v); });
        saveHist(trimHist(h)); fbHist = true;
    } catch (e) { fbHist = false; }
}
// the histories the host weighs: every seated player's, matched to their uid so a stale slot never counts
function roomHists(d, players) {
    const fh = d.feudHist || {};
    return arr(players).map(Number).map(p => { const x = fh["p" + p], node = d["player" + p]; return x && node && x.u === node.uid ? x.h || {} : null; }).filter(Boolean);
}
// the next question (and, in Most Likely, its pair of characters)
function nextQuestion(type, series, hists, used) {
    const q = pickQuestion(eligible(LIB, type, series), { hists, used, now: srvNow(), lib: LIB });
    if (!q || type !== "likely") return q;
    const pair = pickPair(LIB, q, series);
    return pair ? Object.assign({}, q, { pair }) : null;
}

/* ---------------- init ---------------- */
export function initFeud(ctx) {
    X = ctx;
    X.onValue(X.ref(X.db, ".info/serverTimeOffset"), s => { offset = Number(s.val()) || 0; });
    X.draftDb().then(db => { DB = db; const d = X.data(); if (d && d.gameType === "feud" && d.feud && d.status !== "waiting") showFeud(d); }).catch(() => {});
    Object.assign(window, {
        setFeudOpt(k, v) {
            const d = X.data(); if (!d || !X.amHost() || d.status !== "waiting") return;
            X.sfx("pick");
            if (k === "type") { const t = v === "likely" ? "likely" : "classic"; X.lobbySet({ feudType: t, feudRounds: pickOpt(d.feudRounds, roundOpts(t)), feudTimer: pickOpt(d.feudTimer, timerOpts(t)) }); }
            if (k === "rounds") X.lobbySet({ feudRounds: Number(v) });
            if (k === "timer") X.lobbySet({ feudTimer: Number(v) });
        },
        feudTeamTap(p) {
            const d = X.data(); if (!d || !X.amHost() || d.status !== "waiting") return;
            const T = teamsOf(d), map = {};
            T.A.forEach(i => { map["p" + i] = "A"; }); T.B.forEach(i => { map["p" + i] = "B"; });
            map["p" + p] = map["p" + p] === "A" ? "B" : "A";
            X.sfx("toggle"); X.lobbySet({ feudTeams: map });
        },
        feudShuffle() {
            const d = X.data(); if (!d || !X.amHost() || d.status !== "waiting") return;
            const act = X.activeSlots(d).slice().sort(() => Math.random() - .5), map = {};
            act.forEach((p, i) => { map["p" + p] = i % 2 ? "B" : "A"; });
            X.sfx("toggle"); X.lobbySet({ feudTeams: map });
        },
        fdSubmit: () => submitText(),
        fdBuzz: () => buzz(),
        fdDecide: play => move({ k: "decide", tk: ((X.data() || {}).feud || {}).tk, play }),
        fdVote: pick => vote(pick),
        fdNext: () => hostAdvance(true),
        fdAgain: () => feudStart(true),
        fdLobby: () => X.backToLobby(true)
    });
    // the buzzer is the space bar (or Enter) for the two face-off players
    document.addEventListener("keydown", e => {
        if (e.repeat || (e.key !== " " && e.key !== "Enter") || /INPUT|TEXTAREA|BUTTON/.test((e.target || {}).tagName || "")) return;
        const b = $("fdBuzzBtn"); if (b && !b.disabled && b.offsetParent) { e.preventDefault(); buzz(); }
    });
}

/* ---------------- lobby ---------------- */
export function teamsOf(d) { return balanceTeams(X.activeSlots(d), d.feudTeams || {}); }
export function feudHint(d) {
    const n = fSeries(d).length;
    return n === 1 ? "Single anime: questions written for " + label(fSeries(d)[0]) + "." : n > 1 ? "Anime Mix: crossover questions, answers only from the " + n + " series you tick." : "Tick one series for its own questions, or several for an Anime Mix.";
}
export function feudReq(d) {
    const series = fSeries(d), T = teamsOf(d), type = fType(d), rounds = fRounds(d);
    if (!series.length) return { ok: false, msg: "Tick at least one series." };
    if (!T.A.length || !T.B.length) return { ok: false, msg: "Both teams need at least one player. Tap a player to move them." };
    const p = poolInfo(LIB, type, series), name = type === "likely" ? "Most Likely" : "Classic Feud", what = series.length === 1 ? label(series[0]) + " on its own" : "this mix";
    if (p.boards < rounds) {
        const fewer = roundOpts(type)[0].filter(r => r <= p.boards).pop();
        return { ok: false, msg: p.boards ? name + " has " + p.boards + " questions for " + what + ", not enough for " + rounds + " rounds. " + (fewer ? "Pick " + fewer + " rounds or tick" : "Tick") + " another series." : name + " has no questions for " + what + " yet. Tick another series or switch game type." };
    }
    return { ok: true, msg: "Anime Feud · " + name + " · " + (series.length === 1 ? "Single anime" : "Anime Mix") + " · " + rounds + (type === "likely" ? " duels" : " rounds") + " · " + T.A.length + " vs " + T.B.length };
}
function optButtons(box, list, cur, lock, fmt, key) {
    box.innerHTML = "";
    list.forEach(v => { const b = el("button", "modebtn" + (v === cur ? " selected" : ""), fmt(v)); b.type = "button"; b.disabled = lock; b.dataset.k = v; b.onclick = () => window.setFeudOpt(key, v); box.appendChild(b); });
}
export function feudLobby(d, lock) {
    const type = fType(d), series = fSeries(d);
    document.querySelectorAll(".fd-type").forEach(b => { b.classList.toggle("selected", b.dataset.k === type); b.disabled = lock; b.setAttribute("aria-pressed", String(b.dataset.k === type)); });
    $("fdRoundsLbl").textContent = type === "likely" ? "Duels" : "Rounds";
    $("fdTimerLbl").textContent = type === "likely" ? "Vote time" : "Answer time";
    optButtons($("fdRoundsBtns"), roundOpts(type)[0], fRounds(d), lock, String, "rounds");
    optButtons($("fdTimerBtns"), timerOpts(type)[0], fTimer(d), lock, v => v + " s", "timer");
    const p = poolInfo(LIB, type, series), sc = $("fdScope"); sc.innerHTML = "";
    const tag = el("b", "fd-scope-tag " + (series.length > 1 ? "mix" : "single"), series.length > 1 ? "ANIME MIX" : "SINGLE ANIME");
    sc.append(tag, el("span", null, series.length === 1 ? label(series[0]) : series.length + " series"), el("em", null, p.questions + " questions · " + p.boards + " boards"));
    const box = $("fdTeams"); box.innerHTML = "";
    const T = teamsOf(d);
    ["A", "B"].forEach(k => {
        const col = el("div", "drt-col fd-tcol " + TEAM[k].cls); col.appendChild(el("b", null, TEAM[k].short + " · " + T[k].length));
        T[k].forEach(p2 => { const c = el("button", "drt-chip"); c.type = "button"; c.disabled = lock; c.append(X.avatarEl(X.pPub(d, p2), { size: 22 }), el("span", null, X.pName(d, p2))); c.onclick = () => window.feudTeamTap(p2); col.appendChild(c); });
        if (!T[k].length) col.appendChild(el("span", "drt-empty", "empty team"));
        box.appendChild(col);
    });
    if (!lock) { const sh = el("button", "chip-btn fd-shuffle", "Shuffle teams"); sh.type = "button"; sh.onclick = () => window.feudShuffle(); box.appendChild(sh); box.appendChild(el("p", "anime-hint", "Tap a player to move them to the other team.")); }
    $("fdHint").textContent = type === "likely"
        ? "Most Likely: two close characters per question. Both teams vote at the same time; the team that picks the more likely one scores (closer calls are worth more)."
        : "Classic Feud: a buzzer face-off opens every round. Top answer (or the higher one) wins control: play the board or pass it. Three strikes and the other team can steal.";
    syncRemoteHist().then(() => publishHist(X.data()));
}

/* ---------------- start (host) ---------------- */
export async function feudStart(again) {
    const d = X.data(); if (!d || !X.amHost()) return;
    if (again && d.feud && d.feud.phase !== "over" && !(await X.uiConfirm({ title: "Restart Anime Feud?", text: "The current match is thrown away.", ok: "Restart" }))) return;
    try {
        const series = again && d.feud ? arr(d.feud.series) : fSeries(d), type = again && d.feud ? d.feud.type : fType(d);
        let teams = again && d.feud ? { A: arr(d.feud.teams.A).map(Number), B: arr(d.feud.teams.B).map(Number) } : teamsOf(d);
        const act = X.activeSlots(d); teams = { A: teams.A.filter(p => act.includes(p)), B: teams.B.filter(p => act.includes(p)) };
        if (!teams.A.length || !teams.B.length) teams = balanceTeams(act);
        if (!teams.A.length || !teams.B.length) { X.toast("Anime Feud needs two teams."); return; }
        const players = teams.A.concat(teams.B), now = srvNow();
        const q = nextQuestion(type, series, roomHists(d, players), []);
        if (!q) { X.toast("No questions fit those series."); return; }
        const mid = Date.now();
        const s = newMatch({ lv: LIB.version, mid, type, series, teams, q, now, rounds: again && d.feud ? d.feud.rounds : fRounds(d), timer: again && d.feud ? d.feud.timer : fTimer(d), first: Math.random() < .5 ? "A" : "B" });
        await X.update(X.ref(X.db, "rooms/" + X.room()), { status: "playing", matchId: mid, feud: s });
    } catch (e) { console.error(e); X.toast("Could not start Anime Feud: " + (e.message || e)); }
}
export const feudSeats = d => { const s = d && d.feud; return s ? arr(s.teams && s.teams.A).concat(arr(s.teams && s.teams.B)).map(Number) : []; };
export const feudOver = d => !d.feud || d.feud.phase === "over";

/* ---------------- moves ---------------- */
let busy = false;
async function move(a, quiet) {
    if (busy) return false; busy = true;
    let err = null;
    try {
        await X.runTransaction(X.ref(X.db, "rooms/" + X.room() + "/feud"), cur => {
            if (!cur) return cur;
            err = act(cur, Object.assign({ by: X.me() }, a), { board: stateBoard(LIB, cur), present: presentIn(X.data()), now: srvNow() });
            return err ? undefined : cur;
        });
    } catch (e) { console.error(e); err = "Couldn't send that. Try again."; }
    busy = false;
    if (err && err !== "stale" && !quiet) { feedback(err, "warn"); X.sfx("toggle"); return false; }
    return !err;
}
function buzz() {
    const b = $("fdBuzzBtn"); if (!b || b.disabled) return;
    b.disabled = true; b.classList.add("hit"); X.sfx("slam");
    move({ k: "buzz" }, true);
}
function vote(pick) {
    const s = (X.data() || {}).feud; if (!s || s.phase !== "vote") return;
    X.sfx("pick");
    myVote = pick; renderDuelVotes(X.data(), s);        // instant feedback; the transaction confirms it
    move({ k: "vote", pick }, true);
}

/* ---------------- host duties: the clock, the next round, players who left ---------------- */
let dutyT = 0, dutyKey = "", goneKey = "";
export function feudDuties(d) {
    const s = d.feud; if (!s || s.phase === "over") return;
    const gone = ["A", "B"].find(k => !arr(s.teams[k]).some(p => d["player" + p] && !d["player" + p].left));
    if (gone) { const k = "g" + s.mid; if (goneKey !== k) { goneKey = k; X.toast(TEAM[gone].name + " left. Back to the lobby."); X.backToLobby(true); } return; }
    // a vote also ends early when every player still here has voted (someone may have left mid-vote)
    if (s.phase === "vote" && Number(s.dl) > srvNow() + 800) {
        const pr = presentIn(d), all = feudSeats(d).filter(pr).every(p => (s.votes || {})["p" + p]);
        if (all && dutyKey !== "all:" + s.tk) { dutyKey = "all:" + s.tk; clearTimeout(dutyT); dutyT = setTimeout(() => timeoutTx(s, true), 300); return; }
    }
    const key = s.mid + ":" + s.tk + ":" + s.phase;
    if (dutyKey === key) return;
    dutyKey = key; clearTimeout(dutyT);
    if (s.phase === "reveal") dutyT = setTimeout(() => hostAdvance(false), Math.max(0, Number(s.nx) - srvNow()));
    else if (Number(s.dl)) dutyT = setTimeout(() => timeoutTx(s), Math.max(0, Number(s.dl) - srvNow()) + R.graceMs);
}
function timeoutTx(s, force) {
    if (!X.amHost()) return;
    X.runTransaction(X.ref(X.db, "rooms/" + X.room() + "/feud"), cur => {
        if (!cur || cur.mid !== s.mid || cur.tk !== s.tk) return;
        return act(cur, { k: "timeout", tk: cur.tk }, { board: stateBoard(LIB, cur), present: presentIn(X.data()), now: srvNow(), force }) ? undefined : cur;
    }).catch(e => console.error(e));
}
async function hostAdvance(manual) {
    const d = X.data(), s = d && d.feud; if (!s || s.phase !== "reveal" || !X.amHost()) return;
    if (manual) X.sfx("click");
    const c = needsQuestion(s) ? nextQuestion(s.type, arr(s.series), roomHists(d, feudSeats(d)), s.used) : null;
    try {
        await X.runTransaction(X.ref(X.db, "rooms/" + X.room() + "/feud"), cur => {
            if (!cur || cur.mid !== s.mid) return;
            return advance(cur, s.round, c, srvNow()) ? undefined : cur;
        });
    } catch (e) { console.error(e); }
}

/* ---------------- screen ---------------- */
let seen = { mid: 0, evn: -1 }, built = "", tickT = 0, overShown = 0, lastTick = -1, verWarned = 0, myVote = "";
export function feudReset() {
    clearInterval(tickT); tickT = 0; clearTimeout(dutyT); dutyKey = ""; seen = { mid: 0, evn: -1 }; built = ""; overShown = 0; myVote = "";
    const o = $("fdOver"); if (o) o.remove();
    const f = $("feud"); if (f) f.classList.remove("fd-light", "fd-studio");
}
export function showFeud(d) {
    X.showOnly("feud");
    const s = d.feud; if (!s) return;
    if (s.lv && s.lv !== LIB.version && verWarned !== s.mid) { verWarned = s.mid; X.toast("The host has a different question library. Reload the page if boards look wrong."); }
    $("feud").classList.toggle("fd-light", s.type === "likely"); $("feud").classList.toggle("fd-studio", s.type !== "likely");
    if (built !== s.mid + ":" + s.type) { built = s.mid + ":" + s.type; seen = { mid: s.mid, evn: -1 }; myVote = ""; (s.type === "likely" ? buildDuel : buildStudio)(); }
    (s.type === "likely" ? renderDuel : renderStudio)(d, s);
    timerLoop();
    if (s.q && s.phase !== "over" && s.phase !== "pick" && feudSeats(d).includes(X.me())) recordSeen(s.q.key, s.q.at);
    const firstPaint = seen.evn < 0;
    if (s.ev && s.ev.n !== seen.evn) { if (!firstPaint) (s.type === "likely" ? duelEvent : studioEvent)(d, s, s.ev); seen.evn = s.ev.n; }
    if (s.phase === "over" && overShown !== s.mid) { overShown = s.mid; setTimeout(() => { const d2 = X.data(); if (d2 && d2.feud && d2.feud.mid === s.mid) showOver(d2, d2.feud); }, firstPaint ? 0 : 1600); }
    if (s.phase !== "over") { const o = $("fdOver"); if (o) o.remove(); }
}
const myTeam = s => ["A", "B"].find(k => arr(s.teams[k]).map(Number).includes(X.me())) || "";
const qTpl = s => (LIB.questions.find(q => q.questionId === (s.q || {}).id) || {}).questionText || "";
const charOf = id => (DB && DB[id]) || null;
const charName = id => { const c = charOf(id); if (c) return c.n; for (const rows of Object.values(CHARS)) { const r = rows.find(x => Number(x[0]) === Number(id)); if (r) return r[1]; } return "?"; };
const charSeries = id => { const c = charOf(id); if (c) return c.s; for (const [k, rows] of Object.entries(CHARS)) if (rows.some(x => Number(x[0]) === Number(id))) return k; return ""; };
const img = (id, cls) => { const w = el("span", cls), c = charOf(id); if (c && c.img) { const i = new Image(); i.src = c.img; i.alt = ""; i.decoding = "async"; w.appendChild(i); } else w.textContent = charName(id).charAt(0); return w; };
function banner(text, sub, cls) {
    const fx = $("fdFx"); if (!fx) return;
    const b = el("div", "fd-banner " + (cls || "")); b.append(el("b", null, text)); if (sub) b.appendChild(el("small", null, sub));
    fx.appendChild(b); setTimeout(() => b.remove(), 1900);
}
function feedback(msg, kind) {
    const f = $("fdFeedback"); if (!f) return;
    f.textContent = msg; f.className = "fd-feedback show " + (kind || "");
    clearTimeout(f._t); f._t = setTimeout(() => f.classList.remove("show"), 3200);
}
function topBar(w) {
    const top = el("div", "fd-top");
    const rc = el("div", "fd-round"); rc.id = "fdRound";
    const qc = el("div", "fd-qcard"); const k = el("div", "fd-qkick"); k.id = "fdKick"; const q = el("h2", "fd-qtext"); q.id = "fdQ"; qc.append(k, q);
    const tm = el("div", "fd-timer"); tm.id = "fdTimer"; tm.innerHTML = '<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="19"/><circle class="fd-tarc" cx="22" cy="22" r="19"/></svg><b></b>';
    top.append(rc, qc, tm); w.appendChild(top);
}
function setTop(s, kick) {
    $("fdTurnT").textContent = s.phase === "over" ? "FINAL SCORE" : s.sd ? "SUDDEN DEATH" : (s.type === "likely" ? "DUEL " : "ROUND ") + s.round + " / " + s.rounds;
    const rc = $("fdRound"); rc.innerHTML = ""; rc.append(el("small", null, s.sd ? "SUDDEN" : s.type === "likely" ? "DUEL" : "ROUND"), el("b", null, s.sd ? "DEATH" : s.round + "/" + s.rounds));
    $("fdKick").textContent = kick;
    $("fdQ").textContent = qText(qTpl(s), arr(s.series), label);
}

/* =====================================================================
   CLASSIC FEUD: the studio
   ===================================================================== */
function buildStudio() {
    const w = $("fdWrap"); w.innerHTML = ""; w.className = "fd-wrap fd-studio-w";
    topBar(w);
    const mid = el("div", "fd-mid");
    const ta = el("aside", "fd-team fd-a"); ta.id = "fdTeamA";
    const tb = el("aside", "fd-team fd-b"); tb.id = "fdTeamB";
    const bw = el("section", "fd-boardwrap");
    bw.appendChild(el("div", "fd-bulbs")).setAttribute("aria-hidden", "true");
    const meta = el("div", "fd-meta"); meta.innerHTML = '<div class="fd-strikes" id="fdStrikes" aria-label="Strikes"><i></i><i></i><i></i></div><div class="fd-pot"><small>POT</small><b id="fdPot">0</b></div>';
    const board = el("ol", "fd-board"); board.id = "fdBoard";
    bw.append(meta, board);
    mid.append(ta, bw, tb);
    const io = el("div", "fd-io"); io.id = "fdIO";
    const fb = el("p", "fd-feedback"); fb.id = "fdFeedback"; fb.setAttribute("role", "status"); fb.setAttribute("aria-live", "polite");
    w.append(mid, io, fb);
    const fx = el("div", "fd-fx"); fx.id = "fdFx"; fx.setAttribute("aria-hidden", "true"); w.appendChild(fx);
    const sp = el("div", "fd-spots"); sp.setAttribute("aria-hidden", "true"); sp.append(el("i"), el("i"), el("i")); w.prepend(sp);
}
function teamPanel(d, s, k) {
    const p = $("fdTeam" + k); p.innerHTML = "";
    const g = guessTeam(s), pr = presentIn(d), who = actorOf(s, pr), fo = ["buzz", "face", "face2"].includes(s.phase) ? faceOffOf(s, k, pr) : 0;
    const on = g === k || (s.phase === "decide" && s.ctrl === k);
    p.classList.toggle("on", on); p.classList.toggle("mine", myTeam(s) === k);
    p.append(el("div", "fd-tname", TEAM[k].short), el("div", "fd-score", String((s.score || {})[k] || 0)));
    p.querySelector(".fd-score").id = "fdScore" + k;
    const st = s.phase === "decide" && s.ctrl === k ? "IN CONTROL" : g === k ? (s.phase === "steal" ? "STEALING" : s.phase === "play" ? "PLAYING" : "FACE-OFF") : "";
    p.appendChild(el("div", "fd-tstate", st));
    const ul = el("ul", "fd-members");
    arr(s.teams[k]).map(Number).forEach(m => {
        const li = el("li", (m === who && g === k) || m === fo ? "now" : ""); li.dataset.emote = "p" + m;
        if (!pr(m)) li.classList.add("off");
        li.append(X.avatarEl(X.pPub(d, m), { size: 26 }), el("span", null, X.pName(d, m) + (m === X.me() ? " (you)" : "")));
        if (m === who && g === k) li.appendChild(el("em", null, "ANSWERS")); else if (m === fo) li.appendChild(el("em", null, "BUZZER"));
        ul.appendChild(li);
    });
    p.appendChild(ul);
}
function rowEl(s, a, i, revealedBy, over) {
    const li = el("li", "fd-row"); li.dataset.i = i;
    const inner = el("div", "fd-flip"), front = el("div", "fd-front"), back = el("div", "fd-back");
    front.append(el("span", "fd-num", String(i + 1)));
    if (a.c) back.appendChild(img(a.c, "fd-face"));
    const txt = el("span", "fd-ans", a.t);
    if (a.s && a.s !== "any" && arr(s.series).length > 1) txt.appendChild(el("small", null, label(a.s)));
    back.append(txt, el("b", "fd-pts", String(a.p)));
    inner.append(front, back); li.appendChild(inner);
    if (revealedBy) li.classList.add("open", "by-" + revealedBy);
    else if (over) li.classList.add("open", "unclaimed");
    return li;
}
function renderStudio(d, s) {
    const board = stateBoard(LIB, s) || [], g = guessTeam(s), mine = myTeam(s), pr = presentIn(d), who = actorOf(s, pr);
    const status = {
        buzz: () => "Face-off! " + X.pName(d, faceOffOf(s, "A", pr)) + " vs " + X.pName(d, faceOffOf(s, "B", pr)) + ": first to buzz answers.",
        face: () => X.pName(d, who) + " buzzed first for " + TEAM[g].name + ".",
        face2: () => X.pName(d, who) + " answers for " + TEAM[g].name + ": beat it to win control.",
        decide: () => TEAM[s.ctrl].name + " won the face-off: play or pass?",
        play: () => who === X.me() ? "Your answer!" : X.pName(d, who) + " answers for " + TEAM[g].name + (mine === g ? ". Help them out!" : "."),
        steal: () => who === X.me() ? "Your answer: steal the pot!" : TEAM[g].name + " has one answer to steal the pot.",
        reveal: () => "Round over.", over: () => ""
    };
    $("fdStatus").textContent = (status[s.phase] || (() => ""))();
    setTop(s, "CLASSIC FEUD · " + (arr(s.series).length > 1 ? "ANIME MIX" : label(s.series[0]).toUpperCase()) + " · Anime Arcade curated answers");
    teamPanel(d, s, "A"); teamPanel(d, s, "B");
    $("fdStrikes").querySelectorAll("i").forEach((x, i) => x.classList.toggle("on", i < (Number(s.strikes) || 0)));
    $("fdStrikes").classList.toggle("steal", s.phase === "steal");
    if (!$("fdPot").dataset.anim) $("fdPot").textContent = String(s.bank || 0);
    const bEl = $("fdBoard"), over = s.phase === "reveal" || s.phase === "over";
    if (bEl.dataset.k !== s.q.key + ":" + s.round) {
        bEl.dataset.k = s.q.key + ":" + s.round; bEl.innerHTML = "";
        bEl.classList.toggle("two", board.length > 5);
        board.forEach((a, i) => bEl.appendChild(rowEl(s, a, i, (s.rev || {})[i], over)));
    } else board.forEach((a, i) => {
        const li = bEl.children[i]; if (!li) return;
        const by = (s.rev || {})[i];
        if (by && !li.classList.contains("by-" + by)) { li.classList.remove("unclaimed"); li.classList.add("open", "by-" + by); }
        else if (!by && over && !li.classList.contains("open")) setTimeout(() => li.classList.add("open", "unclaimed"), 140 * i);
    });
    renderStudioIO(d, s, who, g, mine);
}
function podium(d, s, k, pr) {
    const p = faceOffOf(s, k, pr), pd = el("div", "fd-podium " + TEAM[k].cls);
    if (s.fb === k) pd.classList.add("first");
    if ((s.phase === "face" || s.phase === "face2") && guessTeam(s) === k) pd.classList.add("answering");
    pd.append(el("div", "fd-pod-team", TEAM[k].short), X.avatarEl(X.pPub(d, p), { size: 56 }), el("b", "fd-pod-name", X.pName(d, p) + (p === X.me() ? " (you)" : "")));
    const lamp = el("div", "fd-pod-lamp"); pd.appendChild(lamp);
    return pd;
}
function renderStudioIO(d, s, who, g, mine) {
    const io = $("fdIO"), pr = presentIn(d), meFace = ["A", "B"].some(k => faceOffOf(s, k, pr) === X.me());
    const meUp = who === X.me() && ["face", "face2", "play", "steal"].includes(s.phase);
    const mode = s.phase === "buzz" ? "buzz" + (meFace ? "-me" : "") : s.phase === "decide" ? "decide" + (mine === s.ctrl ? "-me" : "") : (s.phase === "face" || s.phase === "face2") ? (meUp ? "face-me" : "face") : s.phase === "reveal" ? "reveal" : s.phase === "over" ? "over" : meUp ? "me" : "wait";
    const key = mode + ":" + s.tk + ":" + s.fb;
    if (io.dataset.k === key) return;
    io.dataset.k = key; io.innerHTML = "";
    if (mode === "over") return;
    if (mode === "reveal") {
        const L = arr(s.log)[arr(s.log).length - 1] || {};
        const t = L.win ? TEAM[L.win].name + (L.how === "steal" ? " steals the pot" : L.how === "clear" ? " clears the board" : " keeps the pot") + ": +" + (L.pts || 0) : "Round over";
        io.appendChild(el("div", "fd-result " + (L.win ? TEAM[L.win].cls : ""), t));
        if (X.amHost()) { const b = el("button", "btn ghost", needsQuestion(s) ? "Next question ▶" : "Final score ▶"); b.type = "button"; b.onclick = () => window.fdNext(); io.appendChild(b); }
        else io.appendChild(el("p", "fd-wait", "Next question in a moment…"));
        return;
    }
    // face-off: two podiums, the buzzer in the middle
    if (s.phase === "buzz" || s.phase === "face" || s.phase === "face2") {
        const stage = el("div", "fd-faceoff");
        const midc = el("div", "fd-fo-mid");
        if (s.phase === "buzz") {
            midc.appendChild(el("div", "fd-fo-tag", "FACE-OFF"));
            if (meFace) { const b = el("button", "fd-buzzer", "BUZZ!"); b.type = "button"; b.id = "fdBuzzBtn"; b.onclick = () => window.fdBuzz(); b.setAttribute("aria-label", "Buzz in (space bar)"); midc.append(b, el("small", "fd-fo-hint", "or press SPACE")); }
            else midc.appendChild(el("p", "fd-fo-hint", "Two players at the buzzers. First to buzz answers."));
        } else midc.appendChild(el("div", "fd-fo-tag", s.phase === "face" ? "BUZZED IN!" : "BEAT THAT ANSWER"));
        stage.append(podium(d, s, "A", pr), midc, podium(d, s, "B", pr));
        io.appendChild(stage);
        if (meUp) answerForm(io, s.phase === "face" ? "Your face-off answer…" : "Beat their answer…", "ANSWER");
        return;
    }
    if (s.phase === "decide") {
        const box = el("div", "fd-decide " + TEAM[s.ctrl].cls);
        box.appendChild(el("div", "fd-dec-title", TEAM[s.ctrl].name + " has control"));
        if (mode === "decide-me") {
            const r = el("div", "fd-dec-btns");
            const pl = el("button", "fd-dec play"); pl.type = "button"; pl.append(el("b", null, "PLAY"), el("small", null, "Answer the rest of the board"));
            const pa = el("button", "fd-dec pass"); pa.type = "button"; pa.append(el("b", null, "PASS"), el("small", null, "Make them play, wait for the steal"));
            pl.onclick = () => { pl.disabled = pa.disabled = true; window.fdDecide(true); };
            pa.onclick = () => { pl.disabled = pa.disabled = true; window.fdDecide(false); };
            r.append(pl, pa); box.appendChild(r);
        } else box.appendChild(el("p", "fd-wait", TEAM[s.ctrl].name + " is deciding: play or pass…"));
        io.appendChild(box); return;
    }
    if (mode === "wait") {
        io.appendChild(el("p", "fd-wait", mine === g ? "Your team is up: " + X.pName(d, who) + " answers. Talk it through!" : mine ? (s.phase === "steal" ? TEAM[g].name + " is trying to steal your pot…" : TEAM[g].name + " is answering. Get ready to steal.") : "Watching: " + TEAM[g].name + " is answering."));
        return;
    }
    answerForm(io, s.phase === "steal" ? "One answer to steal the pot…" : "Type your answer…", s.phase === "steal" ? "STEAL" : "ANSWER");
}
function answerForm(io, ph, btn) {
    const f = el("form", "fd-form"); f.onsubmit = e => { e.preventDefault(); window.fdSubmit(); };
    const inp = el("input", "fd-input"); inp.id = "fdInput"; inp.type = "text"; inp.autocomplete = "off"; inp.maxLength = 60; inp.placeholder = ph; inp.setAttribute("aria-label", "Your answer");
    const b = el("button", "btn", btn); b.type = "submit";
    f.append(inp, b); io.appendChild(f);
    setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 40);
}
async function submitText() {
    const s = (X.data() || {}).feud, inp = $("fdInput"); if (!s || !inp) return;
    const v = inp.value.trim(); if (!v) { feedback("Type an answer first.", "warn"); return; }
    inp.disabled = true;
    const ok = await move({ k: "guess", tk: s.tk, text: v });
    if ($("fdInput")) { $("fdInput").disabled = false; if (ok === false) try { $("fdInput").focus(); $("fdInput").select(); } catch (e) {} }
}
function studioEvent(d, s, ev) {
    const name = p => X.pName(d, Number(p)), board = stateBoard(LIB, s) || [];
    if (ev.k === "buzz") {
        X.sfx("slam"); banner(ev.auto ? "TIME!" : "BUZZ!", ev.auto ? "Nobody buzzed: " + TEAM[ev.team].name + " answers first" : name(ev.by) + " for " + TEAM[ev.team].name, TEAM[ev.team].cls);
    } else if (ev.k === "hit") {
        const li = $("fdBoard").children[ev.i], a = board[ev.i]; if (!li || !a) return;
        X.sfx(ev.top ? "levelup" : "reveal"); li.classList.add("pop"); setTimeout(() => li.classList.remove("pop"), 900);
        const r = li.getBoundingClientRect(); X.burstText("+" + a.p, r.left + r.width - 30, r.top + r.height / 2, ev.team === "A" ? "#ff5050" : "#f0c869");
        const pot = $("fdPot"); pot.dataset.anim = "1"; X.countUp(pot, Math.max(0, (s.bank || 0) - a.p), s.bank || 0, 600); setTimeout(() => { delete pot.dataset.anim; }, 650);
        if (ev.top) banner("TOP ANSWER!", a.t, TEAM[ev.team].cls);
        feedback(name(ev.by) + ": " + a.t + "! +" + a.p + (ev.face && !ev.top ? " (#" + (ev.i + 1) + " on the board)" : ""), "hit");
    } else if (ev.k === "miss") {
        X.sfx("strike");
        const fx = $("fdFx"), big = el("div", "fd-bigx"); big.textContent = "✕".repeat(ev.face ? 1 : Math.max(1, ev.strikes || 1)); fx.appendChild(big); setTimeout(() => big.remove(), 1100);
        X.shake($("fdBoard"), 9, 360);
        feedback(ev.timeout ? name(ev.by) + " ran out of time." : name(ev.by) + ": \"" + (ev.said || "?") + "\" isn't on the board.", "miss");
    } else if (ev.k === "control") {
        X.sfx("turn"); if (ev.why !== "top") banner("CONTROL!", TEAM[ev.team].name + " had the higher answer", TEAM[ev.team].cls);
    } else if (ev.k === "decide") {
        X.sfx("whoosh"); banner(ev.play ? "PLAY!" : "PASS!", ev.play ? TEAM[ev.team].name + " plays the board" : TEAM[other(ev.team)].name + " has to play it", TEAM[ev.play ? ev.team : other(ev.team)].cls);
    } else if (ev.k === "refaceoff") {
        X.sfx("skip"); banner("NOBODY SCORED", "Next pair to the buzzers!", "");
    } else if (ev.k === "steal") {
        X.sfx("whoosh"); banner("STEAL!", TEAM[ev.team].name + " gets one answer to take " + (ev.bank || 0) + " points", TEAM[ev.team].cls);
    } else if (ev.k === "round") {
        X.sfx("turn"); banner(ev.sd ? "SUDDEN DEATH" : "ROUND " + ev.round, "Face-off to the buzzers!", "");
    } else if (ev.k === "end") {
        if (ev.pts) { const sc = $("fdScore" + ev.win); if (sc) X.countUp(sc, Math.max(0, (s.score[ev.win] || 0) - ev.pts), s.score[ev.win] || 0, 900); }
        X.sfx(myTeam(s) && myTeam(s) === ev.win ? "win" : "xp");
        banner(ev.how === "steal" ? "STOLEN!" : ev.how === "clear" ? "BOARD CLEARED!" : "POT DEFENDED", TEAM[ev.win].name + " +" + (ev.pts || 0), TEAM[ev.win].cls);
    }
}

/* =====================================================================
   MOST LIKELY: the duel (light theme)
   ===================================================================== */
function buildDuel() {
    const w = $("fdWrap"); w.innerHTML = ""; w.className = "fd-wrap fd-duel";
    const deco = el("div", "fd-petals"); deco.setAttribute("aria-hidden", "true"); for (let i = 0; i < 14; i++) { const p = el("i"); p.style.setProperty("--i", i); deco.appendChild(p); } w.appendChild(deco);
    topBar(w);
    const sb = el("div", "fd-dscore"); sb.id = "fdDScore"; w.appendChild(sb);
    const arena = el("div", "fd-arena"); arena.id = "fdArena";
    ["a", "b"].forEach((k, i) => {
        const c = el("button", "fd-dcard"); c.type = "button"; c.id = "fdCard" + k; c.dataset.k = k;
        c.onclick = () => window.fdVote(k);
        const frame = el("div", "fd-dframe"); frame.append(el("span", "fd-dportrait"), el("i", "fd-dcorner tl"), el("i", "fd-dcorner tr"), el("i", "fd-dcorner bl"), el("i", "fd-dcorner br"));
        const rib = el("div", "fd-dribbon"); rib.append(el("b", "fd-dname"), el("small", "fd-dseries"));
        c.append(frame, rib, el("div", "fd-dvotes"), el("div", "fd-dstamp", "MOST LIKELY!"), el("div", "fd-dteams"));
        arena.appendChild(c);
        if (i === 0) { const vs = el("div", "fd-vs"); vs.append(el("b", null, "OR"), el("small", "fd-worth")); arena.appendChild(vs); }
    });
    w.appendChild(arena);
    const fb = el("p", "fd-feedback"); fb.id = "fdFeedback"; fb.setAttribute("role", "status"); fb.setAttribute("aria-live", "polite");
    const io = el("div", "fd-io"); io.id = "fdIO";
    w.append(io, fb);
    const fx = el("div", "fd-fx"); fx.id = "fdFx"; fx.setAttribute("aria-hidden", "true"); w.appendChild(fx);
}
function renderDuel(d, s) {
    const mine = myTeam(s), du = s.duel || {}, res = s.phase === "reveal" || s.phase === "over";
    const L = res ? arr(s.log)[arr(s.log).length - 1] || {} : null;
    $("fdStatus").textContent = s.phase === "vote" ? (mine ? "Vote with your team: who is more likely?" : "Both teams are voting…") : s.phase === "reveal" ? "The answer is in!" : "";
    setTop(s, "MOST LIKELY · " + (arr(s.series).length > 1 ? "ANIME MIX" : label(s.series[0]).toUpperCase()) + " · Anime Arcade curated answers");
    // scores
    const sb = $("fdDScore"); sb.innerHTML = "";
    ["A", "B"].forEach(k => {
        const t = el("div", "fd-dteam " + TEAM[k].cls + (mine === k ? " mine" : ""));
        const sc = el("b", "fd-dts", String((s.score || {})[k] || 0)); sc.id = "fdScore" + k;
        t.append(el("span", "fd-dtn", TEAM[k].short), sc);
        const m = el("div", "fd-dtm");
        arr(s.teams[k]).map(Number).forEach(p => { const a = el("span", "fd-dav" + ((s.votes || {})["p" + p] ? " voted" : "") + (presentIn(d)(p) ? "" : " off")); a.dataset.emote = "p" + p; a.title = X.pName(d, p); a.appendChild(X.avatarEl(X.pPub(d, p), { size: 28 })); m.appendChild(a); });
        t.appendChild(m); sb.appendChild(t);
        if (k === "A") sb.appendChild(el("span", "fd-dheart", "♥"));
    });
    // the two cards (rebuilt when the duel changes)
    const arena = $("fdArena"), key = s.round + ":" + du.a + ":" + du.b;
    if (arena.dataset.k !== key) {
        arena.dataset.k = key; myVote = arr((s.votes || {})["p" + X.me()])[0] || "";
        ["a", "b"].forEach(k => {
            const c = $("fdCard" + k), id = du[k];
            c.className = "fd-dcard"; c.disabled = false;
            const pt = c.querySelector(".fd-dportrait"); pt.innerHTML = ""; pt.appendChild(img(id, "fd-dimg"));
            c.querySelector(".fd-dname").textContent = charName(id);
            c.querySelector(".fd-dseries").textContent = label(charSeries(id));
            c.setAttribute("aria-label", "Vote for " + charName(id));
            if (X.motionOK() && c.animate) c.animate([{ opacity: 0, transform: "translateY(26px) scale(.94) rotate(" + (k === "a" ? -3 : 3) + "deg)" }, { opacity: 1, transform: "none" }], { duration: 520, delay: k === "a" ? 0 : 120, easing: "cubic-bezier(.2,1.3,.4,1)", fill: "backwards" });
        });
        arena.querySelector(".fd-worth").textContent = du.pts >= 30 ? "Photo finish · " + du.pts + " pts" : du.pts >= 20 ? "Close call · " + du.pts + " pts" : du.pts + " pts";
    }
    arena.classList.toggle("res", res); arena.classList.toggle("voting", s.phase === "vote");
    renderDuelVotes(d, s);
    if (res && L) ["a", "b"].forEach(k => {
        const c = $("fdCard" + k); c.disabled = true;
        c.classList.toggle("win", L.w === k); c.classList.toggle("lose", L.w !== k);
        const tb = c.querySelector(".fd-dteams"); tb.innerHTML = "";
        ["A", "B"].forEach(t => { if ((L.picks || {})[t] === k) tb.appendChild(el("span", TEAM[t].cls, TEAM[t].short + (L.w === k ? " +" + L.pts : ""))); });
    });
    // under the cards
    const io = $("fdIO"), mode = s.phase + ":" + s.tk;
    if (io.dataset.k !== mode) {
        io.dataset.k = mode; io.innerHTML = "";
        if (s.phase === "vote") io.appendChild(el("p", "fd-wait soft", mine ? "Tap a card to vote. You can change your mind until everyone has voted." : "You're watching: both teams vote at the same time."));
        if (s.phase === "reveal" && L) {
            const g = L.gain || {}, txt = g.A && g.B ? "Both teams got it! +" + L.pts + " each" : g.A ? TEAM.A.name + " got it! +" + L.pts : g.B ? TEAM.B.name + " got it! +" + L.pts : "Nobody picked " + charName(L[L.w]) + ". No points.";
            io.appendChild(el("div", "fd-dresult", txt));
            if (X.amHost()) { const b = el("button", "btn ghost", needsQuestion(s) ? "Next duel ▶" : "Final score ▶"); b.type = "button"; b.onclick = () => window.fdNext(); io.appendChild(b); }
        }
    }
}
// my vote, my teammates' votes (only my own team's are shown before the reveal), the other team's progress
function renderDuelVotes(d, s) {
    const mine = myTeam(s), res = s.phase !== "vote";
    if (!res && mine && (s.votes || {})["p" + X.me()]) myVote = arr(s.votes["p" + X.me()])[0];
    ["a", "b"].forEach(k => {
        const c = $("fdCard" + k); if (!c) return;
        c.classList.toggle("picked", !res && myVote === k);
        c.disabled = res || !mine;
        const box = c.querySelector(".fd-dvotes"); box.innerHTML = "";
        arr(s.teams.A).concat(arr(s.teams.B)).map(Number).forEach(p => {
            const v = arr((s.votes || {})["p" + p])[0], t = arr(s.teams.A).map(Number).includes(p) ? "A" : "B";
            if (v !== k || (!res && t !== mine)) return;
            const dot = el("span", "fd-dvote " + TEAM[t].cls); dot.title = X.pName(d, p); dot.appendChild(X.avatarEl(X.pPub(d, p), { size: 22 })); box.appendChild(dot);
        });
        if (!res && mine && myVote === k) box.appendChild(el("em", "fd-dyou", "YOUR VOTE"));
    });
}
function duelEvent(d, s, ev) {
    if (ev.k === "duel") { X.sfx("open"); banner(ev.sd ? "SUDDEN DEATH" : "DUEL " + ev.round, "Who is more likely?", "soft"); }
    else if (ev.k === "vote") { if (Number(ev.by) !== X.me()) X.sfx("tick"); }
    else if (ev.k === "result") {
        const mine = myTeam(s), g = ev.gain || {}, c = $("fdCard" + ev.w);
        X.sfx(mine && g[mine] ? "win" : "reveal");
        if (c) { const r = c.getBoundingClientRect(); X.burstText("♥", r.left + r.width / 2, r.top + r.height * .35, "#ff7aa8"); hearts(c); }
        ["A", "B"].forEach(t => { if (g[t]) { const sc = $("fdScore" + t); if (sc) X.countUp(sc, Math.max(0, (s.score[t] || 0) - g[t]), s.score[t] || 0, 800); } });
    }
}
function hearts(card) {
    if (!X.motionOK()) return;
    const r = card.getBoundingClientRect(), fx = $("fdFx");
    for (let i = 0; i < 16; i++) {
        const h = el("i", "fd-heart", ["♥", "✦", "♥", "✧"][i % 4]);
        h.style.left = (r.left + r.width * (.15 + Math.random() * .7)) + "px"; h.style.top = (r.top + r.height * (.3 + Math.random() * .5)) + "px";
        h.style.setProperty("--dx", ((Math.random() - .5) * 160).toFixed(0) + "px"); h.style.setProperty("--d", (Math.random() * .4).toFixed(2) + "s");
        fx.appendChild(h); setTimeout(() => h.remove(), 1700);
    }
}

/* the countdown: drawn from the shared deadline (server time), so every screen shows the same second */
function timerLoop() {
    if (tickT) return;
    tickT = setInterval(() => {
        const d2 = X.data(), s = d2 && d2.feud, t = $("fdTimer");
        if (!s || !t || d2.gameType !== "feud") { clearInterval(tickT); tickT = 0; return; }
        const live = !!Number(s.dl) && !["reveal", "over"].includes(s.phase);
        t.classList.toggle("off", !live);
        if (!live) { t.querySelector("b").textContent = ""; return; }
        const total = s.phase === "buzz" ? R.buzzMs : s.phase === "decide" ? R.decideMs : s.timer * 1000;
        const left = Math.max(0, Number(s.dl) - srvNow()), sec = Math.ceil(left / 1000), frac = Math.min(1, left / total);
        t.querySelector("b").textContent = String(sec);
        t.querySelector(".fd-tarc").style.strokeDashoffset = String(119.4 * (1 - frac));
        t.classList.toggle("low", sec <= 5);
        const mineUp = s.type === "likely" ? !!myTeam(s) && !(s.votes || {})["p" + X.me()] : myTeam(s) && (myTeam(s) === guessTeam(s) || (s.phase === "decide" && myTeam(s) === s.ctrl));
        if (sec <= 5 && sec > 0 && sec !== lastTick && mineUp) { lastTick = sec; X.sfx("tick"); }
    }, 200);
}

/* ---------------- the end ---------------- */
function showOver(d, s) {
    const old = $("fdOver"); if (old) old.remove();
    const likely = s.type === "likely";
    const o = el("div", "fd-over" + (likely ? " light" : "")); o.id = "fdOver"; o.setAttribute("role", "dialog"); o.setAttribute("aria-label", "Final score");
    const win = s.winner, card = el("div", "fd-ocard " + (win ? TEAM[win].cls : "draw"));
    card.appendChild(el("div", "fd-okick", s.why === "out" ? "OUT OF QUESTIONS · FINAL SCORE" : "FINAL SCORE"));
    card.appendChild(el("h2", "fd-otitle", win ? TEAM[win].name.toUpperCase() + " WINS!" : "IT'S A DRAW!"));
    const sc = el("div", "fd-oscore");
    ["A", "B"].forEach(k => {
        const c = el("div", "fd-ot " + TEAM[k].cls + (win === k ? " won" : ""));
        c.append(el("b", null, TEAM[k].short), el("strong", null, "0"));
        const m = el("div", "fd-om"); arr(s.teams[k]).map(Number).forEach(p => { const x = el("span"); x.append(X.avatarEl(X.pPub(d, p), { size: 22 }), el("i", null, X.pName(d, p))); m.appendChild(x); });
        c.appendChild(m); sc.appendChild(c);
        setTimeout(() => X.countUp(c.querySelector("strong"), 0, s.score[k] || 0, 1100), 250);
    });
    card.appendChild(sc);
    const rl = el("ol", "fd-orounds");
    arr(s.log).forEach(L => {
        const li = el("li"), q = LIB.questions.find(x => x.questionId === L.id);
        li.append(el("span", "fd-orn", L.sd ? "SD" : String(L.r)), el("span", "fd-orq", q ? qText(q.questionText, arr(s.series), label) : L.id));
        const chips = el("div", "fd-ochips");
        if (likely) {
            const g = L.gain || {};
            li.appendChild(el("span", "fd-orw " + (g.A && g.B ? "both" : g.A ? "fd-a" : g.B ? "fd-b" : ""), g.A && g.B ? "BOTH +" + L.pts : g.A ? "CRIMSON +" + L.pts : g.B ? "GOLD +" + L.pts : "—"));
            ["a", "b"].forEach(k => { const tags = ["A", "B"].filter(t => (L.picks || {})[t] === k).map(t => TEAM[t].short).join(" & "); chips.appendChild(el("span", L.w === k ? "win" : "", (L.w === k ? "♥ " : "") + charName(L[k]) + (tags ? " · " + tags : ""))); });
        } else {
            const board = stateBoard(LIB, { q: { id: L.id }, series: s.series }) || [];
            li.appendChild(el("span", "fd-orw " + (L.win ? TEAM[L.win].cls : ""), (L.win ? TEAM[L.win].short : "—") + " +" + L.pts + (L.how === "steal" ? " (steal)" : L.how === "clear" ? " (clear)" : "")));
            board.forEach((a, i) => { const by = (L.rev || {})[i]; chips.appendChild(el("span", by ? "by-" + by : "", a.t + " " + a.p)); });
        }
        li.appendChild(chips); rl.appendChild(li);
    });
    card.appendChild(rl);
    card.appendChild(el("p", "fd-onote", likely ? "The more likely character is our editors' pick (Anime Arcade curated rankings), not a survey result." : "Boards are Anime Arcade curated answers, ranked by our editors, not survey results."));
    const btns = el("div", "fd-obtns");
    if (X.amHost()) { const a = el("button", "btn xl", "Rematch"); a.onclick = () => window.fdAgain(); const b = el("button", "btn ghost", "Back to lobby"); b.onclick = () => window.fdLobby(); btns.append(a, b); }
    else btns.appendChild(el("p", "fd-wait", "Waiting for " + X.pName(d, X.hostSlot(d)) + " to start a rematch or go back to the lobby."));
    card.appendChild(btns);
    o.appendChild(card); document.body.appendChild(o);
    const mt = myTeam(s);
    X.sfx(win && mt === win ? "win" : win && mt ? "lose" : "reveal");
    if (win && X.motionOK()) confetti(o, likely ? ["#ff9ec4", "#ffd6a5", "#bde0fe", "#fff"] : win === "A" ? ["#ff3b3b", "#ffd36b", "#fff"] : ["#f0c869", "#fff4d6", "#ff5050"]);
    setTimeout(() => { const f = o.querySelector("button"); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }, 60);
}
function confetti(host, cols) {
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
