/* =====================================================================
   ARCADE VAULT · CARD ABILITIES
   One shared table, used by the card generator (tools/cards-build.mjs), the battle engine (engine.js)
   and the card faces (text). Balance follows the RARITY OF THE ABILITY, not raw stats: every rarity has
   nearly the same Power + Defense, rarer cards get more interesting or conditional effects.

   Keywords: Pierce (ignore Defense), Guard (take less damage), Heal (restore life), Counter (send damage back),
   Rage (bonus when behind), Combo (bonus if your previous card shared series / archetype), Silence (cancel the
   opposing card's ability), Scout (see a card in their hand), Swap (exchange stats with the opposing card),
   Last Stand (bonus at low life). Rarer cards combine them, copy abilities (Mirror) or redirect damage.

   Timing words used on the cards: On reveal, On clash, On damage, On win, On defeat. The exact resolution
   order is in engine.js (resolveRound).
   "Behind" = less life than the player your card is fighting. Life thresholds are written for 20 life and
   scale with the format's starting life (25 in free-for-all).
   ===================================================================== */

export const ARCHETYPES = ["Brawler", "Tank", "Speedster", "Trickster", "Healer", "Mage", "Support"];
export const RARITY_KEYS = ["common", "uncommon", "rare", "ultra", "epic", "legendary", "mythic"];
export const RARITY_NAMES = ["Common", "Uncommon", "Rare", "Ultra Rare", "Epic", "Legendary", "Mythic"];

/* op fields read by the engine:
   pierce (n | "all"), pierceVs {arch, v}, pierceRare {min, v}, guard, counter (flat), counterPct, heal (on reveal), healWin, healDefeat,
   drainPct + drainMax (on win, heal part of the damage dealt), rage {pow, def, guard}, last {th, pow, def, guard},
   combo {by: series|arch|either, pow, heal}, silence, silenceBonus (Power if the silenced card had an ability),
   copy (Mirror), copyPow, swapPow, swapDef, flip (opposing card's Power <-> Defense), scout, drawWin, parting
   (damage on defeat), recoil (life lost on defeat), cap (take at most this, the rest goes back), revealPow,
   revealDef, perWin {pow, def, max}, behind {per, max} (+1 Power per `per` life behind), finisher {th, pow} */
