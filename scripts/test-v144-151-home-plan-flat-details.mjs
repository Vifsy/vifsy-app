import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const globals = await readFile(new URL("app/globals.css", root), "utf8");
const home = await readFile(new URL("components/HomeReferenceOverview.jsx", root), "utf8");
const css = await readFile(new URL("app/styles/118-v144-151-home-plan-flat-details.css", root), "utf8");

assert.ok(globals.includes('@import "./styles/118-v144-151-home-plan-flat-details.css";'));
assert.doesNotMatch(home, /Inget återkommande schema körs just nu/);
assert.doesNotMatch(home, /Inga engångsinlägg ligger i kö/);
assert.doesNotMatch(home, /Ingen kalenderkampanj är aktiv just nu/);
assert.match(css, /grid-template-rows:auto !important/);
assert.match(css, /height:auto !important/);
assert.match(css, /home-plan-overview-next-item/);
assert.match(css, /background:transparent !important/);
assert.match(css, /home-reference-plan-manager/);
assert.match(css, /box-shadow:none !important/);
assert.match(css, /home-reference-recurring-item/);
assert.match(css, /border-top:1px solid #edf0f4 !important/);
assert.match(css, /@media \(max-width:900px\)/);
assert.match(css, /@media \(max-width:620px\)/);

console.log("v144.151 flat Home plan details checks passed");
