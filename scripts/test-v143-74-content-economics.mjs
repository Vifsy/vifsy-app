import fs from 'node:fs';

function read(path) { return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'); }
function expect(condition, message) { if (!condition) throw new Error(message); }

const page = read('app/admin/content-credits/page.jsx');
const api = read('app/api/admin/content-economics/route.js');
const sql = read('supabase/v143_74_content_economics.sql');
const credits = read('lib/credits.js');
const economics = read('lib/contentEconomics.js');
const formats = read('lib/contentFormatLibrary.js');
const automation = read('app/automation/page.jsx');
const dashboard = read('app/admin/page.jsx');
const css = read('app/styles/38-current-experience-v143.css');
const uiText = read('lib/i18n/useUiText.js');
const labels = read('lib/i18n/defaultLabels.js');
const sv = read('lib/i18n/builtInLocaleLabels.js');

expect(page.includes('admin-content-economics-page'), 'Content & Credits admin page is missing.');
expect(page.includes('setShowCreate(true)'), 'Admin must be able to add catalog content types with +.');
expect(page.includes('customer_credit_cost'), 'Admin page must expose customer credit cost.');
expect(page.includes('estimated_cost_sek'), 'Admin page must expose estimated production cost.');
expect(page.includes('available_starter') && page.includes('available_growth') && page.includes('available_pro'), 'Plan availability controls are missing.');
expect(page.includes('pending_credit_cost') && page.includes('pending_effective_at'), 'Scheduled future pricing controls are missing.');
expect(page.includes('applyBulk'), 'Bulk edit controls are missing.');
expect(page.includes('usage_30d'), '30-day operational statistics are missing.');
expect(page.includes('audit'), 'Audit history UI is missing.');

expect(api.includes('getAdminContext(request)'), 'Content economics API must be admin protected.');
expect(api.includes('content_credit_audit'), 'Content economics API must write/read an audit trail.');
expect(api.includes('automation_run_logs'), 'Content economics API must load generation performance.');
expect(api.includes('credit_reservation_events'), 'Content economics API must load credit usage.');
expect(api.includes('is_custom: true') && api.includes('active: false'), 'New custom types must start catalog-only and disabled.');

expect(sql.includes('customer_credit_cost integer not null default 10'), 'SQL must add configurable customer credit cost.');
expect(sql.includes('pending_credit_cost integer'), 'SQL must support future credit changes.');
expect(sql.includes('create table if not exists public.content_credit_audit'), 'SQL must create the audit table.');
expect(sql.includes('reference_credit_value_sek'), 'SQL must create the margin reference setting.');

expect(credits.includes('CUSTOM_UPLOADED_IMAGE: 10'), 'Credit scale must use the 10x customer-facing unit.');
expect(credits.includes('AI_PRODUCT_AD: 20'), 'AI product ad default must be 20 credits.');
expect(credits.includes('ANIMATED_PRODUCT_VIDEO: 50'), 'Animated product Reel default must be 50 credits.');
expect(economics.includes('getConfiguredContentCreditCost'), 'Effective scheduled credit resolver is missing.');
expect(formats.includes('includeCustom = false'), 'Content format normalization must safely separate catalog-only custom types.');
expect(formats.includes('generator_available: false'), 'Custom catalog rows must not become generators automatically.');

expect(automation.includes('getCurrentCreditCost'), 'AI Content Studio must use configured credit costs for new plans.');
expect(automation.includes('config[`available_${currentPlanKey}`] !== false'), 'AI Content Studio must honor plan availability.');
expect(automation.includes('config.display_label || translateContentTypeShortLabel(type)'), 'Customer-visible name overrides must be respected.');
expect(dashboard.includes('href="/admin/content-credits"'), 'Admin dashboard must link to Content & Credits.');
expect(css.includes('v143.74 — Admin Content & Credits economics control center'), 'v143.74 styles are missing.');
expect(uiText.includes('TRANSLATION_CACHE_VERSION = "v16"'), 'Translation cache must be refreshed for v143.74 labels.');
expect(labels.includes('"admin.contentCredits.title": "Content & Credits"'), 'English source labels are missing.');
expect(sv.includes('"admin.contentCredits.title": "Innehåll & krediter"'), 'Swedish critical fallback labels are missing.');

console.log('v143.74 Content & Credits regression checks passed');
