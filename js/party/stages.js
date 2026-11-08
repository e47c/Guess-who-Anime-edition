/* =====================================================================
   NIGHT PARTY · STAGE REGISTRY (pure: no DOM, no Firebase; unit-tested in tools/party-test.mjs)
   A Night Party stage is an existing mode launched with a preset settings object. This file says, for every
   mode that can be a stage:
     - its metadata (players, teams / FFA / 1v1, length, fast), from MODE_META in vault/config.js;
     - its settings schema: exactly the room keys the lobby UI writes for that mode, with their choices and
       defaults (normalizeSettings turns any object into a valid one);
     - its format for given settings: "duel" (1v1 bracket), "ffa" (everyone in one match) or "teams";
     - whether it fits a player count (stageFits), and how a team split is written into the room (teamPatch).
   The room keys and the schema keys are the same ones result.js copies into a result's `settings`.

   Adding a stage later (for example ANIME TCG card duels) = one registerStage(id, meta) call with its
   metadata, settings schema and format; nothing else here changes.
   ===================================================================== */
import { MODE_META } from "../vault/config.js?v=16";
import { FEUD_RULES as R } from "../feud/engine.js?v=5";
import { SK } from "../sketch/engine.js?v=5";
import { NIGHT_PARTY as NP } from "./config.js?v=2";

/* one schema entry: choices (the lobby's buttons) + the default; series = a list of series keys */
const pick = (choices, def) => ({ choices: choices.slice(), def });
const SERIES = { series: true, def: ["onepiece"] };

export const STAGE_SETTINGS = {
    classic:  { animes: SERIES, boardSize: pick([24, 48, 96], 24) },
    headbanz: { animes: SERIES, difficulty: pick(["easy", "normal", "hard"], "normal"), rounds: pick([3, 5, 7, 10], 5) },
    imposter: { animes: SERIES, difficulty: pick(["easy", "normal", "hard"], "normal"), laps: pick([1, 2], 1) },
    uno:      { animes: { series: true, def: ["onepiece", "naruto", "dragonball", "jjk"] }, unoDeck: pick(["classic", "chaos"], "classic"), unoSp: pick(["once", "reuse"], "once") },
    draft:    { animes: SERIES, draftType: pick(["build", "auction"], "build"), draftFmt: pick([1, 2, 3, 4], 1), draftRoles: pick(["auto", "classic"], "auto") },
    feud:     { animes: SERIES, feudRounds: pick(R.roundChoices, R.rounds), feudTimer: pick(R.timerChoices, R.timer) },
    likely:   { animes: SERIES, likelyPlay: pick(["teams", "ffa"], "teams"), likelyRounds: pick(R.likelyRoundChoices, R.likelyRounds), likelyTimer: pick(R.likelyTimerChoices, R.likelyTimer) },
    sketch:   { animes: SERIES, sketchRounds: pick(SK.roundChoices, SK.rounds), sketchTimer: pick(SK.timerChoices, SK.timer), sketchDiff: pick(SK.diffChoices, 0), sketchMode: pick([0, 1], 0) }
};

/* which format a mode plays with these settings */
const FORMAT = {
    classic: () => "duel",
    feud: () => "teams",
    likely: s => s.likelyPlay === "ffa" ? "ffa" : "teams",
    draft: s => s.draftType === "auction" ? "ffa" : "teams"
};

/* team modes: the room key the lobby keeps the split in, and the value each side is written as */
const TEAM_KEYS = { feud: { key: "feudTeams", A: "A", B: "B" }, likely: { key: "likelyTeams", A: "A", B: "B" }, draft: { key: "draftSides", A: "L", B: "R" } };

/* ---------- the registry ---------- */
const REG = new Map();
export function registerStage(id, meta) {
    const need = ["name", "min", "max", "length", "settings"];
    const miss = need.filter(k => meta[k] == null);
    if (miss.length) throw new Error("registerStage(" + id + "): missing " + miss.join(", "));
    if (!["short", "medium", "long"].includes(meta.length)) throw new Error("registerStage(" + id + "): length must be short, medium or long");
    REG.set(id, Object.freeze(Object.assign({ id, teams: false, ffa: false, oneVone: false, fast: false, format: null, teamKeys: null }, meta)));
    return REG.get(id);
}
Object.entries(MODE_META).forEach(([id, m]) => {
    if (m.stage === false || !STAGE_SETTINGS[id]) return;
    registerStage(id, Object.assign({}, m, { settings: STAGE_SETTINGS[id], format: FORMAT[id] || null, teamKeys: TEAM_KEYS[id] || null }));
});
export const stageIds = () => [...REG.keys()];
export const stageMeta = id => REG.get(id) || null;
export const fastStages = () => stageIds().filter(id => REG.get(id).fast);

