/* =====================================================================
   ANIME TCG · DUELS IN A ROOM (the ninth lobby mode; internal id "cardvault", kept for saved data)
   Picking ANIME TCG in the lobby doesn't start a shared match: every player gets their own Anime TCG page
   (js/vault/vault.js) and challenges others in the room from its Duel tab. Each challenge is its own duel,
   several can run at once, and anyone not in one keeps shopping, opening packs or watching.
   The duel: js/duel/engine.js (rules, pure), js/duel/ui.js (the screen), js/duel/net.js (keys and encryption).

   Firebase (rooms/<code>):
     cvb/<bid>   one challenge / duel: { from, to:[slots], acc:{pN: deck}, st, at, timer, host, t0, end, pub, pv:{pN}, sx, res, s }
                 st: invite -> live -> over, or declined / cancelled / expired / void.
                 The challenger writes the invite with their deck; each opponent accepts with theirs. The room HOST
                 builds the duel (seeded), applies every intent, runs the timers, and publishes the views:
                 pub = the spectators' view; pv/pN = player N's view, encrypted for N alone; sx = the full state,
                 encrypted for the host's browser. When it ends: s = the placements summary, res = the standard result.
     cvi/<bid>/pN/<n>   player N's intents (moves), applied in order by the host.
     pk/pN       each player's public key (ECDH) for their private view.
     cvDeck/pN   each player's active deck while the lobby is on ANIME TCG (the Duel tab shows it).
     vloc/pN     where each player is: "v" Anime TCG page, "b" a duel, "l" the lobby.
   Practice vs Bot runs the same engine locally (no coins, no stats, no missions).
   ===================================================================== */
import { newDuel, act, tick, forceEnd, viewFor, placements, useDefs, lifeOf, alive, P, arr } from "../duel/engine.js?v=1";
import { DEFS, deckList, ACTIONS, ACTION_IDS } from "../duel/cards.js?v=3";
import { botMove } from "../duel/bot.js?v=3";
import { mountDuel } from "../duel/ui.js?v=3";
import { myKeys, seal, open, sealFull, openFull, hasHostKey, cryptoOk } from "../duel/net.js?v=1";
import { DUEL, DECK } from "../vault/config.js?v=17";
import { CARDS } from "../vault/carddb.js?v=6";
import { newSeed } from "../vault/rng.js?v=2";
import { duelResultOf, resultToDb, resultFromDb } from "../vault/result.js?v=6";
import { el, srvNow, presentIn, optButtons } from "../feud/common.js?v=4";

