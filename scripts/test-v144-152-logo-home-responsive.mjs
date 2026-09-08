import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const globals = await readFile(new URL("app/globals.css", root), "utf8");
const route = await readFile(new URL("app/api/cron/run-automations/route.js", root), "utf8");
const brand = await readFile(new URL("app/brand/page.jsx", root), "utf8");
const css = await readFile(new URL("app/styles/119-v144-152-logo-top-left-home-plan-responsive.css", root), "utf8");

assert.ok(globals.includes('@import "./styles/119-v144-152-logo-top-left-home-plan-responsive.css";'));

// Logo lifecycle / source of truth.
assert.match(brand, /const shouldEnableUploadedLogo = logoUrl \? logoEnabledByDefault !== false : true/);
assert.match(brand, /logo_url: null/);
assert.match(brand, /logo_storage_path: null/);
assert.match(brand, /logo_enabled_by_default: false/);
assert.match(brand, /logoUrl && logoEnabledByDefault \?/);
assert.doesNotMatch(brand, /brand-v144124-preview-logo-corner \$\{logoUrl \? "has-logo" : "is-example"\}/);

// Editorial Product Post placement and fail-closed fresh logo state.
assert.match(route, /placement: "top-left"/);
assert.match(route, /const left = margin;\n  const top = margin;/);
assert.match(route, /logo_enabled_by_default: false/);
assert.match(route, /disabling logo for this run/);
assert.match(route, /lowest 9–10%/);
assert.match(route, /TOP-LEFT corner/);

// Responsive content plans: explicit placement prevents old generic article > div rules from winning.
assert.match(css, /@media \(min-width:901px\) and \(max-width:1450px\)/);
assert.match(css, /grid-template-areas:"icon copy action"/);
assert.match(css, /> \.home-plan-overview-icon/);
assert.match(css, /> \.home-plan-overview-copy/);
assert.match(css, /> \.home-plan-overview-action/);
assert.match(css, /@media \(max-width:900px\)/);
assert.match(css, /grid-template-areas:"icon copy" "\. action"/);
assert.match(css, /font-size:12\.5px !important/);
assert.match(css, /box-shadow:none !important/);

console.log("v144.152 logo + responsive Home plan checks passed");
