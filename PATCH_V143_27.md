# Spreelo v143.27

## Global adaptive product titles

- Product titles are rendered locally and copied exactly; the placement model never writes or translates them.
- Unicode grapheme-aware wrapping prevents broken combining characters and emoji.
- Arabic and Hebrew use right-to-left layout. CJK, Indic, Thai, Khmer, Myanmar, Sinhala, Georgian and Latin/Greek/Cyrillic titles select bundled Noto/Source Han families.
- Font size, line height, text alignment and card size adapt to the title and script.
- Six candidate areas are available instead of four large corners.
- People and animals remain allowed; text is still kept away from faces and important subjects.

## Timeout-safe placement

- The single low-detail placement request has a 45-second budget and zero automatic retries.
- If it times out, a deterministic local packshot detector looks for a visually empty area without another OpenAI request.
- Transparent product cutouts always receive a local non-overlap fallback when a safe area exists.
- Lifestyle images remain unchanged when neither AI nor strict local geometry can prove a safe placement.
- Per-slide metadata and logs now record source, reason, placement, layout, font, script and direction.

## Deployment

- Bundled fonts and the SIL OFL license are included in function output tracing.
- No database migration is required.
