/* =====================================================================
   ANIME TCG · THE DUEL ENGINE (pure: no DOM, no Firebase; unit-tested in tools/duel-test.mjs)
   The host runs it; clients only send intents (act). Shuffles and coin tosses use the duel's own seeded generator,
   so a duel can be replayed from its seed and its intents. viewFor(s, p) is what player p (or a spectator, p = 0)
   may see: the other hands, the face-down cards and every deck order are redacted.

   RULES (numbers in DUEL.rules, js/vault/config.js)
   - Life 8000 (free-for-all 6000). Deck 20, opening hand 5, draw 1 a turn; the first player skips the draw on turn 1.
     Lose at 0 life, or when you must draw from an empty deck.
   - Field per player: 3 Character Zones, 3 Action Zones, a Deck and a Graveyard (both public as counts / cards).
   - Phases: Draw (automatic), Main, Battle, End.
   - Main: ONE Normal Summon per turn from the hand into a free Character Zone, in Attack or Defense position.
     Legendary / Mythic need 1 tribute (sacrifice your own character). Any number of Support cards (immediate effect).
     Set Counter cards face-down in Action Zones. Switch a character's position once per turn if it did not attack and
     was not summoned this turn. A character's "Once per turn" ability can be used in Main.
   - Battle: each Attack-position character may attack once (also the turn it was summoned); the first player cannot
     attack on turn 1. Target an opposing character, or the player directly if they have none.
       vs Attack:  ATK > ATK: target destroyed, its owner loses the difference. Equal: both destroyed, no damage.
                   Lower: the attacker is destroyed, its owner loses the difference.
       vs Defense: ATK > DEF: target destroyed, no damage (Pierce: the difference is dealt). Equal: nothing.
                   ATK < DEF: the attacker's owner loses the difference.
       Direct: the full ATK.
   - End: "until end of turn" effects stop. The Final Clash: at the end of round `stalemate.round` (FFA: `stalemateFfa`)
     and of every round after, every player loses `loss` life, plus `grow` more each round (knock-outs at once share a place).
   - Timer: when a turn's time runs out the turn ends (no forced attacks). Counters: when a player summons, plays a
     Support or declares an attack, the player it is aimed at (1v1: the opponent; free-for-all: the attacked player,
     or for summons / Supports the next player in turn order) gets ONE response window (DUEL.rules.responseSec) if they
     have a face-down Counter: they may activate one whose trigger matches, or pass. Counters cannot respond to Counters.
   - RESOLUTION ORDER: 1. the action is declared (a summoned card is on the field, a Support is revealed, an attack is
     declared); 2. the response window: a Counter resolves first and may negate the action; 3. the action's own
     abilities (On summon / the Support's effect / On attack, then When attacked); 4. battle damage; 5. destroyed
     characters go to the Graveyard and their When destroyed abilities resolve (the defender's first); 6. life check
     (several players at 0 at once share their place).
   ===================================================================== */
export const arr = v => Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];
const pk = p => "p" + p;
const clone = o => JSON.parse(JSON.stringify(o));

