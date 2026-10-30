/* =====================================================================
   FREEZE CARDS · nine ways to freeze the next player (they lose 2 turns)
   Every scene: a character beat (eye close-up / cut-in), the technique in first person, the hit on the target
   (staged at centre, then gliding back onto its real place on the table), and a seal(g, X, a, r) that the ending
   keeps on the real plate.
   ===================================================================== */
import * as K from "./kit.js?v=11";
import { hand, handTips, handRings, handPoint } from "./hands.js?v=11";
import * as H from "./holds.js?v=11";
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
/* ---------- AOKIJI · Ice Age, first person, drawn OVER the real table: the lazy right hand slides out of the white suit's pocket,
   drifts over the table and lays its palm flat on it on the voice's peak; ice grows out of the palm across the real table, cards
   and UI to every edge, then the world locks. The frozen look itself is the page's ice veil (game.js, .ice-veil), revealed by a
   mask that grows with this wave, so the hold after the scene is the same ice with no seam. ---------- */
const AO = { out: .17, reach: .36, touch: .39, edge: .6, lock: .74 };          // beats (scene t), pinned to the voice in engine.js SYNC
const aoSlow = t => { if (t < AO.edge) return t; const u = Math.min(1, (t - AO.edge) / (AO.lock - AO.edge)); return AO.edge + (AO.lock - AO.edge) * (u - u * u / 2); };
const AO_SKIN = { l: "#e9c3a0", b: "#c48d64", s: "#9a6644", d: "#6a3f28", ink: "#2a1206", nail: "#ead1bd" };   // Kuzan's tanned skin
const AO_SLEEVE = { c: "#f3f5f8", s: "#bcc6d4", cuff: "#3a6fb0", len: 420, w: 62 };                            // white suit jacket, blue shirt cuff
function aoFront(a, R) { return R * (1 + .06 * Math.sin(a * 7 + 1.3) + .045 * Math.sin(a * 13 + .4) + .035 * (hs(Math.floor((a + 7) * 9)) - .5)); }
const aokiji = {
    col: "#bfeaff", ms: 7600, grain: 0,
    seal: (g, X, a, r) => K.iceBlock(g, r || X.env.r, a, X.s, "#bfeaff"),
    begin() { document.dispatchEvent(new CustomEvent("timestop", { detail: { key: "onepiece_f", ph: "start" } })); },
    tailStart() { document.dispatchEvent(new CustomEvent("timestop", { detail: { key: "onepiece_f", ph: "stopped" } })); },
    tail(g, X, T) {                                                     // the scene dissolves, the page stays frozen; the victim's plate is sealed in ice
        const a = 1 - K.ss(.35, 1, T.tt); X.reveal(T.tt, .3); K.iceBlock(g, X.env.r, a, X.s, "#bfeaff");
        K.slam(g, X.env.toName + " · FROZEN ×2", X.w / 2, Math.min(X.h * .5, X.env.r.y + X.env.r.h + X.M * .12), X.M * .055, K.lin(0, 1, T.tt), { fill: "#f4fcff", stroke: "#0a2a44", glow: "#9fe3ff", from: 1.2 });
    },
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, st = aoSlow(t), sM = st * X.main / 1000;
        X.cue(.0, "wind", t); X.cue(AO.touch - .005, "freeze", t); X.cue(AO.touch, "crack", t); X.cue(AO.touch + .06, "crack", t); X.cue(AO.touch + .13, "crack", t); X.cue(AO.edge, "shing", t);
        if (t < .035) { g.fillStyle = "rgba(0,0,0," + (1 - t / .035) * .85 + ")"; g.fillRect(0, 0, w, h); }   // out of the card shot, onto the real table
        // the hand's path: out of the pocket (lower right), across, then lowered flat onto the table
        const out = K.ioCub(lin(0, AO.out, t)), reach = K.ioCub(lin(AO.out, AO.reach, t)), low = K.iCub(lin(AO.reach, AO.touch, t)), press = hit(t, AO.touch + .01, .04);
        const P0 = [w * .84, h * 1.18], P1 = [w * .8, h * .82], P2 = [w * .54, h * .66], tx = K.mix(K.mix(P0[0], P1[0], out), P2[0], reach), ty = K.mix(K.mix(P0[1], P1[1], out), P2[1], reach) + low * h * .04;
        const sc = HS(X) * K.mix(1.3, 1.02, reach) * (1 - low * .06) * (1 - press * .03), ang = K.mix(-.35, -.08, reach), touched = t >= AO.touch;
        const palm = [tx + Math.sin(ang) * 55 * sc, ty - Math.cos(ang) * 55 * sc];                                   // the centre of the palm (hand local 0,-55)
        const R = Math.hypot(w, h) * 1.05 * K.oCub(lin(AO.touch, AO.edge, st)), live = 1 - lin(AO.edge, AO.lock, t);
        if (X.env && X.env.box) document.dispatchEvent(new CustomEvent("timestop", { detail: { key: "onepiece_f", ph: "grow", x: palm[0], y: palm[1], r: touched ? R : 0 } }));
        // his white trousers and the pocket, first person looking down; they slide out of view as he leans over the table
        const tro = (1 - reach) * h * .0;
        g.save(); g.translate(0, reach * h * .45 + tro);
        const trouser = () => { g.beginPath(); g.moveTo(w * .58, h * 1.02); g.quadraticCurveTo(w * .7, h * .86, w * 1.02, h * .74); g.lineTo(w * 1.02, h * 1.02); g.closePath(); };
        const tg = g.createLinearGradient(w * .6, h * .8, w, h); tg.addColorStop(0, "#f6f8fb"); tg.addColorStop(.6, "#dfe5ee"); tg.addColorStop(1, "#b8c2d0");
        trouser(); g.fillStyle = tg; g.fill(); g.strokeStyle = "#2a3040"; g.lineWidth = 3; g.stroke();
        g.strokeStyle = "rgba(120,135,160,.5)"; g.lineWidth = 2; [[.7, .95, .86, .86], [.78, 1, .95, .9]].forEach(([a, b, c2, d]) => { g.beginPath(); g.moveTo(w * a, h * b); g.quadraticCurveTo(w * (a + .06), h * (b - .06), w * c2, h * d); g.stroke(); });   // cloth folds
        g.strokeStyle = "#2a3040"; g.lineWidth = 3; g.beginPath(); g.moveTo(w * .74, h * .9); g.quadraticCurveTo(w * .82, h * .84, w * .93, h * .8); g.stroke();   // the pocket's mouth
        g.restore();
        // the hand's shadow on the table: soft and offset while it hovers, sharp and under it on contact
        if (reach > .3) { const d = 1 - low; g.save(); g.globalAlpha = .35 * Math.min(1, reach) * (1 - (touched ? 0 : 0)); g.translate(palm[0] + d * M * .06, palm[1] + d * M * .05 + sc * 30); g.scale(1, .55); K.pool(g, 0, 0, sc * (110 + 50 * d), "#000814", .6); g.restore(); }
        // the arm: sleeve of the white suit jacket, the blue shirt cuff, the bare tanned hand; it ices over from the palm out
        const pose = reach < .4 ? "relax" : touched ? "spread" : "open";
        g.save(); if (press) { g.translate(tx, ty); g.scale(1 + press * .02, 1 - press * .04); g.translate(-tx, -ty); }
        hand(g, tx, ty, sc, ang, pose, { view: "back", skin: AO_SKIN, sleeve: AO_SLEEVE });
        const iced = ss(AO.touch, AO.touch + .12, t); if (iced > 0) { g.globalAlpha = iced * .85; hand(g, tx, ty, sc, ang, pose, { view: "back", skin: "ice", rim: "#dff6ff", sleeve: { c: "#e8f6ff", s: "#a9d4f0", cuff: "#bfe6ff", len: AO_SLEEVE.len, w: AO_SLEEVE.w } }); }
        g.restore();
        if (t < AO.out + .02) {                                             // still in the pocket: the pocket's front panel covers the hand
            g.save(); g.beginPath(); g.moveTo(w * .72, h * 1.02); g.lineTo(w * .74, h * .9); g.quadraticCurveTo(w * .82, h * .84, w * .93, h * .8); g.lineTo(w * 1.02, h * .78); g.lineTo(w * 1.02, h * 1.02); g.closePath();
            g.globalAlpha = 1 - lin(AO.out - .06, AO.out + .02, t); const pg = g.createLinearGradient(w * .74, h * .85, w, h); pg.addColorStop(0, "#eef2f7"); pg.addColorStop(1, "#bcc6d4"); g.fillStyle = pg; g.fill(); g.strokeStyle = "#2a3040"; g.lineWidth = 3; g.stroke(); g.restore();
        }
        // cold breath before the touch: mist pooling under the palm
        if (!touched && reach > .2) { const q = lin(AO.out, AO.touch, t); for (let i = 0; i < 6; i++) { const u = (sM * .3 + i / 6) % 1; K.pool(g, palm[0] + (hs(i) - .5) * M * .3 * u, palm[1] + M * .05 - u * M * .08, M * (.06 + u * .14), "#e6f7ff", .22 * q * Math.sin(u * Math.PI)); } }
        if (touched) {
            const fr = lin(AO.touch, AO.edge, st);
            // branching cracks racing out from the palm across the table (they fade as the frost settles)
            g.save(); g.lineCap = "round"; const ca = (1 - lin(AO.edge, AO.lock + .04, t));
            for (let k = 0; k < 11; k++) {
                const a0 = k / 11 * TAU + hs(k) * .5, Lk = Math.hypot(w, h) * (.35 + .5 * hs(k + 3)), reachK = Math.min(R * .96, Lk); if (reachK < 4) continue;
                const pts = [[palm[0], palm[1]]]; let x = palm[0], y = palm[1], a = a0; const n = 9;
                for (let j = 1; j <= n; j++) { const L = reachK / n; a += (hs(k * 13 + j) - .5) * .7; x += Math.cos(a) * L; y += Math.sin(a) * L; pts.push([x, y]); }
                [[6, "rgba(120,200,255,.25)"], [1.8, "rgba(255,255,255,.9)"]].forEach(([lw, col]) => { g.globalAlpha = ca; g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); });
                const fj = 4 + (k % 3), fp = pts[fj]; if (fp && reachK > Lk * .5) { let fx = fp[0], fy = fp[1], fa = a0 + (k % 2 ? .7 : -.7); g.lineWidth = 1.2; g.strokeStyle = "rgba(255,255,255,.75)"; g.beginPath(); g.moveTo(fx, fy); for (let j = 0; j < 4; j++) { fa += (hs(k * 7 + j) - .5) * .8; fx += Math.cos(fa) * reachK / 14; fy += Math.sin(fa) * reachK / 14; g.lineTo(fx, fy); } g.stroke(); }
            }
            g.restore();
            // the wave front: jagged crystals pointing outward, a bright rim with a cold chromatic split and shimmer
            if (fr < 1) {
                const n = 120;
                g.save(); g.globalCompositeOperation = "screen";
                [["rgba(255,90,180,.55)", -3], ["rgba(90,240,255,.65)", 3], ["rgba(255,255,255,.95)", 0]].forEach(([col, off]) => { g.strokeStyle = col; g.lineWidth = off ? 3 : 2.2; g.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * TAU, rr = aoFront(a, R) + off; const x = palm[0] + Math.cos(a) * rr, y = palm[1] + Math.sin(a) * rr; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); });
                g.restore();
                g.save(); for (let i = 0; i < 70; i++) {                         // crystals growing at the front
                    const a = (i + hs(i) * .6) / 70 * TAU, rr = aoFront(a, R), sz = M * (.018 + .03 * hs(i + 9)) * (1 - fr * .4), x = palm[0] + Math.cos(a) * rr, y = palm[1] + Math.sin(a) * rr;
                    g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(sz * 1.3, 0); g.lineTo(-sz * .2, -sz * .35); g.lineTo(-sz * .5, 0); g.lineTo(-sz * .2, sz * .35); g.closePath();
                    const cg = g.createLinearGradient(-sz, 0, sz * 1.3, 0); cg.addColorStop(0, "rgba(160,215,255,.25)"); cg.addColorStop(1, "rgba(255,255,255,.9)"); g.fillStyle = cg; g.fill(); g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 1; g.stroke(); g.setTransform(X.dpr || 1, 0, 0, X.dpr || 1, 0, 0);
                } g.restore();
            }
            // contact burst at the palm
            const bq = lin(AO.touch, AO.touch + .08, t); if (bq < 1) { K.glow(g, palm[0], palm[1], M * .3 * (1 - bq * .5), "#e6f7ff", 1 - bq); K.shock(g, palm[0], palm[1], bq, M * .5, "#dff4ff", 26); K.sparks(g, palm[0], palm[1], bq, 30, 3, { speed: M * .6, col: "#e6f7ff" }); }
            // frost mist and floating ice crystals; both brake to a stop as the world locks
            g.save(); for (let i = 0; i < 14; i++) { const u = (hs(i + 30) + sM * .05 * (.5 + hs(i))) % 1, x = w * (hs(i + 5) + sM * .02 * (hs(i) - .5)), y = h * (.15 + .8 * hs(i + 11)); K.pool(g, x, y, M * (.12 + .12 * hs(i)), "#f0faff", .12 * Math.min(1, fr * 2) * Math.sin(u * Math.PI)); } g.restore();
            g.save(); g.globalCompositeOperation = "lighter"; for (let i = 0; i < 46; i++) { const d0 = hs(i + 70) * Math.hypot(w, h) * .7; if (d0 > R) continue; const a = hs(i + 80) * TAU, fl = sM * (6 + 10 * hs(i)), x = palm[0] + Math.cos(a) * d0 + Math.sin(fl * .3 + i) * 10, y = palm[1] + Math.sin(a) * d0 - fl * 4 % (h * .3);
                const tw = .5 + .5 * Math.sin(sM * 5 + i * 2.3); g.globalAlpha = .7 * tw; g.fillStyle = "#ffffff"; g.save(); g.translate(x, y); g.rotate(i + fl * .2); g.fillRect(-1, -4, 2, 8); g.fillRect(-4, -1, 8, 2); g.restore(); } g.restore();
        }
        if (t > AO.lock - .04) K.title(g, X, lin(AO.lock - .04, 1, t), { en: "ICE AGE", kj: "氷河時代", sub: "AOKIJI · " + X.env.toName.toUpperCase() + " FROZEN FOR 2 TURNS", y: .2, col: "#bfeaff" });
        if (hit(t, AO.touch, .015)) X.fx.flash = ["#eaf8ff", .55];
    }
};

