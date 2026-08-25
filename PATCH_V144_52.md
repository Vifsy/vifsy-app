# Spreelo v144.52 — Market assortment + content language separation

## Goal
Keep two independent authorities:

- **Product market**: the analyzed customer market / country decides which storefront and purchasable assortment Spreelo may use.
- **Content language**: the customer's explicit Content language decides caption, image copy and video overlay language, even when that language differs from the product market.

Example: market Sweden + Content language German => products from the Swedish assortment, all customer-facing copy in German.

## Changes

### Market-aware storefront discovery
- Whole-website product runs now resolve a market-specific official storefront before product discovery.
- Supports official same-brand host transitions (for example a country domain redirecting to a global domain with `/sv-se`).
- Uses official locale links first and bounded derived market-locale candidates as a fallback.
- Resolver is cached for six hours and falls back to the configured source without failing the post if no market-specific route can be proven.
- Added global market support including SE/DK/NO/FI/DE/etc. plus CN/HK/KR/TW/SG/IN/ZA/UZ.

### Content language no longer filters products
- Removed Content language from market filtering.
- Product filtering now uses `country_code`, then `content_market`, then website market signals.
- A Swedish-market product can therefore be advertised in Swedish, German, English, Chinese, etc. when that is the chosen Content language.

### Shopify localized assortment preservation
- `products.json` and collection JSON discovery now use the localized storefront base (`/sv-se`, `/da-dk`, etc.) instead of silently falling back to the bare origin.
- Generated product URLs retain that localized storefront base.

### Verify products before the single-product deadline is consumed
- Single-product Store Map refresh has a protected time budget so it cannot consume nearly the entire 95-second product-agent window.
- Focused category discovery stops gathering candidates earlier and reserves time for actual product-page verification.
- Single-product verification is bounded to a useful small pool rather than carousel-scale work.
- Store Map early exit now requires deeply verified products; category-card fallbacks no longer count as deep verification.
- Category cards remain available as a non-terminal fallback so this does not introduce a new hard-failure path.

### Market-specific Store Map cache handling
- If a market storefront such as `/sv-se` is resolved but the cached Store Map contains no meaningful market-scoped nodes, Spreelo refreshes the map instead of trusting stale/global navigation.

### Diagnostics
- Runtime log now reports both the resolved post language and independent product market.
- Logs market-specific storefront resolution and market-specific Store Map refresh decisions.

## Important
- No retailer-specific code was added.
- No SQL migration is required.
- Video music library from v144.49 remains unchanged.
- Kling functional-truth/product-identity protections remain unchanged.

## Regression checks
Passed:
- v144.35 product discovery + purchasability
- v144.36 Turbopack regex/build
- v144.37 Turbopack item regex
- v144.39 universal reliable product lock
- v144.43 market/locale lock (updated contract)
- v144.44 deliberate Kling ending
- v144.46 focused/store-search product lock fallbacks
- v144.47 Kling functional truth
- v144.47 verified-page lock bridge
- v144.48 video music library
- v144.49 admin music library
- v144.50 authoritative post language
- v144.52 market assortment + language separation
- `node --check app/api/cron/run-automations/route.js`
