/* =====================================================================
   ANIME TCG · DUEL TAB
   Your selected deck (cover, validity, switch, edit), then the ways to duel: Challenge friends in the room (1v1, or
   2+ for a free-for-all of 3-8), Practice vs Bot (Easy / Normal / Hard: no coins, stats or missions), Rookie Training
   (6 guided lessons, a one-time 100 coin reward), live duels in the room (watch / return) and your recent results.
   No room: HOST PARTY / JOIN instead of the friends list.
   ===================================================================== */
import { DUEL, DECK } from "./config.js?v=15";
import { activeDeck, setActiveDeck, deckProblem, isHolo } from "./packs.js?v=13";
import { CARDS } from "./carddb.js?v=6";
import { cardEl } from "./cardui.js?v=14";
import { icon } from "./icons.js?v=2";
import { cvChallenge, cvDuels, busyIn, seatsOf, cvWatch, cvReturn, cvDeckOf, locOf, startPractice } from "../cardvault/cardvault.js?v=16";
import { LESSONS, setupTraining, trainingBot } from "../duel/training.js?v=1";
import { P } from "../duel/engine.js?v=1";

const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const btn = (txt, cls, fn, ic) => { const b = mk("button", "btn " + (cls || "")); b.type = "button"; if (ic) b.innerHTML = icon(ic); b.appendChild(document.createTextNode(txt)); if (fn) b.onclick = fn; return b; };
let H = null, roomData = null;
const X = () => H.x(), W = () => H.bank.get(), sfx = n => X().sfx(n), toast = t => X().toast(t);
const lvl = () => ((X().level && X().level()) || {}).lvl || 1;
const chal = new Set();
const LOC = { v: "In Anime TCG", l: "In the lobby", b: "In a duel" };
export const TRAINING_REWARD = 100;
export function setDuelRoom(d) { roomData = d; }
/* recent duel results (this browser) */
const RK = "aap_duel_recent";
const recent = () => { try { return JSON.parse(localStorage.getItem(RK) || "[]"); } catch (e) { return []; } };
if (typeof document !== "undefined") document.addEventListener("aap:result", e => { const r = e.detail; if (!r || r.mode !== "cardvault") return; try { const me = r.players.find(x => x.uid && x.uid === (window.__aapUid || "")) || null; const list = recent(); list.unshift({ at: r.endedAt || Date.now(), vs: r.players.map(p => p.name).join(" vs "), places: r.placements, n: r.players.length, key: r.key }); localStorage.setItem(RK, JSON.stringify(list.filter((x, i, a) => a.findIndex(y => y.key === x.key) === i).slice(0, 8))); } catch (e2) {} });

