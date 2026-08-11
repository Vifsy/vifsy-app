import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const expect = (ok, message) => { if (!ok) throw new Error(message); };

const home = read('app/page.jsx');
const adminPage = read('app/admin/post-approvals/page.jsx');
const approvalRoute = read('app/api/admin/post-approvals/route.js');
const labels = read('lib/i18n/defaultLabels.js');
const builtIn = read('lib/i18n/builtInLocaleLabels.js');
const uiText = read('lib/i18n/useUiText.js');
const css = read('app/styles/38-current-experience-v143.css');

expect(home.includes('admin_review_status, admin_reviewed_at, approval_email_sent_at'), 'Home must load admin review state when calculating the approval queue.');
expect(home.includes('customerReadyAdminStates') && home.includes('approved_by_spreelo'), 'Home must only count posts that have completed Spreelo review and now await the customer.');
expect(home.includes('/review?view=queue'), 'Home review CTA must open the customer review queue, not a random post.');
expect(home.includes('/review?view=history'), 'Home must expose customer content review history.');
expect(home.includes('home-v14370-module recurring') && home.includes('home-v14370-module scheduled') && home.includes('home-v14370-module campaign'), 'The three operational Home modules must use the Spreelo module treatment.');

expect(adminPage.includes('return ["queue", "failed", "history"].includes(view) ? view : "queue"'), 'Review page must default to the queue and support direct History links.');
expect(adminPage.includes('admin.approvals.queueTitle') && adminPage.includes('admin.approvals.historyTitle'), 'Review page must expose queue and history views.');
expect(adminPage.includes('admin-v14370-review-thumb') && adminPage.includes('admin-v14370-review-main'), 'Review queue must render rich preview rows.');
expect(adminPage.includes('nextUrl.searchParams.set("view", value)'), 'Review tabs must keep the current view in the URL.');

expect(approvalRoute.includes('status === "queue"') && approvalRoute.includes('status === "history"'), 'Admin API must have explicit queue/history semantics.');
expect(approvalRoute.includes('["approved", "rejected"].includes(post.status)'), 'History must include customer decisions.');
expect(approvalRoute.includes('completedAdminReviewStates.has'), 'History must include posts already approved by Spreelo.');

for (const key of ['dashboard.contentHistory', 'dashboard.planHistory', 'admin.approvals.queue', 'admin.approvals.history', 'admin.approvals.queueTitle', 'admin.approvals.historyTitle']) {
  expect(labels.includes(`"${key}"`), `Missing English source label ${key}.`);
  expect(builtIn.includes(`"${key}"`), `Missing Swedish built-in label ${key}.`);
}
expect(/TRANSLATION_CACHE_VERSION = "v1[45678]"/.test(uiText), 'Translation cache must be refreshed so newly added labels are fetched in other languages.');
expect(css.includes('home-v14370-review-hub') && css.includes('home-v14370-module') && css.includes('admin-v14370-review-list'), 'v143.70 Spreelo Home/review visual styles must exist.');

console.log('v143.70 Spreelo Home/review queue regression checks passed');
