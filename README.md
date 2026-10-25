# Guess Who: Anime Edition

A browser party game for 2 to 6 friends with five anime modes in one room:

| Mode | Players | Identity |
|---|---|---|
| **Guess Who** | 2 | *Case File*: detective-noir board, amber and teal, swing soundtrack |
| **Headbanz** | 2–4 | *Mind Link*: psychic synthwave, violet and cyan |
| **Imposter** | 3–6 | *Shadow Trial*: interrogation spotlight, crimson |
| **Anime UNO** | 2–6 | *Arena Clash*: card-battle arena tinted by the active colour |
| **Grand Voyage** | 2–6 | *Uncharted Route*: night-ocean chart, sea-shanty soundtrack, war drums in battle |

## Grand Voyage

A shared adventure with a secret agenda. The crew sails one hidden map together (4, 6 or 8 legs, then a boss):

- **Route votes.** Each leg everyone votes on the next node (battle, elite, mystery, treasure, market, shrine). The helm rotates and breaks ties. Fog hides nodes more than 2 legs ahead unless a Navigator is aboard.
- **Battles.** Everyone secretly picks Attack, Guard or Hold back, and the choices are revealed together. Guards shield the crew, fighters split the spoils, and the top fighter gets a relic. Hold back and you stay safe but get nothing.
- **Social play.** Between fights you can give, trade (offer/accept) or steal from crewmates. Thieves may be seen. Treasure chests are split-or-grab: if exactly one player grabs, they take it all.
- **Hidden objectives.** Each player has a secret ambition (hoard gold, never attack, out-earn a rival, …). In crews of 3+ there may be a **Mutineer**. The campfire before the boss is the one chance to unmask them.
- **The Legendary Treasure** goes to the player with the most renown (gold, relics, deeds, completed objective), even if the crew is shipwrecked.

Code: `js/voyage/data.js` (roles, relics, objectives, events, enemies per series), `js/voyage/logic.js` (pure rules engine, seeded RNG, every move is one RTDB transaction on `rooms/<code>/vy`), `js/voyage/ui.js` (screen and cinematics), `css/voyage.css`. New events, relics or enemies are table entries in `data.js`.

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
