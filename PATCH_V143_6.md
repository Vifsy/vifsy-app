# V143.6 runtime scope fix

## Fixed

- Moved the persisted concrete-product proof lookup into `normalizeWebsiteCatalogItem`,
  where the catalog row actually exists.
- Removed the invalid `row` lookup from campaign candidate usage tracking.
- Prevents the immediate `ReferenceError` that terminally failed every newly
  scheduled carousel before product discovery could start.
- Terminal automation failures now log the rule, stage, failure code and internal
  reason to Vercel in addition to Supabase and the customer notification.

## Unchanged

- Campaign interpretation, semantic product review and final curation from V143.5.
- Delivery-first fallbacks, timeout budgets, domain cooldowns and retry protection.
- Database schema and migrations.

No new SQL is required.
