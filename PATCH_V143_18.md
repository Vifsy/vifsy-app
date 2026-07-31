# Spreelo v143.18 — onboarding polish

This release deliberately leaves brand analysis, campaign discovery and
product selection unchanged.

## Changes

- The displayed analysis percentage now moves smoothly and monotonically from
  1 to 99 percent over a five-minute visual budget. A completed backend job
  immediately changes it to 100 percent and continues without waiting.
- The login and onboarding dark panels use a compact SaaS workspace preview
  instead of the decorative desk illustration.
- The analysis-complete welcome page has a compact result card, larger body
  text, a coral brand-name accent and transparent social-network artwork.
- No fallback letter tile is displayed when a business has no logo.
- Campaign calendar cards start closed.
- The workspace transition loader keeps its motion but uses Spreelo navy,
  coral and the AI Content Studio background.
- A signed-in non-admin receives a quiet `isAdmin: false` response from
  `/api/admin/me`, eliminating the harmless 403 noise without granting access.

## Authentication email

The branded localized email hook remains included, but Vercel cannot activate
a Supabase Auth hook. Follow `SUPABASE_AUTH_EMAIL_V143_17.md` once in Supabase.
No SQL migration is required.
