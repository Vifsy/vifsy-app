# Spreelo v144.25 — Professional Kling advertising

This release is deliberately isolated from v144.24 product discovery and protected-retailer delivery logic.

## AI product video
- Kling now distinguishes a sufficiently full/isolated product reference from a cropped/uncertain reference.
- Full/isolated references require genuine product use in the scene (wear apparel, hold/operate handheld products, use tools/appliances/gear in context).
- Cropped/uncertain references stay locked to the verified visible crop: no zoom-out, completion, hidden-side reveal or invented product pixels.
- Particle-only/floating/spinning product concepts are explicitly rejected in the video director prompt.
- The generated clip remains text-free inside Kling to prevent AI-written/warped typography.

## Professional typography
- AI product video now reuses the v144.18 GPT-Image-2 transparent Reel typography system.
- Exact product typography is generated before Kling submission and stored as a transparent PNG.
- After Kling succeeds, Shotstack composites the transparent typography over the real Kling movie, beginning after the opening hook.
- The post-process render id is persisted in existing JSON state so finalizer retries resume the same Shotstack render instead of creating duplicates.
- GPT-Image-2 and Shotstack post-process costs use the existing generation cost ledger.

## Logging
- Expected security-blocked discovery fetches (403 etc.) are logged as informational fallback events instead of generic red errors.

## Compatibility
- No new SQL migration.
- No new environment variable. Uses the existing Shotstack/OpenAI/Kling configuration.
- v144.24 protected-retailer/product-delivery logic remains in place.
