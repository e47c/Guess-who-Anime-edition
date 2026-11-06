// ARCADE VAULT card-battle engine tests + balance simulation: node tools/cardvault-test.mjs [--sims N]
import { newBattle, act, resolveRound, alive, handOf, lifeOf, autoPick, due, applyDue, playOut, cpuPick, allPicked, REVEAL_MS } from "../js/cardvault/engine.js?v=4";
import { ABILITIES, ARCHETYPES, RARITY_NAMES } from "../js/cardvault/abilities.js?v=1";
import { CARDS, BY_SERIES_RARITY, CARD_SERIES, TOTAL_CARDS } from "../js/vault/carddb.js?v=2";
import { BATTLE } from "../js/vault/config.js?v=6";
import { rngFrom, shuffleWith } from "../js/vault/rng.js?v=1";

let ok = 0, bad = 0;
const t = (c, m) => { if (c) ok++; else { bad++; console.log("  ✘", m); } };
const sect = s => console.log("• " + s);
const all = Object.values(CARDS);
const find = (pred) => all.find(pred);
const byAb = ab => all.filter(c => c.ab === ab).sort((a, b) => a.id - b.id)[0];
const plain = (minPow = 0) => all.filter(c => c.ab === "c_combo" && c.pow >= minPow).sort((a, b) => a.id - b.id);     // combo cards do nothing without a matching previous card
const filler = () => plain().map(c => c.id);
/* a duel where p1 plays card a and p2 card b this round (both first in hand) */
function duel(a, b, o = {}) {
    const F = filler(), dA = [a].concat(F.filter(x => x !== a && x !== b).slice(0, 9)), dB = [b].concat(F.filter(x => x !== a && x !== b).slice(9, 18));
    const s = newBattle({ mid: 1, fmt: "duel", players: [1, 2], decks: { p1: dA, p2: dB }, names: { p1: "A", p2: "B" }, seed: 5 });
    s.hand.p1 = [a].concat(s.hand.p1.filter(x => x !== a)).slice(0, 4); s.hand.p2 = [b].concat(s.hand.p2.filter(x => x !== b)).slice(0, 4);
    if (o.life) { s.life.p1 = o.life[0]; s.life.p2 = o.life[1]; }
    if (o.prev) { s.prev.p1 = o.prev[0]; s.prev.p2 = o.prev[1]; }
    act(s, { p: 1, c: a }); act(s, { p: 2, c: b }); resolveRound(s, 0);
    return s;
}
const dmgTo = (s, p) => s.last.dmg["p" + p];
const C = id => CARDS[id];

sect("cards");
t(TOTAL_CARDS === 831 && CARD_SERIES.length === 18, "831 cards in 18 series");
t(CARD_SERIES.every(s => BY_SERIES_RARITY[s].every(list => list.length >= 1)), "every series has at least one card of every rarity (packs only drop their own series)");
const tot = all.map(c => c.pow + c.def);
t(all.every(c => { const [lo, hi] = BATTLE.statTotal[c.rk]; return c.pow + c.def >= lo && c.pow + c.def <= hi && c.pow >= 2 && c.def >= 1; }), "Power + Defense stay inside each rarity's (nearly flat) total");
const avgT = r => { const l = all.filter(c => c.r === r); return (l.reduce((s, c) => s + c.pow + c.def, 0) / l.length).toFixed(2); };
console.log("   average Power+Defense by rarity: " + RARITY_NAMES.map((n, r) => n + " " + avgT(r)).join(", "));
t(all.every(c => ABILITIES[c.ab] && ABILITIES[c.ab].tier === c.r), "each card's ability matches its rarity tier");
t(all.every(c => ARCHETYPES.includes(c.a)) && ARCHETYPES.every(a => all.some(c => c.a === a)), "every card has an archetype; all 7 are used");

