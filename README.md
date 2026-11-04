# Anime Arcade Party

*(formerly Guess Who: Anime Edition)*

A browser party game for a squad of up to 8 friends with eight anime modes in one room:

| Mode | Players | Identity |
|---|---|---|
| **Guess Who** | 1v1 (2–8 in the room) | *Case File*: detective-noir board under a gold desk lamp, swing soundtrack |
| **Headbanz** | 2–8 | *Investigation*: a detective's office at night (desk lamp, venetian-blind light, haze); the cards are suspect photos pinned to a cork case board with red string, stamped SOLVED or COLD CASE, your own card a CLASSIFIED folder; typewriter type, a ticking-clock investigation theme, typewriter / camera-flash / rubber-stamp / desk-bell sounds |
| **Imposter** | 3–8 | *Suspicion*: a dark room in drifting fog, a bulb that won't stop flickering, red eyes opening in the corners; the secret character is a security-camera still (REC, timestamp, scanlines), the imposter sees a hooded silhouette; the vote is a line-up against a height chart; a heartbeat-and-drone theme with whispers, floor creaks and a horror stinger |
| **Anime UNO** | 2–8 | *Arena Clash*: card-battle arena tinted by the active colour |
| **Anime Draft** | 2–8 (Build 1v1–4v4, Auction free-for-all) | *Team Builder*: collectible cards in five rarities on a black and gold stage |
| **Anime Feud** | 2–8 (Team vs Team) | *Game Show*: a classic blue TV studio, buzzer podiums, a marquee-bulb board; game-show sounds (answer ding, wrong-answer buzzer, applause, fanfare) and bouncy show music |
| **Most Likely** | 2–8 (Team vs Team or Free For All) | *Hot Takes*: a dark, fiery argument (smoky glass, embers, two burning cards around a VS crest); fire crackle, clash hits, taiko and an aggressive drum-and-bass theme |
| **Anime Sketch** | 2–8 (everyone draws in turn) | *Draw & Guess*: the art room after hours (a white sheet taped to a dark desk, sticky-note round counter, lined-paper word strip, marker lettering); pencil scribbles, a marimba "got it!", soft pops, a light lo-fi groove |

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

## Anime Draft

Build the strongest six-character team. Everything lives in `js/draft/` (rules, screen, lobby panel) and `css/draft.css`; `js/game.js` only routes to it, so the draft can change without touching the other modes.

- **Series pool.** Tick any of the 18 series (the same picker as Headbanz). Only characters from ticked series are drawn, never twice in a match.
- **Roles (always six slots).**
  - One series ticked: that series' own roles (One Piece: Strength, Speed, IQ, Durability, Haki, Devil Fruit … Death Note: Intelligence, Deduction, Manipulation, Planning, Deception, Psychological Warfare).
  - Two or more: the Mixed roles (Strength, Speed, IQ, Durability, Combat Skill, Special Ability).
  - The **Classic roles** switch replaces either set with Captain, Vice Captain, Tank, Duelist, Healer, Support.
- **Build.** Two sides, 1v1 to 4v4, always shown by their players' names ("Ayla", "Ayla & Cyd"), never as Left / Right; extra players spectate. The host taps players in the lobby to move them to the other side, then to spectate. The first side draws first, then the sides alternate until both have six. On a team, the members take turns (rotating every pick).
  - **Blind reroll:** each side has one per match. Right after a draw you see the name and the picture only; the rarity frame stays hidden until you **Keep**. **Reroll** discards it and draws again (the new one is final). A side whose reroll is spent skips straight to placing.
- **Auction.** Everyone for themselves with $25. A random character is revealed (name, picture, rarity); players bid in seat order, at least $1 above the last bid, or pass (out for that character). The last bidder standing pays and places it in a free role. If nobody bids it is discarded. The next character opens with the next player. Once you are the only player who can still buy (everyone else is full or out of money), you get one pass for the rest of the draft; after that you must buy every character you are shown, so you can't keep passing until a strong one comes up. Your board is on the left, the drawn card in the middle, and any other player's board on the right (tap their name).
- **Stats are sealed during play.** Cards and boards never show a number: you draft on the name, the picture and the rarity. The drawn card always sits in the middle of the screen.
- **Score** = the six role scores + the six rarity bonuses. An empty role scores 0.
- **The final reveal.** The results unseal every team role by role, with the totals counting up, then a winner splash (light rays, a gold title, the champion's avatar, the MVP card = the team's best-scoring character, confetti) and the teams slide into the ranking with their place stamped. Every row shows the character, the role score (with the series multiplier when there is one), the rarity bonus and the total. A tap skips straight to the ranking.
- **Ranking ties:** the higher role-score sum wins (skill beats rarity), then in Auction the player with more money left; still level = shared place.

