import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const automation = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);
const finalizer = fs.readFileSync(
  path.join(root, "app/api/cron/finalize-kling-videos/route.js"),
  "utf8"
);

// Headline completeness must be language-independent and must not depend on a
// hard-coded stop-word dictionary.
assert.match(
  automation,
  /semantically complete and make full sense when shown entirely by itself/,
  "Kling headline prompt must require a self-contained semantic unit"
);
assert.match(
  automation,
  /Never write an unfinished phrase that expects another word, name or clause to follow/,
  "Kling headline prompt must forbid incomplete phrases"
);
assert.match(
  automation,
  /It will not truncate a longer headline into a fragment/,
  "The copy contract must tell the model that truncation will not rescue long text"
);
assert.doesNotMatch(
  automation,
  /split\(\/\\s\+\/\).*slice\(0, maxWords\)/s,
  "Kling overlay copy must not slice a generated phrase by word count"
);
assert.doesNotMatch(
  automation,
  /truncateText\(words\.join\(" "\), maxChars\)/,
  "Kling overlay copy must not cut a generated phrase by character count"
);
assert.match(
  automation,
  /if \(wordCount > maxWords \|\| charCount > maxChars\) return "";/,
  "Oversize overlay copy must be rejected whole instead of truncated"
);
assert.match(
  automation,
  /Product labels are independently meaningful[\s\S]*safer[\s\S]*fallback/,
  "An independently complete product label must be available as fallback"
);

// Pre-generation Kling identity instructions must explicitly protect the exact
// visible hardware/material design, not merely the broad silhouette/view.
assert.match(
  automation,
  /number\/position\/shape of buttons(?: or controls)?, openings, seams, joints, material boundaries, color blocking, surface finish, distinctive hardware/,
  "Opening-scene identity review must reject added/moved visible controls and hardware"
);
assert.match(
  automation,
  /material boundaries, surface finish, texture or color blocking/,
  "Kling preparation must treat material/color design as immutable"
);
assert.match(
  automation,
  /reduce product motion rather than redraw the product/,
  "Kling should reduce motion rather than redesign a rigid product"
);

// A finished paid Kling video must be checked once before typography/delivery.
assert.match(
  finalizer,
  /async function validateFinishedKlingProductIdentity/,
  "Finished-video identity audit must exist"
);
assert.match(
  finalizer,
  /The PRODUCT DESIGN may not/,
  "Finished-video audit must distinguish scene freedom from product-design lock"
);
assert.match(
  finalizer,
  /number, position, shape and size of visible buttons, switches, controls, openings, seams, joints and distinctive hardware/,
  "Finished-video audit must compare visible controls/hardware"
);
assert.match(
  finalizer,
  /material boundaries, surface finish\/texture, color blocking/,
  "Finished-video audit must compare material/color design"
);
assert.match(
  finalizer,
  /Do NOT fail merely because a real detail is temporarily occluded/,
  "Audit must avoid rejecting mere occlusion/perspective uncertainty"
);
assert.match(
  finalizer,
  /visible_controls_hardware_preserved/,
  "Audit schema must explicitly report control/hardware preservation"
);
assert.match(
  finalizer,
  /visible_material_color_design_preserved/,
  "Audit schema must explicitly report material/color preservation"
);
assert.match(
  finalizer,
  /invented_or_moved_identity_detail/,
  "Audit schema must explicitly detect invented/moved design details"
);
assert.match(
  finalizer,
  /const productIdentity = await validateFinishedKlingProductIdentity\([\s\S]*if \(!productIdentity\.passed\)/,
  "Finalizer must block delivery on a confirmed product redesign"
);
assert.ok(
  finalizer.indexOf("validateFinishedKlingProductIdentity({") <
    finalizer.indexOf("const finalVideo = await getKlingFinalVideoSource({"),
  "Product identity must be audited before typography/Shotstack delivery"
);
assert.match(
  finalizer,
  /This audit[\s\S]*never submits another Kling generation/,
  "Identity audit must not create a second paid Kling generation"
);
assert.match(
  finalizer,
  /scene_trim_start_seconds/,
  "Audit must account for the part of the source video trimmed from delivery"
);

// v144.41 transparent creative typography remains intact.
assert.match(finalizer, /FOREGROUND OVERLAY LAYER/);
assert.match(finalizer, /background: "transparent"/);
assert.match(finalizer, /output_format: "png"/);
assert.match(finalizer, /SMALL brush stroke/);
assert.match(finalizer, /SMALL crown\/flourish/);

console.log("v144.42 complete headline + strict Kling product identity regression checks passed.");
