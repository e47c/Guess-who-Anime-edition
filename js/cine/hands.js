/* =====================================================================
   CINE HANDS · anime-style hands for the special-card scenes
   hand(g, x, y, s, ang, pose, o)   a whole hand + forearm/sleeve. Wrist at (x, y), fingers point along -y rotated by ang.
   fist(g, x, y, s, ang, o)          a fist seen from the knuckles (punching AT the camera)
   s = scale (1 = a hand about 210 px tall). o: { skin, sleeve, flip, view: "back" | "palm", rim, aura, line, haki, tattoo, mark }
   Drawn the way TV anime draws hands: long tapered fingers, a squarish palm, one even ink line, a flat base colour with ONE
   hard-edged shadow on the side away from the light (top-left of the screen, whichever way the hand turns), short crease
   strokes at the joints, simple nails. Curled fingers are drawn folded: knuckle caps from the back, fingers lying over the
   palm from the front, so a fist or a pointing hand reads at a glance.
   ===================================================================== */
import { TAU, rgba, shade, glow, hs } from "./kit.js?v=7";

export const SKIN = {
    base:   { l: "#fff3ea", b: "#fbd9c2", s: "#e5a98e", d: "#b8705a", ink: "#3d1a12", nail: "#ffe9e1" },
    tan:    { l: "#ffe6cf", b: "#eebd96", s: "#c98a63", d: "#9a5a3c", ink: "#36140a", nail: "#ffe2cf" },
    pale:   { l: "#ffffff", b: "#f8eeeb", s: "#d8c3c8", d: "#a8909b", ink: "#2c1b26", nail: "#ffffff" },
    dark:   { l: "#c99b7b", b: "#a06e50", s: "#734a33", d: "#4e2f1f", ink: "#1a0c06", nail: "#d9b8a2" },
    haki:   { l: "#6a5c80", b: "#26202f", s: "#110d18", d: "#050409", ink: "#000000", nail: "#3a3346", gloss: 1 },
    gold:   { l: "#fff8d2", b: "#f4c654", s: "#c98a1e", d: "#8a5408", ink: "#4a2a00", nail: "#fff3b0", gloss: 1 },
    stp:    { l: "#e6daff", b: "#a088f2", s: "#6a50c8", d: "#3e2a8a", ink: "#140a34", nail: "#ece2ff" },
    stk:    { l: "#eef9ff", b: "#9ad6ff", s: "#509ce0", d: "#2a62a8", ink: "#06224a", nail: "#ffffff" },
    ice:    { l: "#ffffff", b: "#d6f3ff", s: "#8ccbf0", d: "#4a8cc8", ink: "#0c3a64", nail: "#ffffff", gloss: 1 },
    ink:    { l: "#ffffff", b: "#f4f1ea", s: "#f4f1ea", d: "#1a1a1e", ink: "#000000", nail: "#ffffff", flat: 1 },
    shadow: { l: "#3a3446", b: "#0e0c13", s: "#07060b", d: "#000000", ink: "#000000", nail: "#1a1820" },
    ghost:  { l: "#ffffff", b: "#ebf4ff", s: "#b9cfee", d: "#7f97c4", ink: "#1a2a4a", nail: "#ffffff" }
};
/* finger roots (the knuckles) on the back of a RIGHT hand (thumb on the viewer's left), wrist at 0,0.
   L = proximal / middle / distal phalanx, W = width at the knuckle, the two inner joints and the tip. */
const FING = [
    { x: -25, y: -87, a: -.12, L: [42, 26, 21], W: [16.5, 15, 13.6, 12] },     // index
    { x: -8, y: -92, a: -.03, L: [46, 29, 23], W: [17, 15.6, 14, 12.4] },      // middle
    { x: 9, y: -89, a: .07, L: [43, 27, 21], W: [16, 14.6, 13.2, 11.6] },      // ring
    { x: 25, y: -81, a: .17, L: [33, 21, 18], W: [14.4, 13, 11.8, 10.2] }      // pinky
];
/* the thumb: metacarpal (part of the palm mass), proximal and distal phalanx */
const THUMB = { x: -18, y: -16, L: [32, 29, 24], W: [24, 18.5, 16.5, 13.4] };
const F1 = [1, 1, 1], ALL = [F1, F1, F1, F1], Z3 = [0, 0, 0];
/* pose: sp = spread multiplier, f = foreshortening per segment (1 straight, 0 hidden), b = in-plane bend per joint,
   th = thumb { a: metacarpal angle, b: bends at the two joints, f: foreshortening }, curl = folded fingers, thF = thumb drawn over the fingers */
