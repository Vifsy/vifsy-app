# Patch v142.8 — theme-first, bounded campaign selection

This patch is built from the stable v142.6 line. It keeps the delivery,
main-gallery, largest-image, generic product verification, Instagram sizing and
domain-cooldown work from v141.5 through v142.6. It deliberately does not keep
the expanded v142.7 search budgets and repeated senior-model workflow.

## Product discovery and relevance

- `gpt-4.1-mini` creates and evaluates the broad research pool.
- Search queries are ordered by the campaign title's own occasion, season,
  event or creative theme before generic product and gift terms.
- The rule is language-, company-, store- and ecommerce-platform-neutral.
- When at least five theme-evidenced candidates exist, the final set must have
  a majority with direct product or retailer-query evidence for that theme.
- Generic gifts, gift cards, bestsellers and personalization cannot displace a
  sufficient pool of stronger theme products.
- The verified shortlist remains capped at 20 products.

## Cost and runtime control

- Product discovery has a 240-second default soft deadline and a 270-second
  absolute configuration cap.
- The v142.6 retrieval limits are restored: 12 retailer queries, 24 store-search
  fetches and 60 deep verifications.
- There is no upfront `gpt-5.5` strategy call.
- Fast screening never escalates to `gpt-5.5`.
- `gpt-5.5` is called once for the final comparative curation only.
- The final senior call has a 75-second default timeout and a 90-second cap.
- A rejected final set does not start a new discovery/rescue/senior-review loop.

## Rotation and failed runs

- Fresh products remain preferred, but permanent no-reuse is disabled by
  default so a strong previously verified product can be used when fresh
  alternatives are exhausted.
- A run that is still `running` after 12 minutes is finalized as a terminal
  failure on the next queue tick.
- The occurrence and its run log are both closed, reserved credit is returned
  through the existing terminal-failure RPC, and the same scheduled occurrence
  is not generated again.

## Database

No new SQL migration is required when v140/v141 SQL has already been installed.
The timeout protection uses the existing occurrence claim, terminal failure,
credit refund and notification functions. Do not rerun old SQL for this patch.

## Deployment

1. Deploy the v142.8 zip.
2. If Vercel has an explicit `STRICT_PRODUCT_NO_REUSE=true`, remove it or set it
   to `false`; otherwise the new default is used automatically.
3. No SQL command is needed.

## Verification

The complete script test suite passes, including the new v142.8 regression
checks. The Next.js 16.2.10 production build, TypeScript validation, page-data
collection and static generation all pass.
