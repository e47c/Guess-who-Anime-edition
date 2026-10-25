/* =====================================================================
   GRAND VOYAGE · SCREEN
   Renders rooms/<code>/vy and turns its event list (s.fx) into short
   cinematics. All moves go through ctx.tx(), one RTDB transaction each,
   with the rules in logic.js. game.js owns the room, the router and the
   lobby; this module only draws the voyage and sends moves.
   ===================================================================== */
import { audio } from "../audio.js";
import { ambient, titleCard, shake, ring, burstText, motionOK } from "../fx.js";
import { avatarEl } from "../profile.js";
import { showResults, closeResults } from "../results.js";
import { ROLES, ROLE_KEYS, ITEMS, OBJECTIVES, NODE, EVENTS, MAX_ITEMS } from "./data.js";
import * as L from "./logic.js";

const $ = id => document.getElementById(id);
const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const arr = x => Array.isArray(x) ? x : (x ? Object.values(x) : []);
const sfx = (n, o) => audio.sfx(n, o);
const K = p => "p" + p;
const SVGNS = "http://www.w3.org/2000/svg";
const sv = (tag, at) => { const e = document.createElementNS(SVGNS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
const clean = s => JSON.parse(JSON.stringify(s));

export const VY_MODE = { key: "vy", name: "Grand Voyage", tag: "UNCHARTED ROUTE", kanji: "航", min: 2, max: 6, color: "#3ee6c8", sub: "Sail together. Scheme alone.",
    blurb: "A shared adventure across a hidden map. Vote on routes, fight, trade and steal. Everyone has a secret objective.",
    art: ["images/special/onepiece_swap.jpg", "images/bg-anime.jpg", "images/special/naruto_vision.jpg"] };
export const VY_RULES = [
    "The crew sails one map together. Each leg, everyone votes on the next node. Majority wins; the helm breaks ties.",
    "Battles: everyone secretly picks Attack, Guard or Hold back. Fighters split the spoils, the top fighter gets a relic.",
    "Between fights you can give, trade and even steal from crewmates. Thieves may be seen.",
    "Each player has a hidden objective. In crews of 3+, there may be a mutineer, and the campfire before the boss is your one chance to unmask them.",
    "Beat the boss to claim the Legendary Treasure. It goes to the player with the most renown: gold, relics, deeds and secret objectives."
];

let C = null, S = null, D = null;
let seen = blank(), battleItem = null, queue = [], running = false, pace = 1;
function blank() { return { mid: null, eid: -1, note: -1, over: "", sig: "", first: true, peek: false, ship: null }; }
const timers = new Set();
function later(ms, f) { const t = setTimeout(() => { timers.delete(t); f(); }, motionOK() ? ms * pace : Math.min(ms, 80)); timers.add(t); return t; }

/* ---------------- wiring ---------------- */
export function vyInit(ctx) { C = ctx; build(); }
export function vyReset() {
    timers.forEach(clearTimeout); timers.clear(); queue = []; running = false;
    seen = blank(); S = null; battleItem = null;
    closeDlg(); const fx = $("vyFx"); if (fx) fx.innerHTML = "";
}
export function vyMatchOver(d) { return !d.vy || d.vy.phase === "over"; }
export function vySeats(d) { return arr(d.vy && d.vy.seats).map(Number); }
export function vyMusic(d) { const ph = d.vy && d.vy.phase; return ph === "over" ? "lobby" : ph === "battle" ? "vyb" : "vy"; }

// one move = one transaction on rooms/<code>/vy (undefined aborts it, nothing is written)
const move = (p, a) => C.tx(cur => { const s = L.norm(cur); return L.apply(s, p, a) ? clean(s) : undefined; });
async function act(a, failMsg) {
    try {
        const r = await move(C.me(), a);
        if (r && !r.committed && failMsg !== "") C.toast(failMsg || "That didn't go through. The voyage moved on.");
        return r && r.committed;
    } catch (e) { console.error(e); C.toast("Connection hiccup. Try again."); return false; }
}

/* host: start a fresh voyage for everyone in the room (also used for "sail again") */
export async function vyStart(d) {
    const seats = C.activeSlots(d);
    if (seats.length < 2) { C.toast("Grand Voyage needs at least 2 sailors."); return; }
    const names = {}; seats.forEach(p => { names[K(p)] = C.pName(d, p); });
    const s = L.create({ seed: (Math.random() * 2147483646 + 1) | 0, seats, names, len: Number(d.vyLen) || 6, series: arr(d.animes) });
    try { await C.update({ status: "playing", matchId: Date.now(), vy: clean(s) }); }
    catch (e) { console.error(e); C.toast("Could not launch the voyage."); }
}
/* host duties: seats whose player left become "gone" so nobody waits on them */
let goneBusy = "";
export function vyHost(d) {
    if (!d.vy || d.vy.phase === "over") return;
    const pl = d.vy.pl || {};
    arr(d.vy.seats).map(Number).forEach(p => {
        const node = d["player" + p], gone = !node || node.left;
        const k = d.matchId + ":" + p;
        if (gone && pl[K(p)] && !pl[K(p)].gone && goneBusy !== k) {
            goneBusy = k;
            // deferred: a transaction fires the room listener synchronously, and doing that from inside
            // the listener would let the outer (older) snapshot render over the newer one
            setTimeout(() => move(0, { t: "gone", p }).then(r => { if (r && !r.committed) console.warn("voyage: could not mark seat", p, "as gone"); }, e => console.warn("voyage: gone failed", e)).finally(() => { goneBusy = ""; }), 0);
        }
    });
}

/* ---------------- static DOM ---------------- */
function build() {
    const root = $("vy"); if (!root || root.childElementCount) return;
    root.innerHTML = "";
    const sky = mk("div", "vy-sky"); sky.setAttribute("aria-hidden", "true");
    sky.append(mk("div", "vy-moon"), mk("div", "vy-stars"), mk("div", "vy-waves a"), mk("div", "vy-waves b"), mk("div", "vy-sky-kj", "航"));
    const head = mk("div", "game-header"), hi = mk("div", "game-header-inner"), hl = mk("div");
    hl.append(Object.assign(mk("div", "turn"), { id: "vyTurn" }), Object.assign(mk("div", "status"), { id: "vyStatus" }));
    const ha = mk("div", "hb-hdr-actions");
    const hs = mk("button", "pop secondary vy-host-skip hidden", "⏭ SKIP AWAY"); hs.id = "vySkip"; hs.onclick = skipAway;
    const bag = mk("button", "pop secondary vy-bag-btn", "🎒"); bag.setAttribute("aria-label", "Jump to your satchel"); bag.onclick = () => { const m = $("vyMe"); if (m) m.scrollIntoView({ behavior: motionOK() ? "smooth" : "auto", block: "start" }); };
    const menu = mk("button", "pop ghost menu-btn", "☰"); menu.setAttribute("aria-label", "Menu"); menu.onclick = () => window.openPause();
    ha.append(hs, bag, menu); hi.append(hl, ha); head.appendChild(hi);
    const wrap = mk("div", "vy-wrap");
    const mapBox = mk("section", "vy-mapbox"); mapBox.setAttribute("aria-label", "Voyage chart");
    const svg = sv("svg", { id: "vyMap", viewBox: "0 0 1000 300", preserveAspectRatio: "xMidYMid meet", role: "img" });
    mapBox.appendChild(svg);
    const main = mk("div", "vy-main");
    const stage = mk("section", "vy-stage"); stage.id = "vyStage"; stage.setAttribute("aria-live", "polite");
    const side = mk("aside", "vy-side");
    const crew = mk("div", "vy-crew"); crew.id = "vyCrew";
    const me = mk("div", "vy-me"); me.id = "vyMe";
    const lg = mk("div", "vy-log"); lg.id = "vyLog";
    side.append(crew, me, lg); main.append(stage, side); wrap.append(mapBox, main);
    const dlg = mk("div", "hb-picker vy-dlg hidden"); dlg.id = "vyDlg"; dlg.setAttribute("role", "dialog"); dlg.setAttribute("aria-modal", "true");
    dlg.addEventListener("click", e => { if (e.target === dlg) closeDlg(); });
    const fx = mk("div", "vy-fx"); fx.id = "vyFx";
    root.append(sky, head, wrap, dlg, fx);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("vyDlg").classList.contains("hidden")) { e.stopPropagation(); closeDlg(); } }, true);
}

