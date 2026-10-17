/* =====================================================================
   RESULTS SEQUENCE (every mode)
   showResults({...}) builds a cinematic victory / defeat / draw screen:
   slash bands -> kanji -> title slam -> podium -> reveal -> stat chips ->
   XP bar (+ level up) -> achievements -> action buttons.
   It owns one canvas loop that stops by itself; call the returned close().
   ===================================================================== */
import { avatarEl } from "./profile.js";
import { audio } from "./audio.js";
import { motionOK, countUp } from "./fx.js";

const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
let active = null;

export function closeResults() { if (active) { active.close(); active = null; } }

export function showResults(o) {
    closeResults();
    const host = o.mount || document.getElementById("vx");
    const fixed = !o.mount;
    const outcome = o.outcome || "neutral", win = outcome === "win", lose = outcome === "lose";
    const root = mk("div", "vx-root vx-" + outcome + (fixed ? " vx-fixed" : ""));
    root.style.setProperty("--vc", lose ? (o.loseColor || "#b3141f") : (o.color || (win ? "#ffcf4a" : "#e8e8f4")));
    root.setAttribute("role", "dialog"); root.setAttribute("aria-label", o.title || "Results");
    const cv = mk("canvas", "vx-cv"); root.appendChild(cv);
    root.appendChild(mk("div", "vx-band a")); root.appendChild(mk("div", "vx-band b"));
    if (lose) root.appendChild(crack());
    root.appendChild(mk("div", "vx-kanji", o.kanji || (win ? "勝利" : lose ? "敗北" : "決着")));

    const body = mk("div", "vx-body");
    if (o.kicker) body.appendChild(mk("div", "vx-kicker", o.kicker));
    const t = mk("h1", "vx-title", o.title || (win ? "VICTORY" : lose ? "DEFEAT" : "RESULTS")); t.dataset.text = t.textContent; body.appendChild(t);
    if (o.subtitle) body.appendChild(mk("p", "vx-sub", o.subtitle));

    if (o.podium && o.podium.length) {
        const pod = mk("div", "vx-podium" + (o.podium.length > 3 ? " many" : ""));
        o.podium.forEach((r, i) => {
            const c = mk("div", "vx-pl" + (r.win ? " champ" : "") + (r.me ? " me" : "")); c.style.setProperty("--i", i);
            if (r.win) c.appendChild(mk("div", "vx-crown", "👑"));
            c.appendChild(avatarEl(r.player, { size: r.win ? 92 : 64, badge: true }));
            c.appendChild(mk("b", "vx-pn", (r.player && r.player.name) || "Player"));
            if (r.player && r.player.ttl) c.appendChild(mk("small", "vx-pt", r.player.ttl));
            if (r.score != null) c.appendChild(mk("div", "vx-ps", String(r.score)));
            if (r.label) c.appendChild(mk("div", "vx-pl-l", r.label));
            pod.appendChild(c);
        });
        body.appendChild(pod);
    }
    if (o.reveal) { const rv = mk("div", "vx-reveal"); rv.appendChild(o.reveal); body.appendChild(rv); }
    if (o.chips && o.chips.length) {
        const ch = mk("div", "vx-chips");
        o.chips.forEach((c, i) => { const d = mk("div", "vx-chip"); d.style.setProperty("--i", i); d.append(mk("small", null, c[0]), mk("b", null, String(c[1]))); ch.appendChild(d); });
        body.appendChild(ch);
    }
    let xpEl = null;
    if (o.progress) {
        const pr = o.progress; xpEl = mk("div", "vx-xp");
        const top = mk("div", "vx-xp-top"); const lv = mk("b", "vx-lv", "LV " + pr.before.lvl), gain = mk("span", "vx-gain", "+" + pr.gain + " XP");
        top.append(lv, gain); if (pr.streak >= 2 && win) top.appendChild(mk("span", "vx-streak", "🔥 " + pr.streak + " WIN STREAK"));
        const bar = mk("div", "xpbar big"), fill = mk("i"); fill.style.width = Math.round(pr.before.pct * 100) + "%"; bar.appendChild(fill);
        const txt = mk("small", "vx-xp-txt", pr.before.into + " / " + pr.before.need);
        xpEl.append(top, bar, txt); body.appendChild(xpEl);
        xpEl._run = () => runXp(pr, lv, fill, txt, xpEl);
    }
    let achBox = null;
    if (o.progress && o.progress.achievements && o.progress.achievements.length) {
        achBox = mk("div", "vx-ach");
        o.progress.achievements.forEach((a, i) => { const d = mk("div", "vx-ach-card"); d.style.setProperty("--i", i); d.append(mk("span", "ach-i", a.icon), mk("b", null, a.name), mk("small", null, a.desc)); achBox.appendChild(d); });
        body.appendChild(achBox);
    }
    const acts = mk("div", "vx-actions");
    (o.actions || []).forEach(a => { if (!a) return; const b = mk("button", "btn " + (a.kind || ""), a.label); if (a.id) b.id = a.id; b.onclick = e => { audio.sfx("click"); a.onClick && a.onClick(e); }; acts.appendChild(b); });
    if (o.note) acts.appendChild(mk("p", "vx-note", o.note));
    body.appendChild(acts);
    if (o.extra) body.appendChild(o.extra);
    root.appendChild(body);

    if (fixed) { host.innerHTML = ""; host.classList.remove("hidden"); } else host.innerHTML = "";
    host.appendChild(root);
    requestAnimationFrame(() => root.classList.add("go"));

    // sound + timed beats
    const timers = [];
    const at = (ms, f) => timers.push(setTimeout(f, motionOK() ? ms : Math.min(ms, 200)));
    audio.duck(4200);
    at(320, () => audio.sfx(win ? "impact" : lose ? "strike" : "stamp"));
    at(520, () => audio.sfx(win ? "win" : lose ? "lose" : "reveal"));
    if (xpEl) at(2000, () => xpEl._run());
    if (achBox) at(2900, () => { achBox.classList.add("go"); audio.sfx("achievement"); });
    const stop = canvasLoop(cv, outcome);
    const api = {
        root,
        close() { timers.forEach(clearTimeout); stop(); root.remove(); if (fixed) host.classList.add("hidden"); if (active === api) active = null; },
        setNote(txt) { let n = acts.querySelector(".vx-note"); if (!n) { n = mk("p", "vx-note"); acts.appendChild(n); } n.textContent = txt; },
        actions: acts
    };
    active = api;
    return api;
}

