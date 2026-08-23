# Patch v144.15 — Generative product safety, carousel locale hardening and Kling text beta

## Scope
v144.15 is based directly on v144.14. The changes are isolated to the carousel typography safety path, the known-403 exact-product fallback efficiency guard, and product-based generative media (AI product ad + animated product video + Kling AI video).

The normal product-post selection flow, exact-product identity lock, ordinary product-image behavior, campaign identity lock, publishing, social integrations, cost ledger and one-paid-Kling-generation invariant remain in place.

## 1. Carousel locale rendering no longer fails on malformed locale strings
`lib/globalProductTypography.js` now canonicalizes locale values before `Intl.Segmenter` is created.

Examples:
- `sv_SE` -> `sv-SE`
- `en_US` -> `en-US`
- malformed locale strings -> safe `und` fallback

This fixes the `Incorrect locale information provided` render failure without changing product selection, copy or carousel layout.

## 2. Impossible known-403 carousel repair batches are not purchased
Before the one allowed exact GPT-5.5 security-repair batch, Spreelo now checks whether the candidate pool can mathematically satisfy the requested verified product count.

Example: 5 candidate products with a target of 6 verified products can never satisfy the carousel requirement. In that case the exact-repair call is skipped and the existing broader campaign fallback is allowed to gather enough candidates first.

Single-product target=1 behavior is unchanged.

## 3. Full-product reference safety for generative media
Product-based generative media now has a dedicated preflight before paid image/video generation.

Affected formats:
- AI product ad (`website_item_text_ad`)
- animated product Reel (`animated_website_item`)
- Kling AI product video (`ai_product_video`)

Spreelo gathers up to six official product-gallery images and performs one bounded visual safety review. The selected reference must:
- depict the exact verified product
- show the entire marketed physical product / marketed set
- not crop off a physical product edge
- not be only a close-up/detail
- not be packaging-only
- meet the existing high-confidence safety threshold

A web-research hint that an image is a full-product image is not blindly trusted; the actual image pixels are checked before generative media is created.

If the primary product is unsuitable, Spreelo tries existing verified reserve products. It does not ask a generative model to invent missing product parts.

## 4. Official gallery + availability data carried through the 403 fallback
The existing exact GPT-5.5 403 repair now requests and carries, in addition to the existing exact main-product lock:
- up to six official same-product gallery image URLs
- a suggested full-product reference image
- current availability evidence when the official page exposes it

Clearly `out_of_stock` / `discontinued` products are skipped for sales-oriented generative media when a better verified product/reserve is available. Unknown availability remains allowed, so missing stock metadata does not create a new hard failure by itself.

The original exact main-product image remains locked as before for the ordinary product-image path.

## 5. Kling first frame rebuilt
The old Kling reference construction placed a landscape retailer image inside a 1080x1920 canvas with `contain`, which could produce a small centered rectangle that Kling then enlarged.

v144.15 instead:
- builds a vertical 1080x1920 background from the same verified image
- uses a local pixel-preserving product cutout when safe
- otherwise keeps the unchanged official full-product frame large
- starts with the whole product already visually dominant
- does not AI-redraw product pixels while preparing the reference frame

## 6. Kling creative direction is more sales-oriented / viral
The Kling prompt now explicitly requests:
- an immediate 0.5–1.0 second pattern interrupt
- faster escalation
- a clear final visual payoff
- product-relevant environmental action / people / props / effects when appropriate
- no generic slow zoom, simple spin or empty studio demonstration

The product itself remains locked to the exact visible angle and visible surfaces in the verified first frame.

## 7. Kling readable text beta
The old blanket ban on readable overlay text has been removed for Kling AI product video.

Spreelo's existing product-video prompt-director step now proposes at most two short overlay phrases. Kling is instructed to render those phrases as stylish motion typography.

Safety rules:
- normally 2–5 words per phrase
- correct post language
- no digits
- no prices
- no discounts / percentages
- no dates
- no stock/availability claims
- no technical specifications
- no guarantees or invented product features
- no fake logos or watermarks
- campaign identity lock still applies to all video text

This is intentionally a beta because video models can still render typography imperfectly.

## 8. One paid Kling generation remains absolute
v144.15 does not add a Kling retry loop. The existing atomic `claim_kling_video_generation` path and exactly one `submitKlingImageToVideo(...)` runtime submission remain unchanged.

If reference verification fails, Spreelo fails/switches product before the paid Kling call rather than purchasing another video attempt.

## 9. Logging
Generative reference selection now logs:
- selected product + URL
- selected official reference image
- number of official candidates reviewed
- whether the full product is visible
- visual confidence/reason
- availability status
- visual-review usage
- whether web research had supplied a full-product hint

The existing generation-cost tracker wraps the new OpenAI review as well, so its actual usage is included in the post cost ledger.

## Files changed from v144.14
- `app/api/cron/run-automations/route.js`
- `app/api/admin/post-approvals/regenerate-product/route.js`
- `lib/globalProductTypography.js`
- new `scripts/test-v144-15-generative-product-safety-kling-text.mjs`
- docs only

No SQL migration is required.
No new Vercel environment variables are required.