export const POSE = {
    open:   { sp: 1, f: ALL, b: [[0, .03, .03], [0, .02, .02], [0, .02, .03], [0, .04, .05]], th: { a: -.62, b: [-.2, -.08], f: [1, 1] } },
    spread: { sp: 2.3, f: ALL, b: [[-.05, 0, 0], [0, 0, 0], [.03, 0, 0], [.08, .02, 0]], th: { a: -.95, b: [-.3, -.1], f: [1, 1] } },
    relax:  { sp: .9, f: [[.97, .86, .8], [.97, .84, .78], [.96, .83, .77], [.94, .8, .75]], b: [[.04, .08, .08], [.02, .06, .06], [0, .04, .05], [-.02, .02, .04]], th: { a: -.5, b: [-.05, .1], f: [.95, .9] } },
    claw:   { sp: 1.6, f: [[.9, .64, .54], [.92, .62, .52], [.9, .62, .52], [.86, .6, .5]], b: [[-.06, .12, .16], [0, .08, .1], [.04, .06, .08], [.1, .06, .06]], th: { a: -.8, b: [.1, .3], f: [.92, .8] } },
    point:  { sp: .8, f: [F1, Z3, Z3, Z3], b: [[0, .01, .01], Z3, Z3, Z3], th: { a: -.2, b: [.75, .65], f: [.9, .8] }, curl: [0, 1, 1, 1], thF: 1 },
    pointT: { sp: .8, f: [F1, Z3, Z3, Z3], b: [[0, .01, .01], Z3, Z3, Z3], th: { a: -1.05, b: [-.15, -.05], f: [1, 1] }, curl: [0, 1, 1, 1] },   // index up, thumb out to the side (Law's Shambles)
    two:    { sp: .35, f: [F1, F1, Z3, Z3], b: [[.02, .01, 0], [-.02, 0, 0], Z3, Z3], th: { a: -.2, b: [.8, .7], f: [.9, .8] }, curl: [0, 0, 1, 1], thF: 1 },
    cross:  { sp: .3, f: [F1, [1, .98, .96], Z3, Z3], b: [[.16, .02, 0], [-.34, .04, .02], Z3, Z3], th: { a: -.2, b: [.8, .7], f: [.9, .8] }, curl: [0, 0, 1, 1], ord: [3, 2, 0, 1], thF: 1 },
    fist:   { sp: .85, f: [Z3, Z3, Z3, Z3], b: [Z3, Z3, Z3, Z3], th: { a: -.28, b: [.6, .75], f: [.9, .78] }, curl: [1, 1, 1, 1], thF: 1 },
    cup:    { sp: .7, f: [[.96, .84, .76], [.96, .82, .74], [.95, .82, .74], [.94, .8, .72]], b: [[.03, .06, .06], [0, .05, .05], [-.02, .04, .05], [-.05, .03, .04]], th: { a: -.55, b: [-.05, .12], f: [.95, .88] } },
    blade:  { sp: .15, f: ALL, b: [[.05, 0, 0], [0, 0, 0], [-.03, 0, 0], [-.08, 0, 0]], th: { a: -.32, b: [-.05, 0], f: [.95, .9] } }
};

/* tapered capsule from (x0,y0) radius r0 to (x1,y1) radius r1 */
function cap(g, x0, y0, x1, y1, r0, r1) {
    const a = Math.atan2(y1 - y0, x1 - x0); g.moveTo(x0 + Math.cos(a + 1.5708) * r0, y0 + Math.sin(a + 1.5708) * r0);
    g.arc(x0, y0, r0, a + 1.5708, a + 4.7124); g.arc(x1, y1, r1, a - 1.5708, a + 1.5708); g.closePath();
}
/* flat cel fill across a segment: base colour, then ONE hard shadow band on the side facing away from the light */
function cel(g, P, mx, my, nx, ny, r, lx, ly, k) {
    if (nx * lx + ny * ly < 0) { nx = -nx; ny = -ny; }
    const gr = g.createLinearGradient(mx + nx * r, my + ny * r, mx - nx * r, my - ny * r), cut = k == null ? .64 : k;
    if (P.flat) { gr.addColorStop(0, P.b); gr.addColorStop(1, P.b); return gr; }
    gr.addColorStop(0, P.b); gr.addColorStop(cut - .01, P.b); gr.addColorStop(cut, P.s); gr.addColorStop(1, P.s);
    return gr;
}
/* the back of the hand: square-ish, wider at the knuckles, the thumb's base bulging on the left */
function palmPath(g) {
    g.moveTo(-27, 6); g.bezierCurveTo(-30, -10, -40, -26, -40, -46); g.bezierCurveTo(-40, -62, -37, -78, -33, -88);
    g.quadraticCurveTo(-26, -97, -15, -96); g.quadraticCurveTo(-8, -101, 1, -98); g.quadraticCurveTo(10, -98, 18, -93); g.quadraticCurveTo(28, -90, 33, -80);
    g.bezierCurveTo(37, -62, 36, -36, 32, -16); g.bezierCurveTo(30, -6, 29, 2, 28, 6); g.quadraticCurveTo(0, 12, -27, 6); g.closePath();
}

