/* =====================================================================
   ANIME CARD VAULT (ninth mode): card battles with the decks from the Arcade Vault.
   Rules: engine.js (pure, tested in tools/cardvault-test.mjs). Card faces: ../vault/cardui.js.

   Firebase (rooms/<code>):
     cv          the battle (engine state): players, life, hands, decks, picks, round, deadline, log, placements.
                 Every change is a transaction: a player only ever sends their own pick; the host resolves the
                 round (all picked, or the timer ran out: auto-picks), with one grace pause for a disconnect.
     cvDeck/pN   each player's chosen deck ({name, cards}), published from their Vault while the lobby is on
                 Anime Card Vault.
     cvDuel      the two duelists the host picked (1v1 with more than 2 people in the room; the rest spectate).
   Hidden information is hidden by the interface (opponents' hands and picks are never drawn), like every other
   mode here: the site has no server to keep secrets from a player reading the database.
   Practice vs CPU runs the same engine locally (no coins).
   ===================================================================== */
import { newBattle, act, resolveRound, alive, handOf, lifeOf, due, applyDue, normalize, cpuPick, autoPick, REVEAL_MS, arr } from "./engine.js?v=1";
import { ABILITIES } from "./abilities.js?v=1";
import { BATTLE } from "../vault/config.js?v=3";
import { CARDS } from "../vault/carddb.js?v=1";
import { cardEl, backCard } from "../vault/cardui.js?v=1";
import { inspect } from "../vault/opening.js?v=1";
import { rngFrom, newSeed, shuffleWith } from "../vault/rng.js?v=1";
import { el, srvNow, presentIn, optButtons } from "../feud/common.js?v=3";

const GT = "cardvault";
const $ = id => document.getElementById(id);
const pk = p => "p" + p;
let X = null;
const fmtOf = d => d && d.cvFormat === "ffa" ? "ffa" : "duel";
const timerOf = d => [20, 30, 45].includes(Number(d && d.cvTimer)) ? Number(d.cvTimer) : BATTLE.pickSeconds;
export const cvPrefs = p => ({ cvFormat: p.cvFormat === "ffa" ? "ffa" : "duel", cvTimer: [20, 30, 45].includes(Number(p.cvTimer)) ? Number(p.cvTimer) : BATTLE.pickSeconds, cvPack: p.cvPack ? 1 : 0 });
export const cvPrefsOf = d => ({ cvFormat: fmtOf(d), cvTimer: timerOf(d), cvPack: d && d.cvPack ? 1 : 0 });

export function initCardVault(ctx) {
    X = ctx;
    Object.assign(window, {
        setCvOpt(k, v) {
            const d = X.data(); if (!d || !X.amHost() || d.status !== "waiting") return;
            X.sfx("pick");
            if (k === "fmt") X.lobbySet({ cvFormat: v === "ffa" ? "ffa" : "duel" });
            if (k === "timer") X.lobbySet({ cvTimer: Number(v) });
            if (k === "pack") X.lobbySet({ cvPack: d.cvPack ? 0 : 1 });
        },
        cvDuelPick(p) {
            const d = X.data(); if (!d || !X.amHost() || d.status !== "waiting") return;
            let cur = duelists(d).slice(); const i = cur.indexOf(p);
            if (i >= 0) cur.splice(i, 1); else { if (cur.length >= 2) cur.shift(); cur.push(p); }
            X.sfx("toggle"); X.lobbySet({ cvDuel: cur.length ? cur : [-1] });
        },
        cvAgain: () => cvStart(true),
        cvLobby: () => X.backToLobby(true)
    });
}

