# Deploy Spreelo v144.12

## 1. Run the SQL migration first

Run this file in the Supabase SQL editor:

`spreelo-v144.12-SQL.sql`

It creates the admin-only cost ledger and summary tables. It does not alter customer-facing post-generation behavior and does not add generation-cost columns to `posts`.

## 2. Deploy the full v144.12 ZIP to Vercel

No new Vercel environment variables are required.

v144.12 reuses existing variables, including:

- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- existing Kling variables
- existing Shotstack variables

## 3. Verify

Generate one normal automated post and inspect Admin -> post approvals/review. A `Kostnad` value should appear after the post is created.

For manual `/create`:

1. Generate a draft.
2. Save the draft.
3. The GPT-5.5 usage is attached to that post after the successful save. The bind request does not make an AI/provider call.

## Important

- No FX/SEK conversion is used.
- Costs are stored in provider-native currency.
- Cost metering must never block generation, rendering, finalization, or draft saving.
- If a provider's monetary rate cannot be proven from exact usage/account-plan information, the event is kept as raw usage and marked partial rather than guessed.
