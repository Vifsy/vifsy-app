# Spreelo v144.97 — Unified Calendar Campaign AI Content Studio

- Calendar campaigns now render inside the same AI Content Studio shell as ordinary plans instead of switching to the older standalone campaign layout.
- Uses the same hero, glass background, Planinställningar cards, planned-post cards, content-type area and activation card as the ordinary Studio.
- Calendar campaign posts now use the exact same planned-post row component structure and responsive behavior shown in the ordinary AI Content Studio.
- Campaign-specific behavior is preserved: campaign dates/past-date rules, campaign slot metadata, platform targeting, language selection, credits and activation still use the existing campaign logic.
- Campaign-owned strategy, post count, start/publishing settings are shown as locked/read-only values so the layout stays familiar without silently changing campaign logic.
- Adding a post from the campaign planned-post section uses `addCampaignSlot`, and deleting uses `removeCampaignSlot`, so campaign metadata is not lost.
- The old standalone `campaign-v14335` experience is left in source only as inactive legacy code and is no longer rendered.
- Added a small v144.97 responsive compatibility layer for locked values and long campaign titles/copy.
- No SQL changes.
