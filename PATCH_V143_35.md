# Spreelo v143.35 — Home + calendar campaign studio

This release is deliberately limited to two customer-facing views:

- Home is rebuilt against the supplied dashboard reference with the visual overview hero, four metrics, active plans, review queue, recent activity, AI coach, suggested campaign, profile quality and credit status.
- The AI Content Studio opened from an AI-calendar campaign is rebuilt as a campaign experience with a visual hero, campaign benefits, full post-plan preview, rationale, activation flow and included-value summary.

Other pages and generation logic are unchanged.

New project-owned image assets:

- `public/backgrounds/spreelo-ai-coach-v143-35.png`
- `public/backgrounds/spreelo-campaign-shopping-v143-35.png`

Verification:

- `node scripts/test-v143-35-home-campaign-reference.mjs`
- `next build --webpack` with build-only environment placeholders
