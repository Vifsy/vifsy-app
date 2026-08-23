# Spreelo v144.18 – GPT Image 2 transparent product assets

Built from v144.17.

## 1. GPT Image 2 typography is now the default separate text layer
Whenever Spreelo creates a product image/video where product text is added as a separate visual layer, the visible typography is now generated with GPT Image 2 on a real transparent RGBA background.

Applied to:
- normal single-product images;
- product carousel slides;
- animated product Reels;
- admin product/carousel regeneration using the same renderer.

The prompt explicitly forbids:
- cards/panels;
- badges/stickers;
- opaque text backgrounds;
- banners/rectangles/capsules;
- fake UI or product redraws.

The source image/video poster is supplied as visual context so GPT Image 2 can adapt typography, contrast and style to the actual product and composition.

## 2. AI product ads do NOT get a second text layer
`website_item_text_ad` / AI product ads keep their existing full-image generation path, where GPT Image 2 creates product + composition + integrated text in one finished image.

No separate typography overlay is added afterward.

## 3. Real alpha validation
Generated typography is checked before it is composited.

Spreelo rejects the GPT typography result if it:
- is effectively blank;
- contains too much opaque area (panel-like output);
- leaks substantially outside the reserved safe text area;
- fills corners/edges like a background instead of remaining transparent.

If the GPT typography asset is unusable, delivery falls back to local text-only typography with no card/background.

## 4. Smarter GPT Image 2 product isolation
The existing animated-product AI cutout fallback now uses real GPT Image 2 alpha transparency instead of technical chroma-key generation.

The isolation prompt is product-aware and receives the exact verified ecommerce product context. It tells GPT Image 2 to:
- identify the physical product most likely being sold;
- keep a real pair/kit/bundle when the listing itself sells that set;
- remove promotional graphics, unrelated text, people, hands, props, scenery and other products;
- preserve visible product identity exactly;
- never invent hidden sides/details;
- return only the visible product on transparent RGBA.

The edited result still passes a separate visual identity review against the authoritative retailer image before it is trusted.

## 5. Selective static product cutouts
Normal product images are not blindly sent through product isolation.

The existing product-image analysis now returns `cutout_recommended`:
- true only when the exact sold product is clearly separable and isolation improves the product-led design;
- false for meaningful lifestyle/in-use images, worn/held products, ambiguous multi-product scenes or uncertain isolation.

Existing real transparency is always used directly first. GPT Image 2 isolation runs only when a non-transparent image is specifically judged suitable for cutout. If isolation fails identity/safety checks, Spreelo keeps the original image.

## 6. No Kling text regression
Kling remains forbidden from generating new readable overlay text. Animated product Reel typography stays a separate GPT Image 2 transparent asset layered in Shotstack.

## Verification
Passed:
- `node scripts/test-v144-18-gpt-image-transparent-assets.mjs`
- `node scripts/test-v144-17-purchasable-products-no-kling-text.mjs`
- v144.13 campaign identity lock
- v144.12 exact generation cost tracking
- v144.11 batched 403 fallback
- v144.10 indexed 403 fallback
- v144.09 Kling duration finalization
- v144.07 Kling AI video/provider smoke checks
- v143.58 exact-product recovery
- v143.64 locked product-page object
- v143.57 product identity integrity
- Node syntax checks for the main automation worker and both admin regeneration routes

`npm run build` was not executed in this isolated workspace because the uploaded full zip does not contain `node_modules`. The targeted regression checks and syntax checks above passed.

Note: the old v144.16 regression script encodes behavior that v144.17 intentionally superseded (it forbids `availability_status` and expects the removed Kling text beta), so it is not a valid regression target for v144.18.
