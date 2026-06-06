# Draftwave

Draftwave is a Windows-first creative sketch DAW for quickly turning musical ideas into arranged sessions. It combines audio and MIDI tracks, imported sounds, browser-based instruments, project save/load, export workflows, and an Assistant Producer that can use local models such as Ollama when cloud AI is unavailable.

## Current Focus

Draftwave is in private alpha. The goal is a reliable creative sketch workflow:

- Create and arrange audio, MIDI, drum, bass, pad, lead, and key tracks.
- Upload or drag in WAV, MP3, OGG, FLAC, and WEBM sounds.
- Save, load, autosave, and restore projects with embedded media.
- Export mixdowns and alpha tester feedback.
- Use the Assistant Producer for quick musical actions and ideas.
- Run local AI through Ollama as a fallback or primary engine.

## Development

```bash
npm install
npm run check
npm run start
```

## Packaging

```bash
npm run package:win
```

The Windows installer is copied to the project root during local release prep as `draftwave-0.1.0-win-x64.exe`. Generated installers and build output are intentionally ignored by Git.

## Private Alpha Testing

Tester handoff instructions live in [docs/TESTER_INSTRUCTIONS.md](docs/TESTER_INSTRUCTIONS.md). Internal stop-ship coverage lives in [docs/PRIVATE_ALPHA_TEST_PLAN.md](docs/PRIVATE_ALPHA_TEST_PLAN.md).

## Status

Private alpha, Windows first. Not licensed for public reuse yet.