useDefs(DEFS);
const GT = "cardvault";
const $ = id => document.getElementById(id);
const pk = p => "p" + p;
let X = null;
const CH = () => Object.assign({ expireSeconds: 60, keepOverMinutes: 10 }, DUEL.challenge || {});
const TIMERS = [60, 90, 120];
const timerOf = d => TIMERS.includes(Number(d && d.cvTimer)) ? Number(d.cvTimer) : DUEL.rules.turnSec;
export const cvPrefs = p => ({ cvTimer: TIMERS.includes(Number(p.cvTimer)) ? Number(p.cvTimer) : DUEL.rules.turnSec });
export const cvPrefsOf = d => ({ cvTimer: timerOf(d) });
const vaultOn = d => !!d && d.gameType === GT && (!d.status || d.status === "waiting");
const ss = { get(k) { try { return JSON.parse(sessionStorage.getItem(k) || "[]"); } catch (e) { return []; } }, set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const rulesFor = b => Object.assign({}, DUEL.rules, { turnSec: Number(b && b.timer) || DUEL.rules.turnSec });

export function initCardVault(ctx) {
    X = ctx;
    Object.assign(window, {
        setCvOpt(k, v) { const d = X.data(); if (!d || !X.amHost() || d.status !== "waiting") return; X.sfx("pick"); if (k === "timer") X.lobbySet({ cvTimer: Number(v) }); },
        cvEnterVault: () => X.openVault()
    });
    closed = new Set(ss.get("aap_cv_closed"));
    setInterval(() => { if (invBox && !invBox.classList.contains("hidden")) renderInvites(X.data()); }, 1000);
    if (cryptoOk()) myKeys();
}

/* ---------------- challenges ---------------- */
const nodes = d => Object.entries((d && d.cvb) || {}).filter(([, b]) => b && typeof b === "object").map(([bid, b]) => Object.assign({}, b, { bid, from: Number(b.from), to: arr(b.to).map(Number), acc: b.acc || {} }));
export const seatsOf = b => [b.from].concat(b.to);
const OPEN = ["invite", "live"];
export const cvDuels = d => nodes(d);
export const busyIn = (d, p) => nodes(d).find(b => OPEN.includes(b.st) && seatsOf(b).includes(Number(p))) || null;
const okDeck = cards => arr(cards).length === DECK.size;
const deckOf = (d, p) => { const v = (d.cvDeck || {})[pk(p)]; return v && okDeck(v.cards) ? { name: String(v.name || "Deck"), cards: arr(v.cards).map(String) } : null; };
export const cvDeckOf = deckOf;
export const locOf = (d, p) => ((d && d.vloc) || {})[pk(p)] || "l";
const inRoom = (d, p) => { const n = d && d["player" + p]; return !!n && !n.left; };
async function nodeTx(bid, fn) {
    try { await X.runTransaction(X.ref(X.db, "rooms/" + X.room() + "/cvb/" + bid), cur => { if (!cur) return; const b = JSON.parse(JSON.stringify(cur)); if (fn(b) === false) return; return b; }); }
    catch (e) { console.error(e); X.toast("Could not send that. Try again."); }
}
export async function cvChallenge(opps) {
    const d = X.data(), me = X.me(); if (!vaultOn(d)) return false;
    if (!cryptoOk()) { X.toast("This browser can't run secure duels (no Web Crypto)."); return false; }
    const deck = X.activeDeck(); if (!deck) { X.toast("You need a valid " + DECK.size + "-card deck first: open the Decks tab."); return false; }
    opps = [...new Set(opps.map(Number))].filter(p => p !== me && X.activeSlots(d).includes(p));
    if (!opps.length) { X.toast("Pick who to challenge."); return false; }
    if (opps.length + 1 > DUEL.ffa.max) { X.toast("A duel holds up to " + DUEL.ffa.max + " players."); return false; }
    if (busyIn(d, me)) { X.toast("You're already in a challenge or a duel."); return false; }
    const busy = opps.filter(p => busyIn(d, p)); if (busy.length) { X.toast(busy.map(p => X.pName(d, p)).join(", ") + (busy.length > 1 ? " are" : " is") + " already in a duel."); return false; }
    const bid = "b" + srvNow().toString(36) + me;
    try { await X.update(X.ref(X.db, "rooms/" + X.room() + "/cvb/" + bid), { from: me, to: opps, acc: { [pk(me)]: deck }, st: "invite", at: srvNow(), timer: timerOf(d) }); }
    catch (e) { console.error(e); X.toast("Could not send the challenge."); return false; }
    X.sfx("ready"); return true;
}
export async function cvAccept(bid) {
    const deck = X.activeDeck(), me = X.me();
    if (!deck) { X.toast("You need a valid " + DECK.size + "-card deck to accept: open the Decks tab."); X.openVault("decks"); return; }
    X.sfx("ready");
    await nodeTx(bid, b => { if (b.st !== "invite" || !arr(b.to).map(Number).includes(me)) return false; b.acc = Object.assign({}, b.acc, { [pk(me)]: deck }); });
}
export const cvDecline = bid => { X.sfx("close"); return nodeTx(bid, b => { if (b.st !== "invite") return false; b.st = "declined"; b.by = X.me(); b.fin = srvNow(); }); };
export const cvCancel = bid => { X.sfx("close"); return nodeTx(bid, b => { if (b.st !== "invite" || Number(b.from) !== X.me()) return false; b.st = "cancelled"; b.by = X.me(); b.fin = srvNow(); }); };

/* ---------------- the host: build, run and publish duels ---------------- */
let dutyT = 0;
const HS = new Map();           // bid -> { s, busy, away: {pN: since} }
export function cvDuties(d) {
    if (!X.amHost() || !d || !d.cvb) { clearInterval(dutyT); dutyT = 0; return; }
    if (!dutyT) dutyT = setInterval(dutyCheck, 300);
    dutyCheck();
}
function dutyCheck() {
    const d = X.data();
    if (!d || !X.amHost() || !d.cvb) { clearInterval(dutyT); dutyT = 0; return; }
    const now = srvNow(), on = vaultOn(d), C = CH();
    nodes(d).forEach(b => {
        const seats = seatsOf(b);
        if (b.st === "invite") {
            if (!on || seats.some(p => !inRoom(d, p))) simple(b.bid, "cancelled");
            else if (seats.every(p => b.acc[pk(p)])) build(b, d, now);
            else if (now - Number(b.at) > C.expireSeconds * 1000) simple(b.bid, "expired");
        } else if (b.st === "live") {
            if (!on || seats.every(p => !inRoom(d, p))) { simple(b.bid, "void"); return; }
            run(b, d, now);
        } else if (now - Number(b.fin || b.end || b.at || 0) > C.keepOverMinutes * 60000) { X.update(X.ref(X.db, "rooms/" + X.room()), { ["cvb/" + b.bid]: null, ["cvi/" + b.bid]: null, ["cve/" + b.bid]: null }).catch(() => {}); }
    });
}
const simpleSent = new Set();
function simple(bid, st) { const k = bid + st; if (simpleSent.has(k)) return; simpleSent.add(k); setTimeout(() => nodeTx(bid, b => { if (!OPEN.includes(b.st)) return false; b.st = st; b.fin = srvNow(); }), 0); }
function build(b, d, now) {
    if (HS.has(b.bid)) return; const H = { s: null, busy: true, away: {} }; HS.set(b.bid, H);
    const seats = seatsOf(b), decks = {}, names = {}, uids = {};
    seats.forEach(p => { decks[pk(p)] = deckList(arr(b.acc[pk(p)].cards)); names[pk(p)] = X.pName(d, p); uids[pk(p)] = String((d["player" + p] || {}).uid || ""); });
    if (seats.some(p => decks[pk(p)].length !== DECK.size)) { HS.delete(b.bid); simple(b.bid, "cancelled"); return; }
    const seed = newSeed() >>> 0;
    H.s = newDuel({ id: b.bid, players: seats, decks, names, now, seed, rules: rulesFor(b) });
    H.s.inN = {}; H.s.used = {};
    publish(b.bid, H, d, { st: "live", t0: now, uids, seed, host: X.me() }).finally(() => { H.busy = false; });
}
/* apply the players' intents (in order), the timers and the disconnect rule, then publish */
function run(b, d, now) {
    let H = HS.get(b.bid);
    if (!H) {      // after a reload: the full state, if this browser is the one that started the duel
        if (!hasHostKey(b.bid) || Number(b.host) !== X.me()) { simple(b.bid, "void"); return; }
        H = { s: null, busy: true, away: {} }; HS.set(b.bid, H);
        openFull(b.bid, b.sx).then(s => { if (!s) { simple(b.bid, "void"); return; } H.s = s; H.busy = false; });
        return;
    }
    if (H.busy || !H.s) return;
    const s = H.s, before = s.evn;
    const intents = (d.cvi || {})[b.bid] || {};
    seatsOf(b).forEach(p => {
        const mine = intents[pk(p)] || {}, last = Number((s.inN || {})[pk(p)]) || 0;
        Object.keys(mine).map(Number).filter(n => n > last).sort((a, c) => a - c).forEach(n => {
            const a = Object.assign({}, mine[n], { by: p }); act(s, a, now); s.inN[pk(p)] = n;
            if (a.k === "summon") { const u = s.cards[a.u]; if (u) s.used[pk(p)] = arr(s.used[pk(p)]).concat(u.id); }
        });
    });
    tick(s, now);
    // a player who is gone: their turn ends after the grace time (and at once each turn while they stay away)
    const tp = Number(s.turnP), pres = presentIn(d);
    if (!s.over && tp) {
        if (!pres(tp)) { H.away[pk(tp)] = H.away[pk(tp)] || now; if (now - H.away[pk(tp)] > DUEL.rules.reconnectGrace * 1000) { forceEnd(s, now); H.away[pk(tp)] = now; } }
        else delete H.away[pk(tp)];
        if (s.pending && !pres(Number(s.pending.who))) tick(s, Number(s.pending.dl));
    }
    if (s.evn !== before || Object.keys(intents).length) {
        H.busy = true;
        const patch = {}; if (s.over) Object.assign(patch, finishPatch(b, d, s, now));
        publish(b.bid, H, d, patch).finally(() => { H.busy = false; });
        // processed intents are cleared
        const clr = {}; seatsOf(b).forEach(p => { Object.keys((intents[pk(p)] || {})).forEach(n => { if (Number(n) <= Number(s.inN[pk(p)])) clr["cvi/" + b.bid + "/" + pk(p) + "/" + n] = null; }); });
        if (Object.keys(clr).length) X.update(X.ref(X.db, "rooms/" + X.room()), clr).catch(() => {});
    }
}
function finishPatch(b, d, s, now) {
    const summary = { phase: "over", names: s.names, places: placements(s).map(x => ({ p: x.slot, life: lifeOf(s, x.slot), place: x.place })), used: s.used };
    const r = duelResultOf(Object.assign({}, b, { s: summary, end: now }), d, b.bid, now);
    return { st: "over", end: now, fin: now, s: summary, res: r ? resultToDb(r) : null };
}
async function publish(bid, H, d, extra) {
    const s = H.s, pks = d.pk || {};
    const patch = Object.assign({ pub: viewFor(s, 0), sx: await sealFull(bid, s) }, extra || {});
    for (const p of s.players) { const key = pks[pk(p)]; if (key) { const box = await seal(viewFor(s, p), key); if (box) patch["pv/" + pk(p)] = box; } }
    const flat = {}; Object.entries(patch).forEach(([k, v]) => { flat["cvb/" + bid + "/" + k] = v; });
    await X.update(X.ref(X.db, "rooms/" + X.room()), flat).catch(e => console.error(e));
}

/* ---------------- every room update: my key, my deck, my coins, invitations ---------------- */
let deckSent = "", locSent = "", keySent = "";
const paid = new Set();
export function cvSync(d) {
    if (!X) return;
    if (!d) { renderInvites(null); return; }
    const me = X.me(), on = vaultOn(d);
    if (on) {
        const mine = X.activeDeck(), cur = (d.cvDeck || {})[pk(me)], want = mine ? JSON.stringify(mine) : "";
        if (want && want !== deckSent && JSON.stringify({ name: cur && cur.name, cards: cur && arr(cur.cards).map(String) }) !== want) { deckSent = want; X.update(X.ref(X.db, "rooms/" + X.room() + "/cvDeck/" + pk(me)), mine).catch(() => { deckSent = ""; }); }
        if (cryptoOk()) myKeys().then(k => { if (!k) return; const ks = X.room() + JSON.stringify(k.pubJwk); if (keySent === ks || JSON.stringify((d.pk || {})[pk(me)]) === JSON.stringify(k.pubJwk)) return; keySent = ks; X.update(X.ref(X.db, "rooms/" + X.room() + "/pk"), { [pk(me)]: k.pubJwk }).catch(() => { keySent = ""; }); });
    }
    nodes(d).forEach(b => {
        if (b.st !== "over" || !b.res || !seatsOf(b).includes(me) || paid.has(b.bid)) return;
        paid.add(b.bid);
        const r = resultFromDb(b.res); if (r) X.report(r, arr(((b.s || {}).used || {})[pk(me)]).map(Number).filter(id => CARDS[id]));
    });
    renderInvites(d);
}
export function cvLoc(d, loc) {
    if (!vaultOn(d)) { locSent = ""; return; }
    const me = X.me(), k = X.room() + ":" + me + ":" + loc;
    if (locSent === k) return;
    locSent = k; if (locOf(d, me) === loc) return;
    X.update(X.ref(X.db, "rooms/" + X.room() + "/vloc"), { [pk(me)]: loc }).catch(() => { locSent = ""; });
}

/* the challenge strip: on the lobby and on the Anime TCG page (never over a duel) */
let invBox = null;
function renderInvites(d) {
    if (!invBox) { invBox = el("div", "cv-inv hidden"); invBox.id = "cvInvite"; invBox.setAttribute("role", "region"); invBox.setAttribute("aria-label", "Duel challenges"); invBox.setAttribute("aria-live", "polite"); document.body.appendChild(invBox); }
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
        if (b.st === "live") { txt.append(el("b", null, "Your duel is still on"), el("small", null, "vs " + who.map(p => X.pName(d, p)).join(", ") + " · your turn ends by itself when its timer runs out")); row.append(txt, btnEl("Return", "alt sm", () => cvReturn(b.bid))); }
        else if (b.from !== me && !mineAcc) {
            txt.append(el("b", null, X.pName(d, b.from) + " challenges you to a Duel"), el("small", null, fmt + (who.length > 1 ? " with " + who.filter(p => p !== b.from).map(p => X.pName(d, p)).join(", ") : "") + " · " + (Number(b.timer) || DUEL.rules.turnSec) + " s turns · " + left + " s"));
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

/* ---------------- lobby panel ---------------- */
export function cvHint() { return "Press Enter Anime TCG to open your own page: Packs Store, Collection, Decks and Duel. Everyone enters on their own and comes back with ‹ Lobby. Challenge anyone in the room to a Duel from its Duel tab. Skins and scratch cards are in the Shop."; }
export function cvReq(d) { return { ok: true, msg: "ANIME TCG is open: press Enter Anime TCG for your own page. Duels are challenges from its Duel tab" }; }
export function cvLobby(d, lock) {
    optButtons($("cvTimerBtns"), TIMERS, timerOf(d), lock, v => v + " s", v => window.setCvOpt("timer", v));
    const mine = X.activeDeck();
    $("cvMyDeck").textContent = mine ? "Your duel deck: " + mine.name : "You need a valid " + DECK.size + "-card deck to duel: build one in Anime TCG's Decks tab.";
    $("cvHint").textContent = "Duels: " + DUEL.rules.life + " life, a " + DECK.size + "-card deck, hand of " + DUEL.rules.hand + ". Summon characters, attack, play Support and Counter cards; the host's setting is the turn timer. Challenge 2+ players for a free-for-all (" + DUEL.rules.lifeFfa + " life).";
}

/* ---------------- which duel this player looks at ---------------- */
let closed = new Set(), watching = "", viewing = "", ui = null, uiBid = "";
const saveClosed = () => ss.set("aap_cv_closed", [...closed].slice(-40));
export function duelWanted(d) {
    if (practice) return null;
    if (!vaultOn(d)) { watching = ""; return null; }
    const me = X.me(), list = nodes(d).filter(b => b.pub || b.s);
    const mine = list.filter(b => seatsOf(b).includes(me) && (b.st === "live" || b.st === "over") && !closed.has(b.bid)).sort((a, b) => Number(b.t0 || 0) - Number(a.t0 || 0))[0];
    if (mine) return mine.bid;
    if (watching && list.some(b => b.bid === watching)) return watching;
    watching = ""; return null;
}
export function cvWatch(bid) { watching = bid; closed.delete(bid); X.sfx("pick"); X.refresh(); }
export function cvReturn(bid) { closed.delete(bid); saveClosed(); X.sfx("pick"); X.refresh(); }
async function closeDuel(bid, live) {
    if (live && !(await X.uiConfirm({ title: "Leave the duel screen?", text: "The duel goes on: your turns end by themselves when the timer runs out. Come back any time from the Duel tab.", ok: "Leave" }))) return;
    closed.add(bid); saveClosed(); if (watching === bid) watching = ""; viewing = "";
    X.sfx("close"); X.refresh();
}
const intentN = { n: 0 };
function sendIntent(bid, a) {
    const me = X.me(), n = Math.max(Date.now(), intentN.n + 1); intentN.n = n;
    const clean = JSON.parse(JSON.stringify(a)); delete clean.by;
    return X.update(X.ref(X.db, "rooms/" + X.room() + "/cvi/" + bid + "/" + pk(me)), { [n]: clean }).then(() => null).catch(() => "Could not send that. Try again.");
}
function screenFor(bid, me, playing, d) {
    if (ui && uiBid === bid) return ui;
    if (ui) ui.destroy();
    uiBid = bid;
    ui = mountDuel($("cvWrap"), {
        me: playing ? me : 0, defs: DEFS, names: p => X.pName(X.data(), p), pub: p => X.pPub(X.data(), p), avatar: (pub, n) => X.avatarEl(pub, { size: n }),
        sfx: X.sfx, toast: X.toast, flyClone: X.flyClone, now: srvNow,
        send: a => { if (!playing) return "You're watching."; return sendIntent(bid, a); },
        emote: playing ? id => X.update(X.ref(X.db, "rooms/" + X.room() + "/cve/" + bid), { [pk(me)]: { e: id, t: srvNow() } }) : null,
        onExit: () => closeDuel(bid, playing && (nodes(X.data()).find(x => x.bid === bid) || {}).st === "live"), exitLabel: playing ? "Leave" : "Back",
        onRematch: playing ? async () => { const others = seatsOf(nodes(X.data()).find(x => x.bid === bid) || { from: me, to: [] }).filter(p => p !== me); if (await cvChallenge(others)) closeDuel(bid); } : null,
        overNote: "Duels pay placement coins like every mode; the cards you summoned count toward their Veteran mark."
    });
    return ui;
}
let decoding = "";
/* quick emotes: rooms/<code>/cve/<bid>/pN = { e, t }; each one shows once, old ones (before we looked) are skipped */
const emoSeen = {};
function deliverEmotes(d, bid) {
    const list = (d.cve || {})[bid] || {}, now = srvNow(), win = ((DUEL.emotes || {}).showSec || 2.6) * 1000;
    Object.entries(list).forEach(([k, x]) => {
        const key = bid + "/" + k, t = Number(x && x.t) || 0; if (!t || t <= (emoSeen[key] || 0)) return;
        emoSeen[key] = t;
        if (Number(k.slice(1)) === X.me() || now - t > win || !ui || uiBid !== bid) return;   // my own were shown when I sent them
        ui.emote(Number(k.slice(1)), String(x.e || ""));
    });
}
export function showDuel(d, bid) {
    X.showOnly("cardvault");
    const b = nodes(d).find(x => x.bid === bid); if (!b) return;
    setTimeout(() => deliverEmotes(d, bid), 0);
    const me = X.me(), playing = seatsOf(b).includes(me);
    if (viewing !== bid) viewing = bid;
    $("cvTurnT").textContent = b.st === "void" ? "DUEL STOPPED" : b.st === "over" ? "DUEL OVER" : seatsOf(b).length > 2 ? "FREE-FOR-ALL DUEL" : "DUEL";
    if (b.st === "void") { $("cvStatus").textContent = "The duel was stopped (the host left or the mode changed). No coins."; return; }
    const host = (d.pk || {})[pk(b.host)];
    if (playing && b.pv && b.pv[pk(me)] && host) {
        const k = JSON.stringify(b.pv[pk(me)]).slice(0, 80); if (decoding === k) return; decoding = k;
        open(b.pv[pk(me)], host).then(view => { decoding = ""; if (!view) { $("cvStatus").textContent = "Couldn't read your hand (keys changed). Waiting for the next update…"; return; } if (viewing !== bid) return; screenFor(bid, me, true, d).update(view); $("cvStatus").textContent = view.over ? "" : Number(view.turnP) === me ? "Your turn" : "Opponent's turn"; });
    } else if (b.pub) { screenFor(bid, me, false, d).update(b.pub); $("cvStatus").textContent = "Watching " + seatsOf(b).map(p => X.pName(d, p)).join(" vs "); }
    else $("cvStatus").textContent = "Setting up the duel…";
}
export function cvReset() { if (ui && !practice) { ui.destroy(); ui = null; uiBid = ""; } }

/* ---------------- Practice vs Bot (local; no coins, stats or missions) ---------------- */
let practice = null;
export const practicing = () => !!practice;
function botDeck(level) {
    const ids = Object.keys(CARDS).map(Number), want = level === "hard" ? [2, 3, 4] : level === "normal" ? [1, 2, 3] : [0, 1];
    const pool = ids.filter(id => want.includes(CARDS[id].r)).sort(() => Math.random() - .5).slice(0, DECK.size - 4);
    const acts = ACTION_IDS.filter(a => ACTIONS[a].lvl <= (level === "hard" ? 10 : level === "normal" ? 5 : 2)).sort(() => Math.random() - .5).slice(0, 4);
    return pool.map(String).concat(acts.map(a => "a:" + a));
}
export function startPractice(level = "normal", opts = {}) {
    const deck = opts.deck || (X.activeDeck() || {}).cards;
    if (!deck || deck.length !== DECK.size) { X.toast("Build a valid " + DECK.size + "-card deck first (Decks tab)."); return; }
    // opts.bots > 1: a free-for-all practice (you + that many bots, all of the same level)
    const me = 1, nb = Math.max(1, Math.min((DUEL.ffa.max || 8) - 1, Number(opts.bots) || 1)), bots = Array.from({ length: nb }, (_, i) => i + 2), bot = bots[0];
    const LV = level[0].toUpperCase() + level.slice(1), BOT_NAMES = ["Kaze", "Rin", "Tetsu", "Mika", "Sora", "Jun", "Hana"];
    const decks = { p1: deckList(deck) }, names = { p1: (X.myName && X.myName()) || "You" };
    bots.forEach((q, i) => { decks[pk(q)] = deckList(i === 0 && opts.botDeck || botDeck(level)); names[pk(q)] = i === 0 && opts.botName || (nb > 1 ? "Bot " + BOT_NAMES[i] + " · " + LV : "Bot · " + LV); });
    const s = newDuel({ id: "practice", players: [me].concat(bots), decks, names, now: Date.now(), seed: newSeed() >>> 0, rules: Object.assign({}, DUEL.rules, opts.rules || {}) });
    practice = { s, level, bot, bots, me, timer: 0 };
    X.showOnly("cardvault"); $("cvTurnT").textContent = opts.title || "PRACTICE VS BOT"; $("cvStatus").textContent = opts.status || "No coins, stats or missions";
    if (ui) ui.destroy();
    uiBid = "practice";
    ui = mountDuel($("cvWrap"), {
        me, defs: DEFS, names: p => s.names[pk(p)], pub: p => p === me && X.myPub ? X.myPub() : { name: s.names[pk(p)] }, avatar: (pub, n) => X.avatarEl(pub, { size: n }),
        sfx: X.sfx, toast: X.toast, flyClone: X.flyClone, now: () => Date.now(),
        send: a => { const r = act(s, Object.assign({}, a, { by: me }), Date.now()); if (!r) { push(); if (opts.onMove) opts.onMove(a, s); } return r; },
        onExit: () => endPractice(), exitLabel: "Leave", onRematch: () => startPractice(level, opts),
        overNote: "Practice pays no coins and counts for no stats or missions.",
        emote: () => null,
        extraTools: opts.extraTools
    });
    const push = () => { ui.update(viewFor(s, me)); botLoop(); };
    function botLoop() {
        clearTimeout(practice && practice.timer);
        if (!practice) return;
        if (s.over) { if (!practice.gg) { practice.gg = 1; const q = bots[Math.floor(Math.random() * bots.length)]; setTimeout(() => { if (practice && practice.s === s && ui) ui.emote(q, "gg"); }, 1400); } return; }
        const who = s.pending ? Number(s.pending.who) : Number(s.turnP);
        if (!bots.includes(who)) return;
        practice.timer = setTimeout(() => {
            if (!practice || practice.s !== s || s.over) return;
            const q = s.pending ? Number(s.pending.who) : Number(s.turnP); if (!bots.includes(q)) return;
            const m = opts.botMove ? opts.botMove(s, q) : botMove(s, q, level, DEFS);
            if (m && !act(s, Object.assign({}, m, { by: q }), Date.now())) push(); else { act(s, { by: q, k: s.pending ? "pass" : "phase", to: "end" }, Date.now()); push(); }
        }, s.pending ? 900 : 650);
    }
    practice.tickT = setInterval(() => { if (!practice || practice.s !== s) return; if (tick(s, Date.now())) push(); }, 300);
    practice.push = push;
    push();
    return { s, push, ui };
}
export function endPractice() {
    if (!practice) return; clearTimeout(practice.timer); clearInterval(practice.tickT); practice = null;
    if (ui) { ui.destroy(); ui = null; uiBid = ""; }
    X.sfx("close"); X.openVault("duel");
}
