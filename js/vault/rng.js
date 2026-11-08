/* =====================================================================
   SEEDED RNG (one per roll)
   Every random outcome in the Vault (pack, scratch card, mission pick, starter deck, duel auto-pick)
   gets its own fresh 32-bit seed. The seed is written to the ledger with the result, so any roll can be
   replayed and audited: rngFrom(seed) always gives the same sequence (sfc32 seeded via splitmix32).
   ===================================================================== */
export function newSeed() {
    try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] >>> 0; } catch (e) { return (Math.random() * 4294967296) >>> 0; }
}
export function rngFrom(seed) {
    let s = seed >>> 0;
    const split = () => { s = (s + 0x9e3779b9) >>> 0; let z = s; z = Math.imul(z ^ (z >>> 16), 0x85ebca6b); z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35); return (z ^ (z >>> 16)) >>> 0; };
    let a = split(), b = split(), c = split(), d = split();
    const next = () => {
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
        const t = (a + b) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); d = (d + 1) | 0;
        const r = (t + d) | 0; c = (c + r) | 0;
        return (r >>> 0) / 4294967296;
    };
    for (let i = 0; i < 12; i++) next();
    return next;
}
/* helpers over a rng() */
export const pickInt = (rng, n) => Math.floor(rng() * n);
export function pickWeighted(rng, weights) {          // weights: { key: w } -> key
    const ks = Object.keys(weights).filter(k => weights[k] > 0), tot = ks.reduce((s, k) => s + weights[k], 0);
    let x = rng() * tot;
    for (const k of ks) { x -= weights[k]; if (x < 0) return k; }
    return ks[ks.length - 1];
}
export function shuffleWith(rng, a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
