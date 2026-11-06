/* =====================================================================
   ARCADE VAULT · SHOP RULES (pure; tested in tools/vault-test.mjs)
   Season 1 skins (each tier as a Frame and as a profile-picture Background, bundle -20%), scratch cards,
   the wardrobe (what's equipped) and duplicate refunds. Cosmetics can't be traded or gifted.
   Inventory: w.inv[itemId] = 1. Equipped: w.equip = { sf, bg, title, ts, uc, sleeve } (item ids, "" = none).
   ===================================================================== */
import { SKINS, SCRATCH } from "./config.js?v=3";
import { rngFrom, pickWeighted, pickInt } from "./rng.js?v=1";

/* ---------- the catalogue ---------- */
export const SKIN_ITEMS = [];
SKINS.tiers.forEach(t => {
    const earnOnly = SKINS.earnOnly.includes(t.id);
    SKIN_ITEMS.push({ id: "sf_" + t.id, kind: "frame", slot: "sf", tier: t.id, name: t.name + " Frame - Season " + SKINS.season, price: t.price, animated: !!t.animated, earnOnly });
    SKIN_ITEMS.push({ id: "bg_" + t.id, kind: "bg", slot: "bg", tier: t.id, name: t.name + " Background - Season " + SKINS.season, price: t.price, animated: !!t.animated, earnOnly });
});
const mkList = (kind, slot, rarity, names) => names.map(n => ({ id: (kind === "title" ? "t_" : kind === "tskin" ? "ts_" : "uc_") + n.toLowerCase().replace(/[^a-z0-9]+/g, ""), kind, slot, rarity, name: n }));
export const SCRATCH_ITEMS = [
    ...mkList("title", "title", "common", ["Filler Arc Survivor", "Opening Skipper", "Episode One Hero", "Side Character", "Sub Purist", "Dub Defender", "Binge Watcher", "Cliffhanger Victim", "Manga Reader", "Seasonal Fan", "Recap Enjoyer", "Background Extra"]),
    ...mkList("title", "title", "rare", ["Plot Armor", "Power Scaler", "Rival Energy", "Training Arc", "Flashback Master", "Tournament Arc", "Comeback Kid", "Hype Train"]),
    ...mkList("title", "title", "epic", ["Main Character", "Sakuga Enjoyer", "Arc Villain", "Final Form", "Domain Master"]),
    ...mkList("title", "title", "legendary", ["Peak Fiction", "The Chosen One", "Beyond Limits", "Living Legend"]),
    ...mkList("tskin", "ts", "common", ["Ember", "Frost", "Moss", "Dusk"]),
    ...mkList("tskin", "ts", "rare", ["Sunset", "Ocean", "Toxic", "Sakura Fade"]),
    ...mkList("tskin", "ts", "epic", ["Neon", "Glitch", "Thunder"]),
    ...mkList("tskin", "ts", "legendary", ["Gold Foil", "Spectrum"]),
    ...mkList("ucol", "uc", "common", ["Crimson", "Azure", "Lime", "Violet", "Amber", "Rose", "Teal", "Silver"]),
    ...mkList("ucol", "uc", "rare", ["Fire Gradient", "Ice Gradient", "Jade Gradient", "Royal Gradient"]),
    ...mkList("ucol", "uc", "epic", ["Neon Glow", "Shadow Aura", "Electric"]),
    ...mkList("ucol", "uc", "legendary", ["Prismatic Flow", "Golden Aura"])
];
export const KIND_NAME = { title: "Title", tskin: "Title skin", ucol: "Username style", frame: "Frame", bg: "Background", sleeve: "Card sleeve" };
export const sleeveItem = series => ({ id: "sl_" + series, kind: "sleeve", slot: "sleeve", series, name: "Sleeve" });
const BY_ID = Object.fromEntries([...SKIN_ITEMS, ...SCRATCH_ITEMS].map(i => [i.id, i]));
export const itemById = id => BY_ID[id] || (/^sl_/.test(id) ? sleeveItem(id.slice(3)) : null);
export const owns = (w, id) => !!(w.inv || {})[id];
export const bundlePrice = tier => { const t = SKINS.tiers.find(x => x.id === tier); return t ? Math.round(t.price * 2 * (1 - SKINS.bundleOff)) : 0; };

