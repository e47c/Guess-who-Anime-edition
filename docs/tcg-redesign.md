# Anime TCG redesign: phase log

The brief has 11 phases; each one stops for review. Player data (collections, decks, coins, pity, shards, equipped items)
is never reset: card ids are AniList character ids and no phase changes them.

## Phase 1: card art, anatomy, style matrix, shine ladder, gallery (done 2026-11-08)

- Art audit (`tools/card-art-audit.mjs`, report `docs/card-art-report.md`): 831 pictures checked; 829 fine; 2 have no
  picture anywhere on AniList (Seiryu Sakaki, Uryu Sakaki, Wind Breaker): they show the series silhouette until art is
  supplied. 4 squarer pictures (230x230 / 230x257) are fine: they are shown whole.
- Crop rule: at most 8% of a picture is ever cut off (`CARD_ART.maxCrop`); otherwise the whole picture over a blurred copy.
- New card anatomy, icon set (card icons), 18 series corner ornaments, new card backs, the rarity shine ladder.
- `tools/cards-build.mjs` re-run: only the old "fit" column changed (42 cards); ids, rarities, stats and abilities are
  identical.
- Gallery `dev/cards.html` with automatic checks: every card passes at small, medium and large sizes except the 2 above.

## Phase 2: page shell, design tokens, icon set, Battle -> Duel (done 2026-11-08)

- One shell (`index.html` #arcadeVault, `js/vault/vault.js`, `css/tcg.css`): a card-table background (felt playmat,
  stitched edge, play-zone rings, floating foil dust, vignette; still under Reduced effects), a header with the coin
  balance, shards, a compact Arcade Pass and Daily rewards, the context bar (room code + friends, or HOST PARTY / JOIN),
  and the tab bar Packs Store | Collection | Decks | Duel (icons, arrow keys, slide transitions, hover / press states,
  a soft hover tick from the generated sounds).
- Design tokens on `.tcg-page` (colours, spacing, radii, shadows, type) and shared components (panels, gold / steel
  buttons, chips, pills, progress bars and rings, section headings, empty states).
- The icon set (`js/vault/icons.js`, 79 icons in one style) with its sheet `dev/icons.html`.
- Battle is Duel everywhere: tabs, buttons, texts, missions, code names and config keys (`DUEL` in config.js). Saved
  data is migrated: the wallet's duel record (was `battles`), today's "Win a card duel" mission (was `battle1`), the
  remembered tab.

## Phase 3: Packs Store (done 2026-11-08)

- `js/vault/tab-packs.js`: a rail of the 18 series (progress rings), a showcase with the series' Normal and Premium packs
  side by side (large, floating, lit and tilted by the pointer), Buy & open, Open x5 (one by one with "Next pack (2 of 5)",
  or a quick summary of all 25 cards), free packs, and a detail panel: odds per rarity with bars, both pity counters as
  bars, "cards you still need X / Y", craft with shards (both tiers), and the series' card pool (owned cards, silhouettes
  for missing ones, tap to inspect). Packs bought but not revealed are offered first (one by one or quick summary).
- Packs: a character silhouette (three builds across the series), Premium gets a gem crest and the
  "6 CARDS · 1 RARE+ GUARANTEED" banner. Roll logic, odds, prices, pity and shards unchanged.
- The opening is the same (tear, burst, face-down stack, revealed card on top, inspect, reactions, summary).

## Phase 4: Collection (done 2026-11-08)

- `js/vault/tab-collection.js`: a binder (pages of 9 pockets with sleeve plastic, a spread of two pages on wide screens,
  page-turn animation, Next / Previous, swipe and arrow keys) or a grid. Missing cards are silhouettes with their number,
  rarity and a name hint (first letters). Search + filters (series, rarity, archetype, card type, owned / missing, Holo,
  NEW = pulled in the last 3 days and not inspected yet) and sorting (number, rarity, ATK, DEF, name, recently pulled,
  either direction). Progress: total %, a ring per series (tap = filter; a check when complete), the rarity breakdown,
  the sleeves unlocked.
- The inspector (`js/vault/opening.js` inspect, now with a side panel / phone bottom drawer): the 3D card + rarity,
  ATK / DEF / archetype, the ability with keyword chips that explain themselves (`js/duel/glossary.js`), first pulled by,
  copies, shard value, duels won, Add to deck (opens the builder with the card).
- Duplicates & shards: cards owned both Normal and Holo give up the Normal copy for its shards (one, or all, with a
  confirmation; never a copy locked in a trade offer). `convertDuplicate` in `js/vault/packs.js`.
- Trades: pick cards on both sides, a review of both sides (warnings: your only copy, a card you already own), send
  (your cards locked), the friend reviews and accepts, an undo window of `TRADE.undoSec` (10 s) for either side, then the
  swap. Cards only.

## Phase 5: the duel engine (done 2026-11-08)

`js/duel/engine.js`: pure functions (no DOM, no Firebase), numbers in `DUEL.rules` (js/vault/config.js), card
definitions injected (`useDefs`: js/duel/cards.js in the game, synthetic cards in the tests). Seeded generator in the
state (shuffles, coin toss), plain-sentence log, numbered events for the animations, `viewFor(s, p)` redacts hidden
information (other hands, face-down cards, every deck order, the generator), `legalMoves` / `why` (the reason a move is
not allowed), `preview` (the battle outcome in words), `tick` (response window and turn timer), `forceEnd` (a
disconnected player's turn), `placements` (the standard result).

Rules summary: life 8000 (FFA 6000) · deck 20, hand 5, draw 1 (not the first player on turn 1) · 3 Character Zones,
3 Action Zones, Deck, Graveyard · phases Draw, Main, Battle, End · one Normal Summon a turn (Attack or Defense),
Legendary / Mythic need 1 tribute · Support cards resolve at once, Counters are set face-down · one position switch a
turn (not after attacking, not the turn it was summoned) · each Attack-position character attacks once; no attacks on
turn 1 for the first player · damage: vs Attack the difference to the loser's owner (equal: both destroyed), vs Defense
no damage unless Pierce, ATK < DEF hurts the attacker's owner, direct = full ATK · deck-out loses · turn timer 90 s
(the turn just ends) · response window 6 s for ONE Counter, aimed at the player the action targets; Counters can't
answer Counters · stalemate: after round 20, -300 life for everyone at each End phase · FFA: the attacker picks an
opponent, only that player may answer, eliminations in order (simultaneous ones share a place).

Resolution order: declare → response window (a Counter resolves first, may negate) → the action's abilities (On
summon / Support effect / On attack, then When attacked) → battle damage → destroyed characters to the Graveyard and
their When destroyed abilities (defender first) → life check.

Tests: `node tools/duel-test.mjs` (73 checks: summon, tribute, positions, all 7 damage cases, Pierce, Guard, direct
attack, once-per-turn attacks, deck-out, life 0, response windows (respond, pass, timeout, trigger matching, no
Counter-on-Counter), Support, abilities by timing, stalemate guard, turn timer, disconnect, hidden information,
determinism, legal moves, FFA targeting, shared places, elimination order).
