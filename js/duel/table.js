/* =====================================================================
   ANIME TCG · THE DUEL TABLE (presentation only: no rules, no intents)
   The playmat, the printed zones, the Deck and Graveyard piles, the table under it and the room's light.
   - Each player's half of the mat is printed in the colours and emblem of the series most common in their deck.
     HOOK (a playmat picker later): mountDuel's `o.playmat(p)` or a public profile field `mat` may name a series key
     (or give { c1, c2, c3, emblem }); matFor() uses it before the deck's most common series. No shop for it yet.
   - Piles: the Deck is a stack of backs whose visible thickness follows the count; the Graveyard shows its last
     cards face-up, each turned a little (the same turn every render, from the card's id), on a stack of the same kind.
   - Ambient: dust motes in the light (canvas, capped), a small camera parallax from the pointer (desktop) or the
     device tilt (phones, only after the permission is granted; otherwise a slow idle drift). Reduced effects (or the
     system's reduced motion): a still table, no parallax, no motes.
   Every number is in config DUEL.table.
   ===================================================================== */
import { DUEL } from "../vault/config.js?v=21";
import { theme, SERIES_THEME } from "../vault/cardui.js?v=20";

const T = () => DUEL.table;
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const arr = v => Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];
/* a stable small number per card / pile (so a card keeps the same turn on every render) */
export function jitter(key, span) { let h = 2166136261; for (const ch of String(key)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 2001 / 1000 - 1) * span; }

/* ---------- the playmat ---------- */
/* the host picks each player's mat once, from the WHOLE deck (the other players never see the deck itself, only
   its most common series, like a real playmat on the table): { pN: series key }. picks(p) = a chosen playmat (hook). */
export function deckMats(decks, defs, picks) {
    const out = {};
    Object.entries(decks || {}).forEach(([k, list]) => {
        const pick = picks && picks(Number(String(k).replace(/^p/, "")));
        if (pick && SERIES_THEME[pick]) { out[k] = pick; return; }
        const counts = {};
        arr(list).map(String).forEach(id => { if (id.startsWith("a:")) return; const d = defs.card(Number(id)); if (d && d.s) counts[d.s] = (counts[d.s] || 0) + 1; });
        const s = Object.entries(counts).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
        out[k] = s ? s[0] : "onepiece";
    });
    return out;
}
/* which mat a player sits at: the hook first, then the host's choice in the state, then (an older duel without it)
   the series most common among their cards this view can see */
