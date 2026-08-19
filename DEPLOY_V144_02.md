# Spreelo v144.02 — TikTok Direct Post

## 1. Run Supabase migration first

Run:

`supabase/v144_02_tiktok_integration.sql`

This adds `posts.platform_publish_settings` and keeps the TikTok/social connection schema deployment-safe.

## 2. TikTok Developer configuration

Create/configure the Spreelo app in TikTok for Developers with:

- Login Kit for Web
- Content Posting API / Direct Post
- Scopes: `user.info.basic`, `video.publish`
- Redirect URI: `https://app.spreelo.com/api/auth/tiktok/callback`
- Verify the URL property/domain used by media pull. Spreelo serves signed media through:
  `https://app.spreelo.com/api/tiktok/media`
  Verify the app domain or an accepted URL prefix that covers this endpoint.

## 3. Vercel environment variables

Required:

- `TIKTOK_CLIENT_KEY`
- `TIKTOK_CLIENT_SECRET`
- `TIKTOK_REDIRECT_URI=https://app.spreelo.com/api/auth/tiktok/callback`
- `TIKTOK_MEDIA_SIGNING_SECRET` (long random secret; if omitted code falls back to client secret, but a dedicated secret is recommended)

Production safety flags:

- `TIKTOK_PUBLIC_POSTING_READY=false`
- `TIKTOK_ALLOW_PRIVATE_TESTING=false`

For private integration testing before TikTok audit only:

- `TIKTOK_PUBLIC_POSTING_READY=false`
- `TIKTOK_ALLOW_PRIVATE_TESTING=true`

After TikTok has audited/approved Spreelo for public Direct Post:

- `TIKTOK_PUBLIC_POSTING_READY=true`
- `TIKTOK_ALLOW_PRIVATE_TESTING=false`

Do not set `TIKTOK_PUBLIC_POSTING_READY=true` merely because a private test succeeds.

## 4. Connection UX

TikTok uses Spreelo's existing social connection flow:

Social channels -> Connect TikTok -> same 620x760 OAuth popup -> TikTok authorization -> common `/social-channels/oauth-complete` callback -> popup closes -> connection card updates.

## 5. Customer approval

The normal Spreelo email approval remains mandatory.

For a post targeting TikTok, the approval link displays TikTok-required choices before approval can complete:

- current connected TikTok creator
- media preview
- editable caption
- manual privacy selection (no preselected privacy)
- comments; duet/stitch where relevant
- commercial-content disclosure choices
- explicit upload consent

A post is not eligible for the publishing worker until these choices are saved and the post becomes `approved`.

## 6. Publishing formats

TikTok publishing supports:

- single image -> Photo Post
- carousel -> multi-photo Photo Post
- animated product Reel/video -> Direct Post video

The publisher uses TikTok PULL_FROM_URL with Spreelo's signed media proxy.

## 7. Public-vs-private safety

v144.02 deliberately refuses customer TikTok publishing until the TikTok API client is production/audit ready. It never silently changes a customer's intended public post to `SELF_ONLY`.

Private test mode is opt-in and accepts only `SELF_ONLY`.

## 8. Durable publishing

TikTok publish IDs are saved in `posts.publish_receipts.tiktok` immediately after TikTok accepts the request. Retries reconcile the existing publish ID via TikTok's status endpoint instead of starting a duplicate upload.

## 9. Token maintenance

`vercel.json` includes daily `/api/cron/refresh-tiktok-tokens` health/refresh checks.

## Suggested smoke test

1. Deploy with private-test flag enabled while the TikTok app is unaudited.
2. Connect TikTok from Social channels and confirm the same popup UX as other providers.
3. Generate a single-image post including TikTok.
4. Open the customer's approval email.
5. Confirm no privacy option is preselected and test mode only permits `Only me`.
6. Approve and let the publishing cron run.
7. Confirm TikTok publish receipt/status is stored and no duplicate upload occurs on retry.
8. Repeat with animated video.
9. After TikTok audit, switch the production-ready flag and confirm the creator's public privacy option is available.
