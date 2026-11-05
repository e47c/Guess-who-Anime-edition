/* ANIME FEUD pack: MOST LIKELY, single-series boards (only: true). Used only when exactly that series is ticked.
   kind "poll": opinion questions, our editors' poll (labelled as such in the game). */
export default {
    id: "likely-series", type: "likely", source: "Anime Arcade curated answers", review: "audited 2026-11",
    boards: [
        { id: "op-captain", only: true, fam: "leadership", cat: "Leadership", sub: "Captain", pol: "+", diff: 1, vt: "context", kind: "poll",
            why: "Opinion, not canon: our editors' poll from the characters' canon personalities and feats.",
            q: ["Which character would make the best pirate captain?","Whose crew would you join without a second thought?"],
            a: {
                onepiece: "Luffy 26; Shanks 20; Roger 18; Newgate 14; Law 10; Kid 6"
            }
        },
        { id: "op-marine-recruit", only: true, fam: "loyalty", cat: "Scenario", sub: "Switching sides", pol: "0", diff: 2, vt: "scenario", kind: "poll",
            why: "Opinion, not canon: our editors' poll from the characters' canon personalities and feats.",
            q: ["Which Straw Hat would make the best Marine?","Which Straw Hat would the Marines most want to recruit?"],
            a: {
                onepiece: "Jinbe 22; Robin 18; Zoro 16; Sanji 14; Nami 10; Chopper 8"
            }
        },
        { id: "na-hokage-best", only: true, fam: "leadership", cat: "Leadership", sub: "Hokage", pol: "+", diff: 1, vt: "context", kind: "poll",
            why: "Opinion, not canon: our editors' poll from the characters' canon personalities and feats.",
            q: ["Who would make the best Hokage?","Whose face belongs on the Hokage Rock?"],
            a: {
                naruto: "Naruto 22; Minato 18; Itachi 14; Shikamaru 14; Kakashi 12; Hashirama 10"
            }
        },
        { id: "jjk-domain-trap", only: true, fam: "survival", cat: "Scenario", sub: "Domain", pol: "+", diff: 2, vt: "scenario", kind: "poll",
            why: "Opinion, not canon: our editors' poll from the characters' canon personalities and feats.",
            q: ["Who would last the longest trapped inside an enemy's domain?","Who would you want with you inside a hostile domain?"],
            a: {
                jjk: "Gojo 30; Yuta 18; Toji 14; Maki 12; Sukuna 12; Higuruma 6"
            }
        },
        { id: "ds-upper-moon", only: true, fam: "power-scale", cat: "Scenario", sub: "Upper Moon", pol: "+", diff: 2, vt: "scenario", kind: "poll",
            why: "Opinion, not canon: our editors' poll from the characters' canon personalities and feats.",
            q: ["Which Demon Slayer would you send alone against an Upper Moon?","Who would beat an Upper Moon one-on-one?"],
            a: {
                demonslayer: "Yoriichi 30; Gyomei 20; Muichiro 16; Giyu 12; Tanjiro 10; Rengoku 8"
            }
        },
        { id: "aot-survey-corps", only: true, fam: "survival", cat: "Scenario", sub: "Expedition", pol: "+", diff: 2, vt: "scenario", kind: "poll",
            why: "Opinion, not canon: our editors' poll from the characters' canon personalities and feats.",
            q: ["Who would come back alive from every expedition beyond the Walls?","Who would you want next to you on an expedition outside the Walls?"],
            a: {
                aot: "Levi 34; Mikasa 24; Erwin 12; Hange 10; Jean 8; Armin 6"
            }
        },
        { id: "dn-catch-kira", only: true, fam: "intelligence", cat: "Intelligence", sub: "Kira case", pol: "+", diff: 2, vt: "scenario", kind: "poll",
            why: "Opinion, not canon: our editors' poll from the characters' canon personalities and feats.",
            q: ["Who would catch Kira fastest on their own?","Who would you trust to lead the Kira investigation?"],
            a: {
                deathnote: "L 40; Near 24; Mello 14; Naomi 10; Aizawa 6"
            }
        }
    ]
};
