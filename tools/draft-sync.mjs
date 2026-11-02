// Anime Draft: refreshes popularity (AniList favourites) and pictures for every draftable character.
// Writes data/draft-pop.json, which the game reads at load; rarity is ranked from it.
// Run: node tools/draft-sync.mjs   (also runs weekly from .github/workflows/draft-sync.yml)
// Live matches never call AniList: each match freezes the rarity of every drawn character in its state.
import fs from "fs";
import { CHARS } from "../js/draft/data.js";

const OUT = new URL("../data/draft-pop.json", import.meta.url);
const IMG = "https://s4.anilist.co/file/anilistcdn/character/large/";
const Q = "query($ids:[Int],$page:Int){Page(page:$page,perPage:50){characters(id_in:$ids){id favourites image{large}}}}";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function ask(ids) {
    for (let attempt = 0; attempt < 6; attempt++) {
        try {
            const r = await fetch("https://graphql.anilist.co", { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify({ query: Q, variables: { ids, page: 1 } }) });
            if (r.status === 429 || r.status >= 500) { await sleep(Math.max(Number(r.headers.get("Retry-After")) || 0, 2 ** attempt) * 1000 + 1000); continue; }
            const j = await r.json();
            if (!j.data) throw new Error(JSON.stringify(j.errors || j).slice(0, 200));
            return j.data.Page.characters;
        } catch (e) { if (attempt === 5) throw e; await sleep(2000 * (attempt + 1)); }
    }
    return [];
}

const ids = Object.values(CHARS).flat().map(r => r[0]);
const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : { chars: {} };
const chars = {};
for (let i = 0; i < ids.length; i += 50) {
    const part = ids.slice(i, i + 50), got = await ask(part);
    got.forEach(c => {
        const img = c.image && c.image.large && !/default/i.test(c.image.large) ? c.image.large.replace(IMG, "") : "";
        chars[c.id] = [Number(c.favourites) || 0, img];
    });
    process.stdout.write(".");
    await sleep(900);                       // stay under AniList's rate limit
}
const missing = ids.filter(id => !chars[id]);
missing.forEach(id => { if (old.chars && old.chars[id]) chars[id] = old.chars[id]; });   // keep the last known value
fs.mkdirSync(new URL("../data/", import.meta.url), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ v: 1, built: new Date().toISOString(), chars }) + "\n");
console.log("\n" + Object.keys(chars).length + "/" + ids.length + " characters synced" + (missing.length ? ", not found on AniList: " + missing.join(", ") : ""));
