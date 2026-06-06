export const PROJECT_VERSION = 2;
export const PROJECT_AUTOSAVE_KEY = "thedaw.autosave.v1";
export const PROJECT_SETTINGS_KEY = "thedaw.settings.v1";
export const MEDIA_EMBED_WARN_BYTES = 25 * 1024 * 1024;

export const cloneData = (value) => JSON.parse(JSON.stringify(value));

export const DEFAULT_DAW_SETTINGS = {
  audio: {
    sampleRate: 48000,
    bufferSize: 256,
    inputDevice: "System default",
    outputDevice: "System default",
    microphoneArmed: false,
  },
  midi: {
    input: "All inputs",
    clock: "internal",
    chaseNotes: true,
    enableMpe: false,
  },
  project: {
    autosave: true,
    autosaveSeconds: 12,
    copyImportedMedia: true,
    template: "Empty",
  },
  editing: {
    wheelZoom: true,
    snapDefault: true,
    humanizeTimingMs: 12,
    humanizeVelocity: 8,
  },
  appearance: {
    uiScale: 1,
    theme: "Neon Studio",
    showCpu: true,
  },
  keybinds: {
    transport: "Space",
    save: "Ctrl+S",
    undo: "Ctrl+Z",
    redo: "Ctrl+Shift+Z",
    split: "S",
  },
  rendering: {
    format: "wav",
    bitDepth: 24,
    normalize: false,
    realtime: false,
  },
  plugins: {
    scanOnStartup: false,
    vstFolders: [],
    enableExtensions: true,
  },
  ai: {
    remasterProvider: "Not configured",
    stemSplitProvider: "Not configured",
    allowCloudAudio: false,
  },
  experimental: {
    nativeVstHost: false,
    detachableWindows: false,
    webMidi: false,
  },
};

const safeArray = (value) => Array.isArray(value) ? value : [];
const fallbackUid = () => Math.random().toString(36).slice(2, 9);
const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeMediaAsset = (item, makeId) => {
  const asset = item && typeof item === "object" ? item : {};
  return {
    ...asset,
    id: asset.id || makeId(),
    kind: asset.kind || "audio",
    name: asset.name || "Untitled audio",
    format: asset.format || (asset.name?.split(".").pop() || "unknown").toLowerCase(),
  };
};

