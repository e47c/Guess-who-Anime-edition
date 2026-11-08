/* =====================================================================
   ANIME TCG + ECONOMY · hub module (the internal id "cardvault" and the saved keys stay as they were)
   Owns the player's bank (storage layer, store.js), pays finished matches (the standard result from
   result.js, reported by game.js), the daily login bonus and daily missions (economy.js), and draws the
   ANIME TCG page (#arcadeVault, tabs: Packs Store, Collection, Decks, Duel). ONE page, two ways in: the ANIME TCG
   mode in a room's lobby (in-room: the room code, the friends in the room, duels), or the ANIME TCG button on the
   main menu (no room: HOST PARTY and JOIN instead; everything but duels and trades works). The Shop is its own
   section (shoppage.js) and the Wardrobe lives in the player card editor (js/wardrobe.js). Also: the CREDIT counter
   and coin chips (the AAP Coin balance, the only currency; they open the Shop), the daily-bonus sheet, the rewards
   drawer (streak, missions, coin history), the coin pop-up.
   Every coin change goes through bank.apply(opId, ...), so a reload, a reconnect or a double click
   never pays twice.
   ===================================================================== */
import { createBank, localBackend } from "./store.js?v=16";
import { MODE_META, DAILY_LOGIN, VAULT as VCFG } from "./config.js?v=16";
import { applyGame, applyNightParty, claimDaily, loginState, ensureMissions, missionEvent, dayKey, gameCoinsOn, FEATURES } from "./economy.js?v=15";
import { newSeed } from "./rng.js?v=2";
import { grantStarter, recordDuel, activeDeck, deckProblem, migrateDecks20, setActionLevels } from "./packs.js?v=14";
import { ACTIONS } from "../duel/cards.js?v=2";
import { publicLook } from "./shop.js?v=14";
import { initOpening } from "./opening.js?v=15";
import { renderTab, initTabs, roomSync as tabsRoomSync, roomSig, addToDeck, closeTrainingOffer } from "./tabs.js?v=16";
import { motionOK } from "../fx.js";
import { icon } from "./icons.js?v=3";

export const bank = createBank(localBackend());
export { MODE_META, FEATURES };
["packs", "scratch", "decks", "duel", "party"].forEach(f => FEATURES.add(f));      // every part of the economy exists: their missions can roll

const $ = id => document.getElementById(id);
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const fmt = n => Math.round(n).toLocaleString("en-US");
const ORD = n => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
let X = { openOverlay: () => {}, closeOverlay: () => {}, sfx: () => {}, toast: () => {}, inRoom: () => false, hasName: () => true };

/* ---------- results from game.js ---------- */
const resultSubs = new Set();
/* f(result, ctx) with ctx = { me: my slot in that room, room: code, uid } */
export function onResult(f) { resultSubs.add(f); return () => resultSubs.delete(f); }
export function reportResult(r, ctx) {
    payGame(r, ctx);
    resultSubs.forEach(f => { try { f(r, ctx); } catch (e) { console.error("result handler", e); } });
}
async function payGame(r, ctx) {
    const me = r.players.find(p => p.slot === ctx.me);
    if (!me || (ctx.uid && me.uid && me.uid !== ctx.uid)) return;          // spectators and other seats earn nothing here
    const res = await bank.apply("game:" + ctx.room + ":" + r.key, "game", (w, x) => {
        const out = applyGame(w, r, ctx.me, x.now, newSeed(), x.log);
        if (r.mode === "cardvault") {          // the cards you played count toward their "veteran" mark
            const place = (r.placements.find(p => p.slot === ctx.me) || {}).place;
            recordDuel(w, ctx.cvUsed || [], place === 1);
        }
        return out;
    });
    if (!res.ok || res.dup) return;
    setTimeout(() => coinPop(res.result), 2600);
}
/* the Shop and Anime TCG report actions that missions count: kind = pack | scratch | deck */
export function vaultEvent(kind, opId) {
    return bank.apply(opId, "event", (w, x) => { ensureMissions(w, x.now, newSeed(), x.log); return { missions: missionEvent(w, { [kind]: 1 }, x.log) }; }, { silent: true })
        .then(res => { if (res.ok && !res.dup && res.result.missions.length) setTimeout(() => missionToast(res.result.missions), 400); return res; });
}

