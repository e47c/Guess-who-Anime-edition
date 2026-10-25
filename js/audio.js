/* =====================================================================
   AUDIO ENGINE
   One AudioContext for the whole game: master -> (music bus, sfx bus).
   - sfx(name):  synthesized sound effects (no files needed)
   - music.play(theme): procedural soundtrack per scene, crossfaded
   - mediaVolume(): volume to use for <audio> clips (voice lines, win sounds)
   Settings persist in localStorage ("gw_audio"). Nothing here allocates per
   frame; the scheduler only runs while a theme is playing and the tab is visible.
   ===================================================================== */

const KEY = "gw_audio";
const DEF = { master: .8, music: .5, sfx: .8, mute: false, musicOn: true };
let S = Object.assign({}, DEF);
try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
// keep the old mute / music switches working for returning players
try { if (localStorage.getItem("gw_muted") === "1" && !localStorage.getItem(KEY)) S.mute = true; if (localStorage.getItem("gw_music") === "0" && !localStorage.getItem(KEY)) S.musicOn = false; } catch (e) {}

let ctx = null, master = null, musicBus = null, sfxBus = null, verb = null, verbIn = null, noiseBuf = null, unlocked = false;
const listeners = new Set();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} listeners.forEach(f => { try { f(S); } catch (e) {} }); };

function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC({ latencyHint: "interactive" });
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 4; comp.attack.value = .004; comp.release.value = .2;
    master = ctx.createGain(); musicBus = ctx.createGain(); sfxBus = ctx.createGain();
    musicBus.connect(master); sfxBus.connect(master); master.connect(comp); comp.connect(ctx.destination);
    // small generated plate reverb shared by music + sfx sends
    verb = ctx.createConvolver(); verbIn = ctx.createGain(); verbIn.gain.value = .9;
    const len = Math.floor(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    verb.buffer = ir; verbIn.connect(verb); verb.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    applyVolumes();
    return ctx;
}
function applyVolumes() {
    if (!ctx) return;
    const t = ctx.currentTime, on = !S.mute;
    master.gain.setTargetAtTime(on ? S.master : 0, t, .03);
    musicBus.gain.setTargetAtTime(on && S.musicOn ? S.music * .55 : 0, t, .25);
    sfxBus.gain.setTargetAtTime(on ? S.sfx : 0, t, .03);
}
function unlock() {
    const c = ensure(); if (!c) return;
    if (c.state === "suspended") c.resume().catch(() => {});
    if (!unlocked) { unlocked = true; if (music.want) music._start(music.want); }
}
["pointerdown", "keydown", "touchstart"].forEach(ev => document.addEventListener(ev, unlock, { passive: true }));
document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) { ctx.suspend().catch(() => {}); } else if (unlocked) ctx.resume().catch(() => {});
});

/* ---------------- low-level voices ---------------- */
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function env(g, t, a, peak, d, sus, r, end) {
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(.0001, peak * sus), t + a + d);
    if (end != null) { g.gain.setValueAtTime(Math.max(.0001, peak * sus), end); g.gain.exponentialRampToValueAtTime(.0001, end + r); }
}
function osc(type, f, t, stop, out) { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(out); o.start(t); o.stop(stop); return o; }
function noise(t, dur, out) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.connect(out); s.start(t, Math.random() * .5); s.stop(t + dur); return s; }
function gainTo(out, v) { const g = ctx.createGain(); g.gain.value = v == null ? 1 : v; g.connect(out); return g; }
function filt(type, f, q, out) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; b.connect(out); return b; }
function send(node, amt) { const g = ctx.createGain(); g.gain.value = amt; node.connect(g); g.connect(verbIn); }

