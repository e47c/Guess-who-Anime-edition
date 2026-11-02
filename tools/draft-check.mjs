// Anime Draft: validates the rating database (js/draft/data.js).
// Run: node tools/draft-check.mjs   (exit code 1 on any problem)
import fs from "fs";
import { CHARS, ROLESETS, TIERS, RANKS, RARITIES } from "../js/draft/data.js";

const packs = JSON.parse(fs.readFileSync(new URL("../packs.json", import.meta.url), "utf8"));
const pop = fs.existsSync(new URL("../data/draft-pop.json", import.meta.url)) ? JSON.parse(fs.readFileSync(new URL("../data/draft-pop.json", import.meta.url), "utf8")) : null;
const problems = [], warn = [], seen = new Map();
let total = 0;
for (const [key, rows] of Object.entries(CHARS)) {
    if (!ROLESETS[key]) problems.push(key + ": no role set");
    if (!TIERS[key]) problems.push(key + ": no power tier");
    const len = key === "deathnote" ? 20 : 16;
    const packIds = new Set(((packs.series[key] || {}).chars || []).map(c => Number(String(c[0]).slice(1))));
    rows.forEach(r => {
        total++;
        const tag = key + " " + r[0] + " " + r[1];
        if (r.length !== len) problems.push(tag + ": " + r.length + " values, expected " + len);
        if (!Number.isInteger(r[0]) || r[0] <= 0) problems.push(tag + ": bad AniList id");
        r.slice(2).forEach((v, i) => { if (!Number.isInteger(v) || v < 1 || v > 100) problems.push(tag + ": value #" + (i + 1) + " = " + v + " (must be 1..100)"); });
        if (seen.has(r[0])) problems.push(tag + ": duplicate id (also " + seen.get(r[0]) + ")");
        seen.set(r[0], tag);
        if (!packIds.has(r[0]) && !(pop && pop.chars && pop.chars[r[0]])) warn.push(tag + ": not in packs.json for this series (no picture until draft-sync runs)");
        // the series roles that duplicate a shared stat must agree with it
        if (key === "aot" && r[8] !== r[6]) problems.push(tag + ": AoT 'Combat Skill' role (" + r[8] + ") must equal CMB (" + r[6] + ")");
        if (key === "gachiakuta" && r[9] !== r[6]) problems.push(tag + ": Gachiakuta 'Combat Skill' role (" + r[9] + ") must equal CMB (" + r[6] + ")");
    });
    if (rows.length < 14) problems.push(key + ": only " + rows.length + " characters (a Build match needs 12 + 2 rerolls)");
}
// rarity table: every listed name must be a character of that series, listed once
for (const [key, tiers] of Object.entries(RANKS)) {
    if (!CHARS[key]) { problems.push("RANKS." + key + ": unknown series"); continue; }
    const names = new Set(CHARS[key].map(r => r[1])), seenN = new Set();
    for (const [t, list] of Object.entries(tiers)) {
        if (!RARITIES.some(x => x.key === t)) problems.push("RANKS." + key + "." + t + ": unknown rarity");
        String(list).split("|").filter(Boolean).forEach(n => {
            if (!names.has(n)) problems.push("RANKS." + key + "." + t + ": '" + n + "' is not a " + key + " character");
            if (seenN.has(n)) problems.push("RANKS." + key + ": '" + n + "' listed twice");
            seenN.add(n);
        });
    }
    if (!String(tiers.mythical || "")) problems.push("RANKS." + key + ": no Mythical");
}
Object.keys(CHARS).forEach(k => { if (!RANKS[k]) problems.push(k + ": no RANKS entry"); });
warn.forEach(w => console.log("warn:", w));
problems.forEach(p => console.log("ERROR:", p));
console.log(total + " characters in " + Object.keys(CHARS).length + " series, " + problems.length + " errors, " + warn.length + " warnings");
process.exit(problems.length ? 1 : 0);
