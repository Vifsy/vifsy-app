import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routePath = path.join(root, "app/api/cron/run-automations/route.js");
const source = fs.readFileSync(routePath, "utf8");

const syntax = spawnSync(process.execPath, ["--check", routePath], {
  cwd: root,
  encoding: "utf8",
});
assert.equal(syntax.status, 0, syntax.stderr || "route.js must parse as JavaScript");

assert.ok(
  source.includes('/\\/[^/?#]+-p\\d{3,}/i.test(lower)'),
  "item URL regex must use regex-literal escaping, not string escaping"
);
assert.ok(
  source.includes('/\\/[^/?#]+\\d{5,}/i.test(lower)'),
  "numeric item URL regex must use regex-literal escaping, not string escaping"
);
assert.ok(
  !source.includes('/\\\\/[^/?#]+-p\\\\d{3,}/i.test(lower)'),
  "Turbopack-invalid double-escaped item regex must not return"
);
assert.ok(
  !source.includes('/\\\\/[^/?#]+\\\\d{5,}/i.test(lower)'),
  "Turbopack-invalid double-escaped numeric item regex must not return"
);

const itemPattern = /\/[^/?#]+-p\d{3,}/i;
const numericPattern = /\/[^/?#]+\d{5,}/i;
assert.equal(itemPattern.test("https://shop.test/catalog/widget-p12345"), true);
assert.equal(numericPattern.test("https://shop.test/catalog/widget12345"), true);

console.log("v144.37 Turbopack item-regex regression checks passed.");
