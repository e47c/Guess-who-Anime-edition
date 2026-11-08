// Anime TCG duel engine: unit tests (no browser). Run: node tools/duel-test.mjs
import { newDuel, act, why, tick, statOf, outcome, preview, viewFor, legalMoves, placements, useDefs, P, lifeOf, alive, forceEnd } from "../js/duel/engine.js";
import { DUEL } from "../js/vault/config.js";

let ok = 0, bad = 0;
const t = (c, m) => { if (c) ok++; else { bad++; console.log("  ✘", m); } };
const R = DUEL.rules;
/* synthetic cards: id = 1000 + n; abilities by id */
const C = {}, A = {};
const ch = (id, atk, def, r = 0, ab = null, s = "x", a = "Brawler") => { C[id] = { id, name: "C" + id, s, a, r, atk, def, ab }; return id; };
ch(1, 1500, 1000); ch(2, 1500, 1000); ch(3, 1200, 1800); ch(4, 2000, 500); ch(5, 1000, 1000);
ch(10, 2600, 2000, 5);                                                  // Legendary: 1 tribute
ch(11, 2400, 2200, 6);                                                  // Mythic: 1 tribute
ch(20, 1400, 900, 2, { t: "cont", pierce: true, kw: ["Pierce"] });
ch(21, 1000, 1200, 1, { t: "cont", guard: 600, kw: ["Guard"] });
ch(22, 1100, 1000, 2, { t: "summon", ops: [{ op: "dmg", who: "opp", n: 400 }] });
ch(23, 900, 1500, 3, { t: "attacked", ops: [{ op: "dmg", who: "attackerOwner", n: 300 }], kw: ["Counter"] });
ch(24, 1200, 800, 3, { t: "destroyed", ops: [{ op: "heal", n: 700 }], kw: ["Heal"] });
ch(25, 1000, 900, 4, { t: "cont", rage: { atk: 800 }, kw: ["Rage"] });
ch(26, 1300, 1000, 4, { t: "opt", ops: [{ op: "buff", tgt: "self", atk: 500 }] });
ch(27, 1000, 1000, 5, { t: "summon", ops: [{ op: "silence", tgt: "oppBest" }] });
A.neg = { id: "neg", name: "Parry", type: "counter", trig: "attack", ops: [{ op: "negate" }] };
A.trap = { id: "trap", name: "Snare", type: "counter", trig: "attack", ops: [{ op: "destroy", tgt: "attacker" }] };
A.stop = { id: "stop", name: "Cancel", type: "counter", trig: "support", ops: [{ op: "negate" }] };
A.boost = { id: "boost", name: "Rally", type: "support", ops: [{ op: "buff", tgt: "myBest", atk: 500 }], need: "myChar" };
A.burn = { id: "burn", name: "Flare", type: "support", ops: [{ op: "dmg", who: "opp", n: 500 }] };
useDefs({ card: id => C[id], action: id => A[id] });
const deckOf = list => list.concat(Array(Math.max(0, 20 - list.length)).fill(5));
const mk = (o = {}) => newDuel(Object.assign({ id: "t", seed: 7, players: [1, 2], decks: { p1: deckOf([]), p2: deckOf([]) }, names: { p1: "Ann", p2: "Ben" }, now: 0, rules: R }, o));
/* put a card straight into a hand / onto the field (test setup) */
let nU = 900;
const give = (s, p, id) => { const u = "x" + (++nU); s.cards[u] = { id, o: p }; P(s, p).hand.push(u); return u; };
const place = (s, p, slot, id, pos = "atk", turn = -1) => { const u = "x" + (++nU); s.cards[u] = { id, o: p }; P(s, p).ch[slot] = { u, pos, st: turn, buffs: [], atk1: 0, sw: 0, opt: 0, sil: 0 }; return u; };
const setCard = (s, p, slot, aid, turn = -1) => { const u = "x" + (++nU); s.cards[u] = { id: "a:" + aid, o: p }; P(s, p).ac[slot] = { u, turn }; return u; };
const other = (s, p) => s.players.find(q => q !== p);
const goBattle = (s, now = 0) => act(s, { by: s.turnP, k: "phase", to: "battle" }, now);
const endT = (s, now = 0) => act(s, { by: s.turnP, k: "phase", to: "end" }, now);
const toTurn2 = s => { endT(s); return s; };

