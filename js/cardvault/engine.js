/* =====================================================================
   ARCADE VAULT · CARD BATTLE ENGINE (pure: no DOM, no Firebase; tested in tools/cardvault-test.mjs)
   1v1 ("duel"): 10-card decks, 20 life, opening hand 4, draw 1 per round.
   Free-for-all ("ffa", 3-8 players): 25 life; every player also picks a target.
   The host runs every change inside a Firebase transaction; clients only send their pick.

   A ROUND
   1. Everyone alive picks a card from their hand (and a target in free-for-all) at the same time. The pick timer
      runs out -> the engine auto-picks (highest Power, lowest life target), the same for a disconnected player.
   2. All cards are revealed together and resolved in this exact order:
      a. SILENCE   every Silence fires at once (cards silencing each other both lose their ability).
      b. MIRROR    copy abilities take the opposing card's ability (not Silence/Mirror: those already happened).
      c. SWAP      Power / Defense swaps, in seat order.
      d. REVEAL    "On reveal" bonuses: Rage, Last Stand, Combo, Finale, Legacy, Scout, Heal, flat +Power/+Defense.
      e. CLASH     each card hits the card it targets: damage = max(0, Power - (Defense - Pierce)), then the
                   defender's Guard, Redirect cap and Counter. All damage happens at the same time.
      f. WIN/DEFEAT a card wins its clash when it dealt more damage than it took from that card
                   (free-for-all: dealt more than 0 and more than it took back). "On win" / "On defeat" effects.
      g. LIFE      damage and healing are applied together (healing can save you), capped at the starting life.
      h. KO        0 life or less = out. Placements follow the elimination order; knocked out together = tied.
      i. CLEANUP   played cards go to the discard pile, everyone alive draws 1 (plus "draw a card" effects).
   3. The game ends when one player is left, or every hand and deck is empty: then the higher life wins. A tie on
      life plays one sudden-death clash with each player's best card (no abilities); still tied = a draw.
   ===================================================================== */
import { ABILITIES } from "./abilities.js?v=1";
import { CARDS } from "../vault/carddb.js?v=2";
import { BATTLE } from "../vault/config.js?v=7";
import { rngFrom, shuffleWith } from "../vault/rng.js?v=1";

export const arr = v => Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];
const pk = p => "p" + p;
export const REVEAL_MS = 4200;           // time the reveal animation gets before the next pick timer starts

export function newBattle({ mid, fmt = "duel", players, decks, names = {}, now = 0, seed = 1, pickMs = BATTLE.pickSeconds * 1000 }) {
    const F = fmt === "ffa" ? BATTLE.ffa : BATTLE.duel, rng = rngFrom(seed);
    const s = { v: 1, mid, fmt, players: players.map(Number), names: {}, max: F.life, life: {}, hand: {}, deck: {}, disc: {}, prev: {}, wins: {}, used: {}, picks: {}, away: {},
        round: 1, phase: "pick", pickMs, dl: now + pickMs, seed, n: 0, last: null, log: [], out: [], places: null, scout: {}, ext: 0 };
    s.players.forEach(p => {
        const d = shuffleWith(rng, arr(decks[pk(p)] || decks[p]).map(Number));
        s.names[pk(p)] = String(names[pk(p)] || names[p] || "Player " + p);
        s.life[pk(p)] = F.life; s.hand[pk(p)] = d.slice(0, F.hand); s.deck[pk(p)] = d.slice(F.hand); s.disc[pk(p)] = []; s.wins[pk(p)] = 0; s.used[pk(p)] = [];
    });
    return s;
}
/* Firebase drops empty arrays / objects and may turn arrays into objects: rebuild the full shape before any rule runs */
export function normalize(s) {
    if (!s) return s;
    s.players = arr(s.players).map(Number); s.out = arr(s.out); s.log = arr(s.log);
    ["names", "life", "hand", "deck", "disc", "prev", "wins", "used", "picks", "away", "scout"].forEach(k => { s[k] = s[k] && typeof s[k] === "object" ? s[k] : {}; });
    ["hand", "deck", "disc", "used"].forEach(k => s.players.forEach(p => { s[k][pk(p)] = arr(s[k][pk(p)]).map(Number); }));
    if (s.places) s.places = arr(s.places);
    if (s.winners) s.winners = arr(s.winners).map(Number);
    return s;
}
export const alive = s => arr(s.players).map(Number).filter(p => !arr(s.out).some(o => Number(o.p) === p));
export const handOf = (s, p) => arr((s.hand || {})[pk(p)]).map(Number);
export const lifeOf = (s, p) => Number((s.life || {})[pk(p)]) || 0;
const nm = (s, p) => (s.names || {})[pk(p)] || "Player " + p;
const scale = (s, th) => Math.round(th * s.max / 20);
export const defaultTarget = (s, p) => s.fmt === "ffa" ? alive(s).filter(q => q !== p).sort((a, b) => lifeOf(s, a) - lifeOf(s, b) || a - b)[0] : alive(s).find(q => q !== p);
export const hasPicked = (s, p) => !!(s.picks || {})[pk(p)];
export const allPicked = s => alive(s).every(p => hasPicked(s, p));

