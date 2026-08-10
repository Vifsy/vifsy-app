# Spreelo v143.77 — Stripe Billing sandbox integration

## Added
- Stripe-hosted Checkout for Starter, Growth and Pro monthly/yearly subscriptions.
- One-time Checkout for 100, 250 and 500 extra-credit packs; top-ups require an active/trialing Spreelo subscription.
- Managed Payments support (enabled by default; can be disabled with `STRIPE_MANAGED_PAYMENTS_ENABLED=false`).
- Signed Stripe webhook endpoint at `/api/stripe/webhook`.
- Idempotent webhook processing and credit grants.
- Stripe customer/subscription IDs and billing state persisted in `user_credit_balances`.
- Monthly subscription credit refresh after normal `subscription_create` / `subscription_cycle` paid invoices; proration/update invoices do not grant a second full allowance.
- Hourly safety cron for monthly credit refreshes inside prepaid annual plans; purchased credits are preserved across normal monthly refreshes.
- Settings billing UI with plan picker, monthly/yearly switch and extra-credit packs.
- Billing success page.
- English-source i18n + Swedish built-in labels. Translation cache bumped to v17.

## Important
- Run `spreelo-v143.77-SQL.sql` before deploy.
- Existing Stripe test keys in Vercel are used only after the new deployment.
- After deploy, create the Stripe webhook endpoint and add `STRIPE_WEBHOOK_SECRET=whsec_...` in Vercel, then redeploy.
- Managed Payments is a Stripe public-preview product. `STRIPE_API_VERSION` can override the preview API version without code changes.
