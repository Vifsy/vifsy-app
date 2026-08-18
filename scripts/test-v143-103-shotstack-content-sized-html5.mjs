import assert from "node:assert/strict";
import { buildProductPushEdit } from "../lib/shotstack.js";

function findClip(edit, assetType) {
  for (const track of edit.timeline.tracks) {
    for (const clip of track.clips || []) {
      if (clip?.asset?.type === assetType) return clip;
    }
  }
  return null;
}

const edit = buildProductPushEdit({
  backgroundVideoUrl: "https://example.com/background.mp4",
  productDataUri: "data:image/webp;base64,UklGRg==",
  productWidth: 920,
  productHeight: 585,
  textOverlayUrl: "https://example.com/text.png",
  logoOverlayUrl: "https://example.com/logo.png",
  durationSeconds: 5,
});

const html5Clip = findClip(edit, "html5");
assert.ok(html5Clip, "HTML5 product clip must exist");
assert.equal(html5Clip.width, 920);
assert.equal(html5Clip.height, 585);
assert.deepEqual(html5Clip.offset, { x: 0, y: 0.214844 });
assert.match(html5Clip.asset.css, /width:920px;height:585px/);
assert.doesNotMatch(html5Clip.asset.css, /width:1080px;height:1920px/);
assert.doesNotMatch(html5Clip.asset.css, /position:absolute/);
assert.doesNotMatch(html5Clip.asset.css, /left:/);
assert.doesNotMatch(html5Clip.asset.css, /top:/);
assert.match(html5Clip.asset.js, /gsap\.timeline\(\)/);
assert.match(html5Clip.asset.js, /scale:1\.08/);

const imageClips = edit.timeline.tracks
  .flatMap((track) => track.clips || [])
  .filter((clip) => clip?.asset?.type === "image");
assert.equal(imageClips.length, 2);
for (const clip of imageClips) {
  assert.equal(clip.width, 1080);
  assert.equal(clip.height, 1920);
  assert.equal(clip.position, "center");
}

assert.deepEqual(edit.output.size, { width: 1080, height: 1920 });
assert.equal(edit.output.fps, 25);
assert.equal(edit.output.quality, "medium");
assert.deepEqual(edit.output.poster, { capture: 0.1 });

const tallEdit = buildProductPushEdit({
  backgroundVideoUrl: "https://example.com/background.mp4",
  productDataUri: "data:image/webp;base64,UklGRg==",
  productWidth: 561,
  productHeight: 690,
});
const tallHtml5 = findClip(tallEdit, "html5");
assert.equal(tallHtml5.width, 561);
assert.equal(tallHtml5.height, 690);
assert.deepEqual(tallHtml5.offset, { x: 0.000463, y: 0.1875 });

console.log("v143.103 Shotstack content-sized HTML5 regression checks passed");