**Ratings** (`js/draft/data.js`): 472 characters, 18 series, each keyed by its AniList id.
- AniList has no combat stats, so the ratings are our own. Every score (1–100) is measured **inside the character's series**: 100 = the best that series has shown in that category, about 50 = an average named fighter, 1–10 = "can't do this at all". Rows hold the four shared stats, Combat Skill, Special Ability, the series' two own roles and the six Classic roles (Death Note rows hold its six intelligence roles instead).
- **Mixed matches** multiply physical power (Strength, Speed, Durability, Tank, Duelist) and Special Ability by a **series power tier** (`TIERS`: Dragon Ball 1.00 … Wind Breaker 0.40, Death Note 0.30 physical), so Goku and Tanjiro aren't equals. IQ, Combat Skill, Captain, Vice Captain, Healer and Support are not scaled.
- **Guard rails against made-up numbers:** a fixed per-series scale with anchors, one place to edit, and `node tools/draft-check.mjs`, which rejects a row with the wrong length, a value outside 1–100, a duplicate or missing AniList id, a series under 14 characters, or AoT / Gachiakuta "Combat Skill" roles that disagree with the shared Combat Skill. `node tools/draft-test.mjs` runs 109 rule checks (rarity bands, scaling, build turns, rerolls, auction bids, budgets, rankings).
- **Adding characters:** add a row (AniList id, name, 14 scores), run the two tools above, then `node tools/draft-sync.mjs`.

**Rarity** is set **per series by power and story importance**, not popularity (`RANKS` in `js/draft/data.js`): each series' strongest and most central figures are Mythical (Luffy, Roger and Whitebeard; Gojo and Sukuna; Ymir Fritz and Eren …), then Legendary, Epic, Rare, and everyone not listed is Common. Every series has 1–3 Mythicals. Bonuses: Mythical +8, Legendary +6, Epic +4, Rare +2, Common +0 (`RARITIES`). Each rarity has its own frame: steel with rivets (Common), sapphire with gem corners (Rare), amethyst filigree with a breathing aura (Epic), gilded foil with a crown crest, light rays and gold dust (Legendary), and a spinning crimson-and-gold holographic rim with horned corners, embers and a flame aura (Mythical). `node tools/draft-check.mjs` rejects any name in `RANKS` that isn't a character of that series. A match freezes each character's rarity when it is drawn. `data/draft-pop.json` (weekly AniList sync) now only provides pictures.

**Multiplayer.** The match is `rooms/<code>/draft`. Every move (keep, reroll, place, bid, pass) runs in a Firebase transaction that checks the turn, the phase, the money and the free role, so double clicks and races can't both apply. The deck is shuffled once when the match starts and stored, and everyone, spectators included, renders the same state. A player who is offline for 8 s (1.5 s if they left the room) has their turn played by the host: keep, pass (or a $1 bid when a last buyer has used their pass), or the best free role. If a whole Build side leaves, everyone returns to the lobby. Scores are never stored; every client computes them from the placements and the shared ratings.

**Open assumptions (easy to change in `DRAFT_RULES`, `RARITIES` and `TIERS`):**
- Auction turn order is seat order, the opening bid is at least $1, and the next character opens with the next player who can still buy. There is no bid timer. Ties can't happen because each bid must be strictly higher.
- The auction ends when nobody with a free role has money left, or the pool runs out. Roles still empty then score 0 (spending everything early is a risk).
- In Build, the reroll decision shows the name and picture but hides the rarity, since rarity is part of the character's information.
- The power tiers, rarity bands and bonuses are first balancing values.
- Not server-authoritative in the strict sense: like the other modes, the game has no server of its own. The transactions keep honest clients in sync, but a modified client could still write a move out of turn or read the shuffled deck. Real enforcement needs Firebase security rules that validate the move, or a Cloud Function.

## Anime Feud

