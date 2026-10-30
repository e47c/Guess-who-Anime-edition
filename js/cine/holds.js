/* =====================================================================
   FREEZE HOLDS · the set pieces four Freeze cards leave over the whole page while the frozen player's 2 turns run out:
   Haku's frameless ice mirrors and the long crystals stuck in the table, Hit's light-red ice and sparkles, Doma's heavy
   frost, Julius's time sphere and its bracelet of Roman numerals. The card's scene (freeze.js) draws them as it ends and
   the page's hold (game.js) draws them again from the same geometry, so the hand-over has no seam.
   ===================================================================== */
import { TAU, hs, ss, oBack, glow, pool, cover, crystalField } from "./kit.js?v=11";

const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return r.width ? { x: r.left, y: r.top, w: r.width, h: r.height } : null; };
const union = (a, b) => { if (!a) return b; if (!b) return a; const x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y); return { x: x0, y: y0, w: Math.max(a.x + a.w, b.x + b.w) - x0, h: Math.max(a.y + a.h, b.y + b.h) - y0 }; };

/* ---------- HAKU · Crystal Ice Mirrors ---------- */
/* the mirrors: a ring of tall ice panes standing round the screen's edges; the bottom centre (your own hand) stays open */
export function hakuMirrors(w, h) {
    const M = Math.min(w, h), phone = w < 600, n = phone ? 7 : 10, L = [];
    for (let i = 0; i < n; i++) {
        const a = Math.PI / 2 + .9 + i / (n - 1) * (TAU - 1.8), W = M * (phone ? .19 : .15) * (.88 + .3 * hs(i * 3.1 + 1)), H = W * (1.6 + .35 * hs(i * 5.3 + 2));
        L.push({ x: w / 2 + Math.cos(a) * w * (phone ? .53 : .5), y: h / 2 + Math.sin(a) * h * (phone ? .5 : .49), w: W, h: H, rot: Math.cos(a) * .12 + (hs(i * 7.7) - .5) * .1, i, n,
            cut: [hs(i * 2.1), hs(i * 4.3), hs(i * 6.5), hs(i * 8.7)] });
    }
    return L;
}
/* a clean-cut slab: a rectangle with two or three corners sliced off at an angle. round > 0 softens every corner (melting) */
function slab(g, W, H, cut, round) {
    const c = [W * (.08 + .16 * cut[0]), W * (.03 + .1 * cut[1]), W * (.1 + .14 * cut[2]), W * (.04 + .08 * cut[3])];
    const P = [[-W / 2, -H / 2 + c[0] * 1.6], [-W / 2 + c[0], -H / 2], [W / 2 - c[1], -H / 2], [W / 2, -H / 2 + c[1] * 1.4], [W / 2, H / 2 - c[2] * 1.5], [W / 2 - c[2], H / 2], [-W / 2 + c[3], H / 2], [-W / 2, H / 2 - c[3] * 1.3]];
    g.beginPath();
    if (!round) { P.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); return P; }
    const md = P.map((p, i) => { const q = P[(i + 1) % 8]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; });
    g.moveTo(md[7][0], md[7][1]); P.forEach((p, i) => g.arcTo(p[0], p[1], md[i][0], md[i][1], round)); g.closePath(); return P;
}
/* one mirror. o: { rise 0..1 (grows up out of the floor), t (s, for the travelling glint), glint: false (none), a, art (reflected), focus, refl, melt 0..1, sheen (only the glint) } */
export function iceMirror(g, m, o = {}) {
    const rise = o.rise == null ? 1 : o.rise; if (rise <= 0) return;
    const melt = o.melt || 0, e = oBack(Math.min(1, rise), 1.05), W = m.w, H = m.h, a = (o.a == null ? 1 : o.a) * Math.min(1, rise * 1.8) * (1 - ss(.4, 1, melt)); if (a <= .002) return;
    g.save(); g.translate(m.x, m.y + H * .5 + melt * H * .55); g.rotate(m.rot); g.scale(1 - melt * .14, Math.max(.001, e) * (1 - melt * .38)); g.translate(0, -H * .5);
    g.globalAlpha *= a; if (melt > .02) g.filter = "blur(" + (melt * 4).toFixed(1) + "px)";
    const P = slab(g, W, H, m.cut, melt * W * .4); g.save(); g.clip();
    if (!o.sheen) {
        const bg = g.createLinearGradient(-W / 2, -H / 2, W / 2, H / 2); bg.addColorStop(0, "rgba(228,247,255,.34)"); bg.addColorStop(.45, "rgba(140,205,245,.16)"); bg.addColorStop(1, "rgba(200,236,255,.3)"); g.fillStyle = bg; g.fillRect(-W / 2, -H / 2, W, H);
        if (o.art) { g.save(); g.globalAlpha *= .17 * (o.refl == null ? 1 : o.refl); g.scale(-1, 1); cover(g, o.art, -W / 2, -H / 2, W, H, (o.focus || [.5, .3])[0], (o.focus || [.5, .3])[1] + .08, 1.15);   // Haku, reflected deep in the ice
            g.globalCompositeOperation = "color"; g.fillStyle = "rgba(110,195,255,.85)"; g.fillRect(-W / 2, -H / 2, W, H); g.restore(); }
        g.strokeStyle = "rgba(255,255,255,.22)"; g.lineWidth = 1; g.beginPath();                              // frost lines frozen inside the slab
        for (let k = 0; k < 5; k++) { let x = -W / 2 + W * hs(m.i * 9 + k), y = H / 2, an = -Math.PI / 2 + (hs(m.i * 3 + k) - .5) * .9; g.moveTo(x, y); for (let j = 0; j < 5; j++) { an += (hs(m.i * 17 + k * 5 + j) - .5) * .7; x += Math.cos(an) * H * .09; y += Math.sin(an) * H * .09; g.lineTo(x, y); } }
        g.stroke();
        const ft = g.createLinearGradient(0, H / 2, 0, H * .18); ft.addColorStop(0, "rgba(240,250,255,.5)"); ft.addColorStop(1, "rgba(240,250,255,0)"); g.fillStyle = ft; g.fillRect(-W / 2, H * .18, W, H * .32);   // frosted foot
        const sh = g.createLinearGradient(-W / 2, -H / 2, W / 2, H / 2); sh.addColorStop(0, "rgba(255,255,255,.5)"); sh.addColorStop(.18, "rgba(255,255,255,.06)"); sh.addColorStop(.55, "rgba(255,255,255,0)"); sh.addColorStop(.62, "rgba(255,255,255,.22)"); sh.addColorStop(.7, "rgba(255,255,255,0)"); g.fillStyle = sh; g.fillRect(-W / 2, -H / 2, W, H);
    }
    const sw = ((o.t || 0) * .11 + m.i * .137) % 1.7 - .35;                                                   // the glint travelling across the ice
    if (o.glint !== false && sw > -.3 && sw < 1.3) { const x = -W / 2 + W * 1.6 * sw - W * .3; g.globalCompositeOperation = "lighter"; const gl = g.createLinearGradient(x - W * .18, 0, x + W * .18, 0); gl.addColorStop(0, "rgba(255,255,255,0)"); gl.addColorStop(.5, "rgba(235,250,255," + (o.sheen ? .5 : .35) + ")"); gl.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gl; g.beginPath(); g.moveTo(x - W * .12, -H / 2); g.lineTo(x + W * .2, -H / 2); g.lineTo(x - W * .1, H / 2); g.lineTo(x - W * .42, H / 2); g.closePath(); g.fill(); }
    g.restore();
    if (!o.sheen && melt < .5) {                                                                              // cut edges catching the light: part of one long side and the top cut, fading (no frame)
        g.lineCap = "round"; const k = 1 - melt * 2;
        const edge = (p, q, a0, a1) => { const gr = g.createLinearGradient(p[0], p[1], q[0], q[1]); gr.addColorStop(0, "rgba(255,255,255," + a0 * k + ")"); gr.addColorStop(1, "rgba(255,255,255," + a1 * k + ")"); g.strokeStyle = gr; g.lineWidth = 1.6; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); };
        edge(P[0], P[1], .2, .95); edge(P[1], P[2], .95, .1); edge(P[0], [P[7][0], P[7][1] * .2], .85, 0); edge(P[3], P[4], 0, .35);
    }
    g.restore();
}
/* the area the crystals must leave clear: the draw pile and the top card in the middle of the table */
export function hakuKeep(w, h) {
    let r = typeof document !== "undefined" ? union(box(document.getElementById("unoDraw")), box(document.querySelector("#uno .u-center"))) : null;
    if (!r || r.w > w * .8 || r.w < 20) { const M = Math.min(w, h); r = { x: w / 2 - M * .17, y: h * .46 - M * .13, w: M * .34, h: M * .26 }; }
    return r;
}
/* the long crystals: one from every other mirror, flying at the centre; each one stops with its tip stuck in the table just outside the piles */
export function hakuSpikes(w, h, mirrors, keep) {
    const M = Math.min(w, h), cx = keep.x + keep.w / 2, cy = keep.y + keep.h / 2, rx = keep.w / 2 + M * .035, ry = keep.h / 2 + M * .035, L = [];
    mirrors.filter((m, i) => i % 2 === 0 || mirrors.length < 9).slice(0, 7).forEach((m, k) => {
        const a = Math.atan2(m.y - cy, m.x - cx);
        L.push({ sx: m.x, sy: m.y - m.h * .1, tx: cx + Math.cos(a) * rx, ty: cy + Math.sin(a) * ry, a: a + Math.PI, len: M * (.15 + .06 * hs(k * 3.7)), wd: M * (.017 + .007 * hs(k * 1.9)), k });
    });
    return L;
}
/* one long crystal. q 0..1 = its flight from the mirror (1 = stuck in the table); o: { a, melt, glint } */
export function iceSpike(g, s, q, o = {}) {
    if (q <= 0) return; const melt = o.melt || 0, e = Math.min(1, q), x = s.sx + (s.tx - s.sx) * e, y = s.sy + (s.ty - s.sy) * e;
    const L = s.len * (1 - melt * .75) * (q >= 1 ? .93 : 1), W = s.wd * (1 - melt * .45), a = (o.a == null ? 1 : o.a) * (1 - ss(.55, 1, melt)); if (a <= .002) return;
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(s.a);
    if (q >= 1 && melt < .6) {                                                                                 // the table cracked round the tip
        g.save(); g.globalAlpha *= 1 - melt / .6; g.strokeStyle = "rgba(235,248,255,.75)"; g.lineWidth = 1.2; g.lineCap = "round"; g.beginPath();
        for (let k = 0; k < 7; k++) { let an = k / 7 * TAU + hs(s.k * 5 + k), px = 0, py = 0; g.moveTo(0, 0); for (let j = 0; j < 3; j++) { an += (hs(s.k * 11 + k * 3 + j) - .5) * .8; px += Math.cos(an) * s.wd * 1.1; py += Math.sin(an) * s.wd * 1.1; g.lineTo(px, py); } }
        g.stroke(); glow(g, 0, 0, s.wd * 2.6, "#dff4ff", .45); g.restore();
    }
    if (melt > .02) g.filter = "blur(" + (melt * 3).toFixed(1) + "px)";
    const r = melt * W * .5, body = () => { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * .08, -W * .2 - r * .3, L * .2, -W / 2); g.lineTo(L * .97, -W * .46); g.lineTo(L * 1.02, -W * .12); g.lineTo(L * .96, W * .14); g.lineTo(L, W * .46); g.lineTo(L * .2, W / 2); g.quadraticCurveTo(L * .08, W * .2 + r * .3, 0, 0); g.closePath(); };
    body(); const gr = g.createLinearGradient(0, -W / 2, 0, W / 2); gr.addColorStop(0, "rgba(246,252,255,.95)"); gr.addColorStop(.42, "rgba(176,224,252,.85)"); gr.addColorStop(.5, "rgba(120,190,240,.85)"); gr.addColorStop(1, "rgba(70,140,210,.9)"); g.fillStyle = gr; g.fill();
    g.strokeStyle = "rgba(20,70,130,.55)"; g.lineWidth = 1; g.stroke();
    g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(L * .02, 0); g.lineTo(L * .96, -W * .02); g.moveTo(L * .2, -W / 2); g.lineTo(L * .62, -W * .1); g.stroke();   // the ridge and one facet
    const gl = o.glint || 0; if (gl > 0) { g.globalCompositeOperation = "lighter"; glow(g, L * (.3 + .4 * gl), -W * .2, W * 1.4, "#ffffff", Math.sin(gl * Math.PI) * .8); }
    g.restore();
}

