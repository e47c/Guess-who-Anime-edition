/* =====================================================================
   CINE KIT · drawing toolkit for the Anime UNO special-card cinematics
   Everything here is a pure function of time, so a scene can be drawn at
   any moment (frame drops never break the choreography) and previewed.
   Sections: math · colour · glow · backgrounds · post · text · art · particles · props
   ===================================================================== */

/* ---------- math ---------- */
export const TAU = Math.PI * 2;
export const cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
export const lin = (a, b, x) => cl((x - a) / (b - a));                         // 0..1 progress of x through [a, b]
export const ss = (a, b, x) => { x = lin(a, b, x); return x * x * (3 - 2 * x); };  // smoothstep
export const mix = (a, b, k) => a + (b - a) * k;
export const oExpo = x => (x = cl(x)) >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
export const iExpo = x => (x = cl(x)) <= 0 ? 0 : Math.pow(2, 10 * x - 10);
export const oCub = x => 1 - Math.pow(1 - cl(x), 3);
export const iCub = x => Math.pow(cl(x), 3);
export const ioCub = x => (x = cl(x)) < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
export const oBack = (x, c = 1.7) => { x = cl(x) - 1; return 1 + (c + 1) * x * x * x + c * x * x; };
export const oElastic = x => (x = cl(x)) === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - .75) * 2.0944) + 1;
export const hs = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // stable hash 0..1
export const hit = (t, at, len) => t >= at && t < at + len ? 1 - (t - at) / len : 0;                   // a sharp hit that decays
export const bell = (t, a, b) => { const x = lin(a, b, t); return Math.sin(x * Math.PI); };            // 0 -> 1 -> 0 over [a, b]
export const env3 = (t, a, b, c, d) => ss(a, b, t) * (1 - ss(c, d, t));                                // fade in, hold, fade out
export const bez2 = (a, b, c, u) => { const q = 1 - u; return q * q * a + 2 * q * u * b + u * u * c; };
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

/* ---------- colour ---------- */
const RGB = {};
export function rgb(hex) {
    let c = RGB[hex]; if (c) return c;
    let s = hex.replace("#", ""); if (s.length === 3) s = s.replace(/./g, "$&$&");
    const n = parseInt(s, 16); return RGB[hex] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgba = (hex, a) => { const c = rgb(hex); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + cl(a) + ")"; };
export function shade(hex, k) {           // k < 0 darkens, k > 0 lightens
    const c = rgb(hex), f = v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k);
    return "#" + c.map(v => ("0" + Math.max(0, Math.min(255, f(v))).toString(16)).slice(-2)).join("");
}

/* ---------- glow: one cached radial sprite per colour, drawn additively ---------- */
const SPR = {};
function sprite(col) {
    if (SPR[col]) return SPR[col];
    const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d"), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.16, rgba(col, .95)); gr.addColorStop(.45, rgba(col, .32)); gr.addColorStop(1, rgba(col, 0));
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return SPR[col] = c;
}
export function glow(g, x, y, r, col, a = 1) {
    if (a <= .002 || r <= .5) return;
    const o = g.globalCompositeOperation, ga = g.globalAlpha; g.globalCompositeOperation = "lighter"; g.globalAlpha = ga * cl(a);
    g.drawImage(sprite(col), x - r, y - r, r * 2, r * 2); g.globalAlpha = ga; g.globalCompositeOperation = o;
}
/* a soft light pool (non-additive) */
export function pool(g, x, y, r, col, a = 1) {
    if (a <= 0) return; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}

/* ---------- backgrounds ---------- */
export function sky(g, w, h, stops, x0 = 0, y0 = 0, x1 = 0, y1 = h) {
    const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => gr.addColorStop(Array.isArray(c) ? c[0] : i / (stops.length - 1), Array.isArray(c) ? c[1] : c));
    g.fillStyle = gr; g.fillRect(-w, -h, w * 3, h * 3);
}
export function radial(g, x, y, r, stops) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r); stops.forEach((c, i) => gr.addColorStop(Array.isArray(c) ? c[0] : i / (stops.length - 1), Array.isArray(c) ? c[1] : c));
    g.fillStyle = gr; g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
}
/* manga focus lines: thin wedges converging on (cx, cy). Re-randomised `fps` times a second, like hand-drawn animation. */
export function focus(g, cx, cy, w, h, s, o = {}) {
    const n = o.n || 110, Rr = Math.hypot(w, h) * 1.1, r0 = o.r0 == null ? Math.min(w, h) * .2 : o.r0, fr = Math.floor(s * (o.fps || 12)), wd = o.wd || .009;
    g.save(); g.fillStyle = o.col || "#fff"; g.globalAlpha *= o.a == null ? .85 : o.a; g.beginPath();
    for (let i = 0; i < n; i++) {
        const an = (i + hs(i * 3.1 + fr) * .9) / n * TAU, ww = wd * (.25 + hs(i * 1.7 + fr * 5)), d0 = r0 * (1 + hs(i * 5.3 + fr) * (o.jag == null ? .9 : o.jag));
        g.moveTo(cx + Math.cos(an) * d0, cy + Math.sin(an) * d0); g.lineTo(cx + Math.cos(an - ww) * Rr, cy + Math.sin(an - ww) * Rr); g.lineTo(cx + Math.cos(an + ww) * Rr, cy + Math.sin(an + ww) * Rr); g.closePath();
    }
    g.fill(); g.restore();
}
/* parallel speed streaks at angle `ang`, scrolling with time */
export function streaks(g, w, h, s, ang, o = {}) {
    const n = o.n || 60, L = Math.hypot(w, h), sp = o.speed || 2.4, len = o.len || .35;
    g.save(); g.translate(w / 2, h / 2); g.rotate(ang); g.strokeStyle = o.col || "#fff"; g.lineCap = "round";
    for (let i = 0; i < n; i++) {
        const y = (hs(i * 2.3) - .5) * L, ph = ((s * sp * (.6 + hs(i * 7.7)) + hs(i)) % 1), x = (ph - .5) * L * 2.2, l = L * len * (.4 + hs(i * 3.3));
        g.globalAlpha = (o.a == null ? .5 : o.a) * (.3 + .7 * hs(i * 9.1)); g.lineWidth = (o.wd || 2) * (.4 + hs(i * 4.4) * 1.6);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x - l, y); g.stroke();
    }
    g.restore();
}
/* cached halftone dot pattern */
const TONE = {};
export function halftone(g, w, h, col, a, step = 9) {
    const k = col + step; let p = TONE[k];
    if (!p) { const c = document.createElement("canvas"); c.width = c.height = step * 2; const x = c.getContext("2d"); x.fillStyle = col; [[0, 0], [step, step], [step * 2, 0], [0, step * 2], [step * 2, step * 2]].forEach(([px, py]) => { x.beginPath(); x.arc(px, py, step * .32, 0, TAU); x.fill(); }); p = TONE[k] = c; }
    g.save(); g.globalAlpha *= a; g.fillStyle = g.createPattern(p, "repeat"); g.fillRect(0, 0, w, h); g.restore();
}
export function vignette(g, w, h, a = .7, col = "#000", inner = .35) {
    const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * inner, w / 2, h / 2, Math.hypot(w, h) * .62);
    gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(1, rgba(col, a)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
}
export function bars(g, w, h, k, col = "#000") { if (k <= 0) return; const b = h * .115 * k; g.fillStyle = col; g.fillRect(0, 0, w, b); g.fillRect(0, h - b, w, b); }
export function stars(g, w, h, s, n, col = "#fff", sd = 0) {
    g.fillStyle = col; for (let i = 0; i < n; i++) { g.globalAlpha = .25 + .75 * Math.abs(Math.sin(s * (1 + hs(i + sd)) + i)); const r = .6 + hs(i * 3 + sd) * 1.6; g.fillRect(hs(i + sd) * w, hs(i * 7 + sd) * h, r, r); } g.globalAlpha = 1;
}