/* ---------- URAUME · Ice Formation (氷凝呪法), first person, drawn OVER the real table: hands folded at the waist like a servant
   waiting; on 霜凪 they rise and hold together out in front, palms forward, a point of pale cold light gathering between the thumbs
   while the voice builds; on its peak they push forward and the ice bursts out in every direction with snow, across the real table,
   cards and UI to the page's edges, then everything slows to a stop. The frozen, snowy look is the page's snow veil (game.js,
   .snow-veil), revealed by a mask that grows with this wave. ---------- */
const UR = { rise: .165, held: .24, build: .58, push: .705, edge: .84, lock: .92 };     // beats (scene t), pinned to the voice in engine.js SYNC
const urSlow = t => { if (t < UR.edge) return t; const u = Math.min(1, (t - UR.edge) / (UR.lock - UR.edge)); return UR.edge + (UR.lock - UR.edge) * (u - u * u / 2); };
const UR_SLEEVE = { c: "#f4f2f8", s: "#c6bfd6", cuff: "#d9d3e6", len: 380, w: 92 };      // Uraume's pale kimono: wide sleeves, a lavender-grey shade
const UR_ICE = { c: "#eef8ff", s: "#b4dcf4", cuff: "#d6eeff", len: 380, w: 92 };
function flake(g, x, y, R, rot, a) {                                              // a six-armed snowflake with side branches
    if (R < .8 || a <= 0) return; g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(rot); g.strokeStyle = "#ffffff"; g.lineWidth = Math.max(.8, R * .12); g.lineCap = "round";
    for (let k = 0; k < 6; k++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -R); g.moveTo(0, -R * .55); g.lineTo(-R * .25, -R * .78); g.moveTo(0, -R * .55); g.lineTo(R * .25, -R * .78); g.stroke(); }
    g.restore();
}
const uraume = {
    col: "#bfe4ff", ms: 9000, mainPlus: 3200, grain: 0,
    seal: (g, X, a, r) => K.iceBlock(g, r || X.env.r, a, X.s, "#cfeaff"),
    begin() { document.dispatchEvent(new CustomEvent("timestop", { detail: { key: "jjk_f", ph: "start" } })); },
    tailStart() { document.dispatchEvent(new CustomEvent("timestop", { detail: { key: "jjk_f", ph: "stopped" } })); },
    tail(g, X, T) {
        const a = 1 - K.ss(.35, 1, T.tt); X.reveal(T.tt, .3); K.iceBlock(g, X.env.r, a, X.s, "#cfeaff");
        K.slam(g, X.env.toName + " · FROZEN ×2", X.w / 2, Math.min(X.h * .5, X.env.r.y + X.env.r.h + X.M * .12), X.M * .055, K.lin(0, 1, T.tt), { fill: "#f6fbff", stroke: "#1a3a5a", glow: "#bfe4ff", from: 1.2 });
    },
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, st = urSlow(t), sM = st * X.main / 1000;
        X.cue(.0, "wind", t); X.cue(UR.rise, "chime", t); X.cue(UR.build, "charge", t); X.cue(UR.push - .004, "freeze", t); X.cue(UR.push, "crack", t); X.cue(UR.push + .04, "crack", t); X.cue(UR.edge - .02, "shing", t);
        if (t < .03) { g.fillStyle = "rgba(0,0,0," + (1 - t / .03) * .85 + ")"; g.fillRect(0, 0, w, h); }
        // the hands: folded at the waist → raised together out in front → pushed forward on the peak
        const up = K.ioCub(lin(UR.rise - .02, UR.held, t)), push = K.oBack(lin(UR.push - .012, UR.push + .01, t)), build = lin(UR.held, UR.push, t), loud = lin(UR.build, UR.push, t);
        const sc = HS(X) * K.mix(1.15, .96, up) * (1 - push * .14), trem = (hs(Math.floor(sM * 30)) - .5) * M * .003 * loud * (1 - push), released = t >= UR.push;
        const cx = w / 2 + trem, cy = K.mix(h * 1.02, h * .7, up) - push * h * .05, gap = sc * 70;
        const side = s1 => {                                                 // s1 = 1 right hand, -1 left (mirrored); thumbs face each other
            const x = K.mix(w / 2 + s1 * w * .07, cx + s1 * gap, up), y = K.mix(h * 1.0 + (s1 > 0 ? -h * .02 : 0), cy, up), a = K.mix(-s1 * 1.32, -s1 * .1, up);
            const pose = up < .5 ? "relax" : "open", o = { view: "back", skin: "pale", flip: s1 < 0, sleeve: UR_SLEEVE };
            hand(g, x, y, sc, a, pose, o);
            const ice = ss(UR.push, UR.push + .07, t); if (ice > 0) { g.save(); g.globalAlpha = ice * .8; hand(g, x, y, sc, a, pose, Object.assign({}, o, { skin: "ice", rim: "#e6f6ff", sleeve: UR_ICE })); g.restore(); }
            return [x, y];
        };
        side(-1); side(1);                                         // left under, right over (folded hands)
        const core = [cx, cy - sc * 62];                                      // between the thumbs and index fingers
        // a cold breath of mist over the table while she waits
        g.save(); for (let i = 0; i < 6; i++) { const u = (sM * .05 + i / 6) % 1; K.pool(g, w * (-.1 + 1.2 * u), h * (.7 + .08 * Math.sin(i * 2.3)), M * .3, "#eaf6ff", .1 * Math.sin(u * Math.PI) * (1 - lin(UR.lock, 1, t) * .5)); } g.restore();
        if (t > .02 && t < UR.held + .05) { g.save(); g.globalAlpha = 1 - lin(UR.held, UR.held + .05, t); K.column(g, "氷凝呪法", w * .08, h * .16, M * .062, lin(.02, .12, t), { fill: "#f4fbff", stroke: "#1a3a5a", glow: "#bfe4ff", sw: 3 }); g.restore(); }
        if (t > UR.rise && t < UR.held + .1) K.slam(g, "霜凪", w / 2, h * .2, M * .12, lin(UR.rise, UR.held + .1, t), { font: K.F_JP, weight: "400", fill: "#f4fbff", stroke: "#1a3a5a", glow: "#9fd6ff", from: 1.3 });
        // the point of cold light gathering between the hands: a pale core, a slow ring, frost creeping on the fingertips, flakes drawn in
        if (build > 0 && !released) {
            const k = .25 + .75 * Math.pow(build, 1.6), R = M * (.012 + .05 * k);
            K.glow(g, core[0], core[1], R * 4, "#bfe4ff", .6 + .4 * loud); K.glow(g, core[0], core[1], R * 1.5, "#ffffff", .9);
            g.save(); g.strokeStyle = "rgba(220,242,255," + (.5 * k) + ")"; g.lineWidth = 1.5; g.beginPath(); g.ellipse(core[0], core[1], R * 2.6, R * 1.1, sM * .6, 0, TAU); g.stroke(); g.restore();
            for (let i = 0; i < 14; i++) { const u = (sM * .35 + i / 14) % 1, an = i * 2.4 + sM * .4, d = M * .22 * (1 - u); flake(g, core[0] + Math.cos(an) * d, core[1] + Math.sin(an) * d * .7, M * .008 * (1 + k), an, Math.sin(u * Math.PI) * k); }
        }
        const R = Math.hypot(w, h) * 1.05 * K.oCub(lin(UR.push, UR.edge, st)), fr = lin(UR.push, UR.edge, st);
        if (X.env && X.env.box) document.dispatchEvent(new CustomEvent("timestop", { detail: { key: "jjk_f", ph: "grow", x: core[0], y: core[1], r: released ? R : 0 } }));
        if (released) {
            // the release: a burst of light and a ring of frost from between the hands
            const bq = lin(UR.push, UR.push + .05, t); if (bq < 1) { K.glow(g, core[0], core[1], M * .4 * (1 - bq * .4), "#e8f6ff", 1 - bq); K.shock(g, core[0], core[1], bq, M * .55, "#dff2ff", 22); }
            // frost lines branching out ahead of the ice, six-fold like the snowflakes
            g.save(); g.lineCap = "round"; const fa = 1 - lin(UR.edge, UR.lock + .04, t);
            for (let k = 0; k < 12; k++) {
                let a = k / 12 * TAU + .26, x = core[0], y = core[1]; const Lk = Math.min(R * .95, Math.hypot(w, h) * (.4 + .45 * hs(k + 2))); if (Lk < 6) continue;
                g.globalAlpha = fa * .85; g.strokeStyle = "#f2faff"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y);
                const n = 10; for (let j = 1; j <= n; j++) { a += (hs(k * 11 + j) - .5) * .35; const nx = x + Math.cos(a) * Lk / n, ny = y + Math.sin(a) * Lk / n; g.lineTo(nx, ny);
                    if (j % 2 === 0) { const bl = Lk / n * .9; [1, -1].forEach(sd => { g.moveTo(nx, ny); g.lineTo(nx + Math.cos(a + sd * 1.05) * bl, ny + Math.sin(a + sd * 1.05) * bl); g.moveTo(nx, ny); }); } x = nx; y = ny; }
                g.stroke();
            }
            g.restore();
            // the front: a bright, clean edge with a cold shimmer and a slight colour split, delicate crystals riding it
            if (fr < 1) {
                const n = 140, front = a => R * (1 + .035 * Math.sin(a * 6) + .025 * Math.sin(a * 17 + .7));
                g.save(); g.globalCompositeOperation = "screen";
                [["rgba(255,120,200,.45)", -2.5], ["rgba(120,230,255,.6)", 2.5], ["rgba(255,255,255,.95)", 0]].forEach(([col, off]) => { g.strokeStyle = col; g.lineWidth = off ? 2.5 : 2; g.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * TAU, rr = front(a) + off; i ? g.lineTo(core[0] + Math.cos(a) * rr, core[1] + Math.sin(a) * rr) : g.moveTo(core[0] + Math.cos(a) * rr, core[1] + Math.sin(a) * rr); } g.stroke(); });
                g.restore();
                for (let i = 0; i < 40; i++) { const a = (i + hs(i) * .5) / 40 * TAU, rr = front(a), x = core[0] + Math.cos(a) * rr, y = core[1] + Math.sin(a) * rr; flake(g, x, y, M * (.012 + .016 * hs(i + 5)) * (1 - fr * .3), a + sM, .9); }
            }
            // snow: flakes swirling out with the burst, then drifting down, slowing to a stop as the world locks
            g.save(); for (let i = 0; i < 90; i++) {
                const d0 = (hs(i + 120) * .9 + .05) * Math.hypot(w, h) * .6; if (d0 > R) continue;
                const a = hs(i + 130) * TAU + sM * .15 * (hs(i) - .5), fall = (sM - (UR.push * X.main / 1000)) * (14 + 26 * hs(i + 3)), x = core[0] + Math.cos(a) * d0 + Math.sin(sM * .8 + i) * 14, y = core[1] + Math.sin(a) * d0 + fall;
                const yy = ((y % (h + 40)) + h + 40) % (h + 40) - 20; if (i % 3) { g.globalAlpha = .85; g.fillStyle = "#ffffff"; g.beginPath(); g.arc(x, yy, 1.2 + 2 * hs(i + 7), 0, TAU); g.fill(); } else flake(g, x, yy, M * (.006 + .008 * hs(i)), i + sM * .3, .9);
            } g.restore();
            // mist rolling across the table
            g.save(); for (let i = 0; i < 8; i++) { const u = (hs(i + 40) + sM * .03) % 1; K.pool(g, w * (-.2 + 1.4 * u), h * (.55 + .35 * hs(i + 50)), M * (.25 + .15 * hs(i)), "#f0f8ff", .14 * Math.min(1, fr * 2)); } g.restore();
        }
        if (t > UR.lock - .06) K.title(g, X, lin(UR.lock - .06, 1, t), { en: "ICE FORMATION", kj: "氷凝呪法", sub: "URAUME · " + X.env.toName.toUpperCase() + " FROZEN FOR 2 TURNS", y: .2, col: "#bfe4ff" });
        if (hit(t, UR.push, .01)) X.fx.flash = ["#f0f9ff", .5];
    }
};

