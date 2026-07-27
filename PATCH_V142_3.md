# Spreelo v142.3 – generic search-first campaign products

This patch makes the retailer's own product search the primary campaign
retrieval path on every supported website. It is not tied to Boozt, Zalando,
Magento, Shopify, WooCommerce, or any other named retailer or platform.

## What changed

- Preserves the customer's real search spelling, including Unicode characters
  such as `ä`, `å`, and `ö`.
- Searches for concrete products and categories before broad campaign themes.
- Collects candidates across several search terms so the first broad query
  cannot consume the entire verification budget.
- Verifies search results progressively in batches of 15, up to a bounded
  maximum of 60 candidates, and stops as soon as five products plus reserves
  are ready.
- Accepts a technically verified product from an exact retailer search query
  without requiring the product page itself to repeat the campaign occasion.
  AI must still avoid rejecting the product and all normal product/detail/image
  verification remains active.
- Inspects search forms both on the supplied page and on the store origin.
- Adds a bounded rendered-search fallback for stores whose product results are
  inserted by JavaScript.
- Runs direct retailer search first, then domain web search, and finally Store
  Map as a fallback when five suitable products still cannot be assembled.
- Replaces the misleading “only X products verified” failure text with separate
  technical-verification and final-selection counts.

## Zalando/general product-page regression

The v142.2 generic product verification changes remain included and are covered
by regression tests:

- image paths no longer cause a false Magento classification;
- generic product URLs ending in `.html` can be recognized;
- the main product metadata wins over recommendation cards;
- ambiguous JavaScript product pages receive a bounded rendered-page fallback.

These rules are generic and apply to equivalent page structures on other
websites as well.

## Deployment

Deploy the complete v142.3 zip over the current v142.2 deployment.

No new SQL migration or environment variable is required for this patch.

