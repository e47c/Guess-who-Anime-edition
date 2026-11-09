/* =====================================================================
   SEASON 3 SKINS · living scenes (styles: css/skins3.css, numbers: js/vault/config.js SKINS3)
   A Season 3 skin is a small scene, not a material:
   FRAME (.ava.s3.sf-<tier>3): an object / creature / artifact around the picture (SVG), behind the picture so the
     picture is never covered. It has an idle loop and an ENTRANCE (.s3-in) that plays once when the player appears
     in the lobby, when the skin is equipped or when it is pinned on a preview.
   BACKGROUND (.sbg.sbg3[data-bg=<tier>3]): 3-4 depth layers (.s3-l, --d = depth) that move with the pointer (PC),
     the device tilt (phones, after permission) or a slow idle drift (and a drag on touch), plus animated overlays,
     a pointer shine and a scrim that keeps the name, title, level, XP bar and chip readable.
   THREE RENDER LEVELS for every skin: full (own card, previews, big avatars: every layer, canvas fire), medium
     (lobby cards, Shop / Wardrobe tiles: the same silhouette, fewer details, CSS / SVG only) and compact (tokens,
     chips, lists, mini passes: a simplified still shape).
   BUDGET: "hero" skins (your own card, the previewed one) run at heroFps with every loop; the rest are "crowd" skins:
     parallax at crowdFps and a simplified loop: the frame's inner SVG loops stop (each one repaints the whole SVG) and
     the frame floats gently as one composited layer instead; entrances still play. At most maxHeavy canvas
     or SVG-filter effects run at once (heroes first); the others keep a still frame. Off-screen (.fx-off), hidden
     (0 size) and a hidden tab pause everything. Reduced effects: no parallax, no entrance, a still scene.
   Built so far: Ruby, Diamond, Flame (the other tiers render as a plain picture / default card until they exist).
   ===================================================================== */
import { SKINS3 } from "./vault/config.js?v=19";
import { motionOK } from "./fx.js";

