# Spreelo v144.43 — Market / locale product lock

Built from v144.42.

## Why
A Swedish Emmaljunga test selected the Danish product wording `SONIC Klapvogn` even though the post language was Swedish. Emmaljunga uses sibling locale paths such as `/sv-se/`, `/en-se/`, `/da-dk/` and `/en-dk/` on the same hostname. Spreelo's previous market guard only understood older two-segment forms such as `/se/sv/`, so a `/sv-se/` saved site could still leak to `/da-dk/`. Store Map also started from the bare hostname and localized store search probed both the localized path and the bare origin.

## Fixes
- Recognizes modern language-market prefixes such as `sv-se`, `da-dk`, `en-se`, `en-dk`, as well as two-segment market/language paths.
- If the customer saved an explicit locale path, that locale/market is authoritative for product sourcing.
- If the saved URL is market-neutral, an explicit product URL in another language is rejected using the automation/content language as a conservative fallback.
- Locale-neutral canonical product URLs remain allowed because many Shopify sites canonicalize localized product pages back to `/products/...`.
- Localized store search no longer also probes the bare origin.
- Store Map starts from the saved localized URL, filters cached cross-market nodes, and refuses sibling-locale navigation links.
- Persistent candidate verification and cached catalog selection apply the same market/language scope, so previously discovered Danish rows cannot silently leak back into a Swedish run.
- Primary GPT web-research candidates are filtered through the same market/language scope.
- Added explicit diagnostics when cross-market candidates/nodes are excluded.

## Deliberately unchanged
- Kling generation and product-surface rules from v144.42.
- GPT-Image-2 transparent typography from v144.41.
- Product price removal.
- Product availability/purchasability rules.
- No SQL migration.
- No new environment variables.
