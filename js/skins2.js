/* =====================================================================
   SEASON 2 SKINS · frames and backgrounds (styles: css/skins2.css)
   FRAME (.ava.s2.sf-<tier>2): the picture keeps SKINS2.picture of the avatar box; the frame is an SVG drawn around it
     (.s2f) that may reach about 12% past the box (flame tips 16%), like the Season 1 sparkles did, so nothing needs
     more room than before and nothing clips. Everything sits BEHIND the picture: the picture is never covered.
     Avatars of SKINS2.compactBelow px or fewer (race-track tokens, chips, lists) get a simplified, still COMPACT
     frame (.s2-cmp) that stays inside ~10% past the box. Flame and Water add a canvas layer (flames + embers,
     droplets + splashes) from SKINS2.canvasFrom px; smaller ones keep the SVG flames / water.
   BACKGROUND (.sbg.sbg2[data-bg=<tier>2]): layered realistic materials over the whole player card (.s2bg: base +
     .s2-l1..l4 texture / light layers + .s2-shine that follows the pointer where the card tilts) and a scrim
     (.s2-scrim) that keeps the name, title, level and XP bar readable. No diagonal stripes. Flame adds a canvas fire.
   Textures are small SVG filters (turbulence, lighting) rasterized once by the browser and moved with transforms only.
   Performance: CSS transforms / opacity for the idle animations; one shared canvas loop capped at SKINS2.fps that
   skips anything off-screen (.fx-off from profile.js fxWatch), hidden, or under Reduced effects; static under
   Reduced effects / reduced motion (body.fx-lite), where the canvases are hidden and the SVG keeps a still pose.
   ===================================================================== */
import { SKINS2 } from "./vault/config.js?v=21";
import { motionOK } from "./fx.js";

export const S2_BASES = SKINS2.tiers.map(t => t.id);
/* "iron2" -> "iron"; anything else (Season 1, unknown) -> "" */
export const s2Base = key => { const m = /^([a-z]+)2$/.exec(String(key || "")); return m && S2_BASES.includes(m[1]) ? m[1] : ""; };

/* ---------- SVG helpers. Frame box 0..100, picture centre (50, 50). Angles: degrees clockwise from the top. ---------- */
const n2 = v => Math.round(v * 100) / 100;
const XY = (r, d) => { const a = d * Math.PI / 180; return [n2(50 + r * Math.sin(a)), n2(50 - r * Math.cos(a))]; };
const P = (r, d) => XY(r, d).join(" ");
const sector = (ri, ro, a1, a2) => `M${P(ro, a1)}A${ro} ${ro} 0 0 1 ${P(ro, a2)}L${P(ri, a2)}A${ri} ${ri} 0 0 0 ${P(ri, a1)}Z`;
const arc = (r, a1, a2) => `M${P(r, a1)}A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${P(r, a2)}`;
const ring = (r, w, paint, extra = "") => `<circle cx='50' cy='50' r='${r}' fill='none' stroke='${paint}' stroke-width='${w}' ${extra}/>`;
const annulus = (ri, ro) => `M50 ${50 - ro}a${ro} ${ro} 0 1 1 0 ${2 * ro}a${ro} ${ro} 0 1 1 0 ${-2 * ro}ZM50 ${50 - ri}a${ri} ${ri} 0 1 1 0 ${2 * ri}a${ri} ${ri} 0 1 1 0 ${-2 * ri}Z`;
const at = (r, d) => `translate(${P(r, d)}) rotate(${n2(d)})`;           // a local frame on the ring: local "up" points outward
const stops = list => list.map(([o, c, op]) => `<stop offset='${o}' stop-color='${c}'${op != null ? ` stop-opacity='${op}'` : ""}/>`).join("");
const lg = (id, list, a = "x1='0' y1='0' x2='1' y2='1'") => `<linearGradient id='${id}' ${a}>${stops(list)}</linearGradient>`;
const rg = (id, list, a = "") => `<radialGradient id='${id}' ${a}>${stops(list)}</radialGradient>`;
const shadow = (u, r = 56) => `<defs>${rg("sd" + u, [[0.6, "#000", 0.55], [1, "#000", 0]])}</defs><circle cx='50' cy='52' r='${r}' fill='url(#sd${u})'/>`;
const star4 = (s = 5, k = 0.2) => `M0 ${-s}L${n2(s * k)} ${n2(-s * k)}L${s} 0L${n2(s * k)} ${n2(s * k)}L0 ${s}L${n2(-s * k)} ${n2(s * k)}L${-s} 0L${n2(-s * k)} ${n2(-s * k)}Z`;
const starN = (n, ro, ri) => { let d = ""; for (let i = 0; i < n * 2; i++) { const [x, y] = XY(i % 2 ? ri : ro, i * 180 / n); d += (i ? "L" : "M") + (x - 50) + " " + (y - 50); } return d + "Z"; };
const wavy = (r, amp, k, steps = 144) => { let d = ""; for (let i = 0; i <= steps; i++) { const a = i / steps * 360, rr = r + amp * Math.sin(a * Math.PI / 180 * k); d += (i ? "L" : "M") + P(rr, a); } return d + "Z"; };
const bolt = (x, y, r, u) => `<circle cx='${n2(x)}' cy='${n2(y)}' r='${r}' fill='url(#bo${u})' stroke='#121417' stroke-width='.4'/><path d='M${n2(x - r * .5)} ${n2(y + r * .15)}L${n2(x + r * .5)} ${n2(y - r * .15)}' stroke='#2a2e33' stroke-width='.45'/>`;
const glint = (u, ri, ro, ang = 28, cls = "s2-glint") => `<clipPath id='c${u}'><path d='${annulus(ri, ro)}' clip-rule='evenodd'/></clipPath><g clip-path='url(#c${u})'><g transform='rotate(${ang} 50 50)'><rect class='${cls}' x='-44' y='-40' width='15' height='180' fill='url(#gl${u})'/></g></g>`;
const glintGrad = u => lg("gl" + u, [[0, "#fff", 0], [0.5, "#fff", 0.85], [1, "#fff", 0]], "x1='0' y1='0' x2='1' y2='0'");
const delay = s => `style='animation-delay:${n2(s)}s'`;
/* a deterministic random for the decorations (same look on every screen) */
const rnd = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

