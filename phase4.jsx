/* ============================================================
   THE DAW - Phase 4 native/advanced services
   ============================================================ */

const RENDER_FORMATS = ["wav", "mp3", "ogg", "flac"];

const TEMPLATE_PROJECTS = [
  { id:"empty", name:"Empty Project", make:()=>({ tracks:[], loop:{on:true,start:0,end:8}, bpm:124, scale:{root:"C",name:"Minor"} }) },
  { id:"writing", name:"Writing Session", make:()=>({ tracks:SEED().slice(1,4).map(t=>({...t,id:uid(),fxChain:defaultFxChain(t.kind),instrument:defaultInstrumentState(t.kind)})), loop:{on:true,start:0,end:8}, bpm:124, scale:{root:"C",name:"Minor"} }) },
  { id:"mixing", name:"Mixing Template", make:()=>({ tracks:[
    {id:uid(),name:"Drums Bus",kind:"return",type:"bus",color:"var(--t3)",mute:false,solo:false,vol:0.8,pan:0,fxChain:[makeFx("eq"),makeFx("compressor")],clips:[]},
    {id:uid(),name:"Vocal Bus",kind:"return",type:"bus",color:"var(--t7)",mute:false,solo:false,vol:0.8,pan:0,fxChain:[makeFx("eq"),makeFx("compressor"),makeFx("reverb")],clips:[]},
    {id:uid(),name:"Print Track",kind:"audio",type:"audio",color:"var(--t6)",mute:false,solo:false,vol:0.8,pan:0,fxChain:defaultFxChain("audio"),clips:[]},
  ], loop:{on:true,start:0,end:16}, bpm:120, scale:{root:"C",name:"Major"} }) },
  { id:"mastering", name:"Mastering Chain", make:()=>({ tracks:[
    {id:uid(),name:"Reference",kind:"audio",type:"audio",color:"var(--t4)",mute:false,solo:false,vol:0.75,pan:0,fxChain:[makeFx("eq")],clips:[]},
    {id:uid(),name:"Master Print",kind:"audio",type:"audio",color:"var(--t1)",mute:false,solo:false,vol:0.85,pan:0,fxChain:[makeFx("eq"),makeFx("compressor"),makeFx("limiter")],clips:[]},
  ], loop:{on:true,start:0,end:8}, bpm:100, scale:{root:"C",name:"Major"} }) },
];

const ExtensionHost = {
  rendererExtensions:[],
  register(extension) {
    const normalized = { id:extension.id||uid(), name:extension.name||"Untitled Extension", actions:extension.actions||[], panels:extension.panels||[] };
    ExtensionHost.rendererExtensions = [...ExtensionHost.rendererExtensions.filter(e=>e.id!==normalized.id), normalized];
    return normalized;
  },
  async list() {
    const native = window.dawNative?.listExtensions ? await window.dawNative.listExtensions() : { dir:null, extensions:[] };
    return { native, renderer:ExtensionHost.rendererExtensions };
  },
  async runAction(action, context) {
    if (typeof action?.run === "function") return action.run(context);
    return { ok:false, message:"Extension action is registered but has no renderer implementation." };
  },
};

