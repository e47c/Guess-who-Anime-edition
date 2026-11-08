/* =====================================================================
   ANIME TCG · ROOKIE TRAINING (a guided duel against a scripted bot)
   Six lessons in one duel: 1 summon · 2 attack (with the battle preview) · 3 positions · 4 a tribute summon ·
   5 a Support card · 6 a Counter (set it, then answer the bot's attack). The coach box says what to do and the card
   or zone to tap glows. The hand and the bot's moves are scripted, so every lesson can be done. The first completion
   pays a one-time reward (idempotent: an operation id on the wallet), it can be replayed any time.
   ===================================================================== */
import { P } from "./engine.js?v=1";

const arr = v => Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];
export const LESSONS = [
    { t: "Summon", say: "Tap the glowing card in your hand, then Summon in Attack, then a free zone. One Normal Summon per turn.", done: s => arr(P(s, 1).ch).some(Boolean) },
    { t: "Attack", say: "End your turn. On your next turn press To Battle, tap your character, then the bot's character: the preview shows the outcome. Attack!", done: (s, a) => a && a.k === "attack" },
    { t: "Positions", say: "Back in your Main phase next turn: tap one of your characters and Switch to Defense. Defense uses DEF and you take no damage when it is attacked.", done: (s, a) => a && a.k === "position" },
    { t: "Tribute", say: "Legendary and Mythic characters need a tribute. Tap the Legendary in your hand, Summon in Attack, then tap one of your characters to sacrifice it.", done: (s, a) => a && a.k === "summon" && arr(a.trib).length > 0 },
    { t: "Support", say: "Support cards resolve at once. Tap Battle Cry in your hand and play it.", done: (s, a) => a && a.k === "support" },
    { t: "Counter", say: "Counters wait face-down. Tap Parry in your hand, Set face-down, then End turn. When the bot attacks, a window opens: activate Parry.", done: (s, a) => a && a.k === "respond" }
];
/* the script: my hand per lesson and what the bot does */
export function setupTraining(s, ids) {
    const mine = P(s, 1), bot = P(s, 2);
    const find = (pl, pred) => [...arr(pl.hand), ...arr(pl.deck)].find(u => pred(s.cards[u]));
    // my hand: two plain characters, the Legendary, Battle Cry, Parry; the rest stays in the deck
    const want = [ids.small1, ids.small2, ids.legend, "a:battlecry", "a:parry"].map(id => find(mine, c => String(c.id) === String(id))).filter(Boolean);
    const rest = [...arr(mine.hand), ...arr(mine.deck)].filter(u => !want.includes(u));
    mine.hand = want; mine.deck = rest;
    const bweak = find(bot, c => String(c.id) === String(ids.weak)); bot.hand = [bweak].concat(arr(bot.hand).filter(u => u !== bweak)).slice(0, 5); bot.deck = [...arr(bot.deck), ...arr(bot.hand).slice(5)].filter(u => !bot.hand.includes(u));
}
/* the scripted bot: summons its weak character, ends turns, and attacks once the player has set a Counter */
export function trainingBot(s, p, step) {
    if (s.pending) return { k: "pass" };
    const pl = P(s, p), mine = P(s, 1);
    if (s.phase === "main" && !pl.summoned && arr(pl.hand).length && arr(pl.ch).filter(Boolean).length < 1) {
        const u = arr(pl.hand).find(x => !String(s.cards[x].id).startsWith("a:")); if (u) return { k: "summon", u, pos: "atk", trib: [] };
    }
    if (step >= 5 && arr(mine.ac).some(Boolean)) {
        const a = arr(pl.ch).findIndex(c => c && c.pos === "atk" && !c.atk1);
        if (a >= 0) { if (s.phase === "main") return { k: "phase", to: "battle" }; const t = arr(mine.ch).findIndex(Boolean); return t >= 0 ? { k: "attack", slot: a, tp: 1, tslot: t } : { k: "attack", slot: a, tp: 1, direct: true }; }
    }
    return { k: "phase", to: "end" };
}
