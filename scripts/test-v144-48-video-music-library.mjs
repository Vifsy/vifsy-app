import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VIDEO_MUSIC_LIBRARY,
  selectBestVideoMusicFromTracks,
} from "../lib/videoMusicLibrary.js";
import { buildProductPushEdit, buildVideoOverlayEdit } from "../lib/shotstack.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runSource = fs.readFileSync(path.join(root, "app/api/cron/run-automations/route.js"), "utf8");
const finalizerSource = fs.readFileSync(path.join(root, "app/api/cron/finalize-kling-videos/route.js"), "utf8");

assert.ok(VIDEO_MUSIC_LIBRARY.length >= 1, "The original supplied track must remain in the expanded library");
assert.equal(VIDEO_MUSIC_LIBRARY[0].id, "wait-for-the-drop-v1");
assert.ok(
  fs.existsSync(path.join(root, "public/audio-library/wait-for-the-drop.wav")),
  "The supplied Suno WAV must ship with the app"
);

const selection = selectBestVideoMusicFromTracks({
  tracks: [VIDEO_MUSIC_LIBRARY[0]],
  context: {
    content_format: "animated_video",
    product_category: "fragrance",
    product_title: "Armani Acqua di Gio",
  },
  targetDurationSeconds: 6.75,
  appUrl: "https://app.spreelo.com",
});
assert.ok(selection, "The original bundled music track should remain selectable");
assert.equal(selection.id, "wait-for-the-drop-v1");
assert.equal(selection.url, "https://app.spreelo.com/audio-library/wait-for-the-drop.wav");
assert.equal(selection.trimStartSeconds, 0.45, "A 7.2 s song on a 6.75 s video must start at 0.45 s so the real ending survives");

const edit = buildVideoOverlayEdit({
  videoUrl: "https://example.com/kling.mp4",
  textOverlayUrl: "https://example.com/overlay.png",
  closingFrameUrl: "https://example.com/closing.jpg",
  durationSeconds: 6.55,
  trimStartSeconds: 0.7,
  closingHoldSeconds: 0.9,
  musicUrl: selection.url,
  musicDurationSeconds: selection.durationSeconds,
  musicTrimStartSeconds: selection.trimStartSeconds,
  musicVolume: selection.volume,
});
const audioClips = edit.timeline.tracks.flatMap((track) => track.clips || []).filter((clip) => clip.asset?.type === "audio");
assert.equal(audioClips.length, 1, "Shotstack edit must contain one music clip");
assert.equal(audioClips[0].asset.trim, 0.45);
assert.equal(audioClips[0].length, 6.75);
assert.equal(audioClips[0].asset.effect, "none", "Do not synthesize a fake fade; retain the Suno ending");

const legacyMusic = selectBestVideoMusicFromTracks({
  tracks: [VIDEO_MUSIC_LIBRARY[0]],
  context: { content_format: "animated_video", product_category: "retail" },
  targetDurationSeconds: 5,
  appUrl: "https://app.spreelo.com",
});
const legacyEdit = buildProductPushEdit({
  backgroundVideoUrl: "https://example.com/background.mp4",
  productDataUri: "data:image/webp;base64,AAAA",
  durationSeconds: 5,
  musicUrl: legacyMusic.url,
  musicDurationSeconds: legacyMusic.durationSeconds,
  musicTrimStartSeconds: legacyMusic.trimStartSeconds,
  musicVolume: legacyMusic.volume,
});
const legacyAudio = legacyEdit.timeline.tracks.flatMap((track) => track.clips || []).find((clip) => clip.asset?.type === "audio");
assert.ok(legacyAudio, "The existing Shotstack animated product Reel should use the same music library");
assert.equal(legacyAudio.asset.trim, 2.2, "The 5 s Reel should use the final 5 s of the 7.2 s track");
assert.equal(legacyAudio.length, 5);

const tooShort = selectBestVideoMusicFromTracks({
  tracks: [VIDEO_MUSIC_LIBRARY[0]],
  context: { content_format: "animated_video" },
  targetDurationSeconds: 7.21,
});
assert.equal(tooShort, null, "A music asset shorter than the finished video must be skipped, never looped or stretched");

const silentEdit = buildVideoOverlayEdit({
  videoUrl: "https://example.com/kling.mp4",
  textOverlayUrl: "https://example.com/overlay.png",
  closingFrameUrl: "https://example.com/closing.jpg",
  durationSeconds: 7,
  trimStartSeconds: 0,
  closingHoldSeconds: 0.9,
  musicUrl: "https://example.com/too-short.wav",
  musicDurationSeconds: 7.2,
});
assert.equal(
  silentEdit.timeline.tracks.flatMap((track) => track.clips || []).filter((clip) => clip.asset?.type === "audio").length,
  0,
  "Shotstack must fail open to a silent video when music is too short"
);

assert.match(runSource, /music_context:/, "Kling generation should persist context for future multi-track matching");
assert.match(finalizerSource, /selectBestVideoMusic/, "Kling finalization must select music before the final Shotstack render");
assert.match(finalizerSource, /music_asset_id/, "Chosen music must be persisted for diagnostics/idempotency");

console.log("v144.48 video music library tests passed");
