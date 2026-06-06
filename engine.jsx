/* ============================================================
   Draftwave — engine: icons, helpers, audio synth, seed data
   ============================================================ */

/* ---------- icons (functional UI glyphs, drawn minimally) ---------- */
const I = {
  play:  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>,
  pause: <svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="5" width="3.8" height="14" rx="1"/><rect x="13.2" y="5" width="3.8" height="14" rx="1"/></svg>,
  stop:  <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/></svg>,
  rec:   <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>,
  loop:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  metro: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 21h12l-3-16H9z"/><path d="M9 21l6-12"/></svg>,
  magnet:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4v7a6 6 0 0 0 12 0V4"/><path d="M6 4H2"/><path d="M22 4h-4"/><path d="M6 9H2"/><path d="M22 9h-4"/></svg>,
  search:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>,
  plus:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  spark: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/></svg>,
  piano: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 5v9M15 5v9M3 14h18"/></svg>,
  mixer: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4v16M12 4v16M18 4v16"/><circle cx="6" cy="9" r="2"/><circle cx="12" cy="15" r="2"/><circle cx="18" cy="7" r="2"/></svg>,
  wave:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h2l2-6 3 14 3-18 3 14 2-4h3"/></svg>,
  drum:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><ellipse cx="12" cy="7" rx="8" ry="3.2"/><path d="M4 7v8c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2V7"/><path d="M16 9l4-5M9 10l-3-6"/></svg>,
  chevron:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>,
  send:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>,
  fx:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 17V7M9 17V11M14 17V5M19 17v-7"/></svg>,
  lock:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>,
  scissors:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.5 15.5M14.5 14.5L20 20M8 8l4 4"/></svg>,
  pencil:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3l5 5L8 21H3v-5z"/></svg>,
  pointer:<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l15 9-6 1.5 3.5 6L14 21l-3.5-6L5 19z"/></svg>,
  vel:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 20h4V10H3zM10 20h4V4h-4zM17 20h4v-7h-4z"/></svg>,
  brush: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 14.5 18 6a2.1 2.1 0 0 1 3 3l-8.5 8.5"/><path d="M9.5 14.5c-1.6-1.4-4-.9-4.6 1.6C4.5 18 4 19 3 19.6c1.6 1.5 4 2 5.6.4 1.2-1.2 1.4-3.5.9-5z"/></svg>,
  eraser:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><path d="M4 14.5 14.5 4a2 2 0 0 1 2.8 0l2.7 2.7a2 2 0 0 1 0 2.8L11 19H7z"/><path d="M9 19h11"/></svg>,
  marquee:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeDasharray="3 2.6" strokeLinecap="round"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>,
  slice: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 3 6 15l3 3L21 6z"/><path d="M6 15l-2 6 6-2"/></svg>,
  mute:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8"/><path d="M6.7 6.7 17.3 17.3" strokeLinecap="round"/></svg>,
  copy:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/></svg>,
  paste: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><rect x="8.5" y="2.6" width="7" height="3.8" rx="1.2"/></svg>,
  duplicate:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/></svg>,
  selectall:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="2.4 2.4"/><path d="M8.5 12l2.3 2.3L15.5 9.5"/></svg>,
  dice:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.25" fill="currentColor"/><circle cx="15" cy="15" r="1.25" fill="currentColor"/><circle cx="15" cy="9" r="1.25" fill="currentColor"/><circle cx="9" cy="15" r="1.25" fill="currentColor"/></svg>,
  newfile:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z"/><path d="M13 3v6h6"/></svg>,
  dots:  <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>,
  star:  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.6 5.7 6.2.7-4.6 4.2 1.2 6.1L12 17l-5.4 2.9 1.2-6.1L3.2 9.4l6.2-.7z"/></svg>,
  zoomin:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4M11 8.5v5M8.5 11h5"/></svg>,
  zoomout:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4M8.5 11h5"/></svg>,
};

