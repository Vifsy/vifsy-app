# v143.2 timeout-proof theme fit

This patch reproduces and fixes the v143.1 production failure where 22 verified
Pressit products produced only one campaign-safe product after the fast AI
review timed out.

- Theme contracts now retain a generically derived shared family root. The
  production terms `julklapp`, `julgava`, `julpresent`, `julfirande`,
  `juldesign`, `jultema`, `julpynt` and `julmotiv` therefore also retain `jul`.
- The same mechanism is language- and retailer-neutral and requires multiple
  independent theme variants before creating a three-character root.
- A verified product with direct theme-family evidence no longer needs an AI
  score to enter the campaign pool.
- A verified contextual product may also enter without an AI score when its own
  product data matches the AI-created product directions and it came from one
  of the campaign's configured store searches.
- The fresh-run persistent queue no longer spends 25 seconds evaluating stale
  candidates before targeted discovery.
- Store-search products skip the intermediate AI review when five fitting
  verified products already exist.
- Five fresh fitting verified products now lock a deliverable pool immediately;
  the former 15-product comparison target remains a quality target but is no
  longer a delivery gate.
- When expansion is needed, the fast review evaluates raw verified products
  rather than requiring them to be approved before they can be reviewed.
- Every later discovery fallback also retains verified theme-fit products when
  its optional AI review times out.
- Obvious commerce infrastructure endpoints are rejected before product-page
  verification.

The regression test uses the actual product titles from the failed production
log, assumes the only previously selected product is unavailable for reuse, and
still requires five fresh direct-theme products without any AI evaluation.

No SQL migration is required.