/* any object -> exactly this stage's settings keys, every value one of its choices (unknown keys dropped) */
export function normalizeSettings(id, raw) {
    const m = stageMeta(id); if (!m) return null;
    const src = raw && typeof raw === "object" ? raw : {}, out = {};
    Object.entries(m.settings).forEach(([k, f]) => {
        const v = src[k];
        if (f.series) {
            const list = (Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : []).map(String).filter((x, i, a) => x && a.indexOf(x) === i);
            out[k] = list.length ? list : f.def.slice();
            return;
        }
        const hit = f.choices.find(c => String(c) === String(v));
        out[k] = hit !== undefined ? hit : f.def;
    });
    return out;
}
export const defaultSettings = id => normalizeSettings(id, {});

/* "duel" | "ffa" | "teams" for this stage with these settings */
export function formatOf(id, settings) {
    const m = stageMeta(id); if (!m) return null;
    if (m.format) return m.format(normalizeSettings(id, settings));
    return m.oneVone && !m.ffa ? "duel" : m.ffa ? "ffa" : m.teams ? "teams" : "duel";
}

/* can this stage run with n players? { ok, why }. Duels run as a bracket (any 2+), FFA and teams seat everyone. */
export function stageFits(id, settings, n) {
    const m = stageMeta(id); if (!m) return { ok: false, why: "Unknown mode." };
    const f = formatOf(id, settings), s = normalizeSettings(id, settings);
    if (n < 2) return { ok: false, why: "A stage needs at least 2 players." };
    if (f === "duel") return n <= 8 ? { ok: true } : { ok: false, why: m.name + " brackets take up to 8 players." };
    if (n < m.min) return { ok: false, why: m.name + " needs at least " + m.min + " players." };
    if (n > m.max) return { ok: false, why: m.name + " seats up to " + m.max + " players." };
    if (id === "uno") {                         // the deck needs its number of series
        const k = s.animes.length;
        if (s.unoDeck === "classic" && k !== 4) return { ok: false, why: "The Classic UNO deck uses exactly 4 series (" + k + " ticked)." };
        if (s.unoDeck === "chaos" && (k < 4 || k > 8)) return { ok: false, why: "The Chaos UNO deck uses 4 to 8 series (" + k + " ticked)." };
    }
    if (f === "teams" && id === "draft") {      // Build seats exactly N per side: everyone plays only when N = players / 2
        if (n % 2) return { ok: false, why: "Draft Build needs an even number of players (" + n + " here): use Auction, or another mode." };
        if (s.draftFmt * 2 !== n) return { ok: false, why: "Draft Build " + s.draftFmt + "v" + s.draftFmt + " seats " + s.draftFmt * 2 + " players: pick " + n / 2 + "v" + n / 2 + " so all " + n + " play." };
    }
    return { ok: true };
}

/* a team split { A: [slots], B: [slots] } -> the room patch that makes the lobby (and the mode's start) use it */
export function teamPatch(id, teams) {
    const m = stageMeta(id), tk = m && m.teamKeys; if (!tk || !teams) return null;
    const map = {};
    ["A", "B"].forEach(side => (teams[side] || []).forEach(p => { map["p" + Number(p)] = tk[side]; }));
    return Object.keys(map).length ? { key: tk.key, map } : null;
}

/* the setup's time estimate for one stage, in minutes (numbers in NIGHT_PARTY.minutes) */
export function estMinutes(id, settings, n) {
    const M = NP.minutes, s = normalizeSettings(id, settings) || {}, p = Math.max(2, n | 0);
    switch (id) {
        case "classic": return M.classic.perMatch * (p - 1);
        case "headbanz": return M.headbanz.perRound * s.rounds;
        case "imposter": return M.imposter.perRound * p * s.laps;
        case "uno": return M.uno[s.unoDeck] || M.uno.classic;
        case "draft": return M.draft[s.draftType] || M.draft.build;
        case "feud": return M.feud.perRound * s.feudRounds;
        case "likely": return M.likely.base + s.likelyRounds * (s.likelyTimer + M.likely.perDuelExtra) / 60;
        case "sketch": return s.sketchMode === 1 ? s.sketchRounds * (s.sketchTimer + p * M.sketch.contestPerDrawing) / 60 : s.sketchRounds * p * (s.sketchTimer + M.sketch.turnExtra) / 60;
        default: { const m = stageMeta(id); return m && m.minutes ? m.minutes : 5; }
    }
}
/* a whole path: the stages + an intermission between each */
export const estTotal = (stages, n) => (stages || []).reduce((t, st) => t + estMinutes(st.mode, st.settings, n), 0) + Math.max(0, (stages || []).length - 1) * NP.minutes.intermission;
