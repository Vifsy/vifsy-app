import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizeVideoDurationSeconds } from "../lib/videoDuration.js";

const finalizer = fs.readFileSync("app/api/cron/finalize-kling-videos/route.js", "utf8");

// Kling may return fractional seconds even though posts.video_duration_seconds is an integer column.
assert.equal(normalizeVideoDurationSeconds("6.041"), 6);
assert.equal(normalizeVideoDurationSeconds("6.0"), 6);
assert.equal(normalizeVideoDurationSeconds("5.997"), 6);
assert.equal(normalizeVideoDurationSeconds(6.6), 7);
assert.equal(normalizeVideoDurationSeconds(null, 6), 6);
assert.equal(normalizeVideoDurationSeconds(undefined, 0, "bad"), 6);

assert(finalizer.includes('normalizeVideoDurationSeconds('), "Kling finalizer does not normalize fractional duration");
assert(!finalizer.includes('Number(task.durationSeconds || post.video_duration_seconds || 0)'), "Old raw fractional duration persistence is still present");
assert(!finalizer.includes("submitKlingImageToVideo"), "Finalizer must never submit a second paid Kling generation");

console.log("v144.09 Kling fractional-duration finalization checks passed");