/* ---------------- lobby ---------------- */
function duelists(d) {
    const act = X.activeSlots(d);
    if (act.length <= 2) return act.slice();
    if (!d.cvDuel) return [X.hostSlot(d), act.find(i => i !== X.hostSlot(d))];
    return arr(d.cvDuel).map(Number).filter((x, i, a) => act.includes(x) && a.indexOf(x) === i).slice(0, 2);
}
const seatsFor = d => fmtOf(d) === "ffa" ? X.activeSlots(d) : duelists(d);
const deckOf = (d, p) => { const v = (d.cvDeck || {})[pk(p)]; return v && arr(v.cards).length === 10 ? { name: String(v.name || "Deck"), cards: arr(v.cards).map(Number).filter(id => CARDS[id]) } : null; };
export function cvHint(d) { return fmtOf(d) === "ffa" ? "Free-for-all: everyone battles at once with their own deck, picking a card AND a target each round." : "1v1 duel with your Vault decks. Everyone else spectates."; }
export function cvReq(d) {
    const n = X.activeSlots(d).length, seats = seatsFor(d);
    if (fmtOf(d) === "ffa" && (n < BATTLE.ffa.min || n > BATTLE.ffa.max)) return { ok: false, msg: "Free-for-all needs " + BATTLE.ffa.min + " to " + BATTLE.ffa.max + " players (" + n + " here). Pick 1v1 for two." };
    if (fmtOf(d) === "duel" && seats.length !== 2) return { ok: false, msg: "Pick the 2 duelists (" + seats.length + "/2). Everyone else spectates." };
    const missing = seats.filter(p => !deckOf(d, p));
    if (missing.length) return { ok: false, wait: true, msg: "Waiting for a 10-card deck from " + missing.map(p => X.pName(d, p)).join(", ") + " (Vault › Deck)." };
    return { ok: true, msg: "Anime Card Vault · " + (fmtOf(d) === "ffa" ? "Free-for-all, " + seats.length + " players, " + BATTLE.ffa.life + " life" : seats.map(p => X.pName(d, p)).join(" vs ") + ", " + BATTLE.duel.life + " life") + " · " + timerOf(d) + " s picks" + (d.cvPack ? " · winner gets a free pack" : "") };
}
let deckSent = "";
export function cvLobby(d, lock) {
    // my deck rides along in the room while the lobby is on this mode
    const mine = X.activeDeck(), me = X.me(), cur = (d.cvDeck || {})[pk(me)], want = mine ? JSON.stringify(mine) : "";
    if (want && want !== deckSent && JSON.stringify({ name: cur && cur.name, cards: cur && arr(cur.cards).map(Number) }) !== want) { deckSent = want; X.update(X.ref(X.db, "rooms/" + X.room() + "/cvDeck/" + pk(me)), mine).catch(() => { deckSent = ""; }); }
    optButtons($("cvFmtBtns"), ["duel", "ffa"], fmtOf(d), lock, v => v === "ffa" ? "Free-for-all" : "1v1 Duel", v => window.setCvOpt("fmt", v));
    optButtons($("cvTimerBtns"), [20, 30, 45], timerOf(d), lock, v => v + " s", v => window.setCvOpt("timer", v));
    const pb = $("cvPackBtn"); pb.textContent = d.cvPack ? "On: the winner picks a free pack" : "Off"; pb.classList.toggle("selected", !!d.cvPack); pb.disabled = lock;
    const dp = $("cvDuelBox"), act = X.activeSlots(d);
    dp.classList.toggle("hidden", fmtOf(d) !== "duel" || act.length <= 2);
    if (fmtOf(d) === "duel" && act.length > 2) {
        const box = $("cvDuelPick"); box.innerHTML = ""; const sel = duelists(d);
        act.forEach(p => { const b = el("button", "duel-opt" + (sel.includes(p) ? " on" : "")); b.type = "button"; b.style.setProperty("--pc", (X.pPub(d, p) || {}).col || "#e11b1b"); b.append(X.avatarEl(X.pPub(d, p), { size: 30 }), el("b", null, X.pName(d, p))); b.disabled = lock; b.onclick = () => window.cvDuelPick(p); box.appendChild(b); });
    }
    const list = $("cvDecks"); list.innerHTML = "";
    seatsFor(d).forEach(p => { const dk = deckOf(d, p), r = el("div", "cv-dkst" + (dk ? " ok" : "")); r.append(X.avatarEl(X.pPub(d, p), { size: 26 }), el("b", null, X.pName(d, p)), el("small", null, dk ? dk.name + " ✓" : "no deck yet")); list.appendChild(r); });
    const mineOk = !!mine;
    $("cvMyDeck").textContent = mineOk ? "Your deck: " + mine.name + " (change it in Vault › Deck)" : "You need a 10-card deck: open Vault › Deck.";
    $("cvHint").textContent = "Each round everyone picks a card in secret" + (fmtOf(d) === "ffa" ? " and a target" : "") + ", then all cards flip at once: damage = Power minus the opposing Defense, then abilities. " + (fmtOf(d) === "ffa" ? BATTLE.ffa.life : BATTLE.duel.life) + " life; last one standing wins.";
}

