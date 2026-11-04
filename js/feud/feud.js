/* =====================================================================
   ANIME FEUD (sixth mode): screen, lobby panel, Firebase sync, question history.
   Rules and rotation live in engine.js (pure, tested in Node). js/game.js only routes here.

   Firebase layout (everything under rooms/<code>, the only path the current rules allow):
     feud            the match: teams, scores, round, the question's ID, revealed slots, strikes, turn key, deadline.
                     The answers themselves are never written: every client rebuilds the board from the shared library.
     feudHist/p<N>   that player's recent question history ({ u: uid, h: { "<qid>@<scope>": [lastSeen, times] } }),
                     shared so the host can pick what is fresh for the whole room.
   Every move runs in a transaction on rooms/<code>/feud and is checked there (turn key, phase, guesser), so double
   submits, two players clicking at once and a host + a guest both advancing can never both apply.
   ===================================================================== */
import { CHARS } from "../draft/data.js?v=2";
import { NICKNAMES } from "./nicknames.js?v=1";
import { PACKS } from "./packs/index.js?v=1";
import { FEUD_RULES as R, buildLibrary, eligible, poolInfo, pickQuestion, stateBoard, qText, newMatch, act, actorOf, advance, needsQuestion,
    balanceTeams, remember, trimHist, guessTeam, other, norm, scopeOf } from "./engine.js?v=1";

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
const fRounds = d => R.roundChoices.includes(Number(d && d.feudRounds)) ? Number(d.feudRounds) : R.rounds;
const fTimer = d => R.timerChoices.includes(Number(d && d.feudTimer)) ? Number(d.feudTimer) : R.timer;
const fSeries = d => arr(d && d.animes).filter(k => CHARS[k]);
export const feudPrefs = p => ({ feudType: p.feudType === "likely" ? "likely" : "classic", feudRounds: R.roundChoices.includes(Number(p.feudRounds)) ? Number(p.feudRounds) : R.rounds, feudTimer: R.timerChoices.includes(Number(p.feudTimer)) ? Number(p.feudTimer) : R.timer });
export const feudPrefsOf = d => ({ feudType: fType(d), feudRounds: fRounds(d), feudTimer: fTimer(d) });

/* ---------------- question history (per Firebase anonymous identity) ----------------
   Kept in this browser (localStorage, keyed by the anonymous uid, so it survives normal sessions), mirrored into the
   room so the host sees everyone's, and also into feudHistory/<uid> when the database rules allow it (they currently
   don't: see README). No cross-device history: there is no account linking. */
const HKEY = () => "aa_feud_hist_v1:" + (X && X.uid() || "anon");
function loadHist() { try { return trimHist(JSON.parse(localStorage.getItem(HKEY()) || "{}") || {}); } catch (e) { return {}; } }
function saveHist(h) { try { localStorage.setItem(HKEY(), JSON.stringify(h)); } catch (e) {} }
let histSig = "", pubKey = "";
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

