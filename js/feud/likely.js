/* =====================================================================
   MOST LIKELY (seventh mode): two close characters, one question, everyone argues.
   Two ways to play:
     Team vs Team   Team Crimson and Team Gold vote at the same moment; a team's pick is its majority.
     Free For All   every player votes for themselves and keeps their own score.
   Whoever picks the more likely character scores (closer calls are worth more). A dark, fiery "clash" look with its
   own sounds (fire crackle, clash hits, taiko) and music ("clash").
   Rules: engine.js (Most Likely duels + Free For All). Shared library/history/helpers: common.js.

   Firebase (rooms/<code>):
     likely          the match: mode (teams / free for all), players or teams, scores, the duel (two characters and
                     the right one), votes, turn key, deadline. Every vote and timeout runs in a transaction.
     feudHist/p<N>   the shared question history (same as Anime Feud: it never serves the same question twice in a row).
   ===================================================================== */
import { FEUD_RULES as R, poolInfo, newMatch, act, advance, needsQuestion, balanceTeams, seatsOf, qText, kindLabel } from "./engine.js?v=5";
import { LIB, K, arr, el, srvNow, label, presentIn, pickOpt, seriesOf, TEAM, initCommon, recordSeen, publishHist, syncRemoteHist, roomHists, nextQuestion,
    charName, charSeries, img, teamsFrom, optButtons, scopeLine, teamColumns, tapTeam, shuffleTeams, kit, makeTimer, confetti, hintFor } from "./common.js?v=4";

const TYPE = "likely", NODE = "likely", GT = "likely";
const KT = kit("ml"), $ = KT.$, banner = KT.banner, feedback = KT.feedback;
let X = null;
const PLAYS = ["teams", "ffa"];
const lPlay = d => d && d.likelyPlay === "ffa" ? "ffa" : "teams";
const lRounds = d => pickOpt(d && d.likelyRounds, R.likelyRoundChoices, R.likelyRounds);
const lTimer = d => pickOpt(d && d.likelyTimer, R.likelyTimerChoices, R.likelyTimer);
export const likelyPrefs = p => ({ likelyPlay: p.likelyPlay === "ffa" ? "ffa" : "teams", likelyRounds: pickOpt(p.likelyRounds, R.likelyRoundChoices, R.likelyRounds), likelyTimer: pickOpt(p.likelyTimer, R.likelyTimerChoices, R.likelyTimer) });
export const likelyPrefsOf = d => ({ likelyPlay: lPlay(d), likelyRounds: lRounds(d), likelyTimer: lTimer(d) });
const timer = makeTimer("ml", NODE, GT, s => s.timer * 1000, s => inMatch(s) && !(s.votes || {})["p" + X.me()]);
const PCOL = ["#ff5a3c", "#ffc24a", "#ff8a2a", "#e8455a", "#ffd97a", "#ff6f91", "#f2a23c", "#ff3b2a"];

/* ---------------- init ---------------- */
export function initLikely(ctx) {
    X = ctx;
    initCommon(ctx, () => { const d = X.data(); if (d && d.gameType === GT && d.likely && d.status !== "waiting") showLikely(d); });
    Object.assign(window, {
        setLikelyOpt(k, v) {
            const d = X.data(); if (!d || !X.amHost() || d.status !== "waiting") return;
            X.sfx("pick");
            if (k === "play") X.lobbySet({ likelyPlay: PLAYS.includes(v) ? v : "teams" });
            if (k === "rounds") X.lobbySet({ likelyRounds: Number(v) });
            if (k === "timer") X.lobbySet({ likelyTimer: Number(v) });
        },
        likelyTeamTap(p) { const d = X.data(); if (!d || !X.amHost() || d.status !== "waiting") return; X.sfx("toggle"); X.lobbySet({ likelyTeams: tapTeam(d, "likelyTeams", p) }); },
        likelyShuffle() { const d = X.data(); if (!d || !X.amHost() || d.status !== "waiting") return; X.sfx("toggle"); X.lobbySet({ likelyTeams: shuffleTeams(d) }); },
        mlVote: pick => vote(pick),
        mlNext: () => hostAdvance(true),
        mlAgain: () => likelyStart(true),
        mlLobby: () => X.backToLobby(true)
    });
}

