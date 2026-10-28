/* =====================================================================
   CINE ENGINE · runs one special-card cinematic
   - loads the card's voice line (audio/special/<series>_<kind>.mp3), its art and the display fonts in parallel
   - opens on the card itself: the FULL picture, framed, never cropped
   - main act = the scene's own choreography, as long as the voice line. Its beats are pinned to the words of the line
     (SYNC: scene time -> second of the clip, taken from a transcript of every clip) and the picture pulses with the voice
   - an ending that shows the REAL game result on the real table: freeze seal on the plate, the real hands swapped, 5 cards
     drawn, and for Future Sight the next player's real cards revealed inside the scene (faces for the player who used it,
     backs for everyone else)
   - shared post effects a scene can ask for per frame: X.fx.inv (impact frame), rgb (split), glitch, flash
   - reduced motion / Reduced effects: a short card banner instead
   Scenes: freeze.js, swap.js, ult.js, peek.js. Each one: { col, ms, main(g, X, T), seal|tailFx|tail... }
   ===================================================================== */
import { audio } from "../audio.js";
import { isReduced } from "../fx.js";
import * as K from "./kit.js?v=7";
import { FREEZE } from "./freeze.js?v=7";
import { SWAP } from "./swap.js?v=7";
import { ULT } from "./ult.js?v=7";
import { PEEK } from "./peek.js?v=7";

let A = null;                 // game hooks (see initCine)
/* api: { hbEl, unoCardEl, unoNext, plateRect(p), me(), arr } */
export function initCine(api) { A = api; }

const SCENES = Object.assign({}, FREEZE, SWAP, ULT, PEEK);
/* [ability, character, kanji, eye x, eye y] (where the eyes sit in the card art, 0..1, for the close-ups and cut-ins) */
const META = {
    onepiece_f: ["Ice Age", "Aokiji", "氷河時代", .5, .33], onepiece_t: ["Room · Shambles", "Trafalgar Law", "シャンブルズ", .35, .38], onepiece_u: ["Hawk Gatling", "Luffy", "鷹銃乱打", .5, .38], onepiece_e: ["Conqueror's Haki", "Shanks", "覇王色", .45, .45],
    naruto_f: ["Crystal Ice Mirrors", "Haku", "魔鏡氷晶", .58, .25], naruto_t: ["Flying Raijin", "Minato", "飛雷神", .62, .12], naruto_u: ["Rasengan", "Naruto", "螺旋丸", .5, .41], naruto_e: ["Byakugan", "Neji", "白眼", .5, .5],
    dragonball_f: ["Time Skip", "Hit", "時飛ばし", .5, .12], dragonball_t: ["Temporal Do-Over", "Whis", "時間逆行", .4, .42], dragonball_u: ["Kamehameha", "Goku", "かめはめ波", .5, .33], dragonball_e: ["Power Gaze", "Jiren", "気", .64, .27],
    jjk_f: ["Frost Calm", "Uraume", "霜凪", .35, .38], jjk_t: ["Boogie Woogie", "Aoi Todo", "不義遊戯", .48, .24], jjk_u: ["Malevolent Shrine", "Sukuna", "伏魔御廚子", .45, .36], jjk_e: ["Infinite Void", "Gojo", "無量空処", .45, .55],
    demonslayer_f: ["Lotus Leaf Ice", "Doma", "蓮葉氷", .6, .47], demonslayer_t: ["Infinity Castle", "Nakime", "無限城", .4, .24], demonslayer_u: ["Hinokami Kagura", "Tanjiro", "ヒノカミ神楽", .45, .42], demonslayer_e: ["Transparent World", "Yoriichi", "透き通る世界", .5, .4],
    bleach_f: ["Daiguren Hyorinmaru", "Hitsugaya", "大紅蓮氷輪丸", .5, .47], bleach_t: ["Kyoka Suigetsu", "Aizen", "鏡花水月", .52, .5], bleach_u: ["Getsuga Tensho", "Ichigo", "月牙天衝", .45, .36], bleach_e: ["The Almighty", "Yhwach", "全知全能", .5, .57],
    hxh_f: ["Chain Jail", "Kurapika", "束縛する中指の鎖", .55, .38], hxh_t: ["Hide and Seek", "Knov", "四次元マンション", .5, .42], hxh_u: ["100-Type Guanyin · Zero Hand", "Netero", "百式観音 零の掌", .5, .4], hxh_e: ["Lovely Ghostwriter", "Neon", "天使の自動筆記", .5, .47],
    blackclover_f: ["Chrono Stasis", "Julius", "時間魔法", .45, .47], blackclover_t: ["Fallen Angel's Gate", "Finral", "堕天使の扉", .65, .37], blackclover_u: ["Dimension Slash", "Yami", "次元斬り", .36, .32], blackclover_e: ["Red Thread of Fate", "Vanessa", "運命の赤い糸", .5, .33],
    jojo_f: ["The World", "DIO", "ザ・ワールド", .36, .36], jojo_t: ["Sticky Fingers", "Bruno", "スティッキィ・フィンガーズ", .5, .35], jojo_u: ["Star Platinum", "Jotaro", "スタープラチナ", .45, .5], jojo_e: ["King Crimson", "Diavolo", "キング・クリムゾン", .5, .35]
};
const KANJI = { f: "凍", t: "換", u: "極", e: "眼" }, KLABEL = { f: "FREEZE", t: "SWAP HANDS", u: "ULTIMATE", e: "FUTURE SIGHT" };
/* SYNC: [scene time 0..1, second of the voice line] pairs. Each one pins a beat of the scene (an impact, a clap, the ability
   being named...) to the moment the line says it. Taken from a word-level transcript of every clip; the scene's clock is
   stretched between them. A clip that is replaced keeps working: pins that no longer fit are relaxed by the warp. */
