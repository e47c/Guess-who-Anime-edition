/* =====================================================================
   ANIME FEUD (sixth mode): the team survey game show. Team vs Team only.
   Buzzer face-off, play or pass, the hidden ranked board, three strikes, the steal. A classic blue TV studio
   with its own game-show sounds (answer ding, the wrong-answer buzzer, applause, fanfare) and music ("show").
   Rules and rotation: engine.js (pure, tested in Node). Shared library/history/helpers: common.js.
   Most Likely is a separate mode (js/feud/likely.js) with its own room data, screen, settings and sounds.

   Firebase (everything under rooms/<code>, the only path the current rules allow):
     feud            the match: teams, scores, round, the question's ID, revealed slots, strikes, turn key, deadline.
                     Answers are never written: every client rebuilds the board from the shared library.
     feudHist/p<N>   that player's recent question history, shared so the host picks what is fresh for the room.
   Every move runs in a transaction on rooms/<code>/feud and is checked there (turn key, phase, player).
   ===================================================================== */
import { FEUD_RULES as R, eligible, poolInfo, stateBoard, qText, newMatch, act, actorOf, advance, needsQuestion,
    balanceTeams, guessTeam, other, faceOffOf, kindLabel, fairAnswer } from "./engine.js?v=5";
import { LIB, K, arr, el, srvNow, label, presentIn, pickOpt, seriesOf, TEAM, initCommon, recordSeen, publishHist, syncRemoteHist, roomHists, nextQuestion,
    img, teamsFrom, optButtons, scopeLine, teamColumns, tapTeam, shuffleTeams, kit, makeTimer, confetti, hintFor } from "./common.js?v=4";

export const FEUD_LIB = LIB;
const TYPE = "classic", NODE = "feud", GT = "feud";
const KT = kit("fd"), $ = id => document.getElementById(id), banner = KT.banner, feedback = KT.feedback, topBar = KT.topBar;
const setTop = (s, kick) => KT.setTop(s, kick, "ROUND");
let X = null;
const fRounds = d => pickOpt(d && d.feudRounds, R.roundChoices, R.rounds);
const fTimer = d => pickOpt(d && d.feudTimer, R.timerChoices, R.timer);
export const feudPrefs = p => ({ feudRounds: pickOpt(p.feudRounds, R.roundChoices, R.rounds), feudTimer: pickOpt(p.feudTimer, R.timerChoices, R.timer) });
export const feudPrefsOf = d => ({ feudRounds: fRounds(d), feudTimer: fTimer(d) });
const timer = makeTimer("fd", NODE, GT, s => s.phase === "buzz" ? R.buzzMs : s.phase === "decide" ? R.decideMs : s.timer * 1000,
    s => { const m = myTeam(s); return m && (m === guessTeam(s) || (s.phase === "decide" && m === s.ctrl)); });

