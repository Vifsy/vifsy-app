# Spreelo v144.44 — Deliberate Kling commercial ending

Built from v144.43.

## Why
AI product videos could look strong during the product action but still feel unfinished because Kling was told to escalate into a payoff in the final second and the delivered file ended immediately afterward. That made some ads feel like an AI clip that simply ran out rather than a deliberately finished commercial.

## Fixes
- Keeps the paid Kling image-to-video generation at **6 seconds** by default.
- Re-directs the Kling concept so the main payoff happens **before** the final second.
- Requires meaningful product, hand, camera and environmental motion to resolve by about **5.0 seconds**.
- Requires the final **0.8–1.0 second** of Kling motion to settle into a stable product hero composition held through the final frame.
- Explicitly forbids ending during a hand movement, product movement, camera move, reveal or other unfinished action.
- Captures a late frame from the finished Kling source and stores it as a retry-safe closing hero frame.
- Shotstack appends that hero frame for **0.9 seconds** after the Kling motion, so the customer-facing ad has a controlled ending even if Kling leaves a small amount of residual motion.
- The existing transparent typography remains on screen through the closing hold.
- The stored `video_duration_seconds` now reflects the delivered post-processed duration rather than only the six-second Kling source duration.

## Normal delivered timing
For the normal verified direct-scene path:
- Kling source: 6.0 s
- Existing direct-scene safety trim: 0.15 s
- Delivered Kling motion: 5.85 s
- Closing hero hold: 0.90 s
- Final customer video: approximately **6.75 s**

The longer 1.9 s trim remains only for the existing rare pixel-preserving fallback path where the generated opening scene could not be trusted.

## Cost / provider behavior
- No extra Kling generation.
- Kling duration remains 6 seconds.
- No new OpenAI image generation is added for the ending; the closing frame is sampled from the already generated Kling video.
- Shotstack renders the additional 0.9-second hold as part of the existing professional typography post-process.
- No database migration and no new environment variable.
