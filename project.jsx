/* ============================================================
   THE DAW - project schema, autosave, import/export helpers
   ============================================================ */

import {
  PROJECT_AUTOSAVE_KEY,
  PROJECT_SETTINGS_KEY,
  PROJECT_VERSION,
  DEFAULT_DAW_SETTINGS,
  cloneData,
  hydrateProjectData,
  mediaWarningSummary,
  mergeSettings,
  migrateProject,
  projectSummary,
  serializeProjectState,
  validateProjectMedia,
} from "./src/projectModel.js";

export {
  PROJECT_AUTOSAVE_KEY,
  PROJECT_SETTINGS_KEY,
  PROJECT_VERSION,
  DEFAULT_DAW_SETTINGS,
  cloneData,
  mediaWarningSummary,
  mergeSettings,
  migrateProject,
  projectSummary,
  validateProjectMedia,
};

export const ProjectIO = {
  serialize(state) {
    return serializeProjectState(state);
  },
  hydrate(project) {
    return hydrateProjectData(project, {
      uid,
      clamp,
      trackKinds:TRACK_KINDS,
      defaultFxChain,
      defaultInstrumentState,
    });
  },
  mergeSettings(settings) {
    return mergeSettings(settings);
  },
  validateMedia(project) {
    return validateProjectMedia(project);
  },
  mediaWarningSummary(warnings) {
    return mediaWarningSummary(warnings);
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
