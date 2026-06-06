import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_DAW_SETTINGS,
  PROJECT_VERSION,
  hydrateProjectData,
  mergeSettings,
  migrateProject,
  serializeProjectState,
} from "../src/projectModel.js";

const makeId = (() => {
  let i = 0;
  return () => `id_${++i}`;
})();

test("serializeProjectState writes the current project schema", () => {
  const project = serializeProjectState({
    bpm: 128,
    sig: [3, 4],
    position: 12,
    loop: { on:true, start:2, end:10 },
    metro: true,
    snap: false,
    scale: { root:"D", name:"Dorian" },
    fold: true,
    masterVol: 0.7,
    settings: { ...DEFAULT_DAW_SETTINGS, appearance:{ ...DEFAULT_DAW_SETTINGS.appearance, uiScale:1.2 } },
    tracks: [{ id:"track_1", kind:"keys", clips:[{ id:"clip_1", start:0, len:4, notes:[] }] }],
    media: [{ id:"media_1", kind:"audio", name:"loop.wav", dataUrl:"data:audio/wav;base64,AAAA" }],
  });

  assert.equal(project.version, PROJECT_VERSION);
  assert.equal(project.app, "The DAW");
  assert.deepEqual(project.transport, {
    bpm: 128,
    sig: [3, 4],
    position: 12,
    loop: { on:true, start:2, end:10 },
    metro: true,
    snap: false,
  });
  assert.equal(project.tracks[0].clips[0].id, "clip_1");
  assert.equal(project.media[0].id, "media_1");
  assert.match(project.savedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("migrateProject upgrades legacy flat projects into versioned shape", () => {
  const migrated = migrateProject({
    bpm: 96,
    loop: { on:false, start:0, end:4 },
    scale: { root:"A", name:"Minor" },
    masterVol: 1.4,
    tracks: [{ id:"track_1", kind:"audio", clips:[{ audio:true, mediaId:"missing_media", start:"bad", len:0 }] }],
    media: [{ name:"take.wav", dataUrl:"data:audio/wav;base64,AAAA" }],
  }, { uid:makeId });

  assert.equal(migrated.version, PROJECT_VERSION);
  assert.equal(migrated.transport.bpm, 96);
  assert.equal(migrated.music.scale.root, "A");
  assert.equal(migrated.media[0].kind, "audio");
  assert.equal(migrated.media[0].format, "wav");
  assert.equal(migrated.tracks[0].clips[0].name, "Clip");
  assert.equal(migrated.tracks[0].clips[0].start, 0);
  assert.equal(migrated.tracks[0].clips[0].len, 1);
  assert.equal(migrated.migration.fromVersion, 0);
  assert.match(migrated.migration.warnings[0], /missing media missing_media/);
});

test("hydrateProjectData clamps unsafe transport and mixer values", () => {
  const hydrated = hydrateProjectData({
    version: PROJECT_VERSION,
    transport: { bpm: 999, position:-12, snap:false },
    music: {},
    mixer: { masterVol: 4 },
    tracks: [{ id:"track_1", kind:"keys", clips:[] }],
    media: [],
  }, {
    trackKinds: { keys:{ type:"instrument" } },
    defaultFxChain: () => [{ id:"fx_1", type:"eq" }],
    defaultInstrumentState: () => ({ preset:"Init" }),
  });

  assert.equal(hydrated.bpm, 250);
  assert.equal(hydrated.position, 0);
  assert.equal(hydrated.snap, false);
  assert.equal(hydrated.masterVol, 1);
  assert.deepEqual(hydrated.tracks[0].fxChain, [{ id:"fx_1", type:"eq" }]);
  assert.deepEqual(hydrated.tracks[0].instrument, { preset:"Init" });
});

test("mergeSettings preserves defaults while applying nested patches", () => {
  const merged = mergeSettings({
    appearance: { uiScale:1.35 },
    project: { autosaveSeconds:30 },
    plugins: { vstFolders:["C:/VSTs"] },
  });

  assert.equal(merged.appearance.uiScale, 1.35);
  assert.equal(merged.appearance.theme, DEFAULT_DAW_SETTINGS.appearance.theme);
  assert.equal(merged.project.autosave, true);
  assert.equal(merged.project.autosaveSeconds, 30);
  assert.deepEqual(merged.plugins.vstFolders, ["C:/VSTs"]);
});

test("migrateProject preserves embedded media data urls for alpha save/load reliability", () => {
  const migrated = migrateProject({
    version: 1,
    tracks: [{ id:"track_1", kind:"audio", clips:[{ id:"clip_1", audio:true, mediaId:"media_1", start:0, len:2 }] }],
    media: [{ id:"media_1", name:"vox.webm", dataUrl:"data:audio/webm;base64,AAAA" }],
  });

  assert.equal(migrated.media[0].dataUrl, "data:audio/webm;base64,AAAA");
  assert.equal(migrated.media[0].format, "webm");
  assert.equal(migrated.migration.warnings.length, 0);
});
