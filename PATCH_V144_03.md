# v144.03 — TikTok media + approval polish

- TikTok receives clean pre-logo image variants while other platforms keep the normal Spreelo logo overlay.
- Carousel slides store a TikTok-specific clean image URL in slide metadata.
- TikTok media proxy converts photo media to JPEG, max 1080×1080, correct MIME type and <=20 MB.
- UTF-16-safe TikTok title/caption limits.
- Better TikTok error diagnostics and permanent invalid-param handling.
- Professional modal-style TikTok customer approval page with carousel browsing.
- TikTok approval copy uses approvePages translation keys so first-use translations are generated and saved in ui_translation_packs.
