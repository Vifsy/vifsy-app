import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);

function extractFunction(name, nextName) {
  const start = route.indexOf(`function ${name}`);
  const syncEnd = route.indexOf(`function ${nextName}`, start + 1);
  const asyncEnd = route.indexOf(`async function ${nextName}`, start + 1);
  const end = [syncEnd, asyncEnd]
    .filter((value) => value > start)
    .sort((left, right) => left - right)[0];
  assert.ok(start >= 0 && end > start, `Could not extract ${name}`);
  return route.slice(start, end);
}

const hydrate = extractFunction(
  "hydrateAuthoritativeWebAgentProduct",
  "createCampaignResearchPendingError"
);
assert.match(hydrate, /\[404, 410\]\.includes\(technicalPageStatus\)/);
assert.match(
  hydrate,
  /product rejected because its direct product page is gone[\s\S]*return null;/
);

const resolver = extractFunction(
  "resolveLargestProductImagesBeforeGeneration",
  "reviewCarouselProductOnlyImages"
);
assert.match(resolver, /People and animals are allowed/);
assert.match(resolver, /return resolvedItems;/);
assert.doesNotMatch(resolver, /return reviewCarouselProductOnlyImages/);

assert.doesNotMatch(
  route,
  /horze\.se|zalando\.se|isover\.(?:se|com)/i,
  "The fix must remain generic and retailer independent"
);

console.log("v143.25 live-link and open product-image checks passed.");
