/* =====================================================================
   PACK OPENING + CARD INSPECT (DOM; styles in css/packs.css and css/cards.css)
   The pack was rolled and saved BEFORE this starts (packs.js rollPack: the cards are already in the collection and
   the pack waits in "Unopened" until the animation is finished). This only reveals it, so closing the page or
   reconnecting mid-opening never loses or duplicates a pull: the pack can be opened (watched) again.
   1. the pack hovers centre-screen; the pointer (or the phone's tilt) moves its shine
   2. drag across the top crimp: a tear line follows the finger, the foil crinkles, the phone buzzes softly
   3. the strip peels off and falls, the mouth opens, light and foil flakes burst out, the cards slide up
   4. a face-down stack with thickness; tap or swipe to flip one card at a time (a real 3D turn + a shine pass);
      a Rare or better on top makes the stack's edge glow first
   5. the reaction scales with rarity: Common plain, Uncommon a shine, Rare a glow, Ultra Rare a flash and a short
      shake, Epic an energy burst, Legendary / Mythic a full-screen cinematic (canvas) with their own sound
   6. hold a card to inspect it (tilt / drag in 3D, dynamic light, holo parallax, card thickness)
   7. summary: every card, NEW tags, duplicates turning into shards, the pity counter
   Reduced effects: static foil, no float, no shake, a few flakes, a simple flip, no canvas.
   ===================================================================== */
import { cardEl, packEl, theme, seriesVars, packClip, thicken } from "./cardui.js?v=19";
import { CARDS, RARITY_NAMES } from "./carddb.js?v=6";
import { PACKS, OPENING as O } from "./config.js?v=20";
import { motionOK } from "../fx.js";

const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
let X = { sfx: () => {}, stamp: () => null, sleeve: () => "", crinkle: () => {} };
export function initOpening(ctx) { X = Object.assign(X, ctx); }
const vib = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
const R = Math.random;
const RNAME = ["common", "uncommon", "rare", "ultra", "epic", "legendary", "mythic"];
/* the tear line: a jagged path across the top crimp, x 0..100 (%), y 0..10 inside a band 7.5-12.5% of the pack height */
const jag = () => { const p = []; for (let x = 0; x <= 100; x += 4) p.push([x, 3 + R() * 4]); return p; };
const tearY = y => (7.5 + y * .5).toFixed(2);

/* ---------- Legendary / Mythic cinematic: the only canvas ---------- */
function cinematic(host, r, ms) {
    const box = mk("div", "pk-special " + (r === 6 ? "mythic" : "legendary"));
    box.append(mk("small", null, r === 6 ? "THE VOID OPENS" : "A LEGEND APPEARS"), mk("b", null, r === 6 ? "MYTHIC" : "LEGENDARY"));
    host.appendChild(box);
    if (!motionOK()) { setTimeout(() => box.remove(), ms); return; }
    const cv = mk("canvas"); box.prepend(cv);
    const dpr = Math.min(1.5, devicePixelRatio || 1), W = host.clientWidth, H = host.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext("2d"), cx = W / 2, cy = H * .45, ps = [];
    for (let i = 0; i < 170; i++) {
        const a = R() * Math.PI * 2, d = r === 6 ? Math.max(W, H) * (.5 + R() * .4) : 0, sp = 1.5 + R() * 6;
        ps.push({ a, d, sp, s: 1 + R() * 3, life: .5 + R() * .5, spin: (R() - .5) * .05, c: r === 6 ? ["#b06bff", "#2bf5ff", "#ff2bd6", "#ffffff"][i % 4] : ["#fff3b0", "#ffd76a", "#ffb627", "#ffffff"][i % 4] });
    }
    const t0 = performance.now();
    const fr = now => {
        const t = (now - t0) / ms; if (t >= 1 || !cv.isConnected) { box.remove(); return; }
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); g.globalCompositeOperation = "lighter";
        ps.forEach(p => {
            if (r === 6) { p.d = Math.max(0, p.d - p.sp * 3.2); p.a += p.spin * 3; } else { p.d += p.sp * 2.2; p.a += p.spin; }
            const x = cx + Math.cos(p.a) * p.d, y = cy + Math.sin(p.a) * p.d * .8, al = Math.max(0, 1 - t / p.life) * (r === 6 ? Math.min(1, p.d / 60) : 1);
            g.globalAlpha = al; g.fillStyle = p.c;
            if (r === 6) { g.save(); g.translate(x, y); g.rotate(p.a); g.fillRect(-p.s * 2, -p.s / 2, p.s * 4, p.s); g.restore(); }
            else { g.beginPath(); g.arc(x, y, p.s, 0, 7); g.fill(); }
        });
        requestAnimationFrame(fr);
    };
    requestAnimationFrame(fr);
}