function runXp(pr, lv, fill, txt, box) {
    // animate through every level gained
    const steps = []; let L = pr.before.lvl, from = pr.before.into, xpLeft = pr.gain;
    while (xpLeft > 0) { const need = 100 + 60 * (L - 1), take = Math.min(xpLeft, need - from); steps.push({ L, from, to: from + take, need }); xpLeft -= take; from += take; if (from >= need) { L++; from = 0; } }
    let i = 0;
    const next = () => {
        const s = steps[i++]; if (!s) return;
        lv.textContent = "LV " + s.L;
        countUp(txt, s.from, s.to, 700, v => Math.round(v) + " / " + s.need, (v) => { fill.style.width = (v / s.need * 100) + "%"; if (Math.random() < .25) audio.sfx("xp"); });
        setTimeout(() => {
            if (s.to >= s.need) { lv.textContent = "LV " + (s.L + 1); fill.style.width = "0%"; box.classList.remove("lvup"); void box.offsetWidth; box.classList.add("lvup"); audio.sfx("levelup");
                if (pr.unlocked && pr.unlocked.length && i === steps.length) box.appendChild(mk("div", "vx-unlock", "Unlocked: " + pr.unlocked.join(" · "))); }
            next();
        }, motionOK() ? 760 : 10);
    };
    next();
}

function crack() {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("class", "vx-crack"); s.setAttribute("viewBox", "0 0 100 100"); s.setAttribute("preserveAspectRatio", "none");
    const d = ["M50 46 L22 0", "M50 46 L0 30", "M50 46 L4 78", "M50 46 L30 100", "M50 46 L70 100", "M50 46 L100 70", "M50 46 L96 18", "M50 46 L64 0", "M36 26 L18 36", "M64 62 L82 54", "M40 70 L56 80"];
    d.forEach(p => { const e = document.createElementNS("http://www.w3.org/2000/svg", "path"); e.setAttribute("d", p); s.appendChild(e); });
    return s;
}