const V = {
    kick(out, t, v = 1) { const g = gainTo(out, 0); env(g, t, .002, v, .32, .001); const o = osc("sine", 150, t, t + .4, g); o.frequency.exponentialRampToValueAtTime(42, t + .14); const c = gainTo(out, 0); env(c, t, .001, v * .35, .02, .001); noise(t, .02, filt("highpass", 3000, null, c)); },
    snare(out, t, v = 1, tail = .18) { const g = gainTo(out, 0); env(g, t, .002, v * .8, tail, .001); const n = filt("bandpass", 1900, .8, g); noise(t, tail + .05, n); const tg = gainTo(out, 0); env(tg, t, .002, v * .5, .09, .001); osc("triangle", 200, t, t + .12, tg).frequency.exponentialRampToValueAtTime(140, t + .1); send(g, .18); },
    hat(out, t, v = 1, open = false) { const d = open ? .26 : .045, g = gainTo(out, 0); env(g, t, .001, v * .35, d, .001); noise(t, d + .02, filt("highpass", 7200, null, g)); },
    brush(out, t, v = 1) { const g = gainTo(out, 0); env(g, t, .02, v * .18, .16, .001); noise(t, .2, filt("bandpass", 4200, .6, g)); },
    tom(out, t, f, v = 1) { const g = gainTo(out, 0); env(g, t, .002, v, .38, .001); osc("sine", f, t, t + .45, g).frequency.exponentialRampToValueAtTime(f * .55, t + .35); send(g, .25); },
    bass(out, t, m, dur, v = 1, wave = "sawtooth", cut = 520) { const g = gainTo(out, 0); env(g, t, .006, v * .55, dur * .9, .45, .06, t + dur * .9); const f = filt("lowpass", cut, 4, g); f.frequency.setValueAtTime(cut * 2.4, t); f.frequency.exponentialRampToValueAtTime(cut, t + .12); osc(wave, mtof(m), t, t + dur + .15, f); osc("sine", mtof(m - 12), t, t + dur + .15, gainTo(g, .6)); },
    pluck(out, t, m, dur, v = 1, wave = "square", cut = 2400, rev = .3) { const g = gainTo(out, 0); env(g, t, .003, v * .22, Math.min(.5, dur), .001); const f = filt("lowpass", cut, 2, g); f.frequency.setValueAtTime(cut, t); f.frequency.exponentialRampToValueAtTime(cut * .25, t + .3); osc(wave, mtof(m), t, t + dur + .2, f); send(g, rev); },
    pad(out, t, ms, dur, v = 1, cut = 900, wave = "sawtooth") { const g = gainTo(out, 0); env(g, t, Math.min(.9, dur * .4), v * .09, dur * .5, .7, .9, t + dur); const f = filt("lowpass", cut, .7, g); ms.forEach(m => { osc(wave, mtof(m) * 1.003, t, t + dur + 1.1, f); osc(wave, mtof(m) * .997, t, t + dur + 1.1, f); }); send(g, .5); },
    keys(out, t, ms, dur, v = 1) { const g = gainTo(out, 0); env(g, t, .01, v * .14, 1.1, .25, .5, t + dur); const trem = ctx.createGain(); trem.connect(g); const l = osc("sine", 4.6, t, t + dur + .6, ctx.createGain()); const lg = ctx.createGain(); lg.gain.value = .25; l.disconnect(); l.connect(lg); lg.connect(trem.gain); ms.forEach(m => { osc("sine", mtof(m), t, t + dur + .6, trem); osc("triangle", mtof(m) * 2, t, t + dur + .6, gainTo(trem, .12)); }); send(g, .45); },
    bell(out, t, m, v = 1, dur = 2.4) { [[1, 1], [2.76, .45], [5.4, .25], [8.9, .12]].forEach(([r, a]) => { const g = gainTo(out, 0); env(g, t, .002, v * .13 * a, dur / r, .001); osc("sine", mtof(m) * r, t, t + dur, g); send(g, .5); }); },
    stab(out, t, ms, v = 1, dur = .22) { const g = gainTo(out, 0); env(g, t, .004, v * .16, dur, .001); const f = filt("lowpass", 3200, 1.5, g); f.frequency.exponentialRampToValueAtTime(700, t + dur); ms.forEach(m => { osc("sawtooth", mtof(m), t, t + dur + .1, f); osc("square", mtof(m) * 1.005, t, t + dur + .1, gainTo(f, .5)); }); send(g, .25); },
    sweep(out, t, f0, f1, dur, v = 1, q = 6) { const g = gainTo(out, 0); env(g, t, dur * .5, v * .3, dur * .5, .001); const b = filt("bandpass", f0, q, g); b.frequency.setValueAtTime(f0, t); b.frequency.exponentialRampToValueAtTime(f1, t + dur); noise(t, dur + .05, b); send(g, .2); }
};