/* ---------------- render entry ---------------- */
export function vyShow(d) {
    if (!d.vy || !C) return;
    const s = L.norm(clean(d.vy));
    if (seen.mid !== d.matchId) { vyReset(); seen.mid = d.matchId; closeResults(); }
    D = d;
    C.showOnly("vy");
    ambient.set(s.phase === "battle" ? "vyb" : "vy");
    const pres = d.presence || {};
    const ps = s.seats.map(p => { const n = d["player" + p] || {}; return [n.name, n.col, n.fr, n.ttl, n.av && (n.av.u || n.av.g || String(n.av.d || "").length), !!n.left, pres[K(p)]]; });
    const sig = JSON.stringify([s.eid, s.n, s.phase, ps, C.amHost(), seen.peek]);
    S = s;
    if (sig !== seen.sig) { seen.sig = sig; renderAll(s, d); }
    playNew(s);
    notesNew(s);
    if (s.phase === "over") overSeq(s, d);
    if (seen.first) try { window.scrollTo(0, 0); } catch (e) {}
    seen.first = false;
}
function rerender() { if (S && D) { seen.sig = ""; renderAll(S, D); } }

function renderAll(s, d) {
    const me = C.me(), mine = s.pl[K(me)];
    $("vy").dataset.phase = s.phase;
    $("vy").classList.toggle("boss", !!(s.enc && s.enc.k === "boss"));
    header(s, d);
    renderMap(s);
    renderStage(s, d);
    renderCrew(s, d);
    renderMe(s, d, mine);
    renderLog(s);
}

/* ---------------- header ---------------- */
function waitingFor(s) { return L.need(s); }
function header(s, d) {
    const me = C.me(), node = L.nodeAt(s, s.node);
    const titles = { muster: "The Muster", route: "Chart the course", battle: s.enc && s.enc.k === "boss" ? "FINAL BATTLE" : "Battle!", event: "Mystery", chest: "Treasure", market: "Floating Market", shrine: "Shrine", camp: "The Campfire", over: "Voyage's end" };
    $("vyTurn").textContent = titles[s.phase] || "Grand Voyage";
    const wait = waitingFor(s), pres = d.presence || {};
    let st = s.phase === "muster" ? "Pick a role. Read your secret orders. Tell no one." : node.t === "start" ? "The harbor · " + (s.len + 1) + " legs to the treasure" : "Leg " + Math.min(s.leg, s.len + 1) + " of " + (s.len + 1) + " · " + (node.t === "boss" ? "The final lair" : (s.reg[node.l - 1] || "Open sea"));
    if (s.phase !== "over") st += wait.length ? " · Waiting for " + wait.map(p => p === me ? "you" : L.nm(s, p)).join(", ") : "";
    $("vyStatus").textContent = st;
    const away = wait.filter(p => pres[K(p)] === false);
    $("vySkip").classList.toggle("hidden", !(C.amHost() && away.length));
}
function skipAway() {
    if (!S || !D) return;
    const pres = D.presence || {}, away = L.need(S).filter(p => pres[K(p)] === false);
    if (!away.length) return;
    sfx("skip2");
    move(0, { t: "auto", ps: away }).catch(() => {});
}