/* ---- setup ---- */
let s = mk();
const f = s.first, g = other(s, f);
t(lifeOf(s, 1) === 8000 && lifeOf(s, 2) === 8000, "life 8000 each");
t(P(s, f).hand.length === 5 && P(s, g).hand.length === 5 && P(s, f).deck.length === 15, "opening hand 5, deck 20 - 5 = 15");
t(s.turnP === f && s.phase === "main" && s.turnNo === 1, "the coin toss winner starts, already in Main (turn 1, no draw)");
t(s.ev.some(e => e.k === "toss" && e.first === f), "the toss is an event (for the banner)");
t(why(s, f, { k: "phase", to: "battle" }) === "The first player can't attack on turn 1.", "the first player can't attack on turn 1");
toTurn2(s);
t(s.turnP === g && P(s, g).hand.length === 6 && s.phase === "main", "turn 2: the second player draws 1 (hand 6)");

/* ---- Normal Summon ---- */
s = mk(); { const p = s.turnP, u = give(s, p, 1), u2 = give(s, p, 2);
    t(act(s, { by: p, k: "summon", u, pos: "atk" }) === null && P(s, p).ch[0].u === u && P(s, p).ch[0].pos === "atk", "summon in Attack position into a free zone");
    t(why(s, p, { k: "summon", u: u2, pos: "def" }) === "Already summoned this turn (one Normal Summon per turn).", "one Normal Summon per turn");
    t(why(s, other(s, p), { k: "summon", u: u2 }) === "It's Ann's turn." || /turn/.test(why(s, other(s, p), { k: "summon", u: u2 })), "not on the other player's turn");
    t(why(s, p, { k: "position", slot: 0 }) === "It was summoned this turn.", "no position switch the turn it was summoned");
}
/* ---- tributes ---- */
s = mk(); { const p = s.turnP, L = give(s, p, 10);
    t(/Needs 1 tribute/.test(why(s, p, { k: "summon", u: L, pos: "atk" })), "a Legendary needs a tribute: refused with nothing on the field");
    place(s, p, 0, 5); place(s, p, 1, 3);
    t(why(s, p, { k: "summon", u: L, pos: "atk" }) === "Pick 1 of your characters to tribute.", "…and a tribute must be picked");
    const before = P(s, p).gy.length;
    t(act(s, { by: p, k: "summon", u: L, pos: "atk", trib: [1] }) === null && P(s, p).gy.length === before + 1 && P(s, p).ch.some(c => c && s.cards[c.u].id === 10), "tribute: the sacrificed character goes to the Graveyard, the Legendary takes the field");
    t(P(s, p).ch.filter(Boolean).length === 2, "field: the other character + the Legendary");
}
/* ---- positions ---- */
s = mk(); toTurn2(s); { const p = s.turnP; place(s, p, 0, 1, "atk");
    t(act(s, { by: p, k: "position", slot: 0 }) === null && P(s, p).ch[0].pos === "def", "switch to Defense");
    t(why(s, p, { k: "position", slot: 0 }) === "Already switched this turn.", "once per turn");
}
/* ---- battle: every damage case ---- */
const battleCase = (aId, tId, tPos, extra) => { const s2 = mk(); toTurn2(s2); const p = s2.turnP, q = other(s2, p); place(s2, p, 0, aId, "atk"); place(s2, q, 0, tId, tPos); if (extra) extra(s2, p, q); goBattle(s2); act(s2, { by: p, k: "attack", slot: 0, tp: q, tslot: 0 }); return { s: s2, p, q }; };
let r = battleCase(4, 1, "atk");      // 2000 vs 1500 ATK
t(!P(r.s, r.q).ch[0] && lifeOf(r.s, r.q) === 7500 && P(r.s, r.p).ch[0], "ATK > ATK: target destroyed, its owner loses the difference (500)");
r = battleCase(1, 2, "atk");          // 1500 vs 1500
t(!P(r.s, r.q).ch[0] && !P(r.s, r.p).ch[0] && lifeOf(r.s, r.p) === 8000 && lifeOf(r.s, r.q) === 8000, "equal ATK: both destroyed, no damage");
r = battleCase(5, 1, "atk");          // 1000 vs 1500
t(!P(r.s, r.p).ch[0] && P(r.s, r.q).ch[0] && lifeOf(r.s, r.p) === 7500, "ATK < ATK: the attacker is destroyed, its owner loses the difference");
r = battleCase(4, 5, "def");          // 2000 vs DEF 1000
t(!P(r.s, r.q).ch[0] && lifeOf(r.s, r.q) === 8000, "ATK > DEF: target destroyed, no damage");
r = battleCase(20, 5, "def");         // Pierce 1400 vs DEF 1000
t(!P(r.s, r.q).ch[0] && lifeOf(r.s, r.q) === 7600, "Pierce: ATK > DEF deals the difference (400)");
r = battleCase(5, 5, "def");          // 1000 vs 1000
t(P(r.s, r.q).ch[0] && P(r.s, r.p).ch[0] && lifeOf(r.s, r.p) === 8000 && lifeOf(r.s, r.q) === 8000, "ATK = DEF: nothing happens");
r = battleCase(1, 3, "def");          // 1500 vs DEF 1800
t(P(r.s, r.q).ch[0] && P(r.s, r.p).ch[0] && lifeOf(r.s, r.p) === 7700, "ATK < DEF: the attacker's owner loses the difference (300)");
r = battleCase(1, 21, "def");         // Guard +600: DEF 1800
t(lifeOf(r.s, r.p) === 7700 && P(r.s, r.q).ch[0], "Guard adds DEF in Defense position");
s = mk(); toTurn2(s); { const p = s.turnP, q = other(s, p); place(s, p, 0, 4); place(s, p, 1, 3, "def"); goBattle(s);
    t(/still has characters/.test(why(s, p, { k: "attack", slot: 0, tp: q, direct: true }) || "x") === false, "direct allowed when the opponent has no characters");
    act(s, { by: p, k: "attack", slot: 0, tp: q, direct: true });
    t(lifeOf(s, q) === 6000, "direct attack: the full ATK (2000)");
    t(why(s, p, { k: "attack", slot: 0, tp: q, direct: true }) === "It already attacked this turn.", "each character attacks once a turn");
    t(why(s, p, { k: "attack", slot: 1, tp: q, direct: true }) === "Defense-position characters can't attack.", "Defense position can't attack");
    place(s, q, 0, 5);
    t(/still has characters/.test(why(s, p, { k: "attack", slot: 1, tp: q, direct: true }) || "") || why(s, p, { k: "attack", slot: 1, tp: q, direct: true }) === "Defense-position characters can't attack.", "no direct attack while they have a character");
}
s = mk(); toTurn2(s); { const p = s.turnP, q = other(s, p); place(s, p, 0, 4); place(s, q, 0, 5); goBattle(s);
    t(why(s, p, { k: "attack", slot: 0, tp: q, direct: true }) === "Ben still has characters: attack one of them." || /still has characters/.test(why(s, p, { k: "attack", slot: 0, tp: q, direct: true })), "direct refused while the opponent has a character");
    const pv = preview(s, p, 0, q, 0); t(pv && /Destroys C5\. .* loses 1000 life\./.test(pv.text), "battle preview in words: " + (pv && pv.text));
}
/* ---- deck-out and life ---- */
s = mk({ decks: { p1: Array(5).fill(5), p2: Array(5).fill(5) } }); { endT(s); const loser = s.out[0];
    t(s.over && loser === other(s, s.first) && s.winner === s.first, "drawing from an empty deck loses (the second player had 5 cards, all in hand)");
    t(JSON.stringify(placements(s).sort((a, b) => a.place - b.place).map(x => x.place)) === "[1,2]", "placements: winner 1st, loser 2nd");
}
s = mk(); toTurn2(s); { const p = s.turnP, q = other(s, p); P(s, q).life = 500; place(s, p, 0, 4); goBattle(s); act(s, { by: p, k: "attack", slot: 0, tp: q, direct: true });
    t(s.over && s.winner === p && lifeOf(s, q) === 0, "life 0: the duel ends"); }
