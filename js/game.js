
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
import { initCine, cineHook, cineHas } from "./cine/engine.js?v=10";
import { hand as cineHand } from "./cine/hands.js?v=10";
import * as CK from "./cine/kit.js?v=10";


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
    "images/character2.jpg": "Rob Lucci",
    "images/character3.jpg": "",
    "images/character4.jpg": "Smoker",
    "images/character5.jpg": "Arlong",
    "images/character6.jpg": "",
    "images/character7.jpg": "",
    "images/character8.jpg": "",
    "images/character9.jpg": "",
    "images/character10.jpg": "Kuro",
    "images/character11.jpg": "X Drake",
    "images/character12.jpg": "Akainu",
    "images/character13.jpg": "",
    "images/character14.jpg": "Charlotte Katakuri",
    "images/character15.jpg": "Sengoku",
    "images/character16.jpg": "Whitebeard",
    "images/character17.jpg": "Eustass Kid",
    "images/character18.jpg": "Wapol",
    "images/character19.jpg": "Avalo Pizarro",
    "images/character20.jpg": "Enel",
    "images/character21.jpg": "",
    "images/character22.jpg": "Jesus Burgess",
    "images/character23.jpg": "Koby",
    "images/character24.jpg": "",
    "images/character25.jpg": "",
    "images/character26.jpg": "Brook",
    "images/character27.jpg": "Monkey D. Garp",
    "images/character28.jpg": "",
    "images/character29.jpg": "Roronoa Zoro",
    "images/character30.jpg": "Tony Tony Chopper",
    "images/character31.jpg": "Gol D. Roger",
    "images/character32.jpg": "",
    "images/character33.jpg": "Basil Hawkins",
    "images/character34.jpg": "Nefertari Vivi",
    "images/character35.jpg": "",
    "images/character36.jpg": "Monkey D. Luffy",
    "images/character37.jpg": "",
    "images/character38.jpg": "Silvers Rayleigh",
    "images/character39.jpg": "Donquixote Rosinante",
    "images/character40.jpg": "Trafalgar Law",
    "images/character41.jpg": "Shanks",
    "images/character42.jpg": "Yamato",
    "images/character43.jpg": "Hina",
    "images/character44.jpg": "Marco",
    "images/character45.jpg": "",
    "images/character46.jpg": "",
    "images/character47.jpg": "Boa Hancock",
    "images/character48.jpg": "Aokiji",
    "images/character49.jpg": "Killer",
    "images/character50.jpg": "Monkey D. Dragon",
    "images/character51.jpg": "Jack",
    "images/character52.jpg": "Gecko Moria",
    "images/character53.jpg": "Crocodile",
    "images/character54.jpg": "Charlotte Pudding",
    "images/character55.jpg": "Belo Betty",
    "images/character56.jpg": "Donquixote Doflamingo",
    "images/character57.jpg": "Marco",
    "images/character58.jpg": "",
    "images/character59.jpg": "",
    "images/character60.jpg": "",
    "images/character61.jpg": "",
    "images/character62.jpg": "",
    "images/character63.jpg": "",
    "images/character64.jpg": "Benn Beckman",
    "images/character65.jpg": "Pedro",
    "images/character66.jpg": "",
    "images/character67.jpg": "Dracule Mihawk",
    "images/character68.jpg": "Kozuki Oden",
    "images/character69.jpg": "",
    "images/character70.jpg": "",
    "images/character71.jpg": "",
    "images/character72.jpg": "",
    "images/character73.jpg": "Portgas D. Ace",
    "images/character74.jpg": "Kurozumi Kanjuro",
    "images/character75.jpg": "",
    "images/character76.jpg": "Shirahoshi",
    "images/character77.jpg": "",
    "images/character78.jpg": "",
    "images/character79.jpg": "",
    "images/character80.jpg": "Jinbe",
    "images/character81.jpg": "",
    "images/character82.jpg": "Kizaru",
    "images/character83.jpg": "",
    "images/character84.jpg": "Charlotte Perospero",
    "images/character85.jpg": "Cavendish",
    "images/character86.jpg": "",
    "images/character87.jpg": "Blackbeard",
    "images/character88.jpg": "Franky",
    "images/character89.jpg": "Perona",
    "images/character90.jpg": "Lucky Roux",
    "images/character91.jpg": "",
    "images/character92.jpg": "",
    "images/character93.jpg": "Sanji",
    "images/character94.jpg": "",
    "images/character95.jpg": "Baby 5",
    "images/character96.jpg": "Sabo",
    "images/anime/naruto/na1.jpg": "Tobirama Senju",
    "images/anime/naruto/na2.jpg": "Naruto Uzumaki",
    "images/anime/naruto/na3.jpg": "Might Guy",
    "images/anime/naruto/na4.jpg": "Kakashi Hatake",
    "images/anime/naruto/na5.jpg": "Tsunade",
    "images/anime/naruto/na6.jpg": "Neji Hyuga",
    "images/anime/naruto/na7.jpg": "Pain",
    "images/anime/naruto/na8.jpg": "Temari",
    "images/anime/naruto/na9.jpg": "Sasuke Uchiha",
    "images/anime/naruto/na10.jpg": "Orochimaru",
    "images/anime/naruto/na11.jpg": "Sasori",
    "images/anime/naruto/na12.jpg": "Jiraiya",
    "images/anime/naruto/na13.jpg": "Gaara",
    "images/anime/naruto/na14.jpg": "Hidan",
    "images/anime/naruto/na15.jpg": "Itachi Uchiha",
    "images/anime/naruto/na16.jpg": "Kisame Hoshigaki",
    "images/anime/naruto/na17.jpg": "Shikamaru Nara",
    "images/anime/naruto/na18.jpg": "Sakura Haruno",
    "images/anime/naruto/na19.jpg": "Hinata Hyuga",
    "images/anime/naruto/na20.jpg": "Zetsu",
    "images/anime/naruto/na21.jpg": "Kabuto Yakushi",
    "images/anime/naruto/na22.jpg": "Obito Uchiha",
    "images/anime/naruto/na23.jpg": "Madara Uchiha",
    "images/anime/naruto/na24.jpg": "Roronoa Zoro",
    "images/anime/dragonball/db1.jpg": "Hit",
    "images/anime/dragonball/db2.jpg": "Master Roshi",
    "images/anime/dragonball/db3.jpg": "Kale",
    "images/anime/dragonball/db4.jpg": "Kid Buu",
    "images/anime/dragonball/db5.jpg": "Jiren",
    "images/anime/dragonball/db6.jpg": "Whis",
    "images/anime/dragonball/db7.jpg": "Goku",
    "images/anime/dragonball/db8.jpg": "Gohan",
    "images/anime/dragonball/db9.jpg": "Frieza",
    "images/anime/dragonball/db10.jpg": "Goku Black",
    "images/anime/dragonball/db11.jpg": "Bulma",
    "images/anime/dragonball/db12.jpg": "Broly",
    "images/anime/dragonball/db13.jpg": "Mr. Satan",
    "images/anime/dragonball/db14.jpg": "Beerus",
    "images/anime/dragonball/db15.jpg": "Krillin",
    "images/anime/dragonball/db16.jpg": "Android 18",
    "images/anime/dragonball/db17.jpg": "Toppo",
    "images/anime/dragonball/db18.jpg": "Cell",
    "images/anime/dragonball/db19.jpg": "Chi-Chi",
    "images/anime/dragonball/db20.jpg": "Piccolo",
    "images/anime/dragonball/db21.jpg": "Android 17",
    "images/anime/dragonball/db22.jpg": "Trunks",
    "images/anime/dragonball/db23.jpg": "Tien Shinhan",
    "images/anime/dragonball/db24.jpg": "Vegeta",
    "images/anime/jjk/jk1.jpg": "Hajime Kashimo",
    "images/anime/jjk/jk2.jpg": "Toge Inumaki",
    "images/anime/jjk/jk3.jpg": "Yuki Tsukumo",
    "images/anime/jjk/jk4.jpg": "Panda",
    "images/anime/jjk/jk5.jpg": "Naoya Zen'in",
    "images/anime/jjk/jk6.jpg": "Ryomen Sukuna",
    "images/anime/jjk/jk7.jpg": "Aoi Todo",
    "images/anime/jjk/jk8.jpg": "Maki Zen'in",
    "images/anime/jjk/jk9.jpg": "Mei Mei",
    "images/anime/jjk/jk10.jpg": "",
    "images/anime/jjk/jk11.jpg": "Utahime Iori",
    "images/anime/jjk/jk12.jpg": "Yuji Itadori",
    "images/anime/jjk/jk13.jpg": "Choso",
    "images/anime/jjk/jk14.jpg": "Kento Nanami",
    "images/anime/jjk/jk15.jpg": "Nobara Kugisaki",
    "images/anime/jjk/jk16.jpg": "Toji Fushiguro",
    "images/anime/jjk/jk17.jpg": "Kirara Hoshi",
    "images/anime/jjk/jk18.jpg": "Suguru Geto",
    "images/anime/jjk/jk19.jpg": "Satoru Gojo",
    "images/anime/jjk/jk20.jpg": "Megumi Fushiguro",
    "images/anime/jjk/jk21.jpg": "Yuta Okkotsu",
    "images/anime/jjk/jk22.jpg": "Mahito",
    "images/anime/jjk/jk23.jpg": "Kasumi Miwa",
    "images/anime/jjk/jk24.jpg": "",
    "images/anime/demonslayer/ds1.jpg": "Kokushibo",
    "images/anime/demonslayer/ds2.jpg": "Genya Shinazugawa",
    "images/anime/demonslayer/ds3.jpg": "Obanai Iguro",
    "images/anime/demonslayer/ds4.jpg": "Gyutaro",
    "images/anime/demonslayer/ds5.jpg": "Doma",
    "images/anime/demonslayer/ds6.jpg": "Yoriichi Tsugikuni",
    "images/anime/demonslayer/ds7.jpg": "Gyomei Himejima",
    "images/anime/demonslayer/ds8.jpg": "Sabito",
    "images/anime/demonslayer/ds9.jpg": "Kaigaku",
    "images/anime/demonslayer/ds10.jpg": "Muichiro Tokito",
    "images/anime/demonslayer/ds11.jpg": "Sanemi Shinazugawa",
    "images/anime/demonslayer/ds12.jpg": "Mitsuri Kanroji",
    "images/anime/demonslayer/ds13.jpg": "Kyojuro Rengoku",
    "images/anime/demonslayer/ds14.jpg": "Inosuke Hashibira",
    "images/anime/demonslayer/ds15.jpg": "Muzan Kibutsuji",
    "images/anime/demonslayer/ds16.jpg": "Kagaya Ubuyashiki",
    "images/anime/demonslayer/ds17.jpg": "Nezuko Kamado",
    "images/anime/demonslayer/ds18.jpg": "Shinobu Kocho",
    "images/anime/demonslayer/ds19.jpg": "Tengen Uzui",
    "images/anime/demonslayer/ds20.jpg": "Zenitsu Agatsuma",
    "images/anime/demonslayer/ds21.jpg": "Giyu Tomioka",
    "images/anime/demonslayer/ds22.jpg": "Akaza",
    "images/anime/demonslayer/ds23.jpg": "Kanao Tsuyuri",
    "images/anime/demonslayer/ds24.jpg": "Daki",
    "images/anime/bleach/bc1.jpg": "Rangiku Matsumoto",
    "images/anime/bleach/bc2.jpg": "Sosuke Aizen",
    "images/anime/bleach/bc3.jpg": "Yhwach",
    "images/anime/bleach/bc4.jpg": "Kisuke Urahara",
    "images/anime/bleach/bc5.jpg": "Szayelaporro Granz",
    "images/anime/bleach/bc6.jpg": "Ichigo Kurosaki",
    "images/anime/bleach/bc7.jpg": "Nelliel Tu Odelschwanck",
    "images/anime/bleach/bc8.jpg": "Kenpachi Zaraki",
    "images/anime/bleach/bc9.jpg": "Orihime Inoue",
    "images/anime/bleach/bc10.jpg": "Shinji Hirako",
    "images/anime/bleach/bc11.jpg": "Gin Ichimaru",
    "images/anime/bleach/bc12.jpg": "Shunsui Kyoraku",
    "images/anime/bleach/bc13.jpg": "Grimmjow Jaegerjaquez",
    "images/anime/bleach/bc14.jpg": "Rukia Kuchiki",
    "images/anime/bleach/bc15.jpg": "Ulquiorra Cifer",
    "images/anime/bleach/bc16.jpg": "Byakuya Kuchiki",
    "images/anime/bleach/bc17.jpg": "Yasutora Sado",
    "images/anime/bleach/bc18.jpg": "Mayuri Kurotsuchi",
    "images/anime/bleach/bc19.jpg": "Uryu Ishida",
    "images/anime/bleach/bc20.jpg": "Yoruichi Shihoin",
    "images/anime/bleach/bc21.jpg": "Toshiro Hitsugaya",
    "images/anime/bleach/bc22.jpg": "Renji Abarai",
    "images/anime/bleach/bc23.jpg": "",
    "images/anime/bleach/bc24.jpg": "Coyote Starrk",
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
    if (gwSpectating(d)) return d.status === "finished" ? "lobby" : "gw";
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
try { namesOn = localStorage.getItem("gw_names") !== "0"; } catch (e) { namesOn = true; }
let unsubReveal = null;
let rematchSize = 24;




/* =========================================
   HELPERS
========================================= */

