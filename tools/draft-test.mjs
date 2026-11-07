// Anime Draft: unit tests for the rules engine (no browser, no Firebase).
// Run: node tools/draft-test.mjs
import fs from "fs";
import { buildDb, charRoles, roleSetFor, newMatch, act, actorOf, pickerOf, standings, autoMove, teamBreakdown, canPass, clashOf, clashTotal, DRAFT_RULES } from "../js/draft/draft.js";
import { RARITIES, CHARS, ROLESETS } from "../js/draft/data.js";

let ok = 0, bad = 0;
const t = (c, m) => { if (c) ok++; else { bad++; console.log("  ✘", m); } };
const pop = JSON.parse(fs.readFileSync(new URL("../data/draft-pop.json", import.meta.url), "utf8"));
const packs = JSON.parse(fs.readFileSync(new URL("../packs.json", import.meta.url), "utf8"));
const db = buildDb(pop, packs), all = Object.values(db), N = all.length;
let clock = 1000;
const rarity = id => db[id].r, ctx = (present) => ({ present: present || (() => true), rarity, now: clock });
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const S = (k, ...rest) => Object.assign({}, ...rest, { k });

/* ---- rarity: per series, by power and story importance (RANKS), not popularity ---- */
const by = RARITIES.map((R, i) => all.filter(c => c.r === i));
console.log("rarity counts:", RARITIES.map((R, i) => R.name + " " + by[i].length).join(", "), "of", N);
const named = n => all.find(c => c.n === n);
t(["Satoru Gojo", "Ryomen Sukuna", "Monkey D. Luffy", "Goku", "Light Yagami", "Yoriichi Tsugikuni"].every(n => named(n).r === 0), "series heavyweights are Mythical (Gojo, Sukuna, Luffy, Goku, Light, Yoriichi)");
t(named("Levi Ackerman").r === 1 && named("Ymir Fritz").r === 0, "rarity ignores popularity: Levi (most-favourited AoT) Legendary, Ymir Fritz (few fans, the source of all Titans) Mythical");
t(named("Buggy").r === 4 && named("Yamcha").r === 4, "minor fighters are Common (Buggy, Yamcha)");
t(Object.keys(CHARS).every(k => all.some(c => c.s === k && c.r === 0)), "every series has its own Mythical");
t(Object.keys(CHARS).every(k => { const cs = all.filter(c => c.s === k); return cs.filter(c => c.r === 0).length <= Math.ceil(cs.length * .12); }), "Mythical stays scarce in every series (12% at most)");
const fresh = buildDb(null, null);
t(all.every(c => fresh[c.id].r === c.r), "rarity does not depend on the popularity file");

/* ---- role scores ---- */
const luffy = db[40], light = db[80], tanjiro = db[126071], goku = db[246];
t(roleSetFor(["onepiece"], false) === "onepiece" && roleSetFor(["onepiece", "jjk"], false) === "mixed" && roleSetFor(["jjk"], true) === "classic", "role set: one series / mixed / classic");
const lr = CHARS.onepiece.find(r => r[0] === 40);
t(charRoles(luffy, "onepiece", false).map(x => x.score).join() === [lr[2], lr[3], lr[4], lr[5], lr[8], lr[9]].join(), "One Piece roles read STR SPD IQ DUR Haki DF");
t(charRoles(light, "deathnote", false).map(x => x.score).join() === "99,95,98,99,99,98", "Death Note uses its own six roles");
t(ROLESETS.deathnote[5] === "Psychological Warfare" && ROLESETS.jojo[5].includes("Hamon"), "role names");
const tm = charRoles(tanjiro, "mixed", true), gm = charRoles(goku, "mixed", true);
t(tm[0].mult === .62 && tm[0].score === Math.round(tanjiro.v[0] * .62) && gm[0].mult === 1 && gm[0].score === goku.v[0], "Mixed: Strength scaled by series tier (Tanjiro " + tm[0].score + ", Goku " + gm[0].score + ")");
t(tm[2].mult === 1 && tm[4].mult === 1, "Mixed: IQ and Combat Skill are not scaled");
t(charRoles(luffy, "classic", false).every(x => x.mult === 1) && charRoles(luffy, "classic", true)[2].mult === .9, "Classic: Tank / Duelist only scaled in a mixed match");
t(Object.values(CHARS).every(rows => rows.every(r => charRoles(db[r[0]], "mixed", true).every(x => x.score >= 1 && x.score <= 100))), "every Mixed score is 1..100");