/* ---------------- start (host) ---------------- */
export async function cvStart(again) {
    const d = X.data(); if (!d || !X.amHost()) return;
    if (again && d.cv && d.cv.phase !== "over" && !(await X.uiConfirm({ title: "Restart the battle?", text: "The current battle is thrown away.", ok: "Restart" }))) return;
    const req = cvReq(d); if (!req.ok) { X.toast(req.msg); return; }
    const players = seatsFor(d), decks = {}, names = {};
    players.forEach(p => { decks[pk(p)] = deckOf(d, p).cards; names[pk(p)] = X.pName(d, p); });
    const mid = Date.now(), s = newBattle({ mid, fmt: fmtOf(d), players, decks, names, now: srvNow(), seed: newSeed(), pickMs: timerOf(d) * 1000 });
    try { await X.update(X.ref(X.db, "rooms/" + X.room()), { status: "playing", matchId: mid, cv: JSON.parse(JSON.stringify(s)) }); }
    catch (e) { console.error(e); X.toast("Could not start: " + (e.message || e)); }
}
export const cvSeats = d => { const s = d && d.cv; return s ? arr(s.players).map(Number) : []; };
export const cvOver = d => !d.cv || d.cv.phase === "over";
async function tx(fn) {
    try {
        await X.runTransaction(X.ref(X.db, "rooms/" + X.room() + "/cv"), cur => {
            if (!cur) return;
            const s = normalize(JSON.parse(JSON.stringify(cur)));
            if (fn(s) === false) return;
            return JSON.parse(JSON.stringify(s));
        });
    } catch (e) { console.error(e); X.toast("Could not send that. Try again."); }
}

/* ---------------- host duties: resolve when everyone picked or time is up ---------------- */
let dutyT = 0, dutyKey = "";
export function cvDuties(d) {
    const s = d.cv; if (!s || s.phase !== "pick" || !X.amHost()) { clearInterval(dutyT); dutyT = 0; return; }
    const check = () => {
        const d2 = X.data(); if (!d2 || !d2.cv || d2.cv.phase !== "pick" || !X.amHost() || d2.gameType !== GT) { clearInterval(dutyT); dutyT = 0; return; }
        const s2 = normalize(JSON.parse(JSON.stringify(d2.cv))), pres = presentIn(d2), kind = due(s2, srvNow(), pres);
        if (!kind) return;
        const k = s2.n + ":" + s2.round + ":" + kind + ":" + s2.ext; if (dutyKey === k) return; dutyKey = k;
        setTimeout(() => tx(st => { const kk = due(st, srvNow(), presentIn(X.data())); if (!kk) return false; applyDue(st, kk, srvNow(), presentIn(X.data())); }), 0);
    };
    if (!dutyT) dutyT = setInterval(check, 400);
    check();
}
export function cvReset() { clearInterval(dutyT); dutyT = 0; dutyKey = ""; view = null; picked = { c: 0, t: 0 }; lastN = -1; const o = $("cvOver"); if (o) o.remove(); }

