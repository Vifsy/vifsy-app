# Spreelo v144.49 — Admin-managed video music library

## What changed

- Added **Admin → Video music library** at `/admin/music-library`.
- Administrators can upload WAV, MP3, M4A and AAC clips directly in Spreelo.
- The library shows every track with an in-browser audio player, duration, source, tags, energy, priority and video volume.
- Tracks can be searched, filtered, enabled/disabled, edited and deleted without a new deployment.
- Matching metadata can be managed for:
  - categories;
  - moods;
  - industries;
  - video formats;
  - keywords;
  - energy;
  - priority;
  - volume.
- Added a Video music card to the protected Admin dashboard.

## Persistent storage without a SQL migration

v144.49 keeps the managed library in a dedicated public Supabase Storage bucket named `video-music-library`.

The protected server API automatically creates/configures the bucket and maintains `catalog/library.json`. Uploaded tracks live under `tracks/`.

No new database table and no manual Supabase SQL migration are required.

Only Spreelo administrators can create upload URLs or mutate the catalog. Audio files are public because Shotstack needs a stable direct URL when composing the final video.

## Existing first track

`Wait for the Drop` remains bundled in `public/audio-library/wait-for-the-drop.wav` and is used as the seed entry when the managed catalog is created for the first time.

It therefore appears in Admin immediately. The administrator can edit its tags, volume, priority, active state or remove it from the managed catalog.

## Automatic selection

Both Kling finalization and the legacy Shotstack Animated Product Reel now load the managed library at render time.

Selection remains deterministic and adds **no new AI call**. Eligible active tracks are scored against the already-known video context using:

1. categories;
2. moods;
3. industries;
4. video formats;
5. keywords;
6. energy;
7. editorial priority.

With only one eligible active track, that track is selected automatically. As more tracks are uploaded, the best contextual match wins.

## End-aligned playback remains unchanged

A track is used only when it is at least as long as the finished video.

`musicTrimStart = trackDuration - finishedVideoDuration`

Spreelo therefore removes only unused time from the **beginning** and keeps the track's actual musical ending aligned with the final video frame.

Music is never looped or time-stretched. If no active track is long enough, the video is delivered silently instead of failing.

## Reliability

- The code-bundled track remains a safe fallback if the managed catalog has never been created yet.
- An intentionally empty managed catalog remains empty; Spreelo does not silently repopulate a track the administrator deleted.
- Music metadata changes do not trigger a new Kling generation.
- Existing Kling product identity, functional-truth, deliberate-ending and product-lock logic is unchanged.

## Tests

Added `scripts/test-v144-49-admin-music-library.mjs` and kept the v144.48 playback regression suite.

Regression coverage includes admin upload/edit/delete UI wiring, metadata-based multi-track selection, end-aligned trim, too-short-track rejection, Shotstack integration and existing Kling/product-lock tests.