The team survey game show. Team vs Team only (2–8 players, split as evenly as possible; the host can move players or shuffle). Code: `js/feud/feud.js` (screen, lobby, moves), `js/feud/engine.js` (rules, tested), `js/feud/common.js` (the question library, history and helpers it shares with Most Likely), `css/feud.css`. Its match lives in `rooms/<code>/feud`.

- **A round:**
  - **Face-off.** Every round opens with one player per team at the buzzers (they rotate, so everyone gets a turn). The first to buzz (button or space bar) answers. If nobody buzzes in 15 s, the round's starting team answers first.
  - **Control.** The top answer wins control at once. Otherwise the other face-off player answers: a higher answer (or any answer after a miss) takes control, a lower one or a miss leaves it with the first team. If both miss, the next pair of players goes to the buzzers. Face-off answers count toward the pot; face-off misses are not strikes.
  - **Play or pass.** The team in control chooses PLAY (answer the rest of the board) or PASS (the other team has to play it). No choice in 15 s = play.
  - **The board.** The playing team answers one at a time (the answerer rotates, teammates can talk it through). A right answer opens its row; a wrong answer or running out of the 20/30/45 s clock is a strike. After 3 strikes the other team gets **one** answer: right = they steal the whole pot, wrong = the playing team keeps it. Clearing the board banks the pot with no steal.
  - Typing is forgiving: case, accents, punctuation and "the" are ignored, one typo is allowed (two on long answers, never on numbers: "Gear 3" is not "Gear 5"), part of a long answer counts ("shadow clone"), and a character's first name, last name or nickname works ("Blackbeard", "Deku"). A word that fits two answers ("Uchiha") asks you to be more specific, with no strike.
- **Match.** 3, 5 (default) or 7 rounds; a tie plays one sudden-death question. The final screen shows both scores and every round with who found which answer; Rematch / Back to lobby for the host.
- **Look and sound.** A classic blue TV studio of our own design (royal-blue tiles with gold trim, chasing marquee bulbs, buzzer podiums). Its own sound kit: a two-tone answer ding, a bell run plus applause for the top answer, the wrong-answer buzzer, a buzz-in beep, a drum roll before a steal, a brass fanfare for PLAY and each new round, applause at the end; bouncy game-show music (`show` in `js/audio.js`).
- **Single anime or Anime Mix.** The same series checkboxes as Anime Draft.
  - **One series ticked:** questions written for that series, plus the crossover questions that work for it ("Which One Piece character is the most loyal?").
  - **Two or more ticked:** crossover questions answered **only from the ticked series**. A mixed Classic board needs answers from at least two of them and spreads its 8 slots across them. General anime questions ("Name something an anime villain would never forgive") only appear in a mix.
  - The lobby shows the scope and how many questions fit, and blocks the start if fewer fit than the rounds chosen.

## Most Likely

Its own mode (seventh): two close characters, one question, and an argument about who is MORE likely. Code: `js/feud/likely.js` (screen, lobby, votes), the same rules engine and shared question library as Anime Feud. Its match lives in `rooms/<code>/likely`.

- **Two ways to play** (picked in the lobby):
  - **Team vs Team:** Team Crimson and Team Gold vote at the same moment. A team's pick is its majority; a split team goes with whoever voted first. Before the reveal you only see your own team's votes.
  - **Free For All:** every player votes alone and keeps their own score. Nobody sees anyone else's vote until the reveal. The highest score wins; a tie at the top plays up to three sudden-death duels, then the win is shared.
- **The duel:**
  - Each duel shows **two characters who are close** on the question ("Who is the smartest?": Nami or Doflamingo).
  - The pairs come from the curated Most Likely rankings: neighbours in a series' ranking a few points apart, and in an Anime Mix also two characters of two ticked series with nearly the same score. Ties are never used. The higher-ranked one is the "most likely" answer.
  - Tap a card to vote; you can change it until everyone has voted or the 10/15/20 s clock runs out. Everyone who picks the more likely character scores: 30 for a photo finish, 20 for a close call, 10 otherwise.
  - 5, 10 (default) or 15 duels.
