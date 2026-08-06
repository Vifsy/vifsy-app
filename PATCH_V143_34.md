# Spreelo v143.34 — regression recovery

This release repairs the UI and workflow regressions visible in v143.33.1.

## Fixed

- Calendar campaigns render the original campaign-specific planning workflow again. The regular Content Studio is no longer rendered in campaign mode.
- Existing carousel products remain valid when one product is replaced. Older products without a dedicated description reuse their existing product title instead of being counted as empty.
- Stored partial carousel edits are merged with the original five slides by position, so unchanged products are preserved.
- Timezone is contained beside the start-date control within the same settings card and never floats over labels.
- Mobile planned-post rows use a fixed icon rail and explicit grid areas for date, post copy, purpose, channel, cost and menu.
- The mobile activation card uses a stable icon/copy grid and readable full-width actions.
- Small explanatory copy in the ongoing-plan and activation areas is increased on desktop and mobile.
- Home, Brand Profile and Social Channels use the same rounded, layered glass surfaces and page canvas as Content Studio.
- Brand Profile summary fields are separated rounded cards instead of a square joined table.

## Verification

- `scripts/test-v143-34-regression-recovery.mjs`
- Next.js 16 production build with webpack: all 32 static pages generated and all routes compiled.

No new database migration is required for v143.34. Existing v143.33 migrations remain included in the package.
