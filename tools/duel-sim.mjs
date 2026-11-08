// Anime TCG: bot-vs-bot simulation with the real cards (balance + crash check). Run: node tools/duel-sim.mjs [games] [players]
// Reports win rate of the player going first, average turns / rounds, how duels end, and any engine error.
import { newDuel, act, useDefs, legalMoves, why } from "../js/duel/engine.js?v=1";
import { botMove } from "../js/duel/bot.js";
import { DEFS, ACTION_IDS } from "../js/duel/cards.js";
import { CARDS } from "../js/vault/carddb.js";
import { DUEL } from "../js/vault/config.js";

const games = Number(process.argv[2]) || 300, np = Number(process.argv[3]) || 2, level = process.argv[4] || "normal";
useDefs(DEFS);
const RULES = Object.assign({}, DUEL.rules, process.env.RULES ? JSON.parse(process.env.RULES) : {});
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const ids = Object.keys(CARDS).map(Number);
const deck = () => { const pick = new Set(); while (pick.size < 16) pick.add(ids[Math.floor(rnd() * ids.length)]); const acts = []; for (let i = 0; i < 4; i++) acts.push("a:" + ACTION_IDS[Math.floor(rnd() * ACTION_IDS.length)]); return [...pick].concat(acts); };
const st = { firstWins: 0, turns: [], rounds: [], ends: {}, errors: [], stuck: 0, lifeLeft: [] };
for (let g = 0; g < games; g++) {
    const players = Array.from({ length: np }, (_, i) => i + 1), decks = {}, names = {};
    players.forEach(p => { decks["p" + p] = deck(); names["p" + p] = "B" + p; });
    let s, now = 0;
    try {
        s = newDuel({ id: "sim" + g, seed: 1 + g * 7, players, decks, names, now, rules: RULES });
        let steps = 0, seen = 0; const lastWhy = {}, outs = [];
        const scan = () => { s.ev.forEach(e => { if (e.n <= seen) return; seen = e.n; if (e.k === "life") lastWhy[e.p] = e.why; if (e.k === "out") outs.push(e.why === "deck" ? "deck out" : e.why === "concede" ? "concede" : lastWhy[e.p] === "stalemate" ? "Final Clash" : "combat"); }); };
        while (!s.over && steps < 4000) {
            steps++; now += 1000;
            const who = s.pending ? Number(s.pending.who) : Number(s.turnP);
            const m = botMove(s, who, level, DEFS, rnd);
            if (!m) { st.stuck++; break; }
            const r = act(s, Object.assign({ by: who }, m), now);
            if (r && r.error) { st.errors.push("illegal move " + JSON.stringify(m) + ": " + r.error); break; }
            scan();
        }
        if (!s.over) { st.stuck++; continue; }
        const winner = players.find(p => Number(s.place["p" + p]) === 1);
        if (winner === s.first) st.firstWins++;
        st.turns.push(s.turnNo); st.rounds.push(s.round);
        outs.forEach(o => { st.ends[o] = (st.ends[o] || 0) + 1; });
        st.lifeLeft.push(s.P["p" + winner].life);
    } catch (e) { st.errors.push("game " + g + ": " + (e.stack || e.message).split("\n").slice(0, 3).join(" | ")); }
}
const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10 : 0;
const pct = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? [b[Math.floor(b.length * .1)], b[Math.floor(b.length * .5)], b[Math.floor(b.length * .9)]] : []; };
console.log(`${games} games, ${np} players, bots: ${level}, life ${np > 2 ? RULES.lifeFfa : RULES.life}, ${JSON.stringify(np > 2 && RULES.stalemateFfa || RULES.stalemate)}`);
console.log(`finished ${st.turns.length}, stuck ${st.stuck}, errors ${st.errors.length}`);
console.log(`first player wins ${Math.round(st.firstWins / Math.max(1, st.turns.length) * 100)}%`);
console.log(`turns avg ${avg(st.turns)} (p10/p50/p90 ${pct(st.turns).join("/")}), rounds avg ${avg(st.rounds)}`);
console.log(`knock-outs by cause: ${JSON.stringify(st.ends)}, winner life left avg ${avg(st.lifeLeft)}`);
st.errors.slice(0, 6).forEach(e => console.log("  ERR", e));
