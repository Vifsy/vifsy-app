# Spreelo v143.49 — Platform-aware content mix

This release adds a central compatibility layer for Spreelo's planned social channels and makes channel selection influence the plan before activation.

## What changed

- Added `lib/platformContentCompatibility.js` as the single source of truth for Facebook, Instagram, TikTok, LinkedIn, Pinterest, YouTube, Threads, Snapchat and Weibo.
- Each content type is classified per channel as native, adapted, exclusive-adapted or skipped.
- AI Content Studio and calendar campaigns now recalculate the actual destination channels for every planned post when channels are added or removed.
- Generated plans and campaigns make a small deterministic rebalance when a newly selected channel would otherwise receive no suitable posts. Existing compatible posts are preserved; custom/manual posts are never replaced for coverage balancing.
- YouTube-only plans can adapt static master material, while broad multi-channel plans do not automatically force every static product image/carousel onto YouTube.
- Each planned post now shows the channels it will actually publish to.
- Each saved automation rule stores only that post's destination subset in the existing `platform` field, so approval emails and later publishing use the same truth.
- Recurring weekly adaptive variants are filtered so future content-type rotations remain compatible with that rule's actual channel subset.
- Activation summary/email now reports the union of actual destinations.
- Planning API receives the selected channel list and asks for a channel-aware format mix in one OpenAI planning request; it does not run one creative generation per channel.
- Approval email channel labeling was expanded for LinkedIn, Pinterest, Threads, Snapchat and Weibo.
- Added responsive campaign channel chips and a short explanation under the channel selector.

## Important scope

The compatibility architecture covers all nine planned channels, but the live publishing integrations in this codebase remain the channels already implemented. Adding a profile here does not claim that an unconnected channel can already publish.

Pinterest animated video remains intentionally excluded because the current Spreelo Pinterest publisher does not yet upload video media.

## Database

No new SQL migration is required. Per-post channel subsets use the existing `automation_rules.platform` field.