/* =========================== FULL FRAMES =========================== */
const FULL = {
    /* IRON: bolted armour plates, four chamfered pauldrons, rust bloom, a glint running over the plates */
    iron(u) {
        let plates = "", bevel = "", bolts = "";
        for (let i = 0; i < 8; i++) {
            const a1 = i * 45 + 1.8, a2 = (i + 1) * 45 - 1.8;
            plates += sector(35.6, 47, a1, a2);
            bevel += `<path d='${arc(46.2, a1 + 1.5, a2 - 1.5)}'/>`;
            const [x, y] = XY(41.3, i * 45 + 22.5); bolts += bolt(x, y, 2, u);
        }
        let paul = "";
        [45, 135, 225, 315].forEach(a => {
            paul += `<path d='M${P(42, a - 17)}L${P(58.5, a - 11)}L${P(61.5, a)}L${P(58.5, a + 11)}L${P(42, a + 17)}Z' fill='url(#st${u})' stroke='#101215' stroke-width='.8'/>`
                + `<path d='M${P(47, a)}L${P(60.4, a)}' stroke='rgba(255,255,255,.45)' stroke-width='.7'/><path d='M${P(47, a + 1.6)}L${P(60, a + 1)}' stroke='rgba(0,0,0,.5)' stroke-width='.7'/>`;
            [-7.5, 7.5].forEach(o => { const [x, y] = XY(53.5, a + o); paul += bolt(x, y, 1.6, u); });
        });
        const rust = [[20, 44, 3.4, 2], [118, 43.5, 2.6, 1.6], [203, 44.5, 3.8, 2.2], [288, 44, 2.4, 1.5], [140, 55, 2.6, 1.8], [318, 52, 2, 1.4]]
            .map(([a, r, rx, ry]) => { const [x, y] = XY(r, a); return `<ellipse cx='${x}' cy='${y}' rx='${rx}' ry='${ry}' transform='rotate(${a} ${x} ${y})' fill='url(#ru${u})'/>`; }).join("");
        return shadow(u, 60) + `<defs>${lg("st" + u, [[0, "#aab2bb"], [0.32, "#4a5159"], [0.55, "#808891"], [0.8, "#2f343a"], [1, "#5d656e"]])}${rg("bo" + u, [[0, "#f3f5f7"], [0.45, "#8f969e"], [1, "#2a2e33"]], "cx='.35' cy='.3' r='.8'")}${rg("ru" + u, [[0, "#9a4a17", 0.9], [0.6, "#6e300c", 0.55], [1, "#4a2008", 0]])}${glintGrad(u)}</defs>`
            + `<g class='s2-breathe'>${paul}</g>`
            + `<path d='${plates}' fill='url(#st${u})' stroke='#0e1012' stroke-width='.8'/>`
            + `<g fill='none' stroke='rgba(255,255,255,.42)' stroke-width='.7'>${bevel}</g>${ring(36.3, 0.9, "rgba(0,0,0,.6)")}`
            + rust + bolts + glint(u, 35.6, 47);
    },
    /* BRONZE: an ancient relic ring: engraved bronze, verdigris, two laurel branches that sway, a medallion and a ribbon */
    bronze(u) {
        const leaves = side => {
            let s = "";
            for (let i = 0; i < 10; i++) {
                const a = 194 + i * 13.6, out = i % 2 ? 1 : -1, r = 48.5 + out * 2.4;
                const [x, y] = XY(r, a), tilt = a + 90 + (out > 0 ? 28 : -28) + (side ? 0 : 0);
                const L = 10.5 - i * 0.35, W = 3.9 - i * 0.12;
                s += `<g transform='translate(${x} ${y}) rotate(${n2(tilt - 90)})'><path d='M0 0Q${n2(L / 2)} ${-W} ${n2(L)} 0Q${n2(L / 2)} ${W} 0 0Z' fill='url(#lf${u})' stroke='#5a3210' stroke-width='.35'/><path d='M.6 0L${n2(L - 1)} 0' stroke='#6b3c14' stroke-width='.3'/></g>`;
            }
            return s;
        };
        const branch = `<path d='${arc(48.5, 188, 326)}' fill='none' stroke='#6b3c14' stroke-width='1.2'/>` + leaves(0);
        const pat = [[28, 1.9], [97, 2.5], [158, 1.6], [252, 2.3], [333, 1.8], [205, 1.4]].map(([a, r]) => { const [x, y] = XY(40.2, a); return `<circle cx='${x}' cy='${y}' r='${r}' fill='#4bb59c' opacity='.55'/>`; }).join("");
        const [mx, my] = XY(46.5, 0);
        return shadow(u) + `<defs>${lg("br" + u, [[0, "#f8cf95"], [0.28, "#b06a2c"], [0.52, "#e7a865"], [0.78, "#6b3a12"], [1, "#c98a4b"]])}${lg("lf" + u, [[0, "#ffe0a3"], [0.55, "#c48443"], [1, "#7a4416"]], "x1='0' y1='0' x2='1' y2='0'")}${rg("md" + u, [[0, "#ffe6bd"], [0.5, "#c07d3c"], [1, "#5a3010"]], "cx='.4' cy='.35' r='.75'")}</defs>`
            + `<g transform='translate(50 98)'><g class='s2-sway'><g transform='translate(-50 -98)'>${branch}</g></g></g>`
            + `<g transform='translate(50 98) scale(-1 1)'><g class='s2-sway s2-d1'><g transform='translate(-50 -98)'>${branch}</g></g></g>`
            + ring(39.6, 8.2, `url(#br${u})`) + ring(39.6, 0.9, "rgba(60,25,5,.6)", "stroke-dasharray='1.1 2.2'") + ring(35.7, 0.9, "#3d2008") + ring(43.6, 0.6, "#ffdcaa", "opacity='.55'") + pat
            + `<g transform='translate(50 97)'><path d='M0 0L-7 -3L-6.2 3.4ZM0 0L7 -3L6.2 3.4Z' fill='#8c2a1f' stroke='#4a120c' stroke-width='.4'/><path d='M-1.6 1.2L-4.6 8.6L-2.6 7.6L-1.4 9.8L0 1.6ZM1.6 1.2L4.6 8.6L2.6 7.6L1.4 9.8L0 1.6Z' fill='#a8352a' stroke='#4a120c' stroke-width='.35'/><circle r='1.9' fill='url(#md${u})' stroke='#4a2a0c' stroke-width='.4'/></g>`
            + `<g transform='translate(${mx} ${my})'><circle r='7.6' fill='url(#md${u})' stroke='#4a2a0c' stroke-width='.8'/><circle r='5.4' fill='none' stroke='rgba(70,35,8,.75)' stroke-width='.5'/><path d='${starN(8, 4.1, 1.7)}' fill='#ffe2b0' opacity='.9'/><ellipse class='s2-pulse' cx='-2.4' cy='-3' rx='2.6' ry='1.4' fill='#fff' opacity='.5' transform='rotate(-30 -2.4 -3)'/></g>`;
    },
    /* SILVER: eight polished blades fanned behind a mirror-chrome ring; a light sweep runs across the steel */
    silver(u) {
        let L = "", R = "", outline = "";
        for (let i = 0; i < 8; i++) {
            const a = i * 45, Lm = i % 2 ? 55 : 64;
            L += `M${P(36, a)}L${P(42.5, a - 7.5)}L${P(Lm, a)}Z`; R += `M${P(36, a)}L${P(Lm, a)}L${P(42.5, a + 7.5)}Z`;
            outline += `M${P(36, a)}L${P(42.5, a - 7.5)}L${P(Lm, a)}L${P(42.5, a + 7.5)}Z`;
        }
        const studs = [...Array(8)].map((_, i) => { const [x, y] = XY(45, i * 45 + 22.5); return `<circle cx='${x}' cy='${y}' r='1.25' fill='#fff' stroke='#59616b' stroke-width='.3'/>`; }).join("");
        return shadow(u, 62) + `<defs>${rg("bl" + u, [[0.5, "#ffffff"], [0.75, "#d7dde4"], [1, "#98a2ae"]], "gradientUnits='userSpaceOnUse' cx='50' cy='50' r='64'")}${rg("bd" + u, [[0.5, "#9aa3ae"], [0.8, "#58616b"], [1, "#2c3238"]], "gradientUnits='userSpaceOnUse' cx='50' cy='50' r='64'")}`
            + `${lg("ch" + u, [[0, "#ffffff"], [0.2, "#aab3be"], [0.44, "#f6f8fa"], [0.5, "#4f5863"], [0.6, "#e3e8ee"], [0.84, "#8a939e"], [1, "#fbfcfd"]], "x1='0' y1='0' x2='0' y2='1'")}${glintGrad(u)}<clipPath id='cb${u}'><path d='${outline}'/></clipPath></defs>`
            + `<g transform='translate(50 50)'><g class='s2-rock'><g transform='translate(-50 -50)'><path d='${L}' fill='url(#bl${u})'/><path d='${R}' fill='url(#bd${u})'/><path d='${outline}' fill='none' stroke='#262b31' stroke-width='.5'/>`
            + `<g clip-path='url(#cb${u})'><g transform='rotate(-20 50 50)'><rect class='s2-glint s2-fast' x='-44' y='-40' width='18' height='180' fill='url(#gl${u})'/></g></g></g></g></g>`
            + ring(39.6, 8, `url(#ch${u})`) + ring(35.7, 1, "#272c32") + ring(43.6, 0.6, "#fff", "opacity='.75'") + studs + glint(u + "r", 35.6, 43.6, 60, "s2-glint s2-slow").replace(`url(#gl${u}r)`, `url(#gl${u})`);
    },
    /* GOLD: two feathered wings that beat slowly, a jewelled crown crest, a deep gold ring with filigree, star glints */
    gold(u) {
        const feather = (psi, Lf, w, fill, cls = "") => `<g transform='rotate(${psi})'><path class='${cls}' d='M0 0C${n2(Lf * .3)} ${-w} ${n2(Lf * .75)} ${n2(-w * .9)} ${Lf} 0C${n2(Lf * .75)} ${n2(w * .55)} ${n2(Lf * .3)} ${n2(w * .7)} 0 0Z' fill='${fill}' stroke='#5c3c06' stroke-width='.45'/><path d='M1 0L${n2(Lf - 1.5)} 0' stroke='rgba(92,60,6,.6)' stroke-width='.35'/></g>`;
        let wing = "";
        [[165, 20], [182, 23], [199, 25], [216, 26], [233, 25], [250, 22]].forEach(([p, l]) => { wing += feather(p, l, 3.3, `url(#fp${u})`); });
        [[172, 12], [196, 14], [221, 14], [246, 12]].forEach(([p, l]) => { wing += feather(p, l, 3.8, `url(#fc${u})`); });
        const W = `<g transform='translate(9 51)'><g class='s2-flap'>${wing}</g></g>`;
        let crown = `<path d='${sector(42.5, 48.2, -27, 27)}' fill='url(#gd${u})' stroke='#5c3c06' stroke-width='.6'/>`;
        [[-20, 54], [-10, 58], [0, 62], [10, 58], [20, 54]].forEach(([a, r]) => { crown += `<path d='M${P(47.6, a - 4.2)}L${P(r, a)}L${P(47.6, a + 4.2)}Z' fill='url(#gd${u})' stroke='#5c3c06' stroke-width='.5'/>`; const [x, y] = XY(r + 1.2, a); crown += `<circle cx='${x}' cy='${y}' r='1.5' fill='#fff8e6' stroke='#a07a2a' stroke-width='.3'/>`; });
        const [rx, ry] = XY(45.4, 0); crown += `<circle cx='${rx}' cy='${ry}' r='2.3' fill='url(#rb${u})' stroke='#5c1010' stroke-width='.35'/>`;
        [-15, 15].forEach(a => { const [x, y] = XY(45.4, a); crown += `<circle cx='${x}' cy='${y}' r='1.5' fill='url(#sp${u})' stroke='#10225c' stroke-width='.3'/>`; });
        const gl = [[63.5, 0, 0], [60, 247, .7], [60, 113, 1.4], [46, 140, 2.1]].map(([r, a, d]) => { const [x, y] = XY(r, a); return `<g transform='translate(${x} ${y})'><path class='s2-twinkle' ${delay(-d)} d='${star4(4.6, .16)}' fill='#fffbe6'/></g>`; }).join("");
        return shadow(u, 60) + `<defs>${lg("gd" + u, [[0, "#fff4b8"], [0.25, "#ecbd4c"], [0.5, "#8a5a10"], [0.72, "#ffe48a"], [1, "#b8860b"]])}${rg("fp" + u, [[0, "#fff1b0"], [0.55, "#d9a441"], [1, "#7a4c08"]], "gradientUnits='userSpaceOnUse' cx='0' cy='0' r='27'")}${rg("fc" + u, [[0, "#fffbe0"], [0.6, "#f0c860"], [1, "#a8741a"]], "gradientUnits='userSpaceOnUse' cx='0' cy='0' r='15'")}`
            + `${rg("rb" + u, [[0, "#ffb3b3"], [0.5, "#d0141e"], [1, "#5c0008"]], "cx='.35' cy='.3' r='.8'")}${rg("sp" + u, [[0, "#b8d4ff"], [0.5, "#2457d6"], [1, "#0a1d5c"]], "cx='.35' cy='.3' r='.8'")}</defs>`
            + W + `<g transform='translate(100 0) scale(-1 1)'>${W.replace("s2-flap", "s2-flap s2-d1")}</g>`
            + ring(39.6, 8.2, `url(#gd${u})`) + ring(39.6, 0.55, "rgba(92,60,6,.6)", "stroke-dasharray='3 1.2 .6 1.2'") + ring(35.7, 0.9, "#4a3004") + ring(43.7, 0.6, "#fff4c4", "opacity='.7'") + crown + gl;
    },
    /* PLATINUM: a glowing halo floating over the head, a halo glow behind, satin ring with cabochons, slow orbit dashes */
    platinum(u) {
        const studs = [45, 135, 225, 315].map(a => { const [x, y] = XY(39.6, a); return `<circle cx='${x}' cy='${y}' r='2.3' fill='url(#cb${u})' stroke='#5f7485' stroke-width='.35'/>`; }).join("");
        return `<defs>${lg("pt" + u, [[0, "#fbfdff"], [0.3, "#b7c5d2"], [0.55, "#eef5fb"], [0.8, "#8a9cad"], [1, "#f4f9fd"]])}${rg("hg" + u, [[0.5, "#cfe9ff", 0], [0.7, "#cfe9ff", 0.55], [0.84, "#a6d2ff", 0.2], [1, "#a6d2ff", 0]], "gradientUnits='userSpaceOnUse' cx='50' cy='50' r='64'")}${rg("cb" + u, [[0, "#ffffff"], [0.45, "#cfe8ff"], [1, "#5d7fa0"]], "cx='.35' cy='.3' r='.8'")}</defs>`
            + `<circle class='s2-pulse' cx='50' cy='50' r='64' fill='url(#hg${u})'/>`
            + `<g transform='translate(50 50)'><circle class='s2-spin s2-vslow' r='53' fill='none' stroke='rgba(225,242,255,.6)' stroke-width='.7' stroke-dasharray='.7 3.2'/><circle class='s2-spin s2-vslow s2-rev' r='57.5' fill='none' stroke='rgba(205,232,255,.35)' stroke-width='.5' stroke-dasharray='7 11'/></g>`
            + ring(39.6, 7.6, `url(#pt${u})`) + ring(41.4, 1.8, "#fff", "opacity='.22'") + ring(35.7, 0.9, "#4c5e6e") + ring(43.4, 0.6, "#fff", "opacity='.8'") + studs
            + `<g transform='translate(50 -3)'><g class='s2-bob'><ellipse rx='24' ry='5.6' fill='none' stroke='rgba(190,228,255,.45)' stroke-width='6'/><ellipse rx='24' ry='5.6' fill='none' stroke='url(#pt${u})' stroke-width='2.6'/><ellipse rx='24' ry='5.6' fill='none' stroke='#fff' stroke-width='.6' opacity='.9'/></g></g>`;
    },
    /* EMERALD: hexagonal crystals growing out of the ring in clusters, an emerald-cut gem band, edges that catch the light */
    emerald(u) {
        const cr = (base, dir, Lc, Wc, d) => { const [x, y] = XY(41, base), w = Wc / 2;
            return `<g transform='translate(${x} ${y}) rotate(${dir})'><g class='s2-grow' ${delay(-d)}><path d='M${-w} 0L${-w} ${n2(-Lc * .72)}L0 ${-Lc}L0 ${n2(-Lc * .05)}Z' fill='url(#el${u})'/><path d='M${w} 0L${w} ${n2(-Lc * .72)}L0 ${-Lc}L0 ${n2(-Lc * .05)}Z' fill='url(#ed${u})'/>`
                + `<path d='M${-w} 0L${-w} ${n2(-Lc * .72)}L0 ${-Lc}L${w} ${n2(-Lc * .72)}L${w} 0' fill='none' stroke='#033a20' stroke-width='.45'/><path class='s2-shine' ${delay(-d * 1.7)} d='M${-w} ${n2(-Lc * .72)}L0 ${-Lc}' stroke='#e6fff3' stroke-width='.7'/></g></g>`; };
        const crystals = [[218, 210, 24, 7, 0], [229, 233, 19, 6, .6], [209, 191, 15, 5, 1.1], [238, 254, 12, 4.4, 1.7], [40, 35, 21, 6.5, .3], [51, 59, 15, 5, .9], [31, 15, 12, 4.4, 1.4], [131, 136, 10, 4, 2], [321, 318, 9, 3.6, 2.4], [176, 180, 8, 3.4, .8]].map(c => cr(...c)).join("");
        const gems = [...Array(12)].map((_, i) => `<g transform='${at(39.6, i * 30 + 15)}'><rect x='-2.4' y='-1.7' width='4.8' height='3.4' rx='.4' fill='${i % 2 ? "#1fb56c" : "#3fe39a"}' stroke='#023a1e' stroke-width='.35'/><rect x='-1.2' y='-.8' width='2.4' height='1.6' fill='none' stroke='rgba(220,255,236,.7)' stroke-width='.3'/></g>`).join("");
        return shadow(u) + `<defs>${lg("el" + u, [[0, "#b2ffdc"], [0.55, "#3ddc8f"], [1, "#16a463"]], "x1='0' y1='0' x2='1' y2='1'")}${lg("ed" + u, [[0, "#139057"], [1, "#03401f"]], "x1='0' y1='0' x2='1' y2='1'")}${lg("er" + u, [[0, "#0d7a45"], [0.5, "#03361c"], [1, "#0b6b3c"]])}</defs>`
            + crystals + ring(39.6, 7.4, `url(#er${u})`) + gems + ring(35.9, 1.1, "#5dffb0", "opacity='.6'") + ring(43.4, 0.6, "#9dffcf", "opacity='.6'");
    },
    /* DIAMOND: a halo of brilliant-cut stones, a big faceted diamond on top, a teardrop below, sparkle bursts */
    diamond(u) {
        const gems = [...Array(16)].map((_, i) => `<g transform='${at(41.6, i * 22.5 + 11.25)}'><circle r='3.7' fill='url(#gm${u})' stroke='#2a7fb5' stroke-width='.35'/><path d='${starN(8, 3.4, 1.7)}' fill='none' stroke='rgba(255,255,255,.6)' stroke-width='.3'/><path d='${starN(4, 1.8, 1.25)}' fill='rgba(255,255,255,.55)'/><circle class='s2-flick' ${delay(-(i * 0.37) % 2.6)} cx='-1.2' cy='-1.3' r='.85' fill='#fff'/></g>`).join("");
        const big = `<g transform='translate(50 -2.5)'><path d='M-9.5 -2L-5 -6.5L5 -6.5L9.5 -2L0 11Z' fill='#8fdcff' stroke='#2a7fb5' stroke-width='.55'/><path d='M-9.5 -2L-5 -6.5L-3 -2Z' fill='#d6f5ff'/><path d='M-5 -6.5L5 -6.5L3 -2L-3 -2Z' fill='#f2fcff'/><path d='M5 -6.5L9.5 -2L3 -2Z' fill='#bdeeff'/>`
            + `<path d='M-9.5 -2L-3 -2L0 11Z' fill='#6cc6f0'/><path d='M-3 -2L3 -2L0 11Z' fill='#a8e6ff'/><path d='M3 -2L9.5 -2L0 11Z' fill='#4aa8dd'/><path d='M-9.5 -2L9.5 -2' stroke='#fff' stroke-width='.4' opacity='.8'/><path class='s2-flick' d='M-3 -5.3L1.5 -5.3L.6 -3.2L-2.2 -3.2Z' fill='#fff'/></g>`;
        const drop = `<g transform='translate(50 97.5)'><path d='M0 -6.5C2.8 -2.5 4.4 .2 4.4 2.4A4.4 4.4 0 0 1 -4.4 2.4C-4.4 .2 -2.8 -2.5 0 -6.5Z' fill='url(#gm${u})' stroke='#2a7fb5' stroke-width='.45'/><path d='M0 -6.5L0 6.8M-4.2 2L4.2 2M0 -6.5L-3.2 1M0 -6.5L3.2 1' stroke='rgba(255,255,255,.5)' stroke-width='.3'/></g>`;
        const bursts = [[56, 62, 0], [58, 148, .65], [54, 238, 1.3], [59, 305, 1.95]].map(([r, a, d]) => { const [x, y] = XY(r, a); return `<g transform='translate(${x} ${y})'><g class='s2-burst' ${delay(-d)}><path d='${star4(7.5, .12)}' fill='#fff'/><path d='${star4(3.6, .2)}' fill='#c8f1ff' transform='rotate(45)'/></g></g>`; }).join("");
        return `<defs>${rg("gm" + u, [[0, "#ffffff"], [0.35, "#d7f6ff"], [0.72, "#6cc6f0"], [1, "#2a7fb5"]], "cx='.35' cy='.3' r='.85'")}${rg("ig" + u, [[0.55, "#a8e2ff", 0], [0.75, "#a8e2ff", 0.4], [1, "#a8e2ff", 0]], "gradientUnits='userSpaceOnUse' cx='50' cy='50' r='60'")}</defs>`
            + `<circle class='s2-pulse' cx='50' cy='50' r='60' fill='url(#ig${u})'/>` + ring(41.6, 9.4, "#cfefff", "opacity='.22'") + ring(36.4, 0.8, "#fff", "opacity='.85'") + ring(46.7, 0.8, "#2b7aa6")
            + gems + big + drop + bursts;
    },
    /* FLAME: tongues of fire licking up and around (three layers each), a charred ring with glowing cracks.
       The canvas adds rising flames and embers on large avatars. */
    flame(u) {
        let tongues = "";
        const R0 = rnd(77);
        for (let a = -160; a <= 160; a += 20) {
            const up = (1 + Math.cos(a * Math.PI / 180)) / 2, L = n2(6 + 19 * Math.pow(up, 1.25) + R0() * 3), w = n2(3.6 + L * 0.07);
            const dir = n2(a * 0.55), [x, y] = XY(41.5, a), flip = R0() > 0.5 ? -1 : 1, d = n2(0.65 + R0() * 0.6);
            const shape = `M${-w} 0C${-w} ${n2(-L * .45)} ${n2(-w * .2)} ${n2(-L * .55)} ${n2(w * .12)} ${-L}C${n2(w * .38)} ${n2(-L * .62)} ${w} ${n2(-L * .5)} ${w} 0Z`;
            tongues += `<g transform='translate(${x} ${y}) rotate(${dir}) scale(${flip} 1)'><g class='s2-lick' style='animation-duration:${d}s;animation-delay:${n2(-R0() * d)}s'><path d='${shape}' fill='url(#fo${u})'/><path d='${shape}' fill='url(#fm${u})' transform='scale(.7 .74)'/><path d='${shape}' fill='url(#fi${u})' transform='scale(.4 .44)'/></g></g>`;
        }
        const embers = [[57, -12, 1], [62, 20, .8], [55, 40, .7], [60, -38, .9]].map(([r, a, s], i) => { const [x, y] = XY(r, a); return `<circle class='s2-ember' ${delay(-i * .7)} cx='${x}' cy='${y}' r='${s}' fill='#ffd36a'/>`; }).join("");
        const fg = (id, a, b, c) => lg(id, [[0, a, 0.95], [0.55, b, 0.9], [1, c, 0]], "x1='0' y1='1' x2='0' y2='0'");
        return `<defs>${fg("fo" + u, "#ffae00", "#ff4a00", "#c41a00")}${fg("fm" + u, "#ffe066", "#ff8a00", "#ff4a00")}${fg("fi" + u, "#fffbe6", "#ffe58a", "#ffb000")}${rg("fb" + u, [[0.5, "#ff7a10", 0.55], [1, "#ff3a00", 0]], "gradientUnits='userSpaceOnUse' cx='50' cy='46' r='58'")}${lg("ch" + u, [[0, "#4a1104"], [0.5, "#150401"], [1, "#3a0d02"]])}</defs>`
            + `<circle class='s2-pulse' cx='50' cy='46' r='58' fill='url(#fb${u})'/>` + tongues
            + ring(39.6, 7.4, `url(#ch${u})`) + ring(39.6, 1, "#ff7a1a", "class='s2-glow' stroke-dasharray='5 3 2 6 3 4'") + ring(35.8, 0.9, "#ffb347") + ring(43.3, 0.6, "#ff9a3c", "opacity='.7'") + embers;
    },
    /* WATER: a flowing water ring (two counter-turning wave crests), splash crowns, flying droplets and drips.
       The canvas adds droplets streaming round the ring and splashes on large avatars. */
    water(u) {
        const splash = (a, d) => { let s = ""; [[-52, 8.5], [-26, 12], [0, 14], [26, 12], [52, 8.5]].forEach(([o, Ls]) => { s += `<g transform='rotate(${o})'><path d='M-1 0L0 ${-Ls}L1 0Z' fill='url(#wd${u})'/><circle cy='${n2(-Ls - 1)}' r='1.3' fill='url(#wd${u})'/></g>`; });
            const fly = [[-30, 20, 0], [8, 23, .5], [38, 19, 1]].map(([o, r, k]) => `<g transform='rotate(${o})'><g class='s2-fly' ${delay(-(d + k))}><path transform='translate(0 ${-r})' d='M0 -2.2C1 -.8 1.5 0 1.5 .7A1.5 1.5 0 0 1 -1.5 .7C-1.5 0 -1 -.8 0 -2.2Z' fill='url(#wd${u})'/></g></g>`).join("");
            return `<g transform='${at(44, a)}'>${s}${fly}</g>`; };
        const drips = [[94, 0], [262, 1.1]].map(([a, d]) => { const [x, y] = XY(45, a); return `<g transform='translate(${x} ${y})'><path class='s2-drip' ${delay(-d)} d='M0 -2.6C1.2 -1 1.8 0 1.8 .9A1.8 1.8 0 0 1 -1.8 .9C-1.8 0 -1.2 -1 0 -2.6Z' fill='url(#wd${u})'/></g>`; }).join("");
        return `<defs>${lg("wr" + u, [[0, "#c8f6ff"], [0.35, "#3ec6ff"], [0.7, "#0a4fb0"], [1, "#56d4ff"]])}${rg("wd" + u, [[0, "#ffffff"], [0.4, "#bdeeff"], [1, "#2b9be0"]], "cx='.35' cy='.3' r='.85'")}${rg("wg" + u, [[0.55, "#3ec6ff", 0.32], [1, "#3ec6ff", 0]], "gradientUnits='userSpaceOnUse' cx='50' cy='50' r='60'")}</defs>`
            + `<circle class='s2-pulse' cx='50' cy='50' r='60' fill='url(#wg${u})'/>` + ring(40.6, 9.6, `url(#wr${u})`)
            + `<g transform='translate(50 50)'><g class='s2-spin s2-slow'><path transform='translate(-50 -50)' d='${wavy(41.4, 1.9, 9)}' fill='none' stroke='rgba(255,255,255,.6)' stroke-width='1.2'/></g><g class='s2-spin s2-slow s2-rev'><path transform='translate(-50 -50)' d='${wavy(38.6, 1.2, 7)}' fill='none' stroke='rgba(200,244,255,.45)' stroke-width='.8'/></g></g>`
            + ring(35.8, 0.9, "#0a3f8c") + ring(45.4, 0.6, "#dff9ff", "opacity='.7'") + splash(128, 0) + splash(305, .8) + drips;
    },
    /* TRANSCENDENT: a radiant crown of rays, a slowly turning sunburst, three lights orbiting behind the head */
    transcendent(u) {
        let rays = "";
        for (let i = 0; i < 24; i++) { const a = i * 15, Lr = i % 2 ? 55 : 64; rays += `M${P(35.5, a - 2.4)}L${P(Lr, a)}L${P(35.5, a + 2.4)}Z`; }
        let crown = "";
        for (let a = -36; a <= 36; a += 12) { const Lc = n2(52 + 13 * (1 - Math.abs(a) / 42)); crown += `<path d='M${P(42.5, a - 3.6)}L${P(Lc, a)}L${P(42.5, a + 3.6)}Z' fill='url(#cg${u})' stroke='#c99a2e' stroke-width='.4'/>`; }
        const orb = (tilt, k, r, dur, rev, d) => `<g transform='translate(50 50) rotate(${tilt})'><ellipse rx='${r}' ry='${n2(r * k)}' fill='none' stroke='rgba(255,240,200,.28)' stroke-width='.45'/><g transform='scale(1 ${k})'><g class='s2-orbit${rev ? " s2-rev" : ""}' style='animation-duration:${dur}s;animation-delay:${-d}s'><g transform='translate(${r} 0)'><g class='s2-orbit${rev ? "" : " s2-rev"}' style='animation-duration:${dur}s;animation-delay:${-d}s'><g transform='scale(1 ${n2(1 / k)})'><circle r='4.6' fill='url(#ob${u})'/><circle r='1.4' fill='#fff'/></g></g></g></g></g></g>`;
        const [sx, sy] = XY(66.5, 0);
        return `<defs>${rg("ry" + u, [[0, "#fffbe8"], [0.5, "#ffe9a8", 0.9], [0.78, "#ffd27a", 0.35], [1, "#ffd27a", 0]], "gradientUnits='userSpaceOnUse' cx='50' cy='50' r='66'")}${lg("cg" + u, [[0, "#fffdf2"], [1, "#ffc94a"]], "x1='0' y1='0' x2='0' y2='1'")}${rg("ob" + u, [[0, "#ffffff"], [0.35, "#fff4c8", 0.9], [1, "#ffe08a", 0]])}${lg("tg" + u, [[0, "#fffdf0"], [0.4, "#ffe7a3"], [0.7, "#fff8dc"], [1, "#ffd979"]])}</defs>`
            + `<g transform='translate(50 50)'><g class='s2-spin s2-vslow'><path transform='translate(-50 -50)' d='${rays}' fill='url(#ry${u})' opacity='.85'/></g></g>`
            + orb(-22, 0.34, 56, 6.5, 0, 0) + orb(28, 0.3, 51, 8.5, 1, 2) + orb(84, 0.26, 54, 11, 0, 4)
            + `<g class='s2-pulse'>${crown}</g><g transform='translate(${sx} ${sy})'><path class='s2-twinkle' d='${star4(4.2, .18)}' fill='#fff'/></g>`
            + ring(39.6, 6.2, `url(#tg${u})`) + ring(36.1, 1.2, "#fff6d0", "opacity='.8'") + ring(42.9, 0.6, "#c99a2e", "opacity='.7'");
    },
    /* PRISMATIC: a shifting prismatic aura (the .s2-aura layer), a rainbow ring, refracted light shards drifting round */
    prismatic(u) {
        const C = ["#ff5ad1", "#ffb35a", "#f0e869", "#4dffb8", "#4dc3ff", "#8a6bff", "#ff5ad1"];
        let segs = "", grads = "";
        for (let i = 0; i < 12; i++) {
            const a1 = i * 30, a2 = a1 + 30, [x1, y1] = XY(39.6, a1), [x2, y2] = XY(39.6, a2);
            grads += `<linearGradient id='p${i}${u}' gradientUnits='userSpaceOnUse' x1='${x1}' y1='${y1}' x2='${x2}' y2='${y2}'><stop offset='0' stop-color='${C[i % 6]}'/><stop offset='1' stop-color='${C[(i % 6) + 1]}'/></linearGradient>`;
            segs += `<path d='${arc(39.6, a1 - 0.3, a2 + 0.3)}' fill='none' stroke='url(#p${i}${u})' stroke-width='7.4'/>`;
        }
        const SH = [[50, 20, 1], [57, 62, .8], [52, 104, 1.15], [59, 146, .7], [50, 188, .95], [56, 228, .8], [53, 268, 1.1], [60, 306, .75], [51, 340, .9]];
        const shards = SH.map(([r, a, s], i) => { const [x, y] = XY(r, a); return `<g transform='translate(${x - 50} ${y - 50}) rotate(${a + i * 37}) scale(${s})'><g class='s2-float' ${delay(-i * .55)}><path d='M0 -6.2L3.4 4L-3 3.1Z' fill='url(#sg${i % 3}${u})' opacity='.92'/><path d='M0 -6.2L3.4 4' stroke='#fff' stroke-width='.45' opacity='.85'/><path class='s2-flash' ${delay(-i * .8)} d='M0 -6.2L0 -13' stroke='#fff' stroke-width='.5' stroke-linecap='round'/></g></g>`; }).join("");
        const sg = (i, a, b, c) => lg("sg" + i + u, [[0, a], [0.5, b], [1, c]]);
        return `<defs>${grads}${sg(0, "#ff7ae0", "#ffd36a", "#ffffff")}${sg(1, "#6affc8", "#5ac8ff", "#ffffff")}${sg(2, "#b48aff", "#ff6ad5", "#fff3c4")}</defs>`
            + `<g transform='translate(50 50)'><g class='s2-spin s2-vslow'>${shards}</g></g>`
            + `<g transform='translate(50 50)'><g class='s2-spin s2-mid'><g transform='translate(-50 -50)'>${segs}</g></g></g>` + ring(35.8, 1, "#fff", "opacity='.8'") + ring(43.4, 0.7, "#fff", "opacity='.55'");
    }
};

