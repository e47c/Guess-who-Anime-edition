/* =====================================================================
   OWNER-ONLY COIN TOOL (hidden). For the project owner to add AAP Coins to his own balance while testing.
   Trigger: press and HOLD the AAP Coin counter (the menu CREDIT counter, or the lobby coin chip) for DEV_TOOL.holdMs
   with the left mouse button or one finger. No hint, no progress while holding. Moving away, releasing early or a
   second pointer cancels it. A normal click still opens Daily rewards; after a completed hold that click is swallowed.
   Then a small window asks for a code. Only a code whose PBKDF2 hash matches DEV_TOOL.hash, entered on a profile
   whose id is on the owner allow-list (DEV_TOOL.owners, salted SHA-256 hashes), unlocks the amount field. Anyone
   else, including a friend who knows the code, sees only "Invalid code". After DEV_TOOL.maxTries failures in a row
   the tool locks for DEV_TOOL.lockMinutes; failed attempts are logged in this browser (localStorage "aap_dt").
   A grant is a whole number from 1 to DEV_TOOL.maxGrant, applied once per Confirm click (one bank operation id per
   click, so a double click or a retry never pays twice), and logged: a "devgrant" ledger line plus the vault's
   devGrants list (profile id, amount, time). Dev grants are bank coins only: missions, achievements, stats, XP,
   leaderboards and Night Party bonuses read match results and events, never the coin balance, so they don't count.
   WHAT THIS DOES AND DOES NOT PROTECT (there is no server):
     - The site is static (GitHub Pages) and Firebase only stores rooms; there is no backend that could check a code
       or hold coins. The coin balance itself lives in this browser's localStorage, so anyone can already change their
       own coins with the browser's developer tools. This tool is a convenience, not a security boundary.
     - What it does guarantee: the code is not in the source (only a salted PBKDF2 hash, 310k iterations, made by
       tools/devgrant-setup.mjs, so guessing it offline is slow), the tool does nothing for a profile id that is not
       on the allow-list, wrong codes lock it for a while, and every grant is logged.
     - The allow-list check runs in the browser, so someone editing the page's code could skip it, exactly as they
       could edit their localStorage. A real guarantee needs a server (e.g. a Cloud Function holding the hash and the
       allow-list, writing a server-side balance).
   ===================================================================== */
import { DEV_TOOL } from "./config.js?v=21";
import { bank } from "./vault.js?v=24";

const LS = "aap_dt";
let X = { uid: () => "", sfx: () => {}, toast: () => {} };
const enc = new TextEncoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s || ""), c => c.charCodeAt(0));
const store = { get() { try { return JSON.parse(localStorage.getItem(LS) || "null") || {}; } catch (e) { return {}; } }, set(v) { try { localStorage.setItem(LS, JSON.stringify(v)); } catch (e) {} } };
const playerId = () => String((X.uid && X.uid()) || (bank.get() || {}).owner || "");
const TRIGGER = "#credit, .vault-chip";

/* ---------- crypto (WebCrypto: PBKDF2 for the code, SHA-256 for the owner ids) ---------- */
export async function codeHash(code, saltB64, iterations = DEV_TOOL.kdf.iterations, hash = DEV_TOOL.kdf.hash) {
    const key = await crypto.subtle.importKey("raw", enc.encode(normCode(code)), "PBKDF2", false, ["deriveBits"]);
    return b64(await crypto.subtle.deriveBits({ name: "PBKDF2", hash, salt: unb64(saltB64), iterations }, key, 256));
}
export async function ownerHash(id, salt = DEV_TOOL.ownerSalt) { return b64(await crypto.subtle.digest("SHA-256", enc.encode(String(salt) + String(id)))); }
export const normCode = c => String(c || "").trim().toUpperCase();
const ready = () => !!(DEV_TOOL.salt && DEV_TOOL.hash && globalThis.crypto && crypto.subtle);

