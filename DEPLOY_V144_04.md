# Spreelo v144.04 — TikTok approval recovery + YouTube isolation

## Fixes

- TikTok-targeted posts can no longer be treated as fully approved when TikTok's required publishing choices are missing.
- Reopening the original approval-email link repairs posts that were already marked `approved` or `failed` without TikTok explicit consent by showing the TikTok approval modal again.
- TikTok approval submission can revive that repair state and clears stale publish locks, retry delay and last publish error.
- YouTube Shorts now publishes before TikTok for multi-platform animated-video posts, so a TikTok API failure cannot prevent an otherwise valid YouTube upload.
- Platform failure counters now report only the platform that actually failed, not every destination on the post.
- Added safe approval diagnostics without logging approval tokens or OAuth tokens.

## Database

No SQL migration required.

## After deploy

For an affected post, open the same approval link from the original email again. The TikTok approval modal should appear. Complete the TikTok choices and approve. The post is then immediately eligible for another publish run.