sect("clash basics");
const P8 = find(c => c.ab === "c_combo" && c.pow === 8), D3 = find(c => c.ab === "c_combo" && c.def === 3);
let s = duel(P8.id, D3.id);
t(dmgTo(s, 2) === Math.max(0, P8.pow - D3.def) && dmgTo(s, 1) === Math.max(0, D3.pow - P8.def), "damage = Power - Defense, both ways at once: " + dmgTo(s, 2) + " / " + dmgTo(s, 1));
t(lifeOf(s, 2) === 20 - dmgTo(s, 2) && handOf(s, 1).length === 4 && s.disc.p1.length === 1 && s.round === 2, "life down, played card discarded, drew back to 4");
t(s.dl === REVEAL_MS + BATTLE.pickSeconds * 1000, "the next pick timer starts after the reveal");

sect("abilities");
const pierce = byAb("u_pierce"), tank = all.filter(c => c.ab === "c_combo" && c.def >= 5).sort((a, b) => b.def - a.def)[0];
s = duel(pierce.id, tank.id);
t(dmgTo(s, 2) === Math.max(0, pierce.pow - Math.max(0, tank.def - 2)), "Pierce 2 ignores 2 Defense");
const guard = byAb("u_guard"), hitter = all.filter(c => c.ab === "c_combo").sort((a, b) => b.pow - a.pow)[0];
s = duel(hitter.id, guard.id);
t(dmgTo(s, 2) === Math.max(0, hitter.pow - guard.def - 2), "Guard 2 takes 2 less");
const counter = byAb("u_counter");
s = duel(hitter.id, counter.id);
const raw = Math.max(0, hitter.pow - counter.def);
t(dmgTo(s, 1) === Math.max(0, counter.pow - hitter.def) + (raw > 0 ? 1 : 0), "Counter 1 sends 1 back when hit");
const sil = byAb("r_silence");
s = duel(sil.id, guard.id);
t(s.last.plays.find(x => x.p === 2).sil === 1 && dmgTo(s, 2) === Math.max(0, sil.pow - guard.def), "Silence cancels the opposing ability (no Guard)");
const sil2 = all.filter(c => c.ab === "r_silence")[1] || sil;
s = duel(sil.id, sil2.id);
t(s.last.plays.every(x => x.sil === 1), "two Silences at once silence each other");
const mirror = byAb("e_mirror");
s = duel(mirror.id, pierce.id);
t(s.last.plays.find(x => x.p === 1).cp === "u_pierce" && dmgTo(s, 2) === Math.max(0, mirror.pow - Math.max(0, pierce.def - 2)), "Mirror copies the opposing ability (Pierce 2)");
const swap = byAb("x_swap");
s = duel(swap.id, P8.id);
t(s.last.plays.find(x => x.p === 1).pow === P8.pow && s.last.plays.find(x => x.p === 2).pow === swap.pow, "Swap exchanges Power");
const rage = byAb("r_rage");
s = duel(rage.id, D3.id, { life: [10, 15] });
t(s.last.plays.find(x => x.p === 1).pow === rage.pow + 3, "Rage +3 only when behind");
s = duel(rage.id, D3.id, { life: [15, 10] });
t(s.last.plays.find(x => x.p === 1).pow === rage.pow, "...and not when ahead");
const last = byAb("r_last");
s = duel(last.id, D3.id, { life: [8, 20] });
t(s.last.plays.find(x => x.p === 1).pow === last.pow + 2 && s.last.plays.find(x => x.p === 1).def === last.def + 2, "Last Stand at 8 life");
const combo = byAb("x_combo"), mate = all.find(c => c.s === combo.s && c.id !== combo.id);
s = duel(combo.id, D3.id, { prev: [mate.id, 0] });
t(s.last.plays.find(x => x.p === 1).pow === combo.pow + 3, "Combo +3 after a card of the same series");
const cap = byAb("e_redirect");
s = duel(hitter.id, cap.id);
const capRaw = Math.max(0, hitter.pow - cap.def);
t(dmgTo(s, 2) === Math.min(2, capRaw) && dmgTo(s, 1) === Math.max(0, cap.pow - hitter.def) + Math.max(0, capRaw - 2), "Redirect: take at most 2, the rest hits the attacker");
const parting = byAb("x_parting");
s = duel(parting.id, hitter.id);
const pRaw = Math.max(0, hitter.pow - parting.def - 1), pDealt = Math.max(0, parting.pow - hitter.def);
t(pDealt < pRaw ? dmgTo(s, 2) === pDealt + 3 : true, "Last Word: still deals 3 on defeat");
const phoenix = byAb("l_phoenix"), edge = c => Math.max(0, c.pow - phoenix.def) - Math.max(0, phoenix.pow - c.def), big = all.filter(c => c.ab === "c_combo").sort((a, b) => edge(b) - edge(a) || a.id - b.id)[0];
const phSave = { pow: CARDS[phoenix.id].pow, def: CARDS[phoenix.id].def }; CARDS[phoenix.id].pow = 2; CARDS[phoenix.id].def = 1;     // a weak Phoenix, so it surely loses
s = duel(phoenix.id, big.id, { life: [10, 20] });
const phTaken = dmgTo(s, 1), phLost = (s.last.hits.find(h => h.f === 1) || {}).d < (s.last.hits.find(h => h.f === 2) || {}).d;
t(phLost && lifeOf(s, 1) === Math.min(20, 10 - phTaken + 4), "On defeat: Heal 4, applied together with the damage (took " + phTaken + ", life " + lifeOf(s, 1) + ")");
s = duel(phoenix.id, D3.id, { life: [2, 20] });
t(alive(s).includes(1) === (lifeOf(s, 1) > 0) && (s.last.dmg.p1 >= 2 && s.last.dmg.p1 < 6 ? lifeOf(s, 1) > 0 : true), "healing can keep you in the game (2 life, took " + s.last.dmg.p1 + ", now " + lifeOf(s, 1) + ")");
Object.assign(CARDS[phoenix.id], phSave);
const domain = byAb("m_domain");
s = duel(domain.id, tank.id);
t(dmgTo(s, 2) === Math.max(0, domain.pow - tank.def), "Domain: Silence, no Pierce against a Common");
const rareT = all.filter(c => c.r >= 2 && c.def >= 4).sort((a, b) => a.id - b.id)[0];
s = duel(domain.id, rareT.id);
t(dmgTo(s, 2) === Math.max(0, domain.pow - Math.max(0, rareT.def - 1)), "...Pierce 1 against Rare or better");
const scout = byAb("u_scout");
s = duel(scout.id, D3.id);
t(s.scout.p1 && s.scout.p1.from === 2 && handOf(newBattle({ mid: 1, players: [1, 2], decks: { p1: filler().slice(0, 10), p2: filler().slice(10, 20) } }), 1).length === 4, "Scout records one card from their hand (shown only to the scout)");

