import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/api/cron/run-automations/route.js", "utf8");
const sql = fs.readFileSync("supabase/v144_00_delivery_first_resilience.sql", "utf8");

// A campaign-fit AI timeout must preserve verified deterministic product ranking
// instead of escaping as an unhandled terminal occurrence error.
assert.match(route, /Campaign fit scoring unavailable; preserving deterministic product ranking/);
assert.match(route, /Campaign fit AI returned no usable scores; skipping senior escalation and preserving deterministic ranking/);
assert.match(route, /continue;\n\s*}\n\n\s*const parsed = safeJsonParse\(response\.output_text/);

// Copy generation/identity AI outages must fall back to exact supplied product facts.
assert.match(route, /function buildDeterministicDeliveryCopy\(/);
assert.match(route, /Post copy generation unavailable; using deterministic delivery copy/);
assert.match(route, /Product copy identity AI unavailable; using deterministic contract-safe copy/);

// Image-only formats get a local Sharp/SVG delivery fallback if AI media fails.
assert.match(route, /async function renderEmergencySocialCard\(/);
assert.match(route, /Image generation failed; using local deterministic delivery card/);
assert.match(route, /Website Text \+ Ad image generation failed; using local delivery card/);

// Carousel slide rendering may downgrade presentation quality but must preserve delivery.
assert.match(route, /Carousel slide creation failed; downgrading to a safe single-image delivery/);
assert.match(route, /content_format: "single_image"/);

// Unexpected transient dependencies resume the same occurrence instead of failing immediately.
assert.match(route, /function isTransientAutomationError\(/);
assert.match(route, /deferAutomationOccurrenceForTransientFailure/);
assert.match(route, /defer_automation_occurrence_for_transient_failure/);
assert.match(route, /automationCurrentStage/);
assert.match(route, /transient_failures_deferred/);
assert.match(route, /animatedVideoFinalError && isTransientAutomationError\(animatedVideoFinalError\)/);
assert.match(route, /media_retry: true/);

// A resumed occurrence can clean up an incomplete draft from the failed transient attempt.
assert.match(route, /automationOccurrenceResumedAfterRetry/);
assert.match(route, /Resumed occurrence removed incomplete animated draft and will regenerate safely/);
assert.match(route, /Resumed occurrence removed incomplete carousel draft and will regenerate safely/);

// SQL migration keeps retries bounded and returns to the existing retry_pending claim path.
assert.match(sql, /create or replace function public\.defer_automation_occurrence_for_transient_failure/);
assert.match(sql, /status = 'retry_pending'/);
assert.match(sql, /v_max_retries/);
assert.match(sql, /'exhausted', true/);

console.log("v144.00 delivery-first resilience regression checks passed.");
