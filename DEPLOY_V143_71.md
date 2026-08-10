# Spreelo v143.71

## Changes

- Separates Spreelo internal admin review from customer review.
- `/admin/*` is guarded before admin UI renders and remains protected server-side.
- Primary admin defaults to `johan@foldern.com`; override with `SPREELO_PRIMARY_ADMIN_EMAIL` only when intentionally changing the primary administrator.
- Home review buttons now open the customer's `/review` queue/history, never `/admin`.
- Customer review queue only exposes posts after internal Spreelo review is complete.
- Direct customer post URLs stay hidden while internal review is still pending.
- Home modules use tighter spacing, consistent Spreelo action buttons, contextual help popovers and create CTAs.
- Review/history lists use tighter vertical rhythm.
- New UI copy uses English source labels and the normal app translation system; translation cache bumped to v15.

## SQL

No new SQL migration is required for v143.71. The v143.69 lifecycle migration must already be installed.