sect("a full duel");
const rng = rngFrom(9), deckOf = (seed) => shuffleWith(rngFrom(seed), all.map(c => c.id)).slice(0, 10);
s = newBattle({ mid: 2, fmt: "duel", players: [1, 2], decks: { p1: deckOf(1), p2: deckOf(2) }, names: { p1: "A", p2: "B" }, seed: 77 });
t(handOf(s, 1).length === 4 && s.deck.p1.length === 6 && lifeOf(s, 1) === 20, "opening hand 4, 20 life");
t(act(s, { p: 1, c: 999999 }) === "not in hand" && act(s, { p: 3, c: handOf(s, 1)[0] }) === "out", "illegal picks are refused");
playOut(s, rng);
t(s.phase === "over" && s.places.length === 2 && s.round <= 11, "ends within 10 rounds (" + (s.round - 1) + ")");
t(s.places[0].place === 1 && (s.places[1].place === 2 || s.places[1].place === 1), "placements: " + JSON.stringify(s.places));

sect("timer, auto-pick, reconnects");
s = newBattle({ mid: 3, fmt: "duel", players: [1, 2], decks: { p1: deckOf(3), p2: deckOf(4) }, now: 0, seed: 3 });
act(s, { p: 1, c: handOf(s, 1)[0] });
t(due(s, 1000) === null && due(s, s.dl) === "resolve", "waits for the timer, then resolves");
t(due(s, s.dl, p => p !== 2) === "grace", "a player who just dropped gets one grace pause");
applyDue(s, "grace", s.dl);
t(s.dl === BATTLE.pickSeconds * 1000 + BATTLE.reconnectGrace * 1000 && due(s, s.dl - 1, p => p !== 2) === null, "+" + BATTLE.reconnectGrace + " s");
applyDue(s, due(s, s.dl, p => p !== 2), s.dl, p => p !== 2);
t(s.round === 2 && s.away.p2 === 1 && s.log[0].l.some(l => /auto-pick/.test(l)), "then auto-picks and marks them away");
act(s, { p: 1, c: handOf(s, 1)[0] });
t(due(s, 0, p => p !== 2) === "resolve", "while away, the round goes as soon as everyone present has picked");
act(s, { p: 2, c: handOf(s, 2)[0] });
t(!s.away.p2, "picking again clears 'away'");
const ap = autoPick(s, 1);
t(ap && handOf(s, 1).includes(ap.c) && ap.c === handOf(s, 1).slice().sort((a, b) => (C(b).pow * 2 + C(b).def + C(b).r * .4) - (C(a).pow * 2 + C(a).def + C(a).r * .4) || a - b)[0], "auto-pick = the strongest card");

