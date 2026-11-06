// Builds the ARCADE VAULT card list from the Anime Draft ratings: node tools/cards-build.mjs
//   -> js/vault/cards.js (the data the game reads) and docs/cards.md (the table to review).
// One card per Draft character (all 18 series). Re-run after editing js/draft/data.js or the rules below;
// card ids are AniList character ids, so owned cards survive a rebuild (a card can change rarity or numbers).
//
// RARITY: per series, characters are ordered by the Draft rank (power + story importance: mythical, legendary,
//   epic, rare, then everyone else) and then by their ratings; the series is then cut into 7 bands
//   (Mythic 1-2, Legendary ~7%, Epic ~10%, Ultra Rare ~13%, Rare ~17%, Uncommon ~22%, Common the rest).
// ARCHETYPE: the character's strongest side compared with their own average (Healer = a real healer).
// STATS: Power + Defense = the rarity's total (config BATTLE.statTotal, nearly flat); the split follows
//   offence vs defence in the ratings and the archetype (Tanks defend, Brawlers hit).
// ABILITY: by rarity tier, from the archetype's list in js/cardvault/abilities.js, spread evenly.
import { readFileSync, writeFileSync } from "fs";
import { CHARS, RANKS, RARITIES } from "../js/draft/data.js";
import { ARCHETYPES, ABILITIES, ARCH_PREF, RARITY_NAMES, abilityName } from "../js/cardvault/abilities.js";
import { BATTLE, RARITY_ORDER, CARD_ART } from "../js/vault/config.js";

const root = new URL("../", import.meta.url);
const pop = JSON.parse(readFileSync(new URL("data/draft-pop.json", root), "utf8"));
const packs = JSON.parse(readFileSync(new URL("packs.json", root), "utf8"));
const IMG = "https://s4.anilist.co/file/anilistcdn/character/large/";
const fromPacks = {};
Object.values(packs.series).forEach(sr => (sr.chars || []).forEach(c => { fromPacks[String(c[0]).slice(1)] = c[3] || ""; }));
const LABEL = Object.fromEntries(Object.entries(packs.series).map(([k, v]) => [k, v.label]));

const SERIES = Object.keys(CHARS);
const rankIdx = {};
Object.entries(RANKS).forEach(([key, tiers]) => RARITIES.forEach((R0, i) => String(tiers[R0.key] || "").split("|").filter(Boolean).forEach(n => { rankIdx[key + "|" + n] = i; })));
const seen = new Set(), out = [], hash = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const abCount = {};

function archetype(v, roles) {
    const [STR, SPD, IQ, DUR, CMB, SPC] = v, [CAP, VC, TANK, DUEL, HEAL, SUP] = roles;
    if (HEAL >= 70) return "Healer";
    const m = (STR + SPD + IQ + DUR + CMB + SPC) / 6;
    const [kT, kS, kI, kM, kU] = W;      // how far above the character's own average a side must stand out
    const sc = { Brawler: (STR + CMB) / 2 - m, Tank: DUR * .6 + TANK * .4 - m - kT, Speedster: SPD - m - kS, Trickster: IQ - m - kI, Mage: SPC - m - kM, Support: SUP - m - kU };
    return Object.entries(sc).sort((a, b) => b[1] - a[1])[0][0];
}
const W = (process.env.ARCHW || "1,4,6,9,4").split(",").map(Number);
const SHIFT = { Brawler: .05, Speedster: .04, Mage: .04, Trickster: 0, Support: -.05, Healer: -.08, Tank: -.13 };

