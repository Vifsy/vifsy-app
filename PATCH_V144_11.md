# Spreelo v144.11 — Batched 403 exact-product fallback

## Goal
Keep v144.10's successful exact-product/image recovery for security-blocked stores, but remove the expensive repeated GPT-5.5 work and make the same fallback available to every product-image flow without changing normal retailer retrieval.

## What stays unchanged
- Normal Store Map, store search, catalog, direct product-page verification and Product Engine flows still run exactly as before when the retailer is readable.
- Existing product-image identity rules remain fail-closed.
- The recovered image must still be the official main-product asset bound to the same official product page and exact product identity.
- Existing semantic product-image verification still runs before generation.
- Existing image generation, product ad layouts, Kling, Shotstack, publishing, OAuth, billing and approval flows are unchanged.
- HTTP 429/cooldown handling is unchanged.

## 403 fallback cost fix
v144.10 could perform one GPT-5.5 exact repair per candidate and then continue additional `domain_site_search` / `backup_broad` research. It could also repair the already locked selected product a second time later in the pipeline.

v144.11 changes only the security-blocked path:

1. The first real HTTP 403/security block switches the product researcher into indexed fallback mode.
2. One candidate batch is sent to `repairAuthoritativeWebAgentProductAssets` in a single GPT-5.5 request.
3. Single-product flows recover up to 4 candidates in that one batch (1 selected + optional reserves).
4. Carousel flows recover up to 8 candidates in one batch, enough for 5 products plus reserves when the indexed store data is available.
5. Once the batch has run, extra `domain_site_search` and `backup_broad` paid rounds are skipped for that fallback run.
6. All carousel fallback stages share one in-memory fallback state, so later backup stages reuse the first recovered batch and cannot start another paid exact-repair batch in the same product-preparation run.
7. Already locked indexed products are not sent through another GPT-5.5 exact-product repair before the mandatory semantic image gate.
8. The whole indexed batch is persisted to the product catalog so single-product video/image formats can reuse exact recovered products as reserves.
9. Optional direct reserve crawling is skipped for an indexed 403 product because the domain is already known to reject those requests.

## Known-403 campaign carousels
When the shared website-domain profile already records HTTP 403, whole-site campaign carousels try the same one-batch indexed fallback before the older multi-round campaign researcher. If the indexed batch cannot safely produce enough verified products, the established campaign research remains available as the final fallback rather than weakening delivery safety.

## Product formats covered
The shared fallback is now enabled for the product web-research paths used by:
- single product/image posts
- AI product ads
- website-product posts
- animated product reels (Shotstack)
- AI product video/Kling source-product preparation
- product carousels
- campaign carousel backup/recovery paths

Exact-product URLs still use the existing locked-product resolver; on a 403 that resolver already performs one bounded exact repair for that one product.

## Original image integrity
No image generation is used by the 403 recovery itself. The fallback still requires:
- official retailer domain
- exact product URL/identity evidence
- same-page main-product binding
- `image_is_main_product_asset=true`
- locked original image URL

The existing semantic identity gate remains mandatory before the product is used.

## Search cleanup
Relative scheduling UI fragments such as `days before` are now rejected from product-search vocabulary so labels such as `{days} days before` cannot create queries like `days before fars`.

## Cost diagnostics
The log now includes:
- `Product researcher web-search usage`
- `Indexed security fallback batch started`
- `Indexed security fallback batch finished`
- `modelCallsForExactRepair: 1`
- OpenAI `usage` returned by the exact-repair response
- reuse logs showing `additionalModelCalls: 0` when a later carousel stage reuses the same batch

This makes the next Inet test directly comparable with v144.10.

## Database / environment
No SQL migration is required.
No new Vercel environment variable is required.
