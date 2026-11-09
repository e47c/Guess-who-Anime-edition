/* =====================================================================
   ANIME TCG · THE DUEL SCREEN
   Renders a duel from a view (engine.viewFor for this player) and sends intents. Used by room duels, Practice vs Bot
   and Rookie Training. Everything the player may do is computed from the same engine on the view (legalMoves / why),
   so only legal cards and zones glow and a tap on anything else explains why. The host (or the local practice loop)
   re-checks every intent.
   Layout: the opponent's plate (life, hand backs, deck, graveyard, face-down count) and field at the top, the mat
   coloured by each player's most common series, the phase bar with a one-line hint, my field, my plate, my hand fanned
   at the bottom, the card inspector on the side (a bottom drawer on phones). Events animate: summon (fly from the hand,
   a flash in the rarity colour), set, position, attack (lunge, clash, hit-stop, shake), destroy (shatter), Counter
   (flip + banner), life bars counting down, floating numbers. Skip animations; Reduced effects = fades only.
   ===================================================================== */
import { why, legalMoves, preview, statOf, P as P0, opponents, lifeOf, alive, tributesFor, cardOf, pierces } from "./engine.js?v=2";
import { DUEL } from "../vault/config.js?v=21";
import { cardEl, theme, SHOW } from "../vault/cardui.js?v=20";
import { icon, RARITY_ICON, KEYWORD_ICON } from "../vault/icons.js?v=3";
import { define, PHASES, POSITIONS, KEYWORDS } from "./glossary.js?v=2";
import { ACTIONS } from "./cards.js?v=7";
import { matFor, paintMat, medallion, deckPile, gyPile, mountTable } from "./table.js?v=1";
/* a missing player (a stale / partial view during a switch) renders as empty instead of throwing */
const NOBODY = Object.freeze({ life: 0, ch: [], ac: [], hand: [], gy: [], deck: [] });
const P = (v, p) => (v && v.P && P0(v, p)) || NOBODY;
/* the Final Clash loss at the end of the view's round (0 before it starts) */
const clashAt = v => { const SG = (v.fmt === "ffa" && DUEL.rules.stalemateFfa) || DUEL.rules.stalemate; return v.round >= SG.round ? SG.loss + SG.grow * (v.round - SG.round) : 0; };

const arr = v => Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const btn = (txt, cls, fn, ic) => { const b = mk("button", "btn " + (cls || "")); b.type = "button"; if (ic) b.innerHTML = icon(ic); b.appendChild(mk("span", "bl", txt)); b.setAttribute("aria-label", txt); b.title = txt; if (fn) b.onclick = fn; return b; };
const pk = p => "p" + p;
const RCOL = ["#9aa1ab", "#c9b06a", "#4aa8ff", "#c9b6ff", "#ff4fa0", "#ffd76a", "#c58bff"];
const lite = () => document.body.classList.contains("fx-lite");
const PH = [["draw", "Draw", "draw"], ["main", "Main", "main"], ["battle", "Battle", "battle"], ["end", "End", "end"]];

/* an Action card's face (Support / Counter): our own design */
export function actionEl(id, size = "sm") {
    const a = ACTIONS[id] || { name: "?", type: "support", text: "" }, el = mk("div", "vcard act sz-" + size + " t-" + a.type);
    const inner = mk("div", "vc-inner"), f = mk("div", "vc-front act-front");
    f.innerHTML = '<i class="act-bg"></i>';
    const nb = mk("div", "act-name"); nb.innerHTML = icon(a.type === "counter" ? "counter" : "support"); nb.appendChild(mk("b", null, a.name));
    const art = mk("div", "act-art"); art.innerHTML = icon(a.type === "counter" ? "counter" : "support");
    const ty = mk("div", "act-type", a.type === "counter" ? "COUNTER · " + ({ attack: "when attacked", support: "vs Support", summon: "vs summon" }[a.trig] || "") : "SUPPORT · instant");
    const tx = mk("p", "act-text", a.text);
    f.append(nb, art, ty, tx); inner.appendChild(f); el.appendChild(inner);
    el.dataset.act = id; el.setAttribute("role", "img"); el.setAttribute("aria-label", a.name + ": " + a.text);
    return el;
}
const backEl = (size = "sm") => { const b = mk("div", "vcard sz-" + size + " dz-back"); b.innerHTML = '<div class="dz-backin"><b>ANIME</b><i>TCG</i></div>'; return b; };

