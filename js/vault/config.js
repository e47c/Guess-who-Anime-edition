/* =====================================================================
   ANIME TCG · BALANCE CONFIG
   Every number of the economy and of ANIME TCG (the ninth lobby mode) lives here, so balance can be tuned without touching
   game logic. Nothing else in the code hard-codes a price, an odd, a reward or a life total.
   Edit a value, bump `?v=` where vault files are imported, done.
   ===================================================================== */

export const VAULT = {
    currency: "AAP Coins",
    startCoins: 100,                     // a brand-new player's balance
    ledgerKeep: 400,                     // newest ledger lines kept per player (audit trail of grants, spends and rolls)
    opsKeepDays: 45                      // how long applied operation ids are remembered (idempotency window)
};

/* ---------- per-mode metadata (A1). The Night Party stage registry (js/party/stages.js) reads it. ----------
   min / max  = players one match of the mode seats.
   teams      = has a team format (Team vs Team, Draft Build sides).
   ffa        = has an everyone-for-themselves format (all players in one match).
   oneVone    = a match is exactly 2 players (Night Party runs it as a single-elimination bracket).
   length     = short | medium | long -> the coin multiplier below and the Night Party time estimate.
   fast       = good as a quick Night Party stage or tiebreaker.
   stage      = false: not a Night Party stage yet (registered later with registerStage). */
export const MODE_META = {
    classic:   { name: "Guess Who",        min: 2, max: 2, teams: false, ffa: false, oneVone: true,  length: "short",  fast: true  },
    headbanz:  { name: "Headbanz",         min: 2, max: 8, teams: false, ffa: true,  oneVone: false, length: "medium", fast: false },
    imposter:  { name: "Imposter",         min: 3, max: 8, teams: false, ffa: true,  oneVone: false, length: "medium", fast: false },
    uno:       { name: "Anime UNO",        min: 2, max: 8, teams: false, ffa: true,  oneVone: false, length: "medium", fast: false },
    draft:     { name: "Anime Draft",      min: 2, max: 8, teams: true,  ffa: true,  oneVone: false, length: "medium", fast: false },
    feud:      { name: "Anime Feud",       min: 2, max: 8, teams: true,  ffa: false, oneVone: false, length: "long",   fast: false },
    likely:    { name: "Most Likely",      min: 2, max: 8, teams: true,  ffa: true,  oneVone: false, length: "medium", fast: true  },
    sketch:    { name: "Anime Sketch",     min: 2, max: 8, teams: false, ffa: true,  oneVone: false, length: "long",   fast: false },
    cardvault: { name: "Anime TCG",     min: 2, max: 8, teams: false, ffa: true,  oneVone: true,  length: "short",  fast: true, stage: false }   // id kept for saved data; duels become a stage later
};

/* ---------- A2. Earning coins ---------- */
export const EARN = {
    place8: [40, 34, 28, 24, 20, 16, 13, 10],   // 8 players: 1st..8th
    top: 40, bottom: 10,                         // fewer players: spread evenly between these
    lengthMult: { short: 0.75, medium: 1, long: 1.5 },
    minRealPlayers: 2,                           // distinct accounts in the match
    // every finished game pays, however short; no daily limit
    // Night Party bonus coins: js/party/config.js (NIGHT_PARTY.coins)
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
        { id: "duel1",     text: "Win an Anime TCG duel (not Practice)", kind: "cvwin",    goal: 1, coins: 40, needs: "duel" },
        { id: "deck1",     text: "Build or edit a 20-card deck",       kind: "deck",     goal: 1, coins: 20, needs: "decks" },
        { id: "team1",     text: "Win a team game",                    kind: "teamwin",  goal: 1, coins: 35 },
        { id: "party1",    text: "Finish a Night Party",               kind: "party",    goal: 1, coins: 40, needs: "party" }
    ],
    fresh: { id: "fresh", text: "Play a mode you haven't played in 7 days", kind: "fresh", goal: 1, coins: 40 }
};

/* ---------- A3. Season 1 skins: each tier sold as a Frame and a Background ----------
   Frame = the animated ring around the circular picture. Background = the whole player-card panel (the lobby seat).
   speed = how fast that tier's animations run (1 = as designed, 2 = half as fast); read once into CSS at start. */
