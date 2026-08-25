# Patch v144.47 — Functional Truth + Universal Exact-Page Product Lock

## 1. Kling may not invent product functionality

Product videos now distinguish **visual interaction safety** from **functional truth**.

A complete/full product reference only proves that the visible product geometry may be preserved during natural interaction. It does **not** prove how the product operates.

New hard rules apply to both the generated opening frame and the Kling motion prompt:

- Do not invent or infer buttons, pumps, sprayers, dispensers, latches, hinges, opening methods, removable parts, controls, outputs, transformations or operating sequences.
- Operation is allowed only when the exact action is explicitly supported by verified product data, or when direct physical use is universally self-evident from the visible object (for example pedaling a bicycle, walking in shoes, wearing clothing or sitting on a chair).
- If functionality is uncertain, keep the product mechanically passive and create motion with the person, hand, camera, props or environment.
- Perfume/cosmetic containers may be held/presented, but may not be pressed, sprayed, pumped, dispensed, opened or have parts removed unless the exact mechanism is verified.
- Functional-truth rules are repeated in the final Kling safety tail so an earlier creative idea cannot override them.

This prevents a visually plausible but false product demonstration from misleading the customer.

## 2. Universal exact-page verification bridge

The Product Engine already verifies many exact product pages successfully. Previously, final locking reparsed the same page with a stricter parser and could reject a product even though the exact page and its product image had already been strongly verified.

v144.47 carries that verification provenance forward and can reuse it as the final product lock when all of these conditions are true:

- exact product page was verified;
- one concrete product was verified;
- the image was extracted/bound from that exact product page;
- same-page technical identity was verified;
- image source page equals the exact product URL;
- product/page confidence passes the existing thresholds;
- URL belongs to the configured website/market;
- URL is not a category/search/discovery page;
- image URL passes existing product-image safety checks.

Listing/search thumbnails do not qualify unless they already carry exact-page provenance.

There is no retailer-specific Emmaljunga exception. The bridge applies to any compatible storefront structure.

## 3. Exhaust verified pools before giving up

- Store-search locking can now attempt the complete already-verified pool rather than an arbitrary fixed subset.
- Web-research results are attempted one by one; one product lock failure no longer kills the entire occurrence.
- Already-verified web-research products are tried before another AI repair is purchased.
- Only after that verified pool is exhausted may one bounded exact-asset AI repair run, after which normal discovery fallbacks continue.

## Preserved fixes

- v144.45 fractional final video duration compatibility (`6.75s` metadata / integer DB field).
- v144.44 deliberate Kling ending and stable final hero hold.
- v144.46 category/store-search candidate fallback.
- Existing strict product identity, market/locale, cache/single-flight and typography protections.

## Regression checks

Passed:

- v144.09 Kling fractional-duration finalization
- v144.25 professional Kling advertising
- v144.31 Kling single-flight/cache
- v144.33 typography fallback/backoff
- v144.39 universal reliable product lock
- v144.40 product-image gate isolation
- v144.42 strict Kling product identity
- v144.43 market/locale product lock
- v144.44 deliberate Kling ending
- v144.46 focused product-lock fallback
- v144.46 store-search product-lock fallback
- v144.47 Kling functional truth
- v144.47 verified exact-page lock bridge

`node --check` also passes for the modified automation route and Kling finalizer.