/* ---------- HITSUGAYA · Daiguren Hyorinmaru, first person, drawn OVER the real table: both hands, armoured in blue crystal ice, grip
   Hyorinmaru (four-pointed star guard, teal hilt, the crescent blade on its chain) in black shihakusho sleeves; frost creeps up the
   blade; he raises it and on the voice's peak swings it forward: a burst of freezing wind, and the winged ice dragon pours out of the
   blade, circles the screen twice breathing cold, and everything it passes freezes in waves (table, cards, UI, page). The ice ends
   as two layers: a frosted sheet (the page's .hyo-veil, revealed along the dragon's path) and diamond crystals standing on top
   (kit.js crystalField, shared with the hold). Hyorinmaru settles coiled round the page's edges. ---------- */
const HY = { raise: .159, rel: .2225, lock: .733, still: .82 };                 // beats (scene t), pinned to the voice in engine.js SYNC
const hySlow = t => { if (t < HY.lock) return t; const u = Math.min(1, (t - HY.lock) / (HY.still - HY.lock)); return HY.lock + (HY.still - HY.lock) * (u - u * u / 2); };
const HY_SLEEVE = { c: "#18181f", s: "#050508", cuff: "#2a2a34", len: 420, w: 74 };      // the black shihakusho
const HY_DRAGON = { scale: 1.5, wings: 1, span: .5, n: 90 };
function hySword(X, t) {                                                         // the guard's position and the blade's angle over time
    const { w, h, M } = X, up = K.ioCub(lin(HY.raise, HY.rel - .008, t)), sw = K.oBack(lin(HY.rel - .008, HY.rel + .01, t));
    const gx = w * (.57 - .02 * up + .04 * sw), gy = h * (.5 - .06 * up + .1 * sw), ang = -2.15 + .45 * up + .85 * sw, len = M * .78 * (1 - sw * .08);
    return { gx, gy, ang, len, tip: [gx + Math.cos(ang) * len, gy + Math.sin(ang) * len] };
}
const hitsugaya = {
    col: "#5aa9ff", ms: 7600, mainPlus: 1500, grain: 0, breath: t => t < HY.rel,
    seal: () => {},
    begin() { document.dispatchEvent(new CustomEvent("timestop", { detail: { key: "bleach_f", ph: "start" } })); },
    tailStart(X) { const S = hySword(X, 1); document.dispatchEvent(new CustomEvent("timestop", { detail: { key: "bleach_f", ph: "stopped", start: hySword(X, HY.rel + .012).tip } })); },
    tail(g, X, T) { X.reveal(T.tt, .35); K.slam(g, X.env.toName + " · FROZEN ×2", X.w / 2, Math.min(X.h * .5, X.env.r.y + X.env.r.h + X.M * .12), X.M * .055, K.lin(0, 1, T.tt), { fill: "#f4fbff", stroke: "#0a2a54", glow: "#5aa9ff", from: 1.2 }); },
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, st = hySlow(t), sM = st * X.main / 1000, S = hySword(X, t), released = t >= HY.rel;
        X.cue(.0, "wind", t); X.cue(HY.raise, "shing", t); X.cue(HY.rel - .004, "whoosh", t); X.cue(HY.rel, "freeze", t); X.cue(HY.rel + .002, "boom", t);
        [.3, .38, .46, .54, .62, .7].forEach(a => X.cue(a, "crack", t)); X.cue(HY.lock, "freeze", t); X.cue(HY.lock + .003, "chime", t);
        if (t < .03) { g.fillStyle = "rgba(0,0,0," + (1 - t / .03) * .85 + ")"; g.fillRect(0, 0, w, h); }
        const start = hySword(X, HY.rel + .012).tip, P = X.env._hyP || (X.env._hyP = K.hyoPath(w, h, start)), crys = X.env._hyC || (X.env._hyC = K.crystalField(w, h)), seen = X.env._hyS || (X.env._hyS = {});
        const fly = released ? 1 - Math.pow(1 - lin(HY.rel, HY.lock + .01, st), 1.7) : 0, lockQ = ss(HY.lock - .07, HY.lock + .03, t);
        const circles = released ? K.hyoFreeze(w, h, P, fly, lockQ) : [];
        if (X.env && X.env.box) document.dispatchEvent(new CustomEvent("timestop", { detail: { key: "bleach_f", ph: "grow", circles } }));
        // the outer layer: diamond crystals grow where the freeze has reached
        if (released) crys.forEach(c => { let dep = -1e9; circles.forEach(([x, y, r]) => { dep = Math.max(dep, r - 20 - Math.hypot(c.x - x, c.y - y)); }); if (dep > 0) K.crystalDraw(g, c, Math.min(1, dep / (M * .1)), 0); });   // each crystal grows as the freeze passes over it
        // the front of each freezing wave: a cold shimmer with a slight colour split
        if (released && lockQ < 1) { g.save(); g.globalCompositeOperation = "screen"; circles.forEach(([x, y, r], i) => { if (r < 30 || r > M * .6) return; [["rgba(255,110,190,.35)", -3], ["rgba(110,230,255,.45)", 3], ["rgba(255,255,255,.6)", 0]].forEach(([c, d]) => { g.strokeStyle = c; g.lineWidth = d ? 2 : 1.5; g.beginPath(); g.arc(x + d, y, r - 20, 0, TAU); g.stroke(); }); }); g.restore(); }
        // Hyorinmaru: bursts from the blade, circles the screen breathing cold, settles coiled round the edges
        if (released) {
            const u = .02 + .98 * fly, hd = P(u), hn = P(Math.min(1, u + .004)), an = Math.atan2(hn[1] - hd[1], hn[0] - hd[0]);
            for (let i = 0; i < 10; i++) { const q = (sM * .6 + i / 10) % 1, d = M * (.05 + q * .3); K.pool(g, hd[0] + Math.cos(an) * d, hd[1] + Math.sin(an) * d, M * (.04 + q * .12), "#eef8ff", .32 * (1 - q)); }   // its breath
            K.iceDragon(g, P, u, M, sM, Object.assign({}, HY_DRAGON, { alpha: K.mix(1, .55, lockQ), scale: HY_DRAGON.scale * (X.w < 600 ? .75 : 1) }));
            const bq = lin(HY.rel, HY.rel + .05, t); if (bq < 1) { K.glow(g, S.tip[0], S.tip[1], M * .5 * (1 - bq * .4), "#dff2ff", 1 - bq); K.shock(g, S.tip[0], S.tip[1], bq, M * .9, "#bfe4ff", 30); K.streaks(g, w, h, sM, S.ang, { n: 50, col: "#e6f6ff", a: .5 * (1 - bq), speed: 7 }); }
            g.save(); for (let i = 0; i < 70; i++) { const y = ((hs(i) * h + sM * (20 + 30 * hs(i + 3))) % (h + 20)) - 10, x = (hs(i + 9) * w + Math.sin(sM * .7 + i) * 30) % w; g.globalAlpha = .75 * Math.min(1, fly * 3); g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, 1 + 2 * hs(i + 4), 0, TAU); g.fill(); } g.restore();   // swirling snow
        }
        // the sword and the ice-armoured hands, in black sleeves; cold mist round them, frost creeping up the blade
        const fade = 1 - ss(HY.lock - .05, HY.lock + .06, t);
        if (fade > 0) {
            g.save(); g.globalAlpha *= fade;
            for (let i = 0; i < 6; i++) { const q = (sM * .25 + i / 6) % 1; K.pool(g, S.gx + (hs(i) - .5) * M * .3, S.gy - q * M * .25, M * (.06 + q * .1), "#eaf6ff", .2 * Math.sin(q * Math.PI)); }
            K.katana(g, S.gx, S.gy, S.ang, S.len, { blade: ["#f4fbff", "#a9cbe8", "#3a5a80"], guard: "#d9c46a", wrap: "#1f6f8f", wrapLine: "#d8ecf4", tsuba: "star4", chain: "crescent", hilt: 2.5, s: sM });
            const fr = lin(.02, HY.rel, t), c = Math.cos(S.ang), sn = Math.sin(S.ang);
            for (let i = 0; i < 22; i++) { const d = S.len * (.06 + .92 * hs(i * 3.1)); if (d > S.len * (.06 + .94 * fr)) continue; K.crystalDraw(g, { x: S.gx + c * d, y: S.gy + sn * d, a: S.ang + (i % 2 ? 1 : -1) * (.7 + .5 * hs(i)), sz: M * (.008 + .01 * hs(i + 2)), kind: "spike" }, 1, 0); }   // frost on the blade
            [[.4, 0, 0], [.64, 1, 1.25]].forEach(([dd, left, twist]) => {    // right hand by the guard (arm from the lower right), then the left hand lower on the hilt (arm from the lower left)
                const hx = S.gx - c * S.len * dd, hy = S.gy - sn * S.len * dd, ha = S.ang + Math.PI / 2 + twist, hs2 = HS(X) * .74;
                hand(g, hx, hy, hs2, ha, "fist", { view: "back", skin: "ice", rim: "#dff4ff", flip: !!left, sleeve: HY_SLEEVE });
                [[-44, -40], [-14, -50], [16, -48], [44, -38], [-34, 8], [34, 8]].forEach(([lx, ly], i) => { const p = handPoint(lx, ly, hx, hy, hs2, ha, !!left); K.crystalDraw(g, { x: p[0], y: p[1], a: ha - Math.PI / 2 + (i < 4 ? 0 : (i === 4 ? -1.4 : 1.4)) + (hs(i) - .5) * .5, sz: M * (.014 + .01 * hs(i + 1)), kind: "spike" }, 1, 0); });   // crystal growing off knuckles and wrists
            });
            g.restore();
        }
        if (t > .02 && t < HY.rel + .1) K.slam(g, "卍解", w / 2, h * .2, M * .14, lin(.02, HY.rel + .1, t), { font: K.F_JP, weight: "400", fill: "#f4fbff", stroke: "#0a2a54", glow: "#5aa9ff", from: 1.3 });
        if (t > HY.lock - .02) K.title(g, X, lin(HY.lock - .02, 1, t), { en: "DAIGUREN HYORINMARU", kj: "大紅蓮氷輪丸", sub: "HITSUGAYA · " + X.env.toName.toUpperCase() + " FROZEN FOR 2 TURNS", y: .2, col: "#5aa9ff" });
        if (hit(t, HY.rel, .012)) X.fx.flash = ["#e8f6ff", .5];
    }
};

/* ---------- KURAPIKA · Chain Jail, first person, drawn OVER the real table: his right hand raised in the Kurta sleeve, a steel ring on
   every finger with its chain hanging; the middle finger's Chain Jail fills with yellow Nen; on the voice's peak the hand thrusts
   forward and the five chains shoot out across the real table, cards and UI to the page's edges (Chain Jail coils round the bound
   player's plate), the Nen floods all of them, they tighten and lock. The routes and the drawing are shared with the page's chain
   hold (kit.js chainRoutes / drawChain / chainGlow, game.js), so the hold is this scene's last frame. ---------- */