export function matFor(v, p, o) {
    const pick = (o.playmat && o.playmat(p)) || ((o.pub && o.pub(p)) || {}).mat;
    if (pick && typeof pick === "object") return Object.assign({ key: "custom" }, pick);
    if (pick && SERIES_THEME[pick]) return { key: pick };
    const fromHost = (v.mats || {})["p" + p]; if (fromHost && SERIES_THEME[fromHost]) return { key: fromHost };
    const counts = {};
    Object.values(v.cards || {}).forEach(c => { if (Number(c.o) === Number(p) && !String(c.id).startsWith("a:")) { const d = o.defs.card(Number(c.id)); if (d) counts[d.s] = (counts[d.s] || 0) + 1; } });
    const s = Object.entries(counts).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
    return { key: s ? s[0] : "onepiece" };
}
const patCache = new Map();
/* the emblem as a small repeating print (a data URI built once per series and colour) */
function patternURL(key, emblem, col) {
    const k = key + col; if (patCache.has(k)) return patCache.get(k);
    let u = "none";
    if (emblem && emblem.startsWith("<svg")) {
        const s = emblem.replace("<svg ", `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" opacity=".09" `).replace(/currentColor/g, col);
        u = `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
    }
    patCache.set(k, u); return u;
}
export function paintMat(side, m) {
    const S = m.key !== "custom" ? theme(m.key) : m, c1 = m.c1 || S.c1, c2 = m.c2 || S.c2, c3 = m.c3 || S.c3;
    side.style.setProperty("--m1", c1); side.style.setProperty("--m2", c2); side.style.setProperty("--m3", c3);
    side.style.setProperty("--mpat", patternURL(m.key, m.emblem || S.emblem, c3));
    side.dataset.mat = m.key;
}
/* the printed medallion in the empty corner of a player's half: the series emblem, its kanji and name */
export function medallion(m) {
    const S = m.key !== "custom" ? theme(m.key) : m, box = mk("div", "dz-medal");
    box.setAttribute("aria-hidden", "true");
    const em = mk("span", "dz-memb"); em.innerHTML = m.emblem || S.emblem || ""; box.appendChild(em);
    if (S.kanji) box.appendChild(mk("b", "dz-mkanji", S.kanji));
    box.appendChild(mk("small", "dz-mname", S.short || S.label || ""));
    return box;
}

/* ---------- piles ---------- */
/* the visible thickness of a pile of n cards (px), the same rule for the Deck and the Graveyard */
export const pileDepth = n => Math.round(Math.min(Number(n) || 0, T().pileMax) * T().pileStep * 10) / 10;
/* the Deck: backs, thinner as it empties; the count on a small tag */
export function deckPile(p, n, back) {
    const z = mk("div", "dz-pz deck" + (n ? " full" : " free")); z.dataset.p = p; z.dataset.kind = "deck";
    z.setAttribute("aria-label", "Deck: " + n + " card" + (n === 1 ? "" : "s"));
    if (n) {
        const pile = mk("div", "dz-pile3"); pile.style.setProperty("--th", pileDepth(n) + "px");
        pile.appendChild(mk("i", "dz-pedge"));
        const top = back(); top.classList.add("dz-ptop"); top.style.setProperty("--r", jitter("deck" + p + ":" + n, T().deckRotDeg).toFixed(2) + "deg");
        pile.appendChild(top); z.appendChild(pile);
    } else z.appendChild(mk("span", "dz-zl", "Deck"));
    z.appendChild(mk("b", "dz-pcount", String(n)));
    return z;
}
/* the Graveyard: the last few cards face-up, each at its own small angle and offset, newest on top */
export function gyPile(p, list, face, onOpen) {
    const n = list.length, z = mk("button", "dz-pz gy" + (n ? " full" : " free")); z.type = "button"; z.dataset.p = p; z.dataset.kind = "gy";
    z.setAttribute("aria-label", "Graveyard: " + n + " card" + (n === 1 ? "" : "s") + ". Open it");
    z.title = "Graveyard: tap to see it";
    if (n) {
        const pile = mk("div", "dz-pile3 gy"); pile.style.setProperty("--th", pileDepth(Math.max(0, n - 1)) + "px");
        pile.appendChild(mk("i", "dz-pedge"));
        list.slice(-T().gyShow).forEach((u, i, a) => {
            const el = face(u); if (!el) return;
            el.classList.add("dz-ptop"); el.removeAttribute("data-u");
            el.style.setProperty("--r", jitter(u, T().gyRotDeg).toFixed(2) + "deg");
            el.style.setProperty("--ox", jitter(u + "x", T().gyOffset).toFixed(1) + "px"); el.style.setProperty("--oy", jitter(u + "y", T().gyOffset).toFixed(1) + "px");
            el.style.zIndex = String(i + 1); if (i < a.length - 1) el.classList.add("under");
            pile.appendChild(el);
        });
        z.appendChild(pile);
    } else z.appendChild(mk("span", "dz-zl", "Graveyard"));
    z.appendChild(mk("b", "dz-pcount", String(n)));
    if (onOpen) z.onclick = e => { e.stopPropagation(); onOpen(); };
    return z;
}

/* ---------- the room: the table surface, the light, the dust, the camera ---------- */
const reduced = () => document.body.classList.contains("fx-lite") || !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const TKEY = "aap_tilt";   // the same permission memory as the Season 3 skins
export function mountTable(root, board) {
    const page = root.closest("#cardvault") || root.parentElement;
    if (page) page.classList.add("dz-tablepage");
    const room = mk("div", "dz-room"); room.setAttribute("aria-hidden", "true");
    const wood = mk("i", "dz-wood"), blur = mk("i", "dz-wood dz-dof"), light = mk("i", "dz-light"), vig = mk("i", "dz-vig"), cv = mk("canvas", "dz-dust");
    room.append(wood, blur, light, cv, vig);
    root.prepend(room);
    const S = { tx: 0, ty: 0, x: 0, y: 0, t: 0, ptrT: -1e9, tilt: null, raf: 0, last: 0, motes: [], w: 0, h: 0, on: false };
    const coarse = () => !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
    /* the pointer (desktop): the camera leans toward it */
    const onMove = e => { if (e.pointerType !== "mouse") return; S.tx = (e.clientX / innerWidth - .5) * 2; S.ty = (e.clientY / innerHeight - .5) * 2; S.ptrT = performance.now(); };
    /* the device tilt (phones): only once permitted; iOS asks on the first tap inside the duel */
    const onTilt = e => { if (e.gamma == null) return; const k = T().tiltDeg; S.tilt = { x: Math.max(-1, Math.min(1, e.gamma / k)), y: Math.max(-1, Math.min(1, (e.beta - 45) / k)) }; };
    let tiltOn = false;
    const listenTilt = () => { if (tiltOn) return; tiltOn = true; addEventListener("deviceorientation", onTilt); };
    const askTilt = async () => {
        root.removeEventListener("pointerdown", askTilt);
        if (reduced() || !coarse() || typeof DeviceOrientationEvent === "undefined") return;
        try { if (typeof DeviceOrientationEvent.requestPermission === "function") { const r = await DeviceOrientationEvent.requestPermission(); if (r !== "granted") { localStorage.setItem(TKEY, "denied"); return; } } } catch (e) { return; }
        try { localStorage.setItem(TKEY, "granted"); } catch (e) {}
        listenTilt();
    };
    try { const st = localStorage.getItem(TKEY); if (st === "granted" && typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission !== "function") listenTilt(); else if (st !== "denied") root.addEventListener("pointerdown", askTilt); } catch (e) {}
    addEventListener("pointermove", onMove, { passive: true });
    /* the dust: soft motes drifting through the light pool, drawn from one pre-rendered sprite */
    const sprite = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d"), r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, "rgba(255,240,205,.95)"); r.addColorStop(.35, "rgba(255,232,190,.35)"); r.addColorStop(1, "rgba(255,232,190,0)"); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return c; })();
    const g = cv.getContext("2d");
    function size() {
        const w = innerWidth, h = innerHeight; if (w === S.w && h === S.h) return; S.w = w; S.h = h; cv.width = w; cv.height = h;
        const n = Math.min(T().maxMotes, coarse() ? T().motesPhone : T().motes);
        S.motes = Array.from({ length: n }, (_, i) => ({ x: Math.random() * w, y: Math.random() * h, s: 2 + Math.random() * 5, vx: (Math.random() - .5) * 6, vy: -2 - Math.random() * 6, ph: Math.random() * 6.28, d: .4 + Math.random() * .6 }));
    }
    function dust(dt, ox, oy) {
        g.clearRect(0, 0, S.w, S.h);
        const cx = S.w / 2, cy = S.h * .48, rx = S.w * .42, ry = S.h * .46;
        S.motes.forEach(m => {
            m.x += m.vx * dt; m.y += m.vy * dt; m.ph += dt * .9;
            if (m.y < -10) { m.y = S.h + 10; m.x = Math.random() * S.w; } if (m.x < -10) m.x = S.w + 10; if (m.x > S.w + 10) m.x = -10;
            const px = m.x + ox * m.d, py = m.y + oy * m.d, k = 1 - Math.min(1, Math.hypot((px - cx) / rx, (py - cy) / ry));   // brighter inside the light
            if (k <= 0) return;
            g.globalAlpha = k * (.35 + .35 * Math.sin(m.ph)) * m.d; g.drawImage(sprite, px - m.s, py - m.s, m.s * 2, m.s * 2);
        });
        g.globalAlpha = 1;
    }
    const put = (el, px, x, y) => { el.style.transform = "translate3d(" + (x * px).toFixed(1) + "px," + (y * px).toFixed(1) + "px,0)"; };
    function frame(now) {
        S.raf = 0; if (!S.on || document.hidden || !root.isConnected) return;
        S.raf = requestAnimationFrame(frame);
        if (now - S.last < 1000 / T().fps - 1.5) return;
        const dt = Math.min(.1, S.last ? (now - S.last) / 1000 : .033); S.last = now; S.t += dt;
        let tx, ty;
        if (now - S.ptrT < 4000) { tx = S.tx; ty = S.ty; }
        else if (S.tilt) { tx = S.tilt.x; ty = S.tilt.y; }
        else { const w = S.t * T().idleDrift * 6.283; tx = Math.sin(w) * .5; ty = Math.cos(w * .8) * .4; }
        const k = Math.min(1, dt * T().ease); S.x += (tx - S.x) * k; S.y += (ty - S.y) * k;
        const P = T().parallax;   // px at full lean, per layer: the far table moves least, the light and dust most
        put(wood, -P.table, S.x, S.y); put(blur, -P.table, S.x, S.y); put(light, -P.light, S.x, S.y);
        // the mat moves by whole pixels so the cards' text stays sharp
        board.style.transform = "translate3d(" + Math.round(-S.x * P.mat) + "px," + Math.round(-S.y * P.mat) + "px,0)";
        size(); dust(dt, -S.x * P.dust, -S.y * P.dust);
    }
    function refresh() {
        const on = !reduced();
        room.classList.toggle("still", !on);
        if (on === S.on) { if (on && !S.raf) S.raf = requestAnimationFrame(frame); return; }
        S.on = on;
        if (on) { size(); S.last = 0; S.raf = requestAnimationFrame(frame); }
        else { cancelAnimationFrame(S.raf); S.raf = 0; [wood, blur, light, board].forEach(e => e.style.transform = ""); g.clearRect(0, 0, cv.width, cv.height); }
    }
    const vis = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", vis);
    refresh();
    return {
        refresh,
        destroy() { S.on = false; cancelAnimationFrame(S.raf); removeEventListener("pointermove", onMove); if (tiltOn) removeEventListener("deviceorientation", onTilt); document.removeEventListener("visibilitychange", vis); root.removeEventListener("pointerdown", askTilt); room.remove(); board.style.transform = ""; if (page) page.classList.remove("dz-tablepage"); },
        state: () => ({ on: S.on, motes: S.motes.length, x: S.x, y: S.y, tilt: tiltOn })
    };
}
