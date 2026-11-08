/* =====================================================================
   THE CARD READER under the Arcade Pass (main menu). It replaces the "Edit player card" button.
   - Double-click / double-tap the pass (or press and hold it on touch) to pick it up: it lifts, tilts with the
     movement and follows the pointer. Drop it on the reader's slot (green guide = snap zone) to insert it;
     drop it anywhere else, or press Esc, and it glides back.
   - Click / tap the reader, or Enter / Space on it: the same insert, no dragging (the keyboard path).
   - The card slides into the slot, the lights turn green, a beep-click plays, then the Wardrobe opens.
     When the Wardrobe closes (Save or Cancel) the card is ejected and slides back onto the menu.
   - Reduced effects: no carry, tilt or slide: a quick fade, the beep, and the Wardrobe opens at once.
   The card on the move is a clone ("ghost") laid over the page; the real pass stays in the layout (hidden), so
   nothing else on the menu moves. Timings + the hint count: CARD_SLOT in js/vault/config.js.
   ===================================================================== */
import { CARD_SLOT as C } from "./vault/config.js?v=15";

const $ = id => document.getElementById(id);
const USES = "aap_slot_uses";
let X = { sfx: () => {}, open: () => {} };
let st = "idle";          // idle | held | inserting | inslot | ejecting | returning
let box, reader, slit, ghost = null, rest = null;   // rest = the pass's rect on the page (document coordinates)
let press = null, holdT = 0, lastTap = null;       // pickup gesture tracking
let carry = null;          // { id, type, active, moved, sx, sy, ox, oy, tx, ty, cx, cy, vx, vy, rz, raf }
let swallowUntil = 0, anim = null, timers = [];

const lite = () => document.body.classList.contains("fx-lite");
const sx = () => window.scrollX || 0, sy = () => window.scrollY || 0;
const T = (dx, dy, r, s) => `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(4)})`;
const NOCLIP = "inset(-120px -120px -120px -120px)";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const later = (ms, f) => timers.push(setTimeout(f, ms));
const uses = () => { try { return Number(localStorage.getItem(USES)) || 0; } catch (e) { return 0; } };
const shown = el => !!el && el.getClientRects().length > 0;
const noWheel = e => { if (st === "held") e.preventDefault(); };     // the page doesn't scroll under the card in the hand

export function initCardSlot(x) {
    Object.assign(X, x || {});
    box = $("pcPass"); reader = $("cardReader"); if (!box || !reader) return;
    slit = reader.querySelector(".cr-slit");
    const touchy = matchMedia("(hover: none)").matches;
    const hint = reader.querySelector(".cr-hint");
    if (hint) hint.textContent = (touchy ? "Double-tap the card" : "Double-click the card") + ", or tap here";
    box.title = touchy ? "" : "Double-click to pick up your Arcade Pass";
    syncHint();
    reader.addEventListener("click", () => { if (Date.now() < swallowUntil || st !== "idle") return; insert("auto"); });
    box.addEventListener("pointerdown", onBoxDown);
    box.addEventListener("dragstart", e => e.preventDefault());
    box.addEventListener("contextmenu", e => { if (press || st !== "idle") e.preventDefault(); });
    // a touch that started on the pass: once the card is picked up, that finger moves the card, not the page
    box.addEventListener("touchmove", e => { if (st === "held" && e.cancelable) e.preventDefault(); }, { passive: false });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", e => { cancelPress(e); if (st === "held") goHome(); }, true);
    window.addEventListener("pointerdown", onAnyDown, true);
    // no stray clicks on the menu while the card is in the hand (or from the release that dropped it)
    document.addEventListener("click", e => { if (st === "held" || Date.now() < swallowUntil) { e.preventDefault(); e.stopPropagation(); } }, true);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("blur", () => { cancelPress(); if (st === "held") goHome(); });
    document.addEventListener("visibilitychange", () => { if (document.hidden) { cancelPress(); if (st === "held") goHome(true); } });
    const reflow = () => { cancelPress(); if (st === "held") goHome(true); else if (st === "inslot") placeInSlot(); };
    window.addEventListener("resize", reflow); window.addEventListener("orientationchange", reflow);
    // the Wardrobe closed (Save, Cancel, X, Esc, or anything that closes every overlay): eject the card
    const ov = $("profile");
    if (ov) new MutationObserver(() => {
        if (!ov.classList.contains("hidden")) { if (st === "held") goHome(true); return; }
        // (only touch the class when it's there: a no-op classList.remove still writes the attribute and would re-fire this observer)
        if (ov.classList.contains("ov-reader")) ov.classList.remove("ov-reader");
        if (st === "inslot" || st === "inserting") requestAnimationFrame(eject);
    }).observe(ov, { attributes: true, attributeFilter: ["class"] });
}

