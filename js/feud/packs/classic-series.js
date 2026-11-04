/* ANIME FEUD pack: CLASSIC FEUD, single-series boards (only: true). Used only when exactly that series is ticked.
   Answers are ranked by how readily fans name them (Anime Arcade curated answers, not survey results). */
export default {
    id: "classic-series", type: "classic", source: "Anime Arcade curated answers", review: "curated",
    boards: [
        /* One Piece */
        { id: "op-straw-hats", only: true, fam: "crews", cat: "World", sub: "Crew", pol: "0", diff: 1, q: ["Name a member of the Straw Hat Pirates", "Name someone who sails on the Thousand Sunny"],
            a: { onepiece: "@Luffy 22; @Zoro 18; @Sanji 14; @Nami 12; @Usopp 10; @Chopper 8; @Robin 6; @Franky 4; @Brook 3; @Jinbe 2" } },
        { id: "op-worst-gen", only: true, fam: "crews", cat: "World", sub: "Pirates", pol: "0", diff: 2, vt: "context", q: ["Name a member of the Worst Generation", "Name one of the Supernovas who reached Sabaody"],
            a: { onepiece: "@Luffy 24; @Law 20; @Kid 16; @Zoro 12; @Teach 8; Killer 6; Bonney / Jewelry Bonney 6; Hawkins / Basil Hawkins 4; Drake / X Drake 4" } },
        { id: "op-marines", only: true, fam: "world", cat: "World", sub: "Marines", pol: "0", diff: 2, q: ["Name a character who served in the Marines", "Name someone who wore the Marine coat"],
            a: { onepiece: "@Garp 22; Akainu / Sakazuki 18; @Kuzan 14; @Borsalino 12; @Smoker 12; Koby / Coby 10; Sengoku 6; Tashigi 4" } },
        { id: "op-devil-fruit", only: true, fam: "powers", cat: "Powers", sub: "Devil Fruits", pol: "0", diff: 2, q: ["Name a Devil Fruit", "Name a Devil Fruit power"],
            a: { onepiece: "Gum-Gum Fruit / Gomu Gomu no Mi / Rubber / Nika / Human-Human Fruit Model Nika 30; Flame-Flame Fruit / Mera Mera no Mi / Fire 16; Op-Op Fruit / Ope Ope no Mi 14; Dark-Dark Fruit / Yami Yami no Mi / Darkness 10; Tremor-Tremor Fruit / Gura Gura no Mi / Quake 10; Flower-Flower Fruit / Hana Hana no Mi 8; Ice-Ice Fruit / Hie Hie no Mi / Ice 6; Revive-Revive Fruit / Yomi Yomi no Mi 6" } },
        { id: "op-emperors", only: true, fam: "power-scale", cat: "Characters", sub: "Emperors", pol: "0", diff: 2, q: ["Name a pirate who has been one of the Four Emperors", "Name a Yonko, past or present"],
            a: { onepiece: "@Shanks 24; @Newgate 20; @Kaido 18; Big Mom / Charlotte Linlin 16; @Teach 10; @Luffy 8; @Buggy 4" } },
        /* Naruto */
        { id: "na-akatsuki", only: true, fam: "crews", cat: "World", sub: "Akatsuki", pol: "0", diff: 1, q: ["Name a member of the Akatsuki", "Name someone who wore the red-cloud cloak"],
            a: { naruto: "@Itachi 24; @Pain 16; @Deidara 14; @Kisame 12; @Obito 10; @Sasori 8; @Konan 6; Hidan 4; Kakuzu 4" } },
        { id: "na-hokage", only: true, fam: "leadership", cat: "Leadership", sub: "Hokage", pol: "0", diff: 1, q: ["Name a Hokage", "Name someone who wore the Hokage hat"],
            a: { naruto: "@Naruto 26; @Minato 20; @Tsunade 14; @Kakashi 12; @Hashirama 12; @Hiruzen 8; @Tobirama 6" } },
        { id: "na-jinchuriki", only: true, fam: "powers", cat: "Powers", sub: "Tailed beasts", pol: "0", diff: 3, q: ["Name a jinchuriki", "Name someone with a tailed beast sealed inside them"],
            a: { naruto: "@Naruto 34; @Gaara 26; @Bee 18; Yugito / Yugito Nii 6; Yagura 6; Fu 4; Roshi 3; Han 2" } },
        /* Dragon Ball */
        { id: "db-transform", only: true, fam: "powers", cat: "Powers", sub: "Transformations", pol: "0", diff: 1, q: ["Name a transformation in Dragon Ball", "Name a form a Dragon Ball fighter can transform into"],
            a: { dragonball: "Super Saiyan / SSJ 40; Ultra Instinct / UI 16; Super Saiyan Blue / SSJ Blue / Blue 12; Great Ape / Oozaru 10; Super Saiyan 3 / SSJ3 8; Golden Frieza 6; Ultra Ego 4; Super Saiyan God / SSJ God 4" } },
        { id: "db-saiyans", only: true, fam: "crews", cat: "Characters", sub: "Saiyans", pol: "0", diff: 1, q: ["Name a Saiyan", "Name someone with Saiyan blood"],
            a: { dragonball: "@Goku 30; @Vegeta 24; @Gohan 12; @Trunks 10; @Broly 8; @Goten 6; @Bardock 4; @Raditz 4" } },
        /* Jujutsu Kaisen */
        { id: "jjk-domains", only: true, fam: "powers", cat: "Powers", sub: "Domains", pol: "0", diff: 2, q: ["Name a Domain Expansion", "Name a domain from Jujutsu Kaisen"],
            a: { jjk: "Infinite Void / Unlimited Void 34; Malevolent Shrine 28; Chimera Shadow Garden 10; Self-Embodiment of Perfection 10; Coffin of the Iron Mountain 8; Idle Death Gamble 6; Deadly Sentencing 4" } },
        { id: "jjk-special-grade", only: true, fam: "power-scale", cat: "Characters", sub: "Special grade", pol: "0", diff: 2, q: ["Name a special grade sorcerer or curse", "Name someone ranked special grade"],
            a: { jjk: "@Gojo 28; @Sukuna 22; @Yuta 16; @Geto 10; @Yuki 8; @Mahito 8; @Jogo 4; Rika 4" } },
        /* Demon Slayer */
        { id: "ds-hashira", only: true, fam: "crews", cat: "Characters", sub: "Hashira", pol: "0", diff: 1, q: ["Name a Hashira", "Name one of the Demon Slayer Corps' Pillars"],
            a: { demonslayer: "@Rengoku 24; @Giyu 18; @Shinobu 14; @Tengen 12; @Mitsuri 10; @Muichiro 8; @Sanemi 6; @Gyomei 4; @Obanai 4" } },
        { id: "ds-breathing", only: true, fam: "powers", cat: "Powers", sub: "Breathing styles", pol: "0", diff: 1, q: ["Name a Breathing Style", "Name a Breathing technique a slayer can use"],
            a: { demonslayer: "Water Breathing / Water 30; Thunder Breathing / Thunder 20; Flame Breathing / Flame 16; Sun Breathing / Sun / Hinokami Kagura 14; Beast Breathing / Beast 8; Insect Breathing / Insect 6; Love Breathing / Love 4" } },
        /* Bleach */
        { id: "bl-captains", only: true, fam: "crews", cat: "Characters", sub: "Captains", pol: "0", diff: 2, q: ["Name a captain of the Gotei 13", "Name someone who wore a captain's haori"],
            a: { bleach: "@Byakuya 18; @Kenpachi 16; @Hitsugaya 14; @Yamamoto 12; @Aizen 10; @Unohana 8; @Mayuri 8; @Soi Fon 6; @Shunsui 4" } },
        { id: "bl-espada", only: true, fam: "crews", cat: "Characters", sub: "Espada", pol: "0", diff: 2, q: ["Name a member of the Espada", "Name one of Aizen's ten strongest Arrancar"],
            a: { bleach: "@Ulquiorra 26; @Grimmjow 24; @Starrk 12; Nnoitra 10; @Harribel 8; Szayelaporro / Szayel 6; Barragan 6; Yammy 4" } },
        /* Attack on Titan */
        { id: "aot-titans", only: true, fam: "powers", cat: "Powers", sub: "Titans", pol: "0", diff: 1, q: ["Name one of the Nine Titans", "Name a Titan power that can be inherited"],
            a: { aot: "Attack Titan 24; Colossal Titan 20; Armored Titan 16; Female Titan 12; Beast Titan 10; Founding Titan 8; Jaw Titan 4; Cart Titan 3; War Hammer Titan 3" } },
        { id: "aot-104th", only: true, fam: "crews", cat: "Characters", sub: "104th", pol: "0", diff: 2, q: ["Name a member of the 104th Training Corps", "Name someone who trained alongside Eren"],
            a: { aot: "@Mikasa 22; @Armin 18; @Jean 14; @Sasha 12; @Connie 10; @Reiner 8; @Annie 6; @Historia 4; @Bertholdt 2" } },
        /* My Hero Academia */
        { id: "mha-class-a", only: true, fam: "crews", cat: "Characters", sub: "Class 1-A", pol: "0", diff: 1, q: ["Name a student in Class 1-A", "Name someone in Deku's class"],
            a: { mha: "@Izuku 22; @Bakugo 20; @Todoroki 16; @Uraraka 12; @Iida 8; @Kirishima 6; @Tsuyu 4; @Momo 4; @Kaminari 2" } },
        { id: "mha-pro-heroes", only: true, fam: "power-scale", cat: "Characters", sub: "Pro heroes", pol: "0", diff: 2, q: ["Name a Pro Hero", "Name a hero with a top-ten ranking"],
            a: { mha: "@All Might 30; @Endeavor 20; @Hawks 16; @Aizawa 10; @Mirko 10; Best Jeanist 8; @Gran Torino 4" } },
        /* Hunter x Hunter */
        { id: "hxh-troupe", only: true, fam: "crews", cat: "Characters", sub: "Phantom Troupe", pol: "0", diff: 2, q: ["Name a member of the Phantom Troupe", "Name someone with the spider tattoo"],
            a: { hxh: "@Chrollo 26; @Hisoka 16; @Feitan 12; @Uvogin 10; @Machi 8; @Shizuku 6; @Pakunoda 6; Nobunaga 6; @Phinks 4; Franklin 4" } },
        { id: "hxh-nen", only: true, fam: "powers", cat: "Powers", sub: "Nen", pol: "0", diff: 2, q: ["Name a Nen type", "Name one of the six Nen categories"],
            a: { hxh: "Enhancement / Enhancer 24; Transmutation / Transmuter 18; Emission / Emitter 14; Conjuration / Conjurer 14; Manipulation / Manipulator 14; Specialization / Specialist 12" } },
        /* Death Note */
        { id: "dn-kill", only: true, fam: "powers", cat: "Powers", sub: "Death Note rules", pol: "0", diff: 1, q: ["Name something you need to kill someone with the Death Note", "Name a rule of the Death Note"],
            a: { deathnote: "Their name / Name / Real name 40; Their face / Face 30; Cause of death / Cause 10; 40 seconds / Heart attack 10; Time of death 6" } },
        { id: "dn-suspects", only: true, fam: "story", cat: "Characters", sub: "Suspects", pol: "0", diff: 2, q: ["Name someone who was suspected of being Kira", "Name a character L had his eye on"],
            a: { deathnote: "@Light 40; @Misa 22; @Takada 10; @Mikami 10; @Soichiro 6; @Sayu 4" } },
        /* Chainsaw Man */
        { id: "csm-devils", only: true, fam: "powers", cat: "Powers", sub: "Devils", pol: "0", diff: 1, q: ["Name a devil from Chainsaw Man", "Name a devil a Devil Hunter might face"],
            a: { chainsaw: "Chainsaw Devil / Pochita 28; Gun Devil 18; Control Devil / Makima 14; Blood Fiend / Power 12; @Fox Devil 8; Bat Devil 8; @Future Devil 6; @Eternity Devil 6" } },
        /* Black Clover */
        { id: "bc-squads", only: true, fam: "crews", cat: "World", sub: "Squads", pol: "0", diff: 2, q: ["Name a Magic Knight squad", "Name one of the Clover Kingdom's knight squads"],
            a: { blackclover: "Black Bulls 36; Golden Dawn 22; Crimson Lion Kings / Crimson Lions 12; Silver Eagles 10; Blue Rose Knights / Blue Rose 8; Green Mantis 6; Coral Peacocks 4" } },
        /* JoJo */
        { id: "jojo-stands", only: true, fam: "powers", cat: "Powers", sub: "Stands", pol: "0", diff: 1, q: ["Name a Stand", "Name a Stand from JoJo's Bizarre Adventure"],
            a: { jojo: "Star Platinum 26; The World / Za Warudo 22; Gold Experience / Golden Experience 12; Crazy Diamond 10; King Crimson 10; Killer Queen 10; Sticky Fingers 6; Hierophant Green 4" } },
        { id: "jojo-jojos", only: true, fam: "crews", cat: "Characters", sub: "JoJos", pol: "0", diff: 1, q: ["Name a JoJo", "Name a main character of a JoJo part"],
            a: { jojo: "@Jotaro 26; @Joseph 20; @Jonathan 14; @Giorno 12; @Josuke 10; @Jolyne 8; @Johnny 6" } },
        /* Re:Zero */
        { id: "rz-emilia-camp", only: true, fam: "crews", cat: "Characters", sub: "Emilia camp", pol: "0", diff: 2, q: ["Name someone in Emilia's camp", "Name someone who lives at Roswaal's mansion"],
            a: { rezero: "@Subaru 24; @Rem 20; @Ram 14; @Beatrice 12; @Puck 10; @Roswaal 8; @Otto 6; @Garfiel 4" } },
        /* Fire Force */
        { id: "ff-company8", only: true, fam: "crews", cat: "Characters", sub: "Company 8", pol: "0", diff: 1, q: ["Name a member of Special Fire Force Company 8", "Name someone from Company 8"],
            a: { fireforce: "@Shinra 26; @Arthur 18; @Maki 14; @Tamaki 12; @Obi 10; @Iris 8; @Hinawa 6; @Vulcan 4" } },
        /* Frieren */
        { id: "fr-mages", only: true, fam: "crews", cat: "Characters", sub: "Mages", pol: "0", diff: 1, q: ["Name a mage from Frieren", "Name someone who took the First-Class Mage Exam or set it"],
            a: { frieren: "@Frieren 26; @Fern 20; @Serie 12; @Denken 10; @Ubel 8; @Flamme 8; @Land 6; @Methode 4" } },
        /* Wind Breaker */
        { id: "wb-bofurin", only: true, fam: "crews", cat: "Characters", sub: "Bofurin", pol: "0", diff: 1, q: ["Name a member of Bofurin", "Name a student who protects Makochi Town"],
            a: { windbreaker: "@Sakura 26; @Umemiya 18; @Suo 14; @Nirei 12; @Sugishita 10; @Hiragi 8; @Kiryu 6; @Kaji 4" } }
    ]
};
