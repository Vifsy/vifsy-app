# Spreelo v144.85 — clean Plan Settings system

This update rebuilds **Planinställningar** and **Veckovis publiceringsrytm** with a new isolated `sp85-*` component namespace instead of adding another override to the old `plan-v14467-*` cascade.

## Why
Several late stylesheets from v144.80–v144.84 were simultaneously targeting the same legacy class names, often with `!important` and overlapping breakpoints. That made desktop and mobile behavior unpredictable and is why later visual fixes often appeared not to take effect.

## What changed
- New Plan Settings markup/classes with the existing handlers and state kept intact.
- Desktop: 3 translucent/frosted glass cards — Strategy, Schedule, Channels & Language — with exactly 2 rows each.
- Desktop: compact segmented weekly rhythm row, 0 posts neutral, 1 post purple, 2+ posts orange.
- Tablet: 2 + 1 card reflow so labels are never crushed.
- Mobile: one deterministic 6-row glass card in the order Goal, Posts/week, Start date, Language, Platform, Publishing.
- Mobile: fixed grid columns for icon / copy / value / chevron so Start date and other rows cannot drift.
- Mobile weekly rhythm: continuous line, consistent circles/checks, purple for 1 post and orange for 2+.
- Platform selection uses a stable count label on mobile instead of an accidental truncated platform string.
- Explanatory copy may wrap to 2 lines instead of being clipped with an ellipsis.

## Not changed
- Plan generation behavior
- Publishing logic
- Stripe / billing
- Credits or credit caps
- Plan entitlements
- Database schema

No SQL is required for v144.85. The v144.78 SQL is still the latest schema/entitlement SQL if it has not already been run.
