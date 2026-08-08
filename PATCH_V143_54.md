# Spreelo v143.54 — Pinterest click-through + product label polish

## Pinterest
- Single-product Pins keep the exact product URL as their destination.
- Product carousels keep the relevant campaign/category/site destination.
- Multi-image Pins now repeat title, description and destination link on every Pinterest media item in addition to the top-level Pin fields. This follows Pinterest v5 multi-image media fields and gives every swipe item a click-through destination.
- Existing UTM tracking and durable retry/reconciliation remain unchanged.
- Product carousels still publish the five real product slides and exclude the AI outro on Pinterest.

## Carousel product label
- Product name is rendered at weight 900.
- The product-name block is vertically centred in the space between the blue eyebrow divider and the bottom of the glass card.

## Database / environment
- No new SQL migration.
- No new environment variables.
