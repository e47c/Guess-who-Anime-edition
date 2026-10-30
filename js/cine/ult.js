/* =====================================================================
   ULTIMATE CARDS · nine finishing moves (the next player draws 5)
   Each one is aimed at the target (staged at centre, gliding home at the end). The engine's ending then breaks the
   last picture away (tailFx: shatter | split | hole | burn | fade) and throws 5 cards from the real deck into the
   target's real plate.
   ===================================================================== */
import * as K from "./kit.js?v=11";
import { hand, fist, fistMini } from "./hands.js?v=11";
const { lin, ss, hit, hs, TAU, mid } = K;

const back = t => 1 - ss(.86, .97, t);
const plate = (g, X, r, a, lit) => K.plateGhost(g, X, r, X.env.toName, X.col, a, lit);
const HS = X => X.M * (X.h > X.w ? .0036 : .003);
const boom = (g, X, c, p, col, big = 1) => { if (p <= 0 || p >= 1) return; const M = X.M; K.glow(g, c.x, c.y, M * .5 * big * (1 - p * .5), col, 1 - p); K.shock(g, c.x, c.y, p, M * .8 * big, col, 40); K.shock(g, c.x, c.y, lin(.1, 1, p), M * 1.2 * big, "#ffffff", 14); K.sparks(g, c.x, c.y, p, 40, 5, { speed: M * 1.1 * big, col, grav: M * .4 }); K.debris(g, c.x, c.y, p, 24, 9, { speed: M * .9 * big, size: M * .02 }); };

/* ---------- LUFFY · Gomu Gomu no Hawk Gatling (鷹銃乱打): Gear Second steam, Armament Haki blackens both fists, the fists twist and
   catch fire (HAWK), then a gatling of burning black fists hammers the target until one last flaming haymaker ---------- */