/* ---------------- init ---------------- */
export function initFeud(ctx) {
    X = ctx;
    X.onValue(X.ref(X.db, ".info/serverTimeOffset"), s => { offset = Number(s.val()) || 0; });
    X.draftDb().then(db => { DB = db; const d = X.data(); if (d && d.gameType === "feud" && d.feud && d.status !== "waiting") showFeud(d); }).catch(() => {});
    Object.assign(window, {
        setFeudOpt(k, v) {
            const d = X.data(); if (!d || !X.amHost() || d.status !== "waiting") return;
            X.sfx("pick");
            if (k === "type") X.lobbySet({ feudType: v === "likely" ? "likely" : "classic" });
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
        fdLock: () => lockPick(),
        fdNext: () => hostAdvance(true),
        fdAgain: () => feudStart(true),
        fdLobby: () => X.backToLobby(true)
    });
}

/* ---------------- lobby ---------------- */
export function teamsOf(d) { return balanceTeams(X.activeSlots(d), d.feudTeams || {}); }
export function feudHint(d) {
    const n = fSeries(d).length;
    return n === 1 ? "Single anime: questions written for " + label(fSeries(d)[0]) + "." : n > 1 ? "Anime Mix: crossover questions, answers only from the " + n + " series you tick." : "Tick one series for its own questions, or several for an Anime Mix.";
}
export function feudReq(d) {
    const series = fSeries(d), act = X.activeSlots(d), T = teamsOf(d), type = fType(d), rounds = fRounds(d);
    if (!series.length) return { ok: false, msg: "Tick at least one series." };
    if (!T.A.length || !T.B.length) return { ok: false, msg: "Both teams need at least one player. Tap a player to move them." };
    const p = poolInfo(LIB, type, series), name = type === "likely" ? "Most Likely" : "Classic Feud", what = series.length === 1 ? label(series[0]) + " on its own" : "this mix";
    if (p.boards < rounds) {
        const fewer = R.roundChoices.filter(r => r <= p.boards).pop();
        return { ok: false, msg: p.boards ? name + " has " + p.boards + " questions for " + what + ", not enough for " + rounds + " rounds. " + (fewer ? "Pick " + fewer + " rounds or tick" : "Tick") + " another series." : name + " has no questions for " + what + " yet. Tick another series or switch game type." };
    }
    return { ok: true, msg: "Anime Feud · " + name + " · " + (series.length === 1 ? "Single anime" : "Anime Mix") + " · " + rounds + " rounds · " + T.A.length + " vs " + T.B.length };
}
export function feudLobby(d, lock) {
    const type = fType(d), series = fSeries(d);
    document.querySelectorAll(".fd-type").forEach(b => { b.classList.toggle("selected", b.dataset.k === type); b.disabled = lock; b.setAttribute("aria-pressed", String(b.dataset.k === type)); });
    document.querySelectorAll(".fdrbtn").forEach(b => { b.classList.toggle("selected", Number(b.dataset.k) === fRounds(d)); b.disabled = lock; });
    document.querySelectorAll(".fdtbtn").forEach(b => { b.classList.toggle("selected", Number(b.dataset.k) === fTimer(d)); b.disabled = lock; });
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
    $("fdHint").textContent = type === "likely" ? "Most Likely: pick characters from the ticked series. Find the ones on the hidden board." : "Classic Feud: type answers. Spelling slips and nicknames are accepted.";
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
        const q = pickQuestion(eligible(LIB, type, series), { hists: roomHists(d, players), now, lib: LIB });
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
async function move(a) {
    if (busy) return false; busy = true;
    let err = null;
    try {
        await X.runTransaction(X.ref(X.db, "rooms/" + X.room() + "/feud"), cur => {
            if (!cur) return cur;
            err = act(cur, Object.assign({ by: X.me() }, a), { board: stateBoard(LIB, cur), present: presentIn(X.data()), now: srvNow() });
            return err ? undefined : cur;
        });
    } catch (e) { console.error(e); err = "Couldn't send that answer. Try again."; }
    busy = false;
    if (err && err !== "stale") { feedback(err, "warn"); X.sfx("toggle"); return false; }
    return !err;
}

/* ---------------- host duties: the clock, the next round, players who left ---------------- */
let dutyT = 0, dutyKey = "", goneKey = "";
export function feudDuties(d) {
    const s = d.feud; if (!s || s.phase === "over") return;
    const gone = ["A", "B"].find(k => !arr(s.teams[k]).some(p => d["player" + p] && !d["player" + p].left));
    if (gone) { const k = "g" + s.mid; if (goneKey !== k) { goneKey = k; X.toast(TEAM[gone].name + " left. Back to the lobby."); X.backToLobby(true); } return; }
    const key = s.mid + ":" + s.tk + ":" + s.phase;
    if (dutyKey === key) return;
    dutyKey = key; clearTimeout(dutyT);
    if (s.phase === "play" || s.phase === "steal") {
        dutyT = setTimeout(() => {
            if (!X.amHost()) return;
            X.runTransaction(X.ref(X.db, "rooms/" + X.room() + "/feud"), cur => {
                if (!cur || cur.mid !== s.mid || cur.tk !== s.tk) return;
                return act(cur, { k: "timeout", tk: cur.tk }, { board: stateBoard(LIB, cur), now: srvNow() }) ? undefined : cur;
            }).catch(e => console.error(e));
        }, Math.max(0, Number(s.dl) - srvNow()) + R.graceMs);
    } else if (s.phase === "reveal") dutyT = setTimeout(() => hostAdvance(false), Math.max(0, Number(s.nx) - srvNow()));
}
async function hostAdvance(manual) {
    const d = X.data(), s = d && d.feud; if (!s || s.phase !== "reveal" || !X.amHost()) return;
    if (manual) X.sfx("click");
    const c = needsQuestion(s) ? pickQuestion(eligible(LIB, s.type, arr(s.series)), { hists: roomHists(d, feudSeats(d)), used: s.used, now: srvNow(), lib: LIB }) : null;
    try {
        await X.runTransaction(X.ref(X.db, "rooms/" + X.room() + "/feud"), cur => {
            if (!cur || cur.mid !== s.mid) return;
            return advance(cur, s.round, c, srvNow()) ? undefined : cur;
        });
    } catch (e) { console.error(e); }
}

/* ---------------- screen ---------------- */
let seen = { mid: 0, evn: -1, round: 0 }, built = "", tickT = 0, overShown = 0, pick = 0, lastTick = -1, verWarned = 0;
export function feudReset() {
    clearInterval(tickT); tickT = 0; clearTimeout(dutyT); dutyKey = ""; seen = { mid: 0, evn: -1, round: 0 }; built = ""; overShown = 0; pick = 0;
    const o = $("fdOver"); if (o) o.remove();
}
export function showFeud(d) {
    X.showOnly("feud");
    const s = d.feud; if (!s) return;
    if (s.lv && s.lv !== LIB.version && verWarned !== s.mid) { verWarned = s.mid; X.toast("The host has a different question library. Reload the page if boards look wrong."); }
    render(d, s);
}
const myTeam = s => ["A", "B"].find(k => arr(s.teams[k]).map(Number).includes(X.me())) || "";
const qTpl = s => (LIB.questions.find(q => q.questionId === (s.q || {}).id) || {}).questionText || "";
const charOf = id => { const c = DB && DB[id]; return c || null; };

function build() {
    const w = $("fdWrap"); w.innerHTML = "";
    const top = el("div", "fd-top");
    const rc = el("div", "fd-round"); rc.id = "fdRound";
    const qc = el("div", "fd-qcard"); qc.append(el("div", "fd-qkick", ""), el("h2", "fd-qtext", ""));
    qc.querySelector(".fd-qkick").id = "fdKick"; qc.querySelector(".fd-qtext").id = "fdQ";
    const tm = el("div", "fd-timer"); tm.id = "fdTimer"; tm.innerHTML = '<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="19"/><circle class="fd-tarc" cx="22" cy="22" r="19"/></svg><b></b>';
    top.append(rc, qc, tm);
    const mid = el("div", "fd-mid");
    const ta = el("aside", "fd-team fd-a"); ta.id = "fdTeamA";
    const tb = el("aside", "fd-team fd-b"); tb.id = "fdTeamB";
    const bw = el("section", "fd-boardwrap");
    const meta = el("div", "fd-meta"); meta.innerHTML = '<div class="fd-strikes" id="fdStrikes" aria-label="Strikes"><i></i><i></i><i></i></div><div class="fd-pot"><small>POT</small><b id="fdPot">0</b></div>';
    const board = el("ol", "fd-board"); board.id = "fdBoard";
    bw.append(meta, board);
    mid.append(ta, bw, tb);
    const io = el("div", "fd-io"); io.id = "fdIO";
    const fb = el("p", "fd-feedback"); fb.id = "fdFeedback"; fb.setAttribute("role", "status"); fb.setAttribute("aria-live", "polite");
    w.append(top, mid, io, fb);
    const fx = el("div", "fd-fx"); fx.id = "fdFx"; fx.setAttribute("aria-hidden", "true"); w.appendChild(fx);
}
function teamPanel(d, s, k) {
    const p = $("fdTeam" + k); p.innerHTML = "";
    const g = guessTeam(s), who = actorOf(s, presentIn(d));
    p.classList.toggle("on", g === k); p.classList.toggle("mine", myTeam(s) === k);
    p.append(el("div", "fd-tname", TEAM[k].short), el("div", "fd-score", String((s.score || {})[k] || 0)));
    p.querySelector(".fd-score").id = "fdScore" + k;
    const st = g === k ? (s.phase === "steal" ? "STEALING" : "ANSWERING") : "";
    p.appendChild(el("div", "fd-tstate", st));
    const ul = el("ul", "fd-members");
    arr(s.teams[k]).map(Number).forEach(m => {
        const li = el("li", m === who && g === k ? "now" : ""); li.dataset.emote = "p" + m;
        const off = !presentIn(d)(m);
        if (off) li.classList.add("off");
        li.append(X.avatarEl(X.pPub(d, m), { size: 26 }), el("span", null, X.pName(d, m) + (m === X.me() ? " (you)" : "")));
        if (m === who && g === k) li.appendChild(el("em", null, "ANSWERS"));
        ul.appendChild(li);
    });
    p.appendChild(ul);
}
function rowEl(s, a, i, revealedBy, over) {
    const li = el("li", "fd-row"); li.dataset.i = i;
    const inner = el("div", "fd-flip"), front = el("div", "fd-front"), back = el("div", "fd-back");
    front.append(el("span", "fd-num", String(i + 1)));
    if (a.c) { const c = charOf(a.c); const im = el("span", "fd-face"); if (c && c.img) { const img = new Image(); img.src = c.img; img.alt = ""; img.loading = "lazy"; im.appendChild(img); } else im.textContent = a.t.charAt(0); back.appendChild(im); }
    const txt = el("span", "fd-ans", a.t);
    if (a.s && a.s !== "any" && arr(s.series).length > 1) txt.appendChild(el("small", null, label(a.s)));
    back.append(txt, el("b", "fd-pts", String(a.p)));
    inner.append(front, back); li.appendChild(inner);
    if (revealedBy) { li.classList.add("open", "by-" + revealedBy); }
    else if (over) li.classList.add("open", "unclaimed");
    return li;
}
function render(d, s) {
    if (built !== String(s.mid)) { build(); built = String(s.mid); seen = { mid: s.mid, evn: -1, round: 0 }; pick = 0; }
    const board = stateBoard(LIB, s) || [], g = guessTeam(s), mine = myTeam(s), who = actorOf(s, presentIn(d)), meUp = who === X.me() && (s.phase === "play" || s.phase === "steal");
    // header
    $("fdTurnT").textContent = s.phase === "over" ? "FINAL SCORE" : s.sd ? "SUDDEN DEATH" : "ROUND " + s.round + " / " + s.rounds;
    $("fdStatus").textContent = s.phase === "play" || s.phase === "steal" ? (meUp ? "Your answer!" : X.pName(d, who) + " answers for " + TEAM[g].name + (mine === g ? ". Help them out!" : ".")) : s.phase === "reveal" ? "Round over." : s.phase === "over" ? "" : "";
    $("fdRound").innerHTML = ""; $("fdRound").append(el("small", null, s.sd ? "SUDDEN" : "ROUND"), el("b", null, s.sd ? "DEATH" : s.round + "/" + s.rounds));
    $("fdKick").textContent = (s.type === "likely" ? "MOST LIKELY" : "CLASSIC FEUD") + " · " + (arr(s.series).length > 1 ? "ANIME MIX" : label(s.series[0]).toUpperCase()) + " · Anime Arcade curated answers";
    $("fdQ").textContent = qText(qTpl(s), arr(s.series), label);
    teamPanel(d, s, "A"); teamPanel(d, s, "B");
    // strikes + pot
    $("fdStrikes").querySelectorAll("i").forEach((x, i) => x.classList.toggle("on", i < (Number(s.strikes) || 0)));
    $("fdStrikes").classList.toggle("steal", s.phase === "steal");
    if (!$("fdPot").dataset.anim) $("fdPot").textContent = String(s.bank || 0);
    // board (rebuilt when the round changes, rows opened in place otherwise)
    const bEl = $("fdBoard"), over = s.phase === "reveal" || s.phase === "over";
    if (bEl.dataset.k !== s.q.key + ":" + s.round) {
        bEl.dataset.k = s.q.key + ":" + s.round; bEl.innerHTML = "";
        bEl.classList.toggle("two", board.length > 5);
        board.forEach((a, i) => bEl.appendChild(rowEl(s, a, i, (s.rev || {})[i], over)));
    } else board.forEach((a, i) => {
        const li = bEl.children[i]; if (!li) return;
        const by = (s.rev || {})[i];
        if (by && !li.classList.contains("by-" + by)) { li.classList.remove("unclaimed"); li.classList.add("open", "by-" + by); }
        else if (!by && over && !li.classList.contains("open")) { setTimeout(() => li.classList.add("open", "unclaimed"), 140 * i); }
    });
    // input
    renderIO(d, s, board, meUp, g, who, mine);
    timerLoop(d);
    // events + history
    if (s.q && (s.phase === "play" || s.phase === "steal" || s.phase === "reveal") && feudSeats(d).includes(X.me())) recordSeen(s.q.key, s.q.at);
    const firstPaint = seen.evn < 0;
    if (s.ev && s.ev.n !== seen.evn) { if (!firstPaint) playEvent(d, s, s.ev, board); seen.evn = s.ev.n; }
    if (s.phase === "over" && overShown !== s.mid) { overShown = s.mid; setTimeout(() => { const d2 = X.data(); if (d2 && d2.feud && d2.feud.mid === s.mid) showOver(d2, d2.feud); }, firstPaint ? 0 : 1600); }
    if (s.phase !== "over") { const o = $("fdOver"); if (o) o.remove(); }
}
function renderIO(d, s, board, meUp, g, who, mine) {
    const io = $("fdIO"), mode = s.phase === "reveal" ? "reveal" : s.phase === "over" ? "over" : meUp ? "me-" + s.type : "wait";
    const key = mode + ":" + s.tk;
    if (io.dataset.k === key) return;
    const keepVal = "";       // a new turn key = a new answer: start with an empty box
    io.dataset.k = key; io.dataset.mode = mode; io.innerHTML = "";
    if (mode === "reveal") {
        const L = arr(s.log)[arr(s.log).length - 1] || {};
        const t = L.win ? TEAM[L.win].name + (L.how === "steal" ? " steals the pot" : L.how === "clear" ? " clears the board" : " keeps the pot") + ": +" + (L.pts || 0) : "Round over";
        io.appendChild(el("div", "fd-result " + (L.win ? TEAM[L.win].cls : ""), t));
        if (X.amHost()) { const b = el("button", "btn ghost", needsQuestion(s) ? "Next question ▶" : "Final score ▶"); b.type = "button"; b.onclick = () => window.fdNext(); io.appendChild(b); }
        else io.appendChild(el("p", "fd-wait", "Next question in a moment…"));
        return;
    }
    if (mode === "over") return;
    if (mode === "wait") {
        const p = el("p", "fd-wait");
        p.textContent = mine === g ? "Your team is up: " + X.pName(d, who) + " answers. Talk it through!" : mine ? (s.phase === "steal" ? TEAM[g].name + " is trying to steal your pot…" : TEAM[g].name + " is answering. Get ready to steal.") : "Watching: " + TEAM[g].name + " is answering.";
        io.appendChild(p); return;
    }
    if (s.type === "classic") {
        const f = el("form", "fd-form"); f.onsubmit = e => { e.preventDefault(); window.fdSubmit(); };
        const inp = el("input", "fd-input"); inp.id = "fdInput"; inp.type = "text"; inp.autocomplete = "off"; inp.maxLength = 60; inp.placeholder = s.phase === "steal" ? "One answer to steal the pot…" : "Type your answer…"; inp.value = keepVal;
        inp.setAttribute("aria-label", "Your answer");
        const b = el("button", "btn", s.phase === "steal" ? "STEAL" : "ANSWER"); b.type = "submit";
        f.append(inp, b); io.appendChild(f);
        setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 40);
    } else {
        const wrap = el("div", "fd-picker");
        const row = el("div", "fd-form");
        const inp = el("input", "fd-input"); inp.id = "fdInput"; inp.type = "search"; inp.autocomplete = "off"; inp.placeholder = "Search a character…"; inp.value = keepVal; inp.setAttribute("aria-label", "Search a character");
        const b = el("button", "btn", s.phase === "steal" ? "STEAL" : "LOCK IN"); b.type = "button"; b.id = "fdLockBtn"; b.disabled = true; b.onclick = () => window.fdLock();
        row.append(inp, b);
        const grid = el("div", "fd-grid"); grid.id = "fdGrid"; grid.setAttribute("role", "listbox"); grid.setAttribute("aria-label", "Characters");
        wrap.append(row, grid); io.appendChild(wrap);
        const used = new Set(Object.keys(s.rev || {}).map(i => board[i] && board[i].c).filter(Boolean));
        const fill = () => fillGrid(arr(s.series), inp.value, used);
        inp.oninput = fill;
        inp.onkeydown = e => {
            const items = [...grid.querySelectorAll(".fd-pick:not(:disabled)")], cur = items.findIndex(x => Number(x.dataset.id) === pick);
            if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); const n = items[Math.min(items.length - 1, cur + 1)]; if (n) selectPick(Number(n.dataset.id)); }
            else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); const n = items[Math.max(0, cur - 1)]; if (n) selectPick(Number(n.dataset.id)); }
            else if (e.key === "Enter") { e.preventDefault(); if (pick) window.fdLock(); else if (items.length === 1) { selectPick(Number(items[0].dataset.id)); } }
        };
        pick = 0; fill();
        setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 40);
    }
}
/* the character search: every character of the ticked series (the Anime Draft roster), by name or nickname */
let rosterCache = { k: "", list: [] };
function roster(series) {
    const k = series.join(); if (rosterCache.k === k) return rosterCache.list;
    const list = [];
    series.forEach(s => (CHARS[s] || []).forEach(r => { const id = Number(r[0]); if (list.some(x => x.id === id)) return; list.push({ id, n: r[1], s, keys: norm([r[1]].concat(NICKNAMES[id] || []).join(" ")) }); }));
    list.sort((a, b) => ((DB && DB[b.id] || {}).f || 0) - ((DB && DB[a.id] || {}).f || 0));
    rosterCache = { k, list }; return list;
}
function fillGrid(series, q, used) {
    const grid = $("fdGrid"); if (!grid) return;
    const n = norm(q), list = roster(series).filter(c => !n || c.keys.split(" ").some(w => w.startsWith(n)) || c.keys.includes(n)).slice(0, 60);
    grid.innerHTML = "";
    if (!list.length) { grid.appendChild(el("p", "fd-none", "No character matches \"" + q + "\" in the ticked series.")); selectPick(0); return; }
    list.forEach(c => {
        const b = el("button", "fd-pick"); b.type = "button"; b.dataset.id = c.id; b.setAttribute("role", "option");
        const ch = charOf(c.id), face = el("span", "fd-pface");
        if (ch && ch.img) { const img = new Image(); img.src = ch.img; img.alt = ""; img.loading = "lazy"; face.appendChild(img); } else face.textContent = c.n.charAt(0);
        b.append(face, el("span", "fd-pname", c.n));
        if (series.length > 1) b.appendChild(el("small", null, label(c.s)));
        if (used.has(c.id)) { b.disabled = true; b.title = "Already on the board"; }
        b.onclick = () => { selectPick(c.id); X.sfx("pick"); };
        b.ondblclick = () => { selectPick(c.id); window.fdLock(); };
        grid.appendChild(b);
    });
    if (pick && !list.some(c => c.id === pick)) selectPick(0); else selectPick(pick);
}
function selectPick(id) {
    pick = id;
    document.querySelectorAll("#fdGrid .fd-pick").forEach(b => { const on = Number(b.dataset.id) === id; b.classList.toggle("sel", on); b.setAttribute("aria-selected", String(on)); if (on) b.scrollIntoView({ block: "nearest" }); });
    const lb = $("fdLockBtn"); if (lb) { lb.disabled = !id; const c = roster(arr((X.data().feud || {}).series)).find(x => x.id === id); lb.textContent = (((X.data().feud || {}).phase === "steal") ? "STEAL" : "LOCK IN") + (c ? " · " + c.n : ""); lb.title = lb.textContent; }
}
async function submitText() {
    const s = (X.data() || {}).feud, inp = $("fdInput"); if (!s || !inp) return;
    const v = inp.value.trim(); if (!v) { feedback("Type an answer first.", "warn"); return; }
    inp.disabled = true;
    const ok = await move({ k: "guess", tk: s.tk, text: v });
    inp.disabled = false;
    if (ok === false && $("fdInput")) { try { $("fdInput").focus(); $("fdInput").select(); } catch (e) {} }
}
async function lockPick() {
    const s = (X.data() || {}).feud; if (!s || !pick) return;
    const b = $("fdLockBtn"); if (b) b.disabled = true;
    await move({ k: "guess", tk: s.tk, cid: pick });
    if ($("fdLockBtn")) $("fdLockBtn").disabled = !pick;
}
function feedback(msg, kind) {
    const f = $("fdFeedback"); if (!f) return;
    f.textContent = msg; f.className = "fd-feedback show " + (kind || "");
    clearTimeout(f._t); f._t = setTimeout(() => f.classList.remove("show"), 3200);
}

