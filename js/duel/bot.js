/* =====================================================================
   ANIME TCG · PRACTICE BOT (Easy / Normal / Hard; DUEL.bots in config.js)
   Picks one move at a time from the engine's legal moves, by simple scores:
   - Main: summon the best character it can (tribute for a Legendary / Mythic when it improves the board), in Attack
     if it beats the opposing board, else Defense; set Counters; play Supports that do something now.
   - Battle: attack where the battle preview says it wins (or trades up), direct when the way is clear; in a free-for-all
     it focuses the opponent with the least life.
   - Response windows: use a matching Counter (Easy sometimes forgets).
   Easy blunders often (a random legal move), Normal sometimes, Hard never. It plays on the full state (it is local).
   ===================================================================== */
import { legalMoves, outcome, statOf, P, opponents, lifeOf, cardOf } from "./engine.js?v=1";
import { DUEL } from "../vault/config.js?v=15";

const arr = v => Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];
export function botMove(s, p, level = "normal", defs, rnd = Math.random) {
    const L = (DUEL.bots || {})[level] || { blunder: .1, risk: .5, counters: .8 };
    const moves = legalMoves(s, p); if (!moves.length) return null;
    const def = u => { const c = cardOf(s, u); if (!c) return null; return String(c.id).startsWith("a:") ? defs.action(String(c.id).slice(2)) : defs.card(Number(c.id)); };
    if (s.pending) {
        const res = moves.filter(m => m.k === "respond");
        return res.length && rnd() < L.counters ? res[0] : { k: "pass" };
    }
    if (rnd() < L.blunder) { const safe = moves.filter(m => m.k !== "phase"); if (safe.length) return safe[Math.floor(rnd() * safe.length)]; }
    const opp = opponents(s, p), oppBest = Math.max(0, ...opp.flatMap(q => arr(P(s, q).ch).map((c, i) => c ? statOf(s, q, i).atk : 0)));
    const score = m => {
        if (m.k === "summon") {
            const d = def(m.u); if (!d) return -1;
            let v = d.atk + d.def / 2 + (d.ab ? 300 : 0) + d.r * 100;
            if (m.trib && m.trib.length) { const lost = m.trib.reduce((n, i) => { const st = statOf(s, p, i); return n + st.atk + st.def / 2; }, 0); v -= lost; if (v < 300) return -1; }
            const wantAtk = d.atk >= oppBest || !opp.some(q => arr(P(s, q).ch).some(Boolean));
            v += (m.pos === "atk") === wantAtk ? 200 : -200;
            return 1000 + v;
        }
        if (m.k === "set") return 900;
        if (m.k === "support") {
            const d = def(m.u); if (!d) return -1;
            const heal = arr(d.ops).some(o => o.op === "heal"), dmg = arr(d.ops).some(o => o.op === "dmg" && o.who !== "self");
            if (heal && lifeOf(s, p) > (s.fmt === "ffa" ? DUEL.rules.lifeFfa : DUEL.rules.life) - 600) return 50;
            return dmg ? 700 : 800;
        }
        if (m.k === "ability") return 850;
        if (m.k === "position") {
            const c = P(s, p).ch[m.slot], st = statOf(s, p, m.slot);
            if (c.pos === "def" && st.atk > oppBest) return 600;
            if (c.pos === "atk" && st.atk < oppBest * .8 && s.phase === "main") return 400;
            return -1;
        }
        if (m.k === "attack") {
            // free-for-all: go for the opponent closest to going out (ties at random), not the first one in turn order
            const focus = opp.length > 1 ? -lifeOf(s, m.tp) / 50 + rnd() * 20 : 0;
            if (m.direct) return 2000 + statOf(s, p, m.slot).atk + focus;
            const o = outcome(s, p, m.slot, m.tp, m.tslot); if (!o) return -1;
            if (o.killT && !o.killA) return 1500 + (o.dmgTo === "def" ? o.dmg : 0) + focus;
            if (o.killT && o.killA) return rnd() < L.risk ? 700 : -1;
            if (!o.killA && o.dmgTo === "att") return -1;
            return o.killA ? -1 : 100;
        }
        if (m.k === "phase") return m.to === "battle" ? (s.phase === "main" ? 300 : -1) : 10;
        return 0;
    };
    let best = null, bv = -Infinity;
    moves.forEach(m => { const v = score(m); if (v > bv) { bv = v; best = m; } });
    if (bv < 0) return moves.find(m => m.k === "phase" && m.to === (s.phase === "main" && moves.some(x => x.k === "phase" && x.to === "battle") ? "battle" : "end")) || moves.find(m => m.k === "phase");
    return best;
}
