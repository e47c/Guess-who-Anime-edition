/* =====================================================================
   ARCADE VAULT · BALANCE CONFIG
   Every number of the economy and of Anime Card Vault lives here, so balance can be tuned without touching
   game logic. Nothing else in the code hard-codes a price, an odd, a reward or a life total.
   Edit a value, bump `?v=` where vault files are imported, done.
   ===================================================================== */

export const VAULT = {
    currency: "AAP Coins",
    startCoins: 100,                     // a brand-new player's balance
    ledgerKeep: 400,                     // newest ledger lines kept per player (audit trail of grants, spends and rolls)
    opsKeepDays: 45                      // how long applied operation ids are remembered (idempotency window)
};

/* ---------- per-mode metadata (A1). The Night Party tournament builder reads this later. ----------
   length: short | medium | long -> the coin multiplier below. fast = good as a quick tournament stage. */
export const MODE_META = {
    classic:   { name: "Guess Who",        min: 2, max: 2, teams: false, duel: true,  length: "short",  fast: true  },
    headbanz:  { name: "Headbanz",         min: 2, max: 8, teams: false, duel: true,  length: "medium", fast: false },
    imposter:  { name: "Imposter",         min: 3, max: 8, teams: false, duel: false, length: "medium", fast: false },
    uno:       { name: "Anime UNO",        min: 2, max: 8, teams: false, duel: true,  length: "medium", fast: false },
    draft:     { name: "Anime Draft",      min: 2, max: 8, teams: true,  duel: true,  length: "medium", fast: false },
    feud:      { name: "Anime Feud",       min: 2, max: 8, teams: true,  duel: true,  length: "long",   fast: false },
    likely:    { name: "Most Likely",      min: 2, max: 8, teams: true,  duel: true,  length: "medium", fast: true  },
    sketch:    { name: "Anime Sketch",     min: 2, max: 8, teams: false, duel: true,  length: "long",   fast: false },
    cardvault: { name: "Anime Card Vault", min: 2, max: 8, teams: false, duel: true,  length: "medium", fast: true  }
};

/* ---------- A2. Earning coins ---------- */
export const EARN = {
    place8: [40, 34, 28, 24, 20, 16, 13, 10],   // 8 players: 1st..8th
    top: 40, bottom: 10,                         // fewer players: spread evenly between these
    lengthMult: { short: 0.75, medium: 1, long: 1.5 },
    minRealPlayers: 2,                           // distinct accounts in the match
    minSeconds: { short: 60, medium: 150, long: 240 },   // a game shorter than this pays nothing
    dailyGameCap: 600,                           // coins from games per day (missions and login are separate)
    nightParty: { winner: 100, perStage: 10 }    // hook only: the tournament builder is not built yet
};
export const DAILY_LOGIN = [30, 30, 40, 40, 50, 50, 100];     // 7-day streak, then it repeats; a missed day resets it

export const MISSIONS = {
    perDay: 3,                                   // missions with `needs` appear once that part of the Vault exists
    freshModeDays: 7,                            // "try a mode you have not played in N days" (always one of the 3)
    pool: [
        { id: "play2",     text: "Play 2 games",                       kind: "play",     goal: 2, coins: 20 },
        { id: "play4",     text: "Play 4 games",                       kind: "play",     goal: 4, coins: 35 },
        { id: "win1",      text: "Win a game",                         kind: "win",      goal: 1, coins: 30 },
        { id: "top3",      text: "Finish top 3 in a free-for-all (4+ players)",     kind: "top3ffa",  goal: 1, coins: 25 },
        { id: "squad4",    text: "Play a game with 4+ players",        kind: "squad",    goal: 1, coins: 25 },
        { id: "pack1",     text: "Open a pack",                        kind: "pack",     goal: 1, coins: 20, needs: "packs" },
        { id: "scratch1",  text: "Scratch a card",                     kind: "scratch",  goal: 1, coins: 20, needs: "scratch" },
        { id: "battle1",   text: "Win a card battle",                  kind: "cvwin",    goal: 1, coins: 40, needs: "battle" },
        { id: "deck1",     text: "Build or edit a deck",               kind: "deck",     goal: 1, coins: 20, needs: "decks" },
        { id: "team1",     text: "Win a team game",                    kind: "teamwin",  goal: 1, coins: 35 }
    ],
    fresh: { id: "fresh", text: "Play a mode you haven't played in 7 days", kind: "fresh", goal: 1, coins: 40 }
};