/* =========================== COMPACT FRAMES (tokens, chips, lists: <= SKINS2.compactBelow px) ===========================
   Picture radius 40, ring 40.5..49.5, nothing past ~10% of the box, no animation. */
const CMP = {
    iron(u) {
        let tabs = ""; [45, 135, 225, 315].forEach(a => { tabs += `<path d='M${P(46, a - 13)}L${P(56, a - 8)}L${P(57.5, a)}L${P(56, a + 8)}L${P(46, a + 13)}Z' fill='url(#st${u})' stroke='#0e1012' stroke-width='1'/>`; });
        let gaps = ""; for (let i = 0; i < 8; i++) gaps += `M${P(40.5, i * 45 + 22.5)}L${P(49.5, i * 45 + 22.5)}`;
        const bolts = [0, 90, 180, 270].map(a => { const [x, y] = XY(45, a); return `<circle cx='${x}' cy='${y}' r='2' fill='#c4cad0' stroke='#121417' stroke-width='.6'/>`; }).join("");
        return `<defs>${lg("st" + u, [[0, "#aab2bb"], [0.4, "#4a5159"], [0.65, "#808891"], [1, "#2f343a"]])}</defs>` + tabs + ring(45, 9, `url(#st${u})`) + `<path d='${gaps}' stroke='#0e1012' stroke-width='1.2'/>` + bolts + ring(49.5, 0.8, "#0e1012");
    },
    bronze(u) {
        const leaf = (a, s) => { const [x, y] = XY(52, a); return `<g transform='translate(${x} ${y}) rotate(${a + (s > 0 ? 125 : 55) - 90})'><path d='M0 0Q4 -2.6 8 0Q4 2.6 0 0Z' fill='#d79a55' stroke='#5a3210' stroke-width='.5'/></g>`; };
        const lv = [205, 222, 239, 256].map(a => leaf(a, 1) + leaf(360 - a, -1)).join("");
        const [mx, my] = XY(50, 0);
        return `<defs>${lg("br" + u, [[0, "#f8cf95"], [0.35, "#b06a2c"], [0.6, "#e7a865"], [1, "#6b3a12"]])}</defs>` + lv + ring(45, 9, `url(#br${u})`) + ring(45, 1, "rgba(60,25,5,.6)", "stroke-dasharray='1.4 2.6'") + `<circle cx='${mx}' cy='${my}' r='4.2' fill='#c98a4b' stroke='#4a2a0c' stroke-width='.8'/>`;
    },
    silver(u) {
        let L = "", R = ""; [45, 135, 225, 315].forEach(a => { L += `M${P(44, a)}L${P(48, a - 9)}L${P(59, a)}Z`; R += `M${P(44, a)}L${P(59, a)}L${P(48, a + 9)}Z`; });
        return `<defs>${lg("ch" + u, [[0, "#ffffff"], [0.42, "#f2f5f8"], [0.5, "#4f5863"], [0.62, "#e3e8ee"], [1, "#8a939e"]], "x1='0' y1='0' x2='0' y2='1'")}</defs><path d='${L}' fill='#eef2f6' stroke='#2a2f35' stroke-width='.6'/><path d='${R}' fill='#6d7782' stroke='#2a2f35' stroke-width='.6'/>` + ring(45, 9, `url(#ch${u})`) + ring(40.8, 1, "#272c32");
    },
    gold(u) {
        const wing = `<g transform='translate(6 52)'>${[[170, 12], [195, 13], [220, 12]].map(([p, l]) => `<g transform='rotate(${p})'><path d='M0 0C4 -3.4 8 -3 ${l} 0C8 2 4 2.4 0 0Z' fill='#e9b949' stroke='#5c3c06' stroke-width='.6'/></g>`).join("")}</g>`;
        let crown = `<path d='${sector(46, 51, -20, 20)}' fill='#f0c654' stroke='#5c3c06' stroke-width='.7'/>`;
        [[-13, 56], [0, 59], [13, 56]].forEach(([a, r]) => { crown += `<path d='M${P(50.5, a - 5)}L${P(r, a)}L${P(50.5, a + 5)}Z' fill='#f0c654' stroke='#5c3c06' stroke-width='.6'/>`; });
        return `<defs>${lg("gd" + u, [[0, "#fff4b8"], [0.3, "#ecbd4c"], [0.55, "#8a5a10"], [0.78, "#ffe48a"], [1, "#b8860b"]])}</defs>` + wing + `<g transform='translate(100 0) scale(-1 1)'>${wing}</g>` + ring(45, 9, `url(#gd${u})`) + crown;
    },
    platinum(u) {
        return `<defs>${lg("pt" + u, [[0, "#fbfdff"], [0.35, "#b7c5d2"], [0.6, "#eef5fb"], [1, "#8a9cad"]])}</defs>` + ring(52, 4, "rgba(190,228,255,.35)") + ring(45, 9, `url(#pt${u})`) + ring(40.8, 1, "#4c5e6e")
            + `<g transform='translate(50 -2)'><ellipse rx='17' ry='4' fill='none' stroke='rgba(190,228,255,.5)' stroke-width='4'/><ellipse rx='17' ry='4' fill='none' stroke='#eef5fb' stroke-width='2'/></g>`;
    },
    emerald(u) {
        const cr = (base, dir, Lc, Wc) => { const [x, y] = XY(46, base), w = Wc / 2; return `<g transform='translate(${x} ${y}) rotate(${dir})'><path d='M${-w} 0L${-w} ${n2(-Lc * .7)}L0 ${-Lc}L0 0Z' fill='#7dffc2' stroke='#033a20' stroke-width='.5'/><path d='M${w} 0L${w} ${n2(-Lc * .7)}L0 ${-Lc}L0 0Z' fill='#13904f' stroke='#033a20' stroke-width='.5'/></g>`; };
        const gems = [...Array(6)].map((_, i) => `<g transform='${at(45, i * 60 + 30)}'><rect x='-2.8' y='-2' width='5.6' height='4' fill='#3fe39a' stroke='#023a1e' stroke-width='.5'/></g>`).join("");
        return cr(222, 215, 14, 7) + cr(236, 245, 10, 5) + cr(42, 38, 12, 6) + ring(45, 9, "#06502c") + gems;
    },
    diamond(u) {
        const gems = [...Array(8)].map((_, i) => `<g transform='${at(45, i * 45 + 22.5)}'><circle r='3.6' fill='url(#gm${u})' stroke='#2a7fb5' stroke-width='.5'/></g>`).join("");
        return `<defs>${rg("gm" + u, [[0, "#ffffff"], [0.4, "#d7f6ff"], [1, "#3c9ad0"]], "cx='.35' cy='.3' r='.85'")}</defs>` + ring(45, 9, "#bfe9ff", "opacity='.35'") + gems
            + `<g transform='translate(50 1)'><path d='M-6.5 -1.5L-3.5 -5L3.5 -5L6.5 -1.5L0 8Z' fill='#bdeeff' stroke='#2a7fb5' stroke-width='.6'/><path d='M-6.5 -1.5L6.5 -1.5' stroke='#fff' stroke-width='.5'/></g>`;
    },
    flame(u) {
        let t = "";
        [[-50, 7], [-25, 10], [0, 12], [25, 10], [50, 7], [-80, 5], [80, 5]].forEach(([a, L]) => { const [x, y] = XY(46, a); t += `<g transform='translate(${x} ${y}) rotate(${a * .5})'><path d='M-3.4 0C-3.4 ${-L * .45} -.6 ${-L * .55} .4 ${-L}C1.4 ${-L * .6} 3.4 ${-L * .5} 3.4 0Z' fill='url(#fo${u})'/><path d='M-1.6 0C-1.6 ${-L * .3} -.3 ${-L * .4} .2 ${-L * .6}C.8 ${-L * .4} 1.6 ${-L * .3} 1.6 0Z' fill='#ffe58a'/></g>`; });
        return `<defs>${lg("fo" + u, [[0, "#ffae00"], [0.6, "#ff4a00"], [1, "#c41a00", 0.2]], "x1='0' y1='1' x2='0' y2='0'")}</defs>` + t + ring(45, 9, "#2a0802") + ring(45, 1.2, "#ff7a1a", "stroke-dasharray='5 3 2 6'") + ring(40.8, 1, "#ffb347");
    },
    water(u) {
        const drop = (a, s) => { const [x, y] = XY(55, a); return `<path transform='translate(${x} ${y}) scale(${s})' d='M0 -2.6C1.2 -1 1.8 0 1.8 .9A1.8 1.8 0 0 1 -1.8 .9C-1.8 0 -1.2 -1 0 -2.6Z' fill='#bdeeff' stroke='#2b9be0' stroke-width='.4'/>`; };
        return `<defs>${lg("wr" + u, [[0, "#c8f6ff"], [0.4, "#3ec6ff"], [0.75, "#0a4fb0"], [1, "#56d4ff"]])}</defs>` + ring(45, 9, `url(#wr${u})`) + `<path d='${wavy(45.6, 1.6, 8, 96)}' fill='none' stroke='rgba(255,255,255,.7)' stroke-width='1.1'/>` + drop(125, 1.2) + drop(300, 1);
    },
    transcendent(u) {
        let rays = ""; for (let i = 0; i < 12; i++) { const a = i * 30 + 15; rays += `M${P(42, a - 4)}L${P(57, a)}L${P(42, a + 4)}Z`; }
        let crown = ""; [[-14, 56], [0, 60], [14, 56]].forEach(([a, r]) => { crown += `<path d='M${P(48, a - 4.5)}L${P(r, a)}L${P(48, a + 4.5)}Z' fill='#ffe9a8' stroke='#c99a2e' stroke-width='.5'/>`; });
        return `<path d='${rays}' fill='#ffe9a8' opacity='.7'/>` + ring(45, 8, "#fff3c4") + ring(41, 1, "#c99a2e") + crown;
    },
    prismatic(u) {
        const C = ["#ff5ad1", "#ffb35a", "#f0e869", "#4dffb8", "#4dc3ff", "#8a6bff"];
        const segs = C.map((c, i) => `<path d='${arc(45, i * 60 - 1, i * 60 + 61)}' fill='none' stroke='${c}' stroke-width='9'/>`).join("");
        const sh = [[54, 40], [55, 165], [53, 290]].map(([r, a], i) => { const [x, y] = XY(r, a); return `<path transform='translate(${x} ${y}) rotate(${a + 20})' d='M0 -5L2.8 3.4L-2.4 2.6Z' fill='${["#ffd36a", "#6affc8", "#ff6ad5"][i]}' stroke='#fff' stroke-width='.5'/>`; }).join("");
        return segs + ring(40.8, 1, "#fff") + sh;
    }
};

