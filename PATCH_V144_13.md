# Spreelo v144.13 — Campaign identity lock

v144.13 is based directly on v144.12 and is intentionally isolated to campaign-context safety.

## Problem fixed

An AI product ad for a Black Friday campaign could visually look strong but introduce a different occasion such as Father's Day in the generated marketing text. The product/image pipeline itself was not the problem; campaign identity could be contaminated by supporting context or model creativity.

## Changes

- Added one shared `CAMPAIGN IDENTITY LOCK` derived from Spreelo's existing semantic campaign/theme contract.
- The lock identifies the one active campaign/occasion and tells every downstream creative prompt that other named campaigns/holidays/occasions are forbidden.
- The lock is semantic and uses the existing campaign contract/strategy. It does not add a fixed Swedish/English holiday dictionary.
- Main post-copy generation receives the lock.
- The existing product-copy identity validation request now also validates campaign identity in the same API request.
- If campaign contamination is detected, the existing safe rewrite path repairs the text before it reaches image generation.
- AI product-ad image prompts treat the lock as authoritative over supporting caption/product context, so a contaminated supporting field cannot override the active campaign.
- Generic campaign images inherit the same lock through the shared visual-context prompt.
- Product-carousel slide/outro copy inherits the same lock.
- Kling creative direction inherits the same lock.
- Exact selected product names remain authoritative; if a product name itself contains occasion-like wording, it may be preserved as the product name without turning that wording into a second campaign.

## Deliberately unchanged

- Product discovery and candidate counts.
- Inet/403 indexed fallback.
- GPT-5.5 exact product repair.
- Product ranking/selection.
- Reserve-product behavior.
- Exact original product-image lock and image verification.
- Existing failure/recovery behavior.
- v144.12 generation-cost tracking.
- Social publishing integrations.

Normal successful generation does not gain a new campaign-validation API request: campaign validation is folded into the product identity validation request that already existed. If a real campaign conflict is detected, the existing rewrite path may perform a repair call before expensive image generation.

## Files changed from v144.12

- `app/api/cron/run-automations/route.js`
- `package.json`
- added `scripts/test-v144-13-campaign-identity-lock.mjs`
- documentation / v144.13 SQL alias
