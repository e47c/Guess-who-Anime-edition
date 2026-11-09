/* =====================================================================
   SEASON 3 SKINS · the other nine tiers (Iron, Bronze, Silver, Gold, Platinum, Emerald, Water, Transcendent,
   Prismatic). Same contract as Ruby / Diamond / Flame in js/skins3.js:
     FRAMES_MORE[tier] = { full(u), medium(u), compact(u), fx? (a canvas effect for the full level) }
       -> SVG markup (full / medium: viewBox -30..130, picture radius 33; compact: viewBox -12..112, picture radius 40).
       u = a unique id suffix; "¤" = the player's picture URL (Silver's mirror shards reflect it).
       Classes: .s3-e-* = entrance (once), .s3-sec = a secondary loop, the named loops in css/skins3.css.
     SCENES_MORE[tier](level) = { layers: [{ d (depth), img (static SVG 400x252), ov (animated SVG overlay), cls }],
       html (CSS overlay layers), canvas (a canvas effect for the full level), scrim: [left, bottom] }
     STEPS_MORE[name](it, dt, W, H, S) = a canvas effect (S = the shared sprites).
   No concept, silhouette, motif or palette treatment of Seasons 1-2 is reused for the same tier, and nothing here
   draws diagonal stripes.
   ===================================================================== */
import { n2, XY, P, arc, lg, rg, mix, rnd, star4, poly, brilliant, SHADOW } from "./skins3-kit.js?v=1";

const at = (a, inner) => `<g transform='translate(50 50) rotate(${a})'>${inner}</g>`;          // local frame: origin = picture centre, -y = outward at angle a
const pt = (r, a) => [n2(r * Math.sin(a * Math.PI / 180)), n2(-r * Math.cos(a * Math.PI / 180))]; // a point in that local frame
const sty = (o) => `style='${Object.entries(o).map(([k, v]) => k + ":" + v).join(";")}'`;
const twinkles = (list, s = 3.4) => list.map(([x, y, d]) => `<g transform='translate(${x} ${y})'><path class='s3-twinkle s3-sec' ${sty({ "animation-delay": -d + "s" })} d='${star4(s, .14)}' fill='#fff'/></g>`).join("");

/* =========================== FRAMES =========================== */
export const FRAMES_MORE = {
    /* IRON: four mech-visor segments (brow, cheeks, chin) that slide in and lock around the picture, status lights,
       hex bolts, panel seams; tiny sparks jump across the gaps. Entrance: the segments slide in and lock. */
    iron: {
        full: u => ironFrame(u, "full"), medium: u => ironFrame(u, "medium"),
        compact: u => `<defs>${lg("gm" + u, [[0, "#a9b1ba"], [.4, "#4b525b"], [.7, "#7a828c"], [1, "#262a30"]])}</defs>`
            + [0, 90, 180, 270].map(a => at(a, `<path d='M${pt(40.5, -30).join(" ")}L${pt(49, -24).join(" ")}A49 49 0 0 1 ${pt(49, 24).join(" ")}L${pt(40.5, 30).join(" ")}A40.5 40.5 0 0 0 ${pt(40.5, -30).join(" ")}Z' fill='url(#gm${u})' stroke='#0d0f12' stroke-width='.8'/><circle cx='0' cy='-45' r='1.6' fill='#5ff3ff'/>`)).join("")
    },
    /* BRONZE: an ancient astrolabe: an engraved outer ring with degree ticks, a ring of runes that glow one after
       another, a rete of star pointers turning the other way, a sighting rule (alidade) turning behind, and the
       suspension throne with its shackle on top. Entrance: the rings spin up into place, the runes light. */
    bronze: { full: u => astrolabe(u, "full"), medium: u => astrolabe(u, "medium"), compact: u => astrolabe(u, "compact") },
    /* SILVER: a polished crescent moon cradling the picture, with mirror shards floating in its open side; each shard
       reflects the player's own picture. Entrance: the moon swings in, the shards fly out of it. */
    silver: { full: u => moon(u, "full"), medium: u => moon(u, "medium"), compact: u => moon(u, "compact") },
    /* GOLD: a baroque cartouche: C-scroll volutes with acanthus leaves down both sides, a scallop shell below, and a
       filigree crown of arches with gem inlays and pearls on top; a slow light glint travels over the gold.
       Entrance: the crown lowers, the scrolls unfurl. */
    gold: { full: u => cartouche(u, "full"), medium: u => cartouche(u, "medium"), compact: u => cartouche(u, "compact") },
    /* PLATINUM: a holographic targeting reticle: satin platinum corner brackets projecting cyan holo arcs, crosshair
       ticks, a rotating scan sweep, a lock-on pulse and data nodes orbiting with their link lines.
       Entrance: the brackets snap in, the arcs draw. */
    platinum: { full: u => reticle(u, "full"), medium: u => reticle(u, "medium"), compact: u => reticle(u, "compact") },
    /* EMERALD: living vines climbing around the picture with real leaves (veins, sheen), curling tendrils, emerald
       dewdrops, and fireflies drifting. Entrance: the vines grow and the leaves unfurl one by one. */
    emerald: { full: u => vines(u, "full"), medium: u => vines(u, "medium"), compact: u => vines(u, "compact") },
    /* WATER: a serpent made of water coiling around the picture: a translucent body with a flowing current, a crest
       of fins, foam along its back, glowing eyes, droplets falling. Full: a canvas of spray and droplets.
       Entrance: the serpent coils in from its tail. */
    water: { full: u => serpent(u, "full"), medium: u => serpent(u, "medium"), compact: u => serpent(u, "compact"), fx: "spray" },
    /* TRANSCENDENT: a celestial gate: two luminous pillars and an arch with a keystone frame the picture, a slow
       eclipse passes over the sun above the arch, and three planets (one ringed) orbit the gate.
       Entrance: the gate rises, the eclipse and the planets appear. */
    transcendent: { full: u => gate(u, "full"), medium: u => gate(u, "medium"), compact: u => gate(u, "compact") },
    /* PRISMATIC: a living glass prism above the picture: a white beam enters it and leaves as a fan of spectrum rays
       that sweep around the picture; the prism turns slowly and its edges catch the light.
       Entrance: the prism forms, the beam shoots in, the spectrum unfurls. */
    prismatic: { full: u => prism(u, "full"), medium: u => prism(u, "medium"), compact: u => prism(u, "compact") }
};

function ironFrame(u, lv) {
    const full = lv === "full";
    const seg = (a, i) => {
        const shell = `M${pt(35.5, -31).join(" ")}L${pt(42.5, -34).join(" ")}L${pt(47.5, -28).join(" ")}A47.5 47.5 0 0 1 ${pt(47.5, 28).join(" ")}L${pt(42.5, 34).join(" ")}L${pt(35.5, 31).join(" ")}A35.5 35.5 0 0 0 ${pt(35.5, -31).join(" ")}Z`;
        const detail = full ? `<path d='M${pt(41, -24).join(" ")}A41 41 0 0 1 ${pt(41, -7).join(" ")}M${pt(41, 7).join(" ")}A41 41 0 0 1 ${pt(41, 24).join(" ")}' fill='none' stroke='#14171b' stroke-width='.55'/>`
            + `<path d='M${pt(36.5, -14).join(" ")}L${pt(46.5, -14).join(" ")}M${pt(36.5, 14).join(" ")}L${pt(46.5, 14).join(" ")}' stroke='#14171b' stroke-width='.5'/>`
            + [-21, 21].map(o => { const [x, y] = pt(44, o); return `<path d='${poly([...Array(6)].map((_, k) => [x + 1.25 * Math.cos(k * Math.PI / 3), y + 1.25 * Math.sin(k * Math.PI / 3)]))}' fill='url(#bt${u})' stroke='#0d0f12' stroke-width='.3'/>`; }).join("") : "";
        const clamp = `<path d='M-5.5 -45.5L-4 -53.5L4 -53.5L5.5 -45.5Z' fill='url(#gd${u})' stroke='#0b0d10' stroke-width='.5'/><rect x='-3' y='-52' width='6' height='1.1' rx='.5' fill='#0b0d10'/>`
            + `<circle class='s3-led' ${sty({ "animation-delay": (-i * .45) + "s" })} cx='0' cy='-48.6' r='1.5' fill='${i % 2 ? "#ffb347" : "#5ff3ff"}'/>`;
        return at(a, `<g class='s3-e-slide' ${sty({ "animation-delay": (i * .12) + "s" })}><g class='s3-visor s3-sec' ${sty({ "animation-delay": (-i * .7) + "s" })}>`
            + `<path d='${shell}' fill='url(#gm${u})' stroke='#0b0d10' stroke-width='.8'/><path d='M${pt(46.8, -26).join(" ")}A46.8 46.8 0 0 1 ${pt(46.8, 26).join(" ")}' fill='none' stroke='#fff' stroke-opacity='.4' stroke-width='.6'/>`
            + `<path d='M${pt(36.2, -28).join(" ")}A36.2 36.2 0 0 1 ${pt(36.2, 28).join(" ")}' fill='none' stroke='#000' stroke-opacity='.55' stroke-width='.8'/>${detail}${clamp}</g></g>`);
    };
    const sparks = full ? [45, 135, 225, 315].map((a, i) => { const [x, y] = XY(41.5, a); return `<g transform='translate(${x} ${y}) rotate(${a})'><g class='s3-spark' ${sty({ "animation-delay": (-i * .83) + "s" })}><path d='${star4(3.2, .12)}' fill='#fff6d0'/><path d='M0 0L2.6 -3.4M0 0L-2 -3.8M0 0L.6 -4.6' stroke='#ffd36a' stroke-width='.35'/></g></g>`; }).join("") : "";
    return SHADOW(u) + `<defs>${lg("gm" + u, [[0, "#b4bcc6"], [.28, "#4b525b"], [.55, "#838b95"], [.8, "#2a2f35"], [1, "#5f6770"]])}${lg("gd" + u, [[0, "#6d757f"], [1, "#1c2025"]], "x1='0' y1='0' x2='0' y2='1'")}${rg("bt" + u, [[0, "#e3e7eb"], [1, "#4a5058"]], "cx='.35' cy='.3' r='.8'")}</defs>`
        + [0, 90, 180, 270].map(seg).join("") + sparks;
}

