# Spreelo v144.80 — Studio reference final + scheduled downgrade undo

## What changed

### AI Content Studio
- Mobile **Planinställningar** now follows the supplied six-row reference much more closely:
  - one unified white settings card
  - larger, readable titles/helper text
  - purple circular icons
  - light value pills on the right
  - row order: Goal, Posts/week, Start date, Post language, Platform, Publishing
- Mobile **Veckovis publiceringsrytm** now uses the supplied compact timeline reference with readable weekday/count typography.
- **Planerade inlägg** now use the supplied reference hierarchy:
  - colored left rail retained per content type
  - credit badge in the rail
  - date/time at top
  - stronger post title and description
  - separate destination row with channel chips
  - menu at top-right
- The bottom **Löpande plan / Redo att aktivera** area now uses content-aware auto-fit columns and forces the activation CTA/note onto full rows, preventing narrow one-word wrapping at awkward widths.

### App shell
- The desktop shell now paints the entire sidebar underlay dark on every Spreelo page, not only Settings. Long-scroll/full-page screenshots should no longer expose the beige workspace color behind the sidebar.

### Billing
- A scheduled downgrade/interval downgrade can now be canceled before it takes effect.
- The pending-change banner includes **Cancel planned change**.
- While a future change is pending, conflicting plan buttons are disabled; the scheduled target shows its date.
- Canceling releases the Stripe Subscription Schedule, clears pending plan fields, and marks the audit row canceled.

## Billing / credits safety
- No plan prices changed.
- Plan capacities remain v144.78 values: Starter 150/1/1/1, Growth 450/2/5/3, Pro 1000/5/unlimited/8.
- Credit balances are not capped to monthly allowances.
- No entitlement SQL changed.

## Database
No new SQL is required for v144.80.
The existing `spreelo-v144.78-SQL.sql` is still required if it has not already been run.
