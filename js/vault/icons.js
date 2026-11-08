/* =====================================================================
   ANIME TCG · ICON SET
   One style for every icon in the TCG pages: a 24 x 24 grid, 1.8 stroke, round caps and joins, outlines in the current
   text colour, and ONE accent shape per icon filled with the gold / steel accent (--ic-ac; css/cards.css .tcg-ico).
   No emoji anywhere in the TCG. icon(name) returns the SVG markup; iconEl(name) an element. The sheet: dev/icons.html.
   ===================================================================== */
const P = {
    /* ---- tabs ---- */
    packs: '<path d="M6 4.5h12l-.8 2 .8 2v11l-.8-2-.8 2H6.8l-.8-2-.8 2v-11l.8-2-.8-2z" transform="translate(.4 0)"/><path class="ac" d="M9 11.5l3-2.5 3 2.5-3 3.5z"/>',
    collection: '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M12 4v16"/><rect class="ac" x="6" y="7" width="4" height="5.5" rx=".8"/><path d="M14.5 8h3.5M14.5 11h3.5M14.5 14h2.5"/>',
    decks: '<rect x="7.5" y="3.5" width="11" height="15" rx="1.8"/><path d="M5.5 6.5v12.2a1.8 1.8 0 0 0 1.8 1.8h9"/><path class="ac" d="M13 7.5l2 3-2 3-2-3z"/>',
    duel: '<path d="M4 4l9.5 9.5M4 4h3.6M4 4v3.6"/><path d="M20 4l-9.5 9.5M20 4h-3.6M20 4v3.6"/><path d="M7 15.5l-3 3M17 15.5l3 3"/><circle class="ac" cx="12" cy="15.2" r="2.1"/>',
    /* ---- rarity (shape gets more complex with rarity: readable without colour) ---- */
    "r-common": '<circle cx="12" cy="12" r="6.5"/><circle class="ac" cx="12" cy="12" r="2.6"/>',
    "r-uncommon": '<path d="M12 4.5l7.5 7.5-7.5 7.5L4.5 12z"/><path class="ac" d="M12 9l3 3-3 3-3-3z"/>',
    "r-rare": '<path d="M12 3.8l7.6 13.4H4.4z"/><path class="ac" d="M12 9.2l3 5.3H9z"/>',
    "r-ultra": '<path d="M7 3.5h10l3.5 6L12 20.5 3.5 9.5z"/><path d="M3.5 9.5h17M9.5 3.5 8 9.5l4 11M14.5 3.5 16 9.5l-4 11"/><path class="ac" d="M9.8 9.5h4.4L12 15.6z"/>',
    "r-epic": '<path d="M12 3.2l7.6 4.4v8.8L12 20.8l-7.6-4.4V7.6z"/><path class="ac" d="M12 7.2c.8 2.2 3 3.2 3 6a3 3 0 0 1-6 0c0-1.5.8-2.2 1.3-3.2.5 1 .8 1.4 1.5 1.7-.3-1.6.2-3.1.2-4.5z"/>',
    "r-legendary": '<path d="M4 18.5h16"/><path d="M4.5 16 3.5 7l5 4 3.5-6 3.5 6 5-4-1 9z"/><circle class="ac" cx="12" cy="12.3" r="1.9"/>',
    "r-mythic": '<path d="M12 2.8l2.2 6.2 6.6.2-5.2 4 1.9 6.4L12 15.8l-5.5 3.8 1.9-6.4-5.2-4 6.6-.2z"/><path class="ac" d="M12 8.2l1.2 2.6 2.7.3-2 1.8.6 2.7L12 14.3l-2.5 1.3.6-2.7-2-1.8 2.7-.3z"/>',
    holo: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path class="ac" d="M12 8.5l1.2 2.3 2.3 1.2-2.3 1.2-1.2 2.3-1.2-2.3L8.5 12l2.3-1.2z"/><path d="M6 6l1.8 1.8M16.2 16.2 18 18M18 6l-1.8 1.8M7.8 16.2 6 18"/>',
    /* ---- card types ---- */
    character: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.6-4 3.4-6.4 7-6.4s6.4 2.4 7 6.4"/><path class="ac" d="M10.5 3.6 12 2.4l1.5 1.2z"/>',
    support: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path class="ac" d="M12 7l1.3 3.2 3.2 1.3-3.2 1.3L12 16l-1.3-3.2L7.5 11.5l3.2-1.3z"/>',
    counter: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 9.5h6.5a2.4 2.4 0 0 1 0 4.8H10"/><path class="ac" d="M11.2 7.1 8.6 9.5l2.6 2.4z"/>',
    /* ---- archetypes ---- */
    brawler: '<path d="M7 11V7.5a1.5 1.5 0 0 1 3 0V10m0-2.5a1.5 1.5 0 0 1 3 0V10m0-1.8a1.5 1.5 0 0 1 3 0v4.3c0 4-2.4 6.5-5.6 6.5-2.6 0-4.4-1.5-5.2-3.7L4.4 13a1.6 1.6 0 0 1 2.6-1.8"/><path class="ac" d="M10 10h6v1.8h-6z"/>',
    tank: '<path d="M4 5.5h16v6.2c0 4.6-3.5 7.7-8 8.8-4.5-1.1-8-4.2-8-8.8z"/><path d="M4 11h16M12 5.5v15"/><path class="ac" d="M7 7.6h3.4v2H7z"/>',
    speedster: '<path d="M3.5 14.5c4-1 6.5-4.5 9-9.5l3 3c-2 4.5-6 7.5-11 8z"/><path d="M14 6.5 19.5 4l-2 5.5"/><path d="M3.5 19.5h7M6 17h3"/><circle class="ac" cx="13.6" cy="10.4" r="1.5"/>',
    trickster: '<path d="M3.5 8c2.5-1.5 5.5-1.8 8.5-.2C15 6.2 18 6.5 20.5 8c0 6-3.6 10-8.5 10S3.5 14 3.5 8z"/><path class="ac" d="M6.5 10.5c1-.8 2.4-.8 3.4 0-1 1-2.4 1-3.4 0zM14.1 10.5c1-.8 2.4-.8 3.4 0-1 1-2.4 1-3.4 0z"/><path d="M9.5 14.5c1.6 1 3.4 1 5 0"/>',
    healer: '<path d="M12 20s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10C19.5 15.6 12 20 12 20z"/><path class="ac" d="M11 9.8h2v2.1h2.1v2H13V16h-2v-2.1H8.9v-2H11z"/>',
    mage: '<path d="M4.5 19.5 15 9"/><path d="M15 9l1.5-1.5"/><path class="ac" d="M17.5 2.8l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z"/><path d="M6.5 6.5h.01M9.5 4.5h.01M19.5 13.5h.01"/>',
    supportarch: '<path d="M6 21V3.5"/><path d="M6 4.5h12l-2.6 3.6L18 11.7H6"/><path class="ac" d="M9 6.6h4v2.6H9z"/>',
    /* ---- phases ---- */
    draw: '<rect x="6" y="5.5" width="10" height="14" rx="1.6"/><path d="M19 3v7M16.5 7.5 19 10l2.5-2.5"/><path class="ac" d="M11 10.2l1.8 2.3-1.8 2.3-1.8-2.3z"/>',
    main: '<path d="M4.5 17 9 6l5 1.5L9.5 18.5z"/><path d="M11.5 18.5 13 6.5l5.2.6-1.5 12z"/><path class="ac" d="M15.3 10.2l1.3 1.5-1.6 1.2-1.1-1.6z"/>',
    battle: '<path d="M5 5l9 9M5 5h3.2M5 5v3.2"/><path d="M19 5l-9 9M19 5h-3.2M19 5v3.2"/><path class="ac" d="M10.5 17.5 6.5 21 4 18.5l3.5-4zM13.5 17.5l4 3.5 2.5-2.5-3.5-4z"/>',
    end: '<path d="M19 13.8A7.6 7.6 0 1 1 10.2 5a6 6 0 0 0 8.8 8.8z"/><circle class="ac" cx="16.8" cy="6.2" r="1.5"/>',
    /* ---- the economy ---- */
    coin: '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="5.6"/><path class="ac" d="M12 8.6l1.2 2.2 2.2 1.2-2.2 1.2-1.2 2.2-1.2-2.2-2.2-1.2 2.2-1.2z"/>',
    shard: '<path d="M12 3l6.5 6.2L14 21h-4L5.5 9.2z"/><path d="M5.5 9.2h13M10 21l2-11.8L14 21"/><path class="ac" d="M9.5 9.2 12 3l2.5 6.2z"/>',
    deck: '<rect x="5" y="6.5" width="11" height="14" rx="1.6"/><path d="M8 4h9.4A1.6 1.6 0 0 1 19 5.6V17"/><path class="ac" d="M10.5 11l2 2.5-2 2.5-2-2.5z"/>',
    graveyard: '<path d="M6 21V10a6 6 0 0 1 12 0v11z"/><path d="M4 21h16"/><path class="ac" d="M11 9.5h2v2h2v2h-2v4h-2v-4H9v-2h2z"/>',
    life: '<path d="M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.4 12 20 12 20z"/><path class="ac" d="M7.6 9.2a2 2 0 0 1 2.6-1.4l-1 2.6z"/>',
    /* ---- tools ---- */
    filter: '<path d="M4 5h16l-6.2 7.4V18l-3.6 2v-7.6z"/><circle class="ac" cx="12" cy="8" r="1.3"/>',
    sort: '<path d="M7 4v16M3.8 16.8 7 20l3.2-3.2"/><path d="M13 6h7M13 11h5M13 16h3"/><circle class="ac" cx="20" cy="16" r="1.2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/><circle class="ac" cx="12" cy="12" r="1.2"/>',
    search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/><circle class="ac" cx="8.6" cy="8.6" r="1.3"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="7" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/><rect class="ac" x="13" y="13" width="7" height="7" rx="1.2"/>',
    binder: '<path d="M6 3.5h12a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6z"/><path d="M6 3.5v17M3.5 7H6M3.5 12H6M3.5 17H6"/><rect class="ac" x="9.5" y="7" width="6.5" height="5" rx=".8"/>',
    trade: '<path d="M4.5 8h13.5M15 5l3 3-3 3"/><path d="M19.5 16H6M9 13l-3 3 3 3"/><circle class="ac" cx="12" cy="12" r="1.3"/>',
    back: '<path d="M15 5l-7 7 7 7"/><circle class="ac" cx="15" cy="12" r="1.2"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/><circle class="ac" cx="12" cy="12" r="1.2"/>',
    info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.5"/><circle class="ac" cx="12" cy="7.6" r="1.3"/>',
    help: '<circle cx="12" cy="12" r="8.6"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6v.6"/><circle class="ac" cx="12" cy="17" r="1.2"/>',
    log: '<path d="M6.5 4h11a1.5 1.5 0 0 1 1.5 1.5V20l-2.5-1.5L14 20l-2.5-1.5L9 20l-2.5-1.5V4z" transform="translate(-.3 0)"/><path d="M9.5 8h6M9.5 11.5h6"/><rect class="ac" x="9.2" y="14" width="3.5" height="1.6" rx=".5"/>',
    emote: '<circle cx="12" cy="12" r="8.6"/><path d="M8.2 14c1 1.6 2.3 2.4 3.8 2.4s2.8-.8 3.8-2.4"/><circle class="ac" cx="9" cy="9.8" r="1.2"/><circle class="ac" cx="15" cy="9.8" r="1.2"/>',
    timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 13V9M10 3h4M18.4 6.6l1.2-1.2"/><path class="ac" d="M12 13l3-1.6v3.2z"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><circle class="ac" cx="12" cy="15.5" r="1.6"/>',
    check: '<path d="M4.5 12.5l4.8 4.8L19.5 7"/><circle class="ac" cx="9.3" cy="17.3" r="1.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/><circle class="ac" cx="12" cy="12" r="1.3"/>',
    minus: '<path d="M5 12h14"/><circle class="ac" cx="12" cy="12" r="1.3"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="1.8"/><path d="M5 15.5V6a1.5 1.5 0 0 1 1.5-1.5H16"/><rect class="ac" x="11.5" y="11.5" width="5" height="1.6" rx=".6"/>',
    trash: '<path d="M4.5 6.5h15M9 6.5V4.5h6v2M6.5 6.5l1 13.5h9l1-13.5"/><rect class="ac" x="11.2" y="10" width="1.6" height="6.5" rx=".6"/>',
    edit: '<path d="M4.5 19.5l1-4.2L16 4.8l3.2 3.2L8.7 18.5z"/><path class="ac" d="M14.2 6.6l3.2 3.2 1.8-1.8-3.2-3.2z"/>',
    /* quick emotes (duels): one face per mood, same 24 grid / stroke as the rest */
    "em-nice": '<path d="M7 11v9H4.5v-9z"/><path d="M7 19.5h9.2a2 2 0 0 0 2-1.6l1.1-5.3a2 2 0 0 0-2-2.4H14l.7-3.4a1.9 1.9 0 0 0-3.5-1.3L7 11"/><circle class="ac" cx="5.8" cy="17.6" r="1"/>',
    "em-wow": '<circle cx="12" cy="12" r="8.6"/><path d="M7.6 8.2l2 .6M16.4 8.2l-2 .6"/><circle class="ac" cx="9" cy="10.6" r="1.1"/><circle class="ac" cx="15" cy="10.6" r="1.1"/><ellipse cx="12" cy="15.6" rx="1.9" ry="2.3"/>',
    "em-oops": '<circle cx="12" cy="12" r="8.6"/><path d="M8 10h2.2M13.8 10H16M9 15.6c1.9-1.2 4.1-1.2 6 0"/><path class="ac" d="M18.2 5.2c.9 1.3 1.3 2.2 1.3 2.9a1.3 1.3 0 0 1-2.6 0c0-.7.4-1.6 1.3-2.9z"/>',
    "em-gg": '<path d="M3 13.5l3.6-3.6 3 1 2.4-2.4a2 2 0 0 1 2.8 0l5.2 5.2"/><path d="M6.6 9.9 9.8 13a1.6 1.6 0 0 0 2.3-2.3"/><path d="M19.6 14l-4.9 4.9a1.6 1.6 0 0 1-2.3 0l-.6-.6M14.8 16.6l-1.8-1.8M17 14.4l-2-2"/><circle class="ac" cx="12" cy="4.4" r="1.2"/>',
    "em-think": '<circle cx="11" cy="12" r="7.8"/><path d="M7.6 10h2M12.6 9.4l2 .8M8.4 15.4h4.2"/><circle class="ac" cx="19.2" cy="5.4" r="1.6"/><circle class="ac" cx="21" cy="9.4" r=".9"/>',
    "em-angry": '<circle cx="12" cy="12" r="8.6"/><path d="M7.4 8.2l3 1.6M16.6 8.2l-3 1.6M8.8 16.4c2-1.4 4.4-1.4 6.4 0"/><circle class="ac" cx="9.2" cy="11.4" r="1.1"/><circle class="ac" cx="14.8" cy="11.4" r="1.1"/>',
    bot: '<rect x="5" y="7.5" width="14" height="11" rx="2.5"/><path d="M12 7.5V4M9 21h6"/><circle class="ac" cx="12" cy="3.6" r="1.3"/><circle class="ac" cx="9.4" cy="12.5" r="1.3"/><circle class="ac" cx="14.6" cy="12.5" r="1.3"/>',
    training: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="5"/><circle class="ac" cx="12" cy="12" r="1.8"/>',
    ffa: '<circle cx="12" cy="7" r="2.5"/><circle cx="5.5" cy="15" r="2.5"/><circle cx="18.5" cy="15" r="2.5"/><path d="M10.5 9.2 7 13M13.5 9.2 17 13M8 15h8"/><circle class="ac" cx="12" cy="13.2" r="1.3"/>',
    friends: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.5-3.5 2.6-5.6 5.5-5.6s5 2.1 5.5 5.6"/><path d="M15.5 5.6a3.1 3.1 0 0 1 0 5.8M17 13.6c2.1.6 3.2 2.5 3.5 5"/><circle class="ac" cx="9" cy="8.5" r="1.1"/>',
    crown: '<path d="M4 18.5h16M4.5 16 3.5 7l5 4 3.5-6 3.5 6 5-4-1 9z"/><circle class="ac" cx="12" cy="5" r="1.4"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3.5 9h17M12 9v11"/><path class="ac" d="M12 9c-2-4-6.5-4.5-6.5-2S9.5 9 12 9zm0 0c2-4 6.5-4.5 6.5-2S14.5 9 12 9z"/>',
    star: '<path class="ac" d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/>',
    sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/><circle class="ac" cx="6" cy="12" r="1.1"/>',
    skip: '<path d="M5 5.5l8 6.5-8 6.5zM13 5.5l6 6.5-6 6.5"/><path d="M20 5v14"/><path class="ac" d="M6.6 9l3.6 3-3.6 3z"/>',
    flip: '<path d="M4.5 12a7.5 7.5 0 0 1 13-5l2-2v5.5H14l2-2a5 5 0 0 0-9 3.5"/><path d="M19.5 12a7.5 7.5 0 0 1-13 5l-2 2v-5.5H10l-2 2a5 5 0 0 0 9-3.5"/><circle class="ac" cx="12" cy="12" r="1.2"/>',
    tribute: '<path d="M12 3.5l7.5 4v9L12 20.5l-7.5-4v-9z"/><path d="M12 8v8M8.5 12h7"/><circle class="ac" cx="12" cy="12" r="1.6"/>',
    position: '<rect x="4.5" y="7" width="8" height="12" rx="1.3"/><rect x="11" y="9" width="8.5" height="6" rx="1.3" transform="rotate(0)"/><path class="ac" d="M15 4.5l2.5 2-2.5 2z"/><path d="M10 6.5c2.5-1.5 5-1.6 7.5 0"/>',
    new: '<path d="M12 3l2.1 3.6 4.1-.9-.9 4.1L21 12l-3.7 2.2.9 4.1-4.1-.9L12 21l-2.1-3.6-4.1.9.9-4.1L3 12l3.7-2.2-.9-4.1 4.1.9z"/><circle class="ac" cx="12" cy="12" r="2.4"/>',
    /* ---- stats ---- */
    atk: '<path d="M19.5 4.5 9.2 14.8"/><path d="M19.5 4.5h-4.2M19.5 4.5v4.2"/><path d="M6.2 11.8l6 6"/><path d="M8.6 15.4 4.5 19.5"/><circle class="ac" cx="4.3" cy="19.7" r="1.6"/>',
    def: '<path d="M12 3.2l7 2.6v5.4c0 4.7-3 8.2-7 9.9-4-1.7-7-5.2-7-9.9V5.8z"/><path class="ac" d="M12 6.8l4 1.5v3.1c0 2.7-1.6 4.7-4 5.7z"/>',
    /* ---- keywords ---- */
    pierce: '<path d="M3.5 12h14"/><path d="M13.5 7.5 18 12l-4.5 4.5"/><path class="ac" d="M9 6.5h1.8v11H9z"/>',
    guard: '<path d="M12 3.2l7 2.6v5.4c0 4.7-3 8.2-7 9.9-4-1.7-7-5.2-7-9.9V5.8z"/><path class="ac" d="M8.5 10.6h7v2.2h-7z"/>',
    heal: '<circle cx="12" cy="12" r="8.6"/><path class="ac" d="M10.6 7.4h2.8v3.2h3.2v2.8h-3.2v3.2h-2.8v-3.2H7.4v-2.8h3.2z"/>',
    counterkw: '<path d="M5 9.5h10.5a4 4 0 0 1 0 8H8.5"/><path d="M8.6 5.8 4.9 9.5l3.7 3.7"/><circle class="ac" cx="8.5" cy="17.5" r="1.5"/>',
    rage: '<path d="M12 3c1.2 3.6 5.3 5.2 5.3 10.2a5.3 5.3 0 0 1-10.6 0c0-2.6 1.5-3.8 2.3-5.6.8 1.8 1.4 2.5 2.7 3-.6-2.7.3-5.4.3-7.6z"/><path class="ac" d="M12 13.2c.9 1.3 2.1 1.9 2.1 3.4a2.1 2.1 0 0 1-4.2 0c0-1.3 1.2-2 2.1-3.4z"/>',
    combo: '<circle cx="8.8" cy="12" r="4.8"/><circle cx="15.2" cy="12" r="4.8"/><path class="ac" d="M12 8.3a4.8 4.8 0 0 1 0 7.4 4.8 4.8 0 0 1 0-7.4z"/>',
    silence: '<path d="M5 5.5h14v9.5H10.5L6.5 18.2V15H5z"/><path d="M4 3.5l16 17"/><circle class="ac" cx="12" cy="10.2" r="1.5"/>',
    scout: '<path d="M2.6 12S6.2 6 12 6s9.4 6 9.4 6-3.6 6-9.4 6S2.6 12 2.6 12z"/><circle class="ac" cx="12" cy="12" r="2.8"/>',
    swap: '<path d="M4.5 8.2h14"/><path d="M15.2 4.9l3.3 3.3-3.3 3.3"/><path d="M19.5 15.8h-14"/><path d="M8.8 12.5l-3.3 3.3 3.3 3.3"/><circle class="ac" cx="12" cy="12" r="1.4"/>',
    laststand: '<path d="M6.5 21V3.5"/><path class="ac" d="M6.5 4.5h11l-2.6 3.6 2.6 3.6h-11z"/>',
    mirror: '<path d="M12 3.5v17"/><path d="M9 7.2 4.2 12 9 16.8z"/><path class="ac" d="M15 7.2l4.8 4.8-4.8 4.8z"/>',
    /* ---- timing ---- */
    timing: '<path d="M13.5 3 5.5 13.2h6l-1 7.8 8-10.2h-6z"/>',
    spirit: '<circle cx="12" cy="12" r="8.6"/><path class="ac" d="M12 6.5l1.6 3.9 3.9 1.6-3.9 1.6L12 17.5l-1.6-3.9L6.5 12l3.9-1.6z"/>'
};
P.counter_kw = P.counterkw;
export const ICONS = Object.keys(P);
export const ICON_GROUPS = {
    Tabs: ["packs", "collection", "decks", "duel"],
    Rarity: ["r-common", "r-uncommon", "r-rare", "r-ultra", "r-epic", "r-legendary", "r-mythic", "holo"],
    "Card types": ["character", "support", "counter"],
    Archetypes: ["brawler", "tank", "speedster", "trickster", "healer", "mage", "supportarch"],
    Keywords: ["pierce", "guard", "heal", "counterkw", "rage", "combo", "silence", "scout", "swap", "laststand", "mirror", "timing"],
    Phases: ["draw", "main", "battle", "end"],
    "Duel field": ["life", "atk", "def", "deck", "graveyard", "tribute", "position", "timer", "log", "emote", "skip", "flip"],
    Economy: ["coin", "shard", "gift", "new", "star", "crown"],
    Tools: ["filter", "sort", "settings", "search", "grid", "binder", "trade", "back", "close", "info", "help", "lock", "check", "plus", "minus", "copy", "trash", "edit", "sound"],
    Modes: ["bot", "training", "ffa", "friends"],
    Emotes: ["em-nice", "em-wow", "em-oops", "em-gg", "em-think", "em-angry"]
};
export const KEYWORD_ICON = { Pierce: "pierce", Guard: "guard", Heal: "heal", Counter: "counterkw", Rage: "rage", Combo: "combo", Silence: "silence", Scout: "scout", Swap: "swap", "Last Stand": "laststand", Mirror: "mirror" };
export const ARCH_ICON = { Brawler: "brawler", Tank: "tank", Speedster: "speedster", Trickster: "trickster", Healer: "healer", Mage: "mage", Support: "supportarch" };
export const RARITY_ICON = ["r-common", "r-uncommon", "r-rare", "r-ultra", "r-epic", "r-legendary", "r-mythic"];
export const icon = (name, cls) => '<svg class="tcg-ico i-' + name + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (P[name] || P.spirit) + "</svg>";
export function iconEl(name, cls) { const s = document.createElement("span"); s.className = "tcg-i"; s.innerHTML = icon(name, cls); return s.firstChild; }
