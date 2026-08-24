# Spreelo v144.36 — Turbopack regex build fix

## Problem
v144.35 restored product-discovery helpers, but two regex literals in `extractProductUrlCandidatesFromText()` were written with string-style double escaping. Turbopack therefore failed to parse `app/api/cron/run-automations/route.js` and Vercel stopped during `next build` before deployment.

Broken source:

```js
/https?:\\/\\/[^"'<>\\s]+/gi
/["']((?:\\/[^"'<>\\s]+){1,})["']/g
```

## Fix
Use valid JavaScript regex-literal escaping:

```js
/https?:\/\/[^"'<>\s]+/gi
/["']((?:\/[^"'<>\s]+){1,})["']/g
```

The escaped-slash cleanup expression was also corrected to match one literal backslash followed by `/`.

No product-price functionality was restored. All v144.35 product-discovery, availability and no-price behavior remains unchanged.

## Verification
- `node --check app/api/cron/run-automations/route.js`
- syntax-checked all 276 `.js`, `.mjs` and `.cjs` files in the package: 0 failures
- v144.34 no-product-price/Quickbutik regression test passes
- v144.35 product-discovery/purchasability regression test passes
- v144.36 regex/build regression test passes

A full local `pnpm install && pnpm build` could not be executed in the sandbox because outbound access to `registry.npmjs.org` is unavailable. The exact parser failure reported by Turbopack is removed and the affected JavaScript now parses successfully with Node.

No SQL or environment-variable changes are required.
