# Deploy Spreelo v144.13

## 1. Database

v144.13 adds no new database schema beyond v144.12.

- If the v144.12 generation-cost SQL has already been run: do not run any new SQL.
- If upgrading directly from v144.11 or earlier: run `spreelo-v144.13-SQL.sql` once. It is the same idempotent admin-only cost-tracking schema introduced in v144.12.

## 2. Environment variables

No new Vercel environment variables are required for v144.13.

## 3. Deploy

Deploy the full v144.13 application package normally.

## 4. Recommended verification

Create a campaign AI product ad, for example Black Friday, and check:

- caption stays only on Black Friday;
- text inside the generated product-ad image stays only on Black Friday;
- no Father's Day, Mother's Day, Easter or another unrelated named occasion is introduced;
- selected product and exact original product image behave exactly as before;
- admin generation-cost tracking from v144.12 remains visible.

Useful server log fields after product-copy validation:

- `campaignValid: true`
- `conflictingCampaignMentions: []`

If a conflict is generated in the first draft, Spreelo should reject/rewrite that copy before image generation rather than changing product selection or failing the post.