/* the pick a player makes when the timer runs out (or a CPU in practice): strongest card, weakest target */
export function autoPick(s, p, rng) {
    const h = handOf(s, p); if (!h.length) return null;
    const score = id => { const c = CARDS[id] || { pow: 0, def: 0, r: 0 }; return c.pow * 2 + c.def + c.r * .4 + (rng ? rng() * 3 : 0); };
    const c = h.slice().sort((a, b) => score(b) - score(a) || a - b)[0];
    return { c, t: defaultTarget(s, p) };
}

/* a player's move. Returns null when applied, or the reason it was refused. */
export function act(s, a) {
    const p = Number(a.p);
    if (s.phase !== "pick") return "not picking";
    if (!alive(s).includes(p)) return "out";
    const c = Number(a.c); if (!handOf(s, p).includes(c)) return "not in hand";
    let t = s.fmt === "ffa" ? Number(a.t) : defaultTarget(s, p);
    if (!alive(s).includes(t) || t === p) t = defaultTarget(s, p);
    s.picks = Object.assign({}, s.picks, { [pk(p)]: { c, t } });
    if (s.away && s.away[pk(p)]) { s.away = Object.assign({}, s.away); delete s.away[pk(p)]; }
    return null;
}

/* ---------- the round ---------- */
export function resolveRound(s, now = 0) {
    if (s.phase !== "pick") return false;
    const live = alive(s), lines = [], banners = [];
    const ban = (p, text) => banners.push({ p, text });
    live.forEach(p => { if (!hasPicked(s, p)) { const ap = autoPick(s, p); if (ap) { s.picks = Object.assign({}, s.picks, { [pk(p)]: ap }); lines.push(nm(s, p) + " ran out of time: auto-pick."); } } });
    const P = {};
    live.forEach(p => {
        const pick = s.picks[pk(p)]; if (!pick) return;
        const c = CARDS[pick.c];
        P[p] = { p, c: Number(pick.c), t: Number(pick.t), pow: c.pow, def: c.def, base: c.ab, ab: c.ab, a: c.a, s: c.s, r: c.r, sil: false, copied: "", guard: 0, heal: 0, pierce: 0, counter: 0, counterPct: 0, cap: null };
        lines.push(nm(s, p) + " plays " + c.n + " (" + c.pow + "/" + c.def + ")" + (s.fmt === "ffa" ? " at " + nm(s, P[p] ? pick.t : pick.t) : "") + ".");
    });
    const ids = Object.keys(P).map(Number).sort((a, b) => a - b);
    const tgt = x => P[x.t] || null;
    const eff = x => x.sil ? null : ABILITIES[x.ab] || null;
    // a. SILENCE (all at once, from the abilities as printed)
    const silenced = new Set();
    ids.forEach(p => { const x = P[p], A = ABILITIES[x.base], y = tgt(x); if (A && A.silence && y) { silenced.add(y.p); x.silencedRare = y.r >= 2; } });
    silenced.forEach(p => { P[p].sil = true; ban(p, "SILENCED"); });
    ids.forEach(p => { const x = P[p]; if (!x.sil && ABILITIES[x.base].silence && tgt(x)) { ban(p, "Silence"); lines.push(nm(s, p) + "'s " + CARDS[x.c].n + " silences " + CARDS[tgt(x).c].n + "."); } });
    // b. MIRROR
    ids.forEach(p => {
        const x = P[p], A = eff(x), y = tgt(x); if (!A || !A.copy || !y) return;
        const B = y.sil ? null : ABILITIES[y.base];
        if (B && !B.copy) { x.ab = y.base; x.copied = y.base; ban(p, "Mirror"); lines.push(CARDS[x.c].n + " copies " + CARDS[y.c].n + "'s ability."); }
        if (A.copyPow && y.pow > x.pow) { x.pow = y.pow; lines.push(CARDS[x.c].n + " takes " + CARDS[y.c].n + "'s Power (" + y.pow + ")."); }
    });
    // c. SWAP (seat order)
    ids.forEach(p => {
        const x = P[p], A = eff(x), y = tgt(x); if (!A || !y) return;
        if (A.swapPow) { [x.pow, y.pow] = [y.pow, x.pow]; ban(p, "Swap"); lines.push(CARDS[x.c].n + " swaps Power with " + CARDS[y.c].n + "."); }
        if (A.swapDef) { [x.def, y.def] = [y.def, x.def]; ban(p, "Swap"); lines.push(CARDS[x.c].n + " swaps Defense with " + CARDS[y.c].n + "."); }
        if (A.flip) { [y.pow, y.def] = [y.def, y.pow]; ban(p, "Swap"); lines.push(CARDS[x.c].n + " flips " + CARDS[y.c].n + "'s Power and Defense."); }
    });
    // d. REVEAL bonuses
    ids.forEach(p => {
        const x = P[p], A = eff(x), y = tgt(x); if (!A) return;
        const me = lifeOf(s, p), them = y ? lifeOf(s, y.p) : me, behind = me < them, note = [];
        if (A.revealPow) { x.pow += A.revealPow; note.push("+" + A.revealPow + " Power"); }
        if (A.revealDef) { x.def += A.revealDef; note.push("+" + A.revealDef + " Defense"); }
        if (A.rage && behind) { x.pow += A.rage.pow || 0; x.def += A.rage.def || 0; x.guard += A.rage.guard || 0; note.push("Rage +" + (A.rage.pow || 0)); }
        if (A.behind && behind) { const b = Math.min(A.behind.max, Math.floor((them - me) / A.behind.per)); if (b > 0) { x.pow += b; note.push("Rage +" + b); } }
        if (A.last && me <= scale(s, A.last.th)) { x.pow += A.last.pow || 0; x.def += A.last.def || 0; x.guard += A.last.guard || 0; note.push("Last Stand"); }
        if (A.combo) {
            const prev = CARDS[Number((s.prev || {})[pk(p)])];
            const hit = prev && (A.combo.by === "series" ? prev.s === x.s : A.combo.by === "arch" ? prev.a === x.a : (prev.s === x.s || prev.a === x.a));
            if (hit) { x.pow += A.combo.pow || 0; x.heal += A.combo.heal || 0; note.push("Combo +" + (A.combo.pow || 0)); }
        }
        if (A.perWin) { const w = Math.min(A.perWin.max, Number((s.wins || {})[pk(p)]) || 0); if (w) { x.pow += w * (A.perWin.pow || 0); x.def += w * (A.perWin.def || 0); note.push("Legacy +" + w); } }
        if (A.finisher && y && them <= scale(s, A.finisher.th)) { x.pow += A.finisher.pow; note.push("Finale +" + A.finisher.pow); }
        if (A.silenceBonus && x.silencedRare) { x.pow += A.silenceBonus; note.push("+" + A.silenceBonus + " Power"); }
        if (A.heal) x.heal += A.heal;
        if (A.scout && y) {
            const h = handOf(s, y.p).filter(c => c !== y.c);
            if (h.length) { const pickI = Math.floor(rngFrom((s.seed ^ (s.round * 7919) ^ p) >>> 0)() * h.length); s.scout = Object.assign({}, s.scout, { [pk(p)]: { c: h[pickI], from: y.p, r: s.round } }); note.push("Scout"); }
        }
        x.guard += A.guard || 0; x.counter = A.counter || 0; x.counterPct = A.counterPct || 0; x.cap = A.cap != null ? A.cap : null;
        x.pierce = A.pierce === "all" ? 99 : (A.pierce || 0);
        if (A.pierceVs && y && y.a === A.pierceVs.arch) x.pierce = Math.max(x.pierce, A.pierceVs.v);
        if (A.pierceRare && y && y.r >= A.pierceRare.min) x.pierce = Math.max(x.pierce, A.pierceRare.v);
        if (note.length) { ban(p, note.join(" · ")); lines.push(CARDS[x.c].n + ": " + note.join(", ") + "."); }
    });
    // e. CLASH
    const taken = {}, healed = {}, dealt = {};
    ids.forEach(p => { taken[p] = 0; healed[p] = P[p].heal; });
    const hits = [];
    ids.forEach(p => {
        const x = P[p], y = tgt(x); if (!y) return;
        const defEff = Math.max(0, y.def - x.pierce);
        let dmg = Math.max(0, x.pow - defEff), back = 0;
        if (y.guard && !y.sil) dmg = Math.max(0, dmg - y.guard);
        if (y.cap != null && dmg > y.cap) { back += dmg - y.cap; dmg = y.cap; }
        if (dmg > 0) { back += y.counter; back += Math.ceil(dmg * y.counterPct); }
        dealt[p + ">" + y.p] = dmg; taken[y.p] += dmg; taken[p] += back;
        hits.push({ f: p, t: y.p, d: dmg, b: back });
        lines.push(nm(s, p) + " deals " + dmg + " to " + nm(s, y.p) + (back ? " and takes " + back + " back" : "") + ".");
        if (x.pierce && y.def > 0) ban(p, x.pierce >= 99 ? "Pierce all" : "Pierce " + x.pierce);
        if (y.guard && dmg >= 0 && x.pow - defEff > 0) ban(y.p, "Guard " + y.guard);
        if (back) ban(y.p, y.cap != null ? "Redirect " + back : "Counter " + back);
    });
    // f. WIN / DEFEAT
    const extraDraw = {};
    ids.forEach(p => {
        const x = P[p], y = tgt(x); if (!y) return;
        const d1 = dealt[p + ">" + y.p] || 0, d2 = dealt[y.p + ">" + p] || 0;
        const won = s.fmt === "ffa" ? d1 > 0 && d1 > d2 : d1 > d2, lost = s.fmt === "ffa" ? taken[p] > d1 && taken[p] > 0 : d1 < d2;
        const A = eff(x);
        if (won) {
            s.wins = Object.assign({}, s.wins, { [pk(p)]: (Number(s.wins[pk(p)]) || 0) + 1 });
            if (A && A.healWin) { healed[p] += A.healWin; ban(p, "Heal +" + A.healWin); }
            if (A && A.drainPct && d1) { const h = Math.min(A.drainMax || 99, Math.ceil(d1 * A.drainPct)); healed[p] += h; ban(p, "Drain +" + h); }
            if (A && A.drawWin) extraDraw[p] = (extraDraw[p] || 0) + A.drawWin;
        }
        if (lost && A) {
            if (A.healDefeat) { healed[p] += A.healDefeat; ban(p, "Heal +" + A.healDefeat); }
            if (A.parting) { taken[y.p] = (taken[y.p] || 0) + A.parting; ban(p, "Last Word " + A.parting); lines.push(CARDS[x.c].n + " still deals " + A.parting + "."); }
            if (A.recoil) { taken[p] += A.recoil; lines.push(CARDS[x.c].n + " burns out: -" + A.recoil + " life."); }
        }
    });
    // g. LIFE
    const life = Object.assign({}, s.life), ko = [];
    ids.forEach(p => {
        const before = lifeOf(s, p), after = Math.min(s.max, before - (taken[p] || 0) + (healed[p] || 0));
        if (healed[p] && after > before - (taken[p] || 0)) lines.push(nm(s, p) + " heals " + (Math.min(s.max, before - (taken[p] || 0) + healed[p]) - (before - (taken[p] || 0))) + ".");
        life[pk(p)] = after;
        if (after <= 0) ko.push(p);
    });
    s.life = life;
    // h. KO
    if (ko.length) { s.out = arr(s.out).concat(ko.map(p => ({ p, r: s.round }))); ko.forEach(p => lines.push(nm(s, p) + " is knocked out!")); }
    // i. CLEANUP
    const hand = Object.assign({}, s.hand), deck = Object.assign({}, s.deck), disc = Object.assign({}, s.disc), prev = Object.assign({}, s.prev), used = Object.assign({}, s.used);
    ids.forEach(p => {
        const c = P[p].c;
        hand[pk(p)] = handOf(s, p).filter((x, i, a) => !(x === c && a.indexOf(c) === i));
        disc[pk(p)] = arr(disc[pk(p)]).concat([c]); prev[pk(p)] = c; used[pk(p)] = arr(used[pk(p)]).concat([c]);
    });
    alive({ players: s.players, out: s.out }).forEach(p => {
        const n = (BATTLE[s.fmt === "ffa" ? "ffa" : "duel"].draw) + (extraDraw[p] || 0), dk = arr(deck[pk(p)]).slice();
        hand[pk(p)] = arr(hand[pk(p)]).concat(dk.splice(0, n)); deck[pk(p)] = dk;
    });
    Object.assign(s, { hand, deck, disc, prev, used });
    s.n = (Number(s.n) || 0) + 1;
    s.last = { n: s.n, r: s.round, plays: ids.map(p => ({ p, c: P[p].c, t: P[p].t, pow: P[p].pow, def: P[p].def, sil: P[p].sil ? 1 : 0, cp: P[p].copied || "" })), hits, banners,
        dmg: Object.fromEntries(ids.map(p => [pk(p), taken[p] || 0])), heal: Object.fromEntries(ids.map(p => [pk(p), healed[p] || 0])), ko };
    s.log = arr(s.log).concat([{ r: s.round, l: lines }]).slice(-40);
    s.picks = {};
    s.round = Number(s.round) + 1;
    s.dl = now + REVEAL_MS + Number(s.pickMs || BATTLE.pickSeconds * 1000); s.ext = 0;
    endCheck(s);
    return true;
}

