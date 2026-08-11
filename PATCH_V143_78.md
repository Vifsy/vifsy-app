# Spreelo v143.78 — Trial, Free lifecycle and subscription changes

## Billing lifecycle
- New workspaces start on Free with 0 promotional credits.
- 14-day Stripe trial with 100 trial credits, independent of selected paid plan.
- Trial credits are replaced by the selected plan allowance after the first paid invoice.
- Cancel subscription at period end; account falls back to Free when Stripe ends the subscription.
- Purchased extra credits survive cancellation and normal subscription refreshes.
- Weekly recurring schedules are paused when a paid/trial subscription ends; reserved credits are released before preserving purchased credits.
- Free accounts may use purchased credits for one-time content, but cannot create or resume weekly recurring schedules.

## Trial abuse protection
- One trial per Spreelo account.
- One trial per normalized real business website domain.
- `www` and subdomains collapse to the registrable root for normal domains.
- Shared hosted storefront/site platforms keep the full host so unrelated merchants are not grouped together.
- Trial claims persist independently of account deletion.
- Pending Checkout trial reservations expire after two hours.
- One account cannot open live pending trial reservations for several different domains in parallel.
- A business website is required before a trial can start.

## Plan changes
- Same-period upgrades use Stripe immediate proration and only grant the proportional extra Spreelo credits after the proration invoice is paid.
- Month -> year upgrades invoice immediately and apply the target monthly allowance after payment.
- Downgrades and year -> month changes are scheduled for the end of the current paid period with Stripe Subscription Schedules.
- Purchased credits are not removed by plan changes.

## Account deletion
- Active Stripe subscriptions are canceled before permanent account deletion.
- Late Stripe deletion webhooks are acknowledged safely after the Spreelo balance row has already been deleted.
- Trial business claims are intentionally retained so deleting/recreating an account does not reset trial eligibility.

## Trial reminder
- Handles `customer.subscription.trial_will_end` and sends a localized 3-day reminder through Resend when configured.
- Add this as the ninth event on the Stripe webhook destination after deploying v143.78.

## Founding 100
The agreed launch offer (Growth 399 SEK/month for 12 months for the first 100 launch customers) is intentionally not enabled in the sandbox release. It should be activated at live launch so sandbox purchases/trials cannot consume launch slots. The current billing lifecycle is compatible with adding the offer as a Stripe discount at launch.
