# Deploy Spreelo v143.99

1. Replace the deployed project with the complete v143.99 package.
2. No SQL needs to be run.
3. No new Vercel environment variables are required.
4. Redeploy.
5. Test one Animated product video using a product with a clean background and one with a difficult/lifestyle background.
6. In logs, the expected presentation modes are:
   - `existing_transparency` or `uniform_background_cutout` — fast local path
   - `ai_chroma_cutout` — one GPT-image-2 fallback succeeded and passed identity review
   - `safe_original_panel` — exact verified source image preserved after cutout fallbacks were unusable

A `safe_original_panel` is a successful delivery fallback, not an error.
