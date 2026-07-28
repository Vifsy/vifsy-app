# v143.1 theme-fit delivery

This patch fixes the failed v143.0 Pressit run where an upfront senior strategy
timed out three times through automatic SDK retries and consumed almost the
entire discovery budget.

- The upfront senior strategy is removed from the execution path.
- Product discovery receives the first and largest time budget.
- Bounded OpenAI calls use `maxRetries: 0`, so a 30-second timeout is truly one
  attempt rather than roughly 90 seconds of retries.
- Campaign screening asks one primary question: whether each real product
  reasonably fits the theme.
- Direct wording is preferred but not mandatory.
- Each decision still carries a short reason.
- Numeric scores order fitting products but cannot overturn an explicit
  `fits_theme: true` decision.
- Explicitly unrelated products cannot pass because of a high score.
- The senior final review curates a fitting pool but may not reduce five
  already fitting products into an incomplete post.
- The final review no longer requires an exact keyword, formal strategy slot,
  evidence chain or minimum score for an otherwise reasonable thematic fit.
- If final curation is unavailable or malformed, five fast-reviewed
  theme-fitting products remain deliverable.
- Misleading "completed" budget logging is replaced with a neutral checkpoint.

No retailer, theme or product type is hardcoded into production logic.