function astrolabe(u, lv) {
    const full = lv === "full", cmp = lv === "compact";
    const BR = lg("br" + u, [[0, "#f6cf94"], [.3, "#b4722f"], [.55, "#e6a564"], [.8, "#6e3b12"], [1, "#cf914f"]]);
    const RUNES = ["M0 -2.2L0 2.2M-1.4 -.6L1.4 .9", "M-1.4 2.2L0 -2.2L1.4 2.2M-.8 .6L.8 .6", "M-1.2 -2.2L1.2 0L-1.2 2.2", "M0 -2.2L0 2.2M0 -1L1.4 -2.2M0 .4L-1.4 -.8", "M-1.4 -2.2L1.4 -2.2L0 2.2Z", "M-1.4 0A1.4 1.4 0 1 0 1.4 0A1.4 1.4 0 1 0 -1.4 0M0 -2.4L0 2.4", "M-1.4 -2.2L1.4 2.2M1.4 -2.2L-1.4 2.2M0 -2.2L0 -1", "M0 2.2L0 -2.2L1.4 -1L0 0"];
    if (cmp) return `<defs>${BR}</defs><circle cx='50' cy='50' r='45' fill='none' stroke='url(#br${u})' stroke-width='8'/><circle cx='50' cy='50' r='45' fill='none' stroke='#3a1d06' stroke-width='.8' stroke-dasharray='1 3.7'/>`
        + [45, 135, 225, 315].map(a => { const [x, y] = XY(45, a); return `<circle cx='${x}' cy='${y}' r='1.5' fill='#7af7e1'/>`; }).join("")
        + `<path d='M44 6L50 -3L56 6Z' fill='url(#br${u})' stroke='#4a2508' stroke-width='.6'/><circle cx='50' cy='-6' r='3' fill='none' stroke='url(#br${u})' stroke-width='1.6'/>`;
    let ticks = ""; for (let a = 0; a < 360; a += full ? 5 : 15) { const L = a % 30 ? 1.6 : 3; ticks += `M${P(46.5, a)}L${P(46.5 - L, a)}`; }
    const nR = full ? 12 : 8;
    const runes = [...Array(nR)].map((_, i) => { const a = i * 360 / nR + 15; return at(a, `<g transform='translate(0 -38.6)'><path class='s3-rune' ${sty({ "animation-delay": (i * .35) + "s" })} d='${RUNES[i % RUNES.length]}' fill='none' stroke='#7af7e1' stroke-width='.7' stroke-linecap='round'/></g>`); }).join("");
    const pointers = (full ? [12, 70, 138, 200, 255, 318] : [40, 160, 280]).map(a => at(a, `<path d='M-1.6 -46.5Q-.9 -52 0 -57.5Q.9 -52 1.6 -46.5Z' fill='url(#br${u})' stroke='#4a2508' stroke-width='.35'/><circle cx='0' cy='-57.8' r='1' fill='#ffe9c4'/>`)).join("");
    const alidade = `<g transform='translate(50 50)'><g class='s3-spin s3-vslow s3-rev'><rect x='-60' y='-1.4' width='120' height='2.8' rx='1.2' fill='url(#br${u})' stroke='#4a2508' stroke-width='.35'/><rect x='-60' y='-3.2' width='2.4' height='6.4' fill='url(#br${u})'/><rect x='57.6' y='-3.2' width='2.4' height='6.4' fill='url(#br${u})'/></g></g>`;
    const throne = `<path d='M41 7.5C43 2 45 -1 50 -4C55 -1 57 2 59 7.5C55 5.5 52 6.5 50 4C48 6.5 45 5.5 41 7.5Z' fill='url(#br${u})' stroke='#4a2508' stroke-width='.5'/><circle cx='50' cy='-8.5' r='4.2' fill='none' stroke='url(#br${u})' stroke-width='1.8'/><circle cx='50' cy='-1.5' r='1.3' fill='#7af7e1' class='s3-rune s3-sec'/>`;
    return SHADOW(u) + `<defs>${BR}${lg("bd" + u, [[0, "#7a4518"], [1, "#3a1d06"]])}</defs>` + alidade
        + `<g class='s3-e-spin'><circle cx='50' cy='50' r='44' fill='none' stroke='#3a1d06' stroke-width='6.8'/><circle cx='50' cy='50' r='44' fill='none' stroke='url(#br${u})' stroke-width='5.8'/><path d='${ticks}' stroke='#3a1d06' stroke-width='.45'/></g>`
        + `<g transform='translate(50 50)'><g class='s3-spin s3-slow s3-e-spin2'><g transform='translate(-50 -50)'><circle cx='50' cy='50' r='38.6' fill='none' stroke='url(#bd${u})' stroke-width='4.4'/>${runes}</g></g></g>`
        + `<g transform='translate(50 50)'><g class='s3-spin s3-mid s3-rev'><g transform='translate(-50 -50)'><circle cx='50' cy='50' r='47.6' fill='none' stroke='url(#br${u})' stroke-width='.9'/>${pointers}</g></g></g>` + throne;
}

function moon(u, lv) {
    const full = lv === "full", cmp = lv === "compact";
    const SV = lg("sv" + u, [[0, "#ffffff"], [.3, "#c7ced6"], [.55, "#f3f6f9"], [.8, "#8a939e"], [1, "#e9edf1"]]);
    const mask = cmp ? `<mask id='m${u}'><circle cx='50' cy='50' r='51' fill='#fff'/><circle cx='57' cy='45' r='46' fill='#000'/></mask>` : `<mask id='m${u}'><circle cx='50' cy='50' r='48' fill='#fff'/><circle cx='56' cy='45.5' r='43.4' fill='#000'/></mask>`;
    const craters = cmp ? "" : [[7, 54, 2.4], [11, 30, 1.6], [12, 74, 1.9], [24, 88, 1.3], [5, 40, 1.1]].map(([x, y, r]) => `<circle cx='${x}' cy='${y}' r='${r}' fill='#7d8691' opacity='.55'/><path d='M${x - r * .8} ${y + r * .3}A${r} ${r} 0 0 0 ${x + r * .8} ${y + r * .3}' fill='none' stroke='#fff' stroke-opacity='.7' stroke-width='.4'/>`).join("");
    const crescent = `<g mask='url(#m${u})'><circle cx='50' cy='50' r='${cmp ? 51 : 48}' fill='url(#sv${u})'/>${craters}<circle cx='50' cy='50' r='${cmp ? 50.4 : 47.4}' fill='none' stroke='#fff' stroke-opacity='.85' stroke-width='.8'/></g>`;
    const SH = cmp ? [[92, 22, 5], [96, 70, 4.4]] : full ? [[73, 3, 7, 0], [90, 16, 6.2, 1], [97, 39, 6.8, 2], [93, 63, 5.8, 3], [79, 87, 6.4, 4]] : [[78, 6, 7, 0], [96, 40, 7, 2], [84, 84, 6.4, 4]];
    const shard = ([x, y, s, i]) => {
        const r2 = rnd(31 + (i || 0) * 7), pts = (r2() < .5 ? [[0, -s * 1.1], [s * .85, s * .55], [-s * .7, s * .75]] : [[-s * .3, -s * 1.05], [s * .9, -s * .1], [s * .2, s * .95], [-s * .85, s * .3]]).map(([a, b]) => [n2(x + a), n2(y + b)]);
        const d = poly(pts);
        const refl = cmp ? "" : `<clipPath id='c${i}${u}'><path d='${d}'/></clipPath><g clip-path='url(#c${i}${u})'><use href='#im${u}' opacity='.7' transform='translate(${x} ${y}) scale(${-s * .07} ${s * .07}) translate(-33 -26)'/><path d='${d}' fill='url(#gl${u})' opacity='.7'/></g>`;
        const body = `<path d='${d}' fill='url(#sv${u})'/>${refl}<path d='${d}' fill='none' stroke='#fff' stroke-width='.7'/><path d='M${pts[0][0]} ${pts[0][1]}L${pts[1][0]} ${pts[1][1]}' stroke='#fff' stroke-width='1' opacity='.9'/>`;
        return cmp ? body : `<g class='s3-e-fly' ${sty({ "transform-origin": "30px 50px", "animation-delay": (.3 + (i || 0) * .09) + "s" })}><g class='s3-float s3-sec' ${sty({ "animation-delay": -(i || 0) * .6 + "s", "transform-origin": x + "px " + y + "px" })}>${body}</g></g>`;
    };
    const img = cmp ? "" : `<image id='im${u}' href='¤' width='66' height='66' preserveAspectRatio='xMidYMin slice'/>`;
    const gl = lg("gl" + u, [[0, "#ffffff", .9], [.45, "#e9eef3", .15], [1, "#9aa4ae", .45]]);
    return (cmp ? "" : SHADOW(u, 52)) + `<defs>${SV}${gl}${mask}${img}${rg("hg" + u, [[.6, "#e6f0ff", 0], [.8, "#e6f0ff", .35], [1, "#e6f0ff", 0]], "gradientUnits='userSpaceOnUse' cx='50' cy='50' r='58'")}</defs>`
        + (cmp ? "" : `<circle class='s3-glowpulse' cx='50' cy='50' r='58' fill='url(#hg${u})'/>`)
        + `<g class='s3-e-swing' ${sty({ "transform-origin": "50px 50px" })}>${crescent}</g>` + SH.map(shard).join("")
        + (full ? twinkles([[6, 34, 0], [20, 90, 1.4], [100, 30, 2.2]]) : "");
}