/* ---- hybrid scoring: rarity never beats role skill ---- */
const s0 = { rs: "onepiece", mixed: false, rar: {} };
const common100 = { ...luffy, id: 1, r: 4, v: luffy.v.slice() }; common100.v[0] = 100;
const myth70 = { ...luffy, id: 2, r: 0, v: luffy.v.slice() }; myth70.v[0] = 70;
const tb = id => teamBreakdown(s0, [id, 0, 0, 0, 0, 0], { 1: common100, 2: myth70 }).total;
t(tb(1) === 100 && tb(2) === 78, "Common 100 Strength (100) beats Mythical 70 Strength (70 + 8)");

/* ---- Build: 1v1, both sides pick at the same time ---- */
const pool1 = CHARS.onepiece.map(r => r[0]), PICK = DRAFT_RULES.pickSec * 1000;
let s = newMatch({ type: "build", series: ["onepiece"], classic: false, mid: 1, pool: pool1, sides: { L: [1], R: [2] }, rarity, rnd, now: clock });
t(s.phase === "pick" && s.cur.L && s.cur.R && s.cur.L !== s.cur.R && s.rr.L === 1 && s.rr.R === 1, "Build starts: both sides have a pull at once, one reroll each");
t(s.dl.L === clock + PICK && s.dl.R === clock + PICK, "a pick deadline per side (" + DRAFT_RULES.pickSec + " s)");
t(act(s, { k: "place", slot: 0, by: 3 }, ctx()) === "You're watching this draft.", "a spectator can't pick");
const l0 = s.cur.L, r0 = s.cur.R;
t(act(s, { k: "place", slot: 2, by: 2 }, ctx()) === null && s.team.R[2] === r0 && s.cur.R && s.cur.R !== r0 && s.cur.L === l0, "Right places first: no waiting for Left; Right pulls its next card");
clock += 5000;
t(act(s, { k: "reroll", by: 1 }, ctx()) === null && s.cur.L !== l0 && s.rr.L === 0 && s.gone.includes(l0) && s.dl.L === clock + PICK, "Left rerolls: a fresh pull, a fresh timer");
t(act(s, { k: "reroll", by: 1 }, ctx()) === "Your reroll is already used.", "one reroll per match");
t(act(s, { k: "place", slot: 9, by: 1 }, ctx()) !== null, "invalid slot rejected");
act(s, { k: "place", slot: 0, by: 1 }, ctx());
t(act(s, { k: "place", slot: 0, by: 1 }, ctx()) === "That role is already filled.", "filled role rejected");
const ev = JSON.stringify(s.ev);
t(s.ev.k === "place" && !/"c"/.test(ev), "the place event doesn't name the character (" + ev + ")");
// the host plays a timed-out / away side
const before = s.team.L.filter(Number).length, top = s.team.L.findIndex(x => !Number(x)), next = s.cur.L;
t(DRAFT_RULES.pickSec === 60, "pick timer: 60 s");
t(act(s, autoMove(s, db, "L"), Object.assign(ctx(), { force: true })) === null && s.team.L.filter(Number).length === before + 1 && s.team.L[top] === next, "timer out / away: the host puts the card in the first free role from the top (role " + (top + 1) + ")");
t(autoMove(s, db, "L").slot === s.team.L.findIndex(x => !Number(x)), "the next auto-place is the next free role down");
let guard = 0;
while (s.phase === "pick" && guard++ < 40) ["L", "R"].forEach(k => { if (s.cur[k]) act(s, { k: "place", slot: autoMove(s, db, k).slot, by: k === "L" ? 1 : 2 }, ctx()); });
t(s.phase === "clash" && s.clash.at === clock && s.team.L.every(Boolean) && s.team.R.every(Boolean) && !s.cur.L && !s.cur.R, "both boards full → the clash starts (clash.at = now)");
t(act(s, { k: "place", slot: 0, by: 1 }, ctx()) === "The clash is on.", "no picks during the clash");
t(act(s, { k: "end" }, ctx()) !== null && s.phase === "clash", "only the host's forced move ends the clash");
const used = s.team.L.concat(s.team.R).concat(s.gone);
t(new Set(used).size === used.length, "no character drawn twice (incl. the rerolled one)");
t(used.every(id => db[id].s === "onepiece"), "only characters from the ticked series");
const K = clashOf(s, db);
t(K.rows.length === 6 && K.rows.every((r, i) => r.L.stat === charRoles(db[s.team.L[i]], s.rs, false)[i].score && r.R.stat === charRoles(db[s.team.R[i]], s.rs, false)[i].score), "the clash compares each role's stat");
t(K.rows.every(r => r.win === (r.L.stat > r.R.stat ? "L" : r.R.stat > r.L.stat ? "R" : "")), "higher stat wins the role, equal = draw");
t(K.wins.L + K.wins.R === K.rows.filter(r => r.win).length && K.tot.L === K.rows.reduce((n, r) => n + r.L.stat, 0), "role wins + stat totals add up (" + K.wins.L + "-" + K.wins.R + ", " + K.tot.L + "-" + K.tot.R + ")");
t(act(s, { k: "end" }, Object.assign(ctx(), { force: true })) === null && s.phase === "over", "the host ends the clash → over (the result is reported then)");
const st = standings(s, db);
t(st.length === 2 && (K.winner ? st[0].key === K.winner && st[0].place === 1 && st[1].place === 2 : st[0].place === 1 && st[1].place === 1), "standings: the clash winner 1st, the loser 2nd (draw = both 1st)");
t(act(s, { k: "place", slot: 0, by: 1 }, ctx()) === "The draft is over.", "no moves after the end");
t(clashTotal() === DRAFT_RULES.clash.revealMs + 5 * DRAFT_RULES.clash.roleMs + DRAFT_RULES.clash.finalMs + DRAFT_RULES.clash.endMs, "clash length from the config");