/* template cache: one SVG string per frame, ids made unique per avatar (several SVGs on a page must not share ids) */
const TPL = {};
let UID = 0;
export function frameEl(base, compact) {
    const set = compact ? CMP : FULL; if (!set[base]) return null;
    const key = base + (compact ? ":c" : ":f");
    if (!TPL[key]) TPL[key] = set[base]("§");
    const E = compact ? 12 : 30, u = "s2" + (++UID).toString(36);
    const el = document.createElement("i"); el.className = "s2f " + (compact ? "s2-cmp" : "s2-full"); el.setAttribute("aria-hidden", "true");
    el.innerHTML = `<svg viewBox='${-E} ${-E} ${100 + 2 * E} ${100 + 2 * E}' focusable='false'>${TPL[key].split("§").join(u)}</svg>`;
    return el;
}
/* all the Season 2 layers of an avatar (profile.js avatarEl calls this for a "<tier>2" frame) */
export function decorateAvatar(el, base, size) {
    const compact = size <= SKINS2.compactBelow;
    el.classList.add("s2"); if (compact) el.classList.add("s2c");
    const inner = el.querySelector(".ava-in");
    const aura = document.createElement("i"); aura.className = "s2-aura"; aura.setAttribute("aria-hidden", "true");
    const f = frameEl(base, compact);
    el.insertBefore(aura, inner); if (f) el.insertBefore(f, inner);
    if (!compact && size >= SKINS2.canvasFrom && (base === "flame" || base === "water")) addFx(el, base === "flame" ? "frameFlame" : "frameWater", "s2-cvf", inner);
}

