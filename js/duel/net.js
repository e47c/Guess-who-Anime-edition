/* =====================================================================
   ANIME TCG · DUEL TRANSPORT (host-authoritative, hidden information stays hidden)
   Every player publishes an ECDH public key (rooms/<code>/pk/pN, P-256; the private key never leaves the browser
   session). The room host runs the duel engine and writes, per duel node (rooms/<code>/cvb/<bid>):
     pub        the public view (what a spectator may see: viewFor(s, 0))
     pv/pN      player N's own view, AES-GCM encrypted with the key shared by the host and player N (ECDH)
     sx         the full state, encrypted with a key only the host's browser holds (so a reload can continue the duel)
   Players only write intents (rooms/<code>/cvi/<bid>/pN/<n> = the move). Nobody but the host ever receives the
   other hands, the face-down cards or a deck order in readable form. If the host's browser is gone, the duel
   can't be continued and is stopped (no result).
   ===================================================================== */
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const subtle = () => (globalThis.crypto && crypto.subtle) || null;
let me = null;                    // { priv, pubJwk }
const shared = new Map();         // "<their pub jwk x>" -> AES key
export const cryptoOk = () => !!subtle();

/* my key pair for this browser session */
export async function myKeys() {
    if (me) return me;
    const S = subtle(); if (!S) return null;
    try {
        const saved = JSON.parse(sessionStorage.getItem("aap_duel_kp") || "null");
        if (saved) { me = { priv: await S.importKey("jwk", saved.priv, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey"]), pubJwk: saved.pub }; return me; }
    } catch (e) {}
    const kp = await S.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
    const pub = await S.exportKey("jwk", kp.publicKey), priv = await S.exportKey("jwk", kp.privateKey);
    try { sessionStorage.setItem("aap_duel_kp", JSON.stringify({ pub, priv })); } catch (e) {}
    me = { priv: kp.privateKey, pubJwk: { kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y } };
    return me;
}
async function keyWith(theirPub) {
    const k = theirPub && theirPub.x + theirPub.y; if (!k) return null;
    if (shared.has(k)) return shared.get(k);
    const S = subtle(), mine = await myKeys(); if (!S || !mine) return null;
    const pub = await S.importKey("jwk", { kty: "EC", crv: "P-256", x: theirPub.x, y: theirPub.y, ext: true }, { name: "ECDH", namedCurve: "P-256" }, false, []);
    const key = await S.deriveKey({ name: "ECDH", public: pub }, mine.priv, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    shared.set(k, key); return key;
}
export async function seal(obj, theirPub) {
    const key = await keyWith(theirPub); if (!key) return null;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await subtle().encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj)));
    return { iv: b64(iv), ct: b64(ct) };
}
export async function open(box, theirPub) {
    if (!box || !box.ct) return null;
    try { const key = await keyWith(theirPub); if (!key) return null; const pt = await subtle().decrypt({ name: "AES-GCM", iv: unb64(box.iv) }, key, unb64(box.ct)); return JSON.parse(dec.decode(pt)); }
    catch (e) { return null; }
}
/* the host's own vault key for the full state (per duel, kept in this browser session) */
async function hostKey(bid) {
    const S = subtle(); if (!S) return null;
    const k = "aap_duel_hk_" + bid;
    try { const raw = sessionStorage.getItem(k); if (raw) return await S.importKey("raw", unb64(raw), "AES-GCM", false, ["encrypt", "decrypt"]); } catch (e) {}
    const key = await S.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    try { sessionStorage.setItem(k, b64(await S.exportKey("raw", key))); } catch (e) {}
    return key;
}
export const hasHostKey = bid => { try { return !!sessionStorage.getItem("aap_duel_hk_" + bid); } catch (e) { return false; } };
export async function sealFull(bid, obj) { const key = await hostKey(bid); const iv = crypto.getRandomValues(new Uint8Array(12)); return { iv: b64(iv), ct: b64(await subtle().encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj)))) }; }
export async function openFull(bid, box) { if (!box || !hasHostKey(bid)) return null; try { const key = await hostKey(bid); return JSON.parse(dec.decode(await subtle().decrypt({ name: "AES-GCM", iv: unb64(box.iv) }, key, unb64(box.ct)))); } catch (e) { return null; } }
