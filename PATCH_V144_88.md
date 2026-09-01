# Spreelo v144.88 — Responsive bridge

Scope is intentionally limited to Planinställningar and Veckovis publiceringsrytm at intermediate content widths.

- Keeps the approved mobile layout unchanged at <=760px.
- Keeps the approved wide-desktop layout unchanged when the settings content area is >=1280px.
- Uses CSS container queries so the component responds to its real available width after the sidebar, not just browser width.
- At <=899px available content width, switches to the stable six-row settings layout and stacks the week intro above the seven-day strip.
- At 900–1279px available content width, uses a 2 + 1 card layout and stacks the week intro above the seven-day strip.
- No billing, credits, planning logic, publishing logic, database, or API changes.
- No SQL required.
