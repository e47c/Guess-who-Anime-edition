/* =====================================================================
   GRAND VOYAGE · RULES ENGINE
   A pure state machine: no DOM, no Firebase. Every move is
       apply(state, player, action) -> true (state mutated) | false (rejected)
   and runs inside one Realtime Database transaction on rooms/<code>/vy, so
   whoever submits the last missing choice resolves the phase for everyone.
   Randomness comes from a seeded generator stored in the state (s.r), which
   keeps transaction retries and every client in agreement.

   Phases:  muster -> route -> (battle | event | chest | market | shrine) -> route …
            -> camp (3+ players, before the boss) -> battle (boss) -> over
   ===================================================================== */
import { START_HP, MAX_ITEMS, ROLES, ROLE_KEYS, ITEMS, LOOT, OBJECTIVES, NODE_WEIGHTS, REGIONS, ENEMIES, EVENTS, FLAVOR } from "./data.js";

const arr = x => Array.isArray(x) ? x : (x ? Object.values(x) : []);
const K = p => "p" + p;

/* ---------- seeded randomness (mulberry32) ---------- */
export function rnd(s) { s.r = (s.r + 0x6D2B79F5) | 0; let t = s.r; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const ri = (s, n) => (rnd(s) * n) | 0;
const pick = (s, a) => a[ri(s, a.length)];
function wpick(s, w) { const e = Object.entries(w), tot = e.reduce((a, x) => a + x[1], 0); let r = rnd(s) * tot; for (const [k, v] of e) { if ((r -= v) < 0) return k; } return e[0][0]; }
function shuf(s, a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = ri(s, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const fill = (t, o) => t.replace(/\{(\w+)\}/g, (m, k) => o[k] != null ? o[k] : m);

/* ---------- helpers ---------- */
export const live = s => s.seats.filter(p => !s.pl[K(p)].gone);
export const up = s => live(s).filter(p => !s.pl[K(p)].dn);
export const P = (s, p) => s.pl[K(p)];
export const nm = (s, p) => (s.names && s.names[K(p)]) || "Player " + p;
export const has = (s, p, it) => P(s, p).it.includes(it);
export const isBoss = s => s.phase === "battle" && s.enc && s.enc.k === "boss";
export const nodeAt = (s, id) => s.map.nodes[id];
export const options = s => s.map.edges.filter(e => e[0] === s.node).map(e => e[1]);
const atkBonus = (s, p) => P(s, p).it.reduce((a, k) => a + (ITEMS[k].atk || 0), 0) + (P(s, p).cls === "blade" ? 2 : 0) + (P(s, p).pow || 0);
const grdBonus = (s, p) => P(s, p).it.reduce((a, k) => a + (ITEMS[k].grd || 0), 0) + (P(s, p).cls === "shield" ? 3 : 1);
export const price = (s, p, k) => P(s, p).cls === "merchant" ? Math.ceil(ITEMS[k].p * .7) : ITEMS[k].p;
export const voteWeight = (s, p) => 1 + (P(s, p).cls === "nav" ? 1 : 0) + (has(s, p, "compass") ? 1 : 0);
export const stealExposure = (s, p) => has(s, p, "coin") ? 0 : P(s, p).cls === "rogue" ? .1 : .4;
export const navGoal = s => Math.max(2, Math.ceil(s.len * .5));

// every visible beat of a move goes into a short rolling list, so a kill followed by an automatic sail both get animated
function emit(s, e) { s.eid = (s.eid || 0) + 1; e.id = s.eid; e.n = s.n; s.fx = arr(s.fx); s.fx.push(e); if (s.fx.length > 8) s.fx.splice(0, s.fx.length - 8); s.ev = e; }
function log(s, t, c) { s.log = arr(s.log); s.log.push({ n: s.n, t, c: c || "" }); if (s.log.length > 40) s.log.splice(0, s.log.length - 40); }
function note(s, p, t) { s.notes = s.notes || {}; const l = arr(s.notes[K(p)]); l.push({ n: s.n, t }); if (l.length > 8) l.splice(0, l.length - 8); s.notes[K(p)] = l; }
function learn(s, p, q) { s.intel = s.intel || {}; const m = s.intel[K(p)] || {}; m[K(q)] = true; s.intel[K(p)] = m; }
export function knows(s, p, q) { return !!(s.intel && s.intel[K(p)] && s.intel[K(p)][K(q)]); }
function giveItem(s, p, k, why) {
    const pl = P(s, p);
    if (pl.it.length >= MAX_ITEMS) { const g = Math.max(1, Math.floor(ITEMS[k].p / 2)); pl.g += g; note(s, p, "Your satchel is full. " + ITEMS[k].n + " sold for " + g + " gold."); return false; }
    pl.it.push(k); if (why) note(s, p, why); return true;
}
function down(s, p, msgs) {
    const pl = P(s, p); if (pl.dn) return;
    pl.dn = true; pl.hp = 0; pl.downs++;
    const lost = Math.floor(pl.g / 2); pl.g -= lost;
    const m = fill(pick(s, FLAVOR.down), { p: nm(s, p) }) + (lost ? " " + lost + " gold sinks into the sea." : "");
    log(s, m, "down"); if (msgs) msgs.push(m);
}
function hurt(s, p, n, msgs) { const pl = P(s, p); if (pl.dn || n <= 0) return 0; pl.hp = Math.max(0, pl.hp - n); if (pl.hp <= 0) down(s, p, msgs); return n; }
function heal(s, p, n, revive) {
    const pl = P(s, p);
    if (pl.dn) { if (!revive) return false; pl.dn = false; pl.hp = Math.min(pl.mx, n); return true; }
    pl.hp = Math.min(pl.mx, pl.hp + n); return true;
}
function rollItem(s, tier) { return wpick(s, LOOT[tier] || LOOT.common); }

/* ---------- map generation ---------- */
function enemyFor(s, tier) {
    const keys = arr(s.ser).filter(k => ENEMIES[k]);
    const src = ENEMIES[keys.length && rnd(s) < .8 ? pick(s, keys) : "any"];
    const e = pick(s, src[tier] || ENEMIES.any[tier]);
    return { n: e[0], k: e[1] };
}
function buildMap(s) {
    const L = s.len, nodes = [{ id: 0, l: 0, x: .5, t: "start" }], layers = [[0]], edges = [];
    const usedEv = new Set();
    for (let l = 1; l <= L + 1; l++) {
        const boss = l === L + 1, count = boss ? 1 : l === 1 ? 2 : 2 + ri(s, 2), row = [];
        for (let i = 0; i < count; i++) {
            let t = boss ? "boss" : wpick(s, NODE_WEIGHTS);
            if (l === 1) t = rnd(s) < .6 ? "battle" : "event";
            if (t === "elite" && l < 3) t = "battle";
            if (l === L && i === 0) t = "shrine";
            const n = { id: nodes.length, l, x: count === 1 ? .5 : (i + 1) / (count + 1) + (rnd(s) - .5) * .06, t };
            nodes.push(n); row.push(n.id);
        }
        layers.push(row);
    }
    // guarantee one treasure and one market somewhere in the middle
    for (const need of ["chest", "market"]) {
        if (nodes.some(n => n.t === need)) continue;
        const cand = nodes.filter(n => n.l >= 2 && n.l < L && (n.t === "event" || n.t === "battle"));
        if (cand.length) pick(s, cand).t = need;
    }
    // edges: each node links to the matching node of the next layer, sometimes a neighbour too; nobody is unreachable
    for (let l = 0; l <= L; l++) {
        const A = layers[l], B = layers[l + 1], into = new Set();
        A.forEach((a, i) => {
            const j = A.length === 1 ? -1 : Math.round(i * (B.length - 1) / (A.length - 1));
            const targets = j < 0 ? B.slice() : [B[j]];
            if (j >= 0 && B.length > 1 && rnd(s) < .55) { const k = j + (rnd(s) < .5 ? -1 : 1); if (B[k] != null) targets.push(B[k]); }
            targets.forEach(b => { if (!edges.some(e => e[0] === a && e[1] === b)) { edges.push([a, b]); into.add(b); } });
        });
        B.forEach((b, j) => { if (!into.has(b)) { const i = Math.round(j * (A.length - 1) / Math.max(1, B.length - 1)); edges.push([A[i], b]); } });
    }
    // what waits on each node (the navigator can scout this)
    nodes.forEach(n => {
        if (n.t === "battle") n.e = enemyFor(s, "m");
        if (n.t === "elite") n.e = enemyFor(s, "e");
        if (n.t === "boss") n.e = enemyFor(s, "b");
        if (n.t === "event") { let ev = pick(s, EVENTS), g = 0; while (usedEv.has(ev.id) && g++ < 20) ev = pick(s, EVENTS); usedEv.add(ev.id); n.q = ev.id; }
    });
    s.map = { nodes, edges };
    s.reg = shuf(s, REGIONS).slice(0, L + 1);
}

/* ---------- create ---------- */
export function create({ seed, seats, names, len = 6, series = [], traitor = .7 }) {
    const s = { v: 1, r: (seed | 0) || 1, n: 1, phase: "muster", seats: seats.slice(), names: Object.assign({}, names), len, ser: series.slice(0, 8),
        leg: 0, node: 0, path: [0], helm: seats[0], pl: {}, ch: {}, enc: null, offers: {}, notes: {}, intel: {}, log: [], ev: null, camp: false, out: null };
    buildMap(s);
    // hidden objectives: maybe one mutineer in a 3+ crew, everyone else gets a different ambition
    const pool = shuf(s, Object.keys(OBJECTIVES).filter(k => k !== "traitor" && k !== "rival"));
    const mut = seats.length >= 3 && rnd(s) < traitor ? pick(s, seats) : 0;
    seats.forEach((p, i) => {
        let obj = p === mut ? "traitor" : pool[i % pool.length], rv = 0;
        if (obj !== "traitor" && seats.length >= 3 && rnd(s) < .14) { obj = "rival"; rv = pick(s, seats.filter(q => q !== p)); }
        s.pl[K(p)] = { cls: "", hp: START_HP, mx: START_HP, g: 3, it: ["potion"], st: 1, dn: false, gone: false, obj, rv, pow: 0, rn: 0,
            dmg: 0, grd: 0, atk: 0, hold: 0, gave: 0, gaveIt: 0, stole: 0, navw: 0, downs: 0, heal: 0, kb: false, exp: false };
        if (obj === "thief") s.pl[K(p)].st = 2;      // a would-be master thief starts with a spare set of lockpicks
    });
    log(s, "The crew gathers at the harbor. Somewhere beyond " + s.reg[s.len] + " lies the Legendary Treasure.", "story");
    emit(s, { n: s.n, k: "muster" });
    return s;
}

/* ---------- normalise after a Firebase round trip (empty arrays / objects vanish there) ---------- */
export function norm(s) {
    s.seats = arr(s.seats).map(Number); s.path = arr(s.path).map(Number); s.ser = arr(s.ser); s.reg = arr(s.reg); s.log = arr(s.log);
    s.map = s.map || { nodes: [], edges: [] }; s.map.nodes = arr(s.map.nodes); s.map.edges = arr(s.map.edges).map(e => arr(e).map(Number));
    s.fx = arr(s.fx);
    s.pl = s.pl || {}; s.ch = s.ch || {}; s.offers = s.offers || {}; s.notes = s.notes || {}; s.intel = s.intel || {}; s.names = s.names || {};
    s.seats.forEach(p => {
        const pl = s.pl[K(p)] = Object.assign({ cls: "", hp: 0, mx: START_HP, g: 0, st: 0, dn: false, gone: false, pow: 0, rn: 0, dmg: 0, grd: 0, atk: 0, hold: 0, gave: 0, gaveIt: 0, stole: 0, navw: 0, downs: 0, heal: 0, kb: false, exp: false, rv: 0 }, s.pl[K(p)] || {});
        pl.it = arr(pl.it);
        s.notes[K(p)] = arr(s.notes[K(p)]);
    });
    if (s.enc) { s.enc.part = s.enc.part || {}; s.enc.dmg = s.enc.dmg || {}; s.enc.shop = arr(s.enc.shop); s.enc.it = arr(s.enc.it); }
    return s;
}

/* ---------- who still has to choose ---------- */
export function need(s) {
    switch (s.phase) {
        case "muster": return live(s).filter(p => !P(s, p).cls);
        case "battle": return up(s).filter(p => s.ch[K(p)] == null);
        case "route": case "event": case "chest": case "market": case "shrine": case "camp": return live(s).filter(p => s.ch[K(p)] == null);
        default: return [];
    }
}
export function defaultChoice(s, p) {
    switch (s.phase) {
        case "muster": return pick(s, ROLE_KEYS);
        case "route": return options(s)[0];
        case "battle": return { a: "grd" };
        case "event": { const ev = EVENTS.find(e => e.id === s.enc.q); return ev.o.length - 1; }
        case "chest": return "share";
        case "market": return "pass";
        case "shrine": return "rest";
        case "camp": return 0;
    }
    return null;
}

/* ---------- validation of a choice ---------- */
function validChoice(s, p, v) {
    const pl = P(s, p);
    switch (s.phase) {
        case "route": return options(s).includes(Number(v));
        case "battle": {
            if (!v || !["atk", "grd", "hold"].includes(v.a)) return false;
            if (v.u && (!["bomb", "smoke"].includes(v.u) || !pl.it.includes(v.u))) return false;
            return true;
        }
        case "event": {
            const ev = EVENTS.find(e => e.id === s.enc.q), o = ev && ev.o[v]; if (!o) return false;
            if (ev.mode === "solo" && o.fx.need && pl.g < o.fx.need) return false;
            return true;
        }
        case "chest": return v === "share" || v === "grab";
        case "market": return v === "pass" || (arr(s.enc.shop).includes(v) && pl.g >= price(s, p, v) && pl.it.length < MAX_ITEMS);
        case "shrine": return v === "rest" || v === "pray";
        case "camp": return Number(v) === 0 || (live(s).includes(Number(v)) && Number(v) !== p);
    }
    return false;
}

/* =====================================================================
   APPLY AN ACTION
   ===================================================================== */
export function apply(s, p, a) {
    if (!a || s.phase === "over") return false;
    p = Number(p);
    if (a.t === "gone") return markGone(s, Number(a.p));
    if (a.t === "auto") return autoFill(s, arr(a.ps).map(Number));
    if (!s.seats.includes(p) || P(s, p).gone) return false;
    let ok = false;
    switch (a.t) {
        case "role": ok = s.phase === "muster" && !!ROLES[a.c] && !P(s, p).cls && setRole(s, p, a.c); break;
        case "choose": ok = choose(s, p, a.v); break;
        case "give": ok = give(s, p, a); break;
        case "offer": ok = offer(s, p, a); break;
        case "accept": ok = accept(s, p, a.id); break;
        case "decline": case "cancel": ok = dropOffer(s, p, a.id); break;
        case "steal": ok = steal(s, p, a); break;
        case "use": ok = useItem(s, p, a); break;
        case "heal": ok = medicHeal(s, p, a); break;
    }
    if (ok) { s.n++; settle(s); }
    return ok;
}
const freeTime = s => s.phase !== "muster" && s.phase !== "battle" && s.phase !== "over";

function setRole(s, p, c) {
    const pl = P(s, p); pl.cls = c;
    if (c === "shield") { pl.mx += 3; pl.hp += 3; }
    if (c === "merchant") pl.g += 3;
    if (c === "rogue") pl.st += 1;
    if (c === "medic") pl.heal = 1;
    return true;
}
function choose(s, p, v) {
    if (!["route", "battle", "event", "chest", "market", "shrine", "camp"].includes(s.phase)) return false;
    if (s.phase === "battle" && P(s, p).dn) return false;
    if (s.ch[K(p)] != null && s.phase !== "route" && s.phase !== "camp") return false;   // votes can change, commitments can't
    if (typeof v === "string" && /^\d+$/.test(v)) v = Number(v);
    if (!validChoice(s, p, v)) return false;
    s.ch[K(p)] = v;
    return true;
}
function markGone(s, p) {
    if (!s.seats.includes(p) || P(s, p).gone) return false;
    P(s, p).gone = true;
    delete s.ch[K(p)];
    Object.keys(s.offers).forEach(id => { const o = s.offers[id]; if (o.f === p || o.to === p) delete s.offers[id]; });
    log(s, nm(s, p) + " left the voyage.", "story");
    if (s.helm === p) s.helm = live(s)[0] || p;
    s.n++; settle(s); return true;
}
function autoFill(s, ps) {
    let any = false;
    need(s).forEach(p => {
        if (!ps.includes(p)) return;
        const v = defaultChoice(s, p);
        if (s.phase === "muster") setRole(s, p, v); else s.ch[K(p)] = v;
        any = true;
    });
    if (any) { s.n++; settle(s); }
    return any;
}

/* ---------- resolve the phase once everyone has chosen ---------- */
function settle(s) {
    let guard = 0;
    while (guard++ < 4 && s.phase !== "over" && live(s).length && !need(s).length) {
        if (!up(s).length) break;
        const ph = s.phase;
        if (ph === "muster") { s.phase = "route"; s.ch = {}; log(s, "Roles are set. Anchors up!", "story"); emit(s, { n: s.n, k: "setsail" }); }
        else if (ph === "route") resolveRoute(s);
        else if (ph === "battle") resolveRound(s);
        else if (ph === "event") resolveEvent(s);
        else if (ph === "chest") resolveChest(s);
        else if (ph === "market") resolveMarket(s);
        else if (ph === "shrine") resolveShrine(s);
        else if (ph === "camp") resolveCamp(s);
        if (s.phase === ph && ph !== "battle") break;     // nothing moved: wait for input
        if (ph === "battle") break;                        // one battle round per settle
    }
    if (s.phase !== "over" && !up(s).length && live(s).length) finish(s, true);
}

/* ---------- route ---------- */
function tally(s, ps, weightFn) {
    const c = new Map();
    ps.forEach(p => { const v = s.ch[K(p)]; if (v == null) return; c.set(v, (c.get(v) || 0) + (weightFn ? weightFn(p) : 1)); });
    let best = -1, tied = [];
    c.forEach((n, v) => { if (n > best) { best = n; tied = [v]; } else if (n === best) tied.push(v); });
    const hv = s.ch[K(s.helm)];
    const win = tied.length === 1 ? tied[0] : tied.includes(hv) ? hv : tied.slice().sort((a, b) => a - b)[0];
    return { win, counts: Object.fromEntries(c), tie: tied.length > 1 };
}
function resolveRoute(s) {
    const t = tally(s, live(s), p => voteWeight(s, p));
    live(s).forEach(p => { if (s.ch[K(p)] === t.win) P(s, p).navw++; });
    const votes = Object.assign({}, s.ch);
    moveTo(s, t.win, votes, t.tie);
}
function moveTo(s, id, votes, tie) {
    const from = s.node, n = nodeAt(s, id);
    s.node = id; s.path.push(id); s.leg = n.l;
    const L = live(s), i = L.indexOf(s.helm), helm = s.helm;
    s.helm = L[(i + 1) % L.length] || s.helm;
    L.forEach(p => { if (P(s, p).cls === "medic") P(s, p).heal = 1; });
    s.ch = {};
    const where = (s.reg[n.l - 1] || "open sea");
    log(s, fill(pick(s, FLAVOR.sail), { crew: "The crew", node: n.t === "boss" ? "the final lair" : where, helm: nm(s, helm) }) + (tie ? " (the helm broke the tie)" : ""), "sail");
    emit(s, { n: s.n, k: "sail", from, to: id, votes: votes || null });
    enter(s, n);
}
function scale(s) { return Math.max(1, up(s).length); }
function enter(s, n) {
    const leg = n.l, crew = scale(s);
    if (n.t === "battle" || n.t === "elite" || n.t === "boss") {
        const boss = n.t === "boss", elite = n.t === "elite";
        const hp = Math.round(crew * (boss ? 8 + s.len : (elite ? 1.5 : 1) * (4 + leg)));
        const atk = boss ? 2 + Math.floor(s.len / 4) : 1 + Math.floor(leg / 2) + (elite ? 2 : 0);
        const gold = boss ? 0 : (elite ? 2 : 1) * (2 + leg) * crew;
        s.enc = { k: n.t, en: { n: n.e.n, k: n.e.k, hp, mx: hp, atk, gold }, rd: 1, part: {}, dmg: {} };
        s.phase = "battle";
        log(s, (boss ? "THE FINAL BOSS: " : elite ? "Elite foe: " : "Enemy ahead: ") + n.e.n + "!", "fight");
    } else if (n.t === "event") { s.enc = { k: "event", q: n.q }; s.phase = "event"; const ev = EVENTS.find(e => e.id === n.q); log(s, ev.t + ". " + ev.x, "story"); }
    else if (n.t === "chest") { s.enc = { k: "chest", g: 3 * live(s).length + leg, it: [rollItem(s, "rare"), rollItem(s, "common")] }; s.phase = "chest"; log(s, "A treasure chest washes ashore. Share it… or grab it all?", "loot"); }
    else if (n.t === "market") {
        const shop = []; let g = 0; while (shop.length < 3 && g++ < 40) { const k = rollItem(s, "shop"); if (!shop.includes(k)) shop.push(k); }
        s.enc = { k: "market", shop }; s.phase = "market"; log(s, "A floating market. Merchants shout over each other.", "loot");
    }
    else if (n.t === "shrine") { s.enc = { k: "shrine" }; s.phase = "shrine"; log(s, "A quiet shrine glows in the mist.", "story"); }
    s.ch = {};
}
// after an encounter: next route vote, the campfire, or straight into the only path
function advance(s) {
    s.enc = null; s.ch = {};
    const opts = options(s);
    if (!opts.length) { finish(s, false); return; }
    const toBoss = nodeAt(s, opts[0]).t === "boss";
    if (toBoss && !s.camp && live(s).length >= 3) { s.phase = "camp"; log(s, "The last night before the lair. Around the campfire, eyes narrow. Is there a mutineer aboard?", "camp"); return; }
    if (opts.length === 1) { s.phase = "route"; moveTo(s, opts[0], null, false); return; }
    s.phase = "route";
}

/* ---------- battle ---------- */
function resolveRound(s) {
    const e = s.enc, en = e.en, boss = e.k === "boss", F = up(s), acts = {}, msgs = [];
    let shield = 0, total = 0;
    F.forEach(p => { const c = s.ch[K(p)]; if (c.a === "grd") shield += grdBonus(s, p); });
    const before = en.hp;
    F.forEach(p => {
        const c = s.ch[K(p)], pl = P(s, p); let d = 0;
        if (c.a === "atk") { d = 3 + atkBonus(s, p) + ri(s, 3); pl.atk++; e.part[K(p)] = 1; if (has(s, p, "mask")) hurt(s, p, 1, msgs); }
        else if (c.a === "grd") { d = 1; pl.grd++; e.part[K(p)] = 1; }
        else pl.hold++;
        if (c.u && pl.it.includes(c.u)) { pl.it.splice(pl.it.indexOf(c.u), 1); if (c.u === "bomb") d += 7; }
        total += d; pl.dmg += d; e.dmg[K(p)] = (e.dmg[K(p)] || 0) + d;
        acts[K(p)] = { a: c.a, u: c.u || null, d, hit: 0 };
    });
    en.hp = Math.max(0, en.hp - total);
    const ev = { n: s.n, k: "round", rd: e.rd, acts, total, hp0: before, hp1: en.hp, mx: en.mx, en: en.n, ek: en.k, kill: 0, down: [], flee: false, boss };
    if (en.hp <= 0) {
        let top = 0, best = -1; F.forEach(p => { if (acts[K(p)].d > best) { best = acts[K(p)].d; top = p; } });
        ev.kill = top;
        log(s, fill(pick(s, FLAVOR.win), { enemy: en.n }) + " Final blow: " + nm(s, top) + ".", "fight");
        emit(s, ev); s.ch = {};
        if (boss) { P(s, top).kb = true; finish(s, false); return; }
        loot(s, ev); advance(s); return;
    }
    // the enemy strikes back
    const base = en.atk + (boss ? Math.floor((e.rd - 1) / 2) : 0);   // the boss enrages every second round
    F.forEach(p => {
        const c = s.ch[K(p)], a = acts[K(p)]; let n;
        if (c.u === "smoke" && a.u) n = 0;
        else if (c.a === "hold") n = boss ? Math.ceil(base / 2) : 0;
        else if (c.a === "grd") n = Math.floor(Math.max(0, base - shield) / 2);
        else n = Math.max(1, base - shield);
        a.hit = hurt(s, p, n, msgs);
        if (P(s, p).dn) ev.down.push(p);
    });
    e.rd++;
    if (!boss && e.rd > 5 && up(s).length) { ev.flee = true; log(s, fill(pick(s, FLAVOR.flee), { enemy: en.n }) + " No spoils this time.", "fight"); emit(s, ev); s.ch = {}; advance(s); return; }
    emit(s, ev); s.ch = {};
    if (!up(s).length) finish(s, true);
}
function loot(s, ev) {
    const e = s.enc, en = e.en, who = up(s).filter(p => e.part[K(p)]);
    const got = {};
    if (who.length && en.gold) {
        const each = Math.floor(en.gold / who.length);
        who.forEach(p => { const b = each + (P(s, p).cls === "merchant" ? 1 : 0) + (has(s, p, "map") ? 1 : 0); P(s, p).g += b; got[K(p)] = { g: b }; });
    }
    const rank = who.slice().sort((a, b) => (e.dmg[K(b)] || 0) - (e.dmg[K(a)] || 0));
    const drops = e.k === "elite" ? [["rare", rank[0]], ["common", rank[1]]] : rnd(s) < .6 ? [["common", rank[0]]] : [];
    drops.forEach(([tier, p]) => { if (!p) return; const k = rollItem(s, tier); if (giveItem(s, p, k, "You looted a " + ITEMS[k].n + "!")) (got[K(p)] = got[K(p)] || {}).it = k; });
    const held = up(s).filter(p => !e.part[K(p)]);
    if (held.length) log(s, held.map(p => nm(s, p)).join(", ") + " hung back and got no share.", "fight");
    log(s, "Spoils: " + (who.length ? Math.floor(en.gold / who.length) + " gold each" : "nothing") + (drops.length ? " and a relic for the top fighter." : "."), "loot");
    ev.loot = got;
}

/* ---------- story event ---------- */
function applyFx(s, p, fx, msgs, chanceRoll) {
    if (!fx) return;
    const pl = P(s, p);
    if (fx.chance != null) {
        const luck = has(s, p, "coin") ? .1 : 0;
        const r = chanceRoll != null ? chanceRoll : rnd(s);
        if (r >= fx.chance + luck) { if (fx.fail) applyFx(s, p, fx.fail, msgs); return "fail"; }
    }
    if (fx.g) pl.g = Math.max(0, pl.g + fx.g);
    if (fx.mx) pl.mx += fx.mx;
    if (fx.hp > 0) heal(s, p, fx.hp, false);
    if (fx.hp < 0) hurt(s, p, -fx.hp, msgs);
    if (fx.rn) pl.rn += fx.rn;
    if (fx.pow) pl.pow += fx.pow;
    if (fx.st) pl.st += fx.st;
    if (fx.it) { const k = ITEMS[fx.it] ? fx.it : rollItem(s, fx.it); giveItem(s, p, k, "You found a " + ITEMS[k].n + "."); }
    if (fx.it2) { const k = ITEMS[fx.it2] ? fx.it2 : rollItem(s, fx.it2); giveItem(s, p, k, "You found a " + ITEMS[k].n + "."); }
    if (fx.intel) spy(s, p);
    return "ok";
}
function spy(s, p) {
    const cand = live(s).filter(q => q !== p && !knows(s, p, q));
    if (!cand.length) { note(s, p, "You already know every secret aboard."); return; }
    const q = pick(s, cand); learn(s, p, q);
    note(s, p, "Vision: " + nm(s, q) + "'s hidden objective is “" + OBJECTIVES[P(s, q).obj].n + "”.");
}
function resolveEvent(s) {
    const ev = EVENTS.find(e => e.id === s.enc.q), L = live(s), msgs = [], res = {};
    if (ev.mode === "crew") {
        const t = tally(s, L), o = ev.o[t.win], roll = rnd(s), out = [];
        L.forEach(p => { const r = applyFx(s, p, o.fx, msgs, roll); out.push(r); res[K(p)] = r; });
        const failed = out.includes("fail");
        if (o.fx.sub && !failed) {
            const who = o.fx.sub.who === "helm" ? (L.includes(s.helm) ? s.helm : L[0]) : pick(s, L);
            applyFx(s, who, o.fx.sub, msgs); res.sub = who;
        }
        log(s, ev.t + ": the crew chose “" + o.l + "”. " + (failed && o.fx.fail && o.fx.fail.msg ? o.fx.fail.msg : failed ? "It went badly." : o.msg || "") + (res.sub ? " (" + nm(s, res.sub) + ")" : ""), "story");
        emit(s, { n: s.n, k: "event", q: ev.id, mode: "crew", pick: t.win, votes: Object.assign({}, s.ch), res, fail: failed });
    } else {
        L.forEach(p => { const i = s.ch[K(p)], o = ev.o[i]; res[K(p)] = { i, r: applyFx(s, p, o.fx, msgs) }; });
        log(s, ev.t + ": " + L.map(p => nm(s, p) + " → " + ev.o[res[K(p)].i].l + (res[K(p)].r === "fail" ? " (failed)" : "")).join(" · "), "story");
        emit(s, { n: s.n, k: "event", q: ev.id, mode: "solo", res });
    }
    advance(s);
}

/* ---------- treasure chest: share or grab ---------- */
function resolveChest(s) {
    const L = live(s), c = s.enc, grab = L.filter(p => s.ch[K(p)] === "grab"), ev = { n: s.n, k: "chest", grab, g: c.g, it: c.it.slice(), res: {} };
    if (!grab.length) {
        const each = Math.floor(c.g / L.length); L.forEach(p => { P(s, p).g += each; ev.res[K(p)] = { g: each }; });
        shuf(s, L).slice(0, c.it.length).forEach((p, i) => { if (giveItem(s, p, c.it[i], "From the shared chest: " + ITEMS[c.it[i]].n + ".")) ev.res[K(p)].it = c.it[i]; });
        ev.out = "share"; log(s, "The crew shares the chest fairly: " + each + " gold each, and the relics go to lucky hands.", "loot");
    } else if (grab.length === 1) {
        const p = grab[0]; P(s, p).g += c.g; c.it.forEach(k => giveItem(s, p, k)); ev.res[K(p)] = { g: c.g, it: c.it[0] };
        ev.out = "steal"; log(s, nm(s, p) + " GRABBED THE WHOLE CHEST! " + c.g + " gold and every relic.", "steal");
    } else {
        const msgs = []; grab.forEach(p => hurt(s, p, 3, msgs));
        L.filter(p => !grab.includes(p)).forEach(p => { P(s, p).g += 1; ev.res[K(p)] = { g: 1 }; });
        ev.out = "curse"; log(s, "Greed! " + grab.map(p => nm(s, p)).join(" and ") + " fought over the chest and it exploded. They lose 3 HP each.", "steal");
    }
    emit(s, ev); advance(s);
}

/* ---------- market ---------- */
function resolveMarket(s) {
    const res = {};
    live(s).forEach(p => {
        const v = s.ch[K(p)]; if (v === "pass") return;
        const cost = price(s, p, v);
        if (P(s, p).g >= cost && P(s, p).it.length < MAX_ITEMS) { P(s, p).g -= cost; P(s, p).it.push(v); res[K(p)] = v; }
    });
    const bought = Object.keys(res);
    log(s, bought.length ? "Market: " + bought.map(k => nm(s, Number(k.slice(1))) + " bought a " + ITEMS[res[k]].n).join(", ") + "." : "Nobody bought anything.", "loot");
    emit(s, { n: s.n, k: "market", res }); advance(s);
}

/* ---------- shrine ---------- */
function resolveShrine(s) {
    const res = {};
    live(s).forEach(p => {
        const v = s.ch[K(p)], pl = P(s, p);
        if (v === "rest") { const wasDn = pl.dn; heal(s, p, 5 + (pl.cls === "medic" ? 3 : 0), true); res[K(p)] = wasDn ? "revive" : "rest"; }
        else { spy(s, p); if (!pl.dn) heal(s, p, 1, false); res[K(p)] = "pray"; }
    });
    log(s, "At the shrine: " + live(s).map(p => nm(s, p) + (res[K(p)] === "pray" ? " prayed" : res[K(p)] === "revive" ? " was revived" : " rested")).join(", ") + ".", "story");
    emit(s, { n: s.n, k: "shrine", res }); advance(s);
}

/* ---------- campfire accusation ---------- */
function resolveCamp(s) {
    const L = live(s), counts = {}, votes = Object.assign({}, s.ch);
    L.forEach(p => { const v = Number(s.ch[K(p)]); if (v) counts[v] = (counts[v] || 0) + 1; });
    const need = Math.floor(L.length / 2) + 1;
    const top = Object.keys(counts).map(Number).find(q => counts[q] >= need) || 0;
    const ev = { n: s.n, k: "camp", votes, counts, top, guilty: false };
    if (top) {
        const accusers = L.filter(p => Number(s.ch[K(p)]) === top);
        if (P(s, top).obj === "traitor") {
            P(s, top).exp = true; accusers.forEach(p => { P(s, p).rn += 3; P(s, p).unm = true; }); ev.guilty = true;
            log(s, "The crew unmasks " + nm(s, top) + " as the MUTINEER! Their plot is ruined. Accusers +3 renown.", "camp");
        } else {
            P(s, top).rn += 2; accusers.forEach(p => { P(s, p).rn -= 2; });
            log(s, nm(s, top) + " was accused, but they're loyal. Accusers lose 2 renown, " + nm(s, top) + " gains 2.", "camp");
        }
    } else log(s, "The crew couldn't agree on anyone. Suspicion lingers in the smoke.", "camp");
    s.camp = true; emit(s, ev); s.ch = {};
    const opts = options(s); s.phase = "route"; moveTo(s, opts[0], null, false);
    }

/* ---------- free actions (any calm moment between fights) ---------- */
function give(s, p, a) {
    if (!freeTime(s)) return false;
    const to = Number(a.to), g = Math.max(0, a.g | 0), it = a.it || null;
    if (to === p || !live(s).includes(to) || (!g && !it)) return false;
    const pl = P(s, p), tl = P(s, to);
    if (g > pl.g) return false;
    if (it && (!pl.it.includes(it) || tl.it.length >= MAX_ITEMS)) return false;
    pl.g -= g; tl.g += g; pl.gave += g;
    if (it) { pl.it.splice(pl.it.indexOf(it), 1); tl.it.push(it); pl.gaveIt++; }
    const what = [g ? g + " gold" : "", it ? "a " + ITEMS[it].n : ""].filter(Boolean).join(" and ");
    log(s, nm(s, p) + " gave " + nm(s, to) + " " + what + ".", "trade");
    note(s, to, nm(s, p) + " gave you " + what + ".");
    emit(s, { n: s.n, k: "give", f: p, to, g, it });
    return true;
}
function offer(s, p, a) {
    if (!freeTime(s)) return false;
    const to = Number(a.to), o = { f: p, to, gg: Math.max(0, a.gg | 0), gi: a.gi || "", wg: Math.max(0, a.wg | 0), wi: a.wi || "" };
    if (to === p || !live(s).includes(to) || (!o.gg && !o.gi) || (!o.wg && !o.wi)) return false;
    if (o.gg > P(s, p).g || (o.gi && !has(s, p, o.gi)) || (o.wi && !has(s, to, o.wi))) return false;
    if (Object.values(s.offers).filter(x => x.f === p).length >= 3) return false;
    s.offers["o" + s.n] = o;
    note(s, to, nm(s, p) + " offers you a trade.");
    log(s, nm(s, p) + " offers " + nm(s, to) + " a trade.", "trade");
    return true;
}
function accept(s, p, id) {
    const o = s.offers[id]; if (!o || o.to !== p || !freeTime(s)) return false;
    const A = P(s, o.f), B = P(s, p);
    const okA = A.g >= o.gg && (!o.gi || A.it.includes(o.gi)), okB = B.g >= o.wg && (!o.wi || B.it.includes(o.wi));
    const roomA = A.it.length - (o.gi ? 1 : 0) + (o.wi ? 1 : 0) <= MAX_ITEMS, roomB = B.it.length - (o.wi ? 1 : 0) + (o.gi ? 1 : 0) <= MAX_ITEMS;
    delete s.offers[id];
    if (!okA || !okB || !roomA || !roomB) { note(s, p, "That trade can't happen any more."); note(s, o.f, "Your trade with " + nm(s, p) + " fell through."); return true; }
    A.g += o.wg - o.gg; B.g += o.gg - o.wg;
    if (o.gi) { A.it.splice(A.it.indexOf(o.gi), 1); B.it.push(o.gi); }
    if (o.wi) { B.it.splice(B.it.indexOf(o.wi), 1); A.it.push(o.wi); }
    log(s, nm(s, o.f) + " and " + nm(s, p) + " shook hands on a trade.", "trade");
    note(s, o.f, nm(s, p) + " accepted your trade.");
    emit(s, { n: s.n, k: "trade", f: o.f, to: p });
    return true;
}
function dropOffer(s, p, id) {
    const o = s.offers[id]; if (!o || (o.to !== p && o.f !== p)) return false;
    delete s.offers[id];
    if (o.to === p) note(s, o.f, nm(s, p) + " declined your trade.");
    return true;
}
function steal(s, p, a) {
    if (!freeTime(s)) return false;
    const to = Number(a.to), pl = P(s, p);
    if (to === p || !live(s).includes(to) || pl.st <= 0 || pl.dn) return false;
    const tl = P(s, to);
    if (!tl.g && !tl.it.length) return false;
    pl.st--;
    if (has(s, to, "lockbox")) { note(s, p, nm(s, to) + "'s Iron Lockbox stopped you. The attempt is wasted."); note(s, to, "Someone tried to rob you, but your lockbox held."); log(s, "Someone tried to pick a lock in the night… and failed.", "steal"); emit(s, { n: s.n, k: "steal", to, fail: true }); return true; }
    let what = "";
    if (a.w === "it" && tl.it.length) { const k = tl.it.splice(ri(s, tl.it.length), 1)[0]; if (pl.it.length < MAX_ITEMS) pl.it.push(k); else pl.g += Math.floor(ITEMS[k].p / 2); what = "a " + ITEMS[k].n; }
    else if (tl.g > 0) { const g = Math.min(3, tl.g); tl.g -= g; pl.g += g; what = g + " gold"; }
    if (!what) { const k = tl.it.splice(ri(s, tl.it.length), 1)[0]; if (pl.it.length < MAX_ITEMS) pl.it.push(k); else pl.g += Math.floor(ITEMS[k].p / 2); what = "a " + ITEMS[k].n; }
    pl.stole++;
    const exp = rnd(s) < stealExposure(s, p);
    note(s, p, "You stole " + what + " from " + nm(s, to) + (exp ? ". But you were SEEN!" : ". Nobody saw."));
    note(s, to, (exp ? nm(s, p) : "Someone") + " stole " + what + " from you!");
    log(s, exp ? nm(s, p) + " was caught stealing " + what + " from " + nm(s, to) + "!" : "A shadow moves across the deck… " + nm(s, to) + " is missing " + what + ".", "steal");
    emit(s, { n: s.n, k: "steal", to, exp, by: exp ? p : 0 });
    return true;
}
function useItem(s, p, a) {
    const k = a.it, pl = P(s, p), to = a.to != null ? Number(a.to) : p;
    if (!ITEMS[k] || ITEMS[k].c !== "map" || !pl.it.includes(k) || !freeTime(s) || pl.dn) return false;
    if (!live(s).includes(to)) return false;
    if (k === "potion") { const t = P(s, to); if (!t.dn && t.hp >= t.mx) return false; const rv = t.dn; heal(s, to, 6, true); log(s, nm(s, p) + (rv ? " revived " + nm(s, to) + " with a Healing Bean!" : " used a Healing Bean" + (to === p ? "." : " on " + nm(s, to) + ".")), "heal"); emit(s, { n: s.n, k: "heal", f: p, to, rv }); }
    else if (k === "spyglass") { if (to === p || knows(s, p, to)) return false; learn(s, p, to); note(s, p, "Through the spyglass: " + nm(s, to) + "'s objective is “" + OBJECTIVES[P(s, to).obj].n + "”."); }
    else if (k === "elixir") { pl.mx += 3; pl.hp = pl.mx; log(s, nm(s, p) + " drank an Elixir of Life.", "heal"); emit(s, { n: s.n, k: "heal", f: p, to: p }); }
    pl.it.splice(pl.it.indexOf(k), 1);
    return true;
}
function medicHeal(s, p, a) {
    const pl = P(s, p), to = Number(a.to);
    if (pl.cls !== "medic" || pl.heal <= 0 || pl.dn || !freeTime(s) || to === p || !live(s).includes(to)) return false;
    const t = P(s, to); if (!t.dn && t.hp >= t.mx) return false;
    const rv = t.dn; heal(s, to, 4, true); pl.heal--;
    log(s, nm(s, p) + (rv ? " revived " : " patched up ") + nm(s, to) + ".", "heal");
    emit(s, { n: s.n, k: "heal", f: p, to, rv });
    return true;
}

/* =====================================================================
   THE END: renown, hidden objectives and the Legendary Treasure
   ===================================================================== */
export function baseRenown(s, p, fail) {
    const pl = P(s, p);
    return Math.floor(pl.g / 2) + pl.it.reduce((a, k) => a + ITEMS[k].v, 0) + pl.rn + (fail ? 0 : pl.dn ? 1 : 4) + (pl.kb ? 3 : 0);
}
export function objectiveDone(s, p, fail) {
    const pl = P(s, p), L = live(s);
    switch (pl.obj) {
        case "hoard": return pl.g >= 14;
        case "collector": return pl.it.length >= 4;
        case "slayer": return pl.kb;
        case "vanguard": return pl.dmg > 0 && L.every(q => q === p || P(s, q).dmg < pl.dmg);
        case "guardian": return pl.grd >= 5;
        case "pacifist": return pl.atk === 0 && pl.grd > 0;
        case "thief": return pl.stole >= 2;
        case "pathfinder": return pl.navw >= navGoal(s);
        case "heart": return pl.gave >= 6 || pl.gaveIt >= 2;
        case "survivor": return pl.downs === 0 && pl.hp * 2 >= pl.mx;
        case "rival": return !!pl.rv && s.seats.includes(pl.rv) && baseRenown(s, p, fail) > baseRenown(s, pl.rv, fail);
        case "traitor": { if (pl.exp) return false; if (fail) return true; const others = L.filter(q => q !== p); return others.filter(q => P(s, q).dn).length * 2 >= others.length && others.length > 0; }
    }
    return false;
}
function finish(s, fail) {
    const rows = {};
    s.seats.forEach(p => {
        const base = baseRenown(s, p, fail), done = objectiveDone(s, p, fail), obj = P(s, p).obj;
        rows[K(p)] = { base, done, obj, total: base + (done ? OBJECTIVES[obj].g : 0) };
    });
    const ranked = live(s).slice().sort((a, b) => rows[K(b)].total - rows[K(a)].total || P(s, b).g - P(s, a).g || a - b);
    s.out = { fail, rows, rank: ranked, win: ranked[0] || 0 };
    s.phase = "over"; s.ch = {}; s.enc = null;
    log(s, fail ? "SHIPWRECK. The crew is lost at sea and the treasure stays buried." : "The boss falls! The Legendary Treasure is claimed by the crew's greatest legend: " + nm(s, s.out.win) + ".", fail ? "down" : "loot");
    emit(s, { n: s.n, k: "over", fail });
}
