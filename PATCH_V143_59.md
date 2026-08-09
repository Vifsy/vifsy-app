# Spreelo v143.59 — durable admin repair queue + immediate failure alerts

- Every terminal generation failure creates/updates a durable `admin_review_cases` repair item before occurrence finalization.
- The Admin approvals API now also reads `needs_repair` cases directly, so a failed occurrence cannot disappear from the workbench just because occurrence finalization failed.
- Incomplete carousel identity failures persist the already verified products into the repair case.
- Admin carousel regeneration requires exactly five products with image + product text/name + product URL. Description is optional.
- Existing correct products can be kept. Old and newly added products may be mixed freely; regeneration uses the five admin-supplied products as authoritative materials.
- Caption/hashtags are regenerated only from those five supplied products.
- Immediate failure emails are sent to `SPREELO_ADMIN_EMAILS` (or `ADMIN_ALERT_EMAIL`) for terminal generation failures and permanent social-publishing failures. Transient retries do not spam alerts.
- No new SQL migration is required; this uses the existing v143.30 admin review schema.
