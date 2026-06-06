import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DATA_LOSS_STOP_SHIP_AREAS,
  evaluateAlpha4StopShip,
} from "../src/alpha4Gates.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const file = (path) => join(root, path);
const failures = [];

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
if (pkg.build?.extraMetadata?.alphaPhase !== "Alpha 4") failures.push("package.json extraMetadata.alphaPhase must be Alpha 4");
if (!pkg.scripts?.["alpha4:stopship"]) failures.push("package.json is missing npm script alpha4:stopship");

await Promise.all([
  mustContain("docs/KNOWN_LIMITATIONS.md", [/Stable Alpha Promise/, /Tester Guidance/, /irreplaceable sessions/, /Report Issue/]),
  mustContain("docs/RELEASE_CHECKLIST.md", [/Alpha 4 Gate/, /Tester Feedback Gate/, /Data-Loss Stop Ship/, /save\/load/, /autosave recovery/, /media asset persistence/, /WAV export/]),
  mustContain("docs/PRIVATE_ALPHA_TEST_PLAN.md", [/Known Limitations/, /Stop-Ship/, /Export Tester Feedback/, /save\/load/, /WAV export/]),
  mustContain("docs/RELEASE_NOTES.md", [/Alpha 4 Tester Readiness Pass/, /stop-ship/, /tester feedback/i]),
  mustContain("app.jsx", [/exportTesterFeedback/, /buildTesterFeedbackReport/, /stopShip/]),
]);

const clean = evaluateAlpha4StopShip();
if (!clean.ok) failures.push("empty Alpha 4 stop-ship evaluation should pass");

const flagged = evaluateAlpha4StopShip({
  mediaWarnings: ['Audio clip "Loop" references missing media media_1.'],
});
if (flagged.ok || flagged.flags[0]?.area !== "media-persistence") failures.push("missing media must flag the media-persistence stop-ship area");

for (const area of DATA_LOSS_STOP_SHIP_AREAS) {
  if (!flagged.checkedAreas.includes(area.id)) failures.push(`stop-ship gate does not check ${area.id}`);
}

if (failures.length) {
  console.error("Alpha 4 stop-ship gate failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Alpha 4 stop-ship gate passed.");
