# Most Likely: character accuracy audit (November 2026)

Scope: every Most Likely board (40 before, 55 after) and every character answer on them. Anime Feud (Classic) boards and every other mode were not changed. The only edits outside Most Likely are import version strings (`?v=N`) in `feud.js`, `sketch.js`, `game.js` and `index.html`, so that browsers fetch the updated shared engine.

## What the audit found

1. **No shared character data.** Every opinion board was a separate hand-ranked list, so nothing kept a character's personality consistent across questions. That allowed contradictions:
   - **On a board and on its opposite:**
     - Leaders: Luffy, Goku, Frieza, Beerus, Tsunade, Gojo, Ichigo, Endeavor, Gon, Ging, Makima, Denji, Asta, Subaru, Shinra, Frieren and Sakura (Wind Breaker) were all on both "best leader" and "worst leader".
     - Zombie outbreak: Subaru was 30 points on "would survive" *and* "would die first"; Chopper, Arthur, Aki, Power, Stark, Brook and Shikamaru were on both too.
     - Roommates: Sanji, Levi, Stark and Nirei were on both "best roommate" and "worst roommate".
   - **One-trait reductions:** the personality boards (kindest, cruelest, loyal, betray, lazy, hard-working, mature, childish …) only listed the same 5–6 famous characters per series, and the order came from reputation, not from what each character does.
2. **Unsupported answers:**
   - Makima as a "best teacher".
   - Denji as a "best leader".
   - Diavolo on "best leader" (he's the "worst leader" answer).
   - Kobeni on "dies first in a zombie outbreak", when she survives everything in canon.
3. **Upper Moon board (Demon Slayer):** it left out Muichiro, the only Hashira who beat an Upper Moon alone (Gyokko), and ranked Rengoku, who lost to Akaza alone, above him.
4. **Coverage:**
   - Gachiakuta had only the 3 rating boards.
   - Wind Breaker and Death Note were missing from many personality questions.

## What changed

- **Character trait data** (`js/feud/packs/traits.js`):
  - **Coverage:** 271 characters from all 18 series, each with a one-line note on their canon behaviour.
  - **Scores:** each character is scored 0–9 only on the 22 traits their story clearly shows: loyal, kind, cruel, honest, skilled liar, betrays, hard-working, lazy, mature, reckless, fun, falls in love fast, big eater, brave, ego, calm under pressure, driven by a dream, holds grudges, keeps secrets, good with children, changes over the story, team player.
  - **Missing scores:** a trait not shown either way is left out, so the character isn't on that board. Nothing is filled in to pad the data.
  - **Rules followed:** behaviour, not reputation; a cold-acting character can still be kind; battle cleverness is not honesty or maturity; the whole story, with change scored separately.
- **Personality boards built from those scores** (kind `"traits"`, labelled "Canon behaviour · editors' trait scores"):
  - **12 boards converted:** kindest, cruelest, loyal, betray, hard-working, lazy, mature, childish, falls in love fast, eating contest, life of the party, worst at secrets.
  - **15 boards added:** most honest, best liar, bravest, runs away first, calmest under pressure, cracks first, holds a grudge, forgives their enemy, trusted with a secret, biggest ego, never gives up on a dream, best team player, trusted to babysit, changed the most, charges in without a plan.
  - The new boards add questions about relationships, behaviour under pressure, development and hypotheticals.
- **How a trait duel is built:**
  - **Same series:** two characters 2 to 5 points apart, and the right answer must score at least 5, so the answer clearly shows the trait.
  - **Across series:** 2 to 4 apart, and both score at least 3.
  - **Opposite questions read the score the other way:** "childish" is 9 minus maturity. "Forgives" counts only characters with kindness of at least 5, because a villain who doesn't care isn't forgiving.
  - **Contradictory pairs are skipped:** a duel is never asked when the same character would win two opposite questions. For example, Zoro both trains hardest and naps most, so Zoro vs Luffy is asked on neither the hard-working nor the lazy board.
- **Opinion boards:** the contradictions above were removed (nobody is on a board and on its opposite any more), the unsupported answers were replaced, and the Upper Moon board was re-ranked (Yoriichi, Gyomei, Muichiro, Giyu, Tanjiro, Rengoku).
- **Checks** (`tools/feud-check.mjs`):
  - Every trait row resolves to exactly one Anime Draft character, has valid scores and has a note.
  - 75 **story anchors** hold. Each is a canon fact the scores must agree with, for example:
    - Teach betrayed Whitebeard;
    - Tanjiro can't lie;
    - Muzan fled from Yoriichi;
    - Power lies constantly;
    - Frieren oversleeps.
  - No character is scored both very kind and very cruel, very honest and a skilled liar, or very hard-working and very lazy. Very loyal and a betrayer is allowed only when the note explains it (Itachi, Gin, Floch).
  - No Most Likely opinion board shares a character with its opposite.
  - 5,652 duels on opposite boards are cross-checked, so no pair wins in the same direction on both questions.
- **Tests** (`tools/feud-test.mjs`, 264 checks; 7 new): duel spacing, cross-series rules, the inverted opposites, the contradiction filter, the forgiving rule, and Teach always being the betrayer.

## Result

- 55 Most Likely boards and 116 questions:
  - 27 trait boards;
  - 23 opinion boards, labelled "editors' poll";
  - 5 rating boards from the Anime Draft ratings (unchanged; those ratings were audited earlier).
- Every series has 19 to 27 personality boards. Gachiakuta now has 25 Most Likely boards (it had 3), Wind Breaker 41, Death Note 42.
- All 271 scored characters appear in duels. The most-used are mid-cast characters (Hancock, Nami, Obito, Garp, Tsunade), not only the leads.
- Gameplay, scoring (30 / 20 / 10 by closeness), voting, Team vs Team, Free For All, Firebase layout and the UI are unchanged. Browser tests passed:
  - Most Likely 3-player run (17/17), which played a trait duel live;
  - cross-mode regression (12/12);
  - Anime Feud (15/15);
  - Anime Sketch (16/16).

## Needs human review

- **The scores are an editorial reading of the story, not official data.** The label says so in game. The 75 anchors are the firmly canon parts. The rest are judgement calls, especially:
  - "falls in love fast";
  - "fun / life of the party";
  - "team player";
  - "good with children".
- **Ongoing series with less material:**
  - Gachiakuta (6 characters, several with only 10–14 traits scored);
  - Wind Breaker (10 characters);
  - Chainsaw Man Part 2 (Asa, Yoru).
- **"Changes over the story" (X)** counts a turn for the worse as change (Eren, Obito). The question asks who *changed* most, not who *grew*.
- **The 23 opinion boards** (leaders, zombie outbreak, deserted island, getting lost, heist, roommates, owing money, coworkers, teacher, detective, strategist, the single-series boards) remain an editors' poll. Contradictions were removed, but the order inside each line is still opinion.
- **Coward and betray boards are thin** in several series (fewer than 3 duels). That reflects canon: most main casts are brave and few betray. These boards simply come up less there.
