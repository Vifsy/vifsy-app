# Spreelo v144.56 — public product copy cleanup + video music variety

## Why this patch exists

A live carousel test exposed two customer-facing copy problems on a product slide:

- an internal Content Studio plan/schedule label such as `Sälj mer · tors` could be rendered as a visible campaign eyebrow;
- a generic product category could be rendered under a product name that already contained the same category, e.g. `Grillkorv 5-pack ca 290 gram` plus a second `Grillkorv` line.

The same audit also showed why repeated video tests could select the same song: music matching was deterministic and one broad, high-priority track could win every similar context even though the library contains 38 tracks.

## 1. Internal plan names are no longer public advertising copy

`app/api/cron/run-automations/route.js`

Internal values such as:

- Content Studio plan names;
- goal labels (`Sell more`, etc.);
- weekday/date schedule labels;
- slot/worker/queue metadata;

are now explicitly treated as planning metadata and are not eligible customer-facing copy.

The old product eyebrow path used the approval campaign title and ultimately fell back to `rule.name`. That fallback has been removed from visible product typography.

A product-image eyebrow is now optional and may only come from a recognized real season/occasion/theme, such as:

- Summer / Sommar;
- Spring / Vår;
- Autumn/Fall / Höst;
- Winter / Vinter;
- Halloween;
- Christmas / Jul;
- New Year / Nyår;
- Black Friday;
- Cyber Monday;
- Singles Day;
- Back to school / Skolstart;
- Easter / Påsk;
- Midsummer / Midsommar;
- Father's Day / Fars dag;
- Mother's Day / Mors dag;
- Valentine's Day / Alla hjärtans dag.

The campaign/theme can still guide visual style, product research and creative direction. The raw internal plan title is no longer rendered verbatim.

## 2. Duplicate product descriptor removed centrally

The shared product-label presentation now suppresses a descriptor when it merely repeats text already present in the main product name.

Example before:

- CARLSTRÖMS
- Grillkorv 5-pack ca 290 gram
- Grillkorv

After:

- CARLSTRÖMS
- Grillkorv 5-pack ca 290 gram

Distinct useful information is preserved. For example, a model title can still be followed by a genuinely different product type and colour.

Because this is fixed in the shared product-presentation helper, it applies across the customer-facing paths that reuse it, including carousel product slides, single-product presentation, animated product Reel assets, Kling product typography helpers and Admin carousel regeneration.

## 3. Product typography hierarchy strengthened

GPT Image transparent product typography is now told that:

- the product name is the visually dominant text;
- it must be clearly larger/heavier than brand, eyebrow or descriptor;
- tiny metadata-style stacked text is not acceptable;
- when only brand + product name are needed, the available space should be used more confidently.

This keeps clean slides from looking like small technical metadata in a large empty corner.

## 4. Other customer-facing fallbacks audited

Additional protections were added so the same internal-name leak does not reappear through another post path:

- main social-caption generation explicitly forbids scheduling/internal plan metadata as copy;
- deterministic caption fallback no longer starts with `rule.name`;
- emergency social-card headline no longer falls back to `rule.name`;
- AI product-ad images explicitly forbid internal plan/goal/weekday text;
- AI product-ad images are told not to repeat product name/category in multiple text elements;
- Kling transparent overlay subcopy now rejects a second line when it merely repeats/contains the headline;
- Admin carousel regeneration no longer turns occurrence/plan titles into public campaign copy;
- product-search/campaign research no longer uses the internal plan name as if it were the actual campaign theme.

## 5. Campaign identity remains available for real themes

The strict campaign-identity lock still works for real recognized themes such as Black Friday or Christmas.

For normal Content Studio plans, a generic organizational name such as `Sell more · Thu` no longer creates a hard campaign identity. For explicit calendar campaigns, structured customer-facing campaign/theme data remains available to the creative system.

## 6. Video music selection now rotates intelligently

`lib/videoMusicLibrary.js`

The music chooser still scores tracks by relevance:

- category;
- mood;
- industry;
- video format;
- keywords;
- energy;
- editorial priority.

It now also adds two variety signals:

### Recent-use penalty

The selector reads recent posts for the same brand (or user when no brand id is available) and strongly de-prioritizes:

- the exact song used most recently;
- close variants from the same track family.

The penalty decays through older usage instead of permanently banning a suitable song.

### Deterministic per-post variety

Near-equal suitable tracks receive a small deterministic bonus derived from the post id. This means different posts can choose different suitable tracks without non-reproducible random behavior.

The same selector is used for both:

- animated product Reels;
- final Kling AI product videos.

Music diagnostics now persist/log:

- chosen asset id/name;
- match score/reasons;
- recent-use penalty;
- per-post variety bonus;
- number of eligible tracks.

If only one track is active/long enough, Spreelo can still use that one rather than failing the video.

## Verification

Passed:

- Node syntax checks for all modified JS routes/libraries;
- new `test:v144.56` public-product-copy + video-music-variety regression test;
- v143.65 brand-aware product-label presentation;
- v144.25 professional Kling advertising;
- v144.41 transparent Kling typography;
- v144.42 complete headline + strict Kling product identity;
- v144.48 video music library;
- v144.49 Admin-managed music library;
- v144.52 market assortment/content-language separation;
- v144.54 Kling scene-continuity/provider-priority.

A full Next.js build was not run because the supplied ZIP does not include `node_modules`. No SQL migration or new Vercel environment variable is required.
