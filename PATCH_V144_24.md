# Spreelo v144.24 — protected-retailer delivery/state-machine repair

## Why
Production Inet logs on 2026-08-23 exposed four independent delivery bugs after product research itself had succeeded:

1. A retry occurrence kept its original `started_at`, so another worker could mark it `stale_running_occurrence` while a fresh retry was actively running.
2. The indexed 403 repair could report `recoveredCount: 1-5`, but its return helper then passed those authoritative repair objects through a generic website-item normalizer that requires `description`. GPT repair objects intentionally do not need a marketing description, so a successful recovery was silently turned into an empty array.
3. Even if an authoritative protected-retailer single-product result survived that point, a second local fuzzy campaign-fit heuristic could discard it and fall through to direct sitemap/catalog fetches that were already known to return 403.
4. Carousel primary research reached a fully verified five-product set (and even reserves), but the generic final lock pool used the same description-requiring normalizer. An already verified carousel could therefore collapse to zero at the final guard.

## Changes
- Stale occurrence cleanup now uses `updated_at` (last state-machine activity) rather than the historical first `started_at`.
- Successful indexed 403 repair pools now dedupe/return by canonical product URL, so `recoveredCount` can no longer silently become an empty result merely because the repair object has no marketing description.
- Locked carousel pools dedupe by direct product URL and no longer require generic website-item description text before the exact identity guard runs.
- A protected-retailer single-product result that is already exact-page locked, exact-image bound, fresh `in_stock`, promotion eligible and not explicitly campaign-rejected is selected directly from the authoritative indexed repair.
- For protected retailers only, a fresh exact in-stock product may be reused after the rotation pool is exhausted rather than causing a customer-facing failure. Normal-retailer rotation rules are unchanged.
- Protected-research logging now says a retry is *requested* before the state machine decides whether budget remains.
- If the bounded retry budget truly is exhausted, the terminal error explicitly says so instead of incorrectly promising another retry.
- All v144.23 OpenAI background-response cancellation/emergency-stop protections remain included.

## Database / environment
No SQL migration and no new environment variables are required.