function syncHint() { reader.classList.toggle("no-hint", uses() >= (Number(C.hintFadeAfter) || 3)); }
function countUse() { try { localStorage.setItem(USES, String(uses() + 1)); } catch (e) {} setTimeout(syncHint, 1200); }

/* ---------- picking the card up: double-click / double-tap, or press and hold (touch, pen) ---------- */
function onBoxDown(e) {
    if (st !== "idle" || e.button > 0 || !e.isPrimary || !$("home") || $("home").classList.contains("hidden")) return;
    if (document.querySelector(".overlay:not(.hidden)")) return;
    const now = performance.now();
    if (lastTap && now - lastTap.t < C.doubleTapMs && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40 && lastTap.type === e.pointerType) {
        lastTap = null; e.preventDefault(); cancelPress(); pickUp(e); return;
    }
    cancelPress();
    press = { id: e.pointerId, type: e.pointerType, x: e.clientX, y: e.clientY, t: now };
    if (e.pointerType !== "mouse") holdT = setTimeout(() => { const p = press; if (p && st === "idle") { press = null; pickUp({ pointerId: p.id, pointerType: p.type, clientX: p.lx || p.x, clientY: p.ly || p.y }); } }, C.holdMs);
}
function cancelPress(e) { if (e && press && e.pointerId !== press.id) return; clearTimeout(holdT); holdT = 0; press = null; }

function pickUp(e) {
    if (lite()) { insert("lite"); return; }
    const pass = box.querySelector(".pass"); if (!pass) return;
    // the pass and the slot both on screen (nothing scrolls while the card is held)
    const r0 = pass.getBoundingClientRect(), ox = r0.left + r0.width / 2 - e.clientX, oy = r0.top + r0.height / 2 - e.clientY;
    fitOnScreen();
    makeGhost();
    const touch = e.pointerType !== "mouse";
    const H = rest.h * C.liftScale;
    carry = { id: e.pointerId, type: e.pointerType, active: true, moved: false, sx: e.clientX, sy: e.clientY,
        // a finger holds the card by its lower edge so the card stays visible above it; a mouse keeps its grip
        ox: touch ? 0 : ox * C.liftScale, oy: touch ? -H * .36 : oy * C.liftScale,
        tx: e.clientX, ty: e.clientY, cx: rest.x + rest.w / 2 - sx(), cy: rest.y + rest.h / 2 - sy(), vx: 0, vy: 0, rz: 0, s: 1, raf: 0 };
    st = "held";
    document.body.classList.add("cs-carry"); reader.classList.add("ready");
    window.addEventListener("wheel", noWheel, { passive: false });
    ghost.classList.add("held");
    X.sfx("card");
    carry.raf = requestAnimationFrame(frame);
}
function fitOnScreen() {
    const a = box.getBoundingClientRect(), b = reader.getBoundingClientRect();
    const top = Math.min(a.top, b.top), bot = Math.max(a.bottom, b.bottom), vh = window.innerHeight, pad = 10;
    if (bot - top > vh - pad * 2) return;
    if (top < pad) window.scrollBy({ top: top - pad, behavior: "instant" });
    else if (bot > vh - pad) window.scrollBy({ top: bot - vh + pad, behavior: "instant" });
}
function makeGhost() {
    killGhost();
    const pass = box.querySelector(".pass"), r = pass.getBoundingClientRect();
    rest = { x: r.left + sx(), y: r.top + sy(), w: r.width, h: r.height };
    ghost = document.createElement("div"); ghost.className = "cs-ghost"; ghost.setAttribute("aria-hidden", "true");
    Object.assign(ghost.style, { left: rest.x + "px", top: rest.y + "px", width: rest.w + "px", height: rest.h + "px", transform: T(0, 0, 0, 1), clipPath: NOCLIP });
    ghost.appendChild(clonePass(pass));
    document.body.appendChild(ghost);
    box.classList.add("cs-away");
}
function clonePass(pass) {
    const c = pass.cloneNode(true);
    c.removeAttribute("data-tilt"); c.classList.remove("fx-off"); c.removeAttribute("role"); c.removeAttribute("aria-label");
    c.querySelectorAll("[id]").forEach(n => n.removeAttribute("id"));
    c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg");
    return c;
}
function killGhost() { if (anim) { try { anim.cancel(); } catch (e) {} anim = null; } if (ghost) ghost.remove(); ghost = null; }

