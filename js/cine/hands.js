/* =====================================================================
   CINE HANDS · cel-shaded anime hands for the special-card scenes
   hand(g, x, y, s, ang, pose, o)   a whole hand + forearm/sleeve. Wrist at (x, y), fingers point along -y rotated by ang.
   fist(g, x, y, s, ang, o)          a fist seen from the knuckles (punching AT the camera)
   s = scale (1 = a hand about 210 px tall). o: { skin, sleeve, flip, view: "back" | "palm", rim, aura, line, haki, tattoo }
   Anatomy: palm + 4 three-segment fingers + a two-segment thumb. Each segment is a tapered capsule with a
   three-tone cel gradient lit from the top-left of the screen, so the light stays put however the hand turns.
   Curling a finger toward the palm is drawn as foreshortening (`f`), spreading/bending as in-plane angles (`b`).
   ===================================================================== */
import { TAU, rgba, shade, glow, hs } from "./kit.js";

export const SKIN = {
    base:   { l: "#fff1e6", b: "#f7cdb0", s: "#e0a085", d: "#b8705a", ink: "#3a160e", nail: "#ffe7df" },
    tan:    { l: "#ffe1c6", b: "#eab48a", s: "#c9875f", d: "#9a5a3c", ink: "#331207", nail: "#ffe0cd" },
    pale:   { l: "#ffffff", b: "#f6ebe8", s: "#d9c6ca", d: "#a8909b", ink: "#2a1a24", nail: "#ffffff" },
    dark:   { l: "#c99b7b", b: "#9c6a4c", s: "#734a33", d: "#4e2f1f", ink: "#1a0c06", nail: "#d9b8a2" },
    haki:   { l: "#6a5c80", b: "#221c2c", s: "#100c16", d: "#050409", ink: "#000000", nail: "#3a3346", gloss: 1 },
    gold:   { l: "#fff8d2", b: "#f2c14a", s: "#c98a1e", d: "#8a5408", ink: "#4a2a00", nail: "#fff3b0", gloss: 1 },
    stp:    { l: "#e6daff", b: "#9b80f0", s: "#6a50c8", d: "#3e2a8a", ink: "#140a34", nail: "#ece2ff" },
    stk:    { l: "#eef9ff", b: "#93d2ff", s: "#509ce0", d: "#2a62a8", ink: "#06224a", nail: "#ffffff" },
    ice:    { l: "#ffffff", b: "#d2f1ff", s: "#8ccbf0", d: "#4a8cc8", ink: "#0c3a64", nail: "#ffffff", gloss: 1 },
    ink:    { l: "#ffffff", b: "#f4f1ea", s: "#f4f1ea", d: "#1a1a1e", ink: "#000000", nail: "#ffffff" },
    shadow: { l: "#3a3446", b: "#0d0b12", s: "#08070c", d: "#000000", ink: "#000000", nail: "#1a1820" },
    ghost:  { l: "#ffffff", b: "#e9f3ff", s: "#b9cfee", d: "#7f97c4", ink: "#1a2a4a", nail: "#ffffff" }
};
/* finger roots on the back of a RIGHT hand (thumb on the viewer's left), wrist at 0,0 */
const FING = [
    { x: -28, y: -97, a: -.15, L: [37, 24, 20], W: [20, 17.5, 15.5] },    // index
    { x: -8, y: -103, a: -.04, L: [41, 27, 21], W: [21, 18.5, 16] },      // middle
    { x: 12, y: -100, a: .07, L: [38, 25, 20], W: [19.5, 17, 15] },       // ring
    { x: 30, y: -91, a: .19, L: [29, 19, 17], W: [17, 15, 13] }           // pinky
];
const THUMB = { x: -38, y: -44, L: [31, 25], W: [25, 21, 17.5] };
const F1 = [1, 1, 1], ALL = [F1, F1, F1, F1], Z3 = [0, 0, 0];
/* pose: sp = spread multiplier, f = foreshortening per segment (1 straight, 0 hidden), b = in-plane bend per joint, th = thumb */
export const POSE = {
    open:   { sp: 1, f: ALL, b: [[0, .03, .03], [0, .02, .02], [0, .02, .03], [0, .04, .05]], th: { a: -1.0, b: [.18, .14], f: [1, 1] } },
    spread: { sp: 2.3, f: ALL, b: [[-.05, 0, 0], [0, 0, 0], [.03, 0, 0], [.08, .02, 0]], th: { a: -1.45, b: [.06, .04], f: [1, 1] } },
    relax:  { sp: .9, f: [[.95, .84, .78], [.95, .8, .76], [.93, .79, .74], [.9, .76, .72]], b: [[.04, .08, .08], [.02, .06, .06], [0, .04, .05], [-.02, .02, .04]], th: { a: -.8, b: [.26, .2], f: [.95, .9] } },
    claw:   { sp: 1.6, f: [[.88, .62, .52], [.9, .6, .5], [.88, .6, .5], [.85, .58, .48]], b: [[-.06, .12, .16], [0, .08, .1], [.04, .06, .08], [.1, .06, .06]], th: { a: -1.2, b: [.42, .42], f: [.9, .8] } },
    point:  { sp: .8, f: [F1, [.58, .3, 0], [.55, .28, 0], [.5, .25, 0]], b: [[0, .01, .01], Z3, Z3, Z3], th: { a: -.35, b: [.95, .55], f: [.85, .72] }, curl: [0, 1, 1, 1], thF: 1 },
    two:    { sp: .35, f: [F1, F1, [.55, .28, 0], [.5, .25, 0]], b: [[.02, .01, 0], [-.02, 0, 0], Z3, Z3], th: { a: -.35, b: [.95, .55], f: [.85, .72] }, curl: [0, 0, 1, 1], thF: 1 },
    cross:  { sp: .3, f: [F1, [1, .98, .96], [.55, .28, 0], [.5, .25, 0]], b: [[.14, .02, 0], [-.36, .04, .02], Z3, Z3], th: { a: -.35, b: [.95, .55], f: [.85, .72] }, curl: [0, 0, 1, 1], ord: [3, 2, 0, 1], thF: 1 },
    fist:   { sp: .9, f: [[.5, 0, 0], [.52, 0, 0], [.5, 0, 0], [.45, 0, 0]], b: [Z3, Z3, Z3, Z3], th: { a: -.25, b: [.55, .3], f: [.75, .55] }, curl: [1, 1, 1, 1], thF: 1 },
    cup:    { sp: .7, f: [[.96, .82, .74], [.96, .8, .72], [.95, .8, .72], [.94, .78, .7]], b: [[.03, .06, .06], [0, .05, .05], [-.02, .04, .05], [-.05, .03, .04]], th: { a: -.9, b: [.3, .3], f: [.92, .85] } },
    blade:  { sp: .15, f: ALL, b: [[.05, 0, 0], [0, 0, 0], [-.03, 0, 0], [-.08, 0, 0]], th: { a: -.5, b: [.25, .15], f: [.9, .85] } }
};

