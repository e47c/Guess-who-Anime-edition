/* =====================================================================
   ANIME TCG · DUEL CARD DEFINITIONS
   - Characters: the collection's cards (js/vault/carddb.js), ATK / DEF shown x100, their ability from
     js/cardvault/abilities.js (timing system).
   - Action cards: our own, free for everyone, unlocked by the player's level (Arcade Pass), NOT in packs, never
     tradable. Support = played from the hand in your Main phase, immediate effect, then the Graveyard.
     Counter = set face-down in an Action Zone, activated in the response window when its trigger happens:
     "summon" (an opponent summons), "support" (an opponent plays a Support card), "attack" (you are attacked).
   Deck rules (DECK in config.js): 20 cards, at most 1 copy of a character, up to 6 Action cards, at most 2 of each.
   ===================================================================== */
import { CARDS } from "../vault/carddb.js?v=6";
import { ABILITIES } from "../cardvault/abilities.js?v=4";
import { DUEL } from "../vault/config.js?v=21";

const S = (DUEL.rules && DUEL.rules.statScale) || 100;
export const ACTIONS = {
    // ---- Support ----
    secondwind: { name: "Second Wind", type: "support", lvl: 1, ops: [{ op: "heal", n: 800 }], text: "Restore 800 life." },
    battlecry:  { name: "Battle Cry", type: "support", lvl: 1, need: "myChar", ops: [{ op: "buff", tgt: "myBest", atk: 500 }], text: "Your character with the highest ATK gains +500 ATK until the end of the turn." },
    ironwall:   { name: "Iron Wall", type: "support", lvl: 2, need: "myChar", ops: [{ op: "buff", tgt: "allies", def: 400 }], text: "All your characters gain +400 DEF until the end of the turn." },
    flashbomb:  { name: "Flash Bomb", type: "support", lvl: 3, ops: [{ op: "dmg", who: "opp", n: 500 }], text: "The opponent loses 500 life." },
    shatter:    { name: "Shatter Seal", type: "support", lvl: 3, ops: [{ op: "setDestroy" }], text: "Destroy one of the opponent's face-down cards." },
    quickdraw:  { name: "Quick Draw", type: "support", lvl: 4, ops: [{ op: "draw", n: 2 }], text: "Draw 2 cards." },
    mindbreak:  { name: "Mind Break", type: "support", lvl: 4, need: "oppChar", ops: [{ op: "silence", tgt: "oppAll" }], text: "Silence every opposing character until the end of the turn." },
    reversal:   { name: "Reversal Art", type: "support", lvl: 5, need: "oppChar", ops: [{ op: "swap", tgt: "oppBest" }], text: "The opposing character with the highest ATK swaps its ATK and DEF." },
    downfall:   { name: "Downfall", type: "support", lvl: 6, need: "oppChar", ops: [{ op: "destroy", tgt: "oppWeak" }], text: "Destroy the opposing character with the lowest ATK." },
    kneel:      { name: "Kneel", type: "support", lvl: 7, need: "oppChar", ops: [{ op: "pos", tgt: "oppAtkPos", to: "def" }], text: "Switch every opposing Attack-position character to Defense position." },
    overcharge: { name: "Overcharge", type: "support", lvl: 8, need: "myChar", ops: [{ op: "buff", tgt: "allies", atk: 300 }, { op: "dmg", who: "self", n: 300 }], text: "All your characters gain +300 ATK until the end of the turn; you lose 300 life." },
    gambit:     { name: "Final Gambit", type: "support", lvl: 10, need: "oppChar", ops: [{ op: "destroy", tgt: "oppBest" }, { op: "dmg", who: "self", n: 1000 }], text: "Destroy the opposing character with the highest ATK; you lose 1000 life." },
    // ---- Counter ----
    parry:      { name: "Parry", type: "counter", trig: "attack", lvl: 1, ops: [{ op: "negate" }], text: "When you are attacked: negate the attack." },
    rebuke:     { name: "Iron Rebuke", type: "counter", trig: "attack", lvl: 2, ops: [{ op: "buff", tgt: "attacker", atk: -600 }], text: "When you are attacked: the attacker loses 600 ATK until the end of the turn (before damage)." },
    spellbreak: { name: "Spell Break", type: "counter", trig: "support", lvl: 4, ops: [{ op: "negate" }], text: "When an opponent plays a Support card: negate it." },
    ambush:     { name: "Ambush", type: "counter", trig: "summon", lvl: 5, ops: [{ op: "buff", tgt: "summoned", atk: -500, dur: "perm" }], text: "When an opponent summons: the summoned character loses 500 ATK for good." },
    backfire:   { name: "Backfire", type: "counter", trig: "support", lvl: 5, ops: [{ op: "negate" }, { op: "dmg", who: "opp", n: 500 }], text: "When an opponent plays a Support card: negate it, and they lose 500 life." },
    snare:      { name: "Mirror Snare", type: "counter", trig: "attack", lvl: 6, ops: [{ op: "destroy", tgt: "attacker" }], text: "When you are attacked: destroy the attacker." },
    pulse:      { name: "Counter Pulse", type: "counter", trig: "attack", lvl: 8, ops: [{ op: "negate" }, { op: "dmg", who: "opp", n: 400 }], text: "When you are attacked: negate the attack, and the attacking player loses 400 life." },
    gravecall:  { name: "Grave Call", type: "counter", trig: "summon", lvl: 9, ops: [{ op: "destroy", tgt: "summoned" }], text: "When an opponent summons: destroy the summoned character." }
};
Object.entries(ACTIONS).forEach(([id, a]) => { a.id = id; a.kw = []; });
export const ACTION_IDS = Object.keys(ACTIONS);
export const actionUnlocked = (id, lvl) => !!ACTIONS[id] && (Number(lvl) || 1) >= ACTIONS[id].lvl;
export const isActionId = id => /^a:/.test(String(id));
const memo = {};
/* the engine's definitions */
export function card(id) {
    if (memo[id]) return memo[id];
    const c = CARDS[id]; if (!c) return null;
    const A = ABILITIES[c.ab];
    return (memo[id] = { id, name: c.n, s: c.s, a: c.a, r: c.r, atk: c.pow * S, def: c.def * S, ab: A ? Object.assign({ name: c.abName }, A) : null });
}
export const action = id => ACTIONS[id] || null;
export const DEFS = { card, action };
/* a deck's cards for the engine: character ids as numbers, Action cards as "a:<id>" */
export const deckList = deck => (deck || []).map(x => isActionId(x) ? String(x) : Number(x));
