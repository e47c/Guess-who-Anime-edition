/* =====================================================================
   FUTURE SIGHT · nine ways of seeing the NEXT player's hand
   The reveal is part of each scene: the next player's real cards (X.cards, DOM cards above the main canvas, below the
   X.gf foreground canvas) come out of their plate and are shown the way that character sees. Faces only appear for the
   player who used the card; everyone else watches the same moves with the backs. tail() is the hold that keeps the
   cards up long enough to read them. X.env: r = the target's plate, slots = where each card rests, toName, top/bot.
   ===================================================================== */
import * as K from "./kit.js?v=8";
import { hand } from "./hands.js?v=8";
const { lin, ss, hit, hs, TAU, mid, mix, bell } = K;

const HS = X => X.M * (X.h > X.w ? .0036 : .003);
const fade = tt => 1 - ss(.84, 1, tt);
/* a card's way from the target's plate to its slot (arc = how high it bows) */
function travel(X, sl, p, arc = -.16, ease = K.oCub) {
    const pc = mid(X.env.r), e = ease(p), s0 = Math.max(.15, Math.min(1, X.env.r.h * .8 / sl.h));
    return { x: mix(pc.x, sl.x, e), y: mix(pc.y, sl.y, e) + Math.sin(e * Math.PI) * X.M * arc, s: mix(s0, 1, e) };
}
const stag = (i, n, span) => n > 1 ? i / (n - 1) * span : 0;
function label(X, a, col) {
    if (a <= 0) return; const g = X.gf; g.save(); g.globalAlpha = a;
    K.txt(g, (X.env.toName + "'s hand").toUpperCase(), X.w / 2, Math.max(X.M * .06, X.env.top - X.M * .06), X.M * .04, { fill: "#fff", stroke: "#000", glow: col || X.col, sw: X.M * .006, sp: X.M * .005 }); g.restore();
}
function eye(g, x, y, W, open, o) {                                        // a stylised anime eye (iris rings, pupil or slit, highlight)
    if (open < .03) return; const H = W * .36 * open; g.save(); g.translate(x, y); g.rotate(o.tilt || 0);
    const path = () => { g.beginPath(); g.moveTo(-W / 2, 0); g.quadraticCurveTo(0, -H * 2, W / 2, 0); g.quadraticCurveTo(0, H * 2, -W / 2, 0); g.closePath(); };
    path(); g.fillStyle = o.white || "#04020a"; g.fill(); g.save(); path(); g.clip();
    const ir = Math.max(2, H * 1.05), gr = g.createRadialGradient(0, 0, ir * .08, 0, 0, ir); o.stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.beginPath(); g.arc(o.lx || 0, o.ly || 0, ir, 0, TAU); g.fill();
    if (o.slit) { g.fillStyle = "#000"; g.beginPath(); g.ellipse(o.lx || 0, o.ly || 0, ir * .11, ir * .96, 0, 0, TAU); g.fill(); } else if (o.pupil !== false) { g.fillStyle = "#020208"; g.beginPath(); g.arc(o.lx || 0, o.ly || 0, ir * .26, 0, TAU); g.fill(); }
    g.fillStyle = "rgba(255,255,255,.95)"; g.beginPath(); g.arc(-ir * .3, -ir * .3, ir * .12, 0, TAU); g.fill(); g.restore();
    path(); g.strokeStyle = o.rim; g.lineWidth = Math.max(1.5, W * .03); g.stroke(); if (o.glow) K.glow(g, 0, 0, W * .6, o.glow, .3 * open); g.restore();
}
/* black lightning with a red edge: Conqueror's Haki */
function hakiBolt(g, x0, y0, x1, y1, sd, wd, red = "#ff2a3a") {
    const L = Math.hypot(x1 - x0, y1 - y0) || 1, n = Math.max(6, Math.round(L / 30)), nx = -(y1 - y0) / L, ny = (x1 - x0) / L, pts = [[x0, y0]];
    for (let i = 1; i < n; i++) { const k = i / n, o = (hs(sd + i * 1.3) - .5) * L * .22 * Math.sin(k * Math.PI); pts.push([x0 + (x1 - x0) * k + nx * o, y0 + (y1 - y0) * k + ny * o]); } pts.push([x1, y1]);
    const path = () => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); };
    g.save(); g.lineJoin = "round"; g.lineCap = "round"; g.globalCompositeOperation = "lighter"; path(); g.strokeStyle = K.rgba(red, .35); g.lineWidth = wd * 5; g.stroke(); path(); g.strokeStyle = red; g.lineWidth = wd * 2.2; g.stroke();
    g.globalCompositeOperation = "source-over"; path(); g.strokeStyle = "#050003"; g.lineWidth = wd * 1.2; g.stroke(); g.restore();
    return pts;
}
/* a living tendril of darkness: a tapered, writhing black shape (Yhwach) */
function tendril(g, x, y, ang, len, wid, s, sd, rim) {
    const N = 18, L = [], R = [];
    for (let i = 0; i <= N; i++) { const k = i / N, a = ang + Math.sin(s * (1.3 + hs(sd) * .8) + k * 5 + sd) * .55 * k + (hs(sd + 3) - .5) * k * 1.2, px = x + Math.cos(ang) * len * k + Math.cos(a + 1.57) * Math.sin(k * 6 + s * 2 + sd) * wid * .8 * k, py = y + Math.sin(ang) * len * k + Math.sin(a + 1.57) * Math.sin(k * 6 + s * 2 + sd) * wid * .8 * k, wd = wid * (1 - k) ** 1.3;
        L.push([px + Math.cos(a + 1.57) * wd, py + Math.sin(a + 1.57) * wd]); R.push([px - Math.cos(a + 1.57) * wd, py - Math.sin(a + 1.57) * wd]); }
    g.beginPath(); L.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); R.reverse().forEach(p => g.lineTo(p[0], p[1])); g.closePath();
    g.fillStyle = "#030106"; g.fill(); if (rim) { g.strokeStyle = rim; g.lineWidth = 1.6; g.stroke(); }
}
function spike(g, x, y, ang, len, wid, rim) {
    g.beginPath(); g.moveTo(x + Math.cos(ang + 1.57) * wid, y + Math.sin(ang + 1.57) * wid); g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); g.lineTo(x - Math.cos(ang + 1.57) * wid, y - Math.sin(ang + 1.57) * wid); g.closePath();
    g.fillStyle = "#040108"; g.fill(); g.strokeStyle = rim; g.lineWidth = 1.4; g.stroke();
}
/* Gryphon, Shanks' sabre: a gently curved single-edged blade, a gilded knuckle-bow guard. Hilt at (x, y), blade along +x */
function gryphon(g, x, y, ang, len, out, glow, s) {
    const k = len / 600; g.save(); g.translate(x, y); g.rotate(ang); g.scale(k, k); g.lineJoin = "round"; const ink = "#0a0608";
    g.fillStyle = "#2a1a14"; g.beginPath(); g.moveTo(-150, -11); g.lineTo(-14, -13); g.lineTo(-14, 13); g.lineTo(-150, 11); g.quadraticCurveTo(-160, 0, -150, -11); g.fill(); g.lineWidth = 4; g.strokeStyle = ink; g.stroke();     // leather grip
    g.strokeStyle = "#5a3a26"; g.lineWidth = 2; for (let i = -140; i < -20; i += 12) { g.beginPath(); g.moveTo(i, -10); g.lineTo(i + 8, 10); g.stroke(); }
    const gold = g.createLinearGradient(0, -40, 0, 40); gold.addColorStop(0, "#fff1a8"); gold.addColorStop(.45, "#d9a43a"); gold.addColorStop(1, "#7a5212"); g.fillStyle = gold;
    g.beginPath(); g.ellipse(-166, 0, 14, 12, 0, 0, TAU); g.fill(); g.stroke();                                   // pommel
    g.beginPath(); g.moveTo(-6, -24); g.bezierCurveTo(-40, -58, -150, -52, -166, -12); g.lineWidth = 9; g.strokeStyle = ink; g.stroke(); g.lineWidth = 6; g.strokeStyle = gold; g.stroke();   // knuckle bow
    g.beginPath(); g.moveTo(-14, -30); g.quadraticCurveTo(0, -42, 12, -26); g.lineTo(12, 26); g.quadraticCurveTo(0, 40, -14, 30); g.closePath(); g.fillStyle = gold; g.fill(); g.lineWidth = 4; g.strokeStyle = ink; g.stroke();   // shell guard
    g.beginPath(); g.moveTo(10, 22); g.quadraticCurveTo(34, 34, 30, 52); g.quadraticCurveTo(18, 40, 6, 30); g.closePath(); g.fill(); g.stroke();                                  // the quillon curl
    const bl = 560 * out; if (bl > 4) {
        g.beginPath(); g.moveTo(12, -8); g.quadraticCurveTo(bl * .5, -16, bl, -34); g.quadraticCurveTo(bl - 8, -14, bl - 30, -4); g.quadraticCurveTo(bl * .5, 4, 12, 10); g.closePath();
        const gr = g.createLinearGradient(0, -16, 0, 10); gr.addColorStop(0, "#f6f6fa"); gr.addColorStop(.5, "#a8a8b6"); gr.addColorStop(1, "#3a3a46"); g.fillStyle = gr; g.fill(); g.lineWidth = 3.5; g.strokeStyle = ink; g.stroke();
        g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 2; g.beginPath(); g.moveTo(20, -5); g.quadraticCurveTo(bl * .5, -12, bl - 10, -28); g.stroke();
        g.strokeStyle = "rgba(20,20,30,.5)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(24, 2); g.quadraticCurveTo(bl * .5, -4, bl * .86, -16); g.stroke();      // the fuller
        if (glow) { g.globalCompositeOperation = "lighter"; g.beginPath(); g.moveTo(12, -8); g.quadraticCurveTo(bl * .5, -16, bl, -34); g.lineWidth = 26 + 8 * Math.sin(s * 20); g.strokeStyle = K.rgba(glow, .2); g.stroke(); g.lineWidth = 8; g.strokeStyle = K.rgba(glow, .85); g.stroke(); }
    }
    g.restore();
}