/* ---------- post effects (applied to the whole canvas in screen space) ---------- */
let GRAIN = null;
function grainTile() {
    if (GRAIN) return GRAIN;
    const c = document.createElement("canvas"); c.width = c.height = 192; const x = c.getContext("2d"), d = x.createImageData(192, 192);
    for (let i = 0; i < d.data.length; i += 4) { const v = (Math.random() * 255) | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); return GRAIN = c;
}
export function grain(g, s, a = .06) {
    const cv = g.canvas, tile = grainTile(), f = Math.floor(s * 24), ox = hs(f) * 192 | 0, oy = hs(f + 9) * 192 | 0;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "overlay"; g.globalAlpha = a; g.translate(-ox, -oy);
    g.fillStyle = g.createPattern(tile, "repeat"); g.fillRect(0, 0, cv.width + 192, cv.height + 192); g.restore();
}
/* anime "impact frame": the picture flips to a stark negative for a frame or two */
export function impact(g, tint) {
    const cv = g.canvas; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "difference"; g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height);
    g.globalCompositeOperation = "saturation"; g.fillStyle = "#000"; g.fillRect(0, 0, cv.width, cv.height);
    if (tint) { g.globalCompositeOperation = "multiply"; g.fillStyle = tint; g.fillRect(0, 0, cv.width, cv.height); }
    g.restore();
}
/* chromatic split: the red channel is pushed sideways */
let OFF = null;
export function rgbSplit(g, px) {
    if (Math.abs(px) < .5) return;
    const cv = g.canvas, W = cv.width, H = cv.height; OFF = OFF || document.createElement("canvas");
    if (OFF.width !== W || OFF.height !== H) { OFF.width = W; OFF.height = H; }
    const o = OFF.getContext("2d"); o.globalCompositeOperation = "copy"; o.drawImage(cv, 0, 0); o.globalCompositeOperation = "multiply"; o.fillStyle = "#f00"; o.fillRect(0, 0, W, H);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "multiply"; g.fillStyle = "#0ff"; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "lighter"; g.drawImage(OFF, px * (W / innerWidth), 0); g.restore();
}
/* glitch: horizontal slices of the frame are shifted (time skips, rewinds) */
export function glitch(g, s, amt, n = 9) {
    if (amt <= 0) return; const cv = g.canvas, W = cv.width, H = cv.height; OFF = OFF || document.createElement("canvas");
    if (OFF.width !== W || OFF.height !== H) { OFF.width = W; OFF.height = H; }
    const o = OFF.getContext("2d"); o.globalCompositeOperation = "copy"; o.drawImage(cv, 0, 0); const f = Math.floor(s * 30);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < n; i++) { if (hs(i + f * 3) > amt) continue; const y = hs(i * 5 + f) * H, hh = H * (.01 + .08 * hs(i * 7 + f)), dx = (hs(i * 9 + f) - .5) * W * .12 * amt; g.drawImage(OFF, 0, y, W, hh, dx, y, W, hh); }
    g.restore();
}
export function flash(g, w, h, col, a) { if (a <= .002) return; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = cl(a); g.fillStyle = col; g.fillRect(0, 0, g.canvas.width, g.canvas.height); g.restore(); }

/* ---------- camera ---------- */
/* zoom z about (cx, cy) [default screen centre], pan (x, y), roll r, plus a deterministic hand-held / impact shake */
export function cam(g, X, o = {}) {
    const w = X.w, h = X.h, cx = o.cx == null ? w / 2 : o.cx, cy = o.cy == null ? h / 2 : o.cy, k = o.shake || 0, f = X.s * 60;
    const jx = k ? (hs(Math.floor(f) * 1.3) - .5) * 2 * k : 0, jy = k ? (hs(Math.floor(f) * 2.9 + 7) - .5) * 2 * k : 0;
    const dx = (o.drift || 0) * Math.sin(X.s * .9), dy = (o.drift || 0) * .6 * Math.cos(X.s * .7);
    g.translate(cx + (o.x || 0) + jx + dx, cy + (o.y || 0) + jy + dy); if (o.r) g.rotate(o.r); const z = o.z || 1; g.scale(z, z); g.translate(-cx, -cy);
}

