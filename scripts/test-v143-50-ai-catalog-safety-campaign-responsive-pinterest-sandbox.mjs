import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const worker = fs.readFileSync(path.join(root, 'app/api/cron/run-automations/route.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'app/automation/page.jsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app/styles/38-current-experience-v143.css'), 'utf8');
const pinterest = fs.readFileSync(path.join(root, 'lib/pinterestOAuth.js'), 'utf8');

const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}

check('Brand profile exposes ecommerce/product-mode signal to image generation',
  worker.includes('website_product_mode_available'));
check('General AI image prompt forbids invented catalog merchandise',
  worker.includes('Never invent, design or depict a sellable product, merchandise item'));
check('Product-selling brands get explicit lifestyle-first catalog reality direction',
  worker.includes('This is a product-selling business. This AI-image path does not receive a verified product image reference'));
check('General AI image prompt explicitly redirects fishing/diving apparel campaigns to lifestyle scenes',
  worker.includes('show an authentic fishing or diving situation rather than AI-designed fishing/diving T-shirts'));
check('Website product ad keeps the supplied reference as the only sellable product',
  worker.includes('The supplied reference is the only sellable product you may depict'));
check('Carousel outro no longer permits invented product-like objects',
  worker.includes('Do not invent product-like objects that could be mistaken for merchandise from the store'));

check('Campaign row has one schedule wrapper', page.includes('campaign-v14350-schedule-block'));
check('Campaign row has one delivery wrapper', page.includes('campaign-v14350-delivery-block'));
check('Unlocked time picker is nested inside schedule wrapper',
  page.indexOf('campaign-v14350-schedule-block') < page.indexOf('campaign-v14346-time-picker'));
check('Three-dot action menu remains present', page.includes('campaign-v14348-row-actions'));
check('Campaign delete action remains present', page.includes('removeCampaignSlot(slot.id)'));

check('Desktop campaign rows use compact five-column layout',
  css.includes('grid-template-columns: 86px minmax(260px, 1fr) minmax(185px, 220px) minmax(190px, 280px) 42px'));
check('Tablet campaign rows use ordered art/copy/schedule/delivery/menu areas',
  css.includes('"art schedule menu"') && css.includes('"art delivery menu"'));
check('Mobile campaign artwork no longer stretches to full card height',
  css.includes('width: 54px !important;') && css.includes('height: 54px !important;'));
check('Schedule wrapper raises popover stacking context',
  css.includes('.campaign-v14350-schedule-block:has(.custom-calendar-popover)'));

check('Pinterest environment variable is supported', pinterest.includes('PINTEREST_API_ENV'));
check('Pinterest Sandbox base URL is supported', pinterest.includes('https://api-sandbox.pinterest.com/v5'));
check('OAuth token exchange uses environment-aware Pinterest base URL',
  pinterest.includes('`${getPinterestApiBaseUrl()}/oauth/token`'));
check('Boards use environment-aware Pinterest base URL',
  pinterest.includes('new URL(`${getPinterestApiBaseUrl()}/boards`)'));
check('Pin publishing uses environment-aware Pinterest base URL',
  worker.includes('fetch(`${getPinterestApiBaseUrl()}/pins`'));

console.log(`v143.50 checks passed: ${checks.length}/${checks.length}`);