/* the countdown: drawn from the shared deadline (server time), so every screen shows the same second */
function timerLoop(d) {
    if (tickT) return;
    tickT = setInterval(() => {
        const d2 = X.data(), s = d2 && d2.feud, t = $("fdTimer");
        if (!s || !t || d2.gameType !== "feud") { clearInterval(tickT); tickT = 0; return; }
        const live = s.phase === "play" || s.phase === "steal";
        t.classList.toggle("off", !live);
        if (!live) { t.querySelector("b").textContent = ""; return; }
        const left = Math.max(0, Number(s.dl) - srvNow()), sec = Math.ceil(left / 1000), frac = Math.min(1, left / (s.timer * 1000));
        t.querySelector("b").textContent = String(sec);
        t.querySelector(".fd-tarc").style.strokeDashoffset = String(119.4 * (1 - frac));
        t.classList.toggle("low", sec <= 5);
        if (sec <= 5 && sec > 0 && sec !== lastTick && myTeam(s) === guessTeam(s)) { lastTick = sec; X.sfx("tick"); }
    }, 200);
}

/* ---------------- events: reveal, strike, steal, round, end ---------------- */
function banner(text, sub, cls) {
    const fx = $("fdFx"); if (!fx) return;
    const b = el("div", "fd-banner " + (cls || "")); b.append(el("b", null, text)); if (sub) b.appendChild(el("small", null, sub));
    fx.appendChild(b); setTimeout(() => b.remove(), 1900);
}
function playEvent(d, s, ev, board) {
    const name = p => X.pName(d, Number(p));
    if (ev.k === "hit") {
        const li = $("fdBoard").children[ev.i], a = board[ev.i]; if (!li || !a) return;
        X.sfx("reveal"); li.classList.add("pop");
        setTimeout(() => li.classList.remove("pop"), 900);
        const r = li.getBoundingClientRect(); X.burstText("+" + a.p, r.left + r.width - 30, r.top + r.height / 2, ev.team === "A" ? "#ff5050" : "#f0c869");
        const pot = $("fdPot"); pot.dataset.anim = "1"; X.countUp(pot, Math.max(0, (s.bank || 0) - a.p), s.bank || 0, 600); setTimeout(() => { delete pot.dataset.anim; }, 650);
        feedback(name(ev.by) + ": " + a.t + "! +" + a.p, "hit");
    } else if (ev.k === "miss") {
        X.sfx("strike");
        const fx = $("fdFx"), big = el("div", "fd-bigx"); big.textContent = "✕".repeat(Math.max(1, ev.strikes || 1)); fx.appendChild(big); setTimeout(() => big.remove(), 1100);
        X.shake($("fdBoard"), 9, 360);
        const said = ev.said && typeof ev.said === "number" ? (roster(arr(s.series)).find(c => c.id === ev.said) || {}).n : ev.said;
        feedback(ev.timeout ? name(ev.by) + " ran out of time." : name(ev.by) + ": \"" + (said || "?") + "\" isn't on the board.", "miss");
    } else if (ev.k === "steal") {
        X.sfx("whoosh"); banner("STEAL!", TEAM[ev.team].name + " gets one answer to take " + (ev.bank || 0) + " points", TEAM[ev.team].cls);
    } else if (ev.k === "round") {
        X.sfx("turn"); banner(ev.sd ? "SUDDEN DEATH" : "ROUND " + ev.round, TEAM[ev.team].name + " starts", TEAM[ev.team].cls);
    } else if (ev.k === "end") {
        if (ev.pts) { const sc = $("fdScore" + ev.win); if (sc) X.countUp(sc, Math.max(0, (s.score[ev.win] || 0) - ev.pts), s.score[ev.win] || 0, 900); }
        X.sfx(myTeam(s) && myTeam(s) === ev.win ? "win" : "xp");
        banner(ev.how === "steal" ? "STOLEN!" : ev.how === "clear" ? "BOARD CLEARED!" : "POT DEFENDED", TEAM[ev.win].name + " +" + (ev.pts || 0), TEAM[ev.win].cls);
    }
}