- **Look and sound.** A dark, fiery argument: smoky glass panels, rising embers, a red-burning and a gold-burning card around a crackling VS crest; the winner blazes gold with a MOST LIKELY! stamp, the other card goes to smoke. Its own sound kit: taiko for each new duel, a whoosh and fire crackle when you vote (crackles as the others vote), a clash hit on the reveal then a rising win or a falling miss, the crowd's "ohh"; an aggressive taiko-and-bass theme (`clash` in `js/audio.js`).
- **Series:** the same Single anime / Anime Mix rules and question rotation as Anime Feud (below).

### Question rotation (nothing is banned for good)

Every player keeps a history: `"<questionId>@<scope>": [last seen, times seen]`. The scope is the series key, or `mix`, because "most loyal" for One Piece and "most loyal" for Naruto are different boards. A question is recorded **the moment it is shown**, so a refresh or a quit still counts. When the host needs a question, every eligible one is scored against the **whole room's** histories:

| Signal | Default cooldown | Effect |
|---|---|---|
| Same question (same wording, same scope) | 24 h | strongly lowered, fading back over the cooldown |
| Another wording of the same board | 36 h | strongly lowered |
| Its opposite ("most loyal" after "most likely to betray") | 18 h | partly lowered |
| Same family (Leadership, Survival, …) | 6 h | slightly lowered |

- **Score:** 3 × the share of players who haven't met it (or a rewording) inside its cooldown, + 1.5 × the average freshness, + 0.6 × a restoration term that keeps rising for 7 days after the cooldown, + a little randomness.
- **The pick:** a weighted random one among everything within reach of the best score. Old questions drift back in at random, and one player's history never blocks a question for everyone else.
- **Inside one match:** never the same question twice. Its rewordings, its opposite and its family are avoided too, and those rules are relaxed in that order only if nothing else is left. If even that runs out, the match ends cleanly ("out of questions").
- **Tuning:** the cooldowns, restore window, rounds, timer and board sizes are in `FEUD_RULES` (`js/feud/engine.js`).

### How the library is organised

- **Board** (one ranked answer list = a `variantGroupId`):
  - **Family:** `familyId` (Leadership, Loyalty, Survival …).
  - **Variant type:** `base`, `opposite`, `scenario` or `context`. Every extra wording of the same board is a `reword` and shares its answers.
  - **Opposites** (`opp`, linked both ways) have **their own, separately ranked board**, never the original reversed (`feud-check` rejects a reversed copy).
- **Question:** each wording gets its own id (`x-loyal_2`) and carries every field: questionId, familyId, variantGroupId, variantType, questionType, animeScope, animeIds, category, subcategory, difficulty, polarity, questionText, answers, answerPoints, characterIds, acceptedAliases, curationSource, reviewStatus.
- **Answers** have stable IDs (`x-loyal~onepiece~roronoa-zoro`) and explicit points. Character answers point at Anime Draft roster IDs (AniList), so pictures and names are shared and nothing is downloaded twice.
- **Labelling:** every board is labelled **Anime Arcade curated answers**. The rankings are our own picks, not survey results, and the game says so on the board and the final screen. `ranking: "curated"` and `votes: null` are reserved so real community votes can be added later without changing the format. No votes are invented.
- **Initial library:** 188 questions on 91 boards (55 Classic, 36 Most Likely), 25 families, 10 opposite pairs.
  - **Most Likely:** 20 to 31 questions with close pairs for every series except Gachiakuta.
  - **Classic:** 8 to 16 boards per series. Wind Breaker has 5, enough for 3 rounds.
  - **Gachiakuta** can't be played on its own yet; it works inside a mix. Boards only list answers we are sure of, and there aren't enough of those for Gachiakuta yet.

### Adding questions

