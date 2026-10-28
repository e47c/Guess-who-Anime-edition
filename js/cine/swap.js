/* =====================================================================
   SWAP HANDS · nine ways to exchange two players' hands
   The cards on stage are the REAL cards (DOM layer above this canvas, moved with X.place):
   group 0 = the swapper's old cards (they travel A -> B), group 1 = the target's old cards (B -> A).
   Only the two players involved see faces; everybody else sees card backs. A = swapper's spot, B = target's spot.
   ===================================================================== */
import * as K from "./kit.js?v=7";
import { hand, fist, handTips } from "./hands.js?v=7";
const { lin, hit, hs, TAU, mid, ss } = K;

const HS = X => X.M * (X.h > X.w ? .0036 : .003);
const lerpR = (a, b, k) => ({ x: K.mix(a.x, b.x, k), y: K.mix(a.y, b.y, k), w: K.mix(a.w, b.w, k), h: K.mix(a.h, b.h, k) });
const grow = (r, k) => ({ x: r.x + r.w / 2 - r.w * k / 2, y: r.y + r.h / 2 - r.h * k / 2, w: r.w * k, h: r.h * k });
const at = (c, w, h) => ({ x: c.x - w / 2, y: c.y - h / 2, w, h });
function frame(g, r, col, a, pad = 8, dash) {      // a glowing selection frame around a group of cards
    if (a <= 0) return; g.save(); g.globalAlpha *= a; g.strokeStyle = col; g.lineWidth = 3; if (dash) { g.setLineDash(dash); g.lineDashOffset = -performance.now() / 20; }
    const x = r.x - pad, y = r.y - pad, W = r.w + pad * 2, H = r.h + pad * 2; g.globalCompositeOperation = "lighter"; g.strokeStyle = K.rgba(col, .2); g.lineWidth = 12; g.strokeRect(x, y, W, H); g.strokeStyle = col; g.lineWidth = 3; g.strokeRect(x, y, W, H); g.restore();
}
function labels(g, X, a) {
    if (a <= 0) return; const { A, B } = X.env, M = X.M; g.save(); g.globalAlpha *= a;
    K.txt(g, X.who.toUpperCase(), A.x + A.w / 2, A.y - M * .03, M * .028, { font: K.F_UI, fill: "#fff", sw: 3, glow: X.col });
    K.txt(g, X.env.toName.toUpperCase(), B.x + B.w / 2, B.y + B.h + M * .035, M * .028, { font: K.F_UI, fill: "#fff", sw: 3, glow: X.col }); g.restore();
}

/* ---------- LAW · ROOM, Shambles: the tattooed hand (D E A T H, the cross on its back) grips the air and the blue ROOM dome grows out of
   the palm until it swallows the table, Kikoku cuts both hands out, then the raised index finger twists: Shambles, they swap places ---------- */
