# NIGHT PARTY (mode 10): build notes and test checklists

A tournament controller: it launches existing modes in sequence with preset settings, collects their results,
scores placements, and shows live standings. It is not a new game. Built in 8 phases. How to run one: pick NIGHT PARTY in a room's lobby, SET UP THE NIGHT, START NIGHT PARTY.

| Phase | What | Status |
|---|---|---|
| 1 | Remove the daily coin cap; verify / add the per-mode prerequisites | done |
| 2 | Data model + scoring engine (pure, unit-tested) | done |
| 3 | Host setup screen, templates, validation | done |
| 4 | Controller with FFA stages | done |
| 5 | Duel brackets (seeding, byes, spectating) | done |
| 6 | Live chart and results screens | done |
| 7 | Sudden death, winner screen, profile, coin bonuses, mission, achievement | done |
| 8 | Edge cases, mobile, reduced effects, full 8-player run | done |

## Files

| File | What |
|---|---|
| `js/party/config.js` | Every tunable number of the Night Party (points, weights, timings, coins, estimates) and the built-in templates |
| `js/party/stages.js` | The stage registry: metadata, settings schema, formats, fits, team splits, time estimates (pure) |
| `js/party/scoring.js` | The data model and the scoring engine: points, ties, weights, team expansion, standings, seeding, brackets, sudden death (pure) |
| `js/party/party.js` | Lobby box, setup sheet, the controller (host), the tournament screen, live chart, HUD chip, rewards |
| `css/party.css` | Its styles (phone layout and reduced effects included) |
| `tools/party-test.mjs` | The unit tests (`node tools/party-test.mjs`) |

Room data: `rooms/<code>/npPlan` is the setup (lobby); `rooms/<code>/np` is the running tournament:
`{ id, name, reward, started, plan, roster: { uid: { slot, name, joined, start, gone } }, res: { "<stage>": { mode,
label, weight, format, sd, n, placements: [{ id, place }], br?, teams?, dropped?, skipped? } }, phase, si, br, teams,
match, sd, drop, off, due, winner, ended }`. Pools, gains, ranks and ties are never stored: `standings(roster, res)`
recomputes them every time, so the scoring can always be redone from the stored stage results.


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
## Phase 2: data model + scoring engine

- Base points: `10 - (place - 1) * 9 / (players - 1)` (config `points`), exact values kept, ties decided on exact
  values (config `eps`). 8 players display 10, 9, 7, 6, 5, 4, 2, 1; last always gets 1.
- Shared places (ties, team members, bracket rounds) cover the positions they take up together and share the
  average: 4v4 = ~8.07 / ~2.93; four teams of 2 among 8 = ~9.36 / ~6.79 / ~4.21 / ~1.64 (about 9.5 / 6.5 / 4.5 / 1.5).
- Weight multiplies the stage's points; sudden-death rounds are weight 0.
- Players who left during a stage are removed from its placements (scored among those present); players offline
  too long are moved to last (tied last if several).

Checklist (`node tools/party-test.mjs`, phase 2 sections):
- [x] base points for 2-8 players (first 10, last 1, strictly decreasing, display table)
- [x] ties share their positions; ties never create or destroy points
- [x] weights x1, x1.5, x2, custom, x0
- [x] team expansion: 4v4, four teams of 2, 2v2, uneven 3v2, two tied teams
- [x] leavers removed / dropped scored last, ties preserved
- [x] standings recomputed from the stored results = the same after a Firebase round trip; tied ranks; topTied;
  a leaver keeps the pool but can't win; skipped stage; sudden death adds nothing; late start
- [x] bracket: seed positions, seeding by pool (random when equal), 8 players = 7 matches with the right places,
  5 players = 3 byes to the top seeds, every size 2-8 places everyone once, invalid winners refused, round trip
- [x] team split by pool (snake) and random; sudden-death winners

## Phase 3: host setup, templates, validation

