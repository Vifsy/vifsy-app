# Deploy v144.25

1. Deploy the full project as usual.
2. No Supabase migration is required.
3. No new environment variable is required.
4. Existing `OPENAI_API_KEY`, Kling configuration and Shotstack configuration remain required for AI product video.
5. Recommended first smoke test: one AI Product Video using a readable store product with a full/transparent product image, then one cropped-reference product.

Expected log markers:
- `Kling product reference frame prepared` with `interactionMode`.
- `OpenAI context-aware transparent Reel typography created` (or the emergency local typography fallback).
- `Kling professional advertising typography render queued` after Kling succeeds.
- `Kling professional advertising typography applied` when final video is ready.