/* ---------------- sound effects ---------------- */
let lastSfx = {};
function sfx(name, opt) {
    if (S.mute || !ensure() || ctx.state !== "running") return;
    const now = ctx.currentTime, o = sfxBus;
    if (lastSfx[name] && now - lastSfx[name] < .035) return;   // de-duplicate bursts of the same sound
    lastSfx[name] = now;
    const t = now + .005, f = FX[name]; if (f) try { f(o, t, opt || {}); } catch (e) {}
}
const chord = (o, t, ms, step, v, w) => ms.forEach((m, i) => V.pluck(o, t + i * step, m, .5, v, w || "triangle", 3800, .35));
const FX = {
    hover(o, t) { V.pluck(o, t, 96, .05, .25, "sine", 6000, 0); },
    click(o, t) { V.pluck(o, t, 84, .06, .5, "square", 3000, 0); V.hat(o, t, .4); },
    toggle(o, t) { V.pluck(o, t, 79, .05, .5, "triangle", 4000, 0); V.pluck(o, t + .05, 86, .05, .4, "triangle", 4000, 0); },
    open(o, t) { V.sweep(o, t, 500, 3200, .22, .7); },
    close(o, t) { V.sweep(o, t, 2600, 400, .2, .6); },
    flip(o, t) { V.sweep(o, t, 1800, 700, .1, .9, 3); V.pluck(o, t + .05, 64, .08, .5, "square", 1500, 0); },
    pick(o, t) { V.pluck(o, t, 76, .12, .7, "triangle", 5000, .2); V.pluck(o, t + .06, 83, .12, .55, "triangle", 5000, .2); },
    turn(o, t) { V.bell(o, t, 76, .8, 1.6); V.bell(o, t + .12, 83, .7, 1.6); },
    guess(o, t) { V.sweep(o, t, 200, 2400, .4, .9, 4); V.tom(o, t + .38, 120, .7); },
    win(o, t) { chord(o, t, [67, 71, 74, 79], .09, 1); V.stab(o, t + .42, [67, 71, 74, 79], .9, .6); V.kick(o, t + .42, .7); },
    lose(o, t) { [70, 67, 63, 58].forEach((m, i) => V.pluck(o, t + i * .16, m, .4, .8, "sawtooth", 1200, .3)); V.tom(o, t + .64, 70, .7); },
    join(o, t) { chord(o, t, [72, 76, 79], .06, .8); },
    leave(o, t) { chord(o, t, [79, 74, 67], .07, .7); },
    ready(o, t) { V.pluck(o, t, 81, .1, .7, "square", 3000, .2); V.pluck(o, t + .08, 88, .14, .6, "square", 3000, .2); },
    start(o, t) { V.sweep(o, t, 120, 4000, .7, 1, 3); V.kick(o, t + .7, 1); V.stab(o, t + .7, [55, 62, 67, 70], 1, .5); V.snare(o, t + .7, .9, .4); },
    card(o, t) { V.sweep(o, t, 3000, 900, .09, .9, 2); },
    slam(o, t, p) { V.kick(o, t, .6); V.snare(o, t, .5, .06); V.sweep(o, t, 2500, 300, .08, .6, 1); },
    draw(o, t) { V.sweep(o, t, 900, 2600, .12, .7, 2); },
    skip(o, t) { V.pluck(o, t, 52, .18, 1, "sawtooth", 1400, .1); V.pluck(o, t + .15, 47, .25, 1, "sawtooth", 1100, .1); V.snare(o, t, .5, .1); },
    reverse(o, t) { V.sweep(o, t, 4000, 300, .28, .9, 5); V.sweep(o, t + .22, 300, 4000, .28, .9, 5); },
    punch(o, t) { V.kick(o, t, 1.2); V.snare(o, t, 1, .1); V.tom(o, t, 90, .8); },
    heavy(o, t) { V.sweep(o, t, 100, 1500, .35, .8, 2); V.kick(o, t + .35, 1.4); V.tom(o, t + .35, 55, 1.2); V.snare(o, t + .35, 1, .5); V.pad(o, t + .35, [38, 45], .8, 2.2, 400); },
    wild(o, t) { [72, 76, 79, 84, 88, 91].forEach((m, i) => V.pluck(o, t + i * .045, m, .3, .55, "triangle", 6000, .5)); },
    uno(o, t) { V.stab(o, t, [62, 66, 69, 74], 1.1, .35); V.kick(o, t, .8); V.stab(o, t + .16, [64, 68, 71, 76], 1.1, .5); },
    catch(o, t) { [0, .12, .24].forEach(d => V.pluck(o, t + d, 88, .08, .8, "square", 5000, 0)); },
    emote(o, t) { V.pluck(o, t, 79, .08, .6, "sine", 5000, .2); V.pluck(o, t + .05, 91, .1, .4, "sine", 5000, .2); },
    xp(o, t) { V.pluck(o, t, 91, .04, .25, "sine", 7000, 0); },
    levelup(o, t) { chord(o, t, [72, 76, 79, 84], .08, 1); V.bell(o, t + .36, 84, 1, 2.5); V.bell(o, t + .36, 91, .6, 2.5); },
    achievement(o, t) { V.bell(o, t, 86, .9, 2); V.bell(o, t + .1, 93, .7, 2); V.sweep(o, t, 2000, 8000, .5, .4, 2); },
    stamp(o, t) { V.kick(o, t, .5); V.snare(o, t, .7, .07); },
    reveal(o, t) { V.sweep(o, t, 400, 6000, .6, .5, 3); V.bell(o, t + .5, 88, .6, 2); },
    strike(o, t) { V.pluck(o, t, 45, .25, 1, "sawtooth", 900, .1); V.snare(o, t, .6, .12); },
    vote(o, t) { V.tom(o, t, 160, .7); V.hat(o, t, .5); },
    heartbeat(o, t) { V.kick(o, t, .55); V.kick(o, t + .22, .4); },
    whoosh(o, t) { V.sweep(o, t, 300, 3500, .3, .8, 1.5); },
    impact(o, t) { V.kick(o, t, 1.3); V.tom(o, t, 60, 1); V.sweep(o, t, 3000, 200, .5, .7, 1); V.pad(o, t, [33, 40], .6, 1.8, 300); },
    tick(o, t) { V.hat(o, t, .7); },
    // cinematic layer for the special-card scenes
    boom(o, t) { V.kick(o, t, 1.5); V.tom(o, t, 48, 1.3); V.sweep(o, t, 1800, 120, .9, .9, 1); V.pad(o, t, [28, 35], .9, 2.4, 260); },
    shing(o, t) { V.sweep(o, t, 5200, 9000, .5, .7, 8); V.bell(o, t + .02, 100, .5, 1.2); },
    crack(o, t) { V.sweep(o, t, 6000, 1800, .5, 1, 2); V.snare(o, t, .8, .3); V.hat(o, t + .06, .9, true); },
    chime(o, t) { [88, 95, 100, 107].forEach((m, i) => V.bell(o, t + i * .07, m, .7, 2.8)); V.sweep(o, t, 8000, 1200, 1.4, .4, 3); },
    freeze(o, t) { [96, 103, 99, 106, 110].forEach((m, i) => V.pluck(o, t + i * .05, m, .25, .5, "sine", 9000, .7)); V.sweep(o, t, 9000, 3000, .8, .6, 5); },
    wind(o, t) { V.sweep(o, t, 300, 1400, 1.4, .8, 1.2); V.sweep(o, t + .4, 1400, 500, 1.2, .5, 1.2); },
    roar(o, t) { V.sweep(o, t, 180, 900, .9, 1, 1.4); V.bass(o, t, 30, .9, 1, "sawtooth", 300); V.pad(o, t, [42, 49, 54], .8, 1.4, 700); },
    rumble(o, t) { V.pad(o, t, [24, 31, 36], 1, 2.8, 220, "sawtooth"); V.sweep(o, t, 80, 400, 2.4, .7, 1); },
    charge(o, t) { V.sweep(o, t, 200, 6000, 1.6, .7, 6); [60, 67, 72, 79, 84].forEach((m, i) => V.pluck(o, t + i * .22, m, .3, .4, "sawtooth", 3000, .3)); },
    skip2(o, t) { V.sweep(o, t, 8000, 400, .12, 1, 3); V.pluck(o, t, 40, .08, 1, "square", 2000, 0); V.hat(o, t + .03, .9); },
    chain(o, t) { [0, .05, .1, .16, .22].forEach((d, i) => V.pluck(o, t + d, 92 - i * 2, .06, .55, "square", 7000, .2)); },
    clap(o, t) { V.snare(o, t, 1.3, .12); V.kick(o, t, .6); V.sweep(o, t, 7000, 2000, .1, .9, 1); },
    zap(o, t) { V.sweep(o, t, 9000, 600, .25, .9, 9); V.pluck(o, t, 30, .2, .9, "sawtooth", 5000, 0); V.hat(o, t + .05, .8, true); },
    biwa(o, t) { V.pluck(o, t, 50, 1.2, 1.2, "sawtooth", 2400, .6); V.pluck(o, t + .01, 57, 1.2, .8, "sawtooth", 2400, .6); V.snare(o, t, .4, .05); },
    rewind(o, t) { V.sweep(o, t, 4000, 200, .7, .9, 4); V.sweep(o, t + .2, 4000, 200, .7, .8, 4); V.sweep(o, t + .4, 200, 4000, .5, .7, 4); },
    rush(o, t) { for (let i = 0; i < 10; i++) { V.kick(o, t + i * .07, .7); V.snare(o, t + i * .07 + .02, .45, .05); } },
    slash(o, t) { V.sweep(o, t, 1200, 7000, .18, 1, 2); V.sweep(o, t + .12, 4000, 500, .3, .7, 1); },
    warp(o, t) { V.sweep(o, t, 200, 3000, .4, .8, 7); V.sweep(o, t + .3, 3000, 150, .4, .7, 7); V.bell(o, t + .35, 84, .5, 1.4); },
    drum(o, t) { V.tom(o, t, 90, 1.3); V.tom(o, t + .25, 70, 1.1); V.kick(o, t, 1); }
};
// the old two-oscillator "tone" helper, now routed through the sfx bus so volume settings apply
function tone(f1, f2, dur, type = "square", vol = .06, delay = 0) {
    if (S.mute || !ensure() || ctx.state !== "running") return;
    try {
        const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
        o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur);
    } catch (e) {}
}

