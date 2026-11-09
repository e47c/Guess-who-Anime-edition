/* =====================================================================
   CARD + PACK FACES (DOM; styles in css/cards.css)
   RARITY decides the frame's material, shape and effects; the SERIES decides colours, ornaments, the holo
   pattern, the card back and the pack art. No official logos: every series gets stylised text, colours and a
   simple emblem that evokes its mood.
   Anatomy (one component everywhere): name bar (series seal + the name, fitted, never cut), art window, ATK / DEF plates,
   type line (rarity stars + archetype · series), effect box (keyword chips, timing tags, the ability), footer
   (collection number, rarity). Rarity is readable without colour: the number of stars and the rarity word.
   The card turns as one rigid object (no layer slides; at most a hair of depth on Legendary / Mythic in the inspector).
   ===================================================================== */
import { CARDS, RARITY_NAMES, RARITY_KEYS } from "./carddb.js?v=6";
import { icon, KEYWORD_ICON } from "./icons.js?v=3";
import { corner } from "./cardstyle.js?v=1";
import { CARD_ART } from "./config.js?v=19";
import { ABILITIES, abilityText } from "../cardvault/abilities.js?v=4";

const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const svg = (paths, vb = "0 0 100 100") => `<svg viewBox="${vb}" aria-hidden="true">${paths}</svg>`;

