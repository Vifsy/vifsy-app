# Spreelo v144.50 — Authoritative customer-facing post language

Built from v144.49.

## Why
v144.43 correctly locked product discovery to the configured market/locale, but a separate copy-language gap remained:

- AI Studio can store `language = Auto`.
- The runtime previously interpreted `Auto` as "follow the user's instruction" instead of resolving it from the analyzed brand language.
- The brand profile text sent to copy generation did not explicitly include `content_language` or market.
- Kling overlay subcopy could reuse a product/storefront descriptor. A valid product page can contain metadata from a sibling locale even when the customer-facing post language is different.
- The post row could normalize an unresolved `Auto` value to English.

That allowed a correctly selected product to still leak a Danish/German/etc. descriptor into otherwise Swedish content.

## Fix
### One authoritative runtime language
Every automation occurrence now resolves one effective post language before product discovery or generation:

1. An explicit non-Auto language selected by the customer wins.
2. Otherwise `brand_profiles.content_language` from the website/business analysis wins.
3. Otherwise the configured website URL/locale is used as fallback.
4. Only then is English used as the final fallback.

The resolved language is placed on the in-memory rule as both `language` and `content_language`, so the same value is used by:

- product market/locale filtering,
- caption generation,
- image/video marketing copy,
- Kling prompt context,
- typography language context,
- and the saved post language.

A diagnostic `Automation post language resolved` log records the language and source (`explicit_rule`, `brand_analysis`, `website_locale`, or `fallback`).

### Brand language is visible to the copy model
The formatted brand profile now includes:

- Market
- Content language

The Auto fallback instruction also explicitly says that product metadata or alternate storefront locales must never override the analyzed customer-facing language.

### No foreign storefront descriptor in Kling overlay
Kling's customer-facing subheadline is no longer sourced from a product-page/storefront descriptor.

- The headline still comes from the language-locked generated caption, with the exact product/model name as a safe identity fallback.
- Any optional subheadline must come from the already language-locked caption.
- If no short safe caption line exists, the subheadline stays blank rather than showing a correct product descriptor in the wrong language.

### Global language coverage
The content-language normalizer now understands additional native/common language values including Japanese and Simplified Chinese, plus Korean, Thai, Turkish, Indonesian, Ukrainian, Russian, Bulgarian, Vietnamese, Czech, Romanian, Hungarian, Greek, Malay and Filipino.

Clean language names detected by brand analysis that are not yet in the manual dropdown (for example Uzbek) are preserved instead of silently falling back to English.

### Admin regeneration
Admin text/product regeneration uses the same language-preference resolver, so regenerated content follows the same analyzed customer-facing language rules.

## Unchanged
- v144.43 market/locale product lock remains active.
- v144.47 product lock and functional-truth safeguards remain active.
- v144.49 admin-managed video music library remains active.
- No extra AI language-validation call was added.
- No SQL migration.
- No new environment variables.
- No retailer-specific code.

## Regression checks
Passed:

- v144.42 complete headline + strict Kling product identity
- v144.43 market/locale product lock
- v144.44 deliberate Kling ending
- v144.47 Kling functional truth
- v144.47 generic verified-page lock bridge
- v144.48 video music library
- v144.49 admin-managed video music library
- v144.50 authoritative post-language checks
- Node syntax checks for the modified runtime/admin routes and content-language module
