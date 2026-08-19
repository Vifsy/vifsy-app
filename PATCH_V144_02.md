# PATCH v144.02 — TikTok Direct Post

## Added

- TikTok card in Social channels using the same Spreelo OAuth popup shell as existing providers.
- TikTok Login Kit OAuth start/callback routes.
- Secure TikTok access + refresh token lifecycle and daily refresh/health cron.
- TikTok creator-info query before customer approval and before publishing.
- TikTok-specific customer approval controls while keeping Spreelo's existing email approval workflow.
- Single-photo, multi-photo/carousel and animated-video Direct Post publishing.
- Signed `app.spreelo.com` media proxy for TikTok `PULL_FROM_URL` and verified-domain compatibility.
- Durable TikTok `publish_id` receipts and duplicate-safe status reconciliation.
- Public-moderation verification for posts approved as `PUBLIC_TO_EVERYONE`.
- Explicit production/audit guard: no silent fallback from public intent to private `SELF_ONLY`.
- Optional private-only test mode for pre-audit integration testing.
- Retry handling for TikTok-documented temporary media-pull/internal failures.

## Preserved

- Customer email approval remains required before social publishing.
- v144.01 admin review/repair workbench and per-brand review policy.
- v144.00 delivery-first resilience.
- Existing Facebook, Instagram, Pinterest, Threads and YouTube connection/publishing flows.

## Database

Run `supabase/v144_02_tiktok_integration.sql` before deploy.

See `DEPLOY_V144_02.md` for TikTok Developer and Vercel setup.