/* c1 main, c2 second, c3 accent, ink = text on the series colour; motif = css pattern; holo = holo pattern */
export const SERIES_THEME = {
    onepiece:    { label: "One Piece", short: "ONE PIECE", c1: "#1f8a8a", c2: "#f2c94c", c3: "#c0392b", ink: "#fff8e1", motif: "parchment", holo: "waves", font: "pirate", kanji: "海",
        emblem: svg('<circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="7"/><circle cx="50" cy="50" r="8" fill="currentColor"/>' + [0, 45, 90, 135].map(a => `<rect x="47" y="8" width="6" height="84" rx="3" fill="currentColor" transform="rotate(${a} 50 50)"/>`).join("")) },
    naruto:      { label: "Naruto", short: "NARUTO", c1: "#f7801a", c2: "#151515", c3: "#ffd23f", ink: "#fff", motif: "scroll", holo: "spirals", font: "brush", kanji: "忍",
        emblem: svg('<path d="M50 50m-4 0a4 4 0 1 1 8 0a10 10 0 1 1-20 0a16 16 0 1 1 32 0a22 22 0 1 1-44 0a28 28 0 1 1 56 0" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>') },
    dragonball:  { label: "Dragon Ball", short: "DRAGON BALL", c1: "#ff8c1a", c2: "#ffcf3f", c3: "#d62828", ink: "#fff", motif: "burst", holo: "stars", font: "heavy", kanji: "龍",
        emblem: svg('<circle cx="50" cy="50" r="38" fill="currentColor" opacity=".35"/><path d="M50 22l7.6 17.5 19 1.7-14.4 12.6 4.3 18.6L50 62.6 33.5 72.4l4.3-18.6L23.4 41.2l19-1.7z" fill="currentColor"/>') },
    jjk:         { label: "Jujutsu Kaisen", short: "JUJUTSU", c1: "#2b1055", c2: "#0b0b12", c3: "#b15cff", ink: "#f2e9ff", motif: "cursed", holo: "brush", font: "brush", kanji: "呪",
        emblem: svg('<path d="M14 54c12-22 60-34 72-6-14 22-56 30-72 6z" fill="none" stroke="currentColor" stroke-width="6"/><circle cx="50" cy="50" r="10" fill="currentColor"/><path d="M20 84L80 18" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>') },
    demonslayer: { label: "Demon Slayer", short: "DEMON SLAYER", c1: "#1d6b4f", c2: "#0d0d0d", c3: "#e94f37", ink: "#f4fff9", motif: "checker", holo: "petals", font: "brush", kanji: "鬼",
        emblem: svg('<path d="M18 82L74 26" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M66 18l16 16" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><circle cx="74" cy="26" r="7" fill="none" stroke="currentColor" stroke-width="4"/>') },
    bleach:      { label: "Bleach", short: "BLEACH", c1: "#e9e9ef", c2: "#111", c3: "#ff7a1a", ink: "#111", motif: "ink", holo: "moon", font: "sharp", kanji: "霊",
        emblem: svg('<path d="M64 14a38 38 0 1 0 0 72a30 30 0 1 1 0-72z" fill="currentColor"/>') },
    aot:         { label: "Attack on Titan", short: "TITANS", c1: "#5d4a2e", c2: "#2c3a28", c3: "#c9a227", ink: "#f4ead2", motif: "wall", holo: "bricks", font: "military", kanji: "巨",
        emblem: svg('<path d="M10 80V40h80v40" fill="none" stroke="currentColor" stroke-width="6"/>' + [0, 1, 2].map(i => `<path d="M10 ${52 + i * 12}h80" stroke="currentColor" stroke-width="3"/>`).join("") + '<path d="M30 40V28h10v12M60 40V28h10v12" fill="currentColor"/>') },
    mha:         { label: "My Hero Academia", short: "HERO ACADEMIA", c1: "#16a34a", c2: "#dc2626", c3: "#facc15", ink: "#fff", motif: "halftone", holo: "bolts", font: "comic", kanji: "英",
        emblem: svg('<path d="M56 8L24 56h22l-8 36 38-52H52z" fill="currentColor"/>') },
    hxh:         { label: "Hunter x Hunter", short: "HUNTER", c1: "#2e8b57", c2: "#f4f1e8", c3: "#e63946", ink: "#fff", motif: "diamonds", holo: "suits", font: "sharp", kanji: "狩",
        emblem: svg('<path d="M50 10l18 22-18 22-18-22z" fill="currentColor"/><path d="M28 58c-10 0-14 14-4 20 6 3 12 0 14-5l-2 15h28l-2-15c2 5 8 8 14 5 10-6 6-20-4-20-8 0-12 8-12 8s-4-8-16-8z" fill="currentColor" opacity=".8"/>') },
    deathnote:   { label: "Death Note", short: "DEATH NOTE", c1: "#0b0b0b", c2: "#7a0010", c3: "#d4d4d4", ink: "#f5f5f5", motif: "gothic", holo: "feathers", font: "gothic", kanji: "死",
        emblem: svg('<path d="M50 30c-14-12-34-2-32 20 2 20 18 34 32 30 14 4 30-10 32-30 2-22-18-32-32-20z" fill="currentColor"/><path d="M50 30c0-10 4-16 12-20" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>') },
    chainsaw:    { label: "Chainsaw Man", short: "CHAINSAW", c1: "#ff6b1a", c2: "#141414", c3: "#ffd000", ink: "#fff", motif: "hazard", holo: "teeth", font: "heavy", kanji: "鎖",
        emblem: svg('<circle cx="50" cy="50" r="24" fill="none" stroke="currentColor" stroke-width="8"/>' + Array.from({ length: 12 }, (_, i) => `<path d="M50 10l6 14h-12z" fill="currentColor" transform="rotate(${i * 30} 50 50)"/>`).join("")) },
    blackclover: { label: "Black Clover", short: "BLACK CLOVER", c1: "#141414", c2: "#3a3a3a", c3: "#d4af37", ink: "#f6e7b0", motif: "grimoire", holo: "clovers", font: "gothic", kanji: "黒",
        emblem: svg([0, 90, 180, 270].map(a => `<path d="M50 50c-4-14-22-22-26-10-4 12 12 18 26 10z" fill="currentColor" transform="rotate(${a} 50 50)"/>`).join("") + '<path d="M50 50l18 36" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>') },
    jojo:        { label: "JoJo's Bizarre Adventure", short: "BIZARRE", c1: "#5b2a86", c2: "#ff4fa8", c3: "#ffd700", ink: "#fff", motif: "menacing", holo: "menacing", font: "pose", kanji: "奇",
        emblem: `<b class="ke-menace" aria-hidden="true">ゴ</b>` },
    rezero:      { label: "Re:Zero", short: "RE:ZERO", c1: "#4a6fa5", c2: "#c9b6e4", c3: "#f4f4ff", ink: "#fff", motif: "clock", holo: "clock", font: "elegant", kanji: "時",
        emblem: svg('<path d="M28 12h44M28 88h44M32 12c0 22 36 26 36 38s-36 16-36 38M68 12c0 22-36 26-36 38s36 16 36 38" fill="none" stroke="currentColor" stroke-width="5"/><path d="M42 80h16l-8-10z" fill="currentColor"/>') },
    fireforce:   { label: "Fire Force", short: "FIRE FORCE", c1: "#b3001b", c2: "#1a0505", c3: "#ff9f1c", ink: "#fff", motif: "flames", holo: "flames", font: "heavy", kanji: "炎",
        emblem: svg('<path d="M50 8c8 18 28 26 24 52-2 16-14 30-24 30S28 76 26 60c-2-14 8-20 12-30 4 10 6 14 12 16-4-14 0-28 0-38z" fill="currentColor"/>') },
    frieren:     { label: "Frieren", short: "FRIEREN", c1: "#9fd8c6", c2: "#f5fbf7", c3: "#7a8cc2", ink: "#20302c", motif: "meadow", holo: "petals", font: "elegant", kanji: "葬",
        emblem: svg([0, 72, 144, 216, 288].map(a => `<ellipse cx="50" cy="28" rx="11" ry="20" fill="currentColor" transform="rotate(${a} 50 50)"/>`).join("") + '<circle cx="50" cy="50" r="9" fill="#fff8"/>') },
    gachiakuta:  { label: "Gachiakuta", short: "GACHIAKUTA", c1: "#c9a227", c2: "#3b2f1e", c3: "#e4572e", ink: "#fff8dc", motif: "grime", holo: "splats", font: "graffiti", kanji: "塵",
        emblem: svg('<path d="M16 22l68 56M84 22L16 78" stroke="currentColor" stroke-width="12" stroke-linecap="round"/><path d="M30 80v12M70 78v8M50 70v18" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>') },
    windbreaker: { label: "Wind Breaker", short: "WIND BREAKER", c1: "#3aa0d8", c2: "#e8f6ff", c3: "#16365c", ink: "#fff", motif: "wind", holo: "wind", font: "sharp", kanji: "風",
        emblem: svg('<path d="M10 36h52c12 0 14-18 2-18-6 0-8 6-8 6M10 54h70c14 0 16 20 2 20-6 0-9-6-9-6M10 72h34" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>') }
};
export const theme = s => SERIES_THEME[s] || SERIES_THEME.onepiece;
export const seriesVars = (el, s) => { const T = theme(s); el.style.setProperty("--c1", T.c1); el.style.setProperty("--c2", T.c2); el.style.setProperty("--c3", T.c3); el.style.setProperty("--ink", T.ink); return el; };
/* ---------- the rarity star row: 1 star (Common) to 7 (Mythic); readable without colour ---------- */
export const rarityMark = r => { const m = mk("span", "vc-stars n" + (r + 1)); m.setAttribute("aria-label", RARITY_NAMES[r]); m.title = RARITY_NAMES[r]; m.innerHTML = icon("star").repeat(r + 1); return m; };
const statPlate = (cls, v, lbl) => { const g = mk("span", "vc-stat " + cls); g.innerHTML = icon(cls); g.appendChild(mk("b", null, String(v))); g.setAttribute("aria-label", lbl + " " + v); return g; };
/* stored stats are small integers (2-9); the card shows them x100 (ATK 800) */
export const SHOW = v => (Number(v) || 0) * 100;
/* the timing words written in an ability's text become tags; its keywords become chips with their icon */
const TIMING = /\b(On reveal|On clash|On damage|On win|On defeat|On summon|On attack|When attacked|When destroyed|Continuous|Once per turn)\b/gi;
export function abilityParts(abId) {
    const A = ABILITIES[abId] || { kw: [], text: "" }, t = A.text || "", tags = [];
    (t.match(TIMING) || []).forEach(x => { const k = x[0].toUpperCase() + x.slice(1).toLowerCase(); if (!tags.includes(k)) tags.push(k); });
    return { kw: A.kw || [], tags, text: t };
}
function abilityBox(c) {
    const P = abilityParts(c.ab), box = mk("div", "vc-abil"), chips = mk("div", "vc-chips");
    P.kw.forEach(k => { const ch = mk("span", "vc-kw"); ch.dataset.kw = k; ch.innerHTML = icon(KEYWORD_ICON[k] || "spirit"); ch.appendChild(mk("b", null, k)); chips.appendChild(ch); });
    P.tags.forEach(k => { const ch = mk("span", "vc-tm"); ch.innerHTML = icon("timing"); ch.appendChild(mk("b", null, k)); chips.appendChild(ch); });
    const txt = mk("p", "vc-abtxt"); txt.appendChild(mk("b", "vc-abname", c.abName + " "));
    // the text, with each timing word in bold
    let last = 0; P.text.replace(TIMING, (m, _g, at) => { if (at > last) txt.appendChild(document.createTextNode(P.text.slice(last, at))); txt.appendChild(mk("em", null, m)); last = at + m.length; return m; });
    if (last < P.text.length) txt.appendChild(document.createTextNode(P.text.slice(last)));
    const n = P.text.length + c.abName.length; box.classList.add(n < 62 ? "tl1" : n < 92 ? "tl2" : "tl3");
    box.append(chips, txt);
    return box;
}
/* Place a picture in its window (CARD_ART in config.js; face points from cards.js). Each rarity layout has its own window:
   the standard portrait window, the taller Ultra Rare window whose top 22% breaks out of the frame, or the whole card
   (Mythic). If filling the window ("cover") would cut off more than CARD_ART.maxCrop of the picture, the picture is
   shown whole instead ("fit": contained over a blurred, darkened copy). Covered pictures are placed so the face centre
   lands at targetY. a.dataset.mode / crop record what was done (the gallery checks them). */
