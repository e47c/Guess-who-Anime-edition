# Anime Arcade Party

*(formerly Guess Who: Anime Edition)*

A browser party game for a squad of up to 8 friends with ten anime modes in one room (the ninth, Anime TCG, is a trading card game; the tenth, Night Party, a tournament of the others), plus a Shop for cosmetics and a Wardrobe for your Arcade Pass:

| Mode | Players | Identity |
|---|---|---|
| **Guess Who** | 1v1 (2–8 in the room) | *Case File*: detective-noir board under a gold desk lamp, swing soundtrack |
| **Headbanz** | 2–8 | *Investigation*: a detective's office at night (desk lamp, venetian-blind light, haze); the cards are suspect photos pinned to a cork case board with red string, stamped SOLVED or COLD CASE, your own card a CLASSIFIED folder; typewriter type, a ticking-clock investigation theme, typewriter / camera-flash / rubber-stamp / desk-bell sounds |
| **Imposter** | 3–8 | *Suspicion*: a dark room in drifting fog, a bulb that won't stop flickering; the secret character is a security-camera still (REC, timestamp, scanlines), the imposter gets the same camera showing only drifting black smoke; the vote is a line-up against a height chart; a heartbeat-and-drone theme with whispers, floor creaks and a horror stinger |
| **Anime UNO** | 2–8 | *Arena Clash*: card-battle arena tinted by the active colour |
| **Anime Draft** | 2–8 (Build 1v1–4v4, Auction free-for-all) | *Team Builder*: collectible cards in five rarities on a black and gold stage |
| **Anime Feud** | 2–8 (Team vs Team) | *Game Show*: a classic blue TV studio, buzzer podiums, a marquee-bulb board; game-show sounds (answer ding, wrong-answer buzzer, applause, fanfare) and bouncy show music |
| **Most Likely** | 2–8 (Team vs Team or Free For All) | *Hot Takes*: a dark, fiery argument (smoky glass, embers, two burning cards around a VS crest); fire crackle, clash hits, taiko and an aggressive drum-and-bass theme |
| **Anime Sketch** | 2–8 (everyone draws in turn) | *Draw & Guess*: the art room after hours (a white sheet taped to a dark desk, sticky-note round counter, lined-paper word strip, marker lettering); pencil scribbles, a marimba "got it!", soft pops, a light lo-fi groove |
| **Anime TCG** | 1–8, everyone at their own pace | *Card table*: picking it in the lobby shows its panel with an **Enter Anime TCG** button that opens each player's own Anime TCG page (Packs Store, Collection, Decks, Battle) on a playmat, with a binder, deck boxes and a duel board; card battles are challenges between players in the room, 1v1 or free-for-all, watchable by the rest |
| **Night Party** | 2–8 | *Festival night*: a tournament that runs the other modes as stages; see below |

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
    - **Diavolo · King Crimson** plays in first person: your hands at the bottom of the screen, the Epitaph (the blurred future: the next player's cards) up where your forehead is. Your hand rises on the loudest moment of "KING CRIMSON!", King Crimson's hands come out around yours, the screen turns red and 4 drops of blood land. In the void, the cards are gathered and turned one by one in slow motion, each losing the Epitaph's blur as it turns. Then time skips: a flash, 4 more drops, and you are back at the table, with the cards in a King Crimson-framed reminder until your extra play.
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
- **Build.** Two sides, 1v1 to 4v4, always shown by their players' names ("Ayla", "Ayla & Cyd"); extra players spectate. The host taps players in the lobby to move them to the other side, then to spectate.
  - **Picking (split screen, the whole height).** Your side's six roles on the left, the other side's on the right, a big VS in the middle with **both pulls side by side** (name, series, rarity; stats sealed). Both sides pick **at the same time**: tap a free role for your pull and the next one is drawn. Each pull has a **pick timer** (`pickSec`, 60 s); when it runs out the host puts it in the side's first free role, top to bottom. One **reroll** per side per match swaps the current pull for a fresh one (with a fresh timer). The other side's filled roles only show as **LOCKED**: nobody, spectators included, sees which character went where until the clash. On a team (2v2 to 4v4) the side's members take turns placing (rotating every pick, an away member is skipped); everything else is the same as 1v1.
  - **The clash** (replaces the old results list). When both boards are full, both teams are revealed, then the roles fight **one by one, top to bottom**: the two characters face each other, clash, and a bar compares that role's stat. The higher stat dominates and scores 1 (equal = **Draw**, nobody scores). A running score shows after each role; the final role gets a bigger, slower clash. **Most roles wins; tied on roles, the higher stat total wins; tied again it's a draw** (the host gets **Rematch**). Then the summary: every role with both characters, both stats and who took it, the role score and the totals. **Skip animations** jumps to the summary on that screen; Reduced effects plays a quick fade-and-compare with no shake or particles. The clash is timed from one start (`s.clash.at`, server clock), so every screen, spectators included, sees the same role at the same time; the host ends the match when it's over (`DRAFT_RULES.clash`), and only then is the result reported (coins, Night Party).
  - **Stat** = the character's score in that role, the same number the Auction counts (with the series power tier in Mixed matches). Rarity is shown but adds nothing in Build.
- **Auction.** Everyone for themselves with $25. A random character is revealed (name, picture, rarity); players bid in seat order, at least $1 above the last bid, or pass (out for that character). The last bidder standing pays and places it in a free role. If nobody bids it is discarded. The next character opens with the next player. Once you are the only player who can still buy (everyone else is full or out of money), you get one pass for the rest of the draft; after that you must buy every character you are shown, so you can't keep passing until a strong one comes up. Your board is on the left, the drawn card in the middle, and any other player's board on the right (tap their name).
- **Stats are sealed during play.** Cards and boards never show a number: you draft on the name, the picture and the rarity.
- **Auction score** = the six role scores + the six rarity bonuses. An empty role scores 0.
- **Auction final reveal.** The results unseal every board role by role, with the totals counting up, then a winner splash (light rays, a gold title, the champion's avatar, the MVP card = the best-scoring character, confetti) and the players slide into the ranking with their place stamped. Every row shows the character, the role score (with the series multiplier when there is one), the rarity bonus and the total. A tap skips straight to the ranking.
- **Auction ties:** the higher role-score sum wins (skill beats rarity), then the player with more money left; still level = shared place.
- **The reported result** (coins, Night Party) is unchanged in shape: Build = the clash winner 1st and the loser 2nd (a draw = both 1st), score = the stat total; Auction = the ranking.

**Ratings** (`js/draft/data.js`): 831 characters, 18 series, each keyed by its AniList id (One Piece 66, JoJo 64, Bleach 62, HxH 57, Naruto 56, MHA 56, Dragon Ball 53, JJK 50, Black Clover 49, Demon Slayer 45, AoT 44, Re:Zero 44, Chainsaw Man 37, Fire Force 35, Death Note 32, Frieren 32, Gachiakuta 26, Wind Breaker 23).
- AniList has no combat stats, so the ratings are our own, and every one is judged on what the character has **shown** in the anime / manga, never on popularity, fame or story role. Every score (1–100) is measured **inside the character's series**: 97–100 the series' best in that category (at most 3 per category), 88–96 elite, 75–87 high, 55–74 a solid named fighter, 35–54 below average, 11–34 weak, 1–10 can't do it at all.
- **Each category is judged on its own.** Strength = physical force (a destructive power counts in Special, not Strength); Speed = movement, reactions, combat speed; IQ = intellect, strategy, knowledge (not battle instinct); Durability = toughness and defensive abilities, and **regeneration is not durability** (Marco, Denji, Hakari, Elsa are rated on their toughness; their healing counts in Special or the series' Regeneration role); Combat Skill = technique, experience, weapon mastery; Special Ability = the signature power itself (Mihawk, Garp, Rayleigh and Zoro have no Devil Fruit, so they are low there; L, Near and Mello have no supernatural power).
- **One version per character, for all of its numbers**, written next to the reasons (Luffy = Gear 5, Goku = Ultra Instinct in the Super manga, Gon = before the adult transformation, since that was a one-time sacrifice). Where canon is thin (Gachiakuta, Wind Breaker, Kraft, Aramaki …) the number is conservative and the reason says so.
- **Every row has a written reason** in `js/draft/basis.js` (the version rated and the feats behind it), which the game never loads.
- Rows hold the four shared stats, Combat Skill, Special Ability, the series' two own roles and the six Classic roles (Death Note rows hold its six intelligence roles instead).
- **Mixed matches** multiply physical power (Strength, Speed, Durability, Tank, Duelist) and Special Ability by a **series power tier** (`TIERS`: Dragon Ball 1.00 … Wind Breaker 0.40, Death Note 0.30 physical), so Goku and Tanjiro aren't equals. IQ, Combat Skill, Captain, Vice Captain, Healer and Support are not scaled.
- **The review (`node tools/draft-check.mjs`)** rejects: a row with the wrong length, a value outside 1–100, a duplicate or missing AniList id, a series under 14 characters, AoT / Gachiakuta "Combat Skill" roles that disagree with the shared Combat Skill, a row without a written reason, **a broken canon comparison** (`FEATS` in basis.js, e.g. "STR Edward Newgate > Monkey D. Luffy", "SPD Minato > A", "DUR Marco < Kaido", "SPC Mihawk <= 50"; about 150 of them), and more than 3 characters of a series at 97+ in one category. It warns when over a quarter of a series sits at 90+ in a category, and lists anyone whose six stats are all within 8 points (a sign of rating by overall power; only true all-rounders like Meruem, Sukuna and the Angels remain). `node tools/draft-test.mjs` runs the rule checks (rarity bands, scaling, simultaneous Build picks, timers and auto-picks, rerolls, the clash and its tiebreaks, auction bids, budgets, rankings).
- **Adding characters:** add a row (AniList id, name, 14 scores) and its reason in `js/draft/basis.js`, run the two tools above, `node tools/feud-check.mjs` (a new name can make a short Feud answer such as "Yami" ambiguous), then `node tools/draft-sync.mjs` for the picture.

**Rarity** is set **per series by power and story importance**, not popularity (`RANKS` in `js/draft/data.js`): each series' strongest and most central figures are Mythical (Luffy, Roger and Whitebeard; Gojo and Sukuna; Ymir Fritz and Eren …), then Legendary, Epic, Rare, and everyone not listed is Common. Every series has 1–3 Mythicals. Bonuses: Mythical +8, Legendary +6, Epic +4, Rare +2, Common +0 (`RARITIES`). Each rarity has its own frame: steel with rivets (Common), sapphire with gem corners (Rare), amethyst filigree with a breathing aura (Epic), gilded foil with a crown crest, light rays and gold dust (Legendary), and a spinning crimson-and-gold holographic rim with horned corners, embers and a flame aura (Mythical). `node tools/draft-check.mjs` rejects any name in `RANKS` that isn't a character of that series. A match freezes each character's rarity when it is drawn. `data/draft-pop.json` (weekly AniList sync) now only provides pictures.

**Multiplayer.** The match is `rooms/<code>/draft`. Every move (reroll, place, bid, pass) runs in a Firebase transaction that checks the side or turn, the phase, the money and the free role, so double clicks and two sides picking at the same instant can't clash. The deck is shuffled once when the match starts and stored, and everyone, spectators included, renders the same state. A player who is offline for 8 s (1.5 s if they left the room) has their move played by the host until they're back: pass (or a $1 bid when a last buyer has used their pass), or the best free role (in Build: every pull of theirs goes to the first free role, top to bottom). If a whole Build side leaves, everyone returns to the lobby. Scores are never stored; every client computes them from the placements and the shared ratings.

**Open assumptions (easy to change in `DRAFT_RULES`, `RARITIES` and `TIERS`):**
- Auction turn order is seat order, the opening bid is at least $1, and the next character opens with the next player who can still buy. There is no bid timer. Ties can't happen because each bid must be strictly higher.
- The auction ends when nobody with a free role has money left, or the pool runs out. Roles still empty then score 0 (spending everything early is a risk).
- Build: the pick timer is 60 s per pull and the clash runs about 25 s (`pickSec`, `clash`, `clashLite`). The other side's roles are hidden on screen, but like every mode the match data is in the room, so a modified client could read it.
- The power tiers, rarity bands and bonuses are first balancing values.
- Not server-authoritative in the strict sense: like the other modes, the game has no server of its own. The transactions keep honest clients in sync, but a modified client could still write a move out of turn or read the shuffled deck. Real enforcement needs Firebase security rules that validate the move, or a Cloud Function.

## Anime Feud

The team survey game show. Team vs Team only (2–8 players, split as evenly as possible; the host can move players or shuffle). Code: `js/feud/feud.js` (screen, lobby, moves), `js/feud/engine.js` (rules, tested), `js/feud/common.js` (the question library, history and helpers it shares with Most Likely), `css/feud.css`. Its match lives in `rooms/<code>/feud`.

- **A round:**
  - **Face-off.** Every round opens with one player per team at the buzzers (they rotate, so everyone gets a turn). The first to buzz (button or space bar) answers. If nobody buzzes in 15 s, the round's starting team answers first.
  - **Control.** The top answer wins control at once. Otherwise the other face-off player answers: a higher answer (or any answer after a miss) takes control, a lower one or a miss leaves it with the first team. If both miss, the next pair of players goes to the buzzers. Face-off answers count toward the pot; face-off misses are not strikes.
  - **Play or pass.** The team in control chooses PLAY (answer the rest of the board) or PASS (the other team has to play it). No choice in 15 s = play.
  - **The board.** The playing team answers one at a time (the answerer rotates, teammates can talk it through). A right answer opens its row; a wrong answer or running out of the 20/30/45 s clock is a strike. After 3 strikes the other team gets **one** answer: right = they steal the whole pot, wrong = the playing team keeps it. Clearing the board banks the pot with no steal.
  - Typing is forgiving: case, accents, punctuation, spaces and "the" are ignored ("gumgum pistol"), romanisations are folded ("Gojou" = "Gojo", "Kyoujurou" = "Kyojuro"), one typo is allowed (two on long answers, never on numbers: "Gear 3" is not "Gear 5", "Super Saiyan 4" is not "Super Saiyan"), part of a long answer counts ("shadow clone"), and a character's first name, last name, nickname, title or other romanisation works ("Blackbeard", "Kurohige", "Big Mom", "Akainu", "Deku", "Uravity", "Barusu", "Gokuu Son"). A word that fits two answers ("Uchiha") asks you to be more specific, with no strike. A sentence naming several things is not accepted.
  - Aliases are structured, not guessed: the board's own spellings, `js/feud/nicknames.js` and `js/feud/aliases.js` (hand-reviewed nicknames and titles plus every character's AniList name in its other word order; an alias that is also another character's name in that series is dropped).
  - **A right answer that didn't make the board** is told so ("Charlotte Linlin fits, but didn't make this board"). It is still a strike: only the answers on the board score.
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
  - The pairs come from the Most Likely rankings: neighbours in a series' ranking a few points apart, and in an Anime Mix also two characters of two ticked series with nearly the same score. Ties are never used. The higher-ranked one is the "most likely" answer.
  - **Personality duels** (kinder, crueler, more loyal, would betray first, more honest, the better liar, braver, calmer under pressure, holds a grudge, forgives, biggest ego, lazier, more mature, falls in love faster, better with kids, changed the most …) come from **character trait scores** (`js/feud/packs/traits.js`): 271 characters from all 18 series, each scored 0–9 only on the traits their story clearly shows, with a note on what they do in canon. A character is judged the same way on every question. A duel pairs two characters 2–5 points apart (2–4 across series), and the right answer always clearly shows the trait (5+). A pair that would win two opposite questions (Zoro trains hardest *and* naps most) is never asked. Labelled "Canon behaviour · editors' trait scores". The audit is `docs/most-likely-audit.md`.
  - **Opinion duels** (who'd survive a zombie outbreak, the worst roommate …) are our editors' poll and say so above the question. Nobody is on a question and on its opposite. **Rating duels** (who is faster, physically stronger, harder to hurt, the better fighter, smarter) compare the two characters' Anime Draft ratings, and never pair two series, since those ratings are measured inside each series.
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
- **What kind of question, and how it's ranked** (`kind`, shown above every question in the game):
  - **Canon** (`kind: "canon"`): every answer is a canon fact (a Hashira, a Devil Fruit, a villain of the story). Character answers are ranked by **AniList popularity** (`rank: "fans"`: the order comes from AniList favourites, the points follow a fixed survey-like curve), names of techniques, places and items by how well-known they are (`rank: "known"`, our estimate). Boards list every valid answer they can: the top 8 are shown.
  - **Feats** (`kind: "feats"`): generated from the Anime Draft ratings (`gen: { stat }`), one category each: speed, physical strength, durability, combat skill or intelligence. They can never disagree with the Draft.
  - **Power** (`kind: "power"`): overall strength ("one of the strongest"), ranked by canon outcomes; the decisive ones are written on the board (`beats`) and checked.
  - **Opinion** (`kind: "poll"`): personality and scenario questions and anime tropes. The ranking is our editors' poll and the game labels it as such; it is never presented as canon. Opinion boards about a rated quality (`agree`, e.g. "least book-smart", "best strategist") may not contradict the ratings.
  - `ranking` and `votes: null` stay reserved for real community votes later. No votes are invented.
- **Library (audited Nov 2026):** 284 questions on 139 boards (84 Classic, 55 Most Likely). 60 canon, 10 feats, 1 power, 27 trait, 41 opinion boards. Every series, Gachiakuta included, now has a Classic pool and rating duels. The audit report is `docs/feud-audit.md`.

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
   - **Kind:** `kind: "canon"` (+ `rank: "fans"` or `"known"`), `"feats"` (+ `gen: { stat: "SPD", top: 8, skip: [...] }`, no answers needed), `"power"` (+ `beats: { series: [[winner, loser]] }`), `"traits"` (Most Likely only, + `trait: { key: "K" }`, `inv: true` for the opposite reading, `need: { K: 5 }` to require another trait; no answers needed) or `"poll"`; `why` says what the ranking rests on.
   - **Character traits** (`js/feud/packs/traits.js`): add or change a character's scores there (`"L9 K7 H9 ..."`, only traits the story clearly shows, plus a note). `ANCHORS` lists canon facts the scores must agree with.
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
   - blocked words;
   - a board without a kind / ranking basis;
   - a "power" board that ranks a character above someone who beat them in canon;
   - an opinion board that contradicts the Anime Draft ratings it's checked against (`agree`);
   - a Most Likely opinion board that shares a character with its opposite;
   - a trait row that isn't exactly one Anime Draft character, has a bad score or no note; a score that breaks a story anchor; a character scored very kind and very cruel (or honest and a liar, hard-working and lazy; loyal and a betrayer unless the note explains it); two opposite trait questions giving the same pair the same winner.

   It also warns when AniList popularity has drifted away from a "fans" board's order.

   It warns about wordings that are near copies of another board, rewordings that are only a synonym swap, and opposites sharing most of their answers. It then prints what every series and a sample of mixes can play.
4. Run `node tools/feud-validate.mjs` (186 answer checks: full names, first and last names, nicknames, titles, Japanese and other romanisations, spacing, slightly longer answers; and wrong, vague or numbered answers that must NOT be accepted).
5. Run `node tools/feud-test.mjs` (264 checks: trait duels, matching, filtering, rotation and cooldowns, histories across players and rooms, teams for 2–8 players, every face-off outcome, play or pass, strikes, steals, clears, duel pairs, voting and majorities, Free For All scoring, ties, sudden death, away players, full simulated matches of Anime Feud and of Most Likely in both ways to play for every player count).

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

The eighth mode, with two game types. **Classic:** one player draws an anime word, everyone else races to guess it. **Contest:** everyone draws the same word, then rates each other's drawings (see [Contest](#contest-the-second-game-type) below). Code: `js/sketch/sketch.js` (lobby, screen, live canvas, chat, duties), `js/sketch/engine.js` (rules, word library builder, tested by `tools/sketch-test.mjs`), `js/sketch/words.js` (the word library), `css/sketch.css`.

- **Setup (host):** game type (Classic or Contest), 1–5 rounds (default 3), 60 / 90 / 120 s to draw (default 90), **word difficulty** (Mixed, Easy, Medium, Hard; default Mixed), and the series: one series = its own words, two or more = an Anime Mix from those series only. A round means every active player draws once, so 3 rounds with 4 players = 12 turns.
- **Words** (`js/sketch/words.js`): **1,067 words** in three categories per series: **Characters** (621, Stands, Titans and devils included), **Weapons** (153) and **Objects & Items** (293). No places, attacks, powers or groups.
  - Every word is tied to its series and drawable, and has a **difficulty**: easy (very recognisable: Luffy, Straw Hat, Kunai), medium, hard (detailed or less obvious: Shusui, Hyottoko mask, Mechamaru). 189 easy, 391 medium, 487 hard.
  - Each word lists its other accepted spellings (Big Mom / Charlotte Linlin, Kizaru / Borsalino, Wind chime / furin). Characters are linked to the Anime Draft roster, so the reveal shows their AniList picture.
  - A spelling means one word only (the Straw Hat is the hat, not Luffy). A character's single name counts when no other character of that series shares it ("Itachi" for Itachi Uchiha, but not "Uchiha").
  - Per series (characters / weapons / objects & items): One Piece 41/20/29, Naruto 43/17/23, Dragon Ball 40/6/22, Jujutsu Kaisen 36/12/17, Demon Slayer 37/12/18, Bleach 34/16/17, Attack on Titan 38/7/18, My Hero Academia 41/8/17, Hunter x Hunter 37/9/15, Death Note 24/2/22, Chainsaw Man 32/8/10, Black Clover 34/6/13, JoJo 52/8/14, Re:Zero 35/6/12, Fire Force 28/5/11, Frieren 28/5/11, Gachiakuta 23/6/11, Wind Breaker 18/0/13. Death Note and Wind Breaker hardly use weapons, so their weapon slot is filled from the other two lists rather than with made-up weapons.
- **A turn:**
  - The drawer privately gets 3 words: **one Character, one Weapon and one Object & Item**, each card showing its category and difficulty, so no category dominates (a series short on one category fills that slot from the others). With a difficulty set, every drawer gets words of that level (the next level only if one runs out). Never a word already drawn this match, preferably not one this browser was offered lately. 15 s to pick, or one is picked for them.
  - **Tools:** brush and eraser (each keeps its own size), a size slider (2–48), 16 colours plus a custom colour picker, undo and **redo**, clear (with a confirm). A ring under the cursor shows the brush or eraser size at the current zoom. Strokes are smoothed (curves through the points) and finer when zoomed in.
  - **Shortcuts** (drawer only, never while typing in the chat): **Ctrl+Z** undo, **Ctrl+Y** or **Ctrl+Shift+Z** redo (Cmd on a Mac), **B** brush, **E** eraser, **[ ]** smaller / bigger, hold **Space** and drag to pan. In the chat box, Ctrl+Z still undoes your typing.
  - **Zoom** (every player, their own view): **Ctrl + mouse wheel** zooms around the cursor (a trackpad pinch too) without zooming the page; the **− / + / reset** buttons and the percentage sit on the sheet's corner; 100% to 400%. Zoomed in, the wheel (Shift + wheel: sideways), a middle or right drag, Space + drag, or for guessers a plain drag pans the view; on a phone, two fingers pinch and pan. Zooming only changes the view: strokes stay on the shared 800×600 sheet, so everyone sees the same drawing whatever their screen or zoom, and the sheet is redrawn sharply at every zoom level. Each new turn starts at 100%.
  - The drawing streams live to everyone, spectators included. "TIME'S UP!" / "EVERYONE GOT IT!" banners close a turn, and the sheet flashes when someone guesses right.
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

### Contest (the second game type)

Picked under **Game type** in the lobby (Classic / Contest; default Classic). Everyone draws the **same word at the same time**, then everyone rates everyone else's drawing. The rules live in `engine.js` (`actContest`): a contest match is marked `type: "contest"`, and `act()` hands only those matches to it, so Classic never runs Contest code.

- **Setup:** the same options as Classic. Rounds (1–5) = words, drawing time (60 / 90 / 120 s), word difficulty and the series. Best with 3 or more players (2 works: each rates the other).
- **A round:**
  - **Draw:** one word for everyone, shown openly with its category. The categories take turns: character, weapon, then object & item, starting at a different one each match. A word is never repeated within a match. Each player draws on their own sheet with the full Classic toolset. Nobody sees anyone else's sheet while drawing, and Clear wipes only your own. **✔ I'm done** ends your drawing ("Keep drawing" undoes it while time is left). Drawing ends when everyone still here is done or time runs out.
  - **Rate:** the drawings are shown **big, one at a time and without names** (Drawing A, B, C… in the same shuffled order in every browser), in the sheet's place. Each one is up for **15 s**, and the next comes as soon as everyone still here who can rate it has (after a short grace to change a star). Give it **1 to 5 stars** by tapping, or press keys 1–5. Your own comes up too, marked YOURS, and can't be rated. The drawings already shown sit in a strip below, where you can still change your stars until rating ends. The strip shows how many of the ratings for the current drawing are in. The player list doesn't show who has rated, because that would give away whose drawing is up.
  - **Results:** names are revealed. Each drawing shows its stars received, average and number of ratings; the best one gets a crown, and the character's picture appears with the word. After 10 s the next round starts.
- **Scoring:** your points are the total stars your drawings receive. A rating that never comes (a player who ran out of time or left) just gives no stars. The highest total after the last round wins, and a tie is a shared win. The final screen lists everyone's average stars and how many rounds they won, and shows the best drawing of each round. Those pictures are kept in each browser during the match; someone who joined late may not have the earlier ones.
- **Joining, leaving:** spectators can join from the next round. A player who was offline when a round began steps in automatically if they're back while it's still being drawn. Someone who leaves no longer blocks "everyone is done / has rated". Fewer than 2 players at the start of a round ends the match. The host duties and the host takeover work as in Classic.
- **Firebase:** the same three nodes. In `sketch` a contest holds the public word, the round's artists (`ent`), who is done, the ratings (`rt`, rater → drawing → stars), the gallery order and a round log with every drawing's stars. Every move (done, rate, timeout, check, next, join) is a transaction checked against the round number. Moves that end a phase name it, and the rating moves name the drawing on screen (`gi`), so a late duplicate can't skip one. In `sketchInk` each stroke also carries its owner (`o`). The previous round's strokes are deleted when the next round starts.
- **Honest limit:** the strokes and ratings are in the shared room, so someone using the developer tools could peek at other sheets while drawing, or see who gave which stars. Normal players can't.

## ANIME TCG (mode 9), the Shop, the Wardrobe and the economy

**One currency: AAP Coins.** The arcade **CREDIT** counter at the top of the main menu is the AAP Coin balance (live);
the same balance shows in the lobby, in the Shop, on the Anime TCG page and next to every price (coin icon). The CREDIT
counter and the lobby's coin chip open the Shop. Shards are not a currency: they are what duplicate cards turn into, and
they only craft packs.

**The Shop** (`js/vault/shoppage.js`, `css/shop.css`) is its own section, not a game mode: the storefront tile under the
logo on the main menu, or the Shop button at the top of the lobby (a full-screen sheet over the lobby, so closing it
returns to the same room with everyone still there). Season 1 skins (Frame + Background per tier, bundle -20%) and
scratch cards (Basic / Silver / Gold -> titles, title skins, username styles). The try-on is your Arcade Pass. Buying
never equips: after every purchase and every new scratch prize, **Equip now** (sits next to Keep browsing) equips it in
the right slot at once and shows it on the pass; otherwise equip it later in the Wardrobe.

**The Wardrobe** (`js/wardrobe.js`) is "Edit player card": display name, profile picture (gallery or upload, accent
colour), Frame (Season 1 frames + arcade frames from levels / achievements), Background, Title (level titles + Shop
titles), Title skins, Username styles and Card sleeves (Anime TCG, from completed series), with your achievements and
Night Party record. Owned items are selectable, the rest greyed out with where to get them ("Get it in the Shop" opens
the Shop on that item). The live preview is the Arcade Pass. Nothing is applied until Save profile; closing discards.
Equipping happens only here (and through Equip now).

**The Arcade Pass** (`passCard` in `js/profile.js`) is a credit card (1.586:1, rounded corners, edge highlight and
shadow, a golden EMV chip on the right): the picture with the equipped frame, the equipped background over the whole
card, the name with its username style, the title with its title skin, the level and the XP bar. The same function
draws the main menu card, the Wardrobe preview and the Shop try-on; the background skin is the same CSS as the lobby
seats (`.sbg[data-bg=<tier>]` in `css/vault.css`), so the pass and the lobby card always match. The stats sit below the
card, and under it the **card reader** (`js/cardslot.js`, labelled EDIT PLAYER CARD) replaces the old button: double-click
/ double-tap the pass (or press and hold it on touch) to pick it up, drop it on the reader's slot (a green glow marks the
snap zone) and it slides in, beeps and opens the Wardrobe; closing the Wardrobe ejects it back onto the menu. Clicking the
reader (or Enter / Space on it) does the same insert without dragging. Reduced effects: a quick fade and the Wardrobe
opens at once. Timings and the hint-fade count: `CARD_SLOT` in `js/vault/config.js`.

The **Anime TCG** is ONE page (`#arcadeVault`, `js/vault/vault.js` + `tabs.js`, `css/tcg.css`; internal id
`cardvault`, saved data unchanged) with four tabs: Packs Store (a booster shelf), Collection (a binder with 9-pocket
pages; trades), Decks (deck boxes; the builder shows the 10 slots and the Power / Defense curve) and Duel (a duel
board). Two ways in:
- **Main menu** (the ANIME TCG button under Host a party): no room. Instead of the room code and friends it shows
  HOST PARTY (makes a room; you land on its Anime TCG page) and JOIN (a room code). Everything works except duels and
  trades; the Duel tab says "Host a party or join one to duel". ‹ Menu goes back to the main menu.
- **A room's lobby**, by picking the ANIME TCG mode: every player gets their own page (no shared screen), with the
  room code, the friends in the room (the Duel tab lists them) and, for the host, Close room. ‹ Lobby goes back (the
  lobby then shows ENTER ANIME TCG; the host keeps the normal mode controls).
The ★ Daily button (on the Anime TCG page and in the Shop) opens the login streak, missions and coin history.
**Every number** (prices, odds, rewards, pity, life totals, timers, mode lengths, challenge expiry, skin animation
speeds) is in one file: `js/vault/config.js`. The full card list with rarity, stats and abilities is `docs/cards.md`
(generated).

**Storage and fairness.** The site has no server of its own and the Firebase rules only allow writes under `rooms/`,
so coins, cards, decks, cosmetics, pity counters, missions and streaks are kept in this browser (localStorage
`aap_vault_v1`, next to the profile). All of it goes through one bank (`js/vault/store.js`): every change is an
operation with an id, applied at most once (a double click, a reload or a second tab never pays twice), atomic across
tabs (Web Locks), never below 0 coins, and logged in a ledger with the seed of every random roll (packs, scratch cards,
missions, starter deck), so any roll can be replayed. A server backend can replace the browser one without touching
the rest. In rooms the host resolves duels and stores every match result; hidden information (hands, picks) is
hidden by the interface, as in the other modes.

- **Results.** Every mode reports one standard result when a match ends: `{ key, mode, players, placements (ties share
  a place), scores, teams?, duration, settings }`, built by `js/vault/result.js` from the room's final state. The host
  stores it in `rooms/<code>/lastResult`. Per-mode metadata (players, teams, FFA, 1v1, length, fast) is `MODE_META`.
- **Earning coins.** By placement: 40, 34, 28, 24, 20, 16, 13, 10 with 8 players, an even spread from 40 to 10 with
  fewer; ties and teams share the average of the places they cover; x0.75 short / x1 medium / x1.5 long. Only with 2+
  accounts; any finished game pays, however short; no daily limit. Daily login 30, 30, 40, 40, 50, 50, 100
  (a missed day resets it). 3 daily missions, one always "play a mode you haven't played in 7 days". Night Party bonus:
  winner +100, +10 per stage played (`js/party/config.js`).
- **Shop.** Season 1 skins: each tier (Iron 150 ... Prismatic 3000) as a **Frame** ("Iron Frame - Season 1") and a
  **Background** ("Iron Background - Season 1"), bundle -20%. Two separate slots, both seen by everyone in the room:
  the Frame is the animated ring around the circular picture (`.ava.sf-<tier>`: the ring's metal or gem, a layer masked
  to the ring for glints / facets / ripples, and a layer just outside it for sparkles, flames, bubbles, orbiting lights);
  the Background restyles the whole player card: the lobby seat with its stripes, 1P tag and angled corners, and the
  whole Arcade Pass (`.sbg[data-bg=<tier>]`, its animated layer runs under the diagonal-stripe base motif). Both are CSS
  only (transforms and opacity), pause while scrolled off-screen, and fall back to a still version under Reduced
  effects. Scratch Cards (Basic 60, Silver 150, Gold 350): the prize (title, title skin, username colour / effect) is
  rolled when you buy, scratching only reveals it; duplicates refund 20 / 60 / 150 / 400. The Wardrobe equips
  everything (or Equip now right after a purchase). Cosmetics can't be traded; a duplicate from any future source
  refunds 50%.
- **Cards.** One card per Anime Draft character (831, all 18 series), generated by `node tools/cards-build.mjs`: rarity
  from the Draft's power + story rank inside each series (Common to Mythic), an archetype (Brawler, Tank, Speedster,
  Trickster, Healer, Mage, Support), Power + Defense nearly flat across rarities, and one ability by rarity
  (`js/cardvault/abilities.js`). Rarity decides the frame (matte steel ... embossed gold ... the Mythic void), the series
  decides colours, ornaments, holo pattern, card back and pack art. No official logos: stylised text and simple emblems.
- **Packs.** Per series. Normal 150 (5 cards), Premium 400 (6 cards, metallic gold foil, one Rare+). Odds, Holo 8% /
  12%, pity (Ultra Rare+ within 20 Normal packs, Legendary+ within 30 Premium) as specified; a pack only holds its own
  series. Duplicates turn into shards (Common 5 ... Mythic 500, Holo double); 100 / 250 shards craft a pack of any series.
  Opening: float, swipe to tear (rip sound, foil confetti), flip one card at a time with reactions by rarity (full-screen
  reveal for Legendary / Mythic), hold to inspect (tilt with finger, mouse or the phone's motion), summary with NEW tags
  and shards. A rolled pack is saved before the animation, so a reload never re-rolls it.
- **Collection and decks.** A book per series with completion (a finished series gets a gold edge and unlocks its card
  sleeve). Decks of exactly 10 different cards (up to 8 decks); everyone starts with a free Starter Deck (10
  Common/Uncommon cards, 5+ series, all 7 archetypes) and 100 coins. Cards in 10 winning duels get a Veteran mark.
- **Card duels (Duel tab).** The tab lists everyone in the room on their own lobby card (where they are, whether
  they have a deck). Pick one player for a 1v1 or several for a free-for-all and challenge them; they accept or decline
  in a strip at the bottom of the screen (60 s). Each challenge is its own duel in `rooms/<code>/cvb/<id>`, several can
  run at once, and anyone else can watch. The room host builds each duel (seeded, the seed kept in the node), resolves
  every round and stores one standard result per duel (`duelResultOf`, key `cardvault:<id>`). Pick in secret, flip
  together, clash: damage = Power - Defense, then abilities, in the order written at the top of
  `js/cardvault/engine.js`. 1v1: 20 life, hand 4, draw 1; free-for-all (3-8): 25 life and a target. Pick timer with
  auto-pick, one grace pause for a disconnect, duel log. A player can leave the duel screen (their cards are then
  auto-picked) and return from the Duel tab. The host's lobby settings set the pick timer. Switching the lobby to another mode stops unfinished duels (no coins; the host is asked first). Practice
  vs CPU from the Duel tab (no coins).
- **Trades.** In a room, Collection › Trade with friends: up to 5 cards each way; the cards are locked while the offer is
  open and each side swaps its own cards exactly once. Cards only.
- **Balance.** `node tools/cardvault-test.mjs` simulates thousands of duels: in mixed decks a deck holding a given
  card wins 48% (Common) to 53% (Mythic) of the time and no ability falls outside 44-60%; an all-Common deck still beats an all-Legendary/Mythic one now and
  then. Re-run it after changing an ability or `DUEL.statTotal`.
- **Card faces** (`js/vault/cardui.js` + `css/cards.css`; one component everywhere: packs, collection, decks, duels, trades).
  - **Anatomy:** name bar (series seal + the name, shrunk and wrapped to two lines when long, never cut), the art window,
    big ATK / DEF plates (the stored values x100), the type line (1-7 rarity stars, archetype · series), the effect box
    (keyword chips with icons, timing tags, the ability with its timing words in bold) and the footer (collection number,
    rarity, Holo). Icons come from one set (`js/vault/icons.js`: 24 grid, 1.8 stroke, one gold / steel accent; no emoji).
  - **The style matrix:** RARITY decides material, shape, effects and shine (Common matte steel, no shine · Uncommon etched
    bronze-green, one soft sweep · Rare blue crystal bevel, gloss following the tilt · Ultra Rare silver / violet
    shattered cut silhouette front and back, a specular streak and edge glints · Epic animated crimson energy border, glow
    pulse, light foil in the art · Legendary embossed gold, gold foil in the art, sparkles, a moving highlight, an animated
    gold name · Mythic borderless full art, prismatic foil, aura, breathing glow, its own reveal sound). Holo stacks on
    any rarity as the card's surface. The SERIES decides colours, pattern, lettering, the corner ornaments
    (`js/vault/cardstyle.js`, 18 drawings of our own) and the card back (pattern, etched holo, ornamented frame,
    medallion, lettering, kanji). Idle motion only runs on cards on screen and stops under Reduced effects.
  - **Art: faces are never cropped.** A picture may lose at most 8% (`CARD_ART.maxCrop`) to fill its window, placed by its
    face point (`focusX` / `focusY` in `js/vault/cards.js`, measured once offline by `tools/card-faces.py` into
    `data/card-focus.json`, hand fixes in `data/card-focus-fix.json`). Otherwise it is shown whole over a blurred,
    darkened copy of itself. With AniList's 2:3 portraits that means: standard cards show the whole picture, the Ultra
    Rare and Mythic windows are covered (5-7%). Failed loads are retried, pack pictures are preloaded and kept decoded,
    and a series-coloured silhouette is the last resort.
  - **Art audit:** `node tools/card-art-audit.mjs [--fix]` downloads every picture (cache in `.cache/`), checks status,
    size, shape and face data, asks AniList for a current picture when one is broken (`data/card-art-fix.json`, read by
    `tools/cards-build.mjs`) and writes `docs/card-art-report.md`.
  - **Dev gallery** `dev/cards.html`: the style matrix (every series x every rarity, Holo on/off, front/back), every card,
    every back, with automatic checks (art loaded, no crop over 8%, the face inside the window, names and effect text
    not cut) that flag problems in red.
- **Booster packs and the opening** (`css/packs.css`, `js/vault/opening.js`). Crimped zig-zag seals, a centre seam,
  puffed shading, a crinkled foil texture (SVG noise), a specular highlight and rim light that follow the pointer;
  Premium = gold foil, embossed, a moving shine, finer ridges. Opening: hover, drag across the top crimp (a tear line
  follows the finger; foil crinkle sound, a short vibration on phones), the strip peels off and falls, light and foil
  flakes burst out, the cards slide up into a face-down stack, tap or swipe to flip (3D turn + shine pass; a Rare or
  better makes the stack glow first), reactions by rarity (Legendary / Mythic: a canvas cinematic), hold to inspect
  (3D tilt, light, holo parallax, card thickness), summary with NEW, shards and the pity counter. Sounds are generated
  (Web Audio). Timings in `OPENING` (config). The pull is rolled and saved before the animation. Dev page: `dev/pack.html`.
- **Holo cards.** The foil is the card's own surface: a color-dodge layer that lights up the art and frame (plus a faint sheen
  on dark parts), rainbow bands that sweep with the tilt, the series pattern etched in, glitter and a moving specular
  highlight; less foil over faces and text. Every rarity can be holo; a holo duplicate gives double shards. Cards turn
  as one rigid object with a card-stock edge. Review page: `dev/holo.html`.
- **Close room** (host, from the lobby, the in-game menu or the Anime TCG page): after a confirmation the room is deleted
  from the database. Every client returns to the main menu ("The host closed the room.") and the code can't be joined
  again. Leaving clients cancel their own disconnect flag before the page unloads, and the host deletes once more a
  moment later, so nothing is left behind. Offline, the host still lands on the main menu (no reload) and the delete is
  sent when the connection is back.
- Tests: `node tools/vault-test.mjs` (economy, shop, scratch, packs, pity, decks, trades), `node tools/cardvault-test.mjs`.

## NIGHT PARTY (mode 10: a tournament of the other modes)

Pick NIGHT PARTY in a room's lobby (2-8 players). The host opens SET UP THE NIGHT: a tournament name, a reward
("Winner picks the next anime we watch"), and a path of stages. Each stage is a mode with its full rules, a weight
(x1, x1.5, x2 or custom) and a label; the same mode can come back with other rules. Templates: "Night of Eight"
(6 stages for 8 players ending with a x2 Final Round), "Quick Three", and your own. Every stage is checked against the
player count, with the estimated duration. START NIGHT PARTY whenever everyone is in.

- Free-for-all modes seat everyone; team modes split the room into two teams balanced by the standings (or random, or
  picked by the host); Guess Who runs as a single-elimination bracket inside the stage (seeded by the standings, byes
  to the top seeds) while the others spectate.
- Placement points only: 10 for 1st down to 1 for last (shared places share them), times the stage weight, added to a
  pool. A live race track, the scoreboard and the stage list are shown between stages, and from the HUD chip during
  one. A tie at the top after the last stage plays sudden death among the tied players.
- The winner screen shows the reward; then everyone is back in the lobby. Every game pays its normal coins (no daily
  limit); the winner gets +100 and everyone +10 per stage played. Tournaments won and a short history are in the
  profile, with the "Night Party Winner" achievement and a "Finish a Night Party" daily mission.
- Disconnects, late joiners, leavers, the host leaving or going offline, a mode that can't start (Retry / Skip),
  Close room at any point: see `docs/night-party.md`, which also has the build notes and the test checklist of each
  phase.
- Code: `js/party/` (config.js = every number, stages.js = the stage registry, scoring.js = the scoring engine,
  party.js = setup, controller and screens), `css/party.css`. Tests: `node tools/party-test.mjs`.

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
- **Intro.** A black screen with slow drifting smoke. First, alone and big, letter by letter: **WELCOME, [name]!** on a first visit, **WELCOME BACK, [name]!** on every visit after (the name comes from the saved profile, *Player* until one is set). Then the introduction (what the site is, a *Beware of spoilers!* warning, *Made by an anime fan, for anime fans.*, the credit), with **Loading...** and a 10-second bar bottom-right; the type shrinks to fit any screen. After 10 s, or a click/tap anywhere (Enter, Space), it fades into the menu; a click during the welcome jumps to the introduction, Esc skips it all. It doubles as the loading screen: it leaves only once the app is ready, and says so if the server is slow. The menu music and a new player's name prompt wait until it has finished.
- **Mode art** (the menu's game cards and How to Play panel, and the lobby's mode cards) shows only each series' main protagonists and main villains: Guess Who has Naruto, Luffy and Ichigo; Headbanz has Goku, Yuji and Tanjiro; Imposter has Madara, Sukuna and Muzan; Anime UNO has Ace, Jotaro and Sasuke; Anime Draft has Luffy, Gojo and Eren; Anime Feud has Nezuko, Mahito and Kid Buu; Most Likely has Goku Black, Zeke and Broly; Anime Sketch has Naruto/Pain, Ichigo and Gojo.

## Menu and lobby

- **Main menu** (`css/menu.css`; the cards and panel are built by `buildHomeModes` / `pickGuide` in `js/game.js`).
  - **Hero:** the logo, the tagline, the **Shop** storefront tile (deliberately unlike the game tiles: landscape, an awning, neon lettering, "NOT A GAME · SHOP"), **Host a party** (*insert coin*: a coin drops into the slot and the credit counter ticks before the room is made), the six-cell room-code entry, and the counts (games, players, one room code). Fire is used as light: a slow ember glow along the floor and embers drifting up.
  - **Arcade Pass:** the credit-card player card (see "The Arcade Pass" above), the card reader under it (insert the pass to open the Wardrobe), then the hi-score stats. The ANIME TCG button sits under Host a party / Join.
  - **The 10 game tiles:** two balanced rows of 5 (2 columns x 5 rows on phones), the same poster tiles in the lobby's mode picker (plus who voted, the cursors and SELECTED). Anime TCG is a holo-framed trading card with a card back peeking out; Night Party a festival night with string lights.
  - **Pick your game / How to play:** one card per mode, then the How to Play panel for the picked one (the same rules as the in-room rules sheet, each with a short headline, plus player count and format). The cards are a tablist (arrow keys, Home, End); the last pick is remembered. **Host a … party** opens a room already on that game.
  - **Each mode has its own skin**, shared by its card and its panel: Guess Who a noir case file with a magnifying glass and yellow evidence markers; Headbanz a polaroid pinned to a cork case board with typewriter type; Imposter a dark camera feed with scanlines and a glitch; Anime UNO a playing card ringed in the four deck colours; Anime Draft a foil trading card with rarity gems; Anime Feud a blue studio panel ringed with marquee bulbs; Most Likely two sides split by a burning seam with a VS badge; Anime Sketch a taped sheet with a pencil-sketch picture and marker lettering. Adding a mode = an entry in `MODES`, `RULES` and `GUIDE` (game.js) and one `[data-mode]` block in `menu.css`.
  - **Discord: @e47** sits small in the bottom-left corner.
- **Lobby.** A fighting-game *PLAYER SELECT*. Seats are 1P–8P fighter tiles, a **READY!** band stamps across a tile when that player readies up, and anyone joining mid-lobby gets a *HERE COMES A NEW CHALLENGER!* banner. The modes are a stage select: corner brackets mark the host's pick and every voter's 1P–8P cursor hovers over the mode they voted for. Ready and Start are the big buttons of the same family (Ready turns gold once you are ready), and the status line is an LED board.
- **The lobby wears the picked mode** (`css/lobby.css`, switched by `lobbyTheme` in `js/game.js`). It reuses each mode's skin from the menu's How to Play panel across the whole lobby:
  - **Guess Who:** a noir dossier under a desk lamp, yellow evidence-marker seat numbers, gold buttons.
  - **Headbanz:** a cork case board with pinned cream polaroid seats and typewriter names.
  - **Imposter:** fog, scanlines, crimson buttons.
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
