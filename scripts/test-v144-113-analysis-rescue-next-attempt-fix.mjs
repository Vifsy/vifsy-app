import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const worker = fs.readFileSync(
  path.join(root, "app/api/cron/run-brand-analysis-jobs/route.js"),
  "utf8"
);
const schema = fs.readFileSync(
  path.join(root, "supabase/v143_19_durable_brand_analysis.sql"),
  "utf8"
);

// Database contract: durable brand-analysis jobs require a non-null retry timestamp.
assert.match(schema, /next_attempt_at timestamptz not null default now\(\)/i);

// Manual rescue must remain a terminal failed state and create the Rescue Center case.
assert.match(worker, /async function handoffToManualRescue/);
assert.match(worker, /status: "failed"/);
assert.match(worker, /step: "manual_rescue_pending"/);
assert.match(worker, /createManualRescueCaseForFailedJob/);

// Regression: never clear next_attempt_at while handing a brand-analysis job to rescue.
const handoffStart = worker.indexOf("async function handoffToManualRescue");
const handoffEnd = worker.indexOf("async function scheduleOneDirectTimeoutRetry", handoffStart);
assert.ok(handoffStart >= 0 && handoffEnd > handoffStart);
const handoff = worker.slice(handoffStart, handoffEnd);
assert.doesNotMatch(handoff, /nextAttemptAt\s*:\s*null/);
assert.doesNotMatch(handoff, /next_attempt_at\s*:\s*null/);

console.log("v144.113 analysis rescue next_attempt_at regression checks passed");
