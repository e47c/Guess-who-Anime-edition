# Anime Arcade Party

*(formerly Guess Who: Anime Edition)*

A browser party game for a squad of up to 8 friends with four anime modes in one room:

| Mode | Players | Identity |
|---|---|---|
| **Guess Who** | 1v1 (2–8 in the room) | *Case File*: detective-noir board under a gold desk lamp, swing soundtrack |
| **Headbanz** | 2–8 | *Mind Link*: psychic, a red sky over a gold horizon grid |
| **Imposter** | 3–8 | *Shadow Trial*: interrogation spotlight, crimson |
| **Anime UNO** | 2–8 | *Arena Clash*: card-battle arena tinted by the active colour |

## How the modes scale

- **Guess Who** stays a duel. With more than 2 in the room the host taps the two duelists in the lobby, and everyone else spectates. Spectators see both boards live (`gw/elim/p<slot>` holds each duelist's crossed-out cards) but never a secret character. They don't read `private/`, they get no end-of-match reveal, and the accused card isn't marked for them.
- **Guess Who screens:** during the match each duelist sees their own pick in a *Your Character* panel left of the board (a compact card above it on phones). It's read once per match from their own `private/` node, so it survives a refresh, and the opponent's pick is never fetched. The verdict shows both players: the opponent on top (left on wide screens) and you below (right). Each side has its accusation (✓ Correct! / ✗ Wrong, or *No accusation*) above its secret character, plus a WINNER / LOST badge.
- **Headbanz:** everyone guesses at once. With N players the 1st right guess scores N points, the next N-1, and so on (8 players: 8, 7, 6 … 1). Giving up or three strikes scores 0. A 2-player game uses the same rule (2 / 1 / 0) over the chosen number of rounds.
- **Imposter:** 3–8 players. One lap = everyone is the imposter once, so the round count follows the table size.
- **Anime UNO:**
  - **Classic deck:** exactly 4 series (red, green, yellow, dark blue), 124 cards.
  - **Chaos deck:** 4–8 series. It adds pink, orange, purple and light blue, and every series adds its 31 cards (248 at 8).
  - **Draw-2s stack:** answer a +2 with a +2 to pass on +4, +6, +8 … or take the whole stack and lose the turn.
  - **Finishing:** a player who empties their hand takes the next place and watches the table, seeing card counts but never hands. The round goes on until every place is decided, then shows the full ranking.
  - **Special cards:** the host picks *Once* (the default: a played Freeze, Swap Hands, Ultimate or Future Sight is out for the rest of the game) or *Reusable* (played specials go back into the draw pile with the rest of the discard pile when it is reshuffled, so they can come round again).
  - **No UNO call:** down to one card, you just keep playing. There is no UNO button and no catch penalty.
  - **Future Sight** reveals the *next* player's hand to the player who used it (everyone else sees the same scene with card backs), then gives one extra play: play one more card or end the turn. Drawing isn't allowed during the extra play. Until it is used, a small reminder of the hand you saw stays next to the table, visible only to you.
  - **Swap Hands** opens an exchange portal: the other players orbit you with their real card counts, and hovering one shows what you'd get.
  - **Wilds** open a colour wheel with one slice per deck colour, showing each series' hero, kanji and name. It works with mouse, touch, and keyboard (arrow keys, then Enter).

**Firebase rules note:** the current rules let any signed-in client read a whole room, `private/` included. The clients listen to the whole room, so Guess Who secrets reach every browser, the opponent's included. Spectator secrecy is therefore enforced by the client. Realtime Database read rules cascade, so a room-level `.read` can't be narrowed for `private/`. Enforcing it on the server would mean moving secrets to their own top-level path (for example `secrets/$room/$uid`, readable only by `auth.uid === $uid`).

## Customising

- **Series art and names:** `ANIME_LIBRARY` and `CHARACTER_NAMES` at the top of `js/game.js`. Every character is named; a name left as `""` would show as *Secret character*.
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

## Look and feel: the red arcade

- **One palette everywhere**, taken from the background art: black as the base, red as the main accent, gold for highlights, borders and what matters, white for text. Every screen (menu, lobby, the four game tables, the dialogs and settings) uses it; each mode keeps its mood with the same four colours.
- **Buttons** are one family across the site: red lacquer with a gold hairline (main), gold (alt), black and gold (ghost), dark red (danger). Hover lifts them with a glow and a shine sweep, pressing sinks them, disabled ones go flat charcoal.
- **Logo.** A red coin with a gold rim and a gold star (the brand mark), *ANIME* in bold white with a red block shadow and a gold edge, *ARCADE* in polished gold and *PARTY* in white on a red band. The lobby header carries the same pieces as a one-line compact logo, and keeps it on phones.
- **First-open splash.** The logo comes in, then a welcome fades in and out (*Welcome, player. Built with love by @e47. Have fun!*), then the menu. Returning players get a shorter one (*Welcome back*), and **Skip** (or a tap, Enter or Esc) goes straight to the menu. It doubles as the loading screen: it leaves only once the app is ready.
- **Mode art** (the menu's cabinets and the lobby's mode cards) shows only each series' main protagonists and main villains, framed in gold: Guess Who has Naruto, Luffy and Ichigo; Headbanz has Goku, Yuji and Tanjiro; Imposter has Madara, Sukuna and Muzan; Anime UNO has Goku, Frieza and Sasuke.

## Menu and lobby

- **Main menu.** The logo over a row of arcade cabinets, one per mode. Each cabinet's screen runs an attract loop; tap one for its rules. **Host a party** is *insert coin*: a coin drops into the slot and the credit counter ticks before the room is made. The join field is a six-cell high-score entry. Your profile is the **arcade pass**: a charcoal card with a thin gold border, a red stripe, white type, a soft gold sheen that follows the pointer and the yellow contact chip.
- **Lobby.** A fighting-game *PLAYER SELECT*. Seats are 1P–8P fighter tiles, a **READY!** band stamps across a tile when that player readies up, and anyone joining mid-lobby gets a *HERE COMES A NEW CHALLENGER!* banner. The modes are a stage select: corner brackets mark the host's pick and every voter's 1P–8P cursor hovers over the mode they voted for. Ready and Start are the big buttons of the same family (Ready turns gold once you are ready), and the status line is an LED board.
- Reduced effects (or the OS reduced-motion setting) turns off the moving floor, tilt, foil and attract loops.

## DIO's Freeze: ZA WARUDO

DIO's Freeze card is a first-person time stop. His arms are crossed in an X (yellow sleeves) and thrown open on the peak of "ZA WARUDO!". Reality turns gold with purple/green interference, holographic tearing and colour split, then everything brakes smoothly to a dead stop in grey. The grey then stays on the **whole page for every player**: a fixed `backdrop-filter` layer (`.zw-veil`) greys the table, cards, UI and any other animation. It lasts while the frozen player (always the next player) still has turns to lose, and the others keep playing under it. When the second skipped turn is spent, the reversal plays: grey → holographic unwind → purple/green → gold → normal, with 時は動き出す ("time moves again").

## Aokiji's Freeze: Ice Age

Aokiji's Freeze is a first-person scene drawn over the real game page. His lazy right hand (tanned, white suit sleeve, blue shirt cuff) slides out of his trouser pocket, drifts over the table and lays its palm flat on it at the voice's peak (4.6 s). Ice grows out of the palm across the actual table, cards and UI to every edge: branching cracks, jagged crystals at the front, a cold chromatic rim, mist and floating crystals. Everything then brakes to a stop. The frozen look is the page's ice veil (`.ice-veil`), revealed by a mask that grows with the wave, so the hold has no seam. It stays on for every player while the next player's 2 turns are skipped, with drifting mist, glints and faint creaks, and stays light enough to keep playing. When the second skipped turn is spent, cracks race over the whole screen and the ice shatters into falling shards as the colour returns. DIO's ZA WARUDO uses the same system (`TS` in `js/game.js`).

## Uraume's Freeze: Ice Formation

Uraume's Freeze (now named Ice Formation, 氷凝呪法) is a first-person scene over the real page. Her hands start folded at the waist in the pale wide-sleeved kimono, and rise together on 霜凪 ("Frost Calm"). A point of pale cold light gathers between the thumbs while the voice builds. On its peak (10.1 s) the hands push forward and the ice bursts out from between them in every direction: six-fold frost lines, delicate crystal flakes on a shimmering front edge, swirling snow and rolling mist. Everything then slows to a stop. The hold is the page's snow veil (`.snow-veil`): a light-blue tint, lace frost, softly falling snow, snow settled on the top edges of the real cards, plates, piles and buttons, and quiet wind and creaks. The break uses finer shards and a flurry of snow blowing away.

## Kurapika's Freeze: Chain Jail

Kurapika's Freeze is a first-person scene over the real page. His right hand is raised in the blue Kurta sleeve with gold trim, and a steel ring sits on every digit with its chain hanging from it: index Steal Chain (syringe), middle Chain Jail (hook), ring Dowsing Chain (pendulum), pinky Judgment Chain (blade), thumb Holy Chain (cross). Only Chain Jail fills with yellow Nen at first. On the voice's peak (3.58 s) the hand thrusts forward and the five chains shoot out of the rings across the real table, cards and UI to the page's edges. Chain Jail coils around the bound player's plate. The Nen floods all five chains, and they tighten and lock at 5.53 s. The routes and the link drawing are shared (`kit.js` `chainRoutes` / `drawChain`), so the page's chain hold (`.chain-veil`) is exactly the scene's last frame: static links, plus a live layer where the Nen pulses along them with sparks and soft creaks. When the bound player's second skipped turn is spent, the chains go slack and grey, snap into pieces that fall away, and dissolve into rising yellow particles.

## Hitsugaya's Freeze: Daiguren Hyorinmaru

Hitsugaya's Freeze is a first-person scene over the real page. Both hands, armoured in blue crystal ice and in black shihakusho sleeves, grip Hyorinmaru: a four-pointed star guard, a teal-wrapped hilt, the crescent blade on its chain, and frost creeping up the blade. He raises it and swings it forward on the voice's peak (3.55 s). A burst of freezing wind follows, and the winged ice dragon pours out of the blade and circles the screen breathing cold. Everything it passes freezes in waves along its path (the veil's mask is the union of circles left behind it), and blue diamond crystals grow as each wave passes. At 9.4 s the ice locks into two layers: the inner frozen sheet (`.hyo-veil`'s tint and frost) and the outer diamond crystals and ice flowers (`kit.js` `crystalField`, shared with the hold). Hyorinmaru stays coiled round the edges, breathing, its eye glowing. The release runs in two stages: the crystals shatter and the dragon roars and dissolves into ice, then after a beat the sheet cracks like glass and falls away.

## Haku's Freeze: Secret Jutsu: Crystal Ice Mirrors

Haku's Freeze is a first-person scene over the real page. His pale hands, in the dark-green sleeves of his hunter-nin outfit, start apart and come together, then run through the seals Ram, Dog and Horse to Tiger. Cold mist and ice motes gather on his fingers as they go. The voice starts 1.6 s into the scene so that its peak lands on the final seal. Blue ice spreads out from his hands across the table, cards, UI and page (`.mirror-veil`, revealed by a growing mask), with a cold shimmer and a slight colour split at its front. Tall frameless ice mirrors rise round the screen, long crystals fly out of them into the middle of the table and stick there around the piles, and time brakes to a stop. The mirrors and crystals (`holds.js`) stay for the frozen player's 2 turns, with a glint travelling over the ice and quiet wind and creaking. The release is a melt, not a shatter: the crystals soften and shrink, the mirrors lose their edges and sink, and the ice turns to slush, then to running drops, with a little steam and soft dripping.

## Hit's Freeze: Time-Skip Freeze

Hit's purple hands come out of the long sleeves of his dark coat, calm and cold. A deep purple aura swells round his arms and crackles out to the screen's edges, peaking with the voice (3.65 s). Light-red ice crystals then grow in from every edge of the screen to the middle (`.skip-veil`, revealed from the edges), and every colour fades to a washed-out light grey in which the real colours barely show. The red ice and faint purple flickers stay for the frozen player's 2 turns, with a low hum now and then. The release: white sparkles with a white aura rise off the table and the cards as the red ice breaks up into them, and the colour comes back. The sparkles then turn purple and stay on the table and cards for one more round, until the turn comes back round to whoever was up at the release, then fade.

## Doma's Freeze: Frozen Lotus

Doma's pale hands, in the wide black sleeves of his robes, hold his two sharp golden fans, each painted with a maroon lotus and a green leaf. Smiling and lazy, he fans himself through "Kekkijutsu", then on "Hasuha Kōri" sweeps both fans outward in one smooth arc. The ice pours off their edges as they pass (4.05 s). It is heavy, rough, layered frost, with cold air rolling over it, a few specks of blood and a thin purple poison mist sitting on it (`.lotus-veil`, its texture drawn by `holds.js` `domaFrost`). It holds with drifting mist, glints and quiet cracking and wind. The release: a wind rises and blows harder and harder, carrying the mist away and cracking the ice, then shatters it into pieces that it carries off the screen, blood and all.

## Julius's Freeze: Time Magic: Time Stop

Julius's hands, in the white sleeves of the Wizard King's robe with their gold cuffs, hold his grimoire open, its pages glowing faintly while he speaks. He lifts it, the pages race, and light-blue magic gathers round the book and his free hand. On the voice's peak (5.05 s) a sphere of time swells out of the book until the whole screen is inside it (`.chrono-veil`). A light-blue bracelet of white Roman numerals wraps round it, and time brakes to a full stop at 6.55 s. While the frozen player's turns run out, the numerals turn slowly, the sphere's surface ripples and a quiet tick sounds now and then. The release is a teleport: the numerals flash, the bracelet spins faster and faster, and the whole sphere collapses into a point of light-blue light and is gone in a quick flash.