/* ---------- the opening ---------- */
export function openPack(res, { onDone, onNext } = {}) {
    const T = theme(res.series), root = mk("div", "pk-open"); seriesVars(root, res.series);
    root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "Opening a " + T.label + " pack");
    const head = mk("header", "pk-head"), stage = mk("div", "pk-stage"), row = mk("div", "pk-row"), hint = mk("p", "pk-hint");
    hint.setAttribute("aria-live", "polite");
    const skip = mk("button", "btn ghost sm", "Skip ›"); skip.type = "button";
    head.append(mk("b", null, T.label + " · " + (res.kind === "premium" ? "Premium" : "Normal") + " pack"), skip);
    root.append(head, stage, row, hint);
    document.body.appendChild(root);
    const fx = motionOK();
    let done = false, phase = "pack", idx = 0, busy = false;
    const close = () => { if (done) return; done = true; X.crinkle(0); removeEventListener("keydown", onKey); removeEventListener("deviceorientation", onDO); root.remove(); onDone && onDone(); };

    // the scene: rays, the floating + tilting pack with the cards hidden inside, the strip, the tear line, the grab zone
    const scene = mk("div", "pk-scene"), float = mk("div", "pk-float"), tilt = mk("div", "pk-tilt");
    const pack = packEl(res.series, res.kind, { cards: res.cards.length }), deck = mk("div", "pk-deck"), mouth = mk("i", "pk-mouth");
    const strip = mk("div", "pk-strip"), stripPack = packEl(res.series, res.kind, { cards: res.cards.length }); strip.appendChild(stripPack); strip.setAttribute("aria-hidden", "true");
    const svgNS = "http://www.w3.org/2000/svg", tearSvg = document.createElementNS(svgNS, "svg"), poly = document.createElementNS(svgNS, "polyline");
    tearSvg.setAttribute("class", "pk-tear"); tearSvg.setAttribute("viewBox", "0 0 100 10"); tearSvg.setAttribute("preserveAspectRatio", "none"); tearSvg.appendChild(poly);
    const grab = mk("div", "pk-grab"); grab.setAttribute("aria-hidden", "true");
    tilt.append(deck, pack, mouth, strip, tearSvg, grab); float.appendChild(tilt);
    scene.append(mk("i", "pk-rays"), float, mk("i", "pk-burst")); stage.appendChild(scene);
    const openBtn = mk("button", "btn alt", "Tear it open"); openBtn.type = "button";
    const btnRow = mk("div", "pk-btns"); btnRow.style.cssText = "position:absolute;bottom:3%"; btnRow.appendChild(openBtn); stage.appendChild(btnRow);
    hint.textContent = "Drag across the top of the pack to tear it open.";

    // the cards, face down inside the pack (lowest rarity on top, the best last)
    const cards = res.cards.map(c => Object.assign({}, c)), els = [];
    cards.forEach((c, k) => {
        const el = thicken(cardEl(c.id, { holo: !!c.h, size: "lg", isNew: !!c.isNew, sleeve: X.sleeve() })); el.classList.add("down");
        el.style.setProperty("--k", cards.length - 1 - k); el.style.zIndex = String(100 - k); el.setAttribute("tabindex", "-1");
        deck.appendChild(el); els.push(el);
    });
    deck.style.setProperty("--n", cards.length);

    // 1. light + tilt follow the pointer (and the phone's tilt where no permission is needed), in animation frames
    let want = null, rafT = 0;
    const applyLight = () => { rafT = 0; if (!want || phase !== "pack") return; const { x, y } = want; [pack, stripPack].forEach(p => { p.style.setProperty("--mx", (x * 100).toFixed(1) + "%"); p.style.setProperty("--my", (y * 100).toFixed(1) + "%"); }); if (fx) { tilt.style.setProperty("--ry", ((x - .5) * 22).toFixed(1) + "deg"); tilt.style.setProperty("--rx", ((.5 - y) * 16).toFixed(1) + "deg"); } };
    const light = (x, y) => { want = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) }; if (!rafT) rafT = requestAnimationFrame(applyLight); };
    stage.addEventListener("pointermove", e => { if (phase !== "pack") return; const r = pack.getBoundingClientRect(); light((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); });
    function onDO(e) { if (e.gamma == null || phase !== "pack") return; light(.5 + e.gamma / 70, .5 + ((e.beta || 45) - 45) / 70); }
    if (typeof DeviceOrientationEvent !== "undefined" && !DeviceOrientationEvent.requestPermission && matchMedia("(hover: none)").matches) addEventListener("deviceorientation", onDO);

    // 2. tear: the line follows the finger across the top crimp
    const J = jag();
    let sx = null, minX = 101, maxX = -1, lastX = 0, lastT = 0, dir = 1, buzz = 0;
    const drawTear = () => { poly.setAttribute("points", J.filter(([x]) => x >= minX - 4 && x <= maxX + 4).map(([x, y]) => Math.max(minX, Math.min(maxX, x)) + "," + y.toFixed(1)).join(" ")); };
    grab.addEventListener("pointerdown", e => {
        if (phase !== "pack") return; e.preventDefault();
        const r = pack.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 100;
        sx = e.clientX; minX = maxX = Math.max(0, Math.min(100, x)); lastX = e.clientX; lastT = performance.now();
        grab.setPointerCapture && grab.setPointerCapture(e.pointerId); scene.classList.add("dragging"); X.crinkle(.35); vib(5);
    });
    grab.addEventListener("pointermove", e => {
        if (sx == null || phase !== "pack") return;
        const r = pack.getBoundingClientRect(), x = Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)), now = performance.now();
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); dir = e.clientX >= sx ? 1 : -1;
        const speed = Math.abs(e.clientX - lastX) / Math.max(1, now - lastT); lastX = e.clientX; lastT = now;
        X.crinkle(Math.min(1, .25 + speed * .9));
        drawTear();
        const prog = (maxX - minX) / 100;
        if (Math.floor(prog * 8) > buzz) { buzz = Math.floor(prog * 8); vib(6); }
        if (prog > O.tearAt) { sx = null; tear(); }
    });
    const endDrag = () => { if (sx == null) return; sx = null; X.crinkle(0); scene.classList.remove("dragging"); if (phase === "pack") { minX = 101; maxX = -1; poly.setAttribute("points", ""); buzz = 0; } };
    grab.addEventListener("pointerup", endDrag); grab.addEventListener("pointercancel", endDrag);
    openBtn.onclick = () => tear();

    // 3. torn: peel, mouth, burst, flakes, the cards slide up and the pack drops away
    function tear() {
        if (phase !== "pack") return; phase = "tearing";
        X.crinkle(0); btnRow.remove(); grab.remove(); scene.classList.remove("dragging");
        const edge = J.map(([x, y]) => x + "% " + tearY(y) + "%");
        pack.style.clipPath = "polygon(" + edge.join(", ") + ", 100% 100%, 0% 100%)";
        strip.style.clipPath = "polygon(0% 0%, 100% 0%, " + edge.slice().reverse().join(", ") + ")";
        strip.style.setProperty("--peel-dir", dir); strip.style.setProperty("--peel-x", dir > 0 ? "0%" : "100%");
        minX = 0; maxX = 100; drawTear(); setTimeout(() => tearSvg.remove(), 260);
        tilt.style.setProperty("--rx", "0deg"); tilt.style.setProperty("--ry", "0deg");
        scene.classList.add("torn"); X.sfx("rip"); vib([18, 30, 40]);
        const n = fx ? (res.kind === "premium" ? O.flakes.premium : O.flakes.normal) : O.flakes.reduced, pw = scene.clientWidth, cols = [T.c1, T.c2, T.c3, "#ffffff", res.kind === "premium" ? "#ffd76a" : "#d9dde3"];
        for (let i = 0; i < n; i++) {
            const f = mk("i", "pk-flake"), a = -Math.PI / 2 + (R() - .5) * 2.4, d = pw * (.5 + R() * 1.1);
            f.style.cssText = "--dx:" + (Math.cos(a) * d).toFixed(0) + "px;--dy:" + (Math.sin(a) * d * .9 + pw * (.2 + R() * .5)).toFixed(0) + "px;--rot:" + ((R() - .5) * 900).toFixed(0) + "deg;--t:" + (.9 + R() * .8).toFixed(2) + "s;--d:" + (R() * .15).toFixed(2) + "s;--fc:" + cols[i % cols.length];
            scene.appendChild(f); setTimeout(() => f.remove(), 2000);
        }
        hint.textContent = "";
        setTimeout(() => { scene.classList.add("emerge"); X.sfx("whoosh"); }, fx ? O.emergeMs : O.emergeMsLite);
        setTimeout(() => { scene.classList.add("free"); }, fx ? O.freeMs : O.freeMsLite);
        setTimeout(startFlips, fx ? O.flipsMs : O.flipsMsLite);
    }

    // 4. the stack: tap or swipe
    function startFlips() {
        phase = "flip"; X.sfx("draw");
        hint.textContent = "Tap or swipe the stack to flip a card · " + cards.length + " cards";
        let px = 0, py = 0, down = false;
        deck.addEventListener("pointerdown", e => { down = true; px = e.clientX; py = e.clientY; });
        deck.addEventListener("pointerup", e => { if (!down) return; down = false; if (deck.dataset.held) return; const dx = e.clientX - px; act(Math.abs(dx) > 40 ? Math.sign(dx) : -1); });
        holdToInspect(deck, () => { const el = els[idx]; return el && !el.classList.contains("down") ? cards[idx] : null; });
        // look around the revealed card: the whole card tilts as one rigid object, the foil light follows
        let tq = null, tr = 0;
        const tiltTo = () => { tr = 0; const el = els[idx]; if (!el || el.classList.contains("down") || !tq) return; const [x, y] = tq;
            el.style.setProperty("--ry", (x * 22).toFixed(1) + "deg"); el.style.setProperty("--rx", (-y * 18).toFixed(1) + "deg");
            el.style.setProperty("--mx", ((x + .5) * 100).toFixed(1) + "%"); el.style.setProperty("--my", ((y + .5) * 100).toFixed(1) + "%"); el.style.setProperty("--px", x.toFixed(3)); el.style.setProperty("--py", y.toFixed(3)); };
        stage.addEventListener("pointermove", e => {
            if (phase !== "flip" || !fx) return; const el = els[idx]; if (!el || el.classList.contains("down")) return;
            const r = el.getBoundingClientRect(); tq = [Math.max(-.5, Math.min(.5, (e.clientX - r.left) / r.width - .5)), Math.max(-.5, Math.min(.5, (e.clientY - r.top) / r.height - .5))];
            el.classList.add("live"); if (!tr) tr = requestAnimationFrame(tiltTo);
        });
        stage.addEventListener("pointerleave", () => { const el = els[idx]; if (!el) return; ["--rx", "--ry", "--mx", "--my", "--px", "--py"].forEach(k => el.style.removeProperty(k)); });
        setHint();
    }
    function setHint() {
        els.forEach(e => e.classList.remove("hint", "h2", "h3", "h4", "h5", "h6", "top"));
        const el = els[idx]; if (!el) return; el.classList.add("top");
        const r = CARDS[cards[idx].id].r; if (el.classList.contains("down") && r >= 2) el.classList.add("hint", "h" + r);
    }
    function act(d) {
        if (busy || phase !== "flip") return;
        const el = els[idx]; if (!el) return;
        if (el.classList.contains("down")) { flip(el, cards[idx]); return; }
        el.style.setProperty("--throw", d || -1); el.classList.remove("live"); ["--rx", "--ry"].forEach(k => el.style.removeProperty(k)); el.classList.add("gone"); X.sfx("card");
        const mini = cardEl(cards[idx].id, { holo: !!cards[idx].h, size: "xs" }); row.appendChild(mini);
        idx++;
        if (idx >= els.length) setTimeout(summary, fx ? 380 : 10);
        else { hint.textContent = "Tap or swipe to flip · " + (els.length - idx) + " left"; setHint(); }
    }
    // 5. the flip and the reaction
    function flip(el, c) {
        busy = true; el.classList.remove("hint", "h2", "h3", "h4", "h5", "h6");
        const r = CARDS[c.id].r;
        const turn = () => {
            el.classList.add("flipping"); if (r >= 1 && fx) el.classList.add("shinepass");
            el.classList.remove("down"); X.sfx("tick"); setTimeout(() => X.sfx("flip"), 60);
            setTimeout(() => react(r, c), fx ? 330 : 30);
            setTimeout(() => { el.classList.remove("flipping"); busy = false; }, fx ? O.flipMs : 60);
        };
        if (r >= 5) { cinematic(root, r, fx ? (r === 6 ? O.cinematicMs.mythic : O.cinematicMs.legendary) : O.cinematicMs.reduced); X.sfx(r === 6 ? "mythic" : "legendary"); vib(r === 6 ? [30, 60, 30, 60, 90] : [40, 60, 80]); setTimeout(turn, fx ? 1250 : 300); }
        else turn();
    }
    function react(r, c) {
        root.classList.remove("glow", "flash", "shake"); void root.offsetWidth;
        if (r === 1) X.sfx("stUncommon");
        if (r === 2) { root.style.setProperty("--gc", "rgba(90,180,255,.6)"); root.classList.add("glow"); X.sfx("stRare"); }
        if (r === 3) { root.style.setProperty("--flash", "#e6dcff"); root.classList.add("flash", "shake"); X.sfx("stUltra"); vib(25); }
        if (r === 4) {
            root.style.setProperty("--flash", "#ff3c8c"); root.classList.add("flash", "shake"); X.sfx("stEpic"); vib([20, 40, 30]);
            if (fx) [0, .12, .24].forEach(dl => { const g = mk("i", "pk-ring"); g.style.setProperty("--d", dl + "s"); g.style.setProperty("--rc", dl ? "#ffd1e8" : "#ff4fa0"); scene.appendChild(g); setTimeout(() => g.remove(), 1300); });
        }
        if (r >= 5) { root.style.setProperty("--gc", r === 6 ? "rgba(176,107,255,.7)" : "rgba(255,215,106,.75)"); root.classList.add("glow"); }
        if (c.h) X.sfx("cardShine");
        hint.textContent = CARDS[c.id].n + " · " + RARITY_NAMES[r] + (c.h ? " · HOLO" : "") + (c.isNew ? " · NEW!" : c.shards ? " · duplicate: +" + c.shards + " shards" : "") + "  (hold to inspect)";
    }
    // 7. summary
    function summary() {
        phase = "sum"; X.crinkle(0); stage.innerHTML = ""; row.remove(); hint.textContent = "";
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
        tot.innerHTML = "<span>New cards: <b>" + nNew + "</b></span><span>Duplicates → <b class=\"pk-sh\">+0</b> <i class=\"shard-ico\"></i> shards</span>" + (res.pity ? "<span>Pity guarantee used</span>" : "") + (res.sleeve ? "<span>Series complete! Sleeve unlocked</span>" : "");
        sum.appendChild(tot);
        const P = PACKS[res.kind];
        if (P && P.pity && res.pityLeft != null) {
            const left = Math.max(0, Number(res.pityLeft)), pit = mk("div", "pk-pity"), bar = mk("i");
            bar.style.setProperty("--p", ((P.pity.after - left) / P.pity.after * 100).toFixed(0) + "%");
            pit.append(mk("span", null, "Pity counter: " + RARITY_NAMES[["common", "uncommon", "rare", "ultra", "epic", "legendary", "mythic"].indexOf(P.pity.atLeast)] + " or better guaranteed within " + left + " more " + (res.kind === "premium" ? "Premium" : "Normal") + " pack" + (left === 1 ? "" : "s")), bar);
            sum.appendChild(pit);
        }
        const sh = tot.querySelector(".pk-sh"), total = Number(res.shards) || 0;
        if (total && fx) { const t0 = performance.now(); X.sfx("shard"); const step = now => { const k = Math.min(1, (now - t0) / 900); sh.textContent = "+" + Math.round(total * k); if (k < 1 && sh.isConnected) requestAnimationFrame(step); }; requestAnimationFrame(step); } else sh.textContent = "+" + total;
        const btns = mk("div", "pk-btns");
        if (onNext) { const nx = mk("button", "btn alt"); nx.type = "button"; nx.append(document.createTextNode(onNext.label + (onNext.price ? " " : ""))); if (onNext.price) nx.appendChild(Object.assign(mk("span", "vt-price"), { innerHTML: '<i class="coin-ico"></i>' + onNext.price })); nx.onclick = () => { close(); onNext.fn(); }; btns.appendChild(nx); }
        const ok = mk("button", "btn", "Done"); ok.type = "button"; ok.onclick = close; btns.appendChild(ok);
        sum.appendChild(btns); stage.appendChild(sum);
        setTimeout(() => ok.focus(), 50);
    }
    skip.onclick = () => { if (phase === "sum") close(); else summary(); };
    const onKey = e => {
        if (document.querySelector(".vc-inspect")) return;
        if (e.key === "Escape") { e.preventDefault(); if (phase === "sum") close(); else summary(); }
        else if ((e.key === "Enter" || e.key === " ") && phase === "pack") { e.preventDefault(); tear(); }
        else if ((e.key === "Enter" || e.key === " " || e.key === "ArrowRight" || e.key === "ArrowLeft") && phase === "flip") { e.preventDefault(); act(e.key === "ArrowRight" ? 1 : -1); }
    };
    addEventListener("keydown", onKey);
    setTimeout(() => openBtn.focus && openBtn.focus(), 60);
    return { close, tear: () => tear(), act: d => act(d), get phase() { return phase; } };
}

