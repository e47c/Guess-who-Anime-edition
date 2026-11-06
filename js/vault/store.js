/* =====================================================================
   VAULT STORAGE LAYER
   Coins, inventory, collection, decks, pity, missions and streaks live in ONE document per player.
   Today it is stored the same way the profile is: this browser's localStorage (key "aap_vault_v1").
   The site has no server of its own and the Firebase rules only let clients write under rooms/, so there
   is no durable server-side place for it yet. Everything goes through a backend object, so a server
   backend (e.g. Firebase Cloud Functions + a read-only vault/<uid> path) can replace localBackend()
   without touching any caller:

     backend = { name, load() -> doc|null, save(doc), lock(fn) -> Promise, watch(onExternalChange) }

   RULES THE BANK ENFORCES
   - Callers never edit the document. They call bank.apply(opId, kind, fn): fn gets a working copy,
     changes it and returns a result; the bank saves it and logs it to the ledger.
   - Idempotent: an opId is applied at most once. A repeat (double click, reconnect, second tab) returns
     the first result and changes nothing. opIds are remembered for VAULT.opsKeepDays.
   - Atomic across tabs: apply() runs under a Web Lock (when the browser has it) and reloads the latest
     document first, so two tabs can't both spend the same coins.
   - A coin balance never goes below 0 (spend() refuses instead).
   ===================================================================== */
import { VAULT } from "./config.js?v=2";

export const VAULT_KEY = "aap_vault_v1";
const DAY = 86400000;

export function blankVault(now = Date.now()) {
    return {
        v: 1, created: now, owner: "",          // owner = the Firebase uid that last used it (for a later server migration)
        coins: VAULT.startCoins,
        ledger: [],                              // newest last: { t, op, kind, d (coin delta), bal, seed?, info? }
        ops: {},                                 // opId -> { t, r (the result returned the first time) }
        // filled by later phases (kept here so the shape is documented in one place)
        daily: { last: "", streak: 0 },          // login bonus
        earn: { day: "", games: 0 },             // coins from games today (daily cap)
        missions: { day: "", list: [] },
        modes: {},                               // mode -> last time played (for the "try a mode" mission)
        inv: {}, equip: {},                      // cosmetics owned / equipped
        pity: { normal: 0, premium: 0 },
        cards: {}, shards: 0, decks: [], pending: []
    };
}

/* ---------- backends ---------- */
export function localBackend(key = VAULT_KEY, ls = globalThis.localStorage) {
    const ok = (() => { try { const k = "__aap_t"; ls.setItem(k, "1"); ls.removeItem(k); return true; } catch (e) { return false; } })();
    let mem = null;                               // private windows / blocked storage: keep it for this visit only
    return {
        name: ok ? "local" : "memory",
        durable: ok,
        load() { if (!ok) return mem; try { return JSON.parse(ls.getItem(key) || "null"); } catch (e) { return null; } },
        save(doc) { if (!ok) { mem = doc; return; } ls.setItem(key, JSON.stringify(doc)); },
        lock(fn) {
            const L = globalThis.navigator && navigator.locks;
            return L && L.request ? L.request(key, () => fn()) : Promise.resolve().then(fn);
        },
        watch(cb) {
            if (!ok || typeof addEventListener !== "function") return () => {};
            const f = e => { if (e.key === key) cb(); };
            addEventListener("storage", f); return () => removeEventListener("storage", f);
        }
    };
}
export function memoryBackend(initial = null) {
    let doc = initial ? JSON.parse(JSON.stringify(initial)) : null, q = Promise.resolve();
    return {
        name: "memory", durable: false,
        load: () => doc ? JSON.parse(JSON.stringify(doc)) : null,
        save: d => { doc = JSON.parse(JSON.stringify(d)); },
        lock: fn => (q = q.then(fn, fn)),
        watch: () => () => {}
    };
}

