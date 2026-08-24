# Deploy v144.26

1. Deploy the full project as usual.
2. No Supabase migration is required.
3. No new environment variable is required.
4. Existing OpenAI, Kling, Shotstack and Pinterest configuration remains in use.
5. Pinterest video Pins are automatically planner-compatible in production. Pinterest Sandbox is detected at runtime and video destinations are hidden there because Pinterest Sandbox cannot create video Pins.

Recommended smoke tests after deploy:
- Swedish Content Studio: verify every built-in format card is Swedish, including AI product video.
- Switch the app to a non-English locale such as Simplified Chinese and verify the Content Studio does not expose English source/config labels while translations load.
- Create a one-time plan with 2 posts, delete one and confirm the settings card says the localized equivalent of "1 post" rather than "2 posts per week".
- Production Pinterest connection: publish one animated/video post and verify the media upload is processed and the resulting Pin is created with video + cover.
- AI Product Video: verify frame 0 already uses a believable real-world environment and never begins on the old flat blue/dark studio background.

Expected Kling log markers:
- `Kling natural real-world start background selected` or `Kling natural real-world start background generated as library fallback`.
- `Kling product reference frame prepared` with `naturalEnvironmentFromFirstFrame: true`.

Expected Pinterest video flow:
- media upload registration
- media upload processing reaches `succeeded`
- Pin is created from `video_id` with a cover image

Notes:
- The natural Kling environment is selected from the existing background library first. GPT-Image-2 is only used as a tracked fallback when no suitable real-world background can be used.
- v144.24 protected-retailer/product-delivery behavior remains intact.
- v144.25 transparent GPT-Image-2 video typography remains intact.