/* ---------- text ---------- */
export const F_JP = '"Dela Gothic One","Yu Gothic UI","Hiragino Sans","Noto Sans JP","Meiryo",sans-serif';
export const F_EN = '"Teko","Rajdhani","Impact","Arial Narrow Bold",sans-serif';
export const F_UI = '"Rajdhani","Inter",sans-serif';
/* heavy anime lettering: thick ink stroke, colour glow, optional vertical gradient fill */
export function txt(g, s, x, y, size, o = {}) {
    if (!s || size < 2) return;
    g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.skew) g.transform(1, 0, o.skew, 1, 0, 0);
    g.font = (o.weight || "700") + " " + size + "px " + (o.font || F_EN); g.textAlign = o.align || "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    if ("letterSpacing" in g) g.letterSpacing = (o.sp || 0) + "px";
    const sw = o.sw == null ? size * .12 : o.sw;
    if (o.glow) { const gc = g.globalCompositeOperation; g.globalCompositeOperation = "lighter"; g.strokeStyle = rgba(o.glow, .22); g.lineWidth = sw * 2 + size * (o.gb || .45) * .9; g.strokeText(s, 0, 0); g.strokeStyle = rgba(o.glow, .35); g.lineWidth = sw * 2 + size * (o.gb || .45) * .4; g.strokeText(s, 0, 0); g.globalCompositeOperation = gc; }
    if (sw > 0) { g.lineWidth = sw * 2; g.strokeStyle = o.stroke || "#000"; g.strokeText(s, 0, 0); }
    if (o.out) { g.lineWidth = sw * .7; g.strokeStyle = o.out; g.strokeText(s, 0, 0); }
    if (o.grad) { const gr = g.createLinearGradient(0, -size * .45, 0, size * .45); o.grad.forEach((c, i) => gr.addColorStop(i / (o.grad.length - 1), c)); g.fillStyle = gr; } else g.fillStyle = o.fill || "#fff";
    g.fillText(s, 0, 0); g.restore();
}
/* slam-in lettering: drops from huge to size with a shudder, holds, fades. p = 0..1 over its life */
export function slam(g, s, x, y, size, p, o = {}) {
    if (p <= 0 || p >= 1) return;
    const inn = lin(0, o.in || .14, p), out = lin(o.out || .82, 1, p), sc = 1 + (1 - oExpo(inn)) * (o.from || 2.4) + out * (o.grow || .15);
    const jit = inn >= 1 && p < (o.in || .14) + .1 ? (hs(Math.floor(p * 400)) - .5) * size * .04 : 0;
    g.save(); g.globalAlpha *= Math.min(1, inn * 2.5) * (1 - out); g.translate(x + jit, y); g.scale(sc, sc);
    if (o.ghost && inn < 1) { g.save(); g.globalAlpha *= .35; g.scale(1.25, 1.25); txt(g, s, 0, 0, size, Object.assign({}, o, { glow: null })); g.restore(); }
    txt(g, s, 0, 0, size, o); g.restore();
}
/* vertical kanji column, letters brush in one by one */
export function column(g, s, x, y, size, p, o = {}) {
    const ch = [...s]; ch.forEach((c, i) => { const q = lin(i / ch.length * .7, i / ch.length * .7 + .3, p); if (q <= 0) return; g.save(); g.globalAlpha *= q; txt(g, c, x, y + i * size * 1.06 - (1 - oCub(q)) * size * .4, size, Object.assign({ font: F_JP, weight: "400" }, o)); g.restore(); });
}
/* ability title block: kanji over a skewed band with the English name, used at each scene's reveal */
export function title(g, X, p, o) {
    if (p <= 0 || p >= 1) return;
    const { w, h, M } = X, col = o.col || X.col, bh = M * .1, y = Math.min((o.y == null ? .8 : o.y) * h, h * .885 - bh * (o.sub ? 1.3 : .7) - 4), inn = oExpo(lin(0, .18, p)), out = lin(.84, 1, p), a = 1 - out;   // kept above the bottom letterbox bar
    g.save(); g.globalAlpha *= a;
    const bw = w * 1.2 * inn; g.save(); g.translate(w / 2, y); g.transform(1, 0, -.35, 1, 0, 0);
    const gr = g.createLinearGradient(-bw / 2, 0, bw / 2, 0); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(.2, rgba(shade(col, -.55), .92)); gr.addColorStop(.8, rgba(shade(col, -.55), .92)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.fillRect(-bw / 2, -bh / 2, bw, bh); g.fillStyle = col; g.fillRect(-bw / 2, -bh / 2 - 3, bw, 2); g.fillRect(-bw / 2, bh / 2 + 1, bw, 2); g.restore();
    if (o.kj) { const kp = lin(.05, .3, p); g.globalAlpha = a * kp; txt(g, o.kj, w / 2, y - bh * 1.15, M * (o.kjs || .1), { font: F_JP, weight: "400", fill: "#fff", stroke: shade(col, -.7), glow: col, sw: M * .008, sp: M * .01 }); }
    g.globalAlpha = a * lin(.08, .22, p); txt(g, o.en, w / 2 + (1 - inn) * w * .2, y + bh * .05, Math.min(bh * .95, w * .9 / Math.max(6, o.en.length) * 1.6), { fill: "#fff", stroke: "#000", glow: col, sw: bh * .06, sp: bh * .06, skew: -.12 });
    if (o.sub) { g.globalAlpha = a * lin(.16, .3, p); txt(g, o.sub, w / 2, y + bh * .95, M * .028, { font: F_UI, weight: "700", fill: rgba("#ffffff", .9), stroke: "#000", sw: M * .004, sp: M * .006 }); }
    g.restore();
}

/* ---------- character art ---------- */
/* draw img so it covers the rect, with the focus point (fx, fy as 0..1 of the picture) at the rect centre */
export function cover(g, img, x, y, w, h, fx = .5, fy = .35, zoom = 1) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, k = Math.max(w / iw, h / ih) * zoom, dw = iw * k, dh = ih * k;
    const dx = Math.min(x, Math.max(x + w - dw, x + w / 2 - fx * dw)), dy = Math.min(y, Math.max(y + h - dh, y + h / 2 - fy * dh));
    g.drawImage(img, dx, dy, dw, dh);
}
function noArt(g, X, x, y, w, h) {                     // a card without a picture: series colour, speed lines, the kind's kanji
    const col = X.col; sky(g, X.w, X.h, [shade(col, -.75), shade(col, -.35), shade(col, -.8)], x, y, x + w, y + h);
    focus(g, x + w / 2, y + h / 2, w, h, X.s, { n: 60, r0: Math.min(w, h) * .2, col: rgba(col, .6), a: .6 });
    txt(g, X.kanji, x + w / 2, y + h / 2, Math.min(w, h) * .6, { font: F_JP, weight: "400", fill: rgba("#ffffff", .9), stroke: shade(col, -.6), glow: col, sw: 4 });
}
export function art(g, X, x, y, w, h, zoom = 1, dfx = 0, dfy = 0) {
    if (X.art) cover(g, X.art, x, y, w, h, X.focus[0] + dfx, X.focus[1] + dfy, zoom); else noArt(g, X, x, y, w, h);
}
/* manga cut-in: a skewed band slides across with the character, speed lines and the ability name.
   p = 0..1 over the shot. o: { y (0..1), hh (band height, share of h), ang, dir (1 from right, -1 from left), name, kj } */
