import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const globals = await readFile(new URL("app/globals.css", root), "utf8");
const home = await readFile(new URL("components/HomeReferenceOverview.jsx", root), "utf8");
const page = await readFile(new URL("app/page.jsx", root), "utf8");
const css = await readFile(new URL("app/styles/117-v144-150-home-content-plan-intelligence.css", root), "utf8");

assert.ok(globals.includes('@import "./styles/117-v144-150-home-content-plan-intelligence.css";'));
assert.match(home, /home-plan-overview-card recurring/);
assert.match(home, /home-plan-overview-card scheduled/);
assert.match(home, /home-plan-overview-card campaign/);
assert.match(home, /Nästa inlägg/);
assert.match(home, /Nästa körning/);
assert.match(home, /Innehåll/);
assert.match(home, /planContentTypes/);
assert.match(home, /plannedItemStatus/);
assert.match(page, /content_type_label \|\| rule\?\.content_type_id/);
assert.match(css, /home-plan-overview-facts/);
assert.match(css, /font-size:12\.5px !important/);
assert.match(css, /@media \(max-width:900px\)/);
assert.match(css, /@media \(max-width:620px\)/);
assert.match(css, /home-reference-recurring-meta\.home-reference-recurring-meta-rich/);

console.log("v144.150 Home content-plan intelligence checks passed");
