# Spreelo v144.51 — Vercel build hotfix

## Fixed
- Corrected a malformed ES module import in `app/api/admin/post-approvals/regenerate-product/route.js` introduced by v144.50.
- `resolveContentLanguagePreference` is now imported as a standalone import before the existing named import block from `run-automations/route.js`.

## Scope
- No behavior changes to v144.50 authoritative customer-language logic.
- No behavior changes to video music library, Kling generation, product lock, or typography.

## Verification
- `node --check` passed for:
  - `app/api/admin/post-approvals/regenerate-product/route.js`
  - `app/api/admin/post-approvals/regenerate-any/route.js`
  - `lib/contentLanguage.js`
  - `app/api/cron/run-automations/route.js`
- Regression tests passed:
  - v144.43 market/locale product lock
  - v144.47 Kling functional truth
  - v144.48 video music library
  - v144.49 admin-managed video music library
  - v144.50 authoritative post language