/* ---------------- lobby ---------------- */
export const teamsOf = d => teamsFrom(d, "likelyTeams");
export const likelyHint = hintFor;
export function likelyReq(d) {
    const series = seriesOf(d), rounds = lRounds(d), play = lPlay(d), n = X.dealSlots(d).length;
    if (!series.length) return { ok: false, msg: "Tick at least one series." };
    if (play === "teams") { const T = teamsOf(d); if (!T.A.length || !T.B.length) return { ok: false, msg: "Both teams need at least one player. Tap a player to move them." }; }
    const p = poolInfo(LIB, TYPE, series), what = series.length === 1 ? label(series[0]) + " on its own" : "this mix";
    if (p.boards < rounds) {
        const fewer = R.likelyRoundChoices.filter(r => r <= p.boards).pop();
        return { ok: false, msg: p.boards ? "Most Likely has " + p.boards + " questions for " + what + ", not enough for " + rounds + " duels. " + (fewer ? "Pick " + fewer + " duels or tick" : "Tick") + " another series." : "Most Likely has no questions for " + what + " yet. Tick another series." };
    }
    const T = teamsOf(d);
    return { ok: true, msg: "Most Likely · " + (play === "ffa" ? "Free For All · " + n + " players" : "Team vs Team · " + T.A.length + " vs " + T.B.length) + " · " + (series.length === 1 ? "Single anime" : "Anime Mix") + " · " + rounds + " duels" };
}
export function likelyLobby(d, lock) {
    const series = seriesOf(d), play = lPlay(d);
    document.querySelectorAll(".ml-play").forEach(b => { b.classList.toggle("selected", b.dataset.k === play); b.disabled = lock; b.setAttribute("aria-pressed", String(b.dataset.k === play)); });
    optButtons($("RoundsBtns"), R.likelyRoundChoices, lRounds(d), lock, String, v => window.setLikelyOpt("rounds", v));
    optButtons($("TimerBtns"), R.likelyTimerChoices, lTimer(d), lock, v => v + " s", v => window.setLikelyOpt("timer", v));
    scopeLine($("Scope"), TYPE, series);
    $("TeamsBox").classList.toggle("hidden", play !== "teams");
    if (play === "teams") teamColumns($("Teams"), d, teamsOf(d), lock, p => window.likelyTeamTap(p), () => window.likelyShuffle());
    $("Hint").textContent = play === "ffa"
        ? "Free For All: every player votes on their own. Pick the more likely character to score; closer calls are worth more. Highest score wins."
        : "Team vs Team: both teams vote at the same moment; a team's pick is its majority. The team that picks the more likely character scores.";
    syncRemoteHist().then(() => publishHist(X.data()));
}

/* ---------------- start (host) ---------------- */
export async function likelyStart(again) {
    const d = X.data(); if (!d || !X.amHost()) return;
    const prev = d.likely;
    if (again && prev && prev.phase !== "over" && !(await X.uiConfirm({ title: "Restart Most Likely?", text: "The current match is thrown away.", ok: "Restart" }))) return;
    try {
        const act2 = X.dealSlots(d), series = again && prev ? arr(prev.series) : seriesOf(d), ffa = again && prev ? !!prev.ffa : lPlay(d) === "ffa";
        let teams = null, players = null;
        if (ffa) { players = act2.slice(); if (players.length < 2) { X.toast("Most Likely needs at least 2 players."); return; } }
        else {
            teams = again && prev && !prev.ffa ? { A: arr(prev.teams.A).map(Number), B: arr(prev.teams.B).map(Number) } : teamsOf(d);
            teams = { A: teams.A.filter(p => act2.includes(p)), B: teams.B.filter(p => act2.includes(p)) };
            if (!teams.A.length || !teams.B.length) teams = balanceTeams(act2);
            if (!teams.A.length || !teams.B.length) { X.toast("Team vs Team needs two teams."); return; }
        }
        const seats = ffa ? players : teams.A.concat(teams.B), now = srvNow();
        const q = nextQuestion(TYPE, series, roomHists(d, seats), []);
        if (!q) { X.toast("No questions fit those series."); return; }
        const mid = Date.now();
        const s = newMatch({ lv: LIB.version, mid, type: TYPE, series, teams, ffa, players, q, now, rounds: again && prev ? prev.rounds : lRounds(d), timer: again && prev ? prev.timer : lTimer(d) });
        await X.update(X.ref(X.db, "rooms/" + X.room()), { status: "playing", matchId: mid, likely: s });
    } catch (e) { console.error(e); X.toast("Could not start Most Likely: " + (e.message || e)); }
}
export const likelySeats = d => { const s = d && d.likely; return s ? seatsOf(s) : []; };
export const likelyOver = d => !d.likely || d.likely.phase === "over";

