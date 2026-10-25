/* =====================================================================
   SHARED VISUAL FX
   - ambient: one full-screen canvas behind the UI, a particle preset per scene
   - titleCard: cinematic band that slams in when a match / phase starts
   - shake / ring / countUp / spotlight helpers used by every mode
   Everything respects "reduced effects" (settings) and prefers-reduced-motion,
   and the ambient loop sleeps while the tab is hidden.
   ===================================================================== */

const RKEY = "gw_fx_reduced";
let reduced = false;
try { reduced = localStorage.getItem(RKEY) === "1"; } catch (e) {}
const mq = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null;
export const motionOK = () => !reduced && !(mq && mq.matches);
export function setReduced(v) { reduced = !!v; try { localStorage.setItem(RKEY, reduced ? "1" : "0"); } catch (e) {} document.body.classList.toggle("fx-lite", !motionOK()); ambient.refresh(); }
export const isReduced = () => reduced;
document.body.classList.toggle("fx-lite", !motionOK());

/* ---------------- ambient particles ---------------- */
const PRESETS = {
    home:  { n: 46, kinds: [["ember", .8], ["petal", .2]], cols: ["#ff4a2a", "#ffb347", "#e11b1b", "#ffd88a"] },
    lobby: { n: 40, kinds: [["ember", .75], ["petal", .25]], cols: ["#ff4a2a", "#ffb347", "#e11b1b", "#ffd88a"] },
    gw:    { n: 34, kinds: [["mote", 1]], cols: ["#f2c46b", "#fff1c9", "#d9a441"] },
    hb:    { n: 26, kinds: [["orb", 1]], cols: ["#b06bff", "#3ee8ff", "#ff6bd6"], links: true },
    im:    { n: 40, kinds: [["ash", .85], ["spark", .15]], cols: ["#9a8f86", "#c9bfb4", "#ff3355"] },
    uno:   { n: 44, kinds: [["ember", .7], ["spark", .3]], cols: ["#ffcf4a", "#ff6a1a", "#ffffff"] },
    vy:    { n: 34, kinds: [["mote", .75], ["orb", .25]], cols: ["#7ff6e6", "#f4c76a", "#bfe9ff"] },
    vyb:   { n: 40, kinds: [["ember", .7], ["spark", .3]], cols: ["#ff5a5a", "#ff9f1c", "#7ff6e6"] },
    none:  { n: 0, kinds: [], cols: [] }
};
const ambient = (() => {
    const cv = document.getElementById("ambient"), g = cv ? cv.getContext("2d") : null;
    let scene = "none", parts = [], raf = 0, last = 0, W = 0, H = 0, dpr = 1, accent = null, frame = 0;
    const rand = (a, b) => a + Math.random() * (b - a);
    function size() { if (!cv) return; dpr = Math.min(1.25, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; }
    function spawn(p, init) {
        const pr = PRESETS[scene], r = Math.random(); let acc = 0, kind = pr.kinds[0][0];
        for (const [k, w] of pr.kinds) { acc += w; if (r <= acc) { kind = k; break; } }
        const col = (accent && Math.random() < .5) ? accent : pr.cols[(Math.random() * pr.cols.length) | 0];
        Object.assign(p, { kind, col, x: rand(0, W), y: init ? rand(0, H) : (kind === "petal" || kind === "ash" ? -20 : H + 20), a: 0, life: 0, max: rand(6, 14), ph: rand(0, 6.28), s: 1 });
        switch (kind) {
            case "ember": p.vx = rand(-8, 8); p.vy = rand(-38, -16); p.s = rand(1, 2.6); break;
            case "spark": p.vx = rand(-20, 20); p.vy = rand(-60, -30); p.s = rand(.8, 1.6); p.max = rand(2, 4); break;
            case "petal": p.vx = rand(10, 28); p.vy = rand(14, 30); p.s = rand(3, 5.5); p.rot = rand(0, 6.28); break;
            case "mote":  p.vx = rand(-5, 5); p.vy = rand(-6, 2); p.s = rand(.8, 2.2); if (!init) p.y = rand(0, H); break;
            case "orb":   p.vx = rand(-9, 9); p.vy = rand(-9, 9); p.s = rand(2, 5); p.max = rand(10, 20); if (!init) p.y = rand(0, H); break;
            case "ash":   p.vx = rand(-6, 10); p.vy = rand(10, 24); p.s = rand(1, 2.4); p.rot = rand(0, 6.28); break;
        }
        return p;
    }
    function build() {
        const pr = PRESETS[scene] || PRESETS.none, area = Math.min(1.4, (W * H) / (1440 * 900));
        const n = motionOK() ? Math.round(pr.n * Math.max(.45, area)) : 0;
        parts = []; for (let i = 0; i < n; i++) parts.push(spawn({}, true));
    }
    function draw(now) {
        raf = 0;
        if (document.hidden || !parts.length) return;
        raf = requestAnimationFrame(draw);
        if (++frame % 2) return;                          // ~30 fps is plenty for ambience
        const dt = Math.min(.08, (now - last) / 1000 || .033); last = now;
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
        const pr = PRESETS[scene];
        for (const p of parts) {
            p.life += dt; p.ph += dt;
            p.x += (p.vx + Math.sin(p.ph * .9) * 6) * dt; p.y += p.vy * dt;
            const fade = Math.min(1, p.life / 1.2) * Math.min(1, (p.max - p.life) / 1.5);
            if (p.life > p.max || p.y < -40 || p.y > H + 40 || p.x < -40 || p.x > W + 40) { spawn(p, false); continue; }
            g.globalAlpha = Math.max(0, fade) * (p.kind === "mote" ? .55 : p.kind === "ash" ? .5 : .85);
            g.fillStyle = p.col;
            if (p.kind === "petal") { p.rot += dt * 1.4; g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = "#ffb7c9"; g.beginPath(); g.ellipse(0, 0, p.s, p.s * .5, 0, 0, 6.283); g.fill(); g.restore(); }
            else if (p.kind === "ash") { p.rot += dt; g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillRect(-p.s, -p.s * .4, p.s * 2, p.s * .8); g.restore(); }
            else if (p.kind === "orb") { const r = p.s * (1 + .25 * Math.sin(p.ph * 2)); const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5); gr.addColorStop(0, p.col); gr.addColorStop(1, "transparent"); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, r * 5, 0, 6.283); g.fill(); }
            else { g.beginPath(); g.arc(p.x, p.y, p.s, 0, 6.283); g.fill(); if (p.kind !== "mote") { g.globalAlpha *= .25; g.beginPath(); g.arc(p.x, p.y, p.s * 3.2, 0, 6.283); g.fill(); } }
        }
        if (pr && pr.links) {
            g.lineWidth = 1;
            for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
                const a = parts[i], b = parts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
                if (d < 170) { g.globalAlpha = (1 - d / 170) * .22; g.strokeStyle = a.col; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
            }
        }
        g.globalAlpha = 1;
    }
    function kick() { if (!raf && parts.length && !document.hidden && g) { last = performance.now(); raf = requestAnimationFrame(draw); } }
    window.addEventListener("resize", () => { size(); build(); kick(); });
    document.addEventListener("visibilitychange", kick);
    size();
    return {
        set(s, acc) { if (!g) return; const changed = s !== scene; scene = PRESETS[s] ? s : "none"; if (acc !== undefined) accent = acc; if (changed) { build(); g.clearRect(0, 0, cv.width, cv.height); } kick(); },
        accent(c) { accent = c; },
        refresh() { build(); if (!parts.length && g) g.clearRect(0, 0, cv.width, cv.height); kick(); }
    };
})();
export { ambient };