/* Night Party: the tournament bonus (winner + per stage played), once per tournament (operation id party:<id>) */
export async function nightPartyReward(tid, o) {
    const res = await bank.apply("party:" + tid, "nightparty", (w, x) => applyNightParty(w, o, x.now, newSeed(), x.log));
    if (res.ok && !res.dup) {
        if (res.result.coins) setTimeout(() => X.toast("Night Party bonus: +" + res.result.coins + " AAP Coins"), 1400);
        if (res.result.missions && res.result.missions.length) setTimeout(() => missionToast(res.result.missions), 3400);
    }
    return res;
}

/* ---------- the coin pop-up after a match ---------- */
function coinPop(o) {
    let el = $("coinPop"); if (!el) { el = mk("div", "coin-pop"); el.id = "coinPop"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.innerHTML = ""; el.className = "coin-pop" + (o.coins ? "" : " none");
    const top = mk("div", "cp-top");
    top.append(mk("i", "coin-ico"), mk("b", "cp-n", o.coins ? "+" + o.coins : "+0"), mk("span", "cp-u", "AAP COINS"));
    el.appendChild(top);
    const meta = MODE_META[o.mode] || { name: o.mode };
    const line = o.place ? (o.teams ? "Team " : "") + ORD(o.place) + " of " + o.n + " · " + meta.name + (o.mult !== 1 ? " · ×" + o.mult : "") : meta.name;
    el.appendChild(mk("small", "cp-l", line));
    if (o.why) el.appendChild(mk("small", "cp-why", (o.coins ? "Cut: " : "No coins: ") + o.why));
    (o.missions || []).forEach(m => el.appendChild(mk("small", "cp-m", "✔ " + m.text + "  +" + m.coins)));
    el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
    if (o.coins) X.sfx("coin"); else X.sfx("tick");
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), 5200 + (o.missions || []).length * 900);
}
function missionToast(list) { list.forEach((m, i) => setTimeout(() => X.toast("Mission complete: " + m.text + "  +" + m.coins + " coins"), i * 1800)); }

