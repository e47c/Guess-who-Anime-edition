/* =====================================================================
   PACK OPENING + CARD INSPECT (DOM; styles in css/cards.css)
   The pack was already rolled and saved (packs.js rollPack); this only reveals it, so a reload can never
   re-roll: an unrevealed pack waits in "Unopened" until it's opened again.
   1. the pack floats, its foil follows the finger / mouse
   2. swipe across the top to tear it (rip sound + foil confetti); "Open" button / Enter as a fallback
   3. the cards slide out face down; tap to flip one at a time (lowest rarity first, the best last)
   4. the reaction scales with rarity: Common plain, Rare glow, Ultra Rare / Epic flash + shake,
      Legendary / Mythic a full-screen reveal with its own sound
   5. hold a card to inspect it (tilt with finger / mouse, device tilt on phones when allowed)
   6. summary: every card, NEW tags, duplicates turning into shards
   Reduced effects: no float, tilt, shake, confetti or rays; flips are instant.
   ===================================================================== */
import { cardEl, packEl, backCard, theme, seriesVars, bindShine } from "./cardui.js?v=1";
import { CARDS, RARITY_NAMES } from "./carddb.js?v=1";
import { motionOK } from "../fx.js";

const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
let X = { sfx: () => {}, stamp: () => null, sleeve: () => "" };
export function initOpening(ctx) { X = Object.assign(X, ctx); }

/* ---------- confetti (foil bits) ---------- */
function confetti(host, cols, n = 120) {
    if (!motionOK()) return;
    const cv = mk("canvas", "pk-confetti"); host.appendChild(cv);
    const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth || innerWidth, H = cv.clientHeight || innerHeight; cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext("2d"), R = Math.random, ps = [];
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (R() - .5) * 2.2, sp = 6 + R() * 12; ps.push({ x: W / 2, y: H * .38, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: R() * 6, vr: (R() - .5) * .4, s: 4 + R() * 7, c: cols[(R() * cols.length) | 0] }); }
    const t0 = performance.now();
    const fr = now => {
        if (!cv.isConnected || now - t0 > 3200) { cv.remove(); return; }
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
        ps.forEach(p => { p.vy += .32; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.globalAlpha = .9; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2 * (1 + Math.sin(p.r * 3))); g.restore(); });
        requestAnimationFrame(fr);
    };
    requestAnimationFrame(fr);
}

