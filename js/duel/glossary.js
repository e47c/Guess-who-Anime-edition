/* =====================================================================
   ANIME TCG · GLOSSARY (plain-language definitions)
   Shown when a keyword chip, a timing tag, a phase or a position is tapped: in the card inspector (Collection, Decks)
   and in the Duel. Keep these in step with the duel engine (js/duel/engine.js) and the abilities (js/duel/cards.js).
   ===================================================================== */
export const KEYWORDS = {
    Pierce: "When this attacks a character in Defense position, the difference between its ATK and that DEF is dealt to the opponent as damage too.",
    Guard: "Tougher in defense: adds to this character's DEF while it is in Defense position, or reduces the damage you take.",
    Heal: "Restores life points to you (never above your starting life).",
    Counter: "Strikes back: when this character is attacked, it deals damage to the attacking player.",
    Rage: "Gets stronger when you are behind: a bonus while you have less life than your opponent.",
    Combo: "A bonus when you control another character of the same series (or archetype, as written on the card).",
    Silence: "Shuts down an ability: the chosen character's ability does nothing until the end of the turn.",
    Scout: "Reveals hidden information: look at the top card of a deck, or at a face-down card.",
    Swap: "Exchanges values: switches a character's ATK and DEF, or two characters' stats.",
    "Last Stand": "A bonus when your life is low (at or below the amount written on the card).",
    Mirror: "Copies another character's ability."
};
export const TIMINGS = {
    "On summon": "Happens once, right after this character is Normal Summoned to the field.",
    "On attack": "Happens each time this character declares an attack, before damage.",
    "When attacked": "Happens when an opposing character attacks this one, before damage.",
    "When destroyed": "Happens when this character is destroyed and sent to the Graveyard.",
    Continuous: "Always active while this character is face-up on the field.",
    "Once per turn": "Can be used only once each turn, in your Main phase.",
    "On reveal": "Happens when the card is revealed.", "On clash": "Happens when the cards meet.", "On damage": "Happens when damage is dealt.", "On win": "Happens when this card wins the clash.", "On defeat": "Happens when this card loses the clash."
};
export const PHASES = {
    Draw: "Draw 1 card (the first player skips this on turn 1). Drawing from an empty deck loses the duel.",
    Main: "Normal Summon one character (Attack or Defense position), play Support cards, set Counter cards face-down, switch positions.",
    Battle: "Each Attack-position character may attack once: an opposing character, or the player directly if they have none.",
    End: "The turn passes to the opponent."
};
export const POSITIONS = {
    Attack: "Upright. Can attack. When attacked, it battles with its ATK and its owner can take damage.",
    Defense: "Sideways. Cannot attack. When attacked, it battles with its DEF; its owner takes no damage unless the attacker has Pierce."
};
export const define = word => KEYWORDS[word] || TIMINGS[word] || TIMINGS[(word || "").charAt(0).toUpperCase() + (word || "").slice(1).toLowerCase()] || PHASES[word] || POSITIONS[word] || "";
