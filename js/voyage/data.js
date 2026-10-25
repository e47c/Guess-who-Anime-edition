/* =====================================================================
   GRAND VOYAGE · CONTENT
   Everything the voyage can contain: crew roles, relics, hidden objectives,
   map nodes, story events and the enemies of every series. Pure data, no DOM.
   Effects are small specs read by logic.js, so a new event is a table entry.
   ===================================================================== */

export const START_HP = 12;
export const MAX_ITEMS = 6;

/* ---------- crew roles (picked at the muster) ---------- */
export const ROLES = {
    blade:    { n: "Swordsman", k: "剣", c: "#ff5a5a", d: "+2 damage on every attack.", tip: "Hits hardest." },
    shield:   { n: "Guardian",  k: "盾", c: "#6fb7ff", d: "Your guard shields the whole crew for 3 instead of 1. +3 max HP.", tip: "Keeps the crew alive." },
    medic:    { n: "Medic",     k: "医", c: "#5ee6a8", d: "Once per leg, heal a crewmate for 4 or revive them. Shrines heal you +3.", tip: "Brings people back." },
    nav:      { n: "Navigator", k: "航", c: "#ffd166", d: "Your route vote counts twice and you can scout what waits on every node.", tip: "Sees the future." },
    rogue:    { n: "Rogue",     k: "盗", c: "#c77dff", d: "Two steals per voyage instead of one, and you are rarely caught.", tip: "Trust no one." },
    merchant: { n: "Merchant",  k: "商", c: "#f4a259", d: "Start with 6 gold. +1 gold from every loot. 30% off at markets.", tip: "Money talks." }
};
export const ROLE_KEYS = Object.keys(ROLES);

/* ---------- relics ----------
   v = renown at the end · p = market price · c = consumable (u: battle | map | both)
   atk / grd = combat bonuses while held                                                  */
export const ITEMS = {
    blade:    { n: "Spirit Blade",   k: "刀", v: 2, p: 6, atk: 2, d: "+2 damage while you hold it." },
    gauntlet: { n: "Iron Gauntlet",  k: "拳", v: 2, p: 5, atk: 1, grd: 1, d: "+1 damage, and your guard shields 1 more." },
    charm:    { n: "Ward Charm",     k: "守", v: 1, p: 4, grd: 2, d: "Your guard shields 2 more." },
    mask:     { n: "Oni Mask",       k: "鬼", v: 2, p: 5, atk: 3, d: "+3 damage, but attacking costs you 1 HP." },
    potion:   { n: "Healing Bean",   k: "豆", v: 1, p: 3, c: "map", d: "Heal 6 HP, or revive a downed crewmate." },
    bomb:     { n: "Kunai Bomb",     k: "爆", v: 1, p: 3, c: "battle", d: "In battle: +7 damage this round." },
    smoke:    { n: "Smoke Bomb",     k: "煙", v: 1, p: 2, c: "battle", d: "In battle: take no damage this round." },
    spyglass: { n: "Spyglass",       k: "鏡", v: 1, p: 4, c: "map", d: "Secretly read one crewmate's hidden objective." },
    elixir:   { n: "Elixir of Life", k: "命", v: 1, p: 4, c: "map", d: "+3 max HP and a full heal." },
    compass:  { n: "Log Compass",    k: "羅", v: 2, p: 4, d: "Your route vote counts one extra time." },
    lockbox:  { n: "Iron Lockbox",   k: "錠", v: 1, p: 4, d: "Nobody can steal from you." },
    coin:     { n: "Lucky Coin",     k: "運", v: 1, p: 4, d: "Your steals are never exposed, and gambles favour you." },
    map:      { n: "Treasure Map",   k: "図", v: 2, p: 4, d: "+1 gold from every loot." },
    pearl:    { n: "Dragon Pearl",   k: "珠", v: 3, p: 5, d: "A treasure. Worth 3 renown." },
    idol:     { n: "Golden Idol",    k: "金", v: 4, p: 7, d: "A treasure. Worth 4 renown." }
};
export const ITEM_KEYS = Object.keys(ITEMS);
// loot tables (weights)
export const LOOT = { common: { potion: 4, bomb: 3, smoke: 3, charm: 2, gauntlet: 2, coin: 1, lockbox: 1, spyglass: 2, map: 1 },
    rare: { blade: 3, mask: 2, compass: 2, pearl: 3, elixir: 2, spyglass: 2, map: 2, idol: 1 },
    shop: { potion: 3, bomb: 2, smoke: 2, charm: 2, gauntlet: 2, blade: 2, spyglass: 2, elixir: 2, compass: 1, lockbox: 1, coin: 1, map: 1, pearl: 1, mask: 1 } };