/* ---------------- the chart ---------------- */
const MW = 1000, MH = 300;
function nodePos(s, n) { return { x: 60 + n.l * ((MW - 120) / (s.len + 1)), y: 34 + n.x * (MH - 68) }; }
const crewHasNav = s => L.live(s).some(p => L.P(s, p).cls === "nav");
const iAmNav = s => (L.P(s, C.me()) || {}).cls === "nav";
function fogged(s, n) { return n.l > s.leg + 2 && n.t !== "boss" && !crewHasNav(s); }
function scoutText(s, n) {
    if (n.e) return n.e.n;
    if (n.q) { const ev = EVENTS.find(e => e.id === n.q); return ev ? ev.t : ""; }
    return "";
}
function renderMap(s) {
    const svg = $("vyMap"); svg.innerHTML = "";
    svg.setAttribute("aria-label", "Voyage chart: leg " + s.leg + " of " + (s.len + 1));
    const defs = sv("defs", {});
    defs.innerHTML = '<radialGradient id="vyGlow"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
        '<filter id="vyBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>';
    svg.appendChild(defs);
    // compass rose watermark
    const rose = sv("g", { class: "vy-rose", transform: "translate(62," + (MH - 52) + ")" });
    rose.innerHTML = '<circle r="40"/><path d="M0 -46 L7 0 L0 46 L-7 0Z"/><path d="M-46 0 L0 7 L46 0 L0 -7Z"/><text y="-50">N</text>';
    svg.appendChild(rose);
    const opts = s.phase === "route" ? L.options(s) : [];
    const visited = new Set(s.path), edges = sv("g", { class: "vy-edges" });
    const walked = new Set(); for (let i = 1; i < s.path.length; i++) walked.add(s.path[i - 1] + ">" + s.path[i]);
    s.map.edges.forEach(([a, b]) => {
        const A = nodePos(s, s.map.nodes[a]), B = nodePos(s, s.map.nodes[b]), mx = (A.x + B.x) / 2;
        const cls = walked.has(a + ">" + b) ? "walked" : (a === s.node && opts.includes(b)) ? "open" : fogged(s, s.map.nodes[b]) ? "fog" : "";
        const pth = sv("path", { d: "M" + A.x + " " + A.y + " C" + mx + " " + A.y + " " + mx + " " + B.y + " " + B.x + " " + B.y, class: cls });
        pth.dataset.e = a + ">" + b;
        edges.appendChild(pth);
    });
    svg.appendChild(edges);
    const nodes = sv("g", { class: "vy-nodes" }), myVote = s.ch[K(C.me())];
    const votes = {}; if (s.phase === "route") L.live(s).forEach(p => { const v = s.ch[K(p)]; if (v != null) votes[v] = (votes[v] || 0) + L.voteWeight(s, p); });
    s.map.nodes.forEach(n => {
        const P = nodePos(s, n), T = NODE[n.t], fog = fogged(s, n), open = opts.includes(n.id);
        const g = sv("g", { class: "vy-node t-" + n.t + (visited.has(n.id) ? " visited" : "") + (n.id === s.node ? " here" : "") + (open ? " open" : "") + (fog ? " fog" : "") + (myVote === n.id ? " mine" : ""), transform: "translate(" + P.x + "," + P.y + ")" });
        g.style.setProperty("--nc", fog ? "#4b6a78" : T.c);
        const r = n.t === "boss" ? 26 : 17;
        if (open) g.appendChild(sv("circle", { r: r + 10, class: "halo" }));
        g.appendChild(sv("circle", { r, class: "disc" }));
        const tx = sv("text", { class: "kj", dy: ".36em" }); tx.textContent = fog ? "?" : T.k; g.appendChild(tx);
        const tt = sv("title", {}); tt.textContent = fog ? "Uncharted waters" : T.n + (iAmNav(s) && scoutText(s, n) ? ": " + scoutText(s, n) : ""); g.appendChild(tt);
        if (votes[n.id]) { const b = sv("g", { class: "vote-bub", transform: "translate(" + (r - 2) + "," + (-r + 2) + ")" }); b.appendChild(sv("circle", { r: 10 })); const t = sv("text", { dy: ".35em" }); t.textContent = votes[n.id]; b.appendChild(t); g.appendChild(b); }
        if (open) {
            g.setAttribute("tabindex", "0"); g.setAttribute("role", "button"); g.setAttribute("aria-label", "Vote for " + T.n);
            g.addEventListener("click", () => voteRoute(n.id)); g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); voteRoute(n.id); } });
        }
        nodes.appendChild(g);
    });
    svg.appendChild(nodes);
    // the ship
    const at = nodePos(s, s.map.nodes[s.node]);
    const ship = sv("g", { id: "vyShip", class: "vy-ship", transform: "translate(" + at.x + "," + (at.y - 30) + ")" });
    ship.innerHTML = '<g class="bob"><path class="hull" d="M-16 4 L16 4 L10 13 L-10 13Z"/><path class="mast" d="M0 4 L0 -20"/><path class="sail" d="M1 -19 Q14 -10 1 0Z"/><path class="sail2" d="M-1 -16 Q-11 -9 -1 -1Z"/><path class="flag" d="M0 -20 L8 -23 L0 -26Z"/></g>';
    svg.appendChild(ship);
    seen.ship = at;
    const box = svg.parentElement;      // phones: the chart scrolls sideways, keep the ship in view
    if (box && box.scrollWidth > box.clientWidth + 4) box.scrollLeft = Math.max(0, at.x / MW * svg.clientWidth - box.clientWidth / 2);
}
function sailShip(s, from, to) {
    const ship = $("vyShip"); if (!ship || !motionOK()) return;
    const path = document.querySelector('#vyMap .vy-edges path[data-e="' + from + ">" + to + '"]');
    if (!path || !path.getTotalLength) return;
    const len = path.getTotalLength(), t0 = performance.now(), dur = 1100;
    const step = now => {
        const k = Math.min(1, (now - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, pt = path.getPointAtLength(len * e);
        ship.setAttribute("transform", "translate(" + pt.x.toFixed(1) + "," + (pt.y - 30).toFixed(1) + ")");
        if (k < 1 && ship.isConnected) requestAnimationFrame(step);
    };
    ship.setAttribute("transform", "translate(" + path.getPointAtLength(0).x + "," + (path.getPointAtLength(0).y - 30) + ")");
    requestAnimationFrame(step);
}

/* ---------------- stage (what the crew decides now) ---------------- */
function renderStage(s, d) {
    const st = $("vyStage"); st.innerHTML = "";
    const me = C.me(), pl = s.pl[K(me)];
    if (!pl || pl.gone) { st.appendChild(card("SPECTATING", "The voyage sails on without you", "You left this voyage. You'll be dealt into the next one.")); return; }
    const f = { muster: stMuster, route: stRoute, battle: stBattle, event: stEvent, chest: stChest, market: stMarket, shrine: stShrine, camp: stCamp, over: stOver }[s.phase];
    if (f) f(st, s, d, me, pl);
    if (s.phase !== "over" && s.phase !== "muster") st.appendChild(waitRow(s, d));
}
function card(kick, title, text, cls) {
    const c = mk("div", "vy-card " + (cls || ""));
    if (kick) c.appendChild(mk("div", "vy-kick", kick));
    if (title) c.appendChild(mk("h2", "vy-h", title));
    if (text) c.appendChild(mk("p", "vy-p", text));
    return c;
}
function waitRow(s, d) {
    const row = mk("div", "vy-wait"), need = new Set(L.need(s)), pres = d.presence || {};
    const show = s.phase === "battle" ? L.up(s) : L.live(s);
    show.forEach(p => {
        const c = mk("span", "vy-wchip" + (need.has(p) ? " pend" : " done") + (pres[K(p)] === false ? " away" : ""));
        c.appendChild(avatarEl(C.pPub(d, p), { size: 22 }));
        c.appendChild(mk("b", null, p === C.me() ? "You" : L.nm(s, p)));
        c.appendChild(mk("i", null, pres[K(p)] === false ? "away" : need.has(p) ? "…" : "✔"));
        row.appendChild(c);
    });
    return row;
}
function voterRow(s, d, match) {
    const r = mk("div", "vy-voters");
    L.live(s).filter(p => match(s.ch[K(p)])).forEach(p => { const a = avatarEl(C.pPub(d, p), { size: 24 }); a.title = L.nm(s, p); r.appendChild(a); });
    return r;
}
function bigBtn(label, sub, cls, on, disabled) {
    const b = mk("button", "vy-choice " + (cls || ""));
    b.append(mk("b", null, label)); if (sub) b.appendChild(mk("small", null, sub));
    b.disabled = !!disabled; b.onclick = () => { sfx("pick"); on(); };
    b.onmouseenter = () => sfx("hover");
    return b;
}

function stMuster(st, s, d, me, pl) {
    const c = card("THE MUSTER", "Choose your role", "Every role changes how you play. Two sailors may share a role.", "muster");
    const grid = mk("div", "vy-roles");
    ROLE_KEYS.forEach(k => {
        const R = ROLES[k], b = mk("button", "vy-role" + (pl.cls === k ? " mine" : "")); b.style.setProperty("--rc", R.c);
        b.append(mk("span", "vy-role-k", R.k), mk("b", null, R.n), mk("small", null, R.d), mk("em", null, R.tip));
        const who = mk("div", "vy-voters"); L.live(s).filter(p => L.P(s, p).cls === k).forEach(p => who.appendChild(avatarEl(C.pPub(d, p), { size: 22 }))); b.appendChild(who);
        b.disabled = !!pl.cls;
        b.onclick = () => { sfx("ready"); act({ t: "role", c: k }); };
        grid.appendChild(b);
    });
    c.appendChild(grid);
    if (pl.cls) c.appendChild(mk("p", "vy-p ok", "You are the " + ROLES[pl.cls].n + ". Waiting for the others…"));
    const wait = mk("div", "vy-wait");
    L.live(s).forEach(p => { const ch = mk("span", "vy-wchip" + (L.P(s, p).cls ? " done" : " pend")); ch.appendChild(avatarEl(C.pPub(d, p), { size: 22 })); ch.appendChild(mk("b", null, p === me ? "You" : L.nm(s, p))); ch.appendChild(mk("i", null, L.P(s, p).cls ? ROLES[L.P(s, p).cls].k : "…")); wait.appendChild(ch); });
    c.appendChild(wait);
    st.appendChild(c);
    st.appendChild(ordersCard(s, me, true));
}

function stRoute(st, s, d, me, pl) {
    const opts = L.options(s), w = L.voteWeight(s, me);
    const c = card("LEG " + (s.leg + 1) + " · " + (s.reg[s.leg] || "OPEN SEA").toUpperCase(), "Choose the route", "Tap a destination (on the chart or below). Majority wins. " + (s.helm === me ? "You hold the helm: you break ties." : L.nm(s, s.helm) + " holds the helm and breaks ties.") + (w > 1 ? " Your vote counts ×" + w + "." : ""), "route");
    const grid = mk("div", "vy-routes");
    opts.forEach(id => {
        const n = L.nodeAt(s, id), T = NODE[n.t], fog = fogged(s, n), mineV = s.ch[K(me)] === id;
        const b = mk("button", "vy-route" + (mineV ? " mine" : "")); b.style.setProperty("--nc", T.c);
        b.append(mk("span", "vy-route-k", fog ? "?" : T.k), mk("b", null, fog ? "Uncharted" : T.n), mk("small", null, fog ? "The fog hides what waits here." : T.d));
        if (iAmNav(s) && scoutText(s, n)) b.appendChild(mk("em", "vy-scout", "🔭 " + scoutText(s, n)));
        const ahead = L.options({ map: s.map, node: id }).map(j => L.nodeAt(s, j));
        if (ahead.length) b.appendChild(mk("span", "vy-route-next", "then → " + ahead.map(x => fogged(s, x) ? "?" : NODE[x.t].k).join(" ")));
        b.appendChild(voterRow(s, d, v => v === id));
        b.onclick = () => voteRoute(id);
        grid.appendChild(b);
    });
    c.appendChild(grid);
    c.appendChild(mk("p", "vy-hint", "Calm waters: use relics, give, trade or steal from your satchel before everyone votes."));
    st.appendChild(c);
}
function voteRoute(id) {
    if (!S || S.phase !== "route") return;
    sfx("vote");
    act({ t: "choose", v: id }, "");
}

function stBattle(st, s, d, me, pl) {
    const e = s.enc, en = e.en, boss = e.k === "boss", elite = e.k === "elite";
    const c = card(boss ? "FINAL BOSS" : elite ? "ELITE FOE" : "BATTLE · ROUND " + e.rd, null, null, "battle" + (boss ? " boss" : ""));
    const foe = mk("div", "vy-foe" + (boss ? " boss" : elite ? " elite" : "")); foe.id = "vyFoe";
    const seal = mk("div", "vy-seal"); seal.appendChild(mk("span", null, en.k));
    const info = mk("div", "vy-foe-info");
    info.appendChild(mk("h2", "vy-h", en.n));
    const hp = mk("div", "vy-hpbar big"), fill = mk("i"); fill.style.width = (100 * en.hp / en.mx) + "%"; hp.appendChild(fill); hp.appendChild(mk("span", null, en.hp + " / " + en.mx));
    info.appendChild(hp);
    const atk = en.atk + (boss ? Math.floor((e.rd - 1) / 2) : 0);
    info.appendChild(mk("p", "vy-foe-stats", "⚔ hits for " + atk + (boss ? " · enrages every 2nd round · round " + e.rd : " · flees after round 5") + (en.gold ? " · 💰 " + en.gold + " spoils" : "")));
    foe.append(seal, info); c.appendChild(foe);
    const mineC = s.ch[K(me)];
    if (pl.dn) c.appendChild(mk("p", "vy-p bad", "You're down. A crewmate can revive you with a Healing Bean or a Medic's touch, or you'll get back up at a shrine."));
    else if (mineC) {
        const lab = { atk: "ATTACK", grd: "GUARD", hold: "HOLD BACK" }[mineC.a];
        c.appendChild(mk("p", "vy-p ok", "Locked in: " + lab + (mineC.u ? " + " + ITEMS[mineC.u].n : "") + ". Choices are revealed together."));
    } else {
        const dmg = 3 + atkBonusFor(s, me);
        const grid = mk("div", "vy-actions3");
        grid.append(
            bigBtn("⚔ Attack", "Deal " + dmg + "–" + (dmg + 2) + (L.has(s, me, "mask") ? " · costs 1 HP" : ""), "atk", () => battle("atk")),
            bigBtn("🛡 Guard", "Shield the crew by " + grdFor(s, me) + ", take half damage", "grd", () => battle("grd")),
            bigBtn("💨 Hold back", boss ? "Half damage, no glory" : "Take no damage, no spoils", "hold", () => battle("hold")));
        c.appendChild(grid);
        const usable = ["bomb", "smoke"].filter(k => pl.it.includes(k));
        if (usable.length) {
            const row = mk("div", "vy-itemrow"); row.appendChild(mk("small", null, "Add a relic this round:"));
            usable.forEach(k => { const b = mk("button", "vy-ichip" + (battleItem === k ? " on" : ""), ITEMS[k].k + " " + ITEMS[k].n); b.title = ITEMS[k].d; b.onclick = () => { battleItem = battleItem === k ? null : k; sfx("toggle"); rerender(); }; row.appendChild(b); });
            c.appendChild(row);
        }
    }
    st.appendChild(c);
}
function atkBonusFor(s, p) { const pl = L.P(s, p); return pl.it.reduce((a, k) => a + (ITEMS[k].atk || 0), 0) + (pl.cls === "blade" ? 2 : 0) + (pl.pow || 0); }
function grdFor(s, p) { const pl = L.P(s, p); return pl.it.reduce((a, k) => a + (ITEMS[k].grd || 0), 0) + (pl.cls === "shield" ? 3 : 1); }
function battle(a) {
    const u = battleItem && S && S.pl[K(C.me())].it.includes(battleItem) ? battleItem : null;
    battleItem = null;
    sfx(a === "atk" ? "slash" : a === "grd" ? "clap" : "whoosh");
    act({ t: "choose", v: u ? { a, u } : { a } });
}

function stEvent(st, s, d, me, pl) {
    const ev = EVENTS.find(e => e.id === s.enc.q); if (!ev) return;
    const c = card(ev.mode === "crew" ? "CREW DECISION · MAJORITY RULES" : "YOUR OWN CHOICE", null, null, "event");
    const top = mk("div", "vy-evtop"); const seal = mk("div", "vy-seal ev"); seal.appendChild(mk("span", null, ev.k));
    const tx = mk("div"); tx.append(mk("h2", "vy-h", ev.t), mk("p", "vy-p", ev.x)); top.append(seal, tx); c.appendChild(top);
    const mineC = s.ch[K(me)], grid = mk("div", "vy-opts");
    ev.o.forEach((o, i) => {
        const poor = ev.mode === "solo" && o.fx.need && pl.g < o.fx.need;
        const b = bigBtn(o.l, o.d + (poor ? " (not enough gold)" : ""), mineC === i ? "mine" : "", () => act({ t: "choose", v: i }), mineC != null || poor);
        if (ev.mode === "crew") b.appendChild(voterRow(s, d, v => v === i));
        grid.appendChild(b);
    });
    c.appendChild(grid);
    st.appendChild(c);
}
function stChest(st, s, d, me, pl) {
    const e = s.enc, c = card("TREASURE · SHARE OR GRAB", "A chest for the crew", "Everyone chooses in secret. All share: split it fairly. Exactly one grabs: they take everything. Two or more grab: it explodes in their hands.", "chest");
    const ch = mk("div", "vy-chest"); ch.append(mk("div", "vy-chest-box"), mk("div", "vy-chest-loot", "💰 " + e.g + " gold · " + e.it.map(k => ITEMS[k].k + " " + ITEMS[k].n).join(" · ")));
    c.appendChild(ch);
    const mineC = s.ch[K(me)];
    if (mineC) c.appendChild(mk("p", "vy-p ok", "You chose to " + (mineC === "grab" ? "GRAB IT ALL" : "SHARE") + ". Waiting for the reveal…"));
    else { const g = mk("div", "vy-actions3 two"); g.append(bigBtn("🤝 Share", "Fair split for everyone", "grd", () => act({ t: "choose", v: "share" })), bigBtn("✊ Grab it all", "Greed, if you're the only one", "atk", () => act({ t: "choose", v: "grab" }))); c.appendChild(g); }
    st.appendChild(c);
}
function stMarket(st, s, d, me, pl) {
    const c = card("FLOATING MARKET", "Spend your gold", "You have 💰 " + pl.g + ". One purchase per market." + (pl.cls === "merchant" ? " Merchant discount: 30% off." : ""), "market");
    const mineC = s.ch[K(me)], grid = mk("div", "vy-shop");
    s.enc.shop.forEach(k => {
        const I = ITEMS[k], cost = L.price(s, me, k), can = pl.g >= cost && pl.it.length < MAX_ITEMS;
        const b = mk("button", "vy-item big" + (mineC === k ? " mine" : ""));
        b.append(mk("span", "vy-item-k", I.k), mk("b", null, I.n), mk("small", null, I.d), mk("em", null, "💰 " + cost + " · ★ " + I.v));
        b.disabled = mineC != null || !can; b.onclick = () => { sfx("coin"); act({ t: "choose", v: k }); };
        grid.appendChild(b);
    });
    c.appendChild(grid);
    if (mineC == null) { const p = mk("div", "vy-actions3 one"); p.appendChild(bigBtn("Pass", "Keep your gold", "hold", () => act({ t: "choose", v: "pass" }))); c.appendChild(p); }
    else c.appendChild(mk("p", "vy-p ok", mineC === "pass" ? "You're keeping your gold." : "Bought: " + ITEMS[mineC].n + " (paid when everyone is done)."));
    st.appendChild(c);
}
function stShrine(st, s, d, me, pl) {
    const c = card("SHRINE", "A moment of peace", "Rest to heal (and get back up if you're down), or pray for a vision of a crewmate's hidden objective.", "shrine");
    const mineC = s.ch[K(me)];
    if (mineC) c.appendChild(mk("p", "vy-p ok", mineC === "rest" ? "You rest by the lanterns." : "You kneel and pray…"));
    else { const g = mk("div", "vy-actions3 two"); g.append(bigBtn("🍵 Rest", "+" + (5 + (pl.cls === "medic" ? 3 : 0)) + " HP" + (pl.dn ? " · get back up" : ""), "grd", () => act({ t: "choose", v: "rest" })), bigBtn("🙏 Pray", "Learn a secret · +1 HP", "atk", () => act({ t: "choose", v: "pray" }))); c.appendChild(g); }
    st.appendChild(c);
}
function stCamp(st, s, d, me, pl) {
    const c = card("THE LAST NIGHT", "Is there a mutineer aboard?", "Accuse one crewmate in secret, or trust everyone. If a majority accuses the real mutineer, their plot fails and each accuser earns +3 renown. Accuse an innocent: accusers lose 2, the accused gains 2. There may be no mutineer at all.", "camp");
    c.appendChild(mk("div", "vy-fire"));
    const mineC = s.ch[K(me)], grid = mk("div", "vy-accuse");
    L.live(s).filter(p => p !== me).forEach(p => {
        const b = mk("button", "vy-suspect" + (Number(mineC) === p ? " mine" : ""));
        b.appendChild(avatarEl(C.pPub(d, p), { size: 54, badge: true })); b.appendChild(mk("b", null, L.nm(s, p))); b.appendChild(mk("small", null, ROLES[L.P(s, p).cls] ? ROLES[L.P(s, p).cls].n : ""));
        if (L.knows(s, me, p)) b.appendChild(mk("em", "vy-intel", "👁 " + OBJECTIVES[L.P(s, p).obj].n));
        b.onclick = () => { sfx("vote"); act({ t: "choose", v: p }, ""); };
        grid.appendChild(b);
    });
    const trust = mk("button", "vy-suspect trust" + (mineC === 0 ? " mine" : "")); trust.append(mk("span", "vy-trust-k", "信"), mk("b", null, "Trust everyone"));
    trust.onclick = () => { sfx("vote"); act({ t: "choose", v: 0 }, ""); };
    grid.appendChild(trust);
    c.appendChild(grid);
    if (mineC != null) c.appendChild(mk("p", "vy-p ok", "Your choice is sealed (you can change it until everyone has chosen)."));
    st.appendChild(c);
}
function stOver(st, s, d) {
    const c = card(s.out && s.out.fail ? "SHIPWRECK" : "THE TREASURE IS FOUND", "The Reckoning", "Hidden objectives are revealed…", "over");
    st.appendChild(c);
}

/* ---------------- crew + satchel + log ---------------- */
function renderCrew(s, d) {
    const box = $("vyCrew"); box.innerHTML = "";
    box.appendChild(mk("h3", "vy-side-h", "Crew"));
    const pres = d.presence || {}, me = C.me(), need = new Set(L.need(s));
    s.seats.forEach(p => {
        const pl = s.pl[K(p)], R = ROLES[pl.cls];
        const row = mk("div", "vy-mate" + (p === me ? " me" : "") + (pl.dn ? " down" : "") + (pl.gone ? " gone" : "") + (pres[K(p)] === false ? " away" : "") + (need.has(p) ? " pend" : ""));
        row.dataset.emote = K(p); row.dataset.p = p;
        row.style.setProperty("--pc", (d["player" + p] || {}).col || "#3ee6c8");
        row.appendChild(avatarEl(C.pPub(d, p), { size: 42, badge: true }));
        const id = mk("div", "vy-mate-id");
        const nm = mk("b", null, L.nm(s, p)); if (s.helm === p && s.phase !== "over") nm.appendChild(mk("span", "vy-helm", " ⎈")); id.appendChild(nm);
        id.appendChild(mk("small", null, (R ? R.k + " " + R.n : "choosing a role…") + (pl.gone ? " · left" : pres[K(p)] === false ? " · away" : "")));
        const hp = mk("div", "vy-hpbar"), f = mk("i"); f.style.width = (100 * pl.hp / Math.max(1, pl.mx)) + "%"; hp.appendChild(f); hp.appendChild(mk("span", null, pl.dn ? "DOWN" : pl.hp + "/" + pl.mx));
        id.appendChild(hp);
        row.appendChild(id);
        const st = mk("div", "vy-mate-st");
        st.append(mk("span", null, "💰" + pl.g), mk("span", null, "🎒" + pl.it.length));
        if (p !== me && L.knows(s, me, p)) { const k = mk("span", "vy-intel", "👁"); k.title = "You know their objective: " + OBJECTIVES[pl.obj].n; st.appendChild(k); }
        row.appendChild(st);
        if (p !== me && pl.it.length) row.title = "Relics: " + pl.it.map(k => ITEMS[k].n).join(", ");
        box.appendChild(row);
    });
}
function objText(s, p) {
    const pl = L.P(s, p), O = OBJECTIVES[pl.obj];
    return O.d.replace("{nav}", L.navGoal(s)).replace("{rival}", pl.rv ? L.nm(s, pl.rv) : "your rival");
}
function objProgress(s, p) {
    const pl = L.P(s, p);
    switch (pl.obj) {
        case "hoard": return "💰 " + pl.g + " / 14";
        case "collector": return "🎒 " + pl.it.length + " / 4";
        case "guardian": return "🛡 " + pl.grd + " / 5";
        case "thief": return "🗝 " + pl.stole + " / 2 · " + pl.st + " steal" + (pl.st === 1 ? "" : "s") + " left";
        case "pathfinder": return "🧭 " + pl.navw + " / " + L.navGoal(s);
        case "heart": return "💝 " + pl.gave + " / 6 gold · " + pl.gaveIt + " / 2 relics";
        case "pacifist": return pl.atk ? "✗ broken" : "✓ clean so far";
        case "survivor": return pl.downs ? "✗ broken" : "✓ unbroken so far";
        case "vanguard": return "⚔ " + pl.dmg + " damage dealt";
        case "rival": return "Renown now: you " + L.baseRenown(s, p, false) + " · them " + L.baseRenown(s, pl.rv, false);
        case "traitor": return "Stay hidden. Let the crew fall.";
    }
    return "";
}
function ordersCard(s, me, big) {
    const pl = L.P(s, me), O = OBJECTIVES[pl.obj];
    const c = mk("button", "vy-orders" + (seen.peek ? " open" : "") + (O.evil ? " evil" : "") + (big ? " big" : ""));
    c.setAttribute("aria-pressed", String(seen.peek));
    const front = mk("div", "vy-orders-front"); front.append(mk("span", "vy-orders-k", "秘"), mk("b", null, "Secret orders"), mk("small", null, "Tap to read. Keep your screen hidden."));
    const back = mk("div", "vy-orders-back"); back.append(mk("span", "vy-orders-k", O.k), mk("b", null, O.n + " · +" + O.g + " renown"), mk("small", null, objText(s, me)), mk("em", null, objProgress(s, me)));
    c.append(front, back);
    c.onclick = () => { seen.peek = !seen.peek; sfx(seen.peek ? "reveal" : "close"); rerender(); };
    return c;
}
const calm = s => !["muster", "battle", "over"].includes(s.phase);
function renderMe(s, d, pl) {
    const box = $("vyMe"); box.innerHTML = "";
    const me = C.me(); if (!pl) return;
    box.appendChild(mk("h3", "vy-side-h", "Your satchel"));
    const stats = mk("div", "vy-mystats");
    stats.append(mk("span", null, "❤ " + (pl.dn ? "DOWN" : pl.hp + "/" + pl.mx)), mk("span", null, "💰 " + pl.g), mk("span", null, "⚔ +" + atkBonusFor(s, me)), mk("span", null, "🗝 " + pl.st), mk("span", null, "★ " + L.baseRenown(s, me, false)));
    stats.title = "HP · gold · bonus damage · steals left · renown so far";
    box.appendChild(stats);
    if (s.phase !== "muster") box.appendChild(ordersCard(s, me, false));
    // relics
    const rel = mk("div", "vy-relics");
    if (!pl.it.length) rel.appendChild(mk("p", "vy-hint", "No relics yet."));
    pl.it.forEach(k => {
        const I = ITEMS[k], r = mk("div", "vy-item"); r.title = I.d;
        r.append(mk("span", "vy-item-k", I.k), mk("b", null, I.n), mk("small", null, I.d));
        if (I.c === "map") { const u = mk("button", "chip-btn", "Use"); u.disabled = !calm(s) || pl.dn; u.onclick = () => useDlg(k); r.appendChild(u); }
        else if (I.c === "battle") r.appendChild(mk("em", null, "battle"));
        rel.appendChild(r);
    });
    box.appendChild(rel);
    // actions
    const acts = mk("div", "vy-myacts"), others = L.live(s).filter(p => p !== me), ok = calm(s);
    const add = (label, f, dis, tip) => { const b = mk("button", "pop secondary", label); b.disabled = !!dis; if (tip) b.title = tip; b.onclick = f; acts.appendChild(b); };
    add("🎁 Give", giveDlg, !ok || !others.length || (!pl.g && !pl.it.length), "Give gold or a relic to a crewmate");
    add("🤝 Trade", tradeDlg, !ok || !others.length, "Offer a deal: they must accept");
    add("🗝 Steal (" + pl.st + ")", stealDlg, !ok || !others.length || pl.st <= 0 || pl.dn, "Take 3 gold or a random relic. You might be seen (" + Math.round(L.stealExposure(s, me) * 100) + "%).");
    if (pl.cls === "medic") add("✚ Heal (" + pl.heal + ")", healDlg, !ok || pl.heal <= 0 || pl.dn, "Heal a crewmate for 4, or revive them");
    box.appendChild(acts);
    if (!ok && s.phase !== "over") box.appendChild(mk("p", "vy-hint", s.phase === "battle" ? "No trading in the middle of a fight." : "Free actions open once the voyage starts."));
    // offers
    const offs = Object.entries(s.offers).filter(([, o]) => o.to === me || o.f === me);
    if (offs.length) {
        const ob = mk("div", "vy-offers"); ob.appendChild(mk("h4", null, "Trade offers"));
        offs.forEach(([id, o]) => {
            const r = mk("div", "vy-offer" + (o.to === me ? " in" : " out"));
            const give = [o.gg ? o.gg + " gold" : "", o.gi ? ITEMS[o.gi].n : ""].filter(Boolean).join(" + "), want = [o.wg ? o.wg + " gold" : "", o.wi ? ITEMS[o.wi].n : ""].filter(Boolean).join(" + ");
            r.appendChild(mk("p", null, o.to === me ? L.nm(s, o.f) + " gives you " + give + " for your " + want + "." : "To " + L.nm(s, o.to) + ": your " + give + " for their " + want + "."));
            const bt = mk("div", "vy-offer-btns");
            if (o.to === me) { const a = mk("button", "chip-btn ok", "Accept"); a.disabled = !ok; a.onclick = () => { sfx("coin"); act({ t: "accept", id }); }; const n = mk("button", "chip-btn", "Decline"); n.onclick = () => act({ t: "decline", id }); bt.append(a, n); }
            else { const x = mk("button", "chip-btn", "Cancel"); x.onclick = () => act({ t: "cancel", id }); bt.appendChild(x); }
            r.appendChild(bt); ob.appendChild(r);
        });
        box.appendChild(ob);
    }
    // intel
    const known = s.seats.filter(q => q !== me && L.knows(s, me, q));
    if (known.length) {
        const ib = mk("div", "vy-known"); ib.appendChild(mk("h4", null, "Secrets you know"));
        known.forEach(q => { const O = OBJECTIVES[L.P(s, q).obj]; ib.appendChild(mk("p", O.evil ? "evil" : null, "👁 " + L.nm(s, q) + ": " + O.k + " " + O.n)); });
        box.appendChild(ib);
    }
}
function renderLog(s) {
    const box = $("vyLog"); box.innerHTML = "";
    box.appendChild(mk("h3", "vy-side-h", "Captain's log"));
    const ul = mk("ol", "vy-loglist");
    s.log.slice(-14).reverse().forEach(e => ul.appendChild(mk("li", "c-" + (e.c || "story"), e.t)));
    box.appendChild(ul);
}

/* ---------------- dialogs (give / trade / steal / use / heal) ---------------- */
function openDlg(title, sub, body) {
    const dlg = $("vyDlg"); dlg.innerHTML = "";
    const w = mk("div", "vy-dlg-in"); w.append(mk("div", "vy-kick", sub || ""), mk("h2", "vy-h", title), body);
    const x = mk("button", "pop ghost vy-dlg-x", "Cancel"); x.onclick = closeDlg; w.appendChild(x);
    dlg.appendChild(w); dlg.classList.remove("hidden"); sfx("open");
    setTimeout(() => { const f = dlg.querySelector("button:not(:disabled)"); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }, 30);
}
function closeDlg() { const dlg = $("vyDlg"); if (dlg && !dlg.classList.contains("hidden")) { dlg.classList.add("hidden"); dlg.innerHTML = ""; } }
function targets(filter, onPick) {
    const g = mk("div", "vy-targets");
    L.live(S).filter(filter).forEach(p => {
        const b = mk("button", "vy-suspect");
        b.appendChild(avatarEl(C.pPub(D, p), { size: 46, badge: true })); b.appendChild(mk("b", null, p === C.me() ? "Yourself" : L.nm(S, p)));
        const pl = L.P(S, p); b.appendChild(mk("small", null, (pl.dn ? "DOWN" : "❤ " + pl.hp + "/" + pl.mx) + " · 💰 " + pl.g + " · 🎒 " + pl.it.length));
        b.onclick = () => { sfx("pick"); onPick(p); };
        g.appendChild(b);
    });
    return g;
}
function stepper(label, max, val) {
    const w = mk("div", "vy-step"), v = mk("output", null, String(val || 0));
    let n = val || 0;
    const m = mk("button", "chip-btn", "−"), p = mk("button", "chip-btn", "+");
    m.onclick = () => { n = Math.max(0, n - 1); v.textContent = n; sfx("tick"); }; p.onclick = () => { n = Math.min(max, n + 1); v.textContent = n; sfx("tick"); };
    w.append(mk("span", null, label), m, v, p);
    w.get = () => n;
    return w;
}
function itemPick(label, list, allowNone) {
    const w = mk("div", "vy-ipick"); w.appendChild(mk("span", null, label));
    let sel = allowNone ? "" : (list[0] || "");
    const row = mk("div", "vy-ipick-row");
    const opts = (allowNone ? [""] : []).concat(list);
    const paint = () => row.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.k === sel));
    opts.forEach(k => { const b = mk("button", "vy-ichip", k ? ITEMS[k].k + " " + ITEMS[k].n : "Nothing"); b.dataset.k = k; b.onclick = () => { sel = k; sfx("toggle"); paint(); }; row.appendChild(b); });
    paint(); w.appendChild(row); w.get = () => sel;
    return w;
}
function giveDlg() {
    const me = C.me();
    openDlg("Give a gift", "GENEROSITY", targets(p => p !== me, to => {
        const pl = L.P(S, me), body = mk("div", "vy-form");
        const g = stepper("Gold", pl.g, Math.min(2, pl.g)), it = itemPick("Relic", pl.it, true);
        const go = mk("button", "btn", "Give to " + L.nm(S, to));
        go.onclick = () => { const gg = g.get(), ii = it.get(); if (!gg && !ii) { C.toast("Pick some gold or a relic."); return; } closeDlg(); sfx("coin"); act({ t: "give", to, g: gg, it: ii || null }); };
        body.append(g, it, go);
        openDlg("Gift for " + L.nm(S, to), "GENEROSITY", body);
    }));
}
function tradeDlg() {
    const me = C.me();
    openDlg("Propose a trade", "DEAL", targets(p => p !== me, to => {
        const pl = L.P(S, me), tl = L.P(S, to), body = mk("div", "vy-form");
        body.appendChild(mk("h4", null, "You give"));
        const gg = stepper("Gold", pl.g, 0), gi = itemPick("Relic", pl.it, true);
        body.append(gg, gi, mk("h4", null, "You want from " + L.nm(S, to)));
        const wg = stepper("Gold", Math.max(0, tl.g), 0), wi = itemPick("Their relic", tl.it, true);
        const go = mk("button", "btn", "Send offer");
        go.onclick = () => {
            const o = { t: "offer", to, gg: gg.get(), gi: gi.get(), wg: wg.get(), wi: wi.get() };
            if (!o.gg && !o.gi) { C.toast("Offer something."); return; }
            if (!o.wg && !o.wi) { C.toast("Ask for something in return (or use Give)."); return; }
            closeDlg(); sfx("pick"); act(o, "That offer isn't possible right now.");
        };
        body.append(wg, wi, go);
        openDlg("Trade with " + L.nm(S, to), "DEAL", body);
    }));
}
function stealDlg() {
    const me = C.me(), risk = Math.round(L.stealExposure(S, me) * 100);
    openDlg("Steal from…", "THIEVERY · " + risk + "% CHANCE TO BE SEEN", targets(p => p !== me, to => {
        const body = mk("div", "vy-form"), tl = L.P(S, to);
        body.appendChild(mk("p", "vy-p", "Lockboxes stop thieves cold. If you're seen, everyone knows."));
        const b1 = mk("button", "btn", "Lift up to 3 gold (" + tl.g + ")"); b1.disabled = !tl.g && !tl.it.length;
        const b2 = mk("button", "btn alt", "Snatch a random relic (" + tl.it.length + ")"); b2.disabled = !tl.it.length && !tl.g;
        b1.onclick = () => { closeDlg(); sfx("whoosh"); act({ t: "steal", to, w: "g" }, "Nothing to steal there."); };
        b2.onclick = () => { closeDlg(); sfx("whoosh"); act({ t: "steal", to, w: "it" }, "Nothing to steal there."); };
        body.append(b1, b2);
        openDlg("Rob " + L.nm(S, to) + "?", "THIEVERY · " + risk + "% CHANCE TO BE SEEN", body);
    }));
}
function useDlg(k) {
    const me = C.me(), I = ITEMS[k];
    if (k === "elixir") { sfx("heal"); act({ t: "use", it: k, to: me }); return; }
    if (k === "potion") { openDlg("Use " + I.n, "HEAL OR REVIVE", targets(p => { const pl = L.P(S, p); return pl.dn || pl.hp < pl.mx; }, to => { closeDlg(); sfx("heal"); act({ t: "use", it: k, to }); })); return; }
    if (k === "spyglass") { openDlg("Spy on…", "SPYGLASS", targets(p => p !== me && !L.knows(S, me, p), to => { closeDlg(); sfx("reveal"); act({ t: "use", it: k, to }); })); }
}
function healDlg() {
    const me = C.me();
    openDlg("Heal a crewmate", "MEDIC", targets(p => { const pl = L.P(S, p); return p !== me && (pl.dn || pl.hp < pl.mx); }, to => { closeDlg(); sfx("heal"); act({ t: "heal", to }); }));
}