function cartouche(u, lv) {
    const full = lv === "full", cmp = lv === "compact";
    const AU = lg("au" + u, [[0, "#fff4c2"], [.25, "#f2c85a"], [.5, "#9a6a14"], [.75, "#ffe28a"], [1, "#c08a20"]]);
    const gemG = rg("rb" + u, [[0, "#ffb3b3"], [.5, "#d0141e"], [1, "#5c0008"]], "cx='.35' cy='.3' r='.8'") + rg("sp" + u, [[0, "#b8d4ff"], [.5, "#2457d6"], [1, "#0a1d5c"]], "cx='.35' cy='.3' r='.8'") + rg("em" + u, [[0, "#b5ffd9"], [.5, "#14a85f"], [1, "#043d1f"]], "cx='.35' cy='.3' r='.8'") + rg("pe" + u, [[0, "#ffffff"], [.6, "#efe6d6"], [1, "#a89a84"]], "cx='.35' cy='.3' r='.8'");
    const gem = (x, y, r, g) => `<circle cx='${x}' cy='${y}' r='${r}' fill='url(#${g}${u})' stroke='#5c3c06' stroke-width='.4'/><circle cx='${n2(x - r * .35)}' cy='${n2(y - r * .4)}' r='${n2(r * .3)}' fill='#fff' opacity='.7'/>`;
    const band = `<path d='M${P(42, -36)}A42 42 0 0 1 ${P(42, 36)}L${P(47.6, 34)}A47.6 47.6 0 0 0 ${P(47.6, -34)}Z' fill='url(#au${u})' stroke='#5c3c06' stroke-width='.6'/>`
        + [-24, -8, 8, 24].map((a, i) => { const [x, y] = XY(44.8, a); return gem(x, y, 1.8, ["rb", "sp", "em", "rb"][i]); }).join("");
    const arches = cmp ? `<path d='${poly([XY(47, -30), XY(56, -20), XY(60, 0), XY(56, 20), XY(47, 30)])}' fill='url(#au${u})' stroke='#5c3c06' stroke-width='.6'/>`
        : [[-30, -12], [-12, 12], [12, 30]].map(([a1, a2], i) => { const [x1, y1] = XY(47.4, a1), [x2, y2] = XY(47.4, a2), [mx, my] = XY(i === 1 ? 64 : 58, (a1 + a2) / 2); return `<path d='M${x1} ${y1}Q${mx} ${my - (i === 1 ? 4 : 2)} ${x2} ${y2}' fill='none' stroke='#5c3c06' stroke-width='3.2'/><path d='M${x1} ${y1}Q${mx} ${my - (i === 1 ? 4 : 2)} ${x2} ${y2}' fill='none' stroke='url(#au${u})' stroke-width='2.3'/>`
            + (full ? [.25, .5, .75].map(t => { const bx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2, by = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * (my - (i === 1 ? 4 : 2)) + t * t * y2; return `<circle cx='${n2(bx)}' cy='${n2(by)}' r='.9' fill='url(#pe${u})'/>`; }).join("") : ""); }).join("");
    const finial = cmp ? "" : (() => { const [x, y] = XY(63.5, 0); return gem(x, y - 1, 3, "sp") + `<path d='M${x - 2.4} ${y + 1.6}L${x} ${y + 4.6}L${x + 2.4} ${y + 1.6}' fill='url(#au${u})' stroke='#5c3c06' stroke-width='.4'/>`; })();
    const scroll = `M37 15C24 16 13 26 10 40C8 54 13 68 23 79C28 84 34 85 37 82C40 78 36 74 33 76`;
    const leaf = (x, y, a, s) => `<g transform='translate(${x} ${y}) rotate(${a}) scale(${s})'><path d='M0 0C2 -3 5 -4 8 -3C7 -5 9 -7 11 -6C10 -4 12 -2 14 -2C11 0 8 2 5 2C3 2 1 1 0 0Z' fill='url(#au${u})' stroke='#5c3c06' stroke-width='.45'/><path d='M1 0Q6 -1 12 -2' fill='none' stroke='#7a5208' stroke-width='.35'/></g>`;
    const side = cmp ? `<path d='M36 10C24 12 13 24 11 40C10 54 15 66 24 76' fill='none' stroke='url(#au${u})' stroke-width='3.4' stroke-linecap='round'/>`
        : `<g class='s3-e-unfurl' ${sty({ "transform-origin": "37px 15px" })}><path d='${scroll}' fill='none' stroke='#5c3c06' stroke-width='4.6' stroke-linecap='round'/><path d='${scroll}' fill='none' stroke='url(#au${u})' stroke-width='3.4' stroke-linecap='round'/><path d='M35 16.5C24 18 15 27 12.4 40' fill='none' stroke='#fff8dc' stroke-width='.6' opacity='.85'/>`
            + `<path d='M10 40C3 40 -1 46 3 50C6 53 10 50 8 47' fill='none' stroke='url(#au${u})' stroke-width='1.6' stroke-linecap='round'/>` + leaf(9, 34, 200, .9) + leaf(12, 60, 165, 1) + (full ? leaf(21, 22, 230, .75) + leaf(20, 74, 140, .8) : "") + `</g>`;
    const shell = cmp ? "" : `<g transform='translate(50 92)'><path d='M-10 0Q-10 -9 0 -10Q10 -9 10 0Q5 4 0 4Q-5 4 -10 0Z' fill='url(#au${u})' stroke='#5c3c06' stroke-width='.5'/>${[-8, -4, 0, 4, 8].map(x => `<path d='M0 3L${x} -8' stroke='#7a5208' stroke-width='.45'/>`).join("")}${gem(0, 4.5, 2, "rb")}</g>`;
    const glint = full ? `<clipPath id='cl${u}'><path d='M50 -16A66 66 0 1 1 49.9 -16ZM50 17A33 33 0 1 0 50.1 17Z' clip-rule='evenodd'/></clipPath><g clip-path='url(#cl${u})'><g transform='rotate(24 50 50)'><rect class='s3-glint' x='-50' y='-40' width='16' height='180' fill='url(#gx${u})'/></g></g>` : "";
    return (cmp ? "" : SHADOW(u, 54)) + `<defs>${AU}${gemG}${lg("gx" + u, [[0, "#fff", 0], [.5, "#fffbe6", .85], [1, "#fff", 0]], "x1='0' y1='0' x2='1' y2='0'")}</defs>`
        + side + `<g transform='translate(100 0) scale(-1 1)'>${side}</g>` + shell
        + `<g class='s3-e-descend'>${arches}${band}${finial}</g>` + glint + (full ? twinkles([[48, -8, 0], [14, 30, 1.3], [88, 64, 2.1]]) : "");
}

function reticle(u, lv) {
    const full = lv === "full", cmp = lv === "compact";
    const HO = "#9ff8ff";
    const PT = lg("pt" + u, [[0, "#f7fbff"], [.4, "#b3c3d1"], [.7, "#eef5fb"], [1, "#7d90a2"]]);
    const bracket = a => at(a, `<g class='s3-e-snap' ${sty({ "animation-delay": ((a / 90) * .08) + "s" })}><path d='M-9 -49L-9 -53.5L-3.5 -53.5' fill='none' stroke='#0d1a24' stroke-width='3.4' stroke-linejoin='round' transform='rotate(45)'/><path d='M-9 -49L-9 -53.5L-3.5 -53.5' fill='none' stroke='url(#pt${u})' stroke-width='2.4' stroke-linejoin='round' transform='rotate(45)'/></g>`);
    if (cmp) return `<defs>${PT}</defs><circle cx='50' cy='50' r='45' fill='none' stroke='${HO}' stroke-width='1.6' stroke-dasharray='18 5.6'/><circle cx='50' cy='50' r='48.5' fill='none' stroke='url(#pt${u})' stroke-width='2'/>` + [0, 90, 180, 270].map(a => at(a, `<path d='M0 -44L0 -52' stroke='${HO}' stroke-width='1.4'/>`)).join("");
    const arcs = [0, 90, 180, 270].map(a => `<path pathLength='1' class='s3-e-draw1' d='${arc(39.5, a + 8, a + 82)}' fill='none' stroke='${HO}' stroke-width='1.1' stroke-linecap='round'/>`).join("");
    const glow = full ? `<circle cx='50' cy='50' r='39.5' fill='none' stroke='${HO}' stroke-opacity='.18' stroke-width='4'/>` : "";
    const ticks = [0, 90, 180, 270].map(a => at(a, `<path d='M0 -44.5L0 -57' stroke='${HO}' stroke-width='.8'/><path d='M-1.6 -58.5L1.6 -58.5L0 -55.8Z' fill='${HO}'/>`)).join("");
    const nodes = full ? [20, 92, 160, 232, 300] : [40, 160, 280];
    const orbit = `<g transform='translate(50 50)'><g class='s3-spin s3-slow'>${nodes.map((a, i) => { const [x, y] = pt(56.5, a), [x2, y2] = pt(56.5, nodes[(i + 1) % nodes.length]); return `<path d='M${x} ${y}L${x2} ${y2}' stroke='${HO}' stroke-opacity='.22' stroke-width='.4'/><g transform='translate(${x} ${y}) rotate(45)'><rect x='-1.5' y='-1.5' width='3' height='3' fill='#0a1f2a' stroke='${HO}' stroke-width='.6'/><rect class='s3-node s3-sec' ${sty({ "animation-delay": (-i * .5) + "s" })} x='-.7' y='-.7' width='1.4' height='1.4' fill='${HO}'/></g>${full ? `<rect x='${n2(x + 3)}' y='${n2(y - .5)}' width='4.6' height='.6' fill='${HO}' opacity='.5'/><rect x='${n2(x + 3)}' y='${n2(y + .6)}' width='3' height='.6' fill='${HO}' opacity='.35'/>` : ""}`; }).join("")}</g></g>`;
    const sweep = `<g transform='translate(50 50)'><g class='s3-spin s3-fastspin'><path d='M0 0L0 -50A50 50 0 0 1 ${pt(50, 38).join(" ")}Z' fill='url(#sw${u})'/></g></g>`;
    const dash = `<g transform='translate(50 50)'><circle class='s3-spin s3-mid s3-rev' r='44.5' fill='none' stroke='${HO}' stroke-opacity='.55' stroke-width='.5' stroke-dasharray='1.2 2.8'/>${full ? `<circle class='s3-spin s3-slow' r='51' fill='none' stroke='${HO}' stroke-opacity='.4' stroke-width='.45' stroke-dasharray='14 9 3 9'/>` : ""}</g>`;
    return `<defs>${PT}${rg("sw" + u, [[.6, HO, 0], [1, HO, .28]], "gradientUnits='userSpaceOnUse' cx='0' cy='0' r='50'")}</defs>`
        + sweep + `<circle class='s3-lock s3-sec' cx='50' cy='50' r='35.6' fill='none' stroke='${HO}' stroke-width='.7'/>` + glow + arcs + dash + ticks + orbit + [45, 135, 225, 315].map(bracket).join("");
}

