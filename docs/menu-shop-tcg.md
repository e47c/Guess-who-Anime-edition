# Main menu, Arcade Pass, Wardrobe, Shop and Anime TCG: restructure (2026-11-06)

Saved data is untouched: the bank (`aap_vault_v1`: coins, owned cosmetics, equipped items, cards, decks, pity, shards,
missions, ledger) and the profile (`gw_profile_v1`) keep the same keys and shapes. The mode keeps its internal id
`cardvault` and its page element id `#arcadeVault`, so rooms, results and stats are unaffected.

## What changed

| Area | Now |
|---|---|
| Arcade Pass | A credit card (1.586:1, rounded corners, edge highlight, shadow, golden EMV chip on the right): picture with the equipped frame, equipped background over the whole card, name with its username style, title with its title skin, level and XP bar. One renderer (`passCard`, js/profile.js) for the menu, the Wardrobe preview and the Shop try-on; the background is the lobby seat's skin CSS (`.sbg[data-bg]`). Stats below the card, Edit player card as its own button under it. |
| Wardrobe | "Edit player card" (js/wardrobe.js): display name, profile picture (+ accent colour, upload), Frame, Background, Title, Title skins, Username styles, Card sleeves, plus your record. Owned items selectable; the rest greyed out with where to get them ("Get it in the Shop" opens the Shop on that item). Live preview on the pass; Save profile applies, closing discards. |
| Shop | Its own section (js/vault/shoppage.js): the storefront tile under the logo on the main menu, the Shop button in the lobby header, the CREDIT counter and the coin chip. Season 1 skins (bundle -20%) and scratch cards; prices, odds and refunds unchanged. Buying never equips; after every purchase and new scratch prize, Equip now (next to Keep browsing) equips it and shows it on the pass. Works with and without a room; closing it from the lobby returns to the same room. |
| Anime TCG | The renamed Arcade Vault mode, four tabs (Packs Store, Collection, Decks, Battle), re-themed as a card table (playmat, card-back patterns, booster shelf, binder pages, deck boxes, a slot + Power / Defense curve deck builder, a duel board). Same two entry points (lobby mode with room and friends; the ANIME TCG button under Host / Join with HOST PARTY / JOIN). Card design and pack opening unchanged. |
| Tiles | 10 game tiles in 2 rows of 5 (2 x 5 on phones), on the menu and in the lobby's mode picker (same tiles, plus votes, cursors and SELECTED). Anime TCG and Night Party got full tile + How to Play skins; both How to Play panels have their host button. |

## Test checklist

Automated (all passing):
- [x] `node tools/party-test.mjs` 96, `node tools/vault-test.mjs` 175, cardvault 49, draft 103, feud 264, sketch 228.
- [x] Browser `pw/ui.mjs` (51 checks), with a saved player who already owns coins, cosmetics, cards, a deck and pity
  counters:
  - [x] after reloading on the new code, coins, owned / equipped cosmetics, cards, decks, pity, shards and the
    profile (XP, title, arcade frame) are unchanged
  - [x] the pass: 1.586:1, chip on the right, the equipped background over the whole card, frame, username style, title
    and title skin, level, XP; Edit player card under it, stats below
  - [x] the menu: Shop tile under the logo and above Host / Join; the Anime TCG button under Host / Join; 10 tiles in
    2 rows of 5, the Shop not among them; Anime TCG and Night Party How to Play with their host buttons
  - [x] the Shop: two sections; the try-on is the pass; buying doesn't equip; Equip now / Keep browsing after a
    purchase, Equip now equips at once and the pass shows it (home pass too); prices unchanged (frame 1300, Gold
    scratch card 350); the bundle discount; scratch prize -> Equip now in its slot; closing returns to the menu
  - [x] the Wardrobe: every section, the live preview, locked items with "Get it in the Shop", cancel keeps
    everything, save applies (home pass updates), a Shop link opens the Shop on that item
  - [x] Anime TCG: exactly the four tabs, the title, no Shop / Scratch / Wardrobe inside, the deck builder's slots and
    curve, the room context and friends in Battle from the lobby
  - [x] the lobby: Shop button in the header, the same 10 tiles 2 x 5, the lobby card and the pass wear the same
    frame / background / title / username style; Shop from the lobby says "‹ Lobby" and closing it keeps the room and
    friends
  - [x] phone 390 px: the pass keeps its proportions, tiles 2 x 5, no horizontal scroll, the Shop fits
- [x] Regressions: av2 32 (adapted: Shop steps go through the Shop, four TCG tabs, Close room from the TCG page),
  vt 26 (adapted: CREDIT opens the Shop), hostentry 8, res 25, imp 22, ct 62, np1 35, np3 65.

By hand (screenshots in the scratchpad `ui/` folder):
- [ ] Reduced effects on: the pass and skins are still, tiles don't animate
- [ ] A long name / title on the pass (ellipsis, no overlap with the chip)
- [ ] The Shop and the Wardrobe on a real phone (scrolling, the sticky preview)
- [ ] A real card battle on the new duel board

## Follow-up (2026-11-07)
- **Coin counters** (menu CREDIT, lobby chip) open the **Daily rewards** popup (balance, 7-day streak + Claim, today's 3 missions, coin history). It closes with the X, a tap outside or Esc, and never navigates. The Shop is reached only through the Shop tile and the lobby Shop button.
- **ANIME TCG in the lobby** behaves like any mode: the host picks it (guests vote), and its panel shows **Enter Anime TCG**. Nobody is moved onto the TCG page automatically. Each player enters on their own and comes back with ‹ Lobby. HOST PARTY from the menu's Anime TCG page still lands on the page.
- **Wardrobe = tabs:** Profile | Frames | Backgrounds | Titles | Title Skins | Username Styles | Card Sleeves | Achievements.
  - Each tab is one grid of item cards with an Equipped badge, a lock on locked items, and an owned/total count on the tab.
  - The pass stays pinned (beside the grid on desktop, compact above it on phones). The last tab is remembered.
- **Locked items** only preview: a tap shows the item on the pass as "Preview only", with its name, rarity or tier, how to get it, and its price.
  - The separate **Get in Shop** button opens the Shop on that item: a skin is tried on, and the scratch cards that can win it are highlighted.
  - The Shop opens above the Wardrobe; ‹ Wardrobe, the X or Esc go back with the unsaved draft intact. "Equip now" in the Shop is picked up by the draft.
- Browser test: scratchpad pw/small4.mjs (41 checks).
