/* =====================================================================
   NIGHT PARTY (mode 10): a tournament controller. It is not a game: it launches the existing modes one after the
   other with preset settings (game.js window.AAP_MODES), collects their standard results, scores placements
   (scoring.js) and shows live standings. Everything lives in the room, so it is live for everyone and survives
   reconnects and a change of host:
     rooms/<code>/npPlan   the host's setup (lobby, before START)
     rooms/<code>/np       the running tournament: { id, name, reward, plan, roster, res, phase, si, br, teams, sd, ... }
   Only the host drives it (npDuties); every client renders it (showParty) and pays itself at the end (npSync).

   phases:  next     intermission before stage si (the first one is the intro): chart, up next, host Start / countdown
            launch   the host is starting the stage's match
            play     a match is running (the mode's own screens; a HUD chip opens the chart)
            match    between two bracket matches of a duel stage
            results  the stage's results
            failed   the mode didn't start or was stopped: host Retry / Skip stage
            winner   the winner screen (then back to the lobby)
   Sudden death rounds are extra stages after the plan (weight 0, only the tied players).
   ===================================================================== */
import { NIGHT_PARTY as NP } from "./config.js?v=2";
import { stageIds, stageMeta, normalizeSettings, formatOf, stageFits, fastStages, estMinutes, estTotal } from "./stages.js?v=15";
import { standings, topTied, leadGap, lateStart, seedOrder, splitTeams, makeBracket, normBracket, nextMatch, recordWin, bracketDone, bracketPlacements, matchesLeft, adjustPlacements, sdWinners, BYE } from "./scoring.js?v=2";

let X = null;
const $ = id => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const arr = v => Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];
const btn = (txt, cls, fn) => { const b = el("button", "btn " + (cls || ""), txt); b.type = "button"; b.onclick = fn; return b; };
const f1 = v => { const r = Math.round((Number(v) || 0) * 10) / 10; return (r % 1 ? r.toFixed(1) : String(r)); };
const wTxt = w => "×" + f1(w);
const ORD = n => n + (n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th");
const PAUSE = ["next", "match", "results", "failed", "winner"];
const clock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

/* ================= plan (setup) ================= */
const TEAMS_HOW = ["auto", "random", "pick"];
export function normStage(s) {
    s = s && typeof s === "object" ? s : {};
    const mode = stageMeta(s.mode) ? s.mode : "likely";
    let w = Number(s.weight); if (!(w >= NP.customWeight.min && w <= NP.customWeight.max)) w = 1;
    return { mode, label: String(s.label || "").slice(0, NP.labelMax), weight: Math.round(w * 100) / 100, teams: TEAMS_HOW.includes(s.teams) ? s.teams : "auto", settings: normalizeSettings(mode, s.settings || {}) };
}
export function planOf(raw) {
    const p = raw && typeof raw === "object" ? raw : {};
    return {
        name: String(p.name || "Night Party").slice(0, NP.nameMax), reward: String(p.reward || "").slice(0, NP.rewardMax),
        players: Number(p.players) >= NP.players.min && Number(p.players) <= NP.players.max ? Number(p.players) : 0,
        tiebreaker: p.tiebreaker && p.tiebreaker !== "random" && fastStages().includes(p.tiebreaker) ? p.tiebreaker : "random",
        late: p.late === "zero" || p.late === "avg" ? p.late : NP.lateStart,
        count: NP.countdowns.includes(Number(p.count)) ? Number(p.count) : 0,
        stages: arr(p.stages).slice(0, NP.maxStages).map(normStage)
    };
}
export function validatePlan(plan, n) {
    const errors = [];
    if (n < NP.players.min || n > NP.players.max) errors.push({ i: -1, msg: "A Night Party takes " + NP.players.min + " to " + NP.players.max + " players (" + n + " here)." });
    if (!plan.stages.length) errors.push({ i: -1, msg: "Add at least one stage." });
    plan.stages.forEach((s, i) => { const f = stageFits(s.mode, s.settings, n); if (!f.ok) errors.push({ i, msg: "Stage " + (i + 1) + ": " + f.why }); });
    return { ok: !errors.length, errors };
}
const TEMPLATE_KEY = "aap_np_templates";
function myTemplates() { try { const v = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || "[]"); return Array.isArray(v) ? v.filter(t => t && t.name && t.plan) : []; } catch (e) { return []; } }
function saveTemplates(list) { try { localStorage.setItem(TEMPLATE_KEY, JSON.stringify(list.slice(0, 30))); return true; } catch (e) { return false; } }
const allTemplates = () => NP.templates.map(t => Object.assign({ builtIn: true }, t)).concat(myTemplates().map(t => Object.assign({ builtIn: false, id: "my:" + t.name }, t)));

/* ================= labels ================= */
const FIELD = { boardSize: "Board", difficulty: "Difficulty", rounds: "Rounds", laps: "Laps", unoDeck: "Deck", unoSp: "Specials", draftType: "Type", draftFmt: "Build size", draftRoles: "Roles", feudRounds: "Rounds", feudTimer: "Answer time", likelyPlay: "Play", likelyRounds: "Duels", likelyTimer: "Vote time", sketchMode: "Game type", sketchRounds: "Rounds", sketchTimer: "Draw time", sketchDiff: "Words" };
const VAL = {
    boardSize: v => v + " cards", difficulty: { easy: "Easy", normal: "Normal", hard: "Hard" }, laps: v => v + (v === 1 ? " lap" : " laps"),
    unoDeck: { classic: "Classic (4 series)", chaos: "Chaos (4-8)" }, unoSp: { once: "Used once", reuse: "Reusable" },
    draftType: { build: "Build (teams)", auction: "Auction (FFA)" }, draftFmt: v => v + "v" + v, draftRoles: { auto: "Series roles", classic: "Classic roles" },
    likelyPlay: { teams: "Team vs Team", ffa: "Free For All" }, sketchMode: { 0: "Classic", 1: "Contest" }, sketchDiff: { 0: "Mixed", 1: "Easy", 2: "Medium", 3: "Hard" },
    feudTimer: v => v + " s", likelyTimer: v => v + " s", sketchTimer: v => v + " s"
};
const valTxt = (k, v) => { const f = VAL[k]; return typeof f === "function" ? f(v) : f && f[v] != null ? f[v] : String(v); };
const modeName = m => (X && X.modeInfo(m).name) || (stageMeta(m) || {}).name || m;
const FMT_TXT = { duel: "1v1 bracket", ffa: "Everyone plays", teams: "Team vs Team" };
function settingsLine(mode, s) {
    s = normalizeSettings(mode, s) || {};
    const k = arr(s.animes).length, ser = k + (k === 1 ? " series" : " series");
    switch (mode) {
        case "classic": return s.boardSize + " cards · " + ser;
        case "headbanz": return s.rounds + " rounds · " + valTxt("difficulty", s.difficulty) + " · " + ser;
        case "imposter": return valTxt("laps", s.laps) + " · " + valTxt("difficulty", s.difficulty) + " · " + ser;
        case "uno": return (s.unoDeck === "chaos" ? "Chaos deck" : "Classic deck") + " · " + ser + (s.unoSp === "reuse" ? " · reusable specials" : "");
        case "draft": return (s.draftType === "auction" ? "Auction" : "Build " + s.draftFmt + "v" + s.draftFmt) + " · " + ser;
        case "feud": return s.feudRounds + " rounds · " + s.feudTimer + " s · " + ser;
        case "likely": return s.likelyRounds + " duels · " + s.likelyTimer + " s · " + ser;
        case "sketch": return (s.sketchMode === 1 ? "Contest" : "Classic") + " · " + s.sketchRounds + (s.sketchRounds === 1 ? " round" : " rounds") + " · " + s.sketchTimer + " s · " + ser;
        default: return ser;
    }
}