export function cutIn(g, X, p, o = {}) {
    if (p <= 0 || p >= 1) return;
    const { w, h, M } = X, col = o.col || X.col, dir = o.dir || 1, ang = o.ang == null ? -.1 : o.ang, hh = h * (o.hh || .34), yc = h * (o.y == null ? .46 : o.y);
    const inn = oExpo(lin(0, .2, p)), out = iExpo(lin(.84, 1, p)), off = ((1 - inn) - out) * w * 1.25 * dir, tg = Math.tan(ang);
    const yt = x => yc - hh / 2 + (x - w / 2) * tg, yb = x => yc + hh / 2 + (x - w / 2) * tg, x0 = -w * .1, x1 = w * 1.1;
    g.save(); g.translate(off, 0);
    const band = (grow) => { g.beginPath(); g.moveTo(x0, yt(x0) - grow); g.lineTo(x1, yt(x1) - grow); g.lineTo(x1, yb(x1) + grow); g.lineTo(x0, yb(x0) + grow); g.closePath(); };
    band(M * .012); g.fillStyle = "#fff"; g.fill(); band(M * .004); g.fillStyle = col; g.fill();       // white then colour rim
    band(0); g.save(); g.clip();
    sky(g, w, h, [shade(col, -.82), shade(col, -.5)], 0, yc - hh, 0, yc + hh);
    streaks(g, w, h, X.s, ang, { n: 40, col: rgba(col, .9), a: .5, wd: 2.5, speed: 3 * dir });
    const ax = w * (o.ax == null ? (dir > 0 ? .6 : .4) : o.ax), aw = Math.max(hh * 1.25, w * .55);
    g.save(); g.beginPath(); g.rect(ax - aw / 2, yc - hh * 1.3, aw, hh * 2.6); g.clip();
    art(g, X, ax - aw / 2 - p * dir * w * .03, yc - hh * .75 - (ax - w / 2) * tg, aw, hh * 1.5, 1.04 + p * .12, 0, .1);
    const fade = g.createLinearGradient(ax - aw / 2, 0, ax + aw / 2, 0); fade.addColorStop(0, rgba(shade(col, -.8), 1)); fade.addColorStop(.18, rgba(shade(col, -.8), 0)); fade.addColorStop(.82, rgba(shade(col, -.8), 0)); fade.addColorStop(1, rgba(shade(col, -.8), 1));
    g.fillStyle = fade; g.fillRect(ax - aw / 2, 0, aw, h); g.restore();
    const sh = g.createLinearGradient(0, yc - hh, 0, yc + hh); sh.addColorStop(0, "rgba(255,255,255,.18)"); sh.addColorStop(.35, "rgba(255,255,255,0)"); g.fillStyle = sh; g.fillRect(0, 0, w, h);
    g.restore();
    // the label strip that scrolls along the band's edge
    g.save(); g.translate(w / 2, yb(w / 2) + M * .03); g.rotate(ang); g.font = "700 " + (M * .022) + "px " + F_UI; g.fillStyle = rgba("#ffffff", .75); g.textBaseline = "middle";
    const tag = (o.tag || X.cap) + "  ✦  ", tw = g.measureText(tag).width || 1, sc = (X.s * 120 * dir) % tw; for (let x = -w - tw + sc; x < w; x += tw) g.fillText(tag, x, 0); g.restore();
    // name + kanji on the side opposite the face
    const tx = dir > 0 ? w * .22 : w * .78, ty = yc + (tx - w / 2) * tg;
    if (o.kj) { g.globalAlpha = lin(.12, .3, p); txt(g, o.kj, tx, ty - hh * .12, Math.min(hh * .42, w * .3 / Math.max(1, [...o.kj].length) * 1.4), { font: F_JP, weight: "400", fill: "#fff", stroke: shade(col, -.7), glow: col, sw: M * .007 }); }
    g.globalAlpha = lin(.18, .34, p); txt(g, o.name || X.who, tx, ty + hh * .27, Math.min(hh * .2, w * .045 + 10), { fill: col, stroke: "#000", sw: 3, skew: -.15, sp: 2 });
    g.restore();
}
/* extreme close-up on the eyes: a letterboxed strip opens like eyelids, about a quarter of the picture around the eyes. p = 0..1 */
export function eyes(g, X, p, o = {}) {
    if (p <= 0 || p >= 1) return;
    const { w, h } = X, col = o.col || X.col, sh = h * (o.hh || .26), open = oExpo(lin(0, .16, p)) * (1 - iCub(lin(.86, 1, p))), cy = h * (o.y || .5), hh = sh * open;
    g.save(); if (!o.nobg) { g.fillStyle = "#000"; g.fillRect(0, 0, w, h); }
    g.beginPath(); g.rect(0, cy - hh / 2, w, hh); g.clip();
    const img = X.art;
    if (img) {
        const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, k = sh * (o.span || 4) / ih * (1 + p * .1), dw = iw * k, dh = ih * k, fx = X.focus[0] + (o.dx || 0), fy = X.focus[1] + (o.dy || 0);
        let dx = w / 2 - fx * dw + (o.pan || 0) * p * w * .05; const dy = cy - fy * dh;
        if (dw < w) {                                   // narrower than the screen: the sides get a dark, wider copy of the same picture
            cover(g, img, 0, cy - sh / 2, w, sh, fx, fy, 1); g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(0, cy - sh / 2, w, sh);
            dx = Math.min(Math.max(dx, 0), w - dw); g.drawImage(img, dx, dy, dw, dh);
            [[dx, 1], [dx + dw, -1]].forEach(([x, d]) => { const gr = g.createLinearGradient(x, 0, x + d * dw * .18, 0); gr.addColorStop(0, "rgba(0,0,0,.9)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(Math.min(x, x + d * dw * .18), cy - sh / 2, dw * .18, sh); });
        } else g.drawImage(img, Math.min(0, Math.max(w - dw, dx)), dy, dw, dh);
    } else noArt(g, X, 0, cy - sh / 2, w, sh);
    if (o.tint) { g.globalCompositeOperation = "color"; g.fillStyle = rgba(o.tint, o.ta || .35); g.fillRect(0, 0, w, h); g.globalCompositeOperation = "source-over"; }
    const gl = g.createLinearGradient(0, cy - hh / 2, 0, cy + hh / 2); gl.addColorStop(0, "rgba(0,0,0,.7)"); gl.addColorStop(.22, "rgba(0,0,0,0)"); gl.addColorStop(.78, "rgba(0,0,0,0)"); gl.addColorStop(1, "rgba(0,0,0,.7)"); g.fillStyle = gl; g.fillRect(0, cy - hh / 2, w, hh);
    g.restore();
    g.fillStyle = col; g.fillRect(0, cy - hh / 2 - 3, w, 3); g.fillRect(0, cy + hh / 2, w, 3);
}
/* the target plate moved to centre stage (k = 1) or at its real place on the table (k = 0) */
export function stage(X, k) {
    const r = X.env.r, w = X.w, h = X.h, M = X.M, sw = Math.max(r.w * 1.3, Math.min(w * .52, M * .66)), sh = Math.max(r.h * 1.3, M * .13);
    const S = { x: w / 2 - sw / 2, y: h * (X.h > X.w ? .3 : .34) - sh / 2, w: sw, h: sh };
    return { x: mix(r.x, S.x, k), y: mix(r.y, S.y, k), w: mix(r.w, S.w, k), h: mix(r.h, S.h, k) };
}
export const mid = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
/* full-screen portrait push-in */
export function still(g, X, p, o = {}) {
    const { w, h } = X; g.save(); art(g, X, 0, 0, w, h, (o.z0 || 1.05) + p * (o.dz || .15), o.dx || 0, o.dy || 0);
    if (o.grade) { g.globalCompositeOperation = "soft-light"; g.fillStyle = rgba(o.grade, .6); g.fillRect(0, 0, w, h); g.globalCompositeOperation = "source-over"; }
    vignette(g, w, h, .85, "#000", .25); g.restore();
}

/* ---------- particles (analytic: position = f(time)) ---------- */
/* a burst from (x, y): p = 0..1 over its life */
export function sparks(g, x, y, p, n, sd, o = {}) {
    if (p <= 0 || p >= 1) return;
    const sp = o.speed || 400, gv = o.grav || 0, col = o.col || "#fff", len = o.len || .06; g.save(); g.lineCap = "round"; g.globalCompositeOperation = o.add === false ? "source-over" : "lighter";
    for (let i = 0; i < n; i++) {
        const an = (o.ang == null ? hs(i + sd) * TAU : o.ang + (hs(i + sd) - .5) * (o.spread || 1)), v = sp * (.35 + hs(i * 3 + sd) * .9), q = p * (.8 + hs(i * 5 + sd) * .4);
        const px = x + Math.cos(an) * v * q, py = y + Math.sin(an) * v * q + gv * q * q, tx = px - Math.cos(an) * v * len, ty = py - Math.sin(an) * v * len - gv * q * len * 2;
        g.globalAlpha = (1 - p) * (.5 + .5 * hs(i * 9 + sd)); g.strokeStyle = i % 3 ? col : "#fff"; g.lineWidth = (o.wd || 2.5) * (1 - p * .6);
        g.beginPath(); g.moveTo(tx, ty); g.lineTo(px, py); g.stroke();
    }
    g.restore();
}
/* chunks of rock/ice/glass flying out with gravity and spin */
export function debris(g, x, y, p, n, sd, o = {}) {
    if (p <= 0 || p >= 1) return;
    const sp = o.speed || 500, gv = o.grav == null ? 900 : o.grav, sz = o.size || 14; g.save();
    for (let i = 0; i < n; i++) {
        const an = o.ang == null ? hs(i + sd) * TAU : o.ang + (hs(i + sd) - .5) * (o.spread || 1.6), v = sp * (.3 + hs(i * 3 + sd)), q = p * 1.2;
        const px = x + Math.cos(an) * v * q, py = y + Math.sin(an) * v * q + gv * q * q * .5, s = sz * (.4 + hs(i * 7 + sd));
        g.save(); g.translate(px, py); g.rotate(q * 8 * (hs(i * 11 + sd) - .5)); g.globalAlpha = 1 - lin(.6, 1, p);
        g.fillStyle = o.cols ? o.cols[i % o.cols.length] : (i % 2 ? "#2a2830" : "#5b5866"); g.beginPath(); g.moveTo(-s, -s * .4); g.lineTo(-s * .2, -s * .8); g.lineTo(s * .9, -s * .2); g.lineTo(s * .4, s * .7); g.lineTo(-s * .7, s * .5); g.closePath(); g.fill();
        if (o.edge) { g.strokeStyle = o.edge; g.lineWidth = 1.2; g.stroke(); } g.restore();
    }
    g.restore();
}
/* rising embers / falling snow / floating dust: ambient, loops forever */
export function drift(g, w, h, s, n, sd, o = {}) {
    const up = o.up == null ? 1 : o.up, sp = o.speed || .08, col = o.col || "#fff", sz = o.size || 2.5; g.save(); if (o.add) g.globalCompositeOperation = "lighter";
    for (let i = 0; i < n; i++) {
        const u = (hs(i + sd) + s * sp * (.5 + hs(i * 3 + sd))) % 1, y = up > 0 ? h * (1.05 - u * 1.1) : h * (-.05 + u * 1.1), x = hs(i * 7 + sd) * w + Math.sin(s * (.6 + hs(i)) + i) * (o.sway || 20);
        g.globalAlpha = (o.a || .8) * Math.sin(u * Math.PI) * (.4 + .6 * hs(i * 5 + sd)); const r = sz * (.5 + hs(i * 9 + sd));
        if (o.glow) glow(g, x, y, r * 4, col, .6); else { g.fillStyle = col; g.fillRect(x - r / 2, y - r / 2, r, r); }
    }
    g.restore();
}
/* expanding shock ring with a bright edge */
export function shock(g, x, y, p, R, col, wd = 30) {
    if (p <= 0 || p >= 1) return; const r = R * oExpo(p), a = 1 - p;
    g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = rgba(col, a * .8); g.lineWidth = wd * (1 - p) + 2; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
    g.strokeStyle = rgba("#ffffff", a); g.lineWidth = Math.max(1, wd * .2 * (1 - p)); g.beginPath(); g.arc(x, y, r * .985, 0, TAU); g.stroke(); g.restore();
}
/* a jagged lightning bolt (re-rolls 20x a second) */
export function bolt(g, x0, y0, x1, y1, sd, col, wd = 3, jag = .18, br = 0) {
    const L = dist(x0, y0, x1, y1), n = Math.max(6, Math.round(L / 34)), nx = -(y1 - y0) / L, ny = (x1 - x0) / L, pts = [[x0, y0]];
    for (let i = 1; i < n; i++) { const k = i / n, o = (hs(sd + i * 1.3) - .5) * L * jag * Math.sin(k * Math.PI); pts.push([x0 + (x1 - x0) * k + nx * o, y0 + (y1 - y0) * k + ny * o]); }
    pts.push([x1, y1]);
    g.save(); g.lineJoin = "round"; g.lineCap = "round"; g.globalCompositeOperation = "lighter";
    [[wd * 4, rgba(col, .25)], [wd * 1.6, col], [wd * .6, "#fff"]].forEach(([lw, c]) => { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); });
    g.restore();
    if (br > 0) for (let i = 2; i < n - 1; i += 2) if (hs(sd + i * 7) < .45) { const p = pts[i], an = Math.atan2(y1 - y0, x1 - x0) + (hs(sd + i) - .5) * 2.2, l = L * .18 * hs(sd + i * 3); bolt(g, p[0], p[1], p[0] + Math.cos(an) * l, p[1] + Math.sin(an) * l, sd + i * 11, col, wd * .5, jag, br - 1); }
}
/* cracks radiating from a point (glass / ground) */
export function cracks(g, x, y, p, R, sd, col = "#fff", n = 16) {
    if (p <= 0) return; g.save(); g.strokeStyle = col; g.lineJoin = "round"; g.lineCap = "round";
    for (let k = 0; k < n; k++) { let px = x, py = y, an = k / n * TAU + hs(k + sd) * .4; g.lineWidth = 2.2 * (1 - k % 3 * .25); g.beginPath(); g.moveTo(px, py);
        for (let s = 0; s < 8; s++) { if (s / 8 > p) break; const L = R / 8 * (.6 + hs(k * 9 + s + sd)); an += (hs(k * 17 + s + sd) - .5) * .7; px += Math.cos(an) * L; py += Math.sin(an) * L; g.lineTo(px, py); } g.stroke(); }
    g.restore();
}

/* ---------- props ---------- */
/* a katana: blade along +x from the guard at (0,0).
   o.tsuba: "oval" (plain) | "cross" (Law's Kikoku) | "star4" (Hitsugaya's Hyorinmaru) | "manji" (Ichigo's Tensa Zangetsu) | "flame" (Tanjiro, Rengoku's guard)
   o.hilt = hilt length (1 = katana, ~1.4 = nodachi), o.chain: "broken" (Tensa Zangetsu) | "crescent" (Hyorinmaru's chain and sickle) */
export function katana(g, x, y, ang, len, o = {}) {
    const k = len / 600; g.save(); g.translate(x, y); g.rotate(ang); g.scale(k, k); g.lineJoin = "round";
    const blade = o.blade || ["#f4f7ff", "#9aa6c0", "#3a4258"], ink = o.ink || "#05060a", H = 170 * (o.hilt || 1);
    if (o.chain === "broken") chain(g, u => [-H - 14 - u * 46, u * 70 + Math.sin(u * 3) * 8], 6, 1, 9, "#c9c9d2");
    if (o.chain === "crescent") { chain(g, u => [-H - 14 - u * 120, u * 160 + Math.sin(u * 4 + (o.s || 0) * 3) * 18], 14, 1, 8, "#dfe6ee"); g.save(); g.translate(-H - 134, 170); g.rotate(.6); g.beginPath(); g.arc(0, 0, 34, -1.2, 1.9); g.arc(-12, 6, 28, 1.7, -1.0, true); g.closePath(); g.fillStyle = "#e9f4ff"; g.fill(); g.lineWidth = 3; g.strokeStyle = ink; g.stroke(); g.restore(); }
    // hilt with diamond wrap
    g.fillStyle = o.wrap || "#1b1420"; g.beginPath(); g.moveTo(-H, -13); g.lineTo(-8, -15); g.lineTo(-8, 15); g.lineTo(-H, 13); g.quadraticCurveTo(-H - 12, 0, -H, -13); g.fill(); g.lineWidth = 4; g.strokeStyle = ink; g.stroke();
    g.strokeStyle = o.wrapLine || "#e9dcc0"; g.lineWidth = 2.5; for (let i = -H + 10; i < -16; i += 18) { g.beginPath(); g.moveTo(i, -12); g.lineTo(i + 9, 0); g.lineTo(i, 12); g.moveTo(i + 9, -12); g.lineTo(i, 0); g.lineTo(i + 9, 12); g.stroke(); }
    // guard
    const ts = o.tsuba || "oval"; g.fillStyle = o.guard || "#c9a24a"; g.lineWidth = 3; g.strokeStyle = ink; g.beginPath();
    if (ts === "cross") { [[0, -1], [0, 1]].forEach(([, d]) => { g.moveTo(-6, 0); g.lineTo(-6, d * 34); g.lineTo(-13, d * 44); g.lineTo(0, d * 52); g.lineTo(13, d * 44); g.lineTo(6, d * 34); g.lineTo(6, 0); }); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-16, 0); g.lineTo(0, -12); g.lineTo(16, 0); g.lineTo(0, 12); g.closePath(); }
    else if (ts === "star4") { g.moveTo(0, -50); g.quadraticCurveTo(4, -10, 22, 0); g.quadraticCurveTo(4, 10, 0, 50); g.quadraticCurveTo(-4, 10, -22, 0); g.quadraticCurveTo(-4, -10, 0, -50); g.closePath(); }
    else if (ts === "flame") { for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, r0 = 30, r1 = 50 + (i % 2) * 8; g.lineTo(Math.cos(a) * 12, Math.sin(a) * r0); g.quadraticCurveTo(Math.cos(a + .2) * 22, Math.sin(a + .2) * r1, Math.cos(a + .32) * 12, Math.sin(a + .32) * r0); } g.closePath(); const fg = g.createLinearGradient(0, -50, 0, 50); fg.addColorStop(0, "#ffd04a"); fg.addColorStop(.5, "#ff5a1a"); fg.addColorStop(1, "#b81408"); g.fillStyle = fg; }
    else if (ts === "manji") { g.ellipse(0, 0, 9, 36, 0, 0, TAU); }
    else g.ellipse(0, 0, 10, 34, 0, 0, TAU);
    g.fill(); g.stroke();
    if (ts === "manji") { g.save(); g.font = "400 76px " + F_JP; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 8; g.strokeStyle = ink; g.strokeText("卍", 0, 2); g.fillStyle = o.guard || "#1a1a1a"; g.fillText("卍", 0, 2); g.lineWidth = 1.5; g.strokeStyle = "#6a6a74"; g.strokeText("卍", 0, 2); g.restore(); }
    // blade with a curve, an edge highlight and a hamon line
    const bl = 600 * (o.out == null ? 1 : o.out); if (bl > 4) {
        g.beginPath(); g.moveTo(8, -9); g.quadraticCurveTo(bl * .55, -14, bl, -24); g.lineTo(bl - 26, 4); g.quadraticCurveTo(bl * .55, 9, 8, 9); g.closePath();
        const gr = g.createLinearGradient(0, -14, 0, 9); gr.addColorStop(0, blade[0]); gr.addColorStop(.45, blade[1]); gr.addColorStop(1, blade[2]); g.fillStyle = gr; g.fill(); g.lineWidth = 3; g.strokeStyle = ink; g.stroke();
        g.strokeStyle = rgba("#ffffff", .8); g.lineWidth = 2; g.beginPath(); g.moveTo(14, -6); g.quadraticCurveTo(bl * .55, -10.5, bl - 6, -21); g.stroke();
        if (o.glow) { g.globalCompositeOperation = "lighter"; g.strokeStyle = rgba(o.glow, .9); const gw = 10 + 6 * Math.sin(o.s * 20 || 0); g.beginPath(); g.moveTo(8, -9); g.quadraticCurveTo(bl * .55, -14, bl, -24); g.lineWidth = gw * 3.4; g.strokeStyle = rgba(o.glow, .18); g.stroke(); g.lineWidth = gw; g.strokeStyle = rgba(o.glow, .9); g.stroke(); g.globalCompositeOperation = "source-over"; }
    }
    g.restore();
}
/* a kunai (Minato's three-pronged one when `tri`) pointing along +x */
export function kunai(g, x, y, ang, L, o = {}) {
    g.save(); g.translate(x, y); g.rotate(ang); const k = L / 100; g.scale(k, k); g.lineJoin = "round"; g.lineWidth = 3; g.strokeStyle = "#08090c";
    const metal = g.createLinearGradient(0, -12, 0, 12); metal.addColorStop(0, "#f2f5fa"); metal.addColorStop(.5, "#8d97a8"); metal.addColorStop(1, "#3d4352"); g.fillStyle = metal;
    g.beginPath(); g.moveTo(100, 0); g.lineTo(30, -16); g.lineTo(18, 0); g.lineTo(30, 16); g.closePath(); g.fill(); g.stroke();
    if (o.tri) { [-1, 1].forEach(sd => { g.beginPath(); g.moveTo(30, sd * 6); g.lineTo(62, sd * 36); g.lineTo(44, sd * 10); g.closePath(); g.fill(); g.stroke(); }); }
    g.fillStyle = "#24262e"; g.fillRect(-40, -5, 60, 10); g.strokeRect(-40, -5, 60, 10); g.strokeStyle = "#c9b98a"; g.lineWidth = 2; for (let i = -36; i < 18; i += 8) { g.beginPath(); g.moveTo(i, -5); g.lineTo(i + 5, 5); g.stroke(); }
    g.strokeStyle = "#08090c"; g.lineWidth = 3; g.beginPath(); g.arc(-50, 0, 10, 0, TAU); g.stroke();
    if (o.tag) { g.fillStyle = "#f1e6c4"; g.save(); g.translate(-10, 6); g.rotate(.4 + Math.sin(o.s * 8 || 0) * .2); g.fillRect(-6, 0, 12, 34); g.fillStyle = "#b8141c"; g.font = "400 10px " + F_JP; g.textAlign = "center"; g.fillText("飛", 0, 12); g.fillText("雷", 0, 26); g.restore(); }
    g.restore();
}
/* a playing-card back (thrown cards in the +5 endings) */
export function cardBack(g, x, y, sz, rot, flip, col = "#e0182a") {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(Math.max(.12, Math.abs(Math.cos(flip))) * sz / 90, sz / 90);
    const r = (x0, y0, w0, h0, rr) => { g.beginPath(); g.moveTo(x0 + rr, y0); g.arcTo(x0 + w0, y0, x0 + w0, y0 + h0, rr); g.arcTo(x0 + w0, y0 + h0, x0, y0 + h0, rr); g.arcTo(x0, y0 + h0, x0, y0, rr); g.arcTo(x0, y0, x0 + w0, y0, rr); g.closePath(); };
    r(-30, -45, 60, 90, 7); g.fillStyle = "#fff"; g.fill(); r(-26, -41, 52, 82, 5); const gr = g.createLinearGradient(0, -41, 0, 41); gr.addColorStop(0, shade(col, .1)); gr.addColorStop(1, shade(col, -.55)); g.fillStyle = gr; g.fill();
    g.strokeStyle = "rgba(255,255,255,.45)"; g.lineWidth = 1.5; g.beginPath(); g.ellipse(0, 0, 18, 30, .5, 0, TAU); g.stroke();
    g.fillStyle = "#fff"; g.font = "400 24px " + F_JP; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("札", 0, 1); g.restore();
}
/* polygon helpers for screen-shatter endings */
export function splitPoly(poly, L) {
    const [ax, ay, bx, by] = L, side = p => (bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax), A = [], B = [];
    for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], sp = side(p), sq = side(q);
        if (sp >= 0) A.push(p); if (sp <= 0) B.push(p);
        if ((sp > 0 && sq < 0) || (sp < 0 && sq > 0)) { const t = sp / (sp - sq), m = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; A.push(m); B.push(m); } }
    return [A, B].filter(x => x.length >= 3);
}
export function shardsOf(w, h, lines) {
    let polys = [[[0, 0], [w, 0], [w, h], [0, h]]];
    lines.forEach(L => { const nx = []; polys.forEach(p => splitPoly(p, L).forEach(q => nx.push(q))); polys = nx; });
    return polys.map((p, i) => { let sx = 0, sy = 0; p.forEach(q => { sx += q[0]; sy += q[1]; }); sx /= p.length; sy /= p.length; const dx = sx - w / 2, dy = sy - h / 2, d = Math.hypot(dx, dy) || 1; return { p, cx: sx, cy: sy, dx: dx / d, dy: dy / d, r: (hs(i * 4) - .5) * 1.6, d: .6 + hs(i * 6) }; });
}
export function randLine(k, w, h) {
    const an = (hs(k * 3.1 + 100) - .5) * Math.PI * 1.7, px = hs(k * 5.7 + 200) * w, py = hs(k * 2.3 + 300) * h, L = Math.hypot(w, h), dx = Math.cos(an), dy = Math.sin(an);
    return [px - dx * L, py - dy * L, px + dx * L, py + dy * L];
}
export function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

