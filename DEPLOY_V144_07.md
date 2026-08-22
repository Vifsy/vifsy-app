# Spreelo v144.07 — Kling AI product video

This release adds a new selectable **AI product video** format using Kling image-to-video while leaving the existing Shotstack **Animated product Reel** path intact.

## Important cost guard

A post can submit **one Kling generation only**.

- `claim_kling_video_generation()` atomically changes `kling_generation_count` from `0` to `1`.
- A second worker cannot claim the same post.
- Provider submission has no automatic retry loop.
- If Kling fails, the post is marked failed and no replacement generation is started.
- The admin product-regeneration endpoint also refuses to regenerate a Kling video on the same post.
- The finalizer may re-poll or re-copy the **same existing Kling task**; that does not generate or bill a second video.

## Deployment order

### 1. Run the Supabase migration first

Open Supabase SQL Editor and run the full file:

`spreelo-v144.07-SQL.sql`

This adds the Kling task fields, the atomic one-generation RPC, the catalog entry and the supporting index/bucket configuration.

### 2. Deploy the v144.07 code

Deploy the complete v144.07 project ZIP to Vercel in the same way as the current Spreelo version.

The old Shotstack Reel code is still present and uses `video_provider = 'shotstack'`. The new Kling path uses `video_provider = 'kling'`.

### 3. Add Kling credentials in Vercel

Do not place secrets in source code.

The adapter supports either of the credential styles exposed by Kling Developer.

#### Preferred/current API-key configuration

Set:

- `KLING_API_KEY` = your Kling Developer API key
- `KLING_API_FAMILY` = `current` (optional; `auto` is the default and prefers `KLING_API_KEY`)

Defaults already built into v144.07:

- `KLING_API_BASE_URL=https://api-singapore.klingai.com`
- `KLING_CURRENT_MODEL=kling-3.0`
- `KLING_VIDEO_DURATION_SECONDS=6`
- `KLING_VIDEO_RESOLUTION=720p`
- `KLING_VIDEO_AUDIO=off`
- `KLING_MAX_PENDING_HOURS=6`

You only need to add the optional values above if you want to override a default.

#### If Kling Developer gives you Access Key + Secret Key instead

Set:

- `KLING_ACCESS_KEY`
- `KLING_SECRET_KEY`
- `KLING_API_FAMILY=legacy`

Optional legacy model override:

- `KLING_LEGACY_MODEL=kling-v3`

If both credential styles are present while `KLING_API_FAMILY=auto`, Spreelo prefers `KLING_API_KEY`.

### 4. Redeploy after environment variables are saved

Vercel environment-variable changes need to be present in the deployment that runs the server routes.

## First test

In AI Content Studio, manually select **AI product video** for a product-based slot.

v144.07 intentionally does **not** add Kling videos to the automatic planning recipes yet. This prevents automatic paid Kling usage while quality is being evaluated.

Expected flow:

1. Spreelo verifies one exact product and its product image.
2. Spreelo makes a deterministic 9:16 reference frame from that exact image. The product itself is not redrawn by AI.
3. Spreelo creates a product-specific, scroll-stopping Kling motion prompt with strict product-lock rules.
4. The database atomically reserves the post's one allowed Kling generation.
5. Spreelo submits exactly one Kling task.
6. The post remains `generating` while Kling works.
7. `/api/cron/finalize-kling-videos` polls that same task once per minute.
8. When Kling succeeds, Spreelo immediately copies the MP4 to the existing public `post-videos` bucket.
9. The post changes to `pending_approval` and enters the normal Spreelo review flow.

## Product-lock rules in v144.07

The Kling prompt explicitly requires:

- only product surfaces already visible in the verified reference image may be shown;
- no back, sides, top, bottom, underside, interior, hidden edges or hidden labels may be invented;
- no spin, flip, orbit, product turn or camera move that reveals a new product angle;
- visible branding, text, colors, shape and proportions must stay intact;
- creative movement should happen around the product when interaction would reveal a hidden area;
- no generated readable overlay text or watermark.

These rules reduce hallucinated product geometry, but no generative-video model can guarantee perfect product fidelity in every clip. Review remains required.

## Failure behavior

If the Kling generation itself fails or times out:

- `video_status = failed`
- the review case becomes `needs_repair`
- no automatic second generation is submitted
- `kling_generation_count` remains `1`

If Kling has already succeeded but copying its result into Supabase has a temporary failure, the finalizer can retry downloading/copying the **same task result**. It never creates a new Kling generation.

## Files added/changed for the integration

Main additions:

- `lib/kling.js`
- `app/api/cron/finalize-kling-videos/route.js`
- `supabase/v144_07_kling_ai_video.sql`
- `spreelo-v144.07-SQL.sql`
- `scripts/test-v144-07-kling-ai-video.mjs`

Existing Shotstack functionality remains separate.
