# Deploy v143.94

1. Deploy the complete v143.94 package.
2. No Supabase migration is required.
3. No additional Vercel environment variables are required beyond the existing social OAuth configuration.
4. Test Instagram with a browser that is signed out of Instagram:
   - Click **Connect Instagram** in Spreelo.
   - Instagram should open in a separate window while Spreelo remains open.
   - Log in.
   - If Instagram lands on the normal feed, return to Spreelo and click **Continue connection**.
   - Complete authorization and verify that the popup closes and Instagram becomes Connected without reloading/navigating away from Spreelo.
5. Smoke-test Threads, Facebook and Pinterest connection flows as they now use the same popup completion bridge.