/* ---------------- the end ---------------- */
function showOver(d, s) {
    const old = $("fdOver"); if (old) old.remove();
    const o = el("div", "fd-over"); o.id = "fdOver"; o.setAttribute("role", "dialog"); o.setAttribute("aria-label", "Final score");
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
        const li = el("li"), q = LIB.questions.find(x => x.questionId === L.id), B = LIB.boards[L.id.replace(/_\d+$/, "")];
        const board = B ? (stateBoard(LIB, { q: { id: L.id }, series: s.series }) || []) : [];
        li.append(el("span", "fd-orn", L.sd ? "SD" : String(L.r)), el("span", "fd-orq", q ? qText(q.questionText, arr(s.series), label) : L.id));
        li.appendChild(el("span", "fd-orw " + (L.win ? TEAM[L.win].cls : ""), (L.win ? TEAM[L.win].short : "—") + " +" + L.pts + (L.how === "steal" ? " (steal)" : L.how === "clear" ? " (clear)" : "")));
        const chips = el("div", "fd-ochips");
        board.forEach((a, i) => { const by = (L.rev || {})[i]; chips.appendChild(el("span", by ? "by-" + by : "", a.t + " " + a.p)); });
        li.appendChild(chips); rl.appendChild(li);
    });
    card.appendChild(rl);
    card.appendChild(el("p", "fd-onote", "Boards are Anime Arcade curated answers, ranked by our editors, not survey results."));
    const btns = el("div", "fd-obtns");
    if (X.amHost()) { const a = el("button", "btn xl", "Rematch"); a.onclick = () => window.fdAgain(); const b = el("button", "btn ghost", "Back to lobby"); b.onclick = () => window.fdLobby(); btns.append(a, b); }
    else btns.appendChild(el("p", "fd-wait", "Waiting for " + X.pName(d, X.hostSlot(d)) + " to start a rematch or go back to the lobby."));
    card.appendChild(btns);
    o.appendChild(card); document.body.appendChild(o);
    const mt = myTeam(s);
    X.sfx(win && mt === win ? "win" : win && mt ? "lose" : "reveal");
    if (win && X.motionOK()) confetti(o, win === "A" ? ["#ff3b3b", "#ffd36b", "#fff"] : ["#f0c869", "#fff4d6", "#ff5050"]);
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
