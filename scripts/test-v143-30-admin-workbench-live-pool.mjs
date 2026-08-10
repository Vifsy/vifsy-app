import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const expect = (condition, message) => { if (!condition) throw new Error(message); };

const cron = read("app/api/cron/run-automations/route.js");
const adminApi = read("app/api/admin/post-approvals/route.js");
const adminPage = read("app/admin/post-approvals/page.jsx");
const migration = read("supabase/v143_30_review_workbench_calendar_assets.sql");
const planner = read("app/automation/page.jsx");
const home = read("app/page.jsx");
const calendar = read("app/calendar/page.jsx");
const regenerate = read("app/api/admin/post-approvals/regenerate/route.js");

expect(cron.includes("isExactConfiguredWebsiteHostUrl"), "Product URLs must use the configured market host exactly.");
expect(cron.includes("verifiedEditorialPool") && cron.includes("Select ONLY from that pool"), "GPT must prefer the live-verified product pool.");
expect(cron.includes('status: "creating"') && cron.includes('status: "needs_repair"') && cron.includes('status: sentDirectlyToCustomer ? "sent_directly" : "awaiting_spreelo"'), "Every occurrence must have a durable admin lifecycle.");
expect(cron.includes("export async function sendApprovalEmail"), "The localized legacy customer email must be reusable by admin release.");
expect(adminApi.includes("await sendApprovalEmail") && adminApi.indexOf("return Response.json({ ok: true, released: true") < adminApi.indexOf("Legacy v143.28 release template"), "Admin release must return through the shared localized email before the retired template.");
expect(adminApi.includes("set_brand_review_policy") && migration.includes("admin_review_required boolean"), "Per-brand review policy is required.");
expect(adminPage.includes("admin.approvals.regenerateCarousel") && adminPage.includes("uploadToSignedUrl") && adminPage.includes("bulk_archive"), "Admin carousel editing, upload and bulk archive controls are required.");
expect(migration.includes("admin_review_cases") && migration.includes("calendar_visual_assets") && migration.includes("150"), "Durable review cases and capped calendar library are required.");
expect(planner.includes("always sees a complete, goal-specific plan immediately"), "AI Studio must show a complete plan immediately without a visible replacement.");
expect(!home.includes('label: "Kunde inte skapas"'), "Customer dashboard must not show terminal generation errors.");
expect(calendar.includes("visual_image_url"), "Calendar rows must render reusable campaign imagery.");
expect(adminApi.includes("getEditableProductItems") && adminApi.includes("source_image_url"), "Old carousel slides must be converted into editable admin products.");
expect(regenerate.includes("user_id: post.user_id") && regenerate.includes('product_url: product.url || null'), "Regenerated slides need user ownership while product URLs remain optional.");
expect(regenerate.includes("previousSlides") && regenerate.includes("insert(previousSlides)"), "Failed regeneration must restore the previous carousel slides.");

console.log("v143.30 admin workbench, verified product pool and calendar visual checks passed.");