function vines(u, lv) {
    const full = lv === "full", cmp = lv === "compact";
    const LF = lg("lf" + u, [[0, "#b8f5a0"], [.4, "#4fbf63"], [1, "#0f5a2a"]]);
    const leaf = (x, y, a, s, i) => `<g transform='translate(${x} ${y}) rotate(${a})'><g class='s3-e-leaf' ${sty({ "animation-delay": (.35 + i * .07) + "s" })}><g class='s3-rustle s3-sec' ${sty({ "animation-delay": (-i * .4) + "s" })}><path d='M0 0C${n2(3 * s)} ${n2(-3.2 * s)} ${n2(8 * s)} ${n2(-3.6 * s)} ${n2(12 * s)} 0C${n2(8 * s)} ${n2(3.4 * s)} ${n2(3 * s)} ${n2(3 * s)} 0 0Z' fill='url(#lf${u})' stroke='#0b3d1c' stroke-width='.35'/>`
        + (cmp ? "" : `<path d='M.6 0L${n2(11 * s)} 0' stroke='#d9ffc8' stroke-width='.35' opacity='.8'/>${full ? `<path d='M${n2(3 * s)} 0L${n2(5 * s)} ${n2(-2 * s)}M${n2(6 * s)} 0L${n2(8 * s)} ${n2(-1.8 * s)}M${n2(4 * s)} 0L${n2(6 * s)} ${n2(1.8 * s)}' stroke='#d9ffc8' stroke-width='.25' opacity='.6'/><path d='M${n2(2 * s)} ${n2(-1.2 * s)}C${n2(5 * s)} ${n2(-2.6 * s)} ${n2(8 * s)} ${n2(-2.6 * s)} ${n2(10 * s)} ${n2(-1 * s)}' fill='none' stroke='#fff' stroke-opacity='.35' stroke-width='.5'/>` : ""}`) + `</g></g></g>`;
    const V1 = `M14 96C2 82 -2 60 6 38C12 22 26 9 44 5C56 3 66 6 72 10`, V2 = `M88 96C99 80 101 60 95 44`;
    const stem = d => `<path pathLength='1' class='s3-e-grow' d='${d}' fill='none' stroke='#0b3d1c' stroke-width='${cmp ? 3.2 : 3}' stroke-linecap='round'/><path pathLength='1' class='s3-e-grow' d='${d}' fill='none' stroke='url(#st${u})' stroke-width='${cmp ? 2.2 : 2}' stroke-linecap='round'/>`;
    const L = cmp ? [[8, 70, 200, 1], [4, 44, 240, 1], [26, 12, 300, 1], [60, 3, 350, .9], [96, 66, 330, .9]]
        : full ? [[11, 88, 215, 1], [3, 70, 160, .9], [2, 52, 250, 1.05], [8, 34, 195, .85], [14, 22, 280, 1], [28, 9, 230, .8], [42, 4, 300, .95], [58, 3, 20, .85], [70, 9, 330, .8], [93, 84, 320, .95], [99, 64, 20, .85], [96, 47, 300, .8]]
            : [[6, 76, 210, 1], [2, 50, 245, 1], [14, 22, 280, 1], [42, 4, 300, .95], [66, 7, 340, .85], [96, 76, 320, .95], [97, 52, 300, .85]];
    const tendrils = full ? `<path d='M6 38C-2 36 -4 28 2 26C6 25 7 29 4 30' fill='none' stroke='#2f8f45' stroke-width='.8' stroke-linecap='round'/><path d='M95 44C103 40 104 32 99 31C95 30 95 35 98 35' fill='none' stroke='#2f8f45' stroke-width='.8' stroke-linecap='round'/>` : "";
    const dew = cmp ? "" : [[12.2, 86.5, 1.5], [44.5, 2.8, 1.3], ...(full ? [[96.5, 62.5, 1.2]] : [])].map(([x, y, r]) => `<g><circle cx='${x}' cy='${y}' r='${r}' fill='url(#dw${u})'/><circle cx='${n2(x - r * .35)}' cy='${n2(y - r * .4)}' r='${n2(r * .3)}' fill='#fff'/></g>`).join("");
    const flies = full ? [[-6, 20], [104, 28], [96, 100], [-4, 78], [30, -10], [70, -8]].map(([x, y], i) => `<g transform='translate(${x} ${y})'><g class='s3-firefly' ${sty({ "animation-delay": (-i * 1.3) + "s", "animation-duration": (5 + i * .7) + "s" })}><circle r='2.4' fill='url(#ff${u})'/><circle r='.7' fill='#f6ffb0'/></g></g>`).join("") : "";
    return (cmp ? "" : SHADOW(u, 52)) + `<defs>${LF}${lg("st" + u, [[0, "#6fb04a"], [1, "#245a1c"]])}${rg("dw" + u, [[0, "#d7ffe9"], [.5, "#2fe08f"], [1, "#056b35"]], "cx='.35' cy='.3' r='.8'")}${rg("ff" + u, [[0, "#f6ffb0", .95], [1, "#c8ff4a", 0]])}</defs>`
        + stem(V1) + stem(V2) + tendrils + L.map(([x, y, a, s], i) => leaf(x, y, a, s, i)).join("") + dew + flies;
}

/* the serpent's body: a closed outline around a coiling centre line, thicker in the middle; returns { d, spine, ... } */
function coil(t0, t1, n, r0, r1, wMax, wTail) {
    const C = [], N = [];
    for (let i = 0; i <= n; i++) { const t = i / n, a = (t0 + (t1 - t0) * t) * Math.PI / 180, r = r0 + (r1 - r0) * t + Math.sin(t * Math.PI * 3) * 1.6; C.push([50 + r * Math.sin(a), 50 - r * Math.cos(a)]); }
    for (let i = 0; i <= n; i++) { const p0 = C[Math.max(0, i - 1)], p1 = C[Math.min(n, i + 1)], dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1; N.push([-dy / l, dx / l]); }
    const W = i => { const t = i / n; return wTail + (wMax - wTail) * Math.sin(Math.min(1, t * 1.35) * Math.PI / 2); };
    const L = C.map((p, i) => [p[0] + N[i][0] * W(i) / 2, p[1] + N[i][1] * W(i) / 2]), R = C.map((p, i) => [p[0] - N[i][0] * W(i) / 2, p[1] - N[i][1] * W(i) / 2]);
    return { d: poly(L.concat(R.reverse())), spine: "M" + C.map(p => n2(p[0]) + " " + n2(p[1])).join("L"), C, N, W };
}
function serpent(u, lv) {
    const full = lv === "full", cmp = lv === "compact";
    const body = cmp ? coil(-40, 390, 44, 42, 50, 8, 1.6) : coil(-40, 390, full ? 100 : 64, 38.5, 52, 10.5, 1.3);
    const end = body.C[body.C.length - 1], prev = body.C[body.C.length - 4], ang = Math.atan2(end[1] - prev[1], end[0] - prev[0]) * 180 / Math.PI - 50;      // the head lifts away from the coil
    const WG = lg("wb" + u, [[0, "#d8f8ff", .95], [.35, "#55c8f4", .9], [.7, "#1173c4", .9], [1, "#08458a", .95]]);
    const head = `<g transform='translate(${n2(end[0])} ${n2(end[1])}) rotate(${n2(ang)})'><g class='s3-headbob s3-sec'><path d='M-2 -4.6C4 -7.2 10 -6 14 -2.2L18.5 -.4L14.6 1.4C10.5 5.6 4 6.6 -2 4.6Z' fill='url(#wb${u})' stroke='#e6fbff' stroke-width='.5'/>`
        + `<path d='M2 -5.4L5 -10.6L7.6 -5.6M8 -5L11.6 -9L12 -3.6' fill='#9fe6ff' stroke='#e6fbff' stroke-width='.35'/><ellipse cx='10' cy='-1.6' rx='1.5' ry='.9' fill='#e8fdff'/><circle class='s3-eye' cx='10.3' cy='-1.6' r='.55' fill='#00e5ff'/>`
        + `<path d='M14.5 1.2Q18 3.5 21 2.2M14 2Q16.5 5.5 19.8 5.6' fill='none' stroke='#cfefff' stroke-width='.4' stroke-linecap='round'/></g></g>`;
    if (cmp) return `<defs>${WG}</defs><path d='${body.d}' fill='url(#wb${u})' stroke='#e6fbff' stroke-width='.5'/>` + head;
    const fins = body.C.filter((_, i) => i > 8 && i < body.C.length - 6 && i % (full ? 7 : 10) === 0).map((p, k) => { const i = body.C.indexOf(p), nx = body.N[i][0], ny = body.N[i][1], w = body.W(i) / 2; return `<path d='M${n2(p[0] + nx * w * .6)} ${n2(p[1] + ny * w * .6)}L${n2(p[0] + nx * (w + 3.2))} ${n2(p[1] + ny * (w + 3.2))}L${n2(p[0] + nx * w * .5 + body.N[i][1] * 2.4)} ${n2(p[1] + ny * w * .5 - body.N[i][0] * 2.4)}Z' fill='#9fe6ff' opacity='.85'/>`; }).join("");
    const foam = full ? body.C.filter((_, i) => i % 5 === 2 && i > 6).map((p, k) => { const i = body.C.indexOf(p), w = body.W(i) / 2 + .6; return `<circle cx='${n2(p[0] + body.N[i][0] * w)}' cy='${n2(p[1] + body.N[i][1] * w)}' r='${n2(.5 + (k % 3) * .25)}' fill='#fff' opacity='.85'/>`; }).join("") : "";
    const drips = full ? [[30, 0], [110, .9], [200, 1.7]].map(([a, d]) => { const [x, y] = XY(47, a); return `<path class='s3-drip' ${sty({ "animation-delay": -d + "s" })} transform='translate(${x} ${y})' d='M0 -2.2C1 -.8 1.5 0 1.5 .7A1.5 1.5 0 0 1 -1.5 .7C-1.5 0 -1 -.8 0 -2.2Z' fill='#bdeeff'/>`; }).join("") : "";
    return SHADOW(u, 52) + `<defs>${WG}<mask id='mk${u}' maskUnits='userSpaceOnUse' x='-30' y='-30' width='160' height='160'><path class='s3-e-coil' pathLength='1' d='${body.spine}' fill='none' stroke='#fff' stroke-width='16' stroke-linecap='round'/></mask></defs>`
        + `<g mask='url(#mk${u})'><path d='${body.d}' fill='url(#wb${u})'/><path d='${body.d}' fill='none' stroke='#e6fbff' stroke-width='.55' opacity='.9'/>${fins}`
        + `<path d='${body.spine}' fill='none' stroke='#c8f4ff' stroke-opacity='.35' stroke-width='2.4' stroke-linecap='round' transform='translate(-.5 -.6)'/><path class='s3-flow' d='${body.spine}' fill='none' stroke='#fff' stroke-opacity='.45' stroke-width='.7' stroke-dasharray='2 7' stroke-linecap='round'/>${foam}</g>` + head + drips;
}

