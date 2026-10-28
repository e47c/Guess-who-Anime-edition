/* =====================================================================
   FREEZE CARDS · nine ways to freeze the same real plate (the next player loses 2 turns)
   Every scene: a character beat (eye close-up / cut-in), the technique in first person, the hit on the target
   (staged at centre, then gliding back onto its real place on the table), and a seal(g, X, a, r) that the ending
   keeps on the real plate.
   ===================================================================== */
import * as K from "./kit.js?v=6";
import { hand, fist, handTips } from "./hands.js?v=6";
const { lin, ss, hit, hs, TAU, mid } = K;

const back = t => 1 - ss(.86, .97, t);                       // staged plate -> real plate over the last beat of the main act
const plate = (g, X, r, a, lit) => K.plateGhost(g, X, r, X.env.toName, X.col, a, lit);
const cutTo = (X, t, at, col = "#fff", len = .025) => { const k = hit(t, at, len); if (k > 0) X.fx.flash = [col, k]; };
const HS = X => X.M * (X.h > X.w ? .0036 : .003);           // first-person hand scale

/* a tidal wave frozen in the act of breaking (Aokiji froze Whitebeard's tsunamis at Marineford). e = 0..1 how far the freeze has climbed */
function frozenWave(g, cx, by, W, H, e) {
    if (e <= 0) return; const Hh = H * K.oBack(e, 1.2); g.save(); g.lineJoin = "round";
    const path = () => { g.beginPath(); g.moveTo(cx - W / 2, by); g.bezierCurveTo(cx - W * .32, by - Hh * .15, cx - W * .14, by - Hh * .92, cx + W * .1, by - Hh); g.bezierCurveTo(cx + W * .3, by - Hh * 1.02, cx + W * .36, by - Hh * .72, cx + W * .27, by - Hh * .56);
        g.bezierCurveTo(cx + W * .2, by - Hh * .46, cx + W * .13, by - Hh * .6, cx + W * .18, by - Hh * .7); g.bezierCurveTo(cx + W * .06, by - Hh * .74, cx + W * .03, by - Hh * .36, cx + W * .22, by - Hh * .16); g.lineTo(cx + W / 2, by); g.closePath(); };
    path(); const gr = g.createLinearGradient(0, by - Hh, 0, by); gr.addColorStop(0, "#f6fdff"); gr.addColorStop(.4, "#a9d8f4"); gr.addColorStop(1, "#2e6aa2"); g.fillStyle = gr; g.fill(); g.strokeStyle = "#ffffff"; g.lineWidth = 2; g.stroke();
    g.save(); path(); g.clip(); g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1.4;
    for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(cx - W * (.42 - k * .1), by); g.quadraticCurveTo(cx - W * (.3 - k * .08), by - Hh * (.5 + k * .05), cx + W * (.02 + k * .03), by - Hh * (.85 - k * .04)); g.stroke(); }
    g.restore();
    g.fillStyle = "rgba(235,250,255,.95)"; for (let k = 0; k < 6; k++) { const x = cx + W * (.12 + k * .028), y = by - Hh * (.62 - k * .01); g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x, y + Hh * (.06 + .05 * hs(k))); g.lineTo(x + 4, y); g.fill(); }   // icicles under the curl
    g.restore();
}
/* ---------- AOKIJI · Ice Age: the lazy stare, a palm on the sea, the sea freezes to the horizon, spires entomb the target ---------- */
const aokiji = {
    col: "#bfeaff", ms: 7600,
    seal: (g, X, a, r) => K.iceBlock(g, r || X.env.r, a, X.s, "#bfeaff"),
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s;
        X.cue(.01, "wind", t); X.cue(.3, "impact", t); X.cue(.31, "freeze", t); X.cue(.52, "boom", t); X.cue(.53, "freeze", t);
        if (t < .22) {                                                        // 1 · the lazy stare, cold breath
            const p = lin(0, .22, t); K.eyes(g, X, p, { tint: "#9fd8ff", ta: .25 });
            for (let i = 0; i < 5; i++) { const q = (s * .35 + i / 5) % 1; K.pool(g, w * (.3 + .4 * hs(i)) + q * w * .2, h * (.66 + .04 * i) - q * h * .1, M * (.12 + q * .25), "#dff4ff", .2 * Math.sin(q * Math.PI)); }
            K.drift(g, w, h, s, 60, 3, { up: -1, speed: .06, col: "#ffffff", size: 2.4 }); K.bars(g, w, h, 1);
            K.column(g, "青雉", w * .07, h * .2, M * .065, lin(.04, .5, p), { fill: "#e9f8ff", stroke: "#0a2a44", glow: "#9fe3ff", sw: 3 });
            cutTo(X, t, .215, "#e9f8ff"); return;
        }
        if (t < .5) {                                                         // 2 · first person: a palm on the sea, the freeze runs to the horizon
            const p = lin(.22, .5, t), slam = lin(.24, .3, t), e = K.oExpo(lin(.3, .5, t)), y0 = h * .43;
            g.save(); K.cam(g, X, { z: 1.02 + p * .06, shake: hit(t, .3, .1) * 16, drift: 3 });
            K.sky(g, w, h, ["#040a16", "#13304e", "#6f97ba"], 0, 0, 0, y0); K.glow(g, w * .72, h * .16, M * .2, "#dff2ff", .5); K.stars(g, w, y0 * .7, s, 40, "#cfe9ff", 4);
            const sea = g.createLinearGradient(0, y0, 0, h); sea.addColorStop(0, "#0e2a44"); sea.addColorStop(1, "#02070f"); g.fillStyle = sea; g.fillRect(-w, y0, w * 3, h);
            g.strokeStyle = "rgba(140,190,230,.25)"; g.lineWidth = 1.5; for (let i = 1; i < 18; i++) { const k = Math.pow(i / 18, 2), y = y0 + (h - y0) * k; g.beginPath(); for (let x = -20; x <= w + 20; x += 16) g.lineTo(x, y + Math.sin(x * .02 / (k + .1) + s * 2 + i) * 3 * k); g.stroke(); }
            if (e > 0) {                                                      // the ice sheet, cracks racing out from the hand
                g.save(); g.beginPath(); g.rect(-w, y0, w * 3, h); g.clip(); const rx = w * 1.7 * e, ry = (h * 1.06 - y0) * e * 1.02;
                const ig = g.createRadialGradient(w / 2, h * 1.06, 0, w / 2, h * 1.06, Math.max(rx, ry)); ig.addColorStop(0, "#f4fcff"); ig.addColorStop(.5, "#b5ddf6"); ig.addColorStop(1, "#6fa6d4");
                g.beginPath(); g.ellipse(w / 2, h * 1.06, rx, ry, 0, 0, TAU); g.fillStyle = ig; g.fill();
                g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 1.6; for (let k = 0; k < 26; k++) { const an = Math.PI + k / 25 * Math.PI, L = (.5 + .5 * hs(k)); g.beginPath(); g.moveTo(w / 2, h * 1.04); for (let j = 1; j <= 7; j++) { const q = j / 7 * L, a2 = an + (hs(k * 9 + j) - .5) * .15; g.lineTo(w / 2 + Math.cos(a2) * rx * q * .98, h * 1.06 + Math.sin(a2) * ry * q * .98); } g.stroke(); }
                for (let k = 0; k < 40; k++) { const an = Math.PI + hs(k + 50) * Math.PI, x = w / 2 + Math.cos(an) * rx, y = h * 1.06 + Math.sin(an) * ry; if (y < y0) continue; K.spire(g, x, y, M * .05 * (1 - e * .6) * (.5 + hs(k)), M * .02, 1); }
                g.restore(); K.pool(g, w / 2, y0, w * .6 * e, "#e6f7ff", .25 * e);
            }
            frozenWave(g, w * .3, y0 + 2, w * .7, h * .3, lin(.32, .5, t)); frozenWave(g, w * .78, y0 + 2, w * .5, h * .22, lin(.36, .5, t));   // the tsunamis on the horizon freeze mid-crash
            const hy = h * (1.3 - .26 * K.oBack(slam)) + hit(t, .3, .08) * 18, sz = HS(X) * 1.25, sl = { c: "#eef1f6", s: "#b9c2d2", cuff: "#22355f", len: 300 };
            hand(g, w * .52, hy, sz, -.05, "spread", { skin: "tan", sleeve: sl });
            const ice = lin(.27, .4, t); if (ice > 0) { g.save(); g.globalAlpha = ice; hand(g, w * .52, hy, sz, -.05, "spread", { skin: "ice", rim: "#bfeaff", sleeve: sl }); g.restore(); }
            if (slam >= 1) { const q = lin(.3, .44, t); g.save(); g.translate(w / 2, h * .98); g.scale(1, .28); K.shock(g, 0, 0, q, w * .8, "#dff4ff", 40); g.restore(); K.sparks(g, w * .5, h * .9, q, 26, 3, { speed: M * .9, col: "#cfeeff", grav: M * .6, ang: -1.57, spread: 2.6 }); }
            g.restore(); K.vignette(g, w, h, .6, "#000814"); K.bars(g, w, h, 1);
            if (p > .25) K.slam(g, "氷河時代", w / 2, h * .2, M * .1, lin(.3, .5, t), { font: K.F_JP, weight: "400", fill: "#f4fcff", stroke: "#0a2a44", glow: "#9fe3ff", from: 1.4 });
            cutTo(X, t, .495, "#ffffff", .03); return;
        }
        // 3 · whip to the target: spires erupt around it. 4 · glitter settles, frost creeps over the screen, the target glides home
        const r = K.stage(X, back(t)), c = mid(r), shake = hit(t, .52, .14) * 22 + hit(t, .6, .1) * 10;
        g.save(); K.cam(g, X, { z: 1.12 - .1 * K.oExpo(lin(.5, .62, t)), y: (1 - K.oExpo(lin(.5, .56, t))) * h * .6, shake });
        K.sky(g, w, h, ["#01060f", "#0b2440", "#14385a"]); K.drift(g, w, h, s, 50, 9, { up: -1, speed: .05, col: "#dff4ff", size: 2 });
        plate(g, X, r, 1, lin(.52, .6, t));
        const by = r.y + r.h + M * .12 * back(t) + M * .04;
        for (let i = 0; i < 13; i++) { const a = (i - 6) / 6, x = c.x + a * (r.w * .62 + M * .14), H = (r.h * 1.6 + M * .22 * (.6 + .6 * hs(i + 3))) * (1 - Math.abs(a) * .4), e = K.oBack(lin(.52 + Math.abs(a) * .04, .62 + Math.abs(a) * .04, t), 1.4);
            K.spire(g, x, by - Math.abs(a) * M * .03, H, M * (.06 + .04 * hs(i)), e, -a * .25, i % 2); }
        for (let i = 0; i < 6; i++) { const e = K.oBack(lin(.56 + i * .02, .68 + i * .02, t)) * (1 - lin(.84, .95, t) * .6); K.spire(g, w * (.04 + i * .184), h * 1.04, M * (.4 + .2 * hs(i + 20)), M * .15, e, (i - 2.5) * .06, 1); }   // foreground pillars
        K.iceBlock(g, r, lin(.6, .75, t), s, "#bfeaff");
        K.debris(g, c.x, by - M * .05, lin(.52, .72, t), 26, 5, { speed: M * 1.2, size: M * .022, grav: M * 1.6, ang: -1.57, spread: 2.2, cols: ["#e9f8ff", "#9fd2f2", "#ffffff"], edge: "#ffffff" });
        g.restore();
        g.save(); g.strokeStyle = "rgba(235,250,255,.75)"; g.lineWidth = 1.3; const fp = lin(.62, 1, t); g.beginPath(); [[0, 0, .6], [w, 0, 2.5], [0, h, -.6], [w, h, -2.5]].forEach(([x, y, a], i) => { for (let k = 0; k < 4; k++) K.frost(g, x, y, a + (k - 1.5) * .3, M * .16, fp, 0, i * 9 + k); }); g.stroke(); g.restore();
        K.drift(g, w, h, s, 70, 21, { up: 1, speed: .03, col: "#ffffff", size: 2.2, glow: 1, add: 1, a: .6 * lin(.6, .8, t) });
        if (hit(t, .52, .03) > 0) X.fx.inv = "#bfeaff";
        X.fx.rgb = hit(t, .52, .08) * 10;
        K.title(g, X, lin(.56, .98, t), { en: "ICE AGE", kj: "アイスエイジ", sub: "AOKIJI · " + X.who, y: .84 });
        K.vignette(g, w, h, .55, "#00060f"); K.bars(g, w, h, 1 - lin(.9, 1, t));
    }
};