- In the lobby, pick NIGHT PARTY: the Night Party box shows the plan (name, reward, stages with weights, estimated
  duration, the first problem). The host opens SET UP THE NIGHT; guests can open the same sheet read-only, and it
  updates live (the plan is saved in the room as it is edited).
- The sheet: name, reward, plan for (players in the room, or 2-8), tiebreaker (random fast mode by default, or a
  fixed one), late joiners (start at 0 / at the average pool), intermission countdown (off / 15 / 30 / 60 s).
- Path: add, delete, duplicate, move up/down; per stage: mode, label, weight (x1, x1.5, x2, custom 0.5-5), every
  setting of the mode (same choices as the lobby), its series, and for team stages how teams are made (balanced by
  standings, random, host picks before the stage). The same mode can come back with other rules.
- Validation per stage against the player count and the mode's metadata (e.g. Imposter 3+, Draft Build needs an even
  count with N = players / 2, UNO Classic exactly 4 series); a bad stage is red with the reason, and START stays
  disabled with that reason in the lobby status.
- Estimated duration per stage and in total (numbers in config `minutes`).
- Templates: two built-in ones ("Night of Eight": 6 stages for 8 players, ~75 min, ending with a x2 Final Round;
  "Quick Three") plus the host's own (Save as template, Load, Delete; saved on that device).
- No start time: the host presses START NIGHT PARTY when everyone is there.

Checklist: [x] the sheet opens with a template, saved in the room, guests see it (np3); [x] Night of Eight loads
(6 stages, Final Round); [x] duration estimate; [x] duplicate / delete; [x] an invalid stage is red with its reason
and blocks START; [x] save as template; [x] the example template fits 8 players and ends with x2 (unit test);
[x] phone: the sheet has no horizontal scroll (np8, `np/phone-setup.png`).

## Phase 4: the controller with FFA stages

The host's game.js `hostDuties` calls `npDuties`: phase `next` (intermission; START STAGE or the countdown) ->
`launch` (window.AAP_MODES.launch with the stage's settings and the players present) -> `play` (the mode runs; when
it is over its own end screen stays `resultHoldMs`) -> `results` (the stage's placements are stored, everyone back on
the Night Party screen) -> the next stage. A match stopped from a menu, or a mode that can't start, goes to `failed`:
Retry or Skip stage (no points, standings intact).

Checklist: [x] FFA stage with 3 (np3) and 8 (np8) players; [x] a guest in their Vault is pulled into the match;
[x] the HUD chip during a stage opens the live chart; [x] results recorded and shown; [x] stopped -> Retry works
(np3) / Skip records a skipped stage (npedge); [x] Not enough players -> failed safely (npedge).

## Phase 5: duel brackets

1v1 modes (Guess Who) run a single-elimination bracket inside the stage: seeded by the current pool (stage 1 or
equal pools: random), top seeds get the byes, matches one after the other (the next one starts after `bracketGapSec`
or when the host presses START MATCH), the others spectate live (Guess Who's spectator screen). Champion 1st,
finalist 2nd, semifinal losers tie 3rd/4th, quarterfinal losers tie 5th-8th. A duelist who isn't there (or drops
offline too long) gives the other a walkover. Double-chance (double elimination) is a TODO: it needs a losers' bracket
and roughly doubles the matches, so it isn't cheap.

Checklist: [x] 3 players: a bye to the top seed, the bye player spectates, the final starts by itself, places 1/2/3
(np3); [x] 8 players: 7 matches, 6 spectators, places 1, 2, 3, 3, 5, 5, 5, 5 (np8); [x] the bracket shows on the
intermission card, between matches, in the chart sheet and on the results.

## Phase 6: live chart and results

- Race track: one lane per player (8 fit a phone), stage markers at the most points possible after each stage (with
  their weights), tokens with the player's picture and equipped frame move along with their pool (animated), the
  leader glows with a crown and the gap to 2nd; players who left are greyed out.
