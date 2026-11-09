# Anime TCG duel polish: the duel table

A presentation and interaction upgrade of the duel screen (`js/duel/ui.js`). Duel rules, card designs, rarity frames,
the economy, the result object and coin payouts do not change. The host (or the local practice loop) still checks
every intent; hidden information is never sent to other players or spectators.

Build order (stop and report after each):

1. The table, zones, lighting and card physics (shadows, piles), with no interaction changes. **Done.**
2. Drag and drop plus the tap fallback (summon, set, play, position change, tribute), with illegal-move feedback.
3. Attack aiming and the battle preview.
4. The HUD, phase bar, turn clarity and response windows.
5. Player banners and life bars (1v1, then free-for-all).
6. The result screen, sounds, performance and Reduced effects, the mobile and landscape pass.

## Step 1: the table

**Files**

- `js/duel/table.js` (new):
  - the playmat (`matFor`, `paintMat`, `medallion`, `deckMats`);
  - the Deck and Graveyard piles (`deckPile`, `gyPile`);
  - the room (`mountTable`): wood, light, dust and the camera lean.
- `js/duel/ui.js`: mounts the table. Each player's half is a 5-column grid: a corner, 3 zones, a corner.
- `js/duel/engine.js`: `newDuel` takes an optional cosmetic `mats` map and keeps it in the public state. The rules never
  read it.
- `js/cardvault/cardvault.js`: the host picks each player's mat from their **whole** deck (`deckMats`).
- `css/cardvault.css`: the table, the mats, the printed zones, the piles, and the card shadows and edges.
- `js/vault/config.js`: `DUEL.table` holds every new number.

**What it looks like**

- **Table:** dark wood under a warm overhead light. A vignette darkens the corners and the far edges are slightly out of focus.
- **Two playmats, one per player:**
  - Each is printed in the colours of the series most common in that player's deck, with a small repeating emblem print.
  - The empty corner holds a medallion with the emblem, kanji and series name.
  - The edges are stitched, and the far side of each mat is a little darker.
- **Zones:** printed outlines with small labels. Each player has 3 Character Zones, 3 Action Zones, a Deck and a
  Graveyard.
- **Mirrored layout:**
  - Mine: the medallion is on the left; the Graveyard (next to the characters) and the Deck (next to the actions) are on the right.
  - The opponent's is mirrored across the table: the Deck and Graveyard are on my left and their medallion is on my right.
- **Piles:**
  - The Deck is a stack of card backs. Its visible edge thickness (`pileStep` px per card, up to `pileMax` cards) shrinks as it
    empties.
  - The Graveyard shows its last `gyShow` cards face up. Each card is turned and offset a little, the same way on
    every render, based on the card's id.
  - Counts appear on small tags. Tapping the Graveyard opens the viewer, the same viewer as the plate's Graveyard chip.
- **Cards:**
  - On the mat, a card has a thin card-stock edge and a tight contact shadow. A Defense-position card turns its edge with it.
  - Hand cards have a softer shadow that grows when a card is raised.
- **Ambient:**
  - Dust motes drift in the light (`motes` on desktop, `motesPhone` on phones, never more than `maxMotes`).
  - The camera leans a little: toward the pointer on desktop, with the device tilt on phones.
  - On phones, the tilt is used only after permission. iOS asks on the first tap inside the duel, and the answer is shared with the
    Season 3 skins (`aap_tilt`). Without permission, the camera drifts slowly instead.
  - The mat moves by whole pixels so the card text stays sharp.
  - Under Reduced effects (or the system's reduced motion), the table is still: no lean and no dust.

**Playmat hook (no shop yet).** The mat is chosen in this order:

1. `mountDuel`'s option `o.playmat(p)`, which returns a series key or `{ c1, c2, c3, emblem }`.
2. A public profile field `mat`. The host also passes it into `deckMats`, so everyone sees it.
3. The host's choice stored in the duel (`state.mats`).
4. For older duels that have no stored choice: the most common series among the cards this view can see.

**Why the host picks the mat.** Another player's view doesn't contain the deck. Picking the mat from the visible cards made
the opponent's mat change mid-duel as their cards were revealed.

**Test checklist (step 1)**

- [x] Node: vault 196, duel 75, party 96.
- [x] Practice 1v1 on desktop 1366×900, phone 390×844, phone landscape 844×390 and ultrawide 2560×1080 (scratchpad `pw/t1shot.mjs`). Each one checks:
  - 12 zones, 4 piles and 2 medallions;
  - no sideways scroll;
  - the table is live;
  - the Graveyard pile opens the viewer;
  - the Deck thickness shrinks as cards are drawn.
- [x] Reduced effects: the table is still and the dust canvas is hidden.
- [x] Free-for-all practice: the focused opponent's mat and piles switch with the focus.
- [x] Each mat is the same at the start and later in the duel, because the host picks it from the whole deck.
- [x] The older duel tests still pass: p6, p9t, p10, p6room, p10room and p11 (room duel, Close room mid-duel).