/* ---------- HAKU · Demonic Ice Mirrors: a dome of mirrors, his reflection in every one, needles from every side ---------- */
function mirror(g, X, x, y, W, H, rot, a, showArt, glint) {
    g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha *= a;
    const path = () => { g.beginPath(); g.moveTo(-W / 2, -H / 2 + W * .1); g.lineTo(-W / 2 + W * .1, -H / 2); g.lineTo(W / 2 - W * .1, -H / 2); g.lineTo(W / 2, -H / 2 + W * .1); g.lineTo(W / 2, H / 2 - W * .1); g.lineTo(W / 2 - W * .1, H / 2); g.lineTo(-W / 2 + W * .1, H / 2); g.lineTo(-W / 2, H / 2 - W * .1); g.closePath(); };
    path(); g.fillStyle = "rgba(120,200,240,.25)"; g.fill(); g.save(); path(); g.clip();
    if (showArt > .3 && X.art) { g.globalAlpha *= showArt; K.cover(g, X.art, -W / 2, -H / 2, W, H, X.focus[0], X.focus[1] + .1, 1.1); g.globalCompositeOperation = "color"; g.fillStyle = "rgba(120,210,255,.45)"; g.fillRect(-W / 2, -H / 2, W, H); g.globalCompositeOperation = "source-over"; g.globalAlpha /= showArt; }
    const gr = g.createLinearGradient(-W / 2, -H / 2, W / 2, H / 2); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(.3, "rgba(200,240,255,.08)"); gr.addColorStop(.62, "rgba(255,255,255,0)"); gr.addColorStop(.7, "rgba(255,255,255,.3)"); gr.addColorStop(1, "rgba(160,220,255,.15)"); g.fillStyle = gr; g.fillRect(-W / 2, -H / 2, W, H);
    g.restore(); path(); g.lineWidth = 3; g.strokeStyle = "#e9fbff"; g.stroke(); g.lineWidth = 1.2; g.strokeStyle = "#7fd6ff"; g.stroke();
    if (glint > 0) K.glow(g, W * .3, -H * .4, W * .5, "#ffffff", glint); g.restore();
}
const haku = {
    col: "#7fe0ff", ms: 7400,
    seal(g, X, a, r) { r = r || X.env.r; mirror(g, X, r.x + r.w / 2, r.y + r.h / 2, r.w + 34, r.h + 34, 0, a * .9, 0, .4 * a); },
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, r = K.stage(X, back(t)), c = mid(r), N = 14;
        X.cue(.02, "freeze", t); X.cue(.2, "whoosh", t); for (let v = 0; v < 4; v++) X.cue(.48 + v * .08, "strike", t); X.cue(.8, "crack", t);
        g.save(); K.cam(g, X, { r: Math.sin(s * .5) * .05 * (1 - lin(.45, .5, t)), z: 1 + .05 * Math.sin(s * .8), shake: (t > .48 && t < .82 ? 3 : 0) + hit(t, .8, .1) * 18 });
        K.radial(g, w / 2, h / 2, Math.hypot(w, h) * .6, ["#0a3346", "#041621", "#01070c"]);
        g.strokeStyle = "rgba(160,230,255,.12)"; g.lineWidth = 1; for (let i = 0; i < 24; i++) { const an = i / 24 * TAU; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(an) * w, h / 2 + Math.sin(an) * w); g.stroke(); }
        const pos = [], cur = Math.floor(s * 5) % N, br = 1 - lin(.8, .86, t);
        for (let i = 0; i < N; i++) {                                         // the dome: two rings of mirrors
            const ring = i % 2, an = i / N * TAU + .2 + s * .05, rx = w * (ring ? .3 : .45), ry = h * (ring ? .27 : .41), x = w / 2 + Math.cos(an) * rx, y = h / 2 + Math.sin(an) * ry, on = K.oBack(lin(.02 + i * .012, .1 + i * .012, t));
            pos.push([x, y]); if (on <= 0 || br <= 0) continue;
            const W = M * (ring ? .13 : .18) * on, H = W * 1.7, show = t < .2 ? .35 : i === cur || i === (cur + 7) % N ? 1 : .12;
            mirror(g, X, x, y, W, H, an + 1.5708, br, show, hit((s * 5) % 1, 0, .3) * (i === cur ? 1 : 0));
        }
        if (br < 1) K.debris(g, w / 2, h / 2, lin(.8, .98, t), 60, 13, { speed: M * 1.4, size: M * .03, grav: M * .5, cols: ["rgba(220,250,255,.9)", "rgba(140,210,240,.85)"], edge: "#ffffff" });
        const sealA = ss(0, .06, t) * (1 - ss(.16, .22, t));                     // Haku's one-handed seal, ice gathering on the two raised fingers
        if (sealA > 0) { g.save(); g.globalAlpha = sealA; const sx = w * .5, sy = h * 1.06 - K.oBack(lin(0, .08, t)) * h * .12; hand(g, sx, sy, HS(X) * 1.2, -.08, "two", { skin: "pale", rim: "#bff2ff", sleeve: { c: "#33503f", s: "#1f3428", cuff: "#cfe8f4", len: 260 } });
            const tip = handTips("two"), k2 = HS(X) * 1.2, cs = Math.cos(-.08), sn = Math.sin(-.08); [tip[0], tip[1]].forEach(([tx, ty]) => { const x = sx + (tx * cs - ty * sn) * k2, y = sy + (tx * sn + ty * cs) * k2; K.glow(g, x, y, M * .05, "#bff2ff", .9); K.snowflake(g, x, y - M * .03, M * .03, lin(.04, .14, t), s * 2, "#ffffff"); }); g.restore();
            K.slam(g, "秘術", w * .2, h * .3, M * .1, lin(.02, .2, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#06304a", glow: "#7fe0ff" }); }
        plate(g, X, r, ss(.42, .5, t), lin(.48, .56, t));
        for (let v = 0; v < 4; v++) for (let k = 0; k < 12; k++) {          // senbon from every mirror at the target
            const st = .46 + v * .08 + k * .004, q = K.ioCub(lin(st, st + .07, t)); if (q <= 0) continue; const src = pos[(v * 5 + k * 3) % N], tx = c.x + (hs(v * 9 + k) - .5) * r.w * .8, ty = c.y + (hs(v * 9 + k + 3) - .5) * r.h * .7, an = Math.atan2(ty - src[1], tx - src[0]);
            if (q >= 1) { K.sparks(g, tx, ty, lin(st + .07, st + .14, t), 4, v * 20 + k, { speed: M * .12, col: "#bff2ff" }); g.save(); g.translate(tx, ty); g.rotate(an); g.strokeStyle = "#e9fbff"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-M * .03, 0); g.lineTo(0, 0); g.stroke(); g.restore(); continue; }
            const x = K.mix(src[0], tx, q), y = K.mix(src[1], ty, q);
            g.save(); g.translate(x, y); g.rotate(an); g.globalCompositeOperation = "lighter"; g.strokeStyle = "rgba(160,235,255,.5)"; g.lineWidth = 5; g.beginPath(); g.moveTo(-M * .14, 0); g.lineTo(0, 0); g.stroke(); g.strokeStyle = "#ffffff"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-M * .05, 0); g.lineTo(0, 0); g.stroke(); g.restore();
        }
        if (t > .8) haku.seal(g, X, lin(.82, .92, t), r);
        g.restore();
        K.cutIn(g, X, lin(.2, .44, t), { y: .5, hh: .3, dir: -1, ang: .08, kj: "魔鏡氷晶", name: "HAKU" });
        if (t > .5) K.slam(g, "千殺水翔", w / 2, h * .86, M * .075, lin(.5, .8, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#06304a", glow: "#7fe0ff", from: 1.3 });
        K.title(g, X, lin(.82, 1, t), { en: "DEMONIC ICE MIRRORS", kj: "魔鏡氷晶", y: .84 });
        if (hit(t, .8, .025)) X.fx.inv = "#9fe8ff";
        K.vignette(g, w, h, .6, "#00080e"); K.bars(g, w, h, 1 - lin(.92, 1, t));
    }
};

/* ---------- URAUME · Frost Calm: an elegant fingertip, one snowflake, lacework frost across the page, a crystal lattice cage ---------- */
function lattice(g, r, n) {
    const x0 = r.x - 14, y0 = r.y - 14, W = r.w + 28, H = r.h + 28; g.save(); g.strokeStyle = "rgba(235,228,255,.95)"; g.lineWidth = 2; g.globalCompositeOperation = "lighter";
    for (let i = 0; i < n; i++) { const k = i % 7, v = Math.floor(i / 7) % 2; g.beginPath(); if (v) { const x = x0 + W * (k + .5) / 7; g.moveTo(x, y0 - 8); g.lineTo(x + 12, y0 + H + 8); } else { const y = y0 + H * (k + .5) / 7; g.moveTo(x0 - 8, y); g.lineTo(x0 + W + 8, y - 6); } g.stroke(); }
    g.restore(); if (n > 12) { g.save(); g.fillStyle = "rgba(200,190,255,.12)"; g.fillRect(x0, y0, W, H); g.restore(); }
}
const uraume = {
    col: "#d9ccff", ms: 7400,
    seal(g, X, a, r) { r = r || X.env.r; const c = mid(r); g.save(); g.globalAlpha = a; lattice(g, r, 14); K.snowflake(g, c.x, c.y, Math.min(r.h, r.w) * .55, 1, X.s * .2, "rgba(240,235,255,.85)"); g.restore(); },
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, r = K.stage(X, back(t)), c = mid(r);
        X.cue(.02, "chime", t); X.cue(.24, "freeze", t); for (let i = 0; i < 6; i++) X.cue(.62 + i * .03, "tick", t); X.cue(.8, "freeze", t);
        if (t < .2) { K.eyes(g, X, lin(0, .2, t), { tint: "#cbbcff", ta: .3 }); K.drift(g, w, h, s, 50, 2, { up: -1, speed: .04, col: "#efe9ff", size: 2 }); K.bars(g, w, h, 1); cutTo(X, t, .195, "#efe9ff"); return; }
        K.sky(g, w, h, ["#0b0820", "#1d1640", "#07050f"]); K.glow(g, w * .5, h * .3, M * .45, "#a99cff", .25); K.drift(g, w, h, s, 60, 5, { up: -1, speed: .035, col: "#efe9ff", size: 2.2 });
        const sz = HS(X), hx = w * .62, hy = h * 1.12 - ss(.2, .3, t) * h * .14 + Math.sin(s) * 3, ang = -.32;      // the fingertip (index tip of a pale, raised hand)
        const fx = hx + Math.sin(ang - .15) * 215 * sz, fy = hy - Math.cos(ang - .15) * 215 * sz;
        g.save(); g.strokeStyle = "rgba(230,222,255,.85)"; g.lineWidth = 1.4; g.globalCompositeOperation = "lighter";
        g.beginPath(); for (let k = 0; k < 9; k++) { const an = -Math.PI / 2 + (k - 4) * .38; K.frost(g, fx, fy - M * .02, an, M * (.2 + .06 * hs(k)), lin(.28 + k * .01, .62, t), 0, k * 5 + 1); }
        for (let k = 0; k < 6; k++) { const an = k * 1.05 + .3; K.frost(g, w * (k % 2 ? .04 : .96), h * (.15 + k * .15), an + (k % 2 ? 0 : Math.PI), M * .22, lin(.4, .8, t), 0, k * 11 + 3); } g.stroke();
        g.restore();
        const fl = M * .11 * K.oBack(lin(.22, .36, t)) * (1 - lin(.56, .66, t) * .7), fy2 = fy - M * .1;
        K.snowflake(g, fx, fy2, fl, lin(.22, .4, t), s * .25, "#ffffff"); K.glow(g, fx, fy2, M * .14, "#cfc2ff", lin(.22, .3, t) * (1 - lin(.56, .7, t)));
        if (t > .54) {                                                       // the flake flies to the target; the lattice clicks in line by line
            const q = K.ioCub(lin(.54, .64, t)), x = K.mix(fx, c.x, q), y = K.mix(fy2, c.y, q); if (q < 1) { K.snowflake(g, x, y, M * .06, 1, s * 3, "#fff"); K.glow(g, x, y, M * .08, "#d9ccff", .8); }
            plate(g, X, r, ss(.5, .58, t), lin(.62, .7, t)); lattice(g, r, Math.floor(lin(.6, .78, t) * 14));
            if (t > .78) K.snowflake(g, c.x, c.y, Math.min(r.h, r.w) * .55 * K.oBack(lin(.78, .86, t)), 1, s * .2, "rgba(245,240,255,.95)");
            if (t > .78) { for (let i = 0; i < 11; i++) { const a = (i - 5) / 5, e = K.oBack(lin(.79 + Math.abs(a) * .03, .87 + Math.abs(a) * .03, t), 1.5) * back(t); K.spire(g, c.x + a * (r.w * .6 + M * .1), r.y + r.h + M * .06 * back(t), (r.h * 1.4 + M * .2 * (1 - Math.abs(a) * .5)) * (.7 + .3 * hs(i)), M * (.05 + .03 * hs(i + 4)), e, -a * .3, i % 2); }   // Icefall: the ground of ice erupts round the target
                K.debris(g, c.x, r.y + r.h, lin(.79, .95, t), 22, 8, { speed: M * .9, size: M * .018, grav: M * 1.4, ang: -1.57, spread: 2, cols: ["#f0ecff", "#c9bcff", "#ffffff"], edge: "#ffffff" });
                K.slam(g, "直瀑", w * .8, h * .3, M * .11, lin(.79, .98, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#2a1d5a", glow: "#d9ccff" }); }
        }
        hand(g, hx, hy, sz, ang, "point", { skin: "pale", sleeve: { c: "#f3f0f8", s: "#c9c0dc", cuff: "#8f7fc8", len: 280 }, rim: "#d9ccff" });
        K.cutIn(g, X, lin(.64, .86, t), { y: .62, hh: .22, dir: -1, ang: .06, kj: "霜凪", name: "URAUME" });
        K.title(g, X, lin(.72, 1, t), { en: "FROST CALM", kj: "霜凪", y: .86 });
        if (hit(t, .64, .02)) X.fx.flash = ["#efe9ff", .7]; if (hit(t, .8, .025)) X.fx.inv = "#d9ccff"; X.fx.rgb = hit(t, .8, .08) * 10;
        K.vignette(g, w, h, .6, "#05030c"); K.bars(g, w, h, 1 - lin(.9, 1, t));
    }
};

/* ---------- DOMA · Lotus Leaf Ice (Hasuha Kori): golden fans open, freezing mist, a giant ice lotus blooms behind the target ---------- */
function fan(g, x, y, R, ang, open) {
    g.save(); g.translate(x, y); g.rotate(ang); const sp = 1.7 * open, n = 13;
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, -Math.PI / 2 - sp / 2, -Math.PI / 2 + sp / 2); g.closePath(); const gr = g.createRadialGradient(0, 0, R * .2, 0, 0, R); gr.addColorStop(0, "#5a3a08"); gr.addColorStop(.3, "#f2c94c"); gr.addColorStop(.85, "#ffe8a0"); gr.addColorStop(1, "#c9902a"); g.fillStyle = gr; g.fill();
    g.save(); g.clip(); for (let i = 0; i < 3; i++) { const an = -Math.PI / 2 + (i - 1) * sp * .28; K.pool(g, Math.cos(an) * R * .62, Math.sin(an) * R * .62, R * .2, "#d81b4a", .7); } g.restore();
    g.strokeStyle = "#3a2200"; g.lineWidth = 2; for (let i = 0; i <= n; i++) { const an = -Math.PI / 2 - sp / 2 + sp * i / n; g.beginPath(); g.moveTo(Math.cos(an) * R * .14, Math.sin(an) * R * .14); g.lineTo(Math.cos(an) * R, Math.sin(an) * R); g.stroke(); }
    g.lineWidth = 3; g.beginPath(); g.arc(0, 0, R, -Math.PI / 2 - sp / 2, -Math.PI / 2 + sp / 2); g.stroke(); g.fillStyle = "#3a2200"; g.beginPath(); g.arc(0, 0, R * .06, 0, TAU); g.fill(); g.restore();
}
function lotus(g, x, y, R, p, rot, a = 1) {
    if (p <= 0) return; g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha *= a;
    for (let ly = 3; ly >= 0; ly--) { const n = 9 - ly, L = R * (1 - ly * .17) * K.oBack(lin(ly * .12, .5 + ly * .12, p)), open = .3 + .7 * K.oCub(lin(ly * .1, 1, p));
        for (let k = 0; k < n; k++) { g.save(); g.rotate((k / n) * Math.PI * open * 2 - Math.PI / 2 * open + ly * .2); const gr = g.createLinearGradient(0, 0, 0, -L); gr.addColorStop(0, "rgba(236,248,255,.95)"); gr.addColorStop(.6, ["rgba(150,205,250,.85)", "rgba(190,228,255,.85)", "rgba(170,215,252,.82)", "rgba(230,246,255,.85)"][ly]); gr.addColorStop(1, "rgba(255,255,255,.95)");
            g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(L * .42, -L * .3, L * .3, -L * .85, 0, -L); g.bezierCurveTo(-L * .3, -L * .85, -L * .42, -L * .3, 0, 0); g.fillStyle = gr; g.fill(); g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 1.2; g.stroke();
            g.strokeStyle = "rgba(90,150,215,.45)"; g.beginPath(); g.moveTo(0, -L * .1); g.lineTo(0, -L * .85); g.stroke(); g.restore(); } }
    K.glow(g, 0, 0, R * .4, "#cfeaff", .6 * p); K.glow(g, R * .1, -R * .2, R * .25, "#ffd6f0", .25 * p); g.restore();     // pale blue ice, a faint rainbow sheen like his eyes
}
const doma = {
    col: "#ff9ad0", ms: 7400,
    seal(g, X, a, r) { r = r || X.env.r; const c = mid(r); g.save(); g.globalAlpha = a; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([u, v], i) => lotus(g, c.x + u * r.w * .52, c.y + v * r.h * .55, Math.min(r.h, 60) * .7, 1, i)); K.iceBlock(g, r, .8, X.s, "#cfeaff"); g.restore(); },
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, r = K.stage(X, back(t)), c = mid(r);
        X.cue(.02, "whoosh", t); X.cue(.22, "open", t); X.cue(.3, "wind", t); X.cue(.52, "freeze", t); X.cue(.7, "freeze", t);
        K.sky(g, w, h, ["#1a0620", "#3f0f3c", "#12040c"]);
        for (let i = 0; i < 9; i++) { const x = ((hs(i + 2) * w * 1.6 + s * 40 * (.5 + hs(i))) % (w * 1.6)) - w * .3, y = h * (.15 + .7 * hs(i + 8)); K.pool(g, x, y, M * (.35 + .2 * hs(i)), i % 2 ? "#ffb6dd" : "#c8ecff", .14 + .12 * lin(.3, .5, t)); }   // freezing clouds
        K.drift(g, w, h, s, 80, 6, { up: 1, speed: .06, col: "#ffe4f3", size: 2.4, glow: 1, add: 1, a: .7 });
        if (t > .44) {
            g.save(); K.cam(g, X, { z: 1 + lin(.45, 1, t) * .06 * back(t), cx: c.x, cy: c.y, shake: hit(t, .52, .1) * 10 });
            lotus(g, c.x, c.y + r.h * .3, M * .44 * (.5 + .5 * back(t)), lin(.48, .74, t), Math.sin(s * .3) * .05, .85);          // the giant lotus behind
            for (let i = 0; i < 6; i++) { const p = lin(.5 + i * .025, .68 + i * .025, t), sx = c.x + (i - 2.5) * M * .14, sy = h * 1.02; g.save(); g.strokeStyle = "rgba(210,240,255,.9)"; g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); for (let k = 0; k <= 20 * p; k++) { const u = k / 20; g.lineTo(K.mix(sx, c.x + (i - 2.5) * r.w * .16, u) + Math.sin(u * 8 + i) * 18, K.mix(sy, c.y + r.h * .6, u)); } g.stroke(); g.restore(); }
            plate(g, X, r, ss(.44, .5, t), lin(.5, .6, t));
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([u, v], i) => lotus(g, c.x + u * r.w * .52, c.y + v * r.h * .55, Math.min(r.h, 60) * .7, lin(.64 + i * .03, .8 + i * .03, t), i));
            K.iceBlock(g, r, lin(.72, .86, t) * .8, s, "#cfeaff");
            g.restore();
        }
        const op = K.oBack(lin(.16, .28, t)) * (1 - lin(.5, .6, t));           // the two golden fans in pale hands
        if (op > 0) [-1, 1].forEach(sd => { const x = w / 2 + sd * w * .27, y = h * .98, a = sd * (.3 + .22 * Math.sin(s * 4)) * (1 - lin(.28, .4, t) * .5); fan(g, x, y - M * .06, M * .4, a, op); hand(g, x, y + M * .18, HS(X), a, "fist", { skin: "pale", flip: sd < 0, sleeve: { c: "#3c1230", s: "#200818", cuff: "#ffb0d8", len: 240 } }); });
        if (op > 0) for (let i = 0; i < 40; i++) { const u = (s * .5 + hs(i)) % 1, sd = i % 2 ? -1 : 1, x = w / 2 + sd * w * .27 * (1 - u) + (hs(i + 3) - .5) * M * .5 * u, y = h * .8 - u * h * .6; K.glow(g, x, y, M * .02, sd > 0 ? "#ffd0ec" : "#d4f2ff", .6 * (1 - u) * op); }
        K.cutIn(g, X, lin(0, .2, t), { y: .45, hh: .34, dir: -1, ang: -.12, kj: "血鬼術", name: "DOMA" });
        if (t > .3 && t < .56) K.slam(g, "粉凍り", w / 2, h * .2, M * .1, lin(.3, .56, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#5a0a3a", glow: "#ff9ad0" });
        K.title(g, X, lin(.6, 1, t), { en: "LOTUS LEAF ICE", kj: "蓮葉氷", sub: "DOMA · " + X.who, y: .86 });
        if (hit(t, .52, .02)) X.fx.inv = "#ffc8e6";
        K.vignette(g, w, h, .65, "#14020c"); K.bars(g, w, h, 1 - lin(.9, 1, t));
    }
};

