# Draftwave Release Notes

## 0.1.0 - Windows Desktop Build

### Repository Cleanup

- Removed alpha/prototype release language from the production package metadata.
- Replaced alpha-only smoke checks with a production smoke check focused on the functional DAW surface.
- Moved nonfunctional prototype ideas out of the active release scope.
- Kept core DAW workflows active: tracks, arrangement, piano roll, audio import, save/load, autosave, microphone recording where available, Assistant Producer, and WAV mixdown.

### Windows Installer

- `npm run package:win` now builds the Vite renderer, writes release metadata, runs Electron Builder, and copies the generated NSIS installer into `release/Draftwave-Setup-0.1.0-x64.exe`.
- The installer creates Start menu and desktop shortcuts and allows the install directory to be changed.
- The app remains unsigned unless release signing credentials are added.

### Current Scope

- Creative sketch workflow with MIDI clips, simple audio clips, import, microphone recording where available, save/load, autosave recovery, undo/redo, and WAV mixdown.
- Piano roll editing, controller lanes, sampler/drum-rack creation, editable shortcut settings, and mixer FX controls.
- Known limitations are documented in `docs/KNOWN_LIMITATIONS.md`.