/* ---------- balance chips ---------- */
let shown = null;
function renderChips(animate) {
    const to = bank.coins(), from = shown == null ? to : shown; shown = to;
    document.querySelectorAll(".vault-bal").forEach(b => {
        if (!animate || from === to || !motionOK()) { b.textContent = fmt(to); return; }
        const t0 = performance.now(), ms = 700;
        const step = now => { const k = Math.min(1, (now - t0) / ms); b.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
        const chip = b.closest(".vault-chip"); if (chip) { chip.classList.remove(to > from ? "up" : "down", to > from ? "down" : "up"); void chip.offsetWidth; chip.classList.add(to > from ? "up" : "down"); }
    });
    const vb = $("vtBal"); if (vb) vb.textContent = fmt(to);
    const vs = $("vtShards"); if (vs) vs.textContent = fmt(Number(bank.get().shards) || 0);
}

/* ---------- the Anime TCG page ---------- */
const TABS = [{ id: "packs", name: "Packs Store", ico: "packs" }, { id: "collection", name: "Collection", ico: "collection" }, { id: "decks", name: "Decks", ico: "decks" }, { id: "duel", name: "Duel", ico: "duel" }];
let slide = "";
let tab = "packs", pageOn = false, pageDismissed = false, roomD = null, bodySig = "", homeOpen = false, joinOpen = false;
const inRoom = () => !!(X.inRoom && X.inRoom());
try { let t = localStorage.getItem("aap_vault_tab"); if (t === "battle") t = "duel"; if (TABS.some(x => x.id === t)) tab = t; } catch (e) {}
const vaultRoom = d => !!d && !d.np && d.gameType === "cardvault" && (!d.status || d.status === "waiting");
/* a Night Party in an intermission (or on its results / winner screen): anyone may open their own Anime TCG page */
const NP_PAUSE = ["next", "match", "results", "failed", "winner"];
const npPause = d => !!d && !!d.np && (!d.status || d.status === "waiting") && NP_PAUSE.includes(d.np.phase);
let npOn = false;
export const vaultCanOpen = d => npPause(d);
/* game.js asks on every room update while the room is in the lobby: should this player see their Anime TCG page?
   Only after they pressed "Enter Anime TCG" (the lobby's ANIME TCG panel). Picking or voting for the mode never
   moves anyone: like every other mode it only selects it and shows its panel. "‹ Lobby" goes back (room intact). */
export function vaultWanted(d) {
    if (d && d.np) { if (!npPause(d)) npOn = false; return npOn; }       // Night Party: only during intermissions, only on request
    npOn = false;
    if (!vaultRoom(d)) { pageOn = false; pageDismissed = false; return false; }
    return pageOn;
}
export function openVault(which) {
    if (which && TABS.some(t => t.id === which)) tab = which;
    if (!inRoom()) {                                  // main menu: the same page, no room
        homeOpen = true; joinOpen = false; roomD = null; bodySig = ""; X.sfx("start");
        X.showOnly("arcadeVault"); window.scrollTo(0, 0); renderVault(); return;
    }
    const rd = X.roomData ? X.roomData() : null;
    if (rd && rd.np) { if (!npPause(rd)) { X.toast("Anime TCG opens between Night Party stages."); return; } npOn = true; bodySig = ""; X.sfx("start"); X.refresh(); return; }
    if (!vaultRoom(rd)) { X.toast("In a room, Anime TCG opens when the lobby picks the ANIME TCG mode."); return; }
    pageOn = true; pageDismissed = false; bodySig = ""; X.sfx("start"); X.refresh();
}
/* leave Anime TCG: to the lobby (in a room) or to the main menu (no room) */
export function vaultBack() {
    X.sfx("close"); closeTrainingOffer();
    if (!inRoom()) { homeOpen = false; X.showOnly("home"); return; }
    if (npOn) { npOn = false; X.refresh(); return; }
    pageOn = false; pageDismissed = true; X.refresh();
}
/* no-room context: HOST PARTY makes a room on ANIME TCG and lands on its page (createRoom in game.js);
   JOIN takes a code and lands in that room's lobby */
export function landInLobby() { pageOn = false; pageDismissed = true; homeOpen = false; }
export function arriveInVault() { pageOn = true; pageDismissed = false; homeOpen = false; bodySig = ""; }      // HOST PARTY from the Anime TCG page itself: you stay on your page
function hostParty() { X.sfx("coin"); X.hostParty(); }
function joinParty(code) { code = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); if (code.length !== 6) { X.toast("Enter a 6-character room code."); return; } landInLobby(); X.joinParty(code); }
/* draw the page; on room updates only a tab that reads the room is redrawn (Duel, trades) */
export function renderPage(d) {
    roomD = d || roomD;
    const sig = tab + "|" + roomSig(tab, roomD);
    if (sig === bodySig && $("vtBody").childElementCount) { renderCtx(false); renderChips(false); return; }
    renderVault();
}
function renderVault() {
    const nav = $("vtTabs"), body = $("vtBody"); if (!nav || !body) return;
    bodySig = tab + "|" + roomSig(tab, roomD);
    nav.innerHTML = "";
    TABS.forEach((t, i) => {
        const b = mk("button", "tcg-tab" + (t.id === tab ? " on" : "")); b.type = "button";
        b.innerHTML = icon(t.ico); b.appendChild(mk("span", null, t.name)); b.dataset.tab = t.id;
        b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(t.id === tab)); b.tabIndex = t.id === tab ? 0 : -1;
        b.onclick = () => { if (tab === t.id) return; const from = TABS.findIndex(x => x.id === tab); tab = t.id; slide = i > from ? "r" : "l"; try { localStorage.setItem("aap_vault_tab", tab); } catch (e) {} X.sfx("toggle"); renderVault(); window.scrollTo(0, 0); };
        b.onkeydown = e => { const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!k) return; e.preventDefault(); const n = nav.children[(i + k + TABS.length) % TABS.length]; n.focus(); n.click(); };
        nav.appendChild(b);
    });
    const y = window.scrollY;
    body.innerHTML = "";
    renderTab(tab, body, H);
    if (slide) { body.classList.remove("in-l", "in-r"); void body.offsetWidth; body.classList.add("in-" + slide); slide = ""; }
    body.dataset.tab = tab;
    renderPass();
    if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y);
    const dot = $("avRwDot"); if (dot) dot.classList.toggle("hidden", loginState(bank.get(), Date.now()).claimed);
    renderCtx(true);
    renderChips(false);
}
/* the bar under the title: in a room = the room code, who is in it, Close room (host); no room = HOST PARTY / JOIN */
let ctxSig = "";
function renderCtx(force) {
    const box = $("avCtx"), back = $("avBack"), rt = $("avRoom"); if (!box) return;
    const room = inRoom(), d = roomD, code = room && X.roomCode ? X.roomCode() : "";
    const slots = room && d && X.activeSlots ? X.activeSlots(d) : [];
    const sig = JSON.stringify([room, code, joinOpen, npOn, slots.map(p => { const n = d["player" + p] || {}; return [p, n.name, n.col, n.sf, n.av && (n.av.u || n.av.g)]; }), room && X.amHost && X.amHost()]);
    if (!force && sig === ctxSig) return; ctxSig = sig;
    if (back) { back.innerHTML = icon("back"); back.appendChild(mk("span", null, room ? (npOn ? "Night Party" : "Lobby") : "Menu")); }
    if (rt) rt.textContent = room ? "ROOM " + code : "INSERT COIN";
    box.innerHTML = ""; box.classList.toggle("noroom", !room);
    if (room) {
        const tag = mk("span", "av-code"); tag.append(mk("small", null, "ROOM"), mk("b", null, code)); box.appendChild(tag);
        const who = mk("div", "av-who"); slots.forEach(p => { const n = d["player" + p] || {}, c = mk("span", "av-friend" + (p === (X.me && X.me()) ? " me" : "")); c.append(X.avatarEl(n, { size: 26 }), mk("small", null, n.name || "Player " + p)); who.appendChild(c); }); box.appendChild(who);
        if (X.amHost && X.amHost()) { const c = mk("button", "btn danger sm av-close", "Close room"); c.type = "button"; c.onclick = () => window.closeRoom(); box.appendChild(c); }
        return;
    }
    const host = mk("button", "btn alt av-host", "HOST PARTY"); host.type = "button"; host.onclick = hostParty;
    const join = mk("button", "btn av-join", "JOIN"); join.type = "button"; join.onclick = () => { joinOpen = !joinOpen; renderCtx(true); if (joinOpen) setTimeout(() => { const i = $("avJoinCode"); if (i) i.focus(); }, 30); };
    box.append(host, join);
    if (joinOpen) {
        const f = mk("form", "av-joinf"), inp = mk("input"); inp.id = "avJoinCode"; inp.maxLength = 6; inp.placeholder = "ROOM CODE"; inp.autocomplete = "off"; inp.spellcheck = false; inp.setAttribute("aria-label", "Room code");
        inp.oninput = () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); };
        const go = mk("button", "btn alt sm", "Join"); go.type = "submit";
        f.onsubmit = e => { e.preventDefault(); joinParty(inp.value); };
        f.append(inp, go); box.appendChild(f);
    }
}
/* the compact Arcade Pass in the header (its equipped frame, background, name style, title, level) */
let passSig = "";
function renderPass() {
    const box = $("tcgPass"); if (!box || !X.passCard || !X.profilePub) return;
    const pub = X.profilePub(), lv = X.level ? X.level() : null, sig = JSON.stringify([pub, lv]);
    if (sig === passSig && box.childElementCount) return; passSig = sig;
    box.innerHTML = ""; box.appendChild(X.passCard(pub, { cls: "pass-mini", xp: lv }));
}
const pageVisible = () => !!$("arcadeVault") && !$("arcadeVault").classList.contains("hidden");
/* rewards drawer: daily streak, missions, coins from games today, coin history */
const rwOpen = () => !!$("vaultRw") && !$("vaultRw").classList.contains("hidden");
function fillRewards() {
    const b = $("vaultRwBody"); if (!b) return;
    const hist = b.querySelector(".vt-hist"), keep = !!(hist && hist.open), y = b.closest(".sheet") ? b.closest(".sheet").scrollTop : 0;
    b.innerHTML = ""; b.appendChild(rewardsTab());
    if (keep) { const h = b.querySelector(".vt-hist"); if (h) h.open = true; }
    if (b.closest(".sheet")) b.closest(".sheet").scrollTop = y;
    const bal = $("rwBal"); if (bal) bal.textContent = fmt(bank.coins());
}
/* the Daily rewards popup (the coin counters on the menu and in the lobby, and the Shop's Daily button):
   login streak + Claim, today's missions, the balance. A modal over the current screen: it never navigates. */
