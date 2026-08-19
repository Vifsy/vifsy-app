import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

const cron = read("app/api/cron/run-automations/route.js");
const approvals = read("app/api/admin/post-approvals/route.js");
const genericRegen = read("app/api/admin/post-approvals/regenerate-any/route.js");
const productRegen = read("app/api/admin/post-approvals/regenerate-product/route.js");
const carouselRegen = read("app/api/admin/post-approvals/regenerate/route.js");
const restoreVersion = read("app/api/admin/post-approvals/restore-version/route.js");
const versions = read("lib/adminPostVersions.js");
const adminUi = read("app/admin/post-approvals/page.jsx");
const customerUi = read("app/admin/customers/[id]/page.jsx");
const migration = read("supabase/v144_01_admin_review_workbench.sql");

// Review policy: explicit brand Boolean wins; NULL falls back to global.
assert.match(cron, /typeof brand\?\.admin_review_required === "boolean"[\s\S]{0,120}return brand\.admin_review_required/);
assert.match(cron, /from\("spreelo_admin_settings"\)[\s\S]{0,240}require_admin_post_approval/);
assert.match(cron, /return data\?\.require_admin_post_approval !== false/);
assert.doesNotMatch(cron, /Per-brand admin review bypass ignored/);
assert.doesNotMatch(cron, /Global admin review bypass ignored/);

// Admin must be able to save true, false or inheritance instead of hard-coding TRUE.
assert.match(approvals, /body\?\.admin_review_required === null \? null : Boolean\(body\?\.admin_review_required\)/);
assert.doesNotMatch(approvals, /update\(\{\s*admin_review_required:\s*true/);

// Failures still have a durable admin repair path independent of successful-delivery bypass.
assert.match(cron, /status:\s*"needs_repair"/);
assert.match(cron, /admin_review_cases/);

// Migration restores three-state semantics and adds version history without destructively rewriting brands.
assert.match(migration, /alter column admin_review_required drop default/);
assert.match(migration, /NULL inherits the global Spreelo review setting/);
assert.match(migration, /Failed\/incomplete generations always require admin repair/);
assert.match(migration, /create table if not exists public\.admin_post_versions/);
assert.doesNotMatch(migration, /set admin_review_required = null/);

// Generic repair uses the same shared automation helpers as first generation.
assert.match(genericRegen, /generateLockedProductPostContentForUse/);
assert.match(genericRegen, /prepareFocusedPageContextForRule/);
assert.match(genericRegen, /generateAutomationImage/);
assert.match(genericRegen, /createEmergencySocialCardUpload/);
assert.match(genericRegen, /status:\s*"pending_approval"/);
assert.match(genericRegen, /status:\s*"awaiting_spreelo"/);

// Product and carousel repair retain the shared product-verification/rendering pipeline.
assert.match(productRegen, /resolveLockedProductUrlForUse/);
assert.match(productRegen, /generateLockedProductPostContentForUse/);
assert.match(productRegen, /generateWebsiteItemAdImage/);
assert.match(productRegen, /generateAnimatedProductVideo/);
assert.match(carouselRegen, /resolveLockedProductUrlForUse/);
assert.match(carouselRegen, /renderCarouselProductSlideImage/);
assert.match(carouselRegen, /generateCarouselOutroSlideImage/);

// Version snapshots + restoration are wired into repair flows.
assert.match(versions, /admin_post_versions/);
assert.match(productRegen, /snapshotAdminPostVersion/);
assert.match(carouselRegen, /snapshotAdminPostVersion/);
assert.match(genericRegen, /snapshotAdminPostVersion/);
assert.match(restoreVersion, /snapshotAdminPostVersion/);
assert.match(restoreVersion, /status:\s*"pending_approval"/);

// Workbench UX: search/filter, source URL, direct product links, repair modes and version history.
assert.match(adminUi, /Sök företag, text eller plattform/);
assert.match(adminUi, /Alla format/);
assert.match(adminUi, /sourceUrl/);
assert.match(adminUi, /Regenerera inlägg/);
assert.match(adminUi, /Bara text/);
assert.match(adminUi, /Bara bild/);
assert.match(adminUi, /Fler produktuppgifter/);
assert.match(adminUi, /isProductDrivenPost/);
assert.match(approvals, /content_type_id: ruleMap/);
assert.match(approvals, /\["all", "failed", "queue"\]\.includes\(status\)/);
assert.match(approvals, /const needsRepair/);
assert.match(adminUi, /Versionshistorik/);
assert.match(adminUi, /Skicka lyckade direkt/);
assert.match(adminUi, />\s*Produkt\s*</);

// Customer/brand page exposes the review switch and clearly preserves failure safety.
assert.match(customerUi, /setBrandReviewPolicy/);
assert.match(customerUi, /Lyckade inlägg går direkt till kunden\. Fel stannar alltid i admin\./);
assert.match(customerUi, /admin_review_required === false/);

console.log("v144.01 admin review workbench regression checks passed.");
