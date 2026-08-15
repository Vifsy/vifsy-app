import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const resolver = read("lib/productImageResolver.js");
const headless = read("lib/headlessProductImageBrowser.js");
const cron = read("app/api/cron/run-automations/route.js");

// All product-image srcset paths must preserve commas that belong to CDN
// query parameters. This is the Intersport regression that previously
// produced fake candidates such as /h=1600 and /quality=85.
assert.match(resolver, /function parseSrcset[\s\S]*?\.split\(\/,\\s\+\(\?=\\S\)\/\)/);
assert.equal((headless.match(/value\.split\(\/,\\s\+\(\?=\\S\)\/\)/g) || []).length, 2);
assert.match(cron, /function splitSrcsetUrls[\s\S]*?\.split\(\/,\\s\+\(\?=\\S\)\/\)/);

assert.doesNotMatch(resolver, /function parseSrcset[\s\S]{0,300}?\.split\(["']?,["']?\)/);
assert.doesNotMatch(headless, /srcset[\s\S]{0,900}?value\.split\(["']?,["']?\)/);

const splitSrcset = (value) =>
  String(value || "")
    .split(/,\s+(?=\S)/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const intersport =
  "https://cdn.intersport.se/images/prod/161776001000_10?w=1600,h=1600,quality=85,fit=pad,background=%23f8f9fa 1600w, https://cdn.intersport.se/images/prod/161776001000_10?w=800,h=800,quality=80,fit=pad 800w";
const parsed = splitSrcset(intersport);

assert.equal(parsed.length, 2);
assert.ok(parsed[0].includes("w=1600,h=1600,quality=85,fit=pad"));
assert.ok(parsed[1].includes("w=800,h=800,quality=80,fit=pad"));
assert.ok(parsed.every((entry) => !/^h=|^quality=|^fit=/.test(entry)));

console.log("v143.97b global srcset parser regression passed.");
