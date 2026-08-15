# Spreelo v143.98 — YouTube Shorts

Adds first-class YouTube OAuth and native Shorts/video publishing.

## What is included
- YouTube channel card in Social channels.
- Google OAuth 2.0 web-server flow with offline access and refresh token storage.
- Minimal YouTube scopes: `youtube.upload` + `youtube.readonly`.
- Automatic access-token refresh and nightly health check.
- Scheduled upload of Spreelo's already-rendered 1080x1920 animated videos through YouTube Data API `videos.insert` using resumable upload.
- YouTube publish receipts are saved with video ID, URL, and privacy status.
- Image/carousel -> Short adapters stay disabled until their actual rendering adapter is implemented; v143.98 only promises native rendered video to YouTube.

## Google Cloud setup
Enable YouTube Data API v3 and create an OAuth client of type **Web application**.

Authorized redirect URI:
`https://app.spreelo.com/api/auth/youtube/callback`

Vercel environment variables:
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REDIRECT_URI=https://app.spreelo.com/api/auth/youtube/callback`
- optional `YOUTUBE_DEFAULT_PRIVACY=private` (safe default is already private)

During Google OAuth testing, add the Google/YouTube account as a test user in the OAuth consent configuration.

## Important production note
YouTube Data API projects created after 28 July 2020 have API uploads restricted to **private** until the project passes YouTube's API compliance audit. Keep `YOUTUBE_DEFAULT_PRIVACY=private` during development. After the audit allows public uploads, set it to `public` if that is the desired Spreelo production behavior.

Google OAuth verification for public users is a separate gate from the YouTube upload audit.

## Database
No new SQL is required if `v143_93_threads_oauth.sql` has already been run. That migration already allows `youtube` in `social_connections` and the Pinterest migration already added refresh-token health columns.
