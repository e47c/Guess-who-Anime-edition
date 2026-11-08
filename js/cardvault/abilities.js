/* =====================================================================
   ANIME TCG · CARD ABILITIES (the duel's timing system)
   One shared table: the card generator (tools/cards-build.mjs assigns one per card by rarity tier and archetype), the
   duel engine (js/duel/engine.js reads t / ops / continuous traits through js/duel/cards.js) and the card faces (text).
   Design rule: every rarity has nearly the same ATK + DEF; rarer cards get MORE INTERESTING abilities, not bigger
   numbers. Legendary and Mythic need a tribute to summon, so their abilities are the strongest.

   Timing (t): "summon" (On summon) · "attack" (On attack) · "attacked" (When attacked) · "destroyed" (When destroyed)
   · "cont" (Continuous) · "opt" (Once per turn, in your Main phase).
   Continuous traits (any ability may carry them): pierce · guard (+DEF in Defense position) · rage { atk, def } (while
   you have less life than an opponent) · last { th, atk, def } (your life at or below th) · aura { atk, def } (your
   other characters).
   Operations (ops, in order): dmg { who: opp | self | attackerOwner | oppAll, n } · heal { n } · draw { n } ·
   buff { tgt, atk, def, dur: turn | perm } · destroy { tgt } · silence { tgt } · swap { tgt } · pos { tgt, to } ·
   scout { what: set | top | hand } · setDestroy · copy · negate (Counters only).
   Targets are chosen by rule (written on the card): self · allies · others · myBest · oppBest (highest ATK) ·
   oppWeak (lowest ATK) · oppAll · oppAtkPos · attacker · target · summoned.
   Values are the shown ones (x100 of the stored stats); life is 8000.
   ===================================================================== */

export const ARCHETYPES = ["Brawler", "Tank", "Speedster", "Trickster", "Healer", "Mage", "Support"];
export const RARITY_KEYS = ["common", "uncommon", "rare", "ultra", "epic", "legendary", "mythic"];
export const RARITY_NAMES = ["Common", "Uncommon", "Rare", "Ultra Rare", "Epic", "Legendary", "Mythic"];