const clamp01 = v => Math.max(0, Math.min(1, v));
export const windowRatio = r => { const W = CARD_ART; return r === 6 ? W.cardRatio[0] / W.cardRatio[1] : r === 3 ? W.artRatio / 1.22 : W.artRatio; };
export function artPlace(c, a, im, r) {
    const W = CARD_ART; r = r == null ? c.r : r;
    const A = windowRatio(r), ty = r === 6 ? W.targetYMythic : r === 3 ? (.22 + W.targetY) / 1.22 : W.targetY;
    const ar = c.ar || 2 / 3, kk = ar < A ? A / ar : ar / A, crop = 1 - 1 / kk;
    a.style.setProperty("--art", "url(\"" + c.img + "\")");
    if (c.fit || crop > W.maxCrop + 1e-6) { a.classList.add("fit"); a.dataset.mode = "fit"; a.dataset.crop = "0"; return; }
    a.dataset.mode = "cover"; a.dataset.crop = crop.toFixed(3);
    let px = .5, py = .5, ox = c.fx, oy = .5;
    if (ar < A && kk > 1.001) { py = clamp01((kk * c.fy - ty) / (kk - 1)); oy = kk * c.fy - py * (kk - 1); }
    else if (ar > A && kk > 1.001) { px = clamp01((kk * c.fx - .5) / (kk - 1)); ox = kk * c.fx - px * (kk - 1); oy = c.fy; }
    else oy = c.fy;
    im.style.objectPosition = (px * 100).toFixed(1) + "% " + (py * 100).toFixed(1) + "%";
    a.style.setProperty("--fo", (ox * 100).toFixed(1) + "% " + (oy * 100).toFixed(1) + "%");
    a.dataset.fy = oy.toFixed(3);
    if (c.fz > 1) a.style.setProperty("--fz", String(c.fz));
}
/* pictures: retried on failure, kept decoded for the pack opening (preloadArt), a series silhouette as the last resort */
const artCache = new Map();
export function preloadArt(ids) {
    (ids || []).forEach(id => {
        const c = CARDS[id]; if (!c || !c.img || artCache.has(c.img)) return;
        const im = new Image(); im.decoding = "async"; im.referrerPolicy = "no-referrer"; im.src = c.img; artCache.set(c.img, im);
        if (im.decode) im.decode().catch(() => {});
        while (artCache.size > (CARD_ART.preloadMax || 240)) artCache.delete(artCache.keys().next().value);
    });
}
const SILHOUETTE = '<svg class="vc-sil" viewBox="0 0 100 120" aria-hidden="true"><path d="M50 18a19 19 0 1 1 0 38 19 19 0 0 1 0-38zM12 120c2-31 19-48 38-48s36 17 38 48z" fill="currentColor"/></svg>';
function placeholder(a, c) { a.classList.remove("fit"); a.classList.add("noimg"); a.dataset.mode = "placeholder"; a.innerHTML = SILHOUETTE; a.appendChild(mk("b", "vc-silname", c.n)); }
function artLayer(c, r) {
    const a = mk("div", "vc-art");
    if (!c.img) { placeholder(a, c); return a; }
    const im = new Image(); im.alt = ""; im.decoding = "async"; im.loading = "lazy"; im.referrerPolicy = "no-referrer"; im.draggable = false;
    artPlace(c, a, im, r);
    let tries = 0;
    im.onerror = () => {
        const d = (CARD_ART.retries || [])[tries++];
        if (d == null) { im.remove(); placeholder(a, c); return; }
        setTimeout(() => { if (im.isConnected || !a.isConnected) im.src = c.img + (c.img.includes("?") ? "&" : "?") + "r=" + tries; }, d);
    };
    if (artCache.has(c.img)) im.loading = "eager";
    im.src = c.img;
    a.appendChild(im);
    return a;
}
/* ---------- only cards on screen animate; names and effect text are fitted once a card is laid out ---------- */
let visIO = null; const visSet = new Set();
function watchVis(el) {
    if (typeof IntersectionObserver === "undefined") { el.classList.add("vis"); return; }
    if (!visIO) visIO = new IntersectionObserver(list => list.forEach(e => {
        const t = e.target; t.classList.toggle("vis", e.isIntersecting);
        if (e.isIntersecting && !t.dataset.fitted) fitText(t);
        if (!t.isConnected) { visIO.unobserve(t); visSet.delete(t); }
    }), { rootMargin: "160px" });
    if (visSet.size > 500) visSet.forEach(x => { if (!x.isConnected) { visIO.unobserve(x); visSet.delete(x); } });
    visSet.add(el); visIO.observe(el);
}
/* shrink (never cut) the name and the effect text until they fit their boxes. Scale-free: a multiplier on the em size. */
export function fitText(card) {
    const one = (node, v, min) => {
        if (!node || !node.clientWidth) return true;
        let k = 1; node.style.setProperty(v, "1");
        while ((node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1) && k > min) { k = Math.round((k - .06) * 100) / 100; node.style.setProperty(v, String(k)); }
        return !(node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1);
    };
    const okN = one(card.querySelector(".vc-name"), "--nf", .5), okT = one(card.querySelector(".vc-abtxt"), "--tf", .62);
    if (card.clientWidth) card.dataset.fitted = okN && okT ? "1" : "over";
}