/* ---------------- title card ---------------- */
let tcTimer = 0;
export function titleCard({ kicker = "", title = "", sub = "", kanji = "", color = "#e11b1b", ms = 2100 } = {}) {
    const el = document.getElementById("titleCard"); if (!el) return Promise.resolve();
    clearTimeout(tcTimer);
    el.innerHTML = "";
    el.style.setProperty("--tc", color);
    const k = document.createElement("div"); k.className = "tc-kanji"; k.textContent = kanji;
    const band = document.createElement("div"); band.className = "tc-band";
    const kk = document.createElement("div"); kk.className = "tc-kicker"; kk.textContent = kicker;
    const tt = document.createElement("div"); tt.className = "tc-title"; tt.textContent = title; tt.dataset.text = title;
    const ss = document.createElement("div"); ss.className = "tc-sub"; ss.textContent = sub;
    band.append(kk, tt, ss); el.append(k, band);
    el.classList.remove("hidden", "out"); void el.offsetWidth; el.classList.add("in");
    if (!motionOK()) ms = Math.min(ms, 1200);
    return new Promise(res => {
        tcTimer = setTimeout(() => { el.classList.add("out"); tcTimer = setTimeout(() => { el.classList.add("hidden"); el.classList.remove("in", "out"); res(); }, 380); }, ms);
    });
}