/* ================= the running tournament: helpers ================= */
const npOf = d => d && d.np && d.np.id ? d.np : null;
export const npActive = d => !!npOf(d);
const planStages = np => arr(np.plan && np.plan.stages).map(normStage);
function stageAt(np, si) {
    const st = planStages(np);
    if (si < st.length) return Object.assign({ idx: si, sd: false }, st[si]);
    const sd = np.sd || {};
    return { idx: si, sd: true, mode: sd.mode || "likely", settings: normalizeSettings(sd.mode || "likely", sd.settings || {}), weight: 0, label: "Sudden death" + ((sd.round | 0) > 1 ? " " + sd.round : ""), teams: "auto" };
}
const fmtOf = stg => formatOf(stg.mode, stg.settings);
const rosterOf = np => np.roster || {};
const resOf = np => np.res || {};
function presentMap(d) { const m = {}; X.activeSlots(d).forEach(s => { const u = (d["player" + s] || {}).uid; if (u) m[u] = s; }); return m; }
const rowsOf = np => standings(rosterOf(np), resOf(np), planStages(np).length);
function poolFn(np) { const m = Object.fromEntries(rowsOf(np).map(r => [r.id, r.pool])); return id => m[id] || 0; }
function participants(d, np, stg) {
    const pm = presentMap(d); let ids = Object.keys(rosterOf(np)).filter(id => pm[id]);
    if (stg.sd) { const t = arr(np.sd && np.sd.ids); ids = ids.filter(id => t.includes(id)); }
    return ids;
}
function nameOf(d, np, id) { const s = presentMap(d)[id]; return s ? X.pName(d, s) : ((rosterOf(np)[id] || {}).name || "Player"); }
function avaOf(d, np, id, size) {
    const s = presentMap(d)[id], r = rosterOf(np)[id] || {};
    return X.avatarEl(s ? X.pPub(d, s) : { name: r.name || "?", col: r.col || "#777" }, { size });
}
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
const resList = np => Object.keys(resOf(np)).map(Number).filter(k => resOf(np)[k]).sort((a, b) => a - b);
const npSet = patch => X.update(X.ref(X.db, "rooms/" + X.room() + "/np"), patch);

/* ================= lobby: START + the plan summary ================= */
export function npReq(d) {
    const plan = planOf(d.npPlan), n = X.activeSlots(d).length, v = validatePlan(plan, n);
    if (!d.npPlan) return { ok: false, msg: X.amHost() ? "Set up the night first: SET UP THE NIGHT in the Night Party box." : "The host is setting up the Night Party." };
    if (!v.ok) return { ok: false, msg: v.errors[0].msg };
    return { ok: true, msg: "Night Party · " + plan.name + " · " + plan.stages.length + " stage" + (plan.stages.length === 1 ? "" : "s") + " · about " + Math.round(estTotal(plan.stages, n)) + " min" };
}
export async function npStart() {
    const d = X.data(); if (!d || !X.amHost() || npOf(d)) return;
    const req = npReq(d); if (!req.ok) { X.toast(req.msg); return; }
    const plan = planOf(d.npPlan), roster = {};
    X.activeSlots(d).forEach(s => { const p = d["player" + s] || {}; if (p.uid) roster[p.uid] = { slot: s, name: p.name || "Player " + s, col: p.col || "", joined: 0, start: 0, gone: false }; });
    const now = Date.now();
    const np = { id: "n" + now.toString(36), name: plan.name, reward: plan.reward, started: now, phase: "next", si: 0, seq: 0, due: plan.count ? now + plan.count * 1000 : 0,
        plan: { stages: plan.stages, tiebreaker: plan.tiebreaker, late: plan.late, count: plan.count }, roster };
    try { await X.update(X.ref(X.db, "rooms/" + X.room()), { np, seatsOnly: null }); X.sfx("start"); }
    catch (e) { console.error(e); X.toast("Couldn't start the Night Party."); }
}
export function partyLobby(d, lock) {
    const box = $("partyBox"); if (!box) return;
    const plan = planOf(d.npPlan), n = X.activeSlots(d).length, v = validatePlan(plan, plan.players || n), has = !!d.npPlan;
    const sig = JSON.stringify([d.npPlan || null, n, lock]); if (box.dataset.sig === sig) return; box.dataset.sig = sig;
    box.innerHTML = "";
    const hero = el("div", "np-lhero");
    hero.append(el("span", "np-lk", "宴"), (() => { const t = el("div"); t.append(el("b", null, "NIGHT PARTY"), el("p", null, "A tournament of the other modes: build a path of stages, everyone plays them in a row, placements score points on a live race track. The winner takes the reward.")); return t; })());
    box.appendChild(hero);
    if (has) {
        const sum = el("div", "np-lsum");
        sum.append(el("b", "np-lname", plan.name), plan.reward ? el("span", "np-lrew", "🎁 " + plan.reward) : el("span"));
        const chips = el("ol", "np-lchips");
        plan.stages.forEach((s, i) => { const c = el("li", "np-lchip" + (v.errors.some(e => e.i === i) ? " bad" : "")); c.style.setProperty("--mc", X.modeInfo(s.mode).color); c.append(el("i", null, X.modeInfo(s.mode).kanji), el("span", null, (s.label || modeName(s.mode))), el("em", null, wTxt(s.weight))); chips.appendChild(c); });
        sum.appendChild(chips);
        sum.appendChild(el("small", "np-lmeta", plan.stages.length + " stages · about " + Math.round(estTotal(plan.stages, n)) + " min with " + n + " players"));
        if (!v.ok) sum.appendChild(el("p", "np-lerr", v.errors[0].msg));
        box.appendChild(sum);
    } else box.appendChild(el("p", "anime-hint", lock ? "The host is building the path." : "No path yet: open the setup to build one (or load a template)."));
    box.appendChild(btn(lock ? "View the plan" : (has ? "Edit the night" : "Set up the night"), lock ? "ghost sm" : "alt", () => openSetup()));
}