/* a card. o = { holo, size: "xs"|"sm"|"md"|"lg", isNew, gold (series complete), stamp: {by, at}, veteran, sleeve, faceDown,
   ghost (not owned), as (preview: draw it with another rarity's design; the dev gallery) } */
export function cardEl(id, o = {}) {
    const c = CARDS[id], r = c ? (o.as != null ? o.as : c.r) : 0, rk = RARITY_KEYS[r] || "common";
    const el = mk("div", "vcard r-" + rk + " sz-" + (o.size || "md"));
    if (!c) { el.classList.add("ghost"); return el; }
    const T = theme(c.s);
    el.dataset.id = id; el.classList.add("s-" + c.s, "m-" + T.motif, "h-" + T.holo, "f-" + T.font);
    if (o.holo) el.classList.add("holo"); if (o.gold) el.classList.add("gold"); if (o.ghost) el.classList.add("ghost"); if (o.faceDown) el.classList.add("down");
    seriesVars(el, c.s);
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", o.ghost ? "Not collected: " + c.no : c.n + ", " + RARITY_NAMES[r] + (o.holo ? " Holo" : "") + ", " + c.a + ", ATK " + SHOW(c.pow) + ", DEF " + SHOW(c.def) + ". " + c.abName + ": " + ABILITIES[c.ab].text);
    const inner = mk("div", "vc-inner");
    // front
    const f = mk("div", "vc-front");
    const bg = mk("div", "vc-bg"); if (r >= 5 && c.img) bg.style.backgroundImage = "url(\"" + c.img + "\")";
    f.appendChild(bg);
    const orn = mk("div", "vc-orn"); ["tl", "tr", "bl", "br"].forEach(k => { const i = mk("i", k); i.innerHTML = corner(c.s); orn.appendChild(i); }); f.appendChild(orn);
    f.appendChild(artLayer(c, r));
    if (r >= 4) f.appendChild(mk("div", "vc-artfx"));                         // Epic+: light foil blended into the art
    if (r >= 5) { const fg = mk("div", "vc-fg"); for (let i = 0; i < 9; i++) { const d = mk("i"); d.style.setProperty("--i", i); fg.appendChild(d); } f.appendChild(fg); }
    f.appendChild(mk("div", "vc-frame"));
    // name bar: the series seal + the name (fitted, wraps to two lines, never cut)
    const nb = mk("div", "vc-namebar"), seal = mk("span", "vc-seal"); seal.innerHTML = T.emblem; seal.title = T.label;
    const L = c.n.length, nm = mk("b", "vc-name nl" + (L <= 11 ? 1 : L <= 16 ? 2 : L <= 22 ? 3 : 4), c.n);
    nb.append(seal, nm); f.appendChild(nb);
    const st = mk("div", "vc-stats"); st.append(statPlate("atk", SHOW(c.pow), "ATK"), statPlate("def", SHOW(c.def), "DEF")); f.appendChild(st);
    const ty = mk("div", "vc-type"); ty.append(rarityMark(r), mk("span", "vc-arch", c.a + " · " + T.short)); f.appendChild(ty);
    f.appendChild(abilityBox(c));
    const foot = mk("div", "vc-foot"); foot.append(mk("span", "vc-no", "No. " + c.no), mk("span", "vc-ser", RARITY_NAMES[r] + (o.holo ? " · HOLO" : ""))); f.appendChild(foot);
    if (o.isNew) f.appendChild(mk("span", "vc-new", "NEW"));
    if (o.veteran) { const v = mk("span", "vc-vet"); v.innerHTML = icon("star"); v.title = "Veteran: in 10+ winning duels"; foot.prepend(v); }
    f.append(mk("div", "vc-shine"), mk("div", "vc-holo"));
    if (o.holo) f.appendChild(mk("div", "vc-sheen"));      // holo: the faint sheen over the dark parts (css/cards.css)
    f.appendChild(mk("div", "vc-glare"));
    // back (shown when the card is turned: the info side)
    const b = mk("div", "vc-back");
    b.appendChild(coverEl(c.s, o.sleeve));
    const info = mk("div", "vc-binfo");
    info.append(mk("b", "vc-bname", c.n), mk("small", "vc-barch", c.a + " · " + RARITY_NAMES[r] + (o.holo ? " · Holo" : "")),
        mk("span", "vc-bstat", "ATK " + SHOW(c.pow) + " · DEF " + SHOW(c.def)), mk("p", "vc-btxt", c.abName + ": " + ABILITIES[c.ab].text),
        mk("small", "vc-bkw", ABILITIES[c.ab].kw.join(" · ")), mk("span", "vc-bno", "No. " + c.no + " · " + T.label));
    if (o.stamp && o.stamp.by) info.appendChild(mk("span", "vc-stamp", "First pulled by " + o.stamp.by + (o.stamp.at ? " · " + new Date(o.stamp.at).toLocaleDateString() : "")));
    if (o.veteran) info.appendChild(mk("span", "vc-stamp vet", "Veteran"));
    b.appendChild(info);
    inner.append(f, b); el.appendChild(inner);
    watchVis(el);
    return el;
}
/* the back of a card (face down in packs and hands; the info side's background): the series design or the equipped
   sleeve: the series pattern, an inner frame with the series corner ornaments, a medallion with the emblem, the
   series name in its lettering, the kanji and the ANIME TCG mark */