const SCENE_OF = { home: "home", lobby: "lobby", secret: "gw", game: "gw", gwSpec: "gw", result: "gw", hb: "hb", im: "im", uno: "uno" };
let currentScreen = "home";
function showOnly(id) {
    document.querySelectorAll("#home,#lobby,#secret,#game,#gwSpec,#hb,#im,#uno,#result").forEach(el => el.classList.add("hidden"));
    const element = document.getElementById(id);
    element.classList.remove("hidden");
    if (currentScreen !== id) {
        if (motionOK() && /^(home|lobby)$/.test(id) && /^(home|lobby)$/.test(currentScreen)) { const w = document.createElement("div"); w.className = "crt-wipe"; document.body.appendChild(w); setTimeout(() => w.remove(), 600); }
        currentScreen = id;
        const scene = SCENE_OF[id] || "lobby";
        document.body.dataset.scene = scene;
        ambient.set(scene, scene === "uno" ? undefined : null);
        if (motionOK() && element.animate) element.animate([{ opacity: 0, transform: "translateY(14px) scale(.995)" }, { opacity: 1, transform: "none" }], { duration: 380, easing: "cubic-bezier(.2,.9,.3,1)" });
    }
    $("emoteBtn").classList.toggle("hidden", !room || id === "home");
    if (id !== "uno") tsReset();
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
    $("unoBox").classList.toggle("hidden", t !== "uno");
    const picked = document.querySelectorAll("#animePoll input:checked").length, chaos = unoDeckType(currentRoomData) === "chaos";
    $("modeHint").textContent = {
        gw: "Classic board: characters are drawn from every series you tick.",
        hb: "Characters are drawn at random from every series you tick.",
        im: "The secret character comes from one of the series you tick.",
        uno: chaos ? "Chaos deck: pick 4 to 8 series (" + picked + "/8). Each one becomes a colour: red, green, yellow, dark blue, then pink, orange, purple, light blue."
                   : "Classic deck: pick exactly 4 series (" + picked + "/4). They become red, green, yellow and dark blue."
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

const HB_COLORS = ["#ff4d6d", "#3ea6ff", "#ffd23f", "#2ec4a6", "#b388ff", "#ff9f1c", "#8be04e", "#ff7ad9"];   // one per seat (8)
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
        if (players.length > 8) throw new Error("Headbanz seats up to 8 players.");
        if (kind === "first" && !players.every(i => Number((d.packs || {})["p" + i]) >= 100)) throw new Error("Some players are still downloading the characters.");
        const pool = await hbBuildPool(keys, "hard", (pct, msg) => { const t = document.querySelector("#hbLoading div"); if (t) t.textContent = msg; });   // always the full list; difficulty is applied when dealing
        if (pool.length < players.length) throw new Error("Not enough characters in those series.");
        const chars = hbAssign(pool, players, (HB_PAGES[d.difficulty] || 3) * 25), zeros = () => Object.fromEntries(players.map(p => ["p" + p, 0]));
        const base = { phase: "play", chars, order: null, out: null, strikes: null, wrong: null, lastPts: null, matchDone: false, winner: null, tie: false };
        const upd = { animes: keys, status: "playing" };
        if (kind === "first" || kind === "new") {
            upd.matchId = Date.now();
            upd.hb = Object.assign(base, { players, n: players.length, round: 1, rounds: Number(d.rounds) || 5, scores: zeros(), firsts: zeros() });
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
    const players = arr(hb.players).map(Number);
    const sc = hb.scores || {}, fi = hb.firsts || {};
    return players.map(p => ({ p, score: Number(sc["p" + p]) || 0, firsts: Number(fi["p" + p]) || 0 }))
        .sort((a, b) => b.score - a.score || b.firsts - a.firsts || a.p - b.p);
}
const hbTie = r => r.length > 1 && r[0].score === r[1].score && r[0].firsts === r[1].firsts;
window.hbShowFinal = async function () {
    const rows = hbStandings(currentRoomData.hb), tie = hbTie(rows);
    await update(ref(db, "rooms/" + room), { "hb/phase": "match", "hb/tie": tie, "hb/winner": tie ? null : rows[0].p });
};

/* ---------- player actions (atomic) ----------
   Everyone guesses at once. The round ends when every player has either named their character or is out
   (gave up / three strikes). Points follow the guessing order and scale to the table: with N players the
   1st correct guess scores N, the 2nd N-1 ... (8 players: 8, 7, 6 ... 1). Out = 0. */
const hbPointsFor = (N, i) => Math.max(0, N - i);
function hbCheckEnd(hb) {
    const players = arr(hb.players).map(Number), N = players.length;
    if (hb.order.length + hb.out.length < N) return;
    hb.phase = "round";
    const pts = {}; players.forEach(p => { pts["p" + p] = 0; });
    hb.scores = hb.scores || {}; hb.firsts = hb.firsts || {};
    hb.order.forEach((p, i) => { pts["p" + p] = hbPointsFor(N, i); hb.scores["p" + p] = (Number(hb.scores["p" + p]) || 0) + hbPointsFor(N, i); });
    if (hb.order.length) hb.firsts["p" + hb.order[0]] = (Number(hb.firsts["p" + hb.order[0]]) || 0) + 1;
    hb.matchDone = Number(hb.round) >= Number(hb.rounds);
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
    if (order.includes(p)) card.appendChild(hbEl("div", "hb-badge", "#" + (order.indexOf(p) + 1) + "  +" + hbPointsFor(arr(hb.players).length, order.indexOf(p))));
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
    const me = Number(myPlayer), players = arr(hb.players).map(Number);
    const order = arr(hb.order).map(Number), out = arr(hb.out).map(Number), wrong = arr(hb.wrong);
    const nm = n => (data["player" + n] || {}).name || "Player " + n;
    const key = hb.round + ":" + Object.values(hb.chars).map(c => c.id).join(",");
    if (key !== hbRoundKey) { hbRoundKey = key; hbSig = ""; hbCloseGuess(); hbSeen = { wrong: 0, order: 0, done: false, phase: "" }; hbPool = null; hbLoadPool(data.animes || [], key); }

    const mineDone = order.includes(me) || out.includes(me), playing = hb.phase === "play";
    const sc = hbStandings(hb).map(r => nm(r.p) + " " + r.score).join("  ·  ");
    $("hbTurn").textContent = "Round " + hb.round + " of " + hb.rounds;
    $("hbStatus").textContent = "Points: " + sc + (playing ? "  ·  " + order.length + "/" + players.length + " solved" : "");
    $("hbGuessBtn").disabled = !playing || mineDone; $("hbGiveBtn").disabled = !playing || mineDone;

    const sig = key + "|" + order.join() + "|" + out.join() + "|" + hb.phase;
    if (sig !== hbSig) {
        hbSig = sig;
        const box = $("hbCards"); box.innerHTML = ""; box.classList.toggle("many", players.length > 4);
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
        else if (hb.phase === "play") titleCard({ kicker: "MIND LINK", title: "ROUND " + hb.round, sub: hb.round + " of " + hb.rounds + " · first guess +" + players.length, kanji: "心", color: "#b06bff", ms: 1300 });
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
    const rows = hbStandings(hb), won = !hb.tie && Number(hb.winner) === me;
    const prog = recordOnce(key, "hb", hb.tie ? null : won, { ach: won ? ["hb_win"] : [] });
    showResults({
        outcome: hb.tie ? "draw" : won ? "win" : "lose", mode: "hb", color: "#b06bff", kicker: "HEADBANZ · FINAL",
        title: hb.tie ? "DEAD HEAT" : won ? "VICTORY" : "DEFEAT", kanji: hb.tie ? "引分" : won ? "勝利" : "敗北",
        subtitle: hb.tie ? "Tied at the top. Sudden death decides it." : won ? "You read the room better than anyone." : pName(data, hb.winner) + " wins the match.",
        podium: rows.map(r => ({ player: pPub(data, r.p), score: r.score + " pts", label: r.firsts + " first" + (r.firsts === 1 ? "" : "s"), me: r.p === me, win: !hb.tie && r.p === Number(hb.winner) })),
        progress: prog,
        actions: matchActions({ again: amHost() ? { label: hb.tie ? "⚡ Sudden death" : "New match", fn: () => { closeResults(); hbBegin(hb.tie ? "sudden" : "new"); } } : null, details: true }),
        note: amHost() ? "" : "Waiting for " + pName(data, hostSlot(data)) + " (host) to pick what's next…"
    });
    winSoundForChar(hb.tie ? null : (hb.chars || {})["p" + hb.winner], won);
}
function hbRenderRound(data) {
    const hb = data.hb, box = $("hbRound"); box.textContent = ""; box.classList.remove("hidden");
    const players = arr(hb.players).map(Number), host = amHost();
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
            const pt = hbEl("td", "hb-pts", "+" + (pts["p" + p] || 0));
            tr.append(pl, ch, pt); t.appendChild(tr);
        });
        box.appendChild(t);
    }
    box.appendChild(hbEl("h3", "hb-ptitle small", "Total points"));
    const st = hbEl("table", "hb-table");
    hbStandings(hb).forEach((r, i) => { const tr = hbEl("tr"), a = hbEl("td"); a.appendChild(playerChip(data, r.p, (i + 1) + ". ")); tr.append(a, hbEl("td", "hb-pts", r.score + " pts"), hbEl("td", "", r.firsts + " first" + (r.firsts === 1 ? "" : "s"))); st.appendChild(tr); });
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
   IMPOSTER MODE (3 to 8 players)
   Everyone sees the same character except the imposter.
   Clues (2 rounds, spoken on your call) -> vote -> result.
========================================================= */
let homeLaps = 1, imSig = "", imSeen = { phase: "", round: 0 }, imSkipKey = "";
window.setUnoDeck = function (k) {
    const d = currentRoomData; if (!d || !amHost() || d.status !== "waiting") return;
    document.querySelectorAll(".unobtn").forEach(b => b.classList.toggle("selected", b.dataset.k === k));
    sfx("pick"); lobbySet({ unoDeck: k, animes: fixSeries("uno", arr(d.animes), k) });
};
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
   ANIME UNO (2 to 8 players)
   Every anime = one colour. Per anime: 19 attribute cards (0-9), 2 Skip, 2 Reverse, 2 Draw Two,
   1 Wild (main character), 1 Wild Draw Four (villain) + 4 SPECIAL cards (Freeze, Swap Hands,
   Ultimate (+5), Future Sight) = 31 cards.
   Classic deck: exactly 4 anime (red, green, yellow, dark blue) = 124 cards.
   Chaos deck: 4 to 8 anime, adding pink, orange, purple and light blue = up to 248 cards.
   Players who empty their hand take the next place and watch; the round goes on until every place is decided.
   Each deck string: attributes 0..9 (| between values, a comma between the two characters)
   ; skip ; reverse ; draw two ; wild (hero) ; wild +4 (villain)
========================================================= */
const UNO_ATTR = ["Luck", "Defense", "Accuracy", "Stamina", "Intellect", "Technique", "Speed", "Spirit", "Strength", "Power"];
/* deck colours in the order the series are ticked: the classic four, then the chaos extras */
const UNO_SUIT = ["#e11b1b", "#2e9e5b", "#f2c200", "#1f3fae", "#ff5fae", "#ff8a1f", "#8b3dff", "#4cc9ff"];
const UNO_SUIT_NAME = ["RED", "GREEN", "YELLOW", "DARK BLUE", "PINK", "ORANGE", "PURPLE", "LIGHT BLUE"];
const UNO_DECK_RANGE = { classic: [4, 4], chaos: [4, 8] };
const unoDeckType = d => d && d.unoDeck === "chaos" ? "chaos" : "classic";
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
   Example: images/special/onepiece_ultimate.png  =  Luffy, Hawk Gatling.   Until a file exists, a placeholder card is shown.
   series keys: onepiece naruto dragonball jjk demonslayer bleach hxh blackclover jojo
   file names:  freeze  swap  ultimate  vision */
const UNO_SP_DIR = "images/special/", UNO_SP_EXT = ["png", "jpg", "webp"];
/* [character shown on the card, ABILITY NAME]. Leave the ability name "" until you have it; it appears on the card and in the big banner. */
const UNO_SPECIAL = {
    onepiece:    { f: ["Aokiji", ""],            t: ["Trafalgar Law", ""],       u: ["Luffy · Hawk Gatling", ""],    e: ["Shanks", ""] },
    naruto:      { f: ["Haku", ""],              t: ["Minato Namikaze", ""],     u: ["Naruto Uzumaki", ""],    e: ["Neji Hyuga", ""] },
    dragonball:  { f: ["Hit", ""],               t: ["Whis", ""],                u: ["Goku", ""],              e: ["Jiren", ""] },
    jjk:         { f: ["Uraume", ""],            t: ["Aoi Todo", ""],            u: ["Sukuna", ""],            e: ["Satoru Gojo", ""] },
    demonslayer: { f: ["Doma", ""],              t: ["Nakime", ""],              u: ["Tanjiro Kamado", ""],    e: ["Yoriichi Tsugikuni", ""] },
    bleach:      { f: ["Toshiro Hitsugaya", ""], t: ["Aizen", ""],    u: ["Ichigo Kurosaki", ""],   e: ["Yhwach", ""] },
    hxh:         { f: ["Kurapika", ""],          t: ["Knov", ""],                u: ["Isaac Netero", ""],      e: ["Neon Nostrade", ""] },
    blackclover: { f: ["Julius Novachrono", ""], t: ["Finral Roulacase", ""],    u: ["Yami Sukehiro", ""],     e: ["Vanessa Enoteca", ""] },
    jojo:        { f: ["DIO", ""],               t: ["Bruno Bucciarati", ""],    u: ["Jotaro Kujo", ""],       e: ["Diavolo", ""] }
};
/* SPECIAL-CARD CINEMATICS: the engine and all 36 scenes live in js/cine/ (engine.js + freeze/swap/ult/peek.js, kit.js, hands.js).
   Voice lines still load from audio/special/<series>_<kind>.mp3 and set each scene's length. The engine reaches the game only through these hooks. */
initCine({ hbEl: (...a) => hbEl(...a), unoCardEl: (...a) => unoCardEl(...a), unoNext: (...a) => unoNext(...a), arr: x => arr(x), plateRect: p => unoPlateRect(p),
    me: () => Number(myPlayer) });
const UNO_FX_HOOKS = {};
Object.keys(UNO_SPECIAL).forEach(sk => ["f", "t", "u", "e"].forEach(k => { const key = sk + "_" + k; if (cineHas(key)) UNO_FX_HOOKS[key] = cineHook(key); }));

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
$("animePoll").addEventListener("change", () => { if (homeMode === "uno") applyModeUI("uno"); });

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
    return out;   // per series 27 + 4 special: 124 cards for 4 series, 248 for 8
}
/* The host forges the deck while everyone sits in the lobby (pictures from packs.json, gaps
   filled from AniList). It is stored as uno.cards with uno.key = the series in colour order, so a rematch
   or a later UNO match with the same series starts instantly. */
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

/* ---------- rules (all moves run inside a transaction so two taps can never clash) ----------
   The moves themselves (unoDoPlay / unoDoDraw / ...) are pure: they only change the state they are given,
   so the same code runs in the transaction and in the offline fuzz test. */
const unoShuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
function unoNorm(u) {
    u.cards = arr(u.cards); u.seats = arr(u.seats).map(Number); u.draw = arr(u.draw); u.disc = arr(u.disc); u.anime = arr(u.anime);
    u.out = arr(u.out).map(Number); u.pend = Number(u.pend) || 0;
    u.hands = u.hands || {}; u.names = u.names || {}; u.seats.forEach(p => { u.hands["p" + p] = arr(u.hands["p" + p]); });
    return u;
}
function unoDealState(cards, anime, seats, names, round) {
    const draw = unoShuf(cards.map((c, i) => i)), hands = {};
    seats.forEach(p => { hands["p" + p] = draw.splice(0, 7); });
    const first = draw.splice(draw.findIndex(i => cards[i].k === "a"), 1)[0];   // the opening card is always an attribute card
    return { cards: cards, anime: anime, seats: seats, names: names, hands: hands, draw: draw, disc: [first], turn: seats[0], dir: 1,
        color: cards[first].s, drew: null, bonus: null, frozen: {}, fzk: null, fx: null, peek: null, ev: null, fin: null, winner: null, out: [], places: null, pend: 0,
        phase: "play", round: round, n: 1, msg: "Game on! " + names["p" + seats[0]] + " starts." };
}
const unoTop = u => u.cards[u.disc[u.disc.length - 1]];
const unoIsOut = (u, p) => arr(u.out).map(Number).includes(Number(p));
const unoLive = u => u.seats.filter(p => !unoIsOut(u, p));
/* k seats after p in the current direction. Players who already finished are not at the table any more. */
const unoNext = (u, p, k) => {
    const n = u.seats.length, out = arr(u.out).map(Number);
    if (u.seats.every(s => out.includes(s))) return p;
    let i = u.seats.indexOf(p), t = p;
    for (let s = 0; s < k; s++) { let g = 0; do { i = (((i + u.dir) % n) + n) % n; t = u.seats[i]; } while (out.includes(t) && ++g < n); }
    return t;
};
/* Who plays next: k seats after p, but a FROZEN player is skipped and loses one of their frozen turns each time. */
function unoAdv(u, p, k, notes) {
    u.frozen = u.frozen || {};
    let t = unoNext(u, p, k), guard = 0;
    while ((u.frozen["p" + t] || 0) > 0 && guard++ < 40 && unoLive(u).length > 1) {
        u.frozen["p" + t]--;
        const m = u.names["p" + t] + " is frozen and loses a turn!" + (u.frozen["p" + t] > 0 ? " (" + u.frozen["p" + t] + " more)" : "");
        if (notes) notes.push(m); else u.msg = (u.msg || "") + " " + m;
        t = unoNext(u, t, 1);
    }
    return t;
}
function unoCan(u, hand, ci) {
    const c = u.cards[ci], t = unoTop(u);
    if (u.pend > 0) return c.k === "d";       // a Draw-2 stack is running: only another +2 passes it on
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
/* The round is over once at most one player still holds cards: the last one takes the last place. */
function unoEnd(u, tail) {
    unoLive(u).sort((a, b) => (tail || []).indexOf(a) - (tail || []).indexOf(b)).forEach(p => u.out.push(p));
    u.phase = "over"; u.places = u.out.slice(); u.winner = u.places[0]; u.pend = 0; u.bonus = null; u.drew = null; u.fx = null;
    u.wins = u.wins || {}; u.wins["p" + u.winner] = (Number(u.wins["p" + u.winner]) || 0) + 1;
    u.msg = u.names["p" + u.winner] + " wins the round! Final ranking: " + u.places.map((p, i) => (i + 1) + ". " + u.names["p" + p]).join("  ");
}
/* players who left during the round can never finish: the host settles the ranking when only one present player is still in */
function unoSettle(u, gone) {
    gone = (gone || []).map(Number);
    const live = unoLive(u), stay = live.filter(p => !gone.includes(p));
    if (u.phase !== "play" || stay.length > 1 || live.length < 2) return false;
    const left = live.filter(p => gone.includes(p)).sort((a, b) => u.hands["p" + a].length - u.hands["p" + b].length);
    unoEnd(u, stay.concat(left)); u.n++; u.ev = { id: u.n, t: "o" };
}
function unoDoPlay(u, p, ci, col, tg) {
    const h = u.hands["p" + p] || [];
    if (u.phase !== "play" || u.turn !== p || unoIsOut(u, p) || !h.includes(ci) || (u.drew != null && u.drew !== ci) || !unoCan(u, h, ci)) return false;
    const c = u.cards[ci], wild = c.k === "w" || c.k === "x", sp = !!UNO_SP[c.k], nm = u.names["p" + p], nx = unoNext(u, p, 1), notes = [];
    tg = Number(tg) || 0;
    if (c.k === "t" && h.length > 1 && (tg === p || !unoLive(u).includes(tg))) return false;      // swap needs a valid target still in the round
    const duel = unoLive(u).length === 2;
    h.splice(h.indexOf(ci), 1); u.disc.push(ci); u.drew = null; u.bonus = null;
    u.color = wild ? Math.max(0, Math.min(u.anime.length - 1, Number(col) || 0)) : c.s;
    const finished = !h.length;
    if (finished) { u.out.push(p); if (u.out.length === 1) u.fin = { ci: ci, sp: sp ? 1 : 0 }; }
    let msg = nm + " played " + c.n, victim = 0;
    if (c.k === "s") { victim = nx; msg += ". " + u.names["p" + nx] + " is skipped!"; u.turn = unoAdv(u, p, 2, notes); }
    else if (c.k === "r") { u.dir *= -1; msg += ". Direction reversed!"; u.turn = duel && !finished ? p : unoAdv(u, p, 1, notes); }
    else if (c.k === "d") {
        u.pend += 2; u.turn = unoAdv(u, p, 1, notes); victim = u.turn;
        msg += ". Draw-2 stack is now +" + u.pend + "! " + u.names["p" + u.turn] + " must stack a +2 or draw " + u.pend + ".";
    }
    else if (c.k === "x") { victim = nx; unoDraw(u, nx, 4); msg += ". " + u.names["p" + nx] + " draws 4!"; u.turn = unoAdv(u, p, 2, notes); }
    else if (c.k === "f") { victim = nx; u.frozen = u.frozen || {}; u.frozen["p" + nx] = (u.frozen["p" + nx] || 0) + 2; u.fzk = u.fzk || {}; u.fzk["p" + nx] = c.sk + "_" + c.k; msg += (c.ab ? " (" + c.ab + ")" : "") + ". " + u.names["p" + nx] + " is FROZEN for 2 turns!"; u.turn = unoAdv(u, p, 1, notes); }
    else if (c.k === "u") { victim = nx; unoDraw(u, nx, 5); msg += (c.ab ? " (" + c.ab + ")" : "") + ". " + u.names["p" + nx] + " draws 5!"; u.turn = unoAdv(u, p, 2, notes); }
    else if (c.k === "t") {
        if (h.length) { victim = tg; const mine = h; u.hands["p" + p] = u.hands["p" + tg]; u.hands["p" + tg] = mine; msg += (c.ab ? " (" + c.ab + ")" : "") + ". Hands swapped with " + u.names["p" + tg] + "!"; }
        u.turn = unoAdv(u, p, 1, notes);
    }
    else if (c.k === "e") {         // Future Sight: see the NEXT player's hand, then play one more card (or end the turn)
        victim = nx; msg += (c.ab ? " (" + c.ab + ")" : "") + ". " + nm + " reads " + u.names["p" + nx] + "'s hand";
        if (finished) u.turn = unoAdv(u, p, 1, notes); else { u.turn = p; u.bonus = p; msg += " and gets one more play!"; }
    }
    else u.turn = unoAdv(u, p, 1, notes);
    if (wild) msg += " Colour: " + u.anime[u.color] + ".";
    if (notes.length) msg += " " + notes.join(" ");
    if (finished) msg += " " + nm + " is out of cards and finishes #" + u.out.length + "!";
    u.n++; u.msg = msg;
    u.ev = { id: u.n, t: "p", p: p, ci: ci, k: c.k, to: victim, dc: ({ x: 4, u: 5 })[c.k] || 0, stk: c.k === "d" ? u.pend : 0, col: u.color, fin: finished ? u.out.length : 0 };
    if (finished && unoLive(u).length <= 1) { unoEnd(u); return; }
    if (finished && u.turn === p) u.turn = unoAdv(u, p, 1);
    const id = (u.round || 1) + ":" + u.n;
    if (sp) u.fx = { id: id, ci: ci, p: p, to: nx, sw: c.k === "t" ? tg : 0 };
    if (c.k === "e") u.peek = { id: id, p: p, to: nx, t: Date.now() };
}
function unoDoDraw(u, p) {
    const h = u.hands["p" + p];
    if (u.phase !== "play" || u.turn !== p || unoIsOut(u, p) || u.drew != null || u.bonus === p) return false;   // the Future Sight extra is a play, not a draw
    const before = h.length;
    if (u.pend > 0) {               // can't (or won't) stack: take the whole stack and lose the turn
        const n = u.pend; unoDraw(u, p, n); u.pend = 0;
        u.msg = u.names["p" + p] + " takes the Draw-2 stack: +" + n + " cards!"; u.n++; u.ev = { id: u.n, t: "d", p: p, dc: h.length - before, stk: n };
        u.turn = unoAdv(u, p, 1); return;
    }
    unoDraw(u, p, 1);
    u.msg = u.names["p" + p] + " drew a card."; u.n++; u.ev = { id: u.n, t: "d", p: p, dc: h.length - before };
    if (h.length === before || !unoCan(u, h, h[h.length - 1])) u.turn = unoAdv(u, p, 1); else u.drew = h[h.length - 1];
}
function unoDoPass(u, p) {
    if (u.phase !== "play" || u.turn !== p || (u.drew == null && u.bonus !== p)) return false;
    u.msg = u.names["p" + p] + (u.bonus === p ? " keeps the extra play and ends the turn." : " passed."); u.drew = null; u.bonus = null; u.turn = unoAdv(u, p, 1); u.n++;
}
/* an away / departed player's turn is skipped; a running Draw-2 stack lands on them */
function unoSkipTurn(u, p, why) {
    if (u.phase !== "play" || u.turn !== p) return false;
    u.drew = null; u.bonus = null; let extra = "";
    if (u.pend > 0) { unoDraw(u, p, u.pend); extra = " They take the +" + u.pend + " stack."; u.pend = 0; }
    u.msg = u.names["p" + p] + why + extra; u.turn = unoAdv(u, p, 1); u.n++; u.ev = { id: u.n, t: "s", p: 0, to: p };
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
    const st = unoDealState(arr(d.uno.cards), arr(d.uno.anime), seats, names, 1); st.key = d.uno.key; st.missing = d.uno.missing || null; st.deck = unoDeckType(d);
    try { await update(ref(db, "rooms/" + room), { status: "playing", matchId: Date.now(), uno: st }); }
    catch (e) { toast("Could not start the game."); }
}
window.unoPlay = (ci, col, tg) => unoTx(u => unoDoPlay(u, Number(myPlayer), ci, col, tg));
window.unoDrawClick = () => unoTx(u => unoDoDraw(u, Number(myPlayer)));
window.unoPass = () => unoTx(u => unoDoPass(u, Number(myPlayer)));
window.unoSkipAbsent = () => unoTx(u => unoSkipTurn(u, u.turn, " is away, turn skipped."));
window.unoRematch = () => {
    const d = currentRoomData, seats = activeSlots(d), names = {};
    if (seats.length < 2) { toast("Need at least 2 players for another round."); return; }
    seats.forEach(i => { names["p" + i] = d["player" + i].name; });
    unoTx(u => { if (u.phase !== "over") return false; Object.assign(u, unoDealState(u.cards, u.anime, seats, names, (u.round || 1) + 1)); });
};

/* ---------- screen ---------- */
let unoSeen = { n: -1, over: "", hl: -1, top: -1, round: -1, ev: null, turn: 0 }, unoPick = null;
const UNO_KANJI = { onepiece: "海賊", naruto: "忍", bleach: "死神", jjk: "呪", dragonball: "龍", demonslayer: "鬼", aot: "巨", mha: "英", hxh: "狩", jojo: "奇", blackclover: "黒" };
const UNO_SHORT = { onepiece: "One Piece", naruto: "Naruto", bleach: "Bleach", jjk: "Jujutsu Kaisen", dragonball: "Dragon Ball", demonslayer: "Demon Slayer", hxh: "Hunter x Hunter", jojo: "JoJo", blackclover: "Black Clover" };
const UNO_PLACE = n => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
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
    const n = (u.hands["p" + p] || []).length, left = data["player" + p] && data["player" + p].left, place = u.out.indexOf(p) + 1;
    const frozen = !place && u.frozen && u.frozen["p" + p] > 0;
    const box = hbEl("div", "u-opp" + (play && u.turn === p ? " turn" : "") + (pres["p" + p] === false || left ? " gone" : "") + (frozen ? " frozen fxk-" + ((u.fzk || {})["p" + p] || "") : "") + (place && play ? " done" : ""));
    box.dataset.p = p; box.dataset.emote = "p" + p; box.style.setProperty("--pc", HB_COLORS[p - 1]);
    const top = hbEl("div", "u-otop"); top.appendChild(avatarEl(pPub(data, p), { size: 38 }));
    const nm = hbEl("div", "u-oname", u.names["p" + p]); nm.style.color = HB_COLORS[p - 1]; top.appendChild(nm);
    const w = Number((u.wins || {})["p" + p]) || 0; if (w) top.appendChild(hbEl("span", "u-owins", "★" + w));
    box.appendChild(top);
    if (place && play) {
        const medal = hbEl("div", "u-place p" + Math.min(place, 4)); medal.append(hbEl("b", null, "#" + place), hbEl("small", null, UNO_PLACE(place).toUpperCase() + " · FINISHED")); box.appendChild(medal);
        box.appendChild(hbEl("div", "u-ocount", "👁 watching"));
        return box;
    }
    const fan = hbEl("div", "u-fan"); for (let i = 0; i < Math.min(n, 7); i++) { const c = hbEl("i"); c.style.setProperty("--k", i * 6 / Math.max(1, Math.min(n, 7) - 1 || 1)); fan.appendChild(c); } box.appendChild(fan);
    box.appendChild(hbEl("div", "u-ocount" + (n === 1 ? " last" : ""), (left ? "LEFT · " : "") + (n === 1 ? "LAST CARD" : n + " cards") + (frozen ? "  ❄ x" + u.frozen["p" + p] : "")));
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
    const play = u.phase === "play", myTurn = play && u.turn === me, hand = u.hands["p" + me] || [], myPlace = u.out.indexOf(me) + 1, stack = play ? u.pend : 0, bonus = play && u.bonus === u.turn ? u.bonus : 0;
    const firstRender = unoSeen.n < 0;
    const newEv = u.ev && u.ev.id !== unoSeen.ev && !firstRender ? u.ev : null;
    if (u.ev) unoSeen.ev = u.ev.id;
    if (u.n !== unoSeen.n) { if (unoSeen.n >= 0 && play && myTurn && u.turn !== unoSeen.turn) { sfx("turn"); } unoSeen.n = u.n; unoSeen.turn = u.turn; }
    if (u.fx && u.fx.id !== unoSeen.fx) { unoSeen.fx = u.fx.id; if (!firstRender) unoSpecialFx(u, u.fx); }
    tsSync(u);
    const actCol = UNO_SUIT[u.color] || "#ffcf4a";
    $("uno").classList.toggle("myturn", myTurn); $("uno").style.setProperty("--ac", actCol); ambient.accent(actCol);
    $("unoArenaKj").textContent = UNO_KANJI[keys[u.color]] || "札";
    $("unoTurn").textContent = !play ? "ROUND OVER" : myTurn ? (stack ? "STACK +" + stack + "!" : bonus ? "EXTRA PLAY!" : "YOUR TURN!") : (u.names["p" + u.turn] || "?") + (bonus ? "'s extra play" : "'s turn");
    $("unoStatus").textContent = u.msg || "";
    $("uno").classList.toggle("watching", play && myPlace > 0);
    // opponents
    const op = $("unoOpps"); op.innerHTML = ""; op.classList.toggle("many", u.seats.length > 5);
    u.seats.filter(p => p !== me).forEach(p => op.appendChild(unoPlateEl(data, u, p, me, play, pres)));
    // my own plate (avatar, name, wins), so I see myself the way the others see me
    const mine = $("unoMe"); mine.innerHTML = "";
    if (u.seats.includes(me)) {
        mine.className = "uno-me" + (myTurn ? " turn" : "") + (!myPlace && u.frozen && u.frozen["p" + me] > 0 ? " frozen" : "") + (myPlace && play ? " done" : "");
        mine.dataset.emote = "p" + me;
        mine.appendChild(avatarEl(pPub(data, me), { size: 44, badge: true }));
        const id = hbEl("div", "u-meid"); id.appendChild(hbEl("b", null, pName(data, me))); id.appendChild(hbEl("small", null, (myPlace ? "Finished " + UNO_PLACE(myPlace) : hand.length + " card" + (hand.length === 1 ? "" : "s")) + ((u.wins || {})["p" + me] ? " · ★" + u.wins["p" + me] + " wins" : "") + (!myPlace && u.frozen && u.frozen["p" + me] > 0 ? " · ❄ frozen" : "")));
        mine.appendChild(id);
    }
    const topIdx = u.disc[u.disc.length - 1], tp = $("unoTop"); tp.innerHTML = "";
    const flying = newEv && newEv.t === "p" && snap && motionOK();
    tp.appendChild(unoCardEl(u, topIdx, "big" + (unoSeen.top !== u.n && !flying ? " drop" : ""))); unoSeen.top = u.n;
    $("unoRing").classList.toggle("ccw", u.dir < 0);
    const info = $("unoInfo"); info.innerHTML = "";
    const slab = hbEl("div", "u-active"); slab.style.setProperty("--c", actCol);
    slab.appendChild(hbEl("small", null, "ACTIVE ANIME")); slab.appendChild(hbEl("b", null, u.anime[u.color])); slab.appendChild(hbEl("span", "u-kj", UNO_KANJI[keys[u.color]] || "")); info.appendChild(slab);
    if (stack) { const sk = hbEl("div", "u-stack"); sk.append(hbEl("b", null, "+" + stack), hbEl("small", null, "DRAW-2 STACK · " + (myTurn ? "stack a +2 or take it" : (u.names["p" + u.turn] || "?") + " must answer"))); info.appendChild(sk); }
    info.appendChild(hbEl("div", "u-dir", u.dir > 0 ? "↻ CLOCKWISE" : "↺ COUNTER-CLOCKWISE"));
    info.appendChild(hbEl("div", "u-pile", "DRAW PILE · " + u.draw.length));
    if (u.out.length && play) { const rk = hbEl("div", "u-rank"); u.out.forEach((p, i) => { const r = hbEl("span", null, "#" + (i + 1) + " " + (u.names["p" + p] || "?")); r.style.setProperty("--pc", HB_COLORS[(p - 1) % HB_COLORS.length]); rk.appendChild(r); }); info.appendChild(rk); }
    const dr = $("unoDraw"); dr.innerHTML = ""; dr.appendChild(hbEl("b", null, stack && myTurn ? "TAKE +" + stack : "DRAW")); dr.appendChild(hbEl("em", null, String(u.draw.length)));
    dr.classList.toggle("stack", !!(stack && myTurn)); dr.setAttribute("aria-label", stack && myTurn ? "Take the Draw-2 stack: draw " + stack + " cards" : "Draw a card");
    dr.disabled = !(myTurn && u.drew == null && !bonus); dr.classList.toggle("glow", myTurn && u.drew == null && !bonus && !hand.some(ci => unoCan(u, hand, ci)));
    $("unoBtnPass").classList.toggle("hidden", !(myTurn && (u.drew != null || bonus))); $("unoBtnPass").textContent = bonus ? "END TURN" : "PASS";
    $("unoBtnPass").classList.toggle("glow", !!(myTurn && bonus && !hand.some(ci => unoCan(u, hand, ci))));
    unoSightStrip(u, me, myTurn && bonus);
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
    if (myPlace && play) {
        const w = hbEl("div", "u-watch"); w.append(hbEl("b", null, "#" + myPlace), hbEl("span", null, "You finished " + UNO_PLACE(myPlace) + "! Watch the rest of the table fight for the other places."));
        hd.appendChild(w);
    }
    hd.classList.toggle("deal", hand.length !== unoSeen.hl && (firstRender || u.round !== unoSeen.round)); unoSeen.hl = hand.length; unoSeen.round = u.round;
    if (!myPlace || !play) unoFitHand();
    if (newEv) { try { unoAnimate(u, newEv, snap, data); } catch (e) { console.warn(e); } }
    $("unoOver").classList.add("hidden");
    if (!play && u.winner) unoOverSequence(u, data); else if (vxKey && vxKey.startsWith("uno:")) { closeResults(); vxKey = ""; }
}

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
            if (ev.fin && u.phase === "play") setTimeout(() => { const r = unoPlateRect(ev.p); unoStamp(r, "#" + ev.fin + " FINISHED!", "#ffe14d", "big"); ring(ctr(r).x, ctr(r).y, "#ffe14d", 300, 800); sfx(ev.p === me ? "win" : "reveal"); }, 700);
        };
        if (snap && top && motionOK()) {
            const dst = top.getBoundingClientRect();
            let src = ev.p === me ? snap.hand[ev.ci] : null;
            if (!src) { const pr = snap.opp[ev.p] || unoPlateRect(ev.p); if (pr) src = { left: pr.left + pr.width / 2 - 26, top: pr.top + pr.height / 2 - 39, width: 52, height: 78 }; }
            if (src) { top.style.visibility = "hidden"; flyCard(unoCardEl(u, ev.ci, "big"), src, dst, 430, (Math.random() - .5) * 50).then(() => { top.style.visibility = ""; impact(); }); return; }
        }
        impact();
    } else if (ev.t === "d") { unoDrawFly(u, ev.p, ev.dc || 1, 0); if (ev.stk) { unoStamp(unoPlateRect(ev.p), "+" + ev.stk, "#ff2a2a", ev.stk >= 6 ? "big" : ""); sfx("punch"); } }
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
        sfx("wild"); const cols = UNO_SUIT.slice(0, Math.max(4, u.anime.length));
        unoFx.add(1100, (g, t) => { const e = t < .45 ? t / .45 : 1, back = t > .45 ? (t - .45) / .55 : 0; for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283 + t * 2, r = 30 + 260 * e * (1 - back * .9); g.globalAlpha = 1 - back; g.fillStyle = back > 0 ? col : cols[i % cols.length]; g.save(); g.translate(center.x + Math.cos(a) * r, center.y + Math.sin(a) * r); g.rotate(a); g.fillRect(-14, -5, 28, 10); g.restore(); } if (back > 0) { g.globalAlpha = (1 - back) * .6; g.fillStyle = col; g.beginPath(); g.arc(center.x, center.y, 60 + back * 400, 0, 6.283); g.fill(); } });
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
                cineHand(g, x, y, (heavy ? 1.15 : .85) * M / 700 * (1 + .3 * e), ang, "fist", heavy ? { skin: "haki", haki: "#ff2a2a", t: t * 4, sleeve: { c: "#1a0608", cuff: "#ff2a2a", len: 200 } } : { sleeve: { c: col, cuff: "#ffffff", len: 200 } });
            }
            if (tt >= hitAt) {
                const q = Math.min(1, (tt - hitAt) / (dur - hitAt));
                if (q < .12 && heavy) { g.globalAlpha = 1 - q / .12; g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "difference"; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over"; }
                g.globalAlpha = 1 - q; g.fillStyle = "#fff"; g.save(); g.translate(to.x, to.y); g.beginPath(); for (let i = 0; i < 22; i++) { const a = i / 22 * 6.283, r = i % 2 ? 30 + 30 * q : (heavy ? 170 : 110) * (.6 + q); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.strokeStyle = heavy ? "#ff2a2a" : col; g.lineWidth = 4; g.stroke(); g.restore();
                g.globalAlpha = (1 - q) * .8; g.strokeStyle = heavy ? "#ff2a2a" : col; g.lineWidth = 8 * (1 - q) + 1; g.beginPath(); g.arc(to.x, to.y, 40 + q * (heavy ? 420 : 260), 0, 6.283); g.stroke();
            }
        });
        setTimeout(() => { sfx("punch"); unoStamp(vr, heavy ? "+4" : "+" + (ev.stk || 2) + (ev.stk > 2 ? " STACK" : ""), heavy ? "#ff2a2a" : col, heavy || ev.stk >= 6 ? "big" : ""); shake(heavy ? $("uno") : (document.querySelector('#unoOpps .u-opp[data-p="' + victim + '"]') || $("unoMe")), heavy ? 16 : 9, heavy ? 520 : 360); unoDrawFly(u, victim, ev.dc, 160); }, hitAt);
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
    // full ranking: the finishing order (older rounds without one fall back to fewest cards left)
    const places = arr(u.places).map(Number).length === u.seats.length ? arr(u.places).map(Number)
        : u.seats.slice().sort((a, b) => (a === u.winner ? -1 : b === u.winner ? 1 : (u.hands["p" + a] || []).length - (u.hands["p" + b] || []).length));
    const myPlace = places.indexOf(me) + 1, last = myPlace === places.length;
    const fin = u.fin && u.cards[u.fin.ci] ? u.fin.ci : u.disc[u.disc.length - 1];
    const ach = win ? ["uno_win"].concat(u.fin && u.fin.sp ? ["uno_special"] : []) : [];
    const prog = seated ? recordOnce(key, "uno", win, { ach }) : null;
    const reveal = hbEl("div", "vx-card"); reveal.appendChild(unoCardEl(u, fin, "big"));
    const lastP = places[places.length - 1], lastCards = (u.hands["p" + lastP] || []).length;
    showResults({
        outcome: !seated ? "neutral" : win ? "win" : last ? "lose" : "neutral", mode: "uno", color: UNO_SUIT[u.color] || "#ffcf4a", kicker: "ANIME UNO · ROUND " + u.round + " · FINAL RANKING",
        title: win ? "VICTORY!" : seated ? UNO_PLACE(myPlace).toUpperCase() + " PLACE" : (u.names["p" + u.winner] || "?").toUpperCase() + " WINS",
        kanji: win ? "勝利" : last ? "敗北" : "順位",
        subtitle: win ? (u.fin && u.fin.sp ? "First out, with a special card. Legendary." : "First to get rid of every card.")
            : seated ? (u.names["p" + u.winner] || "?") + " went out first with " + ((u.cards[fin] || {}).n || "?") + "." + (last ? " You were the last one holding cards." : "")
            : "Finishing card: " + ((u.cards[fin] || {}).n || "?"),
        reveal: reveal,
        podium: places.map((p, i) => ({ player: pPub(data, p), score: "#" + (i + 1), label: (i === places.length - 1 ? (u.hands["p" + p] || []).length + " card" + ((u.hands["p" + p] || []).length === 1 ? "" : "s") + " left" : UNO_PLACE(i + 1) + " out") + " · ★" + (Number((u.wins || {})["p" + p]) || 0), me: p === me, win: i === 0 })),
        chips: [["ROUND", u.round], ["YOUR PLACE", seated ? myPlace + " / " + places.length : "-"], ["LAST PLACE LEFT WITH", lastCards + " card" + (lastCards === 1 ? "" : "s")], ["YOUR ROUND WINS", Number((u.wins || {})["p" + me]) || 0]],
        progress: prog,
        actions: matchActions({ again: { label: "Play again", fn: () => { closeResults(); vxKey = "uno-wait"; unoRematch(); } } })
    });
}

