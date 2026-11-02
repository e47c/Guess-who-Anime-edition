/* =====================================================================
   ANIME DRAFT: role sets, rarity, series power tiers and the rating database.

   HOW THE RATINGS WORK (read before editing a number)
   - Every draftable character is keyed by its AniList character id, so name, picture and
     the fan count come from AniList (packs.json / draft-pop.json), never from here.
   - Scores are 1..100 and measured INSIDE the character's own series: 100 is the best that
     series has shown in that category (feats on screen / in the manga), 50 an average named
     fighter of that series, 1..10 "can't do this at all" (a non-user of the power system).
     This keeps One Piece vs One Piece and Death Note vs Death Note fair and comparable.
   - A match with two or more series uses the Mixed roles. Physical power (Strength, Speed,
     Durability, and Tank / Duelist in Classic roles) and Special Ability are then multiplied by
     the series' power tier (TIERS below) so Goku and Tanjiro are not treated as equals.
     IQ, Combat Skill, Captain, Vice Captain, Healer and Support are NOT scaled: they are skill
     and character qualities, not raw power. The breakdown on the results screen shows the
     multiplier, so nothing is hidden.
   - Popularity never feeds a rating or a rarity. Rarity (RANKS: power + story importance per series) is a separate, small bonus.

   ROW FORMAT
   Standard series:  [aniListId, "Name", STR, SPD, IQ, DUR, CMB, SPC, R5, R6, CAP, VC, TANK, DUEL, HEAL, SUP]
       STR/SPD/IQ/DUR = the four shared roles, CMB = Combat Skill and SPC = Special Ability (Mixed roles),
       R5/R6 = the series' two own roles (ROLESETS[key][4..5]), then the six Classic roles.
   Death Note:       [aniListId, "Name", STR, SPD, IQ, DUR, CMB, SPC, INT, DED, MAN, PLA, DEC, PSY, CAP, VC, TANK, DUEL, HEAL, SUP]
   To add a character: find its AniList id (anilist.co/character/<id>), add a row, run
   `node tools/draft-check.mjs` (validates every row) and `node tools/draft-sync.mjs` (fetches popularity).
   ===================================================================== */

export const DRAFT_VERSION = 1;

/* ---------- role sets ---------- */
const STD = ["Strength", "Speed", "IQ", "Durability"];
export const ROLESETS = {
    onepiece:    STD.concat(["Haki", "Devil Fruit"]),
    naruto:      STD.concat(["Ninjutsu", "Genjutsu"]),
    dragonball:  STD.concat(["Ki Control", "Special Techniques"]),
    jjk:         STD.concat(["Cursed Technique", "Domain Expansion"]),
    demonslayer: STD.concat(["Breathing Style", "Blood Demon Art"]),
    bleach:      STD.concat(["Reiatsu", "Zanpakuto"]),
    aot:         STD.concat(["Combat Skill", "Titan Power"]),
    mha:         STD.concat(["Quirk", "Combat Technique"]),
    hxh:         STD.concat(["Nen Mastery", "Nen Ability"]),
    deathnote:   ["Intelligence", "Deduction", "Manipulation", "Planning", "Deception", "Psychological Warfare"],
    chainsaw:    STD.concat(["Devil Ability", "Regeneration"]),
    blackclover: STD.concat(["Magic Power", "Magic Attribute"]),
    jojo:        STD.concat(["Stand Ability", "Special Technique (Hamon / Spin)"]),
    rezero:      STD.concat(["Magic", "Divine Protection / Authority"]),
    fireforce:   STD.concat(["Ignition Ability", "Adolla Power"]),
    frieren:     STD.concat(["Mana Control", "Magic Mastery"]),
    gachiakuta:  STD.concat(["Vital Instrument", "Combat Skill"]),
    windbreaker: STD.concat(["Fighting Technique", "Endurance"]),
    mixed:       STD.concat(["Combat Skill", "Special Ability"]),
    classic:     ["Captain", "Vice Captain", "Tank", "Duelist", "Healer", "Support"]
};
export const ROLE_ICONS = {
    Strength: "💪", Speed: "⚡", IQ: "🧠", Durability: "🛡", "Combat Skill": "⚔", "Special Ability": "✦",
    Captain: "👑", "Vice Captain": "🎖", Tank: "🛡", Duelist: "⚔", Healer: "✚", Support: "✧",
    Intelligence: "🧠", Deduction: "🔍", Manipulation: "🎭", Planning: "♟", Deception: "🃏", "Psychological Warfare": "☠",
    Haki: "🌀", "Devil Fruit": "🍇", Ninjutsu: "🍥", Genjutsu: "👁", "Ki Control": "🔥", "Special Techniques": "✴", "Cursed Technique": "🩸", "Domain Expansion": "🌌",
    "Breathing Style": "🌬", "Blood Demon Art": "🩸", Reiatsu: "🌊", Zanpakuto: "🗡", "Titan Power": "⚡", Quirk: "✊", "Combat Technique": "🥋", "Nen Mastery": "🌀", "Nen Ability": "🃏",
    "Devil Ability": "😈", Regeneration: "♻", "Magic Power": "🔮", "Magic Attribute": "🍀", "Stand Ability": "👤", "Special Technique (Hamon / Spin)": "☀", Magic: "🔮",
    "Divine Protection / Authority": "👑", "Ignition Ability": "🔥", "Adolla Power": "🌑", "Mana Control": "💠", "Magic Mastery": "📖", "Vital Instrument": "🧰", "Fighting Technique": "👊", Endurance: "🧱"
};

/* ---------- rarity ----------
   Rarity is decided PER SERIES by how strong and how important a character is in their own story
   (RANKS below), not by popularity: a series' strongest figures and central protagonists / villains
   are Mythical, its top tier Legendary, then Epic, Rare, and everyone else Common.
   bonus: added to the role score of a character of that rarity (balancing value, easy to tune). */
export const RARITIES = [
    { key: "mythical",  name: "Mythical",  stars: 5, bonus: 8, color: "#ff2a3d" },
    { key: "legendary", name: "Legendary", stars: 4, bonus: 6, color: "#f0c869" },
    { key: "epic",      name: "Epic",      stars: 3, bonus: 4, color: "#b56cff" },
    { key: "rare",      name: "Rare",      stars: 2, bonus: 2, color: "#3ea6ff" },
    { key: "common",    name: "Common",    stars: 1, bonus: 0, color: "#a7a3a0" }
];
/* names exactly as in CHARS; anyone not listed is Common */
export const RANKS = {
    onepiece: {
        mythical: "Monkey D. Luffy|Gol D. Roger|Edward Newgate",
        legendary: "Shanks|Kaido|Marshall D. Teach|Dracule Mihawk|Silvers Rayleigh|Monkey D. Garp|Roronoa Zoro",
        epic: "Trafalgar Law|Sanji|Charlotte Katakuri|Donquixote Doflamingo|Kuzan|Borsalino|Marco|Boa Hancock|Sabo|Eustass Kid",
        rare: "Portgas D. Ace|Yamato|Bartholomew Kuma|Crocodile|Jinbe|Rob Lucci|Enel|Nico Robin|Smoker|Franky|Brook"
    },
    naruto: {
        mythical: "Naruto Uzumaki|Sasuke Uchiha|Madara Uchiha",
        legendary: "Hashirama Senju|Itachi Uchiha|Obito Uchiha|Minato Namikaze|Pain|Kurama",
        epic: "Kakashi Hatake|Jiraiya|Tobirama Senju|Might Guy|Shisui Uchiha|Gaara|Tsunade|Orochimaru|Killer Bee",
        rare: "Kabuto Yakushi|Hiruzen Sarutobi|Rock Lee|Sakura Haruno|Kisame Hoshigaki|Shikamaru Nara|Deidara|Sasori|Neji Hyuga|Konan"
    },
    dragonball: {
        mythical: "Goku|Beerus|Whis",
        legendary: "Vegeta|Jiren|Broly|Frieza|Gohan|Cell",
        epic: "Majin Buu|Goku Black|Zamasu|Hit|Piccolo|Android 17|Trunks",
        rare: "Caulifla|Android 18|Krillin|Bardock|Master Roshi|Goten|Tien Shinhan|Bulma"
    },
    jjk: {
        mythical: "Ryomen Sukuna|Satoru Gojo",
        legendary: "Yuta Okkotsu|Kenjaku|Toji Fushiguro|Yuji Itadori|Yuki Tsukumo",
        epic: "Maki Zenin|Suguru Geto|Mahito|Megumi Fushiguro|Kinji Hakari|Hajime Kashimo|Aoi Todo",
        rare: "Choso|Kento Nanami|Jogo|Hiromi Higuruma|Uraume|Hanami|Naoya Zenin|Mei Mei"
    },
    demonslayer: {
        mythical: "Yoriichi Tsugikuni|Muzan Kibutsuji",
        legendary: "Kokushibo|Tanjiro Kamado|Gyomei Himejima|Akaza|Doma",
        epic: "Kyojuro Rengoku|Giyu Tomioka|Sanemi Shinazugawa|Muichiro Tokito|Tengen Uzui|Nezuko Kamado|Gyutaro",
        rare: "Mitsuri Kanroji|Obanai Iguro|Shinobu Kocho|Zenitsu Agatsuma|Inosuke Hashibira|Kanao Tsuyuri|Daki|Tamayo"
    },
    bleach: {
        mythical: "Yhwach|Sosuke Aizen|Ichigo Kurosaki",
        legendary: "Genryusai Yamamoto|Ichibe Hyosube|Kisuke Urahara|Kenpachi Zaraki|Retsu Unohana",
        epic: "Shunsui Kyoraku|Byakuya Kuchiki|Jugram Haschwalth|Ulquiorra Cifer|Yoruichi Shihoin|Toshiro Hitsugaya|Isshin Kurosaki",
        rare: "Coyote Starrk|Mayuri Kurotsuchi|Grimmjow Jaegerjaquez|Gin Ichimaru|Tier Harribel|Rukia Kuchiki|Uryu Ishida|Shinji Hirako|Renji Abarai"
    },
    aot: {
        mythical: "Eren Yeager|Ymir Fritz",
        legendary: "Levi Ackerman|Zeke Yeager|Mikasa Ackerman|Erwin Smith",
        epic: "Armin Arlert|Reiner Braun|Annie Leonhart|Bertholdt Hoover|Kenny Ackerman",
        rare: "Hange Zoe|Pieck Finger|Grisha Yeager|Porco Galliard|Historia Reiss|Jean Kirstein|Ymir"
    },
    mha: {
        mythical: "Izuku Midoriya|All Might|All For One",
        legendary: "Tomura Shigaraki|Endeavor|Katsuki Bakugo|Shoto Todoroki",
        epic: "Hawks|Dabi|Mirio Togata|Kai Chisaki|Shota Aizawa",
        rare: "Stain|Mirko|Himiko Toga|Eijiro Kirishima|Gran Torino|Tamaki Amajiki|Twice|Fumikage Tokoyami|Momo Yaoyorozu|Eri"
    },
    hxh: {
        mythical: "Meruem|Isaac Netero",
        legendary: "Gon Freecss|Killua Zoldyck|Hisoka Morow|Chrollo Lucilfer|Neferpitou",
        epic: "Kurapika|Ging Freecss|Zeno Zoldyck|Silva Zoldyck|Alluka Zoldyck|Illumi Zoldyck|Menthuthuyoupi",
        rare: "Shaiapouf|Biscuit Krueger|Feitan Portor|Uvogin|Kite|Pariston Hill|Knuckle Bine|Morel Mackernasey"
    },
    deathnote: {
        mythical: "Light Yagami|L Lawliet",
        legendary: "Near|Ryuk|Mello",
        epic: "Misa Amane|Rem|Teru Mikami|Watari",
        rare: "Naomi Misora|Soichiro Yagami|Kiyomi Takada|Halle Lidner|Stephen Gevanni"
    },
    chainsaw: {
        mythical: "Pochita|Makima",
        legendary: "Denji|Reze|Kishibe",
        epic: "Power|Aki Hayakawa|Curse Devil|Samurai Sword",
        rare: "Angel Devil|Himeno|Future Devil|Fox Devil|Violence Fiend"
    },
    blackclover: {
        mythical: "Asta|Julius Novachrono",
        legendary: "Yuno|Yami Sukehiro|Licht|Liebe",
        epic: "Mereoleona Vermillion|Dante Zogratis|Vanica Zogratis|Zenon Zogratis|Nacht Faust|Noelle Silva",
        rare: "Fuegoleon Vermillion|Nozel Silva|Charlotte Roselei|William Vangeance|Dorothy Unsworth|Luck Voltia|Vanessa Enoteca"
    },
    jojo: {
        mythical: "Dio Brando|Jotaro Kujo|Giorno Giovanna",
        legendary: "Enrico Pucci|Johnny Joestar|Funny Valentine|Diavolo|Kars|Joseph Joestar",
        epic: "Josuke Higashikata|Yoshikage Kira|Jonathan Joestar|Gyro Zeppeli|Jolyne Cujoh|Bruno Bucciarati|Weather Report",
        rare: "Wamuu|Lisa Lisa|Diego Brando|Jean Pierre Polnareff|Noriaki Kakyoin|Rohan Kishibe|Caesar Zeppeli|Mohammed Avdol"
    },
    rezero: {
        mythical: "Satella|Reinhard van Astrea",
        legendary: "Subaru Natsuki|Echidna|Regulus Corneas|Emilia",
        epic: "Roswaal L Mathers|Puck|Priscilla Barielle|Beatrice|Wilhelm van Astrea",
        rare: "Rem|Julius Juukulius|Petelgeuse Romanee-Conti|Shaula|Capella Emerada Lugnica|Garfiel Tinsel|Aldebaran"
    },
    fireforce: {
        mythical: "Shinra Kusakabe|Benimaru Shinmon",
        legendary: "Sho Kusakabe|Haumea|Leonard Burns|Joker",
        epic: "Arthur Boyle|Charon|Iris|Konro Sagamiya|Nataku Son",
        rare: "Yuichiro Kurono|Inca Kasugatani|Maki Oze|Akitaru Obi|Princess Hibana|Takehisa Hinawa|Dr. Giovanni"
    },
    frieren: {
        mythical: "Serie|Frieren",
        legendary: "Himmel|Flamme|Macht|South Hero",
        epic: "Fern|Stark|Eisen|Aura|Denken|Ubel",
        rare: "Heiter|Methode|Sense|Kraft|Wirbel|Genau|Qual"
    },
    gachiakuta: {
        mythical: "Rudo",
        legendary: "Enjin|Zodyl Typhon|Jabber Wonger",
        epic: "Zanka Nijiku|Riyo Reaper|Semiu Grier",
        rare: "Fu Orostor|Tamsy Caines|Amo Empool|Regto"
    },
    windbreaker: {
        mythical: "Hajime Umemiya",
        legendary: "Haruka Sakura|Chika Takiishi|Jo Togame",
        epic: "Hayato Suo|Toma Hiragi|Yamato Endo|Choji Tomiyama",
        rare: "Ren Kaji|Kyotaro Sugishita|Tasuku Tsubakino|Mitsuki Kiryu"
    }
};