function BrandMark({ size=24, className="", style }) {
  const s = typeof size === "number" ? `${size}px` : size;
  return (
    <svg className={className} style={{width:s,height:s,display:"block",...style}} viewBox="0 0 256 256" aria-label="Draftwave" role="img">
      <defs>
        <linearGradient id="dw-edge" x1="36" y1="26" x2="220" y2="230" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1fe3ff"/>
          <stop offset=".52" stopColor="#9b6bff"/>
          <stop offset="1" stopColor="#1fe39a"/>
        </linearGradient>
        <linearGradient id="dw-wave" x1="50" y1="116" x2="206" y2="142" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1fe3ff"/>
          <stop offset=".58" stopColor="#6ee7ff"/>
          <stop offset="1" stopColor="#1fe39a"/>
        </linearGradient>
        <radialGradient id="dw-glow" cx="50%" cy="42%" r="62%">
          <stop offset="0" stopColor="#1fe3ff" stopOpacity=".28"/>
          <stop offset=".55" stopColor="#9b6bff" stopOpacity=".12"/>
          <stop offset="1" stopColor="#05060a" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="256" height="256" rx="56" fill="#05060a"/>
      <path d="M128 20 236 128 128 236 20 128 128 20Z" fill="url(#dw-edge)"/>
      <path d="M128 37 219 128 128 219 37 128 128 37Z" fill="#0a0c11"/>
      <path d="M128 51 205 128 128 205 51 128 128 51Z" fill="#111720"/>
      <path d="M128 51 205 128 128 205 51 128 128 51Z" fill="url(#dw-glow)"/>
      <path d="M58 138c24-34 48-34 72 0s48 34 72 0" fill="none" stroke="#071015" strokeWidth="34" strokeLinecap="round"/>
      <path d="M58 128c24-34 48-34 72 0s48 34 72 0" fill="none" stroke="url(#dw-wave)" strokeWidth="18" strokeLinecap="round"/>
      <path d="M82 128c14-17 28-17 42 0" fill="none" stroke="#eaeef6" strokeOpacity=".74" strokeWidth="5" strokeLinecap="round"/>
      <path d="M147 128c14 17 28 17 42 0" fill="none" stroke="#eaeef6" strokeOpacity=".42" strokeWidth="5" strokeLinecap="round"/>
    </svg>
  );
}

/* ---------- music helpers ---------- */
const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const isBlack = (m) => [1,3,6,8,10].includes(((m%12)+12)%12);
const noteName = (m) => NOTE_NAMES[((m%12)+12)%12] + (Math.floor(m/12)-1);
const midiToFreq = (m) => 440 * Math.pow(2, (m-69)/12);

const SCALES = {
  "Major":        [0,2,4,5,7,9,11],
  "Minor":        [0,2,3,5,7,8,10],
  "Dorian":       [0,2,3,5,7,9,10],
  "Phrygian":     [0,1,3,5,7,8,10],
  "Lydian":       [0,2,4,6,7,9,11],
  "Mixolydian":   [0,2,4,5,7,9,10],
  "Harmonic Min": [0,2,3,5,7,8,11],
  "Pentatonic":   [0,2,4,7,9],
  "Chromatic":    [0,1,2,3,4,5,6,7,8,9,10,11],
};
const ROOTS = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const inScale = (midi, rootPc, scaleName) => {
  const set = SCALES[scaleName] || SCALES.Chromatic;
  return set.includes((((midi - rootPc) % 12) + 12) % 12);
};

const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const uid = () => Math.random().toString(36).slice(2, 9);

/* ---------- audio synth engine ----------
   one shared AudioContext, lazily started on first gesture.
   poly: osc + filter + ADSR → per-instrument voice → master bus (+reverb send) */