const LAW_INK = ["D", "E", "A", "T", "H"];   // one letter per digit, thumb first
const law = {
    col: "#4cc9f0", ms: 7600, fg: 1,
    main(g, X, T) {
        const { w, h, M, gf } = X, t = T.t, s = T.s, A = X.env.A, B = X.env.B, C = "#4cc9f0", R = Math.hypot(w, h) * .6;
        X.cue(.03, "warp", t); X.cue(.22, "boom", t); X.cue(.5, "slash", t); X.cue(.56, "slash", t); X.cue(.72, "warp", t);
        if (t < .2) { K.cutIn(g, X, lin(0, .22, t), { y: .48, hh: .36, dir: 1, ang: -.08, kj: "オペオペの実", name: "TRAFALGAR LAW" }); return; }
        const room = K.oExpo(lin(.24, .42, t)) * (1 - lin(.92, 1, t)), rad = R * room, ra = K.oBack(lin(.2, .27, t)) * (1 - lin(.4, .46, t)), hx = w * .66, hy = h * (1.3 - .46 * ra), hs2 = HS(X) * 1.35;
        const ox = K.mix(hx, w / 2, ss(.24, .4, t)), oy = K.mix(hy - hs2 * 70, h / 2, ss(.24, .4, t));   // the dome is born under his palm, then centres on the table
        K.sky(g, w, h, ["#020c18", "#062238", "#01060c"]);
        if (room > 0) {                                                       // ROOM: a translucent operating sphere over the whole table
            g.save(); g.beginPath(); g.arc(ox, oy, rad, 0, TAU); g.clip(); K.radial(g, ox, oy, rad, ["rgba(20,90,160,.25)", "rgba(40,150,230,.45)"]);
            g.strokeStyle = "rgba(140,220,255,.3)"; g.lineWidth = 1; for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(w / 2 + i * M * .1, h); g.lineTo(w / 2 + i * M * .02, h * .55); g.stroke(); } for (let j = 1; j < 10; j++) { const y = h * .55 + Math.pow(j / 10, 2) * h * .5; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
            g.restore(); g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = C; g.lineWidth = 3; g.beginPath(); g.arc(ox, oy, rad, 0, TAU); g.stroke(); g.lineWidth = 1.2;
            for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(ox, oy, rad * Math.abs(Math.cos(i * .45 + s * .4)), rad, 0, 0, TAU); g.stroke(); } for (let i = 1; i < 6; i++) { g.beginPath(); g.ellipse(ox, oy, rad, rad * i / 6, 0, 0, TAU); g.stroke(); } g.restore();
        }
        if (t > .2 && t < .46) {                                             // ROOM: fingers spread and bent as if gripping a ball; the sphere starts in that grip
            const seed = 1 - ss(.22, .3, t); if (seed > 0) { K.glow(g, hx, hy - hs2 * 70, M * .14, C, ra); g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = K.rgba(C, ra * .9); g.lineWidth = 2; g.beginPath(); g.arc(hx, hy - hs2 * 70, M * (.03 + .05 * (1 - seed)), 0, TAU); g.stroke(); g.restore(); }
            hand(g, hx, hy, hs2, Math.sin(s * 1.6) * .03, "claw", { view: "back", skin: "tan", tattoo: LAW_INK, mark: 1, sleeve: { c: "#f4e6b8", s: "#c9b27a", cuff: "#1a1a22", len: 300 } });
        }
        const cut = lin(.46, .6, t), sw = K.ioCub(lin(.64, .8, t)), lift = Math.sin(lin(.58, .86, t) * Math.PI) * .6;   // the two hands are cut out and exchanged
        const pa = lerpR(A, B, sw), pb = lerpR(B, A, sw), arc = Math.sin(sw * Math.PI) * M * .18;
        X.place(0, { x: pa.x, y: pa.y - arc, w: pa.w, h: pa.h }, t > .4 ? 1 : 0, lift, sw * 360); X.place(1, { x: pb.x, y: pb.y + arc, w: pb.w, h: pb.h }, t > .4 ? 1 : 0, lift, -sw * 360);
        frame(g, A, C, lin(.4, .46, t) * (1 - sw), 10, [12, 8]); frame(g, B, C, lin(.4, .46, t) * (1 - sw), 10, [12, 8]);
        if (cut > 0 && cut < 1) [A, B].forEach((r, i) => { const L = Math.hypot(r.w, r.h) * 1.6, c = mid(r), an = i ? -.5 : .4, e = K.oExpo(lin(i * .3, i * .3 + .5, cut)); gf.save(); gf.translate(c.x, c.y); gf.rotate(an); gf.globalCompositeOperation = "lighter"; gf.strokeStyle = "#ffffff"; gf.lineWidth = 4 * (1 - cut) + 1; gf.shadowColor = C; gf.shadowBlur = 20; gf.beginPath(); gf.moveTo(-L / 2, 0); gf.lineTo(-L / 2 + L * e, 0); gf.stroke(); gf.restore(); });
        if (sw > 0 && sw < 1) [pa, pb].forEach(p => { const c = mid(p); K.glow(gf, c.x, c.y, M * .2, C, .5); });
        K.katana(g, w * .08, h * 1.1, -1.1 + 1.6 * K.ioCub(cut), M * 1.1, { blade: ["#f4f7ff", "#9aa6c0", "#3a4258"], guard: "#d9b44a", wrap: "#16141a", wrapLine: "#f2f2f2", tsuba: "cross", hilt: 1.45, glow: cut > 0 && cut < 1 ? C : null, s });   // Kikoku, the nodachi: cross guard, long black-and-white hilt
        if (t > .24 && t < .44) K.slam(g, "ROOM", w * .34, h * .44, M * .2, lin(.24, .44, t), { fill: "#fff", stroke: "#06304a", glow: C, ghost: 1 });
        labels(g, X, lin(.42, .5, t) * (1 - lin(.62, .66, t)));
        if (t > .6 && t < .8) {                                              // SHAMBLES: index finger raised, the wrist twists over, and the two hands trade places
            const q = lin(.6, .66, t), a = K.oBack(lin(.6, .64, t)) * (1 - lin(.74, .8, t)), turn = K.ioCub(q), hx = w * .84, hy = h * (1.08 - .22 * a);
            gf.save(); gf.translate(hx, hy); gf.scale(Math.cos(turn * Math.PI) || .01, 1); hand(gf, 0, 0, HS(X) * 1.1, -.3, "pointT", { view: turn > .5 ? "palm" : "back", skin: "tan", tattoo: LAW_INK, mark: 1, sleeve: { c: "#f4e6b8", s: "#c9b27a", cuff: "#1a1a22", len: 260 } }); gf.restore();
            const tp = handTips("pointT")[0], sx = Math.cos(turn * Math.PI), k2 = HS(X) * 1.1, lx = (tp[0] * Math.cos(-.3) - tp[1] * Math.sin(-.3)) * k2 * sx, ly = (tp[0] * Math.sin(-.3) + tp[1] * Math.cos(-.3)) * k2; K.glow(gf, hx + lx, hy + ly, M * .08, C, a); }
        if (t > .64 && t < .9) K.slam(g, "SHAMBLES", w / 2, h * .5, M * .14, lin(.64, .9, t), { fill: "#fff", stroke: "#06304a", glow: C, ghost: 1 });
        if (hit(t, .64, .02)) X.fx.flash = ["#bff0ff", .8];
        K.vignette(g, w, h, .6, "#000810"); K.bars(g, w, h, 1 - lin(.9, 1, t));
    }
};