/* ---------- shared set pieces ---------- */
/* the target player's plate as the scene sees it (the real one is under the cinematic until the ending) */
export function plateGhost(g, X, r, name, col, a = 1, lit = 0) {
    r = r || X.env.r;
    if (a <= 0) return; g.save(); g.globalAlpha *= a;
    rr(g, r.x, r.y, r.w, r.h, Math.min(16, r.h * .25)); const gr = g.createLinearGradient(0, r.y, 0, r.y + r.h); gr.addColorStop(0, "rgba(30,26,44,.92)"); gr.addColorStop(1, "rgba(10,8,18,.92)"); g.fillStyle = gr; g.fill();
    g.lineWidth = 2 + lit * 3; g.strokeStyle = rgba(col, .55 + lit * .45); g.stroke(); if (lit) glow(g, r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) * .8, col, lit * .35);
    const ar = Math.min(r.h * .32, 22); g.beginPath(); g.arc(r.x + r.h * .5, r.y + r.h * .5, ar, 0, TAU); g.fillStyle = rgba(col, .85); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke();
    txt(g, (name || "?").slice(0, 14).toUpperCase(), r.x + r.h + (r.w - r.h) / 2, r.y + r.h * .5, Math.min(r.h * .3, 22), { font: F_UI, weight: "700", fill: "#fff", sw: 2, sp: 1 });
    g.restore();
}
/* a faceted ice crystal growing up from (x, by) */
export function spire(g, x, by, H, W, e, lean = 0, dark) {
    if (e <= 0) return; const hh = H * e, tip = [x + lean * hh, by - hh];
    const L = [x - W / 2, by], Rr = [x + W / 2, by], m = [x + W * .08 + lean * hh * .6, by - hh * .62];
    g.save(); g.lineJoin = "round";
    g.beginPath(); g.moveTo(L[0], L[1]); g.lineTo(m[0], m[1]); g.lineTo(tip[0], tip[1]); g.closePath(); const a = g.createLinearGradient(L[0], by, tip[0], tip[1]); a.addColorStop(0, dark ? "rgba(60,120,190,.95)" : "rgba(150,210,255,.92)"); a.addColorStop(1, "rgba(250,254,255,.98)"); g.fillStyle = a; g.fill();
    g.beginPath(); g.moveTo(Rr[0], Rr[1]); g.lineTo(m[0], m[1]); g.lineTo(tip[0], tip[1]); g.closePath(); const b = g.createLinearGradient(Rr[0], by, tip[0], tip[1]); b.addColorStop(0, dark ? "rgba(20,50,100,.95)" : "rgba(70,140,215,.9)"); b.addColorStop(1, "rgba(200,235,255,.95)"); g.fillStyle = b; g.fill();
    g.beginPath(); g.moveTo(L[0], L[1]); g.lineTo(m[0], m[1]); g.lineTo(Rr[0], Rr[1]); g.closePath(); g.fillStyle = dark ? "rgba(30,80,140,.9)" : "rgba(110,180,240,.85)"; g.fill();
    g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(L[0], L[1]); g.lineTo(tip[0], tip[1]); g.lineTo(Rr[0], Rr[1]); g.moveTo(m[0], m[1]); g.lineTo(tip[0], tip[1]); g.stroke();
    g.restore();
}
/* a frost crystal that keeps branching (recursive, depth 4). Adds to the current path: beginPath() before, stroke() after */
export function frost(g, x, y, an, len, p, d = 0, sd = 0) {
    if (d > 4 || len < 3 || p <= 0) return; const L = len * Math.min(1, p * (1 + d * .4)), x2 = x + Math.cos(an) * L, y2 = y + Math.sin(an) * L;
    g.moveTo(x, y); g.lineTo(x2, y2); if (p < .3 + d * .12) return;
    const q = (p - .3 - d * .12) / (.7 - d * .12); frost(g, x2, y2, an + .62 + (hs(sd + d) - .5) * .3, len * .55, q, d + 1, sd * 2 + 1); frost(g, x2, y2, an - .62 + (hs(sd + d + 9) - .5) * .3, len * .55, q, d + 1, sd * 2 + 2); frost(g, x2, y2, an + (hs(sd + d * 3) - .5) * .25, len * .7, q, d + 1, sd * 3 + 3);
}
export function snowflake(g, x, y, R, p, rot, col = "#fff") {
    if (p <= 0) return; g.save(); g.translate(x, y); g.rotate(rot); g.strokeStyle = col; g.lineCap = "round"; g.lineWidth = Math.max(1.2, R * .045);
    for (let k = 0; k < 6; k++) { g.save(); g.rotate(k * 1.0472); const L = R * oCub(p); g.beginPath(); g.moveTo(0, 0); g.lineTo(L, 0); g.stroke();
        for (let b = 1; b <= 3; b++) { const bx = L * b * .26, bl = R * .3 * (1 - b * .18) * oCub(lin(b * .15, .5 + b * .15, p)); g.beginPath(); g.moveTo(bx, 0); g.lineTo(bx + bl * .75, -bl); g.moveTo(bx, 0); g.lineTo(bx + bl * .75, bl); g.stroke(); }
        g.beginPath(); g.moveTo(L * .9, 0); g.lineTo(L * .8, R * .05); g.lineTo(L * .7, 0); g.lineTo(L * .8, -R * .05); g.closePath(); g.stroke(); g.restore(); }
    g.beginPath(); for (let k = 0; k < 6; k++) { const an = k * 1.0472; g.lineTo(Math.cos(an) * R * .14 * p, Math.sin(an) * R * .14 * p); } g.closePath(); g.stroke(); g.restore();
}
/* a block of clear ice around a rect */
export function iceBlock(g, r, a, s, col = "#bfeaff") {
    if (a <= 0) return; const x = r.x - 12, y = r.y - 12, W = r.w + 24, H = r.h + 24; g.save(); g.globalAlpha *= a;
    const gr = g.createLinearGradient(x, y, x + W, y + H); gr.addColorStop(0, "rgba(235,252,255,.62)"); gr.addColorStop(.45, "rgba(120,195,255,.25)"); gr.addColorStop(1, "rgba(210,244,255,.55)");
    g.beginPath(); g.moveTo(x + 10, y - 6); g.lineTo(x + W * .6, y - 14); g.lineTo(x + W + 8, y + 4); g.lineTo(x + W + 4, y + H + 6); g.lineTo(x + W * .3, y + H + 12); g.lineTo(x - 8, y + H - 4); g.closePath();
    g.fillStyle = gr; g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 2.5; g.stroke(); g.strokeStyle = rgba(col, .8); g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x + W * .6, y - 14); g.lineTo(x + W * .52, y + H * .5); g.lineTo(x + W * .3, y + H + 12); g.moveTo(x + W * .52, y + H * .5); g.lineTo(x + W + 4, y + H + 6); g.moveTo(x + W * .52, y + H * .5); g.lineTo(x - 8, y + H - 4); g.stroke();
    const sh = (s * .35) % 1.6 - .3; g.save(); g.clip(); g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.moveTo(x + W * sh, y - 20); g.lineTo(x + W * sh + 26, y - 20); g.lineTo(x + W * sh - 20, y + H + 20); g.lineTo(x + W * sh - 46, y + H + 20); g.fill(); g.restore();
    glow(g, x + W * .85, y + 2, 14, "#ffffff", .9); g.restore();
}
/* chain of oval links along a path pt(u) -> [x, y], drawn up to p */
export function chain(g, pt, n, p, size, col = "#f2c94c") {
    for (let i = 0; i < n; i++) { const u = i / n; if (u > p) break; const a = pt(u), b = pt(Math.min(1, u + .01)), an = Math.atan2(b[1] - a[1], b[0] - a[0]), o = i % 2;
        g.save(); g.translate(a[0], a[1]); g.rotate(an); g.lineWidth = Math.max(1.5, size * .28);
        g.strokeStyle = shade(col, -.55); g.beginPath(); g.ellipse(0, 0, o ? size * .55 : size, o ? size * .3 : size * .5, 0, 0, TAU); g.stroke();
        g.strokeStyle = col; g.lineWidth = Math.max(1, size * .16); g.beginPath(); g.ellipse(0, -size * .04, o ? size * .55 : size, o ? size * .3 : size * .5, 0, 3.4, 6); g.stroke(); g.restore(); }
}