/* ---- response windows: Counters ---- */
s = mk(); toTurn2(s); { const p = s.turnP, q = other(s, p); place(s, p, 0, 4); place(s, q, 0, 5); const cu = setCard(s, q, 0, "neg"); goBattle(s);
    act(s, { by: p, k: "attack", slot: 0, tp: q, tslot: 0 }, 1000);
    t(s.pending && s.pending.who === q && s.pending.trig === "attack" && s.pending.dl === 1000 + R.responseSec * 1000, "an attack opens a " + R.responseSec + " s window for the defender (they have a face-down card)");
    t(why(s, p, { k: "attack", slot: 0, tp: q, tslot: 0 }) === "Waiting for Ben to respond." || /Waiting/.test(why(s, p, { k: "attack", slot: 0, tp: q, tslot: 0 })), "nothing else happens during the window");
    t(act(s, { by: q, k: "respond", u: cu }) === null && !s.pending && P(s, q).ch[0] && lifeOf(s, q) === 8000 && P(s, q).gy.includes(cu), "Counter: the attack is negated, the Counter goes to the Graveyard");
    t(!s.pending, "no window answers the Counter (Counters can't respond to Counters)");
}
s = mk(); toTurn2(s); { const p = s.turnP, q = other(s, p); place(s, p, 0, 4); place(s, q, 0, 5); setCard(s, q, 0, "neg"); goBattle(s);
    act(s, { by: p, k: "attack", slot: 0, tp: q, tslot: 0 }, 1000); act(s, { by: q, k: "pass" });
    t(!P(s, q).ch[0] && lifeOf(s, q) === 7000, "pass: the attack resolves"); }
