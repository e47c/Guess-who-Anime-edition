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
