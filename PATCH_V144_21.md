# Spreelo v144.21 — Dashboard, timezone and Content Studio polish

Built on the full v144.20 codebase. This patch is intentionally UI/scheduling focused and does not replace the v144.20 protected-commerce/product-selection implementation or the v144.18 GPT-Image-2 transparent asset work.

## Fixed

### Home dashboard planned-post count
- The reference Home row previously counted grouped one-time plans, so 3 planned posts created together could display as `1`.
- The row now counts actual active/future one-time automation rules plus already-generated standalone scheduled posts.
- The top summary and the detail row therefore describe posts rather than two different units.

### Home dashboard drill-downs
- `Planerade inlägg` can now be expanded like recurring schedules.
- Every future one-time rule is shown separately with date/time and platform.
- A not-yet-generated one-time item can be removed from Home using the existing `end_automation_rules_keep_history` RPC. This keeps history and returns still-reserved credits.
- Already-generated scheduled posts are exposed with an `Öppna` action rather than unsafe hard deletion.
- `Kalenderkampanjer` can now be expanded when active campaigns exist.
- Campaign plans can be paused, resumed or ended through the existing plan lifecycle logic.

### Publishing timezone settings
- Replaced the 13-entry hard-coded timezone list with all IANA time zones supported by the runtime (`Intl.supportedValuesOf("timeZone")`) plus a broad fallback set.
- Existing server validation remains authoritative; only valid IANA zones are accepted.
- The timezone dropdown remains selectable while a save request is in flight.
- If a user chooses another timezone while the previous save is completing, the new draft selection is no longer overwritten.
- Existing `/api/settings/timezone` behavior is preserved: automation rules are shifted so the configured local publish time remains the intended local time in the new timezone.

### AI Content Studio calendar UI
- Replaced emoji/native-looking calendar affordances with Lucide calendar/navigation icons.
- Planned-row calendar receives a cleaner 352px editing panel, stronger month hierarchy, larger date targets, clearer selected/today states and improved spacing/shadow.
- When a planned-row calendar is open, the editor aligns controls to the top instead of leaving a visually awkward empty tray.
- Responsive behavior keeps the editor single-column on narrow screens.

### AI Content Studio footer readability
- Increased heading, paragraph, option, helper and approval-note sizes in `Löpande plan` and `Redo att aktivera din plan?`.
- Bottom-card typography now aligns better with the rest of the Content Studio instead of dropping to 9–10px copy.

## Database / environment
- No SQL migration required.
- No new environment variables required.

## Regression checks
- v144.10 indexed 403 fallback: pass
- v144.11 batched 403 fallback: pass
- v144.12 exact generation cost tracking: pass
- v144.13 campaign identity lock: pass
- v144.14 Home recurring schedule management: pass
- v144.17 purchasable products / no Kling text: pass
- v144.18 GPT-Image transparent assets: pass
- v144.19 in-stock-first product selection: pass
- v144.20 adaptive protected-commerce discovery: pass
- v144.21 dashboard/timezone/calendar static regression: pass

`test-v144-16-no-generative-hard-gate.mjs` is an obsolete pre-v144.17 test and intentionally conflicts with the later strict availability rules; its failure is not introduced by v144.21.