/* ---------- wild card: the colour wheel ----------
   One equal slice per colour in the deck (4 in Classic, 4 to 8 in Chaos). Each slice is tinted with its colour
   and shows the series' hero (the art of that series' Wild card) behind its kanji and name. Hover / focus lifts a
   slice out and names it in the hub; a click, tap, Enter or Space plays the wild with that colour at once. */
const SVGNS = "http://www.w3.org/2000/svg";
const svgEl = (tag, at) => { const e = document.createElementNS(SVGNS, tag); Object.entries(at || {}).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
function unoWheelArc(r0, r1, a0, a1) {
    const P = (r, a) => (r * Math.cos(a)).toFixed(2) + " " + (r * Math.sin(a)).toFixed(2), big = a1 - a0 > Math.PI ? 1 : 0;
    return "M" + P(r1, a0) + " A" + r1 + " " + r1 + " 0 " + big + " 1 " + P(r1, a1) + " L" + P(r0, a1) + " A" + r0 + " " + r0 + " 0 " + big + " 0 " + P(r0, a0) + " Z";
}
function unoBuildColors(u, keys) {
    const box = $("unoColorBtns"); box.innerHTML = "";
    const N = u.anime.length, R = 200, R0 = 64, step = Math.PI * 2 / N, gap = N > 6 ? .012 : .018, now = Date.now();
    const svg = svgEl("svg", { viewBox: "-230 -230 460 460", class: "uw-svg", role: "group", "aria-label": "Choose the anime colour" });
    const defs = svgEl("defs"); svg.appendChild(defs);
    const glow = svgEl("filter", { id: "uwGlow", x: "-50%", y: "-50%", width: "200%", height: "200%" });
    glow.appendChild(svgEl("feGaussianBlur", { stdDeviation: "7" })); defs.appendChild(glow);
    const rim = svgEl("g", { class: "uw-rim" });
    rim.appendChild(svgEl("circle", { r: R + 16, class: "uw-rim-a" })); rim.appendChild(svgEl("circle", { r: R + 24, class: "uw-rim-b" }));
    svg.appendChild(rim);
    const hub = svgEl("g", { class: "uw-hub" }), hubText = () => hub.querySelectorAll("text");
    const slices = [];
    u.anime.forEach((label, s) => {
        const a0 = -Math.PI / 2 - step / 2 + s * step + gap, a1 = a0 + step - gap * 2, mid = (a0 + a1) / 2, col = UNO_SUIT[s], k = keys[s];
        const d = unoWheelArc(R0, R, a0, a1), id = "uw" + now + "_" + s;
        const cp = svgEl("clipPath", { id: id + "c" }); cp.appendChild(svgEl("path", { d })); defs.appendChild(cp);
        const gr = svgEl("radialGradient", { id: id + "g", cx: "0", cy: "0", r: String(R), gradientUnits: "userSpaceOnUse" });
        [["0", .9], [String(R0 / R + .04), .78], [".62", .3], [".9", .55]].forEach(([o, a]) => gr.appendChild(svgEl("stop", { offset: o, "stop-color": col, "stop-opacity": a })));
        defs.appendChild(gr);
        const lift = N > 6 ? 12 : 16;
        const g = svgEl("g", { class: "uw-slice", tabindex: "0", role: "button", "aria-label": UNO_SUIT_NAME[s] + ": " + label });
        g.style.setProperty("--c", col); g.style.setProperty("--dx", (Math.cos(mid) * lift).toFixed(1) + "px"); g.style.setProperty("--dy", (Math.sin(mid) * lift).toFixed(1) + "px"); g.style.setProperty("--i", s);
        const inner = svgEl("g", { class: "uw-in" });
        const art = svgEl("g", { "clip-path": "url(#" + id + "c)" });
        art.appendChild(svgEl("path", { d, fill: "#0b0710" }));
        const hero = u.cards.find(c => c.k === "w" && c.s === s && c.i);
        if (hero) {
            const cx = Math.cos(mid) * (R0 + R) / 2, cy = Math.sin(mid) * (R0 + R) / 2, sz = N > 6 ? 190 : 230;
            const im = svgEl("image", { x: (cx - sz / 2).toFixed(1), y: (cy - sz * .42).toFixed(1), width: sz, height: sz, preserveAspectRatio: "xMidYMin slice", class: "uw-art" });
            im.setAttributeNS("http://www.w3.org/1999/xlink", "href", HB_IMG + hero.i); im.setAttribute("href", HB_IMG + hero.i);
            art.appendChild(im);
        }
        art.appendChild(svgEl("path", { d, fill: "url(#" + id + "g)", class: "uw-tint" }));
        art.appendChild(svgEl("path", { d: unoWheelArc(R - 15, R, a0, a1), fill: col, class: "uw-band" }));      // the colour itself, solid, round the rim
        // speed lines that sweep across the slice on hover
        for (let j = 0; j < 3; j++) { const ra = R0 + 26 + j * 38; art.appendChild(svgEl("path", { d: "M" + (ra * Math.cos(a0)).toFixed(1) + " " + (ra * Math.sin(a0)).toFixed(1) + " A" + ra + " " + ra + " 0 0 1 " + (ra * Math.cos(a1)).toFixed(1) + " " + (ra * Math.sin(a1)).toFixed(1), class: "uw-line", style: "--j:" + j })); }
        inner.appendChild(art);
        inner.appendChild(svgEl("path", { d, class: "uw-edge" }));
        const kr = R0 + (R - R0) * .5, tx = Math.cos(mid) * kr, ty = Math.sin(mid) * kr;
        const kj = svgEl("text", { x: tx.toFixed(1), y: ty.toFixed(1), class: "uw-kj", "font-size": N > 6 ? 34 : N > 4 ? 42 : 52 }); kj.textContent = UNO_KANJI[k] || "札"; inner.appendChild(kj);
        // series name (outer) and colour name (inner) follow the slice's arc; on the lower half the arc runs the other way so the text stays upright
        const flip = Math.sin(mid) > .3, onArc = (r, cls, size, txt, pid) => {
            const pa = flip ? "M" + (r * Math.cos(a1)).toFixed(1) + " " + (r * Math.sin(a1)).toFixed(1) + " A" + r + " " + r + " 0 0 0 " + (r * Math.cos(a0)).toFixed(1) + " " + (r * Math.sin(a0)).toFixed(1)
                : "M" + (r * Math.cos(a0)).toFixed(1) + " " + (r * Math.sin(a0)).toFixed(1) + " A" + r + " " + r + " 0 0 1 " + (r * Math.cos(a1)).toFixed(1) + " " + (r * Math.sin(a1)).toFixed(1);
            defs.appendChild(svgEl("path", { id: pid, d: pa }));
            const t = svgEl("text", { class: cls, "font-size": size }), tp = svgEl("textPath", { href: "#" + pid, startOffset: "50%" });
            tp.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#" + pid); tp.textContent = txt; t.appendChild(tp); inner.appendChild(t);
        };
        onArc(R - 32, "uw-nm", N > 6 ? 12.5 : N > 4 ? 14 : 17, (UNO_SHORT[k] || label).toUpperCase(), id + "n");
        onArc(R0 + 17, "uw-cn", N > 6 ? 8 : 9.5, UNO_SUIT_NAME[s], id + "k");
        g.appendChild(inner);
        const focus = () => { slices.forEach(x => x.classList.toggle("on", x === g)); const [t1, t2, t3] = hubText(); t1.textContent = UNO_KANJI[k] || "札"; t2.textContent = (UNO_SHORT[k] || label).toUpperCase(); t3.textContent = UNO_SUIT_NAME[s]; hub.style.setProperty("--c", col); box.style.setProperty("--c", col); sfx("hover"); };
        g.addEventListener("pointerenter", focus); g.addEventListener("focus", focus);
        g.addEventListener("click", () => { g.classList.add("pick"); unoColorPick(s); });
        g.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); g.dispatchEvent(new MouseEvent("click")); }
            else if (/^Arrow/.test(e.key)) { e.preventDefault(); const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1; slices[(s + dir + N) % N].focus(); }
        });
        slices.push(g); svg.appendChild(g);
    });
    hub.appendChild(svgEl("circle", { r: R0 - 6, class: "uw-hub-bg" }));
    hub.appendChild(svgEl("circle", { r: R0 - 6, class: "uw-hub-ring" }));
    [["uw-hk", "-6", "札"], ["uw-hn", "18", "PICK A COLOUR"], ["uw-hc", "32", "WILD"]].forEach(([c, y, t]) => { const e = svgEl("text", { class: c, y }); e.textContent = t; hub.appendChild(e); });
    svg.appendChild(hub);
    box.appendChild(svg);
    box.style.setProperty("--n", N);
    setTimeout(() => { if (!$("unoColor").classList.contains("hidden") && slices[0]) slices[0].focus({ preventScroll: true }); }, 60);
}
window.unoColorPick = s => { $("unoColor").classList.add("hidden"); if (unoPick != null) unoPlay(unoPick, s); unoPick = null; };
window.unoColorCancel = () => { $("unoColor").classList.add("hidden"); unoPick = null; };

/* ---------- special cards: swap target picker, banner, future sight ---------- */
/* Swap Hands target picker: an exchange portal. You sit in the middle of a vortex in the card's colour (the swap card's own
   picture spinning in it); the other players orbit you, each with a fan of their real card count. Hover / focus draws the
   exchange beam and says what you would end up with; click, tap or Enter swaps. Arrow keys walk round the ring. */
function unoBuildTargets(u, me) {
    const box = $("unoTargetBtns"); box.innerHTML = "";
    const c = unoPick != null ? u.cards[unoPick] : null, col = c ? UNO_SUIT[c.s] : "#7fd4ff", data = currentRoomData || {}, opp = unoLive(u).filter(p => p !== me), N = opp.length;
    $("unoTarget").style.setProperty("--c", col);
    $("unoTargetAb").textContent = c ? (c.ab || "SWAP HANDS") + " · " + c.n : "SWAP HANDS";
    const keep = Math.max(0, (u.hands["p" + me] || []).length - 1), hint = $("unoTargetHint");    // the swap card itself leaves your hand first
    const fan = (n, cls) => { const f = hbEl("div", "sw-fan " + (cls || "")), k = Math.min(n, 9); for (let i = 0; i < k; i++) { const b = hbEl("i"); b.style.setProperty("--r", ((i - (k - 1) / 2) * (k > 1 ? 44 / (k - 1) : 0)).toFixed(1) + "deg"); f.appendChild(b); } f.appendChild(hbEl("b", null, "×" + n)); return f; };
    const svg = svgEl("svg", { class: "sw-beams", viewBox: "-100 -100 200 200", "aria-hidden": "true" });
    svg.appendChild(svgEl("circle", { r: 76, class: "sw-orbit" }));
    const beamA = svgEl("line", { class: "sw-beam a", x1: 0, y1: 0, x2: 0, y2: 0 }), beamB = svgEl("line", { class: "sw-beam b", x1: 0, y1: 0, x2: 0, y2: 0 }); svg.append(beamA, beamB); box.appendChild(svg);
    const vortex = hbEl("div", "sw-vortex"); if (c) { const pic = hbEl("div", "sw-art"); unoSpArt(pic, c); vortex.appendChild(pic); } box.appendChild(vortex);
    const meEl = hbEl("div", "sw-me"); meEl.appendChild(avatarEl(pPub(data, me), { size: 52 })); meEl.appendChild(hbEl("b", null, "YOU")); meEl.appendChild(fan(keep, "me")); box.appendChild(meEl);
    const btns = [], idle = "Pick a player: their whole hand becomes yours, and yours becomes theirs.";
    hint.textContent = idle;
    const aim = (x, y, p, on) => {
        btns.forEach(b => b.classList.toggle("on", b === on)); box.classList.toggle("aiming", !!on);
        [beamA, beamB].forEach(l => { l.setAttribute("x2", x.toFixed(1)); l.setAttribute("y2", y.toFixed(1)); });
        hint.textContent = on ? "You get " + (u.hands["p" + p] || []).length + " card" + ((u.hands["p" + p] || []).length === 1 ? "" : "s") + " · " + (u.names["p" + p] || "?") + " gets your " + keep : idle;
        if (on) { box.style.setProperty("--pc", HB_COLORS[(p - 1) % HB_COLORS.length]); sfx("hover"); }
    };
    opp.forEach((p, i) => {
        const a = -Math.PI / 2 + (N === 1 ? 0 : i / N * Math.PI * 2), x = Math.cos(a) * 76, y = Math.sin(a) * 76, n = (u.hands["p" + p] || []).length;
        const b = hbEl("button", "sw-opp"); b.type = "button"; b.style.left = (50 + x / 2) + "%"; b.style.top = (50 + y / 2) + "%"; b.style.setProperty("--pc", HB_COLORS[(p - 1) % HB_COLORS.length]); b.style.setProperty("--i", i);
        b.setAttribute("aria-label", "Swap hands with " + (u.names["p" + p] || "?") + ", " + n + " card" + (n === 1 ? "" : "s"));
        b.appendChild(avatarEl(pPub(data, p), { size: 40 })); b.appendChild(hbEl("b", null, u.names["p" + p] || "?")); b.appendChild(fan(n));
        const go = () => aim(x, y, p, b);
        b.addEventListener("pointerenter", go); b.addEventListener("focus", go);
        b.addEventListener("pointerleave", () => { if (document.activeElement !== b) aim(0, 0, 0, null); });
        b.onclick = () => { b.classList.add("pick"); box.classList.add("go"); setTimeout(() => unoTargetPick(p), motionOK() ? 260 : 0); };
        b.addEventListener("keydown", e => { if (/^Arrow/.test(e.key)) { e.preventDefault(); const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1; btns[(i + d + N) % N].focus(); } });
        btns.push(b); box.appendChild(b);
    });
    box.classList.toggle("few", N <= 3); box.classList.toggle("many", N >= 6);
    setTimeout(() => { if (!$("unoTarget").classList.contains("hidden") && btns[0]) btns[0].focus({ preventScroll: true }); }, 60);
}
window.unoTargetPick = p => { if ($("unoTarget").classList.contains("hidden")) return; $("unoTarget").classList.add("hidden"); if (unoPick != null) unoPlay(unoPick, 0, p); unoPick = null; };
window.unoTargetCancel = () => { $("unoTarget").classList.add("hidden"); unoPick = null; };
function unoSpecialFx(u, f) {
    const c = u.cards[f.ci]; if (!c || !UNO_SP[c.k]) return;
    const d = UNO_SP[c.k], old = $("unoFx"); if (old) old.remove();
    const box = hbEl("div", "u-fx k-" + c.k); box.id = "unoFx"; box.style.setProperty("--c", UNO_SUIT[c.s]);
    box.appendChild(hbEl("div", "u-fx-em", d.emoji));
    box.appendChild(hbEl("h2", null, c.ab || d.label));
    box.appendChild(hbEl("p", null, (u.names["p" + f.p] || "?") + " · " + c.n));
    $("uno").appendChild(box);
    const close = () => { box.classList.add("out"); setTimeout(() => box.remove(), 420); const k = c.sk + "_" + c.k; if (TS[k] && tsOf(k).cine) { tsOf(k).cine = false; tsSync(tsU); } };
    if (!UNO_FX_HOOKS[c.sk + "_" + c.k]) try { d.snd(); } catch (e) {}   // silent while a hand-made animation exists (voice lines come from audio/special/)
    const hook = UNO_FX_HOOKS[c.sk + "_" + c.k];
    if (hook) { try { hook(box, close, c, u); } catch (e) { console.warn(e); close(); } } else setTimeout(close, 1700);
}
/* FREEZES THAT HOLD THE WHOLE PAGE (DIO's ZA WARUDO, Aokiji's Ice Age): while the player frozen by that card still has turns to lose,
   one fixed layer over everything (backdrop-filter + its own texture) holds the page for every player: grey for DIO, ice for Aokiji.
   The card's scene hands over to it without a seam (Aokiji's grows it outward from his palm), the others play on under it, and the
   moment the frozen player's last skipped turn is spent it plays its release: DIO's reversal, or the ice cracking and shattering. */
