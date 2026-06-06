/* ============================================================
   THE DAW - capability registry and native feature scaffolding
   ============================================================ */

export const CAPABILITY_STATUS = {
  available: { label: "Available", color: "var(--emerald)" },
  experimental: { label: "Experimental", color: "var(--amber)" },
  "needs-backend": { label: "Needs backend", color: "var(--blue)" },
  unsupported: { label: "Unsupported", color: "var(--red)" },
};

export const CAPABILITIES = [
  { id:"project-save-load", group:"Project", title:"Project save/load", status:"available",
    detail:"Versioned JSON projects with browser fallback and Electron filesystem support." },
  { id:"autosave", group:"Project", title:"Autosave", status:"available",
    detail:"Local autosave snapshot is written after project edits." },
  { id:"undo-redo", group:"Editing", title:"Undo/redo history", status:"available",
    detail:"Project edit snapshots are stored in renderer memory." },
  { id:"mouse-wheel-zoom", group:"Editing", title:"Mouse wheel zoom", status:"available",
    detail:"Plain wheel zooms timeline and piano roll; Shift+wheel scrolls." },
  { id:"audio-import", group:"Audio", title:"WAV/MP3/OGG/FLAC import", status:"available",
    detail:"Uses browser/Electron decoding and stores imported media in the project library." },
  { id:"audio-recording", group:"Audio", title:"Microphone recording", status:"experimental",
    detail:"Uses MediaRecorder where the runtime grants microphone access." },
  { id:"offline-render", group:"Rendering", title:"Offline rendering", status:"experimental",
    detail:"Renderer can export a basic WAV mixdown with MIDI, drums, and decoded audio clips." },
  { id:"stem-export", group:"Rendering", title:"Stem export", status:"experimental",
    detail:"Stem export manifest is available; per-track audio file rendering is next." },
  { id:"midi-input", group:"MIDI", title:"MIDI input", status:"experimental",
    detail:"Uses Web MIDI when the runtime exposes it." },
  { id:"midi-cc-editing", group:"MIDI", title:"MIDI CC, pitch bend, aftertouch", status:"experimental",
    detail:"Piano roll supports editable controller lanes for clip-level MIDI data." },
  { id:"sampler", group:"Instruments", title:"Built-in sampler", status:"experimental",
    detail:"Sampler track type and instrument state are available; sample-zone UI is next." },
  { id:"drum-rack", group:"Instruments", title:"Drum rack", status:"experimental",
    detail:"Drum rack track state and synthesized rack playback are available." },
  { id:"built-in-effects", group:"Effects", title:"Built-in effects", status:"experimental",
    detail:"Mixer FX chains support EQ, dynamics, space, modulation, drive, pitch, and imaging modules as project data." },
  { id:"soundfont", group:"Instruments", title:"SoundFont support", status:"needs-backend",
    detail:"Requires JS/WASM or native synth backend." },
  { id:"vst", group:"Plugins", title:"VST hosting", status:"needs-backend",
    detail:"Requires native plugin host process; scaffolded only in the renderer." },
  { id:"extensions", group:"Plugins", title:"Extension API", status:"experimental",
    detail:"Renderer extension registry and Electron extension folder scan are available." },
  { id:"ai-remaster", group:"AI", title:"Automatic remastering", status:"needs-backend",
    detail:"Requires provider/backend and rendered audio assets." },
  { id:"stem-split", group:"AI", title:"Stem splitting", status:"needs-backend",
    detail:"Requires provider/backend and project media pipeline." },
  { id:"multi-monitor", group:"Desktop", title:"Multi-monitor detachable windows", status:"experimental",
    detail:"Electron can open detachable panel windows; focused panel routing is still evolving." },
];

export const CapabilityRegistry = {
  all: () => CAPABILITIES,
  byId: (id) => CAPABILITIES.find(c => c.id === id),
  groups: () => [...new Set(CAPABILITIES.map(c => c.group))],
  status: (id) => CAPABILITIES.find(c => c.id === id)?.status || "unsupported",
  request: async (id) => {
    const cap = CapabilityRegistry.byId(id);
    if (!cap) return { ok:false, message:"Unknown capability." };
    if (cap.status === "available" || cap.status === "experimental") return { ok:true, message:cap.detail };
    if (window.dawNative?.requestCapability) return window.dawNative.requestCapability(id);
    return { ok:false, capabilityId:id, message:cap.detail };
  },
};

export function CapabilityBadge({ status }) {
  const meta = CAPABILITY_STATUS[status] || CAPABILITY_STATUS.unsupported;
  return (
    <span className="mono" style={{fontSize:9.5,fontWeight:700,padding:"3px 7px",borderRadius:99,
      color:meta.color,background:`color-mix(in srgb,${meta.color} 12%,transparent)`,
      border:`1px solid color-mix(in srgb,${meta.color} 35%,transparent)`,whiteSpace:"nowrap"}}>
      {meta.label}
    </span>
  );
}

Object.assign(window, { CAPABILITIES, CAPABILITY_STATUS, CapabilityRegistry, CapabilityBadge });
