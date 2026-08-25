import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const automation = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);

const start = automation.indexOf("const storeSearchLockPool = [");
assert.ok(start >= 0, "Store-search verified product lock pool must exist.");
const end = automation.indexOf("\n          }\n        }\n      } catch (storeSearchError)", start);
assert.ok(end > start, "Store-search lock fallback block must stay inside the local catch boundary.");
const block = automation.slice(start, end);

assert.match(block, /let remainingStoreSearchItems = \[\.\.\.storeSearchLockPool\]/);
assert.match(block, /Store-search verified product could not be locked; trying next verified product/);
assert.match(block, /\{ allowAiRepair: false \}/, "Verified alternatives must be tried deterministically first.");
assert.match(block, /remainingStoreSearchItems = remainingStoreSearchItems\.filter/);
assert.match(block, /Store-search deterministic lock pool exhausted; trying one bounded AI repair/);
assert.match(block, /\{ allowAiRepair: true \}/, "AI repair remains one bounded last resort.");
assert.match(block, /continuing to the next product discovery fallback/, "Exhausting this pool must continue to later discovery instead of killing the post.");
assert.doesNotMatch(
  block,
  /return finalizePreparedWebsiteItem\(storeSearchSelection\.item/,
  "The old un-awaited single-candidate return must not survive; its rejection escaped the local catch and terminally failed the occurrence."
);

const retryLog = block.indexOf("trying next verified product");
const repairLog = block.indexOf("trying one bounded AI repair");
const continueLog = block.indexOf("continuing to the next product discovery fallback");
assert.ok(retryLog >= 0 && repairLog > retryLog && continueLog > repairLog);

console.log("v144.46 store-search product-lock fallback checks passed");