/* ---------- SHANKS · Conqueror's Haki: the stare, a wave of will that drains the world, black-red lightning tears the cards out
   of the next player's hand, they hang in the air coated in black until the Haki cracks off them ---------- */
const shanks = {
    col: "#ff2a3a", ms: 7000, fg: 1,
    main(g, X, T) {
        const { w, h, M, gf } = X, t = T.t, s = T.s, R = Math.hypot(w, h) / 2, pc = mid(X.env.r), RV = .56, W = [.3, .37, .44, .5];
        X.cue(.02, "heartbeat", t); W.forEach((a, i) => X.cue(a, i % 2 ? "zap" : "boom", t)); X.cue(RV, "crack", t); X.cue(RV + .01, "reveal", t);
        if (t < .3) {                                                             // the stare
            K.eyes(g, X, lin(0, .3, t), { tint: "#ff2a3a", ta: .22 }); K.column(gf, "覇王色", w * .08, h * .2, M * .07, lin(.04, .2, t), { fill: "#fff", stroke: "#3a0006", glow: "#ff2a3a", sw: 3 });
            X.cards(() => ({ a: 0 })); K.bars(gf, w, h, 1); return;
        }
        const nb = W.filter(a => t >= a).length, pulse = W.reduce((m, a) => Math.max(m, hit(t, a, .05)), 0) + X.vox * .3;
        g.save(); K.cam(g, X, { shake: pulse * 18 + 1.5 });
        K.sky(g, w, h, ["#090002", "#220207", "#000"]); K.radial(g, w / 2, h * 1.05, R, ["rgba(255,30,50,.35)", "rgba(80,0,10,.15)", "rgba(0,0,0,0)"]);
        g.save(); g.globalCompositeOperation = "saturation"; g.fillStyle = "rgba(0,0,0," + lin(.3, .42, t) * .85 + ")"; g.fillRect(0, 0, w, h); g.restore();
        for (let i = 0; i < nb; i++) { const q = lin(W[i], W[i] + .16, t); K.shock(g, w / 2, h * 1.02, q, R * 1.5, "#ff2a3a", 46); }        // the waves of will roll out from Shanks
        const draw = ss(.3, .4, t), hx = w * .78, hy = h * .9, ang = -2.25;      // Gryphon half drawn, his one hand on the hilt
        gryphon(g, hx, hy, ang, M * .72, draw, t > .4 ? "#ff2a3a" : null, s);
        hand(g, hx + Math.cos(ang) * -M * .085 + M * .01, hy + Math.sin(ang) * -M * .085 + M * .04, HS(X) * .95, ang + 1.5708, "fist", { skin: "tan", haki: t > .44 ? "#ff2a3a" : null, t: s, sleeve: { c: "#141016", s: "#07050a", cuff: "#2b1c18", len: 240 } });
        if (t < RV + .02) { K.plateGhost(g, X, X.env.r, X.env.toName, "#ff2a3a", 1, nb / 4); K.cracks(g, pc.x, pc.y, nb / 4, Math.max(X.env.r.w, M * .2) * .6, 9, "rgba(255,255,255,.85)", 12); }
        for (let i = 0; i < nb; i++) for (let k = 0; k < 3; k++) { const a0 = -Math.PI / 2 + (k - 1) * .8 + i * .3; if (hs(i * 9 + k + Math.floor(s * 14)) < .4) hakiBolt(g, w / 2, h * 1.02, w / 2 + Math.cos(a0) * R * .9, h * 1.02 + Math.sin(a0) * R * .9, i * 31 + k + Math.floor(s * 18), 2.4); }
        g.restore();
        // the cards: torn out by the 3rd wave, lifted to their places, black with haki until it cracks off at RV
        const pull = lin(.44, RV, t), crack = lin(RV, RV + .14, t);
        X.cards((i, n, sl) => {
            const p = lin(stag(i, n, .25), .75 + stag(i, n, .25), pull), q = travel(X, sl, p, -.2, K.oBack), jx = (1 - pull) * (hs(i + Math.floor(s * 30)) - .5) * 8;
            const cr = lin(stag(i, n, .3), .7 + stag(i, n, .3), crack), b = mix(.08, 1, cr);
            return { x: q.x + jx, y: q.y, s: q.s, r: (1 - p) * (hs(i) - .5) * 40, a: ss(0, .1, p), flip: cr, f: "brightness(" + b.toFixed(3) + ") saturate(" + (cr * 1.1).toFixed(3) + ")" };
        });
        if (t > .48) X.env.slots.forEach((sl, i) => { const cr = lin(stag(i, sl.n, .3), .7 + stag(i, sl.n, .3), crack); if (cr < 1) { const a = 1 - cr; gf.save(); gf.globalAlpha = a; K.cracks(gf, sl.x, sl.y, .4 + cr, sl.h * .6, i * 7, "#ff5060", 8); gf.restore(); }
            if (t < RV && pull < 1 && hs(i + Math.floor(s * 16)) < .3) hakiBolt(g, pc.x, pc.y, sl.x, sl.y, i * 13 + Math.floor(s * 22), 1); });
        if (t > .52) label(X, lin(.52, .6, t));
        if (t > .38 && t < .62) K.slam(gf, "覇王色の覇気", w / 2, h * .16, M * .09, lin(.38, .62, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#3a0006", glow: "#ff2a3a", ghost: 1 });
        if (t > .66) K.title(gf, X, lin(.66, 1, t), { en: "CONQUEROR'S HAKI", sub: "SHANKS · " + X.who, y: .8 });
        if (hit(t, RV, .03)) X.fx.inv = "#ff8a8a"; X.fx.rgb = hit(t, RV, .1) * 14 + pulse * 4;
        K.bars(gf, w, h, 1);
    },
    tail(g, X, T) {
        const { w, h, M, gf } = X, tt = T.tt, s = T.s, a = fade(tt);
        K.sky(g, w, h, ["#090002", "#1a0206", "#000"]); g.globalAlpha = a;
        X.env.slots.forEach((sl, i) => K.glow(g, sl.x, sl.y, sl.h * .9, "#ff2a3a", .25 + .15 * Math.sin(s * 5 + i)));
        X.cards((i, n, sl) => ({ x: sl.x + (hs(i + Math.floor(s * 20)) - .5) * 2, y: sl.y, a, flip: 1 }));
        X.env.slots.forEach((sl, i) => { if (i < sl.n - 1 && hs(i + Math.floor(s * 9)) < .35) { const nx = X.env.slots[i + 1]; gf.save(); gf.globalAlpha = a; hakiBolt(gf, sl.x + sl.w * .45, sl.y - sl.h * .3, nx.x - nx.w * .45, nx.y - nx.h * .3, i * 7 + Math.floor(s * 20), 1.2); gf.restore(); } });
        label(X, a); g.globalAlpha = 1; K.bars(gf, w, h, a);
    }
};

/* ---------- NEJI · Byakugan: the veins swell, the world turns to an x-ray of chakra, the field of view sweeps the table, finds
   the next player and sees THROUGH their hand: the cards drift out as negatives inside the 64-trigram circle and develop
   into the real thing at "toraeta" (got you) ---------- */
function chakraNet(g, x, y, R, s, a, col, sd) {
    const br = (x0, y0, an, len, d, k) => { if (d > 4) return; const x1 = x0 + Math.cos(an) * len, y1 = y0 + Math.sin(an) * len; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineWidth = Math.max(.6, (5 - d) * .9); g.stroke(); if (d === 2) K.glow(g, x1, y1, R * .06, col, .7 * a * (.5 + .5 * Math.sin(s * 6 + k))); br(x1, y1, an + .5 + (hs(k + sd) - .5) * .4, len * .7, d + 1, k * 2 + 1); br(x1, y1, an - .5 + (hs(k + sd + 3) - .5) * .4, len * .7, d + 1, k * 2 + 2); };
    g.save(); g.globalAlpha *= a; g.strokeStyle = K.rgba(col, .8); g.globalCompositeOperation = "lighter"; for (let k = 0; k < 7; k++) br(x, y, k / 7 * TAU + sd, R * .3, 0, k + 1); g.restore();
}
const TRI = ["☰", "☱", "☲", "☳", "☴", "☵", "☶", "☷"];
function trigrams(g, x, y, R, rot, a, col) {
    if (a <= 0) return; g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(rot); g.strokeStyle = col; g.lineWidth = 2;
    [1, .93, .6].forEach(k => { g.beginPath(); g.arc(0, 0, R * k, 0, TAU); g.stroke(); });
    for (let k = 0; k < 8; k++) { g.save(); g.rotate(k * TAU / 8); K.txt(g, TRI[k], 0, -R * .78, R * .16, { font: "serif", weight: "400", fill: col, sw: 0 }); g.beginPath(); g.moveTo(0, -R * .6); g.lineTo(0, -R * .93); g.stroke(); g.restore(); }
    g.restore();
}
const XRAY = k => "invert(" + k.toFixed(3) + ") grayscale(" + k.toFixed(3) + ") sepia(" + (k * .6).toFixed(3) + ") hue-rotate(" + (175 * k).toFixed(1) + "deg) saturate(" + (1 + k * 2).toFixed(3) + ") brightness(" + (1 + k * .25).toFixed(3) + ")";
const neji = {
    col: "#c9d6ff", ms: 9000, fg: 1,
    main(g, X, T) {
        const { w, h, M, gf } = X, t = T.t, s = T.s, V = "#c9d6ff", pc = mid(X.env.r), RV = .6;
        X.cue(.02, "heartbeat", t); X.cue(.12, "reveal", t); X.cue(.36, "whoosh", t); X.cue(RV, "chime", t); X.cue(RV + .01, "boom", t);
        if (t < .16) {                                                       // the eyes, the veins push out from them
            const p = lin(0, .16, t); K.eyes(g, X, Math.min(.9, p * 1.3), { tint: "#c9d6ff", ta: .35, hh: .3 });
            const vein = ss(.25, .8, p) * (.8 + X.vox * .4); g.save(); g.strokeStyle = K.rgba("#8a80c0", .9 * Math.min(1, vein)); g.lineWidth = 2.2; g.lineCap = "round"; [-1, 1].forEach(sd => { const ex = w / 2 + sd * w * .12, ey = h / 2; for (let k = 0; k < 9; k++) { let x = ex + sd * w * .08, y = ey, an = (sd > 0 ? -.4 : Math.PI + .4) + (k - 4) * .25; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 5; j++) { an += (hs(k * 9 + j) - .5) * .5; x += Math.cos(an) * M * .04 * vein; y += Math.sin(an) * M * .04 * vein; g.lineTo(x, y); } g.stroke(); } }); g.restore();
            K.slam(gf, "白眼!", w / 2, h * .2, M * .14, lin(.04, .16, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#1a1d4a", glow: "#8fa4ff" });
            if (t > .14) X.fx.flash = ["#e8e6ff", lin(.14, .16, t)]; X.cards(() => ({ a: 0 })); K.bars(gf, w, h, 1); return;
        }
        K.sky(g, w, h, ["#0b1a4a", "#050b2a", "#02040f"]);                  // the x-ray world: everything is chakra
        chakraNet(g, w / 2, h / 2, M * 1.1, s, .45 + X.vox * .3, "#8fb0ff", 1);
        K.focus(g, w / 2, h / 2, w, h, s, { col: "rgba(200,215,255,.14)", n: 60, r0: M * .2 });
        const sweep = lin(.16, .36, t), sr = sweep * Math.hypot(w, h);           // the 360° field of view grows from the eyes and finds the table
        if (sweep < 1) { g.save(); g.strokeStyle = K.rgba(V, .8 * (1 - sweep)); g.lineWidth = 3; g.beginPath(); g.arc(w / 2, h / 2, sr, 0, TAU); g.stroke(); g.restore(); }
        const lk = lin(.28, .36, t); K.plateGhost(g, X, X.env.r, X.env.toName, V, lk * (1 - lin(.5, .6, t)), lk); chakraNet(g, pc.x, pc.y, Math.max(X.env.r.w, M * .3), s, lk, "#dfe8ff", 4);
        const tr = Math.max(...X.env.slots.map(sl => Math.max(Math.abs(sl.x - w / 2) + sl.w, sl.h))) * 1.05;
        trigrams(g, w / 2, h / 2, Math.min(tr, M * .48) * K.oBack(lin(.36, .5, t)), s * .15 + (t > RV ? 0 : (1 - lin(.36, RV, t)) * 2), lin(.36, .44, t) * .85, V);
        const out = lin(.36, .54, t), dev = lin(RV - .04, RV + .06, t);           // out of the plate as negatives, developed at RV
        X.cards((i, n, sl) => { const p = lin(stag(i, n, .3), .7 + stag(i, n, .3), out), q = travel(X, sl, p, -.08, K.ioCub); return { x: q.x, y: q.y + Math.sin(s * 1.6 + i) * 3, s: q.s, a: lin(0, .15, p), flip: 1, f: XRAY(1 - dev) }; });
        if (t >= RV && t < RV + .1) { const q = lin(RV, RV + .1, t); X.env.slots.forEach(sl => K.shock(gf, sl.x, sl.y, q, sl.h * .9, V, 6)); K.slam(gf, "捉えた", w / 2, h * .17, M * .1, q, { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#1a1d4a", glow: "#8fa4ff" }); }
        if (t > .4) label(X, lin(.4, .5, t), "#8fa4ff");
        K.cutIn(gf, X, lin(.18, .34, t), { y: .82, hh: .2, dir: 1, ang: -.05, kj: "白眼", name: "NEJI HYUGA" });
        if (t > .68) K.title(gf, X, lin(.68, 1, t), { en: "BYAKUGAN", y: .8 });
        if (hit(t, RV, .03)) X.fx.inv = "#dfe8ff";
        K.vignette(g, w, h, .6, "#000"); K.bars(gf, w, h, 1);
    },
    tail(g, X, T) {
        const { w, h, M, gf } = X, tt = T.tt, s = T.s, a = fade(tt);
        K.sky(g, w, h, ["#0b1a4a", "#050b2a", "#02040f"]); g.globalAlpha = a; chakraNet(g, w / 2, h / 2, M * 1.1, s, .35, "#8fb0ff", 1);
        trigrams(g, w / 2, h / 2, M * .46, s * .15, .6, "#c9d6ff");
        X.cards((i, n, sl) => ({ x: sl.x, y: sl.y + Math.sin(s * 1.6 + i) * 3, a, flip: 1 }));
        label(X, a, "#8fa4ff"); g.globalAlpha = 1; K.bars(gf, w, h, a);
    }
};

/* ---------- JIREN · Power Gaze: absolute stillness, eyes shut; the eyes open and the glare SCANS the table, ki pressure lifts
   the next player's cards into the air, each one burning in his red aura ---------- */
function kiFlame(g, sl, s, a, i) {                                         // red-orange ki burning up from behind a card
    if (a <= 0) return; g.save(); g.globalCompositeOperation = "lighter";
    for (let j = 0; j < 9; j++) { const fx = sl.x - sl.w * .55 + sl.w * 1.1 * (j / 8), fh = sl.h * (.7 + .7 * hs(i * 9 + j)) * (.75 + .25 * Math.sin(s * 11 + j * 2)), by = sl.y + sl.h * .5;
        const gr = g.createLinearGradient(0, by, 0, by - sl.h - fh); gr.addColorStop(0, "rgba(255,235,210," + a * .7 + ")"); gr.addColorStop(.3, "rgba(255,110,40," + a * .55 + ")"); gr.addColorStop(1, "rgba(140,0,0,0)");
        g.fillStyle = gr; g.beginPath(); g.moveTo(fx - sl.w * .1, by); g.quadraticCurveTo(fx, by - (sl.h + fh) * .5, fx + 7 * Math.sin(s * 8 + j), by - sl.h - fh); g.quadraticCurveTo(fx, by - (sl.h + fh) * .5, fx + sl.w * .1, by); g.fill(); }
    g.restore();
}
const jiren = {
    col: "#ff5a3c", ms: 8000, fg: 1,
    main(g, X, T) {
        const { w, h, M, gf } = X, t = T.t, s = T.s, R = Math.hypot(w, h) * .6, O = "#ff5a3c", pc = mid(X.env.r), RV = .5;
        X.cue(.02, "heartbeat", t); X.cue(.3, "heartbeat", t); X.cue(RV, "boom", t); X.cue(.62, "reveal", t);
        K.sky(g, w, h, ["#060608", "#101014", "#030304"]);
        if (t < RV) {                                                         // meditation: the art in silence, rings of vibration
            g.save(); g.globalAlpha = .6; K.still(g, X, lin(0, RV, t), { z0: 1.05, dz: .08, dy: .1 }); g.restore(); g.fillStyle = "rgba(3,3,4,.45)"; g.fillRect(0, 0, w, h);
            for (let k = 0; k < 6; k++) { const q = lin(.06 + k * .07, .4 + k * .07, t); if (q > 0 && q < 1) { g.strokeStyle = "rgba(220,220,230," + (.4 * (1 - q)) + ")"; g.lineWidth = 2; g.beginPath(); g.arc(w / 2, h / 2, q * R, 0, TAU); g.stroke(); } }
            K.column(gf, "静", w * .1, h * .3, M * .14, lin(.04, .3, t), { fill: "#fff", stroke: "#300", glow: O, sw: 3 }); X.cards(() => ({ a: 0 })); K.bars(gf, w, h, 1); return;
        }
        const q = lin(RV, RV + .08, t); g.save(); K.cam(g, X, { shake: hit(t, RV, .1) * 22 + X.vox * 3 });
        K.sky(g, w, h, ["#1a0402", "#3a0a04", "#060101"]); K.radial(g, w / 2, h / 2, M * (.3 + .6 * q), ["rgba(255,90,60,.5)", "rgba(255,90,60,0)"]);
        K.eyes(g, X, Math.min(.5, lin(RV, RV + .2, t) * .5), { tint: "#ff3a2a", ta: .4, hh: .18, y: .14, nobg: 1 });
        const scan = lin(RV + .02, .62, t), sy = mix(h * .14, h * .9, scan);             // the glare sweeps down across the table
        if (scan > 0 && scan < 1) { g.save(); g.globalCompositeOperation = "lighter"; const gr = g.createLinearGradient(0, sy - M * .12, 0, sy + M * .02); gr.addColorStop(0, "rgba(255,60,30,0)"); gr.addColorStop(.85, "rgba(255,90,60,.55)"); gr.addColorStop(1, "rgba(255,240,220,.9)"); g.fillStyle = gr; g.fillRect(0, sy - M * .12, w, M * .14); g.restore(); }
        K.plateGhost(g, X, X.env.r, X.env.toName, O, 1 - lin(.6, .7, t), lin(RV, .56, t));
        const lift = lin(.54, .7, t), lock = lin(.62, .74, t);
        X.env.slots.forEach((sl, i) => { const p = lin(stag(i, sl.n, .3), .7 + stag(i, sl.n, .3), lift), qq = travel(X, sl, p, -.05); kiFlame(g, { x: qq.x, y: qq.y, w: sl.w * qq.s, h: sl.h * qq.s }, s, lin(0, .3, p) * (.6 + X.vox * .5), i); });
        K.shock(g, w / 2, h / 2, q, R * 1.5, O, 40); g.restore();
        X.cards((i, n, sl) => { const p = lin(stag(i, n, .3), .7 + stag(i, n, .3), lift), qq = travel(X, sl, p, -.05), sh = (1 - lock) * 6; return { x: qq.x + (hs(i + Math.floor(s * 40)) - .5) * sh, y: qq.y + (hs(i + 5 + Math.floor(s * 40)) - .5) * sh, s: qq.s, a: lin(0, .2, p), flip: lin(stag(i, n, .3), .5 + stag(i, n, .3), lock) }; });
        X.env.slots.forEach((sl, i) => { const lp = lin(stag(i, sl.n, .3), .5 + stag(i, sl.n, .3), lock); if (lp > .45 && lp < 1) K.shock(gf, sl.x, sl.y, lin(.45, 1, lp), sl.h * .8, O, 8); });
        if (t > .6) label(X, lin(.6, .7, t), O);
        if (t > .7) K.title(gf, X, lin(.7, 1, t), { en: "POWER GAZE", sub: "JIREN · " + X.who, y: .8 });
        if (hit(t, RV, .03)) X.fx.inv = "#ff9a8a";
        K.bars(gf, w, h, 1);
    },
    tail(g, X, T) {
        const { w, h, gf } = X, tt = T.tt, s = T.s, a = fade(tt);
        K.sky(g, w, h, ["#1a0402", "#2a0804", "#060101"]); g.globalAlpha = a;
        X.env.slots.forEach((sl, i) => kiFlame(g, sl, s, .7, i)); X.cards((i, n, sl) => ({ x: sl.x, y: sl.y, a, flip: 1 }));
        K.drift(g, w, h, s, 30, 4, { up: 1, speed: .1, col: "#ff7a3a", size: 2.4, glow: 1, add: 1, a: .7 * a });
        label(X, a, "#ff5a3c"); g.globalAlpha = 1; K.bars(gf, w, h, a);
    }
};

/* ---------- GOJO · Infinite Void: the Six Eyes, the crossed-finger sign, DOMAIN EXPANSION; inside the void the next player's
   cards float in an endless flood of information, every line of it pouring through them until they are fully seen ---------- */
const FXG = "無量空処0123456789∞呪術廻戦";
function voidSpace(g, w, h, s, speed, glyph) {
    const cx = w / 2, cy = h / 2, R = Math.hypot(w, h) / 2; K.radial(g, cx, cy, R, ["#0b1f5c", "#050b2e", "#000007"]);
    for (let i = 0; i < 5; i++) K.pool(g, w * (.2 + .6 * hs(i + 40) + .08 * Math.sin(s * .3 + i)), h * (.2 + .6 * hs(i + 50) + .08 * Math.cos(s * .25 + i)), R * (.35 + .2 * hs(i + 60)), i % 2 ? "#825aff" : "#28c8ff", .2);
    g.lineCap = "round"; for (let i = 0; i < 150; i++) { const a = hs(i) * TAU, z = (hs(i + 7) + s * .1 * speed) % 1, r = Math.pow(z, 2.2) * R * 1.05, len = Math.min(r, 3 + speed * r * .045);
        g.beginPath(); g.moveTo(cx + Math.cos(a) * (r - len), cy + Math.sin(a) * (r - len)); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.globalAlpha = Math.min(1, z * 1.4); g.strokeStyle = i % 5 === 0 ? "#b9a6ff" : i % 2 ? "#ffffff" : "#7fe9ff"; g.lineWidth = .6 + z * 2.4; g.stroke(); }
    g.globalAlpha = 1;
    if (glyph > 0) { g.font = "700 20px monospace"; g.textAlign = "center"; g.textBaseline = "middle"; const cols = Math.ceil(w / 34);
        for (let c = 0; c < cols; c++) { const head = ((s * (.12 + hs(c + 70) * .22) * (.6 + speed * .35) + hs(c + 80)) % 1) * (h + 260) - 130;
            for (let j = 0; j < 9; j++) { g.globalAlpha = glyph * (1 - j / 9); g.fillStyle = j ? "#6fe3ff" : "#ffffff"; g.fillText(FXG[(Math.floor(s * 5 * (.5 + hs(c + j))) + c * 3 + j) % FXG.length], c * 34 + 17, head - j * 24); } } g.globalAlpha = 1; }
}
const gojo = {
    col: "#33ccff", ms: 8400, fg: 1,
    main(g, X, T) {
        const { w, h, M, gf } = X, t = T.t, s = T.s, R = Math.hypot(w, h) / 2, E = .3, RV = .46;
        X.cue(.02, "reveal", t); X.cue(.2, "clap", t); X.cue(E, "boom", t); X.cue(E + .01, "chime", t); X.cue(RV, "whoosh", t); X.cue(.6, "reveal", t);
        if (t < .18) { K.eyes(g, X, lin(0, .2, t), { tint: "#33ccff", ta: .15 }); K.column(gf, "六眼", w * .08, h * .22, M * .08, lin(.03, .15, t), { fill: "#e8fbff", stroke: "#0a6ea8", glow: "#33ccff", sw: 3 }); X.cards(() => ({ a: 0 })); K.bars(gf, w, h, 1); return; }
        if (t < E) {                                                         // the sign: index and middle crossed
            K.sky(g, w, h, ["#000", "#020a1e", "#000"]); K.focus(g, w / 2, h * .5, w, h, s, { col: "rgba(127,233,255,.4)", n: 100, r0: M * .16 });
            hand(g, w / 2, h * 1.06 - ss(.18, .24, t) * h * .14, HS(X) * 1.25, 0, "cross", { skin: "pale", rim: "#7fe9ff", sleeve: { c: "#0a0c14", s: "#000", cuff: "#1a1e2a", len: 260 } });
            K.slam(gf, "領域展開", w / 2, h * .2, M * .14, lin(.2, E + .02, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#0b6fb8", glow: "#33ccff" }); X.cards(() => ({ a: 0 })); K.bars(gf, w, h, 1); return;
        }
        const dome = K.oExpo(lin(E, E + .1, t)) * R * 1.1;
        if (dome < R * 1.05) { K.sky(g, w, h, ["#000", "#020a1e", "#000"]); g.save(); g.beginPath(); g.arc(w / 2, h / 2, dome, 0, TAU); g.clip(); voidSpace(g, w, h, s, 1.4, 0); g.restore(); g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = "#e8fbff"; g.lineWidth = 8; g.beginPath(); g.arc(w / 2, h / 2, dome, 0, TAU); g.stroke(); g.restore(); }
        else voidSpace(g, w, h, s, 1 + lin(RV, RV + .1, t) * 8 * (1 - lin(.62, .8, t)) + X.vox * 2, .5 * ss(RV - .05, RV + .05, t));
        if (t < RV + .02) { const pa = lin(E + .04, E + .1, t) * (1 - lin(RV - .02, RV + .02, t)); K.plateGhost(g, X, X.env.r, X.env.toName, "#7fe9ff", pa, 1); }
        const pull = lin(RV, RV + .1, t), see = lin(RV + .06, .64, t);              // the void takes the cards; information pours through them until they are known
        X.cards((i, n, sl) => { const p = lin(stag(i, n, .3), .7 + stag(i, n, .3), pull), q = travel(X, sl, p, -.12, K.oExpo), f = lin(stag(i, n, .5), .5 + stag(i, n, .5), see);
            return { x: q.x, y: q.y + Math.sin(s * 1.3 + i * 1.7) * 6, s: q.s, r: Math.sin(s * .9 + i) * 2.5, a: lin(0, .15, p), flip: f, f: f < 1 ? "brightness(" + (1 + (1 - f) * 1.4).toFixed(2) + ") saturate(" + (.4 + f * .6).toFixed(2) + ")" : "" }; });
        if (see > 0 && see < 1) X.env.slots.forEach((sl, i) => { const f = lin(stag(i, sl.n, .5), .5 + stag(i, sl.n, .5), see); if (f > 0 && f < 1) { const y = sl.y - sl.h / 2 + sl.h * f; gf.save(); gf.globalCompositeOperation = "lighter"; gf.fillStyle = "rgba(127,233,255,.8)"; gf.fillRect(sl.x - sl.w * .55, y - 2, sl.w * 1.1, 4); K.glow(gf, sl.x, y, sl.w * .5, "#33ccff", .6); gf.restore(); } });
        const b = lin(E, RV + .1, t); if (b > 0 && b < 1) K.slam(gf, "無量空処", w / 2, h * .17, M * .14, b, { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#0b6fb8", glow: "#33ccff", ghost: 1 });
        if (t > RV + .04) label(X, lin(RV + .04, RV + .12, t), "#7fe9ff");
        if (t > .66) K.title(gf, X, lin(.66, 1, t), { en: "INFINITE VOID", sub: "DOMAIN EXPANSION · GOJO", y: .8 });
        if (hit(t, E, .03)) X.fx.inv = "#bff6ff"; X.fx.rgb = hit(t, E, .1) * 14 + hit(t, RV, .06) * 10;
        K.bars(gf, w, h, 1);
    },
    tail(g, X, T) {
        const { w, h, gf } = X, tt = T.tt, s = T.s, a = fade(tt);
        voidSpace(g, w, h, s, 1.2, .25); g.globalAlpha = a;
        X.env.slots.forEach(sl => K.glow(g, sl.x, sl.y, sl.h * .8, "#33ccff", .3));
        X.cards((i, n, sl) => ({ x: sl.x, y: sl.y + Math.sin(s * 1.3 + i * 1.7) * 6, r: Math.sin(s * .9 + i) * 2.5, a, flip: 1 }));
        label(X, a, "#7fe9ff"); g.globalAlpha = 1; K.bars(gf, w, h, a);
    }
};

/* ---------- YORIICHI · Transparent World: ink-wash calm, the red sun rises; the world turns to glass, the next player's cards
   are seen through their hand like glass with a heartbeat in it, drift out still transparent, and become real ---------- */
const GLASS = k => "grayscale(" + k.toFixed(3) + ") brightness(" + (1 + k * .7).toFixed(3) + ") contrast(" + (1 - k * .45).toFixed(3) + ")";
function sunHalo(g, x, y, R, s, a) {
    if (a <= 0) return; K.radial(g, x, y, R * .9, ["rgba(255,60,50," + .85 * a + ")", "rgba(180,20,20," + .5 * a + ")", "rgba(80,0,0,0)"]);
    g.save(); g.translate(x, y); g.strokeStyle = "rgba(255,59,59," + .5 * a + ")"; g.lineWidth = 2; for (let k = 0; k < 48; k++) { const an = k / 48 * TAU + s * .08, L = R * (.3 + .25 * hs(k)); g.beginPath(); g.moveTo(Math.cos(an) * R * 1.25, Math.sin(an) * R * 1.25); g.lineTo(Math.cos(an) * (R * 1.25 + L), Math.sin(an) * (R * 1.25 + L)); g.stroke(); } g.restore();
}
const yoriichi = {
    col: "#ff3b3b", ms: 9000, fg: 1,
    main(g, X, T) {
        const { w, h, M, gf } = X, t = T.t, s = T.s, pc = mid(X.env.r), r = X.env.r, RV = .58;
        X.cue(.02, "heartbeat", t); X.cue(.3, "heartbeat", t); X.cue(.44, "heartbeat", t); X.cue(RV, "slash", t); X.cue(RV + .01, "reveal", t);
        K.sky(g, w, h, ["#1b1b21", "#0e0e12", "#060607"]);
        for (let i = 0; i < 8; i++) K.pool(g, ((hs(i + 5) * w * 1.4 + s * 14 * (.4 + hs(i))) % (w * 1.4)) - w * .2, h * (.15 + .7 * hs(i + 9)), M * .45, "#ffffff", .06);   // ink-wash mist
        sunHalo(g, w * .5, h * .5, M * .2 * K.oCub(lin(0, .3, t)), s, 1);
        if (t < .3) { g.save(); g.globalAlpha = lin(.06, .16, t) * (1 - lin(.24, .3, t)); K.eyes(g, X, lin(.02, .3, t), { tint: "#ff3b3b", ta: .2, hh: .18, y: .82, nobg: 1 }); g.restore(); }
        const tp = lin(.3, .4, t), beat = Math.pow(Math.max(0, Math.sin(s * 5.2)), 12);
        if (t < RV + .04) { g.save(); g.globalAlpha = tp * (1 - lin(RV - .04, RV + .04, t)); g.fillStyle = "rgba(255,255,255,.05)"; g.fillRect(r.x, r.y, r.w, r.h); g.strokeStyle = "rgba(255,230,230,.8)"; g.lineWidth = 1.5; g.strokeRect(r.x, r.y, r.w, r.h);
            g.strokeStyle = "rgba(255,70,70," + (.4 + beat * .5) + ")"; g.lineWidth = 1; for (let k = 0; k < 16; k++) { let px = pc.x, py = pc.y, an = hs(k) * TAU; g.beginPath(); g.moveTo(px, py); for (let sg = 0; sg < 4; sg++) { an += (hs(k * 5 + sg) - .5) * 1.2; px += Math.cos(an) * r.w * .09; py += Math.sin(an) * r.h * .22; g.lineTo(px, py); } g.stroke(); }   // see-through veins with a pulse
            g.restore(); }
        const out = lin(.42, RV - .02, t), solid = lin(RV, RV + .08, t);          // the cards float out like glass, then turn real at RV
        X.cards((i, n, sl) => { const p = lin(stag(i, n, .3), .7 + stag(i, n, .3), out), q = travel(X, sl, p, -.1, K.ioCub); return { x: q.x, y: q.y, s: q.s, a: tp * mix(.4, 1, solid) * lin(0, .1, p + (t > .38 ? .1 : 0)), flip: solid, f: GLASS(1 - solid) }; });
        if (t > .4 && t < RV) X.env.slots.forEach((sl, i) => { const p = lin(stag(i, sl.n, .3), .7 + stag(i, sl.n, .3), out), q = travel(X, sl, p, -.1, K.ioCub); gf.save(); gf.globalAlpha = .5 + beat * .5; gf.strokeStyle = "rgba(255,80,80,.7)"; gf.lineWidth = 1.2; for (let k = 0; k < 5; k++) { gf.beginPath(); let px = q.x, py = q.y, an = hs(i * 7 + k) * TAU; gf.moveTo(px, py); for (let sg = 0; sg < 3; sg++) { an += (hs(k * 3 + sg + i) - .5); px += Math.cos(an) * sl.w * .14 * q.s; py += Math.sin(an) * sl.h * .12 * q.s; gf.lineTo(px, py); } gf.stroke(); } gf.restore(); });
        const arc = lin(RV - .02, RV + .08, t); if (arc > 0 && arc < 1) {          // one Sun Breathing arc of flame sweeps across as the world turns solid
            gf.save(); gf.globalCompositeOperation = "lighter"; gf.lineCap = "round"; const a0 = Math.PI * .95, a1 = a0 + Math.PI * 1.1 * K.oCub(arc), R0 = M * .6;
            [[30, "rgba(255,90,40,.25)"], [12, "rgba(255,140,60,.8)"], [4, "rgba(255,240,200,1)"]].forEach(([lw, c]) => { gf.strokeStyle = c; gf.lineWidth = lw * (1 - arc * .5); gf.beginPath(); gf.arc(w / 2, h * .62, R0, Math.max(a0, a1 - 1.6), a1); gf.stroke(); }); gf.restore(); }
        if (t > .34 && t < RV) K.column(gf, "透き通る世界", w * .07, h * .14, M * .055, lin(.34, .5, t), { fill: "#fff", stroke: "#300", glow: "#ff3b3b", sw: 3 });
        K.cutIn(gf, X, lin(.12, .3, t), { y: .2, hh: .22, dir: -1, ang: .04, kj: "日の呼吸", name: "YORIICHI TSUGIKUNI" });
        if (t > .5) label(X, lin(.5, .6, t), "#ff6a5a");
        if (t > .66) K.title(gf, X, lin(.66, 1, t), { en: "TRANSPARENT WORLD", y: .8 });
        K.vignette(g, w, h, .7, "#000"); K.bars(gf, w, h, 1);
    },
    tail(g, X, T) {
        const { w, h, M, gf } = X, tt = T.tt, s = T.s, a = fade(tt);
        K.sky(g, w, h, ["#1b1b21", "#0e0e12", "#060607"]); g.globalAlpha = a; sunHalo(g, w / 2, h / 2, M * .2, s, .7);
        X.cards((i, n, sl) => ({ x: sl.x, y: sl.y, a, flip: 1 }));
        label(X, a, "#ff6a5a"); g.globalAlpha = 1; K.vignette(g, w, h, .7, "#000"); K.bars(gf, w, h, a);
    }
};

/* ---------- YHWACH · The Almighty: his darkness pours in, dense and solid; tendrils, spikes and eyes open across it. It swallows
   the next player's plate and draws their cards out of the black; the eyes all open at once and the darkness lets go of them,
   still coiled round their edges, still watching ---------- */
const YH = { stops: [[0, "#ffffff"], [.3, "#e3e8ff"], [.65, "#8790d0"], [1, "#161440"]], rim: "#d6dcff", glow: "#8a7bff", slit: true };
function darkness(g, X, k, s) {                                             // the mass of black that eats the screen from its edges (k = 0..1)
    const { w, h, M } = X; if (k <= 0) return; const rim = "rgba(138,123,255,.55)";
    for (let i = 0; i < 22; i++) { const side = i % 4, u = hs(i + 3), x = side === 0 ? u * w : side === 1 ? w + 10 : side === 2 ? u * w : -10, y = side === 0 ? -10 : side === 1 ? u * h : side === 2 ? h + 10 : u * h, ang = Math.atan2(h / 2 - y, w / 2 - x) + (hs(i + 9) - .5) * .9;
        tendril(g, x, y, ang, M * (.25 + .45 * hs(i + 1)) * k * (1 + X.vox * .15), M * (.03 + .03 * hs(i + 2)) * (.6 + k * .4), s, i * 3.1, rim); }
}
const yhwach = {
    col: "#8a7bff", ms: 8000, fg: 1,
    main(g, X, T) {
        const { w, h, M, gf } = X, t = T.t, s = T.s, pc = mid(X.env.r), RV = .6;
        X.cue(.02, "rumble", t); X.cue(.3, "whoosh", t); X.cue(.44, "rumble", t); X.cue(RV, "reveal", t); X.cue(RV + .01, "boom", t);
        K.sky(g, w, h, ["#0a0414", "#05020c", "#000"]); for (let i = 0; i < 6; i++) K.pool(g, w * (.1 + .8 * hs(i + 3)), h * (.1 + .8 * hs(i + 9)), M * .5, "#2e0e46", .45);
        g.save(); K.cam(g, X, { shake: X.vox * 3 + hit(t, RV, .06) * 18 });
        darkness(g, X, ss(0, .32, t), s);
        for (let i = 0; i < 14; i++) { const an = hs(i) * TAU, d = M * (.32 + .35 * hs(i + 5)), op = ss(.06 + (i % 7) * .025, .14 + (i % 7) * .025, t) * (t > RV - .03 && t < RV ? .2 : 1);   // eyes open across the black
            eye(g, w / 2 + Math.cos(an) * d * 1.4, h / 2 + Math.sin(an) * d, M * (.05 + .05 * hs(i + 8)), op * (.85 + .15 * Math.sin(s * 2 + i)), Object.assign({ tilt: (hs(i + 2) - .5) * .6, lx: Math.cos(s + i) * 3 }, YH)); }
        const sw = lin(.3, .4, t);                                               // the black reaches the plate and swallows it
        if (t < RV) { K.plateGhost(g, X, X.env.r, X.env.toName, "#8a7bff", 1 - sw * .8, sw); for (let k = 0; k < 6; k++) tendril(g, pc.x + Math.cos(k) * X.env.r.w * .6, pc.y + Math.sin(k) * X.env.r.h, k + Math.PI, Math.max(X.env.r.w, M * .2) * .8 * sw, M * .02, s, k * 5, "rgba(138,123,255,.6)"); }
        const out = lin(.4, RV - .02, t), rv = lin(RV, RV + .1, t);
        X.env.slots.forEach((sl, i) => { const p = lin(stag(i, sl.n, .3), .7 + stag(i, sl.n, .3), out), q = travel(X, sl, p, .06, K.ioCub); if (p > 0) { K.pool(g, q.x, q.y, sl.w * q.s * 1.2, "#000000", .9 * (1 - rv * .6)); for (let k = 0; k < 4; k++) spike(g, q.x + (k - 1.5) * sl.w * .32 * q.s, q.y + sl.h * .5 * q.s, -Math.PI / 2 + (k - 1.5) * .35, sl.h * q.s * (.5 + .4 * hs(i * 4 + k)) * ss(0, .5, p) * (1 - rv * .5), sl.w * .06, "rgba(138,123,255,.7)"); } });
        g.restore();
        X.cards((i, n, sl) => { const p = lin(stag(i, n, .3), .7 + stag(i, n, .3), out), q = travel(X, sl, p, .06, K.ioCub), f = lin(stag(i, n, .4), .6 + stag(i, n, .4), rv); return { x: q.x, y: q.y, s: q.s, a: lin(0, .12, p), flip: f, f: "brightness(" + mix(0, 1, f).toFixed(3) + ")" }; });
        if (t > .44) X.env.slots.forEach((sl, i) => { gf.save(); gf.globalAlpha = lin(.44, .54, t); for (let k = 0; k < 4; k++) { const cx = sl.x + (k % 2 ? 1 : -1) * sl.w * .5, cy = sl.y + (k < 2 ? -1 : 1) * sl.h * .5; tendril(gf, cx, cy, Math.atan2(cy - sl.y, cx - sl.x) + Math.sin(s + k + i) * .4, sl.w * .45, sl.w * .07, s, i * 4 + k, "rgba(138,123,255,.7)"); } gf.restore(); });   // coiled round the corners
        if (t > RV) X.env.slots.forEach((sl, i) => { if (i % 2 === 0) eye(gf, sl.x + (i % 4 ? 1 : -1) * sl.w * .62, sl.y - sl.h * .55, M * .04, lin(RV, RV + .06, t) * (.8 + .2 * Math.sin(s * 2 + i)), Object.assign({ lx: Math.cos(s + i) * 2 }, YH)); });
        K.cutIn(gf, X, lin(.08, .28, t), { y: .82, hh: .2, dir: 1, ang: -.04, kj: "全知全能", name: "YHWACH" });
        if (t > .5) label(X, lin(.5, .6, t), "#a99cff");
        if (t > .66) K.title(gf, X, lin(.66, 1, t), { en: "THE ALMIGHTY", sub: "YHWACH · " + X.who, y: .8 });
        if (hit(t, RV, .03)) X.fx.inv = "#c9c0ff"; X.fx.glitch = hit(t, RV, .08) * .5;
        K.bars(gf, w, h, 1);
    },
    tail(g, X, T) {
        const { w, h, M, gf } = X, tt = T.tt, s = T.s, a = fade(tt);
        K.sky(g, w, h, ["#0a0414", "#05020c", "#000"]); g.globalAlpha = a; darkness(g, X, .8, s);
        X.cards((i, n, sl) => ({ x: sl.x, y: sl.y, a, flip: 1 }));
        gf.save(); gf.globalAlpha = a; X.env.slots.forEach((sl, i) => { for (let k = 0; k < 4; k++) { const cx = sl.x + (k % 2 ? 1 : -1) * sl.w * .5, cy = sl.y + (k < 2 ? -1 : 1) * sl.h * .5; tendril(gf, cx, cy, Math.atan2(cy - sl.y, cx - sl.x) + Math.sin(s + k + i) * .4, sl.w * .45, sl.w * .07, s, i * 4 + k, "rgba(138,123,255,.7)"); }
            if (i % 2 === 0) eye(gf, sl.x + (i % 4 ? 1 : -1) * sl.w * .62, sl.y - sl.h * .55, M * .04, .8 + .2 * Math.sin(s * 2 + i) * (hs(Math.floor(s * 1.5) + i) < .15 ? 0 : 1), Object.assign({ lx: Math.cos(s + i) * 2 }, YH)); }); gf.restore();
        label(X, a, "#a99cff"); K.bars(gf, w, h, a);
    }
};

/* ---------- NEON · Lovely Ghostwriter: "I'll tell your fortune". A trance, the hand writes on its own: the next player's cards
   take shape on the page as ink sketches between the lines of the prophecy. "Done!" - the sketches turn gold, lift off the
   paper and become the real cards ---------- */
const neon = {
    col: "#ff7ad9", ms: 8000, fg: 1,
    main(g, X, T) {
        const { w, h, M, gf } = X, t = T.t, s = T.s, RV = .62, SL = X.env.slots, n = SL.length, x0 = w * .1, x1 = w * .9;
        X.cue(.02, "chime", t); X.cue(.16, "flip", t); for (let i = 0; i < 6; i++) X.cue(.2 + i * .07, "tick", t); X.cue(RV, "reveal", t); X.cue(RV + .01, "chime", t);
        if (t < .16) { K.eyes(g, X, lin(0, .18, t), { tint: "#ff7ad9", ta: .25 }); X.cards(() => ({ a: 0 })); K.bars(gf, w, h, 1); return; }
        const paper = 1 - lin(RV, RV + .1, t);
        K.sky(g, w, h, ["#2a0820", "#16030f", "#0a0108"]);
        g.save(); g.globalAlpha = paper; K.sky(g, w, h, ["#fff4f8", "#f8dbe8", "#f0bfd6"]); g.strokeStyle = "rgba(190,110,150,.28)"; g.lineWidth = 1; for (let y = h * .12; y < h; y += M * .055) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        g.strokeStyle = "rgba(230,90,120,.35)"; g.beginPath(); g.moveTo(w * .07, 0); g.lineTo(w * .07, h); g.stroke(); g.restore();
        const wr = lin(.18, RV - .02, t), gold = lin(RV - .04, RV + .02, t); let tip = null;
        const ink = "rgb(" + ((122 + 110 * gold) | 0) + "," + ((26 + 130 * gold) | 0) + "," + ((90 - 40 * gold) | 0) + ")";
        g.save(); g.globalAlpha = Math.max(paper, .0); g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = ink;
        // the prophecy: two handwritten lines above the sketches and two below
        [[X.env.top - M * .09, 0], [X.env.top - M * .045, 1], [X.env.bot + M * .05, 2], [X.env.bot + M * .095, 3]].forEach(([by, L]) => { const p = lin(L * .1, L * .1 + .3, wr); if (p <= 0) return; const xe = mix(x0, x1, p); g.lineWidth = 2.6; g.beginPath(); let ly = by; for (let x = x0; x <= xe; x += 3) { ly = by + Math.sin(x * .09 + L) * 5 + Math.sin(x * .33) * 2; ((x - x0) % 130) > 112 ? g.moveTo(x, ly) : g.lineTo(x, ly); } g.stroke(); if (p < 1) tip = { x: xe, y: ly }; });
        SL.forEach((sl, i) => {                                                   // each card sketched in ink, one after the other
            const p = lin(.3 + stag(i, n, .55), .3 + stag(i, n, .55) + .45 / Math.max(1, n) + .05, wr); if (p <= 0) return; const L = 2 * (sl.w + sl.h), d = L * p;
            g.lineWidth = 2.4; g.save(); g.translate(sl.x, sl.y); g.rotate((hs(i) - .5) * .06); g.setLineDash([d, L]); K.rr(g, -sl.w / 2, -sl.h / 2, sl.w, sl.h, sl.w * .08); g.stroke(); g.setLineDash([]);
            if (p > .5) { g.globalAlpha *= lin(.5, 1, p); g.beginPath(); g.ellipse(0, -sl.h * .05, sl.w * .3, sl.h * .22, .4, 0, TAU * lin(.5, 1, p)); g.stroke(); K.txt(g, "✦", 0, sl.h * .3, sl.w * .2, { font: "serif", weight: "400", fill: ink, sw: 0 }); }
            g.restore(); if (p < 1) tip = { x: sl.x - sl.w / 2 + sl.w * p, y: sl.y - sl.h / 2 + sl.h * (p * 2 % 1) };
        });
        g.restore();
        if (gold > 0 && gold < 1) SL.forEach(sl => K.glow(g, sl.x, sl.y, sl.h * .9, "#ffc84a", gold * .6));
        if (tip && t < RV - .02) {                                             // her hand, moving on its own: the pen runs along the index finger to the page
            const hs2 = HS(X) * .62, th = -2.45 + Math.sin(s * 9) * .04, c = Math.cos(th), sn = Math.sin(th), fx = 36 * hs2, fy = -172 * hs2, wx = tip.x - (fx * c - fy * sn), wy = tip.y - (fx * sn + fy * c);
            g.strokeStyle = "#3a0a24"; g.lineWidth = 7; g.lineCap = "round"; const pl = M * .2, px = tip.x - sn * pl + c * M * .025, py = tip.y + c * pl + sn * M * .025; g.beginPath(); g.moveTo(tip.x, tip.y); g.lineTo(px, py); g.stroke();
            g.strokeStyle = "#e9b8d2"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(tip.x - sn * 6, tip.y + c * 6); g.lineTo(px, py); g.stroke();
            hand(g, wx, wy, hs2, th, "point", { view: "back", flip: 1, skin: "pale", rim: "#ff7ad9", sleeve: { c: "#f7c9df", s: "#d197b4", cuff: "#ffffff", len: 230 } }); K.glow(g, tip.x, tip.y, M * .03, "#ffc84a", .8); }
        const lift = lin(RV, RV + .12, t);                                        // "Done!": the sketches lift off the page and become the real cards
        X.cards((i, n2, sl) => { const p = lin(stag(i, n2, .35), .65 + stag(i, n2, .35), lift); return { x: sl.x, y: sl.y - Math.sin(p * Math.PI) * M * .05, s: mix(.96, 1, p), r: (1 - p) * (hs(i) - .5) * 3.5, a: ss(0, .25, p), flip: lin(.3, 1, p), f: p < 1 ? "sepia(" + (1 - p).toFixed(2) + ") brightness(" + (1 + (1 - p) * .5).toFixed(2) + ")" : "" }; });
        if (lift > 0 && lift < 1) SL.forEach((sl, i) => K.sparks(gf, sl.x, sl.y, lin(stag(i, n, .35), .65 + stag(i, n, .35), lift), 10, i * 5, { speed: sl.h * .9, col: "#ffc84a" }));
        K.cutIn(gf, X, lin(.18, .36, t), { y: .9, hh: .16, dir: 1, ang: -.04, kj: "天使の自動筆記", name: "NEON NOSTRADE" });
        if (t > RV) { K.slam(gf, "できたよ!", w / 2, h * .13, M * .08, lin(RV, RV + .2, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#7a1050", glow: "#ff7ad9" }); label(X, lin(RV + .06, RV + .14, t), "#ffb43a"); }
        if (t > .7) K.title(gf, X, lin(.7, 1, t), { en: "LOVELY GHOSTWRITER", y: .8 });
        K.vignette(g, w, h, .45, "#3a0a24"); K.bars(gf, w, h, 1);
    },
    tail(g, X, T) {
        const { w, h, gf } = X, tt = T.tt, s = T.s, a = fade(tt);
        K.sky(g, w, h, ["#2a0820", "#16030f", "#0a0108"]); g.globalAlpha = a;
        K.drift(g, w, h, s, 36, 9, { up: 1, speed: .06, col: "#ffc84a", size: 2.2, glow: 1, add: 1, a: .8 });
        X.cards((i, n, sl) => ({ x: sl.x, y: sl.y + Math.sin(s * 1.4 + i) * 2, a, flip: 1 }));
        label(X, a, "#ffb43a"); g.globalAlpha = 1; K.bars(gf, w, h, a);
    }
};

/* ---------- VANESSA · Red Thread of Fate: Rouge the cat, five red threads leave five fingers, hook the next player's cards and
   pull them out like marionettes; a twist of fate turns them over, and they hang there on their threads ---------- */
const vanessa = {
    col: "#ff3b66", ms: 6500, fg: 1,
    main(g, X, T) {
        const { w, h, M, gf } = X, t = T.t, s = T.s, P = "#ff3b66", pc = mid(X.env.r), RV = .62, SL = X.env.slots;
        X.cue(.02, "chime", t); X.cue(.24, "whoosh", t); X.cue(.4, "chain", t); X.cue(RV, "flip", t); X.cue(RV + .01, "reveal", t);
        K.sky(g, w, h, ["#1a0310", "#0c0108", "#060003"]); g.fillStyle = "rgba(255,160,190,.5)"; for (let i = 0; i < 60; i++) g.fillRect(hs(i) * w, hs(i + 7) * h, 1.6, 1.6);
        for (let i = 0; i < 12; i++) { const a = [hs(i) * w, hs(i + 3) < .5 ? 0 : h], b = [hs(i + 6) * w, hs(i + 9) < .5 ? 0 : h]; g.strokeStyle = "rgba(255,59,102," + (.1 + .08 * Math.sin(s * 2 + i)) + ")"; g.lineWidth = 1; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 60 * Math.sin(s + i), b[0], b[1]); g.stroke(); }   // a faint web of fate
        if (t < .24) K.cutIn(gf, X, lin(0, .24, t), { y: .45, hh: .34, dir: -1, ang: -.08, kj: "運命の赤い糸", name: "VANESSA ENOTECA" });
        const sz = HS(X), hx = w * .5, hy = h * 1.14 - ss(.2, .3, t) * h * .1 + ss(.66, .8, t) * h * .2;
        const tips = [[-35, -158], [-14, -196], [8, -200], [28, -186], [-62, -98]].map(([a, b]) => [hx + a * sz, hy + b * sz]);
        const hook = ss(.26, .4, t), pull = lin(.4, RV - .02, t), twist = lin(RV, RV + .1, t), hang = ss(RV, .76, t);
        const pos = SL.map((sl, i) => { const p = lin(stag(i, sl.n, .3), .7 + stag(i, sl.n, .3), pull), q = travel(X, sl, p, -.22, K.oBack), sway = Math.sin(s * 2.2 + i * .9) * (4 + 6 * (1 - hang)); return { x: q.x, y: q.y, s: q.s, r: sway + (1 - p) * 20 * (i % 2 ? 1 : -1), p }; });
        if (t < .4) K.plateGhost(g, X, X.env.r, X.env.toName, P, 1, hook);
        SL.forEach((sl, i) => {                                               // the threads: from a fingertip to the card's top edge (later, from above the screen)
            const a0 = tips[i % 5], q = pos[i], top = [q.x + Math.sin(q.r * Math.PI / 180) * sl.h * .5 * q.s, q.y - Math.cos(q.r * Math.PI / 180) * sl.h * .5 * q.s], src = [mix(a0[0], q.x, hang), mix(a0[1], -20, hang)];
            const end = t < .4 ? [mix(src[0], pc.x, hook), mix(src[1], pc.y, hook)] : top, mx = (src[0] + end[0]) / 2 + (1 - hang) * M * .08 * (i % 2 ? 1 : -1), my = (src[1] + end[1]) / 2;
            [[8, "rgba(255,59,102,.2)"], [2.6, P], [1, "#ffd9e2"]].forEach(([lw, c]) => { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); g.moveTo(src[0], src[1]); g.quadraticCurveTo(mx, my, end[0], end[1]); g.stroke(); });
            if (t >= .4) K.glow(g, top[0], top[1], M * .018, P, .9);
        });
        if (hang < 1) hand(g, hx, hy, sz, 0, "spread", { skin: "base", sleeve: { c: "#1a0c12", s: "#0a0408", cuff: "#ff3b66", len: 260 } });
        X.cards((i, n, sl) => { const q = pos[i], f = lin(stag(i, n, .4), .6 + stag(i, n, .4), twist); return { x: q.x, y: q.y, s: q.s, r: q.r, a: t < .4 ? 0 : lin(0, .1, q.p), flip: f }; });
        const cat = ss(.3, .4, t) * (1 - ss(.82, .9, t)); if (cat > 0) { const cx = w * .86, cy = h * .72; g.save(); g.globalAlpha = cat; g.fillStyle = "#b8143a"; g.beginPath(); g.ellipse(cx, cy, M * .07, M * .06, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(cx - M * .06, cy - M * .03); g.lineTo(cx - M * .05, cy - M * .1); g.lineTo(cx - M * .02, cy - M * .05); g.moveTo(cx + M * .06, cy - M * .03); g.lineTo(cx + M * .05, cy - M * .1); g.lineTo(cx + M * .02, cy - M * .05); g.fill(); g.fillStyle = "#ffd9e2"; g.beginPath(); g.arc(cx - M * .025, cy - M * .005, M * .01, 0, TAU); g.arc(cx + M * .025, cy - M * .005, M * .01, 0, TAU); g.fill(); g.restore(); K.glow(g, cx, cy, M * .15, P, cat * .4); }   // Rouge
        if (t > .5) label(X, lin(.5, .6, t), P);
        if (t > .7) K.title(gf, X, lin(.7, 1, t), { en: "RED THREAD OF FATE", y: .8 });
        K.vignette(g, w, h, .6, "#000"); K.bars(gf, w, h, 1);
    },
    tail(g, X, T) {
        const { w, h, M, gf } = X, tt = T.tt, s = T.s, a = fade(tt), P = "#ff3b66";
        K.sky(g, w, h, ["#1a0310", "#0c0108", "#060003"]); g.globalAlpha = a;
        X.env.slots.forEach((sl, i) => { const r = Math.sin(s * 2.2 + i * .9) * 4, top = [sl.x + Math.sin(r * Math.PI / 180) * sl.h * .5, sl.y - Math.cos(r * Math.PI / 180) * sl.h * .5]; [[2.6, P], [1, "#ffd9e2"]].forEach(([lw, c]) => { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); g.moveTo(sl.x, -20); g.lineTo(top[0], top[1]); g.stroke(); }); K.glow(g, top[0], top[1], M * .016, P, .8); });
        X.cards((i, n, sl) => ({ x: sl.x, y: sl.y, r: Math.sin(s * 2.2 + i * .9) * 4, a, flip: 1 }));
        label(X, a, P); g.globalAlpha = 1; K.bars(gf, w, h, a);
    }
};

/* ---------- DIAVOLO · King Crimson: the screen turns RED and shows a few seconds of the future: the next player's cards drift out
   of their hand in slow motion, trailing after-images. Then time is erased: everything jumps forward at once, and the cards are
   simply there, face up, wrapped in King Crimson's aura ---------- */
const KCR = "#e8173c";
function kcAura(g, sl, s, a, i) {                                          // flickering crimson aura with King Crimson's white web pattern
    if (a <= 0) return; g.save(); g.globalCompositeOperation = "lighter";
    for (let k = 0; k < 14; k++) { const an = k / 14 * TAU + s * .4 + i, rx = sl.w * .62, ry = sl.h * .6, x = sl.x + Math.cos(an) * rx, y = sl.y + Math.sin(an) * ry, L = sl.w * (.25 + .25 * hs(k + Math.floor(s * 12) + i * 3));
        g.strokeStyle = K.rgba(k % 3 ? KCR : "#ff8ab0", .5 * a); g.lineWidth = sl.w * .07; g.lineCap = "round"; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * L, y + Math.sin(an) * L - L * .4); g.stroke(); }
    K.glow(g, sl.x, sl.y, sl.h * .95, KCR, .45 * a); g.restore();
    g.save(); g.globalAlpha = a * .55; g.strokeStyle = "#ffffff"; g.lineWidth = 1.2; const rx = sl.w * .66, ry = sl.h * .62;           // the web pattern of his body
    for (let k = 0; k < 6; k++) { const a0 = k / 6 * TAU + s * .3; g.beginPath(); g.moveTo(sl.x + Math.cos(a0) * rx, sl.y + Math.sin(a0) * ry); g.quadraticCurveTo(sl.x + Math.cos(a0 + .5) * rx * 1.25, sl.y + Math.sin(a0 + .5) * ry * 1.25, sl.x + Math.cos(a0 + 1.05) * rx, sl.y + Math.sin(a0 + 1.05) * ry); g.stroke(); }
    g.restore();
}
const diavolo = {
    col: "#ff4fa8", ms: 5000, fg: 1,
    main(g, X, T) {
        const { w, h, M, gf } = X, t = T.t, s = T.s, KC = .14, SKIP = .66;
        X.cue(.02, "rumble", t); X.cue(KC, "rewind", t); X.cue(KC + .01, "heartbeat", t); X.cue(SKIP, "boom", t); X.cue(SKIP + .01, "reveal", t);
        if (t < KC) {                                                        // the call
            K.sky(g, w, h, ["#08010a", "#14021a", "#08010a"]); K.cutIn(g, X, lin(-.02, KC + .02, t), { y: .5, hh: .4, dir: 1, ang: -.06, kj: "キング・クリムゾン", name: "DIAVOLO" });
            X.cards(() => ({ a: 0 })); K.bars(gf, w, h, 1); return;
        }
        if (t < SKIP) {                                                      // RED: a few seconds of the future, in slow motion
            const f = lin(KC, SKIP, t), slow = f * .55;                          // only half of the way plays: the rest is erased
            K.sky(g, w, h, ["#4a0008", "#a3001c", "#3a0006"]); K.radial(g, w / 2, h / 2, M * .9, ["rgba(255,60,80,.35)", "rgba(0,0,0,0)"]);
            g.save(); g.globalAlpha = .32; K.still(g, X, f * .3, { z0: 1.08, dz: .1 }); g.globalCompositeOperation = "color"; g.fillStyle = "#ff1030"; g.fillRect(0, 0, w, h); g.restore();
            g.save(); g.strokeStyle = "rgba(255,200,210,.25)"; g.lineWidth = 2; for (let i = 0; i < 18; i++) { const y = hs(i + 30) * h, x = (hs(i + 31) * 1.4 - .2 + s * .004) % 1.2 * w; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * .18, y); g.stroke(); } g.restore();          // speed lines, frozen almost still
            for (let i = 0; i < 26; i++) { const x = hs(i) * w, y = ((hs(i + 4) + s * .015 * (1 + hs(i))) % 1.2 - .1) * h, r = M * (.01 + .03 * hs(i + 8)); g.strokeStyle = "rgba(255,190,200,.45)"; g.lineWidth = 1.4; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); }   // floating bubbles
            g.save(); g.translate(w * .86, h * .24); const cr = M * .11; g.strokeStyle = "rgba(255,220,225,.8)"; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, cr, 0, TAU); g.stroke(); for (let k = 0; k < 12; k++) { g.save(); g.rotate(k * TAU / 12); g.fillStyle = "#fff"; g.fillRect(-1.5, -cr, 3, cr * .14); g.restore(); }
            g.rotate(f * .7); g.fillStyle = "#fff"; g.fillRect(-1.5, -cr * .85, 3, cr * .85); g.restore();                                     // a second hand, crawling
            K.plateGhost(g, X, X.env.r, X.env.toName, "#ffd0d8", .55, .3);
            X.env.slots.forEach((sl, i) => { for (let k = 3; k >= 1; k--) { const p = Math.max(0, lin(stag(i, sl.n, .2), .8 + stag(i, sl.n, .2), slow) - k * .04), q = travel(X, sl, p, -.18, x => x); if (p <= 0) continue; g.save(); g.globalAlpha = .18 * (4 - k) / 3; g.translate(q.x, q.y); g.rotate((1 - p) * .5); g.fillStyle = "#ffb0c0"; g.fillRect(-sl.w * q.s / 2, -sl.h * q.s / 2, sl.w * q.s, sl.h * q.s); g.restore(); } });   // after-images
            X.cards((i, n, sl) => { const p = lin(stag(i, n, .2), .8 + stag(i, n, .2), slow), q = travel(X, sl, p, -.18, x => x); return { x: q.x, y: q.y, s: q.s, r: (1 - p) * 28.6, a: lin(0, .1, p), flip: 0, f: "sepia(1) saturate(4) hue-rotate(-40deg) brightness(.85)" }; });
            if (f < .9) K.txt(gf, "未来", w * .1, h * .2, M * .09, { font: K.F_JP, weight: "400", fill: "rgba(255,255,255,.85)", stroke: "#3a0006", sw: 3 });
            K.slam(gf, "時間を消し飛ばす", w / 2, h * .86, M * .06, lin(KC + .05, SKIP - .02, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#3a0006", glow: KCR, from: .3 });
            X.fx.rgb = 3; K.bars(gf, w, h, 1); return;
        }
        const q = lin(SKIP, SKIP + .06, t);                                    // ERASED: the jump. No in-between: they are simply there
        K.sky(g, w, h, ["#08010a", "#170212", "#08010a"]);
        if (q < 1) { g.save(); g.globalAlpha = 1 - q; g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.restore(); X.fx.glitch = .9 * (1 - q); X.fx.rgb = 20 * (1 - q); }
        X.env.slots.forEach((sl, i) => kcAura(g, sl, s, lin(SKIP, SKIP + .1, t) * (.8 + X.vox * .4), i));
        X.cards((i, n, sl) => ({ x: sl.x, y: sl.y, a: 1, flip: 1 }));
        X.env.slots.forEach((sl, i) => { if (i % 2 === 0) K.txt(gf, "ゴ", sl.x + sl.w * .7, sl.y - sl.h * .45 + Math.sin(s * 3 + i) * 4, sl.w * .32, { font: K.F_JP, weight: "400", fill: "#b04aff", stroke: "#1a0020", sw: 3, rot: -.2 }); });
        label(X, lin(SKIP + .02, SKIP + .1, t), "#ff4fa8");
        K.title(gf, X, lin(SKIP + .04, 1, t), { en: "KING CRIMSON", sub: "DIAVOLO · " + X.who, y: .8 });
        if (hit(t, SKIP, .02)) X.fx.inv = "#ff9ad0";
        K.bars(gf, w, h, 1);
    },
    tail(g, X, T) {
        const { w, h, gf } = X, tt = T.tt, s = T.s, a = fade(tt);
        K.sky(g, w, h, ["#08010a", "#170212", "#08010a"]); g.globalAlpha = a;
        X.env.slots.forEach((sl, i) => kcAura(g, sl, s, .9, i)); X.cards((i, n, sl) => ({ x: sl.x, y: sl.y, a, flip: 1 }));
        gf.save(); gf.globalAlpha = a; X.env.slots.forEach((sl, i) => { if (i % 2 === 0) K.txt(gf, "ゴ", sl.x + sl.w * .7, sl.y - sl.h * .45 + Math.sin(s * 3 + i) * 4, sl.w * .32, { font: K.F_JP, weight: "400", fill: "#b04aff", stroke: "#1a0020", sw: 3, rot: -.2 }); }); gf.restore();
        label(X, a, "#ff4fa8"); g.globalAlpha = 1; K.bars(gf, w, h, a);
    }
};

export const PEEK = { onepiece_e: shanks, naruto_e: neji, dragonball_e: jiren, jjk_e: gojo, demonslayer_e: yoriichi, bleach_e: yhwach, hxh_e: neon, blackclover_e: vanessa, jojo_e: diavolo };