/* ---------------- procedural music ----------------
   Each theme is a 16-step loop over a 4-chord progression with its own instruments.
   A pattern string: "x" = hit, "o" = accent, "." = rest.                                  */
const P = s => s.split("").map(c => c === "x" ? .75 : c === "o" ? 1 : c === "-" ? .35 : 0);
const THEMES = {
    // main menu + lobby: warm lo-fi shonen groove
    lobby: { bpm: 88, swing: .14, root: 57, prog: [[0, 3, 7, 10], [-4, 0, 3, 7], [-7, -4, 0, 3], [-2, 2, 5, 9]], scale: [0, 3, 5, 7, 10, 12, 15],
        kick: P("o.....x...x....."), snare: P("....o.......o..-"), hat: P("x.x.x.x.x.x.x.xx"), bassPat: [0, null, null, 0, null, null, 7, null, 0, null, null, 0, null, 12, null, null],
        bassWave: "triangle", bassCut: 700, chords: "keys", chordHits: [0, 6], lead: "pluck", leadEvery: 2, leadWave: "triangle", leadVol: .7 },
    // Guess Who: detective noir, brushed swing
    gw: { bpm: 74, swing: .32, root: 50, prog: [[0, 3, 7, 10], [-4, 0, 3, 7], [2, 5, 8, 12], [-5, -1, 2, 5]], scale: [0, 2, 3, 5, 7, 8, 10, 12],
        kick: P("o.......x......."), snare: null, brush: P("..x.o.xx..x.o.x."), hat: P("x...x..xx...x..x"), walk: true, bassWave: "sine", bassCut: 900,
        chords: "keys", chordHits: [0, 7], lead: "bell", leadEvery: 4, leadVol: .5 },
    // Headbanz: psychic synthwave
    hb: { bpm: 104, swing: 0, root: 52, prog: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], scale: [0, 3, 7, 10, 12],
        kick: P("o...x...o...x..."), snare: P("....o.......o..."), hat: P("..x...x...x...xx"), openHat: true, bassPat: [0, null, 12, null, 0, null, 12, null, 0, null, 12, null, 0, 12, 0, 12],
        bassWave: "sawtooth", bassCut: 420, chords: "pad", padCut: 1500, arp: true, arpWave: "square", lead: null },
    // Imposter: interrogation-room tension
    im: { bpm: 62, swing: 0, root: 49, prog: [[0, 7], [1, 8], [0, 7], [-1, 6]], scale: [0, 1, 5, 7, 8],
        kick: P("o..x............"), snare: null, hat: P("x...x...x...x..."), hatVol: .3, bassPat: [0, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
        bassWave: "sine", bassCut: 300, chords: "pad", padCut: 500, padWave: "triangle", lead: "bell", leadEvery: 2, leadVol: .45, bellTension: true },
    // Anime UNO: arena battle drums
    uno: { bpm: 140, swing: 0, root: 55, prog: [[0, 7, 12], [-4, 3, 8], [-2, 5, 10], [-7, 0, 5]], scale: [0, 3, 5, 7, 10, 12, 15],
        kick: P("o...x...o...x.x."), snare: P("....o.......o..."), hat: P("x.x.x.x.x.x.x.x."), toms: true, bassPat: [0, null, 0, 12, 0, null, 0, 10, 0, null, 0, 12, 0, 7, 10, 12],
        bassWave: "sawtooth", bassCut: 650, chords: "stab", chordHits: [0, 3, 10], lead: "pluck", leadEvery: 2, leadWave: "sawtooth", leadVol: .55 }
};
let rngSeed = 7; const rnd = () => (rngSeed = (rngSeed * 16807) % 2147483647) / 2147483647;
const music = {
    want: null, cur: null, timer: 0,
    play(theme) {
        theme = THEMES[theme] ? theme : null;
        this.want = theme;
        if (!unlocked || !ensure()) return;
        if (theme === (this.cur && this.cur.name)) return;
        this._start(theme);
    },
    stop() { this.play(null); },
    _start(theme) {
        const old = this.cur; this.cur = null;
        if (old) { old.alive = false; const t = ctx.currentTime; old.bus.gain.setTargetAtTime(0, t, .4); setTimeout(() => { try { old.bus.disconnect(); } catch (e) {} }, 2500); }
        if (!theme) { this._timer(); return; }
        const th = THEMES[theme], bus = ctx.createGain(); bus.gain.value = 0; bus.connect(musicBus); bus.gain.setTargetAtTime(1, ctx.currentTime + .05, .6);
        this.cur = { name: theme, th, bus, alive: true, step: 0, bar: 0, next: ctx.currentTime + .12 };
        this._timer();
    },
    _timer() {
        clearInterval(this.timer); this.timer = 0;
        if (this.cur) this.timer = setInterval(() => this._tick(), 30);
    },
    _tick() {
        const c = this.cur; if (!c || !c.alive || !ctx || ctx.state !== "running") return;
        const th = c.th, spb = 60 / th.bpm / 4;   // seconds per 16th
        while (c.next < ctx.currentTime + .14) { this._step(c, th, c.next, spb); const sw = (c.step % 2 === 0) ? th.swing : -th.swing; c.next += spb * (1 + sw); c.step = (c.step + 1) % 16; if (c.step === 0) c.bar++; }
    },
    _step(c, th, t, spb) {
        const o = c.bus, s = c.step, bar = c.bar, ch = th.prog[bar % th.prog.length], root = th.root, fill = bar % 8 === 7 && s >= 12;
        if (th.kick && th.kick[s]) V.kick(o, t, th.kick[s] * .9);
        if (th.snare && th.snare[s]) V.snare(o, t, th.snare[s] * .6);
        if (th.brush && th.brush[s]) V.brush(o, t, th.brush[s]);
        if (th.hat && th.hat[s]) V.hat(o, t, th.hat[s] * (th.hatVol || .55), th.openHat && s % 4 === 2);
        if (th.toms && fill) V.tom(o, t, [200, 160, 130, 100][s - 12], .8);
        if (fill && th.snare && !th.toms && s % 2) V.snare(o, t, .35, .08);
        // bass
        if (th.walk) { if (s % 4 === 0) { const tones = [ch[0], ch[1], ch[2], ch[0] + 12]; V.bass(o, t, root - 12 + tones[(s / 4) | 0] + (s === 12 && rnd() < .5 ? 1 : 0), spb * 3.6, .9, th.bassWave, th.bassCut); } }
        else if (th.bassPat && th.bassPat[s] != null) V.bass(o, t, root - 12 + ch[0] + th.bassPat[s], spb * (th.bpm > 120 ? 1.6 : 2.6), .85, th.bassWave, th.bassCut);
        // chords
        const notes = ch.map(x => root + x);
        if (th.chords === "pad" && s === 0) V.pad(o, t, notes, spb * 15.5, 1, th.padCut || 900, th.padWave);
        if (th.chords === "keys" && th.chordHits.includes(s)) V.keys(o, t, notes, spb * (s === 0 ? 5 : 3), .9);
        if (th.chords === "stab" && th.chordHits.includes(s)) V.stab(o, t, notes.map(n => n + 12), .7, .16);
        // arpeggio / lead
        if (th.arp) { const up = notes.concat(notes.map(n => n + 12)); V.pluck(o, t, up[(s * (bar % 2 ? 3 : 1)) % up.length] + 12, spb * 1.6, .45, th.arpWave, 1600 + 900 * Math.sin(bar * .7 + s * .2), .25); }
        if (th.lead && bar % (th.leadEvery || 2) === 1 && s % 2 === 0 && rnd() < (th.lead === "bell" ? .22 : .5)) {
            const m = root + 12 + th.scale[(rnd() * th.scale.length) | 0] + (th.bellTension && rnd() < .3 ? 1 : 0);
            if (th.lead === "bell") V.bell(o, t, m + 12, th.leadVol || .5, 2.2); else V.pluck(o, t, m, spb * 2, th.leadVol || .6, th.leadWave || "square", 2600, .35);
        }
    }
};

/* ---------------- public API ---------------- */
export const audio = {
    get settings() { return Object.assign({}, S); },
    set(patch) { Object.assign(S, patch); applyVolumes(); save(); },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    sfx, tone, music,
    get muted() { return !!S.mute; },
    mediaVolume(scale = 1) { return S.mute ? 0 : Math.max(0, Math.min(1, S.master * S.sfx * scale)); },
    duck(ms = 1800) { if (!ctx || !musicBus) return; const t = ctx.currentTime, v = !S.mute && S.musicOn ? S.music * .55 : 0; musicBus.gain.cancelScheduledValues(t); musicBus.gain.setTargetAtTime(v * .25, t, .08); musicBus.gain.setTargetAtTime(v, t + ms / 1000, .6); },
    unlock
};
