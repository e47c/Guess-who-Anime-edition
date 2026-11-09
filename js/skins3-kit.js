/* =====================================================================
   SEASON 3 SKINS · drawing kit shared by js/skins3.js (Ruby, Diamond, Flame + the engine) and js/skins3-tiers.js
   (the other tiers): geometry (frame box 0..100, picture centre 50,50, angles clockwise from the top), gradients,
   colour mixing, a seeded random, cut-gem facets, scene-layer wrappers.
   ===================================================================== */
export const n2 = v => Math.round(v * 100) / 100;
export const XY = (r, d, cx = 50, cy = 50) => { const a = d * Math.PI / 180; return [n2(cx + r * Math.sin(a)), n2(cy - r * Math.cos(a))]; };
export const P = (r, d) => XY(r, d).join(" ");
export const arc = (r, a1, a2) => `M${P(r, a1)}A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${P(r, a2)}`;
export const stops = list => list.map(([o, c, op]) => `<stop offset='${o}' stop-color='${c}'${op != null ? ` stop-opacity='${op}'` : ""}/>`).join("");
export const lg = (id, list, a = "x1='0' y1='0' x2='1' y2='1'") => `<linearGradient id='${id}' ${a}>${stops(list)}</linearGradient>`;
export const rg = (id, list, a = "") => `<radialGradient id='${id}' ${a}>${stops(list)}</radialGradient>`;
export const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const mix = (a, b, t) => { t = Math.max(0, Math.min(1, t)); const A = hx(a), B = hx(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
export const rnd = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
export const star4 = (s = 5, k = .18) => `M0 ${-s}L${n2(s * k)} ${n2(-s * k)}L${s} 0L${n2(s * k)} ${n2(s * k)}L0 ${s}L${n2(-s * k)} ${n2(s * k)}L${-s} 0L${n2(-s * k)} ${n2(-s * k)}Z`;
export const poly = pts => "M" + pts.map(p => n2(p[0]) + " " + n2(p[1])).join("L") + "Z";
export const dly = s => `style='animation-delay:${n2(s)}s'`;


/* a cut gem seen from the top (round / oval brilliant): table, star facets, bezels, upper girdle facets, shaded for a
   light from the upper left, plus an inner glow, a rim and specular glints. pal = { hi, mid, lo, rim, glow } */
export function brilliant(cx, cy, rx, ry, rot, pal, o = {}) {
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
export const RUBY = { hi: "#ff7f97", mid: "#e0183c", lo: "#3e000e", rim: "#2a0008", glow: true };
export const ICE = { hi: "#ffffff", mid: "#e6f3fb", lo: "#58748a", rim: "#3e5a70" };

export const ROSE = u => lg("rg" + u, [[0, "#fbd6c4"], [.32, "#dc977f"], [.58, "#a5604d"], [.82, "#f4bca6"], [1, "#c98169"]]);
export const SHADOW = (u, r = 54) => `<defs>${rg("sd" + u, [[.6, "#000", .5], [1, "#000", 0]])}</defs><circle cx='50' cy='53' r='${r}' fill='url(#sd${u})'/>`;

export const feather = (L, w) => `M0 0C${n2(L * .25)} ${n2(-w)} ${n2(L * .6)} ${n2(-w * 1.1)} ${n2(L * .8)} ${n2(-w * .5)}Q${n2(L * .9)} ${n2(-w * .95)} ${L} ${n2(-w * .2)}Q${n2(L * .92)} ${n2(w * .1)} ${n2(L * .96)} ${n2(w * .5)}Q${n2(L * .84)} ${n2(w * .38)} ${n2(L * .77)} ${n2(w * .75)}C${n2(L * .55)} ${n2(w * 1.05)} ${n2(L * .25)} ${n2(w * .8)} 0 0Z`;

export const svgURL = body => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 252' preserveAspectRatio='xMidYMid slice'>${body}</svg>`)}")`;
export const OV = body => `<svg class='s3-ov' viewBox='0 0 400 252' preserveAspectRatio='xMidYMid slice' aria-hidden='true'>${body}</svg>`;