function gate(u, lv) {
    const full = lv === "full", cmp = lv === "compact";
    const GW = lg("gw" + u, [[0, "#fffdf2"], [.4, "#ffe9a8"], [.7, "#fff7d6"], [1, "#d9b45a"]], "x1='0' y1='0' x2='1' y2='0'");
    const pillar = x => `<rect x='${x - 3.6}' y='22' width='7.2' height='74' rx='1' fill='url(#gw${u})' stroke='#a0802a' stroke-width='.4'/><rect x='${x - 5}' y='19' width='10' height='3.6' rx='.8' fill='url(#gw${u})' stroke='#a0802a' stroke-width='.4'/><rect x='${x - 5}' y='95' width='10' height='3.4' rx='.8' fill='url(#gw${u})' stroke='#a0802a' stroke-width='.4'/>`
        + (cmp ? "" : [36, 52, 68, 84].map((y, i) => `<path d='${star4(1.4, .25)}' transform='translate(${x} ${y})' fill='#b78a1e' opacity='.75'/>`).join("") + `<path d='M${x - 1.6} 26L${x - 1.6} 91M${x + 1.6} 26L${x + 1.6} 91' stroke='#c99a3a' stroke-width='.3' opacity='.6'/>`);
    if (cmp) return `<defs>${GW}</defs>` + pillar(6) + pillar(94) + `<path d='M6 20Q6 -8 50 -9Q94 -8 94 20' fill='none' stroke='url(#gw${u})' stroke-width='4.4'/><circle cx='50' cy='-7' r='4' fill='#fffbe6'/>`;
    const archD = `M8 20Q8 -6 50 -8Q92 -6 92 20`;
    const arch = `<path d='${archD}' fill='none' stroke='#a0802a' stroke-width='6.4'/><path d='${archD}' fill='none' stroke='url(#gw${u})' stroke-width='5.2'/><path d='M12 20Q13 -1 50 -2.6Q87 -1 88 20' fill='none' stroke='#fff8e0' stroke-width='.5' opacity='.85'/>`
        + `<path d='M46 -12L54 -12L52.5 -3.5L47.5 -3.5Z' fill='url(#gw${u})' stroke='#a0802a' stroke-width='.4'/>`;
    const eclipse = `<g transform='translate(50 -19)'><circle class='s3-corona' r='8.6' fill='url(#co${u})'/><circle r='5.4' fill='#fff7d0'/><g class='s3-eclipse'><circle r='5' fill='#120b26'/></g></g>`;
    const planet = (tilt, k, r, dur, d, body) => `<g transform='translate(50 50) rotate(${tilt})'><ellipse rx='${r}' ry='${n2(r * k)}' fill='none' stroke='#fff2c4' stroke-opacity='.18' stroke-width='.4'/><g transform='scale(1 ${k})'><g class='s3-orbit' ${sty({ "animation-duration": dur + "s", "animation-delay": -d + "s" })}><g transform='translate(${r} 0)'><g class='s3-orbit s3-rev' ${sty({ "animation-duration": dur + "s", "animation-delay": -d + "s" })}><g transform='scale(1 ${n2(1 / k)})'>${body}</g></g></g></g></g></g>`;
    const P1 = `<circle r='3.4' fill='url(#p1${u})'/>`, P2 = `<ellipse rx='6.2' ry='1.6' fill='none' stroke='#f5d9a0' stroke-width='.7' transform='rotate(-18)'/><circle r='2.8' fill='url(#p2${u})'/><path d='M-6.2 0A6.2 1.6 0 0 0 6.2 0' fill='none' stroke='#f5d9a0' stroke-width='.7' transform='rotate(-18)'/>`, P3 = `<circle r='2.2' fill='url(#p3${u})'/>`;
    const planets = planet(-14, .3, 60, 14, 0, P1) + planet(20, .26, 56, 19, 6, P2) + (full ? planet(78, .22, 58, 24, 11, P3) : "");
    return SHADOW(u, 54) + `<defs>${GW}${rg("co" + u, [[.55, "#fff2b8", .95], [.75, "#ffd27a", .4], [1, "#ffd27a", 0]])}${rg("p1" + u, [[0, "#c8f0ff"], [.6, "#3a7bd5"], [1, "#0b1f4a"]], "cx='.35' cy='.3' r='.8'")}${rg("p2" + u, [[0, "#ffe3b0"], [.6, "#c27a2c"], [1, "#4a2408"]], "cx='.35' cy='.3' r='.8'")}${rg("p3" + u, [[0, "#ffd0f0"], [.6, "#a04ab8"], [1, "#2a0838"]], "cx='.35' cy='.3' r='.8'")}${rg("ga" + u, [[.5, "#fff2c4", 0], [.75, "#fff2c4", .35], [1, "#fff2c4", 0]], "gradientUnits='userSpaceOnUse' cx='50' cy='46' r='60'")}</defs>`
        + `<circle class='s3-glowpulse' cx='50' cy='46' r='60' fill='url(#ga${u})'/>` + planets + `<g class='s3-e-rise'>${pillar(8)}${pillar(92)}${arch}</g><g class='s3-e-fade'>${eclipse}</g>` + (full ? twinkles([[-4, 30, 0], [104, 60, 1.2], [26, -12, 2]], 2.8) : "");
}

function prism(u, lv) {
    const full = lv === "full", cmp = lv === "compact";
    const SPEC = ["#ff4d6d", "#ff9f40", "#ffe14d", "#4dff88", "#4dc3ff", "#8a5cff"];
    const glass = `<path d='M-11 7L0 -12L11 7Z' fill='url(#gf${u})' stroke='#ffffff' stroke-width='.7'/><path d='M0 -12L11 7L15 4.4L4 -14.4Z' fill='url(#gs${u})' stroke='#e9f4ff' stroke-width='.5'/><path d='M-11 7L11 7L15 4.4L-7 4.4' fill='#bcd2ea' fill-opacity='.35' stroke='#e9f4ff' stroke-width='.4'/>`
        + `<path d='M-6.5 3.2L-1 -6.5' stroke='#fff' stroke-width='.9' opacity='.85'/><path class='s3-flick s3-sec' d='M2.6 -5.4L6.2 1.2' stroke='#fff' stroke-width='.6'/>`;
    if (cmp) return `<defs>${lg("gf" + u, [[0, "#ffffff", .9], [1, "#a9c6e8", .5]])}${lg("gs" + u, [[0, "#d6e6f8", .7], [1, "#6d8fb5", .5]])}</defs>`
        + SPEC.map((c, i) => `<path d='${arc(46, 30 + i * 22, 50 + i * 22)}' fill='none' stroke='${c}' stroke-width='3.6'/>`).join("") + `<g transform='translate(50 3)'>${glass}</g>`;
    const N = full ? 6 : 3;
    const rays = SPEC.filter((_, i) => full || i % 2 === 0).map((c, i) => `<path d='M0 0L66 ${n2(-4 + i * (full ? 3.2 : 6.4))}L66 ${n2(-1 + i * (full ? 3.2 : 6.4))}Z' fill='${c}' opacity='.55'/>`).join("");
    const fan = `<g transform='translate(60 4)'><g class='s3-e-unfurl2'><g class='s3-raysweep'>${rays}<path d='M0 0L66 -6L66 18Z' fill='url(#rf${u})' opacity='.35'/></g></g></g>`;
    const beam = `<path pathLength='1' class='s3-e-beam' d='M-28 -16L42 1' stroke='#fffdf5' stroke-width='2' stroke-linecap='round' opacity='.85'/><path d='M-28 -16L42 1' stroke='#fff' stroke-width='5' stroke-opacity='.12' stroke-linecap='round'/>`;
    const sparkle = full ? twinkles([[44, -12, 0], [62, 12, 1], [104, 40, 1.8], [100, 76, 2.6]], 3) : "";
    return SHADOW(u, 52) + `<defs>${lg("gf" + u, [[0, "#ffffff", .92], [.5, "#dbe9f9", .55], [1, "#a9c6e8", .5]])}${lg("gs" + u, [[0, "#d6e6f8", .7], [1, "#6d8fb5", .45]])}${lg("rf" + u, SPEC.map((c, i) => [n2(i / 5), c]), "x1='0' y1='0' x2='0' y2='1'")}</defs>`
        + `<circle cx='50' cy='50' r='${n2(36.4)}' fill='none' stroke='#fff' stroke-opacity='.55' stroke-width='.7'/>`
        + `<g transform='translate(50 50)'><g class='s3-raysweep'><g transform='translate(-50 -50)'>${SPEC.map((c, i) => `<path d='${arc(43.5 + i * 1.2, 62, 168)}' fill='none' stroke='${c}' stroke-width='1.25' opacity='.55'/>`).join("")}</g></g></g>` + beam + fan
        + `<g transform='translate(50 3)'><g class='s3-e-form'><g class='s3-prismturn s3-sec'>${glass}</g></g></g>` + sparkle;
}