export const SKINS = {
    season: 1,
    bundleOff: 0.20,                             // frame + background together
    dupRefund: 0.50,                             // a duplicate cosmetic refunds this share of its price
    tiers: [
        { id: "iron",         name: "Iron",         price: 150, speed: 1 },
        { id: "bronze",       name: "Bronze",       price: 250, speed: 1 },
        { id: "silver",       name: "Silver",       price: 400, speed: 1 },
        { id: "gold",         name: "Gold",         price: 600, speed: 1 },
        { id: "platinum",     name: "Platinum",     price: 900, speed: 1 },
        { id: "emerald",      name: "Emerald",      price: 1300, speed: 1 },
        { id: "diamond",      name: "Diamond",      price: 1800, speed: 1 },
        { id: "flame",        name: "Flame",        price: 2200, speed: 1 },
        { id: "water",        name: "Water",        price: 2200, speed: 1 },
        { id: "transcendent", name: "Transcendent", price: 2500, speed: 1 },
        { id: "prismatic",    name: "Prismatic",    price: 3000, speed: 1 }      // was "Holo" in the brief; renamed so it never clashes with Holo cards
    ],
    earnOnly: [],                                // tier ids that can't be bought (future prestige rewards)
    ringWidth: 0.11,                             // frame ring thickness, as a share of the picture's size
    pauseOffscreen: true                         // animated frames / backgrounds pause while scrolled out of view
};

/* ---------- A3c. Season 2 skins: the same 11 tiers, a new Frame and Background each (js/skins2.js + css/skins2.css) ----------
   Prices = Season 1 price x1.5, rounded to the nearest 50 below 1,000 and to the nearest 100 above (halves round up).
   The bundle discount and the duplicate refund are SKINS.bundleOff / SKINS.dupRefund (the same rules as Season 1).
   Item ids: "sf_<tier>2" / "bg_<tier>2" (e.g. sf_iron2); the public look carries "<tier>2", so older clients just
   show a plain picture instead of breaking.
   picture = the share of the avatar box the picture keeps (the rest is the frame); compactBelow = avatars of this many
   px or fewer (tokens, chips, lists) get the simplified compact frame; canvasFrom = frames this big or larger add the
   canvas flames / water (smaller ones keep the SVG version); fps = the canvas effects' frame rate cap. */
export const SKINS2 = {
    season: 2,
    newTag: false,                               // "NEW" badge on Season 2 items in the Shop (handed to Season 3)
    tiers: [
        { id: "iron",         name: "Iron",         price: 250,  speed: 1 },
        { id: "bronze",       name: "Bronze",       price: 400,  speed: 1 },
        { id: "silver",       name: "Silver",       price: 600,  speed: 1 },
        { id: "gold",         name: "Gold",         price: 900,  speed: 1 },
        { id: "platinum",     name: "Platinum",     price: 1400, speed: 1 },
        { id: "emerald",      name: "Emerald",      price: 2000, speed: 1 },
        { id: "diamond",      name: "Diamond",      price: 2700, speed: 1 },
        { id: "flame",        name: "Flame",        price: 3300, speed: 1 },
        { id: "water",        name: "Water",        price: 3300, speed: 1 },
        { id: "transcendent", name: "Transcendent", price: 3800, speed: 1 },
        { id: "prismatic",    name: "Prismatic",    price: 4500, speed: 1 }
    ],
    earnOnly: [],
    picture: 0.70,
    compactBelow: 34,
    canvasFrom: 56,
    fps: 30
};