/* ---------- Kurapika's five chains (the Chain Jail scene and the page's chain hold both draw with these, so the hold IS the
   scene's last frame). Order = his right hand's fingers: index Steal Chain (syringe), middle Chain Jail (hook), ring Dowsing
   Chain (pendulum), pinky Judgment Chain (blade), thumb Holy Chain (cross). ---------- */
export const KCHAIN = ["syringe", "hook", "pendulum", "blade", "cross"];
/* a dense polyline through the points (Catmull-Rom), with cumulative arc length */
export function chainPath(wp, step = 5) {
    const pts = [wp[0].slice()], P = i => wp[Math.max(0, Math.min(wp.length - 1, i))];
    for (let i = 0; i < wp.length - 1; i++) {
        const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
        for (let k = 1; k <= n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t;
            pts.push([0, 1].map(d => .5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3))); }
    }
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, len: cum[cum.length - 1] };
}
/* the five routes across the screen: each comes up from below (under Kurapika's arm) to its ring, runs to the table first, then
   out over the cards and the UI to the page's edges; Chain Jail ends coiled round the bound player's plate */
export function chainRoutes(w, h, origins, plate) {
    const W = (x, y) => [x * w, y * h], pc = plate ? [plate.x + plate.w / 2, plate.y + plate.h / 2] : [w * .5, h * .12], pw = plate ? plate.w : w * .2, ph = plate ? plate.h : h * .12;
    const R = [[[.42, .5], [.12, .3], [.3, .06], [.75, .14], [1.08, .34]], null, [[.68, .46], [.94, .66], [.62, .94], [.18, .86], [-.08, .58]],
        [[.8, .58], [1.04, .22], [.66, .03], [.24, .24], [-.06, .1]], [[.34, .62], [.06, .94], [.42, .8], [.82, .96], [1.08, .78]]];
    return R.map((rt, k) => {
        const o = (origins && origins[k]) || [w * (.56 + k * .03), h * 1.02], lead = [o[0] + w * .1, h * 1.2];
        let wp;
        if (rt) wp = [lead, o].concat(rt.map(p => W(p[0], p[1])));
        else { wp = [lead, o, W(.52, .52), [pc[0] - pw * .75, pc[1] + ph * 1.1]]; for (let i = 0; i <= 36; i++) { const u = i / 36, a = Math.PI * .8 + u * TAU * 2.1; wp.push([pc[0] + Math.cos(a) * pw * (.6 + .06 * u), pc[1] + Math.sin(a) * ph * (.95 + .25 * u)]); } }
        const P = chainPath(wp); P.kind = KCHAIN[k]; P.lead = Math.hypot(o[0] - lead[0], o[1] - lead[1]); return P;
    });
}
/* draw a chain along path P between arc lengths s0..s1: real links (face-on rings and edge-on bars, alternating), steel with a
   shine; o.aura (0..1) up to arc length o.auraTo turns them gold and lays a flowing yellow Nen glow under them;
   o.wob = slack (perpendicular wave), o.off(s, k) = extra displacement, o.t = time, o.k = chain index */
