# Patch v142.9 — semantic campaign theme and product evidence

This patch is built directly on v142.8 and retains the delivery-resume,
domain-cooldown, product-gallery image resolution, social-media sizing and
bounded senior-review work already present in that version.

## Semantic campaign theme

- The fast campaign analysis reads the complete campaign name and context.
- It does not depend on dashes, colons, title order or another delimiter.
- It produces one normalized primary theme, approved direct theme terms and
  separate secondary context.
- Every retailer-search query must contain the primary theme, a direct synonym,
  translation or unmistakable approved motif.
- Generic gifts, personalization, recipients and product formats may refine a
  query but cannot replace the primary theme.

## Product relevance evidence

- The retailer search query is discovery provenance only and never counts as
  evidence that a product has the searched property.
- A themed campaign product must contain approved evidence in its own verified
  title, description, category, tags or product URL.
- Search-result pages and campaign/category sources cannot override missing
  product evidence, a weak AI score or an AI rejection.
- The final shortlist contains only products with direct product-level theme
  evidence when a semantic theme contract is available.
- No AI image analysis was added. Existing technical main-gallery and largest
  image resolution remains unchanged.

## Candidate discovery

- Up to 120 lightweight retailer-search candidates can be retained.
- Up to 60 product pages are deeply verified, as in v142.8.
- Candidates are interleaved across all search-query groups instead of taking
  the first six groups.
- Previously used products are removed before balancing and limiting, allowing
  unused products to backfill their places.
- The search can follow structurally detected pagination within the same fixed
  24-page fetch budget.
- One primary search URL per query is tried first. If a generic endpoint fails,
  a detected alternative endpoint is queued without increasing the page budget.
- The store-search pool is not locked at five products. It gathers up to 20
  preliminary text-evidenced products and locks only with at least 15 safe
  products, giving final curation a real comparison pool.

## Runtime and cost protection

- Carousel product preparation defaults to a 210-second soft deadline and is
  capped at 240 seconds through environment configuration.
- Theme/vocabulary analysis has a 30-second default timeout.
- Fast text review has a 25-second default timeout.
- Evidence-backed candidates are fast-reviewed once after progressive
  verification, not once per verification batch.
- If a fast review times out, verified direct text evidence remains usable.
- The single senior final review remains capped at 75 seconds.
- If that review times out or returns malformed output, a bounded fallback may
  publish five verified products only when all five already have direct theme
  evidence and no weak/reject fast score.

## Final publication gate

- Optional improvement suggestions no longer make an otherwise complete
  five-product set fail.
- A missing need blocks publication only when the coverage result also confirms
  a missing required slot.
- The old behavior that deliberately sliced five selected products down to four
  has been removed.
- Five products still must pass the score, direct-theme and required-coverage
  safeguards.

## Database and deployment

- No new SQL migration is required.
- Deploy the v142.9 zip over v142.8.
- Existing v140/v141 SQL remains sufficient and should not be rerun solely for
  this patch.

## Verification

- All 21 regression scripts pass, including the new v142.9 checks.
- The Next.js 16.2.10 production build passes compilation, TypeScript checks,
  page-data collection and static generation.
