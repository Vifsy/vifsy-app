# Deploy v144.23

1. Deploy the full project normally to Vercel.
2. Open **Admin** immediately after deployment.
3. If the yellow **OpenAI-bakgrundsjobb** warning is visible, click **Stoppa pågående jobb** and confirm.
4. The route cancels tracked OpenAI background responses and places affected jobs on a 15-minute cooldown so the next minute cron cannot immediately recreate them.
5. Watch the next worker log for `OpenAI background response cancelled` and `openai_background_cleanup_cancelled`.

No SQL or environment changes are required.