/* =========================== BACKGROUNDS =========================== */
/* the layers of a Season 2 background on a player card / Arcade Pass (profile.js seatCard + passCard) */
export function decorateCard(el, base) {
    el.classList.add("sbg2");
    const w = document.createElement("i"); w.className = "s2bg"; w.setAttribute("aria-hidden", "true");
    w.innerHTML = "<i class='s2-l1'></i><i class='s2-l2'></i><i class='s2-l3'></i><i class='s2-l4'></i><i class='s2-shine'></i>";
    const s = document.createElement("i"); s.className = "s2-scrim"; s.setAttribute("aria-hidden", "true");
    el.append(w, s);
    if (base === "flame") addFx(w, "bgFlame", "s2-cvbg", w.querySelector(".s2-shine"));
}

/* textures: small SVG filter tiles, set once as CSS variables (--tx-*) that css/skins2.css layers over each material */
const svgURL = (w, h, body) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' preserveAspectRatio='none'>${body}</svg>`)}")`;
const gray = "<feColorMatrix values='.33 .33 .33 0 0 .33 .33 .33 0 0 .33 .33 .33 0 0 0 0 0 0 1'/>";
const lin = (s, i) => `<feComponentTransfer><feFuncR type='linear' slope='${s}' intercept='${i}'/><feFuncG type='linear' slope='${s}' intercept='${i}'/><feFuncB type='linear' slope='${s}' intercept='${i}'/></feComponentTransfer>`;
const tbl = v => `<feComponentTransfer><feFuncR type='table' tableValues='${v}'/><feFuncG type='table' tableValues='${v}'/><feFuncB type='table' tableValues='${v}'/></feComponentTransfer>`;
const filt = (inner, w = "100%", h = "100%") => `<filter id='f' x='0' y='0' width='${w}' height='${h}' color-interpolation-filters='sRGB'>${inner}</filter><rect width='100%' height='100%' filter='url(#f)'/>`;
function facets(W, H, cols, rows, seed, light, dark, line) {
    const r = rnd(seed), pts = [];
    for (let y = 0; y <= rows; y++) { pts.push([]); for (let x = 0; x <= cols; x++) { const edgeX = x === 0 || x === cols, edgeY = y === 0 || y === rows; pts[y].push([n2(x / cols * W + (edgeX ? 0 : (r() - .5) * W / cols * .8)), n2(y / rows * H + (edgeY ? 0 : (r() - .5) * H / rows * .8))]); } }
    let s = "";
    const tri = (a, b, c) => { const v = r(), col = v < .55 ? light : dark, op = n2(v < .55 ? .04 + r() * .22 : .1 + r() * .3); s += `<path d='M${a}L${b}L${c}Z' fill='${col}' fill-opacity='${op}' stroke='${line}' stroke-width='.7'/>`; };
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const a = pts[y][x], b = pts[y][x + 1], c = pts[y + 1][x + 1], d = pts[y + 1][x]; if (r() < .5) { tri(a, b, c); tri(a, c, d); } else { tri(a, b, d); tri(b, c, d); } }
    return s;
}
function stars(W, H, n, seed) {
    const r = rnd(seed); let s = "";
    for (let i = 0; i < n; i++) { const x = n2(r() * W), y = n2(r() * H), k = r(), rad = n2(k > .93 ? 1.5 : .35 + k * .8); s += `<circle cx='${x}' cy='${y}' r='${rad}' fill='${k > .8 ? "#fff6e0" : k > .5 ? "#dfe8ff" : "#ffffff"}' opacity='${n2(.35 + k * .65)}'/>`; if (k > .93) s += `<circle cx='${x}' cy='${y}' r='${rad * 3.4}' fill='#fff' opacity='.12'/>`; }
    return s;
}
function flamesSil(W, H, seed) {
    const r = rnd(seed), layer = (amp, col1, col2, id, base) => {
        let d = `M0 ${H}L0 ${H * base}`; const n = 14;
        for (let i = 0; i < n; i++) { const x0 = i / n * W, x1 = (i + .5) / n * W, x2 = (i + 1) / n * W, tip = H * (base - amp * (.45 + r() * .55)); d += `Q${n2(x0 + W / n * .15)} ${n2(H * base - amp * H * .2)} ${n2(x1)} ${n2(tip)}Q${n2(x2 - W / n * .2)} ${n2(H * base - amp * H * .1)} ${n2(x2)} ${n2(H * base)}`; }
        return `<linearGradient id='${id}' x1='0' y1='1' x2='0' y2='0'><stop offset='0' stop-color='${col1}'/><stop offset='.55' stop-color='${col2}' stop-opacity='.75'/><stop offset='1' stop-color='${col2}' stop-opacity='0'/></linearGradient><path d='${d}L${W} ${H}Z' fill='url(#${id})'/>`;
    };
    return `<filter id='b'><feGaussianBlur stdDeviation='2.2'/></filter><g filter='url(#b)'>${layer(.55, "#ff5a00", "#a51400", "a", .98)}${layer(.42, "#ffb000", "#ff4a00", "b", 1)}${layer(.24, "#fff1b0", "#ffb000", "c", 1)}</g>`;
}
function aurora(W, H) {
    const band = (y, amp, c1, c2, id, k) => { let d = `M0 ${y}`; for (let x = 0; x <= W; x += W / 8) d += `Q${n2(x + W / 16)} ${n2(y + (k++ % 2 ? -amp : amp))} ${n2(x + W / 8)} ${y}`; return `<linearGradient id='${id}' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='${c1}' stop-opacity='0'/><stop offset='.3' stop-color='${c1}'/><stop offset='.7' stop-color='${c2}'/><stop offset='1' stop-color='${c2}' stop-opacity='0'/></linearGradient><path d='${d}' fill='none' stroke='url(#${id})' stroke-width='${n2(H * .2)}' stroke-linecap='round'/>`; };
    return `<filter id='b' x='-20%' y='-50%' width='140%' height='200%'><feGaussianBlur stdDeviation='16'/></filter><g filter='url(#b)' opacity='.85'>${band(H * .36, H * .16, "#5dffc4", "#8f7bff", "a", 0)}${band(H * .58, H * .12, "#7a6bff", "#ff8ad8", "b", 1)}</g>`;
}
const TX = {
    brushed: () => svgURL(420, 160, filt(`<feTurbulence type='fractalNoise' baseFrequency='0.0025 0.42' numOctaves='3' seed='7' stitchTiles='stitch'/>${gray}${lin(2.2, -0.6)}`)),
    satin: () => svgURL(300, 300, filt(`<feTurbulence type='fractalNoise' baseFrequency='0.006 0.8' numOctaves='2' seed='3' stitchTiles='stitch'/>${gray}${lin(1.3, -0.15)}<feGaussianBlur stdDeviation='.5'/>`)),
    hammer: () => svgURL(220, 220, filt(`<feTurbulence type='fractalNoise' baseFrequency='0.05' numOctaves='2' seed='4' stitchTiles='stitch' result='n'/><feDiffuseLighting in='n' surfaceScale='3.4' diffuseConstant='1.05' lighting-color='#fff'><feDistantLight azimuth='225' elevation='40'/></feDiffuseLighting>`)),
    rust: () => svgURL(360, 240, filt(`<feTurbulence type='fractalNoise' baseFrequency='0.017' numOctaves='4' seed='11' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .5 0 0 0 0 .2 0 0 0 0 .06 1 0 0 0 0'/><feComponentTransfer><feFuncA type='table' tableValues='0 0 0 0 .12 .65 .92 1'/></feComponentTransfer>`)),
    liquid: () => svgURL(520, 320, filt(`<feTurbulence type='fractalNoise' baseFrequency='0.0045 0.009' numOctaves='2' seed='9' stitchTiles='stitch'/>${gray}${tbl("0 .15 .9 .2 0 .25 1 .2 0 .15 .85")}<feGaussianBlur stdDeviation='1.6'/>`)),
    caustic: () => svgURL(300, 300, filt(`<feTurbulence type='turbulence' baseFrequency='0.016' numOctaves='2' seed='5' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 -3.4 0 0 0 1.02'/><feComponentTransfer><feFuncA type='gamma' amplitude='1' exponent='2.4' offset='0'/></feComponentTransfer>`)),
    nebula: () => svgURL(500, 320, filt(`<feTurbulence type='fractalNoise' baseFrequency='0.005' numOctaves='4' seed='2' stitchTiles='stitch'/><feColorMatrix values='1.1 0 .3 0 -.1 0 .9 .2 0 -.15 .5 .2 1.2 0 -.05 0 0 2.2 0 -1.05'/>`)),
    foil: () => svgURL(260, 260, filt(`<feTurbulence type='fractalNoise' baseFrequency='0.022' numOctaves='3' seed='13' stitchTiles='stitch' result='n'/><feDiffuseLighting in='n' surfaceScale='2.6' lighting-color='#463f63' result='d'><feDistantLight azimuth='135' elevation='50'/></feDiffuseLighting><feSpecularLighting in='n' surfaceScale='2.6' specularConstant='.95' specularExponent='22' lighting-color='#e6e0ff' result='s'><feDistantLight azimuth='135' elevation='50'/></feSpecularLighting><feComposite in='s' in2='d' operator='arithmetic' k2='1' k3='1'/>`)),
    grain: () => svgURL(180, 180, filt(`<feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='1' seed='21' stitchTiles='stitch'/>${gray}${lin(1.6, -0.3)}`)),
    facets: () => svgURL(400, 252, facets(400, 252, 8, 5, 31, "#e9fbff", "#0b2a44", "rgba(220,245,255,.22)")),
    emfacets: () => svgURL(400, 252, facets(400, 252, 6, 4, 47, "#8dffc9", "#00321a", "rgba(170,255,210,.16)")),
    stars: () => svgURL(260, 200, stars(260, 200, 46, 5)),
    stars2: () => svgURL(190, 170, stars(190, 170, 22, 9)),
    flames: () => svgURL(400, 200, flamesSil(400, 200, 3)),
    aurora: () => svgURL(600, 300, aurora(600, 300))
};
let texturesOn = false;
export function installTextures() {
    if (texturesOn || typeof document === "undefined") return; texturesOn = true;
    const r = document.documentElement.style;
    Object.keys(TX).forEach(k => r.setProperty("--tx-" + k, TX[k]()));
}

