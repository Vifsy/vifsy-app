import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const globals = read('app/globals.css');
const currentCss = read('app/styles/38-current-experience-v143.css');
const legacyCss = read('app/styles/15-legacy-overrides-v94-v114.css');
const calendarCss = read('app/styles/28-calendar-admin-v130-v140.css');
const brand = read('app/brand/page.jsx');
const social = read('app/social-channels/page.jsx');
const settings = read('app/settings/page.jsx');
const automation = read('app/automation/page.jsx');
const defaultLabels = read('lib/i18n/defaultLabels.js');
const sv = read('lib/i18n/builtInLocaleLabels.js');
const lifecycle = read('lib/lifecycleEmails.js');

const imports = [...globals.matchAll(/^@import\s+"\.\/styles\/([^"]+)";/gm)].map((m) => m[1]);
check('active CSS cascade remains consolidated', imports.length >= 18 && imports.length <= 19);
check('legacy override bundle is imported', imports.includes('15-legacy-overrides-v94-v114.css'));
check('calendar/admin bundle is imported', imports.includes('28-calendar-admin-v130-v140.css'));
check('current experience bundle remains active before scoped feature layers', imports.includes('38-current-experience-v143.css') && ['38-current-experience-v143.css','39-social-channels-v143-42.css'].includes(imports.at(-1)));
check('old v143 override layers are no longer imported', !imports.some((name) => /^4[4-9]-v143-|^50-v143-|^51-v143-/.test(name)));
check('historical source archive exists', exists('app/styles/archive-v143/51-v143-39-responsive-workspace-refinement.css'));

check('brand ready/setup badge remains removed', !brand.includes('brand-profile-hero-badge'));
check('social compact shell remains present', social.includes('social-v14339-connect-shell'));
check('settings plan and credits remain live', settings.includes('user_credit_balances') && settings.includes('settings-v14339-credit-card'));
check('settings subscription/security sections remain present', settings.includes('settings.subscriptionTitle') && settings.includes('settings.securityTitle'));
check('timezone compact secondary layout remains in active CSS', currentCss.includes('.plan-v143-timezone-inline'));
check('mobile analysis fixed-header clearance remains in active CSS', currentCss.includes('.brand-result-backdrop') && currentCss.includes('--spreelo-mobile-header-total'));
check('mobile social icon stack remains in active CSS', currentCss.includes('.plan-v74-channel-stack') && currentCss.includes('.plan-v74-channel-chip'));
check('campaign mobile detail remains readable one-column', currentCss.includes('.campaign-calendar-v143-summary') && currentCss.includes('grid-template-columns: 1fr'));
check('localized campaign brief remains wired', automation.includes('automation.campaignBrief.awareness') && defaultLabels.includes('automation.campaignBrief.awareness') && sv.includes('automation.campaignBrief.awareness'));
check('analysis completion email remains wider', lifecycle.includes('max-width:690px'));
check('legacy bundle contains historical plan/review styles', legacyCss.includes('plan-v95') || legacyCss.includes('review'));
check('calendar bundle contains current campaign calendar styles', calendarCss.includes('campaign-calendar-v134') || calendarCss.includes('campaign-calendar-v133'));

for (const file of [
  'public/backgrounds/spreelo-brand-intelligence-v143-39-mobile.webp',
  'public/backgrounds/spreelo-social-hero-v143-39.svg',
  'public/backgrounds/spreelo-social-hero-mobile-v143-39.svg',
  'public/backgrounds/spreelo-studio-hero-v143-39.svg',
  'public/backgrounds/spreelo-studio-hero-mobile-v143-39.svg',
  'public/backgrounds/spreelo-settings-hero-v143-39.svg',
  'public/backgrounds/spreelo-settings-hero-mobile-v143-39.svg',
]) check(`asset exists: ${file}`, exists(file));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? '✓' : '✗'} ${item.name}`);
if (failed.length) {
  console.error(`\n${failed.length} v143.40 checks failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} v143.40 checks passed.`);