/* ---------- the opening ---------- */
export function openPack(res, { onDone, onNext } = {}) {
    const T = theme(res.series), root = mk("div", "pk-open"); seriesVars(root, res.series);
    root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "Opening a " + T.label + " pack");
    const head = mk("header", "pk-head"), stage = mk("div", "pk-stage"), hint = mk("p", "pk-hint");
    hint.setAttribute("aria-live", "polite");
    const skip = mk("button", "btn ghost sm", "Skip ›"); skip.type = "button";
    head.append(mk("b", null, T.label + " · " + (res.kind === "premium" ? "Premium" : "Normal") + " pack"), skip);
    root.append(head, stage, hint);
    document.body.appendChild(root);
    let done = false, phase = "pack", idx = 0;
    const close = () => { if (done) return; done = true; removeEventListener("keydown", onKey); root.remove(); onDone && onDone(); };
    // 1-2. the pack
    const wrap = mk("div", "pk-packwrap"), pack = packEl(res.series, res.kind), zone = mk("div", "pk-tearzone"), line = mk("i", "pk-tearline"), flap = mk("div", "pk-flap");
    zone.setAttribute("aria-hidden", "true");
    wrap.append(pack, flap, zone, line); stage.appendChild(wrap);
    const openBtn = mk("button", "btn alt", "Tear it open"); openBtn.type = "button";
    hint.textContent = "Swipe across the top of the pack to tear it open.";
    const btnRow = mk("div", "pk-btns"); btnRow.appendChild(openBtn); stage.appendChild(btnRow); btnRow.style.position = "absolute"; btnRow.style.bottom = "4%";
    let unShine = bindShine(pack, {});
    const tiltPack = e => { if (!motionOK()) return; const r = wrap.getBoundingClientRect(); wrap.style.setProperty("--ry", (((e.clientX - r.left) / r.width - .5) * 16).toFixed(1) + "deg"); wrap.style.setProperty("--rx", ((.5 - (e.clientY - r.top) / r.height) * 12).toFixed(1) + "deg"); };
    stage.addEventListener("pointermove", tiltPack);
    let sx = null, maxX = 0;
    zone.addEventListener("pointerdown", e => { sx = e.clientX; maxX = 0; zone.setPointerCapture && zone.setPointerCapture(e.pointerId); X.sfx("tick"); });
    zone.addEventListener("pointermove", e => {
        if (sx == null) return; const r = wrap.getBoundingClientRect(), d = Math.abs(e.clientX - sx) / r.width;
        maxX = Math.max(maxX, d); line.style.setProperty("--tear", Math.min(100, maxX * 140) + "%");
        if (maxX > .62) { sx = null; tear(); }
    });
    zone.addEventListener("pointerup", () => { sx = null; if (phase === "pack") line.style.setProperty("--tear", "0%"); });
    openBtn.onclick = () => tear();
    function tear() {
        if (phase !== "pack") return; phase = "tearing";
        btnRow.remove(); zone.remove(); line.remove(); unShine(); stage.removeEventListener("pointermove", tiltPack);
        const top = packEl(res.series, res.kind); top.style.width = "100%"; flap.appendChild(top);
        wrap.classList.add("torn"); X.sfx("rip");
        confetti(root, [T.c1, T.c2, T.c3, "#ffffff", res.kind === "premium" ? "#ffd76a" : "#c0c0c0"]);
        hint.textContent = "";
        setTimeout(showStack, motionOK() ? 900 : 60);
    }
    // 3. the stack
    let deck = null; const cards = res.cards.map(c => Object.assign({}, c)), els = [];
    const row = mk("div", "pk-row");
    function showStack() {
        wrap.remove(); phase = "flip";
        deck = mk("div", "pk-deck"); stage.appendChild(deck);
        cards.forEach((c, k) => {
            const el = cardEl(c.id, { holo: !!c.h, size: "lg", isNew: !!c.isNew, sleeve: X.sleeve() }); el.classList.add("down", "enter", "waiting");
            el.style.setProperty("--k", cards.length - 1 - k); el.style.zIndex = String(100 - k); el.setAttribute("tabindex", "-1");
            deck.appendChild(el); els.push(el);
        });
        root.insertBefore(row, hint);
        X.sfx("draw");
        hint.textContent = "Tap the card to flip it · " + cards.length + " cards";
        deck.addEventListener("click", onTap);
        holdToInspect(deck, () => { const el = els[idx]; return el && !el.classList.contains("down") ? cards[idx] : null; });
    }
    let busy = false;
    function onTap() {
        if (busy || phase !== "flip") return;
        const el = els[idx]; if (!el) return;
        if (el.classList.contains("down")) { flip(el, cards[idx]); return; }
        // move the flipped card down to the row, next one
        el.classList.add("gone"); X.sfx("card");
        const mini = cardEl(cards[idx].id, { holo: !!cards[idx].h, size: "xs" }); row.appendChild(mini);
        idx++;
        if (idx >= els.length) setTimeout(summary, motionOK() ? 400 : 10);
        else hint.textContent = "Tap to flip · " + (els.length - idx) + " left";
    }
    function flip(el, c) {
        busy = true;
        const r = CARDS[c.id].r, reveal = () => {
            el.classList.remove("down", "waiting", "enter"); X.sfx(r >= 2 ? "reveal" : "flip");
            root.classList.remove("glow", "flash", "shake"); void root.offsetWidth;
            if (r === 2) root.classList.add("glow");
            if (r === 3 || r === 4) { root.style.setProperty("--flash", r === 4 ? "#ff3c8c" : "#d6c7ff"); root.classList.add("flash", "shake"); X.sfx("epicHit"); }
            if (r >= 5) root.classList.add("glow");
            if (c.h) X.sfx("sparkle");
            hint.textContent = CARDS[c.id].n + " · " + RARITY_NAMES[r] + (c.h ? " · HOLO" : "") + (c.isNew ? " · NEW!" : c.shards ? " · duplicate: +" + c.shards + " shards" : "") + "  (hold to inspect)";
            setTimeout(() => { busy = false; }, motionOK() ? 450 : 30);
        };
        if (r >= 5) special(r, reveal); else reveal();
    }
    function special(r, then) {
        const s = mk("div", "pk-special " + (r === 6 ? "mythic" : "legendary"));
        s.append(mk("div", "rays"), mk("small", null, r === 6 ? "THE VOID OPENS" : "A LEGEND APPEARS"), mk("b", null, r === 6 ? "MYTHIC" : "LEGENDARY"));
        root.appendChild(s); X.sfx(r === 6 ? "mythic" : "legendary");
        const ms = motionOK() ? (r === 6 ? 2000 : 1700) : 700;
        setTimeout(then, ms * .55); setTimeout(() => s.remove(), ms + 400);
    }
    // 6. summary
    function summary() {
        phase = "sum"; stage.innerHTML = ""; row.remove(); hint.textContent = "";
        const sum = mk("div", "pk-sum"); sum.appendChild(mk("h3", null, "Your pulls"));
        const grid = mk("div", "pk-grid");
        cards.slice().reverse().forEach((c, k) => {
            const cell = mk("div", "pk-cell"); cell.style.setProperty("--k", k);
            cell.appendChild(cardEl(c.id, { holo: !!c.h, size: "sm", isNew: !!c.isNew }));
            const n = mk("small", "pk-shard" + (c.isNew || c.newHolo ? " new" : ""));
            n.innerHTML = c.isNew ? "NEW" : c.newHolo ? "NEW HOLO" : '<i class="shard-ico"></i> +' + c.shards + " shards";
            cell.appendChild(n); cell.onclick = () => inspect(c.id, { holo: !!c.h, stamp: X.stamp(c.id) });
            grid.appendChild(cell);
        });
        sum.appendChild(grid);
        const tot = mk("div", "pk-tot"), nNew = cards.filter(c => c.isNew).length;
        tot.innerHTML = "<span>New cards: <b>" + nNew + "</b></span><span>Duplicates → <b>+" + res.shards + "</b> <i class=\"shard-ico\"></i> shards</span>" + (res.pity ? "<span>Pity guarantee used</span>" : "") + (res.sleeve ? "<span>Series complete! Sleeve unlocked</span>" : "");
        sum.appendChild(tot);
        if (res.shards && motionOK()) X.sfx("shard");
        const btns = mk("div", "pk-btns");
        if (onNext) { const nx = mk("button", "btn alt", onNext.label); nx.type = "button"; nx.onclick = () => { close(); onNext.fn(); }; btns.appendChild(nx); }
        const ok = mk("button", "btn", "Done"); ok.type = "button"; ok.onclick = close; btns.appendChild(ok);
        sum.appendChild(btns); stage.appendChild(sum);
        setTimeout(() => ok.focus(), 50);
    }
    skip.onclick = () => { if (phase === "sum") close(); else summary(); };
    const onKey = e => {
        if (document.querySelector(".vc-inspect")) return;
        if (e.key === "Escape") { e.preventDefault(); if (phase === "sum") close(); else summary(); }
        else if ((e.key === "Enter" || e.key === " ") && phase === "pack") { e.preventDefault(); tear(); }
        else if ((e.key === "Enter" || e.key === " ") && phase === "flip") { e.preventDefault(); onTap(); }
    };
    addEventListener("keydown", onKey);
    setTimeout(() => openBtn.focus && openBtn.focus(), 60);
    return { close };
}

