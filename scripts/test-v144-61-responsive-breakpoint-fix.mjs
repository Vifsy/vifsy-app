import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const globals = await readFile(new URL("app/globals.css", root), "utf8");
const css = await readFile(new URL("app/styles/61-v144-61-responsive-breakpoint-fix.css", root), "utf8");

assert.ok(
  globals.trimEnd().endsWith('@import "./styles/61-v144-61-responsive-breakpoint-fix.css";'),
  "v144.61 must remain the final CSS layer",
);
assert.match(css, /@media \(min-width:1451px\)/);
assert.match(css, /min-height:38px/);
assert.match(css, /@media \(min-width:901px\) and \(max-width:1450px\)/);
assert.match(css, /width:20px !important/);
assert.match(css, /@media \(max-width:900px\)[\s\S]*home-reference-review a:not\(\.primary\)[\s\S]*display:none !important/);

console.log("v144.61 responsive breakpoint fix checks passed");
