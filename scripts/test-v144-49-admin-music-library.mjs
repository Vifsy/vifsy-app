import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VIDEO_MUSIC_BUCKET,
  VIDEO_MUSIC_CATALOG_PATH,
  VIDEO_MUSIC_CATALOG_VERSION,
  VIDEO_MUSIC_LIBRARY,
  normalizeVideoMusicCatalog,
  selectBestVideoMusicFromTracks,
} from "../lib/videoMusicLibrary.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiSource = fs.readFileSync(path.join(root, "app/api/video-music/route.js"), "utf8");
const pageSource = fs.readFileSync(path.join(root, "app/admin/music-library/page.jsx"), "utf8");
const adminSource = fs.readFileSync(path.join(root, "app/admin/page.jsx"), "utf8");
const finalizerSource = fs.readFileSync(path.join(root, "app/api/cron/finalize-kling-videos/route.js"), "utf8");
const runSource = fs.readFileSync(path.join(root, "app/api/cron/run-automations/route.js"), "utf8");

assert.equal(VIDEO_MUSIC_BUCKET, "video-music-library");
assert.equal(VIDEO_MUSIC_CATALOG_PATH, "catalog/library.json");
assert.equal(VIDEO_MUSIC_LIBRARY[0].id, "wait-for-the-drop-v1");
assert.equal(VIDEO_MUSIC_LIBRARY[0].duration_seconds, 7.2);

const empty = normalizeVideoMusicCatalog({ version: VIDEO_MUSIC_CATALOG_VERSION, tracks: [] });
assert.deepEqual(empty.tracks, [], "An admin must be able to intentionally leave the current managed library empty");

const migratedV1 = normalizeVideoMusicCatalog({ version: 1, tracks: [VIDEO_MUSIC_LIBRARY[0]] });
assert.equal(
  migratedV1.tracks.length,
  VIDEO_MUSIC_LIBRARY.length,
  "A v1 managed catalog should receive the new bundled tracks exactly once"
);

const multiTrack = [
  {
    id: "calm-family",
    name: "Calm Family",
    source_kind: "uploaded",
    public_url: "https://cdn.example.com/calm.wav",
    duration_seconds: 10,
    active: true,
    priority: 0,
    volume: 0.4,
    categories: ["warm"],
    moods: ["calm"],
    industries: ["family"],
    formats: ["animated_video"],
    keywords: ["baby"],
    energy: "low",
  },
  {
    id: "premium-fragrance",
    name: "Premium Fragrance",
    source_kind: "uploaded",
    public_url: "https://cdn.example.com/premium.wav",
    duration_seconds: 9.4,
    active: true,
    priority: 0,
    volume: 0.5,
    categories: ["premium"],
    moods: ["elegant"],
    industries: ["fragrance", "beauty"],
    formats: ["animated_video"],
    keywords: ["luxury", "product"],
    energy: "medium",
  },
];

const premiumSelection = selectBestVideoMusicFromTracks({
  tracks: multiTrack,
  context: {
    content_format: "animated_video",
    industry: "beauty",
    product_category: "fragrance",
    product_title: "Premium fragrance product",
  },
  targetDurationSeconds: 6.75,
});
assert.equal(premiumSelection.id, "premium-fragrance", "Best metadata match should win when multiple tracks exist");
assert.equal(premiumSelection.trimStartSeconds, 2.65, "A 9.4 s track must end-align to a 6.75 s video");

const shortOnly = selectBestVideoMusicFromTracks({
  tracks: [{ ...multiTrack[1], duration_seconds: 5 }],
  context: { industry: "fragrance" },
  targetDurationSeconds: 6.75,
});
assert.equal(shortOnly, null, "Tracks shorter than the finished video must be skipped");

assert.match(apiSource, /createSignedUploadUrl/, "Admin upload must use signed Supabase Storage upload URLs");
assert.match(apiSource, /VIDEO_MUSIC_CATALOG_PATH/, "Music metadata must be persisted in a managed storage catalog");
assert.match(apiSource, /export async function PATCH/, "Admin must be able to edit tracks");
assert.match(apiSource, /export async function DELETE/, "Admin must be able to delete tracks");
assert.match(pageSource, /<audio className="music-player"/, "Admin library must provide direct audio preview");
assert.match(pageSource, /categories/, "Admin must expose matching categories");
assert.match(pageSource, /industries/, "Admin must expose industry tags");
assert.match(pageSource, /volume/, "Admin must expose per-track video volume");
assert.match(pageSource, /patchTrack\(track, \{ active:/, "Tracks must be enableable/disableable directly from the library");
assert.match(adminSource, /href="\/admin\/music-library"/, "Admin dashboard must link to the music library");
assert.match(finalizerSource, /await selectBestVideoMusic\(\{\s*supabase,/s, "Kling finalization must use the managed Supabase catalog");
assert.match(runSource, /await selectBestVideoMusic\(\{\s*supabase,/s, "Animated product Reels must use the managed Supabase catalog");
assert.match(fs.readFileSync(path.join(root, "app/globals.css"), "utf8"), /56-v144-49-music-library\.css/, "Music-library styles must be included in the active cascade");

console.log("v144.49 admin-managed video music library tests passed");
