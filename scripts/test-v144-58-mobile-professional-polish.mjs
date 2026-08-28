import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const checks = [];
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
  checks.push(message);
};

const globals = read('app/globals.css');
const mobileCss = read('app/styles/58-v144-58-mobile-professional-polish.css');
const home = read('components/HomeReferenceOverview.jsx');
const automation = read('app/automation/page.jsx');
const labels = read('lib/i18n/defaultLabels.js');
const calendar = read('app/calendar/page.jsx');
const brand = read('app/brand/page.jsx');
const social = read('app/social-channels/page.jsx');
const email = read('lib/lifecycleEmails.js');

expect(globals.trimEnd().endsWith('@import "./styles/58-v144-58-mobile-professional-polish.css";'), 'v144.58 CSS is the final cascade layer');
expect(home.includes('home-reference-account-status') && home.includes('home-reference-stat-icon') && home.includes('accountActiveLabel'), 'home overview has reference-style status/stat structure without a new hardcoded non-English label');
expect(mobileCss.includes('grid-template-columns:60px minmax(0,1fr) auto') && mobileCss.includes('.home-reference-account-status'), 'mobile/tablet home overview is a vertical professional stats card');
expect(mobileCss.includes('.plan-v90-settings-grid') && mobileCss.includes('display:block !important') && mobileCss.includes('border-bottom:1px solid #e5e9ef'), 'plan settings are consolidated into one continuous mobile/tablet card');
expect(mobileCss.includes('.plan-v70-activate-card.saved') && mobileCss.includes('grid-area:actions'), 'saved-plan actions use a balanced responsive card');
expect(automation.includes('className="spreelo-saving-spinner"') && automation.includes('className="spreelo-saving-dots"'), 'plan activation visibly animates while saving');
expect(labels.includes('\"automation.savingWorkingV14458\": \"Saving\"') && automation.includes('t(\"automation.savingWorkingV14458\")'), 'activation saving uses a new translation key without static dots');
expect(automation.includes('window.location.href = \"/\";') && labels.includes('\"automation.planActivated.homeV14458\": \"Go to Home\"') && automation.includes('t(\"automation.planActivated.homeV14458\")'), 'activated one-time/weekly plan handoff goes to Home instead of a calendar that does not show the result');
expect(labels.includes('\"automation.planActivated.textHomeV14458\": \"Spreelo has activated your plan and will prepare the content automatically.\"') && automation.includes('t(\"automation.planActivated.textHomeV14458\")'), 'activated plan uses a new localized copy key that no longer claims it is shown in the AI calendar');
expect(calendar.includes('campaign.visual_image_url || "/calendar-generic.svg"') && calendar.includes('onError={(event)'), 'campaign cards always have a generic visual fallback, including broken image URLs');
expect(brand.includes('brand-analysis-progress-percent') && !brand.includes('className="brand-analysis-percent" aria-live="polite"'), 'brand-analysis percentage is integrated into the progress module');
expect(mobileCss.includes('position:static !important;\n    grid-area:purpose') && mobileCss.includes('grid-area:cost') && mobileCss.includes('grid-area:channel'), 'planned-post metadata stays in normal flow on mobile/tablet');
expect(social.includes('font-size:17px') && social.includes('spreeloSpin') && social.includes('You will be redirected automatically.'), 'secure sign-in popup has readable copy and a visible loader');
expect(email.includes('<td align="center" style="padding:32px 16px">') && email.includes('align="center" width="100%"'), 'lifecycle email card uses reliable symmetric mobile gutters and centered width');

console.log(`v144.58 QA passed (${checks.length} checks).`);
