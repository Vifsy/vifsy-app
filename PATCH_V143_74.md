# Spreelo v143.74 — Content & Credits

## Added
- New protected Admin page: `/admin/content-credits`.
- One compact control center for every content type, customer credit cost, estimated Spreelo cost, margin signal, 30-day usage, reliability, plan availability and active/disabled state.
- `+ Add content type` creates a safe catalog-only row. It does **not** invent a generator; custom rows start disabled until that internal key is implemented in code.
- Inline credit-cost editing and bulk credit/enable/disable actions.
- Scheduled future credit changes with an effective date.
- Permanent Admin audit trail for pricing/settings changes.
- Configurable reference SEK value per credit for the Admin margin signal.
- 30-day operational stats from `automation_run_logs` and net credit movement from `credit_reservation_events`.
- Customer-visible name/description override fields.
- Starter/Growth/Pro availability switches.

## Credit model
- Customer-facing credit units move to the new 10x scale for new content plans.
- Defaults: standard/product post 10, AI product ad 20, product carousel 20, animated product Reel 50 credits.
- AI Content Studio reads the configured cost from the content-format library for **newly created plans**.
- Existing automation rules keep their saved `credit_cost` snapshot, so historical charges are not rewritten when Admin changes a price.

## Safety
- Admin route remains restricted by the existing primary-admin guard.
- Custom catalog rows are never exposed as working generators simply because a row was added.
- Public content-format API falls back to safe defaults if the new DB migration has not been run.
