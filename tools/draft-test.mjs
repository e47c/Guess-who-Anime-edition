// Anime Draft: unit tests for the rules engine (no browser, no Firebase).
// Run: node tools/draft-test.mjs
import fs from "fs";
import { buildDb, charRoles, roleSetFor, newMatch, act, actorOf, standings, autoMove, teamBreakdown, DRAFT_RULES } from "../js/draft/draft.js";
import { RARITIES, CHARS, ROLESETS } from "../js/draft/data.js";

let ok = 0, bad = 0;
const t = (c, m) => { if (c) ok++; else { bad++; console.log("  ✘", m); } };
const pop = JSON.parse(fs.readFileSync(new URL("../data/draft-pop.json", import.meta.url), "utf8"));
const packs = JSON.parse(fs.readFileSync(new URL("../packs.json", import.meta.url), "utf8"));
const db = buildDb(pop, packs), all = Object.values(db), N = all.length;
const rarity = id => db[id].r, ctx = (present) => ({ present: present || (() => true), rarity });
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
t(charRoles(luffy, "onepiece", false).map(x => x.score).join() === "95,92,50,96,95,99", "One Piece roles read STR SPD IQ DUR Haki DF");
t(charRoles(light, "deathnote", false).map(x => x.score).join() === "99,95,98,99,99,98", "Death Note uses its own six roles");
t(ROLESETS.deathnote[5] === "Psychological Warfare" && ROLESETS.jojo[5].includes("Hamon"), "role names");
const tm = charRoles(tanjiro, "mixed", true), gm = charRoles(goku, "mixed", true);
t(tm[0].mult === .62 && tm[0].score === Math.round(78 * .62) && gm[0].score === 98, "Mixed: Strength scaled by series tier (Tanjiro " + tm[0].score + ", Goku " + gm[0].score + ")");
t(tm[2].mult === 1 && tm[4].mult === 1, "Mixed: IQ and Combat Skill are not scaled");
t(charRoles(luffy, "classic", false).every(x => x.mult === 1) && charRoles(luffy, "classic", true)[2].mult === .9, "Classic: Tank / Duelist only scaled in a mixed match");
t(Object.values(CHARS).every(rows => rows.every(r => charRoles(db[r[0]], "mixed", true).every(x => x.score >= 1 && x.score <= 100))), "every Mixed score is 1..100");

/* ---- hybrid scoring: rarity never beats role skill ---- */
const s0 = { rs: "onepiece", mixed: false, rar: {} };
const common100 = { ...luffy, id: 1, r: 4, v: luffy.v.slice() }; common100.v[0] = 100;
const myth70 = { ...luffy, id: 2, r: 0, v: luffy.v.slice() }; myth70.v[0] = 70;
const tb = id => teamBreakdown(s0, [id, 0, 0, 0, 0, 0], { 1: common100, 2: myth70 }).total;
t(tb(1) === 100 && tb(2) === 78, "Common 100 Strength (100) beats Mythical 70 Strength (70 + 8)");

/* ---- Build: 1v1 full match ---- */
const pool1 = CHARS.onepiece.map(r => r[0]);
let s = newMatch({ type: "build", series: ["onepiece"], classic: false, mid: 1, pool: pool1, sides: { L: [1], R: [2] }, rarity, rnd });
t(s.phase === "blind" && s.turn === "L" && s.cur && s.rr.L === 1 && s.rr.R === 1, "Build starts: Left draws, blind, one reroll each");
t(act(s, { k: "keep", by: 2 }, ctx()) === "It's not your turn.", "Right can't act on Left's turn");
t(act(s, { k: "place", slot: 0, by: 1 }, ctx()) && s.phase === "blind", "can't place before deciding keep / reroll");
const first = s.cur;
t(act(s, { k: "reroll", by: 1 }, ctx()) === null && s.cur !== first && s.phase === "place" && s.rr.L === 0 && s.gone.includes(first), "reroll: discards, draws a new one, goes straight to placing");
t(act(s, { k: "reroll", by: 1 }, ctx()) !== null, "no second reroll");
t(act(s, { k: "place", slot: 3, by: 1 }, ctx()) === null && s.team.L[3] && s.turn === "R" && s.phase === "blind", "place → Right's turn (blind, Right still has its reroll)");
t(act(s, { k: "keep", by: 2 }, ctx()) === null && s.phase === "place", "keep → place");
t(act(s, { k: "place", slot: 9, by: 2 }, ctx()) !== null, "invalid slot rejected");
act(s, { k: "place", slot: 0, by: 2 }, ctx());
t(s.turn === "L" && s.phase === "place", "Left (reroll used) skips the blind step");
t(act(s, { k: "place", slot: 3, by: 1 }, ctx()) === "That role is already filled.", "filled role rejected");
let guard = 0;
while (s.phase !== "over" && guard++ < 40) { const a = autoMove(s, db); a.by = actorOf(s); t(act(s, a, ctx()) === null, "auto move ok"); }
t(s.phase === "over" && s.team.L.every(Boolean) && s.team.R.every(Boolean), "Build ends with all 12 roles filled");
const used = s.team.L.concat(s.team.R).concat(s.gone);
t(new Set(used).size === used.length, "no character drawn twice (incl. the rerolled one)");
t(used.every(id => db[id].s === "onepiece"), "only characters from the ticked series");
const st = standings(s, db);
t(st.length === 2 && st[0].total >= st[1].total && st[0].total === st[0].roles + st[0].bonus, "standings: total = roles + rarity, sorted");
t(act(s, { k: "keep", by: 1 }, ctx()) === "The draft is over.", "no moves after the end");

/* ---- Build: 2v2 rotation, away teammate skipped ---- */
s = newMatch({ type: "build", series: ["naruto", "bleach"], classic: true, mid: 2, pool: CHARS.naruto.concat(CHARS.bleach).map(r => r[0]), sides: { L: [1, 3], R: [2, 4] }, rarity, rnd });
t(s.rs === "classic" && s.mixed, "Classic roles toggle replaces the role set");
const order = [];
while (s.phase !== "over") { const p = actorOf(s), a = autoMove(s, db); a.by = p; if (a.k === "place") order.push(p); act(s, a, ctx()); }
t(order.length === 12 && order.join() === "1,2,3,4,1,2,3,4,1,2,3,4", "2v2: sides alternate, members rotate (" + order.join(",") + ")");
s = newMatch({ type: "build", series: ["jjk"], classic: false, mid: 3, pool: CHARS.jjk.map(r => r[0]), sides: { L: [1, 3], R: [2, 4] }, rarity, rnd });
act(s, { k: "keep", by: 1 }, ctx()); act(s, { k: "place", slot: 0, by: 1 }, ctx()); act(s, { k: "keep", by: 2 }, ctx()); act(s, { k: "place", slot: 0, by: 2 }, ctx());
t(actorOf(s, p => p !== 3) === 1 && act(s, { k: "place", slot: 1, by: 3 }, ctx(p => p !== 3)) === "It's not your turn.", "an away teammate is skipped, the other member drafts");
t(act(s, { k: "place", slot: 1 }, Object.assign(ctx(() => false), { force: true })) === null || s.phase === "blind", "the host can play an away side's move");

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

console.log("PASS", ok, "FAIL", bad, "| rules:", JSON.stringify(DRAFT_RULES));
process.exit(bad ? 1 : 0);
