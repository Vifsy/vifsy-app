# Deploy v144.10

1. Deploy the full v144.10 ZIP to the same Vercel project as the current Spreelo app.
2. No SQL migration is required.
3. No new environment variables are required.
4. Keep the existing OpenAI API configuration; the fallback reuses Spreelo's existing hosted web-search product research.
5. Test with a store that returns HTTP 403 to Spreelo's direct crawler, such as the Inet.se test case.

Expected log when the fallback succeeds:

`Indexed exact-product fallback recovered security-blocked website product`

The selected item should then contain a locked exact product image and continue through the normal post-generation flow.