/* ---------------- private notes -> toasts ---------------- */
function notesNew(s) {
    const mine = arr(s.notes[K(C.me())]), top = mine.length ? mine[mine.length - 1].n : -1;
    if (seen.first || seen.note < 0) { seen.note = top; return; }
    mine.filter(x => x.n > seen.note).forEach((x, i) => later(i * 900, () => C.toast(x.t)));
    seen.note = Math.max(seen.note, top);
}

/* =====================================================================
   CINEMATICS (driven by s.fx, each one short and skippable)
   ===================================================================== */
function playNew(s) {
    const fresh = s.fx.filter(e => e.id > seen.eid);
    if (s.fx.length) seen.eid = Math.max(seen.eid, s.fx[s.fx.length - 1].id);
    if (seen.first) return;
    fresh.forEach(e => queue.push(() => beat(s, e)));
    pump();
}
function pump() {
    if (running) return;
    const f = queue.shift(); if (!f) { pace = 1; return; }
    running = true;
    pace = queue.length >= 2 ? .4 : queue.length === 1 ? .7 : 1;     // fall behind -> catch up faster
    let ms = 0; try { ms = f() || 0; } catch (e) { console.warn(e); }
    later(ms, () => { running = false; pump(); });
}
function plateRect(p) { const r = document.querySelector('#vyCrew .vy-mate[data-p="' + p + '"]'); return r ? r.getBoundingClientRect() : null; }
function popAt(p, text, color) { const r = plateRect(p); if (r && r.width) burstText(text, r.left + r.width * .62, r.top + r.height / 2, color, "vy-burst"); }
function pop(cls, build, ms) {
    const fx = $("vyFx"); const w = mk("div", "vy-pop " + (cls || "")); build(w);
    w.onclick = () => w.remove();
    fx.appendChild(w); requestAnimationFrame(() => w.classList.add("in"));
    later(ms, () => { w.classList.add("out"); later(380, () => w.remove()); });
}
function beat(s, e) {
    const me = C.me();
    switch (e.k) {
        case "setsail": sfx("start"); titleCard({ kicker: "GRAND VOYAGE", title: "ANCHORS UP", sub: "Next stop: " + (s.reg[0] || "the open sea"), kanji: "航", color: "#3ee6c8", ms: 1500 }); return 1600;
        case "sail": {
            const n = L.nodeAt(s, e.to), T = NODE[n.t];
            sailShip(s, e.from, e.to); sfx("sail");
            later(700, () => { sfx(n.t === "boss" ? "rumble" : "whoosh"); titleCard({ kicker: n.t === "boss" ? "THE FINAL LAIR" : (s.reg[n.l - 1] || "OPEN SEA").toUpperCase(), title: (n.e ? n.e.n : T.n).toUpperCase(), sub: n.t === "boss" ? "Win this and the treasure is yours." : T.d || "", kanji: n.e ? n.e.k : T.k, color: T.c, ms: n.t === "boss" ? 2000 : 1300 }); });
            return n.t === "boss" ? 2900 : 2200;
        }
        case "round": return battleBeat(s, e);
        case "event": {
            const ev = EVENTS.find(x => x.id === e.q); if (!ev) return 0;
            const lines = s.log.filter(x => x.n === e.n && x.c === "story").map(x => x.t);
            sfx(e.fail ? "strike" : "reveal");
            pop("event" + (e.fail ? " bad" : ""), w => { w.append(mk("div", "vy-pop-k", ev.k), mk("small", null, ev.mode === "crew" ? "THE CREW DECIDED" : "FATES SEALED"), mk("b", null, ev.mode === "crew" ? ev.o[e.pick].l : ev.t)); lines.slice(-1).forEach(t => w.appendChild(mk("p", null, t))); }, 2600);
            return 2700;
        }
        case "chest": {
            const label = { share: "SHARED!", steal: "STOLEN!", curse: "CURSED!" }[e.out], col = { share: "#5ee6a8", steal: "#ffd166", curse: "#ff5a5a" }[e.out];
            sfx("drum"); later(500, () => sfx(e.out === "share" ? "chime" : e.out === "steal" ? "heavy" : "boom"));
            const grab = arr(e.grab);
            pop("chest " + e.out, w => { w.style.setProperty("--pc", col); w.append(mk("div", "vy-pop-k", "宝"), mk("b", "vy-stamp", label)); w.appendChild(mk("p", null, e.out === "share" ? "Everyone shared. A fair split." : e.out === "steal" ? L.nm(s, grab[0]) + " grabbed everything!" : grab.map(p => L.nm(s, p)).join(" and ") + " both grabbed. Boom.")); }, 2600);
            if (e.out === "curse") later(700, () => grab.forEach(p => popAt(p, "−3", "#ff5a5a")));
            return 2700;
        }
        case "market": { Object.keys(e.res || {}).forEach(k => popAt(Number(k.slice(1)), ITEMS[e.res[k]].k, "#5ee6a8")); sfx("coin"); return 500; }
        case "shrine": { Object.keys(e.res || {}).forEach(k => popAt(Number(k.slice(1)), e.res[k] === "pray" ? "🙏" : e.res[k] === "revive" ? "REVIVED" : "+HP", "#7ff6e6")); sfx("chime"); return 700; }
        case "camp": {
            sfx("heartbeat"); later(900, () => sfx(e.top ? (e.guilty ? "impact" : "strike") : "wind"));
            pop("camp " + (e.top ? (e.guilty ? "guilty" : "innocent") : "none"), w => {
                w.append(mk("div", "vy-pop-k", e.top ? (e.guilty ? "叛" : "冤") : "疑"), mk("small", null, "THE CAMPFIRE VERDICT"));
                w.appendChild(mk("b", null, e.top ? L.nm(s, e.top) + (e.guilty ? " WAS THE MUTINEER!" : " IS INNOCENT") : "NO MAJORITY"));
                const tally = mk("div", "vy-tally");
                L.live(s).forEach(p => { const v = Number((e.votes || {})[K(p)]) || 0; tally.appendChild(mk("span", null, L.nm(s, p) + " → " + (v ? L.nm(s, v) : "trust"))); });
                w.appendChild(tally);
            }, 4200);
            return 4300;
        }
        case "steal": {
            sfx("whoosh"); if (!e.fail) later(250, () => sfx(e.exp ? "strike" : "skip2"));
            const fx = $("vyFx"), sh = mk("div", "vy-shadow"); fx.appendChild(sh); later(1200, () => sh.remove());
            if (e.to === me && !e.fail) { const r = document.querySelector('#vyCrew .vy-mate[data-p="' + me + '"]'); shake(r, 8, 400); }
            if (e.exp) popAt(e.by, "THIEF!", "#ff5a5a");
            return 900;
        }
        case "give": popAt(e.to, e.g ? "+" + e.g + "💰" : "🎁", "#ffd166"); sfx("coin"); return 300;
        case "trade": popAt(e.f, "🤝", "#ffd166"); popAt(e.to, "🤝", "#ffd166"); sfx("pick"); return 300;
        case "heal": popAt(e.to, e.rv ? "REVIVED" : "+HP", "#5ee6a8"); sfx("heal"); return 400;
    }
    return 0;
}
function battleBeat(s, e) {
    const acts = e.acts || {}, ps = Object.keys(acts).map(k => Number(k.slice(1)));
    const me = C.me(), dl = motionOK();
    const lab = { atk: "⚔", grd: "🛡", hold: "💨" };
    pop("clash" + (e.boss ? " boss" : "") + (e.hp1 <= 0 ? " kill" : ""), w => {
        const top = mk("div", "vy-clash-top");
        top.append(mk("span", "vy-clash-k", e.ek || "敵"), mk("b", null, e.en));
        const hp = mk("div", "vy-hpbar big"), f = mk("i"); hp.appendChild(f);
        const mx = e.mx || Math.max(e.hp0, 1);
        f.style.width = (100 * e.hp0 / mx) + "%";
        hp.appendChild(mk("span", null, "−" + e.total));
        top.appendChild(hp);
        w.appendChild(top);
        const row = mk("div", "vy-clash-row");
        ps.forEach((p, i) => {
            const a = acts[K(p)], c = mk("div", "vy-clash-p a-" + a.a); c.style.setProperty("--i", i);
            c.appendChild(avatarEl(C.pPub(D, p), { size: 40 }));
            c.appendChild(mk("b", null, (p === me ? "You" : L.nm(s, p))));
            c.appendChild(mk("span", "vy-clash-a", lab[a.a] + " " + (a.d ? a.d : "") + (a.u ? " " + ITEMS[a.u].k : "")));
            if (a.hit) c.appendChild(mk("em", null, "−" + a.hit + " HP"));
            row.appendChild(c);
        });
        w.appendChild(row);
        const msg = e.hp1 <= 0 ? (L.nm(s, e.kill) + " lands the final blow!") : e.flee ? e.en + " escapes into the fog." : arr(e.down).length ? arr(e.down).map(p => L.nm(s, p)).join(", ") + " went down!" : "The foe strikes back!";
        w.appendChild(mk("p", "vy-clash-msg", msg));
        if (e.hp1 <= 0) { w.appendChild(mk("b", "vy-stamp", e.boss ? "VANQUISHED" : "DEFEATED")); const lt = e.loot && e.loot[K(me)]; if (lt) w.appendChild(mk("p", "vy-loot", "Your spoils: " + [lt.g ? "💰 " + lt.g : "", lt.it ? ITEMS[lt.it].k + " " + ITEMS[lt.it].n : ""].filter(Boolean).join(" · "))); }
        later(dl ? 450 : 0, () => { f.style.width = (100 * e.hp1 / mx) + "%"; });
    }, e.hp1 <= 0 ? 3000 : 2300);
    sfx("drum");
    later(380, () => sfx(e.total >= 12 ? "heavy" : "punch"));
    if (e.hp1 > 0 && !e.flee) later(1100, () => { sfx("slash"); ps.forEach(p => { if (acts[K(p)].hit) popAt(p, "−" + acts[K(p)].hit, "#ff5a5a"); }); if (acts[K(me)] && acts[K(me)].hit) shake($("vyStage"), 7, 320); });
    if (arr(e.down).length) later(1400, () => sfx("strike"));
    if (e.hp1 <= 0) { later(900, () => { sfx(e.boss ? "boom" : "impact"); ring(innerWidth / 2, innerHeight * .4, e.boss ? "#ff9f1c" : "#3ee6c8", 700, 800); }); later(1500, () => sfx("coin")); }
    return e.hp1 <= 0 ? 3100 : 2400;
}

