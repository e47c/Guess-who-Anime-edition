/* =====================================================================
   ARCADE VAULT · CARD BATTLES (the ninth lobby mode; internal id "cardvault", kept for saved data)
   Picking ARCADE VAULT in the lobby doesn't start a shared match: every player gets their own Vault page
   (js/vault/vault.js) and challenges others in the room from its Battle tab. Each challenge is its own battle,
   several can run at once, and anyone not in one keeps shopping, opening packs or watching.
   Rules: engine.js (pure, tested in tools/cardvault-test.mjs). Card faces: ../vault/cardui.js.

   Firebase (rooms/<code>):
     cvb/<bid>   one challenge / battle: { from, to:[slots], acc:{pN: deck}, st, at, timer, pack, s, t0, end, uids, res }
                 st: invite -> live -> over, or declined / cancelled / expired / void.
                 The challenger writes the invite with their deck; each opponent accepts with theirs. The room HOST
                 builds the battle once everyone accepted (seeded: the seed is kept in the node and in s.seed),
                 resolves every round (all picked, or the timer ran out: auto-picks; one grace pause for a disconnect),
                 and stores the standard result when it ends. A player only ever writes their own pick.
     cvDeck/pN   each player's active deck ({name, cards}) while the lobby is on ARCADE VAULT (the Battle tab shows it).
     vloc/pN     where each player is: "v" Vault page, "b" a battle, "l" the lobby.
   Hidden information is hidden by the interface (opponents' hands and picks are never drawn), like every other
   mode here: the site has no server to keep secrets from a player reading the database.
   Practice vs CPU runs the same engine locally (no coins).
   ===================================================================== */
import { newBattle, act, resolveRound, alive, handOf, lifeOf, due, applyDue, normalize, cpuPick, autoPick, REVEAL_MS, arr } from "./engine.js?v=5";
import { ABILITIES } from "./abilities.js?v=1";
import { BATTLE } from "../vault/config.js?v=7";
import { CARDS } from "../vault/carddb.js?v=2";
import { cardEl } from "../vault/cardui.js?v=4";
import { inspect } from "../vault/opening.js?v=4";
import { rngFrom, newSeed, shuffleWith } from "../vault/rng.js?v=1";
import { battleResultOf, resultToDb, resultFromDb } from "../vault/result.js?v=3";
import { el, srvNow, presentIn, optButtons } from "../feud/common.js?v=4";

