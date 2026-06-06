# Draftwave Private Alpha Known Limitations

This Private Alpha is a Windows-first creative sketch DAW. It is intended for composition, arrangement, quick MIDI ideas, simple audio clips, basic recording where available, save/load, autosave recovery, and WAV export.

## Stable Alpha Promise

- Create a project, add and edit MIDI clips, arrange tracks, save/load, and export a WAV mixdown.
- Import common audio files and keep imported media embedded in the project JSON for alpha reliability.
- Record microphone takes when the runtime grants access to MediaRecorder.
- Use undo/redo for the main edit operations in the current sketch workflow.
- See capability labels that distinguish Available, Experimental, Needs backend, and Unsupported features.

## Experimental

- Microphone recording depends on the Electron/browser runtime, device permission, and codec support.
- MIDI input uses Web MIDI when exposed by the runtime.
- Controller lanes, pitch bend, and aftertouch are persisted as clip project data but are not fully routed through every playback/render path.
- Sampler and drum rack track types are present, but sample-slot and pad assignment workflows are still early.
- Built-in mixer effects are currently project-data controls unless explicitly audible in the synth/render path.
- Detachable panels open through Electron, but focused routing and multi-window state are still evolving.
- Stem export currently writes a manifest, not separate rendered stem audio files.
- Extension discovery is scaffolded and intended for internal experiments.

## Not Promised For Alpha

- True VST hosting.
- Commercial-grade plugin sandboxing.
- Professional low-latency native audio engine.
- Full stem splitting.
- Automatic mastering/remastering.
- SoundFont production support.
- Paid or public distribution.

## Tester Guidance

Do not use Private Alpha builds for irreplaceable sessions. Keep backups of exported project files and report any data-loss, save/load, audio-device, import, recording, or export failure immediately with the app's Report Issue action.

Before ending an Alpha 4 test session, use `Export Tester Feedback...` so the build can be checked against the known limitations and data-loss stop-ship rules.