const SYNC = {
    onepiece_f: [[.17, 2.62], [.39, 4.6], [.6, 6.15], [.74, 7.58]], naruto_f: [[.48, 2.0], [.72, 4.28]], jjk_f: [[.24, 3.5], [.8, 10.05]], demonslayer_f: [[.52, 3.23]], bleach_f: [[.42, 2.83], [.72, 6.3]],
    dragonball_f: [[.3, 1.65], [.5, 2.95], [.62, 3.62]], blackclover_f: [[.56, 4.8]], hxh_f: [[.32, 3.48], [.68, 5.53]], jojo_f: [[.1, 1.6], [.2, 2.25], [.42, 3.9]],
    onepiece_t: [[.22, 1.3], [.64, 6.24]], naruto_t: [[.3, 1.65], [.6, 3.68]], dragonball_t: [[.22, 3.15], [.62, 5.05], [.66, 5.9]], jjk_t: [[.28, 1.62], [.5, 3.95], [.72, 5.45]],
    demonslayer_t: [[.34, 2.94], [.5, 5.02], [.66, 6.18]], bleach_t: [[.3, 1.9], [.58, 6.4]], hxh_t: [[.3, 1.95], [.48, 5.1]], blackclover_t: [[.24, 2.02], [.46, 4.55]], jojo_t: [[.28, 2.2]],
    onepiece_u: [[.09, 1.9], [.14, 2.43], [.193, 3.0], [.48, 5.98], [.72, 8.4]], naruto_u: [[.22, 1.4], [.7, 9.12]], dragonball_u: [[.14, 1.35], [.38, 3.4], [.5, 4.15]], jjk_u: [[.3, 3.2], [.56, 5.8]], demonslayer_u: [[.3, 1.6], [.56, 3.6], [.72, 4.6]],
    bleach_u: [[.5, 5.78], [.74, 6.75]], hxh_u: [[.42, 3.43], [.74, 8.22]], blackclover_u: [[.3, 2.2], [.62, 3.6]], jojo_u: [[.26, 1.9], [.66, 6.25]],
    // Future Sight: R = the reveal of the next player's cards
    onepiece_e: [[.3, 1.6], [.56, 4.4]], naruto_e: [[.36, 7.2], [.6, 13.8]], dragonball_e: [[.5, 3.4]], jjk_e: [[.3, 3.0], [.46, 5.6]], demonslayer_e: [[.3, 5.5], [.58, 11.3]],
    bleach_e: [[.3, 2.9], [.6, 6.2]], hxh_e: [[.62, 7.96]], blackclover_e: [[.4, 1.4], [.62, 2.7]], jojo_e: [[.4, 1.2]]
};
export const cineHas = key => !!SCENES[key];

/* ---------- voice lines: length + loudness envelope (20 per second), decoded once per clip ---------- */
const VDIR = "audio/special/", VEXT = ["mp3", "ogg", "wav", "m4a"], vInfo = {};
const V_MS = 8000, V_MIN = 4500, V_MAX = 17000, INTRO = 1000;
function voiceEnv(info) {
    if (!window.OfflineAudioContext) return;
    fetch(info.src).then(r => r.arrayBuffer()).then(buf => new OfflineAudioContext(1, 22050, 22050).decodeAudioData(buf)).then(ab => {
        const d = ab.getChannelData(0), win = Math.round(ab.sampleRate * .05), out = [];
        for (let i = 0; i + win <= d.length; i += win) { let s = 0; for (let j = i; j < i + win; j += 2) s += d[j] * d[j]; out.push(Math.sqrt(s / (win / 2))); }
        const mx = out.reduce((m, v) => Math.max(m, v), 0) || 1; info.env = out.map(v => Math.min(1, v / mx * 1.15));
    }).catch(() => {});
}
function voiceLoad(key, wait) {
    return new Promise(res => {
        if (audio.muted || vInfo[key] === null) return res(null);
        if (vInfo[key]) return res(vInfo[key]);
        let i = 0, fin = false; const end = v => { if (!fin) { fin = true; res(v); } };
        setTimeout(() => end(null), wait);
        const next = () => {
            if (i >= VEXT.length) { vInfo[key] = null; return end(null); }
            const a = new Audio(); a.preload = "auto";
            a.onloadedmetadata = () => { if (!isFinite(a.duration)) return; vInfo[key] = { src: a.src, dur: a.duration }; voiceEnv(vInfo[key]); end(vInfo[key]); };
            a.onerror = () => { i++; next(); };
            a.src = VDIR + key + "." + VEXT[i];
        };
        next();
    });
}
function voicePlay(info) { const a = new Audio(info.src); a.volume = audio.mediaVolume(1); audio.duck(Math.max(10000, info.dur * 1000 + 1500)); a.play().catch(() => {}); return a; }
function voiceStop(a) { const f = setInterval(() => { if (a.volume > .15) a.volume -= .15; else { a.pause(); clearInterval(f); } }, 30); }
/* the scene clock: elapsed ms -> scene time 0..1, piecewise linear through the SYNC pins (slopes kept within 1/3x..3x of even) */
function warpOf(pins, info, I, main) {
    const pts = [[I, 0]], even = 1 / main, lo = even / 3, hi = even * 3;
    if (info) (pins || []).slice().sort((a, b) => a[0] - b[0]).forEach(([t, sec]) => {
        const [pe, pt] = pts[pts.length - 1]; if (t <= pt || t >= 1) return;
        let el = sec * 1000; el = Math.max(el, pe + (t - pt) / hi, I + main - (1 - t) / lo); el = Math.min(el, pe + (t - pt) / lo, I + main - (1 - t) / hi);
        if (el > pe + 40 && el < I + main - 40) pts.push([el, t]);
    });
    pts.push([I + main, 1]);
    return el => { if (el <= I) return 0; for (let k = 1; k < pts.length; k++) if (el <= pts[k][0]) { const [e0, t0] = pts[k - 1], [e1, t1] = pts[k]; return t0 + (t1 - t0) * (el - e0) / (e1 - e0); } return 1; };
}

