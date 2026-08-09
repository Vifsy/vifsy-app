# v143.65 — Brand-aware locked product labels

## What changed

The locked product-page object remains the single source of truth introduced in v143.64. This update improves the final visual presentation and removes one false-negative path in the semantic safety belt.

### Brand is now rendered from the locked product object

Carousel and single-product labels now use a structured presentation built from the locked product object:

1. campaign eyebrow,
2. locked brand,
3. model/product name,
4. concise verified product type and colour when it fits.

For example a locked Nike product can render as:

- `NIKE SPORTSWEAR`
- `ELEMENTAL UNISEX`
- `Dagryggsäck · black/white`

The renderer no longer relies on the retailer title alone to communicate the brand.

### Better customer-facing product type

The existing final semantic image check now also returns `display_product_type`. This is presentation metadata only; it does not change the locked identity. It lets Spreelo describe the marketed item more naturally when retailer taxonomy is misleading, e.g. a backpack set with a pencil case should be presented as a backpack set rather than only as `Pennfodral`.

### Parent/sub-brand wording no longer causes false rejects

The exact same-page product lock remains authoritative. The semantic safety belt now treats a fuller compatible observed brand name as compatible when it contains the locked brand identity. Extra parent/sub-brand words alone no longer discard an otherwise exact locked product.

Genuinely unrelated brands, model conflicts, product-type conflicts, and obvious colour/variant conflicts still fail closed.

## Admin regeneration

Admin-regenerated product slides use the same brand-aware product-label renderer. Brand/display-type fields are preserved when available.

## Database

No SQL migration is required.
