# Spreelo v144.78 — Growth-first packages + per-brand entitlements

## Package capacities

- Starter: 150 credits/month, 1 brand, 1 social channel per brand, 1 rolling content plan per brand.
- Growth: 450 credits/month, 2 brands, 5 social channels per brand, 3 rolling content plans per brand.
- Pro: 1000 credits/month, 5 brands, unlimited social channels per brand, 8 rolling content plans per brand.
- Prices and Stripe lookup keys are unchanged.
- All existing common content features remain available in every paid plan.

## Billing UI

- Pricing cards now show the new capacities.
- Pro shows “Unlimited social channels”.
- A single shared clarification appears below the three plan cards: social-channel and rolling-plan limits apply per brand. This avoids repeating “per brand” on every feature row.
- Billing handlers, proration behavior, checkout, cancellation and extra-credit packs are unchanged.

## Enforcement

- Brand count remains an account-wide limit.
- Social-channel counts are now enforced independently for each `brand_profile_id`.
- Active rolling weekly-plan counts are now enforced independently for each `brand_profile_id`.
- Campaign-calendar rules remain excluded from the rolling-plan entitlement.
- Admin plan-limit bypass is preserved.
- Pro social channels are displayed as unlimited; the database uses PostgreSQL's maximum integer as a practical safety ceiling.

## Credits

- Stripe monthly allowances are now 150 / 450 / 1000.
- The migration updates `monthly_credit_limit` for existing Starter/Growth/Pro accounts so annual refreshes and the UI use the new allowance.
- It does **not** reduce or cap `credits_remaining` or purchased credits. Balances may continue to exceed the monthly plan allowance.

## Required SQL

Run:

`spreelo-v144.78-SQL.sql` (same migration is also stored under `supabase/v144_78_growth_first_per_brand_entitlements.sql`)

This SQL is required so live database triggers match the package descriptions.