/* ---------- series power tiers (Mixed roles only) ----------
   p = physical scale (Strength, Speed, Durability, Tank, Duelist), s = Special Ability scale.
   1.00 is the top of the 18 series. A first pass based on the series' general power scaling;
   tune here, every match picks it up. */
export const TIERS = {
    dragonball:  { p: 1.00, s: 1.00 },
    bleach:      { p: .92, s: .92 },
    onepiece:    { p: .90, s: .90 },
    naruto:      { p: .90, s: .90 },
    jjk:         { p: .84, s: .86 },
    blackclover: { p: .82, s: .84 },
    rezero:      { p: .80, s: .84 },
    jojo:        { p: .78, s: .90 },
    frieren:     { p: .78, s: .82 },
    hxh:         { p: .74, s: .80 },
    mha:         { p: .74, s: .76 },
    fireforce:   { p: .74, s: .76 },
    chainsaw:    { p: .72, s: .78 },
    demonslayer: { p: .62, s: .62 },
    aot:         { p: .62, s: .66 },
    gachiakuta:  { p: .58, s: .60 },
    windbreaker: { p: .40, s: .30 },
    deathnote:   { p: .30, s: .85 }
};

/* ---------- the database ---------- */
export const CHARS = {
onepiece: [
    // id, name,                   STR SPD IQ DUR CMB SPC | Haki DF | CAP VC TANK DUEL HEAL SUP
    [40, "Monkey D. Luffy",          95, 92, 50, 96, 93, 97,  95, 99,  99, 72, 92, 95, 15, 70],
    [62, "Roronoa Zoro",             93, 88, 45, 94, 97, 85,  93,  5,  70, 98, 85, 98,  5, 55],
    [305, "Sanji",                   86, 94, 70, 85, 92, 80,  86,  5,  60, 88, 70, 90, 25, 75],
    [61, "Nico Robin",               55, 60, 92, 55, 70, 82,  50, 84,  55, 70, 40, 60, 30, 88],
    [13767, "Trafalgar Law",         80, 85, 90, 75, 88, 95,  82, 96,  88, 70, 60, 88, 85, 80],
    [723, "Nami",                    30, 55, 85, 35, 50, 65,  20,  5,  45, 55, 20, 35, 20, 85],
    [2072, "Portgas D. Ace",         82, 85, 65, 75, 85, 88,  75, 88,  85, 75, 65, 85,  5, 60],
    [309, "Tony Tony Chopper",       60, 55, 75, 70, 60, 72,  25, 75,  30, 50, 70, 50, 98, 82],
    [724, "Usopp",                   35, 55, 75, 40, 60, 60,  60,  5,  35, 50, 25, 40, 30, 85],
    [727, "Shanks",                  97, 92, 85, 92, 98, 90, 100,  5,  98, 80, 88, 98, 10, 75],
    [5627, "Brook",                  65, 85, 60, 70, 82, 78,  55, 80,  40, 65, 55, 80, 20, 70],
    [16342, "Boa Hancock",           82, 85, 70, 75, 85, 90,  88, 90,  85, 65, 60, 85,  5, 55],
    [2754, "Donquixote Doflamingo",  85, 82, 92, 80, 88, 92,  85, 94,  90, 70, 60, 88, 15, 65],
    [2751, "Edward Newgate",        100, 75, 75, 95, 92, 98,  95, 99,  97, 75, 95, 92,  5, 70],
    [64, "Franky",                   75, 55, 75, 88, 65, 75,  20,  5,  50, 65, 90, 60, 30, 85],
    [18938, "Jinbe",                 85, 72, 78, 88, 88, 70,  75,  5,  85, 92, 90, 80, 20, 82],
    [124077, "Charlotte Katakuri",    88, 88, 80, 88, 92, 90,  92, 92,  80, 88, 85, 92,  5, 60],
    [32893, "Sabo",                  84, 84, 78, 82, 88, 88,  85, 88,  82, 92, 70, 86,  5, 65],
    [2064, "Dracule Mihawk",         92, 90, 80, 88,100, 70,  92,  5,  70, 75, 80,100,  5, 30],
    [176840, "Yamato",               87, 84, 60, 86, 88, 86,  88, 85,  75, 85, 85, 86, 10, 60],
    [2749, "Crocodile",              78, 72, 85, 75, 80, 84,  65, 85,  80, 70, 65, 78,  5, 55],
    [2752, "Kuzan",                  88, 80, 78, 85, 86, 92,  82, 93,  75, 70, 80, 85, 10, 55],
    [7453, "Bartholomew Kuma",       88, 90, 72, 90, 80, 92,  72, 95,  70, 72, 92, 80, 40, 75],
    [17142, "Silvers Rayleigh",      92, 88, 88, 85, 95, 75,  97,  5,  88, 95, 80, 95, 10, 75],
    [8064, "Monkey D. Garp",         96, 80, 55, 92, 92, 70,  95,  5,  88, 85, 90, 92,  5, 60],
    [2753, "Smoker",                 72, 70, 70, 75, 74, 78,  65, 80,  72, 70, 70, 70,  5, 55],
    [4883, "Gol D. Roger",           99, 90, 82, 92, 97, 85, 100,  5, 100, 80, 88, 98,  5, 75],
    [3331, "Marshall D. Teach",      92, 70, 85, 92, 82, 99,  82, 99,  88, 60, 90, 85,  5, 50],
    [14989, "Eustass Kid",           87, 75, 55, 86, 84, 88,  88, 88,  80, 70, 82, 84,  5, 50],
    [1541, "Enel",                   70, 92, 65, 70, 72, 90,  70, 90,  70, 55, 55, 75,  5, 45],
    [21093, "Borsalino",             88, 99, 75, 85, 84, 92,  84, 93,  72, 75, 75, 85,  5, 50],
    [46109, "Kaido",                 99, 78, 65,100, 92, 95,  96, 95,  92, 70,100, 94,  5, 50],
    [5677, "Rob Lucci",              80, 82, 70, 80, 85, 78,  72, 78,  70, 75, 70, 84,  5, 40],
    [9323, "Marco",                  85, 88, 75, 90, 86, 88,  85, 90,  82, 95, 88, 85, 95, 75],
    [725, "Buggy",                   30, 40, 55, 60, 40, 60,  40, 70,  60, 30, 60, 35,  5, 55]
],
naruto: [
    // id, name,                   STR SPD IQ DUR CMB SPC | Nin Gen | CAP VC TANK DUEL HEAL SUP
    [14, "Itachi Uchiha",            70, 85, 95, 60, 92, 90,  92,100,  80, 85, 60, 92, 20, 75],
    [85, "Kakashi Hatake",           70, 82, 92, 70, 90, 82,  92, 75,  88, 92, 70, 88, 20, 85],
    [17, "Naruto Uzumaki",           95, 92, 60, 95, 88, 98,  95, 30,  98, 80, 95, 92, 70, 90],
    [13, "Sasuke Uchiha",            92, 92, 85, 85, 92, 96,  95, 92,  75, 88, 75, 96, 10, 55],
    [2007, "Shikamaru Nara",         35, 55,100, 45, 60, 60,  70, 20,  92, 90, 30, 40, 10, 92],
    [1662, "Gaara",                  70, 65, 75, 92, 75, 88,  85, 15,  90, 75, 98, 75, 15, 80],
    [2423, "Jiraiya",                82, 80, 85, 80, 88, 85,  90, 80,  85, 85, 75, 85, 15, 80],
    [2535, "Minato Namikaze",        75,100, 90, 70, 92, 88,  92, 50,  92, 85, 60, 90, 10, 85],
    [1555, "Hinata Hyuga",           45, 70, 70, 50, 75, 65,  60, 10,  45, 65, 45, 65, 30, 70],
    [3180, "Pain",                   88, 80, 90, 88, 88, 95,  96, 40,  92, 70, 85, 90, 60, 60],
    [306, "Rock Lee",                82, 90, 50, 78, 92, 70,   5,  1,  50, 70, 70, 85,  5, 55],
    [53901, "Madara Uchiha",         98, 92, 90, 95, 97, 99,  98, 96,  92, 75, 95, 98, 30, 55],
    [3149, "Obito Uchiha",           85, 85, 85, 92, 85, 95,  92, 90,  82, 75, 92, 85, 10, 55],
    [145, "Sakura Haruno",           88, 70, 80, 80, 75, 75,  75, 60,  55, 75, 75, 70, 98, 85],
    [307, "Might Guy",               90, 95, 60, 82, 95, 80,   5,  1,  70, 75, 80, 95,  5, 65],
    [2767, "Tsunade",                92, 72, 82, 92, 82, 82,  82, 30,  90, 80, 90, 80,100, 80],
    [1694, "Neji Hyuga",             60, 80, 78, 60, 85, 70,  75, 10,  50, 75, 55, 82, 10, 65],
    [2455, "Orochimaru",             72, 78, 95, 85, 80, 92,  92, 75,  85, 70, 75, 80, 50, 60],
    [728, "Zabuza Momochi",          70, 75, 60, 72, 82, 60,  65, 20,  60, 70, 65, 80,  5, 40],
    [1902, "Deidara",                55, 60, 70, 55, 70, 85,  85, 10,  50, 55, 45, 70,  5, 45],
    [1900, "Sasori",                 55, 65, 82, 65, 75, 82,  75, 10,  55, 60, 60, 72,  5, 55],
    [7407, "Kurama",                 98, 82, 85, 98, 80, 92,  90, 50,  75, 80,100, 88, 40, 80],
    [3179, "Konan",                  55, 70, 75, 60, 72, 80,  82, 20,  60, 82, 55, 70, 10, 70],
    [12464, "Hashirama Senju",       97, 88, 85, 95, 92, 97,  96, 30,  98, 82, 95, 95, 90, 80],
    [12465, "Tobirama Senju",        75, 95, 92, 75, 88, 88,  92, 30,  88, 92, 70, 85, 10, 75],
    [2672, "Kisame Hoshigaki",       85, 70, 70, 90, 82, 82,  85, 10,  55, 70, 92, 80, 30, 55],
    [18473, "Killer Bee",            92, 82, 65, 90, 90, 88,  85, 15,  70, 80, 90, 90, 15, 70],
    [2405, "Kabuto Yakushi",         60, 72, 92, 75, 75, 85,  88, 70,  70, 82, 70, 70, 90, 80],
    [7571, "Hiruzen Sarutobi",       72, 70, 90, 70, 85, 82,  95, 50,  92, 80, 65, 82, 10, 80],
    [22893, "Shisui Uchiha",         70, 90, 85, 65, 88, 92,  88, 98,  70, 85, 55, 85, 10, 80]
],
dragonball: [
    // id, name,                   STR SPD IQ DUR CMB SPC | Ki Tech | CAP VC TANK DUEL HEAL SUP
    [246, "Goku",                    98, 97, 60, 95, 96, 95,  98, 95,  90, 85, 92, 98, 20, 80],
    [913, "Vegeta",                  96, 95, 75, 93, 94, 92,  92, 90,  80, 92, 90, 96,  5, 60],
    [2707, "Trunks",                 85, 88, 75, 82, 88, 82,  85, 82,  70, 85, 75, 86,  5, 65],
    [2093, "Gohan",                  92, 88, 85, 88, 82, 88,  90, 80,  70, 85, 85, 85, 10, 75],
    [914, "Piccolo",                 78, 80, 88, 85, 88, 85,  85, 88,  80, 92, 82, 82, 40, 90],
    [678, "Bulma",                    3,  5,100,  5,  2, 70,   1, 70,  60, 70,  5,  2, 50, 95],
    [3694, "Frieza",                 90, 92, 85, 90, 88, 88,  88, 88,  92, 70, 88, 90,  5, 50],
    [4945, "Broly",                  99, 88, 30, 98, 85, 85,  92, 80,  40, 60, 98, 96,  5, 30],
    [4318, "Android 18",             75, 80, 70, 78, 82, 70,  70, 72,  55, 75, 75, 80,  5, 60],
    [76348, "Beerus",                99, 98, 75, 98, 96, 99,  98, 99,  85, 80, 95, 98,  5, 50],
    [3908, "Cell",                   88, 88, 85, 92, 88, 92,  88, 92,  80, 70, 92, 88, 30, 50],
    [126199, "Goku Black",           92, 92, 82, 88, 90, 90,  90, 92,  78, 80, 82, 92,  5, 50],
    [2159, "Krillin",                55, 70, 75, 55, 80, 82,  75, 82,  60, 85, 50, 70, 15, 85],
    [6167, "Master Roshi",           50, 60, 82, 55, 85, 80,  82, 80,  75, 80, 50, 70, 30, 80],
    [6122, "Bardock",                65, 70, 60, 65, 78, 70,  70, 65,  75, 70, 60, 75,  5, 55],
    [2147, "Android 17",             88, 85, 75, 85, 85, 82,  85, 85,  65, 75, 90, 85,  5, 75],
    [1012, "Majin Buu",              85, 80, 30, 98, 70, 92,  82, 90,  35, 50, 98, 75, 90, 50],
    [76346, "Whis",                  99,100, 95, 99, 98,100, 100,100,  80, 95, 95, 95, 70, 95],
    [2551, "Goten",                  60, 65, 40, 55, 60, 70,  65, 70,  25, 45, 50, 55,  5, 55],
    [5499, "Tien Shinhan",           58, 62, 70, 58, 80, 80,  75, 85,  55, 75, 55, 70,  5, 70],
    [4014, "Yamcha",                 40, 50, 50, 42, 65, 55,  50, 55,  35, 45, 35, 50,  5, 50],
    [126883, "Hit",                  90, 95, 82, 85, 96, 98,  90, 99,  60, 70, 70, 98,  5, 40],
    [126257, "Jiren",                99, 96, 72, 99, 95, 92,  98, 88,  75, 80, 98, 97,  5, 45],
    [126882, "Zamasu",               82, 80, 85, 99, 80, 92,  82, 90,  70, 70, 98, 80, 20, 50],
    [2111, "Videl",                  30, 40, 60, 32, 55, 30,  40, 30,  40, 45, 30, 40,  5, 55],
    [126822, "Caulifla",             80, 82, 45, 78, 78, 80,  82, 78,  65, 70, 70, 80,  5, 45],
    [6273, "Dende",                   5, 15, 70, 10,  5, 75,  50, 75,  30, 50, 10,  5,100, 85],
    [6155, "Raditz",                 48, 55, 50, 50, 60, 45,  50, 40,  40, 45, 45, 55,  5, 30]
],
jjk: [
    // id, name,                   STR SPD IQ DUR CMB SPC | CT Dom | CAP VC TANK DUEL HEAL SUP
    [127691, "Satoru Gojo",          90, 98, 92, 99, 95,100, 100,100,  85, 80, 99, 98, 30, 80],
    [127212, "Yuji Itadori",         90, 90, 55, 88, 90, 80,  80, 40,  70, 85, 85, 88, 10, 75],
    [126635, "Megumi Fushiguro",     55, 70, 85, 55, 75, 85,  88, 75,  70, 85, 55, 72,  5, 82],
    [133704, "Kento Nanami",         75, 75, 85, 75, 85, 75,  78,  5,  82, 90, 75, 82,  5, 75],
    [133700, "Nobara Kugisaki",      50, 60, 70, 55, 70, 75,  78,  5,  50, 65, 50, 65,  5, 70],
    [134167, "Maki Zenin",           90, 92, 70, 85, 95, 70,   1,  1,  60, 80, 80, 94,  5, 55],
    [133701, "Ryomen Sukuna",        98, 95, 90, 95, 98, 99,  99, 99,  85, 70, 95, 99, 30, 40],
    [129571, "Yuta Okkotsu",         85, 88, 70, 88, 90, 95,  95, 92,  75, 92, 88, 90, 85, 80],
    [157115, "Toge Inumaki",         35, 55, 65, 40, 55, 85,  85,  5,  45, 65, 35, 50,  5, 85],
    [133699, "Suguru Geto",          70, 75, 90, 70, 82, 92,  92, 85,  90, 75, 70, 80, 10, 70],
    [162722, "Toji Fushiguro",       95, 96, 82, 88, 98, 70,   1,  1,  55, 60, 85, 98,  5, 40],
    [137975, "Aoi Todo",             85, 80, 88, 85, 92, 80,  82,  5,  75, 85, 80, 88,  5, 85],
    [157116, "Choso",                75, 75, 70, 80, 82, 85,  85, 10,  60, 82, 78, 80, 30, 80],
    [133702, "Mahito",               65, 75, 85, 90, 78, 95,  95, 92,  70, 60, 85, 80, 20, 40],
    [197584, "Kinji Hakari",         82, 80, 65, 95, 85, 88,  85, 90,  60, 75, 95, 85, 30, 60],
    [157215, "Mei Mei",              60, 65, 80, 55, 75, 75,  78,  5,  65, 70, 50, 72,  5, 70],
    [196502, "Yuki Tsukumo",         92, 80, 80, 85, 85, 95,  92, 30,  85, 80, 85, 88,  5, 70],
    [289584, "Kenjaku",              70, 72, 98, 80, 82, 96,  96, 92,  92, 70, 75, 80, 20, 70],
    [248818, "Hiromi Higuruma",      55, 60, 90, 55, 65, 88,  85, 95,  70, 75, 50, 60,  5, 70],
    [158154, "Shoko Ieiri",           5, 20, 85, 15,  5, 70,  70,  5,  45, 65, 10,  5,100, 80],
    [248143, "Hajime Kashimo",       82, 90, 65, 75, 88, 90,  90, 80,  50, 60, 70, 92,  5, 40],
    [208204, "Naoya Zenin",          70, 95, 70, 65, 82, 85,  85, 70,  55, 65, 50, 82,  5, 40],
    [137974, "Panda",                75, 65, 60, 85, 72, 70,  70,  5,  50, 70, 88, 70,  5, 70],
    [156991, "Jogo",                 82, 78, 50, 80, 72, 90,  90, 92,  55, 55, 75, 78,  5, 40],
    [172743, "Hanami",               78, 65, 60, 92, 70, 85,  85, 85,  50, 60, 95, 70, 30, 50],
    [210830, "Uraume",               70, 72, 80, 75, 78, 88,  88, 30,  50, 92, 70, 75,  5, 65],
    [157866, "Noritoshi Kamo",       50, 65, 72, 55, 72, 72,  75,  5,  60, 70, 45, 65, 30, 60],
    [156848, "Kasumi Miwa",          30, 45, 45, 35, 45, 30,  30,  5,  30, 40, 25, 35,  5, 55],
    [157865, "Takuma Ino",           45, 55, 60, 50, 62, 70,  70, 30,  40, 60, 45, 55,  5, 60]
],
demonslayer: [
    // id, name,                   STR SPD IQ DUR CMB SPC | Brth BDA | CAP VC TANK DUEL HEAL SUP
    [126071, "Tanjiro Kamado",       78, 80, 70, 80, 85, 85,  92,  1,  85, 80, 75, 85, 10, 80],
    [127518, "Nezuko Kamado",        82, 78, 40, 92, 70, 85,   1, 85,  30, 60, 90, 72, 70, 65],
    [129130, "Inosuke Hashibira",    78, 85, 30, 82, 82, 70,  82,  1,  30, 60, 80, 82,  5, 55],
    [129131, "Zenitsu Agatsuma",     60, 98, 45, 55, 85, 88,  92,  1,  30, 60, 40, 88,  5, 55],
    [130050, "Giyu Tomioka",         85, 85, 70, 82, 92, 85,  92,  1,  70, 85, 80, 90,  5, 60],
    [129133, "Kyojuro Rengoku",      88, 85, 72, 85, 92, 82,  92,  1,  90, 88, 85, 90,  5, 85],
    [136070, "Shinobu Kocho",        30, 92, 88, 40, 80, 80,  85,  1,  70, 80, 25, 75, 90, 80],
    [136071, "Tengen Uzui",          88, 85, 82, 82, 88, 82,  88,  1,  85, 82, 80, 86, 10, 75],
    [136072, "Mitsuri Kanroji",      88, 85, 55, 80, 85, 80,  88,  1,  60, 80, 70, 84,  5, 75],
    [139038, "Kanao Tsuyuri",        70, 85, 65, 65, 85, 82,  88,  1,  50, 70, 55, 82, 10, 65],
    [136069, "Muichiro Tokito",      82, 90, 78, 75, 92, 85,  92,  1,  60, 80, 60, 90,  5, 55],
    [141694, "Akaza",                90, 92, 70, 95, 95, 85,   1, 88,  70, 80, 92, 95,  5, 30],
    [137777, "Obanai Iguro",         75, 88, 70, 70, 90, 78,  88,  1,  55, 82, 60, 87,  5, 60],
    [137774, "Sanemi Shinazugawa",   85, 88, 60, 85, 90, 80,  90,  1,  60, 80, 82, 90,  5, 55],
    [129132, "Muzan Kibutsuji",      98, 95, 85,100, 88, 98,   1,100,  92, 70,100, 92, 30, 40],
    [137778, "Gyomei Himejima",      98, 85, 75, 92, 94, 80,  95,  1,  92, 88, 95, 94,  5, 80],
    [149220, "Yoriichi Tsugikuni",  100,100, 80, 85,100,100, 100,  1,  75, 85, 85,100,  5, 60],
    [144591, "Doma",                 85, 85, 88, 95, 85, 92,   1, 95,  70, 70, 90, 85, 10, 40],
    [141918, "Kokushibo",            96, 94, 78, 95, 98, 95,  96, 95,  80, 85, 90, 98,  5, 30],
    [138847, "Tamayo",               15, 30, 92, 60, 15, 82,   1, 85,  50, 75, 30, 15, 95, 90],
    [139734, "Daki",                 70, 82, 40, 82, 75, 80,   1, 80,  40, 60, 70, 75,  5, 30],
    [139735, "Gyutaro",              82, 85, 60, 90, 85, 85,   1, 88,  55, 75, 85, 85,  5, 55],
    [137809, "Sabito",               65, 75, 65, 60, 82, 70,  82,  1,  60, 80, 55, 78,  5, 65],
    [139739, "Rui",                  65, 65, 55, 80, 68, 82,   1, 85,  60, 55, 75, 70,  5, 35],
    [139737, "Enmu",                 30, 40, 75, 70, 35, 82,   1, 85,  50, 55, 60, 35,  5, 40],
    [137773, "Sakonji Urokodaki",    60, 70, 82, 60, 80, 65,  82,  1,  65, 80, 55, 75, 20, 85],
    [137776, "Genya Shinazugawa",    75, 70, 50, 82, 75, 80,  50, 80,  40, 65, 80, 75,  5, 55]
],
bleach: [
    // id, name,                   STR SPD IQ DUR CMB SPC | Reia Zan | CAP VC TANK DUEL HEAL SUP
    [5, "Ichigo Kurosaki",           95, 92, 55, 92, 92, 95,  97, 97,  80, 85, 90, 95, 10, 75],
    [210, "Kisuke Urahara",          75, 85,100, 75, 88, 90,  90, 92,  85, 92, 70, 85, 50, 95],
    [6, "Rukia Kuchiki",             60, 70, 70, 60, 75, 82,  75, 85,  60, 82, 55, 72, 25, 80],
    [908, "Yoruichi Shihoin",        82, 98, 85, 75, 92, 80,  88, 30,  80, 90, 65, 90, 10, 80],
    [1086, "Sosuke Aizen",           92, 92,100, 98, 95, 99, 100,100,  95, 75, 95, 95, 20, 55],
    [909, "Kenpachi Zaraki",         98, 85, 30, 95, 95, 85,  97, 92,  70, 75, 95, 98,  5, 40],
    [1081, "Ulquiorra Cifer",        85, 90, 85, 90, 88, 90,  90, 92,  60, 90, 85, 90, 20, 50],
    [1080, "Grimmjow Jaegerjaquez",  85, 90, 50, 82, 88, 85,  85, 85,  60, 70, 80, 88,  5, 35],
    [7, "Orihime Inoue",              5, 25, 60, 30, 10, 88,  70,  5,  30, 60, 70, 10,100, 90],
    [245, "Toshiro Hitsugaya",       75, 82, 85, 72, 85, 90,  85, 92,  85, 88, 65, 85,  5, 70],
    [907, "Byakuya Kuchiki",         82, 92, 85, 80, 92, 92,  88, 94,  88, 85, 75, 92,  5, 60],
    [1088, "Shunsui Kyoraku",        85, 85, 92, 82, 92, 95,  92, 97,  90, 85, 75, 92,  5, 70],
    [1084, "Shinji Hirako",          75, 85, 85, 72, 85, 88,  82, 90,  85, 85, 60, 85,  5, 70],
    [1087, "Gin Ichimaru",           72, 90, 88, 70, 88, 88,  82, 92,  70, 90, 55, 88,  5, 50],
    [906, "Renji Abarai",            82, 75, 55, 85, 80, 82,  80, 85,  65, 85, 82, 80,  5, 65],
    [564, "Uryu Ishida",             55, 80, 85, 55, 82, 85,  82,  5,  60, 75, 45, 78, 20, 70],
    [905, "Soi Fon",                 65, 95, 72, 60, 90, 85,  78, 88,  75, 85, 50, 88,  5, 55],
    [3845, "Retsu Unohana",          90, 88, 88, 88, 98, 92,  92, 95,  85, 82, 80, 98,100, 85],
    [1168, "Mayuri Kurotsuchi",      60, 70, 98, 85, 70, 92,  82, 90,  75, 75, 75, 70, 70, 85],
    [5726, "Genryusai Yamamoto",     98, 85, 90, 95, 97,100,  99,100, 100, 80, 92, 97,  5, 75],
    [3212, "Coyote Starrk",          82, 88, 75, 80, 85, 90,  88, 92,  75, 80, 75, 85,  5, 55],
    [3217, "Tier Harribel",          80, 82, 75, 80, 82, 85,  85, 88,  80, 80, 75, 82,  5, 55],
    [68537, "Yhwach",                98, 92, 95, 98, 92,100, 100, 30,  98, 70, 98, 95, 30, 55],
    [2682, "Jushiro Ukitake",        70, 75, 85, 50, 85, 85,  82, 88,  82, 88, 45, 80, 30, 80],
    [2553, "Isshin Kurosaki",        85, 82, 80, 82, 88, 88,  88, 90,  82, 82, 80, 85, 20, 75],
    [575, "Yasutora Sado",           78, 60, 55, 88, 72, 70,  70,  5,  55, 70, 92, 70,  5, 65],
    [71949, "Jugram Haschwalth",     85, 85, 85, 85, 92, 92,  90, 20,  80, 98, 85, 90, 20, 60],
    [4298, "Sajin Komamura",         88, 60, 65, 88, 75, 85,  78, 88,  70, 80, 92, 75,  5, 55],
    [74359, "Ichibe Hyosube",        88, 85, 95, 88, 92, 98,  97, 98,  92, 85, 85, 92, 30, 80]
],
aot: [
    // id, name,                   STR SPD IQ DUR CMB SPC | Cmb Titan | CAP VC TANK DUEL HEAL SUP
    [45627, "Levi Ackerman",         70, 95, 85, 70,100, 50, 100,  1,  85, 90, 55,100, 20, 70],
    [40882, "Eren Yeager",           90, 70, 70, 92, 75, 99,  75, 99,  85, 70, 90, 80,  5, 50],
    [40881, "Mikasa Ackerman",       72, 92, 70, 70, 97, 50,  97,  1,  60, 85, 60, 95, 10, 70],
    [46494, "Armin Arlert",          82, 40, 98, 70, 45, 92,  45, 92,  85, 88, 70, 45,  5, 90],
    [71121, "Hange Zoe",             45, 70, 95, 50, 72, 40,  72,  1,  85, 90, 40, 65, 40, 92],
    [46496, "Erwin Smith",           50, 65, 98, 55, 75, 30,  75,  1, 100, 85, 45, 70, 10, 90],
    [125659, "Gabi Braun",           30, 55, 60, 35, 70, 20,  70,  1,  30, 50, 30, 60,  5, 50],
    [45887, "Sasha Blouse",          40, 70, 50, 40, 72, 30,  72,  1,  30, 55, 35, 65, 10, 65],
    [46484, "Reiner Braun",          92, 60, 65, 95, 75, 92,  75, 92,  75, 80, 98, 75,  5, 65],
    [46498, "Jean Kirstein",         40, 70, 75, 45, 80, 30,  80,  1,  85, 88, 45, 72, 10, 75],
    [46490, "Annie Leonhart",        80, 75, 70, 80, 88, 85,  88, 85,  45, 70, 85, 85,  5, 40],
    [62481, "Historia Reiss",        20, 45, 60, 25, 40, 30,  40,  1,  80, 60, 25, 30, 30, 70],
    [125661, "Zeke Yeager",          88, 50, 92, 80, 70, 95,  70, 95,  85, 70, 75, 75,  5, 65],
    [125603, "Pieck Finger",         60, 75, 85, 72, 55, 80,  55, 80,  50, 75, 70, 50,  5, 92],
    [71479, "Ymir",                  65, 85, 55, 60, 65, 75,  65, 75,  40, 60, 55, 65,  5, 65],
    [46486, "Connie Springer",       35, 65, 40, 38, 68, 20,  68,  1,  30, 55, 35, 62,  5, 60],
    [125660, "Falco Grice",          60, 80, 55, 55, 50, 75,  50, 75,  35, 50, 50, 50,  5, 60],
    [46488, "Bertholdt Hoover",      98, 30, 60, 88, 65, 95,  65, 95,  45, 60, 90, 65,  5, 50],
    [127443, "Kenny Ackerman",       55, 85, 75, 55, 92, 30,  92,  1,  70, 70, 50, 90,  5, 40],
    [62485, "Dot Pixis",             25, 30, 92, 30, 55, 20,  55,  1,  90, 80, 25, 45,  5, 85],
    [125662, "Porco Galliard",       72, 85, 50, 65, 70, 75,  70, 75,  45, 60, 60, 75,  5, 45],
    [62477, "Grisha Yeager",         80, 50, 85, 80, 50, 85,  50, 85,  70, 65, 70, 50, 80, 70],
    [199551, "Ymir Fritz",           92, 50, 50, 95, 30,100,  30,100,  50, 60, 92, 50, 60, 80],
    [133216, "Yelena",               40, 60, 82, 40, 72, 20,  72,  1,  70, 85, 35, 65,  5, 70],
    [71119, "Miche Zacharias",       55, 70, 70, 60, 85, 20,  85,  1,  70, 85, 50, 82,  5, 65],
    [127703, "Floch Forster",        35, 60, 72, 40, 68, 20,  68,  1,  70, 60, 40, 62,  5, 55]
],
mha: [
    // id, name,                   STR SPD IQ DUR CMB SPC | Quirk Tech | CAP VC TANK DUEL HEAL SUP
    [89220, "Shoto Todoroki",        78, 80, 80, 75, 82, 90,  92, 82,  75, 88, 75, 85,  5, 75],
    [88892, "Katsuki Bakugo",        82, 90, 85, 78, 92, 88,  90, 92,  80, 85, 70, 92,  5, 55],
    [89028, "Izuku Midoriya",        92, 92, 88, 85, 88, 95,  95, 88,  85, 85, 80, 90,  5, 80],
    [89225, "Shota Aizawa",          50, 75, 85, 55, 88, 82,  82, 88,  75, 88, 50, 82,  5, 85],
    [89224, "All Might",             99, 95, 80, 92, 92, 98,  98, 92,  98, 80, 92, 96,  5, 90],
    [89243, "Eijiro Kirishima",      75, 65, 50, 95, 75, 75,  78, 75,  60, 80, 98, 72,  5, 70],
    [125619, "Himiko Toga",          40, 75, 70, 45, 75, 82,  85, 75,  40, 55, 35, 72,  5, 55],
    [89221, "Ochaco Uraraka",        35, 60, 70, 45, 72, 80,  80, 72,  55, 70, 50, 65,  5, 80],
    [126378, "Dabi",                 70, 72, 75, 65, 72, 92,  95, 72,  70, 70, 55, 78,  5, 40],
    [89226, "Tomura Shigaraki",      90, 88, 85, 92, 82, 99,  99, 82,  88, 70, 92, 88, 30, 50],
    [89249, "Denki Kaminari",        30, 55, 45, 40, 55, 78,  80, 55,  35, 50, 40, 60,  5, 65],
    [89223, "Tsuyu Asui",            45, 75, 75, 50, 72, 65,  70, 72,  55, 75, 45, 65,  5, 75],
    [128299, "Hawks",                65, 98, 90, 60, 88, 88,  90, 88,  80, 92, 45, 85,  5, 85],
    [123527, "Mirio Togata",         80, 85, 75, 82, 92, 88,  88, 92,  75, 85, 85, 88,  5, 75],
    [89897, "Kyoka Jiro",            30, 55, 65, 35, 60, 70,  70, 60,  45, 65, 30, 55,  5, 80],
    [125934, "Tamaki Amajiki",       75, 70, 55, 75, 80, 85,  85, 80,  40, 70, 70, 78,  5, 60],
    [89898, "Fumikage Tokoyami",     60, 75, 70, 55, 72, 85,  85, 72,  55, 75, 60, 72,  5, 65],
    [89241, "Momo Yaoyorozu",        30, 50, 92, 40, 65, 90,  90, 65,  85, 88, 50, 55, 30, 95],
    [89242, "Hitoshi Shinso",        35, 60, 80, 40, 70, 80,  82, 70,  55, 70, 35, 60,  5, 75],
    [126158, "Endeavor",             92, 88, 80, 88, 90, 92,  92, 90,  90, 85, 82, 90,  5, 65],
    [89222, "Tenya Iida",            60, 92, 75, 60, 75, 72,  75, 75,  80, 82, 55, 70,  5, 75],
    [126357, "Kai Chisaki",          70, 75, 88, 70, 82, 92,  95, 82,  82, 65, 60, 82, 90, 50],
    [126067, "Stain",                60, 85, 70, 60, 92, 75,  75, 92,  60, 65, 50, 90,  5, 30],
    [125956, "All For One",          95, 85, 95, 92, 88, 99,  99, 88,  95, 70, 90, 90, 40, 60],
    [126093, "Eri",                   5, 15, 30, 15,  5, 92,  95,  5,  10, 20, 10,  5, 90, 50],
    [148985, "Mirko",                82, 92, 50, 78, 88, 65,  70, 88,  60, 75, 70, 88,  5, 50],
    [127428, "Gran Torino",          60, 92, 82, 55, 90, 72,  75, 90,  70, 85, 45, 85,  5, 80],
    [137506, "Kurogiri",             40, 75, 70, 65, 55, 88,  92, 55,  50, 88, 50, 50,  5, 92],
    [89589, "Twice",                 50, 65, 50, 55, 65, 85,  88, 65,  40, 60, 50, 62,  5, 75]
],
hxh: [
    // id, name,                   STR SPD IQ DUR CMB SPC | Mast Abil | CAP VC TANK DUEL HEAL SUP
    [27, "Killua Zoldyck",           75, 98, 88, 75, 92, 92,  88, 92,  60, 88, 60, 90, 10, 80],
    [28, "Kurapika",                 65, 80, 92, 65, 85, 92,  88, 95,  80, 85, 50, 85, 30, 75],
    [30, "Gon Freecss",              85, 85, 45, 82, 82, 88,  82, 90,  60, 75, 75, 85,  5, 65],
    [31, "Hisoka Morow",             82, 88, 90, 82, 95, 90,  92, 92,  55, 60, 70, 95,  5, 30],
    [58, "Chrollo Lucilfer",         72, 85, 95, 72, 90, 95,  95, 96,  98, 70, 60, 88,  5, 70],
    [23277, "Meruem",               100, 98,100,100, 98, 95,  98, 92,  98, 70,100, 98,  5, 50],
    [29, "Leorio Paradinight",       50, 55, 70, 55, 55, 55,  50, 60,  55, 65, 50, 50, 80, 75],
    [3195, "Feitan Portor",          70, 92, 70, 70, 88, 88,  85, 88,  50, 75, 60, 88,  5, 40],
    [14489, "Isaac Netero",          90, 98, 92, 82, 98, 95,  99, 96,  98, 85, 75, 96,  5, 80],
    [12300, "Neferpitou",            88, 95, 80, 82, 90, 92,  92, 92,  55, 90, 75, 90, 95, 60],
    [5833, "Shizuku Murasaki",       50, 65, 72, 55, 72, 80,  78, 80,  40, 70, 50, 70,  5, 75],
    [57, "Illumi Zoldyck",           72, 88, 88, 75, 90, 85,  88, 85,  60, 85, 60, 88,  5, 55],
    [20594, "Kite",                  70, 78, 82, 70, 85, 78,  85, 78,  75, 82, 60, 82,  5, 70],
    [13898, "Biscuit Krueger",       88, 85, 85, 85, 92, 75,  92, 72,  70, 85, 85, 88, 75, 90],
    [26, "Ging Freecss",             85, 88, 96, 82, 90, 90,  97, 88,  85, 75, 75, 88, 15, 80],
    [29809, "Knuckle Bine",          75, 72, 65, 80, 78, 80,  78, 82,  55, 70, 82, 75,  5, 65],
    [5830, "Machi Komacine",         55, 82, 75, 55, 80, 78,  82, 75,  50, 75, 50, 78, 85, 75],
    [5835, "Pakunoda",               45, 60, 80, 50, 65, 82,  75, 85,  50, 70, 45, 60,  5, 85],
    [41135, "Shaiapouf",             75, 92, 85, 85, 82, 90,  88, 90,  70, 85, 75, 82,  5, 75],
    [43953, "Menthuthuyoupi",        95, 82, 45, 95, 80, 90,  85, 90,  40, 70, 95, 85,  5, 40],
    [5836, "Uvogin",                 95, 75, 40, 95, 82, 85,  82, 85,  40, 70, 95, 85,  5, 40],
    [29806, "Morel Mackernasey",     72, 65, 80, 75, 78, 80,  85, 80,  75, 75, 70, 75,  5, 75],
    [59, "Zeno Zoldyck",             85, 88, 88, 82, 92, 90,  95, 90,  80, 85, 75, 92,  5, 70],
    [60, "Silva Zoldyck",            90, 88, 85, 88, 92, 88,  92, 88,  85, 82, 85, 90,  5, 65],
    [5834, "Phinks Magcub",          85, 80, 55, 80, 82, 82,  80, 82,  45, 65, 75, 85,  5, 40],
    [55071, "Pariston Hill",         50, 60, 95, 55, 60, 85,  88, 85,  82, 92, 50, 55,  5, 70],
    [52425, "Alluka Zoldyck",        10, 30, 40, 30, 10,100,  70,100,  20, 30, 30, 20,100, 60],
    [29808, "Meleoron",              50, 70, 70, 50, 65, 85,  75, 88,  40, 65, 40, 55,  5, 88]
],
deathnote: [
    // id, name,              STR SPD IQ DUR CMB SPC | INT DED MAN PLA DEC PSY | CAP VC TANK DUEL HEAL SUP
    [71, "L Lawliet",           45, 55, 99, 40, 65, 70,  99,100, 82, 96, 85, 95,  90, 85, 25, 55, 10, 85],
    [80, "Light Yagami",        35, 45, 99, 35, 40, 95,  99, 95, 98, 99, 99, 98,  95, 80, 20, 40,  5, 70],
    [75, "Ryuk",                90, 85, 60, 99, 50, 92,  55, 50, 40, 30, 60, 70,  30, 40, 95, 70,  5, 40],
    [835, "Misa Amane",         20, 40, 50, 25, 15, 85,  45, 35, 75, 40, 70, 60,  30, 50, 20, 20, 10, 60],
    [463, "Mello",              40, 55, 92, 40, 60, 60,  92, 88, 85, 85, 82, 88,  85, 70, 30, 55,  5, 60],
    [464, "Near",               15, 20, 98, 20,  5, 60,  98, 97, 85, 95, 88, 92,  92, 75, 10, 10,  5, 80],
    [1906, "Touta Matsuda",     40, 50, 50, 45, 55, 15,  45, 40, 25, 30, 30, 30,  30, 50, 40, 50,  5, 60],
    [1905, "Rem",               85, 80, 75, 99, 50, 90,  75, 70, 50, 60, 60, 65,  40, 60, 95, 65,  5, 70],
    [1904, "Teru Mikami",       40, 50, 82, 40, 40, 80,  82, 70, 60, 78, 72, 80,  50, 85, 30, 40,  5, 75],
    [4959, "Naomi Misora",      45, 55, 85, 40, 75, 40,  85, 90, 60, 75, 70, 75,  60, 75, 35, 65,  5, 65],
    [2730, "Matt",              35, 50, 80, 35, 50, 30,  80, 70, 55, 65, 70, 60,  40, 70, 30, 45,  5, 70],
    [1927, "Soichiro Yagami",   50, 50, 78, 50, 55, 30,  78, 80, 45, 72, 40, 65,  85, 75, 45, 50,  5, 75],
    [2179, "Watari",            35, 40, 92, 30, 45, 70,  90, 82, 70, 88, 80, 75,  70, 95, 25, 40, 30, 95],
    [3767, "Shuichi Aizawa",    50, 50, 72, 50, 55, 15,  72, 75, 45, 65, 45, 62,  70, 75, 45, 50,  5, 70],
    [3765, "Kiyomi Takada",     25, 40, 80, 25, 20, 70,  80, 70, 78, 72, 80, 78,  60, 70, 15, 20,  5, 70],
    [8135, "Sayu Yagami",       15, 30, 55, 20,  5,  5,  55, 40, 30, 30, 30, 30,  20, 30, 15, 10, 30, 50],
    [1929, "Reiji Namikawa",    30, 40, 85, 30, 30, 60,  85, 75, 78, 80, 78, 78,  72, 70, 20, 25,  5, 65],
    [7044, "Raye Penber",       45, 55, 72, 45, 65, 20,  70, 65, 40, 55, 45, 55,  55, 65, 45, 60,  5, 55],
    [2402, "Sidoh",             82, 75, 30, 98, 45, 80,  30, 25, 20, 15, 20, 35,  15, 25, 90, 60,  5, 30],
    [3769, "Halle Lidner",      50, 60, 82, 45, 75, 40,  82, 80, 70, 72, 82, 72,  60, 82, 40, 65, 10, 75],
    [3766, "Kanzo Mogi",        70, 45, 60, 70, 60, 15,  60, 55, 35, 50, 55, 50,  45, 65, 75, 60,  5, 65],
    [20002, "Hideki Ide",       50, 50, 65, 50, 55, 15,  65, 62, 40, 55, 45, 50,  55, 65, 50, 55,  5, 60],
    [3770, "Stephen Gevanni",   45, 55, 85, 45, 65, 50,  85, 80, 65, 80, 78, 72,  55, 82, 40, 60,  5, 78]
],
chainsaw: [
    // id, name,                   STR SPD IQ DUR CMB SPC | Devil Regen | CAP VC TANK DUEL HEAL SUP
    [137080, "Makima",               88, 80, 98, 99, 80, 98,  98, 95,  95, 70, 95, 85,  5, 60],
    [130102, "Denji",                85, 82, 40, 88, 78, 88,  88, 95,  40, 60, 88, 85,  5, 55],
    [137079, "Power",                75, 80, 25, 75, 70, 82,  82, 85,  25, 50, 70, 75, 30, 55],
    [137081, "Aki Hayakawa",         60, 70, 72, 55, 85, 85,  85, 10,  70, 85, 50, 85,  5, 75],
    [148740, "Reze",                 82, 85, 78, 80, 85, 90,  90, 92,  55, 70, 75, 88,  5, 45],
    [170266, "Pochita",              99, 92, 50, 99, 85,100, 100, 98,  50, 85, 95, 95, 70, 90],
    [144594, "Kobeni Higashiyama",   40, 92, 45, 40, 82, 30,  30,  5,  15, 40, 30, 75,  5, 40],
    [152231, "Angel Devil",          50, 60, 60, 60, 55, 85,  85, 40,  30, 60, 50, 55,  5, 60],
    [144596, "Himeno",               45, 60, 72, 45, 75, 75,  78,  5,  70, 82, 40, 70,  5, 80],
    [144593, "Kishibe",              70, 85, 85, 70, 98, 60,  60,  5,  85, 85, 60, 95,  5, 70],
    [157232, "Beam",                 60, 85, 35, 65, 65, 70,  70, 75,  20, 50, 55, 65,  5, 65],
    [157231, "Violence Fiend",       82, 60, 60, 80, 72, 70,  70, 75,  40, 70, 75, 72,  5, 70],
    [157241, "Samurai Sword",        75, 85, 40, 75, 75, 80,  80, 85,  40, 50, 70, 80,  5, 40],
    [172887, "Future Devil",         30, 30, 70, 60, 20, 80,  82, 30,  30, 50, 40, 20,  5, 75],
    [290671, "Fox Devil",            75, 70, 50, 70, 60, 80,  82, 40,  30, 50, 60, 65,  5, 60],
    [174262, "Ghost Devil",          55, 60, 40, 70, 50, 75,  78, 50,  20, 40, 60, 55,  5, 40],
    [157240, "Eternity Devil",       30, 30, 40, 95, 20, 82,  82, 90,  20, 30, 95, 20,  5, 40],
    [174282, "Zombie Devil",         50, 40, 30, 75, 40, 70,  72, 80,  40, 40, 75, 45,  5, 35],
    [174265, "Curse Devil",          80, 40, 40, 75, 55, 92,  92, 50,  20, 40, 70, 80,  5, 30],
    [157277, "Prinz",                40, 55, 60, 60, 45, 75,  75, 85,  25, 50, 55, 45,  5, 55]
],
blackclover: [
    // id, name,                   STR SPD IQ DUR CMB SPC | Pow Attr | CAP VC TANK DUEL HEAL SUP
    [124440, "Yami Sukehiro",        88, 82, 70, 85, 95, 90,  88, 92,  92, 80, 82, 94,  5, 70],
    [123285, "Asta",                 90, 88, 40, 88, 90, 88,   5, 85,  85, 75, 88, 90,  5, 75],
    [123283, "Noelle Silva",         60, 65, 60, 65, 70, 88,  92, 85,  60, 75, 70, 75,  5, 75],
    [123284, "Yuno",                 75, 92, 80, 75, 88, 92,  92, 92,  75, 88, 70, 90,  5, 70],
    [124522, "Mereoleona Vermillion",92, 85, 55, 90, 92, 88,  90, 90,  85, 80, 88, 92,  5, 60],
    [124435, "Julius Novachrono",    75, 90, 92, 75, 90, 98,  95, 98,  98, 80, 70, 88, 10, 85],
    [124449, "Luck Voltia",          60, 92, 50, 60, 85, 82,  80, 82,  40, 70, 50, 85,  5, 55],
    [124459, "Zora Ideale",          55, 75, 85, 55, 80, 78,  75, 80,  55, 75, 50, 78,  5, 75],
    [124436, "Vanessa Enoteca",      30, 45, 60, 45, 50, 90,  78, 92,  40, 65, 50, 50, 30, 88],
    [124447, "Charmy Pappitson",     60, 55, 45, 70, 60, 80,  85, 82,  40, 60, 70, 60, 75, 80],
    [124438, "Mimosa Vermillion",    25, 45, 70, 35, 35, 75,  70, 75,  40, 70, 40, 30, 95, 85],
    [124433, "Finral Roulacase",     20, 60, 60, 35, 30, 80,  70, 85,  30, 70, 30, 25,  5, 95],
    [124434, "Charlotte Roselei",    65, 72, 72, 75, 80, 85,  85, 85,  80, 75, 80, 80,  5, 70],
    [187268, "Nacht Faust",          75, 82, 90, 72, 88, 90,  85, 88,  75, 90, 65, 88,  5, 75],
    [124439, "Magna Swing",          55, 65, 45, 60, 72, 75,  45, 72,  45, 65, 55, 72,  5, 70],
    [192196, "Liebe",                85, 90, 40, 85, 82, 90,  85, 90,  40, 60, 82, 85,  5, 55],
    [124521, "Fuegoleon Vermillion", 75, 75, 78, 75, 85, 85,  85, 88,  90, 80, 72, 82,  5, 70],
    [124442, "Nozel Silva",          72, 78, 75, 72, 85, 85,  85, 86,  85, 75, 72, 82,  5, 60],
    [124458, "Dorothy Unsworth",     30, 30, 75, 50, 40, 88,  88, 92,  60, 65, 50, 40,  5, 80],
    [124441, "William Vangeance",    55, 65, 82, 60, 70, 82,  85, 82,  82, 80, 60, 70, 85, 80],
    [124446, "Gauche Adlai",         50, 65, 55, 55, 70, 75,  70, 78,  40, 70, 50, 70,  5, 70],
    [124472, "Licht",                85, 90, 80, 80, 92, 92,  92, 92,  88, 75, 75, 92,  5, 60],
    [167952, "Zenon Zogratis",       82, 82, 75, 82, 88, 88,  88, 85,  70, 82, 80, 88,  5, 50],
    [168300, "Vanica Zogratis",      82, 80, 35, 82, 80, 92,  92, 85,  40, 60, 80, 85,  5, 40],
    [163782, "Dante Zogratis",       85, 75, 70, 95, 82, 90,  90, 88,  70, 75, 95, 82,  5, 50]
],
jojo: [
    // id, name,                   STR SPD IQ DUR CMB SPC | Stand Tech | CAP VC TANK DUEL HEAL SUP
    [6356, "Joseph Joestar",         65, 70, 95, 65, 80, 85,  75, 90,  82, 85, 55, 80, 15, 82],
    [4003, "Jotaro Kujo",            92, 90, 85, 85, 92, 92,  98,  5,  85, 85, 80, 95,  5, 65],
    [11772, "Gyro Zeppeli",          65, 72, 85, 65, 88, 90,  50, 98,  75, 85, 55, 88, 70, 80],
    [4004, "Dio Brando",             92, 92, 85, 90, 88, 96,  98,  5,  92, 70, 85, 92,  5, 55],
    [13085, "Josuke Higashikata",    82, 80, 70, 75, 85, 88,  90,  5,  70, 85, 75, 85, 98, 85],
    [12055, "Yoshikage Kira",        70, 70, 88, 65, 75, 92,  95,  5,  70, 70, 55, 80,  5, 50],
    [11222, "Jolyne Cujoh",          72, 78, 72, 72, 82, 82,  82,  5,  75, 75, 65, 80, 30, 75],
    [19492, "Johnny Joestar",        40, 50, 75, 50, 85, 95,  95, 90,  65, 75, 30, 85,  5, 70],
    [12659, "Rohan Kishibe",         30, 50, 88, 35, 50, 88,  90,  5,  45, 70, 25, 55,  5, 80],
    [10529, "Giorno Giovanna",       70, 80, 90, 70, 85, 98,  98,  5,  92, 75, 70, 85, 90, 80],
    [13045, "Bruno Bucciarati",      70, 78, 85, 70, 85, 85,  85,  5,  92, 90, 65, 82, 30, 82],
    [8945, "Noriaki Kakyoin",        50, 65, 85, 50, 70, 80,  82,  5,  60, 82, 40, 70,  5, 80],
    [4368, "Jean Pierre Polnareff",  72, 88, 55, 70, 88, 80,  85,  5,  55, 80, 60, 88,  5, 65],
    [13084, "Guido Mista",           55, 70, 65, 65, 82, 80,  82,  5,  45, 75, 55, 80,  5, 75],
    [11895, "Narancia Ghirga",       45, 65, 40, 50, 70, 78,  80,  5,  35, 60, 40, 72,  5, 70],
    [8087, "Jonathan Joestar",       88, 70, 70, 80, 82, 85,   1, 92,  82, 80, 85, 82, 30, 75],
    [20147, "Funny Valentine",       60, 60, 92, 70, 75, 95,  95,  5,  92, 70, 75, 78,  5, 65],
    [28991, "Okuyasu Nijimura",      70, 65, 25, 75, 70, 88,  88,  5,  40, 70, 70, 75,  5, 60],
    [20148, "Diego Brando",          65, 85, 82, 65, 80, 85,  85,  5,  65, 70, 55, 80,  5, 55],
    [21959, "Caesar Zeppeli",        75, 72, 72, 70, 82, 85,   1, 90,  70, 82, 60, 80, 25, 75],
    [17675, "Weather Report",        60, 65, 70, 60, 72, 95,  95,  5,  55, 75, 55, 80,  5, 75],
    [17676, "Enrico Pucci",          60, 65, 90, 60, 72, 98,  98,  5,  90, 70, 55, 78,  5, 60],
    [27155, "Diavolo",               70, 75, 85, 70, 82, 96,  96,  5,  92, 65, 60, 88,  5, 45],
    [8946, "Mohammed Avdol",         65, 70, 75, 70, 80, 85,  85,  5,  70, 88, 60, 80,  5, 70],
    [17525, "Leone Abbacchio",       60, 60, 80, 60, 70, 75,  75,  5,  55, 80, 55, 65,  5, 85],
    [21960, "Lisa Lisa",             75, 80, 85, 70, 92, 88,   1, 97,  88, 85, 60, 90, 30, 80],
    [21966, "Kars",                  92, 88, 88, 95, 88, 95,   1, 90,  85, 70, 90, 90,  5, 50],
    [21965, "Wamuu",                 92, 88, 70, 92, 92, 90,   1, 88,  60, 92, 85, 92,  5, 45],
    [21089, "Iggy",                  25, 80, 70, 40, 60, 82,  82,  5,  30, 60, 40, 60,  5, 70],
    [16557, "Hol Horse",             40, 60, 60, 45, 70, 72,  72,  5,  30, 85, 35, 70,  5, 55],
    [24496, "Koichi Hirose",         35, 55, 70, 45, 60, 78,  82,  5,  40, 75, 40, 55,  5, 82]
],
rezero: [
    // id, name,                   STR SPD IQ DUR CMB SPC | Magic Div | CAP VC TANK DUEL HEAL SUP
    [88572, "Emilia",                60, 65, 50, 65, 70, 88,  92, 60,  85, 70, 75, 75, 70, 80],
    [88575, "Rem",                   82, 82, 60, 75, 85, 80,  75, 70,  50, 90, 75, 85, 70, 85],
    [88573, "Subaru Natsuki",        25, 35, 70, 40, 30, 95,  25, 98,  85, 70, 30, 25,  5, 80],
    [129330, "Echidna",              30, 45, 98, 40, 40, 92,  95, 85,  75, 80, 30, 50, 20, 80],
    [90181, "Beatrice",              30, 40, 85, 50, 50, 90,  92, 70,  45, 80, 60, 60, 30, 85],
    [88576, "Ram",                   55, 70, 80, 50, 72, 82,  82, 75,  70, 85, 45, 72, 30, 80],
    [124110, "Otto Suwen",           20, 40, 82, 30, 30, 80,  50, 85,  60, 82, 25, 25,  5, 88],
    [88577, "Reinhard van Astrea",  100,100, 85,100,100,100,  70,100,  90, 85,100,100, 50, 85],
    [90184, "Ferris",                30, 60, 75, 35, 40, 85,  85, 70,  50, 82, 30, 40,100, 85],
    [133847, "Garfiel Tinsel",       85, 75, 40, 88, 80, 80,  50, 82,  50, 70, 92, 80, 30, 60],
    [90185, "Crusch Karsten",        65, 72, 80, 65, 82, 80,  80, 82,  92, 75, 60, 80,  5, 70],
    [90187, "Puck",                  80, 75, 82, 75, 60, 95,  98, 70,  40, 75, 70, 70,  5, 75],
    [90179, "Wilhelm van Astrea",    82, 88, 75, 75, 98, 82,  30, 80,  70, 85, 60, 98,  5, 65],
    [90183, "Julius Juukulius",      72, 80, 80, 70, 90, 88,  88, 80,  80, 88, 65, 88, 10, 75],
    [90182, "Roswaal L Mathers",     50, 70, 92, 60, 72, 95,  98, 70,  70, 75, 50, 75, 20, 75],
    [90170, "Petelgeuse Romanee-Conti",60,70, 60, 85, 50, 88,  75, 90,  75, 60, 70, 60,  5, 50],
    [90186, "Priscilla Barielle",    70, 75, 82, 70, 85, 95,  70, 98,  85, 70, 60, 85,  5, 55],
    [184458, "Shaula",               92, 85, 40, 85, 75, 88,  75, 80,  30, 75, 85, 82,  5, 60],
    [88574, "Felt",                  40, 92, 55, 40, 60, 82,  30, 85,  60, 55, 35, 55,  5, 60],
    [90180, "Elsa Granhiert",        75, 82, 60, 82, 85, 80,  30, 82,  40, 60, 70, 85,  5, 35],
    [174098, "Regulus Corneas",      70, 70, 50,100, 50, 98,  50, 98,  50, 40,100, 70,  5, 30],
    [90177, "Anastasia Hoshin",      20, 35, 92, 30, 25, 70,  40, 70,  88, 85, 25, 20,  5, 85],
    [90178, "Aldebaran",             70, 75, 75, 70, 85, 92,  60, 92,  55, 80, 65, 82,  5, 70],
    [175581, "Capella Emerada Lugnica",70,60, 60, 92, 50, 92,  60, 92,  50, 55, 90, 60, 50, 40],
    [127242, "Satella",              95, 80, 60, 95, 60, 99,  99, 95,  50, 60, 90, 80,  5, 60]
],
fireforce: [
    // id, name,                   STR SPD IQ DUR CMB SPC | Ign Adolla | CAP VC TANK DUEL HEAL SUP
    [130848, "Benimaru Shinmon",     92, 88, 60, 90, 95, 92,  95, 70,  90, 80, 85, 95,  5, 60],
    [130716, "Iris",                 15, 30, 60, 25, 15, 70,  40, 92,  40, 60, 20, 15, 70, 85],
    [120462, "Shinra Kusakabe",      82, 98, 65, 78, 88, 92,  92, 92,  75, 80, 70, 90,  5, 75],
    [130715, "Arthur Boyle",         80, 80, 25, 80, 88, 88,  88, 70,  55, 70, 75, 90,  5, 55],
    [130713, "Maki Oze",             85, 65, 70, 75, 80, 75,  78, 40,  60, 85, 80, 78,  5, 80],
    [130751, "Tamaki Kotatsu",       40, 70, 40, 45, 60, 65,  65, 20,  25, 50, 35, 60,  5, 55],
    [135385, "Joker",                70, 80, 92, 70, 88, 88,  85, 85,  70, 75, 60, 88,  5, 70],
    [130783, "Princess Hibana",      45, 55, 85, 45, 55, 75,  75, 30,  75, 80, 35, 55, 60, 80],
    [130712, "Akitaru Obi",          80, 65, 70, 85, 82,  5,   5,  5,  92, 88, 92, 78, 30, 85],
    [130714, "Takehisa Hinawa",      50, 60, 88, 55, 85, 75,  75, 10,  75, 92, 50, 80,  5, 85],
    [150194, "Sho Kusakabe",         82, 99, 60, 75, 90, 95,  95, 92,  60, 75, 70, 92,  5, 50],
    [143289, "Vulcan Joseph",        60, 50, 92, 70, 60, 70,  70, 10,  50, 75, 65, 55, 30, 95],
    [171898, "Charon",               90, 60, 40, 95, 70, 88,  88, 50,  40, 75, 98, 72,  5, 55],
    [160044, "Haumea",               55, 60, 85, 60, 55, 95,  95, 95,  75, 70, 50, 70,  5, 75],
    [130785, "Leonard Burns",        92, 82, 82, 90, 92, 92,  92, 85,  88, 75, 88, 92,  5, 65],
    [154079, "Arrow",                50, 75, 65, 50, 75, 75,  75, 30,  40, 75, 40, 75,  5, 55],
    [180505, "Ogun Montgomery",      75, 72, 45, 75, 80, 82,  82, 30,  50, 70, 70, 80,  5, 65],
    [130852, "Konro Sagamiya",       80, 65, 75, 85, 82, 88,  90, 40,  70, 92, 85, 80,  5, 75],
    [130790, "Karim Flam",           50, 60, 75, 60, 65, 80,  80, 20,  70, 80, 70, 60,  5, 80],
    [180506, "Yuichiro Kurono",      70, 82, 80, 70, 88, 82,  82, 30,  45, 65, 60, 88,  5, 35],
    [130789, "Rekka Hoshimiya",      75, 75, 45, 75, 75, 80,  80, 50,  60, 55, 70, 75,  5, 45],
    [171891, "Inca Kasugatani",      30, 70, 70, 35, 55, 82,  82, 92,  30, 50, 30, 55,  5, 55],
    [150692, "Dr. Giovanni",         55, 55, 85, 60, 60, 78,  78, 60,  65, 70, 55, 60,  5, 70],
    [161515, "Assault",              82, 70, 40, 85, 70, 82,  82, 30,  40, 60, 82, 72,  5, 40],
    [190921, "Nataku Son",           60, 50, 30, 70, 40, 92,  92, 85,  15, 30, 70, 60,  5, 40]
],
frieren: [
    // id, name,                   STR SPD IQ DUR CMB SPC | Mana Mag | CAP VC TANK DUEL HEAL SUP
    [176754, "Frieren",              25, 60, 95, 40, 92, 95, 100, 95,  82, 80, 45, 90, 30, 85],
    [183965, "Fern",                 20, 70, 75, 35, 82, 88,  90, 85,  50, 80, 35, 85, 20, 80],
    [184313, "Stark",                92, 75, 40, 92, 85,  5,   5,  5,  40, 75, 95, 85,  5, 65],
    [184311, "Himmel",               82, 92, 80, 80, 98,  5,   5,  5, 100, 80, 80, 98,  5, 85],
    [246057, "Ubel",                 40, 72, 70, 45, 85, 90,  75, 92,  30, 55, 40, 90,  5, 40],
    [184312, "Eisen",                96, 60, 60, 98, 85,  5,   5,  5,  50, 80,100, 82,  5, 75],
    [184310, "Heiter",               25, 40, 82, 40, 40, 85,  82, 85,  75, 85, 35, 35,100, 90],
    [219733, "Flamme",               25, 50, 95, 35, 85, 92,  95, 95,  88, 75, 40, 85, 30, 90],
    [219734, "Serie",                30, 70, 98, 50, 95, 99,  99, 99,  95, 75, 55, 95, 30, 85],
    [205177, "Sein",                 25, 45, 75, 40, 40, 82,  82, 80,  45, 75, 40, 40, 98, 85],
    [246058, "Denken",               55, 60, 92, 60, 88, 88,  88, 88,  80, 82, 55, 85, 10, 75],
    [246054, "Methode",              25, 55, 80, 40, 72, 85,  85, 85,  55, 82, 45, 70, 75, 85],
    [321720, "Sense",                30, 55, 85, 45, 72, 85,  88, 85,  75, 85, 45, 72,  5, 75],
    [321716, "Wirbel",               35, 65, 80, 45, 82, 82,  82, 80,  80, 75, 40, 82,  5, 65],
    [300778, "Macht",                70, 70, 85, 80, 88, 95,  92, 95,  70, 60, 75, 90,  5, 40],
    [219110, "Aura",                 30, 45, 70, 50, 75, 92,  95, 92,  70, 60, 50, 75,  5, 50],
    [293727, "Lawine",               20, 55, 65, 30, 60, 72,  72, 70,  40, 60, 30, 60,  5, 70],
    [321719, "Land",                 30, 55, 82, 45, 72, 82,  82, 82,  45, 70, 40, 72,  5, 70],
    [293728, "Kanne",                20, 50, 60, 30, 60, 70,  70, 70,  40, 60, 30, 55,  5, 70],
    [246056, "Laufen",               40, 92, 70, 40, 70, 70,  70, 70,  40, 65, 30, 72,  5, 60],
    [316986, "Linie",                70, 70, 65, 65, 80, 82,  80, 82,  40, 65, 55, 82,  5, 55],
    [246055, "Genau",                55, 65, 82, 55, 85, 82,  82, 82,  75, 80, 55, 82,  5, 65],
    [315278, "Qual",                 25, 50, 65, 45, 70, 85,  82, 88,  50, 55, 40, 72,  5, 45],
    [316987, "Draht",                35, 70, 60, 40, 75, 75,  75, 75,  40, 55, 35, 75,  5, 40],
    [315929, "Edel",                 25, 40, 75, 30, 40, 80,  80, 80,  40, 70, 30, 40,  5, 75],
    [219732, "Kraft",                92, 65, 70, 92, 88, 30,  30, 30,  65, 75, 92, 85,  5, 65],
    [316985, "Lugner",               35, 70, 70, 50, 80, 82,  80, 82,  45, 70, 45, 80,  5, 45],
    [331267, "South Hero",           85, 90, 90, 80, 95, 80,  70, 80,  92, 80, 80, 95,  5, 75]
],
gachiakuta: [
    // id, name,                   STR SPD IQ DUR CMB SPC | Vital Cmb | CAP VC TANK DUEL HEAL SUP
    [266438, "Enjin",                70, 80, 82, 72, 90, 88,  88, 90,  75, 85, 65, 88,  5, 75],
    [266433, "Rudo",                 82, 82, 55, 80, 82, 90,  90, 82,  60, 70, 80, 85,  5, 70],
    [275749, "Riyo Reaper",          55, 85, 65, 55, 85, 80,  80, 85,  40, 70, 45, 85,  5, 55],
    [268742, "Zanka Nijiku",         60, 75, 75, 60, 85, 78,  80, 85,  55, 82, 55, 85,  5, 70],
    [298929, "Amo Empool",           30, 55, 60, 40, 50, 82,  85, 50,  25, 50, 35, 50,  5, 70],
    [298953, "Jabber Wonger",        85, 82, 40, 85, 92, 85,  85, 92,  40, 60, 75, 92,  5, 30],
    [291689, "Tamsy Caines",         65, 55, 70, 70, 70, 75,  75, 70,  70, 75, 70, 70,  5, 70],
    [306965, "Guita Heavy Fantasia", 55, 60, 60, 60, 60, 72,  72, 60,  40, 60, 55, 60,  5, 60],
    [298949, "Semiu Grier",          30, 50, 85, 45, 45, 80,  80, 45,  85, 80, 40, 45, 30, 90],
    [298954, "Follo Tunito",         50, 55, 60, 60, 60, 72,  72, 60,  40, 60, 60, 60,  5, 60],
    [298958, "Gris Rubion",          50, 60, 70, 55, 65, 70,  70, 65,  50, 70, 50, 65,  5, 65],
    [266437, "Regto",                45, 50, 75, 50, 70, 40,  40, 70,  75, 70, 50, 65,  5, 75],
    [306959, "Dear Santa",           50, 60, 75, 55, 65, 78,  78, 65,  60, 65, 55, 65,  5, 70],
    [336645, "Fu Orostor",           70, 70, 70, 70, 80, 80,  80, 80,  60, 70, 65, 80,  5, 55],
    [306966, "Zodyl Typhon",         75, 70, 75, 75, 80, 85,  85, 80,  75, 70, 75, 80,  5, 50],
    [298957, "Alha Korvus",          50, 60, 70, 55, 70, 75,  75, 70,  45, 65, 50, 70,  5, 60]
],
windbreaker: [
    // id, name,                   STR SPD IQ DUR CMB SPC | Tech Endur | CAP VC TANK DUEL HEAL SUP
    [230204, "Haruka Sakura",        85, 88, 55, 85, 90, 70,  90, 88,  80, 75, 82, 90,  5, 65],
    [255629, "Hayato Suo",           72, 88, 90, 70, 92, 75,  92, 72,  75, 92, 60, 90,  5, 80],
    [255630, "Hajime Umemiya",       98, 85, 75, 95, 95, 80,  95, 95, 100, 75, 95, 95, 10, 90],
    [332991, "Jo Togame",            88, 80, 70, 85, 90, 72,  90, 85,  85, 80, 85, 90,  5, 60],
    [332260, "Ren Kaji",             82, 80, 60, 80, 88, 65,  88, 82,  70, 85, 78, 88,  5, 55],
    [311243, "Tasuku Tsubakino",     72, 85, 70, 70, 85, 72,  85, 72,  60, 80, 60, 85,  5, 70],
    [329049, "Kotoha Tachibana",     10, 30, 75, 20, 10, 40,  10, 20,  40, 65, 10, 10, 70, 90],
    [329047, "Mitsuki Kiryu",        65, 88, 80, 60, 82, 72,  82, 65,  55, 80, 55, 82,  5, 75],
    [255627, "Akihiko Nirei",        25, 45, 82, 40, 30, 60,  30, 70,  55, 70, 30, 30,  5, 92],
    [255628, "Kyotaro Sugishita",    88, 80, 40, 88, 85, 65,  85, 88,  40, 82, 88, 85,  5, 50],
    [347857, "Yamato Endo",          85, 85, 75, 82, 90, 75,  90, 82,  60, 70, 75, 90,  5, 30],
    [318248, "Toma Hiragi",          88, 75, 72, 90, 85, 65,  85, 92,  80, 92, 92, 85,  5, 70],
    [332992, "Choji Tomiyama",       80, 85, 50, 75, 85, 70,  85, 75,  75, 60, 70, 85,  5, 40],
    [347858, "Chika Takiishi",       92, 90, 40, 88, 92, 72,  92, 85,  60, 55, 82, 95,  5, 20],
    [329046, "Taiga Tsugeura",       85, 60, 40, 88, 72, 60,  72, 90,  45, 65, 92, 72,  5, 60],
    [332988, "Kota Sako",            60, 65, 60, 65, 70, 60,  70, 65,  50, 70, 60, 70,  5, 60],
    [361916, "Uryu Sakaki",          75, 82, 60, 72, 82, 65,  82, 72,  55, 75, 65, 80,  5, 60],
    [361915, "Seiryu Sakaki",        75, 82, 60, 72, 82, 65,  82, 72,  55, 75, 65, 80,  5, 60]
]
};
