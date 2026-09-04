# Deploy Spreelo v144.110

## Deployment order

### 1. No SQL migration

v144.110 requires **no new Supabase SQL**.

Do not rerun an old migration just for this version.

### 2. Deploy the full v144.110 ZIP

Deploy:

`spreelo-144.110-ADMIN-POLISH-TYPOGRAPHY-FULL.zip`

to the existing Spreelo Vercel project.

No new environment variables are required.

### 3. Recommended smoke test

#### A. Rescue failure resolution

1. Open one failed product occurrence that needs rescue.
2. Import verified rescue material and regenerate it successfully.
3. Confirm the regenerated post appears in **Godkännande**.
4. Open **Misslyckat**.
5. Confirm the repaired failure is no longer shown there and its Failed badge count decreased.

Expected: the original failed attempt remains internal audit history but no longer appears as an unresolved admin task.

#### B. Static product typography

1. Generate one ordinary single-image Product post.
2. Confirm the visible product typography is transparent/editorial rather than the old simple overlay treatment.
3. Confirm the real product image itself has not been redrawn.
4. Generate one product Carousel.
5. Confirm carousel product slides use the same typography approach.
6. Use a source whose metadata contains a breadcrumb/category path if possible.
7. Confirm strings such as `Hem > Godis > Gelé > Colanappar`, URLs or slugs are never printed on the image.

If GPT Image typography cannot pass the transparency/safe-area checks, Spreelo is allowed to use the existing deterministic text-only emergency fallback rather than fail the whole post.

#### C. Missing social channel

1. Use a test account with no connected social channel.
2. Open AI Innehållsstudio and create a plan.
3. Confirm a visible channel warning is present in the activation section.
4. Click **Starta och aktivera planen**.
5. Confirm a proper modal opens with a link to Social channels.
6. Confirm no tiny overlapping error message is used for this case.
7. On desktop, confirm the activation button is centered, approximately max 520px wide and visibly taller; on mobile it should remain full width.

#### D. Admin icon tabs / badges

1. Open Admin → post approvals/workbench.
2. Confirm Kommande, Godkännande, Misslyckat and Historik are compact icon-style controls.
3. Confirm unresolved counts appear as notification badges for Kommande/Godkännande/Misslyckat.
4. Resolve or create a work item and refresh; confirm badge counts track the durable queue.

#### E. Clean the current admin test account

Only do this when you intentionally want to clear the test content belonging to the currently signed-in admin account.

1. In Admin post approvals, click **Rensa mina testinlägg**.
2. Read the warning.
3. Type exactly:

`RADERA MIN TESTDATA`

4. Confirm Kommande, Godkännande, Misslyckat and Historik for the current admin test account become clean after refresh.
5. Confirm current admin test plans have been ended so old Upcoming rows do not immediately return.
6. Confirm reserved credits were returned if a reservation existed.
7. Confirm another customer account/brand is unchanged.

### Important cleanup scope

The cleanup endpoint is deliberately scoped to `context.user.id`.
It does **not** delete customer users or brand profiles and it is not a global production-data wipe.

## Regression checks run before packaging

Passed:

- v144.105 brand analysis recovery
- v144.106 admin queue + rescue ZIP
- v144.107 fail-fast rescue handoff
- v144.108 remote rescue images
- v144.109 Rescue Center / annual calendar / static email translations
- v144.110 admin polish / resolved rescue / product typography
- v144.18 GPT Image transparent asset checks
- v144.80 studio reference checks
- v144.89 activation CTA checks
- Node syntax checks for modified server routes
- `package.json` and `vercel.json` JSON validation

The older v143.27 runtime typography test could not execute in this source-only package because `sharp`/`node_modules` is not bundled. The v144.110 source regression and the later v144.18 typography checks pass; validate one real product image and one carousel after Vercel deploy as described above.