export const ABILITIES = {
    // ---------- Common: one keyword, small numbers ----------
    c_pierce:  { tier: 0, kw: ["Pierce"],     noun: "Strike",   pierce: 1,                          text: "On clash: Pierce 1 (ignore 1 Defense)." },
    c_guard:   { tier: 0, kw: ["Guard"],      noun: "Wall",     guard: 1,                           text: "On damage: Guard 1 (take 1 less)." },
    c_heal:    { tier: 0, kw: ["Heal"],       noun: "Mend",     heal: 1,                            text: "On reveal: Heal 1 life." },
    c_rage:    { tier: 0, kw: ["Rage"],       noun: "Fury",     rage: { pow: 2 },                   text: "On reveal: Rage, +2 Power when you're behind." },
    c_combo:   { tier: 0, kw: ["Combo"],      noun: "Chain",    combo: { by: "series", pow: 2 },    text: "Combo: +2 Power if your previous card was from the same series." },
    c_last:    { tier: 0, kw: ["Last Stand"], noun: "Grit",     last: { th: 6, pow: 2 },            text: "Last Stand: +2 Power at 6 life or less." },
    // ---------- Uncommon ----------
    u_pierce:  { tier: 1, kw: ["Pierce"],     noun: "Lance",    pierce: 2,                          text: "On clash: Pierce 2." },
    u_guard:   { tier: 1, kw: ["Guard"],      noun: "Bastion",  guard: 2,                           text: "On damage: Guard 2." },
    u_healwin: { tier: 1, kw: ["Heal"],       noun: "Recovery", healWin: 2, heal: 1,                text: "On reveal: Heal 1. On win: Heal 2 more." },
    u_counter: { tier: 1, kw: ["Counter"],    noun: "Riposte",  counter: 1,                         text: "On damage: Counter 1 (deal 1 back)." },
    u_combo:   { tier: 1, kw: ["Combo"],      noun: "Sync",     combo: { by: "arch", pow: 2 },      text: "Combo: +2 Power if your previous card had the same archetype." },
    u_scout:   { tier: 1, kw: ["Scout"],      noun: "Insight",  scout: 1, revealDef: 1,             text: "On reveal: Scout one card in their hand, +1 Defense." },
    // ---------- Rare: a condition or a second effect ----------
    r_rage:    { tier: 2, kw: ["Rage"],       noun: "Berserk",  rage: { pow: 3 },                   text: "On reveal: Rage, +3 Power when you're behind." },
    r_silence: { tier: 2, kw: ["Silence"],    noun: "Seal",     silence: 1,                         text: "On reveal: Silence the opposing card's ability." },
    r_last:    { tier: 2, kw: ["Last Stand"], noun: "Resolve",  last: { th: 8, pow: 2, def: 2 },    text: "Last Stand: +2 Power and +2 Defense at 8 life or less." },
    r_counter: { tier: 2, kw: ["Counter"],    noun: "Mirror Guard", counterPct: .5,                 text: "On damage: Counter half the damage you take (rounded up)." },
    r_drain:   { tier: 2, kw: ["Heal"],       noun: "Siphon",   drainPct: .5, drainMax: 4,          text: "On win: Heal half the damage you dealt." },
    r_hunter:  { tier: 2, kw: ["Pierce"],     noun: "Breaker",  pierce: 1, pierceVs: { arch: "Tank", v: 3 }, text: "On clash: Pierce 1, or Pierce 3 against a Tank." },
    // ---------- Ultra Rare: combos, swaps, two-part effects ----------
    x_swap:    { tier: 3, kw: ["Swap"],       noun: "Exchange", swapPow: 1,                         text: "On reveal: Swap Power with the opposing card." },
    x_sealcut: { tier: 3, kw: ["Silence", "Pierce"], noun: "Severance", silence: 1, pierce: 1,      text: "On reveal: Silence the opposing card. On clash: Pierce 1." },
    x_thorns:  { tier: 3, kw: ["Guard", "Counter"], noun: "Thorns", guard: 1, counter: 1,           text: "On damage: Guard 1 and Counter 1." },
    x_combo:   { tier: 3, kw: ["Combo"],      noun: "Link",     combo: { by: "either", pow: 3 },    text: "Combo: +3 Power if your previous card shared its series or archetype." },
    x_parting: { tier: 3, kw: ["Counter"],    noun: "Last Word", parting: 3, revealDef: 1,          text: "+1 Defense. On defeat: still deal 3 damage to the opponent." },
    x_scout:   { tier: 3, kw: ["Scout"],      noun: "Foresight", scout: 1, drawWin: 1, revealPow: 1, text: "On reveal: Scout one of their cards, +1 Power. On win: draw a card." },
    // ---------- Epic: copying, redirects, conditional bonuses ----------
    e_mirror:  { tier: 4, kw: ["Mirror"],     noun: "Mimicry",  copy: 1,                            text: "On reveal: copy the opposing card's ability (Mirror)." },
    e_comboheal: { tier: 4, kw: ["Combo", "Heal"], noun: "Harmony", combo: { by: "series", pow: 2, heal: 2 }, revealDef: 1, text: "+1 Defense. Combo (same series): +2 Power and Heal 2." },
    e_wrath:   { tier: 4, kw: ["Rage", "Guard"], noun: "Wrath", rage: { pow: 2, guard: 2 },         text: "On reveal: Rage, +2 Power and Guard 2 when you're behind." },
    e_redirect: { tier: 4, kw: ["Counter"],    noun: "Redirect", cap: 3,                             text: "On damage: take at most 3; the rest is redirected to the attacker." },
    e_twist:   { tier: 4, kw: ["Swap", "Pierce"], noun: "Twist", swapDef: 1, pierce: 1,             text: "On reveal: Swap Defense with the opposing card. On clash: Pierce 1." },
    e_vampire: { tier: 4, kw: ["Heal"],       noun: "Feast",    drainPct: 1, drainMax: 4, revealDef: 1, text: "+1 Defense. On win: Heal all the damage you dealt (max 4)." },
    // ---------- Legendary ----------
    l_dominate:{ tier: 5, kw: ["Silence"],    noun: "Dominion", silence: 1, silenceBonus: 1,        text: "On reveal: Silence the opposing card; +1 Power if it was Rare or better." },
    l_phoenix: { tier: 5, kw: ["Heal", "Last Stand"], noun: "Rebirth", healDefeat: 4, last: { th: 8, def: 2 }, text: "Last Stand: +2 Defense at 8 life or less. On defeat: Heal 4." },
    l_bulwark: { tier: 5, kw: ["Counter", "Rage"], noun: "Aegis", counterPct: .5, rage: { guard: 2 }, text: "On damage: Counter half the damage you take. Rage: Guard 2 when you're behind." },
    l_legend:  { tier: 5, kw: ["Combo"],      noun: "Legacy",   perWin: { pow: 1, def: 1, max: 3 },  text: "+1 Power and +1 Defense for every clash you've won this game (max +3)." },
    l_finisher: { tier: 5, kw: ["Pierce"],     noun: "Finale",   pierce: 1, finisher: { th: 8, pow: 3 }, text: "On clash: Pierce 1; +3 Power if the opponent has 8 life or less." },
    l_overdrive: { tier: 5, kw: ["Rage"],      noun: "Overdrive", revealPow: 2, recoil: 2,           text: "On reveal: +2 Power. On defeat: you lose 2 life." },
    // ---------- Mythic: one of a kind ----------
    m_domain: { tier: 6, kw: ["Silence", "Pierce"], noun: "Domain", silence: 1, pierceRare: { min: 2, v: 1 }, text: "On reveal: Silence the opposing card. On clash: Pierce 1 if it is Rare or better." },
    m_rewind:  { tier: 6, kw: ["Mirror"],     noun: "Rewrite",  copy: 1, copyPow: 1,                text: "On reveal: copy the opposing card's ability, and its Power if higher." },
    m_eclipse: { tier: 6, kw: ["Swap", "Pierce"], noun: "Eclipse", flip: 1, pierce: 1,              text: "On reveal: Swap the opposing card's Power and Defense. On clash: Pierce 1." },
    m_eternal: { tier: 6, kw: ["Rage", "Heal"], noun: "Eternity", rage: { guard: 2 }, healWin: 3,   text: "Rage: Guard 2 when you're behind. On win: Heal 3." },
    m_awaken:  { tier: 6, kw: ["Rage", "Last Stand"], noun: "Awakening", behind: { per: 3, max: 4 }, last: { th: 8, guard: 2 }, text: "Rage: +1 Power for every 3 life you're behind (max +4). Last Stand: Guard 2 at 8 or less." },
    m_judgement: { tier: 6, kw: ["Counter"],   noun: "Judgement", cap: 3, counter: 1,                text: "On damage: take at most 3; the rest goes back to the attacker, plus Counter 1." },
};
/* which abilities suit which archetype (per tier, in order of preference; the generator spreads them by id) */
export const ARCH_PREF = {
    Brawler:   ["c_pierce", "c_rage", "c_combo", "u_pierce", "u_combo", "r_rage", "r_hunter", "x_combo", "x_parting", "e_wrath", "e_twist", "l_finisher", "l_overdrive", "m_domain", "m_awaken"],
    Tank:      ["c_guard", "c_last", "u_guard", "u_counter", "r_last", "r_counter", "x_thorns", "x_parting", "e_redirect", "e_wrath", "l_bulwark", "l_phoenix", "m_eternal", "m_judgement"],
    Speedster: ["c_pierce", "c_combo", "u_pierce", "u_scout", "u_combo", "r_hunter", "r_drain", "x_swap", "x_combo", "x_scout", "e_twist", "e_mirror", "l_finisher", "l_legend", "m_eclipse", "m_domain"],
    Trickster: ["c_combo", "c_rage", "u_scout", "u_counter", "r_silence", "r_counter", "x_swap", "x_sealcut", "x_scout", "e_mirror", "e_twist", "l_dominate", "l_legend", "m_rewind", "m_eclipse"],
    Healer:    ["c_heal", "c_guard", "u_healwin", "u_guard", "r_drain", "r_last", "x_thorns", "x_parting", "e_comboheal", "e_vampire", "l_phoenix", "l_bulwark", "m_eternal", "m_rewind"],
    Mage:      ["c_rage", "c_heal", "c_pierce", "u_pierce", "u_scout", "r_silence", "r_rage", "x_sealcut", "x_swap", "e_mirror", "e_wrath", "l_dominate", "l_overdrive", "m_domain", "m_judgement"],
    Support:   ["c_guard", "c_combo", "c_heal", "u_combo", "u_healwin", "r_drain", "r_silence", "x_combo", "x_thorns", "e_comboheal", "e_redirect", "l_legend", "l_phoenix", "m_eternal", "m_awaken"]
};
/* the series' word for its power, used to name abilities ("Haki Strike", "Chakra Wall") */
export const POWER_WORD = { onepiece: "Haki", naruto: "Chakra", dragonball: "Ki", jjk: "Cursed", demonslayer: "Breath", bleach: "Reiatsu", aot: "Titan", mha: "Quirk", hxh: "Nen",
    deathnote: "Shinigami", chainsaw: "Devil", blackclover: "Grimoire", jojo: "Stand", rezero: "Divine", fireforce: "Pyro", frieren: "Mana", gachiakuta: "Jinki", windbreaker: "Street" };
export const abilityName = (abId, series) => (POWER_WORD[series] || "Spirit") + " " + ((ABILITIES[abId] || {}).noun || "Art");
export const abilityText = (abId, fmtLife = 20) => {
    const a = ABILITIES[abId]; if (!a) return "";
    if (fmtLife === 20) return a.text;
    return a.text.replace(/(\d+) life or less|(\d+) or less/g, (m, x, y) => { const n = Number(x || y), v = Math.round(n * fmtLife / 20); return x ? v + " life or less" : v + " or less"; });
};