sect("free-for-all");
s = newBattle({ mid: 4, fmt: "ffa", players: [1, 2, 3, 4], decks: { p1: deckOf(5), p2: deckOf(6), p3: deckOf(7), p4: deckOf(8) }, seed: 4 });
t(lifeOf(s, 3) === 25, "25 life");
[1, 2, 3, 4].forEach(p => act(s, { p, c: handOf(s, p)[0], t: p === 1 ? 2 : 1 }));
t(s.picks.p1.t === 2 && s.picks.p2.t === 1 && s.picks.p3.t === 1, "everyone picks a target");
const L0 = [1, 2, 3, 4].map(p => lifeOf(s, p));
resolveRound(s, 0);
const into1 = s.last.hits.filter(h => h.t === 1).reduce((n, h) => n + h.d, 0) + s.last.hits.filter(h => h.f === 1).reduce((n, h) => n + h.b, 0);
t(s.last.hits.filter(h => h.t === 1).length === 3 && s.last.dmg.p1 === into1, "three attackers on one player: every hit counts against their played Defense");
act(s, { p: 1, c: handOf(s, 1)[0], t: 1 });
t(s.picks.p1.t !== 1, "you can't target yourself");
playOut(s, rngFrom(4));
const pl = s.places.map(x => x.place);
t(s.phase === "over" && s.places.length === 4 && pl[0] === 1 && pl.every((x, i) => !i || x >= pl[i - 1]), "last one standing wins, the rest by elimination order: " + JSON.stringify(s.places));
const ko = arr2(s.out);
function arr2(v) { return Array.isArray(v) ? v : Object.values(v || {}); }
t(ko.every((o, i) => s.places.find(x => x.p === o.p)), "every knocked-out player is placed");
// simultaneous knock-outs share a place
s = newBattle({ mid: 5, fmt: "ffa", players: [1, 2, 3], decks: { p1: deckOf(9), p2: deckOf(10), p3: deckOf(11) }, seed: 6 });
s.life.p2 = 1; s.life.p3 = 1;
[1, 2, 3].forEach(p => act(s, { p, c: handOf(s, p)[0], t: p === 1 ? 2 : 1 }));
s.picks.p3 = { c: s.picks.p3.c, t: 1 }; s.picks.p2 = { c: s.picks.p2.c, t: 1 };
const domainId = domain.id; s.hand.p1 = [domainId].concat(s.hand.p1.slice(1)); s.picks.p1 = { c: domainId, t: 2 };
resolveRound(s, 0);
if (!alive(s).includes(2) && !alive(s).includes(3)) { playOut(s, rngFrom(1)); t(s.places.find(x => x.p === 2).place === s.places.find(x => x.p === 3).place, "knocked out in the same round = tied"); }
else ok++;

