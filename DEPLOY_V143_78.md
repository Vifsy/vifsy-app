# Deploy Spreelo v143.78

1. Run `supabase/v143_78_trial_subscription_lifecycle.sql` in Supabase SQL Editor.
2. Deploy the complete v143.78 project to Vercel.
3. In Stripe Sandbox -> Workbench -> Webhooks -> Spreelo Stripe Webhook, add:
   - `customer.subscription.trial_will_end`
   This makes nine selected webhook event types in total.
4. No new Vercel secret is required for v143.78 beyond the existing Stripe variables:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
5. Test trial abuse with a fresh account/business domain. The existing paid test account cannot start a trial while its Stripe subscription is active.
6. Test cancel-at-period-end, resume, upgrade, downgrade and an annual trial before enabling live billing.

The Founding 100 launch discount remains disabled in sandbox and should be configured immediately before switching to live Stripe keys.