/* ---------- the bank ---------- */
export function createBank(backend, { now = () => Date.now() } = {}) {
    let doc = migrate(backend.load(), now());
    if (!backend.load()) backend.save(doc);
    const subs = new Set();
    const emit = () => subs.forEach(f => { try { f(doc); } catch (e) {} });
    backend.watch(() => { doc = migrate(backend.load(), now()); emit(); });

    function prune(d) {
        const cut = now() - VAULT.opsKeepDays * DAY;
        for (const k in d.ops) if (d.ops[k].t < cut) delete d.ops[k];
        if (d.ledger.length > VAULT.ledgerKeep) d.ledger.splice(0, d.ledger.length - VAULT.ledgerKeep);
    }

    const bank = {
        backend: backend.name, durable: !!backend.durable,
        get: () => doc,                                   // read-only by convention
        coins: () => doc.coins,
        onChange(f) { subs.add(f); return () => subs.delete(f); },
        has: opId => !!doc.ops[opId],
        ledger: () => doc.ledger.slice(),
        setOwner(uid) { if (uid && doc.owner !== uid) return bank.apply("owner:" + uid, "owner", d => { d.owner = uid; }, { silent: true }); return Promise.resolve(null); },
        /* fn(working copy, tools) -> result (any JSON). Throw / return {error} to abort without saving. */
        apply(opId, kind, fn, opt = {}) {
            if (!opId) return Promise.reject(new Error("opId required"));
            return backend.lock(() => {
                const cur = migrate(backend.load(), now());
                if (cur.ops[opId]) { doc = cur; return { ok: true, dup: true, result: cur.ops[opId].r }; }
                const w = JSON.parse(JSON.stringify(cur)), t = now(), start = w.coins;
                const log = (info = {}) => w.ledger.push(Object.assign({ t, op: opId, kind, d: w.coins - start, bal: w.coins }, info));
                let result;
                try { result = fn(w, { now: t, log }); } catch (e) { return { ok: false, error: e.message || String(e) }; }
                if (result && result.error) return { ok: false, error: result.error };
                if (!(w.coins >= 0) || !Number.isFinite(w.coins)) return { ok: false, error: "Not enough coins" };
                w.coins = Math.round(w.coins);
                if (!opt.silent && !w.ledger.some(l => l.op === opId && l.t === t)) log(result && result.seed != null ? { seed: result.seed } : {});
                w.ops[opId] = { t, r: result === undefined ? null : result };
                prune(w);
                try { backend.save(w); } catch (e) { return { ok: false, error: "Couldn't save (storage full?)" }; }
                doc = w; emit();
                return { ok: true, dup: false, result: result === undefined ? null : result };
            });
        },
        grant(opId, amount, kind, info) {
            amount = Math.max(0, Math.round(amount));
            return bank.apply(opId, kind || "grant", (w, x) => { w.coins += amount; x.log(Object.assign({}, info ? { info } : {})); return { coins: amount }; });
        },
        spend(opId, amount, kind, info) {
            amount = Math.max(0, Math.round(amount));
            return bank.apply(opId, kind || "spend", (w, x) => { if (w.coins < amount) return { error: "Not enough coins" }; w.coins -= amount; x.log(Object.assign({}, info ? { info } : {})); return { coins: -amount }; });
        }
    };
    return bank;
}

/* old or missing documents become the current shape (never loses coins or cards) */
export function migrate(d, now = Date.now()) {
    const b = blankVault(now);
    if (!d || typeof d !== "object" || d.v !== 1) return b;
    const out = Object.assign(b, d);
    ["daily", "earn", "missions", "pity"].forEach(k => { out[k] = Object.assign(blankVault(now)[k], d[k] || {}); });
    out.ledger = Array.isArray(d.ledger) ? d.ledger : []; out.ops = d.ops && typeof d.ops === "object" ? d.ops : {};
    out.coins = Math.max(0, Math.round(Number(d.coins) || 0));
    return out;
}