/* ---------------- the battle view (rooms and practice share it) ---------------- */
let view = null, picked = { c: 0, t: 0 }, lastN = -1, tickT = 0;
export function showCV(d) {
    X.showOnly("cardvault");
    const s = normalize(JSON.parse(JSON.stringify(d.cv)));
    const me = X.me(), playing = arr(s.players).includes(me);
    render($("cvWrap"), s, {
        me: playing ? me : 0, pub: p => X.pPub(d, p), present: presentIn(d), room: true, host: X.amHost(),
        pick: (c, t) => tx(st => { if (act(st, { p: me, c, t })) return false; }),
        again: () => cvStart(true), lobby: () => X.backToLobby(true)
    });
    $("cvTurnT").textContent = s.phase === "over" ? "BATTLE OVER" : "ROUND " + s.round + (s.fmt === "ffa" ? " · FREE-FOR-ALL" : " · 1V1");
    $("cvStatus").textContent = !playing ? "Spectating" : !alive(s).includes(me) ? "Knocked out: spectating" : s.phase === "over" ? "" : (s.picks || {})[pk(me)] ? "Card locked in. Waiting for the others…" : "Pick a card" + (s.fmt === "ffa" ? " and a target" : "");
}
function lifeBar(s, p) {
    const w = el("div", "cv-life"), v = Math.max(0, lifeOf(s, p)), f = el("i"); f.style.width = Math.max(0, Math.min(100, v / s.max * 100)) + "%";
    w.classList.toggle("low", v <= s.max * .3); w.append(f, el("b", null, v + " / " + s.max)); w.setAttribute("aria-label", v + " of " + s.max + " life");
    return w;
}
function plate(s, p, o) {
    const out = !alive(s).includes(p), pub = o.pub(p) || { name: s.names[pk(p)] }, pl = el("div", "cv-plate" + (out ? " out" : "") + (p === o.me ? " me" : "") + (picked.t === p ? " target" : ""));
    pl.dataset.p = p; pl.style.setProperty("--pc", pub.col || "#e11b1b");
    const top = el("div", "cv-ptop"); top.append(X.avatarEl(pub, { size: 34 }), el("b", null, s.names[pk(p)] || pub.name));
    const st = el("small", "cv-pst");
    st.textContent = out ? "KO" : s.phase === "over" ? "" : (s.picks || {})[pk(p)] ? "✓ picked" : !o.present(p) ? "away" : "thinking…";
    top.appendChild(st);
    pl.append(top, lifeBar(s, p), el("small", "cv-pcount", "Hand " + handOf(s, p).length + " · Deck " + arr(s.deck[pk(p)]).length));
    if (s.fmt === "ffa" && o.me && p !== o.me && !out && alive(s).includes(o.me) && s.phase === "pick") { pl.tabIndex = 0; pl.setAttribute("role", "button"); pl.setAttribute("aria-label", "Target " + s.names[pk(p)]); pl.onclick = () => { picked.t = p; X.sfx("toggle"); rerender(); }; pl.onkeydown = e => { if (e.key === "Enter") pl.click(); }; }
    return pl;
}
let lastArgs = null;
const rerender = () => { if (lastArgs) render(...lastArgs); };
function render(root, s, o) {
    lastArgs = [root, s, o];
    root.innerHTML = "";
    const meAlive = o.me && alive(s).includes(o.me);
    if (s.fmt === "ffa" && meAlive && (!picked.t || !alive(s).includes(picked.t) || picked.t === o.me)) picked.t = autoPick(s, o.me) ? autoPick(s, o.me).t : 0;
    if (picked.c && !handOf(s, o.me).includes(picked.c)) picked.c = 0;
    // opponents (or everyone when spectating)
    const opp = el("div", "cv-opps"); arr(s.players).filter(p => p !== o.me).forEach(p => opp.appendChild(plate(s, p, o))); root.appendChild(opp);
    // arena: the last reveal
    const arena = el("div", "cv-arena"); root.appendChild(arena);
    drawArena(arena, s, o);
    // timer
    const tm = el("div", "cv-timer"), tf = el("i"); tm.appendChild(tf); root.appendChild(tm);
    clearInterval(tickT);
    const tick = () => { if (!o.room || s.phase !== "pick" || !s.dl) { tm.classList.add("off"); return; } const now = o.room ? srvNow() : Date.now(), total = Number(s.pickMs) + REVEAL_MS, left = Math.max(0, Number(s.dl) - now); tf.style.width = Math.min(100, left / total * 100) + "%"; tm.classList.toggle("low", left < 6000); };
    tick(); tickT = setInterval(tick, 250);
    // me
    if (o.me && s.phase !== "over") {
        const mine = el("div", "cv-me");
        mine.appendChild(plate(s, o.me, o));
        const hand = el("div", "cv-hand"); hand.setAttribute("role", "listbox"); hand.setAttribute("aria-label", "Your hand");
        const locked = !!(s.picks || {})[pk(o.me)], h = handOf(s, o.me);
        h.forEach(id => {
            const c = el("button", "cv-hcard" + (picked.c === id ? " sel" : "") + (locked && (s.picks[pk(o.me)] || {}).c === id ? " locked" : "")); c.type = "button";
            c.setAttribute("role", "option"); c.setAttribute("aria-selected", String(picked.c === id));
            c.appendChild(cardEl(id, { size: "sm", holo: o.holo ? o.holo(id) : false }));
            c.disabled = !meAlive || s.phase !== "pick" || locked;
            c.onclick = () => { if (picked.c === id) { play(); return; } picked.c = id; X.sfx("pick"); rerender(); };
            let t = 0; c.addEventListener("pointerdown", () => { t = setTimeout(() => { c.dataset.held = 1; inspect(id); }, 450); });
            ["pointerup", "pointerleave", "pointercancel"].forEach(ev => c.addEventListener(ev, () => clearTimeout(t)));
            c.addEventListener("click", e => { if (c.dataset.held) { delete c.dataset.held; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
            c.addEventListener("contextmenu", e => e.preventDefault());
            hand.appendChild(c);
        });
        if (!h.length && meAlive) hand.appendChild(el("p", "vt-rule", "No cards left."));
        mine.appendChild(hand);
        const bar = el("div", "cv-bar");
        const playB = el("button", "btn alt", locked ? "Locked in ✓" : picked.c ? "Play " + CARDS[picked.c].n + (s.fmt === "ffa" && picked.t ? " → " + s.names[pk(picked.t)] : "") : "Tap a card, tap again to play"); playB.type = "button";
        playB.disabled = locked || !picked.c || !meAlive || s.phase !== "pick"; playB.onclick = play;
        bar.appendChild(playB);
        const sc = (s.scout || {})[pk(o.me)];
        if (sc && Number(sc.r) === s.round - 1 && CARDS[sc.c]) bar.appendChild(el("small", "cv-scout", "Scout: " + s.names[pk(sc.from)] + " holds " + CARDS[sc.c].n));
        mine.appendChild(bar);
        root.appendChild(mine);
    } else if (s.phase !== "over") root.appendChild(el("p", "cv-spec", "You're watching. Hands stay hidden; every card is shown when it's played."));
    const tools = el("div", "cv-tools");
    const logB = el("button", "btn ghost sm", "Battle log"); logB.type = "button"; logB.onclick = () => showLog(s); tools.appendChild(logB);
    if (o.exit) { const ex = el("button", "btn ghost sm", "Leave practice"); ex.type = "button"; ex.onclick = o.exit; tools.appendChild(ex); }
    root.appendChild(tools);
    if (s.phase === "over") showOverPanel(root, s, o);
    function play() {
        if (!picked.c || (s.picks || {})[pk(o.me)]) return;
        X.sfx("card"); o.pick(picked.c, picked.t);
    }
}
function drawArena(arena, s, o) {
    const L = s.last;
    if (!L) { arena.appendChild(el("p", "cv-wait", s.phase === "over" ? "" : "Round " + s.round + ": everyone picks a card in secret. They flip together.")); return; }
    const fresh = L.n !== lastN; lastN = L.n;
    arena.appendChild(el("small", "cv-rlab", "ROUND " + L.r));
    const row = el("div", "cv-plays" + (arr(L.plays).length > 2 ? " many" : ""));
    arr(L.plays).forEach((pl, i) => {
        const cell = el("div", "cv-play" + (pl.p === o.me ? " mine" : "")), c = CARDS[pl.c];
        cell.appendChild(el("b", "cv-who", s.names[pk(pl.p)] + (s.fmt === "ffa" ? " → " + s.names[pk(pl.t)] : "")));
        const card = cardEl(pl.c, { size: arr(L.plays).length > 2 ? "sm" : "md" });
        if (fresh && motionOK()) { card.classList.add("down"); setTimeout(() => card.classList.remove("down"), 260 + i * 60); }
        card.onclick = () => inspect(pl.c);
        cell.appendChild(card);
        const stats = el("small", "cv-pstats", pl.pow + " PWR / " + pl.def + " DEF" + (pl.sil ? " · silenced" : "") + (pl.cp ? " · copied " + ABILITIES[pl.cp].kw.join("/") : ""));
        if (pl.pow !== c.pow || pl.def !== c.def) stats.classList.add("mod");
        cell.appendChild(stats);
        const dmg = (L.dmg || {})[pk(pl.p)] || 0, heal = (L.heal || {})[pk(pl.p)] || 0;
        if (dmg) { const n = el("span", "cv-dmg", "−" + dmg); n.style.setProperty("--d", (900 + i * 80) + "ms"); cell.appendChild(n); }
        if (heal) { const n = el("span", "cv-heal", "+" + heal); n.style.setProperty("--d", (1300 + i * 80) + "ms"); cell.appendChild(n); }
        arr(L.banners).filter(b => b.p === pl.p).slice(0, 3).forEach((b, k) => { const bn = el("span", "cv-ban", b.text); bn.style.setProperty("--d", (600 + k * 260 + i * 90) + "ms"); bn.style.setProperty("--k", k); cell.appendChild(bn); });
        if (arr(L.ko).includes(pl.p)) cell.appendChild(el("span", "cv-ko", "K.O."));
        row.appendChild(cell);
    });
    arena.appendChild(row);
    if (fresh) { X.sfx("clash"); if (arr(L.banners).length) setTimeout(() => X.sfx("ability"), 650); if (arr(L.ko).length) setTimeout(() => X.sfx("ko"), 1100); }
}
const motionOK = () => !document.body.classList.contains("fx-lite");
function showLog(s) {
    const ov = el("div", "cv-log"); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Battle log");
    const box = el("div", "sheet cv-logbox"); box.appendChild(el("h2", null, "Battle log"));
    const list = el("div", "cv-loglist");
    arr(s.log).slice().reverse().forEach(r => { const g = el("section"); g.appendChild(el("b", null, r.r === "SD" ? "Sudden death" : "Round " + r.r)); arr(r.l).forEach(l => g.appendChild(el("p", null, l))); list.appendChild(g); });
    if (!arr(s.log).length) list.appendChild(el("p", null, "Nothing yet."));
    const c = el("button", "btn", "Close"); c.type = "button"; c.onclick = () => ov.remove();
    box.append(list, c); ov.appendChild(box); ov.onclick = e => { if (e.target === ov) ov.remove(); };
    document.body.appendChild(ov); c.focus();
}
const overSeen = new Set();
function showOverPanel(root, s, o) {
    const p = el("div", "cv-over"); p.id = o.room ? "cvOver" : "";
    const win = arr(s.winners), draw = win.length > 1;
    p.appendChild(el("b", "cv-otitle", draw ? "DRAW" : win[0] === o.me ? "VICTORY" : (s.names[pk(win[0])] || "?").toUpperCase() + " WINS"));
    const list = el("ol", "cv-places");
    arr(s.places).forEach(r => { const li = el("li", "cv-pl" + (r.p === o.me ? " me" : "")); li.append(el("b", null, "#" + r.place), X.avatarEl(o.pub(r.p) || { name: s.names[pk(r.p)] }, { size: 28 }), el("span", null, s.names[pk(r.p)]), el("small", null, Math.max(0, r.life) + " life")); list.appendChild(li); });
    p.appendChild(list);
    const b = el("div", "vt-row");
    if (o.room && o.host) { const a = el("button", "btn alt", "Rematch"); a.type = "button"; a.onclick = o.again; const l = el("button", "btn ghost", "Back to lobby"); l.type = "button"; l.onclick = o.lobby; b.append(a, l); }
    else if (o.room) b.appendChild(el("small", "vt-rule", "Waiting for the host…"));
    if (o.exit) { const a = el("button", "btn alt", "Play again"); a.type = "button"; a.onclick = o.again; const l = el("button", "btn ghost", "Leave"); l.type = "button"; l.onclick = o.exit; b.append(a, l); }
    p.appendChild(b);
    if (o.room) p.appendChild(el("small", "vt-rule", "Coins for placements arrive as a pop-up (2+ players, like every mode)."));
    root.prepend(p);
    if (o.fresh !== false && !overSeen.has(s.mid + ":" + (s.n || 0))) { overSeen.add(s.mid + ":" + (s.n || 0)); try { p.scrollIntoView({ block: "start", behavior: "smooth" }); } catch (e) {} }
    if (!p.dataset.sfx) { p.dataset.sfx = 1; X.sfx(win.includes(o.me) && !draw ? "win" : "reveal"); }
}

/* ---------------- practice vs CPU (local, no coins) ---------------- */
let practice = null;
export function startPractice() {
    const deck = X.activeDeck(); if (!deck) { X.toast("Build a 10-card deck first (Vault › Deck)."); return; }
    const seed = newSeed(), rng = rngFrom(seed), pool = Object.values(CARDS).filter(c => c.r <= 2).map(c => c.id);
    const cpuDeck = shuffleWith(rng, pool).slice(0, 10);
    const host = el("div", "cv-solo"); host.id = "cvSolo"; host.setAttribute("role", "dialog"); host.setAttribute("aria-label", "Practice battle");
    const head = el("div", "game-header"), hi = el("div", "game-header-inner"); hi.append(el("div", "turn", "PRACTICE · YOU VS CPU"), el("div", "status", "No coins in practice"));
    head.appendChild(hi); const wrap = el("div", "cv-wrap"); host.append(head, wrap);
    document.body.appendChild(host);
    const me = 1, name = X.myName() || "You";
    let s = newBattle({ mid: Date.now(), fmt: "duel", players: [1, 2], decks: { p1: deck.cards, p2: cpuDeck }, names: { p1: name, p2: "CPU" }, now: Date.now(), seed, pickMs: 60000 });
    const pubs = { 1: X.myPub(), 2: { name: "CPU", col: "#7a5cff", av: { t: "g", g: "機", c: "#7a5cff" } } };
    const o = { me, pub: p => pubs[p], present: () => true, room: false, holo: id => X.isHolo(id),
        pick: (c) => { if (act(s, { p: 1, c })) return; draw(); setTimeout(() => { const m = cpuPick(s, 2, rng); if (m) act(s, { p: 2, c: m.c }); resolveRound(s, Date.now()); picked = { c: 0, t: 0 }; draw(); }, 500 + rng() * 700); },
        again: () => { close(); startPractice(); }, exit: () => close() };
    const draw = () => render(wrap, s, o);
    const close = () => { clearInterval(tickT); host.remove(); practice = null; lastArgs = null; };
    practice = { close }; lastN = -1; picked = { c: 0, t: 0 };
    draw(); X.sfx("start");
}
export const practicing = () => !!practice;
