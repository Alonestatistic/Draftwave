import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const releaseDir = join(root, "release");
const distDir = join(root, "dist");

const packageJson = JSON.parse(await import("node:fs/promises").then(fs => fs.readFile(join(root, "package.json"), "utf8")));
const targetName = `Draftwave-Setup-${packageJson.version}-x64.exe`;

async function findInstaller() {
  const candidates = [];
  for (const dir of [releaseDir, distDir]) {
    try {
      const entries = await readdir(dir);
      for (const entry of entries) {
        if (/^Draftwave-Setup-.*-x64\.exe$/i.test(entry) || /^draftwave-.*win-x64\.exe$/i.test(entry)) {
          const path = join(dir, entry);
          const info = await stat(path);
          candidates.push({ path, mtimeMs: info.mtimeMs });
        }
      }
    } catch {
      // Directory may not exist yet.
    }
  }
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0]?.path || null;
}

await mkdir(releaseDir, { recursive: true });
const installer = await findInstaller();
if (!installer) {
  console.error("No Windows installer found after electron-builder finished.");
  process.exit(1);
}

const targetPath = join(releaseDir, targetName);
await copyFile(installer, targetPath);
console.log(`Copied installer to release/${targetName}`);
