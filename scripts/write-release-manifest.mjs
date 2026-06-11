import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const file = (path) => join(root, path);

const pkg = JSON.parse(await readFile(file("package.json"), "utf8"));
const releaseNotes = await readFile(file("docs/RELEASE_NOTES.md"), "utf8");
const knownLimitations = await readFile(file("docs/KNOWN_LIMITATIONS.md"), "utf8");

const installerName = `Draftwave-Setup-${pkg.version}-x64.exe`;

const manifest = {
  app: "Draftwave",
  version: pkg.version,
  channel: "desktop",
  createdAt: new Date().toISOString(),
  package: {
    appId: pkg.build?.appId,
    productName: pkg.build?.productName,
    artifactName: pkg.build?.artifactName,
    target: pkg.build?.win?.target || [],
    publisherName: pkg.build?.win?.publisherName || null,
    installer: `release/${installerName}`,
  },
  docs: {
    releaseNotes: "docs/RELEASE_NOTES.md",
    knownLimitations: "docs/KNOWN_LIMITATIONS.md",
    releaseChecklist: "docs/RELEASE_CHECKLIST.md",
  },
  summary: {
    releaseNotesLines: releaseNotes.split(/\r?\n/).filter(Boolean).length,
    knownLimitationsLines: knownLimitations.split(/\r?\n/).filter(Boolean).length,
  },
};

await mkdir(file("dist"), { recursive: true });
await writeFile(file("dist/release-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
console.log(`Wrote dist/release-manifest.json for Draftwave ${pkg.version}`);
