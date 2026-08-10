import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const dashboard = read('app/admin/page.jsx');
const economics = read('app/admin/content-credits/page.jsx');
const economicsApi = read('app/api/admin/content-economics/route.js');
const overviewApi = read('app/api/admin/overview/route.js');
const css = read('app/styles/38-current-experience-v143.css');
const labels = read('lib/i18n/defaultLabels.js');
const sv = read('lib/i18n/builtInLocaleLabels.js');
const sql = read('supabase/v143_76_admin_professional_stats.sql');
const formats = read('app/admin/content-formats/page.jsx');

assert(dashboard.includes('admin.insights.title'), 'Admin dashboard must render business & usage insights.');
assert(overviewApi.includes('loadBusinessInsights'), 'Admin overview API must aggregate business insights.');
assert(overviewApi.includes('topCustomersByCredits'), 'Insights must include top customers by credits.');
assert(overviewApi.includes('topBrands'), 'Insights must include top brands.');
assert(overviewApi.includes('topFormats'), 'Insights must include top content formats.');
assert(economics.includes('resetReliability'), 'Content & Credits must provide reliability reset.');
assert(economics.includes('["reset", "7d", "30d", "all"]'), 'Content & Credits must support since-reset statistics.');
assert(economicsApi.includes('reset_reliability'), 'Content economics API must support safe reset markers.');
assert(economicsApi.includes('stats_reset_at'), 'Content economics API must use reset timestamps.');
assert(sql.includes('stats_reset_at timestamptz'), 'v143.76 SQL must add stats_reset_at.');
assert(!sql.toLowerCase().includes('delete from automation_run_logs'), 'Reliability reset must never delete historical run logs.');
assert(labels.includes('"admin.dashboard.title": "Admin dashboard"'), 'English must remain the Admin source language.');
assert(sv.includes('"admin.dashboard.title": "Adminöversikt"'), 'Swedish built-in Admin translation must exist.');
assert(formats.includes('admin.formats.orderHelp'), 'Display order purpose must be explained in the format library.');
assert(css.includes('admin-insight-grid'), 'Professional Admin insights styling must exist.');
assert(css.includes('professional Admin workspace polish'), 'Shared Admin polish block must exist.');


const adminFiles = [
  'app/admin/page.jsx',
  'app/admin/credits/page.jsx',
  'app/admin/customers/page.jsx',
  'app/admin/customers/[id]/page.jsx',
  'app/admin/image-backgrounds/page.jsx',
  'app/admin/content-credits/page.jsx',
  'app/admin/content-formats/page.jsx',
];
for (const file of adminFiles) {
  const source = read(file);
  assert(!/[ÅÄÖåäö]/.test(source.replace(/admin\.[A-Za-z0-9_.]+/g, '')), `${file} still contains hard-coded Swedish source copy.`);
}

console.log('v143.76 professional Admin insights/reliability regression passed');
