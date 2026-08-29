import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const globals = await readFile(new URL("app/globals.css", root), "utf8");
const css = await readFile(new URL("app/styles/62-v144-62-home-detail-polish.css", root), "utf8");
const home = await readFile(new URL("components/HomeReferenceOverview.jsx", root), "utf8");

assert.ok(globals.trimEnd().endsWith('@import "./styles/62-v144-62-home-detail-polish.css";'));
assert.match(home, /href="\/review\?view=history"/);
assert.doesNotMatch(home, /href="\/calendar"><History/);
assert.match(css, /--home-plan-accent/);
assert.match(css, /border-radius:14px 0 0 0/);
assert.match(css, /mask-image:linear-gradient\(to bottom/);
assert.match(css, /home-reference-plans[\s\S]*row-gap:12px !important/);
assert.match(css, /home-reference-focus > span[\s\S]*font-size:13px !important/);
assert.match(css, /white-space:nowrap/);
assert.match(css, /align-items:flex-start/);
assert.match(css, /grid-template-rows:auto !important/);
assert.match(css, /min-height:59px/);

console.log("v144.62 Home detail polish checks passed");