const Audio = (() => {
  let ctx = null, master = null, comp = null, verb = null, verbGain = null, ready = false;
  const activeSources = new Set();

  function ensure() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.8;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.18;
    // simple algorithmic reverb
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 1.6, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch=0; ch<2; ch++){ const d = buf.getChannelData(ch);
      for (let i=0;i<len;i++){ d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, 2.6); } }
    verb.buffer = buf;
    verbGain = ctx.createGain(); verbGain.gain.value = 0.22;
    master.connect(comp); comp.connect(ctx.destination);
    verb.connect(verbGain); verbGain.connect(comp);
    ready = true;
    return ctx;
  }

  const VOICES = {
    keys:  { types:["triangle","sine"],   det:6,  cut:5200, q:2,  a:0.005,d:0.18,s:0.55,r:0.5, send:0.5 },
    bass:  { types:["sawtooth","sine"],    det:4,  cut:1400, q:4,  a:0.006,d:0.12,s:0.7, r:0.16, send:0.05 },
    lead:  { types:["sawtooth","square"],  det:9,  cut:6000, q:3,  a:0.01, d:0.2, s:0.6, r:0.35, send:0.35 },
    pad:   { types:["sawtooth","triangle"],det:12, cut:3600, q:1,  a:0.25, d:0.4, s:0.8, r:1.2, send:0.7 },
    pluck: { types:["triangle"],           det:0,  cut:5000, q:2,  a:0.002,d:0.16,s:0.0, r:0.18, send:0.3 },
  };

  function note(midi, when, dur, kind="keys", vel=0.9, gainScale=1, panV=0) {
    if (!ready) ensure();
    const t = ctx.currentTime + (when||0);
    const V = VOICES[kind] || VOICES.keys;
    const f = midiToFreq(midi);
    const out = ctx.createGain();
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    out.gain.value = 0;
    if (pan){ pan.pan.value = panV; out.connect(pan); pan.connect(master); }
    else out.connect(master);
    const filt = ctx.createBiquadFilter(); filt.type="lowpass"; filt.frequency.value=V.cut; filt.Q.value=V.q;
    filt.connect(out);
    const sg = ctx.createGain(); sg.gain.value = V.send * vel; filt.connect(sg); sg.connect(verb);
    V.types.forEach((ty,i)=>{ const o=ctx.createOscillator(); o.type=ty;
      o.frequency.value=f; o.detune.value=(i? V.det : -V.det);
      o.connect(filt); o.start(t); o.stop(t+dur+V.r+0.05); });
    const peak = 0.26 * vel * gainScale;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(peak, t+V.a);
    out.gain.linearRampToValueAtTime(peak*V.s, t+V.a+V.d);
    out.gain.setValueAtTime(peak*V.s, t+dur);
    out.gain.exponentialRampToValueAtTime(0.0001, t+dur+V.r);
  }

  // drum hits: synthesized
  function drum(kind, when=0, vel=0.9) {
    if (!ready) ensure();
    const t = ctx.currentTime + when;
    if (kind==="kick"){ const o=ctx.createOscillator(),g=ctx.createGain();
      o.frequency.setValueAtTime(150,t); o.frequency.exponentialRampToValueAtTime(45,t+0.12);
      g.gain.setValueAtTime(0.9*vel,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.32);
      o.connect(g); g.connect(master); o.start(t); o.stop(t+0.34); }
    else if (kind==="snare"){ const nb=ctx.createBuffer(1,ctx.sampleRate*0.2,ctx.sampleRate),d=nb.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
      const n=ctx.createBufferSource(); n.buffer=nb; const f=ctx.createBiquadFilter(); f.type="highpass"; f.frequency.value=1400;
      const g=ctx.createGain(); g.gain.setValueAtTime(0.6*vel,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.18);
      n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t+0.2); }
    else { const nb=ctx.createBuffer(1,ctx.sampleRate*0.06,ctx.sampleRate),d=nb.getChannelData(0); // hat
      for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
      const n=ctx.createBufferSource(); n.buffer=nb; const f=ctx.createBiquadFilter(); f.type="highpass"; f.frequency.value=7000;
      const g=ctx.createGain(); g.gain.setValueAtTime(0.3*vel,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.05);
      n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t+0.06); }
  }

  function click(accent){ if(!ready) ensure(); const t=ctx.currentTime; const o=ctx.createOscillator(),g=ctx.createGain();
    o.frequency.value=accent?2000:1200; g.gain.setValueAtTime(0.25,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.04);
    o.connect(g); g.connect(master); o.start(t); o.stop(t+0.05); }

  function sample(buffer, when=0, offset=0, dur=null, gainScale=1, panV=0, opts={}) {
    if (!buffer) return;
    if (!ready) ensure();
    const t = ctx.currentTime + when;
    const rawOffset = Number(offset || 0);
    if (!Number.isFinite(rawOffset) || rawOffset >= buffer.duration) return;
    const startOffset = clamp(rawOffset, 0, Math.max(0, buffer.duration - 0.001));
    const src = ctx.createBufferSource();
    const out = ctx.createGain();
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    src.buffer = opts.reverse ? reverseBuffer(buffer) : buffer;
    src.playbackRate.value = opts.playbackRate || 1;
    const remaining = Math.max(0.01, buffer.duration - startOffset);
    const totalDur = Math.min(dur || remaining, remaining);
    const baseGain = 0.8 * gainScale * (opts.gain || 1);
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(baseGain, t + Math.min(opts.fadeIn||0.005, totalDur/2));
    out.gain.setValueAtTime(baseGain, Math.max(t, t + totalDur - Math.min(opts.fadeOut||0.005, totalDur/2)));
    out.gain.linearRampToValueAtTime(0.0001, t + totalDur);
    if (pan){ pan.pan.value = panV; src.connect(out); out.connect(pan); pan.connect(master); }
    else { src.connect(out); out.connect(master); }
    activeSources.add(src);
    src.onended = () => activeSources.delete(src);
    src.start(t, startOffset, totalDur);
  }

  function stopAll() {
    for (const src of [...activeSources]) {
      try { src.stop(); } catch (_) {}
      activeSources.delete(src);
    }
  }

  function reverseBuffer(buffer) {
    const out = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for (let ch=0; ch<buffer.numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch), dst = out.getChannelData(ch);
      for (let i=0, j=src.length-1; i<src.length; i++, j--) dst[i] = src[j];
    }
    return out;
  }

  return { ensure, note, drum, click, sample, stopAll, get ctx(){ return ctx; }, get ready(){ return ready; } };
})();

