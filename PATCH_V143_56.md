# v143.56 — Consistent carousel glass labels

- Carousel product labels now always use Spreelo's compact translucent glass card.
- AI still chooses the safest placement and readable text tone, but can no longer remove the glass card by selecting `text_only`.
- AI placements are revalidated against the mapped product bounds before rendering.
- If the selected placement overlaps the product, Spreelo tries another safe placement.
- If no completely free placement exists, Spreelo uses the least-obstructive controlled-overlap placement rather than omitting the product label.
- A second render-time recovery pass prevents late geometry rejection from silently removing a label.
- No SQL migration is required.
