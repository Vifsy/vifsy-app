# Spreelo v144.99 — Calendar Campaign Names + Clickable Campaign Formats

- Calendar-campaign post badges now show the actual campaign name (for example `K-beauty trend 2026`) instead of the generic `Kampanj` label.
- Long campaign names are safely ellipsized at narrow widths while the full name remains available as the element title/tooltip.
- Content-type cards in calendar campaigns are now interactive instead of being disabled.
- Clicking a campaign content type opens the same format preview flow; confirming it adds a new post to the current calendar campaign with that format selected.
- Added campaign-aware format insertion: the new slot keeps campaign title/context, campaign timing, strategic role, campaign prompts, channel targeting and the existing campaign product-selection logic.
- Product-based formats (product post, product ad, product Reel, AI product video and product carousel) continue to use website/product discovery while remaining constrained by the active campaign context.
- Non-product formats remain campaign-aware but do not force product retrieval when the chosen format does not require a product.
- The full format browser is enabled for calendar campaigns and only shows content types that can safely be inserted into the active campaign flow.
- Updated campaign content-type helper copy to explain that selecting a format complements the already optimized campaign plan.
- No SQL changes.
