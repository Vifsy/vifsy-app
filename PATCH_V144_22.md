# Spreelo v144.22 — Carousel delivery + translation resilience

## Why this patch exists

Production logs on 2026-08-23 showed one protected-retailer carousel occurrence repeatedly entering durable GPT-5.5 background research. Five exact, image-verified products had already passed the final identity gate, which is enough to fill the five carousel slides, but the historical campaign contract also required a sixth reserve product. Because the sixth product was missing, the occurrence kept starting/resuming research instead of creating the post. The queue therefore reported the job as skipped/retry-pending rather than failed, so the normal admin queue could appear empty.

The same production session also showed `/api/ui-translations` timing out at Vercel's 60-second function limit while switching UI language. The client eagerly preloaded every translation namespace and the server translated very large namespaces in single unbounded OpenAI requests.

## Changes

### Protected-retailer carousel delivery

- Protected/anti-bot retailers may now deliver a carousel once all five actual carousel products are exact, in-stock and image-verified.
- The sixth reserve product remains best-effort for protected retailers and no longer blocks delivery.
- Normal/directly accessible retailers retain the existing strict 5 + 1 reserve contract.
- The protected indexed fallback, primary GPT-5.5 research threshold, finalizer and diagnostic logs all use the protected five-product delivery contract consistently.
- Exact product identity, semantic image verification, in-stock enforcement and fail-closed product correctness remain unchanged.

### Admin visibility for durable retries

- `retry_pending` automation occurrences now appear in the normal admin queue as a creating/retrying item even when no `posts` row exists yet.
- `running` occurrences remain in the dedicated Creating/all view to avoid filling the normal queue with short-lived work.
- Existing terminal-failure visibility remains unchanged.

### UI translation timeout protection

- Language switching no longer preloads every Spreelo namespace. Only `common` and `layout` are preloaded.
- Translation cache version bumped so clients do not keep partial/bad v19 preload state.
- `/api/ui-translations` now accepts at most four namespaces per request.
- Large namespaces are split into chunks of 80 labels.
- Translation chunk concurrency is bounded to four.
- Every OpenAI translation request has a 6.5-second hard timeout.
- Failed/slow chunks are deferred and retried later instead of killing the whole HTTP request.
- Partial packs stay `updating`; successful chunks are preserved so the next retry translates only still-missing labels.
- Namespace processing is also bounded rather than using an unbounded `Promise.all` fan-out.
- The client keeps the translation loading state for missing keys and automatically retries instead of exposing English fallback text as if the requested language had completed.

## Regression protection

Added `scripts/test-v144-22-carousel-delivery-translation-resilience.mjs`.

Verified alongside historical regression tests for:

- v143.62 reserve-product contract on normal retailers
- v143.63 final product identity/admin reliability
- v144.00 delivery-first resilience
- v144.05 durable background research
- v144.10/v144.11 protected 403 fallback
- v144.12 exact generation-cost tracking
- v144.13 campaign identity lock
- v144.17 purchasable product rules
- v144.18 GPT Image transparent assets/typography
- v144.19 in-stock-first selection
- v144.20 adaptive protected commerce
- v144.21 dashboard/timezone/calendar polish

No database migration or new environment variable is required.
