import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const route = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);

assert.match(route, /function looksLikeGenericEditorialHeadline\(candidate/);
assert.match(route, /VISIBLE COPY CONTRACT:/);
assert.match(route, /Headline: create exactly one short unique editorial headline/);
assert.match(route, /Avoid generic headline formulas like "Built for\.\.\.", "Made for\.\.\.", "Discover\.\.\.", "Shop\.\.\." or storefront CTAs/);
assert.match(route, /Place the visible typography as one balanced centered stack in the lower part of the composition/);
assert.match(route, /Center the headline, product name and optional supporting line horizontally/);
assert.match(route, /Use a centered editorial text block with generous side margins, not a left-heavy or nearly full-width banner treatment/);
assert.match(route, /\^built for\(\?:\\s\|\$\)\/u/);
assert.match(route, /\^se produkten\(\?:\\s\|\$\)\/u/);

console.log("v144.140 editorial Product post typography checks passed");