/* ---------- hidden objectives ----------
   Each player gets one at the start. Only they see it, unless someone spies.
   g = renown when completed. "traitor" exists in 3+ player crews, and not always.   */
export const OBJECTIVES = {
    hoard:     { n: "Dragon's Hoard", k: "金", g: 6, d: "End the voyage with 14 or more gold." },
    collector: { n: "Collector",      k: "蒐", g: 6, d: "End the voyage holding 4 or more relics." },
    slayer:    { n: "Kingslayer",     k: "斬", g: 7, d: "Land the killing blow on the final boss." },
    vanguard:  { n: "Vanguard",       k: "先", g: 6, d: "Deal the most total damage of the crew." },
    guardian:  { n: "Living Wall",    k: "壁", g: 6, d: "Guard in at least 5 battle rounds." },
    pacifist:  { n: "Pacifist",       k: "和", g: 7, d: "Never choose Attack. Guarding is fine." },
    thief:     { n: "Shadow Hand",    k: "影", g: 6, d: "Pull off 2 successful steals." },
    pathfinder:{ n: "Pathfinder",     k: "道", g: 6, d: "Your route vote wins on at least {nav} legs." },
    heart:     { n: "Big Heart",      k: "心", g: 6, d: "Give away 6 gold or 2 relics to crewmates in total." },
    survivor:  { n: "Unbroken",       k: "生", g: 6, d: "Never get downed, and finish with at least half your HP." },
    rival:     { n: "Rivalry",        k: "敵", g: 7, d: "Finish with more renown than {rival}." },
    traitor:   { n: "Mutineer",       k: "叛", g: 12, d: "Secretly sabotage. Win big if the boss survives or half the crew is downed at the end. Don't get caught at the campfire.", evil: true }
};

/* ---------- map ---------- */
export const NODE = {
    start:  { n: "Harbor",        k: "港", c: "#9ad1ff" },
    battle: { n: "Battle",        k: "戦", c: "#ff5a5a", d: "An enemy blocks the route. Fight together, split the spoils." },
    elite:  { n: "Elite",         k: "鬼", c: "#ff2e63", d: "A dangerous foe with rare loot." },
    event:  { n: "Mystery",       k: "謎", c: "#b388ff", d: "Something strange on the horizon." },
    chest:  { n: "Treasure",      k: "宝", c: "#ffd166", d: "A chest for the whole crew. Share it, or grab it all." },
    market: { n: "Market",        k: "市", c: "#5ee6a8", d: "Spend gold on relics." },
    shrine: { n: "Shrine",        k: "社", c: "#7ff6e6", d: "Rest to heal, or pray for a vision of a crewmate's secret." },
    boss:   { n: "Final Boss",    k: "王", c: "#ff9f1c", d: "The guardian of the Legendary Treasure." }
};
export const NODE_WEIGHTS = { battle: 30, event: 26, chest: 12, market: 11, shrine: 9, elite: 9 };
export const REGIONS = ["Mistveil Shallows", "Ember Reef", "Moonlit Strait", "Thunder Gyre", "Sakura Archipelago", "Bonefield Sea", "Gilded Current", "Abyssal Rift", "Skyward Falls", "Starfall Lagoon"];
export const LENGTHS = { 4: "Short", 6: "Standard", 8: "Epic" };