/* ---------- HIT · Time-Skip Freeze ---------- */
export const HIT_PAL = ["rgba(255,238,242,.96)", "rgba(255,168,182,.86)", "rgba(232,98,120,.88)", "rgba(126,26,52,.78)"];
/* the light-red ice: the crystal field round the edges and scattered over the table; e = how far in from the nearest edge (0 at the edge) */
export function hitCrystals(w, h) { const M = Math.min(w, h); return crystalField(w, h).map(c => Object.assign(c, { sz: c.sz * (c.kind === "gem" ? .8 : .62), e: Math.min(c.x, w - c.x, c.y, h - c.y) / (M / 2) })); }
/* faint purple energy crackling along the edges: a few short jagged arcs, re-rolled several times a second */
export function hitArcs(g, w, h, t, a) {
    if (a <= 0) return; const fr = Math.floor(t * 7), M = Math.min(w, h); g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round"; g.lineJoin = "round";
    for (let i = 0; i < 4; i++) {
        const on = hs(fr * 3 + i * 11); if (on < .45) continue; const side = Math.floor(hs(fr + i * 7) * 4), u = hs(fr * 5 + i * 13);
        let x = side === 1 ? w : side === 3 ? 0 : u * w, y = side === 0 ? 0 : side === 2 ? h : u * h, an = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][side] + (hs(fr + i) - .5) * 1.2;
        const pts = [[x, y]]; for (let k = 0; k < 7; k++) { an += (hs(fr * 7 + i * 3 + k) - .5) * 1.4; x += Math.cos(an) * M * .035; y += Math.sin(an) * M * .035; pts.push([x, y]); }
        [[7, "rgba(150,70,255,.16)"], [2.6, "rgba(190,120,255,.5)"], [1.1, "rgba(245,230,255,.85)"]].forEach(([lw, c]) => { g.strokeStyle = c; g.lineWidth = lw; g.globalAlpha = a * (on - .45) / .55; g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); });
    }
    g.restore();
}
/* one sparkle: a four-point star with a soft aura. col = [core, aura] */
export function sparkle(g, x, y, R, a, rot, col) {
    if (a <= 0 || R < .5) return; g.save(); g.globalAlpha *= a; g.translate(x, y); g.globalCompositeOperation = "lighter";
    glow(g, 0, 0, R * 3.2, col[1], .55); g.rotate(rot); g.fillStyle = col[0];
    for (let k = 0; k < 2; k++) { g.beginPath(); g.moveTo(0, -R * 2); g.quadraticCurveTo(R * .16, -R * .16, R * .55, 0); g.quadraticCurveTo(R * .16, R * .16, 0, R * 2); g.quadraticCurveTo(-R * .16, R * .16, -R * .55, 0); g.quadraticCurveTo(-R * .16, -R * .16, 0, -R * 2); g.fill(); g.rotate(Math.PI / 2); g.scale(.7, .7); }
    g.restore();
}
/* the table and the cards, where Hit's sparkles settle */
export function sparkleAnchors() {
    const L = []; document.querySelectorAll("#uno .ucard, #uno .u-opp, #unoDraw, #uno .u-center").forEach(el => { const r = box(el); if (r && r.w > 14 && r.h > 14 && r.y < innerHeight && r.y + r.h > 0) L.push(r); });
    return L;
}

