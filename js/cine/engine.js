/* =====================================================================
   CINE ENGINE · runs one special-card cinematic
   - loads the card's voice line (audio/special/<series>_<kind>.mp3), its art and the display fonts in parallel
   - main act (the scene's own choreography, as long as the voice line, 5-10 s) + an ending that shows the REAL
     game result on the real table: freeze seal on the plate, the real hands swapped, 5 cards drawn, the vision reveal
   - shared post effects a scene can ask for per frame: X.fx.inv (impact frame), rgb (split), glitch, flash
   - reduced motion / Reduced effects: a short card banner instead
   Scenes: freeze.js, swap.js, ult.js, peek.js. Each one: { col, ms, main(g, X, T), seal|tailFx|tail... }
   ===================================================================== */
import { audio } from "../audio.js";
import { isReduced } from "../fx.js";
import * as K from "./kit.js";
import { FREEZE } from "./freeze.js";
import { SWAP } from "./swap.js";
import { ULT } from "./ult.js";
import { PEEK } from "./peek.js";

let A = null;                 // game hooks (see initCine)
/* api: { hbEl, unoCardEl, unoNext, plateRect(p), me(), ownPeek(id|null), peekShow(u, me), arr } */
export function initCine(api) { A = api; }

const SCENES = Object.assign({}, FREEZE, SWAP, ULT, PEEK);
/* [ability, character, kanji, eye x, eye y] (where the eyes sit in the card art, 0..1, for the close-ups and cut-ins) */
const META = {
    onepiece_f: ["Ice Age", "Aokiji", "氷河時代", .5, .33], onepiece_t: ["Room · Shambles", "Trafalgar Law", "シャンブルズ", .35, .38], onepiece_u: ["Gear 5", "Luffy", "ギア5", .5, .38], onepiece_e: ["Conqueror's Haki", "Shanks", "覇王色", .45, .45],
    naruto_f: ["Crystal Ice Mirrors", "Haku", "魔鏡氷晶", .58, .25], naruto_t: ["Flying Raijin", "Minato", "飛雷神", .62, .12], naruto_u: ["Rasengan", "Naruto", "螺旋丸", .5, .41], naruto_e: ["Byakugan", "Neji", "白眼", .5, .5],
    dragonball_f: ["Time Skip", "Hit", "時飛ばし", .5, .12], dragonball_t: ["Temporal Do-Over", "Whis", "時間逆行", .4, .42], dragonball_u: ["Kamehameha", "Goku", "かめはめ波", .5, .33], dragonball_e: ["Power Gaze", "Jiren", "気", .64, .27],
    jjk_f: ["Frost Calm", "Uraume", "霜凪", .35, .38], jjk_t: ["Boogie Woogie", "Aoi Todo", "不義遊戯", .48, .24], jjk_u: ["Malevolent Shrine", "Sukuna", "伏魔御廚子", .45, .36], jjk_e: ["Infinite Void", "Gojo", "無量空処", .45, .55],
    demonslayer_f: ["Frozen Lotus", "Doma", "蓮葉氷", .6, .47], demonslayer_t: ["Infinity Castle", "Nakime", "無限城", .4, .24], demonslayer_u: ["Hinokami Kagura", "Tanjiro", "ヒノカミ神楽", .45, .42], demonslayer_e: ["Transparent World", "Yoriichi", "透き通る世界", .5, .4],
    bleach_f: ["Hyorinmaru", "Hitsugaya", "氷輪丸", .5, .47], bleach_t: ["Kyoka Suigetsu", "Aizen", "鏡花水月", .52, .5], bleach_u: ["Getsuga Tensho", "Ichigo", "月牙天衝", .45, .36], bleach_e: ["The Almighty", "Yhwach", "全知全能", .5, .57],
    hxh_f: ["Emperor Time", "Kurapika", "絶対時間", .55, .38], hxh_t: ["Hide and Seek", "Knov", "四次元マンション", .5, .42], hxh_u: ["100-Type Guanyin", "Netero", "百式観音", .5, .4], hxh_e: ["Lovely Ghostwriter", "Neon", "天使の自動筆記", .5, .47],
    blackclover_f: ["Chrono Stasis", "Julius", "時間魔法", .45, .47], blackclover_t: ["Fallen Angel's Gate", "Finral", "堕天使の扉", .65, .37], blackclover_u: ["Dimension Slash", "Yami", "暗黒次元斬", .36, .32], blackclover_e: ["Red Thread of Fate", "Vanessa", "運命の赤い糸", .5, .33],
    jojo_f: ["The World", "DIO", "ザ・ワールド", .36, .36], jojo_t: ["Sticky Fingers", "Bruno", "スティッキィ・フィンガーズ", .5, .35], jojo_u: ["Star Platinum", "Jotaro", "スタープラチナ", .45, .5], jojo_e: ["King Crimson", "Diavolo", "キング・クリムゾン", .5, .35]
};
const KANJI = { f: "凍", t: "換", u: "極", e: "眼" };
export const cineHas = key => !!SCENES[key];

