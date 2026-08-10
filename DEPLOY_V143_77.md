# Deploy Spreelo v143.77

1. Run `spreelo-v143.77-SQL.sql` in Supabase SQL Editor.
2. Deploy the full v143.77 project.
3. Confirm Vercel environment variables:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
   - `STRIPE_SECRET_KEY=sk_test_...` (Sensitive)
   - existing `CRON_SECRET`
4. After deployment, in Stripe Sandbox create a webhook endpoint:
   - `https://app.spreelo.com/api/stripe/webhook`
5. Subscribe the endpoint to at least:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
6. Copy the endpoint signing secret to Vercel as `STRIPE_WEBHOOK_SECRET` (Sensitive).
7. Redeploy so the signing secret is available to the webhook route.
8. Test in Stripe Sandbox from Spreelo Settings using `4242 4242 4242 4242` and a future expiry date.

Optional environment variables:
- `STRIPE_API_VERSION` — defaults to `2026-03-04.preview` for Managed Payments.
- `STRIPE_MANAGED_PAYMENTS_ENABLED=false` — disables the Managed Payments Checkout parameter if Stripe asks you to switch to regular Stripe Payments/Billing.