/* ---------- small helpers (frame box 0..100, picture centre 50,50; angles clockwise from the top) ---------- */
const n2 = v => Math.round(v * 100) / 100;
const XY = (r, d, cx = 50, cy = 50) => { const a = d * Math.PI / 180; return [n2(cx + r * Math.sin(a)), n2(cy - r * Math.cos(a))]; };
const P = (r, d) => XY(r, d).join(" ");
const arc = (r, a1, a2) => `M${P(r, a1)}A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${P(r, a2)}`;
const stops = list => list.map(([o, c, op]) => `<stop offset='${o}' stop-color='${c}'${op != null ? ` stop-opacity='${op}'` : ""}/>`).join("");
const lg = (id, list, a = "x1='0' y1='0' x2='1' y2='1'") => `<linearGradient id='${id}' ${a}>${stops(list)}</linearGradient>`;
const rg = (id, list, a = "") => `<radialGradient id='${id}' ${a}>${stops(list)}</radialGradient>`;
const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { t = Math.max(0, Math.min(1, t)); const A = hx(a), B = hx(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const rnd = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const star4 = (s = 5, k = .18) => `M0 ${-s}L${n2(s * k)} ${n2(-s * k)}L${s} 0L${n2(s * k)} ${n2(s * k)}L0 ${s}L${n2(-s * k)} ${n2(s * k)}L${-s} 0L${n2(-s * k)} ${n2(-s * k)}Z`;
const poly = pts => "M" + pts.map(p => n2(p[0]) + " " + n2(p[1])).join("L") + "Z";
const dly = s => `style='animation-delay:${n2(s)}s'`;

/* a cut gem seen from the top (round / oval brilliant): table, star facets, bezels, upper girdle facets, shaded for a
   light from the upper left, plus an inner glow, a rim and specular glints. pal = { hi, mid, lo, rim, glow } */
function brilliant(cx, cy, rx, ry, rot, pal, o = {}) {
    const n = 8, r = rnd(o.seed || 7), pt = (k, off) => [...Array(n)].map((_, i) => { const a = (i * 360 / n + off + rot) * Math.PI / 180; return [cx + rx * k * Math.sin(a), cy - ry * k * Math.cos(a)]; });
    const T = pt(.47, 0), S = pt(.76, 22.5), G = pt(1, 0), G2 = pt(1, 22.5);
    const lit = a => (1 + Math.cos((a + rot - 315) * Math.PI / 180)) / 2;
    const col = (l, j = .18) => mix(pal.lo, pal.hi, l + (r() - .5) * j);
    let s = "";
    if (!o.simple) for (let i = 0; i < n; i++) {
        const a = i * 45, j = (i + 1) % n, h = (i + n - 1) % n;
        s += `<path d='${poly([S[i], G[i], G2[i]])}' fill='${col(lit(a + 11) * .85)}'/><path d='${poly([S[i], G2[i], G[j]])}' fill='${col(1 - lit(a + 34) * .8)}'/>`;
        s += `<path d='${poly([T[i], S[h], G[i], S[i]])}' fill='${col(lit(a) * .95 + .05)}'/>`;
        s += `<path d='${poly([T[i], T[j], S[i]])}' fill='${col(1 - lit(a + 22.5) * .7)}'/>`;
    } else for (let i = 0; i < n; i++) { const a = i * 45, j = (i + 1) % n; s += `<path d='${poly([T[i], G[i], G[j], T[j]])}' fill='${col(lit(a + 22.5), .1)}'/>`; }
    s += `<path d='${poly(T)}' fill='${pal.mid}'/>`;
    const tr = `rotate(${rot} ${cx} ${cy})`;
    const lines = o.simple ? "" : `<g fill='none' stroke='${pal.hi}' stroke-opacity='.35' stroke-width='${n2(Math.max(rx, ry) * .025)}'>${T.map((p, i) => `<path d='M${n2(p[0])} ${n2(p[1])}L${n2(G[i][0])} ${n2(G[i][1])}'/>`).join("")}</g>`;
    const glow = pal.glow ? `<ellipse class='${o.glowCls || "s3-glow"}' cx='${cx}' cy='${cy}' rx='${n2(rx * .78)}' ry='${n2(ry * .78)}' transform='${tr}' fill='url(#${o.glowId})' style='mix-blend-mode:screen${o.glowDelay != null ? ";animation-delay:" + o.glowDelay + "s" : ""}'/>` : "";
    const spec = o.simple ? "" : `<ellipse cx='${n2(cx - rx * .3)}' cy='${n2(cy - ry * .32)}' rx='${n2(rx * .2)}' ry='${n2(ry * .11)}' transform='rotate(-30 ${n2(cx - rx * .3)} ${n2(cy - ry * .32)})' fill='#fff' opacity='.75'/>`;
    return `<g>${s}${lines}${glow}<ellipse cx='${cx}' cy='${cy}' rx='${rx}' ry='${ry}' transform='${tr}' fill='none' stroke='${pal.rim}' stroke-width='${n2(Math.max(rx, ry) * .05)}'/>${spec}</g>`;
}
const RUBY = { hi: "#ff7f97", mid: "#e0183c", lo: "#3e000e", rim: "#2a0008", glow: true };
const ICE = { hi: "#ffffff", mid: "#e6f3fb", lo: "#58748a", rim: "#3e5a70" };

/* =========================== FRAMES =========================== */
/* full + medium: viewBox -30..130 (picture radius 33); compact: viewBox -12..112 (picture radius 40) */
const ROSE = u => lg("rg" + u, [[0, "#fbd6c4"], [.32, "#dc977f"], [.58, "#a5604d"], [.82, "#f4bca6"], [1, "#c98169"]]);
const SHADOW = (u, r = 54) => `<defs>${rg("sd" + u, [[.6, "#000", .5], [1, "#000", 0]])}</defs><circle cx='50' cy='53' r='${r}' fill='url(#sd${u})'/>`;
const FRAME3 = {
    /* RUBY: a rose-gold jewellery setting holding claw-set cut rubies whose inner glow pulses; the setting is three open
       arms broken by the stones, with filigree curls (full). Entrance: the arms draw in, the stones drop into their claws. */
    ruby: {
        full: u => rubyFrame(u, "full"), medium: u => rubyFrame(u, "medium"),
        compact: u => `<defs>${ROSE(u)}</defs>`
            + [`M38 7C24 8 12 18 9 34C7 46 9 56 14 63`].map(d => `<path d='${d}' fill='none' stroke='url(#rg${u})' stroke-width='3.6' stroke-linecap='round'/><path transform='translate(100 0) scale(-1 1)' d='${d}' fill='none' stroke='url(#rg${u})' stroke-width='3.6' stroke-linecap='round'/>`).join("")
            + brilliant(50, 3, 12.5, 8.5, 0, RUBY, { simple: true }) + brilliant(15, 70, 6, 6, 0, RUBY, { simple: true }) + brilliant(85, 70, 6, 6, 0, RUBY, { simple: true }) + brilliant(50, 101, 5.5, 7.5, 0, RUBY, { simple: true })
    },
    /* DIAMOND: a crown cut from diamond: a band of brilliants over the head, five faceted spires, tiara tails of stones
       running down the sides, and thin rainbow beams of dispersed light sweeping from the spires. Entrance: the crown
       descends and settles, then the beams flare. */
    diamond: { full: u => diamondFrame(u, "full"), medium: u => diamondFrame(u, "medium"), compact: u => diamondFrame(u, "compact") },
    /* FLAME: a phoenix: crest of flame plumes, glowing eyes, fire wings that spread and fold around the picture, a long
       tail below. Full: heat distortion over the fire and a canvas of flames + embers. Entrance: it rises with folded
       wings, the crest ignites and the wings open. */
    flame: { full: u => phoenix(u, "full"), medium: u => phoenix(u, "medium"), compact: u => phoenix(u, "compact") }
};

function rubyFrame(u, lv) {
    const full = lv === "full";
    /* a brooch: a big claw-set oval ruby crowning the picture on a rose-gold gallery, two scrolls sweeping down the sides
       to cushion rubies, small accent stones on the scrolls, and a pear-shaped ruby drop hanging below the picture */
    const claws = (cx, cy, rx, ry, angs) => angs.map(a => { const [x, y] = XY(1, a, 0, 0); return `<path transform='translate(${n2(cx + x * rx * 1.03)} ${n2(cy + y * ry * 1.03)}) rotate(${a + 180})' d='M-1.3 1.8Q0 -2.9 1.3 1.8Q0 2.7 -1.3 1.8Z' fill='url(#rg${u})' stroke='#6b3326' stroke-width='.3'/>`; }).join("");
    const gem = (cx, cy, rx, ry, rot, ang, d, seed, simple) => `<g class='s3-e-pop' style='transform-origin:${cx}px ${cy}px;animation-delay:${n2(.35 + d)}s'><ellipse cx='${cx}' cy='${n2(cy + ry * .3)}' rx='${n2(rx * 1.12)}' ry='${n2(ry * .95)}' fill='#2a0008' opacity='.5'/>`
        + brilliant(cx, cy, rx, ry, rot, RUBY, { simple, glowId: "gw" + u, seed }) + claws(cx, cy, rx, ry, ang) + `</g>`;
    const scroll = `M38 9C24 9 11 18 7 32C4 44 7 56 13 63`;
    const curl = `M7 33C1 33 -2 38 1 42C3 45 7 43 6 40`;
    const side = `<g class='s3-e-draw' style='animation-delay:.05s'><path pathLength='1' d='${scroll}' fill='none' stroke='#5a2a20' stroke-width='4.4' stroke-linecap='round'/><path pathLength='1' d='${scroll}' fill='none' stroke='url(#rg${u})' stroke-width='3.3' stroke-linecap='round'/><path pathLength='1' d='M36 10.5C24 11 13 19 9.5 32' fill='none' stroke='#ffeadf' stroke-width='.6' stroke-linecap='round' opacity='.85'/>`
        + (full ? `<path pathLength='1' d='${curl}' fill='none' stroke='url(#rg${u})' stroke-width='1.4' stroke-linecap='round'/><path pathLength='1' d='M14 20C12 14 16 10 20 13' fill='none' stroke='url(#rg${u})' stroke-width='1.1' stroke-linecap='round'/>` : "") + `</g>`
        + gem(16, 72, 8.6, 8.6, 15, [45, 135, 225, 315], .14, 5, !full) + gem(9.2, 47, 3.3, 3.3, 0, [0, 120, 240], .26, 11, true) + (full ? gem(21, 17, 2.8, 2.8, 0, [0, 120, 240], .3, 13, true) : "");
    const gallery = `<path d='M33 10Q50 22 67 10L64 16Q50 25 36 16Z' fill='url(#rg${u})' stroke='#6b3326' stroke-width='.4'/>`;
    const bail = `<path d='M50 84.5C46.5 84.5 46.5 90 50 90C53.5 90 53.5 84.5 50 84.5Z' fill='none' stroke='url(#rg${u})' stroke-width='1.6'/>`;
    const drop = `<g class='s3-e-pop' style='transform-origin:50px 101px;animation-delay:.5s'><g class='s3-sway s3-sec'><path d='M50 90L50 92' stroke='url(#rg${u})' stroke-width='1.4'/>`
        + `<ellipse cx='50' cy='104' rx='8.4' ry='7' fill='#2a0008' opacity='.45'/>` + brilliant(50, 101, 7.6, 10.5, 0, RUBY, { simple: !full, glowId: "gw" + u, seed: 21 })
        + `<path d='M44.5 93.5Q50 88 55.5 93.5' fill='none' stroke='url(#rg${u})' stroke-width='1.8' stroke-linecap='round'/></g></g>`;
    const glints = full ? [[44, -.5, 0], [12, 68, 1.1], [86, 70, 2], [47, 97, 1.6]].map(([x, y, d]) => `<g transform='translate(${x} ${y})'><path class='s3-twinkle s3-sec' ${dly(-d)} d='${star4(3.8, .14)}' fill='#fff'/></g>`).join("") : "";
    return SHADOW(u) + `<defs>${ROSE(u)}${rg("gw" + u, [[0, "#ffc39a", .95], [.45, "#ff2a48", .55], [1, "#ff0030", 0]])}</defs>`
        + side + `<g transform='translate(100 0) scale(-1 1)'>${side}</g>` + bail + drop + gallery
        + gem(50, 3, 15, 10.5, 0, [0, 45, 90, 135, 180, 225, 270, 315], 0, 3, false) + glints;
}

function diamondFrame(u, lv) {
    const full = lv === "full", cmp = lv === "compact", R0 = cmp ? 45 : 42.5;
    const stone = (x, y, r, i) => full ? brilliant(x, y, r, r, i * 9, ICE, { seed: 20 + i }) : `<circle cx='${x}' cy='${y}' r='${r}' fill='url(#st${u})' stroke='#5b778c' stroke-width='.3'/>`;
    let band = `<path d='${arc(R0, -62, 62)}' fill='none' stroke='#2c3f50' stroke-width='${cmp ? 7.4 : 6.6}' stroke-linecap='round'/><path d='${arc(R0, -62, 62)}' fill='none' stroke='url(#pl${u})' stroke-width='${cmp ? 6 : 5.4}' stroke-linecap='round'/>`;
    const step = cmp ? 15 : 7.5;
    for (let a = -60, i = 0; a <= 60.1; a += step, i++) { const [x, y] = XY(R0, a); band += stone(x, y, cmp ? 3 : 2.5, i); }
    let tails = "";
    if (!cmp) [1, -1].forEach(sg => { tails += `<path d='${sg > 0 ? arc(43.4, 66, 122) : arc(43.4, 238, 294)}' fill='none' stroke='url(#pl${u})' stroke-width='1.1'/>`; for (let k = 0; k < 7; k++) { const a = sg * (68 + k * 8.5), [x, y] = XY(43.4, a); tails += stone(x, y, n2(2.3 - k * .17), 30 + k); } });
    const spires = (cmp ? [[-22, 11, 2.8], [0, 15, 3.4], [22, 11, 2.8]] : [[-38, 14, 3], [-19, 19, 3.3], [0, 25, 3.8], [19, 19, 3.3], [38, 14, 3]]).map(([a, h, w], i) => {
        const [x, y] = XY(R0 + 1.5, a);
        const f = full ? `<path d='${poly([[-w, 0], [-w * 1.12, -h * .56], [0, -h], [0, -h * .14]])}' fill='#f4fbff'/><path d='${poly([[-w * 1.12, -h * .56], [0, -h], [-w * .25, -h * .5]])}' fill='#c7dbe8'/><path d='${poly([[w, 0], [w * 1.12, -h * .56], [0, -h], [0, -h * .14]])}' fill='#8fa9bd'/><path d='${poly([[w * 1.12, -h * .56], [0, -h], [w * .3, -h * .5]])}' fill='#dceaf3'/><path d='M0 ${n2(-h * .14)}L0 ${-h}' stroke='#fff' stroke-width='.35'/><path class='s3-flick s3-sec' ${dly(-i * .45)} d='${poly([[-w * .9, -h * .5], [-w * .2, -h * .58], [-w * .55, -h * .2]])}' fill='#fff9e6'/>`
            : `<path d='${poly([[-w, 0], [-w * 1.1, -h * .56], [0, -h], [0, 0]])}' fill='#eef6fb'/><path d='${poly([[w, 0], [w * 1.1, -h * .56], [0, -h], [0, 0]])}' fill='#91abbf'/>`;
        return `<g transform='translate(${x} ${y}) rotate(${a})'>${f}<path d='${poly([[-w, 0], [-w * 1.12, -h * .56], [0, -h], [w * 1.12, -h * .56], [w, 0]])}' fill='none' stroke='#5b778c' stroke-width='.35'/></g>`;
    }).join("");
    const top = cmp ? "" : (() => { const [x, y] = XY(R0 + 1.5 + 25 + 2.4, 0); return full ? brilliant(x, y, 3.4, 3.4, 0, ICE, { seed: 4 }) : `<circle cx='${x}' cy='${y}' r='3.2' fill='url(#st${u})'/>`; })();
    let beams = "";
    if (!cmp) {
        const B = full ? [[-38, -60, 26], [-38, -20, 22], [-19, -40, 32], [-19, 8, 20], [0, -18, 34], [0, 18, 30], [19, -8, 22], [19, 40, 32], [38, 22, 22], [38, 62, 26]] : [[-19, -40, 26], [0, -14, 28], [0, 16, 26], [19, 40, 26]];
        beams = B.map(([a, off, L], i) => { const h = { "-38": 14, "-19": 19, "0": 25, "19": 19, "38": 14 }[a], [x, y] = XY(R0 + 1.5 + h, a);
            return `<g transform='translate(${x} ${y}) rotate(${a + off - 90})'><g class='s3-beam${full ? "" : " s3-beam-m"}' ${dly(-i * .6)}><path d='M0 -.35L${L} -1.5L${L} 1.5L0 .35Z' fill='url(#sp${u})'/></g></g>`; }).join("");
        beams = `<g class='s3-e-flare'>${beams}</g>`;
    }
    const sparks = full ? [[60, 22, 0], [-2, 40, 1], [102, 40, 1.8], [30, -4, 2.4], [78, -6, .6]].map(([x, y, d]) => `<g transform='translate(${x} ${y})'><path class='s3-twinkle s3-sec' ${dly(-d)} d='${star4(3.2, .12)}' fill='#fff'/></g>`).join("") : "";
    return (cmp ? "" : SHADOW(u, 52)) + `<defs>${lg("pl" + u, [[0, "#ffffff"], [.4, "#c9d6e0"], [.7, "#f1f6fa"], [1, "#8d9fae"]], "x1='0' y1='0' x2='0' y2='1'")}${rg("st" + u, [[0, "#ffffff"], [.45, "#e3f1fa"], [.8, "#9bb7cb"], [1, "#6a879c"]], "cx='.38' cy='.32' r='.8'")}`
        + `${lg("sp" + u, [[0, "#ffffff", .95], [.14, "#ff5a8a", .75], [.32, "#ffd35a", .62], [.52, "#5aff9a", .55], [.72, "#5ac8ff", .5], [1, "#b45aff", 0]], "x1='0' y1='0' x2='1' y2='0'")}</defs>`
        + `<g class='s3-e-descend'>${beams}${tails}${band}${spires}${top}</g>` + sparks;
}

/* a flame feather along +x: a wide base, flame-tongue notches at the tip */
const feather = (L, w) => `M0 0C${n2(L * .25)} ${n2(-w)} ${n2(L * .6)} ${n2(-w * 1.1)} ${n2(L * .8)} ${n2(-w * .5)}Q${n2(L * .9)} ${n2(-w * .95)} ${L} ${n2(-w * .2)}Q${n2(L * .92)} ${n2(w * .1)} ${n2(L * .96)} ${n2(w * .5)}Q${n2(L * .84)} ${n2(w * .38)} ${n2(L * .77)} ${n2(w * .75)}C${n2(L * .55)} ${n2(w * 1.05)} ${n2(L * .25)} ${n2(w * .8)} 0 0Z`;
function phoenix(u, lv) {
    const full = lv === "full", cmp = lv === "compact";
    const F = (ang, L, w, g, extra = "") => `<g transform='rotate(${ang})'><path d='${feather(L, w)}' fill='url(#${g}${u})'/>${full ? `<path d='M1 0Q${n2(L * .5)} ${n2(-w * .15)} ${n2(L * .9)} ${n2(-w * .1)}' fill='none' stroke='#fff6d0' stroke-width='.45' opacity='.75'/><path d='${feather(L * .7, w * .42)}' fill='#fff' opacity='.18'/>` : ""}${extra}</g>`;
    if (cmp) {
        const wing = `<g transform='translate(17 30)'>${[[175, 14], [200, 15], [225, 12]].map(([a, L]) => F(a, L, 3.6, "fp")).join("")}</g>`;
        const crest = [-115, -90, -65].map((a, i) => F(a, [9, 12, 9][i], 2.4, "fc")).join("");
        return `<defs>${lg("fp" + u, [[0, "#fff1b0"], [.4, "#ffb02a"], [.75, "#ff4a0a"], [1, "#b80f00", .3]], "x1='0' y1='0' x2='1' y2='0'")}${lg("fc" + u, [[0, "#fff6d0"], [.5, "#ffc43a"], [1, "#ff5a0a", .2]], "x1='0' y1='0' x2='1' y2='0'")}</defs>`
            + wing + `<g transform='translate(100 0) scale(-1 1)'>${wing}</g><g transform='translate(50 2)'>${crest}<path d='M-5 -1C-5 -7 5 -7 5 -1C5 3 1.6 5.5 0 8C-1.6 5.5 -5 3 -5 -1Z' fill='#ff9a2a' stroke='#8a2500' stroke-width='.5'/></g>`;
    }
    const prim = full ? [[160, 30], [175, 34], [190, 37], [205, 38], [220, 36], [235, 32], [250, 26]] : [[165, 31], [187, 36], [209, 37], [231, 33], [250, 26]];
    const cov = full ? [[170, 18], [192, 20], [214, 20], [236, 18], [252, 14]] : [];
    const wingIn = prim.map(([a, L]) => F(a, L, 4.3, "fp")).join("") + cov.map(([a, L]) => F(a, L, 4.8, "fv")).join("");
    const wing = (sec) => `<g transform='translate(25 34)'><g class='s3-e-unfold'><g class='s3-wing${sec}'>${wingIn}</g></g></g>`;
    const tail = [[112, 34], [90, 39], [68, 34]].map(([a, L], i) => `<g transform='translate(50 79)'><g class='s3-tail s3-sec' ${dly(-i * .7)}>${F(a, L, 4.6, "fp")}</g></g>`).join("");
    const crest = [[-142, 11], [-116, 14], [-90, 17], [-64, 14], [-38, 11]].map(([a, L], i) => `<g class='s3-crest' ${dly(-i * .23)}>${F(a, L, 2.6, "fc")}</g>`).join("");
    const head = `<g transform='translate(50 1.5) scale(1.3)'><g class='s3-e-ignite'>${crest}</g><path d='M-6 -2C-6 -9 6 -9 6 -2C6 3 2 6 0 9C-2 6 -6 3 -6 -2Z' fill='url(#fh${u})' stroke='#7a1500' stroke-width='.45'/>`
        + `<path d='M-1.5 6.2L0 11L1.5 6.2Z' fill='#ffd36a' stroke='#8a3a00' stroke-width='.35'/><g fill='#fffbe6'><ellipse cx='-2.6' cy='-.4' rx='1.5' ry='.75' transform='rotate(14 -2.6 -.4)'/><ellipse cx='2.6' cy='-.4' rx='1.5' ry='.75' transform='rotate(-14 2.6 -.4)'/></g>`
        + `<circle class='s3-eye' cx='-2.4' cy='-.4' r='.45' fill='#ff3000'/><circle class='s3-eye' cx='2.4' cy='-.4' r='.45' fill='#ff3000'/></g>`;
    const heat = full ? `<filter id='ht${u}' x='-20%' y='-20%' width='140%' height='140%'><feTurbulence type='fractalNoise' baseFrequency='.05' numOctaves='1' seed='3' result='t'><animate attributeName='baseFrequency' values='.045;.065;.045' dur='2.6s' repeatCount='indefinite'/></feTurbulence><feDisplacementMap in='SourceGraphic' in2='t' scale='2.4' xChannelSelector='R' yChannelSelector='G'/></filter>` : "";
    return `<defs>${lg("fp" + u, [[0, "#fff6c8"], [.22, "#ffd24a"], [.52, "#ff7a12"], [.8, "#e8320a"], [1, "#a80c00", .3]], "x1='0' y1='0' x2='1' y2='0'")}${lg("fv" + u, [[0, "#fffbe6"], [.4, "#ffe27a"], [.8, "#ff9a2a"], [1, "#ff5a0a", .4]], "x1='0' y1='0' x2='1' y2='0'")}`
        + `${lg("fc" + u, [[0, "#fff6d0"], [.45, "#ffc43a"], [.8, "#ff5a0a"], [1, "#d01a00", .15]], "x1='0' y1='0' x2='1' y2='0'")}${rg("fh" + u, [[0, "#fff4c0"], [.5, "#ff9a2a"], [1, "#c42a00"]], "cx='.5' cy='.4' r='.7'")}${rg("fg" + u, [[.45, "#ff8a1a", .55], [1, "#ff3a00", 0]], "gradientUnits='userSpaceOnUse' cx='50' cy='48' r='56'")}${heat}</defs>`
        + `<circle class='s3-glowpulse' cx='50' cy='48' r='56' fill='url(#fg${u})'/>`
        + `<g class='s3-e-rise'><g ${full ? `class='s3-heat' filter='url(#ht${u})'` : ""}>${tail}${wing(full ? "" : " s3-wing-m")}<g transform='translate(100 0) scale(-1 1)'>${wing(full ? " s3-d1" : " s3-wing-m s3-d1")}</g></g>${head}</g>`;
}

/* =========================== BACKGROUNDS (scene layers; viewBox 0 0 400 252, cropped to fill) =========================== */
const svgURL = body => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 252' preserveAspectRatio='xMidYMid slice'>${body}</svg>`)}")`;
const OV = body => `<svg class='s3-ov' viewBox='0 0 400 252' preserveAspectRatio='xMidYMid slice' aria-hidden='true'>${body}</svg>`;
/* each scene: level -> [{ d (depth), img (static SVG, rasterized once), ov (animated SVG overlay, optional), cls }], plus
   html (extra animated CSS layers) and canvas (a canvas effect for the full level) */
const BG3 = {
    /* RUBY: deep crimson velvet with soft folds, out-of-focus ruby facets glowing behind, crisp cut rubies in the
       corners, lit by a warm flickering glow that breathes across the velvet */
    ruby(lv) {
        const full = lv === "full", R = rnd(41);
        const velvet = `<defs><radialGradient id='v' cx='.42' cy='.4' r='.8'><stop offset='0' stop-color='#8a0f24'/><stop offset='.6' stop-color='#4a0612'/><stop offset='1' stop-color='#1c0207'/></radialGradient>`
            + `<filter id='f' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.005 .018' numOctaves='3' seed='4' result='n'/><feDiffuseLighting in='n' surfaceScale='16' diffuseConstant='1.25' lighting-color='#ffa0ac' result='l'><feDistantLight azimuth='235' elevation='30'/></feDiffuseLighting><feComposite in='l' in2='SourceGraphic' operator='arithmetic' k1='1.45' k2='0' k3='.12'/></filter>`
            + `<filter id='g' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='1' seed='9'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 .7 0 0 0 0 .75 .3 0 0 0 -.08'/></filter></defs>`
            + `<rect width='400' height='252' fill='url(#v)' filter='url(#f)'/>${full ? "<rect width='400' height='252' filter='url(#g)' opacity='.5'/>" : ""}<rect width='400' height='252' fill='url(#vg)'/><radialGradient id='vg' cx='.5' cy='.5' r='.75'><stop offset='.55' stop-color='#000' stop-opacity='0'/><stop offset='1' stop-color='#000' stop-opacity='.6'/></radialGradient>`;
        let bokeh = "";
        for (let i = 0; i < (full ? 9 : 5); i++) { const x = [40, 120, 210, 300, 360, 70, 250, 330, 165][i], y = [40, 18, 30, 50, 120, 200, 120, 26, 236][i], r = 16 + R() * 22, k = 5 + Math.floor(R() * 3), rot = R() * 60;
            bokeh += `<path d='${poly([...Array(k)].map((_, j) => { const a = (j * 360 / k + rot) * Math.PI / 180; return [x + r * Math.cos(a), y + r * Math.sin(a)]; }))}' fill='${["#ff2a4a", "#c40024", "#ff5a6e"][i % 3]}' opacity='${n2(.25 + R() * .3)}'/>`; }
        const far = `<filter id='b' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='${full ? 7 : 6}'/></filter><g filter='url(#b)'>${bokeh}</g>`;
        const sh = (x, y, rx, ry) => `<ellipse cx='${x}' cy='${y}' rx='${rx}' ry='${ry}' fill='#120003' opacity='.6' filter='url(#s)'/>`;
        const near = `<filter id='s' x='-30%' y='-30%' width='160%' height='160%'><feGaussianBlur stdDeviation='5'/></filter>`
            + sh(384, 200, 52, 24) + sh(204, 8, 30, 14) + sh(52, 262, 18, 8)
            + brilliant(386, 178, 48, 36, -14, RUBY, { seed: 3, simple: !full }) + brilliant(204, -8, 30, 24, 18, RUBY, { seed: 8, simple: !full }) + (full ? brilliant(52, 258, 16, 13, 6, RUBY, { seed: 12 }) : "");
        const tw = full ? [[360, 162, 0], [384, 190, 1.2], [196, 6, .6], [48, 252, 1.8]].map(([x, y, d]) => `<g transform='translate(${x} ${y})'><path class='s3-twinkle s3-sec' ${dly(-d)} d='${star4(9, .1)}' fill='#fff'/></g>`).join("") : "";
        const glows = `<defs><radialGradient id='rgl'><stop offset='0' stop-color='#ff7a4a' stop-opacity='.8'/><stop offset='1' stop-color='#ff3a3a' stop-opacity='0'/></radialGradient></defs><ellipse class='s3-glow' cx='386' cy='178' rx='34' ry='26' fill='url(#rgl)' style='mix-blend-mode:screen'/><ellipse class='s3-glow' cx='204' cy='-8' rx='22' ry='18' fill='url(#rgl)' opacity='.45' style='mix-blend-mode:screen;animation-delay:-1.4s'/>`;
        return { layers: [{ d: .15, img: velvet }, { d: .45, img: far }, { d: .9, img: near, ov: glows + tw }],
            html: `<i class='s3-x s3-ruby-flick'></i>${full ? "<i class='s3-x s3-ruby-flick s3-f2 s3-sec'></i>" : ""}`, scrim: [.42, .34] };
    },
    /* DIAMOND: looking into a cut diamond: the pavilion's facets fanning to the culet, mid facets catching reflections
       that change with the tilt (two lighting states cross-fade with --px), near facets flashing in the corners, and
       dispersion fire moving the other way */
    diamond(lv) {
        const full = lv === "full", R = rnd(77);
        const fan = (cx, cy, rr, n, rot, f) => { let s = ""; for (let i = 0; i < n; i++) { const a1 = (i / n * 360 + rot) * Math.PI / 180, a2 = ((i + 1) / n * 360 + rot) * Math.PI / 180; s += `<path d='${poly([[cx, cy], [cx + rr * Math.cos(a1), cy + rr * Math.sin(a1)], [cx + rr * Math.cos(a2), cy + rr * Math.sin(a2)]])}' ${f(i)}/>`; } return s; };
        const deep = `<defs><radialGradient id='d' cx='.57' cy='.52' r='.75'><stop offset='0' stop-color='#3a6a92'/><stop offset='.35' stop-color='#173452'/><stop offset='1' stop-color='#070f1b'/></radialGradient></defs><rect width='400' height='252' fill='url(#d)'/>`
            + fan(228, 132, 420, 24, 4, i => `fill='${["#0d2236", "#1b3b5a", "#0a1828", "#24496c"][i % 4]}' fill-opacity='.55' stroke='#bfe3ff' stroke-opacity='.07' stroke-width='.7'`)
            + `<circle cx='228' cy='132' r='26' fill='#cfeaff' opacity='.18'/><circle cx='228' cy='132' r='6' fill='#fff' opacity='.5'/>`;
        const mid = (seedShift) => { const r2 = rnd(31 + seedShift); return fan(150, 104, 300, 16, 11, i => { const v = r2(); return `fill='${v > .7 ? "#e8f7ff" : v > .45 ? "#a9d8ff" : "#ffffff"}' fill-opacity='${n2(v > .82 ? .34 : .03 + v * .16)}' stroke='#ffffff' stroke-opacity='.16' stroke-width='.8'`; }) + fan(300, 190, 160, 10, 25, i => { const v = r2(); return `fill='#ffffff' fill-opacity='${n2(.02 + v * .2)}' stroke='#dff4ff' stroke-opacity='.22' stroke-width='.8'`; }); };
        const near = `<defs><linearGradient id='n' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#fff' stop-opacity='.55'/><stop offset='1' stop-color='#bfe6ff' stop-opacity='.04'/></linearGradient></defs>`
            + `<path d='M300 -10L410 -10L410 70L352 40Z' fill='url(#n)' stroke='#fff' stroke-opacity='.5'/><path d='M352 40L410 70L410 120Z' fill='#fff' fill-opacity='.12' stroke='#fff' stroke-opacity='.35'/>`
            + `<path d='M-10 170L70 262L-10 262Z' fill='url(#n)' stroke='#fff' stroke-opacity='.45'/><path d='M-10 170L40 150L70 262Z' fill='#e9f7ff' fill-opacity='.14' stroke='#fff' stroke-opacity='.3'/>`
            + (full ? `<path d='M170 262L230 222L280 262Z' fill='#ffffff' fill-opacity='.08' stroke='#fff' stroke-opacity='.25'/>` : "");
        const SPEC = ["#ff5a8a", "#ffd35a", "#5aff9a", "#5ac8ff", "#b45aff"];
        /* dispersion "fire": soft rainbow flares (concentric spectral rings), never stripes */
        const fire = `<defs><radialGradient id='r'>${SPEC.map((c, i) => `<stop offset='${n2(.35 + i * .13)}' stop-color='${c}' stop-opacity='${n2(.55 - i * .05)}'/>`).join("")}<stop offset='1' stop-color='#b45aff' stop-opacity='0'/></radialGradient><filter id='b'><feGaussianBlur stdDeviation='3'/></filter></defs><g filter='url(#b)' opacity='.6'>`
            + [[90, 70, 34, 20], [270, 56, 26, 16], [200, 206, 40, 18], [352, 160, 24, 14]].slice(0, full ? 4 : 2).map(([x, y, rx, ry]) => `<ellipse cx='${x}' cy='${y}' rx='${rx}' ry='${ry}' fill='url(#r)'/>`).join("") + `</g>`;
        const tw = (full ? [[150, 104, 0], [228, 132, .7], [300, 190, 1.3], [96, 160, 2], [352, 40, .4], [40, 150, 1.6]] : [[228, 132, 0], [352, 40, 1]]).map(([x, y, d]) => `<g transform='translate(${x} ${y})'><path class='s3-twinkle' ${dly(-d)} d='${star4(10, .08)}' fill='#fff'/></g>`).join("");
        return { layers: [{ d: .12, img: deep }, { d: .45, img: mid(0), cls: "s3-xa" }, { d: .45, img: mid(5), cls: "s3-xb" }, { d: .9, img: near, ov: tw }, { d: -.45, img: fire, cls: "s3-fire" }], html: "", scrim: [.4, .32] };
    },
    /* FLAME: a lava field at night: a smoking sky with a glowing volcano, a far plain veined with glowing cracks, near
       basalt plates split by molten rivers that pulse and flow, black rocks in front, heat haze and rising embers */
    flame(lv) {
        const full = lv === "full", R = rnd(19);
        const sky = `<defs><linearGradient id='k' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#050101'/><stop offset='.45' stop-color='#1e0503'/><stop offset='.66' stop-color='#6a1606'/><stop offset='1' stop-color='#2a0603'/></linearGradient>`
            + `<filter id='m' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.008 .02' numOctaves='3' seed='6'/><feColorMatrix values='0 0 0 0 .05 0 0 0 0 .02 0 0 0 0 .02 0 0 -1.6 0 1.1'/></filter><filter id='b'><feGaussianBlur stdDeviation='6'/></filter></defs>`
            + `<rect width='400' height='252' fill='url(#k)'/><rect width='400' height='150' filter='url(#m)' opacity='.85'/><ellipse cx='200' cy='168' rx='260' ry='34' fill='#ff5a0a' opacity='.32' filter='url(#b)'/>`
            + `<path d='M300 174L350 124Q358 116 366 117L382 117Q390 117 396 124L440 174Z' fill='#120302'/><path d='M354 121Q374 113 394 121' stroke='#ff8a1a' stroke-width='3' fill='none' filter='url(#b)'/><path d='M354 121Q374 113 394 121' stroke='#ffd36a' stroke-width='1.2' fill='none'/><path d='M372 119Q368 146 352 170' stroke='#ff6a00' stroke-width='2.2' fill='none' opacity='.8'/>`;
        let cracks = "";
        for (let i = 0; i < (full ? 16 : 9); i++) { let x = R() * 420 - 10, y = 158 + R() * 26, d = `M${n2(x)} ${n2(y)}`; for (let k = 0; k < 4; k++) { x += 8 + R() * 22; y += (R() - .5) * 8; d += `L${n2(x)} ${n2(y)}`; } cracks += `<path d='${d}'/>`; }
        const plain = `<defs><filter id='b'><feGaussianBlur stdDeviation='2.4'/></filter></defs><path d='M-10 150Q100 140 200 152T410 150L410 200L-10 200Z' fill='#1a0503'/><g fill='none' stroke-linecap='round'><g stroke='#ff4a00' stroke-width='3.2' filter='url(#b)' opacity='.8'>${cracks}</g><g stroke='#ffb347' stroke-width='1'>${cracks}</g></g>`;
        const river = [`M60 262C80 230 140 222 170 200S230 180 250 172`, `M330 262C310 236 300 214 270 196S220 180 200 176`, `M-10 230C40 226 70 210 110 206`];
        let plates = "";
        for (let i = 0; i < (full ? 10 : 6); i++) { const x = [10, 70, 130, 190, 250, 310, 360, 40, 220, 330][i], y = [196, 214, 236, 222, 238, 212, 238, 244, 252, 190][i], w = 40 + R() * 40, h = 18 + R() * 16;
            plates += `<path d='${poly([[x - w / 2, y], [x - w * .3, y - h], [x + w * .35, y - h * .9], [x + w / 2, y + 2], [x, y + h * .6]])}' fill='#140302' stroke='#ff7a2a' stroke-opacity='.3' stroke-width='1'/>`; }
        const near = `<defs><linearGradient id='l' x1='0' y1='1' x2='0' y2='0'><stop offset='0' stop-color='#ffe27a'/><stop offset='.5' stop-color='#ff8a1a'/><stop offset='1' stop-color='#ff3a00'/></linearGradient><filter id='b' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='5'/></filter></defs>`
            + `<path d='M-10 182Q120 170 220 178T410 180L410 262L-10 262Z' fill='#200604'/><g fill='none' stroke-linecap='round'>${river.map(d => `<path d='${d}' stroke='#ff4a00' stroke-width='16' filter='url(#b)' opacity='.75'/><path d='${d}' stroke='url(#l)' stroke-width='6'/>`).join("")}</g>` + plates;
        const flow = full ? `<g fill='none' stroke-linecap='round'>${river.map((d, i) => `<path class='s3-flow' ${dly(-i * .8)} d='${d}' stroke='#fff3c0' stroke-width='1.3' stroke-dasharray='3 21' opacity='.45'/>`).join("")}</g>` : "";
        const pulse = `<defs><radialGradient id='pg'><stop offset='0' stop-color='#ffd36a' stop-opacity='.75'/><stop offset='.5' stop-color='#ff7a1a' stop-opacity='.3'/><stop offset='1' stop-color='#ff5a00' stop-opacity='0'/></radialGradient></defs>` + [[170, 200], [270, 196], [90, 208]].map(([x, y], i) => `<ellipse class='s3-glow' cx='${x}' cy='${y}' rx='30' ry='11' fill='url(#pg)' style='mix-blend-mode:screen;animation-delay:${-i * .9}s'/>`).join("");
        const front = `<path d='M-10 262L-10 214Q20 200 52 214Q72 226 86 262Z' fill='#070101'/><path d='M-10 214Q20 200 52 214Q72 226 86 262' fill='none' stroke='#ff7a2a' stroke-opacity='.55' stroke-width='1.4'/>`
            + `<path d='M410 262L410 222Q380 206 352 220Q332 236 326 262Z' fill='#070101'/><path d='M410 222Q380 206 352 220Q332 236 326 262' fill='none' stroke='#ff7a2a' stroke-opacity='.5' stroke-width='1.4'/>`;
        return { layers: [{ d: .08, img: sky }, { d: .3, img: plain }, { d: .65, img: near, ov: flow + pulse }, { d: 1, img: front }],
            html: `<i class='s3-x s3-haze'></i>${full ? "" : "<i class='s3-x s3-embers'></i>"}`, canvas: full ? "lava" : null, scrim: [.44, .5] };
    }
};

/* caches: one SVG string per frame level, one data URL per background layer */
const TPL = {}, URLS = {};
let UID = 0;
export const S3_BASES = SKINS3.tiers.map(t => t.id);
/* "ruby3" -> "ruby" (only tiers that are built); anything else -> "" */
export const s3Base = key => { const m = /^([a-z]+)3$/.exec(String(key || "")); return m && S3_BASES.includes(m[1]) && FRAME3[m[1]] && BG3[m[1]] ? m[1] : ""; };
export const s3Built = () => S3_BASES.filter(b => FRAME3[b] && BG3[b]);
export function levelFor(size, want) { return want || (size <= SKINS3.compactBelow ? "compact" : size >= SKINS3.fullFrom ? "full" : "medium"); }

/* ---------- avatars ---------- */
export function decorateAvatar3(el, base, size, o = {}) {
    const lv = levelFor(size, o.level), cmp = lv === "compact";
    el.classList.add("s3", "s3-" + lv); if (!o.hero) el.classList.add("s3-crowd");
    const key = base + ":" + lv;
    if (!TPL[key]) TPL[key] = FRAME3[base][lv]("§");
    const E = cmp ? 12 : 30, u = "t" + (++UID).toString(36);
    const f = document.createElement("i"); f.className = "s3f " + (cmp ? "s3f-c" : "s3f-w"); f.setAttribute("aria-hidden", "true");
    f.innerHTML = `<svg viewBox='${-E} ${-E} ${100 + 2 * E} ${100 + 2 * E}' focusable='false'>${TPL[key].split("§").join(u)}</svg>`;
    el.insertBefore(f, el.querySelector(".ava-in"));
    if (o.entrance && motionOK() && !cmp) enter(el);
    const heavy = lv === "full" && base === "flame";
    if (lv !== "compact") track(el, { kind: "ava", hero: !!o.hero, heavy, svg: heavy ? f.querySelector("svg") : null, canvas: heavy ? fxCanvas(el, "s3-cvf", el.querySelector(".ava-in")) : null, step: heavy ? "phoenix" : null });
}
function enter(el) { el.classList.add("s3-in"); el._s3enter = true; }

/* ---------- player cards (Arcade Pass, lobby seat) ---------- */
export function decorateCard3(el, base, o = {}) {
    const lv = o.level || "full", sc = BG3[base](lv);
    el.classList.add("sbg3", "s3card", "s3bg-" + lv); if (!o.hero) el.classList.add("s3-crowd");
    const w = document.createElement("i"); w.className = "s3bg"; w.setAttribute("aria-hidden", "true");
    sc.layers.forEach((L, i) => {
        const k = base + ":" + lv + ":" + i; if (!URLS[k]) URLS[k] = svgURL(L.img);
        const e = document.createElement("i"); e.className = "s3-l" + (L.cls ? " " + L.cls : ""); e.style.setProperty("--d", String(L.d)); e.style.backgroundImage = URLS[k];
        if (L.ov && lv !== "compact") e.innerHTML = OV(L.ov);
        w.appendChild(e);
    });
    if (sc.html && lv !== "compact") w.insertAdjacentHTML("beforeend", sc.html);
    const shine = document.createElement("i"); shine.className = "s3-shine"; w.appendChild(shine);
    const s = document.createElement("i"); s.className = "s3-scrim"; s.setAttribute("aria-hidden", "true");
    if (sc.scrim) { s.style.setProperty("--scrimL", String(sc.scrim[0])); s.style.setProperty("--scrimB", String(sc.scrim[1])); }
    el.append(w, s);
    if (lv === "compact") return;
    const cv = sc.canvas ? fxCanvas(w, "s3-cvb", shine) : null;
    track(el, { kind: "card", hero: !!o.hero, heavy: !!cv, canvas: cv, step: sc.canvas, layer: w });
}

/* =========================== MOTION: parallax, tilt, budget, canvases =========================== */
const ITEMS = new Set();
let raf = 0, lastT = 0, tilt = null, tiltOn = false, tiltAsked = false, RO = null;
const TKEY = "aap_tilt";
function track(el, o) {
    const it = Object.assign({ el, seed: Math.random() * 6.283, px: 0, py: 0, ptr: null, last: 0, seen: false, parts: [], emit: 0, t: 0, idle: true, w: 0, h: 0 }, o);
    el._s3 = it; ITEMS.add(it);
    if (it.canvas && typeof ResizeObserver !== "undefined") { RO = RO || new ResizeObserver(list => list.forEach(e => { const x = e.target._s3c; if (x) { x.w = e.contentRect.width; x.h = e.contentRect.height; } })); it.canvas._s3c = it; RO.observe(it.canvas); }
    kick(); return it;
}
function fxCanvas(host, cls, before) { const c = document.createElement("canvas"); c.className = "s3-cv " + cls; c.setAttribute("aria-hidden", "true"); if (before && before.parentNode === host) host.insertBefore(c, before); else host.appendChild(c); return c; }
function kick() { if (!raf && ITEMS.size && typeof requestAnimationFrame !== "undefined") raf = requestAnimationFrame(loop); }
if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });
    /* the pointer (PC hover, or a finger dragging on touch) moves the layers of the card under it */
    document.addEventListener("pointermove", e => {
        if (e.pointerType !== "mouse" && !e.buttons) return;
        const c = e.target && e.target.closest && e.target.closest(".s3card"); if (!c || !c._s3) return;
        const r = c.getBoundingClientRect(); c._s3.ptr = { x: ((e.clientX - r.left) / r.width - .5) * 2, y: ((e.clientY - r.top) / r.height - .5) * 2, t: performance.now() };
    }, { passive: true });
    try { if (localStorage.getItem(TKEY) === "granted" && typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission !== "function") listenTilt(); } catch (e) {}
}
function listenTilt() { if (tiltOn) return; tiltOn = true; addEventListener("deviceorientation", e => { if (e.gamma == null) return; const k = SKINS3.tiltDeg; tilt = { x: Math.max(-1, Math.min(1, e.gamma / k)), y: Math.max(-1, Math.min(1, (e.beta - 45) / k)) }; }); }
/* ask for the device tilt ONLY when a Season 3 skin is previewed or equipped (iOS needs a tap for this); denied or
   unavailable = the slow idle drift */
