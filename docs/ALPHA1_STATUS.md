# Alpha 1 Core Workflow Status

Alpha 1 is now covered by the automated `npm run check` gate for the core sketch workflow.

## Automated Coverage

- Renderer boot in the built Electron app.
- Project menu availability.
- Project serialization, migration, validation, and settings merge behavior.
- Core workflow project creation with MIDI and audio tracks.
- MIDI note editing.
- Arrangement clip movement.
- Audio clip duplicate/delete.
- Undo/redo across arrangement and MIDI edits.
- Generated WAV audio import through `AudioCore.importAudioFiles`.
- Embedded media data and waveform preview persistence.
- Native project save through the preload API.
- Autosave recovery prompt, restore action, warning surfacing, and autosave clearing.
- Missing-media clip surfacing with the `MISSING` arrangement label.
- Offline WAV export producing a valid RIFF/WAVE file.

## Human Or Device Testing Still Required

- Real microphone recording on tester machines with different permissions and codecs.
- Real local audio import using tester-supplied files, especially large projects.
- Manual close/reopen continuation from the packaged Windows installer.
- Audio playback quality and latency expectations on different Windows audio devices.