const TS = {
    jojo_f: { cls: "zw-veil", outMs: 2300,
        build: el => el.append(hbEl("i", "zw-holo"), hbEl("i", "zw-ring"), hbEl("span", "zw-say", "時は動き出す")),
        release: () => { sfx("reverse"); setTimeout(() => sfx("chime"), 900); } },
    onepiece_f: { cls: "ice-veil", outMs: 1900, grow: true,
        build: el => { const tx = hbEl("i", "ice-tex"); tx.style.backgroundImage = "url(" + iceTexture() + ")"; el.append(hbEl("i", "ice-cool"), tx, hbEl("i", "ice-mist"), hbEl("i", "ice-mist b")); for (let i = 0; i < 9; i++) { const gl = hbEl("i", "ice-glint"); gl.style.cssText = "left:" + (6 + 88 * CK.hs(i * 3.3)) + "%;top:" + (8 + 84 * CK.hs(i * 7.1)) + "%;animation-delay:" + (CK.hs(i * 5.7) * 7).toFixed(2) + "s"; el.appendChild(gl); } },
        hold: on => { clearInterval(TS.onepiece_f.iv); if (on) TS.onepiece_f.iv = setInterval(() => { if (motionOK() && !document.hidden) sfx("creak"); }, 7400); },
        release: v => iceShatter(v) },
    jjk_f: { cls: "snow-veil", outMs: 2300, grow: true,
        build: el => { const tx = hbEl("i", "ice-tex"); tx.style.backgroundImage = "url(" + iceTexture("lace") + ")"; const caps = document.createElement("canvas"); caps.className = "snow-caps";
            el.append(hbEl("i", "ice-cool"), tx, hbEl("i", "snow-fall"), hbEl("i", "snow-fall b"), caps, hbEl("i", "ice-mist"), hbEl("i", "ice-mist b"));
            for (let i = 0; i < 7; i++) { const gl = hbEl("i", "ice-glint"); gl.style.cssText = "left:" + (8 + 84 * CK.hs(i * 4.9)) + "%;top:" + (10 + 80 * CK.hs(i * 2.3)) + "%;animation-delay:" + (CK.hs(i * 8.1) * 7).toFixed(2) + "s"; el.appendChild(gl); } },
        hold: on => { clearInterval(TS.jjk_f.iv); if (on) { let k = 0; TS.jjk_f.iv = setInterval(() => { if (motionOK() && !document.hidden) sfx(k++ % 2 ? "creak" : "wind"); }, 6800); } },
        refresh: el => snowCaps(el),
        release: v => iceShatter(v, { snow: true }) },
    hxh_f: { cls: "chain-veil", outMs: 2200,
        build: el => { const a = document.createElement("canvas"), b = document.createElement("canvas"); a.className = "chain-static"; b.className = "chain-live"; el.append(a, b); },
        onStopped: d => { CH.origins = d.origins || null; CH.plate = d.plate || null; },
        hold: on => chainHold(on),
        refresh: () => chainStatic(false),
        release: v => chainRelease(v) },
    bleach_f: { cls: "hyo-veil", outMs: 3500, grow: true,
        build: el => { const tx = hbEl("i", "ice-tex"); tx.style.backgroundImage = "url(" + iceTexture() + ")"; const a = document.createElement("canvas"), b = document.createElement("canvas"); a.className = "hyo-crys"; b.className = "hyo-live"; el.append(hbEl("i", "ice-cool"), tx, a, b); },
        onStopped: d => { HYO.start = d.start || null; },
        hold: on => hyoHold(on),
        release: v => hyoRelease(v) }
};
const tsSt = {};
const tsOf = key => tsSt[key] || (tsSt[key] = { on: false, cine: false, el: null, tm: 0 });
function tsVeil(key) {
    const s = tsOf(key); if (!s.el) { s.el = hbEl("div", "ts-veil " + TS[key].cls); s.el.setAttribute("aria-hidden", "true"); TS[key].build(s.el); document.body.appendChild(s.el); }
    return s.el;
}
const tsActive = (u, key) => !!u && u.phase === "play" && unoLive(u).some(p => (u.frozen || {})["p" + p] > 0 && (u.fzk || {})["p" + p] === key);
let tsU = null;
function tsSync(u, instant) {
    tsU = u;
    Object.keys(TS).forEach(key => {
        const s = tsOf(key), want = tsActive(u, key), D = TS[key];
        if (want && !s.cine && (!s.on || s.el.classList.contains("pause") || s.el.classList.contains("grow"))) {
            s.on = true; const v = tsVeil(key); clearTimeout(s.tm); v.classList.remove("out", "pause", "grow"); v.style.removeProperty("--r"); v.style.webkitMaskImage = ""; v.style.maskImage = ""; v.classList.toggle("now", !!instant); void v.offsetWidth; v.classList.add("on"); D.hold && D.hold(true);
        }
        if (want && s.on && D.refresh) { const v = s.el; requestAnimationFrame(() => requestAnimationFrame(() => { if (s.on) D.refresh(v); })); }
        if (!want && s.on && D.refresh) { const c = s.el.querySelector(".snow-caps"); if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height); }
        if (!want && s.on) {
            s.on = false; const v = tsVeil(key); D.hold && D.hold(false);
            if (motionOK() && currentScreen === "uno") { v.classList.remove("out", "now", "pause", "grow"); void v.offsetWidth; v.classList.add("out"); v.classList.remove("on"); D.release(v); clearTimeout(s.tm); s.tm = setTimeout(() => v.classList.remove("out"), D.outMs); }
            else v.classList.remove("on", "now", "pause", "grow");
        }
    });
}
function tsReset() { Object.keys(tsSt).forEach(key => { const s = tsSt[key]; s.on = false; s.cine = false; TS[key].hold && TS[key].hold(false); if (s.el) s.el.classList.remove("on", "now", "pause", "out", "grow"); }); const c = $("iceShatter"); if (c) c.remove(); }
document.addEventListener("timestop", e => {
    const d = e.detail || {}, D = TS[d.key]; if (!D) return; const s = tsOf(d.key);
    if (d.ph === "start") { s.cine = true; const v = tsVeil(d.key); v.classList.remove("on", "out", "now"); if (D.grow) { v.classList.add("grow"); v.style.setProperty("--r", "0px"); } else v.classList.add("pause"); }
    else if (d.ph === "grow" && s.cine && D.grow && d.circles) { const v = tsVeil(d.key), m = d.circles.length ? d.circles.map(([x, y, r]) => "radial-gradient(circle at " + x.toFixed(0) + "px " + y.toFixed(0) + "px, #000 " + Math.max(0, r - 50).toFixed(0) + "px, transparent " + Math.max(1, r).toFixed(0) + "px)").join(",") : "linear-gradient(transparent, transparent)"; v.style.webkitMaskImage = m; v.style.maskImage = m; }
    else if (d.ph === "grow" && s.cine && D.grow) { const v = tsVeil(d.key); v.style.setProperty("--x", d.x.toFixed(1) + "px"); v.style.setProperty("--y", d.y.toFixed(1) + "px"); v.style.setProperty("--r", d.r.toFixed(1) + "px"); }
    else if (d.ph === "stopped") { s.cine = false; D.onStopped && D.onStopped(d); tsSync(tsU, true); }
});
/* the ice veil's frost: feathery frost thick at the screen's edges, a faint crystal grain everywhere, the centre left clear to read */
const iceTexURL = {};
function iceTexture(kind) {
    kind = kind || "fern"; if (iceTexURL[kind]) return iceTexURL[kind]; const lace = kind === "lace";
    // the screen's own proportions, so the ferns aren't stretched on a phone
    const W = 1200, H = Math.round(1200 * Math.min(2.4, Math.max(.4, innerHeight / innerWidth))), cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d"); g.lineCap = "round";
    const fern = (x, y, a, L, d, k) => { if (d > 4 || L < 4) return; const x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L; g.globalAlpha = .55 - d * .1; g.lineWidth = Math.max(.6, 2.2 - d * .45); g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
        for (let j = 1; j <= 3; j++) { const f = j / 4, bx = x + (x2 - x) * f, by = y + (y2 - y) * f; fern(bx, by, a + 1.05, L * .42, d + 1, k * 3 + j); fern(bx, by, a - 1.05, L * .42, d + 1, k * 5 + j); } fern(x2, y2, a + (CK.hs(k) - .5) * .5, L * .62, d + 1, k + 9); };
    g.strokeStyle = "#ffffff";
    if (lace) {                                                      // Uraume: lighter lace frost and snowflakes along the edges instead of heavy ferns
        g.lineWidth = 1;
        for (let i = 0; i < 70; i++) { const side = i % 4, u = CK.hs(i * 3.7 + 2), d = 10 + 70 * CK.hs(i * 1.9), x = side === 1 ? W - d : side === 3 ? d : u * W, y = side === 0 ? d : side === 2 ? H - d : u * H, R = 7 + 16 * CK.hs(i * 5.1);
            g.globalAlpha = .55 - d / 200; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + i; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); const mx = x + Math.cos(a) * R * .55, my = y + Math.sin(a) * R * .55; g.moveTo(mx, my); g.lineTo(mx + Math.cos(a + .6) * R * .3, my + Math.sin(a + .6) * R * .3); g.moveTo(mx, my); g.lineTo(mx + Math.cos(a - .6) * R * .3, my + Math.sin(a - .6) * R * .3); g.stroke(); } }
    }
    for (let i = 0; i < (lace ? 28 : 64); i++) {                     // ferns growing inward from all four edges
        const side = i % 4, u = CK.hs(i * 2.7 + 1), x = side === 0 ? u * W : side === 1 ? W : side === 2 ? u * W : 0, y = side === 0 ? 0 : side === 1 ? u * H : side === 2 ? H : u * H;
        const a = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][side] + (CK.hs(i * 4.1) - .5) * 1.1; fern(x, y, a, 40 + 70 * CK.hs(i * 6.3), 0, i + 1);
    }
    g.globalAlpha = .07; g.lineWidth = 1; for (let i = 0; i < 260; i++) { const x = CK.hs(i * 1.7) * W, y = CK.hs(i * 2.9) * H, L = 6 + 14 * CK.hs(i); for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3 + CK.hs(i) ; g.beginPath(); g.moveTo(x - Math.cos(a) * L, y - Math.sin(a) * L); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); } }   // six-point crystal grain
    g.globalAlpha = .16; g.lineWidth = 1.2; for (let i = 0; i < 7; i++) { let x = CK.hs(i * 9.1) * W, y = CK.hs(i * 4.4) * H, a = CK.hs(i * 3.3) * 6.28; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 9; k++) { a += (CK.hs(i * 17 + k) - .5) * .8; x += Math.cos(a) * 40; y += Math.sin(a) * 40; g.lineTo(x, y); } g.stroke(); }   // old hairline cracks
    return (iceTexURL[kind] = cv.toDataURL("image/png"));
}
window.addEventListener("resize", () => { const st = tsSt.jjk_f; if (st && st.on && st.el) snowCaps(st.el); });
/* KURAPIKA's Chain Jail held over the page: the same five chain routes his scene ended on (kit.js chainRoutes), the links drawn once
   on a static layer, the yellow Nen pulsing along them and sparks flickering on a live layer; the release loosens them, snaps them
   into pieces that fall away and dissolves them into yellow particles */
