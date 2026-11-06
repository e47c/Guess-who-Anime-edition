# NIGHT PARTY (mode 10): build notes and test checklists

A tournament controller: it launches existing modes in sequence with preset settings, collects their results,
scores placements, and shows live standings. It is not a new game. Built in 8 phases, with a stop after each.

| Phase | What | Status |
|---|---|---|
| 1 | Remove the daily coin cap; verify / add the per-mode prerequisites | done |
| 2 | Data model + scoring engine (pure, unit-tested) | |
| 3 | Host setup screen, templates, validation | |
| 4 | Controller with FFA stages | |
| 5 | Duel brackets (seeding, byes, spectating) | |
| 6 | Live chart and results screens | |
| 7 | Sudden death, winner screen, profile, coin bonuses, mission, achievement | |
| 8 | Edge cases, mobile, reduced effects, full 8-player run | |

## Phase 1

### Economy: no daily cap
- Removed: the cap logic (`applyGame`), its config value (`EARN.dailyGameCap`), the per-day counter in the saved
  Vault (`earn`; old saves drop it on load, coins untouched), the "/ 600" bar and the "daily cap" text in the Daily
  drawer. No mission mentioned it.
- Kept: a game pays only with 2+ real players (distinct accounts) and past the mode's minimum length.
- Nothing else read the cap. A full search of js/, tools/, README and index.html came up empty after the change.
- The Daily drawer still shows "Coins from games today", now a plain stat summed from the coin ledger.

### Prerequisites, per mode
| Need | Where | State before | Change |
|---|---|---|---|
| Launch with a preset settings object (the lobby UI's schema) | `js/party/stages.js` (schema, normaliser), `modeLaunch` in `js/game.js` | Settings existed only as room keys written by the lobby UI | Added. The schema keys are exactly the room keys each mode reads, which are also the ones its result reports (unit-tested) |
| Deal in only some players (bracket match, sudden death) | `dealSlots(d)` in game.js + `seatsOnly` in the room | Every start dealt in everyone | Added. An optional `rooms/<code>/seatsOnly`; when absent, everyone is dealt in exactly as before. Every mode's start honours it, and it's cleared with the match |
| Preset teams | `teamPatch` (stages.js) | Team splits lived in `feudTeams` / `likelyTeams` / `draftSides` | Launch writes the given split into the same key |
| Tie-aware result `{ mode, players, placements, scores, duration, settings, teams? }` | `js/vault/result.js` | Already there for every mode (Arcade Vault phase 1) | None |
| Metadata: min / max, teams, 1v1, FFA, length, fast | `MODE_META` in `js/vault/config.js` | Had `duel` (meaning "playable by 2"), no FFA flag | Now `teams`, `ffa`, `oneVone` (a match is exactly 2: Night Party brackets it), `length`, `fast`, `stage` |
| Start / end / abort the controller can drive | `window.AAP_MODES` in game.js | START, lobby reset and the result existed separately | `launch`, `over`, `result`, `abort`, `prep` (see below) |
| Only the host reports results | `resultSync` in game.js | Host writes `lastResult`; a guest only pays its own Vault from its own copy if the host is gone for 5 s | None. The controller only reads the host's result |
| Arcade Vault battles addable later | `registerStage(id, meta)` | n/a | Arcade Vault is `stage: false`. One `registerStage` call adds it (unit-tested with a stand-in) |

`AAP_MODES` (host side; the Night Party controller will receive the same functions):
- `launch(mode, settings, { seats?, teams?, prepMs?, startMs? })` normalises the settings. It writes the mode,
  settings, seat list and team split, waits for the mode's own preparation (UNO deck, Headbanz / Imposter pictures
  on every player's device), then starts it exactly like START. It returns `{ ok, matchId, seats }` or
  `{ ok: false, error }`. On failure nothing is left half-started: the seat list is cleared and the room stays in
  the lobby.
- `over(d)` and `result(d)`: whether the match is over, and its standard result.
- `abort()`: everyone back to the lobby, the match thrown away.

Format per stage: Guess Who = duel (bracket); Headbanz, Imposter, UNO, Sketch = FFA; Anime Feud = teams; Most
Likely = teams or FFA (its setting); Anime Draft = Build teams or Auction FFA. Draft Build seats exactly N per side,
so as a stage it needs an even player count and N = players / 2.

### Phase 1 test checklist
- [x] `node tools/vault-test.mjs`: 167 pass. Covers no cap (40 wins in a day all pay), an old save with the cap
  counter loads without it with coins intact, coins today read from the ledger, and the cap config gone.
- [x] `node tools/party-test.mjs`: 29 pass. Covers the registry, the schema matching each result's settings,
  normalising, formats, fits for 2-8 players, team patches, and registering a later stage.
- [x] Other suites unchanged: cardvault 49, draft 103, feud 264, sketch 228.
- [x] Browser, 3 players (scratchpad `pw/np1.mjs`): 45 checks.
  - Most Likely FFA with only players 1 and 2 and preset settings, played to the end. The result has only those 2,
    tie-aware places, the preset settings, and matches `lastResult`. Player 3 watches live.
  - Guess Who between players 2 and 3, with the host on the spectator screen.
  - Feud with a given team split. Draft Build with given sides, and Draft Auction.
  - Sketch for 2 of 3 players. Headbanz for 2 of 3, after waiting for pictures. UNO for everyone, after waiting
    for the deck. Imposter for everyone.
  - Imposter with 2 seats fails cleanly. Arcade Vault is refused. A guest can't launch.
  - Abort returns everyone to the lobby with the seat list cleared.
  - The normal START still deals in everyone. No page errors.
- [x] Browser regressions: Vault and close room (av2) 32, hosting (hostentry) 8, results (res) 25, Daily drawer
  (vt) 26, Imposter (imp) 22, Sketch Contest (ct) 62.
- [x] Daily drawer card checked by eye: "Coins from games today" with no limit.