/* ---------- seed project ---------- */
const TRACK_KINDS = {
  keys:  { icon:"piano", voice:"keys",  label:"Instrument", type:"instrument" },
  bass:  { icon:"piano", voice:"bass",  label:"Instrument", type:"instrument" },
  lead:  { icon:"piano", voice:"lead",  label:"Instrument", type:"instrument" },
  pad:   { icon:"piano", voice:"pad",   label:"Instrument", type:"instrument" },
  pluck: { icon:"piano", voice:"pluck", label:"Instrument", type:"instrument" },
  sampler:{ icon:"wave", voice:"keys",  label:"Sampler", type:"sampler" },
  multisample:{ icon:"piano", voice:"keys", label:"Multi-Sample", type:"sampler" },
  drum:  { icon:"drum",  voice:"drum",  label:"Drum Rack", type:"drum" },
  audio: { icon:"wave",  voice:null,    label:"Audio", type:"audio" },
  return:{ icon:"fx",    voice:null,    label:"Return / Bus", type:"bus" },
  master:{ icon:"mixer", voice:null,    label:"Master", type:"master" },
};

// a clip: { id, start(bars), len(bars), name, notes:[{p,s(beats from clip start),l(beats),v}] , audio? }
function chord(root, type, startBeat, len, vel=0.85){
  const shapes={maj:[0,4,7],min:[0,3,7],sus:[0,5,7],maj7:[0,4,7,11],min7:[0,3,7,10]};
  return (shapes[type]||shapes.maj).map(iv=>({p:root+iv,s:startBeat,l:len,v:vel}));
}

