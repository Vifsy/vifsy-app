# Spreelo v143.76

Professional Admin workspace update.

## Content & Credits reliability
- Adds a safe `stats_reset_at` marker per content type.
- Resetting reliability never deletes historical logs.
- Admin can view statistics since reset, last 7 days, last 30 days, or all available data.
- Per-row reset and reset-all controls are available.

## Admin dashboard insights
- New 30-day Business & Usage Insights section.
- Top customers by credits used.
- Top customers by posts created.
- Most active brands.
- Most used content formats.
- Platform mix.
- Created/published totals, generation success and refunded credits.

## Admin i18n
- English remains the source language for Admin UI copy.
- Swedish built-in translations added for the new Admin copy.
- Customer list, customer detail, credit adjustment and image-background Admin pages were migrated away from hard-coded Swedish/English UI text.

## Admin visual polish
- Shared Spreelo-style hero, cards, panels and navigation polish across Admin pages.
- More consistent rounded surfaces, navy hierarchy, subtle coral/violet accents and compact SaaS spacing.
- Content format `Order` clarified as `Display order` with explanatory helper text.

## SQL
Run `supabase/v143_76_admin_professional_stats.sql` before deploying.
