/* ANIME FEUD: every question pack. To add a pack: create a file next to this one (same format as the others),
   import it here and add it to PACKS, then run `node tools/feud-check.mjs`. Gameplay code never needs to change. */
import likelyCross from "./likely-cross.js?v=1";
import likelySeries from "./likely-series.js?v=1";
import classicCross from "./classic-cross.js?v=1";
import classicSeries from "./classic-series.js?v=1";
import classicGeneric from "./classic-generic.js?v=1";

export const PACKS = [likelyCross, likelySeries, classicCross, classicSeries, classicGeneric];
