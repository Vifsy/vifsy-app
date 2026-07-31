# Spreelo v143.17

## Clear account entry

- The first screen now explicitly says that the same email flow is used both
  to sign in and to create a new Spreelo account.
- The decorative numbered step indicators have been removed.
- The selected app language is carried into the authentication request so a
  configured Supabase Send Email Hook can localize the verification email.
- Swedish login and onboarding copy is built in, preventing mixed English and
  Swedish while remote translation packs are loading.

## Faster, clearer onboarding

- Removed the artificial minimum 3.5 minute analysis display delay.
- The progress view now follows the real saved backend progress.
- The brand-analysis engine, prompts, models, pages and campaign-generation
  logic are unchanged from v143.15.
- On success the user is sent to a dedicated result page instead of directly
  to Social channels.

## New welcome and analysis result page

- Confirms that the brand profile, campaign calendar and content foundation
  were created.
- Shows the read-only analysis summary and explains that it can be adjusted in
  Brand profile.
- Previews upcoming campaign opportunities.
- Shows the planned launch channel lineup: Facebook, Instagram, LinkedIn,
  TikTok, YouTube, X, Threads and Pinterest.
- Provides clear actions to review the calendar, connect channels and start
  the first automatic content plan.

## Unified design

- Login, business setup, analysis progress and the new result page use the same
  luminous canvas, frosted panels, navy typography and coral actions as AI
  Content Studio.
- Dedicated desktop, tablet and mobile rules are included.

## Deployment

- No SQL migration is required.
- Existing v143.15 SQL and environment configuration remain unchanged.
- Branded authentication email delivery requires the optional Supabase Send
  Email Hook described in `SUPABASE_AUTH_EMAIL_V143_17.md`.
