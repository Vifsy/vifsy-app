import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(path, 'utf8');
const cron = read('app/api/cron/run-automations/route.js');
const adminApi = read('app/api/admin/post-approvals/route.js');
const adminPage = read('app/admin/post-approvals/page.jsx');
const regenerate = read('app/api/admin/post-approvals/regenerate/route.js');

const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}

check(
  'Terminal failures create durable admin repair cases before occurrence finalization',
  cron.indexOf('await upsertAdminReviewCase(supabase, repairCaseValues);') <
    cron.indexOf('supabase.rpc("fail_automation_occurrence_terminal"')
);
check(
  'Incomplete carousel failure forwards the verified partial products to admin repair',
  cron.includes('identityPoolError.partialProducts = websiteItems.map') &&
    cron.includes('partial_products: error.partialProducts.slice(0, 5)') &&
    cron.includes('admin_product_items: repairProductItems')
);
check(
  'Existing admin product materials are preserved when a later failure has no new partial list',
  cron.includes('...(repairProductItems.length ? { product_items: repairProductItems } : {})')
);
check(
  'Admin workbench reads durable needs-repair cases even when occurrence finalization is incomplete',
  adminApi.includes('.from("admin_review_cases")') &&
    adminApi.includes('.eq("status", "needs_repair")') &&
    adminApi.includes('reviewOnlyFailures') &&
    adminApi.includes('review-case-')
);
check(
  'Failed carousel repair is prefilled from durable case product materials',
  adminApi.includes('reviewCaseByOccurrence.get(occurrence.id)?.product_items') &&
    adminApi.includes('admin_product_items: Array.isArray(reviewCase.product_items)')
);
check(
  'Admin carousel is ready with exactly five image + name + URL products',
  adminPage.includes('item.image_url && item.title?.trim() && item.url?.trim()')
);
check(
  'Admin repair no longer requires product description',
  !/carouselReady[\s\S]{0,500}description\?\.trim/.test(adminPage) &&
    regenerate.includes('Product information/description is optional')
);
check(
  'Admin repair requires product URL',
  regenerate.includes('!item.image_url || !item.title || !item.url') &&
    adminPage.includes('Product URL (required)')
);
check(
  'Old and newly added products may be mixed without replacing all five',
  adminPage.includes('Keep any products that are already correct and replace only the ones you want') &&
    regenerate.includes('may be a mix of old products and newly added products')
);
check(
  'Regeneration caption is rebuilt only from the five admin-supplied products',
  regenerate.includes('Use only those five products') &&
    regenerate.includes('do not invent missing details')
);
check(
  'Generation failures send immediate admin email alerts',
  cron.includes('async function sendImmediateAdminFailureAlertEmail') &&
    cron.includes('SPREELO_ADMIN_EMAILS') &&
    cron.includes('Immediate admin failure alert email sent') &&
    /if \(handled\)[\s\S]{0,2500}sendImmediateAdminFailureAlertEmail/.test(cron)
);
check(
  'Permanent social publishing failures also alert admin while transient retries do not',
  cron.includes('if (!shouldRetry)') &&
    cron.includes('kind: "publish"') &&
    cron.includes('social_publish_failed')
);
check(
  'Synthetic durable review cases are not sent to the normal post archive endpoint',
  adminPage.includes('value.startsWith("review-case-")') &&
    adminPage.includes('!isSyntheticAdminCaseId(selectedPost.id)')
);

console.log(`v143.59 admin repair + immediate alerts checks passed (${checks.length}/${checks.length}).`);
