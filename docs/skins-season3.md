# Season 3 skins: living scenes

Status (2026-11-09): **step 1 of 2.** The engine (render levels, parallax, tilt, entrances, budget) and three tiers are
built: **Ruby, Diamond, Flame** (frame + background each). They are shown in the dev gallery (`dev/skins.html`) for
approval. Season 3 is **not in the Shop or the Wardrobe yet** (`SKINS3.live = false`; it can't be bought). Step 2,
after approval: the other 9 tiers, the SEASON 3 Shop tab, the Wardrobe "Season 3" groups, `live = true`.

Files: `js/skins3.js` (scenes, levels, motion, budget, canvases), `css/skins3.css`, `js/vault/config.js` (`SKINS3`),
`js/vault/shop.js` (Season 3 items, `seasonLive`), `js/profile.js` (avatars, lobby seats and the Arcade Pass pick the
level / hero / entrance), `js/wardrobe.js` (hides seasons that aren't live), `index.html`, `dev/skins.html`,
`tools/vault-test.mjs`.

## What makes Season 3 different

| | Season 1 | Season 2 | Season 3 |
|---|---|---|---|
| Frame | a ring (metal / gem colours) | an effect frame around the picture | an object, creature or artifact with its own silhouette, idle loop + entrance |
| Background | flat metal + diagonal stripes | one realistic material, no stripes | a small scene: 3-5 depth layers with parallax (pointer / tilt / drag / idle drift) |

## Tiers built in step 1

| Tier | Frame | Background |
|---|---|---|
| Ruby (new) | A rose-gold brooch: a big claw-set oval ruby crowning the picture on a gallery, scrolls sweeping down to two cushion rubies, accent stones, a pear-shaped ruby drop hanging below (it sways). Inner glow pulses in every stone. Entrance: the scrolls draw in, the stones drop into their claws. | Crimson velvet with soft folds (far), out-of-focus ruby facets glowing (middle), crisp cut rubies at the edges (near), a warm candle-like flicker breathing over it, sparkles. |
| Diamond | A crown cut from diamond: a band of brilliants over the head, five faceted spires, tiara tails of stones down the sides, thin rainbow beams of dispersed light sweeping from the spires. Entrance: the crown descends, the beams flare. | Inside a cut diamond: the pavilion's facets fanning to the culet (far), mid facets in two lighting states that cross-fade with the tilt (so the reflections change as you move), flashing near facets, rainbow "fire" flares moving the other way, twinkles. |
| Flame | A phoenix: a crest of flame plumes, glowing eyes, fire wings that spread and fold around the picture, a long tail below. Full: heat distortion over the fire + a canvas of flames and embers. Entrance: it rises with folded wings, the crest ignites, the wings open. | A lava field at night: smoking sky with a glowing volcano (far), a plain veined with glowing cracks, near basalt plates split by molten rivers that pulse and flow, black rocks in front, heat haze, rising embers (canvas on full, CSS embers on medium). |

## Prices (`SKINS3`, Season 2 x1.5 rounded to 50 under 1,000 and to 100 above; Ruby between Emerald and Diamond)

| Tier | S2 | S3 | S3 bundle (-20%) |
|---|---:|---:|---:|
| Iron | 250 | 400 | 640 |
| Bronze | 400 | 600 | 960 |
| Silver | 600 | 900 | 1,440 |
| Gold | 900 | 1,400 | 2,240 |
| Platinum | 1,400 | 2,100 | 3,360 |
| Emerald | 2,000 | 3,000 | 4,800 |
| Ruby (new) | - | 3,500 | 5,600 |
| Diamond | 2,700 | 4,100 | 6,560 |
| Flame | 3,300 | 5,000 | 8,000 |
| Water | 3,300 | 5,000 | 8,000 |
| Transcendent | 3,800 | 5,700 | 9,120 |
| Prismatic | 4,500 | 6,800 | 10,880 |

Duplicates refund 50%; cosmetics are never tradable; buying and equipping stay separate (Equip now).

## Render levels, performance, settings

- **FULL**: your own Arcade Pass, previews (Shop, Wardrobe), avatars of 100 px or more: every layer, canvas fire (Flame), the
  heat-distortion filter. **MEDIUM**: lobby cards, Shop / Wardrobe tiles, avatars 37-99 px: the same silhouette, fewer details,
  CSS / SVG only. **COMPACT**: avatars of 36 px or less (race-track tokens, chips, lists) and the mini pass: a simplified still shape.
- The picture keeps 66% of the avatar box (80% compact), so the frame fits in the same space as before; nothing needs relayout.
- **Budget**: hero skins (your own card, the one being previewed) run every loop with parallax at 30 fps; every other skin is a crowd
  skin: parallax at 12 fps, its inner SVG loops stop and the frame floats as one composited layer (entrances still play).
  At most `maxHeavy` (3) canvas / filter effects run at once, heroes first. Off-screen, hidden and a hidden tab pause everything.
- **Tilt**: phones ask for motion permission only when a Season 3 skin is previewed or equipped (`requestTilt`); denied or not
  available = a slow idle drift; a finger dragging on the card also moves it.
- **Reduced effects**: no parallax, no entrance, no loops, no canvas: a still scene.

Measured (`scratchpad pw/s3perf.mjs`): 8 Season 3 lobby cards at about 178 fps on a PC, and 85 fps (worst frame 33 ms) with the
CPU slowed 4x to stand in for a mid-range phone.

## Checklist (step 1)
- [x] Ruby, Diamond, Flame: frame + background at FULL, MEDIUM, COMPACT in `dev/skins.html`, with and without Reduced effects
- [x] the picture is never covered (every frame is drawn behind it); nothing clips on the pass, the lobby card, the token, the mini pass
- [x] parallax follows the pointer on PC, drifts when idle; Diamond's reflections cross-fade with the tilt
- [x] entrances play once (lobby arrival, equip / pin), paused (not skipped) while off-screen
- [x] 8-player lobby: 1 hero + 7 crowd cards, all MEDIUM, no canvases; smooth with the CPU slowed 4x
- [x] Reduced effects: no parallax, no canvas, no loops, no entrance
- [x] Season 3 is not in the Shop / Wardrobe and can't be bought while `live` is false (tools/vault-test.mjs)
- [ ] step 2: the other 9 tiers, SEASON 3 Shop tab + Wardrobe groups, preview test on PC + phone, `live = true`