/* ---- Build: the clash's tiebreaks (made-up stats) ---- */
const fake = (id, v) => ({ id, n: "C" + id, s: "onepiece", v, r: 4 });
const mk = (L, Rr) => { const d2 = {}, s2 = { rs: "onepiece", mixed: false, rar: {}, team: { L: [], R: [] } };
    L.forEach((x, i) => { const v = Array(16).fill(1); [0, 1, 2, 3, 6, 7].forEach((j, k) => { v[j] = k === i ? x : 1; }); d2[100 + i] = fake(100 + i, v); s2.team.L.push(100 + i); });
    Rr.forEach((x, i) => { const v = Array(16).fill(1); [0, 1, 2, 3, 6, 7].forEach((j, k) => { v[j] = k === i ? x : 1; }); d2[200 + i] = fake(200 + i, v); s2.team.R.push(200 + i); });
    return clashOf(s2, d2); };
let k1 = mk([90, 90, 90, 10, 10, 10], [10, 10, 10, 20, 20, 20]);
t(k1.wins.L === 3 && k1.wins.R === 3 && k1.winner === "L" && k1.by === "total", "3-3 on roles: the higher total wins (" + k1.tot.L + "-" + k1.tot.R + ")");
k1 = mk([50, 50, 50, 50, 50, 50], [50, 50, 50, 50, 50, 50]);
t(k1.wins.L === 0 && k1.winner === "" && k1.by === "draw" && k1.rows.every(r => r.win === ""), "every role equal: all draws, totals equal → a draw");
k1 = mk([60, 60, 60, 60, 10, 10], [50, 50, 50, 50, 90, 90]);
t(k1.winner === "L" && k1.by === "roles" && k1.tot.R > k1.tot.L, "more roles beats a higher total (4-2)");

