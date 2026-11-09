// Owner coin tool setup (js/vault/devgrant.js). Writes ONLY a random salt + the PBKDF2 hash of the code, and salted
// SHA-256 hashes of the allowed player ids, into js/vault/config.js (DEV_TOOL). The code itself is never written.
//
//   set the code (new salt + hash):   AAP_DEV_CODE=... node tools/devgrant-setup.mjs --code
//                                      (or run without AAP_DEV_CODE and type it at the hidden prompt)
//   allow a player id (the owner's):   node tools/devgrant-setup.mjs --add-owner <player id>
//   remove one / remove all:           node tools/devgrant-setup.mjs --remove-owner <player id> | --clear-owners
//   check a code against the config:  AAP_DEV_CODE=... node tools/devgrant-setup.mjs --check
// The player id is shown in the Wardrobe (Profile tab, "Player ID"); each browser / device has its own.
import { readFileSync, writeFileSync } from "node:fs";
import { pbkdf2Sync, createHash, randomBytes } from "node:crypto";
import { createInterface } from "node:readline";

const FILE = new URL("../js/vault/config.js", import.meta.url);
const src = readFileSync(FILE, "utf8");
const block = src.match(/export const DEV_TOOL = \{[\s\S]*?\n\};/);
if (!block) { console.error("DEV_TOOL not found in js/vault/config.js"); process.exit(1); }
// keys are matched at the start of a line only: kdf: { ... hash: "SHA-256" } has its own "hash"
const field = k => { const m = block[0].match(new RegExp("^\\s*" + k + ':\\s*"([^"]*)"', "m")); return m ? m[1] : ""; };
const iterations = Number((block[0].match(/iterations:\s*(\d+)/) || [])[1] || 310000);
const owners = (() => { const m = block[0].match(/owners:\s*\[([^\]]*)\]/); return m ? [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]) : []; })();
const norm = c => String(c || "").trim().toUpperCase();               // the same as devgrant.js normCode
const hashCode = (code, salt) => pbkdf2Sync(norm(code), Buffer.from(salt, "base64"), iterations, 32, "sha256").toString("base64");
const hashOwner = (id, salt) => createHash("sha256").update(String(salt) + String(id).trim()).digest("base64");

function save(patch) {
    let b = block[0];
    if (patch.salt != null) b = b.replace(/^(\s*salt:\s*)"[^"]*"/m, `$1"${patch.salt}"`);
    if (patch.hash != null) b = b.replace(/^(\s*hash:\s*)"[^"]*"/m, `$1"${patch.hash}"`);
    if (patch.ownerSalt != null) b = b.replace(/^(\s*ownerSalt:\s*)"[^"]*"/m, `$1"${patch.ownerSalt}"`);
    if (patch.owners) b = b.replace(/(\bowners:\s*)\[[^\]]*\]/, `$1[${patch.owners.map(o => `"${o}"`).join(", ")}]`);
    writeFileSync(FILE, src.replace(block[0], b));
}
async function askHidden(q) {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = s => { if (s.includes(q)) process.stdout.write(q); };
    return new Promise(res => rl.question(q, a => { rl.close(); process.stdout.write("\n"); res(a); }));
}
const getCode = async () => process.env.AAP_DEV_CODE || await askHidden("Code: ");
const args = process.argv.slice(2), arg = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

if (args.includes("--code")) {
    const code = await getCode(); if (!norm(code)) { console.error("No code given."); process.exit(1); }
    const salt = randomBytes(16).toString("base64");
    save({ salt, hash: hashCode(code, salt) });
    console.log("DEV_TOOL.salt / hash written (PBKDF2-SHA256, " + iterations + " iterations). The code itself was not stored.");
} else if (arg("--add-owner")) {
    const id = arg("--add-owner").trim(), ownerSalt = field("ownerSalt") || randomBytes(16).toString("base64");
    const h = hashOwner(id, ownerSalt);
    save({ ownerSalt, owners: owners.includes(h) ? owners : owners.concat([h]) });
    console.log(owners.includes(h) ? "Already allowed." : "Player id allowed (" + (owners.length + 1) + " on the list).");
} else if (arg("--remove-owner")) {
    const h = hashOwner(arg("--remove-owner"), field("ownerSalt"));
    save({ owners: owners.filter(o => o !== h) }); console.log(owners.includes(h) ? "Removed." : "That id wasn't on the list.");
} else if (args.includes("--clear-owners")) {
    save({ owners: [] }); console.log("Owner list cleared.");
} else if (args.includes("--check")) {
    const code = await getCode();
    console.log(field("hash") && hashCode(code, field("salt")) === field("hash") ? "Code matches." : "Code does NOT match.");
    console.log(owners.length + " player id(s) allowed.");
} else {
    console.log("Usage: --code | --add-owner <id> | --remove-owner <id> | --clear-owners | --check   (see the top of this file)");
}
