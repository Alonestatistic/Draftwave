# Private Alpha 4 Test Plan

## Purpose

Alpha 4 testing is about confirming that the private alpha promise matches real tester machines before wider sharing. Testers should compare the app against the Known Limitations in `docs/KNOWN_LIMITATIONS.md`, export tester feedback, and stop immediately on any data-loss signal.

## Required Tester Flow

1. Install the unsigned Windows build from the Alpha 4 package.
2. Read `docs/KNOWN_LIMITATIONS.md` before starting.
3. Create a clean project and complete the save/load workflow.
4. Import audio, save, reopen, and confirm the clip still references its media asset.
5. If microphone permission is available, record a take, save, reopen, and confirm the take remains in the project.
6. Export a WAV mixdown and play it in a normal desktop audio player.
7. Exercise piano roll editing, sampler or drum rack creation, custom keybinds, and mixer FX controls.
8. Use `Export Tester Feedback...` before ending the session.
9. Use `Report Issue...` for any crash, failed operation, device failure, or confusing error.

## Stop-Ship Rules

Do not continue broad tester rollout if any tester reports:

- Project save/load loses tracks, clips, notes, media references, settings, or mixer state.
- Autosave recovery restores the wrong project, corrupts a project, or cannot be dismissed safely.
- Imported or recorded media disappears after save/load.
- WAV export fails, produces a silent/corrupt file, or misrepresents the saved project.

## Feedback Report

`Export Tester Feedback...` writes `draftwave-alpha4-tester-feedback.json`. The report includes app metadata, capability statuses, project summary, media warnings, recent renderer errors, workflow placeholders, and a stop-ship evaluation. It does not include private audio.

## Passing Alpha 4

Alpha 4 is ready only when tester feedback matches the known limitations, `stopShip.ok` is true for all tester feedback reports, and every data-loss stop-ship area has been manually exercised on at least one fresh Windows machine.
