import fs from "node:fs";

const route = fs.readFileSync("app/api/cron/run-automations/route.js", "utf8");
const sql = fs.readFileSync("supabase/v144_101_worker_lane_leases_runtime_incidents.sql", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(route.includes("AUTOMATION_WORKER_LANE_LEASE_SECONDS"), "Worker lane lease TTL is missing");
assert(route.includes('supabase.rpc("acquire_automation_worker_lane"'), "Worker lane acquire RPC is missing");
assert(route.includes('supabase.rpc("release_automation_worker_lane"'), "Worker lane release RPC is missing");
assert(route.includes("worker_lane_busy"), "Busy-lane success response is missing");
assert(route.includes("shared_atomic_claim_with_lane_guard"), "Queue mode does not expose the lane guard");
assert(route.includes("finally") && route.includes("releaseAutomationWorkerLaneLease"), "Worker lease is not released from a finally boundary");
assert(route.includes("worker_lane_unusually_long"), "Long-running lane warning is missing");
assert(route.includes("record_admin_runtime_incident"), "Durable incident recording is missing");
assert(route.includes("Repeated identical incidents are grouped"), "Incident email deduplication explanation is missing");
assert(route.includes("worker_cron_unhandled_failure"), "Top-level worker crash alert is missing");
assert(route.includes("website_rate_limit_repeated"), "Repeated website rate-limit warning is missing");
assert(route.includes("repeated_transient_runtime_failure"), "Repeated transient retry warning is missing");
assert(route.includes("Worker batch activity"), "Detailed worker batch activity is missing from admin email");
assert(route.includes("Exact recorded cost"), "Cost diagnostics are missing from admin email");
assert(route.includes("Providers / models"), "Provider/model diagnostics are missing from admin email");
assert(route.includes("Customer user ID"), "Customer diagnostics are missing from admin email");
assert(route.includes("runLogId: automationRunLogId"), "Run-log ID is not propagated into incident alerts");
assert(route.includes("workerRunActivity.push"), "Worker activity tracking is missing");

assert(sql.includes("create table if not exists public.automation_worker_leases"), "Worker lease table migration is missing");
assert(sql.includes("create or replace function public.acquire_automation_worker_lane"), "Worker lease acquire SQL is missing");
assert(sql.includes("create or replace function public.release_automation_worker_lane"), "Worker lease release SQL is missing");
assert(sql.includes("create table if not exists public.admin_runtime_incidents"), "Admin runtime incident table is missing");
assert(sql.includes("create or replace function public.record_admin_runtime_incident"), "Incident dedupe SQL is missing");
assert(sql.includes("pg_advisory_xact_lock"), "Atomic lease/incident locking is missing");
assert(sql.includes("last_email_at"), "Incident email cooldown state is missing");
assert(sql.includes("revoke all on public.admin_runtime_incidents from anon, authenticated"), "Incident table must stay admin/service-role only");

console.log("v144.101 worker lane guard + admin runtime incident checks passed");
