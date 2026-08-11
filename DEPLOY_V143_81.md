# Deploy v143.81 — plan entitlements and upgrade flow

1. Run `spreelo-v143.81-SQL.sql` in Supabase SQL Editor before deploying the app.
2. Deploy the full application package.
3. Verify Settings shows the package limits:
   - Starter: 1 business / 1 social account / 1 rolling plan / 150 credits
   - Growth: 1 business / 3 social accounts / 1 rolling plan / 350 credits
   - Pro: 3 businesses / 10 social accounts / 3 rolling plans / 750 credits
4. Verify adding beyond a limit opens the upgrade modal.
5. Verify upgrading with a saved payment method keeps Spreelo open. If Stripe needs customer action, payment opens separately and Spreelo polls for the completed change.