function endCheck(s) {
    const live = alive(s);
    const empty = live.every(p => !handOf(s, p).length && !arr(s.deck[pk(p)]).length);
    if (live.length > 1 && !empty) return;
    if (live.length > 1 && empty) {
        const top = Math.max(...live.map(p => lifeOf(s, p))), leaders = live.filter(p => lifeOf(s, p) === top);
        if (leaders.length > 1) suddenDeath(s, leaders);
    }
    finish(s);
}
/* tie on life with nothing left to play: one clash with each player's best card, no abilities */
function suddenDeath(s, leaders) {
    const best = p => arr(s.used[pk(p)]).map(Number).sort((a, b) => (CARDS[b].pow + CARDS[b].def) - (CARDS[a].pow + CARDS[a].def) || CARDS[b].pow - CARDS[a].pow || a - b)[0];
    const picks = leaders.map(p => ({ p, c: best(p) })).filter(x => x.c);
    if (picks.length < 2) return;
    const dealtBy = {};
    picks.forEach((x, i) => { const y = picks[(i + 1) % picks.length]; dealtBy[x.p] = Math.max(0, CARDS[x.c].pow - CARDS[y.c].def); });
    const top = Math.max(...Object.values(dealtBy)), win = picks.filter(x => dealtBy[x.p] === top);
    s.sd = { picks, dealt: dealtBy };
    s.log = arr(s.log).concat([{ r: "SD", l: ["Tied on life: sudden death! " + picks.map(x => nm(s, x.p) + " " + CARDS[x.c].n + " deals " + dealtBy[x.p]).join(", ") + (win.length === 1 ? ". " + nm(s, win[0].p) + " wins it." : ". Still tied: a draw.")] }]);
    if (win.length === 1) s.sdWin = win[0].p;
}
function finish(s) {
    s.phase = "over"; s.dl = null; s.picks = {};
    const live = alive(s);
    const rows = live.map(p => ({ p, life: lifeOf(s, p), k: s.sdWin === p ? 1 : 0 })).sort((a, b) => b.life - a.life || b.k - a.k || a.p - b.p);
    const places = [];
    rows.forEach((r, i) => { const prevR = rows[i - 1]; places.push({ p: r.p, life: r.life, place: i && prevR.life === r.life && prevR.k === r.k ? places[i - 1].place : i + 1 }); });
    // knocked-out players: the later, the better; the same round = tied
    const outs = arr(s.out).map(o => ({ p: Number(o.p), r: Number(o.r) })).sort((a, b) => b.r - a.r || lifeOf(s, b.p) - lifeOf(s, a.p) || a.p - b.p);
    outs.forEach((o, i) => { const prevO = outs[i - 1]; const place = i && prevO.r === o.r ? places[places.length - 1].place : places.length + 1; places.push({ p: o.p, life: lifeOf(s, o.p), place }); });
    // a 1v1 where both were knocked out together: a draw
    s.places = places;
    s.winners = places.filter(x => x.place === 1).map(x => x.p);
}