/* ---------- enemies per series ----------
   m = minor foes, e = elites, b = bosses. A series without a table uses "any". */
export const ENEMIES = {
    any: { m: [["Rogue Ninja", "忍"], ["Sea Serpent", "蛇"], ["Masked Bandit", "賊"], ["Cursed Puppet", "傀"], ["Storm Wraith", "嵐"]], e: [["Warlord of the Reef", "将"], ["The Twin Blades", "双"]], b: [["The Abyssal Sovereign", "淵"]] },
    onepiece: { m: [["Marine Captain", "海"], ["Sea King", "王"], ["Bounty Hunter", "賞"]], e: [["Vice Admiral", "将"], ["Pirate Warlord", "武"]], b: [["Fleet Admiral", "帥"], ["Emperor of the Sea", "皇"]] },
    naruto: { m: [["Rogue Shinobi", "忍"], ["Sound Ninja", "音"], ["Summoned Toad", "蛙"]], e: [["Akatsuki Member", "暁"], ["Puppet Master", "傀"]], b: [["Ten-Tails Vessel", "尾"]] },
    dragonball: { m: [["Saibaman", "栽"], ["Frieza Soldier", "兵"], ["Android", "人"]], e: [["Ginyu Force", "隊"], ["Majin Warrior", "魔"]], b: [["Galactic Tyrant", "帝"], ["God of Destruction", "破"]] },
    jjk: { m: [["Cursed Spirit", "呪"], ["Grasshopper Curse", "蝗"], ["Curse User", "術"]], e: [["Special Grade Curse", "特"], ["Disaster Curse", "災"]], b: [["King of Curses", "宿"]] },
    demonslayer: { m: [["Lesser Demon", "鬼"], ["Hand Demon", "手"], ["Drum Demon", "鼓"]], e: [["Lower Moon", "下"], ["Upper Moon", "上"]], b: [["Demon Progenitor", "祖"]] },
    bleach: { m: [["Hollow", "虚"], ["Menos", "大"], ["Rogue Soul Reaper", "死"]], e: [["Arrancar", "破"], ["Espada", "刃"]], b: [["The Hogyoku Traitor", "崩"]] },
    hxh: { m: [["Chimera Ant Soldier", "蟻"], ["Phantom Troupe Grunt", "蜘"]], e: [["Royal Guard", "衛"]], b: [["Chimera Ant King", "王"]] },
    chainsaw: { m: [["Zombie Devil", "屍"], ["Bat Devil", "蝠"]], e: [["Gun Devil Fragment", "銃"]], b: [["Control Devil", "支"]] },
    blackclover: { m: [["Diamond Mage", "金"], ["Eye of the Midnight Sun", "陽"]], e: [["Dark Triad Devil Host", "悪"]], b: [["Devil King", "魔"]] },
    jojo: { m: [["Vampire Zombie", "吸"], ["Stand User Hitman", "像"]], e: [["Pillar Man", "柱"]], b: [["The Vampire Lord", "世"]] },
    frieren: { m: [["Mimic Chest", "擬"], ["Demon Soldier", "魔"]], e: [["Great Demon", "大"]], b: [["Demon King's Shadow", "王"]] },
    fireforce: { m: [["Infernal", "焔"], ["White-Clad Zealot", "白"]], e: [["Pillar Pyrokinetic", "柱"]], b: [["The Evangelist", "伝"]] },
    gachiakuta: { m: [["Trash Beast", "塵"], ["Raider Scrapper", "掠"]], e: [["Vandal Leader", "賊"]], b: [["Abyss Lord", "淵"]] },
    windbreaker: { m: [["Street Thug", "喧"], ["Shishitoren Fighter", "獅"]], e: [["Rival Gang Boss", "頭"]], b: [["King of the Streets", "王"]] },
    deathnote: { m: [["Shinigami Familiar", "死"]], e: [["Rogue Shinigami", "神"]], b: [["Shinigami King", "王"]] }
};