export const ABILITIES = {
    // ---------- Common: one keyword, small numbers ----------
    c_pierce:  { tier: 0, kw: ["Pierce"], noun: "Strike", t: "cont", pierce: true,
                 text: "Continuous: Pierce (attacking a Defense-position character, it deals the difference as damage)." },
    c_guard:   { tier: 0, kw: ["Guard"], noun: "Wall", t: "cont", guard: 300, text: "Continuous: +300 DEF while in Defense position (Guard)." },
    c_heal:    { tier: 0, kw: ["Heal"], noun: "Mend", t: "summon", ops: [{ op: "heal", n: 400 }], text: "On summon: restore 400 life (Heal)." },
    c_rage:    { tier: 0, kw: ["Rage"], noun: "Fury", t: "cont", rage: { atk: 300 }, text: "Continuous: +300 ATK while you have less life than your opponent (Rage)." },
    c_combo:   { tier: 0, kw: ["Combo"], noun: "Chain", t: "summon", cond: { combo: "series" }, ops: [{ op: "buff", tgt: "self", atk: 300, dur: "perm" }],
                 text: "On summon: +300 ATK if you control another character of the same series (Combo)." },
    c_last:    { tier: 0, kw: ["Last Stand"], noun: "Grit", t: "cont", last: { th: 3000, atk: 400 }, text: "Continuous: +400 ATK while your life is 3000 or less (Last Stand)." },
    // ---------- Uncommon ----------
    u_pierce:  { tier: 1, kw: ["Pierce"], noun: "Lance", t: "attack", pierce: true, ops: [{ op: "buff", tgt: "self", atk: 200 }], text: "Pierce. On attack: +200 ATK until the end of the turn." },
    u_guard:   { tier: 1, kw: ["Guard"], noun: "Bastion", t: "cont", guard: 500, text: "Continuous: +500 DEF while in Defense position (Guard)." },
    u_healwin: { tier: 1, kw: ["Heal"], noun: "Recovery", t: "destroyed", ops: [{ op: "heal", n: 600 }], text: "When destroyed: restore 600 life (Heal)." },
    u_counter: { tier: 1, kw: ["Counter"], noun: "Riposte", t: "attacked", ops: [{ op: "dmg", who: "attackerOwner", n: 300 }], text: "When attacked: the attacking player loses 300 life (Counter)." },
    u_combo:   { tier: 1, kw: ["Combo"], noun: "Sync", t: "summon", cond: { combo: "arch" }, ops: [{ op: "buff", tgt: "self", atk: 400, dur: "perm" }],
                 text: "On summon: +400 ATK if you control another character of the same archetype (Combo)." },
    u_scout:   { tier: 1, kw: ["Scout"], noun: "Insight", t: "summon", ops: [{ op: "scout", what: "set" }, { op: "buff", tgt: "self", def: 200, dur: "perm" }],
                 text: "On summon: look at one of the opponent's face-down cards (Scout) and gain +200 DEF." },
    // ---------- Rare: a condition or a second effect ----------
    r_rage:    { tier: 2, kw: ["Rage"], noun: "Berserk", t: "cont", rage: { atk: 500 }, text: "Continuous: +500 ATK while you have less life than your opponent (Rage)." },
    r_silence: { tier: 2, kw: ["Silence"], noun: "Seal", t: "summon", ops: [{ op: "silence", tgt: "oppBest" }], text: "On summon: silence the opposing character with the highest ATK until the end of the turn." },
    r_last:    { tier: 2, kw: ["Last Stand"], noun: "Resolve", t: "cont", last: { th: 3000, atk: 300, def: 300 }, text: "Continuous: +300 ATK and +300 DEF while your life is 3000 or less (Last Stand)." },
    r_counter: { tier: 2, kw: ["Counter"], noun: "Mirror Guard", t: "attacked", ops: [{ op: "dmg", who: "attackerOwner", n: 500 }], text: "When attacked: the attacking player loses 500 life (Counter)." },
    r_drain:   { tier: 2, kw: ["Heal"], noun: "Siphon", t: "attack", ops: [{ op: "heal", n: 400 }], text: "On attack: restore 400 life (Heal)." },
    r_hunter:  { tier: 2, kw: ["Pierce", "Rage"], noun: "Breaker", t: "cont", pierce: true, rage: { atk: 200 }, text: "Continuous: Pierce. +200 ATK while you have less life than your opponent (Rage)." },
    // ---------- Ultra Rare: two-part effects ----------
    x_swap:    { tier: 3, kw: ["Swap"], noun: "Exchange", t: "summon", ops: [{ op: "swap", tgt: "oppBest" }], text: "On summon: the opposing character with the highest ATK swaps its ATK and DEF (Swap)." },
    x_sealcut: { tier: 3, kw: ["Silence", "Pierce"], noun: "Severance", t: "attack", pierce: true, ops: [{ op: "silence", tgt: "target" }], text: "Pierce. On attack: silence the character it attacks." },
    x_thorns:  { tier: 3, kw: ["Guard", "Counter"], noun: "Thorns", t: "attacked", guard: 300, ops: [{ op: "dmg", who: "attackerOwner", n: 300 }], text: "+300 DEF in Defense position (Guard). When attacked: the attacking player loses 300 life (Counter)." },
    x_combo:   { tier: 3, kw: ["Combo"], noun: "Link", t: "summon", cond: { combo: "either" }, ops: [{ op: "buff", tgt: "self", atk: 400, dur: "perm" }, { op: "draw", n: 1 }],
                 text: "On summon: if you control another character of the same series or archetype, +400 ATK and draw a card (Combo)." },
    x_parting: { tier: 3, kw: ["Counter"], noun: "Last Word", t: "destroyed", ops: [{ op: "dmg", who: "opp", n: 600 }], text: "When destroyed: the opponent loses 600 life." },
    x_scout:   { tier: 3, kw: ["Scout"], noun: "Foresight", t: "opt", ops: [{ op: "scout", what: "set" }, { op: "buff", tgt: "self", atk: 300 }], text: "Once per turn: look at one of the opponent's face-down cards (Scout) and gain +300 ATK until the end of the turn." },
    // ---------- Epic: copying, redirects, conditional bonuses ----------
    e_mirror:  { tier: 4, kw: ["Mirror"], noun: "Mimicry", t: "summon", copyOnSummon: true, ops: [], text: "On summon: copy the ability of the opposing character with the highest ATK (Mirror)." },
    e_comboheal: { tier: 4, kw: ["Combo", "Heal"], noun: "Harmony", t: "summon", cond: { combo: "series" }, ops: [{ op: "buff", tgt: "self", atk: 300, def: 300, dur: "perm" }, { op: "heal", n: 600 }],
                 text: "On summon: if you control another character of the same series, +300 ATK, +300 DEF and restore 600 life (Combo)." },
    e_wrath:   { tier: 4, kw: ["Rage"], noun: "Wrath", t: "cont", rage: { atk: 500, def: 300 }, text: "Continuous: +500 ATK and +300 DEF while you have less life than your opponent (Rage)." },
    e_redirect: { tier: 4, kw: ["Counter"], noun: "Redirect", t: "attacked", ops: [{ op: "buff", tgt: "attacker", atk: -400 }], text: "When attacked: the attacker loses 400 ATK until the end of the turn (before damage)." },
    e_twist:   { tier: 4, kw: ["Swap"], noun: "Twist", t: "summon", ops: [{ op: "pos", tgt: "oppBest", to: "def" }, { op: "buff", tgt: "oppBest", def: -300 }], text: "On summon: switch the opposing character with the highest ATK to Defense position; it loses 300 DEF until the end of the turn." },
    e_vampire: { tier: 4, kw: ["Heal"], noun: "Feast", t: "attack", pierce: true, ops: [{ op: "heal", n: 500 }], text: "Pierce. On attack: restore 500 life (Heal)." },
    // ---------- Legendary (1 tribute) ----------
    l_dominate: { tier: 5, kw: ["Silence"], noun: "Dominion", t: "summon", ops: [{ op: "destroy", tgt: "oppWeak" }, { op: "silence", tgt: "oppBest" }], text: "On summon: destroy the opposing character with the lowest ATK, then silence the one with the highest ATK until the end of the turn." },
    l_phoenix: { tier: 5, kw: ["Heal", "Last Stand"], noun: "Rebirth", t: "destroyed", last: { th: 4000, def: 800 }, ops: [{ op: "heal", n: 1200 }, { op: "draw", n: 1 }], text: "+800 DEF while your life is 4000 or less (Last Stand). When destroyed: restore 1200 life and draw a card." },
    l_bulwark: { tier: 5, kw: ["Guard", "Counter"], noun: "Aegis", t: "attacked", guard: 800, ops: [{ op: "dmg", who: "attackerOwner", n: 400 }], text: "+800 DEF in Defense position (Guard). When attacked: the attacking player loses 400 life (Counter)." },
    l_legend:  { tier: 5, kw: ["Combo"], noun: "Legacy", t: "cont", aura: { atk: 300 }, text: "Continuous: your other characters gain +300 ATK." },
    l_finisher: { tier: 5, kw: ["Pierce"], noun: "Finale", t: "attack", pierce: true, ops: [{ op: "dmg", who: "opp", n: 500 }], text: "Pierce. On attack: the opponent loses 500 life." },
    l_overdrive: { tier: 5, kw: ["Rage"], noun: "Overdrive", t: "summon", ops: [{ op: "buff", tgt: "self", atk: 900 }, { op: "dmg", who: "self", n: 300 }], text: "On summon: +900 ATK until the end of the turn; you lose 300 life." },
    // ---------- Mythic (1 tribute): one of a kind ----------
    m_domain:  { tier: 6, kw: ["Silence"], noun: "Domain", t: "summon", ops: [{ op: "silence", tgt: "oppAll" }, { op: "setDestroy" }], text: "On summon: silence every opposing character until the end of the turn and destroy one of the opponent's face-down cards." },
    m_rewind:  { tier: 6, kw: ["Mirror"], noun: "Rewrite", t: "opt", ops: [{ op: "pos", tgt: "oppBest", to: "def" }, { op: "draw", n: 1 }], text: "Once per turn: switch the opposing character with the highest ATK to Defense position and draw a card." },
    m_eclipse: { tier: 6, kw: ["Swap", "Pierce"], noun: "Eclipse", t: "summon", pierce: true, ops: [{ op: "swap", tgt: "oppAll" }], text: "Pierce. On summon: every opposing character swaps its ATK and DEF (Swap)." },
    m_eternal: { tier: 6, kw: ["Rage", "Heal"], noun: "Eternity", t: "destroyed", rage: { atk: 600, def: 600 }, ops: [{ op: "heal", n: 1500 }, { op: "dmg", who: "opp", n: 500 }], text: "+600 ATK and +600 DEF while you have less life than your opponent (Rage). When destroyed: restore 1500 life; the opponent loses 500 life." },
    m_awaken:  { tier: 6, kw: ["Rage", "Last Stand"], noun: "Awakening", t: "cont", rage: { atk: 400 }, last: { th: 4000, atk: 800 }, text: "Continuous: +400 ATK while you're behind (Rage); +800 ATK more while your life is 4000 or less (Last Stand)." },
    m_judgement: { tier: 6, kw: ["Counter"], noun: "Judgement", t: "attacked", ops: [{ op: "destroy", tgt: "attacker" }], text: "When attacked: destroy the attacker before damage (Counter)." }
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
export const abilityText = abId => (ABILITIES[abId] || {}).text || "";