/* ---------- carrying ---------- */
function onAnyDown(e) {
    if (st !== "held" || !carry) return;
    // a later press (a tap after a double-tap that didn't move, or a click): the card follows it and drops on release
    e.preventDefault();
    carry.id = e.pointerId; carry.type = e.pointerType; carry.active = true; carry.moved = true; carry.tx = e.clientX; carry.ty = e.clientY;
}
function onMove(e) {
    if (press && e.pointerId === press.id) { press.lx = e.clientX; press.ly = e.clientY; if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) cancelPress(); }
    if (st !== "held" || !carry) return;
    if (e.pointerType !== carry.type) return;
    if (carry.type !== "mouse" && !carry.active) return;          // a lifted finger leaves the card where it is
    carry.tx = e.clientX; carry.ty = e.clientY;
    if (carry.active && Math.hypot(e.clientX - carry.sx, e.clientY - carry.sy) > 12) carry.moved = true;
}
function onUp(e) {
    if (press && e.pointerId === press.id) {
        const p = press; cancelPress();
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 12) lastTap = { t: performance.now(), x: e.clientX, y: e.clientY, type: e.pointerType };
    }
    if (st !== "held" || !carry || !carry.active || e.pointerId !== carry.id) return;
    carry.active = false;
    if (!carry.moved) return;                                     // the pickup press itself, released in place: keep holding
    carry.tx = e.clientX; carry.ty = e.clientY;
    swallowUntil = Date.now() + 400;
    drop();
}
function onKey(e) {
    if (st !== "held") return;
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); goHome(); return; }
    if ([" ", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(e.key)) e.preventDefault();
}
function frame() {
    if (st !== "held" || !carry || !ghost) return;
    if (document.querySelector(".overlay:not(.hidden)") || !shown(box)) { goHome(true); return; }
    const k = carry.type === "mouse" ? .42 : .34;
    const gx = carry.tx + carry.ox, gy = carry.ty + carry.oy;
    const nx = carry.cx + (gx - carry.cx) * k, ny = carry.cy + (gy - carry.cy) * k;
    carry.vx = carry.vx * .6 + (nx - carry.cx) * .4; carry.vy = carry.vy * .6 + (ny - carry.cy) * .4;
    carry.cx = nx; carry.cy = ny;
    const M = Number(C.maxTiltDeg) || 12;
    carry.rz = carry.rz * .8 + clamp(carry.vx * .9, -M, M) * .2;
    carry.s += (C.liftScale - carry.s) * .25;
    const dx = carry.cx + sx() - (rest.x + rest.w / 2), dy = carry.cy + sy() - (rest.y + rest.h / 2);
    ghost.style.transform = T(dx, dy, carry.rz - 2, carry.s);
    const inner = ghost.firstChild;
    inner.style.setProperty("--ry", clamp(carry.vx * 1.4, -M, M).toFixed(2) + "deg");
    inner.style.setProperty("--rx", clamp(-carry.vy * 1.4 + 4, -M, M).toFixed(2) + "deg");
    reader.classList.toggle("near", inSnap(gx, gy));
    carry.raf = requestAnimationFrame(frame);
}
/* the snap zone: the card's bottom edge close to the slot and lined up with it (client coordinates of the card centre) */
function inSnap(cx, cy) {
    const r = slit.getBoundingClientRect(), mx = r.left + r.width / 2, my = r.top + r.height / 2;
    const bottom = cy + rest.h * C.liftScale / 2;
    return Math.abs(cx - mx) < r.width * .24 && bottom > my - C.snapPx && bottom < my + C.snapPx * 1.6;
}
function endCarry() {
    if (carry) cancelAnimationFrame(carry.raf);
    window.removeEventListener("wheel", noWheel, { passive: false });
    document.body.classList.remove("cs-carry"); reader.classList.remove("ready", "near");
    if (ghost) ghost.classList.remove("held");
}
function drop() {
    const near = inSnap(carry.tx + carry.ox, carry.ty + carry.oy);
    if (near) insert("drag"); else goHome();
}

