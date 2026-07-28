# v143.0 semantic product fit

This release replaces the direct-theme-word-only campaign gate with an
auditable two-tier relevance contract:

- Direct products have verified product-level theme evidence.
- Contextual products may omit the theme word, but must have an AI-assigned
  campaign role, concrete supporting product facts and a score of at least 80.
- Generic giftability, popularity, attractiveness and personalization are not
  enough to pass.

The bounded senior strategy runs before retailer search so it can derive the
primary theme, direct evidence, contextual product directions and five dynamic
selection roles from the campaign and the company's known assortment. The same
strategy controls search queries, fast screening and final curation.

Reliability changes:

- Existing verified brand catalog products are considered before new website
  requests and can complete a rate-limit retry without another fetch.
- Recent product use is a ranking preference rather than a discovery ban.
- Discovery stops with a 55-second reserve for the mandatory final review.
- The final review is capped at 45 seconds by default.
- Exhausted Store Map shelves are not immediately repeated.
- Web search reasoning options are only sent to models that support them.
- Website locale/language hints are passed to search planning.

No retailer, campaign theme or product category is hardcoded into the
selection policy.
