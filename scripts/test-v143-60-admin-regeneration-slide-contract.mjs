import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(path, 'utf8');
const regenerate = read('app/api/admin/post-approvals/regenerate/route.js');
const adminPage = read('app/admin/post-approvals/page.jsx');
const cron = read('app/api/cron/run-automations/route.js');

const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}

check(
  'Admin regeneration stores every product and outro row with the supported content slide type',
  !regenerate.includes('slide_type: "product_outro"') &&
    (regenerate.match(/slide_type: "content"/g) || []).length >= 3
);
check(
  'Admin regeneration preserves product/outro meaning in carousel_slide_role metadata',
  regenerate.includes('carousel_slide_role: "product"') &&
    (regenerate.match(/carousel_slide_role: "product_outro"/g) || []).length >= 2
);
check(
  'Admin regeneration follows the same database slide contract as the normal carousel generator',
  cron.includes("slide_type: 'content'") &&
    regenerate.includes('post_slides.slide_type is a database-level structural type')
);
check(
  'A defensive pre-save guard blocks unsupported slide types before replacing existing slides',
  regenerate.includes('const invalidSlideType = slides.find((slide) => slide.slide_type !== "content")') &&
    regenerate.indexOf('const invalidSlideType') < regenerate.indexOf('const insertSlides')
);
check(
  'Database save errors are returned as explicit regeneration save errors',
  regenerate.includes('Regeneration could not be saved:')
);
check(
  'Regeneration errors are shown inside the open admin detail modal',
  adminPage.includes('regenerationError') &&
    adminPage.includes('admin-regeneration-inline-alert') &&
    adminPage.includes('<AlertTriangle size={16} />')
);
check(
  'Successful regeneration is confirmed inside the detail modal',
  adminPage.includes('regenerationSuccess') &&
    adminPage.includes('Carousel regenerated successfully with')
);
check(
  'A newly created repaired post stays selected after the admin list refresh',
  adminPage.includes('async function loadPosts(preferredSelectedPostId = "")') &&
    adminPage.includes('await loadPosts(result.post_id)') &&
    adminPage.includes('setSelectedPostId(result.post_id)')
);
check(
  'Manual refresh does not accidentally pass the click event as a preferred post id',
  adminPage.includes('onClick={() => loadPosts()}')
);

console.log(`v143.60 admin regeneration slide-contract checks passed (${checks.length}/${checks.length}).`);
