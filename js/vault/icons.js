/* =====================================================================
   ANIME TCG · ICON SET
   One style for every icon in the TCG pages: a 24 x 24 grid, 1.8 stroke, round caps and joins, outlines in the current
   text colour, and ONE accent shape per icon filled with the gold / steel accent (--ic-ac; css/cards.css .tcg-ico).
   No emoji anywhere in the TCG. icon(name) returns the SVG markup; iconEl(name) an element.
   Phase 1 holds the card-face icons (stats, rarity star, keywords, timing); the page shell adds the rest.
   ===================================================================== */
const P = {
    // stats
    atk: '<path d="M19.5 4.5 9.2 14.8"/><path d="M19.5 4.5h-4.2M19.5 4.5v4.2"/><path d="M6.2 11.8l6 6"/><path d="M8.6 15.4 4.5 19.5"/><circle class="ac" cx="4.3" cy="19.7" r="1.6"/>',
    def: '<path d="M12 3.2l7 2.6v5.4c0 4.7-3 8.2-7 9.9-4-1.7-7-5.2-7-9.9V5.8z"/><path class="ac" d="M12 6.8l4 1.5v3.1c0 2.7-1.6 4.7-4 5.7z"/>',
    star: '<path class="ac" d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/>',
    // keywords
    pierce: '<path d="M3.5 12h14"/><path d="M13.5 7.5 18 12l-4.5 4.5"/><path class="ac" d="M9 6.5h1.8v11H9z"/>',
    guard: '<path d="M12 3.2l7 2.6v5.4c0 4.7-3 8.2-7 9.9-4-1.7-7-5.2-7-9.9V5.8z"/><path class="ac" d="M8.5 10.6h7v2.2h-7z"/>',
    heal: '<circle cx="12" cy="12" r="8.6"/><path class="ac" d="M10.6 7.4h2.8v3.2h3.2v2.8h-3.2v3.2h-2.8v-3.2H7.4v-2.8h3.2z"/>',
    counter: '<path d="M5 9.5h10.5a4 4 0 0 1 0 8H8.5"/><path d="M8.6 5.8 4.9 9.5l3.7 3.7"/><circle class="ac" cx="8.5" cy="17.5" r="1.5"/>',
    rage: '<path d="M12 3c1.2 3.6 5.3 5.2 5.3 10.2a5.3 5.3 0 0 1-10.6 0c0-2.6 1.5-3.8 2.3-5.6.8 1.8 1.4 2.5 2.7 3-.6-2.7.3-5.4.3-7.6z"/><path class="ac" d="M12 13.2c.9 1.3 2.1 1.9 2.1 3.4a2.1 2.1 0 0 1-4.2 0c0-1.3 1.2-2 2.1-3.4z"/>',
    combo: '<circle cx="8.8" cy="12" r="4.8"/><circle cx="15.2" cy="12" r="4.8"/><path class="ac" d="M12 8.3a4.8 4.8 0 0 1 0 7.4 4.8 4.8 0 0 1 0-7.4z"/>',
    silence: '<path d="M5 5.5h14v9.5H10.5L6.5 18.2V15H5z"/><path d="M4 3.5l16 17"/><circle class="ac" cx="12" cy="10.2" r="1.5"/>',
    scout: '<path d="M2.6 12S6.2 6 12 6s9.4 6 9.4 6-3.6 6-9.4 6S2.6 12 2.6 12z"/><circle class="ac" cx="12" cy="12" r="2.8"/>',
    swap: '<path d="M4.5 8.2h14"/><path d="M15.2 4.9l3.3 3.3-3.3 3.3"/><path d="M19.5 15.8h-14"/><path d="M8.8 12.5l-3.3 3.3 3.3 3.3"/><circle class="ac" cx="12" cy="12" r="1.4"/>',
    laststand: '<path d="M6.5 21V3.5"/><path class="ac" d="M6.5 4.5h11l-2.6 3.6 2.6 3.6h-11z"/>',
    mirror: '<path d="M12 3.5v17"/><path d="M9 7.2 4.2 12 9 16.8z"/><path class="ac" d="M15 7.2l4.8 4.8-4.8 4.8z"/>',
    // timing
    timing: '<path d="M13.5 3 5.5 13.2h6l-1 7.8 8-10.2h-6z"/>',
    spirit: '<circle cx="12" cy="12" r="8.6"/><path class="ac" d="M12 6.5l1.6 3.9 3.9 1.6-3.9 1.6L12 17.5l-1.6-3.9L6.5 12l3.9-1.6z"/>'
};
export const ICONS = Object.keys(P);
export const KEYWORD_ICON = { Pierce: "pierce", Guard: "guard", Heal: "heal", Counter: "counter", Rage: "rage", Combo: "combo", Silence: "silence", Scout: "scout", Swap: "swap", "Last Stand": "laststand", Mirror: "mirror" };
export const icon = (name, cls) => '<svg class="tcg-ico i-' + name + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (P[name] || P.spirit) + "</svg>";
export function iconEl(name, cls) { const s = document.createElement("span"); s.className = "tcg-i"; s.innerHTML = icon(name, cls); return s.firstChild; }
