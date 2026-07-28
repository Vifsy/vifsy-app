import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routePath = path.join(root, "app/api/cron/run-automations/route.js");
const route = fs.readFileSync(routePath, "utf8");

const fallbackBlock = route.slice(
  route.indexOf("const canUseCampaignDeliveryFallback"),
  route.indexOf("if (canUseCampaignDeliveryFallback)")
);
assert.match(fallbackBlock, /isCarouselRule\(rule\)/);
assert.match(fallbackBlock, /isCampaignScopedWebsiteRule\(rule\)/);
assert.doesNotMatch(
  route,
  /\bisCampaignProductCarouselRule\b/,
  "The delivery fallback must not call a helper that does not exist"
);

const require = createRequire(import.meta.url);
const parser = require("next/dist/compiled/babel/parser.js");
const traverse = require("next/dist/compiled/babel/traverse.js").default;
const ast = parser.parse(route, {
  sourceType: "module",
  plugins: ["jsx"],
  errorRecovery: false,
});

const allowedGlobals = new Set([
  "AbortController",
  "AbortSignal",
  "Array",
  "ArrayBuffer",
  "Atomics",
  "BigInt",
  "BigInt64Array",
  "BigUint64Array",
  "Blob",
  "Boolean",
  "Buffer",
  "DataView",
  "Date",
  "Error",
  "EvalError",
  "FinalizationRegistry",
  "Float32Array",
  "Float64Array",
  "FormData",
  "Function",
  "Headers",
  "Infinity",
  "Int16Array",
  "Int32Array",
  "Int8Array",
  "Intl",
  "JSON",
  "Map",
  "Math",
  "NaN",
  "Number",
  "Object",
  "Promise",
  "Proxy",
  "RangeError",
  "ReferenceError",
  "Reflect",
  "RegExp",
  "Request",
  "Response",
  "Set",
  "SharedArrayBuffer",
  "String",
  "Symbol",
  "SyntaxError",
  "TextDecoder",
  "TextEncoder",
  "TypeError",
  "URIError",
  "URL",
  "URLSearchParams",
  "Uint16Array",
  "Uint32Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "WeakMap",
  "WeakRef",
  "WeakSet",
  "WebAssembly",
  "atob",
  "btoa",
  "clearImmediate",
  "clearInterval",
  "clearTimeout",
  "console",
  "crypto",
  "decodeURI",
  "decodeURIComponent",
  "encodeURI",
  "encodeURIComponent",
  "escape",
  "eval",
  "fetch",
  "global",
  "globalThis",
  "isFinite",
  "isNaN",
  "parseFloat",
  "parseInt",
  "performance",
  "process",
  "queueMicrotask",
  "setImmediate",
  "setInterval",
  "setTimeout",
  "structuredClone",
  "undefined",
  "unescape",
]);

const unboundReferences = new Map();
traverse(ast, {
  ReferencedIdentifier(identifierPath) {
    const name = identifierPath.node.name;
    if (
      allowedGlobals.has(name) ||
      identifierPath.scope.hasBinding(name)
    ) {
      return;
    }
    const locations = unboundReferences.get(name) || [];
    locations.push(identifierPath.node.loc?.start?.line || null);
    unboundReferences.set(name, locations);
  },
});

assert.deepEqual(
  Object.fromEntries(unboundReferences),
  {},
  "The automation worker must not contain unbound runtime references"
);

console.log("v143.7 fallback runtime and unbound-reference tests passed.");
