# Spreelo v143.28

## Included

- A shared four-minute visual analysis timeline that advances evenly to 99%, in onboarding and Brand Profile.
- Removed the long-wait/email notice and the no-website/manual-description path.
- A redesigned add-brand dialog that accepts the website address and derives the initial brand name.
- Responsive Brand Profile styling for desktop, tablet, and mobile.
- Product labels on standard product posts and carousel slides with campaign eyebrow, blue accent, larger product name, multilingual Noto fonts, adaptive contrast, and a compact glass fallback when no empty placement exists.
- A real admin review gate that can be switched on or off.
- When the gate is on, completed posts are held until an admin sends them to the customer.
- Failed generations never send a customer failure email and are shown under **Needs attention** with the available technical job details.
- Complete carousel previews in the admin review modal.

## Deploy

1. Deploy the application code.
2. Run `supabase/v143_28_admin_review_gate.sql` in Supabase SQL Editor before using the new admin page.
3. Open Admin > Post approvals and choose whether **Require Spreelo admin approval** is enabled.

No new environment variables are required. `RESEND_API_KEY` and `RESEND_FROM_EMAIL` continue to be used for the final customer review email.

## Next bounded phase

The manual repair workbench (up to five replacement images, editable product names/text, and regeneration using only the supplied material) is deliberately not included in this package. Failed jobs are now safely retained, visible, and suppressed from the customer so that workbench can be added without coupling it to the delivery-gate migration.
