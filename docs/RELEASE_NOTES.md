# Draftwave Private Alpha Release Notes

## 0.1.0 - Private Alpha

### Alpha 3 Packaging Pass

- Windows packaging now builds the renderer, writes release metadata, and then runs Electron Builder.
- Packaged issue reports include app version, Electron version, platform, alpha phase, release channel, packaged state, and user data path.
- Release artifacts include `dist/release-manifest.json` for internal build tracking.
- Release checklist now separates Alpha 2 musical-tool readiness from Alpha 3 packaging readiness.

### Alpha 4 Tester Readiness Pass

- Tester handoff now includes `docs/PRIVATE_ALPHA_TEST_PLAN.md` and a dedicated `Export Tester Feedback...` report.
- Tester-facing instructions now live in `docs/TESTER_INSTRUCTIONS.md`.
- Alpha 4 feedback reports include workflow placeholders, capability statuses, media warnings, recent errors, and a data-loss stop-ship evaluation.
- `npm run alpha4:stopship` checks release docs and stop-ship coverage before a tester build is handed off.
- The release channel remains private alpha; any stop-ship flag blocks broader rollout until triaged.

### Current Alpha Scope

- Creative sketch workflow with MIDI clips, simple audio clips, import, microphone recording where available, save/load, autosave recovery, undo/redo, and WAV mixdown.
- Piano roll editing, controller lanes, sampler/drum-rack scaffolding, editable shortcut settings, and honest mixer FX controls.
- Known limitations remain documented in `docs/KNOWN_LIMITATIONS.md`; do not use private alpha builds for irreplaceable sessions.
