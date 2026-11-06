/* Night Party unit tests: node tools/party-test.mjs
   Phase 1: the stage registry (metadata, settings schema, formats, fits, team patches) and its match with the
   standard result every mode reports. */
import { MODE_META } from "../js/vault/config.js?v=6";
import { RESULT_MODES, RESULT_SETTINGS } from "../js/vault/result.js?v=3";
import { STAGE_SETTINGS, registerStage, stageIds, stageMeta, fastStages, normalizeSettings, defaultSettings, formatOf, stageFits, teamPatch } from "../js/party/stages.js?v=1";

let pass = 0, fail = 0;
const t = (ok, name) => { if (ok) pass++; else { fail++; console.log("  FAIL  " + name); } };
const sect = s => console.log("• " + s);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

sect("registry");
const modes = Object.keys(MODE_META).filter(m => MODE_META[m].stage !== false);
t(eq(stageIds().sort(), modes.slice().sort()), "every mode except Arcade Vault is a stage (" + stageIds().join(", ") + ")");
t(!stageMeta("cardvault") && MODE_META.cardvault.stage === false, "Arcade Vault battles are not a stage yet");
t(stageIds().every(id => RESULT_MODES.includes(id)), "every stage reports the standard result");
t(stageIds().every(id => { const m = stageMeta(id); return m.min >= 2 && m.max <= 8 && m.min <= m.max && ["short", "medium", "long"].includes(m.length) && (m.teams || m.ffa || m.oneVone); }), "every stage has players, a length and at least one format");
t(eq(fastStages().sort(), ["classic", "likely"]), "fast stages (tiebreaker pool): Guess Who and Most Likely");
let threw = false; try { registerStage("broken", { name: "Broken" }); } catch (e) { threw = /missing/.test(e.message); }
t(threw && !stageMeta("broken"), "registering a stage without its metadata is refused");
const cv = registerStage("cvtest", { name: "Card Battle", min: 2, max: 2, oneVone: true, length: "short", fast: true, settings: { cvTimer: { choices: [20, 30, 45], def: 30 } } });
t(stageMeta("cvtest") === cv && formatOf("cvtest", {}) === "duel" && stageFits("cvtest", {}, 8).ok && fastStages().includes("cvtest"), "a later stage (e.g. card battles) plugs in with one registerStage call");

sect("settings schema = the lobby keys");
t(stageIds().filter(id => id !== "cvtest").every(id => eq(Object.keys(STAGE_SETTINGS[id]).sort(), RESULT_SETTINGS[id].slice().sort())), "each stage's settings are exactly the keys its result reports");
t(stageIds().every(id => { const s = defaultSettings(id); return Object.entries(stageMeta(id).settings).every(([k, f]) => f.series ? Array.isArray(s[k]) && s[k].length : f.choices.includes(s[k])); }), "defaults are valid choices");
let n = normalizeSettings("headbanz", { rounds: "7", difficulty: "insane", animes: ["naruto", "naruto", "bleach"], junk: 1 });
t(eq(n, { animes: ["naruto", "bleach"], difficulty: "normal", rounds: 7 }), "normalise: string numbers become the choice, bad values the default, duplicates and unknown keys dropped");
n = normalizeSettings("sketch", { sketchMode: 1, sketchRounds: 99, sketchTimer: 60 });
t(n.sketchMode === 1 && n.sketchRounds === STAGE_SETTINGS.sketch.sketchRounds.def && n.sketchTimer === 60 && eq(n.animes, ["onepiece"]), "normalise: Sketch Contest kept, an impossible round count falls back");
t(eq(normalizeSettings("likely", { animes: { 0: "jjk", 1: "aot" } }).animes, ["jjk", "aot"]), "series stored by Firebase as an object still read as a list");
t(normalizeSettings("nope", {}) === null, "unknown mode -> null");

sect("formats");
t(formatOf("classic", {}) === "duel", "Guess Who: 1v1 duel (bracket)");
t(["headbanz", "imposter", "uno", "sketch"].every(id => formatOf(id, {}) === "ffa"), "Headbanz, Imposter, UNO, Sketch: everyone in one match");
t(formatOf("feud", {}) === "teams", "Anime Feud: teams");
t(formatOf("likely", { likelyPlay: "ffa" }) === "ffa" && formatOf("likely", {}) === "teams", "Most Likely: FFA or teams, by its setting");
t(formatOf("draft", { draftType: "auction" }) === "ffa" && formatOf("draft", { draftType: "build" }) === "teams", "Anime Draft: Auction FFA, Build teams");

sect("fits a player count");
t(!stageFits("imposter", {}, 2).ok && stageFits("imposter", {}, 3).ok, "Imposter needs 3+");
t([2, 3, 5, 8].every(k => stageFits("classic", {}, k).ok), "Guess Who runs as a bracket for 2-8 players");
t(!stageFits("draft", { draftType: "build", draftFmt: 1 }, 8).ok && /4v4/.test(stageFits("draft", { draftType: "build", draftFmt: 1 }, 8).why), "Draft Build 1v1 with 8 is blocked (6 would sit out), and says to pick 4v4");
t(stageFits("draft", { draftType: "build", draftFmt: 4 }, 8).ok && stageFits("draft", { draftType: "build", draftFmt: 1 }, 2).ok && stageFits("draft", { draftType: "auction" }, 8).ok, "Draft Build with N = players / 2, or Auction, fits");
t(!stageFits("draft", { draftType: "build", draftFmt: 3 }, 5).ok && /even/.test(stageFits("draft", { draftType: "build", draftFmt: 3 }, 5).why) && !stageFits("draft", { draftType: "build", draftFmt: 4 }, 6).ok && stageFits("draft", { draftType: "auction" }, 5).ok, "Draft Build with an odd count or a too-big N is blocked (it seats exactly N per side); Auction takes 5");
t(stageIds().filter(id => id !== "cvtest").every(id => stageFits(id, id === "draft" ? { draftFmt: 4 } : {}, 8).ok), "every stage fits 8 players (Draft at 4v4)");
t(!stageFits("uno", {}, 1).ok, "one player is never a stage");

sect("team splits");
t(eq(teamPatch("draft", { A: [1, 2], B: [3] }), { key: "draftSides", map: { p1: "L", p2: "L", p3: "R" } }), "Draft: sides L / R");
t(eq(teamPatch("feud", { A: [4], B: [1, 2] }), { key: "feudTeams", map: { p4: "A", p1: "B", p2: "B" } }), "Anime Feud: teams A / B");
t(teamPatch("likely", { A: [1], B: [2] }).key === "likelyTeams", "Most Likely: likelyTeams");
t(teamPatch("uno", { A: [1], B: [2] }) === null && teamPatch("feud", null) === null, "no team split for an FFA mode, or when none is given");

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
