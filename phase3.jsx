/* ============================================================
   THE DAW - Phase 3 instruments, effects, and clip edit helpers
   ============================================================ */

const EFFECT_LIBRARY = [
  { id:"eq", name:"Equalizer", category:"Tone", params:{ low:0, mid:0, high:0 } },
  { id:"compressor", name:"Compressor", category:"Dynamics", params:{ threshold:-18, ratio:3, attack:4, release:180 } },
  { id:"limiter", name:"Limiter", category:"Dynamics", params:{ ceiling:-1, release:120 } },
  { id:"reverb", name:"Reverb", category:"Space", params:{ mix:0.24, size:0.65 } },
  { id:"delay", name:"Delay", category:"Space", params:{ mix:0.22, time:"1/4", feedback:0.35 } },
  { id:"chorus", name:"Chorus", category:"Modulation", params:{ mix:0.25, rate:0.8, depth:0.35 } },
  { id:"flanger", name:"Flanger", category:"Modulation", params:{ mix:0.2, rate:0.35, depth:0.5 } },
  { id:"phaser", name:"Phaser", category:"Modulation", params:{ mix:0.22, rate:0.45, stages:4 } },
  { id:"distortion", name:"Distortion", category:"Drive", params:{ drive:0.35, tone:0.5 } },
  { id:"saturation", name:"Saturation", category:"Drive", params:{ drive:0.22, warmth:0.6 } },
  { id:"noise-gate", name:"Noise Gate", category:"Dynamics", params:{ threshold:-42, release:90 } },
  { id:"pitch-shifter", name:"Pitch Shifter", category:"Pitch", params:{ semitones:0, mix:1 } },
  { id:"stereo-widener", name:"Stereo Widener", category:"Imaging", params:{ width:1.25 } },
];

const INSTRUMENT_LIBRARY = [
  { name:"Built-in Sampler", kind:"sampler", tag:"Sampler", type:"sampler" },
  { name:"Drum Rack", kind:"drum", tag:"Rack", type:"drum" },
  { name:"Multi-Sample Keys", kind:"multisample", tag:"Multi-sample", type:"sampler" },
];

function defaultFxChain(kind) {
  if (kind === "master") return [makeFx("limiter"), makeFx("compressor")];
  if (kind === "audio") return [makeFx("eq"), makeFx("compressor")];
  if (kind === "drum") return [makeFx("saturation"), makeFx("compressor")];
  return [makeFx("eq"), makeFx("reverb")];
}

function makeFx(id) {
  const fx = EFFECT_LIBRARY.find(x => x.id === id) || EFFECT_LIBRARY[0];
  return { id:uid(), effectId:fx.id, name:fx.name, enabled:true, params:cloneData(fx.params) };
}

function getFxMeta(effectId) {
  return EFFECT_LIBRARY.find(x => x.id === effectId) || EFFECT_LIBRARY[0];
}

function defaultInstrumentState(kind) {
  if (kind === "sampler") return { mode:"one-shot", rootNote:60, zones:[], envelope:{ attack:0.005, decay:0.12, sustain:0.8, release:0.25 } };
  if (kind === "multisample") return { mode:"multi", rootNote:60, zones:[], roundRobin:false, velocityLayers:false };
  if (kind === "drum") return { pads:["Kick","Snare","Hat","Clap","Tom","Ride","Crash","Perc"].map((name,i)=>({ id:uid(), name, note:36+i, mediaId:null })) };
  return null;
}

Object.assign(window, { EFFECT_LIBRARY, INSTRUMENT_LIBRARY, defaultFxChain, makeFx, getFxMeta, defaultInstrumentState });