/* ---------- DOMA · Frozen Lotus: rough, layered, heavily frosted ice with a few specks of blood ---------- */
export function domaFrost(W, H) {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d"), M = Math.min(W, H);
    // a cold, uneven haze, thick towards the edges, thin in the middle where the table is
    for (let i = 0; i < 520; i++) { const x = hs(i * 1.37) * W, y = hs(i * 2.71) * H, d = Math.min(x, W - x, y, H - y) / (M / 2), r = M * (.02 + .06 * hs(i * 3.3)); pool(g, x, y, r, "#ffffff", (.05 + .1 * hs(i * 5.1)) * Math.max(.06, 1.25 - Math.min(1, d * 1.15) * 1.2)); }
    // layered ice plates: faint irregular outlines everywhere
    g.strokeStyle = "rgba(255,255,255,.13)"; g.lineWidth = 1.2;
    for (let i = 0; i < 40; i++) { const cx = hs(i * 7.3) * W, cy = hs(i * 3.9) * H, R = M * (.06 + .1 * hs(i * 2.2)), n = 5 + (i % 3); g.beginPath(); for (let k = 0; k <= n; k++) { const an = k / n * TAU + hs(i + k), rr = R * (.7 + .5 * hs(i * 9 + k)); k ? g.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr) : g.moveTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); } g.stroke(); }
    // thick feathered frost growing in from every edge, two layers deep
    g.lineCap = "round"; g.strokeStyle = "#ffffff";
    const fern = (x, y, an, L, d, k) => { if (d > 4 || L < 3) return; const x2 = x + Math.cos(an) * L, y2 = y + Math.sin(an) * L; g.globalAlpha = .6 - d * .1; g.lineWidth = Math.max(.7, 3 - d * .6); g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
        for (let j = 1; j <= 3; j++) { const f = j / 4, bx = x + (x2 - x) * f, by = y + (y2 - y) * f; fern(bx, by, an + .95, L * .45, d + 1, k * 3 + j); fern(bx, by, an - .95, L * .45, d + 1, k * 5 + j); } fern(x2, y2, an + (hs(k) - .5) * .5, L * .64, d + 1, k + 9); };
    for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 70; i++) { const side = i % 4, u = hs(i * 2.7 + layer * 50), x = side === 0 ? u * W : side === 1 ? W : side === 2 ? u * W : 0, y = side === 0 ? 0 : side === 1 ? u * H : side === 2 ? H : u * H;
        fern(x, y, [Math.PI / 2, Math.PI, -Math.PI / 2, 0][side] + (hs(i * 4.1 + layer) - .5) * 1.2, M * (.05 + .1 * hs(i * 6.3 + layer)) * (layer ? 1.5 : 1), 0, i + 1 + layer * 99); }
    g.globalAlpha = .2; g.lineWidth = 1; for (let i = 0; i < 900; i++) { const x = hs(i * 1.9 + 3) * W, y = hs(i * 3.1 + 7) * H, L = 3 + 7 * hs(i); g.beginPath(); g.moveTo(x - L, y); g.lineTo(x + L, y); g.moveTo(x - L * .5, y - L * .87); g.lineTo(x + L * .5, y + L * .87); g.stroke(); }   // rime grain
    g.globalAlpha = .26; g.lineWidth = 1.4; for (let i = 0; i < 10; i++) { let x = hs(i * 9.1) * W, y = hs(i * 4.4) * H, an = hs(i * 3.3) * TAU; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 10; k++) { an += (hs(i * 17 + k) - .5) * .8; x += Math.cos(an) * M * .04; y += Math.sin(an) * M * .04; g.lineTo(x, y); } g.stroke(); }   // old cracks
    // a little blood: small specks and a few thin streaks, away from the middle
    g.globalAlpha = 1;
    for (let c = 0; c < 6; c++) { const side = c % 4, u = .12 + .76 * hs(c * 5.5 + 1), bx = side === 1 ? W * .9 : side === 3 ? W * .1 : u * W, by = side === 0 ? H * .12 : side === 2 ? H * .88 : u * H;
        for (let i = 0; i < 7; i++) { g.fillStyle = "rgba(" + (120 + 40 * hs(c * 9 + i)) + ",8,22," + (.55 + .3 * hs(i * 3 + c)) + ")"; g.beginPath(); g.arc(bx + (hs(c * 13 + i) - .5) * M * .07, by + (hs(c * 7 + i * 2) - .5) * M * .05, .8 + 2.4 * hs(c * 4 + i * 5), 0, TAU); g.fill(); }
        if (c % 2 === 0) { const an = hs(c * 2.3) * TAU, L = M * (.03 + .03 * hs(c)); g.strokeStyle = "rgba(140,10,26,.55)"; g.lineWidth = 1.3; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + Math.cos(an + .4) * L * .6, by + Math.sin(an + .4) * L * .6, bx + Math.cos(an) * L, by + Math.sin(an) * L); g.stroke(); } }
    return cv;
}