/* tapered capsule from (x0,y0) radius r0 to (x1,y1) radius r1 */
function cap(g, x0, y0, x1, y1, r0, r1) {
    const a = Math.atan2(y1 - y0, x1 - x0); g.moveTo(x0 + Math.cos(a + 1.5708) * r0, y0 + Math.sin(a + 1.5708) * r0);
    g.arc(x0, y0, r0, a + 1.5708, a + 4.7124); g.arc(x1, y1, r1, a - 1.5708, a + 1.5708); g.closePath();
}
/* three-tone cel gradient across a segment, the lit side facing light vector (lx, ly) */
function celX(g, P, mx, my, nx, ny, r, lx, ly, dark) {
    if (nx * lx + ny * ly < 0) { nx = -nx; ny = -ny; }
    const gr = g.createLinearGradient(mx + nx * r, my + ny * r, mx - nx * r, my - ny * r), d = dark || 0;
    gr.addColorStop(0, d > .5 ? P.b : P.l); gr.addColorStop(.17, d > .5 ? P.b : P.l); gr.addColorStop(.19, d > .5 ? P.s : P.b); gr.addColorStop(.56, d > .5 ? P.s : P.b); gr.addColorStop(.6, P.s); gr.addColorStop(1, d > .5 ? P.d : P.s);
    return gr;
}
function palmPath(g) {
    g.moveTo(-30, 8); g.bezierCurveTo(-35, -12, -47, -22, -47, -40); g.bezierCurveTo(-47, -62, -43, -82, -39, -95);
    g.quadraticCurveTo(-30, -106, -18, -104); g.quadraticCurveTo(-9, -110, 2, -105); g.quadraticCurveTo(12, -108, 22, -101); g.quadraticCurveTo(32, -99, 39, -88);
    g.bezierCurveTo(45, -68, 45, -40, 39, -18); g.bezierCurveTo(36, -6, 33, 3, 31, 8); g.quadraticCurveTo(0, 15, -30, 8); g.closePath();
}