for (const s of SERIES) {
    const rows = CHARS[s].filter(r => !seen.has(r[0]));
    rows.forEach(r => seen.add(r[0]));
    const list = rows.map(r => {
        const v = r.slice(2, 8), roles = r.slice(-6), [STR, SPD, IQ, DUR, CMB, SPC] = v;
        const tier = rankIdx[s + "|" + r[1]] ?? RARITIES.length - 1;
        const power = (STR + SPD + DUR + CMB + SPC) / 5 + IQ * .15 + roles[0] * .1;
        return { id: r[0], n: r[1], s, v, roles, tier, power };
    }).sort((a, b) => a.tier - b.tier || b.power - a.power || a.id - b.id);
    const N = list.length, q = { mythic: N >= 50 ? 2 : 1 };
    q.legendary = Math.max(1, Math.round(N * .07)); q.epic = Math.max(2, Math.round(N * .10)); q.ultra = Math.max(2, Math.round(N * .13));
    q.rare = Math.max(3, Math.round(N * .17)); q.uncommon = Math.max(4, Math.round(N * .22));
    const bands = []; ["mythic", "legendary", "epic", "ultra", "rare", "uncommon"].forEach(k => { for (let i = 0; i < q[k]; i++) bands.push(k); });
    list.forEach((c, i) => { c.r = RARITY_ORDER.indexOf(bands[i] || "common"); });
    // stats inside each rarity band: stronger characters get the top of the band's total
    RARITY_ORDER.forEach((rk, ri) => {
        const band = list.filter(c => c.r === ri).sort((a, b) => b.power - a.power), [lo, hi] = BATTLE.statTotal[rk];
        band.forEach((c, i) => {
            const qtl = band.length > 1 ? 1 - i / (band.length - 1) : .5, T = lo + Math.round(qtl * (hi - lo));
            const [STR, SPD, IQ, DUR, CMB, SPC] = c.v;
            c.a = archetype(c.v, c.roles);
            const off = STR * .4 + SPC * .35 + CMB * .25, dfn = DUR * .7 + IQ * .15 + SPD * .15, share = off / Math.max(1, off + dfn);
            const sh = Math.max(.38, Math.min(.8, .62 + (share - .52) * 1.0 + SHIFT[c.a]));
            c.pow = Math.max(2, Math.min(T - 1, 8, Math.round(T * sh))); c.def = T - c.pow;     // Power caps at 8: a 9-Power card dominates the 4-Defense average
            const prefs = ARCH_PREF[c.a].filter(k => ABILITIES[k].tier === ri), pool = prefs.length ? prefs : Object.keys(ABILITIES).filter(k => ABILITIES[k].tier === ri);
            const key = c.a + ri, n = abCount[key] = (abCount[key] || 0) + 1;
            c.ab = pool[(n + (hash(c.id) % 2)) % pool.length];
        });
    });
    list.sort((a, b) => a.r - b.r || a.n.localeCompare(b.n)).forEach((c, i) => { c.no = i + 1; c.of = N; });
    list.forEach(c => { const p = pop.chars[c.id], f = (p && p[1]) || fromPacks[c.id] || ""; c.img = f && !/^http/.test(f) ? f : f; out.push(c); });
}

// ---------- face focal points (data/card-focus.json from tools/card-faces.py, hand fixes in data/card-focus-fix.json) ----------
/* For each picture: where the face centre is (fx, fy: share of width / height), how big it is (fh: share of height) and the
   picture's aspect ratio. Turned into focusX / focusY (per mille), zoom (percent) and fit (1 = show the whole picture
   over a blurred copy, because the face would not fit the art window) using the art window from CARD_ART. */
const readJson = f => { try { return JSON.parse(readFileSync(new URL(f, root), "utf8")); } catch (e) { return {}; } };
const FOCUS = readJson("data/card-focus.json"), FIX = readJson("data/card-focus-fix.json");
const A = CARD_ART;
function focusOf(id) {
    const d = Object.assign({ w: 230, h: 345, fx: A.defaultFocus[0], fy: A.defaultFocus[1], fh: A.defaultFaceH, src: "none" }, FOCUS[id] || {}, FIX[id] || {});
    if (d.src === "default" && !FIX[id]) { d.fx = A.defaultFocus[0]; d.fy = A.defaultFocus[1]; d.fh = A.defaultFaceH; }
    const r = d.w / d.h, k = r < A.artRatio ? A.artRatio / r : 1;          // k = how much taller the picture is than the window (cover)
    const inWin = d.fh * k;                                                 // face height as a share of the window
    let z = 1, fit = 0;
    if (FIX[id] && FIX[id].z) z = FIX[id].z;
    else if (inWin * A.faceMargin > 1 || k > A.maxCrop) fit = 1;            // the face (or the picture) can't fit: show it whole
    else if (inWin < A.minFace && d.src === "det") z = Math.min(A.maxZoom, A.minFace / inWin); // a small, surely-detected face: zoom in on it
    if (FIX[id] && FIX[id].fit != null) fit = FIX[id].fit;
    return [Math.round(d.fx * 1000), Math.round(d.fy * 1000), Math.round(z * 100), fit, Math.round(r * 1000)];
}
const fitN = out.filter(c => c.img && focusOf(c.id)[3]).length, zoomN = out.filter(c => c.img && focusOf(c.id)[2] > 100).length;
console.log("Face focus: " + Object.keys(FOCUS).length + " pictures measured, " + Object.keys(FIX).length + " hand fixes; " + fitN + " shown whole (fit), " + zoomN + " zoomed in");

