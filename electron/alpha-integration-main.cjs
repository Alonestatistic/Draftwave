const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");

const root = path.join(__dirname, "..");
const builtHtml = path.join(root, "dist", "The DAW.html");

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitFor(win, expression, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await win.webContents.executeJavaScript(expression, true).catch(() => false);
    if (result) return result;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function run() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "the-daw-alpha-"));
  const savePath = path.join(tmpDir, "integration-save.dawproject.json");
  ipcMain.handle("project:save", async (_event, payload) => {
    if (!payload?.path) return { canceled:true, error:"Missing project path" };
    await fs.writeFile(payload.path, payload.content, "utf8");
    return { canceled:false, path:payload.path };
  });

  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    show: false,
    backgroundColor: "#05060a",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const failures = [];
  win.webContents.on("console-message", (_event, _level, message) => {
    if (/failed|error/i.test(message)) failures.push(`renderer console: ${message}`);
  });

  await win.loadFile(builtHtml);
  await waitFor(win, "Boolean(window.ProjectIO && window.RenderCore && document.querySelector('header'))");

  const boot = await win.webContents.executeJavaScript(`(() => ({
    title: document.title,
    hasHeader: Boolean(document.querySelector("header")),
    notice: document.querySelector("header")?.innerText || "",
    tracks: window.ProjectIO.hydrate(window.ProjectIO.serialize({
      tracks: [],
      bpm: 124,
      sig: [4,4],
      position: 0,
      loop: { on:true, start:0, end:8 },
      metro: false,
      snap: true,
      scale: { root:"C", name:"Minor" },
      fold: false,
      masterVol: 0.85,
      settings: window.ProjectIO.loadSettings(),
      media: []
    })).tracks.length
  }))()`, true);

  if (boot.title !== "The DAW") failures.push(`unexpected title ${boot.title}`);
  if (!boot.hasHeader) failures.push("renderer header did not mount");
  if (boot.tracks !== 0) failures.push("empty project roundtrip produced tracks");

  const menu = await win.webContents.executeJavaScript(`(async () => {
    const btn = document.querySelector("header button[title='Project menu']");
    if (!btn) return { opened:false, reason:"missing project menu button" };
    btn.dispatchEvent(new MouseEvent("click", { bubbles:true, clientX:24, clientY:24 }));
    await new Promise(resolve => setTimeout(resolve, 100));
    const labels = [...document.querySelectorAll(".ctx-item")].map(el => el.textContent.trim());
    return { opened: labels.length > 0, labels };
  })()`, true);
  if (!menu.opened) failures.push(menu.reason || "project menu did not open");
  for (const label of ["Open Project...", "Save Project", "Export Mixdown WAV"]) {
    if (!menu.labels?.some(text => text.includes(label))) failures.push(`project menu missing ${label}`);
  }

  const projectJson = await win.webContents.executeJavaScript(`JSON.stringify(window.ProjectIO.serialize({
    tracks: [{ id:"track_1", kind:"audio", type:"audio", name:"Audio", vol:0.8, pan:0, clips:[{ id:"clip_1", audio:true, mediaId:"media_1", start:0, len:1, name:"Clip" }] }],
    bpm: 120,
    sig: [4,4],
    position: 0,
    loop: { on:true, start:0, end:4 },
    metro: false,
    snap: true,
    scale: { root:"C", name:"Minor" },
    fold: false,
    masterVol: 0.85,
    settings: window.ProjectIO.loadSettings(),
    media: [{ id:"media_1", kind:"audio", name:"clip.wav", format:"wav", dataUrl:"data:audio/wav;base64,AAAA" }]
  }))`, true);
  const saveResult = await win.webContents.executeJavaScript(`window.dawNative.saveProject(${JSON.stringify({ path:savePath, content:projectJson })})`, true);
  if (saveResult?.path !== savePath) failures.push("native saveProject did not return the requested path");

  const saved = JSON.parse(await fs.readFile(savePath, "utf8"));
  if (saved.version !== 2) failures.push(`saved project version was ${saved.version}`);
  if (saved.media?.[0]?.dataUrl !== "data:audio/wav;base64,AAAA") failures.push("saved project did not preserve embedded media data");

  const autosaveRestore = await win.webContents.executeJavaScript(`(async () => {
    const brokenAutosave = window.ProjectIO.serialize({
      tracks: [{
        id:"track_autosave",
        kind:"audio",
        type:"audio",
        name:"Recovered Audio",
        color:"var(--t7)",
        mute:false,
        solo:false,
        vol:0.8,
        pan:0,
        clips:[{ id:"clip_missing", audio:true, mediaId:"missing_media", start:0, len:2, name:"Missing Take" }]
      }],
      bpm: 118,
      sig: [4,4],
      position: 0,
      loop: { on:true, start:0, end:4 },
      metro: false,
      snap: true,
      scale: { root:"C", name:"Minor" },
      fold: false,
      masterVol: 0.85,
      settings: window.ProjectIO.loadSettings(),
      media: []
    });
    window.ProjectIO.autosave(brokenAutosave);
    return Boolean(window.ProjectIO.loadAutosave());
  })()`, true);
  if (!autosaveRestore) failures.push("could not seed autosave project");

  await win.reload();
  await waitFor(win, "Boolean(document.body.innerText.includes('Autosave recovery available'))");
  const restored = await win.webContents.executeJavaScript(`(async () => {
    const restore = [...document.querySelectorAll("button")].find(button => button.textContent.trim() === "Restore");
    if (!restore) return { restored:false, reason:"restore button missing" };
    restore.click();
    await new Promise(resolve => setTimeout(resolve, 250));
    const text = document.body.innerText;
    return {
      restored: text.includes("Restored autosave"),
      hasWarning: text.includes("Project media warning"),
      hasMissingClip: text.includes("MISSING"),
      autosaveCleared: !window.ProjectIO.loadAutosave(),
      warningSummary: text.includes("missing media missing_media")
    };
  })()`, true);
  if (!restored.restored) failures.push(restored.reason || "autosave restore notice did not appear");
  if (!restored.hasWarning) failures.push("restored broken autosave did not show project media warning");
  if (!restored.hasMissingClip) failures.push("restored broken autosave did not mark the clip as MISSING");
  if (!restored.autosaveCleared) failures.push("autosave was not cleared after restore");
  if (!restored.warningSummary) failures.push("media warning summary did not mention missing media ID");

  const render = await win.webContents.executeJavaScript(`(async () => {
    const project = window.ProjectIO.serialize({
      tracks: [{ id:"track_1", kind:"keys", type:"instrument", name:"Keys", vol:0.8, pan:0, clips:[{ id:"clip_1", start:0, len:1, name:"Notes", notes:[{ id:"note_1", p:60, s:0, l:1, v:0.8 }] }] }],
      bpm: 120,
      sig: [4,4],
      position: 0,
      loop: { on:true, start:0, end:4 },
      metro: false,
      snap: true,
      scale: { root:"C", name:"Minor" },
      fold: false,
      masterVol: 0.85,
      settings: window.ProjectIO.loadSettings(),
      media: []
    });
    const bytes = await window.RenderCore.renderWav(project, { sampleRate: 8000 });
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const wave = String.fromCharCode(...bytes.slice(8, 12));
    return { length: bytes.length, riff, wave };
  })()`, true);
  if (render.riff !== "RIFF" || render.wave !== "WAVE" || render.length < 44) failures.push("WAV render did not produce a valid RIFF/WAVE file");

  win.destroy();
  await fs.rm(tmpDir, { recursive:true, force:true });

  if (failures.length) {
    console.error("Alpha integration failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    app.exit(1);
    return;
  }

  console.log("Alpha integration passed.");
  app.exit(0);
}

app.whenReady().then(() => run().catch(error => {
  console.error("Alpha integration failed:");
  console.error(error?.stack || error?.message || error);
  app.exit(1);
}));

app.on("window-all-closed", () => {});
