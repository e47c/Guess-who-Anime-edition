/* =====================================================================
   CARD DATABASE (runtime view of the generated cards.js)
   CARDS[id] = { id, s (series key), n (name), r (rarity 0-6), rk (rarity key), a (archetype), pow, def, ab, abName,
                 no ("042/066"), img (picture URL or "") }
   ===================================================================== */
import { CARD_SERIES, CARD_COUNT, CARD_IMG, CARD_ROWS } from "./cards.js?v=1";
import { ARCHETYPES, RARITY_KEYS, RARITY_NAMES, abilityName } from "../cardvault/abilities.js?v=1";

export const CARDS = {}, BY_SERIES = {}, BY_SERIES_RARITY = {};
CARD_SERIES.forEach(s => { BY_SERIES[s] = []; BY_SERIES_RARITY[s] = RARITY_KEYS.map(() => []); });
CARD_ROWS.forEach(([id, si, n, r, ai, pow, def, ab, no, img]) => {
    const s = CARD_SERIES[si], c = { id, s, n, r, rk: RARITY_KEYS[r], a: ARCHETYPES[ai], pow, def, ab, abName: abilityName(ab, s),
        no: String(no).padStart(3, "0") + "/" + String(CARD_COUNT[s]).padStart(3, "0"), img: img ? (/^http/.test(img) ? img : CARD_IMG + img) : "" };
    CARDS[id] = c; BY_SERIES[s].push(id); BY_SERIES_RARITY[s][r].push(id);
});
export { CARD_SERIES, CARD_COUNT, RARITY_KEYS, RARITY_NAMES, ARCHETYPES };
export const card = id => CARDS[id] || null;
export const TOTAL_CARDS = CARD_ROWS.length;
