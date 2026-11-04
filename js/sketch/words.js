/* =====================================================================
   ANIME SKETCH word library: only CHARACTERS and OBJECTS / WEAPONS (no places, attacks, powers, groups or terms).
   Sources (combined by buildWords in engine.js):
     - characters: the Anime Draft roster (js/draft/data.js, most popular first) + the fan nicknames (js/feud/nicknames.js)
     - the Anime Feud item boards (items, devil fruits) and its titans / devils / Stands
     - this file: important characters the roster doesn't have, and each series' recognisable objects and weapons
   Row: [word, "Character" | "Object" | "Weapon", [other accepted spellings]]
   ===================================================================== */
const C = "Character", O = "Object", W = "Weapon";
export const EXTRAS = {
    onepiece: [
        ["Big Mom", C, ["Charlotte Linlin", "Linlin"]], ["Akainu", C, ["Sakazuki"]], ["Vivi", C, ["Nefertari Vivi"]], ["Koby", C, ["Coby"]], ["Arlong", C], ["Bon Clay", C, ["Mr 2", "Bentham"]], ["Laboon", C], ["Vegapunk", C], ["Carrot", C],
        ["Yoru", W, ["Mihawk's sword"]], ["Enma", W], ["Shusui", W], ["Kitetsu", W], ["Kikoku", W, ["Law's sword", "Nodachi"]], ["Wado Ichimonji", W, ["Zoro's sword"]], ["Slingshot", W, ["Kabuto", "Usopp's slingshot"]], ["Clima-Tact", W, ["Nami's staff"]], ["Bisento", W, ["Whitebeard's naginata"]], ["Cannon", W],
        ["Straw Hat", O, ["Luffy's hat"]], ["Going Merry", O, ["Merry"]], ["Thousand Sunny", O, ["Sunny"]], ["Log Pose", O], ["Eternal Pose", O], ["Jolly Roger", O, ["Pirate flag"]], ["Wanted poster", O, ["Bounty poster"]], ["Vivre Card", O], ["Seastone handcuffs", O, ["Seastone", "Kairoseki"]], ["Meat on the bone", O, ["Meat"]], ["Treasure chest", O], ["Ship's wheel", O, ["Helm"]], ["Poneglyph", O, ["Road Poneglyph"]], ["Den Den Mushi", O, ["Transponder snail"]]
    ],
    naruto: [
        ["Iruka", C, ["Iruka Umino"]], ["Kiba", C, ["Kiba Inuzuka"]], ["Akamaru", C], ["Choji", C, ["Choji Akimichi"]], ["Ino", C, ["Ino Yamanaka"]], ["Temari", C], ["Sai", C], ["Haku", C], ["Asuma", C, ["Asuma Sarutobi"]], ["Danzo", C, ["Danzo Shimura"]], ["Gamabunta", C], ["Yamato", C, ["Tenzo"]],
        ["Kunai", W], ["Shuriken", W, ["Ninja star"]], ["Samehada", W], ["Executioner's Blade", W, ["Kubikiribocho"]], ["Kusanagi sword", W, ["Kusanagi"]], ["Trench knives", W, ["Asuma's knives"]], ["Windmill shuriken", W, ["Fuma shuriken"]], ["Flying Thunder God kunai", W, ["Minato's kunai", "Hiraishin kunai"]], ["Gunbai", W, ["Madara's fan", "War fan"]],
        ["Headband", O, ["Forehead protector", "Hitai-ate"]], ["Ramen bowl", O, ["Ramen"]], ["Icha Icha", O, ["Make-Out Paradise"]], ["Summoning scroll", O, ["Scroll"]], ["Sand gourd", O, ["Gaara's gourd", "Gourd"]], ["Frog wallet", O, ["Gama-chan"]], ["Akatsuki cloak", O], ["Hokage hat", O], ["Anbu mask", O], ["Paper bomb", O, ["Explosive tag"]], ["Smoke bomb", O]
    ],
    dragonball: [
        ["Chi-Chi", C], ["Mr. Satan", C, ["Hercule"]], ["Shenron", C, ["Shenlong", "Eternal dragon"]], ["Gotenks", C], ["Vegito", C, ["Vegito"]], ["Gogeta", C], ["Nappa", C], ["Pan", C], ["Oolong", C], ["Puar", C],
        ["Power Pole", W, ["Nyoibo"]], ["Z Sword", W], ["Trunks' sword", W, ["Brave Sword"]],
        ["Dragon Balls", O, ["Dragon Ball"]], ["Senzu Bean", O, ["Senzu", "Sensu bean"]], ["Scouter", O], ["Flying Nimbus", O, ["Nimbus", "Kinto'un"]], ["Capsule", O, ["Hoi-Poi capsule"]], ["Dragon Radar", O], ["Potara Earrings", O, ["Potara"]], ["Saiyan armor", O, ["Battle armor"]], ["Space pod", O, ["Saiyan pod", "Attack ball"]], ["Turtle shell", O, ["Roshi's shell"]], ["Time machine", O], ["Orange gi", O, ["Goku's gi"]], ["Weighted clothes", O]
    ],
    jjk: [
        ["Rika", C, ["Rika Orimoto"]], ["Mahoraga", C], ["Junpei", C, ["Junpei Yoshino"]], ["Mechamaru", C, ["Kokichi Muta"]], ["Yaga", C, ["Masamichi Yaga"]], ["Dagon", C], ["Divine Dogs", C, ["Divine Dog"]],
        ["Inverted Spear of Heaven", W, ["Inverted spear"]], ["Playful Cloud", W], ["Split Soul Katana", W], ["Slaughter Demon", W], ["Chain of a Thousand Miles", W, ["Thousand mile chain"]], ["Dragon-Bone", W, ["Maki's sword"]], ["Nanami's blade", W, ["Nanami's cleaver"]], ["Hammer and nails", W, ["Nobara's hammer", "Nails"]], ["Gavel", W, ["Higuruma's gavel"]],
        ["Sukuna's fingers", O, ["Sukuna's finger", "Finger"]], ["Gojo's blindfold", O, ["Blindfold"]], ["Prison Realm", O], ["Straw doll", O, ["Voodoo doll"]], ["Cursed doll", O, ["Yaga's doll"]], ["Gojo's sunglasses", O, ["Sunglasses"]], ["Jujutsu High uniform", O, ["School uniform"]]
    ],
    demonslayer: [
        ["Ubuyashiki", C, ["Kagaya Ubuyashiki", "Master of the Corps"]], ["Yushiro", C], ["Haganezuka", C, ["Hotaru Haganezuka"]], ["Kaigaku", C], ["Gyokko", C], ["Hantengu", C], ["Nakime", C], ["Kasugai Crow", C, ["Crow"]],
        ["Nichirin Sword", W, ["Nichirin blade", "Katana"]], ["Inosuke's swords", W, ["Serrated swords"]], ["Tengen's cleavers", W, ["Twin cleavers"]], ["Gyomei's flail", W, ["Axe and flail", "Flail"]], ["Whip sword", W, ["Mitsuri's sword"]], ["Needle sword", W, ["Shinobu's sword"]], ["Obi sash", W, ["Daki's obi", "Obi"]], ["Golden fans", W, ["Doma's fans"]], ["Kokushibo's sword", W],
        ["Nezuko's box", O, ["Box", "Wooden box"]], ["Hanafuda earrings", O, ["Earrings"]], ["Bamboo muzzle", O, ["Bamboo"]], ["Haori", O], ["Fox mask", O], ["Boar mask", O, ["Inosuke's mask"]], ["Hyottoko mask", O, ["Swordsmith mask"]], ["Wisteria flower", O, ["Wisteria"]], ["Biwa", O]
    ],
    bleach: [
        ["Kon", C], ["Nelliel", C, ["Nel"]], ["Nnoitra", C], ["Tosen", C, ["Kaname Tosen"]], ["Ikkaku", C, ["Ikkaku Madarame"]], ["Rangiku", C, ["Rangiku Matsumoto"]], ["Yachiru", C, ["Yachiru Kusajishi"]], ["Momo Hinamori", C, ["Hinamori"]],
        ["Zanpakuto", W], ["Zangetsu", W, ["Ichigo's sword"]], ["Senbonzakura", W], ["Benihime", W, ["Urahara's cane"]], ["Hyorinmaru", W], ["Zabimaru", W], ["Sode no Shirayuki", W], ["Kyoka Suigetsu", W], ["Shinso", W], ["Quincy bow", W, ["Bow"]], ["Nozarashi", W, ["Kenpachi's sword"]], ["Murcielago", W], ["Pantera", W],
        ["Hogyoku", O], ["Substitute badge", O, ["Substitute Soul Reaper badge", "Badge"]], ["Soul candy", O], ["Urahara's hat", O, ["Bucket hat"]], ["Hollow mask", O], ["Kon plushie", O, ["Lion plushie"]], ["Hell butterfly", O], ["Quincy cross", O, ["Quincy pendant"]]
    ],
    aot: [
        ["Marco Bott", C, ["Marco"]], ["Keith Shadis", C, ["Shadis"]], ["Onyankopon", C], ["Hannes", C], ["Carla Yeager", C, ["Carla"]], ["Rod Reiss", C],
        ["Thunder Spear", W, ["Thunder spears"]], ["ODM blades", W, ["Blades", "Swords"]], ["Rifle", W], ["Cannon", W], ["Shotgun", W, ["Kenny's shotgun"]], ["Anti-personnel ODM gear", W, ["Pistol ODM"]],
        ["ODM Gear", O, ["3D maneuver gear", "Omni-directional mobility gear"]], ["Basement key", O, ["Key", "Eren's key"]], ["Mikasa's scarf", O, ["Scarf", "Red scarf"]], ["Titan serum", O, ["Syringe", "Serum"]], ["Survey Corps cloak", O, ["Wings of Freedom", "Cloak"]], ["Flare gun", O, ["Smoke signal"]], ["Potato", O, ["Sasha's potato"]], ["Horse", O], ["Eldian armband", O, ["Armband"]]
    ],
    mha: [
        ["Mina Ashido", C, ["Mina", "Pinky"]], ["Hanta Sero", C, ["Sero"]], ["Minoru Mineta", C, ["Mineta"]], ["Present Mic", C], ["Nezu", C, ["Principal Nezu"]], ["Sir Nighteye", C, ["Nighteye"]], ["Fat Gum", C], ["Mr. Compress", C], ["Spinner", C],
        ["Grenade gauntlets", W, ["Gauntlets", "Bakugo's gauntlets"]], ["Capture scarf", W, ["Capture weapon", "Aizawa's scarf"]], ["Stain's knife", W, ["Knife"]], ["Blood syringe", W, ["Toga's syringe"]],
        ["Red sneakers", O, ["Deku's shoes", "Red shoes"]], ["Hero notebook", O, ["Deku's notebook", "Notebook"]], ["U.A. uniform", O, ["School uniform"]], ["Hero license", O], ["Plague mask", O, ["Overhaul's mask"]], ["Hand mask", O, ["Shigaraki's hands", "Father"]], ["All Might figure", O, ["Action figure"]], ["Hero costume", O], ["Support gloves", O, ["Deku's gloves"]]
    ],
    hxh: [
        ["Komugi", C], ["Wing", C], ["Zushi", C], ["Kalluto", C, ["Kalluto Zoldyck"]], ["Nobunaga", C, ["Nobunaga Hazama"]], ["Genthru", C], ["Razor", C],
        ["Yo-yos", W, ["Yoyo", "Killua's yo-yo"]], ["Kurapika's chains", W, ["Chains", "Chain"]], ["Needles", W, ["Illumi's needles"]], ["Playing cards", W, ["Hisoka's cards", "Cards"]], ["Umbrella sword", W, ["Feitan's umbrella"]], ["Blinky", W, ["Shizuku's vacuum", "Vacuum"]], ["Katana", W, ["Nobunaga's katana"]],
        ["Hunter License", O, ["License"]], ["Greed Island game", O, ["Game cartridge", "Joystation"]], ["Fishing rod", O, ["Gon's fishing rod"]], ["Skateboard", O, ["Killua's skateboard"]], ["Chocorobot", O, ["Chocolate robot"]], ["Gungi board", O, ["Gungi"]], ["Scarlet Eyes", O, ["Scarlet eye"]]
    ],
    deathnote: [
        ["Shinigami King", C],
        ["Gun", W, ["Pistol"]],
        ["Death Note", O, ["Notebook"]], ["Apple", O, ["Apples"]], ["Light's watch", O, ["Watch"]], ["Potato chips", O, ["Chips", "Crisps"]], ["Sugar cubes", O, ["Sugar"]], ["Handcuffs", O], ["Chess pieces", O, ["Chess"]], ["Chocolate bar", O, ["Mello's chocolate", "Chocolate"]], ["Dice", O, ["Near's dice"]], ["Laptop", O, ["Computer"]], ["Strawberry cake", O, ["Cake"]], ["Lollipop", O], ["Security camera", O, ["Camera"]], ["Pen", O]
    ],
    chainsaw: [
        ["Nayuta", C], ["Asa Mitaka", C, ["Asa"]], ["War Devil", C, ["Yoru"]], ["Meowy", C, ["Power's cat"]], ["Gun Devil", C], ["Leech Devil", C],
        ["Chainsaw", W], ["Aki's katana", W, ["Katana", "Sword"]], ["Curse nail", W, ["Nail"]], ["Shotgun", W],
        ["Starter cord", O, ["Pull cord", "Chainsaw cord"]], ["Coffee", O], ["Leash", O, ["Collar"]], ["Eyepatch", O, ["Himeno's eyepatch"]], ["Cigarette", O], ["Jam toast", O, ["Bread and jam", "Toast"]], ["Bathtub", O, ["Bath"]], ["Ramen", O]
    ],
    blackclover: [
        ["Secre", C, ["Nero"]], ["Gordon", C, ["Gordon Agrippa"]], ["Grey", C], ["Klaus", C, ["Klaus Lunettes"]], ["Leopold", C, ["Leopold Vermillion", "Leo"]], ["Lumiere", C, ["Lumiere Silvamillion"]],
        ["Demon Slayer Sword", W, ["Asta's sword"]], ["Demon Dweller Sword", W], ["Demon Destroyer Sword", W], ["Yami's katana", W, ["Katana"]], ["Wand", W, ["Magic wand"]],
        ["Grimoire", O, ["Spellbook"]], ["Five-Leaf Grimoire", O, ["Five Leaf Clover", "Five-leaf clover"]], ["Black Bulls robe", O, ["Robe", "Black Bulls cloak"]], ["Broom", O], ["Mirror", O], ["Four-leaf clover", O, ["Clover"]], ["Asta's headband", O, ["Headband"]], ["Wizard King's robe", O]
    ],
    jojo: [
        ["Speedwagon", C, ["Robert Speedwagon"]], ["Trish", C, ["Trish Una"]], ["Vanilla Ice", C], ["Fugo", C, ["Pannacotta Fugo"]], ["Esidisi", C],
        ["Hermit Purple", C], ["Magician's Red", C], ["Silver Chariot", C], ["The Hand", C], ["Echoes", C], ["Heaven's Door", C], ["Stone Free", C], ["Purple Haze", C], ["Coco Jumbo", C, ["Mr President", "Turtle"]],
        ["Clackers", W, ["Clacker volley"]], ["Tommy gun", W], ["Dio's knives", W, ["Knives"]], ["Luck and Pluck", W, ["Jonathan's sword"]],
        ["Stone Mask", O], ["Stand Arrow", O, ["Arrow"]], ["Road Roller", O, ["Steamroller"]], ["Steel Balls", O, ["Steel ball"]], ["DIO's diary", O, ["Diary"]], ["Saint's Corpse", O, ["Corpse"]], ["Ladybug brooch", O, ["Ladybug"]], ["Jotaro's hat", O, ["Hat"]], ["Tarot cards", O, ["Tarot"]]
    ],
    rezero: [
        ["Patrasche", C], ["Petra", C, ["Petra Leyte"]], ["Frederica", C, ["Frederica Baumann"]], ["Meili", C, ["Meili Portroute"]], ["Witch of Envy", C],
        ["Morning star", W, ["Rem's flail", "Flail"]], ["Dragon Sword Reid", W, ["Reinhard's sword"]], ["Kukri", W, ["Elsa's knife"]], ["Whip", W, ["Subaru's whip"]], ["Shields", W, ["Garfiel's shields"]],
        ["Gospel", O, ["Gospel book"]], ["Maid uniform", O, ["Maid outfit"]], ["Dragon carriage", O, ["Carriage"]], ["Royal insignia", O, ["Insignia", "Jewel insignia"]], ["Flip phone", O, ["Phone", "Subaru's phone"]], ["Tracksuit", O, ["Subaru's tracksuit"]], ["Mayonnaise", O, ["Mayo"]], ["Ram's horn", O, ["Horn"]]
    ],
    fireforce: [
        ["Lisa", C, ["Lisa Isaribi"]], ["Juggernaut", C, ["Takeru Noto"]], ["Infernal", C],
        ["Excalibur", W, ["Arthur's sword", "Plasma sword"]], ["Matoi", W, ["Benimaru's pinwheel", "Pinwheel"]], ["Hinawa's gun", W, ["Gun", "Rifle"]], ["Fire axe", W, ["Axe"]],
        ["Fire hose", O, ["Hose"]], ["Fire engine", O, ["Fire truck"]], ["Fire helmet", O, ["Helmet", "Firefighter helmet"]], ["Oxygen tank", O, ["Air tank"]], ["Rosary", O, ["Prayer beads"]], ["Cigar", O], ["Fire extinguisher", O, ["Extinguisher"]], ["Lighter", O, ["Zippo"]]
    ],
    frieren: [
        ["Mimic", C, ["Treasure mimic"]],
        ["Hero's sword", W, ["Himmel's sword", "Sword"]], ["Stark's axe", W, ["Axe"]], ["Staff", W, ["Mage's staff", "Frieren's staff"]], ["Bow", W],
        ["Grimoire", O, ["Spellbook"]], ["Mirror lotus ring", O, ["Ring"]], ["Blue moonweed", O, ["Moonweed", "Flower"]], ["Himmel's statue", O, ["Statue"]], ["Treasure chest", O, ["Chest"]], ["Mage badge", O, ["First-class mage badge", "Badge"]], ["Scales", O, ["Scale of Obedience"]], ["Hamburger steak", O, ["Hamburger"]], ["Grape", O, ["Grapes"]]
    ],
    gachiakuta: [
        ["Vital Instrument", O, ["Jinki"]], ["Gloves", W, ["Rudo's gloves"]], ["Umbrella", W, ["Enjin's umbrella"]], ["Goggles", O], ["Trash bag", O, ["Garbage bag"]], ["Scrap metal", O, ["Scrap"]], ["Garbage", O, ["Trash", "Rubbish"]], ["Gas mask", O, ["Mask"]], ["Sneakers", O, ["Shoes"]], ["Trash beast", C, ["Trash monster"]]
    ],
    windbreaker: [
        ["Wind chime", O, ["Furin"]], ["Headphones", O], ["Teacup", O, ["Tea"]], ["Lollipop", O], ["Hoodie", O, ["Hood"]], ["School uniform", O, ["Uniform"]], ["Omurice", O, ["Omelette rice"]], ["Bandage", O, ["Bandages"]], ["Earring", O]
    ]
};

// answers from the Anime Feud boards that aren't things you can draw
export const BLOCK = [
    "Their name", "Their face", "Cause of death", "Time of death", "40 seconds", "Hybrids", "Fiends", "Visored", "Arrancar", "Spotting a mimic"
];
