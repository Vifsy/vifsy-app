import fs from 'node:fs';
import assert from 'node:assert/strict';

const home = fs.readFileSync(new URL('../components/HomeReferenceOverview.jsx', import.meta.url), 'utf8');
const billing = fs.readFileSync(new URL('../components/StripeBillingPanel.jsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../app/styles/120-v144-153-home-inline-plans-billing-responsive.css', import.meta.url), 'utf8');
const globals = fs.readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

assert(!/Visa detaljer|Dölj detaljer/.test(home), 'Old detail toggles must be removed');
assert(!/showRecurringSchedules|showScheduledItems|showCampaignSchedules/.test(home), 'Old expansion state must be removed');
assert.match(home, /recurringSchedules\.map/);
assert.match(home, /scheduledItems\.map/);
assert.match(home, /campaignSchedules\.map/);
assert.match(home, /home-plan-inline-list-v153/);
assert.match(home, /home-plan-inline-row-v153/);
assert.match(billing, /stripe-reference-plan-heading-line/);
assert.match(billing, /stripe-reference-current-badge/);
assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\).*important/);
assert.match(css, /@media \(min-width:801px\) and \(max-width:1420px\)/);
assert.match(css, /@media \(min-width:801px\) and \(max-width:1050px\)/);
assert.match(css, /@media \(max-width:800px\)/);
assert.match(globals, /120-v144-153-home-inline-plans-billing-responsive\.css/);

console.log('v144.153 Home inline plans + billing responsive checks passed.');