export function coverEl(series, sleeve) {
    const s = sleeve && SERIES_THEME[sleeve] ? sleeve : series, T = theme(s);
    const d = mk("div", "vc-cover s-" + s + " m-" + T.motif + " h-" + T.holo + (sleeve ? " sleeved" : "")); seriesVars(d, s);
    const orn = mk("div", "vc-orn"); ["tl", "tr", "bl", "br"].forEach(k => { const i = mk("i", k); i.innerHTML = corner(s); orn.appendChild(i); });
    const e = mk("span", "vc-cemb"); e.innerHTML = T.emblem;
    d.append(mk("i", "vc-cpat"), orn, mk("small", "vc-cmark", "ANIME TCG"), e, mk("b", "vc-ctxt f-" + T.font, T.short), mk("i", "vc-ck", T.kanji));
    return d;
}
export function backCard(series, sleeve, size = "md") { const el = mk("div", "vcard back sz-" + size); el.appendChild(coverEl(series, sleeve)); return el; }

/* a sealed booster pack (styles: css/packs.css). Fixed booster proportions; a crimped (zig-zag) top and bottom seal
   with ridges, a vertical centre seam, puffed shading like air inside a foil bag, a crinkled foil texture, a
   specular highlight that follows the pointer / tilt (--mx, --my), rim light and a soft shadow.
   Normal = coloured foil, partly matte. Premium = metallic gold foil, embossed pattern, a stronger moving shine,
   finer crimp ridges. Front: the series title in its own lettering, its emblem as a big motif, the kanji, a rarity
   strip, the card count and the tier name. No official logos. */
