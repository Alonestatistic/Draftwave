export const ALPHA4_PHASE = "Alpha 4";

export const ALPHA4_TEST_WORKFLOWS = [
  { id:"boot", label:"Boot packaged app" },
  { id:"save-load", label:"Save, close, reopen, and continue editing" },
  { id:"autosave", label:"Restore or discard autosave on launch" },
  { id:"media-persistence", label:"Import audio, save, reopen, and verify media survives" },
  { id:"recording", label:"Record microphone take where permissions allow" },
  { id:"export-wav", label:"Export WAV and play it in a desktop player" },
  { id:"musical-tools", label:"Exercise piano roll, sampler/drum rack, keybinds, and mixer FX" },
  { id:"reporting", label:"Export issue report and tester feedback report" },
];

export const DATA_LOSS_STOP_SHIP_AREAS = [
  { id:"project-save-load", label:"Project save/load" },
  { id:"autosave-recovery", label:"Autosave recovery" },
  { id:"media-persistence", label:"Imported/recorded media persistence" },
  { id:"wav-export", label:"WAV export integrity" },
];

const STOP_SHIP_PATTERNS = [
  { area:"project-save-load", pattern:/\b(save failed|open failed|load failed|invalid project|corrupt|data[- ]loss)\b/i },
  { area:"autosave-recovery", pattern:/\b(autosave.*failed|restore autosave.*failed|autosave.*corrupt)\b/i },
  { area:"media-persistence", pattern:/\b(no embedded audio data|missing media|no media asset id|media.*lost|recording.*lost)\b/i },
  { area:"wav-export", pattern:/\b(render failed|export failed|wav.*failed|mixdown.*failed|wav.*silent)\b/i },
];

function makeFlag(area, source, message) {
  const meta = DATA_LOSS_STOP_SHIP_AREAS.find(item => item.id === area) || { id:area, label:area };
  return { area:meta.id, label:meta.label, source, message };
}

export function evaluateAlpha4StopShip({ mediaWarnings = [], recentErrors = [], openRisks = [] } = {}) {
  const flags = [];

  for (const warning of mediaWarnings) {
    const text = String(warning || "");
    for (const item of STOP_SHIP_PATTERNS.filter(p => p.area === "media-persistence")) {
      if (item.pattern.test(text)) flags.push(makeFlag(item.area, "mediaWarning", text));
    }
  }

  for (const entry of recentErrors) {
    const message = String(entry?.message || entry || "");
    for (const item of STOP_SHIP_PATTERNS) {
      if (item.pattern.test(message)) flags.push(makeFlag(item.area, entry?.kind || "recentError", message));
    }
  }

  for (const risk of openRisks) {
    const area = risk?.area || "project-save-load";
    const message = String(risk?.message || risk || "");
    if (message) flags.push(makeFlag(area, risk?.source || "openRisk", message));
  }

  const deduped = [];
  const seen = new Set();
  for (const flag of flags) {
    const key = `${flag.area}:${flag.source}:${flag.message}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(flag);
    }
  }

  return {
    ok: deduped.length === 0,
    flags: deduped,
    checkedAreas: DATA_LOSS_STOP_SHIP_AREAS.map(item => item.id),
  };
}

export function buildAlpha4FeedbackReport({
  app = {},
  platform = "",
  projectSummary = "",
  mediaWarnings = [],
  capabilities = [],
  recentErrors = [],
  testerNotes = "",
  testResults = {},
} = {}) {
  const stopShip = evaluateAlpha4StopShip({ mediaWarnings, recentErrors });
  return {
    reportVersion: 1,
    alphaPhase: ALPHA4_PHASE,
    createdAt: new Date().toISOString(),
    app,
    platform: platform || app.platform || "unknown",
    knownLimitationsDoc: "docs/KNOWN_LIMITATIONS.md",
    releaseChecklistDoc: "docs/RELEASE_CHECKLIST.md",
    projectSummary,
    testerNotes,
    workflows: ALPHA4_TEST_WORKFLOWS.map(workflow => ({
      ...workflow,
      result: testResults[workflow.id] || "not-run",
    })),
    capabilities,
    mediaWarnings,
    recentErrors,
    stopShip,
    testerGuidance: "Do not ship or continue broad testing when stopShip.ok is false.",
  };
}
