# Spreelo v144.15 — Deploy

## Deploy order
1. Deploy the full v144.15 ZIP as usual.
2. No SQL migration is required.
3. No new Vercel environment variables are required.

## Main changes
- fixes carousel `Incorrect locale information provided`
- skips a paid known-403 exact-repair batch when its candidate pool cannot possibly satisfy the carousel target
- requires a visually verified whole-product official reference before product-based generative media
- can switch to an existing verified reserve product before generation when the primary reference is unsafe/unavailable
- carries official gallery/availability evidence through the existing 403 exact-product repair
- replaces Kling's small centered 9:16 start-card construction with a large whole-product first frame
- strengthens Kling's viral/sales creative direction
- enables short readable Kling overlay text as a guarded beta
- preserves exactly one paid Kling generation per post

## Cost note
The full-product safety gate uses at most one bounded GPT-4.1-mini visual review for the candidate gallery during a generative product preflight. This is a deliberate pre-generation safety cost: it runs before paid Kling/image generation and prevents a cropped product image from forcing the generative model to guess missing product parts. The existing v144.12 cost tracker records its actual usage automatically.

There is no AI call for the carousel locale fix or for the mathematical known-403 candidate-count guard.

## Regression scope
The patch does not intentionally change:
- ordinary single product-post image selection
- ordinary carousel product identity rules
- exact same-page product lock
- normal direct retailer flow when the website is accessible
- campaign identity lock
- social publishing/OAuth
- generation cost accounting
- recurring schedule management
- Kling's one-paid-generation database guard

## Test notes
v144.15 dedicated safety checks and the relevant v144.07–v144.14 regression checks pass. Older v143.27 cannot execute in this source-only workspace because `sharp`/`node_modules` are not bundled; it fails identically on v144.14. The old v143.67 static test also still has the same pre-existing `admin.approvals.regenerateCarousel` assertion failure on both v144.14 and v144.15.