/* ---------- story events ----------
   mode "crew": everyone votes, the majority decides for all (the helm breaks ties).
   mode "solo": each player decides for themselves.
   An effect: { g gold, hp, mx max hp, rn renown, pow permanent damage, st steals, it item key | "common" | "rare",
                intel 1 = read a random crewmate's objective, chance + fail = gamble, who = "all" | "helm" | "rand" }  */
export const EVENTS = [
    { id: "castaway", k: "漂", mode: "crew", t: "Drifting Castaway", x: "A half-drowned stranger clings to a broken mast and begs to come aboard.",
        o: [{ l: "Pull them aboard", d: "Kindness has a price… or a reward.", fx: { chance: .6, sub: { who: "helm", it: "common", rn: 1 }, fail: { g: -2, msg: "It was a spy! Everyone loses 2 gold." } }, msg: "The castaway repays the helm with a gift." },
            { l: "Sail past", d: "Not our problem.", fx: {} }] },
    { id: "idol", k: "像", mode: "solo", t: "Cursed Shrine", x: "A golden idol sits on a mossy altar. Something hums beneath it.",
        o: [{ l: "Take the idol", d: "55%: a Golden Idol. Otherwise: lose 4 HP.", fx: { chance: .55, it: "idol", fail: { hp: -4 } } },
            { l: "Leave an offering", d: "Pay 2 gold, gain 1 renown.", fx: { g: -2, rn: 1, need: 2 } },
            { l: "Walk away", d: "Nothing happens.", fx: {} }] },
    { id: "den", k: "賭", mode: "solo", t: "Gambling Den", x: "Dice clatter in a smoky tavern. The house always wins… usually.",
        o: [{ l: "Bet 3 gold", d: "50%: win 7. Otherwise lose the bet.", fx: { chance: .5, g: 7, need: 3, fail: { g: -3 } } },
            { l: "Cheat", d: "65%: +5 gold. Caught: lose 3 HP.", fx: { chance: .65, g: 5, fail: { hp: -3 } } },
            { l: "Just watch", d: "Nothing happens.", fx: {} }] },
    { id: "storm", k: "嵐", mode: "crew", t: "Storm Front", x: "Black clouds swallow the horizon. Lightning splits the sea.",
        o: [{ l: "Sail through it", d: "Everyone loses 2 HP, but finds 2 gold in the wreckage.", fx: { hp: -2, g: 2 } },
            { l: "Take the long way", d: "Everyone pays 2 gold for supplies.", fx: { g: -2 } }] },
    { id: "fruit", k: "実", mode: "solo", t: "Mysterious Fruit", x: "A swirling fruit grows on a lone tree. Legends say it grants power… at a cost.",
        o: [{ l: "Eat it", d: "50%: +2 damage forever. Otherwise: lose 5 HP.", fx: { chance: .5, pow: 2, fail: { hp: -5 } } },
            { l: "Sell it", d: "+4 gold.", fx: { g: 4 } }] },
    { id: "rivals", k: "敵", mode: "crew", t: "Rival Crew", x: "Another ship pulls alongside, cannons loaded, captain grinning.",
        o: [{ l: "Parley", d: "Everyone +1 gold, and the helm learns a secret.", fx: { g: 1, sub: { who: "helm", intel: 1 } } },
            { l: "Raid them", d: "Everyone loses 3 HP and gains 5 gold.", fx: { hp: -3, g: 5 } },
            { l: "Raise the white flag", d: "Everyone loses 1 gold.", fx: { g: -1 } }] },
    { id: "sensei", k: "師", mode: "solo", t: "Old Sensei", x: "A hermit on a cliff offers lessons to anyone who climbs.",
        o: [{ l: "Train (2 gold)", d: "+1 damage forever.", fx: { g: -2, pow: 1, need: 2 } },
            { l: "Ask for wisdom", d: "Learn a random crewmate's hidden objective.", fx: { intel: 1 } },
            { l: "Rest at the hut", d: "+3 HP.", fx: { hp: 3 } }] },
    { id: "vault", k: "庫", mode: "crew", t: "Sunken Vault", x: "Far below the waves, a vault door glimmers in the dark.",
        o: [{ l: "Dive for it", d: "Everyone loses 2 HP. One random diver finds 2 relics.", fx: { hp: -2, sub: { who: "rand", it: "rare", it2: "common" } } },
            { l: "Mark it and move on", d: "The helm keeps the chart: +2 renown.", fx: { sub: { who: "helm", rn: 2 } } }] },
    { id: "ghost", k: "幽", mode: "crew", t: "Ghost Ship", x: "A ship of rotting wood drifts by. Its lanterns still burn.",
        o: [{ l: "Board it", d: "50%: everyone +4 gold. Otherwise everyone loses 3 HP.", fx: { chance: .5, g: 4, fail: { hp: -3 } } },
            { l: "Burn it", d: "Everyone +1 renown.", fx: { rn: 1 } },
            { l: "Flee", d: "Nothing happens.", fx: {} }] },
    { id: "brawl", k: "喧", mode: "solo", t: "Tavern Brawl", x: "Someone threw a chair. Now everyone is throwing chairs.",
        o: [{ l: "Join in", d: "Lose 2 HP, take 3 gold off the floor.", fx: { hp: -2, g: 3 } },
            { l: "Pick pockets", d: "Gain one extra steal.", fx: { st: 1 } },
            { l: "Slip out", d: "Nothing happens.", fx: {} }] },
    { id: "child", k: "子", mode: "crew", t: "Lost Child", x: "A crying child waves from a rowboat, far from any island.",
        o: [{ l: "Take them home", d: "Everyone pays 1 gold, everyone +2 renown.", fx: { g: -1, rn: 2 } },
            { l: "Point the way", d: "Nothing happens.", fx: {} }] },
    { id: "mirror", k: "鏡", mode: "solo", t: "Whispering Mirror", x: "A mirror in the sand shows faces that aren't yours.",
        o: [{ l: "Gaze into it", d: "Learn a crewmate's objective, lose 2 HP.", fx: { intel: 1, hp: -2 } },
            { l: "Shatter it", d: "+1 renown.", fx: { rn: 1 } }] },
    { id: "forge", k: "鍛", mode: "solo", t: "Volcano Forge", x: "A one-eyed smith offers to temper your gear in lava.",
        o: [{ l: "Buy a blade (5 gold)", d: "Get a Spirit Blade.", fx: { g: -5, it: "blade", need: 5 } },
            { l: "Temper yourself", d: "+3 max HP.", fx: { mx: 3, hp: 3 } },
            { l: "Leave", d: "Nothing happens.", fx: {} }] },
    { id: "siren", k: "歌", mode: "crew", t: "Siren Song", x: "A beautiful song drifts over the water. The helm's hands start to turn the wheel…",
        o: [{ l: "Follow the song", d: "60%: a hidden cove, everyone +3 gold. Otherwise everyone loses 4 HP.", fx: { chance: .6, g: 3, fail: { hp: -4 } } },
            { l: "Plug your ears", d: "Everyone +1 HP.", fx: { hp: 1 } }] }
];

/* ---------- story lines for the log ---------- */
export const FLAVOR = {
    sail: ["The sails fill. {crew} set course for {node}.", "Wind at their backs, the crew heads for {node}.", "{helm} spins the wheel toward {node}."],
    win: ["{enemy} crashes into the sea!", "{enemy} is defeated!", "{enemy} falls. The crew roars."],
    flee: ["{enemy} retreats into the fog.", "{enemy} slips away, wounded."],
    down: ["{p} is down!", "{p} collapses on the deck!"]
};
