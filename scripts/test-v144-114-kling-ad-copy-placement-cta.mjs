import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const finalizer = fs.readFileSync(
  path.join(root, "app/api/cron/finalize-kling-videos/route.js"),
  "utf8"
);
const shotstackSource = fs.readFileSync(path.join(root, "lib/shotstack.js"), "utf8");

assert.match(
  finalizer,
  /async function planFinishedKlingAdvertisingCreative/,
  "Finished Kling video must get a dedicated ad-copy and placement planning step."
);
assert.match(
  finalizer,
  /Reject empty generic advertising language/,
  "Video ad copy planner must explicitly avoid empty generic slogans."
);
assert.match(
  finalizer,
  /especially its print\/design/,
  "Placement planner must protect the advertised product and its print/design."
);
assert.match(
  finalizer,
  /async function placeFinishedKlingTypographyInSafeArea/,
  "Generated typography must be deterministically moved into a scene-safe box."
);
assert.match(
  finalizer,
  /trim\(\{ background: \{ r: 0, g: 0, b: 0, alpha: 0 \}, threshold: 8 \}\)/,
  "Transparent GPT typography must be cropped before deterministic placement."
);
assert.match(
  finalizer,
  /async function createKlingCtaOverlay/,
  "Kling ads must create a dedicated closing CTA overlay."
);
assert.match(
  finalizer,
  /cta_overlay_provider: "deterministic-scene-aware-cta"/,
  "CTA ending must be retry-safe and deterministic after creative planning."
);
assert.match(
  finalizer,
  /ctaOverlayUrl: postprocess\.cta_overlay_url \|\| null/,
  "Final Shotstack render must receive the dedicated CTA overlay."
);
assert.match(
  finalizer,
  /content, cta_type, language, website_url, video_provider/,
  "Finalizer must load caption/language/CTA context for finished-video creative planning."
);

assert.match(
  shotstackSource,
  /ctaOverlayUrl = null/,
  "Shotstack compositor must accept a separate CTA overlay."
);
assert.match(
  shotstackSource,
  /the main headline stops[\s\S]*motion ends/,
  "Main ad headline must stop before the dedicated CTA ending."
);

const { buildVideoOverlayEdit } = await import(
  new URL(`../lib/shotstack.js?test=${Date.now()}`, import.meta.url)
);

const edit = buildVideoOverlayEdit({
  videoUrl: "https://example.com/kling.mp4",
  textOverlayUrl: "https://example.com/headline.png",
  ctaOverlayUrl: "https://example.com/cta.png",
  closingFrameUrl: "https://example.com/hero.jpg",
  durationSeconds: 6,
  trimStartSeconds: 0,
  overlayStartSeconds: 2.8,
  closingHoldSeconds: 0.9,
});

assert.equal(edit.timeline.tracks[0].clips.length, 2, "Advertising track should contain headline then CTA.");
assert.equal(edit.timeline.tracks[0].clips[0].asset.src, "https://example.com/headline.png");
assert.equal(edit.timeline.tracks[0].clips[0].start, 2.8);
assert.equal(edit.timeline.tracks[0].clips[0].length, 3.2, "Headline must end when Kling motion ends.");
assert.equal(edit.timeline.tracks[0].clips[1].asset.src, "https://example.com/cta.png");
assert.equal(edit.timeline.tracks[0].clips[1].start, 6, "CTA must begin exactly on the closing hero frame.");
assert.equal(edit.timeline.tracks[0].clips[1].length, 0.9);
assert.equal(edit.timeline.tracks[1].clips[1].asset.src, "https://example.com/hero.jpg");

const legacyEdit = buildVideoOverlayEdit({
  videoUrl: "https://example.com/kling.mp4",
  textOverlayUrl: "https://example.com/headline.png",
  closingFrameUrl: "https://example.com/hero.jpg",
  durationSeconds: 6,
  trimStartSeconds: 0,
  overlayStartSeconds: 2.8,
  closingHoldSeconds: 0.9,
});
assert.ok(
  Math.abs(legacyEdit.timeline.tracks[0].clips[0].length - 4.1) < 1e-9,
  "Without a CTA overlay, the legacy headline-through-hero behavior must remain intact."
);

console.log("v144.114 Kling ad copy, safe placement and CTA ending checks passed");
