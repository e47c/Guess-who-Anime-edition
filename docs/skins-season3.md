# Season 3 skins: living scenes

Status (2026-11-09): **done and live.** All 12 tiers (frame + background each) are built; Season 3 is in the Shop
(SEASON 3 tab, NEW tags) and in the Wardrobe (Season 3 groups). Step 1 (engine + Ruby, Diamond, Flame) was approved
from the dev gallery before step 2 (the other nine tiers, the Shop tab, the Wardrobe groups, `live: true`).
Season 2 handed its NEW tag to Season 3 (`SKINS2.newTag = false`).

Files: `js/skins3.js` (engine: levels, motion, budget, canvases; Ruby, Diamond, Flame), `js/skins3-tiers.js` (the other
nine tiers), `js/skins3-kit.js` (shared drawing kit), `css/skins3.css`, `js/vault/config.js` (`SKINS3`), `js/vault/shop.js`
(Season 3 items, `seasonLive`), `js/vault/shoppage.js` (SEASON 3 tab, tilt request on preview / equip), `js/wardrobe.js`
(Season 3 groups, entrance on the preview, tilt request), `js/profile.js` (level / hero / entrance / picture for Silver),
`css/shop.css` (Ruby badge, Season 3 cards), `index.html`, `dev/skins.html`, `tools/vault-test.mjs`.

## What makes Season 3 different

| | Season 1 | Season 2 | Season 3 |
|---|---|---|---|
| Frame | a ring (metal / gem colours) | an effect frame around the picture | an object, creature or artifact with its own silhouette, idle loop + entrance |
| Background | flat metal + diagonal stripes | one realistic material, no stripes | a small scene: 3-5 depth layers with parallax (pointer / tilt / drag / idle drift) |

## The 12 tiers

| Tier | Frame (object around the picture; entrance) | Background (scene; depth layers) |
|---|---|---|
| Iron | Four mech-visor segments (brow, cheeks, chin) with status lights, hex bolts and seams; sparks jump across the gaps. Entrance: they slide in and lock. | A foundry: girders, chains, a furnace mouth glowing at the back; a cast-iron slab whose branching molten cracks cool to black and re-glow in turn; a hook in front; sparks, heat shimmer. |
| Bronze | An ancient astrolabe: engraved ring with degree ticks, a ring of runes glowing in sequence, a rete of star pointers, an alidade turning behind, the throne and shackle. Entrance: the rings spin into place. | A weathered temple wall of stone blocks; two columns of carved glyphs that light up one after another; a fluted column; a beam of light with dust. |
| Silver | A polished crescent moon cradling the picture, with mirror shards floating in its open side that reflect the player's own picture. Entrance: the moon swings in, the shards fly out. | Liquid mercury mirroring a dark room and a bright horizon, a slow metallic swell, mercury beads; rings ripple out where the pointer / tilt / drift touches it. |
| Gold | A baroque cartouche: C-scrolls with acanthus leaves, a scallop shell, a filigree crown of arches with gem inlays and pearls; a slow glint. Entrance: the crown lowers, the scrolls unfurl. | A gilded vault hall: a glowing arched doorway, receding gilded arches, fluted columns, treasure in front; shafts of light and drifting gold dust. |
| Platinum | A holographic targeting reticle: platinum corner brackets, cyan holo arcs, crosshair ticks, a scan sweep, a lock-on pulse, data nodes orbiting with link lines. Entrance: the brackets snap in, the arcs draw. | A glassy tech panel: fine grid under dark glass, soft bloom, UI modules, data streaming down in columns, the glass bevel catching light. |
| Emerald | Living vines climbing around the picture: leaves with veins and sheen, tendrils, emerald dewdrops, fireflies. Entrance: the vines grow, the leaves unfurl one by one. | Under an emerald canopy: misty trunks, layers of foliage, big leaves close up, moving sun shafts, pollen. |
| Ruby (new) | A rose-gold brooch: a big claw-set oval ruby on a gallery, scrolls down to cushion rubies, a pear-shaped drop that sways; the stones glow from inside. Entrance: the scrolls draw in, the stones drop into their claws. | Crimson velvet folds, out-of-focus ruby facets, crisp cut rubies at the edges, a warm candle-like flicker. |
| Diamond | A crown cut from diamond: a band of brilliants, five faceted spires, tiara tails of stones, rainbow beams sweeping from the spires. Entrance: it descends, the beams flare. | Inside a cut diamond: pavilion facets fanning to the culet, mid facets in two lighting states cross-faded by the tilt, flashing near facets, rainbow fire flares. |
| Flame | A phoenix: crest of flame plumes, glowing eyes, fire wings that spread and fold, a long tail; full: heat distortion + canvas fire. Entrance: it rises, the crest ignites, the wings open. | A lava field at night: volcano, glowing crack plain, molten rivers that pulse and flow, black rocks, heat haze, embers. |
| Water | A serpent made of water spiralling around the picture: translucent body with a current, fins, foam, glowing eyes, falling droplets; full: canvas spray. Entrance: it coils in from its tail. | Underwater: light from the surface, distant rock arches and a school of fish, kelp, rocks in front, a manta gliding far behind, bubbles (canvas on full). |
| Transcendent | A celestial gate: luminous pillars and an arch with a keystone, a slow eclipse over the sun above it, three planets (one ringed) orbiting. Entrance: the gate rises, the eclipse and planets appear. | Deep cosmos with the strongest parallax: a spiral galaxy far away, a teal-and-gold nebula, three star fields at different depths, shooting stars. |
| Prismatic | A living glass prism: a white beam enters, a fan of spectrum rays and a spectrum arc sweep around the picture; the prism turns slowly. Entrance: the prism forms, the beam shoots in, the spectrum unfurls. | A liquid-crystal film: flowing marbled thin-film colour; three colour states cross-fade with the tilt, so the colour shifts as the card moves. |

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

## Checklist
- [x] all 12 tiers: frame + background at FULL, MEDIUM, COMPACT in `dev/skins.html`, with and without Reduced effects
- [x] the picture is never covered (every frame is drawn behind it); nothing clips on the pass, the lobby card, the token, the mini pass
- [x] parallax follows the pointer on PC, drifts when idle, drags on touch; tilt is asked only when a Season 3 skin is previewed / equipped
- [x] entrances play once (lobby arrival, equip, pin on a preview, a new skin in the Wardrobe preview), paused (not skipped) off-screen
- [x] 8-player lobby: 1 hero + 7 crowd cards at MEDIUM, no canvases; smooth with the CPU slowed 4x
- [x] Reduced effects: no parallax, no canvas, no loops, no entrance
- [x] Shop: SEASON 1 (with the scratch cards) | SEASON 2 | SEASON 3 (NEW); 12 tiers in order; badges, Owned / Equipped / Complete set markers, bundle prices
- [x] Shop preview on PC (side panel, hover + pin) and phone (bottom sheet) with a Season 3 frame and background together on the real pass
- [x] buy (single / bundle -20%), Equip now (with the entrance), duplicate refund 50%, not tradable; nothing owned lost
- [x] Wardrobe: Season 1 / Season 2 / Season 3 groups for Frames and Backgrounds; locked items preview only with a separate Get in Shop
