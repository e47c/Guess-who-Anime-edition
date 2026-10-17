# Guess Who: Anime Edition

A browser party game for 2 to 6 friends with four anime modes in one room:

| Mode | Players | Identity |
|---|---|---|
| **Guess Who** | 2 | *Case File*: detective-noir board, amber and teal, swing soundtrack |
| **Headbanz** | 2–4 | *Mind Link*: psychic synthwave, violet and cyan |
| **Imposter** | 3–6 | *Shadow Trial*: interrogation spotlight, crimson |
| **Anime UNO** | 2–6 | *Arena Clash*: card-battle arena tinted by the active colour |

It is a static site: no build step and no server code. Realtime multiplayer runs on Firebase Realtime Database with anonymous auth, and character data comes from `packs.json` and AniList.

## Project layout

```
index.html        markup only (screens, overlays, dock)
css/base.css      design system: tokens, buttons, sheets, main menu, lobby, avatars, results, scene backgrounds
css/modes.css     Guess Who, Headbanz, Imposter screens
css/uno.css       Anime UNO (original card styles + the arena/card overhaul layered at the end)
js/game.js        the game: Firebase, rooms and lobby, routing, all four modes, UNO special-card cinematics
js/audio.js       one AudioContext: synthesized SFX, procedural music per scene, volume settings
js/fx.js          ambient particles per scene, title cards, shake/ring/burst helpers, reduced-effects switch
js/profile.js     player profile, avatars, XP/levels, titles, frames, achievements, profile editor
js/results.js     the shared cinematic victory/defeat sequence
packs.json        pre-built AniList character lists (Headbanz, Imposter, UNO pictures, avatar gallery)
images/ audio/ sounds/   art, special-card voice lines, per-series win sounds
```

Stylesheets and the main script carry a `?v=` query in `index.html`. Bump it when you deploy so browsers fetch the new files.

## How a room works

1. **Create room** makes a party room in the lobby (`status: "waiting"`). Friends join with the 6-letter code or the invite link (`?room=CODE`).
2. In the lobby the **host** picks the mode and its settings (series, board size, difficulty, rounds, laps). Everyone else can **vote** by tapping a mode card, and can mark themselves ready. The Start button only unlocks when the mode's requirements are met (player count, characters downloaded, UNO deck forged).
3. After a match, players can rematch straight away or the host can take everyone **back to the lobby** to switch mode. The room and its per-room stats survive.
4. **Leave room** only removes you. Mid-match you are marked `left` and the round treats you as gone. Hosting passes to the next player. **Close room** (host only), or the last player leaving, deletes the room.
5. Anyone who joins while a match is running waits in the lobby (spectator banner) and is dealt into the next match.
6. A refresh rejoins the same seat (`localStorage` session plus the same anonymous uid).

### Room data (`rooms/<CODE>`)

```
host            slot number of the host (migrates when the host leaves)
gameType        "classic" | "headbanz" | "imposter" | "uno"
animes, boardSize, difficulty, rounds, laps     lobby settings
status          "waiting" (lobby) | "selecting" | "playing" | "finished"
matchId         timestamp of the current match (drives intro title cards and XP de-duplication)
player1..6      { uid, name, av, col, fr, ttl, lvl, ready, lr (lobby ready), vote, left, wins, streak, best }
presence/pN     online flag (onDisconnect -> false)
packs/pN        character download progress (Headbanz / Imposter)
emote/pN        { e, t } latest reaction, one slot per player, nothing to clean up
gw              { seats: [a, b], first, tc: { pN: turns ended } }    Guess Who seats
board, turn, guess, revealed, private/<uid>                           Guess Who state (unchanged)
hb, im          Headbanz / Imposter state (unchanged structure)
uno             Anime UNO state; also holds the forged deck (cards + key) between matches.
                New fields: ev (last action, used for animations), wins, fin
```

> **Firebase rules:** the new fields live under `rooms/<CODE>` like the existing ones. If your database rules validate individual player fields, allow `av, col, fr, ttl, lvl, lr, vote, left` on players and `host, matchId, createdAt, emote, gw` on rooms.

## Profiles and progression

Profiles are stored per browser (`localStorage["gw_profile_v1"]`). The public part (name, avatar, colour, frame, title, level) is copied into the player's room node, so every client renders the same card.

- **Avatars:** emblem glyphs, the repo's own character art, AniList portraits from `packs.json`, or an upload (square crop, about 10 KB). Remote avatar URLs are allow-listed when rendering (`images/…` and `s4.anilist.co` only).
- **XP and levels:** 25 XP per match, plus 55 for a win, plus a streak bonus. Levels unlock titles and frames.
- **Achievements:** 16 plus 1 hidden. Each match is recorded once per browser, so a refresh never double-counts.

## Customising

- **Series art and names:** `ANIME_LIBRARY` and `CHARACTER_NAMES` at the top of `js/game.js`.
- **Series logos:** `images/logos/<series>.png`. A missing file falls back to the text name.
- **Special-card art:** `images/special/<series>_<freeze|swap|ultimate|vision>.(png|jpg|webp)`. Until a file exists, the card shows a kanji emblem. `jojo_swap` and `jojo_vision` currently have no art.
- **Special-card voice lines:** `audio/special/<series>_<f|t|u|e>.mp3`. The cinematic stretches to the clip length (5–10 s).
- **Win sounds:** `sounds/win/<series>.mp3`. Everyone in the room hears the winner's series.
- **Music:** generated live in `js/audio.js` (the `THEMES` table: tempo, progression, drum patterns, instruments). No files are needed.
- **Hidden series:** `HB_HIDDEN_SERIES` in `js/game.js` (Attack on Titan, My Hero Academia, Re:Zero are hidden for now).

## Accessibility and performance

- Every overlay is a dialog that closes with Esc. Game cards and mode cards are keyboard-operable. Buttons have labels.
- Settings has master/music/SFX volume, mute, music on/off and **Reduced effects**. `prefers-reduced-motion` is respected everywhere.
- Ambient particles run at about 30 fps, scale with screen size, and pause when the tab is hidden; the AudioContext suspends too. Effect loops stop by themselves.
- One room listener, one guess listener and one connection listener per client. They are re-used across matches and removed on leave.
