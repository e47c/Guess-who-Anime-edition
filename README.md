# Anime Arcade Party

*(formerly Guess Who: Anime Edition)*

A browser party game for a squad of up to 8 friends with four anime modes in one room:

| Mode | Players | Identity |
|---|---|---|
| **Guess Who** | 1v1 (2–8 in the room) | *Case File*: detective-noir board, amber and teal, swing soundtrack |
| **Headbanz** | 2–8 | *Mind Link*: psychic synthwave, violet and cyan |
| **Imposter** | 3–8 | *Shadow Trial*: interrogation spotlight, crimson |
| **Anime UNO** | 2–8 | *Arena Clash*: card-battle arena tinted by the active colour |

## How the modes scale

- **Guess Who** stays a duel. With more than 2 in the room the host taps the two duelists in the lobby, and everyone else spectates. Spectators see both boards live (`gw/elim/p<slot>` holds each duelist's crossed-out cards) but never a secret character. They don't read `private/`, they get no end-of-match reveal, and the accused card isn't marked for them.
- **Headbanz:** everyone guesses at once. With N players the 1st right guess scores N points, the next N-1, and so on (8 players: 8, 7, 6 … 1). Giving up or three strikes scores 0. A 2-player game uses the same rule (2 / 1 / 0) over the chosen number of rounds.
- **Imposter:** 3–8 players. One lap = everyone is the imposter once, so the round count follows the table size.
- **Anime UNO:**
  - **Classic deck:** exactly 4 series (red, green, yellow, dark blue), 124 cards.
  - **Chaos deck:** 4–8 series. It adds pink, orange, purple and light blue, and every series adds its 31 cards (248 at 8).
  - **Draw-2s stack:** answer a +2 with a +2 to pass on +4, +6, +8 … or take the whole stack and lose the turn.
  - **Finishing:** a player who empties their hand takes the next place and watches the table, seeing card counts but never hands. The round goes on until every place is decided, then shows the full ranking.
  - **No UNO call:** down to one card, you just keep playing. There is no UNO button and no catch penalty.
  - **Future Sight** reveals the *next* player's hand to the player who used it (everyone else sees the same scene with card backs), then gives one extra play: play one more card or end the turn. Drawing isn't allowed during the extra play. Until it is used, a small reminder of the hand you saw stays next to the table, visible only to you.
  - **Swap Hands** opens an exchange portal: the other players orbit you with their real card counts, and hovering one shows what you'd get.
  - **Wilds** open a colour wheel with one slice per deck colour, showing each series' hero, kanji and name. It works with mouse, touch, and keyboard (arrow keys, then Enter).

**Firebase rules note:** the current rules let any signed-in client read a whole room, `private/` included. The clients listen to the whole room, so Guess Who secrets reach every browser, the opponent's included. Spectator secrecy is therefore enforced by the client. Realtime Database read rules cascade, so a room-level `.read` can't be narrowed for `private/`. Enforcing it on the server would mean moving secrets to their own top-level path (for example `secrets/$room/$uid`, readable only by `auth.uid === $uid`).

## Customising

- **Series art and names:** `ANIME_LIBRARY` and `CHARACTER_NAMES` at the top of `js/game.js`.
- **Series logos:** `images/logos/<series>.png`. A missing file falls back to the text name.
- **Special-card art:** `images/special/<series>_<freeze|swap|ultimate|vision>.(png|jpg|webp)`. Until a file exists, the card shows a kanji emblem. Every cinematic opens on the full picture, framed and never cropped.
- **Special-card voice lines:** `audio/special/<series>_<f|t|u|e>.mp3`. The cinematic lasts as long as the clip (up to 17 s), pulses with the voice's loudness, and pins its key beats to the words of the line (`SYNC` in `js/cine/engine.js`, taken from a transcript of each clip). If you replace a clip, update its pins; pins that no longer fit are relaxed automatically.
- **Win sounds:** `sounds/win/<series>.mp3`. Everyone in the room hears the winner's series.
- **Music:** generated live in `js/audio.js` (the `THEMES` table: tempo, progression, drum patterns, instruments). No files are needed.
- **Hidden series:** `HB_HIDDEN_SERIES` in `js/game.js` (Attack on Titan, My Hero Academia, Re:Zero are hidden for now).

## Accessibility and performance

- Every overlay is a dialog that closes with Esc. Game cards and mode cards are keyboard-operable. Buttons have labels.
- Settings has master/music/SFX volume, mute, music on/off and **Reduced effects**. `prefers-reduced-motion` is respected everywhere.
- Ambient particles run at about 30 fps, scale with screen size, and pause when the tab is hidden; the AudioContext suspends too. Effect loops stop by themselves.
- One room listener, one guess listener and one connection listener per client. They are re-used across matches and removed on leave.

## Menu and lobby: the night arcade

- **Main menu.** A neon marquee ("ANIME" slams in, "ARCADE PARTY" buzzes on) over a row of arcade cabinets, one per mode. Each cabinet's CRT runs an attract loop; tap one for its rules. **Host a party** is *insert coin*: a coin drops into the slot and the credit counter ticks before the room is made. The join field is a six-cell high-score entry. Your profile is an arcade member card with a holographic foil that follows the pointer.
- **Lobby.** A fighting-game *PLAYER SELECT*. Seats are 1P–8P fighter tiles, a **READY!** band stamps across a tile when that player readies up, and anyone joining mid-lobby gets a *HERE COMES A NEW CHALLENGER!* banner. The modes are a stage select: corner brackets mark the host's pick and every voter's 1P–8P cursor hovers over the mode they voted for. Ready and Start are physical arcade push buttons, and the status line is an LED board.
- Reduced effects (or the OS reduced-motion setting) turns off the moving floor, tilt, foil and attract loops.

## DIO's Freeze: ZA WARUDO

DIO's Freeze card is a first-person time stop. His arms are crossed in an X (yellow sleeves) and thrown open on the peak of "ZA WARUDO!". Reality turns gold with purple/green interference, holographic tearing and colour split, then everything brakes smoothly to a dead stop in grey. The grey then stays on the **whole page for every player**: a fixed `backdrop-filter` layer (`.zw-veil`) greys the table, cards, UI and any other animation. It lasts while the frozen player (always the next player) still has turns to lose, and the others keep playing under it. When the second skipped turn is spent, the reversal plays: grey → holographic unwind → purple/green → gold → normal, with 時は動き出す ("time moves again").

## Aokiji's Freeze: Ice Age

Aokiji's Freeze is a first-person scene drawn over the real game page. His lazy right hand (tanned, white suit sleeve, blue shirt cuff) slides out of his trouser pocket, drifts over the table and lays its palm flat on it at the voice's peak (4.6 s). Ice grows out of the palm across the actual table, cards and UI to every edge: branching cracks, jagged crystals at the front, a cold chromatic rim, mist and floating crystals. Everything then brakes to a stop. The frozen look is the page's ice veil (`.ice-veil`), revealed by a mask that grows with the wave, so the hold has no seam. It stays on for every player while the next player's 2 turns are skipped, with drifting mist, glints and faint creaks, and stays light enough to keep playing. When the second skipped turn is spent, cracks race over the whole screen and the ice shatters into falling shards as the colour returns. DIO's ZA WARUDO uses the same system (`TS` in `js/game.js`).

## Uraume's Freeze: Ice Formation

Uraume's Freeze (now named Ice Formation, 氷凝呪法) is a first-person scene over the real page. Her hands start folded at the waist in the pale wide-sleeved kimono, and rise together on 霜凪 ("Frost Calm"). A point of pale cold light gathers between the thumbs while the voice builds. On its peak (10.1 s) the hands push forward and the ice bursts out from between them in every direction: six-fold frost lines, delicate crystal flakes on a shimmering front edge, swirling snow and rolling mist. Everything then slows to a stop. The hold is the page's snow veil (`.snow-veil`): a light-blue tint, lace frost, softly falling snow, snow settled on the top edges of the real cards, plates, piles and buttons, and quiet wind and creaks. The break uses finer shards and a flurry of snow blowing away.
