import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const file = (path) => join(root, path);
const failures = [];

async function mustExist(path) {
  try { await stat(file(path)); }
  catch { failures.push(`${path} is missing`); }
}

async function mustContain(path, patterns) {
  let text = "";
  try { text = await readFile(file(path), "utf8"); }
  catch {
    failures.push(`${path} is missing`);
    return;
  }
  for (const pattern of patterns) {
    if (!pattern.test(text)) failures.push(`${path} does not match ${pattern}`);
  }
}

const pkg = JSON.parse(await readFile(file("package.json"), "utf8"));

if (pkg.main !== "electron/main.cjs") failures.push("package.json main must point at electron/main.cjs");
for (const script of ["build", "start", "smoke", "check"]) {
  if (!pkg.scripts?.[script]) failures.push(`package.json is missing npm script ${script}`);
}

await Promise.all([
  mustExist("The DAW.html"),
  mustExist("electron/main.cjs"),
  mustExist("electron/preload.cjs"),
  mustContain("src/main.jsx", [/import\("\.\.\/project\.jsx"\)/, /boot\(\)\.catch/]),
  mustContain("project.jsx", [/export const ProjectIO/, /export function migrateProject/, /clearAutosave/, /autosaveInfo/]),
  mustContain("audiocore.jsx", [/export const AudioCore/, /export const MidiCore/]),
  mustContain("capabilities.jsx", [/export const CapabilityRegistry/, /Available/, /Experimental/, /Needs backend/]),
  mustContain("app.jsx", [/Autosave recovery available/, /Report Issue/, /AppErrorBoundary/]),
  mustContain("electron/main.cjs", [/diagnostics:saveIssueReport/, /export:saveBinary/, /project:open/]),
  mustContain("docs/KNOWN_LIMITATIONS.md", [/VST hosting/, /SoundFont/, /Private Alpha/]),
  mustContain("docs/RELEASE_CHECKLIST.md", [/npm run check/, /Data-[Ll]oss/, /Windows/]),
]);

if (failures.length) {
  console.error("Alpha smoke check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Alpha smoke check passed.");
