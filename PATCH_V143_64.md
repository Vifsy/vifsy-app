# v143.64 — Locked product-page object

## What changed

The campaign carousel product flow no longer finds a product first and then searches the full retailer page for a plausible image.

For every selected direct product URL, Spreelo now opens that exact product page and builds one locked object containing the page's own title, canonical URL, SKU/article identifier when available, brand, category, colour/variant and main product image(s). The text and image travel together through generation.

Primary extraction order:
1. The exact-page `Product` JSON-LD object, including its own `image` field.
2. Page-level product/Open Graph metadata from that same direct product page.
3. If the retailer blocks Spreelo's technical fetch, the bounded GPT-5.5 exact-repair path may return one explicitly verified MAIN PRODUCT block from the same opened URL.

The initial campaign-research `image_url`, cached thumbnails, recommendation grids and generic page-image scanning are not identity sources for this authoritative campaign path.

## Fail-closed behaviour

If a locked image cannot be downloaded, is shared ambiguously between different locked products, or loses its same-page binding, Spreelo rejects that product. It does not search recommendations for a replacement image. The next campaign research round supplies another product instead.

The semantic image review remains only as a final safety belt after the page object has already been locked.

## Pinterest

After Create Pin returns an id, Spreelo now reads the Pin back from Pinterest before marking the Pinterest target published. A carousel must come back as `media.media_type = multiple_images` with exactly the expected image count. Otherwise the post is not marked published.

## Database

No SQL migration is required.

## Product facts stay locked too

The exact page object is also authoritative for price. Loose research price data is not allowed to leak into a different locked product. The exact-repair fallback now reads `current_price` from the same MAIN PRODUCT block as title/SKU/variant/image, and it must not substitute a different colour/size/style variant when the selected identity specifies one.