const KU = { glow: .1, wind: .275, thrust: .304, spread: .5, lock: .534, still: .62 };     // beats (scene t), pinned to the voice in engine.js SYNC
const kuSlow = t => { if (t < KU.lock) return t; const u = Math.min(1, (t - KU.lock) / (KU.still - KU.lock)); return KU.lock + (KU.still - KU.lock) * (u - u * u / 2); };
const KU_SLEEVE = { c: "#2c58b4", s: "#1a3578", cuff: "#e8c24a", len: 380, w: 64 };      // the Kurta clan's blue garment with its gold trim
const KU_POSE0 = "open", KU_POSE1 = "spread";
function kuHand(X, t) {                                                        // where the hand is: raised and calm → a short draw back → the thrust
    const { w, h } = X, back = K.ioCub(lin(KU.wind, KU.thrust - .006, t)) * (1 - lin(KU.thrust - .006, KU.thrust + .01, t)), th = K.oBack(lin(KU.thrust - .006, KU.thrust + .012, t));
    const s = HS(X) * 1.22 * (1 + back * .06) * (1 - th * .2), x = w * (.66 + back * .02 - th * .06), y = h * (.98 + back * .04 - th * .14), ang = -.16 + back * .05 + th * .1;
    return { x, y, s, ang, pose: th > .5 ? KU_POSE1 : KU_POSE0 };
}
const kurapika = {
    col: "#ffd23a", ms: 7600, mainPlus: 1500, grain: 0, breath: () => false,     // no voice-glow tint: only Chain Jail carries the Nen before the launch
    seal: (g, X, a) => {},
    begin(env) { document.dispatchEvent(new CustomEvent("timestop", { detail: { key: "hxh_f", ph: "start" } })); },
    tailStart(X) { const H = kuHand({ w: X.w, h: X.h, M: X.M }, 1); document.dispatchEvent(new CustomEvent("timestop", { detail: { key: "hxh_f", ph: "stopped", origins: kuOrigins(X, H), plate: X.env.r } })); },
    tail(g, X, T) { X.reveal(T.tt, .35); K.slam(g, X.env.toName + " · BOUND ×2", X.w / 2, Math.min(X.h * .5, X.env.r.y + X.env.r.h + X.M * .12), X.M * .055, K.lin(0, 1, T.tt), { fill: "#fff8d8", stroke: "#4a3000", glow: "#ffd23a", from: 1.2 }); },
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, st = kuSlow(t), sM = st * X.main / 1000, H = kuHand(X, t), HF = kuHand(X, 1), size = M * .0095;
        X.cue(.0, "wind", t); X.cue(KU.glow, "charge", t); X.cue(KU.thrust - .004, "whoosh", t); X.cue(KU.thrust, "clink", t); [.34, .38, .42, .46].forEach(a => X.cue(a, "clink", t)); X.cue(KU.lock, "stamp", t); X.cue(KU.lock + .004, "clink", t);
        if (t < .03) { g.fillStyle = "rgba(0,0,0," + (1 - t / .03) * .85 + ")"; g.fillRect(0, 0, w, h); }
        const launched = t >= KU.thrust, jailGlow = ss(KU.glow, KU.thrust, t), O = kuOrigins(X, HF);
        const routes = X.env._routes || (X.env._routes = K.chainRoutes(w, h, O, X.env.r));
        const flood = lin(KU.thrust + .02, KU.spread + .02, t), tight = ss(KU.spread - .04, KU.lock, t), wob = M * .018 * (1 - tight);
        // the golden glow of the bind settles over the page as the Nen floods the chains
        K.chainGlow(g, w, h, ss(KU.spread - .1, KU.lock + .02, t));
        if (launched) {                                                     // the five chains in flight: tip first, the Nen following behind
            routes.forEach((P, k) => {
                const e = K.oCub(lin(KU.thrust + .002 + k * .006, KU.spread - .02 + k * .006, st)), front = P.lead + (P.len - P.lead) * e;
                const auraTo = k === 1 ? front : P.lead + (P.len - P.lead) * K.oCub(lin(KU.thrust + .03 + k * .01, KU.spread + .03, st));
                K.drawChain(g, P, 0, Math.min(front, P.lead), size * (k === 1 ? 1.12 : 1), { aura: k === 1 ? 1 : Math.max(.15, flood), auraTo, t: sM, k, wob }); P._o = { front, aura: k === 1 ? 1 : Math.max(.15, flood), auraTo, wob };
                if (e < 1) {                                                // the front: the weapon, a cold shimmer with a slight colour split
                    let j = 0; while (j < P.cum.length - 2 && P.cum[j + 1] < front) j++; const a = P.pts[j], b = P.pts[j + 1] || a, an = Math.atan2(b[1] - a[1], b[0] - a[0]);
                    g.save(); g.globalCompositeOperation = "screen"; [["rgba(255,90,170,.6)", -3], ["rgba(90,230,255,.6)", 3]].forEach(([c, d]) => K.glow(g, a[0] + d, a[1], size * 4, c, .7)); g.restore();
                    K.glow(g, a[0], a[1], size * 5, "#ffe680", .8); K.chainTip(g, a[0], a[1], an, P.kind, size * 2.1);
                } else if (k === 1) { const n = P.pts.length, a = P.pts[n - 2], b = P.pts[n - 1]; K.chainTip(g, b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0]), P.kind, size * 2.3); }
            });
            // sparks of Nen along the chains, slowing to a stop as they lock
            g.save(); g.globalCompositeOperation = "lighter"; for (let i = 0; i < 60; i++) { const P = routes[i % 5], s0 = P.lead + (P.len - P.lead) * hs(i * 3.3), lf = (sM * (1.2 + hs(i)) + hs(i * 7)) % 1; if (s0 > P.lead + (P.len - P.lead) * flood) continue;
                let j = 0; while (j < P.cum.length - 2 && P.cum[j + 1] < s0) j++; const p = P.pts[j]; g.globalAlpha = Math.sin(lf * Math.PI) * .9; g.fillStyle = "#fff0a0"; g.fillRect(p[0] + (hs(i) - .5) * 10, p[1] - lf * 14 * (1 - tight * .8), 2.4, 2.4); } g.restore();
            const lk = lin(KU.lock, KU.lock + .05, t); if (lk > 0 && lk < 1) { const c = mid(X.env.r); K.shock(g, c.x, c.y, lk, M * .35, "#ffd23a", 18); K.glow(g, c.x, c.y, M * .25, "#ffe680", 1 - lk); }
        }
        hand(g, H.x, H.y, H.s, H.ang, H.pose, { view: "back", skin: "base", sleeve: KU_SLEEVE, rings: 1, ringGlow: [1, Math.max(jailGlow, launched ? 1 : 0)] });
        // the hand: rings on all five fingers; before the launch the chains hang from them, swaying, Chain Jail filling with Nen
        if (!launched) {
            const rings = K_rings(H);
            rings.forEach((r, k) => { if (!r) return; const sway = Math.sin(sM * 1.6 + k) * M * .02, P = K.chainPath([[r[0], r[1]], [r[0] + sway * .4 + (k - 2) * M * .01, r[1] + h * .16], [r[0] + sway + (k - 2) * M * .04, h * 1.1]], 6);
                drawRoute(g, P, P.len, size * .9, { aura: k === 1 ? jailGlow : 0, t: sM, k }); });
        }
        if (launched) routes.forEach((P, k) => { const q = P._o; if (q && q.front > P.lead) K.drawChain(g, P, P.lead, q.front, size * (k === 1 ? 1.12 : 1), { aura: q.aura, auraTo: q.auraTo, t: sM, k, wob: q.wob }); });
        if (t > KU.glow && t < KU.thrust + .06) K.column(g, "束縛する中指の鎖", w * .08, h * .14, M * .05, lin(KU.glow, KU.thrust - .02, t), { fill: "#fff6cc", stroke: "#3a2600", glow: "#ffd23a", sw: 3 });
        if (t > KU.lock - .03) K.title(g, X, lin(KU.lock - .03, 1, t), { en: "CHAIN JAIL", kj: "束縛する中指の鎖", sub: "KURAPIKA · " + X.env.toName.toUpperCase() + " BOUND FOR 2 TURNS", y: .2, col: "#ffd23a" });
        if (hit(t, KU.thrust, .012)) X.fx.flash = ["#fff6c8", .4];
        function K_rings(Hh) { return handRings(Hh.pose).map(r => r && handPoint(r[0], r[1], Hh.x, Hh.y, Hh.s, Hh.ang, false)); }
    }
};
function drawRoute(g, P, upTo, size, o) { K.drawChain(g, P, 0, upTo, size, o); }
function kuOrigins(X, H) { return handRings(H.pose).map(r => r ? handPoint(r[0], r[1], H.x, H.y, H.s, H.ang, false) : null); }

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
    begin() { document.dispatchEvent(new CustomEvent("timestop", { detail: { key: "jojo_f", ph: "start" } })); },
    tailStart() { document.dispatchEvent(new CustomEvent("timestop", { detail: { key: "jojo_f", ph: "stopped" } })); },
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

/* the page's veil for a card that holds the whole page: style it for this frame (mask, filter...) and paint its top layer (mirrors,
   crystals, the bracelet: above the veil's own filter, the same layer the hold keeps drawing). In a preview there is no page, so the
   paint goes straight onto the scene. */
function veil(X, key, css, paint) {
    if (X.env && X.env.box) document.dispatchEvent(new CustomEvent("timestop", { detail: { key, ph: "grow", css, paint } }));
    else if (paint) { X.g.save(); paint(X.g, X.w, X.h); X.g.restore(); }
}
const tsEv = (key, ph, more) => document.dispatchEvent(new CustomEvent("timestop", { detail: Object.assign({ key, ph }, more) }));
const frozenTail = (col, stroke) => (g, X, T) => { X.reveal(T.tt, .35); K.slam(g, X.env.toName + " · FROZEN ×2", X.w / 2, Math.min(X.h * .5, X.env.r.y + X.env.r.h + X.M * .12), X.M * .055, K.lin(0, 1, T.tt), { fill: "#fff", stroke, glow: col, from: 1.2 }); };
/* a front line with a cold shimmer and a slight colour split. pts(off) returns the line's points pushed off px outward */
function shimmer(g, pts, a, w0 = 2.2) {
    if (a <= 0) return; g.save(); g.globalCompositeOperation = "screen"; g.globalAlpha *= a; g.lineJoin = "round";
    [["rgba(255,90,180,.5)", -3, 3], ["rgba(90,235,255,.6)", 3, 3], ["rgba(255,255,255,.95)", 0, w0]].forEach(([c, off, lw]) => { const P = pts(off); g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); });
    g.restore();
}
/* time that runs normally, then brakes smoothly to a dead stop between a and b (first derivative 1 → 0) */
const brake = (a, b) => t => { if (t < a) return t; const u = Math.min(1, (t - a) / (b - a)); return a + (b - a) * (u - u * u / 2); };

/* ---------- HAKU · Secret Jutsu: Crystal Ice Mirrors, first person, drawn OVER the real table: Haku's pale hands in the dark-green
   sleeves of his hunter-nin outfit start apart, come together and run through the seals (Ram, Dog, Horse) to Tiger, cold mist and ice
   motes gathering on his fingers; the final seal lands on the peak of the voice. Blue ice spreads out from his hands in a wave over the
   table, cards, UI and page (the page's .mirror-veil, revealed by a mask that grows with it); tall frameless ice mirrors rise round
   the screen, long crystals fly out of them into the middle of the table and stick there, and the world slows to a stop. The mirrors
   and crystals are painted on the veil's top layer, the same one the hold keeps (holds.js hakuMirrors / hakuSpikes). ---------- */