// ---------- js/vault/cards.js ----------
const rowsJs = out.map(c => JSON.stringify([c.id, SERIES.indexOf(c.s), c.n, c.r, ARCHETYPES.indexOf(c.a), c.pow, c.def, c.ab, c.no, c.img, ...focusOf(c.id)])).join(",\n");
writeFileSync(new URL("js/vault/cards.js", root), `/* GENERATED by tools/cards-build.mjs from the Anime Draft ratings. Do not edit by hand: change the rules there and re-run.
   One card per character: [AniList id, series index, name, rarity 0-6, archetype index, Power, Defense, ability id, number in its series, picture,
   focusX, focusY (face centre in the picture, per mille), zoom (percent), fit (1 = show the whole picture), picture aspect (per mille)]
   Focal points: measured once offline by tools/card-faces.py (data/card-focus.json), hand fixes in data/card-focus-fix.json.
   (rarity 0 Common .. 6 Mythic; archetypes and abilities: js/cardvault/abilities.js; pictures: AniList, ${IMG}<picture>) */
export const CARD_SERIES = ${JSON.stringify(SERIES)};
export const CARD_COUNT = ${JSON.stringify(Object.fromEntries(SERIES.map(s => [s, out.filter(c => c.s === s).length])))};
export const CARD_IMG = "${IMG}";
export const CARD_ROWS = [
${rowsJs}
];
`);

// ---------- docs/cards.md ----------
const cnt = (f) => out.filter(f).length;
let md = `# ARCADE VAULT: every card\n\nGenerated by \`node tools/cards-build.mjs\` from the Anime Draft ratings (${out.length} cards, ${SERIES.length} series). ` +
    `Rarity follows the Draft's power + story rank inside each series; Power + Defense is nearly flat across rarities (${RARITY_ORDER.map(k => RARITY_NAMES[RARITY_ORDER.indexOf(k)] + " " + BATTLE.statTotal[k].join("-")).join(", ")}); rarer cards get more interesting abilities. ` +
    `Edit the rules in tools/cards-build.mjs or js/cardvault/abilities.js and re-run; balance numbers live in js/vault/config.js.\n\n`;
md += `## Totals\n\n| Rarity | Cards | ${ARCHETYPES.join(" | ")} |\n|---|---|${ARCHETYPES.map(() => "---").join("|")}|\n`;
RARITY_NAMES.forEach((rn, ri) => { md += `| ${rn} | ${cnt(c => c.r === ri)} | ${ARCHETYPES.map(a => cnt(c => c.r === ri && c.a === a)).join(" | ")} |\n`; });
md += `| **All** | **${out.length}** | ${ARCHETYPES.map(a => "**" + cnt(c => c.a === a) + "**").join(" | ")} |\n\n`;
md += `## Abilities\n\n| Id | Rarity | Keywords | Text | Cards |\n|---|---|---|---|---|\n`;
Object.entries(ABILITIES).forEach(([k, a]) => { md += `| ${k} | ${RARITY_NAMES[a.tier]} | ${a.kw.join(", ")} | ${a.text} | ${cnt(c => c.ab === k)} |\n`; });
SERIES.forEach(s => {
    md += `\n## ${LABEL[s] || s} (${out.filter(c => c.s === s).length})\n\n| No. | Name | Rarity | Archetype | Power | Defense | Ability |\n|---|---|---|---|---|---|---|\n`;
    out.filter(c => c.s === s).sort((a, b) => a.no - b.no).forEach(c => { md += `| ${String(c.no).padStart(3, "0")}/${String(c.of).padStart(3, "0")} | ${c.n} | ${RARITY_NAMES[c.r]} | ${c.a} | ${c.pow} | ${c.def} | **${abilityName(c.ab, s)}**: ${ABILITIES[c.ab].text} |\n`; });
});
md += `\n## Characters that need real cut-out art later\n\nUltra Rare and above use a "breaks out of the frame" / layered depth look. No cut-out pictures exist yet, so the game fakes depth ` +
    `(blurred background copy + sharp picture). These ${cnt(c => c.r >= 3)} cards would benefit from real cut-outs:\n\n` +
    SERIES.map(s => `- **${LABEL[s] || s}:** ` + out.filter(c => c.s === s && c.r >= 3).sort((a, b) => b.r - a.r).map(c => c.n).join(", ")).join("\n") + "\n";
writeFileSync(new URL("docs/cards.md", root), md);
console.log(out.length + " cards. Rarity: " + RARITY_NAMES.map((n, i) => n + " " + cnt(c => c.r === i)).join(", "));
console.log("Archetypes: " + ARCHETYPES.map(a => a + " " + cnt(c => c.a === a)).join(", "));
console.log("No picture: " + out.filter(c => !c.img).map(c => c.n).join(", "));
