# Spreelo v143.80 — Settings / AI Content Studio implementation correction

This release corrects the implementation mismatch reported after v143.79.

## Settings
- Fixes the root cause that squeezed the redesigned Settings overview and Billing panel into two old page-grid columns.
- The page now follows the approved composition:
  1. settings hero on the left + six quick-setting cards on the right,
  2. full-width subscription/pricing section below,
  3. full-width danger zone below.
- Keeps the approved Spreelo hero artwork and visual language.
- Improves readable secondary text and pricing feature text without turning the UI oversized.
- Preserves responsive stacking for tablet/mobile.

## AI Content Studio
- Uses more of the mobile viewport while retaining a small outer gutter.
- Moves the platform compatibility explanation out of the Platform setting tile so it can no longer overlap the input or other controls.
- Gives mobile setting tiles enough height for title, helper text and input.
- Keeps a two-column mobile settings layout where practical.
- Increases small helper/description text to a readable but still compact size across the visible studio.
- Keeps the approved desktop/mobile hero artwork from v143.79.

## Billing / Stripe
- No Stripe, trial, subscription, credit, webhook or product-engine behavior changed.
- No SQL migration is required for v143.80.
