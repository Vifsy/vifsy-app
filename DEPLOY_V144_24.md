# Deploy v144.24

1. Deploy the full project normally to Vercel.
2. Do **not** deploy v144.23 separately; v144.24 already includes all v144.23 background-job cancellation safeguards.
3. If Admin shows active OpenAI background jobs after deployment, use **Stoppa pågående jobb** once.
4. Run one Inet single-product test first, then one Inet carousel test.
5. In the single-product log, expect `Protected website product selected from authoritative indexed in-stock repair` once a safe current product is recovered.
6. In a protected carousel, an already verified five-product set must not collapse to `0 of 5` at `carousel_product_prepare`.
7. A newly resumed retry must not be terminally failed as `stale_running_occurrence` merely because its original occurrence is older than 12 minutes.

No SQL or environment changes are required.
