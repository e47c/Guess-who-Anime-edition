/* =====================================================================
   FUTURE SIGHT · nine ways of seeing every other hand
   The scene plays for everyone; only the player who used the card gets the reveal table afterwards (the engine opens
   it). X.env.rects = the real opponent plates on the table, so the "seeing" lands on the real players.
   ===================================================================== */
import * as K from "./kit.js";
import { hand } from "./hands.js";
const { lin, ss, hit, hs, TAU, mid } = K;

const HS = X => X.M * (X.h > X.w ? .0036 : .003);
function eye(g, x, y, W, open, o) {                                        // a stylised anime eye (iris rings, pupil or slit, highlight)
    if (open < .03) return; const H = W * .36 * open; g.save(); g.translate(x, y); g.rotate(o.tilt || 0);
    const path = () => { g.beginPath(); g.moveTo(-W / 2, 0); g.quadraticCurveTo(0, -H * 2, W / 2, 0); g.quadraticCurveTo(0, H * 2, -W / 2, 0); g.closePath(); };
    path(); g.fillStyle = o.white || "#04020a"; g.fill(); g.save(); path(); g.clip();
    const ir = Math.max(2, H * 1.05), gr = g.createRadialGradient(0, 0, ir * .08, 0, 0, ir); o.stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, ir, 0, TAU); g.fill();
    if (o.slit) { g.fillStyle = "#000"; g.beginPath(); g.ellipse(0, 0, ir * .11, ir * .96, 0, 0, TAU); g.fill(); } else if (o.pupil !== false) { g.fillStyle = "#020208"; g.beginPath(); g.arc(0, 0, ir * .26, 0, TAU); g.fill(); }
    g.strokeStyle = "rgba(255,255,255,.3)"; g.lineWidth = 1.2; for (let k = 1; k < 4; k++) { g.beginPath(); g.arc(0, 0, ir * k * .25, 0, TAU); g.stroke(); }
    g.fillStyle = "rgba(255,255,255,.95)"; g.beginPath(); g.arc(-ir * .3, -ir * .3, ir * .12, 0, TAU); g.fill(); g.restore();
    path(); g.strokeStyle = o.rim; g.lineWidth = Math.max(2, W * .022); g.stroke(); K.glow(g, 0, 0, W * .6, o.glow, .35 * open); g.restore();
}

