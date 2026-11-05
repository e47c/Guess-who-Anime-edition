// Anime Feud answer validation: legitimate spellings must be accepted, wrong or vague ones must not.
// Run: node tools/feud-validate.mjs   (exit code 1 on any failure)
import { buildLibrary, boardFor, matchText, fairAnswer } from "../js/feud/engine.js";
import { PACKS } from "../js/feud/packs/index.js";

const lib = buildLibrary(PACKS);
let ok = 0, bad = 0;
const fail = m => { bad++; console.log("  ✘", m); };
const board = (id, s) => { const B = lib.boards[id]; if (!B) throw new Error("no board " + id); return boardFor(B, [s]) || []; };
// hit: the typed text reveals the answer whose shown text is `want`
function hit(id, s, inputs, want) {
    const b = board(id, s);
    if (!b.some(a => a.t === want)) return fail(`${id}/${s}: "${want}" is not on the board`);
    inputs.forEach(x => { const r = matchText(b, x); if (r.k === "hit" && b[r.i].t === want) ok++; else fail(`${id}/${s}: "${x}" should find ${want} (got ${r.k}${r.k === "hit" ? " " + b[r.i].t : ""})`); });
}
const expect = (id, s, inputs, k) => { const b = board(id, s); inputs.forEach(x => { const r = matchText(b, x); if (r.k === k) ok++; else fail(`${id}/${s}: "${x}" should be ${k} (got ${r.k}${r.k === "hit" ? " " + b[r.i].t : ""})`); }); };
const fair = (id, s, x, want) => { const b = board(id, s), a = fairAnswer(lib.boards[id], [s], x, b); if (want ? a && a.t === want : !a) ok++; else fail(`${id}/${s}: "${x}" fair answer should be ${want || "none"} (got ${a ? a.t : "none"})`); };

console.log("• full names, first / last names, nicknames, titles");
hit("c-villain", "onepiece", ["Doflamingo", "Donquixote Doflamingo", "doffy", "Joker", "DOFLAMINGO!"], "Donquixote Doflamingo");
hit("c-villain", "onepiece", ["Blackbeard", "Kurohige", "Teach", "Marshall D Teach", "Marshall D. Teach"], "Marshall D. Teach");
hit("c-villain", "onepiece", ["Kaido", "Kaidou", "Strongest Creature"], "Kaido");
hit("c-villain", "onepiece", ["Akainu", "Sakazuki"], "Sakazuki");
hit("op-admirals", "onepiece", ["Kizaru", "Borsalino"], "Borsalino");
hit("op-admirals", "onepiece", ["Aokiji", "Kuzan"], "Kuzan");
hit("op-admirals", "onepiece", ["Fujitora", "Issho", "Isshou"], "Isshou");
hit("op-admirals", "onepiece", ["Ryokugyu", "Green Bull", "Aramaki"], "Aramaki");
hit("op-emperors", "onepiece", ["Big Mom", "Linlin", "Charlotte Linlin"], "Charlotte Linlin");
hit("op-emperors", "onepiece", ["Whitebeard", "Shirohige", "Edward Newgate", "Newgate"], "Edward Newgate");
hit("op-straw-hats", "onepiece", ["Luffy", "Monkey D Luffy", "Mugiwara", "Luffy Monkey"], "Monkey D. Luffy");
hit("op-straw-hats", "onepiece", ["Sanji", "Black Leg", "Sanjy"], "Sanji");
hit("c-villain", "naruto", ["Madara", "Madara Uchiha", "Uchiha Madara"], "Madara Uchiha");
hit("c-villain", "naruto", ["Pain", "Nagato", "Pein"], "Pain");
hit("c-villain", "naruto", ["Obito", "Tobi"], "Obito Uchiha");
hit("na-hokage", "naruto", ["Fourth Hokage", "Yellow Flash", "Minato"], "Minato Namikaze");
hit("db-saiyans", "dragonball", ["Goku", "Son Goku", "Kakarot", "Gokuu"], "Goku");
hit("c-villain", "dragonball", ["Freeza", "Frieza"], "Frieza");
hit("c-villain", "jjk", ["Sukuna", "Ryomen Sukuna", "Ryoumen Sukuna", "King of Curses"], "Ryomen Sukuna");
hit("c-villain", "jjk", ["Geto", "Suguru Geto", "Getou Suguru"], "Suguru Geto");
hit("jjk-special-grade", "jjk", ["Gojo", "Gojou Satoru", "Satoru Gojo"], "Satoru Gojo");
hit("ds-hashira", "demonslayer", ["Rengoku", "Flame Hashira", "Kyoujurou Rengoku"], "Kyojuro Rengoku");
hit("ds-hashira", "demonslayer", ["Giyu", "Giyuu", "Water Hashira", "Tomioka"], "Giyu Tomioka");
hit("ds-upper-moons", "demonslayer", ["Doma", "Douma", "Upper Moon Two"], "Doma");
hit("bl-captains", "bleach", ["Byakuya", "Kuchiki Byakuya"], "Byakuya Kuchiki");
hit("c-strongest", "bleach", ["Yamamoto", "Head Captain", "Yama-jii"], "Genryusai Yamamoto");
hit("aot-104th", "aot", ["Historia", "Krista", "Christa", "Krista Lenz"], "Historia Reiss");
hit("aot-104th", "aot", ["Eren", "Eren Jaeger", "Eren Yeager"], "Eren Yeager");
hit("mha-class-a", "mha", ["Deku", "Izuku", "Midoriya"], "Izuku Midoriya");
hit("mha-class-a", "mha", ["Kacchan", "Bakugo", "Bakugou"], "Katsuki Bakugo");
hit("mha-class-a", "mha", ["Uravity", "Ochako", "Uraraka"], "Ochaco Uraraka");
hit("mha-class-a", "mha", ["Shoto", "Shouto", "Todoroki"], "Shoto Todoroki");
hit("hxh-troupe", "hxh", ["Chrollo", "Kuroro"], "Chrollo Lucilfer");
hit("hxh-ants", "hxh", ["Pitou", "Neferpitou"], "Neferpitou");
hit("dn-suspects", "deathnote", ["Light", "Kira", "Light Yagami", "Yagami Light"], "Light Yagami");
hit("csm-hunters", "chainsaw", ["Denji", "Chainsaw Man"], "Denji");
hit("csm-hunters", "chainsaw", ["Power", "Blood Fiend"], "Power");
hit("bc-black-bulls", "blackclover", ["Secre", "Nero"], "Secre Swallowtail");
hit("jojo-jojos", "jojo", ["Jotaro", "Joutarou Kuujou", "Jotaro Kujo"], "Jotaro Kujo");
hit("jojo-jojos", "jojo", ["Giorno", "GioGio"], "Giorno Giovanna");
hit("rz-emilia-camp", "rezero", ["Subaru", "Barusu", "Natsuki Subaru"], "Subaru Natsuki");
hit("rz-emilia-camp", "rezero", ["Beatrice", "Beako"], "Beatrice");
hit("c-smartest", "onepiece", ["Vegapunk", "Dr. Vegapunk"], "Vegapunk");
hit("fr-mages", "frieren", ["Ubel", "Übel"], "Ubel");

