import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const brand = read('app/brand/page.jsx');
const social = read('app/social-channels/page.jsx');
const settings = read('app/settings/page.jsx');
const automation = read('app/automation/page.jsx');
const globals = read('app/globals.css');
const css = read('app/styles/51-v143-39-responsive-workspace-refinement.css');
const defaultLabels = read('lib/i18n/defaultLabels.js');
const sv = read('lib/i18n/builtInLocaleLabels.js');
const lifecycle = read('lib/lifecycleEmails.js');

check('brand ready/setup badge removed from JSX', !brand.includes('brand-profile-hero-badge'));
check('social channels use one compact shell', social.includes('social-v14339-connect-shell'));
check('settings load plan and credit data', settings.includes('user_credit_balances') && settings.includes('settings-v14339-credit-card'));
check('settings include subscription, notifications and security', settings.includes('settings.subscriptionTitle') && settings.includes('settings.notificationsTitle') && settings.includes('settings.securityTitle'));
check('timezone gets dedicated compact secondary layout', css.includes('.plan-v143-timezone-inline'));
check('mobile analysis modal clears the fixed header', css.includes('.brand-result-backdrop') && css.includes('--spreelo-mobile-header-total'));
check('mobile planned-post channels scale as icon stack', css.includes('.plan-v74-channel-stack') && css.includes('.plan-v74-channel-chip'));
check('campaign expanded mobile content is one readable column', css.includes('.campaign-calendar-v143-summary') && css.includes('grid-template-columns:1fr'));
check('campaign user-visible brief is localized', automation.includes('automation.campaignBrief.awareness') && defaultLabels.includes('automation.campaignBrief.awareness') && sv.includes('automation.campaignBrief.awareness'));
check('analysis completion email is wider', lifecycle.includes('max-width:690px'));
check('new responsive CSS is last global layer', globals.trim().endsWith('@import "./styles/51-v143-39-responsive-workspace-refinement.css";'));
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
  console.error(`\n${failed.length} checks failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} v143.39 checks passed.`);
