# Spreelo v143.26

## Adaptive product names on carousel images

- Analyzes all product images in one bounded low-detail vision request.
- The model only returns a product bounding box, one of four predefined placements, layout type and text tone.
- Sharp/SVG renders the verified product title deterministically; AI never generates the final typography.
- The existing source-image size and crop are unchanged. A geometric overlap check prevents text from covering the product.
- Uses text-only treatment on calm areas and a translucent rounded card on busier areas.
- Skips the label and preserves the original image if analysis fails, confidence is low, the logo corner is reserved or no safe placement exists.
- People and animals are allowed throughout campaign research and product-image selection.

## Durable GPT-5.5 campaign research status

- Background-pending is logged as a normal deferred state instead of an error/failure.
- New background responses and resumed response IDs have separate log messages.
- Logs and deferred run metadata include occurrence ID, OpenAI response ID and poll count.
- Existing durable job storage and idempotency key continue to prevent a second paid research start for the same occurrence and round.

## Platform-specific caption formatting

- Instagram captions start with an invisible separator and newline so the account name appears on its own line.
- Facebook and other platforms continue to receive the original post content unchanged.
- Instagram captions remain bounded to 2,200 characters.

## Validation

- v143.10-v143.23 relevant regression checks passed (excluding superseded v143.18 behavior).
- v143.25 live-link/open-image checks passed.
- New v143.26 adaptive-label, resume-log and Instagram-caption checks passed.
- Sharp runtime verified and Next.js 16.2.10 production build completed successfully.
- No database migration is required.