/* ---- Build: 2v2, both sides at once, members rotate, an away teammate is skipped ---- */
s = newMatch({ type: "build", series: ["naruto", "bleach"], classic: true, mid: 2, pool: CHARS.naruto.concat(CHARS.bleach).map(r => r[0]), sides: { L: [1, 3], R: [2, 4] }, rarity, rnd, now: clock });
t(s.rs === "classic" && s.mixed, "Classic roles toggle replaces the role set");
const order = { L: [], R: [] };
while (s.phase === "pick") ["L", "R"].forEach(k => { if (!s.cur[k]) return; const p = pickerOf(s, k); order[k].push(p); act(s, { k: "place", slot: autoMove(s, db, k).slot, by: p }, ctx()); });
t(order.L.join() === "1,3,1,3,1,3" && order.R.join() === "2,4,2,4,2,4", "2v2: each side's members take turns (" + order.L.join("") + " / " + order.R.join("") + ")");
s = newMatch({ type: "build", series: ["jjk"], classic: false, mid: 3, pool: CHARS.jjk.map(r => r[0]), sides: { L: [1, 3], R: [2, 4] }, rarity, rnd, now: clock });
t(act(s, { k: "place", slot: 0, by: 3 }, ctx()) === "It's your teammate's pick.", "not your turn on your side");
act(s, { k: "place", slot: 0, by: 1 }, ctx());
t(pickerOf(s, "L", p => p !== 3) === 1 && act(s, { k: "place", slot: 1, by: 3 }, ctx(p => p !== 3)) === "It's your teammate's pick.", "an away teammate is skipped, the other member drafts");
t(act(s, { k: "place", slot: 1, side: "R" }, Object.assign(ctx(() => false), { force: true })) === null && s.team.R[1], "the host can place for an away side");