- Scoreboard: rank (T for ties), player, pool, last-stage gain. Stage list with weights and done / now / skipped.
- After each stage: its results (place, points gained, rank movement). During duel stages the bracket.
- Everything comes from the room, so it is live for everyone and comes back after a reload.

Checklist: [x] 3 lanes / 8 lanes, the stage list (np3, np8); [x] the scoreboard numbers match the scoring rules
(np8); [x] results screen for everyone; [x] reload lands back on the same screen (np3); screenshots in `np/`.

## Phase 7: sudden death, winner, profile, coins, mission, achievement

- Ties at the top after the last stage: only the tied players play one round of the tiebreaker (weight 0), again
  with whoever is still tied, until one is left (after `maxSuddenRounds` a coin flip decides, and the winner screen
  says so).
- Winner screen: the champion, the named reward, the final chart; then BACK TO THE LOBBY with everyone still in it.
- Coins: every stage's game pays its normal coins (no daily limit); on top the winner +100 and every participant +10
  per stage played, once per tournament (bank operation `party:<room>:<id>`), only with 2+ real players and a
  tournament of at least `coins.minMinutes`.
- Profile: Tournaments won / played and the last 10 (name, reward, winner, date) in the profile sheet; the "Night Party
  Winner" achievement. Daily mission "Finish a Night Party" (+40). Hook: `NIGHT_PARTY.winnerCosmetic` +
  `winnerCosmeticHook` in economy.js for an earn-only winner cosmetic (not built).

Checklist: [x] coin rules and the mission (vault-test); [x] sudden death between 3 tied players (npedge); [x] winner
screen with the reward for everyone; [x] bonus, history and achievement for every player (np3: 4 players, np8: 8);
[x] a reload doesn't pay twice.

## Phase 8: edge cases, mobile, reduced effects, 8 players

| Case | What happens | Test |
|---|---|---|
| Disconnect mid-stage | everyone sees "X is offline · scored last in m:ss"; after `disconnectSec` they're scored last for that stage (a duelist forfeits); the mode itself auto-plays / skips them as usual; rejoin is the mode's normal reconnect | npedge |
| Late joiner | joins only between stages, starts at 0 or the average pool (setup), a banner says so | np3 |
| Permanent leaver | greyed out, pool kept, can't win, later stages scored among those present | npedge |
| Host leaves | hosting passes on (the room's normal rule); the new host has the buttons | npedge |
| Host offline | "Paused: waiting for the host"; after `hostTakeoverSec` the first online player takes over; nothing is lost | npedge |
| Mode fails to start / is stopped | the host gets Retry or Skip stage, scores intact | np3, npedge |
| Vault | only between stages ("Open my Vault"), card battles off during the tournament | np3 |
| End Night Party | the host can throw the tournament away at any time | npedge |
| Close room | works in setup, an intermission, mid-stage, sudden death and the winner screen; the room is deleted | npedge |

Mobile: the tournament screen, results, bracket, winner and the setup sheet at 390 px wide, no horizontal scroll
(np8 screenshots). Reduced effects: tokens jump instead of travelling, no background drift, no confetti, no crown bob.

## Test totals (all phases, 2026-11-06)

- Unit: `node tools/party-test.mjs` 96, `node tools/vault-test.mjs` 175. Other modes unchanged: cardvault 49,
  draft 103, feud 264, sketch 228.
- Browser (scratchpad `pw/`, real Firebase, test rooms deleted after each run): np1 (launch API) 35 + 10 aborts,
  np3 (3-4 players, the whole flow) 65, npedge (edge cases, Close room at 5 points) 26, np8 (8 players, phone,
  reduced effects) 30. Regressions: av2 32, hostentry 8, res 25, vt 26, imp 22, ct 62.
- Screenshots: scratchpad `np/` (setup, intro, results, bracket, teams, sudden death, winner; phone 390 px versions).