const GT = "cardvault";
const $ = id => document.getElementById(id);
const pk = p => "p" + p;
let X = null;
const CH = () => Object.assign({ expireSeconds: 60, keepOverMinutes: 10 }, BATTLE.challenge || {});
const timerOf = d => [20, 30, 45].includes(Number(d && d.cvTimer)) ? Number(d.cvTimer) : BATTLE.pickSeconds;
export const cvPrefs = p => ({ cvTimer: [20, 30, 45].includes(Number(p.cvTimer)) ? Number(p.cvTimer) : BATTLE.pickSeconds, cvPack: p.cvPack ? 1 : 0 });
export const cvPrefsOf = d => ({ cvTimer: timerOf(d), cvPack: d && d.cvPack ? 1 : 0 });
const vaultOn = d => !!d && d.gameType === GT && (!d.status || d.status === "waiting");
const ss = { get(k) { try { return JSON.parse(sessionStorage.getItem(k) || "[]"); } catch (e) { return []; } }, set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

export function initCardVault(ctx) {
    X = ctx;
    Object.assign(window, {
        setCvOpt(k, v) {
            const d = X.data(); if (!d || !X.amHost() || d.status !== "waiting") return;
            X.sfx("pick");
            if (k === "timer") X.lobbySet({ cvTimer: Number(v) });
            if (k === "pack") X.lobbySet({ cvPack: d.cvPack ? 0 : 1 });
        },
        cvEnterVault: () => X.openVault()
    });
    closed = new Set(ss.get("aap_cv_closed"));
    setInterval(() => { if (invBox && !invBox.classList.contains("hidden")) renderInvites(X.data()); }, 1000);
}

/* ---------------- challenges / battles in the room ---------------- */
const nodes = d => Object.entries((d && d.cvb) || {}).filter(([, b]) => b && typeof b === "object").map(([bid, b]) => Object.assign({}, b, { bid, from: Number(b.from), to: arr(b.to).map(Number), acc: b.acc || {} }));
export const seatsOf = b => [b.from].concat(b.to);
const OPEN = ["invite", "live"];
export const cvBattles = d => nodes(d);
export const busyIn = (d, p) => nodes(d).find(b => OPEN.includes(b.st) && seatsOf(b).includes(Number(p))) || null;
const deckOf = (d, p) => { const v = (d.cvDeck || {})[pk(p)]; return v && arr(v.cards).length === 10 ? { name: String(v.name || "Deck"), cards: arr(v.cards).map(Number).filter(id => CARDS[id]) } : null; };
export const cvDeckOf = deckOf;
export const locOf = (d, p) => ((d && d.vloc) || {})[pk(p)] || "l";
const inRoom = (d, p) => { const n = d && d["player" + p]; return !!n && !n.left; };
async function nodeTx(bid, fn) {
    try {
        await X.runTransaction(X.ref(X.db, "rooms/" + X.room() + "/cvb/" + bid), cur => {
            if (!cur) return;
            const b = JSON.parse(JSON.stringify(cur));
            if (fn(b) === false) return;
            return b;
        });
    } catch (e) { console.error(e); X.toast("Could not send that. Try again."); }
}
export async function cvChallenge(opps) {
    const d = X.data(), me = X.me(); if (!vaultOn(d)) return false;
    const deck = X.activeDeck(); if (!deck) { X.toast("You need a 10-card deck first: open the Decks tab."); return false; }
    opps = [...new Set(opps.map(Number))].filter(p => p !== me && X.activeSlots(d).includes(p));
    if (!opps.length) { X.toast("Pick who to challenge."); return false; }
    if (opps.length + 1 > BATTLE.ffa.max) { X.toast("A battle holds up to " + BATTLE.ffa.max + " players."); return false; }
    if (busyIn(d, me)) { X.toast("You're already in a challenge or a battle."); return false; }
    const busy = opps.filter(p => busyIn(d, p)); if (busy.length) { X.toast(busy.map(p => X.pName(d, p)).join(", ") + (busy.length > 1 ? " are" : " is") + " already in a battle."); return false; }
    const bid = "b" + srvNow().toString(36) + me;
    try { await X.update(X.ref(X.db, "rooms/" + X.room() + "/cvb/" + bid), { from: me, to: opps, acc: { [pk(me)]: deck }, st: "invite", at: srvNow(), timer: timerOf(d), pack: d.cvPack ? 1 : 0 }); }
    catch (e) { console.error(e); X.toast("Could not send the challenge."); return false; }
    X.sfx("ready"); return true;
}
export async function cvAccept(bid) {
    const deck = X.activeDeck(), me = X.me();
    if (!deck) { X.toast("You need a 10-card deck to accept: open the Decks tab."); X.openVault("decks"); return; }
    X.sfx("ready");
    await nodeTx(bid, b => { if (b.st !== "invite" || !arr(b.to).map(Number).includes(me)) return false; b.acc = Object.assign({}, b.acc, { [pk(me)]: deck }); });
}
export const cvDecline = bid => { X.sfx("close"); return nodeTx(bid, b => { if (b.st !== "invite") return false; b.st = "declined"; b.by = X.me(); b.fin = srvNow(); }); };
export const cvCancel = bid => { X.sfx("close"); return nodeTx(bid, b => { if (b.st !== "invite" || Number(b.from) !== X.me()) return false; b.st = "cancelled"; b.by = X.me(); b.fin = srvNow(); }); };

/* ---------------- host duties: start accepted challenges, resolve rounds, expire, clean up ---------------- */
let dutyT = 0;
const dutyKeys = new Map();
export function cvDuties(d) {
    if (!X.amHost() || !d || !d.cvb) { clearInterval(dutyT); dutyT = 0; return; }
    if (!dutyT) dutyT = setInterval(dutyCheck, 400);
    dutyCheck();
}
function dutyCheck() {
    const d = X.data();
    if (!d || !X.amHost() || !d.cvb) { clearInterval(dutyT); dutyT = 0; return; }
    const now = srvNow(), pres = presentIn(d), on = vaultOn(d), C = CH();
    nodes(d).forEach(b => {
        const seats = seatsOf(b); let kind = "";
        if (b.st === "invite") {
            if (!on || seats.some(p => !inRoom(d, p))) kind = "cancel";
            else if (seats.every(p => b.acc[pk(p)])) kind = "build";
            else if (now - Number(b.at) > C.expireSeconds * 1000) kind = "expire";
        } else if (b.st === "live") {
            if (!on || seats.every(p => !inRoom(d, p))) kind = "void";
            else if (b.s && b.s.phase === "over") kind = "finish";
            else if (b.s && b.s.phase === "pick") { const k = due(normalize(JSON.parse(JSON.stringify(b.s))), now, pres); if (k) kind = "due"; }
        } else if (now - Number(b.fin || b.end || b.at || 0) > C.keepOverMinutes * 60000) kind = "prune";
        if (!kind) return;
        const key = kind + ":" + (b.s ? [b.s.n, b.s.round, b.s.ext, b.s.dl].join(":") : b.st);
        if (dutyKeys.get(b.bid) === key) return; dutyKeys.set(b.bid, key);
        setTimeout(() => hostTx(b.bid, kind), 0);        // (deferred: a transaction inside the room listener re-fires it with an older snapshot)
    });
}
function hostTx(bid, kind) {
    if (kind === "prune") return X.update(X.ref(X.db, "rooms/" + X.room() + "/cvb"), { [bid]: null }).catch(() => {});
    return nodeTx(bid, b => {
        const d = X.data(), now = srvNow(), pres = presentIn(d), seats = [Number(b.from)].concat(arr(b.to).map(Number));
        if (kind === "cancel" || kind === "expire") { if (b.st !== "invite") return false; b.st = kind === "cancel" ? "cancelled" : "expired"; b.fin = now; return; }
        if (kind === "void") { if (b.st !== "live") return false; b.st = "void"; b.fin = now; return; }
        if (kind === "build") {
            const acc = b.acc || {};
            if (b.st !== "invite" || !seats.every(p => acc[pk(p)])) return false;
            const decks = {}, names = {}, uids = {};
            seats.forEach(p => { decks[pk(p)] = arr(acc[pk(p)].cards).map(Number).filter(id => CARDS[id]); names[pk(p)] = X.pName(d, p); uids[pk(p)] = String((d["player" + p] || {}).uid || ""); });
            if (seats.some(p => new Set(decks[pk(p)]).size !== 10)) { b.st = "cancelled"; b.why = "deck"; b.fin = now; return; }
            const seed = newSeed();
            b.s = JSON.parse(JSON.stringify(newBattle({ mid: now, fmt: seats.length > 2 ? "ffa" : "duel", players: seats, decks, names, now, seed, pickMs: (Number(b.timer) || BATTLE.pickSeconds) * 1000 })));
            b.st = "live"; b.t0 = now; b.uids = uids; b.seed = seed;
            return;
        }
        if (kind === "due" || kind === "finish") {
            if (b.st !== "live" || !b.s) return false;
            const s = normalize(b.s);
            if (kind === "due") { const k = due(s, now, pres); if (!k) return false; applyDue(s, k, now, pres); }
            b.s = JSON.parse(JSON.stringify(s));
            if (s.phase === "over") { b.st = "over"; b.end = now; b.fin = now; const r = battleResultOf(b, d, bid, now); if (r) b.res = resultToDb(r); }
        }
    });
}

/* ---------------- every room update: my deck, my coins, invitations ---------------- */
let deckSent = "", locSent = "";
const paid = new Set();
export function cvSync(d) {
    if (!X) return;
    if (!d) { renderInvites(null); return; }      // left the room (or never in one): no challenge strip
    const me = X.me(), on = vaultOn(d);
    if (on) {
        const mine = X.activeDeck(), cur = (d.cvDeck || {})[pk(me)], want = mine ? JSON.stringify(mine) : "";
        if (want && want !== deckSent && JSON.stringify({ name: cur && cur.name, cards: cur && arr(cur.cards).map(Number) }) !== want) { deckSent = want; X.update(X.ref(X.db, "rooms/" + X.room() + "/cvDeck/" + pk(me)), mine).catch(() => { deckSent = ""; }); }
    }
    nodes(d).forEach(b => {
        if (b.st !== "over" || !b.res || !seatsOf(b).includes(me) || paid.has(b.bid)) return;
        paid.add(b.bid);
        const r = resultFromDb(b.res); if (r) X.report(r, arr(((b.s || {}).used || {})[pk(me)]).map(Number));
    });
    renderInvites(d);
}
/* where I am (the Battle tab and the lobby seats show it) */
export function cvLoc(d, loc) {
    if (!vaultOn(d)) { locSent = ""; return; }
    const me = X.me(), k = X.room() + ":" + me + ":" + loc;
    if (locSent === k) return;
    locSent = k; if (locOf(d, me) === loc) return;
    X.update(X.ref(X.db, "rooms/" + X.room() + "/vloc"), { [pk(me)]: loc }).catch(() => { locSent = ""; });
}

/* the invitation strip: on the lobby and on the Vault page (never over a battle) */
let invBox = null;
function renderInvites(d) {
    if (!invBox) { invBox = el("div", "cv-inv hidden"); invBox.id = "cvInvite"; invBox.setAttribute("role", "region"); invBox.setAttribute("aria-label", "Battle challenges"); invBox.setAttribute("aria-live", "polite"); document.body.appendChild(invBox); }
    const show = vaultOn(d) && X.screen() !== "cardvault" && X.inRoom();
    const me = show ? X.me() : 0, now = srvNow(), C = CH();
    const list = show ? nodes(d).filter(b => seatsOf(b).includes(me) && (b.st === "invite" || (b.st === "live" && closed.has(b.bid)))) : [];
    const sig = list.map(b => b.bid + b.st + Object.keys(b.acc).join() + Math.max(0, Math.ceil((C.expireSeconds * 1000 - (now - Number(b.at))) / 1000))).join("|");
    invBox.classList.toggle("hidden", !list.length);
    if (invBox.dataset.sig === sig) return; invBox.dataset.sig = sig; invBox.innerHTML = "";
    list.forEach(b => {
        const row = el("div", "cv-invrow"), who = seatsOf(b).filter(p => p !== me), mineAcc = !!b.acc[pk(me)];
        const left = Math.max(0, Math.ceil((C.expireSeconds * 1000 - (now - Number(b.at))) / 1000));
        const fmt = seatsOf(b).length > 2 ? "free-for-all (" + seatsOf(b).length + ")" : "1v1";
        const txt = el("div", "cv-invtxt");
        if (b.st === "live") { txt.append(el("b", null, "⚔ Your battle is still on"), el("small", null, "vs " + who.map(p => X.pName(d, p)).join(", ") + " · your cards are auto-picked when the timer runs out")); row.append(txt, btnEl("Return", "alt sm", () => cvReturn(b.bid))); }
        else if (b.from !== me && !mineAcc) {
            txt.append(el("b", null, "⚔ " + X.pName(d, b.from) + " challenges you"), el("small", null, fmt + (who.length > 1 ? " with " + who.filter(p => p !== b.from).map(p => X.pName(d, p)).join(", ") : "") + " · " + (Number(b.timer) || BATTLE.pickSeconds) + " s picks" + (b.pack ? " · winner gets a free pack" : "") + " · " + left + " s"));
            row.append(txt, btnEl("Accept", "alt sm", () => cvAccept(b.bid)), btnEl("Decline", "ghost sm", () => cvDecline(b.bid)));
        } else {
            const wait = seatsOf(b).filter(p => !b.acc[pk(p)]);
            txt.append(el("b", null, b.from === me ? "Challenge sent" : "Accepted"), el("small", null, "Waiting for " + wait.map(p => X.pName(d, p)).join(", ") + " · " + left + " s"));
            row.append(txt, b.from === me ? btnEl("Cancel", "ghost sm", () => cvCancel(b.bid)) : btnEl("Decline", "ghost sm", () => cvDecline(b.bid)));
        }
        invBox.appendChild(row);
    });
}
const btnEl = (t, cls, fn) => { const b = el("button", "btn " + cls, t); b.type = "button"; b.onclick = fn; return b; };

/* ---------------- lobby panel (host settings for every challenge in the room) ---------------- */
export function cvHint() { return "Everyone gets their own Vault page: shop, scratch cards, packs, collection and decks. Challenge anyone in the room from its Battle tab."; }
export function cvReq(d) { return { ok: true, msg: "ARCADE VAULT is open: everyone has their own Vault. Battles are challenges from the Battle tab" }; }
export function cvLobby(d, lock) {
    optButtons($("cvTimerBtns"), [20, 30, 45], timerOf(d), lock, v => v + " s", v => window.setCvOpt("timer", v));
    const pb = $("cvPackBtn"); pb.textContent = d.cvPack ? "On: the winner picks a free pack" : "Off"; pb.classList.toggle("selected", !!d.cvPack); pb.disabled = lock;
    const mine = X.activeDeck();
    $("cvMyDeck").textContent = mine ? "Your battle deck: " + mine.name : "You need a 10-card deck to battle: build one in the Vault's Decks tab.";
    $("cvHint").textContent = "Battles: pick a card in secret, everyone flips together, damage = Power minus the opposing Defense, then abilities. 1v1: " + BATTLE.duel.life + " life. Challenge 2+ players for a free-for-all (" + BATTLE.ffa.life + " life, pick a target too).";
}

/* ---------------- which battle this player looks at ---------------- */
let closed = new Set(), watching = "", viewing = "";
const saveClosed = () => ss.set("aap_cv_closed", [...closed].slice(-40));
export function battleWanted(d) {
    if (!vaultOn(d)) { watching = ""; return null; }
    const me = X.me(), list = nodes(d).filter(b => b.s);
    const mine = list.filter(b => seatsOf(b).includes(me) && (b.st === "live" || b.st === "over") && !closed.has(b.bid)).sort((a, b) => Number(b.t0 || 0) - Number(a.t0 || 0))[0];
    if (mine) return mine.bid;
    if (watching && list.some(b => b.bid === watching)) return watching;
    watching = ""; return null;
}
export function cvWatch(bid) { watching = bid; closed.delete(bid); X.sfx("pick"); X.refresh(); }
export function cvReturn(bid) { closed.delete(bid); saveClosed(); X.sfx("pick"); X.refresh(); }
async function closeBattle(bid, live) {
    if (live && !(await X.uiConfirm({ title: "Leave the battle screen?", text: "The battle goes on: when your timer runs out a card is picked for you. Come back any time from the Battle tab.", ok: "Leave" }))) return;
    closed.add(bid); saveClosed(); if (watching === bid) watching = ""; viewing = "";
    X.sfx("close"); X.refresh();
}
export function showBattle(d, bid) {
    X.showOnly("cardvault");
    const b = nodes(d).find(x => x.bid === bid); if (!b || !b.s) return;
    const s = normalize(JSON.parse(JSON.stringify(b.s)));
    const me = X.me(), playing = arr(s.players).includes(me);
    if (viewing !== bid) { viewing = bid; picked = { c: 0, t: 0 }; lastN = -1; }
    const others = arr(s.players).filter(p => p !== me);
    render($("cvWrap"), s, {
        me: playing ? me : 0, pub: p => X.pPub(d, p), present: presentIn(d), room: true, holo: id => X.isHolo(id),
        pick: (c, t) => pickTx(bid, c, t),
        again: playing && b.st === "over" && others.every(p => inRoom(d, p)) ? async () => { if (await cvChallenge(others)) closeBattle(bid); } : null,
        back: () => closeBattle(bid, playing && b.st === "live"), backLabel: playing && b.st === "live" ? "Leave battle screen" : "Back to the Vault"
    });
    $("cvTurnT").textContent = b.st === "void" ? "BATTLE STOPPED" : s.phase === "over" ? "BATTLE OVER" : "ROUND " + s.round + (s.fmt === "ffa" ? " · FREE-FOR-ALL" : " · 1V1");
    $("cvStatus").textContent = !playing ? "Watching " + arr(s.players).map(p => s.names[pk(p)]).join(" vs ") : !alive(s).includes(me) ? "Knocked out: watching" : s.phase === "over" ? "" : (s.picks || {})[pk(me)] ? "Card locked in. Waiting for the others…" : "Pick a card" + (s.fmt === "ffa" ? " and a target" : "");
}
async function pickTx(bid, c, t) {
    const me = X.me();
    try {
        await X.runTransaction(X.ref(X.db, "rooms/" + X.room() + "/cvb/" + bid + "/s"), cur => {
            if (!cur) return;
            const st = normalize(JSON.parse(JSON.stringify(cur)));
            if (act(st, { p: me, c, t })) return;
            return JSON.parse(JSON.stringify(st));
        });
    } catch (e) { console.error(e); X.toast("Could not send that. Try again."); }
}
export function cvReset() { const o = $("cvOver"); if (o) o.remove(); }

/* ---------------- the battle view (rooms and practice share it) ---------------- */
let picked = { c: 0, t: 0 }, lastN = -1, tickT = 0;
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
    if (o.back && s.phase !== "over") { const bk = el("button", "btn ghost sm", "‹ " + (o.backLabel || "Back to the Vault")); bk.type = "button"; bk.onclick = o.back; tools.appendChild(bk); }
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
    if (o.room) {
        if (o.again) { const a = el("button", "btn alt", "Rematch"); a.type = "button"; a.onclick = o.again; b.appendChild(a); }
        const l = el("button", "btn ghost", "Back to the Vault"); l.type = "button"; l.onclick = o.back; b.appendChild(l);
    }
    if (o.exit) { const a = el("button", "btn alt", "Play again"); a.type = "button"; a.onclick = o.again; const l = el("button", "btn ghost", "Leave"); l.type = "button"; l.onclick = o.exit; b.append(a, l); }
    p.appendChild(b);
    if (o.room && o.me) p.appendChild(el("small", "vt-rule", "Coins for your placement arrive as a pop-up (battles of 1 minute or more)."));
    root.prepend(p);
    if (o.fresh !== false && !overSeen.has(s.mid + ":" + (s.n || 0))) { overSeen.add(s.mid + ":" + (s.n || 0)); try { p.scrollIntoView({ block: "start", behavior: "smooth" }); } catch (e) {} }
    if (!p.dataset.sfx) { p.dataset.sfx = 1; X.sfx(win.includes(o.me) && !draw ? "win" : "reveal"); }
}

/* ---------------- practice vs CPU (local, no coins) ---------------- */
let practice = null;
export function startPractice() {
    const deck = X.activeDeck(); if (!deck) { X.toast("Build a 10-card deck first (Decks tab)."); return; }
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