const CH = { origins: null, plate: null, routes: null, key: "", raf: 0, iv: 0 };
function chainBound() { const u = tsU; if (!u) return 0; return unoLive(u).find(p => (u.frozen || {})["p" + p] > 0 && (u.fzk || {})["p" + p] === "hxh_f") || 0; }
function chainCanvas(c) { const dpr = Math.min(1.5, devicePixelRatio || 1), w = innerWidth, h = innerHeight; if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); } const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); return g; }
function chainStatic(force) {
    const st = tsSt.hxh_f; if (!st || !st.el) return; const w = innerWidth, h = innerHeight, M = Math.min(w, h), p = chainBound();
    let plate = CH.plate; if (p) { const r = unoPlateRect(p); if (r && r.width) { const nr = { x: r.left, y: r.top, w: r.width, h: r.height }; if (!plate || Math.abs(nr.x - plate.x) + Math.abs(nr.y - plate.y) + Math.abs(nr.w - plate.w) > 6) plate = nr; } }
    const key = [w, h, plate && Math.round(plate.x), plate && Math.round(plate.y), plate && Math.round(plate.w)].join(",");
    if (!force && key === CH.key && CH.routes) return; CH.key = key; CH.plate = plate;
    CH.routes = CK.chainRoutes(w, h, CH.origins, plate);
    const g = chainCanvas(st.el.querySelector(".chain-static")); g.clearRect(0, 0, w, h); CK.chainGlow(g, w, h, 1);
    CH.routes.forEach((P, k) => CK.drawChain(g, P, 0, P.len, M * .0095 * (k === 1 ? 1.12 : 1), { aura: 1, noGlow: true, k }));
    const J = CH.routes[1], n = J.pts.length; CK.chainTip(g, J.pts[n - 1][0], J.pts[n - 1][1], Math.atan2(J.pts[n - 1][1] - J.pts[n - 2][1], J.pts[n - 1][0] - J.pts[n - 2][0]), J.kind, M * .0095 * 2.3);
}
function chainHold(on) {
    cancelAnimationFrame(CH.raf); clearInterval(CH.iv); CH.raf = 0; const st = tsSt.hxh_f; if (!on || !st || !st.el) return;
    chainStatic(true); const live = st.el.querySelector(".chain-live"); let last = 0;
    const frame = now => {
        CH.raf = requestAnimationFrame(frame); if (now - last < 40 || document.hidden) return; last = now;     // ~24 fps is plenty for a slow pulse
        const w = innerWidth, h = innerHeight, M = Math.min(w, h), g = chainCanvas(live), t = now / 1000; g.clearRect(0, 0, w, h); if (!CH.routes) return;
        const breathe = (.62 + .22 * Math.sin(t * 1.3)) * (Math.min(innerWidth, innerHeight) < 500 ? .8 : 1);
        CH.routes.forEach((P, k) => CK.drawChain(g, P, 0, P.len, M * .0095 * (k === 1 ? 1.12 : 1), { aura: breathe * (motionOK() ? 1 : .8), glowOnly: true, t: motionOK() ? t * .35 : 0, k }));
        if (motionOK()) { g.save(); g.globalCompositeOperation = "lighter"; for (let i = 0; i < 26; i++) { const P = CH.routes[i % 5], lf = (t * (.5 + CK.hs(i)) + CK.hs(i * 7)) % 1, s = P.len * CK.hs(i * 3.3 + Math.floor(t * (.5 + CK.hs(i)) + CK.hs(i * 7)));
            let j = 0; while (j < P.cum.length - 2 && P.cum[j + 1] < s) j++; const q = P.pts[j]; g.globalAlpha = Math.sin(lf * Math.PI) * .85; g.fillStyle = "#fff0a0"; g.fillRect(q[0] - 1.2, q[1] - 1.2 - lf * 8, 2.4, 2.4); } g.restore(); }
    };
    CH.raf = requestAnimationFrame(frame);
    let k = 0; CH.iv = setInterval(() => { if (motionOK() && !document.hidden) sfx(k++ % 3 ? "creak" : "clink"); }, 6200);
}
function chainRelease(v) {
    cancelAnimationFrame(CH.raf); clearInterval(CH.iv); const st = tsSt.hxh_f; if (!st || !st.el || !CH.routes) return;
    const sc = st.el.querySelector(".chain-static"), live = st.el.querySelector(".chain-live"); sc.getContext("2d").clearRect(0, 0, sc.width, sc.height);
    const LOOSE = 700, ALL = 2000, t0 = performance.now(), routes = CH.routes; sfx("clink"); setTimeout(() => sfx("clink"), 220); setTimeout(() => sfx("clink"), 440); setTimeout(() => sfx("chainbreak"), LOOSE);
    const frame = now => {
        const el = now - t0, w = innerWidth, h = innerHeight, M = Math.min(w, h), g = chainCanvas(live); g.clearRect(0, 0, w, h); if (el > ALL || !live.isConnected) return;
        const p1 = Math.min(1, el / LOOSE), p2 = Math.max(0, (el - LOOSE) / (ALL - LOOSE)), e2 = 1 - Math.pow(1 - p2, 2);
        CK.chainGlow(g, w, h, 1 - p2);
        routes.forEach((P, k) => {
            const sag = s => { const A = M * .035 * p1, pc = Math.floor(s / 150), dx = (CK.hs(pc * 3.1 + k) - .5) * M * .5 * e2, dy = (CK.hs(pc * 5.7 + k) - .7) * M * .3 * e2 + e2 * e2 * h * .5;
                return [Math.sin(s * .02 + k + el * .012) * A * .5 + dx, Math.abs(Math.sin(s * .006 + k)) * A + dy]; };
            g.save(); g.globalAlpha = 1 - p2; CK.drawChain(g, P, 0, P.len, M * .0095 * (k === 1 ? 1.12 : 1), { aura: 1 - p1 * .85, t: el / 1000, k, off: sag }); g.restore();
        });
        if (p2 > 0) { g.save(); g.globalCompositeOperation = "lighter"; for (let i = 0; i < 260; i++) { const P = routes[i % 5], s = P.len * CK.hs(i * 2.9); let j = 0; while (j < P.cum.length - 2 && P.cum[j + 1] < s) j++; const q = P.pts[j];
            g.globalAlpha = (1 - p2) * (.5 + .5 * CK.hs(i)); g.fillStyle = i % 3 ? "#ffd23a" : "#fff4b8"; g.beginPath(); g.arc(q[0] + Math.sin(i + el * .004) * 16 * e2, q[1] - e2 * M * (.15 + .35 * CK.hs(i * 4.4)), 1.4 + 2 * CK.hs(i * 6.6), 0, 6.283); g.fill(); } g.restore(); }
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
}
window.addEventListener("resize", () => { const st = tsSt.hxh_f; if (st && st.on) chainStatic(true); });
/* HITSUGAYA's Daiguren Hyorinmaru held over the page in two layers: the inner frosted sheet (the veil's own backdrop + frost) and the
   outer diamond crystals and ice flowers (kit.js crystalField, the same ones the scene grew); on a live layer Hyorinmaru stays coiled
   round the edges breathing cold, its eye glowing, with snow and glinting crystals. The release breaks the layers one at a time:
   the crystals shatter and the dragon roars and dissolves, then after a beat the frozen sheet cracks like glass and falls away. */
const HYO = { start: null, crys: null, raf: 0, iv: 0 };
const HYO_DRAGON = { scale: 1.5, wings: 1, span: .5, n: 90, alpha: .55 };
const hyoDragon = () => Object.assign({}, HYO_DRAGON, { scale: HYO_DRAGON.scale * (innerWidth < 600 ? .75 : 1) });
function hyoHold(on) {
    cancelAnimationFrame(HYO.raf); clearInterval(HYO.iv); HYO.raf = 0; const st = tsSt.bleach_f; if (!on || !st || !st.el) return;
    const w = innerWidth, h = innerHeight, M = Math.min(w, h); HYO.crys = CK.crystalField(w, h);
    const gc = chainCanvas(st.el.querySelector(".hyo-crys")); gc.clearRect(0, 0, w, h); HYO.crys.forEach(c => CK.crystalDraw(gc, c, 1, 0));
    const live = st.el.querySelector(".hyo-live"), P = CK.hyoPath(w, h, HYO.start); let last = 0;
    const frame = now => {
        HYO.raf = requestAnimationFrame(frame); if (now - last < 42 || document.hidden) return; last = now;
        const g = chainCanvas(live), t = now / 1000, mo = motionOK(); g.clearRect(0, 0, w, h);
        const hd = P(1), hn = P(.996), an = Math.atan2(hd[1] - hn[1], hd[0] - hn[0]);
        if (mo) for (let i = 0; i < 9; i++) { const q = (t * .18 + i / 9) % 1, d = M * (.06 + q * .3); CK.pool(g, hd[0] + Math.cos(an) * d - q * M * .1, hd[1] + Math.sin(an) * d, M * (.05 + q * .13), "#eef8ff", .26 * (1 - q)); }   // the breath drifting
        CK.iceDragon(g, P, 1, M, mo ? t * .5 : 0, hyoDragon());
        if (mo) { for (let i = 0; i < 6; i++) { const c = HYO.crys[Math.floor(CK.hs(i * 7.3 + Math.floor(t * .7 + i * .4)) * HYO.crys.length)], q = (t * .7 + i * .4) % 1; if (c) CK.crystalDraw(g, c, 0.0001, Math.sin(q * Math.PI) * .8); }   // glints
            g.fillStyle = "#fff"; for (let i = 0; i < 60; i++) { const y = ((CK.hs(i) * h + t * (16 + 26 * CK.hs(i + 3))) % (h + 20)) - 10, x = (CK.hs(i + 9) * w + Math.sin(t * .6 + i) * 24) % w; g.globalAlpha = .7; g.beginPath(); g.arc(x, y, 1 + 1.8 * CK.hs(i + 4), 0, 6.283); g.fill(); } g.globalAlpha = 1; }
    };
    HYO.raf = requestAnimationFrame(frame);
    let k = 0; HYO.iv = setInterval(() => { if (motionOK() && !document.hidden) sfx(k++ % 2 ? "creak" : "wind"); }, 7000);
}
function hyoRelease(v) {
    cancelAnimationFrame(HYO.raf); clearInterval(HYO.iv); const st = tsSt.bleach_f; if (!st || !st.el) return;
    const w = innerWidth, h = innerHeight, M = Math.min(w, h), crys = HYO.crys || CK.crystalField(w, h), P = CK.hyoPath(w, h, HYO.start), cc = st.el.querySelector(".hyo-crys"), live = st.el.querySelector(".hyo-live");
    cc.getContext("2d").clearRect(0, 0, cc.width, cc.height);
    sfx("roar"); setTimeout(() => { sfx("shatter"); sfx("boom"); }, 120);
    const ONE = 1150, t0 = performance.now();
    const frame = now => {                                          // stage 1: the crystals shatter into glitter, Hyorinmaru roars and dissolves into ice
        const el = now - t0, p = Math.min(1, el / ONE), e = 1 - Math.pow(1 - p, 2), g = chainCanvas(live); g.clearRect(0, 0, w, h); if (el > ONE || !live.isConnected) return;
        crys.forEach((c, i) => { const dx = c.x - w / 2, dy = c.y - h / 2, d = Math.hypot(dx, dy) || 1;
            for (let k = 0; k < (c.kind === "gem" ? 2 : 4); k++) { const a = Math.atan2(dy, dx) + (CK.hs(i * 5 + k) - .5) * 1.4, sp = M * (.15 + .3 * CK.hs(i * 3 + k)) * e, x = c.x + Math.cos(a) * sp, y = c.y + Math.sin(a) * sp + e * e * h * .35, sz = c.sz * (.25 + .2 * CK.hs(i + k));
                g.save(); g.globalAlpha = 1 - p; g.translate(x, y); g.rotate(c.a + e * 6 * (CK.hs(i * 9 + k) - .5)); g.beginPath(); g.moveTo(sz, 0); g.lineTo(-sz * .4, -sz * .45); g.lineTo(-sz * .3, sz * .4); g.closePath(); g.fillStyle = k % 2 ? "rgba(160,215,255,.9)" : "rgba(240,250,255,.95)"; g.fill(); g.strokeStyle = "rgba(20,70,140,.7)"; g.lineWidth = 1; g.stroke(); g.restore(); } });
        const roar = Math.min(1, el / 400), hd = P(1); if (roar < 1) CK.glow(g, hd[0], hd[1], M * .35 * roar, "#dff2ff", 1 - roar);
        CK.iceDragon(g, P, 1, M, el / 600, Object.assign(hyoDragon(), { alpha: .55 * (1 - e) }));
        g.save(); g.globalCompositeOperation = "lighter"; for (let i = 0; i < 220; i++) { const q = CK.hs(i * 2.1), b = P(1 - .5 * q); g.globalAlpha = (1 - p) * .9; g.fillStyle = i % 3 ? "#cfeaff" : "#ffffff"; g.fillRect(b[0] + (CK.hs(i * 3.3) - .5) * M * .1 + Math.sin(i + el * .005) * 20 * e, b[1] - e * M * (.1 + .3 * CK.hs(i * 4.7)), 2.5, 2.5); } g.restore();
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    setTimeout(() => { if (v.classList.contains("out")) iceShatter(v); }, ONE + 250);     // stage 2, after a beat: the frozen sheet cracks like glass and falls away
}
window.addEventListener("resize", () => { const st = tsSt.bleach_f; if (st && st.on) hyoHold(true); });
/* Uraume's snow settles on the top edges of the real cards, plates, piles and buttons (re-drawn when the table re-renders) */
function snowCaps(v) {
    const c = v && v.querySelector(".snow-caps"); if (!c) return; const dpr = Math.min(1.5, devicePixelRatio || 1), w = innerWidth, h = innerHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    document.querySelectorAll("#uno .ucard, #uno .u-opp, #uno #unoDraw, #uno button").forEach((el, i) => {
        const r = el.getBoundingClientRect(); if (r.width < 24 || r.height < 14 || r.bottom < 0 || r.top > h || getComputedStyle(el).visibility === "hidden") return;
        const n = Math.max(3, Math.round(r.width / 14)), y0 = r.top + 1, th = Math.min(14, 6 + r.width / 30);
        g.beginPath(); g.moveTo(r.left + 2, y0 + 1);
        for (let k = 0; k <= n; k++) { const x = r.left + 2 + (r.width - 4) * k / n, bump = th * (.55 + .45 * CK.hs(i * 13 + k)) * Math.sin(Math.PI * Math.min(1, Math.min(k, n - k) / 1.6 + .25)); g.lineTo(x, y0 - bump); }
        g.lineTo(r.right - 2, y0 + 2); g.quadraticCurveTo(r.left + r.width / 2, y0 + 4, r.left + 2, y0 + 1); g.closePath();
        g.fillStyle = "rgba(255,255,255,.92)"; g.shadowColor = "rgba(120,170,220,.55)"; g.shadowBlur = 4; g.shadowOffsetY = 1.5; g.fill(); g.shadowColor = "transparent";
    });
}
/* the release of Aokiji's ice: cracks race over the whole screen, then the ice bursts into shards that fall away while the colour returns */
function iceShatter(v, opt) {
    opt = opt || {};
    const old = $("iceShatter"); if (old) old.remove();
    const cv = document.createElement("canvas"); cv.id = "iceShatter"; cv.className = "ice-shatter"; const w = innerWidth, h = innerHeight, dpr = Math.min(1.5, devicePixelRatio || 1);
    cv.width = w * dpr; cv.height = h * dpr; document.body.appendChild(cv); const g = cv.getContext("2d");
    const cracks = []; for (let k = 0; k < 16; k++) { const o = k < 4 ? [w / 2, h / 2] : [w * CK.hs(k * 3.1), h * CK.hs(k * 5.3)]; let x = o[0], y = o[1], a = CK.hs(k * 7.7) * 6.28; const pts = [[x, y]]; for (let j = 0; j < 12; j++) { a += (CK.hs(k * 13 + j) - .5) * .9; x += Math.cos(a) * Math.hypot(w, h) / 22; y += Math.sin(a) * Math.hypot(w, h) / 22; pts.push([x, y]); } cracks.push(pts); }
    const lines = []; for (let k = 0; k < (opt.snow ? 16 : 11); k++) lines.push(CK.randLine(k + 70 + (Date.now() % 50), w, h));
    if (opt.snow) setTimeout(() => sfx("wind"), 640);
    const shards = CK.shardsOf(w, h, lines), CRACK = 520, ALL = 1750, t0 = performance.now();
    sfx("crack"); setTimeout(() => sfx("crack"), 230); setTimeout(() => sfx("shatter"), CRACK);
    v.classList.add("cracking");
    const frame = now => {
        const el = now - t0; if (el > ALL || !cv.isConnected) { cv.remove(); return; }
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
        if (el < CRACK) {                                            // cracks spreading, faster and faster
            const q = Math.pow(el / CRACK, .7); g.lineCap = "round";
            cracks.forEach(pts => { const n = Math.max(1, Math.floor(pts.length * q)); [[7, "rgba(140,210,255,.35)"], [2, "rgba(255,255,255,.95)"]].forEach(([lw, col]) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); for (let i = 0; i < n; i++) i ? g.lineTo(pts[i][0], pts[i][1]) : g.moveTo(pts[i][0], pts[i][1]); g.stroke(); }); });
            g.fillStyle = "rgba(225,245,255," + (.18 * q) + ")"; g.fillRect(0, 0, w, h);
        } else {                                                     // the ice bursts: shards fly outward and fall, spinning, fading
            if (!v.classList.contains("broken")) v.classList.add("broken");
            const p = (el - CRACK) / (ALL - CRACK), e = 1 - Math.pow(1 - p, 2);
            shards.forEach(S => {
                const dx = S.dx * e * Math.hypot(w, h) * .22 * S.d, dy = S.dy * e * Math.hypot(w, h) * .14 * S.d + p * p * h * .9, rot = S.r * e;
                g.save(); g.globalAlpha = Math.max(0, 1 - p * 1.1); g.translate(S.cx + dx, S.cy + dy); g.rotate(rot); g.translate(-S.cx, -S.cy);
                g.beginPath(); S.p.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath();
                const sg = g.createLinearGradient(S.cx - 80, S.cy - 80, S.cx + 80, S.cy + 80); sg.addColorStop(0, "rgba(240,250,255,.66)"); sg.addColorStop(.5, "rgba(170,220,255,.34)"); sg.addColorStop(1, "rgba(255,255,255,.58)");
                g.fillStyle = sg; g.fill(); g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 2; g.stroke(); g.restore();
            });
            if (opt.snow) for (let i = 0; i < 460; i++) {             // the flurry: snow bursts out of the break and blows away to the right
                const x0 = CK.hs(i * 1.3) * w, y0 = CK.hs(i * 2.7) * h, sw = Math.sin(p * 6 + i) * 30 * p, x = x0 + e * w * (.5 + .7 * CK.hs(i * 4.1)) + sw, y = y0 - e * h * (.15 + .3 * CK.hs(i * 5.3)) + Math.cos(p * 5 + i) * 20 * p;
                g.globalAlpha = (1 - p) * (.55 + .45 * CK.hs(i)); g.fillStyle = "#ffffff"; g.beginPath(); g.arc(x, y, 1.6 + 3.4 * CK.hs(i * 7.7), 0, 6.283); g.fill(); }
            for (let i = 0; i < 60; i++) { const a = CK.hs(i * 2.2) * 6.28, sp = (.3 + CK.hs(i * 3.9)) * Math.hypot(w, h) * .45 * e, x = w / 2 + Math.cos(a) * sp, y = h / 2 + Math.sin(a) * sp + p * p * h * .6; g.globalAlpha = 1 - p; g.fillStyle = "#ffffff"; g.fillRect(x, y, 3, 3); }
            g.globalAlpha = 1;
        }
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    setTimeout(() => v.classList.remove("cracking", "broken"), ALL + 400);
}

/* Future Sight, during the extra play: the hand you saw stays as a small reminder next to the table (only for you, only until
   the extra play is used). The big reveal itself is part of the card's cinematic (js/cine/peek.js). */
function unoSightStrip(u, me, show) {
    const old = $("unoSight"); if (old) old.remove();
    if (!show || !u.peek || u.peek.p !== me) return;
    const to = Number(u.peek.to), hand = u.hands["p" + to] || []; if (!to || !hand.length) return;
    const box = hbEl("div", "u-sight"); box.id = "unoSight"; box.style.setProperty("--pc", HB_COLORS[(to - 1) % HB_COLORS.length]);
    box.appendChild(hbEl("small", null, "👁 " + (u.names["p" + to] || "?") + "'s hand"));
    const row = hbEl("div", "u-sight-row");
    hand.slice().sort((a, b) => (u.cards[a].s - u.cards[b].s) || (u.cards[a].v - u.cards[b].v)).forEach(ci => { const cell = hbEl("div", "u-sight-cell"); cell.appendChild(unoCardEl(u, ci, "")); cell.title = u.cards[ci].n; row.appendChild(cell); });
    box.appendChild(row); $("unoInfo").appendChild(box);
}

/* =====================================================================
   ROOMS · LOBBY · ROUTING
   A room is a persistent party: players join the lobby first, choose a mode
   together (the host decides, everyone can vote), play, and come back to the
   lobby for a rematch or another mode. Only an explicit "Close room" (host),
   or the last player leaving, deletes the room and its data.
   ===================================================================== */
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8];          // the squad: up to 8 players per room
const ROOM_MAX = SLOTS.length;
const MODE_OF_KEY = { gw: "classic", hb: "headbanz", im: "imposter", uno: "uno" };
const MODES = {
    classic:  { key: "gw",  name: "Guess Who", tag: "CASE FILE", kanji: "探", min: 2, max: 8, seats: "1v1 · rest spectate", short: "1v1", color: "#f2b33d", sub: "Hide. Ask. Accuse.", blurb: "1v1 deduction duel. Hide a character, ask yes/no questions, accuse first.", art: ["images/anime/naruto/na3.jpg", "images/character12.jpg", "images/anime/jjk/jk5.jpg"] },
    headbanz: { key: "hb",  name: "Headbanz", tag: "MIND LINK", kanji: "心", min: 2, max: 8, color: "#b06bff", sub: "Read the room. Read yourself.", blurb: "Everyone sees your character but you. Ask, deduce, name yourself first.", art: ["images/anime/demonslayer/ds2.jpg", "images/anime/dragonball/db4.jpg", "images/anime/bleach/bc6.jpg"] },
    imposter: { key: "im",  name: "Imposter", tag: "SHADOW TRIAL", kanji: "偽", min: 3, max: 8, color: "#ff3355", sub: "Someone here is lying.", blurb: "All but one know the character. Give clues, vote, unmask the fake.", art: ["images/anime/jjk/jk2.jpg", "images/anime/bleach/bc3.jpg", "images/anime/naruto/na9.jpg"] },
    uno:      { key: "uno", name: "Anime UNO", tag: "ARENA CLASH", kanji: "札", min: 2, max: 8, color: "#ffcf4a", sub: "Every anime a colour. No mercy.", blurb: "Classic: 4 anime, 4 colours. Chaos: up to 8. Stack +2s, special moves.", art: ["images/special/jjk_vision.jpg", "images/special/onepiece_ultimate.jpg", "images/special/dragonball_ultimate.jpg"] }
};
const RULES = {
    classic: ["Two players duel 1v1 (with more people in the room, the host picks the duelists and everyone else spectates). Both secretly pick a character from the same board.", "On your turn, ask one yes/no question out loud, then flip down every character it rules out.", "Press END TURN when you are done. Think you know it? Press ACCUSE and tap their character.", "A right accusation wins. A wrong one hands the win to your opponent."],
    headbanz: ["Everyone gets a character card that all the others can see, except you.", "Take turns asking yes/no questions about your own card; the others answer.", "Guess your character whenever you like. Three wrong guesses and you sit out the round.", "2 to 8 players, everyone at once. Points per round follow the guessing order: with N players the 1st right guess scores N, the next N-1 and so on (8 players: 8, 7, 6 ... 1). Giving up or three strikes scores 0."],
    imposter: ["Everyone sees the same secret character, except one imposter.", "Two clue rounds: on your call, say one clue out loud. Never say the name.", "Then vote. Catch the imposter and the crew scores; if they slip away, they score big.", "A caught imposter can still steal points by naming the character."],
    uno: ["Classic deck: pick exactly 4 anime (red, green, yellow, dark blue). Chaos deck: pick 4 to 8 (adds pink, orange, purple, light blue). Match the colour, or the attribute or action of the top card.", "Skip, Reverse, Wild and Wild +4 work like classic UNO. Draw-2s stack: answer a +2 with a +2 to pass on +4, +6, +8... or take the whole stack.", "Specials: Freeze (next player loses 2 turns), Swap Hands, Ultimate (+5) and Future Sight (see the next player's hand, then play one more card).", "No UNO call: down to one card, just keep playing. Empty your hand to take the next place; the round goes on until every place is decided."]
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
    const s = hbEl("span", "pchip"); s.style.setProperty("--pc", HB_COLORS[(p - 1) % HB_COLORS.length]);
    if (prefix) s.appendChild(hbEl("i", "pchip-pre", prefix));
    s.appendChild(avatarEl(pPub(d, p), { size: 26 })); s.appendChild(hbEl("b", null, pName(d, p)));
    return s;
}
function gwSeats(d) { const s = arr(d && d.gw && d.gw.seats).map(Number); return s.length === 2 ? s : [1, 2]; }
const gwOther = (d, p) => { const s = gwSeats(d); return s[0] === Number(p) ? s[1] : s[0]; };
/* Guess Who stays a 1v1 duel; with more than 2 in the room the host picks the duelists (d.gwDuel) and the rest spectate.
   Until the host picks, the host and the next player duel. [-1] = the host cleared both picks. */
