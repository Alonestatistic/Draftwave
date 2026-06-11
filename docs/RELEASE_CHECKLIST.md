# Draftwave Release Checklist

## Required Commands

- `npm install`
- `npm run check`
- `npm start`
- `npm run package:win`

## Functional DAW Gate

- App boots through the Vite/Electron workflow.
- Renderer boot failures show an actionable error surface.
- Project save/load works in Electron and browser fallback modes.
- Autosave recovery is explicit on launch with Restore and Discard actions.
- Report Issue exports app version, platform, project summary, capability statuses, and recent error strings without private audio.
- Capability labels are visible and honest about the current app surface.
- Create a clean project, add MIDI clips, edit notes, arrange tracks, save, close, reopen, and continue editing.
- Import at least one WAV or MP3 file, save, reopen, and confirm the audio clip still references a media asset.
- Record a microphone take on a machine that grants access, save, reopen, and confirm the take remains in the media list.
- Export WAV and verify the file plays in a normal desktop audio player.
- Confirm failed microphone, MIDI, import, save/load, and export operations show clear errors and do not corrupt the project.
- Confirm undo/redo works for add track, edit clip, edit notes, move clip, delete clip, and mixer volume changes.

## Windows Packaging Gate

- `npm run package:win` completes successfully on Windows.
- `release/Draftwave-Setup-0.1.0-x64.exe` exists after packaging.
- Install on a fresh Windows machine without developer tools.
- Launch from the Start menu and desktop shortcut.
- Verify save/load/export using a user-writable folder.
- Record app version, Windows version, install path, user data path, and any antivirus or SmartScreen prompts.
- Attach `dist/release-manifest.json` and `release/Draftwave-Setup-0.1.0-x64.exe` to the release.

## Do Not Ship If

- Save/load loses tracks, clips, notes, media references, settings, or mixer state.
- Autosave recovery restores the wrong project, corrupts a project, or cannot be dismissed safely.
- Imported or recorded media disappears after save/load.
- WAV export fails, produces a silent/corrupt file, or misrepresents the saved project.
- The packaged app cannot be installed and launched on a clean Windows machine.
