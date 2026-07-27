# Patch v142.6 — dynamic marketing curation

This patch builds on v142.5 and keeps all earlier delivery, product-image,
main-gallery, market-matching and domain-cooldown fixes.

## Generic campaign strategy

- Adds one senior `gpt-5.5` strategy pass before campaign product research.
- Builds five dynamic selection slots from the campaign, audience, Brand
  profile, persistent Store Map and verified website catalog.
- Does not contain retailer-, industry-, language- or category-specific product
  roles.
- Distinguishes required product-page evidence from preferences and search
  clues.
- Merges strategy-created queries into the existing generic website research
  flow.

## Research and final selection

- Keeps `gpt-4.1-mini` responsible for broad store, catalog and domain research.
- Expands the senior shortlist from 15 to 20 verified candidates.
- Makes `gpt-5.5` curate one coherent five-product marketing set instead of
  filling five independent score positions.
- Requires an explicit publication-ready decision, dynamic slot coverage and
  product-level evidence.
- Removes automatic score-based backfilling when the senior curator selected
  fewer than five products.
- Logs every senior evaluation, including rejected products and reasons.

## Targeted rescue

- When the complete set is not publication-ready, runs one targeted rescue
  search based on the exact missing needs returned by the senior curator.
- Uses `gpt-4.1-mini` for rescue research and verification.
- Runs a second senior curation pass only when new verified rescue candidates
  were found.
- Stops instead of publishing a non-coherent or unsupported set when the
  targeted rescue still cannot complete the carousel.

## Verification

Run:

```bash
pnpm test:v142.3
pnpm test:v142.4
pnpm test:v142.5
pnpm test:v142.6
pnpm build
```