/* ================= SETUP SHEET (host edits, everyone else reads) ================= */
let draft = null, draftLock = true, saveT = 0;
export function openSetup() {
    const d = X.data(); if (!d) return;
    draftLock = !X.amHost() || !!npOf(d) || (d.status && d.status !== "waiting");
    draft = planOf(d.npPlan || (draftLock ? null : NP.templates.find(t => t.id === "quick-three").plan));
    if (!d.npPlan && !draftLock) saveDraft(true);
    renderSetup(); X.openOverlay("npSetup");
}
function saveDraft(now) {
    if (draftLock) return;
    clearTimeout(saveT);
    const go = () => { const d = X.data(); if (d && X.amHost() && !npOf(d)) X.lobbySet({ npPlan: JSON.parse(JSON.stringify(draft)) }); };
    if (now) go(); else saveT = setTimeout(go, 350);
}
const touch = (rerender) => { saveDraft(false); if (rerender) renderSetup(); else renderSetupFoot(); };
function chips(list, cur, fmt, onPick, lock) {
    const box = el("div", "np-chips");
    list.forEach(v => { const b = el("button", "modebtn" + (String(v) === String(cur) ? " selected" : ""), fmt(v)); b.type = "button"; b.disabled = lock; b.onclick = () => onPick(v); box.appendChild(b); });
    return box;
}
function field(label, ctl) { const f = el("label", "np-f"); f.append(el("span", "field-label", label), ctl); return f; }
function renderSetup() {
    const body = $("npSetupBody"); if (!body || !draft) return;
    const d = X.data(), roomN = d ? X.activeSlots(d).length : 2, n = draft.players || roomN, lock = draftLock;
    const y = body.scrollTop; body.innerHTML = "";
    if (lock) body.appendChild(el("p", "np-ro", npOf(d) ? "The Night Party is running: this is its plan." : "Only the host edits the plan. It updates here live."));
    // the night
    const top = el("div", "np-sgrid");
    const name = el("input"); name.value = draft.name; name.maxLength = NP.nameMax; name.disabled = lock; name.oninput = () => { draft.name = name.value; touch(false); };
    const rew = el("input"); rew.value = draft.reward; rew.maxLength = NP.rewardMax; rew.placeholder = "e.g. Winner picks the next anime we watch"; rew.disabled = lock; rew.oninput = () => { draft.reward = rew.value; touch(false); };
    top.append(field("Tournament name", name), field("Reward", rew));
    const pn = el("select"); pn.disabled = lock;
    [0, 2, 3, 4, 5, 6, 7, 8].forEach(k => { const o = el("option", null, k ? k + " players" : "Players in the room (" + roomN + ")"); o.value = k; if (k === draft.players) o.selected = true; pn.appendChild(o); });
    pn.onchange = () => { draft.players = Number(pn.value); touch(true); };
    const tb = el("select"); tb.disabled = lock;
    [["random", "Random fast mode"]].concat(fastStages().map(m => [m, modeName(m) + (formatOf(m, NP.tiebreaker.settings[m] || {}) === "duel" ? " (1v1, bracket if 3+ tie)" : "")])).forEach(([k, l]) => { const o = el("option", null, l); o.value = k; if (k === draft.tiebreaker) o.selected = true; tb.appendChild(o); });
    tb.onchange = () => { draft.tiebreaker = tb.value; touch(false); };
    const lt = el("select"); lt.disabled = lock;
    [["avg", "Start at the average pool"], ["zero", "Start at 0"]].forEach(([k, l]) => { const o = el("option", null, l); o.value = k; if (k === draft.late) o.selected = true; lt.appendChild(o); });
    lt.onchange = () => { draft.late = lt.value; touch(false); };
    top.append(field("Plan for", pn), field("Tiebreaker (sudden death)", tb), field("Late joiners", lt),
        field("Intermission countdown", chips(NP.countdowns, draft.count, v => v ? v + " s" : "Off (host)", v => { draft.count = v; touch(true); }, lock)));
    body.appendChild(top);
    // templates
    if (!lock) {
        const tp = el("div", "np-tpl"), sel = el("select"), list = allTemplates();
        list.forEach((t, i) => { const o = el("option", null, (t.builtIn ? "★ " : "") + t.name + (t.note ? " · " + t.note : "")); o.value = i; sel.appendChild(o); });
        const load = btn("Load", "ghost sm", () => { const t = list[Number(sel.value)]; if (!t) return; draft = planOf(t.plan); X.sfx("pick"); X.toast("Loaded " + t.name); touch(true); });
        const save = btn("Save as template", "ghost sm", () => {
            const nm = (draft.name || "My night").trim(), mine = myTemplates().filter(t => t.name !== nm);
            if (saveTemplates([{ name: nm, plan: JSON.parse(JSON.stringify(draft)) }].concat(mine))) { X.toast("Saved the template \"" + nm + "\" on this device."); renderSetup(); }
        });
        const del = btn("Delete", "ghost sm", () => { const t = list[Number(sel.value)]; if (!t || t.builtIn) { X.toast("Built-in templates can't be deleted."); return; } saveTemplates(myTemplates().filter(x => x.name !== t.name)); renderSetup(); });
        tp.append(el("span", "field-label", "Templates"), sel, load, save, del);
        body.appendChild(tp);
    }
    // the path
    const path = el("ol", "np-path");
    draft.stages.forEach((s, i) => path.appendChild(stageCard(s, i, n, lock)));
    body.appendChild(path);
    if (!lock && draft.stages.length < NP.maxStages) {
        const add = el("div", "np-add"), ms = el("select");
        stageIds().forEach(m => { const o = el("option", null, modeName(m)); o.value = m; ms.appendChild(o); });
        add.append(ms, btn("+ Add stage", "alt sm", () => { draft.stages.push(normStage({ mode: ms.value, weight: 1, settings: seriesDefault(ms.value) })); X.sfx("pick"); touch(true); }));
        body.appendChild(add);
    }
    const foot = el("div", "np-sfoot"); foot.id = "npSetupFoot"; body.appendChild(foot);
    renderSetupFoot();
    body.scrollTop = y;
}
/* a new stage starts with series that exist for that mode */
function seriesDefault(mode) { const list = X.seriesFor(mode).map(x => x.k); const def = normalizeSettings(mode, {}); def.animes = def.animes.filter(k => list.includes(k)); if (!def.animes.length) def.animes = list.slice(0, mode === "uno" ? 4 : 1); if (mode === "uno") def.animes = list.slice(0, 4); return def; }
function renderSetupFoot() {
    const f = $("npSetupFoot"); if (!f || !draft) return;
    const d = X.data(), n = draft.players || (d ? X.activeSlots(d).length : 2), v = validatePlan(draft, n);
    f.innerHTML = "";
    f.append(el("b", null, draft.stages.length + " stage" + (draft.stages.length === 1 ? "" : "s") + " · about " + Math.round(estTotal(draft.stages, n)) + " min for " + n + " players"),
        el("span", v.ok ? "np-ok" : "np-bad", v.ok ? "✓ Ready: press START NIGHT PARTY in the lobby" : v.errors[0].msg));
    f.appendChild(btn("Done", "sm", () => X.closeOverlay("npSetup")));
}
function stageCard(s, i, n, lock) {
    const li = el("li", "np-stage"), info = X.modeInfo(s.mode), fit = stageFits(s.mode, s.settings, n), fmt = formatOf(s.mode, s.settings);
    li.style.setProperty("--mc", info.color);
    if (!fit.ok) li.classList.add("bad");
    const head = el("div", "np-sh");
    head.appendChild(el("span", "np-sn", String(i + 1)));
    const ms = el("select", "np-smode"); ms.disabled = lock; ms.setAttribute("aria-label", "Mode of stage " + (i + 1));
    stageIds().forEach(m => { const o = el("option", null, modeName(m)); o.value = m; if (m === s.mode) o.selected = true; ms.appendChild(o); });
    ms.onchange = () => { draft.stages[i] = normStage({ mode: ms.value, label: s.label, weight: s.weight, teams: s.teams, settings: seriesDefault(ms.value) }); touch(true); };
    const lab = el("input", "np-slabel"); lab.value = s.label; lab.placeholder = "Label (e.g. Final Round)"; lab.maxLength = NP.labelMax; lab.disabled = lock; lab.oninput = () => { draft.stages[i].label = lab.value; touch(false); };
    const acts = el("div", "np-sacts");
    if (!lock) {
        const mv = (k, t, fn) => { const b = el("button", "chip-btn", t); b.type = "button"; b.setAttribute("aria-label", k); b.onclick = fn; return b; };
        acts.append(mv("Move up", "↑", () => { if (!i) return; [draft.stages[i - 1], draft.stages[i]] = [draft.stages[i], draft.stages[i - 1]]; touch(true); }),
            mv("Move down", "↓", () => { if (i >= draft.stages.length - 1) return; [draft.stages[i + 1], draft.stages[i]] = [draft.stages[i], draft.stages[i + 1]]; touch(true); }),
            mv("Duplicate", "⧉", () => { if (draft.stages.length >= NP.maxStages) return; draft.stages.splice(i + 1, 0, JSON.parse(JSON.stringify(s))); touch(true); }),
            mv("Delete", "✕", () => { draft.stages.splice(i, 1); touch(true); }));
    }
    head.append(ms, lab, acts);
    li.appendChild(head);
    // weight
    const wr = el("div", "np-srow"); wr.appendChild(el("span", "field-label", "Weight"));
    const custom = !NP.weights.includes(s.weight);
    wr.appendChild(chips(NP.weights.concat(["custom"]), custom ? "custom" : s.weight, v => v === "custom" ? "Custom" : wTxt(v), v => { draft.stages[i].weight = v === "custom" ? (custom ? s.weight : 2.5) : v; touch(true); }, lock));
    if (custom) { const ci = el("input", "np-wnum"); ci.type = "number"; ci.min = NP.customWeight.min; ci.max = NP.customWeight.max; ci.step = NP.customWeight.step; ci.value = s.weight; ci.disabled = lock; ci.onchange = () => { draft.stages[i] = normStage(Object.assign({}, draft.stages[i], { weight: Number(ci.value) })); touch(true); }; wr.appendChild(ci); }
    li.appendChild(wr);
    // settings
    const det = el("details", "np-sset"); const sm = el("summary"); sm.append(el("b", null, FMT_TXT[fmt]), el("span", null, " · " + settingsLine(s.mode, s.settings) + " · ~" + Math.round(estMinutes(s.mode, s.settings, n)) + " min")); det.appendChild(sm);
    Object.entries(stageMeta(s.mode).settings).forEach(([k, f]) => {
        const row = el("div", "np-srow");
        if (f.series) {
            row.appendChild(el("span", "field-label", "Series"));
            const sb = el("div", "np-chips np-series");
            X.seriesFor(s.mode).forEach(({ k: key, label }) => {
                const on = s.settings.animes.includes(key), b = el("button", "modebtn" + (on ? " selected" : ""), label); b.type = "button"; b.disabled = lock;
                b.onclick = () => { const cur = draft.stages[i].settings.animes; draft.stages[i].settings.animes = on ? cur.filter(x => x !== key) : cur.concat([key]); if (!draft.stages[i].settings.animes.length) draft.stages[i].settings.animes = [key]; touch(true); };
                sb.appendChild(b);
            });
            row.appendChild(sb);
        } else {
            row.appendChild(el("span", "field-label", FIELD[k] || k));
            row.appendChild(chips(f.choices, s.settings[k], v => valTxt(k, v), v => { draft.stages[i].settings[k] = v; touch(true); }, lock));
        }
        det.appendChild(row);
    });
    if (fmt === "teams") {
        const row = el("div", "np-srow"); row.appendChild(el("span", "field-label", "Teams"));
        row.appendChild(chips(TEAMS_HOW, s.teams, v => ({ auto: "Balanced by standings", random: "Random", pick: "Host picks before the stage" })[v], v => { draft.stages[i].teams = v; touch(true); }, lock));
        det.appendChild(row);
    }
    li.appendChild(det);
    li.appendChild(el("p", fit.ok ? "np-fit" : "np-fit bad", fit.ok ? "✓ " + FMT_TXT[fmt] + (fmt === "duel" ? " · " + (n - 1) + " matches" : "") + " · fits " + n + " players" : fit.why));
    if (!fit.ok && !lock && s.mode === "draft" && formatOf("draft", s.settings) === "teams" && n % 2 === 0) li.appendChild(btn("Use " + n / 2 + "v" + n / 2, "ghost sm", () => { draft.stages[i].settings.draftFmt = Math.min(4, n / 2); touch(true); }));
    return li;
}