export async function requestTilt() {
    if (tiltOn || tiltAsked || typeof window === "undefined" || typeof DeviceOrientationEvent === "undefined") return tiltOn;
    if (!(window.matchMedia && matchMedia("(pointer: coarse)").matches)) return false;
    tiltAsked = true;
    try { if (typeof DeviceOrientationEvent.requestPermission === "function") { const r = await DeviceOrientationEvent.requestPermission(); if (r !== "granted") { localStorage.setItem(TKEY, "denied"); return false; } } } catch (e) { return false; }
    try { localStorage.setItem(TKEY, "granted"); } catch (e) {}
    listenTilt(); return true;
}
const off = it => it.el.classList.contains("fx-off") || !!(it.el.parentElement && it.el.parentElement.closest(".fx-off"));
function loop(now) {
    raf = 0; if (document.hidden || !ITEMS.size) return;
    raf = requestAnimationFrame(loop);
    if (now - lastT < 1000 / SKINS3.heroFps - 1.5) return;
    lastT = now;
    const on = motionOK(), live = [];
    ITEMS.forEach(it => { if (!it.el.isConnected) { if (it.seen) { ITEMS.delete(it); if (RO && it.canvas) RO.unobserve(it.canvas); } return; } it.seen = true; if (on && !off(it)) live.push(it); else rest(it); });
    const heavy = new Set(live.filter(it => it.heavy).sort((a, b) => (b.hero - a.hero)).slice(0, SKINS3.maxHeavy));
    live.forEach(it => {
        const en = it.el._s3enter;
        if (en === true) it.el._s3enter = now; else if (en && now - en > SKINS3.enterMs) { it.el.classList.remove("s3-in"); it.el._s3enter = 0; }
        const fps = it.hero ? SKINS3.heroFps : SKINS3.crowdFps;
        if (now - it.last < 1000 / fps - 1.5) return;
        const dt = Math.min(.12, it.last ? (now - it.last) / 1000 : .033); it.last = now; it.t += dt;
        if (it.kind === "card") {
            let tx, ty;
            if (it.ptr && now - it.ptr.t < 900) { tx = it.ptr.x; ty = it.ptr.y; }
            else if (tilt && it.hero) { tx = tilt.x; ty = tilt.y; }
            else { const w = it.t * SKINS3.idleDrift * 6.283 + it.seed; tx = Math.sin(w) * .45; ty = Math.cos(w * .8) * .35; }
            const k = Math.min(1, dt * 5); it.px += (tx - it.px) * k; it.py += (ty - it.py) * k;
            const L = it.layer || it.el; L.style.setProperty("--px", it.px.toFixed(3)); L.style.setProperty("--py", it.py.toFixed(3));
        }
        const run = heavy.has(it);
        if (it.svg && it.svg.pauseAnimations) { if (run && it.svgPaused !== false) { it.svg.unpauseAnimations(); it.svgPaused = false; } else if (!run && it.svgPaused !== true) { it.svg.pauseAnimations(); it.svgPaused = true; } }
        if (it.canvas && run) draw(it, dt);
    });
}
function rest(it) {
    if (it.svg && it.svg.pauseAnimations && it.svgPaused !== true) { it.svg.pauseAnimations(); it.svgPaused = true; }
    if (it.canvas && !it.idle && it.g) { it.g.clearRect(0, 0, it.canvas.width, it.canvas.height); it.parts.length = 0; it.idle = true; }
}
const SPR = {};
function sprite(name, cols) { if (SPR[name]) return SPR[name]; const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); cols.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (SPR[name] = c); }
const SP = () => ({
    hot: sprite("s3hot", [[0, "rgba(255,252,230,1)"], [.35, "rgba(255,214,110,.75)"], [1, "rgba(255,150,30,0)"]]),
    fire: sprite("s3fire", [[0, "rgba(255,190,70,.95)"], [.4, "rgba(255,110,20,.55)"], [1, "rgba(255,60,0,0)"]]),
    red: sprite("s3red", [[0, "rgba(255,80,20,.8)"], [.45, "rgba(190,24,0,.35)"], [1, "rgba(120,10,0,0)"]]),
    ember: sprite("s3ember", [[0, "rgba(255,246,200,1)"], [.3, "rgba(255,190,80,.9)"], [1, "rgba(255,120,20,0)"]])
});
const rr = (a, b) => a + Math.random() * (b - a);
function draw(it, dt) {
    const dpr = Math.min(1.5, globalThis.devicePixelRatio || 1), w = it.w || it.canvas.clientWidth, h = it.h || it.canvas.clientHeight; if (!w || !h) return;
    const W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (it.canvas.width !== W || it.canvas.height !== H || !it.g) { it.canvas.width = W; it.canvas.height = H; it.g = it.canvas.getContext("2d"); it.parts.length = 0; }
    it.idle = false; STEPS[it.step](it, dt, W, H);
}
const STEPS = {
    /* fire streaming off the phoenix's wing edges and tail, embers drifting up (canvas = 160 x 160 frame units) */
    phoenix(it, dt, W, H) {
        const g = it.g, u = W / 160, S = SP(), Pp = it.parts, ox = 30 * u, oy = 30 * u;
        it.emit += dt * 46;
        while (it.emit >= 1) {
            it.emit--; if (Pp.length > 80) break;
            const side = Math.random() < .5 ? -1 : 1, a = rr(165, 245) * Math.PI / 180, L = rr(26, 37), r = Math.random();
            let x, y;
            if (r < .78) { x = side < 0 ? 25 + Math.cos(a) * L : 75 - Math.cos(a) * L; y = 34 + Math.sin(a) * L; }
            else { const ta = rr(68, 112) * Math.PI / 180, tl = rr(28, 38); x = 50 + Math.cos(ta) * tl; y = 79 + Math.sin(ta) * tl; }
            if (Math.random() < .08) Pp.push({ e: 1, x: ox + x * u, y: oy + y * u, vx: rr(-5, 5) * u, vy: -rr(12, 22) * u, s: rr(.7, 1.3) * u, life: rr(1.2, 2), t: 0, ph: rr(0, 6) });
            else Pp.push({ x: ox + x * u, y: oy + y * u, vx: rr(-3, 3) * u, vy: -rr(10, 22) * u, s: rr(3, 5.5) * u, life: rr(.35, .7), t: 0 });
        }
        g.clearRect(0, 0, W, H); g.globalCompositeOperation = "lighter";
        for (let i = Pp.length - 1; i >= 0; i--) {
            const p = Pp[i]; p.t += dt; if (p.t >= p.life) { Pp.splice(i, 1); continue; }
            const k = p.t / p.life; p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.e) { p.x += Math.sin(it.t * 3 + p.ph) * 5 * u * dt; g.globalAlpha = Math.min(1, (1 - k) * 1.4); const s = p.s * 2.4; g.drawImage(S.ember, p.x - s, p.y - s, s * 2, s * 2); continue; }
            const spr = k < .3 ? S.hot : k < .62 ? S.fire : S.red, s = p.s * (1 - k * .5);
            g.globalAlpha = Math.pow(1 - k, 1.1) * .8; g.drawImage(spr, p.x - s, p.y - s, s * 2, s * 2);
        }
        g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    },
    /* embers and sparks rising off the lava field, a few flame licks on the molten rivers */
    lava(it, dt, W, H) {
        const g = it.g, S = SP(), Pp = it.parts;
        it.emit += dt * Math.min(70, 34 * W / 420);
        while (it.emit >= 1) {
            it.emit--; if (Pp.length > 120) break;
            if (Math.random() < .3) { const x = [.42, .66, .25][Math.floor(Math.random() * 3)] * W + rr(-.05, .05) * W; Pp.push({ x, y: H * rr(.74, .84), vx: rr(-.01, .01) * W, vy: -rr(.08, .16) * H, s: rr(.03, .055) * H, life: rr(.45, .8), t: 0 }); }
            else Pp.push({ e: 1, x: rr(0, W), y: H * rr(.7, 1.02), vx: rr(-.02, .02) * W, vy: -rr(.12, .26) * H, s: rr(.004, .009) * H, life: rr(1.8, 3.2), t: 0, ph: rr(0, 6) });
        }
        g.clearRect(0, 0, W, H); g.globalCompositeOperation = "lighter";
        for (let i = Pp.length - 1; i >= 0; i--) {
            const p = Pp[i]; p.t += dt; if (p.t >= p.life) { Pp.splice(i, 1); continue; }
            const k = p.t / p.life; p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.e) { p.x += Math.sin(it.t * 2 + p.ph) * .03 * W * dt; g.globalAlpha = Math.min(1, (1 - k) * 1.5); const s = p.s * 2.6; g.drawImage(S.ember, p.x - s, p.y - s, s * 2, s * 2); continue; }
            const spr = k < .3 ? S.hot : k < .6 ? S.fire : S.red, s = p.s * (1 - k * .55);
            g.globalAlpha = Math.pow(1 - k, 1.2) * .6; g.drawImage(spr, p.x - s, p.y - s, s * 2, s * 2);
        }
        g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    }
};
export const _s3Test = { FRAME3, BG3, ITEMS, state: () => ({ tiltOn, tilt }) };