/* =========================== THE CANVAS LOOP (flames, water) ===========================
   One requestAnimationFrame loop for every Season 2 canvas on the page, capped at SKINS2.fps. A canvas is skipped
   while its host is off-screen (.fx-off), hidden (0 size), the tab is hidden or effects are reduced. */
const FX = new Set();
let raf = 0, lastT = 0, RO = null;
const SPR = {};
function sprite(name, cols) {
    if (SPR[name]) return SPR[name];
    const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    cols.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (SPR[name] = c);
}
const SP = () => ({
    hot: sprite("hot", [[0, "rgba(255,252,230,1)"], [0.35, "rgba(255,214,110,.75)"], [1, "rgba(255,150,30,0)"]]),
    fire: sprite("fire", [[0, "rgba(255,190,70,.95)"], [0.4, "rgba(255,110,20,.55)"], [1, "rgba(255,60,0,0)"]]),
    red: sprite("red", [[0, "rgba(255,80,20,.8)"], [0.45, "rgba(190,24,0,.35)"], [1, "rgba(120,10,0,0)"]]),
    ember: sprite("ember", [[0, "rgba(255,246,200,1)"], [0.3, "rgba(255,190,80,.9)"], [1, "rgba(255,120,20,0)"]]),
    drop: sprite("drop", [[0, "rgba(255,255,255,1)"], [0.3, "rgba(200,240,255,.95)"], [0.65, "rgba(70,180,245,.55)"], [1, "rgba(30,120,220,0)"]])
});
function addFx(host, kind, cls, before) {
    if (typeof document === "undefined") return null;
    const cv = document.createElement("canvas"); cv.className = "s2-cv " + cls; cv.setAttribute("aria-hidden", "true");
    if (before && before.parentNode === host) host.insertBefore(cv, before); else host.appendChild(cv);
    const it = { cv, host, kind, g: null, W: 0, H: 0, parts: [], emit: 0, t: 0, seen: false, idle: true, next: 0 };
    FX.add(it);
    if (typeof ResizeObserver !== "undefined") { RO = RO || new ResizeObserver(list => list.forEach(e => { const x = e.target._s2; if (x) { x.cw = e.contentRect.width; x.ch = e.contentRect.height; } })); cv._s2 = it; RO.observe(cv); }
    kick();
    return cv;
}
function kick() { if (!raf && FX.size && typeof requestAnimationFrame !== "undefined") raf = requestAnimationFrame(loop); }
if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });
function loop(now) {
    raf = 0;
    if (document.hidden || !FX.size) return;
    raf = requestAnimationFrame(loop);
    if (now - lastT < 1000 / (SKINS2.fps || 30) - 1.5) return;
    const dt = Math.min(0.08, lastT ? (now - lastT) / 1000 : 0.033); lastT = now;
    const on = motionOK(), dpr = Math.min(1.5, globalThis.devicePixelRatio || 1);
    FX.forEach(it => {
        if (!it.cv.isConnected) { if (it.seen) { FX.delete(it); if (RO) RO.unobserve(it.cv); } return; }
        it.seen = true;
        const w = it.cw != null ? it.cw : it.cv.clientWidth, h = it.ch != null ? it.ch : it.cv.clientHeight;
        if (!on || !w || !h || it.host.classList.contains("fx-off") || (it.host.parentElement && it.host.parentElement.classList.contains("fx-off"))) {
            if (!it.idle && it.g) { it.g.clearRect(0, 0, it.cv.width, it.cv.height); it.parts.length = 0; } it.idle = true; return;
        }
        const W = Math.round(w * dpr), H = Math.round(h * dpr);
        if (it.cv.width !== W || it.cv.height !== H || !it.g) { it.cv.width = W; it.cv.height = H; it.g = it.cv.getContext("2d"); it.parts.length = 0; }
        it.idle = false; it.t += dt;
        STEP[it.kind](it, dt, W, H);
    });
}
const rr = (a, b) => a + Math.random() * (b - a);
const STEP = {
    /* fire licking up and around the frame: flame puffs born on the ring (mostly the upper part) rising and shrinking, embers drifting up */
    frameFlame(it, dt, W, H) {
        const g = it.g, u = W / 160, cx = W / 2, cy = H / 2, S = SP(), P = it.parts;
        it.emit += dt * 58;
        while (it.emit >= 1) {
            it.emit--; if (P.length > 90) break;
            const a = (Math.random() * 2 - 1) * Math.PI * 0.86, r = rr(40.5, 44.5) * u, top = (1 + Math.cos(a)) / 2;
            if (Math.random() < 0.06) P.push({ e: 1, x: cx + r * Math.sin(a), y: cy - r * Math.cos(a), vx: rr(-6, 6) * u, vy: -rr(14, 26) * u, s: rr(0.8, 1.5) * u, life: rr(1.3, 2.2), t: 0, ph: rr(0, 6) });
            else P.push({ x: cx + r * Math.sin(a), y: cy - r * Math.cos(a), vx: Math.sin(a) * rr(4, 9) * u, vy: -rr(16, 30) * u * (0.5 + top * 0.7), s: rr(4.2, 7) * u * (0.55 + 0.6 * top), life: rr(0.42, 0.8) * (0.6 + top * 0.5), t: 0 });
        }
        g.clearRect(0, 0, W, H); g.globalCompositeOperation = "lighter";
        for (let i = P.length - 1; i >= 0; i--) {
            const p = P[i]; p.t += dt; if (p.t >= p.life) { P.splice(i, 1); continue; }
            const k = p.t / p.life; p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.e) { p.x += Math.sin(it.t * 3 + p.ph) * 6 * u * dt; g.globalAlpha = Math.min(1, (1 - k) * 1.4); const s = p.s * 2.4; g.drawImage(S.ember, p.x - s, p.y - s, s * 2, s * 2); continue; }
            p.vx *= 0.97;
            const spr = k < 0.28 ? S.hot : k < 0.6 ? S.fire : S.red, s = p.s * (1 - k * 0.55);
            g.globalAlpha = Math.pow(1 - k, 1.1) * 0.85; g.drawImage(spr, p.x - s, p.y - s, s * 2, s * 2);
        }
        g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    },
    /* droplets streaming round the ring + a splash thrown off every second or so */
    frameWater(it, dt, W, H) {
        const g = it.g, u = W / 160, cx = W / 2, cy = H / 2, S = SP(), P = it.parts;
        if (!it.drops) it.drops = [...Array(12)].map((_, i) => ({ a: i / 12 * Math.PI * 2 + rr(-.2, .2), r: rr(44, 48), w: rr(0.7, 1.15), s: rr(1.4, 2.4) }));
        it.next -= dt;
        if (it.next <= 0) { it.next = rr(0.7, 1.2); const a = rr(0, Math.PI * 2); for (let i = 0; i < 7; i++) { const sp = rr(22, 44) * u, d = a + rr(-.55, .55); P.push({ x: cx + 45 * u * Math.sin(a), y: cy - 45 * u * Math.cos(a), vx: Math.sin(d) * sp, vy: -Math.cos(d) * sp - rr(4, 14) * u, s: rr(0.9, 1.8) * u, life: rr(0.55, 0.9), t: 0 }); } }
        g.clearRect(0, 0, W, H);
        it.drops.forEach(d => { d.a += d.w * dt; const r = (d.r + Math.sin(it.t * 2 + d.a * 3) * 1.2) * u, s = d.s * u * 1.8; g.globalAlpha = 0.85; g.drawImage(S.drop, cx + r * Math.sin(d.a) - s, cy - r * Math.cos(d.a) - s, s * 2, s * 2); });
        for (let i = P.length - 1; i >= 0; i--) {
            const p = P[i]; p.t += dt; if (p.t >= p.life) { P.splice(i, 1); continue; }
            p.vy += 70 * u * dt; p.x += p.vx * dt; p.y += p.vy * dt;
            const k = p.t / p.life, s = p.s * 2; g.globalAlpha = (1 - k) * 0.95; g.drawImage(S.drop, p.x - s, p.y - s, s * 2, s * 2);
        }
        g.globalAlpha = 1;
    },
    /* a fire burning along the bottom of the card, embers rising through the whole card */
    bgFlame(it, dt, W, H) {
        const g = it.g, S = SP(), P = it.parts, rate = Math.min(150, 80 * W / 520);
        it.emit += dt * rate;
        while (it.emit >= 1) {
            it.emit--; if (P.length > 190) break;
            if (Math.random() < 0.07) P.push({ e: 1, x: rr(0, W), y: H * rr(0.85, 1.02), vx: rr(-.02, .02) * W, vy: -rr(0.16, 0.3) * H, s: rr(0.006, 0.012) * H, life: rr(2, 3.4), t: 0, ph: rr(0, 6) });
            else P.push({ x: rr(-0.03, 1.03) * W, y: H * rr(1, 1.06), vx: rr(-0.015, 0.015) * W, vy: -rr(0.28, 0.5) * H, s: rr(0.06, 0.11) * H, life: rr(0.75, 1.25), t: 0 });
        }
        g.clearRect(0, 0, W, H); g.globalCompositeOperation = "lighter";
        for (let i = P.length - 1; i >= 0; i--) {
            const p = P[i]; p.t += dt; if (p.t >= p.life) { P.splice(i, 1); continue; }
            const k = p.t / p.life; p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.e) { p.x += Math.sin(it.t * 2.2 + p.ph) * 0.03 * W * dt; g.globalAlpha = Math.min(1, (1 - k) * 1.6); const s = p.s * 2.6; g.drawImage(S.ember, p.x - s, p.y - s, s * 2, s * 2); continue; }
            const spr = k < 0.25 ? S.hot : k < 0.58 ? S.fire : S.red, s = p.s * (1 - k * 0.6);
            g.globalAlpha = Math.pow(1 - k, 1.2) * 0.75; g.drawImage(spr, p.x - s, p.y - s, s * 2, s * 2);
        }
        g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    }
};
export const _s2Test = { FULL, CMP, FX };
