# Spreelo v143.83

## Scope
This version intentionally contains only two product changes on top of v143.82:

1. One-off **Giveaway / Competition** content flow in AI Content Studio.
2. Clear billing-plan wording when switching between monthly and yearly billing.

The larger Settings redesign discussed after v143.82 is **not** included here.

## Giveaway / Competition
- Added as a featured format in AI Content Studio.
- It can be opened even before a rolling content goal has been configured.
- It never becomes a recurring weekly content type.
- The customer supplies:
  - prize
  - number of winners
  - closing date
  - participation requirements
  - winner-selection method
  - how the winner is notified
  - optional extra terms
- Instagram-only options:
  - tag 1 friend
  - tag 2 friends
  - share to Instagram Story
- If Facebook or another channel is included in the same post, Instagram-only tagging/sharing requirements are disabled so one shared caption does not accidentally contain unsafe Facebook participation mechanics.
- Spreelo creates a one-time single-image post using the existing review/scheduling/publication pipeline.
- The AI image prompt is grounded in both the prize and brand profile, while retaining catalog-reality safeguards so an exact branded product is not invented without a verified product reference.
- Giveaway captions are exempted from the normal short-caption target when the competition rules require more space.
- Giveaway posts do not force a website CTA/domain into the caption.

## Billing interval wording
When the user switches the pricing view to a different billing interval, button copy now describes the complete target choice.

Example: current subscription = Pro monthly, yearly tab selected:
- Switch to Starter yearly
- Switch to Growth yearly
- Switch to Pro yearly

The same principle applies in the opposite direction.

Backend timing is unchanged:
- upgrades / immediate eligible interval changes are handled immediately with Stripe prorating
- lower-plan changes and yearly -> monthly on the same tier are scheduled for the end of the current paid period

## Database
No new SQL is required for v143.83.

If v143.82 SQL has not yet been applied, run `spreelo-v143.82-SQL.sql` before deploying because v143.82 contains the package-capacity/admin-bypass database logic.

## Regression checks
Passed:
- v143.77 Stripe billing
- v143.78 trial/subscription lifecycle
- v143.81 plan entitlements
- v143.82 admin plan-limit bypass
- v143.83 giveaway + billing interval checks
- v143.74 content economics
- v143.75 automation import regression
- v143.80 settings/studio correction

`test-v143-49-platform-aware-content-mix.mjs` also fails on unchanged v143.82, so its existing assertion failure is not introduced by v143.83.