/* ---------- JULIUS · Time Magic: Time Stop ---------- */
export const ROMAN = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
/* where the bracelet runs: an ellipse just inside the screen's edges, slightly tilted, as if wrapped round the sphere you are inside */
export function chronoBand(w, h) { const M = Math.min(w, h), phone = w < 600; return { cx: w / 2, cy: h / 2, rx: w * (phone ? .43 : .455), ry: h * (phone ? .45 : .43), tilt: phone ? 0 : -.05, bw: Math.max(16, M * .042) }; }
/* the bracelet: a band of light-blue glassy light with the twelve numerals in white. rot turns the numerals round it, form 0..1 draws it round,
   flash 0..1 lights them up, a = opacity, sc = scale about the centre (the teleport) */
export function chronoRing(g, w, h, o = {}) {
    const B = chronoBand(w, h), form = o.form == null ? 1 : o.form, a = o.a == null ? 1 : o.a, fl = o.flash || 0, sc = o.sc == null ? 1 : o.sc; if (form <= 0 || a <= 0) return;
    g.save(); g.globalAlpha *= a; g.translate(B.cx, B.cy); g.rotate(B.tilt); g.scale(sc, sc);
    const a0 = -Math.PI / 2, a1 = a0 + TAU * form, P = an => [Math.cos(an) * B.rx, Math.sin(an) * B.ry];
    const arc = (dr, lw, col) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); for (let k = 0; k <= 160 * form; k++) { const an = a0 + (a1 - a0) * k / (160 * form || 1); const q = [Math.cos(an) * (B.rx + dr), Math.sin(an) * (B.ry + dr)]; k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.stroke(); };
    g.save(); g.globalCompositeOperation = "lighter"; arc(0, B.bw * 1.9, "rgba(90,170,255," + (.07 + .1 * fl) + ")"); g.restore();      // its glow
    arc(0, B.bw, "rgba(160,218,255," + (.34 + .2 * fl) + ")");                                                                       // the glassy band
    arc(-B.bw * .5, 1.8, "rgba(232,248,255,.95)"); arc(B.bw * .5, 1.8, "rgba(232,248,255,.8)"); arc(-B.bw * .22, 1, "rgba(255,255,255,.3)");   // its edges
    g.strokeStyle = "rgba(235,248,255,.55)"; g.lineWidth = 1.2; g.beginPath();                                                       // minute marks
    for (let k = 0; k < 60; k++) { if (k % 5 === 0) continue; const an = a0 + k / 60 * TAU + (o.rot || 0); if (((an - a0) % TAU + TAU) % TAU > TAU * form) continue; const q = P(an); g.moveTo(q[0] * (1 - .02), q[1] * (1 - .02)); g.lineTo(q[0] * 1.02, q[1] * 1.02); }
    g.stroke();
    g.font = "700 " + Math.round(B.bw * .62) + "px Rajdhani, 'Segoe UI', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    ROMAN.forEach((n, k) => {
        const an = a0 + k / 12 * TAU + (o.rot || 0), rel = ((an - a0) % TAU + TAU) % TAU; if (rel > TAU * form) return; const q = P(an), on = Math.min(1, (TAU * form - rel) / .5);
        g.save(); g.translate(q[0], q[1]); g.rotate(-B.tilt); g.globalAlpha *= on;
        g.shadowColor = "#7cc8ff"; g.shadowBlur = 10 + 18 * fl; g.fillStyle = "#ffffff"; g.fillText(n, 0, 1); g.shadowBlur = 0; g.fillText(n, 0, 1);
        if (fl > 0) { g.globalCompositeOperation = "lighter"; glow(g, 0, 0, B.bw * 1.6, "#bfe6ff", fl * .8); }
        g.restore();
    });
    g.restore();
}
/* slow ripples on the sphere's inner surface */
export function chronoRipples(g, w, h, t, a) {
    if (a <= 0) return; const M = Math.min(w, h); g.save(); g.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) { const q = ((t / 7) + k / 3) % 1, R = M * (.15 + q * .9); g.strokeStyle = "rgba(210,238,255," + (a * .16 * Math.sin(q * Math.PI)) + ")"; g.beginPath(); g.ellipse(w / 2, h / 2, R * w / M * .62, R * h / M * .62, 0, 0, TAU); g.stroke(); }
    g.restore();
}
