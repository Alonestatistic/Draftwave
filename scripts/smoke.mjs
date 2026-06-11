import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const file = (path) => join(root, path);
const failures = [];

async function mustExist(path) {
  try {
    await stat(file(path));
  } catch {
    failures.push(`${path} is missing`);
  }
}

async function mustContain(path, patterns) {
  let text = "";
  try {
    text = await readFile(file(path), "utf8");
  } catch {
    failures.push(`${path} is missing`);
    return;
  }
  for (const pattern of patterns) {
    if (!pattern.test(text)) failures.push(`${path} does not match ${pattern}`);
  }
}

const pkg = JSON.parse(await readFile(file("package.json"), "utf8"));

if (pkg.main !== "electron/main.cjs") failures.push("package.json main must point at electron/main.cjs");
for (const script of ["build", "start", "smoke", "test", "check", "release:manifest", "package:win", "dist:win"]) {
  if (!pkg.scripts?.[script]) failures.push(`package.json is missing npm script ${script}`);
}

await Promise.all([
  mustExist("Draftwave.html"),
  mustExist("electron/main.cjs"),
  mustExist("electron/preload.cjs"),
  mustContain("src/main.jsx", [/import\("\.\.\/project\.jsx"\)/, /boot\(\)\.catch/]),
  mustContain("src/projectModel.js", [/export function migrateProject/, /export function serializeProjectState/, /export function hydrateProjectData/, /export function validateProjectMedia/]),
  mustContain("project.jsx", [/export const ProjectIO/, /validateMedia/, /clearAutosave/, /autosaveInfo/]),
  mustContain("tests/projectModel.test.mjs", [/serializeProjectState/, /validateProjectMedia/, /waveform preview data/]),
  mustContain("audiocore.jsx", [/export const AudioCore/, /export const MidiCore/]),
  mustContain("capabilities.jsx", [/export const CapabilityRegistry/, /Available/, /Experimental/]),
  mustContain("app.jsx", [/Autosave recovery available/, /Report Issue/, /AppErrorBoundary/]),
  mustContain("electron/main.cjs", [/diagnostics:saveIssueReport/, /export:saveBinary/, /project:open/, /app:metadata/, /setAboutPanelOptions/]),
  mustContain("electron/preload.cjs", [/getAppMetadata/, /saveBinary/, /saveIssueReport/]),
  mustContain("scripts/write-release-manifest.mjs", [/release-manifest\.json/, /RELEASE_NOTES\.md/, /Draftwave/]),
  mustContain("scripts/copy-win-installer.mjs", [/Draftwave-Setup-/, /release/]),
  mustContain("docs/KNOWN_LIMITATIONS.md", [/Draftwave/, /WAV mixdown/, /Known limitations/]),
  mustContain("docs/RELEASE_NOTES.md", [/Windows installer/, /Current Scope/]),
  mustContain("docs/RELEASE_CHECKLIST.md", [/npm run check/, /npm run package:win/, /Windows Packaging Gate/]),
]);

if (failures.length) {
  console.error("Smoke check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Smoke check passed.");