function estimateDataUrlBytes(dataUrl) {
  if (typeof dataUrl !== "string") return 0;
  const payload = dataUrl.includes(",") ? dataUrl.split(",").pop() : dataUrl;
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor(payload.length * 3 / 4) - padding);
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${Math.round(bytes / (1024 * 1024) * 10) / 10} MB`;
}

export function validateProjectMedia(project, options = {}) {
  const warnAt = options.embedWarnBytes || MEDIA_EMBED_WARN_BYTES;
  const warnings = [];
  const media = safeArray(project?.media);
  const mediaIds = new Set(media.map(item => item?.id).filter(Boolean));

  for (const track of safeArray(project?.tracks)) {
    for (const clip of safeArray(track?.clips)) {
      if (!clip?.audio) continue;
      const clipName = clip.name || "Untitled";
      const trackName = track?.name ? ` on "${track.name}"` : "";
      if (!clip.mediaId) warnings.push(`Audio clip "${clipName}"${trackName} has no media asset ID.`);
      else if (!mediaIds.has(clip.mediaId)) warnings.push(`Audio clip "${clipName}"${trackName} references missing media ${clip.mediaId}.`);
    }
  }

  for (const item of media) {
    if (!item?.id) warnings.push(`Media asset "${item?.name || "Untitled audio"}" has no asset ID.`);
    if (item?.kind && item.kind !== "audio") continue;
    const name = item?.name || item?.id || "Untitled audio";
    if (item?.waveform && !Array.isArray(item.waveform)) warnings.push(`Media asset "${name}" has invalid waveform preview data.`);
    if (!item?.dataUrl) {
      warnings.push(`Media asset "${name}" has no embedded audio data and may not survive save/load.`);
      continue;
    }
    const embeddedBytes = estimateDataUrlBytes(item.dataUrl);
    if (embeddedBytes > warnAt) warnings.push(`Media asset "${name}" embeds ${formatBytes(embeddedBytes)} of audio data; large alpha projects may save slowly.`);
  }

  return warnings;
}

export function mediaWarningSummary(warnings) {
  const count = safeArray(warnings).length;
  if (!count) return "";
  return `${count} media warning${count===1?"":"s"}: ${warnings[0]}`;
}

export function mergeSettings(settings) {
  const merge = (base, patch) => {
    const out = Array.isArray(base) ? [...base] : { ...base };
    Object.keys(patch || {}).forEach(k => {
      if (patch[k] && typeof patch[k] === "object" && !Array.isArray(patch[k]) && base[k]) out[k] = merge(base[k], patch[k]);
      else out[k] = patch[k];
    });
    return out;
  };
  return merge(DEFAULT_DAW_SETTINGS, settings || {});
}

export function serializeProjectState(state) {
  return {
    version: PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    app: "The DAW",
    transport: {
      bpm: state.bpm,
      sig: state.sig || [4, 4],
      position: state.position || 0,
      loop: state.loop,
      metro: state.metro,
      snap: state.snap,
    },
    music: {
      scale: state.scale,
      fold: state.fold,
    },
    mixer: {
      masterVol: state.masterVol,
    },
    settings: state.settings || DEFAULT_DAW_SETTINGS,
    tracks: cloneData(state.tracks || []),
    media: state.media || [],
  };
}

export function migrateProject(project, options = {}) {
  if (!project || typeof project !== "object") throw new Error("Invalid project file.");
  const makeId = options.uid || fallbackUid;
  const migrated = cloneData(project);
  let version = Number(migrated.version || 0);

  if (version < 1) {
    migrated.transport = migrated.transport || {
      bpm: migrated.bpm,
      sig: migrated.sig || [4, 4],
      position: migrated.position || 0,
      loop: migrated.loop,
      metro: migrated.metro,
      snap: migrated.snap,
    };
    migrated.music = migrated.music || { scale: migrated.scale, fold: migrated.fold };
    migrated.mixer = migrated.mixer || { masterVol: migrated.masterVol };
    migrated.tracks = safeArray(migrated.tracks);
    migrated.media = safeArray(migrated.media);
    version = 1;
  }

  if (version < 2) {
    migrated.tracks = safeArray(migrated.tracks).map(track => ({
      ...track,
      clips: safeArray(track.clips).map(clip => ({
        ...clip,
        id: clip.id || makeId(),
        name: clip.name || "Clip",
        start: Number.isFinite(+clip.start) ? +clip.start : 0,
        len: Math.max(1, Number.isFinite(+clip.len) ? +clip.len : 1),
      })),
    }));
    version = 2;
  }

  migrated.media = safeArray(migrated.media).map(item => normalizeMediaAsset(item, makeId));
  migrated.tracks = safeArray(migrated.tracks).map(track => ({
    ...track,
    clips: safeArray(track.clips),
  }));
  const warnings = validateProjectMedia(migrated, options);

  migrated.version = PROJECT_VERSION;
  migrated.migration = {
    fromVersion: Number(project.version || 0),
    toVersion: PROJECT_VERSION,
    migratedAt: new Date().toISOString(),
    warnings,
  };
  return migrated;
}

export function hydrateProjectData(project, deps = {}) {
  project = migrateProject(project, deps);
  const clamp = deps.clamp || clampNumber;
  const trackKinds = deps.trackKinds || {};
  const makeFxChain = deps.defaultFxChain || (() => []);
  const makeInstrument = deps.defaultInstrumentState || (() => null);
  const t = project.transport || {};
  const m = project.music || {};
  const mix = project.mixer || {};

  return {
    tracks: cloneData(project.tracks || []).map(track => ({
      ...track,
      type: track.type || trackKinds[track.kind]?.type || "instrument",
      fxChain: track.fxChain || makeFxChain(track.kind),
      instrument: track.instrument || makeInstrument(track.kind),
    })),
    bpm: clamp(Math.round(t.bpm || 124), 40, 250),
    position: Math.max(0, +(t.position || 0)),
    loop: t.loop || { on:true, start:0, end:8 },
    metro: !!t.metro,
    snap: t.snap !== false,
    scale: m.scale || { root:"C", name:"Minor" },
    fold: !!m.fold,
    masterVol: typeof mix.masterVol === "number" ? clamp(mix.masterVol, 0, 1) : 0.85,
    settings: mergeSettings(project.settings),
    media: project.media || [],
    _warnings: project.migration?.warnings || [],
  };
}

export function projectSummary(project) {
  const p = migrateProject(project);
  const trackCount = safeArray(p.tracks).length;
  const mediaCount = safeArray(p.media).length;
  const savedAt = p.savedAt ? new Date(p.savedAt).toLocaleString() : "unsaved";
  return `${trackCount} track${trackCount===1?"":"s"}, ${mediaCount} media asset${mediaCount===1?"":"s"}, saved ${savedAt}`;
}
