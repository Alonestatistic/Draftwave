const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dawNative", {
  platform: process.platform,
  appVersion: process.env.npm_package_version || "0.1.0",
  electronVersion: process.versions.electron,
  saveProjectAs: (payload) => ipcRenderer.invoke("project:saveAs", payload),
  saveProject: (payload) => ipcRenderer.invoke("project:save", payload),
  openProject: () => ipcRenderer.invoke("project:open"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  requestCapability: (capabilityId) => ipcRenderer.invoke("capability:request", capabilityId),
  openPanel: (payload) => ipcRenderer.invoke("window:openPanel", payload),
  listExtensions: () => ipcRenderer.invoke("extensions:list"),
  scanNativePlugins: () => ipcRenderer.invoke("plugins:scanNative"),
  saveBinary: (payload) => ipcRenderer.invoke("export:saveBinary", payload),
  saveIssueReport: (payload) => ipcRenderer.invoke("diagnostics:saveIssueReport", payload),
});
