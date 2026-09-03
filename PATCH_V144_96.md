# Spreelo v144.96 — Responsive Brand Profile logo explanation

- Keeps the v144.95 Brand Profile glass design and makes all read-only profile copy wrap naturally instead of being truncated at intermediate widths.
- Replaces the compact logo row with the selected explanatory two-column layout: logo benefits/current logo on the left and an example social post on the right.
- Adds a responsive social-post preview using a local example creative.
- Before a customer uploads a logo, the preview automatically shows an example logo made from the current brand initials (for example `nf` for Nordic Feel).
- As soon as a real logo is uploaded, React state updates both the current-logo card and the example post so the customer's real logo is shown immediately.
- Desktop uses profile facts + logo explainer side by side when there is enough room; tablet stacks before content becomes cramped; mobile uses a single-column layout.
- Hero text gets full readable width on mobile while the artwork remains decorative in the background.
- No SQL changes.