export function openRewards() { rollToday(); fillRewards(); X.openOverlay("vaultRw"); }
function streakTrack(st, big) {
    const row = mk("div", "vt-streak" + (big ? " big" : ""));
    DAILY_LOGIN.forEach((c, i) => {
        const done = st.claimed ? i <= st.index : i < st.index, now = i === st.index;
        const d = mk("div", "vt-day" + (done ? " done" : "") + (now ? " now" : "") + (i === DAILY_LOGIN.length - 1 ? " last" : ""));
        d.append(mk("small", null, "DAY " + (i + 1)), mk("i", "coin-ico"), mk("b", null, String(c)));
        if (done) d.appendChild(mk("span", "vt-tick", "✔"));
        row.appendChild(d);
    });
    return row;
}
function rewardsTab() {
    const w = bank.get(), now = Date.now(), st = loginState(w, now), wrap = mk("div", "vt-rewards");
    // daily login
    const card = mk("section", "vt-card vt-daily");
    const h = mk("header", "vt-ch"); h.append(mk("b", null, "Daily login"), mk("small", null, st.claimed ? "Day " + st.streak + " streak · come back tomorrow" : st.lost ? "Streak reset: you missed a day" : "Day " + st.streak + " of your streak"));
    card.append(h, streakTrack(st));
    const btn = mk("button", "btn alt sm", st.claimed ? "Claimed today ✔" : "Claim +" + st.coins); btn.type = "button"; btn.disabled = st.claimed;
    btn.onclick = () => doClaim(btn);
    card.appendChild(btn);
    wrap.appendChild(card);
    // missions
    const mc = mk("section", "vt-card vt-missions");
    const mh = mk("header", "vt-ch"); mh.append(mk("b", null, "Today's missions"), mk("small", null, "New ones every day · they pay out the moment you finish them"));
    mc.appendChild(mh);
    (w.missions && w.missions.day === dayKey(now) ? w.missions.list : []).forEach(m => {
        const row = mk("div", "vt-mis" + (m.done ? " done" : ""));
        const txt = mk("div", "vt-mt"); txt.appendChild(mk("b", null, m.text));
        if (m.kind === "fresh") txt.appendChild(mk("small", null, "Any of: " + (m.modes || []).map(k => (MODE_META[k] || {}).name || k).join(", ")));
        const bar = mk("div", "vt-mbar"); const fill = mk("i"); fill.style.width = Math.round((m.prog || 0) / m.goal * 100) + "%"; bar.appendChild(fill);
        txt.appendChild(bar);
        const rw = mk("div", "vt-mr"); rw.append(mk("i", "coin-ico"), mk("b", null, m.done ? "✔" : "+" + m.coins), mk("small", null, (m.prog || 0) + "/" + m.goal));
        row.append(txt, rw); mc.appendChild(row);
    });
    wrap.appendChild(mc);
    // earnings today + rules
    const ec = mk("section", "vt-card vt-earn"), today = gameCoinsOn(bank.ledger(), dayKey(now));
    const eh = mk("header", "vt-ch"); eh.append(mk("b", null, "Coins from games today"), mk("small", null, fmt(today)));
    ec.append(eh, mk("p", "vt-rule", "Every finished game with 2+ players pays by placement: 1st 40 down to last 10 (ties and teams share their places), ×0.75 for short games, ×1.5 for long ones. A game doesn't have to last a minimum time to pay: if a game ended, it pays. There is no daily limit."));
    wrap.appendChild(ec);
    // history
    const hc = mk("details", "vt-card vt-hist"); hc.appendChild(mk("summary", null, "Coin history"));
    const LBL = { nightparty: "Night Party", game: "Game", daily: "Daily login", mission: "Mission", missions: "New missions", grant: "Gift", spend: "Spent", start: "Welcome", skin: "Shop", bundle: "Shop bundle", scratch: "Scratch card", pack: "Pack", craft: "Crafted pack", starter: "Starter deck", trade: "Trade", token: "Free pack" };
    const lines = bank.ledger().filter(l => l.d || l.kind === "missions").slice(-25).reverse();
    if (!lines.length) hc.appendChild(mk("p", "vt-rule", "Nothing yet. Finish a game or claim your daily bonus."));
    lines.forEach(l => {
        const r = mk("div", "vt-hl"), dt = new Date(l.t);
        r.append(mk("small", null, dt.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })),
            mk("span", null, (LBL[l.kind] || l.kind) + (l.info ? " · " + l.info : "") + (l.seed != null ? " · seed " + l.seed : "")),
            mk("b", l.d > 0 ? "plus" : l.d < 0 ? "minus" : "", l.d ? (l.d > 0 ? "+" : "") + fmt(l.d) : "·"));
        hc.appendChild(r);
    });
    hc.appendChild(mk("p", "vt-rule", "Saved in this browser (" + (bank.durable ? "kept between visits" : "private window: lost when you close it") + ")."));
    wrap.appendChild(hc);
    return wrap;
}
async function doClaim(btn) {
    if (btn) btn.disabled = true;
    const res = await bank.apply("daily:" + dayKey(), "daily", (w, x) => claimDaily(w, x.now, x.log));
    if (res.ok && !res.dup) { X.sfx("coin"); X.toast("Daily bonus: +" + res.result.coins + " AAP Coins (day " + res.result.streak + ")"); }
    else if (!res.ok && btn) btn.disabled = false;
    if (pageVisible()) renderVault();
    if ($("vaultRw") && !$("vaultRw").classList.contains("hidden")) fillRewards();
    renderDaily();
    return res;
}
function rollToday() { const day = dayKey(); if (!(bank.get().missions && bank.get().missions.day === day)) bank.apply("missions:" + day, "missions", (w, x) => { ensureMissions(w, x.now, newSeed(), x.log); }, { silent: true }).then(() => { if (pageVisible()) renderVault(); }); }

