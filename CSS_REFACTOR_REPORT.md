# CSS refactor report — v143.40

Spreelo previously had a chronological CSS cascade with 51 active imports. The structure was safe for rapid iteration, but late versions repeatedly overrode the same components and made responsive regressions harder to reason about.

## Active structure now

`app/globals.css` loads 18 stylesheets in chronological cascade order:

- Core/foundation modules `01`–`14`
- `15-legacy-overrides-v94-v114.css`
- `27-image-backgrounds-admin.css`
- `28-calendar-admin-v130-v140.css`
- `38-current-experience-v143.css`

The 36 source files that were consolidated remain under `app/styles/archive-v143/`. They are history/reference only and are not imported by the app.

## What was removed

The cleanup is intentionally cascade-aware rather than a blind minifier. Inside each chronological bundle, an earlier declaration is removed only when:

1. the selector is exactly the same,
2. the at-rule scope is exactly the same,
3. the CSS property is exactly the same, and
4. a later declaration has equal or stronger cascade priority.

This removed 813 declarations that could no longer affect the final computed style. Animation keyframes were not pruned.

## Verification

A programmatic comparison of the archived source chain against the consolidated bundles confirmed that every final winning exact-selector property value and `!important` state is unchanged. All active stylesheets parse without CSS syntax errors.

The cleanup deliberately does not attempt speculative unused-selector deletion in the foundational modules because many Spreelo classes are state-driven, modal-only, admin-only or responsive-only.