/* ---------- voice lines ---------- */
const VDIR = "audio/special/", VEXT = ["mp3", "ogg", "wav", "m4a"], vInfo = {};
const V_MS = 8000, V_MIN = 5000, V_MAX = 10000;     // a whole cinematic never lasts more than 10 s
function voiceLoad(key, wait) {
    return new Promise(res => {
        if (audio.muted || vInfo[key] === null) return res(null);
        if (vInfo[key]) return res(vInfo[key]);
        let i = 0, fin = false; const end = v => { if (!fin) { fin = true; res(v); } };
        setTimeout(() => end(null), wait);
        const next = () => {
            if (i >= VEXT.length) { vInfo[key] = null; return end(null); }
            const a = new Audio(); a.preload = "auto";
            a.onloadedmetadata = () => { if (!isFinite(a.duration)) return; vInfo[key] = { src: a.src, dur: a.duration }; end(vInfo[key]); };
            a.onerror = () => { i++; next(); };
            a.src = VDIR + key + "." + VEXT[i];
        };
        next();
    });
}
function voicePlay(info) { const a = new Audio(info.src); a.volume = audio.mediaVolume(1); audio.duck(10000); a.play().catch(() => {}); return a; }
function voiceStop(a) { const f = setInterval(() => { if (a.volume > .15) a.volume -= .15; else { a.pause(); clearInterval(f); } }, 30); }

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
    e: {   // FUTURE SIGHT: only the player who used it sees every hand (the reveal table opens after the scene)
        begin(env, u) { env.owner = env.me === u.fx.p; if (env.owner && u.peek) A.ownPeek(u.peek.id); env.rects = Array.from(document.querySelectorAll("#unoOpps .u-opp")).map(e => box4(e.getBoundingClientRect())); if (!env.rects.length) env.rects = [plateOf(-1)]; },
        tail: env => env.owner ? 900 : 1500,
        end(env, u) { if (env.owner && !env.shown) { env.shown = 1; A.ownPeek(null); A.peekShow(u, env.me); } },
        draw(g, X, T, S) {
            if (X.env.owner) { g.fillStyle = S.dark || "#000"; g.fillRect(0, 0, X.w, X.h); K.txt(g, "👁", X.w / 2, X.h / 2, X.M * .08, { sw: 0, glow: S.col }); return; }
            X.reveal(T.tt, .4); X.env.rects.forEach(r => { g.save(); g.globalAlpha = 1 - K.ss(.3, 1, T.tt); g.strokeStyle = S.col; g.lineWidth = 3; g.shadowColor = S.col; g.shadowBlur = 22; g.strokeRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12); g.restore(); });
            K.slam(g, X.who + " sees every hand", X.w / 2, X.h * .5, X.M * .05, K.lin(0, 1, T.tt), { fill: "#fff", stroke: K.shade(S.col, -.7), glow: S.col, from: 1 });
        }
    }
};
function defSeal(g, X, a) {
    if (a <= 0) return; const r = X.env.r; g.save(); g.globalAlpha = a; const gr = g.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h); gr.addColorStop(0, "rgba(230,252,255,.6)"); gr.addColorStop(.5, "rgba(110,190,255,.28)"); gr.addColorStop(1, "rgba(210,244,255,.55)");
    g.fillStyle = gr; g.strokeStyle = X.col; g.lineWidth = 3; g.shadowColor = X.col; g.shadowBlur = 24; g.fillRect(r.x - 10, r.y - 10, r.w + 20, r.h + 20); g.strokeRect(r.x - 10, r.y - 10, r.w + 20, r.h + 20); g.restore();
}
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
    const layer = document.createElement("div"); layer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3"; box.appendChild(layer); env.layer = layer;
    const key = ci => { const c = u.cards[ci]; return (c.k === "w" || c.k === "x" ? 9 : c.s) * 1000 + (c.k === "a" ? c.v : 20); };
    const mk = ci => { const el = env.up ? A.unoCardEl(u, ci, "") : A.hbEl("div", "ucard cb"); el.style.cssText += ";position:absolute;left:0;top:0;width:118px;height:176px;transform-origin:0 0;transition:none;opacity:0;margin:0;animation:none"; layer.appendChild(el); return el; };
    env.grp = [A.arr(u.hands["p" + env.sw]).slice().sort((a, b) => key(a) - key(b)).map(mk), A.arr(u.hands["p" + u.fx.p]).slice().sort((a, b) => key(a) - key(b)).map(mk)];
}
/* lay the real cards of one group out inside rect r (fanned, scaled to fit). lift = 0..1 arcs them upward */
function place(env, idx, r, a, lift, rot) {
    const L = env.grp && env.grp[idx], n = L ? L.length : 0; if (!n) return;
    const sc = Math.max(.08, Math.min(r.h / 176, 1.15)), cw = 118 * sc, step = n > 1 ? Math.min(cw * .85, Math.max(4, (r.w - cw) / (n - 1))) : 0, x0 = r.x + (r.w - (cw + step * (n - 1))) / 2, y0 = r.y + (r.h - 176 * sc) / 2, fl = Math.sin((lift || 0) * Math.PI);
    L.forEach((el, i) => { el.style.opacity = a; el.style.transform = "translate(" + (x0 + i * step) + "px," + (y0 - fl * r.h * .3) + "px) rotate(" + ((i - n / 2) * fl * 2.2 + (rot || 0)) + "deg) scale(" + sc + ")"; });
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

/* ---------- reduced motion: the card and its name, no canvas ---------- */
function fallback(key, box, done, c, u, kd) {
    const m = META[key] || ["", "", "", .5, .3], col = (SCENES[key] && SCENES[key].col) || "#fff", env = { me: A.me() };
    try { kd.begin(env, u, box); } catch (e) {}
    box.textContent = ""; box.classList.add("cine"); box.style.setProperty("--c", col);
    const div = (cls, t) => { const d = A.hbEl("div", cls, t); box.appendChild(d); return d; };
    const stage = div("fx-stage"), wrap = A.hbEl("div", "fx-cardwrap"), inner = A.hbEl("div", "fx-cardin"), card = A.unoCardEl(u, u.fx.ci, "big"), k = Math.min(innerHeight * .46 / 330, innerWidth * .74 / 220, 1.8);
    wrap.style.width = 220 * k + "px"; wrap.style.height = 330 * k + "px"; card.style.transform = "scale(" + k + ")"; inner.appendChild(card); wrap.appendChild(inner); stage.appendChild(wrap);
    const tt = div("fx-title"), band = A.hbEl("div", "fx-band"); band.appendChild(A.hbEl("div", "fx-name", c.ab || m[0])); band.appendChild(A.hbEl("div", "fx-cap", (u.names["p" + u.fx.p] || "?") + " · " + m[1])); tt.appendChild(band);
    if (env.layer) env.layer.remove();
    let ended = false; const fin = () => { if (ended) return; ended = true; try { kd.end && kd.end(env, u); } catch (e) {} done(); };
    box.addEventListener("click", fin); setTimeout(fin, 2600);
}

/* ---------- the player ---------- */
export function cineHook(key) {
    return (box, done, c, u) => {
        const S = SCENES[key], kd = KIND[c.k];
        const reduce = (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) || isReduced();
        if (!S || !kd || reduce) return fallback(key, box, done, c, u, kd || KIND.e);
        box.textContent = ""; box.classList.add("cine"); box.style.setProperty("--c", S.col); box.style.background = "transparent";
        const m = META[key], env = { box, key, me: A.me(), cues: {} };
        let ended = false, voice = null, raf = 0;
        const finish = () => { if (ended) return; ended = true; cancelAnimationFrame(raf); if (voice) voiceStop(voice); try { kd.end && kd.end(env, u); } catch (e) { console.warn(e); } done(); };
        box.addEventListener("click", finish);
        try { kd.begin(env, u, box); S.begin && S.begin(env, u); } catch (e) { console.warn(e); }
        const X = { env, u, card: c, col: S.col, kanji: KANJI[c.k], who: u.names["p" + u.fx.p] || "?", cap: m[1], ab: c.ab || m[0], kj: m[2], focus: [m[3], m[4]], art: null, fx: {} };
        artLoad(c, im => { X.art = im; });
        Promise.all([voiceLoad(key, 900), fontsReady()]).then(([info]) => { if (!ended) run(info); }).catch(e => { console.warn(e); finish(); });

        function run(info) {
            const tail = kd.tail(env) + (S.tailPlus || 0); let main = info ? Math.min(V_MAX, Math.max(V_MIN, info.dur * 1000 + 700)) : S.ms || V_MS; main = Math.min(main, V_MAX - tail);
            const total = main + tail, w = innerWidth, h = innerHeight, mk = z => { const cv = A.hbEl("canvas", "fx-cv"); cv.style.zIndex = z; box.appendChild(cv); return cv; };
            let dpr = Math.min(1.5, window.devicePixelRatio || 1); if (w * h * dpr * dpr > 2.4e6) dpr = Math.sqrt(2.4e6 / (w * h));
            const cv = mk(1), g = cv.getContext("2d"); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
            let gf = null; if (S.fg) { const cf = mk(4); cf.width = cv.width; cf.height = cv.height; gf = cf.getContext("2d"); }
            const prog = A.hbEl("div", "fx-prog"), pin = A.hbEl("i"); prog.appendChild(pin); box.appendChild(prog); box.appendChild(A.hbEl("div", "fx-skip", "TAP TO SKIP"));
            if (env.layer) env.layer.style.zIndex = 3;
            Object.assign(X, { g, gf, w, h, M: Math.min(w, h), cx: w / 2, cy: h / 2, main, tail, dpr });
            X.place = (i, r, a, lift, rot) => place(env, i, r, a, lift, rot);
            X.cue = (at, name, T) => { const id = name + at; if (!env.cues[id] && T >= at) { env.cues[id] = 1; if (T < at + .08) audio.sfx(name); } };
            X.reveal = (tt, len) => { if (env.snap) { g.save(); g.globalAlpha = 1 - K.ss(0, len, tt); g.drawImage(env.snap, 0, 0, w, h); g.restore(); } };
            if (info) voice = voicePlay(info);
            const t0 = performance.now();
            const frame = now => {
                if (ended) return; if (!box.isConnected) { finish(); return; }
                const el = now - t0, ph = el < main ? "main" : "tail";
                if (ph === "tail" && !env.tailed) {                  // freeze the last picture of the main act, the endings break/fade it away
                    env.tailed = 1; const sn = document.createElement("canvas"); sn.width = cv.width; sn.height = cv.height; sn.getContext("2d").drawImage(cv, 0, 0); env.snap = sn;
                    if (gf) { const s2 = sn.getContext("2d"); s2.drawImage(gf.canvas, 0, 0); gf.setTransform(1, 0, 0, 1, 0, 0); gf.clearRect(0, 0, cv.width, cv.height); }
                    if (S.tailFx === "shatter") { const L = []; for (let k = 0; k < 9; k++) L.push(K.randLine(k + 40 + (S.seed || 0), w, h)); env.shards = K.shardsOf(w, h, L); }
                    try { S.tailStart && S.tailStart(X); } catch (e) { console.warn(e); }
                }
                const T = { ph, t: Math.min(1, el / main), tt: ph === "tail" ? Math.min(1, (el - main) / tail) : 0, s: el / 1000, el };
                X.s = T.s; X.t = T.t; X.fx = {};
                g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); if (gf) { gf.setTransform(dpr, 0, 0, dpr, 0, 0); gf.clearRect(0, 0, w, h); }
                g.save();
                try { if (ph === "main") S.main(g, X, T); else if (S.tail) S.tail(g, X, T); else kd.draw(g, X, T, S); } catch (e) { console.warn(e); }
                g.restore();
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
/* for the preview page / tests: draw one frame of a scene's main act at time t (0..1) without the DOM side */
export function cineFrame(key, g, w, h, t, X0) {
    const S = SCENES[key], m = META[key], c = { k: key.slice(-1) };
    const calls = [], X = Object.assign({ g, gf: g, w, h, M: Math.min(w, h), cx: w / 2, cy: h / 2, col: S.col, kanji: KANJI[c.k], who: "Player", cap: m[1], ab: m[0], kj: m[2], focus: [m[3], m[4]], art: null, fx: {}, main: S.ms || V_MS, place: (...a) => calls.push(a), cue() {}, reveal() {} }, X0);
    const T = { ph: "main", t, tt: 0, s: t * X.main / 1000, el: t * X.main }; X.s = T.s; X.t = t;
    g.save(); S.main(g, X, T); g.restore(); const f = X.fx;
    calls.forEach(([i, r, a, lift]) => { if (!a) return; g.save(); g.globalAlpha = a; const n = 5, sc = Math.min(r.h / 176, 1.15), cw = 118 * sc, step = Math.min(cw * .85, Math.max(4, (r.w - cw) / (n - 1))), x0 = r.x + (r.w - (cw + step * (n - 1))) / 2, y0 = r.y + (r.h - 176 * sc) / 2 - Math.sin((lift || 0) * Math.PI) * r.h * .3;
        for (let k = 0; k < n; k++) { g.fillStyle = i ? "#2f6fe4" : "#e11b1b"; g.strokeStyle = "#fff"; g.lineWidth = 2; g.fillRect(x0 + k * step, y0, cw, 176 * sc); g.strokeRect(x0 + k * step, y0, cw, 176 * sc); } g.restore(); });   // preview stand-ins for the real DOM cards
    if (f.glitch) K.glitch(g, T.s, f.glitch); if (f.rgb) K.rgbSplit(g, f.rgb); if (f.inv) K.impact(g, f.inv === true ? null : f.inv); if (f.flash) K.flash(g, w, h, f.flash[0], f.flash[1]);
    return X;
}
export const cineMeta = META;
