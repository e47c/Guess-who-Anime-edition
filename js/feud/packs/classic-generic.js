/* ANIME FEUD pack: CLASSIC FEUD, general anime questions (kind "poll": tropes, our editors' poll, never presented as canon).
   Answers belong to no single series ("any"), so these boards are only used in an Anime Mix (two or more series ticked):
   with one series ticked the game sticks to questions about that series. */
export default {
    id: "classic-generic", type: "classic", source: "Anime Arcade curated answers", review: "audited 2026-11",
    boards: [
        { id: "g-villain-unforgivable", fam: "villains", cat: "Tropes", sub: "Villains", pol: "-", diff: 1, kind: "poll",
            why: "An anime trope, not a canon fact: the answers and their order are our editors' poll.",
            q: ["Name something an anime villain would never forgive","Name something that would make an anime villain swear revenge"],
            a: {
                any: "Betrayal / Being betrayed 28; Being underestimated / Underestimating them 18; Failure / Failing 14; Losing / Defeat / Being defeated 12; Being laughed at / Mockery / Being mocked 10; Disrespect / Insults / Being insulted 8; Ruining their plan / Plan ruined 6"
            }
        },
        { id: "g-protagonist-has", fam: "heroes", cat: "Tropes", sub: "Heroes", pol: "+", diff: 1, kind: "poll",
            why: "An anime trope, not a canon fact: the answers and their order are our editors' poll.",
            q: ["Name something every shonen protagonist has","Name something you can always count on a shonen hero having"],
            a: {
                any: "A rival / Rival 22; Spiky hair / Crazy hair / Weird hair 20; Dead or missing parents / No parents / Orphan / Dead parents 16; A big appetite / Big appetite / Always hungry 12; A dream / A goal / Ambition 10; Plot armor 8; Friends / Power of friendship 6"
            }
        },
        { id: "g-hero-never", fam: "heroes", cat: "Tropes", sub: "Heroes", pol: "-", diff: 1, vt: "opposite", opp: "g-villain-always", kind: "poll",
            why: "An anime trope, not a canon fact: the answers and their order are our editors' poll.",
            q: ["Name something an anime hero would never do","Name something a shonen protagonist refuses to do"],
            a: {
                any: "Abandon a friend / Leave friends behind / Abandon friends 30; Give up / Quit 26; Kill / Killing / Kill the villain 12; Lie / Lying 8; Run away / Retreat 8; Study / Read a book 6; Skip a meal / Diet 6"
            }
        },
        { id: "g-villain-always", fam: "heroes", cat: "Tropes", sub: "Villains", pol: "+", diff: 1, vt: "opposite", opp: "g-hero-never", kind: "poll",
            why: "An anime trope, not a canon fact: the answers and their order are our editors' poll.",
            q: ["Name something an anime villain always does","Name something you can always count on an anime villain doing"],
            a: {
                any: "Monologue / Explain their plan / Evil speech 30; Laugh evilly / Evil laugh 22; Underestimate the hero / Underestimate 14; Hold back / Not use full power 10; Betray their allies / Betray / Kill their minions 10; Transform / Final form 8; Come back to life / Return 6"
            }
        },
        { id: "g-power-up", fam: "powers", cat: "Tropes", sub: "Power-ups", pol: "0", diff: 1, kind: "poll",
            why: "An anime trope, not a canon fact: the answers and their order are our editors' poll.",
            q: ["Name a reason an anime character suddenly powers up","Name something that unlocks a hero's hidden power"],
            a: {
                any: "A friend in danger / Protect friends / Friends in danger 30; Anger / Rage 22; A flashback / Flashback 14; A friend dies / Death of a friend / Someone dies 12; Training 8; A promise / Remembering a promise 6; Near death / Almost dying 6"
            }
        },
        { id: "g-training-arc", fam: "training", cat: "Tropes", sub: "Training", pol: "0", diff: 1, kind: "poll",
            why: "An anime trope, not a canon fact: the answers and their order are our editors' poll.",
            q: ["Name something that happens in a training arc","Name something you would see in an anime training montage"],
            a: {
                any: "Weighted clothes / Weights 22; Meditating under a waterfall / Waterfall 18; Climbing a mountain / Mountain 14; Push-ups / Sit-ups / Exercise 12; Getting beaten by the teacher / Beaten up 10; Learning a new move / New technique / New attack 10; A time skip / Time skip 8"
            }
        },
        { id: "g-tropes", fam: "training", cat: "Tropes", sub: "Tropes", pol: "0", diff: 2, vt: "context", kind: "poll",
            why: "An anime trope, not a canon fact: the answers and their order are our editors' poll.",
            q: ["Name a classic anime trope","Name something that happens in almost every anime"],
            a: {
                any: "Power of friendship / Friendship 22; Beach episode 18; Tournament arc / Tournament 16; Training arc 12; Nosebleed 10; Time skip 8; Flashback episode / Flashbacks 6; Hot springs episode / Hot springs 6"
            }
        },
        { id: "g-fight-long", fam: "fights", cat: "Tropes", sub: "Fights", pol: "-", diff: 1, kind: "poll",
            why: "An anime trope, not a canon fact: the answers and their order are our editors' poll.",
            q: ["Name something that makes an anime fight last forever","Name something that stretches a single fight across five episodes"],
            a: {
                any: "Flashbacks / Flashback 30; Talking / Monologues / Speeches 26; Power-ups / Transformations / Transforming 14; Charging attacks / Charging / Powering up 12; Reaction shots / Commentary / Bystanders commenting 10; Recaps / Recap 8"
            }
        },
        { id: "g-rival-does", fam: "fights", cat: "Tropes", sub: "Rivals", pol: "0", diff: 2, vt: "context", kind: "poll",
            why: "An anime trope, not a canon fact: the answers and their order are our editors' poll.",
            q: ["Name something an anime rival always does","Name something you expect from the hero's rival"],
            a: {
                any: "Insults the hero / Mock the hero / Insult 24; Saves the hero at the last second / Save the hero / Help the hero 16; Shows up at the worst time / Show up 16; Loses then trains harder / Train harder 14; Calls the hero weak / Call them weak 12; Smirks / Smirk 8; Leaves the village / Leave / Defects 6"
            }
        },
        { id: "g-villain-lair", fam: "villains", cat: "Tropes", sub: "Villains", pol: "0", diff: 2, vt: "scenario", kind: "poll",
            why: "An anime trope, not a canon fact: the answers and their order are our editors' poll.",
            q: ["Name something you would find in a villain's lair","Name something every anime villain's hideout needs"],
            a: {
                any: "A throne / Throne 26; A wine glass / Wine glass / Wine 16; Minions / Henchmen 14; Monitors / Screens 12; Cages / Prisoners / Prisoner 10; A world map / Map 8; Candles / Dramatic lighting 6; A pet / Evil cat 4"
            }
        },
        { id: "g-food", fam: "food", cat: "Everyday life", sub: "Food", pol: "0", diff: 1, kind: "poll",
            why: "An anime trope, not a canon fact: the answers and their order are our editors' poll.",
            q: ["Name a food anime characters love","Name a meal you have seen in a hundred anime"],
            a: {
                any: "Ramen 30; Rice balls / Onigiri 18; Meat / Meat on the bone 16; Curry / Curry rice 10; Dango 8; Bento / Lunch box 8; Takoyaki 6; Sweets / Cake 4"
            }
        },
        { id: "g-mentor-does", fam: "mentorship", cat: "Tropes", sub: "Mentors", pol: "0", diff: 2, kind: "poll",
            why: "An anime trope, not a canon fact: the answers and their order are our editors' poll.",
            q: ["Name something every anime mentor does","Name something an anime sensei is famous for"],
            a: {
                any: "Hides their true power / Hold back / Secretly strong 24; Dies to save the student / Dies / Sacrifice 16; Tests the student / Test 14; Drinks / Alcohol / Sake 14; Teases the student / Troll the student 10; Sleeps / Naps 10; Shows up late / Late 8"
            }
        },
        { id: "g-final-boss", fam: "villains", cat: "Tropes", sub: "Final bosses", pol: "0", diff: 1, kind: "poll",
            why: "An anime trope, not a canon fact: the answers and their order are our editors' poll.",
            q: ["Name something every anime final boss has","Name something you expect from the last villain of a series"],
            a: {
                any: "A final form / Final form / Transformation 26; A tragic backstory / Sad backstory / Backstory 18; A huge castle / Castle / Fortress 14; A plan to destroy the world / Destroy the world / End the world 12; A long speech / Monologue / Speech 10; Loyal minions / Henchmen / Minions 8; Immortality / Can't die / Comes back 6; A creepy laugh / Evil laugh 4"
            }
        },
        { id: "g-school", fam: "food", cat: "Everyday life", sub: "School", pol: "0", diff: 1, kind: "poll",
            why: "An anime trope, not a canon fact: the answers and their order are our editors' poll.",
            q: ["Name something that always happens at an anime high school","Name a classic anime school moment"],
            a: {
                any: "Running late with toast / Toast in the mouth / Late for school 24; A school festival / Cultural festival / Festival 20; Eating lunch on the roof / Rooftop lunch / Roof 16; A transfer student / New student 14; A love letter in the shoe locker / Love letter 10; Sports festival / Sports day 8; Cleaning the classroom / Cleaning duty 6"
            }
        }
    ]
};
