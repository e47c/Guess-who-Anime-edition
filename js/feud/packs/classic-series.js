/* ANIME FEUD pack: CLASSIC FEUD, single-series boards (only: true). Used only when exactly that series is ticked.
   Same kinds as classic-cross.js: "canon" boards list facts (rank "fans" = characters ranked by AniList favourites, Nov 2026
   snapshot; non-roster names get small hand points; rank "known" = terms ranked by how well-known they are). Every board lists
   ALL its valid answers it can: the game shows the top 8, and a right answer that didn't make the board is told so (still a strike). */
export default {
    id: "classic-series", type: "classic", source: "Anime Arcade curated answers", review: "audited 2026-11",
    boards: [
        /* One Piece */
        { id: "op-straw-hats", only: true, fam: "crews", cat: "World", sub: "Crew", pol: "0", diff: 1, kind: "canon", rank: "fans",
            q: ["Name a member of the Straw Hat Pirates","Name someone who sails on the Thousand Sunny"],
            a: {
                onepiece: "@Monkey D. Luffy 30; @Roronoa Zoro 20; @Sanji 15; @Nico Robin 11; @Nami 8; @Tony Tony Chopper 6; @Usopp 4; @Brook 3; @Franky 2; @Jinbe 1"
            }
        },
        { id: "op-worst-gen", only: true, fam: "crews", cat: "World", sub: "Pirates", pol: "0", diff: 2, vt: "context", kind: "canon", rank: "fans",
            why: "The eleven Supernovas who reached Sabaody plus Blackbeard (the 'Worst Generation').",
            q: ["Name a member of the Worst Generation","Name one of the Supernovas who reached Sabaody"],
            a: {
                onepiece: "@Monkey D. Luffy 30; @Roronoa Zoro 20; @Trafalgar Law 15; @Marshall D. Teach 11; @Eustass Kid 8; @Jewelry Bonney 6; @Killer 4; Basil Hawkins / Hawkins 1; X Drake / Drake 1; Scratchmen Apoo / Apoo 1; Urouge 1; Capone Bege / Bege 1"
            }
        },
        { id: "op-marines", only: true, fam: "world", cat: "World", sub: "Marines", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name a character who served in the Marines","Name someone who wore the Marine coat"],
            a: {
                onepiece: "@Kuzan 30; @Monkey D. Garp 20; @Smoker 15; @Isshou 11; @Borsalino 8; @Koby 6; @Sakazuki 4; @Sengoku 3; @Aramaki 2; Tashigi 1"
            }
        },
        { id: "op-devil-fruit", only: true, fam: "powers", cat: "Powers", sub: "Devil Fruits", pol: "0", diff: 2, kind: "canon", rank: "known",
            q: ["Name a Devil Fruit","Name a Devil Fruit power"],
            a: {
                onepiece: "Gum-Gum Fruit / Gomu Gomu no Mi / Rubber / Nika / Human-Human Fruit Model Nika 30; Flame-Flame Fruit / Mera Mera no Mi / Fire 16; Op-Op Fruit / Ope Ope no Mi 14; Dark-Dark Fruit / Yami Yami no Mi / Darkness 10; Tremor-Tremor Fruit / Gura Gura no Mi / Quake 10; Flower-Flower Fruit / Hana Hana no Mi 8; Ice-Ice Fruit / Hie Hie no Mi / Ice 6; Revive-Revive Fruit / Yomi Yomi no Mi 6"
            }
        },
        { id: "op-emperors", only: true, fam: "power-scale", cat: "Characters", sub: "Emperors", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name a pirate who has been one of the Four Emperors","Name a Yonko, past or present"],
            a: {
                onepiece: "@Monkey D. Luffy 30; @Shanks 20; @Edward Newgate 15; @Buggy 11; @Marshall D. Teach 8; @Kaido 6; @Charlotte Linlin 4"
            }
        },
        { id: "op-admirals", only: true, fam: "world", cat: "World", sub: "Admirals", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name a Marine admiral, past or present","Name someone who held the rank of Marine Admiral"],
            a: {
                onepiece: "@Kuzan 30; @Isshou 20; @Borsalino 15; @Sakazuki 11; @Sengoku 8; @Aramaki 6"
            }
        },
        /* Naruto */
        { id: "na-akatsuki", only: true, fam: "crews", cat: "World", sub: "Akatsuki", pol: "0", diff: 1, kind: "canon", rank: "fans",
            q: ["Name a member of the Akatsuki","Name someone who wore the red-cloud cloak"],
            a: {
                naruto: "@Itachi Uchiha 29; @Pain 20; @Obito Uchiha 15; @Orochimaru 11; @Deidara 8; @Sasori 6; @Konan 4; @Hidan 3; @Kisame Hoshigaki 2; @Kakuzu 1; Zetsu / Black Zetsu / White Zetsu 1"
            }
        },
        { id: "na-hokage", only: true, fam: "leadership", cat: "Leadership", sub: "Hokage", pol: "0", diff: 1, kind: "canon", rank: "fans",
            q: ["Name a Hokage","Name someone who wore the Hokage hat"],
            a: {
                naruto: "@Kakashi Hatake 30; @Naruto Uzumaki 20; @Minato Namikaze 15; @Tsunade 11; @Hashirama Senju 8; @Tobirama Senju 6; @Hiruzen Sarutobi 4"
            }
        },
        { id: "na-jinchuriki", only: true, fam: "powers", cat: "Powers", sub: "Tailed beasts", pol: "0", diff: 3, kind: "canon", rank: "fans",
            q: ["Name a jinchuriki","Name someone with a tailed beast sealed inside them"],
            a: {
                naruto: "@Naruto Uzumaki 30; @Gaara 20; @Madara Uchiha 15; @Obito Uchiha 11; @Kushina Uzumaki 8; @Killer Bee 6; Yugito Nii / Yugito 1; Yagura 1; Fu 1; Roshi 1; Han 1; Utakata 1"
            }
        },
        { id: "na-kage", only: true, fam: "leadership", cat: "Leadership", sub: "Kage", pol: "0", diff: 2, kind: "canon", rank: "fans",
            why: "The Five Kage of any village (Hokage included), past or present.",
            q: ["Name a Kage from any village","Name a leader of one of the five great ninja villages"],
            a: {
                naruto: "@Kakashi Hatake 27; @Naruto Uzumaki 20; @Gaara 15; @Minato Namikaze 11; @Tsunade 8; @Hashirama Senju 6; @Tobirama Senju 4; @Hiruzen Sarutobi 3; @Mei Terumi 2; @Darui 1; @A (Fourth Raikage) 1; @Onoki 1; Yagura 1"
            }
        },
        /* Dragon Ball */
        { id: "db-transform", only: true, fam: "powers", cat: "Powers", sub: "Transformations", pol: "0", diff: 1, kind: "canon", rank: "known",
            q: ["Name a transformation in Dragon Ball","Name a form a Dragon Ball fighter can transform into"],
            a: {
                dragonball: "Super Saiyan / SSJ 40; Ultra Instinct / UI 16; Super Saiyan Blue / SSJ Blue / Blue 12; Great Ape / Oozaru 10; Super Saiyan 3 / SSJ3 8; Golden Frieza 6; Ultra Ego 4; Super Saiyan God / SSJ God 4"
            }
        },
        { id: "db-saiyans", only: true, fam: "crews", cat: "Characters", sub: "Saiyans", pol: "0", diff: 1, kind: "canon", rank: "fans",
            q: ["Name a Saiyan","Name someone with Saiyan blood"],
            a: {
                dragonball: "@Goku 28; @Vegeta 20; @Trunks 15; @Gohan 11; @Broly 8; @Bardock 6; @Goten 4; @Caulifla 3; @Kale 2; @Raditz 1; @Nappa 1; @Cabba 1"
            }
        },
        { id: "db-gods", only: true, fam: "power-scale", cat: "Characters", sub: "Gods", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name a God of Destruction or an Angel","Name one of the gods or angels who watch over a universe"],
            a: {
                dragonball: "@Beerus 30; @Whis 20; @Vados 15; @Champa 11; Belmod / Vermoud 1; Quitela 1; Marcarita 1; Grand Priest / Daishinkan 1"
            }
        },
        /* Jujutsu Kaisen */
        { id: "jjk-domains", only: true, fam: "powers", cat: "Powers", sub: "Domains", pol: "0", diff: 2, kind: "canon", rank: "known",
            q: ["Name a Domain Expansion","Name a domain from Jujutsu Kaisen"],
            a: {
                jjk: "Unlimited Void / Infinite Void / Muryokusho 32; Malevolent Shrine / Fukuma Mizushi 28; Chimera Shadow Garden 10; Self-Embodiment of Perfection 10; Coffin of the Iron Mountain 6; Idle Death Gamble 6; Deadly Sentencing 4; Authentic Mutual Love 2; Horizon of the Captivating Skandha 2"
            }
        },
        { id: "jjk-special-grade", only: true, fam: "power-scale", cat: "Characters", sub: "Special grade", pol: "0", diff: 2, kind: "canon", rank: "fans",
            why: "Officially special grade: the four special grade sorcerers, special grade curses and special grade cursed objects.",
            q: ["Name a special grade sorcerer or curse","Name someone ranked special grade"],
            a: {
                jjk: "@Satoru Gojo 29; @Ryomen Sukuna 20; @Yuta Okkotsu 15; @Suguru Geto 11; @Choso 8; @Mahito 6; @Yuki Tsukumo 4; @Jogo 3; @Rika Orimoto 2; @Hanami 1; @Dagon 1"
            }
        },
        { id: "jjk-curses", only: true, fam: "villains", cat: "Characters", sub: "Curses", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name a cursed spirit from Jujutsu Kaisen","Name a curse born from human fear"],
            a: {
                jjk: "@Ryomen Sukuna 30; @Mahito 20; @Jogo 15; @Rika Orimoto 11; @Hanami 8; @Dagon 6; @Kurourushi 4"
            }
        },
        /* Demon Slayer */
        { id: "ds-hashira", only: true, fam: "crews", cat: "Characters", sub: "Hashira", pol: "0", diff: 1, kind: "canon", rank: "fans",
            q: ["Name a Hashira","Name one of the Demon Slayer Corps' Pillars"],
            a: {
                demonslayer: "@Giyu Tomioka 30; @Kyojuro Rengoku 20; @Shinobu Kocho 15; @Tengen Uzui 11; @Mitsuri Kanroji 8; @Muichiro Tokito 6; @Obanai Iguro 4; @Sanemi Shinazugawa 3; @Gyomei Himejima 2; @Kanae Kocho 1"
            }
        },
        { id: "ds-breathing", only: true, fam: "powers", cat: "Powers", sub: "Breathing styles", pol: "0", diff: 1, kind: "canon", rank: "known",
            q: ["Name a Breathing Style","Name a Breathing technique a slayer can use"],
            a: {
                demonslayer: "Water Breathing / Water 26; Thunder Breathing / Thunder 18; Flame Breathing / Flame 14; Sun Breathing / Sun / Hinokami Kagura 12; Beast Breathing / Beast 8; Insect Breathing / Insect 5; Love Breathing / Love 4; Mist Breathing / Mist 3; Wind Breathing / Wind 3; Stone Breathing / Stone 2; Sound Breathing / Sound 2; Serpent Breathing / Serpent 1; Moon Breathing / Moon 1; Flower Breathing / Flower 1"
            }
        },
        { id: "ds-upper-moons", only: true, fam: "villains", cat: "Characters", sub: "Upper Moons", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name an Upper Moon demon","Name one of Muzan's Upper Rank demons"],
            a: {
                demonslayer: "@Akaza 30; @Doma 20; @Kokushibo 15; @Daki 11; @Gyutaro 8; @Nakime 6; @Hantengu 4; @Kaigaku 3; @Gyokko 2"
            }
        },
        /* Bleach */
        { id: "bl-captains", only: true, fam: "crews", cat: "Characters", sub: "Captains", pol: "0", diff: 2, kind: "canon", rank: "fans",
            why: "Gotei 13 captains at any point in the story (former captains such as Urahara, Isshin and Yoruichi included).",
            q: ["Name a captain of the Gotei 13","Name someone who wore a captain's haori"],
            a: {
                bleach: "@Kisuke Urahara 22; @Sosuke Aizen 20; @Yoruichi Shihoin 15; @Kenpachi Zaraki 11; @Toshiro Hitsugaya 8; @Byakuya Kuchiki 6; @Shunsui Kyoraku 4; @Shinji Hirako 3; @Gin Ichimaru 2; @Soi Fon 1; @Retsu Unohana 1; @Mayuri Kurotsuchi 1; @Genryusai Yamamoto 1; @Jushiro Ukitake 1; @Isshin Kurosaki 1; @Kaname Tosen 1; @Sajin Komamura 1; @Kensei Muguruma 1"
            }
        },
        { id: "bl-espada", only: true, fam: "crews", cat: "Characters", sub: "Espada", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name a member of the Espada","Name one of Aizen's ten strongest Arrancar"],
            a: {
                bleach: "@Ulquiorra Cifer 29; @Grimmjow Jaegerjaquez 20; @Nelliel Tu Oderschvank 15; @Coyote Starrk 11; @Tier Harribel 8; @Szayelaporro Granz 6; @Nnoitra Gilga 4; @Baraggan Louisenbairn 3; @Yammy Llargo 2; Zommari Rureaux / Zommari 1; Aaroniero Arruruerie / Aaroniero 1"
            }
        },
        { id: "bl-zanpakuto", only: true, fam: "powers", cat: "Powers", sub: "Zanpakuto", pol: "0", diff: 2, kind: "canon", rank: "known",
            q: ["Name a Zanpakuto from Bleach","Name a Soul Reaper's sword spirit"],
            a: {
                bleach: "Zangetsu 26; Senbonzakura 18; Hyorinmaru / Daiguren Hyorinmaru 14; Zabimaru 10; Sode no Shirayuki 8; Kyoka Suigetsu 8; Ryujin Jakka 6; Benihime 4; Katen Kyokotsu 4; Shinso 2"
            }
        },
        /* Attack on Titan */
        { id: "aot-titans", only: true, fam: "powers", cat: "Powers", sub: "Titans", pol: "0", diff: 1, kind: "canon", rank: "known",
            q: ["Name one of the Nine Titans","Name a Titan power that can be inherited"],
            a: {
                aot: "Attack Titan 24; Colossal Titan 20; Armored Titan 16; Female Titan 12; Beast Titan 10; Founding Titan 8; Jaw Titan 4; Cart Titan 3; War Hammer Titan 3"
            }
        },
        { id: "aot-104th", only: true, fam: "crews", cat: "Characters", sub: "104th", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name a member of the 104th Training Corps","Name a cadet from Eren's training class"],
            a: {
                aot: "@Eren Yeager 28; @Mikasa Ackerman 20; @Armin Arlert 15; @Sasha Blouse 11; @Reiner Braun 8; @Jean Kirstein 6; @Annie Leonhart 4; @Historia Reiss 3; @Ymir 2; @Connie Springer 1; @Bertholdt Hoover 1; Marco Bott / Marco 1"
            }
        },
        { id: "aot-shifters", only: true, fam: "powers", cat: "Characters", sub: "Shifters", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name someone who inherited one of the Nine Titans","Name a Titan shifter"],
            a: {
                aot: "@Eren Yeager 24; @Armin Arlert 20; @Reiner Braun 15; @Annie Leonhart 11; @Zeke Yeager 8; @Pieck Finger 6; @Ymir 4; @Falco Grice 3; @Bertholdt Hoover 2; @Grisha Yeager 1; @Porco Galliard 1; @Frieda Reiss 1; @Lara Tybur 1; @Uri Reiss 1; @Marcel Galliard 1; Eren Kruger / Kruger / The Owl 1"
            }
        },
        /* My Hero Academia */
        { id: "mha-class-a", only: true, fam: "crews", cat: "Characters", sub: "Class 1-A", pol: "0", diff: 1, kind: "canon", rank: "fans",
            q: ["Name a student in Class 1-A","Name someone in Deku's class"],
            a: {
                mha: "@Shoto Todoroki 20; @Katsuki Bakugo 20; @Izuku Midoriya 15; @Eijiro Kirishima 11; @Ochaco Uraraka 8; @Denki Kaminari 6; @Tsuyu Asui 4; @Kyoka Jiro 3; @Fumikage Tokoyami 2; @Momo Yaoyorozu 1; @Mina Ashido 1; @Tenya Iida 1; @Hanta Sero 1; @Yuga Aoyama 1; @Mezo Shoji 1; Minoru Mineta / Mineta 1; Mashirao Ojiro / Ojiro 1; Toru Hagakure / Hagakure 1; Koji Koda / Koda 1; Rikido Sato / Sato 1"
            }
        },
        { id: "mha-pro-heroes", only: true, fam: "power-scale", cat: "Characters", sub: "Pro heroes", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name a Pro Hero","Name a licensed professional hero from My Hero Academia"],
            a: {
                mha: "@Shota Aizawa 25; @All Might 20; @Hawks 15; @Mirko 11; @Endeavor 8; @Mt. Lady 6; @Sir Nighteye 4; @Present Mic 3; @Fat Gum 2; @Gran Torino 1; @Star and Stripe 1; @Best Jeanist 1; @Ryukyu 1; @Edgeshot 1; @Gang Orca 1"
            }
        },
        { id: "mha-league", only: true, fam: "villains", cat: "Characters", sub: "League of Villains", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name a member of the League of Villains","Name someone who fought alongside Shigaraki"],
            a: {
                mha: "@Himiko Toga 30; @Dabi 20; @Tomura Shigaraki 15; @Twice 11; @Kurogiri 8; @Mr. Compress 6; @Spinner 4; @Muscular 3; @Gigantomachia 2"
            }
        },
        /* Hunter x Hunter */
        { id: "hxh-troupe", only: true, fam: "crews", cat: "Characters", sub: "Phantom Troupe", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name a member of the Phantom Troupe","Name someone with the spider tattoo"],
            a: {
                hxh: "@Hisoka Morow 25; @Chrollo Lucilfer 20; @Feitan Portor 15; @Shizuku Murasaki 11; @Illumi Zoldyck 8; @Machi Komacine 6; @Pakunoda 4; @Shalnark 3; @Kalluto Zoldyck 2; @Uvogin 1; @Nobunaga Hazama 1; @Phinks Magcub 1; @Bonolenov Ndongo 1; @Franklin Bordeaux 1; @Kortopi 1"
            }
        },
        { id: "hxh-nen", only: true, fam: "powers", cat: "Powers", sub: "Nen", pol: "0", diff: 2, kind: "canon", rank: "known",
            q: ["Name a Nen type","Name one of the six Nen categories"],
            a: {
                hxh: "Enhancement / Enhancer 24; Transmutation / Transmuter 18; Emission / Emitter 14; Conjuration / Conjurer 14; Manipulation / Manipulator 14; Specialization / Specialist 12"
            }
        },
        { id: "hxh-ants", only: true, fam: "villains", cat: "Characters", sub: "Chimera Ants", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name a Chimera Ant","Name someone born from the Chimera Ant Queen"],
            a: {
                hxh: "@Meruem 29; @Neferpitou 20; @Shaiapouf 15; @Ikalgo 11; @Meleoron 8; @Menthuthuyoupi 6; @Colt 4; @Cheetu 3; @Welfin 2; @Zazan 1; @Leol 1"
            }
        },
        /* Death Note */
        { id: "dn-kill", only: true, fam: "powers", cat: "Powers", sub: "Death Note rules", pol: "0", diff: 1, kind: "canon", rank: "known",
            why: "Rules written in the Death Note itself (How to Use It).",
            q: ["Name a rule written in the Death Note","Name something the Death Note's rules say"],
            a: {
                deathnote: "Write their name / Name / Real name / Write the name 30; Picture their face / Face / Know their face 24; Heart attack if no cause / Heart attack 16; 40 seconds / Forty seconds 12; Shinigami Eyes cost half your lifespan / Eye deal / Half your lifespan 8; Touching it lets you see its Shinigami / Touch the notebook 6; 6 minutes 40 seconds for the details / 6 minutes 40 seconds 4"
            }
        },
        { id: "dn-suspects", only: true, fam: "story", cat: "Characters", sub: "Suspects", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name someone who was suspected of being Kira","Name a character L or Near had their eye on as Kira"],
            a: {
                deathnote: "@Light Yagami 30; @Misa Amane 20; @Teru Mikami 15; @Kiyomi Takada 11; @Kyosuke Higuchi 8"
            }
        },
        { id: "dn-shinigami", only: true, fam: "powers", cat: "Characters", sub: "Shinigami", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name a Shinigami from Death Note","Name a death god from the Shinigami Realm"],
            a: {
                deathnote: "@Ryuk 30; @Rem 20; @Sidoh 15; @Jealous 11; Shinigami King / King of Death 1; Gook 1; Midora 1; Calikarcha 1; Justin Beyondormason / Armonia 1"
            }
        },
        /* Chainsaw Man */
        { id: "csm-devils", only: true, fam: "powers", cat: "Powers", sub: "Devils", pol: "0", diff: 1, kind: "canon", rank: "known",
            q: ["Name a devil from Chainsaw Man","Name a devil a Devil Hunter might face"],
            a: {
                chainsaw: "Chainsaw Devil / Pochita 28; Gun Devil 18; Control Devil / Makima 14; @Fox Devil 8; Darkness Devil 8; @Future Devil 6; @Eternity Devil 6; @Curse Devil 4; Bat Devil 4; War Devil / Yoru 4"
            }
        },
        { id: "csm-hunters", only: true, fam: "crews", cat: "Characters", sub: "Devil Hunters", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name a Public Safety Devil Hunter","Name someone who worked for Public Safety"],
            a: {
                chainsaw: "@Makima 29; @Denji 20; @Power 15; @Aki Hayakawa 11; @Kobeni Higashiyama 8; @Angel Devil 6; @Himeno 4; @Kishibe 3; @Beam 2; @Hirofumi Yoshida 1; @Violence Fiend 1"
            }
        },
        /* Black Clover */
        { id: "bc-squads", only: true, fam: "crews", cat: "World", sub: "Squads", pol: "0", diff: 2, kind: "canon", rank: "known",
            q: ["Name a Magic Knight squad","Name one of the Clover Kingdom's knight squads"],
            a: {
                blackclover: "Black Bulls 34; Golden Dawn 20; Crimson Lion Kings / Crimson Lions 12; Silver Eagles 10; Blue Rose Knights / Blue Rose 8; Green Mantis / Green Praying Mantis 6; Coral Peacocks 4; Purple Orcas 3; Aqua Deer / Azure Deer 3"
            }
        },
        { id: "bc-black-bulls", only: true, fam: "crews", cat: "Characters", sub: "Black Bulls", pol: "0", diff: 1, kind: "canon", rank: "fans",
            q: ["Name a member of the Black Bulls","Name someone who lives at the Black Bulls hideout"],
            a: {
                blackclover: "@Yami Sukehiro 25; @Asta 20; @Noelle Silva 15; @Luck Voltia 11; @Secre Swallowtail 8; @Zora Ideale 6; @Vanessa Enoteca 4; @Charmy Pappitson 3; @Finral Roulacase 2; @Nacht Faust 1; @Magna Swing 1; @Gordon Agrippa 1; @Grey 1; @Gauche Adlai 1; @Henry Legolant 1"
            }
        },
        /* JoJo */
        { id: "jojo-stands", only: true, fam: "powers", cat: "Powers", sub: "Stands", pol: "0", diff: 1, kind: "canon", rank: "known",
            q: ["Name a Stand","Name a Stand from JoJo's Bizarre Adventure"],
            a: {
                jojo: "Star Platinum 26; The World / Za Warudo 22; Gold Experience / Golden Experience 12; Crazy Diamond 10; King Crimson 10; Killer Queen 10; Sticky Fingers 6; Hierophant Green 4"
            }
        },
        { id: "jojo-jojos", only: true, fam: "crews", cat: "Characters", sub: "JoJos", pol: "0", diff: 1, kind: "canon", rank: "fans",
            q: ["Name a JoJo","Name a main character of a JoJo part"],
            a: {
                jojo: "@Joseph Joestar 30; @Jotaro Kujo 20; @Josuke Higashikata 15; @Jolyne Cujoh 11; @Johnny Joestar 8; @Giorno Giovanna 6; @Jonathan Joestar 4"
            }
        },
        { id: "jojo-team-bucciarati", only: true, fam: "crews", cat: "Characters", sub: "Team Bucciarati", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name a member of Bucciarati's team","Name someone who escorted Trish in Golden Wind"],
            a: {
                jojo: "@Giorno Giovanna 30; @Bruno Bucciarati 20; @Guido Mista 15; @Narancia Ghirga 11; @Leone Abbacchio 8; @Pannacotta Fugo 6; @Trish Una 4"
            }
        },
        /* Re:Zero */
        { id: "rz-emilia-camp", only: true, fam: "crews", cat: "Characters", sub: "Emilia camp", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name someone in Emilia's camp","Name someone who lives at Roswaal's mansion"],
            a: {
                rezero: "@Emilia 30; @Rem 20; @Subaru Natsuki 15; @Beatrice 11; @Ram 8; @Otto Suwen 6; @Garfiel Tinsel 4; @Puck 3; @Roswaal L Mathers 2; @Frederica Baumann 1"
            }
        },
        { id: "rz-archbishops", only: true, fam: "villains", cat: "Characters", sub: "Archbishops", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name a Sin Archbishop of the Witch Cult","Name an archbishop who carries a Witch Factor"],
            a: {
                rezero: "@Petelgeuse Romanee-Conti 30; @Regulus Corneas 20; @Capella Emerada Lugnica 15; @Louis Arneb 11; @Sirius Romanee-Conti 8; @Lye Batenkaitos 6; @Roy Alphard 4"
            }
        },
        { id: "rz-witches", only: true, fam: "powers", cat: "Characters", sub: "Witches", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name a Witch from Re:Zero","Name one of the Witches of the Deadly Sins (or the Witch of Vainglory)"],
            a: {
                rezero: "@Echidna 30; @Satella 20; @Minerva 15; @Pandora 11; @Carmilla 8; @Sekhmet 6; @Daphne 4; @Typhon 3"
            }
        },
        /* Fire Force */
        { id: "ff-company8", only: true, fam: "crews", cat: "Characters", sub: "Company 8", pol: "0", diff: 1, kind: "canon", rank: "fans",
            q: ["Name a member of Special Fire Force Company 8","Name someone from Company 8"],
            a: {
                fireforce: "@Iris 30; @Shinra Kusakabe 20; @Arthur Boyle 15; @Maki Oze 11; @Tamaki Kotatsu 8; @Akitaru Obi 6; @Takehisa Hinawa 4; @Vulcan Joseph 3; @Viktor Licht 2; @Lisa Isaribi 1"
            }
        },
        { id: "ff-pillars", only: true, fam: "powers", cat: "Characters", sub: "Pillars", pol: "0", diff: 3, kind: "canon", rank: "fans",
            q: ["Name one of the Adolla Pillars","Name someone the White Clad hunted as a Pillar"],
            a: {
                fireforce: "@Shinra Kusakabe 30; @Sho Kusakabe 20; @Haumea 15; @Inca Kasugatani 11; @Nataku Son 8; Amaterasu 1"
            }
        },
        /* Frieren */
        { id: "fr-mages", only: true, fam: "crews", cat: "Characters", sub: "Mages", pol: "0", diff: 1, kind: "canon", rank: "fans",
            q: ["Name a mage from Frieren","Name a character in Frieren who casts spells"],
            a: {
                frieren: "@Frieren 27; @Fern 20; @Ubel 15; @Flamme 11; @Serie 8; @Denken 6; @Methode 4; @Sense 3; @Wirbel 2; @Lawine 1; @Land 1; @Kanne 1; @Laufen 1"
            }
        },
        { id: "fr-demons", only: true, fam: "villains", cat: "Characters", sub: "Demons", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name a demon from Frieren","Name a demon who speaks like a human"],
            a: {
                frieren: "@Macht 30; @Aura 20; @Linie 15; @Lugner 11; @Qual 8; @Revolte 6; @Draht 4; Solitar / Solitär 1; The Demon King / Demon King 1"
            }
        },
        /* Gachiakuta */
        { id: "ga-cleaners", only: true, fam: "crews", cat: "Characters", sub: "Cleaners", pol: "0", diff: 1, kind: "canon", rank: "fans",
            q: ["Name a Cleaner from Gachiakuta","Name someone who hunts Trash Beasts for the Cleaners"],
            a: {
                gachiakuta: "@Enjin 25; @Rudo 20; @Riyo Reaper 15; @Zanka Nijiku 11; @Tamsy Caines 8; @Guita Heavy Fantasia 6; @Semiu Grier 4; @Follo Tunito 3; @Gris Rubion 2; @Dear Santa 1; @Fu Orostor 1; @Eishia Stilza 1; @Alha Korvus 1; @Bro Santa 1; @Delmon Gates 1"
            }
        },
        { id: "ga-raiders", only: true, fam: "villains", cat: "Characters", sub: "Raiders", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name a Raider from Gachiakuta","Name someone who works for Zodyl"],
            a: {
                gachiakuta: "@Jabber Wonger 30; @Zodyl Typhon 20; @Bundus Begalkeit 15; @Cthoni Andor 11; @Momoa Rukel 8; @Noerde Hew Amozo 6"
            }
        },
        /* Wind Breaker */
        { id: "wb-bofurin", only: true, fam: "crews", cat: "Characters", sub: "Bofurin", pol: "0", diff: 1, kind: "canon", rank: "fans",
            q: ["Name a member of Bofurin","Name a student who protects Makochi Town"],
            a: {
                windbreaker: "@Haruka Sakura 29; @Hayato Suo 20; @Hajime Umemiya 15; @Ren Kaji 11; @Tasuku Tsubakino 8; @Mitsuki Kiryu 6; @Akihiko Nirei 4; @Kyotaro Sugishita 3; @Toma Hiragi 2; @Taiga Tsugeura 1; @Masaki Anzai 1"
            }
        },
        { id: "wb-shishitoren", only: true, fam: "villains", cat: "Characters", sub: "Shishitoren", pol: "0", diff: 2, kind: "canon", rank: "fans",
            q: ["Name a member of Shishitoren","Name a fighter from Bofurin's rival gang Shishitoren"],
            a: {
                windbreaker: "@Jo Togame 30; @Choji Tomiyama 20; @Kota Sako 15; @Minoru Kanuma 11; @Yukinari Arima 8"
            }
        }
    ]
};
