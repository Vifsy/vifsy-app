# Deploy Spreelo v144.00 — Delivery-first resilience

## Important order
1. Run `spreelo-v144.00-SQL.sql` once in Supabase SQL Editor.
2. Replace/deploy the complete v144.00 project.
3. No new Vercel environment variables are required.
4. Redeploy on Vercel.

## What changes
- Campaign-fit AI timeout/failure no longer kills a post when verified products already exist; deterministic product ranking is preserved.
- Senior campaign strategy timeout falls back to deterministic campaign logic.
- Product copy generation/identity/rewrite AI failures fall back to contract-safe copy built only from verified product facts.
- General AI image failures fall back to a local deterministic Sharp/SVG social card instead of failing the occurrence.
- Website text-ad image failures get the same local image fallback.
- Carousel slide rendering failure downgrades to a safe single-image post instead of deleting the post and failing the occurrence.
- Transient network/API/5xx/timeout failures can resume the same occurrence up to two bounded times.
- Transient animated-video render failures can resume instead of immediately becoming terminal; a resumed run removes the incomplete draft before regenerating.
- Logs now track the current generation stage so unexpected failures are no longer reported only as `unhandled` when a stage is known.

## Still intentionally terminal
Some failures cannot be truthfully hidden with a fallback, for example:
- no credits / billing or plan limits at a required external provider,
- invalid or missing authentication/configuration,
- irrecoverable database writes,
- no safe verified product where a product-specific post requires one,
- a video-only destination such as YouTube when no valid video can ultimately be produced after bounded retries.

Those cases still go to admin review/alert rather than pretending a valid post exists.

## Useful log lines after deploy
- `Campaign fit scoring unavailable; preserving deterministic product ranking`
- `Post copy generation unavailable; using deterministic delivery copy`
- `Product copy identity AI unavailable; using deterministic contract-safe copy`
- `Image generation failed; using local deterministic delivery card`
- `Carousel slide creation failed; downgrading to a safe single-image delivery`
- `Resumed occurrence removed incomplete animated draft and will regenerate safely`
- `Resumed occurrence removed incomplete carousel draft and will regenerate safely`
