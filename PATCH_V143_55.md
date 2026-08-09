# v143.55 — Pinterest idempotency + premium product label

## Pinterest duplicate protection
- Multi-image Pins remain 5 real product slides; AI outro is excluded.
- Ambiguous Pinterest processing timeouts now persist a `processing` receipt immediately.
- During the 15-minute settling window Spreelo only reconciles the target board and will not issue another Create Pin request for the same post.
- If Pinterest eventually exposes the Pin, Spreelo recovers it by the unique `utm_content=<post-id>` destination marker and marks the target published.
- Only after the settling window has expired and reconciliation still finds nothing may Spreelo issue another create request.
- Carousel publishing still refuses to degrade to a one-image Pin.

## Product-card typography
- Product name weight increased to 950 with a subtle same-color stroke.
- Latin product names use slightly tighter tracking for a cleaner premium look.
- Preferred display sizes increased slightly while preserving the existing multilingual Noto/Source Han fallback system.

No new SQL migration is required beyond v143.53.