export function drawChain(g, P, s0, s1, size, o = {}) {
    const pts = P.pts, cum = P.cum, step = size * 1.22, aura = o.aura || 0, aTo = o.auraTo == null ? P.len : o.auraTo, t = o.t || 0;
    s1 = Math.min(s1, P.len); if (s1 <= s0) return;
    let j = 0; const at = s => { while (j < cum.length - 2 && cum[j + 1] < s) j++; const a = pts[j], b = pts[j + 1], seg = cum[j + 1] - cum[j] || 1, f = (s - cum[j]) / seg, tx = (b[0] - a[0]) / seg, ty = (b[1] - a[1]) / seg;
        let x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f; if (o.wob) { const q = Math.sin(s * .011 + t * 5 + (o.k || 0)) * o.wob; x -= ty * q; y += tx * q; } if (o.off) { const d = o.off(s); x += d[0]; y += d[1]; } return [x, y, Math.atan2(ty, tx)]; };
    if (aura > 0 && !o.noGlow) {                                      // the Nen glow, flowing (brighter pulses travel along the chain)
        g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round"; g.lineJoin = "round"; const e = Math.min(s1, aTo), ch = Math.max(24, size * 5);
        for (let s = s0; s < e; s += ch) { j = 0; const q = .7 + .3 * Math.sin(s * .012 - t * 4 + (o.k || 0)), a = at(s); j = 0; const b = at(Math.min(e, s + ch + 2));
            g.globalAlpha = aura * q * .22; g.strokeStyle = "#ffcf3a"; g.lineWidth = size * 2; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
            g.globalAlpha = aura * q * .45; g.strokeStyle = "#fff0a8"; g.lineWidth = size * .8; g.stroke(); }
        g.restore(); j = 0;
    }
    if (o.glowOnly) return;
    const first = Math.ceil(s0 / step) * step; g.lineCap = "round";
    for (let s = first; s <= s1; s += step) {
        const [x, y, an] = at(s), n = Math.round(s / step), gold = aura > .4 && s <= aTo;
        if (n % 2 === 0) {                                            // face-on link: an oval ring
            g.lineWidth = size * .3; g.strokeStyle = gold ? "#6a4600" : "#2c313b"; g.beginPath(); g.ellipse(x, y, size * .64, size * .38, an, 0, TAU); g.stroke();
            g.lineWidth = size * .15; g.strokeStyle = gold ? "#ffe680" : "#e4e9f1"; g.beginPath(); g.ellipse(x, y, size * .64, size * .38, an, 3.5, 5.9); g.stroke();
        } else {                                                      // edge-on link: a bar through the rings on either side
            const c = Math.cos(an), sn = Math.sin(an), L = size * .6;
            g.lineWidth = size * .3; g.strokeStyle = gold ? "#6a4600" : "#2c313b"; g.beginPath(); g.moveTo(x - c * L, y - sn * L); g.lineTo(x + c * L, y + sn * L); g.stroke();
            g.lineWidth = size * .13; g.strokeStyle = gold ? "#fff2b0" : "#f4f6fa"; g.beginPath(); g.moveTo(x - c * L * .7, y - sn * L * .7 - size * .04); g.lineTo(x + c * L * .7, y + sn * L * .7 - size * .04); g.stroke();
        }
    }
}
/* the weapon at the end of each chain */
export function chainTip(g, x, y, an, kind, sz) {
    g.save(); g.translate(x, y); g.rotate(an); g.fillStyle = "#e9edf4"; g.strokeStyle = "#2c313b"; g.lineWidth = Math.max(1.5, sz * .12);
    if (kind === "pendulum") { g.beginPath(); g.moveTo(sz * 1.6, 0); g.lineTo(sz * .2, -sz * .7); g.lineTo(-sz * .2, 0); g.lineTo(sz * .2, sz * .7); g.closePath(); g.fill(); g.stroke(); }
    else if (kind === "blade") { g.beginPath(); g.moveTo(sz * 2.2, 0); g.lineTo(0, -sz * .45); g.lineTo(0, sz * .45); g.closePath(); g.fill(); g.stroke(); }
    else if (kind === "syringe") { g.fillRect(0, -sz * .32, sz * 1.3, sz * .64); g.strokeRect(0, -sz * .32, sz * 1.3, sz * .64); g.beginPath(); g.moveTo(sz * 1.3, 0); g.lineTo(sz * 2.2, 0); g.stroke(); }
    else if (kind === "cross") { g.fillRect(0, -sz * .2, sz * 1.9, sz * .4); g.strokeRect(0, -sz * .2, sz * 1.9, sz * .4); g.fillRect(sz * 1.05, -sz * .72, sz * .4, sz * 1.44); g.strokeRect(sz * 1.05, -sz * .72, sz * .4, sz * 1.44); }
    else { g.lineWidth = sz * .34; g.strokeStyle = "#2c313b"; g.beginPath(); g.arc(sz * .7, 0, sz * .62, Math.PI * .9, Math.PI * 2.7); g.stroke(); g.lineWidth = sz * .16; g.strokeStyle = "#ffe680"; g.stroke(); }
    g.restore();
}
/* the soft golden glow of the bind, over everything */
export function chainGlow(g, w, h, a) {
    if (a <= 0) return; g.save(); g.globalAlpha = a; const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .2, w / 2, h / 2, Math.hypot(w, h) * .62);
    gr.addColorStop(0, "rgba(255,220,110,.05)"); gr.addColorStop(1, "rgba(255,196,60,.2)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.restore();
}