const TEETH = { normal: 14, premium: 22 };
export function packClip(kind, amp = 1.6) {
    const n = TEETH[kind] || 14, top = [], bot = [];
    for (let i = 0; i <= n; i++) { const x = (i / n * 100).toFixed(2); top.push(x + "% " + (i % 2 ? 0 : amp) + "%"); bot.push((100 - i / n * 100).toFixed(2) + "% " + (100 - (i % 2 ? 0 : amp)) + "%"); }
    return "polygon(" + top.concat(bot).join(", ") + ")";
}
/* a character silhouette on the pack (our own drawings, one of three builds per series) */
const PACK_SIL = {
    spiky: '<path d="M10 120c2-26 18-40 40-40s38 14 40 40z"/><circle cx="50" cy="56" r="19"/><path d="M28 50 18 24l17 13 2-27 13 21 12-23 2 25 18-12-10 29z"/>',
    hat: '<path d="M10 120c2-26 18-40 40-40s38 14 40 40z"/><circle cx="50" cy="60" r="18"/><path d="M8 47c0-5 19-8 42-8s42 3 42 8-19 7-42 7S8 52 8 47z"/><path d="M30 42c1-14 9-21 20-21s19 7 20 21z"/>',
    long: '<path d="M10 120c2-26 18-40 40-40s38 14 40 40z"/><path d="M28 58c0-20 9-32 22-32s22 12 22 32v34c-7 6-37 6-44 0z"/>'
};
const SIL_OF = { onepiece: "hat", naruto: "spiky", dragonball: "spiky", jjk: "spiky", demonslayer: "long", bleach: "spiky", aot: "long", mha: "spiky", hxh: "spiky", deathnote: "long",
    chainsaw: "spiky", blackclover: "spiky", jojo: "long", rezero: "long", fireforce: "spiky", frieren: "long", gachiakuta: "spiky", windbreaker: "long" };