/* ---------- card art + fonts ---------- */
const ART = {}, AEXT = ["png", "jpg", "webp"], FILE = { f: "freeze", t: "swap", u: "ultimate", e: "vision" };
function artLoad(c, cb) {
    const base = "images/special/" + c.sk + "_" + FILE[c.k];
    if (ART[base] !== undefined) { if (ART[base]) cb(ART[base]); return; }
    let i = 0; const next = () => { if (i >= AEXT.length) { ART[base] = null; return; } const im = new Image(); im.decoding = "async"; im.onload = () => { ART[base] = im; cb(im); }; im.onerror = () => { i++; next(); }; im.src = base + "." + AEXT[i]; };
    next();
}
let fontsP = null;
function fontsReady() {
    if (!fontsP) fontsP = document.fonts && document.fonts.load ? Promise.all(['700 40px "Teko"', '400 40px "Dela Gothic One"', '700 20px "Rajdhani"'].map(f => document.fonts.load(f).catch(() => {}))) : Promise.resolve();
    return Promise.race([fontsP, new Promise(r => setTimeout(r, 700))]);
}

/* ---------- the opening: the whole card, framed. Contain-fit, so no part of the picture is ever cut off ---------- */
function cardShot(g, X, p) {
    const { w, h, M, col } = X, cx = w / 2, cy = h * .45, img = X.art;
    K.sky(g, w, h, [K.shade(col, -.88), K.shade(col, -.72), "#000"]);
    K.radial(g, cx, cy, M * .9, [K.rgba(col, .5), K.rgba(col, .12), K.rgba(col, 0)]);
    g.save(); g.globalAlpha = .55; K.focus(g, cx, cy, w, h, X.s, { col: K.rgba(col, .6), n: 90, r0: M * .34 }); g.restore();
    K.txt(g, X.kanji, cx, cy, M * .95, { font: K.F_JP, weight: "400", fill: K.rgba(col, .12), sw: 0 });
    K.drift(g, w, h, X.s, 26, 7, { up: 1, speed: .12, col, size: 2.6, glow: 1, add: 1, a: .8 });
    const ar = img ? (img.naturalWidth || img.width) / (img.naturalHeight || img.height) : 2 / 3;
    let ch = h * .64, cw = ch * ar; if (cw > w * .78) { cw = w * .78; ch = cw / ar; }
    const inn = K.oBack(K.lin(0, .26, p), 1.3), out = K.ss(.78, 1, p), sc = K.mix(.5, 1, inn) * (1 + out * .3), rot = (1 - K.oCub(K.lin(0, .32, p))) * -.16;
    const fw = Math.max(5, M * .011), x0 = -cw / 2, y0 = -ch / 2;
    g.save(); g.globalAlpha = Math.min(1, K.lin(0, .08, p) * 2) * (1 - K.lin(.9, 1, p)); g.translate(cx, cy); g.rotate(rot); g.scale(sc, sc);
    K.glow(g, 0, 0, Math.max(cw, ch) * .9, col, .6);
    K.rr(g, x0 - fw * 2.4, y0 - fw * 2.4, cw + fw * 4.8, ch + fw * 4.8, fw * 2); g.fillStyle = "#09080d"; g.fill();
    const gg = g.createLinearGradient(x0, y0, x0 + cw, y0 + ch); [["0", "#fff6c8"], [".3", "#d9a43a"], [".55", "#fff1b0"], [".8", "#b07a1c"], ["1", "#ffe9a0"]].forEach(([o, c]) => gg.addColorStop(+o, c));
    g.lineWidth = fw; g.strokeStyle = gg; g.stroke();
    K.rr(g, x0 - fw * .9, y0 - fw * .9, cw + fw * 1.8, ch + fw * 1.8, fw * .8); g.strokeStyle = col; g.lineWidth = fw * .6; g.stroke();
    g.save(); g.beginPath(); g.rect(x0, y0, cw, ch); g.clip();
    if (img) g.drawImage(img, x0, y0, cw, ch); else { g.translate(-cx, -cy); K.art(g, X, cx + x0, cy + y0, cw, ch); g.translate(cx, cy); }
    const sh = K.lin(.2, .6, p); if (sh > 0 && sh < 1) { g.globalCompositeOperation = "lighter"; const sx = x0 - ch * .6 + (cw + ch * 1.2) * sh; g.fillStyle = "rgba(255,255,255,.32)"; g.beginPath(); g.moveTo(sx, y0); g.lineTo(sx + cw * .16, y0); g.lineTo(sx + cw * .16 - ch * .6, y0 + ch); g.lineTo(sx - ch * .6, y0 + ch); g.closePath(); g.fill(); }
    g.restore();
    [[x0, y0], [x0 + cw, y0], [x0, y0 + ch], [x0 + cw, y0 + ch]].forEach(([x, y]) => { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillStyle = col; g.strokeStyle = "#fff2b0"; g.lineWidth = fw * .35; g.fillRect(-fw * 1.4, -fw * 1.4, fw * 2.8, fw * 2.8); g.strokeRect(-fw * 1.4, -fw * 1.4, fw * 2.8, fw * 2.8); g.restore(); });
    const tw = Math.min(cw * .9, M * .5), th = fw * 4.4; K.rr(g, -tw / 2, y0 - fw * 2.4 - th * .6, tw, th, th / 2); g.fillStyle = K.shade(col, -.55); g.fill(); g.strokeStyle = gg; g.lineWidth = fw * .5; g.stroke();
    K.txt(g, KANJI[X.card.k] + "  " + KLABEL[X.card.k], 0, y0 - fw * 2.4 - th * .6 + th / 2, th * .62, { font: K.F_UI, weight: "700", fill: "#fff", stroke: "#000", sw: th * .06, sp: th * .1 });
    g.restore();
    const ta = K.lin(.16, .3, p) * (1 - K.lin(.86, 1, p)), ty = cy + ch * sc / 2 + fw * 3 * sc;
    if (ta > 0) { g.save(); g.globalAlpha = ta;
        K.txt(g, X.ab.toUpperCase(), cx, ty + M * .052, Math.min(M * .065, w * .9 / Math.max(8, X.ab.length) * 1.5), { fill: "#fff", stroke: "#000", glow: col, sw: M * .008, sp: M * .004, skew: -.1 });
        K.txt(g, (X.cap + "  ·  " + X.who).toUpperCase(), cx, ty + M * .1, M * .026, { font: K.F_UI, weight: "700", fill: K.rgba("#ffffff", .9), stroke: "#000", sw: M * .004, sp: M * .006 }); g.restore(); }
    if (p > .84) X.fx.flash = ["#ffffff", K.bell(p, .84, 1) * .75];
}

