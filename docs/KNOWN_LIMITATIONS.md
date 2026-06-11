# Draftwave Known Limitations

Draftwave is a Windows-first creative sketch DAW for quickly building musical ideas. The active app scope is composition, arrangement, audio import, simple recording where supported, save/load, autosave recovery, and WAV mixdown export.

## Current Working Scope

- Create audio, MIDI, drum, bass, pad, lead, key, sampler, and drum-rack tracks.
- Edit clips in the arrangement and piano roll.
- Import WAV, MP3, OGG, FLAC, and WEBM audio when the Electron/browser runtime can decode the file.
- Save and load Draftwave project JSON files with embedded media.
- Restore or discard autosave snapshots on launch.
- Export a WAV mixdown.
- Use the Assistant Producer for musical actions and idea generation.
- Use Ollama model pulls when Ollama is installed locally.

## Known Limitations

- Microphone recording depends on runtime permission, input device availability, and codec support.
- MIDI input depends on Web MIDI support in the packaged runtime and the connected device.
- Controller lanes, pitch bend, and aftertouch are saved as project data, but they are not fully routed through every playback and render path yet.
- Sampler and drum-rack creation exists, but deep sample-zone and pad-assignment workflows are still early.
- Mixer effect chains are editable project data; only effects explicitly wired into the synth/render path are audible.
- The Windows installer is unsigned unless a signing certificate is added to the release environment, so Windows SmartScreen may warn on first launch.

## Removed From The Active App Surface

Prototype-only native plugin hosting, SoundFont production support, AI remastering, stem splitting, extension scanning, tester stop-ship reports, and alpha-only integration harnesses are not part of the functional DAW surface. They should stay out of menus and release checks until they have real implementations.

## User Guidance

Keep backup copies of source audio and exported projects. Report any save/load, autosave, media persistence, recording, import, or WAV export failure with the app's **Report Issue...** action.
