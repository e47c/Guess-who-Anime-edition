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

/* ---------- the rating review (js/draft/basis.js) ----------
   1. every character has a written basis (the version rated + the feats behind the numbers)
   2. every canon comparison in FEATS holds
   3. no inflation: at most 3 characters of a series at 97+ in one stat, and no more than a quarter at 90+
   4. ratings don't just copy one power ranking: a character whose six Mixed stats are all within 8 points is flagged
   5. series roles that mirror a shared stat agree with it */
const { BASIS, FEATS } = await import("../js/draft/basis.js");
const STAT = { STR: 0, SPD: 1, IQ: 2, DUR: 3, CMB: 4, SPC: 5, R5: 6, R6: 7 }, review = [];
for (const [key, rows] of Object.entries(CHARS)) {
    const byName = new Map(rows.map(r => [r[1], r]));
    rows.forEach(r => { if (!BASIS[r[0]] || String(BASIS[r[0]]).length < 20) problems.push(key + " " + r[1] + ": no rating basis in js/draft/basis.js"); });
    (FEATS[key] || []).forEach(f => {
        const m = /^(\w+)\s+(.+?)\s*(>=|<=|>|<|=)\s*(.+?)\s*:\s*(.+)$/.exec(f);
        if (!m || STAT[m[1]] == null) { problems.push(key + " FEATS: can't read '" + f + "'"); return; }
        const i = STAT[m[1]] + 2, A = byName.get(m[2]), num = /^\d+$/.test(m[4]);
        if (!A) { problems.push(key + " FEATS: unknown character '" + m[2] + "'"); return; }
        const B = num ? null : byName.get(m[4]);
        if (!num && !B) { problems.push(key + " FEATS: unknown character '" + m[4] + "'"); return; }
        const a = A[i], b = num ? Number(m[4]) : B[i];
        const ok = { ">": a > b, "<": a < b, ">=": a >= b, "<=": a <= b, "=": Math.abs(a - b) <= 3 }[m[3]];
        if (!ok) problems.push(key + " FEATS broken: " + m[1] + " " + m[2] + " (" + a + ") " + m[3] + " " + m[4] + (num ? "" : " (" + b + ")") + " — " + m[5]);
    });
    for (let s = 0; s < 6; s++) {
        const v = rows.map(r => r[s + 2]), top = v.filter(x => x >= 97).length, hi = v.filter(x => x >= 90).length;
        if (top > 3) problems.push(key + ": " + top + " characters at 97+ in " + Object.keys(STAT)[s] + " (the series' best is 1-3 characters)");
        if (hi > Math.ceil(rows.length / 4)) warn.push(key + ": " + hi + "/" + rows.length + " at 90+ in " + Object.keys(STAT)[s]);
    }
    rows.forEach(r => { const v = r.slice(2, 8); if (Math.max(...v) - Math.min(...v) < 8) review.push(key + " " + r[1] + ": all six Mixed stats within 8 points (" + v.join(" ") + ")"); });
    if (key === "windbreaker") rows.forEach(r => { if (Math.abs(r[9] - r[5]) > 15) warn.push(key + " " + r[1] + ": Endurance " + r[9] + " far from Durability " + r[5]); });
}
review.forEach(w => console.log("review:", w));
warn.forEach(w => console.log("warn:", w));
problems.forEach(p => console.log("ERROR:", p));
console.log(total + " characters in " + Object.keys(CHARS).length + " series, " + problems.length + " errors, " + warn.length + " warnings");
process.exit(problems.length ? 1 : 0);
