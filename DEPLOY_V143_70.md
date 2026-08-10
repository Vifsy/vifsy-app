# Spreelo v143.70

## Review workflow
- Home review CTA opens the review queue instead of an arbitrary post.
- Review workspace now has Review queue, Needs repair and History views.
- Approved-by-Spreelo posts leave the review queue immediately and remain available in History.
- Customer-approved and customer-rejected posts also remain available in History.
- Review queue rows show preview media, brand, platform, format, created/scheduled time and status before a post is opened.
- Home approval count now reflects posts that still need Spreelo review rather than every `pending_approval` post.

## Home design
- Keeps the v143.69 information architecture but applies a stronger Spreelo visual system to the three operational modules.
- Recurring schedules, Scheduled posts and Calendar campaigns use distinct Spreelo accent treatments while remaining compact and responsive.
- Content review History is always directly accessible from Home.
- Plan history remains separate from content review history.

## Localization
- English remains the source language for new UI keys.
- UI translation cache bumped to v14 so all other configured languages request the new labels.
- Swedish built-in coverage added for the new Home and review-workspace labels to avoid mixed-language UI during translation loading.

## Database
- No new SQL for v143.70.
- Keep the v143.69 lifecycle migration applied.
