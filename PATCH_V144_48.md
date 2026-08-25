# Spreelo v144.48 — Curated video music library

## What changed

- Added a real internal music library in `lib/videoMusicLibrary.js`.
- Added the supplied rights-cleared track `Wait for the Drop.wav` at `public/audio-library/wait-for-the-drop.wav`.
- Added deterministic metadata-based track matching. No extra AI call is made for music selection.
- With only one active eligible track, `Wait for the Drop` is selected for every applicable video. Future tracks can be ranked by mood, industry, format, keywords and priority.
- Music is applied to both Kling AI product videos and the existing Shotstack animated product Reel format.
- Music is added only in the existing Shotstack final composition; Kling native audio remains muted.

## End-aligned playback

The music ending is protected. Spreelo only uses a library track when the full delivered video fits inside the track.

For a track of `A` seconds and a finished video of `V` seconds:

`musicTrimStart = A - V`

The selected section therefore always runs to the real end of the music file. Example: `7.20 - 6.75 = 0.45`, so a 6.75 s video uses 0.45–7.20 s of the track.

Spreelo does **not** loop, stretch or artificially fade the track to make it fit. If no track is long enough, the video remains silent and still completes normally.

## Reliability

- Music selection and trim metadata are persisted in `video_background_selection` for diagnostics and idempotent finalization.
- A music mismatch cannot trigger a new Kling generation.
- A too-short music asset is skipped rather than failing the video.
- No database migration is required; the library ships with the application.

## Tests

Added `scripts/test-v144-48-video-music-library.mjs` covering:

- bundled track presence;
- 7.20 s → 6.75 s end-aligned trim at 0.45 s;
- Shotstack audio clip insertion;
- preservation of the real music ending;
- fail-open silent delivery for too-short tracks;
- persisted selection context for future multi-track matching.
