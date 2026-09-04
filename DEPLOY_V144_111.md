# Deploy Spreelo v144.111

## Important: SQL first

Run this file in Supabase SQL Editor **before** deploying the v144.111 application:

`spreelo-v144.111-SQL.sql`

The migration replaces the terminal-failure credit lifecycle and adds the admin-only idempotent refund RPC.

Do not deploy v144.111 application code first. The new Admin button calls the new RPC and the worker expects the replacement `fail_automation_occurrence_terminal()` behavior.

## Then deploy the full ZIP

Deploy:

`spreelo-144.111-RESCUE-CREDIT-LOCALIZED-MAIL-FULL.zip`

No new Vercel environment variable is required. Existing `RESEND_API_KEY`, OpenAI, Supabase and app URL variables are reused.

## Recommended smoke test

Use a fresh test occurrence created after the SQL migration.

1. Trigger one planned post that intentionally fails and reaches **Admin → Misslyckat**.
2. Confirm the failed occurrence shows that its credit is being used/held for rescue and that the user's balance was **not automatically refunded**.
3. Rescue/regenerate the post successfully.
   - Expected: the post moves to approval/generated flow.
   - Expected: the failed item disappears from the actionable Failed queue.
   - Expected: no second customer credit is charged by the admin regeneration.
   - Expected: the held credit can no longer be refunded for that occurrence.
4. Trigger a second failed occurrence and do **not** rescue it.
5. In Admin choose **Avbryt och återbetala kredit**.
   - Expected: exactly that occurrence's held credit is returned once.
   - Expected: the customer receives a clear service email.
   - Expected: the email language matches the customer's selected **App language**, not the post language or brand content language.
   - Expected: after successful email delivery the failed item disappears from the actionable Failed queue.
6. Click/replay the refund endpoint for the same occurrence only if testing idempotency.
   - Expected: no second credit refund can occur.
7. Optional mail-failure test: temporarily use an invalid Resend configuration in staging.
   - Expected: credit refund remains applied.
   - Expected: failed item remains actionable with **Skicka kundmejl igen**.
   - Restore Resend and retry; no second refund should occur.
8. Test one recurring weekly plan failure.
   - Expected: the failed occurrence's credit remains tied to rescue.
   - Expected: if the plan continues, the next occurrence has its own separate reservation.
   - Expected: cancelling/refunding the old failed occurrence does not release the next occurrence's reservation.
9. Change the test user's app language and send one customer-facing email.
   - Expected: email follows that app locale. Missing locale email strings are cached once globally in `ui_translation_packs`, not translated anew on each send.

## Existing rows

The migration changes behavior for failures finalized **after the migration is applied**. Old failed test occurrences that were already automatically refunded remain historical records; v144.111 does not silently re-charge old customers.

## Validation completed in the supplied source tree

Passed:

- v144.105
- v144.106
- v144.107
- v144.108
- v144.109
- v144.110
- v144.111
- v144.00 delivery-first resilience
- v144.04 approval recovery
- Node syntax checks for all changed server-side JS modules
- TypeScript parser JSX syntax check for changed admin/settings JSX

Two older static tests are known to be stale against the current source tree and are not v144.111 regressions:

- v144.57 still looks for an old planner CSS marker removed by later planner redesigns.
- v143.69 only accepts translation cache versions v14–v19 while the current code is already v24.

A full `next build` cannot be run from the source-only ZIP because `node_modules` is intentionally not bundled. Vercel will perform the real dependency-backed build during deployment.
