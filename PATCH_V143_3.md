# Patch v143.3 – delivery-first campaign carousels

This patch keeps v143.2 and adds:

- candidate queues scoped to the current automation rule;
- real retailer search-form URLs preferred over guessed `/search` patterns;
- product links containing a brand/name such as “Next” no longer mistaken for pagination;
- direct theme evidence in a verified product overrides broad category avoid terms;
- every technically verified product remains available to the final bounded curation pass;
- a best-available reduced carousel can be delivered with 2–4 products;
- one verified product becomes a single-product image post;
- zero verified products becomes an AI campaign visual instead of a skipped occurrence;
- after a website rate limit, already verified products are used offline and further website requests stop.

No retailer-specific product or URL rules were added.

Before deployment, run:

`supabase/v143_3_rule_scoped_candidate_queue.sql`