/* ---------- the daily-bonus sheet (once a day, on the home screen) ---------- */
function renderDaily() {
    const box = $("dailyBody"); if (!box) return;
    const st = loginState(bank.get(), Date.now()); box.innerHTML = "";
    box.append(mk("p", "dl-sub", st.claimed ? "See you tomorrow for day " + (st.streak + 1) + "." : st.lost ? "You missed a day, so your streak starts again." : st.streak > 1 ? "Day " + st.streak + " in a row. Keep it going!" : "Log in every day: the 7th day pays 100."), streakTrack(st, true));
    const b = $("dailyClaim"); b.textContent = st.claimed ? "Claimed ✔" : "Claim +" + st.coins; b.disabled = st.claimed;
}
export function maybeShowDaily() {
    if (X.inRoom() || !X.hasName()) return;
    if (loginState(bank.get(), Date.now()).claimed) return;
    try { if (sessionStorage.getItem("aap_daily_seen") === dayKey()) return; sessionStorage.setItem("aap_daily_seen", dayKey()); } catch (e) {}
    renderDaily(); X.openOverlay("daily");
}

/* ---------- wiring ---------- */
/* what the tabs get (tabs.js) */
const H = {
    bank, act: (opId, kind, fn) => bank.apply(opId, kind, fn), rerender: () => renderVault(), event: (k, op) => vaultEvent(k, op), x: () => X,
    setLook() { X.setLook && X.setLook(publicLook(bank.get())); }, newSeed, open: id => { tab = id; renderVault(); window.scrollTo(0, 0); },
    room: () => roomD, inRoom, addToDeck: id => addToDeck(id), hostParty: () => hostParty(), joinParty: c => { joinOpen = true; renderCtx(true); if (c) joinParty(c); else setTimeout(() => { const i = $("avJoinCode"); if (i) { i.scrollIntoView({ block: "center" }); i.focus(); } }, 30); }
};
export function roomSync(d) { tabsRoomSync(d); }
export const playerLevel = () => ((X.level && X.level()) || {}).lvl || 1;
export function activeDeckCards() { const w = bank.get(), d = activeDeck(w); return d && !deckProblem(w, d.cards, playerLevel()) ? { name: d.name, cards: d.cards.slice() } : null; }
export function initVault(ctx) {
    X = Object.assign(X, ctx);
    initOpening({ sfx: X.sfx, crinkle: v => X.crinkle && X.crinkle(v), stamp: id => { const c = (bank.get().cards || {})[id]; return c ? { by: c.by, at: c.at } : null; }, sleeve: () => ((bank.get().equip || {}).sleeve || "").replace(/^sl_/, "") });
    initTabs(H);
    setActionLevels(Object.fromEntries(Object.entries(ACTIONS).map(([k, a]) => [k, a.lvl])));
    if (!bank.get().starter) bank.apply("starter", "starter", (w, x) => grantStarter(w, newSeed(), "Starter deck", x.now));
    if (!bank.get().decks20) bank.apply("decks20", "decks", (w, x) => migrateDecks20(w, newSeed(), x.now));     // 10-card decks -> 20 (once)
    if (X.setLook) { const look = publicLook(bank.get()); X.setLook(look); }
    window.openVault = openVault; window.vaultBack = vaultBack; window.vaultRewards = openRewards;
    /* the coin counters (menu CREDIT, lobby chip) show the balance and open the Daily rewards popup; the Shop has its own buttons */
    window.vaultChip = () => { X.sfx("click"); openRewards(); };
    window.vaultClaimDaily = async () => { const r = await doClaim(); if (r.ok) setTimeout(() => X.closeOverlay("daily"), motionOK() ? 900 : 200); };
    ["vaultRw", "daily"].forEach(id => { const o = $(id); if (o) o.addEventListener("click", e => { if (e.target === o) X.closeOverlay(id); }); });
    bank.onChange(() => { renderChips(true); if (pageVisible()) renderVault(); if (rwOpen()) fillRewards(); });
    renderChips(false); rollToday();
    [["tcgCoinIco", "coin"], ["tcgShardIco", "shard"], ["tcgRwIco", "gift"]].forEach(([id, n]) => { const e = $(id); if (e) e.innerHTML = icon(n); });
    // sound feedback: a soft tick when the pointer reaches a button (fine pointers only, throttled); presses play their own sounds
    const page = $("arcadeVault"); let lastHover = null, lastT = 0;
    if (page && window.matchMedia && matchMedia("(hover: hover)").matches) page.addEventListener("pointerover", e => { const b = e.target.closest && e.target.closest("button, .tcg-hov"); if (!b || b === lastHover || b.disabled) return; lastHover = b; const t = performance.now(); if (t - lastT > 90) { lastT = t; X.sfx("hover"); } });
}
export const vaultConfig = VCFG;