/* ---- Auction ---- */
const poolA = CHARS.onepiece.concat(CHARS.naruto).map(r => r[0]);
let a = newMatch({ type: "auction", series: ["onepiece", "naruto"], classic: false, mid: 4, pool: poolA, players: [1, 2, 3], rarity, rnd });
t(a.phase === "bid" && a.lot.turn === 1 && a.budget.p1 === 25 && a.lot.hi === 0, "auction opens with player 1, $25 each, no bid");
t(act(a, { k: "bid", amount: 0, by: 1 }, ctx()) === "Bid at least $1.", "opening bid at least $1");
t(act(a, { k: "bid", amount: 26, by: 1 }, ctx()) === "You only have $25.", "can't bid more than the budget");
t(act(a, { k: "bid", amount: 3, by: 1 }, ctx()) === null && a.lot.turn === 2, "bid $3 → next player");
t(act(a, { k: "bid", amount: 3, by: 2 }, ctx()) === "Bid at least $4.", "a bid must beat the last one by $1");
t(act(a, { k: "bid", amount: 5, by: 2 }, ctx()) === null && a.lot.turn === 3, "bid $5 → next");
t(act(a, { k: "pass", by: 3 }, ctx()) === null && a.lot.turn === 1, "pass → back to player 1");
t(act(a, { k: "pass", by: 1 }, ctx()) === null && a.phase === "won" && a.win.p === 2 && a.win.amt === 5 && a.budget.p2 === 20, "everyone else passed: sold to the high bidder, money paid");
t(act(a, { k: "pass", by: 2 }, ctx()) !== null, "no bidding while the winner places");
const won = a.win.c;
t(act(a, { k: "place", slot: 4, by: 2 }, ctx()) === null && a.team.p2[4] === won && a.phase === "bid" && a.lot.turn === 2, "winner places; next lot opens with the next player");
t(act(a, { k: "pass", by: 2 }, ctx()) === null && act(a, { k: "pass", by: 3 }, ctx()) === null && act(a, { k: "pass", by: 1 }, ctx()) === null && a.ev.k === "unsold" && a.phase === "bid", "everyone passes with no bid: unsold, next lot");
t(a.lot.turn === 3, "opener keeps rotating");
// spend player 3 down to $0, then they can't bid
act(a, { k: "bid", amount: 25, by: 3 }, ctx());
t(a.phase === "won" && a.win.p === 3 && a.budget.p3 === 0, "a $25 bid nobody can beat sells at once");
act(a, { k: "place", slot: 0, by: 3 }, ctx());
guard = 0;
while (a.phase !== "over" && guard++ < 400) {
    const p = actorOf(a);
    if (a.phase === "bid") { t(p !== 3, "a broke player is never asked to bid"); const m = a.budget["p" + p], need = a.lot.hi ? a.lot.hi + 1 : 1; act(a, rnd() < .5 && m >= need ? { k: "bid", amount: need, by: p } : { k: "pass", by: p }, ctx()); }
    else { const mv = autoMove(a, db); mv.by = p; act(a, mv, ctx()); }
}
t(a.phase === "over", "auction ends when nobody can buy any more");
t([1, 2].every(p => a.team["p" + p].every(Boolean) || a.budget["p" + p] < 1), "it ended because teams are full or money is out");
t(a.budget.p1 >= 0 && a.budget.p2 >= 0 && a.budget.p3 === 0, "budgets never go negative");
const ids = [1, 2, 3].flatMap(p => a.team["p" + p].filter(Boolean));
t(new Set(ids).size === ids.length, "no character owned twice");
const sa = standings(a, db);
t(sa.length === 3 && sa[0].place === 1 && sa.every((x, i) => !i || x.place >= sa[i - 1].place), "auction ranks every player (1st, 2nd, 3rd)");
t(sa.find(x => x.key === "p3").rows.filter(r => !r.c).every(r => r.total === 0), "an empty role scores 0");

/* ---- Auction: the last buyer gets one pass, then must buy every lot ---- */
a = newMatch({ type: "auction", series: ["onepiece", "naruto"], classic: false, mid: 5, pool: poolA, players: [1, 2], rarity, rnd });
act(a, { k: "bid", amount: 25, by: 1 }, ctx()); act(a, { k: "place", slot: 0, by: 1 }, ctx());
t(a.phase === "bid" && a.lot.turn === 2 && canPass(a, 2), "player 2 is the last buyer and still has the pass");
const c1 = a.lot.c;
t(act(a, { k: "pass", by: 2 }, ctx()) === null && a.ev.k === "unsold" && a.lot.c !== c1 && a.lot.turn === 2, "the one pass redraws");
t(!canPass(a, 2) && /one pass/.test(act(a, { k: "pass", by: 2 }, ctx())) && a.lot.turn === 2, "a second pass is refused");
const mv = autoMove(a, db);
t(mv.k === "bid" && mv.amount === 1, "an away last buyer auto-buys for $1 instead of passing");
t(act(a, { k: "bid", amount: 1, by: 2 }, ctx()) === null && a.phase === "won" && a.win.p === 2, "the lot is bought");
act(a, { k: "place", slot: 0, by: 2 }, ctx());
t(!canPass(a, 2), "the pass stays used for the rest of the draft");
a = newMatch({ type: "auction", series: ["onepiece", "naruto"], classic: false, mid: 6, pool: poolA, players: [1, 2], rarity, rnd });
t(act(a, { k: "pass", by: 1 }, ctx()) === null && act(a, { k: "pass", by: 2 }, ctx()) === null && canPass(a, 1) && canPass(a, 2) && !a.spass, "with rivals still buying, passing is unlimited");

console.log("PASS", ok, "FAIL", bad, "| rules:", JSON.stringify(DRAFT_RULES));
process.exit(bad ? 1 : 0);
