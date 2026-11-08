/* =====================================================================
   CARD DATABASE (runtime view of the generated cards.js)
   CARDS[id] = { id, s (series key), n (name), r (rarity 0-6), rk (rarity key), a (archetype), pow, def, ab, abName,
                 no ("042/066"), img (picture URL or ""),
                 fx, fy (the face centre in the picture, 0..1), fz (zoom), fit (show the whole picture), ar (picture width / height) }
   ===================================================================== */
import { CARD_SERIES, CARD_COUNT, CARD_IMG, CARD_ROWS } from "./cards.js?v=3";
import { ARCHETYPES, RARITY_KEYS, RARITY_NAMES, abilityName } from "../cardvault/abilities.js?v=3";

export const CARDS = {}, BY_SERIES = {}, BY_SERIES_RARITY = {};
CARD_SERIES.forEach(s => { BY_SERIES[s] = []; BY_SERIES_RARITY[s] = RARITY_KEYS.map(() => []); });
CARD_ROWS.forEach(([id, si, n, r, ai, pow, def, ab, no, img, fx, fy, fz, fit, ar]) => {
    const s = CARD_SERIES[si], c = { id, s, n, r, rk: RARITY_KEYS[r], a: ARCHETYPES[ai], pow, def, ab, abName: abilityName(ab, s),
        no: String(no).padStart(3, "0") + "/" + String(CARD_COUNT[s]).padStart(3, "0"), img: img ? (/^http/.test(img) ? img : CARD_IMG + img) : "",
        fx: fx != null ? fx / 1000 : .5, fy: fy != null ? fy / 1000 : .4, fz: fz ? fz / 100 : 1, fit: !!fit, ar: ar ? ar / 1000 : 2 / 3 };
    CARDS[id] = c; BY_SERIES[s].push(id); BY_SERIES_RARITY[s][r].push(id);
});
export { CARD_SERIES, CARD_COUNT, RARITY_KEYS, RARITY_NAMES, ARCHETYPES };
export const card = id => CARDS[id] || null;
export const TOTAL_CARDS = CARD_ROWS.length;