/* ---------- HITSUGAYA · Hyorinmaru: "Sit upon the frozen heavens", the blade frosts over, an ice dragon coils out and strikes ---------- */
function dragon(g, P, u, M, s) {
    /* Hyorinmaru: a long serpentine ice dragon. Body = one tapered ribbon along the path P (tail -> head), dorsal spines,
       belly bands, then the head: long snout, swept-back horns, mane, open jaws with fangs, a glowing eye, whiskers */
    const span = .55, N = 64, pts = []; for (let k = 0; k <= N; k++) { const q = u - span * (1 - k / N); if (q >= 0) pts.push(P(q)); }
    const n = pts.length; if (n < 4) return; const W = M * .05;
    const sideOf = sg => pts.map((p, i) => { const a2 = pts[Math.min(n - 1, i + 1)], b2 = pts[Math.max(0, i - 1)], an = Math.atan2(a2[1] - b2[1], a2[0] - b2[0]), k = i / (n - 1), wd = W * (.12 + .88 * Math.sin(Math.min(1, k * 1.25) * Math.PI / 2)) * (k > .94 ? 1 - (k - .94) * 6 : 1); return [p[0] + Math.cos(an + sg * 1.5708) * wd, p[1] + Math.sin(an + sg * 1.5708) * wd, an, wd]; });
    const A = sideOf(-1), B = sideOf(1); g.save(); g.lineJoin = "round";
    for (let i = 4; i < n - 5; i += 3) { const [x, y, an, wd] = A[i], L2 = wd * 1.1 + M * .012; g.beginPath(); g.moveTo(x - Math.cos(an) * wd * .55, y - Math.sin(an) * wd * .55); g.lineTo(x + Math.cos(an - 1.5708) * L2 - Math.cos(an) * wd * 1.1, y + Math.sin(an - 1.5708) * L2 - Math.sin(an) * wd * 1.1); g.lineTo(x + Math.cos(an) * wd * .45, y + Math.sin(an) * wd * .45); g.closePath(); g.fillStyle = "#eaf8ff"; g.fill(); g.strokeStyle = "#2f74bf"; g.lineWidth = 1.6; g.stroke(); }   // dorsal spines
    g.beginPath(); A.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); for (let i = n - 1; i >= 0; i--) g.lineTo(B[i][0], B[i][1]); g.closePath();
    const hd = pts[n - 1], tl = pts[0], gr = g.createLinearGradient(tl[0], tl[1], hd[0], hd[1]); gr.addColorStop(0, "rgba(120,180,240,.75)"); gr.addColorStop(.5, "#bfe5ff"); gr.addColorStop(1, "#f2fbff");
    g.fillStyle = gr; g.fill(); g.strokeStyle = "#1f5a9a"; g.lineWidth = 2.6; g.stroke();
    g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = 1.4; g.beginPath(); A.forEach((q, i) => { const m2 = [(q[0] * 2 + B[i][0]) / 3, (q[1] * 2 + B[i][1]) / 3]; i ? g.lineTo(m2[0], m2[1]) : g.moveTo(m2[0], m2[1]); }); g.stroke();   // the light down its back
    g.strokeStyle = "rgba(40,100,170,.35)"; g.lineWidth = 1.2; for (let i = 3; i < n - 3; i += 2) { const m1 = [(A[i][0] + B[i][0]) / 2, (A[i][1] + B[i][1]) / 2]; g.beginPath(); g.moveTo(m1[0], m1[1]); g.lineTo(B[i][0], B[i][1]); g.stroke(); }   // belly bands
    for (let i = 0; i < n; i += 4) K.glow(g, pts[i][0], pts[i][1], W * 1.4, "#bfe6ff", .18);
    // the head
    const an = A[n - 1][2], r = M * .065; g.translate(hd[0], hd[1]); g.rotate(an); const ink = "#1f5a9a", jaw = .28 + .22 * Math.sin(s * 9);
    [-1, 1].forEach(sd => { g.beginPath(); g.moveTo(-r * .2, -r * .55); g.quadraticCurveTo(-r * 1.4, -r * (1.1 + sd * .3), -r * 2.8, -r * (1.6 + sd * .45)); g.quadraticCurveTo(-r * 1.6, -r * (.85 + sd * .2), -r * .7, -r * .35); g.closePath(); g.fillStyle = "#eef9ff"; g.fill(); g.strokeStyle = ink; g.lineWidth = 2; g.stroke(); });   // horns
    for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-r * (.3 + k * .3), -r * .5); g.lineTo(-r * (1.2 + k * .45), -r * (.2 + k * .25) + Math.sin(s * 5 + k) * r * .15); g.lineTo(-r * (.55 + k * .3), -r * .05); g.closePath(); g.fillStyle = "rgba(220,242,255,.9)"; g.fill(); g.strokeStyle = "#5a9ad8"; g.lineWidth = 1.2; g.stroke(); }   // the mane
    g.save(); g.rotate(jaw); g.beginPath(); g.moveTo(-r * .5, r * .15); g.lineTo(r * 2.1, r * .2); g.quadraticCurveTo(r * 1.2, r * .75, -r * .7, r * .6); g.closePath(); g.fillStyle = "#cfeaff"; g.fill(); g.strokeStyle = ink; g.lineWidth = 2.2; g.stroke();
    g.fillStyle = "#fff"; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(r * (.3 + i * .38), r * .2); g.lineTo(r * (.45 + i * .38), -r * .08); g.lineTo(r * (.6 + i * .38), r * .2); g.fill(); } g.restore();   // lower jaw + fangs
    g.beginPath(); g.moveTo(-r, -r * .65); g.quadraticCurveTo(r * .4, -r * .9, r * 1.5, -r * .5); g.lineTo(r * 2.7, -r * .12); g.quadraticCurveTo(r * 2.4, r * .1, r * 1.4, r * .08); g.lineTo(-r * .4, r * .25); g.quadraticCurveTo(-r * 1.1, r * .1, -r, -r * .65); g.closePath();
    g.fillStyle = "#f4fbff"; g.fill(); g.strokeStyle = ink; g.lineWidth = 2.6; g.stroke();
    g.fillStyle = "#fff"; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(r * (.5 + i * .4), r * .04); g.lineTo(r * (.65 + i * .4), r * .32); g.lineTo(r * (.8 + i * .4), r * .04); g.fill(); }   // upper fangs
    g.strokeStyle = "rgba(31,90,154,.6)"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(r * .2, -r * .55); g.quadraticCurveTo(r * 1.1, -r * .62, r * 2.2, -r * .25); g.stroke();   // brow ridge
    g.fillStyle = "#06204a"; g.beginPath(); g.ellipse(r * .55, -r * .38, r * .2, r * .1, -.25, 0, TAU); g.fill(); K.glow(g, r * .55, -r * .38, r * .55, "#5aa9ff", .95);
    g.strokeStyle = "rgba(230,248,255,.85)"; g.lineWidth = 1.6; [-1, 1].forEach(sd => { g.beginPath(); g.moveTo(r * 2.3, -r * .05); g.bezierCurveTo(r * 1.6, r * (.6 + sd * .3), r * .2, r * (1 + sd * .5) + Math.sin(s * 4 + sd) * r * .3, -r * 1.2, r * (.9 + sd * .6)); g.stroke(); });   // whiskers
    g.restore();
}
const hitsugaya = {
    col: "#5aa9ff", ms: 7600,
    seal(g, X, a, r) { r = r || X.env.r; const c = mid(r); g.save(); g.globalAlpha = a; K.iceBlock(g, r, 1, X.s, "#5aa9ff"); [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.2]].forEach(([u, v], i) => K.snowflake(g, c.x + u * r.w * .5, c.y + v * r.h * .5, Math.min(r.h, 50) * .5, 1, i, "rgba(235,250,255,.95)")); g.restore(); },
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, r = K.stage(X, back(t)), c = mid(r);
        X.cue(.02, "shing", t); X.cue(.2, "wind", t); X.cue(.42, "roar", t); X.cue(.72, "boom", t); X.cue(.73, "freeze", t);
        if (t < .17) { K.eyes(g, X, lin(0, .17, t), { tint: "#6fc0ff", ta: .3 }); K.column(g, "霜天に坐せ", w * .92, h * .12, M * .055, lin(.01, .15, t), { fill: "#e9f6ff", stroke: "#06204a", glow: "#5aa9ff", sw: 3 }); K.bars(g, w, h, 1); cutTo(X, t, .168); return; }
        const storm = lin(.17, .4, t);
        g.save(); K.cam(g, X, { z: 1 + lin(.4, .75, t) * .06, shake: hit(t, .42, .08) * 10 + hit(t, .72, .12) * 22 });
        K.sky(g, w, h, ["#020818", "#0a2550", "#0d2f5c"]);
        g.save(); g.translate(w / 2, h * .22); g.rotate(s * .25); for (let k = 0; k < 6; k++) { g.rotate(1.047); g.strokeStyle = "rgba(160,210,255," + (.12 + .1 * storm) + ")"; g.lineWidth = M * .05; g.beginPath(); g.arc(0, 0, M * (.2 + k * .12) * (1 + storm), 0, 2); g.stroke(); } g.restore();   // the storm vortex
        K.drift(g, w, h, s, 90, 4, { up: -1, speed: .12, col: "#e9f6ff", size: 2.4, sway: 60 });
        plate(g, X, r, ss(.5, .58, t), lin(.6, .72, t));
        const hx = w * .74, hy = h * 1.0, ang = -1.25 - .55 * K.oCub(lin(.17, .32, t)), bl = M * .78;          // first person: the blade rises, held out in front
        const tipx = hx + Math.cos(ang) * bl, tipy = hy + Math.sin(ang) * bl;
        K.katana(g, hx, hy, ang, bl, { blade: ["#f5fbff", "#b9dcf5", "#5c86b4"], glow: t > .25 ? "#9fd8ff" : null, s, guard: "#e9d36a", tsuba: "star4", chain: "crescent", wrap: "#1c3a6a", wrapLine: "#dfeaff" });   // Hyorinmaru: star guard, the chain and sickle
        g.save(); g.strokeStyle = "#c9a227"; g.lineWidth = 3; g.beginPath(); g.moveTo(hx - Math.cos(ang) * M * .18, hy - Math.sin(ang) * M * .18); g.quadraticCurveTo(hx + M * .08, hy + M * .02, hx + M * .02, hy + M * .2); g.stroke(); g.beginPath(); g.arc(hx + M * .02, hy + M * .24, M * .035, 3.6, 8.4); g.stroke(); g.restore();   // chain + crescent
        hand(g, hx + Math.cos(ang) * -M * .1, hy + Math.sin(ang) * -M * .1 + M * .02, HS(X), ang + 1.5708, "fist", { skin: "base", sleeve: { c: "#16161c", s: "#08080c", cuff: "#ffffff", len: 260 } });
        const fr = lin(.24, .4, t); if (fr > 0) for (let k = 0; k < 8; k++) { const q = K.mix(.15, 1, k / 8); if (q > fr) break; K.glow(g, K.mix(hx, tipx, q), K.mix(hy, tipy, q), M * .03, "#bfe6ff", .7); }
        const du = K.ioCub(lin(.42, .72, t));                                // the dragon: out of the blade, a big swoop through the middle, then down on the target
        if (du > 0 && t < .8) { const P = u => { const q = 1 - u; const x = q * q * q * tipx + 3 * q * q * u * (w * .05) + 3 * q * u * u * (w * .95) + u * u * u * c.x, y = q * q * q * tipy + 3 * q * q * u * (h * .95) + 3 * q * u * u * (h * .8) + u * u * u * c.y; return [x + Math.sin(u * 16) * M * .03, y + Math.cos(u * 13) * M * .03]; }; dragon(g, P, du, M, s); }
        K.sparks(g, c.x, c.y, lin(.72, .88, t), 40, 3, { speed: M * .9, col: "#bfe6ff", grav: M * .4 }); K.shock(g, c.x, c.y, lin(.72, .9, t), M * .9, "#9fd8ff", 40);
        if (t > .74) { for (let i = 0; i < 9; i++) { const an = i / 9 * TAU, d = K.oBack(lin(.74 + i * .01, .86 + i * .01, t)) * back(t); K.spire(g, c.x + Math.cos(an) * r.w * .5 * d, c.y + r.h * .6 + Math.sin(an) * r.h * .2, M * .18 * d, M * .045, d, Math.cos(an) * .5); } hitsugaya.seal(g, X, lin(.8, .9, t), r); }
        g.restore();
        if (hit(t, .72, .025)) X.fx.inv = "#9fd8ff"; X.fx.rgb = hit(t, .72, .08) * 12;
        if (t > .42 && t < .7) K.slam(g, "氷輪丸", w * .32, h * .62, M * .12, lin(.42, .7, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#06204a", glow: "#5aa9ff" });
        K.title(g, X, lin(.78, 1, t), { en: "HYOTEN HYAKKASO", kj: "氷天百華葬", y: .86 });
        K.vignette(g, w, h, .55, "#00040c"); K.bars(g, w, h, 1 - lin(.92, 1, t));
    }
};