/* ================= CONTROLLER (host only) ================= */
let busy = "", holdKey = "", dutyTimer = 0;
const offSince = {};
export function npDuties(d) {
    if (!npOf(d)) { if (dutyTimer) { clearInterval(dutyTimer); dutyTimer = 0; } return; }
    if (!dutyTimer) dutyTimer = setInterval(() => { const d2 = X.data(); if (d2 && npOf(d2) && X.amHost()) step(d2); else if (!npOf(d2)) { clearInterval(dutyTimer); dutyTimer = 0; } }, 1000);
    setTimeout(() => { const d2 = X.data(); if (d2 && npOf(d2) && X.amHost()) step(d2); }, 0);     // never write inside the room listener
}
async function step(d) {
    if (busy) return;
    const np = npOf(d), st = d.status || "waiting", now = Date.now();
    if (PAUSE.includes(np.phase) && st !== "waiting") { busy = "abort"; try { await X.modes.abort(); } finally { busy = ""; } return; }
    if (np.phase === "next" || np.phase === "results" || np.phase === "failed") syncRoster(d, np, true);
    else if (np.phase === "match") syncRoster(d, np, false);
    if (np.phase === "next") { if (prepareNext(d, np)) return; if (np.due && now >= np.due) return go("launch"); }
    if (np.phase === "match" && np.due && now >= np.due) return go("launch");
    if (np.phase === "launch") return launch(d, np);
    if (np.phase === "play") return watch(d, np);
}
const go = phase => npSet({ phase, due: 0, err: null });
/* between stages: late joiners join the roster, players who left are greyed out (gone), and come back if they return */
function syncRoster(d, np, allowJoin) {
    const pm = presentMap(d), R = rosterOf(np), patch = {}, rows = rowsOf(np);
    Object.entries(R).forEach(([id, r]) => {
        const s = pm[id], gone = !s;
        if (!!r.gone !== gone) patch["roster/" + id + "/gone"] = gone;
        if (s && r.slot !== s) patch["roster/" + id + "/slot"] = s;
        if (s) { const nm = X.pName(d, s); if (nm !== r.name) patch["roster/" + id + "/name"] = nm; }
    });
    if (allowJoin) Object.entries(pm).forEach(([id, s]) => {
        if (R[id]) return;
        const present = Object.keys(R).filter(k => pm[k]), p = d["player" + s] || {};
        patch["roster/" + id] = { slot: s, name: p.name || "Player " + s, col: p.col || "", joined: np.phase === "results" ? (np.si | 0) + 1 : np.si | 0, start: lateStart(rows, present, (np.plan || {}).late || NP.lateStart), gone: false };
    });
    if (Object.keys(patch).length) npSet(patch).catch(() => {});
}
/* the stage coming up: its bracket (duel) or its team split, kept in step with who is here */
function prepareNext(d, np) {
    const stg = stageAt(np, np.si), fmt = fmtOf(stg), ids = participants(d, np, stg), pool = poolFn(np);
    if (fmt === "duel") {
        const br = normBracket(np.br), have = br ? br.rounds[0].flatMap(m => [m.a, m.b]).filter(x => x && x !== BYE) : [];
        if (ids.length >= 2 && (!br || !sameSet(have, ids))) { npSet({ br: makeBracket(seedOrder(ids, pool)) }).catch(() => {}); return true; }
    }
    if (fmt === "teams") {
        const T = np.teams ? { A: arr(np.teams.A), B: arr(np.teams.B) } : null;
        if (ids.length >= 2 && (!T || !sameSet(T.A.concat(T.B), ids))) { npSet({ teams: splitTeams(ids, pool, stg.teams === "random" ? "random" : "auto") }).catch(() => {}); return true; }
    }
    return false;
}
async function launch(d, np) {
    if (d.status && d.status !== "waiting" && d.matchId) {           // the match already runs (the host reloaded mid-launch)
        await npSet({ phase: "play", match: Object.assign({ r: -1, i: -1 }, np.match || {}, { matchId: Number(d.matchId), seats: X.modes.seats(d) }) }); return;
    }
    busy = "launch";
    try {
        const stg = stageAt(np, np.si), fmt = fmtOf(stg), pm = presentMap(d), drop = np.drop || {};
        let ids = participants(d, np, stg), seats, teams = null, m = null;
        if (fmt === "duel") {
            let br = normBracket(np.br);
            const have = br ? br.rounds[0].flatMap(x => [x.a, x.b]).filter(x => x && x !== BYE) : [];
            const played = br ? br.rounds.flat().some(x => x.w && x.a !== BYE && x.b !== BYE) : false;
            if (!br || (!played && !sameSet(have, ids))) br = makeBracket(seedOrder(ids, poolFn(np)));
            if (ids.length < 2 && !played) return await failStage("Not enough players here for this stage.");
            m = nextMatch(br);
            if (!m) { await finishStage(d, np, bracketPlacements(br), { br }); return; }
            const miss = [m.a, m.b].filter(id => !pm[id] || drop[id]);
            if (miss.length) { recordWin(br, m.r, m.i, miss.length === 2 || miss[0] === m.b ? m.a : m.b); await afterDuel(d, np, br, true); return; }
            seats = [pm[m.a], pm[m.b]];
            await npSet({ br });
        } else {
            if (stg.sd && ids.length === 1) { await finishStage(d, np, [{ id: ids[0], place: 1 }], {}); return; }
            if (ids.length < 2) return await failStage("Not enough players here for this stage.");
            seats = ids.map(id => pm[id]);
            if (fmt === "teams") {
                let T = np.teams ? { A: arr(np.teams.A).filter(id => pm[id]), B: arr(np.teams.B).filter(id => pm[id]) } : null;
                if (!T || !T.A.length || !T.B.length || !sameSet(T.A.concat(T.B), ids)) T = splitTeams(ids, poolFn(np), stg.teams === "random" ? "random" : "auto");
                teams = { A: T.A.map(id => pm[id]), B: T.B.map(id => pm[id]) };
                await npSet({ teams: T });
            }
        }
        const r = await X.modes.launch(stg.mode, stg.settings, { seats, teams });
        const fresh = npOf(X.data()); if (!fresh || fresh.id !== np.id) return;          // discarded meanwhile
        if (!r.ok) await npSet({ phase: "failed", err: r.error || "The mode didn't start." });
        else await npSet({ phase: "play", err: null, off: null, match: { matchId: r.matchId, seats: r.seats, r: m ? m.r : -1, i: m ? m.i : -1, at: Date.now() } });
    } catch (e) { console.error(e); await npSet({ phase: "failed", err: "Something went wrong starting the stage." }).catch(() => {}); }
    finally { busy = ""; }
}
const failStage = err => npSet({ phase: "failed", err });
/* a stage's match is running: offline players, the end of the match, or a match that vanished */
function watch(d, np) {
    const st = d.status || "waiting", mt = np.match || {};
    if (st === "waiting") { if (!holdKey) stopped(d, np); return; }
    if (mt.matchId && Number(d.matchId) !== Number(mt.matchId) && !holdKey) { busy = "abort"; X.modes.abort().finally(() => { busy = ""; }); return; }   // a rematch nobody asked for
    if (trackOffline(d, np)) return;
    if (!X.modes.over(d)) return;
    const r = X.modes.result(d); if (!r) return;
    const k = np.id + ":" + d.matchId; if (holdKey === k) return; holdKey = k;
    setTimeout(() => { finishMatch(r).catch(e => console.error(e)).finally(() => { holdKey = ""; }); }, X.motionOK() ? NP.resultHoldMs : 1500);
}
async function finishMatch(r) {
    const d = X.data(), np = npOf(d); if (!np || !X.amHost() || np.phase !== "play") return;
    busy = "finish";
    try {
        const stg = stageAt(np, np.si), fmt = fmtOf(stg), pm = presentMap(d), drop = Object.keys(np.drop || {});
        const uidOf = slot => (r.players.find(p => p.slot === slot) || {}).uid || (d["player" + slot] || {}).uid || "";
        if (fmt === "duel") {
            const br = normBracket(np.br), mt = np.match || {}, mm = br && br.rounds[mt.r] && br.rounds[mt.r][mt.i];
            if (!mm) { await failStage("The bracket lost track of this match."); return; }
            let w = uidOf((r.placements.find(p => p.place === 1) || {}).slot);
            if (w !== mm.a && w !== mm.b) w = mm.a;
            const other = w === mm.a ? mm.b : mm.a;
            if (drop.includes(w) && !drop.includes(other) && pm[other]) w = other;           // a dropped duelist forfeits
            recordWin(br, mt.r, mt.i, w);
            await afterDuel(d, np, br, false, r.key);
        } else {
            let pl = r.placements.map(p => ({ id: uidOf(p.slot), place: p.place })).filter(p => p.id && rosterOf(np)[p.id]);
            pl = adjustPlacements(pl, { remove: pl.filter(p => !pm[p.id]).map(p => p.id), last: drop });
            const teams = r.teams ? r.teams.map(t => ({ name: t.name, ids: t.slots.map(uidOf), place: t.place })) : null;
            await finishStage(d, np, pl, { keys: [r.key], teams });
        }
    } finally { busy = ""; }
}
async function afterDuel(d, np, br, walkover, key) {
    if (bracketDone(br)) { await finishStage(d, np, bracketPlacements(br), { br }); return; }
    await npSet({ br, phase: "match", match: null, drop: null, off: null, due: Date.now() + NP.bracketGapSec * 1000, walk: walkover ? Date.now() : null });
    await X.modes.abort();
}
async function finishStage(d, np, placements, extra) {
    const stg = stageAt(np, np.si);
    const entry = { mode: stg.mode, label: stg.label || "", weight: stg.weight, format: fmtOf(stg), sd: !!stg.sd, n: placements.length, placements, at: Date.now() };
    if (extra.br) entry.br = extra.br;
    if (extra.teams) entry.teams = extra.teams;
    if (extra.keys) entry.keys = extra.keys;
    const dropped = Object.keys(np.drop || {}); if (dropped.length) entry.dropped = dropped;
    await npSet({ ["res/" + np.si]: entry, phase: "results", match: null, due: 0, drop: null, off: null, br: null, teams: null, err: null });
    await X.modes.abort();
}
/* the match ended without a result (stopped from a menu, too many players left): a duel with a missing player is a
   walkover; anything else asks the host to retry or skip */
