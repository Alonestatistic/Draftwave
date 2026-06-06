# Private Alpha Release Checklist

## Required Commands

- `npm install`
- `npm run check`
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

## Windows Packaging Gate

- Build an unsigned internal Windows installer first.
- Install on a fresh Windows machine without developer tools.
- Launch from the Start menu and verify save/load/export using a user-writable folder.
- Record app version, Windows version, install path, and any antivirus prompts.

## Data-Loss Stop Ship

Do not ship a private tester build with any known data-loss bug in save/load, autosave recovery, media asset persistence, or WAV export.