/* ---------- A3e. Season 3 skins: 12 tiers (Ruby is new), each a small living scene (js/skins3.js + css/skins3.css) ----------
   Prices = Season 2 price x1.5, rounded to the nearest 50 below 1,000 and to the nearest 100 above (halves round up);
   Ruby (no Season 2 price) sits between Emerald and Diamond. Bundle / duplicate rules: SKINS.bundleOff / dupRefund.
   Item ids "sf_<tier>3" / "bg_<tier>3". live = false keeps Season 3 out of the Shop and the Wardrobe (the dev gallery
   still shows it) until every tier is built and approved.
   RENDER LEVELS: full (own card, previews, large avatars: every layer, canvas fire / water / refraction), medium (lobby
   cards, grid tiles: same silhouette, fewer details, CSS / SVG only), compact (tokens, chips, lists: a simplified still
   shape). Avatars of compactBelow px or fewer are compact; fullFrom px or more (or a pass / preview) are full.
   LOBBY BUDGET: "hero" skins (your own card, the one being previewed) animate fully at heroFps; every other skin is a
   "crowd" skin: a simplified loop, parallax updated at crowdFps. At most maxHeavy canvas / filter effects run at once
   (heroes first); the rest show their still frame. Everything pauses off-screen and while the tab is hidden.
   parallax = how far (% of the layer, at depth 1) background layers move with the pointer / tilt / idle drift; tiltDeg = the device
   tilt (degrees) that reaches the full shift; idleDrift = the drift's speed (cycles per second); enterMs = how long the
   entrance animation can last before the idle loop takes over. */
export const SKINS3 = {
    season: 3,
    newTag: true,
    live: true,
    tiers: [
        { id: "iron",         name: "Iron",         price: 400,  speed: 1 },
        { id: "bronze",       name: "Bronze",       price: 600,  speed: 1 },
        { id: "silver",       name: "Silver",       price: 900,  speed: 1 },
        { id: "gold",         name: "Gold",         price: 1400, speed: 1 },
        { id: "platinum",     name: "Platinum",     price: 2100, speed: 1 },
        { id: "emerald",      name: "Emerald",      price: 3000, speed: 1 },
        { id: "ruby",         name: "Ruby",         price: 3500, speed: 1 },      // new tier: between Emerald and Diamond
        { id: "diamond",      name: "Diamond",      price: 4100, speed: 1 },
        { id: "flame",        name: "Flame",        price: 5000, speed: 1 },
        { id: "water",        name: "Water",        price: 5000, speed: 1 },
        { id: "transcendent", name: "Transcendent", price: 5700, speed: 1 },
        { id: "prismatic",    name: "Prismatic",    price: 6800, speed: 1 }
    ],
    earnOnly: [],
    picture: 0.66, pictureCompact: 0.8,
    compactBelow: 36, fullFrom: 100,
    heroFps: 30, crowdFps: 12, maxHeavy: 3,
    parallax: 3, tiltDeg: 28, idleDrift: 0.05,
    enterMs: 1800
};

/* ---------- A3d. Owner-only coin tool (hidden; js/vault/devgrant.js) ----------
   Hold the AAP Coin counter for holdMs, then a code; only a code whose PBKDF2 hash matches AND a player on the owner
   allow-list gets the amount field. The code itself is never in the source: tools/devgrant-setup.mjs writes salt + hash.
   owners = SHA-256 hashes of allowed player ids (the Firebase user id shown in the Wardrobe, salted with ownerSalt).
   This site has no server: see the comment in devgrant.js for what this does and does not protect. */
export const DEV_TOOL = {
    holdMs: 4000,                                // press and hold the coin counter this long (no hint while holding)
    moveCancelPx: 24,                            // moving further than this from where the press started cancels it
    maxTries: 3, lockMinutes: 10,                // wrong codes before the tool locks, and for how long
    maxGrant: 100000,                            // the most coins one grant may add
    logKeep: 50,                                 // failed attempts kept in this browser's log
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: 310000 },
    salt: "C4MF2SArEAI+oNPbeWPSZA==",      // filled by tools/devgrant-setup.mjs (base64)
    hash: "1pSvSENiyuRIKWYMNRmbnqrS+lwnUCKXe1rY4WhEaqY=",      // PBKDF2(code, salt) (base64)
    ownerSalt: "ryFK7kWVw2jIgaAF/70/rQ==",
    owners: ["3ICV/lFmv3JFPUJXBsYu3woO3gHRf/r9Dw8fKzahNac="]                                   // SHA-256(ownerSalt + player id), base64
};

