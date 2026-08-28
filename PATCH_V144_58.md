# Spreelo v144.58 — mobile/tablet professional polish

This patch applies the live-device QA changes requested for the Spreelo mobile experience, with tablet-safe responsive behavior where appropriate.

## Included

- Brand-analysis completion email now uses reliable centered full-width email tables and symmetric mobile gutters.
- Saved-plan card is rebalanced: copy and actions use the full card width and buttons no longer sit in a narrow left column.
- Calendar campaign cards always render a visual. Missing or broken campaign images fall back to `/calendar-generic.svg`.
- The normal plan-activation completion modal now sends the customer to Home instead of claiming the plan is visible in the AI calendar.
- Plan activation has a real rotating loader, animated working dots and subtle shimmer while saving.
- Planned-post cards on mobile/tablet keep date, title, purpose, cost and channels in normal document flow so text cannot overlap the visual strip.
- Plan settings are consolidated into one continuous card with six rows on mobile/tablet, matching the supplied reference direction.
- OAuth secure sign-in placeholder now has readable typography, Spreelo branding and a visible spinner.
- Brand-analysis progress is rebuilt as one cohesive module. Percentage is integrated with the active step and the detached percentage tile is removed.
- Home overview gains the supplied reference-style credit/status card and a single vertical stats card on mobile/tablet, so different title lengths no longer distort the layout.

## Database / SQL

No database schema or data migration is required for v144.58. Do not run any new SQL for this patch.

## QA

Run:

```bash
npm run test:v144.58
```

A full Next build still requires installing the project dependencies. In an offline build environment, dependency installation cannot be completed from npm.
