/* =====================================================================
   ANIME SKETCH word library.
   Most words come from data Anime Arcade already has (see buildWords in engine.js):
     - characters: the Anime Draft roster (js/draft/data.js) + the fan nicknames (js/feud/nicknames.js)
     - attacks, powers, places, items, groups: the Anime Feud answer boards (js/feud/packs), with their aliases
   This file only adds drawable terms those don't cover, and blocks answers that can't really be drawn.
   Row: [word, category, [other accepted spellings]]
   ===================================================================== */
export const EXTRAS = {
    onepiece: [["Haki", "Term"], ["Jolly Roger", "Item"], ["Going Merry", "Item"], ["Log Pose", "Item"], ["Wanted Poster", "Item"], ["Sea King", "Creature"], ["Gear Fourth", "Power", ["Gear 4"]], ["Bounty", "Term"], ["Vivre Card", "Item"], ["Laboon", "Creature"]],
    naruto: [["Sharingan", "Power"], ["Rinnegan", "Power"], ["Byakugan", "Power"], ["Chakra", "Term"], ["Hokage", "Term"], ["Gamabunta", "Creature"], ["Kage Bunshin", "Attack"], ["Hand signs", "Term", ["Hand seals"]], ["Ninja headband", "Item"]],
    dragonball: [["Shenron", "Creature", ["Shenlong"]], ["Saiyan tail", "Item"], ["Fusion Dance", "Power"], ["Potara Earrings", "Item", ["Potara"]], ["Gravity chamber", "Place"], ["Dragon Radar", "Item"], ["Halo", "Item"], ["Ki blast", "Attack"]],
    jjk: [["Cursed Energy", "Term"], ["Cursed Spirit", "Creature", ["Curse"]], ["Divine Dogs", "Creature"], ["Rika", "Creature"], ["Blindfold", "Item"], ["Six Eyes", "Power"], ["Straw doll", "Item"]],
    demonslayer: [["Kasugai Crow", "Creature", ["Crow"]], ["Wisteria", "Item"], ["Final Selection", "Term"], ["Demon Slayer Mark", "Term"], ["Upper Moon", "Term"], ["Biwa", "Item"]],
    bleach: [["Hollow mask", "Item"], ["Hollow", "Creature"], ["Soul Reaper", "Term", ["Shinigami"]], ["Shikai", "Power"], ["Garganta", "Place"], ["Kido", "Power"]],
    aot: [["Titan", "Creature"], ["The Walls", "Place"], ["Scout Regiment badge", "Item", ["Wings of Freedom"]], ["Titan nape", "Term", ["Nape"]], ["Smoke signal", "Item", ["Flare gun"]], ["Cannon", "Item"]],
    mha: [["Quirk", "Term"], ["Hero costume", "Item"], ["Pro Hero", "Term"], ["Hero license", "Item"], ["Full Cowl", "Power"], ["Explosion", "Power"], ["Ice wall", "Attack"], ["Nomu", "Creature"], ["Sports Festival", "Term"]],
    hxh: [["Nen", "Term"], ["Hunter Exam", "Term"], ["Skateboard", "Item"], ["Playing cards", "Item"], ["Killua's yo-yo", "Item"], ["Chimera Ant", "Creature"]],
    deathnote: [["Notebook", "Item"], ["Shinigami Eyes", "Power"], ["Sugar cubes", "Item"], ["Kira", "Term"], ["Monitors", "Item"], ["Rook chess piece", "Item", ["Chess"]], ["Handcuffs", "Item"]],
    chainsaw: [["Chainsaw", "Item"], ["Starter cord", "Item", ["Pull cord"]], ["Devil Hunter", "Term"], ["Contract", "Term"], ["Coffee", "Item"], ["Zombie", "Creature"], ["Leash", "Item"]],
    blackclover: [["Five-Leaf Grimoire", "Item", ["Five Leaf Clover"]], ["Clover", "Item"], ["Broom", "Item"], ["Wizard King", "Term"], ["Muscles", "Term"]],
    jojo: [["Stand", "Term"], ["Menacing", "Term", ["Gogogo"]], ["JoJo pose", "Term"], ["Arrow", "Item"], ["Hamon breathing", "Power"], ["Hat", "Item"], ["Ladybug brooch", "Item"]],
    rezero: [["Puck", "Creature"], ["Maid uniform", "Item"], ["Morning star", "Item"], ["Gospel", "Item"], ["Dragon carriage", "Item"], ["Mabeast", "Creature"]],
    fireforce: [["Fire Soldier", "Term"], ["Infernal", "Creature"], ["Pyrokinesis", "Power"], ["Fire hose", "Item"], ["Fire engine", "Item", ["Fire truck"]], ["Prayer", "Term"], ["Adolla Link", "Term"], ["Smile", "Term"]],
    frieren: [["Grimoire", "Item"], ["Mimic", "Creature"], ["Ring", "Item"], ["Mage exam", "Term"], ["Flower field", "Place"], ["Statue", "Item"], ["Demon", "Creature"], ["Elf ears", "Term"]],
    gachiakuta: [["Vital Instrument", "Item", ["Jinki"]], ["Gloves", "Item"], ["Trash", "Item", ["Garbage"]], ["The Pit", "Place", ["Abyss"]], ["Trash beast", "Creature"], ["Umbrella", "Item"], ["Sky world", "Place"], ["Cleaner", "Term"], ["Goggles", "Item"], ["Scrap", "Item"]],
    windbreaker: [["Furin High", "Place"], ["Bofurin", "Group"], ["Wind chime", "Item", ["Furin"]], ["Rooftop", "Place"], ["Headphones", "Item"], ["Tea", "Item"], ["Delinquent", "Term"], ["Shopping street", "Place"], ["Lollipop", "Item"], ["Hood", "Item"]]
};

// answers from the Anime Feud boards that aren't things you can draw
export const BLOCK = [
    "Spotting a mimic", "Return by Death", "Dead Calm", "Resonance", "Erasure", "Decay", "Coordinate", "Hardening", "Seven Sages of Destruction",
    "Jujutsu higher-ups", "Death Paintings", "Defensive Magic", "Scale of Obedience", "Aureole", "Ende", "Weise", "Zodiacs", "NGL", "Givers",
    "Raiders", "Cleaners", "Requiem", "Bites the Dust", "Their name", "Their face", "Cause of death", "Time of death", "40 seconds", "Room",
    "Emission", "Conjuration", "Manipulation", "Specialization", "Transmutation", "Enhancement", "Hybrids", "Fiends", "Visored", "Arrancar",
    "Disaster Curses", "Dark Triad", "Sin Archbishops", "Emilia Camp", "Iron Fang", "Shishitoren", "Noroshi", "Makochi", "Pottos",
    "Mana Zone", "Sylph", "Murak", "Invisible Providence", "Al Goa", "Shamak", "El Huma", "SPK", "Mafia", "Task Force", "CP9"
];