console.log("• techniques, places, items: spacing, romanisation, slightly longer answers");
hit("c-technique", "onepiece", ["Gum-Gum Pistol", "gum gum pistol", "gumgum pistol", "Gomu Gomu no Pistol"], "Gum-Gum Pistol");
hit("c-technique", "onepiece", ["Gear 5", "gear five", "Gear Fifth"], "Gear Fifth");
hit("c-technique", "naruto", ["Rasengan", "rasen gan", "Spiraling Sphere", "the rasengan jutsu"], "Rasengan");
hit("c-technique", "naruto", ["Kage Bunshin no Jutsu", "shadow clone jutsu", "Shadow Clone"], "Shadow Clone Jutsu");
hit("c-technique", "dragonball", ["Kamehameha", "kamehame ha", "Kamehameha wave"], "Kamehameha");
hit("c-technique", "bleach", ["Getsuga Tensho", "Getsuga Tenshou", "Getsuga"], "Getsuga Tensho");
hit("c-group", "onepiece", ["Straw Hats", "straw hat crew", "Mugiwara"], "Straw Hat Pirates");
hit("c-place", "windbreaker", ["Pothos", "Pottos"], "Pothos");
hit("jjk-domains", "jjk", ["Unlimited Void", "Infinite Void", "Muryokusho"], "Unlimited Void");
hit("dn-kill", "deathnote", ["Their name", "write the name", "real name"], "Write their name");

console.log("• wrong, unrelated or vague answers are not accepted");
expect("c-villain", "onepiece", ["Luffy", "Zoro", "Nami", "Kizaru", "Gear 5"], "miss");
expect("c-villain", "naruto", ["Uchiha"], "vague");
expect("jojo-jojos", "jojo", ["Kujo", "Joestar"], "vague");
expect("c-technique", "onepiece", ["Gear"], "vague");
expect("c-technique", "naruto", ["fireball jutsu", "jutsu", "the rasengan and the chidori together"], "miss");
expect("op-straw-hats", "onepiece", ["Joker", "Big Mom", "Naomi"], "miss");
expect("c-smartest", "onepiece", ["Luffy", "Zoro"], "miss");
expect("mha-class-a", "mha", ["All Might", "Hawks"], "miss");
expect("dn-suspects", "deathnote", ["L", "Near"], "miss");
expect("db-transform", "dragonball", ["Super Saiyan 4", "Gear 4"], "miss");

console.log("• a right answer that is not on the board is recognised (the message says so; it's still a strike)");
fair("c-villain", "onepiece", "Big Mom", "Charlotte Linlin");
fair("c-villain", "onepiece", "Luffy", null);
fair("op-worst-gen", "onepiece", "Apoo", "Scratchmen Apoo");
fair("aot-104th", "aot", "Bertolt", "Bertholdt Hoover");

console.log(`\n${ok} accepted / rejected correctly, ${bad} wrong`);
process.exit(bad ? 1 : 0);