/* ---------- target rects (read from the real page) ---------- */
const box4 = r => r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
const center = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
function plateOf(p) { return box4(A.plateRect(p)) || { x: innerWidth * .35, y: innerHeight * .04, w: innerWidth * .3, h: innerHeight * .14 }; }

/* ---------- the four kinds: what is real on the table, and how each ending shows it ---------- */
const KIND = {
    f: {   // FREEZE: the next player loses 2 turns. The ending seals their real plate, then fades into its frozen look.
        begin(env, u) { env.to = u.fx.to || A.unoNext(u, u.fx.p, 1); env.toName = u.names["p" + env.to] || "?"; env.r = plateOf(env.to); env.tc = center(env.r); },
        tail: () => 1600,
        draw(g, X, T, S) {
            const a = 1 - K.ss(.35, 1, T.tt); X.reveal(T.tt, .3);
            if (S.seal) S.seal(g, X, a); else defSeal(g, X, a);
            K.slam(g, X.env.toName + " · FROZEN ×2", X.w / 2, Math.min(X.h * .5, X.env.r.y + X.env.r.h + X.M * .12), X.M * .06, K.lin(0, 1, T.tt), { fill: "#fff", stroke: K.shade(S.col, -.7), glow: S.col, from: 1.2 });
        }
    },
    t: {   // SWAP HANDS: the real cards of both players are lifted out of the page and change places
        begin(env, u, box) { swapBegin(env, u, box); },
        tail: () => 1700,
        draw(g, X, T, S) { X.reveal(T.tt, .25); X.place(0, X.env.B, 1, 0); X.place(1, X.env.A, 1, 0); const a = 1 - K.ss(.45, 1, T.tt);
            [X.env.A, X.env.B].forEach(r => { g.save(); g.globalAlpha = a; g.strokeStyle = S.col; g.lineWidth = 3; g.shadowColor = S.col; g.shadowBlur = 24; g.strokeRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12); g.restore(); });
            X.env.layer.style.opacity = 1 - K.lin(.12, .45, T.tt); }
    },
    u: {   // ULTIMATE: the next player draws 5. The ending breaks the picture away and throws 5 cards from the deck into their plate
        begin(env, u) { env.to = u.fx.to || A.unoNext(u, u.fx.p, 1); env.toName = u.names["p" + env.to] || "?"; env.r = plateOf(env.to); env.tc = center(env.r); const d = document.getElementById("unoDraw"); env.dp = box4(d && d.getBoundingClientRect()) || { x: innerWidth * .08, y: innerHeight * .4, w: 90, h: 130 }; },
        tail: () => 2500,
        draw(g, X, T, S) { ultEnd(g, X, T, S); }
    },
    e: {   // FUTURE SIGHT: the NEXT player's real hand is revealed inside the scene. Faces only for the player who used it.
        begin(env, u, box) {
            env.owner = env.me === u.fx.p; env.to = u.fx.to || A.unoNext(u, u.fx.p, 1); env.toName = u.names["p" + env.to] || "?"; env.r = plateOf(env.to); env.tc = center(env.r);
            peekBegin(env, u, box);
        },
        tail: env => env.owner ? 3800 : 1600,          // the player who used it gets time to read the cards
        draw(g, X, T) {                                 // a scene without its own hold: the cards stay up, then go
            const a = 1 - K.ss(.82, 1, T.tt); g.fillStyle = "rgba(0,0,0," + .7 * a + ")"; g.fillRect(0, 0, X.w, X.h);
            X.cards((i, n, sl) => ({ x: sl.x, y: sl.y, a, flip: 1 }));
            K.txt(X.gf || g, X.env.toName.toUpperCase() + "'S HAND", X.w / 2, X.env.top - X.M * .05, X.M * .045, { fill: "#fff", stroke: "#000", glow: X.col });
        }
    }
};
function defSeal(g, X, a) {
    if (a <= 0) return; const r = X.env.r; g.save(); g.globalAlpha = a; const gr = g.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h); gr.addColorStop(0, "rgba(230,252,255,.6)"); gr.addColorStop(.5, "rgba(110,190,255,.28)"); gr.addColorStop(1, "rgba(210,244,255,.55)");
    g.fillStyle = gr; g.strokeStyle = X.col; g.lineWidth = 3; g.shadowColor = X.col; g.shadowBlur = 24; g.fillRect(r.x - 10, r.y - 10, r.w + 20, r.h + 20); g.strokeRect(r.x - 10, r.y - 10, r.w + 20, r.h + 20); g.restore();
}
const cardKey = (u, ci) => { const c = u.cards[ci]; return (c.k === "w" || c.k === "x" ? 9 : c.s) * 1000 + (c.k === "a" ? c.v : 20); };
function cardLayer(env, box) { const layer = document.createElement("div"); layer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3"; box.appendChild(layer); env.layer = layer; return layer; }
function swapBegin(env, u, box) {
    env.sw = u.fx.sw || u.fx.to; env.toName = u.names["p" + env.sw] || "?";
    // A = where the swapper's cards are, B = where the target's are (your own hand area when it is you, otherwise their plate)
    const hd = document.getElementById("unoHand"), mine = hd ? box4(hd.getBoundingClientRect()) : { x: innerWidth * .2, y: innerHeight * .72, w: innerWidth * .6, h: innerHeight * .22 };
    mine.h = Math.min(mine.h, innerHeight * .26);
    const rectOf = p => p === env.me ? Object.assign({}, mine) : box4(A.plateRect(p)) || { x: innerWidth * .35, y: innerHeight * .03, w: innerWidth * .3, h: innerHeight * .14 };
    env.A = rectOf(u.fx.p); env.B = rectOf(env.sw);
    /* group 0 = the swapper's old cards (now the target's), group 1 = the target's old cards (now the swapper's).
       Only the two players involved see faces; everybody else sees backs, so nothing leaks. */
    env.up = env.me === u.fx.p || env.me === env.sw;
    const layer = cardLayer(env, box);
    const mk = ci => { const el = env.up ? A.unoCardEl(u, ci, "") : A.hbEl("div", "ucard cb"); el.style.cssText += ";position:absolute;left:0;top:0;width:118px;height:176px;transform-origin:0 0;transition:none;opacity:0;margin:0;animation:none"; layer.appendChild(el); return el; };
    env.grp = [A.arr(u.hands["p" + env.sw]).slice().sort((a, b) => cardKey(u, a) - cardKey(u, b)).map(mk), A.arr(u.hands["p" + u.fx.p]).slice().sort((a, b) => cardKey(u, a) - cardKey(u, b)).map(mk)];
}
/* Future Sight: one face + one back per card of the next player (the face only for the player who used the card), and the
   resting slots they are revealed into: a centred spread, in up to 3 rows, as big as the screen allows */
function peekBegin(env, u, box) {
    const layer = cardLayer(env, box), hand = A.arr(u.hands["p" + env.to]).slice().sort((a, b) => cardKey(u, a) - cardKey(u, b));
    const st = ";position:absolute;left:0;top:0;width:118px;height:176px;transform-origin:59px 88px;transition:none;opacity:0;margin:0;animation:none;will-change:transform,opacity";
    env.peek = hand.map(ci => { const back = A.hbEl("div", "ucard cb"); back.style.cssText += st; layer.appendChild(back); let face = null; if (env.owner) { face = A.unoCardEl(u, ci, ""); face.style.cssText += st; layer.appendChild(face); } return { back, face }; });
    const w = innerWidth, h = innerHeight, n = Math.max(1, hand.length), rows = n <= 7 ? 1 : n <= 16 ? 2 : 3, per = Math.ceil(n / rows);
    let ch = Math.min(h * (rows === 1 ? .36 : rows === 2 ? .25 : .19), 260), cw = ch * 118 / 176, gap = cw * .14;
    const fit = w * .92; if (per * cw + (per - 1) * gap > fit) { const k = fit / (per * cw + (per - 1) * gap); cw *= k; ch *= k; gap *= k; }
    const cy = h * .5, rowH = ch + gap * 1.6; env.slots = [];
    for (let i = 0; i < n; i++) { const r = Math.floor(i / per), inRow = Math.min(per, n - r * per), k = i - r * per, x = w / 2 + (k - (inRow - 1) / 2) * (cw + gap), y = cy + (r - (rows - 1) / 2) * rowH;
        env.slots.push({ x, y, w: cw, h: ch, i, n, row: r, rows }); }
    env.top = cy - (rows - 1) / 2 * rowH - ch / 2; env.bot = cy + (rows - 1) / 2 * rowH + ch / 2;
}
/* lay the real cards of one group out inside rect r (fanned, scaled to fit). lift = 0..1 arcs them upward */
function place(env, idx, r, a, lift, rot) {
    const L = env.grp && env.grp[idx], n = L ? L.length : 0; if (!n) return;
    const sc = Math.max(.08, Math.min(r.h / 176, 1.15)), cw = 118 * sc, step = n > 1 ? Math.min(cw * .85, Math.max(4, (r.w - cw) / (n - 1))) : 0, x0 = r.x + (r.w - (cw + step * (n - 1))) / 2, y0 = r.y + (r.h - 176 * sc) / 2, fl = Math.sin((lift || 0) * Math.PI);
    L.forEach((el, i) => { el.style.opacity = a; el.style.transform = "translate(" + (x0 + i * step) + "px," + (y0 - fl * r.h * .3) + "px) rotate(" + ((i - n / 2) * fl * 2.2 + (rot || 0)) + "deg) scale(" + sc + ")"; });
}
/* Future Sight cards: fn(i, n, slot) -> { x, y (centre), s (scale vs the slot), r (deg), a (alpha), flip (0 back .. 1 face), f (CSS filter) } */
function peekCards(env, fn) {
    const L = env.peek; if (!L) return;
    L.forEach((c, i) => {
        const sl = env.slots[i], q = fn(i, L.length, sl) || {}, a = q.a == null ? 1 : K.cl(q.a), fp = q.flip == null ? 1 : K.cl(q.flip), sc = sl.w / 118 * (q.s == null ? 1 : q.s), sx = Math.max(.02, Math.abs(Math.cos((1 - fp) * Math.PI)));
        const tf = "translate(" + ((q.x == null ? sl.x : q.x) - 59).toFixed(1) + "px," + ((q.y == null ? sl.y : q.y) - 88).toFixed(1) + "px) rotate(" + (q.r || 0).toFixed(2) + "deg) scale(" + (sc * sx).toFixed(4) + "," + sc.toFixed(4) + ")";
        const showFace = c.face && fp >= .5;
        [c.back, c.face].forEach(el => { if (!el) return; const on = el === c.face ? showFace : !showFace; el.style.opacity = on ? a : 0; if (on) { el.style.transform = tf; el.style.filter = q.f || ""; } });
    });
}
/* the +5 ending: the main picture breaks away (S.tailFx: "fade" | "shatter" | "split" | "hole" | "burn"), then 5 cards fly from the deck into the plate */
function ultEnd(g, X, T, S) {
    const { w, h, M, env } = X, tt = T.tt, cx = w / 2, cy = h / 2, R = Math.hypot(w, h) / 2, fx = S.tailFx || "fade", col = S.trail || S.col;
    if (env.snap) {
        const e = K.ss(.0, .42, tt);
        if (fx === "shatter" && env.shards) env.shards.forEach(sh => { const o = e * e; g.save(); g.globalAlpha = 1 - K.ss(.7, 1, e); g.translate(sh.cx + sh.dx * o * R * sh.d, sh.cy + sh.dy * o * R * sh.d + o * o * h * .5); g.rotate(sh.r * o); g.translate(-sh.cx, -sh.cy);
            g.beginPath(); sh.p.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.save(); g.clip(); g.drawImage(env.snap, 0, 0, w, h); g.restore(); g.strokeStyle = col; g.lineWidth = 2; g.stroke(); g.restore(); });
        else if (fx === "split") [[0, -1], [cx, 1]].forEach(hf => { g.save(); g.beginPath(); g.rect(hf[0], 0, cx, h); g.clip(); g.translate(hf[1] * e * w * .6, hf[1] * e * h * .05); g.rotate(hf[1] * e * .07); g.globalAlpha = 1 - K.ss(.6, 1, e); g.drawImage(env.snap, 0, 0, w, h); g.restore(); });
        else if (fx === "hole") { const hole = e * R * 1.1; g.save(); g.beginPath(); g.rect(0, 0, w, h); g.arc(cx, cy, hole, 0, K.TAU, true); g.clip("evenodd"); g.translate(cx, cy); g.rotate(e * .6); g.translate(-cx, -cy); g.globalAlpha = 1 - K.ss(.7, 1, e); g.drawImage(env.snap, 0, 0, w, h); g.restore(); g.save(); g.globalAlpha = 1 - e; g.strokeStyle = col; g.lineWidth = 8; g.shadowColor = col; g.shadowBlur = 30; g.beginPath(); g.arc(cx, cy, hole, 0, K.TAU); g.stroke(); g.restore(); }
        else if (fx === "burn") { g.save(); g.globalAlpha = 1 - e; g.drawImage(env.snap, 0, 0, w, h); g.globalCompositeOperation = "destination-out"; for (let i = 0; i < 26; i++) { const x = K.hs(i * 3) * w, y = K.hs(i * 7) * h, r = e * M * (.25 + .4 * K.hs(i)); g.beginPath(); g.arc(x, y, r, 0, K.TAU); g.fill(); } g.restore(); }
        else { g.save(); g.globalAlpha = 1 - K.ss(0, .3, tt); g.drawImage(env.snap, 0, 0, w, h); g.restore(); }
        if (fx !== "fade") K.debris(g, cx, cy, K.lin(0, .7, tt), 30, 7, { speed: M * 1.1, size: M * .02, cols: ["#2a2830", "#5b5866", col] });
    }
    const r = env.r, tx = r.x + r.w / 2, ty = r.y + r.h / 2, d = env.dp, ox = d.x + d.w / 2, oy = d.y + d.h / 2;
    let got = 0;
    for (let k = 0; k < 5; k++) {
        const p = K.lin(.22 + k * .075, .22 + k * .075 + .26, tt); if (p <= 0) continue; if (p >= 1) { got++; continue; }
        const e = K.ioCub(p), x = K.mix(ox, tx, e), y = K.mix(oy, ty, e) - Math.sin(p * Math.PI) * M * .14 * (k % 2 ? 1 : .6), sz = K.mix(d.h * .9, r.h * .75, e);
        for (let tr = 4; tr > 0; tr--) { const q = Math.max(0, e - tr * .05); K.glow(g, K.mix(ox, tx, q), K.mix(oy, ty, q) - Math.sin(Math.max(0, p - tr * .05) * Math.PI) * M * .14 * (k % 2 ? 1 : .6), M * .03, col, .25 * (5 - tr) / 5); }
        K.cardBack(g, x, y, sz, (k - 2) * .3 * (1 - e) + p * 6.283, p * 9 + k);
    }
    for (let k = 0; k < 5; k++) { const p = K.lin(.48 + k * .075, .62 + k * .075, tt); if (p > 0 && p < 1) { K.shock(g, tx, ty, p, M * .16, col, 10); K.sparks(g, tx, ty, p, 10, k * 13, { speed: M * .35, col }); } }
    const sh = K.hit(tt, .5, .3) * 10; if (sh) { X.fx.shake = sh; }
    if (got) K.slam(g, "+" + got, tx, ty + r.h * .5 + M * .09, M * .11, Math.min(.8, K.lin(.45, 1, tt)) + (tt > .96 ? K.lin(.96, 1, tt) * .2 : 0), { fill: "#fff", stroke: K.shade(col, -.7), glow: col, from: .4, in: .05 });
    K.slam(g, env.toName + " draws 5", w / 2, Math.min(h * .55, ty + r.h * .5 + M * .2), M * .05, K.lin(.62, 1.02, tt), { fill: "#fff", stroke: "#000", glow: col, from: 1 });
}

/* ---------- reduced motion: the full card picture and its name, no canvas (Future Sight: plus the next player's hand) ---------- */
function fallback(key, box, done, c, u, kd) {
    const m = META[key] || ["", "", "", .5, .3], col = (SCENES[key] && SCENES[key].col) || "#fff", env = { me: A.me() };
    try { kd.begin(env, u, box); } catch (e) {}
    if (env.layer) env.layer.remove();
    box.textContent = ""; box.classList.add("cine", "lite"); box.style.setProperty("--c", col);
    const div = (cls, t) => { const d = A.hbEl("div", cls, t); box.appendChild(d); return d; };
    const stage = div("fx-stage"), frame = A.hbEl("div", "fx-art"); stage.appendChild(frame);
    artLoad(c, im => { const i = new Image(); i.src = im.src; i.alt = ""; frame.appendChild(i); });
    const tt = div("fx-title"), band = A.hbEl("div", "fx-band"); band.appendChild(A.hbEl("div", "fx-name", c.ab || m[0])); band.appendChild(A.hbEl("div", "fx-cap", (u.names["p" + u.fx.p] || "?") + " · " + m[1])); tt.appendChild(band);
    let ms = 2600;
    if (c.k === "e" && env.owner) {
        const row = div("fx-peek"); row.appendChild(A.hbEl("b", null, (env.toName || "?") + "'s hand"));
        const cards = A.hbEl("div", "fx-peek-cards"); A.arr(u.hands["p" + env.to]).slice().sort((a, b) => cardKey(u, a) - cardKey(u, b)).forEach(ci => { const cell = A.hbEl("div", "fx-peek-cell"); cell.appendChild(A.unoCardEl(u, ci, "")); cards.appendChild(cell); });
        row.appendChild(cards); ms = 5200;
    }
    let ended = false; const fin = () => { if (ended) return; ended = true; done(); };
    box.addEventListener("click", fin); setTimeout(fin, ms);
}

/* ---------- the player ---------- */
export function cineHook(key) {
    return (box, done, c, u) => {
        const S = SCENES[key], kd = KIND[c.k];
        const reduce = (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) || isReduced();
        if (!S || !kd || reduce) return fallback(key, box, done, c, u, kd || KIND.f);
        box.textContent = ""; box.classList.add("cine"); box.style.setProperty("--c", S.col); box.style.background = "transparent";
        const m = META[key], env = { box, key, me: A.me(), cues: {} };
        let ended = false, voice = null, raf = 0, jump = null;
        const finish = () => { if (ended) return; ended = true; cancelAnimationFrame(raf); if (voice) voiceStop(voice); try { kd.end && kd.end(env, u); } catch (e) { console.warn(e); } done(); };
        // a tap skips; on Future Sight the player who used it skips straight to the cards (a second tap closes)
        box.addEventListener("click", () => { if (c.k === "e" && env.owner && jump && !env.tailed) jump(); else finish(); });
        try { kd.begin(env, u, box); S.begin && S.begin(env, u); } catch (e) { console.warn(e); }
        const X = { env, u, card: c, col: S.col, kanji: KANJI[c.k], who: u.names["p" + u.fx.p] || "?", cap: m[1], ab: c.ab || m[0], kj: m[2], focus: [m[3], m[4]], art: null, fx: {}, vox: 0 };
        artLoad(c, im => { X.art = im; });
        Promise.all([voiceLoad(key, 900), fontsReady()]).then(([info]) => { if (!ended) run(info); }).catch(e => { console.warn(e); finish(); });

        function run(info) {
            const tail = kd.tail(env) + (S.tailPlus || 0), I = INTRO;
            const main = (info ? Math.min(V_MAX, Math.max(V_MIN, info.dur * 1000 + 300 - I)) : S.ms || V_MS) + (S.mainPlus || 0);   // mainPlus: extra screen time after the voice
            const total = I + main + tail, warp = warpOf(SYNC[key], info, I, main), w = innerWidth, h = innerHeight, mk = z => { const cv = A.hbEl("canvas", "fx-cv"); cv.style.zIndex = z; box.appendChild(cv); return cv; };
            let dpr = Math.min(1.5, window.devicePixelRatio || 1); if (w * h * dpr * dpr > 2.4e6) dpr = Math.sqrt(2.4e6 / (w * h));
            const cv = mk(1), g = cv.getContext("2d"); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
            let gf = null; if (S.fg) { const cf = mk(4); cf.width = cv.width; cf.height = cv.height; gf = cf.getContext("2d"); }
            const prog = A.hbEl("div", "fx-prog"), pin = A.hbEl("i"); prog.appendChild(pin); box.appendChild(prog); box.appendChild(A.hbEl("div", "fx-skip", c.k === "e" && env.owner ? "TAP TO SEE THE CARDS" : "TAP TO SKIP"));
            if (env.layer) env.layer.style.zIndex = 3;
            Object.assign(X, { g, gf, w, h, M: Math.min(w, h), cx: w / 2, cy: h / 2, main, tail, dpr });
            X.place = (i, r, a, lift, rot) => place(env, i, r, a, lift, rot);
            X.cards = fn => peekCards(env, fn);
            X.cue = (at, name, T) => { const id = name + at; if (!env.cues[id] && T >= at) { env.cues[id] = 1; if (T < at + .08) audio.sfx(name); } };
            X.reveal = (tt, len) => { if (env.snap) { g.save(); g.globalAlpha = 1 - K.ss(0, len, tt); g.drawImage(env.snap, 0, 0, w, h); g.restore(); } };
            if (info) voice = voicePlay(info);
            let t0 = performance.now(), vox = 0;
            jump = () => { t0 = performance.now() - (I + main); };
            const frame = now => {
                if (ended) return; if (!box.isConnected) { finish(); return; }
                const el = now - t0, ph = el < I ? "intro" : el < I + main ? "main" : "tail";
                if (ph === "tail" && !env.tailed) {                  // freeze the last picture of the main act, the endings break/fade it away
                    env.tailed = 1; const sn = document.createElement("canvas"); sn.width = cv.width; sn.height = cv.height; sn.getContext("2d").drawImage(cv, 0, 0); env.snap = sn;
                    if (gf) { const s2 = sn.getContext("2d"); s2.drawImage(gf.canvas, 0, 0); gf.setTransform(1, 0, 0, 1, 0, 0); gf.clearRect(0, 0, cv.width, cv.height); }
                    if (S.tailFx === "shatter") { const L = []; for (let k = 0; k < 9; k++) L.push(K.randLine(k + 40 + (S.seed || 0), w, h)); env.shards = K.shardsOf(w, h, L); }
                    try { S.tailStart && S.tailStart(X); } catch (e) { console.warn(e); }
                }
                const ev = info && info.env, vi = Math.floor(el / 50), raw = ev && vi < ev.length ? ev[vi] : 0;
                vox = raw > vox ? vox + (raw - vox) * .6 : vox * .88; X.vox = vox;              // the voice's loudness, fast attack, slow release
                const T = { ph, t: ph === "intro" ? 0 : ph === "main" ? warp(el) : 1, tt: ph === "tail" ? Math.min(1, (el - I - main) / tail) : 0, s: el / 1000, el };
                X.s = T.s; X.t = T.t; X.fx = {};
                g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); if (gf) { gf.setTransform(dpr, 0, 0, dpr, 0, 0); gf.clearRect(0, 0, w, h); }
                g.save();
                try {
                    if (ph === "intro") { cardShot(g, X, el / I); if (c.k === "e") X.cards(() => ({ a: 0 })); }
                    else if (ph === "main") S.main(g, X, T); else if (S.tail) S.tail(g, X, T); else kd.draw(g, X, T, S);
                } catch (e) { console.warn(e); }
                g.restore();
                if (ph === "main" && vox > .04 && (!S.breath || S.breath(T.t))) { g.save(); g.globalCompositeOperation = "lighter"; K.vignette(g, w, h, .32 * vox, S.col, .42); g.restore(); }   // the picture breathes with the voice
                const f = X.fx;
                if (f.shake && ph === "tail") { const k = f.shake, fr = Math.floor(T.s * 60); box.style.transform = "translate(" + ((K.hs(fr) - .5) * k) + "px," + ((K.hs(fr + 3) - .5) * k) + "px)"; } else if (box.style.transform) box.style.transform = "";
                if (f.glitch) K.glitch(g, T.s, f.glitch);
                if (f.rgb) K.rgbSplit(g, f.rgb);
                if (f.inv) K.impact(g, f.inv === true ? null : f.inv);
                if (f.flash) K.flash(g, w, h, f.flash[0], f.flash[1]);
                if (ph === "main" && S.grain !== 0) K.grain(g, T.s, S.grain || .05);
                pin.style.width = Math.max(0, (1 - el / total) * 100) + "%";
                if (el < total) raf = requestAnimationFrame(frame); else finish();
            };
            raf = requestAnimationFrame(frame);
            setTimeout(finish, total + 700);             // safety net: an animation can never freeze the game
        }
    };
}
/* for the preview page / tests: draw one frame of a scene's main act at time t (0..1) without the DOM side.
   t < 0 draws the opening card shot at -t (0..1). Future Sight cards are drawn as stand-in rectangles. */
