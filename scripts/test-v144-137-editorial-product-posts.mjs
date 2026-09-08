import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const route = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);
const regen = fs.readFileSync(
  path.join(root, "app/api/admin/post-approvals/regenerate-product/route.js"),
  "utf8"
);

assert.match(
  route,
  /export async function generateWebsiteItemEditorialPostImage\(openai, rule, postContent\)/
);
assert.match(route, /function deriveEditorialVisibleCopy\(rule, postContent\)/);
assert.match(route, /\.split\("\\n"\)/);
assert.match(route, /EXACT VISIBLE COPY TO RENDER:/);
assert.match(route, /Headline, exact spelling:/);
assert.match(route, /Product name\/model, exact spelling:/);
assert.match(route, /Supporting line, exact spelling:/);
assert.match(route, /Do not invent alternate wording, extra slogans, filler microcopy or spelling changes/);

const generatorStart = route.indexOf(
  "export async function generateWebsiteItemEditorialPostImage"
);
const generatorEnd = route.indexOf("function websiteTextContainsAny", generatorStart);
const generatorBlock = route.slice(generatorStart, generatorEnd);
assert.ok(generatorBlock.length > 0, "Editorial generator block missing");

assert.match(generatorBlock, /if \(nativeReference\)/);
assert.match(generatorBlock, /openai\.images\.generate\(/);
assert.doesNotMatch(generatorBlock, /mask:\s*maskFile/);
assert.doesNotMatch(generatorBlock, /locked-transparent-product-layout\.png/);
assert.match(
  generatorBlock,
  /composite\(\[\{\s*input:\s*nativeReference\.lockedProductBuffer/
);
assert.match(generatorBlock, /native_transparent_composited_original/);
assert.match(generatorBlock, /high_fidelity_recreation/);

assert.match(route, /campaignScoped:\s*isCampaignScopedWebsiteRule\(rule\)/);
assert.match(regen, /generateWebsiteItemEditorialPostImage/);
assert.match(regen, /isEditorialProductPost/);

assert.ok(
  !route.includes('.split("\n")'.replace('\\n', '\n')),
  "Malformed multiline string literal found in caption splitting"
);

console.log("v144.137 Product post regression checks passed");
