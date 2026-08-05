# Spreelo v143.29

## Brand Profile redesign

- Brand Profile now uses the same calm `#f5f7fb` canvas, white surfaces, spacing, typography scale and border treatment as AI Content Studio.
- Removed the large numbered 1–4 setup sidebar.
- Replaced the warning-style hero box with a compact status panel for pending analysis, active analysis and ready state.
- Increased small labels and help copy to a readable minimum size.
- Simplified the profile into one centered content column with responsive desktop, tablet and mobile layouts.
- Completed profiles open in a clean read-only state. **Edit profile** unlocks the fields and **Save changes** appears only while editing.

## Automatic new-brand analysis

- The add-brand dialog button now says **Analyze website**.
- Creating a brand navigates to `/brand?analyze=1&brand=...`.
- Brand Profile consumes and removes that one-time marker, then starts website analysis automatically.
- A ref guard prevents React rerenders from starting the same analysis twice.
- The background analysis job already persists the generated profile, so no second Save button is required after completion.

No database migration or new environment variable is required for v143.29. The v143.28 migration is still required if it has not already been deployed.
