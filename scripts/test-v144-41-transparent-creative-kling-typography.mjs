import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(
  path.join(root, "app/api/cron/finalize-kling-videos/route.js"),
  "utf8"
);

assert.match(source, /FOREGROUND OVERLAY LAYER/,
  "prompt must explicitly describe the typography as an overlay layer");
assert.match(source, /EVERY pixel that is not part of a letter[\s\S]*must be fully transparent with alpha = 0/,
  "prompt must require true alpha transparency outside the design");
assert.match(source, /accent color[\s\S]*compact underline[\s\S]*SMALL brush stroke[\s\S]*SMALL crown\/flourish/,
  "creative typography accents must remain allowed");
assert.match(source, /NO shadow of any kind/,
  "AI typography prompt must forbid broad shadow spill");
assert.match(source, /no glow, haze, mist, blur or atmospheric halo/,
  "AI typography prompt must forbid translucent atmospheric spill");
assert.match(source, /fit: "contain"/,
  "GPT typography must preserve its geometry instead of stretching 2:3 output into 9:16");
assert.match(source, /background: \{ r: 0, g: 0, b: 0, alpha: 0 \}/,
  "normalization must pad onto a transparent canvas");
assert.doesNotMatch(source, /visibleRatio > 0\.22/,
  "the old blanket 22 percent opacity rejection must be removed");
assert.match(source, /visibleRatio > 0\.42/,
  "a high-confidence full-background occupancy guard must remain");
assert.match(source, /bboxAreaRatio > 0\.18 && bboxFillRatio > 0\.72/,
  "validator must detect large panel-like regions instead of rejecting normal accents");
assert.match(source, /lowAlphaRatio > 0\.18/,
  "validator must detect large translucent haze independently");
assert.match(source, /uploadRejectedKlingTypographyOverlay/,
  "rejected GPT typography must be saved for diagnostics");
assert.match(source, /text_overlay_rejected_url/,
  "rejected overlay URL must be persisted for inspection");
assert.match(source, /text_overlay_rejected_analysis/,
  "rejected overlay alpha metrics must be persisted");
assert.match(source, /background: "transparent"/,
  "GPT-Image-2 API request must still explicitly request transparent background");
assert.match(source, /output_format: "png"/,
  "GPT-Image-2 API request must still return PNG");

console.log("v144.41 transparent creative Kling typography regression checks passed.");