/* ---------- HIT · Time Skip: a ticking clock, jump cuts, his figure in moments that never happened, the Time Cage closes ---------- */
function cage(g, r, p, col = "#b388ff") {
    if (p <= 0) return; const x0 = r.x - 14, y0 = r.y - 14, W = r.w + 28, H = r.h + 28, d = Math.min(r.w, r.h * 3) * .18; g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = col; g.lineWidth = 2.4;
    g.globalAlpha *= p; g.strokeRect(x0, y0, W, H); g.strokeRect(x0 + d, y0 - d, W, H); [[0, 0], [W, 0], [0, H], [W, H]].forEach(([a, b]) => { g.beginPath(); g.moveTo(x0 + a, y0 + b); g.lineTo(x0 + a + d, y0 + b - d); g.stroke(); });
    for (let i = 1; i < 9; i++) { g.beginPath(); g.moveTo(x0 + W * i / 9, y0); g.lineTo(x0 + W * i / 9, y0 + H); g.stroke(); }
    g.fillStyle = "rgba(140,90,240,.14)"; g.fillRect(x0, y0, W, H); g.fillStyle = "rgba(170,120,255,.1)"; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + d, y0 - d); g.lineTo(x0 + W + d, y0 - d); g.lineTo(x0 + W, y0); g.closePath(); g.fill();   // the lid of the cube
    g.font = "700 " + Math.max(10, d * .6) + "px " + K.F_UI; g.fillStyle = col; g.textAlign = "center"; ["0.5", "0.5", "0.5"].forEach((s2, i) => g.fillText(s2 + "s", x0 + W * (.25 + i * .25), y0 + H + d * .9)); g.restore();
}
const HIT = { l: "#e6d0ff", b: "#a97ce2", s: "#774bb4", d: "#452274", ink: "#170628", nail: "#efe2ff" };     // Hit's purple skin
const hitScene = {
    col: "#b388ff", ms: 7200,
    seal: (g, X, a, r) => cage(g, r || X.env.r, a),
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, r = K.stage(X, back(t)), c = mid(r), SK = [.22, .3, .37, .44, .5];
        X.cue(.01, "tick", t); X.cue(.08, "tick", t); X.cue(.15, "tick", t); SK.forEach(a => X.cue(a, "skip2", t)); X.cue(.62, "punch", t); X.cue(.7, "chime", t);
        K.sky(g, w, h, ["#0c0418", "#1a0b30", "#06020c"]); K.halftone(g, w, h, "rgba(179,136,255,.25)", .4, 10);
        const cr = M * .32, ccx = w / 2, ccy = h * .5, jumps = SK.filter(a => t >= a).length, ang = -Math.PI / 2 + Math.floor(s * 2) / 2 * .52 + jumps * .9;        // the clock: ticks, then leaps
        g.save(); g.globalAlpha = .35; g.strokeStyle = "#b388ff"; g.lineWidth = 3; g.beginPath(); g.arc(ccx, ccy, cr, 0, TAU); g.stroke(); for (let i = 0; i < 60; i++) { const a = i / 60 * TAU, l = i % 5 ? .95 : .88; g.beginPath(); g.moveTo(ccx + Math.cos(a) * cr * l, ccy + Math.sin(a) * cr * l); g.lineTo(ccx + Math.cos(a) * cr, ccy + Math.sin(a) * cr); g.stroke(); }
        g.lineWidth = 5; g.beginPath(); g.moveTo(ccx, ccy); g.lineTo(ccx + Math.cos(ang) * cr * .85, ccy + Math.sin(ang) * cr * .85); g.stroke(); g.restore();
        if (t < .2) K.cutIn(g, X, lin(0, .2, t), { y: .5, hh: .3, dir: 1, ang: -.05, kj: "時飛ばし", name: "HIT" });
        plate(g, X, r, ss(.18, .24, t), jumps / SK.length * .6);
        for (let k = 0; k < jumps; k++) { if (k < jumps - 1 && t > .56) continue; const x = w * (.15 + .7 * hs(k * 7 + 1)), y = h * (.42 + .3 * hs(k * 3 + 2)), W = M * .26, H = M * .36;   // the assassin, standing where he never walked
            g.save(); g.globalAlpha = k === jumps - 1 ? 1 : .25; g.beginPath(); g.rect(x - W / 2, y - H / 2, W, H); g.clip(); K.art(g, X, x - W / 2, y - H / 2, W, H, 1.1, 0, .2); g.globalCompositeOperation = "color"; g.fillStyle = "rgba(120,70,220,.55)"; g.fillRect(x - W / 2, y - H / 2, W, H); g.restore();
            g.strokeStyle = "#b388ff"; g.lineWidth = 2; g.strokeRect(x - W / 2, y - H / 2, W, H); K.txt(g, "0.5秒", x, y + H / 2 + M * .03, M * .03, { font: K.F_JP, weight: "400", fill: "#e6d9ff", sw: 2 }); }
        SK.forEach((a, i) => { const q = lin(a, a + .035, t); if (q > 0 && q < 1) { X.fx.glitch = 1 - q; X.fx.rgb = (1 - q) * 14; K.flash(g, w, h, "#e6d9ff", (1 - q) * .35); }
            const hq = lin(a + .01, a + .07, t); if (hq > 0 && hq < 1) { const hx2 = c.x + (hs(i + 70) - .5) * r.w * .8, hy2 = c.y + (hs(i + 71) - .5) * r.h * .6; K.shock(g, hx2, hy2, hq, M * .16, "#d9c6ff", 8); K.sparks(g, hx2, hy2, hq, 10, i * 9, { speed: M * .25, col: "#e6d9ff" }); fist(g, hx2 + (1 - hq) * M * .2 * (i % 2 ? 1 : -1), hy2 + (1 - hq) * M * .1, M * .0011, (i % 2 ? -.4 : .4), { skin: HIT, aura: "#b388ff" }); } });   // the skipped blows land, one per beat
        if (t > .56) {                                                       // the strike from nowhere, then the cage
            const q = lin(.56, .64, t), fx = K.mix(w * .5, c.x, K.oExpo(q)), fy = K.mix(h * 1.2, c.y + M * .04, K.oExpo(q)), sc = M * K.mix(.009, .0035, K.oExpo(q));
            if (t < .7) { K.streaks(g, w, h, s, Math.atan2(c.y - h, c.x - w / 2), { n: 50, col: "#d9c6ff", a: .5 * (1 - q), speed: 5 }); fist(g, fx, fy, sc, 0, { skin: HIT, aura: "#b388ff" }); }
            K.shock(g, c.x, c.y, lin(.63, .78, t), M * .6, "#b388ff", 22); K.sparks(g, c.x, c.y, lin(.63, .76, t), 24, 9, { speed: M * .6, col: "#d9c6ff" });
            const cp = lin(.66, .8, t); [[0, 0], [w, 0], [0, h], [w, h]].forEach(([x, y], i) => { const tx = i % 2 ? r.x + r.w + 14 : r.x - 14, ty = i > 1 ? r.y + r.h + 14 : r.y - 14; g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = "#b388ff"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, y); g.lineTo(K.mix(x, tx, cp), K.mix(y, ty, cp)); g.stroke(); g.restore(); });
            cage(g, r, lin(.76, .86, t));
            if (hit(t, .63, .02)) X.fx.inv = "#b388ff";
        }
        K.title(g, X, lin(.68, 1, t), { en: "TIME CAGE", kj: "時の檻", y: .84 });
        K.vignette(g, w, h, .7, "#04010a"); K.bars(g, w, h, 1 - lin(.92, 1, t));
    }
};

