import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const expect = (ok, message) => { if (!ok) throw new Error(message); };

const home = read('app/page.jsx');
const review = read('app/review/page.jsx');
const adminLayout = read('app/admin/layout.jsx');
const adminAuth = read('lib/adminAuth.js');
const videoRoute = read('app/api/video-backgrounds/route.js');
const postPage = read('app/posts/[id]/page.jsx');
const labels = read('lib/i18n/defaultLabels.js');
const builtIn = read('lib/i18n/builtInLocaleLabels.js');
const uiText = read('lib/i18n/useUiText.js');
const css = read('app/styles/38-current-experience-v143.css');

expect(home.includes('href="/review?view=queue"'), 'Customer Home review CTA must use the customer review queue.');
expect(home.includes('href="/review?view=history"'), 'Customer Home history CTA must use customer history.');
expect(!home.includes('href="/admin/post-approvals?view=queue"'), 'Customer Home must not link into admin review.');
expect(home.includes('customerReadyAdminStates') && home.includes('approved_by_spreelo'), 'Home must only count customer-ready pending approvals.');
expect(home.includes('dashboard.recurringSchedulesHelp') && home.includes('dashboard.scheduledPostsHelp') && home.includes('dashboard.calendarCampaignsHelp'), 'All three Home modules need help popovers.');
expect(home.includes('dashboard.createSchedule') && home.includes('dashboard.schedulePosts') && home.includes('dashboard.createCampaign'), 'All three Home modules need contextual creation actions.');
expect(home.includes('spreelo-action-v14371'), 'Home must use the shared Spreelo action system.');

expect(review.includes('CUSTOMER_READY_ADMIN_STATES'), 'Customer review queue must enforce internal review completion.');
expect(review.includes('.eq("user_id", user.id)') && review.includes('.eq("brand_profile_id", brand.id)'), 'Customer review queue must be scoped to the signed-in user and selected brand.');
expect(review.includes('href={`/posts/${post.id}`}'), 'Customer review rows must open the owned customer post review page.');
expect(review.includes('dashboard.customerReview.historyTitle'), 'Customer review must expose separate history.');

expect(adminLayout.includes('fetch("/api/admin/me"') && adminLayout.includes('window.location.replace("/")'), 'Admin route tree must verify access before rendering and redirect non-admins.');
expect(adminAuth.includes('SPREELO_PRIMARY_ADMIN_EMAIL') && adminAuth.includes('johan@foldern.com'), 'Admin API auth must default to the single primary admin email.');
expect(!adminAuth.includes('SPREELO_ADMIN_USER_IDS'), 'Admin API must not grant access through the old multi-admin user-id list.');
expect(videoRoute.includes('SPREELO_PRIMARY_ADMIN_EMAIL') && videoRoute.includes('johan@foldern.com'), 'Shared video background admin endpoint must use the same primary-admin restriction.');

expect(postPage.includes('waitingForInternalReview') && postPage.includes('posts.preparingTitle'), 'Direct customer post URLs must hide posts still in internal review.');
expect(postPage.includes('admin_review_status'), 'Customer post detail must load internal review state before exposing the post.');

for (const key of [
  'dashboard.sectionHelp',
  'dashboard.createSchedule',
  'dashboard.schedulePosts',
  'dashboard.createCampaign',
  'dashboard.customerReview.title',
  'dashboard.customerReview.historyTitle',
  'admin.accessChecking',
  'posts.preparingTitle',
]) {
  expect(labels.includes(`"${key}"`), `Missing English source label ${key}.`);
}
for (const key of [
  'dashboard.sectionHelp',
  'dashboard.createSchedule',
  'dashboard.schedulePosts',
  'dashboard.createCampaign',
  'dashboard.customerReview.title',
  'dashboard.customerReview.historyTitle',
  'admin.accessChecking',
  'posts.preparingTitle',
]) {
  expect(builtIn.includes(`"${key}"`), `Missing Swedish built-in label ${key}.`);
}
expect(/TRANSLATION_CACHE_VERSION = "v1[56789]"/.test(uiText), 'UI translation cache must include the v143.71 labels or a later refresh.');
expect(css.includes('.home-v14335-main { gap:14px; }'), 'Home vertical rhythm must be tightened.');
expect(css.includes('.admin-approvals-page.admin-v74-approvals-page { gap:14px'), 'Admin review vertical rhythm must be tightened.');
expect(css.includes('.customer-review-page-v14371') && css.includes('.spreelo-action-v14371'), 'Customer review and Spreelo action styles must exist.');

console.log('v143.71 customer/admin separation + Home actions regression checks passed');
