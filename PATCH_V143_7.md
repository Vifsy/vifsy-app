# V143.7 fallback runtime fix

## Confirmed from production exports

The Zalando, Boozt and Pressit carousel occurrences at 23:52–23:53 failed
with the same runtime error:

`isCampaignProductCarouselRule is not defined`

The failure happened before product discovery and masked the original carousel
preparation error.

## Fixed

- The delivery fallback now uses the existing, defined checks
  `isCarouselRule(rule)` and `isCampaignScopedWebsiteRule(rule)`.
- Keeps the V143.6 catalog proof scope correction.
- Keeps terminal failure reasons visible in Vercel.
- Adds a full worker-file unbound-reference audit so missing runtime helpers are
  caught before packaging.

No new SQL is required.