/* back to its spot on the pass: a glide with a soft settle (instant when the layout changed under it) */
function goHome(instant) {
    if (!ghost) { cleanup(); return; }
    endCarry(); carry = null;
    if (instant || lite()) { cleanup(); return; }
    st = "returning";
    const from = ghost.style.transform;
    ghost.firstChild.style.setProperty("--rx", "0deg"); ghost.firstChild.style.setProperty("--ry", "0deg");
    anim = ghost.animate([{ transform: from }, { transform: T(0, 0, 0, 1) }], { duration: C.returnMs, easing: "cubic-bezier(.22,1.3,.42,1)", fill: "forwards" });
    anim.onfinish = cleanup;
}
function cleanup() {
    timers.forEach(clearTimeout); timers = [];
    endCarry(); carry = null; killGhost();
    if (box) box.classList.remove("cs-away", "cs-fade");
    if (reader) reader.classList.remove("ok", "busy");
    st = "idle";
}

/* ---------- inserting ---------- */
function slotGeom() {
    const r = slit.getBoundingClientRect();
    const s = Math.min(1, (r.width - 6) / rest.w), h = rest.h * s;
    const mx = r.left + r.width / 2 + sx(), my = r.top + r.height / 2 + sy();
    const dx = mx - (rest.x + rest.w / 2), restCy = rest.y + rest.h / 2;
    return {
        s, dx,
        aboveY: my - h / 2 - 2 - restCy,                                 // lined up, bottom edge just over the slot
        inY: my - h * C.visibleShare + h / 2 - restCy,                   // slid in: only the top strip still shows
        clipIn: `inset(-120px -120px ${(rest.h * (1 - C.visibleShare)).toFixed(1)}px -120px)`   // cut at the slot line (card's own px)
    };
}
function insert(how) {
    if (st === "inserting" || st === "inslot" || st === "ejecting") return;
    if (document.querySelector(".overlay:not(.hidden)") && how !== "lite") return;
    countUse();
    if (how === "lite" || lite()) {
        // reduced effects: a quick fade of the card, the lights, the beep, the Wardrobe at once
        cleanup(); st = "inslot";
        box.classList.add("cs-fade"); reader.classList.add("ok");
        X.sfx("cardIn"); X.open();
        if ($("profile") && $("profile").classList.contains("hidden")) cleanup();
        return;
    }
    if (how === "auto") { cancelPress(); makeGhost(); }
    if (!ghost) return;
    endCarry();
    const from = ghost.style.transform || T(0, 0, 0, 1);
    carry = null; st = "inserting";
    ghost.firstChild.style.setProperty("--rx", "0deg"); ghost.firstChild.style.setProperty("--ry", "0deg");
    reader.classList.add("busy");
    const g = slotGeom(), D = C.insertMs;
    const above = { transform: T(g.dx, g.aboveY, 0, g.s), clipPath: `inset(-120px -120px 0px -120px)` };
    const frames = how === "auto"
        ? [{ offset: 0, transform: from, clipPath: NOCLIP, easing: "cubic-bezier(.3,.7,.4,1)" },
           { offset: .2, transform: T(0, -12, -3, C.liftScale), clipPath: NOCLIP, easing: "cubic-bezier(.4,0,.2,1)" },
           { offset: .46, ...above, easing: "cubic-bezier(.55,0,.35,1)" },
           { offset: 1, transform: T(g.dx, g.inY, 0, g.s), clipPath: g.clipIn }]
        : [{ offset: 0, transform: from, clipPath: NOCLIP, easing: "cubic-bezier(.25,.9,.35,1)" },
           { offset: .32, ...above, easing: "cubic-bezier(.55,0,.35,1)" },
           { offset: 1, transform: T(g.dx, g.inY, 0, g.s), clipPath: g.clipIn }];
    // the clip-path is "open" on all sides until the card is lined up, then cuts at the slot line as it goes down
    anim = ghost.animate(frames, { duration: D, fill: "forwards" });
    later(D * .78, () => { reader.classList.add("ok"); X.sfx("cardIn"); });
    anim.onfinish = () => {
        if (st !== "inserting") return;
        st = "inslot";
        ghost.style.transform = T(g.dx, g.inY, 0, g.s); ghost.style.clipPath = g.clipIn;
        try { anim.cancel(); } catch (e) {} anim = null;
        later(C.openDelayMs, () => {
            if (st !== "inslot") return;
            const ov = $("profile"); if (ov) ov.classList.add("ov-reader");
            X.open();
            if (ov && ov.classList.contains("hidden")) eject();       // the Wardrobe didn't open: give the card back
        });
    };
}
/* while the Wardrobe is open the card stays in the slot (kept in place if the window is resized) */
function placeInSlot() {
    if (!ghost || !shown(box)) return;
    const pass = box.querySelector(".pass"); if (!pass) return;
    const r = pass.getBoundingClientRect();
    rest = { x: r.left + sx(), y: r.top + sy(), w: r.width, h: r.height };
    Object.assign(ghost.style, { left: rest.x + "px", top: rest.y + "px", width: rest.w + "px", height: rest.h + "px" });
    const g = slotGeom(); ghost.style.transform = T(g.dx, g.inY, 0, g.s); ghost.style.clipPath = g.clipIn;
}

