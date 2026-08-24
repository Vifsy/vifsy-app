# Spreelo v144.41 — Transparent Creative Kling Typography

## Why
GPT-Image-2 successfully returned a typography image, but Spreelo rejected it with `contained too much opaque area` and replaced it with the simple deterministic SVG fallback. The old validator used a blanket 22% visible-pixel limit, which could reject legitimate typography with compact decorative accents.

## Changes
- Keeps creative GPT-Image-2 typography: accent color, compact underline, small brush stroke, small crown/flourish and small graphic accents remain allowed.
- Prompt now explicitly defines the output as a **foreground overlay layer** for an existing video, not a standalone image/poster.
- Every pixel outside letters and small tightly attached accents must be alpha 0.
- AI prompt forbids shadow, glow, haze, mist, blur, full-canvas tint and background-like panels.
- Replaces the blanket 22% opacity cutoff with multiple checks for:
  - clearly background-sized visible area,
  - dense panel-like regions,
  - broad low-alpha haze,
  - excessive edge contact.
- Preserves artwork proportions when converting GPT-Image-2's portrait output to 1080x1920 by using transparent `contain` padding instead of stretching with `fit: fill`.
- If the GPT overlay is rejected, the normalized rejected PNG and its alpha metrics are persisted for diagnostics before the deterministic fallback is used.

## Scope
Only Kling finalization / typography is changed. Product discovery, product locking, product image verification, pricing removal, Kling generation and Shotstack logic are otherwise unchanged.

## Deployment
- No SQL migration.
- No new environment variables.
