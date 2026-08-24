# PATCH V144.29

## 1. One-pass GPT-Image-2 video typography
- AI product video captions now reserve the first non-empty line as a short factual 3–6 word video headline.
- That headline is produced inside the existing post-text generation request, so no extra copy-generation API call is added.
- Kling is generated first.
- After Kling succeeds and passes product-surface validation, Spreelo samples four frames from the finished movie and sends those real frames plus the verified product reference to one GPT-Image-2 edit request.
- GPT-Image-2 renders the exact headline/subheadline on a real transparent RGBA 9:16 canvas.
- No separate placement-model call and no second GPT-Image-2 retry are allowed.
- The one typography generation is claimed/persisted before submission. If it fails, Spreelo fails closed rather than silently submitting another paid image generation.
- Shotstack only composites the finished transparent PNG over the real Kling movie.

## 2. Verified-surface product lock
- Retailer product images define the only verified product view/surfaces.
- A back-only apparel image verifies the back only; front-only verifies the front only.
- Hidden sides of apparel, shoes, computers, packaging, tools and other products may never be inferred or exposed.
- Kling receives the verified-view lock in both the opening-scene prompt and motion prompt.
- Finished videos are audited across seven sampled frames. Any unverified surface, changed print/logo/text/color/design or substituted product rejects the video before delivery.

## 3. Plan activation confirmation
- Ordinary plan activation uses the existing premium confirmation modal.
- The modal summarizes post count, first planned post, channels and goal.
- Primary action opens the AI calendar so the customer immediately sees the newly activated plan.

## 4. Global UI language reliability
- Translation cache bumped to v22.
- Translation generation now has one bounded repair pass for labels that fail validation.
- Labels still unresolved after that are deferred for six hours instead of triggering a rapid browser/OpenAI retry loop.
- Intentional identical terms are supported through explicit metadata, while non-Latin locales still reject leaked English.
- Swedish critical Content Studio/activation labels are built in, including the exact labels that previously produced unchanged_english warnings.
- Dynamic Content Studio translation-key coverage remains enforced across all 30 supported UI locales.

## 5. Platform compatibility retained
- Pinterest native video publishing remains enabled outside Pinterest Sandbox.
- Pinterest video media registration/upload/process/create-Pin flow remains intact.
- TikTok/Pinterest transient retry logic remains intact.
- Planner capability filtering continues to remove Pinterest video only when runtime capability reports Sandbox/no video support.

## Database / environment
- No new SQL migration.
- No required new environment variables.