function gwDuelists(d) {
    const act = activeSlots(d);
    if (act.length <= 2) return act.slice();
    if (!d.gwDuel) return [hostSlot(d), act.find(i => i !== hostSlot(d))];
    return arr(d.gwDuel).map(Number).filter((x, i, a) => act.includes(x) && a.indexOf(x) === i).slice(0, 2);
}
const gwSpectating = d => !!d && (d.gameType || "classic") === "classic" && !!d.status && d.status !== "waiting" && !!(d.gw && d.gw.seats) && !gwSeats(d).includes(Number(myPlayer));
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
    b.style.setProperty("--pc", HB_COLORS[(i - 1) % HB_COLORS.length]);
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
    return { gameType, animes: fixSeries(gameType, arr(p.animes).length ? arr(p.animes) : ["onepiece"], p.unoDeck), boardSize: [24, 48, 96].includes(Number(p.boardSize)) ? Number(p.boardSize) : 24, difficulty: ["easy", "normal", "hard"].includes(p.difficulty) ? p.difficulty : "normal", rounds: [3, 5, 7, 10].includes(Number(p.rounds)) ? Number(p.rounds) : 5, laps: Number(p.laps) === 2 ? 2 : 1, unoDeck: p.unoDeck === "chaos" ? "chaos" : "classic" };
}
function saveLobbyPrefs(d) { try { localStorage.setItem(PREF_KEY, JSON.stringify({ gameType: d.gameType, animes: arr(d.animes), boardSize: d.boardSize, difficulty: d.difficulty, rounds: d.rounds, laps: d.laps, unoDeck: unoDeckType(d) })); } catch (e) {} }
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
        if (activeSlots(data).length >= ROOM_MAX) { toast("This room is full (" + ROOM_MAX + " players)."); return; }
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
    setRoomCode(room);
    try { history.replaceState(null, "", location.pathname + "?room=" + room); } catch (e) {}
    listenToRoom();
    startPresence();
    if (!currentRoomData) showOnly("lobby");
}
function lobbySet(patch) {
    if (!room || !currentRoomData || currentRoomData.status !== "waiting" || !amHost()) return;
    update(ref(db, "rooms/" + room), patch).catch(e => { console.error(e); toast("Couldn't save that setting."); });
}
function fixSeries(t, keys, deck) {
    keys = arr(keys);
    if (t === "classic") { keys = keys.filter(k => ANIME_LIBRARY[k]); if (!keys.length) keys = ["onepiece"]; }
    else if (t === "uno") { keys = keys.filter(k => UNO_DECKS[k]).slice(0, UNO_DECK_RANGE[deck === "chaos" ? "chaos" : "classic"][1]); for (const k of ["onepiece", "naruto", "dragonball", "jjk", "demonslayer", "bleach"]) { if (keys.length >= 4) break; if (!keys.includes(k)) keys.push(k); } }
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
    lobbySet({ gameType: t, animes: fixSeries(t, arr(d.animes), unoDeckType(d)) });
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
    if (t === "classic" && n > 2 && gwDuelists(d).length !== 2) return { ok: false, msg: "Guess Who is a 1v1 duel: pick the 2 duelists (" + gwDuelists(d).length + "/2). Everyone else spectates." };
    if (t === "uno") {
        const deck = unoDeckType(d), [lo, hi] = UNO_DECK_RANGE[deck];
        if (keys.length < lo || keys.length > hi) return { ok: false, msg: deck === "chaos" ? "Chaos deck needs 4 to 8 series (" + keys.length + " ticked)." : "Classic deck needs exactly 4 series (" + keys.length + "/4 ticked)." };
        if (!d.uno || !d.uno.cards || d.uno.key !== unoDeckKey(keys)) return { ok: false, wait: true, msg: amHost() ? "Forging the deck… " + (unoDeckPct || 1) + "%" : "The host is forging the deck…" };
    }
    if (t === "headbanz" || t === "imposter") {
        const packs = d.packs || {}, missing = activeSlots(d).filter(i => Number(packs["p" + i]) < 100 || packs["p" + i] == null);
        if (missing.length) return { ok: false, wait: true, msg: "Loading characters for " + missing.map(i => pName(d, i)).join(", ") + "…" };
    }
    const extra = t === "headbanz" ? " · " + (d.rounds || 5) + " rounds, everyone at once" : t === "imposter" ? " · " + n * (Number(d.laps) || 1) + " rounds" : t === "classic" ? " · " + (d.boardSize || 24) + " cards" + (n > 2 ? " · " + gwDuelists(d).map(i => pName(d, i)).join(" vs ") + ", " + (n - 2) + " spectating" : "") : " · " + (unoDeckType(d) === "chaos" ? "Chaos" : "Classic") + " deck · " + arr(d.uno && d.uno.anime).join(" · ");
    return { ok: true, msg: M.name + extra };
}
let modeCardsBuilt = false, seatSig = "";
const seatSeen = new Set(), readySeen = new Set();
let lastMode = "";
const modePlayers = M => (M.min === M.max ? M.min : M.min + "–" + M.max) + " players" + (M.seats ? " · " + M.seats : "");
function buildModeCards() {
    if (modeCardsBuilt) return; modeCardsBuilt = true;
    const box = $("lobbyModes");
    Object.entries(MODES).forEach(([t, M]) => {
        const b = hbEl("button", "mode-card"); b.dataset.mode = t; b.style.setProperty("--mc", M.color);
        const art = hbEl("div", "mc-art"); M.art.forEach((src, i) => { const im = makeImg(src); im.style.setProperty("--i", i); art.appendChild(im); });
        b.append(art, hbEl("div", "mc-kanji", M.kanji), hbEl("div", "mc-tag", M.tag), hbEl("b", "mc-name", M.name), hbEl("p", "mc-blurb", M.blurb));
        const foot = hbEl("div", "mc-foot"); foot.append(hbEl("span", "mc-players", modePlayers(M)), hbEl("span", "mc-votes"));
        b.append(foot, hbEl("div", "mc-sel", "SELECTED"), hbEl("div", "mc-brk"), hbEl("div", "mc-curs"));
        b.onclick = () => pickMode(t);
        b.onmouseenter = () => sfx("hover");
        box.appendChild(b);
    });
}
/* the menu's arcade cabinets, one per mode: marquee, a CRT running the attract loop, joystick + buttons, coin door */
function buildHomeModes() {
    const box = $("homeModes"); if (!box || box.childElementCount) return;
    Object.entries(MODES).forEach(([t, M], i) => {
        const c = hbEl("div", "cab"); c.style.setProperty("--mc", M.color); c.style.setProperty("--i", i);
        const mq = hbEl("div", "cab-mq"); mq.append(hbEl("b", null, M.name), hbEl("i", null, M.kanji));
        const scr = hbEl("div", "cab-scr"); M.art.forEach((src, k) => { const im = makeImg(src); if (k === 0) im.classList.add("on"); scr.appendChild(im); });
        scr.append(hbEl("div", "cab-crt"), hbEl("span", "cab-tag", M.tag), hbEl("span", "cab-sub", M.sub), hbEl("span", "cab-ps", "PRESS START"));
        const cp = hbEl("div", "cab-cp"); cp.append(hbEl("span", "cab-stick"), hbEl("span", "cab-b"), hbEl("span", "cab-b"), hbEl("span", "cab-b"));
        const door = hbEl("div", "cab-door"); door.append(hbEl("span", "cab-slot"), hbEl("span", "cab-pl", M.min + "–" + M.max + "P" + (M.short ? " · " + M.short : "")), hbEl("span", "cab-slot"));
        const body = hbEl("div", "cab-body"); body.append(scr, cp);
        c.append(mq, body, door);
        c.tabIndex = 0; c.setAttribute("role", "button"); c.setAttribute("aria-label", M.name + ": how to play");
        c.onmouseenter = () => sfx("hover");
        c.onclick = () => { sfx("click"); c.classList.remove("boot"); void c.offsetWidth; c.classList.add("boot"); setTimeout(() => showRules(t), motionOK() ? 260 : 0); };
        c.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); c.click(); } };
        box.appendChild(c);
    });
    let tick = 0;          // attract mode: each screen steps through its three shots, out of phase with its neighbours
    setInterval(() => {
        if (currentScreen !== "home" || document.hidden || !motionOK()) return;
        tick++;
        box.querySelectorAll(".cab").forEach((c, i) => { if ((tick + i) % 2) return; const ims = c.querySelectorAll(".cab-scr img"), on = [...ims].findIndex(im => im.classList.contains("on")); ims[on].classList.remove("on"); ims[(on + 1) % ims.length].classList.add("on"); });
    }, 1700);
}
/* the room code as lit cells (the textContent stays the plain code) */
function setRoomCode(code) {
    const el = $("roomCode"); if (el.textContent === code) return;
    el.innerHTML = ""; [...String(code)].forEach((ch, k) => { const c = hbEl("span", null, ch); c.style.setProperty("--k", k); el.appendChild(c); });
}
/* host = insert coin: the coin drops into the slot, the credit counter ticks, then the room is made */
let credits = 0;
window.insertCoin = function () {
    const btn = document.querySelector("#home .home-cta > .btn"), coin = $("coinFly");
    if (creating || (btn && btn.disabled)) return;
    sfx("coin");
    const cr = $("credit"); credits = Math.min(99, credits + 1); cr.querySelector("b").textContent = String(credits).padStart(2, "0"); cr.classList.remove("pop"); void cr.offsetWidth; cr.classList.add("pop");
    if (!motionOK()) return createRoom();
    coin.classList.remove("go"); void coin.offsetWidth; coin.classList.add("go");
    setTimeout(() => { btn.classList.remove("fed"); void btn.offsetWidth; btn.classList.add("fed"); }, 330);
    setTimeout(() => createRoom(), 430);
};
/* the join field: six cells like a high-score entry, the next free one blinks */
function renderJoinCells(hit) {
    const v = $("joinCode").value, cells = $("joinCells"); if (!cells) return;
    [...cells.children].forEach((c, k) => { c.textContent = v[k] || ""; c.classList.toggle("cur", k === Math.min(v.length, 5) && v.length < 6); if (hit && k === v.length - 1) { c.classList.remove("hit"); void c.offsetWidth; c.classList.add("hit"); } });
    cells.classList.toggle("full", v.length === 6); cells.classList.toggle("empty", !v.length);
    $("joinArea").classList.toggle("go", v.length === 6);
}
/* pointer tilt for cabinets, the member card and the stage cards (fine pointers only) */
function bindTilt() {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let cur = null;
    const reset = el => { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); };
    document.addEventListener("pointermove", e => {
        const el = e.target.closest && e.target.closest(".cab, .mode-card, [data-tilt]");
        if (cur && cur !== el) { reset(cur); cur = null; }
        if (!el || !motionOK()) return;
        cur = el; const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height, k = el.classList.contains("mode-card") ? 6 : 9;
        el.style.setProperty("--ry", ((x - .5) * k * 2).toFixed(2) + "deg"); el.style.setProperty("--rx", ((.5 - y) * k * 1.6).toFixed(2) + "deg");
        el.style.setProperty("--mx", (x * 100).toFixed(1) + "%"); el.style.setProperty("--my", (y * 100).toFixed(1) + "%");
    }, { passive: true });
}
/* HERE COMES A NEW CHALLENGER: somebody joined the room while you were in the lobby */
let challTimer = 0;
function newChallenger(p, col) {
    const el = $("challenger"); if (!el) return;
    el.innerHTML = ""; el.style.setProperty("--pc", col);
    const tx = hbEl("div", "ch-txt"); tx.append(hbEl("small", null, "HERE COMES A NEW CHALLENGER!"), hbEl("b", null, p.name || "Player"));
    el.append(avatarEl(p, { size: 70 }), tx);
    el.classList.remove("hidden"); el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
    sfx("slam"); clearTimeout(challTimer); challTimer = setTimeout(() => el.classList.add("hidden"), 2200);
}
function lobbyRefresh() { if (currentRoomData && !$("lobby").classList.contains("hidden")) lobbyRender(currentRoomData); }
let lobbyCountSeen = 0;
function lobbyRender(d) {
    const me = Number(myPlayer), host = amHost(), t = MODES[d.gameType] ? d.gameType : "classic", M = MODES[t], act = activeSlots(d), pres = d.presence || {}, packs = d.packs || {};
    const spectating = !!d.status && d.status !== "waiting";
    document.body.classList.toggle("is-host", host);
    setRoomCode(room);
    if (lobbyCountSeen && act.length > lobbyCountSeen) sfx("join"); else if (lobbyCountSeen && act.length < lobbyCountSeen) sfx("leave");
    lobbyCountSeen = act.length;
    // a match is running and I'm not in it (joined late, or seated out)
    const lm = $("lobbyMatch"); lm.classList.toggle("hidden", !spectating);
    if (spectating) { const G = MODES[d.gameType] || MODES.classic; lm.innerHTML = ""; lm.style.setProperty("--mc", G.color); lm.append(hbEl("span", "lm-k", G.kanji), hbEl("b", null, G.name + " match in progress"), hbEl("span", null, "You're in the room. You'll be dealt into the next match.")); }
    // seats
    const duelists = t === "classic" && act.length > 2 ? gwDuelists(d) : null;
    const sig = JSON.stringify([act.map(i => { const p = d["player" + i]; return [i, p.name, p.av && (p.av.u || p.av.g || (p.av.d || "").length), p.col, p.fr, p.ttl, p.lvl, p.lr, p.vote, pres["p" + i], packs["p" + i]]; }), hostSlot(d), me, t, spectating, duelists]);
    if (sig !== seatSig) {
        seatSig = sig;
        const box = $("lobbySeats"), firstPaint = !seatSeen.size; box.innerHTML = "";
        act.forEach(i => {
            const p = d["player" + i], isHost = i === hostSlot(d), off = pres["p" + i] === false, col = p.col || HB_COLORS[(i - 1) % HB_COLORS.length];
            const s = hbEl("div", "seat" + (i === me ? " me" : "") + (off ? " off" : "") + (p.lr ? " rdy" : "") + (isHost ? " hosting" : "") + (seatSeen.has(p.uid) ? "" : " enter"));
            if (!seatSeen.has(p.uid) && !firstPaint && i !== me && !spectating) newChallenger(p, col);
            seatSeen.add(p.uid);
            s.style.setProperty("--pc", col); s.dataset.emote = "p" + i;
            s.appendChild(hbEl("span", "seat-no", i + "P"));
            s.appendChild(avatarEl(p, { size: 72, badge: true }));
            const id = hbEl("div", "seat-id"); id.append(hbEl("b", null, p.name || "Player " + i), hbEl("small", null, (p.ttl || "Rookie") + (p.lvl ? " · LV " + p.lvl : "")));
            s.appendChild(id);
            const tags = hbEl("div", "seat-tags");
            if (isHost) tags.appendChild(hbEl("span", "tag host", "👑 HOST"));
            if (i === me) tags.appendChild(hbEl("span", "tag you", "YOU"));
            if (duelists) tags.appendChild(duelists.includes(i) ? hbEl("span", "tag duel", "⚔ DUELIST") : hbEl("span", "tag spec", "👁 SPECTATOR"));
            if (off) tags.appendChild(hbEl("span", "tag off", "OFFLINE"));
            else if ((t === "headbanz" || t === "imposter") && Number(packs["p" + i]) < 100) tags.appendChild(hbEl("span", "tag dl", "⬇ " + (Number(packs["p" + i]) || 0) + "%"));
            else if (p.lr) tags.appendChild(hbEl("span", "tag rdy", "✔ READY"));
            if (p.vote && MODES[p.vote]) { const v = hbEl("span", "tag vote", MODES[p.vote].kanji + " " + MODES[p.vote].name); v.style.setProperty("--mc", MODES[p.vote].color); tags.appendChild(v); }
            s.appendChild(tags);
            if (p.lr && !off) { const r = hbEl("div", "seat-ready" + (readySeen.has(p.uid) ? "" : " stamp"), "READY!"); s.appendChild(r); if (!readySeen.has(p.uid) && !firstPaint) sfx("stamp"); readySeen.add(p.uid); } else readySeen.delete(p.uid);
            if (host && i !== me && !spectating) { const k = hbEl("button", "seat-kick", "✕"); k.setAttribute("aria-label", "Remove " + (p.name || "player")); k.onclick = () => kickPlayer(i); s.appendChild(k); }
            box.appendChild(s);
        });
        const want = Math.min(ROOM_MAX, Math.max(Math.min(M.max, 6), act.length + 1));
        const free = SLOTS.filter(i => !act.includes(i));
        for (let k = act.length; k < want; k++) { const e = hbEl("button", "seat empty" + (k === act.length ? " first" : "")); e.append(hbEl("span", "seat-no", free[k - act.length] + "P"), hbEl("span", "seat-plus", "+"), hbEl("span", "es-txt", k === act.length ? "Invite a friend" : "Insert coin")); e.onclick = () => copyInviteLink(); box.appendChild(e); }
        $("seatCount").textContent = act.length + "/" + ROOM_MAX;
    }
    // modes
    buildModeCards();
    document.querySelectorAll("#lobbyModes .mode-card").forEach(b => {
        const mt = b.dataset.mode, MM = MODES[mt], fits = act.length >= MM.min && act.length <= MM.max;
        b.classList.toggle("selected", mt === t); b.classList.toggle("unfit", !fits); b.disabled = spectating;
        b.setAttribute("aria-pressed", String(mt === t));
        b.querySelector(".mc-players").textContent = modePlayers(MM) + (fits ? " ✓" : "");
        const vb = b.querySelector(".mc-votes"); vb.innerHTML = "";
        act.filter(i => (d["player" + i] || {}).vote === mt).forEach(i => vb.appendChild(avatarEl(d["player" + i], { size: 22 })));
        const cu = b.querySelector(".mc-curs"); cu.innerHTML = "";
        act.filter(i => (i === hostSlot(d) ? mt === t : (d["player" + i] || {}).vote === mt)).forEach(i => { const k = hbEl("span", "mc-cur" + (i === hostSlot(d) ? " host" : ""), i + "P"); k.style.setProperty("--pc", d["player" + i].col || HB_COLORS[(i - 1) % HB_COLORS.length]); cu.appendChild(k); });
        if (mt === t && lastMode && lastMode !== t && motionOK()) { b.classList.remove("flash"); void b.offsetWidth; b.classList.add("flash"); }
    });
    lastMode = t;
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
    document.querySelectorAll(".unobtn").forEach(b => { b.classList.toggle("selected", b.dataset.k === unoDeckType(d)); b.disabled = lock; });
    gwDuelRenderPick(d, lock || t !== "classic");
    applyModeUI(M.key);   // again, so the 4/4 counter reflects the boxes just ticked
    // background prep for the chosen mode
    if (!spectating && (t === "headbanz" || t === "imposter")) hbPrefetch(keys);
    const [ulo, uhi] = UNO_DECK_RANGE[unoDeckType(d)];
    if (!spectating && t === "uno" && host && keys.length >= ulo && keys.length <= uhi && keys.every(k => UNO_DECKS[k]) && !(d.uno && d.uno.cards && d.uno.key === unoDeckKey(keys))) unoPrepDeck(keys);
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
    if (d.gameType === "uno" && keys.length > UNO_DECK_RANGE[unoDeckType(d)][1]) { inp.checked = false; toast(unoDeckType(d) === "chaos" ? "The Chaos deck takes up to 8 series. Untick one first." : "The Classic deck uses exactly 4 series. Untick one first, or switch to the Chaos deck."); return; }
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
    const d = currentRoomData, seats = gwDuelists(d), keys = arr(d.animes), size = Number(d.boardSize) || 24;
    if (seats.length !== 2) { toast("Pick the 2 duelists first."); return; }
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
        // (deferred: a transaction started inside the room listener would re-fire it with an older snapshot)
        const tp = Number(d.uno.turn), gone = arr(d.uno.seats).map(Number).filter(p => d["player" + p] && d["player" + p].left);
        const out = arr(d.uno.out).map(Number), stillIn = arr(d.uno.seats).map(Number).filter(p => !out.includes(p));
        if (gone.length && stillIn.filter(p => !gone.includes(p)).length <= 1 && stillIn.length > 1) {
            const k = "s" + d.matchId + ":" + d.uno.n; if (unoDutyKey !== k) { unoDutyKey = k; setTimeout(() => unoTx(u => unoSettle(u, gone)), 0); }
        } else if (gone.includes(tp)) {
            const k = "l" + d.matchId + ":" + d.uno.n; if (unoDutyKey !== k) { unoDutyKey = k; setTimeout(() => unoTx(u => unoSkipTurn(u, tp, " left, turn skipped.")), 0); }
        }
    }
    if (t === "classic" && d.status === "selecting" && gwSeats(d).every(s => pNode(d, s) && pNode(d, s).ready === true)) setTimeout(beginPlaying, 0);
}
let unoDutyKey = "";
function resetMatchState() {
    guessMode = false; awaitingGuess = false; resultShown = false; gameScreenWasShown = false; renderedBoardSignature = ""; lastSfxTurn = null;
    if (unsubReveal) { unsubReveal(); unsubReveal = null; }
    unoSeen = { n: -1, over: "", hl: -1, top: -1, round: -1, ev: null, turn: 0 }; unoPick = null; unoFx.clear();
    hbRoundKey = ""; hbSig = ""; imSig = ""; specSig = ""; hbSeen = { wrong: 0, order: 0, done: false, phase: "" }; imSeen = { phase: "", round: 0 };
    ["hbPicker", "imPicker", "unoColor", "unoTarget", "unoOver"].forEach(id => $(id).classList.add("hidden"));
    ["unoFx", "unoSight"].forEach(id => { const e = $(id); if (e) e.remove(); });
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
    const st = d.status || "waiting", spec = gwSpectating(d);
    if (st === "waiting" || (!inMatch(d) && !spec)) {
        if ($("lobby").classList.contains("hidden")) { resetMatchState(); showOnly("lobby"); seatSig = ""; }
        lastStatus = st; lobbyRender(d); return;
    }
    if (lastStatus === "waiting" || lastStatus === "") { resetMatchState(); }
    lastStatus = st;
    if (spec) { showGwSpec(d); return; }
    matchIntro(d);
    if (d.gameType === "uno") { showUNO(d); return; }
    if (d.gameType === "headbanz") { showHB(d); return; }
    if (d.gameType === "imposter") { showIM(d); return; }
    if (st === "selecting") {
        if (!$("result").classList.contains("hidden")) { closeResults(); resultShown = false; }
        if ($("secret").classList.contains("hidden")) showSecretScreen(d);
        else secretWaitUpdate(d);
        return;      // (the host starts the case once both secrets are locked in: hostDuties)
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
    gwMineRender(data);
}
/* "Your Character": the duelist's own secret beside the board all match. Read from their own private/ node once per match,
   so it survives a refresh; the opponent's pick is never fetched. */
let mySecret = null, mySecretKey = "";
function gwMineRender(d) {
    const box = $("gwMine"); if (!box || !d) return;
    const key = room + ":" + (d.matchId || "") + ":" + myPlayer;
    if (mySecretKey !== key) {
        mySecretKey = key; mySecret = null; box.innerHTML = ""; box.dataset.img = ""; box.classList.add("hidden");
        get(ref(db, "rooms/" + room + "/private/" + user.uid + "/secret"))
            .then(s => { if (mySecretKey === key && s.exists()) { mySecret = s.val(); gwMineRender(currentRoomData || d); } }).catch(() => {});
        return;
    }
    if (!mySecret || box.dataset.img === mySecret.image) return;
    box.dataset.img = mySecret.image; box.innerHTML = "";
    const pic = hbEl("div", "gm-pic"); pic.appendChild(makeImg(mySecret.image));
    const tx = hbEl("div", "gm-txt"); tx.append(hbEl("small", null, "YOUR CHARACTER"), hbEl("b", null, nameOf(mySecret.image) || "Secret character"), hbEl("span", "gm-note", "🔒 Only you can see this"));
    box.append(pic, tx); box.classList.remove("hidden");
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
/* each duelist's crossed-out cards go to gw/elim/p<slot> so spectators can follow both boards live (secrets never leave private/) */
let gwElimT = 0;
function gwElimPush() {
    clearTimeout(gwElimT);
    gwElimT = setTimeout(() => {
        const d = currentRoomData; if (!room || !d || d.status !== "playing" || !gwSeats(d).includes(Number(myPlayer))) return;
        const list = [...document.querySelectorAll("#board .card")].map((c, i) => c.classList.contains("eliminated") ? i : -1).filter(i => i >= 0);
        update(ref(db, "rooms/" + room + "/gw/elim"), { ["p" + myPlayer]: list.length ? list : null }).catch(() => {});
    }, 150);
}
function flipCard(card) {
    if (card.classList.contains("flipping")) return;
    card.classList.add("flipping");
    const out = !card.classList.contains("eliminated");
    sfx(out ? "stamp" : "flip");
    setTimeout(() => { card.classList.toggle("eliminated"); applyPrank(card); saveElim(); gwElimPush(); gwDuelRender(currentRoomData); }, 150);
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
    if (elim.length) gwElimPush();      // restored after a refresh: make sure the spectators have it too
}
function gwDuelRender(data) {
    const box = $("gwDuel"); if (!box || !data) return;
    box.innerHTML = "";
    const seats = gwSeats(data), turn = Number(data.turn), tc = (data.gw && data.gw.tc) || {};
    seats.forEach((s, k) => {
        const c = hbEl("div", "duel" + (turn === s ? " on" : "") + (s === Number(myPlayer) ? " me" : "")); c.dataset.emote = "p" + s;
        c.style.setProperty("--pc", (pNode(data, s) || {}).col || HB_COLORS[(s - 1) % HB_COLORS.length]);
        c.appendChild(avatarEl(pPub(data, s), { size: 42, badge: true }));
        const id = hbEl("div", "duel-id"); id.appendChild(hbEl("b", null, pName(data, s)));
        id.appendChild(hbEl("small", null, s === Number(myPlayer) ? suspectsLeft() + " suspects left" : "turns: " + ((Number(tc["p" + s]) || 0) + (turn === s ? 1 : 0))));
        c.appendChild(id); box.appendChild(c);
        if (k === 0) box.appendChild(hbEl("i", "duel-vs", "VS"));
    });
}
/* ---------- lobby: the host picks the two duelists when more than 2 are in the room ---------- */
function gwDuelRenderPick(d, lock) {
    const act = activeSlots(d), box = $("gwDuelBox"), show = (d.gameType || "classic") === "classic" && act.length > 2;
    box.classList.toggle("hidden", !show); if (!show) return;
    const pick = gwDuelists(d), wrap = $("gwDuelPick"), sig = JSON.stringify([act.map(i => [i, pName(d, i)]), pick, lock]);
    if (wrap.dataset.sig === sig) return; wrap.dataset.sig = sig; wrap.innerHTML = "";
    act.forEach(i => {
        const on = pick.includes(i), b = hbEl("button", "duel-opt" + (on ? " on" : "")); b.disabled = lock;
        b.style.setProperty("--pc", (pNode(d, i) || {}).col || HB_COLORS[(i - 1) % HB_COLORS.length]);
        b.setAttribute("aria-pressed", String(on)); b.appendChild(avatarEl(pPub(d, i), { size: 30 }));
        const t = hbEl("span", "duel-opt-t"); t.append(hbEl("b", null, pName(d, i)), hbEl("small", null, on ? "⚔ DUELIST " + (pick.indexOf(i) + 1) : "👁 spectator")); b.appendChild(t);
        b.onclick = () => gwPickDuelist(i); wrap.appendChild(b);
    });
}
window.gwPickDuelist = function (i) {
    const d = currentRoomData; if (!d || !amHost() || d.status !== "waiting") return;
    let cur = gwDuelists(d);
    if (cur.includes(i)) cur = cur.filter(x => x !== i); else { cur.push(i); if (cur.length > 2) cur.shift(); }
    sfx("pick"); lobbySet({ gwDuel: cur.length ? cur : [-1] });
};

/* ---------- spectators: both boards live, never a secret ----------
   Spectators only read the public board and each duelist's crossed-out list (gw/elim). They never fetch
   private/, never get the end-of-match reveal and the accused card is not marked for them. */
let specSig = "", specIntro = null;
function showGwSpec(d) {
    const wasHidden = $("gwSpec").classList.contains("hidden");
    showOnly("gwSpec");
    const seats = gwSeats(d), st = d.status, brd = arr(d.board), elim = (d.gw && d.gw.elim) || {}, turn = Number(d.turn);
    if (specIntro !== d.matchId) {
        specIntro = d.matchId;
        if (wasHidden) titleCard({ kicker: "CASE FILE · SPECTATING", title: "WATCH THE DUEL", sub: pName(d, seats[0]) + " vs " + pName(d, seats[1]), kanji: "観", color: "#f2b33d", ms: 1700 });
    }
    const left = s => brd.length - arr(elim["p" + s]).length;
    const duel = $("gwSpecDuel"); duel.innerHTML = "";
    seats.forEach((s, k) => {
        const c = hbEl("div", "duel" + (st === "playing" && turn === s ? " on" : "") + (st === "finished" && Number(d.winner) === s ? " on" : "")); c.dataset.emote = "p" + s;
        c.style.setProperty("--pc", (pNode(d, s) || {}).col || HB_COLORS[(s - 1) % HB_COLORS.length]);
        c.appendChild(avatarEl(pPub(d, s), { size: 42, badge: true }));
        const id = hbEl("div", "duel-id"); id.appendChild(hbEl("b", null, pName(d, s)));
        id.appendChild(hbEl("small", null, st === "selecting" ? ((pNode(d, s) || {}).ready ? "🔒 locked in" : "choosing…") : left(s) + " suspects left"));
        c.appendChild(id); duel.appendChild(c);
        if (k === 0) duel.appendChild(hbEl("i", "duel-vs", "VS"));
    });
    const w = Number(d.winner);
    $("gwSpecTurn").textContent = st === "selecting" ? "Picking secrets" : st === "playing" ? pName(d, turn) + "'s turn" : "🏆 " + pName(d, w) + " wins";
    $("gwSpecStatus").textContent = st === "selecting" ? "Both duelists are choosing their secret character. You'll never see who they pick."
        : st === "playing" ? pName(d, turn) + " is asking a question. Watch the boards change live."
        : d.result === "correct" ? pName(d, w) + " named " + pName(d, gwOther(d, w)) + "'s character. Case closed." : pName(d, gwOther(d, w)) + " made a wrong accusation, so " + pName(d, w) + " takes it.";
    // boards: built once per board, then only the crossed-out marks change
    const boards = $("gwSpecBoards"), bsig = brd.map(c => c.id + c.image).join("|") + "#" + seats.join(",");
    if (specSig !== bsig) {
        specSig = bsig; boards.innerHTML = "";
        const cols = brd.length > 48 ? 12 : brd.length > 24 ? 8 : 6;
        seats.forEach(s => {
            const sec = hbEl("section", "spec-board"); sec.dataset.p = s; sec.style.setProperty("--pc", (pNode(d, s) || {}).col || HB_COLORS[(s - 1) % HB_COLORS.length]);
            const head = hbEl("header", "spec-head"); head.append(playerChip(d, s), hbEl("span", "spec-left")); sec.appendChild(head);
            const grid = hbEl("div", "spec-grid"); grid.style.setProperty("--cols", cols);
            brd.forEach((ch, i) => { const c = hbEl("div", "card spec-card"); c.dataset.i = i; c.style.setProperty("--i", i % 24); c.appendChild(makeImg(ch.image)); c.appendChild(hbEl("span", "elim-stamp", "OUT")); addName(c, ch.image); grid.appendChild(c); });
            sec.appendChild(grid); boards.appendChild(sec);
        });
    }
    boards.querySelectorAll(".spec-board").forEach(sec => {
        const s = Number(sec.dataset.p), out = new Set(arr(elim["p" + s]).map(Number));
        sec.classList.toggle("on", st === "playing" && turn === s); sec.classList.toggle("champ", st === "finished" && w === s);
        sec.querySelector(".spec-left").textContent = (brd.length - out.size) + " / " + brd.length + " still possible";
        sec.querySelectorAll(".spec-card").forEach(c => c.classList.toggle("eliminated", out.has(Number(c.dataset.i))));
    });
    const foot = $("gwSpecFoot"); foot.innerHTML = "";
    if (st === "finished") foot.appendChild(endButtons(true));
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
/* one card of the verdict: state "ok"/"bad" (an accusation, right or wrong), "none" (no accusation made) or "secret" (face down until revealed) */
function gvCard(label, image, state, slot) {
    const c = hbEl("div", "gv-card " + state + (state === "secret" ? " hidden-face" : ""));
    const por = hbEl("div", "portrait gv-pic"), img = new Image(); img.alt = ""; por.appendChild(img);
    if (slot) img.id = "resultImg_" + slot;
    if (image) applyImg(img, image);
    if (state === "none") por.appendChild(hbEl("span", "gv-q", "—"));
    if (state === "secret") por.appendChild(hbEl("span", "gv-q", "?"));
    if (state === "ok" || state === "bad") por.appendChild(hbEl("span", "gv-mark", state === "ok" ? "✓" : "✗"));
    const tx = hbEl("div", "gv-txt"), nm = hbEl("b", null, state === "none" ? "No accusation" : image ? nameOf(image) || "Secret character" : "???");
    if (slot) nm.id = "resultCap_" + slot;
    tx.append(hbEl("small", null, label), nm);
    if (state === "ok" || state === "bad") tx.appendChild(hbEl("span", "gv-verd", state === "ok" ? "✓ Correct!" : "✗ Wrong"));
    c.append(por, tx); return c;
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
    // the verdict: each duelist's accusation above their own secret character; the opponent on top (left on wide screens), you below.
    // Secrets stay face down until each player reveals theirs; the accused card is public (it's on the board).
    const accuser = data.result === "correct" ? w : gwOther(data, w), right = data.result === "correct";
    const guessed = arr(data.board).find(c => String(c.id) === String(data.guessedCharacter));
    const rev = hbEl("div", "gw-verdict");
    [opp, me].forEach(s => {
        const mineSide = s === me, whose = mineSide ? "Your" : pName(data, s) + "'s";
        const side = hbEl("section", "gv-side " + (mineSide ? "me" : "opp") + (s === w ? " won" : " lost")); side.style.setProperty("--pc", (pNode(data, s) || {}).col || HB_COLORS[(s - 1) % HB_COLORS.length]);
        const head = hbEl("header", "gv-head"); head.append(avatarEl(pPub(data, s), { size: 34 }), hbEl("b", null, mineSide ? "You" : pName(data, s)), hbEl("span", "gv-res", s === w ? "🏆 WINNER" : "LOST"));
        side.append(head,
            gvCard(whose + " Guess", s === accuser ? (guessed && guessed.image) || "" : "", s === accuser ? (right ? "ok" : "bad") : "none"),
            gvCard(whose + " Character", "", "secret", s));
        rev.appendChild(side);
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
            if (r && img && !img.src) { applyImg(img, r.image); img.closest(".portrait").classList.add("flip-in"); $("resultCap_" + n).textContent = nameOf(r.image) || "Secret character"; img.closest(".gv-card").classList.remove("hidden-face"); sfx("reveal"); }
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
        winner: null, result: null, guessedCharacter: null, finishedAt: null, guess: null, revealed: null, turn: first, "gw/first": first, "gw/tc": null, "gw/elim": null, matchId: Date.now() };
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
        try { await navigator.share({ title: "Anime Arcade Party", text: "Join my room!", url }); return; } catch (e) {}
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
    $("homeTitle").addEventListener("click", () => { const lg = $("homeTitle"); lg.classList.remove("zap"); void lg.offsetWidth; lg.classList.add("zap"); clearTimeout(logoTimer); logoTimer = setTimeout(() => { logoTaps = 0; }, 900); if (++logoTaps >= 5) { logoTaps = 0; secretPower(["PLUS ULTRA!", "DATTEBAYO!", "BANKAI!", "KAMEHAMEHA!", "DOMAIN EXPANSION!"][(Math.random() * 5) | 0]); } else sfx("tick"); });
    initGallery(ANIME_LIBRARY, Object.fromEntries(Object.keys(HB_SERIES).filter(k => !HB_HIDDEN_SERIES.includes(k)).map(k => [k, HB_SERIES[k].label])));
    setProfileHooks({ sfx: sfx, toast: toast, onAchievement: achToast });
    bindUpload(); bindSettings(); syncDock(); renderProfileCard(); buildHomeModes();
    $("name").value = profile.get().name || "";
    $("joinCode").addEventListener("keydown", e => { if (e.key === "Enter") joinRoom(); });
    let codeLen = 0;
    $("joinCode").addEventListener("input", () => { $("joinCode").value = $("joinCode").value.toUpperCase().replace(/[^A-Z0-9]/g, ""); const n = $("joinCode").value.length, grew = n > codeLen; codeLen = n; renderJoinCells(grew); sfx(grew ? "xp" : "tick"); });
    renderJoinCells(); bindTilt();
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
        $("joinCode").value = invite; renderJoinCells();
        toast(profile.get().name ? "Invite loaded. Tap Join." : "Invite loaded. Set your name, then tap Join.");
        $("joinCode").focus();
    } else if (!profile.get().name) setTimeout(() => { if (!room) { openProfile(); toast("Welcome! Make your player card first."); } }, 700);
}
await initApp();