/* =========================== BACKGROUND SCENES (viewBox 0 0 400 252) =========================== */
const blur = (id, s) => `<filter id='${id}' x='-30%' y='-30%' width='160%' height='160%'><feGaussianBlur stdDeviation='${s}'/></filter>`;
export const SCENES_MORE = {
    /* IRON: inside a foundry: steel girders and chains in the dark, a furnace mouth glowing at the back, a cast iron
       slab whose molten cracks cool to black and re-glow in turn, a hook in front, sparks and heat shimmer */
    iron(lv) {
        const full = lv === "full", R = rnd(5);
        const back = `<defs><linearGradient id='k' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#09090b'/><stop offset='.6' stop-color='#1d1612'/><stop offset='1' stop-color='#0e0c0b'/></linearGradient>${blur("b", 14)}</defs><rect width='400' height='252' fill='url(#k)'/>`
            + `<rect x='30' y='40' width='96' height='62' rx='10' fill='#ff7a1a' opacity='.55' filter='url(#b)'/><rect x='44' y='52' width='68' height='40' rx='6' fill='#ffb347'/><rect x='44' y='52' width='68' height='40' rx='6' fill='none' stroke='#2a1a10' stroke-width='5'/><path d='M44 82L112 82' stroke='#ffe08a' stroke-width='2'/>`
            + [150, 290].map(x => `<rect x='${x}' y='-5' width='16' height='170' fill='#0c0c0f'/><rect x='${x}' y='-5' width='3' height='170' fill='#3a3a42'/>${[20, 60, 100, 140].map(y => `<circle cx='${x + 8}' cy='${y}' r='1.6' fill='#4a4a52'/>`).join("")}`).join("")
            + `<rect x='-5' y='26' width='410' height='12' fill='#0c0c0f'/><rect x='-5' y='26' width='410' height='2' fill='#3a3a42'/>`
            + [212, 344].map(x => { let s = ""; for (let y = 38; y < 120; y += 7) s += `<ellipse cx='${x}' cy='${y}' rx='2.2' ry='3.6' fill='none' stroke='#2c2c33' stroke-width='1.4'/>`; return s; }).join("");
        const cr = [], walk = (x, y, a, n, depth) => { let d = `M${n2(x)} ${n2(y)}`; for (let k = 0; k < n; k++) { a += (R() - .5) * .9; const L = 5 + R() * 7; x += Math.cos(a) * L; y += Math.sin(a) * L * .45; d += `L${n2(x)} ${n2(y)}`; if (depth < 2 && R() < .3) walk(x, y, a + (R() < .5 ? -1 : 1) * (.6 + R() * .5), 2 + Math.floor(R() * 3), depth + 1); } cr.push(d); };
        for (let i = 0; i < (full ? 6 : 4); i++) walk(20 + R() * 360, 175 + R() * 60, (R() < .5 ? 0 : Math.PI) + (R() - .5) * .6, 7 + Math.floor(R() * 5), 0);
        const cracks = cr.join("");
        const slab = `<defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#3a3a40'/><stop offset='1' stop-color='#141417'/></linearGradient><filter id='g' x='-10%' y='-10%' width='120%' height='120%'><feGaussianBlur stdDeviation='2.2'/></filter><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='1' seed='3'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 .25 0 0 0 -.05'/></filter></defs>`
            + `<path d='M-10 160L410 150L410 262L-10 262Z' fill='url(#s)'/><path d='M-10 160L410 150' stroke='#7a7a84' stroke-width='1.2'/><rect y='150' width='400' height='112' filter='url(#n)' opacity='.5'/><path d='${cracks}' fill='none' stroke='#ff5a00' stroke-width='5' stroke-linecap='round' stroke-opacity='.45' filter='url(#g)'/><path d='${cracks}' fill='none' stroke='#060303' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/>`;
        /* the hot cracks: two halves on two still layers that cool and re-glow in turn (a CSS opacity cross-fade) */
        const hot = half => `<g fill='none' stroke-linecap='round' stroke-linejoin='round'>${cr.filter((_, i) => i % 2 === half).map(d => `<path d='${d}' stroke='#ff7a1a' stroke-width='2.4' stroke-opacity='.55'/><path d='${d}' stroke='#fff1b0' stroke-width='1'/>`).join("")}</g>`;
        const front = `<defs>${blur("b", 2)}</defs><path d='M356 -10L356 70Q356 92 336 92Q318 92 316 76' fill='none' stroke='#0a0a0c' stroke-width='9' stroke-linecap='round'/><path d='M356 -10L356 70Q356 92 336 92Q318 92 316 76' fill='none' stroke='#ff8a3a' stroke-opacity='.5' stroke-width='1.2' stroke-linecap='round' transform='translate(-3 0)'/>`;
        return { layers: [{ d: .1, img: back }, { d: .45, img: slab }, { d: .45, img: hot(0), cls: "s3-hotA" }, { d: .45, img: hot(1), cls: "s3-hotB" }, { d: .9, img: front }], html: `<i class='s3-x s3-haze'></i><i class='s3-x s3-sparks'></i>`, scrim: [.42, .42] };
    },
    /* BRONZE: an ancient temple wall: weathered stone blocks, two columns of carved glyphs that light up one after
       another, a fluted column at the edge, a beam of light with dust drifting in it */
    bronze(lv) {
        const full = lv === "full", R = rnd(13);
        let blocks = "";
        for (let row = 0, y = -6; y < 260; row++, y += 42) for (let x = -(row % 2) * 40 - 10; x < 410;) { const w = 64 + R() * 30, c = mix("#6a4a28", "#3e2a16", R()); blocks += `<rect x='${n2(x + 1.5)}' y='${y + 1.5}' width='${n2(w - 3)}' height='39' rx='2' fill='${c}'/>`; x += w; }
        const wall = `<defs><filter id='w' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.03 .05' numOctaves='4' seed='7'/><feColorMatrix values='0 0 0 0 .1 0 0 0 0 .06 0 0 0 0 .02 0 0 -1.2 0 .95'/></filter><radialGradient id='v' cx='.55' cy='.15' r='.9'><stop offset='0' stop-color='#000' stop-opacity='0'/><stop offset='1' stop-color='#000' stop-opacity='.65'/></radialGradient></defs>`
            + `<rect width='400' height='252' fill='#1c1208'/>${blocks}<rect width='400' height='252' filter='url(#w)' opacity='.75'/><rect width='400' height='252' fill='url(#v)'/>`;
        const G = ["M0 -6L0 6M-4 -2L4 2", "M-4 6L0 -6L4 6M-2.4 2L2.4 2", "M-3.6 -6L3.6 0L-3.6 6", "M0 -6L0 6M0 -3L4 -6M0 1L-4 -2", "M-4 -6L4 -6L0 6Z", "M-4 0A4 4 0 1 0 4 0A4 4 0 1 0 -4 0M0 -7L0 7", "M-4 -6L4 6M4 -6L-4 6", "M0 6L0 -6L4 -3L0 0"];
        const cols = [[270, 30], [388, 30]];
        const carve = (x, y, g) => `<path d='${g}' transform='translate(${x} ${y})' fill='none' stroke='#1a0e04' stroke-width='2.4' stroke-linecap='round'/><path d='${g}' transform='translate(${x + .8} ${y + .8})' fill='none' stroke='#c9925a' stroke-opacity='.35' stroke-width='.8' stroke-linecap='round'/>`;
        let glyphs = "", lit = "", k = 0;
        cols.forEach(([x, y0]) => { glyphs += `<rect x='${x - 12}' y='${y0 - 12}' width='24' height='${(full ? 7 : 5) * 28 + 6}' rx='3' fill='#2a1a0c' opacity='.55'/>`; for (let i = 0; i < (full ? 7 : 5); i++, k++) { const g = G[(i * 3 + k) % G.length], y = y0 + i * 28; glyphs += carve(x, y, g); lit += `<path class='s3-glyph' style='animation-delay:${n2(k * .42)}s' d='${g}' transform='translate(${x} ${y})' fill='none' stroke='#7af7e1' stroke-width='1.3' stroke-linecap='round'/>`; } });
        const col = `<defs><linearGradient id='c' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#2e1e0e'/><stop offset='.45' stop-color='#9a7246'/><stop offset='1' stop-color='#2a1a0a'/></linearGradient></defs><rect x='-14' y='-10' width='44' height='280' fill='url(#c)'/>${[-6, 2, 10, 18].map(x => `<path d='M${x} -10L${x} 270' stroke='#1a0e04' stroke-opacity='.55' stroke-width='1.4'/>`).join("")}<rect x='-18' y='-10' width='52' height='14' fill='#7a5630'/>`;
        return { layers: [{ d: .12, img: wall }, { d: .45, img: glyphs, ov: lit }, { d: .9, img: col }], html: `<i class='s3-x s3-lightbeam'></i><i class='s3-x s3-dust'></i>`, scrim: [.4, .34] };
    },
    /* SILVER: a pool of liquid mercury: a dark room mirrored in it, a bright horizon line, a slow metallic swell,
       beads of mercury at the edge; rings ripple out from wherever the pointer (or the tilt / drift) touches it */
    silver(lv) {
        const full = lv === "full";
        const env = `<defs><linearGradient id='e' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#06070a'/><stop offset='.32' stop-color='#2a2f37'/><stop offset='.47' stop-color='#d9dee5'/><stop offset='.52' stop-color='#f6f8fa'/><stop offset='.6' stop-color='#59616b'/><stop offset='1' stop-color='#0b0c0f'/></linearGradient></defs><rect width='400' height='252' fill='url(#e)'/>`;
        const swell = `<defs><filter id='f' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.0035 .009' numOctaves='2' seed='4' result='n'/><feSpecularLighting in='n' surfaceScale='6' specularConstant='1.15' specularExponent='34' lighting-color='#ffffff' result='s'><feDistantLight azimuth='270' elevation='38'/></feSpecularLighting><feComposite in='s' in2='SourceAlpha' operator='in'/></filter></defs><rect width='400' height='252' fill='#000' filter='url(#f)' opacity='.75'/>`;
        const bead = (x, y, r) => `<circle cx='${x}' cy='${y + r * .55}' r='${r * .9}' fill='#000' opacity='.35'/><circle cx='${x}' cy='${y}' r='${r}' fill='url(#bd)'/><ellipse cx='${n2(x - r * .32)}' cy='${n2(y - r * .38)}' rx='${n2(r * .32)}' ry='${n2(r * .18)}' fill='#fff' transform='rotate(-25 ${n2(x - r * .32)} ${n2(y - r * .38)})'/><path d='M${n2(x - r * .7)} ${n2(y + r * .45)}A${r} ${r} 0 0 0 ${n2(x + r * .7)} ${n2(y + r * .45)}' fill='none' stroke='#e9edf1' stroke-opacity='.6' stroke-width='${n2(r * .08)}'/>`;
        const beads = `<defs><radialGradient id='bd' cx='.4' cy='.35' r='.75'><stop offset='0' stop-color='#ffffff'/><stop offset='.35' stop-color='#a9b1bb'/><stop offset='.7' stop-color='#2e333a'/><stop offset='1' stop-color='#cfd5dc'/></radialGradient></defs>`
            + bead(370, 228, 20) + bead(336, 244, 9) + bead(392, 190, 7) + (full ? bead(28, 244, 11) + bead(56, 250, 5) + bead(312, 220, 4) : "");
        return { layers: [{ d: .1, img: env }, { d: .4, img: swell }, { d: .85, img: beads }], html: `<i class='s3-x s3-ripple'></i><i class='s3-x s3-ripple s3-r2'></i>${full ? "<i class='s3-x s3-ripple s3-r3 s3-sec'></i>" : ""}`, scrim: [.46, .4] };
    },
    /* GOLD: a gilded vault hall: an arched doorway glowing at the end, gilded walls and arches receding, fluted
       columns, treasure in front; soft shafts of light and gold dust drifting through them */
    gold(lv) {
        const full = lv === "full";
        const hall = `<defs><radialGradient id='d' cx='.58' cy='.45' r='.7'><stop offset='0' stop-color='#ffe7a0'/><stop offset='.25' stop-color='#b07a22'/><stop offset='.6' stop-color='#4a2e08'/><stop offset='1' stop-color='#1a0f03'/></radialGradient>${blur("b", 6)}</defs><rect width='400' height='252' fill='url(#d)'/>`
            + `<path d='M196 160L196 92Q232 62 268 92L268 160Z' fill='#fff1c0' filter='url(#b)' opacity='.85'/><path d='M206 160L206 96Q232 74 258 96L258 160Z' fill='#fffbe8'/>`
            + `<path d='M0 0L196 80L196 168L0 252Z' fill='#2a1a05' opacity='.65'/><path d='M400 0L268 80L268 168L400 252Z' fill='#2a1a05' opacity='.65'/><path d='M0 252L196 168L268 168L400 252Z' fill='#3a250a'/>`
            + [[120, 52, 34], [60, 30, 26]].map(([x, y, h]) => `<path d='M${x} ${y + h * 2.4}L${x} ${y + 10}Q${x + 16} ${y - 4} ${x + 32} ${y + 14}L${x + 32} ${y + h * 2.2}Z' fill='#6a4410' stroke='#e7b84a' stroke-opacity='.45'/>`).join("");
        const cols = `<defs><linearGradient id='c' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#5c3a08'/><stop offset='.4' stop-color='#ffd76a'/><stop offset='.6' stop-color='#d9a441'/><stop offset='1' stop-color='#4a2e05'/></linearGradient></defs>`
            + [92, 322].map(x => `<rect x='${x}' y='-10' width='26' height='280' fill='url(#c)'/>${[5, 11, 17].map(o => `<path d='M${x + o} -10L${x + o} 270' stroke='#6a4410' stroke-opacity='.45' stroke-width='1.2'/>`).join("")}<rect x='${x - 5}' y='26' width='36' height='8' fill='#e7b84a'/><rect x='${x - 5}' y='34' width='36' height='3' fill='#6a4410'/>`).join("");
        const coin = (x, y, r) => `<ellipse cx='${x}' cy='${y}' rx='${r}' ry='${n2(r * .32)}' fill='#ffd76a' stroke='#8a5a10' stroke-width='.8'/>`;
        let pile = ""; for (let i = 0; i < (full ? 7 : 4); i++) pile += coin(352 + (i % 2) * 6, 246 - i * 5, 22) + coin(30 + (i % 2) * 4, 250 - i * 4.6, 18);
        const front = `${pile}<rect x='292' y='226' width='38' height='16' fill='#f2c85a' stroke='#8a5a10'/><path d='M292 226L300 218L338 218L330 226Z' fill='#ffe9a0' stroke='#8a5a10'/>`;
        return { layers: [{ d: .1, img: hall }, { d: .5, img: cols }, { d: .9, img: front }], html: `<i class='s3-x s3-shaft'></i><i class='s3-x s3-shaft s3-s2 s3-sec'></i><i class='s3-x s3-dust s3-gold'></i>`, scrim: [.46, .4] };
    },
    /* PLATINUM: a glassy tech panel: a fine grid under dark glass, soft bloom, UI modules, data streaming down in
       columns, the glass bevel catching light */
    platinum(lv) {
        const full = lv === "full";
        let grid = ""; for (let x = 0; x <= 400; x += 14) grid += `M${x} 0L${x} 252`; for (let y = 0; y <= 252; y += 14) grid += `M0 ${y}L400 ${y}`;
        const glass = `<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#1a2532'/><stop offset='1' stop-color='#070b11'/></linearGradient>${blur("b", 18)}</defs><rect width='400' height='252' fill='url(#g)'/><path d='${grid}' stroke='#8fdcff' stroke-opacity='.07' stroke-width='.6'/>`
            + `<circle cx='300' cy='70' r='50' fill='#6fd8ff' opacity='.22' filter='url(#b)'/><circle cx='120' cy='210' r='60' fill='#c8f0ff' opacity='.12' filter='url(#b)'/>`;
        const mod = (x, y, w, h) => `<rect x='${x}' y='${y}' width='${w}' height='${h}' rx='6' fill='#0d1a26' fill-opacity='.55' stroke='#9ff8ff' stroke-opacity='.35'/><rect x='${x + 8}' y='${y + 8}' width='${w * .45}' height='3' rx='1.5' fill='#9ff8ff' opacity='.55'/><rect x='${x + 8}' y='${y + 15}' width='${w * .3}' height='2' rx='1' fill='#9ff8ff' opacity='.3'/>`;
        const mods = mod(262, 150, 120, 56) + mod(178, 14, 96, 40) + (full ? mod(18, 196, 70, 36) : "") + `<path d='M262 206L382 206' stroke='#9ff8ff' stroke-opacity='.15'/>`;
        const bevel = `<path d='M0 0L400 0L400 8Q200 3 0 8Z' fill='#fff' opacity='.08'/><path d='M-10 180Q90 150 210 252' fill='none' stroke='#fff' stroke-opacity='.08' stroke-width='18'/>`;
        return { layers: [{ d: .1, img: glass }, { d: .45, img: mods }, { d: .85, img: bevel }], html: `<i class='s3-x s3-stream'></i><i class='s3-x s3-stream s3-st2'></i>${full ? "<i class='s3-x s3-stream s3-st3 s3-sec'></i>" : ""}`, scrim: [.4, .32] };
    },
    /* EMERALD: under an emerald canopy: misty trunks far away, layers of foliage, big leaves close up, shafts of sun
       moving through the leaves, pollen and fireflies */
    emerald(lv) {
        const full = lv === "full", R = rnd(23);
        const far = `<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#0a3a22'/><stop offset='.6' stop-color='#05261a'/><stop offset='1' stop-color='#03140c'/></linearGradient>${blur("b", 4)}</defs><rect width='400' height='252' fill='url(#g)'/>`
            + `<g filter='url(#b)' opacity='.5'>${[40, 130, 230, 330].map((x, i) => `<rect x='${x}' y='0' width='${10 + i * 3}' height='252' fill='#0d3a24'/>`).join("")}</g><ellipse cx='240' cy='60' rx='160' ry='60' fill='#5fe0a0' opacity='.12' filter='url(#b)'/>`;
        const lf = (x, y, a, s, c) => `<path transform='translate(${n2(x)} ${n2(y)}) rotate(${n2(a)}) scale(${n2(s)})' d='M0 0C6 -8 18 -9 28 0C18 9 6 8 0 0Z' fill='${c}'/>`;
        let mid = `<defs>${blur("b", 1.6)}</defs><g filter='url(#b)'>`; for (let i = 0; i < (full ? 46 : 24); i++) { const top = R() < .65, x = R() * 420 - 10, y = top ? R() * 60 - 10 : 200 + R() * 60; mid += lf(x, y, R() * 360, .6 + R() * .7, mix("#1f7a3a", "#0c4a22", R())); } mid += `</g>`;
        const big = (x, y, a, s) => `<g transform='translate(${x} ${y}) rotate(${a}) scale(${s})'><path d='M0 0C10 -16 36 -20 60 0C36 20 10 16 0 0Z' fill='#06301a'/><path d='M2 0L56 0' stroke='#3fbf6a' stroke-opacity='.5' stroke-width='1'/>${[14, 26, 38].map(k => `<path d='M${k} 0L${k + 8} -8M${k} 0L${k + 8} 8' stroke='#3fbf6a' stroke-opacity='.3' stroke-width='.7'/>`).join("")}</g>`;
        const near = big(392, -14, 140, 1.4) + big(410, 30, 170, 1) + big(-14, 262, -40, 1.3) + (full ? big(60, 266, -70, .9) : "");
        return { layers: [{ d: .08, img: far }, { d: .4, img: mid }, { d: .9, img: near }], html: `<i class='s3-x s3-sunray'></i><i class='s3-x s3-sunray s3-s2 s3-sec'></i><i class='s3-x s3-dust s3-pollen'></i>`, scrim: [.42, .34] };
    },
    /* WATER: underwater: light from the surface, silhouettes of distant rock arches and a school of fish, kelp
       swaying, rocks in front, a manta gliding far behind, bubbles rising (canvas on full cards) */
    water(lv) {
        const full = lv === "full", R = rnd(9);
        const far = `<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#1a7fb8'/><stop offset='.35' stop-color='#0a4a7c'/><stop offset='1' stop-color='#021426'/></linearGradient>${blur("b", 3)}</defs><rect width='400' height='252' fill='url(#g)'/>`
            + `<g filter='url(#b)' fill='#06304f' opacity='.75'><path d='M180 252L190 150Q230 100 270 150L280 252L262 252L258 170Q230 136 202 170L198 252Z'/><path d='M300 252L320 196L360 180L400 200L400 252Z'/></g>`
            + `<g fill='#0b3a5e' opacity='.7'>${[...Array(full ? 18 : 10)].map(() => { const x = 230 + R() * 120, y = 60 + R() * 50; return `<path transform='translate(${n2(x)} ${n2(y)})' d='M0 0Q3 -1.6 6 0Q3 1.6 0 0ZM6 0L8 -1.4L8 1.4Z'/>`; }).join("")}</g>`;
        let kelp = ""; for (let i = 0; i < (full ? 7 : 4); i++) { const x = [24, 88, 150, 300, 350, 60, 380][i], h = 90 + R() * 70; let d = `M${x} 262`; for (let k = 1; k <= 6; k++) d += `Q${n2(x + (k % 2 ? 9 : -9))} ${n2(262 - h * (k - .5) / 6)} ${x} ${n2(262 - h * k / 6)}`; kelp += `<path d='${d}' fill='none' stroke='#0b4a3a' stroke-width='${n2(4 + R() * 3)}' stroke-linecap='round' opacity='.85'/>`; }
        const near = `<path d='M-10 262L-10 214Q20 196 54 210Q76 222 92 262Z' fill='#031220'/><path d='M-10 214Q20 196 54 210Q76 222 92 262' fill='none' stroke='#5fd0ff' stroke-opacity='.3' stroke-width='1.4'/><path d='M410 262L410 206Q376 196 346 214Q326 230 318 262Z' fill='#031220'/><path d='M410 206Q376 196 346 214Q326 230 318 262' fill='none' stroke='#5fd0ff' stroke-opacity='.28' stroke-width='1.4'/>`;
        return { layers: [{ d: .08, img: far }, { d: .4, img: kelp, cls: "s3-sway2" }, { d: .9, img: near }], html: `<i class='s3-x s3-rays'></i><i class='s3-x s3-manta s3-sec'></i>${full ? "" : "<i class='s3-x s3-bubbles'></i>"}`, canvas: full ? "bubbles" : null, scrim: [.4, .32] };
    },
    /* TRANSCENDENT: the cosmos in depth: a spiral galaxy far away, a teal-and-gold nebula, three star fields at
       different depths (the parallax is strongest here) and now and then a shooting star */
    transcendent(lv) {
        const full = lv === "full", R = rnd(61);
        const sf = (n, rmin, rmax, glow) => { let s = ""; for (let i = 0; i < n; i++) { const x = n2(R() * 400), y = n2(R() * 252), r = n2(rmin + R() * (rmax - rmin)), c = ["#ffffff", "#fff2c4", "#cfe8ff"][i % 3]; s += `<circle cx='${x}' cy='${y}' r='${r}' fill='${c}' opacity='${n2(.5 + R() * .5)}'/>` + (glow && R() > .6 ? `<circle cx='${x}' cy='${y}' r='${n2(r * 4)}' fill='${c}' opacity='.12'/>` : ""); } return s; };
        let arms = ""; for (let k = 0; k < 2; k++) { let d = ""; for (let i = 0; i < 40; i++) { const a = i * .22 + k * Math.PI, r = 2 + i * .9; d += (i ? "L" : "M") + n2(300 + r * Math.cos(a)) + " " + n2(70 + r * .55 * Math.sin(a)); } arms += `<path d='${d}' fill='none' stroke='#e9dcff' stroke-opacity='.35' stroke-width='3'/>`; }
        const far = `<defs><radialGradient id='g' cx='.5' cy='.45' r='.8'><stop offset='0' stop-color='#14243a'/><stop offset='.7' stop-color='#070a18'/><stop offset='1' stop-color='#020309'/></radialGradient>${blur("b", 2.2)}<filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.007' numOctaves='4' seed='12'/><feColorMatrix values='.2 0 .6 0 0 .6 .3 .4 0 0 .5 .2 .3 0 0 0 0 1.9 0 -.95'/></filter></defs>`
            + `<rect width='400' height='252' fill='url(#g)'/><rect width='400' height='252' filter='url(#n)' opacity='.9'/><g filter='url(#b)'>${arms}<ellipse cx='300' cy='70' rx='8' ry='4.5' fill='#fff6e0'/></g>${sf(full ? 70 : 40, .3, .8, false)}`;
        return { layers: [{ d: .06, img: far }, { d: .4, img: sf(full ? 34 : 20, .6, 1.2, true) }, { d: .95, img: sf(full ? 12 : 7, 1.2, 2, true) }], html: `<i class='s3-x s3-meteor'></i>${full ? "<i class='s3-x s3-meteor s3-m2 s3-sec'></i>" : ""}`, scrim: [.4, .3] };
    },
    /* PRISMATIC: a liquid-crystal film: flowing marbled thin-film colour; three colour states cross-fade with the
       tilt (pointer / device / drift), so the colour shifts as the card moves */
    prismatic(lv) {
        const CY = ["#ff3d8b", "#ffa23d", "#f6f05a", "#3dffa8", "#3db8ff", "#8a5cff"];
        const film = (seed, hue) => `<defs><linearGradient id='c' x1='0' y1='0' x2='1' y2='1'>${[...CY, ...CY, CY[0]].map((c, i) => `<stop offset='${n2(i / 12)}' stop-color='${c}'/>`).join("")}</linearGradient><filter id='m' x='-10%' y='-10%' width='120%' height='120%'><feTurbulence type='fractalNoise' baseFrequency='.005 .011' numOctaves='3' seed='${seed}' result='t'/><feDisplacementMap in='SourceGraphic' in2='t' scale='170' xChannelSelector='R' yChannelSelector='G'/><feColorMatrix type='hueRotate' values='${hue}'/><feColorMatrix type='saturate' values='1.35'/><feGaussianBlur stdDeviation='.5'/></filter></defs>`
            + `<rect x='-60' y='-60' width='520' height='372' fill='url(#c)' filter='url(#m)'/>`;
        const sheen = `<defs><radialGradient id='s' cx='.35' cy='.25' r='.7'><stop offset='0' stop-color='#fff' stop-opacity='.35'/><stop offset='1' stop-color='#fff' stop-opacity='0'/></radialGradient></defs><rect width='400' height='252' fill='#140a26' opacity='.2'/><rect width='400' height='252' fill='url(#s)'/>`;
        return { layers: [{ d: .2, img: film(3, 0) }, { d: .35, img: film(8, 70), cls: "s3-lca" }, { d: .35, img: film(14, -80), cls: "s3-lcb" }, { d: .7, img: sheen }], html: "", scrim: [.5, .4] };
    }
};