const G2 = { l: "#ffe4e0", b: "#f6a89c", s: "#d9776c", d: "#a54840", ink: "#3d1012", nail: "#ffe2dc" };   // Gear Second: flushed pink, steaming
/* flames streaming behind something moving along ang (or rising, for ang = +PI/2) */
function flameTail(g, x, y, ang, L, W, s, sd) {
    g.save(); g.translate(x, y); g.rotate(ang + Math.PI); g.globalCompositeOperation = "lighter";
    [[1, "rgba(255,60,10,.5)"], [.72, "rgba(255,140,30,.75)"], [.4, "rgba(255,238,180,.95)"]].forEach(([k, col]) => {
        g.fillStyle = col;
        for (let i = 0; i < 3; i++) {
            const len = L * k * (.7 + .45 * hs(i + sd) + .25 * Math.sin(s * 21 + i * 2.1 + sd)), wob = W * k * .55 * Math.sin(s * 15 + i * 3 + sd), off = (i - 1) * W * .28;
            g.beginPath(); g.moveTo(0, -W * k * .55 + off * .3); g.quadraticCurveTo(len * .45, -W * k * .7 + wob + off, len, wob * .7 + off); g.quadraticCurveTo(len * .45, W * k * .7 + wob + off, 0, W * k * .55 + off * .3); g.closePath(); g.fill();
        }
    });
    g.restore();
}
/* one of Luffy's arms reaching in from off-screen to a fist at (x, y) aimed along ang */
function rubberArm(g, x, y, ang, len, wd, haki) {
    const bx = x - Math.cos(ang) * len, by = y - Math.sin(ang) * len;
    g.save(); g.lineCap = "round";
    g.strokeStyle = "#1a0606"; g.lineWidth = wd + 5; g.beginPath(); g.moveTo(bx, by); g.lineTo(x, y); g.stroke();
    const gr = g.createLinearGradient(bx, by, x, y); gr.addColorStop(0, "#f2b89a"); gr.addColorStop(K.mix(1, .45, haki), "#f6a89c"); gr.addColorStop(Math.min(1, K.mix(1, .45, haki) + .08), haki > 0 ? "#2a2234" : "#f6a89c"); gr.addColorStop(1, haki > 0 ? "#141018" : "#f6a89c");   // the haki creeps up from the fist
    g.strokeStyle = gr; g.lineWidth = wd; g.beginPath(); g.moveTo(bx, by); g.lineTo(x, y); g.stroke();
    g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = wd * .18; g.beginPath(); g.moveTo(bx - Math.sin(ang) * wd * .25, by + Math.cos(ang) * wd * .25); g.lineTo(x - Math.sin(ang) * wd * .25, y + Math.cos(ang) * wd * .25); g.stroke();
    g.restore();
}
/* the gatling: every fist's launch time, synced punches first (they land on the voice's onsets), then a hail that gets denser */
const HG_SYNC = [.193, .23, .253, .275, .294, .343, .413, .48, .5], HG_FLY = .022;
const HG = (() => { const L = HG_SYNC.map(a => ({ at: a, big: 1 })); for (let a = .205; a < .665; a += a < .48 ? .0062 : .0038) L.push({ at: a, big: 0 }); return L.map((f, i) => Object.assign(f, { i, sd: i * 3.7 + 1 })); })();
const luffy = {
    col: "#ff6a1a", trail: "#ffd27a", ms: 7400, tailFx: "shatter",
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, r = K.stage(X, back(t)), c = mid(r);
        X.cue(.0, "charge", t); X.cue(.14, "whoosh", t); X.cue(.15, "crack", t); HG_SYNC.forEach(a => X.cue(a, "punch", t)); X.cue(.66, "charge", t); X.cue(.72, "boom", t);
        const haki = ss(.085, .135, t), fire = ss(.14, .175, t), FS = M * .0024;
        const fistAt = (x, y, ang, sc, sd, o) => {                       // a foreground fist: Gear 2 pink going haki-black, then burning
            if (fire > 0) flameTail(g, x, y, o.move == null ? Math.PI / 2 : o.move, M * .26 * sc / FS * fire, M * .07 * sc / FS, s, sd);
            rubberArm(g, x, y, ang - Math.PI / 2, M * 1.2, 84 * sc, haki);
            fist(g, x, y, sc, ang, { skin: G2 });
            if (haki > 0) { g.save(); g.globalAlpha *= haki; fist(g, x, y, sc, ang, { skin: "haki", haki: haki > .9 ? "#ff3b2a" : null, aura: fire > .1 ? "#ff7a1a" : null, t: s }); g.restore(); }
            if (fire > 0) { g.save(); g.globalAlpha *= fire * (.8 + .2 * Math.sin(s * 30 + sd)); K.glow(g, x, y - 20 * sc, 130 * sc, "#ff6a1a", .7); g.restore(); }
        };
        if (t < .2) {                                                        // GOMU GOMU NO… / HAWK: the wind-up, close on Luffy
            const shake = hit(t, .145, .05) * 16 + haki * 2;
            g.save(); K.cam(g, X, { shake, z: 1 + t * .25 });
            K.still(g, X, lin(0, .2, t), { z0: 1.12, dz: .12, dy: .04, grade: fire > 0 ? "#ff5a1a" : "#ff3a6a" });
            K.focus(g, w / 2, h * .45, w, h, s, { col: fire > 0 ? "rgba(255,120,30,.35)" : "rgba(255,90,120,.25)", n: 70, r0: M * .34 });
            K.drift(g, w, h, s, 34, 3, { up: 1, speed: .35, col: "#ffffff", size: M * .02, glow: 1, a: .35 * (1 - fire * .6) });   // Gear Second steam pouring off him
            if (haki > 0 && haki < 1) { g.save(); g.globalCompositeOperation = "lighter"; for (let i = 0; i < 5; i++) K.bolt(g, w * (.1 + .8 * hs(i + Math.floor(s * 14))), h * (.6 + .3 * hs(i * 3)), w * (.1 + .8 * hs(i * 5 + Math.floor(s * 14))), h * (.7 + .3 * hs(i * 7)), i + Math.floor(s * 14), "#ff3b2a", 2.5, .3); g.restore(); }
            const tw = Math.sin(lin(.14, .185, t) * Math.PI) * .7, rise = K.oBack(lin(0, .06, t));
            [[-1, w * .22], [1, w * .78]].forEach(([sd, x]) => fistAt(x, h * (1.3 - .5 * rise), sd * (.28 + tw), FS * (1 + fire * .15), sd + 2, {}));
            if (t > .015 && t < .14) K.slam(g, "ゴムゴムの…", w / 2, h * .17, M * .1, lin(.015, .14, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#3d1012", from: 1.4, glow: "#ff5a7a" });
            if (t < .12) K.txt(g, "シュウウ", w * .14, h * .3 - t * h * .6, M * .05, { font: K.F_JP, weight: "400", fill: "rgba(255,255,255,.85)", stroke: "#3d1012", sw: M * .006, rot: -.2 });
            if (t > .085 && t < .15) K.slam(g, "武装色", w * .84, h * .34, M * .06, lin(.085, .15, t), { font: K.F_JP, weight: "400", fill: "#cfc6ff", stroke: "#000", glow: "#ff3b2a", from: 1 });
            if (t > .14) { K.slam(g, "鷹", w / 2, h * .36, M * .3, lin(.14, .21, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#4a0a00", glow: "#ff7a1a", from: 2.2, ghost: 1 }); K.slam(g, "HAWK", w / 2, h * .53, M * .08, lin(.145, .21, t), { fill: "#ffd27a", stroke: "#4a0a00", glow: "#ff6a1a", sp: M * .02 }); }
            g.restore();
            X.fx.flash = ["#ff9a3c", hit(t, .145, .04) * .6]; X.fx.rgb = hit(t, .145, .05) * 12;
            K.bars(g, w, h, 1); return;
        }
        // GATLING: the target, and a hail of burning black fists from both of Luffy's arms
        const wind = lin(.66, .715, t), fin = K.iCub(lin(.695, .72, t)), after = lin(.72, 1, t);
        const big = HG_SYNC.reduce((m, a) => Math.max(m, hit(t, a, .02)), 0);
        g.save(); K.cam(g, X, { shake: (t < .66 ? 5 + big * 14 : 0) + hit(t, .72, .16) * 34, z: 1 + big * .02 + hit(t, .72, .1) * .08 });
        K.sky(g, w, h, ["#1a0300", "#4a0c00", "#a82800"]);
        K.radial(g, c.x, c.y, M * .9, [[0, "rgba(255,200,120,.55)"], [.35, "rgba(255,90,20,.25)"], [1, "rgba(0,0,0,0)"]]);
        K.focus(g, c.x, c.y, w, h, s, { col: "rgba(255,170,80,.35)", n: 90, r0: M * .18 });
        plate(g, X, r, 1, Math.max(big * .8, lin(.72, .8, t)));
        K.cracks(g, c.x, c.y, lin(.2, .74, t), Math.max(r.w, r.h) * .7, 7, "#ffd27a", 18);
        const fl = HG.filter(f => t > f.at - HG_FLY && t < f.at + .02 && f.at < .7);
        fl.forEach(f => {                                                    // each fist: launched from the bottom, shrinking into the distance, burning
            const q = (t - (f.at - HG_FLY)) / HG_FLY, x0 = w * (.06 + .88 * hs(f.sd)), y0 = h * 1.15, tx = c.x + (hs(f.sd * 1.9) - .5) * r.w * (f.big ? .5 : .95), ty = c.y + (hs(f.sd * 2.7) - .5) * r.h * (f.big ? .5 : 1.2);
            if (q <= 1) {
                const e = K.oCub(q), x = K.mix(x0, tx, e), y = K.mix(y0, ty, e), ang = Math.atan2(ty - y0, tx - x0), R = M * (f.big ? .1 : .068) * (1.5 - e * .9);
                g.save(); g.globalAlpha *= .5; g.strokeStyle = "#140c16"; g.lineCap = "round"; g.lineWidth = R * .7; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x, y); g.stroke(); g.restore();   // the stretched rubber arm
                flameTail(g, x, y, ang, R * 4.2, R * 1.3, s, f.sd);
                fistMini(g, x, y, R, ang + Math.PI / 2, "haki", "#ff6a1a");
            } else {
                const p = (q - 1) * HG_FLY / .02, ix = tx, iy = ty;                 // impact
                K.sparks(g, ix, iy, p, f.big ? 18 : 7, f.sd, { speed: M * (f.big ? .5 : .25), col: "#ffb03a" });
                if (p < .5) K.glow(g, ix, iy, M * (f.big ? .16 : .08) * (1 - p), "#ffd27a", 1 - p * 2);
                if (f.big) K.shock(g, ix, iy, p, M * .3, "#ff7a1a", 16);
            }
        });
        // Luffy's own two fists in the foreground, pumping in turn (pulled out of frame for the wind-up)
        const pump = (t - .2) / .0124, out = K.iCub(wind);
        [[-1, w * .2, 0], [1, w * .8, .5]].forEach(([sd, x, ph]) => {
            if (t > .7) return;
            const e = Math.max(0, Math.sin((pump + ph * 2) * Math.PI)) * (t < .66 ? 1 : 0), fx = K.mix(x, c.x, e * .3), fy = K.mix(h * .84, c.y, e * .3) + out * h * .6;
            const ang = Math.atan2(c.y - fy, c.x - fx) + Math.PI / 2;
            fistAt(fx, fy, ang, FS * (1 - e * .35), sd + 5, { move: Math.atan2(c.y - fy, c.x - fx) });
        });
        if (t > .66 && t < .74) {                                            // the finisher: the right arm cocks back, then one giant flaming haki fist
            const q = fin, up = K.oBack(lin(.66, .695, t)), x0 = w * .58, y0 = h * (1.6 - up * .62), x = K.mix(x0, c.x, q), y = K.mix(y0, c.y, q), ang = Math.atan2(c.y - y0, c.x - x0), R = M * K.mix(.3, .1, q);
            if (t < .72) { rubberArm(g, x, y, ang, M * 1.4, R * 1.1, 1); flameTail(g, x, y, Math.PI / 2, R * 2.6, R * 1.25, s, 9); if (q > 0) flameTail(g, x, y, ang, R * (2 + q * 4), R * 1.1, s, 4); fist(g, x, y, R / 60, ang + Math.PI / 2, { skin: "haki", haki: "#ff3b2a", aura: "#ff7a1a", t: s }); }
            if (q > 0 && t < .72) K.streaks(g, w, h, s, ang, { n: 70, col: "#ffd27a", a: .5, speed: 7 });
        }
        boom(g, X, c, lin(.72, .9, t), "#ff6a1a", 1.4);
        if (after > 0) { K.drift(g, w, h, s, 30, 11, { up: 1, speed: .25, col: "#ff9a3c", size: 4, add: 1 }); K.drift(g, w, h, s * .6, 16, 13, { up: 1, speed: .12, col: "#2a1a14", size: M * .05, glow: 1, a: .5 * (1 - lin(.85, 1, t)) }); }
        g.restore();
        // lettering: GATLING on the voice, the onomatopoeia on the synced hits, the name brushed down the side
        if (t < .36) K.slam(g, "ガトリング", w / 2, h * .14, M * .11, lin(.2, .36, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#4a0a00", glow: "#ff6a1a", from: 1.6 });
        HG_SYNC.forEach((a, i) => { const q = lin(a, a + .05, t); if (q > 0 && q < 1) K.txt(g, i % 2 ? "ドッ" : "ガッ", w * (.12 + .76 * hs(i * 4.1)), h * (.22 + .5 * hs(i * 6.3)), M * .09 * (1.25 - q * .25), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#4a0a00", sw: M * .009, rot: (hs(i) - .5) * .5 }); });
        if (t > .48 && t < .66) { const q = lin(.48, .66, t); K.txt(g, "ドドドドドド", w / 2 + Math.sin(s * 50) * 3, h * .78, M * .07, { font: K.F_JP, weight: "400", fill: "#ffd27a", stroke: "#4a0a00", sw: M * .008, sp: M * .01 }); g.globalAlpha = 1; if (q < .1) X.fx.rgb = 8; }
        if (t > .22 && t < .7) { g.save(); g.globalAlpha *= 1 - lin(.62, .7, t); K.column(g, "鷹銃乱打", w * .07, h * .2, M * .07, lin(.22, .4, t), { fill: "#fff", stroke: "#4a0a00", glow: "#ff6a1a", sw: M * .006 }); g.restore(); }
        if (t > .74) K.title(g, X, lin(.74, 1, t), { en: "HAWK GATLING", kj: "鷹銃乱打", sub: "GOMU GOMU NO · GEAR 2 · ARMAMENT HAKI · " + X.who, y: .84 });
        if (hit(t, .72, .03)) X.fx.inv = true; X.fx.rgb = Math.max(X.fx.rgb || 0, hit(t, .72, .1) * 20 + big * 6);
        K.bars(g, w, h, 1 - lin(.92, 1, t));
    }
};

/* ---------- NARUTO · Rasengan: a shadow clone shapes it, the spiral grows in your palm, the charge, a drilling spiral into the target ---------- */
function rasengan(g, x, y, R, s, wind) {
    K.glow(g, x, y, R * 2.4, "#4cc9f0", .7); g.save(); g.translate(x, y); g.beginPath(); g.arc(0, 0, R, 0, TAU); const og = g.createRadialGradient(-R * .2, -R * .2, 0, 0, 0, R); og.addColorStop(0, "#ffffff"); og.addColorStop(.45, "#bff0ff"); og.addColorStop(1, "#1a7fe0"); g.fillStyle = og; g.fill(); g.clip();
    g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = Math.max(2, R * .06); for (let k = 0; k < 10; k++) { g.save(); g.rotate(s * (10 + k) + k * .7); g.beginPath(); g.ellipse(0, 0, R * (.25 + k * .08), R * (.12 + k * .05), k, 0, 2.6); g.stroke(); g.restore(); } g.restore();
    if (wind > 0) { g.save(); g.translate(x, y); g.rotate(s * 14); g.strokeStyle = K.rgba("#dff8ff", wind * .7); g.lineWidth = 2; for (let k = 0; k < 4; k++) { g.rotate(1.5708); g.beginPath(); g.ellipse(R * 1.4, 0, R * 1.1, R * .18, 0, 0, TAU); g.stroke(); } g.restore(); }
}
const naruto = {
    col: "#4cc9f0", trail: "#7fe0ff", ms: 7600, tailFx: "hole",
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, r = K.stage(X, back(t)), c = mid(r);
        X.cue(.02, "whoosh", t); X.cue(.22, "charge", t); X.cue(.5, "whoosh", t); X.cue(.7, "boom", t);
        if (t < .18) { K.eyes(g, X, lin(0, .18, t), { tint: "#ff9a3a", ta: .25 }); K.column(g, "螺旋丸", w * .9, h * .16, M * .07, lin(.02, .16, t), { fill: "#fff", stroke: "#06304f", glow: "#4cc9f0", sw: 3 }); K.bars(g, w, h, 1); return; }
        const run = lin(.5, .7, t), hx = w * .52, hy = h * (1.06 - .1 * ss(.18, .26, t)) + Math.sin(s * 30) * 4 * run, grow = lin(.2, .48, t), R = M * (.03 + .13 * K.oCub(grow));
        g.save(); K.cam(g, X, { z: 1 + run * .25, cx: c.x, cy: c.y, shake: (2 + run * 8) + hit(t, .7, .14) * 26 });
        K.sky(g, w, h, ["#02060f", "#08203f", "#03060f"]);
        if (run > 0) K.focus(g, c.x, c.y, w, h, s, { col: "rgba(160,230,255,.5)", n: 120, r0: M * .1, a: run });            // charging forward
        g.strokeStyle = "rgba(127,224,255,.35)"; g.lineWidth = 2; for (let i = 0; i < 80; i++) { const ph = (s * (.5 + grow) + hs(i + 9)) % 1, a = hs(i) * TAU, d = (1 - ph) * M * .8 + R; g.globalAlpha = ph * grow; g.beginPath(); g.moveTo(hx + Math.cos(a) * d, hy - M * .22 + Math.sin(a) * d); g.lineTo(hx + Math.cos(a) * (d + 24), hy - M * .22 + Math.sin(a) * (d + 24)); g.stroke(); } g.globalAlpha = 1;   // chakra pulled in
        plate(g, X, r, ss(.46, .54, t), lin(.62, .7, t));
        const ox = K.mix(hx, c.x, K.iCub(run)), oy = K.mix(hy - M * .22, c.y, K.iCub(run));
        if (t < .7) {
            if (t < .5) { const cl = K.oBack(lin(.2, .28, t)) * (1 - lin(.44, .5, t)); hand(g, hx - M * .3, hy + M * .02, HS(X), .6, "claw", { flip: 1, view: "palm", skin: "tan", sleeve: { c: "#e8781e", s: "#a84c0c", cuff: "#1a1a22", len: 240 } }); g.save(); g.globalAlpha = cl; hand(g, hx + M * .28, hy - M * .05, HS(X), -.9, "claw", { skin: "tan", sleeve: { c: "#e8781e", s: "#a84c0c", cuff: "#1a1a22", len: 240 } }); g.restore(); }   // a shadow clone's hands shape the chakra
            hand(g, ox, oy + M * .26, HS(X) * (1 - run * .4), 0, "cup", { view: "palm", skin: "tan", sleeve: { c: "#e8781e", s: "#a84c0c", cuff: "#1a1a22", len: 240 } });
            rasengan(g, ox, oy, R * (1 - run * .3), s, lin(.36, .5, t));
        }
        if (t >= .7) { const q = lin(.7, .95, t); for (let k = 0; k < 5; k++) { const p = (q * 1.6 - k * .15); if (p > 0 && p < 1) { g.save(); g.translate(c.x, c.y); g.rotate(s * 6 + k); g.strokeStyle = K.rgba("#bff0ff", 1 - p); g.lineWidth = 8 * (1 - p) + 1; g.beginPath(); g.arc(0, 0, M * .1 + p * M * .7, 0, 4.5); g.stroke(); g.restore(); } } rasengan(g, c.x, c.y, M * .1 * (1 - q), s, 1 - q); }
        boom(g, X, c, lin(.7, .9, t), "#4cc9f0");
        g.restore();
        K.cutIn(g, X, lin(.26, .48, t), { y: .3, hh: .24, dir: 1, ang: -.06, kj: "影分身", name: "NARUTO" });
        if (t > .56 && t < .74) K.slam(g, "螺旋丸!!", w / 2, h * .2, M * .14, lin(.56, .74, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#06304f", glow: "#4cc9f0", ghost: 1 });
        if (t > .74) K.title(g, X, lin(.74, 1, t), { en: "RASENGAN", kj: "螺旋丸", y: .84 });
        if (hit(t, .7, .03)) X.fx.inv = "#bff0ff"; X.fx.rgb = hit(t, .7, .1) * 14;
        K.vignette(g, w, h, .6, "#00040c"); K.bars(g, w, h, 1 - lin(.92, 1, t));
    }
};

/* ---------- GOKU · Kamehameha: cupped hands at the hip, KA-ME-HA-ME, the light gathers, HA!!, the beam ---------- */
const goku = {
    col: "#59c8ff", trail: "#9fe0ff", ms: 7600, tailFx: "burn",
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, r = K.stage(X, back(t)), c = mid(r), SY = [[.14, "か"], [.22, "め"], [.3, "は"], [.38, "め"], [.5, "波ーッ!!"]];
        SY.forEach(([a]) => X.cue(a, "stamp", t)); X.cue(.14, "charge", t); X.cue(.5, "boom", t); X.cue(.52, "roar", t);
        if (t < .12) { K.eyes(g, X, lin(0, .14, t), { tint: "#ff9a3a", ta: .2 }); K.bars(g, w, h, 1); return; }
        const ch = lin(.12, .5, t), bt = K.oExpo(lin(.5, .6, t)), bx = w * .5, by = h * .8;
        g.save(); K.cam(g, X, { z: 1.08 - .08 * ch + bt * .1, shake: 2 + ch * 8 + (t > .5 && t < .82 ? 14 : 0) });
        K.sky(g, w, h, ["#030a22", "#0c2a5a", "#02040c"]); K.stars(g, w, h, s, 60, "#cfe9ff", 1);
        for (let i = 0; i < 6; i++) { const yy = h * (.9 + .02 * i), q = ch * (1 + i * .2); g.fillStyle = "#1a2030"; for (let k = 0; k < 6; k++) { const x = hs(i * 7 + k) * w, up = q * M * .05 * hs(k + i) * Math.abs(Math.sin(s * 3 + k)); g.fillRect(x, yy - up - M * .01, M * .02, M * .02); } }   // rocks lifting off the ground
        for (let i = 0; i < 60; i++) { const u = 1 - ((s * 1.2 + hs(i)) % 1), an = hs(i + 4) * TAU, d = M * (.08 + .7 * u); K.glow(g, bx + Math.cos(an) * d, by + Math.sin(an) * d * .6, M * .012, "#9fe0ff", ch * (1 - u)); }   // the ki gathers
        plate(g, X, r, ss(.4, .5, t), lin(.56, .66, t));
        const rd = M * (.02 + .12 * K.oCub(ch)) * (1 + .06 * Math.sin(s * 30));
        if (t < .5) { [-1, 1].forEach(sd => hand(g, bx + sd * M * (.1 - .02 * ch), by + M * .16, HS(X), sd * .5, "cup", { view: "palm", flip: sd > 0, skin: "tan", sleeve: { c: "#e8781e", s: "#a84c0c", cuff: "#2a4fd0", len: 240 } })); K.glow(g, bx, by, rd * 3, "#59c8ff", .9); K.radial(g, bx, by, rd, ["#ffffff", "#bff0ff", "rgba(80,180,255,0)"]); for (let k = 0; k < 6; k++) K.bolt(g, bx, by, bx + (hs(k + Math.floor(s * 20)) - .5) * rd * 5, by + (hs(k * 3 + Math.floor(s * 20)) - .5) * rd * 4, Math.floor(s * 20) + k, "#bff0ff", 1.5, .3); }
        if (bt > 0 && t < .86) {                                             // the beam: a white core, turbulent blue sheath, spiralling edges
            const ex = K.mix(bx, c.x, bt), ey = K.mix(by, c.y, bt), ang = Math.atan2(c.y - by, c.x - bx), L = Math.hypot(ex - bx, ey - by), Wd = M * (.12 + .015 * Math.sin(s * 40));
            g.save(); g.translate(bx, by); g.rotate(ang); g.globalCompositeOperation = "lighter";
            [[1.6, "rgba(40,120,255,.25)"], [1.15, "rgba(80,180,255,.6)"], [.7, "rgba(170,230,255,.9)"], [.35, "#ffffff"]].forEach(([k, col]) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, -Wd * k * .5); for (let x = 0; x <= L; x += 20) g.lineTo(x, -Wd * k * (.5 + .08 * Math.sin(x * .05 - s * 40))); g.arc(L, 0, Wd * k * .55, -1.5708, 1.5708); for (let x = L; x >= 0; x -= 20) g.lineTo(x, Wd * k * (.5 + .08 * Math.sin(x * .05 + s * 40))); g.closePath(); g.fill(); });
            g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 2; for (let k = 0; k < 2; k++) { g.beginPath(); for (let x = 0; x <= L; x += 10) g.lineTo(x, Math.sin(x * .03 - s * 30 + k * Math.PI) * Wd * .55); g.stroke(); } g.restore();
        }
        boom(g, X, c, lin(.6, .86, t), "#59c8ff", 1.3);
        g.restore();
        SY.forEach(([a, tx], i) => { const q = lin(a, a + (i === 4 ? .2 : .08), t); if (q > 0 && q < 1) K.slam(g, tx, w * (i === 4 ? .5 : .2 + i * .2), h * (i === 4 ? .22 : .25 + (i % 2) * .1), M * (i === 4 ? .15 : .12), q, { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#0a3a7a", glow: "#59c8ff", from: 1.6, in: .2 }); });
        if (t > .2 && t < .48) K.cutIn(g, X, lin(.2, .44, t), { y: .56, hh: .2, dir: -1, ang: .06, kj: "かめはめ波", name: "SON GOKU" });
        if (t > .72) K.title(g, X, lin(.72, 1, t), { en: "KAMEHAMEHA", kj: "かめはめ波", y: .84 });
        if (hit(t, .5, .03)) X.fx.inv = "#bff0ff"; X.fx.rgb = hit(t, .5, .12) * 16;
        K.vignette(g, w, h, .55, "#00040c"); K.bars(g, w, h, 1 - lin(.92, 1, t));
    }
};

/* ---------- SUKUNA · Malevolent Shrine: four eyes open, the hand sign, the shrine rises from a sea of blood, Dismantle cuts everything ---------- */
function shrine(g, gx, gy, sc, glow) {
    g.save(); g.translate(gx, gy); g.scale(sc, sc); g.lineJoin = "round";
    const rim = () => { g.strokeStyle = "rgba(255,70,55,.9)"; g.lineWidth = 3; g.stroke(); }, dark = () => { g.fillStyle = "#07000a"; g.fill(); };
    g.beginPath(); g.rect(-340, -34, 680, 34); dark(); rim(); g.beginPath(); g.rect(-290, -66, 580, 34); dark(); rim(); g.beginPath(); g.rect(-240, -250, 480, 184); dark();
    K.radial(g, 0, -150, 110, ["rgba(255,200,120," + .9 * glow + ")", "rgba(255,50,30," + .8 * glow + ")", "rgba(80,0,0,0)"]);
    [-230, -110, 90, 210].forEach(x => { g.beginPath(); g.rect(x, -250, 24, 190); dark(); rim(); });
    g.beginPath(); g.moveTo(-410, -232); g.bezierCurveTo(-330, -250, -270, -292, -210, -340); g.lineTo(210, -340); g.bezierCurveTo(270, -292, 330, -250, 410, -232); g.closePath(); dark(); rim();
    g.beginPath(); g.rect(-170, -420, 340, 80); dark(); rim(); g.beginPath(); g.moveTo(-270, -408); g.bezierCurveTo(-210, -420, -180, -452, -120, -500); g.lineTo(120, -500); g.bezierCurveTo(180, -452, 210, -420, 270, -408); g.closePath(); dark(); rim();
    g.fillStyle = "#e9ddc6"; g.beginPath(); g.arc(0, -380, 30, 0, TAU); g.fill(); g.fillStyle = "#12020a"; g.beginPath(); g.arc(-11, -383, 7, 0, TAU); g.arc(11, -383, 7, 0, TAU); g.fill();
    g.strokeStyle = "#e9ddc6"; g.lineWidth = 6; g.lineCap = "round"; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-300, -180 + i * 6, 30 + i * 18, 4.2, 5.6); g.stroke(); g.beginPath(); g.arc(300, -180 + i * 6, 30 + i * 18, 3.8, 5.2); g.stroke(); }   // the ribs and horns
    g.restore();
}
const sukuna = {
    col: "#e0182a", trail: "#ff2a2a", ms: 7800, tailFx: "shatter",
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, r = K.stage(X, back(t)), c = mid(r);
        X.cue(.02, "heartbeat", t); X.cue(.2, "rumble", t); X.cue(.3, "boom", t); for (let i = 0; i < 8; i++) X.cue(.56 + i * .04, "slash", t);
        if (t < .2) { K.eyes(g, X, lin(0, .2, t), { tint: "#ff1a1a", ta: .3 }); K.drift(g, w, h, s, 40, 3, { up: 1, speed: .08, col: "#ff5a3a", size: 2 }); K.column(g, "両面宿儺", w * .08, h * .18, M * .065, lin(.02, .18, t), { fill: "#fff", stroke: "#4a0508", glow: "#ff2a1a", sw: 3 }); K.bars(g, w, h, 1); return; }
        g.save(); K.cam(g, X, { shake: 3 + hit(t, .3, .1) * 20 + (t > .56 && t < .9 ? 6 : 0) });
        K.sky(g, w, h, ["#000000", "#4a070b", "#a8141a", "#2a0306"]);
        const my = h * .36; K.radial(g, w / 2, my, M * .28, ["#ff7a60", "#b01a1f", "#40050a"]); g.save(); g.translate(w / 2, my); g.rotate(s * .08); g.fillStyle = "rgba(255,60,40,.1)"; for (let i = 0; i < 16; i++) { const an = i / 16 * TAU; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(an - .05) * w, Math.sin(an - .05) * w); g.lineTo(Math.cos(an + .05) * w, Math.sin(an + .05) * w); g.fill(); } g.restore();
        const gy = h * .88; g.fillStyle = "#1a0205"; g.fillRect(-w, gy, w * 3, h);                         // the blood sea
        g.strokeStyle = "rgba(255,70,55,.35)"; g.lineWidth = 2; for (let i = 0; i < 26; i++) { const yy = gy + 6 + hs(i) * (h - gy), xx = hs(i + 3) * w; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + 40 + hs(i + 5) * 120, yy); g.stroke(); }
        const rise = K.oCub(lin(.26, .5, t)), sc = Math.min(w / 900, h / 760) * (1 - lin(.56, .7, t) * .3);
        shrine(g, w / 2, gy + (1 - rise) * h * .6, sc, 1 + .25 * Math.sin(s * 5));
        if (t < .3) [-1, 1].forEach(sd => hand(g, w / 2 + sd * M * .12, h * 1.12 - lin(.2, .26, t) * h * .1, HS(X), sd * -.2, sd < 0 ? "two" : "cross", { flip: sd < 0, skin: "base", sleeve: { c: "#f2ece0", s: "#c9bfae", cuff: "#1a1a1a", len: 240 } }));   // the shrine's hand sign
        if (t > .5) plate(g, X, r, ss(.5, .56, t), lin(.56, .64, t));
        if (t > .54) {                                                        // DISMANTLE / CLEAVE: the whole picture is cut
            const cq = lin(.54, .92, t), N = 42; g.lineCap = "round"; let live = 0;
            for (let k = 0; k < N; k++) { const tk = Math.pow(k / N, 1.3), lt = (cq - tk) / .1; if (lt < 0) continue; const L = K.randLine(k + 3, w, h), e = Math.min(1, lt * 3), hx = K.mix(L[0], L[2], K.oCub(e)), hy = K.mix(L[1], L[3], K.oCub(e));
                g.globalAlpha = Math.max(.12, .5 - (cq - tk) * .5); g.strokeStyle = "#ff2a2a"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(L[0], L[1]); g.lineTo(hx, hy); g.stroke();
                if (lt < 1) { live++; g.globalAlpha = 1; g.strokeStyle = "#fff"; g.lineWidth = 3 + (1 - lt) * 12; g.beginPath(); g.moveTo(L[0], L[1]); g.lineTo(hx, hy); g.stroke(); } }
            g.globalAlpha = 1; if (live) { g.fillStyle = "rgba(255,40,30," + Math.min(.28, live * .06) + ")"; g.fillRect(0, 0, w, h); }
            K.sparks(g, c.x, c.y, lin(.6, .8, t), 30, 7, { speed: M * .7, col: "#ff4a3a" });
        }
        g.restore();
        if (t > .3 && t < .56) { "領域展開".split("").forEach((ch, i) => { const p = lin(.3 + i * .02, .36 + i * .02, t); g.globalAlpha = p; K.txt(g, ch, w * .09, h * .18 + i * M * .115, M * .1, { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#b10e18", glow: "#ff2a1a" }); });
            "伏魔御廚子".split("").forEach((ch, i) => { const p = lin(.38 + i * .02, .44 + i * .02, t); g.globalAlpha = p; K.txt(g, ch, w * .91, h * .12 + i * M * .115, M * .1, { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#b10e18", glow: "#ff2a1a" }); }); g.globalAlpha = 1;
            K.title(g, X, lin(.36, .58, t), { en: "MALEVOLENT SHRINE", kj: "伏魔御廚子", sub: "DOMAIN EXPANSION", y: .94 }); }
        if (t > .56 && t < .76) K.slam(g, "解", w * .32, h * .5, M * .32, lin(.56, .76, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#c5121e", glow: "#ff2a1a", rot: -.12 });
        if (t > .7 && t < .9) K.slam(g, "捌", w * .7, h * .32, M * .26, lin(.7, .9, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#c5121e", glow: "#ff2a1a", rot: .1 });
        if (hit(t, .3, .03)) X.fx.inv = "#ff8a7a"; X.fx.rgb = (t > .56 && t < .9 ? 6 : 0) + hit(t, .3, .1) * 14;
        K.vignette(g, w, h, .5, "#000"); K.bars(g, w, h, 1 - lin(.92, 1, t));
    }
};

/* ---------- TANJIRO · Hinokami Kagura, Clear Blue Sky (Hekira no Ten): the scars burn, the black blade catches fire, then it spins one full
   circle overhead and leaves a ring of sun-fire in the air, which comes down on the target ---------- */
function flameRibbon(g, P, u0, u1, W, s) {                               // a woodblock-print flame ribbon along path P from u0 to u1
    const n = 40, pts = []; for (let i = 0; i <= n; i++) { const u = K.mix(u0, u1, i / n), p = P(u), q = P(Math.min(1, u + .005)), an = Math.atan2(q[1] - p[1], q[0] - p[0]); pts.push([p[0], p[1], an, Math.sin(i / n * Math.PI) * W]); }
    g.save(); g.globalCompositeOperation = "lighter";
    [[1, "rgba(255,70,20,.55)"], [.65, "rgba(255,160,40,.85)"], [.3, "rgba(255,245,200,.95)"]].forEach(([k, col]) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y, an, ww], i) => { const o = ww * k * (1 + .25 * Math.sin(i * .9 - s * 18)); i ? g.lineTo(x + Math.cos(an - 1.5708) * o, y + Math.sin(an - 1.5708) * o) : g.moveTo(x, y); }); for (let i = pts.length - 1; i >= 0; i--) { const [x, y, an, ww] = pts[i], o = ww * k * (1 + .25 * Math.cos(i * .8 - s * 16)); g.lineTo(x + Math.cos(an + 1.5708) * o, y + Math.sin(an + 1.5708) * o); } g.closePath(); g.fill(); });
    g.restore();
    g.save(); g.strokeStyle = "rgba(90,10,0,.55)"; g.lineWidth = 2; for (let i = 4; i < pts.length - 4; i += 4) { const [x, y, an, ww] = pts[i]; g.beginPath(); g.arc(x + Math.cos(an - 1.5708) * ww * .9, y + Math.sin(an - 1.5708) * ww * .9, ww * .3, an, an + 2.4); g.stroke(); } g.restore();   // ukiyo-e curls
}
const tanjiro = {
    col: "#ff6a2a", trail: "#ff9a3a", ms: 7600, tailFx: "burn",
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, r = K.stage(X, back(t)), c = mid(r);
        X.cue(.02, "heartbeat", t); X.cue(.18, "shing", t); X.cue(.3, "roar", t); X.cue(.6, "slash", t); X.cue(.72, "boom", t);
        if (t < .18) { K.eyes(g, X, lin(0, .18, t), { tint: "#ff6a2a", ta: .2 }); K.drift(g, w, h, s, 40, 5, { up: 1, speed: .1, col: "#ffb060", size: 3, glow: 1, add: 1 }); K.bars(g, w, h, 1); return; }
        g.save(); K.cam(g, X, { shake: 2 + hit(t, .72, .14) * 24, r: Math.sin(s * .8) * .02 });
        K.sky(g, w, h, ["#120204", "#3a0806", "#0a0102"]); K.radial(g, w / 2, h * .42, M * .5, ["rgba(255,120,40,.35)", "rgba(255,60,20,0)"]);
        K.drift(g, w, h, s, 90, 3, { up: 1, speed: .12, col: "#ff9a3a", size: 3, glow: 1, add: 1 });
        const halo = K.oBack(lin(.26, .4, t)); if (halo > 0) { g.save(); g.translate(w / 2, h * .42); g.rotate(s * .4); g.globalCompositeOperation = "lighter"; g.strokeStyle = "#ff8a2a"; g.lineWidth = M * .02; g.beginPath(); g.arc(0, 0, M * .34 * halo, 0, TAU); g.stroke(); for (let i = 0; i < 24; i++) { const an = i / 24 * TAU; g.beginPath(); g.moveTo(Math.cos(an) * M * .34 * halo, Math.sin(an) * M * .34 * halo); g.lineTo(Math.cos(an) * M * (.4 + .04 * Math.sin(s * 9 + i)) * halo, Math.sin(an) * M * (.4 + .04 * Math.sin(s * 9 + i)) * halo); g.stroke(); } g.restore(); }   // the sun halo
        plate(g, X, r, ss(.5, .56, t), lin(.62, .72, t));
        const hx = w * .74, hy = h * 1.04, sw = K.ioCub(lin(.56, .66, t)), ang = -2.0 + sw * 2.2, bl = M * .8;    // first person: the black Nichirin blade (Rengoku's flame guard), burning
        const spin = K.ioCub(lin(.56, .66, t)), drop = K.iCub(lin(.66, .72, t)), rcx = K.mix(w / 2, c.x, drop), rcy = K.mix(h * .42, c.y, drop), RR = M * .34 * K.mix(1, .45, drop);   // the circle of the Clear Blue Sky
        const P = u => { const a = -2.0 + u * TAU; return [rcx + Math.cos(a) * RR, rcy + Math.sin(a) * RR * .92]; };
        if (spin > 0 && t < .74) { flameRibbon(g, P, Math.max(0, spin - .98), spin, M * .055 * (1 + drop * .5), s); if (spin < 1) { const hd = P(spin); K.glow(g, hd[0], hd[1], M * .1, "#ffd27a", .9); } }
        if (t < .74 && sw < .7) { g.save(); g.globalAlpha *= 1 - lin(.25, .7, sw); K.katana(g, hx, hy, ang, bl, { blade: ["#3a3a40", "#141418", "#000000"], guard: "#e0461a", wrap: "#1a1a1e", wrapLine: "#2a6a4a", tsuba: "flame", glow: t > .2 ? "#ff6a2a" : null, s }); hand(g, hx - Math.cos(ang) * M * .1, hy - Math.sin(ang) * M * .1, HS(X), ang + 1.5708, "fist", { skin: "base", sleeve: { c: "#1e5a3c", s: "#123a26", cuff: "#111", len: 240 } });
            if (t > .2) for (let i = 0; i < 10; i++) { const q = .2 + i * .08; K.glow(g, hx + Math.cos(ang) * bl * q, hy + Math.sin(ang) * bl * q, M * .04, "#ff8a2a", .5 + .3 * Math.sin(s * 20 + i)); } g.restore(); }   // the arm fades as the blade spins away into the circle of fire
        if (sw > 0 && sw < 1) { g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = "rgba(255,200,120,.9)"; g.lineWidth = M * .04 * (1 - sw); g.beginPath(); g.arc(hx, hy, bl * .9, -2, -2 + sw * 2.2); g.stroke(); g.restore(); }
        boom(g, X, c, lin(.72, .92, t), "#ff6a2a", 1.2);
        g.restore();
        K.cutIn(g, X, lin(.36, .56, t), { y: .72, hh: .22, dir: 1, ang: -.05, kj: "ヒノカミ神楽", name: "TANJIRO" });
        if (t > .56 && t < .76) K.slam(g, "碧羅の天", w / 2, h * .16, M * .11, lin(.56, .76, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#5a0a00", glow: "#ff6a2a" });
        if (t > .74) K.title(g, X, lin(.74, 1, t), { en: "CLEAR BLUE SKY", kj: "碧羅の天", sub: "HINOKAMI KAGURA · TANJIRO", y: .84 });
        if (hit(t, .72, .03)) X.fx.inv = "#ffb37a"; X.fx.rgb = hit(t, .72, .1) * 14;
        K.vignette(g, w, h, .6, "#0a0000"); K.bars(g, w, h, 1 - lin(.92, 1, t));
    }
};

/* ---------- ICHIGO · Getsuga Tensho: BANKAI, black reiatsu with a red edge, the blade raised, a black crescent splits the world ---------- */
const ichigo = {
    col: "#ff3050", trail: "#ff3050", ms: 7600, tailFx: "split",
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, r = K.stage(X, back(t)), c = mid(r);
        X.cue(.02, "rumble", t); X.cue(.2, "boom", t); X.cue(.5, "slash", t); X.cue(.52, "roar", t); X.cue(.74, "boom", t);
        if (t < .2) { const p = lin(0, .2, t); K.still(g, X, p, { z0: 1.1, dz: .2, grade: "#ff3050", dy: .08 }); K.focus(g, w / 2, h / 2, w, h, s, { col: "rgba(0,0,0,.6)", n: 90, r0: M * .3 }); K.slam(g, "卍解", w / 2, h * .5, M * .28, lin(.06, .26, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#000", glow: "#ff1030", ghost: 1 }); K.bars(g, w, h, 1); return; }
        g.save(); K.cam(g, X, { shake: 3 + hit(t, .2, .1) * 22 + (t > .5 && t < .74 ? 8 : 0) + hit(t, .74, .12) * 24 });
        K.sky(g, w, h, ["#000000", "#140006", "#000000"]);
        for (let i = 0; i < 26; i++) { const x = w * (.1 + .8 * hs(i)), L = h * (.4 + .6 * hs(i + 3)), sway = Math.sin(s * 3 + i) * M * .03; g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = i % 4 ? "rgba(140,0,20,.35)" : "rgba(255,40,70,.5)"; g.lineWidth = M * (.02 + .04 * hs(i + 7)); g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + sway, h - L * .5, x - sway, h - L * lin(.18, .36, t)); g.stroke(); g.restore(); }   // the reiatsu pillar
        plate(g, X, r, ss(.46, .52, t), lin(.56, .7, t));
        const lift = K.oBack(lin(.26, .46, t)), swing = K.ioCub(lin(.48, .56, t)), hx = w * .62, hy = h * (1.12 - .14 * lift), ang = -1.9 + .6 * lift - 1.8 * swing, bl = M * .9;
        K.katana(g, hx, hy, ang, bl, { blade: ["#2a2a30", "#0c0c10", "#000000"], guard: "#1a1a1a", wrap: "#0e0e10", wrapLine: "#c8c8d0", tsuba: "manji", chain: "broken", glow: "#ff2a4a", s });   // Tensa Zangetsu: black blade, 卍 guard, the broken chain
        g.save(); g.strokeStyle = "#1a1a1a"; g.lineWidth = 3; g.beginPath(); g.moveTo(hx - Math.cos(ang) * M * .18, hy - Math.sin(ang) * M * .18); for (let i = 0; i < 8; i++) g.lineTo(hx - Math.cos(ang) * M * .18 - i * M * .02 + Math.sin(s * 4 + i) * 8, hy - Math.sin(ang) * M * .18 + i * M * .03); g.stroke(); g.restore();   // the broken chain on the hilt
        [-1, 1].forEach((sd, i) => hand(g, hx - Math.cos(ang) * M * (.08 + i * .07), hy - Math.sin(ang) * M * (.08 + i * .07), HS(X), ang + 1.5708, "fist", { flip: sd < 0, skin: "tan", sleeve: { c: "#0a0a0c", s: "#000", cuff: "#ff3050", len: 240 } }));
        const q = K.oExpo(lin(.54, .76, t));                                    // the black crescent with a red rim, sweeping at the target
        if (q > 0 && t < .8) { const x = K.mix(w * .45, c.x, q), y = K.mix(h * .7, c.y, q), Rr = M * (.5 - .2 * q); g.save(); g.translate(x, y); g.rotate(-.5 + q * .4);
            for (let k = 6; k >= 0; k--) { g.globalAlpha = k ? .08 : 1; g.beginPath(); g.arc(-k * 14, k * 10, Rr, Math.PI * 1.1, Math.PI * 1.9); g.arc(-k * 14, k * 10 + Rr * .35, Rr * 1.05, Math.PI * 1.85, Math.PI * 1.15, true); g.closePath(); g.fillStyle = "#050005"; g.fill(); if (!k) { g.strokeStyle = "rgba(255,0,48,.25)"; g.lineWidth = 34; g.stroke(); g.strokeStyle = "#ff1a3a"; g.lineWidth = 10; g.stroke(); g.strokeStyle = "#fff"; g.lineWidth = 3; g.stroke(); } } g.restore(); }
        boom(g, X, c, lin(.74, .92, t), "#ff3050", 1.2);
        g.restore();
        K.cutIn(g, X, lin(.26, .46, t), { y: .3, hh: .26, dir: -1, ang: .07, kj: "天鎖斬月", name: "ICHIGO" });
        if (t > .5 && t < .76) K.slam(g, "月牙天衝", w / 2, h * .18, M * .15, lin(.5, .76, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#c5122a", glow: "#ff1030", ghost: 1 });
        if (t > .76) K.title(g, X, lin(.76, 1, t), { en: "GETSUGA TENSHO", kj: "月牙天衝", y: .84 });
        if (hit(t, .5, .03)) X.fx.inv = "#ff6a7a"; X.fx.rgb = hit(t, .5, .1) * 14 + hit(t, .74, .1) * 14;
        K.vignette(g, w, h, .5, "#000"); K.bars(g, w, h, 1 - lin(.92, 1, t));
    }
};

/* ---------- NETERO · 100-Type Guanyin Bodhisattva: a prayer of gratitude, the golden statue rises with its hundred hands, the barrage, ZERO HAND ---------- */
/* the Guanyin Bodhisattva: a golden statue with a crown, a serene face, a flame-edged halo and tier upon tier of arms, every one
   ending in an open palm; its own two hands joined in prayer before its chest */
function guanyin(g, x, y, R, p, s, a) {
    if (p <= 0) return; g.save(); g.translate(x, y); g.globalAlpha *= a;
    const ink = "#3a2200", gold = (y0, y1) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, "#fff3b8"); gr.addColorStop(.45, "#eab83e"); gr.addColorStop(1, "#8a5408"); return gr; };
    g.save(); g.rotate(s * .05); for (let i = 0; i < 64; i++) { const an = i / 64 * TAU, L = R * (1.05 + .1 * Math.sin(s * 3 + i)) * p; g.strokeStyle = "rgba(255,210,74,.3)"; g.lineWidth = 2; g.beginPath(); g.moveTo(Math.cos(an) * R * .52, Math.sin(an) * R * .52); g.lineTo(Math.cos(an) * L, Math.sin(an) * L); g.stroke(); } g.restore();
    const hy = -R * .42;                                                       // the halo behind the head, edged with flames
    g.save(); g.translate(0, hy); g.beginPath(); for (let i = 0; i <= 48; i++) { const an = i / 48 * TAU, r0 = R * .27 * p * (1 + (i % 2 ? .07 : 0) + .02 * Math.sin(s * 6 + i)); g.lineTo(Math.cos(an) * r0, Math.sin(an) * r0); } g.closePath(); g.fillStyle = "rgba(255,200,60,.22)"; g.fill(); g.strokeStyle = "#ffd24a"; g.lineWidth = 3; g.stroke();
    g.beginPath(); g.arc(0, 0, R * .2 * p, 0, TAU); g.strokeStyle = "rgba(255,240,180,.8)"; g.lineWidth = 2; g.stroke(); g.restore();
    // the arms: three tiers fanning out from the shoulders, open palms facing us
    const tiers = [[7, .5, .8], [8, .68, .9], [9, .86, 1]];
    tiers.slice().reverse().forEach(([n, rr, k], ti) => [-1, 1].forEach(sd => { for (let i = 0; i < n; i++) {
        const an = sd < 0 ? Math.PI + .12 + (i / (n - 1)) * 1.45 + ti * .04 : -.12 - (i / (n - 1)) * 1.45 - ti * .04, wave = Math.sin(s * 2.2 + i * .9 + ti) * .05, a2 = sd < 0 ? an - wave : an + wave;
        const sx = sd * R * .17, sy = -R * .2, L = R * rr * p, ex = sx + Math.cos(a2) * L, ey = sy + Math.sin(a2) * L * .82;
        g.strokeStyle = ink; g.lineCap = "round"; g.lineWidth = R * .034 * k + 3; g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx + Math.cos(a2) * L * .5, sy + Math.sin(a2) * L * .5 - R * .05, ex, ey); g.stroke();
        g.strokeStyle = gold(sy, ey); g.lineWidth = R * .034 * k; g.stroke();
        hand(g, ex, ey, R * .085 * k / 110, Math.atan2(Math.sin(a2) * .82, Math.cos(a2)) + 1.5708, i % 3 ? "open" : "blade", { view: "palm", flip: sd > 0, skin: "gold", line: 1.6, arm: 0 });
    } }));
    // the body: shoulders and robes, drapery folds
    g.beginPath(); g.moveTo(-R * .4, R * .75); g.bezierCurveTo(-R * .38, R * .1, -R * .34, -R * .2, -R * .16, -R * .25); g.quadraticCurveTo(0, -R * .3, R * .16, -R * .25); g.bezierCurveTo(R * .34, -R * .2, R * .38, R * .1, R * .4, R * .75); g.closePath();
    g.fillStyle = gold(-R * .3, R * .75); g.fill(); g.strokeStyle = ink; g.lineWidth = 3; g.stroke();
    g.strokeStyle = "rgba(90,50,0,.55)"; g.lineWidth = 2; [-.24, -.12, .12, .24].forEach(k => { g.beginPath(); g.moveTo(R * k * .6, -R * .1); g.quadraticCurveTo(R * k, R * .3, R * k * 1.3, R * .74); g.stroke(); });
    g.beginPath(); g.moveTo(-R * .16, -R * .24); g.quadraticCurveTo(0, -R * .1, R * .16, -R * .24); g.stroke();      // the neckline of the robe
    // its own hands in prayer
    [-1, 1].forEach(sd => hand(g, sd * R * .012, -R * .02, R * .1 / 110, sd * -.05, "blade", { view: "palm", flip: sd > 0, skin: "gold", line: 1.8, arm: 0 }));
    // the head: ushnisha, crown, serene face, long earlobes, the urna
    g.fillStyle = gold(hy - R * .2, hy + R * .1); g.strokeStyle = ink; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, hy - R * .15, R * .055, R * .06, 0, 0, TAU); g.fill(); g.stroke();                                    // the topknot
    [-1, 1].forEach(sd => { g.beginPath(); g.ellipse(sd * R * .11, hy + R * .03, R * .025, R * .07, sd * .1, 0, TAU); g.fill(); g.stroke(); });   // ears with long lobes
    g.beginPath(); g.ellipse(0, hy, R * .1, R * .125, 0, 0, TAU); g.fill(); g.stroke();                                              // the face
    g.beginPath(); g.moveTo(-R * .12, hy - R * .06); for (let i = 0; i <= 6; i++) { const xx = -R * .12 + i * R * .04, yy = hy - R * .07 - (i % 2 ? R * .07 : R * .025); g.lineTo(xx, yy); } g.lineTo(R * .12, hy - R * .06); g.quadraticCurveTo(0, hy - R * .1, -R * .12, hy - R * .06); g.closePath();
    g.fillStyle = gold(hy - R * .15, hy - R * .05); g.fill(); g.stroke(); [-2, 0, 2].forEach(i => { g.fillStyle = i ? "#ff6a4a" : "#6ad0ff"; g.beginPath(); g.arc(i * R * .03, hy - R * .085 - (i ? 0 : R * .02), R * .012, 0, TAU); g.fill(); });   // the crown and its jewels
    g.strokeStyle = ink; g.lineWidth = 2.4; g.lineCap = "round";
    [-1, 1].forEach(sd => { g.beginPath(); g.arc(sd * R * .042, hy - R * .002, R * .028, .25 * Math.PI, .75 * Math.PI); g.stroke(); g.beginPath(); g.arc(sd * R * .042, hy - R * .035, R * .035, 1.2 * Math.PI, 1.8 * Math.PI); g.stroke(); });   // closed eyes, long brows
    g.beginPath(); g.moveTo(0, hy + R * .005); g.quadraticCurveTo(R * .012, hy + R * .045, -R * .004, hy + R * .05); g.stroke();      // the nose
    g.beginPath(); g.moveTo(-R * .022, hy + R * .075); g.quadraticCurveTo(0, hy + R * .087, R * .022, hy + R * .075); g.stroke();  // a calm mouth
    g.fillStyle = ink; g.beginPath(); g.arc(0, hy - R * .052, R * .007, 0, TAU); g.fill();                                          // the urna
    K.glow(g, 0, hy, R * .3, "#ffd24a", .25 * p);
    g.restore();
}
const netero = {
    col: "#ffd24a", trail: "#ffd24a", ms: 7600, tailFx: "shatter",
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, r = K.stage(X, back(t)), c = mid(r), Y = "#ffd24a";
        X.cue(.02, "chime", t); X.cue(.26, "rumble", t); X.cue(.42, "rush", t); X.cue(.56, "rush", t); X.cue(.74, "boom", t);
        if (t < .24) {                                                        // the prayer: palms together, a slow bow
            const p = lin(0, .24, t); K.sky(g, w, h, ["#0a0600", "#1e1404", "#050300"]); K.radial(g, w / 2, h * .5, M * .5, ["rgba(255,210,74,.3)", "rgba(255,210,74,0)"]);
            [-1, 1].forEach(sd => hand(g, w / 2 + sd * M * .035, h * (1.02 - .12 * ss(0, .4, p)), HS(X) * 1.2, sd * -.06, "blade", { view: "palm", flip: sd > 0, skin: "base", sleeve: { c: "#f4f0e6", s: "#c9c0aa", cuff: "#d9b23a", len: 240 } }));
            K.column(g, "感謝", w * .2, h * .3, M * .1, lin(.1, .6, p), { fill: "#fff", stroke: "#5a3a00", glow: Y, sw: 3 }); K.cutIn(g, X, lin(.3, 1, p), { y: .22, hh: .22, dir: -1, ang: .05, kj: "百式観音", name: "ISAAC NETERO" }); K.bars(g, w, h, 1); return;
        }
        g.save(); K.cam(g, X, { shake: (t > .4 && t < .7 ? 7 : 2) + hit(t, .74, .14) * 26, z: 1 + lin(.24, .4, t) * .04 });
        K.sky(g, w, h, ["#140c02", "#3a2604", "#0a0600"]);
        plate(g, X, r, ss(.38, .44, t), lin(.44, .7, t));
        guanyin(g, w / 2, h * .62, M * .62, K.oBack(lin(.24, .4, t)), s, 1 - lin(.88, .96, t));
        for (let i = 0; i < 60; i++) {                                       // the barrage: golden palms faster than sound
            const st = .4 + i * .0045, q = K.oExpo(lin(st, st + .06, t)); if (q <= 0 || q >= 1 || t > .72) continue; const a0 = Math.PI + ((i * 7) % 26 + .5) / 26 * Math.PI, x0 = w / 2 + Math.cos(a0) * M * .38, y0 = h * .62 + Math.sin(a0) * M * .34, tx = c.x + (hs(i) - .5) * r.w, ty = c.y + (hs(i + 3) - .5) * r.h, x = K.mix(x0, tx, q), y = K.mix(y0, ty, q);
            g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = "rgba(255,210,74,.45)"; g.lineWidth = M * .02; g.beginPath(); g.moveTo(K.mix(x0, tx, Math.max(0, q - .3)), K.mix(y0, ty, Math.max(0, q - .3))); g.lineTo(x, y); g.stroke(); g.restore(); hand(g, x, y, M * .055 * (1 + q * .6) / 110, Math.atan2(ty - y0, tx - x0) + 1.5708, "open", { view: "palm", skin: "gold", line: 1.6, arm: 0, rim: Y });   // open-palm strikes, not fists
            if (q > .9) K.sparks(g, tx, ty, (q - .9) * 10, 6, i, { speed: M * .2, col: "#fff2b0" }); }
        if (t > .7 && t < .86) { const q = lin(.7, .86, t), sc = K.mix(.4, 2.2, K.oExpo(q)); g.save(); g.globalAlpha = 1 - lin(.6, 1, q); hand(g, K.mix(w / 2, c.x, q * .6), K.mix(h * .9, c.y + M * .3, q * .6), HS(X) * sc, 0, "open", { view: "palm", skin: "gold", aura: Y }); g.restore(); }   // ZERO HAND
        boom(g, X, c, lin(.74, .94, t), Y, 1.4);
        g.restore();
        if (t > .4 && t < .7) K.slam(g, "百式観音", w / 2, h * .2, M * .11, lin(.4, .7, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#5a3a00", glow: Y });
        if (t > .72) K.title(g, X, lin(.72, 1, t), { en: "ZERO HAND", kj: "零の掌", y: .84 });
        if (hit(t, .74, .03)) X.fx.inv = "#ffe9a0"; X.fx.rgb = hit(t, .74, .1) * 14;
        K.vignette(g, w, h, .55, "#0a0600"); K.bars(g, w, h, 1 - lin(.92, 1, t));
    }
};

/* ---------- YAMI · Dark Cloaked Dimension Slash: smoke and dark magic, "push past your limits", a cut that slices space itself ---------- */
const yami = {
    col: "#a06bff", trail: "#a06bff", ms: 7400, tailFx: "split",
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, r = K.stage(X, back(t)), c = mid(r), V = "#a06bff", cutAt = .62;
        X.cue(.02, "rumble", t); X.cue(.3, "shing", t); X.cue(cutAt, "slash", t); X.cue(cutAt + .01, "boom", t);
        if (t < .2) { K.eyes(g, X, lin(0, .2, t), { tint: "#a06bff", ta: .2 }); for (let i = 0; i < 6; i++) { const q = (s * .3 + i / 6) % 1; K.pool(g, w * (.6 + .3 * hs(i)), h * (.6 - q * .3), M * (.1 + q * .2), "#d9d0e6", .15 * Math.sin(q * Math.PI)); } K.bars(g, w, h, 1); return; }   // cigarette smoke drifting over the stare
        g.save(); K.cam(g, X, { shake: 2 + hit(t, cutAt, .14) * 26 });
        K.sky(g, w, h, ["#06020e", "#14082a", "#020006"]);
        for (let i = 0; i < 10; i++) { const x = ((hs(i + 2) * w * 1.4 + s * 24 * (.5 + hs(i))) % (w * 1.4)) - w * .2, y = h * (.2 + .6 * hs(i + 8)); K.pool(g, x, y, M * (.4 + .2 * hs(i)), "#2a0a50", .5); }   // dark magic fog
        plate(g, X, r, ss(.4, .46, t), lin(.5, .62, t));
        const draw = K.oCub(lin(.24, .4, t)), hx = w * .7, hy = h * 1.08, ang = -2.3 + .4 * draw + 1.6 * K.ioCub(lin(cutAt - .04, cutAt + .02, t)), bl = M * .95;
        if (t < cutAt + .06) { K.katana(g, hx, hy, ang, bl, { blade: ["#ece6ff", "#7a6aa8", "#1a1030"], guard: "#2a2a2a", glow: t > .4 ? V : null, s }); hand(g, hx - Math.cos(ang) * M * .1, hy - Math.sin(ang) * M * .1, HS(X), ang + 1.5708, "fist", { skin: "tan", sleeve: { c: "#141414", s: "#000", cuff: "#d9d0b8", len: 240 } });
            if (t > .4) { g.save(); g.globalCompositeOperation = "lighter"; for (let i = 0; i < 18; i++) { const q = (s * 1.5 + i / 18) % 1, d = bl * (.15 + .85 * hs(i)); K.pool(g, hx + Math.cos(ang) * d + (hs(i + 4) - .5) * 30, hy + Math.sin(ang) * d - q * 50, M * .05, "#3a1070", .6 * (1 - q)); } g.restore(); } }   // dark magic coating the blade
        if (t >= cutAt) {                                                    // THE CUT: a diagonal through the target, the picture slides apart along it
            const q = K.oExpo(lin(cutAt, cutAt + .1, t)), sl = K.oCub(lin(cutAt + .04, .9, t)) * M * .06, an = -.45, L = Math.hypot(w, h);
            g.save(); g.translate(c.x, c.y); g.rotate(an); g.globalCompositeOperation = "lighter"; g.fillStyle = "rgba(160,107,255,.5)"; g.fillRect(-L * q, -sl - 4, L * 2 * q, sl * 2 + 8); g.fillStyle = "#000"; g.globalCompositeOperation = "source-over"; g.fillRect(-L * q, -sl, L * 2 * q, sl * 2); g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.moveTo(-L * q, -sl); g.lineTo(L * q, -sl); g.moveTo(-L * q, sl); g.lineTo(L * q, sl); g.stroke();
            for (let i = 0; i < 30; i++) { const x = (hs(i) - .5) * L * q * 1.6, y = (hs(i + 5) - .5) * sl * 2; g.fillStyle = "rgba(200,170,255," + (.8 * hs(i + 9)) + ")"; g.fillRect(x, y, 3, 3); } g.restore();
            X.fx.glitch = hit(t, cutAt, .1) * .8; K.sparks(g, c.x, c.y, lin(cutAt, cutAt + .2, t), 30, 2, { speed: M * .7, col: V, ang: an, spread: .4 }); K.sparks(g, c.x, c.y, lin(cutAt, cutAt + .2, t), 30, 6, { speed: M * .7, col: V, ang: an + Math.PI, spread: .4 });
        }
        g.restore();
        K.cutIn(g, X, lin(.22, .44, t), { y: .3, hh: .26, dir: 1, ang: -.07, kj: "闇魔法", name: "YAMI SUKEHIRO" });
        if (t > .44 && t < .62) K.slam(g, "限界を超えろ", w / 2, h * .62, M * .08, lin(.44, .64, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#2a0a5a", glow: V });
        if (t > cutAt) K.title(g, X, lin(cutAt + .04, 1, t), { en: "DARK CLOAKED DIMENSION SLASH", kj: "闇纏・次元斬り", y: .84 });
        if (hit(t, cutAt, .03)) X.fx.inv = "#c9b0ff"; X.fx.rgb = hit(t, cutAt, .12) * 16;
        K.vignette(g, w, h, .55, "#000"); K.bars(g, w, h, 1 - lin(.92, 1, t));
    }
};

/* ---------- JOTARO · Star Platinum: "Yare yare daze", the Stand appears behind, ORA ORA ORA ORA, one last punch through the screen ---------- */
const jotaro = {
    col: "#b388ff", trail: "#c9a6ff", ms: 7600, tailFx: "shatter",
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, r = K.stage(X, back(t)), c = mid(r), P = "#b388ff";
        X.cue(.02, "rumble", t); X.cue(.26, "rush", t); X.cue(.38, "rush", t); X.cue(.5, "rush", t); X.cue(.66, "punch", t); X.cue(.72, "boom", t);
        if (t < .22) {                                                        // ゴゴゴ: the cap, the stare, the menace
            K.still(g, X, lin(0, .22, t), { z0: 1.05, dz: .12, dy: -.02 }); K.halftone(g, w, h, "rgba(60,0,90,.4)", .6, 8);
            "ゴゴゴゴ".split("").forEach((ch, i) => { const q = lin(.02 + i * .03, .1 + i * .03, t); if (q > 0) K.txt(g, ch, w * (.12 + i * .25), h * (.18 + (i % 2) * .62), M * .12, { font: K.F_JP, weight: "400", fill: "#d9a6ff", stroke: "#1a0030", rot: (i - 1.5) * .1, sw: 4 }); });
            K.slam(g, "やれやれだぜ", w / 2, h * .86, M * .07, lin(.08, .24, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#1a0030", glow: P }); K.bars(g, w, h, 1); return;
        }
        g.save(); K.cam(g, X, { shake: 4 + (t > .26 && t < .66 ? 8 : 0) + hit(t, .72, .14) * 30 });
        K.sky(g, w, h, ["#22104a", "#3a1a74", "#10062a"]); K.halftone(g, w, h, "rgba(255,255,255,.07)", 1, 10); K.focus(g, c.x, c.y, w, h, s, { col: "rgba(255,255,255,.25)", n: 100, r0: M * .14 });
        plate(g, X, r, 1, lin(.3, .6, t));
        const br = lin(.26, .66, t), n = Math.floor(br * 46);                // the rush: fists from both sides, faster and faster
        for (let i = Math.max(0, n - 14); i < n; i++) { const side = i % 2 ? -1 : 1, q = (br * 46 - i) / 1.4, x0 = w / 2 + side * w * (.25 + .1 * hs(i)), y0 = h * 1.1, k = Math.min(1, q), tx = c.x + (hs(i) - .5) * r.w * .7, ty = c.y + (hs(i + 2) - .5) * r.h * .6, x = K.mix(x0, tx, K.oExpo(k)), y = K.mix(y0, ty, K.oExpo(k)), sz = M * (.0026 - .0014 * k);
            g.save(); g.globalAlpha = 1 - Math.max(0, q - 1) * .8; g.globalCompositeOperation = "lighter"; g.strokeStyle = "rgba(190,150,255,.4)"; g.lineWidth = sz * 38; g.lineCap = "round"; g.beginPath(); g.moveTo(K.mix(x0, x, .4), K.mix(y0, y, .4)); g.lineTo(x, y); g.stroke(); g.restore();
            g.save(); g.globalAlpha = 1 - Math.max(0, q - 1) * .8; fist(g, x, y, sz, (hs(i + 5) - .5) * .4, { skin: "stp", aura: k < 1 ? null : P }); g.restore();
            if (q > 1 && q < 1.4) K.sparks(g, tx, ty, (q - 1) / .4, 6, i, { speed: M * .2, col: "#e6d9ff" }); }
        for (let i = 0; i < 12; i++) { const a = .27 + i * .033, q = lin(a, a + .09, t); if (q > 0 && q < 1) K.txt(g, "オラ", w * (.12 + hs(i + 4) * .76), h * (.14 + hs(i + 9) * .6), M * (.07 + .07 * hs(i + 2)) * (1 + q * .3), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#1a0030", glow: P, rot: (hs(i) - .5) * .5 }); }
        if (t > .64 && t < .76) { const q = lin(.64, .74, t), sc = M * K.mix(.003, .013, K.oExpo(q)); fist(g, K.mix(w / 2, c.x, q * .4), K.mix(h * .9, c.y, q * .5), sc, 0, { skin: "stp", aura: P }); }   // the last one, right through the screen
        boom(g, X, c, lin(.72, .92, t), P, 1.3);
        g.restore();
        K.cutIn(g, X, lin(.22, .44, t), { y: .74, hh: .22, dir: -1, ang: .05, kj: "スタープラチナ", name: "JOTARO KUJO" });
        if (t > .5 && t < .76) K.slam(g, "オラオラオラァ!!", w / 2, h * .2, M * .1, lin(.5, .76, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#1a0030", glow: P, ghost: 1 });
        if (t > .76) K.title(g, X, lin(.76, 1, t), { en: "ORA ORA RUSH", kj: "スタープラチナ", y: .84 });
        if (hit(t, .72, .03)) X.fx.inv = "#d9c6ff"; X.fx.rgb = hit(t, .72, .1) * 16;
        K.vignette(g, w, h, .5, "#0a0418"); K.bars(g, w, h, 1 - lin(.92, 1, t));
    }
};

export const ULT = { onepiece_u: luffy, naruto_u: naruto, dragonball_u: goku, jjk_u: sukuna, demonslayer_u: tanjiro, bleach_u: ichigo, hxh_u: netero, blackclover_u: yami, jojo_u: jotaro };
