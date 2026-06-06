/* ============================================================
   THE DAW - Phase 2 audio, media, MIDI, and recording core
   ============================================================ */

export const AUDIO_FORMATS = ["wav", "mp3", "ogg", "flac", "webm"];
export const MEDIA_CACHE = new Map();

const dataUrlFromFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error || new Error("Unable to read file."));
  reader.readAsDataURL(file);
});

const blobFromDataUrl = (dataUrl) => {
  const [meta, data] = dataUrl.split(",");
  const mime = (meta.match(/data:(.*?);base64/) || [])[1] || "application/octet-stream";
  const bin = atob(data || "");
  const bytes = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type:mime });
};

function waveformPeaks(buffer, points=96) {
  if (!buffer) return [];
  const out = [];
  const length = buffer.length;
  const channels = buffer.numberOfChannels;
  const step = Math.max(1, Math.floor(length / points));
  for (let i=0; i<points; i++) {
    const start = i * step;
    const end = Math.min(length, start + step);
    let peak = 0;
    for (let ch=0; ch<channels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let j=start; j<end; j++) peak = Math.max(peak, Math.abs(data[j] || 0));
    }
    out.push(Math.round(Math.min(1, peak) * 1000) / 1000);
  }
  return out;
}

export const AudioCore = {
  async importAudioFiles(files) {
    const ctx = Audio.ensure();
    const out = [];
    for (const file of Array.from(files || [])) {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      if (!AUDIO_FORMATS.includes(ext)) throw new Error(`${file.name} is not a supported audio format.`);
      const dataUrl = await dataUrlFromFile(file);
      const arr = await file.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arr.slice(0));
      const id = uid();
      MEDIA_CACHE.set(id, { buffer, dataUrl, fileName:file.name, type:file.type || `audio/${ext}` });
      out.push({
        id,
        name:file.name,
        kind:"audio",
        format:ext,
        type:file.type || `audio/${ext}`,
        size:file.size,
        duration:buffer.duration,
        sampleRate:buffer.sampleRate,
        channels:buffer.numberOfChannels,
        waveform:waveformPeaks(buffer),
        dataUrl,
      });
    }
    return out;
  },
  async hydrateMedia(media=[]) {
    const ctx = Audio.ensure();
    for (const item of media) {
      if (!item?.id || MEDIA_CACHE.has(item.id) || !item.dataUrl) continue;
      try {
        const arr = await blobFromDataUrl(item.dataUrl).arrayBuffer();
        const buffer = await ctx.decodeAudioData(arr.slice(0));
        MEDIA_CACHE.set(item.id, { buffer, dataUrl:item.dataUrl, fileName:item.name, type:item.type });
      } catch (_) {}
    }
  },
  getBuffer(mediaId) {
    return MEDIA_CACHE.get(mediaId)?.buffer || null;
  },
  async recordMicrophone({ onData, onStop, onError }={}) {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone recording is not available in this runtime.");
    const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data?.size) { chunks.push(e.data); onData&&onData(e.data); } };
    recorder.onerror = (e) => onError&&onError(e.error || e);
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunks, { type:recorder.mimeType || "audio/webm" });
      const file = new File([blob], `mic_take_${new Date().toISOString().replace(/[:.]/g,"-")}.webm`, { type:blob.type });
      let media;
      try {
        const dataUrl = await dataUrlFromFile(file);
        const arr = await blob.arrayBuffer();
        const ctx = Audio.ensure();
        const buffer = await ctx.decodeAudioData(arr.slice(0));
        const id = uid();
        MEDIA_CACHE.set(id, { buffer, dataUrl, fileName:file.name, type:file.type });
        media = { id, name:file.name, kind:"audio", format:"webm", type:file.type, size:file.size,
          duration:buffer.duration, sampleRate:buffer.sampleRate, channels:buffer.numberOfChannels, waveform:waveformPeaks(buffer), dataUrl };
      } catch (e) {
        onError&&onError(e);
      }
      onStop&&onStop(media);
    };
    recorder.start(250);
    return recorder;
  },
};

export const MidiCore = {
  access:null,
  listeners:new Set(),
  async start(onMessage) {
    if (!navigator.requestMIDIAccess) throw new Error("Web MIDI is not available in this runtime.");
    MidiCore.access = await navigator.requestMIDIAccess({ sysex:false });
    MidiCore.listeners.add(onMessage);
    const handler = (event) => MidiCore.handleMessage(event);
    for (const input of MidiCore.access.inputs.values()) input.onmidimessage = handler;
    MidiCore.access.onstatechange = () => {
      for (const input of MidiCore.access.inputs.values()) input.onmidimessage = handler;
    };
    return [...MidiCore.access.inputs.values()].map(i => ({ id:i.id, name:i.name, manufacturer:i.manufacturer, state:i.state }));
  },
  stop(onMessage) {
    if (onMessage) MidiCore.listeners.delete(onMessage);
    if (!MidiCore.listeners.size && MidiCore.access) {
      for (const input of MidiCore.access.inputs.values()) input.onmidimessage = null;
    }
  },
  handleMessage(event) {
    const [status, d1, d2] = event.data;
    const command = status & 0xf0;
    const channel = (status & 0x0f) + 1;
    let msg = { raw:[status,d1,d2], channel, time:event.timeStamp };
    if (command === 0x90 && d2 > 0) msg = { ...msg, type:"noteon", note:d1, velocity:d2/127 };
    else if (command === 0x80 || (command === 0x90 && d2 === 0)) msg = { ...msg, type:"noteoff", note:d1, velocity:0 };
    else if (command === 0xb0) msg = { ...msg, type:"cc", cc:d1, value:d2/127 };
    else if (command === 0xe0) msg = { ...msg, type:"pitchbend", value:((d2 << 7) + d1 - 8192) / 8192 };
    else if (command === 0xd0) msg = { ...msg, type:"aftertouch", value:d1/127 };
    else msg = { ...msg, type:"unknown" };
    MidiCore.listeners.forEach(fn => fn(msg));
  },
};

Object.assign(window, { AudioCore, MidiCore, AUDIO_FORMATS, MEDIA_CACHE, waveformPeaks });