/* ---------------- moves ---------------- */
let busy = false;
async function move(a) {
    if (busy) return false; busy = true;
    let err = null;
    try {
        await X.runTransaction(X.ref(X.db, "rooms/" + X.room() + "/likely"), cur => {
            if (!cur) return cur;
            err = act(cur, Object.assign({ by: X.me() }, a), { present: presentIn(X.data()), now: srvNow() });
            return err ? undefined : cur;
        });
    } catch (e) { console.error(e); err = "Couldn't send that. Try again."; }
    busy = false;
    if (err && err !== "stale") feedback(err, "warn");
    return !err;
}
function vote(pick) {
    const s = (X.data() || {}).likely; if (!s || s.phase !== "vote" || !inMatch(s)) return;
    X.sfx("clashVote");
    myVote = pick; renderVotes(X.data(), s);        // instant feedback; the transaction confirms it
    move({ k: "vote", pick });
}

/* ---------------- host duties ---------------- */
let dutyT = 0, dutyKey = "", goneKey = "";
export function likelyDuties(d) {
    const s = d.likely; if (!s || s.phase === "over") return;
    if (!s.ffa) {
        const gone = ["A", "B"].find(k => !arr(s.teams[k]).some(p => d["player" + p] && !d["player" + p].left));
        if (gone) { const k = "g" + s.mid; if (goneKey !== k) { goneKey = k; X.toast(TEAM[gone].name + " left. Back to the lobby."); X.backToLobby(true); } return; }
    }
    // the vote also ends early once everyone still here has voted (someone may have left mid-vote)
    if (s.phase === "vote" && Number(s.dl) > srvNow() + 800) {
        const pr = presentIn(d), all = seatsOf(s).filter(pr).every(p => (s.votes || {})["p" + p]);
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
    X.runTransaction(X.ref(X.db, "rooms/" + X.room() + "/likely"), cur => {
        if (!cur || cur.mid !== s.mid || cur.tk !== s.tk) return;
        return act(cur, { k: "timeout", tk: cur.tk }, { present: presentIn(X.data()), now: srvNow(), force }) ? undefined : cur;
    }).catch(e => console.error(e));
}
async function hostAdvance(manual) {
    const d = X.data(), s = d && d.likely; if (!s || s.phase !== "reveal" || !X.amHost()) return;
    if (manual) X.sfx("click");
    const c = needsQuestion(s) ? nextQuestion(TYPE, arr(s.series), roomHists(d, seatsOf(s)), s.used) : null;
    try {
        await X.runTransaction(X.ref(X.db, "rooms/" + X.room() + "/likely"), cur => {
            if (!cur || cur.mid !== s.mid) return;
            return advance(cur, s.round, c, srvNow()) ? undefined : cur;
        });
    } catch (e) { console.error(e); }
}

/* ---------------- screen ---------------- */
let seen = { mid: 0, evn: -1 }, built = "", overShown = 0, verWarned = 0, myVote = "";
export function likelyReset() {
    timer.stop(); clearTimeout(dutyT); dutyKey = ""; seen = { mid: 0, evn: -1 }; built = ""; overShown = 0; myVote = "";
    const o = $("Over"); if (o) o.remove();
}
const inMatch = s => seatsOf(s).includes(X.me());
const myTeam = s => s.ffa ? "" : ["A", "B"].find(k => arr(s.teams[k]).map(Number).includes(X.me())) || "";
const pColor = (s, p) => PCOL[Math.max(0, arr(s.players).map(Number).indexOf(Number(p))) % PCOL.length];
export function showLikely(d) {
    X.showOnly("likely");
    const s = d.likely; if (!s) return;
    if (s.lv && s.lv !== LIB.version && verWarned !== s.mid) { verWarned = s.mid; X.toast("The host has a different question library. Reload the page if things look wrong."); }
    if (built !== String(s.mid)) { built = String(s.mid); seen = { mid: s.mid, evn: -1 }; myVote = ""; build(); }
    render(d, s);
    timer.start();
    if (s.q && s.phase !== "over" && inMatch(s)) recordSeen(s.q.key, s.q.at);
    const firstPaint = seen.evn < 0;
    if (s.ev && s.ev.n !== seen.evn) { if (!firstPaint) onEvent(d, s, s.ev); seen.evn = s.ev.n; }
    if (s.phase === "over" && overShown !== s.mid) { overShown = s.mid; setTimeout(() => { const d2 = X.data(); if (d2 && d2.likely && d2.likely.mid === s.mid) showOver(d2, d2.likely); }, firstPaint ? 0 : 1600); }
    if (s.phase !== "over") { const o = $("Over"); if (o) o.remove(); }
}
function build() {
    const w = $("Wrap"); w.innerHTML = ""; w.className = "fd-wrap fd-duel";
    const deco = el("div", "fd-embers"); deco.setAttribute("aria-hidden", "true"); for (let i = 0; i < 20; i++) { const p = el("i"); p.style.setProperty("--i", i); deco.appendChild(p); } w.appendChild(deco);
    KT.topBar(w);
    const sb = el("div", "fd-dscore"); sb.id = "mlDScore"; w.appendChild(sb);
    const arena = el("div", "fd-arena"); arena.id = "mlArena";
    ["a", "b"].forEach((k, i) => {
        const c = el("button", "fd-dcard"); c.type = "button"; c.id = "mlCard" + k; c.dataset.k = k;
        c.onclick = () => window.mlVote(k);
        const frame = el("div", "fd-dframe"); frame.append(el("span", "fd-dportrait"), el("i", "fd-dcorner tl"), el("i", "fd-dcorner tr"), el("i", "fd-dcorner bl"), el("i", "fd-dcorner br"));
        const rib = el("div", "fd-dribbon"); rib.append(el("b", "fd-dname"), el("small", "fd-dseries"));
        c.append(frame, rib, el("div", "fd-dvotes"), el("div", "fd-dstamp", "MOST LIKELY!"), el("div", "fd-dteams"));
        arena.appendChild(c);
        if (i === 0) { const vs = el("div", "fd-vs"); vs.append(el("b", null, "VS"), el("small", "fd-worth")); arena.appendChild(vs); }
    });
    w.appendChild(arena);
    const io = el("div", "fd-io"); io.id = "mlIO"; w.appendChild(io);
    KT.feedbackLine(w); KT.fxLayer(w);
}
function scoreBar(d, s) {
    const sb = $("DScore"); sb.innerHTML = "";
    if (s.ffa) {
        sb.classList.add("ffa");
        const ranked = arr(s.players).map(Number).slice().sort((a, b) => (s.score["p" + b] || 0) - (s.score["p" + a] || 0));
        ranked.forEach(p => {
            const t = el("div", "fd-dteam fd-dplayer" + (p === X.me() ? " mine" : "")); t.style.setProperty("--tc", pColor(s, p)); t.dataset.emote = "p" + p;
            const a = el("span", "fd-dav" + ((s.votes || {})["p" + p] ? " voted" : "") + (presentIn(d)(p) ? "" : " off")); a.appendChild(X.avatarEl(X.pPub(d, p), { size: 26 }));
            const sc = el("b", "fd-dts", String(s.score["p" + p] || 0)); sc.id = "mlScorep" + p;
            t.append(a, el("span", "fd-dpn", X.pName(d, p) + (p === X.me() ? " (you)" : "")), sc);
            sb.appendChild(t);
        });
        return;
    }
    sb.classList.remove("ffa");
    const mine = myTeam(s);
    ["A", "B"].forEach(k => {
        const t = el("div", "fd-dteam " + TEAM[k].cls + (mine === k ? " mine" : ""));
        const sc = el("b", "fd-dts", String((s.score || {})[k] || 0)); sc.id = "mlScore" + k;
        t.append(el("span", "fd-dtn", TEAM[k].short), sc);
        const m = el("div", "fd-dtm");
        arr(s.teams[k]).map(Number).forEach(p => { const a = el("span", "fd-dav" + ((s.votes || {})["p" + p] ? " voted" : "") + (presentIn(d)(p) ? "" : " off")); a.dataset.emote = "p" + p; a.title = X.pName(d, p); a.appendChild(X.avatarEl(X.pPub(d, p), { size: 28 })); m.appendChild(a); });
        t.appendChild(m); sb.appendChild(t);
        if (k === "A") sb.appendChild(el("span", "fd-dheart", "VS"));
    });
}
function render(d, s) {
    const du = s.duel || {}, res = s.phase === "reveal" || s.phase === "over", L = res ? arr(s.log)[arr(s.log).length - 1] || {} : null, playing = inMatch(s);
    $("Status").textContent = s.phase === "vote" ? (!playing ? "Everyone is voting…" : s.ffa ? "Every player for themselves: who is more likely?" : "Vote with your team: who is more likely?") : s.phase === "reveal" ? "The answer is in!" : "";
    KT.setTop(s, ["MOST LIKELY", s.ffa ? "FREE FOR ALL" : "TEAM VS TEAM", arr(s.series).length > 1 ? "ANIME MIX" : label(s.series[0]).toUpperCase(), kindLabel(LIB.boards[s.q && s.q.g])].filter(Boolean).join(" · "), "DUEL");
    scoreBar(d, s);
    const arena = $("Arena"), key = s.round + ":" + du.a + ":" + du.b;
    if (arena.dataset.k !== key) {
        arena.dataset.k = key; myVote = arr((s.votes || {})["p" + X.me()])[0] || "";
        ["a", "b"].forEach(k => {
            const c = $("Card" + k), id = du[k];
            c.className = "fd-dcard"; c.disabled = false;
            const pt = c.querySelector(".fd-dportrait"); pt.innerHTML = ""; pt.appendChild(img(id, "fd-dimg"));
            c.querySelector(".fd-dname").textContent = charName(id);
            c.querySelector(".fd-dseries").textContent = label(charSeries(id));
            c.setAttribute("aria-label", "Vote for " + charName(id));
            if (X.motionOK() && c.animate) c.animate([{ opacity: 0, transform: "translateX(" + (k === "a" ? -60 : 60) + "px) scale(.92) rotate(" + (k === "a" ? -4 : 4) + "deg)" }, { opacity: 1, transform: "none" }], { duration: 480, delay: k === "a" ? 0 : 90, easing: "cubic-bezier(.2,1.3,.4,1)", fill: "backwards" });
        });
        arena.querySelector(".fd-worth").textContent = du.pts >= 30 ? "Photo finish · " + du.pts + " pts" : du.pts >= 20 ? "Close call · " + du.pts + " pts" : du.pts + " pts";
    }
    arena.classList.toggle("res", res); arena.classList.toggle("voting", s.phase === "vote");
    renderVotes(d, s);
    if (res && L) ["a", "b"].forEach(k => {
        const c = $("Card" + k); c.disabled = true;
        c.classList.toggle("win", L.w === k); c.classList.toggle("lose", L.w !== k);
        const tb = c.querySelector(".fd-dteams"); tb.innerHTML = "";
        if (s.ffa) { const n = Object.values(L.picks || {}).filter(v => v === k).length; if (n) tb.appendChild(el("span", "fd-b", n + " vote" + (n === 1 ? "" : "s") + (L.w === k ? " · +" + L.pts + " each" : ""))); }
        else ["A", "B"].forEach(t => { if ((L.picks || {})[t] === k) tb.appendChild(el("span", TEAM[t].cls, TEAM[t].short + (L.w === k ? " +" + L.pts : ""))); });
    });
    const io = $("IO"), mode = s.phase + ":" + s.tk;
    if (io.dataset.k !== mode) {
        io.dataset.k = mode; io.innerHTML = "";
        if (s.phase === "vote") io.appendChild(el("p", "fd-wait soft", !playing ? "You're watching: everyone votes at the same time." : s.ffa ? "Tap a card to vote. Nobody sees your pick until the reveal; you can change it until time runs out." : "Tap a card to vote with your team. You can change your mind until everyone has voted."));
        if (s.phase === "reveal" && L) {
            const g = L.gain || {};
            let txt;
            if (s.ffa) { const who = Object.keys(g).filter(k => g[k]).map(k => X.pName(d, Number(k.slice(1)))); txt = who.length ? (who.length > 3 ? who.length + " players" : who.join(", ")) + " got it! +" + L.pts : "Nobody picked " + charName(L[L.w]) + ". No points."; }
            else txt = g.A && g.B ? "Both teams got it! +" + L.pts + " each" : g.A ? TEAM.A.name + " got it! +" + L.pts : g.B ? TEAM.B.name + " got it! +" + L.pts : "Nobody picked " + charName(L[L.w]) + ". No points.";
            io.appendChild(el("div", "fd-dresult", txt));
            if (X.amHost()) { const b = el("button", "btn ghost", needsQuestion(s) ? "Next duel ▶" : "Final score ▶"); b.type = "button"; b.onclick = () => window.mlNext(); io.appendChild(b); }
        }
    }
}
// before the reveal you only see your own vote (Free For All) or your own team's votes (Team vs Team)
function renderVotes(d, s) {
    const res = s.phase !== "vote", playing = inMatch(s), mine = myTeam(s);
    if (!res && playing && (s.votes || {})["p" + X.me()]) myVote = arr(s.votes["p" + X.me()])[0];
    ["a", "b"].forEach(k => {
        const c = $("Card" + k); if (!c) return;
        c.classList.toggle("picked", !res && myVote === k);
        c.disabled = res || !playing;
        const box = c.querySelector(".fd-dvotes"); box.innerHTML = "";
        seatsOf(s).forEach(p => {
            const v = arr((s.votes || {})["p" + p])[0]; if (v !== k) return;
            const t = s.ffa ? "" : arr(s.teams.A).map(Number).includes(p) ? "A" : "B";
            if (!res && (s.ffa ? p !== X.me() : t !== mine)) return;
            const dot = el("span", "fd-dvote " + (t ? TEAM[t].cls : "")); if (s.ffa) dot.style.boxShadow = "0 0 0 2px #1a0602, 0 0 0 4px " + pColor(s, p);
            dot.title = X.pName(d, p); dot.appendChild(X.avatarEl(X.pPub(d, p), { size: 22 })); box.appendChild(dot);
        });
        if (!res && playing && myVote === k) box.appendChild(el("em", "fd-dyou", "YOUR VOTE"));
    });
}
function onEvent(d, s, ev) {
    if (ev.k === "duel") { X.sfx("taiko"); banner(ev.sd ? "SUDDEN DEATH" : "DUEL " + ev.round, "Who is more likely?", ""); }
    else if (ev.k === "vote") { if (Number(ev.by) !== X.me()) X.sfx("crackle"); }
    else if (ev.k === "result") {
        const g = ev.gain || {}, gotIt = s.ffa ? !!g["p" + X.me()] : !!(myTeam(s) && g[myTeam(s)]), c = $("Card" + ev.w);
        X.sfx("clashHit"); if (inMatch(s)) setTimeout(() => X.sfx(gotIt ? "clashWin" : "clashMiss"), 320);
        if (c) { const r = c.getBoundingClientRect(); X.burstText("+" + (s.duel || {}).pts, r.left + r.width / 2, r.top + r.height * .35, "#ffd36a"); sparks(c); }
        Object.keys(g).forEach(k => { if (!g[k]) return; const sc = $(s.ffa ? "Score" + k : "Score" + k); const tot = (s.score || {})[k] || 0; if (sc) X.countUp(sc, Math.max(0, tot - g[k]), tot, 800); });
    }
}
function sparks(card) {
    if (!X.motionOK()) return;
    const r = card.getBoundingClientRect(), fx = $("Fx"); if (!fx) return;
    for (let i = 0; i < 26; i++) {
        const h = el("i", "fd-spark"), ang = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 160;
        h.style.left = (r.left + r.width / 2) + "px"; h.style.top = (r.top + r.height * .4) + "px";
        h.style.setProperty("--dx", (Math.cos(ang) * dist).toFixed(0) + "px"); h.style.setProperty("--dy", (Math.sin(ang) * dist - 60).toFixed(0) + "px"); h.style.setProperty("--d", (Math.random() * .25).toFixed(2) + "s");
        fx.appendChild(h); setTimeout(() => h.remove(), 1500);
    }
}

/* ---------------- the end ---------------- */
function showOver(d, s) {
    const old = $("Over"); if (old) old.remove();
    const o = el("div", "fd-over clash"); o.id = "mlOver"; o.setAttribute("role", "dialog"); o.setAttribute("aria-label", "Final score");
    const card = el("div", "fd-ocard");
    card.appendChild(el("div", "fd-okick", (s.why === "out" ? "OUT OF QUESTIONS · " : "") + "MOST LIKELY · " + (s.ffa ? "FREE FOR ALL" : "TEAM VS TEAM")));
    let iWon = false;
    if (s.ffa) {
        const w = arr(s.winners).map(Number); iWon = w.includes(X.me());
        card.appendChild(el("h2", "fd-otitle", w.length === 1 ? X.pName(d, w[0]).toUpperCase() + " WINS!" : "SHARED WIN: " + w.map(p => X.pName(d, p)).join(" & ").toUpperCase()));
        const list = el("ol", "fd-orank");
        arr(s.players).map(Number).slice().sort((a, b) => (s.score["p" + b] || 0) - (s.score["p" + a] || 0)).forEach((p, i, all) => {
            const li = el("li", w.includes(p) ? "won" : ""), place = all.findIndex(q => (s.score["p" + q] || 0) === (s.score["p" + p] || 0)) + 1;
            li.append(el("span", "fd-orn", String(place)), X.avatarEl(X.pPub(d, p), { size: 30 }), el("b", null, X.pName(d, p) + (p === X.me() ? " (you)" : "")), el("strong", null, String(s.score["p" + p] || 0)));
            list.appendChild(li);
        });
        card.appendChild(list);
    } else {
        const win = s.winner; iWon = !!win && myTeam(s) === win; card.classList.add(win ? TEAM[win].cls : "draw");
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
    }
    const rl = el("ol", "fd-orounds");
    arr(s.log).forEach(L => {
        const li = el("li"), q = LIB.questions.find(x => x.questionId === L.id), g = L.gain || {}, chips = el("div", "fd-ochips");
        li.append(el("span", "fd-orn", L.sd ? "SD" : String(L.r)), el("span", "fd-orq", q ? qTextOf(q, s) : L.id));
        if (s.ffa) { const n = Object.values(g).filter(Boolean).length; li.appendChild(el("span", "fd-orw " + (n ? "both" : ""), n ? n + " right · +" + L.pts : "—")); }
        else li.appendChild(el("span", "fd-orw " + (g.A && g.B ? "both" : g.A ? "fd-a" : g.B ? "fd-b" : ""), g.A && g.B ? "BOTH +" + L.pts : g.A ? "CRIMSON +" + L.pts : g.B ? "GOLD +" + L.pts : "—"));
        ["a", "b"].forEach(k => {
            const tags = s.ffa ? Object.keys(L.picks || {}).filter(p => L.picks[p] === k).map(p => X.pName(d, Number(p.slice(1)))).join(", ") : ["A", "B"].filter(t => (L.picks || {})[t] === k).map(t => TEAM[t].short).join(" & ");
            chips.appendChild(el("span", L.w === k ? "win" : "", (L.w === k ? "★ " : "") + charName(L[k]) + (tags ? " · " + tags : "")));
        });
        li.appendChild(chips); rl.appendChild(li);
    });
    card.appendChild(rl);
    card.appendChild(el("p", "fd-onote", "Opinion duels are our editors' pick, labelled as such; strength, speed, toughness, skill and intelligence duels follow the Anime Draft ratings."));
    const btns = el("div", "fd-obtns");
    if (X.amHost()) { const a = el("button", "btn xl", "Rematch"); a.onclick = () => window.mlAgain(); const b = el("button", "btn ghost", "Back to lobby"); b.onclick = () => window.mlLobby(); btns.append(a, b); }
    else btns.appendChild(el("p", "fd-wait", "Waiting for " + X.pName(d, X.hostSlot(d)) + " to start a rematch or go back to the lobby."));
    card.appendChild(btns);
    o.appendChild(card); document.body.appendChild(o);
    X.sfx("taiko"); setTimeout(() => X.sfx(iWon ? "clashWin" : inMatch(s) ? "ohh" : "clashHit"), 380);
    if (X.motionOK()) confetti(o, ["#ff6a2a", "#ffc24a", "#fff1b8", "#d81a1a"]);
    setTimeout(() => { const f = o.querySelector("button"); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }, 60);
}
const qTextOf = (q, s) => qText(q.questionText, arr(s.series), label);