function encodeWav(buffer) {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * channels * 2 + 44;
  const view = new DataView(new ArrayBuffer(length));
  const write = (offset, text) => { for (let i=0;i<text.length;i++) view.setUint8(offset+i, text.charCodeAt(i)); };
  write(0,"RIFF"); view.setUint32(4,length-8,true); write(8,"WAVE"); write(12,"fmt ");
  view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,channels,true);
  view.setUint32(24,sampleRate,true); view.setUint32(28,sampleRate*channels*2,true);
  view.setUint16(32,channels*2,true); view.setUint16(34,16,true); write(36,"data"); view.setUint32(40,length-44,true);
  let offset = 44;
  for (let i=0;i<buffer.length;i++) {
    for (let ch=0;ch<channels;ch++) {
      const s = clamp(buffer.getChannelData(ch)[i], -1, 1);
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Uint8Array(view.buffer);
}

function bytesToBase64(bytes) {
  let bin = "";
  for (let i=0;i<bytes.length;i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

const RenderCore = {
  songBeats(tracks) {
    let bars = 8;
    (tracks||[]).forEach(t => (t.clips||[]).forEach(c => bars = Math.max(bars, (c.start||0)+(c.len||1))));
    return bars * 4;
  },
  async renderWav(project, opts={}) {
    const sampleRate = opts.sampleRate || project.settings?.audio?.sampleRate || 48000;
    const bpm = project.transport?.bpm || project.bpm || 124;
    const beats = RenderCore.songBeats(project.tracks);
    const seconds = Math.max(1, beats * 60 / bpm);
    const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
    const master = ctx.createGain();
    master.gain.value = project.mixer?.masterVol ?? 0.85;
    master.connect(ctx.destination);
    const spb = 60 / bpm;
    for (const track of project.tracks || []) {
      if (track.mute) continue;
      const gain = ctx.createGain();
      gain.gain.value = track.vol ?? 0.75;
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) { pan.pan.value = track.pan || 0; gain.connect(pan); pan.connect(master); }
      else gain.connect(master);
      for (const clip of track.clips || []) {
        const base = (clip.start||0) * 4 * spb;
        if (clip.notes) {
          for (const note of clip.notes) {
            if (note.muted) continue;
            const osc = ctx.createOscillator(), env = ctx.createGain();
            osc.type = track.kind === "bass" ? "sawtooth" : "triangle";
            osc.frequency.value = midiToFreq(note.p);
            const st = base + note.s * spb, dur = Math.max(0.05, note.l * spb);
            env.gain.setValueAtTime(0, st);
            env.gain.linearRampToValueAtTime((note.v||0.8)*0.18, st+0.01);
            env.gain.linearRampToValueAtTime(0.0001, st+dur);
            osc.connect(env); env.connect(gain); osc.start(st); osc.stop(st+dur+0.02);
          }
        } else if (track.kind === "drum") {
          for (let b=0;b<(clip.len||1);b++) {
            const st = base + b*4*spb;
            RenderCore.renderClick(ctx,gain,st,80,0.14,0.35);
            RenderCore.renderNoise(ctx,gain,st+spb,0.08,0.18);
            RenderCore.renderClick(ctx,gain,st+2*spb,90,0.12,0.3);
            RenderCore.renderNoise(ctx,gain,st+3*spb,0.08,0.18);
          }
        } else if (clip.audio && clip.mediaId) {
          const buf = AudioCore.getBuffer(clip.mediaId);
          if (buf) {
            const src = ctx.createBufferSource(), g = ctx.createGain();
            src.buffer = buf; src.playbackRate.value = clip.playbackRate || 1;
            g.gain.value = clip.gain || 1;
            src.connect(g); g.connect(gain);
            src.start(base, clip.offset||0, Math.min(buf.duration, (clip.len||1)*4*spb));
          }
        }
      }
    }
    return encodeWav(await ctx.startRendering());
  },
  renderClick(ctx,out,st,freq,dur,amp) {
    const osc=ctx.createOscillator(), g=ctx.createGain();
    osc.frequency.value=freq; g.gain.setValueAtTime(amp,st); g.gain.exponentialRampToValueAtTime(0.001,st+dur);
    osc.connect(g); g.connect(out); osc.start(st); osc.stop(st+dur);
  },
  renderNoise(ctx,out,st,dur,amp) {
    const buf=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*dur),ctx.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const src=ctx.createBufferSource(), g=ctx.createGain();
    src.buffer=buf; g.gain.setValueAtTime(amp,st); g.gain.exponentialRampToValueAtTime(0.001,st+dur);
    src.connect(g); g.connect(out); src.start(st); src.stop(st+dur);
  },
  async saveWav(bytes, name="The DAW Mixdown.wav") {
    if (window.dawNative?.saveBinary) return window.dawNative.saveBinary({
      title:"Export WAV", defaultPath:name, base64:bytesToBase64(bytes), filters:[{name:"WAV Audio",extensions:["wav"]}],
    });
    const blob = new Blob([bytes], { type:"audio/wav" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    return { canceled:false, path:null };
  },
};

Object.assign(window, { RENDER_FORMATS, TEMPLATE_PROJECTS, ExtensionHost, RenderCore, encodeWav, bytesToBase64 });
