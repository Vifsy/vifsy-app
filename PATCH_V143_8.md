# V143.8 storefront search quality and rejection authority

## Confirmed from the latest production run

The three tested campaign carousels were delivered, but the Boozt school-start
carousel selected adult products. The final senior review already said that
the supplied pool did not contain five suitable child/youth products, yet the
fast delivery recovery restored products scored `does_not_fit`.

## Fixed

- Explicit `does_not_fit` decisions are now final. Search keywords, generated
  campaign roles and delivery recovery cannot revive a rejected product.
- A successful senior review is authoritative. Only products it evaluated and
  accepted can enter the final set; a smaller theme-safe set can still be
  delivered when five accepted products are unavailable.
- The bounded timeout fallback keeps only non-rejected products with meaningful
  campaign evidence instead of filling slots with arbitrary verified products.
- Storefront language detection now recognizes `/eu/en/` as an English
  storefront instead of mistaking the regional `/eu/` segment for a language.
- Fallback store searches preserve locale paths such as `/eu/en/` or `/se/sv/`
  before trying the bare origin.
- Short retailer-native head queries are requested and prioritized so broad,
  useful searches are not pushed outside the eight-page fetch budget.
- A page classified as a product with both product schema and ecommerce proof
  is accepted even when the discovered URL omits a retailer-specific variant
  suffix.
- Fast and senior prompts explicitly reject clear recipient conflicts such as
  adult products in a child campaign.

## Delivery behavior

The existing delivery-first behavior remains. A campaign can publish a reduced
carousel with at least two accepted products instead of inserting products
that the senior review rejected.

No new SQL is required.