/* ---------------- small helpers ---------------- */
export function shake(el, power = 10, ms = 380) {
    if (!el || !motionOK() || !el.animate) return;
    const k = []; for (let i = 0; i < 7; i++) { const p = power * (1 - i / 7); k.push({ transform: "translate(" + ((Math.random() - .5) * 2 * p).toFixed(1) + "px," + ((Math.random() - .5) * 2 * p).toFixed(1) + "px)" }); }
    k.push({ transform: "none" });
    el.animate(k, { duration: ms, easing: "ease-out" });
}
export function ring(x, y, color = "#fff", size = 220, ms = 650, parent = document.body) {
    if (!motionOK()) return;
    const r = document.createElement("div"); r.className = "fx-ring"; r.style.cssText = "left:" + x + "px;top:" + y + "px;--rc:" + color + ";--rs:" + size + "px;--rt:" + ms + "ms";
    parent.appendChild(r); setTimeout(() => r.remove(), ms + 50);
}
export function burstText(text, x, y, color = "#fff", cls = "") {
    const d = document.createElement("div"); d.className = "fx-pop " + cls; d.textContent = text; d.style.cssText = "left:" + x + "px;top:" + y + "px;--pc:" + color;
    document.body.appendChild(d); setTimeout(() => d.remove(), 1400);
}
export function countUp(el, from, to, ms = 900, fmt = v => String(Math.round(v)), onTick) {
    if (!el) return;
    if (!motionOK() || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const step = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3), v = from + (to - from) * e; el.textContent = fmt(v); if (onTick) onTick(v, k); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
}
// fly a visual clone of `src` (an element or rect) to `dst` rect; resolves when it lands
export function flyClone(node, from, to, { ms = 420, rot = 0, scale = 1, easing = "cubic-bezier(.2,.8,.25,1)", z = 80 } = {}) {
    if (!node || !from || !to || !motionOK()) { if (node && node.remove) node.remove(); return Promise.resolve(); }
    node.style.cssText += ";position:fixed;left:" + from.left + "px;top:" + from.top + "px;width:" + from.width + "px;height:" + from.height + "px;margin:0;z-index:" + z + ";pointer-events:none;transform-origin:50% 50%";
    document.body.appendChild(node);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2), s = (to.width / Math.max(1, from.width)) * scale;
    const a = node.animate([{ transform: "translate(0,0) rotate(0deg) scale(1)" }, { transform: "translate(" + dx * .55 + "px," + (dy * .55 - 40) + "px) rotate(" + rot * .6 + "deg) scale(" + (1 + (s - 1) * .5 + .08) + ")", offset: .6 }, { transform: "translate(" + dx + "px," + dy + "px) rotate(" + rot + "deg) scale(" + s + ")" }], { duration: ms, easing, fill: "forwards" });
    return new Promise(res => { a.onfinish = () => { node.remove(); res(); }; setTimeout(() => { node.remove(); res(); }, ms + 300); });
}
