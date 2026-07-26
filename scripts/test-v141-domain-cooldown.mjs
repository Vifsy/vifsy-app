import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const route = await readFile(new URL("../app/api/cron/run-automations/route.js", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/v141_domain_cooldown_resumable_product_jobs.sql", import.meta.url), "utf8");

assert.match(route, /normalizeWebsiteFetchDomainHostname/);
assert.match(route, /replace\(\/\^www\\\.\//);
assert.match(route, /acquireWebsiteDomainJobLock/);
assert.match(route, /releaseWebsiteDomainJobLock/);
assert.match(route, /deferCurrentOccurrenceForWebsiteRateLimit/);
assert.match(route, /automatic_retry_scheduled:\s*true/);
assert.match(route, /throwIfWebsiteDomainCoolingDown/);
assert.match(route, /finally\s*\{[\s\S]*releaseWebsiteDomainJobLock/);

assert.match(migration, /status in \('running', 'retry_pending', 'completed', 'failed_terminal'\)/);
assert.match(migration, /create or replace function public\.acquire_website_domain_job_lock/);
assert.match(migration, /create or replace function public\.defer_automation_occurrence_for_website_rate_limit/);
assert.match(migration, /automatic_run_count/);
assert.match(migration, /blocked_claim_count = blocked_claim_count \+ 1/);
assert.match(migration, /v_occurrence\.status = 'retry_pending'/);
assert.doesNotMatch(migration, /credits_remaining = credits_remaining \+/);

console.log("v141 domain cooldown and resumable product-job invariants passed.");