const PACK_GEM = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3l14 10-5 22H11L6 13z" fill="#7a5410"/><path d="M20 6l11 8-4 18H13L9 14z" fill="url(#vpg)"/><path d="M9 14h22M13 32l7-26 7 26M20 6l-7 8 7 18 7-18z" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1"/><defs><linearGradient id="vpg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd1e8"/><stop offset=".45" stop-color="#e0245e"/><stop offset="1" stop-color="#5a0a2a"/></linearGradient></defs></svg>';
const RCOL = ["#9aa1ab", "#b08d4a", "#4aa8ff", "#c9b6ff", "#ff4fa0", "#ffd76a", "#b06bff"];
export function packEl(series, kind = "normal", o = {}) {
    const T = theme(series), el = mk("div", "vpack k-" + kind + " s-" + series); seriesVars(el, series);
    el.setAttribute("role", "img"); el.setAttribute("aria-label", T.label + " " + (kind === "premium" ? "Premium" : "Normal") + " pack, " + (kind === "premium" ? 6 : 5) + " cards");
    const body = mk("div", "vp-body m-" + T.motif); body.style.clipPath = packClip(kind);
    const big = mk("i", "vp-big"); big.innerHTML = T.emblem;
    const title = mk("div", "vp-title f-" + T.font + (T.short.length > 9 ? " long" : "")); title.append(mk("small", null, "ANIME TCG"), mk("b", null, T.short));
    const strip = mk("div", "vp-strip"); const bars = mk("span", "vp-bars"); RCOL.forEach((c, i) => { const b = mk("i"); b.style.setProperty("--rc", c); b.style.setProperty("--i", i); bars.appendChild(b); }); strip.append(bars, mk("small", null, kind === "premium" ? "RARE OR BETTER INSIDE" : "COMMON → MYTHIC"));
    const label = mk("div", "vp-label"); label.append(mk("b", null, (o.cards || (kind === "premium" ? 6 : 5)) + " CARDS"), mk("small", null, kind === "premium" ? "PREMIUM PACK" : "NORMAL PACK"));
    const sil = mk("i", "vp-sil"); sil.innerHTML = '<svg viewBox="0 0 100 120" aria-hidden="true">' + PACK_SIL[SIL_OF[series] || "spiky"] + "</svg>";
    if (kind === "premium") { const crest = mk("i", "vp-crest"); crest.innerHTML = PACK_GEM; body.appendChild(crest); label.firstChild.textContent = (o.cards || 6) + " CARDS · 1 RARE+ GUARANTEED"; label.classList.add("banner"); }
    body.prepend(mk("i", "vp-base"), big, sil);
    body.append(mk("b", "vp-kanji", T.kanji), title, strip, label,
        mk("i", "vp-crimp top"), mk("i", "vp-crimp bot"), mk("i", "vp-seam"), mk("i", "vp-puff"), mk("i", "vp-crinkle"), mk("i", "vp-spec"), mk("i", "vp-shine"), mk("i", "vp-rim"));
    const shadow = mk("i", "vp-shadow"), sh = mk("i"); sh.style.clipPath = body.style.clipPath; shadow.appendChild(sh); shadow.setAttribute("aria-hidden", "true");
    el.append(shadow, body);
    return el;
}
/* the pointer / finger moves the light over foil and holo */
export function bindShine(el, opts = {}) {
    const on = e => {
        const r = el.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width), y = ((e.clientY - r.top) / r.height);
        el.style.setProperty("--mx", (x * 100).toFixed(1) + "%"); el.style.setProperty("--my", (y * 100).toFixed(1) + "%");
        if (opts.tilt) { el.style.setProperty("--ry", ((x - .5) * opts.tilt).toFixed(2) + "deg"); el.style.setProperty("--rx", ((.5 - y) * opts.tilt).toFixed(2) + "deg"); }
    };
    const off = () => { if (opts.tilt) { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); } };
    el.addEventListener("pointermove", on); el.addEventListener("pointerleave", off);
    return () => { el.removeEventListener("pointermove", on); el.removeEventListener("pointerleave", off); };
}