/* ---------- the seeded generator (mulberry32), its state kept in the duel ---------- */
function rand(s) { let t = (s.rng = (s.rng + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
function shuffle(s, a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand(s) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------- definitions: provided by js/duel/cards.js (or a test) ----------
   D.card(id) -> { id, name, s (series), a (archetype), r (rarity 0-6), atk, def (shown values), ab: ability | null }
   D.action(id) -> { id, name, type: "support" | "counter", trig (counter: "summon" | "support" | "attack"), ops, text }
   ability = { t: "summon" | "attack" | "attacked" | "destroyed" | "cont" | "opt", ops: [...], cond?, kw: [...], text }
   continuous fields (t: "cont"): pierce, guard (+DEF in Defense position), rage { atk, def } (while behind),
   last { th, atk, def } (life at or below th), aura { atk, def } (your other characters) */
let D = null;
export function useDefs(defs) { D = defs; }
const defOf = (s, u) => { const c = s.cards[u]; if (!c) return null; return String(c.id).startsWith("a:") ? D.action(String(c.id).slice(2)) : D.card(Number(c.id)); };
const isAct = (s, u) => !!s.cards[u] && String(s.cards[u].id).startsWith("a:");
export const cardOf = (s, u) => s.cards[u] || null;

/* ---------- a new duel ---------- */
export function newDuel({ id = "d", fmt = "duel", seed = 1, players, decks, names = {}, now = 0, rules }) {
    const R = rules; const ps = players.map(Number);
    const s = { v: 2, id, fmt: ps.length > 2 ? "ffa" : fmt, seed, rng: seed >>> 0, R: clone(R), players: ps, names, cards: {}, P: {}, turnNo: 0, round: 0, phase: "draw",
        turnP: 0, first: 0, out: [], place: {}, pending: null, ev: [], evn: 0, log: [], t0: now, dl: 0, over: false, stats: {} };
    let n = 0;
    ps.forEach(p => {
        const deck = arr(decks[pk(p)] || decks[p]).map(String).map(id => { const u = "u" + (++n); s.cards[u] = { id: /^a:/.test(id) ? id : Number(id), o: p }; return u; });
        s.P[pk(p)] = { life: ps.length > 2 ? R.lifeFfa : R.life, deck: shuffle(s, deck), hand: [], gy: [], ch: Array(R.zones).fill(null), ac: Array(R.actionZones).fill(null), summoned: 0 };
        s.stats[pk(p)] = { cards: 0, dmg: 0, big: 0, summons: 0 };
    });
    // the coin toss (seeded): who goes first
    const first = ps[Math.floor(rand(s) * ps.length)];
    const order = ps.slice(ps.indexOf(first)).concat(ps.slice(0, ps.indexOf(first)));
    s.order = order; s.first = first;
    ev(s, { k: "toss", first }); log(s, nm(s, first) + " won the coin toss and goes first.");
    order.forEach(p => { for (let i = 0; i < R.hand; i++) drawOne(s, p, true); });
    startTurn(s, first, now);
    return s;
}
const nm = (s, p) => (s.names || {})[pk(p)] || "Player " + p;
function ev(s, e) { s.evn = (s.evn || 0) + 1; s.ev = arr(s.ev).concat([Object.assign({ n: s.evn }, e)]).slice(-s.R.maxEvents); }
function log(s, msg) { s.log = arr(s.log).concat([msg]).slice(-s.R.maxLog); }
export const alive = s => arr(s.order || s.players).map(Number).filter(p => !arr(s.out).includes(p));
export const P = (s, p) => s.P[pk(p)];
export const opponents = (s, p) => alive(s).filter(q => q !== p);
export const lifeOf = (s, p) => Number((P(s, p) || {}).life) || 0;

/* ---------- drawing ---------- */
function drawOne(s, p, quiet) {
    const pl = P(s, p), deck = arr(pl.deck);
    if (!deck.length) return false;
    const u = deck[0]; pl.deck = deck.slice(1); pl.hand = arr(pl.hand).concat(u);
    if (!quiet) ev(s, { k: "draw", p, u });
    return true;
}

/* ---------- turns ---------- */
function startTurn(s, p, now) {
    s.turnNo += 1; s.turnP = p; s.pending = null;
    if (p === s.first || (!alive(s).includes(s.first) && p === alive(s)[0])) s.round += 1;
    const pl = P(s, p); pl.summoned = 0;
    arr(pl.ch).forEach(c => { if (c) { c.atk1 = 0; c.sw = 0; c.opt = 0; } });
    s.played = []; s.phase = "draw";
    ev(s, { k: "turn", p, turnNo: s.turnNo, round: s.round });
    log(s, "Turn " + s.turnNo + ": " + nm(s, p) + ".");
    const skip = s.turnNo === 1;
    if (!skip) {
        if (!drawOne(s, p)) { log(s, nm(s, p) + " had to draw from an empty deck."); eliminate(s, [p], now, "deck"); return; }      // (eliminate passes the turn on)
        log(s, nm(s, p) + " drew a card.");
    }
    s.phase = "main"; s.dl = now + s.R.turnSec * 1000;
    ev(s, { k: "phase", phase: "main", p });
}
function endTurn(s, now, why) {
    if (s.over) return;
    const p = s.turnP;
    s.phase = "end"; ev(s, { k: "phase", phase: "end", p });
    if (why) log(s, why);
    // "until end of turn" effects stop
    Object.values(s.P).forEach(pl => arr(pl.ch).forEach(c => { if (c) { c.buffs = arr(c.buffs).filter(b => b.dur !== "turn"); c.sil = 0; } }));
    const SG = (s.fmt === "ffa" && s.R.stalemateFfa) || s.R.stalemate || {};
    if (s.round >= SG.round && closesRound(s)) {
        // the Final Clash: at the end of round `round` and every round after, everyone loses life, more each round
        const n = (SG.loss || 0) + (SG.grow || 0) * (s.round - SG.round);
        log(s, "Final Clash: everyone loses " + n + " life.");
        alive(s).forEach(q => loseLife(s, q, n, "stalemate"));
        lifeCheck(s, now); if (s.over || Number(s.turnP) !== p || s.phase !== "end") return;      // the turn player went out: the turn already passed
    }
    nextTurn(s, now);
}
/* true when the turn ending now is the last one of the round (the next turn starts a new round) */
function closesRound(s) {
    const al = alive(s), order = arr(s.order).map(Number), i = order.indexOf(Number(s.turnP));
    for (let k = 1; k <= order.length; k++) { const q = order[(i + k) % order.length]; if (al.includes(q)) return q === s.first || (!al.includes(s.first) && q === al[0]); }
    return false;
}
function nextTurn(s, now) {
    if (s.over) return;
    const al = alive(s), order = arr(s.order).map(Number);
    let i = order.indexOf(s.turnP);
    for (let k = 1; k <= order.length; k++) { const q = order[(i + k) % order.length]; if (al.includes(q)) { startTurn(s, q, now); return; } }
}

/* ---------- stats: base + buffs + continuous effects (silence switches abilities off) ---------- */
export function statOf(s, p, slot) {
    const c = arr(P(s, p).ch)[slot]; if (!c) return null;
    const d = defOf(s, c.u), ab = abil(s, c);
    let atk = d.atk, def = d.def;
    arr(c.buffs).forEach(b => { atk += b.atk || 0; def += b.def || 0; });
    if (c.swp) [atk, def] = [def, atk];
    if (ab) {      // continuous traits can sit on any ability (a Pierce that also has an On attack effect, ...)
        if (ab.guard && c.pos === "def") def += ab.guard;
        if (ab.rage && behind(s, p)) { atk += ab.rage.atk || 0; def += ab.rage.def || 0; }
        if (ab.last && lifeOf(s, p) <= ab.last.th) { atk += ab.last.atk || 0; def += ab.last.def || 0; }
    }
    // auras from your other characters
    arr(P(s, p).ch).forEach((o, i) => { if (!o || i === slot) return; const a2 = abil(s, o); if (a2 && a2.aura) { atk += a2.aura.atk || 0; def += a2.aura.def || 0; } });
    return { atk: Math.max(0, atk), def: Math.max(0, def) };
}
const abil = (s, c) => { if (!c || c.sil) return null; if (c.copy) return c.copy; const d = defOf(s, c.u); return d && d.ab || null; };
const behind = (s, p) => opponents(s, p).some(q => lifeOf(s, q) > lifeOf(s, p));
const hasCont = (s, c, k) => { const a = abil(s, c); return !!(a && a[k]); };
export const pierces = (s, p, slot) => hasCont(s, arr(P(s, p).ch)[slot], "pierce");

/* ---------- legality: every intent is checked here (the UI shows the reason when it is not allowed) ----------
   intents: { k: "summon", u, slot, pos, trib: [slots] } · { k: "set", u, slot } · { k: "support", u } ·
   { k: "position", slot } · { k: "ability", slot } · { k: "phase", to: "battle" | "end" } ·
   { k: "attack", slot, tp, tslot (or direct: true) } · { k: "respond", u } · { k: "pass" } · { k: "concede" } */
export function why(s, p, a) {
    if (s.over) return "The duel is over.";
    p = Number(p);
    if (a.k === "concede") return alive(s).includes(p) ? null : "You are out.";
    if (s.pending) {
        if (a.k !== "respond" && a.k !== "pass") return "Waiting for " + nm(s, s.pending.who) + " to respond.";
        if (Number(s.pending.who) !== p) return "It's not your window.";
        if (a.k === "pass") return null;
        const z = arr(P(s, p).ac).findIndex(x => x && x.u === a.u); if (z < 0) return "That card isn't set.";
        const d = defOf(s, a.u); if (!d || d.type !== "counter") return "Only Counter cards can respond.";
        if (d.trig !== s.pending.trig) return "This Counter answers " + trigWord(d.trig) + ", not " + trigWord(s.pending.trig) + ".";
        if (Number(P(s, p).ac[z].turn) === s.turnNo && Number(s.turnP) === p) return "A Counter can't be used the turn it was set.";
        return null;
    }
    if (Number(s.turnP) !== p) return "It's " + nm(s, s.turnP) + "'s turn.";
    const pl = P(s, p);
    const inHand = u => arr(pl.hand).includes(u);
    switch (a.k) {
        case "summon": {
            if (s.phase !== "main") return "Summon in your Main phase.";
            if (!inHand(a.u) || isAct(s, a.u)) return "That character isn't in your hand.";
            if (pl.summoned) return "Already summoned this turn (one Normal Summon per turn).";
            const need = tributesFor(s, a.u), trib = arr(a.trib).map(Number);
            const mine = arr(pl.ch).map((c, i) => c ? i : -1).filter(i => i >= 0);
            if (need > 0) {
                if (mine.length < need) return "Needs " + need + " tribute" + (need > 1 ? "s" : "") + ": you need " + need + " character" + (need > 1 ? "s" : "") + " on your field.";
                if (trib.length !== need || !trib.every(i => mine.includes(i)) || new Set(trib).size !== trib.length) return "Pick " + need + " of your characters to tribute.";
            } else if (trib.length) return "This character needs no tribute.";
            const free = arr(pl.ch).map((c, i) => (!c || trib.includes(i)) ? i : -1).filter(i => i >= 0);
            if (!free.length) return "Your Character Zones are full.";
            if (a.slot != null && !free.includes(Number(a.slot))) return "That zone isn't free.";
            if (a.pos && !["atk", "def"].includes(a.pos)) return "Attack or Defense?";
            return null;
        }
        case "set": {
            if (s.phase !== "main") return "Set cards in your Main phase.";
            if (!inHand(a.u)) return "That card isn't in your hand.";
            const d = defOf(s, a.u); if (!d || d.type !== "counter") return "Only Counter cards are set face-down.";
            if (!arr(pl.ac).some(x => !x)) return "Your Action Zones are full.";
            return null;
        }
        case "support": {
            if (s.phase !== "main") return "Play Support cards in your Main phase.";
            if (!inHand(a.u)) return "That card isn't in your hand.";
            const d = defOf(s, a.u); if (!d || d.type !== "support") return "That's not a Support card.";
            if (d.need === "oppChar" && !opponents(s, p).some(q => arr(P(s, q).ch).some(Boolean))) return "Needs an opposing character on the field.";
            if (d.need === "myChar" && !arr(pl.ch).some(Boolean)) return "Needs one of your characters on the field.";
            return null;
        }
        case "position": {
            if (s.phase !== "main") return "Switch positions in your Main phase.";
            const c = arr(pl.ch)[a.slot]; if (!c) return "No character there.";
            if (c.st === s.turnNo) return "It was summoned this turn.";
            if (c.atk1) return "It already attacked this turn.";
            if (c.sw) return "Already switched this turn.";
            return null;
        }
        case "ability": {
            if (s.phase !== "main") return "Use abilities in your Main phase.";
            const c = arr(pl.ch)[a.slot]; if (!c) return "No character there.";
            const ab = abil(s, c); if (!ab || ab.t !== "opt") return c.sil ? "Its ability is silenced this turn." : "It has no ability to activate.";
            if (c.opt) return "Already used this turn (once per turn).";
            return null;
        }
        case "phase": {
            if (a.to === "battle") { if (s.phase !== "main") return "You're already past Main."; if (s.turnNo === 1) return "The first player can't attack on turn 1."; return null; }
            if (a.to === "end") return null;
            return "Unknown phase.";
        }
        case "attack": {
            if (s.phase !== "battle") return "Attack in your Battle phase.";
            const c = arr(pl.ch)[a.slot]; if (!c) return "No character there.";
            if (c.pos !== "atk") return "Defense-position characters can't attack.";
            if (c.atk1) return "It already attacked this turn.";
            const tp = Number(a.tp); if (!opponents(s, p).includes(tp)) return "Pick an opponent.";
            const theirs = arr(P(s, tp).ch);
            if (a.direct) return theirs.some(Boolean) ? nm(s, tp) + " still has characters: attack one of them." : null;
            if (!theirs[a.tslot]) return "No character there.";
            return null;
        }
        default: return "Unknown move.";
    }
}
const trigWord = t => ({ summon: "a summon", support: "a Support card", attack: "an attack" }[t] || t);
export const tributesFor = (s, u) => { const d = defOf(s, u); if (!d || isAct(s, u)) return 0; return d.r === 6 ? (s.R.tribute.mythic || 0) : d.r === 5 ? (s.R.tribute.legendary || 0) : 0; };

/* ---------- apply an intent: returns null (done) or the reason it was refused ---------- */
export function act(s, a, now = 0) {
    const p = Number(a.by), err = why(s, p, a); if (err) return err;
    const pl = P(s, p);
    switch (a.k) {
        case "concede": log(s, nm(s, p) + " conceded."); eliminate(s, [p], now, "concede"); if (!s.over && Number(s.turnP) === p) nextTurn(s, now); return null;
        case "pass": { const pe = s.pending; s.pending = null; ev(s, { k: "pass", p }); continueAfter(s, pe, now); return null; }
        case "respond": {
            const pe = s.pending, z = arr(pl.ac).findIndex(x => x && x.u === a.u), d = defOf(s, a.u);
            pl.ac[z] = null; pl.gy = arr(pl.gy).concat(a.u); s.pending = null;
            ev(s, { k: "counter", p, u: a.u, id: s.cards[a.u].id }); log(s, nm(s, p) + " activated the Counter " + d.name + ".");
            stat(s, p, "cards");
            const res = runOps(s, p, d.ops, { trig: pe, self: null }, now);
            if (res && res.negate) { pe.negated = true; log(s, "The " + trigWord(pe.trig).replace(/^an? /, "") + " is negated."); }
            continueAfter(s, pe, now); return null;
        }
        case "summon": {
            const trib = arr(a.trib).map(Number);
            trib.forEach(i => { const c = pl.ch[i]; ev(s, { k: "tribute", p, slot: i, u: c.u }); log(s, nm(s, p) + " tributed " + defOf(s, c.u).name + "."); toGy(s, p, i, now, true); });
            const free = arr(pl.ch).map((c, i) => c ? -1 : i).filter(i => i >= 0), slot = a.slot != null && free.includes(Number(a.slot)) ? Number(a.slot) : free[0];
            pl.hand = arr(pl.hand).filter(x => x !== a.u); pl.summoned = 1;
            const pos = a.pos === "def" ? "def" : "atk";
            pl.ch[slot] = { u: a.u, pos, st: s.turnNo, buffs: [], atk1: 0, sw: 0, opt: 0, sil: 0 };
            const d = defOf(s, a.u); s.played = arr(s.played).concat(a.u);
            ev(s, { k: "summon", p, slot, u: a.u, id: s.cards[a.u].id, pos, r: d.r }); log(s, nm(s, p) + " summoned " + d.name + " in " + (pos === "atk" ? "Attack" : "Defense") + " position.");
            stat(s, p, "cards"); stat(s, p, "summons");
            openWindow(s, { trig: "summon", by: p, slot, u: a.u }, now);
            return null;
        }
        case "set": {
            const z = arr(pl.ac).findIndex(x => !x); pl.hand = arr(pl.hand).filter(x => x !== a.u); pl.ac[z] = { u: a.u, turn: s.turnNo };
            ev(s, { k: "set", p, slot: z }); log(s, nm(s, p) + " set a card face-down."); stat(s, p, "cards");
            return null;
        }
        case "support": {
            const d = defOf(s, a.u); pl.hand = arr(pl.hand).filter(x => x !== a.u); s.played = arr(s.played).concat(a.u);
            ev(s, { k: "support", p, u: a.u, id: s.cards[a.u].id }); log(s, nm(s, p) + " played the Support " + d.name + "."); stat(s, p, "cards");
            openWindow(s, { trig: "support", by: p, u: a.u }, now);
            return null;
        }
        case "position": {
            const c = pl.ch[a.slot]; c.pos = c.pos === "atk" ? "def" : "atk"; c.sw = 1;
            ev(s, { k: "position", p, slot: a.slot, pos: c.pos }); log(s, nm(s, p) + " switched " + defOf(s, c.u).name + " to " + (c.pos === "atk" ? "Attack" : "Defense") + " position.");
            return null;
        }
        case "ability": {
            const c = pl.ch[a.slot], ab = abil(s, c); c.opt = 1;
            ev(s, { k: "ability", p, slot: a.slot, u: c.u, id: s.cards[c.u].id }); log(s, defOf(s, c.u).name + " used its ability.");
            runOps(s, p, ab.ops, { self: a.slot }, now); lifeCheck(s, now);
            return null;
        }
        case "phase": {
            if (a.to === "battle") { s.phase = "battle"; ev(s, { k: "phase", phase: "battle", p }); log(s, nm(s, p) + " entered the Battle phase."); return null; }
            endTurn(s, now); return null;
        }
        case "attack": {
            const c = pl.ch[a.slot]; c.atk1 = 1;
            const tgt = a.direct ? { tp: Number(a.tp), direct: true } : { tp: Number(a.tp), tslot: Number(a.tslot) };
            ev(s, Object.assign({ k: "attack", p, slot: a.slot, u: c.u }, tgt));
            log(s, defOf(s, c.u).name + " attacks " + (tgt.direct ? nm(s, tgt.tp) + " directly" : defOf(s, P(s, tgt.tp).ch[tgt.tslot].u).name) + ".");
            openWindow(s, Object.assign({ trig: "attack", by: p, slot: a.slot, u: c.u }, tgt), now);
            return null;
        }
    }
    return "Unknown move.";
}
/* a response window for the player an action is aimed at, if they have a face-down Counter */
function responder(s, pe) {
    if (pe.trig === "attack") return pe.tp;
    const al = alive(s), order = arr(s.order).map(Number), i = order.indexOf(pe.by);
    for (let k = 1; k < order.length; k++) { const q = order[(i + k) % order.length]; if (al.includes(q) && q !== pe.by) return q; }
    return 0;
}
function openWindow(s, pe, now) {
    const who = responder(s, pe);
    const ready = who && arr(P(s, who).ac).some(x => x && !(Number(x.turn) === s.turnNo && Number(s.turnP) === who));
    if (ready) { s.pending = Object.assign({}, pe, { who, dl: now + s.R.responseSec * 1000 }); ev(s, { k: "window", who, trig: pe.trig }); return; }
    continueAfter(s, pe, now);
}
/* the action resumes after its window (or right away) */
function continueAfter(s, pe, now) {
    if (!pe || s.over) return;
    const p = pe.by;
    if (pe.trig === "summon") {
        const c = arr(P(s, p).ch)[pe.slot];
        if (pe.negated && c && c.u === pe.u) { toGy(s, p, pe.slot, now); log(s, "The summon was negated: " + defOf(s, pe.u).name + " goes to the Graveyard."); }
        else if (c && c.u === pe.u) {
            const ab = abil(s, c);
            if (ab && ab.t === "summon" && condOk(s, p, ab, pe.u)) { ev(s, { k: "ability", p, slot: pe.slot, u: pe.u, id: s.cards[pe.u].id }); runOps(s, p, ab.ops, { self: pe.slot }, now); }
            if (ab && ab.copyOnSummon) copyAbility(s, p, pe.slot);
        }
    } else if (pe.trig === "support") {
        const d = defOf(s, pe.u), pl = P(s, p);
        if (!pe.negated) runOps(s, p, d.ops, {}, now);
        pl.gy = arr(pl.gy).concat(pe.u);
    } else if (pe.trig === "attack") {
        if (!pe.negated) battle(s, pe, now);
        else ev(s, { k: "negated", p, slot: pe.slot });
    }
    lifeCheck(s, now);
}
function condOk(s, p, ab, u) {
    const c = ab.cond; if (!c) return true;
    if (c.behind && !behind(s, p)) return false;
    if (c.lifeLe != null && lifeOf(s, p) > c.lifeLe) return false;
    // Combo: you control another character of the same series (or archetype, or either)
    if (c.combo) { const me = defOf(s, u); return arr(P(s, p).ch).some(o => o && o.u !== u && (x => c.combo === "series" ? x.s === me.s : c.combo === "arch" ? x.a === me.a : (x.s === me.s || x.a === me.a))(defOf(s, o.u))); }
    if (c.oppLifeLe != null && !opponents(s, p).some(q => lifeOf(s, q) <= c.oppLifeLe)) return false;
    return true;
}

/* ---------- battle ---------- */
function battle(s, pe, now) {
    const p = pe.by, A = arr(P(s, p).ch)[pe.slot];
    if (!A || A.u !== pe.u) return;                          // the attacker left the field (a Counter destroyed it)
    const aAb = abil(s, A);
    if (aAb && aAb.t === "attack" && condOk(s, p, aAb, A.u)) { ev(s, { k: "ability", p, slot: pe.slot, u: A.u, id: s.cards[A.u].id }); runOps(s, p, aAb.ops, { self: pe.slot, trig: pe }, now); }
    if (!pe.direct) {
        const T = arr(P(s, pe.tp).ch)[pe.tslot];
        if (T) { const tAb = abil(s, T); if (tAb && tAb.t === "attacked" && condOk(s, pe.tp, tAb, T.u)) { ev(s, { k: "ability", p: pe.tp, slot: pe.tslot, u: T.u, id: s.cards[T.u].id }); runOps(s, pe.tp, tAb.ops, { self: pe.tslot, trig: pe }, now); } }
    }
    if (s.over) return;
    const A2 = arr(P(s, p).ch)[pe.slot]; if (!A2 || A2.u !== pe.u) return;
    const as = statOf(s, p, pe.slot);
    if (pe.direct) {
        dealBattle(s, pe.tp, as.atk, p, now);
        ev(s, { k: "hit", p, slot: pe.slot, tp: pe.tp, direct: true, dmg: as.atk }); log(s, nm(s, pe.tp) + " takes " + as.atk + " damage.");
        return;
    }
    const T = arr(P(s, pe.tp).ch)[pe.tslot]; if (!T) { log(s, "The target is gone: the attack ends."); return; }
    const out = outcome(s, p, pe.slot, pe.tp, pe.tslot);
    ev(s, Object.assign({ k: "clash", p, slot: pe.slot, tp: pe.tp, tslot: pe.tslot }, out));
    log(s, out.text);
    if (out.dmgTo === "def" && out.dmg) dealBattle(s, pe.tp, out.dmg, p, now);
    if (out.dmgTo === "att" && out.dmg) dealBattle(s, p, out.dmg, pe.tp, now);
    const dead = [];
    if (out.killT) dead.push([pe.tp, pe.tslot]);
    if (out.killA) dead.push([p, pe.slot]);
    dead.forEach(([q, i]) => toGy(s, q, i, now, false, true));
}
/* the battle preview and the real result use the same function */
export function outcome(s, p, slot, tp, tslot) {
    const A = arr(P(s, p).ch)[slot], T = arr(P(s, tp).ch)[tslot]; if (!A || !T) return null;
    const as = statOf(s, p, slot), ts = statOf(s, tp, tslot), an = defOf(s, A.u).name, tn = defOf(s, T.u).name, pierce = pierces(s, p, slot);
    if (T.pos === "atk") {
        if (as.atk > ts.atk) return { killT: 1, dmgTo: "def", dmg: as.atk - ts.atk, text: "Destroys " + tn + ". " + nm(s, tp) + " loses " + (as.atk - ts.atk) + " life.", vs: [as.atk, ts.atk, "ATK"] };
        if (as.atk === ts.atk) return { killT: 1, killA: 1, dmg: 0, text: "Both " + an + " and " + tn + " are destroyed. No damage.", vs: [as.atk, ts.atk, "ATK"] };
        return { killA: 1, dmgTo: "att", dmg: ts.atk - as.atk, text: an + " is destroyed. " + nm(s, p) + " loses " + (ts.atk - as.atk) + " life.", vs: [as.atk, ts.atk, "ATK"] };
    }
    if (as.atk > ts.def) return { killT: 1, dmgTo: pierce ? "def" : "", dmg: pierce ? as.atk - ts.def : 0, text: "Destroys " + tn + (pierce ? ". Pierce: " + nm(s, tp) + " loses " + (as.atk - ts.def) + " life." : ". No damage (it was in Defense)."), vs: [as.atk, ts.def, "DEF"] };
    if (as.atk === ts.def) return { dmg: 0, text: "Nothing happens: ATK equals DEF.", vs: [as.atk, ts.def, "DEF"] };
    return { dmgTo: "att", dmg: ts.def - as.atk, text: tn + " holds. " + nm(s, p) + " loses " + (ts.def - as.atk) + " life.", vs: [as.atk, ts.def, "DEF"] };
}
export function preview(s, p, slot, tp, tslot, direct) {
    if (direct) { const as = statOf(s, p, slot); return { text: "A direct attack: " + nm(s, tp) + " loses " + as.atk + " life.", dmg: as.atk, vs: [as.atk, 0, "LIFE"] }; }
    return outcome(s, p, slot, tp, tslot);
}
function dealBattle(s, q, n, from, now) { loseLife(s, q, n, "battle", from); }
function loseLife(s, q, n, why, from) {
    if (!n) return; const pl = P(s, q); pl.life = Math.max(0, lifeOf(s, q) - n);
    ev(s, { k: "life", p: q, d: -n, why });
    if (from) { const st = s.stats[pk(from)]; st.dmg += n; st.big = Math.max(st.big, n); }
}
function heal(s, q, n) { const pl = P(s, q), max = s.fmt === "ffa" ? s.R.lifeFfa : s.R.life, was = lifeOf(s, q); pl.life = Math.min(max, was + n); if (pl.life > was) ev(s, { k: "life", p: q, d: pl.life - was, why: "heal" }); }
function stat(s, p, k) { const st = s.stats[pk(p)]; if (st) st[k] = (st[k] || 0) + 1; }

/* ---------- the Graveyard ---------- */
function toGy(s, p, slot, now, tribute, battleDeath) {
    const pl = P(s, p), c = pl.ch[slot]; if (!c) return;
    const ab = abil(s, c), u = c.u;
    pl.ch[slot] = null; pl.gy = arr(pl.gy).concat(u);
    if (!tribute) { ev(s, { k: "destroy", p, slot, u, id: s.cards[u].id }); log(s, defOf(s, u).name + " is destroyed."); }
    if (!tribute && ab && ab.t === "destroyed") { ev(s, { k: "ability", p, slot, u, id: s.cards[u].id }); runOps(s, p, ab.ops, { self: null, deadU: u }, now); }
}

/* ---------- abilities and Action cards: the operations (targets are chosen by rule, written on the card) ---------- */
function pickTarget(s, p, tgt, ctx) {
    const opp = opponents(s, p).flatMap(q => arr(P(s, q).ch).map((c, i) => c ? { q, i } : null).filter(Boolean));
    const mine = arr(P(s, p).ch).map((c, i) => c ? { q: p, i } : null).filter(Boolean);
    const score = (x, k) => { const st = statOf(s, x.q, x.i); return k === "atk" ? st.atk : k === "def" ? st.def : st.atk + st.def; };
    const best = (l, k) => l.slice().sort((a, b) => score(b, k) - score(a, k) || a.i - b.i)[0];
    const weak = (l, k) => l.slice().sort((a, b) => score(a, k) - score(b, k) || a.i - b.i)[0];
    switch (tgt) {
        case "self": return ctx.self != null ? [{ q: p, i: ctx.self }] : [];
        case "allies": return mine;
        case "others": return mine.filter(x => x.i !== ctx.self);
        case "myBest": return mine.length ? [best(mine, "atk")] : [];
        case "myWeak": return mine.length ? [weak(mine, "atk")] : [];
        case "oppAll": return opp;
        case "oppBest": return opp.length ? [best(opp, "atk")] : [];
        case "oppWeak": return opp.length ? [weak(opp, "atk")] : [];
        case "oppBestDef": return opp.length ? [best(opp, "def")] : [];
        case "oppAtkPos": return opp.filter(x => P(s, x.q).ch[x.i].pos === "atk");
        case "attacker": { const t = ctx.trig; if (!t || t.trig !== "attack") return []; const c = arr(P(s, t.by).ch)[t.slot]; return c && c.u === t.u ? [{ q: t.by, i: t.slot }] : []; }
        case "target": { const t = ctx.trig; if (!t || t.trig !== "attack" || t.direct) return []; return P(s, t.tp).ch[t.tslot] ? [{ q: t.tp, i: t.tslot }] : []; }
        case "summoned": { const t = ctx.trig; if (!t || t.trig !== "summon") return []; const c = arr(P(s, t.by).ch)[t.slot]; return c && c.u === t.u ? [{ q: t.by, i: t.slot }] : []; }
        default: return [];
    }
}
function runOps(s, p, ops, ctx, now) {
    const res = {};
    for (const o of arr(ops)) {
        if (s.over) break;
        if (o.if && !condOk(s, p, { cond: o.if }, ctx.self != null ? (P(s, p).ch[ctx.self] || {}).u : null)) continue;
        // "the opponent": the player whose action triggered this, otherwise (free-for-all) the opponent with the most life
        const leader = opponents(s, p).slice().sort((a, b) => lifeOf(s, b) - lifeOf(s, a) || a - b)[0];
        const whoOpp = o.who === "self" ? [p] : o.who === "all" ? alive(s) : o.who === "oppAll" ? opponents(s, p)
            : o.who === "attackerOwner" ? (ctx.trig && ctx.trig.trig === "attack" ? [ctx.trig.by] : [])
            : (ctx.trig && ctx.trig.by && ctx.trig.by !== p ? [ctx.trig.by] : leader ? [leader] : []);
        switch (o.op) {
            case "dmg": whoOpp.forEach(q => { loseLife(s, q, o.n, "effect", p); log(s, nm(s, q) + " loses " + o.n + " life."); }); break;
            case "heal": (o.who === "all" ? alive(s) : [p]).forEach(q => { heal(s, q, o.n); log(s, nm(s, q) + " restores " + o.n + " life."); }); break;
            case "draw": for (let i = 0; i < (o.n || 1); i++) if (!drawOne(s, p)) break; log(s, nm(s, p) + " draws " + (o.n || 1) + "."); break;
            case "buff": pickTarget(s, p, o.tgt || "self", ctx).forEach(x => { const c = P(s, x.q).ch[x.i]; c.buffs = arr(c.buffs).concat({ atk: o.atk || 0, def: o.def || 0, dur: o.dur || "turn" }); ev(s, { k: "buff", p: x.q, slot: x.i, atk: o.atk || 0, def: o.def || 0 }); log(s, defOf(s, c.u).name + (o.atk ? (o.atk > 0 ? " gains " : " loses ") + Math.abs(o.atk) + " ATK" : "") + (o.def ? (o.atk ? " and" : "") + (o.def > 0 ? " gains " : " loses ") + Math.abs(o.def) + " DEF" : "") + (o.dur === "perm" ? "." : " until the end of the turn.")); }); break;
            case "destroy": pickTarget(s, p, o.tgt, ctx).forEach(x => toGy(s, x.q, x.i, now)); break;
            case "silence": pickTarget(s, p, o.tgt, ctx).forEach(x => { const c = P(s, x.q).ch[x.i]; c.sil = 1; ev(s, { k: "silence", p: x.q, slot: x.i }); log(s, defOf(s, c.u).name + "'s ability is silenced until the end of the turn."); }); break;
            case "swap": pickTarget(s, p, o.tgt, ctx).forEach(x => { const c = P(s, x.q).ch[x.i]; c.swp = c.swp ? 0 : 1; ev(s, { k: "swap", p: x.q, slot: x.i }); log(s, defOf(s, c.u).name + " swaps its ATK and DEF."); }); break;
            case "pos": pickTarget(s, p, o.tgt, ctx).forEach(x => { const c = P(s, x.q).ch[x.i]; if (c.pos !== o.to) { c.pos = o.to; ev(s, { k: "position", p: x.q, slot: x.i, pos: o.to }); log(s, defOf(s, c.u).name + " is switched to " + (o.to === "atk" ? "Attack" : "Defense") + " position."); } }); break;
            case "scout": {
                const q = opponents(s, p)[0]; if (!q) break;
                const seen = o.what === "top" ? arr(P(s, q).deck).slice(0, 1) : o.what === "hand" ? arr(P(s, q).hand).slice(0, 1) : arr(P(s, q).ac).filter(Boolean).map(x => x.u).slice(0, 1);
                ev(s, { k: "scout", p, to: p, what: o.what, cards: seen.map(u => s.cards[u].id), priv: p }); log(s, nm(s, p) + " scouts " + nm(s, q) + "'s " + (o.what === "top" ? "deck" : o.what === "hand" ? "hand" : "face-down card") + ".");
                break;
            }
            case "negate": res.negate = true; break;
            case "bounceSet": { const q = ctx.trig && ctx.trig.by; if (!q) break; const pl = P(s, q), z = arr(pl.ac).findIndex(Boolean); if (z >= 0) { pl.gy = arr(pl.gy).concat(pl.ac[z].u); pl.ac[z] = null; log(s, "A face-down card of " + nm(s, q) + " is destroyed."); } break; }
            case "setDestroy": { const q = opponents(s, p)[0]; if (!q) break; const pl = P(s, q), z = arr(pl.ac).findIndex(Boolean); if (z >= 0) { const u = pl.ac[z].u; pl.ac[z] = null; pl.gy = arr(pl.gy).concat(u); ev(s, { k: "setdestroy", p: q, slot: z }); log(s, nm(s, p) + " destroys one of " + nm(s, q) + "'s face-down cards."); } break; }
            case "copy": if (ctx.self != null) copyAbility(s, p, ctx.self); break;
        }
    }
    return res;
}
function copyAbility(s, p, slot) {
    const t = pickTarget(s, p, "oppBest", {})[0]; if (!t) return;
    const src = P(s, t.q).ch[t.i], ab = abil(s, src), me = P(s, p).ch[slot];
    if (ab && me) { me.copy = Object.assign({}, ab); log(s, defOf(s, me.u).name + " copies " + defOf(s, src.u).name + "'s ability."); }
}

/* ---------- elimination and the end ---------- */
function lifeCheck(s, now) {
    if (s.over) return;
    const dead = alive(s).filter(q => lifeOf(s, q) <= 0);
    if (dead.length) eliminate(s, dead, now, "life");
}
function eliminate(s, list, now, why) {
    const al = alive(s); list = list.filter(q => al.includes(q)); if (!list.length) return;
    const place = al.length - list.length + 1;           // simultaneous eliminations share their place
    list.forEach(q => {
        s.out = arr(s.out).concat(q); s.place = Object.assign({}, s.place, { [pk(q)]: place });
        const pl = P(s, q);
        arr(pl.ch).forEach((c, i) => { if (c) { pl.gy = arr(pl.gy).concat(c.u); pl.ch[i] = null; } });
        arr(pl.ac).forEach((c, i) => { if (c) { pl.gy = arr(pl.gy).concat(c.u); pl.ac[i] = null; } });
        ev(s, { k: "out", p: q, why, place }); log(s, nm(s, q) + (why === "deck" ? " ran out of cards" : why === "concede" ? " left the duel" : " has no life left") + ".");
    });
    if (s.pending && list.includes(Number(s.pending.who))) { const pe = s.pending; s.pending = null; continueAfter(s, pe, now); }
    const left = alive(s);
    if (left.length <= 1) {
        if (left.length === 1) s.place = Object.assign({}, s.place, { [pk(left[0])]: 1 });
        s.over = true; s.phase = "over"; s.winner = left[0] || 0; s.pending = null;
        ev(s, { k: "over", winner: s.winner }); log(s, left.length ? nm(s, left[0]) + " wins the duel!" : "Nobody is left: a draw.");
        return;
    }
    if (!left.includes(Number(s.turnP)) && !s.over) nextTurn(s, now);
}

/* ---------- time: the response window and the turn timer (the host calls this) ---------- */
export function tick(s, now) {
    if (s.over) return false;
    if (s.pending && now >= Number(s.pending.dl)) { const pe = s.pending; s.pending = null; ev(s, { k: "pass", p: pe.who, auto: 1 }); continueAfter(s, pe, now); return true; }
    if (!s.pending && s.dl && now >= Number(s.dl)) { endTurn(s, now, "Time is up: " + nm(s, s.turnP) + "'s turn ends."); return true; }
    return false;
}
/* the host ends the turn of a player who is away (a disconnect); their duel waits until they return otherwise */
export function forceEnd(s, now, why) { if (s.over) return; if (s.pending) { const pe = s.pending; s.pending = null; continueAfter(s, pe, now); } if (!s.over) endTurn(s, now, why || nm(s, s.turnP) + " is away: their turn ends."); }

/* ---------- what a player may see ---------- */
export function viewFor(s, p) {
    const v = clone(s); p = Number(p);
    delete v.rng; delete v.seed;
    Object.entries(v.P).forEach(([k, pl]) => {
        const q = Number(k.slice(1)), own = q === p;
        pl.deckN = arr(pl.deck).length; pl.deck = [];
        pl.handN = arr(pl.hand).length; if (!own) pl.hand = [];
        pl.ac = arr(pl.ac).map(x => x ? (own ? x : { u: "", turn: x.turn, down: 1 }) : null);
    });
    const known = new Set();
    Object.entries(v.P).forEach(([k, pl]) => { arr(pl.ch).forEach(c => { if (c) known.add(c.u); }); arr(pl.gy).forEach(u => known.add(u)); if (Number(k.slice(1)) === p) { arr(pl.hand).forEach(u => known.add(u)); arr(pl.ac).forEach(x => x && known.add(x.u)); } });
    v.ev.forEach(e => { if (["support", "counter", "summon", "destroy", "ability"].includes(e.k) && e.u) known.add(e.u); });
    Object.keys(v.cards).forEach(u => { if (!known.has(u)) delete v.cards[u]; });
    v.ev = v.ev.map(e => { if (e.k === "draw" && Number(e.p) !== p) return Object.assign({}, e, { u: "" }); if (e.priv && Number(e.priv) !== p) return { n: e.n, k: "scout", p: e.p, hidden: 1 }; return e; });
    return v;
}
/* everything player p can do right now (the UI highlights these; the bot picks from them) */
export function legalMoves(s, p) {
    const out = [], pl = P(s, p); if (!pl || s.over) return out;
    const tryA = a => { if (!why(s, p, a)) out.push(a); };
    if (s.pending) { if (Number(s.pending.who) === p) { out.push({ k: "pass" }); arr(pl.ac).forEach(x => { if (x) tryA({ k: "respond", u: x.u }); }); } return out; }
    if (Number(s.turnP) !== p) return out;
    arr(pl.hand).forEach(u => {
        const need = tributesFor(s, u);
        const mine = arr(pl.ch).map((c, i) => c ? i : -1).filter(i => i >= 0);
        const tribs = need ? mine.map(i => [i]) : [[]];
        tribs.forEach(t => ["atk", "def"].forEach(pos => tryA({ k: "summon", u, pos, trib: t })));
        tryA({ k: "set", u }); tryA({ k: "support", u });
    });
    arr(pl.ch).forEach((c, i) => { if (!c) return; tryA({ k: "position", slot: i }); tryA({ k: "ability", slot: i });
        opponents(s, p).forEach(q => { tryA({ k: "attack", slot: i, tp: q, direct: true }); arr(P(s, q).ch).forEach((t, j) => { if (t) tryA({ k: "attack", slot: i, tp: q, tslot: j }); }); }); });
    tryA({ k: "phase", to: "battle" }); tryA({ k: "phase", to: "end" });
    return out;
}
/* the final placements for the standard result (winner 1st; eliminated players by elimination order, ties share) */
export const placements = s => alive(s).concat(arr(s.out)).map(Number).map(q => ({ slot: q, place: Number((s.place || {})[pk(q)]) || 1 }));
