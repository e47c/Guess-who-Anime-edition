// ANIME TCG card art audit: node tools/card-art-audit.mjs [--fix] [--refresh]
// Downloads every card picture (cached in .cache/card-art/, git-ignored) and checks it:
//   missing   no picture URL at all
//   failed    the URL doesn't answer 200 with an image (gone, renamed, blocked)
//   tiny      smaller than MIN_W x MIN_H (blurry on a large card)
//   aspect    not a portrait between ASPECT[0] and ASPECT[1] (width / height)
//   focus     the stored face point was measured on a picture of another size (stale) or is missing
// --fix asks AniList for the character's current picture when one is missing / failed / tiny and keeps the new one
// (data/card-art-fix.json, read by tools/cards-build.mjs before draft-pop.json) if it passes the same checks.
// Writes data/card-art-audit.json (per card) and docs/card-art-report.md (the human report: every problem, every fix,
// and every card that would still need the series placeholder). Exit code 1 if any shipped card is still broken.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { CARD_ROWS, CARD_SERIES, CARD_IMG } from "../js/vault/cards.js";

const root = new URL("../", import.meta.url), CACHE = new URL(".cache/card-art/", root);
const MIN_W = 200, MIN_H = 200, ASPECT = [0.55, 1.05];      // AniList "large" is 230 wide; squarer pictures are shown whole (fit)
const args = new Set(process.argv.slice(2)), FIX = args.has("--fix"), REFRESH = args.has("--refresh");
const readJson = f => { try { return JSON.parse(readFileSync(new URL(f, root), "utf8")); } catch (e) { return {}; } };
const focus = readJson("data/card-focus.json"), focusFix = readJson("data/card-focus-fix.json"), artFix = readJson("data/card-art-fix.json");
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync(CACHE, { recursive: true });

/* width / height from the file header (PNG, JPEG, GIF, WebP) */
function dims(b) {
    if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), t: "png" };
    if (b.length > 10 && b[0] === 0x47 && b[1] === 0x49) return { w: b.readUInt16LE(6), h: b.readUInt16LE(8), t: "gif" };
    if (b.length > 30 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
        const k = b.toString("ascii", 12, 16);
        if (k === "VP8X") return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3), t: "webp" };
        if (k === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff, t: "webp" };
        if (k === "VP8L") { const n = b.readUInt32LE(21); return { w: 1 + (n & 0x3fff), h: 1 + ((n >> 14) & 0x3fff), t: "webp" }; }
    }
    if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
        let i = 2;
        while (i + 9 < b.length) {
            if (b[i] !== 0xff) { i++; continue; }
            const m = b[i + 1], len = b.readUInt16BE(i + 2);
            if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5), t: "jpg" };
            i += 2 + len;
        }
    }
    return null;
}
async function get(url, key) {
    const file = new URL(key, CACHE);
    if (!REFRESH && existsSync(file)) return { status: 200, buf: readFileSync(file), cached: true };
    for (let a = 0; a < 4; a++) {
        try {
            const r = await fetch(url, { headers: { "User-Agent": "anime-arcade-card-audit" } });
            if (r.status === 429 || r.status >= 500) { await sleep(1500 * (a + 1)); continue; }
            const buf = Buffer.from(await r.arrayBuffer());
            if (r.status === 200 && dims(buf)) writeFileSync(file, buf);
            return { status: r.status, buf };
        } catch (e) { await sleep(1000 * (a + 1)); }
    }
    return { status: 0, buf: Buffer.alloc(0) };
}
function check(id, url, res) {
    const issues = [];
    if (!url) return { issues: ["missing"] };
    const d = res && res.status === 200 ? dims(res.buf) : null;
    if (!d) return { issues: ["failed"], status: res ? res.status : 0 };
    if (d.w < MIN_W || d.h < MIN_H) issues.push("tiny");
    const ar = d.w / d.h; if (ar < ASPECT[0] || ar > ASPECT[1]) issues.push("aspect");
    const f = focusFix[id] || focus[id];
    if (!f) issues.push("focus");
    else if (!focusFix[id] && (f.w !== d.w || f.h !== d.h)) issues.push("focus");
    return { issues, w: d.w, h: d.h, t: d.t, bytes: res.buf.length };
}
async function anilist(ids) {
    const Q = "query($ids:[Int]){Page(perPage:50){characters(id_in:$ids){id name{full} image{large}}}}";
    for (let a = 0; a < 5; a++) {
        try {
            const r = await fetch("https://graphql.anilist.co", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ query: Q, variables: { ids } }) });
            if (r.status === 429) { await sleep(4000 * (a + 1)); continue; }
            const j = await r.json(); return (j.data && j.data.Page.characters) || [];
        } catch (e) { await sleep(2000); }
    }
    return [];
}

