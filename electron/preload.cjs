const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dawNative", {
  platform: process.platform,
  appVersion: process.env.npm_package_version || "0.1.0",
  electronVersion: process.versions.electron,
  getAppMetadata: () => ipcRenderer.invoke("app:metadata"),
  saveProjectAs: (payload) => ipcRenderer.invoke("project:saveAs", payload),
  saveProject: (payload) => ipcRenderer.invoke("project:save", payload),
  openProject: () => ipcRenderer.invoke("project:open"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  requestCapability: (capabilityId) => ipcRenderer.invoke("capability:request", capabilityId),
  openPanel: (payload) => ipcRenderer.invoke("window:openPanel", payload),
  listExtensions: () => ipcRenderer.invoke("extensions:list"),
  scanNativePlugins: () => ipcRenderer.invoke("plugins:scanNative"),
  pullOllamaModel: (payload) => ipcRenderer.invoke("ollama:pullModel", payload),
  onOllamaPullProgress: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("ollama:pullProgress", handler);
    return () => ipcRenderer.removeListener("ollama:pullProgress", handler);
  },
  saveBinary: (payload) => ipcRenderer.invoke("export:saveBinary", payload),
  saveIssueReport: (payload) => ipcRenderer.invoke("diagnostics:saveIssueReport", payload),
});
