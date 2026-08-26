# Spreelo v144.53 — Kling repair workflow, protected catalogs & durable UI translations

## Why this patch exists

v144.52 exposed three separate reliability/cost issues during live tests:

1. A finished Kling video could be correctly rejected by the product-identity audit, but Admin only looked like it had fallen back to a still image and did not clearly explain the rejection or offer a cheap video-only retry.
2. Known 403 / anti-bot product sources could still fall back into older direct-crawl code paths after indexed research had already established that direct access was blocked.
3. First-time UI translation of a large Admin namespace still sent 80 labels with a 12-second provider timeout, causing repeated `UI translation chunk deferred` warnings.

v144.53 addresses those without adding retailer-specific rules.

## 1. Stronger Kling product lock before the paid generation

`app/api/cron/run-automations/route.js`

The Kling motion prompt now explicitly locks:

- every visible component's role, attachment, geometry and mechanical state;
- logos, emblems, letters, numbers, label graphics and printed marks character-for-character;
- existing parts against being reinterpreted as another feature/accessory;
- mechanically uncertain products to passive product motion, moving the camera/person/environment instead.

This targets failures such as a stroller component becoming a new sunshade and product label characters changing during motion.

## 2. Finished-video audit remains, but rejected videos become actionable Admin cases

`app/api/cron/finalize-kling-videos/route.js`

- The finished-video identity audit is retained because it can prevent a paid but visibly altered product from being delivered.
- Audit results now include `violation_codes` for clear Admin presentation.
- The audit prompt explicitly requires the booleans to agree with the written reason.
- A confirmed finished-video identity rejection is recorded with failure code `KLING_FINISHED_PRODUCT_IDENTITY_REJECTED`.

`app/admin/post-approvals/page.jsx`
`app/api/admin/post-approvals/route.js`
`app/styles/38-current-experience-v143.css`
`lib/i18n/defaultLabels.js`

Admin now shows a dedicated **Video rejected** state with:

- the audit explanation;
- verified product name;
- audit confidence;
- readable violation reasons;
- a **Generate video again** action.

The rejected Kling video no longer masquerades as an ordinary image-only post.

## 3. One-click Kling-only retry

New route:

`app/api/admin/post-approvals/retry-kling/route.js`

The manual retry:

- is allowed only for a Kling video rejected by the finished-video product audit;
- reuses the already verified product, copy and Kling reference/opening frame;
- does **not** run product discovery again;
- does **not** regenerate the product image;
- submits exactly one new Kling task;
- uses a new post record so the existing one-generation-per-post guard remains intact;
- archives the rejected post and moves the Admin review case to the replacement;
- adds an extra retry-specific product lock to the existing Kling prompt.

There is still no automatic paid Kling retry loop.

## 4. UI translation chunks are smaller and persist progressively

`app/api/ui-translations/route.js`

Changed from:

- chunk size: 80
- concurrency: 4
- per-provider timeout: 12 s

To:

- chunk size: 32
- concurrency: 2
- per-provider timeout: 24 s
- route max duration: 60 s

Most importantly, every successful chunk is written to `ui_translation_packs` immediately. If another chunk times out, the successful translations remain permanently stored and are not paid for again on the next attempt. Only still-missing/deferred labels remain eligible for a future retry.

## 5. Product-source type is classified during brand analysis

`app/api/analyze-brand/route.js`
`app/api/analyze-brand/brandAnalysisEngine.js`

Brand analysis now classifies an approved website product source as one of:

- `ecommerce`
- `retailer_catalog`
- `manufacturer_catalog`
- `service_catalog`
- `menu`
- `booking`
- `listing`
- `course_event`
- `other`

No database migration is required. The normalized source type is stored in the existing `website_product_mode_reason` metadata as a machine-readable prefix, while existing profiles remain backward compatible through runtime inference.

A `manufacturer_catalog` is valid even without direct checkout or stock counters. Its product requirement is current official catalog presence on the target market, not direct manufacturer inventory.

## 6. Known protected websites cannot fall back into direct crawling

`app/api/cron/run-automations/route.js`

Once the website domain state is known to be protected, all three direct crawler entry points stop before network crawling:

- focused category discovery;
- direct store-search discovery;
- general website product discovery.

The single-product preparation path also skips expanded direct discovery after a protected state has been established.

Protected manufacturer catalogs use current official-product evidence, while protected ecommerce/retailer sources keep their current purchase/stock verification rules.

Automatic protected-source occurrence retry is now deliberately bounded to:

- one retry;
- 30-minute delay.

This prevents a failed protected-source research occurrence from being picked up repeatedly every few minutes and repeatedly paying for the same research.

## 7. Single-product discovery stops earlier

`lib/storeMapProductAgent.js`
`app/api/cron/run-automations/route.js`

For one-product posts:

- minimum verified product target is now 1 instead of 4;
- optional reserve target is 1 instead of 3;
- Store Map page/shelf limits are reduced;
- once a strong primary product lock exists, optional direct reserve discovery is skipped rather than reopening a large crawl.

Carousel-scale targets remain substantially larger and are not reduced to single-product levels.

## Verification performed

Syntax checks passed for all modified `.js` routes/libraries.

Regression checks passed:

- v144.24 protected product delivery/state
- v144.25 professional Kling advertising
- v144.31 Kling single-flight/cache
- v144.35 product discovery + purchasability
- v144.36 Turbopack regex/build
- v144.42 strict Kling product identity
- v144.43 market/locale product lock
- v144.47 Kling functional truth
- v144.48 video music library
- v144.49 Admin-managed music library
- v144.50 authoritative post language
- v144.52 market assortment + content-language separation
- v144.53 Kling/Admin/protected-source/i18n regression checks

Additional Kling regressions passed for v144.07, v144.09, v144.33, v144.44 and both v144.46 product-lock fallback tests.

Some much older versioned test scripts contain literal assertions for superseded constants/strings (for example historical translation chunk size/timeout values) and are intentionally not used as v144.53 acceptance criteria.

A full local Next.js build was not run because this workspace does not contain installed dependencies / pnpm. Vercel remains the authoritative full build check.

## Database / deployment

No SQL migration is required for v144.53.