/* host duties: resolve when everyone has picked, or when time is up (one grace pause per round for a player
   who just disconnected; after that they are auto-picked every round until they come back) */
export function due(s, now, present = () => true) {
    if (!s || s.phase !== "pick") return null;
    const live = alive(s), waiting = live.filter(p => !hasPicked(s, p));
    if (!waiting.length) return "resolve";
    if (waiting.every(p => !present(p) && (s.away || {})[pk(p)])) return "resolve";
    if (now < Number(s.dl)) return null;
    const gone = waiting.filter(p => !present(p) && !(s.away || {})[pk(p)]);
    if (gone.length && Number(s.ext) !== Number(s.round)) return "grace";
    return "resolve";
}
export function applyDue(s, kind, now, present = () => true) {
    if (kind === "grace") { s.ext = s.round; s.dl = now + BATTLE.reconnectGrace * 1000; return true; }
    if (kind === "resolve") {
        alive(s).filter(p => !hasPicked(s, p) && !present(p)).forEach(p => { s.away = Object.assign({}, s.away, { [pk(p)]: 1 }); });
        return resolveRound(s, now);
    }
    return false;
}

/* ---------- headless games (balance tests, CPU practice) ---------- */
export function cpuPick(s, p, rng) {
    const h = handOf(s, p); if (!h.length) return null;
    const t = defaultTarget(s, p), tl = lifeOf(s, t), me = lifeOf(s, p);
    const score = id => {
        const c = CARDS[id], A = ABILITIES[c.ab] || {};
        let v = (A.swapPow ? 7 : c.pow) * 2 + c.def;
        if (A.rage && me < tl) v += (A.rage.pow || 0) * 2;
        if (A.last && me <= scale(s, A.last.th)) v += 3;
        if (A.finisher && tl <= scale(s, A.finisher.th)) v += 5;
        if (A.combo) { const pr = CARDS[Number((s.prev || {})[pk(p)])]; if (pr && (pr.s === c.s || pr.a === c.a)) v += (A.combo.pow || 0) * 2; }
        return v + (rng ? rng() * 4 : 0);
    };
    return { c: h.slice().sort((a, b) => score(b) - score(a) || a - b)[0], t };
}
export function playOut(s, rng, picker = cpuPick) {
    let guard = 0;
    while (s.phase === "pick" && guard++ < 40) {
        alive(s).forEach(p => { const m = picker(s, p, rng); if (m) act(s, { p, c: m.c, t: m.t }); });
        resolveRound(s, 0);
    }
    return s;
}