export function duelTab(h) {
    H = h; const w = W(), v = mk("div", "tdu"), d = activeDeck(w), bad = d ? deckProblem(w, d.cards, lvl()) : "No deck yet", x = X(), rd = roomData, me = x.me ? x.me() : 0;
    const head = mk("div", "tcg-h"), hl = mk("div"), h2 = mk("h2"); h2.innerHTML = icon("duel"); h2.appendChild(document.createTextNode("Duel"));
    hl.append(h2, mk("p", null, DUEL.rules.life + " life each, a " + DECK.size + "-card deck, a hand of " + DUEL.rules.hand + ". Summon characters, attack, play Support and Counter cards. Tap any card in a duel to see what it does; the \"Rules\" button explains everything."));
    head.appendChild(hl); v.appendChild(head);
    // the deck you bring
    const dk = mk("section", "vt-card tdu-deck");
    const cov = mk("div", "tdu-cover"), cid = d && (d.cards.includes(Number(d.cover)) ? Number(d.cover) : d.cards.find(x2 => !/^a:/.test(String(x2))));
    if (cid && CARDS[cid]) cov.appendChild(cardEl(Number(cid), { size: "sm", holo: isHolo(w, Number(cid)) }));
    const info = mk("div", "tdu-dinfo"); info.appendChild(mk("small", null, "YOUR DECK"));
    const sel = mk("select"); sel.setAttribute("aria-label", "Deck to duel with"); (w.decks || []).forEach(x2 => { const o = new Option(x2.name, x2.id); if (d && d.id === x2.id) o.selected = true; sel.add(o); });
    sel.onchange = async () => { await H.act("deckuse:" + sel.value + ":" + Date.now(), "deck", w2 => setActiveDeck(w2, sel.value)); sfx("pick"); H.rerender(); };
    info.appendChild((w.decks || []).length ? sel : mk("b", null, "No deck"));
    const st = mk("span", "tcg-pill " + (bad ? "bad" : "ok")); st.innerHTML = icon(bad ? "info" : "check"); st.appendChild(document.createTextNode(bad || "Ready to duel")); info.appendChild(st);
    info.appendChild(btn("Edit decks", "ghost sm", () => H.open("decks"), "decks"));
    const rec = w.duels || { p: 0, w: 0 }; info.appendChild(mk("small", null, "Your record: " + rec.w + " wins / " + rec.p + " duels"));
    dk.append(cov, info); v.appendChild(dk);
    const need = () => { if (bad) { toast(bad === "No deck yet" ? "Build a " + DECK.size + "-card deck first (Decks tab)." : bad); H.open("decks"); return true; } return false; };
    const modes = mk("div", "tdu-modes");
    // practice + training
    const pr = mk("section", "vt-card tdu-mode"); const ph = mk("b", "tdu-mt"); ph.innerHTML = icon("bot"); ph.appendChild(document.createTextNode("Practice vs Bot"));
    pr.append(ph, mk("p", "vt-rule", "Works anywhere, no room needed. Pays no coins and counts for no stats or missions."));
    const lv = mk("div", "tcg-actions"); [["easy", "Easy"], ["normal", "Normal"], ["hard", "Hard"]].forEach(([k, l]) => lv.appendChild(btn(l, k === "normal" ? "alt" : "", () => { if (need()) return; sfx("start"); startPractice(k); }, "bot")));
    const ffaN = 3; lv.appendChild(btn("Free-for-all (you + " + ffaN + " bots)", "", () => { if (need()) return; sfx("start"); startPractice("normal", { bots: ffaN, title: "PRACTICE · FREE-FOR-ALL" }); }, "ffa"));
    pr.appendChild(lv); modes.appendChild(pr);
    const tr = mk("section", "vt-card tdu-mode"); const th = mk("b", "tdu-mt"); th.innerHTML = icon("training"); th.appendChild(document.createTextNode("Rookie Training"));
    tr.append(th, mk("p", "vt-rule", LESSONS.length + " short lessons in one guided duel: " + LESSONS.map(l => l.t).join(", ") + ". " + (w.trainingDone ? "Completed: replay it any time." : "First completion: +" + TRAINING_REWARD + " AAP Coins.")));
    tr.appendChild(btn(w.trainingDone ? "Replay training" : "Start training", w.trainingDone ? "" : "alt", startTraining, "training"));
    modes.appendChild(tr);
    v.appendChild(modes);
    // friends
    const room = x.inRoom && x.inRoom() && rd && x.activeSlots;
    const fr = mk("section", "vt-card tdu-friends"); const fh = mk("b", "tdu-mt"); fh.innerHTML = icon("friends"); fh.appendChild(document.createTextNode("Duel your friends"));
    fr.appendChild(fh);
    if (rd && rd.np && room) { fr.appendChild(mk("p", "vt-rule", "Challenges are off during a Night Party. Practice is still open.")); v.appendChild(fr); return v; }
    if (!room) {
        fr.appendChild(mk("p", "vt-rule", "Duels with friends happen in a room. Host a party and share the code, or join one."));
        const r = mk("div", "tcg-actions"); r.append(btn("HOST PARTY", "alt", () => H.hostParty(), "crown"), btn("JOIN", "", () => H.joinParty(), "friends")); fr.appendChild(r);
        v.appendChild(fr); v.appendChild(recentBox()); return v;
    }
    const all = cvDuels(rd), mine = busyIn(rd, me), others = x.activeSlots(rd).filter(p => p !== me);
    if (mine) {
        const mb = mk("div", "tdu-mine");
        const opp = seatsOf(mine).filter(p => p !== me).map(p => x.pName(rd, p)).join(", ");
        if (mine.st === "live") mb.append(mk("b", null, "You're dueling " + opp), btn("Return to the duel", "alt sm", () => cvReturn(mine.bid), "duel"));
        else mb.append(mk("b", null, mine.from === me ? "Challenge sent to " + opp : "Challenge from " + x.pName(rd, mine.from)), mk("small", "vt-rule", "Answer it in the strip at the bottom of the screen."));
        fr.appendChild(mb);
    }
    fr.appendChild(mk("p", "vt-rule", others.length ? "Tap one friend for a 1v1, or several for a free-for-all (" + DUEL.ffa.min + "-" + DUEL.ffa.max + " players, " + DUEL.rules.lifeFfa + " life; each attack picks one opponent)." : "Nobody else here yet: share the room code" + (x.roomCode ? " (" + x.roomCode() + ")" : "") + "."));
    [...chal].forEach(p => { if (!others.includes(p) || busyIn(rd, p)) chal.delete(p); });
    const grid = mk("div", "tdu-players");
    others.forEach(p => {
        const n = rd["player" + p] || {}, busy = busyIn(rd, p), deck = cvDeckOf(rd, p), loc = locOf(rd, p);
        const cell = mk("button", "tdu-pl" + (chal.has(p) ? " on" : "") + (busy ? " busy" : "")); cell.type = "button";
        cell.appendChild(x.avatarEl(n, { size: 44 }));
        const t = mk("div"); t.append(mk("b", null, n.name || "Player " + p), mk("small", null, busy && busy.st === "live" ? "In a duel" : busy ? "Challenge pending" : !deck ? "No deck yet" : LOC[loc] || LOC.l));
        cell.appendChild(t);
        const cb = mk("span", "tdu-chk"); cb.innerHTML = icon(chal.has(p) ? "check" : "plus"); cell.appendChild(cb);
        cell.disabled = !!busy; cell.setAttribute("aria-pressed", String(chal.has(p)));
        cell.onclick = () => { if (chal.has(p)) chal.delete(p); else if (chal.size + 2 > DUEL.ffa.max) { toast("A duel holds up to " + DUEL.ffa.max + " players."); return; } else chal.add(p); sfx("toggle"); H.rerender(); };
        grid.appendChild(cell);
    });
    fr.appendChild(grid);
    const names = [...chal].map(p => x.pName(rd, p));
    const cbtn = btn(chal.size === 0 ? "Pick who to challenge" : chal.size === 1 ? "Challenge " + names[0] + " to a Duel" : "Challenge " + chal.size + " players · free-for-all", "alt", async () => { if (need()) return; if (await cvChallenge([...chal])) { chal.clear(); H.rerender(); } }, chal.size > 1 ? "ffa" : "duel");
    cbtn.disabled = !chal.size || !!mine; fr.appendChild(cbtn);
    v.appendChild(fr);
    const live = all.filter(b => b.st === "live");
    if (live.length) {
        const ls = mk("section", "vt-card tdu-live"); const lh = mk("b", "tdu-mt"); lh.innerHTML = icon("duel"); lh.appendChild(document.createTextNode("Live duels"));
        ls.appendChild(lh);
        live.forEach(b => { const r = mk("div", "tdu-lrow"), ps = seatsOf(b); r.append(mk("span", null, ps.map(p => x.pName(rd, p)).join(" vs ")), ps.includes(me) ? btn("Return", "alt sm", () => cvReturn(b.bid), "duel") : btn("Watch", "ghost sm", () => cvWatch(b.bid), "scout")); ls.appendChild(r); });
        v.appendChild(ls);
    }
    v.appendChild(recentBox());
    return v;
}
function recentBox() {
    const list = recent(), box = mk("section", "vt-card tdu-recent"); const h = mk("b", "tdu-mt"); h.innerHTML = icon("log"); h.appendChild(document.createTextNode("Recent duels"));
    box.appendChild(h);
    if (!list.length) box.appendChild(mk("p", "vt-rule", "Your room duels show up here."));
    list.forEach(r => { const row = mk("div", "tdu-lrow"); row.append(mk("span", null, r.vs), mk("small", null, new Date(r.at).toLocaleDateString())); box.appendChild(row); });
    return box;
}
/* ---------- Rookie Training ---------- */
function startTraining() {
    const ids = Object.values(CARDS);
    const commons = ids.filter(c => c.r === 0 && !c.ab.startsWith("c_heal")).sort((a, b) => b.pow - a.pow);
    const plain = commons.slice(0, 2), weak = commons[commons.length - 1], legend = ids.filter(c => c.r === 5).sort((a, b) => b.pow - a.pow)[0];
    const filler = ids.filter(c => c.r === 0 && !plain.includes(c) && c !== weak).slice(0, 45).map(c => c.id);
    const myDeck = [plain[0].id, plain[1].id, legend.id, "a:battlecry", "a:parry"].concat(filler.slice(0, 15)).map(String);
    const botDeck = [weak.id].concat(filler.slice(15, 34)).map(String);
    let step = 0, done = false;
    const coach = mk("div", "dz-coach");
    const paint = () => {
        coach.innerHTML = "";
        const L = LESSONS[Math.min(step, LESSONS.length - 1)];
        coach.append(mk("small", null, done ? "TRAINING COMPLETE" : "LESSON " + (step + 1) + " / " + LESSONS.length), mk("b", null, done ? "Well done, duelist!" : L.t), mk("p", null, done ? (W().trainingDone ? "You know the basics: summon, attack, positions, tributes, Support and Counter cards." : "") : L.say));
        const dots = mk("div", "dz-cdots"); LESSONS.forEach((_, i) => dots.appendChild(mk("i", i < step ? "on" : i === step && !done ? "now" : ""))); coach.appendChild(dots);
        highlight();
    };
    const highlight = () => {
        document.querySelectorAll(".dz .coach").forEach(e => e.classList.remove("coach"));
        if (done || !run) return;
        const s = run.s, hand = arr(P(s, 1).hand);
        const pick = id => hand.find(u => String(s.cards[u].id) === String(id));
        const mark = sel2 => { const e = document.querySelector(sel2); if (e) e.classList.add("coach"); };
        if (step === 0) mark('.dz-hand [data-u="' + pick(plain[0].id) + '"]');
        if (step === 3) mark('.dz-hand [data-u="' + pick(legend.id) + '"]');
        if (step === 4) mark('.dz-hand [data-u="' + pick("a:battlecry") + '"]');
        if (step === 5) mark('.dz-hand [data-u="' + pick("a:parry") + '"]') || mark(".dz-window");
        if (step === 1 && s.phase === "battle") mark('.dz-zone[data-p="2"][data-kind="ch"].full');
    };
    const arr = v2 => Array.isArray(v2) ? v2 : v2 && typeof v2 === "object" ? Object.values(v2) : [];
    const run = startPractice("easy", {
        deck: myDeck, botDeck, botName: "Coach Bot", title: "ROOKIE TRAINING", status: "Follow the coach",
        rules: { turnSec: 600, responseSec: 30 },
        botMove: (s, p) => trainingBot(s, p, step),
        onMove: async (a, s) => {
            if (done) return;
            const L = LESSONS[step];
            if (L.done(s, a)) { step++; X().sfx("levelup"); if (step >= LESSONS.length) { done = true; await reward(); } }
            paint();
        },
        extraTools: bar => { bar.prepend(coach); }
    });
    if (!run) return;
    setupTraining(run.s, { small1: plain[0].id, small2: plain[1].id, legend: legend.id, weak: weak.id });
    run.push(); paint();
    const loop = setInterval(() => { if (!document.querySelector(".dz")) { clearInterval(loop); return; } const L = LESSONS[step]; if (!done && L && L.done(run.s, null)) { step++; paint(); } highlight(); }, 600);
    if (!W().trainingSeen) H.act("training:seen", "training", w => { w.trainingSeen = 1; return {}; });
}
async function reward() {
    const r = await H.act("training:reward", "training", w => { if (w.trainingDone) return { already: 1 }; w.trainingDone = 1; w.coins = (Number(w.coins) || 0) + TRAINING_REWARD; return { coins: TRAINING_REWARD }; });
    if (r.ok && r.result && r.result.coins && !r.dup) { toast("Training complete: +" + TRAINING_REWARD + " AAP Coins"); X().sfx("coin"); }
    else toast("Training complete!");
}
/* offered automatically on the first visit */
export function maybeOfferTraining(h) {
    H = h || H; const w = W();
    if (w.trainingDone || w.trainingSeen) return;
    try { if (sessionStorage.getItem("aap_training_offer")) return; sessionStorage.setItem("aap_training_offer", "1"); } catch (e) {}
    const ask = X().uiConfirm ? X().uiConfirm({ title: "New to duels?", text: "Rookie Training teaches the basics in a short guided duel (" + LESSONS.length + " lessons). First completion: +" + TRAINING_REWARD + " AAP Coins.", ok: "Start training", cancel: "Later" }) : Promise.resolve(false);
    offerOpen = true;
    ask.then(yes => { offerOpen = false; H.act("training:seen", "training", w2 => { w2.trainingSeen = 1; return {}; }); if (yes) startTraining(); });
}
/* leaving the Anime TCG page while the offer is still up counts as "Later" (it must never sit over the lobby) */
let offerOpen = false;
export function closeTrainingOffer() { if (!offerOpen) return; const no = document.getElementById("confirmNo"); if (no) no.click(); }
