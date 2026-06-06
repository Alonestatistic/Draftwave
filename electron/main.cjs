const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("fs/promises");
const path = require("path");
const { fork } = require("child_process");

const isDev = !app.isPackaged;
const devUrl = "http://127.0.0.1:5173/The%20DAW.html";
const builtHtml = path.join(__dirname, "..", "dist", "The DAW.html");
const legacyHtml = path.join(__dirname, "..", "The DAW.html");

function createWindow() {
  const win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    title: "The DAW",
    backgroundColor: "#05060a",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    win.loadURL(devUrl).catch(() => win.loadFile(builtHtml).catch(() => win.loadFile(legacyHtml)));
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(builtHtml);
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(["media", "midi", "midiSysex"].includes(permission));
  });

  return win;
}

function createPanelWindow(panel, state = {}) {
  const win = new BrowserWindow({
    width: state.width || 980,
    height: state.height || 680,
    minWidth: 520,
    minHeight: 360,
    title: `The DAW - ${panel}`,
    backgroundColor: "#05060a",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  const hash = `#panel=${encodeURIComponent(panel)}`;
  if (isDev) win.loadURL(`${devUrl}${hash}`).catch(() => win.loadFile(builtHtml, { hash }).catch(() => win.loadFile(legacyHtml, { hash })));
  else win.loadFile(builtHtml, { hash });
  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("project:saveAs", async (_event, payload) => {
  const result = await dialog.showSaveDialog({
    title: "Save The DAW Project",
    defaultPath: payload?.suggestedName || "Untitled.dawproject.json",
    filters: [
      { name: "The DAW Project", extensions: ["dawproject.json", "json"] },
      { name: "JSON", extensions: ["json"] },
    ],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  await fs.writeFile(result.filePath, payload.content, "utf8");
  return { canceled: false, path: result.filePath };
});

ipcMain.handle("project:save", async (_event, payload) => {
  if (!payload?.path) return { canceled: true, error: "Missing project path" };
  await fs.writeFile(payload.path, payload.content, "utf8");
  return { canceled: false, path: payload.path };
});

ipcMain.handle("project:open", async () => {
  const result = await dialog.showOpenDialog({
    title: "Open The DAW Project",
    properties: ["openFile"],
    filters: [
      { name: "The DAW Project", extensions: ["dawproject.json", "json"] },
      { name: "JSON", extensions: ["json"] },
    ],
  });
  if (result.canceled || !result.filePaths?.[0]) return { canceled: true };
  const filePath = result.filePaths[0];
  const content = await fs.readFile(filePath, "utf8");
  return { canceled: false, path: filePath, content };
});

ipcMain.handle("settings:save", async (_event, settings) => {
  const dir = path.join(app.getPath("userData"), "settings");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, "renderer-settings.json");
  await fs.writeFile(filePath, JSON.stringify(settings, null, 2), "utf8");
  return { path: filePath };
});

ipcMain.handle("diagnostics:saveIssueReport", async (_event, payload) => {
  const result = await dialog.showSaveDialog({
    title: "Save The DAW Issue Report",
    defaultPath: payload?.suggestedName || "the-daw-issue-report.json",
    filters: [{ name: "Issue Report", extensions: ["json"] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  await fs.writeFile(result.filePath, payload.content, "utf8");
  return { canceled: false, path: result.filePath };
});

ipcMain.handle("capability:request", async (_event, capabilityId) => ({
  ok: false,
  capabilityId,
  message: "This capability is scaffolded in the UI and needs a native backend before it can run.",
}));

ipcMain.handle("window:openPanel", async (_event, payload) => {
  createPanelWindow(payload?.panel || "Panel", payload || {});
  return { ok: true };
});

ipcMain.handle("extensions:list", async () => {
  const dir = path.join(app.getPath("userData"), "extensions");
  await fs.mkdir(dir, { recursive: true });
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const extensions = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(dir, entry.name, "extension.json");
    try {
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
      extensions.push({ id: entry.name, path: path.dirname(manifestPath), manifest });
    } catch (_) {
      extensions.push({ id: entry.name, path: path.join(dir, entry.name), manifest: { name: entry.name, status: "invalid" } });
    }
  }
  return { dir, extensions };
});

ipcMain.handle("plugins:scanNative", async () => new Promise((resolve) => {
  const child = fork(path.join(__dirname, "plugin-host.cjs"), [], { stdio: ["ignore", "ignore", "ignore", "ipc"] });
  const timer = setTimeout(() => {
    child.kill();
    resolve({ ok:false, message:"Native plugin scan timed out.", plugins:[] });
  }, 3000);
  child.on("message", (msg) => {
    if (msg?.type === "scan:result") {
      clearTimeout(timer);
      child.kill();
      resolve(msg);
    }
  });
  child.on("error", (error) => {
    clearTimeout(timer);
    resolve({ ok:false, message:String(error.message || error), plugins:[] });
  });
  child.send({ type:"scan" });
}));

ipcMain.handle("export:saveBinary", async (_event, payload) => {
  const result = await dialog.showSaveDialog({
    title: payload?.title || "Export",
    defaultPath: payload?.defaultPath || "export.wav",
    filters: payload?.filters || [{ name: "Audio", extensions: ["wav"] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  const bytes = Buffer.from(payload.base64, "base64");
  await fs.writeFile(result.filePath, bytes);
  return { canceled: false, path: result.filePath };
});
