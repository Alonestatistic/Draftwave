# Private Alpha Release Checklist

## Required Commands

- `npm install`
- `npm run check`
- `npm run alpha4:stopship`
- `npm run release:manifest`
- `npm start`
- `npm run package:win`

## Alpha 0 Gate

- App boots through the Vite/Electron workflow.
- Renderer boot failures show an actionable error surface.
- Project save/load remains available in Electron and browser fallback modes.
- Autosave recovery is explicit on launch with Restore and Discard actions.
- Report Issue exports app version, platform, project summary, capability statuses, and recent error strings without private audio.
- Capability labels are visible and honest about Available, Experimental, Needs backend, and Unsupported states.

## Alpha 1 Gate

- Create a clean project, add MIDI clips, edit notes, arrange tracks, save, close, reopen, and continue editing.
- Import at least one WAV or MP3 file, save, reopen, and confirm the audio clip still references a media asset.
- Record a microphone take on a machine that grants access, save, reopen, and confirm the take remains in the media list.
- Export WAV and verify the file plays in a normal desktop audio player.
- Confirm failed microphone, MIDI, import, save/load, and export operations show clear errors and do not corrupt the project.
- Confirm undo/redo works for add track, edit clip, edit notes, move clip, delete clip, and mixer volume changes.

## Alpha 2 Gate

- Piano roll draw, paint, select, slice, erase, mute, quantize, humanize, velocity, and controller-lane workflows remain editable after save/load.
- Built-in sampler and drum rack tracks can be created from the app menu or browser without breaking project persistence.
- Settings keybinds drive the main app shortcuts for transport, save, save-as, open, new project, undo, redo, and split clip.
- Mixer effect chains expose editable parameters and clearly label whether each effect is preview-audible or saved project data only.

## Alpha 3 Gate

- `npm run release:manifest` writes `dist/release-manifest.json` after a successful renderer build.
- `npm run package:win` runs the renderer build, writes release metadata, and creates an unsigned internal Windows installer.
- Packaged issue reports include app version, alpha phase, release channel, packaged state, platform, Electron version, and user data path.
- `docs/RELEASE_NOTES.md` and `docs/KNOWN_LIMITATIONS.md` match the build being handed to testers.

## Alpha 4 Gate

- `npm run alpha4:stopship` passes.
- `docs/PRIVATE_ALPHA_TEST_PLAN.md` is included with the handoff materials.
- `Export Tester Feedback...` writes an Alpha 4 feedback report without private audio.
- Tester feedback is compared against `docs/KNOWN_LIMITATIONS.md`.
- Any tester feedback report with `stopShip.ok: false` blocks broader rollout until triaged and fixed or explicitly documented as a non-data-loss false positive.

## Tester Feedback Gate

- Every tester gets `docs/KNOWN_LIMITATIONS.md`, `docs/PRIVATE_ALPHA_TEST_PLAN.md`, and `docs/RELEASE_NOTES.md`.
- Every tester exports `draftwave-alpha4-tester-feedback.json` at the end of the session.
- Tester-reported surprises must either become a fix, a release-note entry, or a known-limitation entry before the next build.

## Windows Packaging Gate

- Build an unsigned internal Windows installer first.
- Install on a fresh Windows machine without developer tools.
- Launch from the Start menu and verify save/load/export using a user-writable folder.
- Record app version, alpha phase, release channel, Windows version, install path, user data path, and any antivirus prompts.
- Attach `dist/release-manifest.json` and the generated installer filename to the internal release note.

## Data-Loss Stop Ship

Do not ship a private tester build with any known data-loss bug in save/load, autosave recovery, media asset persistence, or WAV export.
