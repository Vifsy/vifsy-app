# Deploy Spreelo v144.115

## Base

Built directly from the supplied full package:

`spreelo-144.113-ANALYSIS-RESCUE-NEXT-ATTEMPT-FIX-FULL(1).zip`

## SQL

**No SQL migration is required.**

## Environment

**No new Vercel environment variables are required.**

## Deploy

Deploy the full v144.115 ZIP.

## Smoke test

1. Create a new **AI-video / Kling** product post.
2. Let the Kling source finish and allow Spreelo finalization to run.
3. Confirm the on-video headline is short and specifically tied to the selected product/theme rather than generic filler copy.
4. Confirm the headline sits in a scene-safe area and does not cover the product print/design.
5. Confirm the final frozen hero frame shows a separate CTA such as “Se produkten”, “Läs mer”, “Kontakta oss” or the corresponding selected-language action.
6. Confirm the main headline is not stacked on top of the CTA during the closing hero frame.
7. Confirm product identity, Kling single-generation guard, music and approval flow still behave normally.

## Regression commands

- `npm run test:v144.25`
- `npm run test:v144.42`
- `npm run test:v144.44`
- `npm run test:v144.48`
- `npm run test:v144.113`
- `npm run test:v144.115`


No new SQL or env vars are required for v144.115.
