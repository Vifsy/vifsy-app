# Spreelo v144.54 — Kling real-world scene continuity lock

## Why this patch exists

A live Emmaljunga test showed a visually obvious generative-video artifact: a park bench that was not present in the earlier visible scene later appeared without a physically plausible entrance/reveal. The product can be correct and the video can still look AI-generated if the surrounding physical world changes between frames.

v144.54 therefore adds **real-world temporal scene continuity** to both the paid Kling prompt and the existing finished-video audit.

The patch also fixes an important prompt-priority issue found while implementing this: Kling's provider request is capped at 2,500 prompt characters. In v144.53, some critical safety language was appended after the creative direction, so a long creative prompt could cut off later lock instructions before they reached Kling. v144.54 puts the critical product/scene locks first and keeps the final provider prompt below the provider limit.

## 1. Fixed physical-world scene lock before Kling

`app/api/cron/run-automations/route.js`

A compact provider-first safety prefix now tells Kling that frame 0 is one fixed physical set filmed by a real camera.

Static scene elements are continuity-locked, including:

- benches and furniture;
- signs and lamps;
- vegetation;
- buildings and architecture;
- paths, ground features and background structures.

They must not spontaneously:

- materialize;
- disappear;
- morph;
- relocate;
- swap into another object.

A new static object is allowed only when camera movement naturally reveals an area that was genuinely outside the earlier frame. An object may not be created in an area the camera already showed as empty.

Moving people, animals, vehicles and props may enter/leave only by continuous physical movement or plausible occlusion. Pop-in, pop-out, teleporting, unexplained disappearance and duplication are explicitly forbidden.

If spectacle conflicts with continuity, Kling is told to simplify the shot rather than regenerate the world.

## 2. Critical safety rules now reach the actual Kling provider

`app/api/cron/run-automations/route.js`
`lib/kling.js` (provider limit unchanged)

Kling already slices provider prompts to 2,500 characters.

v144.54 now builds the final provider prompt in this priority order:

1. hard product identity/view lock;
2. component-role lock;
3. surface-print / logo / label lock;
4. functional-truth lock;
5. scene-continuity lock;
6. no generated typography/fake logos;
7. deliberate ending direction;
8. product-specific creative direction.

The assembled prompt is capped at 2,450 characters before it reaches the 2,500-character provider boundary.

This means a long AI-generated creative concept can no longer push the critical product/scene rules beyond Kling's truncation boundary.

The deterministic fallback uses the same safety-first order.

## 3. Manual Kling retry is safety-first too

`app/api/admin/post-approvals/retry-kling/route.js`

The Admin retry now prepends both:

- the strict product retry lock;
- the scene-continuity retry lock.

Only after those locks does it append as much of the original creative direction as fits.

This matters for videos originally generated on older versions: even if their stored original prompt does not contain v144.54 scene rules, **Generate video again** receives the new scene lock first.

The retry remains Kling-only and still does not rerun product research, copy generation or product-image generation.

## 4. Existing finished-video audit now also checks scene continuity

`app/api/cron/finalize-kling-videos/route.js`

No additional AI audit call was added. The existing sampled-frame audit now also returns:

- `scene_continuity_preserved`
- `static_environment_geometry_preserved`
- `object_materialized_or_disappeared`

New violation codes:

- `scene_continuity_broken`
- `environment_geometry_changed`
- `object_appeared_or_disappeared`

A video is therefore rejected when the product is correct but the physical world visibly breaks continuity.

The audit explicitly distinguishes a legitimate camera reveal from an invented object: a newly visible bench/object is acceptable if it was outside the earlier field of view and is naturally revealed, but not if it appears in a region previously visible and empty.

## 5. Admin explains scene-continuity rejection

`app/admin/post-approvals/page.jsx`
`lib/i18n/defaultLabels.js`

The existing **Video rejected** Admin state now has readable reasons for scene failures, for example:

- physical scene continuity was broken;
- a static environmental object/structure changed;
- an object appeared or disappeared without a continuous physical explanation.

The existing **Generate video again** action remains available.

## What did not change

- No automatic paid Kling retry loop was added.
- Finished-video audit remains one existing audit call, not a second new model call.
- Product identity, verified-view, component-role, logo/label and functional-truth protections remain active.
- Music handling is unchanged.
- v144.53 protected-catalog, UI-translation and Admin repair changes remain intact.
- No SQL migration is required.

## Verification performed

Syntax checks passed for:

- `app/api/cron/run-automations/route.js`
- `app/api/cron/finalize-kling-videos/route.js`
- `app/api/admin/post-approvals/retry-kling/route.js`

Regression checks passed:

- v144.25 professional Kling advertising
- v144.31 Kling single-flight/cache
- v144.33 Kling typography fallback/backoff
- v144.39 universal product lock
- v144.42 strict finished-video product identity
- v144.44 deliberate Kling ending
- v144.48 video music library
- v144.49 Admin-managed music library
- v144.50 authoritative post language
- v144.52 market assortment/content-language separation
- v144.53 Kling/Admin/protected-source/i18n
- v144.54 scene-continuity/provider-priority regression

A full local Next.js build was not run because this workspace does not contain installed dependencies. Vercel remains the authoritative full build check.