/* ---------- SHANKS · Conqueror's Haki: the gaze, the world goes still, black-red lightning splits the sky, the page cracks and falls away ---------- */
const shanks = {
    col: "#ff2a3a", ms: 7000, dark: "#000",
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, R = Math.hypot(w, h) / 2, B = [.42, .5, .58, .66];
        X.cue(.02, "heartbeat", t); X.cue(.22, "shing", t); B.forEach((a, i) => X.cue(a, i % 2 ? "zap" : "boom", t)); X.cue(.72, "crack", t);
        if (t < .22) { K.eyes(g, X, lin(0, .22, t), { tint: "#ff2a3a", ta: .25 }); K.column(g, "覇王色", w * .08, h * .2, M * .07, lin(.04, .18, t), { fill: "#fff", stroke: "#3a0006", glow: "#ff2a3a", sw: 3 }); K.bars(g, w, h, 1); return; }
        const nb = B.filter(a => t >= a).length, pulse = B.reduce((m, a) => Math.max(m, hit(t, a, .06)), 0);
        g.save(); K.cam(g, X, { shake: pulse * 26 + 2 });
        K.sky(g, w, h, ["#0a0002", "#2a0208", "#000000"]); K.vignette(g, w, h, .9, "#5a0010", .2);
        g.save(); g.globalCompositeOperation = "saturation"; g.fillStyle = "rgba(0,0,0," + lin(.22, .4, t) * .8 + ")"; g.fillRect(0, 0, w, h); g.restore();
        if (t < .72) {
            X.env.rects.forEach(r => K.plateGhost(g, X, r, "", X.col, ss(.3, .4, t), nb / 4));
            const draw = ss(.24, .36, t), hx = w * .78, hy = h * 1.06, ang = -2.25, L = M * 1.1 * draw;           // Gryphon is drawn
            K.katana(g, hx, hy, ang, L, { blade: ["#f2f2f6", "#9a9aa8", "#2a2a34"], guard: "#c9a24a", out: draw, glow: t > .36 ? "#ff2a3a" : null, s });
            hand(g, hx + M * .02, hy + M * .04, HS(X), ang + 1.5708, "fist", { skin: "tan", haki: "#ff2a3a", t: s, sleeve: { c: "#1a1418", s: "#0a080a", cuff: "#2a1a18", len: 240 } });
            for (let i = 0; i < nb; i++) { const q = lin(B[i], B[i] + .14, t); K.shock(g, w / 2, h / 2, q, R * 1.3, "#ff2a3a", 40); for (let k = 0; k < 12; k++) { const an = k / 12 * TAU + i; if (q < 1) K.bolt(g, w / 2 + Math.cos(an) * R * .2 * q, h / 2 + Math.sin(an) * R * .2 * q, w / 2 + Math.cos(an) * R * q, h / 2 + Math.sin(an) * R * q, i * 31 + k + Math.floor(s * 20), k % 2 ? "#ff2a3a" : "#ffffff", 3, .2, 1); } }   // the bursts
            X.env.rects.forEach((r, i) => { if (nb > 1) K.bolt(g, w / 2, h / 2, r.x + r.w / 2, r.y + r.h / 2, Math.floor(s * 20) + i * 7, i % 2 ? "#ff2a3a" : "#200004", 4, .22, 1); });
            if (nb) K.cracks(g, w / 2, h / 2, nb / 4 + pulse * .1, R * 1.1, 4, "rgba(255,255,255,.9)", 22);
        } else {                                                              // the page falls away in pieces: black, a void of embers
            const q = lin(.72, 1, t); g.fillStyle = "#000"; g.fillRect(-40, -40, w + 80, h + 80);
            for (let rg = 0; rg < 3; rg++) for (let k = 0; k < 12; k++) { const a0 = k / 12 * TAU, a1 = (k + 1) / 12 * TAU, ma = (a0 + a1) / 2, r0 = [0, .34, .7][rg] * R, r1 = [.34, .7, 1.3][rg] * R, v = (1.4 - rg * .25) * R * q * .9 * (.7 + hs(rg * 20 + k)), ox = Math.cos(ma) * v, oy = Math.sin(ma) * v + q * q * h * (.5 + hs(rg * 40 + k));
                g.save(); g.translate(w / 2 + ox, h / 2 + oy); g.rotate((hs(rg * 30 + k) - .5) * 3 * q); g.translate(-w / 2, -h / 2); g.globalAlpha = Math.max(0, 1 - q * 1.15); g.beginPath(); g.moveTo(w / 2 + Math.cos(a0) * r0, h / 2 + Math.sin(a0) * r0); g.lineTo(w / 2 + Math.cos(a0) * r1, h / 2 + Math.sin(a0) * r1); g.lineTo(w / 2 + Math.cos(a1) * r1, h / 2 + Math.sin(a1) * r1); g.lineTo(w / 2 + Math.cos(a1) * r0, h / 2 + Math.sin(a1) * r0); g.closePath(); g.fillStyle = "rgba(40,10,14,.95)"; g.fill(); g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 2; g.stroke(); g.restore(); }
            K.drift(g, w, h, s, 40, 3, { up: 1, speed: .05, col: "#ff2a3a", size: 2.4, glow: 1, add: 1, a: lin(.4, .9, q) });
        }
        g.restore();
        if (t > .38 && t < .72) K.slam(g, "覇王色の覇気", w / 2, h * .2, M * .1, lin(.38, .72, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#3a0006", glow: "#ff2a3a", ghost: 1 });
        if (t > .72) K.title(g, X, lin(.72, 1, t), { en: "CONQUEROR'S HAKI", kj: "覇王色の覇気", sub: "SHANKS · " + X.who, y: .7 });
        if (pulse > .8) X.fx.inv = "#ff8a8a"; X.fx.rgb = pulse * 14;
        K.bars(g, w, h, 1);
    }
};

/* ---------- NEJI · Byakugan: the veins swell around the eyes, the world turns to an x-ray of chakra, every opponent's network lights up ---------- */
function chakraNet(g, x, y, R, s, a, col, sd) {
    const br = (x0, y0, an, len, d, k) => { if (d > 4) return; const x1 = x0 + Math.cos(an) * len, y1 = y0 + Math.sin(an) * len; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineWidth = Math.max(.6, (5 - d) * .9); g.stroke(); if (d === 2) K.glow(g, x1, y1, R * .06, col, .7 * a * (.5 + .5 * Math.sin(s * 6 + k))); br(x1, y1, an + .5 + (hs(k + sd) - .5) * .4, len * .7, d + 1, k * 2 + 1); br(x1, y1, an - .5 + (hs(k + sd + 3) - .5) * .4, len * .7, d + 1, k * 2 + 2); };
    g.save(); g.globalAlpha *= a; g.strokeStyle = K.rgba(col, .8); g.globalCompositeOperation = "lighter"; for (let k = 0; k < 7; k++) br(x, y, k / 7 * TAU + sd, R * .3, 0, k + 1); g.restore();
}
const neji = {
    col: "#c9d6ff", ms: 6800, dark: "#02040f",
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, V = "#c9d6ff";
        X.cue(.02, "heartbeat", t); X.cue(.16, "reveal", t); X.cue(.42, "whoosh", t); X.cue(.66, "chime", t);
        if (t < .4) {                                                       // the eyes, the veins push out from them
            const p = lin(0, .4, t); K.eyes(g, X, Math.min(.85, p * 1.4), { tint: "#c9d6ff", ta: .35, hh: .3 });
            const vein = ss(.2, .6, p); g.save(); g.strokeStyle = K.rgba("#8a80c0", .9 * vein); g.lineWidth = 2.2; g.lineCap = "round"; [-1, 1].forEach(sd => { const ex = w / 2 + sd * w * .12, ey = h / 2; for (let k = 0; k < 9; k++) { let x = ex + sd * w * .08, y = ey, an = (sd > 0 ? -.4 : Math.PI + .4) + (k - 4) * .25; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 5; j++) { an += (hs(k * 9 + j) - .5) * .5; x += Math.cos(an) * M * .04 * vein; y += Math.sin(an) * M * .04 * vein; g.lineTo(x, y); } g.stroke(); } }); g.restore();
            K.slam(g, "白眼!", w / 2, h * .2, M * .14, lin(.16, .42, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#1a1d4a", glow: "#8fa4ff" });
            if (t > .34) X.fx.flash = ["#e8e6ff", lin(.34, .4, t)]; K.bars(g, w, h, 1); return;
        }
        K.sky(g, w, h, ["#0b1a4a", "#050b2a", "#02040f"]);                  // the x-ray world: everything is chakra
        chakraNet(g, w / 2, h / 2, M * 1.1, s, lin(.4, .5, t) * .6, "#8fb0ff", 1);
        K.focus(g, w / 2, h / 2, w, h, s, { col: "rgba(200,215,255,.18)", n: 60, r0: M * .2 });
        const lk = lin(.5, .7, t);
        X.env.rects.forEach((r, i) => { const c = mid(r); K.plateGhost(g, X, r, "", V, lk, lk); chakraNet(g, c.x, c.y, Math.max(r.w, M * .3), s + i, lk, "#dfe8ff", i * 5 + 2);
            g.save(); g.translate(c.x, c.y); g.rotate(s * (i % 2 ? -.6 : .6)); g.globalAlpha = lk; g.strokeStyle = V; g.lineWidth = 2; const rd = Math.max(r.w, r.h) * .7; g.beginPath(); g.arc(0, 0, rd, 0, TAU); g.stroke(); for (let k = 0; k < 8; k++) { g.rotate(.7854); g.fillStyle = V; g.fillRect(rd * .78, -2, rd * .2, 4); g.fillRect(rd * .78, -8, rd * .2, 3); g.fillRect(rd * .78, 5, rd * .2, 3); } g.restore(); });   // the Eight Trigrams
        K.cutIn(g, X, lin(.42, .62, t), { y: .58, hh: .24, dir: 1, ang: -.05, kj: "白眼", name: "NEJI HYUGA" });
        if (t > .66) K.title(g, X, lin(.66, 1, t), { en: "BYAKUGAN", kj: "八卦六十四掌", y: .84 });
        K.vignette(g, w, h, .6, "#000"); K.bars(g, w, h, 1);
    }
};

/* ---------- JIREN · Power Gaze: perfect stillness, eyes shut; vibrations; the eyes open and every opponent's ki is read ---------- */
const jiren = {
    col: "#ff5a3c", ms: 6800, dark: "#030304",
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, R = Math.hypot(w, h) * .6, O = "#ff5a3c";
        X.cue(.02, "heartbeat", t); X.cue(.3, "heartbeat", t); X.cue(.5, "boom", t); X.cue(.6, "reveal", t);
        K.sky(g, w, h, ["#060608", "#101014", "#030304"]);
        if (t < .5) {                                                       // meditation: the art in silence, rings of vibration
            g.save(); g.globalAlpha = .55; K.still(g, X, lin(0, .5, t), { z0: 1.05, dz: .08, dy: .1 }); g.restore(); g.fillStyle = "rgba(3,3,4,.45)"; g.fillRect(0, 0, w, h);
            for (let k = 0; k < 6; k++) { const q = lin(.06 + k * .07, .4 + k * .07, t); if (q > 0 && q < 1) { g.strokeStyle = "rgba(220,220,230," + (.4 * (1 - q)) + ")"; g.lineWidth = 2; g.beginPath(); g.arc(w / 2, h / 2, q * R, 0, TAU); g.stroke(); } }
            K.column(g, "静", w * .12, h * .3, M * .14, lin(.04, .3, t), { fill: "#fff", stroke: "#300", glow: O, sw: 3 }); K.bars(g, w, h, 1);
        } else {
            const q = lin(.5, .6, t); g.save(); K.cam(g, X, { shake: hit(t, .5, .12) * 22 });
            K.sky(g, w, h, ["#1a0402", "#3a0a04", "#060101"]); K.radial(g, w / 2, h / 2, M * (.3 + .6 * q), ["rgba(255,90,60,.55)", "rgba(255,90,60,0)"]);
            K.eyes(g, X, Math.min(.5, lin(.5, .7, t) * .5), { tint: "#ff3a2a", ta: .4, hh: .2, y: .18, nobg: 1 });
            X.env.rects.forEach((r, i) => { const c = mid(r), lit = lin(.56 + i * .05, .66 + i * .05, t); K.plateGhost(g, X, r, "", O, lit, lit);
                for (let j = 0; j < 9; j++) { const fx = r.x + r.w * (j / 8), fh = r.h * (1.2 + 1.2 * hs(i * 9 + j)) * (.7 + .3 * Math.sin(s * 9 + j * 2)); g.save(); g.globalCompositeOperation = "lighter"; const gr = g.createLinearGradient(0, r.y + r.h, 0, r.y + r.h - fh); gr.addColorStop(0, "rgba(255,230,200," + lit * .8 + ")"); gr.addColorStop(.4, "rgba(255,110,40," + lit * .6 + ")"); gr.addColorStop(1, "rgba(120,0,0,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(fx - r.w * .07, r.y + r.h); g.quadraticCurveTo(fx, r.y + r.h - fh * .5, fx + 6 * Math.sin(s * 7 + j), r.y + r.h - fh); g.quadraticCurveTo(fx, r.y + r.h - fh * .5, fx + r.w * .07, r.y + r.h); g.fill(); g.restore(); }   // their ki, burning
                if (lit > 0) K.txt(g, "POWER " + String(9000 + ((hs(Math.floor(s * 9) + i) * 90000) | 0)), c.x, r.y + r.h + M * .05, M * .035, { font: K.F_UI, fill: "#fff", stroke: "#300", glow: O, sw: 2 }); });
            K.shock(g, w / 2, h / 2, q, R * 1.5, O, 40); g.restore();
            if (t > .64) K.title(g, X, lin(.64, 1, t), { en: "POWER GAZE", kj: "気", sub: "JIREN · " + X.who, y: .86 });
            if (hit(t, .5, .03)) X.fx.inv = "#ff9a8a";
            K.bars(g, w, h, 1);
        }
    }
};

/* ---------- GOJO · Infinite Void: the Six Eyes, the crossed-finger sign, DOMAIN EXPANSION, an endless flood of information ---------- */
const FXG = "無量空処0123456789∞呪術廻戦";
function voidSpace(g, w, h, s, speed, glyph) {
    const cx = w / 2, cy = h / 2, R = Math.hypot(w, h) / 2; K.radial(g, cx, cy, R, ["#0b1f5c", "#050b2e", "#000007"]);
    for (let i = 0; i < 5; i++) K.pool(g, w * (.2 + .6 * hs(i + 40) + .08 * Math.sin(s * .3 + i)), h * (.2 + .6 * hs(i + 50) + .08 * Math.cos(s * .25 + i)), R * (.35 + .2 * hs(i + 60)), i % 2 ? "#825aff" : "#28c8ff", .2);
    g.lineCap = "round"; for (let i = 0; i < 160; i++) { const a = hs(i) * TAU, z = (hs(i + 7) + s * .1 * speed) % 1, r = Math.pow(z, 2.2) * R * 1.05, len = Math.min(r, 3 + speed * r * .045);
        g.beginPath(); g.moveTo(cx + Math.cos(a) * (r - len), cy + Math.sin(a) * (r - len)); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.globalAlpha = Math.min(1, z * 1.4); g.strokeStyle = i % 5 === 0 ? "#b9a6ff" : i % 2 ? "#ffffff" : "#7fe9ff"; g.lineWidth = .6 + z * 2.4; g.stroke(); }
    g.globalAlpha = 1;
    if (glyph > 0) { g.font = "700 22px monospace"; g.textAlign = "center"; g.textBaseline = "middle"; const cols = Math.ceil(w / 34);
        for (let c = 0; c < cols; c++) { const head = ((s * (.12 + hs(c + 70) * .22) * (.6 + speed * .35) + hs(c + 80)) % 1) * (h + 260) - 130;
            for (let j = 0; j < 9; j++) { g.globalAlpha = glyph * (1 - j / 9); g.fillStyle = j ? "#6fe3ff" : "#ffffff"; g.fillText(FXG[(Math.floor(s * 5 * (.5 + hs(c + j))) + c * 3 + j) % FXG.length], c * 34 + 17, head - j * 26); } } g.globalAlpha = 1; }
}
const gojo = {
    col: "#33ccff", ms: 7400, dark: "#000007",
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, R = Math.hypot(w, h) / 2, E = .3;
        X.cue(.02, "reveal", t); X.cue(.22, "clap", t); X.cue(E, "boom", t); X.cue(E + .01, "chime", t); X.cue(.66, "whoosh", t);
        if (t < .2) { K.eyes(g, X, lin(0, .22, t), { tint: "#33ccff", ta: .15 }); K.column(g, "六眼", w * .08, h * .22, M * .08, lin(.04, .16, t), { fill: "#e8fbff", stroke: "#0a6ea8", glow: "#33ccff", sw: 3 }); K.bars(g, w, h, 1); return; }
        if (t < E) {                                                         // the sign: index and middle crossed
            K.sky(g, w, h, ["#000", "#020a1e", "#000"]); K.focus(g, w / 2, h * .5, w, h, s, { col: "rgba(127,233,255,.4)", n: 100, r0: M * .16 });
            hand(g, w / 2, h * 1.08 - ss(.2, .26, t) * h * .14, HS(X) * 1.2, 0, "cross", { skin: "pale", rim: "#7fe9ff", sleeve: { c: "#0a0c14", s: "#000", cuff: "#1a1e2a", len: 260 } });
            K.slam(g, "領域展開", w / 2, h * .2, M * .14, lin(.22, E + .02, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#0b6fb8", glow: "#33ccff" }); K.bars(g, w, h, 1); return;
        }
        const b = lin(E, .62, t), dome = K.oExpo(lin(E, E + .14, t)) * R * 1.1, fall = lin(.62, 1, t);   // the void opens as a sphere, then we fall into it
        if (dome < R * 1.05) { K.sky(g, w, h, ["#000", "#020a1e", "#000"]); g.save(); g.beginPath(); g.arc(w / 2, h / 2, dome, 0, TAU); g.clip(); voidSpace(g, w, h, s, 1.4, 0); g.restore(); g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = "#e8fbff"; g.lineWidth = 8; g.beginPath(); g.arc(w / 2, h / 2, dome, 0, TAU); g.stroke(); g.restore(); }
        else voidSpace(g, w, h, s, 1 + fall * 14, .55 * ss(0, .3, fall));
        if (b > 0 && b < 1) K.slam(g, "無量空処", w / 2, h * .46, M * .22, b, { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#0b6fb8", glow: "#33ccff", ghost: 1 });
        if (fall > 0) { X.env.rects.forEach(r => { const c = mid(r); K.plateGhost(g, X, r, "", "#7fe9ff", ss(0, .3, fall), 1); for (let k = 0; k < 3; k++) K.shock(g, c.x, c.y, (fall * 2 + k / 3) % 1, Math.max(r.w, r.h), "#7fe9ff", 4); }); K.title(g, X, lin(.64, 1, t), { en: "INFINITE VOID", kj: "無量空処", sub: "DOMAIN EXPANSION · GOJO", y: .84 }); }
        if (hit(t, E, .03)) X.fx.inv = "#bff6ff"; X.fx.rgb = hit(t, E, .1) * 14;
        const wo = lin(.94, 1, t); if (wo > 0) X.fx.flash = ["#ffffff", wo * .6];
        K.bars(g, w, h, 1);
    }
};

/* ---------- YORIICHI · Transparent World: ink-wash calm, a red sun, the opponents turn to glass; their cards shine through ---------- */
const yoriichi = {
    col: "#ff3b3b", ms: 6800, dark: "#060607",
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, K2 = "#ff3b3b";
        X.cue(.02, "heartbeat", t); X.cue(.36, "heartbeat", t); X.cue(.5, "reveal", t);
        K.sky(g, w, h, ["#1b1b21", "#0e0e12", "#060607"]);
        for (let i = 0; i < 8; i++) K.pool(g, ((hs(i + 5) * w * 1.4 + s * 14 * (.4 + hs(i))) % (w * 1.4)) - w * .2, h * (.15 + .7 * hs(i + 9)), M * .45, "#ffffff", .06);   // ink-wash mist
        const sun = K.oCub(lin(0, .3, t)); K.radial(g, w * .5, h * .34, M * .2 * sun, ["rgba(255,60,50,.9)", "rgba(180,20,20,.6)", "rgba(80,0,0,0)"]);
        g.save(); g.translate(w / 2, h * .34); g.strokeStyle = "rgba(255,59,59,.5)"; g.lineWidth = 2; for (let k = 0; k < 48; k++) { const an = k / 48 * TAU + s * .08, L = M * (.06 + .05 * hs(k)) * sun; g.beginPath(); g.moveTo(Math.cos(an) * M * .26, Math.sin(an) * M * .26); g.lineTo(Math.cos(an) * (M * .26 + L), Math.sin(an) * (M * .26 + L)); g.stroke(); } g.restore();   // the sun halo
        if (t < .4) { g.save(); g.globalAlpha = lin(.08, .2, t) * (1 - lin(.32, .4, t)); K.eyes(g, X, lin(.04, .4, t), { tint: "#ff3b3b", ta: .2, hh: .18, y: .7, nobg: 1 }); g.restore(); }
        const tp = lin(.4, .6, t);
        X.env.rects.forEach((r, i) => { g.save(); g.globalAlpha = tp; g.fillStyle = "rgba(255,255,255,.05)"; g.fillRect(r.x, r.y, r.w, r.h); g.strokeStyle = "rgba(255,230,230,.7)"; g.lineWidth = 1.5; g.strokeRect(r.x, r.y, r.w, r.h);
            g.strokeStyle = "rgba(255,70,70,.6)"; g.lineWidth = 1; for (let k = 0; k < 18; k++) { let px = r.x + r.w / 2, py = r.y + r.h / 2, an = hs(k + i * 7) * TAU; g.beginPath(); g.moveTo(px, py); for (let sg = 0; sg < 4; sg++) { an += (hs(k * 5 + sg) - .5) * 1.2; px += Math.cos(an) * r.w * .09; py += Math.sin(an) * r.h * .22; g.lineTo(px, py); } g.stroke(); }   // see-through veins
            g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 2; g.beginPath(); for (let px = 0; px <= r.w; px += 4) { const ph = (px / r.w * 3 - s * .8) % 1, v = ph < .1 ? Math.sin(ph / .1 * Math.PI) * -r.h * .36 : 0; g.lineTo(r.x + px, r.y + r.h * .5 + v); } g.stroke();   // their pulse
            const cc = lin(.56, .76, t); g.globalAlpha = cc * tp; g.strokeStyle = "rgba(255,255,255,.9)"; for (let k = 0; k < 5; k++) g.strokeRect(r.x + r.w * (.08 + k * .17), r.y + r.h * .18, r.w * .14, r.h * .64); g.restore(); });   // the cards, inside, like glass
        if (t > .44 && t < .76) K.column(g, "透き通る世界", w * .07, h * .14, M * .06, lin(.44, .6, t), { fill: "#fff", stroke: "#300", glow: K2, sw: 3 });
        K.cutIn(g, X, lin(.18, .4, t), { y: .58, hh: .22, dir: -1, ang: .04, kj: "日の呼吸", name: "YORIICHI" });
        if (t > .66) K.title(g, X, lin(.66, 1, t), { en: "TRANSPARENT WORLD", kj: "透き通る世界", y: .86 });
        K.vignette(g, w, h, .7, "#000"); K.bars(g, w, h, 1);
    }
};

/* ---------- YHWACH · The Almighty: a sea of watching eyes, you fall into one, eyes within eyes, every future flickers then settles ---------- */
const YH = { stops: [[0, "#ffffff"], [.3, "#e3e8ff"], [.65, "#8790d0"], [1, "#161440"]], rim: "#d6dcff", glow: "#8a7bff", slit: true };
const yhwach = {
    col: "#8a7bff", ms: 7000, dark: "#02010a",
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s;
        X.cue(.02, "rumble", t); X.cue(.3, "whoosh", t); X.cue(.56, "reveal", t); X.cue(.8, "chime", t);
        if (t < .56) {
            K.sky(g, w, h, ["#010003", "#0a0414", "#000"]); for (let i = 0; i < 8; i++) K.pool(g, w * (.1 + .8 * hs(i + 3)), h * (.1 + .8 * hs(i + 9)), M * .5, "#2e0e46", .5);
            const z = Math.exp(ss(.24, .42, t) * 4.5); g.save(); g.translate(w / 2, h / 2); g.scale(z, z); g.translate(-w / 2, -h / 2);
            for (let i = 0; i < 26; i++) { const an = hs(i) * TAU, d = M * (.18 + .7 * hs(i + 5)), W = M * (.07 + .09 * hs(i + 8)); eye(g, w / 2 + Math.cos(an) * d * 1.5, h / 2 + Math.sin(an) * d, W, ss(.02 + (i % 12) * .014, .1 + (i % 12) * .014, t) * (.8 + .2 * Math.sin(s * 2 + i)), Object.assign({ tilt: (hs(i + 2) - .5) * .6 }, YH)); }
            eye(g, w / 2, h / 2, M * .46, ss(.1, .22, t), YH); g.restore();
            if (t > .34) { const a = lin(.34, .4, t), ph = (s * .9) % 1; g.fillStyle = "rgba(0,0,6," + a * .85 + ")"; g.fillRect(0, 0, w, h); for (let k = 13; k >= 0; k--) { const sc = Math.pow(1.62, k - ph); eye(g, w / 2, h / 2, M * .03 * sc, 1, Object.assign({ white: "rgba(4,2,10,.5)" }, YH)); } }   // eyes within eyes
            K.cutIn(g, X, lin(.04, .24, t), { y: .78, hh: .2, dir: 1, ang: -.04, kj: "全知全能", name: "YHWACH" }); K.bars(g, w, h, 1); return;
        }
        const b = lin(.56, 1, t), conv = ss(.3, .6, b); K.sky(g, w, h, ["#02010a", "#0a0620", "#02010a"]);   // the futures: shards of possibility, then one real picture
        for (let i = 0; i < 12; i++) { const gt = X.env.rects[i % X.env.rects.length], tc = mid(gt), hx = w * (.12 + .76 * hs(i + 60)), hy = h * (.2 + .6 * hs(i + 70)), x = K.mix(hx, tc.x, conv), y = K.mix(hy, tc.y, conv), sw = M * (.3 - .12 * conv) * (1 - b * .3), sh = sw * .6;
            [[-6, "rgba(0,255,255,.35)"], [6, "rgba(255,0,200,.35)"], [0, null]].forEach(([off, tint]) => { g.save(); g.translate(x + off * (1 - conv), y); g.rotate((hs(i + 80) - .5) * .7 * (1 - conv)); g.globalAlpha = (tint ? .6 : 1) * (1 - lin(.8, 1, b)); g.beginPath(); g.moveTo(-sw / 2 + 14, -sh / 2); g.lineTo(sw / 2, -sh / 2); g.lineTo(sw / 2 - 14, sh / 2); g.lineTo(-sw / 2, sh / 2); g.closePath(); g.fillStyle = tint || "#0a0820"; g.fill(); g.strokeStyle = tint || "#a99cff"; g.lineWidth = 2; g.stroke();
                if (!tint) { g.save(); g.clip(); const n = 3 + (hs(i + Math.floor(s * 7)) * 4 | 0); for (let c = 0; c < n; c++) { g.fillStyle = c === ((hs(i + Math.floor(s * 7) + 3) * n) | 0) && conv < .7 ? "#fff" : "rgba(160,150,255,.55)"; g.fillRect((c - n / 2 + .5) * sw * .16 - sw * .06, -sh * .2, sw * .12, sh * .4); } g.restore(); } g.restore(); }); }
        if (conv > .6) X.env.rects.forEach(r => K.plateGhost(g, X, r, "", "#fff", lin(.6, .8, conv), 1));
        K.title(g, X, lin(.62, 1, b), { en: "THE ALMIGHTY", kj: "全知全能", y: .84 });
        if (hit(t, .56, .03)) X.fx.inv = "#c9c0ff"; X.fx.glitch = (1 - conv) * .4 * (b < .5 ? 1 : 0);
        K.bars(g, w, h, 1);
    }
};

/* ---------- NEON · Lovely Ghostwriter: a trance, the hand writes on its own, a four-line prophecy turns gold and flies to the opponents ---------- */
const neon = {
    col: "#ff7ad9", ms: 6800, dark: "#12031a",
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, x0 = w * .16, x1 = w * .84;
        X.cue(.02, "chime", t); X.cue(.2, "flip", t); for (let i = 0; i < 4; i++) X.cue(.22 + i * .1, "tick", t); X.cue(.66, "reveal", t);
        if (t < .18) { K.eyes(g, X, lin(0, .2, t), { tint: "#ff7ad9", ta: .25 }); K.bars(g, w, h, 1); return; }
        K.sky(g, w, h, ["#fff4f8", "#f8dbe8", "#f0bfd6"]); g.strokeStyle = "rgba(190,110,150,.25)"; g.lineWidth = 1; for (let y = h * .2; y < h; y += M * .06) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }   // the notepaper
        const wr = lin(.2, .62, t) * 4, gold = lin(.62, .72, t); let tip = null; g.lineCap = "round"; g.lineWidth = 3.2;
        for (let L = 0; L < 4; L++) { const p = Math.min(1, Math.max(0, wr - L)); if (p <= 0) continue; const by = h * (.3 + .11 * L), xe = K.mix(x0, x1, p);
            g.strokeStyle = "rgb(" + ((122 + 100 * gold) | 0) + "," + ((26 + 120 * gold) | 0) + "," + ((90 - 40 * gold) | 0) + ")"; g.beginPath(); let ly = by; for (let x = x0; x <= xe; x += 3) { ly = by + Math.sin(x * .09 + L) * 7 + Math.sin(x * .33) * 2.5; ((x - x0) % 150) > 128 ? g.moveTo(x, ly) : g.lineTo(x, ly); } g.stroke();
            if (gold > 0) K.glow(g, (x0 + xe) / 2, by, (xe - x0) * .6, "#ffc84a", gold * .25); if (p < 1) tip = { x: xe, y: ly }; }
        if (tip && t < .64) { g.strokeStyle = "#4a1030"; g.lineWidth = 6; g.beginPath(); g.moveTo(tip.x, tip.y); g.lineTo(tip.x + M * .12, tip.y - M * .28); g.stroke(); hand(g, tip.x + M * .1, tip.y + M * .02, HS(X) * .8, .5, "point", { skin: "pale", rim: "#ff7ad9", sleeve: { c: "#f2c4dc", s: "#c98aa8", cuff: "#ffffff", len: 200 } }); K.glow(g, tip.x, tip.y, M * .04, "#ffc84a", .8); }   // her hand, moving on its own
        if (gold > 0) X.env.rects.forEach((r, i) => { const c = mid(r), ax = w / 2, ay = h * .45, mx = (ax + c.x) / 2 + (i - .5) * M * .3, my = (ay + c.y) / 2; for (let k = 0; k < 24; k++) { const u = (s * .5 + k / 24) % 1; K.glow(g, K.bez2(ax, mx, c.x, u), K.bez2(ay, my, c.y, u), M * .015, "#ffc84a", gold * (1 - u * .4)); } K.plateGhost(g, X, r, "", "#ffb43a", gold, gold); });   // the prophecy flies to the cards it is about
        K.cutIn(g, X, lin(.22, .44, t), { y: .16, hh: .2, dir: 1, ang: -.04, kj: "天使の自動筆記", name: "NEON NOSTRADE" });
        if (t > .66) K.title(g, X, lin(.66, 1, t), { en: "LOVELY GHOSTWRITER", kj: "天使の自動筆記", y: .86 });
        K.vignette(g, w, h, .45, "#3a0a24"); K.bars(g, w, h, 1);
    }
};

/* ---------- VANESSA · Red Thread of Fate: Rouge the cat appears, five red threads leave five fingers, find every opponent and knot ---------- */
const vanessa = {
    col: "#ff3b66", ms: 6800, dark: "#060003",
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, P = "#ff3b66";
        X.cue(.02, "chime", t); X.cue(.24, "whoosh", t); X.cue(.5, "chain", t); X.cue(.66, "reveal", t);
        K.sky(g, w, h, ["#1a0310", "#0c0108", "#060003"]); g.fillStyle = "rgba(255,160,190,.5)"; for (let i = 0; i < 60; i++) g.fillRect(hs(i) * w, hs(i + 7) * h, 1.6, 1.6);
        for (let i = 0; i < 14; i++) { const a = [hs(i) * w, hs(i + 3) < .5 ? 0 : h], b = [hs(i + 6) * w, hs(i + 9) < .5 ? 0 : h]; g.strokeStyle = "rgba(255,59,102," + (.12 + .1 * Math.sin(s * 2 + i)) + ")"; g.lineWidth = 1; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 60 * Math.sin(s + i), b[0], b[1]); g.stroke(); }   // a faint web of fate
        if (t < .24) K.cutIn(g, X, lin(0, .24, t), { y: .45, hh: .34, dir: -1, ang: -.08, kj: "運命の赤い糸", name: "VANESSA" });
        const sz = HS(X), hx = w / 2, hy = h * 1.12 - ss(.2, .3, t) * h * .1;
        const tips = [[-35, -158], [-14, -196], [8, -200], [28, -186], [-62, -98]].map(([a, b]) => [hx + a * sz * 1.05, hy + b * sz]);
        const R = X.env.rects;
        tips.forEach((a, k) => { const r = R[k % R.length], c = mid(r), bx = r.x + r.w * (.2 + .15 * ((k / R.length) | 0) + .25 * (k % 3)), by = c.y, p = ss(.26 + k * .03, .5 + k * .03, t), vib = ss(.56, .64, t), mx = (a[0] + bx) / 2, my = (a[1] + by) / 2 + M * .1 * (k % 2 ? 1 : -1);
            const pt = u => { const q = 1 - u, wv = Math.sin(u * 22 - s * 14) * M * .012 * vib * Math.sin(u * Math.PI); return [q * q * a[0] + 2 * q * u * mx + u * u * bx + wv, q * q * a[1] + 2 * q * u * my + u * u * by + wv]; };
            [[9, "rgba(255,59,102,.22)"], [3, "#ff3b66"], [1.2, "#ffd9e2"]].forEach(([lw, col]) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); for (let i = 0; i <= 40; i++) { if (i / 40 > p) break; const q = pt(i / 40); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.stroke(); });
            if (p > .98) K.glow(g, bx, by, M * .03, P, 1);
            if (t > .6) for (let j = 0; j < 3; j++) { const u = 1 - ((s * .8 + j / 3 + k * .2) % 1), q = pt(u); K.glow(g, q[0], q[1], M * .015, "#ffffff", .9); } });   // what the threads feel travels back
        hand(g, hx, hy, sz, 0, "spread", { skin: "base", sleeve: { c: "#1a0c12", s: "#0a0408", cuff: "#ff3b66", len: 260 } });
        const kn = ss(.5, .66, t); R.forEach(r => { K.plateGhost(g, X, r, "", P, kn, kn); g.save(); g.strokeStyle = P; g.lineWidth = 3; const per = 2 * (r.w + r.h + 24); g.setLineDash([per * kn, per]); g.strokeRect(r.x - 12, r.y - 12, r.w + 24, r.h + 24); g.restore(); });   // the thread knots around them
        const cat = ss(.3, .4, t) * (1 - ss(.6, .7, t)); if (cat > 0) { const cx = w * .82, cy = h * .6; g.save(); g.globalAlpha = cat; g.fillStyle = "#b8143a"; g.beginPath(); g.ellipse(cx, cy, M * .07, M * .06, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(cx - M * .06, cy - M * .03); g.lineTo(cx - M * .05, cy - M * .1); g.lineTo(cx - M * .02, cy - M * .05); g.moveTo(cx + M * .06, cy - M * .03); g.lineTo(cx + M * .05, cy - M * .1); g.lineTo(cx + M * .02, cy - M * .05); g.fill(); g.fillStyle = "#ffd9e2"; g.beginPath(); g.arc(cx - M * .025, cy - M * .005, M * .01, 0, TAU); g.arc(cx + M * .025, cy - M * .005, M * .01, 0, TAU); g.fill(); g.restore(); K.glow(g, cx, cy, M * .15, P, cat * .4); }   // Rouge
        if (t > .66) K.title(g, X, lin(.66, 1, t), { en: "RED THREAD OF FATE", kj: "運命の赤い糸", y: .86 });
        K.vignette(g, w, h, .6, "#000"); K.bars(g, w, h, 1);
    }
};