export function hand(g, x, y, s, ang, pose, o = {}) {
    const P = typeof o.skin === "object" ? o.skin : SKIN[o.skin || "base"], Q = POSE[pose] || POSE.open, palm = o.view === "palm", fl = (o.flip ? -1 : 1) * (palm ? -1 : 1);
    const lw = (o.line || 2.6) / s, Ls = [-.55, -.83], c = Math.cos(ang), sn = Math.sin(ang), lx = (Ls[0] * c + Ls[1] * sn) * fl, ly = -Ls[0] * sn + Ls[1] * c;
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(fl * s, s); g.lineJoin = "round"; g.lineCap = "round";
    // ---- geometry ----
    const sp = Q.sp, ord = Q.ord || [3, 2, 1, 0], fingers = [];
    FING.forEach((F, i) => {
        let a = F.a * sp, px = F.x, py = F.y; const segs = [];
        for (let j = 0; j < 3; j++) {
            const f = Q.f[i][j]; if (f <= .02) break; a += Q.b[i][j];
            const L = F.L[j] * f, ex = px + Math.sin(a) * L, ey = py - Math.cos(a) * L; segs.push({ x0: px, y0: py, x1: ex, y1: ey, r0: F.W[j] / 2, r1: (F.W[j + 1] || F.W[j] * .88) / 2, f, j, a }); px = ex; py = ey;
        }
        fingers[i] = segs;
    });
    const T = Q.th, thumb = []; { let a = T.a, px = THUMB.x, py = THUMB.y; for (let j = 0; j < 2; j++) { const f = T.f[j]; if (f <= .02) break; a += T.b[j]; const L = THUMB.L[j] * f, ex = px + Math.sin(a) * L, ey = py - Math.cos(a) * L; thumb.push({ x0: px, y0: py, x1: ex, y1: ey, r0: THUMB.W[j] / 2, r1: THUMB.W[j + 1] / 2, f, j, a }); px = ex; py = ey; } }
    // one smooth outline per finger: up the left side through every joint, round the tip, back down the right side
    const digit = (segs, closed) => {
        if (!segs.length) return; const n = segs.length, side = k => { const sg = segs[Math.min(k, n - 1)], pv = segs[k - 1], a = k > 0 && k < n ? (sg.a + pv.a) / 2 : sg.a, r = k < n ? sg.r0 : sg.r1, x = k < n ? sg.x0 : sg.x1, y = k < n ? sg.y0 : sg.y1; return [x, y, Math.cos(a) * r, Math.sin(a) * r]; };
        const pts = []; for (let k = 0; k < n; k++) pts.push(side(k));
        const tp = segs[n - 1]; g.moveTo(pts[0][0] - pts[0][2], pts[0][1] - pts[0][3]); for (let k = 1; k < n; k++) g.lineTo(pts[k][0] - pts[k][2], pts[k][1] - pts[k][3]);
        g.arc(tp.x1, tp.y1, tp.r1, tp.a + Math.PI, tp.a + TAU); for (let k = n - 1; k >= 0; k--) g.lineTo(pts[k][0] + pts[k][2], pts[k][1] + pts[k][3]); if (closed) g.closePath();
    };
    const segFill = (sg, dark) => { const mx = (sg.x0 + sg.x1) / 2, my = (sg.y0 + sg.y1) / 2, dx = sg.x1 - sg.x0, dy = sg.y1 - sg.y0, L = Math.hypot(dx, dy) || 1; return celX(g, P, mx, my, -dy / L, dx / L, (sg.r0 + sg.r1) / 2, lx, ly, dark); };
    const fillDigit = (segs, curled) => { if (!segs.length) return; g.save(); g.beginPath(); digit(segs, true); g.clip(); segs.forEach(sg => { g.beginPath(); cap(g, sg.x0, sg.y0, sg.x1, sg.y1, sg.r0 * 1.25, sg.r1 * 1.25); g.fillStyle = segFill(sg, curled && sg.j === 0 && sg.f < .6 ? .8 : 0); g.fill(); }); g.restore(); };
    const lineDigit = (segs, w, col) => { if (!segs.length) return; g.beginPath(); digit(segs, false); g.lineWidth = w; g.strokeStyle = col; g.stroke(); };
    // ---- forearm / sleeve ----
    const sl = o.sleeve, slen = sl ? (sl.len || 250) : (o.arm == null ? 170 : o.arm), w0 = sl ? 41 : 30, w1 = sl ? (sl.w || 64) : 37;
    const arm = () => { g.beginPath(); g.moveTo(-w0, -14); g.lineTo(w0, -14); g.lineTo(w1, slen); g.lineTo(-w1, slen); g.closePath(); };
    // 1) silhouette ink for everything, so the outer outline is one continuous line
    g.strokeStyle = P.ink; g.lineWidth = lw * 2;
    if (slen > 0) { arm(); g.stroke(); }
    g.beginPath(); palmPath(g); g.stroke(); fingers.forEach(f => { g.beginPath(); digit(f, true); g.stroke(); }); if (thumb.length) { g.beginPath(); digit(thumb, true); g.stroke(); }
    // 2) fills: arm, then (back view) thumb under the hand, palm, fingers; (palm view) thumb on top
    if (slen > 0) {
        const gr = g.createLinearGradient(lx * 60, 0, -lx * 60, 0), C = sl ? sl.c : P.b, S = sl ? (sl.s || shade(sl.c, -.35)) : P.s;
        gr.addColorStop(0, sl ? shade(C, .18) : P.l); gr.addColorStop(.2, sl ? shade(C, .18) : P.l); gr.addColorStop(.22, C); gr.addColorStop(.58, C); gr.addColorStop(.62, S); gr.addColorStop(1, S);
        arm(); g.fillStyle = gr; g.fill();
        if (sl) { g.strokeStyle = rgba("#000000", .28); g.lineWidth = lw * 1.1;
            for (let i = 0; i < 3; i++) { const yy = 50 + i * 62; g.beginPath(); g.moveTo(-w0 - (w1 - w0) * yy / slen + 6, yy); g.quadraticCurveTo(-4 + i * 8, yy + 16, 10 + i * 6, yy + 4); g.stroke(); g.beginPath(); g.moveTo(w0 + (w1 - w0) * yy / slen - 5, yy + 20); g.quadraticCurveTo(14, yy + 30, 2, yy + 48); g.stroke(); }
            if (sl.mark) { g.save(); g.scale(fl, 1); g.fillStyle = sl.markCol || "#fff"; g.font = "700 26px sans-serif"; g.textAlign = "center"; g.fillText(sl.mark, 0, 110); g.restore(); } }
    }
    const palmFill = () => {
        const gr = g.createLinearGradient(lx * 60, -50 + ly * 60, -lx * 60, -50 - ly * 60);
        gr.addColorStop(0, P.l); gr.addColorStop(.14, P.l); gr.addColorStop(.16, P.b); gr.addColorStop(.62, P.b); gr.addColorStop(.66, P.s); gr.addColorStop(1, P.s);
        g.beginPath(); palmPath(g); g.fillStyle = gr; g.fill();
        if (P.gloss) { g.save(); g.beginPath(); palmPath(g); g.clip(); g.fillStyle = rgba(P.l, .55); g.beginPath(); g.ellipse(-14 * (lx < 0 ? 1 : -1), -66, 10, 28, -.3, 0, TAU); g.fill(); g.restore(); }
    };
    const thTop = palm || Q.thF;
    if (!thTop) { fillDigit(thumb); lineDigit(thumb, lw * .85, rgba(P.ink, .6)); }
    palmFill();
    if (sl && sl.cuff) { g.beginPath(); g.moveTo(-w0 - 3, -2); g.lineTo(w0 + 3, -2); g.lineTo(w0 + 6, 22); g.lineTo(-w0 - 6, 22); g.closePath(); g.fillStyle = sl.cuff; g.fill(); g.lineWidth = lw * 1.4; g.strokeStyle = P.ink; g.stroke(); g.fillStyle = rgba("#ffffff", .35); g.fillRect(-w0, 1, w0 * 2, 4); }
    ord.forEach(i => { fillDigit(fingers[i], Q.curl && Q.curl[i]); lineDigit(fingers[i], lw * .9, rgba(P.ink, .78)); });
    if (thTop) { fillDigit(thumb); lineDigit(thumb, lw * .9, rgba(P.ink, .78)); }
    // 3) details
    g.lineWidth = lw * .75;
    const crease = (sg, k) => { const a = sg.a, nx = Math.cos(a), ny = Math.sin(a), x = sg.x0, y = sg.y0, r = sg.r0 * k; g.beginPath(); g.moveTo(x - nx * r, y - ny * r + 1); g.quadraticCurveTo(x + Math.sin(a) * 2, y - Math.cos(a) * 2, x + nx * r, y + ny * r + 1); g.stroke(); };
    if (!palm) {
        FING.forEach((F, i) => { const k = fingers[i][0]; if (!k) return; const kx = F.x, ky = F.y + 3, cu = Q.curl && Q.curl[i];
            g.fillStyle = rgba(P.l, cu ? .95 : .6); g.beginPath(); g.ellipse(kx - 2, ky - 1, F.W[0] * .3, F.W[0] * .18, 0, 0, TAU); g.fill();
            if (!cu) { g.strokeStyle = rgba(shade(P.s, -.2), .45); g.beginPath(); g.moveTo(kx * .55, -18); g.quadraticCurveTo(kx * .8, -58, kx, ky + 8); g.stroke(); } });
        g.strokeStyle = rgba(P.ink, .38);
        fingers.forEach(segs => segs.forEach(sg => { if (sg.j > 0 && sg.f > .5) { crease(sg, .42); } if (sg.j === 2 && sg.f > .55) nail(g, sg, P, lw); }));
        if (thumb[1] && thumb[1].f > .5) nail(g, thumb[1], P, lw);
    } else {
        g.strokeStyle = rgba(P.d, .5); g.lineWidth = lw * .9;           // palm creases + finger joint creases + pads
        g.beginPath(); g.moveTo(-40, -74); g.quadraticCurveTo(-2, -66, 38, -80); g.stroke();
        g.beginPath(); g.moveTo(-42, -60); g.quadraticCurveTo(-6, -52, 30, -46); g.stroke();
        g.beginPath(); g.moveTo(-36, -68); g.quadraticCurveTo(-22, -30, -14, 2); g.stroke();
        g.lineWidth = lw * .7; fingers.forEach(segs => segs.forEach(sg => { if (sg.j > 0) crease(sg, .6);
            if (sg.j === 2 && sg.f > .5) { g.fillStyle = rgba(P.s, .4); g.beginPath(); g.ellipse((sg.x0 + sg.x1 * 2) / 3, (sg.y0 + sg.y1 * 2) / 3, sg.r1 * .62, sg.r1 * .9, sg.a, 0, TAU); g.fill(); } }));
    }
    if (o.tattoo) { const L = o.tattoo; g.save(); g.fillStyle = rgba(P.ink, .85); g.font = "900 11px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
        FING.forEach((F, i) => { const sg = fingers[i][0]; if (!sg || !L[i]) return; g.save(); g.translate((sg.x0 + sg.x1) / 2, (sg.y0 + sg.y1) / 2); g.rotate(sg.a); g.scale(fl, 1); g.fillText(L[i], 0, 0); g.restore(); }); g.restore(); }
    // 4) haki coat lightning, rim light, aura
    if (o.haki) { g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = o.haki; g.lineWidth = lw * 1.4; const fr = Math.floor((o.t || 0) * 18);
        for (let i = 0; i < 6; i++) { let bx = -40 + hs(i + fr) * 80, by = -110 + hs(i * 3 + fr) * 110; g.beginPath(); g.moveTo(bx, by); for (let k = 0; k < 4; k++) { bx += (hs(i * 7 + k + fr) - .5) * 30; by += 8 + hs(i * 5 + k + fr) * 14; g.lineTo(bx, by); } g.stroke(); } g.restore(); }
    if (o.rim || o.aura) {
        const rc = o.rim || o.aura, w = lw * (o.aura ? 3.2 : 1.5); g.save(); g.globalCompositeOperation = "lighter"; g.beginPath(); palmPath(g); fingers.forEach(f => digit(f, true)); if (thumb.length) digit(thumb, true);
        if (o.aura) { g.strokeStyle = rgba(rc, .16); g.lineWidth = w * 5; g.stroke(); g.strokeStyle = rgba(rc, .3); g.lineWidth = w * 2.4; g.stroke(); }
        g.strokeStyle = rgba(rc, o.aura ? .85 : .6); g.lineWidth = w; g.stroke(); g.restore();
    }
    g.restore();
}
function nail(g, sg, P, lw) {
    const dx = sg.x1 - sg.x0, dy = sg.y1 - sg.y0, a = Math.atan2(dy, dx), L = Math.hypot(dx, dy), mx = sg.x0 + dx * .62, my = sg.y0 + dy * .62;
    g.save(); g.translate(mx, my); g.rotate(a); g.beginPath(); g.ellipse(L * .08, 0, L * .3, sg.r1 * .62, 0, 0, TAU); g.fillStyle = P.nail; g.fill(); g.strokeStyle = rgba(P.ink, .5); g.lineWidth = lw * .7; g.stroke();
    g.strokeStyle = rgba("#ffffff", .85); g.lineWidth = lw * .6; g.beginPath(); g.moveTo(-L * .1, -sg.r1 * .25); g.lineTo(L * .22, -sg.r1 * .32); g.stroke(); g.restore();
}