/* =========================== CANVAS EFFECTS =========================== */
const rr = (a, b) => a + Math.random() * (b - a);
export const STEPS_MORE = {
    /* the water serpent: spray and droplets thrown off its body, falling back (frame canvas = 160 x 160 units) */
    spray(it, dt, W, H, S) {
        const g = it.g, u = W / 160, Pp = it.parts, o = 30 * u;
        it.next = (it.next || 0) - dt;
        if (it.next <= 0) { it.next = rr(.35, .7); const a = rr(0, Math.PI * 2), r = 46; for (let i = 0; i < 6; i++) { const sp = rr(18, 36) * u, d = a + rr(-.6, .6); Pp.push({ x: o + (50 + r * Math.sin(a)) * u, y: o + (50 - r * Math.cos(a)) * u, vx: Math.sin(d) * sp, vy: -Math.cos(d) * sp - rr(4, 12) * u, s: rr(.8, 1.6) * u, life: rr(.5, .9), t: 0 }); } }
        g.clearRect(0, 0, W, H);
        for (let i = Pp.length - 1; i >= 0; i--) { const p = Pp[i]; p.t += dt; if (p.t >= p.life) { Pp.splice(i, 1); continue; } p.vy += 70 * u * dt; p.x += p.vx * dt; p.y += p.vy * dt; const k = p.t / p.life, s = p.s * 2; g.globalAlpha = (1 - k) * .95; g.drawImage(S.drop, p.x - s, p.y - s, s * 2, s * 2); }
        g.globalAlpha = 1;
    },
    /* bubbles rising through the underwater scene, wobbling, with a highlight */
    bubbles(it, dt, W, H, S) {
        const g = it.g, Pp = it.parts;
        it.emit += dt * Math.min(16, 9 * W / 420);
        while (it.emit >= 1) { it.emit--; if (Pp.length > 40) break; Pp.push({ x: rr(0, W), y: H * rr(1, 1.05), vy: -rr(.07, .16) * H, s: rr(.006, .02) * H, life: rr(4, 7), t: 0, ph: rr(0, 6) }); }
        g.clearRect(0, 0, W, H);
        for (let i = Pp.length - 1; i >= 0; i--) { const p = Pp[i]; p.t += dt; if (p.t >= p.life || p.y < -10) { Pp.splice(i, 1); continue; } p.y += p.vy * dt; const x = p.x + Math.sin(it.t * 2 + p.ph) * p.s * 2.5; g.globalAlpha = Math.min(1, (p.life - p.t)) * .9; g.drawImage(S.bubble, x - p.s * 2, p.y - p.s * 2, p.s * 4, p.s * 4); }
        g.globalAlpha = 1;
    }
};
