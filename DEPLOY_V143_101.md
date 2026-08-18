# Spreelo v143.101 — inline social channel connection

This release removes the forced navigation to **Social channels** when a content plan has no connected publishing channel.

## What changed

- AI Content Studio: **Choose goal** now opens an in-context channel connection modal instead of sending the customer away from the plan.
- AI Calendar/campaign plan: the empty Platform field opens the same modal and keeps the selected campaign/theme and generated plan intact.
- Planner empty-channel card uses the same flow.
- OAuth continues to open in a separate popup window.
- After successful OAuth, Spreelo reloads connected channels, automatically selects the newly connected channel for the current plan, closes the modal, and leaves the customer exactly where they were.
- Popup blocking no longer falls back to a full-page redirect; the planner is preserved and the customer gets a retry message.
- Existing social channel management page remains unchanged.

## Database / environment

- No SQL changes.
- No new environment variables.

## Regression test

```bash
npm run test:v143.101
```