const HK = { join: .065, s1: .115, s2: .16, s3: .205, seal: .256, edge: .38, rise: .4, risen: .5, thr: .552, stab: .59, lock: .726, still: .82 };
const hkSlow = brake(HK.lock - .06, HK.still);
const HK_SLEEVE = { c: "#35513f", s: "#1d3226", cuff: "#cfe0d4", len: 420, w: 70 };
const HK_ICE = { c: "#e2f4ff", s: "#a6d2f0", cuff: "#d8efff", len: 420, w: 70 };
/* the seals as two hands about a centre (dx, dy in units of the hand scale; ang; pose; view). Right hand first, then the left (mirrored) */
const SEALS = [
    { k: "", R: [165, 70, .26, "relax"], L: [-165, 70, -.26, "relax"] },                              // apart, calm
    { k: "未", R: [26, 40, -.1, "two"], L: [-18, 6, .06, "two"], top: "R" },                          // Ram: two fingers up, the right hand over the left
    { k: "戌", R: [74, -92, -1.52, "blade"], L: [-6, 40, .1, "fist"], top: "R" },                      // Dog: the right palm flat on the left fist
    { k: "午", R: [88, 40, -.36, "pointT"], L: [-88, 40, .36, "pointT"], top: "L" },                  // Horse: index fingers and thumbs meet in a triangle
    { k: "寅", R: [20, 26, -.07, "two"], L: [-20, 26, .07, "two"], top: "R" }                         // Tiger: both pairs of fingers up, pressed together
];
const HK_AT = [0, HK.s1, HK.s2, HK.s3, HK.seal];
function hakuHands(X, t) {      // which seal, and how far into the snap from the last one
    let i = 0; while (i < HK_AT.length - 1 && t >= HK_AT[i + 1] - (i === 0 ? .05 : .022)) i++;
    const len = i === 1 ? .05 : .022, q = i ? K.ioCub(lin(HK_AT[i] - len, HK_AT[i], t)) : 1;
    return { i, q, A: SEALS[Math.max(0, i - 1)], B: SEALS[i] };
}
const haku = {
    col: "#8fdcff", ms: 8100, voiceAt: 2600, voiceEnd: 5.6, mainPlus: 600, grain: 0, breath: t => t < HK.seal,
    seal: () => {},
    begin() { tsEv("naruto_f", "start"); },
    tailStart(X) { tsEv("naruto_f", "stopped"); },
    tail: frozenTail("#8fdcff", "#0a2a44"),
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, st = hkSlow(t), sM = st * X.main / 1000, sealed = t >= HK.seal;
        X.cue(.0, "wind", t); [HK.s1, HK.s2, HK.s3].forEach(a => X.cue(a, "seal", t)); X.cue(HK.seal, "seal", t); X.cue(HK.seal + .002, "freeze", t); X.cue(HK.seal + .03, "crack", t);
        X.cue(HK.rise, "shing", t); X.cue(HK.rise + .03, "chime", t); X.cue(HK.rise + .07, "shing", t); X.cue(HK.thr, "whoosh", t); X.cue(HK.stab, "strike", t); X.cue(HK.stab + .006, "crack", t); X.cue(HK.lock, "freeze", t);
        if (t < .03) { g.fillStyle = "rgba(0,0,0," + (1 - t / .03) * .85 + ")"; g.fillRect(0, 0, w, h); }
        const sc = HS(X) * .78, C = [w / 2, h * .74 - K.ioCub(lin(0, HK.join, t)) * h * .04], S = hakuHands(X, t);
        const core = [C[0], C[1] - sc * 150];                                              // where the cold gathers: just above the joined fingers
        const R = Math.hypot(w, h) * 1.06 * K.oCub(lin(HK.seal, HK.edge, st)), fr = lin(HK.seal, HK.edge, st);
        const mirrors = X.env._hkM || (X.env._hkM = H.hakuMirrors(w, h)), spikes = X.env._hkS || (X.env._hkS = H.hakuSpikes(w, h, mirrors, H.hakuKeep(w, h)));
        veil(X, "naruto_f", sealed ? { "--x": core[0].toFixed(1) + "px", "--y": core[1].toFixed(1) + "px", "--r": R.toFixed(1) + "px" } : { "--r": "0px" }, (gg) => {
            mirrors.forEach(m => H.iceMirror(gg, m, { rise: lin(HK.rise + m.i * .007, HK.risen + m.i * .007, t), t: sM, art: X.art, focus: X.focus }));
            spikes.forEach(s => { if (t >= HK.stab + s.k * .002) H.iceSpike(gg, s, 1, { glint: lin(HK.stab, HK.stab + .1, t) }); });
        });
        // cold mist pooling round the hands and ice motes drawn in, thicker with every seal
        const gather = lin(HK.join, HK.seal, t);
        g.save(); for (let i = 0; i < 9; i++) { const u = (sM * .22 + i / 9) % 1, an = i * 2.4; K.pool(g, core[0] + Math.cos(an) * M * .18 * (1 - u), core[1] + sc * 60 + Math.sin(an) * M * .1 * (1 - u), M * (.05 + .1 * u), "#e2f4ff", (.1 + .22 * gather) * Math.sin(u * Math.PI) * (1 - lin(HK.lock, 1, t) * .6)); } g.restore();
        // the hands: a quick, clean snap from one seal to the next, held still on each
        const pose = (P, side) => ({ x: C[0] + P[0] * sc, y: C[1] + P[1] * sc, a: P[2], pose: P[3], side });
        const lerp = (a, b, q) => ({ x: K.mix(a.x, b.x, q), y: K.mix(a.y, b.y, q), a: K.mix(a.a, b.a, q), pose: q < .5 ? a.pose : b.pose, side: a.side });
        const hR = lerp(pose(S.A.R, 1), pose(S.B.R, 1), S.q), hL = lerp(pose(S.A.L, -1), pose(S.B.L, -1), S.q), snap = S.i && S.q < 1 ? Math.sin(S.q * Math.PI) : 0;
        const settle = S.i ? K.hit(t, HK_AT[S.i], .03) : 0, iced = ss(HK.seal + .005, HK.seal + .09, t);
        const draw1 = H1 => { const y = H1.y + settle * M * .006, o = { view: "back", skin: "pale", flip: H1.side < 0, sleeve: HK_SLEEVE };
            hand(g, H1.x, y, sc, H1.a, H1.pose, o); if (iced > 0) { g.save(); g.globalAlpha *= iced * .78; hand(g, H1.x, y, sc, H1.a, H1.pose, Object.assign({}, o, { skin: "ice", rim: "#e6f6ff", sleeve: HK_ICE })); g.restore(); } };
        if (snap > .05) K.streaks(g, w, h, sM, -Math.PI / 2, { n: 14, col: "#e6f6ff", a: .18 * snap, speed: 6 });
        if ((S.B.top || "R") === "R") { draw1(hL); draw1(hR); } else { draw1(hR); draw1(hL); }
        // frost creeping over the fingers and motes glinting on the tips as the seals go by
        const tipsR = handTips(hR.pose).slice(0, 2), sn = Math.sin(hR.a), cs = Math.cos(hR.a);
        if (gather > 0 && !sealed) tipsR.forEach(([x0, y0], k) => { const x = hR.x + (x0 * cs - y0 * sn) * sc, y = hR.y + (x0 * sn + y0 * cs) * sc; K.glow(g, x, y, M * (.02 + .03 * gather), "#cfeeff", .5 * gather); K.snowflake(g, x + (k ? 8 : -8), y - M * .02, M * .012 * (.5 + gather), Math.min(1, gather * 1.4), sM + k, "#ffffff"); });
        g.save(); g.globalCompositeOperation = "lighter"; for (let i = 0; i < 26; i++) { const u = (sM * (.35 + .2 * hs(i)) + hs(i * 3)) % 1, an = hs(i * 5) * TAU + sM * .3, d = M * (.32 - .28 * u); const x = core[0] + Math.cos(an) * d, y = core[1] + sc * 40 + Math.sin(an) * d * .6;
            g.globalAlpha = gather * Math.sin(u * Math.PI) * .9 * (sealed ? 1 - lin(HK.seal, HK.seal + .05, t) : 1); g.fillStyle = "#ffffff"; g.fillRect(x - 1.2, y - 1.2, 2.4, 2.4); } g.restore();
        if (S.i && S.B.k && S.q >= 1 && t < HK.seal + .07) { const k = lin(HK_AT[S.i], HK_AT[S.i] + .05, t); K.txt(g, S.B.k, C[0] + sc * (S.i % 2 ? 150 : -150), C[1] - sc * 120, M * .05, { font: K.F_JP, weight: "400", fill: "#f2fbff", stroke: "#0a2a44", glow: "#8fdcff", sw: 3 }); }
        if (t > .02 && t < HK.seal + .1) { g.save(); g.globalAlpha = 1 - lin(HK.seal + .04, HK.seal + .1, t); K.column(g, "秘術", w * .08, h * .16, M * .07, lin(.02, .1, t), { fill: "#f4fbff", stroke: "#0a2a44", glow: "#8fdcff", sw: 3 }); g.restore(); }
        if (sealed) {
            const bq = lin(HK.seal, HK.seal + .05, t); if (bq < 1) { K.glow(g, core[0], core[1], M * .4 * (1 - bq * .4), "#e6f6ff", 1 - bq); K.shock(g, core[0], core[1], bq, M * .55, "#dff4ff", 22); }
            // frost lines branching out ahead of the ice
            g.save(); g.lineCap = "round"; const fa = 1 - lin(HK.edge, HK.lock, t);
            for (let k = 0; k < 12; k++) { let an = k / 12 * TAU + .2, x = core[0], y = core[1]; const Lk = Math.min(R * .96, Math.hypot(w, h) * (.4 + .45 * hs(k + 2))); if (Lk < 6) continue;
                g.globalAlpha = fa * .8; g.strokeStyle = "#f2faff"; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x, y);
                for (let j = 1; j <= 10; j++) { an += (hs(k * 11 + j) - .5) * .4; const nx = x + Math.cos(an) * Lk / 10, ny = y + Math.sin(an) * Lk / 10; g.lineTo(nx, ny); if (j % 3 === 0) { g.moveTo(nx, ny); g.lineTo(nx + Math.cos(an + .9) * Lk / 16, ny + Math.sin(an + .9) * Lk / 16); g.moveTo(nx, ny); } x = nx; y = ny; } g.stroke(); }
            g.restore();
            if (fr < 1) {                                                         // the wave's front: glassy, with a cold shimmer and a slight colour split, small crystals riding it
                const front = (an, off) => R * (1 + .04 * Math.sin(an * 7 + 1.1) + .025 * Math.sin(an * 15)) + off;
                shimmer(g, off => { const P = []; for (let i = 0; i <= 140; i++) { const an = i / 140 * TAU, rr = front(an, off); P.push([core[0] + Math.cos(an) * rr, core[1] + Math.sin(an) * rr]); } return P; }, 1);
                g.save(); for (let i = 0; i < 60; i++) { const an = (i + hs(i) * .6) / 60 * TAU, rr = front(an, 0), sz = M * (.014 + .022 * hs(i + 9)); g.translate(core[0] + Math.cos(an) * rr, core[1] + Math.sin(an) * rr); g.rotate(an);
                    g.beginPath(); g.moveTo(sz * 1.3, 0); g.lineTo(-sz * .2, -sz * .3); g.lineTo(-sz * .5, 0); g.lineTo(-sz * .2, sz * .3); g.closePath(); g.fillStyle = "rgba(235,248,255,.8)"; g.fill(); g.setTransform(X.dpr || 1, 0, 0, X.dpr || 1, 0, 0); } g.restore();
            }
            // the crystals in flight: a cold streak behind each, a burst of frost where it bites into the table
            spikes.forEach(s => { const t0 = HK.thr + s.k * .004, t1 = HK.stab + s.k * .002, q = K.ioCub(lin(t0, t1, t)); if (t < t0) return;
                if (q < 1) { const x = K.mix(s.sx, s.tx, q), y = K.mix(s.sy, s.ty, q), bx = x - Math.cos(s.a) * s.len * 1.6, by = y - Math.sin(s.a) * s.len * 1.6; g.save(); g.globalCompositeOperation = "lighter"; const tg = g.createLinearGradient(bx, by, x, y); tg.addColorStop(0, "rgba(160,220,255,0)"); tg.addColorStop(1, "rgba(220,244,255,.55)"); g.strokeStyle = tg; g.lineWidth = s.wd * 1.4; g.lineCap = "round"; g.beginPath(); g.moveTo(bx, by); g.lineTo(x, y); g.stroke(); g.restore();
                    H.iceSpike(g, s, q, {}); }
                const bq = lin(t1, t1 + .06, t); if (bq > 0 && bq < 1) { K.glow(g, s.tx, s.ty, M * .05, "#e6f6ff", .8 * (1 - bq)); K.sparks(g, s.tx, s.ty, bq, 12, s.k * 7, { speed: M * .16, col: "#e6f6ff" }); } });
            // cold mist drifting and ice motes glinting, both braking to a stop
            g.save(); for (let i = 0; i < 12; i++) { const u = (hs(i + 30) + sM * .04) % 1, x = w * (hs(i + 5) + sM * .015 * (hs(i) - .5)), y = h * (.15 + .8 * hs(i + 11)); K.pool(g, x, y, M * (.12 + .1 * hs(i)), "#eef8ff", .1 * Math.min(1, fr * 2) * Math.sin(u * Math.PI)); } g.restore();
            g.save(); g.globalCompositeOperation = "lighter"; for (let i = 0; i < 40; i++) { const d0 = hs(i + 70) * Math.hypot(w, h) * .7; if (d0 > R) continue; const an = hs(i + 80) * TAU, x = core[0] + Math.cos(an) * d0 + Math.sin(sM * .4 + i) * 8, y = core[1] + Math.sin(an) * d0;
                g.globalAlpha = .65 * (.5 + .5 * Math.sin(sM * 4 + i * 2.3)); g.fillStyle = "#fff"; g.save(); g.translate(x, y); g.rotate(i); g.fillRect(-1, -4, 2, 8); g.fillRect(-4, -1, 8, 2); g.restore(); } g.restore();
        }
        if (t > HK.seal - .01 && t < HK.rise) K.slam(g, "魔鏡氷晶", w / 2, h * .2, M * .11, lin(HK.seal - .01, HK.rise, t), { font: K.F_JP, weight: "400", fill: "#f4fbff", stroke: "#0a2a44", glow: "#8fdcff", from: 1.4 });
        if (t > HK.still - .04) K.title(g, X, lin(HK.still - .04, 1, t), { en: "CRYSTAL ICE MIRRORS", kj: "秘術・魔鏡氷晶", sub: "HAKU · " + X.env.toName.toUpperCase() + " FROZEN FOR 2 TURNS", y: .2, col: "#8fdcff" });
        if (hit(t, HK.seal, .012)) X.fx.flash = ["#eaf8ff", .5];
        if (hit(t, HK.stab, .01)) X.fx.flash = ["#ffffff", .25];
    }
};

/* ---------- HIT · Time-Skip Freeze, first person, drawn OVER the real table: Hit's purple hands out of the long sleeves of his dark
   coat, calm and cold; a deep purple aura swells round his arms, crackling out to the screen's edges, and peaks with the voice (his hands
   close into fists). Light-red ice grows in from every edge of the screen to the middle (the page's .skip-veil, revealed from the edges,
   its crystals painted on the veil's top layer), then every colour fades to a washed-out light grey while time brakes to a stop. ---------- */