/* ---------- A3. Season 1 skins: each tier sold as a Frame and a Background ---------- */
export const SKINS = {
    season: 1,
    bundleOff: 0.20,                             // frame + background together
    dupRefund: 0.50,                             // a duplicate cosmetic refunds this share of its price
    tiers: [
        { id: "iron",         name: "Iron",         price: 150 },
        { id: "bronze",       name: "Bronze",       price: 250 },
        { id: "silver",       name: "Silver",       price: 400 },
        { id: "gold",         name: "Gold",         price: 600 },
        { id: "platinum",     name: "Platinum",     price: 900 },
        { id: "emerald",      name: "Emerald",      price: 1300 },
        { id: "diamond",      name: "Diamond",      price: 1800 },
        { id: "flame",        name: "Flame",        price: 2200, animated: true },
        { id: "water",        name: "Water",        price: 2200, animated: true },
        { id: "transcendent", name: "Transcendent", price: 2500 },
        { id: "prismatic",    name: "Prismatic",    price: 3000 }      // was "Holo" in the brief; renamed so it never clashes with Holo cards
    ],
    earnOnly: []                                 // tier ids that can't be bought (future prestige rewards)
};

/* ---------- A4. Scratch cards (rolled before the scratch UI; scratching only reveals) ---------- */
export const SCRATCH = {
    tiers: {
        basic:  { name: "Basic",  price: 60,  odds: { common: 80, rare: 18, epic: 2, legendary: 0 } },
        silver: { name: "Silver", price: 150, odds: { common: 45, rare: 40, epic: 13, legendary: 2 } },
        gold:   { name: "Gold",   price: 350, odds: { common: 0,  rare: 45, epic: 40, legendary: 15 } }
    },
    dupRefund: { common: 20, rare: 60, epic: 150, legendary: 400 }
};

/* ---------- A5. Packs ---------- */
export const RARITY_ORDER = ["common", "uncommon", "rare", "ultra", "epic", "legendary", "mythic"];
export const PACKS = {
    normal:  { name: "Normal Pack",  cards: 5, price: 150, shards: 100, holo: 0.08, guaranteeRare: false,
        odds: { common: 60, uncommon: 25, rare: 10, ultra: 3.5, epic: 1, legendary: 0.4, mythic: 0.1 },
        pity: { after: 20, atLeast: "ultra" } },
    premium: { name: "Premium Pack", cards: 6, price: 400, shards: 250, holo: 0.12, guaranteeRare: true,
        odds: { common: 35, uncommon: 30, rare: 20, ultra: 9, epic: 4, legendary: 1.6, mythic: 0.4 },
        pity: { after: 30, atLeast: "legendary" } }
};
export const SHARDS = { common: 5, uncommon: 10, rare: 25, ultra: 60, epic: 120, legendary: 250, mythic: 500, holoMult: 2 };

/* ---------- A7. Decks ---------- */
export const DECK = { size: 10, maxCopies: 1, starterCount: 10 };

/* ---------- B. Anime Card Vault ---------- */
export const BATTLE = {
    duel: { life: 20, hand: 4, draw: 1 },
    ffa:  { life: 25, hand: 4, draw: 1, min: 3, max: 8 },
    pickSeconds: 30,                              // auto-pick when it runs out
    reconnectGrace: 20,                           // seconds a disconnected player is waited for before auto-picks
    length: "medium",                             // for the coin multiplier
    winnerPackOption: true,                       // host setting: "winner picks a free pack of any series"
    statTotal: { common: [10, 12], uncommon: [10, 12], rare: [11, 12], ultra: [11, 13], epic: [11, 13], legendary: [12, 13], mythic: [12, 14] }
};
