# PATCH V144.28

## Kling AI product video — true direct-scene opening

- Replaces the normal "product composited on a background" Kling first frame with a GPT-Image-2 edited, photorealistic in-scene advertising frame.
- For safely isolated/full products, the first frame already shows the exact product genuinely in use (for example apparel worn by a person).
- For cropped/identity-sensitive products, the generated first frame must preserve only the verified visible product area and cannot invent unseen identity-defining surfaces.
- Every generated direct-scene opening is checked against the authoritative retailer image with a separate vision identity review. It must pass at >= 0.90 confidence and match variant, print/logo/text and product identity.
- If the direct-scene frame cannot be trusted, Spreelo falls back to the pixel-preserving provider guidance frame but trims 1.9 seconds from the delivered video so the setup/transition never reaches the published ad.
- Direct-scene videos use only a minimal 0.15 s trim.
- GPT-Image-2 transparent advertising typography remains a separate overlay and is retimed against the delivered/truncated clip.

## UI translations — stop false unchanged-English retries

- The translation API now lets the model explicitly mark genuinely identical target-language terms (for example Swedish "Admin") as intentionally unchanged.
- Those accepted terms are stored as translation metadata and are not re-requested on every page load.
- The metadata is stripped from the customer-facing translation response.
- Non-Latin-script locales do not accept ordinary English words as intentionally unchanged, preventing Chinese/Japanese/etc. from silently retaining English UI copy.
- Real untranslated English remains rejected, as do broken placeholders.

## No database migration

No new SQL or environment variable is required.