1. Open a pack in `js/feud/packs/` (or copy one into a new file and list it in `packs/index.js`). No gameplay code changes.
2. Add a board:
   ```js
   { id: "x-best-cook", fam: "food", cat: "Everyday life", sub: "Cooking", pol: "+", diff: 1,
     q: ["Who is the best cook?", "Whose cooking would you trust at a crossover feast?"],
     a: { onepiece: "Sanji 44; Robin 10; ...", naruto: "..." } }
   ```
   - **Answer lines:** `Answer / alias / alias 30; ...` in Classic, `@Name` for a character in Classic, and plain names in Most Likely. A short unique name is enough ("Zoro").
   - **Template words:** `{a}` becomes "One Piece " in single mode and disappears in a mix. `{s}` becomes the series name(s).
   - **Mode-only wordings:** prefix with `S|` for single mode only, `M|` for mix only.
   - **Series-only boards:** `only: true` makes a board play only for that one series.
   - **Opposites:** `opp: "<board id>"` on both boards.
   - Add new wordings at the **end** of `q` (a wording's id is its position).
3. Run `node tools/feud-check.mjs`. It rejects:
   - a duplicate or non-Firebase-safe id;
   - an unknown or ambiguous character;
   - a missing point value;
   - a series line over 100 points;
   - two answers that accept the same text;
   - a single-series board with fewer than 5 answers;
   - the same wording twice;
   - an opposite that is just the original reversed;
   - a mixed board showing a series that wasn't ticked;
   - blocked words.

   It warns about wordings that are near copies of another board, rewordings that are only a synonym swap, and opposites sharing most of their answers. It then prints what every series and a sample of mixes can play.
4. Run `node tools/feud-test.mjs` (256 checks: matching, filtering, rotation and cooldowns, histories across players and rooms, teams for 2–8 players, every face-off outcome, play or pass, strikes, steals, clears, duel pairs, voting and majorities, Free For All scoring, ties, sudden death, away players, full simulated matches of Anime Feud and of Most Likely in both ways to play for every player count).

### Multiplayer, history and what Firebase can and can't protect

- **Room data:**
  - `rooms/<code>/feud` holds the match: teams, scores, round, the question's ID, the face-off state or the duel, which slots are open, strikes, votes, a turn key and the deadline.
  - Every move (buzz, answer, play/pass, vote, timeout, next question) is a transaction that checks the turn key, phase and player. Two buzzes at the same instant give exactly one winner; eight players voting at once all count; a double click or the host and a stale tab advancing together can never both apply.
  - The host picks each question once and writes it. In Classic every client then rebuilds the same board from the same library, so **unrevealed answers are never written to the room**. A Most Likely duel stores its two characters and which one is right (the vote is resolved inside the transaction), so a player reading the room data in developer tools could see it.
  - The countdown uses the server time offset, so every screen shows the same second. The host's client strikes a guess that runs out of time.
  - **Leaving and reconnecting:**
    - An away answerer is skipped.
    - If the host leaves, the next player takes over the clock and the rounds.
    - A whole team leaving sends everyone back to the lobby.
    - A refresh lands back in the same round.
    - Late joiners watch.
- **History storage:**
  - The history lives in this browser's localStorage, keyed by the Firebase anonymous uid, so it survives normal sessions. It is copied into `rooms/<code>/feudHist/p<N>` (uid-checked) so the host can weigh everyone's.
  - There is **no cross-device history** (anonymous auth has no account linking). Clearing site data starts a fresh history.
- **Rules limitation:**
  - The current database rules only allow writes under `rooms/` (a write to `feudHistory/<uid>` is denied), so the history can't be stored per player in Firebase yet. The code already tries `feudHistory/<uid>` and silently falls back.
  - To turn it on, add this to the database rules (it doesn't loosen anything else):
    ```json
    "feudHistory": { "$uid": { ".read": "auth != null && auth.uid === $uid", ".write": "auth != null && auth.uid === $uid" } }
    ```
- **Hidden answers are not secret from a determined player.**
  - The question library ships with the page, like every other mode's data. Anyone who opens the developer tools can read the boards.
  - Keeping answers truly hidden needs a trusted server (a Cloud Function that holds the boards and checks guesses). This project has none, so the honest guarantee is: answers never travel through the room data, and a normal player never sees them.
  - Like the other modes, a modified client could also write moves out of turn; real enforcement needs validating rules or a Cloud Function.

## Anime Sketch

The eighth mode: one player draws an anime word, everyone else races to guess it. Code: `js/sketch/sketch.js` (lobby, screen, live canvas, chat, duties), `js/sketch/engine.js` (rules, word library builder, tested by `tools/sketch-test.mjs`), `js/sketch/words.js` (a few extra words and a blocklist), `css/sketch.css`.

- **Setup (host):** 1–5 rounds (default 3), 60 / 90 / 120 s to draw (default 90), and the series: one series = its own words, two or more = an Anime Mix from those series only. A round means every active player draws once, so 3 rounds with 4 players = 12 turns.
- **Words:** only **characters, objects and weapons** (no places, attacks, powers, groups or terms), built from what the site already has:
  - `js/sketch/words.js`: each series' recognisable objects and weapons (Senzu Bean, Yoru, Samehada, Death Note, Kurapika's chains…) and important characters the roster lacks (Big Mom, Kiba, Shenron, Mahoraga, Gyokko, Stands…), each with its other accepted spellings;
  - characters from the Anime Draft roster (`js/draft/data.js`, top 30 per series, with AniList ids so the reveal shows their picture) and the fan nicknames;
  - the Anime Feud item boards (items, devil fruits) and its titans, devils and Stands as characters.
  - About 880 words: 40–73 for the big series, 26–27 for Gachiakuta and Wind Breaker (all of their roster plus their objects).
  - A spelling means one word only (the Straw Hat is the hat, not Luffy). A character's single name counts when no other character of that series shares it ("Itachi" for Itachi Uchiha, but not "Uchiha").
- **A turn:**
  - The drawer privately gets 3 words picked at random from the whole pool: three characters, three weapons, or any mix (never one already drawn this match, preferably not one this browser saw lately). 15 s to pick, or one is picked for them.
  - Tools: brush, eraser, 16 colours, 4 sizes, undo (also **Ctrl+Z** / **Cmd+Z** while drawing), clear (with a confirm). The drawing streams live to everyone, spectators included.
  - Guessers type in the chat. Case, accents, punctuation and extra spaces are ignored, the answer inside a sentence counts ("is it luffy?"), and on answers of 6+ letters one slip is fine ("kenjak"). A right guess is **never posted**: the player is told privately and everyone else sees only "Ayla guessed the word!". A guess that is **close** (a word of the answer, nearly one, or its first letters) isn't posted either: only that player sees "so close!". Other wrong guesses show as normal chat.
  - Players who already have it **can't type the answer or anything close to it**; their other messages are shown only to the drawer and the others who have it. The drawer can chat, but nothing close to the word.
  - The turn ends when every active guesser has it or time runs out. The answer and the points show for a few seconds, then the next drawer.
  - After everyone has drawn, a round summary shows each word, who got it and the top 3, then the next round starts.
- **Letter hints:** blanks show the word's shape (spaces and punctuation kept). After 20 s with no right guess a letter is revealed, then another every 15 s still without a new right guess; a right guess restarts that clock. Up to 5 letters: 1 hint; 6–10: 2; 11+: 3. Hints pick distinct letters when possible and never reveal the whole word.
- **Scoring:** first right guess +100, second +75, third +50, everyone after +25. The drawer gets +25 per player who gets it. Nobody right = no points that turn. The final screen ranks everyone (ties share the win) and lists every word drawn.
- **Spectators:** anyone who joins the room during a match watches the canvas, the blanks and the chat but can't guess, draw or score. "Join next round" queues them; they're dealt in when the next round starts (at the end of the drawing order), never in the middle of one.
- **Leaving, disconnecting, the host:**
  - A guesser who leaves no longer blocks "everyone has it".
  - A drawer offline for 6 s loses the turn (points already won stay). Someone offline when their turn comes is skipped for that round.
  - If the host is offline for 8 s, the first online player becomes the host (Rematch, Back to lobby), and the match carries on from where it was.
  - The clock and the next turn never depend on one browser: the host acts first, and every other online player steps in, one after another, a few seconds later if nothing happened. Fewer than 2 players left = back to the lobby.
- **Firebase (rooms/<code>):**
  - `sketch`: the match (players, drawing order, round, turn number, phase, server-time deadline, scores, who guessed it and in what order, the blanks, revealed letters, the turn log). Every move (pick, guess, hint, timeout, next turn, join) is a transaction checked against the turn number and phase, so two right guesses at the same instant are ordered strictly, a repeated guess can't score twice, and a stale tab or a second browser can't advance the game twice.
  - `sketchInk`: one child per stroke piece (colour, width, eraser, points on an 800×600 sheet, the turn it belongs to). Only the drawer writes it; long strokes go out in small pieces about 20 times a second.
  - `sketchChat`: the chat (last 80 shown).
  - All three are cleared when a match starts and when the room goes back to the lobby.
- **How the word stays secret:** the word is not written anywhere in the room while it is being drawn. The drawer's browser publishes only the blanks, a random per-turn salt and salted fingerprints: of each accepted spelling (a right guess), of each spelling with one letter missing (a right guess with a slip), and of each answer word with one letter missing plus its first letters (close: never posted). Each browser checks its own messages against those and only sends a match as a claim. The drawer's browser keeps the word (in localStorage, so a refresh mid-turn keeps it) and writes it to the room when the turn ends.
- **Honest limits:**
  - The word list ships with the page, so someone using the developer tools could test every word in the list against the fingerprints and find the answer, or send a fake "right guess". Like the other modes, real enforcement would need a trusted server (a Cloud Function), which this project doesn't have. A normal player never sees the word.
  - Hints are written by the drawer's browser; if the drawer drops, the turn ends.

## Customising

- **Series art and names:** `ANIME_LIBRARY` and `CHARACTER_NAMES` at the top of `js/game.js`. Every character is named; a name left as `""` would show as *Secret character*. The Guess Who Attack on Titan pack uses `images/anime/aot/aot1.jpg` through `aot24.jpg`, in order: Eren Jaeger, Armin Arlert, Sasha Blouse, Annie Leonhart, Miche Zacharias, Zeke Jaeger, Pieck Finger, Dot Pixis, Jean Kirstein, Ymir (Freed), Onyankopon, Floch Forster, Historia Reiss, Falco Grice, Kenny Ackerman, Hange Zoë, Grisha Jaeger, Bertholdt Hoover, Levi Ackerman, Erwin Smith, Mikasa Ackerman, Reiner Braun, Connie Springer, Gabi Braun.
- **Guess Who picture pranks:** `PRANKS` in `js/game.js` maps a character image to a replacement image shown the first time that character is crossed out in a match. Gojo uses `images/prank.jpg`; Eren uses `images/aot-prank.png`.
- **Series logos:** `images/logos/<series>.png`. A missing file falls back to the text name.
- **Special-card art:** `images/special/<series>_<freeze|swap|ultimate|vision>.(png|jpg|webp)`. Until a file exists, the card shows a kanji emblem. Every cinematic opens on the full picture, framed and never cropped.
- **Special-card voice lines:** `audio/special/<series>_<f|t|u|e>.mp3`. The cinematic lasts as long as the clip (up to 17 s), pulses with the voice's loudness, and pins its key beats to the words of the line (`SYNC` in `js/cine/engine.js`, taken from a transcript of each clip). If you replace a clip, update its pins; pins that no longer fit are relaxed automatically.
- **Win sounds:** `sounds/win/<series>.mp3`. Everyone in the room hears the winner's series.
- **Music:** generated live in `js/audio.js` (the `THEMES` table: tempo, progression, drum patterns, instruments). No files are needed.

## Accessibility and performance

- Every overlay is a dialog that closes with Esc. Game cards and mode cards are keyboard-operable. Buttons have labels.
- Settings has master/music/SFX volume, mute, music on/off and **Reduced effects**. `prefers-reduced-motion` is respected everywhere.
- Ambient particles run at about 30 fps, scale with screen size, and pause when the tab is hidden; the AudioContext suspends too. Effect loops stop by themselves.
- One room listener, one guess listener and one connection listener per client. They are re-used across matches and removed on leave.

## Look and feel: the red arcade

- **One palette everywhere**, taken from the background art: black as the base, red as the main accent, gold for highlights, borders and what matters, white for text. Every screen (menu, lobby, the four game tables, the dialogs and settings) uses it; each mode keeps its mood with the same four colours.
- **Buttons** are one family across the site: red lacquer with a gold hairline (main), gold (alt), black and gold (ghost), dark red (danger). Hover lifts them with a glow and a shine sweep, pressing sinks them, disabled ones go flat charcoal.
- **Logo.** The flame **A** emblem (one SVG symbol, `#aa-mark` in `index.html`, also the favicon `images/aa-mark.svg`): a gold A with a fire core in place of its counter, readable down to 16 px. Beside it a two-line wordmark: *ANIME* in bold white with a dark-red offset, *ARCADE* in spaced polished gold, and a small red *PARTY* tag. The lobby header carries the same emblem with a one-line wordmark.
- **Intro.** Black screen, white type: *Welcome, Player!* (or *Welcome back, [name]!* once a display name is set on the Arcade Pass; read fresh from the saved profile each time the page opens), then *Anime Arcade Party — built with love by @e47. Have fun!*, then the logo ignites, then the menu. Returning players get a shorter one; **Skip** (or a tap, Enter, Space or Esc) jumps to the end. It doubles as the loading screen: it leaves only once the app is ready, and says so if the server is slow. A new player is asked for a name only after it has played.
- **Mode art** (the menu's game cards and How to Play panel, and the lobby's mode cards) shows only each series' main protagonists and main villains: Guess Who has Naruto, Luffy and Ichigo; Headbanz has Goku, Yuji and Tanjiro; Imposter has Madara, Sukuna and Muzan; Anime UNO has Ace, Jotaro and Sasuke; Anime Draft has Luffy, Gojo and Eren; Anime Feud has Nezuko, Mahito and Kid Buu; Most Likely has Goku Black, Zeke and Broly; Anime Sketch has Naruto/Pain, Ichigo and Gojo.

## Menu and lobby

- **Main menu** (`css/menu.css`; the cards and panel are built by `buildHomeModes` / `pickGuide` in `js/game.js`).
  - **Hero:** the logo, the tagline, **Host a party** (*insert coin*: a coin drops into the slot and the credit counter ticks before the room is made), the six-cell room-code entry, and the counts (games, players, one room code). Fire is used as light: a slow ember glow along the floor and embers drifting up.
  - **Arcade Pass:** a notched collectible card on smoked glass with a gold edge that follows the notches, the player's colour as a foil stripe and avatar ring, a faint emblem watermark, a sheen that follows the pointer, the contact chip, a level tag, the XP bar and the hi-score table as four tiles. Edit player card as before.
  - **Pick your game / How to play:** one card per mode, then the How to Play panel for the picked one (the same rules as the in-room rules sheet, each with a short headline, plus player count and format). The cards are a tablist (arrow keys, Home, End); the last pick is remembered. **Host a … party** opens a room already on that game.
  - **Each mode has its own skin**, shared by its card and its panel: Guess Who a noir case file with a magnifying glass and yellow evidence markers; Headbanz a polaroid pinned to a cork case board with typewriter type; Imposter red eyes in the dark, scanlines and a glitch; Anime UNO a playing card ringed in the four deck colours; Anime Draft a foil trading card with rarity gems; Anime Feud a blue studio panel ringed with marquee bulbs; Most Likely two sides split by a burning seam with a VS badge; Anime Sketch a taped sheet with a pencil-sketch picture and marker lettering. Adding a mode = an entry in `MODES`, `RULES` and `GUIDE` (game.js) and one `[data-mode]` block in `menu.css`.
  - **Discord: @47** sits small in the bottom-left corner.
- **Lobby.** A fighting-game *PLAYER SELECT*. Seats are 1P–8P fighter tiles, a **READY!** band stamps across a tile when that player readies up, and anyone joining mid-lobby gets a *HERE COMES A NEW CHALLENGER!* banner. The modes are a stage select: corner brackets mark the host's pick and every voter's 1P–8P cursor hovers over the mode they voted for. Ready and Start are the big buttons of the same family (Ready turns gold once you are ready), and the status line is an LED board.
- **The lobby wears the picked mode** (`css/lobby.css`, switched by `lobbyTheme` in `js/game.js`). It reuses each mode's skin from the menu's How to Play panel across the whole lobby:
  - **Guess Who:** a noir dossier under a desk lamp, yellow evidence-marker seat numbers, gold buttons.
  - **Headbanz:** a cork case board with pinned cream polaroid seats and typewriter names.
  - **Imposter:** fog, scanlines, red eyes in every seat, crimson buttons.
  - **Anime UNO:** seats as playing cards ringed in the four deck colours.
  - **Anime Draft:** foil trading-card seats, rarity-gem numbers, gold foil.
  - **Anime Feud:** a royal-blue studio with marquee-bulb seat frames.
  - **Most Likely:** smoke, embers and a burning seam.
  - **Anime Sketch:** taped paper seats, marker lettering, a lined-paper ruleset.
  - What changes with the mode: the backdrop (it crossfades), the seats, the ruleset panel, option and main buttons, the room tag, the status board, the section titles and the ambient particles. The stage-select cards always wear their own mode's lettering. It is visual only: the same lobby logic runs underneath.
- Reduced effects (or the OS reduced-motion setting) turns off the lobby's moving floor, the menu's ember glow, tilt, foil and the cards' small loops.

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