/* ---------- one solid card: thickness ----------
   Card-stock slices between the two faces (inside .vc-inner, which keeps 3D), so a tilted card shows a real edge and
   turns as one rigid object. Used by the inspect view and the pack opening. */
export function thicken(el) {
    const inner = el && el.querySelector(".vc-inner"); if (!inner || el.classList.contains("thick")) return el;
    [-.07, -.035, 0, .035, .07].forEach(z => { const e = mk("i", "vc-edge"); e.style.setProperty("--z", z + "em"); inner.prepend(e); });
    el.classList.add("thick");
    return el;
}
/* ---------- holo light: the foil follows the pointer over any holo card (collection, decks, summary, duels).
   The inspect view and the pack opening drive the same variables from the tilt. Off under Reduced effects. ---------- */
if (typeof document !== "undefined") {
    let raf = 0, card = null, pt = null;
    const reduced = () => document.body && document.body.classList.contains("fx-lite");
    const put = () => { raf = 0; if (!card || !pt || !card.isConnected) return; const r = card.getBoundingClientRect(); if (!r.width) return;
        const x = Math.max(0, Math.min(1, (pt[0] - r.left) / r.width)), y = Math.max(0, Math.min(1, (pt[1] - r.top) / r.height));
        card.style.setProperty("--mx", (x * 100).toFixed(1) + "%"); card.style.setProperty("--my", (y * 100).toFixed(1) + "%"); card.style.setProperty("--px", (x - .5).toFixed(3)); card.style.setProperty("--py", (y - .5).toFixed(3)); };
    document.addEventListener("pointermove", e => {
        const c = e.target && e.target.closest ? e.target.closest(".vcard.holo") : null;
        if (!c || reduced() || c.closest(".vc-inspect") || c.closest(".pk-deck")) return;      // those two drive it themselves
        card = c; pt = [e.clientX, e.clientY]; if (!raf) raf = requestAnimationFrame(put);
    }, { passive: true });
    document.addEventListener("pointerout", e => {
        const c = e.target && e.target.closest ? e.target.closest(".vcard.holo") : null;
        if (!c || c.contains(e.relatedTarget) || c.closest(".vc-inspect") || c.closest(".pk-deck")) return;
        ["--mx", "--my", "--px", "--py"].forEach(k => c.style.removeProperty(k)); if (card === c) card = null;
    }, { passive: true });
}