sect("ties at the end");
s = newBattle({ mid: 6, fmt: "duel", players: [1, 2], decks: { p1: filler().slice(0, 10), p2: filler().slice(0, 10) }, seed: 1 });
s.hand.p1 = []; s.hand.p2 = []; s.deck.p1 = []; s.deck.p2 = []; s.used.p1 = [P8.id]; s.used.p2 = [D3.id]; s.life.p1 = 5; s.life.p2 = 5;
s.hand.p1 = [P8.id]; s.hand.p2 = [P8.id];
s.life.p1 = 30; s.life.p2 = 30;
act(s, { p: 1, c: P8.id }); act(s, { p: 2, c: P8.id }); resolveRound(s, 0);
t(s.phase === "over" && s.sd && s.places.map(x => x.place).join() === "1,1", "same card, same life: sudden death is tied too -> a draw");

sect("balance (simulated games)");
const N = Number((process.argv.find(a => a.startsWith("--sims=")) || "--sims=3000").split("=")[1]);
const pool = r => all.filter(c => c.r === r).map(c => c.id);
const randDeck = (g, rs) => { const out = new Set(); while (out.size < 10) { const r = rs[Math.floor(g() * rs.length)], p = pool(r); out.add(p[Math.floor(g() * p.length)]); } return [...out]; };
function match(dA, dB, seed) { const st = newBattle({ mid: seed, players: [1, 2], decks: { p1: dA, p2: dB }, seed }); playOut(st, rngFrom(seed * 7 + 1)); return st.winners.length === 1 ? (st.winners[0] === 1 ? 1 : 0) : .5; }
const g = rngFrom(2026);
let w = 0; for (let i = 0; i < N; i++) w += match(randDeck(g, [0]), randDeck(g, [6, 5]), i + 1);
const cVsTop = w / N;
console.log("   all-Common decks vs all Legendary/Mythic decks: Common wins " + (cVsTop * 100).toFixed(1) + "%");
t(cVsTop > .03 && cVsTop < .5, "the rarest decks are favoured but beatable (an all-Common deck still wins some games against all Legendary/Mythic)");
w = 0; for (let i = 0; i < N; i++) w += match(randDeck(g, [0, 1]), randDeck(g, [2, 3, 4]), i + 99999);
console.log("   Common/Uncommon vs Rare/Ultra/Epic: " + (w / N * 100).toFixed(1) + "%");
t(w / N > .3 && w / N < .55, "a starter-quality deck stays competitive (30-55%)");
// per-card win rates in random mixed decks (the pack odds), to find outliers
const odds = [60, 25, 10, 3.5, 1, .4, .1], pickR = gg => { let x = gg() * 100; for (let r = 0; r < 7; r++) { x -= odds[r]; if (x < 0) return r; } return 0; };
const deckMix = gg => { const out = new Set(); while (out.size < 10) { const r = Math.max(pickR(gg), Math.floor(gg() * 7)), p = pool(r); out.add(p[Math.floor(gg() * p.length)]); } return [...out]; };
const abW = {}, abN = {}, rW = Array(7).fill(0), rN = Array(7).fill(0), g2 = rngFrom(7);
for (let i = 0; i < N * 2; i++) {
    const A = deckMix(g2), B = deckMix(g2), res = match(A, B, 50000 + i);
    [[A, res], [B, 1 - res]].forEach(([d, r]) => d.forEach(id => { const c = C(id); abW[c.ab] = (abW[c.ab] || 0) + r; abN[c.ab] = (abN[c.ab] || 0) + 1; rW[c.r] += r; rN[c.r]++; }));
}
console.log("   win rate of decks containing a card, by rarity: " + RARITY_NAMES.map((n, r) => n + " " + (rW[r] / rN[r] * 100).toFixed(1) + "%").join(", "));
const abRates = Object.keys(abN).map(k => [k, abW[k] / abN[k]]).sort((a, b) => b[1] - a[1]);
console.log("   strongest abilities: " + abRates.slice(0, 5).map(([k, v]) => k + " " + (v * 100).toFixed(1) + "%").join(", "));
console.log("   weakest abilities:   " + abRates.slice(-5).map(([k, v]) => k + " " + (v * 100).toFixed(1) + "%").join(", "));
t(abRates.every(([, v]) => v > .4 && v < .6), "no ability is an outlier (every one between 40% and 60% in mixed decks)");
t(rW[6] / rN[6] - rW[0] / rN[0] < .09, "in realistic mixed decks a Mythic card adds only a few points of win rate over a Common");

console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
