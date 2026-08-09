# v143.57 — Product identity integrity

This release makes product identity fail-closed across website product posts and carousels.

## Changes
- Adds a semantic image-identity gate after technical product-image resolution.
- Rejects images that show the wrong product category, brand/model or unrelated merchandise.
- Allows people/animals when they genuinely show the verified product.
- Uses verified reserve products when the primary product image fails the identity gate.
- Blocks the post instead of publishing if no exact product/image identity can be verified.
- Binds carousel slide image, title and URL to the same selected product identity key.
- Product slide source images now come only from the authoritative selected product object, never from generated slide ordering.
- AI cannot rename/reorder the concrete product headline on product slides.
- Adds a product-copy identity validator for both single-product posts and carousels.
- Wrong/invented concrete product mentions are rewritten and revalidated; if the second validation fails, generation stops rather than publishing incorrect copy.

## Database
No new SQL migration is required.