/* ---------- A3b. The card reader under the Arcade Pass (main menu): pick the pass up, insert it, the Wardrobe opens ----------
   Read by js/cardslot.js. Times in ms. */
export const CARD_SLOT = {
    doubleTapMs: 340,       // two clicks / taps on the pass within this = pick it up
    holdMs: 400,            // or press and hold it this long (touch / pen)
    liftScale: 1.06,        // the card grows a little while held
    maxTiltDeg: 12,         // tilt from movement speed while held
    snapPx: 70,             // the card's bottom edge within this of the slot (and lined up) = the snap zone
    returnMs: 460,          // released away from the slot: glide back and settle
    insertMs: 900,          // align + slide into the slot
    openDelayMs: 140,       // after the card is in and the beep plays, before the Wardrobe opens
    ejectMs: 700,           // the Wardrobe closed: out of the slot and back onto the menu
    visibleShare: 0.16,     // how much of the card still sticks out of the slot
    hintFadeAfter: 3        // the "Double-click the card, or tap here" hint fades after this many uses
};

/* ---------- A4. Scratch cards (rolled before the scratch UI; scratching only reveals) ---------- */
export const SCRATCH = {
    tiers: {      // odds = reward rarity; types = what kind of reward (title, title skin, username colour/effect)
        basic:  { name: "Basic",  price: 60,  odds: { common: 80, rare: 18, epic: 2, legendary: 0 },  types: { title: 50, ucol: 50 } },
        silver: { name: "Silver", price: 150, odds: { common: 45, rare: 40, epic: 13, legendary: 2 }, types: { title: 40, tskin: 25, ucol: 35 } },
        gold:   { name: "Gold",   price: 350, odds: { common: 0,  rare: 45, epic: 40, legendary: 15 }, types: { title: 35, tskin: 30, ucol: 35 } }
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
/* the opening animation (js/vault/opening.js): when each step starts after the tear, how far to drag, how many foil
   flakes, how long the Legendary / Mythic cinematics last. Reduced effects uses the short values. */
export const OPENING = {
    tearAt: 0.82,                                 // share of the pack's width the finger must cross to tear it
    emergeMs: 450, freeMs: 1250, flipsMs: 1950,   // after the tear: cards rise, pack drops away, flipping starts
    emergeMsLite: 80, freeMsLite: 260, flipsMsLite: 420,
    flakes: { normal: 28, premium: 40, reduced: 8 },
    cinematicMs: { legendary: 2300, mythic: 2600, reduced: 800 },
    flipMs: 760, holdMs: 450                      // a flip's length; press-and-hold to inspect
};
export const SHARDS = { common: 5, uncommon: 10, rare: 25, ultra: 60, epic: 120, legendary: 250, mythic: 500, holoMult: 2 };

/* ---------- Card faces: one card shape, one art window per rarity layout, faces never cropped ----------
   Pictures are AniList portraits (almost all 230 x 345, width / height 0.667). A picture may be cropped by at most
   maxCrop (8%) to fill its window ("cover", placed by the face point measured offline: focusX / focusY in
   js/vault/cards.js); if more would be lost it is shown whole ("fit": contained, over a blurred, darkened copy of
   itself). The standard window is a portrait 0.86, so a 0.667 picture is shown whole with thin blurred sides; the Ultra
   Rare window (taller, breaking out of the frame) and the Mythic full-art card fit within 8% and are covered. */
export const CARD_ART = {
    cardRatio: [63, 88],                 // width : height of every card
    artRatio: 0.86,                      // the standard art window's width / height
    maxCrop: 0.08,                       // at most this share of a picture may be cut off to fill a window; more = fit (whole picture)
    targetY: 0.42,                       // cover: where the face centre sits in the window (0 top .. 1 bottom)
    targetYMythic: 0.36,                 // Mythic: the whole card is the art; the face sits above the text panel
    faceMargin: 1.12,                    // cover: the face plus this much room must fit, otherwise fit
    defaultFocus: [0.5, 0.4],            // no face found: horizontally centred, upper part (most pictures are busts)
    defaultFaceH: 0.5,
    retries: [700, 2200],                // a picture that fails to load is retried after these delays (ms)
    preloadMax: 240                      // decoded pictures kept in memory (pack opening, decks)
};

/* ---------- A7. Decks ---------- */
export const DECK = { size: 20, maxCopies: 1, maxActions: 6, actionCopies: 2, starterCount: 20, maxDecks: 6, veteranWins: 10 };     // 20 cards, 1 copy per character, up to 6 Action cards (2 of each), 6 deck slots
export const TRADE = { maxCards: 5, maxOpen: 3, undoSec: 10 };     // undoSec: after an offer is accepted, either side can undo for this long      // cards per side of one offer, open offers per player

/* ---------- B. ANIME TCG card duels (challenges from the Vault's Duel tab) ---------- */
export const DUEL = {
    duel: { life: 20, hand: 4, draw: 1 },
    ffa:  { life: 25, hand: 4, draw: 1, min: 3, max: 8 },
    pickSeconds: 30,                              // auto-pick when it runs out
    reconnectGrace: 20,                           // seconds a disconnected player is waited for before auto-picks
    length: "short",                              // for the coin multiplier (a duel takes 2-4 minutes)
    challenge: { expireSeconds: 60, keepOverMinutes: 10 },   // an unanswered challenge expires; finished duels are cleared after this
    statTotal: { common: [11, 12], uncommon: [11, 12], rare: [11, 12], ultra: [11, 12], epic: [11, 12], legendary: [11, 12], mythic: [12, 13] },  // ATK + DEF per rarity (stored small, shown x100; nearly flat on purpose)
    /* the turn-based duel (js/duel/engine.js) */
    rules: {
        life: 8000, lifeFfa: 6000,                // starting life (1v1 / free-for-all)
        hand: 5, draw: 1, deckSize: 20,           // opening hand, draw per turn (the first player skips it on turn 1)
        zones: 3, actionZones: 3,                 // Character Zones and Action Zones per player
        tribute: { legendary: 1, mythic: 1 },     // characters to sacrifice to Normal Summon one of these rarities
        statScale: 100,                           // stored ATK / DEF are multiplied by this
        turnSec: 90,                              // a turn ends when this runs out (no forced attacks)
        responseSec: 6,                           // the other player's window to activate ONE Counter
        reconnectGrace: 20,                       // seconds a disconnected player's turn waits before it is ended for them
        stalemate: { round: 8, loss: 400, grow: 400 },      // the Final Clash: at the end of this round and each one after, everyone loses
        stalemateFfa: { round: 5, loss: 400, grow: 400 },   //   loss + grow x (rounds since) life (FFA uses its own). Tuned with tools/duel-sim.mjs
        maxLog: 160, maxEvents: 80                // kept in the duel state
    },
    /* quick emotes in a duel: shown on the sender's plate for showSec; one every cooldownSec per player */
    emotes: { list: [["nice", "Nice!"], ["wow", "Wow!"], ["oops", "Oops"], ["gg", "GG"], ["think", "Hmm…"], ["angry", "Grr!"]], cooldownSec: 4, showSec: 2.6 },
    /* the duel table (js/duel/table.js): presentation only. Piles: px of visible thickness per card (up to pileMax
       cards), the top card's small random turn (deg), how many Graveyard cards show face-up and how far they scatter.
       Ambient: dust motes (desktop / phone, hard cap), the camera's lean (px per layer at full lean), how fast it
       follows (ease), the idle drift (cycles per second) and the tilt that counts as a full lean (deg); fps cap. */
    table: {
        pileStep: .7, pileMax: 20, deckRotDeg: 2.5, gyShow: 3, gyRotDeg: 9, gyOffset: 3,
        motes: 26, motesPhone: 12, maxMotes: 40, fps: 30,
        parallax: { table: 4, light: 12, mat: 3, dust: 18 }, ease: 3.5, idleDrift: .04, tiltDeg: 28
    },
    /* practice bots: chance to pick a weaker move, how often they attack into a risk, Counter use */
    bots: { easy: { blunder: .35, risk: .2, counters: .4 }, normal: { blunder: .12, risk: .45, counters: .8 }, hard: { blunder: 0, risk: .7, counters: 1 } }
};
