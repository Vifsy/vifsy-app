# v143.5 – Semantic campaign curation

This update keeps the delivery-safe behavior from v143.4 while correcting the
generic causes behind weak campaign selections.

## What changed

- Separates the essential campaign theme from audience/recipient words and
  product/category context.
- Retailer search queries remain useful for broad discovery, but are hidden
  from both AI product-fit reviews so a query can never prove that a result is
  relevant.
- Reviews verified products progressively in bounded batches until five
  publishable products plus reserves are ready, up to a fixed maximum and
  protected deadline.
- A broad contextual search pool no longer skips AI review or locks the final
  pool unless five products have direct product-level evidence or an explicit
  positive AI decision.
- Requires concrete product-page identity. Product cards or Product JSON-LD on
  a category/brand page cannot turn that page into a product.
- Makes the senior final review smaller and faster: 15 candidates, compact
  product facts, and evaluations only for the selected set and useful reserves.
- Keeps the deterministic delivery fallback. An optional AI timeout cannot
  erase technically verified candidates or by itself prevent a post.

## Scope

The rules are structural and work across retailers, ecommerce platforms,
languages and calendar themes. No retailer, customer, campaign or holiday has
been hardcoded.

## Database

No new SQL migration is required for v143.5. Keep the migrations already
applied for earlier versions; the existing v143.4 SQL file remains in the
package for reference and clean installations.