/* ---------------- the end: reckoning, then the shared results sequence ---------------- */
function overSeq(s, d) {
    const key = "vy:" + d.matchId;
    if (seen.over === key) return; seen.over = key;
    queue.push(() => reckoning(s, d)); pump();
}
function reckoning(s, d) {
    const out = s.out; if (!out) return 0;
    const order = out.rank.concat(s.seats.filter(p => !out.rank.includes(p)));
    const step = motionOK() ? 650 : 0;
    pop("reckon" + (out.fail ? " fail" : ""), w => {
        w.append(mk("div", "vy-pop-k", out.fail ? "難破" : "宝"), mk("small", null, out.fail ? "SHIPWRECK" : "THE LEGENDARY TREASURE"), mk("b", null, "THE RECKONING"));
        const g = mk("div", "vy-reck");
        order.forEach((p, i) => {
            const r = out.rows[K(p)], O = OBJECTIVES[r.obj], c = mk("div", "vy-reck-c" + (r.done ? " done" : " miss") + (O.evil ? " evil" : "")); c.style.setProperty("--i", i);
            c.append(avatarEl(C.pPub(d, p), { size: 36 }), mk("b", null, L.nm(s, p)), mk("span", "vy-reck-o", O.k + " " + O.n), mk("i", null, r.done ? "✓ +" + O.g : "✗"));
            g.appendChild(c);
            later(step * (i + 1), () => { c.classList.add("flip"); sfx(r.done ? "stamp" : "tick"); });
        });
        w.appendChild(g);
    }, step * (order.length + 2) + 900);
    later(step * (order.length + 2) + 1300, () => finalResults(s, d));
    return step * (order.length + 2) + 1500;
}
function finalResults(s, d) {
    const out = s.out, me = C.me(), mine = out.rows[K(me)], seated = s.seats.includes(me);
    const won = out.win === me, pl = L.P(s, me);
    const ach = [];
    if (seated) { if (won) ach.push("vy_win"); if (mine && mine.done) ach.push(mine.obj === "traitor" ? "vy_mutiny" : "vy_secret"); if (pl.unm) ach.push("vy_unmask"); }
    const prog = seated ? C.recordOnce("vy:" + d.matchId, "vy", won, { ach, bonus: mine && mine.done ? 20 : 0 }) : null;
    const reveal = mk("div", "vy-final-objs");
    out.rank.forEach(p => { const r = out.rows[K(p)], O = OBJECTIVES[r.obj]; const c = mk("div", "vy-fo" + (r.done ? " done" : "") + (O.evil ? " evil" : "")); c.append(mk("b", null, L.nm(s, p)), mk("span", null, O.k + " " + O.n + (r.done ? " ✓" : " ✗")), mk("small", null, r.base + " + " + (r.done ? O.g : 0) + " = " + r.total + " renown")); reveal.appendChild(c); });
    const defeated = s.path.filter(id => ["battle", "elite", "boss"].includes(s.map.nodes[id].t)).length - (out.fail ? 1 : 0);
    showResults({
        outcome: !seated ? "neutral" : won ? "win" : "lose", mode: "vy", color: "#3ee6c8",
        kicker: "GRAND VOYAGE · " + (out.fail ? "SHIPWRECK" : "TREASURE CLAIMED"),
        title: won ? (out.fail ? "LAST ONE STANDING" : "LEGEND OF THE SEAS") : (L.nm(s, out.win) || "?").toUpperCase() + " TAKES THE TREASURE",
        kanji: won ? "伝説" : out.fail ? "難破" : "敗北",
        subtitle: out.fail ? "The crew sank, but someone still came out ahead." : won ? "The Legendary Treasure is yours." : "Renown decides who claims the treasure.",
        podium: out.rank.map(p => ({ player: C.pPub(d, p), score: out.rows[K(p)].total + " ★", label: (out.rows[K(p)].done ? "✓ " : "✗ ") + OBJECTIVES[out.rows[K(p)].obj].n, me: p === me, win: p === out.win })),
        reveal,
        chips: [["LEGS SAILED", s.path.length - 1], ["FOES DEFEATED", Math.max(0, defeated)], ["YOUR GOLD", pl.g], ["YOUR RELICS", pl.it.length], ["DAMAGE DEALT", pl.dmg]],
        progress: prog,
        actions: C.matchActions({ again: C.amHost() ? { label: "⛵ Sail again", fn: () => { closeResults(); vyStart(C.data()); } } : null }),
        note: C.amHost() ? "" : "The host can launch another voyage."
    });
}