/* ---------- lock + failed-attempt log ---------- */
function lockLeft(now = Date.now()) { const s = store.get(); return Math.max(0, (Number(s.lockUntil) || 0) - now); }
async function fail(now = Date.now()) {
    const s = store.get(), who = playerId() ? (await ownerHash(playerId(), "log")).slice(0, 10) : "";
    s.fails = (Number(s.fails) || 0) + 1;
    s.log = (Array.isArray(s.log) ? s.log : []).concat([{ t: now, who }]).slice(-DEV_TOOL.logKeep);
    if (s.fails >= DEV_TOOL.maxTries) { s.lockUntil = now + DEV_TOOL.lockMinutes * 60000; s.fails = 0; }
    store.set(s);
}
function clearFails() { const s = store.get(); s.fails = 0; store.set(s); }

/* the whole check: right code AND an allow-listed profile. Same answer ("Invalid code") for every failure. */
export async function verify(code) {
    if (lockLeft() > 0) return { ok: false, locked: lockLeft() };
    let ok = false;
    try {
        if (ready() && normCode(code)) {
            const [h, o] = await Promise.all([codeHash(code, DEV_TOOL.salt), playerId() ? ownerHash(playerId()) : Promise.resolve("")]);
            ok = h === DEV_TOOL.hash && !!o && (DEV_TOOL.owners || []).includes(o);
        }
    } catch (e) { ok = false; }
    if (!ok) { await fail(); return { ok: false, locked: lockLeft() }; }
    clearFails(); return { ok: true };
}
/* the grant itself: validated, idempotent per operation id, logged; never touches anything but the coin balance */
export function validAmount(v) { const n = typeof v === "string" && /^\s*\d+\s*$/.test(v) ? Number(v) : v; return Number.isInteger(n) && n >= 1 && n <= DEV_TOOL.maxGrant ? n : 0; }
export function applyDevGrant(w, amount, who, now, log) {
    const n = validAmount(amount); if (!n) return { error: "Enter a whole number from 1 to " + DEV_TOOL.maxGrant.toLocaleString("en-US") + "." };
    w.coins += n;
    w.devGrants = (Array.isArray(w.devGrants) ? w.devGrants : []).concat([{ t: now, id: String(who || ""), amount: n }]).slice(-DEV_TOOL.logKeep);
    if (log) log({ info: "dev grant · " + String(who || "?").slice(0, 8) });
    return { coins: n, devgrant: true };
}

/* ---------- the hold on the coin counter ---------- */
let hold = null, swallowUntil = 0;
function cancel() { if (hold) { clearTimeout(hold.t); hold = null; } }
function onDown(e) {
    const el = e.target && e.target.closest && e.target.closest(TRIGGER);
    if (hold && (!el || e.pointerId !== hold.id)) { cancel(); return; }          // a second finger / button cancels
    if (!el || e.button > 0 || e.isPrimary === false) return;
    cancel();
    hold = { el, id: e.pointerId, x: e.clientX, y: e.clientY, t: setTimeout(fire, DEV_TOOL.holdMs) };
}
function onMove(e) {
    if (!hold || e.pointerId !== hold.id) return;
    const r = hold.el.getBoundingClientRect(), out = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (out || Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > DEV_TOOL.moveCancelPx) cancel();
}
function onUp(e) { if (hold && e.pointerId === hold.id) cancel(); }
function fire() { hold = null; swallowUntil = Date.now() + 2500; openTool(); }
export function initDevGrant(ctx) {
    X = Object.assign(X, ctx);
    if (typeof document === "undefined") return;
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointermove", onMove, true);
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(t => document.addEventListener(t, onUp, true));
    window.addEventListener("blur", cancel); document.addEventListener("visibilitychange", cancel);
    document.addEventListener("click", e => { if (swallowUntil > Date.now() && e.target && e.target.closest && e.target.closest(TRIGGER)) { e.stopImmediatePropagation(); e.preventDefault(); swallowUntil = 0; } }, true);
    document.addEventListener("contextmenu", e => { if (hold && e.target && e.target.closest && e.target.closest(TRIGGER)) e.preventDefault(); }, true);
}