const HT = { pulse: .128, peak: .324, ice: .33, edge: .52, gray0: .53, gray1: .68, still: .76 };
const htSlow = brake(.6, HT.still);
const HIT_SKIN = { l: "#e6d0ff", b: "#a97ce2", s: "#774bb4", d: "#452274", ink: "#170628", nail: "#efe2ff" };     // Hit's purple skin
const HIT_SLEEVE = { c: "#2b2235", s: "#140e1b", cuff: "#43345a", len: 440, w: 70 };
/* the edge-in front of the ice: e (0 at the edges .. max at the centre) → a CSS mask of four bands growing from the four edges */
function edgeMask(D) { const a = Math.max(0, D - 46).toFixed(0) + "px", b = Math.max(1, D).toFixed(0) + "px"; return ["bottom", "top", "right", "left"].map(d => "linear-gradient(to " + d + ", #000 " + a + ", transparent " + b + ")").join(","); }
const hitScene = {
    col: "#b07cff", ms: 8180, mainPlus: 2600, grain: 0, breath: t => t < HT.peak + .04,
    seal: () => {},
    begin() { tsEv("dragonball_f", "start"); },
    tailStart(X) { tsEv("dragonball_f", "stopped"); },
    tail: frozenTail("#d9c6ff", "#2a1040"),
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, st = htSlow(t), sM = st * X.main / 1000, peaked = t >= HT.peak;
        X.cue(.0, "rumble", t); X.cue(.06, "charge", t); X.cue(HT.pulse, "zap", t); X.cue(.22, "charge", t); X.cue(HT.peak - .003, "boom", t); X.cue(HT.peak, "zap", t);
        X.cue(HT.ice, "freeze", t); [.37, .42, .47].forEach(a => X.cue(a, "crack", t)); X.cue(HT.edge - .01, "shing", t); [HT.gray0, .58, .64, .71].forEach(a => X.cue(a, "tick", t));
        if (t < .03) { g.fillStyle = "rgba(0,0,0," + (1 - t / .03) * .85 + ")"; g.fillRect(0, 0, w, h); }
        const ch = lin(.02, HT.peak, t), pw = Math.pow(ch, 1.4), boost = hit(t, HT.pulse, .05) * .4 + hit(t, HT.peak, .08), aura = Math.min(1.2, pw + boost * .6 + X.vox * .25) * (peaked ? 1 - lin(HT.gray0, HT.gray1, t) * .55 : 1);
        // the aura reaching the edges of the screen: a deep purple glow breathing in from the borders
        g.save(); g.globalCompositeOperation = "lighter"; K.vignette(g, w, h, .55 * aura, "#7a2cff", .4); g.restore();
        if (aura > .1) H.hitArcs(g, w, h, sM, Math.min(1, aura) * (1 - lin(HT.gray1, HT.still, t)));
        // the hands: calm at his sides, slowly rising, trembling as the power peaks, closing into fists on it
        const sc = HS(X) * .82, trem = (hs(Math.floor(sM * 30)) - .5) * M * .004 * pw * (peaked ? 1 - lin(HT.peak, HT.peak + .08, t) : 1), up = K.ioCub(lin(.05, HT.peak, t)), fistQ = ss(HT.peak - .015, HT.peak + .005, t);
        const arm = side => {
            const x = w / 2 + side * K.mix(w * .3, w * .23, up) + trem * side, y = K.mix(h * .9, h * .76, up) + trem, a = side * K.mix(-.42, -.22, up) - side * fistQ * .08;
            const pose = fistQ > .5 ? "claw" : up > .5 ? "open" : "relax", o = { view: "back", skin: HIT_SKIN, flip: side < 0, sleeve: HIT_SLEEVE };
            // flames of aura licking up off the arm
            g.save(); g.globalCompositeOperation = "lighter"; for (let i = 0; i < 16; i++) { const u = (sM * (1.1 + hs(i + side * 9)) + hs(i * 3 + side)) % 1, px = x + (hs(i * 7 + side) - .5) * sc * 150, py = y + sc * (60 - 230 * hs(i * 5)) - u * sc * 160;
                const L = sc * (30 + 50 * hs(i)) * aura; g.globalAlpha = Math.sin(u * Math.PI) * .55 * Math.min(1, aura); const fg = g.createLinearGradient(px, py, px, py - L); fg.addColorStop(0, "rgba(140,60,255,.0)"); fg.addColorStop(.4, "rgba(170,90,255,.8)"); fg.addColorStop(1, "rgba(235,215,255,0)");
                g.fillStyle = fg; g.beginPath(); g.moveTo(px - L * .16, py); g.quadraticCurveTo(px - L * .1, py - L * .6, px + Math.sin(sM * 6 + i) * L * .12, py - L); g.quadraticCurveTo(px + L * .12, py - L * .5, px + L * .16, py); g.closePath(); g.fill(); } g.restore();
            g.save(); g.globalCompositeOperation = "lighter"; K.glow(g, x + Math.sin(a) * sc * 70, y - Math.cos(a) * sc * 70, sc * 150, "#8a3cff", .5 * Math.min(1, aura)); g.restore();   // the aura behind the hand
            hand(g, x, y, sc, a, pose, Object.assign(o, { rim: aura > .2 ? "#cfa8ff" : null }));
            // crackling energy round the hand
            if (aura > .3) { g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = "rgba(225,200,255,.85)"; g.lineWidth = 1.4; const fr = Math.floor(sM * 14) + (side > 0 ? 0 : 50);
                for (let k = 0; k < 3; k++) { if (hs(fr + k * 7) < .4) continue; let bx = x + (hs(fr * 3 + k) - .5) * sc * 140, by = y - sc * (40 + 120 * hs(fr + k * 5)); g.beginPath(); g.moveTo(bx, by); for (let j = 0; j < 5; j++) { bx += (hs(fr * 5 + k * 3 + j) - .5) * sc * 50; by += (hs(fr * 7 + k + j) - .5) * sc * 50; g.lineTo(bx, by); } g.globalAlpha = Math.min(1, aura - .3); g.stroke(); } g.restore(); }
        };
        arm(-1); arm(1);
        // the peak: the aura bursts
        const bq = lin(HT.peak, HT.peak + .07, t); if (bq > 0 && bq < 1) { K.shock(g, w / 2, h * .8, bq, Math.hypot(w, h) * .8, "#b07cff", 40); K.glow(g, w / 2, h * .82, M * .7 * (1 - bq * .3), "#9c5cff", .6 * (1 - bq)); }
        // the light-red ice: crystals grow in from the edges, the page's veil follows the same front
        const front = 1.12 * K.oCub(lin(HT.ice, HT.edge, st)), D = front * M / 2, g1 = ss(HT.gray0, HT.gray1, t);
        const crys = X.env._htC || (X.env._htC = H.hitCrystals(w, h));
        const full = D >= M / 2 + 48;
        veil(X, "dragonball_f", { "-webkit-mask-image": full ? "none" : edgeMask(D), "mask-image": full ? "none" : edgeMask(D),
            "--f": "grayscale(" + (.86 * g1).toFixed(3) + ") brightness(" + (1 + .1 * g1).toFixed(3) + ") contrast(" + (1 - .14 * g1).toFixed(3) + ")", "--wash": g1.toFixed(3), "--red": Math.min(1, front * 1.5).toFixed(3) }, gg => {
            if (front > 0) crys.forEach(c => { const q = (front - Math.max(0, c.e)) / .14; if (q > 0) K.crystalDraw(gg, c, Math.min(1, q), q < 1.4 ? .5 * (1 - (q - .4)) : 0, H.HIT_PAL); });
            if (peaked) H.hitArcs(gg, w, h, sM, .55 * (1 - lin(HT.gray1, HT.still, t) * .7));
        });
        if (front > 0 && D < M / 2 - 6) {                                   // the front: a cold shimmer and a slight colour split running round the screen, inward
            shimmer(g, off => { const i = Math.max(0, D - off); return [[i, i], [w - i, i], [w - i, h - i], [i, h - i], [i, i]]; }, 1 - ss(.55, .85, D / (M / 2)), 2);
        }
        if (t > .02 && t < HT.peak + .1) K.slam(g, "時飛ばし", w / 2, h * .2, M * .12, lin(.02, HT.peak + .1, t), { font: K.F_JP, weight: "400", fill: "#f2e8ff", stroke: "#2a1040", glow: "#b07cff", from: 1.3 });
        if (t > HT.still - .03) K.title(g, X, lin(HT.still - .03, 1, t), { en: "TIME-SKIP FREEZE", kj: "時飛ばし", sub: "HIT · " + X.env.toName.toUpperCase() + " FROZEN FOR 2 TURNS", y: .2, col: "#c9a6ff" });
        X.fx.rgb = hit(t, HT.peak, .06) * 14;
        if (hit(t, HT.peak, .014)) X.fx.flash = ["#efe2ff", .55];
    }
};

/* ---------- DOMA · Frozen Lotus, first person, drawn OVER the real table: Doma's pale hands in the wide black sleeves of his robes hold
   his two sharp golden fans (a maroon lotus and a green leaf on each); smiling and lazy, he fans himself, then on the voice's peak sweeps
   both fans outward in one smooth arc and the ice pours off their edges: heavy, rough, layered frost with cold air rolling over it, a
   few specks of blood and a thin purple poison mist sitting on it (the page's .lotus-veil, revealed along the sweep). ---------- */
