# Main menu, Arcade Pass, Wardrobe, Shop and Anime TCG: restructure (2026-11-06)

Saved data is untouched: the bank (`aap_vault_v1`: coins, owned cosmetics, equipped items, cards, decks, pity, shards,
missions, ledger) and the profile (`gw_profile_v1`) keep the same keys and shapes. The mode keeps its internal id
`cardvault` and its page element id `#arcadeVault`, so rooms, results and stats are unaffected.

## What changed

| Area | Now |
|---|---|
| Arcade Pass | A credit card (1.586:1, rounded corners, edge highlight, shadow, golden EMV chip on the right): picture with the equipped frame, equipped background over the whole card, name with its username style, title with its title skin, level and XP bar. One renderer (`passCard`, js/profile.js) for the menu, the Wardrobe preview and the Shop try-on; the background is the lobby seat's skin CSS (`.sbg[data-bg]`). Stats below the card; the EDIT PLAYER CARD card reader under it (see the card-slot follow-up below). |
| Wardrobe | "Edit player card" (js/wardrobe.js): display name, profile picture (+ accent colour, upload), Frame, Background, Title, Title skins, Username styles, Card sleeves, plus your record. Owned items selectable; the rest greyed out with where to get them ("Get it in the Shop" opens the Shop on that item). Live preview on the pass; Save profile applies, closing discards. |
| Shop | Its own section (js/vault/shoppage.js): the storefront tile under the logo on the main menu, the Shop button in the lobby header, the CREDIT counter and the coin chip. Two tabs (2026-11-09): SEASON 1 = the Season 1 skins (bundle -20%) and the scratch cards; SEASON 2 = the Season 2 skins (NEW tags). A persistent preview panel (side panel on wide screens, hover previews and click pins; bottom sheet on phones) shows the real Arcade Pass with the tried frame and / or background. Prices, odds and refunds of Season 1 unchanged. Buying never equips; after every purchase and new scratch prize, Equip now (next to Keep browsing) equips it and shows it on the pass. Works with and without a room; closing it from the lobby returns to the same room. |
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

## Card slot (2026-11-07)
The "Edit player card" button under the Arcade Pass is now an arcade card reader (js/cardslot.js, CSS in css/shop.css, config `CARD_SLOT` in js/vault/config.js).
- **Pick up:** double-click / double-tap the pass, or press and hold it about 400 ms on touch. It lifts (bigger, tilted, shadow) and follows the pointer, tilting with the movement. It is a clone over the page; the real pass keeps its place, so nothing on the menu moves.
- **Insert:** the slot glows while the card is held, and turns green when the card is close and lined up (the snap zone). Releasing there: the card lines up, slides into the slot, the lights go green, a generated beep-click plays and the Wardrobe rises from the reader.
- **Eject:** closing the Wardrobe (Save, Cancel, X, Esc) slides the card out and back onto the pass with an eject sound, showing the look just saved.
- **Fallbacks:** clicking / tapping the reader, or Enter / Space on it, runs the same insert with no dragging. Released away from the slot, or Esc: the card glides back. Pointer cancel, window blur, a hidden tab, resize / rotation or an overlay opening return it at once.
- **While carrying:** no text selection, image drag, wheel / touch scrolling, or double-tap zoom; clicks on the menu are swallowed. Touch: a double-tap without moving keeps the card in the hand, and the next tap (on the slot) drops it there.
- **Reduced effects:** no carry, tilt, shadow or slide: a quick fade, the beep, and the Wardrobe opens at once. Sounds follow the sound settings.
- The hint ("Double-click the card, or tap here"; "Double-tap" on touch) fades after `hintFadeAfter` uses (stored in localStorage `aap_slot_uses`). The lobby has no Edit button, so the reader is on the main menu only.
- Browser test: scratchpad pw/slot.mjs (67 checks).

## Season 2 skins, Shop tabs, PC preview fix, owner coin tool (2026-11-09)

Files: `js/skins2.js` (new: Season 2 frames as SVG, compact frames, canvas flames / water, background layers and
textures), `css/skins2.css` (new), `js/vault/config.js` (`SKINS2`, `DEV_TOOL`), `js/vault/shop.js` (Season 2 items,
`SKIN_TIERS`, `tierInfo`), `js/vault/shoppage.js` (Season 1 / Season 2 tabs, preview panel), `css/shop.css`,
`js/profile.js` (avatars, seats and the pass draw Season 2 layers), `js/wardrobe.js` (Season 1 / Season 2 groups,
Player ID), `js/vault/devgrant.js` + `tools/devgrant-setup.mjs` (new), `css/vault.css`, `js/vault/vault.js` (coin
history label), `js/game.js` (wiring), `index.html`, `dev/skins.html` (new gallery), `tools/vault-test.mjs`.

Season 2 prices (Season 1 x1.5, rounded to 50 under 1,000 and to 100 above; bundle = both -20%):

| Tier | S1 | S2 | S2 bundle |
|---|---:|---:|---:|
| Iron | 150 | 250 | 400 |
| Bronze | 250 | 400 | 640 |
| Silver | 400 | 600 | 960 |
| Gold | 600 | 900 | 1,440 |
| Platinum | 900 | 1,400 | 2,240 |
| Emerald | 1,300 | 2,000 | 3,200 |
| Diamond | 1,800 | 2,700 | 4,320 |
| Flame | 2,200 | 3,300 | 5,280 |
| Water | 2,200 | 3,300 | 5,280 |
| Transcendent | 2,500 | 3,800 | 6,080 |
| Prismatic | 3,000 | 4,500 | 7,200 |

PC preview root cause: the try-on sat in a grid column sized `auto`; the pass is size-contained
(`container-type: inline-size`) with `width: 100%`, so at 640 px and wider the column measured 0 px and the pass was
drawn 0 px wide (phones use one full-width column, so it showed there). The new panel has explicit widths. The Shop
header's coin balance was also missing on PC (`.av-credits` names a grid area the Shop header doesn't have): fixed.

Checklist:
  - [x] SEASON 1 tab: 11 Season 1 tiers + Basic / Silver / Gold scratch cards; SEASON 2 tab: 11 Season 2 tiers with NEW
  - [x] PC: the preview pass is drawn (344 x 217 at 1366 px), hover previews, moving away restores, click pins; a frame
    and a background from different tiers / seasons together; real name, title and level on the pass
  - [x] phone (390 px): the preview is a bottom sheet; tapping a tile shows it; no sideways scroll
  - [x] buy a Season 2 frame: -900, not equipped; Equip now equips it; the Water S2 bundle costs 5,280; Equipped /
    Complete set markers
  - [x] the Wardrobe groups Frames (Season 1 / Season 2 / Arcade frames) and Backgrounds (Season 1 / Season 2);
    saving a Season 2 background puts it on the menu pass
  - [x] every frame and background at large, pass, lobby, 72 / 54 / 44, compact 34-22, race-track token and mini pass
    sizes (`dev/skins.html`), with and without Reduced effects
  - [x] coin tool: a 2 s hold opens Daily rewards as before; moving off cancels; no window or hint before 4 s; after
    4 s (DEV_TOOL.holdMs, was 10 s) the code window opens and the release doesn't open Daily rewards; the right code on a non-owner profile and
    wrong codes say "Invalid code"; 3 failures lock for 10 minutes (logged); an owner gets the amount field; 0, -5,
    1.5, text and over-the-max are refused; a triple click on Confirm grants once; the grant is logged (ledger "Dev
    grant" + devGrants: id, amount, time); missions, streaks, XP and stats untouched; a 4 s long touch works on phones