/* ---------- JULIUS · Chrono Stasis: the grimoire opens, a golden clock circle turns, then EVERYTHING stops and drains of colour ---------- */
const ROMAN = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
function clockCircle(g, x, y, R, spin, col) {
    g.save(); g.translate(x, y); g.strokeStyle = col; g.lineWidth = 2; g.globalCompositeOperation = "lighter";
    [1, .82, .62, .4].forEach((k, i) => { g.save(); g.rotate((i % 2 ? -1 : 1) * spin * (1 - i * .2)); g.beginPath(); g.arc(0, 0, R * k, 0, TAU); g.stroke();
        const n = [12, 24, 8, 6][i]; for (let j = 0; j < n; j++) { const a = j / n * TAU; g.beginPath(); g.moveTo(Math.cos(a) * R * k * .92, Math.sin(a) * R * k * .92); g.lineTo(Math.cos(a) * R * k, Math.sin(a) * R * k); g.stroke(); }
        if (i === 0) { g.font = "700 " + (R * .09) + "px " + K.F_UI; g.fillStyle = col; g.textAlign = "center"; g.textBaseline = "middle"; ROMAN.forEach((n2, j) => { const a = j / 12 * TAU - Math.PI / 2; g.fillText(n2, Math.cos(a) * R * .87, Math.sin(a) * R * .87); }); }
        if (i === 2) for (let j = 0; j < 8; j++) { const a = j / 8 * TAU; g.strokeRect(Math.cos(a) * R * k - 5, Math.sin(a) * R * k - 5, 10, 10); }
        g.restore(); });
    g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(spin * 4 - 1.57) * R * .7, Math.sin(spin * 4 - 1.57) * R * .7); g.stroke(); g.lineWidth = 7; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(spin * .4 - 1.57) * R * .45, Math.sin(spin * .4 - 1.57) * R * .45); g.stroke();
    g.restore();
}
function stasis(g, r, a) {
    if (a <= 0) return; const c = mid(r), R = Math.hypot(r.w, r.h) * .62; g.save(); g.globalAlpha *= a;
    g.fillStyle = "rgba(150,150,160,.32)"; g.fillRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12); clockCircle(g, c.x, c.y, R, 2.2, "#ffe27a"); g.restore();
}
const julius = {
    col: "#ffe27a", ms: 7400,
    seal: (g, X, a, r) => stasis(g, r || X.env.r, a),
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, r = K.stage(X, back(t)), c = mid(r), stop = t >= .55, st = stop ? .55 * X.main / 1000 : s;   // after the stop, time is frozen
        X.cue(.02, "flip", t); X.cue(.06, "flip", t); X.cue(.1, "flip", t); X.cue(.2, "charge", t); X.cue(.55, "chime", t); X.cue(.56, "boom", t);
        K.sky(g, w, h, ["#0a0c22", "#151a40", "#05060f"]); K.drift(g, w, h, st, 60, 3, { up: 1, speed: .05, col: "#ffe9a0", size: 2.4, glow: 1, add: 1 });
        const R = M * .44 * K.oBack(lin(.18, .34, t)); if (R > 0) clockCircle(g, w / 2, h * .46, R, st * (stop ? 1 : 1 + lin(.3, .55, t) * 4), "#ffe27a");
        if (t < .3) {                                                        // the grimoire, pages racing
            const op = K.oBack(lin(0, .12, t)), bx = w / 2, by = h * .74, bw = M * .4, bh = M * .28;
            g.save(); g.translate(bx, by); g.scale(op, op);
            [-1, 1].forEach(sd => { g.save(); g.scale(sd, 1); g.beginPath(); g.moveTo(0, -bh / 2); g.quadraticCurveTo(bw * .25, -bh * .6, bw / 2, -bh / 2 + 6); g.lineTo(bw / 2, bh / 2); g.quadraticCurveTo(bw * .25, bh * .4, 0, bh / 2); g.closePath(); g.fillStyle = "#f6ecd2"; g.fill(); g.strokeStyle = "#5a3a10"; g.lineWidth = 2; g.stroke();
                g.strokeStyle = "rgba(90,58,16,.35)"; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(bw * .08, -bh * .3 + i * bh * .1); g.lineTo(bw * .42, -bh * .28 + i * bh * .1); g.stroke(); } g.restore(); });
            for (let i = 0; i < 5; i++) { const q = (s * 3 + i / 5) % 1, a = Math.PI * q; g.save(); g.transform(Math.cos(a), 0, 0, 1, 0, 0); g.fillStyle = "rgba(250,244,226," + (1 - q * .5) + ")"; g.fillRect(0, -bh / 2, bw / 2, bh); g.strokeStyle = "rgba(90,58,16,.4)"; g.strokeRect(0, -bh / 2, bw / 2, bh); g.restore(); }
            g.restore();
            K.glow(g, bx, by - bh * .4, M * .25, "#ffe27a", .5 * op); for (let i = 0; i < 12; i++) { const u = (s * .6 + i / 12) % 1; K.txt(g, ROMAN[i], bx + (hs(i) - .5) * bw, by - bh * .5 - u * h * .4, M * .03, { font: K.F_UI, fill: "#ffe9a0", sw: 0, glow: "#ffe27a" }); }
            [-1, 1].forEach(sd => hand(g, bx + sd * bw * .56, by + bh * .62, HS(X), sd * .45, "relax", { view: "palm", flip: sd < 0, skin: "base", sleeve: { c: "#f4efe6", s: "#c9bfa6", cuff: "#d9a82a", len: 220 } }));
        }
        K.cutIn(g, X, lin(.26, .5, t), { y: .3, hh: .26, dir: 1, ang: -.06, kj: "時間魔法", name: "JULIUS" });
        plate(g, X, r, ss(.4, .5, t), lin(.5, .6, t));
        const hg = K.oBack(lin(.34, .44, t)), hx = c.x + Math.min(r.w * .7, M * .3), hy = c.y + M * .05, HG = M * .07 * hg;       // the hourglass: sand falls... then hangs
        if (hg > 0) { g.save(); g.strokeStyle = "#fff"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(hx - HG, hy - HG * 1.7); g.lineTo(hx + HG, hy - HG * 1.7); g.lineTo(hx + 3, hy); g.lineTo(hx + HG, hy + HG * 1.7); g.lineTo(hx - HG, hy + HG * 1.7); g.lineTo(hx - 3, hy); g.closePath(); g.stroke(); g.fillStyle = "#ffe27a";
            for (let i = 0; i < 20; i++) { const u = (st * 1.2 + i / 20) % 1; g.fillRect(hx - 1.5 + (hs(i) - .5) * 4, hy + u * HG * 1.5, 3, 3); } g.restore(); }
        if (stop) {                                                          // STASIS: the dome spreads, colour drains from everything
            const q = lin(.55, .8, t), R2 = Math.hypot(w, h) * K.oExpo(q); g.save(); g.beginPath(); g.arc(c.x, c.y, R2, 0, TAU); g.clip(); g.globalCompositeOperation = "saturation"; g.fillStyle = "rgba(0,0,0," + (.85 * q) + ")"; g.fillRect(0, 0, w, h); g.globalCompositeOperation = "source-over"; g.fillStyle = "rgba(255,226,122,.07)"; g.fillRect(0, 0, w, h); g.restore();
            K.shock(g, c.x, c.y, q, Math.hypot(w, h), "#ffe27a", 30); stasis(g, r, lin(.62, .76, t));
            if (hit(t, .55, .03)) X.fx.inv = "#ffe27a";
        }
        if (t > .55) K.slam(g, "時よ  止まれ", w / 2, h * .62, M * .08, lin(.55, .8, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#4a3a00", glow: "#ffe27a" });
        K.title(g, X, lin(.7, 1, t), { en: "CHRONO STASIS", kj: "時間魔法", y: .86 });
        K.vignette(g, w, h, .6, "#03040c"); K.bars(g, w, h, 1 - lin(.92, 1, t));
    }
};

