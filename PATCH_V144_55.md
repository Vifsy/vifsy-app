# Spreelo v144.55 — Expanded curated video music library

Built on the complete v144.54 codebase.

## What changed

- Added all 37 supplied music clips to the bundled video music library.
- Existing `Wait for the Drop` remains, so the complete library now contains 38 bundled tracks.
- Renamed the supplied WAV assets to stable deployment-safe filenames.
- Added per-track metadata for:
  - categories
  - moods
  - industries
  - supported video formats
  - keywords
  - energy
  - priority
  - video volume
- Per-track video volume is balanced from measured source loudness; the WAV files themselves are not normalized, faded, stretched or otherwise modified.
- The existing end-aligned playback rule is unchanged: Spreelo still uses the real end of the selected music clip and never loops or time-stretches it.

## Existing installations

The managed music catalog is bumped from version 1 to version 2.

On the first read of an existing version-1 catalog:

- existing Admin edits are preserved;
- all missing bundled tracks are appended;
- the Admin API persists the migrated version-2 catalog;
- after migration, intentionally deleted tracks stay deleted and are not silently re-added.

Video generation also understands the version-1 catalog immediately, so the new bundled tracks can be selected even before the music-library page is opened.

## Matching groups

The pack covers broad creative use cases including:

- playful / family / kids / pets
- warm / premium / beauty / fragrance / lifestyle
- fresh / wellness / home
- electronic / tech / automotive / gaming / sport
- soft / baby / calm / hospitality
- minimal / design / construction / industrial
- bright / food / beverage / travel / outdoor
- motivational / fitness / performance
- elegant / luxury / fashion / jewelry

See `VIDEO_MUSIC_PACK_V144_55.md` for the complete track list, settings and filename mapping.

## Deployment

This is a complete project ZIP, not a patch ZIP. Replace the previous project with the complete v144.55 package as usual.

No SQL migration is required.