/* ---------------- init ---------------- */
export function initFeud(ctx) {
    X = ctx;
    initCommon(ctx, () => { const d = X.data(); if (d && d.gameType === GT && d.feud && d.status !== "waiting") showFeud(d); });
    Object.assign(window, {
        setFeudOpt(k, v) {
            const d = X.data(); if (!d || !X.amHost() || d.status !== "waiting") return;
            X.sfx("pick");
            if (k === "rounds") X.lobbySet({ feudRounds: Number(v) });
            if (k === "timer") X.lobbySet({ feudTimer: Number(v) });
        },
        feudTeamTap(p) { const d = X.data(); if (!d || !X.amHost() || d.status !== "waiting") return; X.sfx("toggle"); X.lobbySet({ feudTeams: tapTeam(d, "feudTeams", p) }); },
        feudShuffle() { const d = X.data(); if (!d || !X.amHost() || d.status !== "waiting") return; X.sfx("toggle"); X.lobbySet({ feudTeams: shuffleTeams(d) }); },
        fdSubmit: () => submitText(),
        fdBuzz: () => buzz(),
        fdDecide: play => move({ k: "decide", tk: ((X.data() || {}).feud || {}).tk, play }),
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
export const teamsOf = d => teamsFrom(d, "feudTeams");
export const feudHint = hintFor;
export function feudReq(d) {
    const series = seriesOf(d), T = teamsOf(d), rounds = fRounds(d);
    if (!series.length) return { ok: false, msg: "Tick at least one series." };
    if (!T.A.length || !T.B.length) return { ok: false, msg: "Both teams need at least one player. Tap a player to move them." };
    const p = poolInfo(LIB, TYPE, series), what = series.length === 1 ? label(series[0]) + " on its own" : "this mix";
    if (p.boards < rounds) {
        const fewer = R.roundChoices.filter(r => r <= p.boards).pop();
        return { ok: false, msg: p.boards ? "Anime Feud has " + p.boards + " boards for " + what + ", not enough for " + rounds + " rounds. " + (fewer ? "Pick " + fewer + " rounds or tick" : "Tick") + " another series." : "Anime Feud has no boards for " + what + " yet. Tick another series." };
    }
    return { ok: true, msg: "Anime Feud · " + (series.length === 1 ? "Single anime" : "Anime Mix") + " · " + rounds + " rounds · " + T.A.length + " vs " + T.B.length };
}
export function feudLobby(d, lock) {
    const series = seriesOf(d);
    optButtons($("fdRoundsBtns"), R.roundChoices, fRounds(d), lock, String, v => window.setFeudOpt("rounds", v));
    optButtons($("fdTimerBtns"), R.timerChoices, fTimer(d), lock, v => v + " s", v => window.setFeudOpt("timer", v));
    scopeLine($("fdScope"), TYPE, series);
    teamColumns($("fdTeams"), d, teamsOf(d), lock, p => window.feudTeamTap(p), () => window.feudShuffle());
    $("fdHint").textContent = "A buzzer face-off opens every round. The top answer (or the higher one) wins control: play the board or pass it. Three strikes and the other team can steal the pot.";
    syncRemoteHist().then(() => publishHist(X.data()));
}

/* ---------------- start (host) ---------------- */
export async function feudStart(again) {
    const d = X.data(); if (!d || !X.amHost()) return;
    if (again && d.feud && d.feud.phase !== "over" && !(await X.uiConfirm({ title: "Restart Anime Feud?", text: "The current match is thrown away.", ok: "Restart" }))) return;
    try {
        const series = again && d.feud ? arr(d.feud.series) : seriesOf(d);
        let teams = again && d.feud ? { A: arr(d.feud.teams.A).map(Number), B: arr(d.feud.teams.B).map(Number) } : teamsOf(d);
        const act2 = X.dealSlots(d); teams = { A: teams.A.filter(p => act2.includes(p)), B: teams.B.filter(p => act2.includes(p)) };
        if (!teams.A.length || !teams.B.length) teams = balanceTeams(act2);
        if (!teams.A.length || !teams.B.length) { X.toast("Anime Feud needs two teams."); return; }
        const now = srvNow(), q = nextQuestion(TYPE, series, roomHists(d, teams.A.concat(teams.B)), []);
        if (!q) { X.toast("No questions fit those series."); return; }
        const mid = Date.now();
        const s = newMatch({ lv: LIB.version, mid, type: TYPE, series, teams, q, now, rounds: again && d.feud ? d.feud.rounds : fRounds(d), timer: again && d.feud ? d.feud.timer : fTimer(d), first: Math.random() < .5 ? "A" : "B" });
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
    b.disabled = true; b.classList.add("hit"); X.sfx("showBuzzIn");
    move({ k: "buzz" }, true);
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
    if (s.phase === "reveal") dutyT = setTimeout(() => hostAdvance(false), Math.max(0, Number(s.nx) - srvNow()));
    else if (Number(s.dl)) dutyT = setTimeout(() => timeoutTx(s), Math.max(0, Number(s.dl) - srvNow()) + R.graceMs);
}
function timeoutTx(s) {
    if (!X.amHost()) return;
    X.runTransaction(X.ref(X.db, "rooms/" + X.room() + "/feud"), cur => {
        if (!cur || cur.mid !== s.mid || cur.tk !== s.tk) return;
        return act(cur, { k: "timeout", tk: cur.tk }, { board: stateBoard(LIB, cur), present: presentIn(X.data()), now: srvNow() }) ? undefined : cur;
    }).catch(e => console.error(e));
}
async function hostAdvance(manual) {
    const d = X.data(), s = d && d.feud; if (!s || s.phase !== "reveal" || !X.amHost()) return;
    if (manual) X.sfx("click");
    const c = needsQuestion(s) ? nextQuestion(TYPE, arr(s.series), roomHists(d, feudSeats(d)), s.used) : null;
    try {
        await X.runTransaction(X.ref(X.db, "rooms/" + X.room() + "/feud"), cur => {
            if (!cur || cur.mid !== s.mid) return;
            return advance(cur, s.round, c, srvNow()) ? undefined : cur;
        });
    } catch (e) { console.error(e); }
}

/* ---------------- screen ---------------- */
let seen = { mid: 0, evn: -1 }, built = "", overShown = 0, verWarned = 0;
export function feudReset() {
    timer.stop(); clearTimeout(dutyT); dutyKey = ""; seen = { mid: 0, evn: -1 }; built = ""; overShown = 0;
    const o = $("fdOver"); if (o) o.remove();
}
export function showFeud(d) {
    X.showOnly("feud");
    const s = d.feud; if (!s) return;
    if (s.lv && s.lv !== LIB.version && verWarned !== s.mid) { verWarned = s.mid; X.toast("The host has a different question library. Reload the page if boards look wrong."); }
    if (built !== String(s.mid)) { built = String(s.mid); seen = { mid: s.mid, evn: -1 }; buildStudio(); }
    renderStudio(d, s);
    timer.start();
    if (s.q && s.phase !== "over" && s.phase !== "pick" && feudSeats(d).includes(X.me())) recordSeen(s.q.key, s.q.at);
    const firstPaint = seen.evn < 0;
    if (s.ev && s.ev.n !== seen.evn) { if (!firstPaint) studioEvent(d, s, s.ev); seen.evn = s.ev.n; }
    if (s.phase === "over" && overShown !== s.mid) { overShown = s.mid; setTimeout(() => { const d2 = X.data(); if (d2 && d2.feud && d2.feud.mid === s.mid) showOver(d2, d2.feud); }, firstPaint ? 0 : 1600); }
    if (s.phase !== "over") { const o = $("fdOver"); if (o) o.remove(); }
}
const myTeam = s => ["A", "B"].find(k => arr(s.teams[k]).map(Number).includes(X.me())) || "";

/* =====================================================================
   ANIME FEUD: the studio
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
    setTop(s, ["ANIME FEUD", arr(s.series).length > 1 ? "ANIME MIX" : label(s.series[0]).toUpperCase(), kindLabel(LIB.boards[s.q && s.q.g])].filter(Boolean).join(" · "));
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
        X.sfx("showBuzzIn"); banner(ev.auto ? "TIME!" : "BUZZ!", ev.auto ? "Nobody buzzed: " + TEAM[ev.team].name + " answers first" : name(ev.by) + " for " + TEAM[ev.team].name, TEAM[ev.team].cls);
    } else if (ev.k === "hit") {
        const li = $("fdBoard").children[ev.i], a = board[ev.i]; if (!li || !a) return;
        X.sfx(ev.top ? "showTop" : "showDing"); li.classList.add("pop"); setTimeout(() => li.classList.remove("pop"), 900);
        const r = li.getBoundingClientRect(); X.burstText("+" + a.p, r.left + r.width - 30, r.top + r.height / 2, ev.team === "A" ? "#ff5050" : "#f0c869");
        const pot = $("fdPot"); pot.dataset.anim = "1"; X.countUp(pot, Math.max(0, (s.bank || 0) - a.p), s.bank || 0, 600); setTimeout(() => { delete pot.dataset.anim; }, 650);
        if (ev.top) banner("TOP ANSWER!", a.t, TEAM[ev.team].cls);
        feedback(name(ev.by) + ": " + a.t + "! +" + a.p + (ev.face && !ev.top ? " (#" + (ev.i + 1) + " on the board)" : ""), "hit");
    } else if (ev.k === "miss") {
        X.sfx("showBuzz");
        const fx = $("fdFx"), big = el("div", "fd-bigx"); big.textContent = "✕".repeat(ev.face ? 1 : Math.max(1, ev.strikes || 1)); fx.appendChild(big); setTimeout(() => big.remove(), 1100);
        X.shake($("fdBoard"), 9, 360);
        // a right answer that didn't make the top of this board is told so (it's still a strike: only the board's answers score)
        const fa = !ev.timeout && typeof ev.said === "string" ? fairAnswer(LIB.boards[s.q && s.q.g], arr(s.series), ev.said, board) : null;
        feedback(ev.timeout ? name(ev.by) + " ran out of time." : fa ? name(ev.by) + ": " + fa.t + " fits, but didn't make this board." : name(ev.by) + ": \"" + (ev.said || "?") + "\" isn't on the board.", "miss");
    } else if (ev.k === "control") {
        X.sfx("showDing"); if (ev.why !== "top") banner("CONTROL!", TEAM[ev.team].name + " had the higher answer", TEAM[ev.team].cls);
    } else if (ev.k === "decide") {
        X.sfx(ev.play ? "fanfare" : "showPass"); banner(ev.play ? "PLAY!" : "PASS!", ev.play ? TEAM[ev.team].name + " plays the board" : TEAM[other(ev.team)].name + " has to play it", TEAM[ev.play ? ev.team : other(ev.team)].cls);
    } else if (ev.k === "refaceoff") {
        X.sfx("showBuzz"); banner("NOBODY SCORED", "Next pair to the buzzers!", "");
    } else if (ev.k === "steal") {
        X.sfx("drumroll"); banner("STEAL!", TEAM[ev.team].name + " gets one answer to take " + (ev.bank || 0) + " points", TEAM[ev.team].cls);
    } else if (ev.k === "round") {
        X.sfx("fanfare"); banner(ev.sd ? "SUDDEN DEATH" : "ROUND " + ev.round, "Face-off to the buzzers!", "");
    } else if (ev.k === "end") {
        if (ev.pts) { const sc = $("fdScore" + ev.win); if (sc) X.countUp(sc, Math.max(0, (s.score[ev.win] || 0) - ev.pts), s.score[ev.win] || 0, 900); }
        X.sfx("applause"); if (myTeam(s) === ev.win) X.sfx("showTop");
        banner(ev.how === "steal" ? "STOLEN!" : ev.how === "clear" ? "BOARD CLEARED!" : "POT DEFENDED", TEAM[ev.win].name + " +" + (ev.pts || 0), TEAM[ev.win].cls);
    }
}


/* ---------------- the end ---------------- */
function showOver(d, s) {
    const old = $("fdOver"); if (old) old.remove();
    const o = el("div", "fd-over blue"); o.id = "fdOver"; o.setAttribute("role", "dialog"); o.setAttribute("aria-label", "Final score");
    const win = s.winner, card = el("div", "fd-ocard " + (win ? TEAM[win].cls : "draw"));
    card.appendChild(el("div", "fd-okick", s.why === "out" ? "OUT OF QUESTIONS · FINAL SCORE" : "ANIME FEUD · FINAL SCORE"));
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
        const chips = el("div", "fd-ochips"), board = stateBoard(LIB, { q: { id: L.id }, series: s.series }) || [];
        li.appendChild(el("span", "fd-orw " + (L.win ? TEAM[L.win].cls : ""), (L.win ? TEAM[L.win].short : "—") + " +" + L.pts + (L.how === "steal" ? " (steal)" : L.how === "clear" ? " (clear)" : "")));
        board.forEach((a, i) => { const by = (L.rev || {})[i]; chips.appendChild(el("span", by ? "by-" + by : "", a.t + " " + a.p)); });
        li.appendChild(chips); rl.appendChild(li);
    });
    card.appendChild(rl);
    card.appendChild(el("p", "fd-onote", "Each board says how it's ranked: canon answers by AniList fans or by how well-known they are, feats by the Anime Draft ratings, and opinion questions by our editors' poll (never presented as canon)."));
    const btns = el("div", "fd-obtns");
    if (X.amHost()) { const a = el("button", "btn xl", "Rematch"); a.onclick = () => window.fdAgain(); const b = el("button", "btn ghost", "Back to lobby"); b.onclick = () => window.fdLobby(); btns.append(a, b); }
    else btns.appendChild(el("p", "fd-wait", "Waiting for " + X.pName(d, X.hostSlot(d)) + " to start a rematch or go back to the lobby."));
    card.appendChild(btns);
    o.appendChild(card); document.body.appendChild(o);
    const mt = myTeam(s);
    X.sfx("applause"); setTimeout(() => X.sfx(win && mt === win ? "fanfare" : win && mt ? "lose" : "showDing"), 250);
    if (win && X.motionOK()) confetti(o, win === "A" ? ["#ff3b3b", "#ffd36b", "#fff", "#4aa8ff"] : ["#f0c869", "#fff4d6", "#4aa8ff", "#fff"]);
    setTimeout(() => { const f = o.querySelector("button"); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }, 60);
}