async function stopped(d, np) {
    const stg = stageAt(np, np.si), fmt = fmtOf(stg), mt = np.match || {};
    if (fmt === "duel" && mt.r >= 0) {
        const br = normBracket(np.br), m = br && br.rounds[mt.r] && br.rounds[mt.r][mt.i], pm = presentMap(d), drop = np.drop || {};
        if (m && !m.w) {
            const out = [m.a, m.b].filter(id => !pm[id] || drop[id]);
            if (out.length) { busy = "walk"; try { recordWin(br, mt.r, mt.i, out.length === 2 || out[0] === m.b ? m.a : m.b); await afterDuel(d, np, br, true); } finally { busy = ""; } return; }
        }
    }
    busy = "stop";
    try { await npSet({ phase: "failed", match: null, err: "The " + modeName(stg.mode) + " match stopped before it finished." }); } finally { busy = ""; }
}
/* players offline during a stage: shown to everyone; after disconnectSec they are scored last (a duelist forfeits) */
function trackOffline(d, np) {
    const mt = np.match || {}, pres = d.presence || {}, now = Date.now(), patch = {};
    let walk = null;
    arr(mt.seats).map(Number).forEach(s => {
        const id = (d["player" + s] || {}).uid; if (!id) return;
        if (pres["p" + s] === false) {
            if (!offSince[id]) offSince[id] = now;
            if (!(np.off || {})[id]) patch["off/" + id] = offSince[id];
            if (now - offSince[id] >= NP.disconnectSec * 1000 && !(np.drop || {})[id]) { patch["drop/" + id] = true; if (mt.r >= 0) walk = id; }
        } else if (offSince[id] || (np.off || {})[id]) { delete offSince[id]; patch["off/" + id] = null; }
    });
    if (Object.keys(patch).length) npSet(patch).catch(() => {});
    if (walk) {
        const br = normBracket(np.br), m = br && br.rounds[mt.r] && br.rounds[mt.r][mt.i];
        if (m && !m.w) { busy = "walk"; recordWin(br, mt.r, mt.i, walk === m.a ? m.b : m.a); afterDuel(d, np, br, true).catch(console.error).finally(() => { busy = ""; }); return true; }
    }
    return false;
}
/* after a stage's results: the next stage, or the end (sudden death if the top is tied) */
async function advance() {
    const d = X.data(), np = npOf(d); if (!np || !X.amHost() || np.phase !== "results" && np.phase !== "failed") return;
    const plen = planStages(np).length, si = np.si | 0, cur = stageAt(np, si), now = Date.now(), count = (np.plan || {}).count | 0;
    const base = { br: null, teams: null, match: null, err: null, drop: null, off: null, due: 0 };
    if (cur.sd) {
        const r = resOf(np)[si], w = r && !r.skipped ? sdWinners(r.placements).filter(id => presentMap(d)[id]) : arr(np.sd && np.sd.ids).filter(id => presentMap(d)[id]);
        if (w.length === 1) return finish(w[0], false);
        const ids = w.length ? w : arr(np.sd.ids);
        if ((np.sd.round | 0) >= NP.maxSuddenRounds || ids.length < 2) return finish(ids[(Math.random() * ids.length) | 0] || ids[0], true);
        return npSet(Object.assign(base, { phase: "next", si: si + 1, sd: Object.assign({}, np.sd, { round: (np.sd.round | 0) + 1, ids }) }));
    }
    if (si + 1 < plen) return npSet(Object.assign(base, { phase: "next", si: si + 1, due: count ? now + count * 1000 : 0 }));
    const rows = rowsOf(np).filter(r => presentMap(d)[r.id]), top = topTied(rows);
    if (top.length <= 1) return finish(top[0] || (rows[0] || {}).id || "", false);
    const tb = pickTiebreaker(np, top.length);
    return npSet(Object.assign(base, { phase: "next", si: plen, sd: { round: 1, ids: top, mode: tb.mode, settings: tb.settings } }));
}
function pickTiebreaker(np, n) {
    const want = (np.plan || {}).tiebreaker || "random";
    const fits = m => stageFits(m, NP.tiebreaker.settings[m] || {}, n).ok;
    const pool = want !== "random" && fits(want) ? [want] : fastStages().filter(fits);
    const mode = pool[(Math.random() * pool.length) | 0] || "likely";
    const used = planStages(np).find(s => s.mode === mode);       // the series the night already used for that mode
    return { mode, settings: normalizeSettings(mode, Object.assign({}, used ? { animes: used.settings.animes } : {}, NP.tiebreaker.settings[mode] || {})) };
}
const finish = (winner, flip) => npSet({ phase: "winner", winner, flip: !!flip, ended: Date.now(), due: 0, br: null, teams: null, match: null, err: null });

/* ---------- host buttons ---------- */
function hostOnly() { const d = X.data(); if (!npOf(d) || !X.amHost()) { X.toast("Only the host runs the Night Party."); return null; } return d; }
async function npGo() { const d = hostOnly(); if (!d) return; const np = npOf(d); X.sfx("click"); if (np.phase === "next" || np.phase === "match") return go("launch"); if (np.phase === "results") return advance(); }
async function npRetry() { const d = hostOnly(); if (!d) return; X.sfx("click"); return npSet({ phase: "launch", err: null, seq: (npOf(d).seq | 0) + 1 }); }
async function npSkip() {
    const d = hostOnly(); if (!d) return; const np = npOf(d), stg = stageAt(np, np.si);
    if (!(await X.uiConfirm({ title: "Skip this stage?", text: "Nobody scores for " + (stg.label || modeName(stg.mode)) + ". The standings so far stay as they are.", ok: "Skip stage" }))) return;
    await npSet({ ["res/" + np.si]: { mode: stg.mode, label: stg.label || "", weight: stg.weight, format: fmtOf(stg), sd: !!stg.sd, skipped: true, placements: [], n: 0, at: Date.now() }, phase: "results", err: null, match: null, br: null, teams: null });
    await X.modes.abort();
}
async function npHold() { const d = hostOnly(); if (!d) return; const np = npOf(d); return npSet({ due: np.due ? 0 : Date.now() + Math.max(15, (np.plan || {}).count | 0) * 1000 }); }
async function npEnd() {
    const d = hostOnly(); if (!d) return;
    if (!(await X.uiConfirm({ title: "End the Night Party?", text: "The tournament is thrown away (no bonus coins) and everyone goes back to the lobby. Coins already won in its games stay.", ok: "End it", danger: true }))) return;
    await endParty();
}
async function endParty() {
    try { await X.modes.abort(); } catch (e) {}
    await X.update(X.ref(X.db, "rooms/" + X.room()), { np: null, gameType: "party", seatsOnly: null });
}
async function npLobby() { const d = hostOnly(); if (!d) return; X.sfx("click"); await endParty(); }
function npTeamTap(id) {
    const d = hostOnly(); if (!d) return; const np = npOf(d); if (np.phase !== "next" || !np.teams) return;
    const A = arr(np.teams.A), B = arr(np.teams.B), inA = A.includes(id);
    const T = { A: inA ? A.filter(x => x !== id) : A.concat([id]), B: inA ? B.concat([id]) : B.filter(x => x !== id) };
    if (!T.A.length || !T.B.length) { X.toast("Each team needs at least one player."); return; }
    X.sfx("toggle"); npSet({ teams: T });
}

