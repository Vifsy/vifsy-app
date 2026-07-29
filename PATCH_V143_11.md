# v143.11 — authoritative GPT-5.5 domain web agent

This version supersedes v143.10. Do not deploy v143.10.

## Campaign carousel flow

For a whole-site campaign carousel, Spreelo now sends GPT-5.5 the same short
task used in the successful manual test:

`Hitta 10 passande produkter från {customer-domain} för {campaign-theme}.`

GPT-5.5 uses hosted web search restricted to the customer's domain and returns
ten ranked direct product pages. Ranks 1–5 are the carousel and ranks 6–10 are
the ordered reserve.

That ranking is authoritative:

- no Product Engine semantic/page-proof verification;
- no local score or freshness reranking;
- no second senior review;
- no Store Map or store-search replacement;
- no persistent 180-candidate pool on this route.

Spreelo only fetches technical title, price and the largest usable product image
from the selected URLs. A cached image may be reused only when it belongs to the
same exact product URL.

If fewer than five selected URLs provide usable image assets, GPT-5.5 performs
one more identical domain web-search round while excluding every URL already
returned. The legacy discovery pipeline is still not used.

Explicit customer-selected category/focus URLs retain the established focused
v143.8 flow. Other v143.8 behavior is unchanged.

## Deployment

- No SQL migration.
- No new required environment variable.
- `PRODUCT_RESEARCH_MODEL` still defaults to `gpt-5.5`.
- Optional existing timeout setting:
  `CAMPAIGN_PRIMARY_WEB_RESEARCH_TIMEOUT_MS`.

## Verification

- `node scripts/test-v143-11-authoritative-gpt55-web-agent.mjs`
- `node scripts/test-v143-8-school-search-quality.mjs`
- `node scripts/test-v142-largest-product-images.mjs`
- `node scripts/test-product-engine-v2.mjs`
- full Next.js production build