/* ---------- the window ---------- */
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const mins = ms => Math.max(1, Math.ceil(ms / 60000));
function openTool() {
    if (document.querySelector(".dt-ov")) return;
    const ov = mk("div", "dt-ov"); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Code");
    const box = mk("form", "dt-box"); box.autocomplete = "off"; box.noValidate = true;
    const x = mk("button", "dt-x", "✕"); x.type = "button"; x.setAttribute("aria-label", "Close");
    const lab = mk("label", "dt-l", "Code"), code = mk("input", "dt-in"); code.type = "password"; code.id = "dtCode"; code.autocomplete = "off"; code.spellcheck = false; code.setAttribute("autocapitalize", "characters"); lab.htmlFor = "dtCode";
    const go = mk("button", "btn alt sm dt-go", "OK"); go.type = "submit";
    const msg = mk("p", "dt-msg"); msg.setAttribute("aria-live", "polite");
    const row1 = mk("div", "dt-row"); row1.append(code, go);
    box.append(x, lab, row1, msg); ov.appendChild(box);
    document.body.appendChild(ov);
    let step = "code", busy = false, op = null, unlockedFor = "";
    const close = () => { ov.remove(); document.removeEventListener("keydown", onKey, true); };
    const onKey = e => { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(); } };
    document.addEventListener("keydown", onKey, true);
    x.onclick = close; ov.addEventListener("click", e => { if (e.target === ov) close(); });
    const left = lockLeft(); if (left) { msg.textContent = "Locked. Try again in " + mins(left) + " min."; }
    let amt = null, conf = null;
    const showAmount = () => {
        step = "amount"; unlockedFor = playerId(); op = "devgrant:" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        lab.textContent = "AAP Coins to add"; code.value = ""; row1.remove();
        amt = mk("input", "dt-in"); amt.type = "text"; amt.inputMode = "numeric"; amt.id = "dtAmt"; amt.autocomplete = "off"; amt.placeholder = "1 – " + DEV_TOOL.maxGrant.toLocaleString("en-US"); lab.htmlFor = "dtAmt";
        conf = mk("button", "btn alt sm dt-go", "Confirm"); conf.type = "submit";
        const row2 = mk("div", "dt-row"); row2.append(amt, conf); box.insertBefore(row2, msg);
        msg.textContent = ""; setTimeout(() => amt.focus(), 30);
    };
    box.onsubmit = async e => {
        e.preventDefault(); if (busy) return;
        if (step === "code") {
            busy = true; go.disabled = true; msg.textContent = "…";
            const r = await verify(code.value); busy = false; go.disabled = false;
            if (r.ok) { X.sfx("ready"); showAmount(); return; }
            code.value = ""; X.sfx("close");
            msg.textContent = r.locked ? "Invalid code. Locked for " + mins(r.locked) + " min." : "Invalid code";
            if (r.locked) go.disabled = true; else code.focus();
            return;
        }
        if (playerId() !== unlockedFor) { close(); return; }
        const n = validAmount(amt.value);
        if (!n) { msg.textContent = "Enter a whole number from 1 to " + DEV_TOOL.maxGrant.toLocaleString("en-US") + "."; return; }
        busy = true; conf.disabled = true;
        const who = unlockedFor, opId = op;
        const res = await bank.apply(opId, "devgrant", (w, t) => applyDevGrant(w, n, who, t.now, t.log));
        busy = false;
        if (!res.ok) { conf.disabled = false; msg.textContent = res.error || "Couldn't add the coins."; return; }
        X.sfx("coin");
        msg.textContent = res.dup ? "Already added." : "+" + n.toLocaleString("en-US") + " AAP Coins added (logged as a dev grant).";
        op = "devgrant:" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);      // the next Confirm is a new grant
        amt.value = ""; conf.disabled = false; amt.focus();
    };
    setTimeout(() => code.focus(), 30);
}
export const _devTest = { openTool, fire, state: () => store.get(), cancel };