/* ---------- ejecting: out of the slot and back onto the menu, with the look the Wardrobe just saved ---------- */
function eject() {
    if (st !== "inslot" && st !== "inserting") return;
    timers.forEach(clearTimeout); timers = [];
    if (!ghost || lite() || !shown(box) || !box.querySelector(".pass")) { if (st === "inslot" && reader.classList.contains("ok")) X.sfx("cardOut"); cleanup(); return; }
    if (anim) { try { anim.cancel(); } catch (e) {} anim = null; }
    placeInSlot();
    ghost.replaceChild(clonePass(box.querySelector(".pass")), ghost.firstChild);
    st = "ejecting";
    reader.classList.remove("ok");
    X.sfx("cardOut");
    const g = slotGeom();
    anim = ghost.animate([
        { offset: 0, transform: T(g.dx, g.inY, 0, g.s), clipPath: g.clipIn, easing: "cubic-bezier(.2,.8,.3,1)" },
        { offset: .45, transform: T(g.dx, g.aboveY - 10, 0, g.s), clipPath: "inset(-120px -120px 0px -120px)", easing: "cubic-bezier(.4,0,.2,1)" },
        { offset: .5, transform: T(g.dx, g.aboveY - 12, 0, g.s), clipPath: "inset(-120px -120px -120px -120px)", easing: "cubic-bezier(.25,1.25,.4,1)" },
        { offset: 1, transform: T(0, 0, 0, 1), clipPath: "inset(-120px -120px -120px -120px)" }
    ], { duration: C.ejectMs, fill: "forwards" });
    anim.onfinish = cleanup;
}

/* for tests and the console */
export const cardSlotState = () => st;