/* ---------- MINATO · Flying Raijin: a marked kunai spins in slow motion to the target, a yellow flash, the hands are already swapped ---------- */
const minato = {
    col: "#ffd23f", ms: 7400, fg: 1,
    main(g, X, T) {
        const { w, h, M, gf } = X, t = T.t, s = T.s, A = X.env.A, B = X.env.B, Y = "#ffd23f", tg = mid(B), src = mid(A);
        X.cue(.04, "whoosh", t); X.cue(.3, "shing", t); X.cue(.6, "zap", t); X.cue(.61, "boom", t);
        K.sky(g, w, h, ["#0b0d18", "#1b1d30", "#07080e"]); K.drift(g, w, h, s, 40, 3, { up: 1, speed: .02, col: "#ffe9a0", size: 2 });
        const show = t < .58 || t > .66;
        X.place(0, t < .62 ? A : B, show ? 1 : 0, 0); X.place(1, t < .62 ? B : A, show ? 1 : 0, 0);
        if (t < .26) {                                                       // the throw: the hand with the special kunai rises
            const a = K.oBack(lin(.02, .16, t)), hx = w * .72, hy = h * (1.15 - .25 * a);
            K.kunai(g, hx + M * .02, hy - HS(X) * 190, -1.75, M * .22, { tri: 1, tag: 1, s }); hand(g, hx, hy, HS(X), -.25, "fist", { skin: "base", sleeve: { c: "#f4f4f6", s: "#c4c4cc", cuff: "#1a2a60", len: 260 } });
            K.slam(g, "飛雷神の術", w * .3, h * .3, M * .09, lin(.06, .3, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#4a3600", glow: Y });
        }
        if (t >= .26 && t < .6) {                                            // slow motion: the kunai turns over and over on its way to them
            const q = K.ioCub(lin(.26, .58, t)), kx = K.mix(w * .7, tg.x, q), ky = K.mix(h * .8, tg.y, q), sz = M * (.32 - .2 * q);
            K.streaks(g, w, h, s * .3, Math.atan2(tg.y - h * .8, tg.x - w * .7), { n: 40, col: "#fff2b0", a: .35, speed: .6 });
            for (let i = 5; i > 0; i--) { const qq = Math.max(0, q - i * .03); K.glow(g, K.mix(w * .7, tg.x, qq), K.mix(h * .8, tg.y, qq), sz * .4, Y, .12 * (6 - i)); }
            K.kunai(g, kx, ky, s * 3 + q * 9, sz, { tri: 1, tag: 1, s });
            K.column(g, "飛雷神", w * .9, h * .2, M * .08, lin(.3, .5, t), { fill: "#fff", stroke: "#4a3600", glow: Y, sw: 3 });
            if (q > .9) { K.shock(gf, tg.x, tg.y, lin(.54, .6, t), M * .3, Y, 12); frame(g, B, Y, 1, 8); }
        }
        if (t >= .58 && t < .66) {                                           // THE FLASH: the Hokage's cloak, gone before you see it
            const q = lin(.58, .66, t); K.still(g, X, q, { z0: 1.1, dz: .1, grade: "#ffd23f", dy: .2 }); K.streaks(g, w, h, s, 0, { n: 80, col: "#fff8d0", a: .8, speed: 6, len: .6 }); X.fx.flash = ["#fff6c8", (1 - q) * .8];
            K.slam(g, "四代目火影", w / 2, h * .82, M * .1, lin(.58, .68, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#4a3600", glow: Y, from: .6, in: .2 });
        }
        if (t >= .66) {                                                      // already done: lightning crackles between the two hands, afterimages
            const q = lin(.66, 1, t); [[A, B], [B, A]].forEach(([a, b], i) => { for (let j = 1; j <= 4; j++) { const r = lerpR(a, b, 1 - j * .08); g.save(); g.globalAlpha = .18 * (1 - q) * (5 - j); g.strokeStyle = Y; g.lineWidth = 2; g.strokeRect(r.x, r.y, r.w, r.h); g.restore(); } });
            if (t < .84) { K.bolt(gf, src.x, src.y, tg.x, tg.y, Math.floor(s * 20), Y, 3, .2, 1); K.bolt(gf, tg.x, tg.y, src.x, src.y, Math.floor(s * 20) + 7, "#ffffff", 2, .25); }
            frame(g, A, Y, 1 - lin(.8, 1, t), 8); frame(g, B, Y, 1 - lin(.8, 1, t), 8);
            K.title(g, X, lin(.68, 1, t), { en: "FLYING RAIJIN", kj: "飛雷神の術", y: .5 });
        }
        if (hit(t, .6, .02)) X.fx.inv = "#ffe27a";
        labels(g, X, lin(.3, .4, t) * (1 - lin(.55, .6, t)));
        K.vignette(g, w, h, .55, "#000"); K.bars(g, w, h, 1 - lin(.9, 1, t));
    }
};

/* ---------- WHIS · Temporal Do-Over: the staff taps, the picture REWINDS like a tape, the hands slide back... and are re-dealt to each other ---------- */
const whis = {
    col: "#8fe3ff", ms: 7400, fg: 1,
    main(g, X, T) {
        const { w, h, M, gf } = X, t = T.t, s = T.s, A = X.env.A, B = X.env.B, C = "#8fe3ff";
        X.cue(.04, "chime", t); X.cue(.22, "rewind", t); X.cue(.62, "warp", t); X.cue(.66, "chime", t);
        K.sky(g, w, h, ["#14224a", "#2a3a78", "#080c24"]); K.stars(g, w, h, s, 80, "#dff6ff", 2);
        if (t < .22) { K.cutIn(g, X, lin(0, .22, t), { y: .45, hh: .32, dir: -1, ang: .08, kj: "時間逆行", name: "WHIS" }); }
        const sx = w * .68, sy = h * .42;            // the staff and its orb
        if (t > .14 && t < .6) { g.save(); g.globalAlpha = lin(.14, .2, t); g.strokeStyle = "#e8d8a0"; g.lineWidth = M * .012; g.lineCap = "round"; g.beginPath(); g.moveTo(w * .9, h * 1.05); g.lineTo(sx, sy); g.stroke(); K.radial(g, sx, sy, M * .06, ["#ffffff", "#9fe0ff", "rgba(60,160,255,0)"]); g.restore(); for (let k = 0; k < 3; k++) K.shock(g, sx, sy, lin(.18 + k * .04, .4 + k * .04, t), Math.hypot(w, h), C, 10); }
        // the do-over: the hands first cross over, then the tape rewinds them, then they jump again the right way
        const go = K.ioCub(lin(.24, .36, t)), rw = K.ioCub(lin(.38, .54, t)), again = K.oExpo(lin(.62, .7, t)), e = t < .38 ? go * .7 : t < .62 ? .7 * (1 - rw) : again;
        X.place(0, lerpR(A, B, e), 1, Math.sin(e * Math.PI) * .4); X.place(1, lerpR(B, A, e), 1, Math.sin(e * Math.PI) * .4);
        if (t > .38 && t < .62) {                                            // VHS rewind: scanlines, tracking noise, a clock spinning backwards
            const q = lin(.38, .62, t); g.save(); g.fillStyle = "rgba(255,255,255,.05)"; for (let y = (s * 400) % 6; y < h; y += 6) g.fillRect(0, y, w, 2); g.restore();
            K.txt(gf, "◀◀  REWIND", w * .14, h * .12, M * .05, { font: K.F_UI, fill: "#fff", sw: 2, align: "left" }); K.txt(gf, "-" + (9 - Math.floor(q * 9)) + ":0" + Math.floor((s * 20) % 10), w * .86, h * .12, M * .045, { font: K.F_UI, fill: "#fff", sw: 2 });
            g.save(); g.translate(w / 2, h / 2); g.strokeStyle = C; g.lineWidth = 3; g.globalAlpha = .6; g.beginPath(); g.arc(0, 0, M * .3, 0, TAU); g.stroke(); const a = -s * 14; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * M * .26, Math.sin(a) * M * .26); g.stroke(); g.restore();
            X.fx.glitch = .35 + .3 * Math.sin(s * 30); X.fx.rgb = 6;
        }
        if (t >= .62) { for (let j = 6; j >= 1; j--) { const q = Math.max(0, again - j * .1); [lerpR(A, B, q), lerpR(B, A, q)].forEach(r => { g.save(); g.globalAlpha = .1 * (7 - j) * (1 - lin(.75, .9, t)); g.strokeStyle = C; g.lineWidth = 2; g.strokeRect(r.x, r.y, r.w, r.h); g.restore(); }); }   // afterimages of the instant movement
            K.title(g, X, lin(.64, 1, t), { en: "TEMPORAL DO-OVER", kj: "時間逆行", y: .5 }); }
        if (hit(t, .62, .03)) X.fx.flash = ["#ffffff", .7];
        labels(g, X, lin(.24, .3, t) * (1 - lin(.36, .4, t)));
        K.vignette(g, w, h, .5, "#02040c"); K.bars(g, w, h, 1 - lin(.9, 1, t));
    }
};

/* ---------- TODO · Boogie Woogie: black-and-white manga, CLAP. CLAP. CLAP. Every clap swaps; the third one is real ---------- */
function clap(g, X, p, x, y, sz) {                                       // two hands meeting, inked like a manga panel
    const k = K.ioCub(Math.min(1, p * 1.4)), d = (1 - k) * sz * 90;
    [-1, 1].forEach(sd => hand(g, x + sd * (d + sz * 22), y, sz, sd * -.05, "blade", { view: "palm", flip: sd > 0, skin: "ink", line: 4, sleeve: { c: "#141414", s: "#000", cuff: "#ffffff", len: 220 } }));
}
const todo = {
    col: "#c77dff", ms: 7400, fg: 1,
    main(g, X, T) {
        const { w, h, M, gf } = X, t = T.t, s = T.s, A = X.env.A, B = X.env.B, CL = [.28, .5, .72], n = CL.filter(a => t >= a).length, swapped = n % 2 === 1;
        CL.forEach(a => X.cue(a, "clap", t)); X.cue(.03, "whoosh", t);
        g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, w, h); K.halftone(g, w, h, "#000", .12, 7);
        X.place(0, swapped ? B : A, 1, 0); X.place(1, swapped ? A : B, 1, 0);
        if (t < .24) { const p = lin(0, .24, t); g.save(); g.beginPath(); g.moveTo(0, h * .12); g.lineTo(w, h * .04); g.lineTo(w, h * .62); g.lineTo(0, h * .7); g.closePath(); g.clip(); K.still(g, X, p, { z0: 1.05, dz: .08, dy: .12 }); g.globalCompositeOperation = "saturation"; g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.restore();
            g.strokeStyle = "#000"; g.lineWidth = 6; g.beginPath(); g.moveTo(0, h * .12); g.lineTo(w, h * .04); g.lineTo(w, h * .62); g.lineTo(0, h * .7); g.closePath(); g.stroke();
            K.txt(g, "不義遊戯", w * .5, h * .82, M * .11, { font: K.F_JP, weight: "400", fill: "#000", stroke: "#fff", sw: 4 }); }
        CL.forEach((a, i) => {
            const q = lin(a - .1, a, t); if (q > 0 && t < a + .1) clap(g, X, q, w / 2, h * 1.12, HS(X) * (1.1 + i * .15));
            const k = lin(a, a + .07, t); if (k > 0 && k < 1) {                // the impact panel: hard black frame, focus lines, パン!
                gf.save(); gf.fillStyle = i === 2 ? "#000" : "#fff"; gf.globalAlpha = 1 - k * .6; gf.fillRect(0, 0, w, h); gf.restore();
                K.focus(gf, w / 2, h / 2, w, h, s, { col: i === 2 ? "#fff" : "#000", n: 120, r0: M * .18, a: 1 - k });
                K.txt(gf, ["パン!", "パン!!", "パァン!!!"][i], w / 2, h / 2, M * (.24 + i * .06), { font: K.F_JP, weight: "400", fill: i === 2 ? "#fff" : "#000", stroke: "#c77dff", sw: M * .012, rot: (i - 1) * .12 });
            }
        });
        if (n >= 1) { frame(g, swapped ? B : A, "#000", 1, 10); frame(g, swapped ? A : B, "#000", 1, 10); }
        if (t > .8) K.title(g, X, lin(.8, 1, t), { en: "BOOGIE WOOGIE", kj: "不義遊戯", y: .5, col: "#c77dff" });
        labels(g, X, n >= 1 && t < .8 ? 1 : 0);
        if (hit(t, .72, .02)) X.fx.inv = true;
        K.bars(g, w, h, 1 - lin(.9, 1, t));
    }
};

/* ---------- NAKIME · Infinity Castle: BEN!, endless corridors of shoji, the castle rotates, doors slide open and the hands fall through ---------- */
function corridor(g, w, h, s, rot, M) {
    g.save(); g.translate(w / 2, h / 2); g.rotate(rot); const D = Math.hypot(w, h);
    for (let k = 7; k >= 0; k--) { const z = Math.pow(.62, k - (s * .4 % 1)), W = D * z, H = D * .62 * z;
        g.fillStyle = k % 2 ? "#2a160c" : "#3a1e10"; g.fillRect(-W / 2, -H / 2, W, H); g.strokeStyle = "#140802"; g.lineWidth = 10 * z + 1; g.strokeRect(-W / 2, -H / 2, W, H);
        g.fillStyle = "#f2e6c8"; for (let i = 0; i < 4; i++) { const x = -W / 2 + W * (i + .5) / 4 - W * .1; g.fillRect(x, -H * .38, W * .2, H * .6); }
        g.strokeStyle = "#5a3a20"; g.lineWidth = 2 * z + .5; for (let i = 0; i < 4; i++) { const x = -W / 2 + W * (i + .5) / 4 - W * .1; for (let j = 1; j < 5; j++) { g.beginPath(); g.moveTo(x, -H * .38 + H * .6 * j / 5); g.lineTo(x + W * .2, -H * .38 + H * .6 * j / 5); g.stroke(); } g.beginPath(); g.moveTo(x + W * .1, -H * .38); g.lineTo(x + W * .1, H * .22); g.stroke(); }
        g.fillStyle = "rgba(255,170,80," + (.08 * (8 - k)) + ")"; g.fillRect(-W / 2, H * .3, W, H * .2); }
    g.restore();
}
/* the biwa: a pear-shaped body of dark wood, a short neck with tall frets, the pegbox bent back, four strings, a crescent
   sound hole; the big fan-shaped bachi (plectrum) comes down across the strings on every BEN */
function biwa(g, x, y, M, strike, s) {
    const k = M / 700; g.save(); g.translate(x, y); g.rotate(-.55); g.scale(k, k); g.lineJoin = "round"; const ink = "#120600", wood = g.createLinearGradient(-90, 0, 90, 0);
    wood.addColorStop(0, "#2a1206"); wood.addColorStop(.45, "#6a3414"); wood.addColorStop(1, "#1e0c04");
    g.beginPath(); g.moveTo(0, -120); g.bezierCurveTo(70, -110, 100, 20, 80, 110); g.quadraticCurveTo(0, 170, -80, 110); g.bezierCurveTo(-100, 20, -70, -110, 0, -120); g.closePath(); g.fillStyle = wood; g.fill(); g.strokeStyle = ink; g.lineWidth = 4; g.stroke();   // body
    g.fillStyle = "#c9a24a"; g.beginPath(); g.ellipse(0, 70, 58, 18, 0, 0, TAU); g.fill(); g.stroke();                                    // the bachi guard (bachimen)
    g.fillStyle = "#0a0400"; [-1, 1].forEach(sd => { g.beginPath(); g.arc(sd * 34, -30, 12, Math.PI * .1, Math.PI * .9); g.fill(); });  // crescent sound holes
    g.fillStyle = "#3a1a08"; g.fillRect(-14, -330, 28, 215); g.strokeRect(-14, -330, 28, 215);                                            // the neck
    for (let i = 0; i < 4; i++) { g.fillStyle = "#e8d6a8"; g.fillRect(-18, -310 + i * 45, 36, 12); g.strokeRect(-18, -310 + i * 45, 36, 12); }   // the tall frets
    g.save(); g.translate(0, -330); g.rotate(-.9); g.fillStyle = "#2a1206"; g.fillRect(-13, -80, 26, 80); g.strokeRect(-13, -80, 26, 80); [-1, 1].forEach(sd => [20, 50].forEach(yy => { g.fillStyle = "#c9a24a"; g.fillRect(sd > 0 ? 13 : -33, -yy - 6, 20, 10); })); g.restore();   // pegbox bent back + pegs
    const vib = strike * Math.sin(s * 120) * 3; g.strokeStyle = "#f4e6b0"; g.lineWidth = 1.6; for (let i = 0; i < 4; i++) { const sx = -9 + i * 6; g.beginPath(); g.moveTo(sx, -328); g.quadraticCurveTo(sx * 1.4 + vib, -100, sx * 1.6, 100); g.stroke(); }   // strings, ringing after a strike
    const ba = -.9 + 1.4 * strike; g.save(); g.translate(150, 30); g.rotate(ba); g.beginPath(); g.moveTo(0, 0); g.lineTo(-36, -120); g.quadraticCurveTo(0, -140, 36, -120); g.closePath(); const bg = g.createLinearGradient(0, 0, 0, -130); bg.addColorStop(0, "#5a3010"); bg.addColorStop(1, "#f2e2b8"); g.fillStyle = bg; g.fill(); g.strokeStyle = ink; g.lineWidth = 3; g.stroke(); g.restore();   // the bachi
    g.restore(); if (strike > 0) K.glow(g, x + M * .06, y - M * .02, M * .12, "#ffe6a0", strike);
}
const nakime = {
    col: "#d9a441", ms: 7400, fg: 1,
    main(g, X, T) {
        const { w, h, M, gf } = X, t = T.t, s = T.s, A = X.env.A, B = X.env.B, O = "#d9a441", BEN = [.12, .34, .5];
        BEN.forEach(a => X.cue(a, "biwa", t)); X.cue(.52, "whoosh", t);
        const rot = BEN.reduce((a, x) => a + K.ioCub(lin(x, x + .1, t)), 0) * 1.5708 * .5;
        corridor(g, w, h, s, rot, M); K.vignette(g, w, h, .8, "#0a0300", .25);
        const bx = w * .2, by = h * .8, strike = BEN.reduce((m, a) => Math.max(m, hit(t, a, .05)), 0);
        biwa(g, bx, by, M, strike, s);
        BEN.forEach((a, i) => { const q = lin(a, a + .1, t); if (q > 0 && q < 1) { K.shock(g, bx, by, q, M * .9, "#ffe6a0", 10); K.slam(gf, "ベン!", w * (.55 + i * .1), h * (.3 + i * .15), M * .2, q, { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#5a1a00", glow: O, rot: -.12 }); } });
        if (t < .12) K.cutIn(g, X, lin(0, .14, t), { y: .45, hh: .32, dir: 1, ang: -.06, kj: "無限城", name: "NAKIME" });
        const fall = K.ioCub(lin(.52, .7, t)), open = Math.sin(lin(.48, .74, t) * Math.PI);    // shoji doors slide open over both hands; they drop through
        [A, B].forEach((r, i) => { if (open <= 0) return; const half = r.w / 2 * open; g.save(); g.fillStyle = "#000"; g.fillRect(r.x + r.w / 2 - half - 6, r.y - 6, half * 2 + 12, r.h + 12); g.restore();
            [-1, 1].forEach(sd => { const dx = r.x + r.w / 2 + sd * half; gf.save(); gf.fillStyle = "#f2e6c8"; gf.strokeStyle = "#3a1e10"; gf.lineWidth = 3; const x0 = sd < 0 ? dx - r.w / 2 - 6 : dx; gf.fillRect(x0, r.y - 8, r.w / 2 + 6, r.h + 16); gf.strokeRect(x0, r.y - 8, r.w / 2 + 6, r.h + 16); gf.restore(); }); });
        const fa = lin(.5, .54, t) * (1 - lin(.66, .7, t));
        X.place(0, t < .6 ? grow(A, 1 - fall * 1.6) : grow(B, Math.min(1, (fall - .4) / .6)), t < .52 ? 1 : 1 - fa * .2, 0, fall * 180); X.place(1, t < .6 ? grow(B, 1 - fall * 1.6) : grow(A, Math.min(1, (fall - .4) / .6)), 1, 0, -fall * 180);
        if (t > .72) K.title(g, X, lin(.72, 1, t), { en: "INFINITY CASTLE", kj: "無限城", y: .5 });
        labels(g, X, lin(.4, .46, t) * (1 - lin(.5, .54, t)));
        if (hit(t, .5, .02)) X.fx.inv = "#ffd9a0";
        K.bars(g, w, h, 1 - lin(.9, 1, t));
    }
};

/* ---------- AIZEN · Kyoka Suigetsu: "Shatter." The hands you see are an illusion; the mirror breaks and they were swapped all along ---------- */
const aizen = {
    col: "#b9a7ff", ms: 7400, fg: 1,
    main(g, X, T) {
        const { w, h, M, gf } = X, t = T.t, s = T.s, A = X.env.A, B = X.env.B, L = "#b9a7ff", R = Math.hypot(w, h) / 2, br = .58;
        X.cue(.03, "chime", t); X.cue(.3, "shing", t); X.cue(br, "crack", t); X.cue(br + .01, "boom", t);
        K.sky(g, w, h, ["#241a4a", "#0c0a1c", "#150f30"]); K.glow(g, w / 2, h * .22, M * .3, "#f0eaff", .5);
        g.strokeStyle = "rgba(185,167,255,.2)"; g.lineWidth = 1.5; for (let i = 0; i < 18; i++) { const y = h * (.5 + .028 * i); g.beginPath(); for (let x = 0; x <= w; x += 10) { const yy = y + Math.sin(x * .02 + s * 2 + i) * 5 * (1 + i * .1); x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }   // still water
        for (let k = 0; k < 5; k++) { const q = (s * .3 + k / 5) % 1; g.strokeStyle = "rgba(210,195,255," + (.3 * (1 - q)) + ")"; g.lineWidth = 2; g.beginPath(); g.arc(w / 2, h / 2, q * R, 0, TAU); g.stroke(); }
        const real = t >= br;
        X.place(0, real ? B : A, 1, 0); X.place(1, real ? A : B, 1, 0);       // the illusion shows them where they were. The truth: they already moved
        if (t < .26) K.cutIn(g, X, lin(0, .26, t), { y: .45, hh: .34, dir: -1, ang: -.06, kj: "鏡花水月", name: "AIZEN" });
        if (t > .26 && t < br) {                                              // the blade is drawn, the words, the hypnosis ripples over both hands
            const p = lin(.26, br, t); K.katana(g, w * .82, h * 1.1, -2.2 + .4 * K.oCub(p), M * .8, { blade: ["#f4f2ff", "#a99ccf", "#40385a"], guard: "#3a3a3a", glow: L, s });
            K.column(g, "砕けろ", w * .1, h * .2, M * .09, lin(.28, .4, t), { fill: "#fff", stroke: "#2a1a6a", glow: L, sw: 3 });
            [A, B].forEach(r => { const c = mid(r); for (let k = 0; k < 3; k++) K.shock(g, c.x, c.y, (p * 2 + k / 3) % 1, Math.max(r.w, r.h), L, 4); frame(g, r, L, .6 + .4 * Math.sin(s * 8), 8, [6, 6]); });
            if (p > .6) { X.fx.rgb = (p - .6) * 20; X.fx.glitch = (p - .6) * .8; }
        }
        if (real) {                                                            // the mirror breaks
            const q = lin(br, br + .3, t); if (q < 1) { gf.save(); for (let i = 0; i < 30; i++) { const an = hs(i) * TAU, d = q * R * (.3 + hs(i + 3)), sz = M * (.06 + .08 * hs(i + 5)), x = w / 2 + Math.cos(an) * d, y = h / 2 + Math.sin(an) * d + q * q * h * .4; gf.save(); gf.translate(x, y); gf.rotate(q * 6 * (hs(i + 9) - .5)); gf.globalAlpha = 1 - q; gf.beginPath(); gf.moveTo(-sz, -sz * .3); gf.lineTo(sz * .2, -sz); gf.lineTo(sz, sz * .4); gf.lineTo(-sz * .3, sz * .8); gf.closePath(); gf.fillStyle = "rgba(220,210,255,.45)"; gf.fill(); gf.strokeStyle = "#fff"; gf.lineWidth = 1.5; gf.stroke(); if (X.art && i % 3 === 0) { gf.clip(); K.cover(gf, X.art, -sz, -sz, sz * 2, sz * 2, X.focus[0], X.focus[1], 1.6); } gf.restore(); } gf.restore(); }
            K.cracks(gf, w / 2, h / 2, lin(br - .02, br + .04, t) * (1 - lin(br + .1, br + .2, t)), R, 3, "#ffffff", 20);
            K.slam(g, "いつから錯覚していた?", w / 2, h * .62, M * .06, lin(br + .04, .9, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#2a1a6a", glow: L, from: .8 });
            K.title(g, X, lin(.7, 1, t), { en: "KYOKA SUIGETSU", kj: "鏡花水月", y: .4 });
            frame(g, A, L, 1 - lin(.8, 1, t), 8); frame(g, B, L, 1 - lin(.8, 1, t), 8);
        }
        if (hit(t, br, .02)) X.fx.inv = true;
        labels(g, X, lin(.3, .36, t) * (1 - lin(.86, .92, t)));
        K.vignette(g, w, h, .6, "#05030c"); K.bars(g, w, h, 1 - lin(.9, 1, t));
    }
};

/* ---------- KNOV · Hide and Seek: hands pinch open two Nen doors; the cards slide in one door and out of the other ---------- */
function door(g, r, p, s, col) {
    if (p <= 0) return; const c = mid(r), W = (r.w + 20) * p, H = r.h + 26; g.save();
    g.fillStyle = "#020a06"; g.fillRect(c.x - W / 2, c.y - H / 2, W, H); g.beginPath(); g.rect(c.x - W / 2, c.y - H / 2, W, H); g.clip();
    for (let k = 6; k >= 0; k--) { const z = Math.pow(.7, k - (s * .8 % 1)); g.strokeStyle = K.rgba(col, .15 + .1 * (6 - k)); g.lineWidth = 2; g.strokeRect(c.x - W * z / 2, c.y - H * z / 2, W * z, H * z); }   // the corridor of the 4th-dimension mansion
    g.restore(); g.save(); g.strokeStyle = col; g.lineWidth = 4; g.shadowColor = col; g.shadowBlur = 22; g.strokeRect(c.x - W / 2, c.y - H / 2, W, H); g.restore();
}
const knov = {
    col: "#7dffb0", ms: 7400, fg: 1,
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, A = X.env.A, B = X.env.B, N = "#7dffb0";
        X.cue(.04, "warp", t); X.cue(.3, "open", t); X.cue(.48, "whoosh", t); X.cue(.62, "warp", t);
        K.sky(g, w, h, ["#020a06", "#06180e", "#010402"]);
        for (let i = 0; i < 50; i++) { const u = ((s * .3 * (.4 + hs(i)) + hs(i + 3)) % 1); g.fillStyle = "rgba(125,255,176," + .3 * (1 - u) + ")"; g.fillRect(hs(i + 8) * w + 20 * Math.sin(s + i), h * (1 - u), 3, 12); }   // Nen aura rising
        if (t < .26) { K.eyes(g, X, lin(0, .26, t), { tint: "#7dffb0", ta: .25 }); K.bars(g, w, h, 1); X.place(0, A, 0, 0); X.place(1, B, 0, 0); return; }
        const hd = K.oBack(lin(.26, .34, t)) * (1 - lin(.44, .5, t)); if (hd > 0) [-1, 1].forEach(sd => hand(g, w / 2 + sd * w * .2, h * (1.2 - .2 * hd), HS(X), sd * -.5, "point", { flip: sd < 0, skin: "base", aura: N, sleeve: { c: "#1c1c22", s: "#0a0a0e", cuff: "#ffffff", len: 240 } }));
        const dp = K.oBack(lin(.3, .42, t)) * (1 - lin(.84, .94, t)); door(g, A, dp, s, N); door(g, B, dp, s, N);
        const sink = K.ioCub(lin(.44, .58, t)), rise = K.oExpo(lin(.6, .76, t));
        const into = (r, q) => ({ x: r.x + r.w * .5 - r.w * (1 - q) * .5, y: r.y + r.h * q * .6, w: r.w * (1 - q), h: r.h * (1 - q * .4) });
        if (t < .59) { X.place(0, into(A, sink), sink < .97 ? 1 : 0, 0); X.place(1, into(B, sink), sink < .97 ? 1 : 0, 0); }
        else { X.place(0, into(B, 1 - rise), 1, 0); X.place(1, into(A, 1 - rise), 1, 0); }
        if (t > .26 && t < .5) K.slam(g, "HIDE AND SEEK", w / 2, h * .5, M * .11, lin(.26, .5, t), { fill: "#fff", stroke: "#063a1a", glow: N });
        if (t > .7) K.title(g, X, lin(.7, 1, t), { en: "HIDE AND SEEK", kj: "四次元マンション", y: .5 });
        if (hit(t, .6, .02)) X.fx.flash = ["#c8ffe0", .6];
        labels(g, X, lin(.34, .4, t) * (1 - lin(.84, .9, t)));
        K.vignette(g, w, h, .6, "#000"); K.bars(g, w, h, 1 - lin(.9, 1, t));
    }
};

/* ---------- FINRAL · Fallen Angel's Gate: a winged gate of spatial magic opens in the sky; both hands spiral through its centre ---------- */
function gate(g, x, y, R, p, s, col) {
    if (p <= 0) return; g.save(); g.translate(x, y);
    for (let sd = -1; sd <= 1; sd += 2) for (let i = 0; i < 10; i++) { g.save(); g.rotate(sd * (-.3 - i * .15)); g.beginPath(); g.ellipse(sd * R * p * (.6 + i * .06), 0, R * p * (.55 - i * .03), R * .07, 0, 0, TAU); g.fillStyle = K.rgba(i % 2 ? "#3a2a8a" : "#5a46c0", .55); g.fill(); g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 1.2; g.stroke(); g.restore(); }   // the wings
    g.globalCompositeOperation = "lighter"; g.strokeStyle = col; g.lineWidth = 3; [1, .78, .55].forEach((k, i) => { g.save(); g.rotate((i % 2 ? -1 : 1) * s * .6); g.beginPath(); g.arc(0, 0, R * k * p, 0, TAU); g.stroke(); for (let j = 0; j < 8 + i * 4; j++) { const a = j / (8 + i * 4) * TAU; g.strokeRect(Math.cos(a) * R * k * p * .9 - 4, Math.sin(a) * R * k * p * .9 - 4, 8, 8); } g.restore(); });
    const v = g.createRadialGradient(0, 0, 0, 0, 0, R * .5 * p); v.addColorStop(0, "rgba(255,255,255,.95)"); v.addColorStop(.3, K.rgba(col, .6)); v.addColorStop(1, K.rgba(col, 0)); g.fillStyle = v; g.beginPath(); g.arc(0, 0, R * .5 * p, 0, TAU); g.fill();
    g.restore();
}
const finral = {
    col: "#9d7bff", ms: 7400, fg: 1,
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, A = X.env.A, B = X.env.B, V = "#9d7bff", gc = { x: w / 2, y: h * .46 };
        X.cue(.04, "flip", t); X.cue(.24, "warp", t); X.cue(.46, "whoosh", t); X.cue(.64, "chime", t);
        K.sky(g, w, h, ["#07041a", "#140c3a", "#03020a"]); K.stars(g, w, h, s, 70, "#e6dcff", 5);
        if (t < .22) K.cutIn(g, X, lin(0, .22, t), { y: .45, hh: .34, dir: 1, ang: -.1, kj: "空間魔法", name: "FINRAL" });
        const op = K.oBack(lin(.22, .4, t)) * (1 - lin(.86, .96, t)); gate(g, gc.x, gc.y, M * .4, op, s, V);
        const e = lin(.44, .78, t);
        const pos = (from, to, q) => { if (q < .5) { const u = K.ioCub(q * 2), c = mid(from), sc = 1 - .9 * u, ang = u * 6, rd = (1 - u) * M * .14; return at({ x: K.mix(c.x, gc.x, u) + Math.cos(ang) * rd, y: K.mix(c.y, gc.y, u) + Math.sin(ang) * rd }, from.w * sc, from.h * sc); } const u = K.ioCub((q - .5) * 2), c = mid(to), sc = .1 + .9 * u, ang = 6 + u * 6, rd = M * .14 * (1 - u); return at({ x: K.mix(gc.x, c.x, u) + Math.cos(ang) * rd, y: K.mix(gc.y, c.y, u) + Math.sin(ang) * rd }, to.w * sc, to.h * sc); };
        if (t < .44) { X.place(0, A, 1, 0); X.place(1, B, 1, 0); } else { X.place(0, pos(A, B, e), 1, 0, e * 720); X.place(1, pos(B, A, e), 1, 0, -e * 720); }
        if (t > .4 && t < .7) K.slam(g, "堕天使の扉", w / 2, h * .16, M * .09, lin(.4, .7, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#2a1a6a", glow: V });
        if (t > .74) K.title(g, X, lin(.74, 1, t), { en: "FALLEN ANGEL'S GATE", kj: "堕天使の扉", y: .5 });
        labels(g, X, lin(.3, .36, t) * (1 - lin(.44, .48, t)));
        K.vignette(g, w, h, .5, "#03020a"); K.bars(g, w, h, 1 - lin(.9, 1, t));
    }
};

/* ---------- BRUNO · Sticky Fingers: ARI ARI ARI, zippers run round both hands, the Stand carries them through a zipper tunnel, ARRIVEDERCI ---------- */
function zipper(g, r, p, col) {
    if (p <= 0) return; const x0 = r.x - 10, y0 = r.y - 10, W = r.w + 20, H = r.h + 20, per = 2 * (W + H), L = per * p; g.save();
    const pt = d => d < W ? [x0 + d, y0] : d < W + H ? [x0 + W, y0 + d - W] : d < 2 * W + H ? [x0 + W - (d - W - H), y0 + H] : [x0, y0 + H - (d - 2 * W - H)];
    g.strokeStyle = "#0a0a10"; g.lineWidth = 8; g.strokeRect(x0, y0, W, H); g.fillStyle = "#e9eef5"; for (let d = 0; d < L; d += 10) { const [x, y] = pt(d); g.fillRect(x - 3, y - 3, 6, 6); }
    const [hx, hy] = pt(L); g.fillStyle = "#c9d2e0"; g.strokeStyle = "#0a0a10"; g.lineWidth = 2; K.rr(g, hx - 7, hy - 12, 14, 24, 4); g.fill(); g.stroke(); g.restore();
}
const bruno = {
    col: "#4cc9f0", ms: 7400, fg: 1,
    main(g, X, T) {
        const { w, h, M, gf } = X, t = T.t, s = T.s, A = X.env.A, B = X.env.B, Q = "#4cc9f0", cA = mid(A), cB = mid(B);
        X.cue(.04, "rush", t); X.cue(.28, "zap", t); X.cue(.5, "whoosh", t); X.cue(.74, "slam", t);
        K.sky(g, w, h, ["#0b3a6a", "#062244", "#03101e"]); K.halftone(g, w, h, "rgba(255,255,255,.12)", .7, 11);
        if (t < .3) {                                                        // ARI ARI ARI: Sticky Fingers' fists, a blur of punches
            K.focus(g, w / 2, h / 2, w, h, s, { col: "rgba(255,255,255,.5)", n: 90, r0: M * .2 });
            for (let i = 0; i < 9; i++) { const q = ((s * 3 + i / 9) % 1), x = w * (.2 + .6 * hs(i * 3 + Math.floor(s * 3))), y = h * (.3 + .4 * hs(i * 7 + Math.floor(s * 3))); fist(g, x, y, M * (.0012 + .002 * q), (hs(i) - .5) * .5, { skin: "stk", aura: Q }); }
            ["アリ", "アリ", "アリ!"].forEach((tx, i) => { const q = lin(.02 + i * .07, .12 + i * .07, t); if (q > 0) K.txt(g, tx, w * (.2 + i * .3), h * (.22 + (i % 2) * .12), M * .12, { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#06224a", glow: Q, rot: (i - 1) * .15 }); });
            K.cutIn(g, X, lin(.1, .32, t), { y: .72, hh: .24, dir: -1, ang: .06, kj: "スティッキィ・フィンガーズ", name: "BRUNO" });
        }
        const zp = lin(.26, .42, t), cl = lin(.8, .9, t), open = zp * (1 - cl); zipper(gf, A, open, Q); zipper(gf, B, open, Q);
        const e = K.ioCub(lin(.46, .72, t));
        if (e > 0 && e < 1) { g.save(); g.strokeStyle = "#000"; g.lineWidth = M * .05; g.lineCap = "round"; g.beginPath(); g.moveTo(cA.x, cA.y); g.lineTo(cB.x, cB.y); g.stroke(); g.strokeStyle = "#e9eef5"; g.lineWidth = 4; g.setLineDash([8, 8]); g.stroke(); g.restore();   // the zipper tunnel
            [[cA, cB], [cB, cA]].forEach(([a, b]) => { const x = K.mix(a.x, b.x, e), y = K.mix(a.y, b.y, e); fist(gf, x, y, M * .0016, Math.atan2(b.y - a.y, b.x - a.x) + 1.5708, { skin: "stk", aura: Q }); }); }
        X.place(0, lerpR(A, B, e), t > .26 ? 1 : 0, Math.sin(e * Math.PI) * .5); X.place(1, lerpR(B, A, e), t > .26 ? 1 : 0, Math.sin(e * Math.PI) * .5);
        if (t > .74) K.slam(g, "ARRIVEDERCI!", w / 2, h * .5, M * .13, lin(.74, 1, t), { fill: "#fff", stroke: "#000", glow: Q, ghost: 1, rot: -.06 });
        labels(g, X, lin(.32, .4, t) * (1 - lin(.72, .78, t)));
        if (hit(t, .74, .02)) X.fx.inv = "#9fe8ff";
        K.vignette(g, w, h, .5, "#000"); K.bars(g, w, h, 1 - lin(.9, 1, t));
    }
};

export const SWAP = { onepiece_t: law, naruto_t: minato, dragonball_t: whis, jjk_t: todo, demonslayer_t: nakime, bleach_t: aizen, hxh_t: knov, blackclover_t: finral, jojo_t: bruno };
