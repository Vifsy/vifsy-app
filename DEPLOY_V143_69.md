# Spreelo v143.69

## Deployment order

1. Run `supabase/v143_69_plan_lifecycle_history.sql` in the Supabase SQL Editor.
2. Deploy the complete application from this archive.

The SQL migration adds durable `active / paused / ended` lifecycle state for schedules and an authenticated RPC that ends a schedule without deleting its history. Any still-reserved credits are returned when a schedule is ended.

## Main changes

- Product review is URL-first for Product Post, AI Product Ad, Animated Product Reel and Product Carousel.
- Admin can manually override product brand, name, type, variant, SKU, price, description and image when a source page cannot be fetched.
- Manual overrides are clearly marked and are preserved during regeneration until `Reset to source` is used.
- Every product-based review exposes the original product URL; single-product posts also have a quick `Open product` action at the top of the review workspace.
- Regeneration updates the existing post row; failed occurrences without a post can still be repaired into a new post.
- Admin polling no longer overwrites unsaved product edits. Product edits must be regenerated before customer approval.
- Home now focuses on Recurring schedules, Scheduled posts and Calendar campaigns, plus a compact approval notice and History.
- Recurring/campaign plans can be paused, activated or ended. Ended/completed plans leave the active Home view and remain in History.
- Product fetches that encounter an active website-domain cooldown are surfaced as retryable rate-limit errors instead of terminal locked-product failures.
- New Home/Admin strings use the UI translation layer; translation cache version is bumped to v13.

The v143.67/v143.68 improvements remain included: shared product identity pipeline, six AI Product Ad layout families, same-asset high-resolution recovery, improved review workspace and restrained foreground image inspector.
