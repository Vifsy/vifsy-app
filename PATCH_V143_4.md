# Spreelo v143.4 — Theme-safe delivery

This patch keeps the v143.3 delivery ladder intact while making the final
carousel choice deterministic when AI review is slow or unavailable.

- Current-theme product evidence always ranks before contextual products,
  generic reserves and products explicitly tied to another occasion.
- Competing occasions are ranking-only. No technically valid product is
  removed, so 5 / 2–4 / 1 / 0-product delivery fallbacks remain available.
- Senior final review is skipped when five direct-theme products already
  exist. Otherwise it has a shorter bounded timeout and cannot override the
  deterministic theme order.
- Larger images must match the current product image identity. An unrelated
  product image found elsewhere in page data can no longer replace it.
- Website-content history writes are idempotent and tolerate an already-saved
  product without turning the completed post into a warning.
- Candidate-queue logs now report whether persistence actually succeeded.
- Product prices are no longer mistaken for free-shipping thresholds merely
  because the same page contains a shipping banner.
- Common UTF-8 mojibake is repaired before campaign matching and output.

## Required SQL

Run `supabase/v143_4_delivery_safety.sql` once before deploying. It includes
and hardens the v143.3 rule-scoped candidate-queue migration.
