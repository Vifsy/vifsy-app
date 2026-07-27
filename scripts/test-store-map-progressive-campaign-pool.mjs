import assert from "node:assert/strict";
import fs from "node:fs";
import { getStoreMapAgentTargets } from "../lib/storeMapProductAgent.js";

const route = fs.readFileSync(
  new URL("../app/api/cron/run-automations/route.js", import.meta.url),
  "utf8"
);

const targets = getStoreMapAgentTargets(5);
assert.equal(targets.minimumVerifiedProducts, 20);
assert.equal(targets.shelfProductLimit, 20);

assert.match(route, /excludeProductUrls = \[\]/);
assert.match(route, /\.slice\(0, 180\)/);
assert.match(route, /Store Map campaign pool expansion round finished/);
assert.match(route, /Store Map campaign delivery pool finalized/);
assert.match(route, /fresh_campaign_ready_count/);
assert.match(route, /prioritizeStoreMapShelvesForExecution/);
assert.match(route, /store_map_execution_priority/);
assert.match(route, /requiredCount >= 5 \? 240_000 : 95_000/);
assert.match(route, /Campaign carousel locked to first-pass Store Map pool/);
assert.match(route, /selectedShelves\[0\],\s*selectedShelves\[0\]/);
assert.match(route, /Product Engine V2 stopped after one automatic attempt/);
assert.doesNotMatch(route, /Product Engine V2 retry \$\{retryAttempt\}\/2 scheduled/);
assert.match(route, /await finishRunLog\(\s*"failed"/);

const firstPassStoreMap = route.indexOf(
  "Campaign carousel locked to first-pass Store Map pool"
);
const freshStoreSearch = route.indexOf(
  "Only use fresh store search after the persistent catalog/candidate preflight"
);
assert.ok(firstPassStoreMap > 0, "First-pass Store Map delivery path is missing");
assert.ok(
  freshStoreSearch > firstPassStoreMap,
  "Store Map must run before fresh store-search fallbacks"
);

console.log("Progressive Store Map campaign pool and one-shot failure invariants passed.");
