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
