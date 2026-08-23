# Spreelo v144.12 — Exact provider-native generation cost tracking

## Scope

This release adds admin-only generation-cost metering. It does **not** change product discovery, product verification, content selection, generation prompts, retry/failure rules, publishing logic, or the v144.11 indexed 403 fallback.

No currency conversion is performed. Monetary values stay in each provider's native billing currency.

## What is tracked

- OpenAI text/research calls used while generating posts (`gpt-4.1-mini`, `gpt-5.5`), using provider-returned token usage.
- OpenAI Responses web-search tool executions, using actual tool-call count plus model-token usage.
- GPT-Image-2 generations/edits, using provider-returned text/image/output token usage where the response exposes an exact billing split.
- Kling image-to-video usage for the existing Spreelo Kling configuration/package. No extra Kling task is ever submitted for metering.
- Shotstack render usage using returned billable render seconds; monetary totals are only marked exact when the active plan rate is identifiable. Otherwise the raw usage remains visible and the monetary summary is marked partial instead of guessed.
- Admin regeneration/repair paths.
- Manual `/create` GPT-5.5 drafts. The model usage is recorded before a post row exists, then attached to the saved draft through an opaque one-time generation session.

## Manual `/create` safety design

The old generation request still makes exactly the same GPT-5.5 call. v144.12 wraps that existing call for usage capture and returns an opaque `generation_cost_session_id` alongside the generated content.

When the user saves the draft:

1. The existing `posts` insert still happens first.
2. A browser UUID is used for the post id so no new post SELECT dependency is introduced.
3. Only after the insert succeeds, Spreelo makes a free internal request to `/api/generation-cost/bind`.
4. The bind route authenticates the user and verifies ownership of the saved post before using the service role.
5. The already-recorded provider usage is attached to that post in the admin-only ledger.
6. Any cost-metering/binding failure is non-fatal and cannot turn a successful generation or saved draft into an error.

The bind route contains no OpenAI, Kling, Shotstack, or other paid generation call.

## Data model

Two admin/service-role-only tables are used:

- `post_generation_cost_events`: one ledger row per real provider request/usage event.
- `post_generation_cost_summaries`: per-post totals and breakdown.

Manual generation uses `generation_session_id` + `generation_user_id` in the internal event ledger until the post is saved.

No cost/COGS columns are added to `posts`, so existing customer-facing `posts.*` queries cannot expose internal generation costs.

## Admin UI

The post approval/admin view gains a `Kostnad` column/detail field. Breakdown shows provider/model and the provider-native amount, e.g. `USD 0.123456789`. If a provider does not expose enough information for an exact monetary amount, Spreelo shows raw usage and marks the total `Delvis` rather than inventing a price.

## No FX

There is no SEK conversion, no exchange-rate API, and no currency-normalization job. USD remains USD (and any future provider with another billing currency will remain in that currency).

## Regression policy

v144.12 is instrumentation only. The existing generation path remains authoritative; cost tracking is deliberately best-effort/non-fatal.
