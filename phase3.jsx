/* ============================================================
   Draftwave - Phase 3 instruments, effects, and clip edit helpers
   ============================================================ */

const EFFECT_LIBRARY = [
  { id:"eq", name:"Equalizer", category:"Tone", status:"saved", params:{ low:0, mid:0, high:0 } },
  { id:"compressor", name:"Compressor", category:"Dynamics", status:"saved", params:{ threshold:-18, ratio:3, attack:4, release:180 } },
  { id:"limiter", name:"Limiter", category:"Dynamics", status:"saved", params:{ ceiling:-1, release:120 } },
  { id:"reverb", name:"Reverb", category:"Space", status:"preview", params:{ mix:0.24, size:0.65 } },
  { id:"delay", name:"Delay", category:"Space", status:"saved", params:{ mix:0.22, time:"1/4", feedback:0.35 } },
  { id:"chorus", name:"Chorus", category:"Modulation", status:"saved", params:{ mix:0.25, rate:0.8, depth:0.35 } },
  { id:"flanger", name:"Flanger", category:"Modulation", status:"saved", params:{ mix:0.2, rate:0.35, depth:0.5 } },
  { id:"phaser", name:"Phaser", category:"Modulation", status:"saved", params:{ mix:0.22, rate:0.45, stages:4 } },
  { id:"distortion", name:"Distortion", category:"Drive", status:"saved", params:{ drive:0.35, tone:0.5 } },
  { id:"saturation", name:"Saturation", category:"Drive", status:"saved", params:{ drive:0.22, warmth:0.6 } },
  { id:"noise-gate", name:"Noise Gate", category:"Dynamics", status:"saved", params:{ threshold:-42, release:90 } },
  { id:"pitch-shifter", name:"Pitch Shifter", category:"Pitch", status:"saved", params:{ semitones:0, mix:1 } },
  { id:"stereo-widener", name:"Stereo Widener", category:"Imaging", status:"saved", params:{ width:1.25 } },
];

const FX_PARAM_DEFS = {
  low:{ label:"Low", min:-12, max:12, step:0.1, unit:" dB" },
  mid:{ label:"Mid", min:-12, max:12, step:0.1, unit:" dB" },
  high:{ label:"High", min:-12, max:12, step:0.1, unit:" dB" },
  threshold:{ label:"Threshold", min:-60, max:0, step:1, unit:" dB" },
  ratio:{ label:"Ratio", min:1, max:20, step:0.1, suffix:":1" },
  attack:{ label:"Attack", min:1, max:120, step:1, unit:" ms" },
  release:{ label:"Release", min:20, max:1000, step:5, unit:" ms" },
  ceiling:{ label:"Ceiling", min:-12, max:0, step:0.1, unit:" dB" },
  mix:{ label:"Mix", min:0, max:1, step:0.01, percent:true },
  size:{ label:"Size", min:0, max:1, step:0.01, percent:true },
  feedback:{ label:"Feedback", min:0, max:0.95, step:0.01, percent:true },
  rate:{ label:"Rate", min:0.05, max:8, step:0.05, unit:" Hz" },
  depth:{ label:"Depth", min:0, max:1, step:0.01, percent:true },
  stages:{ label:"Stages", min:2, max:12, step:1 },
  drive:{ label:"Drive", min:0, max:1, step:0.01, percent:true },
  tone:{ label:"Tone", min:0, max:1, step:0.01, percent:true },
  warmth:{ label:"Warmth", min:0, max:1, step:0.01, percent:true },
  semitones:{ label:"Pitch", min:-12, max:12, step:1, unit:" st" },
  width:{ label:"Width", min:0, max:2, step:0.01, suffix:"x" },
  time:{ label:"Time", options:["1/64","1/32","1/16","1/8","1/4","1/2","1 bar"] },
};

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

function getFxParamDef(param) {
  return FX_PARAM_DEFS[param] || { label:param, min:0, max:1, step:0.01 };
}

function defaultInstrumentState(kind) {
  if (kind === "sampler") return { mode:"one-shot", rootNote:60, zones:[], envelope:{ attack:0.005, decay:0.12, sustain:0.8, release:0.25 } };
  if (kind === "multisample") return { mode:"multi", rootNote:60, zones:[], roundRobin:false, velocityLayers:false };
  if (kind === "drum") return { pads:["Kick","Snare","Hat","Clap","Tom","Ride","Crash","Perc"].map((name,i)=>({ id:uid(), name, note:36+i, mediaId:null })) };
  return null;
}

Object.assign(window, { EFFECT_LIBRARY, FX_PARAM_DEFS, INSTRUMENT_LIBRARY, defaultFxChain, makeFx, getFxMeta, getFxParamDef, defaultInstrumentState });