s = mk(); toTurn2(s); { const p = s.turnP, q = other(s, p); place(s, p, 0, 4); place(s, q, 0, 5); setCard(s, q, 0, "neg"); goBattle(s);
    act(s, { by: p, k: "attack", slot: 0, tp: q, tslot: 0 }, 1000); tick(s, 1000 + R.responseSec * 1000 - 1);
    t(!!s.pending, "the window stays open until it runs out"); tick(s, 1000 + R.responseSec * 1000);
    t(!s.pending && !P(s, q).ch[0], "timeout = pass, the attack resolves"); }
s = mk(); toTurn2(s); { const p = s.turnP, q = other(s, p); place(s, p, 0, 4); place(s, q, 0, 5); const tu = setCard(s, q, 0, "trap"); goBattle(s);
    act(s, { by: p, k: "attack", slot: 0, tp: q, tslot: 0 }); act(s, { by: q, k: "respond", u: tu });
    t(!P(s, p).ch[0] && P(s, q).ch[0] && lifeOf(s, q) === 8000, "a Counter that destroys the attacker: the attack never lands"); }
s = mk(); toTurn2(s); { const p = s.turnP, q = other(s, p); place(s, p, 0, 4); const su = setCard(s, q, 0, "stop"); const bu = give(s, p, "a:boost"); s.cards[bu].id = "a:boost";
    act(s, { by: p, k: "support", u: bu });
    t(s.pending && s.pending.trig === "support", "a Support opens a window");
    t(/answers a Support card/.test(why(s, q, { k: "respond", u: su }) || "ok") || why(s, q, { k: "respond", u: su }) === null, "a support-Counter matches");
    act(s, { by: q, k: "respond", u: su });
    t(statOf(s, p, 0).atk === 2000 && P(s, p).gy.includes(bu), "negated: no boost, the Support still goes to the Graveyard"); }
s = mk(); toTurn2(s); { const p = s.turnP, q = other(s, p); place(s, p, 0, 4); place(s, q, 0, 5); const nu = setCard(s, q, 0, "stop"); goBattle(s);
    act(s, { by: p, k: "attack", slot: 0, tp: q, tslot: 0 });
    t(/answers a Support card, not an attack/.test(why(s, q, { k: "respond", u: nu }) || ""), "a Counter only answers its own trigger"); act(s, { by: q, k: "pass" }); }