function canvasLoop(cv, outcome) {
    if (!motionOK()) return () => {};
    const g = cv.getContext("2d"); let W = 0, H = 0, raf = 0, alive = true; const dpr = Math.min(1.5, devicePixelRatio || 1), t0 = performance.now();
    const size = () => { W = cv.clientWidth || innerWidth; H = cv.clientHeight || innerHeight; cv.width = W * dpr; cv.height = H * dpr; };
    size();
    const win = outcome === "win", lose = outcome === "lose", ps = [], R = Math.random;
    const cols = win ? ["#ffd45a", "#fff3b0", "#ff9e2c", "#ffffff", "#ff5a7a", "#7df3ff"] : lose ? ["#5a5560", "#7a7480", "#3a3540"] : ["#e8e8f4", "#c9a56a", "#ffffff"];
    const spawn = (n, burst) => { for (let i = 0; i < n; i++) { const a = R() * 6.283, sp = 4 + R() * 12; ps.push(burst ? { x: W / 2, y: H * .3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, r: R() * 6, vr: (R() - .5) * .3, s: 6 + R() * 8, c: cols[(R() * cols.length) | 0], g: .28, k: 0 } : { x: R() * W, y: -20, vx: (R() - .5) * 1.4, vy: lose ? .8 + R() * 1.2 : 1.6 + R() * 2.4, r: R() * 6, vr: (R() - .5) * .1, s: lose ? 1.5 + R() * 2.5 : 5 + R() * 7, c: cols[(R() * cols.length) | 0], g: 0, k: 1 }); } };
    if (win) setTimeout(() => spawn(160, true), 380);
    const frame = now => {
        if (!alive) return;
        const s = (now - t0) / 1000;
        if (!cv.isConnected || s > 14) { alive = false; return; }
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
        // god rays behind the title
        if (!lose) { g.save(); g.translate(W / 2, H * .3); g.rotate(s * .08); g.globalAlpha = Math.min(1, s / .8) * (win ? .16 : .08); g.fillStyle = win ? "#ffd45a" : "#ffffff"; const RR = Math.hypot(W, H); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - .05) * RR, Math.sin(a - .05) * RR); g.lineTo(Math.cos(a + .05) * RR, Math.sin(a + .05) * RR); g.fill(); } g.restore(); }
        // shockwave
        const rr = (s - .3) * Math.max(W, H) * 1.3; if (rr > 0 && rr < Math.max(W, H) * 1.2) { g.globalAlpha = Math.max(0, 1 - rr / (Math.max(W, H) * 1.2)); g.strokeStyle = win ? "#fff3b0" : lose ? "#c5121e" : "#ffffff"; g.lineWidth = 12; g.beginPath(); g.arc(W / 2, H * .3, rr, 0, 6.283); g.stroke(); }
        if (s < 9 && R() < (win ? .9 : lose ? .8 : .3)) spawn(win ? 2 : 1, false);
        for (let i = ps.length - 1; i >= 0; i--) {
            const p = ps[i]; p.vy += p.g; if (!p.k) { p.vx *= .985; } p.x += p.vx + (p.k ? Math.sin(s * 2 + i) * .3 : 0); p.y += p.vy; p.r += p.vr;
            if (p.y > H + 30) { ps.splice(i, 1); continue; }
            g.globalAlpha = lose ? .55 : 1; g.fillStyle = p.c; g.save(); g.translate(p.x, p.y); g.rotate(p.r);
            if (lose) g.fillRect(-p.s, -p.s * .4, p.s * 2, p.s * .8); else if (i % 4 === 0) { g.beginPath(); for (let k = 0; k < 8; k++) { const rad = k % 2 ? p.s * .18 : p.s * .6, a = k * .785; g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } g.fill(); } else g.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6);
            g.restore();
        }
        g.globalAlpha = 1;
        raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onR = () => size(); addEventListener("resize", onR);
    return () => { alive = false; cancelAnimationFrame(raf); removeEventListener("resize", onR); };
}