/* ---------- KURAPIKA · Emperor Time -> Chain Jail: the Scarlet Eyes ignite, five chains leave five fingers, wrap the target and lock ---------- */
/* the five chains of his right hand, by finger [index, middle, ring, pinky, thumb]: Steal Chain (syringe), Chain Jail (hook),
   Dowsing Chain (pendulum), Judgment Chain (blade), Holy Chain (cross) */
const KCH = ["syringe", "hook", "pendulum", "blade", "cross"];
function chainTip(g, x, y, an, kind, sz) {
    g.save(); g.translate(x, y); g.rotate(an); g.fillStyle = "#f2c94c"; g.strokeStyle = "#5a3a00"; g.lineWidth = 2;
    if (kind === "pendulum") { g.beginPath(); g.moveTo(sz * 1.6, 0); g.lineTo(0, -sz * .7); g.lineTo(-sz * .5, 0); g.lineTo(0, sz * .7); g.closePath(); g.fill(); g.stroke(); }
    else if (kind === "blade") { g.beginPath(); g.moveTo(sz * 2.2, 0); g.lineTo(0, -sz * .5); g.lineTo(0, sz * .5); g.closePath(); g.fill(); g.stroke(); }
    else if (kind === "syringe") { g.fillRect(-sz * .2, -sz * .35, sz * 1.4, sz * .7); g.strokeRect(-sz * .2, -sz * .35, sz * 1.4, sz * .7); g.beginPath(); g.moveTo(sz * 1.2, 0); g.lineTo(sz * 2.2, 0); g.stroke(); }
    else if (kind === "cross") { g.fillRect(-sz * .15, -sz * .22, sz * 1.9, sz * .44); g.strokeRect(-sz * .15, -sz * .22, sz * 1.9, sz * .44); g.fillRect(sz * .9, -sz * .75, sz * .44, sz * 1.5); g.strokeRect(sz * .9, -sz * .75, sz * .44, sz * 1.5); }
    else if (kind === "hook") { g.lineWidth = sz * .35; g.strokeStyle = "#f2c94c"; g.beginPath(); g.arc(sz * .6, 0, sz * .6, Math.PI, Math.PI * 2.6); g.stroke(); }
    else { g.beginPath(); g.arc(sz * .7, 0, sz * .7, 0, TAU); g.fill(); g.stroke(); g.fillStyle = "#5a3a00"; g.fillRect(sz * .5, -sz * .5, sz * .4, sz); }
    K.glow(g, sz * .6, 0, sz * 2, "#f2c94c", .5); g.restore();
}
function bind(g, r, a) {
    if (a <= 0) return; const c = mid(r); g.save(); g.globalAlpha *= a;
    for (let l = 0; l < 3; l++) K.chain(g, u => [c.x + Math.cos(u * TAU + l) * (r.w * .56 + l * 6), c.y + Math.sin(u * TAU + l) * (r.h * .62 + l * 5) + Math.sin(u * TAU * 3) * 4], 34, 1, 7, "#f2c94c");
    g.strokeStyle = "#f2c94c"; g.lineWidth = 3; g.beginPath(); g.arc(c.x, c.y, Math.min(r.h, 40) * .5, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(c.x - 10, c.y); g.lineTo(c.x + 10, c.y); g.moveTo(c.x, c.y - 12); g.lineTo(c.x, c.y + 12); g.stroke(); g.restore();
}
const kurapika = {
    col: "#f2c94c", ms: 7400,
    seal: (g, X, a, r) => bind(g, r || X.env.r, a),
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, s = T.s, r = K.stage(X, back(t)), c = mid(r), RED = "#ff2a4a";
        X.cue(.03, "heartbeat", t); X.cue(.12, "charge", t); X.cue(.32, "chain", t); X.cue(.5, "chain", t); X.cue(.68, "slam", t);
        if (t < .2) { const p = lin(0, .2, t); K.eyes(g, X, p, { tint: "#ff2a4a", ta: .3 * lin(.3, .7, p) }); K.column(g, "緋の眼", w * .08, h * .2, M * .07, lin(.1, .6, p), { fill: "#fff", stroke: "#4a0010", glow: RED, sw: 3 }); K.bars(g, w, h, 1); cutTo(X, t, .195, "#ffd0d8"); return; }
        K.sky(g, w, h, ["#06081a", "#121a3a", "#050610"]); K.vignette(g, w, h, .7, "#3a0010", .2);
        g.save(); K.cam(g, X, { z: 1 + lin(.2, .5, t) * .04, shake: hit(t, .68, .1) * 14 });
        plate(g, X, r, ss(.3, .38, t), lin(.6, .7, t));
        const sz = HS(X), hx = w * .5, hy = h * 1.12;                        // first person: the right hand, a chain from every fingertip
        const tips = handTips("spread").map(([a, b]) => [hx + a * sz, hy + b * sz]);
        const fly = K.ioCub(lin(.32, .62, t)), wrap = lin(.58, .74, t);
        tips.forEach((tp, k) => { const tx = c.x + (k - 2) * r.w * .18, ty = c.y + (k % 2 ? 1 : -1) * r.h * .3, mx = K.mix(tp[0], tx, .5) + (k - 2) * M * .1, my = K.mix(tp[1], ty, .5) + M * (k % 2 ? .1 : -.06) + Math.sin(s * 3 + k) * 14 * (1 - fly), reach = Math.max(.16, fly);
            const pt = u => [K.bez2(tp[0], mx, tx, u * reach), K.bez2(tp[1], my, ty, u * reach)];
            g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = "rgba(242,201,76,.25)"; g.lineWidth = M * .02; g.beginPath(); for (let i = 0; i <= 20; i++) { const q = pt(i / 20); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.stroke(); g.restore();
            K.chain(g, pt, 30, 1, M * (k === 1 ? .02 : .015), k === 1 ? "#ffd75a" : "#e8bf48"); const e = pt(1), e2 = pt(.97); chainTip(g, e[0], e[1], Math.atan2(e[1] - e2[1], e[0] - e2[0]), KCH[k], M * (k === 1 ? .028 : .02)); });   // the middle finger's Chain Jail is the one that binds
        hand(g, hx, hy, sz, 0, "spread", { skin: "pale", sleeve: { c: "#1a2250", s: "#0c1030", cuff: "#f2c94c", len: 260 } });
        if (wrap > 0) bind(g, r, wrap);
        K.sparks(g, c.x, c.y, lin(.68, .82, t), 30, 4, { speed: M * .5, col: "#f2c94c" }); K.shock(g, c.x, c.y, lin(.68, .84, t), M * .5, "#f2c94c", 20);
        g.restore();
        K.cutIn(g, X, lin(.2, .44, t), { y: .62, hh: .26, dir: -1, ang: .06, kj: "絶対時間", name: "KURAPIKA" });
        if (hit(t, .68, .02)) X.fx.inv = "#ff9aa8";
        K.title(g, X, lin(.66, 1, t), { en: "CHAIN JAIL", kj: "束縛する中指の鎖", sub: "EMPEROR TIME · KURAPIKA", y: .86 });
        K.bars(g, w, h, 1 - lin(.92, 1, t));
    }
};

/* ---------- DIO · ZA WARUDO, first person: arms crossed in an X before his chest (yellow sleeves), thrown open on the scream's peak;
   reality is overwritten in gold with purple/green interference and holographic tearing, then everything slows to a stop in grey.
   The grey does not come back here: the page itself stays grey (game.js, .zw-veil) until the frozen player's 2 turns are over. ---------- */
function knife(g, x, y, an, L) {
    g.save(); g.translate(x, y); g.rotate(an); g.lineJoin = "round";
    const gr = g.createLinearGradient(0, -L * .1, 0, L * .1); gr.addColorStop(0, "#ffffff"); gr.addColorStop(.5, "#a8acb8"); gr.addColorStop(1, "#4a4e5a");
    g.beginPath(); g.moveTo(L, 0); g.quadraticCurveTo(L * .4, -L * .13, 0, -L * .09); g.lineTo(0, L * .07); g.quadraticCurveTo(L * .5, L * .06, L, 0); g.fillStyle = gr; g.fill(); g.strokeStyle = "#111"; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = "#c9a227"; g.fillRect(-L * .04, -L * .16, L * .05, L * .32); g.fillStyle = "#2a1a0a"; g.fillRect(-L * .5, -L * .06, L * .46, L * .12); g.strokeRect(-L * .5, -L * .06, L * .46, L * .12); g.restore();
}
const DIO_SLEEVE = { c: "#f4cb2e", s: "#b8880e", cuff: "#2c6a3a", len: 640, w: 64 };
const ZW = { cross: .2, open: .245, gold: .26, gray: .42, still: .62 };          // the beats (scene t), pinned to the voice in engine.js SYNC
/* time that runs normally, then brakes smoothly to a dead stop between ZW.gray and ZW.still (first derivative 1 → 0) */
const dioSlow = t => { if (t < ZW.gray) return t; const u = Math.min(1, (t - ZW.gray) / (ZW.still - ZW.gray)); return ZW.gray + (ZW.still - ZW.gray) * (u - u * u / 2); };
const dio = {
    col: "#ffd84a", ms: 7600, mainPlus: 1500, breath: t => t < ZW.gray,
    begin() { document.dispatchEvent(new CustomEvent("zawarudo", { detail: "start" })); },
    tailStart() { document.dispatchEvent(new CustomEvent("zawarudo", { detail: "stopped" })); },
    seal(g, X, a, r) { r = r || X.env.r; if (a <= 0) return; g.save(); g.globalAlpha = a; g.strokeStyle = "#e8e8e8"; g.lineWidth = 4; g.shadowColor = "#ffffff"; g.shadowBlur = 20; g.strokeRect(r.x - 9, r.y - 9, r.w + 18, r.h + 18); g.shadowBlur = 0; g.fillStyle = "rgba(255,255,255,.1)"; g.fillRect(r.x - 9, r.y - 9, r.w + 18, r.h + 18); g.restore(); },
    tail(g, X, T) {                                                     // still grey: the snapshot dissolves into the (grey) table, the victim's plate is sealed
        const a = 1 - K.ss(.35, 1, T.tt); X.reveal(T.tt, .3); dio.seal(g, X, a);
        K.slam(g, X.env.toName + " · TIME STOPPED ×2", X.w / 2, Math.min(X.h * .5, X.env.r.y + X.env.r.h + X.M * .12), X.M * .055, K.lin(0, 1, T.tt), { fill: "#fff", stroke: "#111", glow: "#bbbbbb", from: 1.2 });
    },
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, G = "#ffd84a", r = K.stage(X, 0), c = mid(r);
        const st = dioSlow(t), sM = st * X.main / 1000;                  // slowed clock for everything that moves
        X.cue(.0, "rumble", t); X.cue(ZW.open - .01, "boom", t); X.cue(ZW.open, "shing", t); X.cue(ZW.gold, "chime", t);
        [ZW.gray, ZW.gray + .05, ZW.gray + .11, ZW.gray + .19].forEach(a => X.cue(a, "tick", t));   // the clock, ticking slower and slower
        const open = K.oBack(lin(ZW.cross, ZW.open, t)), tense = lin(.04, ZW.cross, t) * (1 - lin(ZW.cross, ZW.open, t)), live = 1 - lin(ZW.gray, ZW.still, t);
        const gold = lin(ZW.open, ZW.gold + .04, t) * (1 - lin(ZW.gray + .04, ZW.still, t)), holo = K.bell(t, ZW.gold + .06, ZW.still - .02), grey = ss(ZW.gray, ZW.still, t);
        g.save(); K.cam(g, X, { shake: tense * 4 + hit(t, ZW.open, .06) * 26, z: 1 + hit(t, ZW.open, .1) * .05 + (1 - grey) * .0 });
        // the world in front of DIO: night, a golden floor running to the horizon, the next player's plate, dust in the air
        K.sky(g, w, h, ["#0d0716", "#24133a", "#3a1e2a"]);
        K.radial(g, w / 2, h * .55, M * 1.1, [[0, "rgba(255,190,80,.22)"], [.5, "rgba(120,40,140,.12)"], [1, "rgba(0,0,0,0)"]]);
        g.save(); g.strokeStyle = "rgba(255,210,110,.22)"; g.lineWidth = 1.5; const hz = h * .58;
        for (let i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(w / 2 + i * M * .02, hz); g.lineTo(w / 2 + i * M * .3, h); g.stroke(); }
        for (let j = 1; j < 9; j++) { const y = hz + Math.pow(((j + (sM * .6) % 1) / 9), 2) * (h - hz); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.restore();
        plate(g, X, r, 1, open * .6);
        g.save(); g.fillStyle = "#ffe9b0"; for (let i = 0; i < 90; i++) { const x = (hs(i) * w + sM * (8 + 18 * hs(i + 7))) % w, y = (hs(i + 3) * h - sM * (10 + 30 * hs(i + 9)) % h + h) % h; g.globalAlpha = .25 + .45 * hs(i + 4); g.fillRect(x, y, 2 + hs(i) * 2, 2 + hs(i) * 2); } g.restore();   // dust: drifts, then hangs
        // ゴゴゴ while the arms are crossed
        if (t < ZW.open + .04) "ゴゴゴゴ".split("").forEach((ch, i) => { const q = lin(.01 + i * .035, .08 + i * .035, t) * (1 - lin(ZW.open, ZW.open + .04, t)); if (q <= 0) return; g.save(); g.globalAlpha = q; K.txt(g, ch, w * (.12 + (i % 2) * .76), h * (.22 + i * .13) + Math.sin(sM * 9 + i) * 3, M * .1, { font: K.F_JP, weight: "400", fill: "#d9a6ff", stroke: "#2a0a3a", rot: (i % 2 ? .15 : -.15), sw: 4 }); g.restore(); });
        // the knives: thrown the instant the world turns, braking to a stop in mid-air
        for (let i = 0; i < 12; i++) {
            const t0 = ZW.open + .02 + i * .012, q = K.oCub(Math.max(0, Math.min(1, (st - t0) / .2))); if (st < t0) continue;
            const sx = w * (.5 + (hs(i + 20) - .5) * .5), sy = h * 1.1, tx = c.x + (hs(i + 50) - .5) * r.w * 1.4, ty = c.y + (hs(i + 60) - .5) * r.h * 2;
            knife(g, K.mix(sx, tx, q * .85), K.mix(sy, ty, q * .85), Math.atan2(ty - sy, tx - sx), M * (.06 + .03 * hs(i)) * (1.6 - q * .7));
        }
        // gold aura rising off DIO while he holds the pose
        if (tense > 0 || open > 0) { g.save(); g.globalCompositeOperation = "lighter"; for (let i = 0; i < 26; i++) { const u = (hs(i) + sM * (.25 + .2 * hs(i + 2))) % 1, x = w * (.15 + .7 * hs(i + 5)) + Math.sin(sM * 3 + i) * 12, y = h * (1.05 - u * .9); g.globalAlpha = Math.sin(u * Math.PI) * .5 * (tense + open * live) ; K.glow(g, x, y, M * (.02 + .02 * hs(i + 1)), G, 1); } g.restore(); }
        // the arms, first person: crossed X (right arm over left), then thrown wide; sleeves run out of the bottom of the frame
        const jit = tense * live, tr = k => (hs(Math.floor(sM * 40) + k) - .5) * M * .006 * jit;
        const HSZ = M * .0026, arm = (side, top) => {                     // side 1 = right arm, -1 = left (mirrored)
            const cx0 = w / 2 - side * w * (.17 - .02 * tense), cy0 = h * (.46 + .02 * tense), a0 = -side * (.95 + .08 * tense);
            const cx1 = w / 2 + side * w * .36, cy1 = h * .6, a1 = side * .5;
            const x = K.mix(cx0, cx1, open) + tr(side * 3), y = K.mix(cy0, cy1, open) + tr(side * 5) + Math.sin(open * Math.PI) * -h * .06, a = K.mix(a0, a1, open);
            hand(g, x, y, HSZ * (1 + .08 * Math.sin(open * Math.PI)), a, open > .55 ? "spread" : "claw", { view: "back", skin: "pale", flip: side < 0, sleeve: DIO_SLEEVE });
        };
        if (open < .5) { arm(-1); arm(1); } else { arm(1); arm(-1); }
        if (open > 0 && open < 1) K.streaks(g, w, h, sM, 0, { n: 30, col: "#fff2b0", a: .3 * (1 - open), speed: 6 });
        g.restore();
        // the shout: the lettering slams on the peak, shock ring from DIO's chest
        K.shock(g, w / 2, h * .62, lin(ZW.open - .005, ZW.open + .1, t), M * 1.4, G, 40);
        if (t > ZW.open - .02 && t < ZW.gray + .06) K.slam(g, "ザ・ワールド!!", w / 2, h * .2, M * .13, lin(ZW.open - .02, ZW.gray + .06, t), { font: K.F_JP, weight: "400", fill: "#fff", stroke: "#3a2600", glow: G, from: 2.2, ghost: 1 });
        // reality overwritten: the inverted sphere, gold, purple/green interference, holographic tearing
        const sp = lin(ZW.open, ZW.gold + .1, t);
        if (sp > 0 && sp < 1) { const R = Math.hypot(w, h) * K.oCub(sp) * .75; g.save(); g.beginPath(); g.arc(w / 2, h * .55, R, 0, TAU); if (sp > .45) g.arc(w / 2, h * .55, R * lin(.45, 1, sp) * .96, 0, TAU, true); g.clip(); g.globalCompositeOperation = "difference"; g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.restore(); }
        if (gold > 0) {
            g.save(); g.globalCompositeOperation = "color"; g.globalAlpha = gold * .85; const gg = g.createLinearGradient(0, 0, w, h); gg.addColorStop(0, "#ffd400"); gg.addColorStop(.5, "#ffb000"); gg.addColorStop(1, "#ffe86a"); g.fillStyle = gg; g.fillRect(0, 0, w, h); g.restore();
            g.save(); g.globalCompositeOperation = "color"; for (let i = 0; i < 7; i++) { const y0 = ((i / 7 + sM * .35 * (i % 2 ? 1 : -.7)) % 1) * h * 1.4 - h * .2; g.globalAlpha = gold * (.45 + .25 * Math.sin(sM * 7 + i * 2)); g.fillStyle = i % 2 ? "#a020ff" : "#00ff88"; g.beginPath(); g.moveTo(0, y0); g.lineTo(w, y0 - h * .25); g.lineTo(w, y0 - h * .25 + h * .07); g.lineTo(0, y0 + h * .07); g.closePath(); g.fill(); } g.restore();
        }
        if (holo > 0) {
            g.save(); g.globalCompositeOperation = "lighter"; for (let y = 0; y < h; y += 4) { const k = .5 + .5 * Math.sin(y * .05 + sM * 9); g.globalAlpha = holo * .12 * k; g.fillStyle = `hsl(${(y * .6 + sM * 120) % 360},100%,60%)`; g.fillRect(0, y, w, 1.5); } g.restore();   // shimmering interference lines
            g.save(); g.globalCompositeOperation = "screen"; g.globalAlpha = holo * .5; const ed = M * .08; [["#ff2a8a", 0], ["#2affd8", 1]].forEach(([col, k]) => { const eg = k ? g.createLinearGradient(w, 0, w - ed, 0) : g.createLinearGradient(0, 0, ed, 0); eg.addColorStop(0, col); eg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = eg; g.fillRect(k ? w - ed : 0, 0, ed, h); }); g.restore();   // colours splitting at the edges
            if (holo > .25 && live > .2) { const n = 6; for (let i = 0; i < n; i++) { const y = hs(Math.floor(sM * 12) + i * 7) * h, hh = h * (.01 + .03 * hs(i + Math.floor(sM * 12))), dx = (hs(i * 3 + Math.floor(sM * 12)) - .5) * M * .05 * holo * live; const dp = X.dpr || 1; g.drawImage(g.canvas, 0, y * dp, w * dp, hh * dp, dx, y, w, hh); } }   // brief holographic tearing
        }
        X.fx.rgb = hit(t, ZW.open, .08) * 18 + holo * 7 * live;
        // the world stops: grey spreads over everything, uniformly, while the clock above brakes to zero
        if (t > ZW.gray + .1) { const q = lin(ZW.gray + .1, ZW.still + .06, t); g.save(); g.globalAlpha = q; K.column(g, "時よ止まれ", w * .08, h * .18, M * .07, q, { fill: "#fff", stroke: "#222", sw: 3 }); g.restore(); }
        if (t > ZW.still) K.title(g, X, lin(ZW.still, 1, t), { en: "THE WORLD", kj: "ザ・ワールド", sub: "TIME STOP · " + X.env.toName.toUpperCase() + " LOSES 2 TURNS", y: .86, col: "#d8d8d8" });
        if (grey > 0) { g.save(); g.globalCompositeOperation = "saturation"; g.globalAlpha = grey; g.fillStyle = "#808080"; g.fillRect(0, 0, w, h); g.restore(); }
        if (grey > 0) { g.save(); g.globalAlpha = grey * .5; K.vignette(g, w, h, .55, "#000", .4); g.restore(); }
        if (hit(t, ZW.open, .02)) X.fx.flash = ["#fff6c8", .7];
        K.bars(g, w, h, 1);
    }
};

export const FREEZE = { onepiece_f: aokiji, naruto_f: haku, jjk_f: uraume, demonslayer_f: doma, bleach_f: hitsugaya, dragonball_f: hitScene, blackclover_f: julius, hxh_f: kurapika, jojo_f: dio };