/* a fist punching AT the camera: knuckles front, folded fingers, thumb wrapped across. Centre at (x, y); about 120 px wide at s = 1 */
export function fist(g, x, y, s, ang, o = {}) {
    const P = typeof o.skin === "object" ? o.skin : SKIN[o.skin || "base"], lw = (o.line || 2.6) / s, fl = o.flip ? -1 : 1;
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(fl * s, s); g.lineJoin = "round"; g.lineCap = "round";
    const vg = (y0, y1, dark) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, dark ? P.b : P.l); gr.addColorStop(.3, dark ? P.b : P.l); gr.addColorStop(.33, dark ? P.s : P.b); gr.addColorStop(.7, dark ? P.s : P.b); gr.addColorStop(.74, P.s); gr.addColorStop(1, dark ? P.d : P.s); return gr; };
    const R = (x0, y0, w0, h0, r) => { g.moveTo(x0 + r, y0); g.arcTo(x0 + w0, y0, x0 + w0, y0 + h0, r); g.arcTo(x0 + w0, y0 + h0, x0, y0 + h0, r); g.arcTo(x0, y0 + h0, x0, y0, r); g.arcTo(x0, y0, x0 + w0, y0, r); g.closePath(); };
    const top = [[-50, 25], [-24, 27], [4, 26], [31, 22]], mid = [[-48, 23], [-23, 25], [3, 24], [28, 20]];
    const shapes = [];
    if (o.sleeve) shapes.push([() => { g.moveTo(-40, 30); g.lineTo(40, 30); g.lineTo(54, 120); g.lineTo(-54, 120); g.closePath(); }, () => o.sleeve.c, 1]);
    shapes.push([() => R(-56, -40, 112, 92, 30), () => vg(-40, 52, 1), 0]);                                   // the hand mass
    top.forEach(([x0, w0], i) => shapes.push([() => R(x0, -48 + (i === 0 || i === 3 ? 5 : 0), w0, 34, 12), () => vg(-48, -14), 0]));      // knuckle row
    mid.forEach(([x0, w0], i) => shapes.push([() => R(x0 + 1, -14 + (i === 3 ? 2 : 0), w0, 26, 10), () => vg(-14, 12, 1), 0]));       // folded middle phalanges
    shapes.push([() => { g.moveTo(-60, -6); g.bezierCurveTo(-66, 20, -50, 46, -30, 48); g.lineTo(-44, 6); g.closePath(); }, () => vg(-6, 48, 1), 0]);   // thenar
    shapes.push([() => { cap(g, -56, 10, 2, 20, 14, 11.5); }, () => vg(0, 32), 0]);                           // thumb across
    g.strokeStyle = P.ink; g.lineWidth = lw * 2; shapes.forEach(([p]) => { g.beginPath(); p(); g.stroke(); });
    shapes.forEach(([p, f]) => { g.beginPath(); p(); g.fillStyle = f(); g.fill(); g.strokeStyle = rgba(P.ink, .6); g.lineWidth = lw * .85; g.stroke(); });
    g.fillStyle = rgba("#ffffff", .8); top.forEach(([x0, w0], i) => { g.beginPath(); g.ellipse(x0 + w0 * .45, -40 + (i === 0 || i === 3 ? 5 : 0), w0 * .26, 4.5, 0, 0, TAU); g.fill(); });
    g.save(); g.translate(0, 20); g.rotate(.17); g.beginPath(); g.ellipse(-6, -1, 7, 6.5, 0, 0, TAU); g.fillStyle = P.nail; g.fill(); g.strokeStyle = rgba(P.ink, .5); g.lineWidth = lw * .7; g.stroke(); g.restore();
    if (P.gloss) { g.fillStyle = rgba(P.l, .5); g.beginPath(); g.ellipse(-20, -30, 22, 6, -.1, 0, TAU); g.fill(); }
    if (o.haki) { g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = o.haki; g.lineWidth = lw * 1.3; const fr = Math.floor((o.t || 0) * 18);
        for (let i = 0; i < 5; i++) { let bx = -50 + hs(i + fr) * 100, by = -46 + hs(i * 3 + fr) * 30; g.beginPath(); g.moveTo(bx, by); for (let k = 0; k < 4; k++) { bx += (hs(i * 7 + k + fr) - .5) * 30; by += 7 + hs(i * 5 + k + fr) * 12; g.lineTo(bx, by); } g.stroke(); } g.restore(); }
    if (o.aura) { g.save(); g.globalCompositeOperation = "lighter"; g.beginPath(); R(-58, -50, 116, 104, 32); g.strokeStyle = rgba(o.aura, .16); g.lineWidth = lw * 14; g.stroke(); g.strokeStyle = rgba(o.aura, .3); g.lineWidth = lw * 7; g.stroke(); g.strokeStyle = rgba(o.aura, .9); g.lineWidth = lw * 3; g.stroke(); g.restore(); }
    g.restore();
}
/* cheap version for crowds of tiny fists (barrages): one cel-shaded blob with knuckle marks */
export function fistMini(g, x, y, r, ang, P, rim) {
    P = typeof P === "object" ? P : SKIN[P || "base"]; g.save(); g.translate(x, y); g.rotate(ang);
    const gr = g.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, P.l); gr.addColorStop(.35, P.b); gr.addColorStop(.38, P.s); gr.addColorStop(1, P.d);
    g.beginPath(); g.ellipse(0, 0, r, r * .82, 0, 0, TAU); g.fillStyle = gr; g.fill(); g.lineWidth = Math.max(1.2, r * .12); g.strokeStyle = P.ink; g.stroke();
    g.strokeStyle = rgba(P.ink, .7); g.lineWidth = Math.max(1, r * .07); for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * r * .42, -r * .7); g.lineTo(i * r * .42, -r * .1); g.stroke(); }
    if (rim) glow(g, 0, 0, r * 2.2, rim, .35); g.restore();
}