/* ---------- buying skins ---------- */
export function buySkin(w, id) {
    const it = BY_ID[id]; if (!it || !/^(sf|bg)_/.test(id)) return { error: "Unknown item" };
    if (it.earnOnly || SKINS.earnOnly.includes(it.tier)) return { error: "This one can't be bought: it's earned." };
    if (owns(w, id)) return { error: "You already own it." };
    if (w.coins < it.price) return { error: "Not enough coins" };
    w.coins -= it.price; w.inv = Object.assign({}, w.inv, { [id]: 1 });
    return { item: id, paid: it.price };
}
export function buyBundle(w, tier) {
    const f = BY_ID["sf_" + tier], b = BY_ID["bg_" + tier]; if (!f || !b) return { error: "Unknown tier" };
    if (f.earnOnly || SKINS.earnOnly.includes(tier)) return { error: "This one can't be bought: it's earned." };
    if (owns(w, f.id) || owns(w, b.id)) return { error: "You already own part of this bundle: buy the other part on its own." };
    const price = bundlePrice(tier); if (w.coins < price) return { error: "Not enough coins" };
    w.coins -= price; w.inv = Object.assign({}, w.inv, { [f.id]: 1, [b.id]: 1 });
    return { items: [f.id, b.id], paid: price };
}
/* any other source of a cosmetic (future prestige rewards, events): a duplicate refunds part of its price */
export function grantCosmetic(w, id) {
    const it = itemById(id); if (!it) return { error: "Unknown item" };
    if (owns(w, id)) { const refund = it.price ? Math.round(it.price * SKINS.dupRefund) : (SCRATCH.dupRefund[it.rarity] || 0); w.coins += refund; return { item: id, dup: true, refund }; }
    w.inv = Object.assign({}, w.inv, { [id]: 1 }); return { item: id, dup: false, refund: 0 };
}

/* ---------- scratch cards: the reward is rolled (and granted) BEFORE the scratch UI; scratching only reveals it ---------- */
const RAR = ["common", "rare", "epic", "legendary"];
export function rollScratch(w, tierKey, seed) {
    const T = SCRATCH.tiers[tierKey]; if (!T) return { error: "Unknown scratch card" };
    if (w.coins < T.price) return { error: "Not enough coins" };
    w.coins -= T.price;
    const rng = rngFrom(seed), kind = pickWeighted(rng, T.types);
    let rarity = pickWeighted(rng, T.odds);
    let pool = SCRATCH_ITEMS.filter(i => i.kind === kind && i.rarity === rarity);
    for (let k = RAR.indexOf(rarity); !pool.length && k >= 0; k--) { rarity = RAR[k]; pool = SCRATCH_ITEMS.filter(i => i.kind === kind && i.rarity === rarity); }
    const it = pool[pickInt(rng, pool.length)];
    let refund = 0, dup = false;
    if (owns(w, it.id)) { dup = true; refund = SCRATCH.dupRefund[rarity]; w.coins += refund; }
    else w.inv = Object.assign({}, w.inv, { [it.id]: 1 });
    return { seed, tier: tierKey, item: it.id, kind, rarity, dup, refund, paid: T.price };
}

/* ---------- wardrobe ---------- */
export const SLOTS = ["sf", "bg", "title", "ts", "uc", "sleeve"];
export function equip(w, slot, id) {
    if (!SLOTS.includes(slot)) return { error: "Unknown slot" };
    if (id) { const it = itemById(id); if (!it || it.slot !== slot) return { error: "That doesn't go there" }; if (!owns(w, id)) return { error: "You don't own it" }; }
    w.equip = Object.assign({}, w.equip, { [slot]: id || "" });
    return { slot, id: id || "" };
}
/* what the profile shows to everyone (only what is owned) */
export function publicLook(w) {
    const e = w.equip || {}, ok = id => id && owns(w, id) ? id : "";
    const t = ok(e.title);
    return { sf: ok(e.sf).replace(/^sf_/, ""), bg: ok(e.bg).replace(/^bg_/, ""), ts: ok(e.ts).replace(/^ts_/, ""), uc: ok(e.uc).replace(/^uc_/, ""), vtn: t ? itemById(t).name : "" };
}