export function hand(g, x, y, s, ang, pose, o = {}) {
    const P = typeof o.skin === "object" ? o.skin : SKIN[o.skin || "base"], Q = POSE[pose] || POSE.open, palm = o.view === "palm", fl = (o.flip ? -1 : 1) * (palm ? -1 : 1);
    const lw = (o.line || 2.4) / s, Ls = [-.55, -.83], c = Math.cos(ang), sn = Math.sin(ang), lx = (Ls[0] * c + Ls[1] * sn) * fl, ly = -Ls[0] * sn + Ls[1] * c;
    const curl = Q.curl || [0, 0, 0, 0];
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(fl * s, s); g.lineJoin = "round"; g.lineCap = "round";
    // ---- geometry ----
    const sp = Q.sp, ord = Q.ord || [3, 2, 1, 0], fingers = [], folds = [];
    FING.forEach((F, i) => {
        let a = F.a * sp, px = F.x, py = F.y; const segs = [];
        if (curl[i]) {
            if (!palm) {      // from the back a folded finger is a knuckle cap: the proximal phalanx, seen end-on
                const L = F.L[0] * .4; segs.push({ x0: px, y0: py, x1: px + Math.sin(a) * L, y1: py - Math.cos(a) * L, r0: F.W[0] / 2 * 1.04, r1: F.W[0] / 2 * .98, f: .4, j: 0, a, knuckle: 1 });
            } else {          // from the front the folded finger lies over the palm: a short stub up, then the finger running back down
                const up = F.L[0] * .3, mx0 = px + Math.sin(a) * up, my0 = py - Math.cos(a) * up, a2 = a + Math.PI - .08 * (i - 1.5);
                const m1 = [mx0 + Math.sin(a2) * F.L[1] * .95, my0 - Math.cos(a2) * F.L[1] * .95], a3 = a2 - .35, m2 = [m1[0] + Math.sin(a3) * F.L[2] * .78, m1[1] - Math.cos(a3) * F.L[2] * .78];
                segs.push({ x0: px, y0: py, x1: mx0, y1: my0, r0: F.W[0] / 2, r1: F.W[1] / 2 * 1.08, f: .3, j: 0, a });
                folds[i] = [{ x0: mx0, y0: my0, x1: m1[0], y1: m1[1], r0: F.W[1] / 2 * 1.08, r1: F.W[2] / 2, f: 1, j: 1, a: a2 }, { x0: m1[0], y0: m1[1], x1: m2[0], y1: m2[1], r0: F.W[2] / 2, r1: F.W[3] / 2 * 1.05, f: 1, j: 2, a: a3 }];
            }
        } else for (let j = 0; j < 3; j++) {
            const f = Q.f[i][j]; if (f <= .02) break; a += Q.b[i][j];
            const L = F.L[j] * f, ex = px + Math.sin(a) * L, ey = py - Math.cos(a) * L; segs.push({ x0: px, y0: py, x1: ex, y1: ey, r0: F.W[j] / 2, r1: F.W[j + 1] / 2, f, j, a }); px = ex; py = ey;
        }
        fingers[i] = segs;
    });
    const T = Q.th, thumb = []; { let a = T.a, px = THUMB.x, py = THUMB.y; for (let j = 0; j < 3; j++) { const f = j ? T.f[j - 1] : 1; if (f <= .02) break; if (j) a += T.b[j - 1]; const L = THUMB.L[j] * f, ex = px + Math.sin(a) * L, ey = py - Math.cos(a) * L; thumb.push({ x0: px, y0: py, x1: ex, y1: ey, r0: THUMB.W[j] / 2, r1: THUMB.W[j + 1] / 2, f, j, a }); px = ex; py = ey; } }
    // one smooth outline per digit: up the left side through every joint, round the tip, back down the right side
    const digit = (segs, closed) => {
        if (!segs.length) return; const n = segs.length, side = k => { const sg = segs[Math.min(k, n - 1)], pv = segs[k - 1], a = k > 0 && k < n ? (sg.a + pv.a) / 2 : sg.a, r = k < n ? sg.r0 : sg.r1, x = k < n ? sg.x0 : sg.x1, y = k < n ? sg.y0 : sg.y1; return [x, y, Math.cos(a) * r, Math.sin(a) * r]; };
        const pts = []; for (let k = 0; k < n; k++) pts.push(side(k));
        const tp = segs[n - 1]; g.moveTo(pts[0][0] - pts[0][2], pts[0][1] - pts[0][3]); for (let k = 1; k < n; k++) g.lineTo(pts[k][0] - pts[k][2], pts[k][1] - pts[k][3]);
        if (tp.knuckle) { const r = tp.r1, a = tp.a, ca = Math.cos(a), sa = Math.sin(a); g.lineTo(tp.x1 - ca * r, tp.y1 - sa * r); g.quadraticCurveTo(tp.x1 - ca * r + sa * r * .9, tp.y1 - sa * r - ca * r * .9, tp.x1 + sa * r * .9, tp.y1 - ca * r * .9); g.quadraticCurveTo(tp.x1 + ca * r + sa * r * .9, tp.y1 + sa * r - ca * r * .9, tp.x1 + ca * r, tp.y1 + sa * r); }   // a squarer cap
        else g.arc(tp.x1, tp.y1, tp.r1, tp.a + Math.PI, tp.a + TAU);
        for (let k = n - 1; k >= 0; k--) g.lineTo(pts[k][0] + pts[k][2], pts[k][1] + pts[k][3]); if (closed) g.closePath();
    };
    const segFill = (sg, k) => { const mx = (sg.x0 + sg.x1) / 2, my = (sg.y0 + sg.y1) / 2, dx = sg.x1 - sg.x0, dy = sg.y1 - sg.y0, L = Math.hypot(dx, dy) || 1; return cel(g, P, mx, my, -dy / L, dx / L, (sg.r0 + sg.r1) / 2, lx, ly, k); };
    const fillDigit = (segs, k) => { if (!segs || !segs.length) return; g.save(); g.beginPath(); digit(segs, true); g.clip(); segs.forEach(sg => { g.beginPath(); cap(g, sg.x0, sg.y0, sg.x1, sg.y1, sg.r0 * 1.3, sg.r1 * 1.3); g.fillStyle = segFill(sg, sg.knuckle ? .5 : k); g.fill(); });
        const r = segs[0]; if (!P.flat) { const L = Math.hypot(r.x1 - r.x0, r.y1 - r.y0) || 1, gr = g.createLinearGradient(r.x0, r.y0, r.x0 + (r.x1 - r.x0) / L * 14, r.y0 + (r.y1 - r.y0) / L * 14); gr.addColorStop(0, rgba(P.d, .38)); gr.addColorStop(1, rgba(P.d, 0)); g.fillStyle = gr; g.fillRect(r.x0 - 30, r.y0 - 30, 60, 60); }   // contact shadow where the finger leaves the hand
        g.restore(); };
    const lineDigit = segs => { if (!segs || !segs.length) return; g.beginPath(); digit(segs, false); g.lineWidth = lw * .95; g.strokeStyle = P.ink; g.stroke(); };
    // ---- forearm / sleeve ----
    const sl = o.sleeve, slen = sl ? (sl.len || 250) : (o.arm == null ? 170 : o.arm), w0 = sl ? 38 : 27, w1 = sl ? (sl.w || 60) : 33;
    const arm = () => { g.beginPath(); g.moveTo(-w0, -12); g.lineTo(w0, -12); g.lineTo(w1, slen); g.lineTo(-w1, slen); g.closePath(); };
    // 1) one heavy silhouette line under everything, so the outer outline is a single even stroke
    g.strokeStyle = P.ink; g.lineWidth = lw * 2.3;
    if (slen > 0) { arm(); g.stroke(); }
    g.beginPath(); palmPath(g); g.stroke(); fingers.forEach(f => { if (f.length) { g.beginPath(); digit(f, true); g.stroke(); } }); if (thumb.length) { g.beginPath(); digit(thumb, true); g.stroke(); }
    // 2) fills: arm, then (back view) thumb under the hand, palm, fingers; (palm view, or thumb folded over) thumb on top
    if (slen > 0) {
        const C = sl ? sl.c : P.b, S = sl ? (sl.s || shade(sl.c, -.35)) : P.s, gr = g.createLinearGradient(lx * 60, 0, -lx * 60, 0);
        gr.addColorStop(0, C); gr.addColorStop(.6, C); gr.addColorStop(.61, S); gr.addColorStop(1, S);
        arm(); g.fillStyle = gr; g.fill();
        if (sl) { g.save(); arm(); g.clip(); g.strokeStyle = rgba(shade(S, -.4), .55); g.lineWidth = lw * 1.1;      // cloth folds, inside the sleeve
            for (let i = 0; i < 3; i++) { const yy = slen * (.22 + i * .26); g.beginPath(); g.moveTo(-w1 * .9, yy); g.quadraticCurveTo(-w1 * .35, yy + slen * .05, -w1 * .05, yy + slen * .02); g.stroke(); g.beginPath(); g.moveTo(w1 * .85, yy + slen * .08); g.quadraticCurveTo(w1 * .3, yy + slen * .12, w1 * .12, yy + slen * .2); g.stroke(); }
            g.restore();
            if (sl.mark) { g.save(); g.scale(fl, 1); g.fillStyle = sl.markCol || "#fff"; g.font = "700 26px sans-serif"; g.textAlign = "center"; g.fillText(sl.mark, 0, Math.min(110, slen * .6)); g.restore(); } }
    }
    const palmFill = () => {
        const gr = g.createLinearGradient(lx * 50, -46 + ly * 50, -lx * 50, -46 - ly * 50);
        if (P.flat) { gr.addColorStop(0, P.b); gr.addColorStop(1, P.b); } else { gr.addColorStop(0, P.b); gr.addColorStop(.66, P.b); gr.addColorStop(.67, P.s); gr.addColorStop(1, P.s); }
        g.beginPath(); palmPath(g); g.fillStyle = gr; g.fill();
        if (P.gloss) { g.save(); g.beginPath(); palmPath(g); g.clip(); g.fillStyle = rgba(P.l, .5); g.beginPath(); g.ellipse(-12 * (lx < 0 ? 1 : -1), -60, 8, 24, -.3, 0, TAU); g.fill(); g.restore(); }
    };
    const thTop = palm;                         // from the back a folded thumb sits behind the fingers
    if (!thTop) { fillDigit(thumb); lineDigit(thumb); }
    palmFill();
    if (sl && sl.cuff) { g.beginPath(); g.moveTo(-w0 - 3, -2); g.lineTo(w0 + 3, -2); g.lineTo(w0 + 5, 20); g.lineTo(-w0 - 5, 20); g.closePath(); g.fillStyle = sl.cuff; g.fill(); g.lineWidth = lw * 1.2; g.strokeStyle = P.ink; g.stroke(); g.fillStyle = rgba(shade(sl.cuff, -.3), .6); g.fillRect(-w0 - 3, 14, w0 * 2 + 6, 6); }
    ord.forEach(i => { fillDigit(fingers[i]); lineDigit(fingers[i]); });
    // 3) palm-side details go under the folded fingers: creases of the palm
    if (palm) {
        g.strokeStyle = rgba(P.d, .55); g.lineWidth = lw * .8;
        g.beginPath(); g.moveTo(-36, -70); g.quadraticCurveTo(-4, -63, 31, -74); g.stroke();                      // heart line
        g.beginPath(); g.moveTo(-38, -56); g.quadraticCurveTo(-8, -48, 22, -44); g.stroke();                      // head line
        g.beginPath(); g.moveTo(-34, -64); g.quadraticCurveTo(-20, -30, -12, 2); g.stroke();                      // life line round the thumb
        g.strokeStyle = rgba(P.d, .3); g.beginPath(); g.moveTo(6, -6); g.quadraticCurveTo(8, -30, 2, -54); g.stroke();
    }
    folds.forEach(fd => { if (fd) { fillDigit(fd, .7); lineDigit(fd); } });
    if (thTop) { fillDigit(thumb); lineDigit(thumb); }
    // 4) details: knuckle lines, joint creases, nails (back) / finger pads (palm)
    const crease = (sg, k, n2) => { const a = sg.a, nx = Math.cos(a), ny = Math.sin(a), r = sg.r0 * k; for (let q = 0; q < (n2 || 1); q++) { const x = sg.x0 - Math.sin(a) * q * 3, y = sg.y0 + Math.cos(a) * q * 3; g.beginPath(); g.moveTo(x - nx * r, y - ny * r); g.quadraticCurveTo(x + Math.sin(a) * 2.2, y - Math.cos(a) * 2.2, x + nx * r, y + ny * r); g.stroke(); } };
    g.lineWidth = lw * .7;
    if (!palm) {
        g.strokeStyle = rgba(P.ink, .55);
        FING.forEach((F, i) => { const k = fingers[i][0]; if (!k) return; const cu = curl[i];
            g.beginPath(); const r = F.W[0] * .34; g.arc(F.x + Math.sin(k.a) * 2, F.y - Math.cos(k.a) * 2 + 5, r, Math.PI * 1.15 + k.a, Math.PI * 1.85 + k.a); g.stroke();       // the knuckle bump
            if (cu) { g.strokeStyle = rgba(P.d, .7); g.beginPath(); g.moveTo(k.x1 - Math.cos(k.a) * k.r1 * .7, k.y1 - Math.sin(k.a) * k.r1 * .7 + 2); g.lineTo(k.x1 + Math.cos(k.a) * k.r1 * .7, k.y1 + Math.sin(k.a) * k.r1 * .7 + 2); g.stroke(); g.strokeStyle = rgba(P.ink, .55); }
            else { g.save(); g.strokeStyle = rgba(P.d, .35); g.beginPath(); g.moveTo(F.x * .45, -16); g.quadraticCurveTo(F.x * .8, -54, F.x, F.y + 9); g.stroke(); g.restore(); } });   // tendons
        fingers.forEach(segs => segs.forEach(sg => { if (sg.knuckle) return; if (sg.j === 1 && sg.f > .45) crease(sg, .45, 2); if (sg.j === 2 && sg.f > .45) { crease(sg, .4, 1); nail(g, sg, P, lw); } }));
        if (thumb[2] && thumb[2].f > .5 && !Q.thF) { crease(thumb[2], .4, 1); nail(g, thumb[2], P, lw); }      // a folded thumb is hidden behind the fingers
    } else {
        g.strokeStyle = rgba(P.d, .6);
        fingers.forEach(segs => segs.forEach(sg => { if (sg.j > 0 && sg.f > .4) crease(sg, .55, 1); }));
        if (thumb[2]) crease(thumb[2], .55, 1);
        folds.forEach(fd => { if (fd) crease(fd[1], .6, 1); });
    }
    if (o.tattoo && !palm) {      // finger tattoos (back of the hand only): 5 letters = thumb + four fingers in reading order (Law's D E A T H), 4 = fingers only
        const L = o.tattoo, five = L.length >= 5, ink = "#15121c";
        const put = (sg, ch, k) => { if (!sg || !ch) return; const mx = sg.x0 + (sg.x1 - sg.x0) * .55, my = sg.y0 + (sg.y1 - sg.y0) * .55, sz = (sg.r0 + sg.r1) * k;
            g.save(); g.translate(mx, my); g.rotate(sg.a * .4); g.scale(fl, 1); g.font = "900 " + sz.toFixed(1) + "px 'Arial Black', 'Segoe UI Black', Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
            g.lineJoin = "round"; g.strokeStyle = rgba(P.l, .35); g.lineWidth = sz * .12; g.strokeText(ch, 0, 0); g.fillStyle = rgba(ink, .92); g.fillText(ch, 0, 0); g.restore(); };
        FING.forEach((F, i) => { const sg = fingers[i][0]; put(sg, L[five ? i + 1 : i], sg && sg.knuckle ? .8 : 1.02); });
        if (five && !Q.thF) put(thumb[1] || thumb[0], L[0], .92);       // a thumb folded behind the fingers hides its letter, as it would
    }
    if (o.mark && !palm) {        // Law's mark on the back of the hand: a solid black cross with flared arms
        g.save(); g.translate(-2, -48); g.scale(fl, 1); g.fillStyle = "#15121c"; g.beginPath();
        for (let k = 0; k < 4; k++) { const a0 = k * Math.PI / 2, c0 = Math.cos(a0), s0 = Math.sin(a0), P2 = (u, v) => [u * c0 - v * s0, u * s0 + v * c0];
            const p1 = P2(-3.2, -3.2), p2 = P2(-7.5, -16), p3 = P2(0, -13.5), p4 = P2(7.5, -16), p5 = P2(3.2, -3.2);
            if (!k) g.moveTo(p1[0], p1[1]); else g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.quadraticCurveTo(p3[0], p3[1], p4[0], p4[1]); g.lineTo(p5[0], p5[1]); }
        g.closePath(); g.fill(); g.restore();
    }
    // 5) haki coat lightning, rim light, aura
    if (o.haki) { g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = o.haki; g.lineWidth = lw * 1.4; const fr = Math.floor((o.t || 0) * 18);
        for (let i = 0; i < 6; i++) { let bx = -36 + hs(i + fr) * 72, by = -100 + hs(i * 3 + fr) * 100; g.beginPath(); g.moveTo(bx, by); for (let k = 0; k < 4; k++) { bx += (hs(i * 7 + k + fr) - .5) * 28; by += 8 + hs(i * 5 + k + fr) * 13; g.lineTo(bx, by); } g.stroke(); } g.restore(); }
    if (o.rim || o.aura) {
        const rc = o.rim || o.aura, w = lw * (o.aura ? 3.2 : 1.5); g.save(); g.globalCompositeOperation = "lighter"; g.beginPath(); palmPath(g); fingers.forEach(f => digit(f, true)); if (thumb.length) digit(thumb, true);
        if (o.aura) { g.strokeStyle = rgba(rc, .16); g.lineWidth = w * 5; g.stroke(); g.strokeStyle = rgba(rc, .3); g.lineWidth = w * 2.4; g.stroke(); }
        g.strokeStyle = rgba(rc, o.aura ? .85 : .6); g.lineWidth = w; g.stroke(); g.restore();
    }
    g.restore();
}
/* a simple anime nail: a rounded plate on the last phalanx, a thin line and one small glint */
function nail(g, sg, P, lw) {
    const dx = sg.x1 - sg.x0, dy = sg.y1 - sg.y0, a = Math.atan2(dy, dx), L = Math.hypot(dx, dy), mx = sg.x0 + dx * .66, my = sg.y0 + dy * .66, w = sg.r1 * .64, ln = L * .32;
    g.save(); g.translate(mx, my); g.rotate(a); g.beginPath(); g.moveTo(-ln, -w); g.lineTo(ln * .7, -w); g.quadraticCurveTo(ln * 1.25, 0, ln * .7, w); g.lineTo(-ln, w); g.quadraticCurveTo(-ln * 1.25, 0, -ln, -w); g.closePath();
    g.fillStyle = P.nail; g.fill(); g.strokeStyle = rgba(P.ink, .45); g.lineWidth = lw * .6; g.stroke();
    g.strokeStyle = rgba("#ffffff", .7); g.lineWidth = lw * .5; g.beginPath(); g.moveTo(-ln * .4, -w * .45); g.lineTo(ln * .2, -w * .5); g.stroke(); g.restore();
}