/* ---------- DIAVOLO · Epitaph / King Crimson: manga panels of the future flicker, time is ERASED, only the real cards remain ---------- */
const diavolo = {
    col: "#ff4fa8", ms: 6800, dark: "#08010a",
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, P = "#ff4fa8", KC = .52;
        X.cue(.02, "rumble", t); X.cue(.2, "stamp", t); X.cue(KC, "rewind", t); X.cue(KC + .01, "boom", t); X.cue(.76, "reveal", t);
        K.sky(g, w, h, ["#08010a", "#14021a", "#08010a"]);
        const panels = [[[0, 0], [.46, 0], [.38, .52], [0, .44]], [[.46, 0], [1, 0], [1, .36], [.56, .46], [.38, .52]], [[0, .44], [.38, .52], [.56, .46], [.5, 1], [0, 1]], [[.56, .46], [1, .36], [1, 1], [.5, 1]]], pal = [P, "#7a1fa2", "#ffa6dc", "#3a0a58"];
        const life = 1 - ss(KC - .04, KC + .06, t), step = (s * 3) | 0;
        if (life > 0) panels.forEach((pn, k) => {                            // Epitaph: jagged manga panels of possible futures
            const on = ss(.04 + k * .06, .1 + k * .06, t); if (on <= 0) return; g.save(); g.beginPath(); pn.forEach(([x, y], i) => { const px = w * x + (1 - on) * (k % 2 ? 60 : -60), py = h * y; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.clip(); g.globalAlpha = on * life;
            if (k === 1) { K.still(g, X, lin(0, KC, t), { z0: 1.2, dz: .1 }); g.globalCompositeOperation = "color"; g.fillStyle = "rgba(255,79,168,.4)"; g.fillRect(0, 0, w, h); g.globalCompositeOperation = "source-over"; }
            else { g.fillStyle = pal[k]; g.fillRect(0, 0, w, h); K.halftone(g, w, h, "rgba(0,0,0,.3)", 1, 11); const fx = w * (pn[0][0] + pn[2][0]) / 2, fy = h * (pn[0][1] + pn[2][1]) / 2; K.focus(g, fx, fy, w, h, s, { col: "rgba(255,255,255,.4)", n: 40, r0: M * .1 });
                for (let c = 0; c < 5; c++) { const o = hs(step * 7 + k * 13 + c) * 30 - 15, hl = c === ((hs(step + k) * 5) | 0); g.fillStyle = hl ? "#fff" : "#08010a"; g.fillRect(fx - M * .17 + c * M * .07, fy - M * .06 + o, M * .055, M * .12); } }
            g.restore(); g.strokeStyle = "#08010a"; g.lineWidth = 6; g.beginPath(); pn.forEach(([x, y], i) => i ? g.lineTo(w * x, h * y) : g.moveTo(w * x, h * y)); g.closePath(); g.stroke(); });
        if (t > .18 && t < KC) K.slam(g, "EPITAPH", w / 2, h * .5, M * .17, lin(.18, KC, t), { fill: "#fff", stroke: "#5a0a3a", glow: P, rot: -.08 });
        if (t >= KC && t < .76) {                                            // KING CRIMSON: time is erased. A red tear sweeps; the world turns to negative
            const q = lin(KC, .76, t), tx = w * ss(0, 1, q); g.save(); g.beginPath(); g.rect(0, 0, tx, h); g.clip(); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#000"; for (let i = 0; i < 40; i++) g.fillRect(hs(i) * w, hs(i + 3) * h, 3 + hs(i + 5) * 40, 2); g.restore();
            g.strokeStyle = "#e11b1b"; g.lineWidth = 6; g.beginPath(); for (let i = 0; i <= 12; i++) g.lineTo(tx + (i % 2 ? 22 : -22), h * i / 12); g.stroke();
            if (q > .15 && q < .9) K.txt(g, "キング・クリムゾン", w / 2, h / 2, M * .1, { font: K.F_JP, weight: "400", fill: "#e11b1b", stroke: "#000", glow: "#fff", rot: .06 });
            X.fx.glitch = .5 * (1 - q);
        }
        if (t >= .76) { g.fillStyle = "#08010a"; g.fillRect(0, 0, w, h); const a = lin(.76, .86, t); X.env.rects.forEach(r => K.plateGhost(g, X, r, "", P, a, a)); K.title(g, X, lin(.78, 1, t), { en: "KING CRIMSON", kj: "時間を消し飛ばす", y: .86 }); }   // only the real cards remain
        if (hit(t, KC, .03)) X.fx.inv = "#ff9ad0"; X.fx.rgb = hit(t, KC, .12) * 16;
        K.bars(g, w, h, 1);
    }
};

export const PEEK = { onepiece_e: shanks, naruto_e: neji, dragonball_e: jiren, jjk_e: gojo, demonslayer_e: yoriichi, bleach_e: yhwach, hxh_e: neon, blackclover_e: vanessa, jojo_e: diavolo };
