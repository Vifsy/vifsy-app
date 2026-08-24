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

assert.match(source, /\/https\?:\\\/\\\/\[\^"'<>\\s\]\+\/gi/);
assert.match(source, /\/\["'\]\(\(\?:\\\/\[\^"'<>\\s\]\+\)\{1,\}\)\["'\]\/g/);
assert.doesNotMatch(source, /\/https\?:\\\\\/\\\\\//, "URL regex must not be string-double-escaped");

const absolutePattern = /https?:\/\/[^"'<>\s]+/gi;
const relativePattern = /["']((?:\/[^"'<>\s]+){1,})["']/g;

assert.deepEqual(
  'x https://example.com/products/test?q=1 y'.match(absolutePattern),
  ['https://example.com/products/test?q=1']
);
assert.equal(relativePattern.exec('<a href="/for-henne/vibratorer/lelo-nea-3">')?.[1], '/for-henne/vibratorer/lelo-nea-3');

console.log("v144.36 Turbopack regex/build regression checks passed.");