const rows = CARD_ROWS.map(r => ({ id: r[0], s: CARD_SERIES[r[1]], n: r[2], r: r[3], img: artFix[r[0]] ? artFix[r[0]].img : r[9] }));
const result = {};
let done = 0;
const queue = rows.slice();
await Promise.all(Array.from({ length: 8 }, async () => {
    while (queue.length) {
        const c = queue.shift(), url = c.img ? (/^http/.test(c.img) ? c.img : CARD_IMG + c.img) : "";
        const res = url ? await get(url, c.id + ".img") : null;
        result[c.id] = Object.assign({ id: c.id, n: c.n, s: c.s, img: c.img || "" }, check(c.id, url, res));
        if (++done % 100 === 0) process.stdout.write(done + " ");
    }
}));
console.log("");

// --fix: ask AniList for a current picture for every missing / failed / tiny one
const fixes = [];
if (FIX) {
    const bad = Object.values(result).filter(x => x.issues.some(i => ["missing", "failed", "tiny"].includes(i)));
    for (let i = 0; i < bad.length; i += 50) {
        const got = await anilist(bad.slice(i, i + 50).map(x => x.id));
        for (const ch of got) {
            const large = ch.image && ch.image.large;
            if (!large || /default/i.test(large)) continue;
            const key = large.replace(CARD_IMG, ""), x = result[ch.id];
            if (key === x.img) continue;
            const res = await get(large, ch.id + ".img"), chk = check(ch.id, large, res);
            if (chk.issues.some(i => ["failed", "tiny"].includes(i))) continue;
            artFix[ch.id] = { img: key, w: chk.w, h: chk.h, note: "audit " + new Date().toISOString().slice(0, 10) + ": was " + (x.img || "none") };
            fixes.push({ id: ch.id, n: x.n, from: x.img, to: key });
            Object.assign(x, chk, { img: key, fixed: true });
        }
        await sleep(900);
    }
    writeFileSync(new URL("data/card-art-fix.json", root), JSON.stringify(artFix, null, 1) + "\n");
}

const all = Object.values(result), by = k => all.filter(x => x.issues.includes(k));
const broken = all.filter(x => x.issues.some(i => ["missing", "failed"].includes(i)));
const stats = { cards: all.length, ok: all.filter(x => !x.issues.length).length, missing: by("missing").length, failed: by("failed").length, tiny: by("tiny").length, aspect: by("aspect").length, focus: by("focus").length, fixed: fixes.length, placeholder: broken.length };
writeFileSync(new URL("data/card-art-audit.json", root), JSON.stringify({ when: new Date().toISOString(), stats, cards: Object.fromEntries(all.map(x => [x.id, { w: x.w || 0, h: x.h || 0, issues: x.issues }])) }) + "\n");
const line = x => "| " + x.id + " | " + x.n + " | " + x.s + " | " + (x.w ? x.w + "×" + x.h : "-") + " | " + x.issues.join(", ") + " |";
const md = "# Card art audit\n\nGenerated by `node tools/card-art-audit.mjs" + (FIX ? " --fix" : "") + "` on " + new Date().toISOString().slice(0, 10) + ".\n\n" +
    "| | count |\n|---|---|\n" + Object.entries(stats).map(([k, v]) => "| " + k + " | " + v + " |").join("\n") + "\n\n" +
    "Checks: the picture answers 200 and is an image; at least " + MIN_W + "×" + MIN_H + " px; portrait between " + ASPECT[0] + " and " + ASPECT[1] + " (width / height); its face point was measured on a picture of the same size.\n\n" +
    "## Still needing the series placeholder (no usable picture anywhere)\n\n" + (broken.length ? "| id | name | series | size | issue |\n|---|---|---|---|---|\n" + broken.map(line).join("\n") : "None.") + "\n\n" +
    "## Fixed by this run (AniList's current picture)\n\n" + (fixes.length ? fixes.map(f => "- " + f.id + " " + f.n + ": " + (f.from || "none") + " → " + f.to).join("\n") : "None.") + "\n\n" +
    "## Other findings\n\n" + (all.filter(x => x.issues.length && !broken.includes(x)).map(line).join("\n") ? "| id | name | series | size | issue |\n|---|---|---|---|---|\n" + all.filter(x => x.issues.length && !broken.includes(x)).map(line).join("\n") : "None.") + "\n";
mkdirSync(new URL("docs/", root), { recursive: true });
writeFileSync(new URL("docs/card-art-report.md", root), md);
console.log(JSON.stringify(stats));
process.exitCode = broken.length ? 1 : 0;
