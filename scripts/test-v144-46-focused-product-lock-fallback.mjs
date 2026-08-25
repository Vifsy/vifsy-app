import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const automation = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);

const branchStart = automation.indexOf(
  'if (contentSourceScope === "product_category" || contentSourceScope === "focus_page") {'
);
assert.ok(branchStart >= 0, "Focused category/page single-product branch must exist.");
const branchEnd = automation.indexOf("\n  let catalogItems =", branchStart);
assert.ok(branchEnd > branchStart, "Focused category/page branch must terminate before catalog flow.");
const focusedBranch = automation.slice(branchStart, branchEnd);

assert.match(
  focusedBranch,
  /let focusedCandidatePool = \[\.\.\.focusedCategoryItems\]/,
  "Focused flow must retain the verified pool instead of committing to one candidate."
);
assert.match(
  focusedBranch,
  /Focused category product could not be locked; trying next verified product/,
  "A failed lock must explicitly continue to the next verified product."
);
assert.match(
  focusedBranch,
  /\{ allowAiRepair: false \}/,
  "Alternative verified products must be tried without paying GPT repair first."
);
assert.match(
  focusedBranch,
  /focusedCandidatePool = focusedCandidatePool\.filter/,
  "A failed candidate must be removed from the local retry pool."
);
assert.match(
  focusedBranch,
  /Focused category deterministic lock pool exhausted; trying one bounded AI repair/,
  "AI repair must only happen after the deterministic pool is exhausted."
);
assert.match(
  focusedBranch,
  /\{ allowAiRepair: true \}/,
  "One bounded repair attempt must remain available after alternatives are exhausted."
);
assert.match(
  focusedBranch,
  /FOCUSED_PRODUCT_LOCK_POOL_EXHAUSTED/,
  "Terminal failure must identify complete focused lock-pool exhaustion."
);

const deterministicTry = focusedBranch.indexOf("{ allowAiRepair: false }");
const boundedRepair = focusedBranch.indexOf("{ allowAiRepair: true }");
const terminalFailure = focusedBranch.indexOf("FOCUSED_PRODUCT_LOCK_POOL_EXHAUSTED");
assert.ok(
  deterministicTry >= 0 && boundedRepair > deterministicTry && terminalFailure > boundedRepair,
  "Required order is alternatives first, bounded AI repair second, terminal failure last."
);

console.log("v144.46 focused product-lock fallback checks passed");
