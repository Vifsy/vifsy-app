# v143.47 — Home plan management and review context

## Home / Your active plans
- The compact Home plan list now shows only active/upcoming plan groups instead of completed/paused history.
- Clicking a plan expands a read-only list of its planned posts with translated content type, channel and planned publication time.
- Each plan has a compact trash action that uses the existing safe `release_and_delete_automation_rules` flow and returns reserved credits when applicable.
- “View all active plans” now expands the list in place instead of navigating to AI Content Studio.
- The active-plan statistic now counts plan groups rather than individual automation rules.

## Review
- Review rows resolve their context from the originating automation rule.
- Calendar campaigns show the campaign/plan name.
- AI Content Studio plans show the originating plan name (for example the selected goal) plus the actual content type.
- Generic labels such as “Generated from website” are ignored when better plan context exists.
- Content-type UI labels are English source strings under the dashboard namespace and therefore participate in Spreelo's normal UI translation flow; Swedish critical-flow fallbacks are included.

## Safety
- No new database migration is required.
- Post editing was not added to Home; plan expansion is view-only.
- Existing Pinterest reliability and campaign schedule-unlock work from v143.45–v143.46 is preserved.
