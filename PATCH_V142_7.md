# Patch v142.7 – professional first-run campaign selection

This patch replaces the previous “collect many products, then filter” campaign
path with a campaign-strategy-driven workflow designed to finish with a
professional five-product carousel in the first automation run.

## What changed

- A senior campaign model first turns the campaign into five distinct,
  company-neutral marketing roles.
- Web research searches the configured customer domain separately for every
  role and returns several alternatives per role.
- Concrete, purchasable products are preferred. Generic gift cards and vouchers
  are excluded unless the campaign itself explicitly promotes them.
- Cached products, retailer search and Store Map remain useful discovery
  sources, but they can no longer bypass the mandatory senior final review.
- Store Map cannot finish a campaign early with five products from one narrow
  category.
- The final review requires five different roles, five unique product URLs and
  five unique usable product images.
- If coverage is incomplete, rescue discovery searches only for the missing
  roles. It does not repeat an expensive senior review when no new eligible
  products were found.
- Website rate limiting is recorded without immediately abandoning all other
  discovery paths.
- The campaign preparation budget is increased to 420 seconds inside the
  existing 600-second route limit so the complete workflow can finish in one
  run.
- Candidate and slot diagnostics were expanded so future run logs show why each
  product was researched, reviewed, selected or rejected.

## Validation

- All repository test scripts pass, including the new v142.7 invariants.
- JavaScript syntax validation passes.
- Next.js 16.2.10 production build passes.
- Sharp 0.34.5 and libvips 8.17.3 runtime verification passes.

## Database

No SQL migration is required for v142.7.