/* the ice revealed as a union of growing circles (a CSS mask) */
const maskOf = circ => circ.some(c => c[2] > 1) ? circ.map(([x, y, r]) => "radial-gradient(circle at " + x.toFixed(0) + "px " + y.toFixed(0) + "px, #000 " + Math.max(0, r - 60).toFixed(0) + "px, transparent " + Math.max(1, r).toFixed(0) + "px)").join(",") : "linear-gradient(transparent, transparent)";
const DM = { sweep: .296, rel: .402, end: .47, edge: .58, lock: .64, still: .72 };
const dmSlow = brake(DM.lock - .04, DM.still);
const DM_SLEEVE = { c: "#231a20", s: "#0d0a0c", cuff: "#c79a3a", len: 440, w: 86 };
const DM_ICE = { c: "#e6f3fb", s: "#a9cbe3", cuff: "#d9ecf8", len: 440, w: 86 };
function domaFan(g, x, y, R, ang, open, frost) {
    const sp = 2.5 * open, a0 = -Math.PI / 2 - sp / 2, a1 = -Math.PI / 2 + sp / 2, n = 15;
    g.save(); g.translate(x, y); g.rotate(ang); g.lineJoin = "round";
    const leaf = () => { g.beginPath(); g.arc(0, 0, R * .3, a0, a1); for (let k = 24; k >= 0; k--) { const an = a0 + sp * k / 24, rr = R * (k % 2 ? .955 : 1.04); g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } g.closePath(); };   // the sharp edge: a row of small blades
    leaf(); const gr = g.createRadialGradient(0, 0, R * .3, 0, 0, R * 1.04); gr.addColorStop(0, "#9a6a14"); gr.addColorStop(.25, "#e8bc48"); gr.addColorStop(.7, "#ffe49a"); gr.addColorStop(.93, "#f0c860"); gr.addColorStop(1, "#fff4c8"); g.fillStyle = gr; g.fill();
    g.save(); leaf(); g.clip();
    const pt = (f, r) => { const an = a0 + sp * f; return [Math.cos(an) * R * r, Math.sin(an) * R * r]; };
    const lp = pt(.34, .63), lr = R * .27;                                                      // the maroon lotus
    g.save(); g.translate(lp[0], lp[1]); g.rotate(a0 + sp * .36 + Math.PI / 2);
    [[-1.05, .8], [1.05, .8], [-.55, .95], [.55, .95], [0, 1]].forEach(([an, k]) => { g.save(); g.rotate(an); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(lr * .42 * k, -lr * .3, lr * .3 * k, -lr * .85, 0, -lr * k); g.bezierCurveTo(-lr * .3 * k, -lr * .85, -lr * .42 * k, -lr * .3, 0, 0); const pg = g.createLinearGradient(0, 0, 0, -lr); pg.addColorStop(0, "#5a0c22"); pg.addColorStop(.7, "#8c1a36"); pg.addColorStop(1, "#c04a68"); g.fillStyle = pg; g.fill(); g.strokeStyle = "#3a0614"; g.lineWidth = 1; g.stroke(); g.restore(); });
    g.fillStyle = "#e8b83a"; g.beginPath(); g.ellipse(0, -lr * .12, lr * .16, lr * .1, 0, 0, TAU); g.fill(); g.restore();
    const gp = pt(.72, .62), gR = R * .2;                                                       // the green leaf
    g.save(); g.translate(gp[0], gp[1]); g.rotate(a0 + sp * .7); g.beginPath(); g.arc(0, 0, gR, .35, TAU - .35); g.lineTo(0, 0); g.closePath(); const lg = g.createRadialGradient(0, 0, 0, 0, 0, gR); lg.addColorStop(0, "#5f9a44"); lg.addColorStop(1, "#2e5e2a"); g.fillStyle = lg; g.fill(); g.strokeStyle = "#1c3c1a"; g.lineWidth = 1; g.stroke();
    g.strokeStyle = "rgba(200,235,170,.55)"; g.lineWidth = .9; for (let k = 0; k < 7; k++) { const an = .5 + k / 6 * (TAU - 1); g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(an) * gR * .9, Math.sin(an) * gR * .9); g.stroke(); } g.restore();
    const sh = g.createLinearGradient(-R, -R, R, R * .2); sh.addColorStop(0, "rgba(255,255,255,0)"); sh.addColorStop(.48, "rgba(255,255,255,.28)"); sh.addColorStop(.56, "rgba(255,255,255,0)"); g.fillStyle = sh; g.fillRect(-R * 1.1, -R * 1.1, R * 2.2, R * 1.2);   // the metal's sheen
    if (frost > 0) { g.globalAlpha = frost; g.fillStyle = "rgba(225,242,255,.55)"; g.fillRect(-R * 1.1, -R * 1.1, R * 2.2, R * 1.2); g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 1; g.beginPath(); for (let k = 0; k < 9; k++) K.frost(g, Math.cos(a0 + sp * hs(k)) * R * .95, Math.sin(a0 + sp * hs(k)) * R * .95, a0 + sp * hs(k) + Math.PI + (hs(k * 3) - .5), R * .3, frost, 0, k); g.stroke(); g.globalAlpha = 1; }
    g.restore();
    g.strokeStyle = "#4a2e06"; for (let i = 0; i <= n; i++) { const an = a0 + sp * i / n; g.lineWidth = i === 0 || i === n ? 3.4 : 1.3; g.beginPath(); g.moveTo(Math.cos(an) * R * .05, Math.sin(an) * R * .05); g.lineTo(Math.cos(an) * R * (i === 0 || i === n ? 1.0 : .3), Math.sin(an) * R * (i === 0 || i === n ? 1.0 : .3)); g.stroke(); }   // the sticks and the two guards
    leaf(); g.strokeStyle = "#5a3a08"; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = "#3a2200"; g.beginPath(); g.arc(0, 0, R * .045, 0, TAU); g.fill(); g.fillStyle = "#ffe7a0"; g.beginPath(); g.arc(-R * .012, -R * .012, R * .015, 0, TAU); g.fill();   // the rivet
    g.restore();
}
/* where Doma's hands are: lazy fanning → the two fans crossed in front → one smooth sweep outward (fastest on the peak) */
function domaPose(X, t, side) {
    const { w, h } = X, lazy = 1 - ss(DM.sweep - .05, DM.sweep, t), sw = K.ioCub(lin(DM.sweep, DM.end, t)), gath = ss(DM.sweep - .06, DM.sweep, t) * (1 - sw);
    const x0 = w / 2 + side * w * (side > 0 ? .25 : .27), y0 = h * (side > 0 ? .86 : .92), a0 = side * (side > 0 ? -.35 : .25) + (side > 0 ? Math.sin(t * X.main / 1000 * 2.4) * .14 * lazy : 0);
    const xc = w / 2 - side * w * .05, yc = h * .8, ac = -side * .55, x1 = w / 2 + side * w * .27, y1 = h * .78, a1 = side * .72;
    if (t < DM.sweep) return { x: K.mix(x0, xc, gath), y: K.mix(y0, yc, gath), a: K.mix(a0, ac, gath) };
    const arc = Math.sin(sw * Math.PI) * h * .1;
    return { x: K.mix(xc, x1, sw), y: K.mix(yc, y1, sw) - arc, a: K.mix(ac, a1, sw) };
}
function domaFanAt(X, t, side) { const P = domaPose(X, t, side), sc = HS(X) * .86, p = handPoint(-4, -104, P.x, P.y, sc, P.a, side < 0); return { P, sc, px: p[0], py: p[1], R: X.M * .3, a: P.a }; }
const doma = {
    col: "#c9a6ff", ms: 7590, mainPlus: 3000, grain: 0, breath: t => t < DM.rel,
    seal: () => {},
    begin() { tsEv("demonslayer_f", "start"); },
    tailStart(X) { tsEv("demonslayer_f", "stopped"); },
    tail: frozenTail("#d8b8ff", "#2a0a2a"),
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, st = dmSlow(t), sM = st * X.main / 1000, rel = t >= DM.rel;
        X.cue(.0, "wind", t); X.cue(.03, "open", t); X.cue(DM.sweep, "whoosh", t); X.cue(DM.rel - .02, "whoosh", t); X.cue(DM.rel, "freeze", t); X.cue(DM.rel + .003, "crack", t); [.44, .49, .54].forEach(a => X.cue(a, "crack", t)); X.cue(DM.edge, "creak", t); X.cue(DM.lock, "shing", t);
        if (t < .03) { g.fillStyle = "rgba(0,0,0," + (1 - t / .03) * .85 + ")"; g.fillRect(0, 0, w, h); }
        // the sweep's path: where the fans' edges cut through the air; the ice pours out of it
        const arcPts = X.env._dmA || (X.env._dmA = (() => { const L = []; [1, -1].forEach(sd => { for (let k = 0; k <= 4; k++) { const tt = DM.sweep + (DM.end - DM.sweep) * (.2 + .2 * k), F = domaFanAt(X, tt, sd), an = F.a - Math.PI / 2; L.push([F.px + Math.cos(an) * F.R * .9, F.py + Math.sin(an) * F.R * .9, k * .012]); } }); return L; })());
        const Rmax = Math.hypot(w, h) * .95, circ = arcPts.map(([x, y, d]) => [x, y, Rmax * K.oCub(lin(DM.rel + d, DM.edge + d, st))]);
        veil(X, "demonslayer_f", rel ? { "-webkit-mask-image": maskOf(circ), "mask-image": maskOf(circ) } : null, null);
        // the cold before: a breath of frost and a few lotus-shaped ice motes drifting off the fans
        g.save(); for (let i = 0; i < 7; i++) { const u = (sM * .04 + i / 7) % 1; K.pool(g, w * (-.1 + 1.2 * u), h * (.62 + .1 * Math.sin(i * 2.1)), M * .26, "#eef6ff", .08 * Math.sin(u * Math.PI)); } g.restore();
        if (rel) {
            // frost lines, rough and branching, racing out of the sweep
            g.save(); g.lineCap = "round"; const fa = 1 - lin(DM.edge, DM.lock + .04, t);
            circ.forEach(([x0, y0, r], k) => { if (r < 8) return; for (let j = 0; j < 3; j++) { let an = hs(k * 5 + j) * TAU, x = x0, y = y0; const Lk = Math.min(r * .95, M * (.3 + .4 * hs(k * 3 + j))); g.globalAlpha = fa * .7; g.strokeStyle = "#f4fbff"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y);
                for (let s = 1; s <= 8; s++) { an += (hs(k * 31 + j * 7 + s) - .5) * .6; x += Math.cos(an) * Lk / 8; y += Math.sin(an) * Lk / 8; g.lineTo(x, y); if (s % 2 === 0) { g.lineTo(x + Math.cos(an + 1.1) * Lk / 14, y + Math.sin(an + 1.1) * Lk / 14); g.moveTo(x, y); } } g.stroke(); } });
            g.restore();
            // the front: only where it is the outermost, a cold shimmer and a slight colour split, rough crystals riding it
            const fq = 1 - lin(DM.edge - .05, DM.edge, st);
            if (fq > 0) circ.forEach(([x0, y0, r], k) => { if (r < 10) return; const segs = []; let cur = null;
                for (let i = 0; i <= 90; i++) { const an = i / 90 * TAU, px = x0 + Math.cos(an) * r, py = y0 + Math.sin(an) * r, out = circ.every(([x1, y1, r1], j) => j === k || Math.hypot(px - x1, py - y1) > r1 - 2) && px > -20 && py > -20 && px < w + 20 && py < h + 20;
                    if (out) { if (!cur) segs.push(cur = []); cur.push(an); } else cur = null; }
                segs.forEach(sg => { if (sg.length < 2) return; shimmer(g, off => sg.map(an => [x0 + Math.cos(an) * (r + off), y0 + Math.sin(an) * (r + off)]), fq, 2.4);
                    sg.forEach((an, i) => { if (i % 3) return; const x = x0 + Math.cos(an) * r, y = y0 + Math.sin(an) * r, sz = M * (.012 + .016 * hs(k * 50 + i)); g.save(); g.globalAlpha = fq * .85; g.translate(x, y); g.rotate(an); g.beginPath(); g.moveTo(sz * 1.4, 0); g.lineTo(sz * .2, -sz * .5); g.lineTo(-sz * .6, -sz * .2); g.lineTo(-sz * .4, sz * .4); g.lineTo(sz * .3, sz * .45); g.closePath(); g.fillStyle = "rgba(236,246,255,.85)"; g.fill(); g.restore(); }); }); });
            // cold air rolling over the ice in the sweep's direction, and the purple poison mist settling on it
            const sp = ss(DM.rel, DM.edge, st);
            g.save(); for (let i = 0; i < 12; i++) { const u = (hs(i + 9) + sM * .05 * (i % 2 ? 1 : -1) + 1) % 1, x = w * (-.1 + 1.2 * u), y = h * (.12 + .8 * hs(i + 3)); K.pool(g, x, y, M * (.14 + .1 * hs(i)), i % 3 ? "#eef7ff" : "#b98cf0", (i % 3 ? .12 : .1) * sp); } g.restore();
            const bq = lin(DM.rel, DM.rel + .06, t); if (bq < 1) arcPts.forEach(([x, y], k) => { if (k % 2) return; K.glow(g, x, y, M * .14 * (1 - bq * .5), "#e6f2ff", .7 * (1 - bq)); });
        }
        // the fans and the hands that hold them: lazy, then the sweep; the ice takes them as it passes
        const iced = ss(DM.rel + .01, DM.rel + .1, t);
        if (t > DM.sweep - .02 && t < DM.end + .03) { const q = K.bell(t, DM.sweep, DM.end); g.save(); g.globalCompositeOperation = "lighter"; [1, -1].forEach(sd => { for (let k = 0; k < 7; k++) { const tt = t - k * .006, F = domaFanAt(X, tt, sd), an = F.a - Math.PI / 2; K.glow(g, F.px + Math.cos(an) * F.R * .85, F.py + Math.sin(an) * F.R * .85, M * .06, k % 2 ? "#e2f0ff" : "#c9a6ff", q * .3 * (1 - k / 7)); } }); g.restore(); }
        [-1, 1].forEach(sd => { const F = domaFanAt(X, t, sd), o = { view: "back", skin: "pale", flip: sd < 0, sleeve: DM_SLEEVE };
            domaFan(g, F.px, F.py, F.R, F.a, K.oBack(lin(.0, .08, t), 1.2), iced);
            hand(g, F.P.x, F.P.y, F.sc, F.P.a, "fist", o); if (iced > 0) { g.save(); g.globalAlpha *= iced * .75; hand(g, F.P.x, F.P.y, F.sc, F.P.a, "fist", Object.assign({}, o, { skin: "ice", rim: "#e6f2ff", sleeve: DM_ICE })); g.restore(); } });
        if (t < DM.sweep) { g.save(); for (let i = 0; i < 14; i++) { const u = (sM * .12 + hs(i)) % 1, x = w * (.55 + .4 * hs(i + 3)) + Math.sin(sM + i) * 20, y = h * (.75 - u * .6); g.globalAlpha = Math.sin(u * Math.PI) * .7; K.snowflake(g, x, y, M * (.008 + .008 * hs(i)), 1, sM * .5 + i, "#ffffff"); } g.restore(); }
        if (t > .01 && t < DM.rel + .05) { g.save(); g.globalAlpha = 1 - lin(DM.rel, DM.rel + .05, t); K.column(g, "血鬼術", w * .08, h * .16, M * .07, lin(.01, .1, t), { fill: "#fff", stroke: "#3a0a2a", glow: "#c9a6ff", sw: 3 }); g.restore(); }
        if (t > DM.rel - .02 && t < DM.edge) K.slam(g, "蓮葉氷", w / 2, h * .2, M * .12, lin(DM.rel - .02, DM.edge, t), { font: K.F_JP, weight: "400", fill: "#f4fbff", stroke: "#2a0a2a", glow: "#c9a6ff", from: 1.4 });
        if (t > DM.still - .03) K.title(g, X, lin(DM.still - .03, 1, t), { en: "FROZEN LOTUS", kj: "蓮葉氷", sub: "DOMA · " + X.env.toName.toUpperCase() + " FROZEN FOR 2 TURNS", y: .2, col: "#c9a6ff" });
        if (hit(t, DM.rel, .012)) X.fx.flash = ["#f2f6ff", .45];
    }
};

/* ---------- JULIUS · Time Magic: Time Stop, first person, drawn OVER the real table: Julius's hands in the white sleeves of the Wizard
   King's robe with their gold cuffs, his grimoire open in his left hand, its pages glowing faintly while he speaks; he lifts it, the
   pages race, light-blue magic gathers round the book and his free hand, and on the voice's peak the magic is released: a sphere of time
   swells out of the book until the whole screen is inside it (the page's .chrono-veil, a mask growing from the book), a light-blue
   bracelet with white Roman numerals wraps round it, and time brakes to a stop. The bracelet is painted on the veil's top layer, the same
   one the hold keeps turning (holds.js chronoRing). ---------- */
