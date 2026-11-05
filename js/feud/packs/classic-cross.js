/* ANIME FEUD pack: CLASSIC FEUD, boards ranked per series.
   Every board says what kind of question it is (kind) and how its answers are ranked:
     kind "canon" = every answer is a canon fact. rank "fans": character answers ranked by AniList favourites
                    (points = their share, Nov 2026 snapshot; tools/feud-check.mjs warns when popularity drifts).
                    rank "known": names of techniques, places, items ranked by how well-known they are (editors' estimate).
     kind "feats" = generated from the Anime Draft ratings (gen: { stat }): the series' best in that one category.
     kind "power" = overall strength, ranked by canon outcomes (who beat whom); the reason is in "why".
     kind "poll"  = an opinion question; the ranking is our editors' poll and is labelled as such in the game.
   Line format: "Shown answer / alias / alias 30; ..."  ("@Name" = a character from the Anime Draft roster: portrait, and the
   first name, last name, nicknames.js and aliases.js spellings are accepted too). "{s}" = the series name(s), "{a}" = "One Piece " or nothing.
   Append new wordings at the END of a board's q list (a wording's id is its position). This file is generated from a template:
   edit it directly, keeping the format. */
export default {
    id: "classic-cross", type: "classic", source: "Anime Arcade curated answers", review: "audited 2026-11",
    boards: [
        { id: "c-technique", fam: "powers", cat: "Powers", sub: "Techniques", pol: "0", diff: 1, kind: "canon", rank: "known",
            q: ["Name an iconic technique or power from {s}","Name a famous attack or move from {s}"],
            a: {
                onepiece: "Gum-Gum Pistol / Gomu Gomu no Pistol / Pistol 24; Gear Fifth / Gear 5 / Gear Five 18; Three Sword Style / Santoryu / Santoryuu 16; Red Hawk / Gum-Gum Red Hawk 10; Diable Jambe / Devil Leg 8; Room / Shambles 8; Gear Second / Gear 2 6; Conqueror's Haki / Haoshoku Haki / Conquerors Haki 6",
                naruto: "Rasengan / Spiraling Sphere 28; Chidori / Lightning Blade / Raikiri 22; Shadow Clone Jutsu / Shadow Clone / Kage Bunshin / Multi Shadow Clone 16; Amaterasu 10; Sexy Jutsu / Harem Jutsu / Oiroke no Jutsu 8; Susanoo / Susano'o 6; Rasenshuriken / Rasen Shuriken 6; Summoning Jutsu / Kuchiyose no Jutsu / Summoning 4",
                dragonball: "Kamehameha 40; Spirit Bomb / Genki Dama 18; Final Flash 10; Galick Gun 8; Special Beam Cannon / Makankosappo 8; Destructo Disc / Kienzan 6; Instant Transmission / Shunkan Ido 6; Solar Flare / Taiyoken 4",
                jjk: "Hollow Purple / Purple / Murasaki 22; Black Flash / Kokusen 20; Domain Expansion / Domain / Ryoiki Tenkai 14; Dismantle / Cleave / Kai / Hachi 10; Divergent Fist 10; Ten Shadows / Divine Dogs / Mahoraga 10; Boogie Woogie 6; Resonance / Hairpin 4",
                demonslayer: "Hinokami Kagura / Dance of the Fire God / Sun Breathing 24; Thunderclap and Flash / Thunderclap 22; Water Breathing / Water Surface Slash 16; Dead Calm / Nagi 10; Flame Breathing / Ninth Form Rengoku 8; Beast Breathing 6; Exploding Blood / Bakketsu 6; Constant Flux / Seisei Ruten 4",
                bleach: "Getsuga Tensho / Getsuga 34; Bankai 22; Cero 10; Senbonzakura / Senbonzakura Kageyoshi 10; Black Coffin / Kurohitsugi / Hado 90 8; Flash Step / Shunpo 6; Daiguren Hyorinmaru / Hyorinmaru 6; Mugetsu 4",
                aot: "ODM Gear / 3D Maneuver Gear / Omni-directional mobility gear / ODM 30; Titan Shifting / Titan transformation / transform into a Titan 24; The Rumbling / Rumbling 18; Thunder Spears / Thunder Spear 12; Hardening / Crystal hardening 8; Coordinate / Founding Titan scream / Scream 4",
                mha: "Detroit Smash / Smash 30; One For All / Full Cowl / OFA 18; Howitzer Impact / Explosion / AP Shot 14; Half-Cold Half-Hot / Flashfire / Ice and fire 12; Erasure / Erase 8; Decay 8; Hardening / Red Riot Unbreakable 6; Black Whip 4",
                hxh: "Jajanken / Rock Paper Scissors 30; Bungee Gum 18; Godspeed / Whirlwind / Kanmuru 16; Chain Jail / Chains 12; Hundred-Type Guanyin Bodhisattva / Zero Hand 10; Skill Hunter 8; Gyo / Ren / Zetsu / Ten 4",
                chainsaw: "Chainsaw arms / Chainsaw transformation / Pull the cord 30; Bang / Finger gun 16; Blood Hammer / Blood weapons 14; Kon / Fox Devil 14; Future Devil / Future 8; Curse Devil / Curse 8; Bomb / Explosion 8",
                blackclover: "Anti-Magic / Anti Magic 34; Black Divider / Demon Slayer Sword 14; Black Hole 10; Sylph / Wind spirit 10; Sea Dragon's Roar / Water magic 8; Spatial Magic / Portal 8; Devil Union / Black Asta / Union 8; Mana Zone 6",
                jojo: "ORA ORA / Ora Ora Ora 26; ZA WARUDO / The World / Time Stop 20; MUDA MUDA / Muda Muda 18; Hamon / Ripple 12; Bites the Dust / Killer Queen Bites the Dust 8; Requiem / Gold Experience Requiem 6; The Spin / Golden Rotation / Spin 6; Road Roller 4",
                rezero: "Return by Death 50; El Huma 12; Shamak 12; Invisible Providence / Unseen Hand 8; Al Goa 6; Murak 6",
                fireforce: "Devil's Footprints / Rocket feet / Fire feet 30; Excalibur / Plasma sword 16; Benimaru's Pinwheel / Pinwheel 14; Adolla Burst / Adolla Link 12; Nekomata / Cat flames 8",
                frieren: "Zoltraak / Ordinary Offensive Magic 36; Defensive Magic / Barrier 14; Scales of Obedience / Scale of Obedience 14; Flower field magic / Flower field 12; Mana concealment / Mana suppression / Hiding mana 10; Reelseiden / Cutting magic 8",
                gachiakuta: "3R / 3R gloves 30; Umbreaker / Umbrella 20; Time Walk 12; Lovely Assistaff / Assistaff 10; Mankira / Claws 8"
            }
        },
        { id: "c-villain", fam: "villains", cat: "Characters", sub: "Villains", pol: "-", diff: 1, kind: "canon", rank: "fans",
            why: "Canonical antagonists of their story (not neutral or misunderstood characters), ranked by AniList favourites.",
            q: ["Name a villain from {s}","Name a {a}bad guy everyone loves to hate"],
            a: {
                onepiece: "@Donquixote Doflamingo 29; @Buggy 20; @Crocodile 15; @Marshall D. Teach 11; @Enel 8; @Rob Lucci 6; @Kaido 4; @Sakazuki 3; @Caesar Clown 2; @Charlotte Linlin 1; @Gecko Moria 1",
                naruto: "@Itachi Uchiha 30; @Pain 20; @Madara Uchiha 15; @Obito Uchiha 11; @Orochimaru 8; @Zabuza Momochi 6; @Hidan 4; @Kabuto Yakushi 3; @Kaguya Otsutsuki 2; @Danzo Shimura 1",
                dragonball: "@Frieza 30; @Cell 20; @Goku Black 15; @Majin Buu 11; @Zamasu 8; @Raditz 6; @King Piccolo 4; @Captain Ginyu 3; @Dr. Gero 2",
                jjk: "@Ryomen Sukuna 30; @Suguru Geto 20; @Toji Fushiguro 15; @Mahito 11; @Jogo 8; @Kenjaku 6; @Hanami 4; @Uraume 3",
                demonslayer: "@Akaza 30; @Muzan Kibutsuji 20; @Doma 15; @Kokushibo 11; @Daki 8; @Gyutaro 6; @Rui 4; @Enmu 3; @Hantengu 2",
                bleach: "@Sosuke Aizen 30; @Ulquiorra Cifer 20; @Grimmjow Jaegerjaquez 15; @Gin Ichimaru 11; @Coyote Starrk 8; @Yhwach 6; @Kaname Tosen 4; @Kugo Ginjo 3",
                aot: "@Eren Yeager 30; @Reiner Braun 20; @Annie Leonhart 15; @Zeke Yeager 11; @Floch Forster 8; @Bertholdt Hoover 6; @Kenny Ackerman 4",
                mha: "@Himiko Toga 30; @Dabi 20; @Tomura Shigaraki 15; @Twice 11; @Kai Chisaki 8; @Stain 6; @All For One 4; @Re-Destro 3",
                hxh: "@Hisoka Morow 30; @Chrollo Lucilfer 20; @Meruem 15; @Feitan Portor 11; @Neferpitou 8; @Illumi Zoldyck 6; @Shaiapouf 4; @Genthru 3",
                deathnote: "@Light Yagami 30; @Misa Amane 20; @Teru Mikami 15; @Kiyomi Takada 11; @Kyosuke Higuchi 8",
                chainsaw: "@Makima 30; @Reze 20; @Samurai Sword 15; @Akane Sawatari 11; @Gun Devil 8; @Santa Claus 6",
                blackclover: "@Zenon Zogratis 30; @Vanica Zogratis 20; @Dante Zogratis 15; @Zagred 11; @Vetto 8; @Lucifero 6; @Megicula 4",
                jojo: "@Dio Brando 30; @Yoshikage Kira 20; @Funny Valentine 15; @Enrico Pucci 11; @Diavolo 8; @Kars 6; @Esidisi 4",
                rezero: "@Petelgeuse Romanee-Conti 30; @Elsa Granhiert 20; @Regulus Corneas 15; @Capella Emerada Lugnica 11; @Sirius Romanee-Conti 8; @Lye Batenkaitos 6",
                fireforce: "@Sho Kusakabe 36; @Charon 20; @Haumea 16; Evangelist / The Evangelist 10; @Rekka Hoshimiya 4; @Dr. Giovanni 3; @Dragon 2",
                frieren: "@Macht 30; @Aura 20; @Linie 15; @Lugner 11; @Qual 8; @Revolte 6; @Draht 4",
                gachiakuta: "@Jabber Wonger 30; @Zodyl Typhon 20; @Bundus Begalkeit 15; @Cthoni Andor 11; @Noerde Hew Amozo 8",
                windbreaker: "@Jo Togame 30; @Yamato Endo 20; @Choji Tomiyama 15; @Chika Takiishi 11; @Shingo Natori 8"
            }
        },
        { id: "c-group", fam: "world", cat: "World", sub: "Groups", pol: "0", diff: 1, kind: "canon", rank: "known",
            q: ["Name a group or organization from {s}","Name a crew, clan or faction from {s}"],
            a: {
                onepiece: "Straw Hat Pirates / Straw Hats / Straw Hat crew / Mugiwara 34; Marines / Navy 22; Revolutionary Army / Revolutionaries 12; Whitebeard Pirates 10; Blackbeard Pirates 6; CP9 / Cipher Pol 6; Seven Warlords / Shichibukai / Warlords 6; Beasts Pirates 4",
                naruto: "Akatsuki 38; Team 7 / Team Seven 18; Uchiha Clan / Uchiha 10; Anbu 10; Hidden Leaf / Leaf Village / Konoha 10; Legendary Sannin / Sannin 6; Hyuga Clan / Hyuga 4; Sound Four 4",
                dragonball: "Z Fighters / Z Warriors 36; Red Ribbon Army 20; Frieza Force / Frieza's army 14; Ginyu Force 14; Pride Troopers 8; Saiyans 4",
                jjk: "Tokyo Jujutsu High / Jujutsu High / Tokyo school 30; Zenin Clan / Zenin 16; Kyoto Jujutsu High / Kyoto school 14; Disaster Curses / Cursed Spirits 12; Gojo Clan 8; Jujutsu higher-ups / Higher ups 6; Death Paintings / Death Painting Wombs 6",
                demonslayer: "Demon Slayer Corps / Corps / Kisatsutai 34; Hashira / Pillars 28; Twelve Kizuki / Upper Moons / Upper Ranks 22; Lower Moons / Lower Ranks 8; Kakushi 4; Kamado family 4",
                bleach: "Gotei 13 / Gotei Thirteen / Soul Reapers / Shinigami 34; Espada 24; Visored / Vizards 12; Arrancar 10; Wandenreich / Sternritter / Quincy 10; Royal Guard / Squad Zero 6; Xcution 4",
                aot: "Survey Corps / Scout Regiment / Scouts 40; Military Police / MPs 14; Garrison / Garrison Regiment 12; Marleyan Warriors / Warriors 12; Yeagerists / Jaegerists 10; Levi Squad 6; Anti-Personnel Control Squad 4",
                mha: "Class 1-A / 1A / Class A 30; League of Villains 26; U.A. / UA High / UA 14; Shie Hassaikai / Eight Precepts 10; Big Three 8; Meta Liberation Army 6; Paranormal Liberation Front 4",
                hxh: "Phantom Troupe / Genei Ryodan / Spiders 40; Zoldyck Family / Zoldycks 20; Chimera Ants / Ants / Royal Guard 18; Hunter Association 10; Zodiacs 6",
                deathnote: "Task Force / Kira Investigation Team / Japanese Task Force 36; SPK 22; Shinigami / Death Gods 18; Mafia / Mello's mafia 10; Wammy's House 8; Yotsuba Group / Yotsuba 6",
                chainsaw: "Public Safety / Public Safety Devil Hunters / Special Division 4 / Division 4 40; Devil Hunters 18; Chainsaw Man Church 10; Hybrids 10; Fiends 8; Four Horsemen 4",
                blackclover: "Black Bulls 40; Golden Dawn 16; Magic Knights / Clover Kingdom Magic Knights 14; Eye of the Midnight Sun 10; Dark Triad 10; Spade Kingdom 6; Crimson Lion Kings / Crimson Lions 4",
                jojo: "Stardust Crusaders / Joestar Group / Crusaders 24; Passione 22; Team Bucciarati / Bucciarati Gang 18; Pillar Men 14; Speedwagon Foundation 8; La Squadra / Hitman Team 8",
                rezero: "Witch Cult 40; Sin Archbishops / Archbishops 18; Emilia Camp 12; Royal Guard / Knights 8; Iron Fangs / Iron Fang 6",
                fireforce: "Special Fire Force / Company 8 / 8th Company 40; White Clad 18; Holy Sol Temple / Holy Sol Church 16; Company 7 / 7th Company 10; Haijima Industries / Haijima 10",
                frieren: "Hero Party / Himmel's party 40; Continental Magic Association / Mage Association 16; Demon King's army / Demons 16; Seven Sages of Destruction / Sages of Destruction 10; Northern Magic Corps 6",
                gachiakuta: "Cleaners 42; Raiders 30; Hell Guard 12; Team Akuta 10; Sphere / Sphereites 6",
                windbreaker: "Bofurin / Furin / Wind Breaker 44; Shishitoren 26; Noroshi 12; KEEL / Keel 10; GRAVEL / Gravel 6"
            }
        },
        { id: "c-place", fam: "world", cat: "World", sub: "Places", pol: "0", diff: 2, kind: "canon", rank: "known",
            q: ["Name a place from {s}","Name a location fans of {s} would recognise"],
            a: {
                onepiece: "Grand Line 15; Wano / Wano Country 15; Marineford 14; Water 7 12; Alabasta / Arabasta 10; Skypiea 8; Enies Lobby 8; Dressrosa 8; Egghead / Egghead Island 6; Elbaph 4",
                naruto: "Hidden Leaf Village / Konoha / Leaf Village 40; Ichiraku Ramen / Ichiraku 14; Valley of the End 14; Hidden Sand / Sunagakure / Sand Village 10; Forest of Death 8; Mount Myoboku 6",
                dragonball: "Namek / Planet Namek 24; Kame House 22; Capsule Corp / Capsule Corporation 14; Hyperbolic Time Chamber / Room of Spirit and Time 14; The Lookout / Kami's Lookout 10; King Kai's planet 8",
                jjk: "Shibuya 36; Tokyo Jujutsu High / Jujutsu High 24; Shinjuku 12; Culling Game colonies / Culling Game / Colonies 10; Kyoto / Kyoto Jujutsu High 8; Sendai / Sendai colony 4",
                demonslayer: "Mugen Train / Infinity Train 30; Entertainment District / Red Light District / Yoshiwara 24; Swordsmith Village 16; Infinity Castle 14; Butterfly Mansion 8; Mount Natagumo / Natagumo 6",
                bleach: "Soul Society 34; Hueco Mundo 22; Karakura Town 20; Las Noches 10; Seireitei 8; Rukongai 6",
                aot: "Wall Maria 24; Shiganshina / Shiganshina District 20; Marley 16; Paradis / Paradis Island 14; Wall Rose 8; Wall Sina 6; Liberio 6",
                mha: "U.A. High / UA 40; Kamino 14; Tartarus 12; I-Island 10; Hosu 8; Jaku City / Jaku 6",
                hxh: "Greed Island 28; Heavens Arena / Celestial Tower 20; York New City / Yorknew 18; Whale Island 12; Kukuroo Mountain / Zoldyck estate 10; NGL 6",
                deathnote: "Shinigami Realm / Death God realm 30; Task Force headquarters / HQ 18; To-Oh University / To Oh 18; Wammy's House 14; The Yagami house / Yagami home 10",
                chainsaw: "Public Safety headquarters / Public Safety HQ 26; Hell 18; Eternity hotel / The hotel 14; Fourth East High School / Asa's school 10; Aquarium 8",
                blackclover: "Clover Kingdom 26; Black Bulls hideout / Black Bulls base 20; Hage / Hage village 16; Spade Kingdom 14; Underworld 10; Forsaken Realm 8",
                jojo: "Morioh 30; Cairo 14; Naples 14; Egypt 12; Rome 10; Green Dolphin Street Prison / Green Dolphin 8",
                rezero: "Roswaal Mansion / The mansion 30; Sanctuary 20; Lugnica / Kingdom of Lugnica 14; Priestella 10; Royal Capital / Capital 10; Pleiades Watchtower / Watchtower 8; Arlam Village 6",
                fireforce: "Asakusa 26; Tokyo Empire / Tokyo 20; Company 8 church / Cathedral 14; Nether / The Nether 12; Amaterasu power plant / Amaterasu 8",
                frieren: "Aureole / Where souls rest 18; Northern Plateau / Northern Lands 18; Demon King's castle 16; Ende 14; Golden Land / Weise 10",
                gachiakuta: "The Pit / Abyss 30; Sphere 20; Ground 16; Canvas Town 10; Cleaners headquarters / HQ 8",
                windbreaker: "Furin High 30; Makochi / Makochi Town 28; Pothos / Pottos / The cafe 20; Shishitoren tower / Shishitoren headquarters 10; Shopping street 8"
            }
        },
        { id: "c-tragic", fam: "story", cat: "Characters", sub: "Backstories", pol: "0", diff: 2, kind: "poll",
            why: "Which backstory hits hardest is opinion: every answer has a canonical tragic past, the order is our editors' poll.",
            q: ["Name a {a}character with a tragic past","Name a {a}character whose backstory made fans cry"],
            a: {
                onepiece: "@Nico Robin 22; @Portgas D. Ace 16; @Brook 14; @Tony Tony Chopper 12; @Bartholomew Kuma 12; @Trafalgar Law 10; @Nami 8; @Donquixote Rosinante 6",
                naruto: "@Itachi Uchiha 24; @Gaara 18; @Naruto Uzumaki 14; @Obito Uchiha 12; @Pain 10; @Zabuza Momochi 8; @Kakashi Hatake 8; @Haku 6",
                dragonball: "@Bardock 22; @Trunks 22; @Vegeta 14; @Broly 14; @Android 16 6",
                jjk: "@Suguru Geto 22; @Yuta Okkotsu 18; @Toji Fushiguro 14; @Choso 12; @Maki Zenin 12; @Junpei Yoshino 8",
                demonslayer: "@Akaza 24; @Tanjiro Kamado 18; @Gyutaro 14; @Rui 10; @Muichiro Tokito 10; @Obanai Iguro 8; @Kokushibo 6",
                bleach: "@Orihime Inoue 16; @Ichigo Kurosaki 16; @Gin Ichimaru 14; @Coyote Starrk 12; @Ulquiorra Cifer 10; @Byakuya Kuchiki 8",
                aot: "@Eren Yeager 22; @Reiner Braun 18; @Mikasa Ackerman 14; @Levi Ackerman 12; @Ymir Fritz 12; @Historia Reiss 10; @Grisha Yeager 8",
                mha: "@Tomura Shigaraki 26; @Dabi 20; @Eri 14; @Shoto Todoroki 14; @Himiko Toga 10; @Twice 10",
                hxh: "@Kurapika 30; @Killua Zoldyck 16; @Meruem 14; @Kite 10; @Alluka Zoldyck 8; @Pakunoda 8",
                deathnote: "@Misa Amane 26; @Rem 18; @Naomi Misora 14; @Mello 12; @Soichiro Yagami 12",
                chainsaw: "@Denji 28; @Aki Hayakawa 20; @Power 14; @Reze 10; @Himeno 10",
                blackclover: "@Asta 18; @Noelle Silva 18; @Licht 14; @Yuno 12; @Gauche Adlai 10; @Nacht Faust 10",
                jojo: "@Jonathan Joestar 18; @Bruno Bucciarati 14; @Noriaki Kakyoin 12; @Leone Abbacchio 12; @Narancia Ghirga 12; @Dio Brando 10; @Giorno Giovanna 8",
                rezero: "@Subaru Natsuki 20; @Rem 18; @Emilia 16; @Wilhelm van Astrea 12; @Beatrice 12; @Garfiel Tinsel 10",
                fireforce: "@Shinra Kusakabe 30; @Sho Kusakabe 18; @Vulcan Joseph 14; @Joker 12; @Tamaki Kotatsu 8",
                frieren: "@Frieren 20; @Fern 18; @Stark 14; @Denken 12; @Eisen 10",
                gachiakuta: "@Rudo 34; @Regto 18; @Enjin 14; @Amo Empool 12; @Zanka Nijiku 8"
            }
        },
        { id: "c-protect", fam: "friendship", cat: "Characters", sub: "Protectors", pol: "+", diff: 1, kind: "poll",
            why: "Every answer canonically risked themselves for their friends; the order is our editors' poll.",
            q: ["Name a {a}character who would do anything to protect their friends","Name a {a}character who would take a hit for their team"],
            a: {
                onepiece: "@Monkey D. Luffy 34; @Roronoa Zoro 18; @Sanji 10; @Portgas D. Ace 10; @Usopp 8; @Edward Newgate 8; @Jinbe 6",
                naruto: "@Naruto Uzumaki 30; @Kakashi Hatake 14; @Itachi Uchiha 14; @Rock Lee 10; @Hinata Hyuga 10; @Gaara 8; @Minato Namikaze 6",
                dragonball: "@Goku 24; @Gohan 22; @Piccolo 18; @Krillin 14; @Vegeta 10; @Trunks 6",
                jjk: "@Yuji Itadori 26; @Satoru Gojo 16; @Kento Nanami 14; @Megumi Fushiguro 12; @Yuta Okkotsu 12; @Aoi Todo 10",
                demonslayer: "@Tanjiro Kamado 32; @Kyojuro Rengoku 22; @Nezuko Kamado 14; @Zenitsu Agatsuma 10; @Inosuke Hashibira 8; @Giyu Tomioka 8",
                bleach: "@Ichigo Kurosaki 40; @Yasutora Sado 12; @Renji Abarai 12; @Rukia Kuchiki 10; @Orihime Inoue 10; @Uryu Ishida 8",
                aot: "@Mikasa Ackerman 26; @Levi Ackerman 18; @Eren Yeager 16; @Erwin Smith 10; @Armin Arlert 10; @Reiner Braun 8",
                mha: "@Izuku Midoriya 30; @All Might 22; @Eijiro Kirishima 14; @Katsuki Bakugo 12; @Shoto Todoroki 8; @Mirio Togata 8",
                hxh: "@Killua Zoldyck 28; @Gon Freecss 22; @Kurapika 16; @Leorio Paradinight 14; @Kite 8",
                deathnote: "@Rem 24; @Misa Amane 20; @Watari 14; @Soichiro Yagami 14; @Touta Matsuda 10",
                chainsaw: "@Denji 22; @Aki Hayakawa 22; @Pochita 18; @Power 14; @Himeno 12",
                blackclover: "@Asta 30; @Yami Sukehiro 16; @Yuno 14; @Noelle Silva 12; @Gauche Adlai 10; @Magna Swing 8",
                jojo: "@Bruno Bucciarati 20; @Jotaro Kujo 18; @Jonathan Joestar 14; @Noriaki Kakyoin 12; @Josuke Higashikata 12; @Jean Pierre Polnareff 8; @Iggy 8",
                rezero: "@Subaru Natsuki 30; @Rem 22; @Reinhard van Astrea 12; @Beatrice 10; @Garfiel Tinsel 10; @Otto Suwen 8",
                fireforce: "@Shinra Kusakabe 30; @Akitaru Obi 18; @Maki Oze 14; @Arthur Boyle 12; @Benimaru Shinmon 12",
                frieren: "@Himmel 30; @Stark 22; @Fern 16; @Eisen 14; @Frieren 10",
                gachiakuta: "@Rudo 30; @Enjin 24; @Zanka Nijiku 14; @Riyo Reaper 10; @Semiu Grier 8",
                windbreaker: "@Hajime Umemiya 28; @Haruka Sakura 24; @Hayato Suo 14; @Kyotaro Sugishita 12; @Akihiko Nirei 10; @Ren Kaji 8"
            }
        },
        { id: "c-item", fam: "world", cat: "World", sub: "Items", pol: "0", diff: 2, kind: "canon", rank: "known",
            q: ["Name a weapon or item from {s}","Name an iconic object from {s}"],
            a: {
                onepiece: "Straw Hat / Luffy's hat 28; Devil Fruit / Gum-Gum Fruit 20; Wado Ichimonji / Enma / Zoro's swords / Katana 14; The One Piece / One Piece treasure 12; Den Den Mushi / Transponder Snail 8; Thousand Sunny / Going Merry / Sunny / Merry 8; Poneglyph / Road Poneglyph 6; Vivre Card 4",
                naruto: "Headband / Forehead protector 26; Kunai 20; Icha Icha / Make-Out Paradise 14; Shuriken 12; Summoning scroll / Scroll 10; Samehada 8; Executioner's Blade / Kubikiribocho 6",
                dragonball: "Dragon Balls / Dragon Ball 42; Senzu Bean / Senzu 18; Scouter 12; Power Pole / Nyoi-bo 10; Flying Nimbus / Nimbus 8; Capsule / Hoi-Poi Capsule 6; Potara Earrings / Potara 4",
                jjk: "Sukuna's fingers / Sukuna finger / Fingers 34; Gojo's blindfold / Blindfold 16; Inverted Spear of Heaven 14; Prison Realm 14; Playful Cloud 8; Hammer and nails / Nobara's hammer 8",
                demonslayer: "Nichirin Sword / Nichirin blade 38; Nezuko's box / Bamboo box / Box 18; Hanafuda earrings / Earrings 14; Bamboo muzzle / Nezuko's bamboo 12; Haori 6; Fox mask / Mask 6",
                bleach: "Zanpakuto 40; Hogyoku 22; Substitute Soul Reaper badge / Badge 10; Soul candy / Gikongan 8; Urahara's hat / Hat and clogs 8; Quincy bow 8",
                aot: "ODM Gear / 3D Maneuver Gear / ODM 32; Thunder Spear / Thunder Spears 16; Basement key / Key 14; Mikasa's scarf / Scarf 14; Titan serum / Spinal fluid 12; Blades / Swords 8",
                mha: "Hero costume / Costume 22; Support gear / Support items 16; Bakugo's gauntlets / Grenade gauntlets 14; Aizawa's capture scarf / Capture weapon 14; Quirk-destroying bullets / Trigger 10; All Might's hair / Strand of hair 6",
                hxh: "Hunter License 30; Greed Island game / Greed Island cartridge 18; Fishing rod / Gon's fishing rod 14; Kurapika's chains / Chains 14; Scarlet Eyes 10; Yo-yos / Killua's yo-yo 10",
                deathnote: "Death Note / The notebook 46; Apples / Apple 24; Light's watch / Watch 12; Potato chips / Chips 10; Shinigami Eyes 6",
                chainsaw: "Chainsaw cord / Starter cord / Pull cord 26; Aki's katana / Katana 16; Fox mask 12; Makima's leash / Leash 8; Cigarettes / Aki's cigarettes 6",
                blackclover: "Grimoire / Five-leaf grimoire 36; Demon Slayer Sword / Anti-magic sword 18; Black Bulls robe / Robe 10; Demon Dweller Sword 10; Mirror / Gauche's mirror 8",
                jojo: "Stone Mask 30; Stand Arrow / Arrow 24; Road Roller 16; Steel Balls 10; DIO's diary / Diary 8; Saint's Corpse / Corpse parts 8",
                rezero: "Gospel / Witch Cult Gospel 24; Emilia's crystal / Puck's crystal 14; Subaru's phone / Cell phone 12; Rem's morning star / Morning star / Flail 12; Royal insignia / Dragon jewel 10",
                frieren: "Mimic / Mimic chest 22; Grimoire / Spell book 22; Staff 18; Hero's sword / Himmel's sword 18; Mirror lotus ring / Ring 14",
                gachiakuta: "Vital Instrument / Jinki 30; 3R gloves / Gloves 22; Umbreaker / Umbrella 14; Cleaner masks / Masks 12; Lovely Assistaff / Staff 8"
            }
        },
        { id: "c-mentor", fam: "mentorship", cat: "Characters", sub: "Mentors", pol: "+", diff: 1, kind: "canon", rank: "fans",
            why: "Every answer canonically trained or taught someone; ranked by AniList favourites.",
            q: ["Name a {a}mentor or teacher figure","Name a {a}character who trained someone to become stronger"],
            a: {
                onepiece: "@Dracule Mihawk 30; @Silvers Rayleigh 20; @Monkey D. Garp 15; @Koby 11; @Emporio Ivankov 8",
                naruto: "@Kakashi Hatake 30; @Jiraiya 20; @Minato Namikaze 15; @Might Guy 11; @Tsunade 8; @Orochimaru 6; @Hiruzen Sarutobi 4",
                dragonball: "@Goku 30; @Piccolo 20; @Master Roshi 15; @Whis 11; @Kami 8",
                jjk: "@Satoru Gojo 30; @Kento Nanami 20; @Aoi Todo 15; @Utahime Iori 11; @Masamichi Yaga 8",
                demonslayer: "@Shinobu Kocho 30; @Tengen Uzui 20; @Sabito 15; @Gyomei Himejima 11; @Sakonji Urokodaki 8; @Tanjuro Kamado 6; @Jigoro Kuwajima 4",
                bleach: "@Kisuke Urahara 30; @Yoruichi Shihoin 20; @Retsu Unohana 15; @Isshin Kurosaki 11; @Ryuken Ishida 8",
                aot: "@Levi Ackerman 30; @Hange Zoe 20; @Kenny Ackerman 15; @Keith Shadis 11; @Theo Magath 8",
                mha: "@Shota Aizawa 30; @All Might 20; @Endeavor 15; @Sir Nighteye 11; @All For One 8; @Fat Gum 6; @Nana Shimura 4; @Gran Torino 3",
                hxh: "@Isaac Netero 30; @Biscuit Krueger 20; @Ging Freecss 15; @Morel Mackernasey 11; @Wing 8; @Zeno Zoldyck 6",
                chainsaw: "@Aki Hayakawa 30; @Himeno 20; @Kishibe 15; @Michiko Tendo 11; @Yutaro Kurose 8",
                blackclover: "@Yami Sukehiro 30; @Mereoleona Vermillion 20; @Julius Novachrono 15; @Nacht Faust 11; @Fanzell Kruger 8",
                frieren: "@Frieren 30; @Eisen 20; @Heiter 15; @Flamme 11; @Serie 8; @Macht 6"
            }
        },
        { id: "c-strongest", fam: "power-scale", cat: "Characters", sub: "Strongest", pol: "+", diff: 1, kind: "power", beats: {"onepiece":[["Monkey D. Luffy","Kaido"]],"naruto":[["Naruto Uzumaki","Sasuke Uchiha"],["Kaguya Otsutsuki","Madara Uchiha"]],"dragonball":[["Whis","Beerus"],["Frieza","Goku"],["Frieza","Vegeta"],["Jiren","Vegeta"]],"jjk":[["Ryomen Sukuna","Satoru Gojo"]],"demonslayer":[["Yoriichi Tsugikuni","Muzan Kibutsuji"],["Doma","Akaza"]],"bleach":[["Kenpachi Zaraki","Retsu Unohana"],["Ichigo Kurosaki","Sosuke Aizen"]],"mha":[["Izuku Midoriya","Tomura Shigaraki"],["All Might","All For One"]],"hxh":[["Meruem","Isaac Netero"],["Chrollo Lucilfer","Hisoka Morow"]],"chainsaw":[["Pochita","Makima"]],"blackclover":[["Asta","Lucifero"]],"jojo":[["Jotaro Kujo","Dio Brando"],["Johnny Joestar","Funny Valentine"],["Giorno Giovanna","Diavolo"]],"rezero":[["Reinhard van Astrea","Regulus Corneas"]],"fireforce":[["Arthur Boyle","Dragon"],["Shinra Kusakabe","Leonard Burns"]]},
            why: "Overall strength by canon outcomes: who beat whom, who needed help, who outranks whom (latest canon version). Where the story never settles it, the order is the editors' call and the reason says so.",
            q: ["Name one of the strongest characters in {s}","Name a {a}character you would never want to fight"],
            a: {
                onepiece: "@Monkey D. Luffy 22; @Kaido 18; @Shanks 16; @Edward Newgate 14; @Gol D. Roger 12; @Marshall D. Teach 8; @Dracule Mihawk 6; @Charlotte Linlin 4",
                naruto: "@Naruto Uzumaki 22; @Sasuke Uchiha 20; @Kaguya Otsutsuki 16; @Madara Uchiha 14; @Hashirama Senju 10; @Obito Uchiha 8; @Might Guy 6; @Itachi Uchiha 4",
                dragonball: "@Whis 24; @Beerus 20; @Frieza 16; @Goku 12; @Jiren 10; @Vegeta 8; @Broly 6; @Gohan 4",
                jjk: "@Ryomen Sukuna 30; @Satoru Gojo 26; @Yuta Okkotsu 12; @Kenjaku 8; @Yuji Itadori 8; @Toji Fushiguro 6; @Maki Zenin 4",
                demonslayer: "@Yoriichi Tsugikuni 30; @Muzan Kibutsuji 20; @Kokushibo 16; @Gyomei Himejima 12; @Doma 8; @Akaza 6; @Tanjiro Kamado 4",
                bleach: "@Yhwach 24; @Ichigo Kurosaki 20; @Sosuke Aizen 18; @Genryusai Yamamoto 14; @Kenpachi Zaraki 10; @Ichibe Hyosube 8; @Retsu Unohana 6",
                aot: "@Eren Yeager 26; @Ymir Fritz 18; @Levi Ackerman 16; @Zeke Yeager 12; @Mikasa Ackerman 10; @Reiner Braun 6",
                mha: "@Izuku Midoriya 24; @Tomura Shigaraki 20; @All Might 18; @All For One 16; @Endeavor 8; @Star and Stripe 6; @Hawks 4",
                hxh: "@Meruem 30; @Isaac Netero 22; @Neferpitou 12; @Menthuthuyoupi 10; @Chrollo Lucilfer 10; @Hisoka Morow 8; @Zeno Zoldyck 6",
                chainsaw: "@Pochita 28; @Makima 24; @Darkness Devil 14; @Denji 12; @Quanxi 10; @Kishibe 8",
                blackclover: "@Asta 22; @Lucifero 18; @Julius Novachrono 16; @Yuno 14; @Yami Sukehiro 12; @Dante Zogratis 8; @Mereoleona Vermillion 6",
                jojo: "@Giorno Giovanna 22; @Enrico Pucci 18; @Johnny Joestar 14; @Funny Valentine 12; @Jotaro Kujo 10; @Dio Brando 9; @Kars 8; @Diavolo 6",
                rezero: "@Reinhard van Astrea 40; @Satella 22; @Reid Astrea 12; @Pandora 10; @Regulus Corneas 8; @Puck 6",
                fireforce: "@Shinra Kusakabe 24; @Sho Kusakabe 18; @Benimaru Shinmon 16; @Arthur Boyle 12; @Dragon 10; @Leonard Burns 8; @Haumea 6",
                frieren: "@Serie 26; @Himmel 20; @Frieren 18; @South Hero 14; @Macht 10; @Ubel 6",
                gachiakuta: "@Enjin 22; @Jabber Wonger 20; @Rudo 18; @Zodyl Typhon 16; @Bundus Begalkeit 10",
                windbreaker: "@Hajime Umemiya 34; @Chika Takiishi 18; @Haruka Sakura 16; @Jo Togame 12; @Yamato Endo 10; @Hayato Suo 8"
            }
        },
        { id: "c-leader-great", fam: "leadership", cat: "Leadership", sub: "Leader", pol: "+", diff: 1, opp: "c-leader-terrible", kind: "poll",
            why: "Every answer has led a team, crew or village in canon; who would be the BEST leader is our editors' poll.",
            q: ["Name a {a}character who would make a great leader","Name a {a}character you would trust to lead your team"],
            a: {
                onepiece: "@Monkey D. Luffy 26; @Shanks 22; @Edward Newgate 18; @Gol D. Roger 14; @Trafalgar Law 8; @Jinbe 6",
                naruto: "@Naruto Uzumaki 26; @Hashirama Senju 18; @Minato Namikaze 16; @Tsunade 12; @Shikamaru Nara 10; @Hiruzen Sarutobi 8",
                dragonball: "@Vegeta 24; @Piccolo 18; @Frieza 16; @Beerus 12; @Goku 10; @Whis 8",
                jjk: "@Satoru Gojo 30; @Kento Nanami 20; @Suguru Geto 16; @Yuki Tsukumo 10; @Kenjaku 8",
                demonslayer: "@Kyojuro Rengoku 24; @Kagaya Ubuyashiki 20; @Gyomei Himejima 18; @Tanjiro Kamado 16; @Tengen Uzui 14; @Giyu Tomioka 8",
                bleach: "@Genryusai Yamamoto 26; @Sosuke Aizen 20; @Byakuya Kuchiki 14; @Shunsui Kyoraku 14; @Ichigo Kurosaki 12",
                aot: "@Erwin Smith 38; @Levi Ackerman 16; @Hange Zoe 14; @Armin Arlert 12; @Dot Pixis 8",
                mha: "@All Might 30; @Izuku Midoriya 18; @Tenya Iida 16; @Shota Aizawa 12; @Endeavor 10",
                hxh: "@Isaac Netero 26; @Chrollo Lucilfer 24; @Ging Freecss 12; @Kurapika 12; @Meruem 10",
                deathnote: "@L Lawliet 30; @Light Yagami 28; @Near 16; @Soichiro Yagami 14; @Watari 6",
                chainsaw: "@Makima 30; @Kishibe 22; @Aki Hayakawa 16; @Himeno 12; @Denji 6",
                blackclover: "@Julius Novachrono 26; @Yami Sukehiro 26; @Fuegoleon Vermillion 14; @William Vangeance 10; @Asta 10",
                jojo: "@Giorno Giovanna 28; @Bruno Bucciarati 24; @Jotaro Kujo 16; @Dio Brando 10; @Jonathan Joestar 8",
                rezero: "@Crusch Karsten 22; @Subaru Natsuki 18; @Anastasia Hoshin 14; @Emilia 12; @Priscilla Barielle 10; @Reinhard van Astrea 10",
                fireforce: "@Akitaru Obi 30; @Benimaru Shinmon 22; @Leonard Burns 14; @Shinra Kusakabe 14; @Takehisa Hinawa 8",
                frieren: "@Himmel 40; @Serie 16; @Denken 12; @Eisen 10; @Frieren 8",
                windbreaker: "@Hajime Umemiya 40; @Jo Togame 14; @Ren Kaji 14; @Toma Hiragi 12; @Hayato Suo 10"
            }
        },
        { id: "c-leader-terrible", fam: "leadership", cat: "Leadership", sub: "Leader", pol: "-", diff: 1, vt: "opposite", opp: "c-leader-great", kind: "poll",
            why: "Opinion: our editors' poll of who would run a team into the ground, from canon personalities.",
            q: ["Name a {a}character who would make a terrible leader","Name a {a}character who should never be put in charge"],
            a: {
                onepiece: "@Buggy 32; @Monkey D. Luffy 16; @Usopp 14; @Enel 12; @Marshall D. Teach 10; @Brook 6",
                naruto: "@Obito Uchiha 20; @Jiraiya 16; @Tsunade 14; @Rock Lee 12; @Naruto Uzumaki 10; @Madara Uchiha 10",
                dragonball: "@Goku 30; @Yamcha 16; @Frieza 14; @Krillin 10; @Master Roshi 10",
                jjk: "@Naoya Zenin 24; @Mahito 18; @Aoi Todo 16; @Satoru Gojo 12; @Jogo 10",
                demonslayer: "@Zenitsu Agatsuma 28; @Inosuke Hashibira 24; @Muzan Kibutsuji 18; @Doma 10; @Nezuko Kamado 8",
                bleach: "@Kenpachi Zaraki 28; @Mayuri Kurotsuchi 18; @Grimmjow Jaegerjaquez 14; @Renji Abarai 10; @Gin Ichimaru 8",
                aot: "@Floch Forster 26; @Eren Yeager 20; @Connie Springer 14; @Sasha Blouse 12; @Zeke Yeager 10",
                mha: "@Katsuki Bakugo 22; @Tomura Shigaraki 18; @Denki Kaminari 16; @Endeavor 12; @Himiko Toga 10",
                hxh: "@Hisoka Morow 26; @Pariston Hill 20; @Gon Freecss 16; @Ging Freecss 12; @Leorio Paradinight 10",
                deathnote: "@Touta Matsuda 36; @Misa Amane 22; @Ryuk 14; @Teru Mikami 10; @Mello 8",
                chainsaw: "@Power 30; @Denji 28; @Kobeni Higashiyama 14; @Beam 10; @Makima 8",
                blackclover: "@Charmy Pappitson 22; @Luck Voltia 18; @Magna Swing 14; @Asta 12; @Vanica Zogratis 10",
                jojo: "@Diavolo 22; @Jean Pierre Polnareff 18; @Okuyasu Nijimura 16; @Narancia Ghirga 14; @Hol Horse 10",
                frieren: "@Frieren 26; @Ubel 18; @Stark 16; @Heiter 14; @Sein 8",
                windbreaker: "@Haruka Sakura 26; @Chika Takiishi 20; @Akihiko Nirei 16; @Kyotaro Sugishita 12; @Yamato Endo 10"
            }
        },
        { id: "c-sword", fam: "weapons", cat: "Characters", sub: "Swordsmen", pol: "0", diff: 2, kind: "canon", rank: "fans",
            why: "Characters who fight with a sword (or a blade weapon of their own) in canon; ranked by AniList favourites.",
            q: ["Name a {a}character who fights with a sword","Name a {a}swordsman or swordswoman"],
            a: {
                onepiece: "@Roronoa Zoro 30; @Shanks 20; @Brook 15; @Dracule Mihawk 11; @Kouzuki Oden 8; @Isshou 6; @Ryuuma Shimotsuki 4; @Kyros 3; @Cavendish 2; @Shiryuu 1",
                naruto: "@Sasuke Uchiha 30; @Zabuza Momochi 20; @Tenten 15; @Killer Bee 11; @Kisame Hoshigaki 8; @Suigetsu Hozuki 6",
                jjk: "@Maki Zenin 30; @Yuta Okkotsu 20; @Toji Fushiguro 15; @Atsuya Kusakabe 11; @Mahoraga 8",
                demonslayer: "@Tanjiro Kamado 29; @Inosuke Hashibira 20; @Zenitsu Agatsuma 15; @Giyu Tomioka 11; @Kyojuro Rengoku 8; @Kanao Tsuyuri 6; @Muichiro Tokito 4; @Obanai Iguro 3; @Sanemi Shinazugawa 2; @Yoriichi Tsugikuni 1; @Kokushibo 1",
                bleach: "@Ichigo Kurosaki 30; @Rukia Kuchiki 20; @Kenpachi Zaraki 15; @Toshiro Hitsugaya 11; @Byakuya Kuchiki 8; @Shunsui Kyoraku 6; @Renji Abarai 4; @Retsu Unohana 3; @Genryusai Yamamoto 2",
                aot: "@Levi Ackerman 30; @Mikasa Ackerman 20; @Hange Zoe 15; @Erwin Smith 11; @Jean Kirstein 8; @Kenny Ackerman 6; @Miche Zacharias 4",
                rezero: "@Reinhard van Astrea 30; @Crusch Karsten 20; @Julius Juukulius 15; @Wilhelm van Astrea 11; @Aldebaran 8; @Theresia van Astrea 6; @Reid Astrea 4"
            }
        },
        { id: "c-healer", fam: "powers", cat: "Characters", sub: "Healers", pol: "+", diff: 2, kind: "canon", rank: "fans",
            why: "Characters who can heal OTHER people in canon (medicine, techniques or powers); ranked by AniList favourites.",
            q: ["Name a {a}character who can heal others","Name a {a}character you would want as your medic"],
            a: {
                onepiece: "@Trafalgar Law 30; @Tony Tony Chopper 20; @Marco 15; @Vinsmoke Reiju 11; @Emporio Ivankov 8",
                naruto: "@Sakura Haruno 30; @Tsunade 20; @Kabuto Yakushi 15; @Karin 11; @Chiyo 8",
                bleach: "@Kisuke Urahara 30; @Orihime Inoue 20; @Nelliel Tu Oderschvank 15; @Retsu Unohana 11; @Tenjiro Kirinji 8",
                hxh: "@Neferpitou 30; @Biscuit Krueger 20; @Alluka Zoldyck 15; @Machi Komacine 11; @Cheadle Yorkshire 8",
                blackclover: "@Secre Swallowtail 30; @Charmy Pappitson 20; @Mimosa Vermillion 15; @William Vangeance 11; @Lolopechka 8",
                jojo: "@Gyro Zeppeli 36; @Josuke Higashikata 30; @Giorno Giovanna 24; Tonio Trussardi / Tonio 4; @Hot Pants 2"
            }
        },
        { id: "c-fastest", fam: "speed", cat: "Characters", sub: "Speed", pol: "+", diff: 2, kind: "feats", gen: {"stat":"SPD","top":8,"skip":["deathnote"]},
            why: "The series' best in Speed in the Anime Draft ratings (movement, reactions, combat speed).",
            q: ["Name one of the fastest characters in {s}","Name a {a}character with top-tier speed"]
        },
        { id: "c-physical", fam: "power-scale", cat: "Characters", sub: "Physical strength", pol: "+", diff: 2, kind: "feats", gen: {"stat":"STR","top":8,"skip":["deathnote"]},
            why: "The series' best in Strength in the Anime Draft ratings: physical force only, not destructive powers.",
            q: ["Name one of the physically strongest characters in {s}","Name a {a}character with monstrous raw strength"]
        },
        { id: "c-smartest", fam: "intelligence", cat: "Intelligence", sub: "Smartest", pol: "+", diff: 2, kind: "feats", gen: {"stat":"IQ","top":8},
            why: "The series' best in IQ in the Anime Draft ratings (intellect, strategy, knowledge; not battle instinct).",
            q: ["Name one of the smartest characters in {s}","Name a {a}genius"]
        },
        { id: "c-toughest", fam: "power-scale", cat: "Characters", sub: "Durability", pol: "+", diff: 3, kind: "feats", gen: {"stat":"DUR","top":8,"skip":["deathnote"]},
            why: "The series' best in Durability in the Anime Draft ratings (toughness and defence; regeneration does not count).",
            q: ["Name one of the hardest characters to hurt in {s}","Name a {a}character who can take an incredible beating"]
        },
        { id: "c-skilled", fam: "power-scale", cat: "Characters", sub: "Combat skill", pol: "+", diff: 3, kind: "feats", gen: {"stat":"CMB","top":8,"skip":["deathnote"]},
            why: "The series' best in Combat Skill in the Anime Draft ratings (technique, experience, weapon mastery).",
            q: ["Name one of the most skilled fighters in {s}","Name a {a}character with masterful fighting technique"]
        }
    ]
};
