/* =====================================================================
   ARCADE VAULT · hub module
   Owns the player's bank (storage layer, store.js), pays finished matches (the standard result from
   result.js, reported by game.js), the daily login bonus and daily missions (economy.js), and draws the
   Vault sheet (tabs: Rewards, Shop, Packs, Collection, Deck, Battle), the coin chips on the home screen
   and in the lobby, the daily-bonus sheet and the coin pop-up after a match.
   Every coin change goes through bank.apply(opId, ...), so a reload, a reconnect or a double click
   never pays twice.
   ===================================================================== */
import { createBank, localBackend } from "./store.js?v=3";
import { MODE_META, DAILY_LOGIN, EARN, VAULT as VCFG } from "./config.js?v=3";
import { applyGame, claimDaily, loginState, ensureMissions, missionEvent, dayKey, FEATURES } from "./economy.js?v=2";
import { newSeed } from "./rng.js?v=1";
import { grantStarter, recordBattle, grantToken, activeDeck, deckProblem } from "./packs.js?v=1";
import { publicLook } from "./shop.js?v=1";
import { initOpening } from "./opening.js?v=1";
import { renderTab, initTabs, roomSync as tabsRoomSync } from "./tabs.js?v=1";
import { motionOK } from "../fx.js";

export const bank = createBank(localBackend());
export { MODE_META, FEATURES };
["packs", "scratch", "decks", "battle"].forEach(f => FEATURES.add(f));      // every part of the Vault now exists: their missions can roll

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
        if (r.mode === "cardvault") {          // the cards you played count toward their "veteran" mark; the optional free pack for the winner
            const place = (r.placements.find(p => p.slot === ctx.me) || {}).place;
            recordBattle(w, ctx.cvUsed || [], place === 1);
            if (place === 1 && r.settings && r.settings.cvPack) { grantToken(w, "normal", 1); out.token = 1; x.log({ kind: "token", d: 0, info: "free pack (battle win)" }); }
        }
        return out;
    });
    if (!res.ok || res.dup) return;
    setTimeout(() => coinPop(res.result), 2600);
}
/* other parts of the Vault report actions that missions count: kind = pack | scratch | deck */
export function vaultEvent(kind, opId) {
    return bank.apply(opId, "event", (w, x) => { ensureMissions(w, x.now, newSeed(), x.log); return { missions: missionEvent(w, { [kind]: 1 }, x.log) }; }, { silent: true })
        .then(res => { if (res.ok && !res.dup && res.result.missions.length) setTimeout(() => missionToast(res.result.missions), 400); return res; });
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
    if (o.token) el.appendChild(mk("small", "cp-m", "🎁 Free pack of any series: open it in the Vault"));
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
}

/* ---------- the Vault sheet ---------- */
const TABS = [{ id: "rewards", name: "Rewards" }, { id: "shop", name: "Shop" }, { id: "packs", name: "Packs" }, { id: "collection", name: "Collection" }, { id: "deck", name: "Deck" }, { id: "battle", name: "Battle" }];
let tab = "rewards";
try { const t = localStorage.getItem("aap_vault_tab"); if (TABS.some(x => x.id === t)) tab = t; } catch (e) {}
export function openVault(which) {
    if (which && TABS.some(t => t.id === which)) tab = which;
    rollToday();
    renderVault(); X.openOverlay("vault");
}
function renderVault() {
    const nav = $("vtTabs"), body = $("vtBody"); if (!nav || !body) return;
    nav.innerHTML = "";
    TABS.forEach(t => {
        const b = mk("button", "vt-tab" + (t.id === tab ? " on" : ""), t.name); b.type = "button";
        b.setAttribute("role", "tab"); b.setAttribute("aria-selected", t.id === tab);
        if (t.id === "rewards" && !loginState(bank.get(), Date.now()).claimed) b.appendChild(mk("i", "vt-dot"));
        b.onclick = () => { tab = t.id; try { localStorage.setItem("aap_vault_tab", tab); } catch (e) {} X.sfx("toggle"); renderVault(); };
        nav.appendChild(b);
    });
    body.innerHTML = "";
    const T = TABS.find(t => t.id === tab);
    if (tab === "rewards") body.appendChild(rewardsTab());
    else renderTab(tab, body, H);
    renderChips(false);
}
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
    const ec = mk("section", "vt-card vt-earn"), today = w.earn.day === dayKey(now) ? w.earn.games : 0;
    const eh = mk("header", "vt-ch"); eh.append(mk("b", null, "Coins from games today"), mk("small", null, fmt(today) + " / " + fmt(EARN.dailyGameCap)));
    const eb = mk("div", "vt-mbar gold"); const ef = mk("i"); ef.style.width = Math.min(100, today / EARN.dailyGameCap * 100) + "%"; eb.appendChild(ef);
    ec.append(eh, eb, mk("p", "vt-rule", "Every finished game with 2+ players pays by placement: 1st 40 down to last 10 (ties and teams share their places), ×0.75 for short games, ×1.5 for long ones. Missions and the login bonus don't count toward the daily cap."));
    wrap.appendChild(ec);
    // history
    const hc = mk("details", "vt-card vt-hist"); hc.appendChild(mk("summary", null, "Coin history"));
    const LBL = { game: "Game", daily: "Daily login", mission: "Mission", missions: "New missions", grant: "Gift", spend: "Spent", start: "Welcome", skin: "Shop", bundle: "Shop bundle", scratch: "Scratch card", pack: "Pack", craft: "Crafted pack", starter: "Starter deck", trade: "Trade", token: "Free pack" };
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
    renderVault(); renderDaily();
    return res;
}
function rollToday() { const day = dayKey(); if (!(bank.get().missions && bank.get().missions.day === day)) bank.apply("missions:" + day, "missions", (w, x) => { ensureMissions(w, x.now, newSeed(), x.log); }, { silent: true }).then(() => { if (!$("vault").classList.contains("hidden")) renderVault(); }); }

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
    setLook() { X.setLook && X.setLook(publicLook(bank.get())); }, newSeed, open: id => openVault(id)
};
export const vaultTabs = id => openVault(id);
export function roomSync(d) { tabsRoomSync(d); }
export function activeDeckCards() { const w = bank.get(), d = activeDeck(w); return d && !deckProblem(w, d.cards) ? { name: d.name, cards: d.cards.slice() } : null; }
export function initVault(ctx) {
    X = Object.assign(X, ctx);
    initOpening({ sfx: X.sfx, stamp: id => { const c = (bank.get().cards || {})[id]; return c ? { by: c.by, at: c.at } : null; }, sleeve: () => ((bank.get().equip || {}).sleeve || "").replace(/^sl_/, "") });
    initTabs(H);
    if (!bank.get().starter) bank.apply("starter", "starter", (w, x) => grantStarter(w, newSeed(), "Starter deck", x.now));   // every new player: a free 10-card starter deck
    if (X.setLook) { const look = publicLook(bank.get()); X.setLook(look); }
    window.openVault = openVault;
    window.vaultClaimDaily = async () => { const r = await doClaim(); if (r.ok) setTimeout(() => X.closeOverlay("daily"), motionOK() ? 900 : 200); };
    ["vault", "daily"].forEach(id => { const o = $(id); if (o) o.addEventListener("click", e => { if (e.target === o) X.closeOverlay(id); }); });
    bank.onChange(() => { renderChips(true); if ($("vault") && !$("vault").classList.contains("hidden")) renderVault(); });
    renderChips(false); rollToday();
}
export const vaultConfig = VCFG;
