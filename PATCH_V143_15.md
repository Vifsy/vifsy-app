# Spreelo v143.15

## Faster brand analysis without reducing analysis quality

- Reuses a successful public-hostname DNS verification for the same hostname
  during one brand-analysis job.
- Keeps the existing URL, protocol, credential, private-network and IP safety
  checks.
- Does not change the website pages, campaign opportunities, OpenAI prompts or
  AI models used by brand analysis.
- Adds timings for hostname verification, homepage reading, context pages,
  OpenAI strategy and the complete job so production logs show exactly where
  time is spent.

## Unified AI Content Studio theme

- Rebuilt the responsive presentation for:
  - Brand profile
  - Social channels
  - Settings
  - Calendar campaign plan creation
- Uses the same canvas, frosted cards, navy typography and orange actions as AI
  Content Studio and the v143.14 dashboard.
- Fixes the narrow, vertically broken mobile brand-profile hero.
- Adds dedicated desktop, tablet and mobile layouts without changing page
  behavior or data flows.

## Deployment

- No SQL migration is required.
