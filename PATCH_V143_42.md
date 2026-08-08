# Spreelo v143.42 — Premium Social Channels

This patch is deliberately scoped to the **Social Channels** workspace and keeps the existing Facebook/Instagram connection logic intact.

## What changed

- Uses the new responsive hero artwork already supplied in `public/backgrounds/`:
  - `spreelo-social-hero-desktop-v143-42.png`
  - `spreelo-social-hero-tablet-v143-42.png`
  - `spreelo-social-hero-mobile-v143-42.png`
- Rebuilt the Social Channels hero to match the lighter, premium AI Content Studio visual system.
- Replaced the large status box with a compact glass summary so the hero artwork stays visible.
- Reworked Facebook/Instagram into one unified connection workspace instead of oversized disconnected cards.
- Added platform-specific accent rails while keeping Spreelo's own coral CTA language.
- Desktop: compact three-part channel rows for identity, explanation, and connection action.
- Tablet: readable single-channel rows with the action area below the main information instead of cramped two-column cards.
- Mobile: real page gutters, full descriptions, visible status, selected brand/account context, and full-width labeled buttons. No more icon-only actions or ellipsized explanatory text.
- Added a dedicated final CSS layer, `app/styles/39-social-channels-v143-42.css`, to avoid disturbing other Spreelo pages.

## Functional scope

No authentication, Supabase schema, Meta callback, Instagram callback, disconnect logic, or connection endpoint behavior was changed.

## Verification

Run:

```bash
npm run test:v143.42
```