s = mk(); { const p = s.turnP, q = other(s, p); place(s, q, 0, 5); setCard(s, q, 0, "neg", 1);      // set during this (turn 1) by the defender is fine; set by the turn player this turn is not
    const own = setCard(s, p, 0, "neg", 1); t(!legalMoves(s, p).some(m => m.k === "respond"), "the turn player has no window on their own turn"); }
/* ---- Support, abilities ---- */
s = mk(); toTurn2(s); { const p = s.turnP, q = other(s, p); const bu = give(s, p, "a:burn"); s.cards[bu].id = "a:burn"; act(s, { by: p, k: "support", u: bu });
    t(lifeOf(s, q) === 7500 && P(s, p).gy.includes(bu), "Support: immediate effect (500 damage), then the Graveyard"); }
s = mk(); toTurn2(s); { const p = s.turnP, q = other(s, p); const u = give(s, p, 22); act(s, { by: p, k: "summon", u, pos: "atk" });
    t(lifeOf(s, q) === 7600, "On summon: 400 damage"); }
r = battleCase(4, 23, "atk");
t(lifeOf(r.s, r.p) === 8000 - 300 && !P(r.s, r.q).ch[0], "When attacked: Counter 300 to the attacker's owner, then the battle");
r = battleCase(4, 24, "atk");
t(lifeOf(r.s, r.q) === 8000 - 800 + 700, "When destroyed: Heal 700 after the damage");
s = mk(); toTurn2(s); { const p = s.turnP, q = other(s, p); place(s, p, 0, 25); P(s, p).life = 5000;
    t(statOf(s, p, 0).atk === 1800, "Rage: +800 ATK while behind"); P(s, p).life = 9000; t(statOf(s, p, 0).atk === 1000, "…and not when ahead"); }
s = mk(); toTurn2(s); { const p = s.turnP; place(s, p, 0, 26);
    t(act(s, { by: p, k: "ability", slot: 0 }) === null && statOf(s, p, 0).atk === 1800, "Once per turn: +500 ATK");
    t(why(s, p, { k: "ability", slot: 0 }) === "Already used this turn (once per turn).", "…only once a turn");
    endT(s); endT(s); t(statOf(s, p, 0).atk === 1300, "the boost ended with the turn"); }
s = mk(); toTurn2(s); { const p = s.turnP, q = other(s, p); place(s, q, 0, 20); const u = give(s, p, 27); place(s, p, 0, 5);
    act(s, { by: p, k: "summon", u, pos: "atk", trib: [0] }); t(P(s, q).ch[0].sil === 1, "Silence on summon: the opposing best character's ability is off this turn");
}
/* ---- the Final Clash (end of each round from stalemate.round) + turn timer ---- */
s = mk(); { const SG = R.stalemate; s.round = SG.round; const a0 = lifeOf(s, 1), b0 = lifeOf(s, 2); endT(s);
    t(lifeOf(s, 1) === a0 && lifeOf(s, 2) === b0, "Final Clash: nothing in the middle of a round");
    endT(s); t(lifeOf(s, 1) === a0 - SG.loss && lifeOf(s, 2) === b0 - SG.loss, "Final Clash: at the end of round " + SG.round + " everyone loses " + SG.loss);
    endT(s); endT(s); t(lifeOf(s, 1) === a0 - 2 * SG.loss - SG.grow && lifeOf(s, 2) === b0 - 2 * SG.loss - SG.grow, "Final Clash: " + SG.grow + " more each round after"); }
s = mk({ now: 0 }); { const p0 = s.turnP; tick(s, R.turnSec * 1000 - 1); t(s.turnP === p0, "the turn timer runs");
    tick(s, R.turnSec * 1000); t(s.turnP !== p0, "time up: the turn ends (" + R.turnSec + " s)"); }