export function cineFrame(key, g, w, h, t, X0) {
    const S = SCENES[key], m = META[key], c = { k: key.slice(-1) };
    const calls = [], X = Object.assign({ g, gf: g, w, h, M: Math.min(w, h), cx: w / 2, cy: h / 2, col: S.col, card: c, kanji: KANJI[c.k], who: "Player", cap: m[1], ab: m[0], kj: m[2], focus: [m[3], m[4]], art: null, fx: {}, vox: .5, main: S.ms || V_MS, place: (...a) => calls.push(a), cue() {}, reveal() {} }, X0);
    if (X.env && c.k === "e" && !X.env.slots) { const n = X.env.n || 7, cw = Math.min(w * .11, h * .36 * 118 / 176); X.env.slots = []; for (let i = 0; i < n; i++) X.env.slots.push({ x: w / 2 + (i - (n - 1) / 2) * cw * 1.14, y: h * .5, w: cw, h: cw * 176 / 118, i, n, row: 0, rows: 1 }); X.env.top = h * .5 - cw * 88 / 118; X.env.bot = h * .5 + cw * 88 / 118; }
    X.cards = fn => { const L = X.env.slots; L.forEach((sl, i) => { const q = fn(i, L.length, sl) || {}, a = q.a == null ? 1 : K.cl(q.a); if (a <= 0) return; const fp = q.flip == null ? 1 : q.flip, sc = q.s == null ? 1 : q.s, sx = Math.abs(Math.cos((1 - fp) * Math.PI));
        g.save(); g.globalAlpha = a; g.translate(q.x == null ? sl.x : q.x, q.y == null ? sl.y : q.y); g.rotate((q.r || 0) * Math.PI / 180); g.scale(sc * sx, sc); g.fillStyle = fp >= .5 ? ["#e11b1b", "#2e9e5b", "#f2c200", "#1f3fae"][i % 4] : "#20202a"; g.fillRect(-sl.w / 2, -sl.h / 2, sl.w, sl.h); g.strokeStyle = "#fff"; g.lineWidth = 3; g.strokeRect(-sl.w / 2, -sl.h / 2, sl.w, sl.h); g.restore(); }); };
    const T = { ph: "main", t, tt: 0, s: Math.abs(t) * X.main / 1000, el: Math.abs(t) * X.main }; X.s = T.s; X.t = t;
    g.save(); if (t < 0) cardShot(g, X, -t); else S.main(g, X, T); g.restore(); const f = X.fx;
    calls.forEach(([i, r, a, lift]) => { if (!a) return; g.save(); g.globalAlpha = a; const n = 5, sc = Math.min(r.h / 176, 1.15), cw = 118 * sc, step = Math.min(cw * .85, Math.max(4, (r.w - cw) / (n - 1))), x0 = r.x + (r.w - (cw + step * (n - 1))) / 2, y0 = r.y + (r.h - 176 * sc) / 2 - Math.sin((lift || 0) * Math.PI) * r.h * .3;
        for (let k = 0; k < n; k++) { g.fillStyle = i ? "#2f6fe4" : "#e11b1b"; g.strokeStyle = "#fff"; g.lineWidth = 2; g.fillRect(x0 + k * step, y0, cw, 176 * sc); g.strokeRect(x0 + k * step, y0, cw, 176 * sc); } g.restore(); });   // preview stand-ins for the real DOM cards
    if (f.glitch) K.glitch(g, T.s, f.glitch); if (f.rgb) K.rgbSplit(g, f.rgb); if (f.inv) K.impact(g, f.inv === true ? null : f.inv); if (f.flash) K.flash(g, w, h, f.flash[0], f.flash[1]);
    return X;
}
/* the scene's tail (Future Sight hold) for previews: tt 0..1 */
export function cineTail(key, g, w, h, tt, X0) {
    const X = cineFrame(key, g, w, h, 1, X0); g.clearRect(0, 0, w, h); const S = SCENES[key], T = { ph: "tail", t: 1, tt, s: 8 + tt * 3, el: 0 }; X.s = T.s; X.fx = {};
    g.save(); if (S.tail) S.tail(g, X, T); else KIND.e.draw(g, X, T); g.restore(); return X;
}
export const cineMeta = META;
