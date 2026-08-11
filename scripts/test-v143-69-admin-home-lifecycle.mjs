import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const expect = (ok, message) => { if (!ok) throw new Error(message); };

const adminPage = read('app/admin/post-approvals/page.jsx');
const approvalRoute = read('app/api/admin/post-approvals/route.js');
const regenCarousel = read('app/api/admin/post-approvals/regenerate/route.js');
const regenProduct = read('app/api/admin/post-approvals/regenerate-product/route.js');
const cron = read('app/api/cron/run-automations/route.js');
const home = read('app/page.jsx');
const labels = read('lib/i18n/defaultLabels.js');
const uiText = read('lib/i18n/useUiText.js');
const migration = read('supabase/v143_69_plan_lifecycle_history.sql');
const css = read('app/styles/38-current-experience-v143.css');

// Admin editing must be URL-first but always have an explicit manual safety valve.
expect(adminPage.includes('manual_override') && adminPage.includes('admin-product-manual-editor'), 'Admin review must support manual product overrides.');
expect(adminPage.includes('uploadProductImage') && adminPage.includes('uploadProductImage(index'), 'Manual product image upload must be available.');
expect(adminPage.includes('openProductSource') && adminPage.includes('admin-review-source-quick'), 'Single-product reviews must expose the source URL without scrolling.');
expect(adminPage.includes('product_item: materials[0]'), 'Single-product regeneration must submit the complete edited product object.');
expect(adminPage.includes('editorPostId === selectedPost.id && (editorDirty || productDirty)'), 'Polling must not overwrite an active admin edit session.');
expect(adminPage.includes('disabled={releasingPostId === selectedPost.id || productDirty || editorDirty}'), 'Approval must be blocked while product edits still require regeneration.');
expect(adminPage.includes('setProductDirty(false);') && adminPage.includes('await loadPosts(result.post_id)'), 'Successful regeneration must clear product-dirty state and refresh the same post.');

expect(approvalRoute.includes('reviewProductsMap') && approvalRoute.includes('admin_review_cases'), 'Admin GET must recover product source data from durable review cases.');
expect(approvalRoute.includes('manual_override') && approvalRoute.includes('manual_image_override'), 'Admin saves must preserve manual provenance.');
expect(regenCarousel.includes('product.manual_override === true') && regenCarousel.includes('admin_manual_override'), 'Carousel regeneration must preserve manual override provenance.');
expect(regenProduct.includes('body?.product_item') && regenProduct.includes('useManualOverride'), 'Single product regeneration must support admin-supplied material.');
expect(regenProduct.includes('.eq("id", post.id)'), 'Single product regeneration must update the existing post row.');

// Domain cooldown must remain retryable instead of turning a locked-object fetch into a terminal generic error.
const resolveStart = cron.indexOf('export async function resolveLockedProductUrlForUse');
const resolveSlice = resolveStart >= 0 ? cron.slice(resolveStart, resolveStart + 7000) : '';
expect(resolveSlice.includes('getWebsiteDomainFetchState(canonicalUrl)') && resolveSlice.includes('new WebsiteRateLimitError'), 'Locked product URL resolver must rethrow active domain cooldown as WebsiteRateLimitError.');

// Home must be organised around operational schedule types and durable lifecycle actions.
for (const marker of ['recurringSchedules', 'scheduledPostsBox', 'calendarCampaignsBox', 'historyTitle', 'reviewNotice']) {
  expect(home.includes(`dashboard.${marker}`), `Home must render ${marker}.`);
}
expect(home.includes('groupOperationalPlans') && home.includes('postsPerWeek'), 'Home must group multi-platform rules into compact operational schedules.');
expect(home.includes('end_automation_rules_keep_history'), 'End schedule must preserve history through the lifecycle RPC.');
expect(home.includes('plan_state') && home.includes('plan_ended_at'), 'Home must read durable plan lifecycle state.');
expect(home.includes('legacyRulesSelect') && home.includes('lifecycleColumnsMissing'), 'Home must load safely during migration rollout.');
expect(css.includes('home-v14369-operation-row') && css.includes('home-v14369-history-modal'), 'Responsive Home operational UI styles must exist.');

// All new UI copy is English source copy behind the translation system.
for (const key of ['dashboard.recurringSchedules', 'dashboard.scheduledPostsBox', 'dashboard.calendarCampaignsBox', 'dashboard.reviewNoticeHelp', 'admin.approvals.manualOverride', 'admin.approvals.openProductSource']) {
  expect(labels.includes(`"${key}"`), `Missing i18n source key ${key}.`);
}
expect(/TRANSLATION_CACHE_VERSION = "v1[45678]"/.test(uiText), 'UI translation cache must be bumped for the new labels.');

// Durable history migration must preserve rows and release reserved credits.
expect(migration.includes("plan_state text not null default 'active'") && migration.includes('plan_ended_at timestamptz'), 'Lifecycle columns must be created.');
expect(migration.includes('end_automation_rules_keep_history') && migration.includes("plan_state = 'ended'"), 'End-plan RPC must keep the rules as ended history.');
expect(migration.includes('credits_remaining = credits_remaining + v_release_total'), 'Ending a plan must return reserved credits.');

console.log('v143.69 admin/home/lifecycle regression checks passed');