/* hold (450 ms) on a card to inspect it */
export function holdToInspect(host, which) {
    let t = 0, moved = false;
    host.addEventListener("pointerdown", e => { moved = false; clearTimeout(t); t = setTimeout(() => { const c = which(e); if (c && !moved) { host.dataset.held = "1"; inspect(c.id, { holo: !!c.h, stamp: X.stamp(c.id) }); } }, 450); });
    host.addEventListener("pointermove", e => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 6) moved = true; });
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev => host.addEventListener(ev, () => clearTimeout(t)));
    host.addEventListener("click", e => { if (host.dataset.held) { e.stopImmediatePropagation(); e.preventDefault(); delete host.dataset.held; } }, true);
    host.addEventListener("contextmenu", e => e.preventDefault());
}

/* ---------- inspect: tilt with finger / mouse (device tilt on phones if allowed), tap to turn ---------- */
export function inspect(id, o = {}) {
    if (document.querySelector(".vc-inspect")) document.querySelector(".vc-inspect").remove();
    const c = CARDS[id]; if (!c) return;
    const root = mk("div", "vc-inspect"); root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "Inspect " + c.n);
    const el = cardEl(id, Object.assign({ size: "lg", sleeve: X.sleeve() }, o)); el.classList.add("tilting");
    const tip = mk("p", "vc-ins-tip", motionOK() ? "Drag to tilt the card · tap to turn it over" : "Tap to turn the card over");
    const bar = mk("div", "vc-ins-bar"), turn = mk("button", "btn ghost sm", "Turn over"), shut = mk("button", "btn sm", "Close");
    turn.type = shut.type = "button";
    bar.append(turn);
    const hasDO = typeof DeviceOrientationEvent !== "undefined" && matchMedia("(hover: none)").matches && motionOK();
    let motionOn = false;
    if (hasDO) { const m = mk("button", "btn ghost sm", "Tilt with my phone"); m.type = "button"; m.onclick = async () => { try { if (DeviceOrientationEvent.requestPermission) { const p = await DeviceOrientationEvent.requestPermission(); if (p !== "granted") { m.textContent = "Motion not allowed: drag instead"; return; } } addEventListener("deviceorientation", onDO); motionOn = true; m.remove(); } catch (e) { m.textContent = "Drag to tilt"; } }; bar.appendChild(m); }
    bar.append(shut);
    root.append(el, tip, bar);
    document.body.appendChild(root);
    X.sfx("open");
    const set = (x, y) => { el.style.setProperty("--ry", (x * 34).toFixed(1) + "deg"); el.style.setProperty("--rx", (-y * 30).toFixed(1) + "deg"); el.style.setProperty("--mx", ((x + .5) * 100).toFixed(1) + "%"); el.style.setProperty("--my", ((y + .5) * 100).toFixed(1) + "%"); };
    let down = null, dragged = false;
    el.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY }; dragged = false; el.setPointerCapture && el.setPointerCapture(e.pointerId); });
    el.addEventListener("pointermove", e => {
        if (!motionOK()) return;
        const r = el.getBoundingClientRect();
        if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) dragged = true;
        if (down || matchMedia("(hover: hover)").matches) set(Math.max(-.5, Math.min(.5, (e.clientX - r.left) / r.width - .5)), Math.max(-.5, Math.min(.5, (e.clientY - r.top) / r.height - .5)));
    });
    el.addEventListener("pointerup", () => { if (!dragged) doTurn(); down = null; });
    el.addEventListener("pointerleave", () => { if (!down) set(0, 0); });
    function onDO(e) { if (e.gamma == null) return; set(Math.max(-.5, Math.min(.5, e.gamma / 60)), Math.max(-.5, Math.min(.5, ((e.beta || 45) - 45) / 60))); }
    function doTurn() { el.classList.add("flipping"); el.classList.toggle("turned"); X.sfx("flip"); setTimeout(() => el.classList.remove("flipping"), 600); }
    turn.onclick = doTurn;
    const close = () => { removeEventListener("deviceorientation", onDO); removeEventListener("keydown", onKey, true); root.remove(); X.sfx("close"); };
    shut.onclick = close;
    root.addEventListener("click", e => { if (e.target === root) close(); });
    const onKey = e => { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(); } };
    addEventListener("keydown", onKey, true);
    setTimeout(() => shut.focus(), 30);
    return { close };
}
