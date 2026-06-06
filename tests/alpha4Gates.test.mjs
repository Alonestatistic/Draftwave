import test from "node:test";
import assert from "node:assert/strict";

import {
  ALPHA4_TEST_WORKFLOWS,
  buildAlpha4FeedbackReport,
  evaluateAlpha4StopShip,
} from "../src/alpha4Gates.js";

test("evaluateAlpha4StopShip passes with clean feedback inputs", () => {
  const result = evaluateAlpha4StopShip({
    mediaWarnings: [],
    recentErrors: [{ kind:"caught", message:"MIDI unavailable: permission denied" }],
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.flags, []);
  assert.ok(result.checkedAreas.includes("project-save-load"));
});

test("evaluateAlpha4StopShip flags data-loss warning categories", () => {
  const result = evaluateAlpha4StopShip({
    mediaWarnings: [
      'Audio clip "No Asset" on "Vox" has no media asset ID.',
      'Audio clip "Lost Ref" on "Vox" references missing media media_1.',
    ],
    recentErrors: [{ kind:"caught", message:"Render failed: offline mixdown failed" }],
  });

  assert.equal(result.ok, false);
  assert.equal(result.flags.length, 3);
  assert.equal(result.flags[0].area, "media-persistence");
  assert.equal(result.flags[1].area, "media-persistence");
  assert.equal(result.flags[2].area, "wav-export");
});

test("buildAlpha4FeedbackReport includes workflows and stop-ship status", () => {
  const report = buildAlpha4FeedbackReport({
    app: { version:"0.1.0", alphaPhase:"Alpha 4" },
    projectSummary: "2 tracks, 1 media asset",
    testResults: { boot:"pass", "save-load":"pass" },
  });

  assert.equal(report.alphaPhase, "Alpha 4");
  assert.equal(report.stopShip.ok, true);
  assert.equal(report.workflows.length, ALPHA4_TEST_WORKFLOWS.length);
  assert.equal(report.workflows.find(w => w.id === "boot").result, "pass");
  assert.equal(report.workflows.find(w => w.id === "export-wav").result, "not-run");
});