/* ================= every client: prep, host takeover, rewards, HUD ================= */
let prepKey = "", hostOff = { slot: 0, since: 0 }, tickT = 0, lastPhase = "";
const rewarded = new Set();
export function npSync(d) {
    const np = npOf(d);
    document.body.classList.toggle("np-on", !!np);
    if (!np) { hud(null); lastPhase = ""; return; }
    // upcoming stage: its pictures download on every device in advance (Headbanz / Imposter)
    if (["next", "match", "launch"].includes(np.phase)) { const stg = stageAt(np, np.si), k = np.id + ":" + np.si; if (prepKey !== k) { prepKey = k; try { X.modes.prepFor(stg.mode, stg.settings); } catch (e) {} } }
    // sounds on phase changes
    const pk = np.phase + ":" + np.si;
    if (lastPhase && pk !== lastPhase) { if (np.phase === "results") X.sfx("stamp"); if (np.phase === "winner") X.sfx("achievement"); if (np.phase === "next" && np.sd) X.sfx("slam"); }
    lastPhase = pk;
    // the end: bonus coins + profile, once per tournament
    if (np.phase === "winner" && np.winner) {
        const k = X.room() + ":" + np.id, me = X.uid(), R = rosterOf(np);
        if (!rewarded.has(k) && R[me]) {
            rewarded.add(k);
            const mine = rowsOf(np).find(r => r.id === me);
            X.vaultReward(k, { won: np.winner === me, stages: mine ? mine.played : 0, players: Object.keys(R).length, seconds: ((Number(np.ended) || Date.now()) - Number(np.started)) / 1000 });
            const a = X.recordNightParty({ id: k, name: np.name, reward: np.reward, winner: nameOf(d, np, np.winner), date: Number(np.ended) || Date.now(), won: np.winner === me });
            if (a) X.achToast(a);
        }
    }
    if (!tickT) tickT = setInterval(tick, 1000);
    hud(d);
}
function tick() {
    const d = X.data(), np = npOf(d);
    if (!np) { clearInterval(tickT); tickT = 0; return; }
    document.querySelectorAll("[data-due]").forEach(e => { const due = Number(e.dataset.due); e.textContent = due ? clock(due - Date.now()) : ""; });
    document.querySelectorAll("[data-since]").forEach(e => { const s = Number(e.dataset.since); e.textContent = clock(NP.disconnectSec * 1000 - (Date.now() - s)); });
    takeover(d);
    hud(d);                      // the chip follows the screen (the room may not change when the screen does)
}
/* the host is offline too long: the first online player takes over hosting (the tournament state is in the room) */
function takeover(d) {
    const h = X.hostSlot(d), pres = d.presence || {}, me = X.me();
    if (pres["p" + h] !== false || h === me) { hostOff = { slot: h, since: 0 }; return; }
    if (hostOff.slot !== h || !hostOff.since) { hostOff = { slot: h, since: Date.now() }; return; }
    if (Date.now() - hostOff.since < NP.hostTakeoverSec * 1000) return;
    const online = X.activeSlots(d).filter(s => s !== h && pres["p" + s] !== false);
    if (online[0] === me) { hostOff.since = 0; X.update(X.ref(X.db, "rooms/" + X.room()), { host: me }).then(() => X.toast("The host is away: you run the Night Party now.")).catch(() => {}); }
}
function hud(d) {
    const h = $("npHud"); if (!h) return;
    const np = npOf(d), show = !!np && X.screen() !== "party" && X.screen() !== "home";
    h.classList.toggle("hidden", !show); if (!show) return;
    const rows = rowsOf(np), me = rows.find(r => r.id === X.uid()), stg = stageAt(np, np.si), n = planStages(np).length;
    h.innerHTML = "";
    h.append(el("span", "np-hk", "宴"), el("b", null, stg.sd ? "SUDDEN DEATH" : "STAGE " + (np.si + 1) + "/" + n), el("small", null, me ? (me.tied ? "T" : "#") + me.rank + " · " + f1(me.pool) + " pts" : "standings"));
}
export function openChart() {
    const d = X.data(), np = npOf(d), body = $("npChartBody"); if (!np || !body) return;
    body.innerHTML = ""; body.appendChild(chartEl(d, np, true)); X.openOverlay("npChart");
}

