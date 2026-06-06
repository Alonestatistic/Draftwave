/* ============================================================
   THE DAW - project schema, autosave, import/export helpers
   ============================================================ */

export const PROJECT_VERSION = 2;
const PROJECT_AUTOSAVE_KEY = "thedaw.autosave.v1";
const PROJECT_SETTINGS_KEY = "thedaw.settings.v1";

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

const normalizeMediaAsset = (item) => ({
  ...item,
  id: item.id || uid(),
  kind: item.kind || "audio",
  name: item.name || "Untitled audio",
  format: item.format || (item.name?.split(".").pop() || "unknown").toLowerCase(),
});

export function migrateProject(project) {
  if (!project || typeof project !== "object") throw new Error("Invalid project file.");
  const migrated = cloneData(project);
  const warnings = [];
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
    migrated.media = safeArray(migrated.media).map(normalizeMediaAsset);
    const mediaIds = new Set(migrated.media.map(item => item.id));
    migrated.tracks = safeArray(migrated.tracks).map(track => ({
      ...track,
      clips: safeArray(track.clips).map(clip => {
        if (clip.audio && clip.mediaId && !mediaIds.has(clip.mediaId)) {
          warnings.push(`Audio clip "${clip.name || "Untitled"}" references missing media ${clip.mediaId}.`);
        }
        return {
          ...clip,
          id: clip.id || uid(),
          name: clip.name || "Clip",
          start: Number.isFinite(+clip.start) ? +clip.start : 0,
          len: Math.max(1, Number.isFinite(+clip.len) ? +clip.len : 1),
        };
      }),
    }));
    version = 2;
  }

  migrated.version = PROJECT_VERSION;
  migrated.migration = {
    fromVersion: Number(project.version || 0),
    toVersion: PROJECT_VERSION,
    migratedAt: new Date().toISOString(),
    warnings,
  };
  return migrated;
}

export function projectSummary(project) {
  const p = migrateProject(project);
  const trackCount = safeArray(p.tracks).length;
  const mediaCount = safeArray(p.media).length;
  const savedAt = p.savedAt ? new Date(p.savedAt).toLocaleString() : "unsaved";
  return `${trackCount} track${trackCount===1?"":"s"}, ${mediaCount} media asset${mediaCount===1?"":"s"}, saved ${savedAt}`;
}

export const ProjectIO = {
  serialize(state) {
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
  },
  hydrate(project) {
    project = migrateProject(project);
    const t = project.transport || {};
    const m = project.music || {};
    const mix = project.mixer || {};
    return {
      tracks: cloneData(project.tracks || []).map(t => ({
        ...t,
        type:t.type || TRACK_KINDS[t.kind]?.type || "instrument",
        fxChain:t.fxChain || defaultFxChain(t.kind),
        instrument:t.instrument || defaultInstrumentState(t.kind),
      })),
      bpm: clamp(Math.round(t.bpm || 124), 40, 250),
      position: Math.max(0, +(t.position || 0)),
      loop: t.loop || { on:true, start:0, end:8 },
      metro: !!t.metro,
      snap: t.snap !== false,
      scale: m.scale || { root:"C", name:"Minor" },
      fold: !!m.fold,
      masterVol: typeof mix.masterVol === "number" ? clamp(mix.masterVol, 0, 1) : 0.85,
      settings: ProjectIO.mergeSettings(project.settings),
      media: project.media || [],
      _warnings: project.migration?.warnings || [],
    };
  },
  mergeSettings(settings) {
    const merge = (base, patch) => {
      const out = Array.isArray(base) ? [...base] : { ...base };
      Object.keys(patch || {}).forEach(k => {
        if (patch[k] && typeof patch[k] === "object" && !Array.isArray(patch[k]) && base[k]) out[k] = merge(base[k], patch[k]);
        else out[k] = patch[k];
      });
      return out;
    };
    return merge(DEFAULT_DAW_SETTINGS, settings || {});
  },
  loadSettings() {
    try { return ProjectIO.mergeSettings(JSON.parse(localStorage.getItem(PROJECT_SETTINGS_KEY) || "{}")); }
    catch (_) { return ProjectIO.mergeSettings({}); }
  },
  saveSettings(settings) {
    const merged = ProjectIO.mergeSettings(settings);
    try { localStorage.setItem(PROJECT_SETTINGS_KEY, JSON.stringify(merged)); } catch (_) {}
    if (window.dawNative?.saveSettings) window.dawNative.saveSettings(merged).catch(() => {});
    return merged;
  },
  autosave(project) {
    try { localStorage.setItem(PROJECT_AUTOSAVE_KEY, JSON.stringify(project)); return true; }
    catch (_) { return false; }
  },
  loadAutosave() {
    try {
      const raw = localStorage.getItem(PROJECT_AUTOSAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  },
  clearAutosave() {
    try { localStorage.removeItem(PROJECT_AUTOSAVE_KEY); return true; }
    catch (_) { return false; }
  },
  autosaveInfo() {
    const project = ProjectIO.loadAutosave();
    if (!project) return null;
    try { return { project, summary:projectSummary(project) }; }
    catch (_) { return { project, summary:"Autosave snapshot found" }; }
  },
  async saveAs(project) {
    const content = JSON.stringify(project, null, 2);
    if (window.dawNative?.saveProjectAs) return window.dawNative.saveProjectAs({ content, suggestedName:"Untitled.dawproject.json" });
    const blob = new Blob([content], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "Untitled.dawproject.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { canceled:false, path:null };
  },
  async save(project, path) {
    const content = JSON.stringify(project, null, 2);
    if (path && window.dawNative?.saveProject) return window.dawNative.saveProject({ path, content });
    return ProjectIO.saveAs(project);
  },
  async downloadJson(data, name) {
    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name || "download.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { canceled:false, path:null };
  },
  async open() {
    if (window.dawNative?.openProject) {
      const res = await window.dawNative.openProject();
      if (res?.canceled) return res;
      return { ...res, project:migrateProject(JSON.parse(res.content)) };
    }
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,.dawproject.json,application/json";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return resolve({ canceled:true });
        const reader = new FileReader();
        reader.onload = () => {
          try { resolve({ canceled:false, path:file.name, project:migrateProject(JSON.parse(String(reader.result))) }); }
          catch (error) { resolve({ canceled:true, error:String(error.message || error) }); }
        };
        reader.onerror = () => resolve({ canceled:true, error:"Unable to read project file." });
        reader.readAsText(file);
      };
      input.click();
    });
  },
};

Object.assign(window, { PROJECT_VERSION, ProjectIO, DEFAULT_DAW_SETTINGS, PROJECT_AUTOSAVE_KEY, PROJECT_SETTINGS_KEY, cloneData });
