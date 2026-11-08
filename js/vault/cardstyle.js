/* =====================================================================
   ANIME TCG · THE STYLE MATRIX (series side)
   RARITY decides the material, shape, effects and shine (css/cards.css). The SERIES decides the colours, the frame
   ornaments, the pattern, the name-plate lettering and the card back. This file holds the series ornaments: one corner
   motif per series (drawn for the top-left corner on a 40 x 40 grid; the other three corners are mirrored copies) and
   the medallion ring used on the back. Our own drawings, evoking each series' mood: no logos, no official art.
   ===================================================================== */
const S = (d, extra = "") => '<g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + d + "</g>" + extra;
export const CORNER = {
    onepiece:    S('<path d="M3 37V16C3 8 8 3 16 3h21"/><path d="M7 37V17c0-6 4-10 10-10h20" stroke-dasharray="2.6 2.2"/>', '<path d="M17 33q3-3 6 0t6 0t6 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="11" cy="11" r="2.4" fill="currentColor"/>'),
    naruto:      S('<path d="M3 37V9a6 6 0 0 1 6-6h28"/><path d="M14 14m-1.5 0a1.5 1.5 0 1 1 3 0 4 4 0 1 1-8 0 6.5 6.5 0 1 1 13 0"/>', '<rect x="3" y="31" width="9" height="4" rx="2" fill="currentColor"/><rect x="31" y="3" width="4" height="9" rx="2" fill="currentColor"/>'),
    dragonball:  S('<path d="M3 37V8l5-5h29"/><path d="M15 9v3M9 15h3M19 19l2 2M11 21l-2 2M21 11l2-2"/>', '<path d="M15 12.5l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" fill="currentColor"/>'),
    jjk:         S('<path d="M4 37c1-9 0-18 2-25s8-9 15-8 13-1 16 0"/><path d="M9 33c1-6 1-12 4-16" stroke-width="1.4"/><path d="M14 9c5-1 9 0 13-1" stroke-width="1.4"/>', '<circle cx="13" cy="13" r="2.2" fill="currentColor"/>'),
    demonslayer: '<g fill="currentColor"><rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6"/><rect x="9" y="9" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/><rect x="27" y="3" width="6" height="6" opacity=".6"/><rect x="3" y="27" width="6" height="6" opacity=".6"/><rect x="21" y="9" width="6" height="6" opacity=".8"/><rect x="9" y="21" width="6" height="6" opacity=".8"/></g>',
    bleach:      S('<path d="M3 37V12C3 7 7 3 12 3h25"/><path d="M8 30L30 8" stroke-width="1.6"/>', '<path d="M18 9a8 8 0 1 0 0 14a6.5 6.5 0 1 1 0-14z" fill="currentColor"/>'),
    aot:         S('<path d="M3 37V3h34"/><path d="M3 11h12M11 3v8M3 19h8M19 3v8M11 11v8M27 3v8"/>', '<path d="M17 21c3-6 9-8 14-6-3 0-6 2-7 5 3-2 7-2 9 0-4 0-7 2-8 5-2-3-5-4-8-4z" fill="currentColor"/>'),
    mha:         S('<path d="M3 37V7l4-4h30"/>', '<path d="M16 6l-6 10h5l-3 9 9-12h-5l3-7z" fill="currentColor"/><g fill="currentColor" opacity=".65"><circle cx="24" cy="9" r="1.3"/><circle cx="29" cy="9" r="1"/><circle cx="9" cy="28" r="1.3"/><circle cx="9" cy="33" r="1"/><circle cx="24" cy="14" r=".9"/></g>'),
    hxh:         S('<path d="M3 37V9l6-6h28"/><path d="M8 26h6M26 8v6"/>', '<path d="M15 9l4 5-4 5-4-5z" fill="currentColor"/><path d="M27 20a2.6 2.6 0 1 1 3.6 3.6M27 20a2.6 2.6 0 1 0-3.6 3.6 2.6 2.6 0 1 0 3.6 0" fill="none" stroke="currentColor" stroke-width="1.6"/>'),
    deathnote:   S('<path d="M3 37V14C3 8 8 3 14 3h0c0 5 4 9 9 9h14"/><path d="M8 37V18"/>', '<path d="M24 20c4-5 9-7 13-7-2 2-5 5-8 6 2 0 4 0 6-1-3 3-6 4-10 4l-6 6 1-3z" fill="currentColor"/>'),
    chainsaw:    S('<path d="M3 37V3h34"/>', '<g fill="currentColor"><path d="M7 3l3 5 3-5zM15 3l3 5 3-5zM23 3l3 5 3-5zM31 3l3 5 3-5z"/><path d="M3 7l5 3-5 3zM3 15l5 3-5 3zM3 23l5 3-5 3zM3 31l5 3-5 3z"/></g><rect x="12" y="12" width="9" height="5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="17" y="15" width="9" height="5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/>'),
    blackclover: S('<path d="M3 37V10a7 7 0 0 1 7-7h27"/><path d="M14 22v9" stroke-width="1.6"/>', '<g fill="currentColor"><path d="M14 16c-4-6-10-3-7 1 2 2 5 1 7-1z"/><path d="M14 16c6-4 3-10-1-7-2 2-1 5 1 7z"/><path d="M14 16c4 6 10 3 7-1-2-2-5-1-7 1z"/><path d="M14 16c-6 4-3 10 1 7 2-2 1-5-1-7z"/></g>'),
    jojo:        S('<path d="M3 37V3h34" stroke-width="2.6"/><path d="M8 37V8h29" stroke-width="1.2"/>', '<g fill="currentColor"><path d="M15 13h7l-2 4h4l-6 8 1-5h-4z"/><path d="M27 23h5l-1.5 3h3l-4.5 6 .8-4h-3z" opacity=".75"/></g>'),
    rezero:      S('<path d="M3 37V10a7 7 0 0 1 7-7h27"/><path d="M8 28a20 20 0 0 1 20-20" stroke-width="1.5"/><path d="M10 21l2 1M15 13l1 2M21 9l1 2" stroke-width="1.5"/>', '<circle cx="13" cy="13" r="2.4" fill="currentColor"/>'),
    fireforce:   S('<path d="M3 37V8l5-5h29"/>', '<path d="M12 27c-4-3-4-8-1-12 0 3 2 4 3 5 0-5 3-9 7-11-2 4 0 7 2 9 1-2 1-3 1-5 3 3 3 9-1 13-3 2-8 3-11 1z" fill="currentColor"/>'),
    frieren:     S('<path d="M3 37V12C3 7 7 3 12 3h25"/><path d="M8 34c2-8 6-14 13-19" stroke-width="1.4"/>', '<g fill="currentColor"><ellipse cx="22" cy="11" rx="2.2" ry="4" transform="rotate(30 22 11)"/><ellipse cx="13" cy="21" rx="2.2" ry="4" transform="rotate(-20 13 21)"/><circle cx="17" cy="16" r="1.8"/><circle cx="28" cy="7" r="1.2"/></g>'),
    gachiakuta:  S('<path d="M3 37V5l2-2h32" stroke-dasharray="7 2.5"/><path d="M10 10l10 10M20 10L10 20" stroke-width="2.8"/>', '<g fill="currentColor"><circle cx="25" cy="24" r="2"/><circle cx="28.5" cy="28" r="1.2"/><circle cx="9" cy="27" r="1.4"/></g>'),
    windbreaker: S('<path d="M3 37V10a7 7 0 0 1 7-7h27"/><path d="M9 14h11a3 3 0 1 0-3-3"/><path d="M9 20h16a3 3 0 1 1-3 3"/><path d="M9 26h7" stroke-width="1.6"/>')
};
export const corner = s => '<svg viewBox="0 0 40 40" aria-hidden="true">' + (CORNER[s] || CORNER.onepiece) + "</svg>";
