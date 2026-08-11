# Spreelo v143.79 — approved Settings + AI Content Studio polish

## Settings
- Rebuilt Settings to follow the approved Spreelo mockup rather than the previous generic settings layout.
- Desktop overview is a two-part composition: compact hero on the left and six quick-setting cards on the right. The hero is intentionally not a full-width banner.
- Added the approved premium card language, spacing, rounded geometry, pastel accents and stronger information hierarchy.
- Reworked the subscription area into a premium pricing layout with Starter, Growth and Pro cards plus a separate extra-credit rail.
- Increased previously minimalist text sizes across plan descriptions, plan features, status labels, credit packs and supporting copy.
- Added clearer plan positioning and richer, truthful plan differentiation based on publishing capacity/use case without inventing unsupported product locks.
- Added a clear “How Spreelo credits work” explanation.
- Preserved Stripe checkout, plan changes, cancellation, trial and credit-pack behavior from v143.77/v143.78.
- Kept the danger zone visually separate and professional.

## AI Content Studio
- Replaced the old hero artwork with the approved new Spreelo hero assets for desktop and mobile.
- Kept the same desktop hero height/composition style as the existing AI Content Studio instead of introducing an oversized banner.
- Mobile now uses more of the available screen width while retaining a small outer margin.
- Reduced the visual dominance of the platform adaptation note.
- Readability pass for small descriptive text in settings tiles, format cards, filters and activation notes.
- Mobile hero is more compact and uses a purpose-built mobile image.

## Responsive
- Settings overview stacks cleanly for tablet and mobile.
- Quick-setting cards use a compact multi-column mobile layout where space permits, then one column on very narrow screens.
- Billing cards stack to readable full-width cards on mobile.
- AI Content Studio mobile gutters are reduced without touching screen edges.

## Assets
- `public/backgrounds/spreelo-ai-studio-hero-desktop-v14379.png`
- `public/backgrounds/spreelo-ai-studio-hero-mobile-v14379.png`
- `public/backgrounds/spreelo-settings-hero-desktop-v14379.png`
- `public/backgrounds/spreelo-settings-hero-mobile-v14379.png`

## Localization
- English remains the source language for new UI labels.
- Swedish built-in labels added for the new Settings/Billing copy.
- UI translation cache bumped to v19 so other languages can refresh the added labels.

## Database
- No new SQL is required for v143.79.
- v143.79 builds on the v143.78 database migration.
