# v143.63 — Final product identity pool + reliable admin failures

This release closes the problems exposed by the Zalando school-start test.

## Product identity
- The 5+1 requirement is now measured **after** the final semantic image identity gate.
- A round that technically hydrates six products but only verifies three exact product/image pairs automatically continues to the second bounded web-research round.
- The second round excludes every URL already returned by the earlier round.
- Only products that have passed same-page binding, high-resolution resolution and the final semantic identity gate can enter the locked carousel pool.
- Already final-verified products are reused later in the same run instead of reopening the retailer page and risking recommendation-grid contamination.
- The research response now carries the product brand when available; structured Product JSON-LD brand data overrides it when available.
- A visible brand/logo that conflicts with the expected brand is a hard veto even if the model otherwise reports a match.
- Product-title matching remains strict for conflicting model names, while allowing harmless retailer differences such as an omitted brand prefix or `ryggsäck` vs `dagryggsäck`.

## Admin reliability
- Terminal failures are queried explicitly with `status = failed_terminal`; they can no longer be pushed out by newer successful/running occurrences before the API filters them.
- The admin endpoint is explicitly no-cache.
- The admin workbench refreshes every 15 seconds and whenever the browser window regains focus.
- `admin_review_cases` writes are read back and verified. Missing-table/schema-cache problems are now logged instead of silently swallowed.
- The occurrence fallback remains authoritative, so terminal failures can still appear in admin even if `admin_review_cases` is unavailable.
- Exact-product-pool failures get the specific internal failure code `carousel_product_verification_incomplete`.

No SQL migration is required for this release.
