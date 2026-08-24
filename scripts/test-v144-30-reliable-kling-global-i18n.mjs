import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const finalizer = read('app/api/cron/finalize-kling-videos/route.js');
const nextConfig = read('next.config.mjs');
const uiRoute = read('app/api/ui-translations/route.js');
const uiHook = read('lib/i18n/useUiText.js');
const defaults = read('lib/i18n/defaultLabels.js');
const builtIn = read('lib/i18n/builtInLocaleLabels.js');
const settings = read('app/settings/page.jsx');

function assert(ok, msg) { if (!ok) throw new Error(msg); }

assert(!finalizer.includes('validateKlingVideoProductView'), 'blocking finished-video product audit must be removed');
assert(finalizer.includes('fractions: [0.28, 0.72]'), 'typography should use two representative frames');
assert(nextConfig.includes('"/api/cron/finalize-kling-videos*"'), 'finalizer route must trace native runtime files');
assert(nextConfig.includes('@sparticuz+chromium@*/node_modules/@sparticuz/chromium/**/*'), 'pnpm chromium payload must be traced');
assert(defaults.includes('export const DEFAULT_UI_LOCALE = "en"'), 'English must remain the only source/default locale');
assert(!uiHook.includes('getBuiltInLocaleLabel'), 'UI hook must not bypass persistent language packs');
assert(!builtIn.includes('SWEDISH_CRITICAL_FLOW_LABELS'), 'compatibility shim must contain no Swedish runtime pack');
assert(!settings.includes('SETTINGS_DELETE_COPY'), 'Settings must not embed per-language delete-account dictionaries');
assert(uiRoute.includes('.from("ui_translation_packs")'), 'non-English labels must persist in ui_translation_packs');
assert(uiRoute.includes('repairableFailedKeys'), 'repair pass must distinguish validation failures from transport timeouts');
assert(uiRoute.includes('repairableFailedKeys: []'), 'transport failures must not immediately retry');

console.log('v144.30 regression checks passed');