/* ================= THE PARTY SCREEN ================= */
let viewSig = "";
const prevX = {};
export function showParty(d) {
    const scr = $("party"); if (!scr) return;
    if (scr.classList.contains("hidden")) { X.showOnly("party"); window.scrollTo(0, 0); viewSig = ""; hud(d); }
    render(d);
}
function render(d) {
    const np = npOf(d), wrap = $("npWrap"); if (!np || !wrap) return;
    const pres = d.presence || {};
    const sig = JSON.stringify([np, X.activeSlots(d).map(s => { const p = d["player" + s] || {}; return [s, p.uid, p.name, p.col, p.sf, p.fr, p.av && (p.av.u || p.av.g || (p.av.d || "").length), pres["p" + s]]; }), X.amHost(), X.me(), X.hostSlot(d), d.status]);
    if (sig === viewSig) return; viewSig = sig;
    const host = X.amHost(), stg = stageAt(np, np.si), n = planStages(np).length;
    wrap.innerHTML = "";
    // header
    const top = el("header", "np-top");
    const ttl = el("div", "np-ttl"); ttl.append(el("small", null, "NIGHT PARTY · ROOM " + X.room()), el("h1", null, np.name || "Night Party"));
    if (np.reward) ttl.appendChild(el("span", "np-rew", "🎁 " + np.reward));
    const menu = el("button", "pop ghost menu-btn", "☰"); menu.type = "button"; menu.setAttribute("aria-label", "Menu"); menu.onclick = () => window.openPause();
    const pill = el("span", "np-pill", np.phase === "winner" ? "FINAL" : stg.sd ? "SUDDEN DEATH" : "STAGE " + Math.min(np.si + 1, n) + " / " + n);
    top.append(ttl, pill, menu);
    wrap.appendChild(top);
    // banners: offline players, the host away, late joiners
    const ban = banners(d, np); if (ban) wrap.appendChild(ban);
    // the phase card
    const main = el("div", "np-main");
    main.appendChild(phaseCard(d, np, host));
    // the chart
    main.appendChild(chartEl(d, np, false));
    wrap.appendChild(main);
    // actions
    const foot = el("footer", "np-foot");
    if (PAUSE.includes(np.phase) && np.phase !== "winner") foot.appendChild(btn("Open my Vault", "ghost sm np-vault", () => X.openVault()));
    if (host && np.phase !== "winner") foot.appendChild(btn("End Night Party", "danger sm", npEnd));
    wrap.appendChild(foot);
    if (np.phase === "winner") party(wrap);
    tick();
}
function banners(d, np) {
    const box = el("div", "np-bans"), pres = d.presence || {}, h = X.hostSlot(d);
    Object.entries(np.off || {}).forEach(([id, since]) => { if (!since) return; const b = el("p", "np-ban off"); b.append(el("b", null, nameOf(d, np, id) + " is offline."), el("span", null, " Scored last for this stage in "), el("span", "np-cd", "")); b.lastChild.dataset.since = since; if ((np.drop || {})[id]) { b.innerHTML = ""; b.append(el("b", null, nameOf(d, np, id)), el("span", null, " was offline too long: scored last for this stage.")); } box.appendChild(b); });
    if (pres["p" + h] === false) box.appendChild(el("p", "np-ban host", "Paused: waiting for the host (" + X.pName(d, h) + ") to come back. If they don't, the next player takes over in " + NP.hostTakeoverSec + " s. Nothing is lost."));
    const pm = presentMap(d), R = rosterOf(np), late = Object.keys(pm).filter(id => !R[id]);
    if (late.length) box.appendChild(el("p", "np-ban late", late.map(id => X.pName(d, pm[id])).join(", ") + " joined: they enter the standings before the next stage (" + ((np.plan || {}).late === "zero" ? "starting at 0" : "starting at the average pool") + ")."));
    if (np.walk && np.phase === "match") box.appendChild(el("p", "np-ban late", "Walkover: a duelist wasn't here, so the other one goes through."));
    return box.childElementCount ? box : null;
}
function modeBadge(m, big) {
    const info = X.modeInfo(m), b = el("span", "np-mb" + (big ? " big" : "")); b.style.setProperty("--mc", info.color);
    b.append(el("i", null, info.kanji), el("b", null, info.name)); return b;
}
function phaseCard(d, np, host) {
    const card = el("section", "np-card ph-" + np.phase), stg = stageAt(np, np.si), fmt = fmtOf(stg), n = planStages(np).length;
    card.style.setProperty("--mc", X.modeInfo(stg.mode).color);
    const waitHost = () => el("p", "np-wait", "Waiting for " + X.pName(d, X.hostSlot(d)) + " (host)…");
    if (np.phase === "winner") return winnerCard(d, np, host);
    if (np.phase === "results") {
        const r = resOf(np)[np.si] || {};
        card.append(el("small", "np-k", stg.sd ? "SUDDEN DEATH RESULT" : "STAGE " + (np.si + 1) + " RESULTS"));
        const h = el("div", "np-h"); h.append(modeBadge(stg.mode, true), el("b", "np-lbl", stg.label || ""), stg.sd ? el("span") : el("span", "np-w", wTxt(stg.weight))); card.appendChild(h);
        card.appendChild(r.skipped ? el("p", "np-note", "Skipped: nobody scored.") : resultsList(d, np, np.si));
        if (r.br) card.appendChild(bracketEl(d, np, normBracket(r.br), null));
        const last = !stg.sd && np.si + 1 >= n;
        if (host) card.appendChild(btn(stg.sd ? "Continue" : last ? "FINAL STANDINGS" : "NEXT: STAGE " + (np.si + 2), "alt", npGo)); else card.appendChild(waitHost());
        return card;
    }
    if (np.phase === "failed") {
        card.append(el("small", "np-k", "STAGE " + (np.si + 1) + " · " + modeName(stg.mode)), el("p", "np-err", np.err || "The stage couldn't run."));
        if (host) { const r = el("div", "np-row"); r.append(btn("Retry", "alt", npRetry), btn("Skip stage", "ghost", npSkip)); card.appendChild(r); card.appendChild(el("small", "np-note", "Retry starts the stage again; skip moves on with the scores as they are.")); }
        else card.appendChild(waitHost());
        return card;
    }
    if (np.phase === "launch") { card.append(el("small", "np-k", "STARTING"), modeBadge(stg.mode, true), el("p", "np-wait", "Starting " + modeName(stg.mode) + "…")); return card; }
    if (np.phase === "play") {
        card.append(el("small", "np-k", stg.sd ? "SUDDEN DEATH IN PROGRESS" : "STAGE " + (np.si + 1) + " IN PROGRESS"), modeBadge(stg.mode, true));
        const who = arr((np.match || {}).seats).map(Number).map(s => X.pName(d, s));
        card.appendChild(el("p", "np-note", (who.length ? who.join(fmt === "duel" ? " vs " : ", ") + (who.length === 1 ? " is" : " are") + " playing. " : "") + "The standings move when it ends."));
        if (fmt === "duel" && np.br) card.appendChild(bracketEl(d, np, normBracket(np.br), np.match));
        return card;
    }
    // next / match
    const isMatch = np.phase === "match";
    card.appendChild(el("small", "np-k", isMatch ? "NEXT MATCH" : stg.sd ? "SUDDEN DEATH · ROUND " + ((np.sd || {}).round || 1) : np.si === 0 ? "THE NIGHT BEGINS · STAGE 1 OF " + n : "UP NEXT · STAGE " + (np.si + 1) + " OF " + n));
    const h = el("div", "np-h"); h.append(modeBadge(stg.mode, true), el("b", "np-lbl", stg.label || ""), stg.sd ? el("span") : el("span", "np-w", wTxt(stg.weight))); card.appendChild(h);
    card.appendChild(el("p", "np-note", FMT_TXT[fmt] + " · " + settingsLine(stg.mode, stg.settings) + (stg.sd ? "" : " · " + Math.round(estMinutes(stg.mode, stg.settings, participants(d, np, stg).length)) + " min")));
    if (stg.sd) card.appendChild(el("p", "np-sd", arr((np.sd || {}).ids).map(id => nameOf(d, np, id)).join(", ") + " are tied at the top. Only they play; the best of them wins the night."));
    if (fmt === "teams" && np.teams) card.appendChild(teamsEl(d, np, host && !isMatch));
    if (fmt === "duel" && np.br) {
        const br = normBracket(np.br), m = nextMatch(br);
        if (m) { const vs = el("div", "np-vs"); vs.append(playerChip(d, np, m.a), el("i", null, "VS"), playerChip(d, np, m.b)); card.appendChild(vs); }
        card.appendChild(bracketEl(d, np, br, m));
    } else if (fmt !== "teams") {
        const ps = el("div", "np-who"); participants(d, np, stg).forEach(id => ps.appendChild(playerChip(d, np, id))); card.appendChild(ps);
    }
    const row = el("div", "np-row");
    if (np.due) { const c = el("span", "np-count"); c.append(el("small", null, isMatch ? "Next match in " : "Starts in "), el("b", null, "")); c.lastChild.dataset.due = np.due; row.appendChild(c); }
    if (host) { row.appendChild(btn(isMatch ? "START MATCH" : stg.sd ? "START SUDDEN DEATH" : "START STAGE " + (np.si + 1), "alt", npGo)); if (!isMatch) row.appendChild(btn(np.due ? "Hold" : "Countdown", "ghost sm", npHold)); }
    else row.appendChild(waitHost());
    card.appendChild(row);
    return card;
}
function playerChip(d, np, id) { const c = el("span", "np-pc"); c.append(avaOf(d, np, id, 30), el("b", null, nameOf(d, np, id))); return c; }
function teamsEl(d, np, canTap) {
    const box = el("div", "np-teams");
    [["A", "Team Crimson"], ["B", "Team Gold"]].forEach(([k, name]) => {
        const col = el("div", "np-tcol t" + k); col.appendChild(el("b", null, name + " · " + arr(np.teams[k]).length));
        arr(np.teams[k]).forEach(id => { const c = el(canTap ? "button" : "span", "np-pc" + (canTap ? " tap" : "")); if (canTap) { c.type = "button"; c.onclick = () => npTeamTap(id); c.title = "Move to the other team"; } c.append(avaOf(d, np, id, 26), el("b", null, nameOf(d, np, id))); col.appendChild(c); });
        box.appendChild(col);
    });
    if (canTap) box.appendChild(el("small", "np-note", "Balanced by the standings. Tap a player to move them."));
    return box;
}
/* one stage's placements: place, player, points gained (base x weight), rank movement */
function resultsList(d, np, si) {
    const r = resOf(np)[si]; const list = el("ol", "np-res");
    const before = {}, resB = Object.assign({}, resOf(np)); delete resB[si];
    standings(rosterOf(np), resB, planStages(np).length).forEach(x => { before[x.id] = x.rank; });
    const after = Object.fromEntries(rowsOf(np).map(x => [x.id, x]));
    const earlier = Object.keys(resB).some(k => resB[k] && !resB[k].skipped && Number(k) < si);      // rank arrows only once there was a ranking
    const pl = arr(r.placements).slice().sort((a, b) => a.place - b.place), shared = p => pl.filter(q => q.place === p).length > 1;
    pl.forEach(p => {
        const li = el("li", "np-ri" + (p.place === 1 ? " first" : "")), a = after[p.id] || {}, g = (a.gains || [])[si];
        li.append(el("span", "np-place", (shared(p.place) ? "T" : "") + ORD(p.place)), avaOf(d, np, p.id, 30), el("b", "np-rn", nameOf(d, np, p.id)));
        li.appendChild(el("span", "np-gain", r.sd ? "" : "+" + f1(g || 0)));
        const mv = (before[p.id] || a.rank) - a.rank;
        li.appendChild(earlier ? el("span", "np-mv " + (mv > 0 ? "up" : mv < 0 ? "dn" : "eq"), mv > 0 ? "▲" + mv : mv < 0 ? "▼" + -mv : "=") : el("span", "np-mv"));
        list.appendChild(li);
    });
    if (arr(r.dropped).length) list.appendChild(el("small", "np-note", "Scored last (offline too long): " + arr(r.dropped).map(id => nameOf(d, np, id)).join(", ")));
    return list;
}
function winnerCard(d, np, host) {
    const card = el("section", "np-card np-win"), id = np.winner, rows = rowsOf(np), w = rows.find(r => r.id === id) || {};
    const pm = presentMap(d);
    card.appendChild(el("small", "np-k", "CHAMPION OF THE NIGHT"));
    const hero = el("div", "np-champ"); hero.append(el("span", "np-crown", "👑"), avaOf(d, np, id, 120), el("b", "np-cn", nameOf(d, np, id)), el("span", "np-cp", f1(w.pool) + " points"));
    card.appendChild(hero);
    if (np.reward) { const r = el("div", "np-reward"); r.append(el("small", null, "THE REWARD"), el("b", null, np.reward)); card.appendChild(r); }
    const sdN = resList(np).filter(k => resOf(np)[k].sd).length;
    if (sdN) card.appendChild(el("p", "np-note", "Won after " + sdN + " sudden-death round" + (sdN > 1 ? "s" : "") + (np.flip ? " (still tied after " + NP.maxSuddenRounds + ": decided by a coin flip)" : "") + "."));
    const me = rows.find(r => r.id === X.uid());
    if (me) card.appendChild(el("p", "np-note", "You finished " + (me.tied ? "T" : "") + ORD(me.rank) + " · Night Party bonus: " + (id === X.uid() ? NP.coins.winner + " + " : "") + NP.coins.perStage + " × " + me.played + " stages (with 2+ players)."));
    if (host) card.appendChild(btn("BACK TO THE LOBBY", "alt", npLobby)); else card.appendChild(el("p", "np-wait", "The host takes everyone back to the lobby."));
    if (!pm[id]) card.appendChild(el("small", "np-note", "(The winner has left the room.)"));
    return card;
}
function party(wrap) {
    if (!X.motionOK()) return;
    const box = el("div", "np-confetti"); box.setAttribute("aria-hidden", "true");
    const cols = ["#f0c869", "#e11b1b", "#fff4d6", "#b38bff", "#38d39f"];
    for (let i = 0; i < 70; i++) { const c = el("i"); c.style.left = Math.random() * 100 + "%"; c.style.background = cols[i % cols.length]; c.style.animationDelay = (Math.random() * 1.8) + "s"; c.style.setProperty("--dx", (Math.random() * 160 - 80) + "px"); c.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg"); box.appendChild(c); }
    wrap.appendChild(box); setTimeout(() => box.remove(), 6000);
}

/* ================= THE LIVE CHART: race track + scoreboard + stage list (+ bracket) ================= */
function chartEl(d, np, inSheet) {
    const box = el("section", "np-chart" + (inSheet ? " in-sheet" : "")), rows = rowsOf(np), stages = planStages(np);
    box.appendChild(trackEl(d, np, rows, stages));
    const low = el("div", "np-low");
    low.append(boardEl(d, np, rows), stagesEl(np, stages));
    box.appendChild(low);
    if (inSheet) { const stg = stageAt(np, np.si); if (fmtOf(stg) === "duel" && np.br) box.appendChild(bracketEl(d, np, normBracket(np.br), np.match)); }
    return box;
}
function trackEl(d, np, rows, stages) {
    const tr = el("div", "np-track"), maxStart = Math.max(0, ...Object.values(rosterOf(np)).map(r => Number(r.start) || 0));
    const total = Math.max(1, stages.reduce((s, x) => s + NP.points.top * x.weight, 0) + maxStart, ...rows.map(r => r.pool));
    const marks = el("div", "np-marks"); let cum = maxStart;
    stages.forEach((s, k) => { cum += NP.points.top * s.weight; const m = el("span", "np-mark" + (k < np.si || np.phase === "winner" ? " done" : k === np.si ? " now" : ""), "S" + (k + 1) + " " + wTxt(s.weight)); m.style.left = (cum / total * 100) + "%"; marks.appendChild(m); });
    tr.appendChild(marks);
    const leader = rows.find(r => !r.gone), gap = leadGap(rows), anim = X.motionOK();
    rows.forEach(r => {
        const lane = el("div", "np-lane" + (r.gone ? " gone" : "") + (leader && r.id === leader.id && !r.tied ? " lead" : "") + (r.id === X.uid() ? " me" : ""));
        lane.appendChild(el("span", "np-lr", (r.tied ? "T" : "") + r.rank));
        const rail = el("div", "np-rail"), tok = el("div", "np-tok"), x = Math.min(100, Math.max(0, r.pool / total * 100));
        tok.appendChild(avaOf(d, np, r.id, 30));
        const tag = el("span", "np-tag"); tag.append(el("b", null, nameOf(d, np, r.id)), el("em", null, f1(r.pool) + (leader && r.id === leader.id && gap > 0 ? "  +" + f1(gap) : "")));
        if (x > 62) tok.classList.add("flip");
        tok.appendChild(tag);
        const from = prevX[r.id];
        tok.style.left = (anim && from != null ? from : x) + "%";
        rail.appendChild(tok); lane.appendChild(rail); tr.appendChild(lane);
        if (anim && from != null && from !== x) requestAnimationFrame(() => requestAnimationFrame(() => { tok.style.left = x + "%"; }));
        prevX[r.id] = x;
    });
    return tr;
}
function boardEl(d, np, rows) {
    const t = el("table", "np-board"), hd = el("tr");
    ["#", "Player", "Pool", "Last"].forEach(h => hd.appendChild(el("th", null, h)));
    const th = el("thead"); th.appendChild(hd); t.appendChild(th);
    const tb = el("tbody");
    rows.forEach(r => {
        const tr = el("tr", (r.gone ? "gone" : "") + (r.id === X.uid() ? " me" : ""));
        tr.appendChild(el("td", "np-br", (r.tied ? "T" : "") + r.rank));
        const who = el("td", "np-bw"); who.append(avaOf(d, np, r.id, 22), el("span", null, nameOf(d, np, r.id) + (r.gone ? " (left)" : "")));
        tr.appendChild(who);
        tr.appendChild(el("td", "np-bpo", f1(r.pool)));
        tr.appendChild(el("td", "np-bl", r.last == null ? "–" : "+" + f1(r.last)));
        tb.appendChild(tr);
    });
    t.appendChild(tb);
    return t;
}
function stagesEl(np, stages) {
    const ol = el("ol", "np-stl"), res = resOf(np);
    stages.forEach((s, k) => {
        const r = res[k], st = r ? (r.skipped ? "skip" : "done") : k === np.si && np.phase !== "winner" ? "now" : "todo";
        const li = el("li", "np-st " + st); li.style.setProperty("--mc", X.modeInfo(s.mode).color);
        li.append(el("i", null, X.modeInfo(s.mode).kanji), el("b", null, s.label || modeName(s.mode)), el("small", null, modeName(s.mode)), el("em", null, wTxt(s.weight)), el("span", "np-sts", st === "done" ? "✓" : st === "skip" ? "skipped" : st === "now" ? "▶" : ""));
        ol.appendChild(li);
    });
    if (np.sd || resList(np).some(k => resOf(np)[k].sd)) { const li = el("li", "np-st sd" + (np.phase !== "winner" && np.si >= stages.length ? " now" : " done")); li.append(el("i", null, "⚡"), el("b", null, "Sudden death"), el("small", null, modeName((np.sd || {}).mode || "likely")), el("em", null, "×0"), el("span", "np-sts", "")); ol.appendChild(li); }
    return ol;
}
function bracketEl(d, np, br, cur) {
    const box = el("div", "np-bracket"); if (!br) return box;
    const R = br.rounds.length, names = ["Final", "Semifinals", "Quarterfinals", "Round of 16"];
    br.rounds.forEach((round, r) => {
        const col = el("div", "np-bcol"); col.appendChild(el("small", null, names[R - 1 - r] || "Round " + (r + 1)));
        round.forEach((m, i) => {
            const mb = el("div", "np-bm" + (cur && cur.r === r && cur.i === i ? " cur" : "") + (m.w ? " done" : ""));
            [m.a, m.b].forEach(id => {
                const row = el("div", "np-bp" + (m.w && m.w === id ? " win" : m.w && id && id !== BYE ? " lose" : ""));
                if (id === BYE) row.appendChild(el("span", "np-bye", "bye"));
                else if (!id) row.appendChild(el("span", "np-tbd", "—"));
                else row.append(avaOf(d, np, id, 18), el("span", null, nameOf(d, np, id)));
                mb.appendChild(row);
            });
            col.appendChild(mb);
        });
        box.appendChild(col);
    });
    return box;
}

/* ================= init ================= */
export function initParty(ctx) {
    X = ctx;
    Object.assign(window, { npGo, npRetry, npSkip, npHold, npEnd, npLobby, npTeamTap, npChart: openChart, npSetup: openSetup });
    ["npChart", "npSetup"].forEach(id => { const o = $(id); if (o) o.addEventListener("click", e => { if (e.target === o) X.closeOverlay(id); }); });
}
/* for tests: the pure parts and the live state */
export const _test = { planOf, validatePlan, normStage, stageAt, settingsLine, rowsOf };
