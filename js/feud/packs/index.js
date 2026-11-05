/* ANIME FEUD: every question pack. To add a pack: create a file next to this one (same format as the others),
   import it here and add it to PACKS, then run `node tools/feud-check.mjs`. Gameplay code never needs to change. */
import likelyCross from "./likely-cross.js?v=3";
import likelySeries from "./likely-series.js?v=3";
import classicCross from "./classic-cross.js?v=2";
import classicSeries from "./classic-series.js?v=2";
import classicGeneric from "./classic-generic.js?v=2";

export const PACKS = [likelyCross, likelySeries, classicCross, classicSeries, classicGeneric];
