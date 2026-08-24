# Spreelo v144.35 — Product discovery recovery

- Restores three non-price product-discovery helpers accidentally removed in v144.34:
  - `getProductUrlFromJsonLd`
  - `extractJsonLdProductCandidatesFromHtml`
  - `extractProductUrlCandidatesFromText`
- Keeps product-price extraction and product-price display removed.
- Preserves verification, stock, identity and campaign metadata when normalizing website products.
- Treats a freshly verified official product page with a real purchase action and no out-of-stock/discontinued signal as currently purchasable, for platforms that do not expose literal `in_stock` text.
- Explicit out-of-stock/discontinued signals remain blocking.
- No SQL or environment-variable changes required.
