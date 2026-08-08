# Spreelo v143.50 — AI catalog safety, campaign responsive cleanup and Pinterest Sandbox

## AI image catalog safety
- General AI post images must no longer invent merchandise or product designs that could be mistaken for items sold by the customer.
- When no verified product image is supplied, Spreelo keeps the existing high-quality image workflow but visualizes the campaign through people, activities, environments, atmosphere and abstract/category context.
- Product-ad image edits keep the verified product as the only sellable item and may not invent alternate products or variants.
- Carousel outro generation follows the same rule.

## Calendar campaign / AI Content Studio preview
- Post rows were reorganized into stable `copy / schedule / delivery / actions` groups.
- Date and time now share one schedule block, preventing the unlocked time picker from overlapping the content-format label.
- The three-dot menu is kept inside the card.
- Tablet and mobile rows are shorter and ordered consistently: title, schedule, format/channels, actions.
- Mobile artwork tiles are compact instead of stretching to the full card height.
- Calendar/time popovers keep a high stacking context and may escape the row without being clipped.

## Pinterest Trial / Sandbox
- Added `PINTEREST_API_ENV`. Set it to `sandbox` while the Pinterest app has Trial access.
- OAuth token exchange, refresh, user account, boards and Pin creation all use `api-sandbox.pinterest.com/v5` in Sandbox mode.
- Production remains the default. When Standard Access is approved, switch the env value to `production` and reconnect Pinterest.
- Sandbox and production tokens are intentionally not mixed, so reconnect Pinterest after changing environments.

No SQL migration is required.