/* a fist punching AT the camera: knuckles front, folded fingers, thumb wrapped across. Centre at (x, y); about 120 px wide at s = 1 */
export function fist(g, x, y, s, ang, o = {}) {
    const P = typeof o.skin === "object" ? o.skin : SKIN[o.skin || "base"], lw = (o.line || 2.4) / s, fl = o.flip ? -1 : 1;
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(fl * s, s); g.lineJoin = "round"; g.lineCap = "round";
    const vg = (y0, y1, dark) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, dark ? P.s : P.b); gr.addColorStop(.62, dark ? P.s : P.b); gr.addColorStop(.63, dark ? P.d : P.s); gr.addColorStop(1, dark ? P.d : P.s); return gr; };
    const R = (x0, y0, w0, h0, r) => { g.moveTo(x0 + r, y0); g.arcTo(x0 + w0, y0, x0 + w0, y0 + h0, r); g.arcTo(x0 + w0, y0 + h0, x0, y0 + h0, r); g.arcTo(x0, y0 + h0, x0, y0, r); g.arcTo(x0, y0, x0 + w0, y0, r); g.closePath(); };
    const top = [[-50, 25], [-24, 27], [4, 26], [31, 22]], mid = [[-48, 23], [-23, 25], [3, 24], [28, 20]];
    const shapes = [];
    if (o.sleeve) shapes.push([() => { g.moveTo(-40, 30); g.lineTo(40, 30); g.lineTo(54, 120); g.lineTo(-54, 120); g.closePath(); }, () => o.sleeve.c, 1]);
    shapes.push([() => R(-56, -40, 112, 92, 26), () => vg(-40, 52, 1), 0]);                                   // the hand mass
    top.forEach(([x0, w0], i) => shapes.push([() => R(x0, -48 + (i === 0 || i === 3 ? 5 : 0), w0, 34, 10), () => vg(-48, -14), 0]));      // knuckle row
    mid.forEach(([x0, w0], i) => shapes.push([() => R(x0 + 1, -14 + (i === 3 ? 2 : 0), w0, 26, 8), () => vg(-14, 12, 0), 0]));       // folded middle phalanges
    shapes.push([() => { g.moveTo(-60, -6); g.bezierCurveTo(-66, 20, -50, 46, -30, 48); g.lineTo(-44, 6); g.closePath(); }, () => vg(-6, 48, 1), 0]);   // thenar
    shapes.push([() => { cap(g, -56, 10, 2, 20, 13.5, 11); }, () => vg(0, 32), 0]);                           // thumb across
    g.strokeStyle = P.ink; g.lineWidth = lw * 2.2; shapes.forEach(([p]) => { g.beginPath(); p(); g.stroke(); });
    shapes.forEach(([p, f]) => { g.beginPath(); p(); g.fillStyle = f(); g.fill(); g.strokeStyle = P.ink; g.lineWidth = lw * .9; g.stroke(); });
    g.strokeStyle = rgba(P.l, .9); g.lineWidth = lw * 1.1; top.forEach(([x0, w0], i) => { g.beginPath(); g.moveTo(x0 + w0 * .25, -42 + (i === 0 || i === 3 ? 5 : 0)); g.lineTo(x0 + w0 * .7, -43 + (i === 0 || i === 3 ? 5 : 0)); g.stroke(); });   // one glint per knuckle
    g.save(); g.translate(0, 20); g.rotate(.17); g.beginPath(); g.ellipse(-6, -1, 6.5, 6, 0, 0, TAU); g.fillStyle = P.nail; g.fill(); g.strokeStyle = rgba(P.ink, .5); g.lineWidth = lw * .7; g.stroke(); g.restore();
    if (P.gloss) { g.fillStyle = rgba(P.l, .5); g.beginPath(); g.ellipse(-20, -30, 22, 6, -.1, 0, TAU); g.fill(); }
    if (o.haki) { g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = o.haki; g.lineWidth = lw * 1.3; const fr = Math.floor((o.t || 0) * 18);
        for (let i = 0; i < 5; i++) { let bx = -50 + hs(i + fr) * 100, by = -46 + hs(i * 3 + fr) * 30; g.beginPath(); g.moveTo(bx, by); for (let k = 0; k < 4; k++) { bx += (hs(i * 7 + k + fr) - .5) * 30; by += 7 + hs(i * 5 + k + fr) * 12; g.lineTo(bx, by); } g.stroke(); } g.restore(); }
    if (o.aura) { g.save(); g.globalCompositeOperation = "lighter"; g.beginPath(); R(-58, -50, 116, 104, 32); g.strokeStyle = rgba(o.aura, .16); g.lineWidth = lw * 14; g.stroke(); g.strokeStyle = rgba(o.aura, .3); g.lineWidth = lw * 7; g.stroke(); g.strokeStyle = rgba(o.aura, .9); g.lineWidth = lw * 3; g.stroke(); g.restore(); }
    g.restore();
}
/* cheap version for crowds of tiny fists (barrages): one cel-shaded blob with knuckle marks */
export function fistMini(g, x, y, r, ang, P, rim) {
    P = typeof P === "object" ? P : SKIN[P || "base"]; g.save(); g.translate(x, y); g.rotate(ang);
    const gr = g.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, P.b); gr.addColorStop(.55, P.b); gr.addColorStop(.56, P.s); gr.addColorStop(1, P.s);
    g.beginPath(); g.ellipse(0, 0, r, r * .82, 0, 0, TAU); g.fillStyle = gr; g.fill(); g.lineWidth = Math.max(1.2, r * .11); g.strokeStyle = P.ink; g.stroke();
    g.strokeStyle = rgba(P.ink, .75); g.lineWidth = Math.max(1, r * .06); for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * r * .42, -r * .72); g.lineTo(i * r * .42, -r * .15); g.stroke(); }
    if (rim) glow(g, 0, 0, r * 2.2, rim, .35); g.restore();
}
/* where the fingertips of a pose are (back view of a right hand, wrist at 0,0, scale 1, fingers up):
   [index, middle, ring, pinky, thumb] as [x, y]. Rotate / scale / mirror them the same way as the hand. */
export function handTips(pose) {
    const Q = POSE[pose] || POSE.open, curl = Q.curl || [0, 0, 0, 0], out = [];
    FING.forEach((F, i) => { let a = F.a * Q.sp, px = F.x, py = F.y; if (!curl[i]) for (let j = 0; j < 3; j++) { const f = Q.f[i][j]; if (f <= .02) break; a += Q.b[i][j]; px += Math.sin(a) * F.L[j] * f; py -= Math.cos(a) * F.L[j] * f; } out.push([px, py]); });
    let a = Q.th.a, px = THUMB.x, py = THUMB.y; for (let j = 0; j < 3; j++) { const f = j ? Q.th.f[j - 1] : 1; if (j) a += Q.th.b[j - 1]; px += Math.sin(a) * THUMB.L[j] * f; py -= Math.cos(a) * THUMB.L[j] * f; } out.push([px, py]);
    return out;
}