/* hold (450 ms) on a card to inspect it */
export function holdToInspect(host, which) {
    let t = 0, moved = false;
    host.addEventListener("pointerdown", e => { moved = false; clearTimeout(t); delete host.dataset.held; t = setTimeout(() => { const c = which(e); if (c && !moved) { host.dataset.held = "1"; inspect(c.id, { holo: !!c.h, stamp: X.stamp(c.id) }); } }, O.holdMs); });
    host.addEventListener("pointermove", e => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 6) moved = true; });
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev => host.addEventListener(ev, () => { clearTimeout(t); setTimeout(() => { delete host.dataset.held; }, 0); }));
    host.addEventListener("click", e => { if (host.dataset.held) { e.stopImmediatePropagation(); e.preventDefault(); delete host.dataset.held; } }, true);
    host.addEventListener("contextmenu", e => e.preventDefault());
}

/* ---------- inspect: the card follows the pointer / the phone's tilt in 3D as one rigid card (thickness, light, the holo foil moves with the angle); tap to turn ---------- */
export function inspect(id, o = {}) {
    if (document.querySelector(".vc-inspect")) document.querySelector(".vc-inspect").remove();
    const c = CARDS[id]; if (!c) return;
    const root = mk("div", "vc-inspect"); root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "Inspect " + c.n);
    const el = cardEl(id, Object.assign({ size: "lg", sleeve: X.sleeve() }, o)); el.classList.add("tilting");
    thicken(el);      // the card's edge, seen when it's tilted: it turns as one solid card
    const tip = mk("p", "vc-ins-tip", motionOK() ? "Drag to tilt the card · tap to turn it over" : "Tap to turn the card over");
    const bar = mk("div", "vc-ins-bar"), turn = mk("button", "btn ghost sm", "Turn over"), shut = mk("button", "btn sm", "Close");
    turn.type = shut.type = "button";
    bar.append(turn);
    const hasDO = typeof DeviceOrientationEvent !== "undefined" && matchMedia("(hover: none)").matches && motionOK();
    if (hasDO) { const m = mk("button", "btn ghost sm", "Tilt with my phone"); m.type = "button"; m.onclick = async () => { try { if (DeviceOrientationEvent.requestPermission) { const p = await DeviceOrientationEvent.requestPermission(); if (p !== "granted") { m.textContent = "Motion not allowed: drag instead"; return; } } addEventListener("deviceorientation", onDO); m.remove(); } catch (e) { m.textContent = "Drag to tilt"; } }; bar.appendChild(m); }
    bar.append(shut);
    if (o.panel) { const main = mk("div", "vc-ins-main"); main.append(el, tip, bar); root.classList.add("wide"); root.append(main, o.panel); }      // a side panel (Collection, Decks, the Duel); a bottom drawer on phones
    else root.append(el, tip, bar);
    document.body.appendChild(root);
    X.sfx("open");
    let want = null, rafT = 0;
    const apply = () => { rafT = 0; if (!want) return; const [x, y] = want; el.style.setProperty("--ry", (x * 34).toFixed(1) + "deg"); el.style.setProperty("--rx", (-y * 30).toFixed(1) + "deg"); el.style.setProperty("--mx", ((x + .5) * 100).toFixed(1) + "%"); el.style.setProperty("--my", ((y + .5) * 100).toFixed(1) + "%"); el.style.setProperty("--px", x.toFixed(3)); el.style.setProperty("--py", y.toFixed(3)); };
    const set = (x, y) => { want = [x, y]; if (!rafT) rafT = requestAnimationFrame(apply); };
    let down = null, dragged = false;
    el.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY }; dragged = false; el.setPointerCapture && el.setPointerCapture(e.pointerId); });
    el.addEventListener("pointermove", e => {
        if (!motionOK()) return;
        const r = el.getBoundingClientRect();
        if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) dragged = true;
        if (down || matchMedia("(hover: hover)").matches) set(Math.max(-.5, Math.min(.5, (e.clientX - r.left) / r.width - .5)), Math.max(-.5, Math.min(.5, (e.clientY - r.top) / r.height - .5)));
    });
    el.addEventListener("pointerup", () => { if (down && !dragged) doTurn(); down = null; });      // (the release of the hold that opened inspect is not a tap)
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