export function mountDuel(root, o) {
    const C = { o, v: null, sel: null, mode: null, lastEv: -1, queue: [], busy: false, fast: false, rects: null, drawer: true };
    root.innerHTML = ""; root.className = "cv-wrap dz" + (lite() ? " lite" : "");
    const defOf = u => { const c = C.v && C.v.cards[u]; if (!c) return null; return String(c.id).startsWith("a:") ? o.defs.action(String(c.id).slice(2)) : o.defs.card(Number(c.id)); };
    const nm = p => (C.v && C.v.names && C.v.names[pk(p)]) || o.names(p);
    const me = () => Number(o.me) || 0;
    const opps = () => C.v ? opponents(C.v, me() || C.v.players[0]).concat(me() ? [] : []) : [];
    let focusOpp = 0;
    const theOpp = () => { const list = me() ? opponents(C.v, me()) : C.v.players.slice(1); if (!list.includes(focusOpp)) focusOpp = list[0] || 0; return focusOpp; };
    const bottomP = () => me() || (C.v && C.v.players[0]);
    /* the player whose turn comes after the current one (free-for-all plates say "next") */
    const nextUp = v => { const ord = arr(v.order).map(Number), al = alive(v), i = ord.indexOf(Number(v.turnP)); for (let k = 1; k <= ord.length; k++) { const q = ord[(i + k) % ord.length]; if (al.includes(q)) return q; } return 0; };
    const amOut = () => !!me() && !!C.v && arr(C.v.out).map(Number).includes(me());

    /* ---------- the static skeleton ---------- */
    const top = mk("div", "dz-top"), oppSide = mk("div", "dz-side opp"), mid = mk("div", "dz-mid"), meSide = mk("div", "dz-side me"), mePlate = mk("div", "dz-mplate"), hand = mk("div", "dz-hand"), insp = mk("aside", "dz-insp"), fx = mk("div", "dz-fx"), bar = mk("div", "dz-tools");
    const board = mk("div", "dz-board"); board.append(oppSide, mid, meSide);
    const main = mk("div", "dz-main"); main.append(top, board, mePlate, hand);
    root.append(main, insp, bar, fx);
    /* the table under it all: wood, light, dust, the camera lean (table.js); the mat halves are the two sides */
    board.classList.add("dz-mat");
    const table = mountTable(root, board);
    bar.append(btn("Log", "ghost sm", showLog, "log"), btn("Rules", "ghost sm", showRules, "help"), btn("Skip animations", "ghost sm dz-skip", () => { C.fast = !C.fast; root.querySelector(".dz-skip").classList.toggle("alt", C.fast); o.sfx("toggle"); }, "skip"));
    if (o.emote) bar.appendChild(btn("Emote", "ghost sm dz-emb", e => { e.stopPropagation(); emotePicker(); }, "emote"));
    if (o.extraTools) o.extraTools(bar);
    bar.appendChild(btn(o.exitLabel || "Leave", "ghost sm dz-exit", () => o.onExit && o.onExit(), "back"));

    /* ---------- render ---------- */
    function update(view) {
        const prev = C.v; C.v = view;
        root.classList.toggle("lite", lite()); table.refresh();
        // remember where things were, so animations start from there
        C.rects = new Map(); root.querySelectorAll("[data-u]").forEach(e => C.rects.set(e.dataset.u, { r: e.getBoundingClientRect(), node: e }));
        if (C.sel && C.sel.kind === "hand" && !arr(P(view, me()).hand).includes(C.sel.u)) { C.sel = null; C.mode = null; }
        if (C.sel && C.sel.kind === "field" && !(P(view, me()) && P(view, me()).ch[C.sel.slot])) { C.sel = null; C.mode = null; }
        draw();
        const fresh = arr(view.ev).filter(e => e.n > C.lastEv);
        if (C.lastEv < 0) { C.lastEv = view.evn || 0; const toss = arr(view.ev).find(e => e.k === "toss"); if (toss && view.turnNo <= 2) banner((Number(toss.first) === me() ? "You go" : nm(toss.first) + " goes") + " first", "The coin toss", "coin", 1600); if (view.over) overScreen(); return; }
        C.lastEv = view.evn || C.lastEv;
        fresh.forEach(e => animate(e, prev));
        if (view.over) setTimeout(overScreen, C.fast || lite() ? 300 : 1800);
    }
    function legal() { return me() && C.v && !C.v.over ? legalMoves(C.v, me()) : []; }
    function draw() {
        const v = C.v, m = me(), L = legal();
        root.dataset.phase = v.phase; root.classList.toggle("my-turn", Number(v.turnP) === m); root.classList.toggle("ffa", v.fmt === "ffa");
        // the opponents' plates (free-for-all: tap one to see their side)
        top.innerHTML = "";
        // free-for-all: in turn order, starting with the player after me; players who are out keep their seat, greyed
        const ord = arr(v.order).map(Number).length ? arr(v.order).map(Number) : v.players.map(Number), base = ord.indexOf(bottomP());
        const others = ord.slice(base + 1).concat(ord.slice(0, Math.max(0, base))).filter(q => q !== bottomP());
        const keepX = top.scrollLeft;
        others.forEach(q => top.appendChild(plate(q, false, q === theOpp())));
        // the phone strip scrolls sideways: keep its place, and bring a newly focused player into view
        top.scrollLeft = keepX;
        if (C.shownFocus !== theOpp()) { C.shownFocus = theOpp(); const f = top.querySelector(".dz-plate.focus"); if (f && top.scrollWidth > top.clientWidth) top.scrollLeft = Math.max(0, f.offsetLeft - top.offsetLeft - 12); }
        // the board: one opponent side (the focused one), the middle, my side
        oppSide.innerHTML = ""; meSide.innerHTML = "";
        // each half is a 5-column grid: [corner] [3 zones] [corner]. Mine: the medallion left, Graveyard / Deck right;
        // the opponent sits across the table, so theirs is mirrored (Deck / Graveyard on my left, medallion on my right)
        const oq = theOpp(); oppSide.classList.toggle("empty", !oq); if (oq) { mat(oppSide, oq); oppSide.append(zoneRow(oq, "ac", true), zoneRow(oq, "ch", true)); }
        mat(meSide, bottomP()); meSide.append(zoneRow(bottomP(), "ch", false), zoneRow(bottomP(), "ac", false));
        drawMid(L);
        mePlate.innerHTML = ""; mePlate.appendChild(plate(bottomP(), true, false));
        drawHand(L);
        drawInsp(L);
        drawWindow(L);
        paintEmotes();
    }
    /* ---------- quick emotes: a bubble on the sender's plate; one every DUEL.emotes.cooldownSec; others can be muted ---------- */
    const EMO = DUEL.emotes || { list: [], cooldownSec: 4, showSec: 2.6 };
    const emoMuted = () => { try { return localStorage.getItem("aap_emote_mute") === "1"; } catch (e) { return false; } };
    C.emo = {}; C.emoT = 0;
    function emotePicker() {
        const old = root.querySelector(".dz-emp"); if (old) { old.remove(); return; }
        const box = mk("div", "dz-emp"); box.setAttribute("role", "menu");
        EMO.list.forEach(([id, label]) => { const b = mk("button", "dz-emo"); b.type = "button"; b.innerHTML = icon("em-" + id); b.appendChild(mk("span", null, label)); b.setAttribute("role", "menuitem"); b.onclick = () => { box.remove(); sendEmote(id); }; box.appendChild(b); });
        const mu = mk("button", "dz-emute" + (emoMuted() ? " on" : ""), emoMuted() ? "Others' emotes: off" : "Others' emotes: on"); mu.type = "button";
        mu.onclick = () => { try { localStorage.setItem("aap_emote_mute", emoMuted() ? "0" : "1"); } catch (e) {} o.sfx("toggle"); box.remove(); emotePicker(); };
        box.appendChild(mu);
        bar.appendChild(box);
        const off = ev => { if (!box.contains(ev.target)) { box.remove(); document.removeEventListener("pointerdown", off, true); } };
        setTimeout(() => document.addEventListener("pointerdown", off, true), 0);
    }
    function sendEmote(id) {
        const left = Math.ceil((C.emoT - Date.now()) / 1000);
        if (left > 0) { o.toast && o.toast("Emotes: wait " + left + " s."); return; }
        C.emoT = Date.now() + EMO.cooldownSec * 1000;
        if (me()) showEmote(me(), id);
        Promise.resolve(o.emote(id)).catch(() => {});
    }
    function showEmote(p, id) {
        p = Number(p); if (!EMO.list.some(x => x[0] === id)) return;
        if (p !== me() && emoMuted()) return;
        const prev = C.emo[p]; if (prev) clearTimeout(prev.tm);
        C.emo[p] = { id, fresh: 1, tm: setTimeout(() => { delete C.emo[p]; root.querySelectorAll('.dz-plate[data-p="' + p + '"] .dz-bub').forEach(x => x.remove()); }, EMO.showSec * 1000) };
        o.sfx("emote"); paintEmotes();
    }
    function paintEmotes() {
        Object.entries(C.emo).forEach(([p, e]) => {
            root.querySelectorAll('.dz-plate[data-p="' + p + '"]').forEach(pl => {
                pl.querySelectorAll(".dz-bub").forEach(x => x.remove());
                const b = mk("span", "dz-bub" + (e.fresh ? " pop" : "")); b.innerHTML = icon("em-" + e.id); b.appendChild(mk("b", null, (EMO.list.find(x => x[0] === e.id) || [])[1] || ""));
                b.setAttribute("role", "status"); b.setAttribute("aria-label", nm(p) + ": " + ((EMO.list.find(x => x[0] === e.id) || [])[1] || ""));
                pl.appendChild(b);
            });
            e.fresh = 0;
        });
    }
    /* the playmat half of player p (the series most common in their deck, or the playmat hook: table.js matFor) */
    function mat(side, p) { const m = matFor(C.v, p, o); paintMat(side, m); side._mat = m; }
    /* a face for a Graveyard card (characters and Action cards) */
    const faceOf = u => { const c = C.v.cards[u]; if (!c) return null; return String(c.id).startsWith("a:") ? actionEl(String(c.id).slice(2)) : cardEl(Number(c.id), { size: "sm" }); };
    function plate(p, mine, focus) {
        const v = C.v, pl = P(v, p) || {}, out = arr(v.out).includes(p), pub = o.pub ? o.pub(p) : null;
        const canHit = !mine && !out && C.mode === "attack" && C.sel && legal().some(x => x.k === "attack" && x.slot === C.sel.slot && x.tp === p);
        const box = mk(mine ? "div" : "button", "dz-plate" + (mine ? " me" : "") + (focus ? " focus" : "") + (out ? " out" : "") + (Number(v.turnP) === p ? " turn" : "") + (canHit ? " can-hit" : ""));
        box.dataset.p = p;
        if (!mine) { box.type = "button"; box.onclick = () => { focusOpp = p; C.userFocus = 1; o.sfx("toggle"); draw(); }; box.setAttribute("aria-label", nm(p) + (canHit ? ": tap to attack this player" : ": show their side")); }
        if (v.fmt === "ffa") { const place = Number((v.place || {})[pk(p)]) || 0; box.appendChild(mk("span", "dz-seat" + (out ? " placed" : ""), out ? "#" + place : String(arr(v.order).map(Number).indexOf(p) + 1))); if (!out) box.lastChild.title = "Turn order"; }
        if (pub && o.avatar) box.appendChild(o.avatar(pub, 40)); else box.appendChild(mk("span", "dz-ava", (nm(p) || "?").slice(0, 1)));
        const info = mk("div", "dz-pinfo"); info.appendChild(mk("b", null, nm(p) + (out ? " · out" : Number(v.turnP) === p ? " · turn" : v.fmt === "ffa" && nextUp(v) === p ? " · next" : "")));
        const max = v.fmt === "ffa" ? DUEL.rules.lifeFfa : DUEL.rules.life, life = Number(pl.life) || 0;
        const lb = mk("div", "dz-life"); lb.dataset.p = p; const li = mk("i"); li.style.width = Math.max(0, Math.min(100, life / max * 100)) + "%"; li.className = life <= max * .25 ? "low" : ""; const lt = mk("b", "dz-lifen"); lt.innerHTML = icon("life"); lt.appendChild(mk("span", null, String(life)));
        lb.append(li, lt); info.appendChild(lb); box.appendChild(info);
        const piles = mk("div", "dz-piles");
        const pile = (ic, n, t, fn) => { const s = mk("span", "dz-pile", null); s.innerHTML = icon(ic); s.appendChild(mk("b", null, String(n))); s.title = t; if (fn) { s.classList.add("tap"); s.onclick = e => { e.stopPropagation(); fn(); }; } return s; };
        piles.append(pile("deck", pl.deckN != null ? pl.deckN : arr(pl.deck).length, "Cards in the deck"), pile("graveyard", arr(pl.gy).length, "Graveyard: tap to see it", () => showGy(p)));
        if (!mine) piles.append(pile("decks", pl.handN != null ? pl.handN : arr(pl.hand).length, "Cards in hand"), pile("lock", arr(pl.ac).filter(Boolean).length, "Face-down cards"));
        box.appendChild(piles);
        if (!mine && !out) { const hb = mk("div", "dz-hbacks"); for (let i = 0; i < Math.min(8, pl.handN || 0); i++) { const b = mk("i"); b.style.setProperty("--k", i - Math.min(8, pl.handN) / 2); hb.appendChild(b); } box.appendChild(hb); }
        return box;
    }
    function zoneRow(p, kind, theirs) {
        const v = C.v, pl = P(v, p) || {}, row = mk("div", "dz-row " + kind), m = me(), L = legal();
        const list = kind === "ch" ? arr(pl.ch) : arr(pl.ac);
        const side = theirs ? oppSide : meSide;
        const corner = () => kind === "ch" ? gyPile(p, arr(pl.gy), faceOf, () => showGy(p)) : deckPile(p, pl.deckN != null ? Number(pl.deckN) : arr(pl.deck).length, () => backEl());
        // mine: the medallion spans both rows on the left; theirs (mirrored): the piles on the left
        if (!theirs && kind === "ch") row.appendChild(medallion(side._mat || { key: "onepiece" }));
        if (theirs) row.appendChild(corner());
        list.forEach((c, i) => {
            const z = mk("div", "dz-zone " + kind + (c ? " full" : " free")); z.dataset.p = p; z.dataset.slot = i; z.dataset.kind = kind;
            if (kind === "ch" && c) {
                const d = defOf(c.u), el = cardEl(Number(v.cards[c.u].id), { size: "sm" }); el.dataset.u = c.u;
                if (c.pos === "def") z.classList.add("pos-def");
                if (c.sil) z.classList.add("silenced");
                z.appendChild(el);
                const st = statOf(v, p, i), sb = mk("div", "dz-stats");
                const base = d ? [d.atk, d.def] : [0, 0];
                sb.append(mk("b", "atk" + (st.atk > base[0] ? " up" : st.atk < base[0] ? " down" : ""), String(st.atk)), mk("b", "def" + (st.def > base[1] ? " up" : st.def < base[1] ? " down" : ""), String(st.def)));
                z.appendChild(sb);
                if (c.atk1 && Number(v.turnP) === p) z.appendChild(mk("span", "dz-used", "attacked"));
            } else if (kind === "ac" && c) {
                const known = c.u && v.cards[c.u];
                const el = known ? actionEl(String(v.cards[c.u].id).slice(2)) : backEl(); el.classList.add("down-card"); if (c.u) el.dataset.u = c.u;
                z.appendChild(el); if (known) z.appendChild(mk("span", "dz-setmark", "set"));
            } else z.appendChild(mk("span", "dz-zl", kind === "ch" ? "Character" : "Action"));
            // highlights
            const hl = zoneLegal(p, kind, i, L); if (hl) z.classList.add("glow", hl);
            if (C.sel && C.sel.kind === "field" && C.sel.p === p && C.sel.slot === i && kind === "ch") z.classList.add("selected");
            z.onclick = () => zoneTap(p, kind, i);
            row.appendChild(z);
        });
        if (!theirs) row.appendChild(corner());
        if (theirs && kind === "ac") row.appendChild(medallion(side._mat || { key: "onepiece" }));
        return row;
    }
    function zoneLegal(p, kind, i, L) {
        const m = me(); if (!m) return "";
        if (C.mode === "place" && p === m && kind === "ch" && !P(C.v, m).ch[i]) return "place";
        if (C.mode === "tribute" && p === m && kind === "ch" && P(C.v, m).ch[i]) return "tribute";
        if (C.mode === "attack" && C.sel) return L.some(x => x.k === "attack" && x.slot === C.sel.slot && x.tp === p && x.tslot === i && kind === "ch") ? "target" : "";
        if (C.v.pending && p === m && kind === "ac") return L.some(x => x.k === "respond" && x.u === (P(C.v, m).ac[i] || {}).u) ? "respond" : "";
        if (!C.mode && p === m && kind === "ch") return L.some(x => (x.k === "attack" || x.k === "ability" || x.k === "position") && x.slot === i) ? "act" : "";
        return "";
    }
    function drawMid(L) {
        const v = C.v, m = me(); mid.innerHTML = "";
        const phases = mk("div", "dz-phases");
        PH.forEach(([k, l, ic]) => { const s = mk("span", "dz-ph" + (v.phase === k ? " on" : "")); s.innerHTML = icon(ic); s.appendChild(mk("b", null, l)); s.title = PHASES[l]; phases.appendChild(s); });
        mid.appendChild(phases);
        const hint = mk("p", "dz-hint");
        const myTurn = Number(v.turnP) === m;
        hint.textContent = v.over ? "The duel is over." : v.pending ? (Number(v.pending.who) === m ? "Respond with a Counter, or pass." : nm(v.pending.who) + " may respond with a Counter…") :
            !myTurn ? nm(v.turnP) + "'s turn: " + PHASES[ph(v.phase)] :
            C.mode === "place" ? "Tap a free Character Zone." : C.mode === "tribute" ? "Tap your character to tribute." : C.mode === "attack" ? "Tap a glowing target" + (L.some(x => x.k === "attack" && x.slot === C.sel.slot && x.direct && x.tp === theOpp()) ? ", or attack directly" : "") + (v.fmt === "ffa" && opponents(v, m).length > 1 ? ". Tap another player's plate to attack them instead." : ".") :
            v.phase === "main" ? "Main: summon one character, play Supports, set Counters. Then Battle or End." : v.phase === "battle" ? "Battle: tap one of your Attack-position characters, then a target." : "";
        mid.appendChild(hint);
        const acts = mk("div", "dz-acts");
        const timer = mk("span", "dz-timer"); timer.dataset.dl = v.pending ? v.pending.dl : v.dl; timer.innerHTML = icon("timer"); timer.appendChild(mk("b")); acts.appendChild(timer);
        if (m && myTurn && !v.pending && !v.over) {
            if (C.mode) acts.appendChild(btn("Cancel", "ghost sm", () => { C.mode = null; draw(); }, "close"));
            if (C.mode === "attack" && L.some(x => x.k === "attack" && x.slot === C.sel.slot && x.direct && x.tp === theOpp())) acts.appendChild(btn("Attack " + nm(theOpp()) + " directly", "alt sm", () => confirmAttack({ k: "attack", slot: C.sel.slot, tp: theOpp(), direct: true }), "duel"));
            if (L.some(x => x.k === "phase" && x.to === "battle")) acts.appendChild(btn("To Battle", "sm", () => send({ k: "phase", to: "battle" }), "battle"));
            acts.appendChild(btn("End turn", "alt sm", () => send({ k: "phase", to: "end" }), "end"));
        }
        mid.appendChild(acts);
    }
    const ph = k => ({ draw: "Draw", main: "Main", battle: "Battle", end: "End" }[k] || "Main");
    function drawHand(L) {
        const v = C.v, m = me(); hand.innerHTML = "";
        if (!m) { hand.appendChild(mk("p", "dz-watch", "Watching: the hands stay hidden.")); return; }
        if (amOut() && !v.over) { hand.appendChild(mk("p", "dz-watch out", "You're out (#" + (Number((v.place || {})[pk(m)]) || "?") + "). Watching the rest of the duel: tap a plate to see that player's side.")); return; }
        const h = arr(P(v, m).hand), n = h.length;
        h.forEach((u, i) => {
            const c = v.cards[u]; if (!c) return;
            const isA = String(c.id).startsWith("a:"), el = isA ? actionEl(String(c.id).slice(2)) : cardEl(Number(c.id), { size: "sm" });
            el.dataset.u = u; el.classList.add("dz-hc"); el.style.setProperty("--k", i - (n - 1) / 2); el.style.setProperty("--n", n);
            const ok = L.some(x => x.u === u && ["summon", "set", "support"].includes(x.k));
            el.classList.toggle("ok", ok); el.classList.toggle("dim", !ok);
            if (C.sel && C.sel.kind === "hand" && C.sel.u === u) el.classList.add("selected");
            el.tabIndex = 0; el.setAttribute("role", "button");
            el.onclick = () => { C.sel = { kind: "hand", u }; C.mode = null; o.sfx("card"); draw(); };
            el.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); } };
            hand.appendChild(el);
        });
    }
    /* ---------- the inspector: the selected card large, its text, what you can do with it ---------- */
    function drawInsp(L) {
        insp.innerHTML = ""; const v = C.v, m = me();
        const s = C.sel;
        if (!s) { insp.classList.add("empty"); insp.append(mk("b", "dz-ih", "Card inspector"), mk("p", "dz-ip", "Tap any card (your hand, the field, a Graveyard) to see it here with its full ability. Tap a keyword to see what it means.")); return; }
        insp.classList.remove("empty");
        const u = s.kind === "hand" || s.kind === "gy" || s.kind === "any" ? s.u : ((P(v, s.p).ch || [])[s.slot] || {}).u;
        const c = v.cards[u]; if (!c) { C.sel = null; drawInsp(L); return; }
        const isA = String(c.id).startsWith("a:"), d = defOf(u);
        const close = btn("", "ghost sm dz-iclose", () => { C.sel = null; C.mode = null; draw(); }, "close"); close.setAttribute("aria-label", "Close the inspector");
        insp.appendChild(close);
        insp.appendChild(isA ? actionEl(String(c.id).slice(2), "md") : cardEl(Number(c.id), { size: "md" }));
        const t = mk("div", "dz-itxt");
        t.appendChild(mk("b", null, d.name));
        if (isA) { t.appendChild(mk("small", null, d.type === "counter" ? "Counter: set it face-down, it answers " + ({ attack: "an attack on you", support: "a Support card", summon: "a summon" }[d.trig]) + " in the response window." : "Support: play it from your hand in your Main phase; it resolves at once.")); t.appendChild(mk("p", null, d.text)); }
        else {
            const r = mk("small", "dz-irar"); r.innerHTML = icon(RARITY_ICON[d.r]); r.appendChild(document.createTextNode(["Common", "Uncommon", "Rare", "Ultra Rare", "Epic", "Legendary", "Mythic"][d.r] + " · " + d.a + (tributesFor(v, u) ? " · needs " + tributesFor(v, u) + " tribute" : "")));
            t.appendChild(r);
            if (s.kind === "field") { const st = statOf(v, s.p, s.slot), cc = P(v, s.p).ch[s.slot]; t.appendChild(mk("p", "dz-ist", "ATK " + st.atk + " · DEF " + st.def + " · " + (cc.pos === "atk" ? "Attack" : "Defense") + " position" + (cc.sil ? " · silenced" : "") + (pierces(v, s.p, s.slot) ? " · Pierce" : ""))); }
            else t.appendChild(mk("p", "dz-ist", "ATK " + d.atk + " · DEF " + d.def));
            if (d.ab) {
                const chips = mk("div", "dz-chips"), def = mk("p", "dz-def");
                arr(d.ab.kw).forEach(k => { const b = mk("button", "dz-chip"); b.type = "button"; b.innerHTML = icon(KEYWORD_ICON[k] || "spirit"); b.appendChild(document.createTextNode(k)); b.onclick = () => { def.textContent = k + ": " + define(k); }; chips.appendChild(b); });
                t.append(mk("p", "dz-abn", d.ab.name || ""), chips, mk("p", null, d.ab.text), def);
            }
        }
        insp.appendChild(t);
        // what you can do with it
        const acts = mk("div", "dz-iacts"), say = mk("p", "dz-why");
        const tryBtn = (label, a, ic, then) => { const r = m ? why(v, m, a) : "You're watching."; const b = btn(label, r ? "ghost sm" : "alt sm", () => { if (r) { say.textContent = r; o.sfx("strike"); return; } then ? then() : send(a); }, ic); if (r) b.classList.add("no"); b.title = r || ""; acts.appendChild(b); };
        if (s.kind === "hand" && m) {
            if (!isA) {
                const need = tributesFor(v, u);
                ["atk", "def"].forEach(pos => tryBtn("Summon in " + (pos === "atk" ? "Attack" : "Defense"), { k: "summon", u, pos, trib: need ? (arr(P(v, m).ch).map((c2, i) => c2 ? [i] : null).find(Boolean) || []) : [] }, pos === "atk" ? "atk" : "def", () => { C.pos = pos; C.mode = need ? "tribute" : "place"; o.sfx("pick"); draw(); }));
            } else if (d.type === "support") tryBtn("Play " + d.name, { k: "support", u }, "support");
            else tryBtn("Set face-down", { k: "set", u }, "counter");
        }
        if (s.kind === "field" && s.p === m) {
            tryBtn("Attack", { k: "attack", slot: s.slot, tp: theOpp(), direct: !arr(P(v, theOpp()).ch).some(Boolean), tslot: arr(P(v, theOpp()).ch).findIndex(Boolean) }, "duel", () => { C.mode = "attack"; o.sfx("pick"); draw(); });
            const cc = P(v, m).ch[s.slot]; tryBtn(cc && cc.pos === "atk" ? "Switch to Defense" : "Switch to Attack", { k: "position", slot: s.slot }, "position");
            if (d.ab && d.ab.t === "opt") tryBtn("Use ability", { k: "ability", slot: s.slot }, "spirit");
        }
        if (acts.childElementCount) insp.append(acts, say);
    }
    /* the response window strip */
    let winBox = null;
    function drawWindow(L) {
        const v = C.v, m = me();
        if (winBox) { winBox.remove(); winBox = null; }
        if (!v.pending || Number(v.pending.who) !== m) return;
        winBox = mk("div", "dz-window"); winBox.append(mk("b", null, "Respond?"), mk("small", null, "Your opponent declared " + ({ attack: "an attack on you", support: "a Support card", summon: "a summon" }[v.pending.trig]) + ". Activate ONE face-down Counter, or pass."));
        const row = mk("div", "dz-wrow");
        arr(P(v, m).ac).forEach((x, i) => { if (!x || !x.u) return; const d = defOf(x.u); const r = why(v, m, { k: "respond", u: x.u }); const b = btn(d.name, r ? "ghost sm" : "alt sm", () => { if (r) { o.toast(r); return; } send({ k: "respond", u: x.u }); }, "counter"); if (r) b.title = r; row.appendChild(b); });
        row.appendChild(btn("Pass", "sm", () => send({ k: "pass" }), "skip"));
        winBox.appendChild(row); mid.appendChild(winBox);
    }
    /* ---------- taps ---------- */
    function zoneTap(p, kind, i) {
        const v = C.v, m = me(), c = kind === "ch" ? P(v, p).ch[i] : P(v, p).ac[i];
        if (C.mode === "place" && p === m && kind === "ch" && !c) { const a = { k: "summon", u: C.sel.u, pos: C.pos, slot: i, trib: C.trib || [] }; C.mode = null; C.trib = null; send(a); return; }
        if (C.mode === "tribute" && p === m && kind === "ch" && c) {
            const need = tributesFor(v, C.sel.u); C.trib = (C.trib || []).concat(i); if (C.trib.length < need) { draw(); return; }
            const a = { k: "summon", u: C.sel.u, pos: C.pos, trib: C.trib }; C.mode = null; C.trib = null; send(a); return;
        }
        if (C.mode === "attack" && C.sel && kind === "ch" && c && p !== m) { const a = { k: "attack", slot: C.sel.slot, tp: p, tslot: i }; const r = why(v, m, a); if (r) { o.toast(r); o.sfx("strike"); return; } confirmAttack(a); return; }
        if (v.pending && p === m && kind === "ac" && c) { const r = why(v, m, { k: "respond", u: c.u }); if (r) { o.toast(r); return; } send({ k: "respond", u: c.u }); return; }
        if (kind === "ch" && c) { C.sel = { kind: "field", p, slot: i }; C.mode = null; o.sfx("card"); draw(); return; }
        if (kind === "ac" && c && c.u && v.cards[c.u]) { C.sel = { kind: "any", u: c.u }; draw(); return; }
        if (C.mode) { o.toast(C.mode === "place" ? "Pick a free Character Zone." : C.mode === "tribute" ? "Pick one of your characters to tribute." : "Pick a glowing target."); }
    }
    /* the battle preview: both cards, the numbers, the exact outcome in words */
    function confirmAttack(a) {
        const v = C.v, m = me(), pv = preview(v, m, a.slot, a.tp, a.tslot, a.direct); if (!pv) return;
        const ov = mk("div", "dz-modal"), box = mk("div", "dz-pv");
        box.appendChild(mk("small", "dz-pvk", "BATTLE PREVIEW"));
        const row = mk("div", "dz-pvrow");
        const A = P(v, m).ch[a.slot]; row.appendChild(cardEl(Number(v.cards[A.u].id), { size: "sm" }));
        const vs = mk("div", "dz-pvvs"); vs.append(mk("b", "atk", String(pv.vs[0])), mk("i", null, "vs"), mk("b", pv.vs[2] === "DEF" ? "def" : pv.vs[2] === "LIFE" ? "life" : "atk", a.direct ? nm(a.tp) : String(pv.vs[1])), mk("small", null, "ATK vs " + (pv.vs[2] === "LIFE" ? "the player" : pv.vs[2])));
        row.appendChild(vs);
        if (!a.direct) { const T = P(v, a.tp).ch[a.tslot]; const te = cardEl(Number(v.cards[T.u].id), { size: "sm" }); if (T.pos === "def") te.classList.add("pv-def"); row.appendChild(te); } else { const b = mk("div", "dz-pvdirect"); b.innerHTML = icon("life"); b.appendChild(mk("b", null, nm(a.tp))); row.appendChild(b); }
        box.append(row, mk("p", "dz-pvtxt", pv.text), mk("small", "dz-pvnote", "Abilities and Counters can still change this."));
        const btns = mk("div", "dz-iacts"); btns.append(btn("Cancel", "ghost", () => ov.remove(), "close"), btn("Attack!", "alt", () => { ov.remove(); C.mode = null; send(a); }, "duel"));
        box.appendChild(btns); ov.appendChild(box); root.appendChild(ov);
        ov.addEventListener("click", e => { if (e.target === ov) ov.remove(); }); o.sfx("open");
    }
    async function send(a) {
        const err = o.send(a); if (err && err.then) { const r = await err; if (r) { o.toast(r); o.sfx("strike"); } } else if (err) { o.toast(err); o.sfx("strike"); }
        if (a.k === "summon" || a.k === "support" || a.k === "set") C.sel = null;
    }
    /* ---------- animations from events ---------- */
    const zoneEl = (p, kind, i) => root.querySelector('.dz-zone[data-p="' + p + '"][data-kind="' + kind + '"][data-slot="' + i + '"]');
    const lifeEl = p => root.querySelector('.dz-life[data-p="' + p + '"]');
    const center = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    function float(el, txt, cls) { if (!el) return; const [x, y] = center(el); const f = mk("b", "dz-float " + (cls || ""), txt); f.style.left = x + "px"; f.style.top = y + "px"; fx.appendChild(f); setTimeout(() => f.remove(), 1400); }
    function banner(title, sub, ic, ms = 1200) {
        if (C.fast) return; const b = mk("div", "dz-banner"); const h = mk("b"); if (ic) h.innerHTML = icon(ic); h.appendChild(document.createTextNode(title)); b.append(h, mk("small", null, sub || ""));
        fx.querySelectorAll(".dz-banner").forEach(x => x.remove()); fx.appendChild(b); setTimeout(() => b.classList.add("out"), ms); setTimeout(() => b.remove(), ms + 400);
    }
    function animate(e, prev) {
        const v = C.v, m = me(), fast = C.fast || lite();
        const pulse = (el, cls, ms = 700) => { if (!el || fast) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };
        switch (e.k) {
            case "turn": if (v.fmt === "ffa") { C.userFocus = 0; if (Number(e.p) !== m && opponents(v, m || 0).includes(Number(e.p))) { focusOpp = Number(e.p); draw(); } } o.sfx("turn"); banner(Number(e.p) === m ? "Your turn" : nm(e.p) + "'s turn", "Turn " + e.turnNo + (clashAt(v) ? " · Final Clash: -" + clashAt(v) + " life for everyone at the end of this round" : ""), "duel", 1000); break;
            case "phase": if (e.phase === "battle") { o.sfx("tick"); banner("Battle phase", PHASES.Battle, "battle", 900); } break;
            case "summon": {
                const z = zoneEl(e.p, "ch", e.slot), card = z && z.querySelector(".vcard");
                const from = C.rects.get(e.u); if (card && from && !fast && o.flyClone) o.flyClone(from.node, from.r, card.getBoundingClientRect(), { ms: 420, rot: -4 });
                if (z && !fast) { z.style.setProperty("--fc", RCOL[e.r] || "#fff"); pulse(z, "summoned", 900); }
                o.sfx(e.r >= 5 ? "impact" : "slam"); banner((Number(e.p) === m ? "You summon " : nm(e.p) + " summons ") + (defOf(e.u) || {}).name, e.pos === "def" ? "Defense position" : "Attack position", "character");
                break;
            }
            case "tribute": float(zoneEl(e.p, "ch", e.slot), "Tribute", "tri"); o.sfx("close"); break;
            case "set": pulse(zoneEl(e.p, "ac", e.slot), "setting"); o.sfx("card"); break;
            case "position": pulse(zoneEl(e.p, "ch", e.slot), "turning"); o.sfx("flip"); break;
            case "support": { const d = defOf(e.u); o.sfx("ability"); banner("Support: " + (d || {}).name, (d || {}).text, "support", 1600); break; }
            case "counter": { const d = defOf(e.u); o.sfx("chainbreak"); banner("Counter: " + (d || {}).name, (d || {}).text, "counter", 1700); pulse(root, "flash", 500); break; }
            case "ability": { const d = defOf(e.u); if (d && d.ab) { o.sfx("ability"); banner(d.name + ": " + (d.ab.name || "ability"), d.ab.text, "spirit", 1500); } break; }
            case "attack": {
                if (v.fmt === "ffa" && Number(e.p) !== m && Number(e.tp) !== m) banner(nm(e.p) + " attacks " + nm(e.tp), e.direct ? "A direct attack" : "Only " + nm(e.tp) + " may respond", "duel", 1100);
                if (v.fmt === "ffa" && Number(e.tp) === m && !C.userFocus && focusOpp !== Number(e.p)) { focusOpp = Number(e.p); draw(); }
                const z = zoneEl(e.p, "ch", e.slot), tz = e.direct ? lifeEl(e.tp) : zoneEl(e.tp, "ch", e.tslot);
                if (z && tz && !fast) { const [x1, y1] = center(z), [x2, y2] = center(tz); z.style.setProperty("--lx", (x2 - x1) * .55 + "px"); z.style.setProperty("--ly", (y2 - y1) * .55 + "px"); pulse(z, "lunge", 650); }
                o.sfx("whoosh"); break;
            }
            case "clash": if (!fast) { pulse(root, "shake", 420); pulse(zoneEl(e.tp, "ch", e.tslot), "hit", 500); } o.sfx("clash"); banner("Clash", (e.text || ""), "battle", 1500); break;
            case "hit": o.sfx("impact"); if (!fast) pulse(root, "shake", 420); break;
            case "life": { const el = lifeEl(e.p); float(el, (e.d > 0 ? "+" : "") + e.d, e.d > 0 ? "heal" : "dmg"); if (e.d < 0) o.sfx("tick"); break; }
            case "buff": float(zoneEl(e.p, "ch", e.slot), (e.atk ? (e.atk > 0 ? "+" : "") + e.atk + " ATK " : "") + (e.def ? (e.def > 0 ? "+" : "") + e.def + " DEF" : ""), (e.atk || e.def) > 0 ? "up" : "down"); break;
            case "destroy": {
                const from = C.rects.get(e.u); o.sfx("shatter");
                if (from && !fast) { const g = from.node.cloneNode(true); g.className += " dz-shatter"; Object.assign(g.style, { position: "fixed", left: from.r.left + "px", top: from.r.top + "px", width: from.r.width + "px", height: from.r.height + "px", margin: 0 }); fx.appendChild(g); setTimeout(() => g.remove(), 900); }
                break;
            }
            case "silence": float(zoneEl(e.p, "ch", e.slot), "Silenced", "down"); break;
            case "swap": float(zoneEl(e.p, "ch", e.slot), "ATK ⇄ DEF", "up"); break;
            case "negated": banner("Negated", "The attack is stopped.", "close", 1000); break;
            case "scout": if (Number(e.to) === m && arr(e.cards).length) { const id = e.cards[0]; banner("Scout", String(id).startsWith("a:") ? "Their face-down card: " + (ACTIONS[String(id).slice(2)] || {}).name : "You saw: " + (o.defs.card(Number(id)) || {}).name, "scout", 2000); } break;
            case "out": banner(Number(e.p) === m ? "You're out" : nm(e.p) + " is out", e.why === "deck" ? "Their deck ran out." : e.why === "concede" ? "Left the duel." : "No life left.", "graveyard", 1400); break;
            case "window": if (Number(e.who) === m) { o.sfx("open"); } break;
        }
    }
    /* ---------- panels: log, rules, Graveyard, the end ---------- */
    function modal(title, body) { const ov = mk("div", "dz-modal"), box = mk("div", "dz-panel"); const h = mk("div", "dz-ph2"); h.append(mk("b", null, title), btn("", "ghost sm", () => ov.remove(), "close")); box.append(h, body); ov.appendChild(box); root.appendChild(ov); ov.addEventListener("click", e => { if (e.target === ov) ov.remove(); }); o.sfx("open"); return ov; }
    function showLog() { const ol = mk("ol", "dz-log"); arr(C.v.log).slice().reverse().forEach(l => ol.appendChild(mk("li", null, l))); modal("Duel log", ol); }
    function showGy(p) {
        const g = mk("div", "dz-gy"), list = arr(P(C.v, p).gy);
        if (!list.length) g.appendChild(mk("p", "dz-ip", "Empty."));
        list.slice().reverse().forEach(u => { const c = C.v.cards[u]; if (!c) return; const el = String(c.id).startsWith("a:") ? actionEl(String(c.id).slice(2)) : cardEl(Number(c.id), { size: "sm" }); el.onclick = () => { C.sel = { kind: "any", u }; ov.remove(); draw(); }; g.appendChild(el); });
        const ov = modal(nm(p) + "'s Graveyard (" + list.length + ")", g);
    }
    function showRules() {
        const b = mk("div", "dz-rules");
        const sec = (t, html) => { const s = mk("section"); s.appendChild(mk("h4", null, t)); const d = mk("div"); d.innerHTML = html; s.appendChild(d); b.appendChild(s); };
        sec("Goal", "Bring your opponent's life from " + DUEL.rules.life + " to 0. A player who must draw from an empty deck loses too.");
        sec("A turn", PH.map(([k, l, ic]) => '<p class="dz-rl">' + icon(ic) + "<b>" + l + "</b> " + PHASES[l] + "</p>").join(""));
        sec("Positions", '<div class="dz-rpos"><div><i class="dz-rcard"></i><b>Attack</b><small>' + POSITIONS.Attack + '</small></div><div><i class="dz-rcard def"></i><b>Defense</b><small>' + POSITIONS.Defense + "</small></div></div>");
        sec("Damage", '<table class="dz-rtab"><tr><th>Attack vs</th><th>Result</th></tr><tr><td>ATK higher than ATK</td><td>The target is destroyed; its owner loses the difference.</td></tr><tr><td>ATK equal to ATK</td><td>Both are destroyed. No damage.</td></tr><tr><td>ATK lower than ATK</td><td>The attacker is destroyed; its owner loses the difference.</td></tr><tr><td>ATK higher than DEF</td><td>The target is destroyed. No damage (Pierce: the difference).</td></tr><tr><td>ATK equal to DEF</td><td>Nothing happens.</td></tr><tr><td>ATK lower than DEF</td><td>The attacker\'s owner loses the difference.</td></tr><tr><td>Direct attack</td><td>The full ATK to life (only if they have no characters).</td></tr></table>');
        sec("Summoning", "One Normal Summon per turn. Legendary and Mythic characters need " + DUEL.rules.tribute.legendary + " tribute: one of your characters goes to the Graveyard. The first player can't attack on turn 1.");
        sec("Action cards", "<b>Support</b>: play it in your Main phase, it resolves at once. <b>Counter</b>: set it face-down; when its trigger happens (an attack on you, a Support card, a summon) you get a " + DUEL.rules.responseSec + "-second window to activate ONE Counter. Counters can't answer Counters.");
        sec("Keywords", Object.entries(KEYWORDS).map(([k, t]) => '<p class="dz-rl">' + icon(KEYWORD_ICON[k] || "spirit") + "<b>" + k + "</b> " + t + "</p>").join(""));
        { const S1 = DUEL.rules.stalemate, S2 = DUEL.rules.stalemateFfa || S1;
            sec("Time", "A turn lasts " + DUEL.rules.turnSec + " s, then it ends. The Final Clash: from the end of round " + S1.round + " (free-for-all: round " + S2.round + "), everyone loses " + S1.loss + " life at the end of each round, " + S1.grow + " more every round after."); }
        modal("How duels work", b);
    }
    let overShown = false;
    function overScreen() {
        if (overShown || !C.v.over) return; overShown = true;
        const v = C.v, m = me(), won = Number(v.winner) === m, st = (v.stats || {})[pk(m)] || {};
        const ov = mk("div", "dz-over " + (m ? (won ? "win" : "lose") : "watch")), box = mk("div", "dz-obox");
        box.appendChild(mk("small", "dz-ok", m ? (won ? "VICTORY" : "DEFEAT") : "DUEL OVER"));
        box.appendChild(mk("h2", null, v.winner ? nm(v.winner) + " wins" : "A draw"));
        const rec = mk("div", "dz-orec");
        [["Turns", v.turnNo], ["Biggest hit", st.big || 0], ["Cards played", st.cards || 0], ["Damage dealt", st.dmg || 0]].forEach(([k, n]) => { const r = mk("div"); r.append(mk("b", null, String(n)), mk("small", null, k)); rec.appendChild(r); });
        box.appendChild(rec);
        const places = Object.entries(v.place || {}).map(([k, pl]) => [Number(k.slice(1)), pl]).sort((a, b) => a[1] - b[1]);
        if (v.fmt === "ffa") { const ol = mk("ol", "dz-oplaces"); places.forEach(([q, pl]) => ol.appendChild(mk("li", null, "#" + pl + " " + nm(q)))); box.appendChild(ol); }
        const b = mk("div", "dz-iacts"); if (o.onRematch) b.appendChild(btn("Rematch", "alt", () => { ov.remove(); o.onRematch(); }, "flip")); b.appendChild(btn(o.exitLabel || "Back", "", () => { ov.remove(); o.onExit && o.onExit(); }, "back")); box.appendChild(b);
        if (o.overNote) box.appendChild(mk("p", "dz-ip", o.overNote));
        ov.appendChild(box); root.appendChild(ov); o.sfx(!m ? "reveal" : won ? "win" : "lose");
    }
    /* the timers (turn, response window) */
    const tickT = setInterval(() => { root.querySelectorAll(".dz-timer").forEach(t => { const left = Math.max(0, Math.ceil((Number(t.dataset.dl) - (o.now ? o.now() : Date.now())) / 1000)); t.lastChild.textContent = left + " s"; t.classList.toggle("low", left <= 10); }); }, 250);
    return { update, emote: showEmote, destroy() { clearInterval(tickT); table.destroy(); Object.values(C.emo).forEach(e => clearTimeout(e.tm)); root.innerHTML = ""; }, get sel() { return C.sel; }, select(s) { C.sel = s; draw(); }, root };
}