const JU = { lift: .284, flip0: .32, rel: .5, edge: .6, ring: .56, ringed: .66, stop: .685, still: .78 };
const juSlow = brake(.62, JU.still), JU_ROT = .05;
const JU_SLEEVE = { c: "#f4efe6", s: "#cdc3ad", cuff: "#d9a82a", len: 440, w: 76 };
/* the grimoire, open, seen from above: dark leather cover, gold corners, two pages (glowing script on them), one page turning (f 0..1) */
function grimoire(g, x, y, W, Hh, tilt, f, glo, s) {
    g.save(); g.translate(x, y); g.rotate(tilt);
    const top = .86, cw = W * .54, pg = (sd, inset) => { const k = 1 - inset; g.beginPath(); g.moveTo(0, -Hh / 2 * k + 4); g.quadraticCurveTo(sd * cw * .5 * k, -Hh / 2 * k - Hh * .05, sd * cw * top * k, -Hh / 2 * k); g.lineTo(sd * cw * k, Hh / 2 * k); g.quadraticCurveTo(sd * cw * .5 * k, Hh / 2 * k - Hh * .04, 0, Hh / 2 * k + 3); g.closePath(); };
    [-1, 1].forEach(sd => { pg(sd, -.06); const cg = g.createLinearGradient(0, -Hh / 2, 0, Hh / 2); cg.addColorStop(0, "#4a2e1a"); cg.addColorStop(1, "#24140a"); g.fillStyle = cg; g.fill(); g.strokeStyle = "#140a04"; g.lineWidth = 2; g.stroke(); });   // the cover
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { const cx = sx * (sy < 0 ? cw * top * 1.06 : cw * 1.06), cy = sy * Hh / 2 * 1.06; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - sx * W * .07, cy); g.lineTo(cx, cy - sy * W * .07); g.closePath(); g.fillStyle = "#d4a937"; g.fill(); g.strokeStyle = "#6a4a10"; g.lineWidth = 1; g.stroke(); });   // gold corners
    for (let l = 3; l >= 0; l--) [-1, 1].forEach(sd => { pg(sd, l * .008); const pgr = g.createLinearGradient(0, 0, sd * cw, 0); pgr.addColorStop(0, "#c9b78e"); pgr.addColorStop(.12, "#f1e6c8"); pgr.addColorStop(1, "#f7eed6"); g.fillStyle = pgr; g.fill(); g.strokeStyle = "rgba(90,60,20,.45)"; g.lineWidth = 1; g.stroke(); });   // the page block
    g.save(); g.globalCompositeOperation = "lighter"; [-1, 1].forEach(sd => { for (let r = 0; r < 8; r++) { const yy = -Hh * .36 + r * Hh * .095, x0 = sd * cw * .14, x1 = sd * cw * (.78 - (r === 7 ? .3 : 0)); for (let k = 0; k < 7; k++) { const a = x0 + (x1 - x0) * k / 7, b = a + (x1 - x0) / 7 * (.55 + .3 * hs(r * 13 + k + sd)); g.strokeStyle = "rgba(120,200,255," + (.25 + .6 * glo) * (.6 + .4 * Math.sin(s * 3 + r + k)) + ")"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(a, yy); g.lineTo(b, yy); g.stroke(); } } }); g.restore();   // the glowing script
    if (glo > .2) { g.save(); g.globalCompositeOperation = "lighter"; K.glow(g, 0, 0, W * .6, "#7cc4ff", (glo - .2) * .6); g.restore(); }
    if (f > 0 && f < 1) { const k = Math.cos(f * Math.PI); g.save(); g.scale(k, 1); g.translate(0, -Math.sin(f * Math.PI) * Hh * .04); pg(1, .02); const fg = g.createLinearGradient(0, 0, cw, 0); fg.addColorStop(0, "#d8c8a0"); fg.addColorStop(1, k > 0 ? "#fbf3dc" : "#e6d8b4"); g.fillStyle = fg; g.fill(); g.strokeStyle = "rgba(90,60,20,.5)"; g.lineWidth = 1; g.stroke(); g.restore(); }   // a page turning on the spine
    g.strokeStyle = "rgba(60,30,10,.6)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -Hh / 2 + 4); g.lineTo(0, Hh / 2 + 3); g.stroke();
    g.restore();
}
function juBook(X, t) { const { w, h, M } = X, up = K.ioCub(lin(JU.lift, JU.rel - .04, t)), push = K.oBack(lin(JU.rel - .01, JU.rel + .02, t)); return { x: K.mix(w * .4, w * .44, up), y: K.mix(h * .86, h * .64, up) - push * h * .015, W: M * K.mix(.5, .46, up), Hh: M * K.mix(.3, .28, up), tilt: K.mix(-.1, -.05, up) }; }
const julius = {
    col: "#8fd0ff", ms: 8100, voiceEnd: 8.2, mainPlus: 600, grain: 0, breath: t => t < JU.rel,
    seal: () => {},
    begin() { tsEv("blackclover_f", "start"); },
    tailStart(X) { tsEv("blackclover_f", "stopped", { rot: julius.rot(X, 1) }); },
    rot: (X, t) => JU_ROT * (juSlow(t) - JU.ring) * X.main / 1000,
    tail: frozenTail("#8fd0ff", "#06243e"),
    main(g, X, T) {
        const { w, h, M } = X, t = T.t, st = juSlow(t), sM = st * X.main / 1000, rel = t >= JU.rel, B = juBook(X, t);
        X.cue(.0, "wind", t); X.cue(JU.lift, "charge", t); [.33, .36, .39, .42, .45, .475].forEach(a => X.cue(a, "flip", t)); X.cue(JU.rel - .004, "chime", t); X.cue(JU.rel, "toll", t); X.cue(JU.rel + .002, "warp", t); X.cue(JU.ring, "shing", t); X.cue(JU.stop, "chime", t); X.cue(JU.stop + .004, "boom", t);
        [JU.stop + .02, JU.stop + .05, JU.stop + .09].forEach(a => X.cue(a, "tock", t));
        if (t < .03) { g.fillStyle = "rgba(0,0,0," + (1 - t / .03) * .85 + ")"; g.fillRect(0, 0, w, h); }
        const build = lin(JU.lift, JU.rel, t), glo = .15 + .25 * Math.sin(sM * 1.3) * .5 + .85 * build * (rel ? 1 - lin(JU.rel, JU.rel + .1, t) * .6 : 1);
        const core = [B.x, B.y - B.Hh * .1], R = Math.hypot(w, h) * 1.05 * K.oExpo(lin(JU.rel, JU.edge, st)), fr = lin(JU.rel, JU.edge, st);
        const rot = julius.rot(X, t), form = K.ioCub(lin(JU.ring, JU.ringed, t));
        veil(X, "blackclover_f", rel ? { "--x": core[0].toFixed(1) + "px", "--y": core[1].toFixed(1) + "px", "--r": R.toFixed(1) + "px" } : { "--r": "0px" }, gg => {
            if (form > 0) H.chronoRing(gg, w, h, { form, rot, flash: K.hit(t, JU.stop, .08) + K.bell(t, JU.ring, JU.ringed) * .4 });
            if (fr >= 1) H.chronoRipples(gg, w, h, sM, ss(JU.edge, JU.stop, t));
        });
        // the left hand under the book (the fingers hidden behind it, the thumb over the page's edge), the book, then the free right hand
        const lh = HS(X) * .8; hand(g, B.x - B.W * .5, B.y + B.Hh * .5, lh, 1.15 + B.tilt, "relax", { view: "back", skin: "base", flip: true, sleeve: JU_SLEEVE });
        const flipQ = t > JU.flip0 && t < JU.rel ? ((t - JU.flip0) / .03) % 1 : 0;
        grimoire(g, B.x, B.y, B.W, B.Hh, B.tilt, flipQ, glo, sM);
        g.save(); g.translate(B.x - B.W * .47, B.y + B.Hh * .16); g.rotate(.75 + B.tilt); g.lineJoin = "round";   // the thumb over the page's edge, holding it
        g.beginPath(); g.moveTo(-lh * 9, lh * 22); g.quadraticCurveTo(-lh * 10, -lh * 14, 0, -lh * 20); g.quadraticCurveTo(lh * 10, -lh * 14, lh * 9, lh * 22); g.closePath(); const tg = g.createLinearGradient(-lh * 10, 0, lh * 10, 0); tg.addColorStop(0, "#fbd9c2"); tg.addColorStop(.62, "#fbd9c2"); tg.addColorStop(.63, "#e5a98e"); tg.addColorStop(1, "#e5a98e"); g.fillStyle = tg; g.fill(); g.strokeStyle = "#3d1a12"; g.lineWidth = 2; g.stroke();
        g.beginPath(); g.moveTo(-lh * 5, -lh * 8); g.quadraticCurveTo(0, -lh * 18, lh * 5, -lh * 8); g.quadraticCurveTo(0, -lh * 5, -lh * 5, -lh * 8); g.fillStyle = "#ffe9e1"; g.fill(); g.strokeStyle = "rgba(61,26,18,.45)"; g.lineWidth = 1.2; g.stroke(); g.restore();
        const up = K.ioCub(lin(JU.lift + .02, JU.rel - .03, t)), push = K.oBack(lin(JU.rel - .012, JU.rel + .015, t)), rx = K.mix(w * .82, w * .7, up) - push * w * .02, ry = K.mix(h * 1.06, h * .74, up) - push * h * .03, ra = K.mix(-.5, -.12, up);
        const rp = rel ? "spread" : up > .5 ? "open" : "relax", rsc = HS(X) * (1 - push * .1);
        hand(g, rx, ry, rsc, ra, rp, { view: "back", skin: "base", sleeve: JU_SLEEVE });
        const palm = handPoint(0, -60, rx, ry, rsc, ra, false);
        // the magic gathering: light-blue motes spiralling into the book and the open hand, numerals drifting up off the pages
        if (build > 0 && t < JU.rel + .05) { g.save(); g.globalCompositeOperation = "lighter"; const fade = 1 - lin(JU.rel, JU.rel + .05, t);
            [[core, 1], [palm, .7]].forEach(([c, k], j) => { for (let i = 0; i < 22; i++) { const u = (sM * (.6 + .3 * hs(i + j * 30)) + hs(i * 7 + j)) % 1, an = hs(i * 3 + j) * TAU + sM * 2 * (1 - u), d = M * .3 * (1 - u) * k; g.globalAlpha = Math.sin(u * Math.PI) * build * fade; K.glow(g, c[0] + Math.cos(an) * d, c[1] + Math.sin(an) * d * .7, M * .012, "#9fd8ff", 1); } K.glow(g, c[0], c[1], M * (.08 + .14 * build) * k, "#7cc4ff", .6 * build * fade); });
            for (let i = 0; i < 8; i++) { const u = (sM * .3 + i / 8) % 1; g.globalAlpha = Math.sin(u * Math.PI) * build * fade; K.txt(g, H.ROMAN[(i * 5) % 12], core[0] + (hs(i) - .5) * B.W * .8, core[1] - u * M * .35, M * .028, { font: K.F_UI, fill: "#e6f6ff", sw: 0, glow: "#7cc4ff" }); }
            g.restore(); }
        if (rel) {
            // the sphere's wall racing outward: a glassy rim, a band of refraction behind it, a shimmer and a slight colour split
            if (fr < 1) { const wob = an => Math.sin(an * 5 + sM * 3) * M * .006;
                g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = "rgba(120,190,255,.18)"; g.lineWidth = M * .08; g.beginPath(); g.arc(core[0], core[1], Math.max(1, R - M * .05), 0, TAU); g.stroke(); g.restore();
                shimmer(g, off => { const P = []; for (let i = 0; i <= 120; i++) { const an = i / 120 * TAU, rr = R + off + wob(an); P.push([core[0] + Math.cos(an) * rr, core[1] + Math.sin(an) * rr]); } return P; }, 1, 2.6); }
            const bq = lin(JU.rel, JU.rel + .05, t); if (bq < 1) { K.glow(g, core[0], core[1], M * .32 * (1 - bq * .3), "#cfeaff", .7 * (1 - bq)); K.shock(g, core[0], core[1], bq, M * .6, "#9fd8ff", 24); }
            const sq = lin(JU.stop, JU.stop + .06, t); if (sq > 0 && sq < 1) K.shock(g, w / 2, h / 2, sq, Math.hypot(w, h) * .6, "#e6f6ff", 14);
        }
        if (t > JU.lift && t < JU.rel + .08) K.column(g, "時間魔法", w * .08, h * .14, M * .065, lin(JU.lift, JU.lift + .1, t), { fill: "#f2faff", stroke: "#06243e", glow: "#8fd0ff", sw: 3 });
        if (t > JU.stop - .01 && t < JU.still + .02) K.slam(g, "時間停止", w / 2, h * .2, M * .12, lin(JU.stop - .01, JU.still + .02, t), { font: K.F_JP, weight: "400", fill: "#f4fbff", stroke: "#06243e", glow: "#8fd0ff", from: 1.3 });
        if (t > JU.still - .02) K.title(g, X, lin(JU.still - .02, 1, t), { en: "TIME STOP", kj: "時間魔法 · 時間停止", sub: "JULIUS · " + X.env.toName.toUpperCase() + " FROZEN FOR 2 TURNS", y: .2, col: "#8fd0ff" });
        if (hit(t, JU.rel, .012)) X.fx.flash = ["#eaf6ff", .28];
        X.fx.rgb = hit(t, JU.rel, .05) * 10;
    }
};

export const FREEZE = { onepiece_f: aokiji, naruto_f: haku, jjk_f: uraume, demonslayer_f: doma, bleach_f: hitsugaya, dragonball_f: hitScene, blackclover_f: julius, hxh_f: kurapika, jojo_f: dio };