const SEED = () => {
  const keysNotes = [
    ...chord(60,"min7",0,4), ...chord(63,"maj",4,4),
    ...chord(58,"maj",8,4),  ...chord(60,"min7",12,4),
  ].map(n=>({...n,id:uid()}));
  const bassNotes = [
    {p:36,s:0,l:1.5},{p:36,s:2,l:1},{p:39,s:4,l:1.5},{p:39,s:6,l:1},
    {p:34,s:8,l:1.5},{p:34,s:10,l:1},{p:36,s:12,l:1.5},{p:36,s:14,l:1},
  ].map(n=>({...n,v:0.9,id:uid()}));
  const leadNotes = [
    {p:72,s:0,l:1},{p:75,s:1,l:.5},{p:74,s:2,l:1},{p:72,s:3.5,l:.5},
    {p:70,s:8,l:1},{p:67,s:9.5,l:.5},{p:72,s:11,l:1},
  ].map(n=>({...n,v:0.8,id:uid()}));

  return [
    { id:uid(), name:"Drums",   kind:"drum",  color:"var(--t3)", mute:false, solo:false, vol:0.85, pan:0,
      clips:[{id:uid(),start:0,len:8,name:"Beat 124",pattern:"four"},{id:uid(),start:8,len:8,name:"Beat 124"}] },
    { id:uid(), name:"Sub Bass",kind:"bass",  color:"var(--t2)", mute:false, solo:false, vol:0.8, pan:0,
      clips:[{id:uid(),start:0,len:16,name:"Bassline",notes:bassNotes}] },
    { id:uid(), name:"Rhodes",  kind:"keys",  color:"var(--t1)", mute:false, solo:false, vol:0.75, pan:-0.1,
      clips:[{id:uid(),start:0,len:16,name:"Chords",notes:keysNotes}] },
    { id:uid(), name:"Lead Synth",kind:"lead",color:"var(--t4)", mute:false, solo:false, vol:0.7, pan:0.12,
      clips:[{id:uid(),start:0,len:8,name:"Hook",notes:leadNotes},{id:uid(),start:12,len:4,name:"Hook"}] },
    { id:uid(), name:"Warm Pad",kind:"pad",   color:"var(--t5)", mute:false, solo:false, vol:0.55, pan:0,
      clips:[{id:uid(),start:4,len:12,name:"Atmos",notes:[...chord(48,"min7",0,16,0.5),...chord(48,"min7",0,16,0.5).map(n=>({...n,p:n.p+12}))].map(n=>({...n,id:uid()}))}] },
    { id:uid(), name:"Vox Chop",kind:"audio", color:"var(--t7)", mute:false, solo:false, vol:0.65, pan:0,
      clips:[{id:uid(),start:2,len:6,name:"vox_chop_01",audio:true},{id:uid(),start:10,len:4,name:"vox_chop_02",audio:true}] },
  ];
};

const BROWSER_TREE = [
  { cat:"Instruments", icon:"piano", items:[
    {name:"Analog Keys", kind:"keys", tag:"Synth"},{name:"FM Rhodes", kind:"keys", tag:"Synth"},
    {name:"Sub Bass 808", kind:"bass", tag:"Bass"},{name:"Reese Bass", kind:"bass", tag:"Bass"},
    {name:"Hyper Lead", kind:"lead", tag:"Lead"},{name:"Glass Pluck", kind:"pluck", tag:"Pluck"},
    {name:"Aurora Pad", kind:"pad", tag:"Pad"},{name:"Vapor Strings", kind:"pad", tag:"Ensemble"} ]},
  { cat:"Drums", icon:"drum", items:[
    {name:"Neon Kit", kind:"drum", tag:"Kit"},{name:"Lo-Fi Kit", kind:"drum", tag:"Kit"},
    {name:"Trap 808s", kind:"drum", tag:"Kit"},{name:"Acoustic", kind:"drum", tag:"Kit"} ]},
  { cat:"Audio", icon:"wave", items:[
    {name:"vox_chop_01", kind:"audio", tag:"Vocal"},{name:"vinyl_crackle", kind:"audio", tag:"FX"},
    {name:"riser_01", kind:"audio", tag:"FX"},{name:"foley_rain", kind:"audio", tag:"Texture"} ]},
  { cat:"Effects", icon:"fx", items:[
    {name:"Tape Saturator", kind:"fx", tag:"Drive"},{name:"Cloud Reverb", kind:"fx", tag:"Reverb"},
    {name:"Ping Delay", kind:"fx", tag:"Delay"},{name:"Bus Compressor", kind:"fx", tag:"Dynamics"} ]},
];

Object.assign(window, { I, BrandMark, Audio, SEED, TRACK_KINDS, BROWSER_TREE, BROWSER_TREE_:BROWSER_TREE,
  NOTE_NAMES, isBlack, noteName, midiToFreq, SCALES, ROOTS, inScale, clamp, uid, chord });
