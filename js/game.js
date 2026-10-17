
import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getDatabase,
    ref,
    set,
    get,
    update,
    onValue,
    remove,
    onDisconnect, runTransaction } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

import {
    getAuth,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { audio } from "./audio.js";
import { ambient, titleCard, shake, ring, burstText, motionOK, setReduced, isReduced } from "./fx.js";
import { profile, avatarEl, initGallery, openProfileEditor, commitProfileEditor, bindUpload, setProfileHooks, renderProfileCard } from "./profile.js";
import { showResults, closeResults } from "./results.js";


/* =========================================
   FIREBASE CONFIG
========================================= */

const firebaseConfig = {

    apiKey:
        "AIzaSyBNyolOo_5p7nJeSko6mK5kFaTWfjAKgTQ",

    authDomain:
        "custom-guess-who-f9440.firebaseapp.com",

    databaseURL:
        "https://custom-guess-who-f9440-default-rtdb.europe-west1.firebasedatabase.app",

    projectId:
        "custom-guess-who-f9440",

    storageBucket:
        "custom-guess-who-f9440.firebasestorage.app",

    messagingSenderId:
        "928168672302",

    appId:
        "1:928168672302:web:f5c6a0803cd3affb1af3bf"

};


const app =
    initializeApp(firebaseConfig);


const db =
    getDatabase(app);


const auth =
    getAuth(app);


/* =========================================
   GLOBAL GAME VARIABLES
========================================= */

let user = null;

let room = "";

let myPlayer = null;

let boardSize = 24;

// The game is now a single Anime Edition; One Piece is one of the selectable series.
const mode = "anime";

let board = [];

let selectedSecret = null;

let guessMode = false;

// True while we're waiting on the opponent's browser to verify a guess
// we just submitted.
let awaitingGuess = false;


let currentRoomData = null;


/* =========================================
   SIGN IN
========================================= */

try {

    const result =
        await signInAnonymously(auth);

    user =
        result.user;

    console.log(
        "Firebase UID:",
        user.uid
    );

}

catch(error) {

    console.error(error);

    toast(
        "Firebase authentication failed:\n\n"
        + error.message
    );

}


/* =========================================
   CHARACTER LIST
=========================================

   TEMPORARY.

   Replace these with your own image paths:

   images/luffy.jpg
   images/zoro.jpg
   etc.

========================================= */

const CHARACTER_LIBRARY = [

    "images/character1.jpg",
    "images/character2.jpg",
    "images/character3.jpg",
    "images/character4.jpg",
    "images/character5.jpg",
    "images/character6.jpg",
    "images/character7.jpg",
    "images/character8.jpg",
    "images/character9.jpg",
    "images/character10.jpg",
    "images/character11.jpg",
    "images/character12.jpg",
    "images/character13.jpg",
    "images/character14.jpg",
    "images/character15.jpg",
    "images/character16.jpg",
    "images/character17.jpg",
    "images/character18.jpg",
    "images/character19.jpg",
    "images/character20.jpg",
    "images/character21.jpg",
    "images/character22.jpg",
    "images/character23.jpg",
    "images/character24.jpg",
    "images/character25.jpg",
    "images/character26.jpg",
    "images/character27.jpg",
    "images/character28.jpg",
    "images/character29.jpg",
    "images/character30.jpg",
    "images/character31.jpg",
    "images/character32.jpg",
    "images/character33.jpg",
    "images/character34.jpg",
    "images/character35.jpg",
    "images/character36.jpg",
    "images/character37.jpg",
    "images/character38.jpg",
    "images/character39.jpg",
    "images/character40.jpg",
    "images/character41.jpg",
    "images/character42.jpg",
    "images/character43.jpg",
    "images/character44.jpg",
    "images/character45.jpg",
    "images/character46.jpg",
    "images/character47.jpg",
    "images/character48.jpg",
    "images/character49.jpg",
    "images/character50.jpg",
    "images/character51.jpg",
    "images/character52.jpg",
    "images/character53.jpg",
    "images/character54.jpg",
    "images/character55.jpg",
    "images/character56.jpg",
    "images/character57.jpg",
    "images/character58.jpg",
    "images/character59.jpg",
    "images/character60.jpg",
    "images/character61.jpg",
    "images/character62.jpg",
    "images/character63.jpg",
    "images/character64.jpg",
    "images/character65.jpg",
    "images/character66.jpg",
    "images/character67.jpg",
    "images/character68.jpg",
    "images/character69.jpg",
    "images/character70.jpg",
    "images/character71.jpg",
    "images/character72.jpg",
    "images/character73.jpg",
    "images/character74.jpg",
    "images/character75.jpg",
    "images/character76.jpg",
    "images/character77.jpg",
    "images/character78.jpg",
    "images/character79.jpg",
    "images/character80.jpg",
    "images/character81.jpg",
    "images/character82.jpg",
    "images/character83.jpg",
    "images/character84.jpg",
    "images/character85.jpg",
    "images/character86.jpg",
    "images/character87.jpg",
    "images/character88.jpg",
    "images/character89.jpg",
    "images/character90.jpg",
    "images/character91.jpg",
    "images/character92.jpg",
    "images/character93.jpg",
    "images/character94.jpg",
    "images/character95.jpg",
    "images/character96.jpg"
];

/* =========================================
   ANIME EDITION LIBRARY
   ---------------------------------------
   Each key is an anime series. Add more file
   paths (or whole new series) here whenever
   you have more character images ready.
========================================= */

const ANIME_LIBRARY = {

    naruto: [
        "images/anime/naruto/na1.jpg",
        "images/anime/naruto/na2.jpg",
        "images/anime/naruto/na3.jpg",
        "images/anime/naruto/na4.jpg",
        "images/anime/naruto/na5.jpg",
        "images/anime/naruto/na6.jpg",
        "images/anime/naruto/na7.jpg",
        "images/anime/naruto/na8.jpg",
        "images/anime/naruto/na9.jpg",
        "images/anime/naruto/na10.jpg",
        "images/anime/naruto/na11.jpg",
        "images/anime/naruto/na12.jpg",
        "images/anime/naruto/na13.jpg",
        "images/anime/naruto/na14.jpg",
        "images/anime/naruto/na15.jpg",
        "images/anime/naruto/na16.jpg",
        "images/anime/naruto/na17.jpg",
        "images/anime/naruto/na18.jpg",
        "images/anime/naruto/na19.jpg",
        "images/anime/naruto/na20.jpg",
        "images/anime/naruto/na21.jpg",
        "images/anime/naruto/na22.jpg",
        "images/anime/naruto/na23.jpg",
        "images/anime/naruto/na24.jpg"
    ],

    dragonball: [
        "images/anime/dragonball/db1.jpg",
        "images/anime/dragonball/db2.jpg",
        "images/anime/dragonball/db3.jpg",
        "images/anime/dragonball/db4.jpg",
        "images/anime/dragonball/db5.jpg",
        "images/anime/dragonball/db6.jpg",
        "images/anime/dragonball/db7.jpg",
        "images/anime/dragonball/db8.jpg",
        "images/anime/dragonball/db9.jpg",
        "images/anime/dragonball/db10.jpg",
        "images/anime/dragonball/db11.jpg",
        "images/anime/dragonball/db12.jpg",
        "images/anime/dragonball/db13.jpg",
        "images/anime/dragonball/db14.jpg",
        "images/anime/dragonball/db15.jpg",
        "images/anime/dragonball/db16.jpg",
        "images/anime/dragonball/db17.jpg",
        "images/anime/dragonball/db18.jpg",
        "images/anime/dragonball/db19.jpg",
        "images/anime/dragonball/db20.jpg",
        "images/anime/dragonball/db21.jpg",
        "images/anime/dragonball/db22.jpg",
        "images/anime/dragonball/db23.jpg",
        "images/anime/dragonball/db24.jpg"
    ],

    jjk: [
        "images/anime/jjk/jk1.jpg",
        "images/anime/jjk/jk2.jpg",
        "images/anime/jjk/jk3.jpg",
        "images/anime/jjk/jk4.jpg",
        "images/anime/jjk/jk5.jpg",
        "images/anime/jjk/jk6.jpg",
        "images/anime/jjk/jk7.jpg",
        "images/anime/jjk/jk8.jpg",
        "images/anime/jjk/jk9.jpg",
        "images/anime/jjk/jk10.jpg",
        "images/anime/jjk/jk11.jpg",
        "images/anime/jjk/jk12.jpg",
        "images/anime/jjk/jk13.jpg",
        "images/anime/jjk/jk14.jpg",
        "images/anime/jjk/jk15.jpg",
        "images/anime/jjk/jk16.jpg",
        "images/anime/jjk/jk17.jpg",
        "images/anime/jjk/jk18.jpg",
        "images/anime/jjk/jk19.jpg",
        "images/anime/jjk/jk20.jpg",
        "images/anime/jjk/jk21.jpg",
        "images/anime/jjk/jk22.jpg",
        "images/anime/jjk/jk23.jpg",
        "images/anime/jjk/jk24.jpg"
    ],

    demonslayer: [
        "images/anime/demonslayer/ds1.jpg",
        "images/anime/demonslayer/ds2.jpg",
        "images/anime/demonslayer/ds3.jpg",
        "images/anime/demonslayer/ds4.jpg",
        "images/anime/demonslayer/ds5.jpg",
        "images/anime/demonslayer/ds6.jpg",
        "images/anime/demonslayer/ds7.jpg",
        "images/anime/demonslayer/ds8.jpg",
        "images/anime/demonslayer/ds9.jpg",
        "images/anime/demonslayer/ds10.jpg",
        "images/anime/demonslayer/ds11.jpg",
        "images/anime/demonslayer/ds12.jpg",
        "images/anime/demonslayer/ds13.jpg",
        "images/anime/demonslayer/ds14.jpg",
        "images/anime/demonslayer/ds15.jpg",
        "images/anime/demonslayer/ds16.jpg",
        "images/anime/demonslayer/ds17.jpg",
        "images/anime/demonslayer/ds18.jpg",
        "images/anime/demonslayer/ds19.jpg",
        "images/anime/demonslayer/ds20.jpg",
        "images/anime/demonslayer/ds21.jpg",
        "images/anime/demonslayer/ds22.jpg",
        "images/anime/demonslayer/ds23.jpg",
        "images/anime/demonslayer/ds24.jpg"
    ],

    bleach: [
        "images/anime/bleach/bc1.jpg",
        "images/anime/bleach/bc2.jpg",
        "images/anime/bleach/bc3.jpg",
        "images/anime/bleach/bc4.jpg",
        "images/anime/bleach/bc5.jpg",
        "images/anime/bleach/bc6.jpg",
        "images/anime/bleach/bc7.jpg",
        "images/anime/bleach/bc8.jpg",
        "images/anime/bleach/bc9.jpg",
        "images/anime/bleach/bc10.jpg",
        "images/anime/bleach/bc11.jpg",
        "images/anime/bleach/bc12.jpg",
        "images/anime/bleach/bc13.jpg",
        "images/anime/bleach/bc14.jpg",
        "images/anime/bleach/bc15.jpg",
        "images/anime/bleach/bc16.jpg",
        "images/anime/bleach/bc17.jpg",
        "images/anime/bleach/bc18.jpg",
        "images/anime/bleach/bc19.jpg",
        "images/anime/bleach/bc20.jpg",
        "images/anime/bleach/bc21.jpg",
        "images/anime/bleach/bc22.jpg",
        "images/anime/bleach/bc23.jpg",
        "images/anime/bleach/bc24.jpg"
    ]

};

// One Piece now lives inside the anime library like any other series.
ANIME_LIBRARY.onepiece = CHARACTER_LIBRARY;

/* =========================================
   CHARACTER NAMES
   Fill in the name between the quotes for each image.
   Empty names are simply not shown.
========================================= */
const CHARACTER_NAMES = {
    "images/character1.jpg": "",
    "images/character2.jpg": "",
    "images/character3.jpg": "",
    "images/character4.jpg": "",
    "images/character5.jpg": "",
    "images/character6.jpg": "",
    "images/character7.jpg": "",
    "images/character8.jpg": "",
    "images/character9.jpg": "",
    "images/character10.jpg": "",
    "images/character11.jpg": "",
    "images/character12.jpg": "",
    "images/character13.jpg": "",
    "images/character14.jpg": "",
    "images/character15.jpg": "",
    "images/character16.jpg": "",
    "images/character17.jpg": "",
    "images/character18.jpg": "",
    "images/character19.jpg": "",
    "images/character20.jpg": "",
    "images/character21.jpg": "",
    "images/character22.jpg": "",
    "images/character23.jpg": "",
    "images/character24.jpg": "",
    "images/character25.jpg": "",
    "images/character26.jpg": "",
    "images/character27.jpg": "",
    "images/character28.jpg": "",
    "images/character29.jpg": "",
    "images/character30.jpg": "",
    "images/character31.jpg": "",
    "images/character32.jpg": "",
    "images/character33.jpg": "",
    "images/character34.jpg": "",
    "images/character35.jpg": "",
    "images/character36.jpg": "",
    "images/character37.jpg": "",
    "images/character38.jpg": "",
    "images/character39.jpg": "",
    "images/character40.jpg": "",
    "images/character41.jpg": "",
    "images/character42.jpg": "",
    "images/character43.jpg": "",
    "images/character44.jpg": "",
    "images/character45.jpg": "",
    "images/character46.jpg": "",
    "images/character47.jpg": "",
    "images/character48.jpg": "",
    "images/character49.jpg": "",
    "images/character50.jpg": "",
    "images/character51.jpg": "",
    "images/character52.jpg": "",
    "images/character53.jpg": "",
    "images/character54.jpg": "",
    "images/character55.jpg": "",
    "images/character56.jpg": "",
    "images/character57.jpg": "",
    "images/character58.jpg": "",
    "images/character59.jpg": "",
    "images/character60.jpg": "",
    "images/character61.jpg": "",
    "images/character62.jpg": "",
    "images/character63.jpg": "",
    "images/character64.jpg": "",
    "images/character65.jpg": "",
    "images/character66.jpg": "",
    "images/character67.jpg": "",
    "images/character68.jpg": "",
    "images/character69.jpg": "",
    "images/character70.jpg": "",
    "images/character71.jpg": "",
    "images/character72.jpg": "",
    "images/character73.jpg": "",
    "images/character74.jpg": "",
    "images/character75.jpg": "",
    "images/character76.jpg": "",
    "images/character77.jpg": "",
    "images/character78.jpg": "",
    "images/character79.jpg": "",
    "images/character80.jpg": "",
    "images/character81.jpg": "",
    "images/character82.jpg": "",
    "images/character83.jpg": "",
    "images/character84.jpg": "",
    "images/character85.jpg": "",
    "images/character86.jpg": "",
    "images/character87.jpg": "",
    "images/character88.jpg": "",
    "images/character89.jpg": "",
    "images/character90.jpg": "",
    "images/character91.jpg": "",
    "images/character92.jpg": "",
    "images/character93.jpg": "",
    "images/character94.jpg": "",
    "images/character95.jpg": "",
    "images/character96.jpg": "",
    "images/anime/naruto/na1.jpg": "",
    "images/anime/naruto/na2.jpg": "",
    "images/anime/naruto/na3.jpg": "",
    "images/anime/naruto/na4.jpg": "",
    "images/anime/naruto/na5.jpg": "",
    "images/anime/naruto/na6.jpg": "",
    "images/anime/naruto/na7.jpg": "",
    "images/anime/naruto/na8.jpg": "",
    "images/anime/naruto/na9.jpg": "",
    "images/anime/naruto/na10.jpg": "",
    "images/anime/naruto/na11.jpg": "",
    "images/anime/naruto/na12.jpg": "",
    "images/anime/naruto/na13.jpg": "",
    "images/anime/naruto/na14.jpg": "",
    "images/anime/naruto/na15.jpg": "",
    "images/anime/naruto/na16.jpg": "",
    "images/anime/naruto/na17.jpg": "",
    "images/anime/naruto/na18.jpg": "",
    "images/anime/naruto/na19.jpg": "",
    "images/anime/naruto/na20.jpg": "",
    "images/anime/naruto/na21.jpg": "",
    "images/anime/naruto/na22.jpg": "",
    "images/anime/naruto/na23.jpg": "",
    "images/anime/naruto/na24.jpg": "",
    "images/anime/dragonball/db1.jpg": "",
    "images/anime/dragonball/db2.jpg": "",
    "images/anime/dragonball/db3.jpg": "",
    "images/anime/dragonball/db4.jpg": "",
    "images/anime/dragonball/db5.jpg": "",
    "images/anime/dragonball/db6.jpg": "",
    "images/anime/dragonball/db7.jpg": "",
    "images/anime/dragonball/db8.jpg": "",
    "images/anime/dragonball/db9.jpg": "",
    "images/anime/dragonball/db10.jpg": "",
    "images/anime/dragonball/db11.jpg": "",
    "images/anime/dragonball/db12.jpg": "",
    "images/anime/dragonball/db13.jpg": "",
    "images/anime/dragonball/db14.jpg": "",
    "images/anime/dragonball/db15.jpg": "",
    "images/anime/dragonball/db16.jpg": "",
    "images/anime/dragonball/db17.jpg": "",
    "images/anime/dragonball/db18.jpg": "",
    "images/anime/dragonball/db19.jpg": "",
    "images/anime/dragonball/db20.jpg": "",
    "images/anime/dragonball/db21.jpg": "",
    "images/anime/dragonball/db22.jpg": "",
    "images/anime/dragonball/db23.jpg": "",
    "images/anime/dragonball/db24.jpg": "",
    "images/anime/jjk/jk1.jpg": "",
    "images/anime/jjk/jk2.jpg": "",
    "images/anime/jjk/jk3.jpg": "",
    "images/anime/jjk/jk4.jpg": "",
    "images/anime/jjk/jk5.jpg": "",
    "images/anime/jjk/jk6.jpg": "",
    "images/anime/jjk/jk7.jpg": "",
    "images/anime/jjk/jk8.jpg": "",
    "images/anime/jjk/jk9.jpg": "",
    "images/anime/jjk/jk10.jpg": "",
    "images/anime/jjk/jk11.jpg": "",
    "images/anime/jjk/jk12.jpg": "",
    "images/anime/jjk/jk13.jpg": "",
    "images/anime/jjk/jk14.jpg": "",
    "images/anime/jjk/jk15.jpg": "",
    "images/anime/jjk/jk16.jpg": "",
    "images/anime/jjk/jk17.jpg": "",
    "images/anime/jjk/jk18.jpg": "",
    "images/anime/jjk/jk19.jpg": "",
    "images/anime/jjk/jk20.jpg": "",
    "images/anime/jjk/jk21.jpg": "",
    "images/anime/jjk/jk22.jpg": "",
    "images/anime/jjk/jk23.jpg": "",
    "images/anime/jjk/jk24.jpg": "",
    "images/anime/demonslayer/ds1.jpg": "",
    "images/anime/demonslayer/ds2.jpg": "",
    "images/anime/demonslayer/ds3.jpg": "",
    "images/anime/demonslayer/ds4.jpg": "",
    "images/anime/demonslayer/ds5.jpg": "",
    "images/anime/demonslayer/ds6.jpg": "",
    "images/anime/demonslayer/ds7.jpg": "",
    "images/anime/demonslayer/ds8.jpg": "",
    "images/anime/demonslayer/ds9.jpg": "",
    "images/anime/demonslayer/ds10.jpg": "",
    "images/anime/demonslayer/ds11.jpg": "",
    "images/anime/demonslayer/ds12.jpg": "",
    "images/anime/demonslayer/ds13.jpg": "",
    "images/anime/demonslayer/ds14.jpg": "",
    "images/anime/demonslayer/ds15.jpg": "",
    "images/anime/demonslayer/ds16.jpg": "",
    "images/anime/demonslayer/ds17.jpg": "",
    "images/anime/demonslayer/ds18.jpg": "",
    "images/anime/demonslayer/ds19.jpg": "",
    "images/anime/demonslayer/ds20.jpg": "",
    "images/anime/demonslayer/ds21.jpg": "",
    "images/anime/demonslayer/ds22.jpg": "",
    "images/anime/demonslayer/ds23.jpg": "",
    "images/anime/demonslayer/ds24.jpg": "",
    "images/anime/bleach/bc1.jpg": "",
    "images/anime/bleach/bc2.jpg": "",
    "images/anime/bleach/bc3.jpg": "",
    "images/anime/bleach/bc4.jpg": "",
    "images/anime/bleach/bc5.jpg": "",
    "images/anime/bleach/bc6.jpg": "",
    "images/anime/bleach/bc7.jpg": "",
    "images/anime/bleach/bc8.jpg": "",
    "images/anime/bleach/bc9.jpg": "",
    "images/anime/bleach/bc10.jpg": "",
    "images/anime/bleach/bc11.jpg": "",
    "images/anime/bleach/bc12.jpg": "",
    "images/anime/bleach/bc13.jpg": "",
    "images/anime/bleach/bc14.jpg": "",
    "images/anime/bleach/bc15.jpg": "",
    "images/anime/bleach/bc16.jpg": "",
    "images/anime/bleach/bc17.jpg": "",
    "images/anime/bleach/bc18.jpg": "",
    "images/anime/bleach/bc19.jpg": "",
    "images/anime/bleach/bc20.jpg": "",
    "images/anime/bleach/bc21.jpg": "",
    "images/anime/bleach/bc22.jpg": "",
    "images/anime/bleach/bc23.jpg": "",
    "images/anime/bleach/bc24.jpg": "",
};

const $ = id => document.getElementById(id);
const HAS_NAMES = () => Object.values(CHARACTER_NAMES).some(Boolean);
const nameOf = image => CHARACTER_NAMES[image] || "";

/* ---------- toast ---------- */
let toastTimer = null;
function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

/* ---------- session (rejoin after refresh) ---------- */
const SKEY = "gw_session";
function saveSession() {
    try {
        localStorage.setItem(SKEY, JSON.stringify({ room, player: myPlayer }));
        localStorage.setItem("gw_name", ($("name").value || "").trim());
    } catch (e) {}
}
function clearSession() { try { localStorage.removeItem(SKEY); } catch (e) {} }

/* ---------- sound (js/audio.js owns the AudioContext; these keep the old names working) ---------- */
let muted = audio.muted;
const tone = (...a) => audio.tone(...a);
const sfx = (name, opt) => audio.sfx(name, opt);
function syncDock() {
    const s = audio.settings;
    $("muteBtn").textContent = s.mute ? "🔇" : "🔊"; $("muteBtn").setAttribute("aria-pressed", String(!s.mute));
    $("musicBtn").classList.toggle("off", !s.musicOn || s.mute); $("musicBtn").setAttribute("aria-pressed", String(!!s.musicOn));
}
audio.onChange(s => { muted = !!s.mute; syncDock(); });
window.toggleMute = function () { audio.set({ mute: !audio.settings.mute }); if (!audio.settings.mute) sfx("toggle"); };

/* ---------- per-series win sounds ----------
   Drop your sounds in:  sounds/win/<series-key>.mp3   (.ogg / .wav / .m4a also work)
   Keys: onepiece naruto dragonball jjk demonslayer bleach aot mha hxh deathnote
         chainsaw blackclover jojo rezero fireforce frieren gachiakuta windbreaker
   When the results show up, EVERYONE in the room hears the sound of the series the
   winner's character belongs to. A series with no file just plays nothing extra. */
const WIN_SOUND_DIR = "sounds/win/";
const WIN_SOUND_EXTS = ["mp3", "ogg", "wav", "m4a"];
const WIN_SOUND_VOLUME = 0.9;          // 0 to 1
const WIN_SOUND_DELAY_MS = 600;        // wait for the normal win/lose jingle to finish (0 = play right away)
const WIN_SOUND_CLASSIC_USES = "own";  // classic mode: "own" = winner's own secret character, "guessed" = the character they guessed
const winAudio = {};
let winSoundDone = false;
function winSoundLoad(key) {
    if (!key) return null;
    if (winAudio[key]) return winAudio[key];
    const entry = winAudio[key] = { el: null, state: "loading", queued: false };
    let i = 0;
    const next = () => {
        if (i >= WIN_SOUND_EXTS.length) { entry.state = "none"; entry.queued = false; return; }
        const a = new Audio(); a.preload = "auto"; a.volume = WIN_SOUND_VOLUME;
        a.addEventListener("canplaythrough", () => {
            entry.el = a; entry.state = "ready";
            if (entry.queued) { entry.queued = false; winSoundPlayEntry(entry); }
        }, { once: true });
        a.addEventListener("error", next, { once: true });
        a.src = WIN_SOUND_DIR + key + "." + WIN_SOUND_EXTS[i++];
        a.load();
    };
    next();
    return entry;
}
function winSoundPlayEntry(entry) {
    try { entry.el.currentTime = 0; entry.el.volume = audio.mediaVolume(WIN_SOUND_VOLUME); audio.duck(3500); const p = entry.el.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
}
function winSoundPreload(keys) { (Array.isArray(keys) ? keys : Object.values(keys || {})).forEach(winSoundLoad); }
function winSoundPlay(key) {
    if (muted || !key) return;
    const entry = winSoundLoad(key);
    if (entry.state === "ready") winSoundPlayEntry(entry);
    else if (entry.state === "loading") entry.queued = true;
}
function winSoundPlayLater(key) { if (key) setTimeout(() => winSoundPlay(key), WIN_SOUND_DELAY_MS); }
function seriesKeyFromImage(img) { const m = /anime\/([^\/]+)\//.exec(String(img || "")); return m ? m[1] : null; }
// Headbanz: sound of the series of the round's (or match's) winner's character
function hbWinSound(hb) {
    const players = arr(hb.players).map(Number), order = arr(hb.order).map(Number), out = arr(hb.out).map(Number);
    let w = null;
    if (hb.phase === "match") w = hb.tie ? null : Number(hb.winner);
    else if (order.length) w = order[0];
    else if (players.length === 2) w = players.find(p => !out.includes(p)) || null;
    const c = w && hb.chars && hb.chars["p" + w];
    if (!c) return;
    const key = Object.keys(HB_SERIES).find(k => HB_SERIES[k].label === c.s);
    winCelebrate(key, w === Number(myPlayer));
}
// some browsers (iOS Safari) need a tap before audio may play: unlock the loaded sounds on the first tap
document.addEventListener("pointerdown", () => {
    Object.values(winAudio).forEach(en => { if (en.el && en.el.paused) { en.el.muted = true; const p = en.el.play(); if (p && p.then) p.then(() => { en.el.pause(); en.el.currentTime = 0; en.el.muted = false; }).catch(() => { en.el.muted = false; }); } });
}, { once: true });

/* ---------- background music (one looping track per series) ----------
   Drop your tracks in:  sounds/music/<series-key>.mp3   (.ogg / .wav / .m4a also work)
   Plays only during gameplay (picking your secret character + the game / Headbanz rounds),
   only when exactly ONE series is ticked. Mixed series = no music. Fades out on results. */
/* ---------- background music: every scene has its own procedural soundtrack (js/audio.js) ----------
   lobby = lo-fi shonen groove · gw = detective noir swing · hb = psychic synthwave
   im = interrogation tension · uno = arena battle drums. Starts after the first tap (autoplay rules). */
function musicWanted(d) {
    if (!d || !d.status || d.status === "waiting" || !inMatch(d)) return "lobby";
    if (d.gameType === "imposter") return "im";
    if (d.gameType === "headbanz") return "hb";
    if (d.gameType === "uno") return d.uno && d.uno.phase === "over" ? "lobby" : "uno";
    return d.status === "finished" ? "lobby" : "gw";
}
function musicSync(d) { audio.music.play(musicWanted(d)); }
window.toggleMusic = function () { audio.set({ musicOn: !audio.settings.musicOn }); sfx("toggle"); };

/* ---------- victory animations (canvas, no image/audio files needed) ----------
   When the results show up, the WINNER gets a burst themed to the series of their character.
   Layer fields: m = motion (burst | swirl | implode | rise | fall | slash | rings), s = shape, c = colors,
   n = count, dur = seconds to spawn them over, size/spd/life = [min,max], g = gravity, spin, sway, glow. */
const VICTORY_FX_FOR_EVERYONE = false;   // true = the loser sees the burst too
const VFX = {
    onepiece:    { layers: [{ m: "burst", s: "coin", c: ["#f5c542", "#ffd86b", "#e8a317", "#fff3b0"], n: 60, size: [12, 20], spd: [280, 640], g: 500, life: [1.6, 2.4], spin: 6 }, { m: "fall", s: "star", c: ["#fff3b0", "#ffffff"], n: 22, dur: 1.2, size: [10, 16], spd: [90, 170], life: [2.2, 3.2], sway: 30, spin: 3 }] },
    naruto:      { layers: [{ m: "swirl", s: "leaf", c: ["#6fbf3b", "#4f9a2a", "#f28c28", "#a6d96a"], n: 70, dur: .9, size: [14, 24], spd: [150, 340], life: [1.8, 2.6], spin: 5 }, { m: "burst", s: "circle", c: ["#ffffff", "#e8e8e8"], n: 18, size: [30, 60], spd: [60, 160], life: [.8, 1.2] }] },
    dragonball:  { glow: 12, layers: [{ m: "rings", c: ["#ffd23f", "#ffae00", "#fff3a0"], n: 5, dur: .9, size: [4, 9], spd: [420, 760], life: [1.1, 1.6] }, { m: "rise", s: "sparkle", c: ["#ffd23f", "#fff3a0", "#ffffff"], n: 50, dur: 1.4, size: [8, 16], spd: [180, 420], life: [1.2, 2], sway: 20 }] },
    jjk:         { glow: 16, layers: [{ m: "rings", c: ["#8a5cff", "#3b2a8f", "#b49bff"], n: 4, dur: .8, size: [3, 7], spd: [300, 600], life: [1.1, 1.6] }, { m: "rise", s: "circle", c: ["#6b3df0", "#1d1445", "#a68bff"], n: 45, dur: 1.4, size: [10, 26], spd: [80, 220], life: [1.4, 2.4], sway: 30 }] },
    demonslayer: { layers: [{ m: "slash", c: ["#ffffff", "#7fe0ff", "#2fa8d8"], n: 9, dur: .8, size: [14, 26], len: [360, 800] }, { m: "rise", s: "circle", c: ["#7fe0ff", "#bff3ff"], n: 30, dur: 1, size: [6, 12], spd: [120, 300], life: [1.2, 2], sway: 20 }, { m: "fall", s: "petal", c: ["#ffb3c7", "#ff8fab"], n: 24, dur: 1.2, size: [10, 16], spd: [90, 180], life: [2, 3], sway: 50, spin: 4 }] },
    bleach:      { glow: 10, layers: [{ m: "slash", c: ["#ffffff", "#111111", "#ff9a2e"], n: 8, dur: .7, size: [14, 28], len: [360, 800] }, { m: "rise", s: "circle", c: ["#ffffff", "#cfe8ff"], n: 40, dur: 1.4, size: [5, 10], spd: [100, 260], life: [1.4, 2.4], sway: 25 }] },
    aot:         { layers: [{ m: "slash", c: ["#e8edf2", "#9fb3c8", "#ffffff"], n: 7, dur: .6, size: [12, 22], len: [400, 860] }, { m: "burst", s: "circle", c: ["#d9d9d9", "#bdbdbd", "#ffffff"], n: 22, size: [30, 70], spd: [120, 300], life: [1, 1.6] }] },
    mha:         { layers: [{ m: "burst", s: "star", c: ["#3ddc5a", "#ffe14d", "#ff4d4d", "#ffffff"], n: 50, size: [14, 26], spd: [300, 700], g: 300, life: [1.5, 2.2], spin: 6 }, { m: "rings", c: ["#ffe14d", "#3ddc5a"], n: 3, dur: .5, size: [4, 8], spd: [500, 800], life: [.9, 1.3] }] },
    hxh:         { glow: 14, layers: [{ m: "rings", c: ["#58e07a", "#2bd4ff", "#a0ffc4"], n: 4, dur: 1, size: [3, 6], spd: [240, 480], life: [1.2, 1.8] }, { m: "rise", s: "diamond", c: ["#58e07a", "#2bd4ff", "#d2ffe0"], n: 40, dur: 1.5, size: [10, 18], spd: [110, 300], life: [1.4, 2.2], sway: 25, spin: 2 }] },
    deathnote:   { glow: 6, layers: [{ m: "fall", s: "feather", c: ["#d9d9d9", "#8b0000", "#ff2a2a", "#4a4a4a"], n: 40, dur: 1.6, size: [18, 30], spd: [90, 200], life: [2.4, 3.4], sway: 60, spin: 2 }, { m: "burst", s: "circle", c: ["#c1121f"], n: 10, size: [18, 26], spd: [200, 420], g: 600, life: [1.4, 2] }] },
    chainsaw:    { glow: 8, layers: [{ m: "burst", s: "line", c: ["#ff3b30", "#ff9500", "#ffffff"], n: 55, size: [8, 14], spd: [300, 800], g: 200, life: [1, 1.6] }, { m: "slash", c: ["#ff3b30", "#8b0000"], n: 6, dur: .5, size: [14, 26], len: [360, 760] }] },
    blackclover: { layers: [{ m: "rise", s: "clover", c: ["#2ecc71", "#27ae60", "#f1c40f", "#9b59b6"], n: 38, dur: 1.5, size: [16, 28], spd: [110, 260], life: [1.6, 2.6], sway: 30, spin: 3 }, { m: "burst", s: "sparkle", c: ["#ffffff", "#f1c40f"], n: 30, size: [10, 18], spd: [200, 500], life: [1, 1.6] }] },
    jojo:        { glow: 8, layers: [{ m: "rise", s: "text", glyph: ["ゴ", "ド"], c: ["#c026d3", "#ff2bd6", "#7c3aed"], n: 16, dur: 1.4, size: [20, 34], spd: [80, 180], life: [1.8, 2.6], sway: 20 }, { m: "burst", s: "star", c: ["#ff2bd6", "#ffe14d", "#00e5ff"], n: 30, size: [12, 22], spd: [250, 600], g: 200, life: [1.4, 2], spin: 6 }, { m: "rings", c: ["#ff2bd6"], n: 3, dur: .6, size: [4, 8], spd: [400, 700], life: [.9, 1.3] }] },
    rezero:      { glow: 12, layers: [{ m: "implode", s: "circle", c: ["#c9b6ff", "#ffffff", "#7c5cff"], n: 60, dur: 1.2, size: [6, 14], life: [1.4, 1.8] }, { m: "rings", c: ["#c9b6ff"], n: 3, dur: 1, size: [3, 6], spd: [200, 400], life: [1.2, 1.8], delay: .8 }] },
    fireforce:   { glow: 14, layers: [{ m: "rise", s: "flame", c: ["#ff4500", "#ff8c00", "#ffd000", "#ff2a00"], n: 55, dur: 1.4, size: [18, 34], spd: [200, 480], life: [1.2, 2], sway: 40 }, { m: "burst", s: "circle", c: ["#ffd000", "#ff8c00"], n: 25, size: [4, 8], spd: [200, 500], g: -120, life: [1.2, 2] }] },
    frieren:     { glow: 10, layers: [{ m: "fall", s: "sparkle", c: ["#ffffff", "#bfe3ff", "#fff1b8"], n: 45, dur: 2, size: [10, 20], spd: [50, 110], life: [2.6, 3.6], sway: 30, spin: 2 }, { m: "fall", s: "petal", c: ["#cfe8ff", "#ffe3f1"], n: 22, dur: 2, size: [10, 16], spd: [50, 110], life: [2.6, 3.6], sway: 40, spin: 3 }] },
    gachiakuta:  { layers: [{ m: "burst", s: "rect", c: ["#ff2d95", "#00e5ff", "#ffe14d", "#7cff4d", "#ffffff"], n: 55, size: [10, 22], spd: [300, 700], g: 700, life: [1.4, 2.2], spin: 8 }, { m: "rise", s: "circle", c: ["#ff2d95", "#00e5ff"], n: 20, dur: 1, size: [8, 16], spd: [100, 260], life: [1.2, 2] }] },
    windbreaker: { layers: [{ m: "swirl", s: "line", c: ["#ffffff", "#7cf0c8", "#4ad6a5"], n: 60, dur: 1, size: [10, 16], spd: [200, 420], life: [1.2, 1.8] }, { m: "fall", s: "petal", c: ["#ffc2d9", "#ff9ec1"], n: 30, dur: 1.5, size: [10, 16], spd: [90, 180], life: [2, 3], sway: 80, spin: 4 }] }
};
const VFX_SHAPES = {
    circle: (c, s) => { c.beginPath(); c.arc(0, 0, s / 2, 0, 6.283); c.fill(); },
    coin: (c, s) => { c.beginPath(); c.arc(0, 0, s / 2, 0, 6.283); c.fill(); c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, s / 3.2, 0, 6.283); c.stroke(); },
    leaf: (c, s) => { c.beginPath(); c.moveTo(-s, 0); c.quadraticCurveTo(0, -s * .7, s, 0); c.quadraticCurveTo(0, s * .7, -s, 0); c.fill(); c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = 1; c.beginPath(); c.moveTo(-s, 0); c.lineTo(s, 0); c.stroke(); },
    line: (c, s) => { c.fillRect(-s * 2, -s * .12, s * 4, s * .24); },
    rect: (c, s) => { c.fillRect(-s / 2, -s / 3, s, s * .66); },
    star: (c, s) => { c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? s * .2 : s * .5, a = i * Math.PI / 5 - Math.PI / 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); },
    sparkle: (c, s) => { c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? s * .1 : s * .5, a = i * Math.PI / 4; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); },
    diamond: (c, s) => { c.beginPath(); c.moveTo(0, -s / 2); c.lineTo(s * .3, 0); c.lineTo(0, s / 2); c.lineTo(-s * .3, 0); c.closePath(); c.fill(); },
    petal: (c, s) => { c.beginPath(); c.ellipse(0, 0, s * .6, s * .3, 0, 0, 6.283); c.fill(); },
    feather: (c, s) => { c.beginPath(); c.ellipse(0, 0, s, s * .22, 0, 0, 6.283); c.fill(); c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1; c.beginPath(); c.moveTo(-s, 0); c.lineTo(s, 0); c.stroke(); },
    flame: (c, s) => { c.beginPath(); c.moveTo(0, -s); c.bezierCurveTo(s * .9, -s * .2, s * .6, s * .7, 0, s * .7); c.bezierCurveTo(-s * .6, s * .7, -s * .9, -s * .2, 0, -s); c.fill(); },
    clover: (c, s) => { const r = s * .25; [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(d => { c.beginPath(); c.arc(d[0] * r, d[1] * r, r, 0, 6.283); c.fill(); }); c.fillRect(-1, 0, 2, s * .6); },
    text: (c, s, p) => { c.font = '900 ' + s * 2.4 + 'px "Dela Gothic One", "Noto Sans JP", sans-serif'; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(p.glyph || "", 0, 0); }
};
let vfxCanvas = null, vfxCtx = null, vfxRun = null;
const vfxRand = (a, b) => a + Math.random() * (b - a), vfxPick = l => l[Math.random() * l.length | 0];
function vfxSpawn(st, l) {
    const [s0, s1] = l.size || [8, 14], [l0, l1] = l.life || [1.5, 2.5], [v0, v1] = l.spd || [100, 300];
    const sz = vfxRand(s0, s1), life = vfxRand(l0, l1), spd = vfxRand(v0, v1), W = st.W, H = st.H;
    const p = { m: l.m, s: l.s, color: vfxPick(l.c), size: sz, life, age: 0, rot: vfxRand(0, 6.283), vr: l.spin ? vfxRand(-l.spin, l.spin) : 0, g: l.g || 0, sway: l.sway || 0, ph: vfxRand(0, 6.283), glyph: l.glyph ? vfxPick(l.glyph) : null, drag: l.drag != null ? l.drag : (l.m === "burst" ? 1.4 : 0), vx: 0, vy: 0 };
    switch (l.m) {
        case "burst": { const a = vfxRand(0, 6.283); p.x = W / 2; p.y = H * .42; p.vx = Math.cos(a) * spd; p.vy = Math.sin(a) * spd; if (l.s === "line") p.rot = a; break; }
        case "rise": p.x = vfxRand(0, W); p.y = H + sz; p.vy = -spd; if (l.s === "flame") p.rot = 0; break;
        case "fall": p.x = vfxRand(0, W); p.y = -sz; p.vx = vfxRand(-30, 30); p.vy = spd; break;
        case "swirl": p.polar = true; p.ang = vfxRand(0, 6.283); p.rad = vfxRand(5, 30); p.av = vfxRand(2.5, 4.5); p.rv = spd; break;
        case "implode": p.polar = true; p.ang = vfxRand(0, 6.283); p.rad = Math.max(W, H) * vfxRand(.5, .7); p.av = vfxRand(1.5, 3); p.rv = -p.rad / life * 1.05; break;
        case "slash": p.x = vfxRand(W * .1, W * .9); p.y = vfxRand(H * .1, H * .9); p.ang = vfxRand(-.9, .9) + (Math.random() < .5 ? 0 : Math.PI); { const [a0, a1] = l.len || [300, 700]; p.len = vfxRand(a0, a1); } p.life = vfxRand(.45, .8); break;
        case "rings": p.x = W / 2; p.y = H * .42; p.grow = spd; break;
    }
    st.parts.push(p);
}
function vfxStep(st, dt) {
    st.layers.forEach(o => {
        const l = o.l, prog = Math.min(1, Math.max(0, (st.t - (l.delay || 0)) / (l.dur || .2))), target = Math.round(l.n * prog);
        while (o.emitted < target) { vfxSpawn(st, l); o.emitted++; }
    });
    for (let i = st.parts.length - 1; i >= 0; i--) {
        const p = st.parts[i]; p.age += dt;
        if (p.age >= p.life) { st.parts.splice(i, 1); continue; }
        if (p.polar) {
            p.ang += p.av * dt; p.rad = Math.max(0, p.rad + p.rv * dt);
            p.x = st.W / 2 + Math.cos(p.ang) * p.rad; p.y = st.H * .42 + Math.sin(p.ang) * p.rad; p.rot = p.ang + 1.57 + p.age * p.vr;
        } else if (p.m !== "slash" && p.m !== "rings") {
            const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k;
            p.ph += dt * 3; p.x += p.vx * dt + Math.cos(p.ph) * p.sway * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.rot += p.vr * dt;
        }
    }
}
function vfxSlash(c, p, head, a) {
    const dx = Math.cos(p.ang), dy = Math.sin(p.ang), x0 = p.x - dx * p.len / 2, y0 = p.y - dy * p.len / 2, L = p.len * head;
    const x1 = x0 + dx * L, y1 = y0 + dy * L, mx = (x0 + x1) / 2, my = (y0 + y1) / 2, nx = -dy, ny = dx, w = p.size * head;
    c.globalAlpha = Math.max(0, a); c.fillStyle = p.color; c.shadowColor = p.color; c.shadowBlur = 14;
    c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx + nx * w, my + ny * w, x1, y1); c.quadraticCurveTo(mx - nx * w * .25, my - ny * w * .25, x0, y0); c.fill(); c.shadowBlur = 0;
}
function vfxDraw(st) {
    const c = vfxCtx; c.setTransform(st.dpr, 0, 0, st.dpr, 0, 0); c.clearRect(0, 0, st.W, st.H); c.shadowBlur = 0;
    for (const p of st.parts) {
        const t = p.age / p.life;
        if (p.m === "slash") { const head = Math.min(1, t / .3); vfxSlash(c, p, head, t < .3 ? 1 : 1 - (t - .3) / .7); continue; }
        c.globalAlpha = Math.max(0, t < .1 ? t / .1 : t > .7 ? (1 - t) / .3 : 1); c.fillStyle = c.strokeStyle = p.color;
        if (st.glow) { c.shadowColor = p.color; c.shadowBlur = st.glow; }
        if (p.m === "rings") { c.lineWidth = p.size * (1 - t * .6); c.beginPath(); c.arc(p.x, p.y, p.age * p.grow, 0, 6.283); c.stroke(); continue; }
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); (VFX_SHAPES[p.s] || VFX_SHAPES.circle)(c, p.size, p); c.restore();
    }
    c.globalAlpha = 1; c.shadowBlur = 0;
}
function victoryFx(key) {
    const theme = VFX[key]; if (!theme) return;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!vfxCanvas) {
        vfxCanvas = document.createElement("canvas");
        vfxCanvas.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:60";
        document.body.appendChild(vfxCanvas); vfxCtx = vfxCanvas.getContext("2d");
    }
    if (vfxRun) cancelAnimationFrame(vfxRun.raf);
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight;
    vfxCanvas.width = Math.round(W * dpr); vfxCanvas.height = Math.round(H * dpr); vfxCanvas.style.display = "block";
    const st = { t: 0, last: performance.now(), parts: [], layers: theme.layers.map(l => ({ l, emitted: 0 })), W, H, dpr, glow: theme.glow || 0, raf: 0 };
    vfxRun = st;
    const frame = now => {
        if (vfxRun !== st) return;
        const dt = Math.min(.05, (now - st.last) / 1000); st.last = now; st.t += dt;
        vfxStep(st, dt); vfxDraw(st);
        if (st.layers.some(o => o.emitted < o.l.n) || st.parts.length) st.raf = requestAnimationFrame(frame);
        else { vfxCtx.clearRect(0, 0, vfxCanvas.width, vfxCanvas.height); vfxCanvas.style.display = "none"; vfxRun = null; }
    };
    st.raf = requestAnimationFrame(frame);
}
// win sound + (for the winner) the themed burst, both timed after the normal win/lose jingle
function winCelebrate(key, iWon) {
    winSoundPlayLater(key);
    if (key && (iWon || VICTORY_FX_FOR_EVERYONE)) setTimeout(() => victoryFx(key), WIN_SOUND_DELAY_MS);
}

/* ---------- images: fallback + fade-in ---------- */
const FALLBACK_IMG = "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#2a0e0e"/><circle cx="50" cy="42" r="17" fill="#8a1a1a"/><path d="M18 96c4-24 20-32 32-32s28 8 32 32z" fill="#8a1a1a"/><text x="50" y="49" font-size="24" text-anchor="middle" fill="#c9a56a" font-family="sans-serif" font-weight="700">?</text></svg>');
function applyImg(img, src) {
    img.classList.remove("loaded", "missing");
    img.onload = () => img.classList.add("loaded");
    img.onerror = () => { img.onerror = null; img.classList.add("missing"); img.src = FALLBACK_IMG; };
    img.src = src;
    return img;
}
function makeImg(src) {
    const img = new Image(); img.alt = ""; img.draggable = false; img.decoding = "async";
    return applyImg(img, src);
}
function preloadImages(list) { list.forEach(src => { const i = new Image(); i.src = src; }); }
function addName(card, image) {
    const n = nameOf(image); if (!n) return;
    card.title = n;
    const s = document.createElement("span"); s.className = "cname"; s.textContent = n; card.appendChild(s);
}

/* ---------- presence (opponent left) ---------- */
/* One ".info/connected" listener per room + slot (re-joining the same room never stacks listeners). */
let presenceKey = "", presenceUnsub = null, presenceRef = null;
function startPresence() {
    const key = room + ":" + myPlayer;
    if (presenceKey === key) return;
    stopPresence(false);
    presenceKey = key;
    const myRef = presenceRef = ref(db, "rooms/" + room + "/presence/p" + myPlayer);
    presenceUnsub = onValue(ref(db, ".info/connected"), snap => {
        netState(snap.val() === true);
        if (snap.val() === true && !exiting && presenceRef === myRef) {
            onDisconnect(myRef).set(false).then(() => { if (!exiting && presenceRef === myRef) return set(myRef, true); }).catch(() => {});
        }
    });
}
let netWasDown = false, netTimer = 0;
function netState(up) {
    clearTimeout(netTimer);
    if (up) { document.body.classList.remove("net-down"); if (netWasDown) toast("Reconnected"); netWasDown = false; return; }
    netTimer = setTimeout(() => { if (exiting) return; netWasDown = true; document.body.classList.add("net-down"); }, 1500);   // brief blips are ignored
}
function stopPresence(cancelDisconnect) {
    if (presenceUnsub) { presenceUnsub(); presenceUnsub = null; }
    if (cancelDisconnect && presenceRef) { try { onDisconnect(presenceRef).cancel(); } catch (e) {} }
    presenceRef = null; presenceKey = "";
}
let oppDismissKey = "";
window.dismissOpp = function () { oppDismissKey = $("oppBanner").dataset.key || ""; $("oppBanner").classList.add("hidden"); };
function updatePresenceBanner(data) {
    const pres = data.presence || {}, box = $("oppBanner"), me = Number(myPlayer);
    // only matters while I'm actually playing a match; players who LEFT are handled by the host (match guard)
    const seats = inMatch(data) && data.status !== "waiting" ? matchSeats(data) : [];
    const gone = seats.filter(i => data["player" + i] && !data["player" + i].left && i !== me && pres["p" + i] === false);
    const key = gone.join(",");
    const multi = data.gameType === "headbanz" || data.gameType === "imposter" || data.gameType === "uno";
    const names = gone.map(i => data["player" + i].name).join(", ");
    $("oppBannerText").textContent = multi
        ? names + (gone.length > 1 ? " lost connection" : " lost connection") + ". The round keeps going; they can rejoin with the same link."
        : names + " lost connection. They can rejoin from the same browser, or the host can take everyone back to the lobby.";
    box.dataset.key = key;
    box.classList.toggle("hidden", !gone.length || key === oppDismissKey || data.status === "finished");
    if (!gone.length) oppDismissKey = "";
}


let lastSfxTurn = null;
let exiting = false;
let namesOn = false;
try { namesOn = localStorage.getItem("gw_names") === "1"; } catch (e) {}
let unsubReveal = null;
let rematchSize = 24;




/* =========================================
   HELPERS
========================================= */

const SCENE_OF = { home: "home", lobby: "lobby", secret: "gw", game: "gw", result: "gw", hb: "hb", im: "im", uno: "uno" };
let currentScreen = "home";
function showOnly(id) {
    document.querySelectorAll("#home,#lobby,#secret,#game,#hb,#im,#uno,#result").forEach(el => el.classList.add("hidden"));
    const element = document.getElementById(id);
    element.classList.remove("hidden");
    if (currentScreen !== id) {
        currentScreen = id;
        const scene = SCENE_OF[id] || "lobby";
        document.body.dataset.scene = scene;
        ambient.set(scene, scene === "uno" ? undefined : null);
        if (motionOK() && element.animate) element.animate([{ opacity: 0, transform: "translateY(14px) scale(.995)" }, { opacity: 1, transform: "none" }], { duration: 380, easing: "cubic-bezier(.2,.9,.3,1)" });
    }
    $("emoteBtn").classList.toggle("hidden", !room || id === "home");
}

// board size: in the lobby the host's choice is written to the room so everybody sees it
window.setSize = function setSize(size) {
    boardSize = Number(size);
    document.querySelectorAll("#sizeField .size").forEach(btn => btn.classList.toggle("selected", btn.id === "size" + boardSize));
    lobbySet({ boardSize: boardSize });
};


/*
   The game is always the Anime Edition theme now.
   (Kept as a function so the room listener can still call it.)
*/
function applyTheme() {
    document.body.classList.add("anime-theme");
}


function generateCode() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let result = "";

    for (
        let i = 0;
        i < 6;
        i++
    ) {

        result +=
            chars[
                Math.floor(
                    Math.random()
                    * chars.length
                )
            ];

    }

    return result;

}


function shuffle(array) {

    const result =
        [...array];

    for (
        let i =
            result.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random()
                * (i + 1)
            );

        [
            result[i],
            result[j]
        ] =
        [
            result[j],
            result[i]
        ];

    }

    return result;

}


/* =========================================
   BALANCED PICK
   Splits the board evenly across the chosen
   series so a big library (One Piece) can't
   swamp the smaller ones. Leftover slots go to
   random series; if a series runs out of
   images, its share is handed to the others.
========================================= */

function pickBalanced(keys, size) {

    const pools =
        keys.map(
            key => shuffle(ANIME_LIBRARY[key] || [])
        );

    const picked =
        pools.map(() => []);

    let remaining = size;

    while (remaining > 0) {

        const open =
            pools
                .map((pool, i) => i)
                .filter(
                    i => picked[i].length < pools[i].length
                );

        if (open.length === 0) break;

        const share =
            Math.floor(remaining / open.length);

        if (share === 0) {

            // Fewer slots left than series: give one each to random series.
            shuffle(open)
                .slice(0, remaining)
                .forEach(i => {
                    picked[i].push(pools[i][picked[i].length]);
                });

            remaining = 0;

        } else {

            open.forEach(i => {
                const take =
                    Math.min(
                        share,
                        pools[i].length - picked[i].length
                    );

                for (let n = 0; n < take; n++) {
                    picked[i].push(pools[i][picked[i].length]);
                }

                remaining -= take;
            });

        }

    }

    return shuffle(picked.flat());

}


/* =========================================
   CREATE ROOM
========================================= */

/* =========================================
   HEADBANZ MODE
   AniList (free API) gives hundreds of characters
   with images. If it can't be reached, the built-in
   names below keep the mode working (name-only cards).
========================================= */
/* Hidden for now in Headbanz + Imposter (tell me when to unhide): empty this list to bring them back */
const HB_HIDDEN_SERIES = ["aot", "mha", "rezero"];
const hbVisibleKeys = keys => (keys || []).filter(k => !HB_HIDDEN_SERIES.includes(k));
let homeMode = "gw", homeDiff = "normal", homeRounds = 5;
const HB_SERIES = {
    onepiece: { id: 21, re: /one piece/i, label: "One Piece", names: "Monkey D. Luffy|Roronoa Zoro|Nami|Usopp|Sanji|Tony Tony Chopper|Nico Robin|Franky|Brook|Portgas D. Ace|Trafalgar Law|Shanks|Dracule Mihawk|Boa Hancock|Kaido|Sabo" },
    naruto: { id: 1735, re: /naruto/i, label: "Naruto", names: "Naruto Uzumaki|Sasuke Uchiha|Sakura Haruno|Kakashi Hatake|Itachi Uchiha|Gaara|Rock Lee|Hinata Hyuga|Shikamaru Nara|Jiraiya|Tsunade|Orochimaru|Minato Namikaze|Madara Uchiha|Obito Uchiha|Might Guy" },
    dragonball: { id: 813, re: /dragon ball/i, skip: /\bGT\b/i, label: "Dragon Ball", names: "Goku|Vegeta|Gohan|Piccolo|Krillin|Trunks|Frieza|Cell|Majin Buu|Bulma|Master Roshi|Android 18|Beerus|Whis|Broly|Jiren" },
    jjk: { id: 113415, re: /jujutsu/i, label: "Jujutsu Kaisen", names: "Yuji Itadori|Megumi Fushiguro|Nobara Kugisaki|Satoru Gojo|Ryomen Sukuna|Maki Zenin|Toge Inumaki|Panda|Kento Nanami|Suguru Geto|Mahito|Yuta Okkotsu|Toji Fushiguro|Aoi Todo|Choso|Kenjaku" },
    demonslayer: { id: 101922, re: /kimetsu|demon slayer/i, label: "Demon Slayer", names: "Tanjiro Kamado|Nezuko Kamado|Zenitsu Agatsuma|Inosuke Hashibira|Giyu Tomioka|Shinobu Kocho|Kyojuro Rengoku|Tengen Uzui|Mitsuri Kanroji|Muichiro Tokito|Muzan Kibutsuji|Akaza|Doma|Kokushibo|Daki|Kanao Tsuyuri" },
    bleach: { id: 269, re: /bleach/i, label: "Bleach", names: "Ichigo Kurosaki|Rukia Kuchiki|Orihime Inoue|Uryu Ishida|Renji Abarai|Byakuya Kuchiki|Kisuke Urahara|Toshiro Hitsugaya|Kenpachi Zaraki|Sosuke Aizen|Gin Ichimaru|Ulquiorra Cifer|Grimmjow Jaegerjaquez|Yoruichi Shihoin|Yhwach|Yasutora Sado" },
    aot: { id: 16498, re: /shingeki|attack on titan/i, label: "Attack on Titan", names: "Eren Yeager|Mikasa Ackerman|Armin Arlert|Levi Ackerman|Erwin Smith|Hange Zoe|Reiner Braun|Annie Leonhart|Jean Kirstein|Sasha Blouse|Historia Reiss|Zeke Yeager|Connie Springer|Bertholdt Hoover" },
    mha: { id: 21459, re: /hero academia|boku no hero/i, label: "My Hero Academia", names: "Izuku Midoriya|Katsuki Bakugo|Shoto Todoroki|Ochaco Uraraka|Tenya Iida|All Might|Eraser Head|Endeavor|Hawks|Tomura Shigaraki|Dabi|Himiko Toga|Tsuyu Asui|Momo Yaoyorozu" },
    hxh: { id: 11061, re: /hunter/i, label: "Hunter x Hunter", names: "Gon Freecss|Killua Zoldyck|Kurapika|Leorio Paradinight|Hisoka Morow|Chrollo Lucilfer|Meruem|Isaac Netero|Illumi Zoldyck|Ging Freecss|Biscuit Krueger|Kite|Feitan|Neferpitou" },
    deathnote: { id: 1535, re: /death note/i, label: "Death Note", names: "Light Yagami|L|Misa Amane|Ryuk|Near|Mello|Watari|Soichiro Yagami|Rem|Teru Mikami|Kiyomi Takada|Touta Matsuda" },
    chainsaw: { id: 127230, re: /chainsaw/i, label: "Chainsaw Man", names: "Denji|Power|Aki Hayakawa|Makima|Pochita|Kobeni Higashiyama|Himeno|Angel Devil|Reze|Quanxi|Kishibe|Asa Mitaka" },
    blackclover: { id: 97940, re: /black clover/i, label: "Black Clover", names: "Asta|Yuno|Noelle Silva|Yami Sukehiro|Julius Novachrono|Mimosa Vermillion|Luck Voltia|Magna Swing|Vanessa Enoteca|Charmy Pappitson|Zora Ideale|Nacht Faust|Fuegoleon Vermillion" },
    jojo: { id: 14719, re: /jojo/i, label: "JoJo's Bizarre Adventure", names: "Jotaro Kujo|Joseph Joestar|Jonathan Joestar|Dio Brando|Giorno Giovanna|Josuke Higashikata|Jolyne Cujoh|Noriaki Kakyoin|Jean Pierre Polnareff|Bruno Bucciarati|Yoshikage Kira|Diavolo|Johnny Joestar|Gyro Zeppeli" },
    rezero: { id: 21355, re: /re:?zero/i, label: "Re:Zero", names: "Subaru Natsuki|Emilia|Rem|Ram|Beatrice|Puck|Roswaal L Mathers|Felt|Reinhard van Astrea|Echidna|Otto Suwen|Garfiel Tinsel|Wilhelm van Astrea" },
    fireforce: { id: 105310, re: /fire force|enen/i, label: "Fire Force", names: "Shinra Kusakabe|Arthur Boyle|Maki Oze|Tamaki Kotatsu|Iris|Sho Kusakabe|Takehisa Hinawa|Akitaru Obi|Benimaru Shinmon|Princess Hibana|Vulcan Joseph|Rekka Hoshimiya" },
    frieren: { id: 154587, re: /frieren|sousou/i, label: "Frieren", names: "Frieren|Fern|Stark|Himmel|Heiter|Eisen|Flamme|Serie|Sein|Ubel|Land|Denken|Methode|Aura" },
    gachiakuta: { id: 178025, re: /gachiakuta/i, label: "Gachiakuta", names: "Rudo|Enjin|Riyo|Zanka|Jabber" },
    windbreaker: { id: 163270, re: /wind breaker/i, label: "Wind Breaker", names: "Haruka Sakura|Hajime Umemiya|Akihiko Nirei|Kotoha Tachibana|Jo Togame|Toma Hiragi|Kyotaro Sugishita|Mitsuki Kiryu" }
};
const HB_PAGES = { easy: 1, normal: 3, hard: 6 };   // 25 characters per page, most popular first
const HB_Q = "query($id:Int,$search:String,$page:Int){Media(id:$id,search:$search,type:ANIME,sort:POPULARITY_DESC){title{romaji english} characters(page:$page,perPage:25,sort:[FAVOURITES_DESC]){pageInfo{hasNextPage lastPage} nodes{id name{full native alternative} image{large} favourites}}}}";

/* Lobby settings panel: shows the room's mode. Only the series tiles allowed by that mode are visible. */
function applyModeUI(t) {
    homeMode = t;
    const multi = t === "hb" || t === "im";
    document.body.classList.toggle("hb-mode", multi || t === "uno");
    document.body.classList.toggle("uno-mode", t === "uno");
    $("sizeField").classList.toggle("hidden", t !== "gw");
    $("diffField").classList.toggle("hidden", !multi);
    $("hbRoundsBox").classList.toggle("hidden", t !== "hb");
    $("imBox").classList.toggle("hidden", t !== "im");
    const picked = document.querySelectorAll("#animePoll input:checked").length;
    $("modeHint").textContent = {
        gw: "Classic board: characters are drawn from every series you tick.",
        hb: "Characters are drawn at random from every series you tick.",
        im: "The secret character comes from one of the series you tick.",
        uno: "Pick exactly 4 series (" + picked + "/4): they become the 4 colours of the deck."
    }[t] || "";
}
window.setGameType = function (t) { pickMode(MODE_OF_KEY[t] || "classic"); };

window.setDiff = function (d) {
    homeDiff = d;
    document.querySelectorAll(".dbtn").forEach(b => b.classList.toggle("selected", b.dataset.d === d));
    lobbySet({ difficulty: d });
};

const aniSleep = ms => new Promise(z => setTimeout(z, ms));
let aniLast = 0;
async function aniFetch(vars, query) {
    let lastErr;
    for (let attempt = 0; attempt < 6; attempt++) {
        // stay under AniList's request limit
        const wait = Math.max(0, aniLast + 750 - Date.now()); aniLast = Date.now() + wait; if (wait) await aniSleep(wait);
        const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
        try {
            const r = await fetch("https://graphql.anilist.co", { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify({ query: query || HB_Q, variables: vars }) });
            clearTimeout(timer);
            if (r.status === 429 || r.status >= 500) {
                const ra = Number(r.headers.get("Retry-After")) || 0;
                lastErr = new Error("AniList " + r.status);
                await aniSleep(Math.max(ra * 1000, 1500 * Math.pow(2, attempt))); continue;
            }
            if (!r.ok) throw Object.assign(new Error("AniList " + r.status), { fatal: true });
            const j = await r.json();
            if (j.errors || !j.data || !j.data.Media) throw Object.assign(new Error("AniList error"), { fatal: true });
            return j.data.Media;
        } catch (e) {
            clearTimeout(timer);
            if (e.fatal) throw e;
            lastErr = e; await aniSleep(1500 * Math.pow(2, attempt));   // network hiccup or timeout: try again
        }
    }
    throw lastErr || new Error("AniList unreachable");
}

/* ---------- every canon season / sequel of a series ----------
   AniList has one entry per season, so a series is the first entry plus everything linked to it as
   SEQUEL / PREQUEL (TV seasons, canon movies, ONAs). Spin-offs, recaps, alternate versions and
   anime-original sequels listed in `skip` (e.g. Dragon Ball GT) are left out. */
const HB_REL = "query($id:Int,$search:String){Media(id:$id,search:$search,type:ANIME,sort:POPULARITY_DESC){id type format title{romaji english} relations{edges{relationType node{id type format title{romaji english}}}}}}";
const HB_FORMATS = ["TV", "MOVIE", "ONA"], HB_MAX_ENTRIES = 14, hbFamMem = {};
const hbTitle = t => ((t && (t.romaji || "")) + " " + (t && (t.english || ""))).trim();
async function hbFranchise(key) {
    if (hbFamMem[key]) return hbFamMem[key];
    const fk = "gw_hbfam_" + key;
    try { const c = JSON.parse(localStorage.getItem(fk) || "null"); if (c && Date.now() - c.t < 7 * 24 * 3600e3 && c.ids && c.ids.length) return (hbFamMem[key] = c.ids); } catch (e) {}
    const s0 = HB_SERIES[key], seen = new Set(), keep = [], queue = [];
    let first = await aniFetch({ id: s0.id, search: null }, HB_REL);
    if (!s0.re.test(hbTitle(first.title))) first = await aniFetch({ id: null, search: s0.label }, HB_REL);   // wrong id: find it by title
    seen.add(first.id); queue.push(first);
    while (queue.length && seen.size < 40 && keep.length < HB_MAX_ENTRIES) {
        const m = queue.shift();
        if (HB_FORMATS.includes(m.format) && !(s0.skip && s0.skip.test(hbTitle(m.title)))) keep.push(m.id);
        for (const e of ((m.relations && m.relations.edges) || [])) {
            const n = e.node;
            if (!n || (e.relationType !== "SEQUEL" && e.relationType !== "PREQUEL") || n.type !== "ANIME" || seen.has(n.id)) continue;
            seen.add(n.id);
            if (s0.skip && s0.skip.test(hbTitle(n.title))) continue;
            queue.push(await aniFetch({ id: n.id, search: null }, HB_REL));
        }
    }
    keep.sort((x, y) => x - y);
    hbFamMem[key] = keep;
    try { localStorage.setItem(fk, JSON.stringify({ t: Date.now(), ids: keep })); } catch (e) {}
    return keep;
}
async function hbSeriesChars(key, maxPages, onPage) {
    const s = HB_SERIES[key], ids = await hbFranchise(key), merged = new Map();
    const per = ids.length <= 2 ? 12 : ids.length <= 4 ? 8 : 5;     // pages of 25 per season: the popular ones are always on the first pages
    for (let k = 0; k < ids.length; k++) {
        for (let p = 1; p <= per; p++) {
            const m = await aniFetch({ id: ids[k], search: null, page: p });
            const ch = m.characters || {}, nodes = ch.nodes || [], pi = ch.pageInfo || {};
            nodes.forEach(n => {
                const img = n.image && n.image.large && !/default/i.test(n.image.large) ? n.image.large : "";
                const old = merged.get(n.id), f = Number(n.favourites) || 0;
                if (old) { old.f = Math.max(old.f, f); if (!old.i && img) old.i = img.replace(HB_IMG, ""); return; }
                merged.set(n.id, { id: "a" + n.id, n: n.name.full, a: [...(n.name.alternative || []), n.name.native].filter(Boolean).slice(0, 3), i: img.replace(HB_IMG, ""), s: s.label, f });
            });
            if (onPage) onPage(k + p / per, ids.length);
            if (!nodes.length || pi.hasNextPage === false || (pi.hasNextPage == null && nodes.length < 25)) break;
        }
    }
    return [...merged.values()].sort((x, y) => y.f - x.f).slice(0, HB_MAX_CHARS).map((c, i) => Object.assign(c, { r: i }));
}

const HB_COLORS = ["#ff4d6d", "#3ea6ff", "#ffd23f", "#2ec4a6", "#b388ff", "#ff9f1c"];
const HB_IMG = "https://s4.anilist.co/file/anilistcdn/character/large/";
const hbImg = c => !c || !c.i ? "" : (/^http/.test(c.i) ? c.i : HB_IMG + c.i);
const nz = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const arr = x => Array.isArray(x) ? x : (x ? Object.values(x) : []);
const hbEl = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const hbBad = c => /narrat|announc|commentat|newscast|news ?anchor|broadcaster|reporter|presenter|referee|emcee/i.test([c.n].concat(c.a || []).join(" "));
const hbTapTimers = new WeakMap();
function hbTapTwice(btnOrId, armedText) {
    const b = typeof btnOrId === "string" ? $(btnOrId) : btnOrId;
    if (!b) return true;
    if (b.dataset.armed === "1") { clearTimeout(hbTapTimers.get(b)); b.dataset.armed = ""; b.textContent = b.dataset.label; return true; }
    b.dataset.armed = "1"; b.dataset.label = b.textContent; b.textContent = armedText;
    hbTapTimers.set(b, setTimeout(() => { b.dataset.armed = ""; b.textContent = b.dataset.label; }, 3000));
    return false;
}
const hbSlim = c => ({ id: c.id, n: c.n, a: (c.a || []).slice(0, 3), i: c.i || "", s: c.s });
let hbPool = null, hbRoundKey = "", hbSig = "", hbSeen = { wrong: 0, order: 0, done: false, phase: "" };

window.setRounds = function (n) {
    homeRounds = n;
    document.querySelectorAll(".rbtn").forEach(b => b.classList.toggle("selected", Number(b.dataset.r) === n));
    lobbySet({ rounds: n });
};

/* ---------- pool (AniList, cached, fallback names) ---------- */
const hbMem = {};
// packs.json (made once with build-packs.html) holds every series ready to use, so no AniList wait
let hbPacksP = null;
function hbLoadPacks() {
    if (!hbPacksP) hbPacksP = fetch("packs.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : null).then(j => j && j.series ? j : null).catch(() => null);
    return hbPacksP;
}
const HB_MAX_CHARS = 400;   // per series: everything if the series is smaller, otherwise the 300 most popular
async function hbBuildPool(keys, diff, progress) {
    const todo = keys.filter(k => HB_SERIES[k]), lists = {}, packs = await hbLoadPacks();
    const ck = k => "gw_hbfull3_" + k;
    todo.forEach(k => {
        if (packs && packs.series[k] && packs.series[k].chars && packs.series[k].chars.length) {
            lists[k] = hbMem[k] = packs.series[k].chars.map(r => ({ id: r[0], n: r[1], a: r[2], i: r[3], f: r[4] || 0, s: HB_SERIES[k].label })).filter(x => !hbBad(x)).slice(0, HB_MAX_CHARS);
            return;
        }
        if (hbMem[k]) { lists[k] = hbMem[k]; return; }
        try {
            const c = JSON.parse(localStorage.getItem(ck(k)) || "null");
            if (c && Date.now() - c.t < 24 * 3600e3 && c.l && c.l.length) {
                lists[k] = c.l.map(r => ({ id: r[0], n: r[1], a: r[2], i: r[3], f: r[4] || 0, s: HB_SERIES[k].label })).filter(x => !hbBad(x));
                hbMem[k] = lists[k];
            }
        } catch (e) {}
    });
    for (let pass = 0; pass < 4; pass++) {
        const missing = todo.filter(k => !lists[k]);
        if (!missing.length) break;
        if (pass) await aniSleep(3000);
        for (const k of missing) {
            const done = todo.filter(x => lists[x]).length;
            const label = "Downloading " + HB_SERIES[k].label + " (" + (done + 1) + "/" + todo.length + ")";
            if (progress) progress(done / todo.length * 100, label + "...");
            try {
                const list = await hbSeriesChars(k, Math.ceil(HB_MAX_CHARS / 25), (p, last) => { const tot = last || Math.floor(p) + 1; if (progress) progress((done + Math.min(0.97, p / tot)) / todo.length * 100, label + "  season " + Math.min(tot, Math.floor(p) + 1) + "/" + tot); });
                if (list.length) {
                    lists[k] = list; hbMem[k] = list;
                    try { localStorage.setItem(ck(k), JSON.stringify({ t: Date.now(), l: list.map(c => [c.id, c.n, c.a, c.i, c.f || 0]) })); } catch (e) {}
                }
            } catch (e) { console.warn("AniList failed for", k, e); }
        }
    }
    const failed = todo.filter(k => !lists[k]);
    if (failed.length) throw new Error("Couldn't load " + failed.map(k => HB_SERIES[k].label).join(", ") + " from AniList. Check your connection and try again.");
    const seenN = new Set(), seenId = new Set(), pool = [];
    todo.forEach(k => lists[k].forEach(c => {
        if (hbBad(c)) return; const nn = nz(c.n);
        if (seenId.has(String(c.id)) || seenN.has(nn)) return;
        if ((c.a || []).some(x => nz(x).length >= 6 && seenN.has(nz(x)))) return;
        seenId.add(String(c.id)); seenN.add(nn); pool.push(c);
    }));
    if (progress) progress(100, "Characters ready");
    return pool;
}
function sameCharHB(a, b) {
    if (!a || !b) return false;
    if (String(a.id) === String(b.id)) return true;
    const A = [a.n].concat(a.a || []).map(nz).filter(x => x.length >= 3), B = [b.n].concat(b.a || []).map(nz);
    return A.some(x => B.includes(x));
}
function hbAssign(pool, players, depth) {
    const by = {}; pool.forEach(c => { const l = (by[c.s] = by[c.s] || []); if (l.length < depth) l.push(c); });   // difficulty only limits who can be DEALT
    const series = shuffle(Object.keys(by)), picked = [], out = {};
    players.forEach((p, i) => {
        let c, t = 0;
        do { const l = by[series[(i + t) % series.length]]; const li = l.filter(x => x.i); const src = li.length ? li : l; c = src[Math.random() * src.length | 0]; t++; }
        while (picked.some(x => sameCharHB(x, c)) && t < 60);
        if (picked.some(x => sameCharHB(x, c))) c = pool.find(x => !picked.some(y => sameCharHB(x, y)));
        picked.push(c); out["p" + p] = hbSlim(c);
    });
    return out;
}

/* (rooms are created once in the shared lobby; Headbanz only needs its character pool prefetched there) */
async function hbLoadPool(keys, roundKey) {
    for (let t = 0; t < 6; t++) {
        try {
            const p = await hbBuildPool(keys, "hard", (pct, label) => { if (roundKey === hbRoundKey) hbPackShow(pct, label); });
            if (roundKey !== hbRoundKey) return;
            hbPool = p; hbPackHide(600); if (!$("hbPicker").classList.contains("hidden")) hbList();
            return;
        } catch (e) { console.warn(e); hbPackShow(0, "Download interrupted. Retrying...", true); await aniSleep(4000); if (roundKey !== hbRoundKey) return; }
    }
    hbPackShow(0, "Couldn't load the character list. Reload the page to try again.", true);
}
let hbPackKey = "", hbPackLast = -1, hbPackWriteAt = 0;
function hbPackShow(pct, text, err) { const b = $("packBar"); b.classList.remove("hidden"); b.classList.toggle("err", !!err); $("packText").textContent = text; $("packFill").style.width = Math.max(2, Math.min(100, pct)) + "%"; }
function hbPackHide(ms) { setTimeout(() => $("packBar").classList.add("hidden"), ms || 0); }
function hbPackWrite(pct, force) {
    if (!room || !myPlayer) return;
    pct = Math.min(100, Math.round(pct));
    if (!force && (pct - hbPackLast < 4 || Date.now() - hbPackWriteAt < 1200)) return;
    hbPackLast = pct; hbPackWriteAt = Date.now();
    update(ref(db, "rooms/" + room + "/packs"), { ["p" + myPlayer]: pct }).catch(() => {});
}
async function hbPrefetch(keys, force) {
    const k = [...keys].sort().join(",");
    if (!keys.length || (k === hbPackKey && !force)) return;
    hbPackKey = k; hbPackLast = -1; hbPackWrite(0, true);
    for (let t = 0; t < 4; t++) {
        try {
            const pool = await hbBuildPool(keys, "hard", (pct, label) => { hbPackShow(pct, label); hbPackWrite(pct); });
            if (hbPackKey !== k) return;
            hbPool = pool; hbPackWrite(100, true);
            if (!$("packBar").classList.contains("hidden")) { hbPackShow(100, "All characters downloaded ✔"); hbPackHide(2200); }
            return;
        } catch (e) {
            console.warn(e); hbPackShow(0, "Download interrupted. Retrying...", true);
            await aniSleep(5000); if (hbPackKey !== k) return;
        }
    }
    hbPackKey = ""; hbPackShow(0, "Couldn't download the characters. Check your connection and reload the page.", true);
}
async function hbStart() { return hbBegin("first"); }

/* ---------- rounds (host only) ---------- */
async function hbBegin(kind) {
    const d = currentRoomData; if (!d || !amHost()) return;
    let keys = d.animes || [];
    if (kind !== "first") {
        const box = document.querySelector("#hbRound .anime-poll");
        if (box) keys = hbVisibleKeys([...box.querySelectorAll("input:checked")].map(c => c.value));
        if (!keys.length) { toast("Pick at least one series."); return; }
    }
    $("hbLoading").classList.remove("hidden"); { const lt = document.querySelector("#hbLoading div"); if (lt) lt.textContent = "Summoning characters..."; }
    try {
        // a new match seats everyone in the room; the next round of the same match keeps the same table
        const players = (kind === "first" || kind === "new") ? activeSlots(d) : arr(d.hb && d.hb.players).map(Number);
        if (players.length < 2) throw new Error("Need at least 2 players.");
        if (players.length > 4) throw new Error("Headbanz seats up to 4 players.");
        if (kind === "first" && !players.every(i => Number((d.packs || {})["p" + i]) >= 100)) throw new Error("Some players are still downloading the characters.");
        const pool = await hbBuildPool(keys, "hard", (pct, msg) => { const t = document.querySelector("#hbLoading div"); if (t) t.textContent = msg; });   // always the full list; difficulty is applied when dealing
        if (pool.length < players.length) throw new Error("Not enough characters in those series.");
        const chars = hbAssign(pool, players, (HB_PAGES[d.difficulty] || 3) * 25), zeros = () => Object.fromEntries(players.map(p => ["p" + p, 0]));
        const base = { phase: "play", chars, order: null, out: null, strikes: null, wrong: null, lastPts: null, matchDone: false, winner: null, tie: false };
        const upd = { animes: keys, status: "playing" };
        if (kind === "first" || kind === "new") {
            upd.matchId = Date.now();
            upd.hb = Object.assign(base, { players, n: players.length, round: 1, rounds: Number(d.rounds) || 5, scores: zeros(), firsts: zeros(), wins: zeros() });
        } else {
            Object.entries(base).forEach(([k, v]) => { upd["hb/" + k] = v; });
            upd["hb/round"] = (Number(d.hb.round) || 0) + 1;
            if (kind === "sudden") upd["hb/rounds"] = (Number(d.hb.rounds) || 5) + 1;
        }
        await update(ref(db, "rooms/" + room), upd);
    } catch (e) { console.error(e); toast("Could not start: " + (e.message || e)); }
    $("hbLoading").classList.add("hidden");
}
function hbStandings(hb) {
    const players = arr(hb.players).map(Number), duo = players.length === 2;
    const sc = hb.scores || {}, fi = hb.firsts || {}, wi = hb.wins || {};
    return players.map(p => ({ p, score: Number((duo ? wi : sc)["p" + p]) || 0, firsts: Number(fi["p" + p]) || 0 }))
        .sort((a, b) => b.score - a.score || b.firsts - a.firsts || a.p - b.p);
}
const hbTie = r => r.length > 1 && r[0].score === r[1].score && r[0].firsts === r[1].firsts;
window.hbShowFinal = async function () {
    const rows = hbStandings(currentRoomData.hb), tie = hbTie(rows);
    await update(ref(db, "rooms/" + room), { "hb/phase": "match", "hb/tie": tie, "hb/winner": tie ? null : rows[0].p });
};

/* ---------- player actions (atomic) ---------- */
function hbCheckEnd(hb) {
    const players = arr(hb.players).map(Number), N = players.length;
    const end = N === 2 ? (hb.order.length >= 1 || hb.out.length >= 1) : (hb.order.length + hb.out.length >= N);
    if (!end) return;
    hb.phase = "round";
    const pts = {}; players.forEach(p => { pts["p" + p] = 0; });
    hb.scores = hb.scores || {}; hb.firsts = hb.firsts || {}; hb.wins = hb.wins || {};
    if (N === 2) {
        const w = hb.order.length ? hb.order[0] : players.find(p => !hb.out.includes(p));
        pts["p" + w] = 1; hb.wins["p" + w] = (Number(hb.wins["p" + w]) || 0) + 1; hb.firsts["p" + w] = (Number(hb.firsts["p" + w]) || 0) + 1;
        hb.matchDone = hb.wins["p" + w] >= 2;
    } else {
        hb.order.forEach((p, i) => { pts["p" + p] = N - i; hb.scores["p" + p] = (Number(hb.scores["p" + p]) || 0) + N - i; });
        if (hb.order.length) hb.firsts["p" + hb.order[0]] = (Number(hb.firsts["p" + hb.order[0]]) || 0) + 1;
        hb.matchDone = Number(hb.round) >= Number(hb.rounds);
    }
    hb.lastPts = pts;
}
async function hbAct(fn) {
    try {
        await runTransaction(ref(db, "rooms/" + room + "/hb"), cur => {
            if (!cur || cur.phase !== "play") return;
            const hb = JSON.parse(JSON.stringify(cur));
            hb.order = arr(hb.order).map(Number); hb.out = arr(hb.out).map(Number); hb.wrong = arr(hb.wrong); hb.strikes = hb.strikes || {};
            if (fn(hb) === false) return;
            hbCheckEnd(hb);
            return hb;
        });
    } catch (e) { console.error(e); toast("Could not send that. Try again."); }
}
async function hbSubmit(c) {
    
    sfx("guess"); hbCloseGuess();
    const me = Number(myPlayer);
    await hbAct(hb => {
        if (hb.order.includes(me) || hb.out.includes(me)) return false;
        if (sameCharHB(c, hb.chars["p" + me])) { hb.order.push(me); return; }
        hb.wrong.push({ p: me, g: c.n });
        hb.strikes["p" + me] = (Number(hb.strikes["p" + me]) || 0) + 1;
        if (hb.strikes["p" + me] >= 3) hb.out.push(me);
    });
}
window.hbGiveUp = async function () {
    if (!hbTapTwice("hbGiveBtn", "Tap again to give up")) return;
    const me = Number(myPlayer);
    await hbAct(hb => { if (hb.order.includes(me) || hb.out.includes(me)) return false; hb.out.push(me); });
};

/* ---------- guess picker ---------- */
window.hbOpenGuess = function () { $("hbPicker").classList.remove("hidden"); $("hbSearch").value = ""; hbList(); $("hbSearch").focus(); };
function hbCloseGuess() { $("hbPicker").classList.add("hidden"); }
window.hbCloseGuess = hbCloseGuess;
function hbList() {
    const d = currentRoomData; if (!d || !d.hb) return;
    const base = (hbPool || []).slice();
    Object.values(d.hb.chars || {}).forEach(c => { if (!base.some(x => sameCharHB(x, c))) base.push(c); });
    const q = nz($("hbSearch").value), toks = q.split(" ").filter(Boolean);
    const bad = new Set(arr(d.hb.wrong).filter(w => Number(w.p) === Number(myPlayer)).map(w => nz(w.g)));
    const res = [];
    base.forEach(c => {
        if (bad.has(nz(c.n))) return;
        const hay = nz([c.n, ...(c.a || [])].join(" "));
        if (toks.every(t => hay.includes(t))) res.push({ c, s: nz(c.n).startsWith(q) ? 0 : 1 });
    });
    res.sort((x, y) => x.s - y.s || x.c.n.localeCompare(y.c.n));
    const box = $("hbList"); box.innerHTML = "";
    if (!hbPool) { box.textContent = "Loading characters..."; return; }
    res.slice(0, 10).forEach(r => {
        const b = hbEl("button", "hb-opt");
        if (r.c.i) b.appendChild(makeImg(hbImg(r.c)));
        b.appendChild(hbEl("span", "", r.c.n + " (" + r.c.s + ")"));
        b.onclick = () => hbSubmit(r.c); box.appendChild(b);
    });
    if (!res.length) box.textContent = "No match. Try another spelling or nickname.";
}
$("hbSearch").addEventListener("input", hbList);

/* ---------- screen ---------- */
function hbCard(data, p, hb, opts) {
    const c = hb.chars["p" + p] || { n: "?", s: "" }, nm = (data["player" + p] || {}).name || "Player " + p;
    const order = arr(hb.order).map(Number), out = arr(hb.out).map(Number);
    const card = hbEl("div", "hb-pcard" + (opts.hidden ? " hq" : "") + (order.includes(p) ? " solved" : "") + (out.includes(p) ? " busted" : ""));
    card.style.setProperty("--pc", HB_COLORS[p - 1]); card.dataset.emote = "p" + p;
    const who = hbEl("div", "hb-who"); who.appendChild(avatarEl(pPub(data, p), { size: 40 }));
    who.appendChild(hbEl("div", "hb-pname", nm + (p === Number(myPlayer) ? " (you)" : "")));
    card.appendChild(who);
    if (order.includes(p)) card.appendChild(hbEl("div", "hb-badge", "#" + (order.indexOf(p) + 1) + (arr(hb.players).length > 2 ? "  +" + (arr(hb.players).length - order.indexOf(p)) : "  ✔")));
    else if (out.includes(p)) card.appendChild(hbEl("div", "hb-badge out", "OUT"));
    if (opts.hidden) { card.appendChild(hbEl("div", "hb-q", "?")); card.appendChild(hbEl("div", "hb-series", "Only you can't see this card")); return card; }
    if (c.i) { const w = hbEl("div", "hb-pic"); w.appendChild(makeImg(hbImg(c))); card.appendChild(w); }
    card.appendChild(hbEl("div", "hb-name" + (c.i ? "" : " big"), c.n));
    card.appendChild(hbEl("div", "hb-series", c.s));
    return card;
}
function showHB(data) {
    document.body.classList.add("hb-mode");
    showOnly("hb"); resultShown = false; awaitingGuess = false;
    const hb = data.hb; if (!hb || !hb.chars) return;
    const me = Number(myPlayer), players = arr(hb.players).map(Number), duo = players.length === 2;
    const order = arr(hb.order).map(Number), out = arr(hb.out).map(Number), wrong = arr(hb.wrong);
    const nm = n => (data["player" + n] || {}).name || "Player " + n;
    const key = hb.round + ":" + Object.values(hb.chars).map(c => c.id).join(",");
    if (key !== hbRoundKey) { hbRoundKey = key; hbSig = ""; hbCloseGuess(); hbSeen = { wrong: 0, order: 0, done: false, phase: "" }; hbPool = null; hbLoadPool(data.animes || [], key); }

    const mineDone = order.includes(me) || out.includes(me), playing = hb.phase === "play";
    const sc = hbStandings(hb).map(r => nm(r.p) + " " + r.score).join("  ·  ");
    $("hbTurn").textContent = "Round " + hb.round + (duo ? " · Best of 3" : " of " + hb.rounds);
    $("hbStatus").textContent = (duo ? "Wins: " : "Points: ") + sc;
    $("hbGuessBtn").disabled = !playing || mineDone; $("hbGiveBtn").disabled = !playing || mineDone;

    const sig = key + "|" + order.join() + "|" + out.join() + "|" + hb.phase;
    if (sig !== hbSig) {
        hbSig = sig;
        const box = $("hbCards"); box.innerHTML = "";
        players.filter(p => p !== me).forEach(p => box.appendChild(hbCard(data, p, hb, {})));
        box.appendChild(hbCard(data, me, hb, { hidden: !(mineDone || hb.phase !== "play") }));
        if (hb.phase === "play") { $("hbRound").classList.add("hidden"); } else hbRenderRound(data);
    }

    const strikes = Number((hb.strikes || {})["p" + me]) || 0, mine = $("hbMine"); mine.textContent = "";
    if (playing) {
        mine.appendChild(hbEl("div", "", mineDone ? (out.includes(me) ? "You're out this round. Watch the others." : "You got it! Keep watching the others.") : "Your guesses: " + "❤️".repeat(3 - strikes) + "🖤".repeat(strikes)));
        players.forEach(p => { const ws = wrong.filter(w => Number(w.p) === p).map(w => w.g); if (ws.length) mine.appendChild(hbEl("div", "hb-miss", (p === me ? "Your" : nm(p) + "'s") + " misses: " + ws.join(", "))); });
    }
    // feedback sounds
    const myWrong = wrong.filter(w => Number(w.p) === me).length;
    if (key === hbRoundKey && playing) {
        if (myWrong > hbSeen.wrong && hbSeen.phase) { sfx("lose"); toast(strikes >= 3 ? "Three strikes. You're out this round." : "Not that one. " + (3 - strikes) + " guess" + (3 - strikes === 1 ? "" : "es") + " left."); }
        if (order.length > hbSeen.order && hbSeen.phase) sfx(order[order.length - 1] === me ? "win" : "pick");
    }
    if (hb.phase !== hbSeen.phase && hbSeen.phase) {
        if (hb.phase === "match") { if (Number(hb.winner) !== me) sfx("lose"); }
        else if (hb.phase === "round") { sfx(order.includes(me) ? "win" : "lose"); if (order.includes(me) && !strikes) achNow("hb_flawless"); }
        else if (hb.phase === "play") titleCard({ kicker: "MIND LINK", title: "ROUND " + hb.round, sub: duo ? "First to 2 wins" : hb.round + " of " + hb.rounds, kanji: "心", color: "#b06bff", ms: 1300 });
        if (hb.phase === "round") hbWinSound(hb);
    }
    if (hb.phase === "match") hbFinalSequence(data); else if (vxKey && vxKey.startsWith("hb:")) { closeResults(); vxKey = ""; }
    hbSeen.wrong = myWrong; hbSeen.order = order.length; hbSeen.phase = hb.phase;

    // everyone left unfinished is offline? the host closes the round
    if (playing && amHost()) {
        const pres = data.presence || {}, left = players.filter(p => !order.includes(p) && !out.includes(p));
        if (left.length && left.every(p => pres["p" + p] === false)) hbAct(h => { left.forEach(p => { if (!h.order.includes(p) && !h.out.includes(p)) h.out.push(p); }); });
    }
}
/* final Headbanz result: the shared cinematic on top of the score table */
function hbFinalSequence(data) {
    const hb = data.hb, me = Number(myPlayer), key = "hb:" + (data.matchId || "") + ":" + hb.round + ":" + (hb.tie ? "t" : hb.winner);
    if (vxKey === key) return; vxKey = key;
    const rows = hbStandings(hb), duo = arr(hb.players).length === 2, won = !hb.tie && Number(hb.winner) === me;
    const prog = recordOnce(key, "hb", hb.tie ? null : won, { ach: won ? ["hb_win"] : [] });
    showResults({
        outcome: hb.tie ? "draw" : won ? "win" : "lose", mode: "hb", color: "#b06bff", kicker: "HEADBANZ · FINAL",
        title: hb.tie ? "DEAD HEAT" : won ? "VICTORY" : "DEFEAT", kanji: hb.tie ? "引分" : won ? "勝利" : "敗北",
        subtitle: hb.tie ? "Tied at the top. Sudden death decides it." : won ? "You read the room better than anyone." : pName(data, hb.winner) + " wins the match.",
        podium: rows.map(r => ({ player: pPub(data, r.p), score: r.score + (duo ? " W" : " pts"), label: r.firsts + " first" + (r.firsts === 1 ? "" : "s"), me: r.p === me, win: !hb.tie && r.p === Number(hb.winner) })),
        progress: prog,
        actions: matchActions({ again: amHost() ? { label: hb.tie ? "⚡ Sudden death" : "New match", fn: () => { closeResults(); hbBegin(hb.tie ? "sudden" : "new"); } } : null, details: true }),
        note: amHost() ? "" : "Waiting for " + pName(data, hostSlot(data)) + " (host) to pick what's next…"
    });
    winSoundForChar(hb.tie ? null : (hb.chars || {})["p" + hb.winner], won);
}
function hbRenderRound(data) {
    const hb = data.hb, box = $("hbRound"); box.textContent = ""; box.classList.remove("hidden");
    const players = arr(hb.players).map(Number), duo = players.length === 2, host = amHost();
    const order = arr(hb.order).map(Number), pts = hb.lastPts || {};
    const nm = n => (data["player" + n] || {}).name || "Player " + n;
    const final = hb.phase === "match";
    box.appendChild(hbEl("h2", "hb-ptitle", final ? "FINAL RESULT" : "ROUND " + hb.round + " RESULT"));
    if (final) box.appendChild(hbEl("div", "hb-champ", hb.tie ? "It's a tie!" : "🏆 " + nm(hb.winner) + " wins the match!"));
    if (!final) {
        const t = hbEl("table", "hb-table");
        const rows = order.concat(players.filter(p => !order.includes(p)));
        rows.forEach((p, i) => {
            const tr = hbEl("tr"), pl = hbEl("td", "", ""); pl.appendChild(playerChip(data, p, (order.includes(p) ? "#" + (i + 1) : "—") + " "));
            const ch = hbEl("td", "", (hb.chars["p" + p] || {}).n || "");
            const pt = hbEl("td", "hb-pts", duo ? (order.includes(p) || (pts["p" + p] > 0) ? "WINS ROUND" : "") : "+" + (pts["p" + p] || 0));
            tr.append(pl, ch, pt); t.appendChild(tr);
        });
        box.appendChild(t);
    }
    box.appendChild(hbEl("h3", "hb-ptitle small", duo ? "Match score (first to 2)" : "Total points"));
    const st = hbEl("table", "hb-table");
    hbStandings(hb).forEach((r, i) => { const tr = hbEl("tr"), a = hbEl("td"); a.appendChild(playerChip(data, r.p, (i + 1) + ". ")); tr.append(a, hbEl("td", "hb-pts", String(r.score) + (duo ? " win" + (r.score === 1 ? "" : "s") : " pts")), hbEl("td", "", r.firsts + " first" + (r.firsts === 1 ? "" : "s"))); st.appendChild(tr); });
    box.appendChild(st);

    if (!host) { box.appendChild(hbEl("p", "hb-wait", "Waiting for " + nm(hostSlot(data)) + " (host) to continue...")); }
    else {
        const needPicker = !(hb.phase === "round" && hb.matchDone);
        if (needPicker) {
            box.appendChild(hbEl("label", "", final ? "Series for the next match" : (hb.tie ? "Series for sudden death" : "Series for the next round")));
            const wrap = hbEl("div", "series-pick"), poll = hbEl("div", "anime-poll series-pick");
            document.querySelectorAll("#animePoll .anime-poll > label").forEach(l => {
                const c = l.cloneNode(true), inp = c.querySelector("input");
                inp.checked = arr(data.animes).includes(inp.value); inp.removeAttribute("checked"); inp.checked = arr(data.animes).includes(inp.value);
                poll.appendChild(c);
            });
            wrap.appendChild(poll); box.appendChild(wrap);
        }
        const go = hbEl("button", "pop", final ? (hb.tie ? "⚡ SUDDEN DEATH ROUND" : "🔄 NEW MATCH") : (hb.matchDone ? "🏁 SEE FINAL RESULT" : "▶ NEXT ROUND"));
        go.style.cssText = "width:100%;margin-top:14px";
        go.onclick = () => final ? hbBegin(hb.tie ? "sudden" : "new") : (hb.matchDone ? hbShowFinal() : hbBegin("next"));
        box.appendChild(go);
    }
    box.appendChild(endButtons(final));
}

/* =========================================================
   IMPOSTER MODE (3 to 6 players)
   Everyone sees the same character except the imposter.
   Clues (2 rounds, spoken on your call) -> vote -> result.
========================================================= */
let homeLaps = 1, imSig = "", imSeen = { phase: "", round: 0 }, imSkipKey = "";
window.setLaps = function (n) { homeLaps = n; document.querySelectorAll(".lapbtn").forEach(b => b.classList.toggle("selected", Number(b.dataset.l) === n)); lobbySet({ laps: n }); };

/* ---------- rounds (host only) ---------- */
function imDeal(pool, depth, used) {
    const by = {}; pool.forEach(c => { const l = (by[c.s] = by[c.s] || []); if (l.length < depth) l.push(c); });
    const series = Object.keys(by);
    for (let t = 0; t < 80; t++) {
        const l = by[series[Math.random() * series.length | 0]], li = l.filter(x => x.i), src = li.length ? li : l;
        const c = src[Math.random() * src.length | 0];
        if (!used.includes(String(c.id))) return hbSlim(c);
    }
    return hbSlim(pool[Math.random() * pool.length | 0]);
}
async function imBegin(kind) {
    const d = currentRoomData; if (!d || !amHost()) return;
    let keys = d.animes || [];
    if (kind !== "first") {
        const box = document.querySelector("#imPanel .anime-poll");
        if (box) keys = hbVisibleKeys([...box.querySelectorAll("input:checked")].map(c => c.value));
        if (!keys.length) { toast("Pick at least one series."); return; }
    }
    $("hbLoading").classList.remove("hidden"); { const lt = document.querySelector("#hbLoading div"); if (lt) lt.textContent = "Summoning characters..."; }
    try {
        const players = kind === "next" ? arr(d.im.players).map(Number) : activeSlots(d);
        if (players.length < 3) throw new Error("Imposter needs at least 3 players.");
        if (kind === "first" && !players.every(i => Number((d.packs || {})["p" + i]) >= 100)) throw new Error("Some players are still downloading the characters.");
        const pool = await hbBuildPool(keys, "hard", (pct, msg) => { const t = document.querySelector("#hbLoading div"); if (t) t.textContent = msg; });
        const used = kind === "next" ? arr(d.im.used).map(String) : [];
        const char = imDeal(pool, (HB_PAGES[d.difficulty] || 3) * 25, used);
        const zeros = () => Object.fromEntries(players.map(p => ["p" + p, 0]));
        const base = (round, impOrder) => ({ phase: "clues", char, imposter: impOrder[round - 1], order: shuffle(players), step: 0, votes: null, result: null, guess: null, accused: null, tally: null, matchDone: false, winner: null, winners: null, used: used.concat(String(char.id)) });
        const upd = { animes: keys, status: "playing" };
        if (kind === "first" || kind === "new") {
            upd.matchId = Date.now();
            const laps = Number(d.laps) || 1, impOrder = [];
            for (let l = 0; l < laps; l++) impOrder.push(...shuffle(players));
            upd.im = Object.assign(base(1, impOrder), { players, n: players.length, round: 1, rounds: players.length * laps, impOrder, scores: zeros(), impWins: zeros() });
        } else {
            const round = (Number(d.im.round) || 0) + 1;
            Object.entries(base(round, arr(d.im.impOrder).map(Number))).forEach(([k, v]) => { upd["im/" + k] = v; });
            upd["im/round"] = round;
        }
        await update(ref(db, "rooms/" + room), upd);
    } catch (e) { console.error(e); toast("Could not start: " + (e.message || e)); }
    $("hbLoading").classList.add("hidden");
}

/* ---------- atomic actions ---------- */
function imFinish(im, outcome) {
    const players = arr(im.players).map(Number), imp = Number(im.imposter), pts = {};
    players.forEach(p => { pts["p" + p] = p === imp ? (outcome === "escaped" ? 3 : outcome === "stolen" ? 2 : 0) : (outcome === "busted" ? 2 : outcome === "stolen" ? 1 : 0); });
    im.scores = im.scores || {}; im.impWins = im.impWins || {};
    players.forEach(p => { im.scores["p" + p] = (Number(im.scores["p" + p]) || 0) + pts["p" + p]; });
    if (outcome === "escaped" || outcome === "stolen") im.impWins["p" + imp] = (Number(im.impWins["p" + imp]) || 0) + 1;
    im.result = { outcome, pts }; im.phase = "result";
    im.matchDone = Number(im.round) >= Number(im.rounds);
}
function imTally(im) {
    const players = arr(im.players).map(Number), counts = {};
    players.forEach(p => { counts[p] = 0; });
    Object.values(im.votes || {}).forEach(t => { if (counts[t] != null) counts[t]++; });
    const max = Math.max(...Object.values(counts)), tops = players.filter(p => counts[p] === max);
    im.accused = tops.length === 1 && max > 0 ? tops[0] : 0;
    im.tally = Object.fromEntries(players.map(p => ["p" + p, counts[p]]));
    if (im.accused === Number(im.imposter)) im.phase = "guess"; else imFinish(im, "escaped");
}
function imVoteCheck(im, absent) {
    const need = arr(im.players).map(Number).filter(p => !absent.includes(p));
    if (need.length && need.every(p => (im.votes || {})["p" + p] != null)) imTally(im);
}
const imAbsent = () => { const d = currentRoomData, pres = (d && d.presence) || {}; return arr(d.im.players).map(Number).filter(p => pres["p" + p] === false); };
async function imAct(fn) {
    try {
        await runTransaction(ref(db, "rooms/" + room + "/im"), cur => {
            if (!cur) return;
            const im = JSON.parse(JSON.stringify(cur));
            im.order = arr(im.order).map(Number); im.players = arr(im.players).map(Number); im.votes = im.votes || {};
            if (fn(im) === false) return;
            return im;
        });
    } catch (e) { console.error(e); toast("Could not send that. Try again."); }
}
const imAdvance = im => { im.step = (Number(im.step) || 0) + 1; if (im.step >= im.order.length * 2) im.phase = "vote"; };
window.imDone = function (step) {
    const me = Number(myPlayer);
    sfx("pick");
    return imAct(im => { if (im.phase !== "clues" || Number(im.step) !== step) return false; if (im.order[step % im.order.length] !== me && !amHost()) return false; imAdvance(im); });
};
window.imVote = function (target) {
    const me = Number(myPlayer), absent = imAbsent(); sfx("pick");
    return imAct(im => { if (im.phase !== "vote" || target === me) return false; im.votes["p" + me] = target; imVoteCheck(im, absent); });
};
const imCancel = () => imAct(im => { if (im.phase === "result" || im.phase === "match") return false; imFinish(im, "cancelled"); });
async function imSubmitGuess(c) {
    imCloseGuess(); sfx("guess");
    await imAct(im => {
        if (im.phase !== "guess" || Number(im.imposter) !== Number(myPlayer)) return false;
        const ok = sameCharHB(c, im.char); im.guess = { g: c.n, ok }; imFinish(im, ok ? "stolen" : "busted");
    });
}
function imStandings(im) {
    const sc = im.scores || {}, iw = im.impWins || {};
    return arr(im.players).map(Number).map(p => ({ p, score: Number(sc["p" + p]) || 0, imp: Number(iw["p" + p]) || 0 })).sort((a, b) => b.score - a.score || b.imp - a.imp || a.p - b.p);
}
window.imShowFinal = async function () {
    const rows = imStandings(currentRoomData.im), top = rows[0];
    const winners = rows.filter(r => r.score === top.score && r.imp === top.imp).map(r => r.p);
    await update(ref(db, "rooms/" + room), { "im/phase": "match", "im/winners": winners, "im/winner": winners[0] });
};

/* ---------- guess picker (caught imposter) ---------- */
window.imOpenGuess = function () { $("imPicker").classList.remove("hidden"); $("imSearch").value = ""; imList(); $("imSearch").focus(); };
function imCloseGuess() { $("imPicker").classList.add("hidden"); }
window.imCloseGuess = imCloseGuess;
function imList() {
    const d = currentRoomData; if (!d || !d.im) return;
    const box = $("imList"); box.innerHTML = "";
    if (!hbPool) { box.textContent = "Loading characters..."; return; }
    const base = hbPool.slice(); if (!base.some(x => sameCharHB(x, d.im.char))) base.push(d.im.char);
    const q = nz($("imSearch").value), toks = q.split(" ").filter(Boolean), res = [];
    base.forEach(c => {
        const hay = nz([c.n, ...(c.a || [])].join(" "));
        if (toks.every(t => hay.includes(t))) res.push({ c, s: nz(c.n).startsWith(q) ? 0 : 1 });
    });
    res.sort((x, y) => x.s - y.s || x.c.n.localeCompare(y.c.n));
    res.slice(0, 10).forEach(r => {
        const b = hbEl("button", "hb-opt");
        if (r.c.i) b.appendChild(makeImg(hbImg(r.c)));
        b.appendChild(hbEl("span", "", r.c.n + " (" + r.c.s + ")"));
        b.onclick = () => imSubmitGuess(r.c); box.appendChild(b);
    });
    if (!res.length) box.textContent = "No match. Try another spelling or nickname.";
}
$("imSearch").addEventListener("input", imList);

/* ---------- screen ---------- */
function imCardEl(im, reveal) {
    const isImp = Number(im.imposter) === Number(myPlayer), c = im.char;
    const card = hbEl("div", "hb-pcard im-main" + (isImp && !reveal ? " hq" : ""));
    card.style.setProperty("--pc", isImp && !reveal ? "#ff4d6d" : "#ffd23f");
    if (isImp && !reveal) {
        card.appendChild(hbEl("div", "hb-pname", "YOU ARE THE IMPOSTER"));
        card.appendChild(hbEl("div", "hb-q", "?"));
        card.appendChild(hbEl("div", "hb-series", "Everyone else can see the character. Blend in with your clues."));
        return card;
    }
    card.appendChild(hbEl("div", "hb-pname", reveal ? "THE CHARACTER WAS" : "THE SECRET CHARACTER"));
    if (c.i) { const w = hbEl("div", "hb-pic"); w.appendChild(makeImg(hbImg(c))); card.appendChild(w); }
    card.appendChild(hbEl("div", "hb-name" + (c.i ? "" : " big"), c.n));
    card.appendChild(hbEl("div", "hb-series", c.s));
    if (!reveal) card.appendChild(hbEl("div", "im-forbid", "🚫 Don't say: " + [c.n].concat(arr(c.a)).filter(Boolean).join(" · ")));
    return card;
}
function imSeriesPicker(box, data) {
    box.appendChild(hbEl("label", "", "Series for the next " + (data.im.phase === "match" ? "match" : "round")));
    const wrap = hbEl("div", "series-pick"), poll = hbEl("div", "anime-poll series-pick");
    document.querySelectorAll("#animePoll .anime-poll > label").forEach(l => {
        const c = l.cloneNode(true), inp = c.querySelector("input");
        inp.removeAttribute("checked"); inp.checked = arr(data.animes).includes(inp.value); poll.appendChild(c);
    });
    wrap.appendChild(poll); box.appendChild(wrap);
}
function showIM(data) {
    document.body.classList.add("hb-mode");
    showOnly("im"); resultShown = false; awaitingGuess = false;
    const im = data.im; if (!im || !im.char) return;
    const me = Number(myPlayer), players = arr(im.players).map(Number), order = arr(im.order).map(Number);
    const nm = n => (data["player" + n] || {}).name || "Player " + n;
    const key = im.round + ":" + im.char.id;
    if (key !== hbRoundKey) { hbRoundKey = key; imSig = ""; imCloseGuess(); imSeen = { phase: "", round: 0 }; hbPool = null; hbLoadPool(data.animes || [], key); }

    $("imTurn").textContent = "Round " + im.round + " of " + im.rounds;
    $("imStatus").textContent = "Points: " + imStandings(im).map(r => nm(r.p) + " " + r.score).join("  ·  ");

    const sig = key + "|" + im.phase + "|" + (im.step || 0) + "|" + JSON.stringify(im.votes || {}) + "|" + (im.result ? im.result.outcome : "");
    if (sig !== imSig) {
        imSig = sig;
        const cardBox = $("imCard"); cardBox.textContent = "";
        cardBox.appendChild(imCardEl(im, im.phase === "result" || im.phase === "match"));
        imRenderPanel(data);
    }
    // sounds + celebration on phase changes
    if (im.phase !== imSeen.phase && imSeen.phase) {
        const imp = Number(im.imposter), oc = (im.result || {}).outcome, impWon = oc === "escaped" || oc === "stolen";
        if (im.phase === "vote") { sfx("heartbeat"); titleCard({ kicker: "SHADOW TRIAL", title: "VOTE", sub: "Who is the imposter?", kanji: "審", color: "#ff3355", ms: 1300 }); }
        else if (im.phase === "guess") { sfx("impact"); titleCard({ kicker: "UNMASKED", title: "CAUGHT!", sub: pName(data, imp) + " was the imposter", kanji: "露", color: "#ff3355", ms: 1500 }); }
        else if (im.phase === "clues") titleCard({ kicker: "SHADOW TRIAL", title: "ROUND " + im.round, sub: me === imp ? "You are the imposter. Blend in." : "Give clues. Never say the name.", kanji: "偽", color: "#ff3355", ms: 1500 });
        else if (im.phase === "result") {
            const iWon = oc !== "cancelled" && (me === imp ? impWon : !impWon);
            sfx(iWon ? "win" : "lose");
            if (oc === "escaped" && me === imp) achNow("im_escape");
            if (me !== imp && (im.votes || {})["p" + me] === imp) achNow("im_catch");
            const sk = Object.keys(HB_SERIES).find(k => HB_SERIES[k].label === im.char.s);
            if (oc !== "cancelled") winCelebrate(sk, iWon);
        }
    }
    if (im.phase === "match") imFinalSequence(data); else if (vxKey && vxKey.startsWith("im:")) { closeResults(); vxKey = ""; }
    imSeen.phase = im.phase;

    // host keeps the round moving when someone is offline
    if (amHost() && ["clues", "vote", "guess"].includes(im.phase)) {
        const pres = data.presence || {}, absent = players.filter(p => pres["p" + p] === false);
        if (absent.includes(Number(im.imposter))) { if (imSkipKey !== "c" + key) { imSkipKey = "c" + key; imCancel(); } }
        else if (im.phase === "clues" && absent.includes(order[(Number(im.step) || 0) % order.length])) {
            const k = "s" + key + im.step, st = Number(im.step);
            if (imSkipKey !== k) { imSkipKey = k; imAct(x => { if (x.phase !== "clues" || Number(x.step) !== st) return false; imAdvance(x); }); }
        } else if (im.phase === "vote" && players.filter(p => !absent.includes(p)).every(p => (im.votes || {})["p" + p] != null)) {
            if (imSkipKey !== "v" + key) { imSkipKey = "v" + key; imAct(x => { if (x.phase !== "vote") return false; imVoteCheck(x, absent); }); }
        }
    }
}
function imFinalSequence(data) {
    const im = data.im, me = Number(myPlayer), winners = arr(im.winners).map(Number), key = "im:" + (data.matchId || "") + ":" + im.round + ":" + winners.join(",");
    if (vxKey === key) return; vxKey = key;
    const won = winners.includes(me), tie = winners.length > 1;
    const prog = recordOnce(key, "im", won);
    showResults({
        outcome: won ? "win" : "lose", mode: "im", color: "#ff3355", kicker: "IMPOSTER · FINAL VERDICT",
        title: won ? (tie ? "SHARED VICTORY" : "VICTORY") : "DEFEAT", kanji: won ? "勝利" : "敗北",
        subtitle: won ? (tie ? "Tied for the crown with " + winners.filter(p => p !== me).map(p => pName(data, p)).join(" & ") + "." : "Nobody out-lied or out-read you.") : (tie ? winners.map(p => pName(data, p)).join(" & ") + " share the win." : pName(data, winners[0]) + " wins the trial."),
        podium: imStandings(im).map(r => ({ player: pPub(data, r.p), score: r.score + " pts", label: r.imp + " imposter win" + (r.imp === 1 ? "" : "s"), me: r.p === me, win: winners.includes(r.p) })),
        progress: prog,
        actions: matchActions({ again: amHost() ? { label: "New match", fn: () => { closeResults(); imBegin("new"); } } : null, details: true }),
        note: amHost() ? "" : "Waiting for " + pName(data, hostSlot(data)) + " (host) to pick what's next…"
    });
}
function imRenderPanel(data) {
    const im = data.im, box = $("imPanel"); box.textContent = "";
    const me = Number(myPlayer), players = arr(im.players).map(Number), order = arr(im.order).map(Number), host = amHost(), imp = Number(im.imposter);
    const nm = n => (data["player" + n] || {}).name || "Player " + n;
    const colored = (p, tag) => playerChip(data, p);

    if (im.phase === "clues") {
        const n = order.length, step = Number(im.step) || 0, speaker = order[step % n], lap = Math.floor(step / n) + 1;
        box.appendChild(hbEl("h2", "hb-ptitle", "CLUE ROUND " + lap + " OF 2"));
        box.appendChild(hbEl("p", "hb-wait", me === imp ? "Say a clue that sounds like you know the character." : "Say one clue about the character on your call. Never say the name."));
        const t = hbEl("table", "hb-table");
        order.forEach((p, i) => {
            const tr = hbEl("tr"), a = hbEl("td"); a.appendChild(colored(p));
            const b = hbEl("td", "hb-pts", i < step % n ? "✔ done" : i === step % n ? "🎤 speaking" : "waiting");
            tr.append(a, b); t.appendChild(tr);
        });
        box.appendChild(t);
        if (me === speaker) { const b = hbEl("button", "pop", "✅ I GAVE MY CLUE"); b.style.cssText = "width:100%;margin-top:14px"; b.onclick = () => imDone(step); box.appendChild(b); }
        else if (host) { const b = hbEl("button", "pop ghost", "Skip " + nm(speaker)); b.style.cssText = "width:100%;margin-top:14px"; b.onclick = () => imDone(step); box.appendChild(b); }
        else box.appendChild(hbEl("p", "hb-wait", "Waiting for " + nm(speaker) + "..."));
    } else if (im.phase === "vote") {
        const votes = im.votes || {}, mine = votes["p" + me];
        box.appendChild(hbEl("h2", "hb-ptitle", "WHO IS THE IMPOSTER?"));
        const grid = hbEl("div", "im-votes");
        players.filter(p => p !== me).forEach(p => {
            const b = hbEl("button", "pop im-vote" + (mine === p ? " picked" : ""));
            b.appendChild(avatarEl(pPub(data, p), { size: 56 })); b.appendChild(hbEl("span", "im-vote-n", nm(p)));
            b.appendChild(hbEl("small", "im-vote-s", votes["p" + p] != null ? "✔ voted" : "thinking…"));
            b.style.setProperty("--pc", HB_COLORS[p - 1]); b.onclick = () => imVote(p); b.dataset.emote = "p" + p; grid.appendChild(b);
        });
        box.appendChild(grid);
        box.appendChild(hbEl("p", "hb-wait", Object.keys(votes).length + " of " + players.length + " have voted" + (mine ? ". You can still change yours." : ".")));
    } else if (im.phase === "guess") {
        box.appendChild(hbEl("h2", "hb-ptitle", "CAUGHT!"));
        const p = hbEl("p", "hb-champ"); p.appendChild(colored(imp)); p.appendChild(document.createTextNode(" was the imposter."));
        box.appendChild(p);
        if (me === imp) {
            box.appendChild(hbEl("p", "hb-wait", "One last chance: name the character to steal points."));
            const b = hbEl("button", "pop", "🎯 GUESS THE CHARACTER"); b.style.cssText = "width:100%;margin-top:10px"; b.onclick = imOpenGuess; box.appendChild(b);
        } else box.appendChild(hbEl("p", "hb-wait", "Waiting for " + nm(imp) + " to guess the character..."));
    } else {
        const final = im.phase === "match", res = im.result || {}, pts = res.pts || {};
        box.appendChild(hbEl("h2", "hb-ptitle", final ? "FINAL RESULT" : "ROUND " + im.round + " RESULT"));
        if (final) {
            const w = arr(im.winners).map(Number), c = hbEl("div", "hb-champ");
            c.textContent = (w.length > 1 ? "🏆 It's a tie: " + w.map(nm).join(" & ") : "🏆 " + nm(w[0]) + " wins the match!");
            box.appendChild(c);
        } else {
            const p = hbEl("p", "hb-champ"); p.appendChild(document.createTextNode("The imposter was ")); p.appendChild(colored(imp)); box.appendChild(p);
            const g = im.guess ? '"' + im.guess.g + '"' : "";
            const text = {
                escaped: (im.accused ? nm(im.accused) + " was accused, but it wasn't the imposter." : "The vote was tied.") + " " + nm(imp) + " fooled everyone! +3",
                stolen: "Caught, but " + nm(imp) + " guessed " + g + " correctly! Imposter +2, crew +1 each.",
                busted: "Caught! " + nm(imp) + " guessed " + g + " (wrong). Crew +2 each.",
                cancelled: "The round was cancelled because the imposter left. No points."
            }[res.outcome] || "";
            box.appendChild(hbEl("p", "hb-wait", text));
            if (res.outcome !== "cancelled" && im.votes) {
                const vt = hbEl("table", "hb-table");
                players.forEach(p => { const t = (im.votes || {})["p" + p]; if (t == null) return; const tr = hbEl("tr"), a = hbEl("td"); a.appendChild(colored(p)); const b = hbEl("td"); b.appendChild(document.createTextNode("voted ")); b.appendChild(colored(t)); tr.append(a, b, hbEl("td", "hb-pts", t === imp ? "✔" : "✘")); vt.appendChild(tr); });
                box.appendChild(vt);
            }
        }
        box.appendChild(hbEl("h3", "hb-ptitle small", "Total points"));
        const st = hbEl("table", "hb-table");
        imStandings(im).forEach((r, i) => { const tr = hbEl("tr"), a = hbEl("td", "", (i + 1) + ". "); a.appendChild(colored(r.p)); tr.append(a, hbEl("td", "hb-pts", r.score + " pts" + (!final && pts["p" + r.p] ? "  (+" + pts["p" + r.p] + ")" : "")), hbEl("td", "", r.imp + " imposter win" + (r.imp === 1 ? "" : "s"))); st.appendChild(tr); });
        box.appendChild(st);
        if (!host) box.appendChild(hbEl("p", "hb-wait", "Waiting for " + nm(hostSlot(data)) + " (host) to continue..."));
        else {
            if (!(im.phase === "result" && im.matchDone)) imSeriesPicker(box, data);
            const go = hbEl("button", "pop", final ? "🔄 NEW MATCH" : (im.matchDone ? "🏁 SEE FINAL RESULT" : "▶ NEXT ROUND"));
            go.style.cssText = "width:100%;margin-top:14px";
            go.onclick = () => final ? imBegin("new") : (im.matchDone ? imShowFinal() : imBegin("next"));
            box.appendChild(go);
        }
        box.appendChild(endButtons(final));
    }
}

/* =========================================================
   ANIME UNO (2 to 6 players)
   4 anime = the 4 colours. 108 cards: 76 attribute cards (0-9), 8 Skip, 8 Reverse,
   8 Draw Two, 4 Wild (main characters), 4 Wild Draw Four (villains).
   + 16 SPECIAL cards (4 per anime): Freeze, Swap Hands, Ultimate (+5), Future Sight. 124 cards total.
   Each deck string: attributes 0..9 (| between values, a comma between the two characters)
   ; skip ; reverse ; draw two ; wild (hero) ; wild +4 (villain)
========================================================= */
const UNO_ATTR = ["Luck", "Defense", "Accuracy", "Stamina", "Intellect", "Technique", "Speed", "Spirit", "Strength", "Power"];
const UNO_SUIT = ["#e11b1b", "#2f6fe4", "#f2c200", "#2e9e5b"];
const UNO_DECKS = {
    onepiece: "Buggy|Franky,Jinbe|Usopp,Brook|Tony Tony Chopper,Rob Lucci|Nico Robin,Crocodile|Sabo,Portgas D. Ace|Sanji,Donquixote Doflamingo|Dracule Mihawk,Shanks|Roronoa Zoro,Kaido|Edward Newgate,Gol D. Roger;Aokiji,Boa Hancock;Trafalgar Law,Bartholomew Kuma;Nami,Charlotte Linlin;Monkey D. Luffy;Marshall D. Teach",
    naruto: "Konohamaru Sarutobi|Choji Akimichi,Hinata Hyuga|Tenten,Sakura Haruno|Kiba Inuzuka,Temari|Jiraiya,Orochimaru|Neji Hyuga,Gaara|Rock Lee,Might Guy|Tsunade,Kakashi Hatake|Sasuke Uchiha,Tobi|Pain,Tobirama Senju;Shikamaru Nara,Hashirama Senju;Minato Namikaze,Itachi Uchiha;Kakuzu,Hidan;Naruto Uzumaki;Madara Uchiha",
    bleach: "Kon|Yasutora Sado,Rangiku Matsumoto|Uryu Ishida,Soi Fon|Renji Abarai,Ikkaku Madarame|Kisuke Urahara,Ulquiorra Cifer|Byakuya Kuchiki,Grimmjow Jaegerjaquez|Yoruichi Shihoin,Tier Harribel|Shunsui Kyoraku,Coyote Starrk|Kenpachi Zaraki,Genryusai Yamamoto|Yhwach,Isshin Kurosaki;Toshiro Hitsugaya,Rukia Kuchiki;Orihime Inoue,Shinji Hirako;Mayuri Kurotsuchi,Gin Ichimaru;Ichigo Kurosaki;Sosuke Aizen",
    jjk: "Junpei Yoshino|Panda,Kiyotaka Ijichi|Nobara Kugisaki,Mai Zenin|Megumi Fushiguro,Noritoshi Kamo|Kento Nanami,Suguru Geto|Aoi Todo,Choso|Maki Zenin,Naoya Zenin|Hanami,Jogo|Toji Fushiguro,Kinji Hakari|Yuki Tsukumo,Hajime Kashimo;Toge Inumaki,Satoru Gojo;Shoko Ieiri,Yuta Okkotsu;Mahito,Kenjaku;Yuji Itadori;Ryomen Sukuna",
    dragonball: "Yamcha|Krillin,Master Roshi|Android 18,Android 17|Piccolo,Gohan|Bulma,Dr. Gero|Raditz,Nappa|Vegeta,Cooler|Beerus,Zamasu|Broly,Jiren|Goten,Android 16;Hit,Tien Shinhan;Trunks,Whis;Cell,Majin Buu;Goku;Frieza",
    demonslayer: "Genya Shinazugawa|Kanao Tsuyuri,Nezuko Kamado|Zenitsu Agatsuma,Inosuke Hashibira|Obanai Iguro,Mitsuri Kanroji|Tamayo,Kagaya Ubuyashiki|Tengen Uzui,Muichiro Tokito|Giyu Tomioka,Sanemi Shinazugawa|Kyojuro Rengoku,Akaza|Gyomei Himejima,Hantengu|Yoriichi Tsugikuni,Kokushibo;Rui,Shinobu Kocho;Daki,Gyutaro;Enmu,Doma;Tanjiro Kamado;Muzan Kibutsuji",
    hxh: "Leorio Paradinight|Franklin Bordeau,Wing|Kite,Shalnark|Uvogin,Nobunaga Hazama|Pakunoda,Pariston Hill|Biscuit Krueger,Feitan|Killua Zoldyck,Phinks|Komugi,Shaiapouf|Silva Zoldyck,Menthuthuyoupi|Isaac Netero,Zeno Zoldyck;Kurapika,Illumi Zoldyck;Alluka Zoldyck,Neferpitou;Chrollo Lucilfer,Hisoka Morow;Gon Freecss;Meruem",
    jojo: "Guido Mista|Iggy,Muhammad Avdol|Hol Horse,Narancia Ghirga|Noriaki Kakyoin,Okuyasu Nijimura|Rohan Kishibe,Johnny Joestar|Jean Pierre Polnareff,Bruno Bucciarati|Gyro Zeppeli,Caesar Anthonio Zeppeli|Joseph Joestar,Lisa Lisa|Jonathan Joestar,Wamuu|Kars,Funny Valentine;Diavolo,Jolyne Cujoh;Giorno Giovanna,Josuke Higashikata;Yoshikage Kira,Enrico Pucci;Jotaro Kujo;Dio Brando",
    blackclover: "Luck Voltia|Mimosa Vermillion,Magna Swing|Klaus Lunettes,Finral Roulacase|Charmy Pappitson,Zora Ideale|Nozel Silva,Marx Francois|Noelle Silva,Charlotte Roselei|Yuno,Langris Vaude|Fanzell Rogue,Rill Boismortier|Fuegoleon Vermillion,Mereoleona Vermillion|Yami Sukehiro,William Vangeance;Nacht Faust,Vanessa Enoteca;Julius Novachrono,Gauche Adlai;Dante Zogratis,Zenon Zogratis;Asta;Lucifero"
};
const unoSym = { s: "⊘", r: "⟲", d: "+2", w: "★", x: "+4" };
const unoKind = { s: "SKIP", r: "REVERSE", d: "DRAW TWO", w: "WILD", x: "WILD +4", f: "FREEZE", t: "SWAP HANDS", u: "ULTIMATE", e: "FUTURE SIGHT" };
unoSym.f = "❄"; unoSym.t = "⇄"; unoSym.u = "+5"; unoSym.e = "◉";

/* ---------- SPECIAL CARDS ----------
   f = Freeze        next player loses their next 2 turns
   t = Swap Hands    swap your hand with a player you choose
   u = Ultimate      next player draws 5 (and is skipped)
   e = Future Sight  you see every other hand for 6 seconds
   They are coloured by their anime (like normal cards): playable on that colour or on the same special type. */
const UNO_SP = {
    f: { emoji: "🧊", label: "FREEZE",       file: "freeze",   snd: () => { tone(1400, 500, .5, "triangle", .07); tone(900, 200, .6, "sine", .05, .1); } },
    t: { emoji: "🌀", label: "SWAP HANDS",   file: "swap",     snd: () => { tone(300, 900, .35, "sine", .07); tone(900, 300, .35, "sine", .06, .3); } },
    u: { emoji: "💥", label: "ULTIMATE",     file: "ultimate", snd: () => { tone(120, 60, .6, "sawtooth", .09); tone(500, 80, .5, "square", .05, .05); } },
    e: { emoji: "👁️", label: "FUTURE SIGHT", file: "vision",   snd: () => { tone(700, 1400, .3, "sine", .06); tone(1400, 2000, .25, "sine", .05, .2); } }
};
/* Your custom art goes in  images/special/<series>_<file>.png  (.jpg and .webp also work).
   Example: images/special/onepiece_ultimate.png  =  Gear 5 Luffy.   Until a file exists, a placeholder card is shown.
   series keys: onepiece naruto dragonball jjk demonslayer bleach hxh blackclover jojo
   file names:  freeze  swap  ultimate  vision */
const UNO_SP_DIR = "images/special/", UNO_SP_EXT = ["png", "jpg", "webp"];
/* [character shown on the card, ABILITY NAME]. Leave the ability name "" until you have it; it appears on the card and in the big banner. */
const UNO_SPECIAL = {
    onepiece:    { f: ["Aokiji", ""],            t: ["Trafalgar Law", ""],       u: ["Luffy · Gear 5", ""],    e: ["Shanks", ""] },
    naruto:      { f: ["Haku", ""],              t: ["Minato Namikaze", ""],     u: ["Naruto Uzumaki", ""],    e: ["Neji Hyuga", ""] },
    dragonball:  { f: ["Hit", ""],               t: ["Whis", ""],                u: ["Goku", ""],              e: ["Jiren", ""] },
    jjk:         { f: ["Uraume", ""],            t: ["Aoi Todo", ""],            u: ["Sukuna", ""],            e: ["Satoru Gojo", ""] },
    demonslayer: { f: ["Doma", ""],              t: ["Nakime", ""],              u: ["Tanjiro Kamado", ""],    e: ["Yoriichi Tsugikuni", ""] },
    bleach:      { f: ["Toshiro Hitsugaya", ""], t: ["Aizen", ""],    u: ["Ichigo Kurosaki", ""],   e: ["Yhwach", ""] },
    hxh:         { f: ["Kurapika", ""],          t: ["Knov", ""],                u: ["Isaac Netero", ""],      e: ["Neon Nostrade", ""] },
    blackclover: { f: ["Julius Novachrono", ""], t: ["Finral Roulacase", ""],    u: ["Yami Sukehiro", ""],     e: ["Vanessa Enoteca", ""] },
    jojo:        { f: ["DIO", ""],               t: ["Bruno Bucciarati", ""],    u: ["Jotaro Kujo", ""],       e: ["Diavolo", ""] }
};
/* Later: your 10-second VFX + anime sound for a card plugs in here, one entry per card:
   UNO_FX_HOOKS["onepiece_u"] = (box, done, card, u) => { ...draw into box, play the sound, call done() when finished... };
   Cards without a hook get the short placeholder banner. */
/* =====================================================================
   SPECIAL CARD FX ENGINE  (voice line + canvas animation, 36 cards)
   ---------------------------------------------------------------------
   1) VOICE:  put a clip (any length, up to ~19s) at  audio/special/<series>_<kind>.mp3
              e.g. audio/special/jojo_u.mp3   (kinds: f=freeze t=swap u=ultimate e=vision)
              .ogg .wav .m4a also work. No file = animation plays silently with the old beep.
   2) LOOK:   each card picks ONE animation template in UNO_FX_CFG below.
              Change the template / colour / title / caption per card, no other code needed.
   The animation lasts as long as the clip. Templates: ice warp blast slash beam orb lightning eye rush time
   ===================================================================== */
const UNO_VOICE_DIR = "audio/special/", UNO_VOICE_EXT = ["mp3", "ogg", "wav", "m4a"], unoVoiceInfo = {};
/* The animation lasts as long as the voice line (+ a short outro), but never less than MIN or more than MAX.
   With no audio file it lasts UNO_FX_MS. All in milliseconds. */
const UNO_FX_MS = 8000, UNO_FX_MIN = 5000, UNO_FX_MAX = 10000;   // an animation never lasts more than 10 s in total
function unoVoiceLoad(key, wait) {                       // -> Promise of {src, dur} or null when there is no audio file
    return new Promise(res => {
        if (muted || unoVoiceInfo[key] === null) return res(null);
        if (unoVoiceInfo[key]) return res(unoVoiceInfo[key]);
        let i = 0, fin = false; const end = v => { if (!fin) { fin = true; res(v); } };
        setTimeout(() => end(null), wait);
        const tryExt = () => {
            if (i >= UNO_VOICE_EXT.length) { unoVoiceInfo[key] = null; return end(null); }
            const a = new Audio(); a.preload = "auto";
            a.onloadedmetadata = () => { if (!isFinite(a.duration)) return; unoVoiceInfo[key] = { src: a.src, dur: a.duration }; end(unoVoiceInfo[key]); };
            a.onerror = () => { i++; tryExt(); };
            a.src = UNO_VOICE_DIR + key + "." + UNO_VOICE_EXT[i];
        };
        tryExt();
    });
}
function unoVoicePlay(info) { const a = new Audio(info.src); a.volume = audio.mediaVolume(1); audio.duck(9000); a.play().catch(() => {}); return a; }
function unoVoiceStop(a) { const f = setInterval(() => { if (a.volume > .15) a.volume -= .15; else { a.pause(); clearInterval(f); } }, 30); }
/* [template, ability title, caption under it, colour] */
const UNO_FX_CFG = {
    onepiece_f: ["ice", "Ice Age", "Aokiji", "#bfeaff"],           onepiece_t: ["warp", "Room · Shambles", "Trafalgar Law", "#4cc9f0"],
    onepiece_u: ["blast", "Gear 5", "Luffy", "#ffffff"],           onepiece_e: ["lightning", "Conqueror's Haki", "Shanks", "#ff4d4d"],
    naruto_f: ["ice", "Crystal Ice Mirrors", "Haku", "#d8f6ff"],   naruto_t: ["warp", "Flying Raijin", "Minato", "#ffd23f"],
    naruto_u: ["orb", "Rasengan", "Naruto", "#4cc9f0"],            naruto_e: ["eye", "Byakugan", "Neji", "#c8d6ff"],
    dragonball_f: ["time", "Time Skip", "Hit", "#b388ff"],         dragonball_t: ["warp", "Instant Transmission", "Whis", "#8ecae6"],
    dragonball_u: ["beam", "Kamehameha", "Goku", "#4cc9f0"],       dragonball_e: ["eye", "Power Gaze", "Jiren", "#ff6b6b"],
    jjk_f: ["ice", "Frost Calm", "Uraume", "#cfeaff"],             jjk_t: ["warp", "Boogie Woogie", "Aoi Todo", "#c77dff"],
    jjk_u: ["slash", "Dismantle", "Sukuna", "#ff3b3b"],            jjk_e: ["eye", "Six Eyes", "Gojo", "#7df3ff"],
    demonslayer_f: ["ice", "Frozen Lotus", "Doma", "#e0f7ff"],     demonslayer_t: ["warp", "Infinity Castle", "Nakime", "#d9a05b"],
    demonslayer_u: ["blast", "Hinokami Kagura", "Tanjiro", "#ff7b2e"], demonslayer_e: ["eye", "Transparent World", "Yoriichi", "#ff8a5c"],
    bleach_f: ["ice", "Hyorinmaru", "Hitsugaya", "#bfeaff"],       bleach_t: ["warp", "Kyoka Suigetsu", "Aizen", "#b388ff"],
    bleach_u: ["slash", "Getsuga Tensho", "Ichigo", "#ff2b2b"],    bleach_e: ["eye", "The Almighty", "Yhwach", "#ffffff"],
    hxh_f: ["slash", "Judgment Chain", "Kurapika", "#ff4d6d"],     hxh_t: ["warp", "Portal Step", "Knov", "#6fd36f"],
    hxh_u: ["rush", "100-Type Guanyin", "Netero", "#ffd23f"],      hxh_e: ["eye", "Lovely Ghostwriter", "Neon", "#ff9de2"],
    blackclover_f: ["time", "Time Magic", "Julius", "#ffe27a"],    blackclover_t: ["warp", "Spatial Magic", "Finral", "#7ad7ff"],
    blackclover_u: ["slash", "Black Slash", "Yami", "#a66bff"],    blackclover_e: ["eye", "Thread Fate", "Vanessa", "#ff6bd6"],
    jojo_f: ["time", "The World", "DIO", "#ffe44d"],               jojo_t: ["warp", "Sticky Fingers", "Bruno", "#7df3ff"],
    jojo_u: ["rush", "Star Platinum", "Jotaro", "#7a7cff"],        jojo_e: ["time", "King Crimson", "Diavolo", "#ff2b4d"]
};
let fxOff = 0;
const fxR = i => Math.abs((Math.sin((i + fxOff) * 127.1 + 311.7) * 43758.5453) % 1);
const fxE = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
function fxBolt(g, x0, y0, x1, y1, seed, col) {
    const n = 9; g.beginPath(); g.moveTo(x0, y0);
    for (let i = 1; i < n; i++) { const k = i / n; g.lineTo(x0 + (x1 - x0) * k + (fxR(seed + i) - .5) * 90, y0 + (y1 - y0) * k + (fxR(seed + i + 50) - .5) * 40); }
    g.lineTo(x1, y1); g.strokeStyle = col; g.lineWidth = 3; g.shadowColor = col; g.shadowBlur = 24; g.stroke(); g.shadowBlur = 0;
}
const UNO_FX_DRAW = {
    ice(g, w, h, t, c) {
        const cx = w / 2, cy = h / 2, R = Math.max(w, h) * .7, a = Math.min(1, t * 3), m = fxE(t * 2.2);
        const gr = g.createRadialGradient(cx, cy, Math.min(w, h) * .25 * (1 - a) + 6, cx, cy, R);
        gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(190,235,255," + (.8 * a) + ")"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 30; i++) {
            const an = i / 30 * 6.283 + fxR(i) * .3, d = R * (1 - m) * .9 + 60 + fxR(i + 9) * 140, L = 50 + fxR(i + 3) * 110, x = cx + Math.cos(an) * d, y = cy + Math.sin(an) * d;
            g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an + .12) * L, y + Math.sin(an + .12) * L); g.lineTo(x + Math.cos(an - .12) * L, y + Math.sin(an - .12) * L); g.closePath();
            g.fillStyle = "rgba(235,250,255," + (.35 + fxR(i + 5) * .45) + ")"; g.fill(); g.strokeStyle = c; g.lineWidth = 1.5; g.stroke();
        }
        g.save(); g.translate(cx, cy); g.rotate(t * 1.2); g.strokeStyle = "#fff"; g.lineWidth = 3; g.shadowColor = c; g.shadowBlur = 18;
        const s = Math.min(w, h) * .24 * fxE(t * 3);
        for (let i = 0; i < 6; i++) { g.rotate(1.0472); g.beginPath(); g.moveTo(0, 0); g.lineTo(s, 0); g.moveTo(s * .6, 0); g.lineTo(s * .75, s * .12); g.moveTo(s * .6, 0); g.lineTo(s * .75, -s * .12); g.stroke(); }
        g.restore();
    },
    warp(g, w, h, t, c) {
        const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .55;
        for (let k = 0; k < 9; k++) { const p = (t * 1.3 + k / 9) % 1, r = R * (1 - p) + 8; g.save(); g.translate(cx, cy); g.rotate(t * 5 + k); g.scale(1, .55 + .4 * Math.sin(t * 6 + k));
            g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.strokeStyle = c; g.globalAlpha *= p < .85 ? .75 : (1 - p) * 5; g.lineWidth = 3 + p * 4; g.shadowColor = c; g.shadowBlur = 16; g.stroke(); g.restore(); }
        for (let i = 0; i < 90; i++) { const f = i / 90, an = f * 25 + t * 9, r = R * f * (1 - t * .6); g.beginPath(); g.arc(cx + Math.cos(an) * r, cy + Math.sin(an) * r * .75, 2 + f * 3, 0, 6.283); g.fillStyle = c; g.fill(); }
        g.beginPath(); g.arc(cx, cy, R * .16 * (1 + .1 * Math.sin(t * 30)), 0, 6.283); g.fillStyle = "#05000f"; g.fill();
    },
    blast(g, w, h, t, c) {
        const cx = w / 2, cy = h / 2, R = Math.max(w, h);
        for (let i = 0; i < 40; i++) { const an = i / 40 * 6.283, L = R * fxE(t * 1.6) * (.35 + fxR(i) * .65); g.beginPath(); g.moveTo(cx + Math.cos(an) * 40, cy + Math.sin(an) * 40); g.lineTo(cx + Math.cos(an) * L, cy + Math.sin(an) * L);
            g.strokeStyle = i % 2 ? c : "#fff"; g.lineWidth = 2 + fxR(i + 2) * 6; g.globalAlpha *= .85; g.stroke(); g.globalAlpha /= .85; }
        for (let k = 0; k < 3; k++) { const p = Math.max(0, t * 1.5 - k * .18); if (p <= 0 || p > 1) continue; g.beginPath(); g.arc(cx, cy, R * .6 * fxE(p), 0, 6.283); g.strokeStyle = k ? c : "#fff"; g.lineWidth = 22 * (1 - p) + 2; g.globalAlpha *= 1 - p * .6; g.stroke(); g.globalAlpha /= 1 - p * .6; }
        if (t < .14) { g.fillStyle = "rgba(255,255,255," + (1 - t / .14) + ")"; g.fillRect(0, 0, w, h); }
    },
    slash(g, w, h, t, c) {
        const S = [[.08, .05, .95, .8], [.28, .95, .1, .75], [.48, .1, .5, .95]];
        S.forEach((s, i) => { const p = (t - s[0]) / .22; if (p < 0) return; const e = fxE(p), x0 = w * s[1], y0 = h * (i === 1 ? .2 : .1), x1 = w * s[2], y1 = h * s[3] ;
            const xe = x0 + (x1 - x0) * e, ye = y0 + (y1 - y0) * e, nx = (y1 - y0), ny = -(x1 - x0), nl = Math.hypot(nx, ny) / 22 * (1 - p * .5);
            g.beginPath(); g.moveTo(x0, y0); g.lineTo(xe + nx / nl * .5, ye + ny / nl * .5); g.lineTo(xe - nx / nl * .5, ye - ny / nl * .5); g.closePath();
            g.globalAlpha *= Math.max(0, 1.2 - p * .6); g.fillStyle = "#fff"; g.shadowColor = c; g.shadowBlur = 40; g.fill(); g.shadowBlur = 0; g.globalAlpha /= Math.max(.01, 1.2 - p * .6);
            if (p < .15) { g.fillStyle = c; g.globalAlpha *= .35; g.fillRect(0, 0, w, h); g.globalAlpha /= .35; } });
    },
    beam(g, w, h, t, c) {
        const cx = w / 2, cy = h / 2, ch = .42;
        if (t < ch + .08) { const r = (20 + 90 * fxE(t / ch)) * Math.min(1, w / 700 + .4); for (let i = 0; i < 40; i++) { const an = fxR(i) * 6.283, d = (1 - ((t * 2 + fxR(i + 4)) % 1)) * 260; g.beginPath(); g.arc(cx + Math.cos(an) * d, cy + Math.sin(an) * d, 3, 0, 6.283); g.fillStyle = "#fff"; g.fill(); }
            g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.fillStyle = c; g.shadowColor = c; g.shadowBlur = 60; g.fill(); g.shadowBlur = 0; }
        if (t > ch) { const p = fxE((t - ch) / .08), th = h * .26 * (1 + .08 * Math.sin(t * 90)), L = w * p; const gr = g.createLinearGradient(0, cy - th, 0, cy + th);
            gr.addColorStop(0, "transparent"); gr.addColorStop(.3, c); gr.addColorStop(.5, "#fff"); gr.addColorStop(.7, c); gr.addColorStop(1, "transparent"); g.fillStyle = gr; g.fillRect(cx, cy - th, L, th * 2); g.fillRect(cx - L * .4, cy - th, L * .4, th * 2); }
    },
    orb(g, w, h, t, c) {
        const cx = w / 2, cy = h / 2, B = .62;
        if (t < B) { const r = Math.min(w, h) * .2 * fxE(t / B); g.save(); g.translate(cx, cy); g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fillStyle = c; g.shadowColor = c; g.shadowBlur = 50; g.fill(); g.shadowBlur = 0;
            for (let k = 0; k < 7; k++) { g.rotate(t * 14 + k); g.beginPath(); g.arc(0, 0, r * (.3 + k * .1), 0, 2.2); g.strokeStyle = "#fff"; g.lineWidth = 3; g.stroke(); } g.restore(); }
        else { const p = (t - B) / (1 - B); g.beginPath(); g.arc(cx, cy, Math.max(w, h) * .6 * fxE(p), 0, 6.283); g.strokeStyle = c; g.lineWidth = 40 * (1 - p) + 2; g.stroke(); if (p < .15) { g.fillStyle = "rgba(255,255,255," + (1 - p / .15) + ")"; g.fillRect(0, 0, w, h); } }
    },
    lightning(g, w, h, t, c) {
        const f = Math.floor(t * 22);
        if (fxR(f) > .35) for (let i = 0; i < 4; i++) fxBolt(g, w * (.15 + fxR(f + i) * .7), 0, w * (.3 + fxR(f + i + 7) * .4), h * (.55 + fxR(f + i + 3) * .3), f * 10 + i * 31, i % 2 ? "#fff" : c);
        if (fxR(f + 99) > .8) { g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(0, 0, w, h); }
    },
    eye(g, w, h, t, c) {
        const cx = w / 2, cy = h / 2, W = Math.min(w * .42, 420), o = t < .25 ? fxE(t / .25) : t > .88 ? Math.max(0, (1 - t) / .12) : 1, H = W * .42 * o;
        g.beginPath(); g.moveTo(cx - W, cy); g.quadraticCurveTo(cx, cy - H * 2, cx + W, cy); g.quadraticCurveTo(cx, cy + H * 2, cx - W, cy); g.closePath();
        g.fillStyle = "rgba(0,0,0,.65)"; g.fill(); g.save(); g.clip();
        const ir = H * 1.15, gr = g.createRadialGradient(cx, cy, 2, cx, cy, ir); gr.addColorStop(0, "#fff"); gr.addColorStop(.35, c); gr.addColorStop(1, "#000");
        g.beginPath(); g.arc(cx, cy, ir, 0, 6.283); g.fillStyle = gr; g.fill(); g.fillStyle = "#000"; g.fillRect(cx - ir * .1, cy - ir, ir * .2, ir * 2);
        for (let y = 0; y < h; y += 8) { g.fillStyle = "rgba(255,255,255,.06)"; g.fillRect(0, y + ((t * 300) % 8), w, 2); } g.restore();
        g.beginPath(); g.moveTo(cx - W, cy); g.quadraticCurveTo(cx, cy - H * 2, cx + W, cy); g.quadraticCurveTo(cx, cy + H * 2, cx - W, cy); g.closePath(); g.strokeStyle = c; g.lineWidth = 4; g.shadowColor = c; g.shadowBlur = 30; g.stroke();
    },
    rush(g, w, h, t, c) {
        const cx = w / 2, cy = h / 2, R = Math.max(w, h);
        for (let i = 0; i < 70; i++) { const an = fxR(i) * 6.283, d0 = 90 + ((t * 7 + fxR(i + 5)) % 1) * R * .7, L = 60 + fxR(i + 2) * 200; g.beginPath(); g.moveTo(cx + Math.cos(an) * d0, cy + Math.sin(an) * d0); g.lineTo(cx + Math.cos(an) * (d0 + L), cy + Math.sin(an) * (d0 + L)); g.strokeStyle = i % 3 ? c : "#fff"; g.lineWidth = 1 + fxR(i + 1) * 4; g.stroke(); }
        const hit = Math.floor(t * 12), ph = (t * 12) % 1; if (t > .1 && t < .9 && ph < .35) { const jx = (fxR(hit) - .5) * w * .4, jy = (fxR(hit + 20) - .5) * h * .35; g.save(); g.translate(cx + jx, cy + jy); g.beginPath();
            for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283, r = k % 2 ? 40 : 120 * (1 - ph); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fillStyle = "#fff"; g.shadowColor = c; g.shadowBlur = 25; g.fill(); g.restore(); }
    },
    time(g, w, h, t, c) {
        const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .3, stop = .6;
        g.fillStyle = "rgba(170,175,200," + (.28 * Math.min(1, t * 4)) + ")"; g.fillRect(0, 0, w, h);
        g.beginPath(); g.arc(cx, cy, R, 0, 6.283); g.strokeStyle = c; g.lineWidth = 6; g.shadowColor = c; g.shadowBlur = 25; g.stroke();
        for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * .85, cy + Math.sin(a) * R * .85); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineWidth = 4; g.stroke(); }
        const ang = -1.57 + (t < stop ? fxE(t / stop) * 25 : 25); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang) * R * .8, cy + Math.sin(ang) * R * .8); g.lineWidth = 6; g.strokeStyle = "#fff"; g.stroke();
        if (t > stop) { const p = (t - stop) / (1 - stop); for (let k = 0; k < 3; k++) { const q = (p * 1.3 - k * .2); if (q <= 0 || q > 1) continue; g.beginPath(); g.arc(cx, cy, R + q * Math.max(w, h) * .6, 0, 6.283); g.globalAlpha *= 1 - q; g.strokeStyle = c; g.lineWidth = 8; g.stroke(); g.globalAlpha /= 1 - q; } }
    }
};
function unoFxHook(key) {
    const cfg = UNO_FX_CFG[key], draw = UNO_FX_DRAW[cfg[0]], col = cfg[3], heavy = /blast|rush|slash|lightning/.test(cfg[0]), soft = /time|eye|warp|ice/.test(cfg[0]);
    return (box, done, c, u) => {
        const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
        box.textContent = ""; box.classList.add("cine"); box.style.setProperty("--c", col);
        let ended = false, voice = null;
        const finish = () => { if (ended) return; ended = true; if (voice) unoVoiceStop(voice); done(); };
        box.addEventListener("click", finish);                                    // tap anywhere = skip
        unoVoiceLoad(key, 900).then(info => {
            if (ended) return;
            run(info, reduce ? 2500 : info ? Math.min(UNO_FX_MAX, Math.max(UNO_FX_MIN, info.dur * 1000 + 900)) : UNO_FX_MS);
        }).catch(e => { console.warn(e); finish(); });

        function run(info, ms) {
            const who = u.names["p" + u.fx.p] || "?", div = (cls, txt) => { const d = hbEl("div", cls, txt); box.appendChild(d); return d; };
            let cv = null, g = null, W = 0, H = 0;
            if (!reduce) { cv = hbEl("canvas", "fx-cv"); box.appendChild(cv); const dpr = Math.min(2, window.devicePixelRatio || 1); W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr; g = cv.getContext("2d"); }
            // --- the character card, big, in the middle (native 220x330 scaled to fit, so every picture keeps its card frame) ---
            const stage = div("fx-stage"), wrap = hbEl("div", "fx-cardwrap"), inner = hbEl("div", "fx-cardin"), card = unoCardEl(u, u.fx.ci, "big");
            const k = Math.min(innerHeight * .46 / 330, innerWidth * .74 / 220, 1.8);
            wrap.style.width = 220 * k + "px"; wrap.style.height = 330 * k + "px"; card.style.transform = "scale(" + k + ")";
            inner.appendChild(card); wrap.appendChild(inner); stage.appendChild(wrap);
            wrap.animate([{ transform: "translateY(90vh) rotate(-16deg) scale(.55)", opacity: 0 }, { transform: "translateY(0) rotate(2deg) scale(1.06)", opacity: 1, offset: .75 }, { transform: "none", opacity: 1 }], { duration: Math.min(900, ms * .12), easing: "cubic-bezier(.2,.9,.3,1)", fill: "backwards" });
            // --- title band: ability name letter by letter, caption underneath ---
            const tt = div("fx-title"), band = hbEl("div", "fx-band"), nm = hbEl("div", "fx-name");
            [...(c.ab || cfg[1])].forEach((ch, i) => { const sp = hbEl("span", "ch", ch === " " ? "\u00a0" : ch); sp.style.animationDelay = (ms * .09 + i * 55) + "ms"; nm.appendChild(sp); });
            band.appendChild(nm); band.appendChild(hbEl("div", "fx-cap", who + " · " + cfg[2])); tt.appendChild(band);
            band.animate([{ transform: "skewX(-10deg) translateX(-110vw)" }, { transform: "skewX(-10deg) translateX(0)" }], { duration: 520, delay: ms * .07, easing: "cubic-bezier(.2,.9,.2,1)", fill: "backwards" });
            const top = div("fx-bar t"), bot = div("fx-bar b"), flash = div("fx-flash"), prog = div("fx-prog"), pin = hbEl("i"); prog.appendChild(pin); div("fx-skip", "TAP TO SKIP");
            top.animate([{ transform: "translateY(-100%)" }, { transform: "none" }], { duration: 420, easing: "ease-out", fill: "backwards" });
            bot.animate([{ transform: "translateY(100%)" }, { transform: "none" }], { duration: 420, easing: "ease-out", fill: "backwards" });
            if (info) voice = unoVoicePlay(info);
            if (reduce) { setTimeout(finish, ms); return; }

            const SS = .28, SE = .84, cyc = Math.max(2, Math.round((SE - SS) * ms / 1900)), t0 = performance.now();
            const frame = now => {
                if (ended) return;
                if (!box.isConnected) { finish(); return; }
                const t = Math.min(1, (now - t0) / ms), s = t * ms / 1000, w = innerWidth, h = innerHeight, R = Math.hypot(w, h) / 2, cy = h * .14 + h * .26;
                const amp = Math.min(1, t / .07) * (t > .9 ? (1 - t) / .1 : 1);
                g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); const kk = W / w; g.scale(kk, kk);
                // sunburst behind the card
                g.save(); g.translate(w / 2, cy); g.rotate(s * .18); g.fillStyle = col; g.globalAlpha = .13 * amp;
                for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - .07) * R, Math.sin(a - .07) * R); g.lineTo(Math.cos(a + .07) * R, Math.sin(a + .07) * R); g.fill(); } g.restore();
                // energy gathering into the card (charge-up), keeps simmering through the strikes
                const ch = t < SS ? Math.min(1, t / SS) : 1, simmer = t < SE ? 1 : Math.max(0, (1 - t) / (1 - SE));
                g.save(); g.translate(w / 2, cy); g.globalAlpha = .9 * amp * simmer;
                for (let i = 0; i < 70; i++) { const an = fxR(i) * 6.283, ph = (s * (.5 + ch) * .8 + fxR(i + 9)) % 1, d = (1 - ph) * R * (.35 + fxR(i + 4) * .6) + 70 * k, L = 14 + 40 * (1 - ph);
                    g.beginPath(); g.moveTo(Math.cos(an) * d, Math.sin(an) * d); g.lineTo(Math.cos(an) * (d + L), Math.sin(an) * (d + L)); g.strokeStyle = i % 4 ? col : "#fff"; g.lineWidth = 1 + fxR(i + 2) * 3; g.stroke(); }
                const ring = 110 * k * (1 + .08 * Math.sin(s * 6)); g.beginPath(); g.arc(0, 0, ring, 0, 6.283); g.strokeStyle = col; g.lineWidth = 3 + ch * 5; g.shadowColor = col; g.shadowBlur = 30; g.stroke(); g.restore();
                // the technique itself, repeated as a few strikes
                let local = 1, ci = 0;
                if (t >= SS && t < SE) {
                    const cp = (t - SS) / (SE - SS) * cyc; ci = Math.floor(cp); local = cp - ci; fxOff = ci * 17;
                    g.save(); g.translate(0, cy - h / 2); g.globalAlpha = amp * Math.min(1, (1 - local) * 5 + .15);
                    try { draw(g, w, h, local, col); } catch (e) { console.warn(e); } g.restore(); fxOff = 0;
                }
                // card reacts, screen shakes, flashes
                const hit = t >= SS && t < SE ? Math.max(0, 1 - local * 3.2) : 0;
                inner.style.transform = "translateY(" + (Math.sin(s * 2.2) * -7) + "px) rotate(" + ((fxR((now / 45) | 0) - .5) * hit * 6) + "deg) scale(" + (1 + hit * .06) + ")";
                stage.style.transform = heavy && hit ? "translate(" + ((fxR((now | 0)) - .5) * 18 * hit) + "px," + ((fxR((now | 0) + 5) - .5) * 18 * hit) + "px)" : "";
                const fl = Math.max(hit > .7 ? (hit - .7) * (soft ? 1 : 2.2) : 0, t > SE && t < SE + .05 ? 1 - (t - SE) / .05 : 0);
                flash.style.opacity = Math.min(.9, fl);
                pin.style.width = (1 - t) * 100 + "%";
                if (t < 1) requestAnimationFrame(frame); else finish();
            };
            requestAnimationFrame(frame);
            setTimeout(finish, ms + 500);                      // safety net: an animation can never freeze the game
        }
    };
}
const UNO_FX_HOOKS = {};
Object.keys(UNO_FX_CFG).forEach(k => { UNO_FX_HOOKS[k] = unoFxHook(k); });
/* =====================================================================
   HAND-MADE SCENES  (each of these cards gets its own scripted cinematic)
   Done so far:  jjk_e = Gojo (Infinite Void)   jjk_u = Sukuna (Malevolent Shrine)
   The scene is as long as your voice line (+ a silent ending). If the scene doesn't line up with what
   your voice says, change the fractions below: [when act 2 starts, when act 3 starts] as a share of the clip
   (0.30 = 30% of the way through the audio).
   ===================================================================== */
let unoFxOwnsPeek = null;
const UNO_SCENE_T = { jjk_e: [.17, .40], jjk_u: [.15, .45] };
const FXJ = '"Yu Mincho","Hiragino Mincho ProN","Noto Serif JP","MS Mincho","SimSun",serif';
const fxS = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
function fxText(g, txt, x, y, size, fill, stroke, glow, font) {
    g.font = "900 " + size + "px " + (font || FXJ); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    g.shadowColor = glow || stroke; g.shadowBlur = size * .3; g.lineWidth = Math.max(2, size * .07); g.strokeStyle = stroke; g.strokeText(txt, x, y);
    g.shadowBlur = 0; g.fillStyle = fill; g.fillText(txt, x, y);
}
function fxEye(g, cx, cy, W, open, o) {
    if (open < .03) return;
    const H = W * .36 * open;
    g.save(); g.translate(cx, cy); g.rotate(o.tilt || 0);
    const path = () => { g.beginPath(); g.moveTo(-W / 2, 0); g.quadraticCurveTo(0, -H * 2, W / 2, 0); g.quadraticCurveTo(0, H * 2, -W / 2, 0); g.closePath(); };
    g.shadowColor = o.glow; g.shadowBlur = W * .45; path(); g.fillStyle = "#04020a"; g.fill(); g.shadowBlur = 0;
    g.save(); path(); g.clip();
    const ir = Math.max(2, H * 1.05), gr = g.createRadialGradient(0, 0, ir * .08, 0, 0, ir);
    o.stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, ir, 0, 6.283); g.fill();
    if (o.slit) { g.fillStyle = "#000"; g.beginPath(); g.ellipse(0, 0, ir * .11, ir * .96, 0, 0, 6.283); g.fill(); }
    else {
        g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1.5; for (let k = 1; k < 4; k++) { g.beginPath(); g.arc(0, 0, ir * k * .25, 0, 6.283); g.stroke(); }
        g.fillStyle = "#001a33"; g.beginPath(); g.arc(0, 0, ir * .26, 0, 6.283); g.fill(); g.fillStyle = "rgba(255,255,255,.95)"; g.beginPath(); g.arc(-ir * .3, -ir * .3, ir * .12, 0, 6.283); g.fill();
    }
    g.restore();
    path(); g.strokeStyle = o.rim; g.lineWidth = Math.max(2, W * .022); g.shadowColor = o.glow; g.shadowBlur = W * .2; g.stroke(); g.shadowBlur = 0;
    if (o.lash) { g.strokeStyle = "#eaffff"; g.lineWidth = Math.max(1.5, W * .012); for (let i = 1; i < 16; i++) { const t = i / 16, x = -W / 2 + W * t, y = -4 * H * t * (1 - t); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (t - .5) * W * .12, y - W * .07 * open); g.stroke(); } }
    g.restore();
}
const FX_GOJO_EYE = { stops: [[0, "#ffffff"], [.25, "#c4f8ff"], [.6, "#2ec8ff"], [1, "#0a3a8a"]], rim: "#d9f8ff", glow: "#33ccff", lash: true };
const FX_SUK_EYE = { stops: [[0, "#ff9a8a"], [.3, "#ff2b2b"], [.7, "#a30000"], [1, "#2a0000"]], rim: "#ff3b3b", glow: "#ff1010", slit: true };
const FXG = "無量空処0123456789∞呪術廻戦";
function fxVoid(g, w, h, s, speed, glyph) {
    const cx = w / 2, cy = h / 2, R = Math.hypot(w, h) / 2, gr = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    gr.addColorStop(0, "#0b1f5c"); gr.addColorStop(.45, "#050b2e"); gr.addColorStop(1, "#000007"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5; i++) { const x = w * (.2 + .6 * fxR(i + 40) + .08 * Math.sin(s * .3 + i)), y = h * (.2 + .6 * fxR(i + 50) + .08 * Math.cos(s * .25 + i)), r = R * (.35 + .2 * fxR(i + 60)), n = g.createRadialGradient(x, y, 0, x, y, r);
        n.addColorStop(0, i % 2 ? "rgba(130,90,255,.22)" : "rgba(40,200,255,.2)"); n.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = n; g.fillRect(0, 0, w, h); }
    g.lineCap = "round";
    for (let i = 0; i < 150; i++) { const a = fxR(i) * 6.283, z = (fxR(i + 7) + s * .1 * speed) % 1, r = Math.pow(z, 2.2) * R * 1.05, len = Math.min(r, 3 + speed * r * .045);
        g.beginPath(); g.moveTo(cx + Math.cos(a) * (r - len), cy + Math.sin(a) * (r - len)); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        g.globalAlpha = Math.min(1, z * 1.4); g.strokeStyle = i % 5 === 0 ? "#b9a6ff" : i % 2 ? "#ffffff" : "#7fe9ff"; g.lineWidth = .6 + z * 2.4; g.stroke(); }
    g.globalAlpha = 1;
    if (glyph > 0) { g.font = "700 22px monospace"; g.textAlign = "center"; g.textBaseline = "middle"; const cols = Math.ceil(w / 34);
        for (let c = 0; c < cols; c++) { const head = ((s * (.12 + fxR(c + 70) * .22) * (.6 + speed * .35) + fxR(c + 80)) % 1) * (h + 260) - 130;
            for (let j = 0; j < 9; j++) { g.globalAlpha = glyph * (1 - j / 9); g.fillStyle = j ? "#6fe3ff" : "#ffffff"; g.fillText(FXG[(Math.floor(s * 5 * (.5 + fxR(c + j))) + c * 3 + j) % FXG.length], c * 34 + 17, head - j * 26); } }
        g.globalAlpha = 1; }
}
function fxSlam(p) { return { sc: 1 + (1 - fxS(0, .2, p)) * 2.2, a: fxS(0, .08, p) * (1 - fxS(.86, 1, p)) }; }

/* ---------- GOJO · Infinite Void ---------- */
const unoGojo = {
    col: "#33ccff", ms: 12000,
    begin(env, box, u) { env.me = Number(myPlayer); env.owner = env.me === u.fx.p; env.who = u.names["p" + u.fx.p] || "?"; if (env.owner && u.peek) unoFxOwnsPeek = u.peek.id; },
    tail: env => env.owner ? 4200 : 2400,
    end(env, u) { if (env.owner && !env.shown) { unoFxOwnsPeek = null; unoPeekShow(u, env.me); } },
    draw(g, w, h, T, env, u) {
        const cx = w / 2, cy = h / 2, R = Math.hypot(w, h) / 2, B = UNO_SCENE_T.jjk_e, M = Math.min(w, h);
        if (T.ph === "main") {
            const t = T.t, s = T.s; g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
            if (t < B[1]) {                                                        // ACT 1: the Six Eyes open in the dark
                const a = Math.min(1, t / B[0]), fade = t < B[0] ? 1 : 1 - fxS(B[0], B[1], t);
                const mg = g.createRadialGradient(cx, cy, 0, cx, cy, R * .8); mg.addColorStop(0, "rgba(30,140,255," + (.3 * fade) + ")"); mg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = mg; g.fillRect(0, 0, w, h);
                g.fillStyle = "#7fe9ff"; for (let i = 0; i < 50; i++) { g.globalAlpha = .55 * fade * fxR(i + 2); g.fillRect(fxR(i) * w, h - ((fxR(i + 3) * .5 + s * .08 * (.4 + fxR(i + 8))) % 1) * h, 2, 2 + fxR(i) * 6); } g.globalAlpha = 1;
                const zoom = 1 + fxS(B[0], B[1], t) * 3, EW = Math.min(w * .24, 300);
                g.save(); g.translate(cx, cy); g.scale(zoom, zoom); g.globalAlpha = fade;
                const mo = fxS(.10, .38, a), p1 = fxS(.42, .64, a), p2 = fxS(.56, .78, a);
                fxEye(g, -EW * .62, 0, EW, mo, Object.assign({ tilt: -.05 }, FX_GOJO_EYE)); fxEye(g, EW * .62, 0, EW, mo, Object.assign({ tilt: .05 }, FX_GOJO_EYE));
                fxEye(g, -EW * 1.5, -EW * .6, EW * .5, p1, Object.assign({ tilt: -.3 }, FX_GOJO_EYE)); fxEye(g, EW * 1.5, -EW * .6, EW * .5, p1, Object.assign({ tilt: .3 }, FX_GOJO_EYE));
                fxEye(g, -EW * 1.5, EW * .6, EW * .5, p2, Object.assign({ tilt: .3 }, FX_GOJO_EYE)); fxEye(g, EW * 1.5, EW * .6, EW * .5, p2, Object.assign({ tilt: -.3 }, FX_GOJO_EYE));
                g.restore(); g.globalAlpha = 1;
                if (t < B[0]) fxText(g, "六眼 · SIX EYES", cx, h * .86, M * .05, "#e8fbff", "#0a6ea8", "#33ccff", FXJ + "," + "sans-serif");
            }
            if (t >= B[0] && t < B[1]) {                                           // ACT 2: Domain Expansion, a dome of void grows out of the centre
                const b = (t - B[0]) / (B[1] - B[0]), r = fxS(0, .75, b) * R * 1.05;
                g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.clip(); fxVoid(g, w, h, s, 1.4, 0); g.restore();
                g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.strokeStyle = "#e8fbff"; g.lineWidth = 6 + 10 * (1 - b); g.shadowColor = "#33ccff"; g.shadowBlur = 40; g.stroke(); g.shadowBlur = 0;
                const first = b < .5, sl = fxSlam(first ? b / .5 : (b - .5) / .5), jx = (fxR((T.now / 40) | 0) - .5) * 10 * (1 - fxS(0, .3, first ? b / .5 : (b - .5) / .5));
                g.save(); g.translate(cx + jx, cy - M * .04); g.scale(sl.sc, sl.sc); g.globalAlpha = sl.a;
                fxText(g, first ? "領域展開" : "無量空処", 0, 0, M * .24, "#ffffff", "#0b6fb8", "#33ccff"); g.restore(); g.globalAlpha = 1;
                g.globalAlpha = fxS(.1, .3, b) * (1 - fxS(.9, 1, b)); fxText(g, first ? "D O M A I N   E X P A N S I O N" : "I N F I N I T E   V O I D", cx, cy + M * .2, M * .045, "#dff8ff", "#06304f", "#33ccff", "sans-serif"); g.globalAlpha = 1;
            }
            if (t >= B[1]) {                                                       // ACT 3: we fall into the void
                const c = (t - B[1]) / (1 - B[1]);
                fxVoid(g, w, h, s, 1 + c * 16, .55 * fxS(0, .3, c));
                const z = 1 + c * c * 22; g.save(); g.translate(cx, cy); g.scale(z, z); g.globalAlpha = 1 - fxS(.15, .75, c);
                fxText(g, "無量空処", 0, 0, M * .22, "#ffffff", "#2ec8ff", "#7fe9ff"); g.restore(); g.globalAlpha = 1;
                for (let k = 0; k < 3; k++) { const q = (c * 1.6 - k * .22); if (q <= 0 || q > 1) continue; g.beginPath(); g.arc(cx, cy, R * q, 0, 6.283); g.strokeStyle = "rgba(180,240,255," + (1 - q) + ")"; g.lineWidth = 3; g.stroke(); }
                const wo = fxS(.84, 1, c); if (wo > 0) { g.fillStyle = "rgba(255,255,255," + wo + ")"; g.fillRect(0, 0, w, h); }
            }
            const fl = Math.max(0, 1 - Math.abs(t - B[0]) / .035) * .85; if (fl > 0) { g.fillStyle = "rgba(210,248,255," + fl + ")"; g.fillRect(0, 0, w, h); }
        } else {                                                                   // ENDING: calm void, the opponents' hands float in it
            const tt = T.tt; fxVoid(g, w, h, T.el / 1000, .25, .22);
            const wo = 1 - fxS(0, .18, tt); if (wo > 0) { g.fillStyle = "rgba(255,255,255," + wo + ")"; g.fillRect(0, 0, w, h); }
            if (!env.shown) { env.shown = true; if (env.owner) unoGojoReveal(env.box, env, u); }
            if (!env.owner) { g.globalAlpha = fxS(.1, .3, tt); fxText(g, "無量空処", cx, cy - M * .08, M * .16, "#ffffff", "#2ec8ff", "#7fe9ff"); fxText(g, env.who + " is reading your hand...", cx, cy + M * .1, M * .045, "#dff8ff", "#06304f", "#33ccff", "sans-serif"); g.globalAlpha = 1; }
        }
    }
};
function unoGojoReveal(box, env, u) {
    const v = hbEl("div", "fx-void"); box.appendChild(v);
    v.appendChild(hbEl("div", "fx-void-k", "無量空処")); v.appendChild(hbEl("h2", null, "INFINITE VOID"));
    const rows = hbEl("div", "fx-void-rows"); let n = 0;
    const others = u.seats.filter(p => p !== env.me), total = others.reduce((a, p) => a + (u.hands["p" + p] || []).length, 0), step = Math.min(60, 1500 / Math.max(1, total));
    others.forEach(p => {
        const r = hbEl("div", "fx-void-row"), nm = hbEl("div", "fx-void-name", u.names["p" + p] + " · " + (u.hands["p" + p] || []).length + " cards"); r.appendChild(nm);
        const hd = hbEl("div", "fx-void-hand");
        (u.hands["p" + p] || []).slice().sort((a, b) => (u.cards[a].s - u.cards[b].s) || (u.cards[a].v - u.cards[b].v)).forEach(ci => {
            const el = unoCardEl(u, ci, "mini"); el.style.setProperty("--tilt", ((fxR(n * 3 + 1) - .5) * 8) + "deg"); el.style.animationDelay = (n * 90) + "ms";
            el.animate([{ opacity: 0, transform: "translateY(50px) scale(.4) rotate(-10deg)" }, { opacity: 1, transform: "none" }], { duration: 520, delay: 500 + n * step, easing: "cubic-bezier(.2,1.4,.4,1)", fill: "backwards" });
            hd.appendChild(el); n++;
        });
        r.appendChild(hd); rows.appendChild(r);
    });
    v.appendChild(rows);
}

/* ---------- SUKUNA · Malevolent Shrine ---------- */
function fxSplit(poly, L) {
    const ax = L[0], ay = L[1], bx = L[2], by = L[3], side = p => (bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax), A = [], B = [];
    for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], sp = side(p), sq = side(q);
        if (sp >= 0) A.push(p); if (sp <= 0) B.push(p);
        if ((sp > 0 && sq < 0) || (sp < 0 && sq > 0)) { const t = sp / (sp - sq), m = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; A.push(m); B.push(m); } }
    return [A, B].filter(x => x.length >= 3);
}
function fxSlashGeom(k, w, h) {
    const an = (fxR(k * 3.1 + 100) - .5) * Math.PI * 1.7, px = fxR(k * 5.7 + 200) * w, py = fxR(k * 2.3 + 300) * h, L = Math.hypot(w, h), dx = Math.cos(an), dy = Math.sin(an);
    return [px - dx * L, py - dy * L, px + dx * L, py + dy * L];
}
function fxRR(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function fxCardBack(g, x, y, sc, rotY, ang) {
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(Math.max(.14, Math.abs(Math.cos(rotY))) * sc, sc);
    fxRR(g, -30, -45, 60, 90, 8); const gr = g.createLinearGradient(-30, -45, 30, 45); gr.addColorStop(0, "#ff4040"); gr.addColorStop(1, "#7a0508"); g.fillStyle = gr; g.fill(); g.lineWidth = 4; g.strokeStyle = "#fff"; g.stroke();
    g.fillStyle = "#12020a"; g.beginPath(); g.ellipse(0, 0, 20, 30, -.5, 0, 6.283); g.fill(); g.fillStyle = "#ffd75a"; g.font = "900 22px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("?", 0, 1); g.restore();
}
function fxShrine(g, gx, gy, sc, glow) {
    g.save(); g.translate(gx, gy); g.scale(sc, sc); g.lineJoin = "round";
    const rim = () => { g.strokeStyle = "rgba(255,70,55,.9)"; g.lineWidth = 3; g.shadowColor = "#ff2a1a"; g.shadowBlur = 22 * glow; g.stroke(); g.shadowBlur = 0; };
    const fillDark = () => { g.fillStyle = "#07000a"; g.fill(); };
    g.beginPath(); g.rect(-340, -34, 680, 34); fillDark(); rim(); g.beginPath(); g.rect(-290, -66, 580, 34); fillDark(); rim();
    g.beginPath(); g.rect(-240, -250, 480, 184); fillDark();
    const dg = g.createRadialGradient(0, -150, 4, 0, -150, 110); dg.addColorStop(0, "rgba(255,200,120," + (.9 * glow) + ")"); dg.addColorStop(.4, "rgba(255,50,30," + (.8 * glow) + ")"); dg.addColorStop(1, "rgba(80,0,0,0)"); g.fillStyle = dg; g.fillRect(-64, -240, 128, 174);
    [-230, -110, 90, 210].forEach(x => { g.beginPath(); g.rect(x, -250, 24, 190); fillDark(); rim(); });
    g.beginPath(); g.moveTo(-410, -232); g.bezierCurveTo(-330, -250, -270, -292, -210, -340); g.lineTo(210, -340); g.bezierCurveTo(270, -292, 330, -250, 410, -232); g.closePath(); fillDark(); rim();
    g.beginPath(); g.rect(-170, -420, 340, 80); fillDark(); rim();
    g.beginPath(); g.moveTo(-270, -408); g.bezierCurveTo(-210, -420, -180, -452, -120, -500); g.lineTo(120, -500); g.bezierCurveTo(180, -452, 210, -420, 270, -408); g.closePath(); fillDark(); rim();
    g.fillStyle = "#e9ddc6"; g.beginPath(); g.arc(0, -380, 30, 0, 6.283); g.fill(); g.beginPath(); g.rect(-16, -360, 32, 22); g.fill();
    g.fillStyle = "#12020a"; g.beginPath(); g.arc(-11, -383, 7, 0, 6.283); g.arc(11, -383, 7, 0, 6.283); g.fill();
    g.strokeStyle = "#e9ddc6"; g.lineWidth = 8; g.lineCap = "round"; g.beginPath(); g.moveTo(-26, -396); g.quadraticCurveTo(-70, -400, -78, -440); g.moveTo(26, -396); g.quadraticCurveTo(70, -400, 78, -440); g.stroke();
    g.lineWidth = 6; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-300, -180 + i * 6, 30 + i * 18, 4.2, 5.6); g.stroke(); g.beginPath(); g.arc(300, -180 + i * 6, 30 + i * 18, 3.8, 5.2); g.stroke(); }
    g.restore();
}
const unoSukuna = {
    col: "#e0182a", ms: 12000,
    begin(env, box, u) { env.who = u.names["p" + u.fx.p] || "?"; env.to = u.names["p" + (u.fx.to || unoNext(u, u.fx.p, 1))] || "?"; },
    tail: () => 3800,
    tailStart(env, cv, u, W, H) {
        const w = innerWidth, h = innerHeight, snap = document.createElement("canvas"); snap.width = W; snap.height = H; snap.getContext("2d").drawImage(cv, 0, 0);
        env.snap = snap; let polys = [[[0, 0], [w, 0], [w, h], [0, h]]];
        const lines = []; for (let k = 40; k < 48; k++) lines.push(fxSlashGeom(k, w, h));
        lines.forEach(L => { const nx = []; polys.forEach(p => fxSplit(p, L).forEach(q => nx.push(q))); polys = nx; });
        env.shards = polys.map((p, i) => { let sx = 0, sy = 0; p.forEach(q => { sx += q[0]; sy += q[1]; }); sx /= p.length; sy /= p.length; const dx = sx - w / 2, dy = sy - h / 2, d = Math.hypot(dx, dy) || 1; return { p: p, cx: sx, cy: sy, dx: dx / d + (fxR(i) - .5) * .8, dy: dy / d + (fxR(i + 9) - .5) * .8, r: (fxR(i + 4) - .5) * 1.6, d: .6 + fxR(i + 6) }; });
        env.box.style.background = "transparent";                                   // the real game shows through the broken pieces
    },
    draw(g, w, h, T, env, u) {
        const cx = w / 2, cy = h / 2, R = Math.hypot(w, h) / 2, B = UNO_SCENE_T.jjk_u, M = Math.min(w, h);
        if (T.ph === "main") {
            const t = T.t, s = T.s; g.save();
            const sk = t < B[0] ? 2 + 3 * Math.abs(Math.sin(s * 5)) * fxS(.3, .8, t / B[0]) : t < B[1] ? 3 + 5 * Math.max(0, Math.sin(s * 3)) : 6; let act3 = 0;
            if (t >= B[1]) { const c = (t - B[1]) / (1 - B[1]); act3 = c; }
            g.translate((fxR((T.now / 33) | 0) - .5) * sk * (t < B[1] ? 1 : 1 + act3 * 2), (fxR(((T.now / 33) | 0) + 5) - .5) * sk * (t < B[1] ? 1 : 1 + act3 * 2));
            g.fillStyle = "#000"; g.fillRect(-20, -20, w + 40, h + 40);
            if (t < B[0]) {                                                         // ACT 1: four red eyes open
                const a = t / B[0], fog = g.createRadialGradient(cx, cy, 0, cx, cy, R * .8); fog.addColorStop(0, "rgba(200,10,20," + (.35 + .1 * Math.sin(s * 6)) + ")"); fog.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = fog; g.fillRect(0, 0, w, h);
                g.fillStyle = "#ff5a3a"; for (let i = 0; i < 50; i++) { g.globalAlpha = .6 * fxR(i + 2); g.fillRect(fxR(i) * w, h - ((fxR(i + 3) * .5 + s * .1 * (.4 + fxR(i + 8))) % 1) * h, 2, 2 + fxR(i) * 5); } g.globalAlpha = 1;
                const EW = Math.min(w * .22, 280), mo = fxS(.10, .38, a), lo = fxS(.40, .68, a), z = 1 + a * a * .25;
                g.save(); g.translate(cx, cy); g.scale(z, z);
                fxEye(g, -EW * .78, -EW * .30, EW, mo, Object.assign({ tilt: .14 }, FX_SUK_EYE)); fxEye(g, EW * .78, -EW * .30, EW, mo, Object.assign({ tilt: -.14 }, FX_SUK_EYE));
                fxEye(g, -EW * .78, EW * .40, EW * .62, lo, Object.assign({ tilt: .12 }, FX_SUK_EYE)); fxEye(g, EW * .78, EW * .40, EW * .62, lo, Object.assign({ tilt: -.12 }, FX_SUK_EYE));
                g.restore();
            } else {                                                                // ACT 2 + 3: the shrine
                const b = Math.min(1, (t - B[0]) / (B[1] - B[0])), rise = fxS(.05, .55, b), dim = t >= B[1] ? 1 - act3 * .35 : 1;
                const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, "#000"); sky.addColorStop(.55, "#4a070b"); sky.addColorStop(.85, "#a8141a"); sky.addColorStop(1, "#2a0306"); g.fillStyle = sky; g.fillRect(0, 0, w, h);
                const my = h * .36, mr = M * .27, mg = g.createRadialGradient(cx, my, mr * .1, cx, my, mr); mg.addColorStop(0, "#ff7a60"); mg.addColorStop(.7, "#b01a1f"); mg.addColorStop(1, "#40050a"); g.fillStyle = mg; g.beginPath(); g.arc(cx, my, mr, 0, 6.283); g.fill();
                g.save(); g.translate(cx, my); g.rotate(s * .08); g.fillStyle = "rgba(255,60,40,.1)"; for (let i = 0; i < 16; i++) { const an = i / 16 * 6.283; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(an - .05) * R * 1.3, Math.sin(an - .05) * R * 1.3); g.lineTo(Math.cos(an + .05) * R * 1.3, Math.sin(an + .05) * R * 1.3); g.fill(); } g.restore();
                const gy = h * .86; g.fillStyle = "#1a0205"; g.fillRect(0, gy, w, h - gy);
                g.strokeStyle = "rgba(255,70,55,.35)"; g.lineWidth = 2; for (let i = 0; i < 26; i++) { const yy = gy + 6 + fxR(i) * (h - gy), xx = fxR(i + 3) * w; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + 40 + fxR(i + 5) * 120, yy); g.stroke(); }
                const sc = Math.min(w / 900, h / 760);
                fxShrine(g, cx, gy + (1 - rise) * h * .6, sc, 1 + .25 * Math.sin(s * 5));
                g.globalAlpha = .9 * dim; g.strokeStyle = "#e9ddc6"; g.lineWidth = M * .012; g.lineCap = "round"; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(w * .06, h + M * .02, M * (.12 + i * .045), 3.9, 5.2); g.stroke(); g.beginPath(); g.arc(w * .94, h + M * .02, M * (.12 + i * .045), 4.2, 5.5); g.stroke(); } g.globalAlpha = 1;
                for (let k = 0; k < 3; k++) { const q = ((s * .7 - k * .33) % 1 + 1) % 1; g.beginPath(); g.arc(cx, gy - 100 * sc, q * R, 0, 6.283); g.strokeStyle = "rgba(255,70,50," + (.55 * (1 - q)) + ")"; g.lineWidth = 6 * (1 - q) + 1; g.stroke(); }
                if (t < B[1]) {
                    "領域展開".split("").forEach((ch, i) => { const p = fxS(.05 + i * .06, .2 + i * .06, b); g.globalAlpha = p; fxText(g, ch, w * .09, h * .17 + i * M * .115 - (1 - p) * 40, M * .1, "#fff", "#b10e18", "#ff2a1a"); });
                    "伏魔御廚子".split("").forEach((ch, i) => { const p = fxS(.30 + i * .06, .45 + i * .06, b); g.globalAlpha = p; fxText(g, ch, w * .91, h * .12 + i * M * .115 - (1 - p) * 40, M * .1, "#fff", "#b10e18", "#ff2a1a"); }); g.globalAlpha = 1;
                    g.globalAlpha = fxS(.45, .65, b); fxText(g, "D O M A I N   E X P A N S I O N", cx, h * .09, M * .04, "#ffe3dc", "#4a0508", "#ff2a1a", "sans-serif"); fxText(g, "MALEVOLENT SHRINE", cx, h * .945, M * .075, "#fff", "#c5121e", "#ff2a1a", "sans-serif"); g.globalAlpha = 1;
                } else {                                                            // ACT 3: Dismantle / Cleave, the whole screen gets cut
                    const c = act3, N = 48; let live = 0; g.lineCap = "round";
                    for (let k = 0; k < N; k++) {
                        const tk = .10 + .78 * Math.pow(k / N, 1.35), lt = (c - tk) / .10; if (lt < 0) continue;
                        const L = fxSlashGeom(k, w, h), e = Math.min(1, lt * 3), hx = L[0] + (L[2] - L[0]) * (1 - Math.pow(1 - e, 3)), hy = L[1] + (L[3] - L[1]) * (1 - Math.pow(1 - e, 3));
                        g.globalAlpha = Math.max(.12, .5 - (c - tk) * .5); g.strokeStyle = "#ff2a2a"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(L[0], L[1]); g.lineTo(hx, hy); g.stroke();
                        if (lt < 1) { live++; g.globalAlpha = 1; g.strokeStyle = "#fff"; g.lineWidth = 3 + (1 - lt) * 12; g.shadowColor = "#ff1a1a"; g.shadowBlur = 28; g.beginPath(); g.moveTo(L[0], L[1]); g.lineTo(hx, hy); g.stroke(); g.shadowBlur = 0; }
                    }
                    g.globalAlpha = 1; if (live) { g.fillStyle = "rgba(255,40,30," + Math.min(.28, live * .06) + ")"; g.fillRect(0, 0, w, h); }
                    const sl = fxSlam(Math.min(1, c / .30)); if (c < .30) { g.save(); g.translate(cx, cy); g.rotate(-.12); g.scale(sl.sc, sl.sc); g.globalAlpha = sl.a; fxText(g, "解", -M * .22, 0, M * .3, "#fff", "#c5121e", "#ff2a1a"); fxText(g, "DISMANTLE", M * .1, M * .02, M * .12, "#fff", "#c5121e", "#ff2a1a", "sans-serif"); g.restore(); g.globalAlpha = 1; }
                    const s2 = fxSlam(Math.min(1, Math.max(0, (c - .46) / .2))); if (c > .46 && c < .66) { g.save(); g.translate(w * .72, h * .26); g.rotate(.1); g.scale(s2.sc, s2.sc); g.globalAlpha = s2.a; fxText(g, "捌  CLEAVE", 0, 0, M * .1, "#fff", "#c5121e", "#ff2a1a"); g.restore(); g.globalAlpha = 1; }
                    const wo = fxS(.9, 1, c); if (wo > 0) { g.fillStyle = "rgba(255,255,255," + wo * .8 + ")"; g.fillRect(0, 0, w, h); }
                }
                const fl = Math.max(0, 1 - (t - B[0]) / .03) * .9; if (fl > 0) { g.fillStyle = "rgba(255,230,220," + fl + ")"; g.fillRect(0, 0, w, h); }
            }
            if (t < B[0]) { const fl = fxS(.9, 1, t / B[0]); if (fl > 0) { g.fillStyle = "rgba(255,60,40," + fl + ")"; g.fillRect(0, 0, w, h); } }
            g.restore();
        } else {                                                                    // ENDING: the screen falls apart, 5 cards are thrown at the opponent
            const tt = T.tt, e = Math.max(0, (tt - .04) / .40);
            if (env.snap && e < 1) {
                env.shards.forEach(sh => {
                    const o = e * e; g.save(); g.globalAlpha = 1 - fxS(.75, 1, e);
                    g.translate(sh.cx + sh.dx * o * R * sh.d, sh.cy + sh.dy * o * R * sh.d + o * o * h * .5); g.rotate(sh.r * o); g.translate(-sh.cx, -sh.cy);
                    g.beginPath(); sh.p.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.save(); g.clip(); g.drawImage(env.snap, 0, 0, w, h); g.restore();
                    g.strokeStyle = "#ff2a2a"; g.lineWidth = 2; g.stroke(); g.restore();
                });
            }
            const tx = cx, ty = h * .16;
            for (let i = 0; i < 5; i++) {
                const st = .22 + i * .085, p = (tt - st) / .26; if (p < 0) continue;
                const x0 = cx + (i - 2) * w * .05, y0 = h * 1.08, x1 = cx + (i - 2) * w * .16, y1 = h * .55, x2 = tx + (i - 2) * w * .03, y2 = ty;
                const q = Math.min(1, p);
                for (let tr = 5; tr >= 0; tr--) { const r = Math.max(0, q - tr * .035), u1 = 1 - r, px = u1 * u1 * x0 + 2 * u1 * r * x1 + r * r * x2, py = u1 * u1 * y0 + 2 * u1 * r * y1 + r * r * y2;
                    if (tr) { g.globalAlpha = .12 * (6 - tr) * (q < 1 ? 1 : 0); g.fillStyle = "#ff2a2a"; g.beginPath(); g.arc(px, py, M * .02, 0, 6.283); g.fill(); } else { g.globalAlpha = 1; fxCardBack(g, px, py, M * (.0028 + .0024 * (1 - q)), q * 14 + i, (i - 2) * .25 + q * 5); } }
                if (p >= 1 && p < 1.5) { const r = (p - 1) / .5; g.globalAlpha = 1 - r; g.beginPath(); g.arc(x2, y2, M * .02 + r * M * .1, 0, 6.283); g.strokeStyle = "#ff3a2a"; g.lineWidth = 6 * (1 - r); g.stroke(); g.globalAlpha = 1; }
            }
            const lp = fxS(.62, .76, tt); if (lp > 0) { const sl = fxSlam(Math.min(1, (tt - .62) / .3)); g.save(); g.translate(cx, h * .42); g.scale(.7 + .3 * sl.sc / 3.2, .7 + .3 * sl.sc / 3.2); g.globalAlpha = lp * (1 - fxS(.93, 1, tt));
                fxText(g, "+5", 0, 0, M * .26, "#fff", "#c5121e", "#ff2a1a", "sans-serif"); fxText(g, env.to + " draws 5 cards", 0, M * .2, M * .06, "#ffe3dc", "#4a0508", "#ff2a1a", "sans-serif"); g.restore(); g.globalAlpha = 1; }
        }
    }
};

function unoSceneHook(key, S) {
    const gen = UNO_FX_HOOKS[key];
    return (box, done, c, u) => {
        const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce) return gen(box, done, c, u);
        box.textContent = ""; box.classList.add("cine"); box.style.setProperty("--c", S.col);
        let ended = false, voice = null; const env = { box: box };
        const finish = () => { if (ended) return; ended = true; if (voice) unoVoiceStop(voice); try { S.end && S.end(env, u); } catch (e) { console.warn(e); } done(); };
        box.addEventListener("click", finish);
        try { S.begin && S.begin(env, box, u, c); } catch (e) { console.warn(e); }
        unoVoiceLoad(key, 900).then(info => { if (ended) return; run(info, info ? Math.min(UNO_FX_MAX, Math.max(UNO_FX_MIN, info.dur * 1000 + 700)) : S.ms); }).catch(e => { console.warn(e); finish(); });
        function run(info, main) {
            const tail = S.tail(env); main = Math.min(main, UNO_FX_MAX - tail); const total = main + tail, cv = hbEl("canvas", "fx-cv"); box.appendChild(cv);
            const dpr = Math.min(1.5, window.devicePixelRatio || 1), W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr, g = cv.getContext("2d");
            const prog = hbEl("div", "fx-prog"), pin = hbEl("i"); prog.appendChild(pin); box.appendChild(prog); box.appendChild(hbEl("div", "fx-skip", "TAP TO SKIP"));
            if (info) voice = unoVoicePlay(info);
            const t0 = performance.now();
            const frame = now => {
                if (ended) return;
                if (!box.isConnected) { finish(); return; }
                const el = now - t0, ph = el < main ? "main" : "tail";
                if (ph === "tail" && !env.tailed) { env.tailed = true; try { S.tailStart && S.tailStart(env, cv, u, W, H); } catch (e) { console.warn(e); } }
                g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.scale(W / innerWidth, W / innerWidth);
                try { S.draw(g, innerWidth, innerHeight, { ph: ph, t: Math.min(1, el / main), tt: ph === "tail" ? Math.min(1, (el - main) / tail) : 0, s: el / 1000, el: el, now: now, main: main }, env, u); } catch (e) { console.warn(e); }
                pin.style.width = Math.max(0, (1 - el / total) * 100) + "%";
                if (el < total) requestAnimationFrame(frame); else finish();
            };
            requestAnimationFrame(frame);
            setTimeout(finish, total + 600);
        }
    };
}
UNO_FX_HOOKS.jjk_e = unoSceneHook("jjk_e", unoGojo);
UNO_FX_HOOKS.jjk_u = unoSceneHook("jjk_u", unoSukuna);

/* =====================================================================
   MORE SCENES (first person):  bleach_u Ichigo · onepiece_u Luffy · naruto_u Naruto
   Shared ending pieces: fxSnap (freeze the screen), fxDust (dust + debris), fxThrow (the 5 thrown cards)
   ===================================================================== */
Object.assign(UNO_SCENE_T, { bleach_u: [.18, .50], onepiece_u: [.20, .45], naruto_u: [.30, .60] });
function fxSnap(env, cv, W, H) { const sn = document.createElement("canvas"); sn.width = W; sn.height = H; sn.getContext("2d").drawImage(cv, 0, 0); env.snap = sn; env.box.style.background = "transparent"; }
function fxDust(g, cx, cy, e, n, spread, seed) {
    for (let i = 0; i < n; i++) {
        const a = fxR(i + seed) * 6.283, d = e * spread * (.3 + fxR(i + seed + 7)), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * .6 + e * e * spread * .5 * fxR(i + seed + 3), al = Math.max(0, 1 - e);
        if (i % 3) { const r = 18 + fxR(i + seed + 5) * 40 * (.4 + e), pg = g.createRadialGradient(x, y, 0, x, y, r); pg.addColorStop(0, "rgba(205,195,185," + .35 * al + ")"); pg.addColorStop(1, "rgba(205,195,185,0)"); g.fillStyle = pg; g.fillRect(x - r, y - r, r * 2, r * 2); }
        else { g.save(); g.translate(x, y); g.rotate(e * 6 * (fxR(i) - .5)); g.globalAlpha = al; g.fillStyle = i % 2 ? "#3a3a44" : "#8a8a96"; g.fillRect(-5, -3, 8 + fxR(i + seed + 1) * 14, 6 + fxR(i + seed + 2) * 8); g.restore(); }
    }
}
function fxThrow(g, w, h, tt, env, mode, t0) {
    const M = Math.min(w, h), cx = w / 2;
    for (let i = 0; i < 5; i++) {
        const p = (tt - (t0 + i * .085)) / .28; if (p < 0) continue; const q = Math.min(1, p), o = i - 2;
        const P = mode === "sky" ? [cx + o * w * .14, -h * .12, cx + o * w * .2, h * .1, cx + o * w * .07, h * .4] : [cx, h * .5, cx + o * w * .3, h * .22, cx + o * w * .07, h * .13];
        const pos = r => { const u = 1 - r; return [u * u * P[0] + 2 * u * r * P[2] + r * r * P[4], u * u * P[1] + 2 * u * r * P[3] + r * r * P[5]]; };
        for (let tr = 4; tr > 0; tr--) { const a = pos(Math.max(0, q - tr * .04)); g.globalAlpha = q < 1 ? .1 * (5 - tr) : 0; g.fillStyle = env.trail || "#fff"; g.beginPath(); g.arc(a[0], a[1], M * .018, 0, 6.283); g.fill(); }
        g.globalAlpha = 1; const c = pos(q); fxCardBack(g, c[0], c[1], M * (mode === "sky" ? .0025 : .0036 - .0018 * q), q * 12 + i, o * .25 + q * 5);
        if (p >= 1 && p < 1.5) { const r = (p - 1) / .5; g.globalAlpha = 1 - r; g.beginPath(); g.arc(P[4], P[5], M * .02 + r * M * .09, 0, 6.283); g.strokeStyle = env.trail || "#fff"; g.lineWidth = 6 * (1 - r); g.stroke(); g.globalAlpha = 1; fxDust(g, P[4], P[5], r, 6, M * .12, i * 11); }
    }
    const lp = fxS(.7, .82, tt); if (lp > 0) { const sl = fxSlam(Math.min(1, (tt - .7) / .3)), k = .7 + .3 * sl.sc / 3.2; g.save(); g.translate(cx, mode === "sky" ? h * .66 : h * .5); g.scale(k, k); g.globalAlpha = lp * (1 - fxS(.94, 1, tt));
        fxText(g, "+5", 0, 0, M * .26, "#fff", env.edge || "#000", env.trail || "#fff", "sans-serif"); fxText(g, env.to + " draws 5 cards", 0, M * .2, M * .06, "#fff", env.edge || "#000", env.trail || "#fff", "sans-serif"); g.restore(); g.globalAlpha = 1; }
}
function fxBlade(g, hx, hy, ang, len, glow) {
    g.save(); g.translate(hx, hy); g.rotate(ang); const bw = 24;
    g.strokeStyle = "#ff2a3a"; g.lineWidth = 3; g.beginPath(); g.moveTo(-12, 0); g.quadraticCurveTo(-60, 40, -40, 110); g.stroke();   // the chain
    g.beginPath(); g.moveTo(0, -bw * .5); g.lineTo(len, -bw * .2); g.lineTo(len + bw, bw * .3); g.lineTo(0, bw * .5); g.closePath();
    const gr = g.createLinearGradient(0, -bw, 0, bw); gr.addColorStop(0, "#000"); gr.addColorStop(1, "#24101a"); g.fillStyle = gr; g.fill();
    g.strokeStyle = "#ff2a3a"; g.lineWidth = 2 + glow * 7; g.shadowColor = "#ff1030"; g.shadowBlur = 8 + glow * 46; g.stroke(); g.shadowBlur = 0;
    g.fillStyle = "#0a0408"; fxRR(g, -4, -34, 14, 68, 6); g.fill(); g.strokeStyle = "#ff2a3a"; g.lineWidth = 2; g.stroke(); g.restore();
}
function fxFin(env, S) { return { tail: () => 3800, tailStart(e, cv, u, W, H) { fxSnap(e, cv, W, H); }, begin(e, box, u) { e.to = u.names["p" + (u.fx.to || unoNext(u, u.fx.p, 1))] || "?"; Object.assign(e, S); } }; }

/* ---------- ICHIGO · Bankai, Getsuga Tensho: the screen is cut in half ---------- */
const unoIchigo = Object.assign(fxFin(0, { trail: "#ff3050", edge: "#2a0008" }), {
    col: "#ff3050", ms: 12000,
    draw(g, w, h, T, env) {
        const cx = w / 2, cy = h / 2, M = Math.min(w, h), B = UNO_SCENE_T.bleach_u;
        if (T.ph === "main") {
            const t = T.t, s = T.s, c = t >= B[1] ? (t - B[1]) / (1 - B[1]) : 0, sk = c > .12 ? 3 + 12 * fxS(.12, .3, c) * (1 - fxS(.8, 1, c)) : 0;
            g.save(); g.translate((fxR((T.now / 33) | 0) - .5) * sk, (fxR(((T.now / 33) | 0) + 5) - .5) * sk);
            g.fillStyle = "#000"; g.fillRect(-20, -20, w + 40, h + 40); const vg = g.createRadialGradient(cx, h * .6, 0, cx, h * .6, Math.hypot(w, h) * .6); vg.addColorStop(0, "rgba(130,0,20," + (.28 + .12 * Math.sin(s * 3)) + ")"); vg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = vg; g.fillRect(0, 0, w, h);
            g.fillStyle = "#ff3050"; for (let i = 0; i < 60; i++) { g.globalAlpha = .5 * fxR(i + 2); g.fillRect(fxR(i) * w, h - ((fxR(i + 3) * .6 + s * .09 * (.4 + fxR(i + 8))) % 1) * h, 2, 3 + fxR(i) * 7); } g.globalAlpha = 1;
            let ang, hy = h * 1.0, glow = 0, len = h * 1.3;
            if (t < B[0]) { const a = t / B[0]; ang = -1.5708 + .3; g.save(); g.translate(cx, h); const br = 1 + .025 * Math.sin(s * 3.4); g.scale(br, br); g.translate(-cx, -h); g.globalAlpha = 1; fxBlade(g, cx + M * .05, hy, ang, len, .2); g.restore();
                g.globalAlpha = fxS(.35, .6, a); fxText(g, "卍解", cx, h * .3, M * .2, "#fff", "#c5122a", "#ff1030"); g.globalAlpha = 1; }
            else {
                const b = Math.min(1, (t - B[0]) / (B[1] - B[0])), lift = fxS(0, .7, b);
                ang = -1.5708 + .3 * (1 - lift) - .12 * fxS(.7, 1, b); hy = h * (1 - .12 * lift); glow = b;
                if (t >= B[1]) { const f = fxS(0, .22, c); len *= 1 - f * .8; hy += h * .12 * f; ang += .5 * f; glow = 1 - f * .4; }
                const bx = cx + M * .05 + (t < B[1] ? 0 : 0), ex = bx + Math.cos(ang) * len * .6, ey = hy + Math.sin(ang) * len * .6;
                if (t < B[1]) for (let i = 0; i < 70; i++) { const ph = (s * .9 + fxR(i + 9)) % 1, a0 = fxR(i) * 6.283, d = (1 - ph) * M * .9 + 30, px = ex + Math.cos(a0) * d, py = ey + Math.sin(a0) * d; g.globalAlpha = ph * .9 * b; g.strokeStyle = i % 3 ? "#ff2a3a" : "#fff"; g.lineWidth = 1 + fxR(i + 2) * 3; g.beginPath(); g.moveTo(px, py); g.lineTo(px - Math.cos(a0) * 30, py - Math.sin(a0) * 30); g.stroke(); } g.globalAlpha = 1;
                fxBlade(g, bx, hy, ang, len, glow);
                if (t < B[1]) { g.globalAlpha = fxS(.3, .5, b) * (1 - fxS(.9, 1, b)); fxText(g, "月牙天衝", cx, h * .22, M * .17, "#fff", "#c5122a", "#ff1030"); g.globalAlpha = 1; }
            }
            fxFist(g, cx + M * .06, h * 1.0 - (t < B[0] ? 0 : h * .12 * fxS(0, .7, Math.min(1, (t - B[0]) / (B[1] - B[0]))) * (t < B[1] ? 1 : 1)) + 20, M * .0034, 0, 1, 0); fxFist(g, cx + M * .02, h * 1.0 + 70 - (t < B[0] ? 0 : h * .12 * fxS(0, .7, Math.min(1, (t - B[0]) / (B[1] - B[0])))), M * .0034, 0, 1, 0);
            if (t >= B[1]) {
                const q = fxS(.15, .7, c);
                if (c > .15 && c < .92) for (let k = 8; k >= 0; k--) { const qq = Math.max(0, q - k * .035), R = M * (.62 - .3 * qq), y = h * (.9 - .5 * qq), cc = R * .35, rho = Math.sqrt(R * R + cc * cc);
                    g.save(); g.translate(cx, y); g.beginPath(); g.arc(0, 0, R, Math.PI, 2 * Math.PI, false); g.arc(0, cc, rho, Math.atan2(-cc, R), Math.atan2(-cc, -R), true); g.closePath();
                    g.globalAlpha = k ? .09 : 1; g.fillStyle = "#050005"; g.fill(); if (!k) { g.strokeStyle = "#ff1a3a"; g.lineWidth = 10; g.shadowColor = "#ff0030"; g.shadowBlur = 50; g.stroke(); g.shadowBlur = 0; g.strokeStyle = "#fff"; g.lineWidth = 3; g.stroke(); } g.restore(); }
                if (c > .1 && c < .45) { const sl = fxSlam((c - .1) / .35); g.save(); g.translate(cx, h * .3); g.rotate(-.08); g.scale(sl.sc, sl.sc); g.globalAlpha = sl.a; fxText(g, "月牙天衝", 0, 0, M * .2, "#fff", "#c5122a", "#ff1030"); g.restore(); g.globalAlpha = 1; }
                const lc = fxS(.74, .9, c); if (lc > 0) { g.beginPath(); g.moveTo(cx, cy - lc * h * .55); g.lineTo(cx, cy + lc * h * .55); g.strokeStyle = "#fff"; g.lineWidth = 6 + 10 * fxS(.85, 1, c); g.shadowColor = "#ff3050"; g.shadowBlur = 50; g.stroke(); g.shadowBlur = 0; }
                const wo = fxS(.9, 1, c); if (wo > 0) { g.fillStyle = "rgba(255,255,255," + wo + ")"; g.fillRect(0, 0, w, h); }
            }
            g.restore();
        } else {
            const tt = T.tt, e = fxS(.02, .5, tt);
            if (env.snap) {
                [[0, -1], [cx, 1]].forEach(hf => { g.save(); g.beginPath(); g.rect(hf[0], 0, cx, h); g.clip(); g.translate(hf[1] * e * w * .58, hf[1] * e * h * .05); g.rotate(hf[1] * e * .07); g.drawImage(env.snap, 0, 0, w, h); g.restore(); });
                const sa = 1 - fxS(0, .3, tt), sg = g.createLinearGradient(cx - 60 - e * w * .1, 0, cx + 60 + e * w * .1, 0); sg.addColorStop(0, "rgba(255,255,255,0)"); sg.addColorStop(.5, "rgba(255,255,255," + sa + ")"); sg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = sg; g.fillRect(cx - 60 - e * w * .1, 0, 120 + e * w * .2, h);
            }
            fxDust(g, cx, cy, Math.min(1, tt * 1.4), 40, M * .9, 3);
            fxThrow(g, w, h, tt, env, "hole", .18);
        }
    }
});

/* ---------- LUFFY · Gear 5, Dawn Gatling: punch the screen until the wall breaks ---------- */
const unoLuffy = Object.assign(fxFin(0, { trail: "#ffffff", edge: "#6a2a00" }), {
    col: "#ffd23f", ms: 12000,
    tailStart(env, cv, u, W, H) {
        fxSnap(env, cv, W, H); const w = innerWidth, h = innerHeight; let polys = [[[0, 0], [w, 0], [w, h], [0, h]]];
        const L = []; for (let i = 0; i < 7; i++) { const a = i * Math.PI / 7 + .2; L.push([w / 2 - Math.cos(a) * w, h / 2 - Math.sin(a) * w, w / 2 + Math.cos(a) * w, h / 2 + Math.sin(a) * w]); } for (let k = 60; k < 63; k++) L.push(fxSlashGeom(k, w, h));
        L.forEach(l => { const nx = []; polys.forEach(p => fxSplit(p, l).forEach(r => nx.push(r))); polys = nx; });
        env.shards = polys.map((p, i) => { let sx = 0, sy = 0; p.forEach(q => { sx += q[0]; sy += q[1]; }); sx /= p.length; sy /= p.length; const dx = sx - w / 2, dy = sy - h / 2, d = Math.hypot(dx, dy) || 1; return { p: p, cx: sx, cy: sy, dx: dx / d, dy: dy / d, r: (fxR(i + 4) - .5) * 1.4, d: .5 + fxR(i + 6) }; });
    },
    draw(g, w, h, T, env) {
        const cx = w / 2, cy = h / 2, M = Math.min(w, h), B = UNO_SCENE_T.onepiece_u;
        if (T.ph === "main") {
            const t = T.t, s = T.s, c = t >= B[1] ? (t - B[1]) / (1 - B[1]) : 0, sk = c > 0 ? 3 + 14 * fxS(0, .8, c) : 0;
            g.save(); g.translate((fxR((T.now / 33) | 0) - .5) * sk, (fxR(((T.now / 33) | 0) + 5) - .5) * sk);
            const bg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(w, h) / 2); bg.addColorStop(0, "#3a3550"); bg.addColorStop(1, "#0a0912"); g.fillStyle = bg; g.fillRect(-20, -20, w + 40, h + 40);
            g.strokeStyle = "rgba(255,255,255,.12)"; g.lineWidth = 2; for (let i = 0; i < 30; i++) { const a = fxR(i) * 6.283; g.beginPath(); g.moveTo(cx + Math.cos(a) * M * .3, cy + Math.sin(a) * M * .3); g.lineTo(cx + Math.cos(a) * w, cy + Math.sin(a) * w); g.stroke(); }
            if (t < B[1]) {
                const a1 = Math.min(1, t / B[0]), b = Math.max(0, (t - B[0]) / (B[1] - B[0])), pull = fxS(0, .8, b), z = 1 - .08 * pull; g.save(); g.translate(cx, cy); g.scale(z, z); g.translate(-cx, -cy);
                const fx = w * .62 + w * .3 * pull, fy = h * .74 + h * .36 * pull, sc = M * .0058 * (1 - .55 * pull), coat = fxS(.25, .9, a1);
                if (pull > 0) { g.strokeStyle = "#e3a982"; g.lineWidth = 34 * (1 - pull * .6); g.lineCap = "round"; g.beginPath(); g.moveTo(fx, fy); g.lineTo(w * 1.1, h * 1.2); g.stroke(); }
                fxFist(g, fx, fy, sc, -.15, coat, 1, s); g.restore();
                if (t < B[0]) { g.globalAlpha = fxS(.5, .8, a1); fxText(g, "武装色 · BUSOSHOKU", cx, h * .2, M * .07, "#fff", "#000", "#ff2a2a", "sans-serif"); g.globalAlpha = 1; }
                else { g.globalAlpha = fxS(0, .15, b) * (1 - fxS(.85, 1, b)); fxText(g, "GUM-GUM NO...", cx, h * .28, M * .1, "#fff", "#c26a00", "#ffd23f", "sans-serif"); g.globalAlpha = 1; }
            } else {
                const N = 70, shaken = [];
                for (let k = 0; k < N; k++) { const tk = .1 + .82 * Math.pow(k / N, 1.15), lt = (c - tk) / .11; if (lt < 0) continue; const px = cx + (fxR(k) - .5) * w * .6, py = cy + (fxR(k + 30) - .5) * h * .55;
                    if (lt >= 1) { g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 2; for (let r = 0; r < 6; r++) { const a = fxR(k * 7 + r) * 6.283, l = 40 + fxR(k + r) * 110; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * l * .5, py + Math.sin(a) * l * .5); g.lineTo(px + Math.cos(a + .3) * l, py + Math.sin(a + .3) * l); g.stroke(); } }
                    else { const sc = M * (.0006 + .0052 * Math.pow(lt, .7)); g.globalAlpha = .4 + .6 * (1 - lt * .3); fxFist(g, px + (fxR(k + 4) - .5) * 40 * (1 - lt), py + (1 - lt) * 60, sc, (fxR(k + 8) - .5) * .5, 1, 1, s); g.globalAlpha = 1;
                        if (lt > .55) { g.fillStyle = "rgba(255,255,255," + (1 - lt) * 1.6 + ")"; g.beginPath(); for (let r = 0; r < 12; r++) { const a = r / 12 * 6.283, rr = r % 2 ? M * .03 : M * .09 * (1 - lt); g.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr); } g.closePath(); g.fill(); } } }
                if (c < .3) { const sl = fxSlam(c / .3); g.save(); g.translate(cx, h * .2); g.rotate(-.05); g.scale(sl.sc, sl.sc); g.globalAlpha = sl.a; fxText(g, "DAWN GATLING", 0, 0, M * .12, "#fff", "#c26a00", "#ffd23f", "sans-serif"); g.restore(); g.globalAlpha = 1; }
                g.globalAlpha = .5 + .5 * Math.sin(s * 40); fxText(g, "ドドドドド", w * .2, h * .88, M * .08, "#ffd23f", "#000", "#ff8800"); g.globalAlpha = 1;
                const wo = fxS(.93, 1, c); if (wo > 0) { g.fillStyle = "rgba(255,255,255," + wo + ")"; g.fillRect(0, 0, w, h); }
            }
            g.restore();
        } else {
            const tt = T.tt, e = Math.max(0, (tt - .03) / .42);
            if (env.snap && e < 1) env.shards.forEach(sh => { const o = e * e; g.save(); g.globalAlpha = 1 - fxS(.7, 1, e); g.translate(cx + (sh.cx - cx) * (1 + o * 1.8) + sh.dx * o * M * .3 * sh.d, cy + (sh.cy - cy) * (1 + o * 1.8) + sh.dy * o * M * .3 * sh.d + o * o * h * .3);
                g.scale(1 + o * 1.2, 1 + o * 1.2); g.rotate(sh.r * o * .4); g.translate(-sh.cx, -sh.cy); g.beginPath(); sh.p.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.save(); g.clip(); g.drawImage(env.snap, 0, 0, w, h); g.restore(); g.strokeStyle = "#fff"; g.lineWidth = 3; g.stroke(); g.restore(); });
            fxDust(g, cx, cy, Math.min(1, tt * 1.3), 46, M * 1.1, 21);
            fxThrow(g, w, h, tt, env, "sky", .22);
        }
    }
});

/* ---------- NARUTO · Rasengan: a hole is drilled through the screen ---------- */
const unoNaruto = Object.assign(fxFin(0, { trail: "#7fe0ff", edge: "#06304f" }), {
    col: "#4cc9f0", ms: 12000,
    draw(g, w, h, T, env) {
        const cx = w / 2, cy = h / 2, M = Math.min(w, h), B = UNO_SCENE_T.naruto_u, Rm = Math.hypot(w, h) / 2;
        if (T.ph === "main") {
            const t = T.t, s = T.s, c = t >= B[1] ? (t - B[1]) / (1 - B[1]) : 0, grow = fxS(0, B[1] * 1.0, t);
            const sk = t < B[1] ? 1 + 5 * grow : 4 + 12 * fxS(.5, .8, c) * (1 - fxS(.8, 1, c)); g.save(); g.translate((fxR((T.now / 33) | 0) - .5) * sk, (fxR(((T.now / 33) | 0) + 5) - .5) * sk);
            g.fillStyle = "#03060f"; g.fillRect(-20, -20, w + 40, h + 40);
            let ox = cx, oy = h * .72 - M * .1 * grow, r = M * (.04 + .3 * grow);
            if (t >= B[1]) { const f = fxS(0, .5, c); ox = cx; oy = h * .62 + (cy - h * .62) * f; r = M * (.34 - .12 * f); }
            const aura = g.createRadialGradient(ox, oy, r * .3, ox, oy, r * 3.2); aura.addColorStop(0, "rgba(90,200,255,.5)"); aura.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = aura; g.fillRect(0, 0, w, h);
            if (t < B[1]) for (let i = 0; i < 80; i++) { const ph = (s * (.5 + grow) + fxR(i + 9)) % 1, a = fxR(i) * 6.283, d = (1 - ph) * M * .9 + r; g.globalAlpha = Math.min(1, ph * grow + .1); g.strokeStyle = i % 3 ? "#7fe0ff" : "#fff"; g.lineWidth = 1 + fxR(i + 2) * 2.5; g.beginPath(); g.moveTo(ox + Math.cos(a) * d, oy + Math.sin(a) * d); g.lineTo(ox + Math.cos(a) * (d + 26), oy + Math.sin(a) * (d + 26)); g.stroke(); } g.globalAlpha = 1;
            if (t < B[1]) fxAnimeHand(g, cx, h * .96, M * .0072, -.04, "open", { sleeve: "#d96a1a", cuff: "#1a1a22" });
            g.save(); g.translate(ox, oy); g.beginPath(); g.arc(0, 0, r, 0, 6.283); const og = g.createRadialGradient(0, 0, 0, 0, 0, r); og.addColorStop(0, "#ffffff"); og.addColorStop(.5, "#9fe8ff"); og.addColorStop(1, "#1a7fe0"); g.fillStyle = og; g.shadowColor = "#4cc9f0"; g.shadowBlur = 60; g.fill(); g.shadowBlur = 0; g.clip();
            g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = Math.max(2, r * .05); for (let k = 0; k < 9; k++) { g.rotate(s * 9 + k * .7); g.beginPath(); g.arc(0, 0, r * (.2 + k * .09), 0, 2.4); g.stroke(); } g.restore();
            if (t >= B[1]) {
                for (let k = 0; k < 4; k++) { const q = ((c * 2 - k * .2)); if (q <= 0 || q > 1) continue; g.beginPath(); g.arc(ox, oy, r * (1 + q * 3), 0, 6.283); g.strokeStyle = "rgba(160,235,255," + (1 - q) + ")"; g.lineWidth = 6; g.stroke(); }
                if (c > .55) { g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 3; for (let k = 0; k < 24; k++) { const a = fxR(k) * 6.283, l = M * (.1 + fxR(k + 3) * .5) * fxS(.55, .8, c); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * l * .5, cy + Math.sin(a) * l * .5); g.lineTo(cx + Math.cos(a + .2) * l, cy + Math.sin(a + .2) * l); g.stroke(); } }
            }
            const lab = t > B[0] * .5 && t < B[1] * 1.15 ? fxSlam(Math.min(1, (t - B[0] * .5) / (B[1] * 1.15 - B[0] * .5))) : null; if (lab) { g.save(); g.translate(cx, h * .2); g.scale(lab.sc, lab.sc); g.globalAlpha = lab.a; fxText(g, "螺旋丸 · RASENGAN", 0, 0, M * .1, "#fff", "#0a5aa8", "#4cc9f0"); g.restore(); g.globalAlpha = 1; }
            const wo = fxS(.92, 1, c); if (wo > 0 && t >= B[1]) { g.fillStyle = "rgba(255,255,255," + wo + ")"; g.fillRect(0, 0, w, h); }
            g.restore();
        } else {
            const tt = T.tt, e = fxS(.02, .5, tt), hole = e * Rm * 1.05 + 20 * e;
            if (env.snap) {
                const N = 14; for (let j = 0; j < N; j++) { const r0 = hole + (Rm - hole) * j / N, r1 = hole + (Rm - hole) * (j + 1) / N + 1, sw = e * 2.4 * Math.pow(1 - j / N, 2);
                    g.save(); g.translate(cx, cy); g.beginPath(); g.rect(-w, -h, w * 2, h * 2); g.arc(0, 0, r0, 0, 6.283, true); g.clip("evenodd"); g.beginPath(); g.rect(-w, -h, w * 2, h * 2); g.arc(0, 0, r1, 0, 6.283, false); g.clip();
                    g.rotate(sw); g.translate(-cx, -cy); g.drawImage(env.snap, 0, 0, w, h); g.restore(); }
                g.beginPath(); g.arc(cx, cy, hole, 0, 6.283); g.strokeStyle = "rgba(200,245,255," + (1 - fxS(.6, 1, tt)) + ")"; g.lineWidth = 8; g.shadowColor = "#4cc9f0"; g.shadowBlur = 40; g.stroke(); g.shadowBlur = 0;
            }
            fxDust(g, cx, cy, Math.min(1, tt * 1.3), 36, M * 1.0, 33);
            fxThrow(g, w, h, tt, env, "hole", .2);
        }
    }
});
UNO_FX_HOOKS.bleach_u = unoSceneHook("bleach_u", unoIchigo);
UNO_FX_HOOKS.onepiece_u = unoSceneHook("onepiece_u", unoLuffy);
UNO_FX_HOOKS.naruto_u = unoSceneHook("naruto_u", unoNaruto);

/* =====================================================================
   v3 · ANIME-HAND RENDERER + REAL-CARD STAGE + FREEZE CARDS (each one its own choreography)
   Rules: max 10 s · silent (voice lines still load from audio/special/ as before) · first-person view ·
   the frozen player's REAL cards are on stage (yours face-up if you are the target; an opponent's hand is shown as
   real card BACKS in their real count and layout, because showing their faces to everybody would leak their hand).
   ===================================================================== */
const FX_POSE = {
    open:  { f: [[.05, .16, .1], [0, .12, .1], [.04, .14, .1], [.08, .18, .12]], th: [-.2, .25] },
    point: { f: [[0, .04, .04], [0, .05, .05], [1.3, 1.5, 1], [1.4, 1.5, 1]], th: [.5, .7] },
    claw:  { f: [[.35, .5, .4], [.3, .5, .4], [.35, .5, .4], [.4, .55, .4]], th: [-.1, .5] }
};
function fxAnimeHand(g, x, y, s, ang, pose, o) {
    o = o || {}; const sk = o.skin || ["#fff0e2", "#f0b690", "#a05a3c"], sh = [], P = FX_POSE[pose];
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(o.flip ? -s : s, s); g.lineJoin = "round"; g.lineCap = "round";
    const seg = (px, py, a, L, w0, w1) => { const nx = -Math.sin(a), ny = Math.cos(a), ex = px + Math.cos(a) * L, ey = py + Math.sin(a) * L;
        sh.push(f => { g.beginPath(); g.moveTo(px + nx * w0 / 2, py + ny * w0 / 2); g.lineTo(ex + nx * w1 / 2, ey + ny * w1 / 2); g.lineTo(ex - nx * w1 / 2, ey - ny * w1 / 2); g.lineTo(px - nx * w0 / 2, py - ny * w0 / 2); g.closePath(); f(); g.beginPath(); g.arc(ex, ey, w1 / 2, 0, 6.283); f(); }); return [ex, ey, a]; };
    if (o.sleeve) { g.beginPath(); g.moveTo(-44, 38); g.lineTo(44, 38); g.lineTo(66, 200); g.lineTo(-66, 200); g.closePath(); g.fillStyle = o.sleeve; g.fill(); g.lineWidth = 4; g.strokeStyle = "#000"; g.stroke();
        g.strokeStyle = "rgba(255,255,255,.2)"; g.lineWidth = 3; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-30 + i * 20, 50); g.quadraticCurveTo(-36 + i * 24, 120, -44 + i * 29, 196); g.stroke(); }
        g.fillStyle = o.cuff || "#e8e8f0"; g.fillRect(-48, 32, 96, 14); }
    if (pose === "fist") {
        sh.push(f => { fxRR(g, -42, -30, 84, 78, 22); f(); }); for (let i = 0; i < 4; i++) sh.push(f => { fxRR(g, -46 + i, -40 + i * 19, 92 - i * 3, 21, 10); f(); }); sh.push(f => { fxRR(g, -60, 22, 62, 23, 11); f(); });
    } else {
        sh.push(f => { g.beginPath(); g.moveTo(-36, -34); g.lineTo(36, -34); g.bezierCurveTo(44, -6, 36, 26, 28, 44); g.lineTo(-26, 44); g.bezierCurveTo(-40, 24, -44, -8, -36, -34); g.closePath(); f(); });
        const L = [44, 52, 48, 38], bx = [-27, -9, 9, 27], sp = [-.17, -.05, .06, .18];
        for (let i = 0; i < 4; i++) { let a = -1.5708 + sp[i], px = bx[i], py = -34; [[.46, 15, 13], [.3, 13, 11], [.24, 11, 8]].forEach((q, j) => { a += P.f[i][j]; const r = seg(px, py, a, L[i] * q[0] * 1.5, q[1], q[2]); px = r[0]; py = r[1]; }); }
        let a = -2.5 + P.th[0], r = seg(-32, 22, a, 34, 19, 15); seg(r[0], r[1], a + P.th[1] * .5, 28, 15, 10);
    }
    const gr = g.createLinearGradient(-50, 0, 50, 0); gr.addColorStop(0, sk[0]); gr.addColorStop(.55, sk[1]); gr.addColorStop(1, sk[2]);
    sh.forEach(f => f(() => { g.fillStyle = gr; g.fill(); }));
    sh.forEach(f => f(() => { g.lineWidth = 3.5; g.strokeStyle = o.ink || "#3a1a10"; g.stroke(); }));
    g.strokeStyle = "rgba(120,50,30,.55)"; g.lineWidth = 2; if (pose !== "fist") for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-30 + i * 6, -6 + i * 10); g.quadraticCurveTo(0, 6 + i * 8, 30 - i * 4, -2 + i * 12); g.stroke(); }
    if (o.coat > 0) { const ga = g.globalAlpha; g.globalAlpha = ga * o.coat; sh.forEach(f => f(() => { g.fillStyle = "#07050b"; g.fill(); })); sh.forEach(f => f(() => { g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 2; g.stroke(); }));
        if (o.cr) { g.strokeStyle = "#ff2a2a"; g.lineWidth = 3; g.shadowColor = "#f00"; g.shadowBlur = 14; const q = Math.floor((o.T || 0) * 14); for (let i = 0; i < 7; i++) { const bx2 = -50 + fxR(i + q) * 100, by = -45 + fxR(i + 9 + q) * 90; g.beginPath(); g.moveTo(bx2, by); g.lineTo(bx2 + 18, by - 10); g.lineTo(bx2 + 8, by + 6); g.lineTo(bx2 + 30, by + 4); g.stroke(); } g.shadowBlur = 0; }
        g.globalAlpha = ga; }
    g.restore();
}
function fxFist(g, x, y, s, ang, coat, cr, T) { fxAnimeHand(g, x, y, s * 1.05, ang, "fist", { coat: coat, cr: cr, T: T }); }

/* ----- real-card stage: the frozen player's real hand, fanned out in the middle of the screen ----- */
function fxLayout(box, u) {
    const w = innerWidth, h = innerHeight, to = u.fx.to || unoNext(u, u.fx.p, 1), real = to === Number(myPlayer);
    const ids = (u.hands["p" + to] || []).slice().sort((a, b) => (u.cards[a].s - u.cards[b].s) || (u.cards[a].v - u.cards[b].v)), n = Math.max(1, ids.length);
    const k = Math.min(h * .36 / 330, (w * .9) / (220 * (1 + (n - 1) * .5)), 1.3), step = 220 * k * .5, mid = (n - 1) / 2, root = hbEl("div", "fx-hand"), cards = [];
    ids.forEach((ci, i) => {
        const d = i - mid, x = w / 2 + d * step, y = h * .5 + d * d * k * 2.2, rot = d * Math.min(.06, .6 / n), wrap = hbEl("div", "fx-hc"), el = real ? unoCardEl(u, ci, "big") : hbEl("div", "ucard big back");
        wrap.style.transform = "translate(" + (x - 110) + "px," + (y - 165) + "px) rotate(" + rot + "rad) scale(" + k + ")"; wrap.appendChild(el); root.appendChild(wrap);
        el.animate([{ opacity: 0, transform: "translateY(90px)" }, { opacity: 1, transform: "none" }], { duration: 600, delay: 200 + i * 45, easing: "ease-out", fill: "backwards" }); cards.push({ x: x, y: y, k: k, rot: rot });
    });
    box.appendChild(root); return { root: root, cards: cards, real: real, name: u.names["p" + to] || "?" };
}
function fxCard(g, c, fn) { g.save(); g.translate(c.x, c.y); g.rotate(c.rot); fxRR(g, -110 * c.k, -165 * c.k, 220 * c.k, 330 * c.k, 14 * c.k); g.clip(); fn(220 * c.k, 330 * c.k); g.restore(); }
function fxFrost(g, c, p, sd, tint) {
    if (p <= 0) return;
    fxCard(g, c, (W, H) => {
        const top = H / 2 - H * 1.05 * p, gr = g.createLinearGradient(0, H / 2, 0, top); gr.addColorStop(0, "rgba(235,250,255,.85)"); gr.addColorStop(.7, "rgba(" + tint + ",.45)"); gr.addColorStop(1, "rgba(" + tint + ",0)"); g.fillStyle = gr; g.fillRect(-W / 2, top, W, H * 1.1);
        g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = Math.max(1, c.k * 1.5);
        for (let i = 0; i < 14; i++) { let x = -W / 2 + W * fxR(i + sd), y = H / 2, a = -1.5708 + (fxR(i + sd + 5) - .5) * .5;
            for (let j = 0; j < 7 && H / 2 - y < H * p; j++) { const L = H * .07 * (1 + fxR(i + j + sd) * .8); g.beginPath(); g.moveTo(x, y); x += Math.cos(a) * L; y += Math.sin(a) * L; g.lineTo(x, y); g.moveTo(x, y); g.lineTo(x + Math.cos(a + .9) * L * .6, y + Math.sin(a + .9) * L * .6); g.moveTo(x, y); g.lineTo(x + Math.cos(a - .9) * L * .6, y + Math.sin(a - .9) * L * .6); g.stroke(); a += (fxR(i * 3 + j + sd) - .5) * .5; } }
    });
}
function fxSpire(g, x, y, hh, ww, e) {
    const h = hh * e; if (h < 2) return; const gr = g.createLinearGradient(x - ww / 2, 0, x + ww / 2, 0); gr.addColorStop(0, "rgba(235,250,255,.9)"); gr.addColorStop(.5, "rgba(150,210,255,.8)"); gr.addColorStop(1, "rgba(60,110,190,.85)");
    g.beginPath(); g.moveTo(x - ww / 2, y); g.lineTo(x - ww * .15, y - h * .7); g.lineTo(x, y - h); g.lineTo(x + ww * .2, y - h * .65); g.lineTo(x + ww / 2, y); g.closePath(); g.fillStyle = gr; g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.moveTo(x, y - h); g.lineTo(x - ww * .05, y); g.moveTo(x - ww * .15, y - h * .7); g.lineTo(x + ww * .2, y - h * .65); g.stroke();
}
function fxSnow(g, x, y, r) { g.save(); g.translate(x, y); for (let i = 0; i < 6; i++) { g.rotate(1.0472); g.beginPath(); g.moveTo(0, 0); g.lineTo(r, 0); [[.35, .32], [.6, .24], [.82, .14]].forEach(b => { const px = r * b[0], l = r * b[1]; g.moveTo(px, 0); g.lineTo(px + l * .6, l); g.moveTo(px, 0); g.lineTo(px + l * .6, -l); }); g.stroke(); } g.restore(); }
function fxLotus(g, x, y, r, open) {
    if (open <= 0) return; g.save(); g.translate(x, y);
    for (let ring = 0; ring < 3; ring++) { const n = 9 - ring * 2, len = r * (1 - ring * .27) * open;
        for (let i = 0; i < n; i++) { g.save(); g.rotate((i - (n - 1) / 2) * (1.9 / (n - 1)) * open); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * .38, -len * .45, 0, -len); g.quadraticCurveTo(-len * .38, -len * .45, 0, 0);
            const pg = g.createLinearGradient(0, 0, 0, -len); pg.addColorStop(0, "rgba(255,240,250,.95)"); pg.addColorStop(1, "rgba(150,210,255,.9)"); g.fillStyle = pg; g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke(); g.restore(); } }
    g.restore();
}
function fxDragon(g, P, uh, M) {
    const N = 44; for (let k = N; k >= 0; k--) { const u = uh - k * .011; if (u < 0) continue; const p = P(u), r = M * .05 * (1 - k / N * .75);
        g.beginPath(); g.arc(p[0], p[1], r, 0, 6.283); g.fillStyle = "rgba(225,246,255,.93)"; g.fill(); g.strokeStyle = "#7fd0ff"; g.lineWidth = 3; g.stroke();
        if (k % 3 === 0) { g.beginPath(); g.moveTo(p[0] - r * .4, p[1] - r * .8); g.lineTo(p[0], p[1] - r * 1.9); g.lineTo(p[0] + r * .4, p[1] - r * .8); g.fillStyle = "#fff"; g.fill(); } }
    const a = P(uh), b = P(Math.max(0, uh - .012)), an = Math.atan2(a[1] - b[1], a[0] - b[0]), r = M * .06; g.save(); g.translate(a[0], a[1]); g.rotate(an);
    g.beginPath(); g.moveTo(-r, -r); g.lineTo(r * 2.2, -r * .3); g.lineTo(r * 2.6, r * .25); g.lineTo(r * 1.2, r * .9); g.lineTo(-r, r); g.closePath(); g.fillStyle = "#f2fbff"; g.fill(); g.strokeStyle = "#5bbcff"; g.lineWidth = 4; g.stroke();
    g.beginPath(); g.moveTo(-r * .2, -r); g.lineTo(-r * 1.8, -r * 2.1); g.lineTo(r * .3, -r * .7); g.moveTo(-r * .2, r); g.lineTo(-r * 1.8, r * 2.1); g.lineTo(r * .3, r * .7); g.fillStyle = "#cfeeff"; g.fill(); g.stroke();
    g.beginPath(); g.arc(r * .9, -r * .2, r * .17, 0, 6.283); g.fillStyle = "#1a5fd0"; g.fill(); g.restore();
}
function fxGlass(g, x, y, w, h, a, al) { g.save(); g.translate(x, y); g.rotate(a); g.globalAlpha = al; g.beginPath(); g.moveTo(0, -h / 2); g.lineTo(w / 2, 0); g.lineTo(0, h / 2); g.lineTo(-w / 2, 0); g.closePath(); const gr = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); gr.addColorStop(0, "rgba(220,245,255,.9)"); gr.addColorStop(.5, "rgba(120,180,230,.55)"); gr.addColorStop(1, "rgba(230,250,255,.85)"); g.fillStyle = gr; g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 3; g.stroke(); g.restore(); }
function fxSky(g, w, h, a, b, c) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, a); gr.addColorStop(.6, b); gr.addColorStop(1, c); g.fillStyle = gr; g.fillRect(-20, -20, w + 40, h + 40); }

const FZ = {
    /* AOKIJI: calm, lazy. Frost creeps over the cards, the sea freezes, then huge ice spires burst up and entomb everything. */
    onepiece_f: { name: "Ice Age", sub: "Aokiji", col: "#bfeaff",
        cam: T => [1 + .14 * T.t, 0, -12 * T.t, 0],
        bg(g, w, h, T) { fxSky(g, w, h, "#0b1830", "#37587f", "#aac4dc"); const f = fxS(.12, .5, T.t); g.fillStyle = "rgba(210,240,255," + (.85 * f) + ")"; g.fillRect(w / 2 - w * f * .6, h * .62, w * f * 1.2, h);
            g.fillStyle = "rgba(255,255,255,.5)"; for (let i = 0; i < 40; i++) g.fillRect(fxR(i) * w, (fxR(i + 3) * .5 + T.s * .05 * (.3 + fxR(i + 8))) % 1 * h, 2, 2); },
        world(g, w, h, T, E) { E.cards.forEach((c, i) => fxFrost(g, c, fxS(.2 + i * .02, .52 + i * .02, T.t), i * 7, "150,210,255"));
            for (let j = 0; j < 11; j++) fxSpire(g, w * (.05 + .09 * j), h * .86, h * (.35 + .3 * fxR(j)), w * .09, fxS(.5 + fxR(j + 3) * .2, .84, T.t));
            E.cards.forEach(c => fxFrost(g, c, 1, 3, "150,210,255") || 0); },
        screen(g, w, h, T) { const b = Math.sin(T.s * 1.2) * 4; fxAnimeHand(g, w * .8, h * .9 + b, M3(w, h) * .0042, -.35, "open", { sleeve: "#1b2540", cuff: "#c9d6ee" }); } },
    /* HAKU: trapped inside a dome of ice mirrors; his reflection flickers between them; needles strike from every direction. */
    naruto_f: { name: "Crystal Ice Mirrors", sub: "Haku", col: "#9fe8ff",
        cam: T => [1.06 + .04 * Math.sin(T.s * 2), 14 * Math.sin(T.s * 1.3), 0, .035 * Math.sin(T.s * 1.7)],
        bg(g, w, h, T) { fxSky(g, w, h, "#03121a", "#0a3a4a", "#0a1e2a"); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, mx = w / 2 + Math.cos(a) * w * .46, my = h / 2 + Math.sin(a) * h * .46, al = fxS(.03 + i * .03, .12 + i * .03, T.t);
                fxGlass(g, mx, my, h * .22, h * .5, a + 1.5708, al); if (al > .9 && Math.floor(T.s * 6) % 14 === i) { g.fillStyle = "#13222a"; g.beginPath(); g.arc(mx, my - h * .08, h * .045, 0, 6.283); g.fill(); g.fillRect(mx - h * .05, my - h * .04, h * .1, h * .17); g.fillStyle = "#fff"; g.beginPath(); g.arc(mx, my - h * .075, h * .03, 0, 6.283); g.fill(); } } },
        world(g, w, h, T, E) { const n = E.cards.length; if (!n) return; for (let k = 0; k < 36; k++) { const tk = .4 + .45 * k / 36, p = (T.t - tk) / .07; if (p < 0) continue; const a = (k % 14) / 14 * 6.283, sx = w / 2 + Math.cos(a) * w * .46, sy = h / 2 + Math.sin(a) * h * .46, c = E.cards[k % n], tx = c.x + (fxR(k) - .5) * c.k * 150, ty = c.y + (fxR(k + 4) - .5) * c.k * 240, q = Math.min(1, p);
                const x = sx + (tx - sx) * q, y = sy + (ty - sy) * q, an = Math.atan2(ty - sy, tx - sx); g.strokeStyle = "#e8f6ff"; g.lineWidth = 3; g.shadowColor = "#9fe8ff"; g.shadowBlur = 10; g.beginPath(); g.moveTo(x - Math.cos(an) * 90, y - Math.sin(an) * 90); g.lineTo(x, y); g.stroke(); g.shadowBlur = 0;
                if (p >= 1) { g.beginPath(); g.arc(tx, ty, 8 + Math.min(40, (p - 1) * 160), 0, 6.283); g.strokeStyle = "rgba(180,235,255," + Math.max(0, 1 - (p - 1) * 4) + ")"; g.lineWidth = 3; g.stroke(); } }
            E.cards.forEach((c, i) => fxFrost(g, c, fxS(.68 + i * .02, .95, T.t), i * 5, "120,210,255")); },
        screen(g, w, h, T) { const m = M3(w, h) * .0036; fxAnimeHand(g, w * .3, h * .92, m, -.25, "point", { sleeve: "#e9dbe6", cuff: "#cfa0b8" }); fxAnimeHand(g, w * .7, h * .92, m, .25, "point", { sleeve: "#e9dbe6", cuff: "#cfa0b8", flip: true }); } },
    /* URAUME: elegant. A fingertip draws a glowing line, and precise snowflake lattices bloom along it over every card. */
    jjk_f: { name: "Frost Calm", sub: "Uraume", col: "#cfeaff",
        cam: T => [1 + .06 * T.t, 0, 0, 0],
        bg(g, w, h, T) { fxSky(g, w, h, "#07040f", "#150b2a", "#05030a"); g.beginPath(); g.arc(w * .5, h * .3, h * .22, 0, 6.283); g.fillStyle = "rgba(235,235,255,.14)"; g.fill(); g.fillStyle = "rgba(255,255,255,.7)"; for (let i = 0; i < 50; i++) g.fillRect(fxR(i) * w, ((fxR(i + 3) + T.s * .04 * (.3 + fxR(i + 8))) % 1) * h, 2, 2); },
        world(g, w, h, T, E) { const p = fxS(.05, .4, T.t); g.strokeStyle = "rgba(190,240,255,.95)"; g.lineWidth = 4; g.shadowColor = "#7fe9ff"; g.shadowBlur = 18; g.beginPath(); for (let i = 0; i <= 60 * p; i++) { const u = i / 60; g.lineTo(w * (.15 + .7 * u), h * (.3 + .1 * Math.sin(u * 9))); } g.stroke(); g.shadowBlur = 0;
            g.strokeStyle = "rgba(200,240,255,.28)"; g.lineWidth = 2; g.save(); g.translate(w / 2, h * .5); g.rotate(T.s * .15); fxSnow(g, 0, 0, Math.min(w, h) * .46 * fxS(.3, .7, T.t)); g.restore();
            E.cards.forEach((c, i) => { const e = fxS(.35 + i * .03, .66 + i * .03, T.t); fxFrost(g, c, e * .9, i * 11, "190,220,255"); g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = 2.5; g.save(); g.translate(c.x, c.y); g.rotate(c.rot + T.s * .3 * (i % 2 ? 1 : -1)); fxSnow(g, 0, 0, c.k * 105 * e); g.restore(); }); },
        screen(g, w, h, T) { const u = fxS(.05, .4, T.t); fxAnimeHand(g, w * (.15 + .7 * u), h * 1.02 - h * .1 * Math.sin(u * 9 * .5), M3(w, h) * .0045, -.15 + .25 * u, "point", { sleeve: "#14101c", cuff: "#c9c9e8", skin: ["#f6f0ff", "#d9cfe8", "#8a7aa0"] }); } },
    /* DOMA: beautiful and terrifying. Ice vines crawl up, giant frozen lotuses bloom, glittering freezing dust fills the air. */
    demonslayer_f: { name: "Frozen Lotus", sub: "Doma", col: "#ffd0f0",
        cam: T => [1 + .08 * Math.sin(T.t * 3), 0, 0, .02 * Math.sin(T.s)],
        bg(g, w, h, T) { fxSky(g, w, h, "#12051c", "#3a0f3c", "#1a0510"); const v = g.createRadialGradient(w / 2, h / 2, h * .3, w / 2, h / 2, h * .95); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(120,0,40," + (.55 + .15 * Math.sin(T.s * 3)) + ")"); g.fillStyle = v; g.fillRect(0, 0, w, h); },
        world(g, w, h, T, E) { fxLotus(g, w / 2, h * .62, Math.min(w, h) * .4, fxS(.1, .45, T.t) * .9);
            E.cards.forEach((c, i) => { const e = fxS(.28 + i * .03, .6 + i * .03, T.t); g.strokeStyle = "rgba(200,235,255,.9)"; g.lineWidth = 4; g.beginPath(); g.moveTo(c.x + (i % 2 ? 30 : -30), h); g.quadraticCurveTo(c.x + (i % 2 ? -40 : 40), c.y + c.k * 200, c.x, c.y + c.k * 200 - e * c.k * 330 * .55); g.stroke(); fxFrost(g, c, fxS(.5, .88, T.t), i * 9, "220,190,255"); fxLotus(g, c.x, c.y + c.k * 150, c.k * 105, fxS(.4 + i * .03, .7 + i * .03, T.t)); });
            for (let i = 0; i < 90; i++) { g.globalAlpha = .4 + .6 * Math.abs(Math.sin(T.s * 3 + i)); g.fillStyle = i % 3 ? "#e8f6ff" : "#ffc8ef"; g.fillRect(fxR(i) * w, h - ((fxR(i + 3) * .4 + T.s * .12 * (.4 + fxR(i + 8))) % 1) * h, 3, 3); } g.globalAlpha = 1; },
        screen(g, w, h, T) { fxAnimeHand(g, w * .22, h * .9, M3(w, h) * .0042, .3, "claw", { sleeve: "#4a1230", cuff: "#ffb0d8", skin: ["#fff4fa", "#f2c4dc", "#a8647e"], flip: true }); } },
    /* HITSUGAYA: Hyorinmaru. We hold the blade; an ice dragon spirals out, freezing each card as it passes, and crashes in a burst of ice. */
    bleach_f: { name: "Hyorinmaru", sub: "Toshiro Hitsugaya", col: "#bfeaff",
        cam: T => [1 + .06 * T.t, 0, 0, 0],
        bg(g, w, h, T) { fxSky(g, w, h, "#dff4ff", "#9ed0ee", "#eaf8ff"); g.save(); g.globalAlpha = .1; fxText(g, "氷輪丸", w / 2, h * .5, Math.min(w, h) * .6, "#000", "#000", "#000"); g.restore(); g.strokeStyle = "rgba(0,40,80,.12)"; g.lineWidth = 2; for (let i = 0; i < 26; i++) { const a = fxR(i) * 6.283; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * h * .4, h / 2 + Math.sin(a) * h * .4); g.lineTo(w / 2 + Math.cos(a) * w, h / 2 + Math.sin(a) * w); g.stroke(); } },
        world(g, w, h, T, E) { const P = u => { const an = u * 14; return [w / 2 + Math.cos(an) * w * .38 * (1 - u * .4), h * .5 + Math.sin(an) * h * .3 * (1 - u * .3)]; }, uh = fxS(.1, .7, T.t), n = E.cards.length;
            E.cards.forEach((c, i) => fxFrost(g, c, fxS(.25 + i / Math.max(1, n) * .5, .4 + i / Math.max(1, n) * .5, uh), i * 13, "130,200,255")); if (T.t < .74) fxDragon(g, P, uh, Math.min(w, h));
            const b = fxS(.72, .9, T.t); if (b > 0) { for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283; fxSpire(g, w / 2 + Math.cos(a) * w * .1 * b * 3, h * .5 + Math.sin(a) * h * .1 * b * 3 + h * .1, h * .3, w * .06, b); } g.beginPath(); g.arc(w / 2, h * .5, b * h * .7, 0, 6.283); g.strokeStyle = "rgba(255,255,255," + (1 - b) + ")"; g.lineWidth = 12; g.stroke(); } },
        screen(g, w, h, T) { const m = M3(w, h); g.save(); g.translate(w * .5, h * .98); g.beginPath(); g.moveTo(-14, 0); g.lineTo(-8, -h * .9); g.lineTo(0, -h * .98); g.lineTo(12, -h * .88); g.lineTo(16, 0); g.closePath(); g.fillStyle = "rgba(235,250,255,.95)"; g.fill(); g.strokeStyle = "#5bbcff"; g.lineWidth = 3 + 4 * Math.sin(T.s * 4) ** 2; g.shadowColor = "#5bbcff"; g.shadowBlur = 24; g.stroke(); g.shadowBlur = 0; g.restore();
            fxAnimeHand(g, w * .5, h * 1.0, m * .0058, 0, "fist", { skin: ["#fff0e2", "#f0b690", "#a05a3c"] }); } }
};
function M3(w, h) { return Math.min(w, h); }

function unoCineHook(key, S) {
    const gen = UNO_FX_HOOKS[key];
    return (box, done, c, u) => {
        if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return gen(box, done, c, u);
        box.textContent = ""; box.classList.add("cine"); box.style.setProperty("--c", S.col);
        let ended = false, voice = null;
        const finish = () => { if (ended) return; ended = true; if (voice) unoVoiceStop(voice); done(); };
        box.addEventListener("click", finish);
        unoVoiceLoad(key, 900).then(info => { if (ended) return; run(info, Math.min(UNO_FX_MAX, Math.max(UNO_FX_MIN, info ? info.dur * 1000 + 700 : 9500))); }).catch(e => { console.warn(e); finish(); });
        function run(info, ms) {
            const w = innerWidth, h = innerHeight, M = Math.min(w, h), dpr = Math.min(1.5, window.devicePixelRatio || 1), mk = cls => { const cv = hbEl("canvas", cls); cv.width = w * dpr; cv.height = h * dpr; box.appendChild(cv); return cv; };
            const cb = mk("fx-cv"), E = fxLayout(box, u), cf = mk("fx-cv fg"), gb = cb.getContext("2d"), gf = cf.getContext("2d");
            const prog = hbEl("div", "fx-prog"), pin = hbEl("i"); prog.appendChild(pin); box.appendChild(prog); box.appendChild(hbEl("div", "fx-skip", "TAP TO SKIP"));
            if (info) voice = unoVoicePlay(info);
            const t0 = performance.now();
            const frame = now => {
                if (ended) return; if (!box.isConnected) { finish(); return; }
                const el = now - t0, t = Math.min(1, el / ms), T = { t: t, s: el / 1000, ms: ms }, cam = S.cam(T), cx = w / 2, cy = h / 2;
                gb.setTransform(dpr, 0, 0, dpr, 0, 0); gb.clearRect(0, 0, w, h); try { S.bg(gb, w, h, T, E); } catch (e) { console.warn(e); }
                E.root.style.transform = "translate(" + cam[1] + "px," + cam[2] + "px) rotate(" + cam[3] + "rad) scale(" + cam[0] + ")";
                gf.setTransform(dpr, 0, 0, dpr, 0, 0); gf.clearRect(0, 0, w, h); gf.save(); gf.translate(cx + cam[1], cy + cam[2]); gf.rotate(cam[3]); gf.scale(cam[0], cam[0]); gf.translate(-cx, -cy);
                try { S.world(gf, w, h, T, E); } catch (e) { console.warn(e); } gf.restore();
                try { S.screen(gf, w, h, T, E); } catch (e) { console.warn(e); }
                const ta = fxS(.03, .1, t) * (1 - fxS(.5, .62, t)); if (ta > 0) { gf.globalAlpha = ta; fxText(gf, S.name, cx, h * .1, M * .075, "#fff", "#06304f", S.col, "sans-serif"); fxText(gf, S.sub + " → " + E.name, cx, h * .1 + M * .07, M * .028, "#fff", "#06304f", S.col, "sans-serif"); gf.globalAlpha = 1; }
                box.style.opacity = t > .93 ? Math.max(0, (1 - t) / .07) : 1; pin.style.width = (1 - t) * 100 + "%";
                if (t < 1) requestAnimationFrame(frame); else finish();
            };
            requestAnimationFrame(frame); setTimeout(finish, ms + 500);
        }
    };
}
Object.keys(FZ).forEach(k => { UNO_FX_HOOKS[k] = unoCineHook(k, FZ[k]); });


/* =====================================================================
   FIRST-PERSON SCENES, group 2:  jojo_f DIO (The World)  ·  naruto_e Neji (Byakugan)
   Silent for now. Each is under 10 s. Both aim at the REAL opponent plates on screen (rects read from the page).
   ===================================================================== */
function fxHand(g, x, y, M, col, pt) {            // first-person raised hand, finger pointing at the screen
    g.save(); g.translate(x, y); g.fillStyle = "#0a0710"; g.strokeStyle = col; g.lineWidth = 3; g.shadowColor = col; g.shadowBlur = 18;
    g.beginPath(); g.moveTo(M * .30, M * .6); g.lineTo(-M * .16, M * .6); g.quadraticCurveTo(-M * .24, M * .22, -M * .1, M * .1); g.lineTo(-M * .06, -M * .26); g.quadraticCurveTo(-M * .03, -M * .31, M * .01, -M * .26);
    g.lineTo(M * .03, M * .02); g.quadraticCurveTo(M * .17, M * .08, M * .22, M * .3); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.arc(-M * .045, -M * .1, M * .028 * (1 + .15 * Math.sin(pt)), 0, 6.283); g.stroke(); g.restore();
}
const unoDio = {
    col: "#ffd84a", ms: 8000, tail: () => 1800,
    begin(env, box, u) { env.to = u.fx.to; env.name = u.names["p" + u.fx.to] || "?"; const e = document.querySelector('.u-opp[data-p="' + u.fx.to + '"]'); env.r = e ? e.getBoundingClientRect() : null; },
    draw(g, w, h, T, env, u) {
        const cx = w / 2, cy = h / 2, M = Math.min(w, h), t = T.t, s = T.s, G = "#ffd84a", R = Math.hypot(w, h) / 2;
        const r = env.r || { left: w * .3, top: h * .03, width: w * .4, height: h * .14 }, tx = r.left + r.width / 2, ty = r.top + r.height / 2;
        if (T.ph === "tail") {                                       // time resumes for everyone else; the gold aura stays on the real plate
            const q = T.tt, a = 1 - fxS(.55, 1, q), pu = .5 + .5 * Math.sin(s * 7);
            g.globalAlpha = a; g.strokeStyle = G; g.lineWidth = 3 + 3 * pu; g.shadowColor = G; g.shadowBlur = 26; g.strokeRect(r.left - 8, r.top - 8, r.width + 16, r.height + 16); g.shadowBlur = 0;
            const sl = fxSlam(Math.min(1, q / .4)); g.save(); g.translate(cx, h * .3); g.scale(.55 + .45 * sl.sc / 3.2, .55 + .45 * sl.sc / 3.2); g.globalAlpha = Math.min(sl.a, a);
            fxText(g, env.name + " is frozen x2", 0, 0, M * .06, "#fff6c2", "#3a2600", G, "sans-serif"); g.restore(); g.globalAlpha = 1; return;
        }
        const stop = t >= .37, bgA = t < .84 ? 1 : 1 - fxS(.84, 1, t);
        g.globalAlpha = bgA; g.fillStyle = stop ? "#efe6c4" : "#06040a"; g.fillRect(0, 0, w, h); g.globalAlpha = 1;
        if (!stop) {                                                 // ACT 1: the clock rises, the hand lifts, time winds up
            const a = t / .37, vg = g.createRadialGradient(cx, cy, M * .2, cx, cy, R); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(60,40,0," + (.5 + .3 * Math.sin(s * 9) * a) + ")"); g.fillStyle = vg; g.fillRect(0, 0, w, h);
            "ゴゴゴゴゴ".split("").forEach((ch, i) => { g.globalAlpha = .35 * a; fxText(g, ch, w * (.12 + i * .19), h * (.18 + .05 * Math.sin(s * 3 + i)), M * .09, "#5a4300", "#000", G); }); g.globalAlpha = 1;
            const rs = fxS(.05, .5, a), cr = M * .24 * rs; g.save(); g.translate(cx, cy * .8); g.strokeStyle = G; g.lineWidth = 4; g.shadowColor = G; g.shadowBlur = 22; g.beginPath(); g.arc(0, 0, cr, 0, 6.283); g.stroke();
            for (let i = 0; i < 12; i++) { const an = i / 12 * 6.283; g.beginPath(); g.moveTo(Math.cos(an) * cr * .86, Math.sin(an) * cr * .86); g.lineTo(Math.cos(an) * cr * .98, Math.sin(an) * cr * .98); g.stroke(); }
            const sa = -1.57 + s * s * 2.4; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(sa) * cr * .8, Math.sin(sa) * cr * .8); g.stroke(); g.restore();
            fxHand(g, w * .74, h * (1.02 - .3 * fxS(.1, .6, a)), M, G, s * 5);
            if (t > .33) { g.fillStyle = "rgba(255,255,255," + fxS(.33, .37, t) + ")"; g.fillRect(0, 0, w, h); }
        } else {                                                     // ACT 2: TIME HAS STOPPED. everything hangs in the air, the target glows gold
            const b = (t - .37) / .63, sw = fxS(0, .25, b);
            g.fillStyle = "rgba(255,216,74,.18)"; g.beginPath(); g.arc(cx, cy, R * sw, 0, 6.283); g.fill();
            for (let i = 0; i < 4; i++) { const q = (b * 1.6 - i * .12); if (q > 0 && q < 1) { g.strokeStyle = "rgba(180,130,0," + (1 - q) + ")"; g.lineWidth = 6 * (1 - q); g.beginPath(); g.arc(cx, cy, q * R, 0, 6.283); g.stroke(); } }
            g.fillStyle = "#b08a1a"; for (let i = 0; i < 110; i++) { g.globalAlpha = .25 + .5 * fxR(i + 4); g.fillRect(fxR(i) * w, fxR(i + 3) * h, 2.5, 2.5 + fxR(i) * 3); } g.globalAlpha = 1;   // dust, motionless
            for (let i = 0; i < 9; i++) {                           // knives frozen mid-flight, all pointing at the opponent
                const sx = fxR(i + 20) * w, sy = h * (.55 + fxR(i + 30) * .5), p = .55 + fxR(i + 40) * .3, kx = sx + (tx - sx) * p, ky = sy + (ty - sy) * p, an = Math.atan2(ty - sy, tx - sx), L = M * (.07 + .05 * p);
                g.save(); g.translate(kx, ky); g.rotate(an); g.globalAlpha = fxS(.1, .35, b); g.fillStyle = "#4a3c10"; g.strokeStyle = "#fff6c2"; g.lineWidth = 1.5;
                g.beginPath(); g.moveTo(L, 0); g.lineTo(-L * .2, -L * .12); g.lineTo(-L, -L * .05); g.lineTo(-L, L * .05); g.lineTo(-L * .2, L * .12); g.closePath(); g.fill(); g.stroke(); g.restore();
            }
            const on = fxS(.15, .4, b), pu = .5 + .5 * Math.sin(s * 8);
            g.globalAlpha = on; g.fillStyle = "rgba(255,216,74," + (.18 + .1 * pu) + ")"; g.fillRect(r.left - 10, r.top - 10, r.width + 20, r.height + 20);
            g.strokeStyle = G; g.lineWidth = 4 + 3 * pu; g.shadowColor = G; g.shadowBlur = 34; g.strokeRect(r.left - 10, r.top - 10, r.width + 20, r.height + 20); g.shadowBlur = 0; g.globalAlpha = 1;
            const ov = fxSlam(Math.min(1, b / .28)); if (b < .5) { g.save(); g.translate(cx, cy); g.scale(ov.sc, ov.sc); g.globalAlpha = ov.a; fxText(g, "THE WORLD", 0, 0, M * .15, "#fff", "#3a2600", G, "sans-serif"); g.restore(); }
            g.globalAlpha = fxS(.3, .5, b) * (1 - fxS(.8, .95, b)); "時よ止まれ".split("").forEach((ch, i) => fxText(g, ch, w * .08, h * .2 + i * M * .1, M * .08, "#fff6c2", "#3a2600", G)); g.globalAlpha = 1;
        }
    }
};
UNO_FX_HOOKS.jojo_f = unoSceneHook("jojo_f", unoDio);

function fxChakra(g, w, h, s, a, M) {       // layered, branching chakra pathways seen from inside the body
    const cx = w / 2, cy = h / 2, R = Math.hypot(w, h) / 2, bg = g.createRadialGradient(cx, cy, 0, cx, cy, R); bg.addColorStop(0, "#0b1a4a"); bg.addColorStop(1, "#02040f"); g.fillStyle = bg; g.globalAlpha = a; g.fillRect(0, 0, w, h);
    const br = (x, y, an, len, d, sd, ly) => {
        if (d > 5) return; const x2 = x + Math.cos(an) * len, y2 = y + Math.sin(an) * len;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.lineWidth = Math.max(.6, (6 - d) * (.6 + ly * .35)); g.stroke();
        br(x2, y2, an + .5 * (fxR(sd) - .2) + .35, len * .72, d + 1, sd * 2 + 1, ly); br(x2, y2, an - .5 * (fxR(sd + 7) - .2) - .35, len * .72, d + 1, sd * 2 + 2, ly);
    };
    for (let ly = 0; ly < 3; ly++) {
        const z = 1 + ((s * .12 * (ly + 1)) % 1) * 1.6; g.save(); g.translate(cx, cy); g.scale(z, z); g.rotate(ly * 1.1 + s * .03 * (ly - 1)); g.strokeStyle = ["rgba(90,140,255,.55)", "rgba(150,200,255,.7)", "rgba(230,245,255,.85)"][ly]; g.shadowColor = "#6aa8ff"; g.shadowBlur = 12;
        for (let k = 0; k < 7; k++) br(0, 0, k / 7 * 6.283 + ly, M * .2, 0, k + ly * 9 + 1, ly); g.restore();
    }
    g.shadowBlur = 0; g.globalAlpha = 1;
}
const unoNeji = {
    col: "#c9d6ff", ms: 6800, tail: env => env.owner ? 3000 : 1600,
    begin(env, box, u) { env.me = Number(myPlayer); env.owner = env.me === u.fx.p; if (env.owner && u.peek) unoFxOwnsPeek = u.peek.id; env.rects = Array.from(document.querySelectorAll(".u-opp")).map(e => e.getBoundingClientRect()); },
    end(env, u) { if (env.owner && !env.shown) { env.shown = 1; unoFxOwnsPeek = null; unoPeekShow(u, env.me); } },
    draw(g, w, h, T, env, u) {
        const cx = w / 2, cy = h / 2, M = Math.min(w, h), t = T.t, s = T.s, V = "#c9d6ff";
        const trig = a => env.rects.forEach((r, i) => {                 // Eight Trigrams disc under every opponent plate
            const x = r.left + r.width / 2, y = r.top + r.height / 2, rd = Math.max(r.width, r.height) * .75; g.save(); g.translate(x, y); g.globalAlpha = a;
            g.strokeStyle = V; g.fillStyle = "rgba(120,150,255,.12)"; g.lineWidth = 2; g.shadowColor = "#7aa0ff"; g.shadowBlur = 20; g.beginPath(); g.arc(0, 0, rd, 0, 6.283); g.fill(); g.stroke(); g.beginPath(); g.arc(0, 0, rd * .62, 0, 6.283); g.stroke();
            g.rotate(s * (i % 2 ? -.9 : .9)); for (let k = 0; k < 8; k++) { g.rotate(.7854); g.fillStyle = V; g.fillRect(rd * .7, -2, rd * .26, 4); g.fillRect(rd * .7, -9, rd * .26, 3); g.fillRect(rd * .7, 5, rd * .26, 3); } g.restore();
        });
        if (T.ph === "tail") { const q = T.tt; trig(1 - fxS(.5, 1, q)); return; }
        g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
        const zk = 1 + Math.pow(fxS(.30, .58, t), 2.2) * 38;
        if (t < .6) {                                                  // ACT 1+2: shadowed face, the eyes awake, then we fall INTO the eye
            const open = fxS(.14, .30, t), vein = fxS(.16, .34, t), ex = M * .2, ey = cy;
            g.save(); g.translate(cx, cy); g.scale(zk, zk); g.translate(-(cx + ex), -(cy + M * .02));   // the camera dives into the right eye
            const fg = g.createRadialGradient(cx, cy, M * .1, cx, cy, M * .8); fg.addColorStop(0, "#2a2018"); fg.addColorStop(1, "#000"); g.fillStyle = fg; g.beginPath(); g.ellipse(cx, cy * 1.02, M * .5, M * .68, 0, 0, 6.283); g.fill();
            const hb = g.createLinearGradient(0, cy - M * .36, 0, cy - M * .2); hb.addColorStop(0, "#5c6577"); hb.addColorStop(.5, "#c9d2e4"); hb.addColorStop(1, "#4b5365"); g.fillStyle = hb; g.fillRect(cx - M * .52, cy - M * .36, M * 1.04, M * .15);
            g.strokeStyle = "#2b3140"; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy - M * .285, M * .04, 0, 4.5); g.stroke();
            [-1, 1].forEach(sd => {
                const x = cx + sd * M * .2, y = cy + M * .02;
                g.strokeStyle = "rgba(150,140,200," + vein * .8 + ")"; g.lineWidth = 2; for (let k = 0; k < 9; k++) { const an = (sd > 0 ? -.9 : 3.14 + .9) + (k / 9 - .5) * 2.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * M * .2 * vein, y + Math.sin(an) * M * .2 * vein * .7); g.stroke(); }
                const eh = M * .055 * Math.max(.06, open); g.beginPath(); g.moveTo(x - M * .11, y); g.quadraticCurveTo(x, y - eh * 2, x + M * .11, y); g.quadraticCurveTo(x, y + eh * 2, x - M * .11, y);
                g.fillStyle = open > .1 ? "#e8e6ff" : "#0c0a08"; g.shadowColor = "#b9b3ff"; g.shadowBlur = 30 * open; g.fill(); g.shadowBlur = 0; g.strokeStyle = "rgba(120,110,190," + open + ")"; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, eh * 1.05, 0, 6.283); g.stroke();
            }); g.restore();
            g.fillStyle = "#000"; g.globalAlpha = .55 * (1 - open); g.fillRect(0, 0, w, h); g.globalAlpha = 1;
            if (t > .5) { g.fillStyle = "#e8e6ff"; g.globalAlpha = fxS(.5, .6, t); g.fillRect(0, 0, w, h); g.globalAlpha = 1; }
            if (t > .2 && t < .42) { g.globalAlpha = fxS(.2, .26, t) * (1 - fxS(.34, .42, t)); fxText(g, "白眼", cx, h * .17, M * .12, "#fff", "#1a1d4a", "#8fa4ff"); g.globalAlpha = 1; }
        }
        if (t >= .5) {                                                 // ACT 2b: inside the eye, branching chakra routes and layers
            const a = fxS(.5, .66, t); fxChakra(g, w, h, s, a, M);
            const lk = fxS(.7, .92, t);                                // ACT 3: routes lock on the opponents' real cards
            if (lk > 0) { env.rects.forEach((r, i) => { const x = r.left + r.width / 2, y = r.top + r.height / 2; g.strokeStyle = "rgba(220,235,255," + lk + ")"; g.lineWidth = 2.5; g.shadowColor = "#7aa0ff"; g.shadowBlur = 16; g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo((cx + x) / 2 + 60, (cy + y) / 2, x, y); g.stroke(); g.shadowBlur = 0; });
                trig(lk); g.globalAlpha = lk * (1 - fxS(.94, 1, t)); fxText(g, "八卦六十四掌", cx, h * .88, M * .07, "#fff", "#1a1d4a", "#8fa4ff"); g.globalAlpha = 1; }
            if (t > .9) { g.globalAlpha = 0; }
        }
    }
};
UNO_FX_HOOKS.naruto_e = unoSceneHook("naruto_e", unoNeji);

/* =====================================================================
   FIRST-PERSON SCENES, group 1: SPACE  (three different visual languages)
   onepiece_t Law = blue ROOM sphere + surgical cuts   naruto_t Minato = thrown kunai + yellow flash teleport
   jjk_t Todo = black/white shadow hands, hard-cut claps
   The two blocks in these scenes are the REAL swap: your hand area and the target player's plate (read from the page).
   ===================================================================== */
function fxSwapBegin(env, u, box) {
    env.sw = u.fx.sw || u.fx.to; env.name = u.names["p" + env.sw] || "?";
    const rr = e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
    const pl = document.querySelector('.u-opp[data-p="' + env.sw + '"]') || document.querySelector(".u-opp"), hd = document.getElementById("unoHand");
    env.A = hd ? rr(hd) : { x: innerWidth * .2, y: innerHeight * .72, w: innerWidth * .6, h: innerHeight * .22 };
    env.B = pl ? rr(pl) : { x: innerWidth * .35, y: innerHeight * .03, w: innerWidth * .3, h: innerHeight * .14 };
    env.A.h = Math.min(env.A.h, innerHeight * .26);
    /* the real cards: group 0 = the swapper's old cards (now in the target's hand), group 1 = the target's old cards (now in the swapper's hand).
       Only the two players involved see faces; everyone else sees card backs, so nothing leaks. */
    env.me = Number(myPlayer); env.up = env.me === u.fx.p || env.me === env.sw;
    const layer = document.createElement("div"); layer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3"; box.appendChild(layer);
    const key = ci => { const c = u.cards[ci]; return (c.k === "w" || c.k === "x" ? 9 : c.s) * 1000 + (c.k === "a" ? c.v : 20); };
    const mk = ci => { const el = env.up ? unoCardEl(u, ci, "") : hbEl("div", "ucard cb"); el.style.cssText += ";position:absolute;left:0;top:0;width:118px;height:176px;transform-origin:0 0;transition:none;opacity:0;margin:0;animation:none"; layer.appendChild(el); return el; };
    env.grp = [arr(u.hands["p" + env.sw]).slice().sort((a, b) => key(a) - key(b)).map(mk), arr(u.hands["p" + u.fx.p]).slice().sort((a, b) => key(a) - key(b)).map(mk)];
}
function fxPlace(env, idx, r, a, k) {      // lay the real cards of one group out inside rect r (fans them, scales them to fit)
    const L = env.grp[idx], n = L.length; if (!n) return;
    const sc = Math.min(r.h / 176, 1.15), cw = 118 * sc, step = n > 1 ? Math.min(cw * .85, (r.w - cw) / (n - 1)) : 0, x0 = r.x + (r.w - (cw + step * (n - 1))) / 2, y0 = r.y + (r.h - 176 * sc) / 2, fl = Math.sin((k || 0) * Math.PI);
    L.forEach((el, i) => { el.style.opacity = a; el.style.transform = "translate(" + (x0 + i * step) + "px," + (y0 - fl * r.h * .25) + "px) rotate(" + ((i - n / 2) * fl * 2.2) + "deg) scale(" + sc + ")"; });
}
const fxLerp = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k });
const fxCtr = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/* ---------- LAW · ROOM / Shambles: a blue sphere opens, the two hands are cut out and exchanged ---------- */
const unoLaw = {
    col: "#4cc9f0", ms: 7600, tail: () => 1800, begin: (env, box, u) => fxSwapBegin(env, u, box),
    draw(g, w, h, T, env, u) {
        const cx = w / 2, cy = h / 2, M = Math.min(w, h), t = T.t, s = T.s, C = "#4cc9f0", R = Math.hypot(w, h) * .55, A = env.A, B = env.B;
        const grow = T.ph === "tail" ? 1 - fxS(.2, 1, T.tt) : fxS(.2, .46, t) * (1 - fxS(.84, 1, t) * .0), rad = R * grow, k = T.ph === "tail" ? 1 : fxS(.56, .8, t);
        if (T.ph === "main" && t < .24) {                              // spread fingers, a small sphere blooms in the palm
            const a = fxS(0, .2, t), hx = w * .22, hy = h * (1.05 - .3 * a); fxAnimeHand(g, hx, hy, M * .0021, -.2, "open", { sleeve: "#0b1020", cuff: C }); g.strokeStyle = C; g.lineWidth = 2; g.beginPath(); g.arc(hx, hy - M * .05, M * .02 + t * M * .5, 0, 6.283); g.stroke();
        }
        if (grow > 0) {                                                // THE ROOM: translucent wireframe sphere, floor grid bending inside it
            g.save(); g.beginPath(); g.arc(cx, cy, rad, 0, 6.283); g.clip(); const fg = g.createRadialGradient(cx, cy, 0, cx, cy, rad); fg.addColorStop(0, "rgba(10,60,120,.12)"); fg.addColorStop(1, "rgba(20,120,220,.5)"); g.fillStyle = fg; g.fillRect(0, 0, w, h);
            g.strokeStyle = "rgba(120,220,255,.35)"; g.lineWidth = 1; for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(cx + i * M * .09, cy + rad); g.lineTo(cx + i * M * .014, cy + M * .05); g.stroke(); } for (let j = 1; j < 9; j++) { const y = cy + M * .05 + Math.pow(j / 9, 2) * rad; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.restore();
            g.strokeStyle = C; g.lineWidth = 2.5; g.shadowColor = C; g.shadowBlur = 26; g.beginPath(); g.arc(cx, cy, rad, 0, 6.283); g.stroke(); g.lineWidth = 1; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(cx, cy, rad * Math.abs(Math.cos(i * .52 + s * .3)), rad, 0, 0, 6.283); g.stroke(); } for (let i = 1; i < 5; i++) { g.beginPath(); g.ellipse(cx, cy, rad, rad * i / 5, 0, 0, 6.283); g.stroke(); } g.shadowBlur = 0;
        }
        if (T.ph === "main" && t > .22 && t < .5) { const sl = fxSlam(Math.min(1, (t - .22) / .12)); g.save(); g.translate(cx, cy); g.scale(sl.sc, sl.sc); g.globalAlpha = sl.a; fxText(g, "ROOM", 0, 0, M * .17, "#fff", "#07304a", C, "sans-serif"); g.restore(); }
        const cut = T.ph === "tail" ? 1 : fxS(.46, .58, t);            // surgical cuts trace both hands, they lift out of the screen
        const lift = T.ph === "tail" ? 0 : Math.sin(Math.min(1, Math.max(0, (t - .5) / .1)) * 1.57) * (1 - fxS(.78, .84, t)) * 10;
        [[A, "YOUR CARDS"], [B, env.name + "'S CARDS"]].forEach(([r, lb], i) => {
            const dst = i ? A : B, p = fxLerp(r, dst, 1 - Math.pow(1 - k, 3)), arc = Math.sin(k * 3.14) * -M * .12;
            if (k > 0 && k < 1 && T.ph === "main") { g.save(); g.globalAlpha = .25; g.strokeStyle = C; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(fxCtr(r).x, fxCtr(r).y); g.lineTo(fxCtr(dst).x, fxCtr(dst).y); g.stroke(); g.restore(); }
            fxPlace(env, i, { x: p.x, y: p.y + arc - lift, w: p.w, h: p.h }, (cut > 0 || k > 0) ? 1 : 0, 0);
            if (cut > 0 && cut < 1) { g.strokeStyle = "#fff"; g.lineWidth = 2; g.shadowColor = C; g.shadowBlur = 14; g.setLineDash([10, 6]); g.lineDashOffset = -s * 60; g.strokeRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12); g.setLineDash([]); g.shadowBlur = 0; }
        });
        if (T.ph === "main" && t > .78 && t < .9) { const sl = fxSlam(Math.min(1, (t - .78) / .1)); g.save(); g.translate(cx, cy); g.scale(.7 + .3 * sl.sc / 3.2, .7 + .3 * sl.sc / 3.2); g.globalAlpha = sl.a; fxText(g, "SHAMBLES", 0, 0, M * .12, "#fff", "#07304a", C, "sans-serif"); g.restore(); g.fillStyle = "rgba(180,235,255," + (.5 * (1 - (t - .78) / .12)) + ")"; g.fillRect(0, 0, w, h); }
    }
};
UNO_FX_HOOKS.onepiece_t = unoSceneHook("onepiece_t", unoLaw);

/* ---------- MINATO · Flying Thunder God: a marked kunai is thrown, you blink to it, the hands swap in a flash ---------- */
const unoMinato = {
    col: "#ffd23f", ms: 7600, tail: () => 1800, begin: (env, box, u) => fxSwapBegin(env, u, box),
    draw(g, w, h, T, env, u) {
        const cx = w / 2, cy = h / 2, M = Math.min(w, h), t = T.t, s = T.s, Y = "#ffd23f", A = env.A, B = env.B, tg = fxCtr(B), R = Math.hypot(w, h) / 2;
        const sw = T.ph === "tail" ? 1 : fxS(.7, .8, t);
        if (T.ph === "main" && t < .58) {
            g.fillStyle = "rgba(0,0,0," + (.5 - .15 * fxS(.3, .58, t)) + ")"; g.fillRect(0, 0, w, h);
            const aim = fxS(0, .3, t), fly = fxS(.3, .56, t);
            if (t < .32) { g.save(); g.translate(w * .8 - aim * w * .06, h * (1.08 - .38 * aim)); g.rotate(-.35 - (1 - aim) * .3); g.fillStyle = "#0b0a10"; g.strokeStyle = Y; g.lineWidth = 3; g.shadowColor = Y; g.shadowBlur = 16;
                g.fillStyle = "#e8e0b0"; g.strokeStyle = "#000"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -M * .22); g.lineTo(M * .045, -M * .05); g.lineTo(0, M * .04); g.lineTo(-M * .045, -M * .05); g.closePath(); g.fill(); g.stroke(); g.fillRect(-M * .01, M * .04, M * .02, M * .16); g.beginPath(); g.arc(0, M * .24, M * .03, 0, 6.283); g.stroke(); fxAnimeHand(g, 0, M * .3, M * .0017, 0, "fist", { sleeve: "#1a2a60", cuff: "#ffffff" }); g.restore(); }
            const kx = w * .76 + (tg.x - w * .76) * fly, ky = h * .7 + (tg.y - h * .7) * fly, ks = (1 - fly * .8) * M * .16, ang = s * 22;   // the kunai spins down the screen toward their cards
            if (t > .3) { for (let i = 6; i > 0; i--) { const q = Math.max(0, fly - i * .035); g.globalAlpha = .12 * (7 - i); g.strokeStyle = Y; g.lineWidth = ks * .2; g.beginPath(); g.moveTo(w * .76 + (tg.x - w * .76) * q, h * .7 + (tg.y - h * .7) * q); g.lineTo(kx, ky); g.stroke(); } g.globalAlpha = 1;
                g.save(); g.translate(kx, ky); g.rotate(ang); g.fillStyle = "#e8e0b0"; g.strokeStyle = "#000"; g.lineWidth = 2; g.shadowColor = Y; g.shadowBlur = 20; g.beginPath(); g.moveTo(0, -ks); g.lineTo(ks * .24, 0); g.lineTo(0, ks * .5); g.lineTo(-ks * .24, 0); g.closePath(); g.fill(); g.stroke(); g.restore(); }
            if (t > .54) { const q = fxS(.54, .6, t); g.save(); g.translate(tg.x, tg.y); g.globalAlpha = q; g.strokeStyle = Y; g.lineWidth = 3; g.shadowColor = Y; g.shadowBlur = 24; g.beginPath(); g.arc(0, 0, M * .06 + (1 - q) * 60, 0, 6.283); g.stroke(); for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(Math.cos(i) * M * .03, Math.sin(i) * M * .03); g.lineTo(Math.cos(i + 1.1) * M * .09, Math.sin(i + 1.1) * M * .09); g.stroke(); } g.restore(); }   // the seal marks the target
        }
        if (T.ph === "main" && t > .58 && t < .72) {                  // THE BLINK: one hard flash and speed lines collapsing onto the kunai
            const q = (t - .58) / .14; g.fillStyle = "rgba(255,250,200," + (1 - q * .6) + ")"; g.fillRect(0, 0, w, h); g.strokeStyle = Y; g.lineWidth = 3;
            for (let i = 0; i < 50; i++) { const an = fxR(i) * 6.283, d = R * (1 - q) * (.4 + fxR(i + 3)), L = R * .3; g.beginPath(); g.moveTo(tg.x + Math.cos(an) * (d + L), tg.y + Math.sin(an) * (d + L)); g.lineTo(tg.x + Math.cos(an) * d, tg.y + Math.sin(an) * d); g.stroke(); }
            g.save(); g.translate(cx, cy); g.rotate(-.1); g.globalAlpha = fxS(0, .3, q); fxText(g, "飛雷神", 0, 0, M * .2, "#fff", "#4a3600", Y); g.restore();
        }
        if (t >= .7 || T.ph === "tail") {                              // the exchange: both hands blink to each other's place, thunder snaps between them
            const a = T.ph === "tail" ? 1 - fxS(.4, 1, T.tt) : 1;
            [[A, B, "YOUR CARDS"], [B, A, env.name + "'S CARDS"]].forEach(([r, d, lb], i) => { const p = sw < .5 ? r : d; fxPlace(env, i, p, a, 0); if (sw > 0 && sw < 1) { g.globalAlpha = 1 - sw; g.strokeStyle = Y; g.lineWidth = 3; g.strokeRect(r.x, r.y, r.w, r.h); g.globalAlpha = 1; } });
            if (T.ph === "main" && t < .86) { const a1 = fxCtr(A), b1 = fxCtr(B); fxBolt(g, a1.x, a1.y, b1.x, b1.y, (T.now / 60 | 0), Y); fxBolt(g, b1.x, b1.y, a1.x, a1.y, (T.now / 60 | 0) + 9, "#fff"); }
        }
    }
};
UNO_FX_HOOKS.naruto_t = unoSceneHook("naruto_t", unoMinato);

/* ---------- TODO · Boogie Woogie: shadow hands clap, hard cuts, the world re-forms with the hands exchanged ---------- */
function fxClap(g, x, y, M, flip, col) {
    g.save(); g.translate(x, y); g.scale(flip, 1); g.fillStyle = "#050507"; g.strokeStyle = col; g.lineWidth = 4; g.lineJoin = "round";
    g.beginPath(); g.moveTo(0, M * .5); g.lineTo(-M * .02, M * .12); for (let i = 0; i < 4; i++) { const fx = M * (.0 + i * .05); g.lineTo(fx - M * .01, -M * (.26 + (i === 1 || i === 2 ? .06 : 0))); g.lineTo(fx + M * .035, -M * (.26 + (i === 1 || i === 2 ? .06 : 0))); g.lineTo(fx + M * .04, M * .02); }
    g.lineTo(M * .24, M * .08); g.lineTo(M * .36, -M * .04); g.lineTo(M * .4, M * .05); g.lineTo(M * .26, M * .3); g.lineTo(M * .24, M * .5); g.closePath(); g.fill(); g.stroke(); g.restore();
}
const unoTodo = {
    col: "#c77dff", ms: 7800, tail: () => 1600, begin: (env, box, u) => fxSwapBegin(env, u, box),
    draw(g, w, h, T, env, u) {
        const cx = w / 2, cy = h / 2, M = Math.min(w, h), t = T.t, A = env.A, B = env.B, W = "#fff";
        const clap = (a, b) => t >= a && t < b, lines = q => { g.strokeStyle = W; g.lineWidth = 3; for (let i = 0; i < 36; i++) { const an = fxR(i) * 6.283; g.beginPath(); g.moveTo(cx + Math.cos(an) * M * .15, cy + Math.sin(an) * M * .15); g.lineTo(cx + Math.cos(an) * R0 * (1 - q * .3), cy + Math.sin(an) * R0 * (1 - q * .3)); g.stroke(); } }, R0 = Math.hypot(w, h) / 2;
        if (T.ph === "tail") { const a = 1 - fxS(.3, 1, T.tt); fxPlace(env, 0, B, 1, 0); fxPlace(env, 1, A, 1, 0); g.globalAlpha = 1; return; }
        g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, w, h);
        if (t < .2) {                                                  // cut 1: your object in front, two shadow hands rise to clap
            fxPlace(env, 0, { x: cx - M * .3, y: h * .68, w: M * .6, h: M * .26 }, 1, 0); fxPlace(env, 1, A, 0, 0);
            const a = fxS(0, .19, t); fxClap(g, cx - M * .52 * (1 - a) - M * .1, h * 1.02 - a * h * .38, M, 1, "#c77dff"); fxClap(g, cx + M * .52 * (1 - a) + M * .1, h * 1.02 - a * h * .38, M, -1, "#c77dff");
        } else if (clap(.2, .26)) { g.fillStyle = "#000"; g.fillRect(0, 0, w, h); lines((t - .2) / .06); g.save(); g.translate(cx, cy); g.rotate(-.12); fxText(g, "パン!", 0, 0, M * .34, "#fff", "#7a2cc4", "#c77dff"); g.restore(); }
        else if (t < .52) {                                            // cut 2: hard cut, the viewpoint is now right beside your cards (huge)
            g.fillStyle = "#101018"; g.fillRect(0, 0, w, h); const z = 1 + .08 * Math.sin(T.s * 14); fxPlace(env, 0, { x: cx - M * .6 * z, y: cy - M * .3 * z, w: M * 1.2 * z, h: M * .6 * z }, 1, 0); fxPlace(env, 1, A, 0, 0);
            g.fillStyle = "rgba(0,0,0," + (.6 * fxS(.34, .5, t)) + ")"; g.fillRect(0, 0, w, h);
        } else if (clap(.52, .58)) { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#000"; lines((t - .52) / .06); g.save(); g.translate(cx, cy); g.rotate(.1); fxText(g, "パン!!", 0, 0, M * .4, "#000", "#c77dff", "#c77dff"); g.restore(); }
        else {                                                         // cut 3: a jagged tear sweeps across, before on one side, after (hands exchanged) on the other
            const q = fxS(.58, .78, t), tx = w * q; g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, w, h);
            [0, 1].forEach(i => { const before = i ? B : A, after = i ? A : B; fxPlace(env, i, tx > fxCtr(before).x ? after : before, 1, 0); });   // the world re-forms from left to right: each real hand jumps the moment the tear passes it
            if (q > 0 && q < 1) { g.strokeStyle = "#c77dff"; g.lineWidth = 6; g.beginPath(); for (let i = 0; i <= 12; i++) g.lineTo(tx + (i % 2 ? 26 : -26), h * i / 12); g.stroke(); g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke(); }
        }
    }
};
UNO_FX_HOOKS.jjk_t = unoSceneHook("jjk_t", unoTodo);

/* =====================================================================
   SWAP GROUP 2:  Whis · Nakime · Aizen · Knov · Finral · Bruno     (dragonball_t, demonslayer_t, bleach_t, hxh_t, blackclover_t, jojo_t)
   Real cards again (fxPlace): your real hand and the target's real hand change places. ~9.4 s, silent.
   ===================================================================== */
function fxSw(col, ms, draw) { return { col: col, ms: ms, tail: () => 1800, begin: (env, box, u) => fxSwapBegin(env, u, box), draw(g, w, h, T, env, u) { if (T.ph === "tail") { fxPlace(env, 0, env.B, 1, 0); fxPlace(env, 1, env.A, 1, 0); return; } draw(g, w, h, T, env, u); } }; }
const fxRect = (c, w, h) => ({ x: c.x - w / 2, y: c.y - h / 2, w: w, h: h });
function fxStar(g, n, W, H, s) { g.fillStyle = "#fff"; for (let i = 0; i < n; i++) { g.globalAlpha = .3 + .7 * Math.abs(Math.sin(s * 1.5 + i)); g.fillRect(fxR(i) * W, fxR(i + 7) * H, 2, 2); } g.globalAlpha = 1; }

/* ---------- WHIS · Temporal Do-Over + instant movement: the staff taps, time RUNS BACKWARD, and the cards are moved again, instantly, the way they should have been ---------- */
const unoWhis = fxSw("#8fe3ff", 7000, (g, w, h, T, env) => {
    const t = T.t, s = T.s, M = Math.min(w, h), cx = w / 2, cy = h / 2, A = env.A, B = env.B, C = "#8fe3ff", R = Math.hypot(w, h) / 2;
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#1a2250"); bg.addColorStop(1, "#080c24"); g.fillStyle = bg; g.fillRect(0, 0, w, h); fxStar(g, 70, w, h, s);
    const sx = w * .64, sy = h * .4; g.strokeStyle = "#e8d8a0"; g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.moveTo(w * .88, h * 1.02); g.lineTo(sx, sy); g.stroke(); const og = g.createRadialGradient(sx, sy, 0, sx, sy, M * .06); og.addColorStop(0, "#fff"); og.addColorStop(1, "#59b8ff"); g.fillStyle = og; g.beginPath(); g.arc(sx, sy, M * .05, 0, 6.283); g.fill();     // the staff
    for (let k = 0; k < 3; k++) { const q = (t - .14 - k * .05) / .3; if (q > 0 && q < 1) { g.strokeStyle = "rgba(143,227,255," + (1 - q) + ")"; g.lineWidth = 3; g.beginPath(); g.arc(sx, sy, q * R, 0, 6.283); g.stroke(); } }      // the tap, ripples
    const rw = fxS(.16, .5, t); if (rw > 0 && t < .6) { g.save(); g.translate(cx, cy); g.globalAlpha = Math.min(1, rw * 3) * (1 - fxS(.5, .6, t)); g.strokeStyle = C; g.lineWidth = 3; g.shadowColor = C; g.shadowBlur = 20; g.beginPath(); g.arc(0, 0, M * .3, 0, 6.283); g.stroke(); for (let i = 0; i < 12; i++) { const an = i / 12 * 6.283; g.beginPath(); g.moveTo(Math.cos(an) * M * .27, Math.sin(an) * M * .27); g.lineTo(Math.cos(an) * M * .3, Math.sin(an) * M * .3); g.stroke(); }
        const ang = -s * 8 * rw; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(ang) * M * .24, Math.sin(ang) * M * .24); g.lineWidth = 5; g.stroke(); g.restore();
        g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 2; for (let i = 0; i < 26; i++) { const an = fxR(i) * 6.283, u = 1 - ((s * 1.6 + fxR(i + 4)) % 1); g.beginPath(); g.moveTo(cx + Math.cos(an) * R * u, cy + Math.sin(an) * R * u); g.lineTo(cx + Math.cos(an) * R * (u + .06), cy + Math.sin(an) * R * (u + .06)); g.stroke(); } }          // the world is wound back
    const e = t < .16 ? 1 : t < .5 ? 1 - fxS(.16, .5, t) : t < .56 ? 0 : fxS(.56, .68, t);
    for (let j = 6; j >= 1; j--) { const q = Math.max(0, e - j * .07); if (t > .56 && e < 1) { g.globalAlpha = .1 * (7 - j); g.strokeStyle = C; g.lineWidth = 2; const a = fxLerp(A, B, q), b = fxLerp(B, A, q); g.strokeRect(a.x, a.y, a.w, a.h); g.strokeRect(b.x, b.y, b.w, b.h); g.globalAlpha = 1; } }     // afterimages of the instant movement
    fxPlace(env, 0, fxLerp(A, B, e), 1, 0); fxPlace(env, 1, fxLerp(B, A, e), 1, 0);
    if (t > .2 && t < .48) { g.globalAlpha = fxS(.2, .26, t) * (1 - fxS(.42, .48, t)); fxText(g, "TEMPORAL DO-OVER", cx, h * .12, M * .07, "#fff", "#10306a", C, "sans-serif"); g.globalAlpha = 1; }
    if (t > .56 && t < .8) { g.globalAlpha = fxS(.56, .62, t) * (1 - fxS(.74, .8, t)); fxText(g, "INSTANT MOVEMENT", cx, h * .12, M * .07, "#fff", "#10306a", C, "sans-serif"); g.globalAlpha = 1; if (t < .64) { g.fillStyle = "rgba(255,255,255," + .5 * (1 - (t - .56) / .08) + ")"; g.fillRect(0, 0, w, h); } }
});
UNO_FX_HOOKS.dragonball_t = unoSceneHook("dragonball_t", unoWhis);

/* ---------- NAKIME · Infinity Castle: a biwa is struck, rooms of shoji and tatami spin, the castle turns itself over and the two hands fall into each other's rooms ---------- */
const unoNakime = fxSw("#d9a441", 7000, (g, w, h, T, env) => {
    const t = T.t, s = T.s, M = Math.min(w, h), cx = w / 2, cy = h / 2, A = env.A, B = env.B, O = "#d9a441", SK = [.2, .36, .52];
    const roll = SK.reduce((a, x) => a + fxS(x, x + .1, t), 0) * 1.5708;
    g.save(); g.translate(cx, cy); g.rotate(roll); g.translate(-cx, -cy); g.fillStyle = "#1b0f0a"; g.fillRect(-w, -h, w * 3, h * 3);
    for (let k = 0; k < 6; k++) { const sc = Math.pow(.72, k), rw = w * 1.3 * sc, rh = h * 1.3 * sc, x = cx - rw / 2, y = cy - rh / 2; g.strokeStyle = "#4a2a14"; g.lineWidth = 8 * sc + 2; g.strokeRect(x, y, rw, rh); g.fillStyle = k % 2 ? "#e8dcc0" : "#f4ead0"; for (let i = 0; i < 6; i++) { const px = x + rw * i / 6 + 3; g.fillRect(px, y + 3, rw / 6 - 6, rh - 6); } g.strokeStyle = "#5a3a20"; g.lineWidth = 2 * sc + .5; for (let i = 0; i < 6; i++) for (let j = 1; j < 5; j++) { const px = x + rw * i / 6, py = y + rh * j / 5; g.beginPath(); g.moveTo(px, py); g.lineTo(px + rw / 6, py); g.stroke(); } if (k < 5) { g.fillStyle = "rgba(20,8,0,.55)"; g.fillRect(x, y, rw, rh); } }
    g.restore(); const ov = g.createRadialGradient(cx, cy, M * .3, cx, cy, Math.hypot(w, h) / 2); ov.addColorStop(0, "rgba(0,0,0,0)"); ov.addColorStop(1, "rgba(10,0,0,.85)"); g.fillStyle = ov; g.fillRect(0, 0, w, h);
    const bx = w * .82, by = h * .78; g.save(); g.translate(bx, by); g.rotate(-.5); g.fillStyle = "#2a1408"; g.strokeStyle = O; g.lineWidth = 3; g.beginPath(); g.ellipse(0, M * .06, M * .12, M * .17, 0, 0, 6.283); g.fill(); g.stroke(); g.fillRect(-M * .018, -M * .5, M * .036, M * .5); g.strokeRect(-M * .018, -M * .5, M * .036, M * .5);
    for (let i = 0; i < 4; i++) { g.strokeStyle = "#f4e6b0"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-M * .012 + i * M * .008, -M * .48); g.lineTo(-M * .02 + i * M * .013, M * .1); g.stroke(); } g.restore();                                                  // the biwa
    SK.forEach(a => { const q = (t - a) / .1; if (q > 0 && q < 1) { g.strokeStyle = "rgba(255,230,160," + (1 - q) + ")"; g.lineWidth = 4; g.beginPath(); g.arc(bx, by, q * M * .7, 0, 6.283); g.stroke(); g.save(); g.translate(w * .55, h * .45); g.rotate(-.12); g.globalAlpha = 1 - q; fxText(g, "ベン!", 0, 0, M * .22, "#fff", "#5a1a00", O); g.restore(); } });
    const e = fxS(.4, .5, t), arc = Math.sin(Math.min(1, Math.max(0, (t - .4) / .1)) * Math.PI);
    fxPlace(env, 0, fxLerp(env.A, env.B, e), 1, arc); fxPlace(env, 1, fxLerp(env.B, env.A, e), 1, arc);
});
UNO_FX_HOOKS.demonslayer_t = unoSceneHook("demonslayer_t", unoNakime);

/* ---------- AIZEN · Kyoka Suigetsu: complete hypnosis. You never saw where the hands really were. A ripple passes, the illusion breaks, and the swap has already happened ---------- */
const unoAizen = fxSw("#b9a7ff", 7000, (g, w, h, T, env) => {
    const t = T.t, s = T.s, M = Math.min(w, h), cx = w / 2, cy = h / 2, A = env.A, B = env.B, L = "#b9a7ff", R = Math.hypot(w, h) / 2;
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#241a4a"); bg.addColorStop(.55, "#0c0a1c"); bg.addColorStop(1, "#150f30"); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const mg = g.createRadialGradient(cx, h * .2, 0, cx, h * .2, M * .22); mg.addColorStop(0, "rgba(245,240,255,.95)"); mg.addColorStop(1, "rgba(185,167,255,0)"); g.fillStyle = mg; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(185,167,255,.22)"; g.lineWidth = 1.5; for (let i = 0; i < 16; i++) { const y = h * (.5 + .03 * i); g.beginPath(); for (let x = 0; x <= w; x += 8) { const yy = y + Math.sin(x * .02 + s * 2 + i) * 5 * (1 + i * .1); x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }                                       // water below the moon
    for (let k = 0; k < 5; k++) { const q = (s * .35 + k / 5) % 1; g.strokeStyle = "rgba(210,195,255," + (.35 * (1 - q)) + ")"; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, q * R, 0, 6.283); g.stroke(); }
    const hd = fxS(0, .18, t) * (1 - fxS(.22, .3, t)); if (hd > 0) { g.save(); g.globalAlpha = hd; g.fillStyle = "#08060f"; g.strokeStyle = L; g.lineWidth = 3; g.shadowColor = L; g.shadowBlur = 16; fxAnimeHand(g, cx, h * (1.12 - .6 * hd), M * .0022, 0, "open", { sleeve: "#0a0814", cuff: "#b9a7ff" }); g.restore(); }   // a hand sweeps the hair back
    if (t > .2 && t < .32) { const q = fxS(.2, .26, t) * (1 - fxS(.28, .32, t)); g.strokeStyle = "rgba(255,255,255," + q + ")"; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - M * .15 * q, h * .32); g.lineTo(cx + M * .15 * q, h * .32); g.moveTo(cx, h * .32 - M * .1 * q); g.lineTo(cx, h * .32 + M * .1 * q); g.stroke(); }
    if (t > .3 && t < .56) { g.globalAlpha = fxS(.3, .36, t) * (1 - fxS(.5, .56, t)); fxText(g, "砕けろ  鏡花水月", cx, h * .12, M * .07, "#fff", "#2a1a6a", L); g.globalAlpha = 1; }
    const e = fxS(.6, .74, t), flick = t < .6 && ((s * 5) | 0) % 2 === 0;                                                                                                                      // the false picture flickers, then reality
    if (t > .3 && t < .66) { g.globalAlpha = .55; g.strokeStyle = L; g.lineWidth = 2; g.setLineDash([8, 6]); const a = flick ? B : A, b = flick ? A : B; g.strokeRect(a.x, a.y, a.w, a.h); g.strokeRect(b.x, b.y, b.w, b.h); g.setLineDash([]); g.globalAlpha = 1; }
    if (t > .6 && t < .76) { const q = (t - .6) / .16; g.strokeStyle = "rgba(255,255,255," + (1 - q) + ")"; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, q * R, 0, 6.283); g.stroke(); }
    fxPlace(env, 0, fxLerp(A, B, e), 1, 0); fxPlace(env, 1, fxLerp(B, A, e), 1, 0);
});
UNO_FX_HOOKS.bleach_t = unoSceneHook("bleach_t", unoAizen);

/* ---------- KNOV · Hide and Seek: two Nen doorways open, one on each hand, and the cards are posted through them ---------- */
function fxDoor(g, c, W, H, p, s, col) {
    if (p <= 0) return; const r = fxRect(c, W * p, H * p); g.save(); g.fillStyle = "rgba(0,20,10,.8)"; g.fillRect(r.x, r.y, r.w, r.h); g.beginPath(); g.rect(r.x, r.y, r.w, r.h); g.clip(); g.strokeStyle = "rgba(125,255,176,.5)"; g.lineWidth = 2;
    for (let i = 0; i < 7; i++) { g.beginPath(); for (let k = 0; k <= 30; k++) { const an = k / 30 * 9 + s * 2 + i * .9, rd = (k / 30) * Math.max(W, H) * .6; g.lineTo(c.x + Math.cos(an) * rd, c.y + Math.sin(an) * rd * .6); } g.stroke(); } g.restore();
    g.strokeStyle = col; g.lineWidth = 4; g.shadowColor = col; g.shadowBlur = 22; g.strokeRect(r.x, r.y, r.w, r.h); g.shadowBlur = 0;
}
const unoKnov = fxSw("#7dffb0", 7000, (g, w, h, T, env) => {
    const t = T.t, s = T.s, M = Math.min(w, h), cx = w / 2, A = env.A, B = env.B, N = "#7dffb0", cA = fxCtr(A), cB = fxCtr(B);
    g.fillStyle = "#020a06"; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { const u = ((s * .3 * (.4 + fxR(i)) + fxR(i + 3)) % 1); g.fillStyle = "rgba(125,255,176," + .3 * (1 - u) + ")"; g.fillRect(fxR(i + 8) * w + 20 * Math.sin(s + i), h * (1 - u), 3, 12); }                // Nen aura rising
    const hd = fxS(0, .14, t) * (1 - fxS(.24, .34, t)); if (hd > 0) { g.save(); g.globalAlpha = hd; g.strokeStyle = N; g.lineWidth = 3; g.shadowColor = N; g.shadowBlur = 16; g.fillStyle = "#04120a"; [-1, 1].forEach(sd => { fxAnimeHand(g, cx + sd * M * .18, h * .95, M * .0016, sd * -.5, "open", { sleeve: "#06150c", cuff: "#7dffb0" }); }); g.strokeRect(cx - M * .1, h * .8, M * .2, M * .12); g.restore(); }   // hands pinching a small doorway into being
    const dp = fxS(.14, .3, t); fxDoor(g, cA, A.w * .45, A.h * .95, dp, s, N); fxDoor(g, cB, B.w * .5, B.h * 1.3, dp, s, N);
    const sh = fxS(.32, .5, t), em = fxS(.56, .76, t);
    const rs = (r, q) => fxRect(fxCtr(r), r.w * Math.max(.02, 1 - q), r.h * Math.max(.02, 1 - q)), gr = (r, q) => fxRect(fxCtr(r), r.w * Math.max(.02, q), r.h * Math.max(.02, q));
    if (t < .52) { fxPlace(env, 0, rs(A, sh), sh < .95 ? 1 : 0, 0); fxPlace(env, 1, rs(B, sh), sh < .95 ? 1 : 0, 0); }                                                                       // each hand is pulled into its doorway
    else { fxPlace(env, 0, gr(B, em), 1, 0); fxPlace(env, 1, gr(A, em), 1, 0); }                                                                                                          // and comes out of the other one
    if (t > .18 && t < .5) { g.globalAlpha = fxS(.18, .24, t) * (1 - fxS(.44, .5, t)); fxText(g, "HIDE AND SEEK", cx, h * .1, M * .07, "#fff", "#063a1a", N, "sans-serif"); g.globalAlpha = 1; }
    if (t > .56 && t < .68) { g.fillStyle = "rgba(125,255,176," + .3 * (1 - (t - .56) / .12) + ")"; g.fillRect(0, 0, w, h); }
});
UNO_FX_HOOKS.hxh_t = unoSceneHook("hxh_t", unoKnov);

/* ---------- FINRAL · Fallen Angel's Gate: a huge winged magic circle opens, the hands spiral into its center and out the other side ---------- */
function fxWing(g, x, y, sd, W, p, col) { for (let i = 0; i < 9; i++) { g.save(); g.translate(x, y); g.rotate(sd * (-.2 - i * .17)); g.fillStyle = col; g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 1.5; g.beginPath(); g.ellipse(sd * W * p * (.4 + i * .05), 0, W * p * (.55 - i * .03), W * .07, 0, 0, 6.283); g.fill(); g.stroke(); g.restore(); } }
const unoFinral = fxSw("#9d7bff", 7000, (g, w, h, T, env) => {
    const t = T.t, s = T.s, M = Math.min(w, h), cx = w / 2, cy = h * .5, A = env.A, B = env.B, V = "#9d7bff";
    g.fillStyle = "#07041a"; g.fillRect(0, 0, w, h); fxStar(g, 50, w, h, s);
    const op = fxS(.06, .34, t), gate = fxS(.4, .56, t) * (1 - fxS(.8, .92, t));
    if (gate > 0) { g.save(); g.globalAlpha = gate; fxWing(g, cx, cy, -1, M * .75, gate, "rgba(60,40,140,.55)"); fxWing(g, cx, cy, 1, M * .75, gate, "rgba(60,40,140,.55)"); g.restore(); }      // the Fallen Angel's wings
    g.save(); g.translate(cx, cy); g.globalAlpha = op; g.strokeStyle = V; g.lineWidth = 3; g.shadowColor = V; g.shadowBlur = 24;
    [.22, .17, .1].forEach((rd, i) => { g.save(); g.rotate((i % 2 ? -1 : 1) * s * .6); g.beginPath(); g.arc(0, 0, M * rd * (1 + gate * .4), 0, 6.283); g.stroke(); for (let k = 0; k < 6 + i * 2; k++) { const an = k / (6 + i * 2) * 6.283; g.strokeRect(Math.cos(an) * M * rd * .84 * (1 + gate * .4) - 4, Math.sin(an) * M * rd * .84 * (1 + gate * .4) - 4, 8, 8); } g.restore(); });
    g.beginPath(); for (let k = 0; k < 7; k++) { const an = k * 2.693 - 1.57; k ? g.lineTo(Math.cos(an) * M * .14, Math.sin(an) * M * .14) : g.moveTo(Math.cos(an) * M * .14, Math.sin(an) * M * .14); } g.stroke(); g.restore();
    const e = fxS(.46, .78, t), gc = { x: cx, y: cy };
    const pos = (from, to, q) => { if (q < .5) { const u = q * 2, c = fxCtr(from), sc = 1 - .85 * u, ang = u * 5, rd = (1 - u) * M * .12; return fxRect({ x: c.x + (gc.x - c.x) * u + Math.cos(ang) * rd, y: c.y + (gc.y - c.y) * u + Math.sin(ang) * rd }, from.w * sc, from.h * sc); } const u = (q - .5) * 2, c = fxCtr(to), sc = .15 + .85 * u, ang = 5 + u * 5, rd = u < 1 ? M * .12 * (1 - u) : 0; return fxRect({ x: gc.x + (c.x - gc.x) * u + Math.cos(ang) * rd, y: gc.y + (c.y - gc.y) * u + Math.sin(ang) * rd }, to.w * sc, to.h * sc); };
    if (t < .46) { fxPlace(env, 0, A, 1, 0); fxPlace(env, 1, B, 1, 0); } else { fxPlace(env, 0, pos(A, B, e), 1, 0); fxPlace(env, 1, pos(B, A, e), 1, 0); }
    if (t > .4 && t < .72) { g.globalAlpha = fxS(.4, .46, t) * (1 - fxS(.66, .72, t)); fxText(g, "FALLEN ANGEL'S GATE", cx, h * .1, M * .065, "#fff", "#2a1a6a", V, "sans-serif"); g.globalAlpha = 1; }
});
UNO_FX_HOOKS.blackclover_t = unoSceneHook("blackclover_t", unoFinral);

/* ---------- BRUNO · Sticky Fingers: ARI ARI ARI, zippers open on both hands, Stand fists pass the cards through, ARRIVEDERCI ---------- */
function fxZip(g, r, p, col) {
    if (p <= 0) return; const per = 2 * (r.w + r.h), L = per * p; g.save(); g.strokeStyle = "#000"; g.lineWidth = 6; g.strokeRect(r.x, r.y, r.w, r.h); g.strokeStyle = col; g.lineWidth = 2; g.setLineDash([L, per]); g.strokeRect(r.x, r.y, r.w, r.h); g.setLineDash([]);
    g.fillStyle = "#fff"; for (let d = 0; d < L; d += 12) { let x, y; if (d < r.w) { x = r.x + d; y = r.y; } else if (d < r.w + r.h) { x = r.x + r.w; y = r.y + d - r.w; } else if (d < 2 * r.w + r.h) { x = r.x + r.w - (d - r.w - r.h); y = r.y + r.h; } else { x = r.x; y = r.y + r.h - (d - 2 * r.w - r.h); } g.fillRect(x - 3, y - (d / 12 % 2 ? 6 : 0), 6, 6); } g.restore();
}
const unoBruno = fxSw("#4cc9f0", 7000, (g, w, h, T, env) => {
    const t = T.t, s = T.s, M = Math.min(w, h), cx = w / 2, cy = h / 2, A = env.A, B = env.B, Q = "#4cc9f0", cA = fxCtr(A), cB = fxCtr(B);
    g.fillStyle = "#0b3a6a"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(255,255,255,.12)"; for (let yy = 0; yy < h; yy += 22) for (let xx = (yy / 22 % 2) * 11; xx < w; xx += 22) { g.beginPath(); g.arc(xx, yy, 3, 0, 6.283); g.fill(); }
    if (t < .3) { const q = fxS(0, .18, t), fs = M * (.15 + .5 * q); g.save(); g.translate(cx, cy + M * .1 * (1 - q)); fxAnimeHand(g, 0, -fs * .3, fs * .017, 0, "fist", FX_SFO); g.restore();
        g.globalAlpha = fxS(.04, .1, t); ["ARI", "ARI", "ARI"].forEach((tx, i) => { g.save(); g.translate(cx + (i - 1) * M * .45, h * .2 + (i % 2) * M * .1); g.rotate((i - 1) * .12); fxText(g, tx + "!", 0, 0, M * .1, "#fff", "#000", Q, "sans-serif"); g.restore(); }); g.globalAlpha = 1; }               // the punch
    const zp = fxS(.22, .42, t), cl = fxS(.78, .92, t), zz = zp * (1 - cl); fxZip(g, A, zz, "#fff"); fxZip(g, B, zz, "#fff");
    if (zz > .8) [A, B].forEach((r, i) => { g.fillStyle = "rgba(0,10,30,.7)"; g.fillRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8); });                                                                                                      // the gap inside the zipper
    const e = fxS(.46, .72, t); if (e > 0 && e < 1) { g.strokeStyle = "#000"; g.lineWidth = 8; g.beginPath(); g.moveTo(cA.x, cA.y); g.lineTo(cB.x, cB.y); g.stroke(); g.strokeStyle = "#fff"; g.lineWidth = 3; g.setLineDash([10, 8]); g.stroke(); g.setLineDash([]);
        [[cA, cB, 0], [cB, cA, 1]].forEach(([a, b, i]) => { const p = fxLerp({ x: a.x, y: a.y, w: 0, h: 0 }, { x: b.x, y: b.y, w: 0, h: 0 }, e); fxAnimeHand(g, p.x + (i ? 30 : -30), p.y, M * .0011, Math.atan2(b.y - a.y, b.x - a.x) + 1.5708, "fist", FX_SFO); }); }                                                           // Stand fists carry the hands through the zipper
    fxPlace(env, 0, fxLerp(A, B, e), 1, 0); fxPlace(env, 1, fxLerp(B, A, e), 1, 0);
    if (t > .7 && t < .9) { const sl = fxSlam(Math.min(1, (t - .7) / .1)); g.save(); g.translate(cx, cy); g.rotate(-.06); g.scale(sl.sc, sl.sc); g.globalAlpha = sl.a * (1 - fxS(.84, .9, t)); fxText(g, "ARRIVEDERCI!", 0, 0, M * .13, "#fff", "#000", Q, "sans-serif"); g.restore(); }
});
UNO_FX_HOOKS.jojo_t = unoSceneHook("jojo_t", unoBruno);


/* =====================================================================
   YHWACH · The Almighty (bleach_e)  -  first person, silent, 9.8 s (owner) / 8.4 s (others)
   1 an ink-black sea of watching eyes   2 you fall into one eye, through eyes inside eyes
   3 shards of possible futures flicker, overlap, then collapse onto the REAL opponent cards   4 the black drains away
   Only the player who used the card gets the real reveal afterwards (existing peek screen).
   ===================================================================== */
const FX_YH_EYE = { stops: [[0, "#ffffff"], [.3, "#e3e8ff"], [.65, "#8790d0"], [1, "#161440"]], rim: "#d6dcff", glow: "#8a7bff", slit: true };
function fxInk(g, w, h, s, a) {        // black liquid: slow dark-violet blobs, sheen lines, dripping streaks
    g.fillStyle = "#010003"; g.fillRect(0, 0, w, h); const M = Math.min(w, h);
    for (let i = 0; i < 8; i++) { const x = w * (.1 + .8 * fxR(i + 3) + .06 * Math.sin(s * .5 + i)), y = h * (.1 + .8 * fxR(i + 9) + .06 * Math.cos(s * .4 + i * 2)), r = M * (.35 + .3 * fxR(i + 15)), n = g.createRadialGradient(x, y, 0, x, y, r);
        n.addColorStop(0, "rgba(46,14,70," + .5 * a + ")"); n.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = n; g.fillRect(0, 0, w, h); }
    g.lineWidth = 1.2; for (let i = 0; i < 9; i++) { const y = h * (.12 + .1 * i) + 8 * Math.sin(s * .8 + i); g.strokeStyle = "rgba(190,170,255," + (.07 * a) + ")"; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y - 26 * Math.sin(s + i), w * .6, y + 26 * Math.cos(s * .9 + i), w, y); g.stroke(); }
    g.lineCap = "round"; for (let i = 0; i < 16; i++) { const x = fxR(i + 40) * w, L = h * (.1 + .5 * ((s * .05 * (.4 + fxR(i + 41)) + fxR(i + 42)) % 1)); g.strokeStyle = "rgba(8,2,16,.9)"; g.lineWidth = 3 + fxR(i + 43) * 7; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, L); g.stroke(); g.fillStyle = "rgba(8,2,16,.9)"; g.beginPath(); g.arc(x, L, 4 + fxR(i + 44) * 6, 0, 6.283); g.fill(); }
}
function fxMini(g, x, y, W, col, a) {   // a small abstract eye outline (for the tunnel of eyes inside eyes)
    g.save(); g.translate(x, y); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = Math.max(1, W * .03); g.beginPath(); g.moveTo(-W / 2, 0); g.quadraticCurveTo(0, -W * .5, W / 2, 0); g.quadraticCurveTo(0, W * .5, -W / 2, 0); g.stroke();
    g.beginPath(); g.arc(0, 0, W * .17, 0, 6.283); g.stroke(); g.beginPath(); g.ellipse(0, 0, W * .02, W * .17, 0, 0, 6.283); g.fillStyle = col; g.fill(); g.restore();
}
const unoYhwach = {
    col: "#8a7bff", ms: 6800, tail: env => env.owner ? 3000 : 1600,
    begin(env, box, u) { env.me = Number(myPlayer); env.owner = env.me === u.fx.p; if (env.owner && u.peek) unoFxOwnsPeek = u.peek.id; env.rects = Array.from(document.querySelectorAll(".u-opp")).map(e => e.getBoundingClientRect()); },
    end(env, u) { if (env.owner && !env.shown) { env.shown = 1; unoFxOwnsPeek = null; unoPeekShow(u, env.me); } },
    draw(g, w, h, T, env, u) {
        const cx = w / 2, cy = h / 2, M = Math.min(w, h), t = T.t, s = T.s, R = Math.hypot(w, h) / 2, V = "#8a7bff";
        const marks = a => env.rects.forEach((r, i) => { const x = r.left + r.width / 2, y = r.top + r.height / 2; g.save(); g.globalAlpha = a; g.strokeStyle = "#fff"; g.lineWidth = 3; g.shadowColor = V; g.shadowBlur = 26; g.strokeRect(r.left - 8, r.top - 8, r.width + 16, r.height + 16); g.shadowBlur = 0; fxMini(g, x, r.top - M * .045, M * .08, "#fff", 1); g.restore(); });
        if (T.ph === "tail") { marks(1 - fxS(.5, 1, T.tt)); return; }
        const dive = fxS(.24, .50, t), z = Math.exp(dive * 6.4);
        if (t < .56) {
            fxInk(g, w, h, s, 1);
            g.save(); g.translate(cx, cy); g.scale(z, z); g.translate(-cx, -cy);                          // ACT 1+2a: the sea of eyes, we fall toward the big one in the middle
            const open = i => fxS(.02 + (i % 12) * .014, .1 + (i % 12) * .014, t);
            for (let i = 0; i < 26; i++) { const an = fxR(i) * 6.283, d = M * (.18 + .7 * fxR(i + 5)), W = M * (.07 + .09 * fxR(i + 8)); fxEye(g, cx + Math.cos(an) * d * 1.5, cy + Math.sin(an) * d, W, open(i) * (.8 + .2 * Math.sin(s * 2 + i)), Object.assign({ tilt: (fxR(i + 2) - .5) * .6 }, FX_YH_EYE)); }
            fxEye(g, cx, cy, M * .46, fxS(.1, .22, t) * (1 - fxS(.46, .5, t) * .0), FX_YH_EYE); g.restore();
            if (t > .4) {                                                                                // ACT 2b: eyes inside eyes, an endless tunnel
                const a = fxS(.4, .5, t), ph = (s * .9) % 1; g.fillStyle = "rgba(0,0,6," + a * .85 + ")"; g.fillRect(0, 0, w, h);
                for (let k = 13; k >= 0; k--) { const sc = Math.pow(1.62, k - ph); fxMini(g, cx + Math.sin(s + k) * M * .01 * k, cy + Math.cos(s * .8 + k) * M * .008 * k, M * .03 * sc, k % 3 === 0 ? "#fff" : k % 3 === 1 ? "#a99cff" : "#5a4ac8", a * Math.max(0, 1 - k / 13)); }
            }
            if (t > .08 && t < .24) { g.globalAlpha = fxS(.08, .14, t) * (1 - fxS(.2, .24, t)); fxText(g, "全知全能", cx, h * .9, M * .08, "#fff", "#1a1440", V); g.globalAlpha = 1; }
        } else {                                                                                          // ACT 3: shards of possible futures, overlapping, then ONE becomes real
            const b = (t - .56) / .44, conv = fxS(.52, .72, b), live = 1 - fxS(.8, 1, b);
            g.fillStyle = "#02010a"; g.fillRect(0, 0, w, h); const tg = env.rects.length ? env.rects.map(r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height })) : [{ x: cx, y: h * .1, w: M * .4, h: M * .12 }];
            for (let i = 0; i < 10; i++) {
                const gt = tg[i % tg.length], hx = w * (.12 + .76 * fxR(i + 60)), hy = h * (.2 + .6 * fxR(i + 70)), x = hx + (gt.x - hx) * conv, y = hy + (gt.y - hy) * conv, sw = M * (.34 - .12 * conv), sh = sw * .62, sd = ((s * 7) | 0) + i * 13;
                [[-5, "rgba(0,255,255,.35)"], [5, "rgba(255,0,200,.35)"], [0, null]].forEach(([off, tint]) => {      // overlapping ghost layers
                    g.save(); g.translate(x + off * (1 - conv), y); g.rotate((fxR(i + 80) - .5) * .7 * (1 - conv)); g.globalAlpha = (tint ? .6 : 1) * live * Math.min(1, b * 6);
                    g.beginPath(); g.moveTo(-sw / 2 + 14, -sh / 2); g.lineTo(sw / 2, -sh / 2); g.lineTo(sw / 2 - 14, sh / 2); g.lineTo(-sw / 2, sh / 2); g.closePath(); g.fillStyle = tint || "#0a0820"; g.fill(); g.strokeStyle = tint ? tint : "#a99cff"; g.lineWidth = 2; g.stroke();
                    if (!tint) { g.save(); g.clip(); const n = 3 + (fxR(sd) * 4 | 0); for (let c = 0; c < n; c++) { const cxx = (c - n / 2 + .5) * sw * .16 + (fxR(sd + c) - .5) * sw * .1 * (1 - conv), cyy = (fxR(sd + c + 9) - .5) * sh * .3 * (1 - conv); g.fillStyle = c === ((fxR(sd + 3) * n) | 0) && conv < .7 ? "#fff" : "rgba(160,150,255,.55)"; g.fillRect(cxx - sw * .06, cyy - sh * .2, sw * .12, sh * .4); } g.restore(); }
                    g.restore();
                });
            }
            if (conv > .6) { g.globalAlpha = fxS(.6, .85, conv) * live; marks(1); g.globalAlpha = 1; }
            const sl = fxSlam(Math.min(1, Math.max(0, (b - .62) / .25))); if (b > .62 && b < .95) { g.save(); g.translate(cx, cy); g.scale(.8 + .2 * sl.sc / 3.2, .8 + .2 * sl.sc / 3.2); g.globalAlpha = sl.a; fxText(g, "THE ALMIGHTY", 0, 0, M * .1, "#fff", "#1a1440", V, "sans-serif"); g.restore(); }
            if (b > .9) { g.fillStyle = "rgba(255,255,255," + .5 * (1 - (b - .9) / .1) + ")"; g.fillRect(0, 0, w, h); }
            if (b > .8) { g.globalCompositeOperation = "destination-out"; g.fillStyle = "rgba(0,0,0," + fxS(.8, 1, b) + ")"; g.fillRect(0, 0, w, h); g.globalCompositeOperation = "source-over"; }   // the black drains away
        }
    }
};
UNO_FX_HOOKS.bleach_e = unoSceneHook("bleach_e", unoYhwach);

/* =====================================================================
   SHANKS (onepiece_e): first-person silhouette, the sword is drawn, a tight series of Conqueror's Haki bursts hits every corner of the page,
   the screen cracks and SHATTERS, and the opponent's cards float in a pure black void (the reveal table).  Synth sound included (respects mute).
   ===================================================================== */
let fxAC = null;
function fxSnd(kind, i) {
    if (muted) return;
    try {
        fxAC = fxAC || new (window.AudioContext || window.webkitAudioContext)(); const a = fxAC; if (a.state === "suspended") a.resume(); const n = a.currentTime;
        const amp = (v, dur) => { const g = a.createGain(); g.gain.setValueAtTime(v, n); g.gain.exponentialRampToValueAtTime(.001, n + dur); g.connect(a.destination); return g; };
        const noise = dur => { const b = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate), d = b.getChannelData(0); for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1; const s = a.createBufferSource(); s.buffer = b; return s; };
        const filt = (type, f) => { const x = a.createBiquadFilter(); x.type = type; x.frequency.value = f; return x; };
        if (kind === "shing") { const s = noise(.55), f = filt("highpass", 3200); s.connect(f); f.connect(amp(.32, .55)); s.start(n); }
        else if (kind === "boom") { const o = a.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(100 - i * 8, n); o.frequency.exponentialRampToValueAtTime(26, n + .75); o.connect(amp(.9, .85)); o.start(n); o.stop(n + .9); const s = noise(.5), f = filt("lowpass", 500 + i * 220); s.connect(f); f.connect(amp(.55, .5)); s.start(n); }
        else if (kind === "crack") { const s = noise(1.2), f = filt("bandpass", 2400); s.connect(f); f.connect(amp(.7, 1.2)); s.start(n); }
    } catch (e) {}
}
const unoShanks = {
    col: "#ff2a3a", ms: 7000, tail: env => env.owner ? 800 : 1400,
    begin(env, box, u) { env.me = Number(myPlayer); env.owner = env.me === u.fx.p; if (env.owner && u.peek) unoFxOwnsPeek = u.peek.id; },
    end(env, u) { if (env.owner && !env.shown) { env.shown = 1; unoFxOwnsPeek = null; unoPeekShow(u, env.me); } },
    draw(g, w, h, T, env, u) {
        const cx = w / 2, cy = h / 2, M = Math.min(w, h), t = T.t, s = T.s, R = Math.hypot(w, h) / 2, RED = "#ff2a3a";
        if (T.ph === "tail") { g.globalAlpha = env.owner ? 1 : 1 - fxS(.3, 1, T.tt); g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.globalAlpha = 1; return; }
        const B = [.42, .48, .54, .60, .66], cue = (k, at, kind, i) => { if (t >= at && !env["c" + k]) { env["c" + k] = 1; fxSnd(kind, i); } };
        cue(0, .20, "shing"); B.forEach((a, i) => cue(i + 1, a, "boom", i)); cue(9, .71, "crack");
        const nb = B.filter(a => t >= a).length, hit = B.reduce((m, a) => t >= a ? Math.max(m, 1 - (t - a) / .06) : m, 0), sx = (fxR(((s * 40) | 0) + 1) - .5) * 26 * hit, sy = (fxR(((s * 40) | 0) + 2) - .5) * 26 * hit;
        g.save(); g.translate(sx, sy);
        if (t < .71) {
            g.fillStyle = "#040103"; g.fillRect(-40, -40, w + 80, h + 80); const vg = g.createRadialGradient(cx, cy, M * .2, cx, cy, R); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(130,0,14," + (.45 + .25 * Math.sin(s * 5) * (t < .4 ? 1 : 0) + .3 * hit) + ")"); g.fillStyle = vg; g.fillRect(-40, -40, w + 80, h + 80);
            g.strokeStyle = "#a3121e"; g.lineWidth = 3; g.lineCap = "round"; for (let i = 0; i < 16; i++) { const x = w * (.06 + .88 * fxR(i + 5)), L = h * (.08 + .1 * fxR(i + 9)) * (1 + .12 * Math.sin(s * 2 + i)); g.beginPath(); g.moveTo(x, -10); g.quadraticCurveTo(x + 14 * Math.sin(s + i), L * .5, x + 8 * Math.sin(s * 1.3 + i), L); g.stroke(); }   // red hair falling into view
            const hx = w * .78, hy = h * .92, ang = -2.25, bx = Math.cos(ang), by = Math.sin(ang), draw = fxS(.2, .34, t);                                    // the right hand on the hilt
            g.save(); g.fillStyle = "#07060a"; g.beginPath(); g.moveTo(-20, h + 20); g.lineTo(-20, h * .8 + 18 * Math.sin(s * 2)); g.quadraticCurveTo(w * .15, h * .9, w * .3, h + 20); g.fill();   // cloak edge
            g.translate(hx, hy); g.rotate(ang + 1.57); g.fillStyle = "#0a0910"; g.strokeStyle = "#5a1018"; g.lineWidth = 3; g.fillRect(-M * .02, M * .02, M * .04, M * .9); g.beginPath(); g.moveTo(-M * .09, 0); g.lineTo(M * .09, 0); g.lineTo(M * .09, -M * .03); g.lineTo(-M * .09, -M * .03); g.closePath(); g.fill(); g.stroke();   // scabbard + guard
            g.fillStyle = "#000"; g.beginPath(); g.ellipse(0, M * .06, M * .075, M * .1, 0, 0, 6.283); g.fill(); g.stroke(); g.restore();                  // fist
            if (draw > 0) { const L = M * 1.15 * draw, x0 = hx + bx * M * .02, y0 = hy + by * M * .02, x1 = x0 + bx * L, y1 = y0 + by * L, nx = -by * M * .022, ny = bx * M * .022;
                g.fillStyle = "#050507"; g.strokeStyle = "#fff"; g.lineWidth = 2; g.shadowColor = "#fff"; g.shadowBlur = 14; g.beginPath(); g.moveTo(x0 + nx, y0 + ny); g.lineTo(x1, y1); g.lineTo(x0 - nx, y0 - ny); g.closePath(); g.fill(); g.stroke(); g.shadowBlur = 0;
                const gl = (s * 1.4) % 1; g.fillStyle = "rgba(255,255,255," + (.7 * (1 - draw * .6)) + ")"; g.beginPath(); g.arc(x0 + (x1 - x0) * gl, y0 + (y1 - y0) * gl, 5, 0, 6.283); g.fill();
                if (t > .34) { for (let i = 0; i < 4; i++) { const q = .15 + .7 * fxR(i + (s * 12 | 0)), px = x0 + (x1 - x0) * q, py = y0 + (y1 - y0) * q; fxBolt(g, px, py, px + (fxR(i + 3) - .5) * M * .3, py + (fxR(i + 7) - .5) * M * .3, (s * 14 | 0) + i, i % 2 ? "#ff2a3a" : "#220004"); } } }
            if (t < .2) { g.fillStyle = "rgba(0,0,0," + (.5 * (1 - fxS(0, .2, t))) + ")"; g.fillRect(0, 0, w, h); }
            for (let i = 0; i < nb; i++) {                                                                                                                         // THE BURSTS: rings that sweep every pixel, bolts to every edge
                const q = Math.min(1.5, (t - B[i]) / .1), rr = q * R * 1.25, a = Math.max(0, 1 - q * .7);
                g.globalAlpha = a; g.strokeStyle = RED; g.lineWidth = 34 * (1 - Math.min(1, q * .7)) + 4; g.shadowColor = RED; g.shadowBlur = 40; g.beginPath(); g.arc(cx, cy, rr, 0, 6.283); g.stroke(); g.strokeStyle = "#fff"; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, rr * .97, 0, 6.283); g.stroke(); g.shadowBlur = 0;
                for (let k = 0; k < 18; k++) { const an = k / 18 * 6.283 + i; fxBolt(g, cx + Math.cos(an) * rr * .6, cy + Math.sin(an) * rr * .6, cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, i * 31 + k + ((s * 20) | 0), k % 2 ? "#ff2a3a" : "#fff"); }
                g.globalAlpha = 1; if (q < .35) { g.fillStyle = "rgba(255,40,50," + .35 * (1 - q / .35) + ")"; g.fillRect(0, 0, w, h); }
            }
            if (nb) { const cp = Math.min(1, (nb - 1) / 4 + hit * .1); g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 1.6; g.shadowColor = RED; g.shadowBlur = 10;      // the glass of the page cracks, wider with every burst
                for (let k = 0; k < 22; k++) { let x = cx, y = cy, an = k / 22 * 6.283 + fxR(k) * .3; g.beginPath(); g.moveTo(x, y); for (let sg = 0; sg < 9; sg++) { if (sg / 9 > cp * 1.05) break; const L = R * .13 * (.6 + fxR(k * 9 + sg)); an += (fxR(k * 17 + sg) - .5) * .8; x += Math.cos(an) * L; y += Math.sin(an) * L; g.lineTo(x, y); } g.stroke(); } g.shadowBlur = 0; }
        } else {                                                                                                                                                      // THE FOURTH WALL BREAKS: the screen falls away in shards, black void behind
            const q = (t - .71) / .29; g.fillStyle = "#000"; g.fillRect(-40, -40, w + 80, h + 80);
            if (q < .12) { g.fillStyle = "rgba(255,255,255," + (1 - q / .12) + ")"; g.fillRect(-40, -40, w + 80, h + 80); }
            const rings = [0, .34, .7, 1.2], sec = 12, fall = q * q;
            for (let r = 0; r < 3; r++) for (let k = 0; k < sec; k++) {
                const a0 = k / sec * 6.283, a1 = (k + 1) / sec * 6.283, ma = (a0 + a1) / 2, r0 = rings[r] * R, r1 = rings[r + 1] * R, v = (1.4 - r * .25) * R * q * .9 * (.7 + fxR(r * 20 + k)), rot = (fxR(r * 30 + k) - .5) * 3 * q;
                const ox = Math.cos(ma) * v, oy = Math.sin(ma) * v + fall * h * (.5 + fxR(r * 40 + k)); g.save(); g.translate(cx + ox, cy + oy); g.rotate(rot); g.translate(-cx, -cy); g.globalAlpha = Math.max(0, 1 - q * 1.15);
                g.beginPath(); g.moveTo(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0); g.lineTo(cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1); g.lineTo(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1); g.lineTo(cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0); g.closePath();
                g.fillStyle = "rgba(34,10,14,.95)"; g.fill(); g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 2; g.stroke(); g.restore();
            }
            g.globalAlpha = 1; if (q > .5) { g.fillStyle = "#ff2a3a"; for (let i = 0; i < 24; i++) { g.globalAlpha = .5 * fxS(.5, .9, q) * (.4 + .6 * fxR(i)); g.fillRect(fxR(i + 2) * w, (fxR(i + 9) * h + s * 18 * (1 + fxR(i))) % h, 2, 2); } g.globalAlpha = 1; }   // embers drifting in the void
        }
        g.restore();
    }
};
UNO_FX_HOOKS.onepiece_e = unoSceneHook("onepiece_e", unoShanks);

/* =====================================================================
   PERCEPTION SCENES, batch 2:  Jiren (ki sensing) · Yoriichi (Transparent World) · Diavolo (Epitaph)
   Each ends on a dark screen and then the Future Sight table appears (only for the player who used the card).
   ===================================================================== */
function fxPeekScene(col, ms, bg, draw) {
    return {
        col: col, ms: ms, tail: env => env.owner ? 800 : 1400,
        begin(env, box, u) { env.me = Number(myPlayer); env.owner = env.me === u.fx.p; if (env.owner && u.peek) unoFxOwnsPeek = u.peek.id; env.rects = Array.from(document.querySelectorAll(".u-opp")).map(e => e.getBoundingClientRect()); },
        end(env, u) { if (env.owner && !env.shown) { env.shown = 1; unoFxOwnsPeek = null; unoPeekShow(u, env.me); } },
        draw(g, w, h, T, env, u) {
            if (T.ph === "tail") { g.globalAlpha = env.owner ? 1 : 1 - fxS(.3, 1, T.tt); g.fillStyle = bg; g.fillRect(0, 0, w, h); g.globalAlpha = 1; return; }
            draw(g, w, h, T, env, u);
        }
    };
}
/* ---------- JIREN: eyes shut, he senses by vibration. Gray rings spread; every ring that touches a plate ignites that opponent's ki ---------- */
function fxKi(g, x, y, wd, ht, lit, s, seed) {
    for (let j = 0; j < 9; j++) {
        const fx = x + (j / 8 - .5) * wd, fh = ht * (1.2 + 1.3 * fxR(seed + j)) * (.7 + .3 * Math.sin(s * 9 + j * 2)), fw = wd * .09;
        const gr = g.createLinearGradient(0, y, 0, y - fh); gr.addColorStop(0, "rgba(255,230,200," + lit * .8 + ")"); gr.addColorStop(.4, "rgba(255,110,40," + lit * .6 + ")"); gr.addColorStop(1, "rgba(120,0,0,0)");
        g.fillStyle = gr; g.beginPath(); g.moveTo(fx - fw, y); g.quadraticCurveTo(fx - fw * .4, y - fh * .5, fx + 6 * Math.sin(s * 7 + j), y - fh); g.quadraticCurveTo(fx + fw * .4, y - fh * .5, fx + fw, y); g.closePath(); g.fill();
    }
}
const unoJiren = fxPeekScene("#ff5a3c", 6600, "#030304", (g, w, h, T, env) => {
    const cx = w / 2, cy = h / 2, M = Math.min(w, h), t = T.t, s = T.s, R = Math.hypot(w, h) * .6, O = "#ff5a3c";
    g.fillStyle = "#030304"; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 6; k++) { const q = (t - (.12 + k * .1)) / .36; if (q > 0 && q < 1) { g.strokeStyle = "rgba(200,200,210," + (.5 * (1 - q)) + ")"; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, q * R, 0, 6.283); g.stroke(); g.strokeStyle = "rgba(120,120,130," + (.3 * (1 - q)) + ")"; g.beginPath(); g.arc(cx, cy, q * R * .93, 0, 6.283); g.stroke(); } }   // vibrations in the dark
    env.rects.forEach((r, i) => {
        const x = r.left + r.width / 2, y = r.top + r.height / 2, tt = .12 + Math.min(1, Math.hypot(x - cx, y - cy) / R) * .36, lit = fxS(tt, tt + .1, t) * (1 - fxS(.84, .95, t));
        if (lit <= 0) return; g.save(); g.globalAlpha = 1; g.strokeStyle = "rgba(255,120,60," + lit * .6 + ")"; g.lineWidth = 2; g.strokeRect(r.left - 6, r.top - 6, r.width + 12, r.height + 12);
        fxKi(g, x, r.top + r.height, r.width, r.height * .9, lit, s, i * 11 + 1); g.globalAlpha = lit; fxText(g, String(9000 + ((fxR(((s * 9) | 0) + i) * 90000) | 0)), x, r.top - M * .04, M * .035, "#fff", "#300", O); g.restore();
    });
    if (t < .1) { g.fillStyle = "#030304"; const c = 1 - t / .1; g.fillRect(0, 0, w, cy * c); g.fillRect(0, h - cy * c, w, cy * c); }          // the eyes close
    if (t > .58 && t < .86) { const o = fxS(.58, .7, t), a = 1 - fxS(.74, .86, t); g.globalAlpha = a; const gr = g.createRadialGradient(cx, cy, 0, cx, cy, M * (.2 + .6 * o)); gr.addColorStop(0, "rgba(255,90,60,.55)"); gr.addColorStop(1, "rgba(255,90,60,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h);   // the eyes open, red
        g.fillStyle = "#fff"; g.fillRect(cx - M * .5 * o, cy - 2, M * o, 4); fxText(g, "気", cx, cy, M * .3, "rgba(255,255,255,.18)", "#ff5a3c", O); g.globalAlpha = 1; }
});
UNO_FX_HOOKS.dragonball_e = unoSceneHook("dragonball_e", unoJiren);

/* ---------- YORIICHI: the Transparent World. Ink-wash calm, a red sun, the opponent seen through like glass: veins, a pulse, the cards inside ---------- */
const unoYoriichi = fxPeekScene("#ff3b3b", 6600, "#060607", (g, w, h, T, env) => {
    const cx = w / 2, cy = h / 2, M = Math.min(w, h), t = T.t, s = T.s, R = Math.hypot(w, h) / 2, K = "#ff3b3b";
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#1b1b21"); bg.addColorStop(1, "#060607"); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) { const x = ((fxR(i + 5) * w * 1.4 + s * 14 * (.4 + fxR(i))) % (w * 1.4)) - w * .2, y = h * (.15 + .7 * fxR(i + 9)), n = g.createRadialGradient(x, y, 0, x, y, M * .45); n.addColorStop(0, "rgba(255,255,255,.07)"); n.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = n; g.fillRect(0, 0, w, h); }   // ink-wash mist
    const sun = fxS(0, .3, t), fade = 1 - fxS(.86, .97, t); g.save(); g.globalAlpha = fade; g.translate(cx, cy * .8); g.strokeStyle = "rgba(255,59,59," + .55 * sun + ")"; g.lineWidth = 2;
    for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(0, 0, M * (.12 + k * .06) * (.6 + .4 * sun) + 3 * Math.sin(s * 2 + k), 0, 6.283); g.stroke(); } for (let k = 0; k < 48; k++) { const an = k / 48 * 6.283 + s * .08, L = M * (.06 + .05 * fxR(k)) * sun; g.beginPath(); g.moveTo(Math.cos(an) * M * .3, Math.sin(an) * M * .3); g.lineTo(Math.cos(an) * (M * .3 + L), Math.sin(an) * (M * .3 + L)); g.stroke(); } g.restore();   // the sun halo
    const tp = fxS(.22, .5, t) * fade;
    env.rects.forEach((r, i) => {
        const x = r.left, y = r.top, W = r.width, H = r.height; g.save(); g.globalAlpha = tp; g.fillStyle = "rgba(255,255,255,.05)"; g.fillRect(x, y, W, H); g.strokeStyle = "rgba(255,230,230,.7)"; g.lineWidth = 1.5; g.strokeRect(x, y, W, H);
        g.strokeStyle = "rgba(255,70,70,.65)"; g.lineWidth = 1; for (let k = 0; k < 18; k++) { let px = x + W / 2, py = y + H / 2, an = fxR(k + i * 7) * 6.283; g.beginPath(); g.moveTo(px, py); for (let sg = 0; sg < 4; sg++) { an += (fxR(k * 5 + sg) - .5) * 1.2; px += Math.cos(an) * W * .09; py += Math.sin(an) * H * .22; g.lineTo(px, py); } g.stroke(); }   // see-through veins
        g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 2; g.beginPath(); for (let px = 0; px <= W; px += 4) { const ph = (px / W * 3 - s * .8) % 1, v = ph < .1 ? Math.sin(ph / .1 * 3.14) * -H * .36 : ph < .16 ? H * .12 : 0; g.lineTo(x + px, y + H * .5 + v); } g.stroke();   // the heartbeat, seen through the body
        if (t > .55) { const c = fxS(.55, .75, t); g.globalAlpha = c * tp; g.strokeStyle = "rgba(255,255,255,.9)"; for (let k = 0; k < 5; k++) g.strokeRect(x + W * (.08 + k * .17), y + H * .18, W * .14, H * .64); }                               // the cards inside, drawn like glass
        g.restore();
    });
    if (t > .15 && t < .75) { g.globalAlpha = fxS(.15, .25, t) * (1 - fxS(.65, .75, t)); "透き通る世界".split("").forEach((c, i) => fxText(g, c, w * .07, h * .14 + i * M * .085, M * .06, "#fff", "#300", K)); g.globalAlpha = 1; }
});
UNO_FX_HOOKS.demonslayer_e = unoSceneHook("demonslayer_e", unoYoriichi);

/* ---------- DIAVOLO: Epitaph. Jagged manga panels of the future flicker; then King Crimson erases the time between and only the real cards remain ---------- */
const unoDiavolo = fxPeekScene("#ff4fa8", 6600, "#08010a", (g, w, h, T, env) => {
    const cx = w / 2, cy = h / 2, M = Math.min(w, h), t = T.t, s = T.s, R = Math.hypot(w, h) / 2, P = "#ff4fa8";
    g.fillStyle = "#08010a"; g.fillRect(0, 0, w, h);
    const panels = [[[0, 0], [.46, 0], [.38, .52], [0, .44]], [[.46, 0], [1, 0], [1, .36], [.56, .46], [.38, .52]], [[0, .44], [.38, .52], [.56, .46], [.5, 1], [0, 1]], [[.56, .46], [1, .36], [1, 1], [.5, 1]]], pal = [P, "#7a1fa2", "#ffa6dc", "#3a0a58"];
    const life = 1 - fxS(.5, .62, t), step = (s * 3) | 0;
    if (life > 0) panels.forEach((pn, k) => {
        const on = fxS(.04 + k * .07, .1 + k * .07, t); if (on <= 0) return; g.save(); g.beginPath(); pn.forEach(([x, y], i) => { const px = w * x + (1 - on) * (k % 2 ? 60 : -60), py = h * y; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.clip(); g.globalAlpha = on * life;
        g.fillStyle = pal[k]; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(0,0,0,.28)"; for (let yy = 0; yy < h; yy += 22) for (let xx = (yy / 22 % 2) * 11; xx < w; xx += 22) { g.beginPath(); g.arc(xx, yy, 3.4, 0, 6.283); g.fill(); }   // halftone
        const fx = w * (pn[0][0] + pn[2][0]) / 2, fy = h * (pn[0][1] + pn[2][1]) / 2; g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 2; for (let l = 0; l < 30; l++) { const an = l / 30 * 6.283; g.beginPath(); g.moveTo(fx + Math.cos(an) * M * .12, fy + Math.sin(an) * M * .12); g.lineTo(fx + Math.cos(an) * R, fy + Math.sin(an) * R); g.stroke(); }
        g.fillStyle = "#08010a"; for (let c = 0; c < 5; c++) { const o = fxR(step * 7 + k * 13 + c) * 30 - 15, hl = c === ((fxR(step + k) * 5) | 0); g.fillStyle = hl ? "#fff" : "#08010a"; g.fillRect(fx - M * .17 + c * M * .07, fy - M * .06 + o, M * .055, M * .12); }   // possible futures: cards that keep rearranging
        g.restore(); g.strokeStyle = "#08010a"; g.lineWidth = 5; g.beginPath(); pn.forEach(([x, y], i) => i ? g.lineTo(w * x, h * y) : g.moveTo(w * x, h * y)); g.closePath(); g.stroke();
    });
    if (t > .2 && t < .5) { const sl = fxSlam(Math.min(1, (t - .2) / .12)); g.save(); g.translate(cx, cy); g.rotate(-.1); g.scale(sl.sc, sl.sc); g.globalAlpha = sl.a; fxText(g, "EPITAPH", 0, 0, M * .17, "#fff", "#5a0a3a", P, "sans-serif"); g.restore(); }
    if (t >= .5 && t < .72) {                                                              // KING CRIMSON: time is erased, a red tear sweeps, the world goes negative
        const q = (t - .5) / .22, tx = w * fxS(0, 1, q); g.save(); g.beginPath(); g.rect(0, 0, tx, h); g.clip(); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#000"; for (let i = 0; i < 40; i++) g.fillRect(fxR(i) * w, fxR(i + 3) * h, 3 + fxR(i + 5) * 40, 2); g.restore();
        g.strokeStyle = "#e11b1b"; g.lineWidth = 6; g.beginPath(); for (let i = 0; i <= 12; i++) g.lineTo(tx + (i % 2 ? 22 : -22), h * i / 12); g.stroke();
        if (q > .15 && q < .9) { g.save(); g.translate(cx, cy); g.rotate(.06); fxText(g, "KING CRIMSON", 0, 0, M * .13, "#e11b1b", "#000", "#fff", "sans-serif"); g.restore(); }
    }
    if (t >= .72) { const a = fxS(.72, .82, t) * (1 - fxS(.9, .98, t)); env.rects.forEach(r => { g.save(); g.globalAlpha = a; g.strokeStyle = P; g.lineWidth = 4; g.shadowColor = P; g.shadowBlur = 30; g.strokeRect(r.left - 8, r.top - 8, r.width + 16, r.height + 16); g.shadowBlur = 0; g.fillStyle = "rgba(255,79,168,.12)"; g.fillRect(r.left, r.top, r.width, r.height); g.restore(); }); }   // only the real cards remain
});
UNO_FX_HOOKS.jojo_e = unoSceneHook("jojo_e", unoDiavolo);

/* ---------- NEON · Lovely Ghostwriter: in a trance her pen writes a four-line prophecy by itself; the words turn gold and stream to the opponent's cards ---------- */
const unoNeon = fxPeekScene("#ff7ad9", 6600, "#12031a", (g, w, h, T, env) => {
    const cx = w / 2, cy = h / 2, M = Math.min(w, h), t = T.t, s = T.s, K = "#ff7ad9", x0 = w * .14, x1 = w * .86;
    const pg = g.createLinearGradient(0, 0, 0, h); pg.addColorStop(0, "#fff4f8"); pg.addColorStop(1, "#f4c2d8"); g.fillStyle = pg; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(190,110,150,.25)"; g.lineWidth = 1; for (let y = h * .18; y < h; y += M * .06) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }                 // the notepaper
    const wr = fxS(.06, .6, t) * 4, gold = fxS(.62, .72, t); let tip = null;
    g.lineCap = "round"; g.lineWidth = 3.2;
    for (let L = 0; L < 4; L++) {
        const p = Math.min(1, Math.max(0, wr - L)); if (p <= 0) continue; const by = h * (.26 + .12 * L), xe = x0 + (x1 - x0) * p;
        g.strokeStyle = "rgb(" + ((122 + 100 * gold) | 0) + "," + ((26 + 120 * gold) | 0) + "," + ((90 - 40 * gold) | 0) + ")"; g.shadowColor = gold > 0 ? "#ffc84a" : "transparent"; g.shadowBlur = 14 * gold; g.beginPath();
        let ly = by; for (let x = x0; x <= xe; x += 3) { ly = by + Math.sin(x * .09 + L) * 7 + Math.sin(x * .33) * 2.5; ((x - x0) % 150) > 128 ? g.moveTo(x, ly) : g.lineTo(x, ly); } g.stroke(); g.shadowBlur = 0;   // handwriting, words with gaps
        if (p < 1) tip = { x: xe, y: ly };
    }
    if (tip && t < .64) {                                                                                                                                            // the pen moves on its own, the hand in a trance
        g.strokeStyle = "#4a1030"; g.lineWidth = 7; g.beginPath(); g.moveTo(tip.x, tip.y); g.lineTo(tip.x + M * .14, tip.y - M * .34); g.stroke(); g.fillStyle = "#ffc84a"; g.beginPath(); g.arc(tip.x, tip.y, 4, 0, 6.283); g.fill();
        g.fillStyle = "#f6d2c4"; g.strokeStyle = "#8a4a5a"; g.lineWidth = 3; g.beginPath(); g.ellipse(tip.x + M * .2, tip.y - M * .42, M * .08, M * .1, .3, 0, 6.283); g.fill(); g.stroke();
        for (let k = 0; k < 3; k++) { const q = (s * 1.3 + k / 3) % 1; g.strokeStyle = "rgba(255,122,217," + (.6 * (1 - q)) + ")"; g.lineWidth = 2; g.beginPath(); g.arc(tip.x, tip.y, q * M * .12, 0, 6.283); g.stroke(); }
        for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(255,200,74," + (.5 + .5 * Math.sin(s * 8 + k)) + ")"; g.fillRect(tip.x + (fxR(k + ((s * 6) | 0)) - .5) * M * .2, tip.y + (fxR(k + 9 + ((s * 6) | 0)) - .5) * M * .2, 3, 3); }
    }
    const dim = fxS(.64, .78, t);
    if (dim > 0) env.rects.forEach((r, i) => {                                                                                                                         // the prophecy flows to the cards it is about
        const ax = cx, ay = h * .44, bx = r.left + r.width / 2, by = r.top + r.height / 2, cxx = (ax + bx) / 2 + (i - .5) * M * .3, cyy = (ay + by) / 2;
        for (let k = 0; k < 24; k++) { const u = ((s * .45 + k / 24) % 1), a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u; g.fillStyle = "rgba(255,190,60," + dim * (1 - u * .4) + ")"; g.beginPath(); g.arc(a * ax + b * cxx + c * bx, a * ay + b * cyy + c * by, 3.5 - u * 1.5, 0, 6.283); g.fill(); }
        g.save(); g.globalAlpha = dim; g.strokeStyle = "#ffb43a"; g.lineWidth = 4; g.shadowColor = K; g.shadowBlur = 26; g.strokeRect(r.left - 8, r.top - 8, r.width + 16, r.height + 16); g.restore();
    });
    g.globalAlpha = fxS(.1, .3, t) * (1 - fxS(.5, .62, t)); fxText(g, "LOVELY GHOSTWRITER", cx, h * .9, M * .05, "#fff", "#7a1a5a", K, "sans-serif"); g.globalAlpha = 1;
    const dk = fxS(.84, .97, t); if (dk > 0) { g.fillStyle = "rgba(18,3,26," + dk + ")"; g.fillRect(0, 0, w, h); }
});
UNO_FX_HOOKS.hxh_e = unoSceneHook("hxh_e", unoNeon);

/* ---------- VANESSA · Red Thread of Fate: Rouge. Five red threads leave her fingertips, find the opponent, knot around it and carry what they feel back ---------- */
const unoVanessa = fxPeekScene("#ff3b66", 6600, "#060003", (g, w, h, T, env) => {
    const cx = w / 2, cy = h / 2, M = Math.min(w, h), t = T.t, s = T.s, K = "#ff3b66", R = env.rects.length ? env.rects : [{ left: w * .35, top: h * .06, width: w * .3, height: h * .12 }];
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#1a0310"); bg.addColorStop(1, "#060003"); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,160,190,.5)"; for (let i = 0; i < 60; i++) g.fillRect(fxR(i) * w, fxR(i + 7) * h, 1.6, 1.6);
    const fade = 1 - fxS(.84, .97, t); g.globalAlpha = fade; g.lineCap = "round";
    for (let i = 0; i < 14; i++) { const a = [fxR(i) * w, fxR(i + 3) < .5 ? 0 : h], b = [fxR(i + 6) * w, fxR(i + 9) < .5 ? 0 : h]; g.strokeStyle = "rgba(255,59,102," + (.12 + .1 * Math.sin(s * 2 + i)) + ")"; g.lineWidth = 1; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 60 * Math.sin(s + i), b[0], b[1]); g.stroke(); }   // faint web in the dark
    const tips = [0, 1, 2, 3, 4].map(k => ({ x: cx + (k - 2) * M * .1, y: h * (.8 + Math.abs(k - 2) * .025) }));
    g.fillStyle = "#050204"; g.strokeStyle = "#8a1030"; g.lineWidth = 3; g.shadowColor = K; g.shadowBlur = 16; g.beginPath(); g.ellipse(cx, h * 1.05, M * .3, M * .3, 0, 0, 6.283); g.fill(); g.stroke();                       // your hand, fingers spread
    tips.forEach(p => { g.lineWidth = 17; g.strokeStyle = "#050204"; g.beginPath(); g.moveTo(cx + (p.x - cx) * .5, h * 1.0); g.lineTo(p.x, p.y); g.stroke(); g.lineWidth = 2; g.strokeStyle = "#8a1030"; g.stroke(); }); g.shadowBlur = 0;
    tips.forEach((a, k) => {
        const r = R[k % R.length], bx = r.left + r.width * (.2 + .15 * ((k / R.length) | 0) + .25 * (k % 3)), by = r.top + r.height / 2, p = fxS(.1 + k * .04, .42 + k * .03, t), vib = fxS(.5, .6, t) * (1 - fxS(.84, .95, t)), mx = (a.x + bx) / 2, my = (a.y + by) / 2 + M * .1 * (k % 2 ? 1 : -1);
        const pt = u => { const q = 1 - u, wv = Math.sin(u * 22 - s * 14) * M * .012 * vib * Math.sin(u * 3.14); return [q * q * a.x + 2 * q * u * mx + u * u * bx + wv, q * q * a.y + 2 * q * u * my + u * u * by + wv]; };
        [[9, "rgba(255,59,102,.22)"], [3, "#ff3b66"], [1.2, "#ffd9e2"]].forEach(([lw, col]) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); for (let i = 0; i <= 40; i++) { if (i / 40 > p) break; const q = pt(i / 40); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.stroke(); });
        if (p > .98) { g.fillStyle = "#ff3b66"; g.beginPath(); g.arc(bx, by, 7, 0, 6.283); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.stroke(); }
        if (t > .56) for (let j = 0; j < 3; j++) { const u = 1 - ((s * .8 + j / 3 + k * .2) % 1), q = pt(u); g.fillStyle = "rgba(255,255,255,.9)"; g.beginPath(); g.arc(q[0], q[1], 3, 0, 6.283); g.fill(); }   // what the threads feel travels back to you
    });
    const kn = fxS(.42, .6, t); R.forEach(r => { g.save(); g.strokeStyle = "#ff3b66"; g.lineWidth = 3; g.shadowColor = K; g.shadowBlur = 18; const per = 2 * (r.width + r.height + 24); g.setLineDash([per * kn, per]); g.strokeRect(r.left - 12, r.top - 12, r.width + 24, r.height + 24); g.restore(); });   // the thread knots around them
    g.globalAlpha = fxS(.1, .25, t) * (1 - fxS(.45, .6, t)) * fade; "運命の赤い糸".split("").forEach((c, i) => fxText(g, c, w * .93, h * .16 + i * M * .08, M * .055, "#fff", "#400018", K)); g.globalAlpha = 1;
});
UNO_FX_HOOKS.blackclover_e = unoSceneHook("blackclover_e", unoVanessa);

/* =====================================================================
   ICE GROUP: Aokiji · Haku · Uraume · Doma · Hitsugaya.  Five different ways to freeze the SAME real plate.
   The frozen look then stays on the plate itself (per character) until the two turns are over.   ~8.6 s, silent.
   ===================================================================== */

/* hand styles for the new scenes (drawn with the file's own fxAnimeHand: four knuckles, curled fingers, thumb, sleeve) */
const FX_SPO = { skin: ["#d9c2ff", "#8a5ce0", "#3d1f8a"], sleeve: "#6a3cc0", cuff: "#0a0612", ink: "#000" };      // Star Platinum
const FX_SFO = { skin: ["#e6f6ff", "#59b8ff", "#2a6ec8"], sleeve: "#3a8ee0", cuff: "#ffffff", ink: "#06224a" };    // Sticky Fingers
const FX_GLD = { skin: ["#fff3c0", "#e6b93a", "#8a5a10"], sleeve: "#d9a82a", cuff: "#fff1b0", ink: "#5a3a00" };    // Guanyin's golden hands
const FX_HIT = { skin: ["#7a6a8a", "#2a2038", "#0a0614"], sleeve: "#0a0614", cuff: "#b388ff", ink: "#b388ff" };    // Hit
function fxFrzBegin(env, box, u) {
    env.to = u.fx.to; env.name = u.names["p" + u.fx.to] || "?";
    const e = document.querySelector('.u-opp[data-p="' + u.fx.to + '"]'), r = e ? e.getBoundingClientRect() : null;
    env.r = r ? { x: r.left, y: r.top, w: r.width, h: r.height } : { x: innerWidth * .35, y: innerHeight * .04, w: innerWidth * .3, h: innerHeight * .14 };
}
function fxShell(g, r, a, s, col) {         // a block of ice around the plate (the scenes end on it, then it fades into the real frozen plate)
    if (a <= 0) return; g.save(); g.globalAlpha = a; const gr = g.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h); gr.addColorStop(0, "rgba(230,252,255,.6)"); gr.addColorStop(.5, "rgba(110,190,255,.28)"); gr.addColorStop(1, "rgba(210,244,255,.55)");
    g.fillStyle = gr; g.strokeStyle = col; g.lineWidth = 3; g.shadowColor = col; g.shadowBlur = 24; g.fillRect(r.x - 10, r.y - 10, r.w + 20, r.h + 20); g.strokeRect(r.x - 10, r.y - 10, r.w + 20, r.h + 20); g.shadowBlur = 0;
    g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 1.4; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(r.x - 10 + fxR(i) * (r.w + 20), r.y - 10); g.lineTo(r.x - 10 + fxR(i + 4) * (r.w + 20), r.y + r.h + 10); g.stroke(); } g.restore();
}
function fxIce(col, ms, draw) { return { col: col, ms: ms, tail: () => 1600, begin: fxFrzBegin, draw(g, w, h, T, env, u) { if (T.ph === "tail") { fxShell(g, env.r, 1 - fxS(.3, 1, T.tt), T.s, col); return; } draw(g, w, h, T, env, u); } }; }
function fxFrostBr(g, x, y, an, len, d) {     // one frost crystal: a stem that keeps sprouting smaller branches
    if (d > 3 || len < 4) return; const x2 = x + Math.cos(an) * len, y2 = y + Math.sin(an) * len; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    fxFrostBr(g, x2, y2, an + .7, len * .55, d + 1); fxFrostBr(g, x2, y2, an - .7, len * .55, d + 1); fxFrostBr(g, x2, y2, an, len * .62, d + 1);
}

/* ---------- AOKIJI · Ice Time / Ice Age: lazy, calm. Frost creeps up the glass of your screen, crawls to the plate, huge spires rise, the plate is sealed in a block ---------- */
const unoAokiji = fxIce("#d8f6ff", 7000, (g, w, h, T, env) => {
    const t = T.t, s = T.s, M = Math.min(w, h), r = env.r, cx = r.x + r.w / 2, cy = r.y + r.h / 2, bgA = 1 - fxS(.82, .97, t), C = "rgba(215,242,255,";
    g.fillStyle = "rgba(4,14,30," + .82 * bgA + ")"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) { const x = ((fxR(i) * w * 1.3 + s * 16) % (w * 1.3)) - w * .15, n = g.createRadialGradient(x, h * .95, 0, x, h * .95, M * .5); n.addColorStop(0, "rgba(200,235,255,.16)"); n.addColorStop(1, "rgba(200,235,255,0)"); g.fillStyle = n; g.fillRect(0, 0, w, h); }   // cold breath
    const cr = fxS(.04, .42, t); g.lineWidth = 1.3; g.strokeStyle = C + .55 * bgA + ")"; for (let i = 0; i < 40; i++) fxFrostBr(g, fxR(i) * w, h, -1.57 + (fxR(i + 5) - .5) * 1.2, M * .16 * cr * (.4 + .6 * fxR(i + 9)), 0);   // frost creeps up the screen
    const hd = fxS(0, .2, t) * (1 - fxS(.3, .45, t)); if (hd > 0) { g.save(); g.globalAlpha = hd; g.fillStyle = "#06101c"; g.strokeStyle = "#cfeeff"; g.lineWidth = 3; g.shadowColor = "#bfe9ff"; g.shadowBlur = 20; g.beginPath(); g.ellipse(w * .5, h * (1.1 - .12 * hd), M * .2, M * .12, 0, 0, 6.283); g.fill(); g.stroke(); for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(w * .5 + (k - 1.5) * M * .09, h * (1.06 - .1 * hd)); g.lineTo(w * .5 + (k - 1.5) * M * .1, h * (.92 - .1 * hd)); g.lineWidth = 16; g.lineCap = "round"; g.stroke(); } g.restore(); }   // a lazy open hand
    const p = fxS(.25, .55, t); g.strokeStyle = C + .8 * bgA + ")"; g.lineWidth = 2; g.shadowColor = "#bfe9ff"; g.shadowBlur = 10; g.beginPath(); for (let i = 0; i <= 30; i++) { const u = i / 30; if (u > p) break; const x = w / 2 + (cx - w / 2) * u + Math.sin(u * 14) * 8 * (1 - u), y = h + (cy - h) * u; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.shadowBlur = 0;                  // the frost crawls to the plate
    for (let i = 0; i < 9; i++) {                                                                                                                                               // ICE AGE: spires rise around the plate
        const a = (i - 4) / 4, bx = cx + a * (r.w * .9 + M * .1), by = cy + r.h * (.9 + .3 * Math.abs(a)), up = fxS(.45 + i * .02, .7 + i * .02, t), H = M * (.22 + .22 * fxR(i + 3)) * up, W = M * .05 * (1 + fxR(i));
        if (up > 0) { const gr = g.createLinearGradient(0, by, 0, by - H); gr.addColorStop(0, "rgba(120,200,255,.75)"); gr.addColorStop(1, "rgba(245,253,255,.95)"); g.fillStyle = gr; g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.moveTo(bx - W, by); g.lineTo(bx + a * 8, by - H); g.lineTo(bx + W, by); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "rgba(255,255,255,.4)"; g.beginPath(); g.moveTo(bx - W * .2, by); g.lineTo(bx + a * 8, by - H); g.lineTo(bx + W * .5, by); g.fill(); }
    }
    fxShell(g, r, fxS(.7, .86, t), s, "#d8f6ff");
    if (t > .5 && t < .85) { const sl = fxSlam(Math.min(1, (t - .5) / .12)); g.save(); g.translate(w / 2, h * .5); g.scale(sl.sc, sl.sc); g.globalAlpha = sl.a * (1 - fxS(.78, .85, t)); fxText(g, "ICE AGE", 0, 0, M * .15, "#fff", "#0a3a5a", "#9fe3ff", "sans-serif"); g.restore(); }
});
UNO_FX_HOOKS.onepiece_f = unoSceneHook("onepiece_f", unoAokiji);

/* ---------- HAKU · Demonic Mirroring Ice Crystals: a dome of ice mirrors closes around you, he flickers between them, needles strike from every side ---------- */
const unoHaku = fxIce("#7fe0ff", 7000, (g, w, h, T, env) => {
    const t = T.t, s = T.s, M = Math.min(w, h), r = env.r, cx = r.x + r.w / 2, cy = r.y + r.h / 2, bgA = 1 - fxS(.84, .97, t), N = 12, mx = [], my = [];
    g.fillStyle = "rgba(2,16,30," + .85 * bgA + ")"; g.fillRect(0, 0, w, h);
    const sel = ((s * 4) | 0) % N;
    for (let i = 0; i < N; i++) {
        const an = i / N * 6.283 + .26, x = w / 2 + Math.cos(an) * w * .42, y = h / 2 + Math.sin(an) * h * .38, on = fxS(.05 + i * .02, .16 + i * .02, t); mx.push(x); my.push(y); if (on <= 0) continue;
        g.save(); g.translate(x, y); g.rotate(an + 1.57); g.scale(on, on); const W = M * .11, H = M * .2; g.globalAlpha = on * bgA; const gr = g.createLinearGradient(-W, -H, W, H); gr.addColorStop(0, "rgba(220,250,255,.9)"); gr.addColorStop(.5, "rgba(90,190,235,.45)"); gr.addColorStop(1, "rgba(200,245,255,.8)");
        g.fillStyle = gr; g.strokeStyle = i === sel && t > .2 ? "#fff" : "#9fe3ff"; g.lineWidth = i === sel ? 4 : 2; g.shadowColor = "#7fe0ff"; g.shadowBlur = i === sel ? 30 : 10; g.beginPath(); g.moveTo(0, -H); g.lineTo(W, -H * .3); g.lineTo(W * .8, H); g.lineTo(-W * .8, H); g.lineTo(-W, -H * .3); g.closePath(); g.fill(); g.stroke(); g.shadowBlur = 0;
        if (t > .2 && (i === sel || i === (sel + 5) % N)) { g.fillStyle = "#0a2a40"; g.beginPath(); g.arc(0, -H * .1, W * .28, 0, 6.283); g.fill(); g.fillStyle = "#f4fbff"; g.beginPath(); g.ellipse(0, -H * .1, W * .22, W * .26, 0, 0, 6.283); g.fill(); g.fillStyle = "#0a2a40"; g.fillRect(-W * .14, -H * .14, W * .1, 3); g.fillRect(W * .04, -H * .14, W * .1, 3); g.fillRect(-W * .12, H * .12, W * .24, W * .5); }   // Haku's masked reflection, in a different mirror each moment
        g.restore();
    }
    for (let v = 0; v < 4; v++) for (let k = 0; k < 8; k++) {                                                                                                                      // needles from every mirror
        const st = .42 + v * .1 + k * .008, q = fxS(st, st + .07, t), src = (v * 3 + k * 5) % N; if (q <= 0) continue; const tx = cx + (fxR(v * 9 + k) - .5) * r.w * .8, ty = cy + (fxR(v * 9 + k + 3) - .5) * r.h * .7, x = mx[src] + (tx - mx[src]) * q, y = my[src] + (ty - my[src]) * q, an = Math.atan2(ty - my[src], tx - mx[src]);
        g.save(); g.translate(x, y); g.rotate(an); g.globalAlpha = bgA; g.strokeStyle = "#e9fbff"; g.lineWidth = 2.5; g.shadowColor = "#7fe0ff"; g.shadowBlur = 10; g.beginPath(); g.moveTo(-M * .05, 0); g.lineTo(M * .02, 0); g.stroke(); g.restore();
    }
    fxShell(g, r, fxS(.74, .88, t), s, "#7fe0ff");
});
UNO_FX_HOOKS.naruto_f = unoSceneHook("naruto_f", unoHaku);

/* ---------- URAUME · Frost Calm: precise and graceful. A six-fold snowflake grows, then crystal lines snap into a lattice cage around the plate, one after another ---------- */
function fxFlake(g, x, y, R, p, rot) {
    g.save(); g.translate(x, y); g.rotate(rot); g.lineCap = "round";
    for (let k = 0; k < 6; k++) { g.save(); g.rotate(k * 1.0472); const L = R * p; g.beginPath(); g.moveTo(0, 0); g.lineTo(L, 0); g.stroke(); for (let b = 1; b <= 3; b++) { const bx = L * b * .28, bl = R * .3 * (1 - b * .15) * p; g.beginPath(); g.moveTo(bx, 0); g.lineTo(bx + bl * .8, -bl); g.moveTo(bx, 0); g.lineTo(bx + bl * .8, bl); g.stroke(); } g.restore(); } g.restore();
}
const unoUraume = fxIce("#d9ccff", 7000, (g, w, h, T, env) => {
    const t = T.t, s = T.s, M = Math.min(w, h), r = env.r, bgA = 1 - fxS(.84, .97, t), L = "#e6dcff";
    g.fillStyle = "rgba(12,12,34," + .84 * bgA + ")"; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(230,215,255,.5)"; for (let i = 0; i < 50; i++) g.fillRect(fxR(i) * w, (fxR(i + 5) * h + s * 12 * (.3 + fxR(i))) % h, 2, 2);
    const hd = fxS(0, .22, t) * (1 - fxS(.4, .55, t)); if (hd > 0) { g.save(); g.globalAlpha = hd; g.strokeStyle = L; g.lineWidth = 2.5; g.shadowColor = "#c9b8ff"; g.shadowBlur = 16; [-1, 1].forEach(sd => { g.beginPath(); g.moveTo(w / 2 + sd * M * .16, h); g.quadraticCurveTo(w / 2 + sd * M * .26, h * .86, w / 2 + sd * M * .1, h * .76); g.stroke(); for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(w / 2 + sd * (M * .1 + k * M * .02), h * .76); g.lineTo(w / 2 + sd * (M * .1 + k * M * .02), h * (.7 - k * .01)); g.stroke(); } }); g.restore(); }                // two calm hands, fingers together
    const fp = fxS(.12, .5, t); g.strokeStyle = "rgba(235,225,255," + .95 * bgA + ")"; g.lineWidth = 2.5; g.shadowColor = "#c9b8ff"; g.shadowBlur = 18; fxFlake(g, w / 2, h * .46, M * .3, fp, s * .12); g.shadowBlur = 0;
    const n = Math.floor(fxS(.5, .82, t) * 12); g.strokeStyle = "rgba(225,215,255," + .9 * bgA + ")"; g.lineWidth = 2.2; g.shadowColor = "#c9b8ff"; g.shadowBlur = 12;                                  // the lattice cage clicks in, line by line, from the outside in
    for (let i = 0; i < n; i++) { const k = i % 6, d = (i / 6 | 0) ? 1 : 0, ox = r.x - 12 - (5 - k) * 8 * (1 - d), oy = r.y - 12 - (5 - k) * 8 * (1 - d); g.beginPath(); if (d) { const x = r.x - 12 + (r.w + 24) * (k + .5) / 6; g.moveTo(x, r.y - 12); g.lineTo(x, r.y + r.h + 12); } else { const y = r.y - 12 + (r.h + 24) * (k + .5) / 6; g.moveTo(r.x - 12, y); g.lineTo(r.x + r.w + 12, y); } g.stroke(); }
    g.shadowBlur = 0; fxShell(g, r, fxS(.8, .92, t), s, "#e6dcff");
    g.globalAlpha = fxS(.2, .35, t) * (1 - fxS(.7, .8, t)); fxText(g, "氷結  FROST CALM", w / 2, h * .9, M * .05, "#fff", "#2a1f5a", "#c9b8ff", "sans-serif"); g.globalAlpha = 1;
});
UNO_FX_HOOKS.jjk_f = unoSceneHook("jjk_f", unoUraume);

/* ---------- DOMA · Freezing Clouds / Frozen Lotus: two golden fans, pink-white freezing mist, a grin in the clouds, ice lotuses bloom on the plate ---------- */
function fxLotusIce(g, x, y, R, p, rot) {
    g.save(); g.translate(x, y); g.rotate(rot); for (let ly = 2; ly >= 0; ly--) for (let k = 0; k < 8; k++) { g.save(); g.rotate(k * .785 + ly * .39); const L = R * p * (.55 + ly * .22); const gr = g.createLinearGradient(0, 0, L, 0); gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(1, ["rgba(255,170,215,.85)", "rgba(190,230,255,.8)", "rgba(230,255,255,.75)"][ly]); g.fillStyle = gr; g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 1; g.beginPath(); g.ellipse(L * .55, 0, L * .5, L * .17, 0, 0, 6.283); g.fill(); g.stroke(); g.restore(); } g.restore();
}
const unoDoma = fxIce("#ff9ad0", 7000, (g, w, h, T, env) => {
    const t = T.t, s = T.s, M = Math.min(w, h), r = env.r, cx = r.x + r.w / 2, cy = r.y + r.h / 2, bgA = 1 - fxS(.84, .97, t);
    g.fillStyle = "rgba(24,10,30," + .84 * bgA + ")"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) { const x = ((fxR(i + 2) * w * 1.4 + s * 24 * (.5 + fxR(i))) % (w * 1.4)) - w * .2, y = h * (.2 + .6 * fxR(i + 8)), n = g.createRadialGradient(x, y, 0, x, y, M * .5); n.addColorStop(0, i % 2 ? "rgba(255,190,225,.2)" : "rgba(190,235,255,.2)"); n.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = n; g.fillRect(0, 0, w, h); }   // freezing clouds
    g.globalAlpha = fxS(.15, .35, t) * (1 - fxS(.55, .72, t)) * .22 * bgA; g.strokeStyle = "#ffe6f4"; g.lineWidth = M * .02; g.lineCap = "round"; g.beginPath(); g.arc(w / 2, h * .36, M * .3, .25, 2.9); g.stroke(); g.globalAlpha = 1;                    // a grin hanging in the mist
    const fan = fxS(0, .2, t) * (1 - fxS(.5, .62, t)); if (fan > 0) [-1, 1].forEach(sd => { g.save(); g.translate(w / 2 + sd * M * .3, h * 1.02); g.rotate(sd * (-.5 + .5 * Math.sin(s * 5))); g.globalAlpha = fan; for (let k = -4; k <= 4; k++) { g.strokeStyle = "#f2c94c"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(k * .22) * M * .34, -Math.cos(k * .22) * M * .34); g.stroke(); } g.fillStyle = "rgba(242,201,76,.4)"; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, M * .34, -1.57 - .88, -1.57 + .88); g.closePath(); g.fill(); g.restore(); });   // two golden fans
    for (let i = 0; i < 70; i++) { const u = ((s * .35 + fxR(i)) % 1), sx = w / 2 + (fxR(i + 4) < .5 ? -1 : 1) * M * .3, x = sx + (cx - sx) * u + Math.sin(u * 9 + i) * 30, y = h + (cy - h) * u; g.fillStyle = (i % 2 ? "rgba(255,200,230," : "rgba(200,240,255,") + (.9 * (1 - u) * fxS(.1, .3, t) * bgA) + ")"; g.fillRect(x, y, 3, 3); }   // the cold breath is blown at them
    const lp = fxS(.4, .68, t) * bgA; if (lp > 0) { fxLotusIce(g, cx, cy, M * .22, lp, s * .1); [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([a, b], i) => fxLotusIce(g, cx + a * (r.w * .6), cy + b * r.h * .9, M * .1, fxS(.5 + i * .03, .72 + i * .03, t) * bgA, i)); }
    for (let i = 0; i < 5; i++) { const up = fxS(.6 + i * .03, .8 + i * .03, t) * bgA, bx = cx + (i - 2) * M * .16, H = M * (.2 + .1 * fxR(i)) * up; if (up > 0) { g.fillStyle = "rgba(200,235,255,.7)"; g.strokeStyle = "#ffe6f4"; g.lineWidth = 2; g.fillRect(bx - M * .012, cy + r.h - H * .2, M * .024, H * .5); g.strokeRect(bx - M * .012, cy + r.h - H * .2, M * .024, H * .5); fxLotusIce(g, bx, cy + r.h - H * .2, M * .05, up, 0); } }                   // the hanging garden
    fxShell(g, r, fxS(.76, .9, t), s, "#ffc8e6");
});
UNO_FX_HOOKS.demonslayer_f = unoSceneHook("demonslayer_f", unoDoma);

/* ---------- HITSUGAYA · Hyorinmaru: the sword rises, an ice dragon coils across the screen and the plate, ice flowers bloom on it (Hyoten Hyakkaso) ---------- */
function fxFlower(g, x, y, R, p, rot) {
    g.save(); g.translate(x, y); g.rotate(rot); for (let k = 0; k < 6; k++) { g.save(); g.rotate(k * 1.0472); const L = R * p, gr = g.createLinearGradient(0, 0, L, 0); gr.addColorStop(0, "rgba(255,255,255,.95)"); gr.addColorStop(1, "rgba(70,150,255,.7)"); g.fillStyle = gr; g.strokeStyle = "#e9f6ff"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * .5, -L * .32, L, 0); g.quadraticCurveTo(L * .5, L * .32, 0, 0); g.fill(); g.stroke(); g.restore(); } g.restore();
}
const unoHitsugaya = fxIce("#5aa9ff", 7000, (g, w, h, T, env) => {
    const t = T.t, s = T.s, M = Math.min(w, h), r = env.r, cx = r.x + r.w / 2, cy = r.y + r.h / 2, bgA = 1 - fxS(.84, .97, t), B = "#5aa9ff";
    g.fillStyle = "rgba(2,8,28," + .86 * bgA + ")"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(150,200,255,.2)"; g.lineWidth = 2; for (let i = 0; i < 14; i++) { const y = h * (.1 + .07 * i) + 10 * Math.sin(s * 2 + i); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 40 * Math.sin(s + i)); g.stroke(); }
    const sw = fxS(.05, .3, t), hx = w * .8, hy = h * .95, ex = hx - (hx - w * .25) * sw, ey = hy - (hy - h * .12) * sw;                                                     // the first-person blade rises
    g.save(); g.strokeStyle = "#e9f6ff"; g.fillStyle = "#04060c"; g.lineWidth = 3; g.shadowColor = B; g.shadowBlur = 20; g.beginPath(); g.moveTo(hx, hy); g.lineTo(ex - 8, ey); g.lineTo(ex + 8, ey + 4); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.ellipse(hx + 6, hy + 6, M * .07, M * .09, 0, 0, 6.283); g.fill(); g.stroke(); g.restore();
    if (t > .1 && t < .4) { g.globalAlpha = fxS(.1, .16, t) * (1 - fxS(.32, .4, t)); fxText(g, "氷輪丸", w * .5, h * .78, M * .1, "#fff", "#06204a", B); g.globalAlpha = 1; }
    const dp = fxS(.3, .7, t), segs = 34; if (dp > 0) for (let i = segs; i >= 0; i--) {                                                                                  // the ice dragon: crystal segments coiling from the blade to the plate
        const u = Math.min(1, dp) * (1 - i / segs); if (u <= 0) continue; const sp = u * 6.283 * 1.7, rad = (1 - u) * M * .5 + M * .06 * (1 - u * .4), x = (1 - u) * ex + u * cx + Math.cos(sp) * rad * u + Math.sin(u * 9 + s) * 18, y = (1 - u) * ey + u * cy + Math.sin(sp) * rad * u * .6, sz = M * (.012 + .03 * Math.sin(Math.min(1, (segs - i) / segs) * 3.14));
        g.fillStyle = i === 0 ? "#fff" : "rgba(170,225,255,.9)"; g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.shadowColor = B; g.shadowBlur = 14; g.beginPath(); g.moveTo(x, y - sz * 1.4); g.lineTo(x + sz, y); g.lineTo(x, y + sz * 1.4); g.lineTo(x - sz, y); g.closePath(); g.fill(); g.stroke(); g.shadowBlur = 0;
        if (i === 0) { g.fillStyle = "#06204a"; g.beginPath(); g.arc(x, y - 2, 4, 0, 6.283); g.fill(); }
    }
    const fl = fxS(.62, .84, t) * bgA; if (fl > 0) { fxFlower(g, cx, cy, M * .2, fl, s * .2); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b], i) => fxFlower(g, cx + a * r.w * .55, cy + b * r.h * .8, M * .09, fxS(.68 + i * .03, .86 + i * .03, t) * bgA, i)); g.fillStyle = "rgba(255,255,255,.8)"; for (let i = 0; i < 24; i++) g.fillRect(cx + (fxR(i + ((s * 8) | 0)) - .5) * M * .5, cy + (fxR(i + 9 + ((s * 8) | 0)) - .5) * M * .35, 3, 3); }   // Hyoten Hyakkaso
    fxShell(g, r, fxS(.78, .9, t), s, B);
});
UNO_FX_HOOKS.bleach_f = unoSceneHook("bleach_f", unoHitsugaya);

/* =====================================================================
   TIME + FREEZE GROUP:  Hit (dragonball_f) · Julius (blackclover_f) · Kurapika (hxh_f)     ~8.6 s, silent
   ===================================================================== */
function fxFrz(col, ms, endFn, draw) { return { col: col, ms: ms, tail: () => 1600, begin: fxFrzBegin, draw(g, w, h, T, env, u) { if (T.ph === "tail") { endFn(g, env.r, 1 - fxS(.3, 1, T.tt), T.s); return; } draw(g, w, h, T, env, u); } }; }
function fxCage(g, r, a) {            // Time Cage: purple bars of skipped time
    if (a <= 0) return; g.save(); g.globalAlpha = a; g.strokeStyle = "#b388ff"; g.lineWidth = 3; g.shadowColor = "#b388ff"; g.shadowBlur = 20; const x0 = r.x - 12, y0 = r.y - 12, W = r.w + 24, H = r.h + 24;
    g.fillStyle = "rgba(120,60,200,.18)"; g.fillRect(x0, y0, W, H); for (let i = 0; i <= 9; i++) { const x = x0 + W * i / 9; g.beginPath(); g.moveTo(x, y0 - 8); g.lineTo(x, y0 + H + 8); g.stroke(); } g.strokeRect(x0 - 6, y0 - 8, W + 12, 6); g.strokeRect(x0 - 6, y0 + H + 2, W + 12, 6); g.restore();
}
function fxStasis(g, r, a) {          // Chrono Stasis: the plate drained of colour inside a stopped gold clock
    if (a <= 0) return; g.save(); g.globalAlpha = a; g.fillStyle = "rgba(150,150,160,.3)"; g.fillRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12); const cx = r.x + r.w / 2, cy = r.y + r.h / 2, R = Math.hypot(r.w, r.h) * .62;
    g.strokeStyle = "#ffe27a"; g.lineWidth = 2.5; g.shadowColor = "#ffe27a"; g.shadowBlur = 18; g.beginPath(); g.arc(cx, cy, R, 0, 6.283); g.stroke(); for (let i = 0; i < 12; i++) { const an = i / 12 * 6.283; g.beginPath(); g.moveTo(cx + Math.cos(an) * R * .9, cy + Math.sin(an) * R * .9); g.lineTo(cx + Math.cos(an) * R, cy + Math.sin(an) * R); g.stroke(); }
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy - R * .7); g.stroke(); g.restore();
}
function fxBind(g, r, a) {            // Emperor Time: golden chain links wrapped round the plate
    if (a <= 0) return; g.save(); g.globalAlpha = a; const x0 = r.x - 10, y0 = r.y - 10, W = r.w + 20, H = r.h + 20, per = 2 * (W + H); g.strokeStyle = "#f2c94c"; g.lineWidth = 3; g.shadowColor = "#f2c94c"; g.shadowBlur = 14;
    for (let d = 0; d < per; d += 16) { let x, y; if (d < W) { x = x0 + d; y = y0; } else if (d < W + H) { x = x0 + W; y = y0 + d - W; } else if (d < 2 * W + H) { x = x0 + W - (d - W - H); y = y0 + H; } else { x = x0; y = y0 + H - (d - 2 * W - H); } const o = ((d / 16) | 0) % 2; g.beginPath(); g.ellipse(x, y, o ? 9 : 5, o ? 5 : 9, 0, 0, 6.283); g.stroke(); } g.restore();
}
function fxLinks(g, pt, n, p, size) {
    for (let i = 0; i < n; i++) { const u = i / n; if (u > p) break; const a = pt(u), b = pt(Math.min(1, u + .01)), an = Math.atan2(b[1] - a[1], b[0] - a[0]), o = i % 2; g.save(); g.translate(a[0], a[1]); g.rotate(an); g.beginPath(); g.ellipse(0, 0, o ? size * .55 : size, o ? size * .35 : size * .5, 0, 0, 6.283); g.stroke(); g.restore(); }
}

/* ---------- HIT · Time-Skip / Time Cage: cold and exact. Time is SKIPPED (jump cuts, torn frames, the plate appears at moments that never happened), then a cage of skipped time closes ---------- */
const unoHit = fxFrz("#b388ff", 7000, fxCage, (g, w, h, T, env) => {
    const t = T.t, s = T.s, M = Math.min(w, h), r = env.r, cx = r.x + r.w / 2, cy = r.y + r.h / 2, bgA = 1 - fxS(.84, .97, t), V = "#b388ff", st = (t * 40) | 0, SK = [.26, .34, .42, .5];
    g.fillStyle = "rgba(8,3,20," + .88 * bgA + ")"; g.fillRect(0, 0, w, h);
    const f = fxS(0, .18, t) * (1 - fxS(.3, .42, t)); if (f > 0) { g.save(); g.globalAlpha = f; g.fillStyle = "#0a0614"; g.strokeStyle = V; g.lineWidth = 3; g.shadowColor = V; g.shadowBlur = 20; fxAnimeHand(g, w / 2, h * (.86 - .1 * f), M * .0028, 0, "fist", FX_HIT); g.restore(); }   // a clenched fist, motionless
    g.strokeStyle = "rgba(179,136,255,.18)"; g.lineWidth = 1; for (let i = 0; i < 20; i++) { const y = h * i / 20; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const done = SK.filter(a => t >= a).length;
    for (let k = 0; k < done; k++) { g.globalAlpha = .45 * bgA; g.strokeStyle = V; g.lineWidth = 2; g.strokeRect(r.x + (k + 1) * 22 * (k % 2 ? -1 : 1), r.y + (k + 1) * 14, r.w, r.h); g.globalAlpha = 1; }   // the plate, at moments that were skipped
    SK.forEach(a => { const q = (t - a) / .05; if (q > 0 && q < 1) { const bw = M * .02 + q * w * .5; g.fillStyle = "rgba(225,205,255," + (1 - q) + ")"; g.fillRect(cx - bw, 0, 2 * bw, h); for (let i = 0; i < 9; i++) { g.fillStyle = "rgba(8,3,20,.9)"; g.fillRect(0, h * i / 9 + (fxR(st + i) - .5) * 40, w, h / 18); } } });                 // the skip: a slit tears open, frames are torn
    const p = fxS(.55, .72, t); if (p > 0) {                                                                                                                                       // the cage: beams from the corners, a wireframe prism around the plate
        const F = { x: r.x - 14, y: r.y - 14, w: r.w + 28, h: r.h + 28 }, Bk = { x: cx - F.w * .3, y: cy - F.h * .3, w: F.w * .6, h: F.h * .6 }; g.strokeStyle = V; g.lineWidth = 2.5; g.shadowColor = V; g.shadowBlur = 24;
        [[0, 0], [w, 0], [0, h], [w, h]].forEach(([x, y], i) => { const tx = i % 2 ? F.x + F.w : F.x, ty = i > 1 ? F.y + F.h : F.y; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (tx - x) * p, y + (ty - y) * p); g.stroke(); });
        if (p > .8) { g.strokeRect(F.x, F.y, F.w, F.h); g.strokeRect(Bk.x, Bk.y, Bk.w, Bk.h); [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => { g.beginPath(); g.moveTo(F.x + a * F.w, F.y + b * F.h); g.lineTo(Bk.x + a * Bk.w, Bk.y + b * Bk.h); g.stroke(); }); } g.shadowBlur = 0;
    }
    if (t > .7 && t < .82) { const q = (t - .7) / .12; g.fillStyle = "rgba(225,205,255," + .6 * (1 - q) + ")"; g.fillRect(0, 0, w, h); const sl = fxSlam(Math.min(1, q * 2)); g.save(); g.translate(w / 2, h * .5); g.rotate(-.05); g.scale(sl.sc, sl.sc); g.globalAlpha = sl.a * (1 - fxS(.78, .82, t)); fxText(g, "TIME CAGE", 0, 0, M * .14, "#fff", "#2a0a5a", V, "sans-serif"); g.restore(); }
    fxCage(g, r, fxS(.74, .88, t) * bgA);
});
UNO_FX_HOOKS.dragonball_f = unoSceneHook("dragonball_f", unoHit);

/* ---------- JULIUS · Chrono Stasis: a magic circle of a clock, an hourglass whose sand FREEZES mid-fall, a golden dome of stopped time closes over the plate ---------- */
const unoJulius = fxFrz("#ffe27a", 7000, fxStasis, (g, w, h, T, env) => {
    const t = T.t, s = T.s, M = Math.min(w, h), r = env.r, cx = r.x + r.w / 2, cy = r.y + r.h / 2, bgA = 1 - fxS(.84, .97, t), G = "#ffe27a", mx = w / 2, my = h * .55, on = fxS(.04, .25, t), stop = fxS(.46, .5, t), st = Math.min(s, 3.4);
    g.fillStyle = "rgba(8,10,26," + .88 * bgA + ")"; g.fillRect(0, 0, w, h);
    g.save(); g.translate(mx, my); g.globalAlpha = on * bgA; g.strokeStyle = G; g.shadowColor = G; g.shadowBlur = 16; g.lineWidth = 2;
    [.34, .27, .2].forEach((rd, i) => { g.save(); g.rotate((i % 2 ? -1 : 1) * st * (.4 - .1 * i) * (1 - stop)); g.beginPath(); g.arc(0, 0, M * rd, 0, 6.283); g.stroke(); for (let k = 0; k < 12; k++) { const an = k / 12 * 6.283; g.beginPath(); g.moveTo(Math.cos(an) * M * rd * .92, Math.sin(an) * M * rd * .92); g.lineTo(Math.cos(an) * M * rd, Math.sin(an) * M * rd); g.stroke(); if (i === 0) g.strokeRect(Math.cos(an) * M * rd * .8 - 5, Math.sin(an) * M * rd * .8 - 5, 10, 10); } g.restore(); });
    const hand = (ang, L) => { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(ang) * M * L, Math.sin(ang) * M * L); g.lineWidth = 4; g.stroke(); }; const spin = t < .5 ? st * 6 : 3.4 * 6; hand(-1.57 + spin, .26); hand(-1.57 + spin / 12, .16); g.restore();   // the clock hands race, then stop
    const hx = mx, hy = h * .2, HG = M * .08; g.save(); g.globalAlpha = on * bgA; g.strokeStyle = "#fff"; g.lineWidth = 2.5; g.shadowColor = G; g.shadowBlur = 14; g.beginPath(); g.moveTo(hx - HG, hy - HG * 1.7); g.lineTo(hx + HG, hy - HG * 1.7); g.lineTo(hx + 3, hy); g.lineTo(hx + HG, hy + HG * 1.7); g.lineTo(hx - HG, hy + HG * 1.7); g.lineTo(hx - 3, hy); g.closePath(); g.stroke();
    g.fillStyle = G; const ST = Math.min(s, 3.4); g.fillRect(hx - 1.5, hy, 3, HG * 1.6); for (let i = 0; i < 18; i++) { const u = (stop > 0 ? .4 + fxR(i) * .6 : (ST * .8 + i / 18) % 1), gy = hy + u * HG * 1.6; g.globalAlpha = on * bgA * (stop > 0 ? .6 + .4 * Math.sin(s * 3 + i) : 1); g.fillRect(hx - 5 + fxR(i + 3) * 10, gy, 2.5, 2.5); } g.restore();       // sand falls, then hangs in the air
    const dm = fxS(.5, .78, t); if (dm > 0) { const rd = M * (.1 + dm * 1.0), dx = cx, dy = cy; const gr = g.createRadialGradient(dx, dy, 0, dx, dy, rd); gr.addColorStop(0, "rgba(255,226,122,.0)"); gr.addColorStop(.85, "rgba(255,226,122,.16)"); gr.addColorStop(1, "rgba(255,255,255,.5)"); g.globalAlpha = bgA; g.fillStyle = gr; g.beginPath(); g.arc(dx, dy, rd, 0, 6.283); g.fill(); g.strokeStyle = G; g.lineWidth = 2; g.stroke(); g.globalAlpha = 1; }    // the dome of stopped time spreads over the plate
    g.fillStyle = "#ffe9a0"; for (let i = 0; i < 60; i++) { g.globalAlpha = (.3 + .5 * Math.sin(s * 2 + i)) * dm * bgA; g.fillRect(cx + (fxR(i) - .5) * M * .9, cy + (fxR(i + 5) - .5) * M * .5, 2, 2); } g.globalAlpha = 1;
    if (t > .46 && t < .74) { const sl = fxSlam(Math.min(1, (t - .46) / .12)); g.save(); g.translate(w / 2, h * .82); g.scale(.7 + .3 * sl.sc / 3.2, .7 + .3 * sl.sc / 3.2); g.globalAlpha = sl.a * (1 - fxS(.68, .74, t)); fxText(g, "CHRONO STASIS", 0, 0, M * .08, "#fff", "#4a3a00", G, "sans-serif"); g.restore(); }
    fxStasis(g, r, fxS(.74, .88, t) * bgA);
});
UNO_FX_HOOKS.blackclover_f = unoSceneHook("blackclover_f", unoJulius);

/* ---------- KURAPIKA · Emperor Time: scarlet eyes, chains fly from your fingertips, wrap and tighten on the plate, a golden seal clamps shut ---------- */
const unoKurapika = fxFrz("#f2c94c", 7000, fxBind, (g, w, h, T, env) => {
    const t = T.t, s = T.s, M = Math.min(w, h), r = env.r, cx = r.x + r.w / 2, cy = r.y + r.h / 2, bgA = 1 - fxS(.84, .97, t), Y = "#f2c94c", R = "#ff2a4a";
    g.fillStyle = "rgba(6,8,22," + .88 * bgA + ")"; g.fillRect(0, 0, w, h); const vg = g.createRadialGradient(w / 2, h / 2, M * .3, w / 2, h / 2, Math.hypot(w, h) / 2); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(120,0,20," + .5 * bgA * fxS(.1, .3, t) + ")"); g.fillStyle = vg; g.fillRect(0, 0, w, h);
    const ey = fxS(.06, .24, t) * bgA; if (ey > 0) [-1, 1].forEach(sd => { g.save(); g.translate(w / 2 + sd * M * .26, h * .13); g.rotate(sd * -.22); g.globalAlpha = ey; g.fillStyle = R; g.shadowColor = R; g.shadowBlur = 36; g.beginPath(); g.moveTo(-M * .09, 0); g.quadraticCurveTo(0, -M * .06 * ey, M * .09, 0); g.quadraticCurveTo(0, M * .05 * ey, -M * .09, 0); g.fill(); g.fillStyle = "#1a0006"; g.beginPath(); g.arc(0, 0, M * .018, 0, 6.283); g.fill(); g.restore(); });     // the scarlet eyes
    const hd = fxS(0, .16, t); g.save(); g.globalAlpha = hd * bgA; g.fillStyle = "#07080f"; g.strokeStyle = Y; g.lineWidth = 3; g.shadowColor = Y; g.shadowBlur = 12; fxAnimeHand(g, w / 2, h * .98, M * .0026, 0, "open", { sleeve: "#1a2250", cuff: "#f2c94c" }); g.restore();
    g.strokeStyle = Y; g.lineWidth = 2.5; g.shadowColor = Y; g.shadowBlur = 12;
    for (let k = 0; k < 5; k++) { const ax = w / 2 + (k - 2) * M * .045, ay = h * .72, p = fxS(.14 + k * .03, .46 + k * .03, t), tx = cx + (k - 2) * r.w * .18, ty = cy + (k % 2 ? 1 : -1) * r.h * .3, my = (ay + ty) / 2 + M * (k % 2 ? .12 : -.12), sw = Math.sin(s * 3 + k) * 10 * (1 - p);
        fxLinks(g, u => { const q = 1 - u; return [q * q * ax + 2 * q * u * ((ax + tx) / 2 + sw) + u * u * tx, q * q * ay + 2 * q * u * my + u * u * ty]; }, 34, p, M * .016); }
    const wr = fxS(.46, .72, t) * bgA; if (wr > 0) for (let l = 0; l < 3; l++) { const rd = (1 - wr * .25) * (1 + l * .22); g.save(); g.translate(cx, cy); g.rotate(l * .5 + s * .8 * (1 - wr)); g.globalAlpha = wr; fxLinks(g, u => [Math.cos(u * 6.283) * r.w * .55 * rd, Math.sin(u * 6.283) * r.h * .9 * rd], 30, 1, M * .014); g.restore(); }   // chains wrap and tighten
    g.shadowBlur = 0; if (t > .68) { const q = fxS(.68, .78, t) * bgA; g.save(); g.translate(cx, cy); g.globalAlpha = q; g.strokeStyle = Y; g.fillStyle = "rgba(242,201,76,.2)"; g.lineWidth = 4; g.shadowColor = Y; g.shadowBlur = 24; g.beginPath(); g.arc(0, 0, M * .06 * (2 - q), 0, 6.283); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-M * .04, 0); g.lineTo(M * .04, 0); g.moveTo(0, -M * .05); g.lineTo(0, M * .05); g.stroke(); g.restore(); }   // the golden seal clamps shut
    if (t > .3 && t < .66) { const sl = fxSlam(Math.min(1, (t - .3) / .12)); g.save(); g.translate(w / 2, h * .5); g.scale(.7 + .3 * sl.sc / 3.2, .7 + .3 * sl.sc / 3.2); g.globalAlpha = sl.a * (1 - fxS(.6, .66, t)); fxText(g, "EMPEROR TIME", 0, 0, M * .1, "#fff", "#5a0014", R, "sans-serif"); g.restore(); }
    fxBind(g, r, fxS(.74, .88, t) * bgA);
});
UNO_FX_HOOKS.hxh_f = unoSceneHook("hxh_f", unoKurapika);

/* =====================================================================
   ULTIMATE GROUP:  Goku · Tanjiro · Netero · Yami · Jotaro   (dragonball_u, demonslayer_u, hxh_u, blackclover_u, jojo_u)
   Each attack travels at the REAL opponent plate. After the impact, 5 card backs fly from the draw pile into that plate = "draws 5".  ~8.6 s, silent.
   ===================================================================== */
function fxUltEnd(g, env, q, col) {
    const r = env.r, a = 1 - fxS(.6, 1, q), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = 2; g.shadowColor = col; g.shadowBlur = 16;                                                  // scorch cracks on the plate
    for (let i = 0; i < 10; i++) { let x = cx, y = cy, an = fxR(i) * 6.283; g.beginPath(); g.moveTo(x, y); for (let sg = 0; sg < 4; sg++) { an += (fxR(i * 7 + sg) - .5) * 1.1; x += Math.cos(an) * r.w * .12; y += Math.sin(an) * r.h * .3; g.lineTo(x, y); } g.stroke(); } g.restore();
    const d = env.dp, c0 = { x: d.x + d.w / 2, y: d.y + d.h / 2 };
    for (let k = 0; k < 5; k++) {                                                                                                                              // five cards fly from the draw pile into the plate
        const p = fxS(k * .09, k * .09 + .42, q); if (p <= 0 || p >= 1) continue; const x = c0.x + (cx - c0.x) * p, y = c0.y + (cy - c0.y) * p - Math.sin(p * 3.14) * 50, sz = (1 - p) * d.h * .8 + p * r.h * .7;
        g.save(); g.translate(x, y); g.rotate((k - 2) * .25 * (1 - p)); const gr = g.createLinearGradient(0, -sz / 2, 0, sz / 2); gr.addColorStop(0, "#ff3b3b"); gr.addColorStop(1, "#4a0508"); g.fillStyle = gr; g.strokeStyle = "#fff"; g.lineWidth = 2.5; g.shadowColor = col; g.shadowBlur = 14; g.fillRect(-sz * .33, -sz / 2, sz * .66, sz); g.strokeRect(-sz * .33, -sz / 2, sz * .66, sz); g.restore();
    }
}
function fxUlt(col, ms, draw) {
    return { col: col, ms: ms, tail: () => 1800,
        begin(env, box, u) { fxFrzBegin(env, box, u); const e = document.getElementById("unoDraw"), r = e ? e.getBoundingClientRect() : null; env.dp = r ? { x: r.left, y: r.top, w: r.width, h: r.height } : { x: innerWidth * .08, y: innerHeight * .4, w: 90, h: 130 }; },
        draw(g, w, h, T, env, u) { if (T.ph === "tail") { fxUltEnd(g, env, T.tt, col); return; } draw(g, w, h, T, env, u); } };
}
const fxBoom = (g, x, y, M, q, col) => { if (q <= 0 || q >= 1) return; g.save(); g.fillStyle = "rgba(255,255,255," + (.7 * (1 - q)) + ")"; g.fillRect(0, 0, 4000, 4000); g.restore(); g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 30; for (let i = 0; i < 3; i++) { const k = Math.max(0, q - i * .12); g.globalAlpha = 1 - q; g.lineWidth = 16 * (1 - k); g.beginPath(); g.arc(x, y, k * M * .7, 0, 6.283); g.stroke(); } g.globalAlpha = 1; g.shadowBlur = 0; for (let i = 0; i < 24; i++) { const an = fxR(i) * 6.283, d = q * M * (.3 + .6 * fxR(i + 5)); g.fillStyle = col; g.fillRect(x + Math.cos(an) * d, y + Math.sin(an) * d, 4, 4); } };

/* ---------- GOKU · Kamehameha: your cupped hands, a ball of blue light gathering, KA-ME-HA-ME-HA, a wide beam into the plate ---------- */
const unoGoku = fxUlt("#59c8ff", 6800, (g, w, h, T, env) => {
    const t = T.t, s = T.s, M = Math.min(w, h), r = env.r, tx = r.x + r.w / 2, ty = r.y + r.h / 2, B = "#59c8ff", bgA = 1 - fxS(.86, .97, t), bx = w / 2, by = h * .8, ch = fxS(.04, .42, t);
    const sk = (t > .42 && t < .62) ? 10 : 0; g.save(); g.translate((fxR((s * 60) | 0) - .5) * sk, (fxR(((s * 60) | 0) + 3) - .5) * sk);
    g.fillStyle = "rgba(4,10,34," + .88 * bgA + ")"; g.fillRect(-20, -20, w + 40, h + 40); fxStar(g, 60, w, h, s);
    for (let i = 0; i < 46; i++) { const u = 1 - ((s * 1.1 + fxR(i)) % 1), an = fxR(i + 4) * 6.283, d = M * (.1 + .8 * u) * (1 - .4 * (1 - ch)); g.fillStyle = "rgba(160,225,255," + (.8 * ch * (1 - u)) + ")"; g.fillRect(bx + Math.cos(an) * d, by + Math.sin(an) * d * .6, 3, 3); }                      // energy gathers
    [-1, 1].forEach(sd => { g.save(); g.translate(bx + sd * M * (.16 - .06 * ch), by + M * .12); g.rotate(sd * -.4); fxAnimeHand(g, 0, -M * .04, M * .0021, 0, "open", { sleeve: "#d96a1a", cuff: "#2a4fd0" }); g.restore(); });
    const rd = M * (.02 + .13 * ch) * (1 + .06 * Math.sin(s * 30)), bl = g.createRadialGradient(bx, by, 0, bx, by, rd); bl.addColorStop(0, "#fff"); bl.addColorStop(.5, "#9fe0ff"); bl.addColorStop(1, "rgba(60,160,255,0)"); g.fillStyle = bl; g.beginPath(); g.arc(bx, by, rd * 1.8, 0, 6.283); g.fill();
    [[.06, "KA"], [.14, "ME"], [.22, "HA"], [.3, "ME"], [.38, "HA!!"]].forEach(([a, tx2]) => { const q = (t - a) / .07; if (q > 0 && q < 1) { g.save(); g.translate(w / 2, h * .22); g.scale(1.6 - .6 * Math.min(1, q * 3), 1.6 - .6 * Math.min(1, q * 3)); g.globalAlpha = 1 - q * .7; fxText(g, tx2, 0, 0, M * .14, "#fff", "#0a3a7a", B, "sans-serif"); g.restore(); } });
    const bt = fxS(.42, .58, t); if (bt > 0 && t < .86) { const hx = bx + (tx - bx) * bt, hy = by + (ty - by) * bt, ang = Math.atan2(ty - by, tx - bx), L = Math.hypot(hx - bx, hy - by), Wd = M * (.1 + .02 * Math.sin(s * 40)); g.save(); g.translate(bx, by); g.rotate(ang);
        const gr = g.createLinearGradient(0, -Wd, 0, Wd); gr.addColorStop(0, "rgba(60,160,255,0)"); gr.addColorStop(.35, "rgba(120,210,255,.9)"); gr.addColorStop(.5, "#fff"); gr.addColorStop(.65, "rgba(120,210,255,.9)"); gr.addColorStop(1, "rgba(60,160,255,0)"); g.fillStyle = gr; g.shadowColor = B; g.shadowBlur = 40; g.fillRect(0, -Wd, L, Wd * 2); g.beginPath(); g.arc(L, 0, Wd, 0, 6.283); g.fill(); g.restore(); }
    fxBoom(g, tx, ty, M, (t - .58) / .3, B); g.restore();
});
UNO_FX_HOOKS.dragonball_u = unoSceneHook("dragonball_u", unoGoku);

/* ---------- TANJIRO · Hinokami Kagura: three fire slashes, then the Sun Halo Dragon Head Dance swallows the plate ---------- */
const unoTanjiro = fxUlt("#ff6a2a", 6800, (g, w, h, T, env) => {
    const t = T.t, s = T.s, M = Math.min(w, h), r = env.r, tx = r.x + r.w / 2, ty = r.y + r.h / 2, F = "#ff6a2a", bgA = 1 - fxS(.86, .97, t);
    g.fillStyle = "rgba(18,2,4," + .88 * bgA + ")"; g.fillRect(0, 0, w, h); for (let i = 0; i < 50; i++) { const u = ((s * .3 * (.4 + fxR(i)) + fxR(i + 3)) % 1); g.fillStyle = "rgba(255,150,60," + .6 * (1 - u) + ")"; g.fillRect(fxR(i + 8) * w + 14 * Math.sin(s * 2 + i), h * (1 - u), 3, 3); }
    const sw = fxS(0, .16, t); g.save(); g.translate(w * .8 - sw * w * .1, h * 1.05 - sw * h * .25); g.rotate(-.9); g.fillStyle = "#050204"; g.strokeStyle = "#ff3b2a"; g.lineWidth = 3; g.shadowColor = F; g.shadowBlur = 18; g.fillRect(-M * .018, -M * .7, M * .036, M * .7); g.strokeRect(-M * .018, -M * .7, M * .036, M * .7); g.fillRect(-M * .06, 0, M * .12, 10); g.restore();   // the black nichirin blade
    [[.18, 0], [.3, 1], [.42, 2]].forEach(([a, k]) => { const q = (t - a) / .14; if (q > 0 && q < 1) { const sx = k === 1 ? w : 0, sy = h * (.9 - k * .4), ex = tx + (k - 1) * M * .15, ey = ty + (k % 2 ? 1 : -1) * M * .06, e = fxS(0, .5, q), cx2 = (sx + ex) / 2, cy2 = (sy + ey) / 2 - M * .3;
        g.save(); g.globalAlpha = 1 - fxS(.5, 1, q); g.strokeStyle = "#fff0c0"; g.shadowColor = F; g.shadowBlur = 30; for (let l = 0; l < 3; l++) { g.lineWidth = [26, 14, 4][l]; g.strokeStyle = ["rgba(255,80,20,.6)", "rgba(255,170,60,.9)", "#fff"][l]; g.beginPath(); for (let i = 0; i <= 24; i++) { const u = i / 24 * e, qq = 1 - u; const x = qq * qq * sx + 2 * qq * u * cx2 + u * u * ex, y = qq * qq * sy + 2 * qq * u * cy2 + u * u * ey; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } g.restore(); } });                    // three fiery crescents
    if (t > .1 && t < .3) { g.globalAlpha = fxS(.1, .16, t) * (1 - fxS(.24, .3, t)); fxText(g, "ヒノカミ神楽", w / 2, h * .12, M * .08, "#fff", "#5a0a00", F); g.globalAlpha = 1; }
    const hl = fxS(.5, .72, t); if (hl > 0 && t < .88) { g.save(); g.translate(tx, ty); g.rotate(s * .6); g.strokeStyle = F; g.shadowColor = F; g.shadowBlur = 40; g.lineWidth = 12; const R = M * (.6 - .38 * hl); g.beginPath(); g.arc(0, 0, R, 0, 6.283); g.stroke(); for (let i = 0; i < 28; i++) { const an = i / 28 * 6.283; g.beginPath(); g.moveTo(Math.cos(an) * R, Math.sin(an) * R); g.lineTo(Math.cos(an) * (R + M * .07 * (1 + Math.sin(s * 9 + i))), Math.sin(an) * (R + M * .07 * (1 + Math.sin(s * 9 + i)))); g.lineWidth = 5; g.stroke(); } g.restore();
        const hx = w * (1.1 - 1.2 * hl), hy = ty + Math.sin(hl * 6) * M * .1; g.fillStyle = "rgba(255,120,30,.9)"; g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.moveTo(hx, hy - M * .12); g.quadraticCurveTo(hx + M * .3, hy, hx, hy + M * .12); g.quadraticCurveTo(hx + M * .08, hy, hx, hy - M * .12); g.fill(); g.stroke(); }                           // the sun halo and the dragon-head slash
    fxBoom(g, tx, ty, M, (t - .7) / .2, F);
    if (t > .5 && t < .78) { g.save(); g.translate(w / 2, h * .55); g.globalAlpha = fxS(.5, .56, t) * (1 - fxS(.72, .78, t)); fxText(g, "日輪", 0, 0, M * .2, "#fff", "#5a0a00", F); g.restore(); }
});
UNO_FX_HOOKS.demonslayer_u = unoSceneHook("demonslayer_u", unoTanjiro);

/* ---------- NETERO · 100-Type Guanyin Bodhisattva + Zero Hand: a prayer, a golden Buddha with a hundred hands, a flood of fists, then ONE palm ---------- */
const unoNetero = fxUlt("#ffd24a", 6800, (g, w, h, T, env) => {
    const t = T.t, s = T.s, M = Math.min(w, h), r = env.r, tx = r.x + r.w / 2, ty = r.y + r.h / 2, Y = "#ffd24a", bgA = 1 - fxS(.88, .98, t), cx = w / 2, cy = h * .5;
    g.fillStyle = "rgba(10,6,0," + .9 * bgA + ")"; g.fillRect(0, 0, w, h);
    const st = fxS(.14, .4, t) * bgA, bs = (t > .4 && t < .7) ? (fxR((s * 50) | 0) - .5) * 8 : 0; g.save(); g.translate(bs, bs * .6);
    if (st > 0) { g.save(); g.translate(cx, cy); g.globalAlpha = st; g.rotate(s * .08); for (let i = 0; i < 40; i++) { g.strokeStyle = "rgba(255,210,74,.35)"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(i / 40 * 6.283) * M, Math.sin(i / 40 * 6.283) * M); g.stroke(); } g.restore();
        g.save(); g.translate(cx, cy); g.globalAlpha = st; g.strokeStyle = Y; g.lineWidth = 4; g.shadowColor = Y; g.shadowBlur = 30; g.beginPath(); g.arc(0, -M * .08, M * .3 * st, 0, 6.283); g.stroke(); g.fillStyle = "#1a1004"; g.beginPath(); g.moveTo(-M * .2, M * .5); g.quadraticCurveTo(-M * .16, -M * .1, 0, -M * .2); g.quadraticCurveTo(M * .16, -M * .1, M * .2, M * .5); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.arc(0, -M * .24, M * .06, 0, 6.283); g.fill(); g.stroke();
        for (let i = 0; i < 20; i++) { const an = -3.14 + i / 19 * 3.14 + (i < 10 ? .0 : .0), L = M * (.36 + .04 * Math.sin(s * 4 + i)) * st; g.beginPath(); g.moveTo(0, -M * .05); g.lineTo(Math.cos(an) * L, -M * .05 + Math.sin(an) * L * .8); g.lineWidth = 3; g.stroke(); g.fillStyle = Y; g.beginPath(); g.arc(Math.cos(an) * L, -M * .05 + Math.sin(an) * L * .8, M * .02, 0, 6.283); g.fill(); } g.restore(); }                           // a golden Bodhisattva with a hundred hands
    const pr = fxS(0, .14, t) * (1 - fxS(.3, .42, t)); if (pr > 0) { g.save(); g.globalAlpha = pr; g.fillStyle = "#120a02"; g.strokeStyle = Y; g.lineWidth = 3; g.shadowColor = Y; g.shadowBlur = 16; [-1, 1].forEach(sd => { g.beginPath(); g.moveTo(cx, h * .98); g.lineTo(cx + sd * M * .07, h * .98); g.lineTo(cx + sd * M * .02, h * .76); g.closePath(); g.fill(); g.stroke(); }); g.restore(); }       // palms together, praying
    for (let i = 0; i < 40; i++) { const st0 = .4 + i * .007, q = fxS(st0, st0 + .08, t) * (t < .72 ? 1 : 0); if (q <= 0 || q >= 1) continue; const a0 = -3.14 + (i % 20) / 19 * 3.14, x0 = cx + Math.cos(a0) * M * .3, y0 = cy - M * .05 + Math.sin(a0) * M * .24, x = x0 + (tx - x0) * q, y = y0 + (ty - y0) * q;
        g.strokeStyle = "rgba(255,210,74,.6)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x0 + (tx - x0) * Math.max(0, q - .25), y0 + (ty - y0) * Math.max(0, q - .25)); g.lineTo(x, y); g.stroke(); fxAnimeHand(g, x, y, M * .0008 * (1 + q), Math.atan2(ty - y0, tx - x0) + 1.5708, "fist", FX_GLD); if (q > .92) { g.fillStyle = "rgba(255,255,255,.8)"; g.fillRect(tx + (fxR(i) - .5) * r.w, ty + (fxR(i + 3) - .5) * r.h, 8, 8); } }   // the barrage of golden fists
    g.restore();
    if (t > .72 && t < .9) { const q = (t - .72) / .18, sc = .3 + 1.2 * fxS(0, .5, q); g.save(); g.translate(cx, cy); g.scale(sc, sc); g.globalAlpha = 1 - fxS(.55, 1, q); g.shadowColor = Y; g.shadowBlur = 50; fxAnimeHand(g, 0, M * .1, M * .0046, 0, "open", FX_GLD); g.restore(); fxText(g, "ZERO HAND", cx, h * .12, M * .08, "#fff", "#5a3a00", Y, "sans-serif"); }     // ONE open palm
    fxBoom(g, tx, ty, M, (t - .78) / .12, Y);
});
UNO_FX_HOOKS.hxh_u = unoSceneHook("hxh_u", unoNetero);

/* ---------- YAMI · Dark Cloaked Dimension Slash: a katana opens real rifts in the screen, black fog pours out, and the last cut X's the plate out of the world ---------- */
const unoYami = fxUlt("#a06bff", 6800, (g, w, h, T, env) => {
    const t = T.t, s = T.s, M = Math.min(w, h), r = env.r, tx = r.x + r.w / 2, ty = r.y + r.h / 2, V = "#a06bff", bgA = 1 - fxS(.86, .97, t);
    g.fillStyle = "rgba(6,2,14," + .9 * bgA + ")"; g.fillRect(0, 0, w, h); for (let i = 0; i < 7; i++) { const x = ((fxR(i + 2) * w * 1.4 + s * 20 * (.5 + fxR(i))) % (w * 1.4)) - w * .2, y = h * (.2 + .6 * fxR(i + 8)), n = g.createRadialGradient(x, y, 0, x, y, M * .5); n.addColorStop(0, "rgba(40,10,70,.35)"); n.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = n; g.fillRect(0, 0, w, h); }
    const sw = fxS(0, .14, t); g.save(); g.translate(w * .74, h * 1.04 - sw * h * .2); g.rotate(-.7); g.fillStyle = "#020104"; g.strokeStyle = V; g.lineWidth = 3; g.shadowColor = V; g.shadowBlur = 18; g.fillRect(-M * .016, -M * .75, M * .032, M * .75); g.strokeRect(-M * .016, -M * .75, M * .032, M * .75); g.restore();
    const rift = (x0, y0, x1, y1, q, wd) => { const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, e = fxS(0, .3, q), o = fxS(.1, .7, q) * wd; g.save(); g.shadowColor = V; g.shadowBlur = 26; g.fillStyle = "#000"; g.strokeStyle = V; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + dx * e + nx * o, y0 + dy * e + ny * o); g.lineTo(x0 + dx * e - nx * o, y0 + dy * e - ny * o); g.closePath(); g.fill(); g.stroke(); g.strokeStyle = "rgba(255,255,255," + (1 - e) + ")"; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + dx * e, y0 + dy * e); g.stroke(); g.restore(); };
    [[.16, 0, h * .85, tx + M * .2, ty], [.28, w, h * .15, tx - M * .2, ty], [.4, 0, h * .15, tx + M * .1, ty + M * .1]].forEach(([a, x0, y0, x1, y1]) => { const q = (t - a) / .3; if (q > 0) rift(x0, y0, x0 + (x1 - x0) * 1.5, y0 + (y1 - y0) * 1.5, Math.min(1.2, q), M * .05 * (1 - fxS(.8, 1, t))); });    // three dimension cuts across the screen
    const fq = (t - .56) / .3; if (fq > 0) { rift(tx - M * .35, ty - M * .22, tx + M * .35, ty + M * .22, Math.min(1, fq * 1.4), M * .09); rift(tx + M * .35, ty - M * .22, tx - M * .35, ty + M * .22, Math.min(1, fq * 1.4), M * .09); }                       // the final X
    if (t > .1 && t < .5) { g.globalAlpha = fxS(.1, .16, t) * (1 - fxS(.44, .5, t)); fxText(g, "暗黒次元斬", w / 2, h * .12, M * .08, "#fff", "#2a0a5a", V); g.globalAlpha = 1; }
    for (let i = 0; i < 30; i++) { const u = ((s * .5 + fxR(i)) % 1); g.fillStyle = "rgba(160,107,255," + .5 * (1 - u) * fxS(.5, .7, t) + ")"; g.fillRect(tx + (fxR(i + 3) - .5) * M * .8, ty + (fxR(i + 7) - .5) * M * .5 - u * 40, 3, 3); }
    fxBoom(g, tx, ty, M, (t - .72) / .16, V);
});
UNO_FX_HOOKS.blackclover_u = unoSceneHook("blackclover_u", unoYami);

/* ---------- JOTARO · Star Platinum, ORA ORA ORA: a hail of purple fists, ORA lettering everywhere, then one gigantic punch through the screen ---------- */
const unoJotaro = fxUlt("#b388ff", 6800, (g, w, h, T, env) => {
    const t = T.t, s = T.s, M = Math.min(w, h), r = env.r, tx = r.x + r.w / 2, ty = r.y + r.h / 2, P = "#b388ff", bgA = 1 - fxS(.86, .97, t), cx = w / 2, cy = h / 2, R = Math.hypot(w, h) / 2;
    g.fillStyle = "rgba(34,12,74," + .94 * bgA + ")"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(255,255,255,.07)"; for (let yy = 0; yy < h; yy += 20) for (let xx = (yy / 20 % 2) * 10; xx < w; xx += 20) { g.beginPath(); g.arc(xx, yy, 2.6, 0, 6.283); g.fill(); }
    g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 2; for (let i = 0; i < 40; i++) { const an = fxR(i) * 6.283; g.beginPath(); g.moveTo(tx + Math.cos(an) * M * .1, ty + Math.sin(an) * M * .1); g.lineTo(tx + Math.cos(an) * R, ty + Math.sin(an) * R); g.stroke(); }
    if (t < .2) { g.globalAlpha = fxS(0, .06, t) * (1 - fxS(.14, .2, t)); for (let i = 0; i < 6; i++) fxText(g, "ゴ", w * (.1 + i * .16), h * (.2 + (i % 2) * .5), M * .16, "rgba(255,255,255,.25)", "#000", P); g.globalAlpha = 1; }
    const br = fxS(.12, .7, t); const n = Math.floor(br * 34);
    for (let i = Math.max(0, n - 12); i < n; i++) { const side = i % 2 ? -1 : 1, q = ((br * 34 - i) / 1.6), x0 = cx + side * w * .28, y0 = h * 1.05, k = Math.min(1, q), x = x0 + (tx + (fxR(i) - .5) * r.w * .6 - x0) * k, y = y0 + (ty - y0) * k, sz = M * (.14 - .09 * k);
        g.globalAlpha = 1 - Math.max(0, q - 1) * .8; g.strokeStyle = "rgba(190,150,255,.5)"; g.lineWidth = sz * .5; g.beginPath(); g.moveTo(x0 + (x - x0) * Math.max(0, k - .3), y0 + (y - y0) * Math.max(0, k - .3)); g.lineTo(x, y); g.stroke();
        fxAnimeHand(g, x, y, sz * .022, Math.atan2(ty - y0, tx - x0) + 1.5708, "fist", FX_SPO); g.globalAlpha = 1; }                              // Star Platinum's fists
    for (let i = 0; i < 8; i++) { const a = .16 + i * .06, q = (t - a) / .1; if (q > 0 && q < 1) { g.save(); g.translate(w * (.15 + fxR(i + 4) * .7), h * (.15 + fxR(i + 9) * .6)); g.rotate((fxR(i) - .5) * .5); g.globalAlpha = 1 - q; g.scale(1 + q * .3, 1 + q * .3); fxText(g, "ORA!", 0, 0, M * (.06 + .07 * fxR(i + 2)), "#fff", "#000", P, "sans-serif"); g.restore(); } }
    if (t > .72 && t < .9) { const q = (t - .72) / .18, sc = .2 + 2.2 * fxS(0, .5, q); g.save(); g.translate(cx, cy); g.scale(sc, sc); g.globalAlpha = 1 - fxS(.6, 1, q); fxAnimeHand(g, 0, -M * .06, M * .0075, 0, "fist", FX_SPO); g.restore();
        g.save(); g.translate(cx, cy * .5); g.rotate(-.06); const sl = fxSlam(Math.min(1, q * 2)); g.scale(sl.sc, sl.sc); fxText(g, "ORAAAA!!", 0, 0, M * .16, "#fff", "#000", P, "sans-serif"); g.restore(); }
    fxBoom(g, tx, ty, M, (t - .8) / .1, P);
});
UNO_FX_HOOKS.jojo_u = unoSceneHook("jojo_u", unoJotaro);














const unoSpCache = {};
const UNO_SP_KANJI = { f: "凍", t: "換", u: "極", e: "眼" };
function unoSpArt(pic, c) {
    const base = UNO_SP_DIR + c.sk + "_" + UNO_SP[c.k].file;
    const ph = () => { pic.classList.add("sp-ph"); pic.innerHTML = ""; pic.appendChild(hbEl("i", "sp-kj", UNO_SP_KANJI[c.k] || "")); pic.appendChild(hbEl("b", null, UNO_SP[c.k].emoji)); pic.appendChild(hbEl("small", null, UNO_SP[c.k].label)); };
    if (unoSpCache[base] === "") return ph();
    if (unoSpCache[base]) { const im = new Image(); im.alt = ""; im.draggable = false; im.src = unoSpCache[base]; pic.appendChild(im); return; }
    ph();                                   // placeholder right away, real art replaces it when it loads
    const tryExt = i => {
        if (i >= UNO_SP_EXT.length) { unoSpCache[base] = ""; return; }
        const im = new Image(); im.alt = ""; im.draggable = false;
        im.onload = () => { unoSpCache[base] = im.src; pic.classList.remove("sp-ph"); pic.innerHTML = ""; pic.appendChild(im); };
        im.onerror = () => tryExt(i + 1);
        im.src = base + "." + UNO_SP_EXT[i];
    };
    tryExt(0);
}
document.querySelectorAll("#animePoll input").forEach(i => { if (UNO_DECKS[i.value]) i.closest("label").classList.add("uno-ok"); });
$("animePoll").addEventListener("change", () => {
    if (homeMode !== "uno") return;
    $("modeHint").textContent = "Anime UNO: pick exactly 4 series (" + document.querySelectorAll("#animePoll input:checked").length + "/4 picked).";
});

/* AniList spells names its own way (Yuuji, Uryuu, Ryuu...). Fold doubled vowels / "ou" so spellings compare equal. */
const nzf = s => nz(s).replace(/([aeiou])\1+/g, "$1").replace(/ou/g, "o");
function ed1(a, b) {                                   // are two words at most one edit apart?
    if (a === b) return true; if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return a.slice(i + 1) === b.slice(i) || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i + 1);
}
const wordHit = (ws, t) => ws.some(w => w === t || (t.length >= 5 && ed1(w, t)));
function unoFindImg(pool, label, name) {
    const nn = nzf(name), toks = nn.split(" ");
    const score = c => {
        if (nzf(c.n) === nn) return 4;                                     // exact name first, so Yuji can't get his dad's picture
        if ((c.a || []).some(x => nzf(x) === nn)) return 3;                // then an exact nickname
        return toks.every(t => wordHit(nzf([c.n].concat(c.a || []).join(" ")).split(" "), t)) ? 2 : 0;   // then all words
    };
    let best = null, bs = 0;
    pool.filter(x => x.s === label).forEach(c => { const s = score(c); if (s > bs) { best = c; bs = s; } });
    return best && best.i ? best.i : "";
}
/* AniList sometimes spells a name differently from the usual one. These are tried automatically. */
const UNO_ALT = { "Vegito": ["Vegetto"], "Muhammad Avdol": ["Mohammed Avdol"], "Gol D. Roger": ["Gold Roger", "Roger"], "Tobi": ["Obito Uchiha", "Obito"], "Caesar Anthonio Zeppeli": ["Caesar Zeppeli"],
    "Secre Swallowtail": ["Secre"], "Fanzell Rogue": ["Fanzell"], "Gogeta": ["Gogeta"] };
/* Several searches in ONE request (AniList limits requests per minute, so one-by-one searching got blocked and left cards empty). */
async function unoAni(queries) {
    const vars = {}, decl = [], body = [];
    queries.forEach((q, i) => {
        vars["s" + i] = q; decl.push("$s" + i + ":String");
        body.push("q" + i + ":Page(perPage:8){characters(search:$s" + i + ",sort:FAVOURITES_DESC){name{full alternative} image{large} favourites media(perPage:4,type:ANIME,sort:POPULARITY_DESC){nodes{title{romaji english}}}}}");
    });
    const query = "query(" + decl.join(",") + "){" + body.join(" ") + "}";
    for (let tries = 0; tries < 3; tries++) {
        const r = await fetch("https://graphql.anilist.co", { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify({ query: query, variables: vars }) });
        if (r.status === 429) { await aniSleep(5000 * (tries + 1)); continue; }       // blocked for a moment: wait, then try the same request again
        const j = await r.json();
        if (!j.data) throw new Error("AniList error");
        return queries.map((q, i) => (j.data["q" + i] && j.data["q" + i].characters) || []);
    }
    throw new Error("AniList busy");
}
async function unoFetchMissing(cards, keys, onProg) {
    let cache = {}; try { cache = JSON.parse(localStorage.getItem("gw_unoimg2") || "{}"); } catch (e) {}
    cards.forEach(c => { if (!c.i && cache[keys[c.s] + "|" + c.n]) c.i = cache[keys[c.s] + "|" + c.n]; });
    const qsOf = c => { const q = [c.n].concat(UNO_ALT[c.n] || []); const w = c.n.split(" "); if (w.length > 1) q.push(w[w.length - 1]); return q.filter((x, i) => q.indexOf(x) === i); };
    const pick = (c, list) => {
        const re = HB_SERIES[keys[c.s]].re, targets = [c.n].concat(UNO_ALT[c.n] || []).map(nzf);
        const hit = x => targets.some(nn => nzf(x.name.full) === nn || (x.name.alternative || []).some(a => nzf(a) === nn)
            || nn.split(" ").every(t => wordHit(nzf(x.name.full + " " + (x.name.alternative || []).join(" ")).split(" "), t)));
        const good = list.filter(x => x.image && x.image.large && !/default/i.test(x.image.large)
            && ((x.media && x.media.nodes) || []).some(m => re.test(hbTitle(m.title))) && hit(x))        // must belong to THIS series
            .sort((a, b) => (targets.includes(nzf(b.name.full)) - targets.includes(nzf(a.name.full))) || b.favourites - a.favourites);
        return good[0] ? good[0].image.large.replace(HB_IMG, "") : "";
    };
    for (let round = 0; round < 4; round++) {            // round 0: normal name, later rounds: other spellings / last word
        const todo = cards.filter(c => !c.i && qsOf(c)[round] !== undefined);
        if (!todo.length) continue;
        for (let i = 0; i < todo.length; i += 4) {
            const chunk = todo.slice(i, i + 4);
            onProg && onProg(cards.filter(c => !c.i).length);
            try {
                await aniSleep(1000);
                const res = await unoAni(chunk.map(c => qsOf(c)[round]));
                chunk.forEach((c, j) => { const s = pick(c, res[j]); if (s) { c.i = s; cache[keys[c.s] + "|" + c.n] = s; } });
            } catch (e) { console.warn("Picture search failed:", e); }
        }
    }
    try { localStorage.setItem("gw_unoimg2", JSON.stringify(cache)); } catch (e) {}
    const miss = cards.filter(c => !c.i).map(c => c.n);
    if (miss.length) { console.warn("Anime UNO cards without a picture:", miss); toast(miss.length + " card(s) have no picture: " + miss.slice(0, 6).join(", ") + (miss.length > 6 ? "..." : "")); }
}
function unoBuildCards(keys, pool) {
    const out = [];
    keys.forEach((k, s) => {
        const lab = HB_SERIES[k].label, p = UNO_DECKS[k].split(";");
        const add = (kind, names, v) => names.split(",").forEach(n => out.push({ k: kind, s: s, v: v == null ? -1 : v, n: n, i: unoFindImg(pool, lab, n) }));
        p[0].split("|").forEach((g, v) => add("a", g, v));
        add("s", p[1]); add("r", p[2]); add("d", p[3]); add("w", p[4]); add("x", p[5]);
        const sp = UNO_SPECIAL[k] || {};
        ["f", "t", "u", "e"].forEach(kd => { if (sp[kd]) out.push({ k: kd, s: s, v: -1, n: sp[kd][0], i: "", sp: 1, sk: k, ab: sp[kd][1] || "" }); });
    });
    return out;   // 4 x (27 + 4 special) = 124
}
/* The host forges the 124-card deck while everyone sits in the lobby (pictures from packs.json, gaps
   filled from AniList). It is stored as uno.cards with uno.key = the 4 series, so a rematch or a later
   UNO match with the same series starts instantly. */
let unoDeckBusy = "", unoDeckPct = 0;
const unoDeckKey = keys => keys.join(",");
async function unoPrepDeck(keys) {
    const key = unoDeckKey(keys);
    if (unoDeckBusy === key) return; unoDeckBusy = key; unoDeckPct = 1;
    try {
        let pool = [];
        try { pool = await hbBuildPool(keys, "normal"); } catch (e) { console.warn(e); toast("Couldn't load pictures. Cards will show names only."); }
        if (unoDeckBusy !== key) return;
        const cards = unoBuildCards(keys, pool), total = cards.filter(c => !c.sp && !c.i).length || 1;
        unoDeckPct = 20; lobbyRefresh();
        if (pool.length) await unoFetchMissing(cards.filter(c => !c.sp), keys, left => { unoDeckPct = Math.round(20 + 80 * (1 - left / total)); lobbyRefresh(); });
        const d = currentRoomData;
        if (unoDeckBusy !== key || !d || d.status !== "waiting" || unoDeckKey(arr(d.animes)) !== key) return;
        await update(ref(db, "rooms/" + room), { uno: { cards: cards, anime: keys.map(k => HB_SERIES[k].label), phase: "lobby", n: 0, key: key, missing: cards.filter(c => !c.i && !c.sp).map(c => c.n) } });
    } catch (e) { console.error(e); toast("Couldn't prepare the deck: " + (e.message || e)); }
    finally { if (unoDeckBusy === key) unoDeckBusy = ""; unoDeckPct = 0; lobbyRefresh(); }
}

/* ---------- rules (all moves run inside a transaction so two taps can never clash) ---------- */
const unoShuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
function unoNorm(u) {
    u.cards = arr(u.cards); u.seats = arr(u.seats); u.draw = arr(u.draw); u.disc = arr(u.disc); u.anime = arr(u.anime);
    u.hands = u.hands || {}; u.names = u.names || {}; u.seats.forEach(p => { u.hands["p" + p] = arr(u.hands["p" + p]); });
    return u;
}
function unoDealState(cards, anime, seats, names, round) {
    const draw = unoShuf(cards.map((c, i) => i)), hands = {};
    seats.forEach(p => { hands["p" + p] = draw.splice(0, 7); });
    const first = draw.splice(draw.findIndex(i => cards[i].k === "a"), 1)[0];   // the opening card is always an attribute card
    return { cards: cards, anime: anime, seats: seats, names: names, hands: hands, draw: draw, disc: [first], turn: seats[0], dir: 1,
        color: cards[first].s, drew: null, call: null, frozen: {}, fzk: null, fx: null, peek: null, ev: null, fin: null, winner: null, phase: "play", round: round, n: 1, msg: "Game on! " + names["p" + seats[0]] + " starts." };
}
const unoTop = u => u.cards[u.disc[u.disc.length - 1]];
const unoNext = (u, p, k) => { const n = u.seats.length, i = u.seats.indexOf(p); return u.seats[(((i + u.dir * k) % n) + n) % n]; };
/* Who plays next: k seats after p, but a FROZEN player is skipped and loses one of their frozen turns each time. */
function unoAdv(u, p, k, notes) {
    u.frozen = u.frozen || {};
    let t = unoNext(u, p, k), guard = 0;
    while ((u.frozen["p" + t] || 0) > 0 && guard++ < 40) {
        u.frozen["p" + t]--;
        const m = u.names["p" + t] + " is frozen and loses a turn!" + (u.frozen["p" + t] > 0 ? " (" + u.frozen["p" + t] + " more)" : "");
        if (notes) notes.push(m); else u.msg = (u.msg || "") + " " + m;
        t = unoNext(u, t, 1);
    }
    return t;
}
function unoCan(u, hand, ci) {
    const c = u.cards[ci], t = unoTop(u);
    if (c.k === "w") return true;
    if (c.k === "x") return !hand.some(h => { const o = u.cards[h]; return o.k !== "w" && o.k !== "x" && o.s === u.color; });   // +4 only when you hold no card of the active colour
    if (c.sp && t.k === c.k) return false;   // a special card can't be countered by the same kind of special (by anyone, even the same player)
    return c.s === u.color || (t.k === c.k && (c.k !== "a" || t.v === c.v));
}
function unoDraw(u, p, n) {
    const h = u.hands["p" + p];
    for (let i = 0; i < n; i++) {
        if (!u.draw.length) { const keep = u.disc.pop(); u.draw = unoShuf(u.disc.filter(i => !u.cards[i].sp)); u.disc = [keep]; }   // used special cards never go back into the draw pile
        if (!u.draw.length) break;
        h.push(u.draw.pop());
    }
}
async function unoTx(fn) {
    try { await runTransaction(ref(db, "rooms/" + room + "/uno"), cur => { if (!cur) return cur; const u = unoNorm(cur); if (fn(u) === false) return; return u; }); }
    catch (e) { console.error(e); toast("That move didn't go through. Try again."); }
}
async function unoStart() {
    const d = currentRoomData, seats = activeSlots(d);
    if (seats.length < 2) { toast("Need at least 2 players."); return; }
    if (!d.uno || !d.uno.cards || d.uno.key !== unoDeckKey(arr(d.animes))) { toast("The deck is still being prepared."); return; }
    const names = {}; seats.forEach(i => { names["p" + i] = d["player" + i].name; });
    const st = unoDealState(arr(d.uno.cards), arr(d.uno.anime), seats, names, 1); st.key = d.uno.key; st.missing = d.uno.missing || null;
    try { await update(ref(db, "rooms/" + room), { status: "playing", matchId: Date.now(), uno: st }); }
    catch (e) { toast("Could not start the game."); }
}
window.unoPlay = (ci, col, tg) => unoTx(u => {
    const p = Number(myPlayer), h = u.hands["p" + p] || [];
    if (u.phase !== "play" || u.turn !== p || !h.includes(ci) || (u.drew != null && u.drew !== ci) || !unoCan(u, h, ci)) return false;
    const c = u.cards[ci], wild = c.k === "w" || c.k === "x", sp = !!UNO_SP[c.k], nm = u.names["p" + p], nx = unoNext(u, p, 1), notes = [];
    tg = Number(tg) || 0;
    if (c.k === "t" && h.length > 1 && (tg === p || !u.seats.includes(tg))) return false;      // swap needs a valid target
    h.splice(h.indexOf(ci), 1); u.disc.push(ci); u.drew = null;
    u.color = wild ? (Number(col) || 0) : c.s;
    let msg = nm + " played " + c.n;
    if (c.k === "s") { msg += ". " + u.names["p" + nx] + " is skipped!"; u.turn = unoAdv(u, p, 2, notes); }
    else if (c.k === "r") { u.dir *= -1; msg += ". Direction reversed!"; u.turn = u.seats.length === 2 ? p : unoAdv(u, p, 1, notes); }
    else if (c.k === "d") { unoDraw(u, nx, 2); msg += ". " + u.names["p" + nx] + " draws 2!"; u.turn = unoAdv(u, p, 2, notes); }
    else if (c.k === "x") { unoDraw(u, nx, 4); msg += ". " + u.names["p" + nx] + " draws 4!"; u.turn = unoAdv(u, p, 2, notes); }
    else if (c.k === "f") { u.frozen = u.frozen || {}; u.frozen["p" + nx] = (u.frozen["p" + nx] || 0) + 2; u.fzk = u.fzk || {}; u.fzk["p" + nx] = c.sk + "_" + c.k; msg += (c.ab ? " (" + c.ab + ")" : "") + ". " + u.names["p" + nx] + " is FROZEN for 2 turns!"; u.turn = unoAdv(u, p, 1, notes); }
    else if (c.k === "u") { unoDraw(u, nx, 5); msg += (c.ab ? " (" + c.ab + ")" : "") + ". " + u.names["p" + nx] + " draws 5!"; u.turn = unoAdv(u, p, 2, notes); }
    else if (c.k === "t") {
        if (h.length) { const mine = h; u.hands["p" + p] = u.hands["p" + tg]; u.hands["p" + tg] = mine; msg += (c.ab ? " (" + c.ab + ")" : "") + ". Hands swapped with " + u.names["p" + tg] + "!"; }
        u.turn = unoAdv(u, p, 1, notes);
    }
    else if (c.k === "e") { msg += (c.ab ? " (" + c.ab + ")" : "") + ". " + nm + " sees every hand!"; u.turn = unoAdv(u, p, 1, notes); }
    else u.turn = unoAdv(u, p, 1, notes);
    if (wild) msg += " Colour: " + u.anime[u.color] + ".";
    if (notes.length) msg += " " + notes.join(" ");
    const fh = u.hands["p" + p];
    u.call = fh.length === 1 ? { p: p, safe: false, t: Date.now() } : null;
    if (!fh.length) { u.phase = "over"; u.winner = p; msg = nm + " wins the round!"; u.wins = u.wins || {}; u.wins["p" + p] = (Number(u.wins["p" + p]) || 0) + 1; u.fin = { ci: ci, sp: sp ? 1 : 0 }; }
    u.n++; u.msg = msg;
    const victim = c.k === "t" ? tg : ({ s: 1, d: 1, x: 1, u: 1, f: 1 })[c.k] ? nx : 0;
    u.ev = { id: u.n, t: "p", p: p, ci: ci, k: c.k, to: victim, dc: ({ d: 2, x: 4, u: 5 })[c.k] || 0, col: u.color };
    const id = (u.round || 1) + ":" + u.n;
    if (sp && u.phase === "play") u.fx = { id: id, ci: ci, p: p, to: nx, sw: c.k === "t" ? tg : 0 };
    if (c.k === "e" && u.phase === "play") u.peek = { id: id, p: p, t: Date.now() };
});
window.unoDrawClick = () => unoTx(u => {
    const p = Number(myPlayer), h = u.hands["p" + p];
    if (u.phase !== "play" || u.turn !== p || u.drew != null) return false;
    if (u.call && u.call.p !== p) u.call = null;
    const before = h.length; unoDraw(u, p, 1);
    u.msg = u.names["p" + p] + " drew a card."; u.n++; u.ev = { id: u.n, t: "d", p: p, dc: h.length - before };
    if (h.length === before || !unoCan(u, h, h[h.length - 1])) u.turn = unoAdv(u, p, 1); else u.drew = h[h.length - 1];
});
window.unoPass = () => unoTx(u => {
    const p = Number(myPlayer); if (u.phase !== "play" || u.turn !== p || u.drew == null) return false;
    u.drew = null; u.msg = u.names["p" + p] + " passed."; u.turn = unoAdv(u, p, 1); u.n++;
});
window.unoCall = () => unoTx(u => {
    const p = Number(myPlayer); if (!u.call || u.call.p !== p || u.call.safe) return false;
    u.call.safe = true; u.msg = u.names["p" + p] + " shouts UNO!"; u.n++; u.ev = { id: u.n, t: "u", p: p };
});
window.unoCatch = () => unoTx(u => {
    const p = Number(myPlayer); if (!u.call || u.call.safe || u.call.p === p || Date.now() - u.call.t < 2500) return false;
    const caught = u.call.p; unoDraw(u, caught, 2); u.msg = u.names["p" + p] + " caught " + u.names["p" + caught] + " forgetting UNO! +2 cards."; u.call = null; u.n++; u.ev = { id: u.n, t: "c", p: p, to: caught, dc: 2 };
});
window.unoSkipAbsent = () => unoTx(u => {
    if (u.phase !== "play") return false;
    const p = u.turn; u.drew = null; u.msg = u.names["p" + p] + " is away, turn skipped."; u.turn = unoAdv(u, p, 1); u.n++; u.ev = { id: u.n, t: "s", p: 0, to: p };
});
window.unoRematch = () => {
    const d = currentRoomData, seats = activeSlots(d), names = {};
    if (seats.length < 2) { toast("Need at least 2 players for another round."); return; }
    seats.forEach(i => { names["p" + i] = d["player" + i].name; });
    unoTx(u => { if (u.phase !== "over") return false; Object.assign(u, unoDealState(u.cards, u.anime, seats, names, (u.round || 1) + 1)); });
};

/* ---------- screen ---------- */
let unoSeen = { n: -1, over: "", hl: -1, top: -1, round: -1, ev: null, turn: 0 }, unoPick = null;
const UNO_KANJI = { onepiece: "海賊", naruto: "忍", bleach: "死神", jjk: "呪", dragonball: "龍", demonslayer: "鬼", aot: "巨", mha: "英" };
const UNO_ABBR = ["LCK", "DEF", "ACC", "STA", "INT", "TEC", "SPD", "SPR", "STR", "PWR"];   // abbreviation shown on the card (matching still works by attribute)
function unoCardEl(u, ci, cls) {
    const c = u.cards[ci], wild = c.k === "w" || c.k === "x", sp = !!c.sp, el = hbEl("div", "ucard k-" + c.k + " " + (wild ? "wild " : "") + (sp ? "sp " : "") + (cls || ""));
    el.style.setProperty("--c", wild ? "#15151c" : UNO_SUIT[c.s]);
    el.appendChild(hbEl("div", "u-wm" + (c.k === "a" ? " abbr" : ""), c.k === "a" ? UNO_ABBR[c.v] : unoSym[c.k]));
    const pic = hbEl("div", "u-pic");
    if (sp) unoSpArt(pic, c); else if (c.i) pic.appendChild(makeImg(HB_IMG + c.i)); else { pic.classList.add("noimg"); pic.textContent = c.n.split(" ").map(w => w[0]).join("").slice(0, 2); }
    el.appendChild(pic);
    const badge = hbEl("div", "u-num"); badge.appendChild(hbEl("b", null, c.k === "a" ? UNO_ABBR[c.v] : unoSym[c.k])); el.appendChild(badge);
    el.appendChild(hbEl("div", "u-name", c.n));
    el.appendChild(hbEl("div", "u-sub", c.k === "a" ? UNO_ATTR[c.v] : (sp && c.ab ? c.ab : unoKind[c.k])));
    el.appendChild(hbEl("div", "u-anime", wild ? "WILD · " + (u.anime[c.s] || "") : sp ? "SPECIAL · " + (u.anime[c.s] || "") : (u.anime[c.s] || "")));
    if (wild || sp) el.appendChild(hbEl("div", "u-foil"));
    return el;
}
function unoFitHand() {
    const hd = $("unoHand"), cs = Array.from(hd.children), n = cs.length;
    if (!n) return;
    hd.classList.remove("scroll");
    const W = hd.clientWidth - 44, cw = cs[0].offsetWidth;
    let step = n > 1 ? Math.min(cw + 10, (W - cw) / (n - 1)) : 0;
    const scroll = n > 1 && step < 34;
    if (scroll) step = 34;                          // too many cards: scroll sideways, never cut the first ones off
    hd.classList.toggle("scroll", scroll);
    const mid = (n - 1) / 2, ang = Math.min(4, 36 / n);
    cs.forEach((el, i) => {
        el.style.marginLeft = i ? (step - cw) + "px" : "0";
        el.style.setProperty("--i", i);
        el.style.setProperty("--rot", scroll ? "0deg" : ((i - mid) * ang).toFixed(2) + "deg");
        el.style.setProperty("--lift", scroll ? "0px" : (((i - mid) ** 2) * Math.min(1.6, 12 / n)).toFixed(1) + "px");
    });
}
window.addEventListener("resize", () => { if (!$("uno").classList.contains("hidden")) unoFitHand(); });
// hand cards tilt toward the pointer and the holo glare follows it
let unoHoverCard = null;
$("unoHand").addEventListener("pointermove", e => {
    const c = e.target.closest && e.target.closest(".ucard"); if (!c || e.pointerType === "touch") return;
    if (c !== unoHoverCard) { if (unoHoverCard) ["--rx", "--ry", "--mx", "--my"].forEach(v => unoHoverCard.style.removeProperty(v)); unoHoverCard = c; if (c.classList.contains("ok")) sfx("hover"); }
    if (!motionOK()) return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty("--rx", ((.5 - y) * 16).toFixed(1) + "deg"); c.style.setProperty("--ry", ((x - .5) * 18).toFixed(1) + "deg");
    c.style.setProperty("--mx", Math.round(x * 100) + "%"); c.style.setProperty("--my", Math.round(y * 100) + "%");
});
$("unoHand").addEventListener("pointerleave", () => { if (unoHoverCard) ["--rx", "--ry", "--mx", "--my"].forEach(v => unoHoverCard.style.removeProperty(v)); unoHoverCard = null; });
function unoPlateEl(data, u, p, me, play, pres) {
    const n = (u.hands["p" + p] || []).length, frozen = u.frozen && u.frozen["p" + p] > 0, left = data["player" + p] && data["player" + p].left;
    const box = hbEl("div", "u-opp" + (play && u.turn === p ? " turn" : "") + (pres["p" + p] === false || left ? " gone" : "") + (frozen ? " frozen fxk-" + ((u.fzk || {})["p" + p] || "") : ""));
    box.dataset.p = p; box.dataset.emote = "p" + p; box.style.setProperty("--pc", HB_COLORS[p - 1]);
    const top = hbEl("div", "u-otop"); top.appendChild(avatarEl(pPub(data, p), { size: 38 }));
    const nm = hbEl("div", "u-oname", u.names["p" + p]); nm.style.color = HB_COLORS[p - 1]; top.appendChild(nm);
    const w = Number((u.wins || {})["p" + p]) || 0; if (w) top.appendChild(hbEl("span", "u-owins", "★" + w));
    box.appendChild(top);
    const fan = hbEl("div", "u-fan"); for (let i = 0; i < Math.min(n, 7); i++) { const c = hbEl("i"); c.style.setProperty("--k", i * 6 / Math.max(1, Math.min(n, 7) - 1 || 1)); fan.appendChild(c); } box.appendChild(fan);
    box.appendChild(hbEl("div", "u-ocount" + (n === 1 ? " uno" : ""), (left ? "LEFT · " : "") + (n === 1 ? "UNO! · 1 card" : n + " cards") + (frozen ? "  ❄ x" + u.frozen["p" + p] : "")));
    return box;
}
const unoRect = el => el ? el.getBoundingClientRect() : null;
function unoSnapshot() {
    const snap = { hand: {}, opp: {}, me: unoRect($("unoMe")), draw: unoRect($("unoDraw")), top: unoRect($("unoTop").querySelector(".ucard")) };
    document.querySelectorAll("#unoHand .ucard[data-ci]").forEach(el => { snap.hand[el.dataset.ci] = el.getBoundingClientRect(); });
    document.querySelectorAll("#unoOpps .u-opp").forEach(el => { snap.opp[el.dataset.p] = el.getBoundingClientRect(); });
    return snap;
}
function showUNO(data) {
    const wasHidden = $("uno").classList.contains("hidden");
    const snap = wasHidden ? null : unoSnapshot();
    showOnly("uno");
    const u = unoNorm(JSON.parse(JSON.stringify(data.uno))), me = Number(myPlayer), pres = data.presence || {}, keys = arr(data.animes);
    if (!u.disc.length) return;
    const play = u.phase === "play", myTurn = play && u.turn === me, hand = u.hands["p" + me] || [];
    const firstRender = unoSeen.n < 0;
    const newEv = u.ev && u.ev.id !== unoSeen.ev && !firstRender ? u.ev : null;
    if (u.ev) unoSeen.ev = u.ev.id;
    if (u.n !== unoSeen.n) { if (unoSeen.n >= 0 && play && myTurn && u.turn !== unoSeen.turn) { sfx("turn"); } unoSeen.n = u.n; unoSeen.turn = u.turn; }
    if (u.fx && u.fx.id !== unoSeen.fx) { unoSeen.fx = u.fx.id; if (!firstRender) unoSpecialFx(u, u.fx); }
    if (u.peek && u.peek.id !== unoSeen.peek) { unoSeen.peek = u.peek.id; if (!firstRender && u.peek.p === me && Date.now() - u.peek.t < 5000) unoPeekShow(u, me); }
    const actCol = UNO_SUIT[u.color] || "#ffcf4a";
    $("uno").classList.toggle("myturn", myTurn); $("uno").style.setProperty("--ac", actCol); ambient.accent(actCol);
    $("unoArenaKj").textContent = UNO_KANJI[keys[u.color]] || "札";
    $("unoTurn").textContent = !play ? "ROUND OVER" : myTurn ? "YOUR TURN!" : (u.names["p" + u.turn] || "?") + "'s turn";
    $("unoStatus").textContent = u.msg || "";
    // opponents
    const op = $("unoOpps"); op.innerHTML = "";
    u.seats.filter(p => p !== me).forEach(p => op.appendChild(unoPlateEl(data, u, p, me, play, pres)));
    // my own plate (avatar, name, wins), so I see myself the way the others see me
    const mine = $("unoMe"); mine.innerHTML = "";
    if (u.seats.includes(me)) {
        mine.className = "uno-me" + (myTurn ? " turn" : "") + (u.frozen && u.frozen["p" + me] > 0 ? " frozen" : "");
        mine.dataset.emote = "p" + me;
        mine.appendChild(avatarEl(pPub(data, me), { size: 44, badge: true }));
        const id = hbEl("div", "u-meid"); id.appendChild(hbEl("b", null, pName(data, me))); id.appendChild(hbEl("small", null, hand.length + " card" + (hand.length === 1 ? "" : "s") + ((u.wins || {})["p" + me] ? " · ★" + u.wins["p" + me] + " wins" : "") + (u.frozen && u.frozen["p" + me] > 0 ? " · ❄ frozen" : "")));
        mine.appendChild(id);
    }
    const topIdx = u.disc[u.disc.length - 1], tp = $("unoTop"); tp.innerHTML = "";
    const flying = newEv && newEv.t === "p" && snap && motionOK();
    tp.appendChild(unoCardEl(u, topIdx, "big" + (unoSeen.top !== u.n && !flying ? " drop" : ""))); unoSeen.top = u.n;
    $("unoRing").classList.toggle("ccw", u.dir < 0);
    const info = $("unoInfo"); info.innerHTML = "";
    const slab = hbEl("div", "u-active"); slab.style.setProperty("--c", actCol);
    slab.appendChild(hbEl("small", null, "ACTIVE ANIME")); slab.appendChild(hbEl("b", null, u.anime[u.color])); slab.appendChild(hbEl("span", "u-kj", UNO_KANJI[keys[u.color]] || "")); info.appendChild(slab);
    info.appendChild(hbEl("div", "u-dir", u.dir > 0 ? "↻ CLOCKWISE" : "↺ COUNTER-CLOCKWISE"));
    info.appendChild(hbEl("div", "u-pile", "DRAW PILE · " + u.draw.length));
    const dr = $("unoDraw"); dr.innerHTML = ""; dr.appendChild(hbEl("b", null, "DRAW")); dr.appendChild(hbEl("em", null, String(u.draw.length)));
    dr.disabled = !(myTurn && u.drew == null); dr.classList.toggle("glow", myTurn && u.drew == null && !hand.some(ci => unoCan(u, hand, ci)));
    $("unoBtnPass").classList.toggle("hidden", !(myTurn && u.drew != null));
    $("unoBtnUno").classList.toggle("hidden", !(u.call && u.call.p === me && !u.call.safe));
    const canCatch = u.call && !u.call.safe && u.call.p !== me, wait = canCatch ? 2500 - (Date.now() - u.call.t) : 0;
    $("unoBtnCatch").classList.toggle("hidden", !canCatch); $("unoBtnCatch").disabled = wait > 0;
    clearTimeout(unoCatchTimer);
    if (wait > 0) unoCatchTimer = setTimeout(() => { if (currentRoomData && currentRoomData.gameType === "uno" && currentRoomData.status === "playing") showUNO(currentRoomData); }, wait + 60);
    const turnGone = data["player" + u.turn] && data["player" + u.turn].left;
    $("unoBtnSkip").classList.toggle("hidden", !(play && !myTurn && (pres["p" + u.turn] === false || turnGone)));
    const hd = $("unoHand"); hd.innerHTML = "";
    const key = ci => { const c = u.cards[ci]; return (c.k === "w" || c.k === "x" ? 9 : c.s) * 1000 + (c.k === "a" ? c.v : 20 + c.k.charCodeAt(0) % 20); };
    const fresh = new Set(newEv && newEv.dc && newEv.to === me || (newEv && newEv.t === "d" && newEv.p === me) ? hand.filter(ci => snap && !snap.hand[ci]) : []);
    hand.slice().sort((a, b) => key(a) - key(b)).forEach(ci => {
        const ok = myTurn && (u.drew == null || u.drew === ci) && unoCan(u, hand, ci), el = unoCardEl(u, ci, ok ? "ok" : "");
        el.dataset.ci = ci; el.tabIndex = ok ? 0 : -1; el.setAttribute("role", "button"); el.setAttribute("aria-label", u.cards[ci].n + " " + (u.cards[ci].k === "a" ? UNO_ATTR[u.cards[ci].v] : unoKind[u.cards[ci].k]) + (ok ? "" : " (can't play now)"));
        if (fresh.has(ci)) el.classList.add("fresh");
        el.onclick = () => {
            if (!ok) { if (myTurn) { shake(el, 6, 260); sfx("strike"); } return; }
            const c = u.cards[ci]; sfx("card");
            if (c.k === "w" || c.k === "x") { unoPick = ci; unoBuildColors(u, keys); $("unoColor").classList.remove("hidden"); }
            else if (c.k === "t" && hand.length > 1) { unoPick = ci; unoBuildTargets(u, me); $("unoTarget").classList.remove("hidden"); }
            else unoPlay(ci);
        };
        el.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); } };
        hd.appendChild(el);
    });
    hd.classList.toggle("deal", hand.length !== unoSeen.hl && (firstRender || u.round !== unoSeen.round)); unoSeen.hl = hand.length; unoSeen.round = u.round;
    unoFitHand();
    if (newEv) { try { unoAnimate(u, newEv, snap, data); } catch (e) { console.warn(e); } }
    $("unoOver").classList.add("hidden");
    if (!play && u.winner) unoOverSequence(u, data); else if (vxKey && vxKey.startsWith("uno:")) { closeResults(); vxKey = ""; }
}
let unoCatchTimer = 0;

/* ---------- Anime UNO: motion + action effects (all short, never block play) ---------- */
const unoFx = (() => {
    const list = []; let raf = 0, g = null, W = 0, H = 0, dpr = 1;
    const cv = () => $("unoFxCv");
    function size() { const c = cv(); dpr = Math.min(1.5, devicePixelRatio || 1); W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; g = c.getContext("2d"); }
    function loop(now) {
        raf = 0; if (!g) return;
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
        for (let i = list.length - 1; i >= 0; i--) { const f = list[i], t = (now - f.t0) / f.ms; if (t >= 1) { list.splice(i, 1); continue; } if (t < 0) continue; g.save(); try { f.draw(g, t, W, H); } catch (e) { list.splice(i, 1); } g.restore(); }
        if (list.length) raf = requestAnimationFrame(loop); else g.clearRect(0, 0, W, H);
    }
    addEventListener("resize", () => { if (g) size(); });
    return {
        add(ms, draw, delay = 0) { if (!motionOK()) return; if (!g || cv().width !== Math.round(innerWidth * Math.min(1.5, devicePixelRatio || 1))) size(); list.push({ t0: performance.now() + delay, ms, draw }); if (!raf) raf = requestAnimationFrame(loop); },
        clear() { list.length = 0; }
    };
})();
const ctr = r => r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };
function unoPlateRect(p) { const me = Number(myPlayer); if (p === me) return unoRect($("unoMe")) || unoRect($("unoHand")); return unoRect(document.querySelector('#unoOpps .u-opp[data-p="' + p + '"]')); }
function flyCard(el, from, to, ms, rot) {
    el.style.cssText += ";position:fixed;left:" + to.left + "px;top:" + to.top + "px;width:" + to.width + "px;height:" + to.height + "px;margin:0;z-index:85;pointer-events:none;transition:none";
    document.body.appendChild(el);
    const sx = Math.max(.15, from.width / to.width), dx = (from.left + from.width / 2) - (to.left + to.width / 2), dy = (from.top + from.height / 2) - (to.top + to.height / 2);
    const a = el.animate([{ transform: "translate(" + dx + "px," + dy + "px) scale(" + sx + ") rotate(" + rot + "deg)" }, { transform: "translate(" + dx * .35 + "px," + (dy * .35 - 70) + "px) scale(" + (1.12) + ") rotate(" + rot * .3 + "deg)", offset: .6 }, { transform: "none" }], { duration: ms, easing: "cubic-bezier(.3,.7,.2,1)", fill: "forwards" });
    return new Promise(res => { const done = () => { el.remove(); res(); }; a.onfinish = done; setTimeout(done, ms + 250); });
}
function unoStamp(rect, text, color, cls) {
    if (!rect) return;
    const s = hbEl("div", "u-stamp " + (cls || ""), text); s.style.cssText = "left:" + (rect.left + rect.width / 2) + "px;top:" + (rect.top + rect.height / 2) + "px;--sc:" + color;
    document.body.appendChild(s); setTimeout(() => s.remove(), 1500);
}
function unoDrawFly(u, to, n, delay) {
    const from = unoRect($("unoDraw")), me = Number(myPlayer), dst = to === me ? (unoRect($("unoHand")) || unoPlateRect(me)) : unoPlateRect(to);
    if (!from || !dst || !n) return;
    const tgt = to === me ? { left: dst.left + dst.width / 2 - 40, top: dst.top + dst.height * .35, width: 80, height: 120 } : { left: dst.left + dst.width / 2 - 22, top: dst.top + dst.height / 2 - 33, width: 44, height: 66 };
    for (let i = 0; i < Math.min(n, 8); i++) setTimeout(() => { const b = hbEl("div", "ucard cb fly"); flyCard(b, { left: from.left, top: from.top, width: from.width, height: from.height }, tgt, 520, (Math.random() - .5) * 40).then(() => { if (i === Math.min(n, 8) - 1) { const pl = to === me ? $("unoMe") : document.querySelector('#unoOpps .u-opp[data-p="' + to + '"]'); shake(pl, 5, 240); } }); sfx("draw"); }, (delay || 0) + i * 110);
}
function unoAnimate(u, ev, snap, data) {
    const me = Number(myPlayer), center = ctr(unoRect($("unoTop")));
    if (ev.t === "p") {
        const c = u.cards[ev.ci], col = c.k === "w" || c.k === "x" ? UNO_SUIT[ev.col] : UNO_SUIT[c.s];
        const top = $("unoTop").querySelector(".ucard");
        const impact = () => {
            sfx(c.k === "a" ? "slam" : "card"); ring(center.x, center.y, col, 260, 600); shake($("unoTop"), c.k === "a" ? 4 : 8, 300);
            if (ev.p === me && c.k === "x") achNow("uno_villain");
            unoAction(u, ev, c, col, center);
        };
        if (snap && top && motionOK()) {
            const dst = top.getBoundingClientRect();
            let src = ev.p === me ? snap.hand[ev.ci] : null;
            if (!src) { const pr = snap.opp[ev.p] || unoPlateRect(ev.p); if (pr) src = { left: pr.left + pr.width / 2 - 26, top: pr.top + pr.height / 2 - 39, width: 52, height: 78 }; }
            if (src) { top.style.visibility = "hidden"; flyCard(unoCardEl(u, ev.ci, "big"), src, dst, 430, (Math.random() - .5) * 50).then(() => { top.style.visibility = ""; impact(); }); return; }
        }
        impact();
    } else if (ev.t === "d") { unoDrawFly(u, ev.p, ev.dc || 1, 0); }
    else if (ev.t === "u") { const r = unoPlateRect(ev.p); unoStamp(r, "UNO!", "#ffe14d", "big"); sfx("uno"); ring(ctr(r).x, ctr(r).y, "#ffe14d", 240, 700); }
    else if (ev.t === "c") { const r = unoPlateRect(ev.to); unoStamp(r, "CAUGHT!", "#ff3b3b"); sfx("catch"); unoDrawFly(u, ev.to, 2, 300); }
    else if (ev.t === "s") { unoStamp(unoPlateRect(ev.to), "AWAY", "#bbbbbb"); sfx("skip"); }
}
function unoAction(u, ev, c, col, center) {
    const k = c.k, victim = ev.to, vr = victim ? unoPlateRect(victim) : null, vc = ctr(vr), me = Number(myPlayer);
    const fromC = ctr(ev.p === me ? unoRect($("unoHand")) : unoPlateRect(ev.p));
    if (k === "a") { unoFx.add(420, (g, t, W, H) => { const e = 1 - Math.pow(1 - t, 3); g.globalAlpha = 1 - t; g.strokeStyle = col; g.lineWidth = 10 * (1 - t) + 2; g.shadowColor = col; g.shadowBlur = 20; g.beginPath(); g.moveTo(center.x - 160, center.y + 90); g.lineTo(center.x - 160 + 320 * e, center.y + 90 - 180 * e); g.stroke(); }); return; }
    if (k === "s") { setTimeout(() => { unoStamp(vr, "⊘ SKIP", col); sfx("skip"); const pl = document.querySelector('#unoOpps .u-opp[data-p="' + victim + '"]') || $("unoMe"); shake(pl, 9, 360); }, 80); return; }
    if (k === "r") {
        sfx("reverse"); const ringEl = $("unoRing"); ringEl.classList.remove("rev"); void ringEl.offsetWidth; ringEl.classList.add("rev");
        unoFx.add(1100, (g, t) => { const R = 150 + 40 * Math.sin(t * 3.14); g.lineWidth = 6; g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 24; g.globalAlpha = Math.sin(t * Math.PI); for (let i = 0; i < 3; i++) { const a0 = -t * 9 * (u.dir < 0 ? 1 : -1) + i * 2.094; g.beginPath(); g.arc(center.x, center.y, R, a0, a0 + 1.4); g.stroke(); const ax = center.x + Math.cos(a0 + 1.4) * R, ay = center.y + Math.sin(a0 + 1.4) * R; g.fillStyle = "#fff"; g.beginPath(); g.arc(ax, ay, 7, 0, 6.283); g.fill(); } });
        burstText("REVERSE", center.x, center.y - 120, col); return;
    }
    if (k === "w") {
        sfx("wild"); const cols = UNO_SUIT;
        unoFx.add(1100, (g, t) => { const e = t < .45 ? t / .45 : 1, back = t > .45 ? (t - .45) / .55 : 0; for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283 + t * 2, r = 30 + 260 * e * (1 - back * .9); g.globalAlpha = 1 - back; g.fillStyle = back > 0 ? col : cols[i % 4]; g.save(); g.translate(center.x + Math.cos(a) * r, center.y + Math.sin(a) * r); g.rotate(a); g.fillRect(-14, -5, 28, 10); g.restore(); } if (back > 0) { g.globalAlpha = (1 - back) * .6; g.fillStyle = col; g.beginPath(); g.arc(center.x, center.y, 60 + back * 400, 0, 6.283); g.fill(); } });
        burstText("WILD · " + (u.anime[ev.col] || ""), center.x, center.y - 130, col); return;
    }
    if (k === "d" || k === "x") {
        const heavy = k === "x", hitAt = heavy ? 620 : 380, dur = heavy ? 1500 : 950;
        if (heavy) { const dark = hbEl("div", "u-dark"); $("uno").appendChild(dark); setTimeout(() => dark.remove(), dur + 200); sfx("heavy"); }
        const from = { x: fromC.x, y: fromC.y }, to = { x: vc.x, y: vc.y }, ang = Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2, M = Math.min(innerWidth, innerHeight);
        unoFx.add(dur, (g, t, W, H) => {
            const tt = t * dur, p = Math.min(1, tt / hitAt), e = p * p * (3 - 2 * p), x = from.x + (to.x - from.x) * e, y = from.y + (to.y - from.y) * e;
            if (heavy && tt < hitAt) { for (let i = 0; i < 3; i++) { if (Math.random() < .5) continue; g.strokeStyle = i % 2 ? "#ff2a2a" : "#fff"; g.lineWidth = 3; g.shadowColor = "#ff0000"; g.shadowBlur = 18; g.beginPath(); let bx = Math.random() * W, by = 0; g.moveTo(bx, by); while (by < H * .7) { bx += (Math.random() - .5) * 80; by += 40 + Math.random() * 40; g.lineTo(bx, by); } g.stroke(); } g.shadowBlur = 0; }
            if (tt < hitAt + 160) {
                // speed lines behind the fist
                g.globalAlpha = .7; g.strokeStyle = heavy ? "#ff3b3b" : col; g.lineWidth = 3;
                for (let i = 0; i < 9; i++) { const off = (i - 4) * 9, nx = Math.cos(ang), ny = Math.sin(ang); g.beginPath(); g.moveTo(x + nx * off - Math.sin(ang) * -90, y + ny * off + Math.cos(ang) * -90); g.lineTo(x + nx * off - Math.sin(ang) * -(160 + i * 14), y + ny * off + Math.cos(ang) * -(160 + i * 14)); g.stroke(); }
                g.globalAlpha = 1;
                fxAnimeHand(g, x, y, (heavy ? 1.15 : .85) * M / 700 * (1 + .3 * e), ang, "fist", heavy ? { coat: 1, cr: true, T: t * 4, sleeve: "#1a0608", cuff: "#ff2a2a", ink: "#000" } : { sleeve: col, cuff: "#ffffff" });
            }
            if (tt >= hitAt) {
                const q = Math.min(1, (tt - hitAt) / (dur - hitAt));
                if (q < .12 && heavy) { g.globalAlpha = 1 - q / .12; g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "difference"; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over"; }
                g.globalAlpha = 1 - q; g.fillStyle = "#fff"; g.save(); g.translate(to.x, to.y); g.beginPath(); for (let i = 0; i < 22; i++) { const a = i / 22 * 6.283, r = i % 2 ? 30 + 30 * q : (heavy ? 170 : 110) * (.6 + q); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.strokeStyle = heavy ? "#ff2a2a" : col; g.lineWidth = 4; g.stroke(); g.restore();
                g.globalAlpha = (1 - q) * .8; g.strokeStyle = heavy ? "#ff2a2a" : col; g.lineWidth = 8 * (1 - q) + 1; g.beginPath(); g.arc(to.x, to.y, 40 + q * (heavy ? 420 : 260), 0, 6.283); g.stroke();
            }
        });
        setTimeout(() => { sfx("punch"); unoStamp(vr, heavy ? "+4" : "+2", heavy ? "#ff2a2a" : col, heavy ? "big" : ""); shake(heavy ? $("uno") : (document.querySelector('#unoOpps .u-opp[data-p="' + victim + '"]') || $("unoMe")), heavy ? 16 : 9, heavy ? 520 : 360); unoDrawFly(u, victim, ev.dc, 160); }, hitAt);
        return;
    }
    // special cards: their own cinematic plays (unoSpecialFx); the +5 cards still fly afterwards
    if (k === "u" && ev.dc) setTimeout(() => unoDrawFly(u, victim, ev.dc, 0), 600);
}
/* round over: the shared results sequence */
function unoOverSequence(u, data) {
    const key = "uno:" + (data.matchId || "") + ":" + u.round + ":" + u.winner;
    if (vxKey === key) return; vxKey = key;
    const me = Number(myPlayer), win = u.winner === me, seated = u.seats.includes(me);
    const fin = u.fin && u.cards[u.fin.ci] ? u.fin.ci : u.disc[u.disc.length - 1];
    const ach = win ? ["uno_win"].concat(u.fin && u.fin.sp ? ["uno_special"] : []) : [];
    const prog = seated ? recordOnce(key, "uno", win, { ach }) : null;
    const reveal = hbEl("div", "vx-card"); reveal.appendChild(unoCardEl(u, fin, "big"));
    const others = u.seats.filter(p => p !== u.winner).reduce((a, p) => a + (u.hands["p" + p] || []).length, 0);
    showResults({
        outcome: !seated ? "neutral" : win ? "win" : "lose", mode: "uno", color: UNO_SUIT[u.color] || "#ffcf4a", kicker: "ANIME UNO · ROUND " + u.round,
        title: win ? "VICTORY!" : (u.names["p" + u.winner] || "?").toUpperCase() + " WINS", kanji: win ? "勝利" : "敗北",
        subtitle: win ? (u.fin && u.fin.sp ? "Finished with a special card. Legendary." : "You got rid of every card.") : "Finishing card: " + ((u.cards[fin] || {}).n || "?"),
        reveal: reveal,
        podium: u.seats.slice().sort((a, b) => (a === u.winner ? -1 : b === u.winner ? 1 : (u.hands["p" + a] || []).length - (u.hands["p" + b] || []).length)).map(p => ({ player: pPub(data, p), score: p === u.winner ? "0 cards" : (u.hands["p" + p] || []).length + " cards", label: "★ " + (Number((u.wins || {})["p" + p]) || 0) + " round win" + ((Number((u.wins || {})["p" + p]) || 0) === 1 ? "" : "s"), me: p === me, win: p === u.winner })),
        chips: [["ROUND", u.round], ["CARDS LEFT IN PLAY", others], ["YOUR ROUND WINS", Number((u.wins || {})["p" + me]) || 0]],
        progress: prog,
        actions: matchActions({ again: { label: "Play again", fn: () => { closeResults(); vxKey = "uno-wait"; unoRematch(); } } })
    });
}

function unoBuildColors(u, keys) {
    const b = $("unoColorBtns"); b.innerHTML = "";
    u.anime.forEach((a, s) => { const x = hbEl("button", "u-pickbtn"); x.style.setProperty("--c", UNO_SUIT[s]); x.appendChild(hbEl("span", null, UNO_KANJI[keys[s]] || "")); x.appendChild(hbEl("b", null, a)); x.onclick = () => unoColorPick(s); b.appendChild(x); });
}
window.unoColorPick = s => { $("unoColor").classList.add("hidden"); if (unoPick != null) unoPlay(unoPick, s); unoPick = null; };
window.unoColorCancel = () => { $("unoColor").classList.add("hidden"); unoPick = null; };

/* ---------- special cards: swap target picker, banner, future sight ---------- */
function unoBuildTargets(u, me) {
    const b = $("unoTargetBtns"); b.innerHTML = "";
    u.seats.filter(p => p !== me).forEach(p => {
        const x = hbEl("button", "u-pickbtn"); x.style.setProperty("--c", HB_COLORS[p - 1]);
        x.appendChild(hbEl("span", null, "🌀"));
        x.appendChild(hbEl("b", null, u.names["p" + p] || "?"));
        x.appendChild(hbEl("div", "u-tcount", (u.hands["p" + p] || []).length + " cards"));
        x.onclick = () => unoTargetPick(p); b.appendChild(x);
    });
}
window.unoTargetPick = p => { $("unoTarget").classList.add("hidden"); if (unoPick != null) unoPlay(unoPick, 0, p); unoPick = null; };
window.unoTargetCancel = () => { $("unoTarget").classList.add("hidden"); unoPick = null; };
function unoSpecialFx(u, f) {
    const c = u.cards[f.ci]; if (!c || !UNO_SP[c.k]) return;
    const d = UNO_SP[c.k], old = $("unoFx"); if (old) old.remove();
    const box = hbEl("div", "u-fx k-" + c.k); box.id = "unoFx"; box.style.setProperty("--c", UNO_SUIT[c.s]);
    box.appendChild(hbEl("div", "u-fx-em", d.emoji));
    box.appendChild(hbEl("h2", null, c.ab || d.label));
    box.appendChild(hbEl("p", null, (u.names["p" + f.p] || "?") + " · " + c.n));
    $("uno").appendChild(box);
    const close = () => { box.classList.add("out"); setTimeout(() => box.remove(), 420); };
    if (!UNO_FX_HOOKS[c.sk + "_" + c.k]) try { d.snd(); } catch (e) {}   // silent while a hand-made animation exists (voice lines come from audio/special/)
    const hook = UNO_FX_HOOKS[c.sk + "_" + c.k];
    if (hook) { try { hook(box, close, c, u); } catch (e) { console.warn(e); close(); } } else setTimeout(close, 1700);
}
const UNO_PK = { onepiece_e: "OBSERVATION HAKI", naruto_e: "白眼 BYAKUGAN", dragonball_e: "KI SENSING", jjk_e: "六眼 SIX EYES", demonslayer_e: "TRANSPARENT WORLD",
    bleach_e: "THE ALMIGHTY", hxh_e: "LOVELY GHOSTWRITER", blackclover_e: "RED THREAD OF FATE", jojo_e: "EPITAPH" };
function unoPeekShow(u, me) {
    const old = $("unoPeek"); if (old) old.remove();
    const box = hbEl("div", "u-peek"); box.id = "unoPeek";
    const fxk = u.fx && u.cards[u.fx.ci] ? u.cards[u.fx.ci].sk + "_e" : "";
    if (UNO_PK[fxk]) box.classList.add("pk", "pk-" + fxk);
    box.appendChild(hbEl("h2", null, UNO_PK[fxk] || "👁️ FUTURE SIGHT"));
    const opp = u.seats.filter(p => p !== me), n = opp.reduce((s, p) => s + (u.hands["p" + p] || []).length, 0) || 1;
    const S = Math.min(innerWidth * .92, innerHeight * .72, 800), table = hbEl("div", "u-peek-table");      // a square, see-through table
    table.style.width = table.style.height = S + "px"; box.appendChild(table);
    const sc = Math.max(.36, Math.min(1.3, S * Math.sqrt(.78 / (n + opp.length * 2.5)) / 176)), ix = { i: 0 };   // cards as big as the table allows, never a thin line
    opp.forEach(p => {
        const sec = hbEl("div", "u-peek-sec"), nm = hbEl("div", "u-peek-name", u.names["p" + p]); nm.style.color = HB_COLORS[p - 1]; sec.appendChild(nm);
        const grid = hbEl("div", "u-peek-grid");
        (u.hands["p" + p] || []).slice().sort((a, b) => (u.cards[a].s - u.cards[b].s) || (u.cards[a].v - u.cards[b].v)).forEach(ci => {
            const cell = hbEl("div", "u-peek-cell"), el = unoCardEl(u, ci, ""); cell.style.width = 118 * sc + "px"; cell.style.height = 176 * sc + "px"; cell.style.setProperty("--i", ix.i++);
            el.style.cssText += ";position:absolute;left:0;top:0;width:118px;height:176px;transform-origin:0 0;transform:scale(" + sc + ");margin:0;transition:none"; cell.appendChild(el); grid.appendChild(cell);
        });
        sec.appendChild(grid); table.appendChild(sec);
    });
    box.appendChild(hbEl("div", "u-peek-bar"));
    const showPeek = () => { if ($("unoFx")) return setTimeout(showPeek, 200); if (unoFxOwnsPeek && u.peek && unoFxOwnsPeek === u.peek.id) return; setTimeout(() => { $("uno").appendChild(box); setTimeout(() => box.remove(), 6000); }, 600); }; setTimeout(showPeek, 300);   // after the banner, then 6 seconds
}

/* =====================================================================
   ROOMS · LOBBY · ROUTING
   A room is a persistent party: players join the lobby first, choose a mode
   together (the host decides, everyone can vote), play, and come back to the
   lobby for a rematch or another mode. Only an explicit "Close room" (host),
   or the last player leaving, deletes the room and its data.
   ===================================================================== */
const SLOTS = [1, 2, 3, 4, 5, 6];
const MODE_OF_KEY = { gw: "classic", hb: "headbanz", im: "imposter", uno: "uno" };
const MODES = {
    classic:  { key: "gw",  name: "Guess Who", tag: "CASE FILE", kanji: "探", min: 2, max: 2, color: "#f2b33d", sub: "Hide. Ask. Accuse.", blurb: "1v1 deduction duel. Hide a character, ask yes/no questions, accuse first.", art: ["images/anime/naruto/na3.jpg", "images/character12.jpg", "images/anime/jjk/jk5.jpg"] },
    headbanz: { key: "hb",  name: "Headbanz", tag: "MIND LINK", kanji: "心", min: 2, max: 4, color: "#b06bff", sub: "Read the room. Read yourself.", blurb: "Everyone sees your character but you. Ask, deduce, name yourself first.", art: ["images/anime/demonslayer/ds2.jpg", "images/anime/dragonball/db4.jpg", "images/anime/bleach/bc6.jpg"] },
    imposter: { key: "im",  name: "Imposter", tag: "SHADOW TRIAL", kanji: "偽", min: 3, max: 6, color: "#ff3355", sub: "Someone here is lying.", blurb: "All but one know the character. Give clues, vote, unmask the fake.", art: ["images/anime/jjk/jk2.jpg", "images/anime/bleach/bc3.jpg", "images/anime/naruto/na9.jpg"] },
    uno:      { key: "uno", name: "Anime UNO", tag: "ARENA CLASH", kanji: "札", min: 2, max: 6, color: "#ffcf4a", sub: "Four anime. One deck. No mercy.", blurb: "4 anime become 4 colours. Special cards unleash signature moves.", art: ["images/special/jjk_vision.jpg", "images/special/onepiece_ultimate.jpg", "images/special/dragonball_ultimate.jpg"] }
};
const RULES = {
    classic: ["Both players secretly pick a character from the same board.", "On your turn, ask one yes/no question out loud, then flip down every character it rules out.", "Press END TURN when you are done. Think you know it? Press ACCUSE and tap their character.", "A right accusation wins. A wrong one hands the win to your opponent."],
    headbanz: ["Everyone gets a character card that all the others can see, except you.", "Take turns asking yes/no questions about your own card; the others answer.", "Guess your character whenever you like. Three wrong guesses and you sit out the round.", "2 players: best of 3. 3 to 4 players: points per round, the fastest guess scores most."],
    imposter: ["Everyone sees the same secret character, except one imposter.", "Two clue rounds: on your call, say one clue out loud. Never say the name.", "Then vote. Catch the imposter and the crew scores; if they slip away, they score big.", "A caught imposter can still steal points by naming the character."],
    uno: ["The 4 anime you pick are the 4 colours. Match the colour, or the attribute or action of the top card.", "Skip, Reverse, +2, Wild and Wild +4 work like classic UNO.", "Specials: Freeze (next player loses 2 turns), Swap Hands, Ultimate (+5) and Future Sight (peek at every hand).", "Down to one card? Hit UNO! before someone catches you, or draw 2."]
};
function showRules(t) {
    const M = MODES[t] || MODES.classic;
    uiConfirm({ title: M.name + ": how to play", text: RULES[t].map((r, i) => (i + 1) + ".  " + r).join("\n\n"), ok: "Got it", cancel: "", info: true });
}
window.showRules = () => showRules(currentRoomData && MODES[currentRoomData.gameType] ? currentRoomData.gameType : "classic");
const pNode = (d, i) => (d && d["player" + i]) || null;
const activeSlots = d => d ? SLOTS.filter(i => d["player" + i] && !d["player" + i].left) : [];
function hostSlot(d) { const act = activeSlots(d), h = Number(d && d.host) || 1; return act.includes(h) ? h : (act[0] || h); }
const amHost = () => !!currentRoomData && hostSlot(currentRoomData) === Number(myPlayer);
const pName = (d, i) => (pNode(d, i) || {}).name || "Player " + i;
const pPub = (d, i) => pNode(d, i) || { name: "Player " + i };
function playerChip(d, p, prefix) {
    const s = hbEl("span", "pchip"); s.style.setProperty("--pc", HB_COLORS[(p - 1) % 6]);
    if (prefix) s.appendChild(hbEl("i", "pchip-pre", prefix));
    s.appendChild(avatarEl(pPub(d, p), { size: 26 })); s.appendChild(hbEl("b", null, pName(d, p)));
    return s;
}
function gwSeats(d) { const s = arr(d && d.gw && d.gw.seats).map(Number); return s.length === 2 ? s : [1, 2]; }
const gwOther = (d, p) => { const s = gwSeats(d); return s[0] === Number(p) ? s[1] : s[0]; };
function matchSeats(d) {
    if (!d) return [];
    switch (d.gameType) {
        case "uno": return arr(d.uno && d.uno.seats).map(Number);
        case "headbanz": return arr(d.hb && d.hb.players).map(Number);
        case "imposter": return arr(d.im && d.im.players).map(Number);
        default: return gwSeats(d);
    }
}
function inMatch(d) { if (!d || !d.status || d.status === "waiting") return false; return matchSeats(d).includes(Number(myPlayer)); }
function matchOver(d) {
    if (!d || !d.status || d.status === "waiting") return true;
    if (d.gameType === "uno") return !d.uno || d.uno.phase === "over";
    if (d.gameType === "headbanz") return !d.hb || d.hb.phase === "match";
    if (d.gameType === "imposter") return !d.im || d.im.phase === "match";
    return d.status === "finished";
}
let vxKey = "", introSeen = null;

/* ---------- small UI kit: overlays, confirm, toasts ---------- */
const overlayStack = [];
function openOverlay(id) {
    const el = $(id); if (!el) return;
    if (el.classList.contains("hidden")) { el.classList.remove("hidden"); overlayStack.push({ id, focus: document.activeElement }); sfx("open"); }
    setTimeout(() => { const f = el.querySelector("input:not([type=hidden]),button:not(.sheet-x)"); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }, 30);
}
function closeOverlay(id) {
    const el = $(id); if (!el || el.classList.contains("hidden")) return;
    el.classList.add("hidden"); sfx("close");
    const i = overlayStack.map(o => o.id).lastIndexOf(id);
    if (i >= 0) { const o = overlayStack.splice(i, 1)[0]; if (o.focus && o.focus.focus) try { o.focus.focus({ preventScroll: true }); } catch (e) {} }
}
window.closeOverlay = closeOverlay;
function closeAllOverlays() { ["pause", "settings", "profile", "confirm"].forEach(id => $(id).classList.add("hidden")); overlayStack.length = 0; $("emotePanel").classList.add("hidden"); }
let confirmResolve = null;
function uiConfirm({ title, text, ok = "OK", cancel = "Cancel", danger = false, info = false }) {
    if (confirmResolve) confirmResolve(false);
    $("confirmTitle").textContent = title || ""; $("confirmText").textContent = text || "";
    const yes = $("confirmYes"), no = $("confirmNo");
    yes.textContent = ok; no.textContent = cancel; no.classList.toggle("hidden", !cancel); yes.className = "btn" + (danger ? " danger" : ""); $("confirm").classList.toggle("info", info);
    openOverlay("confirm");
    return new Promise(res => {
        confirmResolve = v => { confirmResolve = null; closeOverlay("confirm"); res(v); };
        yes.onclick = () => confirmResolve && confirmResolve(true);
        no.onclick = () => confirmResolve && confirmResolve(false);
    });
}
document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (!$("emotePanel").classList.contains("hidden")) { $("emotePanel").classList.add("hidden"); return; }
    const top = overlayStack[overlayStack.length - 1];
    if (!top) { const pk = ["hbPicker", "imPicker", "unoColor", "unoTarget"].find(id => !$(id).classList.contains("hidden")); if (pk) { $(pk).classList.add("hidden"); unoPick = null; } return; }
    if (top.id === "confirm" && confirmResolve) confirmResolve(false); else closeOverlay(top.id);
});
["pause", "settings", "profile", "confirm"].forEach(id => $(id).addEventListener("click", e => { if (e.target === $(id)) { if (id === "confirm" && confirmResolve) confirmResolve(false); else closeOverlay(id); } }));
function achToast(a) {
    if (!a) return;
    const t = hbEl("div", "ach-toast"); t.append(hbEl("span", "ach-i", a.icon), (() => { const d = hbEl("div"); d.append(hbEl("small", null, "ACHIEVEMENT UNLOCKED"), hbEl("b", null, a.name)); return d; })());
    document.body.appendChild(t); sfx("achievement"); setTimeout(() => t.classList.add("out"), 3600); setTimeout(() => t.remove(), 4200);
}
const achNow = id => { const a = profile.unlock(id); if (a) { achToast(a); renderProfileCard(); } };
function recordOnce(key, mode, won, extra) {
    const k = "gw_rec_" + room + "_" + key;
    try { if (sessionStorage.getItem(k)) return null; sessionStorage.setItem(k, "1"); } catch (e) {}
    const r = profile.recordMatch(mode, won, extra || {});
    renderProfileCard(); syncMyProfile();
    return r;
}

/* ---------- menus ---------- */
window.openPause = function () {
    const d = currentRoomData, n = activeSlots(d).length;
    $("pauseKicker").textContent = "ROOM " + room;
    $("pauseNote").textContent = n + " player" + (n === 1 ? "" : "s") + " in the room" + (amHost() ? " · you are the host" : " · host: " + pName(d, hostSlot(d)));
    openOverlay("pause");
};
window.openSettings = function () {
    const s = audio.settings;
    $("setMaster").value = Math.round(s.master * 100); $("setMusic").value = Math.round(s.music * 100); $("setSfx").value = Math.round(s.sfx * 100);
    $("setMute").checked = !!s.mute; $("setMusicOn").checked = !!s.musicOn; $("setFx").checked = isReduced();
    ["Master", "Music", "Sfx"].forEach(k => { $("set" + k + "V").textContent = $("set" + k).value; });
    openOverlay("settings");
};
function bindSettings() {
    const vol = (id, key) => $(id).addEventListener("input", () => { $(id + "V").textContent = $(id).value; audio.set({ [key]: $(id).value / 100 }); });
    vol("setMaster", "master"); vol("setMusic", "music"); vol("setSfx", "sfx");
    ["setMaster", "setSfx"].forEach(id => $(id).addEventListener("change", () => sfx("pick")));
    $("setMute").addEventListener("change", () => audio.set({ mute: $("setMute").checked }));
    $("setMusicOn").addEventListener("change", () => audio.set({ musicOn: $("setMusicOn").checked }));
    $("setFx").addEventListener("change", () => setReduced($("setFx").checked));
}
let pendingAfterProfile = null;
window.openProfile = function () { openProfileEditor(); openOverlay("profile"); };
window.saveProfile = function () {
    if (!commitProfileEditor()) return;
    closeOverlay("profile"); renderProfileCard(); sfx("ready"); toast("Profile saved");
    const next = pendingAfterProfile; pendingAfterProfile = null; if (next) next();
};
let profileSyncT = 0;
function syncMyProfile() {
    clearTimeout(profileSyncT);
    profileSyncT = setTimeout(() => {
        if (!room || !myPlayer || !currentRoomData || !pNode(currentRoomData, myPlayer) || exiting) return;
        update(ref(db, "rooms/" + room + "/player" + myPlayer), profile.public()).catch(() => {});
    }, 300);
}
profile.onChange(() => { renderProfileCard(); syncMyProfile(); });
function needName(then) {
    if (profile.get().name) return false;
    pendingAfterProfile = then; openProfile(); toast("Pick a display name first.");
    return true;
}

/* ---------- emotes (one slot per player in the room, nothing to clean up) ---------- */
const EMOTES = ["🔥", "😂", "😱", "👏", "💀", "😤", "🤯", "❤️", "NANI?!", "GG", "DATTEBAYO!", "YARE YARE", "PLUS ULTRA!", "OMAE WA MOU…", "SUGOI!", "BAKA!"];
let emoteSeen = null, emoteLast = 0;
window.toggleEmotes = function () {
    const p = $("emotePanel");
    if (!p.childElementCount) EMOTES.forEach(e => { const b = hbEl("button", "emote-opt" + (e.length > 2 ? " txt" : ""), e); b.setAttribute("role", "menuitem"); b.onclick = () => sendEmote(e); p.appendChild(b); });
    p.classList.toggle("hidden"); if (!p.classList.contains("hidden")) { sfx("open"); const f = p.querySelector("button"); if (f) f.focus(); }
};
function sendEmote(e) {
    $("emotePanel").classList.add("hidden");
    if (!room || !myPlayer) return;
    if (Date.now() - emoteLast < 1500) { toast("Easy there. One reaction at a time."); return; }
    emoteLast = Date.now();
    update(ref(db, "rooms/" + room + "/emote"), { ["p" + myPlayer]: { e: e, t: Date.now() } }).catch(() => {});
    const a = profile.emoteSent(); if (a) achToast(a);
}
function emotesSync(d) {
    const em = d.emote || {};
    if (!emoteSeen) { emoteSeen = {}; SLOTS.forEach(i => { emoteSeen[i] = Number((em["p" + i] || {}).t) || 0; }); return; }
    SLOTS.forEach(i => {
        const x = em["p" + i]; if (!x || !x.t || Number(x.t) <= (emoteSeen[i] || 0)) return;
        emoteSeen[i] = Number(x.t);
        if (Math.abs(Date.now() - x.t) > 60000 || !EMOTES.includes(x.e) || !pNode(d, i)) return;
        showEmote(d, i, x.e);
    });
}
function showEmote(d, i, e) {
    const b = hbEl("div", "emote-bubble" + (e.length > 2 ? " txt" : ""));
    b.style.setProperty("--pc", HB_COLORS[(i - 1) % 6]);
    b.appendChild(avatarEl(pPub(d, i), { size: 28 })); b.appendChild(hbEl("span", "emote-e", e));
    const anchor = [...document.querySelectorAll('[data-emote="p' + i + '"]')].find(el => { const r = el.getBoundingClientRect(); return r.width && r.height && r.bottom > 0 && r.top < innerHeight; });
    if (anchor) { const r = anchor.getBoundingClientRect(); b.style.left = Math.min(innerWidth - 90, Math.max(10, r.left + r.width / 2)) + "px"; b.style.top = Math.max(60, r.top) + "px"; b.classList.add("anchored"); }
    $("emoteLayer").appendChild(b); sfx("emote");
    setTimeout(() => b.remove(), 2900);
}

/* ---------- create / join ---------- */
const PREF_KEY = "gw_lobby_prefs";
function lobbyPrefs() {
    let p = {}; try { p = JSON.parse(localStorage.getItem(PREF_KEY) || "{}") || {}; } catch (e) {}
    const gameType = MODES[p.gameType] ? p.gameType : "classic";
    return { gameType, animes: fixSeries(gameType, arr(p.animes).length ? arr(p.animes) : ["onepiece"]), boardSize: [24, 48, 96].includes(Number(p.boardSize)) ? Number(p.boardSize) : 24, difficulty: ["easy", "normal", "hard"].includes(p.difficulty) ? p.difficulty : "normal", rounds: [3, 5, 7, 10].includes(Number(p.rounds)) ? Number(p.rounds) : 5, laps: Number(p.laps) === 2 ? 2 : 1 };
}
function saveLobbyPrefs(d) { try { localStorage.setItem(PREF_KEY, JSON.stringify({ gameType: d.gameType, animes: arr(d.animes), boardSize: d.boardSize, difficulty: d.difficulty, rounds: d.rounds, laps: d.laps })); } catch (e) {} }
function busy(sel, on, label) {
    const b = document.querySelector(sel); if (!b) return;
    if (on) { b.dataset.label = b.dataset.label || b.innerHTML; b.disabled = true; b.textContent = label; b.setAttribute("aria-busy", "true"); }
    else { if (b.dataset.label) b.innerHTML = b.dataset.label; delete b.dataset.label; b.disabled = false; b.removeAttribute("aria-busy"); }
}
let creating = false;
window.createRoom = async function () {
    if (creating) return;
    if (needName(() => createRoom())) return;
    if (!user) { toast("Still connecting to the server. Try again in a moment."); return; }
    creating = true; sfx("click"); busy("#home .home-cta > .btn", true, "Creating…");
    try {
        let code = "";
        for (let t = 0; t < 5; t++) { code = generateCode(); const s = await get(ref(db, "rooms/" + code)); if (!s.exists()) break; }
        room = code; myPlayer = 1;
        const pref = lobbyPrefs();
        await set(ref(db, "rooms/" + room), Object.assign({ mode: mode, host: 1, status: "waiting", turn: 1, winner: null, result: null, createdAt: Date.now() }, pref, { player1: Object.assign({ uid: user.uid, ready: false }, profile.public()) }));
        saveSession(); sfx("join"); openLobby();
    } catch (e) { console.error(e); toast("Could not create the room: " + (e.message || e)); room = ""; myPlayer = null; }
    finally { creating = false; busy("#home .home-cta > .btn", false); }
};
let joining = false;
window.joinRoom = async function () {
    if (joining) return;
    const code = $("joinCode").value.trim().toUpperCase();
    if (needName(() => joinRoom())) return;
    if (code.length !== 6) { toast("Enter a 6-character room code."); $("joinCode").focus(); return; }
    if (!user) { toast("Still connecting to the server. Try again in a moment."); return; }
    joining = true; sfx("click"); busy("#joinArea .btn", true, "…");
    try {
        const snapshot = await get(ref(db, "rooms/" + code));
        if (!snapshot.exists()) { toast("Room not found. Check the code."); return; }
        const data = snapshot.val();
        for (const i of SLOTS) {        // coming back to a room you're already in = rejoin
            const p = data["player" + i];
            if (p && p.uid === user.uid) {
                room = code; myPlayer = i;
                await update(ref(db, "rooms/" + code + "/player" + i), Object.assign({ left: null }, profile.public()));
                saveSession(); openLobby(); toast("Welcome back!"); return;
            }
        }
        if (activeSlots(data).length >= 6) { toast("This room is full (6 players)."); return; }
        for (const slot of SLOTS) {
            if (data["player" + slot]) continue;
            const res = await runTransaction(ref(db, "rooms/" + code + "/player" + slot), cur => cur ? undefined : Object.assign({ uid: user.uid, ready: false }, profile.public()));
            if (res.committed) { room = code; myPlayer = slot; saveSession(); sfx("join"); openLobby(); return; }
        }
        toast("This room is full.");
    } catch (e) { console.error(e); toast("Couldn't join: " + (e.message || e)); }
    finally { joining = false; busy("#joinArea .btn", false); }
};

/* ---------- lobby ---------- */
function openLobby() {
    $("roomCode").textContent = room;
    try { history.replaceState(null, "", location.pathname + "?room=" + room); } catch (e) {}
    listenToRoom();
    startPresence();
    if (!currentRoomData) showOnly("lobby");
}
function lobbySet(patch) {
    if (!room || !currentRoomData || currentRoomData.status !== "waiting" || !amHost()) return;
    update(ref(db, "rooms/" + room), patch).catch(e => { console.error(e); toast("Couldn't save that setting."); });
}
function fixSeries(t, keys) {
    keys = arr(keys);
    if (t === "classic") { keys = keys.filter(k => ANIME_LIBRARY[k]); if (!keys.length) keys = ["onepiece"]; }
    else if (t === "uno") { keys = keys.filter(k => UNO_DECKS[k]).slice(0, 4); for (const k of ["onepiece", "naruto", "dragonball", "jjk", "demonslayer", "bleach"]) { if (keys.length >= 4) break; if (!keys.includes(k)) keys.push(k); } }
    else { keys = hbVisibleKeys(keys).filter(k => HB_SERIES[k]); if (!keys.length) keys = ["onepiece"]; }
    return keys;
}
function pickMode(t) {
    const d = currentRoomData; if (!d || d.status !== "waiting" || !MODES[t]) return;
    if (!amHost()) {
        const cur = (pNode(d, myPlayer) || {}).vote;
        update(ref(db, "rooms/" + room + "/player" + myPlayer), { vote: cur === t ? null : t }).catch(() => {});
        sfx("vote"); return;
    }
    if (d.gameType === t) return;
    sfx("pick");
    lobbySet({ gameType: t, animes: fixSeries(t, arr(d.animes)) });
}
window.toggleReady = function () {
    if (!room || !currentRoomData) return;
    const cur = !!(pNode(currentRoomData, myPlayer) || {}).lr;
    update(ref(db, "rooms/" + room + "/player" + myPlayer), { lr: !cur }).catch(() => {});
    sfx(cur ? "toggle" : "ready");
};
window.kickPlayer = async function (i) {
    const d = currentRoomData; if (!d || !amHost() || d.status !== "waiting" || i === Number(myPlayer)) return;
    if (!(await uiConfirm({ title: "Remove " + pName(d, i) + "?", text: "They go back to the main menu. They can rejoin with the room code.", ok: "Remove", danger: true }))) return;
    update(ref(db, "rooms/" + room), { ["player" + i]: null, ["presence/p" + i]: null, ["packs/p" + i]: null, ["emote/p" + i]: null }).catch(() => toast("Couldn't remove that player."));
};
function modeReq(d) {
    const t = MODES[d.gameType] ? d.gameType : "classic", M = MODES[t], n = activeSlots(d).length, keys = arr(d.animes);
    if (n < M.min) return { ok: false, msg: M.name + " needs " + (M.min === M.max ? "exactly " + M.min : M.min + " to " + M.max) + " players. " + n + " here, invite " + (M.min - n === 1 ? "one more" : (M.min - n) + " more") + "." };
    if (n > M.max) return { ok: false, msg: M.name + " seats up to " + M.max + " players (" + n + " here). Pick another mode." };
    if (!keys.length) return { ok: false, msg: "Pick at least one series." };
    if (t === "classic") { const tot = keys.reduce((s, k) => s + (ANIME_LIBRARY[k] || []).length, 0), size = Number(d.boardSize) || 24; if (tot < size) return { ok: false, msg: "Those series only have " + tot + " pictures. Tick more series or pick a smaller board." }; }
    if (t === "uno") {
        if (keys.length !== 4) return { ok: false, msg: "Anime UNO needs exactly 4 series (" + keys.length + "/4 ticked)." };
        if (!d.uno || !d.uno.cards || d.uno.key !== unoDeckKey(keys)) return { ok: false, wait: true, msg: amHost() ? "Forging the deck… " + (unoDeckPct || 1) + "%" : "The host is forging the deck…" };
    }
    if (t === "headbanz" || t === "imposter") {
        const packs = d.packs || {}, missing = activeSlots(d).filter(i => Number(packs["p" + i]) < 100 || packs["p" + i] == null);
        if (missing.length) return { ok: false, wait: true, msg: "Loading characters for " + missing.map(i => pName(d, i)).join(", ") + "…" };
    }
    const extra = t === "headbanz" ? (n === 2 ? " · duo, best of 3" : " · " + (d.rounds || 5) + " rounds") : t === "imposter" ? " · " + n * (Number(d.laps) || 1) + " rounds" : t === "classic" ? " · " + (d.boardSize || 24) + " cards" : " · " + arr(d.uno && d.uno.anime).join(" · ");
    return { ok: true, msg: M.name + extra };
}
let modeCardsBuilt = false, seatSig = "";
const seatSeen = new Set();
function buildModeCards() {
    if (modeCardsBuilt) return; modeCardsBuilt = true;
    const box = $("lobbyModes");
    Object.entries(MODES).forEach(([t, M]) => {
        const b = hbEl("button", "mode-card"); b.dataset.mode = t; b.style.setProperty("--mc", M.color);
        const art = hbEl("div", "mc-art"); M.art.forEach((src, i) => { const im = makeImg(src); im.style.setProperty("--i", i); art.appendChild(im); });
        b.append(art, hbEl("div", "mc-kanji", M.kanji), hbEl("div", "mc-tag", M.tag), hbEl("b", "mc-name", M.name), hbEl("p", "mc-blurb", M.blurb));
        const foot = hbEl("div", "mc-foot"); foot.append(hbEl("span", "mc-players", M.min === M.max ? M.min + " players" : M.min + "–" + M.max + " players"), hbEl("span", "mc-votes"));
        b.append(foot, hbEl("div", "mc-sel", "SELECTED"));
        b.onclick = () => pickMode(t);
        b.onmouseenter = () => sfx("hover");
        box.appendChild(b);
    });
}
function buildHomeModes() {
    const box = $("homeModes"); if (!box || box.childElementCount) return;
    Object.values(MODES).forEach((M, i) => {
        const c = hbEl("div", "hm-card"); c.style.setProperty("--mc", M.color); c.style.setProperty("--i", i);
        const art = hbEl("div", "hm-art"); art.appendChild(makeImg(M.art[0]));
        c.append(art, hbEl("div", "hm-kanji", M.kanji), hbEl("small", null, M.tag), hbEl("b", null, M.name), hbEl("span", "hm-pl", M.min === M.max ? M.min + "P" : M.min + "–" + M.max + "P"));
        const t = Object.keys(MODES).find(k => MODES[k] === M);
        c.tabIndex = 0; c.setAttribute("role", "button"); c.setAttribute("aria-label", M.name + ": how to play");
        c.onclick = () => { sfx("click"); showRules(t); }; c.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); c.click(); } };
        box.appendChild(c);
    });
}
function lobbyRefresh() { if (currentRoomData && !$("lobby").classList.contains("hidden")) lobbyRender(currentRoomData); }
let lobbyCountSeen = 0;
function lobbyRender(d) {
    const me = Number(myPlayer), host = amHost(), t = MODES[d.gameType] ? d.gameType : "classic", M = MODES[t], act = activeSlots(d), pres = d.presence || {}, packs = d.packs || {};
    const spectating = !!d.status && d.status !== "waiting";
    document.body.classList.toggle("is-host", host);
    $("roomCode").textContent = room;
    if (lobbyCountSeen && act.length > lobbyCountSeen) sfx("join"); else if (lobbyCountSeen && act.length < lobbyCountSeen) sfx("leave");
    lobbyCountSeen = act.length;
    // a match is running and I'm not in it (joined late, or seated out)
    const lm = $("lobbyMatch"); lm.classList.toggle("hidden", !spectating);
    if (spectating) { const G = MODES[d.gameType] || MODES.classic; lm.innerHTML = ""; lm.style.setProperty("--mc", G.color); lm.append(hbEl("span", "lm-k", G.kanji), hbEl("b", null, G.name + " match in progress"), hbEl("span", null, "You're in the room. You'll be dealt into the next match.")); }
    // seats
    const sig = JSON.stringify([act.map(i => { const p = d["player" + i]; return [i, p.name, p.av && (p.av.u || p.av.g || (p.av.d || "").length), p.col, p.fr, p.ttl, p.lvl, p.lr, p.vote, pres["p" + i], packs["p" + i]]; }), hostSlot(d), me, t, spectating]);
    if (sig !== seatSig) {
        seatSig = sig;
        const box = $("lobbySeats"); box.innerHTML = "";
        act.forEach(i => {
            const p = d["player" + i], isHost = i === hostSlot(d), off = pres["p" + i] === false;
            const s = hbEl("div", "seat" + (i === me ? " me" : "") + (off ? " off" : "") + (p.lr ? " rdy" : "") + (isHost ? " hosting" : "") + (seatSeen.has(p.uid) ? "" : " enter"));
            seatSeen.add(p.uid);
            s.style.setProperty("--pc", p.col || HB_COLORS[(i - 1) % 6]); s.dataset.emote = "p" + i;
            s.appendChild(avatarEl(p, { size: 60, badge: true }));
            const id = hbEl("div", "seat-id"); id.append(hbEl("b", null, p.name || "Player " + i), hbEl("small", null, (p.ttl || "Rookie") + (p.lvl ? " · LV " + p.lvl : "")));
            s.appendChild(id);
            const tags = hbEl("div", "seat-tags");
            if (isHost) tags.appendChild(hbEl("span", "tag host", "👑 HOST"));
            if (i === me) tags.appendChild(hbEl("span", "tag you", "YOU"));
            if (off) tags.appendChild(hbEl("span", "tag off", "OFFLINE"));
            else if ((t === "headbanz" || t === "imposter") && Number(packs["p" + i]) < 100) tags.appendChild(hbEl("span", "tag dl", "⬇ " + (Number(packs["p" + i]) || 0) + "%"));
            else if (p.lr) tags.appendChild(hbEl("span", "tag rdy", "✔ READY"));
            if (p.vote && MODES[p.vote]) { const v = hbEl("span", "tag vote", MODES[p.vote].kanji + " " + MODES[p.vote].name); v.style.setProperty("--mc", MODES[p.vote].color); tags.appendChild(v); }
            s.appendChild(tags);
            if (host && i !== me && !spectating) { const k = hbEl("button", "seat-kick", "✕"); k.setAttribute("aria-label", "Remove " + (p.name || "player")); k.onclick = () => kickPlayer(i); s.appendChild(k); }
            box.appendChild(s);
        });
        const want = Math.min(6, Math.max(M.max, act.length + 1));
        for (let k = act.length; k < want; k++) { const e = hbEl("button", "seat empty"); e.append(hbEl("span", "seat-plus", "+"), hbEl("span", null, k === act.length ? "Invite a friend" : "Open seat")); e.onclick = () => copyInviteLink(); box.appendChild(e); }
        $("seatCount").textContent = act.length + "/6";
    }
    // modes
    buildModeCards();
    document.querySelectorAll("#lobbyModes .mode-card").forEach(b => {
        const mt = b.dataset.mode, MM = MODES[mt], fits = act.length >= MM.min && act.length <= MM.max;
        b.classList.toggle("selected", mt === t); b.classList.toggle("unfit", !fits); b.disabled = spectating;
        b.setAttribute("aria-pressed", String(mt === t));
        b.querySelector(".mc-players").textContent = (MM.min === MM.max ? MM.min + " players" : MM.min + "–" + MM.max + " players") + (fits ? " ✓" : "");
        const vb = b.querySelector(".mc-votes"); vb.innerHTML = "";
        act.filter(i => (d["player" + i] || {}).vote === mt).forEach(i => vb.appendChild(avatarEl(d["player" + i], { size: 22 })));
    });
    $("modeVoteHint").textContent = host ? "you pick · others can vote" : "tap a mode to vote";
    // settings (host edits, everyone sees them live)
    applyModeUI(M.key);
    const keys = arr(d.animes), lock = !host || spectating;
    document.querySelectorAll("#animePoll input").forEach(i => { i.checked = keys.includes(i.value); i.disabled = lock; });
    $("lobbySettings").classList.toggle("locked", lock);
    boardSize = Number(d.boardSize) || 24;
    document.querySelectorAll("#sizeField .size").forEach(b => { b.classList.toggle("selected", b.id === "size" + boardSize); b.disabled = lock; });
    homeDiff = d.difficulty || "normal"; document.querySelectorAll(".dbtn").forEach(b => { b.classList.toggle("selected", b.dataset.d === homeDiff); b.disabled = lock; });
    homeRounds = Number(d.rounds) || 5; document.querySelectorAll(".rbtn").forEach(b => { b.classList.toggle("selected", Number(b.dataset.r) === homeRounds); b.disabled = lock; });
    homeLaps = Number(d.laps) || 1; document.querySelectorAll(".lapbtn").forEach(b => { b.classList.toggle("selected", Number(b.dataset.l) === homeLaps); b.disabled = lock; });
    applyModeUI(M.key);   // again, so the 4/4 counter reflects the boxes just ticked
    // background prep for the chosen mode
    if (!spectating && (t === "headbanz" || t === "imposter")) hbPrefetch(keys);
    if (!spectating && t === "uno" && host && keys.length === 4 && keys.every(k => UNO_DECKS[k]) && !(d.uno && d.uno.cards && d.uno.key === unoDeckKey(keys))) unoPrepDeck(keys);
    // status + start
    const req = modeReq(d), meNode = pNode(d, me) || {};
    $("lobbyStatus").textContent = spectating ? "Hang tight: the current match has to finish first." : req.ok ? (host ? "Ready: " + req.msg + ". Hit START when your squad is set." : "Ready: " + req.msg + ". Waiting for " + pName(d, hostSlot(d)) + " to start.") : req.msg;
    $("lobbyStatus").classList.toggle("ok", req.ok && !spectating);
    const sb = $("startButton");
    sb.classList.toggle("hidden", !host || spectating);
    sb.disabled = !req.ok; sb.textContent = req.ok ? "START " + M.name.toUpperCase() : req.wait ? "PREPARING…" : "START";
    sb.style.setProperty("--mc", M.color);
    const rb = $("readyBtn"); rb.classList.toggle("hidden", spectating); rb.classList.toggle("on", !!meNode.lr); rb.textContent = meNode.lr ? "✔ Ready" : "I'm ready";
}
$("animePoll").addEventListener("change", e => {
    const inp = e.target; if (!inp || inp.type !== "checkbox") return;
    const d = currentRoomData;
    if (!d || !amHost() || d.status !== "waiting") { if (d) { seatSig = ""; lobbyRender(d); } return; }
    const keys = [...document.querySelectorAll("#animePoll input:checked")].map(c => c.value);
    if (d.gameType === "uno" && keys.length > 4) { inp.checked = false; toast("Anime UNO uses exactly 4 series. Untick one first."); return; }
    if (!keys.length) { inp.checked = true; toast("Keep at least one series."); return; }
    sfx("toggle");
    lobbySet({ animes: keys });
});

/* ---------- start (host) ---------- */
window.startGame = async function () {
    const d = currentRoomData; if (!d || !amHost() || d.status !== "waiting") return;
    const req = modeReq(d); if (!req.ok) { toast(req.msg); return; }
    saveLobbyPrefs(d);
    const sb = $("startButton"); sb.disabled = true;
    try {
        if (d.gameType === "headbanz") return await hbStart();
        if (d.gameType === "imposter") return await imBegin("first");
        if (d.gameType === "uno") return await unoStart();
        return await gwStart();
    } finally { setTimeout(() => { if (sb) sb.disabled = false; }, 800); }
};
async function gwStart() {
    const d = currentRoomData, seats = activeSlots(d).slice(0, 2), keys = arr(d.animes), size = Number(d.boardSize) || 24;
    if (seats.length !== 2) { toast("Guess Who needs exactly 2 players."); return; }
    const first = seats[(Math.random() * 2) | 0];
    const upd = { gw: { seats: seats, first: first }, board: pickBalanced(keys, size).map((image, i) => ({ id: "c" + i, image })), boardSize: size, status: "selecting", turn: first,
        guess: null, revealed: null, private: null, winner: null, result: null, guessedCharacter: null, finishedAt: null, matchId: Date.now() };
    seats.forEach(i => { upd["player" + i + "/ready"] = false; });
    try { await update(ref(db, "rooms/" + room), upd); } catch (e) { console.error(e); toast("Could not start: " + (e.message || e)); }
}
function lobbyResetPatch(d, exclude) {
    const upd = { status: "waiting", board: null, gw: null, guess: null, revealed: null, private: null, winner: null, result: null, guessedCharacter: null, finishedAt: null, hb: null, im: null, turn: 1, matchId: null };
    if (d.uno) upd.uno = d.uno.cards ? { cards: d.uno.cards, anime: d.uno.anime || null, phase: "lobby", n: 0, key: d.uno.key || null, missing: d.uno.missing || null } : null;
    SLOTS.forEach(i => {
        const p = d["player" + i]; if (!p || i === exclude) return;
        if (p.left) { upd["player" + i] = null; upd["presence/p" + i] = null; upd["packs/p" + i] = null; upd["emote/p" + i] = null; }
        else { upd["player" + i + "/ready"] = false; upd["player" + i + "/lr"] = false; }
    });
    return upd;
}
window.backToLobby = async function (skipConfirm) {
    const d = currentRoomData; if (!d || !amHost()) { toast("Only the host can take everyone back to the lobby."); return; }
    if (d.status === "waiting") { closeOverlay("pause"); return; }
    if (!matchOver(d) && skipConfirm !== true && !(await uiConfirm({ title: "End the match for everyone?", text: "Everyone returns to the lobby, where you can change the mode or settings. Progress in this match is lost.", ok: "Back to lobby" }))) return;
    closeOverlay("pause");
    try { await update(ref(db, "rooms/" + room), lobbyResetPatch(d)); } catch (e) { console.error(e); toast("Couldn't return to the lobby."); }
};

/* ---------- leave / close ---------- */
function goHome(notice) {
    exiting = true;
    stopPresence(true);
    if (roomUnsubs.length) { roomUnsubs.forEach(f => { try { f(); } catch (e) {} }); roomUnsubs = []; }
    if (unsubReveal) { unsubReveal(); unsubReveal = null; }
    clearSession();
    try { if (notice) sessionStorage.setItem("gw_notice", notice); } catch (e) {}
    location.href = location.pathname;
}
window.leaveRoom = async function () {
    const d = currentRoomData;
    if (!d || !room) { goHome(); return; }
    const me = Number(myPlayer), others = activeSlots(d).filter(i => i !== me), host = amHost();
    const text = !others.length ? "You're the last one here, so the room closes." : host ? "Hosting passes to " + pName(d, others[0]) + ". The room stays open for everyone else." : "The room stays open for everyone else. You can rejoin with code " + room + ".";
    if (!(await uiConfirm({ title: "Leave the room?", text: text, ok: "Leave", danger: true }))) return;
    exiting = true; closeAllOverlays(); sfx("leave");
    try {
        stopPresence(true);
        if (!others.length) await remove(ref(db, "rooms/" + room));
        else {
            const mid = d.status !== "waiting" && inMatch(d) && !matchOver(d), gw = (d.gameType || "classic") === "classic";
            let upd = {};
            if (mid && gw) upd = lobbyResetPatch(d, me);            // a duel can't go on with one player: everyone back to the lobby
            if (mid && !gw) { upd["player" + me + "/left"] = true; upd["presence/p" + me] = false; }   // the round treats me as gone
            else { upd["player" + me] = null; upd["presence/p" + me] = null; upd["packs/p" + me] = null; upd["emote/p" + me] = null; }
            if (host) upd.host = others[0];
            if (d.private && d.private[user.uid] && !(mid && gw)) upd["private/" + user.uid] = null;
            await update(ref(db, "rooms/" + room), upd);
        }
    } catch (e) { console.error("Leave failed:", e); }
    goHome("You left the room.");
};
window.exitGame = window.leaveRoom;          // older buttons
window.closeRoom = async function () {
    if (!amHost()) return;
    if (!(await uiConfirm({ title: "Close the room?", text: "Everyone is sent back to the main menu and code " + room + " stops working.", ok: "Close room", danger: true }))) return;
    exiting = true; closeAllOverlays(); stopPresence(true);
    try { await remove(ref(db, "rooms/" + room)); } catch (e) { console.error("Could not delete room:", e); }
    goHome("Room closed.");
};

/* ---------- the one room listener + router ---------- */
let roomUnsubs = [], listeningRoom = "";
function listenToRoom() {
    if (listeningRoom === room && roomUnsubs.length) return;
    roomUnsubs.forEach(f => { try { f(); } catch (e) {} }); roomUnsubs = []; listeningRoom = room;
    const roomRef = ref(db, "rooms/" + room);
    roomUnsubs.push(onValue(roomRef, snapshot => {
        if (exiting) return;
        if (!snapshot.exists()) { goHome(currentRoomData ? "The host closed the room." : "That room no longer exists."); return; }
        const d = snapshot.val();
        // find myself (slot by uid). Gone = removed by the host.
        let mine = pNode(d, myPlayer);
        if (!mine || mine.uid !== user.uid) { const s = SLOTS.find(i => d["player" + i] && d["player" + i].uid === user.uid); if (s) { myPlayer = s; saveSession(); startPresence(); mine = pNode(d, s); } }
        if (!mine) { goHome("You were removed from the room."); return; }
        if (mine.left) { goHome("You left the room."); return; }
        currentRoomData = d;
        if (d.boardSize) boardSize = Number(d.boardSize);
        document.body.classList.toggle("is-host", amHost());
        applyTheme(); updatePresenceBanner(d); winSoundPreload(d.animes); musicSync(d); emotesSync(d);
        hostDuties(d);
        route(d);
    }));
    // Classic guesses: the player whose secret is being guessed validates it with their own private data.
    const guessRef = ref(db, "rooms/" + room + "/guess");
    let lastProcessedGuess = null;
    roomUnsubs.push(onValue(guessRef, async snapshot => {
        if (!snapshot.exists() || exiting) return;
        const guess = snapshot.val(), key = String(guess.timestamp || "");
        if (!key || key === lastProcessedGuess) return;
        lastProcessedGuess = key;
        const d = currentRoomData;
        if (!d || d.status !== "playing" || d.gameType === "uno" || d.gameType === "imposter") return;
        const hbRoom = d.gameType === "headbanz";
        if (hbRoom ? Number(guess.player) !== Number(myPlayer) : Number(guess.player) === Number(myPlayer)) return;
        if (!hbRoom && !gwSeats(d).includes(Number(myPlayer))) return;        // spectators never judge
        try {
            let correct;
            if (hbRoom) {
                correct = String(d.hb["p" + guess.player]) === String(guess.characterId);
                if (!correct) { await update(ref(db, "rooms/" + room), { guess: null, turn: Number(guess.player) === 1 ? 2 : 1, ["hb/wrong/w" + Date.now()]: { p: Number(guess.player), c: guess.characterId } }); return; }
            } else {
                const secretSnapshot = await get(ref(db, "rooms/" + room + "/private/" + user.uid + "/secret"));
                if (!secretSnapshot.exists()) throw new Error("Your secret character could not be found.");
                correct = String(secretSnapshot.val().id) === String(guess.characterId);
            }
            const winner = correct ? Number(guess.player) : Number(myPlayer), loser = gwOther(d, winner);
            const wn = pNode(d, winner) || {}, ln = pNode(d, loser) || {}, streak = (Number(wn.streak) || 0) + 1;
            const updates = { status: "finished", winner: winner, result: correct ? "correct" : "wrong", guessedCharacter: guess.characterId, finishedAt: Date.now(), guess: null };
            updates["player" + winner + "/wins"] = (Number(wn.wins) || 0) + 1;
            updates["player" + winner + "/streak"] = streak;
            updates["player" + winner + "/best"] = Math.max(Number(wn.best) || 0, streak);
            if (ln.uid) updates["player" + loser + "/streak"] = 0;
            await update(ref(db, "rooms/" + room), updates);
        } catch (e) {
            console.error("Guess validation failed:", e);
            $("gameStatus").textContent = "Guess failed: " + (e.message || "Firebase error");
        }
    }));
}
let guardKey = "";
function hostDuties(d) {
    if (!amHost() || exiting) return;
    const me = Number(myPlayer);
    if (Number(d.host) !== me) update(ref(db, "rooms/" + room), { host: me }).catch(() => {});     // hosting moved to me
    if (!d.status || d.status === "waiting") {
        const gone = SLOTS.filter(i => d["player" + i] && d["player" + i].left);
        if (gone.length) { const upd = {}; gone.forEach(i => { upd["player" + i] = null; upd["presence/p" + i] = null; upd["packs/p" + i] = null; upd["emote/p" + i] = null; }); update(ref(db, "rooms/" + room), upd).catch(() => {}); }
        return;
    }
    if (matchOver(d)) return;
    const t = d.gameType || "classic", live = matchSeats(d).filter(i => d["player" + i] && !d["player" + i].left), min = t === "imposter" ? 3 : 2;
    if (live.length < min) {
        const k = "g" + d.matchId; if (guardKey === k) return; guardKey = k;
        toast("Not enough players left for this match. Back to the lobby.");
        update(ref(db, "rooms/" + room), lobbyResetPatch(d)).catch(() => {});
        return;
    }
    if (t === "uno" && d.uno && d.uno.phase === "play") {
        const tp = Number(d.uno.turn);
        if (d["player" + tp] && d["player" + tp].left) unoTx(u => { if (u.phase !== "play" || u.turn !== tp) return false; u.drew = null; u.msg = u.names["p" + tp] + " left, turn skipped."; u.turn = unoAdv(u, tp, 1); u.n++; });
    }
}
function resetMatchState() {
    guessMode = false; awaitingGuess = false; resultShown = false; gameScreenWasShown = false; renderedBoardSignature = ""; lastSfxTurn = null;
    if (unsubReveal) { unsubReveal(); unsubReveal = null; }
    unoSeen = { n: -1, over: "", hl: -1, top: -1, round: -1, ev: null, turn: 0 }; unoPick = null; unoFx.clear();
    hbRoundKey = ""; hbSig = ""; imSig = ""; hbSeen = { wrong: 0, order: 0, done: false, phase: "" }; imSeen = { phase: "", round: 0 };
    ["hbPicker", "imPicker", "unoColor", "unoTarget", "unoOver"].forEach(id => $(id).classList.add("hidden"));
    ["unoFx", "unoPeek"].forEach(id => { const e = $(id); if (e) e.remove(); });
    $("rematchPanel").classList.add("hidden"); $("oppBanner").classList.add("hidden");
    closeResults(); vxKey = "";
}
function matchIntro(d) {
    if (!d.matchId || introSeen === d.matchId) return;
    const fresh = Math.abs(Date.now() - Number(d.matchId)) < 15000;
    introSeen = d.matchId;
    if (!fresh || !inMatch(d)) return;
    const M = MODES[d.gameType] || MODES.classic;
    sfx("start");
    titleCard({ kicker: M.tag, title: M.name.toUpperCase(), sub: d.gameType === "uno" ? arr(d.uno && d.uno.anime).join(" · ") : M.sub, kanji: M.kanji, color: M.color, ms: 1900 });
}
let lastStatus = "";
function route(d) {
    const st = d.status || "waiting";
    if (st === "waiting" || !inMatch(d)) {
        if ($("lobby").classList.contains("hidden")) { resetMatchState(); showOnly("lobby"); seatSig = ""; }
        lastStatus = st; lobbyRender(d); return;
    }
    if (lastStatus === "waiting" || lastStatus === "") { resetMatchState(); }
    lastStatus = st;
    matchIntro(d);
    if (d.gameType === "uno") { showUNO(d); return; }
    if (d.gameType === "headbanz") { showHB(d); return; }
    if (d.gameType === "imposter") { showIM(d); return; }
    if (st === "selecting") {
        if (!$("result").classList.contains("hidden")) { closeResults(); resultShown = false; }
        if ($("secret").classList.contains("hidden")) showSecretScreen(d);
        else secretWaitUpdate(d);
        const seats = gwSeats(d);
        if (amHost() && seats.every(s => pNode(d, s) && pNode(d, s).ready === true)) beginPlaying();
        return;
    }
    if (st === "playing") { showGameScreen(d); return; }
    if (st === "finished") showResultScreen(d);
}

/* =========================================
   GUESS WHO: SECRET PICK
========================================= */
function showSecretScreen(d) {
    resultShown = false; lastSfxTurn = null; showOnly("secret");
    const grid = $("secretGrid"); grid.innerHTML = "";
    board = d.board || [];
    preloadImages(board.map(c => c.image));
    selectedSecret = null;
    const head = document.querySelector("#secret .secret-head"), opp = gwOther(d, myPlayer);
    let vs = head.querySelector(".secret-vs"); if (!vs) { vs = hbEl("div", "secret-vs"); head.insertBefore(vs, head.firstChild); }
    vs.innerHTML = ""; vs.append(playerChip(d, Number(myPlayer)), hbEl("i", "vs-x", "VS"), playerChip(d, opp));
    $("confirmSecret").classList.remove("hidden"); $("confirmSecret").disabled = true;
    const me = pNode(d, myPlayer);
    if (me && me.ready) { waitForBothPlayers(); return; }       // refreshed after already picking
    board.forEach((character, index) => {
        const card = document.createElement("div");
        card.className = "secret-card"; card.style.setProperty("--i", index % 24); card.tabIndex = 0; card.setAttribute("role", "button");
        card.appendChild(makeImg(character.image)); addName(card, character.image);
        const choose = () => {
            document.querySelectorAll(".secret-card").forEach(c => c.classList.remove("selected"));
            card.classList.add("selected"); selectedSecret = index; sfx("pick");
            $("confirmSecret").disabled = false;
        };
        card.onclick = choose; card.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(); } };
        grid.appendChild(card);
    });
}
window.confirmSecret = async function () {
    if (selectedSecret === null) return;
    const secret = board[selectedSecret]; if (!secret) return;
    $("confirmSecret").disabled = true;
    try {
        await set(ref(db, "rooms/" + room + "/private/" + user.uid), { secret: secret });
        await set(ref(db, "rooms/" + room + "/player" + myPlayer + "/ready"), true);
        sfx("stamp"); waitForBothPlayers();
    } catch (e) { console.error(e); toast("Couldn't lock in your character. Try again."); $("confirmSecret").disabled = false; }
};
// (the room router starts the match once both secrets are in; no extra listener here)
function waitForBothPlayers() {
    const grid = $("secretGrid"); grid.innerHTML = "";
    $("confirmSecret").classList.add("hidden");
    const sec = board[selectedSecret];
    const box = hbEl("div", "secret-wait");
    if (sec) { const pic = hbEl("div", "secret-locked"); pic.appendChild(makeImg(sec.image)); pic.appendChild(hbEl("span", "stamp-txt", "LOCKED")); box.appendChild(pic); }
    const msg = hbEl("p", "secret-wait-msg", "Waiting for your opponent to choose…"); msg.id = "waitingMessage"; box.appendChild(msg);
    grid.appendChild(box);
    if (currentRoomData) secretWaitUpdate(currentRoomData);
}
function secretWaitUpdate(d) {
    const m = $("waitingMessage"); if (!m) return;
    const opp = gwOther(d, myPlayer), ready = (pNode(d, opp) || {}).ready === true;
    m.textContent = ready ? pName(d, opp) + " is locked in too. Opening the case…" : "Waiting for " + pName(d, opp) + " to choose…";
}

/* =========================================
   GUESS WHO: PLAYING
========================================= */
let gameScreenWasShown = false;
let renderedBoardSignature = "";
let resultShown = false;
async function beginPlaying() {
    const d = currentRoomData;
    if (!d || !amHost() || d.status !== "selecting") return;
    resultShown = false;
    await update(ref(db, "rooms/" + room), { status: "playing", turn: Number((d.gw || {}).first) || gwSeats(d)[0], guess: null }).catch(() => {});
}
function showGameScreen(data) {
    const gameElement = $("game"), wasVisible = !gameElement.classList.contains("hidden");
    showOnly("game");
    const newBoard = Array.isArray(data.board) ? data.board : arr(data.board);
    const signature = newBoard.map(c => c.id).join("|");
    if (!wasVisible || !gameScreenWasShown || signature !== renderedBoardSignature) { board = newBoard; renderBoard(); renderedBoardSignature = signature; }
    else board = newBoard;
    gameScreenWasShown = true;
    updateGameHeader(data);
}
function boardSig() {
    const str = board.map(c => c.image).join("|"); let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return String(h);
}
function saveElim() {
    try {
        const list = [...document.querySelectorAll("#board .card")].map((c, i) => c.classList.contains("eliminated") ? i : -1).filter(i => i >= 0);
        localStorage.setItem("gw_elim_" + room, JSON.stringify({ sig: boardSig(), list }));
    } catch (e) {}
}
/* ---- prank: one specific character shows another picture when crossed out ---- */
const PRANK_TARGET = "images/anime/jjk/jk19.jpg";   // the card that triggers it
const PRANK_IMAGE  = "images/prank.jpg";            // <- put your uploaded image here
function prankKey() { return "gw_prank_" + room + "_" + boardSig(); }
function prankState() { try { return localStorage.getItem(prankKey()); } catch (e) { return null; } }
function setPrankState(v) { try { localStorage.setItem(prankKey(), v); } catch (e) {} }
/* once per game: null -> "active" (first cross-out) -> "done" (after un-crossing). A new game has a new board, so it resets. */
function applyPrank(card) {
    const img = card.querySelector("img");
    if (!img || !(card.dataset.src || "").endsWith(PRANK_TARGET)) return;
    const st = prankState();
    if (card.classList.contains("eliminated")) {
        if (st === "done") return;
        setPrankState("active");
        img.onerror = () => { img.onerror = null; card.classList.remove("prank"); img.src = card.dataset.src; };
        card.classList.add("prank"); img.src = PRANK_IMAGE;
    } else {
        if (st === "active") setPrankState("done");
        img.onerror = null; card.classList.remove("prank"); img.src = card.dataset.src;
    }
}
function suspectsLeft() { return document.querySelectorAll("#board .card:not(.eliminated)").length; }
function flipCard(card) {
    if (card.classList.contains("flipping")) return;
    card.classList.add("flipping");
    const out = !card.classList.contains("eliminated");
    sfx(out ? "stamp" : "flip");
    setTimeout(() => { card.classList.toggle("eliminated"); applyPrank(card); saveElim(); gwDuelRender(currentRoomData); }, 150);
    setTimeout(() => card.classList.remove("flipping"), 360);
}
window.toggleNames = function () {
    namesOn = !namesOn;
    try { localStorage.setItem("gw_names", namesOn ? "1" : "0"); } catch (e) {}
    $("board").classList.toggle("show-names", namesOn);
};
function renderBoard() {
    const element = $("board");
    element.innerHTML = "";
    element.className = "board size" + boardSize + (namesOn ? " show-names" : "");
    $("namesButton").classList.toggle("hidden", !HAS_NAMES());
    let elim = [];
    try { const d = JSON.parse(localStorage.getItem("gw_elim_" + room) || "null"); if (d && d.sig === boardSig()) elim = d.list || []; } catch (e) {}
    board.forEach((character, index) => {
        const card = document.createElement("div");
        card.className = "card"; card.dataset.index = index; card.dataset.src = character.image; card.style.setProperty("--i", index % 24);
        card.tabIndex = 0; card.setAttribute("role", "button");
        if (elim.includes(index)) card.classList.add("eliminated");
        card.appendChild(makeImg(character.image));
        card.appendChild(hbEl("span", "elim-stamp", "OUT"));
        applyPrank(card);
        addName(card, character.image);
        const act = () => {
            if (guessMode) { makeGuess(index); return; }
            if (!currentRoomData || Number(currentRoomData.turn) !== Number(myPlayer)) { shake(card, 4, 200); return; }
            flipCard(card);
        };
        card.onclick = act; card.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } };
        element.appendChild(card);
    });
}
function gwDuelRender(data) {
    const box = $("gwDuel"); if (!box || !data) return;
    box.innerHTML = "";
    const seats = gwSeats(data), turn = Number(data.turn), tc = (data.gw && data.gw.tc) || {};
    seats.forEach((s, k) => {
        const c = hbEl("div", "duel" + (turn === s ? " on" : "") + (s === Number(myPlayer) ? " me" : "")); c.dataset.emote = "p" + s;
        c.style.setProperty("--pc", (pNode(data, s) || {}).col || HB_COLORS[(s - 1) % 6]);
        c.appendChild(avatarEl(pPub(data, s), { size: 42, badge: true }));
        const id = hbEl("div", "duel-id"); id.appendChild(hbEl("b", null, pName(data, s)));
        id.appendChild(hbEl("small", null, s === Number(myPlayer) ? suspectsLeft() + " suspects left" : "turns: " + ((Number(tc["p" + s]) || 0) + (turn === s ? 1 : 0))));
        c.appendChild(id); box.appendChild(c);
        if (k === 0) box.appendChild(hbEl("i", "duel-vs", "VS"));
    });
}
function updateGameHeader(data) {
    const turnPlayer = Number(data.turn);
    $("turnText").textContent = turnPlayer === Number(myPlayer) ? "Your turn" : pName(data, turnPlayer) + "'s turn";
    gwDuelRender(data);
    const guessButton = $("guessButton"), endButton = $("endTurnButton"), status = $("gameStatus");
    const mine = turnPlayer === Number(myPlayer);
    // A guess we submitted re-fires this before the opponent has verified anything: keep the waiting UI.
    if (awaitingGuess) return;
    if (mine && lastSfxTurn !== turnPlayer) { sfx("turn"); if (lastSfxTurn != null) burstText("YOUR TURN", innerWidth / 2, 140, "#f2b33d"); }
    lastSfxTurn = turnPlayer;
    guessButton.disabled = !mine; endButton.disabled = !mine;
    $("game").classList.toggle("myturn", mine);
    if (!mine) {
        guessMode = false; $("board").classList.remove("guess-mode");
        guessButton.textContent = "🎯 ACCUSE";
        status.textContent = pName(data, turnPlayer) + " is asking. Answer out loud, then wait for your turn.";
    } else if (!guessMode) status.textContent = "Ask a yes/no question, flip down who it rules out, then end your turn.";
}
window.endTurn = async function () {
    const d = currentRoomData;
    if (!d || d.status !== "playing" || Number(d.turn) !== Number(myPlayer)) return;
    const next = gwOther(d, myPlayer), me = Number(myPlayer), tc = Number(((d.gw || {}).tc || {})["p" + me]) || 0;
    guessMode = false; $("board").classList.remove("guess-mode"); $("guessButton").textContent = "🎯 ACCUSE";
    $("endTurnButton").disabled = true; $("gameStatus").textContent = "Ending turn..."; sfx("whoosh");
    try {
        await update(ref(db, "rooms/" + room), { turn: next, guess: null, ["gw/tc/p" + me]: tc + 1 });
        currentRoomData.turn = next;
        updateGameHeader(currentRoomData);
    } catch (e) {
        console.error("End turn failed:", e);
        $("gameStatus").textContent = "Could not end turn: " + (e.message || "Firebase error");
        updateGameHeader(currentRoomData);
    }
};
window.toggleGuess = function () {
    const d = currentRoomData;
    if (!d || d.status !== "playing" || Number(d.turn) !== Number(myPlayer)) return;
    guessMode = !guessMode;
    $("board").classList.toggle("guess-mode", guessMode);
    $("guessButton").textContent = guessMode ? "✖ CANCEL" : "🎯 ACCUSE";
    $("gameStatus").textContent = guessMode ? "Accusation mode: tap the character you think they picked. A wrong accusation loses the match!" : "Ask a yes/no question, flip down who it rules out, then end your turn.";
    sfx(guessMode ? "guess" : "close");
};
async function makeGuess(index) {
    const d = currentRoomData;
    if (!guessMode || !d || d.status !== "playing" || Number(d.turn) !== Number(myPlayer)) return;
    const character = board[index]; if (!character) return;
    const who = nameOf(character.image);
    if (!(await uiConfirm({ title: "Final accusation?", text: (who ? "Accuse " + who + "? " : "Accuse this character? ") + "If you're wrong, " + pName(d, gwOther(d, myPlayer)) + " wins the match.", ok: "🎯 Accuse", danger: true }))) return;
    if (!guessMode || currentRoomData.status !== "playing") return;
    sfx("impact");
    guessMode = false; awaitingGuess = true;
    $("board").classList.remove("guess-mode");
    $("guessButton").disabled = true; $("endTurnButton").disabled = true; $("guessButton").textContent = "🎯 ACCUSE";
    $("gameStatus").textContent = "Checking your accusation...";
    const card = document.querySelector('#board .card[data-index="' + index + '"]'); if (card) card.classList.add("accused");
    try {
        await set(ref(db, "rooms/" + room + "/guess"), { player: Number(myPlayer), characterId: character.id, timestamp: Date.now() });
        $("gameStatus").textContent = "Waiting for the verdict...";
    } catch (e) {
        console.error("Guess submission failed:", e);
        awaitingGuess = false;
        $("gameStatus").textContent = "Could not submit guess: " + (e.message || "Firebase error");
        updateGameHeader(currentRoomData);
    }
}
const GW_IDEAS = ["Is your character a villain?", "Does your character use a sword?", "Is your character from Naruto?", "Does your character have spiky hair?", "Is your character a main character?", "Does your character wear a hat?", "Is your character's hair dark?", "Does your character have a scar?",
    "Can your character fly?", "Is your character a teacher or mentor?", "Does your character wear glasses?", "Is your character a woman?", "Does your character have red in their outfit?", "Is your character smiling in the picture?", "Is your character a demon, hollow or curse?",
    "Does your character have a transformation?", "Is your character from One Piece?", "Does your character have long hair?", "Is your character a captain or leader?", "Does your character use fire?", "Is your character a kid or teen?", "Does your character have an animal companion?",
    "Is your character dead at some point?", "Does your character wear a uniform?", "Is your character blond?", "Does your character have unusual eyes?", "Is your character known for comedy?", "Does your character have facial markings?"];
window.gwIdeas = function () {
    let pop = $("gwIdeasPop");
    if (pop) { pop.remove(); return; }
    pop = hbEl("div", "ideas-pop"); pop.id = "gwIdeasPop";
    pop.appendChild(hbEl("small", null, "QUESTION IDEAS"));
    shuffle(GW_IDEAS).slice(0, 4).forEach(q => pop.appendChild(hbEl("p", null, q)));
    const more = hbEl("button", "pop secondary", "Shuffle"); more.onclick = () => { pop.remove(); gwIdeas(); };
    pop.appendChild(more); document.body.appendChild(pop); sfx("open");
    setTimeout(() => { if (pop.isConnected) pop.remove(); }, 12000);
};

/* =========================================
   GUESS WHO: RESULTS
========================================= */
function matchActions({ again, details }) {
    const a = [];
    if (again) a.push({ label: again.label, kind: "xl", onClick: again.fn });
    if (amHost()) a.push({ label: "Back to lobby", kind: "alt", onClick: () => backToLobby(true) });
    if (details) a.push({ label: "Scoreboard", kind: "ghost", onClick: () => closeResults() });
    a.push({ label: "Leave room", kind: "ghost", onClick: () => leaveRoom() });
    return a;
}
function endButtons(final) {
    const w = hbEl("div", "end-btns");
    if (amHost()) { const b = hbEl("button", "pop secondary", "↩ BACK TO LOBBY"); b.onclick = () => backToLobby(final === true); w.appendChild(b); }
    const l = hbEl("button", "pop ghost", "LEAVE ROOM"); l.onclick = () => leaveRoom(); w.appendChild(l);
    return w;
}
function winSoundForChar(c, won) {
    if (!c) return;
    const key = Object.keys(HB_SERIES).find(k => HB_SERIES[k].label === c.s);
    winCelebrate(key, won);
}
async function showResultScreen(data) {
    if (resultShown) return;
    resultShown = true; winSoundDone = false;
    guessMode = false; awaitingGuess = false; gameScreenWasShown = false; renderedBoardSignature = "";
    showOnly("result");
    $("rematchPanel").classList.add("hidden");
    const me = Number(myPlayer), w = Number(data.winner), opp = gwOther(data, me), iWon = w === me;
    const msg = data.result === "correct"
        ? (iWon ? "You read them perfectly. Case closed." : pName(data, w) + " guessed your character.")
        : (iWon ? "They accused the wrong character. You win!" : "Wrong accusation. " + pName(data, w) + " takes the round.");
    // reveal: both secret characters, face down until each player reveals theirs
    const rev = hbEl("div", "versus");
    [me, opp].forEach((s, k) => {
        const f = hbEl("div", "fighter" + (s === w ? " champ" : "")); f.style.setProperty("--pc", (pNode(data, s) || {}).col || HB_COLORS[(s - 1) % 6]);
        const who = hbEl("div", "who"); who.appendChild(avatarEl(pPub(data, s), { size: 34 })); who.appendChild(hbEl("b", null, (s === me ? "Your" : pName(data, s) + "'s") + " secret"));
        const por = hbEl("div", "portrait"); const img = new Image(); img.alt = ""; img.id = "resultImg_" + s; por.appendChild(img);
        f.append(who, por, Object.assign(hbEl("div", "cap", "???"), { id: "resultCap_" + s }));
        rev.appendChild(f);
        if (k === 0) rev.appendChild(hbEl("div", "vs", "VS"));
    });
    const myTurns = (Number(((data.gw || {}).tc || {})["p" + me]) || 0) + 1, mine = pNode(data, me) || {}, theirs = pNode(data, opp) || {};
    const prog = recordOnce("gw:" + (data.matchId || "") + ":" + (data.finishedAt || ""), "gw", iWon, { ach: iWon ? ["gw_win"].concat(myTurns <= 3 ? ["gw_fast"] : []) : [] });
    showResults({
        mount: $("resultStage"), outcome: iWon ? "win" : "lose", mode: "gw", color: "#f2b33d", kicker: "CASE FILE · VERDICT",
        title: iWon ? "CASE CLOSED" : "DEFEAT", kanji: iWon ? "勝利" : "敗北", subtitle: msg, reveal: rev,
        chips: [["ROOM WINS · " + pName(data, me), Number(mine.wins) || 0], ["ROOM WINS · " + pName(data, opp), Number(theirs.wins) || 0], ["YOUR STREAK", "🔥 " + (Number(mine.streak) || 0)], ["BEST STREAK", Number(mine.best) || 0]],
        progress: prog,
        actions: [{ label: "🔄 Rematch", kind: "xl", onClick: () => rematch(true) }, { label: "Rematch with changes", kind: "ghost", onClick: () => openRematch() }].concat(matchActions({}))
    });
    // Each player reveals their own secret only after the match ends.
    try {
        const snap = await get(ref(db, "rooms/" + room + "/private/" + user.uid + "/secret"));
        if (snap.exists()) await set(ref(db, "rooms/" + room + "/revealed/player" + myPlayer), snap.val());
    } catch (error) { console.error("Could not reveal your character:", error); }
    if (unsubReveal) unsubReveal();
    unsubReveal = onValue(ref(db, "rooms/" + room + "/revealed"), snapshot => {
        const revealed = snapshot.val() || {};
        if (!winSoundDone) {
            const who = WIN_SOUND_CLASSIC_USES === "guessed" ? gwOther(data, w) : w, rw = revealed["player" + who];
            if (rw && rw.image) { winSoundDone = true; winCelebrate(seriesKeyFromImage(rw.image), iWon); }
        }
        gwSeats(data).forEach(n => {
            const r = revealed["player" + n], img = $("resultImg_" + n);
            if (r && img && !img.src) { applyImg(img, r.image); img.closest(".portrait").classList.add("flip-in"); $("resultCap_" + n).textContent = nameOf(r.image) || "Secret character"; sfx("reveal"); }
        });
    });
}
window.setRematchSize = function (n) {
    rematchSize = Number(n);
    document.querySelectorAll("#rematchPanel .rs").forEach(b => b.classList.toggle("selected", Number(b.dataset.n) === rematchSize));
};
window.openRematch = function () {
    const panel = $("rematchPanel");
    panel.classList.toggle("hidden");
    if (panel.classList.contains("hidden")) return;
    const cur = (currentRoomData && arr(currentRoomData.animes)) || [];
    document.querySelectorAll("#rematchPoll input").forEach(cb => { cb.checked = cur.includes(cb.value); });
    setRematchSize(boardSize);
    panel.scrollIntoView({ behavior: motionOK() ? "smooth" : "auto", block: "center" });
};
window.rematch = async function (quick) {
    const d = currentRoomData; if (!d) return;
    let keys = arr(d.animes), size = Number(d.boardSize) || 24;
    if (quick !== true) {
        keys = [...document.querySelectorAll("#rematchPoll input:checked")].map(c => c.value); size = rematchSize;
        if (!keys.length) { toast("Pick at least one series."); return; }
    }
    const total = keys.reduce((n, k) => n + (ANIME_LIBRARY[k] || []).length, 0);
    if (total < size) { toast("Those series don't have " + size + " images."); return; }
    const seats = gwSeats(d);
    if (seats.some(s => !pNode(d, s) || pNode(d, s).left)) { toast("Your opponent left. Head back to the lobby to pick a new match."); return; }
    const first = Number(d.winner) ? gwOther(d, d.winner) : seats[0];      // the loser opens the next case
    const upd = { status: "selecting", board: pickBalanced(keys, size).map((image, i) => ({ id: "c" + i, image })), boardSize: size, animes: keys,
        winner: null, result: null, guessedCharacter: null, finishedAt: null, guess: null, revealed: null, turn: first, "gw/first": first, "gw/tc": null, matchId: Date.now() };
    seats.forEach(s => { upd["player" + s + "/ready"] = false; });
    try { await update(ref(db, "rooms/" + room), upd); } catch (e) { console.error(e); toast("Could not start the rematch."); }
};

/* =========================================
   SHARE
========================================= */
window.copyRoomCode = function () {
    navigator.clipboard.writeText(room).then(() => toast("Room code copied"), () => toast("Code: " + room));
};
window.copyInviteLink = async function () {
    const url = location.origin + location.pathname + "?room=" + room;
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        try { await navigator.share({ title: "Guess Who: Anime Edition", text: "Join my room!", url }); return; } catch (e) {}
    }
    try { await navigator.clipboard.writeText(url); toast("Invite link copied"); }
    catch (e) { toast("Invite link: " + url); }
};
window.showJoin = function () { $("joinCode").focus(); };

/* =========================================
   START UP: profile, settings, rejoin or invite link
========================================= */
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let konami = 0, logoTaps = 0, logoTimer = 0;
document.addEventListener("keydown", e => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    konami = (e.key.toLowerCase() === KONAMI[konami].toLowerCase()) ? konami + 1 : (e.key === KONAMI[0] ? 1 : 0);
    if (konami === KONAMI.length) { konami = 0; secretPower("ULTRA INSTINCT"); achNow("secret"); }
});
function secretPower(text) {
    sfx("impact"); setTimeout(() => sfx("levelup"), 250);
    ring(innerWidth / 2, innerHeight * .4, "#cfe8ff", 900, 900); setTimeout(() => ring(innerWidth / 2, innerHeight * .4, "#7df3ff", 1400, 1100), 160);
    burstText(text, innerWidth / 2, innerHeight * .42, "#7df3ff"); shake(document.querySelector(".screen:not(.hidden)"), 14, 520);
}
async function initApp() {
    $("homeTitle").addEventListener("click", () => { clearTimeout(logoTimer); logoTimer = setTimeout(() => { logoTaps = 0; }, 900); if (++logoTaps >= 5) { logoTaps = 0; secretPower(["PLUS ULTRA!", "DATTEBAYO!", "BANKAI!", "KAMEHAMEHA!", "DOMAIN EXPANSION!"][(Math.random() * 5) | 0]); } else sfx("tick"); });
    initGallery(ANIME_LIBRARY, Object.fromEntries(Object.keys(HB_SERIES).filter(k => !HB_HIDDEN_SERIES.includes(k)).map(k => [k, HB_SERIES[k].label])));
    setProfileHooks({ sfx: sfx, toast: toast, onAchievement: achToast });
    bindUpload(); bindSettings(); syncDock(); renderProfileCard(); buildHomeModes();
    $("name").value = profile.get().name || "";
    $("joinCode").addEventListener("keydown", e => { if (e.key === "Enter") joinRoom(); });
    $("joinCode").addEventListener("input", () => { $("joinCode").value = $("joinCode").value.toUpperCase().replace(/[^A-Z0-9]/g, ""); });
    document.body.dataset.scene = "home"; ambient.set("home"); audio.music.play("lobby");
    const boot = $("boot"); if (boot) { boot.classList.add("out"); setTimeout(() => boot.remove(), 600); }
    try { const n = sessionStorage.getItem("gw_notice"); if (n) { sessionStorage.removeItem("gw_notice"); setTimeout(() => toast(n), 400); } } catch (e) {}
    if (!user) { toast("Couldn't reach the game server. Check your connection and reload."); return; }

    const invite = (new URLSearchParams(location.search).get("room") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(SKEY) || "null"); } catch (e) {}
    if (saved && saved.room && (!invite || invite === saved.room)) {
        try {
            const snap = await get(ref(db, "rooms/" + saved.room));
            if (snap.exists()) {
                const d = snap.val();
                let p = 0; for (const i of SLOTS) if (d["player" + i] && d["player" + i].uid === user.uid && !d["player" + i].left) p = i;
                if (p) {
                    room = saved.room; myPlayer = p; saveSession();
                    update(ref(db, "rooms/" + room + "/player" + p), profile.public()).catch(() => {});
                    openLobby(); toast("Rejoined room " + room); return;
                }
            }
            clearSession();
        } catch (e) { console.error("Rejoin failed:", e); }
    }
    if (invite) {
        $("joinCode").value = invite;
        toast(profile.get().name ? "Invite loaded. Tap Join." : "Invite loaded. Set your name, then tap Join.");
        $("joinCode").focus();
    } else if (!profile.get().name) setTimeout(() => { if (!room) { openProfile(); toast("Welcome! Make your player card first."); } }, 700);
}
await initApp();


