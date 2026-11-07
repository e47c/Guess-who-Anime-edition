/* =====================================================================
   NIGHT PARTY · CONFIG: every tunable number of the tournament in one place.
   Edit a value, bump `?v=` where js/party/config.js is imported (party.js, stages.js, scoring.js, vault/economy.js).
   ===================================================================== */
export const NIGHT_PARTY = {
    players: { min: 2, max: 8 },

    /* placement points: base = top - (place - 1) * (top - bottom) / (players - 1). 8 players: 10, 8.71, 7.43, 6.14,
       4.86, 3.57, 2.29, 1 (shown rounded: 10, 9, 7, 6, 5, 4, 2, 1). Exact values are kept and compared. */
    points: { top: 10, bottom: 1 },
    eps: 1e-6,                                   // two pools closer than this are a tie
    weights: [1, 1.5, 2],                        // the stage weight buttons; "custom" allows any value in customWeight
    customWeight: { min: 0.5, max: 5, step: 0.5 },
    maxStages: 12,
    nameMax: 40, rewardMax: 120, labelMax: 24,

    /* flow */
    countdowns: [0, 15, 30, 60],                 // intermission countdown choices in seconds (0 = the host presses Next)
    resultHoldMs: 4500,                          // a finished match keeps its own end screen this long, then the Night Party results
    bracketGapSec: 10,                           // between two bracket matches: the next one starts after this (or when the host presses Next)
    disconnectSec: 60,                           // a player offline this long during a stage is scored last for that stage (a duelist forfeits)
    hostTakeoverSec: 40,                         // the host offline this long: the first online player takes over hosting
    lateStart: "avg",                            // late joiners start at "zero" or at the "avg" pool of the players present
    maxSuddenRounds: 5,                          // still tied after this many sudden-death rounds: a coin flip decides (logged)
    tiebreaker: {                                // "random" = a random fast mode that fits the tied players
        settings: {
            likely: { likelyPlay: "ffa", likelyRounds: 5, likelyTimer: 10 },
            classic: { boardSize: 24 }
        }
    },

    /* the time estimate shown in setup (minutes) */
    minutes: {
        classic: { perMatch: 5 },                // a bracket of n players is n - 1 matches
        headbanz: { perRound: 2.5 },             // x rounds
        imposter: { perRound: 1.5 },             // x players x laps
        uno: { classic: 10, chaos: 14 },
        draft: { build: 9, auction: 14 },
        feud: { perRound: 3 },
        likely: { base: 1, perDuelExtra: 6 },    // per duel: the vote timer + this many seconds of reveal
        sketch: { turnExtra: 20, contestPerDrawing: 18 },   // seconds: per drawing turn on top of its timer / per drawing rated
        intermission: 1.5,
        sudden: 4
    },

    /* AAP Coins on top of each stage's normal coins (stages pay through the usual per-game grants, no daily limit) */
    coins: { winner: 100, perStage: 10, minPlayers: 2 },
    winnerCosmetic: null,                        // HOOK: an earn-only cosmetic id given to tournament winners (not built yet)

    /* the live chart */
    chart: { tokenMs: 900 },
    historyKeep: 10,                             // tournaments kept in the profile history

    /* built-in path templates (the host's own are saved in localStorage) */
    templates: [
        {
            id: "night-of-eight", name: "Night of Eight", builtIn: true, note: "6 stages for 8 players, about 75 minutes, ending with a x2 final",
            plan: {
                name: "Night of Eight", reward: "Winner picks the next anime we watch",
                tiebreaker: "random", late: "avg", count: 30,
                stages: [
                    { mode: "likely", label: "Opening Round", weight: 1, teams: "auto", settings: { likelyPlay: "ffa", likelyRounds: 10, likelyTimer: 15, animes: ["onepiece", "naruto", "jjk", "dragonball"] } },
                    { mode: "uno", label: "Card Chaos", weight: 1, teams: "auto", settings: { unoDeck: "chaos", unoSp: "once", animes: ["onepiece", "naruto", "dragonball", "jjk", "demonslayer", "bleach"] } },
                    { mode: "classic", label: "Duel Bracket", weight: 1.5, teams: "auto", settings: { boardSize: 24, animes: ["onepiece", "naruto", "jjk"] } },
                    { mode: "sketch", label: "Art Attack", weight: 1, teams: "auto", settings: { sketchMode: 0, sketchRounds: 1, sketchTimer: 90, sketchDiff: 0, animes: ["onepiece", "naruto", "dragonball"] } },
                    { mode: "feud", label: "Team Feud", weight: 1.5, teams: "auto", settings: { feudRounds: 5, feudTimer: 30, animes: ["onepiece", "naruto", "jjk", "dragonball"] } },
                    { mode: "headbanz", label: "Final Round", weight: 2, teams: "auto", settings: { rounds: 5, difficulty: "normal", animes: ["onepiece", "naruto", "jjk"] } }
                ]
            }
        },
        {
            id: "quick-three", name: "Quick Three", builtIn: true, note: "3 short stages, about 25 minutes",
            plan: {
                name: "Quick Night", reward: "Bragging rights", tiebreaker: "random", late: "avg", count: 15,
                stages: [
                    { mode: "likely", label: "Warm-up", weight: 1, teams: "auto", settings: { likelyPlay: "ffa", likelyRounds: 5, likelyTimer: 15, animes: ["onepiece", "naruto"] } },
                    { mode: "classic", label: "Duels", weight: 1, teams: "auto", settings: { boardSize: 24, animes: ["onepiece"] } },
                    { mode: "likely", label: "Final Round", weight: 2, teams: "auto", settings: { likelyPlay: "teams", likelyRounds: 5, likelyTimer: 15, animes: ["jjk", "dragonball"] } }
                ]
            }
        }
    ]
};