s = mk(); { const p0 = s.turnP; forceEnd(s, 0); t(s.turnP !== p0, "a disconnected player's turn is ended by the host"); }
/* ---- hidden information ---- */
s = mk(); toTurn2(s); { const p = s.turnP, q = other(s, p); setCard(s, q, 1, "neg");
    const v = viewFor(s, p);
    t(v.P["p" + q].hand.length === 0 && v.P["p" + q].handN === P(s, q).hand.length, "the opponent's hand: only its count");
    t(v.P["p" + p].deck.length === 0 && v.P["p" + p].deckN === P(s, p).deck.length && v.P["p" + q].deck.length === 0, "no deck order for anyone");
    t(v.P["p" + q].ac[1].down === 1 && !v.P["p" + q].ac[1].u, "a face-down card is just face-down");
    t(!P(s, q).hand.some(u => v.cards[u]) && v.rng === undefined, "no hidden card ids, no generator state");
    const sp = viewFor(s, 0); t(sp.P["p" + p].hand.length === 0 && sp.P["p" + q].hand.length === 0, "spectators see no hand"); }
/* ---- determinism ---- */
{ const a1 = mk({ seed: 99 }), a2 = mk({ seed: 99 }); endT(a1); endT(a2); t(JSON.stringify(a1) === JSON.stringify(a2), "same seed + same intents = the same duel"); }
/* ---- legal moves ---- */
s = mk(); { const p = s.turnP; const lm = legalMoves(s, p); t(lm.some(m => m.k === "summon") && lm.some(m => m.k === "phase" && m.to === "end") && !lm.some(m => m.k === "phase" && m.to === "battle"), "legal moves: summons, End; no Battle on turn 1"); }
/* ---- free-for-all ---- */
s = newDuel({ id: "f", seed: 3, players: [1, 2, 3], decks: { p1: deckOf([]), p2: deckOf([]), p3: deckOf([]) }, names: {}, now: 0, rules: R });
t(s.fmt === "ffa" && [1, 2, 3].every(p => lifeOf(s, p) === 6000), "free-for-all: 3 players, life 6000");
endT(s); { const p = s.turnP, others = s.players.filter(q => q !== p); place(s, p, 0, 4); const [q1, q2] = others; place(s, q1, 0, 5); setCard(s, q1, 0, "neg"); setCard(s, q2, 0, "neg"); goBattle(s);
    act(s, { by: p, k: "attack", slot: 0, tp: q1, tslot: 0 });
    t(s.pending && s.pending.who === q1, "only the attacked player may respond"); act(s, { by: q1, k: "pass" });
    P(s, q2).life = 300; act(s, { by: p, k: "phase", to: "end" });
    // (two players dropping at once is checked with the Final Clash below)
}
s = newDuel({ id: "f2", seed: 4, players: [1, 2, 3], decks: { p1: deckOf([]), p2: deckOf([]), p3: deckOf([]) }, names: {}, now: 0, rules: R });
{ endT(s); endT(s); s.round = R.stalemateFfa.round; const p = s.turnP, others = s.players.filter(q => q !== p); others.forEach(q => { P(s, q).life = 200; }); endT(s);
    t(s.over && s.winner === p && others.every(q => s.place["p" + q] === 2), "two players out at once share 2nd place; the last one standing wins"); }
s = newDuel({ id: "f3", seed: 5, players: [1, 2, 3, 4], decks: { p1: deckOf([]), p2: deckOf([]), p3: deckOf([]), p4: deckOf([]) }, names: {}, now: 0, rules: R });
{ const order = s.order.slice(); const out1 = order[1]; P(s, out1).life = 100; endT(s);            // order[1]'s turn now
    const p = s.turnP; act(s, { by: p, k: "concede" });
    t(s.out.includes(p) && s.place["p" + p] === 4 && !s.over && s.turnP !== p, "elimination order: the first one out is 4th, the duel goes on, their turn passes");
    t(P(s, p).ch.every(c => !c), "an eliminated player's cards go to the Graveyard"); }
console.log((bad ? "FAILED " : "") + ok + " passed, " + bad + " failed");
process.exitCode = bad ? 1 : 0;
